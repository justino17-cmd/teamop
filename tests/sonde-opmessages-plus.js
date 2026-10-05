/* ══ SONDE DE BOUT EN BOUT — LE « + » D'OP MESSAGES : « NOUVELLE DISCUSSION », DANS DE VRAIS NAVIGATEURS ═══════════════════════════════════════════════
   Justin, 5 octobre 2026, captures de WhatsApp à l'appui : « Il faudrait le + avec tout ce qu'on propose. » `tests/test-857.js` garde le texte de la feuille et la contre-épreuve de ses gardes, `tests/test-995.js` fait
   parler la VRAIE fonction `ndModele` de la page aux contacts et aux conversations d'un VRAI service. Celle-ci joue ce que seul un navigateur voit : la VRAIE PAGE SERVIE (`server-msg/public/`), au DOIGT (iPhone 393)
   et à la souris (bureau 1280), de JOUR et de NUIT, contre le VRAI service, sur 127.0.0.1 — jamais teamop.fr.

   Ce qu'elle joue :
     · le « + » : un rond de 44 px au moins, nommé « Nouvelle discussion », qui ouvre la feuille de ce nom (✕ rond à droite, ni « Annuler » ni « Créer ») ;
     · la carte d'actions — Nouveau groupe, Nouveau contact, Nouvel appel, Programmer une réunion — et RIEN d'autre (ni « Communauté » ni « Diffusion ») ;
     · « Contacts fréquents » (ceux avec qui l'on a écrit en dernier), puis tous les contacts de A à Z, chacun avec son statut quand il en a un ;
     · la recherche, qui filtre actions ET contacts en direct (accents et casse ignorés), et dit « Aucun résultat » ;
     · l'index sur le bord droit : toucher une lettre fait DÉFILER la liste jusqu'à elle, glisser le doigt (ou la souris) le long du bord fait défiler en continu ;
     · toucher un contact ouvre sa conversation à deux, et UN retour ramène à la liste (ni la feuille rouverte, ni la page quittée) ;
     · les quatre actions mènent au bon écran, par REMPLACEMENT de l'entrée d'historique : un retour ferme la feuille d'un seul coup ;
     · Échap, le ✕ et le retour système ferment une seule couche ; le focus revient au « + » ; chaque ligne a un nom ; rien ne déborde ; aucune erreur de console.

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), JAMAIS AU CHRONOMÈTRE. ⛔ UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU À LA PLACE.
   ⛔ L'INDEX NE SE PROUVE PAS SUR UNE LISTE QUI NE DÉFILE PAS : la sonde mesure d'abord que la liste DÉPASSE sa fenêtre (douze contacts), sinon « la liste a défilé » passerait sur un défilement impossible.
   ⛔ Un doigt envoyé par `Input.dispatchTouchEvent` (CLAUDE.md) : ce Chromium ne transmet aucun mouvement de moins de ~15 px — le glissé fait des pas de 40 px.
   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-plus.js
              CAPTURES=/dossier   (la feuille ouverte, de chaque navigateur, de jour et de nuit : `plus-iphone-jour.png`…)
              --rapide            (l'iPhone, de jour — pour les mutations)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-plus.js'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const RAPIDE = process.argv.includes('--rapide');
const dormir = T.dort;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const PROFILS = [
  { nom: 'iPhone 393', court: 'iphone', w: 393, h: 852, dpr: 2, mobile: true, insets: { top: 54, bottom: 34 } },
  { nom: 'bureau 1280', court: 'bureau', w: 1280, h: 800, dpr: 1, mobile: false, insets: null },
];
/* douze contacts, d'initiales différentes (Émile : l'accent ne doit pas le ranger à part), un « moi » : la liste dépasse la fenêtre de la feuille */
const NOMS = {
  alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Durand', dora: 'Dora Leroy', emile: 'Émile Garnier', farid: 'Farid Haddad', gaelle: 'Gaëlle Moreau',
  hugo: 'Hugo Perrin', ines: 'Inès Lambert', jules: 'Jules Roux', karim: 'Karim Benali', lea: 'Léa Fabre', zoe: 'Zoé Vidal',
};
const MOTS = Object.fromEntries(Object.keys(NOMS).map(l => [l, 'pw-' + l + '-12345']));
const AUTRES = Object.keys(NOMS).filter(l => l !== 'alice');
const STATUT_BRUNO = 'Sur un chantier à Lyon';

async function ouvrir(b, base, pf, sombre) {
  const ctx = await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: sombre ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'fr-FR',
    timezoneId: 'Europe/Paris', baseURL: base,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const S = { ctx, page, pf, sombre, nom: pf.nom + (sombre ? ', nuit' : ', jour'), base, erreurs: [], console: [], gestes: 0, refus: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 240)));
  page.on('console', m => { if (m.type() === 'error') S.console.push(m.text().slice(0, 240)); });
  page.on('response', r => { try { if (r.status() >= 400) S.refus.push(r.status() + ' ' + r.request().method() + ' ' + new URL(r.url()).pathname); } catch (e) { /* sans adresse */ } });
  if (pf.insets) { try { S.cdp = await ctx.newCDPSession(page); await S.cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, bottom: pf.insets.bottom, left: 0, right: 0 } }); } catch (e) { /* facultatif */ } }
  if (!S.cdp) S.cdp = await ctx.newCDPSession(page);
  return S;
}
async function attendre(S, fn, arg, ms) {
  const fin_ = Date.now() + (ms || 12000);
  for (;;) {
    try { await S.page.waitForFunction(fn, arg, { timeout: Math.max(1, fin_ - Date.now()), polling: 50 }); return true; }
    catch (e) { if (/Timeout/i.test(String(e && e.message)) || Date.now() >= fin_) return false; await dormir(80); }
  }
}
const etatPage = S => S.page.evaluate(() => {
  const t = id => { const e = document.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : null; };
  return 'feuille=' + t('feuille-titre') + (document.documentElement.classList.contains('feuille-ouverte') ? '(ouverte)' : '(fermée)') + ' · mot=' + (t('mot') || '') + ' · adresse=' + location.hash + ' · n=' + (history.state && history.state.n);
}).catch(() => '?');
async function verifier(titre, S, fn, arg, ms) {
  const ok = await attendre(S, fn, arg, ms);
  if (ok) vrai(S.nom + ' : ' + titre, true);
  else v(S.nom + ' : ' + titre, 'non vu à temps ; page : ' + await etatPage(S) + (S.erreurs.length ? ' ; erreurs JS : ' + S.erreurs.slice(-2).join(' | ') : ''), 'vu');
  return ok;
}
async function toucher(S, sel) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  S.gestes++;
  if (S.pf.mobile) await loc.tap(); else await loc.click();
}
async function capture(S, nom) {
  if (!DOSSIER_CAPTURES) return;
  try { fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER_CAPTURES, 'plus-' + S.pf.court + '-' + (S.sombre ? 'nuit' : 'jour') + (nom ? '-' + nom : '') + '.png') }); } catch (e) { /* facultatif */ }
}
async function connecter(S, login) {
  await S.page.goto(S.base + '/');
  await S.page.locator('#c-login').fill(login); await S.page.locator('#c-pass').fill(MOTS[login]); await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0 && document.querySelectorAll('#liste-conv .conv').length > 0; }, null, { timeout: 15000 });
  await dormir(300);
}
/* deux trames, une lecture forcée, puis 700 ms plus tard (CLAUDE.md : deux lectures), contre la largeur POSÉE ; la page est poussée à droite : seul un défilement réel compte */
async function largeur(S, etape) {
  const mesure = () => S.page.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
    window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
    const f = document.getElementById('feuille').getBoundingClientRect();
    return { dep: document.documentElement.scrollWidth, sx, n: document.querySelectorAll('body *').length, fd: Math.round(f.right) };
  });
  await mesure(); await dormir(600); const m = await mesure();
  S.ecrans = (S.ecrans || 0) + 1; S.population = (S.population || 0) + m.n;
  if (m.sx > 0 || m.dep > S.pf.w + 1 || m.fd > S.pf.w + 1) (S.debordements = S.debordements || []).push(etape + ' : scrollWidth ' + m.dep + ' pour ' + S.pf.w + ', poussée ' + m.sx + ', feuille jusqu\'à ' + m.fd);
}
const ouverte = (titre) => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === titre;
const histo = S => S.page.evaluate(() => ({ n: history.state && history.state.n, len: history.length, hash: location.hash, ouverte: document.documentElement.classList.contains('feuille-ouverte'), titre: document.getElementById('feuille-titre').textContent, conv: document.documentElement.dataset.conv === '1' }));
const texteLignes = (S, sel) => S.page.evaluate(s => Array.from(document.querySelectorAll(s)).filter(e => e.getClientRects().length > 0 && !e.hidden).map(e => e.textContent.replace(/\s+/g, ' ').trim()), sel);

/* un doigt qui glisse le long de l'index : touchStart, trois pas de 40 px, touchEnd — sur la page, un seul flux de pointeur */
async function glisserTactile(S, x, y0, pas) {
  await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y0 }] });
  let y = y0;
  for (const dy of pas) { y += dy; await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await dormir(120); }
  await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  S.gestes++;
}

async function parcours(b, base, pf, sombre, personnes) {
  const S = await ouvrir(b, base, pf, sombre);
  console.log('\n── ' + S.nom + ' ──');
  await connecter(S, 'alice');
  const h0 = await histo(S);
  v(S.nom + ' : (population) la liste s\'ouvre sur « Messages », aucune feuille, une entrée d\'historique de départ', [h0.hash, h0.ouverte], ['#messages', false]);

  /* ── 1. LE « + » ── */
  const plus = await S.page.evaluate(() => { const e = document.getElementById('btn-plus'); const r = e.getBoundingClientRect(), p = e.querySelector('.pastille').getBoundingClientRect(); const cs = getComputedStyle(e.querySelector('.pastille')); return { nom: e.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height), pw: Math.round(p.width), ph: Math.round(p.height), rayon: cs.borderRadius, fond: cs.backgroundColor, svg: !!e.querySelector('svg'), texte: e.textContent.trim(), anciens: !!document.getElementById('btn-groupe') }; });
  v(S.nom + ' : le « + » est nommé « Nouvelle discussion », sans texte, avec son icône, et l\'ancien bouton « Groupe » n\'existe plus', [plus.nom, plus.texte, plus.svg, plus.anciens], ['Nouvelle discussion', '', true, false]);
  vrai(S.nom + ' : la zone qui répond fait 44 px au moins (' + plus.w + ' × ' + plus.h + '), le rond qu\'on voit ' + plus.pw + ' × ' + plus.ph + ' (rayon ' + plus.rayon + ', fond ' + plus.fond + ')', plus.w >= 44 && plus.h >= 44 && plus.pw === plus.ph && plus.pw >= 30 && plus.fond !== 'rgba(0, 0, 0, 0)');
  await toucher(S, '#btn-plus');
  await verifier('toucher le « + » ouvre la feuille « Nouvelle discussion »', S, ouverte, 'Nouvelle discussion', 6000);
  await dormir(500);
  const h1 = await histo(S);
  v(S.nom + ' : la feuille est UNE entrée d\'historique de plus (n ' + h0.n + ' → ' + h1.n + ')', [h1.n, h1.hash], [(h0.n || 0) + 1, '#messages']);
  const foyer = await S.page.evaluate(() => document.activeElement && document.activeElement.id);
  vrai(S.nom + ' : le focus est dans la feuille (' + foyer + ') et le fond est inerte', foyer === 'feuille' && await S.page.evaluate(() => document.getElementById('app').inert));

  /* ── 2. LA FEUILLE : barre, recherche, actions ── */
  const barre = await S.page.evaluate(() => {
    const vis = id => { const e = document.getElementById(id); return !!e && !e.hidden && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none'; };
    const x = document.getElementById('nd-fermer'), r = x.getBoundingClientRect(), titre = document.getElementById('feuille-titre').getBoundingClientRect(), f = document.getElementById('feuille').getBoundingClientRect();
    return { creer: vis('g-creer'), annuler: vis('g-annuler'), fermer: vis('nd-fermer'), fw: Math.round(r.width), fh: Math.round(r.height), nom: x.getAttribute('aria-label'), droite: Math.round(f.right - r.right), centre: Math.round(Math.abs((titre.left + titre.width / 2) - (f.left + f.width / 2))) };
  });
  v(S.nom + ' : la barre porte le ✕ rond à droite — ni « Annuler » ni « Créer » visibles', [barre.fermer, barre.annuler, barre.creer], [true, false, false]);
  vrai(S.nom + ' : le ✕ est nommé « Fermer », fait 44 px au moins (' + barre.fw + ' × ' + barre.fh + ') et le titre reste centré (écart ' + barre.centre + ' px)', barre.nom === 'Fermer' && barre.fw >= 44 && barre.fh >= 44 && barre.centre <= 6, barre);
  const champ = await S.page.evaluate(() => { const i = document.getElementById('nd-recherche'); return { type: i.type, ph: i.placeholder, nom: i.labels && i.labels[0] ? i.labels[0].textContent.trim() : '', px: parseFloat(getComputedStyle(i).fontSize), h: Math.round(i.closest('label').getBoundingClientRect().height) }; });
  vrai(S.nom + ' : le champ de recherche (type search, ≥ 16 px contre le zoom d\'iOS, ≥ 44 px) ne promet que ce que le service sait chercher : « ' + champ.ph + ' »', champ.type === 'search' && champ.px >= 16 && champ.h >= 44 && !/num[ée]ro|@/i.test(champ.ph) && /nom|contact/i.test(champ.ph), champ);
  const actions = await S.page.evaluate(() => Array.from(document.querySelectorAll('#nd-liste [data-nd-act]')).map(e => ({ id: e.dataset.ndAct, texte: e.textContent.replace(/\s+/g, ' ').trim(), h: Math.round(e.getBoundingClientRect().height), svg: !!e.querySelector('svg.ic'), couleur: getComputedStyle(e.querySelector('svg.ic')).color })));
  v(S.nom + ' : la carte d\'actions porte les quatre gestes du service, dans cet ordre — et RIEN d\'autre', actions.map(a => a.texte), ['Nouveau groupe', 'Nouveau contact', 'Nouvel appel', 'Programmer une réunion']);
  vrai(S.nom + ' : chaque action a son icône violette (couleur d\'accent) et fait 44 px au moins (' + actions.map(a => a.h).join('/') + ')', actions.length === 4 && actions.every(a => a.svg && a.h >= 44) && new Set(actions.map(a => a.couleur)).size === 1);
  const corpsTexte = await S.page.evaluate(() => document.getElementById('nd-corps').textContent);
  vrai(S.nom + ' : ni « Communauté » ni « Diffusion » (nous ne les avons pas)', !/Communaut|Diffusion/i.test(corpsTexte));

  /* ── 3. LES CONTACTS : fréquents, puis A à Z, avec le statut ── */
  const L = await S.page.evaluate(() => {
    const rubriques = Array.from(document.querySelectorAll('#nd-liste .rubrique')).map(e => e.textContent.trim());
    const lignes = Array.from(document.querySelectorAll('#nd-liste [data-nd-contact]')).map(e => ({ id: e.dataset.ndContact, nom: e.querySelector('.contact-nom').textContent, role: (e.querySelector('.contact-role') || {}).textContent || '', h: Math.round(e.getBoundingClientRect().height), nomAcc: e.textContent.trim().length > 0 }));
    const idx = Array.from(document.querySelectorAll('#nd-index [data-nd-lettre]')).map(e => e.dataset.ndLettre);
    const d = document.getElementById('nd-defile');
    return { rubriques, lignes, idx, defile: d.scrollHeight, fenetre: d.clientHeight, indexVisible: document.getElementById('nd-index').getClientRects().length > 0 };
  });
  const freq = L.rubriques.indexOf('Contacts fréquents');
  vrai(S.nom + ' : (population) ' + L.lignes.length + ' lignes de contact, ' + L.rubriques.length + ' en-têtes de groupe', L.lignes.length >= 12 + 3 && freq === 0);
  const sansFreq = L.lignes.slice(Math.min(4, L.lignes.length - 12));
  v(S.nom + ' : les en-têtes sont « Contacts fréquents » puis les lettres, de A à Z (# en dernier)', L.rubriques, ['Contacts fréquents', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'Z']);
  const freqNoms = L.lignes.slice(0, 4).map(x => x.nom);
  v(S.nom + ' : « Contacts fréquents » = ceux à qui Alice a écrit en dernier (les plus récents d\'abord), quatre au plus', freqNoms, personnes.frequents);
  const azNoms = L.lignes.slice(4).map(x => x.nom);
  v(S.nom + ' : tous les contacts de A à Z, « Émile » rangé avec les E (l\'accent ne le range pas à part)', azNoms, Object.keys(NOMS).filter(l => l !== 'alice').map(l => NOMS[l]).sort((a, b) => a.normalize('NFD').replace(/[̀-ͯ]/g, '').localeCompare(b.normalize('NFD').replace(/[̀-ͯ]/g, ''), 'fr')));
  const bruno = L.lignes.find(x => x.nom === NOMS.bruno);
  v(S.nom + ' : le statut s\'écrit sous le nom (Bruno : « ' + STATUT_BRUNO + ' »), et un contact sans statut n\'a pas de ligne vide', [bruno && bruno.role, L.lignes.filter(x => x.nom !== NOMS.bruno && x.role === '').length > 0], [STATUT_BRUNO, true]);
  vrai(S.nom + ' : chaque ligne de contact fait 44 px au moins (' + Math.min.apply(null, L.lignes.map(x => x.h)) + ' px au plus bas) et porte un nom lisible', L.lignes.every(x => x.h >= 44 && x.nomAcc));
  v(S.nom + ' : l\'index porte une lettre par groupe (' + L.idx.join('') + ')', L.idx, ['B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'Z']);
  vrai(S.nom + ' : (population) la liste DÉPASSE sa fenêtre (' + L.defile + ' px de contenu pour ' + L.fenetre + ') — un défilement est possible', L.defile > L.fenetre + 100 && L.indexVisible);
  const idxGeo = await S.page.evaluate(() => { const n = document.getElementById('nd-index').getBoundingClientRect(), f = document.getElementById('feuille').getBoundingClientRect(), d = document.getElementById('nd-defile').getBoundingClientRect(); const b = Array.from(document.querySelectorAll('#nd-index button')).map(e => e.getBoundingClientRect()); return { droite: Math.round(f.right - n.right), largeur: Math.round(n.width), mini: Math.round(Math.min.apply(null, b.map(r => r.height))), finListe: Math.round(Math.max.apply(null, Array.from(document.querySelectorAll('#nd-liste .carte')).map(e => e.getBoundingClientRect().right)) - n.left), noms: Array.from(document.querySelectorAll('#nd-index button')).every(e => !!e.getAttribute('aria-label')) }; });
  vrai(S.nom + ' : l\'index est collé au bord droit de la feuille (écart ' + idxGeo.droite + ' px), large de ' + idxGeo.largeur + ' px (zone qui répond), chaque lettre a sa zone de ' + idxGeo.mini + ' px de haut au moins, nommée, et la liste s\'arrête avant lui', idxGeo.droite <= 1 && idxGeo.largeur >= 44 && idxGeo.mini >= 14 && idxGeo.noms && idxGeo.finListe <= 1, idxGeo);
  await largeur(S, 'feuille « Nouvelle discussion »');
  await capture(S, '');

  /* ── 4. L'INDEX : toucher une lettre, puis glisser ── */
  const lettreEnHaut = lettre => S.page.evaluate(l => { const d = document.getElementById('nd-defile').getBoundingClientRect(), e = document.querySelector('#nd-liste [data-lettre="' + l + '"]').getBoundingClientRect(); return Math.round(e.top - d.top); }, lettre);
  const defile = () => S.page.evaluate(() => Math.round(document.getElementById('nd-defile').scrollTop));
  const d0 = await defile();
  await toucher(S, '#nd-index [data-nd-lettre="Z"]');
  await verifier('toucher « Z » fait défiler la liste (le haut de la liste n\'est plus le haut)', S, () => document.getElementById('nd-defile').scrollTop > 100, null, 4000);
  const tz = await lettreEnHaut('Z'), dz = await defile();
  const bornes = await S.page.evaluate(() => { const d = document.getElementById('nd-defile'); return { fin: d.scrollHeight - d.clientHeight - d.scrollTop <= 1, fenetre: d.clientHeight }; });
  vrai(S.nom + ' : le groupe « Z » est à l\'écran (à ' + tz + ' px du haut de la liste, défilement ' + dz + ' px) — la liste s\'arrête là : la fin de la liste borne le défilement, aucun vide n\'est ajouté pour la dernière lettre', d0 === 0 && dz > 100 && bornes.fin && tz >= 0 && tz < bornes.fenetre - 40, { tz, dz, bornes });
  await toucher(S, '#nd-index [data-nd-lettre="C"]');
  await verifier('toucher « C » ramène la liste à la lettre C', S, () => { const d = document.getElementById('nd-defile').getBoundingClientRect(), e = document.querySelector('#nd-liste [data-lettre="C"]').getBoundingClientRect(); return Math.abs(e.top - d.top) <= 8; }, null, 4000);
  /* glisser : de « B » (haut de l'index) jusqu'en bas, le défilement croît, puis remonte */
  await toucher(S, '#nd-index [data-nd-lettre="B"]');
  await verifier('« B » ramène la liste au premier groupe (B en haut, les actions et les fréquents sont au-dessus)', S, () => { const d = document.getElementById('nd-defile').getBoundingClientRect(), e = document.querySelector('#nd-liste [data-lettre="B"]').getBoundingClientRect(); return Math.abs(e.top - d.top) <= 8 && document.getElementById('nd-defile').scrollTop > 100; }, null, 4000);
  const geo = await S.page.evaluate(() => { const b = document.querySelector('#nd-index [data-nd-lettre="B"]').getBoundingClientRect(), z = document.querySelector('#nd-index [data-nd-lettre="Z"]').getBoundingClientRect(); return { x: Math.round(b.left + b.width / 2), yb: Math.round(b.top + b.height / 2), yz: Math.round(z.top + z.height / 2) }; });
  const vues = [];
  const note = async () => vues.push(await defile());
  if (S.pf.mobile) {
    await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: geo.x, y: geo.yb }] });
    const pas = Math.ceil((geo.yz - geo.yb) / 3);
    for (let i = 1; i <= 3; i++) { await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: geo.x, y: Math.min(geo.yz, geo.yb + pas * i) }] }); await dormir(160); await note(); }
    await S.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    S.gestes++;
  } else {
    await S.page.mouse.move(geo.x, geo.yb); await S.page.mouse.down();
    const pas = Math.ceil((geo.yz - geo.yb) / 3);
    for (let i = 1; i <= 3; i++) { await S.page.mouse.move(geo.x, Math.min(geo.yz, geo.yb + pas * i), { steps: 4 }); await dormir(120); await note(); }
    await S.page.mouse.up(); S.gestes++;
  }
  vrai(S.nom + ' : glisser le long de l\'index fait défiler la liste en continu (' + vues.join(' → ') + ' px), et elle finit sur « Z »', vues.length === 3 && vues[0] > 0 && vues[2] >= vues[0] && vues[2] > 100 && new Set(vues).size >= 2, vues);
  const apresGlisse = await S.page.evaluate(() => ({ ouverte: document.documentElement.classList.contains('feuille-ouverte'), titre: document.getElementById('feuille-titre').textContent, pages: window.scrollY }));
  v(S.nom + ' : le glissé n\'a ni fermé la feuille ni fait défiler la page derrière', [apresGlisse.ouverte, apresGlisse.titre, apresGlisse.pages], [true, 'Nouvelle discussion', 0]);

  /* ── 5. LA RECHERCHE : actions ET contacts, accents et casse ignorés ── */
  await S.page.locator('#nd-recherche').fill('CHLOE'); S.gestes++;
  await verifier('« CHLOE » (sans accent, en majuscules) ne laisse que Chloé Durand — ni actions, ni « fréquents »', S, () => { const l = Array.from(document.querySelectorAll('#nd-liste [data-nd-contact] .contact-nom')).map(e => e.textContent); return l.length === 1 && l[0] === 'Chloé Durand' && !document.querySelector('#nd-liste [data-nd-act]') && !/fréquents/.test(document.getElementById('nd-liste').textContent); }, null, 4000);
  const idxRecherche = await S.page.evaluate(() => ({ cache: document.getElementById('nd-index').hidden, haut: document.getElementById('nd-defile').scrollTop }));
  v(S.nom + ' : un seul groupe = pas d\'index (il ne servirait à rien), et la liste revient en haut', [idxRecherche.cache, idxRecherche.haut], [true, 0]);
  await S.page.locator('#nd-recherche').fill('nouv'); S.gestes++;
  await verifier('« nouv » filtre aussi les ACTIONS : Nouveau groupe, Nouveau contact, Nouvel appel (pas « Programmer »), sans contact', S, () => { const a = Array.from(document.querySelectorAll('#nd-liste [data-nd-act]')).map(e => e.dataset.ndAct).join(); return a === 'groupe,contact,appel' && !document.querySelector('#nd-liste [data-nd-contact]'); }, null, 4000);
  await S.page.locator('#nd-recherche').fill('zzzz'); S.gestes++;
  await verifier('« zzzz » dit « Aucun résultat » (rien d\'autre à l\'écran)', S, () => /Aucun résultat pour « zzzz »/.test(document.getElementById('nd-liste').textContent) && !document.querySelector('#nd-liste [data-nd-act], #nd-liste [data-nd-contact]'), null, 4000);
  await S.page.locator('#nd-recherche').fill('<b>x</b>'); S.gestes++;
  await verifier('une recherche en balisage s\'affiche comme du TEXTE (échappée)', S, () => { const p = document.querySelector('#nd-liste .vide'); return !!p && p.textContent.includes('<b>x</b>') && !p.querySelector('b'); }, null, 4000);
  await S.page.locator('#nd-recherche').fill(''); S.gestes++;
  await verifier('effacer la recherche rend tout (quatre actions, fréquents, A à Z)', S, () => document.querySelectorAll('#nd-liste [data-nd-act]').length === 4 && document.querySelectorAll('#nd-liste [data-nd-contact]').length >= 15, null, 4000);

  /* ── 6. UN CONTACT OUVRE SA CONVERSATION : un retour ramène à la liste ── */
  await toucher(S, '#nd-liste [data-nd-contact="' + personnes.ids.dora + '"]');
  await verifier('toucher « Dora Leroy » ferme la feuille et ouvre sa conversation à deux', S, nom => !document.documentElement.classList.contains('feuille-ouverte') && document.documentElement.dataset.conv === '1' && (document.querySelector('#conv-titre .conv-titre-nom > span') || {}).textContent === nom, NOMS.dora, 8000);
  await dormir(400);
  const h2 = await histo(S);
  v(S.nom + ' : l\'entrée de la feuille a été REMPLACÉE par la conversation (même n : ' + h1.n + ' → ' + h2.n + ', ' + h1.len + ' → ' + h2.len + ' entrées), la page est toujours dans l\'application', [h2.n, h2.len, h2.conv], [h1.n, h1.len, true]);
  const conv = await S.page.evaluate(() => ({ titre: (document.querySelector('#conv-titre .conv-titre-nom > span') || {}).textContent, nonUneFeuille: !document.documentElement.classList.contains('feuille-ouverte'), foyer: document.activeElement && (document.activeElement.id || document.activeElement.tagName) }));
  vrai(S.nom + ' : la conversation ouverte est celle de Dora, et c\'est la MÊME que celle de la liste (une seule conversation à deux, pas un doublon)', conv.titre === NOMS.dora && await S.page.evaluate(nom => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).filter(e => e.textContent === nom).length === 1, NOMS.dora), conv);
  await S.page.goBack(); S.gestes++;
  await verifier('UN retour système ramène à la liste : ni la feuille rouverte, ni la page quittée', S, () => document.documentElement.dataset.conv !== '1' && !document.documentElement.classList.contains('feuille-ouverte') && location.hash === '#messages' && document.querySelectorAll('#liste-conv .conv').length > 0, null, 6000);
  const h3 = await histo(S);
  v(S.nom + ' : après le retour, l\'historique est celui de départ (n ' + h3.n + ', page toujours l\'application)', [h3.n, h3.hash], [h0.n, '#messages']);

  /* ── 7. LES QUATRE ACTIONS MÈNENT AU BON ENDROIT, PAR REMPLACEMENT : un retour ferme tout ── */
  const cibles = [
    ['groupe', 'Nouveau groupe', t => t === 'Nouveau groupe'],
    ['contact', 'Nouveau contact', t => t === 'Contacts'],
    ['appel', 'Nouvel appel', t => /appel/i.test(t)],
    ['reunion', 'Programmer une réunion', t => /réunion/i.test(t)],
  ];
  for (const [id, libelle, bon] of cibles) {
    await toucher(S, '#btn-plus');
    await verifier('(' + libelle + ') la feuille s\'ouvre', S, ouverte, 'Nouvelle discussion', 6000); await dormir(450);
    const avant = await histo(S);
    await toucher(S, '#nd-liste [data-nd-act="' + id + '"]');
    await verifier('(' + libelle + ') mène à son écran', S, () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent !== 'Nouvelle discussion', null, 8000);
    await dormir(450);
    const apres = await histo(S);
    vrai(S.nom + ' : « ' + libelle + ' » ouvre « ' + apres.titre + ' » (l\'écran attendu)', bon(apres.titre), apres);
    v(S.nom + ' : « ' + libelle + ' » REMPLACE l\'entrée (n ' + avant.n + ' → ' + apres.n + ', ' + avant.len + ' → ' + apres.len + ' entrées) : rien n\'est empilé', [apres.n, apres.len], [avant.n, avant.len]);
    await S.page.goBack(); S.gestes++;
    await verifier('(' + libelle + ') UN seul retour ferme la feuille et ramène à la liste (pas à « Nouvelle discussion », pas hors de l\'application)', S, () => !document.documentElement.classList.contains('feuille-ouverte') && location.hash === '#messages' && document.querySelectorAll('#liste-conv .conv').length > 0, null, 6000);
    const fin_ = await histo(S);
    v(S.nom + ' : (' + libelle + ') l\'historique est revenu au départ', [fin_.n, fin_.len > 0], [h0.n, true]);
    const f = await S.page.evaluate(() => document.activeElement && document.activeElement.id);
    v(S.nom + ' : (' + libelle + ') le focus est revenu au « + »', f, 'btn-plus');
  }

  /* ── 8. FERMER : le ✕, Échap, le retour système — une seule couche chaque fois ── */
  await toucher(S, '#btn-plus'); await verifier('(✕) la feuille s\'ouvre', S, ouverte, 'Nouvelle discussion', 6000); await dormir(450);
  await toucher(S, '#nd-fermer');
  await verifier('le ✕ referme la feuille', S, () => !document.documentElement.classList.contains('feuille-ouverte'), null, 5000);
  const h4 = await histo(S);
  v(S.nom + ' : après le ✕ l\'entrée est rendue (n ' + h4.n + ') et le focus est revenu au « + »', [h4.n, await S.page.evaluate(() => document.activeElement && document.activeElement.id)], [h0.n, 'btn-plus']);
  await toucher(S, '#btn-plus'); await verifier('(Échap) la feuille s\'ouvre', S, ouverte, 'Nouvelle discussion', 6000); await dormir(450);
  await S.page.keyboard.press('Escape'); S.gestes++;
  await verifier('Échap referme la feuille d\'un seul coup', S, () => !document.documentElement.classList.contains('feuille-ouverte') && location.hash === '#messages', null, 5000);
  const h5 = await histo(S);
  v(S.nom + ' : après Échap, une seule entrée a été rendue (n ' + h5.n + ')', h5.n, h0.n);
  await toucher(S, '#btn-plus'); await verifier('(voile) la feuille s\'ouvre', S, ouverte, 'Nouvelle discussion', 6000); await dormir(450);
  if (S.pf.mobile) await S.page.touchscreen.tap(8, 8); else await S.page.mouse.click(8, 8);
  S.gestes++;
  await verifier('toucher le voile referme la feuille', S, () => !document.documentElement.classList.contains('feuille-ouverte'), null, 5000);
  const h6 = await histo(S);
  v(S.nom + ' : après le voile, une seule entrée a été rendue (n ' + h6.n + ')', h6.n, h0.n);

  /* ── 9. AU CLAVIER : chaque ligne s'atteint et porte un nom ── */
  await toucher(S, '#btn-plus'); await verifier('(clavier) la feuille s\'ouvre', S, ouverte, 'Nouvelle discussion', 6000); await dormir(450);
  const tab = await S.page.evaluate(async () => {
    const f = document.getElementById('feuille'); f.focus();
    const vus = [];
    for (let i = 0; i < 12; i++) { const e = document.activeElement; if (e && e !== f) vus.push(e.id || e.dataset.ndAct || e.dataset.ndContact || e.tagName); }
    const focalisables = Array.from(f.querySelectorAll('button, input')).filter(x => !x.disabled && !x.closest('[hidden]') && x.getClientRects().length);
    const sansNom = focalisables.filter(x => !(x.getAttribute('aria-label') || x.textContent.trim() || (x.labels && x.labels.length && x.labels[0].textContent.trim()))).map(x => x.outerHTML.slice(0, 80));
    return { n: focalisables.length, sansNom, annulerHorsTab: document.getElementById('g-annuler').tabIndex };
  });
  vrai(S.nom + ' : (population) ' + tab.n + ' contrôles atteignables dans la feuille, aucun sans nom, et « Annuler » (invisible) n\'est pas dans l\'ordre de tabulation', tab.n >= 20 && tab.sansNom.length === 0 && tab.annulerHorsTab === -1, tab);
  await S.page.keyboard.press('Tab'); await S.page.keyboard.press('Tab'); S.gestes += 2;
  const ordre = await S.page.evaluate(() => document.activeElement && (document.activeElement.id || document.activeElement.dataset.ndAct || document.activeElement.tagName));
  vrai(S.nom + ' : deux Tab depuis la feuille arrivent dans la feuille (' + ordre + '), jamais sur le fond inerte', await S.page.evaluate(() => document.getElementById('feuille').contains(document.activeElement)), ordre);
  await S.page.keyboard.press('Escape'); S.gestes++;
  await verifier('Échap referme', S, () => !document.documentElement.classList.contains('feuille-ouverte'), null, 5000);

  /* ── 10. LE REPOS : aucune erreur, rien qui déborde ── */
  await largeur(S, 'liste des conversations après la feuille');
  return S;
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const QUOTAS = { reunion: { max: 100000, fenetreMs: 3600000 }, ics: { max: 100000, fenetreMs: 60000 }, courriel: { max: 100000, fenetreMs: 60000 } };
  const svc = await T.lancerService({ urlGestion: og.url, config: { pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, beta: { relectureMs: 300, timeoutMs: 1500 }, quotas: QUOTAS } });
  let b = null;
  const tous = [];
  try {
    b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS });
  } catch (e) { console.error('Sonde non lançable : le navigateur ne démarre pas (' + e.message.split('\n')[0] + ')'); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    /* le monde : Alice est la personne ; les douze autres sont ses contacts ; elle écrit à Dora, puis à Zoé, puis à Karim, puis à Bruno (le plus récent), dans cet ordre */
    const P = {}; for (const l of Object.keys(NOMS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    const ids = Object.fromEntries(Object.keys(P).map(l => [l, P[l].moi.id]));
    await P.bruno.post('/api/moi/maj', { statut: STATUT_BRUNO });
    const convs = {};
    for (const l of AUTRES) {
      const lien = await P[l].post('/api/contacts/lien', {});
      if (lien.code !== 201) throw new Error('lien de contact refusé (' + lien.code + ') pour ' + l);
      const a = await P.alice.post('/api/liens/accepter', { code: lien.j.code });
      if (a.code !== 200) throw new Error('lien de contact non accepté (' + a.code + ') pour ' + l);
    }
    for (const l of ['dora', 'zoe', 'karim', 'bruno']) { const d = await P.alice.post('/api/conversations/directe', { uid: ids[l] }); if (d.code !== 200 && d.code !== 201) throw new Error('conversation à deux refusée (' + d.code + ')'); convs[l] = d.j.conversation.id; const m = await P.alice.post('/api/conversations/' + convs[l] + '/messages', { cid: 'plus-' + l + '-0001', texte: 'Bonjour ' + NOMS[l] }); if (m.code !== 201 && m.code !== 200) throw new Error('message refusé (' + m.code + ')'); await dormir(1100); }
    const personnes = { ids, frequents: ['bruno', 'karim', 'zoe', 'dora'].map(l => NOMS[l]) };
    const profils = RAPIDE ? [PROFILS[0]] : PROFILS;
    for (const pf of profils) for (const sombre of RAPIDE ? [false] : [false, true]) tous.push(await parcours(b, svc.base, pf, sombre, personnes));
    console.log('\n── La fin : rien d\'anormal ──');
    const ATTENDUS = [/^401 /];
    for (const S of tous) {
      vrai(S.nom + ' : (population) ' + S.gestes + ' gestes portés, ' + (S.ecrans || 0) + ' écrans mesurés en largeur (' + (S.population || 0) + ' éléments)', S.gestes > 30 && S.ecrans >= 2);
      v(S.nom + ' : 0 erreur JavaScript, aucune erreur de console autre qu\'un refus du service', [S.erreurs, S.console.filter(t => !/Failed to load resource/.test(t))], [[], []]);
      v(S.nom + ' : aucun écran ne déborde de ses ' + S.pf.w + ' px', S.debordements || [], []);
      v(S.nom + ' : les refus réseau relevés sont des refus ATTENDUS — relevé : ' + (S.refus.join(', ') || 'aucun'), S.refus.filter(x => !ATTENDUS.some(re => re.test(x))), []);
    }
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    const sortie = svc.sortie.texte();
    v('le service n\'a écrit AUCUNE erreur ni exception pendant tout le parcours (population : ' + sortie.split('\n').filter(Boolean).length + ' lignes de journal)', /Error|TypeError|unhandled|Exception/.test(sortie), false);
    try { if (b) await b.close(); } catch (e) { /* rien */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
