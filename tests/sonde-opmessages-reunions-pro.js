/* ══ SONDE DE BOUT EN BOUT — LES RÉUNIONS SONT À PRO, UN PERSO Y ENTRE PAR LE LIEN, DANS DE VRAIS NAVIGATEURS ═══════════════════════════════════════════════
   `tests/test-994.js` fait parler le module de données de la page au vrai service ; `test-991` et `test-992` jouent la formule et les routes. Celle-ci joue ce que seul un navigateur voit : la VRAIE PAGE
   SERVIE (`server-msg/public/`), au DOIGT (iPhone 393) et à la souris (bureau 1440), contre le VRAI service à la formule de PRODUCTION et un FAUX Stripe, sur 127.0.0.1 — jamais teamop.fr, jamais le vrai Stripe.
   Justin, 12 octobre 2026 : « Perso, c'est simple. C'est appel, message, et c'est tout. Créer des groupes d'appels, créer des groupes d'appels vidéo, mais pas de réunion. » — Perso+ : « le retirer » —
   « un Pro peut inviter des Persos à des réunions, mais que par lien ».

   Ce qu'elle joue :
     A. une personne PERSO (Alice) touche « Programmer » : la page ouvre la feuille « Réunions » (jamais un formulaire qu'elle sait refusé), qui dit la règle mot pour mot et mène à Messages Pro (« Entreprise ») ;
     B. une personne PRO (Dora) programme avec Bruno (Perso) et Chloé (Pro) : la page lui dit qu'il faut envoyer le LIEN à Bruno, le service n'a invité que Chloé ; « Inviter » Alice (Perso) depuis la fiche dit la même chose ;
     C. Bruno (Perso) : sans le lien, la réunion lui est inconnue ; PAR LE LIEN, il la voit, passe par « Avant d'entrer » et ENTRE dans la salle — invité accepté, toujours Perso, aucun refus ;
     D. Alice (Perso) lance un appel de GROUPE EN VIDÉO : permis ; la salle n'a pas les outils de l'organisateur et dit où ils sont ;
     E. l'abonnement de l'espace de Dora est résilié pendant que Chloé remplit le formulaire : le service refuse au moment d'enregistrer, la page ouvre la feuille « Réunions » — rien n'est créé.
   Partout : aucune erreur JavaScript, aucun débordement, chaque refus réseau NOMMÉ.

   ⛔ CE QU'ELLE NE PEUT PAS JOUER, ET DIT : Safari/iOS ; un vrai relais d'appel et une vraie liaison pair à pair entre deux navigateurs (ce que la salle MONTRE se mesure, pas la voix).
   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), JAMAIS AU CHRONOMÈTRE. ⛔ UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU À LA PLACE.
   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-reunions-pro.js        CAPTURES=/dossier   (une capture à chaque étape clé)
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
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-reunions-pro.js'); process.exit(2); }
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
const CLE = ['rk', 'test', 'BancSondeReunionsProZzQ9'].join('_');
const PRIX_PRO = { mensuel: 'price_BancSondeProMensA1', annuel: 'price_BancSondeProAnnuB2' };
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
  if (vue === 'reglages' && await S.page.evaluate(() => { const s = document.getElementById('vue-reglages'); return !!s && !s.hidden && s.getClientRects().length > 0; })) return;   /* déjà dans le Profil (une rubrique ouverte) : « Profil » n'est plus un onglet (7 octobre 2026), et la rubrique se choisit d'ici */
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
const petitesCibles = (S, sel) => S.page.evaluate((s) => Array.from(document.querySelectorAll(s)).filter(e => e.getClientRects().length > 0 && !e.hidden).map(e => { const r = e.getBoundingClientRect(); return [e.dataset.rp || e.dataset.reu || e.id || e.className, Math.round(r.height)]; }).filter(x => x[1] < 44), sel);

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
  const svc = await T.lancerService({ urlGestion: og.url, config: { pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, formule: { toutOuvert: false }, quotas: QUOTAS,
    facturation: { cle: CLE, prix: PRIX_PRO, relectureMs: 3600000, timeoutMs: 3000 }, appels: { balayageMs: 1000, perduMs: 600000 } }, env: { OPMSG_TEST_STRIPE: fake.hote } });
  let b = null, S0 = null;
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const nb = (req, ...args) => Number(sql(req, ...args).n);
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : le navigateur ne démarre pas (' + e.message.split('\n')[0] + ')'); await svc.arreter(); await fake.fermer(); await og.fermer(); process.exit(2); }
  const tous = [];
  try {
    const P = {}; for (const l of Object.keys(MOTS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    await contacts(P.dora, P.bruno); await contacts(P.dora, P.alice); await contacts(P.dora, P.chloe); await contacts(P.alice, P.bruno); await contacts(P.alice, P.chloe);
    /* Dora tient un espace PRO payé, et Chloé en est membre : deux personnes Pro ; Alice et Bruno n'ont rien — Perso */
    S0 = ouvrirBase({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: Date.now });
    const ED = S0.espaceCreer({ nom: 'Atelier Dora', proprio: P.dora.moi.id }).id;
    const abo = (statut) => S0.abonnementPoser(ED, { client: 'cus_sondeRpDora', abonnement: 'sub_sondeRpDora', statut, places: 5, fin_periode: null, annule: false, impaye: false }, { adopter: true });
    abo('active');
    { const code = crypto.randomBytes(16).toString('base64url'); S0.lienCreer({ h: sha(code), genre: 'espace', cible: ED, par: P.dora.moi.id, ttlMs: 86400000, max: 5 }); S0.invitationAccepter({ h: sha(code), uid: P.chloe.moi.id, max: Infinity }); }
    const formule = async (x) => (await x.get('/api/espaces')).j;
    v('population : Alice et Bruno sont Perso (ils n\'organisent pas), Dora et Chloé sont Pro (l\'espace de Dora est payé)', await Promise.all(['alice', 'bruno', 'dora', 'chloe'].map(async l => { const f = await formule(P[l]); return [l, f.formule, f.organiser]; })),
      [['alice', 'perso', false], ['bruno', 'perso', false], ['dora', 'pro', true], ['chloe', 'pro', true]]);

    /* ═══ A. UNE PERSONNE PERSO TOUCHE « PROGRAMMER » : LA FEUILLE « RÉUNIONS » ═══════════════════════════════════════════════════════════════════ */
    console.log('── A. Perso : l\'Agenda propose « Rendez-vous » ; « Programmer une réunion » ouvre la feuille « Réunions », qui dit la règle et mène à Messages Pro ──');
    const A = await ouvrir(b, svc.base, PROFILS.iphone); A.nom = 'Alice (iPhone)'; tous.push(A);
    await connecter(A, 'alice');
    await onglet(A, 'reunions');
    /* ⛔ 13 octobre 2026 (« dans Perso, à la place de réunion tu mets rendez-vous ») : l'en-tête de l'Agenda d'une personne Perso propose « Rendez-vous », plus « Réunion » */
    await verifier('⛔ Perso : l\'en-tête de l\'Agenda propose « Rendez-vous » (visible), « Réunion » est caché (population : il existe)', A, () => { const vu = (id) => { const x = document.getElementById(id); return !!x && !x.hidden && x.getClientRects().length > 0; };
      return vu('btn-rdv-nouveau') && !!document.getElementById('btn-reunion-nouvelle') && !vu('btn-reunion-nouvelle'); }, null, 10000, () => etatPage(A));
    /* la réunion reste joignable — pour apprendre qu'elle est à Pro — par « Nouvelle discussion › Programmer une réunion » */
    await onglet(A, 'messages'); await toucher(A, '#btn-plus');
    await verifier('population : « Nouvelle discussion » porte « Programmer une réunion »', A, () => !!document.querySelector('[data-nd-act="reunion"]'), null, 8000, () => texteCorps(A));
    await toucher(A, '[data-nd-act="reunion"]');
    await verifier('⛔ la page ouvre la feuille « Réunions », pas un formulaire qu\'elle sait refusé', A, () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === 'Réunions' && !document.querySelector('[data-reu="form-enregistrer"]'), null, 10000, () => texteCorps(A));
    v('… elle dit EXACTEMENT la règle : les réunions sont à Messages Pro, Perso a les messages et les appels (de groupe aussi, audio et vidéo), on entre par le lien', await A.page.evaluate(() => Array.from(document.querySelectorAll('#info-corps .reg-ligne, #info-corps .info-note')).map(e => e.textContent.trim())),
      ['Les réunions font partie de Messages Pro.', 'Avec Messages Perso : les messages, les appels, et les appels de groupe en audio comme en vidéo.', 'Pour entrer dans une réunion, il te suffit du lien que son organisateur t\'envoie.']);
    v('… un seul bouton, « Messages Pro — Il s\'ajoute à un espace d\'entreprise », aucun prix, aucun « Perso+ »', await A.page.evaluate(() => [Array.from(document.querySelectorAll('#info-corps [data-rp]')).map(x => { const t = x.querySelector('.reglage-texte'), sm = t && t.querySelector('small'); return t && sm ? [t.firstChild.textContent.trim(), sm.textContent.trim()] : x.textContent.trim(); }), /€|euro|Perso\+/i.test(document.getElementById('info-corps').textContent)]),
      [[['Messages Pro', 'Il s\'ajoute à un espace d\'entreprise']], false]);
    v('… et RIEN ne s\'est écrit ni demandé (population : la page a lu la formule ; aucune programmation envoyée, aucune session de paiement, aucune réunion)', [A.requetes.includes('GET /api/espaces'), A.postes.filter(p => p.chemin === '/api/reunions').length, fake.sessions.size, nb('SELECT COUNT(*) AS n FROM reunion')], [true, 0, 0, 0]);
    v('au doigt, le bouton de la feuille fait ' + SEUIL_CIBLE + ' px au moins', await petitesCibles(A, '#info-corps [data-rp]'), []);
    await capture(A, 'rp1-feuille-reunions');
    await largeur(A, 'feuille « Réunions » (Perso)');
    await toucher(A, '[data-rp="entreprise"]');
    await verifier('« Messages Pro » mène à la feuille « Entreprise » (là où Messages Pro s\'ajoute à un espace)', A, () => document.getElementById('feuille-titre').textContent === 'Entreprise', null, 8000, () => texteCorps(A));
    await fermerFeuille(A);

    /* ═══ B. UN PRO INVITE UN PERSO : PAR LE LIEN ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── B. Dora (Pro) programme avec Bruno (Perso) et Chloé (Pro) : Bruno passera par le lien ──');
    const D = await ouvrir(b, svc.base, PROFILS.bureau); D.nom = 'Dora (bureau)'; tous.push(D);
    await connecter(D, 'dora');
    await onglet(D, 'reunions');
    /* ⛔ Dora a les deux côtés : « Réunion » est celui du côté Pro (13 octobre 2026) — elle y passe par la barre latérale, le seul sélecteur du bureau */
    await toucher(D, '.cote-seg-side [data-cote="pro"]');
    await verifier('Dora côté Pro : l\'en-tête de l\'Agenda propose « Réunion », plus « Rendez-vous »', D, () => { const vu = (id) => { const x = document.getElementById(id); return !!x && !x.hidden && x.getClientRects().length > 0; };
      return document.documentElement.dataset.cote === 'pro' && vu('btn-reunion-nouvelle') && !!document.getElementById('btn-rdv-nouveau') && !vu('btn-rdv-nouveau'); }, null, 10000, () => etatPage(D));
    await toucher(D, '#btn-reunion-nouvelle');
    await verifier('Dora (Pro) : le formulaire « Nouvelle réunion » s\'ouvre', D, () => document.getElementById('feuille-titre').textContent === 'Nouvelle réunion' && !!document.getElementById('rf-titre'), null, 10000, () => texteCorps(D));
    await saisir(D, '#rf-titre', 'Point WQXZ-LIEN');
    await toucher(D, '[data-reu="form-invite"][data-uid="' + P.bruno.moi.id + '"]');
    await toucher(D, '[data-reu="form-invite"][data-uid="' + P.chloe.moi.id + '"]');
    await verifier('deux invités choisis', D, () => document.getElementById('rf-invites-n').textContent === '2', null, 6000, () => lire(D, '#rf-invites-n'));
    await toucher(D, '[data-reu="form-enregistrer"]');
    await verifier('⛔ la réunion naît, et la page DIT à Dora qu\'une personne n\'a pas Messages Pro : « envoie-lui le lien de la réunion »', D,
      () => document.getElementById('mot').textContent.includes('Réunion programmée — 1 personne n\'a pas Messages Pro : envoie-lui le lien de la réunion'), null, 15000, () => lire(D, '#mot'));
    const RB = sql("SELECT id FROM reunion WHERE hote = ? ORDER BY cree DESC LIMIT 1", P.dora.moi.id);
    const invitesDe = (id) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare('SELECT uid FROM reunion_invite WHERE reunion = ?').all(id).map(r => r.uid).sort(); } finally { d.close(); } };
    v('… le SERVICE l\'a créée avec Dora et Chloé — Bruno n\'est PAS invité en son nom', [!!RB, RB ? invitesDe(RB.id) : null], [true, [P.dora.moi.id, P.chloe.moi.id].sort()]);
    await capture(D, 'rp2-programmee-par-lien');
    await verifier('la fiche de la réunion s\'ouvre, avec la section « Inviter » (Alice et Bruno, Perso, y sont proposés)', D, (u) => !!document.querySelector('[data-reu="inviter"][data-uid="' + u + '"]'), P.alice.moi.id, 12000, () => texteCorps(D));
    await toucher(D, '[data-reu="inviter"][data-uid="' + P.alice.moi.id + '"]');
    await verifier('⛔ « Inviter » Alice (Perso) : la page dit « Cette personne n\'a pas Messages Pro : envoie-lui le lien de la réunion »', D, () => document.getElementById('mot').textContent.includes('Cette personne n\'a pas Messages Pro : envoie-lui le lien de la réunion'), null, 10000, () => lire(D, '#mot'));
    v('… et le service n\'a ajouté personne (toujours Dora et Chloé)', invitesDe(RB.id), [P.dora.moi.id, P.chloe.moi.id].sort());
    await largeur(D, 'fiche d\'une réunion (Pro)');
    await fermerFeuille(D);

    /* ═══ C. UN PERSO ENTRE PAR LE LIEN ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── C. Bruno (Perso) entre dans la réunion de Dora par son lien ──');
    const debut = new Date(Date.now() + 2 * 60000);
    const maintenant = await P.dora.post('/api/reunions', { titre: 'Salle ouverte WQXZ', debut: localParis(debut), fin: localParis(new Date(debut.getTime() + 3600000)), tz: 'Europe/Paris', invites: [P.bruno.moi.id], rappels: [15], notifier: true });
    v('population : Dora (Pro) programme une réunion qui commence dans deux minutes, Bruno (Perso) est rendu « par le lien »', [maintenant.code, maintenant.j.par_lien], [201, [P.bruno.moi.id]]);
    const R = maintenant.j.reunion.id;
    const lien = await P.dora.post('/api/reunions/' + R + '/lien', {});
    vrai('population : Dora lit le lien d\'invité de la réunion', (lien.code === 200 || lien.code === 201) && typeof lien.j.code === 'string' && lien.j.code.length >= 20);
    const Bz = await ouvrir(b, svc.base, PROFILS.bureau); Bz.nom = 'Bruno (bureau)'; tous.push(Bz);
    await connecter(Bz, 'bruno');
    await Bz.page.goto(Bz.base + '/#reunions/' + R);
    await verifier('⛔ SANS le lien, la réunion reste inconnue à Bruno (il n\'est pas invité en son nom) : la page le dit, sans « Rejoindre »', Bz, () => /Cette réunion n'existe plus, ou tu n'y es plus invité\./.test(document.body.textContent) && !document.querySelector('[data-reu="rejoindre"]'), null, 15000, () => texteCorps(Bz));
    await Bz.page.goto(Bz.base + '/#reunion=' + lien.j.code);
    await verifier('PAR LE LIEN : la feuille « Réunion » montre la réunion de Dora et propose de la rejoindre', Bz, () => document.documentElement.classList.contains('feuille-ouverte') && /Salle ouverte WQXZ/.test(document.getElementById('info-corps').textContent) && !!document.querySelector('[data-reu="invite-rejoindre"][data-type="audio"]'), null, 15000, () => texteCorps(Bz));
    await capture(Bz, 'rp3-lien-perso');
    await toucher(Bz, '[data-reu="invite-rejoindre"][data-type="audio"]');
    await verifier('« Avant d\'entrer » s\'ouvre : Bruno y touche « Rejoindre »', Bz, () => !!document.getElementById('avant-rejoindre'), null, 12000);
    await toucher(Bz, '#avant-rejoindre');
    await verifier('⛔ Bruno (PERSO) ENTRE dans la salle par le lien : l\'écran « En réunion » s\'ouvre — aucune feuille « Réunions », aucun refus', Bz, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').getClientRects().length > 0, null, 20000, () => etatPage(Bz));
    v('… côté service : Bruno est PRÉSENT, il est devenu invité (accepté) PAR LE LIEN, et il reste Perso', [nb("SELECT COUNT(*) AS n FROM appel_part WHERE uid = ? AND statut = 'present'", P.bruno.moi.id), invitesDe(R).includes(P.bruno.moi.id), (await formule(P.bruno)).formule], [1, true, 'perso']);
    vrai('… et sa page n\'a reçu AUCUN refus de formule (402)', !Bz.refus.some(x => /^402 /.test(x)));
    await capture(Bz, 'rp4-perso-en-salle');
    await largeur(Bz, 'salle d\'une réunion (Perso entré par le lien)');
    try { await Bz.page.close(); } catch (e) { /* déjà fermée */ }

    /* ═══ D. PERSO LANCE UN APPEL DE GROUPE EN VIDÉO ══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── D. Alice (Perso) lance un appel de groupe en vidéo : permis, sans les outils de l\'organisateur ──');
    const g = await P.alice.post('/api/conversations/groupe', { nom: 'Équipe du jeudi', membres: [P.bruno.moi.id, P.chloe.moi.id] });
    vrai('population : Alice (Perso) crée un groupe avec Bruno et Chloé', g.code === 201);
    await onglet(A, 'messages');
    await toucher(A, '.conv[data-ouvrir="' + g.j.conversation.id + '"]');
    await verifier('Alice ouvre le groupe « Équipe du jeudi »', A, () => document.documentElement.dataset.conv === '1', null, 8000, () => etatPage(A));
    await toucher(A, '#conv-cam');
    await verifier('⛔ l\'appel de groupe EN VIDÉO s\'ouvre en salle pour une personne Perso (Alice en est l\'hôte) — « groupes d\'appels vidéo » sont à Perso', A, () => document.documentElement.dataset.salle === '1' && document.getElementById('salle-ecran').getClientRects().length > 0, null, 20000, () => etatPage(A));
    v('… côté service : un appel de GROUPE (pas une réunion), Alice présente', [nb("SELECT COUNT(*) AS n FROM appel a JOIN appel_part p ON p.appel = a.id WHERE a.genre = 'groupe' AND a.conv = ? AND p.uid = ? AND p.statut = 'present'", g.j.conversation.id, P.alice.moi.id), nb("SELECT COUNT(*) AS n FROM appel WHERE genre = 'reunion' AND conv = ?", g.j.conversation.id)], [1, 0]);
    await toucher(A, '#salle-plus');
    await verifier('⛔ le panneau « Plus » dit en UNE ligne où sont les outils de l\'organisateur — dans les réunions — et n\'en propose AUCUN',
      A, () => /Les outils de l'organisateur — salle d'attente, verrou, sondage, minuteur, enregistrement — sont dans les réunions\./.test((document.getElementById('salle-sans-outils') || {}).textContent || '') && !document.querySelector('[data-sa="verrou"],[data-sa="attente"],[data-sa="sondage-nouveau"],[data-sa="minuteur"],[data-sa="rec"]'), null, 10000, () => lire(A, '#salle-panneau-corps'));
    await capture(A, 'rp5-groupe-video-perso');
    await largeur(A, 'salle d\'un appel de groupe (Perso)');
    await toucher(A, '#salle-panneau-fermer');
    if (await attendre(A, () => !!document.getElementById('salle-quitter'), null, 5000)) { await toucher(A, '#salle-quitter'); if (await attendre(A, () => !!document.querySelector('[data-sa="terminer-confirmer"]'), null, 1500)) await toucher(A, '[data-sa="terminer-confirmer"]'); }
    await verifier('Alice a quitté la salle', A, () => document.documentElement.dataset.salle !== '1', null, 10000, () => etatPage(A));

    /* ═══ E. LE SERVICE REFUSE AU MOMENT D'ENREGISTRER : LA PAGE OUVRE LA FEUILLE « RÉUNIONS » ═══════════════════════════════════════════════════════ */
    console.log('\n── E. L\'abonnement de l\'espace de Dora est résilié pendant que Chloé remplit le formulaire : refus au moment d\'enregistrer ──');
    await P.chloe.post('/api/moi/maj', { prefs: { mode: 'pro' } });          // Chloé travaille côté Pro (le côté qu'elle a choisi : la page le relit en se connectant)
    const C = await ouvrir(b, svc.base, PROFILS.iphone); C.nom = 'Chloé (iPhone)'; tous.push(C);
    await connecter(C, 'chloe');
    await onglet(C, 'reunions');
    await toucher(C, '#btn-reunion-nouvelle');
    await verifier('Chloé (Pro par l\'espace de Dora) : le formulaire « Nouvelle réunion » s\'ouvre', C, () => document.getElementById('feuille-titre').textContent === 'Nouvelle réunion' && !!document.getElementById('rf-titre'), null, 10000, () => texteCorps(C));
    await saisir(C, '#rf-titre', 'Point WQXZ-RESILIE');
    abo('canceled');
    v('population : l\'abonnement de l\'espace est résilié — Chloé n\'organise plus (le service le dit)', [(await formule(P.chloe)).formule, (await formule(P.chloe)).organiser], ['perso', false]);
    const n0 = nb('SELECT COUNT(*) AS n FROM reunion');
    await toucher(C, '[data-reu="form-enregistrer"]');
    await verifier('⛔ le service refuse (402, offre « pro ») et la page ouvre la feuille « Réunions » — pas un message d\'erreur muet', C, () => document.getElementById('feuille-titre').textContent === 'Réunions' && /Les réunions font partie de Messages Pro\./.test(document.getElementById('info-corps').textContent), null, 12000, () => texteCorps(C));
    v('… rien n\'est créé (le nombre de réunions n\'a pas bougé), et un seul envoi a été tenté', [nb('SELECT COUNT(*) AS n FROM reunion') - n0, C.postes.filter(p => p.chemin === '/api/reunions').length], [0, 1]);
    await capture(C, 'rp6-refus-au-moment-d-enregistrer');
    await largeur(C, 'feuille « Réunions » après un refus');

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
