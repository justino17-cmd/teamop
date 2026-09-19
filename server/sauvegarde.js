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
const fs = require('fs'), path = require('path'), crypto = require('crypto'), zlib = require('zlib'), os = require('os');
const { spawn } = require('child_process');
const { pipeline } = require('stream/promises');
const { Transform } = require('stream');
const gzip = () => zlib.createGzip({ level: 6 });
const s3mod = require('./s3');

/* Le format est écrit en toutes lettres en tête d'archive, parce que celui qui la lira un jour
   sera peut-être quelqu'un d'autre, sur une machine neuve, sans ce dépôt sous les yeux.
   Disposition : cette ligne, puis 12 octets de vecteur d'initialisation, puis le chiffré, puis
   les 16 octets d'étiquette d'authentification GCM À LA FIN (c'est GCM qui l'impose). */
const ENTETE = Buffer.from('TEAMOP-SAUV-1 aes-256-gcm gzip tar\n', 'utf8');
const TAILLE_IV = 12, TAILLE_TAG = 16;

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
async function fabriquer(sortie, cle, sources, exclure) {
  const iv = crypto.randomBytes(TAILLE_IV);
  const chiffreur = crypto.createCipheriv('aes-256-gcm', cle, iv);
  const fichier = fs.createWriteStream(sortie);
  const empreinte = crypto.createHash('sha256');
  let octets = 0;
  /* L'empreinte se calcule SUR CE QUI PART, en passant : la recalculer en relisant le fichier
     doublerait la lecture disque et, surtout, mesurerait un autre fichier que celui envoyé. */
  const compter = c => { octets += c.length; empreinte.update(c); };
  const compteur = new Transform({ transform(c, e, cb) { compter(c); cb(null, c); } });

  const args = ['-c', '--warning=no-file-changed', '--warning=no-file-removed'];
  /* ⛔ ON S'EXCLUT SOI-MÊME. L'archive temporaire est écrite hors de `DATA_DIR` (voir `lancer`),
     mais cette exclusion est la ceinture en plus des bretelles : `gardien` a MESURÉ, le
     17 septembre 2026, qu'un fichier temporaire resté dans le dossier source faisait passer une
     archive de 200 Ko à 5,2 Mo — chaque nuit ré-archivant le reste de la veille, en cumulant. */
  (exclure || []).forEach(x => args.push('--exclude=' + x));
  sources.forEach(s2 => { args.push('-C', path.dirname(s2), path.basename(s2)); });
  const tar = spawn('tar', args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let erreurTar = '';
  tar.stderr.on('data', d => { erreurTar += String(d).slice(0, 400); });
  /* Le code de sortie de `tar` se capte AVANT d'attendre le flux : posé plus tard, l'événement
     est déjà passé et l'écouteur n'est jamais appelé — la promesse ne se résout alors JAMAIS,
     et la minuterie part à 3 h du matin sans revenir. C'est le premier défaut que ce fichier a
     eu, trouvé parce que le banc s'est arrêté net au lieu de finir. */
  const codeTar = new Promise((res, rej) => { tar.on('close', res); tar.on('error', rej); });

  try {
    fichier.write(ENTETE); compter(ENTETE);
    fichier.write(iv); compter(iv);
    /* ⛔ `pipeline` PLUTÔT QU'UN CHAÎNAGE D'ÉCOUTEURS, et c'est `gardien` qui l'a exigé : le
       flux d'écriture n'avait AUCUN écouteur `error`. Un disque plein, un droit manquant, une
       erreur d'entrée-sortie, et Node 22 transforme l'événement sans écouteur en ARRÊT DU
       PROCESSUS — reproduit, code de sortie 9. L'API tombait donc pour ELAN au milieu de la
       nuit, et repartait en boucle toutes les dix minutes puisque l'échec n'était même pas
       enregistré. `pipeline` surveille CHAQUE maillon et respecte la contre-pression : sans
       elle, un disque plus lent que la compression fait enfler le tampon en mémoire sans borne. */
    await pipeline(tar.stdout, gzip(), chiffreur, compteur, fichier, { end: false });
    const code = await codeTar;
    if (code !== 0 && code !== 1) throw new Error('tar a rendu ' + code + (erreurTar ? ' : ' + erreurTar.trim() : ''));
    const tag = chiffreur.getAuthTag(); compter(tag);
    await new Promise((res, rej) => fichier.end(tag, e => (e ? rej(e) : res())));
    return { octets, empreinte: empreinte.digest('hex') };
  } catch (e) {
    try { tar.kill('SIGKILL'); } catch (x) {}
    try { fichier.destroy(); } catch (x) {}
    throw e;
  }
}

/* Relit une archive chiffrée : déchiffre, décompresse, et COMPTE les entrées avec `tar -t`.
   C'est la seule preuve qui vaille — une archive qu'on n'a pas su rouvrir n'est pas une
   sauvegarde. Rend le nombre d'entrées, ou lève. Sert à la vérification après dépôt ET à
   `restaurer.js`, qui n'a donc pas sa propre copie de ce code (une seconde définition finirait
   par diverger, et c'est le jour de la restauration qu'on s'en apercevrait). */
/* ⛔ CE QUI DOIT ÊTRE LÀ, PAS SEULEMENT CE QUI EST LÀ. La première version de ce contrôle
 * ouvrait chaque fichier `.db` qu'elle trouvait et concluait « saine » — sur une archive
 * AMPUTÉE DE L'ANNUAIRE, elle disait donc ✅. Elle fermait « compter des fichiers n'est pas
 * relire » et laissait entière la question « est-ce que tout ce qu'il faut est là ».
 * Trois exigences, et chacune a sa panne derrière :
 *   · l'ANNUAIRE est présent — sans lui, aucune clé, donc aucune donnée lisible ;
 *   · chaque base s'OUVRE et se parcourt (`quick_check`), 0 octet compris ;
 *   · aucune copie `.brut` n'est passée en silence — c'est une base qu'on n'a PAS su
 *     instantaner, donc une entreprise en difficulté, donc exactement celle qu'il ne faut pas
 *     perdre de vue.
 * ⚠️ On vérifie l'INTÉGRITÉ DES FICHIERS, pas qu'on sache les déchiffrer : ce sont deux
 * questions distinctes et une seule est du ressort d'une sauvegarde. */
function verifierInstantane(dossier, socle) {
  let noms = [];
  try { noms = fs.readdirSync(dossier); } catch (e) { return { ok: false, motif: 'instantané absent de l\'archive', bases: 0, cassees: 0, brutes: 0 }; }
  const bases = noms.filter(f => f.endsWith('.db'));
  const brutes = noms.filter(f => f.endsWith('.db.brut'));
  if (!bases.some(f => f === 'socle-annuaire.db')) {
    return { ok: false, motif: 'ANNUAIRE ABSENT — les clés de toutes les entreprises manquent, rien ne sera lisible', bases: bases.length, cassees: 0, brutes: brutes.length };
  }
  let cassees = 0;
  for (const f of bases.concat(brutes)) if (!socle.controlerFichier(path.join(dossier, f)).ok) cassees++;
  if (cassees) return { ok: false, motif: cassees + ' base(s) illisible(s) dans l\'archive', bases: bases.length, cassees, brutes: brutes.length };
  if (brutes.length) return { ok: false, motif: brutes.length + ' base(s) n\'ont PAS pu être instantanées (copie brute) — à examiner', bases: bases.length, cassees, brutes: brutes.length };
  return { ok: true, motif: '', bases: bases.length, cassees: 0, brutes: 0 };
}

/* Le même contrôle, mais en partant d'une archive chiffrée : on la déballe dans un temporaire. */
async function verifierSocle(archive, cle, socle) {
  const dossier = archive + '.socle';
  try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  fs.mkdirSync(dossier, { recursive: true });
  try {
    await relire(archive, cle, dossier);
    return verifierInstantane(path.join(dossier, socle.SOCLE_INSTANTANE), socle);
  } catch (e) {
    return { ok: false, motif: 'archive illisible', bases: 0, cassees: -1, brutes: 0 };
  } finally {
    try { fs.rmSync(dossier, { recursive: true, force: true }); } catch (e) {}
  }
}

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

  /* À CÔTÉ de DATA_DIR, jamais dedans. Et on vide ce qui traîne AU MONTAGE, comme `pieces.js`
     le fait de son propre dossier temporaire : sans ce ménage, un plantage laisse un fichier de
     plusieurs gigaoctets que plus personne ne réclame. */
  const TMP_DIR = path.join(path.dirname(DATA_DIR), '.teamop-sauvegarde-tmp');
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch (e) {}
  try { fs.mkdirSync(TMP_DIR, { recursive: true }); } catch (e) {}
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
    /* ⛔ LE TEMPORAIRE NE VIT PAS DANS LE DOSSIER QU'ON ARCHIVE. Il y était au premier jet, et
       `gardien` l'a mesuré : un `.sauvegarde-*.tmp` de 5 Mo resté dans `data/` faisait passer
       l'archive de 200 Ko à 5,2 Mo — chaque nuit ré-archivant le reste de la veille. Un
       plantage, un manque de mémoire ou un déploiement en pleine sauvegarde suffisait à le
       laisser là. On écrit donc À CÔTÉ de `DATA_DIR` : même partition (donc la place disque
       reste prévisible) mais hors de l'arbre archivé. */
    const tmp = path.join(TMP_DIR, 'sauvegarde-' + process.pid + '.tmp');
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

      /* ⛔ LES BASES SQLite DU SOCLE NE PARTENT PAS VIVANTES. `tar` lit `base.db`, un point de
         reprise a lieu pendant l'archivage, `tar` lit ensuite `-wal` : les deux moitiés ne vont
         plus ensemble. MESURÉ le 18 septembre 2026 — la base restaurée lève `database disk
         image is malformed` au premier SELECT. Et rien ne le voyait, parce que la relecture
         plus bas COMPTE des entrées de `tar -t` sans jamais ouvrir une base : l'archive était
         déclarée « restaurable » toutes les nuits. On prend donc un instantané cohérent
         (`VACUUM INTO`, la réponse de SQLite à exactement cette question) et on EXCLUT les
         fichiers vivants de l'archive.
         ⚠️ Si l'instantané échoue, on ÉCHOUE LA SAUVEGARDE — on ne dépose pas une archive
         amputée du socle en la déclarant bonne. Une sauvegarde qui ment est pire que pas de
         sauvegarde : on ne la découvre que le jour où on en a besoin. */
      let instantane = null;
      if (deps.socle) {
        try {
          const dossier = path.join(TMP_DIR, deps.socle.SOCLE_INSTANTANE);
          instantane = deps.socle.instantanerVers(dossier);
          if (instantane.bases || (instantane.echecs && instantane.echecs.length)) sources.push(dossier);
          /* ⛔ UNE BASE QU'ON N'A PAS PU INSTANTANER EST UN INCIDENT, PAS UN DÉTAIL — mais elle
             ne fait pas échouer la sauvegarde des autres. Ses octets bruts partent quand même
             (un fichier abîmé se répare parfois ; absent de l'archive, jamais) et le nombre
             remonte : `/health` le publie, la surveillance horaire le voit. */
          if (instantane.echecs && instantane.echecs.length) {
            etat.instantaneEchecs = instantane.echecs.length;
            console.error('⛔ sauvegarde : ' + instantane.echecs.length + ' base(s) non instantanée(s) — copie brute, à examiner');
          } else etat.instantaneEchecs = 0;
        } catch (e) {
          console.error('sauvegarde : instantané du socle IMPOSSIBLE —', e.code || 'erreur');
          return noter(false, 'socle-instantane', {});
        }
      }

      /* Deux exclusions : le dossier temporaire actuel (il est SIBLING de DATA_DIR, donc hors
         de l'archive de toute façon — ceinture en plus des bretelles si quelqu'un règle
         `TEAMOP_DATA` autrement), et le NOM QUE PORTAIT le temporaire avant correction. Sans la
         seconde, un reste laissé par une version antérieure serait ré-archivé chaque nuit, pour
         toujours, en grossissant l'archive de son propre poids. */
      /* ⛔ LES MOTIFS D'EXCLUSION SONT ANCRÉS SUR LE DOSSIER DE DONNÉES, ET C'EST TOUT LE
         SUJET. Les motifs `--exclude` de GNU tar ne sont PAS ancrés quand ils ne contiennent
         pas de barre oblique : ils filtrent N'IMPORTE QUEL composant de chemin, dans TOUTES
         les sources. Écrits nus (`socle-annuaire.db`) pour retirer le fichier VIVANT, ils
         retiraient aussi l'INSTANTANÉ du même nom, dans l'autre source.
         ⛔ MESURÉ le 19 septembre 2026, avec le vrai module : l'archive contenait
         `socle-instantane/elan-34oc.db` et `socle-instantane/entreprise-b.db` — et AUCUN
         annuaire. Or l'annuaire porte les CLÉS de toutes les entreprises. L'archive contenait
         donc les données de tous les clients, parfaitement intactes et définitivement
         illisibles, et la relecture la déclarait bonne. Le correctif était PIRE que le défaut
         qu'il réparait : l'ancien rendait des bases parfois corrompues, celui-là rendait des
         bases jamais restaurables.
         ⚠️ `path.basename(DATA_DIR)` et pas « data » en dur : `TEAMOP_DATA` se règle. */
      const dd = path.basename(DATA_DIR);
      const faite = await fabriquer(tmp, cle, sources,
        [path.basename(TMP_DIR), '.sauvegarde-*.tmp', '.sauvegarde-*.tmp.relu',
         dd + '/socle', dd + '/socle-annuaire.db*']);
      if (faite.octets > MAX_OCTETS) return noter(false, 'trop-volumineuse', { octets: faite.octets });

      /* ⛔ ENVOI ET RELECTURE EN FLUX. Ils lisaient l'archive ENTIÈRE en mémoire, deux fois —
         l'en-tête de ce fichier promettait le contraire, ce qui était vrai de la fabrication et
         faux ici. Sans effet à 11 Mo de données, mais le plafond des pièces jointes est à
         60 Gio : c'était l'API par terre pour tous les clients, la nuit, sans personne. */
      const dep = await client.poserCleFlux(cleObjet, tmp, faite.octets, faite.empreinte);
      if (!dep.ok) return noter(false, 'depot-' + (dep.statut || 'erreur'), { octets: faite.octets });

      /* ⛔ UNE ARCHIVE RECALÉE NE RESTE PAS DANS LE COFFRE. À partir d'ici l'objet EST déposé :
         tout échec qui suit laisse dans le coffre une archive dont on SAIT qu'elle est mauvaise,
         et la rétention la compte comme une copie valable. Trente nuits de suite et il ne reste
         plus une seule copie saine — sans que rien ne l'ait jamais dit. Chaque refus passe donc
         par ici, et chaque refus l'efface. */
      const recaler = async (motif, extra) => {
        try { await client.effacerCle(cleObjet); } catch (e) { console.error('sauvegarde : objet recalé NON retiré du coffre — il compte comme une copie valable'); }
        return noter(false, motif, extra);
      };

      /* ── LA RELECTURE, qui est le vrai sujet ────────────────────────────────────────────
         On retélécharge ce qui vient d'être déposé — pas le fichier local. Trois contrôles,
         du moins cher au plus probant : la taille, l'empreinte, puis l'ouverture réelle. */
      const relu = await client.lireCleVers(cleObjet, tmpRelu);
      if (!relu.ok) return recaler('relecture-' + (relu.statut || 'absente'), { octets: faite.octets });
      if (relu.octets !== faite.octets) return recaler('taille-differente', { octets: faite.octets, relu: relu.octets });
      if (relu.empreinte !== faite.empreinte) return recaler('empreinte-differente', { octets: faite.octets });

      const ouverte = await relire(tmpRelu, cle, null);
      if (!ouverte.entrees) return recaler('archive-vide', { octets: faite.octets });
      /* ⛔ COMPTER DES ENTRÉES N'EST PAS RELIRE. C'est ce qui a laissé passer des bases
         corrompues pendant qu'on écrivait « ✅ restaurable » : `tar -t` liste des noms, il
         n'ouvre rien. On DÉBALLE l'instantané et on fait un vrai SELECT dans chaque base. */
      /* ⛔ ON VÉRIFIE DÈS QU'IL Y AVAIT QUELQUE CHOSE À INSTANTANER — succès OU échecs. La
         première version testait `if (instantane.bases)` : si TOUTES les bases échouaient leur
         instantané (`bases:0`), c'est-à-dire le pire cas, celui où on a le plus besoin du
         contrôle, la vérification était purement SAUTÉE et la sauvegarde déclarée réussie
         sans qu'une seule base ait été ouverte. */
      if (instantane && (instantane.bases || (instantane.echecs && instantane.echecs.length))) {
        const v = await verifierSocle(tmpRelu, cle, deps.socle);
        if (!v.ok) {
          console.error('⛔ sauvegarde recalée : ' + v.motif);
          return recaler('socle-' + (v.brutes ? 'copies-brutes' : v.bases ? 'illisible' : 'incomplet'),
            { octets: faite.octets, bases: v.bases, cassees: v.cassees, brutes: v.brutes });
        }
      }

      /* ⛔ ON EFFACE L'INSTANTANÉ. C'est une copie LISIBLE de toutes les bases ET de l'annuaire,
         donc de toutes les clés d'entreprise, hors du cloisonnement par dossier. La laisser
         entre deux sauvegardes double la place occupée sur le seul disque du VPS et met à plat,
         en un seul endroit, tout ce que le produit passe son temps à séparer. */
      try { fs.rmSync(path.join(TMP_DIR, deps.socle ? deps.socle.SOCLE_INSTANTANE : 'socle-instantane'), { recursive: true, force: true }); } catch (e) {}

      /* La rétention seulement après une sauvegarde RÉUSSIE : on n'efface jamais une ancienne
         copie sur la foi d'une nouvelle qu'on n'a pas pu rouvrir. */
      let elaguees = 0;
      const liste = await client.lister(PREFIXE);
      if (liste && liste.ok) {
        for (const c of aElaguer(liste.objets, GARDER)) { const r = await client.effacerCle(c); if (r.ok) elaguees++; }
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
    /* ⛔ PAS DE MOTIF ICI. `gardien` l'a relevé : /health est publique et sans identité, et
       « la dernière sauvegarde a échoué, motif depot-403 » est du renseignement d'exploitation —
       ça dit à qui l'interroge si la plateforme saurait se relever. Trois valeurs suffisent à la
       surveillance ; le motif est servi à la Tour, qui exige le patron. */
    const d = etat.derniere;
    /* ⛔ `instantaneEchecs` ÉTAIT ÉCRIT ET LU PAR PERSONNE — et le commentaire d'à côté
       affirmait « /health le publie, la surveillance horaire le voit ». Une base qu'on n'a pas
       su instantaner est une entreprise DÉJÀ en difficulté : c'est précisément celle dont on
       doit entendre parler. Un NOMBRE, jamais un nom : /health est publique. */
    return { active: actif, ageH: d && d.ok ? Math.round((Date.now() - d.ts) / 3600000) : null,
      ok: d ? !!d.ok : null, instantaneEchecs: etat.instantaneEchecs || 0 };
  }

  if (app && garde) {
    app.get('/api/monitor/sauvegarde/etat', garde, (req, res) => res.json({ ok: true, active: actif, garder: GARDER, heureUTC: HEURE, derniere: etat.derniere, histo: (etat.histo || []).slice(0, 20) }));
    /* ⛔ LE try/catch N'EST PAS DÉCORATIF. Ce serveur n'a ni `unhandledRejection` ni middleware
       d'erreur : un rejet non traité dans une route `async` ARRÊTE LE PROCESSUS sous Node 22.
       `lancer()` avale tout aujourd'hui — mais faire dépendre la survie de l'API de la
       discipline d'une fonction voisine est un pari qu'on finit par perdre. */
    app.post('/api/monitor/sauvegarde/lancer', garde, async (req, res) => {
      try { res.json(await lancer('tour')); }
      catch (e) { console.error('sauvegarde (route) : ' + e.message); res.status(500).json({ ok: false, motif: 'exception' }); }
    });
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

module.exports = { monterSauvegarde, fabriquer, relire, verifierInstantane, aElaguer, cleDepuis, nomArchive, ENTETE, TAILLE_IV, TAILLE_TAG };
