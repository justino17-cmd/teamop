/* ══ SONDE DE BOUT EN BOUT — LES ESPACES PROFESSIONNELS, LES CANAUX ET MESSAGES PRO D'OP MESSAGES, DANS DE VRAIS NAVIGATEURS ═════════════════════════════
   `tests/test-964.js` fait parler le module de données de la page au vrai service ; `test-960` à `test-963` jouent le service seul ; `test-965` joue le vrai OP GESTION. Celle-ci joue ce que seul un
   navigateur voit : la VRAIE PAGE SERVIE (`server-msg/public/`), au DOIGT (iPhone 393) et à la souris (bureau 1440), contre le VRAI service — deux fois : la bêta (tout ouvert : espaces, invitations,
   canaux, rôles) et un service à la formule de PRODUCTION contre un faux Stripe (ce qui n'est pas payé est refusé) — tout sur 127.0.0.1, jamais teamop.fr.

   ⛔ CE QU'ELLE NE PEUT PAS JOUER, ET DIT : la page de paiement de Stripe est sur Internet, que ce conteneur n'a pas. La navigation vers `checkout.stripe.test` est INTERCEPTÉE (le navigateur arrive sur
   une page de banc) et le retour est joué par la même adresse que Stripe appellerait (`/?abo=retour&e=…`) APRÈS que le faux Stripe a « payé » la session que le service avait demandée. Un vrai paiement
   par une vraie carte n'est vérifiable que par Justin (clé restreinte de test, puis de production).

   Ce qu'elle joue : Réglages › Entreprise et Abonnement ; créer un espace ; un lien d'invitation (créé et qui RESTE affiché après le redessin que sa création provoque ; ouvert dans une page neuve, dans un
   onglet déjà ouvert, et PENDANT QUE la feuille « Entreprise » est déjà ouverte) ; « Contacts de l'entreprise » (le champ FILTRE ; « Écrire » à un collègue qui n'est pas un contact) ; un canal public et un
   canal privé, vus des deux côtés ; le retrait d'un canal privé en direct ; les rôles (nommer, retirer en deux touches, passer la propriété, quitter) ; un non-membre qui ne voit RIEN ; l'aperçu d'un lien
   qui n'accepte rien ; le propriétaire qui renomme son espace, révoque ses liens (le lien révoqué dit « n'est plus valable », sans aperçu), supprime un canal et l'espace en deux touches (chez les autres, en
   direct) ; Messages Pro : l'état, le formulaire de paiement, l'adresse de Stripe, le retour de Stripe qui relit tout seul, « J'ai réglé — vérifier », le portail, l'impayé qui dit pourquoi à
   l'administrateur seul et ne retire rien, la suppression de l'espace refusée tant qu'un abonnement court ; l'absence d'erreur dans la console et de débordement d'écran.

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), JAMAIS AU CHRONOMÈTRE. ⛔ UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU À LA PLACE.
   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-espaces.js
              CAPTURES=/dossier   (une capture de chaque navigateur à chaque étape clé)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const { ouvrir: ouvrirBase } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-espaces.js'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const dormir = T.dort;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const PROFILS = {
  iphone: { nom: 'iPhone 393', w: 393, h: 852, dpr: 2, mobile: true, insets: { top: 54, bottom: 34 } },
  bureau: { nom: 'bureau 1440', w: 1440, h: 900, dpr: 1, mobile: false, insets: null },
};
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234', chloe: 'pw-chloe-1234', dora: 'pw-dora-12345' };
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Durand', dora: 'Dora Leroy' };
const CLE = ['rk', 'test', 'BancSondeZzQq9X'].join('_');
const PRIX = { mensuel: 'price_BancSondeMensuelAa01', annuel: 'price_BancSondeAnnuelBb02' };
const JOUR = 86400000;

async function ouvrir(b, base, pf, o) {
  o = o || {};
  const ctx = await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: 'light', reducedMotion: 'reduce', locale: 'fr-FR',
    timezoneId: 'Europe/Paris', permissions: ['clipboard-read', 'clipboard-write'], baseURL: base,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const S = { ctx, page, pf, nom: '?', base, erreurs: [], console: [], gestes: 0, requetes: [], navigations: [] };
  /* l'erreur ET d'où elle vient (les trois premières lignes de la pile) : « Cannot read properties of null » seul ne nomme personne */
  /* ⛔ Un prédicat de `waitForFunction` qui lit un élément pas encore là jette DANS la page, et Playwright le relaie comme une erreur de page : la sonde s'accuserait elle-même (tour 3 de cette sonde :
     « 0 erreur JavaScript » tombé sur sa propre attente). Une erreur dont AUCUNE ligne de pile n'est un script servi par l'application, et qui vient d'une évaluation de la sonde, est celle de la sonde. */
  S.bruitSonde = 0;
  page.on('pageerror', e => {
    const pile = String(e && e.stack || ''), dePage = pile.includes(new URL(base).origin + '/') && /\.js:\d+:\d+/.test(pile.split(new URL(base).origin).slice(1).join(''));
    if (!dePage && /eval at (predicate|evaluate)/.test(pile)) { S.bruitSonde++; return; }
    S.erreurs.push(String(e && e.message || e).slice(0, 240) + (pile ? ' @ ' + pile.split('\n').slice(1, 4).map(x => x.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' < ') : ''));
  });
  page.on('console', m => { if (m.type() === 'error') S.console.push(m.text().slice(0, 240)); });
  page.on('request', r => { const u = new URL(r.url()); if (u.origin === new URL(base).origin) S.requetes.push(r.method() + ' ' + u.pathname); });
  /* chaque refus du service, NOMMÉ (statut, méthode, chemin) : « un 429 » seul ne dit pas quelle route a refusé */
  S.refus = []; S.lentes = [];
  /* une réponse du service qui met plus de 2 s est NOMMÉE : une page qui « arrive en retard » ne se devine pas à la lecture */
  page.on('requestfinished', r => { try { const t = r.timing(), u = new URL(r.url()); const d = t.responseEnd - t.startTime; if (u.origin === new URL(base).origin && d > 2000) S.lentes.push(r.method() + ' ' + u.pathname + ' ' + Math.round(d) + ' ms'); } catch (e) { /* sans mesure */ } });
  page.on('response', r => { try { const u = new URL(r.url()); if (u.origin === new URL(base).origin && r.status() >= 400) S.refus.push(r.status() + ' ' + r.request().method() + ' ' + u.pathname); } catch (e) { /* une réponse sans adresse lisible */ } });
  /* Stripe est sur Internet : les adresses de banc de Stripe répondent une page de banc, et la sonde NOTE chaque navigation vers elles */
  await ctx.route(/^https:\/\/(checkout|billing)\.stripe\.test\//, r => { S.navigations.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/html;charset=utf-8', body: '<!doctype html><title>Stripe du banc</title><p>Stripe du banc</p>' }); });
  if (pf.insets) { try { const c = await ctx.newCDPSession(page); await c.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, bottom: pf.insets.bottom, left: 0, right: 0 } }); } catch (e) { /* facultatif */ } }
  return S;
}
const lire = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
/* ⛔ Une exception DU PRÉDICAT (un élément qui n'est pas encore dans la page : « Cannot read properties of null ») fait échouer `waitForFunction` tout de suite, sans attendre le délai — première version de cette
   sonde : « non vu à temps » au bout de 30 ms. On réessaie jusqu'au délai ; seul le délai écoulé dit « pas vu ». */
async function attendre(S, fn, arg, ms) {
  const fin = Date.now() + (ms || 12000);
  for (;;) {
    try { await S.page.waitForFunction(fn, arg, { timeout: Math.max(1, fin - Date.now()), polling: 50 }); return true; }
    catch (e) {
      if (/Timeout/i.test(String(e && e.message)) || Date.now() >= fin) return false;
      await dormir(80);
    }
  }
}
/* ce que la page DIT à ce moment (titre de feuille, refus affiché, toast, dernières erreurs) : une mesure qui échoue doit nommer ce qu'elle a lu à la place */
const etatPage = (S) => S.page.evaluate(() => {
  const t = id => { const e = document.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null; };
  const code = document.getElementById('en-code'), ap = document.getElementById('en-apercu');
  return 'feuille=' + t('feuille-titre') + (document.documentElement.classList.contains('feuille-ouverte') ? '(ouverte)' : '(fermée)') + ' · erreur=' + (t('info-erreur') || '') + ' · mot=' + (t('mot') || '') + ' · conv=' + (document.documentElement.dataset.conv || '-') + ' · vue=' + (document.documentElement.dataset.vue || '-')
    + (code ? ' · champ-lien=' + code.value.slice(0, 30) + ' · aperçu=' + (ap ? ap.textContent.slice(0, 80) : '(absent)') : '') + ' · adresse=' + location.pathname + location.search + location.hash.slice(0, 40);
}).then(x => x + ' · dernières requêtes : ' + S.requetes.slice(-5).join(', ')).catch(() => '?');
async function verifier(titre, S, fn, arg, ms, vu) {
  const t0 = Date.now();
  const ok = await attendre(S, fn, arg, ms);
  if (ok) { vrai(titre, true); if (Date.now() - t0 > 3000) (S.attentes = S.attentes || []).push(titre.slice(0, 70) + ' : ' + (Date.now() - t0) + ' ms'); }
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
/* deux trames et une lecture forcée, puis la page est POUSSÉE à droite : seul un défilement réel compte (CLAUDE.md) */
async function largeur(S, etape) {
  const mesure = () => S.page.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
    window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
    return { dep: document.documentElement.scrollWidth, sx, n: document.querySelectorAll('body *').length };
  });
  await mesure(); await dormir(600); const b = await mesure();
  S.ecrans = (S.ecrans || 0) + 1; S.population = (S.population || 0) + b.n;
  if (b.sx > 0 || b.dep > S.pf.w + 1) (S.debordements = S.debordements || []).push(etape + ' : scrollWidth ' + b.dep + ' pour ' + S.pf.w + ', poussée ' + b.sx);
}
const titreFeuille = (S) => lire(S, '#feuille-titre');
const feuilleOuverte = (t) => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === t;
const texteCorps = (S) => lire(S, '#info-corps');
const lignes = (S, sel) => S.page.evaluate(s => Array.from(document.querySelectorAll(s)).filter(e => e.getClientRects().length > 0 && !e.hidden).map(e => e.textContent.replace(/\s+/g, ' ').trim()), sel);
async function fermerFeuille(S) {
  const ouverte = await S.page.evaluate(() => document.documentElement.classList.contains('feuille-ouverte'));
  if (ouverte) { await toucher(S, '#g-annuler'); await S.page.waitForFunction(() => !document.documentElement.classList.contains('feuille-ouverte'), null, { timeout: 5000 }).catch(() => {}); }
}
const mot = (S) => lire(S, '#mot');

/* ═══ A. LA BÊTA : TOUT OUVERT — ESPACES, INVITATIONS, CANAUX, RÔLES ══════════════════════════════════════════════════════════════════════════════════════ */
async function parcoursA(b, ctx) {
  const { svc } = ctx;
  const A = await ouvrir(b, svc.base, PROFILS.iphone), B = await ouvrir(b, svc.base, PROFILS.bureau), D = await ouvrir(b, svc.base, PROFILS.iphone), Z = await ouvrir(b, svc.base, PROFILS.bureau);
  A.nom = 'Alice'; B.nom = 'Bruno'; D.nom = 'Dora'; Z.nom = 'Chloé';
  const tous = [A, B, D, Z];
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  await connecter(A, 'alice'); await connecter(B, 'bruno'); await connecter(D, 'dora'); await connecter(Z, 'chloe');

  console.log('── Réglages › Entreprise (au doigt, iPhone 393) ──');
  await onglet(A, 'reglages');
  await verifier('la rubrique « Entreprise » paraît, sans aucun espace, avec sa commande « Créer ou rejoindre un espace » ; la rubrique « Abonnement » dit la formule', A,
    () => !!document.getElementById('reg-esp-gerer') && document.querySelectorAll('#reg-esp [data-esp-ouvrir]').length === 0 && /Ta formule/.test(document.getElementById('reg-abo').textContent), null, 10000, () => lire(A, '#vue-reglages'));
  await capture(A, 'a1-reglages');
  await largeur(A, 'Réglages (entreprise)');
  await toucher(A, '#reg-esp-gerer');
  await verifier('la feuille « Entreprise » s\'ouvre : le champ du nom et celui du lien reçu', A, () => document.getElementById('feuille-titre').textContent === 'Entreprise' && !!document.getElementById('en-nom') && !!document.getElementById('en-code'), null, 8000, () => texteCorps(A));
  await capture(A, 'a2-entreprise');
  await largeur(A, 'feuille Entreprise');
  /* un nom vide se dit */
  await toucher(A, '[data-act="esp-creer"]');
  await verifier('créer sans nom : « Donne un nom à l\'espace. », rien n\'est créé', A, () => /Donne un nom à l'espace/.test(document.getElementById('info-erreur').textContent), null, 4000, () => texteCorps(A));
  await saisir(A, '#en-nom', 'Atelier Banc');
  await toucher(A, '[data-act="esp-creer"]');
  await verifier('créer « Atelier Banc » : la feuille devient celle de l\'ESPACE, je suis propriétaire, seul membre', A, feuilleOuverte, 'Espace', 10000, () => titreFeuille(A));
  await verifier('… avec son nom, mon rôle, « Contacts de l\'entreprise » (une ligne : moi), le formulaire de canal et les invitations (je suis administrateur)', A,
    () => /Atelier Banc/.test(document.querySelector('#info-corps .info-nom').textContent) && /Propriétaire · 1 membre/.test(document.querySelector('#info-corps .info-sous').textContent) && document.querySelectorAll('#esp-contacts .contact').length === 1 && !!document.getElementById('cn-nom') && !!document.querySelector('[data-act="esp-lien-creer"]'), null, 6000, () => texteCorps(A));
  const idEspace = sql("SELECT id FROM espace").id;
  vrai('population : le service a UN espace', /^e_[0-9a-f]{32}$/.test(idEspace));
  await capture(A, 'a3-espace');
  await largeur(A, 'feuille Espace (administrateur)');

  console.log('\n── Un lien d\'invitation : créé par Alice, ouvert par Bruno dans une page neuve ──');
  await toucher(A, '[data-act="esp-lien-creer"]');
  await verifier('« Créer un lien » : le lien paraît (une adresse #invitation=…, en lecture seule) avec son échéance', A, () => { const i = document.getElementById('esp-lien-champ'); return !!i && i.readOnly && /\/#invitation=[A-Za-z0-9_-]{22}$/.test(i.value) && /Valable jusqu'au/.test(document.getElementById('esp-lien').textContent); }, null, 8000, () => lire(A, '#esp-lien'));
  const lien = await A.page.evaluate(() => document.getElementById('esp-lien-champ').value);
  /* ⛔ CRÉER UN LIEN CHANGE LE NOMBRE D'INVITATIONS DE L'ESPACE : le service le dit à la page, qui redessine la feuille. Le lien doit SURVIVRE à ce redessin (la première version de la page le perdait) :
     on attend que le compteur de la commande « Révoquer » dise « 1 actif » — la preuve que le redessin a eu lieu — PUIS on regarde si le lien est encore là. */
  await verifier('population : la feuille s\'est redessinée avec le nouveau lien (« Révoquer les liens (1 actif) »)', A, () => /\(1 actif\)/.test(document.querySelector('[data-act="esp-lien-revoquer"]').textContent), null, 8000, () => texteCorps(A));
  v('⛔ … et le lien est TOUJOURS affiché, le même, après ce redessin', await A.page.evaluate(() => { const i = document.getElementById('esp-lien-champ'); return i ? i.value : null; }), lien);
  await toucher(A, '[data-act="copier"]');
  await verifier('« Copier » le dit', A, () => /Lien copié|Copie impossible/.test(document.getElementById('mot').textContent), null, 4000, () => mot(A));
  /* une page NEUVE : on quitte l'application d'abord, sinon l'adresse ne diffère que par son fragment et c'est le cas de Dora, plus bas (la session reste, par le témoin) */
  await B.page.goto('about:blank');
  await B.page.goto(lien);
  await verifier('⛔ Bruno ouvre le lien : la page s\'ouvre sur la feuille « Entreprise » avec le lien déjà lu — qui l\'invite, dans quel espace', B,
    () => document.getElementById('feuille-titre').textContent === 'Entreprise' && /Alice Martin/.test(document.getElementById('en-apercu').textContent) && /Atelier Banc/.test(document.getElementById('en-apercu').textContent), null, 12000, () => texteCorps(B));
  v('⛔ le code ne reste PAS dans la barre d\'adresse de Bruno', /invitation=/.test(await B.page.evaluate(() => location.href)), false);
  await capture(B, 'b1-invitation');
  await toucher(B, '[data-act="esp-rejoindre"]');
  await verifier('« Rejoindre l\'espace » : la feuille de l\'espace s\'ouvre, je suis membre, deux contacts, aucun formulaire d\'administrateur', B,
    () => document.getElementById('feuille-titre').textContent === 'Espace' && /Membre · 2 membres/.test(document.querySelector('#info-corps .info-sous').textContent) && document.querySelectorAll('#esp-contacts .contact').length === 2 && !document.getElementById('cn-nom') && !document.querySelector('[data-act="esp-lien-creer"]'), null, 12000, () => texteCorps(B));
  v('Bruno lit « Contacts de l\'entreprise » : Alice avec son badge de propriétaire et « Écrire », puis lui-même (« Vous », rien à lui écrire)', (await lignes(B, '#esp-contacts .contact')).map(t => [/Alice Martin/.test(t), /Propriétaire/.test(t), /Écrire/.test(t), /Vous/.test(t)]), [[true, true, true, false], [false, false, false, true]]);
  await capture(B, 'b2-espace-membre');
  await largeur(B, 'feuille Espace (membre)');
  await verifier('⛔ Alice l\'apprend EN DIRECT, sans rien toucher : sa feuille ouverte montre maintenant deux contacts', A, () => document.querySelectorAll('#esp-contacts .contact').length === 2 && /2 membres/.test(document.querySelector('#info-corps .info-sous').textContent), null, 12000, () => texteCorps(A));
  v('population : le service compte deux membres', sql('SELECT COUNT(*) AS n FROM espace_membre').n, 2);
  await fermerFeuille(B);

  console.log('\n── Un lien ouvert dans un onglet DÉJÀ ouvert (seul le fragment change) ──');
  await onglet(D, 'reglages');
  await D.page.evaluate((l) => { location.hash = new URL(l).hash; }, lien);
  await verifier('⛔ Dora, déjà dans l\'application : la feuille « Entreprise » s\'ouvre avec le lien lu', D, () => document.getElementById('feuille-titre').textContent === 'Entreprise' && /Atelier Banc/.test((document.getElementById('en-apercu') || { textContent: '' }).textContent), null, 12000, () => texteCorps(D));
  await capture(D, 'd1-lien-onglet-ouvert');
  await toucher(D, '[data-act="esp-rejoindre"]');
  await verifier('Dora rejoint l\'espace', D, () => document.getElementById('feuille-titre').textContent === 'Espace' && document.querySelectorAll('#esp-contacts .contact').length === 3, null, 12000, () => texteCorps(D));
  await fermerFeuille(D);
  await verifier('Réglages › Entreprise de Dora liste l\'espace (membre, 3 membres)', D, () => /Atelier Banc/.test(document.getElementById('reg-esp').textContent) && /Membre · 3 membres/.test(document.getElementById('reg-esp').textContent), null, 8000, () => lire(D, '#reg-esp'));

  console.log('\n── Un lien ouvert PENDANT QUE la feuille « Entreprise » est déjà ouverte : il est lu, pas ignoré ──');
  await onglet(Z, 'reglages'); await toucher(Z, '#reg-esp-gerer');
  await verifier('population : Chloé a la feuille « Entreprise » ouverte, sans aperçu', Z, () => document.getElementById('feuille-titre').textContent === 'Entreprise' && !!document.getElementById('en-code') && document.getElementById('en-apercu').textContent === '', null, 8000, () => texteCorps(Z));
  await Z.page.evaluate((h) => { location.hash = h; }, new URL(lien).hash);
  await verifier('⛔ le lien arrive dans le champ et son aperçu paraît (qui invite, quel espace, combien de membres — pas leurs noms)', Z, () => /invitation=|^[A-Za-z0-9_-]{22}$/.test(document.getElementById('en-code').value) && /Alice Martin/.test(document.getElementById('en-apercu').textContent) && /Atelier Banc/.test(document.getElementById('en-apercu').textContent) && /\(3 membres\)/.test(document.getElementById('en-apercu').textContent) && !/Bruno|Dora/.test(document.getElementById('en-apercu').textContent), null, 12000, () => texteCorps(Z));
  v('… et elle n\'a REJOINT personne : l\'aperçu n\'accepte rien (population : le service compte trois membres)', sql('SELECT COUNT(*) AS n FROM espace_membre').n, 3);
  await fermerFeuille(Z);

  console.log('\n── « Contacts de l\'entreprise » : le champ FILTRE la liste, « Écrire » ouvre une conversation avec un collègue (qui n\'est pas un contact) ──');
  const vis = (S) => lignes(S, '#esp-contacts .contact');
  await verifier('population : trois contacts dans la liste d\'Alice', A, () => document.querySelectorAll('#esp-contacts .contact').length === 3, null, 12000);
  await saisir(A, '#esp-filtre', 'bru');
  await verifier('⛔ « bru » ne garde que Bruno', A, () => Array.from(document.querySelectorAll('#esp-contacts .contact')).filter(e => !e.hidden).length === 1 && /Bruno/.test(Array.from(document.querySelectorAll('#esp-contacts .contact')).find(e => !e.hidden).textContent), null, 4000);
  await saisir(A, '#esp-filtre', 'ZZZ');
  await verifier('un filtre qui ne trouve personne le dit (« Aucun contact ne correspond. ») — il ne cherche nulle part ailleurs : aucune requête de recherche n\'est partie', A, () => !document.getElementById('esp-aucun').hidden && Array.from(document.querySelectorAll('#esp-contacts .contact')).every(e => e.hidden), null, 4000);
  vrai('… et le réseau n\'a vu AUCUNE recherche (population : des requêtes sont parties, aucune ne cherche)', A.requetes.length > 10 && !A.requetes.some(r => /recherch|annuaire|trouver/i.test(r)));
  await saisir(A, '#esp-filtre', '');
  await verifier('le champ vidé rend les trois', A, () => Array.from(document.querySelectorAll('#esp-contacts .contact')).filter(e => !e.hidden).length === 3, null, 4000);
  await A.page.locator('#esp-contacts .contact', { hasText: 'Bruno Petit' }).locator('[data-act="ecrire"]').scrollIntoViewIfNeeded();
  await A.page.locator('#esp-contacts .contact', { hasText: 'Bruno Petit' }).locator('[data-act="ecrire"]').tap(); A.gestes++;
  await verifier('⛔ « Écrire » à Bruno (un collègue, pas un contact) : la feuille se ferme et la conversation avec lui s\'ouvre', A, () => document.documentElement.dataset.conv === '1' && !document.documentElement.classList.contains('feuille-ouverte') && /Bruno Petit/.test(document.getElementById('conv-titre').textContent), null, 12000, () => lire(A, '#conv-titre'));
  await saisir(A, '#saisie', 'Bonjour Bruno, bienvenue dans l\'espace'); await toucher(A, '#envoyer');
  await verifier('le message part (la bulle est dans le fil)', A, () => /bienvenue dans l'espace/.test(document.getElementById('conv-messages').textContent), null, 8000);
  await verifier('Bruno le reçoit dans sa liste', B, () => /bienvenue dans l'espace/.test(document.getElementById('liste-conv').textContent), null, 12000, () => lire(B, '#liste-conv'));

  console.log('\n── Un canal public : créé par Alice, vu et utilisé par Bruno ──');
  await retourListe(A);
  await onglet(A, 'reglages');
  await toucher(A, '[data-esp-ouvrir]');
  await verifier('la feuille de l\'espace se rouvre depuis Réglages', A, feuilleOuverte, 'Espace', 8000, () => titreFeuille(A));
  await verifier('population : le formulaire de canal est là', A, () => !!document.getElementById('cn-nom'), null, 8000);
  await saisir(A, '#cn-nom', 'annonces');
  await verifier('« Public » est choisi par défaut, et la phrase dit que tous les membres le voient', A, () => document.querySelector('[data-act="can-type"][data-prive="0"]').getAttribute('aria-checked') === 'true' && /Tous les membres de l'espace voient ce canal/.test(document.getElementById('info-corps').textContent), null, 4000);
  await toucher(A, '[data-act="can-creer"]');
  await verifier('⛔ créer le canal ouvre sa conversation : « # annonces » en titre, et le message du service « Vous avez créé le canal »', A, () => document.documentElement.dataset.conv === '1' && /# annonces/.test(document.getElementById('conv-titre').textContent) && /Vous avez créé le canal/.test(document.getElementById('conv-messages').textContent), null, 12000, () => lire(A, '#conv-titre'));
  await capture(A, 'a4-canal');
  await largeur(A, 'conversation d\'un canal');
  await saisir(A, '#saisie', 'Réunion demain à 9 h'); await toucher(A, '#envoyer');
  await verifier('Bruno voit « # annonces » dans sa liste, avec le message précédé du nom de l\'auteur', B, () => Array.from(document.querySelectorAll('#liste-conv .conv')).some(e => /# annonces/.test(e.textContent) && /Alice : Réunion demain/.test(e.textContent)), null, 12000, () => lire(B, '#liste-conv'));
  await B.page.locator('#liste-conv .conv', { hasText: '# annonces' }).first().click(); B.gestes++;
  await verifier('⛔ Bruno ouvre le canal : le nom de l\'AUTEUR est montré au-dessus du message d\'Alice (un canal est une conversation à plusieurs)', B, () => document.documentElement.dataset.conv === '1' && !!document.querySelector('#conv-messages .msg-nom') && /^Alice/.test(document.querySelector('#conv-messages .msg-nom').textContent.trim()), null, 12000, () => lire(B, '#conv-messages'));
  await toucher(B, '#conv-titre');
  await verifier('les infos du canal pour un MEMBRE : « Canal public · 3 membres », la liste des membres, et AUCUN réglage de groupe (ni « Seuls les admins écrivent », ni éphémères), ni renommer, ni supprimer, ni quitter', B,
    () => document.getElementById('feuille-titre').textContent === 'Infos' && /Canal public · 3 membres/.test(document.querySelector('#info-corps .info-sous').textContent) && !document.querySelector('[data-act="annonces"]') && !document.querySelector('[data-act="ephemeres"]') && !document.getElementById('cn-renom') && !document.querySelector('[data-act="can-supprimer"]') && !document.querySelector('[data-act="can-quitter"]') && /tous les membres de l'espace/.test(document.getElementById('info-corps').textContent), null, 12000, () => texteCorps(B));
  await capture(B, 'b3-infos-canal-membre');
  await fermerFeuille(B);
  await toucher(A, '#conv-titre');
  await verifier('les infos du canal pour l\'ADMINISTRATEUR : renommer et supprimer sont là (public : pas de « Quitter »)', A, () => document.getElementById('feuille-titre').textContent === 'Infos' && !!document.getElementById('cn-renom') && !!document.querySelector('[data-act="can-supprimer"]') && !document.querySelector('[data-act="can-quitter"]'), null, 12000, () => texteCorps(A));
  await saisir(A, '#cn-renom', 'annonces générales'); await toucher(A, '[data-act="can-renommer"]');
  await verifier('renommer : le nom change dans l\'en-tête d\'Alice ET dans la liste de Bruno', A, () => /# annonces générales/.test(document.getElementById('conv-titre').textContent), null, 10000, () => lire(A, '#conv-titre'));
  await verifier('… chez Bruno aussi', B, () => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(e => /# annonces générales/.test(e.textContent)), null, 12000, () => lire(B, '#liste-conv'));
  await fermerFeuille(A);

  console.log('\n── Un canal PRIVÉ : seuls ceux qu\'on y met le voient ; en retirer un le lui retire en direct ──');
  await retourListe(A); await retourListe(B);
  await onglet(A, 'reglages'); await toucher(A, '[data-esp-ouvrir]');
  await verifier('la feuille de l\'espace', A, feuilleOuverte, 'Espace', 8000);
  await saisir(A, '#cn-nom', 'direction');
  await toucher(A, '[data-act="can-type"][data-prive="1"]');
  await verifier('« Privé » : la phrase change et la liste des personnes à choisir paraît (Bruno, Dora ; pas moi)', A, () => document.querySelector('[data-act="can-type"][data-prive="1"]').getAttribute('aria-checked') === 'true' && /Seules les personnes choisies/.test(document.getElementById('info-corps').textContent) && document.querySelectorAll('[data-act="can-choisir"]').length === 2, null, 6000, () => texteCorps(A));
  v('⛔ le nom tapé a SURVÉCU au redessin de la feuille', await A.page.evaluate(() => document.getElementById('cn-nom').value), 'direction');
  await A.page.locator('[data-act="can-choisir"]', { hasText: 'Dora' }).tap(); A.gestes++;
  await verifier('Dora est cochée', A, () => Array.from(document.querySelectorAll('[data-act="can-choisir"]')).find(e => /Dora/.test(e.textContent)).getAttribute('aria-checked') === 'true', null, 4000);
  await toucher(A, '[data-act="can-creer"]');
  await verifier('le canal privé s\'ouvre pour Alice', A, () => document.documentElement.dataset.conv === '1' && /# direction/.test(document.getElementById('conv-titre').textContent), null, 12000, () => lire(A, '#conv-titre'));
  await verifier('⛔ Dora le voit dans sa liste ; ⛔ Bruno NE le voit PAS', D, () => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(e => /# direction/.test(e.textContent)), null, 12000, () => lire(D, '#liste-conv'));
  v('Bruno n\'a que les deux autres conversations (population : sa liste a des lignes, aucune « direction »)', await B.page.evaluate(() => { const l = Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(e => e.textContent); return [l.length > 0, l.some(t => /direction/.test(t))]; }), [true, false]);
  await toucher(A, '#conv-titre');
  await verifier('les infos du canal privé pour son administrateur : « Canal privé », Dora peut être retirée, Bruno ajouté, et « Quitter le canal » existe', A, () => /Canal privé/.test((document.querySelector('#info-corps .info-sous') || { textContent: '' }).textContent) && !!document.querySelector('[data-act="can-retirer-membre"]') && !!document.querySelector('[data-act="can-ajouter-membre"]') && !!document.querySelector('[data-act="can-quitter"]'), null, 12000, () => texteCorps(A));
  await capture(A, 'a5-infos-canal-prive');
  await largeur(A, 'infos d\'un canal privé (administrateur)');
  await A.page.locator('[data-act="can-ajouter-membre"]').first().tap(); A.gestes++;
  await verifier('⛔ ajouter Bruno LE LUI MONTRE : le canal paraît dans sa liste', B, () => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(e => /# direction/.test(e.textContent)), null, 12000, () => lire(B, '#liste-conv'));
  await B.page.locator('#liste-conv .conv', { hasText: '# direction' }).first().click(); B.gestes++;
  await verifier('Bruno ouvre le canal privé', B, () => document.documentElement.dataset.conv === '1' && /# direction/.test(document.getElementById('conv-titre').textContent), null, 12000);
  await verifier('population : la feuille d\'Alice montre Bruno parmi les membres, avec « Retirer »', A, () => document.querySelectorAll('[data-act="can-retirer-membre"]').length === 2, null, 12000, () => texteCorps(A));
  await A.page.locator('.contact', { hasText: 'Bruno' }).locator('[data-act="can-retirer-membre"]').tap(); A.gestes++;
  await verifier('⛔ le retirer le lui RETIRE en direct : sa conversation ouverte se ferme, avec « Tu n\'es plus dans cette conversation. »', B, () => document.documentElement.dataset.conv !== '1' && /Tu n'es plus dans cette conversation/.test(document.getElementById('mot').textContent), null, 12000);
  await verifier('… et le canal n\'est plus dans sa liste', B, () => !Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(e => /# direction/.test(e.textContent)), null, 8000, () => lire(B, '#liste-conv'));
  await fermerFeuille(A); await retourListe(A);

  console.log('\n── Les rôles : nommer, deux touches pour retirer, passer la propriété ──');
  await onglet(A, 'reglages'); await toucher(A, '[data-esp-ouvrir]');
  await verifier('la feuille de l\'espace', A, feuilleOuverte, 'Espace', 8000);
  await verifier('population : trois contacts', A, () => document.querySelectorAll('#esp-contacts .contact').length === 3, null, 8000);
  const ligneBruno = A.page.locator('#esp-contacts .contact', { hasText: 'Bruno Petit' });
  await ligneBruno.locator('[data-act="esp-role"]').tap(); A.gestes++;
  await verifier('« Nommer admin » : Bruno porte le badge « Admin »', A, () => Array.from(document.querySelectorAll('#esp-contacts .contact')).some(e => /Bruno/.test(e.textContent) && /Admin/.test(e.textContent)), null, 10000, () => texteCorps(A));
  /* Bruno n'avait pas de feuille ouverte : il ouvre celle de l'espace, que le service lui rend maintenant en administrateur */
  await fermerFeuille(B);
  await onglet(B, 'reglages'); await toucher(B, '[data-esp-ouvrir]');
  await verifier('Bruno administrateur : le formulaire de canal et les invitations sont là, pas le nom de l\'espace ni « Supprimer » (réservés au propriétaire)', B, () => document.getElementById('feuille-titre').textContent === 'Espace' && !!document.getElementById('cn-nom') && !!document.querySelector('[data-act="esp-lien-creer"]') && !document.getElementById('esp-nom') && !document.querySelector('[data-act="esp-dissoudre"]') && !!document.querySelector('[data-act="esp-quitter"]'), null, 12000, () => texteCorps(B));
  v('⛔ Bruno (administrateur, pas propriétaire) ne voit AUCUN bouton pour retirer ou rétrograder Alice (la propriétaire)', await B.page.evaluate(() => { const l = Array.from(document.querySelectorAll('#esp-contacts .contact')).find(e => /Alice/.test(e.textContent)); return l ? Array.from(l.querySelectorAll('button')).map(x => x.textContent) : null; }), ['Écrire']);
  await fermerFeuille(B);
  /* retirer Dora : deux touches */
  const ligneDora = A.page.locator('#esp-contacts .contact', { hasText: 'Dora Leroy' });
  await ligneDora.locator('[data-act="esp-retirer"]').tap(); A.gestes++;
  await verifier('⛔ une première touche ne retire personne : le bouton DIT « Toucher encore pour retirer »', A, () => Array.from(document.querySelectorAll('#esp-contacts .contact')).some(e => /Dora/.test(e.textContent) && /Toucher encore pour retirer/.test(e.textContent)), null, 4000, () => texteCorps(A));
  v('… et Dora est toujours membre (population : trois membres)', sql('SELECT COUNT(*) AS n FROM espace_membre').n, 3);
  await ligneDora.locator('[data-act="esp-retirer"]').tap(); A.gestes++;
  await verifier('la seconde touche retire Dora : deux contacts', A, () => document.querySelectorAll('#esp-contacts .contact').length === 2 && /Membre retiré/.test(document.getElementById('mot').textContent), null, 10000, () => texteCorps(A));
  await verifier('⛔ Dora l\'apprend EN DIRECT : Réglages › Entreprise ne liste plus l\'espace', D, () => !/Atelier Banc/.test(document.getElementById('reg-esp').textContent), null, 12000, () => lire(D, '#reg-esp'));
  await capture(A, 'a6-roles');
  /* ⛔ un non-membre ne voit rien : Chloé n'a aucun espace */
  await onglet(Z, 'reglages');
  v('⛔ Chloé, qui n\'est dans aucun espace, ne voit RIEN de l\'entreprise : Réglages › Entreprise ne montre que « Créer ou rejoindre »', await Z.page.evaluate(() => [document.querySelectorAll('#reg-esp [data-esp-ouvrir]').length, /Atelier|Alice|Bruno/.test(document.getElementById('reg-esp').textContent)]), [0, false]);
  /* passer la propriété */
  await ligneBruno.locator('[data-act="esp-transferer"]').tap(); A.gestes++;
  await verifier('« Passer la propriété » demande aussi deux touches', A, () => /Toucher encore pour passer la propriété/.test(document.getElementById('esp-contacts').textContent), null, 4000);
  await ligneBruno.locator('[data-act="esp-transferer"]').tap(); A.gestes++;
  await verifier('⛔ la propriété est passée : Alice n\'est plus propriétaire (« Administrateur »), elle peut quitter l\'espace', A, () => /Administrateur · 2 membres/.test(document.querySelector('#info-corps .info-sous').textContent) && !!document.querySelector('[data-act="esp-quitter"]') && !document.querySelector('[data-act="esp-dissoudre"]'), null, 12000, () => texteCorps(A));
  await toucher(A, '[data-act="esp-quitter"]');
  await verifier('⛔ quitter l\'espace demande deux touches (la première le dit)', A, () => /Toucher encore pour quitter l'espace/.test(document.getElementById('info-corps').textContent), null, 4000);
  await toucher(A, '[data-act="esp-quitter"]');
  await verifier('la seconde touche quitte : la feuille se ferme, l\'espace n\'est plus dans Réglages d\'Alice', A, () => !document.documentElement.classList.contains('feuille-ouverte') && !/Atelier Banc/.test(document.getElementById('reg-esp').textContent), null, 12000, () => lire(A, '#reg-esp'));

  console.log('\n── Le propriétaire gère son espace : renommer, révoquer un lien (que personne ne peut plus ouvrir), supprimer un canal, supprimer l\'espace ──');
  await onglet(B, 'reglages'); await toucher(B, '[data-esp-ouvrir]');
  await verifier('Bruno, devenu propriétaire, ouvre l\'espace : le nom est modifiable et « Supprimer l\'espace » existe (réservés au propriétaire)', B, () => document.getElementById('feuille-titre').textContent === 'Espace' && !!document.getElementById('esp-nom') && !!document.querySelector('[data-act="esp-dissoudre"]') && /Propriétaire/.test(document.querySelector('#info-corps .info-sous').textContent), null, 12000, () => texteCorps(B));
  await saisir(B, '#esp-nom', 'Atelier Banc SARL'); await toucher(B, '[data-act="esp-renommer"]');
  await verifier('renommer l\'espace : le nom change dans la feuille ET dans Réglages', B, () => /Atelier Banc SARL/.test(document.querySelector('#info-corps .info-nom').textContent) && /Atelier Banc SARL/.test(document.getElementById('reg-esp').textContent), null, 10000, () => texteCorps(B));
  await toucher(B, '[data-act="esp-lien-creer"]');
  await verifier('population : un lien est créé', B, () => !!document.getElementById('esp-lien-champ') && /invitation=/.test(document.getElementById('esp-lien-champ').value), null, 8000, () => lire(B, '#esp-lien'));
  const lienRevoque = await B.page.evaluate(() => document.getElementById('esp-lien-champ').value);
  await toucher(B, '[data-act="esp-lien-revoquer"]');
  await verifier('« Révoquer les liens » le dit, et le lien affiché disparaît de la feuille', B, () => /révoqué/.test(document.getElementById('mot').textContent) && !document.getElementById('esp-lien-champ'), null, 8000, () => mot(B));
  await Z.page.evaluate((h) => { location.hash = h; }, new URL(lienRevoque).hash);
  await verifier('⛔ Chloé ouvre le lien révoqué : la feuille « Entreprise » s\'ouvre sur « Ce lien n\'est plus valable » — sans aperçu', Z, () => document.getElementById('feuille-titre').textContent === 'Entreprise' && /Ce lien n'est plus valable/.test(document.getElementById('info-erreur').textContent) && document.getElementById('en-apercu').textContent === '', null, 12000, () => texteCorps(Z));
  v('… et elle n\'est entrée nulle part (population : Bruno seul dans l\'espace)', sql('SELECT COUNT(*) AS n FROM espace_membre').n, 1);
  await capture(Z, 'z1-lien-revoque');
  await toucher(B, '[data-act="esp-lien-creer"]');
  await verifier('un lien NEUF se crée', B, () => !!document.getElementById('esp-lien-champ') && /invitation=/.test(document.getElementById('esp-lien-champ').value), null, 8000, () => lire(B, '#esp-lien'));
  const lienNeuf = await B.page.evaluate(() => document.getElementById('esp-lien-champ').value);
  await Z.page.evaluate((h) => { location.hash = h; }, new URL(lienNeuf).hash);
  await verifier('contre-épreuve : Chloé ouvre le lien NEUF — l\'aperçu paraît', Z, () => /Atelier Banc SARL/.test(document.getElementById('en-apercu').textContent), null, 12000, () => texteCorps(Z));
  await toucher(Z, '[data-act="esp-rejoindre"]');
  await verifier('Chloé rejoint : la feuille de l\'espace, deux contacts, et le canal public existant dans sa liste de canaux', Z, () => document.getElementById('feuille-titre').textContent === 'Espace' && document.querySelectorAll('#esp-contacts .contact').length === 2 && /annonces générales/.test(document.getElementById('info-corps').textContent), null, 12000, () => texteCorps(Z));
  await fermerFeuille(Z); await fermerFeuille(B);
  await verifier('Chloé a le canal dans sa liste de conversations', Z, () => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(e => /# annonces générales/.test(e.textContent)), null, 12000, () => lire(Z, '#liste-conv'));
  /* supprimer un canal : deux touches, et le canal disparaît chez tout le monde en direct */
  await retourListe(B); await onglet(B, 'messages');
  await B.page.locator('#liste-conv .conv', { hasText: '# annonces générales' }).first().click(); B.gestes++;
  await verifier('Bruno ouvre le canal', B, () => document.documentElement.dataset.conv === '1' && /# annonces générales/.test(document.getElementById('conv-titre').textContent), null, 12000);
  await toucher(B, '#conv-titre');
  await verifier('les infos du canal pour son propriétaire : « Supprimer le canal » existe', B, () => document.getElementById('feuille-titre').textContent === 'Infos' && !!document.querySelector('[data-act="can-supprimer"]'), null, 12000, () => texteCorps(B));
  await toucher(B, '[data-act="can-supprimer"]');
  await verifier('⛔ supprimer un canal demande deux touches (la première le dit)', B, () => /Toucher encore pour supprimer le canal/.test(document.getElementById('info-corps').textContent), null, 4000);
  v('… et le canal existe toujours (population : une conversation de genre canal)', sql(`SELECT COUNT(*) AS n FROM conversation WHERE type = 'canal'`).n >= 1, true);
  await toucher(B, '[data-act="can-supprimer"]');
  await verifier('⛔ la seconde touche supprime : Bruno est ramené à sa liste, qui ne porte plus le canal', B, () => document.documentElement.dataset.conv !== '1' && !document.documentElement.classList.contains('feuille-ouverte') && !Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(e => /# annonces générales/.test(e.textContent)), null, 12000, () => lire(B, '#liste-conv'));
  await verifier('⛔ Chloé l\'apprend EN DIRECT : le canal n\'est plus dans sa liste', Z, () => !Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(e => /# annonces générales/.test(e.textContent)), null, 12000, () => lire(Z, '#liste-conv'));
  v('… dans la base, plus aucun canal public ne porte ce nom : zéro canal restant (population : la conversation « direction » avait déjà disparu avec ses membres)', sql(`SELECT COUNT(*) AS n FROM canal`).n, 0);
  /* supprimer l'espace : deux touches ; il disparaît de Réglages, chez Bruno et en direct chez Chloé */
  await onglet(B, 'reglages'); await toucher(B, '[data-esp-ouvrir]');
  await verifier('la feuille de l\'espace', B, feuilleOuverte, 'Espace', 8000, () => titreFeuille(B));
  await toucher(B, '[data-act="esp-dissoudre"]');
  await verifier('⛔ supprimer l\'espace demande deux touches (la première le dit)', B, () => /Toucher encore pour supprimer l'espace/.test(document.getElementById('info-corps').textContent), null, 4000);
  v('… et l\'espace existe toujours (population : un espace en base)', sql('SELECT COUNT(*) AS n FROM espace').n, 1);
  await toucher(B, '[data-act="esp-dissoudre"]');
  await verifier('la seconde touche supprime : la feuille se ferme et Réglages ne liste plus l\'espace', B, () => !document.documentElement.classList.contains('feuille-ouverte') && !/Atelier Banc/.test(document.getElementById('reg-esp').textContent), null, 12000, () => lire(B, '#reg-esp'));
  v('… la base ne porte plus aucun espace, aucun membre, aucun canal', [sql('SELECT COUNT(*) AS n FROM espace').n, sql('SELECT COUNT(*) AS n FROM espace_membre').n, sql('SELECT COUNT(*) AS n FROM canal').n], [0, 0, 0]);
  await verifier('⛔ Chloé l\'apprend en direct : Réglages › Entreprise ne liste plus l\'espace', Z, () => !/Atelier Banc/.test(document.getElementById('reg-esp').textContent), null, 12000, () => lire(Z, '#reg-esp'));
  await capture(B, 'b4-espace-supprime');

  console.log('\n── La fin de la bêta : rien d\'anormal ──');
  return { tous, sql };
}

/* ═══ B. LA FORMULE DE PRODUCTION CONTRE UN FAUX STRIPE : MESSAGES PRO ═════════════════════════════════════════════════════════════════════════════════════ */
async function parcoursB(b, ctx) {
  const { svc, fake } = ctx;
  const A = await ouvrir(b, svc.base, PROFILS.iphone), B = await ouvrir(b, svc.base, PROFILS.bureau);
  A.nom = 'Alice (propriétaire)'; B.nom = 'Bruno (membre)';
  const tous = [A, B];
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  await connecter(A, 'alice'); await connecter(B, 'bruno');
  const ids = {};
  for (const [k, S] of [['alice', A], ['bruno', B]]) ids[k] = await S.page.evaluate(async () => (await (await fetch('/api/moi')).json()).moi.id);
  /* le premier espace d'une entreprise ne naît pas d'une création libre (créer un espace est une fonction Pro) : on le pose en base, comme le fait test-962 */
  const S = ouvrirBase({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  const raw = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  const EB = S.espaceCreer({ nom: 'Entreprise Un', proprio: ids.alice }).id;
  const code = crypto.randomBytes(16).toString('base64url');
  S.lienCreer({ h: crypto.createHash('sha256').update(code).digest('hex'), genre: 'espace', cible: EB, par: ids.alice, ttlMs: JOUR, max: 5 });
  S.invitationAccepter({ h: crypto.createHash('sha256').update(code).digest('hex'), uid: ids.bruno, max: Infinity });
  const decaler = (jours) => { const r = raw(); try { r.prepare('UPDATE abonnement SET impaye_depuis = impaye_depuis - ?, relu_le = relu_le - ? WHERE espace = ?').run(jours * JOUR, jours * JOUR, EB); } finally { r.close(); } };
  await A.page.reload(); await B.page.reload();
  await A.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, null, { timeout: 15000 });
  await B.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, null, { timeout: 15000 });

  console.log('── Réglages › Abonnement (Alice, iPhone 393) : l\'état avant de payer ──');
  await onglet(A, 'reglages');
  await verifier('Réglages › Abonnement : « Ta formule Messages Perso » et l\'espace, que je gère', A, () => /Messages Perso/.test(document.getElementById('reg-abo').textContent) && /Entreprise Un/.test(document.getElementById('reg-abo').textContent) && /Tu gères l'abonnement/.test(document.getElementById('reg-abo').textContent), null, 12000, () => lire(A, '#reg-abo'));
  await capture(A, 'p1-reglages-abonnement');
  await toucher(A, '[data-esp-abo]');
  await verifier('la feuille « Abonnement » : formule Perso, aucune place payée, « Mode test : aucun vrai prélèvement », le formulaire de paiement', A, () => document.getElementById('feuille-titre').textContent === 'Abonnement' && /Messages Perso/.test(document.getElementById('info-corps').textContent) && /aucune place payée \(2 membres/.test(document.getElementById('info-corps').textContent) && /Mode test : aucun vrai prélèvement/.test(document.getElementById('info-corps').textContent) && !!document.getElementById('ab-places'), null, 12000, () => texteCorps(A));
  await capture(A, 'p2-abonnement');
  await largeur(A, 'feuille Abonnement (avant de payer)');
  v('le formulaire propose deux rythmes, le mensuel choisi, deux places (le nombre de membres) et le total', await A.page.evaluate(() => [Array.from(document.querySelectorAll('[data-act="abo-cycle"]')).map(e => [e.textContent, e.getAttribute('aria-checked')]), document.getElementById('ab-places').value, document.getElementById('ab-total').textContent.replace(/\s+/g, ' ')]),
    [[['Par mois', 'true'], ['Par an', 'false']], '2', 'Total 30,00 € par mois (2 × 15,00 €)']);
  await saisir(A, '#ab-places', '3');
  await verifier('⛔ le total SUIT la frappe : 3 × 15,00 €', A, () => /45,00 € par mois \(3 × 15,00 €\)/.test(document.getElementById('ab-total').textContent.replace(/\s+/g, ' ')), null, 4000, () => lire(A, '#ab-total'));
  await toucher(A, '[data-act="abo-cycle"][data-cycle="annuel"]');
  await verifier('le rythme annuel : 3 × 150,00 € par an', A, () => /450,00 € par an \(3 × 150,00 €\)/.test(document.getElementById('ab-total').textContent.replace(/\s+/g, ' ')) && document.getElementById('ab-places').value === '3', null, 4000, () => lire(A, '#ab-total'));
  await saisir(A, '#ab-places', '1');
  await toucher(A, '[data-act="abo-payer"]');
  await verifier('⛔ moins de places que de membres : refusé SUR PLACE, avant tout appel à Stripe, avec le minimum', A, () => /entre 2 \(le nombre de membres\) et 500/.test(document.getElementById('info-erreur').textContent), null, 4000, () => texteCorps(A));
  vrai('… et Stripe n\'a reçu aucune demande de paiement (population : le faux Stripe a été sollicité, mais pas pour une session)', !fake.dernier('POST', /checkout\/sessions$/));
  await saisir(A, '#ab-places', '3');
  await toucher(A, '[data-act="abo-cycle"][data-cycle="mensuel"]');
  await toucher(A, '[data-act="abo-payer"]');
  await verifier('⛔ « Payer avec Stripe » : la page part vers l\'adresse de paiement de Stripe (https), jamais ailleurs', A, () => /^https:\/\/checkout\.stripe\.test\/c\/pay\/cs_banc/.test(location.href), null, 15000, () => '' + A.navigations.join(','));
  const session = fake.derniereSession();
  v('le service a demandé 3 places au tarif mensuel, pour CET espace', [Object.fromEntries(session.paires)['line_items[0][quantity]'], Object.fromEntries(session.paires)['line_items[0][price]'], session.client_reference_id], ['3', PRIX.mensuel, 'opmsg:' + EB]);

  console.log('\n── Le retour de Stripe : la page relit CHEZ STRIPE, elle ne croit pas l\'adresse ──');
  /* d'abord un retour SANS paiement réglé : la page ne dit pas « payé » */
  await A.page.goto(A.base + '/?abo=retour&e=' + EB + '#reglages');
  await verifier('⛔ de retour AVANT que Stripe ait confirmé : la feuille Abonnement s\'ouvre et dit que Stripe n\'a pas encore confirmé — pas « payé »', A, () => document.getElementById('feuille-titre').textContent === 'Abonnement' && /Stripe n'a pas encore confirmé le paiement/.test(document.getElementById('info-corps').textContent) && /Messages Perso/.test(document.getElementById('info-corps').textContent), null, 15000, () => texteCorps(A));
  v('… et l\'adresse a été nettoyée (ni ?abo ni espace dans la barre)', /abo=|e_[0-9a-f]{32}/.test(await A.page.evaluate(() => location.href)), false);
  const sb = fake.payer(session.id, { statut: 'active' });
  await toucher(A, '[data-act="abo-relire"]');
  await verifier('⛔ « J\'ai réglé — vérifier » relit chez Stripe : « Abonnement confirmé », Messages Pro, 3 places, Actif', A, () => /Abonnement confirmé par Stripe : l'espace est en Messages Pro/.test(document.getElementById('info-corps').textContent) && /Actif · 3 places/.test(document.getElementById('info-corps').textContent) && /Messages Pro/.test(document.querySelector('#info-corps .reg-ligne').textContent), null, 15000, () => texteCorps(A));
  await capture(A, 'p3-abonne');
  await largeur(A, 'feuille Abonnement (abonné)');
  v('l\'abonné ne voit plus le formulaire de paiement mais « Gérer l\'abonnement »', await A.page.evaluate(() => [!!document.getElementById('ab-places'), !!document.querySelector('[data-act="abo-portail"]')]), [false, true]);
  await toucher(A, '[data-act="abo-portail"]');
  await verifier('« Gérer l\'abonnement » : la page part vers le portail de Stripe (https)', A, () => /^https:\/\/billing\.stripe\.test\/p\/session\//.test(location.href), null, 15000, () => '' + A.navigations.join(','));
  /* le retour du portail relit aussi */
  fake.quantite(sb.id, 4);
  await A.page.goto(A.base + '/?abo=portail&e=' + EB + '#reglages');
  await verifier('⛔ de retour du portail (4 places maintenant chez Stripe) : la feuille relit et montre 4 places', A, () => document.getElementById('feuille-titre').textContent === 'Abonnement' && /Actif · 4 places/.test(document.getElementById('info-corps').textContent), null, 15000, () => texteCorps(A));

  console.log('\n── Les fonctions Pro : marchent payées, refusent en disant pourquoi à l\'administrateur seul ──');
  await toucher(A, '[data-act="abo-espace"]');
  await verifier('la feuille de l\'espace : Messages Pro disponible', A, () => document.getElementById('feuille-titre').textContent === 'Espace' && /Les fonctions Pro de l'espace sont disponibles/.test(document.getElementById('info-corps').textContent), null, 12000, () => texteCorps(A));
  await saisir(A, '#cn-nom', 'general');
  await toucher(A, '[data-act="can-creer"]');
  await verifier('créer un canal MARCHE (l\'espace est payé)', A, () => document.documentElement.dataset.conv === '1' && /# general/.test(document.getElementById('conv-titre').textContent), null, 12000, () => lire(A, '#conv-titre'));
  await retourListe(A);
  /* l'impayé */
  fake.statut(sb.id, 'past_due');
  await onglet(A, 'reglages'); await toucher(A, '[data-esp-abo]');
  await verifier('la feuille Abonnement', A, () => document.getElementById('feuille-titre').textContent === 'Abonnement', null, 10000);
  await toucher(A, '[data-act="abo-relire"]');
  await verifier('⛔ un paiement en retard : encore Pro, en SURSIS — la date est dite, et le remède', A, () => /Paiement en retard : les fonctions Pro restent disponibles jusqu'au/.test(document.getElementById('info-corps').textContent) && /Stripe signale un paiement en retard/.test(document.getElementById('info-corps').textContent), null, 15000, () => texteCorps(A));
  decaler(8);
  await toucher(A, '[data-act="abo-relire"]');
  await verifier('⛔ huit jours plus tard : « Messages Pro — paiement en retard », les fonctions Pro suspendues, et la page dit que RIEN n\'est perdu', A, () => /paiement en retard/i.test(document.querySelector('#info-corps .reg-ligne').textContent) && /sont suspendues tant que le paiement n'est pas réglé/.test(document.getElementById('info-corps').textContent) && /Rien n'est perdu/.test(document.getElementById('info-corps').textContent), null, 15000, () => texteCorps(A));
  await capture(A, 'p4-impaye');
  await toucher(A, '[data-act="abo-espace"]');
  await verifier('la feuille de l\'espace dit « Paiement en retard : les fonctions Pro sont suspendues »', A, () => document.getElementById('feuille-titre').textContent === 'Espace' && /Paiement en retard : les fonctions Pro sont suspendues/.test(document.getElementById('info-corps').textContent), null, 12000, () => texteCorps(A));
  await saisir(A, '#cn-nom', 'refuse');
  await toucher(A, '[data-act="can-creer"]');
  await verifier('⛔ créer un canal est REFUSÉ : « Cette fonction fait partie de Messages Pro. » + POURQUOI (l\'abonnement est en retard) + « Rien n\'est perdu »', A, () => /Cette fonction fait partie de Messages Pro/.test(document.getElementById('info-erreur').textContent) && /L'abonnement de l'espace est en retard/.test(document.getElementById('info-erreur').textContent) && /Rien n'est perdu/.test(document.getElementById('info-erreur').textContent), null, 10000, () => lire(A, '#info-erreur'));
  v('⛔ et RIEN n\'a été retiré : le canal « general », les deux membres', [(await lignes(A, '#info-corps .contact[data-act="can-ouvrir"]')).length, sql('SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ?', EB).n], [1, 2]);
  await capture(A, 'p5-refus-pro');
  /* ⛔ supprimer l'espace tant qu'un abonnement court (même en retard) est REFUSÉ, et la page dit quoi faire : Stripe continuerait de prélever pour un espace qui n'existe plus */
  await toucher(A, '[data-act="esp-dissoudre"]');
  await verifier('supprimer l\'espace demande deux touches (la première le dit)', A, () => /Toucher encore pour supprimer l'espace/.test(document.getElementById('info-corps').textContent), null, 4000);
  await toucher(A, '[data-act="esp-dissoudre"]');
  await verifier('⛔ supprimer l\'espace avec un abonnement qui court encore (en retard) : REFUSÉ, avec la marche à suivre (résilier d\'abord)', A, () => /Un abonnement court encore pour cet espace/.test(document.getElementById('info-erreur').textContent) && /Réglages › Abonnement › Gérer/.test(document.getElementById('info-erreur').textContent), null, 10000, () => lire(A, '#info-erreur'));
  v('… et l\'espace est toujours là, avec ses deux membres et son canal (population)', [sql('SELECT COUNT(*) AS n FROM espace').n, sql('SELECT COUNT(*) AS n FROM espace_membre WHERE espace = ?', EB).n, sql('SELECT COUNT(*) AS n FROM canal WHERE espace = ?', EB).n], [1, 2, 1]);
  /* ce que voit un MEMBRE : « fonctions Pro indisponibles », JAMAIS pourquoi */
  await onglet(B, 'reglages'); await toucher(B, '[data-esp-ouvrir]');
  await verifier('⛔ Bruno (simple membre) lit seulement « les fonctions Pro ne sont pas disponibles pour l\'instant » + « Rien n\'est perdu »', B, () => document.getElementById('feuille-titre').textContent === 'Espace' && /Les fonctions Pro de l'espace .* ne sont pas disponibles pour l'instant\. Rien n'est perdu/.test(document.getElementById('info-corps').textContent), null, 12000, () => texteCorps(B));
  v('⛔ … sans un mot de paiement : ni « abonnement », ni « retard », ni « impayé », ni « Stripe » dans SA feuille', /abonnement|retard|impay|stripe|paiement/i.test(await texteCorps(B)), false);
  v('⛔ et il n\'a ni Réglages › Abonnement avec l\'espace, ni bouton Messages Pro : rien à payer pour lui', await B.page.evaluate(() => [!!document.querySelector('[data-act="abo-ouvrir"]'), document.querySelectorAll('#reg-abo [data-esp-abo]').length]), [false, 0]);
  await largeur(B, 'feuille Espace (membre, impayé)');

  console.log('\n── La fin : rien d\'anormal ──');
  return { tous, sql };
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const fake = await fauxStripe({ prix: Object.values(PRIX) });
  const cfg = { pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, beta: { relectureMs: 300, timeoutMs: 1500 } };
  const svcA = await T.lancerService({ urlGestion: og.url, config: cfg });
  const svcB = await T.lancerService({ urlGestion: og.url, config: Object.assign({}, cfg, { formule: { toutOuvert: false }, facturation: { cle: CLE, prix: PRIX, affichage: { mensuel: 15, annuel: 150 }, relectureMs: 3600000, timeoutMs: 3000 },
    quotas: { relire: { max: 1000, fenetreMs: 10000 }, paiement: { max: 1000, fenetreMs: 3600000 }, portail: { max: 1000, fenetreMs: 3600000 }, lien: { max: 1000, fenetreMs: 3600000 }, canal: { max: 1000, fenetreMs: 3600000 } } }), env: { OPMSG_TEST_STRIPE: fake.hote } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : le navigateur ne démarre pas (' + e.message.split('\n')[0] + ')'); await svcA.arreter(); await svcB.arreter(); await og.fermer(); await fake.fermer(); process.exit(2); }
  const tous = [];
  try {
    const ra = await parcoursA(b, { svc: svcA, og });
    tous.push(...ra.tous);
    const rb = await parcoursB(b, { svc: svcB, og, fake });
    tous.push(...rb.tous);
    for (const S of tous) {
      vrai(S.nom + ' : (population) ' + S.gestes + ' gestes portés, ' + (S.ecrans || 0) + ' écrans mesurés en largeur', S.gestes > 2);
      v(S.nom + ' : 0 erreur JavaScript, aucune erreur de console autre qu\'un refus du service', [S.erreurs, S.console.filter(t => !/Failed to load resource/.test(t))], [[], []]);
      v(S.nom + ' : aucun écran ne déborde de ses ' + S.pf.w + ' px', S.debordements || [], []);
      /* ⛔ une attente de plus de 3 s pour un geste, ou une réponse du service de plus de 2 s, est un défaut de ressenti : on les NOMME */
      v(S.nom + ' : aucun geste n\'a attendu plus de 3 s, aucune réponse du service plus de 2 s', [S.attentes || [], S.lentes || []], [[], []]);
      /* un refus du service est LOGUÉ par le navigateur : on les NOMME. Des 401 (la visite sans session, le flux qui se rouvre), des 402 (une fonction Pro refusée, exprès), des 404 (un non-membre / un
         canal retiré, exprès) et des 409 : tout autre refus est un défaut. */
      /* L'indicateur de saisie (« écrit… ») est plafonné à UN appel par 2 s et par conversation (routes.js) : le deuxième geste de saisie reçoit 429, que la page ignore — d'avant ce lot, NOMMÉ ici pour ne pas
         passer pour un défaut. Tout autre 429 en serait un. */
      const SAISIE_429 = /^429 POST \/api\/conversations\/c_[0-9a-f]{32}\/saisie$/;
      const r = S.refus, autres = r.filter(x => !['401', '402', '403', '404', '409', '410'].includes(x.slice(0, 3)) && !SAISIE_429.test(x));
      v(S.nom + ' : les refus réseau relevés sont des refus ATTENDUS (401, 402, 403, 404, 409, 410, et le plafond de l\'indicateur de saisie) — relevé : ' + (r.join(', ') || 'aucun'), autres, []);
    }
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    for (const [nom, svc] of [['bêta', svcA], ['production', svcB]]) {
      const sortie = svc.sortie.texte();
      v('le service (' + nom + ') n\'a écrit AUCUNE erreur ni exception pendant tout le parcours (population : ' + sortie.split('\n').filter(Boolean).length + ' lignes de journal)', /Error|TypeError|unhandled|Exception/.test(sortie), false);
    }
    try { await b.close(); } catch (e) { /* rien */ }
    await svcA.arreter(); await svcB.arreter(); await og.fermer(); await fake.fermer();
  }
  fin();
})();
