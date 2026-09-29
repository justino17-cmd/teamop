/* ⛔ CE QUE CE FICHIER GARDE — CARTE REFUSÉE = IMPAYÉ, ET PAS D'ACCÈS PAYANT TANT QUE CE N'EST PAS RÉGLÉ, SUR LE VRAI SERVEUR.

   Justin, 29 septembre 2026 : « Il passe en impayé directement » ; « Non, leur accès sont bloqués le temps que c'est pas
   payé » ; « Rien n'est perdu, mais pas de paiement, pas d'accès au service payant ». Un abonnement Stripe `past_due` (le
   prélèvement a échoué, Stripe réessaie) comptait comme PAYÉ pendant toutes les nouvelles tentatives. Ce qu'on garde ici, en
   faisant tourner le vrai serveur contre un Stripe simulé DANS son processus (relu dans un fichier à CHAQUE appel : on
   change un statut en cours de banc, comme Stripe le ferait) :
     · `past_due` et `unpaid` d'OP GESTION → `/api/espaces/etat` répond comme une suspension au sursis écoulé, SANS formule
       (la « forme B ») : c'est la seule réponse que l'application en service (v763) sait griser sans rien écrire dans les
       données du client, et dont le message ne va qu'à l'administrateur. Une fiche « Gratuit » dont l'abonnement payé est
       refusé : pareil ;
     · ⛔ ce qui N'EST PAS un impayé ne change pas : `incomplete` (jamais payé), un OP MESSAGES refusé seul, une entreprise
       réglée à la main dans la Tour, une période offerte en cours ; et un impayé PARMI des abonnements payés : payée, sans
       les places du refusé ;
     · ⛔ l'accès REVIENT dès que Stripe dit l'abonnement payé — relu à la minute (ici, la seconde du banc) ;
     · ⛔ les VRAIES fonctions d'app.html (`forfaitServeurSync`, `suspensionPoser`, `forfait`…) contre ce serveur : grisé
       (`forfait()` rend « gratuit »), `db` intact, pas de bandeau, un seul rappel par jour et à l'administrateur seul — puis
       tout revient ;
     · la Tour le voit (`impaye`, `impayesPartiels`), « Mon espace » dit « Suspendu » ;
     · ⛔ LA PAGE DE PAIEMENT NE VEND PAS UN SECOND ABONNEMENT À UN IMPAYÉ : elle rend la FACTURE EN ATTENTE, relue chez
       Stripe (rien n'est créé chez Stripe) ; sans facture ouverte 409, Stripe muet à la relecture 502 — jamais un paiement
       neuf qui serait prélevé EN DOUBLE le jour où Stripe réussit sa nouvelle tentative. Réglé depuis la liste, OP MESSAGES,
       ou l'impayé d'une AUTRE entreprise : le paiement normal.
   Rien ne sort d'ici : 127.0.0.1, un Stripe simulé, des entreprises et des adresses fictives. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
const APPLI = process.env.APP_FICHIER ? path.resolve(process.env.APP_FICHIER) : path.join(RACINE, 'app.html');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b845-'));
let enfant = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

console.log('\n── 845 · carte refusée = impayé : l\'accès payant bloqué jusqu\'au règlement ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  /* les tarifs RÉELS du serveur (publics : ceux de la page de paiement) */
  const SRC = fs.readFileSync(SERVEUR, 'utf8');
  const prix = k => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)'", 'm').exec(SRC) || [])[1];
  const P = { pro: prix('pro'), business: prix('business'), premium: prix('premium'), msg: prix('msgpro') };
  vrai('(population) les tarifs Pro, Business, Business Premium et OP MESSAGES du serveur sont lus', Object.values(P).every(x => /^price_/.test(x || '')));

  /* ══ LES DONNÉES ═══════════════════════════════════════════════════════════════════════════════════ */
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const MAINT = Date.now();
  const jour = n => new Date(MAINT + n * 86400000).toISOString().slice(0, 10);
  const cree = Math.floor(MAINT / 1000) - 3600;   // après la bascule du banc (1er janvier 2026)
  const mail = x => x + '@exemple-845.fr';
  /* [formule de la fiche, abonnements : [statut, formule, quantité]] — chacune SEULE à son adresse */
  const ENT = {
    imp: ['business', [['past_due', 'business', 1]]],                        // carte refusée
    unp: ['premium', [['unpaid', 'premium', 1]]],                              // Stripe a fini ses tentatives : « impayé »
    inc: ['pro', [['incomplete', 'pro', 1]]],                                  // jamais payé (premier paiement non abouti)
    mix: ['pro', [['active', 'pro', 1], ['past_due', 'pro', 1]]],             // un payé, un refusé
    deux: ['pro', [['active', 'pro', 1], ['active', 'pro', 1]]],              // (témoin) les deux payés
    gra: ['gratuit', [['past_due', 'pro', 1]]],                                // fiche Gratuit, son Pro refusé
    tou: ['premium', [['past_due', 'premium', 1]]],                            // réglée à la main dans la Tour (actif)
    msg: ['premium', [['past_due', 'msg', 1]]],                                // OP MESSAGES refusé, rien d'OP GESTION
    mog: ['premium', [['active', 'msg', 1], ['past_due', 'premium', 1]]],     // OP MESSAGES payé, OP GESTION refusé
    mgr: ['gratuit', [['active', 'msg', 1], ['past_due', 'pro', 1]]],         // fiche Gratuit : OP MESSAGES payé, son Pro refusé
    ret: ['business', [['past_due', 'business', 1]]],                          // refusée, puis réglée pendant le banc
    per: ['premium', [['past_due', 'premium', 1]]],                            // une période offerte en cours
    sans: ['premium', [['past_due', 'premium', 1]]],                           // refusée, AUCUNE facture ouverte
    pan: ['premium', [['past_due', 'premium', 1]]],                            // refusée, Stripe muet à la relecture
    regl: ['premium', [['past_due', 'premium', 1]]],                           // refusée dans la liste, réglée à la relecture
    x: ['premium', [['active', 'premium', 1]]],                                // payée — sa voisine y est en impayé
    y: ['premium', [['past_due', 'premium', 1]]],
    /* ── les cas rejoués par la relecture adverse (29 septembre 2026, `gardien`) ── */
    nouv: ['gratuit', []],                                                     // son nom d'accès était celui d'une ANCIENNE entreprise en impayé
    paie: ['pro', [['active', 'pro', 2], ['past_due', 'pro', 1]]],            // payée, un vieil abonnement refusé traîne (facture ouverte)
    paieu: ['pro', [['active', 'pro', 1], ['unpaid', 'pro', 1]]],             // payée, un vieil unpaid sans facture ouverte
    unv: ['premium', [['unpaid', 'premium', 1]]],                              // unpaid sans facture ouverte (Stripe ne réessaie plus)
    man: ['premium', []],                                                      // impayé posé À LA MAIN dans la Tour
    can: ['business', [['canceled', 'business', 1]]],                          // annulé par Stripe (Q3 : réglage des relances)
    /* une adresse PARTAGÉE par quatre entreprises (une adresse = une entreprise : ce que la Tour seule peut ranger) */
    parta: ['gratuit', []],                                                    // Gratuit, jamais abonnée
    partb: ['pro', [['past_due', 'pro', 1]]],                                  // son abonnement gravé à son identifiant, refusé
    partc: ['pro', [['active', 'pro', 1]]],                                    // payée, gravée à son identifiant
    partd: ['pro', [['past_due', 'pro', 1]]],                                  // refusé SANS référence (l'adresse seule)
    /* une autre adresse partagée, où RIEN n'est payé */
    duoa: ['pro', [['past_due', 'pro', 1]]],                                   // refusé sans référence
    duob: ['gratuit', []] };                                                   // Gratuit, jamais abonnée
  const ADR = { parta: mail('partage'), partb: mail('partage'), partc: mail('partage'), partd: mail('partage'), duoa: mail('duo'), duob: mail('duo') };
  const adr = slug => ADR[slug] || mail(slug);
  const espaces = {}, subs = [], factures = {};
  const FACT = s => 'https://invoice.stripe.com/i/banc-845-' + s;
  for (const [slug, [formule, abos]] of Object.entries(ENT)) {
    const t = 't-' + slug + '-845';
    espaces[slug] = { t, nom: 'Banc ' + slug, email: adr(slug), ts: MAINT - 1000, formule, quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Banc' };
    abos.forEach(([status, f, q], i) => {
      const id = 'sub_' + slug + '_' + i;
      subs.push({ id, object: 'subscription', status, created: cree, metadata: { espace: t, compte: adr(slug) }, customer: { id: 'cus_' + slug, email: adr(slug) },
        current_period_end: Math.floor(MAINT / 1000) + 20 * 86400,
        items: { data: [{ id: 'si_' + id, quantity: q, price: { id: P[f], product: { name: f === 'msg' ? 'OP MESSAGES' : 'OP GESTION' } } }] } });
      if (/past_due|unpaid/.test(status)) factures[id] = { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: FACT(slug) } };
    });
  }
  Object.assign(espaces.tou, { aboStatut: 'actif', aboPar: 'Banc' });
  Object.assign(espaces.man, { aboStatut: 'impaye', aboPar: 'Banc' });
  /* partd : pas de référence — seule l'adresse (partagée) la désigne */
  delete subs.find(x => x.id === 'sub_partd_0').metadata.espace;
  delete subs.find(x => x.id === 'sub_duoa_0').metadata.espace;
  /* l'ANCIENNE entreprise de « nouv » : son abonnement refusé gravé au NOM D'ACCÈS (d'anciennes pages envoyaient le nom),
     à son adresse à elle ; le nom a été libéré puis repris par « nouv » */
  subs.push({ id: 'sub_ancienne', object: 'subscription', status: 'past_due', created: cree, metadata: { espace: 'nouv', compte: mail('ancienne') },
    customer: { id: 'cus_ancienne', email: mail('ancienne') }, current_period_end: Math.floor(MAINT / 1000) + 20 * 86400,
    items: { data: [{ id: 'si_ancienne', quantity: 5, price: { id: P.premium, product: { name: 'OP GESTION' } } }] } });
  factures.sub_ancienne = { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: FACT('ancienne') } };
  /* les unpaid sans facture ouverte */
  factures.sub_paieu_1 = { latest_invoice: { object: 'invoice', status: 'void', hosted_invoice_url: FACT('paieu-ancienne') }, ouvertes: [] };
  factures.sub_unv_0 = { latest_invoice: { object: 'invoice', status: 'void', hosted_invoice_url: FACT('unv-ancienne') }, ouvertes: [] };
  factures.sub_sans_0 = { latest_invoice: null, ouvertes: [] };
  factures.sub_regl_0 = { status: 'active', latest_invoice: { object: 'invoice', status: 'paid', hosted_invoice_url: FACT('regl') } };
  /* unp : sa dernière facture est close — l'ouverte n'est que dans la liste des factures */
  factures.sub_unp_0 = { latest_invoice: { object: 'invoice', status: 'void', hosted_invoice_url: FACT('unp-ancienne') }, ouvertes: [{ object: 'invoice', status: 'open', hosted_invoice_url: FACT('unp') }] };
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
  fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify({ 'ESSAI-BANC-845': { n: 1, equipes: { 't-per-845': { date: jour(-10), finLe: jour(30), em: '' } } } }));
  /* le portail : des comptes CONFIRMÉS, une session chacun (seul le sha256 du jeton est rangé, comme `comptes.js`), et le
     dossier « Mon espace » de deux entreprises */
  const C = {}, J = {}, jetons = {};
  for (const slug of Object.keys(ENT)) {
    const m = adr(slug);
    if (!C[m]) { C[m] = { v: true, pr: 'Banc', no: slug, so: 'Banc ' + slug };
      const brut = crypto.randomBytes(32).toString('hex'); J[sha(brut)] = { m, g: 'session', exp: MAINT + 86400000 }; jetons['@' + m] = brut; }
    jetons[slug] = jetons['@' + m];
  }
  fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: C, j: J }));
  fs.writeFileSync(path.join(D, 'portail.json'), JSON.stringify({ d: {
    [mail('imp')]: { status: 'actif', plan: 'Business', planStatus: 'actif', cree: MAINT - 5000 },
    [mail('deux')]: { status: 'actif', plan: 'Pro', planStatus: 'actif', cree: MAINT - 5000 } }, f: {}, a: [] }));

  /* Stripe, simulé DANS le processus serveur et relu à CHAQUE appel dans `ETAT` : la liste, la relecture d'un abonnement
     (sa dernière facture développée), ses factures ouvertes, et la création d'une page de paiement (notée : on compte ce
     qui a été CRÉÉ chez Stripe). `relecturePanne` : les abonnements dont la relecture rend 500. */
  const ETAT = path.join(banc, 'stripe-etat.json'), APPELS = path.join(banc, 'stripe-appels.jsonl');
  let etatStripe = { subs, factures, relecturePanne: ['sub_pan_0'] };
  const poser = () => fs.writeFileSync(ETAT, JSON.stringify(etatStripe));
  poser();
  const PRECHARGE = path.join(banc, 'stripe-simule.js');
  fs.writeFileSync(PRECHARGE, `const vrai = globalThis.fetch; const fs = require('fs');
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  const E = JSON.parse(fs.readFileSync(${JSON.stringify(ETAT)}, 'utf8'));
  fs.appendFileSync(${JSON.stringify(APPELS)}, JSON.stringify({ u, corps: String((opts && opts.body) || '') }) + '\\n');
  const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return json({ id: 'cs_banc_845', url: 'https://checkout.stripe.com/c/pay/banc-845' });
  const r1 = /^https:\\/\\/api\\.stripe\\.com\\/v1\\/subscriptions\\/([^?]+)/.exec(u);
  if (r1) {
    const id = decodeURIComponent(r1[1]);
    if ((E.relecturePanne || []).includes(id)) return json({ error: { message: 'panne du banc (relecture)' } }, 500);
    const sb = E.subs.find(x => x.id === id), f = E.factures[id] || {};
    if (!sb) return json({ error: { message: 'inconnu' } }, 404);
    return json(Object.assign({}, sb, f.status ? { status: f.status } : {}, { latest_invoice: f.latest_invoice === undefined ? null : f.latest_invoice }));
  }
  if (u.startsWith('https://api.stripe.com/v1/invoices')) {
    const id = new URL(u).searchParams.get('subscription');
    return json({ data: ((E.factures[id] || {}).ouvertes || []).slice(0, 1), has_more: false });
  }
  if (u.startsWith('https://api.stripe.com/v1/subscriptions')) return json({ data: E.subs, has_more: false });
  return json({ data: [], has_more: false });
};\n`);
  const appelsStripe = () => { try { return fs.readFileSync(APPELS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { return []; } };
  const sessions = () => appelsStripe().filter(x => /\/v1\/checkout\/sessions/.test(x.u));

  /* ══ LE VRAI SERVEUR ═══════════════════════════════════════════════════════════════════════════════ */
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha('mot-de-passe-845'), comptes: { actif: true }, stripe: { secretKey: 'sk_de_banc_845' },
    promos: [{ code: 'ESSAI-BANC-845', formule: 'premium', mois: 3 }] }));
  const PORT = 9900 + (process.pid % 90);
  const B = 'http://127.0.0.1:' + PORT;
  let journal = '';
  /* la liste Stripe se garde dix minutes (`TEAMOP_STRIPE_CACHE_MS`, cinq en service) ; un IMPAYÉ la fait relire après une
     seconde (`TEAMOP_STRIPE_IMPAYE_MS`, la minute en service) : un règlement se voit vite, sans rafale d'appels */
  enfant = spawn(process.execPath, ['--require', PRECHARGE, SERVEUR], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
      TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z', TEAMOP_STRIPE_CACHE_MS: '600000',
      TEAMOP_STRIPE_IMPAYE_MS: '1000' }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  let vivant = false;
  for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre, isolé (portail allumé, Stripe simulé relu à chaque appel)', vivant);
  if (!vivant) { console.log(journal.slice(0, 1500)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton, methode) => { const r = await fetch(B + route, { method: methode || (corps === undefined ? 'GET' : 'POST'),
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  const etat = async slug => (await appel('/api/espaces/etat', { t: espaces[slug].t })).j;
  /* la forme B : pas de formule ni de places ; et ⛔ la route est PUBLIQUE (qui connaît `t`) : ni le mot « impayé », ni Stripe */
  const FORME_B = j => j.ok === true && j.paye === false && j.suspendu === true && j.sursisJours === 0 && !('formule' in j) && !('places' in j)
    && !('impaye' in j) && j.motif === 'accès payant suspendu';

  try {
    console.log('\n1. /api/espaces/etat : un impayé se sert comme une suspension au sursis écoulé, sans formule');
    const E = {}; for (const slug of Object.keys(ENT)) E[slug] = await etat(slug);
    vrai('⛔ past_due (Business) — `paye:false`, `suspendu`, `sursisJours:0`, et NI formule NI places (la forme que la v763 grise sans rien écrire)', FORME_B(E.imp));
    vrai('⛔   la route est publique : elle ne dit ni « impayé », ni Stripe, ni le chemin (la Tour, gardée, a le motif)',
      !/impay|stripe|past_due|unpaid|adresse|référence/i.test(JSON.stringify(E.imp)));
    vrai('⛔ unpaid (Stripe a fini ses tentatives) — la même forme', FORME_B(E.unp));
    vrai('⛔ fiche GRATUIT dont le Pro payé est refusé — la même forme (l\'administrateur est prévenu, rien n\'est écrit)', FORME_B(E.gra));
    vrai('⛔ OP MESSAGES payé, OP GESTION refusé — un impayé, pas le « Gratuit » d\'une entreprise qui n\'aurait pris qu\'OP MESSAGES', FORME_B(E.mog));
    vrai('⛔ fiche Gratuit, OP MESSAGES payé, son Pro refusé — la même forme', FORME_B(E.mgr));
    vrai('⛔ incomplete (jamais payé) N\'EST PAS un impayé — la réponse d\'avant : sa formule, `paye:false`, sans `impaye` ni suspension',
      E.inc.formule === 'pro' && E.inc.paye === false && !E.inc.impaye && E.inc.suspendu === false && E.inc.motif === 'aucun paiement ni code promo');
    vrai('⛔ OP MESSAGES refusé, rien d\'OP GESTION — pas un impayé d\'OP GESTION : la réponse d\'avant', E.msg.formule === 'premium' && E.msg.paye === false && !E.msg.impaye && E.msg.suspendu === false);
    vrai('⛔ réglée à la main dans la Tour (actif) — la Tour prime : payée, sa formule', E.tou.paye === true && E.tou.formule === 'premium' && !E.tou.impaye && E.tou.suspendu === false);
    vrai('⛔ une période offerte en cours prime sur l\'impayé — payée (code promo)', E.per.paye === true && /code promo ESSAI-BANC-845/.test(E.per.motif || '') && E.per.suspendu === false);
    vrai('⛔ un payé ET un refusé — payée, sa formule, pas suspendue', E.mix.paye === true && E.mix.formule === 'pro' && !E.mix.impaye && E.mix.suspendu === false);
    vrai('⛔   mais SANS les places du refusé (moins que le témoin aux deux abonnements payés : ' + E.mix.places + ' contre ' + E.deux.places + ')',
      Number.isInteger(E.mix.places) && Number.isInteger(E.deux.places) && E.mix.places < E.deux.places);
    vrai('   et son motif le dit', /1 abonnement en impayé : ses places ne sont pas servies/.test(E.mix.motif || ''));
    vrai('   (témoin) payée sans rien de refusé : la réponse normale', E.x.paye === true && E.x.formule === 'premium' && !/impayé/.test(E.x.motif || ''));
    /* ── les cas de la relecture adverse ── */
    vrai('⛔ un nom d\'accès REPRIS : l\'impayé de l\'ancienne entreprise, gravé à ce nom, ne bloque pas la nouvelle (un impayé ne se rattache qu\'à l\'identifiant)',
      E.nouv.paye === true && E.nouv.formule === 'gratuit' && E.nouv.suspendu === false);
    vrai('⛔ payée, avec un vieil abonnement refusé : servie (ses places payées), pas bloquée', E.paie.paye === true && E.paie.formule === 'pro' && E.paie.suspendu === false
      && E.paieu.paye === true && E.paieu.suspendu === false);
    vrai('   unpaid sans facture ouverte : bloquée comme les autres', FORME_B(E.unv));
    vrai('⛔ l\'impayé posé À LA MAIN dans la Tour : la même forme que l\'impayé Stripe (plus de bandeau à toute l\'équipe, ni `db` réécrit)', FORME_B(E.man));
    vrai('   (en attente de Justin, Q3) un abonnement ANNULÉ par Stripe : la réponse d\'avant (formule, non payée) — pas un impayé',
      E.can.formule === 'business' && E.can.paye === false && E.can.suspendu === false && !('impaye' in E.can));
    vrai('⛔ adresse partagée — la payée (gravée) reste servie', E.partc.paye === true && E.partc.formule === 'pro' && E.partc.suspendu === false);
    vrai('⛔ adresse partagée — la fiche Gratuit jamais abonnée n\'est PAS dite en impayé par l\'abonnement refusé d\'une voisine',
      E.parta.paye === true && E.parta.formule === 'gratuit' && E.parta.suspendu === false);
    vrai('⛔ adresse partagée — la refusée (gravée à elle) est bloquée : l\'abonnement payé de sa VOISINE ne lui prête pas l\'accès payant', FORME_B(E.partb));
    vrai('   adresse partagée — un refusé SANS référence (un doute) ne bloque pas quand un payé est trouvé à l\'adresse (la limite connue : une adresse = une entreprise)',
      E.partd.paye === true && E.partd.suspendu === false);
    vrai('⛔ adresse partagée où RIEN n\'est payé — le refusé sans référence bloque (la forme qui n\'écrit rien), la fiche Gratuit voisine non',
      FORME_B(E.duoa) && E.duob.paye === true && E.duob.suspendu === false);
    /* ⛔ PAS DE RAFALE : la liste se garde pour qui paie ; un impayé la fait relire au plus une fois par fenêtre */
    const listes = () => appelsStripe().filter(x => /\/v1\/subscriptions\?/.test(x.u)).length;
    await dormir(1100);
    const l0 = listes(); for (let i = 0; i < 5; i++) await etat('x');
    v('⛔ une entreprise qui paie ne fait pas relire Stripe (cinq appels, la liste gardée)', listes() - l0, 0);
    const l1 = listes(); for (let i = 0; i < 5; i++) await etat('imp');
    vrai('⛔ un impayé fait relire la liste (l\'accès reviendra vite), mais pas à chaque appel : ' + (listes() - l1) + ' lecture(s) pour cinq appels',
      listes() - l1 >= 1 && listes() - l1 <= 2);

    console.log('\n2. Les VRAIES fonctions d\'app.html (v' + ((/APP_VERSION\s*=\s*'(\d+)'/.exec(fs.readFileSync(APPLI, 'utf8')) || [])[1] || '?') + ') contre ce serveur');
    const APP = fs.readFileSync(APPLI, 'utf8');
    const bloc = (debut) => { const d0 = APP.indexOf(debut); if (d0 < 0) return ''; let p = 0;
      for (let k = APP.indexOf('{', d0); k < APP.length; k++) { if (APP[k] === '{') p++; else if (APP[k] === '}') { p--; if (!p) return APP.slice(d0, k + 1); } } return ''; };
    const fonction = nom => { const a = bloc('async function ' + nom + '('); return a || bloc('function ' + nom + '('); };
    const NOMS = ['forfaitServeurSync', 'suspensionCle', 'suspensionPoser', 'suspensionSursis', 'suspensionGrise', 'suspensionRappel', 'forfait', 'bandeauFormule'];
    const FN = NOMS.map(fonction), PLANS_SRC = bloc('const PLANS={'), SUSP = (/^let _susp = \{[^\n]*\};$/m.exec(APP) || [''])[0];
    vrai('(population) les huit fonctions, PLANS et l\'état de suspension sont trouvés dans le fichier réel',
      FN.every(Boolean) && /const PLANS=\{/.test(PLANS_SRC) && !!SUSP && /suspensionPoser\(j\)/.test(FN[0]));
    /* un appareil : son rangement, son compte, sa base — et ce qu'il fait VOIR (toasts, bandeau) ou ÉCRIRE (save) */
    const appareil = (slug, role) => {
      const LS = new Map([['elan_sync_team', espaces[slug].t]]);
      const vu = { toasts: [], saves: 0, bandeau: 0 };
      const doc = { getElementById: () => null, createElement: () => { vu.bandeau++; return { style: {}, remove() {} }; }, body: { appendChild() {} } };
      const code = 'let STORE_KEY="elanB_banc845"; let currentUser=' + JSON.stringify({ id: 'u-' + role, role }) + '; let current="dashboard";\n'
        + 'let db=' + JSON.stringify({ forfait: espaces[slug].formule, forfaitQty: 1, forfaitSrv: 'teamop' }) + '; let _opMsgOuvert=false;\n'
        + PLANS_SRC + ';\nvar _placesSrv=null,_placesSrvF="";\n' + SUSP + '\n' + FN.join('\n')
        + '\nreturn { sync: forfaitServeurSync, forfait, db: () => db, susp: () => _susp };';
      const f = new Function('fetch', 'localStorage', 'PUSH_API', 'toast', 'renderNav', 'go', 'save', 'logEvent', 'todayISO', 'espaceQuitter', 'suiteRefresh', 'views', 'document', 'esc', code);
      const a = f((u, o) => fetch(u, o), { getItem: k => (LS.has(k) ? LS.get(k) : null), setItem: (k, x) => LS.set(k, String(x)), removeItem: k => LS.delete(k) },
        B, m => vu.toasts.push(String(m)), () => {}, () => {}, () => { vu.saves++; }, () => {}, () => new Date().toISOString().slice(0, 10), () => {}, () => {}, {}, doc, s => String(s));
      a.vu = vu; return a;
    };
    const admin = appareil('ret', 'admin'), tech = appareil('ret', 'technicien');
    await admin.sync(); await tech.sync();
    v('⛔ l\'administrateur d\'une entreprise refusée : `forfait()` rend « gratuit » (catégories payantes grisées)', admin.forfait(), 'gratuit');
    v('⛔   et `db` n\'est PAS touché : sa formule vraie reste, aucune écriture (rien ne part à la synchro)', [admin.db().forfait, admin.db().formuleAttente, admin.vu.saves], ['business', undefined, 0]);
    vrai('⛔   pas de bandeau « Paye ton abonnement » (il mènerait à un SECOND abonnement)', admin.vu.bandeau === 0 && tech.vu.bandeau === 0);
    vrai('   le rappel de l\'administrateur : « Abonnement non réglé… rien n\'est perdu »', admin.vu.toasts.length === 1 && /Abonnement non réglé — les catégories payantes sont grisées/.test(admin.vu.toasts[0]));
    vrai('⛔ le technicien : grisé aussi, et AUCUN message (« c\'est pas aux utilisateurs de savoir si l\'entreprise paye ») — ni écriture',
      tech.forfait() === 'gratuit' && tech.vu.toasts.length === 0 && tech.vu.saves === 0 && tech.db().forfait === 'business');
    await admin.sync();
    v('   un seul rappel par jour : une seconde ouverture le même jour ne le répète pas', admin.vu.toasts.length, 1);
    /* la contre-épreuve : la réponse qu'un impayé NE reçoit PAS */
    const incA = appareil('inc', 'technicien'); await incA.sync();
    vrai('(contre-épreuve) une réponse AVEC formule et `paye:false` (incomplete), elle, ÉCRIT `db.forfait`, pose l\'attente et le bandeau — à toute l\'équipe',
      incA.db().forfait === 'gratuit' && !!incA.db().formuleAttente && incA.vu.saves > 0 && incA.vu.bandeau > 0);

    console.log('\n3. Le règlement : l\'accès revient seul, sans rien réparer');
    etatStripe.subs.find(s => s.id === 'sub_ret_0').status = 'active'; delete etatStripe.factures.sub_ret_0; poser();
    await dormir(1300);   // la liste du banc a plus d'une seconde : elle se relit
    const R = await etat('ret');
    vrai('⛔ Stripe dit l\'abonnement payé : la réponse normale — payée, sa formule, plus de suspension', R.paye === true && R.formule === 'business' && !R.impaye && R.suspendu === false);
    await admin.sync(); await tech.sync();
    v('⛔ l\'application rend tout : `forfait()` redevient la formule vraie, chez l\'administrateur et le technicien', [admin.forfait(), tech.forfait()], ['business', 'business']);
    v('   toujours sans avoir rien réécrit de la formule', [admin.db().forfait, tech.db().forfait], ['business', 'business']);

    console.log('\n4. La Tour et « Mon espace » le voient');
    const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-845' })).j.token;
    vrai('(population) la Tour se connecte', !!PATRON);
    const L = (await appel('/api/monitor/espaces/liste', undefined, PATRON)).j.espaces || [];
    const ligne = slug => L.find(x => x.slug === slug) || {};
    v('⛔ la liste de la Tour : `impaye` pour les bloquées (past_due, unpaid, fiche Gratuit, réglée à la main), pas pour les autres',
      Object.keys(ENT).filter(s => ligne(s).impaye).sort(), ['duoa', 'gra', 'imp', 'man', 'mgr', 'mog', 'pan', 'partb', 'regl', 'sans', 'unp', 'unv', 'y']);
    v('   `impayeStripe` : toutes sauf la réglée à la main (la Tour ne la montre qu\'une fois : sa ligne Stripe, ou celle-ci)',
      Object.keys(ENT).filter(s => ligne(s).impaye && !ligne(s).impayeStripe), ['man']);
    v('   `impayesPartiels` : 1 pour l\'entreprise au payé ET au refusé, 0 pour son témoin', [ligne('mix').impayesPartiels, ligne('deux').impayesPartiels], [1, 0]);
    const St = (await appel('/api/monitor/espaces/statut', { nom: 'imp' }, PATRON)).j;
    vrai('   la fiche d\'une entreprise refusée : non payée, `impaye`, le motif de l\'impayé', St.paye === false && St.impaye === true && /impayé Stripe \(past_due, par [^)]+\) — accès payant bloqué/.test(St.motif || ''));
    const Su = (await appel('/api/monitor/espaces/statut', { nom: 'unp' }, PATRON)).j;
    vrai('   … et celle d\'un unpaid le dit (le motif tient dans les 80 signes de l\'horloge de conservation)', /impayé Stripe \(unpaid/.test(Su.motif || '') && String(Su.motif || '').length <= 80);
    const Mi = (await appel('/api/portail/moi', undefined, jetons.imp)).j;
    vrai('⛔ « Mon espace » d\'une entreprise refusée : « Suspendu » (pas « Actif » à côté de fonctions grisées), sa formule inchangée',
      Mi.ok === true && Mi.dossier && Mi.dossier.planStatus === 'suspendu' && Mi.dossier.plan === 'Business');
    const Md = (await appel('/api/portail/moi', undefined, jetons.deux)).j;
    vrai('   (témoin) une entreprise payée : son état reste celui du dossier', Md.ok === true && Md.dossier && Md.dossier.planStatus === 'actif');

    console.log('\n5. La page de paiement : un impayé se RÈGLE, il ne se rachète pas');
    const payer = (slug, corps) => appel('/api/stripe/checkout', Object.assign({ price: P.premium, quantity: 1 }, corps || {}), jetons[slug]);
    const n0 = sessions().length;
    let r = await payer('imp', { price: P.business, ref: espaces.imp.t });
    vrai('⛔ refusée (past_due), avec sa référence : la FACTURE EN ATTENTE (celle de Stripe, relue), et AUCUN abonnement créé chez Stripe',
      r.s === 200 && r.j.url === FACT('imp') && r.j.facture === true && sessions().length === n0);
    vrai('   (population) la facture a bien été relue chez Stripe', appelsStripe().some(x => /\/v1\/subscriptions\/sub_imp_0\?expand/.test(x.u)));
    r = await payer('imp', { price: P.pro });
    vrai('⛔ la même, SANS référence (on la retrouve par l\'adresse du compte), et pour une AUTRE formule : la même facture, rien de créé',
      r.s === 200 && r.j.url === FACT('imp') && sessions().length === n0);
    r = await payer('unp', { ref: espaces.unp.t });
    vrai('⛔ unpaid, dernière facture close : la facture OUVERTE de la liste des factures, pas l\'ancienne', r.s === 200 && r.j.url === FACT('unp') && sessions().length === n0);
    r = await payer('gra', { price: P.pro, ref: espaces.gra.t });
    vrai('⛔ fiche Gratuit refusée : sa facture aussi', r.s === 200 && r.j.url === FACT('gra') && sessions().length === n0);
    r = await payer('mog', { ref: espaces.mog.t });
    vrai('⛔ OP MESSAGES payé, OP GESTION refusé : la facture d\'OP GESTION', r.s === 200 && r.j.url === FACT('mog') && sessions().length === n0);
    r = await payer('sans', { ref: espaces.sans.t });
    v('⛔ refusée SANS facture ouverte : 409 `impaye_sans_facture` — rien de créé (TEAM OP règle à la main)', [r.s, r.j.error, sessions().length], [409, 'impaye_sans_facture', n0]);
    r = await payer('pan', { ref: espaces.pan.t });
    v('⛔ Stripe muet à la relecture : 502 — on refuse plutôt que de risquer un double prélèvement', [r.s, r.j.error, sessions().length], [502, 'stripe_indisponible', n0]);
    r = await payer('regl', { ref: espaces.regl.t });
    vrai('⛔ refusée dans la liste, RÉGLÉE à la relecture : le paiement normal (une page de paiement neuve)', r.s === 200 && r.j.url === 'https://checkout.stripe.com/c/pay/banc-845' && sessions().length === n0 + 1);
    r = await payer('imp', { price: P.msg, ref: espaces.imp.t });
    vrai('   OP MESSAGES (pas encore en vente, pas un impayé d\'OP GESTION) : le paiement normal', r.s === 200 && r.j.url === 'https://checkout.stripe.com/c/pay/banc-845' && sessions().length === n0 + 2);
    r = await payer('x', { ref: espaces.x.t });
    vrai('⛔ une entreprise payée, dont la VOISINE est en impayé : le paiement normal — jamais la facture d\'une autre',
      r.s === 200 && r.j.url === 'https://checkout.stripe.com/c/pay/banc-845' && sessions().length === n0 + 3);
    r = await payer('ret', { price: P.business, ref: espaces.ret.t });
    vrai('   l\'entreprise qui vient de régler : le paiement normal', r.s === 200 && r.j.url === 'https://checkout.stripe.com/c/pay/banc-845' && sessions().length === n0 + 4);
    const neuf = async (slug, corps) => { const n = sessions().length; const q = await payer(slug, corps);
      return q.s === 200 && q.j.url === 'https://checkout.stripe.com/c/pay/banc-845' && !q.j.facture && sessions().length === n + 1; };
    vrai('⛔ le nom d\'accès repris : la nouvelle entreprise paie normalement — JAMAIS la facture de l\'ancienne (nom, adresse, montant d\'une autre)',
      await neuf('nouv', { price: P.pro, ref: espaces.nouv.t }) && !appelsStripe().some(x => /sub_ancienne/.test(x.u)));
    vrai('⛔ payée avec un vieil abonnement refusé : elle ACHÈTE ses places de plus — pas renvoyée vers la vieille facture', await neuf('paie', { price: P.pro, ref: espaces.paie.t }));
    vrai('⛔ payée avec un vieil unpaid sans facture : pas de 409 sans issue, le paiement normal', await neuf('paieu', { price: P.pro, ref: espaces.paieu.t }));
    vrai('⛔ bloquée par un unpaid sans facture ouverte : le paiement normal (Stripe ne réessaie plus : aucun double prélèvement)', await neuf('unv', { ref: espaces.unv.t }));
    vrai('   l\'impayé posé à la main dans la Tour : le paiement normal (aucune facture Stripe à régler)', await neuf('man', { ref: espaces.man.t }));
    vrai('⛔ adresse partagée — la payée achète normalement, jamais la facture d\'une voisine', await neuf('partc', { price: P.pro, ref: espaces.partc.t }));
    vrai('⛔ adresse partagée — la Gratuit prend Pro normalement, jamais la facture d\'une voisine', await neuf('parta', { price: P.pro, ref: espaces.parta.t }));
    r = await payer('partb', { price: P.pro, ref: espaces.partb.t });
    vrai('   adresse partagée — la bloquée reçoit SA facture', r.s === 200 && r.j.url === FACT('partb') && r.j.facture === true);
    r = await payer('duoa', { price: P.pro, ref: espaces.duoa.t });
    vrai('⛔ adresse partagée, rien de payé — la bloquée reçoit la facture de son refusé SANS référence (celui du compte qui paie) : pas un second abonnement',
      r.s === 200 && r.j.url === FACT('duoa') && r.j.facture === true);
    vrai('   aucune adresse de client en clair au journal', !/[a-z]+@exemple-845\.fr/.test(journal.replace(/[a-z]\*+@exemple-845\.fr/g, '')));
  } finally { if (enfant) { const e = enfant; enfant = null; await new Promise(r => { e.once('exit', r); e.kill('SIGKILL'); }); } }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a planté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
