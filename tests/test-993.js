/* ⛔ CE QUE CE FICHIER GARDE — LES OUTILS DES BANCS D'OP MESSAGES NE FABRIQUENT PAS DE FAUX DÉFAUTS (`outils-msg.js`, `lib-horloge-msg.js`).

   Le 16 novembre 2026, `test-981` (les appels à deux) tombait sous charge — 8 passages sur 80 avec vingt exécutions en parallèle — et la CI en était morte deux fois (« undefined.lie »). Aucune des
   causes n'était dans le service : trois courses vivaient dans les OUTILS que tous les bancs du service partagent. Un outil de banc qui ment fait accuser le service, puis fait ignorer le banc.
   Ce fichier rejoue chacune AU GESTE (aucune n'attend qu'une machine soit lente pour se montrer) :

     1. L'HORLOGE NE SAUTE PAS. Le service relit le fichier de décalage à chaque `Date.now()`. Lu VIDE (entre la troncature et l'écriture d'un `writeFileSync`), ABSENT ou ILLISIBLE, il valait
        « pas de décalage » : l'horloge sautait à l'heure réelle, des semaines après celle du banc, le temps d'une lecture — le balayeur des appels passait dedans. Une lecture qui ne rend pas un
        nombre garde désormais le dernier décalage lu.
     2. LE DÉCALAGE SE POSE D'UN SEUL GESTE. `avancer()` écrit un fichier temporaire puis le RENOMME : le fichier lu n'est jamais tronqué. Preuve par l'inode — un renommage le change, une écriture
        sur place le garde — sans dépendre de la fonction d'écriture employée.
     3. UN PORT TIRÉ EST RÉSERVÉ. Deux bancs en parallèle recevaient parfois le même port « libre » (le système le redonne aussitôt libéré : 246 ports tirés à deux sur 2 000, mesuré). La
        réservation est un fichier créé d'un seul geste, qui part avec le processus ; une réservation orpheline et ancienne s'efface.
     4. LE SERVICE QUI RÉPOND EST LE NÔTRE. Avec un autre processus sur son port, `lancerService` rendait un service « sain » qui n'était pas le sien (sa base n'existait pas). Il regarde désormais
        AVANT de lancer : un port où quelqu'un répond n'est pas pris. ⚠️ La première garde écrite (attendre que notre processus dise « demarre », puis le vouloir vivant) tenait à vide et tombait
        53 fois sur 60 avec vingt exécutions en parallèle : notre processus mourant répondait encore « vivant ». D'où le contrôle du MESSAGE ci-dessous — c'est le regard d'avant qui doit refuser.

   Contre-épreuve : remettre chaque défaut fait tomber sa section (jouée le 16 novembre 2026 sur une copie de l'arbre ; voir REPRISE.md). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const { spawn, spawnSync } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

(async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-outils-'));
  try {
    /* ═══════ 1. L'HORLOGE ═══════ */
    console.log('L\'horloge décalable : une lecture qui ne rend pas un nombre garde le dernier décalage, jamais zéro');
    {
      /* un processus qui porte la VRAIE horloge des bancs et répond, à chaque ligne reçue, l'écart entre son `Date.now()` et l'heure réelle (`performance`, que le greffon ne touche pas) : on lui
         pose la question APRÈS chaque geste sur le fichier — aucune attente */
      const f = path.join(dossier, 'decalage');
      fs.writeFileSync(f, '-5000000');
      const enfant = spawn(process.execPath, ['--require', path.join(__dirname, 'lib-horloge-msg.js'), '-e',
        'const { performance } = require("perf_hooks"); require("readline").createInterface({ input: process.stdin }).on("line", () => console.log(Math.round(Date.now() - (performance.timeOrigin + performance.now()))));'],
        { env: Object.assign({}, process.env, { OPMSG_HORLOGE_DECALAGE: f }), stdio: ['pipe', 'pipe', 'inherit'] });
      let tampon = ''; const attente = [];
      enfant.stdout.on('data', d => { tampon += d; let i; while ((i = tampon.indexOf('\n')) >= 0) { const l = tampon.slice(0, i); tampon = tampon.slice(i + 1); const r = attente.shift(); if (r) r(Number(l)); } });
      const ecart = () => new Promise(r => { attente.push(r); enfant.stdin.write('?\n'); });
      /* à une demi-seconde près : les deux horloges sont lues dans le même processus, au même instant — l'écart est le décalage, à la milliseconde */
      const vaut = (x, d) => Math.abs(x - d) < 500;
      const e0 = await ecart();
      vrai('population : l\'horloge suit le fichier (décalage posé : −5 000 000 ms, lu : ' + e0 + ')', vaut(e0, -5000000));
      fs.writeFileSync(f, '');
      const eVide = await ecart();
      vrai('⛔ fichier VIDE (ce que lit le service entre la troncature et l\'écriture) : le dernier décalage reste — l\'horloge ne saute pas à l\'heure réelle (lu : ' + eVide + ')', vaut(eVide, -5000000));
      fs.writeFileSync(f, 'pas un nombre');
      const eFaux = await ecart();
      vrai('⛔ fichier ILLISIBLE (du texte) : le dernier décalage reste (lu : ' + eFaux + ')', vaut(eFaux, -5000000));
      fs.unlinkSync(f);
      const eAbsent = await ecart();
      vrai('⛔ fichier ABSENT (le dossier du banc qu\'on efface pendant que le service s\'arrête) : le dernier décalage reste (lu : ' + eAbsent + ')', vaut(eAbsent, -5000000));
      fs.writeFileSync(f, '7200000');
      const eNeuf = await ecart();
      vrai('   et un décalage neuf est suivi aussitôt (posé : +7 200 000 ms, lu : ' + eNeuf + ')', vaut(eNeuf, 7200000));
      fs.writeFileSync(f, '0');
      vrai('   zéro est un décalage comme un autre (posé : 0, lu : ' + (await ecart()) + ')', vaut(await ecart(), 0));
      enfant.stdin.end(); enfant.kill();
    }

    /* ═══════ 2. AVANCER, D'UN SEUL GESTE — ET 4. LE SERVICE EST LE NÔTRE ═══════ */
    console.log('\nAvancer l\'horloge d\'un service : par renommage, jamais par une écriture sur le fichier lu');
    {
      const svc = await T.lancerService({ horloge: true, decalageInitial: -3600000 });
      try {
        const f = path.join(svc.racine, 'decalage-horloge');
        const lire = () => fs.readFileSync(f, 'utf8');
        const ino0 = fs.statSync(f).ino;
        v('population : le service est lancé avec son décalage initial, posé AVANT son démarrage', lire(), '-3600000');
        svc.avancer(60000);
        const ino1 = fs.statSync(f).ino;
        svc.avancer(1);
        const ino2 = fs.statSync(f).ino;
        v('⛔ chaque `avancer` REMPLACE le fichier (un inode neuf à chaque fois : un renommage) — une écriture sur place garderait l\'inode, et laisserait le fichier vide un instant', [ino1 !== ino0, ino2 !== ino1, lire()], [true, true, '-3539999']);
        v('   il ne reste aucun fichier temporaire derrière', fs.readdirSync(svc.racine).filter(n => /decalage-horloge./.test(n)), []);

        console.log('\nUn service lancé sur un port qu\'un AUTRE processus tient : refusé, en nommant le port');
        /* le leurre répond « ok » à /health, comme le ferait le service d'un autre banc */
        const port = await T.portLibre();
        const leurre = http.createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{"ok":true}'); });
        await new Promise(r => leurre.listen(port, '127.0.0.1', r));
        vrai('population : quelqu\'un écoute sur ce port (le leurre), et personne sur un port tout juste tiré', (await T.portTenu(port)) === true && (await T.portTenu(await T.portLibre())) === false);
        let rendu = null, erreur = null;
        try { rendu = await T.lancerService({ port }); } catch (e) { erreur = String(e && e.message); }
        if (rendu) await rendu.arreter();
        await new Promise(r => { leurre.closeAllConnections(); leurre.close(r); });
        v('⛔ `lancerService` ne rend PAS le service d\'un autre (population : le leurre répondait 200 à /health sur ce port) — il le voit AVANT de lancer quoi que ce soit, et nomme le port', [rendu === null, erreur], [true, 'le port ' + port + ' répond déjà : un autre processus le tient — le service n\'a pas été lancé']);
        v('   et le service légitime, lui, répond toujours (le sien : son journal dit « demarre »)', [(await fetch(svc.base + '/health')).status, /"evt":"demarre"/.test(svc.sortie.texte())], [200, true]);
      } finally { await svc.arreter(); }
    }

    /* ═══════ 3. LE PORT ═══════ */
    console.log('\nUn port tiré est RÉSERVÉ pour la vie du processus');
    {
      const soi = (code, ...args) => spawnSync(process.execPath, ['-e', 'const T = require(' + JSON.stringify(path.join(__dirname, 'outils-msg.js')) + '); (async () => { ' + code + ' })();', ...args], { encoding: 'utf8' });
      const p = await T.portLibre();
      const fichier = path.join(T.DOSSIER_PORTS, String(p));
      v('la réservation est un fichier au nom du port, qui porte le numéro de ce processus', [fs.existsSync(fichier) && fs.readFileSync(fichier, 'utf8')], [String(process.pid)]);
      const autre = soi('console.log(JSON.stringify(T.reserverPort(Number(process.argv[1]))));', String(p));
      v('⛔ un AUTRE processus ne peut pas réserver ce port (il en tirera un autre) — et sa tentative ne retire pas la nôtre', [autre.stdout.trim(), fs.existsSync(fichier)], ['false', true]);
      v('   le même processus non plus : un port tiré ne se redonne pas', T.reserverPort(p), false);
      const tires = []; for (let i = 0; i < 40; i++) tires.push(await T.portLibre());
      v('quarante tirages de suite : quarante ports différents, tous réservés', [new Set(tires).size, tires.filter(q => !fs.existsSync(path.join(T.DOSSIER_PORTS, String(q)))).length], [40, 0]);
      /* la réservation part avec le processus qui la tient */
      const ne = soi('const p = await T.portLibre(); console.log(p + " " + require("fs").existsSync(require("path").join(T.DOSSIER_PORTS, String(p)))); process.exit(0);');
      const [pEnfant, tenue] = ne.stdout.trim().split(' ');
      v('⛔ la réservation PART avec son processus (population : l\'enfant la tenait de son vivant)', [tenue, /^\d+$/.test(pEnfant) && fs.existsSync(path.join(T.DOSSIER_PORTS, pEnfant))], ['true', false]);
      /* une réservation orpheline : le processus qui la tenait a été tué (rien ne l'a effacée). Récente, elle met le port de côté ; ancienne (dix minutes), elle s'efface. On la fabrique : le numéro
         d'un processus qui vient de finir, sur un port que le système nous donne (retiré de nos propres réservations pour l'occasion). */
      const mort = spawnSync(process.execPath, ['-e', 'console.log(process.pid)'], { encoding: 'utf8' }).stdout.trim();
      const orphelin = path.join(T.DOSSIER_PORTS, 'orphelin-' + process.pid);       // un nom qui n'est le port de personne : la règle se joue sur le fichier, pas sur un vrai port
      const jouer = (nom, age) => { const f = path.join(T.DOSSIER_PORTS, nom); fs.writeFileSync(f, mort); const t = new Date(Date.now() - age); fs.utimesSync(f, t, t); const r = T.reserverPort(nom); return [r, fs.existsSync(f)]; };
      v('⛔ une réservation orpheline RÉCENTE (processus mort, une minute) : le port reste de côté, le fichier aussi', jouer(path.basename(orphelin), 60000), [false, true]);
      v('   ANCIENNE (onze minutes) : ce tirage-ci ne la prend pas, mais elle est effacée — le port reviendra', jouer(path.basename(orphelin), 660000), [false, false]);
      const vivante = path.join(T.DOSSIER_PORTS, 'vivante-' + process.pid);
      fs.writeFileSync(vivante, String(process.pid)); const vieux = new Date(Date.now() - 3600000); fs.utimesSync(vivante, vieux, vieux);
      v('⛔ une réservation ANCIENNE dont le processus VIT (un banc long) n\'est jamais effacée', [T.reserverPort(path.basename(vivante)), fs.existsSync(vivante)], [false, true]);
      for (const f of [vivante, orphelin]) { try { fs.unlinkSync(f); } catch (e) { /* déjà partie : le contrôle au-dessus l'a dit */ } }
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    process.exitCode = 1;
  }
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) { /* déjà parti */ }
  fin();
})();
