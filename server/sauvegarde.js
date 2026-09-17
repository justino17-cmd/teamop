/* ══ LA SAUVEGARDE HORS SITE — CE QUI MANQUAIT, ET QUI EST LE RISQUE N° 1 ═══════════════════
 *
 * État avant ce fichier, écrit noir sur blanc dans `REPRISE.md` (16 septembre 2026, relevé
 * « comment font les autres ») : **TeamOP n'a AUCUNE sauvegarde de son côté.** Organilog en
 * fait une par jour, Praxedo tient trois serveurs. Nous, nous avions celle de Google — jamais
 * restaurée par nous, donc jamais prouvée — et depuis l'étape 0 du socle, les photos de
 * terrain ne vivent même plus que sur **un seul disque, sur une seule machine**.
 *
 * ⛔ CE QUE CE MODULE SAUVEGARDE, ET POURQUOI LES DEUX. `DATA_DIR` porte tout ce que le
 * serveur sait : l'annuaire des espaces, les copies chiffrées des bases, les pièces jointes,
 * les comptes de la Tour, les accès bêta. `config.json` porte ce qu'on ne peut PAS reconstruire
 * en réinstallant : les clés VAPID (les perdre, c'est perdre TOUS les abonnements aux
 * notifications de tous les appareils, sans recours), le jeton GitHub, la clé Anthropic, le
 * SMTP. Une réinstallation sans lui laisse un serveur qui démarre et une plateforme amputée.
 *
 * ⛔ TOUT PART CHIFFRÉ, ET LA CLÉ N'EST PAS DANS LE COFFRE. L'archive contient `config.json`,
 * donc des secrets en clair : la déposer telle quelle chez un hébergeur d'objets reviendrait à
 * publier le serveur. Elle est donc chiffrée en AES-256-GCM avec `sauvegarde.cle`, une clé qui
 * ne sert QU'À ÇA. ⚠️ Elle vit dans `config.json`, donc DANS l'archive : c'est sans conséquence
 * pour qui vole le coffre (il n'a que du chiffré), mais ça veut dire qu'une restauration
 * PARTANT DE RIEN exige la clé conservée AILLEURS — gestionnaire de mots de passe, pas le VPS.
 * `server/restaurer.js` refuse de démarrer sans elle et le dit dans ces termes.
 *
 * ⛔ UNE SAUVEGARDE QU'ON N'A PAS RELUE N'EST PAS UNE SAUVEGARDE. C'est la leçon la plus chère
 * de ce métier, et la fiche du projet la porte déjà pour Firebase (« jamais restaurée par
 * nous »). Chaque dépôt est donc SUIVI D'UNE RELECTURE : on retélécharge l'objet, on vérifie
 * son empreinte, on le déchiffre, on le décompresse et on COMPTE SES ENTRÉES avec `tar -t`.
 * Tant que ces quatre étapes n'ont pas abouti, la sauvegarde est marquée en échec — même si le
 * dépôt a répondu 200. Le succès de l'envoi ne prouve que l'envoi.
 *
 * ⚠️ CE QU'UNE ARCHIVE PRISE À CHAUD NE GARANTIT PAS, et qu'il vaut mieux savoir d'avance : le
 * serveur écrit pendant que `tar` lit. Les fichiers `.json` sont écrits par fichier temporaire
 * puis renommage (`espacesEcrire`) — l'archive voit donc l'ancien ou le nouveau, jamais un
 * mélange. Les journaux `.jsonl` sont ajoutés en fin de fichier : au pire, la dernière ligne
 * est coupée. C'est pour ça que `tar` a le droit de rendre 1 (« file changed as we read it »),
 * et seulement 1 : 2 est une vraie erreur et fait échouer la sauvegarde.
 *
 * ⛔ ET RIEN NE S'ALLUME TOUT SEUL. Sans bloc `sauvegarde` dans `config.json`, ce module se
 * monte inerte : aucune minuterie, aucun appel réseau, `/health` dit `active:false`. Un banc
 * d'essai, une installation neuve et le serveur d'un développeur ne partent donc jamais écrire
 * chez un hébergeur d'objets par accident.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const { spawn } = require('child_process');
const s3mod = require('./s3');

/* Le format est écrit en toutes lettres en tête d'archive, parce que celui qui la lira un jour
   sera peut-être quelqu'un d'autre, sur une machine neuve, sans ce dépôt sous les yeux.
   Disposition : cette ligne, puis 12 octets de vecteur d'initialisation, puis le chiffré, puis
   les 16 octets d'étiquette d'authentification GCM À LA FIN (c'est GCM qui l'impose). */
const ENTETE = Buffer.from('TEAMOP-SAUV-1 aes-256-gcm gzip tar\n', 'utf8');
const TAILLE_IV = 12, TAILLE_TAG = 16;

const sha256hex = b => crypto.createHash('sha256').update(b).digest('hex');
const nombre = (x, d) => (Number.isFinite(x) && x > 0 ? x : d);

/* La clé : 64 caractères hexadécimaux, ni plus ni moins. Une chaîne courte ou un mot de passe
   « qu'on retiendra » donnerait une clé devinable — et une sauvegarde chiffrée avec un secret
   faible est une sauvegarde en clair qui se croit protégée. */
function cleDepuis(v) {
  const t = String(v || '').trim();
  if (!/^[0-9a-fA-F]{64}$/.test(t)) return null;
  return Buffer.from(t, 'hex');
}

/* Le nom porte l'instant en ISO, sans deux-points (interdits sur certains systèmes de fichiers
   et pénibles dans une URL). Il se trie donc dans l'ordre chronologique, ce dont la rétention
   se sert : pas de date à reparser, pas de fuseau à deviner. */
function nomArchive(quand) {
  return String((quand || new Date()).toISOString()).replace(/[:.]/g, '-').replace(/-\d{3}Z$/, 'Z');
}

/* ⛔ LA RÉTENTION EST UNE FONCTION PURE, ET C'EST DÉLIBÉRÉ : c'est le seul endroit du module
   qui EFFACE. Une erreur ici ne rend pas une sauvegarde bancale, elle supprime la dernière
   copie de tout. Séparée du réseau, elle s'éprouve au banc sur des listes fabriquées, y
   compris les cas qui font peur — liste vide, une seule copie, un objet étranger au préfixe.
   Deux règles, et la seconde a été écrite À L'ENVERS au premier jet — c'est le banc qui l'a
   rattrapée : on ne touche QU'À ce que ce module a écrit (suffixe attendu), et un réglage
   ABSURDE (0, négatif, pas un nombre) retombe sur le DÉFAUT de 30, il ne veut pas dire « vide
   le coffre ». Le sens du garde-fou est toujours le même : dans le doute, on efface MOINS. Un
   `garder: 0` tapé par erreur dans `config.json` ne doit pas coûter tout l'historique. */
function aElaguer(objets, garder) {
  const n = Math.max(1, nombre(garder, 30));
  const miens = (objets || []).filter(o => o && typeof o.cle === 'string' && /\.tar\.gz\.chiffre$/.test(o.cle));
  if (miens.length <= n) return [];
  const tries = miens.slice().sort((a, b) => (a.cle < b.cle ? 1 : a.cle > b.cle ? -1 : 0));   // plus récent d'abord
  return tries.slice(n).map(o => o.cle);
}

/* Écrit l'archive chiffrée dans `sortie` et rend { octets, empreinte }. Tout passe en FLUX :
   `tar` écrit dans gzip qui écrit dans le chiffreur qui écrit sur le disque. Rien n'est tenu en
   mémoire — une archive de plusieurs centaines de mégaoctets ferait tomber le serveur pour tous
   les clients, et elle grossira avec les photos. */
function fabriquer(sortie, cle, sources) {
  return new Promise((resolve, reject) => {
    const iv = crypto.randomBytes(TAILLE_IV);
    const chiffreur = crypto.createCipheriv('aes-256-gcm', cle, iv);
    const fichier = fs.createWriteStream(sortie);
    const empreinte = crypto.createHash('sha256');
    let octets = 0;
    /* L'empreinte se calcule SUR CE QUI PART, en passant : la recalculer en relisant le fichier
       doublerait la lecture disque et, surtout, mesurerait un autre fichier que celui envoyé. */
    const compter = c => { octets += c.length; empreinte.update(c); };

    fichier.write(ENTETE); compter(ENTETE);
    fichier.write(iv); compter(iv);

    const args = ['-c', '--warning=no-file-changed', '--warning=no-file-removed'];
    sources.forEach(s => { args.push('-C', path.dirname(s), path.basename(s)); });
    const tar = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let erreurTar = '';
    tar.stderr.on('data', d => { erreurTar += String(d).slice(0, 400); });

    const gz = zlib.createGzip({ level: 6 });
    let fini = false;
    const echouer = e => { if (fini) return; fini = true; try { tar.kill('SIGKILL'); } catch (x) {} fichier.destroy(); reject(e); };

    tar.stdout.pipe(gz);
    gz.on('data', c => { const x = chiffreur.update(c); if (x.length) { fichier.write(x); compter(x); } });
    gz.on('error', echouer);
    tar.on('error', echouer);

    /* ⛔ LES DEUX ÉCOUTEURS SONT POSÉS TOUT DE SUITE, ET LA CLÔTURE ATTEND LES DEUX. Au premier
       jet, `tar.on('close')` était installé DANS `gz.on('end')` — et `tar` a presque toujours
       déjà fini à cet instant, donc l'événement était passé et l'écouteur n'a jamais été
       appelé : la promesse ne se résolvait jamais et la sauvegarde restait suspendue pour
       toujours. Trouvé par `tests/test-722.js`, qui s'est arrêté net au lieu de finir. En
       production, ça aurait donné une minuterie qui part à 3 h du matin et ne revient pas —
       une panne muette, sur le mécanisme dont le rôle est précisément de ne pas être muet.
       On attend le code de sortie de `tar` AVANT de clore : une archive tronquée par une
       erreur de lecture partirait sinon comme une sauvegarde valable, le flux se terminant
       proprement dans les deux cas. */
    let fluxFini = false, codeTar = null;
    const peutClore = () => {
      if (fini || !fluxFini || codeTar === null) return;
      if (codeTar !== 0 && codeTar !== 1) return echouer(new Error('tar a rendu ' + codeTar + (erreurTar ? ' : ' + erreurTar.trim() : '')));
      const reste = chiffreur.final(); if (reste.length) { fichier.write(reste); compter(reste); }
      const tag = chiffreur.getAuthTag(); fichier.write(tag); compter(tag);
      fichier.end();
      fichier.on('close', () => { if (fini) return; fini = true; resolve({ octets, empreinte: empreinte.digest('hex') }); });
    };
    gz.on('end', () => { fluxFini = true; peutClore(); });
    tar.on('close', code => { codeTar = code; peutClore(); });
  });
}

/* Relit une archive chiffrée : déchiffre, décompresse, et COMPTE les entrées avec `tar -t`.
   C'est la seule preuve qui vaille — une archive qu'on n'a pas su rouvrir n'est pas une
   sauvegarde. Rend le nombre d'entrées, ou lève. Sert à la vérification après dépôt ET à
   `restaurer.js`, qui n'a donc pas sa propre copie de ce code (une seconde définition finirait
   par diverger, et c'est le jour de la restauration qu'on s'en apercevrait). */
function relire(chemin, cle, extraireVers) {
  return new Promise((resolve, reject) => {
    let stat; try { stat = fs.statSync(chemin); } catch (e) { return reject(new Error('archive introuvable')); }
    const minimum = ENTETE.length + TAILLE_IV + TAILLE_TAG;
    if (stat.size <= minimum) return reject(new Error('archive trop courte pour être valable'));

    const debut = Buffer.alloc(ENTETE.length + TAILLE_IV), fin = Buffer.alloc(TAILLE_TAG);
    const fd = fs.openSync(chemin, 'r');
    try {
      fs.readSync(fd, debut, 0, debut.length, 0);
      fs.readSync(fd, fin, 0, TAILLE_TAG, stat.size - TAILLE_TAG);
    } finally { fs.closeSync(fd); }
    if (!debut.subarray(0, ENTETE.length).equals(ENTETE)) return reject(new Error("ce fichier n'est pas une archive TeamOP (en-tête absent)"));

    const dechiffreur = crypto.createDecipheriv('aes-256-gcm', cle, debut.subarray(ENTETE.length));
    dechiffreur.setAuthTag(fin);
    const flux = fs.createReadStream(chemin, { start: ENTETE.length + TAILLE_IV, end: stat.size - TAILLE_TAG - 1 });
    const gunzip = zlib.createGunzip();
    const args = extraireVers ? ['-x', '-C', extraireVers] : ['-t'];
    const tar = spawn('tar', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let entrees = 0, erreur = '';
    tar.stdout.on('data', d => { entrees += (String(d).match(/\n/g) || []).length; });
    tar.stderr.on('data', d => { erreur += String(d).slice(0, 400); });

    let echoue = false;
    const rater = e => { if (echoue) return; echoue = true; try { tar.kill('SIGKILL'); } catch (x) {} reject(e); };
    /* ⛔ L'étiquette GCM n'est vérifiée qu'au DERNIER octet : une archive modifiée se lit
       normalement jusqu'au bout, puis `final()` lève. C'est justement ce qu'on veut savoir. */
    flux.on('error', rater); dechiffreur.on('error', e => rater(new Error('déchiffrement impossible — clé fausse ou archive abîmée : ' + e.message)));
    gunzip.on('error', e => rater(new Error('décompression impossible : ' + e.message)));
    tar.on('error', rater);
    flux.pipe(dechiffreur).pipe(gunzip).pipe(tar.stdin);
    tar.stdin.on('error', () => {});   // tar peut clore tôt sur une archive abîmée : EPIPE n'est pas l'erreur utile
    tar.on('close', code => {
      if (echoue) return;
      if (code !== 0) return reject(new Error('archive illisible (tar a rendu ' + code + (erreur ? ' : ' + erreur.trim() : '') + ')'));
      if (!entrees && !extraireVers) return reject(new Error('archive vide'));
      resolve({ entrees });
    });
  });
}

function monterSauvegarde(app, deps) {
  const { config, DATA_DIR, CONFIG_PATH, garde } = deps || {};
  const conf = (config && config.sauvegarde) || null;
  const ETAT_PATH = path.join(DATA_DIR, 'sauvegardes-hors-site.json');

  let etat = { derniere: null, histo: [] };
  try { etat = Object.assign(etat, JSON.parse(fs.readFileSync(ETAT_PATH, 'utf8'))); } catch (e) {}
  const ecrireEtat = () => {
    /* Temporaire puis renommage — la même règle que l'annuaire : un fichier d'état tronqué par
       une coupure ferait croire qu'aucune sauvegarde n'a jamais eu lieu, et la surveillance
       hurlerait sur une plateforme saine. */
    try {
      const tmp = ETAT_PATH + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(etat));
      fs.renameSync(tmp, ETAT_PATH);
    } catch (e) { console.error('état de sauvegarde non écrit :', e.message); }
  };

  const cle = conf ? cleDepuis(conf.cle) : null;
  /* ⛔ LE COFFRE EST INJECTABLE, ET C'EST LA CONDITION POUR QUE CE MODULE SOIT ÉPROUVÉ. Sans
     cette couture, un banc ne pourrait vérifier que la partie pure : la chaîne qui compte —
     déposer, RELIRE, constater qu'un octet a changé, élaguer — ne serait jamais jouée ailleurs
     qu'en production, sur le seul mécanisme dont on ne peut pas se permettre d'apprendre les
     défauts par l'usage. `tests/test-722.js` passe donc un coffre en mémoire, et lui fait
     rendre les pannes qu'un vrai hébergeur rend un mauvais jour. En production, `deps.client`
     est absent et c'est `s3.js` qui parle au vrai coffre — le même chemin, sans détour. */
  const client = (deps && deps.client) || (conf ? s3mod.client(conf) : null);
  const actif = !!(conf && cle && client);
  if (conf && !actif) {
    /* On le DIT au démarrage plutôt que d'échouer silencieusement à 3 h du matin. Ne jamais
       nommer la valeur fautive : ce journal part dans journalctl. */
    console.error('sauvegarde hors site NON active : ' + (!cle ? 'sauvegarde.cle doit faire 64 caractères hexadécimaux' : 'endpoint, bucket, accessKey ou secretKey manquant'));
  }

  const PREFIXE = (conf && conf.prefixe) || 'teamop/';
  const GARDER = nombre(conf && conf.garder, 30);
  /* `nombre()` traite 0 comme « absent » — ce qui est juste pour une taille, faux pour une
     heure : minuit est une heure parfaitement valable. On la lit donc à part. */
  const HEURE = (h => (Number.isInteger(h) && h >= 0 && h <= 23) ? h : 3)(conf && conf.heureUTC);
  const MAX_OCTETS = nombre(conf && conf.maxOctets, 4 * 1024 * 1024 * 1024);
  let enCours = false;

  async function lancer(raison) {
    if (!actif) return { ok: false, motif: 'inactive' };
    if (enCours) return { ok: false, motif: 'deja-en-cours' };
    enCours = true;
    const t0 = Date.now();
    const nom = nomArchive(new Date());
    const cleObjet = PREFIXE + nom + '.tar.gz.chiffre';
    const tmp = path.join(DATA_DIR, '.sauvegarde-' + process.pid + '.tmp');
    const tmpRelu = tmp + '.relu';
    const noter = (ok, motif, extra) => {
      const ligne = Object.assign({ ts: Date.now(), ms: Date.now() - t0, ok, motif: motif || '', raison: raison || '', cle: cleObjet }, extra || {});
      etat.derniere = ligne;
      etat.histo = [ligne].concat(etat.histo || []).slice(0, 60);
      ecrireEtat();
      /* ⛔ Le journal ne porte ni nom d'entreprise, ni chemin de fichier client : uniquement des
         nombres et un motif machine. `journalctl` se relit à plusieurs et se copie-colle. */
      console.log('sauvegarde ' + (ok ? 'OK' : 'ÉCHEC ' + motif) + ' · ' + Math.round((extra && extra.octets || 0) / 1024) + ' Kio · ' + (Date.now() - t0) + ' ms');
      return Object.assign({ ok }, ligne);
    };

    try {
      const sources = [DATA_DIR];
      try { if (CONFIG_PATH && fs.statSync(CONFIG_PATH).isFile()) sources.push(CONFIG_PATH); } catch (e) {}

      const faite = await fabriquer(tmp, cle, sources);
      if (faite.octets > MAX_OCTETS) return noter(false, 'trop-volumineuse', { octets: faite.octets });

      const corps = fs.readFileSync(tmp);
      const dep = await client.poser('', cleObjet, corps);
      if (!dep.ok) return noter(false, 'depot-' + (dep.statut || 'erreur'), { octets: faite.octets });

      /* ── LA RELECTURE, qui est le vrai sujet ────────────────────────────────────────────
         On retélécharge ce qui vient d'être déposé — pas le fichier local. Trois contrôles,
         du moins cher au plus probant : la taille, l'empreinte, puis l'ouverture réelle. */
      const relu = await client.lire('', cleObjet);
      if (!relu.ok) return noter(false, 'relecture-' + (relu.statut || 'absente'), { octets: faite.octets });
      if (relu.corps.length !== faite.octets) return noter(false, 'taille-differente', { octets: faite.octets, relu: relu.corps.length });
      if (sha256hex(relu.corps) !== faite.empreinte) return noter(false, 'empreinte-differente', { octets: faite.octets });

      fs.writeFileSync(tmpRelu, relu.corps);
      const ouverte = await relire(tmpRelu, cle, null);
      if (!ouverte.entrees) return noter(false, 'archive-vide', { octets: faite.octets });

      /* La rétention seulement après une sauvegarde RÉUSSIE : on n'efface jamais une ancienne
         copie sur la foi d'une nouvelle qu'on n'a pas pu rouvrir. */
      let elaguees = 0;
      const liste = await client.lister(PREFIXE);
      if (liste && liste.ok) {
        for (const c of aElaguer(liste.objets, GARDER)) { const r = await client.effacer('', c); if (r.ok) elaguees++; }
      }
      return noter(true, '', { octets: faite.octets, entrees: ouverte.entrees, empreinte: faite.empreinte.slice(0, 16), elaguees, gardees: liste && liste.ok ? Math.min(GARDER, (liste.objets || []).length + 1) : null });
    } catch (e) {
      return noter(false, 'exception', { erreur: String(e.message).slice(0, 200) });
    } finally {
      enCours = false;
      for (const f of [tmp, tmpRelu]) { try { fs.unlinkSync(f); } catch (e) {} }
    }
  }

  /* ⛔ AGRÉGÉ, PARCE QUE `/health` EST PUBLIQUE. L'âge et le nombre disent ce qu'on a besoin de
     savoir en exploitation — « la sauvegarde de cette nuit a-t-elle eu lieu ? ». Le POIDS, lui,
     n'y est pas : c'est le volume de données de tous les clients réunis, donc un journal de
     leur activité, exactement ce que le compteur des pièces jointes arrondit déjà pour la même
     raison. Il est servi à la Tour, qui exige le patron. */
  function sante() {
    const d = etat.derniere;
    return { active: actif, ageH: d && d.ok ? Math.round((Date.now() - d.ts) / 3600000) : null, ok: d ? !!d.ok : null, motif: d && !d.ok ? d.motif : '' };
  }

  if (app && garde) {
    app.get('/api/monitor/sauvegarde/etat', garde, (req, res) => res.json({ ok: true, active: actif, garder: GARDER, heureUTC: HEURE, derniere: etat.derniere, histo: (etat.histo || []).slice(0, 20) }));
    app.post('/api/monitor/sauvegarde/lancer', garde, async (req, res) => { const r = await lancer('tour'); res.json(r); });
  }

  /* La minuterie : un réveil toutes les dix minutes, une sauvegarde si l'heure est passée et
     que la dernière RÉUSSIE date de plus de vingt heures. Pas de cron système (il faudrait le
     poser à l'installation et il se perdrait à la réinstallation), pas de « toutes les
     24 heures » depuis le démarrage (le serveur redémarre à chaque déploiement, et une
     sauvegarde tomberait alors en pleine journée de travail). `unref()` : cette minuterie ne
     doit pas, à elle seule, empêcher un processus de se terminer — c'est ce qui ferait
     s'éterniser les bancs d'essai. */
  let minuterie = null;
  if (actif) {
    const tic = () => {
      const maintenant = new Date();
      if (maintenant.getUTCHours() < HEURE) return;
      const d = etat.derniere;
      if (d && d.ok && Date.now() - d.ts < 20 * 3600000) return;
      /* Un échec ne se rejoue pas toutes les dix minutes : on réessaie au plus une fois par
         heure, sinon une panne du coffre remplirait le journal et taperait sur l'hébergeur. */
      if (d && !d.ok && Date.now() - d.ts < 3600000) return;
      lancer('minuterie').catch(e => console.error('sauvegarde : ' + e.message));
    };
    minuterie = setInterval(tic, 600000); minuterie.unref();
  }

  return { actif, lancer, sante, etat: () => etat, _minuterie: () => minuterie };
}

module.exports = { monterSauvegarde, fabriquer, relire, aElaguer, cleDepuis, nomArchive, ENTETE, TAILLE_IV, TAILLE_TAG };
