/* ⛔ CE QUE CE FICHIER GARDE — LES CATÉGORIES D'OP GESTION, CÔTÉ TOUR : LES VRAIES FONCTIONS DE LA TOUR CONTRE LE VRAI SERVEUR (Tour, 22 octobre 2026).

   Justin : « quand on crée un accès client, dans la Tour on choisit les catégories dont ils ont besoin et pas besoin ».
   `test-2870` tient le serveur seul ; ici on tient la COUTURE de la Tour avec lui — celle que les deux moitiés, justes chacune de
   son côté, peuvent rater (la leçon de `test-848`) :
     1. TROIS listes, UNE vérité : `CATS_OK` (serveur), `CAT_L` (Tour : clés, libellés, groupes) et `NAV` (app.html). Une rubrique
        ajoutée un jour à `NAV` sans être cochable (ni déclarée « toujours ouverte ») fait TOMBER ce banc, au lieu d'échapper au
        réglage sans un mot ;
     2. le bloc de la fiche (le vrai gabarit) : une case par rubrique, les boutons pour le patron seul ;
     3. les VRAIES `tourPackPrefill`, `packPeindre`, `tourCatsEnregistrer`, `tourCatsRouvrir` : cocher → enregistrer → la fiche
        relit la même liste ; « Tout rouvrir » ; tout coché = rien de restreint ; rien de coché = rien d'envoyé ;
     4. un refus du serveur SE DIT à l'écran (`#cats-msg`) — et la réussite suivante l'efface (« un refus ne survit pas à la
        réussite qui le dément ») ; un serveur injoignable aussi ; un serveur d'avant aussi ;
     5. le rappel « Choisis ses catégories dans sa fiche » après une acceptation de demande (la vraie `tourAccepterDemande`) et
        après l'ouverture d'un accès public (la vraie `pbCreer`), et le chemin qui mène à la fiche (`tourCatsAller`).
   Rien ne sort d'ici : 127.0.0.1, des entreprises fictives. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const lire = (env, f) => fs.readFileSync(process.env[env] ? path.resolve(process.env[env]) : path.join(RACINE, f), 'utf8');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
const APP = lire('APP_FICHIER', 'app.html'), TOUR = lire('TOUR_FICHIER', 'tour.html');
const SRV = fs.readFileSync(SERVEUR, 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2871-'));
let enfant = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

/* le code sans ses commentaires (ceux qui COMMENCENT une ligne) — un motif ou une fonction se cherche dans le code, jamais dans une phrase */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const APPN = nu(APP), TOURN = nu(TOUR), SRVN = nu(SRV);
/* Une fonction du fichier, ancrée sur sa DÉCLARATION, bornée par ses accolades (chaînes, gabarits, commentaires et expressions
   régulières sautés) — la même que `test-848`. */
function fonction(src, nom) {
  const m = new RegExp('(^|\\n)[ \\t]*(?:async )?function ' + nom + '\\(').exec(src); if (!m) return '';
  const d0 = src.indexOf('function ' + nom + '(', m.index) - (/async function/.test(m[0]) ? 6 : 0);
  let k = src.indexOf('{', src.indexOf(')', d0)), prof = 0, q = null;
  for (; k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && src[k + 1] === '/') { const n = src.indexOf('\n', k); k = n < 0 ? src.length : n; continue; }
    if (c === '/' && src[k + 1] === '*') { const n = src.indexOf('*/', k + 2); k = n < 0 ? src.length : n + 1; continue; }
    if (c === '/' && /(?:[(,=:[!&|?{};]|\breturn|\btypeof)\s*$/.test(src.slice(Math.max(0, k - 12), k))) {
      let cls = false;
      for (k++; k < src.length; k++) {
        const d = src[k];
        if (d === '\\') { k++; continue; }
        if (d === '\n') break;
        if (cls) { if (d === ']') cls = false; continue; }
        if (d === '[') { cls = true; continue; }
        if (d === '/') break;
      }
      continue;
    }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return src.slice(d0, k + 1);
}
function litteral(src, debut) {
  const d0 = src.indexOf(debut); if (d0 < 0) return '';
  const o = src.indexOf(debut.trim().slice(-1) === '[' ? '[' : '{', d0 + debut.length - 1);
  const ouv = src[o], ferm = ouv === '[' ? ']' : '}';
  let prof = 0, q = null, k = o;
  for (; k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === ouv) prof++; else if (c === ferm) { prof--; if (!prof) break; }
  }
  return src.slice(o, k + 1);
}
const evalue = txt => vm.runInNewContext('(' + txt + ')');

console.log('\n── 2871 · les catégories d\'OP GESTION : la Tour et le serveur se parlent ──');
(async () => {
  /* ══ 1. TROIS LISTES, UNE VÉRITÉ ══ */
  console.log('\n1. `CATS_OK` (serveur), `CAT_L` (Tour) et `NAV` (app.html) disent la même chose');
  const iok = SRVN.indexOf('const CATS_OK = ['), itj = SRVN.indexOf('const CATS_TOUJOURS = [');
  const CATS_OK = iok < 0 ? null : evalue(litteral(SRVN, 'const CATS_OK = ['));
  const TOUJOURS = itj < 0 ? null : evalue(litteral(SRVN, 'const CATS_TOUJOURS = ['));
  const NAV = evalue(litteral(APPN, 'const NAV = ['));
  const CAT_L = evalue(litteral(TOURN, 'var CAT_L=['));
  vrai('(population) CATS_OK, les rubriques toujours ouvertes, NAV (10 groupes) et CAT_L (10 groupes) sont lus dans le CODE des trois fichiers',
    Array.isArray(CATS_OK) && Array.isArray(TOUJOURS) && Array.isArray(NAV) && NAV.length === 10 && Array.isArray(CAT_L) && CAT_L.length === 10,
    JSON.stringify([CATS_OK && CATS_OK.length, TOUJOURS, NAV && NAV.length, CAT_L && CAT_L.length]));
  const clesNav = NAV.flatMap(g => g.items.map(i => i.k));
  vrai('(population) NAV porte une quarantaine de rubriques (' + clesNav.length + ') — sinon « tout est couvert » ne prouverait rien', clesNav.length >= 40, clesNav.length);
  const union = CATS_OK.concat(TOUJOURS);
  v('⛔ toute rubrique de NAV est cochable ou déclarée « toujours ouverte » : une rubrique ajoutée au menu sans décision FAIT TOMBER ce banc', clesNav.filter(k => !union.includes(k)), []);
  v('⛔ toute rubrique cochable existe dans NAV (une clé qui ne vise rien serait une case morte)', CATS_OK.filter(k => !clesNav.includes(k)), []);
  v('   la seule clé « toujours ouverte » qui n\'est pas au menu est `parametres` (l\'écran des réglages, hors NAV)', TOUJOURS.filter(k => !clesNav.includes(k)), ['parametres']);
  v('   et l\'union est exactement NAV + paramètres : rien de plus, rien de moins', union.slice().sort(), clesNav.concat(['parametres']).sort());
  v('⛔ aucune rubrique n\'est à la fois cochable et toujours ouverte', CATS_OK.filter(k => TOUJOURS.includes(k)), []);
  const clesTour = CAT_L.flatMap(g => g[1].map(c => c[0]));
  v('⛔ la Tour propose exactement les rubriques cochables du serveur, dans le même ordre (CAT_L = CATS_OK)', clesTour, CATS_OK);
  const grpNav = NAV.map(g => ({ g: g.g, items: g.items.filter(i => CATS_OK.includes(i.k)).map(i => [i.k, i.l]) })).filter(g => g.items.length);
  v('⛔ les groupes de la Tour sont ceux du menu (même titre, même ordre, mêmes rubriques dans chaque groupe) — « Tableau de bord » sans sa rubrique toujours ouverte',
    CAT_L.map(g => [g[0], g[1].map(c => c[0])]), grpNav.map(g => [g.g, g.items.map(i => i[0])]));
  /* la bêta précède le public sur un libellé (« Validation des mouvements ») : l'écart est DÉCLARÉ dans tests/beta-en-avance.js, et seulement là */
  const BETA = require('./beta-en-avance.js');
  v('⛔ les libellés de la Tour sont ceux du menu de l\'application, rubrique par rubrique — à l\'écart DÉCLARÉ près (la bêta précède le public)', CAT_L.flatMap(g => g[1]), grpNav.flatMap(g => g.items.map(i => [i[0], BETA.libellePublic(i[0], i[1])])));
  v('⛔ la déclaration d\'avance de la bêta est VRAIE côté libellés (app.html porte le libellé déclaré, la Tour le libellé public)',
    BETA.mensongesLibelles(Object.fromEntries(clesNav.map(k => [k, { l: (grpNav.flatMap(g => g.items).find(i => i[0] === k) || [])[1] }])), Object.fromEntries(CAT_L.flatMap(g => g[1]))), []);
  vrai('   (population) le serveur et la Tour construisent leur liste de clés de la même façon : `CAT_CLES` suit `CAT_L`',
    /^var CAT_CLES=\[\]; CAT_L\.forEach\(function\(g\)\{ g\[1\]\.forEach\(function\(c\)\{ CAT_CLES\.push\(c\[0\]\); \}\); \}\);$/m.test(TOURN));

  /* ══ 2. LE BLOC DE LA FICHE (le vrai gabarit) ══ */
  console.log('\n2. Le bloc « Catégories d\'OP GESTION » de la fiche (le vrai gabarit, joué pour un patron et pour un collaborateur)');
  const iPart = TOURN.indexOf('parts.cats=(function(){'), fPart = iPart < 0 ? -1 : TOURN.indexOf('})();', iPart);
  vrai('(population) le gabarit du bloc est trouvé dans le code de la Tour', iPart > 0 && fPart > iPart);
  const gabarit = (role) => { const ctx = { CATS_APPLIQUEES: false, MYROLE: role, CAT_L, catExpl: () => '', nm: 'plombier-banc', esc: s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'), jsq: s => String(s), parts: {} };
    vm.createContext(ctx); vm.runInContext(TOURN.slice(iPart, fPart + 5), ctx); return ctx.parts.cats; };
  const hp = gabarit('patron'), hc = gabarit('collaborateur');
  v('⛔ une case par rubrique cochable, chacune avec son identifiant `cat-<clé>` (c\'est ce que la fiche peint et lit)', CATS_OK.filter(k => !hp.includes('id="cat-' + k + '"')), []);
  v('   … et rien de plus : ' + CATS_OK.length + ' cases exactement', (hp.match(/type="checkbox"/g) || []).length, CATS_OK.length);
  v('   les quatre rubriques toujours ouvertes n\'ont PAS de case', TOUJOURS.filter(k => hp.includes('id="cat-' + k + '"')), []);
  vrai('   les dix groupes sont titrés, et « Absences & congés » s\'écrit sans casser le HTML', CAT_L.every(g => hp.includes('<div class="cats-gt">' + g[0].replace(/&/g, '&amp;') + '</div>')) && hp.includes('Absences &amp; congés'));
  vrai('⛔ le patron a les deux boutons (« Enregistrer les catégories », « Tout rouvrir »), liés aux fonctions de la Tour', /tourCatsEnregistrer\('plombier-banc',this\)[^>]*>💾 Enregistrer les catégories/.test(hp) && /tourCatsRouvrir\('plombier-banc',this\)[^>]*>Tout rouvrir/.test(hp));
  v('⛔ un collaborateur lit les cases (désactivées) et n\'a AUCUN bouton d\'écriture', [(hc.match(/ disabled>/g) || []).length, /tourCats(Enregistrer|Rouvrir)/.test(hc), /Réservé au patron/.test(hc)], [CATS_OK.length, false, true]);
  vrai('   le bloc dit que le prix ne bouge pas, et que le tableau de bord, les utilisateurs, les modules OP et les paramètres restent ouverts',
    /ne change pas le prix/.test(hp) && /tableau de bord, les utilisateurs, les modules OP et les paramètres restent toujours ouverts/.test(hp));
  vrai('   le bloc porte son info, son message d\'erreur lisible par un lecteur d\'écran, et son ancre (`cats-bloc`) pour le rappel',
    /id="cats-info"/.test(hp) && /id="cats-msg"[^>]*aria-live="polite"/.test(hp) && /id="cats-bloc"/.test(hp));
  vrai('   la fiche range ce bloc avec le métier, dans « Son espace » (la couture avec `ficheEntreprise`)', /blocEspaceDe\(o\)\+\(g\?g\.metier\+g\.cats:''\)/.test(TOURN));

  /* ══ 3. LES VRAIES FONCTIONS DE LA TOUR CONTRE LE VRAI SERVEUR ══ */
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const MAINT = Date.now();
  const cle = nom => String(nom).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const code = (t, nom) => Buffer.from(JSON.stringify({ t, k: 'k-' + t + '-' + 'x'.repeat(24), a: 'paul', n: nom }), 'utf8').toString('base64').replace(/=+$/, '');
  const paye = { formule: 'pro', quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Banc', aboStatut: 'actif', aboPar: 'Banc', aboTs: MAINT - 1000 };
  const T_PLO = 't-plo-2871';
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    [cle('plombier-banc')]: Object.assign({ t: T_PLO, nom: 'plombier-banc', email: 'plo@exemple-2871.fr', ts: MAINT - 1000, code: code(T_PLO, 'plombier-banc') }, paye) }));
  const MDP = 'mot-de-passe-2871';
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP), comptes: { actif: true } }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: Date.now() }] }));
  const PORT = 9300 + (process.pid % 90), B = 'http://127.0.0.1:' + PORT;
  let journal = '';
  enfant = spawn(process.execPath, [SERVEUR], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre, isolé', vivant, journal.slice(0, 600));
  if (!vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: corps === undefined ? 'GET' : 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  const etat = async () => (await appel('/api/espaces/etat', { t: T_PLO })).j;
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  await appel('/api/monitor/users', { nom: 'Collab', pass: 'Collab-2871-secret' }, PATRON);
  const COLLAB = (await appel('/api/monitor/login', { nom: 'Collab', pass: 'Collab-2871-secret' })).j.token;
  vrai('(population) le patron et un collaborateur ont une session', typeof PATRON === 'string' && PATRON.length > 10 && typeof COLLAB === 'string' && COLLAB.length > 10);

  console.log('\n3. Cocher → enregistrer → la fiche relit la même liste (vraies `tourPackPrefill`, `packPeindre`, `tourCatsEnregistrer`, `tourCatsRouvrir`)');
  const NOMS = ['hAuth', 'apiPost', 'tourPackPrefill', 'packPeindre', 'catsDire', 'catsChoisies', 'catsEnvoyer', 'tourCatsEnregistrer', 'tourCatsRouvrir', 'metDemande', 'catsEffet'];
  const FN = NOMS.map(n => fonction(TOURN, n));
  const ligneCle = (/^var CAT_CLES=\[\]; CAT_L\.forEach[^\n]*$/m.exec(TOURN) || [''])[0];
  vrai('(population) les fonctions de la Tour et la construction de CAT_CLES sont trouvées dans le code', FN.every(Boolean) && !!ligneCle, NOMS.filter((n, i) => !FN[i]).join(', '));
  const ecran = (role, jeton, opts) => {
    opts = opts || {};
    const toasts = [], posts = [];
    const el = { 'pack-info': { innerHTML: '', textContent: '' }, 'cats-info': { innerHTML: '' }, 'cats-msg': { innerHTML: '' } };
    CATS_OK.forEach(k => { el['cat-' + k] = { checked: true, disabled: false }; });
    const boutons = { enr: { disabled: false, textContent: '💾 Enregistrer les catégories' }, rou: { disabled: false, textContent: 'Tout rouvrir' } };
    const fetchEnreg = async (u, o) => { if (o && o.method === 'POST') posts.push({ u: String(u).replace(B, ''), b: JSON.parse(o.body) }); if (opts.coupe) throw new Error('réseau coupé'); return fetch(u, o); };
    const ctx = { fetch: fetchEnreg, JSON, Object, Array, String, Math, Date, Promise, parseInt, setTimeout, console,
      document: { getElementById: id => el[id] || null }, toast: t => toasts.push(String(t)), esc: s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;'),
      CLI: { list: [], sel: '' }, MET_L: {}, ST: {}, ABN_F: {}, abnEcart: () => '', optsPeindre: () => {} };
    vm.createContext(ctx);
    vm.runInContext('var API=' + JSON.stringify(B) + ', TOKEN=' + JSON.stringify(jeton) + ', MYROLE=' + JSON.stringify(role) + '; var PACK={nom:"",charge:false,err:"",d:null}; var CATS_APPLIQUEES=false;\nvar CAT_L=' + JSON.stringify(CAT_L) + ';\n' + ligneCle + '\n' + FN.join('\n'), ctx);
    const attendre = async (cond) => { for (let i = 0; i < 100; i++) { if (cond()) return true; await dormir(50); } return false; };
    const charge = async (nom) => { ctx.tourPackPrefill(nom); return attendre(() => vm.runInContext('PACK.charge', ctx)); };
    const coche = liste => CATS_OK.forEach(k => { el['cat-' + k].checked = liste.includes(k); });
    const cochees = () => CATS_OK.filter(k => el['cat-' + k].checked);
    return { ctx, el, toasts, posts, boutons, charge, coche, cochees, attendre, pack: () => vm.runInContext('PACK', ctx) };
  };
  const E = ecran('patron', PATRON);
  vrai('la fiche se charge (statut lu du vrai serveur)', await E.charge('plombier-banc'));
  v('⛔ jamais réglée : toutes les cases cochées, et la ligne dit « Toutes les catégories sont ouvertes »', [E.cochees().length, /Toutes les catégories sont ouvertes/.test(E.el['cats-info'].innerHTML), E.pack().d.cats], [CATS_OK.length, true, null]);
  const CHOIX = ['planning', 'clients', 'devis', 'factures'];
  E.coche(CHOIX);
  await E.ctx.tourCatsEnregistrer('plombier-banc', E.boutons.enr);
  v('⛔ « Enregistrer les catégories » : le corps envoyé est la liste cochée, et rien d\'autre', E.posts.filter(p => /espaces\/cats/.test(p.u)).map(p => p.b), [{ nom: 'plombier-banc', cats: CHOIX }]);
  const e1 = await etat();
  v('⛔ le serveur sert à l\'application la liste que la Tour a cochée', [e1.cats, e1.paye], [CHOIX, true]);
  vrai('(attente du geste, pas d\'un chronomètre) la fiche a relu le statut', await E.attendre(() => E.pack().charge && Array.isArray(E.pack().d && E.pack().d.cats)));
  E.coche(CATS_OK);   // on décoche tout par la main de la fiche : la relecture doit REPEINDRE la vérité du serveur
  E.ctx.packPeindre();
  v('⛔ LA COUTURE : la fiche relit la même liste — exactement les quatre cases, dans l\'ordre de la liste', E.cochees(), CATS_OK.filter(k => CHOIX.includes(k)));
  vrai('   la ligne dit « 4 catégories sur 38 retenues » et le toast le dit', /<b>4 catégories sur 38<\/b> retenues/.test(E.el['cats-info'].innerHTML) && E.toasts.some(t => /4 catégories retenues/.test(t)), E.el['cats-info'].innerHTML + ' | ' + E.toasts.join(' / '));
  v('   le bouton est rendu (activé, son libellé), et aucun message d\'erreur', [E.boutons.enr.disabled, E.boutons.enr.textContent, E.el['cats-msg'].innerHTML], [false, '💾 Enregistrer les catégories', '']);

  console.log('\n   « Tout rouvrir », et « tout coché » qui ne restreint rien');
  const avantRou = E.posts.length;
  await E.ctx.tourCatsRouvrir('plombier-banc', E.boutons.rou);
  v('⛔ « Tout rouvrir » envoie `cats: null` (le retrait), et le serveur sert null', [E.posts.slice(avantRou).filter(p => /espaces\/cats/.test(p.u)).map(p => p.b), (await etat()).cats], [[{ nom: 'plombier-banc', cats: null }], null]);
  await E.attendre(() => E.pack().charge && E.pack().d && E.pack().d.cats === null);
  E.ctx.packPeindre();
  v('   la fiche repeint : tout coché, « Toutes les catégories sont ouvertes »', [E.cochees().length, /Toutes les catégories sont ouvertes/.test(E.el['cats-info'].innerHTML)], [CATS_OK.length, true]);
  E.coche(CHOIX); await E.ctx.tourCatsEnregistrer('plombier-banc', null); await E.attendre(() => E.pack().charge);
  E.coche(CATS_OK);
  const avantTout = E.posts.length;
  await E.ctx.tourCatsEnregistrer('plombier-banc', E.boutons.enr);
  v('⛔ tout COCHÉ puis « Enregistrer » : la Tour envoie `null`, pas la liste des 38 (une rubrique ajoutée plus tard à l\'application doit s\'ouvrir)',
    [E.posts.slice(avantTout).filter(p => /espaces\/cats/.test(p.u)).map(p => p.b), (await etat()).cats], [[{ nom: 'plombier-banc', cats: null }], null]);
  await E.attendre(() => E.pack().charge && E.pack().d && E.pack().d.cats === null);
  const avantRien = E.posts.length;
  E.coche([]);
  await E.ctx.tourCatsEnregistrer('plombier-banc', E.boutons.enr);
  v('⛔ RIEN de coché : rien n\'est envoyé, et l\'écran dit pourquoi (« Coche au moins une catégorie »)', [E.posts.length - avantRien, /Coche au moins une catégorie/.test(E.el['cats-msg'].innerHTML), (await etat()).cats], [0, true, null]);

  console.log('\n4. Un refus SE DIT à l\'écran — et la réussite suivante l\'efface');
  const C = ecran('patron', COLLAB);   // la Tour croit parler en patron ; le SERVEUR est celui qui sait (un jeton de collaborateur)
  await C.charge('plombier-banc').catch(() => {});
  C.pack().charge = true; C.pack().d = { cats: null }; C.pack().nom = 'plombier-banc'; C.pack().err = '';
  C.coche(CHOIX);
  await C.ctx.tourCatsEnregistrer('plombier-banc', C.boutons.enr);
  v('⛔ le refus du serveur (403, un collaborateur) est ÉCRIT dans #cats-msg, avec le mot du serveur — pas seulement un toast qui passe',
    [/⛔ réservé au patron/.test(C.el['cats-msg'].innerHTML), C.toasts.some(t => /réservé au patron/.test(t))], [true, true]);
  v('   le bouton est rendu malgré le refus, et le serveur n\'a rien changé', [C.boutons.enr.disabled, C.boutons.enr.textContent, (await etat()).cats], [false, '💾 Enregistrer les catégories', null]);
  /* la réussite qui le dément : même écran, le bon jeton */
  vm.runInContext('TOKEN=' + JSON.stringify(PATRON), C.ctx);
  await C.ctx.tourCatsEnregistrer('plombier-banc', C.boutons.enr);
  v('⛔ la réussite suivante EFFACE le refus d\'avant (un refus ne survit pas à la réussite qui le dément)', [C.el['cats-msg'].innerHTML, (await etat()).cats], ['', CHOIX]);
  /* un refus de LISTE : la Tour ajoute à la main une case que le serveur ne connaît pas (liste fermée côté serveur aussi) */
  const X = ecran('patron', PATRON);
  await X.charge('plombier-banc');
  X.el['cat-boulangerie'] = { checked: true, disabled: false };
  vm.runInContext('CAT_CLES.push("boulangerie")', X.ctx);
  X.coche(CHOIX); X.el['cat-boulangerie'].checked = true;
  await X.ctx.tourCatsEnregistrer('plombier-banc', X.boutons.enr);
  v('⛔ une clé hors liste (400) : le serveur la refuse, l\'écran DIT laquelle, et le réglage d\'avant reste', [/boulangerie/.test(X.el['cats-msg'].innerHTML), (await etat()).cats], [true, CHOIX]);
  /* serveur injoignable */
  const R = ecran('patron', PATRON, { coupe: true });
  R.pack().charge = true; R.pack().d = { cats: null }; R.pack().nom = 'plombier-banc';
  R.coche(CHOIX);
  await R.ctx.tourCatsEnregistrer('plombier-banc', R.boutons.enr);
  v('⛔ serveur injoignable : l\'écran le dit (#cats-msg), le bouton revient', [/Serveur injoignable/.test(R.el['cats-msg'].innerHTML), R.boutons.enr.disabled], [true, false]);
  /* garde-fous de la fonction elle-même */
  const N = ecran('collaborateur', PATRON);
  N.pack().charge = true; N.pack().d = { cats: null }; N.pack().nom = 'plombier-banc'; N.coche(CHOIX);
  await N.ctx.tourCatsEnregistrer('plombier-banc', null); await N.ctx.tourCatsRouvrir('plombier-banc', null);
  v('⛔ un collaborateur ne passe pas par la fonction : rien n\'est envoyé (le serveur le refuserait aussi), et l\'écran le dit', [N.posts.length, /Réservé au patron/.test(N.el['cats-msg'].innerHTML)], [0, true]);
  const NC = ecran('patron', PATRON);   // la fiche n'a pas encore parlé : toutes les cases sont cochées PAR DÉFAUT
  NC.ctx.tourPackPrefill = () => {};
  await NC.ctx.tourCatsEnregistrer('plombier-banc', NC.boutons.enr);
  v('⛔ avant que la fiche ait parlé, « Enregistrer » ne part pas (tout est coché par défaut : ce serait « tout rouvrir » à l\'aveugle)', [NC.posts.length, /Attends que la fiche soit chargée/.test(NC.el['cats-msg'].innerHTML), (await etat()).cats], [0, true, CHOIX]);
  /* ce que la fiche peint quand le statut est en erreur, ou quand le serveur est d'avant */
  const P = ecran('patron', PATRON);
  vm.runInContext('PACK={nom:"plombier-banc",charge:true,err:"Statut indisponible",d:null}; packPeindre();', P.ctx);
  vrai('⛔ statut en erreur : la ligne des catégories le dit (elle ne reste pas sur « Chargement… »)', /Catégories illisibles[\s\S]*Statut indisponible/.test(P.el['cats-info'].innerHTML), P.el['cats-info'].innerHTML);
  vm.runInContext('PACK={nom:"plombier-banc",charge:true,err:"",d:{formule:"pro",quantite:1}}; packPeindre();', P.ctx);
  vrai('⛔ un serveur d\'AVANT (le statut sans `cats`) : la fiche le dit, et ne coche pas « tout » comme si elle savait', /ne sait pas encore régler les catégories/.test(P.el['cats-info'].innerHTML), P.el['cats-info'].innerHTML);
  v('   (une réponse sans la clé laisse les cases comme la valeur « tout » — c\'est la ligne qui prévient)', P.cochees().length, CATS_OK.length);

  console.log('\n5. Le rappel « Choisis ses catégories dans sa fiche », après une acceptation et après un accès public');
  const NOMS5 = ['hAuth', 'apiPost', 'tourAccepterDemande', 'demPaiement', 'demEstGestion', 'metDemande', 'demCatsDepart', 'demEspace', 'catsEffet', 'catsPromesse'];
  const FN5 = NOMS5.map(n => fonction(TOURN, n));
  const ligneMetL = (/^var MET_L=\{[^\n]*\};$/m.exec(TOURN) || [''])[0];
  vrai('(population) `tourAccepterDemande` et ses voisines sont trouvées dans le code de la Tour', FN5.every(Boolean) && !!ligneMetL, NOMS5.filter((n, i) => !FN5[i]).join(', '));
  const panneaux = [], toasts5 = [];
  const ctx5 = { fetch, JSON, Object, Array, String, Math, Date, Promise, parseInt, setTimeout, console, document: { getElementById: () => null },
    toast: t => toasts5.push(String(t)), tourPanneau: h => panneaux.push(String(h)), tourPackPrefill: () => {}, chargerClients: () => {}, chargerEspaces: () => {},
    prompt: () => 'paul', tourIdentDefaut: () => 'paul', tourMdpDefaut: () => 'Mdp-2871-provisoire',
    tourEspaceDe: async () => ({ nom: 'plombier-banc', slug: 'plombier-banc', annuaire: 1, mdp: '' }),
    espSlugJs: s => String(s), esc: s => String(s == null ? '' : s), jsq: s => String(s), ST: {}, ABN_F: {}, abnEcart: () => '',
    lgMessagePoser: () => {}, tourCopie: () => {}, tourMailAcces: () => {} };
  vm.createContext(ctx5);
  const cli = { email: 'plo@exemple-2871.fr', entreprise: 'plombier-banc', demandes: [{ app: 'OP GESTION', formule: 'Pro', users: '2', metier: 'plomberie', date: Date.now() }] };
  vm.runInContext('var API=' + JSON.stringify(B) + ', TOKEN=' + JSON.stringify(PATRON) + '; var ABO={abos:[]}; var REFM={d:null,err:"",enCours:false}; var ENT={loaded:true,liste:[]}; var CATS_APPLIQUEES=false; var CAT_CLES=[]; var CLI={list:' + JSON.stringify([cli]) + ', sel:"plo@exemple-2871.fr"}; var PACK={nom:"",charge:true,err:"",d:null}; var LG_MSG_MODELE="",LG_MAIL="",LG_ZONE="";\n' + ligneMetL + '\n' + FN5.join('\n'), ctx5);
  await ctx5.tourAccepterDemande('plo@exemple-2871.fr', 'plombier-banc');
  const pa = panneaux.join('\n');
  vrai('(population) l\'acceptation a bien ouvert son panneau (« Demande acceptée »)', /Demande acceptée/.test(pa), pa.slice(0, 200) + ' | ' + toasts5.join(' / '));
  vrai('⛔ le panneau d\'acceptation porte le rappel « Choisis ses catégories dans sa fiche » et un bouton qui y mène (`tourCatsAller` avec le nom de l\'espace)',
    /Choisis ses catégories<\/b> dans sa fiche/.test(pa) && /onclick="tourCatsAller\('plombier-banc'\)"/.test(pa), pa.slice(0, 300));
  /* l'accès public : la vraie `pbCreer` */
  const FNP = fonction(TOURN, 'pbCreer') + '\n' + fonction(TOURN, 'catsPromesse');
  vrai('(population) `pbCreer` est trouvée dans le code de la Tour', !!FNP);
  const pan2 = [];
  const ctxP = { JSON, Object, Array, String, Math, Date, Promise, setTimeout, console, document: { getElementById: () => null }, localStorage: { getItem: () => '{}', setItem() {} },
    toast: () => {}, confirm: () => true, tourPanneau: h => pan2.push(String(h)), chargerAccesPublics: () => {}, chargerEssais: () => {}, chargerEntreprises: () => {}, chargerComptesSite: () => {},
    tourEspaceDe: async () => ({ nom: 'acces-banc', slug: 'acces-banc', ident: 'paul', mdp: 'Mdp-provisoire' }), espSlugJs: s => String(s), esc: s => String(s == null ? '' : s), jsq: s => String(s) };
  vm.createContext(ctxP);
  vm.runInContext('var PB={nom:"acces-banc",email:"acces@exemple-2871.fr",ident:"paul",pass:"Mdp-provisoire"}; var LG_MSG_MODELE="",LG_ZONE=""; var CATS_APPLIQUEES=false;\n' + FNP, ctxP);
  await ctxP.pbCreer(null);
  const pp = pan2.join('\n');
  vrai('⛔ l\'accès public ouvert porte le même rappel, avec son bouton', /Accès version publique/.test(pp) && /Choisis ses catégories<\/b> dans sa fiche/.test(pp) && /onclick="tourCatsAller\('acces-banc'\)"/.test(pp), pp.slice(0, 200));
  /* le chemin vers la fiche */
  const FNA = fonction(TOURN, 'tourCatsAller');
  vrai('(population) `tourCatsAller` est trouvée dans le code de la Tour', !!FNA);
  const traces = [];
  const ctxA = { setTimeout: (f) => { traces.push('minuterie'); }, document: { getElementById: () => null }, toast: t => traces.push('toast:' + t), tourPanneauFermer: () => traces.push('fermer'),
    demOuvrirFiche: t => traces.push('fiche:' + t), setTab: t => traces.push('onglet:' + t), chargerEntreprises: () => traces.push('recharger'), espSlugJs: s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ''),
    ENT: { liste: [{ nom: 'Plombier-Banc', slug: 'plombierbanc', t: T_PLO }] } };
  vm.createContext(ctxA); vm.runInContext(FNA, ctxA);
  ctxA.tourCatsAller('plombier-banc');
  v('⛔ le rappel MÈNE à la fiche : le panneau se ferme, la fiche de l\'entreprise s\'ouvre (par son identifiant), et on amène le bloc des catégories en vue', traces, ['fermer', 'fiche:' + T_PLO, 'minuterie']);
  traces.length = 0; ctxA.tourCatsAller('inconnu-banc');
  v('   une entreprise que la liste ne connaît pas encore : l\'onglet Entreprises s\'ouvre, la liste se recharge, et on dit où aller', traces.map(t => t.replace(/^toast:.*/, 'toast')), ['fermer', 'onglet:entreprises', 'recharger', 'toast']);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a JETÉ : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
