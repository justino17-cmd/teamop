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
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();

console.log('\n── 842 · les places se paient chez Stripe, et les abonnés d\'avant la v763 gardent les leurs ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '');
  const sha = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');
  /* La bascule de production est posée APRÈS le déploiement (`gardien`, A8) : un banc qui la lirait jouerait « avant » ou
     « après » selon l'heure où il tourne. Le serveur du banc la reçoit une heure dans le passé (`TEAMOP_PLACES_BASCULE`) :
     les gestes de la Tour faits pendant le banc sont « après », comme ils le seront en service. */
  const JOUR = 86400000, BASCULE = Date.now() - 3600000;
  const AVANT = BASCULE - 30 * JOUR, APRES = Date.now() + JOUR;
  const dans = n => new Date(Date.now() + n * JOUR).toISOString().slice(0, 10);
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });

  /* Une entrée d'annuaire par cas. `t` en clair, et le code (sans clé réelle) comme les entrées ordinaires. */
  const E = {};
  const esp = (slug, o) => { const t = 'ent-' + slug + '-842'; E[slug] = Object.assign({ slug, nom: slug, email: '', t, code: b64({ t, k: 'CLE-' + slug.toUpperCase() + '-842', n: slug }), ts: 1 }, o); return t; };
  /* abonnés d'avant, réglés À LA MAIN dans la Tour */
  esp('ancienbiz', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron', aboStatut: 'actif' });
  esp('ancienprem', { formule: 'premium', quantite: 2, formuleTs: AVANT, formulePar: 'Patron', aboStatut: 'actif', aboTs: AVANT });
  esp('sansdate', { formule: 'premium', quantite: 1, formulePar: 'Patron', aboStatut: 'actif' });
  esp('aboapres', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron', aboStatut: 'actif', aboTs: APRES });
  esp('neufbiz', { formule: 'business', quantite: 1, formuleTs: APRES, formulePar: 'Patron', aboStatut: 'actif' });
  esp('essaibiz', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron', aboStatut: 'essai', aboFin: dans(20) });
  esp('sitecode', { formule: 'premium', quantite: 1, formuleTs: AVANT, formulePar: 'code BIENVENUE-BANC-842 (site)', aboStatut: 'actif' });
  esp('impaye', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  /* périodes offertes */
  const tPromo = esp('promoprem', { formule: 'premium', quantite: 1, formuleTs: AVANT, formulePar: 'Patron (code)' });
  const tPromoTour = esp('promotour', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  const tFini = esp('promofini', { formule: 'premium', quantite: 5, formuleTs: AVANT, formulePar: 'auto (demande)', codePromo: 'FINI-BANC-842' });
  /* payées chez Stripe */
  const tFA = esp('finiavant', { formule: 'premium', quantite: 5, formuleTs: AVANT, formulePar: 'Patron', codePromo: 'FINIDEUX-BANC-842' });
  const tAM = esp('ancienmsg', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  const tAS = esp('ancienstripe', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  const tASP = esp('ancienplus', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  const tAJ = esp('ancienajout', { formule: 'premium', quantite: 2, formuleTs: AVANT, formulePar: 'Patron' });
  const tS3 = esp('stripetrois', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  const tS2 = esp('stripedeux', { formule: 'business', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  const tMT = esp('mauvaistarif', { formule: 'premium', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  const tMS = esp('avecmessages', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  esp('parmail', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron', email: 'paie@exemple-842.fr' });
  const tAutre = esp('autremail', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron', email: 'paie@exemple-842.fr' });
  const tBorne = esp('borne', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  const tTP = esp('tourplus', { formule: 'pro', quantite: 5, formuleTs: APRES, formulePar: 'Patron' });
  /* les cas de la contre-relecture de `gardien` (28 septembre 2026, nuit) */
  const tMX = esp('mixte', { formule: 'premium', quantite: 2, formuleTs: AVANT, formulePar: 'Patron', email: 'mixte@exemple-842.fr' });
  const tCA = esp('changeapres', { formule: 'business', quantite: 10, formuleTs: APRES, formulePar: 'Patron' });
  const tMO = esp('montee', { formule: 'premium', quantite: 1, formuleTs: APRES, formuleDepuis: APRES, formulePar: 'Patron' });
  const tD5 = esp('demande50', { formule: 'premium', quantite: 50, formuleTs: AVANT, formulePar: 'auto (demande)' });
  const tTH = esp('tarifhaut', { formule: 'business', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  const tGR = esp('graveur', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron', email: 'grave@exemple-842.fr' });
  esp('seulgrave', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron', email: 'grave@exemple-842.fr' });
  esp('repartie', { formule: 'pro', quantite: 1, formuleTs: APRES, formulePar: 'Patron', email: 'repartie@exemple-842.fr' });
  esp('retard', { formule: 'premium', quantite: 1, formuleTs: AVANT, formulePar: 'Patron', aboStatut: 'actif', aboTs: AVANT });
  esp('nouvelle', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  /* seconde relecture (`gardien`, fb51f31) : une entreprise à DEUX noms (même `t`), un nombre relevé après la bascule,
     « impayé » → « auto » → « actif », une formule changée par la Tour */
  const tDN = esp('deuxnoms', { formule: 'premium', quantite: 2, formuleTs: AVANT, formulePar: 'Patron', email: 'deuxnoms@exemple-842.fr' });
  esp('deuxnomsbis', { formule: 'premium', quantite: 2, formuleTs: AVANT, formulePar: 'Patron', email: 'deuxnoms@exemple-842.fr', t: tDN });
  const tRL = esp('relevee', { formule: 'business', quantite: 2, formuleTs: APRES, formulePar: 'Patron' });
  esp('detour', { formule: 'premium', quantite: 1, formuleTs: AVANT, formulePar: 'Patron', aboStatut: 'impaye', aboTs: AVANT });
  const tPA = esp('passe', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  /* ⛔ LA FORMULE SERVIE (Justin, 29 septembre 2026 : « ils choisissent le tarif qu'ils veulent » ; « le code promo, mets-le
     au plus gros forfait ») : l'application reçoit la formule PAYÉE, et une période offerte sert celle du code */
  const tGP = esp('gratuitpaie', { formule: 'gratuit', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  esp('gratuitrien', { formule: 'gratuit', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  const tMG = esp('msgseul', { formule: 'business', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  const tMA = esp('montetarif', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  const tPP = esp('promopetit', { formule: 'premium', quantite: 1, formuleTs: AVANT, formulePar: 'Patron (code)' });
  const tPN = esp('promonu', { formule: 'business', quantite: 1, formuleTs: AVANT, formulePar: 'Patron' });
  const tPH = esp('promohors', { formule: 'pro', quantite: 1, formuleTs: AVANT, formulePar: 'Patron (code)' });
  /* ⛔ la relecture adverse du 29 septembre 2026 (rejouée) : ce qui est AMBIGU ne décide pas de la formule — monter sur ce
     qui est sûrement à elle, descendre seulement sans doute ; plusieurs formules : celle qui porte le plus d'abonnements */
  const tRM = esp('reparmsg', { formule: 'premium', quantite: 3, formuleTs: APRES, formulePar: 'Patron', email: 'reparmsg@exemple-842.fr' });
  const tML = esp('melee', { formule: 'pro', quantite: 10, formuleTs: APRES, formulePar: 'Patron' });
  esp('petite', { formule: 'gratuit', quantite: 1, formuleTs: APRES, formulePar: 'Patron', email: 'commune@exemple-842.fr' });
  esp('grande', { formule: 'premium', quantite: 4, formuleTs: APRES, formulePar: 'Patron', email: 'commune@exemple-842.fr' });
  const tGC = esp('gratuitcode', { formule: 'gratuit', quantite: 1, formuleTs: APRES, formulePar: 'Patron' });
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(E));
  /* les codes : l'un en cours (promoprem, promotour), l'autre FINI hier (promofini) */
  fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify({
    'BIENVENUE-BANC-842': { n: 2, equipes: { [tPromo]: { date: dans(-10), finLe: dans(80) }, [tPromoTour]: { date: dans(-5), finLe: dans(85) } } },
    'FINI-BANC-842': { n: 1, equipes: { [tFini]: { date: dans(-91), finLe: dans(-1) } } },
    'FINIDEUX-BANC-842': { n: 1, equipes: { [tFA]: { date: dans(-120), finLe: dans(-30) } } },
    'PETIT-BANC-842': { n: 1, equipes: { [tPP]: { date: dans(-10), finLe: dans(80) } } },
    'NU-BANC-842': { n: 1, equipes: { [tPN]: { date: dans(-10), finLe: dans(80) } } },
    'HORS-BANC-842': { n: 1, equipes: { [tPH]: { date: dans(-10), finLe: dans(80) } } },
    'OFFERT-BANC-842': { n: 1, equipes: { [tGC]: { date: dans(-10), finLe: dans(80) } } } }));

  /* Stripe simulé : les abonnements, TOUS statuts confondus, comme `stripeAbosBruts` les demande. Les tarifs sont les
     VRAIS identifiants (publics) de la page de paiement. */
  const RECAP = fs.readFileSync(path.join(RACINE, 'recap-abonnement.html'), 'utf8');
  const PRIX = {}; for (const m of RECAP.matchAll(/^\s*(\w+):\s*\{ mensuel: '(price_\w+)', annuel: '(price_\w+)' \}/gm)) PRIX[m[1]] = [m[2], m[3]];
  const S_AVANT = Math.floor(AVANT / 1000), S_APRES = Math.floor((BASCULE + 60000) / 1000);
  const abo = (id, espace, status, lignes, cree, email) => ({ id, status, created: cree, metadata: espace ? { espace } : {},
    customer: { id: 'cus_' + id, email: email || '' }, current_period_end: Math.floor(Date.now() / 1000) + 20 * 86400,
    items: { data: lignes.map(([f, q], i) => ({ id: 'si_' + id + i, quantity: q, price: { id: (PRIX[f] || ['price_ancienlien842'])[0], product: { name: f.startsWith('msg') ? 'OP MESSAGES' : 'OP GESTION' } } })) } });
  const SUBS = [
    abo('a1', tAS, 'active', [['business', 1]], S_AVANT),
    abo('fa', tFA, 'active', [['premium', 1]], S_AVANT),
    abo('am', tAM, 'active', [['business', 1], ['msgpro', 3]], S_AVANT),
    /* actif, pas « past_due » : depuis le 29 septembre 2026 une carte refusée est un impayé, qui ne sert plus rien (test-845) */
    abo('p4', tASP, 'active', [['ancien', 4]], S_AVANT),
    abo('j1', tAJ, 'active', [['premium', 2]], S_AVANT), abo('j2', tAJ, 'active', [['premium', 1]], S_APRES),
    abo('s3', tS3, 'active', [['pro', 3]], S_APRES),
    abo('d1', tS2, 'active', [['business', 1]], S_APRES), abo('d2', tS2.toUpperCase(), 'trialing', [['business', 2]], S_APRES), abo('dx', tS2, 'canceled', [['business', 5]], S_APRES),
    abo('mt', tMT, 'active', [['pro', 20]], S_APRES),
    abo('ms', tMS, 'active', [['pro', 2], ['msgpro', 5]], S_APRES),
    abo('m2', '', 'active', [['pro', 2]], S_APRES, 'PAIE@exemple-842.fr'), abo('m7', '', 'active', [['pro', 7]], S_APRES, 'autre@exemple-842.fr'),
    abo('m9', tAutre, 'active', [['pro', 9]], S_APRES, 'paie@exemple-842.fr'),
    abo('b9', tBorne, 'active', [['pro', 999]], S_APRES),
    abo('t2', tTP, 'active', [['pro', 2]], S_APRES),
    abo('f1', tFini, 'active', [['premium', 1]], S_APRES),
    abo('x1', '', 'active', [['premium', 2]], S_AVANT, 'mixte@exemple-842.fr'), abo('x2', tMX, 'active', [['premium', 1]], S_APRES, 'mixte@exemple-842.fr'),
    abo('ca', tCA, 'active', [['business', 1]], S_AVANT),
    abo('mo', tMO, 'active', [['business', 1]], S_AVANT),
    abo('d5', tD5, 'active', [['premium', 1]], S_AVANT),
    abo('th', tTH, 'active', [['premium', 3]], S_APRES),
    abo('gr', tGR, 'active', [['pro', 4]], S_APRES, 'grave@exemple-842.fr'),
    abo('rp', 'ent-ancienne-842', 'active', [['pro', 2]], S_APRES, 'repartie@exemple-842.fr'),
    abo('n1', '', 'active', [['premium', 2]], S_AVANT, 'deuxnoms@exemple-842.fr'), abo('n2', tDN, 'active', [['premium', 1]], S_APRES, 'deuxnoms@exemple-842.fr'),
    abo('rl', tRL, 'active', [['business', 1]], S_AVANT),
    abo('pa', tPA, 'active', [['business', 1]], S_AVANT),
    abo('gp', tGP, 'active', [['business', 2]], S_APRES),
    abo('mg', tMG, 'active', [['msgpro', 2]], S_APRES),
    abo('mA', tMA, 'active', [['business', 1]], S_AVANT), abo('mB', tMA, 'active', [['premium', 2]], S_APRES),
    abo('rm1', 'ent-reparmsg-ancien-842', 'active', [['premium', 3]], S_APRES, 'reparmsg@exemple-842.fr'), abo('rm2', tRM, 'active', [['msgpro', 1]], S_APRES, 'reparmsg@exemple-842.fr'),
    abo('ml1', tML, 'active', [['pro', 10]], S_APRES), abo('ml2', tML, 'active', [['premium', 1]], S_APRES),
    abo('pg', '', 'active', [['premium', 4]], S_APRES, 'commune@exemple-842.fr') ];
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
    promos: [{ code: 'BIENVENUE-BANC-842', formule: 'premium', mois: 3 }, { code: 'PETIT-BANC-842', formule: 'pro', mois: 3 }, { code: 'NU-BANC-842', mois: 3 }, { code: 'OFFERT-BANC-842', mois: 3 }] }));
  const PORT = 9400 + (process.pid % 250);
  let journal = '';
  enfant = spawn(process.execPath, ['--require', PRECHARGE, SERVEUR], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
      TEAMOP_PLACES_BASCULE: new Date(BASCULE).toISOString(),
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
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: corps === undefined ? 'GET' : 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };

  try {
    console.log('\n0. Les tarifs du serveur sont ceux de la page de paiement');
    const SRV = fs.readFileSync(SERVEUR, 'utf8');
    const srvPrix = {}; for (const m of SRV.matchAll(/^\s*(\w+): \['(price_\w+)', '(price_\w+)'\]/gm)) srvPrix[m[1]] = [m[2], m[3]];
    vrai('population : cinq formules payantes lues dans la page (' + Object.keys(PRIX).join(', ') + ')', Object.keys(PRIX).length === 5);
    v('⛔ STRIPE_PRIX_FORMULE (serveur) = STRIPE_PRICES (recap-abonnement.html) — un tarif changé d\'un seul côté, et des clients qui paient n\'auraient plus de places', srvPrix, PRIX);

    console.log('\n1. `quantite` garde son sens pour la v760 en service ; les places ont leur champ');
    const tous = {}; for (const slug of Object.keys(E)) tous[slug] = await etat(slug);
    /* ⛔ un impayé (carte refusée, ou posé à la main dans la Tour) se sert SANS formule ni places, comme une suspension au sursis
       écoulé (29 septembre 2026, test-845) : l'application grise sans rien écrire. ⛔⛔ ET DEPUIS LE 30 SEPTEMBRE 2026, TOUT CE
       QUI N'EST PAS PAYÉ (Justin : « si une entreprise ne paye plus, le service est suspendu tant que c'est pas réglé » ; plus
       de formule Gratuit) : rien de payé, fiche « Gratuit » sans rien, OP MESSAGES seul, l'abonnement d'une voisine d'adresse.
       Les contrôles de population les écartent, NOMMÉS un par un. */
    const formeB = sl => tous[sl].suspendu === true && tous[sl].sursisJours === 0 && !('formule' in tous[sl]) && !('places' in tous[sl]);
    v('   (population) ce qui n\'est pas payé est servi sans formule ni places — rien de payé (impaye, nouvelle), l\'impayé posé à la main (detour), fiche Gratuit sans rien (gratuitrien), OP MESSAGES seul (msgseul), l\'adresse d\'une autre (petite) — et eux seuls',
      Object.keys(E).filter(formeB), ['impaye', 'nouvelle', 'detour', 'gratuitrien', 'msgseul', 'petite']);
    v('⛔ pour CHAQUE entreprise, `quantite` = le nombre réglé dans la Tour, jamais multiplié (la v760 fait × 2 ou × 3 elle-même)',
      Object.keys(E).filter(sl => !formeB(sl) && tous[sl].quantite !== E[sl].quantite), []);
    vrai('   et `places` est rendu partout (hors impayé)', Object.keys(E).filter(sl => !formeB(sl)).every(sl => Number.isInteger(tous[sl].places)));
    const pl = sl => tous[sl].places;

    console.log('\n2. Les abonnés d\'avant, réglés à la main dans la Tour, gardent leurs places');
    v('Business « actif » d\'avant : 1 abonnement → 2 places', [tous.ancienbiz.paye, pl('ancienbiz')], [true, 2]);
    v('Business Premium « actif » d\'avant : 2 abonnements → 6 places', pl('ancienprem'), 6);
    v('entrée ancienne sans date : 3 places', pl('sansdate'), 3);
    v('⛔ abonnement activé APRÈS la bascule (formule d\'avant) → 1', pl('aboapres'), 1);
    v('⛔ formule réglée APRÈS la bascule → 1', pl('neufbiz'), 1);
    v('⛔ essai offert → 1', pl('essaibiz'), 1);
    v('⛔ formule venue d\'un code du site, puis « actif » → 1', pl('sitecode'), 1);
    v('⛔ rien de payé (fiche Business, ni abonnement ni code) → suspendue, sans places (v767)', [tous.impaye.paye, tous.impaye.suspendu, pl('impaye')], [false, true, undefined]);

    console.log('\n3. Les périodes offertes ne gardent rien');
    v('⛔ code en cours (repère « code » dans la formule) → 1', [tous.promoprem.paye, pl('promoprem')], [true, 1]);
    v('⛔ code en cours sur une formule réglée à la main → 1', [tous.promotour.paye, pl('promotour')], [true, 1]);
    v('⛔ code FINI, payée ensuite chez Stripe 1 abonnement → 1 (pas 15 : à la fin d\'un code, on paie chaque utilisateur)', [tous.promofini.paye, pl('promofini')], [true, 1]);

    console.log('\n4. Payé chez Stripe : les places suivent le paiement');
    v('Business d\'avant, 1 abonnement souscrit avant → 2', pl('ancienstripe'), 2);
    v('⛔ abonnement d\'avant qui porte aussi OP MESSAGES × 3 → 2 (OP MESSAGES ne compte pas)', pl('ancienmsg'), 2);
    v('⛔ payait avant, mais a eu un code (fini) → 1 par abonnement, pas 15', pl('finiavant'), 1);
    v('Business d\'avant, 4 abonnements souscrits avant (ancien lien) → 8 : ce qu\'elle payait, × 2', pl('ancienplus'), 8);
    v('⛔ Business Premium d\'avant (2 → 6 places) + 1 abonnement acheté APRÈS → 7, pas 6', pl('ancienajout'), 7);
    v('un abonnement Pro à quantité 3 → 3', pl('stripetrois'), 3);
    v('deux abonnements vivants (1 + 2, référence en majuscules) → 3 ; l\'annulé ne compte pas', pl('stripedeux'), 3);
    v('⛔ fiche Business Premium payée au tarif Pro × 20 → l\'application reçoit PRO, 20 places (le client choisit son tarif, Justin, 29 septembre 2026)', [tous.mauvaistarif.formule, pl('mauvaistarif')], ['pro', 20]);
    v('⛔ Pro × 2 + OP MESSAGES × 5 sur le même abonnement → 2', pl('avecmessages'), 2);
    v('rattachée par l\'adresse → ses 2, ni les 7 d\'un autre client, ni les 9 gravés pour une AUTRE entreprise de la même adresse', pl('parmail'), 2);
    v('   l\'autre entreprise de la même adresse a bien ses 9 (par sa référence)', pl('autremail'), 9);
    v('⛔ une quantité folle est bornée à 50', pl('borne'), 50);
    v('⛔ la Tour en a réglé 5 (peut-être le nombre tapé dans la demande), Stripe en paie 2 → 2', pl('tourplus'), 2);

    console.log('\n4 bis. Les cas de la contre-relecture (`gardien`)');
    v('⛔ A1 · Business Premium d\'avant, 2 abonnements SANS référence (par l\'adresse) + 1 acheté après AVEC → 7, pas 1', [tous.mixte.paye, pl('mixte')], [true, 7]);
    v('⛔ A2 · nombre porté à 10 dans la Tour APRÈS la bascule, 1 abonnement Business payé avant → 2 (ce qu\'elle payait, × 2), pas 20', pl('changeapres'), 2);
    v('⛔    et relevé à 2 : toujours 2, le relever ne retire rien (seconde relecture)', pl('relevee'), 2);
    v('⛔ A2 · passée de Business à Business Premium APRÈS la bascule, 1 abonnement Business d\'avant → 1, pas 3', pl('montee'), 1);
    v('⛔ A3 · « 50 utilisateurs » tapés dans la demande, 1 abonnement payé avant → 3, pas 150', pl('demande50'), 3);
    v('⛔ A4 · fiche réglée Business, 3 abonnements Business Premium payés → 3 places, et l\'application reçoit Business Premium (ce qui est payé)', [pl('tarifhaut'), tous.tarifhaut.formule], [3, 'premium']);
    v('⛔ B1 · même adresse qu\'une entreprise qui paie : « payée » comme avant (on ne coupe JAMAIS une entreprise qui paie peut-être), mais 1 place : l\'abonnement gravé pour l\'autre ne lui en donne pas', [tous.seulgrave.paye, pl('seulgrave')], [true, 1]);
    v('   et celle qui paie a ses 4', [tous.graveur.paye, pl('graveur')], [true, 4]);
    v('   une référence qui ne désigne plus personne (« repartir à neuf ») → payée, et ses 2 places comptent', [tous.repartie.paye, pl('repartie')], [true, 2]);
    v('⛔ entreprise à DEUX noms (même `t`, même adresse), 2 abonnements d\'avant sans référence + 1 gravé → 7 : ses propres noms ne « partagent » pas l\'adresse', [tous.deuxnoms.paye, pl('deuxnoms')], [true, 7]);

    console.log('\n4 ter. La formule servie : ce qui est payé, ou ce que la période offerte sert (Justin, 29 septembre 2026)');
    v('⛔ fiche Gratuit qui paie Business × 2 : l\'application reçoit BUSINESS, payée, 2 places', [tous.gratuitpaie.formule, tous.gratuitpaie.paye, pl('gratuitpaie')], ['business', true, 2]);
    v('   contre-épreuve : fiche Gratuit sans abonnement — SUSPENDUE (le Gratuit n\'existe plus depuis le 30 septembre 2026)', [tous.gratuitrien.formule, tous.gratuitrien.paye, tous.gratuitrien.suspendu], [undefined, false, true]);
    v('⛔ fiche Business qui ne paie qu\'OP MESSAGES : OP GESTION n\'est pas payé — suspendue (plus de Gratuit servi)', [tous.msgseul.formule, tous.msgseul.paye, tous.msgseul.suspendu], [undefined, false, true]);
    v('⛔ un Business d\'avant + deux Business Premium d\'après : Business Premium (le plus d\'abonnements), 4 places — l\'ancien garde ses 2 places de Business (jamais le × 3 : ce serait 5), et monter n\'en retire aucune', [tous.montetarif.formule, pl('montetarif')], ['premium', 4]);
    v('⛔⛔ « repartie à neuf » : Business Premium × 3 gravé à l\'ancien identifiant + OP MESSAGES gravé au neuf → Business Premium, 3 places (pas « Gratuit » : relecture adverse du 29 septembre)', [tous.reparmsg.formule, tous.reparmsg.paye, pl('reparmsg')], ['premium', true, 3]);
    v('⛔ fiche Pro, dix Pro + un Business Premium pour le patron : Pro, 11 places — pas Business Premium avec une seule', [tous.melee.formule, pl('melee')], ['pro', 11]);
    v('⛔ fiche Gratuit à la même adresse qu\'une entreprise qui paie Business Premium sans référence : SUSPENDUE — un paiement ne sert pas deux entreprises (et l\'autre garde ses 4)', [tous.petite.formule, tous.petite.suspendu, tous.grande.formule, pl('grande')], [undefined, true, 'premium', 4]);
    v('⛔ fiche Gratuit avec un code en cours (validé dans l\'application, la fiche n\'a pas bougé) : Business Premium, le plus gros forfait', [tous.gratuitcode.formule, tous.gratuitcode.paye], ['premium', true]);
    v('⛔⛔ période offerte : un code Business Premium sur une fiche Business sert BUSINESS PREMIUM (« le plus gros forfait »)', [tous.promotour.formule, tous.promotour.paye], ['premium', true]);
    v('   un code qui ne dit pas sa formule : Business Premium', tous.promonu.formule, 'premium');
    v('   un code Pro sur une fiche Business Premium : jamais sous la fiche', tous.promopetit.formule, 'premium');
    v('   un code retiré de la configuration : la fiche garde sa formule (Pro)', [tous.promohors.formule, tous.promohors.paye], ['pro', true]);
    /* ⛔ ET PERSONNE D'AUTRE NE BOUGE : sur toute la population du banc, la formule servie est celle de la fiche, sauf les
       écarts NOMMÉS ici — un écart de plus serait une entreprise dont la formule change sans que personne l'ait voulu */
    /* (msgseul n'y est plus : OP MESSAGES seul n'est pas payé, il est servi sans formule — 30 septembre 2026) */
    const ECARTS = { mauvaistarif: 'pro', tarifhaut: 'premium', gratuitpaie: 'business', montetarif: 'premium', promotour: 'premium', promonu: 'premium', gratuitcode: 'premium' };
    vrai('population : ' + Object.keys(E).length + ' entreprises relues', Object.keys(E).length >= 40);
    v('⛔ toutes les autres reçoivent la formule de leur fiche (hors ce qui n\'est pas payé, servi sans formule)', Object.keys(E).filter(sl => !formeB(sl) && tous[sl].formule !== (ECARTS[sl] || E[sl].formule)).map(sl => sl + ' : ' + tous[sl].formule), []);
    vrai('   … et une entreprise servie AVEC formule est toujours payée (la forme « formule + paye:false » n\'est plus jamais servie)', Object.keys(E).filter(sl => 'formule' in tous[sl]).every(sl => tous[sl].paye === true));

    console.log('\n5. La Tour : réenregistrer sans rien changer n\'efface rien, et elle voit les places servies');
    const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-banc-842' })).j.token;
    vrai('la Tour ouvre une session de patron', PATRON);
    /* ⛔ v767 — LA TOUR NE POSE PLUS « GRATUIT » (30 septembre 2026) : ses deux routes le refusent, avec la raison, et la
       fiche ne bouge pas. Sans ce refus, un clic suffisait à faire d'une entreprise payante une entreprise suspendue. */
    const avantG = (await etat('ancienprem')).formule;
    const rG1 = await appel('/api/monitor/espaces/formule', { nom: 'ancienprem', formule: 'gratuit', quantite: 1 }, PATRON);
    const rG2 = await appel('/api/monitor/espaces/abonnement', { nom: 'ancienprem', formule: 'gratuit', quantite: 1, statut: 'actif', fin: '' }, PATRON);
    v('⛔ « Attribuer » Gratuit : refusé (400), et la raison est dite', [rG1.s, /n'existe plus/.test((rG1.j || {}).error || '')], [400, true]);
    v('⛔ … « Abonnement » réglé en Gratuit : refusé aussi', [rG2.s, /n'existe plus/.test((rG2.j || {}).error || '')], [400, true]);
    v('   … et la formule servie n\'a pas bougé', [avantG, (await etat('ancienprem')).formule], ['premium', 'premium']);
    let r = await appel('/api/monitor/espaces/abonnement', { nom: 'ancienbiz', formule: 'business', quantite: 1, statut: 'actif', fin: dans(300) }, PATRON);
    v('⛔ la fiche d\'une entreprise d\'avant réenregistrée (seule la date de fin change) → toujours 2 places', [r.s, (await etat('ancienbiz')).places], [200, 2]);
    r = await appel('/api/monitor/espaces/formule', { nom: 'ancienprem', formule: 'premium', quantite: 2 }, PATRON);
    v('   et « Attribuer » la même formule, même nombre → toujours 6', [r.s, (await etat('ancienprem')).places], [200, 6]);
    r = await appel('/api/monitor/espaces/abonnement', { nom: 'ancienbiz', formule: 'business', quantite: 3, statut: 'actif', fin: '' }, PATRON);
    v('   mais un NOMBRE changé après la bascule se lit un par utilisateur : 3 → 3 places', [r.s, (await etat('ancienbiz')).places], [200, 3]);
    r = await appel('/api/monitor/espaces/abonnement', { nom: 'retard', formule: 'premium', quantite: 1, statut: 'impaye', fin: '' }, PATRON);
    const ret4 = await etat('retard');
    v('M4 · une Business Premium d\'avant passe en impayé → plus payée, grisée sans formule ni places (la forme de l\'impayé)',
      [r.s, ret4.paye, ret4.suspendu, ret4.sursisJours, 'places' in ret4, 'formule' in ret4], [200, false, true, 0, false, false]);
    r = await appel('/api/monitor/espaces/abonnement', { nom: 'retard', formule: 'premium', quantite: 1, statut: 'actif', fin: '' }, PATRON);
    v('⛔ M4 · elle règle son retard (« actif ») → ses 3 places reviennent : un impayé réglé n\'est pas un nouvel abonnement', [r.s, (await etat('retard')).places], [200, 3]);
    r = await appel('/api/monitor/espaces/abonnement', { nom: 'nouvelle', formule: 'business', quantite: 1, statut: 'actif', fin: '' }, PATRON);
    v('⛔    mais une entreprise qui ne payait pas, passée « actif » APRÈS la bascule → 1', [r.s, (await etat('nouvelle')).places], [200, 1]);
    r = await appel('/api/monitor/espaces/abonnement', { nom: 'detour', formule: 'premium', quantite: 1, statut: 'auto', fin: '' }, PATRON);
    r = await appel('/api/monitor/espaces/abonnement', { nom: 'detour', formule: 'premium', quantite: 1, statut: 'actif', fin: '' }, PATRON);
    v('⛔ M4 · « impayé » → « auto » → « actif » : ses 3 places reviennent aussi', [r.s, (await etat('detour')).places], [200, 3]);
    v('   avant la Tour, « passe » (Business d\'avant, 1 abonnement Business) a 2 places', (await etat('passe')).places, 2);
    r = await appel('/api/monitor/espaces/formule', { nom: 'passe', formule: 'premium', quantite: 1 }, PATRON);
    v('⛔ la Tour la passe en Business Premium APRÈS la bascule → son abonnement Business d\'avant compte 1 (pas × 3 sur un tarif Business)', [r.s, (await etat('passe')).places], [200, 1]);
    const liste = (await appel('/api/monitor/espaces/liste', undefined, PATRON)).j.espaces || [];
    const li = sl => (liste.find(x => x.slug === sl) || {});
    v('la liste de la Tour dit les places servies (6, 7, 1)', [li('ancienprem').places, li('ancienajout').places, li('promofini').places], [6, 7, 1]);
    const st = (await appel('/api/monitor/espaces/statut', { nom: 'ancienajout' }, PATRON)).j;
    v('   et la fiche aussi (7), à côté du nombre réglé (2)', [st.places, st.quantite], [7, 2]);
    v('⛔ la liste de la Tour dit la formule SERVIE à côté de la fiche (payée Pro sur une fiche Business Premium ; offerte par le code)',
      [li('mauvaistarif').formule, li('mauvaistarif').formuleServie, li('promotour').formule, li('promotour').formuleServie, li('promotour').promoCode, li('ancienajout').formuleServie],
      ['premium', 'pro', 'business', 'premium', 'BIENVENUE-BANC-842', 'premium']);
    const stMT = (await appel('/api/monitor/espaces/statut', { nom: 'mauvaistarif' }, PATRON)).j;
    const stPT = (await appel('/api/monitor/espaces/statut', { nom: 'promotour' }, PATRON)).j;
    v('   et la fiche de chacune (formule, formule servie, code)', [stMT.formule, stMT.formuleServie, stMT.promoCode, stPT.formuleServie, stPT.promoCode], ['premium', 'pro', '', 'premium', 'BIENVENUE-BANC-842']);
    /* ⛔ ET LA TOUR L'ÉCRIT : la VRAIE `abnFormule` de tour.html, sur les VRAIES lignes du serveur — la couture que ni ce
       banc (le serveur) ni un banc de la Tour (une liste inventée) ne voient seuls. Une Tour d'avant ne l'a pas encore :
       elle affiche la fiche, comme avant — on le dit, sans le compter. */
    const TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
    const fonctionTour = nom => { const d0 = TOUR.indexOf('function ' + nom + '('); if (d0 < 0) return '';
      let p = 0; for (let k = TOUR.indexOf('{', d0); k < TOUR.length; k++) { if (TOUR[k] === '{') p++; else if (TOUR[k] === '}') { p--; if (!p) return TOUR.slice(d0, k + 1); } } return ''; };
    const ABN = (/^var ABN_F=\{[^\n]*\};$/m.exec(TOUR) || [''])[0];
    /* ⛔ plus de porte « Tour d'avant » qui compte un ✓ sans rien vérifier (relecture adverse du 29 septembre) : la Tour et ce
       banc partent ensemble — une Tour sans `abnFormule` afficherait la fiche sans l'écart, et ça doit se voir */
    if (!fonctionTour('abnFormule')) vrai('⛔ la Tour du dépôt a `abnFormule` (sinon elle affiche la fiche, sans l\'écart)', false);
    else {
      const ctxT = {}; require('vm').createContext(ctxT);
      require('vm').runInContext(ABN + '\n' + fonctionTour('abnFormule') + '\n' + fonctionTour('abnEcart'), ctxT);
      v('⛔ la Tour écrit la formule servie et l\'écart, sur les lignes du vrai serveur',
        [ctxT.abnFormule(li('mauvaistarif')), ctxT.abnFormule(li('promotour')), ctxT.abnFormule(li('msgseul')), ctxT.abnFormule(li('gratuitpaie'), ' ×1')],
        ['Pro (payée\u202f; la fiche dit Business Premium)', 'Business Premium (offerte par le code\u202f; la fiche dit Business)',
          'Business', 'Business (payée\u202f; la fiche dit Gratuit ×1)']);
      /* (v767 : OP MESSAGES seul n'est plus « Gratuit servi » — la ligne garde la fiche, et dit « rien de payé : application
         suspendue » à côté, parce que la liste la sert non payée) */
      v('   … et la liste sert msgseul NON payée : la ligne de la Tour dit « application suspendue »', li('msgseul').paye, false);
      v('   sans écart, la fiche seule, comme avant (et « ×N » après elle)', [ctxT.abnFormule(li('ancienajout')), ctxT.abnFormule(li('ancienprem'), ' ×2')], ['Business Premium', 'Business Premium ×2']);
      v('   une ligne d\'un serveur d\'avant (sans `formuleServie`) : la fiche', ctxT.abnFormule({ formule: 'pro' }), 'Pro');
    }
    /* ⛔ ET CE QUE SEULE LA SONDE AU NAVIGATEUR VOYAIT (relecture adverse du 29 septembre) : la règle qui fait lire une ligne à
       écart EN ENTIER, les deux rendus de ligne qui la posent, et la fiche d'une entreprise qui dit ce que l'application
       reçoit. Lus dans le CODE (commentaires retirés), jamais dans une phrase. */
    const TOURcode = TOUR.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const regleEcart = (/\.reg-l2\.abn-ecart\{([^}]*)\}/.exec(TOURcode) || [])[1] || '';
    vrai('⛔ la Tour : une ligne à écart passe à la ligne au lieu de se couper (white-space:normal, overflow:visible, aucune coupe en lignes)',
      /white-space:normal/.test(regleEcart) && /overflow:visible/.test(regleEcart) && !/line-clamp/.test(regleEcart));
    v('   … et les DEUX rendus de ligne (Abonnements, liste des entreprises) la posent', (TOURcode.match(/'<span class="reg-l2'\+\(abnAEcart\(e\)\?' abn-ecart':''\)\+'">'/g) || []).length, 2);
    /* la fiche d'une entreprise (« 💳 Statut paiement ») : la VRAIE `packPeindre`, EXÉCUTÉE sur la vraie réponse du serveur */
    const ctxP = { PACK: null, esc: x => String(x == null ? '' : x).replace(/[&<>"]/g, c => '&#' + c.charCodeAt(0) + ';'), document: null };
    const infoP = { innerHTML: '', textContent: '' };
    ctxP.document = { getElementById: id => (id === 'pack-info' ? infoP : null) };
    require('vm').createContext(ctxP);
    require('vm').runInContext(ABN + '\n' + fonctionTour('abnEcart') + '\n' + fonctionTour('packPeindre'), ctxP);
    const peint = d => { ctxP.PACK = { nom: 'x', charge: true, err: '', d }; infoP.innerHTML = ''; ctxP.packPeindre(); return infoP.innerHTML.replace(/<[^>]+>/g, ''); };
    v('   … et la fiche d\'une entreprise dit ce que l\'application reçoit (la vraie packPeindre, sur la réponse du serveur)',
      [/l’application reçoit\u202f: Pro \(payée\)/.test(peint(stMT)), /l’application reçoit\u202f: Business Premium \(offerte par le code\)/.test(peint(stPT)),
        /reçoit/.test(peint((await appel('/api/monitor/espaces/statut', { nom: 'ancienprem' }, PATRON)).j))], [true, true, false]);
    v('   … la formule de la fiche en toutes lettres, comme ce que l\'application reçoit (« premium » à côté de « Business Premium » se lisait comme deux formules)',
      /^Formule actuelle\u202f: Business Premium · /.test(peint(stMT)) ? 'lu' : peint(stMT), 'lu');
    /* le toast de « 💳 Statut paiement » (la VRAIE `tourStatutPack`, sur la même réponse) : les deux formules en toutes lettres */
    const ctxS = { toastVu: '', toast: t => { ctxS.toastVu = t; }, apiPost: () => Promise.resolve({ ok: true, d: stMT }) };
    require('vm').createContext(ctxS);
    require('vm').runInContext(ABN + '\n' + fonctionTour('tourStatutPack'), ctxS);
    ctxS.tourStatutPack('mauvaistarif'); await new Promise(r => setImmediate(r));
    v('   … et le toast de « 💳 Statut paiement » (la vraie tourStatutPack) : « 📦 Business Premium → l’application reçoit Pro — ✅ payé »',
      /^📦 Business Premium → l’application reçoit Pro — ✅ payé \(/.test(ctxS.toastVu) ? 'lu' : ctxS.toastVu, 'lu');

    const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
    const sansCom = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    // Le serveur part AVANT l'application (mise en ligne n° 1, puis la v763) : le même banc tourne donc sur une
    // `main` qui sert encore la v760. La version se lit dans le fichier — et à partir de 763, la lecture de
    // `places` est EXIGÉE : retirer `_placesSrv` d'une v763 ne peut pas passer pour « une application d'avant ».
    const verApp = parseInt((sansCom.match(/APP_VERSION\s*=\s*'(\d+)/) || [])[1], 10) || 0;
    vrai('la version de l\'application se lit (' + verApp + ')', verApp >= 700);
    if (verApp < 763) {
      console.log('\n6. L\'application EN SERVICE (v' + verApp + ') ne lit pas `places` : `quantite` garde son sens pour elle');
      const iS = sansCom.indexOf('async function forfaitServeurSync(');
      const cS = sansCom.slice(iS, iS + 6000);
      vrai('forfaitServeurSync est trouvée', iS > 0);
      vrai('elle lit `j.quantite` (le nombre d\'abonnements), jamais `j.places`', /j\.quantite/.test(cS) && !/j\.places/.test(cS));
      vrai('ses places restent « formule × abonnements »', /function planPlaces\(\)\{ return \(PLANS\[forfait\(\)\]\.maxU\|\|1\)\*Math\.max\(1,db\.forfaitQty\|\|1\); \}/.test(sansCom));
    } else {
    console.log('\n6. L\'application v763 lit `places`, et ne le range jamais dans la base synchronisée');
    const iPP = sansCom.indexOf('function placesSrvActives(){');
    vrai('placesSrvActives et planPlaces sont trouvées dans app.html', iPP > 0 && sansCom.indexOf('function planPlaces(){', iPP) > iPP);
    const corpsPP = sansCom.slice(iPP, sansCom.indexOf('\n', sansCom.indexOf('return (PLANS[forfait()].maxU||1)', iPP)) + 1);
    const vm = require('vm');
    const joue = (placesSrv, srv, qty, formule, formuleSrv) => { const ctx = { db: { forfaitSrv: srv, forfaitQty: qty }, PLANS: { pro: { maxU: 1 }, business: { maxU: 1 }, premium: { maxU: 1 } }, forfait: () => formule, _placesSrv: placesSrv, _placesSrvF: formuleSrv || '' };
      vm.createContext(ctx); vm.runInContext(corpsPP + ';this.r=planPlaces();', ctx); return ctx.r; };
    v('les places servies par le serveur font foi (7 servies, 2 abonnements)', joue(7, 'teamop', 2, 'premium'), 7);
    v('sans réponse du serveur, le calcul d\'avant (1 × 2)', joue(null, 'teamop', 2, 'premium'), 2);
    v('une formule choisie sur l\'appareil, AUTRE que celle du serveur, ne lit pas le serveur', joue(7, 'local', 2, 'pro', 'premium'), 2);
    v('⛔ mais la même que celle du serveur, si : `forfaitSrv` n\'est posé qu\'à un changement (`gardien`, M2)', joue(7, 'local', 2, 'premium', 'premium'), 7);
    const iSync = sansCom.indexOf('async function forfaitServeurSync(');
    const corpsSync = sansCom.slice(iSync, sansCom.indexOf('\nasync function ', iSync + 10) > 0 ? sansCom.indexOf('\nasync function ', iSync + 10) : iSync + 6000);
    vrai('forfaitServeurSync est trouvée', iSync > 0 && corpsSync.length > 500);
    /* (v767 : ce qui n'est pas payé sort AVANT, places vidées — une réponse qui arrive ici est payée) */
    vrai('⛔ elle range les places servies EN MÉMOIRE (`_placesSrv`), depuis `j.places` — seulement d\'une réponse payée (le non-payé sort avant, `_placesSrv` vidé)',
      /_placesSrv=\(j\.places!=null\)\?Math\.max\(1,parseInt\(j\.places,10\)\|\|1\):null/.test(corpsSync)
      /* (depuis le 30 septembre 2026, elle rend VRAI quand l'état a été lu — `suspensionVerifier` le demande) */
      && /if\(nonPaye\|\|!\(j\.formule&&PLANS\[j\.formule\]\)\)\{ _placesSrv=null; return !j\.verificationImpossible; \}/.test(corpsSync)
      && corpsSync.indexOf('_placesSrv=null; return') < corpsSync.indexOf('_placesSrv=(j.places!=null)'));
    vrai('⛔ `db.forfaitQty` reste le nombre d\'abonnements (`j.quantite`), comme la v760 : aucune boucle de synchro entre versions',
      /const q=Math\.max\(1,parseInt\(j\.quantite,10\)\|\|1\);/.test(corpsSync) && !/db\.\w+\s*=[^;\n]*j\.places/.test(corpsSync));
    }

    console.log('\n6 bis. Registre des codes illisible : le doute va au client qui paie');
    const iPD = SRV.indexOf('function placesPromoDejaEu(e) {');
    let dPD = 0, fPD = -1; for (let k = SRV.indexOf('{', iPD); k < SRV.length; k++) { if (SRV[k] === '{') dPD++; else if (SRV[k] === '}') { dPD--; if (!dPD) { fPD = k + 1; break; } } }
    vrai('placesPromoDejaEu est trouvée dans le serveur', iPD > 0 && fPD > iPD);
    const pde = illisible => new Function('promosIllisible', 'promoUsages', 'espaceT', SRV.slice(iPD, fPD) + '\nreturn placesPromoDejaEu;')(illisible, {}, x => x.t)({ t: 'ent-x', formulePar: 'Patron' });
    v('⛔ registre illisible (lu comme `{}`) → NON : on ne retire pas leurs places à toutes les abonnées le temps d\'une panne (seconde relecture) ; les repères de l\'entrée décident', [pde(true), pde(false)], [false, false]);
    v('   une entrée qui porte son code le dit, registre lisible ou non', [0, 1].map(i => new Function('promosIllisible', 'promoUsages', 'espaceT', SRV.slice(iPD, fPD) + '\nreturn placesPromoDejaEu;')(!!i, {}, x => x.t)({ t: 'ent-x', formulePar: 'Patron', codePromo: 'X' })), [true, true]);
    vrai('la bascule de production se lit dans le serveur (sa variable ne sert qu\'aux bancs)', Date.parse((SRV.match(/\|\| Date\.parse\('([^']+)'\);/) || [])[1]) > 0);

    console.log('\n7. Rien n\'est écrit, rien ne fuit');
    const apres = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
    v('⛔ le registre n\'a bougé que par les deux gestes de la Tour : les places se calculent, elles ne s\'écrivent pas',
      Object.keys(E).filter(sl => (apres[sl] || {}).quantite !== E[sl].quantite), ['ancienbiz']);
    vrai('⛔ le journal ne recopie aucune adresse en clair', !/\w@exemple-842\.fr/i.test(journal));
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})();
