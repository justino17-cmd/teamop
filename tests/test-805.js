/* ⛔ CE QUE CE FICHIER GARDE — LA RESTAURATION TELLE QU'ON LA FERA LE JOUR DU SINISTRE.

   `server/restaurer.js` est l'outil qu'on lance quand le VPS est mort. Aucun banc ne
   l'EXÉCUTAIT : `test-722`, `test-725` et `test-726` éprouvent l'archive (fabriquer, relire,
   restaurerDepuis), jamais la commande qu'un humain tape à quatre heures du matin. Deux trous,
   trouvés le 24 septembre 2026 en préparant l'essai « sans config.json » qu'exige
   `ALLUMER-LE-SOCLE.md` (section 6) avant d'allumer le socle :

   ⛔ LA COPIE MENSUELLE PASSAIT DEVANT LES COPIES DU JOUR. `lister('teamop/')` rend aussi ce qui
   vit sous `teamop/mensuel/`, et « m » passe après « 2 » : trié « plus récent d'abord » sur la
   clé, le mois arrivait EN TÊTE. `liste` le marquait « → » (la plus récente) et `essai`
   l'ouvrait à la place de la copie de la nuit. Un sinistre restauré sur la foi de cette flèche
   perdait jusqu'à un mois de données. C'est exactement le défaut corrigé dans `aElaguer` le
   20 septembre (`test-722`) — resté dans l'autre outil qui lit le même coffre. Inerte jusqu'à
   la première copie mensuelle : la nuit du 24 au 25 septembre 2026.

   ⛔ LE CAS DU SINISTRE N'AVAIT JAMAIS TOURNÉ. Sur un VPS mort, `config.json` n'existe plus : la
   clé et le coffre arrivent par deux variables, `TEAMOP_SAUV_CLE` et `TEAMOP_SAUV_COFFRE` (quatre
   valeurs, dans un ordre écrit). Le seul essai réel, le 18 septembre, s'est fait AVEC
   `config.json` — c'est-à-dire dans le seul cas qui ne ressemble pas au sinistre.

   Tout se passe sur 127.0.0.1 : un vrai coffre HTTP qui parle S3 (liste, lecture), de vraies
   archives fabriquées par `sauvegarde.js`, la vraie commande lancée dans un processus à part.
   Aucune dépendance : ni `server/node_modules`, ni réseau. */

const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const OUTIL = path.join(RACINE, 'server', 'restaurer.js');
const S = require(path.join(RACINE, 'server', 'sauvegarde.js'));

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-805-'));
const BUCKET = 'coffre-du-banc-805';
/* Des lettres HORS de [0-9a-f] : ces valeurs se cherchent dans des sorties qui portent des
   empreintes hexadécimales (règle de `CLAUDE.md`, prise sur `test-723`). */
const AK = 'ACCES-DU-BANC-QZX', SK = 'SECRET-DU-BANC-QZX';
const CLE_HEX = crypto.randomBytes(32).toString('hex');

/* Les trois archives du coffre. Chacune porte un NOMBRE de fichiers différent dans `data/` :
   c'est ce que `essai` affiche, donc la preuve qu'il a ouvert CELLE qu'il annonce — pas un nom
   recopié dans une phrase. */
const ANCIENNE = 'teamop/2026-09-23T03-00-00Z.tar.gz.chiffre';   // 4 fichiers
const NUIT = 'teamop/2026-09-24T03-00-00Z.tar.gz.chiffre';       // 5 fichiers
const MOIS = 'teamop/mensuel/2026-09-01T03-00-00Z.tar.gz.chiffre'; // 7 fichiers

/* ══ LE COFFRE : UN VRAI SERVEUR HTTP QUI PARLE S3 (même forme que celui de `test-726`) ══ */
function coffreNeuf() {
  const objets = new Map();
  const vus = [];
  const srv = http.createServer((q, r) => {
    const u = new URL(q.url, 'http://127.0.0.1');
    const chemin = decodeURIComponent(u.pathname);
    const auth = String(q.headers.authorization || '');
    vus.push({
      m: q.method,
      ak: (/Credential=([^/]+)\//.exec(auth) || [])[1] || '',
      sigv4: /^AWS4-HMAC-SHA256 Credential=\S+\/\d{8}\/[^/]+\/s3\/aws4_request, SignedHeaders=[^,]+, Signature=[0-9a-f]{64}$/.test(auth),
    });
    const racine = '/' + BUCKET;
    if (chemin !== racine && !chemin.startsWith(racine + '/')) { r.writeHead(404); return r.end(); }
    const cle = chemin === racine ? '' : chemin.slice(racine.length + 1);
    if (q.method === 'GET' && !cle) {     // ListObjectsV2
      const p = u.searchParams.get('prefix') || '';
      const contenu = [...objets.keys()].filter(k => k.startsWith(p)).map(k =>
        '<Contents><Key>' + k + '</Key><LastModified>2026-09-24T03:00:00.000Z</LastModified><Size>' + objets.get(k).length + '</Size></Contents>').join('');
      r.writeHead(200, { 'content-type': 'application/xml' });
      return r.end('<?xml version="1.0" encoding="UTF-8"?><ListBucketResult>' + contenu + '<IsTruncated>false</IsTruncated></ListBucketResult>');
    }
    if (q.method === 'GET') {
      if (!objets.has(cle)) { r.writeHead(404); return r.end(); }
      const b = objets.get(cle);
      r.writeHead(200, { 'content-length': String(b.length) });
      return r.end(b);
    }
    r.writeHead(405); r.end();
  });
  return { srv, objets, vus };
}

/* Une vraie archive, par le vrai `fabriquer` : `data/` (dont `marque.txt`) + `config.json`. */
async function archive(marque, nFichiers) {
  const d = fs.mkdtempSync(path.join(BANC, 'src-'));
  const data = path.join(d, 'data');
  fs.mkdirSync(data);
  fs.writeFileSync(path.join(data, 'espaces.json'), '{}');
  fs.writeFileSync(path.join(data, 'comptes.json'), '{}');
  fs.writeFileSync(path.join(data, 'marque.txt'), marque);
  for (let i = 3; i < nFichiers; i++) fs.writeFileSync(path.join(data, 'autre-' + i + '.json'), '{}');
  fs.writeFileSync(path.join(d, 'config.json'), '{"banc":805}');
  const sortie = path.join(BANC, marque + '.bin');
  await S.fabriquer(sortie, S.cleDepuis(CLE_HEX), [data, path.join(d, 'config.json')]);
  return fs.readFileSync(sortie);
}

/* ⛔ UN PROCESSUS À PART, ET ASYNCHRONE. Le coffre vit dans CE processus : un `spawnSync`
   bloquerait sa boucle d'événements, le coffre ne répondrait jamais, et l'outil attendrait
   son délai de quinze secondes — un banc qui se fige se fait couper, puis désactiver. */
function lancer(args, env) {
  return new Promise(res => {
    const p = spawn(process.execPath, [OUTIL, ...args], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    p.stdout.on('data', d => { out += d; });
    p.stderr.on('data', d => { out += d; });
    const tm = setTimeout(() => p.kill('SIGKILL'), 60000);
    p.on('close', rc => { clearTimeout(tm); res({ rc, out }); });
  });
}

(async () => {
  console.log('\n── 805 · restaurer.js, exécuté comme le jour du sinistre (sans config.json) ──');
  const coffre = coffreNeuf();
  await new Promise(res => coffre.srv.listen(0, '127.0.0.1', res));
  const ENDPOINT = 'http://127.0.0.1:' + coffre.srv.address().port;
  try {
    coffre.objets.set(ANCIENNE, await archive('ancienne', 4));
    coffre.objets.set(NUIT, await archive('nuit', 5));
    coffre.objets.set(MOIS, await archive('mois', 7));

    /* L'environnement du sinistre : `config.json` n'existe pas, et rien n'est hérité — une
       variable posée par la machine qui lance le banc fausserait les cas « sans ». */
    const SANS_CONF = path.join(BANC, 'config-absente.json');
    const base = Object.assign({}, process.env, { TEAMOP_CONFIG: SANS_CONF });
    delete base.TEAMOP_SAUV_CLE; delete base.TEAMOP_SAUV_COFFRE;
    const env = extra => Object.assign({}, base, extra);
    const COFFRE = [ENDPOINT, BUCKET, AK, SK].join(',');
    const SINISTRE = env({ TEAMOP_SAUV_CLE: CLE_HEX, TEAMOP_SAUV_COFFRE: COFFRE });

    /* La population d'abord : sans copie mensuelle dans le coffre, « la flèche ne la désigne
       pas » passerait sur du vide. */
    v('le coffre porte trois archives, dont une mensuelle', [coffre.objets.size, coffre.objets.has(MOIS)], [3, true]);
    v('et config.json est bien ABSENT', fs.existsSync(SANS_CONF), false);

    /* ══ 1. LISTE — la flèche « la plus récente » ══ */
    const L = await lancer(['liste'], SINISTRE);
    v('liste : sort sans erreur', L.rc, 0);
    const fleche = L.out.split('\n').find(l => /^\s*→/.test(l)) || '';
    vrai('⛔ la flèche « la plus récente » désigne la copie de la NUIT', fleche.includes(NUIT));
    vrai('   et pas la copie mensuelle', !/mensuel\//.test(fleche));
    /* Deux flèches, c'est deux « plus récentes » : celle qu'on lit en premier dépend de l'œil.
       (La mutation qui fléchait AUSSI la mensuelle passait sans ce contrôle.) */
    v('   et une SEULE flèche dans la liste', (L.out.match(/^\s*→/gm) || []).length, 1);
    vrai('   la mensuelle reste listée (elle existe, on ne la cache pas)', L.out.includes(MOIS));
    vrai('   l\'ancienne aussi', L.out.includes(ANCIENNE));
    /* ⛔ L'ORDRE DES QUATRE VALEURS est écrit dans ALLUMER-LE-SOCLE.md : si l'outil lisait les
       champs dans un autre ordre, la clé d'accès partirait à la place du secret. */
    vrai('⛔ le coffre a reçu la clé d\'accès donnée en TROISIÈME position', coffre.vus.length > 0 && coffre.vus.every(x => x.ak === AK));
    vrai('   dans des requêtes signées (SigV4)', coffre.vus.length > 0 && coffre.vus.every(x => x.sigv4));

    /* ══ 2. ESSAI — ce qu'on lance une fois par trimestre, et avant d'allumer le socle ══ */
    const E = await lancer(['essai'], SINISTRE);
    v('⛔ essai : sort sans erreur', E.rc, 0);
    vrai('⛔ il essaie la copie de la NUIT', E.out.includes('essai de restauration sur ' + NUIT));
    vrai('   et c\'est bien elle qu\'il a ouverte (5 fichiers dans data/, pas 7)', /contenu : 5 fichiers dans data\//.test(E.out));
    vrai('   config.json est dans l\'archive', /config\.json présent/.test(E.out));
    vrai('⛔ et il conclut RESTAURABLE', /CETTE SAUVEGARDE EST RESTAURABLE/.test(E.out));

    /* ══ 3. EXTRAIRE — le geste du vrai jour ══ */
    const X = path.join(BANC, 'extrait');
    const R = await lancer(['extraire', NUIT, X], SINISTRE);
    v('extraire : sort sans erreur', R.rc, 0);
    let marque = null; try { marque = fs.readFileSync(path.join(X, 'data', 'marque.txt'), 'utf8'); } catch (e) {}
    v('⛔ le contenu extrait est celui de la nuit', marque, 'nuit');

    /* ══ 4. LES CONTRE-ÉPREUVES — l'outil doit SAVOIR échouer ══ */
    const F = await lancer(['essai'], env({ TEAMOP_SAUV_CLE: 'ab'.repeat(32), TEAMOP_SAUV_COFFRE: COFFRE }));
    vrai('⛔ une clé fausse fait ÉCHOUER l\'essai (il déchiffre pour de vrai)', F.rc !== 0);
    vrai('   et il dit pourquoi', /déchiffrement impossible/.test(F.out));
    const C = await lancer(['liste'], env({ TEAMOP_SAUV_CLE: CLE_HEX }));
    v('⛔ la clé seule ne suffit pas sans config.json : refus', C.rc, 1);
    vrai('   et il dit ce qui manque — le coffre', /coffre incomplet/.test(C.out));
    const N = await lancer(['liste'], env({}));
    v('⛔ sans rien : refus', N.rc, 1);
    vrai('   et il dit quoi fournir (les deux variables)', /TEAMOP_SAUV_CLE/.test(N.out) && /TEAMOP_SAUV_COFFRE/.test(N.out));

    /* ══ 5. SANS COPIE DU JOUR, LA MENSUELLE SERT — elle est là pour ça ══ */
    coffre.objets.delete(ANCIENNE); coffre.objets.delete(NUIT);
    const M = await lancer(['essai'], SINISTRE);
    v('sans copie du jour, l\'essai se rabat sur la mensuelle', M.rc, 0);
    vrai('   et il le dit', M.out.includes('essai de restauration sur ' + MOIS));
    vrai('   et l\'ouvre (7 fichiers dans data/)', /contenu : 7 fichiers dans data\//.test(M.out));
  } catch (e) {
    ko++; console.log('  ✗ le banc s\'est interrompu : ' + (e && e.message));
  } finally {
    coffre.srv.close();
    try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})();
