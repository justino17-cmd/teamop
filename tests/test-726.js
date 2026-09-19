/* ⛔ CE QUE CE FICHIER GARDE — L'ASSEMBLAGE, PAS LES PIÈCES.

   Il existe parce qu'une quatrième vérification a nommé la cause racine des trois pires
   régressions de la semaine : **aucun banc n'éprouvait le CÂBLAGE.** Les 82 autres suites
   injectent leurs dépendances et appellent les fonctions en direct — elles prouvent que chaque
   pièce est juste. Aucune ne DÉMARRE le serveur tel qu'il sera déployé pour constater que les
   pièces sont réellement branchées entre elles. Or les trois régressions étaient des défauts de
   CÂBLAGE, pas de logique — et les trois ont été écrites par le tour de vérification précédent :

     · `socle: (opSocle && opSocle.actif) ? … : null` dans `index.js`, lu 56 lignes AVANT
       `let opSocle` : zone morte temporelle, avalée par le `catch` voisin. `sauvegarde` restait
       `null` POUR TOUJOURS, quelle que soit la configuration. Le seul dispositif qui protège
       TeamOP d'un VPS perdu, éteint en silence. `test-725` passait au vert pendant ce temps :
       il monte le module lui-même, donc il ne peut PAS voir qu'`index.js` ne le monte plus.
     · `--exclude=socle-annuaire.db` : motif non ancré chez GNU tar, donc il retirait
       l'INSTANTANÉ en même temps que le fichier vivant. Archives complètes, clés absentes,
       « ✅ restaurable » écrit dessus.
     · le budget de `/api/op/etat` comparé à `req.path`, contourné par une barre oblique finale.

   ⛔ LA RÈGLE DE CE FICHIER, ET SON SEUL INTÉRÊT : chaque contrôle doit être un que les autres
   suites ne peuvent PAS voir, parce qu'elles ne montent jamais l'assemblage. On démarre
   `server/index.js` tel quel, avec une vraie configuration, et un vrai coffre qui parle S3 en
   HTTP sur 127.0.0.1 — donc la VRAIE signature SigV4, le VRAI module de sauvegarde, le VRAI
   socle, branchés par le VRAI `index.js`. Et on va jusqu'au bout : la donnée d'un client écrite
   par l'API se relit dans l'archive, après restauration, avec la clé maître.

   ⛔ CE QU'IL NE COUVRE PAS, ET QU'IL FAUT SAVOIR AVANT DE S'Y FIER. Son en-tête cite trois
   régressions ; il n'en garde que DEUX. Le budget de `/api/op/etat` contourné par une barre
   oblique finale n'est éprouvé NULLE PART ici — zéro occurrence de `quota`, `429` ou
   `etatsParHeure` dans ce fichier — et dans `test-724` il ne l'est que par des expressions
   régulières sur le TEXTE d'`op-socle.js` : mettre `const cher = false` laisse les sept suites
   vertes. Mesuré le 19 septembre au soir. Ne comptent pas non plus ici : les quatre portes de
   fermeture d'une entreprise, SIGTERM, et les deux plafonds de place de `pousser()`.

   ⚠️ Chaque affirmation a sa contre-épreuve. Un banc qui refuse tout passe au vert — c'est
   exactement ce qui a gravé « une base en copie brute doit faire échouer la sauvegarde », donc
   effacer l'archive de tout le monde. Ici : un coffre qui refuse, un coffre qui corrompt.
   ⚠️ Jamais `api.teamop.fr` : tout se passe sur 127.0.0.1, coffre compris. Aucun appel sortant.

   Quatre assemblages sont montés, dans cet ordre :
     1. socle ALLUMÉ, sauvegarde complète — le cas de demain
     2. contre-épreuves sur le même serveur — le coffre refuse, puis corrompt
     3. socle ÉTEINT, bases existantes — le RETOUR EN ARRIÈRE documenté
     4. socle ÉTEINT, aucune base — l'inertie : rien ne doit naître sur le disque */

const fs = require('fs'), os = require('os'), net = require('net'), http = require('http');
const path = require('path'), crypto = require('crypto'), zlib = require('zlib');
const { spawn, execFileSync } = require('child_process');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const faux = (t, a) => v(t, !!a, false);

if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('  — server/node_modules absent : banc non exécuté (npm i dans server/)');
  console.log('\n0 ✓  0 ✗');
  process.exit(0);
}

const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-726-'));
const KEK = crypto.randomBytes(32).toString('hex');
const CLE_SAUV = crypto.randomBytes(32).toString('hex');
const BUCKET = 'coffre-du-banc';
const MDP = 'mot-de-passe-du-banc-2026';
const CLE_A = 'cle-propre-de-A-2026';
const T_A = 'ent-a-9x';
const SLUG_A = 'entreprisea';   // un slug, pas un nom : voir espSlug dans index.js
/* Une SECONDE entreprise, pour le seul scénario qui ne tient pas sur une seule : suspendue
   drapeau ALLUMÉ, rouverte drapeau ÉTEINT, puis rallumage. A sert au chemin destructif
   (« repartir à neuf »), qui efface sa base et ne peut donc pas servir deux fois. */
const T_B = 'ent-b-7y', SLUG_B = 'entrepriseb', CLE_B = 'cle-propre-de-B-2026';
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
const dormir = ms => new Promise(r => setTimeout(r, ms));

/* ══ LE COFFRE : UN VRAI SERVEUR HTTP QUI PARLE S3 ════════════════════════════════════════
   ⛔ POURQUOI PAS LE COFFRE EN MÉMOIRE DE `test-725`. Parce qu'il court-circuite justement ce
   qu'on veut éprouver : `s3.js`, sa signature, ses flux, et le fait qu'`index.js` construise
   bien le client depuis `config.sauvegarde`. Un coffre HTTP local exerce la chaîne entière sans
   jamais sortir de la machine. Il ne VÉRIFIE pas la signature — `test-716` le fait déjà sur les
   vecteurs publiés par AWS — mais il exige qu'elle soit PRÉSENTE et bien formée : sans ça, le
   banc passerait au vert avec un client qui n'aurait jamais signé. */
function coffreNeuf() {
  const objets = new Map();
  const vus = [];
  let mode = 'normal';
  const srv = http.createServer((q, r) => {
    const u = new URL(q.url, 'http://127.0.0.1');
    const chemin = decodeURIComponent(u.pathname);
    const auth = String(q.headers.authorization || '');
    vus.push({
      m: q.method, chemin,
      sigv4: /^AWS4-HMAC-SHA256 Credential=\S+\/\d{8}\/[^/]+\/s3\/aws4_request, SignedHeaders=[^,]+, Signature=[0-9a-f]{64}$/.test(auth),
      empreinte: /^[0-9a-f]{64}$/.test(String(q.headers['x-amz-content-sha256'] || '')),
    });
    const racine = '/' + BUCKET;
    if (chemin !== racine && !chemin.startsWith(racine + '/')) { r.writeHead(404); return r.end(); }
    const cle = chemin === racine ? '' : chemin.slice(racine.length + 1);

    if (q.method === 'GET' && !cle) {     // ListObjectsV2
      const p = u.searchParams.get('prefix') || '';
      const contenu = [...objets.keys()].filter(k => k.startsWith(p)).map(k =>
        '<Contents><Key>' + k + '</Key><LastModified>2026-09-19T00:00:00.000Z</LastModified><Size>' + objets.get(k).length + '</Size></Contents>').join('');
      r.writeHead(200, { 'content-type': 'application/xml' });
      return r.end('<?xml version="1.0" encoding="UTF-8"?><ListBucketResult>' + contenu + '<IsTruncated>false</IsTruncated></ListBucketResult>');
    }
    if (q.method === 'PUT') {
      if (mode === 'refus-depot') { q.resume(); r.writeHead(500); return r.end('refus du banc'); }
      const bouts = [];
      q.on('data', c => bouts.push(c));
      q.on('end', () => { objets.set(cle, Buffer.concat(bouts)); r.writeHead(200); r.end(); });
      return;
    }
    if (q.method === 'GET') {
      if (!objets.has(cle)) { r.writeHead(404); return r.end(); }
      let b = objets.get(cle);
      /* ⛔ UN OCTET RETOURNÉ, PAS UNE TAILLE CHANGÉE. Le contrôle de taille est le moins cher et
         le plus facile à satisfaire ; c'est l'EMPREINTE qui doit attraper ce cas, et elle seule.
         Corrompre la longueur laisserait croire que l'empreinte est éprouvée alors qu'elle ne
         le serait pas. */
      if (mode === 'corrompt-relecture') { b = Buffer.from(b); b[Math.floor(b.length / 2)] ^= 0xff; }
      r.writeHead(200, { 'content-length': String(b.length) });
      return r.end(b);
    }
    if (q.method === 'DELETE') { objets.delete(cle); r.writeHead(204); return r.end(); }
    r.writeHead(405); r.end();
  });
  return { srv, objets, vus, regler: m => { mode = m; } };
}

/* Un port libre, demandé au système plutôt que deviné : deux suites lancées à la suite ne
   doivent pas se disputer un numéro écrit en dur. */
const portLibre = () => new Promise(res => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});

/* ══ DÉBALLER UNE ARCHIVE SANS PASSER PAR `sauvegarde.js` ═════════════════════════════════
   ⛔ DÉLIBÉRÉMENT INDÉPENDANT. Relire l'archive avec `S.relire()` reviendrait à demander au
   module s'il est content de lui : un défaut symétrique (on chiffre et on déchiffre de travers)
   passerait au vert des deux côtés. Ici on lit l'en-tête, on déchiffre, on décompresse et on
   déballe avec les outils du système. L'en-tête n'est pas figé en dur — on le lit jusqu'au saut
   de ligne — mais sa FORME est exigée : c'est un format d'archive, donc un contrat avec toutes
   les sauvegardes déjà déposées, et le changer doit casser un banc. */
function deballer(chemin, cleHex, sortie) {
  const buf = fs.readFileSync(chemin);
  const nl = buf.indexOf(0x0a);
  if (nl < 0) throw new Error('pas d\'en-tête');
  const entete = buf.subarray(0, nl).toString('utf8');
  if (!/^TEAMOP-SAUV-\d+ aes-256-gcm gzip tar$/.test(entete)) throw new Error('en-tête inattendu : ' + entete);
  const iv = buf.subarray(nl + 1, nl + 13);
  const tag = buf.subarray(buf.length - 16);
  const corps = buf.subarray(nl + 13, buf.length - 16);
  const d = crypto.createDecipheriv('aes-256-gcm', Buffer.from(cleHex, 'hex'), iv);
  d.setAuthTag(tag);
  const tarBrut = zlib.gunzipSync(Buffer.concat([d.update(corps), d.final()]));
  try { fs.rmSync(sortie, { recursive: true, force: true }); } catch (e) {}
  fs.mkdirSync(sortie, { recursive: true });
  const tmp = path.join(BANC, 'archive-' + crypto.randomBytes(4).toString('hex') + '.tar');
  fs.writeFileSync(tmp, tarBrut);
  execFileSync('tar', ['-xf', tmp, '-C', sortie]);
  fs.unlinkSync(tmp);
  const liste = [];
  (function marcher(d2, prefixe) {
    for (const f of fs.readdirSync(d2)) {
      const p = path.join(d2, f);
      if (fs.statSync(p).isDirectory()) marcher(p, prefixe + f + '/');
      else liste.push(prefixe + f);
    }
  })(sortie, '');
  return { liste, sortie, entete };
}

/* Tout ce qui existe sous un dossier, en chemins relatifs — sert à prouver qu'un assemblage
   éteint ne crée RIEN, ce qu'aucun autre banc ne regarde. */
function arbre(d, prefixe) {
  const l = [];
  let noms = [];
  try { noms = fs.readdirSync(d); } catch (e) { return l; }
  for (const f of noms) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) l.push(...arbre(p, (prefixe || '') + f + '/'));
    else l.push((prefixe || '') + f);
  }
  return l;
}

/* ══ MONTER UN ASSEMBLAGE COMPLET ═════════════════════════════════════════════════════════ */
const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
const vap = webpush.generateVAPIDKeys();
const vivants = [];

async function assembler(nom, opts) {
  const dir = path.join(BANC, nom);
  const data = opts.data || path.join(dir, 'data');
  /* `dir` explicitement, et pas seulement par ricochet de `data` : un assemblage qui REPREND le
     dossier de données d'un autre (le retour en arrière) n'a pas de dossier à lui sans ça. */
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(data, { recursive: true });
  const cfgPath = path.join(dir, 'config.json');
  fs.writeFileSync(cfgPath, JSON.stringify(Object.assign({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha(MDP),
    socle: { actif: !!opts.socle },
    sauvegarde: opts.sansCoffre ? undefined : {
      cle: CLE_SAUV, endpoint: opts.endpoint, bucket: BUCKET,
      accessKey: 'AKIA-BANC', secretKey: 'secret-du-banc', region: 'eu-central-4',
      prefixe: 'teamop/', garder: 30,
    },
  }, opts.config || {})));
  if (!fs.existsSync(path.join(data, 'espaces.json'))) {
    /* ⛔ LA CLÉ DE L'ANNUAIRE EST UN SLUG, ET `espSlug` RETIRE TOUT CE QUI N'EST PAS
       ALPHANUMÉRIQUE. Écrite « entreprise-a », elle devient « entreprisea » côté Tour, et les
       portes répondent 404 sans qu'on comprenne pourquoi — le banc croit alors mesurer une
       coupure alors qu'il mesure un espace introuvable. `test-724` ne le voit pas : ses routes
       cherchent par `t`, jamais par slug. */
    fs.writeFileSync(path.join(data, 'espaces.json'), JSON.stringify({
      [SLUG_A]: { slug: SLUG_A, nom: 'Entreprise A', email: 'a@exemple.fr', t: T_A, code: b64({ t: T_A, k: CLE_A }), ts: 1 },
      [SLUG_B]: { slug: SLUG_B, nom: 'Entreprise B', email: 'b@exemple.fr', t: T_B, code: b64({ t: T_B, k: CLE_B }), ts: 2 },
    }));
  }
  const port = await portLibre();
  let sortie = '';
  const enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, {
      TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port), TEAMOP_KEK: KEK,
    }), stdio: ['ignore', 'pipe', 'pipe'],
  });
  enfant.stdout.on('data', d => { sortie += d; });
  enfant.stderr.on('data', d => { sortie += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) {
    await dormir(100);
    try { vivant = (await fetch(B + '/health')).ok; } catch (e) {}
  }
  const a = {
    nom, data, cfgPath, port, B, enfant,
    journal: () => sortie,
    vivant,
    async appel(methode, chemin, o) {
      const c = o || {};
      const h = Object.assign({ 'Content-Type': 'application/json' }, c.entetes || {});
      if (c.jeton) h.Authorization = 'Bearer ' + c.jeton;
      const r = await fetch(B + chemin, { method: methode, headers: h, body: c.corps === undefined ? undefined : JSON.stringify(c.corps) });
      let j = null; try { j = await r.json(); } catch (e) {}
      return { code: r.status, j };
    },
    async arreter() {
      /* On ATTEND la fin du processus : un assemblage qui écrit encore pendant qu'on lit son
         dossier fabriquerait un échec de banc aléatoire, et on passerait la journée dessus.
         ⛔ MAIS ON N'ATTEND PAS UN ÉVÉNEMENT DÉJÀ PASSÉ. `menage()` rappelle `arreter()` sur des
         serveurs déjà arrêtés : sans ce test, `exit` ne se reproduit jamais, la promesse reste
         en suspens — et comme plus AUCUN handle ne tient la boucle, Node sort tout seul avec le
         code 0, AVANT la ligne qui affiche le total. Mesuré : le banc se terminait « réussi »
         sans avoir jamais compté ses contrôles. Une suite qui se tait passe pour verte. */
      if (enfant.exitCode !== null || enfant.signalCode !== null) return;
      await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) { res(); } });
    },
  };
  vivants.push(a);
  return a;
}

const menage = async () => {
  for (const a of vivants) { try { await a.arreter(); } catch (e) {} }
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
};

(async () => {
  const coffre = coffreNeuf();
  const portCoffre = await portLibre();
  await new Promise(res => coffre.srv.listen(portCoffre, '127.0.0.1', res));
  const ENDPOINT = 'http://127.0.0.1:' + portCoffre;

  try {
    /* ══ 1. L'ASSEMBLAGE DE DEMAIN : SOCLE ALLUMÉ, SAUVEGARDE COMPLÈTE ═══════════════════ */
    console.log('⛔ Le serveur assemblé : la sauvegarde est-elle VIVANTE ?');
    const A = await assembler('allume', { socle: true, endpoint: ENDPOINT });
    vrai('le serveur démarre', A.vivant);
    if (!A.vivant) { console.log(A.journal().slice(0, 1500)); throw new Error('serveur mort'); }

    {
      const { j } = await A.appel('GET', '/health');
      /* ⛔ LE CONTRÔLE QUI MANQUAIT LE 19 SEPTEMBRE, ET QUI AURAIT SUFFI. Une seule expression
         d'`index.js` en zone morte temporelle rendait ceci `false` pour toujours, avec une
         configuration parfaite. Aucun autre banc ne peut le voir. */
      v('⛔ /health annonce la sauvegarde ACTIVE', j.sauvegarde && j.sauvegarde.active, true);
      v('le socle est actif', j.socle && j.socle.actif, true);
      v('la clé maître est lue', j.socle && j.socle.cle, true);
      v('aucune route déclarée deux fois', j.routesDoublons, 0);
    }
    /* ⛔ ET LE JOURNAL LE DIT AUSSI. `/health` pourrait mentir par un autre chemin ; le message
       exact qu'affichait le serveur cassé est « sauvegarde hors site non montée ». Le
       chercher, c'est refuser la panne par son nom. */
    faux('⛔ le journal ne porte aucun « non montée »', /non mont[ée]e?\b/i.test(A.journal()));
    faux('⛔ le journal ne porte aucun ReferenceError', /ReferenceError/.test(A.journal()));
    faux('la sauvegarde ne se déclare pas inactive', /sauvegarde hors site NON active/.test(A.journal()));

    /* ⛔ MONTÉES **ET** GARDÉES. Un 404 dirait « pas branchée » — c'est ce que rendait le
       serveur cassé. Un 200 sans jeton dirait « ouverte à tous ». Seul 403 dit les deux à la
       fois : la route existe, et elle exige le patron. */
    console.log('⛔ Les deux routes de la Tour : montées, et gardées');
    {
      const e = await A.appel('GET', '/api/monitor/sauvegarde/etat');
      v('⛔ /api/monitor/sauvegarde/etat existe et refuse sans jeton', e.code, 403);
      const l = await A.appel('POST', '/api/monitor/sauvegarde/lancer', { corps: {} });
      v('⛔ /api/monitor/sauvegarde/lancer existe et refuse sans jeton', l.code, 403);
    }
    const { j: co } = await A.appel('POST', '/api/monitor/login', { corps: { nom: 'Patron', pass: MDP } });
    vrai('le patron ouvre une session de Tour', co && co.token);
    const JETON_TOUR = co && co.token;
    {
      const e = await A.appel('GET', '/api/monitor/sauvegarde/etat', { jeton: JETON_TOUR });
      v('la Tour lit l\'état de la sauvegarde', e.code, 200);
      v('et il la dit active', e.j && e.j.active, true);
    }

    /* ══ 2. DE BOUT EN BOUT : LA DONNÉE D'UN CLIENT DOIT REVENIR DE L'ARCHIVE ═══════════ */
    console.log('⛔ Une donnée écrite par l\'API se relit-elle dans l\'archive ?');
    const S1 = await A.appel('POST', '/api/op/session', { corps: { t: T_A, kh: sha(CLE_A), nom: 'Banc' } });
    v('la session s\'ouvre', S1.code, 200);
    const JETON_OP = S1.j && S1.j.jeton;
    const TEMOIN = { nom: 'Gel anti-cafards', lot: 'L-2026-09', notes: 'cuisine, sous évier' };
    const P1 = await A.appel('POST', '/api/op/pousser', {
      jeton: JETON_OP,
      corps: { enr: [{ c: 'produits', id: 'temoin-du-banc', m: 1758200000000, e: 'emp-temoin', r: TEMOIN }] },
    });
    v('la donnée du client est acceptée', P1.j && P1.j.acceptes, 1);

    const L1 = await A.appel('POST', '/api/monitor/sauvegarde/lancer', { jeton: JETON_TOUR, corps: {} });
    v('la sauvegarde lancée depuis la Tour réussit', L1.j && L1.j.ok, true);
    v('le coffre en porte une', coffre.objets.size, 1);
    /* ⛔ UN BANC QUI S'ÉCROULE N'EST PAS UN BANC QUI ÉCHOUE. Sans cette porte, une sauvegarde
       recalée laissait le coffre vide et la suite tombait sur « The data argument must be of
       type string », vingt lignes plus bas — un message qui ne dit rien de la panne. On s'arrête
       ICI, en NOMMANT le motif que le serveur a rendu. */
    if (!coffre.objets.size) throw new Error('aucune archive déposée, motif « ' + (L1.j && L1.j.motif) + ' » — les contrôles d\'archive ne peuvent pas être joués');
    const CLE_BONNE = [...coffre.objets.keys()][0];
    vrai('la clé porte le préfixe réglé', /^teamop\/.+\.tar\.gz\.chiffre$/.test(CLE_BONNE));

    /* ⛔ LA SIGNATURE EST PASSÉE. Sans ce contrôle, un client qui n'aurait jamais signé —
       parce qu'`index.js` aurait construit le coffre autrement — passerait au vert ici. */
    const putVus = coffre.vus.filter(x => x.m === 'PUT');
    vrai('⛔ le dépôt est signé en SigV4', putVus.length > 0 && putVus.every(x => x.sigv4));
    vrai('⛔ et il porte l\'empreinte du corps', putVus.every(x => x.empreinte));

    const arch = path.join(BANC, 'archive.bin');
    fs.writeFileSync(arch, coffre.objets.get(CLE_BONNE));
    const { liste, sortie: deballee } = deballer(arch, CLE_SAUV, path.join(BANC, 'deballe-1'));
    const inst = liste.filter(f => f.startsWith('socle-instantane/'));
    console.log('      instantané dans l\'archive : ' + JSON.stringify(inst));

    /* ⛔ LES DEUX MOITIÉS, ET LA PREMIÈRE EST CELLE QUI A MANQUÉ. L'annuaire porte les clés de
       toutes les entreprises : sans lui, l'archive est complète et définitivement illisible. */
    vrai('⛔ l\'annuaire est dans l\'archive', inst.includes('socle-instantane/socle-annuaire.db'));
    vrai('⛔ la base de l\'entreprise est dans l\'archive', inst.includes('socle-instantane/' + T_A + '.db'));
    faux('aucune copie brute (toutes les bases se sont instantanées)', inst.some(f => f.endsWith('.brut')));
    /* ⛔ ET LA BASE VIVANTE N'Y EST PAS. C'est l'autre moitié de l'exclusion : elle doit retirer
       le fichier chaud SANS emporter l'instantané. Les deux à la fois, ou rien. */
    faux('⛔ la base VIVANTE est exclue', liste.some(f => /(^|\/)socle\/.+\/base\.db$/.test(f)));
    faux('⛔ l\'annuaire VIVANT est exclu', liste.some(f => /(^|\/)data\/socle-annuaire\.db$/.test(f)));
    vrai('le reste du dossier de données est bien là', liste.some(f => /espaces\.json$/.test(f)));

    /* ⛔ L'EXERCICE DE SINISTRE, EN ENTIER. Un VPS neuf, l'archive, la clé maître du séquestre :
       la donnée du client doit revenir telle qu'elle a été écrite. C'est la seule question qui
       compte, et aucun banc ne la posait — ils s'arrêtaient à « le fichier est là ». */
    const CIBLE = path.join(BANC, 'vps-neuf');
    fs.mkdirSync(CIBLE, { recursive: true });
    const script = path.join(BANC, 'relire.js');
    fs.writeFileSync(script, "const s=require(" + JSON.stringify(path.join(RACINE, 'server', 'socle.js')) + ");"
      + "const n=s.restaurerDepuis(process.argv[2],process.argv[3]);"
      + "const d=s.depuis(process.argv[4],0);"
      + "console.log(JSON.stringify({n,seq:d.seq,illisibles:d.illisibles.length,enr:d.enr}));");
    /* ⛔ UNE RESTAURATION QUI ÉCHOUE EST UN RÉSULTAT, PAS UNE INTERRUPTION. Éprouvé en
       remettant le défaut du 19 septembre : sans annuaire, l'exercice de sinistre lève — et le
       banc s'arrêtait là, sans jouer le retour en arrière ni l'inertie. Or c'est exactement le
       jour où on a le plus besoin de tout voir d'un coup. On nomme l'échec et on continue. */
    let relu = null, echecRestau = '';
    try {
      const brut = execFileSync(process.execPath, [script, path.join(deballee, 'socle-instantane'), CIBLE, T_A],
        { env: Object.assign({}, process.env, { TEAMOP_DATA: CIBLE, TEAMOP_KEK: KEK }), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
      relu = JSON.parse(brut.trim().split('\n').pop());
    } catch (e) { echecRestau = String((e.stderr || e.message) || '').split('\n').filter(Boolean).pop() || 'erreur'; }
    vrai('⛔ l\'exercice de sinistre s\'exécute' + (echecRestau ? ' — ' + echecRestau.slice(0, 120) : ''), !!relu);
    relu = relu || {};
    v('la restauration remet deux fichiers (annuaire + base)', relu.n, 2);
    v('aucune ligne illisible après restauration', relu.illisibles, 0);
    const ligne = (relu.enr || []).find(x => x.id === 'temoin-du-banc');
    vrai('⛔ l\'enregistrement du client est revenu', !!ligne);
    v('⛔ et son contenu est INTACT, au champ près', ligne && ligne.r, TEMOIN);

    /* ⛔ L'INSTANTANÉ NE SURVIT PAS À LA SAUVEGARDE. C'est une copie LISIBLE de toutes les bases
       ET de l'annuaire, donc de toutes les clés, à plat dans un seul dossier. */
    const tmpSauv = path.join(path.dirname(A.data), '.teamop-sauvegarde-tmp');
    faux('⛔ l\'instantané est effacé après coup', fs.existsSync(path.join(tmpSauv, 'socle-instantane')));

    /* ══ 3. LES CONTRE-ÉPREUVES : CE BANC MESURE-T-IL VRAIMENT ? ════════════════════════ */
    console.log('⛔ Contre-épreuves : un coffre qui refuse, un coffre qui corrompt');
    /* Le nom d'archive porte la seconde : deux sauvegardes dans la même seconde écriraient la
       MÊME clé, et la contre-épreuve effacerait la bonne archive au lieu de la sienne. */
    await dormir(1100);
    coffre.regler('refus-depot');
    {
      const r = await A.appel('POST', '/api/monitor/sauvegarde/lancer', { jeton: JETON_TOUR, corps: {} });
      v('⛔ un coffre qui refuse fait ÉCHOUER la sauvegarde', r.j && r.j.ok, false);
      vrai('et le motif nomme le dépôt', r.j && /^depot-/.test(String(r.j.motif)));
      v('rien n\'a été ajouté au coffre', coffre.objets.size, 1);
      vrai('la bonne archive est intacte', coffre.objets.has(CLE_BONNE));
    }
    await dormir(1100);
    coffre.regler('corrompt-relecture');
    {
      const r = await A.appel('POST', '/api/monitor/sauvegarde/lancer', { jeton: JETON_TOUR, corps: {} });
      v('⛔ un octet retourné fait ÉCHOUER la sauvegarde', r.j && r.j.ok, false);
      v('et c\'est l\'EMPREINTE qui l\'attrape', r.j && r.j.motif, 'empreinte-differente');
      /* ⛔ ET L'ARCHIVE RECALÉE NE RESTE PAS DANS LE COFFRE. Sans ce retrait, la rétention la
         compte comme une copie valable : trente nuits et il ne reste plus rien de sain. */
      v('⛔ l\'archive recalée est retirée du coffre', coffre.objets.size, 1);
      vrai('et c\'est bien la bonne qui reste', coffre.objets.has(CLE_BONNE));
    }
    coffre.regler('normal');
    {
      const e = await A.appel('GET', '/api/monitor/sauvegarde/etat', { jeton: JETON_TOUR });
      vrai('la Tour voit l\'historique des échecs', (e.j && e.j.histo || []).length >= 3);
      v('le dernier échec y garde son motif', e.j && e.j.derniere && e.j.derniere.motif, 'empreinte-differente');
    }
    /* ══ 4. LES PORTES DE LA TOUR COUPENT-ELLES VRAIMENT ? ═════════════════════════════ */
    /* ⛔ AUCUN BANC NE LES GARDAIT — relevé par la cinquième vérification, et c'est mot pour mot
       la règle des quatre portes de `CLAUDE.md`, rejouée sur le socle : on pouvait retirer
       `socleCouper` d'une porte, ou le faire mentir, sans qu'une seule suite bronche. La Tour
       aurait affiché « fermée » pendant que les 30 appareils du client lisaient et écrivaient
       encore, jusqu'à 30 jours — la durée du jeton.
       ⚠️ On ne relit PAS `index.js` pour compter des appels : on FERME depuis la Tour et on
       demande à l'appareil s'il passe encore. Un contrôle de texte aurait laissé passer une
       coupure qui échoue en silence. */
    console.log('⛔ Fermer depuis la Tour coupe-t-il l\'appareil, pour de vrai ?');
    {
      /* La contre-épreuve d'abord : sans elle, un banc qui refuse tout passerait au vert. */
      const avant = await A.appel('GET', '/api/op/etat', { jeton: JETON_OP });
      v('avant la fermeture, l\'appareil travaille', avant.code, 200);

      const susp = await A.appel('POST', '/api/monitor/espaces/suspendre',
        { jeton: JETON_TOUR, corps: { slug: SLUG_A } });
      v('la Tour suspend l\'espace', susp.code, 200);

      /* ⛔ LE CONTRÔLE QUI COMPTE. Le jeton est le MÊME, il est encore valable 30 jours.
         ⚠️ ON EXIGE LA PROPRIÉTÉ, PAS UN CODE. Mesuré : c'est 401, pas 403 — la SESSION
         elle-même a été coupée (`sessionsCouper`), donc le jeton ne se résout plus du tout ;
         403 serait « l'espace est fermé », un cran plus faible. Figer 403 ici ferait tomber le
         banc le jour où la coupure devient PLUS stricte, ce qui est exactement à l'envers. */
      const apres = await A.appel('GET', '/api/op/etat', { jeton: JETON_OP });
      v('⛔ le jeton déjà délivré ne passe PLUS (401 session coupée, ou 403 espace fermé)',
        [apres.code === 200, [401, 403].includes(apres.code)], [false, true]);
      console.log('      mesuré : ' + apres.code);
      const neuve = await A.appel('POST', '/api/op/session', { corps: { t: T_A, kh: sha(CLE_A) } });
      v('⛔ et on ne peut pas en ouvrir une autre', neuve.code, 403);
      v('   avec le motif que l\'écran peut dire', neuve.j && neuve.j.motif, 'ferme');

      /* ⛔ ET ROUVRIR DOIT ROUVRIR. Une suspension qui ne se lève pas n'est pas une
         suspension, c'est une condamnation — et elle serait invisible côté Tour. */
      const rouv = await A.appel('POST', '/api/monitor/espaces/suspendre',
        { jeton: JETON_TOUR, corps: { slug: SLUG_A, rouvrir: true } });
      v('la Tour rouvre l\'espace', rouv.code, 200);
      const reprise = await A.appel('POST', '/api/op/session', { corps: { t: T_A, kh: sha(CLE_A) } });
      v('⛔ l\'appareil retravaille', reprise.code, 200);
    }
    /* ⛔ ET LE SCÉNARIO QUI NE TIENT PAS SUR UN SEUL SERVEUR : suspendre ALLUMÉ, rouvrir
       ÉTEINT, rallumer. C'est le second bloquant de la cinquième vérification, et il est
       invisible tant qu'on ne traverse pas le drapeau : rouvrir avec le socle allumé marchait
       très bien, y compris AVANT le correctif. On prépare ici la première moitié — B est
       suspendue et on la laisse ainsi. */
    {
      const s2 = await A.appel('POST', '/api/op/session', { corps: { t: T_B, kh: sha(CLE_B) } });
      v('la seconde entreprise a bien un stockage', s2.code, 200);
      await A.appel('POST', '/api/op/pousser', { jeton: s2.j && s2.j.jeton,
        corps: { enr: [{ c: 'produits', id: 'b1', m: 1758200000000, e: 'eb', r: { nom: 'B' } }] } });
      const su = await A.appel('POST', '/api/monitor/espaces/suspendre', { jeton: JETON_TOUR, corps: { slug: SLUG_B } });
      v('la Tour la suspend, et on l\'y laisse', su.code, 200);
      const ko = await A.appel('POST', '/api/op/session', { corps: { t: T_B, kh: sha(CLE_B) } });
      v('   elle est bien coupée', ko.code, 403);
    }
    await A.arreter();

    /* ══ 5. LE RETOUR EN ARRIÈRE : SOCLE ÉTEINT, BASES EXISTANTES ═══════════════════════ */
    /* ⛔ LE SCÉNARIO DOCUMENTÉ, ET LE PLUS FACILE À CASSER. On éteint `socle.actif` sur un
       serveur qui a DÉJÀ des bases. Si la sauvegarde cessait alors de les emporter, on aurait
       éteint le socle ET la seule copie de ses données, le même jour, sans que rien ne le dise.
       Même disque, même clé, un seul drapeau change. */
    console.log('⛔ Retour en arrière : socle éteint, mais les bases existent déjà');
    await dormir(1100);
    const R = await assembler('repli', { socle: false, endpoint: ENDPOINT, data: A.data });
    vrai('le serveur redémarre avec le socle éteint', R.vivant);
    {
      const { j } = await R.appel('GET', '/health');
      v('le socle se dit éteint', j.socle && j.socle.actif, false);
      v('⛔ la sauvegarde reste ACTIVE', j.sauvegarde && j.sauvegarde.active, true);
    }
    {
      const s = await R.appel('POST', '/api/op/session', { corps: { t: T_A, kh: sha(CLE_A) } });
      v('et les routes du socle ne répondent plus', s.code, 404);
    }
    const { j: co2 } = await R.appel('POST', '/api/monitor/login', { corps: { nom: 'Patron', pass: MDP } });
    const avant = coffre.objets.size;
    const L2 = await R.appel('POST', '/api/monitor/sauvegarde/lancer', { jeton: co2 && co2.token, corps: {} });
    v('la sauvegarde tourne quand même', L2.j && L2.j.ok, true);
    v('une archive de plus dans le coffre', coffre.objets.size, avant + 1);
    {
      const cleNeuve = [...coffre.objets.keys()].find(k => k !== CLE_BONNE);
      fs.writeFileSync(arch, coffre.objets.get(cleNeuve));
      const { liste: l2 } = deballer(arch, CLE_SAUV, path.join(BANC, 'deballe-2'));
      const i2 = l2.filter(f => f.startsWith('socle-instantane/'));
      vrai('⛔ l\'annuaire est TOUJOURS emporté, socle éteint', i2.includes('socle-instantane/socle-annuaire.db'));
      vrai('⛔ la base de l\'entreprise AUSSI', i2.includes('socle-instantane/' + T_A + '.db'));
      faux('et la base vivante reste exclue', l2.some(f => /(^|\/)socle\/.+\/base\.db$/.test(f)));
    }

    /* ⛔ ET LES PORTES AGISSENT ENCORE, DRAPEAU ÉTEINT. C'est LE bloquant de la cinquième
       vérification, et c'est la leçon du 19 septembre matin non appliquée : `socleCouper`,
       `socleOuvrir` et `socleEffacer` gardaient sur le DRAPEAU au lieu de garder sur les
       DONNÉES, et rendaient toutes trois un SUCCÈS. Supprimer une entreprise répondait donc
       `ok` — courriel de confirmation compris — pendant que `socle/<t>/base.db` restait sur le
       disque avec les données du client dedans, repartait dans CHAQUE archive nocturne, et
       ressuscitait l'entreprise au rallumage du drapeau. */
    console.log('⛔ Drapeau éteint : rouvrir une entreprise la rouvre-t-il VRAIMENT ?');
    {
      const rouv = await R.appel('POST', '/api/monitor/espaces/suspendre',
        { jeton: co2 && co2.token, corps: { slug: SLUG_B, rouvrir: true } });
      v('la Tour rouvre l\'entreprise, drapeau éteint', rouv.code, 200);
    }

    console.log('⛔ Drapeau éteint : supprimer une entreprise l\'efface-t-il VRAIMENT ?');
    {
      const base = path.join(R.data, 'socle', T_A, 'base.db');
      vrai('la base du client est bien là avant', fs.existsSync(base));
      const rn = await R.appel('POST', '/api/monitor/espaces/renaitre',
        { jeton: co2 && co2.token, corps: { nom: SLUG_A } });
      v('la Tour fait repartir l\'espace à neuf', rn.code, 200);
      /* ⛔ ON REGARDE LE DISQUE, PAS LA RÉPONSE. La réponse disait déjà `ok` avant le
         correctif — c'est précisément ce qui rendait le défaut invisible. */
      faux('⛔ la base du client a DISPARU du disque', fs.existsSync(base));
      faux('   et son dossier avec', fs.existsSync(path.join(R.data, 'socle', T_A)));
    }
    await R.arreter();

    /* ══ 5ter. LES BUDGETS ANTI-ABUS, MESURÉS — PAS RELUS ══════════════════════════════ */
    /* ⛔ ILS N'ÉTAIENT GARDÉS QUE PAR DES EXPRESSIONS RÉGULIÈRES SUR LE TEXTE d'`op-socle.js`,
       dans `test-724`. MESURÉ par la cinquième vérification : écrire `const cher = false`
       laisse les SEPT suites vertes, et fait passer 20 appels sur 20 là où 5 devraient passer.
       C'est la panne que ce budget existe pour empêcher : `etat()` relit et SIGNE toute la
       base (42 ms sur 20 000 lignes), donc 40 000 appels par heure font 28 MINUTES de boucle
       d'événements gelée par heure — tout le serveur, tous les clients, à partir d'un seul
       jeton parfaitement légitime.
       ⛔ ET LA BARRE OBLIQUE FINALE EST LE CŒUR DU CONTRÔLE. Express est monté sans
       `strict routing` : `/api/op/etat/` atteint le MÊME gestionnaire. Le budget doit donc
       être le MÊME COMPTEUR — c'est exactement la régression que l'en-tête de ce fichier cite
       comme l'une de ses raisons d'être, et qu'il ne gardait pas. */
    console.log('⛔ Les budgets : on les MESURE, on ne relit pas leur écriture');
    {
      const B = await assembler('budgets', { socle: true, endpoint: ENDPOINT,
        config: { socle: { actif: true, etatsParHeure: 5, lecturesParHeure: 50, ecrituresParHeure: 50 } } });
      vrai('le serveur démarre avec des budgets bas', B.vivant);
      const sb = await B.appel('POST', '/api/op/session', { corps: { t: T_A, kh: sha(CLE_A) } });
      v('la session s\'ouvre', sb.code, 200);
      const jb = sb.j && sb.j.jeton;
      const taper = async (chemin, n) => {
        const c = { 200: 0, 429: 0, autre: 0 };
        for (let i = 0; i < n; i++) {
          const r = await B.appel('GET', chemin, { jeton: jb });
          c[r.code === 200 ? 200 : r.code === 429 ? 429 : 'autre']++;
        }
        return c;
      };
      const cher = await taper('/api/op/etat', 20);
      console.log('      /api/op/etat  → ' + JSON.stringify(cher));
      v('⛔ le budget cher s\'applique : 5 passent, 15 refusés', [cher[200], cher[429]], [5, 15]);

      /* ⛔ LE CONTRÔLE QUI MANQUAIT. Même compteur, donc plus AUCUN passage. */
      const oblique = await taper('/api/op/etat/', 20);
      console.log('      /api/op/etat/ → ' + JSON.stringify(oblique));
      v('⛔ la barre oblique finale ne rouvre RIEN', oblique[200], 0);

      /* ⚠️ LA CONTRE-ÉPREUVE, sans laquelle « 0 passage » serait aussi vrai d\'un serveur mort :
         une route de lecture BON MARCHÉ, au budget séparé, doit continuer de répondre. */
      const bonMarche = await B.appel('GET', '/api/op/depuis?seq=0', { jeton: jb });
      v('⛔ et la lecture bon marché, elle, passe encore', bonMarche.code, 200);
      await B.arreter();
    }

    /* ══ 5quater. LES DEUX PANNES MUETTES : DISQUE PLEIN, HORLOGE FAUSSE ═══════════════ */
    /* ⛔ LA PIRE FAMILLE DE CE DÉPÔT : celle qui ne se voit pas. Avant ce contrôle, les deux
       scénarios ci-dessous arrêtaient l'écriture de TOUS les clients pendant que `/health`
       répondait exactement comme un serveur sain et que `journalctl` restait vide. On ne
       l'apprenait que par un client qui appelle. */
    console.log('⛔ Disque plein et horloge fausse : est-ce que ça SE VOIT ?');
    {
      /* Le plancher de disque se règle : on le met au-dessus de la place réelle, ce qui met le
         serveur dans l'état « disque plein » sans avoir à remplir un disque. */
      const D = await assembler('muet', { socle: true, endpoint: ENDPOINT,
        config: { socle: { actif: true, disquePlancher: 9e18 } } });
      vrai('le serveur démarre', D.vivant);
      const sd = await D.appel('POST', '/api/op/session', { corps: { t: T_A, kh: sha(CLE_A) } });
      v('la session s\'ouvre malgré tout', sd.code, 200);
      const pd = await D.appel('POST', '/api/op/pousser', { jeton: sd.j && sd.j.jeton,
        corps: { enr: [{ c: 'produits', id: 'd1', m: 1758200000000, e: 'ed', r: { nom: 'D' } }] } });
      v('⛔ disque plein : la pousse est REFUSÉE, et en 503', pd.code, 503);
      v('   rien n\'a été accepté', pd.j && pd.j.acceptes, 0);
      {
        const { j } = await D.appel('GET', '/health');
        v('⛔ et /health le PUBLIE', (j.socle.refus || {}).disque_plein, 1);
        faux('⛔ sans nommer aucune entreprise', /ent-a-9x|entreprise/.test(JSON.stringify(j.socle)));
      }
      await D.arreter();

      /* L'horloge : un appareil à l'heure juste contre un serveur qui retarde revient au même
         qu'un appareil en avance — c'est la date de la ligne qui dépasse `maintenant + 5 min`. */
      const H = await assembler('horloge', { socle: true, endpoint: ENDPOINT });
      const sh = await H.appel('POST', '/api/op/session', { corps: { t: T_A, kh: sha(CLE_A) } });
      const dansUneHeure = Date.now() + 3600000;
      const ph = await H.appel('POST', '/api/op/pousser', { jeton: sh.j && sh.j.jeton,
        corps: { enr: [{ c: 'produits', id: 'h1', m: dansUneHeure, e: 'eh', r: { nom: 'H' } }] } });
      /* ⛔ 409, PAS 200. Il sortait en 200 avec `acceptes:0` : l'écran était libre de n'y voir
         qu'un détail alors que RIEN n'avait été écrit, pour 100 % des appareils. */
      v('⛔ horloge en avance : refus total en 409, jamais 200', ph.code, 409);
      v('   rien n\'a été accepté', ph.j && ph.j.acceptes, 0);
      vrai('   et le message nomme l\'écart en minutes', ph.j && ph.j.ecartMin >= 55);
      {
        const { j } = await H.appel('GET', '/health');
        v('⛔ /health publie le compteur d\'horloge', (j.socle.refus || {}).horlogeAvancee, 1);
      }
      /* ⚠️ LA CONTRE-ÉPREUVE : une ligne à l'heure juste doit passer sur le MÊME serveur,
         sinon « tout est refusé » passerait ce contrôle au vert. */
      const ok2 = await H.appel('POST', '/api/op/pousser', { jeton: sh.j && sh.j.jeton,
        corps: { enr: [{ c: 'produits', id: 'h2', m: Date.now(), e: 'eh2', r: { nom: 'H2' } }] } });
      v('⛔ et une ligne à l\'heure juste passe', [ok2.code, ok2.j && ok2.j.acceptes], [200, 1]);
      await H.arreter();
    }

    /* ══ 5bis. RALLUMAGE : LA RÉOUVERTURE FAITE DRAPEAU ÉTEINT A-T-ELLE PRIS ? ═════════ */
    /* ⛔ LE SEUL CONTRÔLE QUI VOIT CE BLOQUANT. `socleOuvrir` rendait `fait:true` drapeau
       éteint SANS RIEN FAIRE, et la Tour retirait quand même l'entreprise d'`entFermes` : au
       rallumage elle restait `ferme` SUR DISQUE, donc 403 définitif — et le bouton « Rouvrir »
       ne pouvait plus rien pour elle, puisqu'elle n'était plus dans `entFermes`. Une
       suspension devenue une condamnation, sans un mot. */
    console.log('⛔ Rallumage : l\'entreprise rouverte drapeau éteint peut-elle travailler ?');
    {
      const R2 = await assembler('rallume', { socle: true, endpoint: ENDPOINT, data: R.data });
      vrai('le serveur redémarre, socle rallumé', R2.vivant);
      const s3 = await R2.appel('POST', '/api/op/session', { corps: { t: T_B, kh: sha(CLE_B) } });
      v('⛔ elle ouvre une session — la réouverture avait bien eu lieu', s3.code, 200);
      await R2.arreter();
    }

    /* ══ 6. L'INERTIE : SOCLE ÉTEINT, AUCUNE BASE ══════════════════════════════════════ */
    /* ⛔ C'EST LA PRODUCTION D'AUJOURD'HUI. Le socle n'y est pas allumé ; la sauvegarde, si. Si
       le simple fait de sauvegarder faisait naître un annuaire, le socle s'allumerait tout seul
       sur le VPS d'ELAN, un fichier chiffré sous une clé maître que personne n'a encore mise en
       séquestre. « Rien ne s'écrit au seul chargement », appliqué au serveur. */
    console.log('⛔ Inertie : socle éteint et aucune base — rien ne doit naître');
    await dormir(1100);
    const I = await assembler('inerte', { socle: false, endpoint: ENDPOINT });
    vrai('le serveur démarre', I.vivant);
    {
      const { j } = await I.appel('GET', '/health');
      v('la sauvegarde est active', j.sauvegarde && j.sauvegarde.active, true);
      v('le socle est éteint', j.socle && j.socle.actif, false);
    }
    const auDemarrage = arbre(I.data);
    faux('⛔ aucun annuaire créé au démarrage', auDemarrage.some(f => /socle-annuaire\.db/.test(f)));
    faux('⛔ aucun dossier de bases créé au démarrage', auDemarrage.some(f => /^socle\//.test(f)));

    const { j: co3 } = await I.appel('POST', '/api/monitor/login', { corps: { nom: 'Patron', pass: MDP } });
    const avant3 = coffre.objets.size;
    const L3 = await I.appel('POST', '/api/monitor/sauvegarde/lancer', { jeton: co3 && co3.token, corps: {} });
    v('la sauvegarde réussit sans socle', L3.j && L3.j.ok, true);
    v('une archive de plus', coffre.objets.size, avant3 + 1);
    const apres = arbre(I.data);
    faux('⛔ la sauvegarde n\'a créé AUCUN annuaire', apres.some(f => /socle-annuaire\.db/.test(f)));
    faux('⛔ ni aucune base', apres.some(f => /^socle\//.test(f)));

    /* ⛔ ET LES PORTES DE LA TOUR NE RÉVEILLENT PAS LE SOCLE NON PLUS. C'est la contre-épreuve
       du correctif d'à côté : ces portes se décident maintenant sur les DONNÉES, donc elles
       vont regarder le disque. Si elles y allaient par `existe()`, qui passe par `annuaire()`,
       elles CRÉERAIENT `socle-annuaire.db` — un fichier chiffré sous une clé maître que
       personne n'a encore mise en séquestre, né d'un simple clic dans la Tour, sur le VPS
       d'un client dont le socle n'a jamais tourné. La garde regarde le disque, sans rien
       ouvrir ; ce contrôle est ce qui l'oblige à le rester. */
    {
      const susp = await I.appel('POST', '/api/monitor/espaces/suspendre',
        { jeton: co3 && co3.token, corps: { slug: SLUG_A } });
      v('la Tour suspend, socle éteint et sans base', susp.code, 200);
      const rn = await I.appel('POST', '/api/monitor/espaces/renaitre',
        { jeton: co3 && co3.token, corps: { nom: SLUG_A } });
      v('et fait repartir à neuf', rn.code, 200);
      const apresPortes = arbre(I.data);
      faux('⛔ AUCUN annuaire de socle n\'est né des portes', apresPortes.some(f => /socle-annuaire\.db/.test(f)));
      faux('⛔ ni aucun dossier de base', apresPortes.some(f => /^socle\//.test(f)));
    }
    {
      const cle3 = [...coffre.objets.keys()].sort().pop();
      fs.writeFileSync(arch, coffre.objets.get(cle3));
      const { liste: l3 } = deballer(arch, CLE_SAUV, path.join(BANC, 'deballe-3'));
      /* ⛔ LA CONTRE-ÉPREUVE DE L'INERTIE. « Aucun fichier de socle » serait aussi vrai d'une
         archive VIDE — et une archive vide passerait les deux contrôles ci-dessus au vert. */
      vrai('⛔ l\'archive porte quand même les données du serveur', l3.some(f => /espaces\.json$/.test(f)));
      faux('et aucun instantané, puisqu\'il n\'y avait rien', l3.some(f => f.startsWith('socle-instantane/')));
    }
    await I.arreter();

  } catch (e) {
    ko++; console.log('  ✗ banc interrompu : ' + e.message + '\n' + String(e.stack || '').split('\n').slice(1, 4).join('\n'));
  }

  await new Promise(res => coffre.srv.close(res));
  await menage();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  /* ⛔ PAS DE `process.exit()` ICI, ET C'EST LE BANC QUI L'A APPRIS. Cette suite écrit beaucoup
     plus que les autres ; quand sa sortie est un TUBE (`| tail`, une redirection, la boucle qui
     lance les quinze suites), `process.exit()` coupe ce qui reste dans le tampon — et ce qui
     reste, c'est justement la DERNIÈRE ligne, celle qui porte le compte. Mesuré : `25 ✓ 0 ✗`
     sur `test-725`, rien du tout ici. Une suite dont le total disparaît est une suite qu'on
     croit avoir lue. On pose le code de sortie et on laisse Node vider ses tampons. */
  process.exitCode = ko ? 1 : 0;
})();
