/* ⛔ CE QUE CE FICHIER GARDE — CE QUE LA RELECTURE DE LA POUSSÉE A REJOUÉ SUR LE VRAI SERVEUR (30 septembre 2026).

   Avant de mettre en ligne « plus de Gratuit » et « une entreprise, une facturation », une relecture adverse a rejoué le
   serveur neuf contre celui de `main` sur des annuaires d'AVANT. Elle a trouvé des entreprises qui payent (ou qui doivent)
   et que le serveur neuf traitait à l'envers. Chaque cas est joué ici, par la vraie route `/api/espaces/etat` (celle que lit
   l'application), sur un Stripe simulé dans le processus du serveur :
     A · registre des codes illisible + un code sur la fiche + un IMPAYÉ Stripe : suspendue comme tout impayé — pas
         « Business Premium payé, dans le doute » (la page de paiement lui aurait vendu un second abonnement) ;
     B · un réglage NÉGATIF périmé (« annulé ») resté sur un ANCIEN nom ne suspend pas l'entreprise qui paie sous le nom
         récent ; un réglage posé par la Tour d'aujourd'hui, lui, suit l'entreprise (écrit sur tous ses noms) ;
     C · l'abonnement Stripe d'une entreprise renommée se trouve par ses ANCIENS noms : gravé à l'ancien nom d'accès, ou
         trouvé par l'adresse de l'ancien nom ;
     D · « repartir à neuf » en pleine période offerte : la période (restée sous l'ancien identifiant, marquée de
         l'empreinte de l'e-mail) sert encore — mais jamais celle d'une AUTRE entreprise vivante à la même adresse ;
     E · une fiche SANS formule payée par un tarif qu'on ne sait pas lire garde Business Premium (Pro est réservé aux
         fiches « Gratuit ») ;
     F · le journal du métier ne porte pas le nom d'accès ;  G · le métier est celui de l'entreprise, sur tous ses noms.
   Rien ne sort d'ici : 127.0.0.1, un Stripe simulé, des entreprises et des adresses fictives. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b849-'));
const enfants = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();

console.log('\n── 849 · la relecture de la poussée, rejouée sur le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const SRC = fs.readFileSync(SERVEUR, 'utf8');
  const prix = k => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)'", 'm').exec(SRC) || [])[1];
  const P = { pro: prix('pro'), premium: prix('premium'), inconnu: 'price_ancien_lien_banc_849' };
  vrai('(population) les tarifs Pro et Business Premium du serveur sont lus', /^price_/.test(P.pro || '') && /^price_/.test(P.premium || ''));
  const MAINT = Date.now();
  const jour = n => new Date(MAINT + n * 86400000).toISOString().slice(0, 10);
  const cree = Math.floor(MAINT / 1000) - 3600;
  const mail = x => x + '@exemple-849.fr';
  /* l'empreinte que la mémoire des codes range (`promoEmpreinteMail`) — lue dans le serveur, pas recopiée à la main */
  const sel = (/update\('([^']+)' \+ m\)\.digest\('hex'\)\.slice\(0, 24\)/.exec(SRC) || [])[1];
  vrai('(population) le sel de l\'empreinte des codes se lit dans le serveur', !!sel);
  const em = m => crypto.createHash('sha256').update(sel + m).digest('hex').slice(0, 24);
  const abo = (id, status, f, q, espace, email) => ({ id, object: 'subscription', status, created: cree,
    metadata: espace ? { espace } : {}, customer: { id: 'cus_' + id, email }, current_period_end: Math.floor(MAINT / 1000) + 20 * 86400,
    items: { data: [{ id: 'si_' + id, quantity: q, price: { id: P[f], product: { name: 'OP GESTION' } } }] } });

  /* un vrai serveur, isolé : son annuaire, ses codes, son Stripe simulé (relu à chaque appel) */
  let n = 0;
  async function demarrer(espaces, usages, subs, factures) {
    const R = path.join(banc, 's' + (++n)), D = path.join(R, 'data'); fs.mkdirSync(D, { recursive: true });
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
    fs.writeFileSync(path.join(D, 'promos-usages.json'), typeof usages === 'string' ? usages : JSON.stringify(usages));
    const ETAT = path.join(R, 'stripe.json'); fs.writeFileSync(ETAT, JSON.stringify({ subs, factures: factures || {} }));
    const PRE = path.join(R, 'stripe-simule.js');
    fs.writeFileSync(PRE, `const vrai = globalThis.fetch; const fs = require('fs');
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  const E = JSON.parse(fs.readFileSync(${JSON.stringify(ETAT)}, 'utf8'));
  const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return json({ id: 'cs_banc_849', url: 'https://checkout.stripe.com/c/pay/banc-849' });
  const r1 = /^https:\\/\\/api\\.stripe\\.com\\/v1\\/subscriptions\\/([^?]+)/.exec(u);
  if (r1) { const sb = E.subs.find(x => x.id === decodeURIComponent(r1[1])); const f = E.factures[decodeURIComponent(r1[1])] || {};
    return sb ? json(Object.assign({}, sb, { latest_invoice: f.latest_invoice || null })) : json({ error: { message: 'inconnu' } }, 404); }
  if (u.startsWith('https://api.stripe.com/v1/invoices')) return json({ data: [], has_more: false });
  if (u.startsWith('https://api.stripe.com/v1/subscriptions')) return json({ data: E.subs, has_more: false });
  return json({ data: [], has_more: false });
};\n`);
    const vap = webpush.generateVAPIDKeys();
    fs.writeFileSync(path.join(R, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
      adminPassHash: sha('mot-de-passe-849'), stripe: { secretKey: 'sk_de_banc_849' },
      promos: [{ code: 'VIEUX-BANC-849', formule: 'premium', mois: 3 }] }));
    const PORT = 9800 + ((process.pid + n * 7) % 90);
    let journal = '';
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(R, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(R, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z', TEAMOP_STRIPE_CACHE_MS: '600000' }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfants.push(e);
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
    const B = 'http://127.0.0.1:' + PORT;
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    if (!vivant) console.log(journal.slice(0, 1500));
    const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: corps === undefined ? 'GET' : 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
      let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j: j || {} }; };
    return { vivant, appel, D, journal: () => journal, etat: async t => (await appel('/api/espaces/etat', { t })).j,
      patron: async () => (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-849' })).j.token };
  }
  /* la forme que l'application grise sans rien écrire (suspension au sursis écoulé, sans formule) */
  const SUSP = j => j.ok === true && j.paye === false && j.suspendu === true && j.sursisJours === 0 && !('formule' in j);
  const SERVIE = j => [j.paye === true, j.formule || null, !!j.suspendu];

  /* ══ 1. REGISTRE DES CODES LISIBLE — B, C, D, E, F, G ═════════════════════════════════════════════════ */
  const E1 = {
    /* B : l'ancien nom garde un « annulé » d'avant ; le récent (celui que lit l'application) paie Stripe */
    b1old: { t: 't-b1-849', nom: 'b1old', email: mail('b1'), ts: MAINT - 9000, formule: 'pro', quantite: 1, aboStatut: 'annule', aboPar: 'Banc' },
    b1new: { t: 't-b1-849', nom: 'b1new', email: mail('b1'), ts: MAINT - 1000, formule: 'pro', quantite: 1 },
    /* B (témoins) : « impayé » réglé par la Tour d'aujourd'hui sur l'ancien nom ; « annulé » sur un nom unique */
    b2old: { t: 't-b2-849', nom: 'b2old', email: mail('b2'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },
    b2new: { t: 't-b2-849', nom: 'b2new', email: mail('b2'), ts: MAINT - 1000, formule: 'pro', quantite: 1 },
    b3: { t: 't-b3-849', nom: 'b3', email: mail('b3'), ts: MAINT - 1000, formule: 'pro', quantite: 1, aboStatut: 'annule', aboPar: 'Banc' },
    /* C : la formule sur l'ancien nom, rien sur le récent ; l'abonnement d'avant trouvé par l'adresse de l'ANCIEN nom */
    c1old: { t: 't-c1-849', nom: 'c1old', email: mail('c1-ancienne'), ts: MAINT - 9000, formule: 'premium', quantite: 1 },
    c1new: { t: 't-c1-849', nom: 'c1new', email: '', ts: MAINT - 1000 },
    /* C : l'abonnement gravé à l'ANCIEN nom d'accès (d'anciennes pages de paiement), payé d'une autre adresse */
    c2old: { t: 't-c2-849', nom: 'c2old', email: mail('c2a'), ts: MAINT - 9000, formule: 'premium', quantite: 1 },
    c2new: { t: 't-c2-849', nom: 'c2new', email: mail('c2b'), ts: MAINT - 1000 },
    /* C (témoin) : une entreprise sans rien, à une autre adresse — suspendue */
    c5: { t: 't-c5-849', nom: 'c5', email: mail('c5'), ts: MAINT - 1000 },
    /* D : repartie à neuf (nouvel identifiant, même adresse, fiche vide) — sa période est sous l'ancien identifiant */
    d1: { t: 't-d1-neuf-849', nom: 'd1', email: mail('d1'), ts: MAINT - 1000 },
    /* D (témoins) : une période en cours chez une AUTRE entreprise VIVANTE à la même adresse ; une période ÉCHUE */
    d2a: { t: 't-d2a-849', nom: 'd2a', email: mail('d2'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },
    d2b: { t: 't-d2b-849', nom: 'd2b', email: mail('d2'), ts: MAINT - 1000 },
    d3: { t: 't-d3-neuf-849', nom: 'd3', email: mail('d3'), ts: MAINT - 1000 },
    /* E : sans formule (et « Gratuit », témoin), payée par un tarif qu'on ne sait pas lire */
    e1: { t: 't-e1-849', nom: 'e1', email: mail('e1'), ts: MAINT - 1000 },
    e2: { t: 't-e2-849', nom: 'e2', email: mail('e2'), ts: MAINT - 1000, formule: 'gratuit', quantite: 1 },
    /* G : deux noms, formule payée par la Tour (réglée à la main) */
    g1old: { t: 't-g1-849', nom: 'g1old', email: mail('g1'), ts: MAINT - 9000, formule: 'pro', quantite: 1, aboStatut: 'actif', aboPar: 'Banc' },
    g1new: { t: 't-g1-849', nom: 'g1new', email: mail('g1'), ts: MAINT - 1000, formule: 'pro', quantite: 1, aboStatut: 'actif', aboPar: 'Banc' } };
  const U1 = { 'VIEUX-BANC-849': { n: 3, equipes: {
    't-d1-ancien-849': { date: jour(-10), finLe: jour(30), em: em(mail('d1')) },   // l'ancien identifiant n'est plus à l'annuaire
    't-d2a-849': { date: jour(-10), finLe: jour(30), em: em(mail('d2')) },
    't-d3-ancien-849': { date: jour(-100), finLe: jour(-10), em: em(mail('d3')) } } } };
  const S1 = [
    abo('sub_b1', 'active', 'pro', 1, 't-b1-849', mail('b1')),
    abo('sub_b2', 'active', 'pro', 1, 't-b2-849', mail('b2')),
    abo('sub_b3', 'active', 'pro', 1, 't-b3-849', mail('b3')),
    abo('sub_c1', 'active', 'premium', 1, '', mail('c1-ancienne')),
    abo('sub_c2', 'active', 'premium', 1, 'c2old', mail('comptable-c2')),
    abo('sub_e1', 'active', 'inconnu', 3, '', mail('e1')),
    abo('sub_e2', 'active', 'inconnu', 3, '', mail('e2')) ];
  const s1 = await demarrer(E1, U1, S1);
  vrai('le vrai serveur démarre, isolé (registre des codes lisible)', s1.vivant);
  if (!s1.vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  vrai('(population) /health : le registre des codes est lisible', ((await s1.appel('/health')).j.registres || {}).promos === true);

  console.log('\n  B · un réglage négatif d\'avant, resté sur un ancien nom');
  v('⛔⛔ « annulé » d\'avant sur l\'ANCIEN nom, Stripe payé : l\'entreprise reste servie (Pro)', SERVIE(await s1.etat('t-b1-849')), [true, 'pro', false]);
  v('   … un « annulé » sur un nom UNIQUE décide toujours (réglé à la main, avant Stripe)', SUSP(await s1.etat('t-b3-849')), true);
  const PATRON = await s1.patron();
  vrai('(population) la Tour se connecte', !!PATRON);
  const rB = await s1.appel('/api/monitor/espaces/abonnement', { nom: 'b2old', formule: 'pro', quantite: 1, statut: 'impaye', fin: '' }, PATRON);
  const eB = await s1.etat('t-b2-849');
  v('⛔⛔ « impayé » réglé AUJOURD\'HUI par la Tour sur l\'ancien nom : il suit l\'entreprise (suspendue, sans formule)', [rB.s, SUSP(eB)], [200, true]);
  const regB = JSON.parse(fs.readFileSync(path.join(s1.D, 'espaces.json'), 'utf8'));
  v('   … écrit sur ses DEUX noms (c\'est ce qui le distingue d\'un réglage d\'avant)', [regB.b2old.aboStatut, regB.b2new.aboStatut], ['impaye', 'impaye']);

  console.log('\n  C · l\'abonnement d\'une entreprise renommée');
  v('⛔⛔ trouvé par l\'adresse de l\'ANCIEN nom : servie en Business Premium', SERVIE(await s1.etat('t-c1-849')), [true, 'premium', false]);
  v('⛔⛔ gravé à l\'ANCIEN nom d\'accès, payé d\'une autre adresse : servie en Business Premium', SERVIE(await s1.etat('t-c2-849')), [true, 'premium', false]);
  v('   … une entreprise sans rien, à une autre adresse : suspendue', SUSP(await s1.etat('t-c5-849')), true);

  console.log('\n  D · « repartir à neuf » pendant une période offerte');
  const eD = await s1.etat('t-d1-neuf-849');
  v('⛔⛔ la période restée sous l\'ancien identifiant (empreinte de l\'e-mail) la sert : Business Premium, payée', SERVIE(eD), [true, 'premium', false]);
  vrai('   … et le motif public dit le code et sa fin (ce que l\'application lit)', /VIEUX-BANC-849/.test(eD.motif || '') && (eD.motif || '').includes(jour(30)));
  v('⛔ la période d\'une AUTRE entreprise VIVANTE à la même adresse ne se prête pas : suspendue', SUSP(await s1.etat('t-d2b-849')), true);
  v('   … et cette autre entreprise, elle, est servie par sa période', SERVIE(await s1.etat('t-d2a-849')), [true, 'premium', false]);
  v('   … une période ÉCHUE sous l\'ancien identifiant ne sert rien : suspendue', SUSP(await s1.etat('t-d3-neuf-849')), true);

  console.log('\n  E · un tarif qu\'on ne sait pas lire');
  v('⛔ fiche SANS formule, abonnement d\'OP GESTION illisible : Business Premium (elle avait tout l\'accès)', SERVIE(await s1.etat('t-e1-849')), [true, 'premium', false]);
  v('   … fiche « Gratuit », même abonnement : Pro (la formule d\'entrée, un gain pour elle)', SERVIE(await s1.etat('t-e2-849')), [true, 'pro', false]);

  console.log('\n  F · G · le métier');
  const rG = await s1.appel('/api/monitor/espaces/metier', { nom: 'g1old', metier: 'nettoyage' }, PATRON);
  const eG = await s1.etat('t-g1-849');
  v('⛔ le métier posé sur l\'ANCIEN nom atteint l\'application (qui lit le nom récent)', [rG.s, eG.metier], [200, 'nettoyage']);
  const regG = JSON.parse(fs.readFileSync(path.join(s1.D, 'espaces.json'), 'utf8'));
  v('   … écrit sur ses deux noms', [regG.g1old.metier, regG.g1new.metier], ['nettoyage', 'nettoyage']);
  await dormir(100);
  const ligne = s1.journal().split('\n').find(l => /règle le métier/.test(l)) || '';
  vrai('(population) le journal porte la ligne du métier', !!ligne);
  vrai('⛔ … sans le nom d\'accès (souvent celui d\'une personne), avec l\'identifiant de l\'entreprise', !/g1old/.test(ligne) && /t-g1-849/.test(ligne));

  /* ══ 2. REGISTRE DES CODES ILLISIBLE — A ═══════════════════════════════════════════════════════════════ */
  console.log('\n  A · registre des codes illisible, un code sur la fiche');
  const E2 = {
    a1: { t: 't-a1-849', nom: 'a1', email: mail('a1'), ts: MAINT - 1000, formule: 'pro', quantite: 1, codePromo: 'VIEUX-BANC-849' },
    a2: { t: 't-a2-849', nom: 'a2', email: mail('a2'), ts: MAINT - 1000, formule: 'pro', quantite: 1, codePromo: 'VIEUX-BANC-849' } };
  const S2 = [abo('sub_a1', 'past_due', 'pro', 1, 't-a1-849', mail('a1'))];
  const s2 = await demarrer(E2, '{"VIEUX-BANC-849": {"n": 1, "equipes": {', S2,
    { sub_a1: { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: 'https://invoice.stripe.com/i/banc-849-a1' } } });
  vrai('le vrai serveur démarre, isolé (registre des codes TRONQUÉ)', s2.vivant);
  vrai('(population) /health : le registre des codes est illisible', ((await s2.appel('/health')).j.registres || {}).promos === false);
  v('⛔⛔ un IMPAYÉ Stripe n\'est pas couvert par le doute du registre : suspendue, sans formule', SUSP(await s2.etat('t-a1-849')), true);
  const PATRON2 = await s2.patron();
  const L2 = ((await s2.appel('/api/monitor/espaces/liste', undefined, PATRON2)).j.espaces || []);
  const la1 = L2.find(x => x.slug === 'a1' || x.nom === 'a1') || {};
  vrai('   … et la Tour le voit comme un impayé', la1.impaye === true);
  v('   … sans impayé, le doute sert toujours la formule du code (on ne coupe pas une période qu\'on ne peut plus lire)',
    SERVIE(await s2.etat('t-a2-849')), [true, 'premium', false]);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); });
