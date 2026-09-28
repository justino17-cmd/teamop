/* ⛔ CE QUE CE FICHIER GARDE — LES PLACES SE PAIENT, ET LES ABONNÉS D'AVANT GARDENT LES LEURS.

   Justin, 28 septembre 2026, à deux questions posées le même soir :
     · « Je fais lire au serveur le nombre d'abonnements payés chez Stripe pour donner les places tout seul ? » → « Oui,
       automatique ». Jusque-là, `espacePaye` ne lisait chez Stripe que « un abonnement vivant, oui ou non » : payer un
       abonnement de plus ne donnait AUCUNE place tant que TEAM OP ne réglait pas la Tour ;
     · « Quand l'application passe à 1 utilisateur par abonnement, les entreprises déjà abonnées gardent-elles leurs
       places ? » → « Oui, elles gardent ».
   Ce banc fait parler le VRAI serveur (127.0.0.1, Stripe simulé par un préchargement qui remplace `fetch`) et lit ce que
   l'APPLICATION lit : `quantite` dans `/api/espaces/etat`. Entreprises fictives, adresses fictives, aucune clé réelle. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b842-'));
let enfant = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 60000).unref();

console.log('\n── 842 · les places se paient chez Stripe, et les abonnés d\'avant la v763 gardent les leurs ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '');
  const sha = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');
  const JOUR = 86400000, BASCULE = Date.parse('2026-09-28T21:00:00Z');
  const AVANT = BASCULE - 30 * JOUR, APRES = Date.now() + JOUR;
  const dans = n => new Date(Date.now() + n * JOUR).toISOString().slice(0, 10);
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });

  /* Une entrée d'annuaire par cas. `t` en clair, et le code (sans clé réelle) comme les entrées ordinaires. */
  const E = {};
  const esp = (slug, o) => { const t = 'ent-' + slug + '-842'; E[slug] = Object.assign({ slug, nom: slug, email: '', t, code: b64({ t, k: 'CLE-' + slug.toUpperCase() + '-842', n: slug }), ts: 1 }, o); return t; };
  esp('ancienbiz', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron', aboStatut: 'actif' });
  esp('ancienprem', { formule: 'premium', quantite: 2, formuleTs: AVANT, formulePar: 'Patron', aboStatut: 'actif' });
  esp('sansdate', { formule: 'premium', quantite: 1, formulePar: 'Patron', aboStatut: 'actif' });
  const tPromo = esp('promoprem', { formule: 'premium', quantite: 1, formuleTs: AVANT, formulePar: 'Patron (code)' });
  esp('sitecode', { formule: 'premium', quantite: 1, formuleTs: AVANT, formulePar: 'code BIENVENUE-BANC-842 (site)', aboStatut: 'actif' });
  esp('essaibiz', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron', aboStatut: 'essai', aboFin: dans(20) });
  esp('neufbiz', { formule: 'business', quantite: 1, formuleTs: APRES, formulePar: 'Patron', aboStatut: 'actif' });
  esp('impaye', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  const tS3 = esp('stripetrois', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  const tS2 = esp('stripedeux', { formule: 'business', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  const tAS = esp('ancienstripe', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  const tASP = esp('ancienplus', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  esp('parmail', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron', email: 'paie@exemple-842.fr' });
  const tBorne = esp('borne', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  esp('tourplus', { formule: 'pro', quantite: 5, formuleTs: APRES, formulePar: 'Patron' });
  const tTP = E.tourplus.t;
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(E));
  /* le code promo de « promoprem », en cours */
  fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify({ 'BIENVENUE-BANC-842': { n: 1, equipes: { [tPromo]: { date: dans(-10), finLe: dans(80) } } } }));

  /* Stripe simulé : les abonnements, TOUS statuts confondus, comme `stripeAbosBruts` les demande. */
  const abo = (id, espace, status, quantites, email) => ({ id, status, metadata: espace ? { espace } : {},
    customer: { id: 'cus_' + id, email: email || '' }, current_period_end: Math.floor(Date.now() / 1000) + 20 * 86400,
    items: { data: quantites.map((q, i) => ({ id: 'si_' + id + i, quantity: q })) } });
  const SUBS = [
    abo('s3', tS3, 'active', [3]),
    abo('d1', tS2, 'active', [1]), abo('d2', tS2.toUpperCase(), 'trialing', [2]), abo('dx', tS2, 'canceled', [5]),
    abo('a1', tAS, 'active', [1]),
    abo('p4', tASP, 'past_due', [4]),
    abo('m2', '', 'active', [2], 'PAIE@exemple-842.fr'), abo('m7', '', 'active', [7], 'autre@exemple-842.fr'),
    abo('b9', tBorne, 'active', [999]),
    abo('t2', tTP, 'active', [2]) ];
  const PRECHARGE = path.join(banc, 'stripe-842.js');
  fs.writeFileSync(PRECHARGE, `const vrai = globalThis.fetch; const SUBS = ${JSON.stringify(SUBS)};
globalThis.fetch = async function (url, opts) {
  const u = String(url);
  if (u.startsWith('https://api.stripe.com/')) {
    const corps = u.startsWith('https://api.stripe.com/v1/subscriptions') ? { data: SUBS, has_more: false } : { data: [], has_more: false };
    return new Response(JSON.stringify(corps), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return vrai(url, opts);
};`);
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey,
    apiKey: 'banc', adminPassHash: sha('mot-de-passe-banc-842'),
    stripe: { secretKey: 'cle-stripe-fictive-banc-842' },
    promos: [{ code: 'BIENVENUE-BANC-842', formule: 'premium', mois: 3 }] }));
  const PORT = 9400 + (process.pid % 250);
  let journal = '';
  enfant = spawn(process.execPath, ['--require', PRECHARGE, SERVEUR], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
      TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre, isolé, avec Stripe simulé', vivant);
  if (!vivant) { console.log(journal.slice(0, 800)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const etat = async slug => { const r = await fetch(B + '/api/espaces/etat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: E[slug].t }) });
    let j = {}; try { j = await r.json(); } catch (e) {} return j; };

  try {
    console.log('\n1. Les entreprises abonnées AVANT la bascule gardent leurs places');
    let j = await etat('ancienbiz');
    v('Business payée, réglée avant : 1 abonnement → 2 places (ce que donnait la v760)', [j.paye, j.quantite], [true, 2]);
    j = await etat('ancienprem');
    v('Business Premium payée, réglée avant : 2 abonnements → 6 places', [j.paye, j.quantite], [true, 6]);
    j = await etat('sansdate');
    v('une formule sans date de réglage (entrée ancienne) compte comme d\'avant : 3 places', j.quantite, 3);
    j = await etat('ancienstripe');
    v('Business d\'avant, payée chez Stripe à quantité 1 → 2 places (le plus grand)', [j.paye, j.quantite], [true, 2]);

    console.log('\n2. Une période OFFERTE ne garde rien : à la fin, on paie chaque utilisateur');
    j = await etat('promoprem');
    v('⛔ Business Premium par code promo en cours → 1 (l\'application couvre l\'équipe pendant le code)', [j.paye, j.quantite], [true, 1]);
    j = await etat('sitecode');
    v('⛔ formule posée par un code du site, même réglée « actif » ensuite → 1', j.quantite, 1);
    j = await etat('essaibiz');
    v('⛔ essai offert par la Tour → 1', [j.paye, j.quantite], [true, 1]);
    j = await etat('neufbiz');
    v('⛔ formule réglée APRÈS la bascule : un abonnement = un utilisateur → 1', j.quantite, 1);
    j = await etat('impaye');
    v('⛔ une entreprise qui ne paie pas ne garde rien → 1', [j.paye, j.quantite], [false, 1]);

    console.log('\n3. Ce qui est payé chez Stripe donne les places, tout seul');
    j = await etat('stripetrois');
    v('un abonnement à quantité 3 → 3 places', [j.paye, j.quantite], [true, 3]);
    j = await etat('stripedeux');
    v('deux abonnements vivants (1 + 2, référence en majuscules comprise) → 3 ; l\'annulé (5) ne compte pas', [j.paye, j.quantite], [true, 3]);
    j = await etat('ancienplus');
    v('Business d\'avant qui paie 4 (même en retard de paiement) → 4, pas 2', [j.paye, j.quantite], [true, 4]);
    j = await etat('parmail');
    v('rattachée par l\'adresse (casse ignorée) → ses 2 places, pas les 7 d\'un autre client', [j.paye, j.quantite], [true, 2]);
    j = await etat('borne');
    v('⛔ une quantité folle est bornée à 50', j.quantite, 50);
    j = await etat('tourplus');
    v('la Tour en a donné 5, Stripe en paie 2 → 5 (un geste commercial ne se perd pas)', j.quantite, 5);

    console.log('\n4. Rien n\'est écrit, rien ne fuit');
    const apres = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
    v('⛔ le registre n\'a pas bougé : les places d\'avant se calculent, elles ne s\'écrivent pas',
      Object.keys(E).filter(s => (apres[s] || {}).quantite !== E[s].quantite), []);
    vrai('⛔ le journal ne recopie aucune adresse en clair', !/\w@exemple-842\.fr/i.test(journal));
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})();
