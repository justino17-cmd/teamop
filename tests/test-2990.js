/* ══ test-2990 · LE PAIEMENT SE JOUE EN ESSAI : les dix tarifs de TEST, et le serveur qui les accepte ═══════════════════════════════════════════
   23 octobre 2026. Justin a choisi « Stripe en mode test, carte 4242 ». Les dix identifiants `price_…` de `STRIPE_PRIX_FORMULE` (server/index.js) et de
   `recap-abonnement.html` sont des tarifs du mode RÉEL : avec une clé `sk_test_`, Stripe répond « No such price ». Trois pièces tiennent ensemble ; ce banc
   joue les DEUX premières, chacune réelle, contre un FAUX Stripe (un module préchargé, état dans un fichier : le script, puis le serveur, voient le même monde) :

     1. `server/stripe-essai-prix.js` — crée (ou retrouve, par clé de recherche) les dix tarifs de test aux MÊMES montants, devise et rythme, et écrit la table
        `stripe.prixEssai` dans la config. Refuse une clé qui n'est pas `sk_test_`/`rk_test_` et une config sans `espaceTest` (AVANT toute requête). Ne montre jamais la clé.
     2. `server/index.js` — SEULEMENT en `espaceTest` ET avec la table complète, remplace ses dix tarifs (et la liste d'OP MESSAGES, qui est une concaténation faite à la
        définition). Sans `espaceTest`, la même config ne change RIEN : la production n'a pas bougé d'un caractère.
     3. `scripts/essais-build.js` — les pages — est dans `test-2991`. Il est séparé EXPRÈS : ce banc-ci n'a besoin que de `server/` et de la page de paiement, donc il peut
        entrer dans la liste des bancs du serveur (`scripts/bancs-serveur.liste`), qui se joue contre les pages de `main` ; le fabricant de pages, lui, relit tout le dépôt
        (comme `test-2985` et `test-2986`, qui n'y sont pas non plus).

   Jamais le vrai Stripe, jamais `api.teamop.fr`. Population comptée avant chaque absence.                                                                 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const B2 = require('./banc-essais');
const { RACINE } = B2;
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'essais2990-'));
const vivants = [];
const fin = () => { for (const s of vivants) { try { s.enfant() && s.enfant().kill('SIGKILL'); } catch (e) {} try { s.smtp.s.close(); } catch (e) {} } try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n════ test-2990 : ' + ok + ' ✓  ' + (ko + 1) + ' ✗ ════'); fin(); process.exit(1); }, 170000).unref();
let n = 0;
const neuf = (nom) => { const d = path.join(TMP, nom + '-' + (++n)); fs.mkdirSync(d, { recursive: true }); return d; };
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const lire = (f) => fs.readFileSync(f, 'utf8');

const SRV = lire(path.join(RACINE, 'server', 'index.js')), PAGE = lire(path.join(RACINE, 'recap-abonnement.html'));
const SCRIPT = path.join(RACINE, 'server', 'stripe-essai-prix.js');
/* les dix tarifs de PRODUCTION, lus dans la définition du serveur (et recoupés avec la page) — [formule, mensuel, annuel] */
const BLOC = /^const STRIPE_PRIX_FORMULE = \{([\s\S]*?)\};/m.exec(SRV);
const FORMULES = BLOC ? Array.from(BLOC[1].matchAll(/^\s*(\w+): \['(price_[A-Za-z0-9]+)', '(price_[A-Za-z0-9]+)'\]/gm)).map(m => ({ cle: m[1], mensuel: m[2], annuel: m[3] })) : [];
const PROD = [].concat(...FORMULES.map(f => [f.mensuel, f.annuel]));
/* la grille ATTENDUE, écrite ICI et nulle part ailleurs : si un prix change, ce banc doit changer avec lui — c'est exactement ce qu'on lui demande */
const GRILLE = { pro: 15, business: 25, premium: 50, msgpro: 15, msgpremium: 25 };   // € par mois ; l'année : dix mois
const SK = 'sk_test_' + crypto.randomBytes(12).toString('hex').replace(/[^0-9a-z]/g, 'x');

/* ═══ le FAUX STRIPE : un module préchargé (`--require`) qui répond à la place d'api.stripe.com, état dans un fichier ═══ */
function fauxStripe(dossier) {
  const etat = path.join(dossier, 'stripe-etat.json'), pre = path.join(dossier, 'faux-stripe.js');
  fs.writeFileSync(etat, JSON.stringify({ n: 0, produits: [], prix: [], appels: [], mode: '' }));
  fs.writeFileSync(pre, `const fs = require('fs');
const ETAT = ${JSON.stringify(etat)};
const vrai = globalThis.fetch;
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  const e = JSON.parse(fs.readFileSync(ETAT, 'utf8')), o = opts || {}, h = o.headers || {};
  const corps = new URLSearchParams(String(o.body || '')), chemin = u.slice('https://api.stripe.com'.length), methode = o.method || 'GET';
  e.appels.push({ m: methode, c: chemin, b: Object.fromEntries(corps.entries()), auth: String(h.Authorization || '') });
  const json = (c, st) => { fs.writeFileSync(ETAT, JSON.stringify(e)); return new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } }); };
  if (e.mode === 'echo-cle') return json({ error: { message: 'Invalid API Key provided: ' + String(h.Authorization || '').replace('Bearer ', '') } }, 401);
  const id = pref => pref + '_FAUX' + (++e.n).toString().padStart(6, '0') + 'abc';
  if (methode === 'GET' && chemin.startsWith('/v1/products')) return json({ data: e.produits, has_more: false });
  if (methode === 'POST' && chemin === '/v1/products') { const p = { id: id('prod'), name: corps.get('name'), active: true, metadata: { teamop_essai: corps.get('metadata[teamop_essai]') } }; e.produits.push(p); return json(p); }
  if (methode === 'GET' && chemin.startsWith('/v1/prices')) { const k = new URL('https://x' + chemin).searchParams.get('lookup_keys[]'); return json({ data: e.prix.filter(p => p.lookup_key === k).slice(0, 1), has_more: false }); }
  if (methode === 'POST' && chemin === '/v1/prices') {
    if (corps.get('transfer_lookup_key') === 'true') e.prix.forEach(p => { if (p.lookup_key === corps.get('lookup_key')) p.lookup_key = null; });
    const p = { id: id('price'), product: corps.get('product'), currency: corps.get('currency'), unit_amount: parseInt(corps.get('unit_amount'), 10), active: true,
      recurring: { interval: corps.get('recurring[interval]'), interval_count: parseInt(corps.get('recurring[interval_count]') || '1', 10) }, lookup_key: corps.get('lookup_key') };
    e.prix.push(p); return json(p);
  }
  if (methode === 'POST' && chemin === '/v1/checkout/sessions') return json({ id: 'cs_banc_2990', url: 'https://checkout.stripe.com/c/pay/banc-2990' });
  return json({ data: [], has_more: false });
};\n`);
  const lireEtat = () => JSON.parse(fs.readFileSync(etat, 'utf8'));
  return { etat, pre, lire: lireEtat, ecrire: f => { const e = lireEtat(); f(e); fs.writeFileSync(etat, JSON.stringify(e)); },
    posts: () => lireEtat().appels.filter(a => a.m === 'POST'), sessions: () => lireEtat().appels.filter(a => a.m === 'POST' && a.c === '/v1/checkout/sessions') };
}

/* lance le VRAI script contre le faux Stripe */
function lancerScript(fs2, cfgPath, args, extraEnv) {
  const env = Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath }, extraEnv || {});
  const r = spawnSync(process.execPath, ['--require', fs2.pre, SCRIPT].concat(args || []), { encoding: 'utf8', env, timeout: 60000 });
  return { rc: r.status, out: String(r.stdout || ''), err: String(r.stderr || ''), tout: String(r.stdout || '') + String(r.stderr || '') };
}
const ecrireConfig = (chemin, o) => { fs.writeFileSync(chemin, JSON.stringify(o, null, 2) + '\n', { mode: 0o640 }); fs.chmodSync(chemin, 0o640); };
const hashDe = f => sha(fs.readFileSync(f));

(async () => {
  console.log('\n── test-2990 : le paiement se joue en essai ──');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE : server/node_modules absent'); console.log('\n════ test-2990 : ' + ok + ' ✓  ' + ko + ' ✗ ════'); process.exit(0); }

  console.log('\n0. La population');
  egal('(population) STRIPE_PRIX_FORMULE porte cinq formules, dans l\'ordre de la grille attendue', FORMULES.map(f => f.cle), Object.keys(GRILLE));
  vrai('(population) dix tarifs de production distincts, et la page de paiement porte exactement les mêmes', PROD.length === 10 && new Set(PROD).size === 10 && PROD.every(p => PAGE.indexOf(p) >= 0) && new Set(PAGE.match(/price_[A-Za-z0-9]{8,}/g)).size === 10);

  /* ═══ 1. LE SCRIPT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n1. server/stripe-essai-prix.js');
  const A = neuf('script'), F = fauxStripe(A), CFG = path.join(A, 'config.json');
  const REST = { espaceTest: true, espaceTestCle: 'ab'.repeat(32), vapidPrivateKey: 'garde-moi', agents: { plafondMoisTotal: 10 } };
  {
    const c = neuf('refus'), f = fauxStripe(c), cp = path.join(c, 'config.json');
    ecrireConfig(cp, Object.assign({}, REST, { stripe: { secretKey: 'sk_live_' + 'Q'.repeat(24) } }));
    const r = lancerScript(f, cp);
    vrai('⛔ une clé de PRODUCTION (sk_live_) est refusée, dite, et RIEN n\'est parti chez Stripe (aucun appel)', r.rc !== 0 && /TEST/.test(r.err) && f.lire().appels.length === 0 && !r.tout.includes('Q'.repeat(24)), [r.rc, f.lire().appels.length, r.err.slice(0, 120)]);
    ecrireConfig(cp, Object.assign({}, REST, { stripe: { secretKey: 'rk_live_' + 'R'.repeat(24) } }));
    const r2 = lancerScript(f, cp);
    vrai('…une clé restreinte de production (rk_live_) aussi', r2.rc !== 0 && f.lire().appels.length === 0 && !r2.tout.includes('R'.repeat(24)));
    ecrireConfig(cp, { stripe: { secretKey: SK } });
    const r3 = lancerScript(f, cp);
    vrai('⛔ une config SANS espaceTest (celle de la production) est refusée avant tout appel, même avec une clé de test', r3.rc !== 0 && /espaceTest/.test(r3.err) && f.lire().appels.length === 0 && !r3.tout.includes(SK));
    ecrireConfig(cp, Object.assign({}, REST, { espaceTest: false, stripe: { secretKey: SK } }));
    vrai('…et espaceTest:false aussi', lancerScript(f, cp).rc !== 0 && f.lire().appels.length === 0);
    ecrireConfig(cp, Object.assign({}, REST, { stripe: {} }));
    const r4 = lancerScript(f, cp);
    vrai('sans clé du tout : refus clair, aucun appel', r4.rc !== 0 && /Aucune clé Stripe/.test(r4.err) && f.lire().appels.length === 0);
    ecrireConfig(cp, Object.assign({}, REST, { stripe: { secretKey: SK } }));
    f.ecrire(e => { e.mode = 'echo-cle'; });
    const r5 = lancerScript(f, cp);
    vrai('⛔ (population) Stripe a bien REFUSÉ avec la clé dans son message d\'erreur, le script échoue…', r5.rc !== 0 && f.lire().appels.length >= 1 && /refusé \(401\)/.test(r5.err));
    vrai('…et la clé n\'apparaît NI sur la sortie standard NI sur l\'erreur (masquée)', !r5.tout.includes(SK) && /clé masquée/.test(r5.err), r5.err.slice(0, 200));
    vrai('…et la config n\'a pas été réécrite (aucune table à moitié posée)', !('prixEssai' in (JSON.parse(lire(cp)).stripe || {})));
  }

  ecrireConfig(CFG, Object.assign({}, REST, { stripe: { secretKey: SK } }));
  const modeAvant = fs.statSync(CFG).mode & 0o777;
  {
    const r = lancerScript(F, CFG, ['--essai']);
    const e = F.lire();
    vrai('--essai : rien n\'est écrit (aucun POST chez Stripe) ni dans la config', r.rc === 0 && F.posts().length === 0 && !('prixEssai' in JSON.parse(lire(CFG)).stripe) && /créerait/.test(r.out) && e.appels.length >= 1, [r.rc, r.err.slice(0, 150)]);
  }
  const r1 = lancerScript(F, CFG);
  if (r1.rc !== 0) console.log(r1.tout.slice(-600));
  const E1 = F.lire(), C1 = JSON.parse(lire(CFG));
  vrai('le script réussit', r1.rc === 0);
  egal('cinq produits (un par formule), dix tarifs créés chez le faux Stripe', [E1.produits.length, E1.prix.length], [5, 10]);
  {
    let bons = 0, detail = [];
    for (const f of FORMULES) for (const [i, cycle, intervalle] of [[0, 'mensuel', 'month'], [1, 'annuel', 'year']]) {
      const attendu = GRILLE[f.cle] * 100 * (cycle === 'annuel' ? 10 : 1), p = E1.prix.find(x => x.lookup_key === 'teamop_essai_' + f.cle + '_' + cycle);
      const t = (C1.stripe.prixEssai || {})[i === 0 ? f.mensuel : f.annuel];
      if (p && p.unit_amount === attendu && p.currency === 'eur' && p.recurring.interval === intervalle && p.recurring.interval_count === 1 && t === p.id) bons++; else detail.push([f.cle, cycle, p && p.unit_amount, attendu, t]);
    }
    egal('⛔ chacun des dix tarifs a le MÊME montant (en centimes), la même devise (eur) et le même rythme que le tarif de production, et la table le désigne', [bons, detail], [10, []]);
  }
  egal('la table écrite est COMPLÈTE : exactement les dix identifiants de production, chacun avec un tarif de test distinct',
    [Object.keys(C1.stripe.prixEssai).sort(), new Set(Object.values(C1.stripe.prixEssai)).size, Object.values(C1.stripe.prixEssai).every(v => /^price_[A-Za-z0-9]+$/.test(v) && PROD.indexOf(v) < 0)], [PROD.slice().sort(), 10, true]);
  vrai('le produit d\'OP MESSAGES porte « messages » dans son nom (comme en production : `ligneMessages` lit aussi le nom), jamais celui d\'OP GESTION',
    E1.produits.filter(p => /messages/i.test(p.name)).length === 2 && E1.produits.filter(p => /OP GESTION/.test(p.name) && /messages/i.test(p.name)).length === 0);
  vrai('⛔ aucune option du Pro n\'est créée (leur tarif est vide en production)', !E1.prix.some(p => /option/.test(String(p.lookup_key))) && !E1.produits.some(p => /option/i.test(p.name)));
  vrai('toute requête est partie avec la clé de test en Authorization (et seulement elle)', E1.appels.length > 10 && E1.appels.every(a => a.auth === 'Bearer ' + SK));
  vrai('⛔ la clé n\'apparaît ni sur la sortie standard ni sur l\'erreur', !r1.tout.includes(SK));
  vrai('le reste de la config est intact (clé des routes d\'essai, VAPID, agents, clé Stripe)', C1.espaceTestCle === REST.espaceTestCle && C1.vapidPrivateKey === 'garde-moi' && C1.agents.plafondMoisTotal === 10 && C1.stripe.secretKey === SK && C1.espaceTest === true);
  vrai('le mode du fichier est conservé (640) et aucun fichier temporaire ne traîne à côté', (fs.statSync(CFG).mode & 0o777) === modeAvant && modeAvant === 0o640 && fs.readdirSync(A).filter(x => /nouveau$/.test(x)).length === 0, fs.readdirSync(A));
  if (spawnSync('jq', ['--version']).status === 0) {
    const j = spawnSync('jq', ['.', CFG], { encoding: 'utf8' });
    vrai('la config écrite est EXACTEMENT ce que jq en ferait (un second passage de l\'installeur ne change pas un octet)', j.status === 0 && j.stdout === lire(CFG));
  } else console.log('  … jq absent : la forme jq de la config n\'est pas comparée');

  /* idempotence */
  const h1 = hashDe(CFG), nbPosts1 = F.posts().length;
  const r2 = lancerScript(F, CFG);
  vrai('⛔ IDEMPOTENT : un second passage ne crée RIEN de plus (aucun POST), même table, même config à l\'octet', r2.rc === 0 && F.posts().length === nbPosts1 && F.lire().prix.length === 10 && F.lire().produits.length === 5 && hashDe(CFG) === h1 && /déjà à jour/.test(r2.out), [r2.rc, F.posts().length, nbPosts1, r2.out.slice(-200)]);
  /* un tarif archivé est REMPLACÉ, pas laissé : le paiement tomberait sur un tarif mort */
  {
    const cible = 'teamop_essai_pro_mensuel';
    F.ecrire(e => { e.prix.find(p => p.lookup_key === cible).active = false; });
    const avant = F.lire().prix.find(p => p.lookup_key === cible).id;
    const r3 = lancerScript(F, CFG), E3 = F.lire(), C3 = JSON.parse(lire(CFG));
    const neufP = E3.prix.find(p => p.lookup_key === cible);
    vrai('un tarif ARCHIVÉ est remplacé (un seul POST de tarif, la clé de recherche lui est transférée) et la table suit', r3.rc === 0 && neufP && neufP.id !== avant && neufP.active === true && E3.prix.length === 11 && C3.stripe.prixEssai[FORMULES[0].mensuel] === neufP.id && Object.values(C3.stripe.prixEssai).length === 10, [r3.rc, E3.prix.length, r3.err.slice(0, 120)]);
    vrai('…sans recréer de produit', E3.produits.length === 5);
  }
  /* un montant qui a changé depuis (la grille a bougé) est remplacé de même */
  {
    const cible = 'teamop_essai_business_annuel';
    F.ecrire(e => { e.prix.find(p => p.lookup_key === cible).unit_amount = 1; });
    const r4 = lancerScript(F, CFG), p = F.lire().prix.find(x => x.lookup_key === cible);
    vrai('un tarif au mauvais montant est remplacé par le bon', r4.rc === 0 && p.unit_amount === GRILLE.business * 1000 && JSON.parse(lire(CFG)).stripe.prixEssai[FORMULES[1].annuel] === p.id);
  }

  /* ═══ 2. LE SERVEUR ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n2. Le vrai serveur — mode test avec la table, mode test sans table complète, SANS espaceTest');
  const TABLE = JSON.parse(lire(CFG)).stripe.prixEssai;
  vrai('(population) la table de départ des cas serveur est celle que le VRAI script vient d\'écrire (dix entrées)', Object.keys(TABLE).length === 10);
  const T = (cle, cycle) => TABLE[FORMULES.find(f => f.cle === cle)[cycle]];
  const P = (cle, cycle) => FORMULES.find(f => f.cle === cle)[cycle];
  const monde = (D) => {
    const jeton = crypto.randomBytes(32).toString('hex'), email = 'payeur@exemple-essai.fr', MAINT = Date.now();
    fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: { [email]: { v: true, pr: 'Banc', no: 'Essai', so: 'Banc' } }, j: { [sha(jeton)]: { m: email, g: 'session', exp: MAINT + 86400000 } } }));
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ bancessai: { nom: 'Banc essai', t: 't-banc-2990', code: Buffer.from(JSON.stringify({ t: 't-banc-2990', k: 'cle-propre-2990' })).toString('base64'), ts: MAINT - 1000, email: 'autre@exemple-essai.fr', formule: 'pro', quantite: 1 } }));
    return jeton;
  };
  const cas = async (nom, essai, stripeCfg) => {
    const banc = neuf('serveur-' + nom), D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
    const fs3 = fauxStripe(banc), jeton = monde(D);
    const S = await B2.lancer({ essai, banc, dossier: D, requis: [fs3.pre], config: { mailPreuveExigee: false, stripe: stripeCfg } }); vivants.push(S);
    vrai(nom + ' : le serveur démarre', S.vivant);
    const payer = async (price, extra) => { const avant = fs3.sessions().length; const r = await S.appel('/api/stripe/checkout', Object.assign({ price, quantity: 1, metier: 'chauffage' }, extra || {}), jeton); return { s: r.s, e: r.j.error, url: r.j.url, partis: fs3.sessions().slice(avant) }; };
    return { S, fs3, payer, nom };
  };
  const envoye = (r) => (r.partis[0] && r.partis[0].b['line_items[0][price]']) || null;

  const mt = await cas('essai+table', true, { secretKey: SK, prixEssai: TABLE });
  {
    const r = await mt.payer(T('pro', 'mensuel'));
    vrai('(population) en essai avec la table, un paiement Pro avec le tarif de TEST ouvre une session chez le faux Stripe (200 + adresse)', r.s === 200 && !!r.url && r.partis.length === 1, [r.s, r.e]);
    egal('⛔ …et le tarif transmis à Stripe est CELUI DE TEST, tel quel', envoye(r), T('pro', 'mensuel'));
    const ra = await mt.payer(T('premium', 'annuel'));
    vrai('…l\'annuel de Premium aussi', ra.s === 200 && envoye(ra) === T('premium', 'annuel'));
    const rp = await mt.payer(P('pro', 'mensuel'));
    vrai('⛔ le tarif de PRODUCTION est refusé (tarif_inconnu) et rien ne part chez Stripe', rp.s === 400 && rp.e === 'tarif_inconnu' && rp.partis.length === 0, [rp.s, rp.e, rp.partis.length]);
    const rm = await mt.payer(T('msgpro', 'mensuel'));
    vrai('la liste d\'OP MESSAGES (concaténation faite à la définition) est recalculée : le tarif de test de Messages Pro passe', rm.s === 200 && envoye(rm) === T('msgpro', 'mensuel'), [rm.s, rm.e]);
    const rr = await mt.payer(T('msgpremium', 'mensuel'));
    vrai('…et la formule RETIRÉE reste retirée sous son tarif de test (formule_retiree, pas tarif_inconnu : la table de formules a bien suivi)', rr.s === 400 && rr.e === 'formule_retiree', [rr.s, rr.e]);
    const rmp = await mt.payer(P('msgpro', 'mensuel'));
    vrai('…et le tarif de production de Messages Pro est refusé (la liste des messages ne garde aucun ancien identifiant)', rmp.s === 400 && rmp.e === 'tarif_inconnu');
    vrai('le journal du serveur DIT le remplacement (dix tarifs de test)', /les 10 tarifs de formule sont ceux du mode TEST/.test(mt.S.sortie()));
  }
  await mt.S.nettoyer();

  const incomplete = Object.assign({}, TABLE); delete incomplete[FORMULES[4].annuel];
  const mauvaise = Object.assign({}, TABLE); mauvaise[FORMULES[0].mensuel] = 'price_a b';
  const doublon = Object.assign({}, TABLE); doublon[FORMULES[0].annuel] = TABLE[FORMULES[0].mensuel];
  const prodEnTest = Object.assign({}, TABLE); prodEnTest[FORMULES[0].mensuel] = FORMULES[1].mensuel;
  for (const [nom, table] of [['table incomplète (9 sur 10)', incomplete], ['un identifiant mal formé', mauvaise], ['deux tarifs de production sur le même tarif de test', doublon], ['un tarif de PRODUCTION donné comme correspondant', prodEnTest]]) {
    const m = await cas('essai-' + nom.slice(0, 12), true, { secretKey: SK, prixEssai: table });
    const rt = await m.payer(T('pro', 'mensuel')), rp = await m.payer(P('pro', 'mensuel'));
    vrai('⛔ ' + nom + ' : RIEN n\'est remplacé — le tarif de production passe encore, celui de test est refusé (jamais une moitié de table)', rp.s === 200 && envoye(rp) === P('pro', 'mensuel') && rt.s === 400 && rt.e === 'tarif_inconnu', [rp.s, rp.e, rt.s, rt.e]);
    vrai('…et le journal le dit', /stripe\.prixEssai` est incomplète ou mal formée — AUCUN tarif remplacé/.test(m.S.sortie()));
    await m.S.nettoyer();
  }
  {
    const m = await cas('essai-sans-table', true, { secretKey: SK });
    const rp = await m.payer(P('pro', 'mensuel'));
    vrai('en essai SANS table : les tarifs de production sont gardés et le journal dit pourquoi le paiement n\'aboutira pas', rp.s === 200 && /pas de `stripe\.prixEssai`/.test(m.S.sortie()));
    await m.S.nettoyer();
  }

  const prod = await cas('production+table', false, { secretKey: 'sk_de_banc_2990', prixEssai: TABLE });
  {
    const rp = await prod.payer(P('pro', 'mensuel'));
    vrai('(population) SANS espaceTest, un paiement Pro avec le tarif de production ouvre une session chez le faux Stripe', rp.s === 200 && !!rp.url && rp.partis.length === 1, [rp.s, rp.e]);
    egal('⛔ …et c\'est le tarif de PRODUCTION qui est transmis, malgré la table présente dans la config', envoye(rp), P('pro', 'mensuel'));
    const rt = await prod.payer(T('pro', 'mensuel'));
    vrai('⛔ SANS espaceTest, le tarif de test est refusé (tarif_inconnu) : une table de tarifs de test dans la config de PRODUCTION ne change RIEN', rt.s === 400 && rt.e === 'tarif_inconnu' && rt.partis.length === 0, [rt.s, rt.e]);
    const rmp = await prod.payer(P('msgpro', 'mensuel')), rrr = await prod.payer(P('msgpremium', 'mensuel'));
    vrai('…la liste d\'OP MESSAGES et la formule retirée sont aussi celles de production', rmp.s === 200 && rrr.s === 400 && rrr.e === 'formule_retiree');
    vrai('…et le journal ne parle d\'aucun remplacement', !/prixEssai|tarifs de formule sont ceux du mode TEST/.test(prod.S.sortie()));
  }
  await prod.S.nettoyer();

  console.log('\n════ test-2990 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n════ test-2990 : ' + ok + ' ✓  ' + (ko + 1) + ' ✗ ════'); process.exit(1); });
