/* ══ SONDE DE BOUT EN BOUT — PERSO+ ET LE PLAFOND DE DIX PERSONNES, DANS DE VRAIS NAVIGATEURS ═══════════════════════════════════════════════════════════
   `tests/test-994.js` fait parler le module de données de la page au vrai service ; `test-991` à `993` jouent la décision de formule, les routes et l'outil de configuration. Celle-ci joue ce que seul un
   navigateur voit : la VRAIE PAGE SERVIE (`server-msg/public/`), au DOIGT (iPhone 393) et à la souris (bureau 1440), contre le VRAI service à la formule de PRODUCTION et un FAUX Stripe, sur 127.0.0.1 —
   jamais teamop.fr, jamais le vrai Stripe. Décision du 4 octobre 2026 : organiser une réunion est dans Perso+ ; rejoindre une réunion où l'on est invité reste gratuit.

   Ce qu'elle joue :
     A. une personne GRATUITE (Alice) touche « Programmer » : la page ouvre la FEUILLE DU FORFAIT (jamais un formulaire qu'elle sait refusé) — « Les réunions sont dans Perso+ : 5 € par mois. Rejoindre une
        réunion où tu es invité reste gratuit. » —, le rythme se choisit (50 € par an), « S'abonner » mène à une adresse de Stripe (https), le paiement est réglé chez Stripe, le retour RELIT chez Stripe et la
        personne est Perso+ ;
     B. Perso+ programme : le formulaire dit « dix personnes au plus, toi compris », refuse d'inviter la dixième personne d'invités (la neuvième est la dernière), la réunion naît avec ses dix participants
        (« 10 / 10 »), la fiche dit qu'elle est complète ;
     C. un invité GRATUIT (Bruno) ouvre la réunion et ENTRE dans la salle : aucune feuille de forfait, il reste Perso ;
     D. un appel de GROUPE gratuit (Chloé) : la salle n'a pas les outils de l'organisateur et le DIT en une ligne qui dit où ils sont ; le même appel lancé par Perso+ (Alice) les a ;
     E. le paiement passe en RETARD pendant que le formulaire est ouvert (impayé, sans sursis : le service refuse 402 AU MOMENT d'enregistrer, la page ouvre la feuille du forfait et DIT que le paiement n'est pas passé),
        « J'ai réglé — vérifier » relit chez Stripe, puis le forfait est RÉSILIÉ : même refus, la feuille propose de nouveau « S'abonner » — rien n'est jamais créé ;
     F. SUPPRIMER SON COMPTE avec un abonnement Perso+ (Dora) : la feuille « Supprimer mon compte » n'a PAS de section « Ton abonnement » tant que la personne n'est pas abonnée, puis dit EXACTEMENT « Ton abonnement
        Perso+ ne sera plus renouvelé. » (et ne renvoie plus au portail : la demande suffit) ; la demande arrête le renouvellement chez Stripe (l'abonnement reste actif) ; se reconnecter dans la page annule la
        suppression ET le renouvellement revient — la chaîne entière, page → service → Stripe ;
     Réglages › Abonnement dit chaque état (« Pour organiser des réunions · 5 € par mois », « Abonnement actif », « Paiement en retard : à régler »).
   Partout : aucune erreur JavaScript, aucun débordement, chaque refus réseau NOMMÉ.

   ⛔ CE QU'ELLE NE PEUT PAS JOUER, ET DIT : un vrai paiement (le faux Stripe de `tests/outils-stripe.js` rend l'adresse de paiement, la page est détournée vers un faux, et « payé » est posé chez lui) ; Safari/iOS ;
   un vrai relais d'appel et une vraie liaison pair à pair entre deux navigateurs (un seul navigateur parle à la fois : ce que la salle MONTRE se mesure, pas la voix).
   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), JAMAIS AU CHRONOMÈTRE. ⛔ UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU À LA PLACE.
   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-perso-plus.js        CAPTURES=/dossier   (une capture à chaque étape clé)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
/* ⛔ PROFIL EN RUBRIQUES (6 octobre 2026) : une carte de réglage n'est montrée que dans SA rubrique — on la touche comme la personne le ferait (« Profil › Confidentialité ») */
const rubrique = async (S, sec) => { const pg = S.page || S; await pg.waitForFunction((x) => !!document.querySelector('[data-reg-sec="' + x + '"]'), sec, { timeout: 9000 }).catch(() => {}); await pg.evaluate((x) => { const b = document.querySelector('[data-reg-sec="' + x + '"]'); if (b) b.click(); }, sec); await pg.waitForFunction((x) => { const s = document.getElementById('reg-sec-' + x); return !!s && !s.hidden; }, sec, { timeout: 9000 }).catch(() => {}); };
const { fauxStripe } = require('./outils-stripe');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const { ouvrir: ouvrirBase } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-perso-plus.js'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const dormir = T.dort;
/* Une caméra et un micro de banc : sans eux, `getUserMedia` refuse et la salle ne s'ouvre pas — ce n'est pas ce qu'on mesure ici */
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'];
const PROFILS = {
  iphone: { nom: 'iPhone 393', w: 393, h: 852, dpr: 2, mobile: true, insets: { top: 54, bottom: 34 } },
  bureau: { nom: 'bureau 1440', w: 1440, h: 900, dpr: 1, mobile: false, insets: null },
};
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234', chloe: 'pw-chloe-1234', dora: 'pw-dora-1234' };
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Durand', dora: 'Dora Lefèvre' };
const CLE = ['rk', 'test', 'BancSondePersoZzQ9'].join('_');
const PRIX_PRO = { mensuel: 'price_BancSondeProMensA1', annuel: 'price_BancSondeProAnnuB2' };
const PRIX_PP = { mensuel: 'price_BancSondePersoMensC3', annuel: 'price_BancSondePersoAnnuD4' };
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const SEUIL_CIBLE = 44;

async function ouvrir(b, base, pf, o) {
  o = o || {};
  const ctx = await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: 'light', reducedMotion: 'reduce', locale: 'fr-FR',
    timezoneId: 'Europe/Paris', permissions: ['microphone', 'camera', 'clipboard-read', 'clipboard-write'], baseURL: base,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const S = { ctx, page, pf, nom: '?', base, erreurs: [], console: [], gestes: 0, requetes: [], postes: [], navigations: [], refus: [], lentes: [] };
  /* ⛔ Un prédicat de `waitForFunction` qui lit un élément pas encore là jette DANS la page : la sonde s'accuserait elle-même. Une erreur dont AUCUNE ligne de pile n'est un script servi par l'application
     et qui vient d'une évaluation de la sonde est celle de la sonde. */
  S.bruitSonde = 0;
  page.on('pageerror', e => {
    const pile = String(e && e.stack || ''), dePage = pile.includes(new URL(base).origin + '/') && /\.js:\d+:\d+/.test(pile.split(new URL(base).origin).slice(1).join(''));
    if (!dePage && /eval at (predicate|evaluate)/.test(pile)) { S.bruitSonde++; return; }
    S.erreurs.push(String(e && e.message || e).slice(0, 240) + (pile ? ' @ ' + pile.split('\n').slice(1, 4).map(x => x.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' < ') : ''));
  });
  page.on('console', m => { if (m.type() === 'error') S.console.push(m.text().slice(0, 240)); });
  page.on('request', r => { const u = new URL(r.url()); if (u.origin === new URL(base).origin) { S.requetes.push(r.method() + ' ' + u.pathname); if (r.method() === 'POST') S.postes.push({ chemin: u.pathname, corps: r.postData() }); } });
  page.on('requestfinished', r => { try { const t = r.timing(), u = new URL(r.url()); const d = t.responseEnd - t.startTime; if (u.origin === new URL(base).origin && d > 2000) S.lentes.push(r.method() + ' ' + u.pathname + ' ' + Math.round(d) + ' ms'); } catch (e) { /* sans mesure */ } });
  page.on('response', r => { try { const u = new URL(r.url()); if (u.origin === new URL(base).origin && r.status() >= 400) S.refus.push(r.status() + ' ' + r.request().method() + ' ' + u.pathname); } catch (e) { /* une réponse sans adresse lisible */ } });
  /* la page de paiement et le portail de Stripe sont des FAUX : la page y est détournée, la sonde note l'adresse */
  await ctx.route(/^https:\/\/(checkout|billing)\.stripe\.test\//, r => { S.navigations.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/html;charset=utf-8', body: '<!doctype html><title>Stripe du banc</title><p>Stripe du banc</p>' }); });
  if (pf.insets) { try { const c = await ctx.newCDPSession(page); await c.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, bottom: pf.insets.bottom, left: 0, right: 0 } }); } catch (e) { /* facultatif */ } }
  return S;
}
const lire = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
async function attendre(S, fn, arg, ms) {
  const fini = Date.now() + (ms || 12000);
  for (;;) {
    try { await S.page.waitForFunction(fn, arg, { timeout: Math.max(1, fini - Date.now()), polling: 50 }); return true; }
    catch (e) {
      if (/Timeout/i.test(String(e && e.message)) || Date.now() >= fini) return false;
      await dormir(80);
    }
  }
}
const etatPage = (S) => S.page.evaluate(() => {
  const t = id => { const e = document.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null; };
  return 'feuille=' + t('feuille-titre') + (document.documentElement.classList.contains('feuille-ouverte') ? '(ouverte)' : '(fermée)') + ' · erreur=' + (t('info-erreur') || '') + ' · mot=' + (t('mot') || '') + ' · salle=' + (document.documentElement.dataset.salle || '-')
    + ' · vue=' + (document.documentElement.dataset.vue || '-') + ' · adresse=' + location.pathname + location.search + location.hash.slice(0, 40);
}).then(x => x + ' · dernières requêtes : ' + S.requetes.slice(-5).join(', ')).catch(() => '?');
async function verifier(titre, S, fn, arg, ms, vu) {
  const ok = await attendre(S, fn, arg, ms);
  if (ok) vrai(titre, true);
  else {
    let reste = ''; try { reste = vu ? await vu() : ''; } catch (e) { reste = '?'; }
    v(titre, 'non vu à temps' + (reste ? ' ; vu : ' + String(reste).slice(0, 400) : '') + ' ; page : ' + await etatPage(S) + (S.erreurs.length ? ' ; erreurs JS : ' + S.erreurs.slice(-2).join(' | ') : ''), 'vu');
  }
  return ok;
}
async function toucher(S, sel) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  S.gestes++;
  if (S.pf.mobile) await loc.tap(); else await loc.click();
}
async function saisir(S, sel, texte) { await S.page.locator(sel).filter({ visible: true }).first().fill(texte); S.gestes++; }
async function capture(S, nom) {
  if (!DOSSIER_CAPTURES) return;
  try { fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER_CAPTURES, nom + '-' + S.pf.nom.replace(/\W+/g, '') + '.png') }); } catch (e) { /* facultatif */ }
}
async function connecter(S, login) {
  await S.page.goto(S.base + '/');
  await saisir(S, '#c-login', login); await saisir(S, '#c-pass', MOTS[login]); await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
}
async function retourListe(S) {
  const vis = await S.page.evaluate(() => { const e = document.getElementById('conv-retour'); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; });
  if (vis) { await toucher(S, '#conv-retour'); await S.page.waitForFunction(() => document.documentElement.dataset.conv !== '1', null, { timeout: 4000 }).catch(() => {}); }
}
async function onglet(S, vue) {
  await retourListe(S);
  await toucher(S, 'a[data-vue="' + vue + '"]');
  await S.page.waitForFunction(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden && s.getClientRects().length > 0; }, vue, { timeout: 6000 });
}
async function largeur(S, etape) {
  const mesure = () => S.page.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
    window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
    return { dep: document.documentElement.scrollWidth, sx, n: document.querySelectorAll('body *').length };
  });
  await mesure(); await dormir(600); const b = await mesure();
  S.ecrans = (S.ecrans || 0) + 1;
  if (b.sx > 0 || b.dep > S.pf.w + 1) (S.debordements = S.debordements || []).push(etape + ' : scrollWidth ' + b.dep + ' pour ' + S.pf.w + ', poussée ' + b.sx);
}
const texteCorps = (S) => lire(S, '#info-corps');
async function fermerFeuille(S) {
  const ouverte = await S.page.evaluate(() => document.documentElement.classList.contains('feuille-ouverte'));
  if (ouverte) { await toucher(S, '#g-annuler'); await S.page.waitForFunction(() => !document.documentElement.classList.contains('feuille-ouverte'), null, { timeout: 5000 }).catch(() => {}); }
}
/* une feuille est ouverte et porte ce titre */
const feuilleDe = (S, titre) => attendre(S, (t) => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === t, titre, 10000);
const petitesCibles = (S, sel) => S.page.evaluate((s) => Array.from(document.querySelectorAll(s)).filter(e => e.getClientRects().length > 0 && !e.hidden).map(e => { const r = e.getBoundingClientRect(); return [e.dataset.pp || e.dataset.reu || e.id || e.className, Math.round(r.height)]; }).filter(x => x[1] < 44), sel);

const QUOTAS = { reunion: { max: 100000, fenetreMs: 3600000 }, relire: { max: 100000, fenetreMs: 3600000 }, paiement: { max: 100000, fenetreMs: 3600000 }, portail: { max: 100000, fenetreMs: 3600000 },
  rejoindre_reunion: { max: 100000, fenetreMs: 60000 }, ics: { max: 100000, fenetreMs: 60000 }, groupe: { max: 100000, fenetreMs: 3600000 } };
/* deux personnes sont contacts l'une de l'autre (par le lien de contact : le geste que la page offre ailleurs) */
async function contacts(x, y) {
  const l = await x.post('/api/contacts/lien', {});
  if (l.code !== 201) throw new Error('lien de contact refusé : ' + l.code);
  const a = await y.post('/api/liens/accepter', { code: l.j.code });
  if (a.code !== 200) throw new Error('lien de contact non accepté : ' + a.code);
}
/* « YYYY-MM-DDTHH:mm » de l'instant `t` à Paris */
const localParis = (t) => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(t).map(x => [x.type, x.value])); return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute; };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const fake = await fauxStripe();
  fake.poserTarif(PRIX_PRO.mensuel); fake.poserTarif(PRIX_PRO.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
  const produit = { id: 'prod_bancsondepp', object: 'product', name: 'OP MESSAGES Perso+' };
  fake.poserTarif(PRIX_PP.mensuel, { unit_amount: 500, product: produit });
  fake.poserTarif(PRIX_PP.annuel, { unit_amount: 5000, recurring: { interval: 'year', interval_count: 1 }, product: produit });
  const svc = await T.lancerService({ urlGestion: og.url, config: { pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, formule: { toutOuvert: false }, quotas: QUOTAS,
    facturation: { cle: CLE, prix: PRIX_PRO, perso: { prix: PRIX_PP }, relectureMs: 3600000, timeoutMs: 3000 }, appels: { balayageMs: 1000, perduMs: 600000 } }, env: { OPMSG_TEST_STRIPE: fake.hote } });
  let b = null, S0 = null;
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const nb = (req, ...args) => Number(sql(req, ...args).n);
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : le navigateur ne démarre pas (' + e.message.split('\n')[0] + ')'); await svc.arreter(); await fake.fermer(); await og.fermer(); process.exit(2); }
  const tous = [];
  try {
    const P = {}; for (const l of Object.keys(MOTS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    await contacts(P.alice, P.bruno); await contacts(P.alice, P.chloe); await contacts(P.chloe, P.bruno);
    /* onze autres contacts d'Alice, fabriqués dans la base du service (on ne choisit des invités que par leur identifiant) : de quoi dépasser dix */
    S0 = ouvrirBase({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: Date.now });
    const foule = []; for (let i = 0; i < 11; i++) { const p = S0.personneCreer({ identifiant: 'beta:foule' + i + crypto.randomBytes(2).toString('hex'), prenom: 'Foule' + String.fromCharCode(65 + i), nom: 'Banc', origine: 'beta', verifie: true }); foule.push(p); S0.contactLier(P.alice.moi.id, p.id); }
    const A = await ouvrir(b, svc.base, PROFILS.iphone); A.nom = 'Alice (iPhone)'; tous.push(A);
    await connecter(A, 'alice');

    /* ═══ A. UNE PERSONNE GRATUITE TOUCHE « PROGRAMMER » : LA FEUILLE DU FORFAIT, LE PAIEMENT, LE RETOUR ═══════════════════════════════════════════ */
    console.log('── A. Perso touche « Programmer » : la feuille de Perso+, le rythme, « S\'abonner », le retour de Stripe ──');
    await onglet(A, 'reglages'); await rubrique(A, 'entreprise');
    await verifier('Réglages › Abonnement : une ligne « Perso+ » dit ce que la personne peut prendre — « Pour organiser des réunions · 5 € par mois » (le nom et le prix viennent du service)', A,
      () => !!document.getElementById('reg-pp') && /Perso\+\s*Pour organiser des réunions · 5 € par mois/.test(document.getElementById('reg-pp').textContent), null, 12000, () => lire(A, '#reg-abo'));
    await onglet(A, 'reunions');
    await toucher(A, '#btn-reunion-nouvelle');
    await verifier('⛔ la page ouvre la FEUILLE DU FORFAIT (« Perso+ »), pas un formulaire qu\'elle sait refusé', A, () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === 'Perso+' && !!document.getElementById('pp-phrase'), null, 10000, () => texteCorps(A));
    v('… elle dit EXACTEMENT : « Les réunions sont dans Perso+ : 5 € par mois. Rejoindre une réunion où tu es invité reste gratuit. » (le nom et le prix viennent du service)', await lire(A, '#pp-phrase'), 'Les réunions sont dans Perso+ : 5 € par mois. Rejoindre une réunion où tu es invité reste gratuit.');
    v('… deux rythmes (« Par mois · 5 € », « Par an · 50 € »), un bouton « S\'abonner », et le mot « Pro » n\'y paraît nulle part', await A.page.evaluate(() => [Array.from(document.querySelectorAll('[data-pp="cycle"]')).map(x => x.textContent.trim()), (document.querySelector('[data-pp="payer"]') || {}).textContent, /\bPro\b/.test(document.getElementById('info-corps').textContent)]), [['Par mois · 5 €', 'Par an · 50 €'], 'S\'abonner', false]);
    v('… et RIEN ne s\'est écrit ni demandé chez Stripe (population : la page a lu l\'état du forfait, aucune session n\'est ouverte, aucune programmation envoyée)', [A.requetes.filter(r => r === 'GET /api/moi/perso-plus').length >= 1, fake.sessions.size, A.postes.filter(p => p.chemin === '/api/reunions').length, nb('SELECT COUNT(*) AS n FROM reunion')], [true, 0, 0, 0]);
    v('au doigt, chaque cible de la feuille fait ' + SEUIL_CIBLE + ' px au moins', await petitesCibles(A, '#info-corps [data-pp]'), []);
    await capture(A, 'pp1-feuille-perso-plus');
    await largeur(A, 'feuille Perso+ (gratuit)');
    await toucher(A, '[data-pp="cycle"][data-cycle="annuel"]');
    await verifier('le rythme annuel se choisit : « Les réunions sont dans Perso+ : 50 € par an. »', A, () => /^Les réunions sont dans Perso\+ : 50 € par an\./.test(document.getElementById('pp-phrase').textContent), null, 6000, () => lire(A, '#pp-phrase'));
    await toucher(A, '[data-pp="payer"]');
    const alle = await attendre(A, () => /Stripe du banc/.test(document.title), null, 12000);
    const session = fake.derniereSession();
    const pr = (k) => (session && session.paires.find(x => x[0] === k) || [])[1];
    v('⛔ « S\'abonner » : la page est DÉTOURNÉE vers une adresse https de Stripe, une session est ouverte (UNE), au tarif ANNUEL de la configuration, UN siège, la référence désigne ALICE',
      [alle, A.navigations.length, /^https:\/\/checkout\.stripe\.test\//.test(A.navigations[0] || ''), fake.sessions.size, pr('line_items[0][price]'), pr('line_items[0][quantity]'), pr('client_reference_id')],
      [true, 1, true, 1, PRIX_PP.annuel, '1', 'opmsg-perso:' + P.alice.moi.id]);
    v('… et la personne n\'est PAS encore abonnée : payer commence chez Stripe (aucune ligne d\'abonnement)', [nb('SELECT COUNT(*) AS n FROM abonnement_perso WHERE abonnement IS NOT NULL'), (await P.alice.get('/api/moi/perso-plus')).j.formule], [0, 'perso']);
    /* le paiement est RÉGLÉ chez Stripe, la personne revient sur l'application par l'adresse que Stripe lui rend */
    fake.payer(session.id);
    await A.page.goto(A.base + '/?abo=retour&p=1#reglages/entreprise');
    await verifier('⛔ de retour de Stripe : la feuille RELIT chez Stripe — « Abonnement confirmé par Stripe : tu peux organiser des réunions. » — et montre l\'abonnement actif', A,
      () => document.documentElement.classList.contains('feuille-ouverte') && /Abonnement confirmé par Stripe : tu peux organiser des réunions\./.test(document.getElementById('info-corps').textContent) && /Actif/.test(document.getElementById('info-corps').textContent), null, 15000, () => texteCorps(A));
    v('… le SERVICE dit la même chose (la page n\'a pas cru son propre retour) : Alice est Perso+, elle peut organiser', await P.alice.get('/api/moi/perso-plus').then(r => [r.j.formule, r.j.organiser, r.j.abonnement && r.j.abonnement.statut]), ['perso_plus', true, 'active']);
    vrai('… et la feuille propose « Programmer une réunion » et « Gérer mon abonnement » (plus « S\'abonner »)', await A.page.evaluate(() => !!document.querySelector('[data-pp="programmer"]') && !!document.querySelector('[data-pp="portail"]') && !document.querySelector('[data-pp="payer"]')));
    await capture(A, 'pp2-abonnement-actif');
    await largeur(A, 'feuille Perso+ (abonné)');

    /* ═══ B. PERSO+ PROGRAMME : DIX PERSONNES AU PLUS, ORGANISATEUR COMPRIS ═════════════════════════════════════════════════════════════════════ */
    console.log('\n── B. Perso+ programme : « dix personnes au plus, toi compris » ──');
    await toucher(A, '[data-pp="programmer"]');
    await verifier('le formulaire « Nouvelle réunion » s\'ouvre (la personne PEUT organiser), avec une ligne qui dit le plafond lu chez le service', A, () => document.getElementById('feuille-titre').textContent === 'Nouvelle réunion' && /Une réunion compte 10 personnes au plus, toi compris : tu peux encore en inviter 9\./.test((document.getElementById('rf-invites-note') || {}).textContent || ''), null, 10000, () => texteCorps(A));
    await saisir(A, '#rf-titre', 'Point WQXZ-DIX');
    const uids = foule.map(p => p.id);
    for (const id of uids.slice(0, 9)) await toucher(A, '[data-reu="form-invite"][data-uid="' + id + '"]');
    await verifier('NEUF invités choisis : le compteur dit 9 et la ligne dit « La réunion est complète : 10 personnes au plus, toi compris. »', A, () => document.getElementById('rf-invites-n').textContent === '9' && /La réunion est complète : 10 personnes au plus, toi compris\./.test(document.getElementById('rf-invites-note').textContent), null, 6000, () => lire(A, '#rf-invites-note'));
    await toucher(A, '[data-reu="form-invite"][data-uid="' + uids[9] + '"]');
    await verifier('⛔ la DIXIÈME personne n\'est pas choisie (elle serait la onzième de la réunion) : sa case reste décochée, le compteur reste à 9, et la page le DIT', A,
      (id) => { const e = document.querySelector('[data-reu="form-invite"][data-uid="' + id + '"]'); return e && e.getAttribute('aria-checked') === 'false' && document.getElementById('rf-invites-n').textContent === '9' && /Une réunion compte 10 personnes au plus, toi compris/.test(document.getElementById('mot').textContent); }, uids[9], 6000, () => lire(A, '#mot'));
    await capture(A, 'pp3-formulaire-complet');
    await largeur(A, 'formulaire (réunion complète)');
    await toucher(A, '[data-reu="form-invite"][data-uid="' + uids[8] + '"]');
    await verifier('contre-épreuve : on RETIRE quelqu\'un, la place revient — la ligne dit « tu peux encore en inviter 1 » ET la dixième personne peut être choisie', A,
      () => /tu peux encore en inviter 1\./.test(document.getElementById('rf-invites-note').textContent) && document.getElementById('rf-invites-n').textContent === '8', null, 6000, () => lire(A, '#rf-invites-note'));
    await toucher(A, '[data-reu="form-invite"][data-uid="' + uids[9] + '"]');
    await verifier('… la dixième personne est choisie (9 invités), la ligne redit « complète »', A, (id) => { const e = document.querySelector('[data-reu="form-invite"][data-uid="' + id + '"]'); return e && e.getAttribute('aria-checked') === 'true' && document.getElementById('rf-invites-n').textContent === '9'; }, uids[9], 6000, () => lire(A, '#rf-invites-n'));
    await toucher(A, '[data-reu="form-enregistrer"]');
    await verifier('⛔ la réunion naît : sa fiche s\'ouvre, « Participants 10 / 10 », la section « Inviter » dit que c\'est le maximum', A,
      () => /Participants\s*10 \/ 10/.test(document.getElementById('info-corps').textContent) && /Cette réunion compte 10 personnes, toi compris : c'est le maximum\./.test(document.getElementById('info-corps').textContent), null, 15000, () => texteCorps(A));
    v('… le SERVICE la compte de même : dix personnes (Alice et neuf invités), une réunion, un seul envoi de programmation', [nb('SELECT COUNT(*) AS n FROM reunion_invite'), nb('SELECT COUNT(*) AS n FROM reunion'), A.postes.filter(p => p.chemin === '/api/reunions').length], [10, 1, 1]);
    await capture(A, 'pp4-reunion-dix');
    await largeur(A, 'fiche d\'une réunion complète');
    await fermerFeuille(A);
    await onglet(A, 'reglages'); await rubrique(A, 'entreprise');
    await verifier('Réglages › Abonnement : la ligne « Perso+ » dit « Abonnement actif · prochaine échéance le … » (et plus le prix)', A,
      () => /Perso\+\s*Abonnement actif · prochaine échéance le /.test((document.getElementById('reg-pp') || {}).textContent || '') && !/€/.test(document.getElementById('reg-pp').textContent), null, 12000, () => lire(A, '#reg-abo'));

    /* ═══ C. UN INVITÉ GRATUIT ENTRE DANS LA SALLE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── C. Un invité gratuit (Bruno) entre dans la salle de la réunion ──');
    const debut = new Date(Date.now() + 2 * 60000);
    const maintenant = await P.alice.post('/api/reunions', { titre: 'Salle ouverte WQXZ', debut: localParis(debut), fin: localParis(new Date(debut.getTime() + 3600000)), tz: 'Europe/Paris', invites: [P.bruno.moi.id], rappels: [15], notifier: true });
    vrai('population : Alice (Perso+) programme une réunion qui commence dans deux minutes et invite Bruno', maintenant.code === 201 && !!maintenant.j.reunion);
    const R = maintenant.j.reunion.id;
    const B = await ouvrir(b, svc.base, PROFILS.bureau); B.nom = 'Bruno (bureau)'; tous.push(B);
    await connecter(B, 'bruno');
    v('population : Bruno est une personne GRATUITE (aucun abonnement, aucun espace)', await P.bruno.get('/api/moi/perso-plus').then(r => [r.j.formule, r.j.organiser, r.j.abonnement]), ['perso', false, null]);
    await B.page.goto(B.base + '/#reunions/' + R);
    await verifier('la fiche de la réunion s\'ouvre chez Bruno, avec « Rejoindre » (la salle est ouverte quinze minutes avant le début)', B, () => document.documentElement.classList.contains('feuille-ouverte') && !!document.querySelector('[data-reu="rejoindre"][data-type="audio"]'), null, 15000, () => texteCorps(B));
    await toucher(B, '[data-reu="rejoindre"][data-type="audio"]');
    await verifier('⛔ Bruno (PERSO, invité) ENTRE dans la salle : l\'écran « En réunion » s\'ouvre — aucune feuille de forfait, aucun refus', B, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').getClientRects().length > 0, null, 20000, () => etatPage(B));
    v('… côté service : Bruno est PRÉSENT dans la salle d\'une réunion, et reste Perso (entrer ne lui a rien coûté ni rien donné)', [nb("SELECT COUNT(*) AS n FROM appel_part WHERE uid = '" + P.bruno.moi.id + "' AND statut = 'present'"), (await P.bruno.get('/api/moi/perso-plus')).j.formule], [1, 'perso']);
    vrai('… et sa page n\'a reçu AUCUN refus de forfait (402) : entrer est gratuit', !B.refus.some(x => /^402 /.test(x)));
    await capture(B, 'pp5-invite-gratuit-en-salle');
    await largeur(B, 'salle d\'une réunion (invité gratuit)');

    /* ═══ D. UN APPEL DE GROUPE : GRATUIT, SANS LES OUTILS DE L'ORGANISATEUR ; LANCÉ PAR PERSO+, AVEC ═══════════════════════════════════════════ */
    console.log('\n── D. Un appel de groupe : sans les outils de l\'organisateur quand il est lancé par une personne gratuite, avec quand c\'est Perso+ ──');
    try { await B.page.close(); } catch (e) { /* déjà fermée */ }
    const g1 = await P.chloe.post('/api/conversations/groupe', { nom: 'Équipe du jeudi', membres: [P.alice.moi.id, P.bruno.moi.id] });
    const g2 = await P.alice.post('/api/conversations/groupe', { nom: 'Atelier du vendredi', membres: [P.chloe.moi.id, P.bruno.moi.id] });
    vrai('population : deux groupes (le premier créé par Chloé, gratuite ; le second par Alice, Perso+)', g1.code === 201 && g2.code === 201);
    const C = await ouvrir(b, svc.base, PROFILS.iphone); C.nom = 'Chloé (iPhone)'; tous.push(C);
    await connecter(C, 'chloe');
    await toucher(C, '.conv[data-ouvrir="' + g1.j.conversation.id + '"]');
    await verifier('Chloé ouvre le groupe « Équipe du jeudi »', C, () => document.documentElement.dataset.conv === '1', null, 8000, () => etatPage(C));
    await toucher(C, '#conv-cam');
    await verifier('⛔ l\'appel de groupe GRATUIT s\'ouvre en salle (Chloé en est l\'hôte)', C, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').getClientRects().length > 0, null, 20000, () => etatPage(C));
    await toucher(C, '#salle-plus');
    await verifier('⛔ le panneau « Plus » dit en UNE ligne où sont les outils — « Les outils de l\'organisateur — salle d\'attente, verrou, sondage, minuteur, enregistrement — sont dans les réunions. » — et n\'en propose AUCUN',
      C, () => /Les outils de l'organisateur — salle d'attente, verrou, sondage, minuteur, enregistrement — sont dans les réunions\./.test((document.getElementById('salle-sans-outils') || {}).textContent || '') && !document.querySelector('[data-sa="verrou"],[data-sa="attente"],[data-sa="sondage-nouveau"],[data-sa="minuteur"],[data-sa="rec"]'), null, 10000, () => lire(C, '#salle-panneau-corps'));
    v('… ce qui reste à tous y est : le partage d\'écran des participants se règle, et il y a UNE seule ligne qui renvoie aux réunions', await C.page.evaluate(() => [!!document.querySelector('[data-sa="partage-ok"]'), document.querySelectorAll('#salle-sans-outils').length]), [true, 1]);
    await capture(C, 'pp6-groupe-gratuit-sans-outils');
    await largeur(C, 'salle d\'un appel de groupe gratuit');
    await toucher(C, '#salle-panneau-fermer');
    /* Chloé raccroche, puis Alice (Perso+) lance le sien */
    const finC = await attendre(C, () => !!document.getElementById('salle-quitter'), null, 5000);
    if (finC) { await toucher(C, '#salle-quitter'); if (await attendre(C, () => !!document.querySelector('[data-sa="terminer-confirmer"]'), null, 1500)) await toucher(C, '[data-sa="terminer-confirmer"]'); }   // seul dans la salle, « Quitter » part tout de suite ; avec d\'autres, l\'hôte choisit
    await verifier('Chloé a quitté la salle (l\'appel est fini pour tous)', C, () => document.documentElement.dataset.salle !== '1', null, 10000, () => etatPage(C));
    try { await C.page.close(); } catch (e) { /* déjà fermée */ }
    await onglet(A, 'messages');
    await toucher(A, '.conv[data-ouvrir="' + g2.j.conversation.id + '"]');
    await verifier('Alice ouvre le groupe « Atelier du vendredi »', A, () => document.documentElement.dataset.conv === '1', null, 8000, () => etatPage(A));
    await toucher(A, '#conv-cam');
    await verifier('l\'appel de groupe lancé par une personne Perso+ s\'ouvre en salle', A, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').getClientRects().length > 0, null, 20000, () => etatPage(A));
    await toucher(A, '#salle-plus');
    await verifier('⛔ le panneau « Plus » d\'Alice (Perso+) PROPOSE les outils — verrou, salle d\'attente — et ne renvoie plus aux réunions', A,
      () => !!document.querySelector('[data-sa="verrou"]') && !!document.querySelector('[data-sa="attente"]') && !document.getElementById('salle-sans-outils'), null, 10000, () => lire(A, '#salle-panneau-corps'));
    await capture(A, 'pp7-groupe-perso-plus-avec-outils');
    await largeur(A, 'salle d\'un appel de groupe lancé par Perso+');
    await toucher(A, '#salle-panneau-fermer');
    const finA = await attendre(A, () => !!document.getElementById('salle-quitter'), null, 5000);
    if (finA) { await toucher(A, '#salle-quitter'); if (await attendre(A, () => !!document.querySelector('[data-sa="terminer-confirmer"]'), null, 1500)) await toucher(A, '[data-sa="terminer-confirmer"]'); }
    await verifier('Alice a quitté la salle', A, () => document.documentElement.dataset.salle !== '1', null, 10000, () => etatPage(A));

    /* ═══ E. LE PAIEMENT EN RETARD, RÉGLÉ, PUIS LE FORFAIT RÉSILIÉ — PENDANT QUE LE FORMULAIRE EST OUVERT ═══════════════════════════════════════════ */
    console.log('\n── E. Un paiement en retard (impayé), réglé, puis un forfait résilié : chaque refus se dit en ouvrant la feuille du forfait ──');
    const sb = Array.from(fake.abonnements.values()).find(x => x.metadata && x.metadata.opmsg_personne === P.alice.moi.id);
    const refus402 = () => A.refus.filter(x => x === '402 POST /api/reunions').length;
    const envoyes = () => A.postes.filter(p => p.chemin === '/api/reunions').length;
    await onglet(A, 'reunions');
    await toucher(A, '#btn-reunion-nouvelle');
    await verifier('le formulaire s\'ouvre (Alice est encore Perso+)', A, () => document.getElementById('feuille-titre').textContent === 'Nouvelle réunion' && !!document.getElementById('rf-titre'), null, 10000, () => etatPage(A));
    await saisir(A, '#rf-titre', 'Après le retard');
    fake.statut(sb.id, 'past_due');
    const retard = await P.alice.post('/api/moi/perso-plus/relire', {});
    v('population : Stripe dit « en retard », le service l\'a relu — Alice n\'organise plus, TOUT DE SUITE (impayé, sans sursis) ; son abonnement existe encore', [retard.code, retard.j.organiser, retard.j.formule, retard.j.impaye, retard.j.abonnement && retard.j.abonnement.statut], [200, false, 'impaye', true, 'past_due']);
    const reunions0 = nb('SELECT COUNT(*) AS n FROM reunion'), postes0 = envoyes(), refus0 = refus402();
    await toucher(A, '[data-reu="form-enregistrer"]');
    await verifier('⛔ le service refuse (402) AU MOMENT d\'enregistrer et la page ouvre la FEUILLE DU FORFAIT : « Ton paiement Perso+ n\'est pas passé : mets ta carte à jour pour organiser des réunions. Rejoindre une réunion où tu es invité reste gratuit. » — « Gérer mon abonnement » et « J\'ai réglé — vérifier », pas de « S\'abonner »', A,
      () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === 'Perso+' && /Ton paiement Perso\+ n'est pas passé : mets ta carte à jour pour organiser des réunions\. Rejoindre une réunion où tu es invité reste gratuit\./.test(document.getElementById('info-corps').textContent)
        && !!document.querySelector('[data-pp="portail"]') && !!document.querySelector('[data-pp="relire"]') && !document.querySelector('[data-pp="payer"]'), null, 12000, () => texteCorps(A));
    v('… RIEN n\'a été créé (population : la page a bien envoyé UNE demande de plus, le service l\'a refusée)', [envoyes() - postes0, nb('SELECT COUNT(*) AS n FROM reunion') - reunions0, refus402() - refus0], [1, 0, 1]);
    await capture(A, 'pp8-paiement-en-retard');
    await largeur(A, 'feuille Perso+ (paiement en retard)');
    await fermerFeuille(A);
    await onglet(A, 'reglages'); await rubrique(A, 'entreprise');
    await verifier('Réglages › Abonnement : la ligne « Perso+ » dit « Paiement en retard : à régler »', A, () => /Perso\+\s*Paiement en retard : à régler/.test((document.getElementById('reg-pp') || {}).textContent || ''), null, 12000, () => lire(A, '#reg-abo'));
    /* le paiement est RÉGLÉ chez Stripe ; la personne touche « J'ai réglé — vérifier » dans la feuille, ouverte depuis Réglages */
    fake.statut(sb.id, 'active');
    await toucher(A, '#reg-pp');
    await verifier('la feuille du forfait s\'ouvre depuis Réglages, avec le retard encore affiché (la page n\'a pas relu tant qu\'on ne le lui demande pas)', A, () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === 'Perso+' && !!document.querySelector('[data-pp="relire"]'), null, 10000, () => texteCorps(A));
    await toucher(A, '[data-pp="relire"]');
    await verifier('⛔ « J\'ai réglé — vérifier » relit chez Stripe : « Abonnement confirmé par Stripe : tu peux organiser des réunions. », plus de retard affiché', A,
      () => /Abonnement confirmé par Stripe : tu peux organiser des réunions\./.test(document.getElementById('info-corps').textContent) && !/n'est pas passé/.test(document.getElementById('info-corps').textContent), null, 12000, () => texteCorps(A));
    v('… le SERVICE le dit de même : Alice organise de nouveau', await P.alice.get('/api/moi/perso-plus').then(r => [r.j.formule, r.j.organiser, r.j.impaye]), ['perso_plus', true, false]);
    await fermerFeuille(A);
    /* puis le forfait est RÉSILIÉ pendant qu'un formulaire est ouvert */
    await onglet(A, 'reunions');
    await toucher(A, '#btn-reunion-nouvelle');
    await verifier('le formulaire s\'ouvre de nouveau (Alice organise)', A, () => document.getElementById('feuille-titre').textContent === 'Nouvelle réunion' && !!document.getElementById('rf-titre'), null, 10000, () => etatPage(A));
    await saisir(A, '#rf-titre', 'Après la résiliation');
    fake.statut(sb.id, 'canceled');
    const relu = await P.alice.post('/api/moi/perso-plus/relire', {});
    v('population : Stripe dit « résilié », le service l\'a relu — Alice n\'organise plus', [relu.code, relu.j.organiser, relu.j.formule], [200, false, 'perso']);
    const reunions1 = nb('SELECT COUNT(*) AS n FROM reunion'), postes1 = envoyes(), refus1 = refus402();
    await toucher(A, '[data-reu="form-enregistrer"]');
    await verifier('⛔ le service refuse (402) AU MOMENT d\'enregistrer et la page ouvre la FEUILLE DU FORFAIT (« Perso+ ») : « Rejoindre une réunion où tu es invité reste gratuit. » et « S\'abonner » — une phrase qui dit quoi faire, pas un cul-de-sac', A,
      () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === 'Perso+' && !!document.querySelector('[data-pp="payer"]') && /Rejoindre une réunion où tu es invité reste gratuit\./.test(document.getElementById('info-corps').textContent), null, 12000, () => texteCorps(A));
    v('… RIEN n\'a été créé (population : la page a bien envoyé UNE demande de plus, le service l\'a refusée)', [envoyes() - postes1, nb('SELECT COUNT(*) AS n FROM reunion') - reunions1, refus402() - refus1], [1, 0, 1]);
    await capture(A, 'pp9-forfait-resilie');
    await fermerFeuille(A);

    /* ═══ F. SUPPRIMER SON COMPTE AVEC UN ABONNEMENT PERSO+ : LA PHRASE, L'ARRÊT DU RENOUVELLEMENT, LE RETOUR QUI LE RÉTABLIT ═══════════════════════════ */
    console.log('── F. Supprimer mon compte avec un abonnement Perso+ : la feuille le dit en une phrase, la demande arrête le renouvellement chez Stripe, se reconnecter le rétablit ──');
    {
      const D = await ouvrir(b, svc.base, PROFILS.iphone); D.nom = 'Dora (iPhone)'; tous.push(D);
      const jusque = (cond, ms) => T.attendre(cond, ms || 12000, 50);
      const feuilleSuppression = async (etape) => {
        await onglet(D, 'reglages'); await rubrique(D, 'compte');
        await toucher(D, '#reg-supprimer');
        await verifier(etape + ' : la feuille « Supprimer mon compte » est affichée en entier (population : ce qui part, ce qui reste, la case, le bouton)', D,
          () => document.getElementById('feuille-titre').textContent === 'Supprimer mon compte' && !!document.getElementById('sp-case') && /Ce qui sera effacé/.test(document.getElementById('info-corps').textContent) && !!document.getElementById('sp-oui'), null, 12000, () => texteCorps(D));
      };
      await connecter(D, 'dora');
      /* — avant tout abonnement : pas de section « Ton abonnement » — */
      await feuilleSuppression('sans abonnement');
      v('⛔ une personne SANS abonnement ne voit aucune section « Ton abonnement » (population : la feuille est là, avec sa case)', await D.page.evaluate(() => [!!document.getElementById('sp-case'), document.getElementById('sp-abonnement'), /Ton abonnement/.test(document.getElementById('info-corps').textContent)]), [true, null, false]);
      await toucher(D, '[data-act="suppression-annuler"]');
      await D.page.waitForFunction(() => !document.documentElement.classList.contains('feuille-ouverte'), null, { timeout: 5000 }).catch(() => {});
      /* — elle s'abonne (le geste est celui du service : la page n'a pas à le refaire ici), puis rouvre la feuille — */
      const payD = await P.dora.post('/api/moi/perso-plus/paiement', { cycle: 'mensuel' });
      const sbD = fake.payer(fake.derniereSession().id);
      const relD = await P.dora.post('/api/moi/perso-plus/relire', {});
      v('population : Dora a un abonnement Perso+ VIVANT chez Stripe, qui se renouvelle (le service l\'a relu)', [payD.code, relD.j.organiser, relD.j.abonnement && relD.j.abonnement.annule, sbD.cancel_at_period_end, sbD.status], [201, true, false, false, 'active']);
      await feuilleSuppression('abonnée');
      await verifier('⛔ la feuille dit, en une phrase : « Ton abonnement Perso+ ne sera plus renouvelé. » (le nom vient du service)', D, () => { const e = document.getElementById('sp-abonnement'); return !!e && e.textContent.trim() === 'Ton abonnement Perso+ ne sera plus renouvelé.'; }, null, 12000, () => texteCorps(D));
      v('… et ne renvoie PLUS la personne résilier elle-même au portail (la demande suffit : aucune consigne « Gérer mon abonnement », aucune date de résiliation promise pour plus tard)', await D.page.evaluate(() => /Gérer mon abonnement|résilie-le|est résilié chez Stripe/.test(document.getElementById('info-corps').textContent)), false);
      await capture(D, 'pp10-suppression-abonnee');
      await largeur(D, 'feuille Supprimer mon compte (abonnée)');
      /* — elle confirme : la page repart à l'écran de connexion, et Stripe a reçu l'ARRÊT du renouvellement — */
      const modsD = () => fake.modifications.filter(m => m.id === sbD.id).map(m => m.cancel_at_period_end);
      await D.page.locator('#sp-case').check();
      await toucher(D, '#sp-oui');
      await verifier('la page REPART à l\'écran de connexion, avec la date de l\'effacement', D, () => !document.getElementById('connexion').hidden && /Ton compte sera supprimé le /.test(document.getElementById('connexion-erreur').textContent), null, 20000, () => D.page.evaluate(() => location.href));
      const arret = await jusque(() => fake.abonnements.get(sbD.id).cancel_at_period_end === true);
      v('⛔ la DEMANDE a arrêté le renouvellement CHEZ STRIPE (le faux Stripe l\'a appliqué) : `cancel_at_period_end` vrai, un seul changement, l\'abonnement est toujours ACTIF, rien n\'est résilié, l\'échéance est posée',
        [arret, modsD(), fake.abonnements.get(sbD.id).status, fake.resiliations.includes(sbD.id), sql('SELECT suppression_le AS s FROM personne WHERE id = ?', P.dora.moi.id).s !== null], [true, [true], 'active', false, true]);
      /* — elle se reconnecte AVANT l'échéance : la suppression est annulée et le renouvellement revient — */
      await saisir(D, '#c-login', 'dora'); await saisir(D, '#c-pass', MOTS.dora); await toucher(D, '#c-entrer');
      await verifier('⛔ se reconnecter ANNULE la suppression : la page s\'ouvre et DIT « Bon retour : la suppression de ton compte est annulée »', D, () => { const a = document.getElementById('avis'); return !document.getElementById('app').hidden && !a.hidden && /la suppression de ton compte est annulée/.test(a.textContent); }, null, 20000, () => D.page.evaluate(() => location.href));
      const retabli = await jusque(() => fake.abonnements.get(sbD.id).cancel_at_period_end === false);
      v('⛔ … et le RENOUVELLEMENT REVIENT chez Stripe : `cancel_at_period_end` faux, deux changements en tout (arrêt, rétablissement), toujours actif, aucune résiliation, plus d\'échéance',
        [retabli, modsD(), fake.abonnements.get(sbD.id).status, fake.resiliations.includes(sbD.id), sql('SELECT suppression_le AS s FROM personne WHERE id = ?', P.dora.moi.id).s], [true, [true, false], 'active', false, null]);
      await capture(D, 'pp11-bon-retour-abonnee');
    }

    /* ═══ LA FIN ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── La fin : rien d\'anormal ──');
    const ATTENDUS = [/^401 /, /^402 POST \/api\/reunions$/, /^404 GET \/api\/reunions\/r_[0-9a-f]{32}$/];
    for (const S of tous) {
      vrai(S.nom + ' : (population) ' + S.gestes + ' gestes portés, ' + (S.ecrans || 0) + ' écrans mesurés en largeur', S.gestes > 2);
      v(S.nom + ' : 0 erreur JavaScript, aucune erreur de console autre qu\'un refus du service', [S.erreurs, S.console.filter(t => !/Failed to load resource/.test(t))], [[], []]);
      v(S.nom + ' : aucun écran ne déborde de ses ' + S.pf.w + ' px', S.debordements || [], []);
      v(S.nom + ' : aucune réponse du service plus de 2 s', S.lentes, []);
      v(S.nom + ' : les refus réseau relevés sont des refus ATTENDUS — relevé : ' + (S.refus.join(', ') || 'aucun'), S.refus.filter(x => !ATTENDUS.some(re => re.test(x))), []);
    }
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    const sortie = svc.sortie.texte();
    v('le service n\'a écrit AUCUNE erreur ni exception pendant tout le parcours (population : ' + sortie.split('\n').filter(Boolean).length + ' lignes de journal)', /Error|TypeError|unhandled|Exception/.test(sortie), false);
    try { if (S0) S0.fermer(); } catch (e) { /* déjà fermée */ }
    try { await b.close(); } catch (e) { /* rien */ }
    await svc.arreter(); await fake.fermer(); await og.fermer();
  }
  fin();
})();
