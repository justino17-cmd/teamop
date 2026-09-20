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

   ⛔ ÉPROUVÉ EN REMETTANT LES DÉFAUTS, UN PAR UN — mesuré le 20 septembre 2026, référence
   48 ✓ · 0 ✗ :

     | défaut remis                                     | ce que le banc rend |
     |--------------------------------------------------|---------------------|
     | l'appareil renvoie `{lignes:…}`                  | **29 ✓ · 16 ✗**     |
     | il s'authentifie par `X-OP-Jeton`                | **29 ✓ · 16 ✗**     |
     | la garde de ré-entrance ne se relâche jamais     | **33 ✓ · 15 ✗**     |
     | la borne ne se pose plus du tout                 | **41 ✓ · 7 ✗**      |
     | plus de borne : on repousse tout à chaque fois   | **43 ✓ · 5 ✗**      |
     | la borne monte sur TOUT le lot, refus compris    | **43 ✓ · 5 ✗**      |
     | le drapeau `double` du serveur est ignoré        | **43 ✓ · 5 ✗**      |
     | le contrôle constate mais ne répare plus         | **45 ✓ · 3 ✗**      |
     | `dateBase` n'est plus plafonné à maintenant      | **46 ✓ · 2 ✗**      |
     | le verdict « non » n'est plus rangé              | **46 ✓ · 2 ✗**      |
     | plus de garde de ré-entrance                     | **46 ✓ · 2 ✗**      |
     | le cache du verdict « non » est retiré           | **46 ✓ · 1 ✗**      |

   ⚠️ LES TROIS DERNIÈRES LIGNES SONT LA LEÇON DE MÉTHODE, et elles ont coûté deux tours.
   Aucune des trois ne cassait QUOI QUE CE SOIT à la première écriture du banc :

     · retirer le cache du verdict « non » : neutralisé par `_opJeton`, qui vit en mémoire.
       Le cache n'existe QUE pour le RECHARGEMENT — et le banc ne rechargeait jamais. Il faut
       un `allumer()` qui perd la mémoire et garde le stockage, comme un navigateur ;
     · retirer la garde de ré-entrance : le serveur classe en `noop` les corps identiques,
       donc trois pousses concurrentes rendaient le même résultat. Le dommage est le TRAFIC,
       pas le résultat — on compte donc les allers-retours, par chemin.

   Une mutation qui ne casse rien ne dit pas « le code est bon ». Elle dit « qu'est-ce que le
   banc ne joue pas ? ».

   ⛔ L'ÉTAPE 5 Y A AJOUTÉ SA PROPRE TABLE DE MUTATIONS — mesurée le 20 septembre 2026,
   référence 94 ✓ · 0 ✗ :

     | défaut remis                                          | ce que le banc rend |
     |-------------------------------------------------------|---------------------|
     | la lecture ignore le drapeau `lecture` du serveur     | **86 ✓ · 3 ✗**      |
     | le curseur saute au rang le plus haut (`seq`)         | **91 ✓ · 3 ✗**      |
     | `cnxAppareils` rend une liste vide au lieu de `null`  | **92 ✓ · 2 ✗**      |
     | `liste_ts` repart en `push` aveugle                   | **87 ✓ · 2 ✗**      |
     | la garde de date saute (le serveur écrase toujours)   | **85 ✓ · 1 ✗**      |
     | `source` lu en vérité JavaScript                      | **82 ✓ · 4 ✗**      |

   ⚠️ DEUX MUTATIONS N'ONT RIEN CASSÉ ICI, ET C'ÉTAIT LA BONNE INFORMATION. Inverser le défaut
   de `lecture`, et retirer l'exigence de couverture quotidienne de la condition (d) : ce banc
   parle au serveur en HTTP, donc son espace existe toujours et sa colonne est toujours
   renseignée — et son espace porte déjà un verdict en échec, qui fait tomber (d) de toute
   façon. Les deux sont des FONCTIONS PURES : elles sont gardées dans `test-723`, qui les
   exerce directement. Un banc de câblage ne peut pas fabriquer un espace inconnu.

   ⛔ L'ÉTAPE 6 ET LA RÈGLE DE L'IMPAYÉ Y ONT AJOUTÉ LEUR TABLE — mesurée le 20 septembre 2026,
   référence 127 ✓ · 0 ✗ :

     | défaut remis                                          | ce que le banc rend |
     |-------------------------------------------------------|---------------------|
     | la session refuse à nouveau un espace suspendu        | **114 ✓ · 6 ✗**     |
     | le chrono n'est plus posé sur les routes              | **108 ✓ · 3 ✗**     |
     | « suspendu » est traité comme « fermé »               | **124 ✓ · 3 ✗**     |
     | les refus ne sont plus versés au disque               | **109 ✓ · 1 ✗**     |
     | le flux long entre dans les quantiles                 | **110 ✓ · 1 ✗**     |
     | (b) l'annuaire n'est plus consulté                    | **123 ✓ · 1 ✗**     |

   ⚠️ TROIS DE CES SIX N'ONT RIEN CASSÉ AU PREMIER JET, et chacune disait la même chose : le
   banc ne jouait pas le cas.
     · le flux long : il n'était jamais appelé, donc l'exclure ou non ne changeait rien ;
     · « suspendu traité comme fermé » : `espaceBloque` sort AVANT d'examiner un espace actif,
       et le seul `/pret` du banc tournait sur un espace actif. Il fallait le demander PENDANT
       la suspension ;
     · et le pire : le bloc de l'impayé passait au vert alors que la suspension n'avait JAMAIS
       eu lieu — la route prend un slug, pas un `t`, donc elle rendait 404. Un banc qui ne
       vérifie pas que sa MISE EN SCÈNE a eu lieu ne teste rien.

   ⚠️ CE QU'IL NE COUVRE PAS, et qu'il faut savoir avant de s'y fier : il ne joue ni le
   branchement dans `_ecriture.then` (c'est du DOM et une promesse Firestore — `test-733` lit
   le texte), ni le balayage de `espaceQuitter()` (idem), ni la minuterie du contrôle de nuit,
   ni le flux long (`opSocleFlux` est une boucle infinie : on ne l'appelle pas depuis un banc). */

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
  ligne('const OP_HAUT_CLE ='), ligne('const OP_NON_CLE ='), ligne('const OP_APP_CLE ='),
  ligne('function opHautLire('), ligne('function opHautPoser('),
  ligne('function opNonLire('), ligne('function opNonPoser('),
  ligne('function opAppLire('), ligne('function opAppPoser('),
  bloc('async function opSocleSession('),
  bloc('function opSoclePousser('),
  bloc('async function opSoclePousserVraiment('),
  bloc('async function opSocleControle('),
  /* ── ÉTAPE 5 : LA LECTURE ── */
  ligne('const OP_SEQ_CLE ='), ligne('function opSeqLire('), ligne('function opSeqPoser('),
  ligne('let _opLectureEnVol ='),
  bloc('function opSocleLire('), bloc('async function opSocleLireVraiment('),
  /* ── ÉTAPE 7 : LA RELECTURE ── */
  ligne('const OP_PHOTO_BASE ='), bloc('function opRecensement('),
  bloc('async function opAttester('), bloc('async function opRelecture('),
].join('\n');

/* ⛔ UN `fetch` QUI COMPTE, ET C'EST UNE MUTATION QUI L'A EXIGÉ. « Une seconde pousse ne
   redemande même pas de session » était AVEUGLE : sans le cache du verdict négatif, le second
   appel repart bel et bien au serveur, reçoit `double:false` et rend `null` — exactement le
   même résultat. Le banc gardait une intention, pas un comportement. On compte donc les appels
   PAR CHEMIN : c'est la seule chose qui distingue « il n'a pas demandé » de « il a demandé et
   la réponse était non ». */
function fetchCompteur() {
  const par = {};
  const f = (u, o) => {
    const chemin = String(u).replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    par[chemin] = (par[chemin] || 0) + 1;
    return fetch(u, o);
  };
  f.par = par;
  f.combien = c => par[c] || 0;
  return f;
}

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

  /* ── L'appareil : les vraies fonctions, le vrai `fetch`, un stockage de banc ──
     ⛔ ON LE CONSTRUIT PAR UNE FONCTION, ET C'EST UNE MUTATION QUI L'A EXIGÉ. Retirer le cache
     du verdict négatif ne cassait RIEN — parce que `_opJeton`, en mémoire, le neutralise tant
     qu'on ne recharge pas. Or le cache n'existe QUE pour le rechargement : un téléphone de
     terrain rouvre l'application dix fois par jour, et c'est là que les 120 sessions/h par
     espace se remplissent. Un « allumer » perd la mémoire et garde le stockage — exactement
     ce que fait un navigateur. Sans ça, le banc gardait une ligne qu'il n'exerçait jamais. */
  let stock = stockNeuf();
  let db = basePetite(1000);
  const diagnostics = [];
  let compte = fetchCompteur();
  const allumer = () => new Function('fetch', 'localStorage', 'PUSH_API', 'sauvKh', 'syncDeviceId', 'syncDiagnostic',
    'APP_VERSION', 'currentUser', 'db', 'console', 'uid', 'AbortController', 'setTimeout', 'clearTimeout', 'Math',
    code + '\nreturn {opDecomposer,opRecomposer,opSignature,opSocleSession,opSoclePousser,opSoclePousserVraiment,opSocleControle,opSocleLire,opHautLire,opNonLire,opSeqLire,opRecensement,opRelecture,opAttester,opEmpreinte,opSansTampon,opIdDerive};')
    (compte, stock, S.B, async () => ({ t: T, kh: sha(CLE) }), () => 'dev-banc-1',
     (motif) => diagnostics.push(motif), 703, { id: 'u-banc' }, db,
     { log() {}, warn() {}, error() {} }, () => 'u' + Math.random(), AbortController, setTimeout, clearTimeout, Math);
  let api = null;
  try { api = allumer(); } catch (e) { console.log('      (extraction : ' + e.message + ')'); }
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
    const sessionsAvant = compte.combien('/api/op/session');
    const r2 = await api.opSoclePousser();
    v('   une seconde pousse rend null elle aussi', r2, null);
    v('   et elle n\'a pas redemandé de session', compte.combien('/api/op/session'), sessionsAvant);
    /* ⛔ ET VOICI LE CAS QUI COMPTE VRAIMENT : LE RECHARGEMENT. Le contrôle au-dessus est
       neutralisé par `_opJeton`, qui vit en mémoire — retirer le cache de `localStorage` ne le
       faisait pas tomber. Un téléphone de terrain rouvre l'application dix fois par jour, et
       c'est LÀ que trente appareils remplissent les 120 sessions/h d'un espace. */
    api = allumer();   // mémoire perdue, stockage gardé : exactement un rechargement
    const r3 = await api.opSoclePousser();
    v('   après rechargement, la pousse rend null elle aussi', r3, null);
    v('⛔ et l\'appareil RECHARGÉ ne redemande toujours PAS de session',
      compte.combien('/api/op/session'), sessionsAvant);
  }

  /* ══ (b) DRAPEAU ALLUMÉ : LA COUTURE ══════════════════════════════════════════════════════ */
  console.log('\n⛔ Drapeau ALLUMÉ — la couture entre les deux moitiés');
  const on = await appel('POST', '/api/monitor/op/double', { jeton: JETON_TOUR, corps: { t: T, actif: true } });
  v('la Tour allume la double écriture de cet espace', [on.code, on.j && on.j.double], [200, true]);
  stock = stockNeuf();   // un appareil neuf : le « non » d'avant ne doit pas le figer
  compte = fetchCompteur();
  api = allumer();

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

    /* ⛔ UNE LIGNE SANS DATE NE DOIT PAS FAIRE CRIER LE CONTRÔLE — TROUVÉ AU NAVIGATEUR, PAS
       ICI. `db.journal` est classé « liste », donc décomposé, mais `estampiller()` ne le
       tamponne PAS : ses entrées naissent sans `_m`. Le serveur refuse toute ligne sans date
       (`non_date`), donc il ne peut JAMAIS l'avoir — la compter, c'est se comparer à une chose
       impossible. Une seule entrée de journal suffisait à faire dire « DIVERGENCE » à un socle
       parfaitement à jour, à CHAQUE contrôle. Et depuis que le contrôle répare, la borne
       repartait à zéro : toute la base (520 Ko mesurés) repoussée chaque nuit, sans jamais
       converger. Ce banc ne pouvait pas le voir — sa base n'avait pas de journal. */
    db.journal = [{ id: 'jr1', txt: 'un geste', qui: 'u-banc' }];   // pas de `_m` : comme dans la vraie vie
    const c2 = await api.opSocleControle();
    v('⛔ une ligne SANS DATE ne fait pas crier le contrôle', c2 && c2.ok, true);
    v('   elle est comptée à part, pas cachée', c2 && c2.muettes, 1);
    v('   et toujours rien à la Tour', diagnostics.length, 0);
    v('⛔ la borne n\'a donc PAS été remise à zéro', api.opHautLire(T) > 0, true);
    delete db.journal;
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
    const poussesAvant = compte.combien('/api/op/pousser');
    const p1 = api.opSoclePousser(), p2 = api.opSoclePousser(), p3 = api.opSoclePousser();
    vrai('⛔ les trois appels rendent la MÊME promesse', p1 === p2 && p2 === p3);
    const [a, b, c] = await Promise.all([p1, p2, p3]);
    /* ⛔ ET C'EST LE TRAFIC QU'ON MESURE, PAS L'IDENTITÉ DE LA PROMESSE. Retirer la garde ne
       faisait tomber qu'UN contrôle, parce que le serveur classe en `noop` les corps
       identiques : les trois pousses rendaient le même résultat et le banc n'y voyait rien.
       Le dommage réel est le RÉSEAU — trois fois les lignes sur un téléphone en 4G, et trois
       décompositions de 18 ms — et la course sur la borne, où la dernière écriture gagne. */
    v('⛔ UN SEUL aller-retour est parti, pas trois', compte.combien('/api/op/pousser') - poussesAvant, 1);
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

  /* ══ (j) ÉTAPE 5 — LA LECTURE ════════════════════════════════════════════════════════════
     ⛔ C'est ici que le VPS devient la source de vérité, et c'est la couture la plus chère du
     chantier : pendant l'étape 4, une ligne perdue ne se voyait pas mais ne cassait rien ; ici
     une ligne perdue est une donnée perdue. */
  console.log('\n⛔ Étape 5 — la lecture, drapeau ÉTEINT');
  {
    await appel('POST', '/api/monitor/op/double', { jeton: JETON_TOUR, corps: { t: T, actif: true } });
    await api.opSocleSession(true);
    const depuisAvant = compte.combien('/api/op/depuis');
    const r = await api.opSocleLire();
    v('la lecture rend null quand le serveur dit `lecture:firestore`', r, null);
    v('⛔ et elle n\'a RIEN demandé au serveur', compte.combien('/api/op/depuis'), depuisAvant);
  }

  console.log('\n⛔ Étape 5 — la Tour bascule, et un SECOND appareil relit la base');
  {
    const on = await appel('POST', '/api/monitor/op/lecture', { jeton: JETON_TOUR, corps: { t: T, source: 'socle' } });
    v('la Tour bascule la lecture sur le socle', [on.code, on.j && on.j.lecture], [200, 'socle']);
    /* ⛔ `source` VIENT DU CORPS ET DÉCIDE DE LA SOURCE DE VÉRITÉ D'UNE ENTREPRISE : il se lit
       en chaîne EXACTE. Ces quatre valeurs sont toutes VRAIES pour `!!`. */
    for (const mauvais of ['SOCLE', 'oui', 1, {}]) {
      const r = await appel('POST', '/api/monitor/op/lecture', { jeton: JETON_TOUR, corps: { t: T, source: mauvais } });
      v('⛔ `source:' + JSON.stringify(mauvais) + '` retombe sur firestore', r.j && r.j.lecture, 'firestore');
    }
    await appel('POST', '/api/monitor/op/lecture', { jeton: JETON_TOUR, corps: { t: T, source: 'socle' } });

    /* On pousse d'abord l'état courant depuis l'appareil n° 1. */
    await api.opSocleSession(true);
    await api.opSoclePousser();

    /* ── Un SECOND appareil : base VIDE, stockage neuf, même espace. C'est le seul montage qui
       prouve que la lecture rend vraiment les données — relire depuis celui qui a écrit ne
       prouverait que la cohérence d'un appareil avec lui-même. */
    const stock2 = stockNeuf();
    const db2 = {};
    const api2 = new Function('fetch', 'localStorage', 'PUSH_API', 'sauvKh', 'syncDeviceId', 'syncDiagnostic',
      'APP_VERSION', 'currentUser', 'db', 'console', 'uid', 'AbortController', 'setTimeout', 'clearTimeout', 'Math',
      code + '\nreturn {opDecomposer,opRecomposer,opSignature,opSocleSession,opSoclePousser,opSoclePousserVraiment,opSocleControle,opSocleLire,opHautLire,opNonLire,opSeqLire,opRecensement,opRelecture,opAttester,opEmpreinte,opSansTampon,opIdDerive};')
      (compte, stock2, S.B, async () => ({ t: T, kh: sha(CLE) }), () => 'dev-banc-2',
       (motif) => diagnostics.push(motif), 703, { id: 'u-banc-2' }, db2,
       { log() {}, warn() {}, error() {} }, () => 'u' + Math.random(), AbortController, setTimeout, clearTimeout, Math);

    const lu = await api2.opSocleLire();
    vrai('⛔ le second appareil a LU quelque chose (le câblage de /depuis tient)', lu && lu.lues > 0);
    v('   sans aucune ligne illisible', lu && lu.illisibles, 0);
    vrai('⛔ et sa base porte maintenant les clients du premier', (db2.clients || []).length >= 2);
    vrai('   les interventions aussi', (db2.interventions || []).length >= 1);
    vrai('   et les produits', (db2.produits || []).length >= 1);

    /* ⛔ LA SIGNATURE EST LE SEUL JUGE. « Il y a des clients » ne dit pas que ce sont LES
       clients : un champ perdu, un `_m` faux, et la comparaison passerait quand même. */
    const sigA = api.opSignature(api.opDecomposer(db));
    const sigB = api2.opSignature(api2.opDecomposer(db2));
    v('⛔ les deux appareils portent des clients IDENTIQUES', sigB.par.clients, sigA.par.clients);
    v('   et des interventions identiques', sigB.par.interventions, sigA.par.interventions);

    const curseur = api2.opSeqLire(T);
    vrai('le curseur a avancé', curseur > 0);
    const depuisAvant = compte.combien('/api/op/depuis');
    const lu2 = await api2.opSocleLire();
    v('⛔ une seconde lecture ne rapporte RIEN de neuf', lu2 && lu2.lues, 0);
    v('   et le curseur n\'a pas bougé', api2.opSeqLire(T), curseur);
    vrai('   elle a tout de même demandé (une page vide, pas zéro appel)', compte.combien('/api/op/depuis') > depuisAvant);

    /* ══ ⛔ LE CONTRÔLE QUI PROTÈGE LE TRAVAIL D'UN TECHNICIEN ══════════════════════════════
       Mesuré le 20 septembre 2026 : `opRecomposer` appliquait TOUTE ligne sans regarder les
       dates. Un technicien qui modifie une fiche hors ligne, puis dont l'appareil lit le socle
       avant d'avoir poussé, perdait sa saisie — sans message et sans pierre tombale. */
    db2.clients[0].ville = 'MODIFIÉ-ICI'; db2.clients[0]._m = Date.now() + 60000;
    api2.opSeqPoser ? api2.opSeqPoser(T, 0) : stock2.setItem('elan_op_seq_' + T, '0');
    await api2.opSocleLire();
    v('⛔ une saisie locale PLUS RÉCENTE survit à une relecture complète', db2.clients[0].ville, 'MODIFIÉ-ICI');

    /* ⛔ ET RELIRE DEPUIS ZÉRO NE DOIT RIEN DOUBLER. `mailSent` et `planJournal` n'ont pas
       d'identité propre : `opRecomposer` faisait `push` sans regarder, donc une reprise depuis
       le curseur zéro doublait toute la correspondance envoyée. `opIdDerive` LEUR DONNE une
       identité stable — il suffisait de s'en servir. */
    /* ⛔ ET IL FAUT DES COLLECTIONS SANS IDENTITÉ PROPRE POUR QUE CE CONTRÔLE VEUILLE DIRE
       QUELQUE CHOSE. Retirer la garde ne cassait RIEN au premier jet : la base du banc n'avait
       ni `mailSent` ni `planJournal`, les deux SEULES collections classées `liste_ts`. Le banc
       gardait donc une ligne qu'il n'exerçait pas. C'est la question à se poser chaque fois
       qu'une mutation ne tombe pas : qu'est-ce que le banc ne joue PAS ? */
    /* ⚠️ DES `ts` RÉALISTES. Un `ts: 4242` est sous la borne haute (un horodatage courant), donc
       la ligne ne repasse jamais le filtre — et le banc accuserait le code d'un défaut qui
       n'existe pas. Ces collections portent des `Date.now()` dans la vraie vie. */
    const tsBase = api.opHautLire(T) + 1000;
    db.mailSent = [{ to: 'client@exemple.fr', ts: tsBase, sujet: 'Rapport' },
                   { to: 'autre@exemple.fr', ts: tsBase + 1, sujet: 'Devis' }];
    db.planJournal = [{ ts: tsBase + 2, txt: 'poste 12 relevé' }];
    await api.opSoclePousser();

    const compter = () => (db2.clients || []).length + (db2.interventions || []).length
      + (db2.produits || []).length + (db2.mailSent || []).length + (db2.planJournal || []).length;
    stock2.setItem('elan_op_seq_' + T, '0');
    await api2.opSocleLire();
    vrai('⛔ le second appareil reçoit les collections SANS identité propre', (db2.mailSent || []).length === 2);
    vrai('   et le journal de plan aussi', (db2.planJournal || []).length === 1);
    const avantN = compter();
    stock2.setItem('elan_op_seq_' + T, '0');
    await api2.opSocleLire();
    stock2.setItem('elan_op_seq_' + T, '0');
    await api2.opSocleLire();
    v('⛔ deux relectures depuis zéro n\'ajoutent AUCUN doublon', compter(), avantN);
    v('   `mailSent` en particulier, qui n\'a pas d\'identifiant à lui', (db2.mailSent || []).length, 2);
  }

  /* ══ (j bis) LA PAGINATION — ET POURQUOI LE CURSEUR N'EST PAS LE RANG ═════════════════════
     ⛔ CE BLOC EXISTE PARCE QU'UNE MUTATION N'A RIEN CASSÉ. Remplacer `j.curseur` par `j.seq`
     dans la boucle de lecture ne faisait tomber AUCUN des 89 contrôles — la base du banc
     tenait dans une seule page, où les deux valeurs sont égales. Or les deux ne disent pas la
     même chose : `seq` est le rang le plus haut de TOUTE la base, `curseur` est le rang de la
     dernière ligne que CETTE page a réellement servie. Dès qu'une page est tronquée (trop
     lourde, ou des lignes illisibles écartées), les poser l'un pour l'autre fait sauter tout
     ce que la page n'a pas rendu — définitivement, et sans un mot.
     Il faut donc une base qui PAGINE : le serveur sert 400 lignes au plus. */
  console.log('\n⛔ Étape 5 — la lecture PAGINE, et ne saute rien au passage');
  {
    const N = 900;
    const base = api.opHautLire(T) + 1000;
    db.clients = (db.clients || []).slice(0, 2);
    for (let i = 0; i < N; i++) db.clients.push({ id: 'pg' + i, nom: 'Paginé ' + i, ville: 'V' + i, _m: base + i });
    const pousse = await api.opSoclePousser();
    vrai('les 900 fiches sont poussées', pousse && pousse.envoyees >= N);

    const stock3 = stockNeuf(), db3 = {};
    const api3 = new Function('fetch', 'localStorage', 'PUSH_API', 'sauvKh', 'syncDeviceId', 'syncDiagnostic',
      'APP_VERSION', 'currentUser', 'db', 'console', 'uid', 'AbortController', 'setTimeout', 'clearTimeout', 'Math',
      code + '\nreturn {opDecomposer,opRecomposer,opSignature,opSocleSession,opSoclePousser,opSoclePousserVraiment,opSocleControle,opSocleLire,opHautLire,opNonLire,opSeqLire,opRecensement,opRelecture,opAttester,opEmpreinte,opSansTampon,opIdDerive};')
      (compte, stock3, S.B, async () => ({ t: T, kh: sha(CLE) }), () => 'dev-banc-3',
       (motif) => diagnostics.push(motif), 703, { id: 'u-banc-3' }, db3,
       { log() {}, warn() {}, error() {} }, () => 'u' + Math.random(), AbortController, setTimeout, clearTimeout, Math);

    const lu = await api3.opSocleLire();
    vrai('⛔ la lecture a demandé PLUSIEURS pages', lu && lu.pages > 1);
    /* ⛔ LE CONTRÔLE QUI ATTRAPE LA MUTATION : avec `j.seq` au lieu de `j.curseur`, le curseur
       saute au bout dès la première page et tout le reste est perdu. */
    /* ⚠️ ON COMPTE LES FICHES PAGINÉES, PAS TOUT `clients` — et c'est le banc qui avait tort
       la première fois. La contre-épreuve de la section (f) a poussé un « Client Trois » puis
       l'a retiré LOCALEMENT, sans pierre tombale : le serveur le détient toujours, donc un
       appareil neuf le reçoit légitimement. Comparer les deux totaux accusait le code d'une
       ligne en trop qui est, en réalité, exactement ce que le socle doit rendre. */
    const pagines = (db3.clients || []).filter(c => c && String(c.id).indexOf('pg') === 0);
    v('⛔ et le troisième appareil a TOUTES les fiches paginées', pagines.length, N);
    const manquantes = [];
    for (let i = 0; i < N; i++) if (!pagines.some(c => c.id === 'pg' + i)) manquantes.push(i);
    v('   aucune ne manque, et on saurait lesquelles', manquantes.slice(0, 5), []);
    /* Le contenu, pas seulement le compte : une fiche tronquée passerait le compte. */
    const abimees = pagines.filter(c => c.nom !== 'Paginé ' + String(c.id).slice(2) || !c._m);
    v('   et aucune n\'est abîmée', abimees.length, 0);
  }

  /* ══ (k) LES QUATRE CONDITIONS DE L'ÉTAPE 5, CALCULÉES ════════════════════════════════════
     ⛔ Le plan les écrit ; sans cette route elles resteraient une intention, et on basculerait
     « parce que ça avait l'air bon ». L'annexe disait de l'une d'elles qu'elle ne pouvait
     JAMAIS converger — c'est celle-là qu'on éprouve en premier. */
  console.log('\n⛔ Étape 5 — les conditions se CALCULENT, elles ne se récitent pas');
  {
    const p = await appel('GET', '/api/monitor/op/pret?t=' + encodeURIComponent(T), { jeton: JETON_TOUR });
    v('la route existe et répond', p.code, 200);
    const cond = (p.j && p.j.conditions) || {};
    vrai('elle rend les cinq conditions', !!(cond.a && cond.b && cond.c && cond.d && cond.ouvert));
    /* ⛔ (a) SANS JOURNAL DE CONNEXIONS, LE VERDICT EST « ON NE SAIT PAS », PAS « C'EST BON ».
       Le banc n'écrit aucune connexion : une liste vide ferait dire « aucun appareil en
       retard », donc « tu peux basculer », au moment exact où on ne sait rien. Ce dépôt a payé
       deux fois cette confusion. */
    v('⛔ (a) sans journal de connexions : on ne sait pas, donc NON', cond.a.ok, false);
    v('   et elle le DIT plutôt que de rendre zéro', cond.a.vusParLApi, null);
    vrai('   elle a tout de même vu les appareils du socle', cond.a.surLeSocle >= 1);
    /* (d) : le banc n'a pas sept jours de contrôles, donc elle doit être fausse — et dire
       pourquoi. Un « aucun échec » sur sept jours muets n'est pas un succès. */
    v('⛔ (d) sept jours muets ne valent pas sept jours identiques', cond.d.ok, false);
    /* ⚠️ LE MOTIF DÉPEND DE CE QUE LE BANC A DÉJÀ JOUÉ, et l'assertion a eu tort DEUX FOIS
       avant d'être écrite ainsi. La contre-épreuve de la section (f) a fait remonter un verdict
       EN ÉCHEC : le motif parle donc de divergence, pas de jours muets. Ce qu'il faut exiger
       n'est pas une phrase précise — c'est qu'il y en ait UNE, et qu'elle nomme une cause. */
    vrai('   et le motif nomme une cause, il ne se tait pas',
      /divergence|sans aucun contr|aucun verdict/.test(String(cond.d.pourquoi)));
    vrai('   la fenêtre est celle du plan : sept jours', cond.d.jours === 7);
    v('⛔ une seule fausse suffit : on ne bascule pas', p.j.pret, false);
    v('   la route dit où en est la lecture', p.j.lecture, 'socle');
    /* ⛔ ET LES CONDITIONS QUI SONT VRAIES DOIVENT L'ÊTRE. Un banc qui n'exige que des `false`
       passe au vert sur une route qui refuse tout — et « on ne bascule jamais » se lirait
       « les conditions marchent ». Mesuré : sans ces trois lignes, faire répondre `bloqué` à
       TOUS les espaces ne faisait tomber aucun contrôle. */
    v('⛔ (b) cet espace EST dans l\'annuaire', cond.b.ok, true);
    v('⛔ (c) et il n\'est pas sur la clé partagée', cond.c.ok, true);
    v('⛔ (ouvert) un espace actif n\'est ni fermé ni coupé', cond.ouvert.ok, true);
    v('   et elle le dit sans motif de blocage', cond.ouvert.pourquoi, '');

    /* ⛔ LE VERDICT DE CONTRÔLE ARRIVE-T-IL VRAIMENT ? C'est la seule source de (d), et c'est
       une couture appareil ↔ serveur de plus — donc exactement le genre d'endroit où les
       trois défauts de l'étape 4 se sont logés. */
    const avant = ((await appel('GET', '/api/monitor/op/pret?t=' + encodeURIComponent(T), { jeton: JETON_TOUR })).j || {}).conditions.d.verdictsGardes;
    await api.opSocleControle();
    const apres = ((await appel('GET', '/api/monitor/op/pret?t=' + encodeURIComponent(T), { jeton: JETON_TOUR })).j || {}).conditions.d.verdictsGardes;
    vrai('⛔ le verdict de contrôle de l\'appareil ARRIVE au serveur', apres > avant);
  }

  /* ══ (l) ÉTAPE 6 — LES INSTRUMENTS, SUR LE `/health` VIVANT ══════════════════════════════
     ⛔ L'étape 6 ne livre « rien » : elle REGARDE pendant une semaine. Ce qu'elle regarde doit
     donc EXISTER sur la vraie réponse du vrai serveur, pas dans un module. Et il faut que ce
     soit branché : `test-723` prouve que l'observatoire compte, ce banc-ci prouve que ce qu'il
     compte arrive jusqu'à `/health`, après un VRAI refus, par une VRAIE route. */
  console.log('\n⛔ Étape 6 — ce que le serveur publie pour la semaine d\'observation');
  {
    const sante = async () => { const r = await fetch(S.B + '/health'); return r.json(); };
    const h0 = await sante();
    vrai('le socle publie son bloc', !!(h0 && h0.socle && h0.socle.actif === true));
    vrai('⛔ et les trois instruments de l\'étape 6', !!(h0.socle.refus7j && h0.socle.divergences && h0.socle.latence));

    /* ⛔ UN REFUS RÉEL, PAR LA VRAIE ROUTE — pas un appel de fonction. C'est la seule façon de
       savoir que le compteur est BRANCHÉ sur le chemin qui refuse vraiment. */
    const avant = (h0.socle.refus7j || {}).horlogeAvancee || 0;
    const ses = await appel('POST', '/api/op/session', { corps: { t: T, kh: sha(CLE), app_id: '', nom: 'dev-mesure' } });
    vrai('une session s\'ouvre pour provoquer un vrai refus', !!(ses.j && ses.j.jeton));
    const rf = await appel('POST', '/api/op/pousser', { jeton: ses.j.jeton,
      corps: { enr: [{ c: 'clients', id: 'horloge-folle', m: Date.now() + 7200000, r: { id: 'horloge-folle' }, e: 'zz' }] } });
    v('⛔ le serveur refuse bien, et en 409 (un désaccord sur l\'heure)', rf.code, 409);
    const h1 = await sante();
    v('⛔ un refus réel arrive jusqu\'à `/health`, par motif', (h1.socle.refus7j || {}).horlogeAvancee, avant + 1);

    /* ⛔ ET IL SURVIT AU REDÉMARRAGE — c'est TOUT l'objet de l'étape 6. Le serveur redémarre à
       chaque déploiement ; un compteur qui s'oublie montre « zéro », ce qui se lit « tout va
       bien ». On ne peut pas le prouver en tuant CE serveur (le banc s'en sert encore), mais on
       peut exiger que le compteur ne vienne pas d'une `Map` : `refus`, lui, est remis à zéro au
       démarrage, alors que `refus7j` sort de l'annuaire. `test-723` joue le rechargement. */
    vrai('   et `refus` (depuis le démarrage) le voit aussi', ((h1.socle.refus || {}).horlogeAvancee || 0) >= 1);

    /* La latence : le banc vient de faire des dizaines d'appels, elle ne peut pas être vide. */
    vrai('⛔ la latence est mesurée sur les routes réelles', Object.keys(h1.socle.latence || {}).length > 0);
    const lp = h1.socle.latence.pousser || h1.socle.latence.session || Object.values(h1.socle.latence)[0];
    vrai('   avec un p50, un p95 et un max', lp && typeof lp.p50 === 'number' && typeof lp.p95 === 'number' && typeof lp.max === 'number');
    vrai('   et un nombre de mesures', lp && lp.n > 0);
    /* ⛔ LE LONG-POLL EST EXCLU, ET C'EST DÉLIBÉRÉ : il dort 25 secondes par construction.
       L'inclure noierait tous les quantiles sous une valeur qui ne dit rien d'une lenteur.
       ⚠️ ENCORE FAUT-IL L'APPELER : sans un vrai passage par `/api/op/flux`, l'exclure ou non
       ne change rien, et la mutation ne tombait pas. `depuis=0` sur une base non vide rend la
       main tout de suite (« déjà en retard »), donc ça ne coûte pas 25 secondes de banc. */
    const fx = await appel('GET', '/api/op/flux?depuis=0', { jeton: ses.j.jeton });
    v('le flux répond tout de suite quand l\'appareil est déjà en retard', fx.code, 200);
    const h1b = await sante();
    v('⛔ et il n\'empoisonne PAS les quantiles', (h1b.socle.latence || {}).flux, undefined);
    /* ⚠️ La lecture VIDE le réservoir : deux lectures rapprochées donnent la seconde presque
       vide, et ce n'est pas une panne. On le vérifie pour que personne ne la « répare ». */
    const h2 = await sante();
    vrai('   et une lecture vide le réservoir (fenêtre depuis la dernière lecture)',
      Object.keys(h2.socle.latence || {}).length <= Object.keys(h1b.socle.latence || {}).length);

    /* Les divergences : le banc a fait remonter un verdict en échec en section (f). */
    vrai('⛔ le compteur de divergences existe et compte des ESPACES', typeof h1.socle.divergences.espaces === 'number');
    vrai('   il distingue ceux qui ont divergé', typeof h1.socle.divergences.avecEcart === 'number');
    vrai('   et ceux dont on ne sait RIEN (muets)', typeof h1.socle.divergences.muets === 'number');
    /* ⛔ `/health` EST PUBLIQUE : aucun nom d'espace ne doit s'y trouver. C'est la règle du
       dépôt, et un compteur neuf est exactement l'occasion de la casser. */
    v('⛔ aucun identifiant d\'espace dans /health', new RegExp(T).test(JSON.stringify(h1)), false);
    v('   ni le slug', new RegExp(SLUG).test(JSON.stringify(h1)), false);
  }

  /* ══ (m) L'IMPAYÉ — UNE ENTREPRISE SUSPENDUE TRAVAILLE ═══════════════════════════════════
     ⛔ DÉCISION DE JUSTIN, 20 SEPTEMBRE 2026 : « pour continuer à lire, ils auront un délai de
     7 jours. Si c'est pas payé après, tous les onglets deviennent gris […] Aucune sauvegarde
     n'est perdue, aucune tâche qu'ils étaient en train de faire, rien n'est perdu, même dans
     leur catégorie. Juste les catégories payantes deviennent grisées et ils reviennent au
     forfait gratuit. »
     Conséquence pour le socle : c'est l'ABONNEMENT qui change, pas l'accès aux données. Une
     entreprise suspendue ouvre sa session, lit et écrit comme avant. Ce qui grise est une
     affaire d'écrans, pas de stockage.
     ⚠️ Le jour où le socle est la seule copie à jour, confondre « suspendu » et « fermé »
     couperait un impayé de ses propres données — en contradiction directe avec
     `mentions-legales.html:74`. On passe par la VRAIE route de la Tour, pas par un fichier
     fabriqué : c'est le chemin que Justin emprunte. */
  console.log('\n⛔ Une entreprise SUSPENDUE pour impayé garde ses données');
  {
    /* ⚠️ LA ROUTE PREND UN SLUG, PAS UN `t` — et le banc l'a appris en passant au vert POUR LA
       MAUVAISE RAISON : avec `{t}`, elle rend 404, l'espace n'était jamais suspendu, et les six
       contrôles suivants « réussissaient » sur un espace parfaitement actif. Un banc qui ne
       vérifie pas que sa MISE EN SCÈNE a eu lieu ne teste rien. */
    const sus = await appel('POST', '/api/monitor/espaces/suspendre', { jeton: JETON_TOUR, corps: { slug: SLUG } });
    v('la Tour suspend l\'espace', sus.code, 200);
    /* ⛔ ET ON CONSTATE LA SUSPENSION AVANT D'EN TIRER QUOI QUE CE SOIT : une route qui refuse
       la sauvegarde est la preuve que l'espace est bien dans `entFermes`. Sans elle, tout ce
       bloc reste une mise en scène qu'on n'a pas jouée. */
    const preuve = await appel('POST', '/api/espaces/sauvegardes', { corps: { t: T, kh: sha(CLE) } });
    v('⛔ et la suspension est RÉELLE : la sauvegarde, elle, refuse', preuve.code, 403);
    const ses = await appel('POST', '/api/op/session', { corps: { t: T, kh: sha(CLE), app_id: '', nom: 'dev-impaye' } });
    v('⛔ elle ouvre quand même sa session de socle', ses.code, 200);
    vrai('   avec un vrai jeton', !!(ses.j && ses.j.jeton));
    const lu = await appel('GET', '/api/op/depuis?seq=0&max=5', { jeton: ses.j && ses.j.jeton });
    v('⛔ elle LIT ses données', lu.code, 200);
    vrai('   et elles sont bien là', !!(lu.j && Array.isArray(lu.j.enr) && lu.j.enr.length));
    const ecr = await appel('POST', '/api/op/pousser', { jeton: ses.j && ses.j.jeton,
      corps: { enr: [{ c: 'clients', id: 'pendant-impaye', m: Date.now(), r: { id: 'pendant-impaye', nom: 'X' }, e: 'qq' }] } });
    v('⛔ et elle ÉCRIT encore — rien n\'est perdu, aucune tâche en cours', ecr.code, 200);
    vrai('   l\'écriture est acceptée', !!(ecr.j && ecr.j.acceptes));

    /* ⛔ ET LA TOUR NE DOIT PAS LA VOIR COMME BLOQUÉE. C'est le seul endroit où la distinction
       « suspendu » / « fermé » se lit vraiment : sur un espace ACTIF, `espaceBloque` sort avant
       même de l'examiner. Mesuré : sans ce contrôle, remplacer tout son corps par `return true`
       ne faisait tomber AUCUN des 124 contrôles — le banc gardait une ligne qu'il n'exerçait
       jamais. Une entreprise suspendue continue de pousser, donc son socle reste frais, donc
       elle n'a aucune raison d'être écartée de la bascule. */
    const pr = await appel('GET', '/api/monitor/op/pret?t=' + encodeURIComponent(T), { jeton: JETON_TOUR });
    v('⛔ un espace SUSPENDU n\'est pas « bloqué » pour la Tour', pr.j.conditions.ouvert.ok, true);
    v('   et aucun motif de blocage n\'est avancé', pr.j.conditions.ouvert.pourquoi, '');
    v('   la Tour le voit bien comme non bloqué par l\'annuaire', pr.j.conditions.ouvert.bloqueParLAnnuaire, false);

    /* ⛔ MAIS UN ESPACE VRAIMENT FERMÉ RESTE REFUSÉ. Sans ce contre-test, « on laisse passer
       les suspendus » se lirait « on laisse passer tout le monde », et la garde ne garderait
       plus rien. Une fermeture définitive ne passe PAS par `suspendre` : on la joue en
       rouvrant d'abord, puis en fermant par la porte de l'entreprise. */
    await appel('POST', '/api/monitor/espaces/suspendre', { jeton: JETON_TOUR, corps: { slug: SLUG, rouvrir: true } });
    const ok = await appel('POST', '/api/op/session', { corps: { t: T, kh: sha(CLE), app_id: '', nom: 'dev-rouvert' } });
    v('rouvrir remet tout en place', ok.code, 200);
  }

  /* ══ (n) ÉTAPE 7 — LA RELECTURE, CONTRE LA PHOTO PRISE AVANT ═════════════════════════════
     ⛔ LE PIÈGE DE CIRCULARITÉ EST TOUT LE SUJET. Depuis l'étape 5, le `db` de l'appareil EST la
     recomposition du VPS : comparer `db` au VPS, c'est comparer le VPS à lui-même, et ça passe
     TOUJOURS. Ce banc doit donc prouver deux choses opposées — que la relecture dit « tout va
     bien » quand tout va bien, ET qu'elle CRIE quand il manque quelque chose. La seconde est la
     seule qui ait de la valeur : un contrôle qui ne sait pas échouer ne contrôle rien. */
  console.log('\n⛔ Étape 7 — la relecture contre la photo, et sa contre-épreuve');
  {
    /* ⛔ ON COMPTE DES PIÈCES, PAS DES LIGNES. Un décompte d'enregistrements ne peut pas voir
       disparaître le CONTENU d'un enregistrement : l'intervention est là, il lui manque ses
       deux signatures et ses six photos. */
    const avecPieces = {
      interventions: [
        { id: 'ri1', num: 'INT-R1', photos: ['piece:' + 'a'.repeat(64), 'piece:' + 'b'.repeat(64)],
          docs: [{ nom: 'rapport', data: 'xx' }, { nom: 'vide' }],
          signatureClient: 'sig-c', signatureTech: 'sig-t', _m: 1 },
        { id: 'ri2', num: 'INT-R2', photos: [], docs: [], _m: 1 },
      ],
    };
    const rec = api.opRecensement(avecPieces);
    v('⛔ deux photos comptées', rec.photos, 2);
    v('⛔ un document avec contenu, pas celui qui est vide', rec.docs, 1);
    v('⛔ et les deux signatures', rec.signatures, 2);
    v('   soit cinq pièces au total', rec.total, 5);
    v('   rangées par collection', rec.par.interventions, 5);
    /* ⚠️ La liste des champs de signature n'est PAS figée : elle vieillirait à la première
       signature ajoutée. Tout champ qui COMMENCE par `signature` compte. */
    const rec2 = api.opRecensement({ interventions: [{ id: 'x', signatureDR: 'oui', _m: 1 }] });
    v('⛔ un champ de signature INCONNU compte aussi', rec2.signatures, 1);
    v('   mais un champ vide ne compte pas', api.opRecensement({ interventions: [{ id: 'y', signatureDR: '', _m: 1 }] }).signatures, 0);

    /* ══ LA RELECTURE, SUR LE VRAI SERVEUR ═════════════════════════════════════════════════ */
    await appel('POST', '/api/monitor/op/lecture', { jeton: JETON_TOUR, corps: { t: T, source: 'socle' } });
    await api.opSocleSession(true);
    await api.opSoclePousser();

    /* La photo : on la fabrique à la main, parce que `opPhotoPrendre` passe par IndexedDB, qui
       n'existe pas ici. C'est la MÊME structure, produite par les mêmes fonctions. */
    const photoDe = (base) => ({ t: T, ts: Date.now(), ver: '703', dev: 'dev-banc-1',
      sig: api.opSignature(api.opDecomposer(base)).sig,
      recens: api.opRecensement(base), json: JSON.stringify(base) });

    const bonne = photoDe(db);
    const r1 = await api.opRelecture(bonne);
    v('⛔ la relecture ne rend AUCUNE erreur', r1.erreur, undefined);
    v('⛔ et elle dit que tout est là', r1.ok, true);
    v('   aucun enregistrement manquant', r1.nManquants, 0);
    v('   aucun différent', r1.nDifferents, 0);
    v('   aucune pièce perdue', r1.piecesPerdues, 0);
    vrai('   et l\'appareil a ATTESTÉ dans la foulée', r1.attestee === true);

    /* ⛔⛔ LA CONTRE-ÉPREUVE, ET C'EST ELLE QUI COMPTE. Un contrôle qui ne sait pas échouer ne
       contrôle rien — et c'est exactement ce qu'aurait donné une comparaison de `db` au VPS.
       On fabrique une photo qui contient PLUS que ce que le socle détient : c'est très
       précisément la forme qu'aurait une perte de données. */
    const avecEnPlus = JSON.parse(JSON.stringify(db));
    avecEnPlus.clients.push({ id: 'jamais-pousse', nom: 'Fiche perdue', ville: 'Niort', _m: 1 });
    const r2 = await api.opRelecture(photoDe(avecEnPlus));
    v('⛔ une fiche que le socle n\'a PAS est vue comme manquante', r2.ok, false);
    v('   et elle est NOMMÉE', (r2.manquants[0] || {}).id, 'jamais-pousse');
    v('   avec sa collection', (r2.manquants[0] || {}).coll, 'clients');

    /* ⛔ ET UNE FICHE PRÉSENTE MAIS AMPUTÉE. C'est le cas que le comptage de lignes ne peut pas
       voir : l'intervention est là, le compte tombe juste, et ses signatures ont disparu. */
    const ampute = JSON.parse(JSON.stringify(db));
    ampute.clients[0].ville = 'UNE-AUTRE-VILLE';
    const r3 = await api.opRelecture(photoDe(ampute));
    v('⛔ une fiche PRÉSENTE mais différente est vue', r3.ok, false);
    v('   aucune n\'est déclarée manquante', r3.nManquants, 0);
    vrai('   mais elle est comptée comme DIFFÉRENTE', r3.nDifferents >= 1);

    const piecesEnMoins = JSON.parse(JSON.stringify(db));
    piecesEnMoins.interventions[0].signatureClient = 'une-signature-qui-existait';
    const r4 = await api.opRelecture(photoDe(piecesEnMoins));
    v('⛔ une PIÈCE perdue est vue, même si l\'enregistrement est là', r4.piecesPerdues, 1);
    v('   et la collection est nommée', r4.piecesPar.interventions, 1);
    v('   le verdict tombe', r4.ok, false);

    /* ⛔ UNE PHOTO QUI A CHANGÉ NE PROUVE RIEN. Si on peut la retoucher après coup, la
       relecture compare le socle à autre chose que ce qui existait — et rend un verdict qui ne
       veut rien dire. */
    const trafiquee = photoDe(db);
    const dedans = JSON.parse(trafiquee.json);
    dedans.clients.push({ id: 'ajoutee-apres', nom: 'X', _m: 1 });
    trafiquee.json = JSON.stringify(dedans);
    const r5 = await api.opRelecture(trafiquee);
    vrai('⛔ une photo retouchée est REFUSÉE, pas comparée', /a chang/.test(String(r5.erreur)));

    /* ⛔ ET SANS PHOTO, ON NE DIT PAS « TOUT VA BIEN ». C'est le pire verdict possible : il
       ferme la porte sur rien. */
    const r6 = await api.opRelecture({ t: T, ts: 0, sig: '', json: '' });
    vrai('⛔ sans photo, la relecture REFUSE de conclure', /aucune photo/.test(String(r6.erreur)));
    v('   et elle ne prétend pas que tout va bien', r6.ok, undefined);
  }

  /* ══ (o) LES ATTESTATIONS — LA TOUR NOMME LES MANQUANTS ══════════════════════════════════ */
  console.log('\n⛔ Étape 7 — la Tour nomme les appareils qui n\'ont pas attesté');
  {
    const etat = async () => (await appel('GET', '/api/monitor/op/attestations?t=' + encodeURIComponent(T), { jeton: JETON_TOUR })).j;
    const e1 = await etat();
    vrai('la Tour lit les attestations', !!e1 && typeof e1.appareils === 'number');
    vrai('⛔ et elle voit celle qui vient d\'être déposée', e1.attestations.some(a => a.dev === 'dev-banc-1'));
    /* ⛔ LE CONTRÔLE QUI COMPTE : on ne ferme pas sur « 1 sur 3 », on ferme sur QUI manque. */
    vrai('⛔ elle NOMME les appareils qui n\'ont pas attesté', Array.isArray(e1.manquants));
    vrai('   et il en manque, puisque trois appareils ont ouvert une session', e1.manquants.length >= 1);
    v('⛔ donc ce n\'est PAS complet', e1.complet, false);

    /* ⛔ ATTESTER NE SUFFIT PAS : une attestation qui dit « j'ai relu et il manque 12 fiches »
       est un ÉCHEC, pas une case cochée. Sans ça, « tout le monde a attesté » se lirait « tout
       va bien » alors que tout le monde signale un manque. */
    /* ⛔ UNE ATTESTATION PAR APPAREIL, LA DERNIÈRE ÉCRASE — et c'est le banc qui s'est trompé
       la première fois en attendant un cumul. Ce qu'on veut savoir est « cet appareil a-t-il
       attesté, et que disait-il la DERNIÈRE fois », pas l'historique : un appareil qui relit
       une seconde fois après un correctif ne doit pas traîner son ancien échec. */
    const ses2 = await appel('POST', '/api/op/session', { corps: { t: T, kh: sha(CLE), app_id: '', nom: 'dev-second' } });
    const avant = (await etat()).enEchec;
    const nAvant = (await etat()).attestations.length;
    await appel('POST', '/api/op/atteste', { jeton: ses2.j.jeton,
      corps: { dev: 'dev-second', ver: '703', photoTs: Date.now(), photoSig: 'zz', pieces: 3,
        relu: { ok: false, manquants: 2, piecesPerdues: 12 } } });
    const e2 = await etat();
    v('⛔ un SECOND appareil en échec fait monter le compte', e2.enEchec, avant + 1);
    v('   et il ajoute bien une attestation', e2.attestations.length, nAvant + 1);
    v('   qui empêche le « complet »', e2.complet, false);

    /* ⛔ ET LE MÊME APPAREIL QUI RE-ATTESTE REMPLACE, IL N'AJOUTE PAS. Sans ça, un appareil qui
       relit dix fois pèserait dix fois dans le compte — et « 12 appareils sur 9 » ne veut rien
       dire. */
    await appel('POST', '/api/op/atteste', { jeton: ses2.j.jeton,
      corps: { dev: 'dev-second', ver: '703', photoTs: Date.now(), photoSig: 'yy', pieces: 3,
        relu: { ok: true, manquants: 0, piecesPerdues: 0 } } });
    const e3 = await etat();
    v('⛔ re-attester REMPLACE, ça n\'ajoute pas', e3.attestations.length, nAvant + 1);
    v('   et l\'échec précédent de CET appareil ne traîne plus', e3.enEchec, avant);
    /* ⚠️ Une attestation ne porte que des nombres — jamais un contenu. */
    v('⛔ aucune donnée de client dans les attestations',
      /Niort|Client |La Rochelle/.test(JSON.stringify(e2.attestations)), false);
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
    /* ⛔ L'INVARIANT EST « ELLE NE JETTE PAS ET N'INVENTE RIEN », PAS « ELLE REND null ».
       L'assertion précédente exigeait `null` et c'est le BANC qui avait tort : quand il n'y a
       rien à envoyer, la pousse n'a aucune raison de toucher au réseau — elle rend
       `{envoyees:0}` sans même s'apercevoir que le serveur est mort. C'est le bon comportement,
       et le confondre avec un échec aurait fait « corriger » du code juste. */
    v('⛔ la pousse ne JETTE pas quand le serveur est injoignable', jete, null);
    v('   et elle n\'annonce AUCUN envoi', (r && r.envoyees) || 0, 0);
    let jete2 = null, c = null;
    try { c = await api.opSocleControle(); } catch (e) { jete2 = String(e && e.message); }
    v('⛔ le contrôle non plus', jete2, null);
    v('   il rend null', c, null);
    let jete3 = null, l = null;
    try { l = await api.opSocleLire(); } catch (e) { jete3 = String(e && e.message); }
    v('⛔ ni la LECTURE — sans quoi un VPS en panne casserait l\'écran d\'un client', jete3, null);
    v('   et elle n\'a RIEN lu', (l && l.lues) || 0, 0);
    v('   ni inventé de page', (l && l.pages) || 0, 0);
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
