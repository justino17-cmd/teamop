/* ⛔ CE QUE CE FICHIER GARDE — LE CODE PROMO DU COURRIEL D'ACCÈS SE VÉRIFIE CHEZ STRIPE AVANT D'ENTRER DANS LE MESSAGE (30 octobre 2026, Tour v2.125).

   Contrôle de A à Z : « ＋ Ajouter au message » écrivait le code tel quel — une faute de frappe partait chez le client, qui se voyait refuser au paiement le code
   qu'on venait de lui offrir.
     1. SERVEUR (le vrai, isolé, Stripe simulé DANS son processus) : `/api/monitor/promo-stripe` — patron seul (401 sans session), code illisible 400, code inconnu
        `existe:false`, code actif avec ce qu'il donne (pourcentage / montant, durée, mois), épuisé / expiré / désactivé `actif:false`, réservé à un client,
        la forme d'API récente (`promotion.coupon` en identifiant, relu par /v1/coupons), Stripe en panne 502 — et le code jamais au journal ;
     2. TOUR (les VRAIES `maPromo` et `maRemiseTexte` de tour.html) : seul un code vérifié ET actif entre dans le texte, avec sa remise ; tout le reste est dit et
        n'ajoute RIEN — y compris « on n'a pas pu vérifier ». */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3233-'));
const enfants = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();

console.log('\n── 3233 · le code promo du courriel d\'accès, vérifié chez Stripe ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const MAINT = Math.floor(Date.now() / 1000), vap = webpush.generateVAPIDKeys();
  /* Les codes du faux Stripe — des lettres hors de [0-9a-f] pour qu'aucun ne tombe par hasard dans une empreinte du journal. */
  const PC = {
    BONZQX: { code: 'BONZQX', active: true, times_redeemed: 0, max_redemptions: null, expires_at: null, customer: null, coupon: { id: 'c1', valid: true, percent_off: null, amount_off: 1500, duration: 'repeating', duration_in_months: 12 } },
    RECENTZQ: { code: 'RECENTZQ', active: true, times_redeemed: 0, max_redemptions: 5, expires_at: MAINT + 86400, customer: null, promotion: { type: 'coupon', coupon: 'c2' } },
    USEZQX: { code: 'USEZQX', active: true, times_redeemed: 3, max_redemptions: 3, expires_at: null, customer: null, coupon: { id: 'c3', valid: true, percent_off: 50, duration: 'once' } },
    VIEUXZQ: { code: 'VIEUXZQ', active: true, times_redeemed: 0, max_redemptions: null, expires_at: MAINT - 86400, customer: null, coupon: { id: 'c4', valid: true, percent_off: 20, duration: 'forever' } },
    ETEINTZQ: { code: 'ETEINTZQ', active: false, times_redeemed: 0, max_redemptions: null, expires_at: null, customer: null, coupon: { id: 'c5', valid: true, percent_off: 20, duration: 'forever' } },
    PERSOZQ: { code: 'PERSOZQ', active: true, times_redeemed: 0, max_redemptions: null, expires_at: null, customer: 'cus_zz', coupon: { id: 'c6', valid: true, percent_off: 10, duration: 'forever' } } };
  const COUPONS = { c2: { id: 'c2', valid: true, percent_off: 25, duration: 'repeating', duration_in_months: 3 } };
  const PRE = path.join(banc, 'stripe.js');
  fs.writeFileSync(PRE, `const vrai = globalThis.fetch, PC = ${JSON.stringify(PC)}, CP = ${JSON.stringify(COUPONS)};
const rep = (o, s) => new Response(JSON.stringify(o), { status: s || 200, headers: { 'Content-Type': 'application/json' } });
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (u.startsWith('https://api.stripe.com/')) {
    const q = new URL(u);
    if (q.pathname === '/v1/promotion_codes') { const c = q.searchParams.get('code'); if (c === 'PANNEZQ') return rep({ error: {} }, 500); return rep({ data: PC[c] ? [PC[c]] : [] }); }
    if (q.pathname.startsWith('/v1/coupons/')) { const c = CP[q.pathname.split('/').pop()]; return c ? rep(c) : rep({ error: {} }, 404); }
    return rep({ data: [], has_more: false });
  }
  return vrai.apply(this, arguments);
};\n`);
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  fs.writeFileSync(path.join(D, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha('mot-de-passe-3233'), role: 'patron', actif: true, ts: Date.now() }] }));
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-passe-3233'), stripe: { secretKey: 'sk_de_banc_3233' } }));
  let journal = '';
  const PORT = 9800 + (process.pid % 80), B = 'http://127.0.0.1:' + PORT;
  const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfants.push(e); e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre, isolé, Stripe simulé dans son processus', vivant, journal.slice(0, 600));
  if (!vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (corps, jeton) => { const r = await fetch(B + '/api/monitor/promo-stripe', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (x) {} return { ok: r.ok, status: r.status, d: j || {} }; };
  const PATRON = (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'Patron', pass: 'mot-de-passe-3233' }) })).json()).token;
  vrai('(population) la Tour se connecte (patron)', typeof PATRON === 'string' && PATRON.length > 10);

  console.log('\n1. la route');
  vrai('⛔ sans session : refusé (lire les codes de Stripe est un geste du patron)', [401, 403].includes((await appel({ code: 'BONZQX' })).status));
  v('code illisible : 400', (await appel({ code: 'pas un code !' }, PATRON)).status, 400);
  const R = {};
  for (const c of ['BONZQX', 'RECENTZQ', 'USEZQX', 'VIEUXZQ', 'ETEINTZQ', 'PERSOZQ', 'INCONNUZQ', 'PANNEZQ']) R[c] = await appel({ code: c }, PATRON);
  v('code inconnu : il n\'existe pas (et ce n\'est pas une erreur)', [R.INCONNUZQ.status, R.INCONNUZQ.d.existe], [200, false]);
  v('⛔ code actif : actif, avec ce qu\'il DONNE (15 € pendant 12 mois)', [R.BONZQX.d.existe, R.BONZQX.d.actif, R.BONZQX.d.remise], [true, true, { pourcent: null, montant: 15, duree: 'repeating', mois: 12 }]);
  v('   forme d\'API récente (`promotion.coupon` en identifiant) : la remise est relue chez /v1/coupons (25 % pendant 3 mois)', [R.RECENTZQ.d.actif, R.RECENTZQ.d.remise], [true, { pourcent: 25, montant: null, duree: 'repeating', mois: 3 }]);
  v('⛔ épuisé (3 utilisations sur 3) : PAS actif, et dit pourquoi', [R.USEZQX.d.actif, R.USEZQX.d.epuise], [false, true]);
  v('⛔ date dépassée : PAS actif, et dit pourquoi', [R.VIEUXZQ.d.actif, R.VIEUXZQ.d.expire], [false, true]);
  v('⛔ désactivé dans Stripe : PAS actif', R.ETEINTZQ.d.actif, false);
  v('réservé à un client précis : dit', R.PERSOZQ.d.reserveClient, true);
  vrai('⛔ Stripe en panne : 502 et une phrase — « on n\'a pas pu vérifier » n\'est pas « inconnu »', R.PANNEZQ.status === 502 && /pas pu être vérifié/.test(R.PANNEZQ.d.error || '') && R.PANNEZQ.d.existe === undefined);
  vrai('⛔ aucun code au journal du serveur', !/BONZQX|RECENTZQ|USEZQX|VIEUXZQ|ETEINTZQ|PERSOZQ|INCONNUZQ|PANNEZQ/.test(journal), journal.slice(-400));

  console.log('\n2. la Tour (les vraies maPromo et maRemiseTexte)');
  const SRC = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
  const corps = nom => { const i = SRC.indexOf('function ' + nom + '('); if (i < 0) return ''; let p = SRC.indexOf('{', i), n = 0, j = p; for (; j < SRC.length; j++) { if (SRC[j] === '{') n++; else if (SRC[j] === '}' && --n === 0) break; } return SRC.slice(i, j + 1); };
  const src = corps('maRemiseTexte') + '\n' + corps('maPromo');
  vrai('(population) les deux fonctions sont trouvées dans tour.html', /function maRemiseTexte\(/.test(src) && /function maPromo\(/.test(src));
  const BASE = 'Bonjour,\n\nVotre adresse : teamop.fr/e/x\n\nPOUR TOUTE VOTRE ÉQUIPE\nfin';
  const jouer = async (code) => {
    const el = { 'ma-promo': { value: code }, 'ma-texte': { value: BASE } }, toasts = [];
    const ctx = { document: { getElementById: id => el[id] || null }, toast: t => toasts.push(t), apiPost: async (route, b) => { const r = await appel(b, PATRON); return { ok: r.ok, status: r.status, d: r.d }; } };
    vm.createContext(ctx); vm.runInContext(src, ctx);
    const btn = { disabled: false, textContent: '' };
    ctx.maPromo(btn); await dormir(400);
    return { texte: el['ma-texte'].value, toast: toasts.slice(-1)[0] || '', btn };
  };
  const bon = await jouer('bonzqx');
  vrai('⛔ un code vérifié et actif entre dans le message, AVANT « POUR TOUTE VOTRE ÉQUIPE », avec sa remise', /VOTRE CODE PROMO : BONZQX \(remise de 15 € pendant 12 mois\)\nÀ saisir[^\n]*\n\nPOUR TOUTE VOTRE ÉQUIPE/.test(bon.texte), bon.texte);
  vrai('   la Tour dit « vérifié » et rend son bouton', /Code vérifié/.test(bon.toast) && bon.btn.disabled === false && /Ajouter au message/.test(bon.btn.textContent));
  for (const [c, motif, dit] of [['inconnuzq', /n’existe pas/, 'inconnu'], ['usezqx', /déjà utilisé/, 'épuisé'], ['vieuxzq', /date dépassée/, 'expiré'], ['eteintzq', /désactivé/, 'désactivé'], ['persozq', /réservé à un client/, 'réservé'], ['pannezq', /pas pu être vérifié/, 'Stripe en panne']]) {
    const r = await jouer(c);
    vrai('⛔ ' + dit + ' : RIEN n\'est ajouté, et la Tour le dit', r.texte === BASE && motif.test(r.toast), r.toast);
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc est tombé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); });
