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
  const JOUR = 86400000, BASCULE = Date.parse('2026-09-28T21:00:00Z');
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
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(E));
  /* les codes : l'un en cours (promoprem, promotour), l'autre FINI hier (promofini) */
  fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify({
    'BIENVENUE-BANC-842': { n: 2, equipes: { [tPromo]: { date: dans(-10), finLe: dans(80) }, [tPromoTour]: { date: dans(-5), finLe: dans(85) } } },
    'FINI-BANC-842': { n: 1, equipes: { [tFini]: { date: dans(-91), finLe: dans(-1) } } } }));

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
    abo('p4', tASP, 'past_due', [['ancien', 4]], S_AVANT),
    abo('j1', tAJ, 'active', [['premium', 2]], S_AVANT), abo('j2', tAJ, 'active', [['premium', 1]], S_APRES),
    abo('s3', tS3, 'active', [['pro', 3]], S_APRES),
    abo('d1', tS2, 'active', [['business', 1]], S_APRES), abo('d2', tS2.toUpperCase(), 'trialing', [['business', 2]], S_APRES), abo('dx', tS2, 'canceled', [['business', 5]], S_APRES),
    abo('mt', tMT, 'active', [['pro', 20]], S_APRES),
    abo('ms', tMS, 'active', [['pro', 2], ['msgpro', 5]], S_APRES),
    abo('m2', '', 'active', [['pro', 2]], S_APRES, 'PAIE@exemple-842.fr'), abo('m7', '', 'active', [['pro', 7]], S_APRES, 'autre@exemple-842.fr'),
    abo('m9', tAutre, 'active', [['pro', 9]], S_APRES, 'paie@exemple-842.fr'),
    abo('b9', tBorne, 'active', [['pro', 999]], S_APRES),
    abo('t2', tTP, 'active', [['pro', 2]], S_APRES),
    abo('f1', tFini, 'active', [['premium', 1]], S_APRES) ];
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
    v('⛔ pour CHAQUE entreprise, `quantite` = le nombre réglé dans la Tour, jamais multiplié (la v760 fait × 2 ou × 3 elle-même)',
      Object.keys(E).filter(sl => tous[sl].quantite !== E[sl].quantite), []);
    vrai('   et `places` est rendu partout', Object.keys(E).every(sl => Number.isInteger(tous[sl].places)));
    const pl = sl => tous[sl].places;

    console.log('\n2. Les abonnés d\'avant, réglés à la main dans la Tour, gardent leurs places');
    v('Business « actif » d\'avant : 1 abonnement → 2 places', [tous.ancienbiz.paye, pl('ancienbiz')], [true, 2]);
    v('Business Premium « actif » d\'avant : 2 abonnements → 6 places', pl('ancienprem'), 6);
    v('entrée ancienne sans date : 3 places', pl('sansdate'), 3);
    v('⛔ abonnement activé APRÈS la bascule (formule d\'avant) → 1', pl('aboapres'), 1);
    v('⛔ formule réglée APRÈS la bascule → 1', pl('neufbiz'), 1);
    v('⛔ essai offert → 1', pl('essaibiz'), 1);
    v('⛔ formule venue d\'un code du site, puis « actif » → 1', pl('sitecode'), 1);
    v('⛔ impayé → 1', [tous.impaye.paye, pl('impaye')], [false, 1]);

    console.log('\n3. Les périodes offertes ne gardent rien');
    v('⛔ code en cours (repère « code » dans la formule) → 1', [tous.promoprem.paye, pl('promoprem')], [true, 1]);
    v('⛔ code en cours sur une formule réglée à la main → 1', [tous.promotour.paye, pl('promotour')], [true, 1]);
    v('⛔ code FINI, payée ensuite chez Stripe 1 abonnement → 1 (pas 15 : à la fin d\'un code, on paie chaque utilisateur)', [tous.promofini.paye, pl('promofini')], [true, 1]);

    console.log('\n4. Payé chez Stripe : les places suivent le paiement');
    v('Business d\'avant, 1 abonnement souscrit avant → 2', pl('ancienstripe'), 2);
    v('Business d\'avant, 4 abonnements souscrits avant (ancien lien) → 8 : ce qu\'elle payait, × 2', pl('ancienplus'), 8);
    v('⛔ Business Premium d\'avant (2 → 6 places) + 1 abonnement acheté APRÈS → 7, pas 6', pl('ancienajout'), 7);
    v('un abonnement Pro à quantité 3 → 3', pl('stripetrois'), 3);
    v('deux abonnements vivants (1 + 2, référence en majuscules) → 3 ; l\'annulé ne compte pas', pl('stripedeux'), 3);
    v('⛔ Business Premium payée au tarif Pro × 20 → 1 : un tarif Pro ne donne pas de places Business Premium', pl('mauvaistarif'), 1);
    v('⛔ Pro × 2 + OP MESSAGES × 5 sur le même abonnement → 2', pl('avecmessages'), 2);
    v('rattachée par l\'adresse → ses 2, ni les 7 d\'un autre client, ni les 9 gravés pour une AUTRE entreprise de la même adresse', pl('parmail'), 2);
    v('   l\'autre entreprise de la même adresse a bien ses 9 (par sa référence)', pl('autremail'), 9);
    v('⛔ une quantité folle est bornée à 50', pl('borne'), 50);
    v('⛔ la Tour en a réglé 5 (peut-être le nombre tapé dans la demande), Stripe en paie 2 → 2', pl('tourplus'), 2);

    console.log('\n5. La Tour : réenregistrer sans rien changer n\'efface rien, et elle voit les places servies');
    const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-banc-842' })).j.token;
    vrai('la Tour ouvre une session de patron', PATRON);
    let r = await appel('/api/monitor/espaces/abonnement', { nom: 'ancienbiz', formule: 'business', quantite: 1, statut: 'actif', fin: dans(300) }, PATRON);
    v('⛔ la fiche d\'une entreprise d\'avant réenregistrée (seule la date de fin change) → toujours 2 places', [r.s, (await etat('ancienbiz')).places], [200, 2]);
    r = await appel('/api/monitor/espaces/formule', { nom: 'ancienprem', formule: 'premium', quantite: 2 }, PATRON);
    v('   et « Attribuer » la même formule, même nombre → toujours 6', [r.s, (await etat('ancienprem')).places], [200, 6]);
    r = await appel('/api/monitor/espaces/abonnement', { nom: 'ancienbiz', formule: 'business', quantite: 3, statut: 'actif', fin: '' }, PATRON);
    v('   mais un NOMBRE changé après la bascule se lit un par utilisateur : 3 → 3 places', [r.s, (await etat('ancienbiz')).places], [200, 3]);
    const liste = (await appel('/api/monitor/espaces/liste', undefined, PATRON)).j.espaces || [];
    const li = sl => (liste.find(x => x.slug === sl) || {});
    v('la liste de la Tour dit les places servies (6, 7, 1)', [li('ancienprem').places, li('ancienajout').places, li('promofini').places], [6, 7, 1]);
    const st = (await appel('/api/monitor/espaces/statut', { nom: 'ancienajout' }, PATRON)).j;
    v('   et la fiche aussi (7), à côté du nombre réglé (2)', [st.places, st.quantite], [7, 2]);

    console.log('\n6. L\'application v763 lit `places`, et ne le range jamais dans la base synchronisée');
    const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
    const sansCom = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const iPP = sansCom.indexOf('function planPlaces(){');
    vrai('planPlaces est trouvée dans app.html', iPP > 0);
    const corpsPP = sansCom.slice(iPP, sansCom.indexOf('\n', sansCom.indexOf('return (PLANS[forfait()].maxU||1)', iPP)) + 1);
    const vm = require('vm');
    const joue = (placesSrv, srv, qty, formule) => { const ctx = { db: { forfaitSrv: srv, forfaitQty: qty }, PLANS: { pro: { maxU: 1 }, business: { maxU: 1 }, premium: { maxU: 1 } }, forfait: () => formule, _placesSrv: placesSrv };
      vm.createContext(ctx); vm.runInContext(corpsPP + ';this.r=planPlaces();', ctx); return ctx.r; };
    v('les places servies par le serveur font foi (7 servies, 2 abonnements)', joue(7, 'teamop', 2, 'premium'), 7);
    v('sans réponse du serveur, le calcul d\'avant (1 × 2)', joue(null, 'teamop', 2, 'premium'), 2);
    v('une formule choisie sur l\'appareil (pas par TEAM OP) ne lit pas le serveur', joue(7, 'local', 2, 'pro'), 2);
    const iSync = sansCom.indexOf('async function forfaitServeurSync(');
    const corpsSync = sansCom.slice(iSync, sansCom.indexOf('\nasync function ', iSync + 10) > 0 ? sansCom.indexOf('\nasync function ', iSync + 10) : iSync + 6000);
    vrai('forfaitServeurSync est trouvée', iSync > 0 && corpsSync.length > 500);
    vrai('⛔ elle range les places servies EN MÉMOIRE (`_placesSrv`), depuis `j.places`', /_placesSrv=\(j\.paye&&j\.places!=null\)/.test(corpsSync));
    vrai('⛔ `db.forfaitQty` reste le nombre d\'abonnements (`j.quantite`), comme la v760 : aucune boucle de synchro entre versions',
      /const q=Math\.max\(1,parseInt\(j\.quantite,10\)\|\|1\);/.test(corpsSync) && !/db\.\w+\s*=[^;\n]*j\.places/.test(corpsSync));

    console.log('\n7. Rien n\'est écrit, rien ne fuit');
    const apres = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
    v('⛔ le registre n\'a bougé que par les deux gestes de la Tour : les places se calculent, elles ne s\'écrivent pas',
      Object.keys(E).filter(sl => (apres[sl] || {}).quantite !== E[sl].quantite), ['ancienbiz']);
    vrai('⛔ le journal ne recopie aucune adresse en clair', !/\w@exemple-842\.fr/i.test(journal));
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})();
