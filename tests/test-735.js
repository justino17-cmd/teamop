/* ⛔ CE QUE CE FICHIER GARDE — LA SECONDE ÉCRITURE, BRANCHÉE POUR DE VRAI.

   L'étape 4 met en face à face deux moitiés écrites séparément : le bloc socle d'`app.html`
   et les routes `/api/op/*` du serveur. Chacune est déjà gardée — `test-732` éprouve le
   convertisseur, `test-723` et `test-724` éprouvent les routes — et c'est exactement le
   problème : **les deux peuvent être justes et ne pas se parler.**

   ⛔ ET C'EST ARRIVÉ, AU PREMIER BRANCHEMENT, DANS LE CODE ÉCRIT POUR CE BANC :

     1. L'APPAREIL ENVOYAIT `{lignes:[…]}`. La route lit `Array.isArray(b.enr) ? b.enr : null`
        et rend 400 « enr attendu ». Le client fait `if (!r.ok) break;` — donc **la double
        écriture entière était inerte, en silence**, sans qu'aucune des 91 suites bronche :
        `test-732` décompose sans jamais poster, `test-723` poste un corps qu'il écrit
        lui-même. Personne ne regardait la couture.
     2. L'APPAREIL LISAIT `j.acceptes_ids` — un champ qui n'existe dans AUCUNE réponse du
        serveur (`pousser` rend `acceptes`, un NOMBRE, et `refus`, la liste détaillée). La
        branche ne tournait jamais. Une garde qui ne s'exécute pas se lit pourtant comme une
        garde, et c'est ce qui la rend pire que rien.

   ⛔ LA RÈGLE DE CE FICHIER : on extrait les VRAIES fonctions d'`app.html` — pas une copie,
   pas un résumé — et on les fait parler au VRAI serveur, démarré par `server/index.js`, sur
   127.0.0.1. Un nom de champ qui change d'un côté doit faire tomber ce banc.
   ⚠️ Jamais `api.teamop.fr`. Aucun appel sortant, aucune donnée réelle.

   ⚠️ CE QU'IL NE COUVRE PAS, et qu'il faut savoir avant de s'y fier : il ne joue ni le
   branchement dans `_ecriture.then` (c'est du DOM et une promesse Firestore — `test-733` lit
   le texte), ni le balayage de `espaceQuitter()` (idem), ni la minuterie du contrôle de nuit. */

const fs = require('fs'), os = require('os'), net = require('net');
const path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, a) => v(t, !!a, true);

if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('  — server/node_modules absent : banc non exécuté (npm i dans server/)');
  console.log('\n0 ✓  0 ✗');
  process.exit(0);
}

const SRC = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-735-'));
const KEK = crypto.randomBytes(32).toString('hex');
const MDP = 'mot-de-passe-du-banc-2026';
/* ⚠️ Une clé PROPRE, pas la clé partagée : `/api/op/session` rend 409 « cle_partagee » à un
   espace resté dessus, et le banc croirait mesurer une panne alors qu'il mesure un refus juste. */
const T = 'ent-socle-4z', SLUG = 'entreprisesocle', CLE = 'cle-propre-du-banc-735-2026';
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});

console.log('\n── 735 · la seconde écriture : l\'appareil RÉEL parle au serveur RÉEL ──');

/* ══ 1. EXTRAIRE LE BLOC SOCLE DU FICHIER LIVRÉ ═══════════════════════════════════════════ */
const bloc = (sig) => { const i = SRC.indexOf(sig); if (i < 0) return '';
  let d = 0, f = -1; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { f = k + 1; break; } } } return SRC.slice(i, f); };
const ligne = (sig) => { const i = SRC.indexOf(sig); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const objet = (sig) => { const i = SRC.indexOf(sig); if (i < 0) return '{}';
  let d = 0, f = -1; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { f = k + 1; break; } } } return SRC.slice(SRC.indexOf('{', i), f); };

const code = [
  bloc('function recEmpreinte('),
  'const OP_CLASSES = ' + objet('const OP_CLASSES = {') + ';',
  ligne('const OP_ID_DE ='), ligne('const OP_REGLAGES ='), ligne('const OP_BOX_FORME ='), ligne('const OP_VIDES ='),
  bloc('function opSansTampon('), bloc('function opCanon('), bloc('function opEmpreinte('),
  bloc('function opFichiersDe('), bloc('function opAmpute('), bloc('function opIdDerive('),
  bloc('function opSignature('), bloc('function opDecomposer('), bloc('function opRecomposer('),
  /* ── LE BLOC DE L'ÉTAPE 4, MOT POUR MOT ── */
  ligne('let _opJeton ='), ligne('let _opEnVol ='),
  ligne('const OP_HAUT_CLE ='), ligne('const OP_NON_CLE ='),
  ligne('function opHautLire('), ligne('function opHautPoser('),
  ligne('function opNonLire('), ligne('function opNonPoser('),
  bloc('async function opSocleSession('),
  bloc('function opSoclePousser('),
  bloc('async function opSoclePousserVraiment('),
  bloc('async function opSocleControle('),
].join('\n');

/* Un `localStorage` de banc : une Map, avec `Object.keys` qui marche comme dans un navigateur
   (c'est ce dont `espaceQuitter` se sert, et ce qui manque à une Map nue). */
function stockNeuf() {
  const m = {};
  return { getItem: k => (k in m ? m[k] : null), setItem: (k, val) => { m[k] = String(val); },
    removeItem: k => { delete m[k]; }, get _brut() { return m; },
    get length() { return Object.keys(m).length; }, key: i => Object.keys(m)[i] };
}

/* ══ 2. MONTER LE VRAI SERVEUR ════════════════════════════════════════════════════════════ */
const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
const vap = webpush.generateVAPIDKeys();
let enfant = null;

async function monter() {
  const dir = path.join(BANC, 'srv'), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const cfgPath = path.join(dir, 'config.json');
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha(MDP), socle: { actif: true },
  }));
  fs.writeFileSync(path.join(data, 'espaces.json'), JSON.stringify({
    [SLUG]: { slug: SLUG, nom: 'Entreprise du banc', email: 'banc@exemple.fr', t: T, code: b64({ t: T, k: CLE }), ts: 1 },
  }));
  const port = await portLibre();
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port), TEAMOP_KEK: KEK }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let journal = '';
  enfant.stdout.on('data', d => { journal += d; });
  enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  return { B, vivant, journal: () => journal };
}

async function arreter() {
  if (!enfant || enfant.exitCode !== null || enfant.signalCode !== null) return;
  await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) { res(); } });
}

/* ══ 3. UNE BASE DE TRAVAIL ═══════════════════════════════════════════════════════════════ */
function basePetite(m) {
  return {
    clients: [{ id: 'c1', nom: 'Client Un', ville: 'Niort', _m: m }, { id: 'c2', nom: 'Client Deux', ville: 'Nantes', _m: m }],
    interventions: [{ id: 'i1', num: 'INT-1', client: 'c1', statut: 'faite', _m: m }],
    produits: [{ id: 'p1', nom: 'Produit Un', stock: 12, _m: m }],
  };
}

(async () => {
  const S = await monter();
  vrai('⛔ le VRAI serveur démarre, socle allumé', S.vivant);
  if (!S.vivant) { console.log('      journal : ' + S.journal().slice(-500)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); await arreter(); process.exit(1); }

  const appel = async (methode, chemin, o) => {
    const c = o || {};
    const h = Object.assign({ 'Content-Type': 'application/json' }, c.entetes || {});
    if (c.jeton) h.Authorization = 'Bearer ' + c.jeton;
    const r = await fetch(S.B + chemin, { method: methode, headers: h, body: c.corps === undefined ? undefined : JSON.stringify(c.corps) });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { code: r.status, j };
  };
  const { j: co } = await appel('POST', '/api/monitor/login', { corps: { nom: 'Patron', pass: MDP } });
  const JETON_TOUR = co && co.token;
  vrai('le patron ouvre une session de Tour', !!JETON_TOUR);

  /* ── L'appareil : les vraies fonctions, le vrai `fetch`, un stockage de banc ── */
  let stock = stockNeuf();
  let db = basePetite(1000);
  const diagnostics = [];
  let api = null;
  try {
    api = new Function('fetch', 'localStorage', 'PUSH_API', 'sauvKh', 'syncDeviceId', 'syncDiagnostic',
      'APP_VERSION', 'currentUser', 'db', 'console', 'uid', 'AbortController', 'setTimeout', 'clearTimeout', 'Math',
      code + '\nreturn {opDecomposer,opSignature,opSocleSession,opSoclePousser,opSoclePousserVraiment,opSocleControle,opHautLire,opNonLire};')
      (fetch, stock, S.B, async () => ({ t: T, kh: sha(CLE) }), () => 'dev-banc-1',
       (motif) => diagnostics.push(motif), 703, { id: 'u-banc' }, db,
       { log() {}, warn() {}, error() {} }, () => 'u' + Math.random(), AbortController, setTimeout, clearTimeout, Math);
  } catch (e) { console.log('      (extraction : ' + e.message + ')'); }
  vrai('⛔ le bloc socle du fichier livré s\'extrait et s\'exécute', !!(api && api.opSoclePousser && api.opSocleControle));
  if (!api) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); await arreter(); process.exit(1); }

  /* ══ (a) DRAPEAU ÉTEINT : RIEN NE PART ══════════════════════════════════════════════════
     C'est l'état d'AUJOURD'HUI en production, et le seul qui compte tant que Justin n'a pas
     tranché. Un banc qui n'éprouverait que le cas allumé laisserait passer une double écriture
     qui parle quand même. */
  console.log('\n⛔ Drapeau ÉTEINT — l\'appareil ne doit RIEN envoyer');
  {
    const r = await api.opSoclePousser();
    v('la pousse rend null quand le serveur dit `double:false`', r, null);
    const e = await appel('POST', '/api/op/session', { corps: { t: T, kh: sha(CLE), app_id: 'dev-controle' } });
    v('   et le socle est resté VIDE (seq 0)', e.j && e.j.seq, 0);
    vrai('   le verdict « non » est rangé sur l\'appareil, pour épargner le plafond de sessions', api.opNonLire(T) > Date.now());
    /* ⚠️ Et il DOIT court-circuiter : sans ça, chaque rechargement redemande une session, et
       120/h par espace se remplissent avec trente téléphones qui rechargent. */
    const r2 = await api.opSoclePousser();
    v('   une seconde pousse ne redemande même pas de session', r2, null);
  }

  /* ══ (b) DRAPEAU ALLUMÉ : LA COUTURE ══════════════════════════════════════════════════════ */
  console.log('\n⛔ Drapeau ALLUMÉ — la couture entre les deux moitiés');
  const on = await appel('POST', '/api/monitor/op/double', { jeton: JETON_TOUR, corps: { t: T, actif: true } });
  v('la Tour allume la double écriture de cet espace', [on.code, on.j && on.j.double], [200, true]);
  stock = stockNeuf();   // un appareil neuf : le « non » d'avant ne doit pas le figer
  api = new Function('fetch', 'localStorage', 'PUSH_API', 'sauvKh', 'syncDeviceId', 'syncDiagnostic',
    'APP_VERSION', 'currentUser', 'db', 'console', 'uid', 'AbortController', 'setTimeout', 'clearTimeout', 'Math',
    code + '\nreturn {opDecomposer,opSignature,opSocleSession,opSoclePousser,opSoclePousserVraiment,opSocleControle,opHautLire,opNonLire};')
    (fetch, stock, S.B, async () => ({ t: T, kh: sha(CLE) }), () => 'dev-banc-1',
     (motif) => diagnostics.push(motif), 703, { id: 'u-banc' }, db,
     { log() {}, warn() {}, error() {} }, () => 'u' + Math.random(), AbortController, setTimeout, clearTimeout, Math);

  {
    const attendues = api.opDecomposer(db).length;
    const r = await api.opSoclePousser();
    /* ⛔ LE CONTRÔLE QUI A TROUVÉ LE DÉFAUT. Avec `{lignes:…}` au lieu de `{enr:…}`, `r` vaut
       `{envoyees:0}` et le socle reste vide — sans aucune erreur, sans aucun journal. */
    vrai('⛔ la pousse a ENVOYÉ quelque chose (le nom du champ est le bon)', r && r.envoyees > 0);
    v('⛔ et le serveur a accepté TOUTES les lignes décomposées', r && r.envoyees, attendues);
    v('   aucun refus', r && r.refus, 0);

    const e = await appel('POST', '/api/op/session', { corps: { t: T, kh: sha(CLE), app_id: 'dev-controle' } });
    vrai('⛔ le socle n\'est plus vide, vu par une AUTRE session', e.j && e.j.seq >= attendues);
    v('   et il dit bien `double:true` à cet espace', e.j && e.j.double, true);
  }

  /* ══ (c) LA BORNE HAUTE ══════════════════════════════════════════════════════════════════ */
  console.log('\n⛔ La borne haute — on ne repousse pas 9 862 lignes à chaque enregistrement');
  {
    v('la borne est montée au plus haut `_m` accepté', api.opHautLire(T), 1000);
    const r = await api.opSoclePousser();
    v('⛔ une pousse sans rien de neuf n\'envoie RIEN', r && r.envoyees, 0);

    db.clients[0].ville = 'La Rochelle'; db.clients[0]._m = 2000;
    const bouge = api.opDecomposer(db).filter(l => (+l.m || 0) > 1000).map(l => l.c + '/' + l.id).sort();
    /* ⚠️ DEUX LIGNES, ET C'EST JUSTE — l'assertion « une seule » était fausse, pas le code.
       Le bloc de réglages n'a pas de `_m` à lui : il porte `dateBase`, le plus haut de la base.
       Bouger UNE fiche fait donc repartir les réglages avec elle. Ça ne coûte rien (le serveur
       classe un corps identique en `noop` sans faire avancer `seq`), mais il faut le savoir
       avant de compter des lignes — sinon on cherche une heure une pousse qu'on croit de trop. */
    v('⛔ une fiche modifiée n\'entraîne QU\'ELLE et le bloc de réglages', bouge, ['_reglages/bloc', 'clients/c1']);
    const r2 = await api.opSoclePousser();
    v('   donc deux lignes partent, pas la base entière', r2 && r2.envoyees, 2);
    v('   la borne suit', api.opHautLire(T), 2000);
  }

  /* ══ (d) UNE LIGNE REFUSÉE NE FAIT PAS MONTER LA BORNE ════════════════════════════════════
     ⛔ C'est le contrôle qui protège du pire cas de tout l'étage : une borne posée sur un lot
     entier ferait sauter DÉFINITIVEMENT les lignes refusées. Elles ne repasseraient plus
     jamais sous le filtre, et la divergence serait permanente — invisible jusqu'au contrôle
     de nuit, et inexplicable après.
     On fabrique le refus avec une horloge en avance : le serveur refuse `horlogeAvancee` au
     delà de cinq minutes, et c'est un refus PARTIEL, donc un 200 avec une liste. */
  console.log('\n⛔ Une ligne refusée ne doit PAS faire monter la borne');
  {
    const avant = api.opHautLire(T);
    /* ⚠️ DES `_m` RÉALISTES, ET C'EST LE BANC QUI S'EST TROMPÉ D'ABORD. `estampiller()` pose
       TOUJOURS `Date.now()` : un `_m` de 2 500 est un artefact de banc. Il fabriquait ici un
       faux défaut — la borne montait à « maintenant » via le bloc de réglages, et les fiches
       suivantes, datées dans les années 1970, passaient sous elle. Le code avait raison. */
    db.produits[0].stock = 99; db.produits[0]._m = Date.now() + 3600000;   // une heure en avance
    db.clients[1].ville = 'Saintes'; db.clients[1]._m = Date.now();         // celle-ci est bonne
    const r = await api.opSoclePousser();
    v('le serveur a refusé la ligne à l\'horloge folle', r && r.refus, 1);
    /* Deux acceptées : la fiche saine, et le bloc de réglages qui la suit (voir plus haut).
       ⛔ ET C'EST ICI QUE SE VÉRIFIE LE PLAFOND DE `dateBase`. Sans lui, la fiche à l'horloge
       folle emporterait le bloc de réglages dans son refus — donc aussi les dictionnaires
       (`plansSite`, `planNotes`, `permissions`) et la liste des collections vides, sur TOUS les
       appareils, et pour toujours. On aurait alors 2 refus au lieu de 1. */
    v('⛔ et accepté la fiche saine ET le bloc de réglages (dateBase est plafonné)', r && r.envoyees, 2);
    vrai('⛔ la borne s\'arrête AVANT la ligne refusée', api.opHautLire(T) < db.produits[0]._m);
    vrai('   elle a tout de même avancé sur ce qui est passé', api.opHautLire(T) > avant);
    vrai('   donc la ligne refusée repassera (son `_m` dépasse encore la borne)',
      api.opDecomposer(db).filter(l => (+l.m || 0) > api.opHautLire(T)).length >= 1);
    db.produits[0]._m = Date.now();   // on remet l'horloge droite pour la suite
  }

  /* ══ (e) LE CONTRÔLE : LES DEUX SIGNATURES ═══════════════════════════════════════════════ */
  console.log('\n⛔ Le contrôle de nuit — la seule chose qui puisse voir une écriture perdue');
  {
    await api.opSoclePousser();
    const c = await api.opSocleControle();
    /* ⛔ LES DEUX MOITIÉS CALCULENT LA MÊME SIGNATURE SUR LES MÊMES DONNÉES, chacune de son
       côté : `opSignature` dans la page, `server/op-signature.js` sur le VPS. Le jour où l'une
       dérive, ce contrôle est ce qui le dit — et ce banc est ce qui dit qu'il le dit. */
    v('⛔ appareil et serveur signent IDENTIQUEMENT après une pousse complète', c && c.ok, true);
    v('   donc aucun écart par collection', c && c.ecarts && c.ecarts.length, 0);
    v('   et rien n\'a été remonté à la Tour', diagnostics.length, 0);
  }

  /* ══ (f) LA CONTRE-ÉPREUVE : UN CONTRÔLE QUI NE SAIT PAS CRIER NE SERT À RIEN ═════════════ */
  console.log('\n⛔ Contre-épreuve — une divergence doit se voir, et se NOMMER');
  {
    /* On fabrique une divergence du seul côté de l'appareil : une fiche qu'il a et que le
       serveur n'a pas. Sans toucher au serveur, donc sans tricher sur ce qu'il sait. */
    db.clients.push({ id: 'c3', nom: 'Client Trois', ville: 'Royan', _m: 1 });
    const c = await api.opSocleControle();
    v('⛔ la divergence est VUE', c && c.ok, false);
    vrai('⛔ et elle NOMME la collection', c && c.ecarts && c.ecarts.some(x => x.coll === 'clients'));
    vrai('⛔ elle est remontée à la Tour', diagnostics.length >= 1);
    const dit = diagnostics.join(' ');
    vrai('   le message nomme la collection', /clients/.test(dit));
    /* ⛔ ET IL NE DIT QUE ÇA. La Tour doit savoir QUOI regarder, jamais lire les données du
       client : un identifiant de fiche, un nom, une ville n'ont rien à faire dans un
       diagnostic. Ce dépôt a déjà payé pour un journal trop bavard. */
    v('⛔ le diagnostic ne porte AUCUN identifiant de fiche', /\bc3\b|\bc1\b|\bi1\b|\bp1\b/.test(dit), false);
    v('⛔ ni aucun contenu de client', /Royan|Client Trois|Niort|Saintes/.test(dit), false);
    /* ⛔ ET LE CONTRÔLE RÉPARE, IL NE SE CONTENTE PAS DE CONSTATER. C'est ce banc qui a montré
       qu'il le fallait : la borne haute est UN SEUL nombre, donc elle suppose que ce qui est
       plus vieux qu'elle est déjà parti. Un enregistrement qui ARRIVE du passé — le cas normal
       pendant les quelques jours où un parc est mélangé, un appareil en version ancienne
       écrivant dans Firestore sans rien pousser ici — reste sous la borne POUR TOUJOURS. */
    v('⛔ la borne est remise à zéro : la pousse suivante repart de tout', api.opHautLire(T), 0);
    const reprise = await api.opSoclePousser();
    vrai('⛔ et la reprise envoie bien la base entière', reprise && reprise.envoyees >= 5);
    const apres = await api.opSocleControle();
    v('⛔ après quoi les deux côtés se rejoignent', apres && apres.ok, true);
    db.clients.pop();
    /* La fiche retirée ici n'a pas de pierre tombale : le serveur la garde, donc les deux
       signatures divergent de nouveau. On repart d'une borne neuve pour la suite du banc. */
    await api.opSocleControle();
  }

  /* ══ (g) LA GARDE DE RÉ-ENTRANCE ═════════════════════════════════════════════════════════
     Dix-sept endroits appellent `syncPush`. Trois `save()` coup sur coup lanceraient trois
     pousses concurrentes des mêmes lignes — trois décompositions, trois fois le trafic, et une
     course sur la borne où la dernière écriture gagne. */
  console.log('\n⛔ Trois pousses lancées ensemble n\'en font qu\'une');
  {
    await api.opSoclePousser();   // on règle d'abord la borne sur l'état courant
    /* ⚠️ `borne + 1`, PAS `Date.now()`. La borne vient de monter à « maintenant » : un
       `Date.now()` pris dans la milliseconde suivante peut lui être ÉGAL, et le filtre est
       `>` strict — le banc tomberait alors une fois sur vingt, sans rien de cassé. Un banc qui
       crie faux se fait ignorer, puis désactiver. */
    db.interventions[0].statut = 'planifiee'; db.interventions[0]._m = api.opHautLire(T) + 1;
    const p1 = api.opSoclePousser(), p2 = api.opSoclePousser(), p3 = api.opSoclePousser();
    vrai('⛔ les trois appels rendent la MÊME promesse', p1 === p2 && p2 === p3);
    const [a, b, c] = await Promise.all([p1, p2, p3]);
    v('   et donc le même résultat', [a && a.envoyees, b && b.envoyees, c && c.envoyees], [2, 2, 2]);
    /* ⛔ ET LA GARDE SE RELÂCHE. Sans le `finally`, `_opEnVol` resterait figé sur une promesse
       morte et PLUS RIEN ne partirait jusqu'au rechargement — une panne pire que la course. */
    db.produits[0].stock = 7; db.produits[0]._m = api.opHautLire(T) + 1;
    const apres = await api.opSoclePousser();
    v('⛔ une pousse SUIVANTE passe encore (la garde s\'est relâchée)', apres && apres.envoyees, 2);
  }

  /* ══ (h) LE SERVEUR COUPE : L'APPAREIL SE TAIT, SANS RIEN CASSER ═════════════════════════ */
  console.log('\n⛔ La marche arrière — la Tour coupe, l\'appareil se tait');
  {
    const off = await appel('POST', '/api/monitor/op/double', { jeton: JETON_TOUR, corps: { t: T, actif: false } });
    v('la Tour coupe la double écriture', off.j && off.j.double, false);
    db.clients[0].ville = 'Rochefort'; db.clients[0]._m = Date.now();
    /* Le jeton en mémoire porte encore `double:true` : on force une nouvelle session, comme le
       fera un appareil qui recharge sa page ou dont le jeton expire. */
    await api.opSocleSession(true);
    const r = await api.opSoclePousser();
    v('⛔ plus rien ne part, sans erreur et sans message', r, null);
  }

  /* ══ (i) LE SERVEUR TOMBE : LA SYNCHRO DE L'ENTREPRISE NE DOIT PAS LE SENTIR ══════════════
     ⛔ C'est la seule règle qui compte vraiment de tout l'étage. Une synchro d'entreprise qui
     tombe parce qu'un chantier interne a hoqueté est exactement ce que ce dépôt a payé le
     11 septembre 2026, quand une écriture non acquittée affichait « Connexion requise » plein
     écran en boucle. */
  console.log('\n⛔ Le VPS est mort — et personne ne doit s\'en apercevoir');
  {
    await arreter();
    let jete = null, r = null;
    try { r = await api.opSoclePousser(); } catch (e) { jete = String(e && e.message); }
    v('⛔ la pousse ne JETTE pas quand le serveur est injoignable', jete, null);
    v('   elle rend null', r, null);
    let jete2 = null, c = null;
    try { c = await api.opSocleControle(); } catch (e) { jete2 = String(e && e.message); }
    v('⛔ le contrôle non plus', jete2, null);
    v('   il rend null', c, null);
  }

  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  if (ko) process.exitCode = 1;
})().catch(async e => {
  console.log('  ✗ le banc lui-même a jeté : ' + (e && e.stack || e));
  await arreter();
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (x) {}
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});
