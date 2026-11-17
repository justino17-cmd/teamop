/* ⛔ CE QUE CE FICHIER GARDE — L'HORLOGE QU'UN BANC AVANCE NE REND JAMAIS L'HEURE RÉELLE, MÊME PENDANT QU'ON L'AVANCE (`outils-msg.js`, `lib-horloge-msg.js`).

   Une cinquantaine de bancs d'OP MESSAGES lancent le VRAI service avec une horloge décalable : le banc écrit un décalage dans un fichier (`svc.avancer`), le service le relit à chaque `Date.now()`
   (`lib-horloge-msg.js`). Jusqu'au 17 novembre 2026, l'écriture était un `fs.writeFileSync` — qui VIDE le fichier puis l'écrit — et la lecture faisait `parseInt(lu) || 0` : un fichier lu vide valait
   « aucun décalage », l'heure RÉELLE. Une minuterie du service qui demandait l'heure entre la troncature et l'écriture sautait donc de plusieurs semaines : le balayeur d'appels finissait la sonnerie
   (« manquée ») ou l'appel en cours (« perdu »), et `test-981` mourait sur du code que personne n'avait touché — en CI le 5 et le 16 novembre (« Cannot read properties of undefined (reading 'lie') »,
   39 ✓), et deux fois sur 180 passages sous charge (douze de front). Relevé par un espion (120 passages de test-981 à douze de front : neuf ont lu le fichier vide, un en est tombé, la pile menait de `balayer` à
   `appelFinir`), puis rejoué à volonté : le fichier laissé vide 1,3 s pendant l'avance qui précède « Ben répond » donne la mort de la CI, au contrôle près.

   Deux gardes de l'horloge, et CHACUNE TIENT SEULE — on les éprouve donc séparément, puis ensemble :
     1. LE GREFFON : un contenu qui n'est pas un entier (vide, du texte, un fichier absent) ne décide de rien — l'horloge garde le dernier décalage lu, et le DIT une fois (sinon ce repli
        cacherait une vraie panne : des avances que le service ne lit plus) ;
     2. L'ÉCRITURE : `svc.avancer` écrit à côté puis RENOMME — le fichier est remplacé d'un geste (son numéro de fichier change, un lecteur qui le tenait ouvert relit l'ancien contenu ENTIER) —
        et n'écrit qu'un entier : une avance qui n'est pas un nombre LÈVE dans le banc au lieu d'écrire ce que le greffon ignorerait ;
     3. LA COURSE ENTIÈRE : un lecteur qui ne s'arrête pas (il lit le fichier brut ET demande l'heure par le greffon) pendant deux mille avances — aucune lecture illisible, jamais l'heure réelle.
   Et l'autre défaut de l'outil que la même charge a montré :
     4. UN PORT DÉJÀ PRIS : `portLibre()` rend un port libre à l'instant où on le demande, deux bancs lancés ensemble peuvent recevoir le même. Le second service meurt (`EADDRINUSE`), `/health`
        répond quand même — c'est le service de l'AUTRE banc, et l'outil le rendait comme « vivant » (des 401 partout, sur la base d'un autre). Chaque lancement porte donc une identité que
        `/health` redit (`svc.sha`) : un port pris se retente ailleurs, un port imposé qui est pris se DIT — et un port tenu par un processus MUET ne laisse plus le lancement pendu.

   ⛔ AU GESTE, JAMAIS AU CHRONOMÈTRE : le lecteur est un processus à part qui RÉPOND (un message par question) ; le banc n'avance le paquet suivant qu'après un tour ENTIER du lecteur, commencé
   après le paquet d'avant (un jalon). La partie 3 est la seule qui dépende de l'ordonnancement, et dans UN sens seulement : sur une machine à un seul cœur elle peut laisser passer une écriture en place (les deux
   processus ne s'y croisent pas), elle ne peut jamais tomber à tort — les parties 1 et 2, elles, ne dépendent de rien.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « jamais » porte sa population (combien de lectures, combien de valeurs différentes vues pendant les avances). */
'use strict';
const fs = require('fs'), path = require('path'), { spawn } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const JOUR = 86400000;
const DEPART = -30 * JOUR;                      // un service de banc vit des semaines AVANT l'heure réelle (les bancs se calent sur une date fixe) : l'heure réelle est à trente jours de là, impossible à confondre
const MARGE = 5000;                             // ce qu'on tolère entre l'horloge lue et celle qu'on attend : la mesure elle-même (deux lectures d'horloge dans deux processus), pas une course
const pres = (ecart, attendu) => Math.abs(ecart - attendu) <= MARGE;

/* Le lecteur : un processus à part, chargé avec le VRAI greffon (`--require`), qui relit le MÊME fichier que le service. Il répond à « heure » par l'écart entre son `Date.now()` (le greffon) et
   l'heure réelle (`performance`, que le greffon ne touche pas) ; pendant une « course », il lit sans s'arrêter (cinq cents lectures par tour) et répond à un « jalon » quand il a fini un tour
   ENTIER commencé après l'avoir reçu — la preuve, au geste, qu'il a lu depuis. */
const LECTEUR = `
const { performance } = require('perf_hooks'), fs = require('fs');
const reel = () => performance.timeOrigin + performance.now(), f = process.env.OPMSG_HORLOGE_DECALAGE;
let c = null, jalon = null;
function tourner() {
  if (!c) return;
  const j = jalon; jalon = null;                       // un jalon reçu AVANT ce tour : on y répondra quand ce tour, commencé après lui, sera fini
  for (let i = 0; i < 500; i++) {
    let lu = null; try { lu = fs.readFileSync(f, 'utf8'); } catch (e) { lu = null; }
    c.lectures++;
    if (lu === null || !/^-?\\d+$/.test(lu)) c.illisibles++; else c.valeurs.add(lu);
    const e = Date.now() - reel(); if (e < c.min) c.min = e; if (e > c.max) c.max = e;
  }
  c.tours++;
  if (j !== null) process.send({ quoi: 'jalon', p: j });
  setImmediate(tourner);
}
process.on('message', (m) => {
  if (m.quoi === 'heure') process.send({ quoi: 'heure', ecart: Math.round(Date.now() - reel()) });
  else if (m.quoi === 'jalon') jalon = m.p;
  else if (m.quoi === 'course') { c = { lectures: 0, illisibles: 0, valeurs: new Set(), min: Infinity, max: -Infinity, tours: 0 }; tourner(); }
  else if (m.quoi === 'bilan') { const b = c; c = null; process.send({ quoi: 'bilan', lectures: b.lectures, illisibles: b.illisibles, valeurs: b.valeurs.size, min: Math.round(b.min), max: Math.round(b.max), tours: b.tours }); }
  else if (m.quoi === 'sortir') process.exit(0);
});
process.send({ quoi: 'pret' });
`;

(async () => {
  let svc = null, lecteur = null;
  try {
    svc = await T.lancerService({ horloge: true, decalageInitial: DEPART });
    const fichier = svc.fichierHorloge;
    let decalage = DEPART;                                                // ce que le banc a posé : le départ, plus chaque avance
    const avancer = (ms) => { decalage += ms; svc.avancer(ms); };

    lecteur = spawn(process.execPath, ['--require', path.join(__dirname, 'lib-horloge-msg.js'), '-e', LECTEUR], { env: Object.assign({}, process.env, { OPMSG_HORLOGE_DECALAGE: fichier }), stdio: ['ignore', 'inherit', 'pipe', 'ipc'] });
    let ditLecteur = ''; lecteur.stderr.on('data', (d) => { ditLecteur += d; });
    const avis = (texte) => (String(texte).match(/horloge de banc : /g) || []).length;       // combien de fois le greffon a DIT qu'il gardait le dernier décalage
    const recus = [];
    lecteur.on('message', (m) => { recus.push(m); });
    const reponse = async (quoi, p) => T.attendre(() => { const i = recus.findIndex(m => m.quoi === quoi && (p === undefined || m.p === p)); return i < 0 ? null : recus.splice(i, 1)[0]; }, 10000, 1);
    const heure = async () => { lecteur.send({ quoi: 'heure' }); const m = await reponse('heure'); return m ? m.ecart : null; };
    vrai('population : le lecteur (un processus à part, chargé avec le vrai greffon) est prêt et relit le fichier d\'horloge du service', !!(await reponse('pret')) && typeof fichier === 'string' && fs.existsSync(fichier));

    /* ═══════ 1. LE GREFFON : CE QUI N'EST PAS UN ENTIER NE DÉCIDE DE RIEN ═══════ */
    console.log('Le greffon : une lecture qui ne rend pas un entier garde le dernier décalage lu — jamais l\'heure réelle');
    {
      v('le service naît avec le décalage du banc (trente jours avant l\'heure réelle), et le lecteur lit la même heure', [fs.readFileSync(fichier, 'utf8'), pres(await heure(), DEPART)], [String(DEPART), true]);
      avancer(5000);
      v('une avance se lit aussitôt', [fs.readFileSync(fichier, 'utf8'), pres(await heure(), DEPART + 5000)], [String(DEPART + 5000), true]);
      const pose = DEPART + 5000, lus = [];
      const avant = [avis(ditLecteur), avis(svc.sortie.texte())];
      /* ce que l'ancienne écriture laissait voir, et pire : chaque fois, l'horloge doit rester où le banc l'a posée — à trente jours de l'heure réelle */
      for (const [nom, geste] of [
        ['VIDE (une écriture qui a tronqué et n\'a pas encore écrit)', () => fs.truncateSync(fichier, 0)],
        ['du texte', () => fs.writeFileSync(fichier, 'abc')],
        ['un nombre suivi d\'autre chose', () => fs.writeFileSync(fichier, '12 heures')],
        ['un décimal', () => fs.writeFileSync(fichier, '1e3')],
        ['ABSENT', () => fs.unlinkSync(fichier)],
      ]) { geste(); lus.push([nom, pres(await heure(), pose)]); await T.client(svc.base).get('/health'); }          // et le VRAI service demande l'heure pendant que le fichier est illisible
      v('⛔ un fichier VIDE, du texte, un nombre suivi d\'autre chose, un décimal, un fichier ABSENT : l\'horloge garde le dernier décalage lu (population : cinq contenus illisibles, l\'heure demandée après chacun)', lus.filter(([, ok]) => !ok).map(([nom]) => nom), []);
      vrai('   et aucun ne ramène à l\'heure réelle (elle est à trente jours : un retour vaudrait un écart nul)', !pres(await heure(), 0));
      /* ⛔ garder le dernier décalage ne cache pas une panne : le greffon le DIT, une fois (pas à chaque lecture : un service demande l'heure des milliers de fois), sur la sortie d'erreur —
         celle du lecteur ici, et celle du vrai service, que tout banc recueille (`svc.sortie`) et montre quand il tombe */
      await T.attendre(() => avis(ditLecteur) > 0 && avis(svc.sortie.texte()) > 0, 5000, 5);
      v('⛔ une lecture illisible se DIT, une seule fois pour cinq contenus illisibles : par le lecteur, et par le vrai service sur sa sortie d\'erreur (population : aucun des deux n\'avait rien dit avant)', [avant, avis(ditLecteur), avis(svc.sortie.texte()), /pas un entier|est illisible/.test(ditLecteur), /le dernier décalage lu \(-?\d+ ms\) est gardé/.test(ditLecteur)], [[0, 0], 1, 1, true, true]);
      fs.writeFileSync(fichier, '-7000\n');
      v('un entier négatif, même suivi d\'une fin de ligne, est un décalage : il est suivi', pres(await heure(), -7000), true);
      avancer(1000);
      v('et l\'avance suivante du banc repose SON décalage (le départ plus les avances), pas celui qu\'on a écrit à la main', [fs.readFileSync(fichier, 'utf8'), pres(await heure(), DEPART + 6000)], [String(DEPART + 6000), true]);
    }

    /* ═══════ 2. L'ÉCRITURE : LE FICHIER EST REMPLACÉ D'UN GESTE ═══════ */
    console.log('\nL\'écriture : `svc.avancer` remplace le fichier d\'un geste, il ne le vide jamais');
    {
      const tenu = [], numeros = [fs.statSync(fichier).ino];
      for (let i = 0; i < 3; i++) {
        const avant = fs.readFileSync(fichier, 'utf8'), fd = fs.openSync(fichier, 'r');       // un lecteur qui tient le fichier OUVERT au moment de l'avance
        avancer(1234);
        const t = Buffer.alloc(64), n = fs.readSync(fd, t, 0, 64, 0); fs.closeSync(fd);
        tenu.push([t.slice(0, n).toString('utf8') === avant, fs.readFileSync(fichier, 'utf8') === String(decalage)]);
        numeros.push(fs.statSync(fichier).ino);
      }
      v('⛔ un lecteur qui tenait le fichier ouvert relit l\'ANCIEN décalage, entier (jamais un fichier vide ni un fichier à moitié écrit) — et le fichier porte le nouveau (trois avances)', tenu, [[true, true], [true, true], [true, true]]);
      v('⛔ le fichier est REMPLACÉ à chaque avance, pas réécrit en place : son numéro de fichier change trois fois sur trois', [numeros[1] !== numeros[0], numeros[2] !== numeros[1], numeros[3] !== numeros[2]], [true, true, true]);
      /* ⛔ ce que le greffon ignorerait ne s'écrit pas : une avance sans durée LÈVE dans le banc (avant : « NaN » dans le fichier, et toutes les avances suivantes ignorées en silence) */
      const refus = [];
      for (const mauvaise of [undefined, NaN, Infinity, '5000']) {
        const lu = fs.readFileSync(fichier, 'utf8');
        let leve = null; try { svc.avancer(mauvaise); } catch (e) { leve = String(e && e.message); }
        refus.push([/le décalage n'est pas un nombre/.test(leve || ''), fs.readFileSync(fichier, 'utf8') === lu]);
      }
      v('⛔ une avance qui n\'est pas un nombre (rien, NaN, l\'infini, un texte) LÈVE en le disant, et le fichier ne bouge pas', refus, [[true, true], [true, true], [true, true], [true, true]]);
      avancer(1000);
      v('   et l\'horloge du banc n\'en garde aucune trace : l\'avance suivante repart du dernier décalage juste', [fs.readFileSync(fichier, 'utf8'), pres(await heure(), decalage)], [String(decalage), true]);
      avancer(0.6); const virgule = fs.readFileSync(fichier, 'utf8'); avancer(0.4);
      v('   un nombre à virgule s\'écrit arrondi à la milliseconde (le greffon ne suit qu\'un entier), sans dérive : 0,6 ms puis 0,4 ms font une milliseconde', [/^-?\d+$/.test(virgule), virgule === String(Math.round(decalage - 0.4)), fs.readFileSync(fichier, 'utf8')], [true, true, String(Math.round(decalage))]);
      v('   rien ne traîne à côté : le fichier d\'horloge est seul de son nom dans le dossier du service', fs.readdirSync(path.dirname(fichier)).filter(n => n.startsWith(path.basename(fichier))), [path.basename(fichier)]);
    }

    /* ═══════ 3. LA COURSE ENTIÈRE ═══════ */
    console.log('\nLa course : un lecteur qui ne s\'arrête pas pendant deux mille avances');
    {
      const PAQUETS = 40, PAR_PAQUET = 50, PAS = 1000, depart = decalage;
      lecteur.send({ quoi: 'course' });
      /* au geste : le lecteur répond au jalon quand il a fini un tour entier commencé APRÈS l'avoir reçu — donc après le paquet qui précède le jalon */
      const jalonner = async (p) => { lecteur.send({ quoi: 'jalon', p }); return !!(await reponse('jalon', p)); };
      let suivis = await jalonner(-1) ? 1 : 0;
      for (let p = 0; p < PAQUETS; p++) {
        for (let i = 0; i < PAR_PAQUET; i++) avancer(PAS);
        if (await jalonner(p)) suivis++;
      }
      lecteur.send({ quoi: 'bilan' });
      const b = await reponse('bilan') || {};
      vrai('population : le lecteur a lu pendant toute la course (un tour entier après chacun des quarante paquets, plus de vingt mille lectures) et a VU le fichier changer (au moins une valeur par paquet)', suivis === PAQUETS + 1 && b.lectures >= 20000 && b.valeurs >= PAQUETS);
      v('⛔ pas UNE lecture illisible du fichier pendant deux mille avances (avant : vide entre la troncature et l\'écriture)', b.illisibles, 0);
      v('⛔ et l\'horloge du greffon n\'est jamais sortie de ce que le banc a posé : entre le décalage de départ et celui d\'arrivée — jamais l\'heure réelle, à trente jours de là', [b.min >= depart - MARGE, b.max <= depart + PAQUETS * PAR_PAQUET * PAS + MARGE], [true, true]);
      v('   le fichier porte le décalage d\'arrivée : le départ plus deux mille avances d\'une seconde', [fs.readFileSync(fichier, 'utf8'), pres(await heure(), depart + PAQUETS * PAR_PAQUET * PAS)], [String(depart + PAQUETS * PAR_PAQUET * PAS), true]);
    }
    vrai('le service a vécu tout le banc à côté du lecteur (il relit le même fichier)', svc.sorti() === null && (await T.client(svc.base).get('/health')).code === 200);

    /* ═══════ 3 bis. UN BANC QUI SORT SANS ARRÊTER SON SERVICE NE LE LAISSE PAS VIVRE ═══════ */
    console.log('\nUn banc qui sort sans arrêter son service (son délai global, une exception) ne laisse pas un processus fantôme');
    {
      /* un « banc » d'une ligne : il lance le vrai service, attend qu'il soit CALME, dit son numéro de processus, et SORT sans l'arrêter.
         ⛔ CALME, et c'est la population du contrôle : une seconde après son démarrage, le service écrit encore une ligne (« planificateur actif ») — si son banc est déjà sorti, cette écriture
         tombe dans un tube fermé et le service en MEURT, tout seul. Un banc qui sort dans la première seconde ne laisse donc jamais de fantôme, filet ou pas : la première version de ce
         contrôle sortait à ce moment-là, et la mutation « plus de filet » y survivait. Un service qui n'a plus rien à écrire, lui, survit à son banc (relevé : vivant six secondes après,
         et 158 s après dans le cas qui a fait trouver le défaut). */
      const etourdi = spawn(process.execPath, ['-e', 'const T = require(' + JSON.stringify(path.join(__dirname, 'outils-msg.js')) + '); T.lancerService().then(async (x) => { const calme = !!(await T.attendre(() => /"evt":"planificateur"/.test(x.sortie.texte()), 8000, 10)); console.log("PID " + x.enfant.pid + " " + x.racine + " " + calme); process.exit(0); });'], { stdio: ['ignore', 'pipe', 'inherit'] });
      let dit = ''; etourdi.stdout.on('data', (d) => { dit += d; });
      const sortie = await new Promise((r) => etourdi.on('close', (code) => r(code)));
      const m = /PID (\d+) (\S+) (true|false)/.exec(dit), pid = m ? parseInt(m[1], 10) : 0;
      /* vivant : le processus existe ET n'est pas un zombie (tué, il reste dans la table jusqu'à ce qu'on le récolte — ce n'est plus un service) */
      const vit = () => { try { process.kill(pid, 0); } catch (e) { return false; } try { return !/^\d+ \(.*\) Z /.test(fs.readFileSync('/proc/' + pid + '/stat', 'utf8')); } catch (e) { return true; } };
      const parti = !!pid && !!(await T.attendre(() => (vit() ? null : true), 5000, 10));
      v('⛔ le service d\'un banc sorti sans l\'arrêter est mort avec lui (population : le banc a lancé un vrai service, a attendu qu\'il n\'ait plus rien à écrire, a dit son numéro de processus, puis il est sorti en 0)', [sortie, pid > 0, !!m && m[3] === 'true', parti], [0, true, true, true]);
      if (pid && !parti) { try { process.kill(pid, 'SIGKILL'); } catch (e) { /* parti entre-temps */ } }
      if (m) { try { fs.rmSync(m[2], { recursive: true, force: true }); } catch (e) { /* rien */ } }
    }

    /* ═══════ 4. UN PORT DÉJÀ PRIS : LE SERVICE D'UN AUTRE N'EST PAS LE NÔTRE ═══════ */
    console.log('\nUn port déjà pris par un autre service de banc : `lancerService` ne prend pas l\'autre pour le sien');
    {
      const sante = async (x) => (await T.client(x.base).get('/health')).j || {};
      vrai('chaque lancement porte SON identité, et `/health` la redit (population : le service du banc, « banc » suivi de huit chiffres hexadécimaux)', /^banc[0-9a-f]{8}$/.test(svc.sha) && (await sante(svc)).sha === svc.sha);
      /* le port est IMPOSÉ (un redémarrage sur le même port), et un autre service le tient : on le DIT — avant, l'outil rendait un service « vivant » qui était celui de l'autre */
      let impose = null, refus = '';
      try { impose = await T.lancerService({ port: svc.port }); } catch (e) { refus = String(e && e.message); }
      v('⛔ un port IMPOSÉ que tient un autre service : `lancerService` REFUSE et dit pourquoi (un AUTRE service répond sur ce port) — il ne rend pas le service de l\'autre', [impose === null, /AUTRE service/.test(refus), refus.includes(String(svc.port))], [true, true, true]);
      if (impose) await impose.arreter();
      /* le port est tiré au sort, et le sort tombe sur un port pris (ici : forcé) : on recommence sur un port neuf, avec des données neuves */
      const autre = await T.lancerService({ portsDabord: [svc.port] });
      try {
        const h = await sante(autre);
        v('⛔ un port tiré qui se révèle PRIS : le service est relancé sur un autre port, et c\'est bien LUI qui répond (son identité, pas celle du premier)', [autre.port !== svc.port, autre.sorti(), h.sha === autre.sha, autre.sha !== svc.sha], [true, null, true, true]);
        vrai('   ses données sont les siennes : sa base existe dans SON dossier, à part de celle du premier service', fs.existsSync(path.join(autre.data, 'msg.db')) && autre.data !== svc.data);
        vrai('   et le premier service n\'a rien vu : il vit toujours, avec son identité', svc.sorti() === null && (await sante(svc)).sha === svc.sha);
      } finally { await autre.arreter(); }
      /* ⛔ un port tenu par un processus MUET (il accepte la connexion et ne répond jamais — un autre programme, pas un service d'OP MESSAGES) : le sondage de `/health` ne répond pas, le service meurt
         (`EADDRINUSE`) — c'est SA mort qui coupe le sondage. Avant : `fetch` restait pendu pour toujours, et le banc avec lui (la relecture l'a mesuré : toujours pendu après 40 s). Le plafond de
         vingt secondes ici n'est pas une durée pariée : il dit « ce n'est jamais revenu ». */
      const prises = [], muet = require('net').createServer((sk) => { prises.push(sk); });          // il accepte, garde la connexion, ne lit ni ne répond
      await new Promise((r) => muet.listen(0, '127.0.0.1', r));
      const portMuet = muet.address().port;
      let garde = null;
      const rendu = await Promise.race([T.lancerService({ portsDabord: [portMuet] }).then((x) => x, (e) => 'refus : ' + String(e && e.message).split('\n')[0]), new Promise((r) => { garde = setTimeout(() => r('pendu'), 20000); })]);
      clearTimeout(garde);
      const vivantAilleurs = !!rendu && typeof rendu === 'object';
      v('⛔ un port tiré que tient un processus MUET : `lancerService` ne reste pas pendu — le service est relancé sur un autre port, et c\'est lui qui répond', [vivantAilleurs ? 'vivant' : rendu, vivantAilleurs && rendu.port !== portMuet, vivantAilleurs && (await sante(rendu)).sha === rendu.sha], ['vivant', true, true]);
      if (vivantAilleurs) await rendu.arreter();
      for (const sk of prises) sk.destroy();                                                        // ses connexions ne se ferment pas seules (il ne lit rien) : sans ça, sa fermeture attendrait pour toujours
      await new Promise((r) => muet.close(r));
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    process.exitCode = 1;
  }
  try { if (lecteur) { lecteur.send({ quoi: 'sortir' }); lecteur.kill(); } } catch (e) { /* déjà sorti */ }
  if (svc) await svc.arreter();
  fin();
})();
