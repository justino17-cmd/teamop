/* ══ SONDE — L'AGENDA, QUATRE GESTES DE JUSTIN (15 octobre 2026), DANS LA VRAIE PAGE SERVIE ═════════════════════════════════════════════════════════════════════
   Justin, captures de la bêta à l'appui : « quand on sélectionne l'heure de début, il faudrait qu'on puisse choisir ce que ça va durer, 30 minutes, une heure ou plus » ; « il
   faudrait pouvoir l'ouvrir à partir de n'importe quel GPS qui est installé sur un téléphone » ; « l'application fait déjà agenda » → « quand les gens prennent un rendez-vous sur un
   site ou autre, ils peuvent l'ajouter à notre calendrier, mais par l'application » (coller la confirmation) ; « on peut rester appuyé sur le rendez-vous concerné, marquer effectué,
   et ça s'affiche en vert ». Joué contre le VRAI service, qui calcule les trajets chez un FAUX IGN (la boucle locale). ⛔ AUCUNE requête ne sort de la machine : Google Maps et Waze
   répondent par un faux, sur place.
     1. iPhone : la durée sous « Début » — 30 min, 1 h, « Plus… » ; la fin suit, un début changé la déplace d'autant, une fin tapée redit sa durée ; enregistré, le service l'a ;
     2. iPhone, presse-papiers fermé : « Coller une confirmation » ouvre la zone, on colle ; un texte sans date le DIT ; une confirmation remplit la fiche (titre, avec qui, jour, heure,
        durée, adresse) ; « Y aller » paraît avec le lieu tapé ; ⛔ le texte collé ne part JAMAIS (une référence témoin n'est dans aucune requête) ;
     3. iPhone : « Y aller » — Plans, Google Maps, Waze, vers l'adresse ; calculé, vers l'arrivée trouvée ; à pied, sans Waze ;
     4. iPhone : l'APPUI LONG sur le rendez-vous, sans ouvrir sa fiche — « Y aller » ; « Marquer comme fait » : la coche VERTE ; fait, plus de « Y aller » ; « Remettre à faire » ;
     5. Android, presse-papiers permis : « Coller une confirmation » lit la confirmation copiée et remplit tout seul ; « Y aller » commence par « Choisir une application » ;
     6. au bureau, de nuit : une réunion — la durée sous « Début » ; le rendez-vous fait est VERT dans la semaine ; le clic droit « Y aller » ; Google Maps s'ouvre à part, la page reste ;
        ⛔ une arrivée piégée (un libellé de l'IGN qui porte du balisage) s'affiche en texte.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-agenda-geste.js          CAPTURES=/dossier pour les images.
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { fauxIgn } = require('./outils-trajet');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const MDP = 'pw-alice-geste-1234';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true, ua: UA_IPHONE }, ANDROID = { w: 412, h: 915, dpr: 2, mobile: true, ua: UA_ANDROID }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false };
const PARIS = 'Europe/Paris';
const POS = { lon: 2.2384627, lat: 48.8920334 };                                       // La Défense : « ma position »
const TEMOIN = 'TEMOIN-QXW7';                                                           // une référence qui n'est QUE dans le texte collé

async function ouvrir(b, base, pf, o) {
  const opts = Object.assign({ nuit: false, presse: false }, o || {});
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, userAgent: pf.ua, colorScheme: opts.nuit ? 'dark' : 'light',
    reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS, geolocation: { latitude: POS.lat, longitude: POS.lon, accuracy: 30 },
    permissions: ['geolocation'].concat(opts.presse ? ['clipboard-read', 'clipboard-write'] : []) });
  /* ⛔ rien ne sort : tout ce qui n'est pas le service local reçoit un faux (Google Maps, Waze — ouverts par « Y aller ») et est NOTÉ */
  const dehors = [];
  await ctx.route(u => !u.href.startsWith(base), r => { dehors.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>faux</title><p>faux</p>' }); });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, erreurs: [], requetes: [], dehors };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  page.on('request', r => S.requetes.push(r.url() + ' ' + (r.postData() || '')));
  await page.goto(base + '/');
  await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MDP); await page.locator('#c-entrer').click();
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
  return S;
}
const dormir = ms => new Promise(r => setTimeout(r, ms));
/* ⛔ la page IGNORE tout clic dans les 350 ms qui suivent l'ouverture d'un menu, et le premier clic dans les 500 ms qui suivent le relâcher d'un appui long (c'est le relâcher lui-même) :
   un doigt réel touche plus tard — la sonde aussi */
const menuOuvert = async (S) => { const ok = await attendre(S, () => !document.getElementById('menu-fond').hidden); await dormir(600); return ok; };
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
async function toucher(S, sel) { const l = S.page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (S.pf.mobile) await l.tap(); else await l.click(); }
/* l'appui long AU DOIGT : le menu s'ouvre à 480 ms ; le doigt se lève 520 ms après (passé les 350 ms où la page ignore le clic du relâcher) */
async function appuiLong(S, loc) {
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const bb = await loc.boundingBox(); if (!bb) throw new Error('appui long : pas de boîte');
  const c = await S.ctx.newCDPSession(S.page), x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await dormir(1000);
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach().catch(() => {});
}
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
const localParis = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t)).replace(' ', 'T');
const demain = () => localParis(Date.now() + 86400000).slice(0, 10);
const instantParis = (local) => { const brut = Date.parse(local + ':00Z'); let t = brut; for (let i = 0; i < 2; i++) t += brut - Date.parse(localParis(t) + ':00Z'); return t; };
const minutes = (a, b) => Math.round((Date.parse(b + ':00Z') - Date.parse(a + ':00Z')) / 60000);
/* le trio de la durée, tel que l'écran le montre */
const duree = (S, p) => S.page.evaluate((p) => { const z = document.getElementById(p + '-duree'), s = document.getElementById(p + '-duree-plus'); return { debut: document.getElementById(p + '-debut').value, fin: document.getElementById(p + '-fin').value,
  chips: Array.from(z.querySelectorAll('[data-duree]')).map(b => b.textContent + (b.getAttribute('aria-pressed') === 'true' ? '✓' : '')), plus: s.options[s.selectedIndex].textContent, actif: s.classList.contains('actif') }; }, p);
/* la feuille « Y aller » : son titre, ses liens */
const feuilleGps = (S) => S.page.evaluate(() => { const M = document.getElementById('menu-msg'); return { ouverte: !document.getElementById('menu-fond').hidden, titre: (M.querySelector('.menu-titre small') || {}).textContent || '',
  liens: Array.from(M.querySelectorAll('a[data-gps]')).map(a => ({ k: a.dataset.gps, texte: a.textContent, href: a.getAttribute('href'), cible: a.getAttribute('target') || '', h: Math.round(a.getBoundingClientRect().height) })),
  annuler: !!M.querySelector('[data-gps-fermer]'), balises: M.querySelectorAll('img, b#injecte').length, focus: document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.gps || document.activeElement.textContent : '' }; });
const enc = encodeURIComponent;
const lignesJour = (S) => S.page.evaluate(() => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).map(b => b.textContent.replace(/\s+/g, ' ').trim()));
const vertDe = (S) => S.page.evaluate(() => { const t = document.createElement('i'); t.style.color = 'var(--vert)'; document.body.appendChild(t); const c = getComputedStyle(t).color; t.remove(); return c; });
/* choisir demain dans la semaine (ou la suivante, un dimanche) : le bouton du jour porte son minuit LOCAL */
const allerDemain = (S) => S.page.evaluate(() => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
  let j = document.querySelector('#sem-jours [data-jour="' + (+d) + '"]');
  if (!j) { document.getElementById('sem-suiv').click(); j = document.querySelector('#sem-jours [data-jour="' + (+d) + '"]'); }
  if (j) j.click(); return !!j; });

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP, nom: 'Alice Martin', actif: true } });
  const ign = await fauxIgn();
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, horloge: true, config: { origines: ['http://127.0.0.1:' + port], reunions: { planificateurMs: 150, bailMs: 2000 }, trajet: { delaiMs: 2000 } },
    env: { OPMSG_TEST_TRAJET: ign.url.replace('http://', '') } });                       // ⛔ le faux IGN par la porte de test
  const C = (label) => ign.CARNET.find(c => c.label === label);
  const LI = C('12 Rue des Lilas 78000 Versailles');
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await ign.fermer(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'alice', MDP);
    const agendaAlice = async () => ((await A0.get('/api/agenda?du=' + (Date.now() - 2 * 86400000) + '&au=' + (Date.now() + 5 * 86400000))).j.evenements || []);
    const J = demain();
    const JOUR_MOTS = new Intl.DateTimeFormat('fr-FR', { timeZone: PARIS, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(instantParis(J + 'T12:00')));
    const JOUR_DIT = new Intl.DateTimeFormat('fr-FR', { timeZone: PARIS, weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(instantParis(J + 'T12:00')));
    const AUJ_CHIFFRES = localParis(Date.now()).slice(0, 10).split('-').reverse().join('/');
    /* une vraie confirmation : la date de RÉSERVATION (aujourd'hui) d'abord — elle ne doit pas compter —, puis le rendez-vous, sa durée, l'adresse sur deux lignes, et la référence témoin */
    const CONF = 'Bonjour,\nRendez-vous réservé le ' + AUJ_CHIFFRES + '.\nVotre rendez-vous avec Dr Sophie Martin (Médecin généraliste) est confirmé.\n' + JOUR_MOTS.charAt(0).toUpperCase() + JOUR_MOTS.slice(1) +
      ' à 14:30\nDurée : 30 min\nCabinet médical\n12 rue des Lilas\n78000 Versailles\nRéférence de réservation : ' + TEMOIN + '\nPensez à apporter votre carte Vitale.';
    const A = await ouvrir(b, svc.base, IPHONE);

    console.log('\n── 1. iPhone : la durée sous « Début » ──');
    vrai('population : l\'iPhone se reconnaît (data-os="ios")', await A.page.evaluate(() => document.documentElement.dataset.os === 'ios'));
    await toucher(A, '#tabs a[data-vue="reunions"]');
    await attendre(A, () => !document.getElementById('vue-reunions').hidden && !!document.getElementById('btn-rdv-nouveau'));
    await toucher(A, '#btn-rdv-nouveau');
    vrai('« Nouveau rendez-vous » s\'ouvre, avec « Durée »', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && !!document.getElementById('ev-duree')));
    v('« Durée » se range JUSTE sous « Début », avant « Fin »', await A.page.evaluate(() => { const d = document.getElementById('ev-debut').closest('.champ'), z = document.getElementById('ev-duree');
      return [d.nextElementSibling === z, !!(z.nextElementSibling && z.nextElementSibling.querySelector('#ev-fin')), document.getElementById('ev-duree-t').textContent]; }), [true, true, 'Durée']);
    const e0 = await duree(A, 'ev');
    v('par défaut une heure : « 1 h » est choisie, « Plus… » au repos', [e0.chips, e0.plus, e0.actif, minutes(e0.debut, e0.fin)], [['30 min', '1 h✓'], 'Plus…', false, 60]);
    const tailles = await A.page.evaluate(() => Array.from(document.querySelectorAll('#ev-duree button, #ev-duree select')).map(x => [Math.round(x.getBoundingClientRect().height), parseFloat(getComputedStyle(x).fontSize)]));
    v('iPhone : 44 px au moins pour chacun des trois, et 16 px pour « Plus… » (Safari zoomerait)', [tailles.length, tailles.every(([h]) => h >= 44), !!tailles[2] && tailles[2][1] >= 16], [3, true, true], tailles);
    await A.page.locator('#ev-titre').fill('Durée QXW');
    await A.page.locator('#ev-debut').fill(J + 'T15:00');
    v('le début posé (15:00) : la fin suit, une heure plus tard', (await duree(A, 'ev')).fin, J + 'T16:00');
    await toucher(A, '#ev-duree [data-duree="30"]');
    const e1 = await duree(A, 'ev');
    v('« 30 min » : la fin à 15:30, « 30 min » choisie — et le doigt garde son bouton (le trio est repeint)', [e1.fin, e1.chips, await A.page.evaluate(() => document.activeElement && document.activeElement.dataset.duree)], [J + 'T15:30', ['30 min✓', '1 h'], '30']);
    v('   le menu « Plus… » propose 1 h 30 à 8 h', await A.page.evaluate(() => Array.from(document.getElementById('ev-duree-plus').options).map(o => o.textContent)), ['Plus…', '1 h 30', '2 h', '2 h 30', '3 h', '4 h', '5 h', '6 h', '8 h']);
    await A.page.locator('#ev-duree-plus').selectOption('120');
    const e2 = await duree(A, 'ev');
    v('« Plus… » → « 2 h » : la fin à 17:00, le menu le dit et s\'allume, les pastilles se taisent', [e2.fin, e2.plus, e2.actif, e2.chips], [J + 'T17:00', '2 h', true, ['30 min', '1 h']]);
    await A.page.locator('#ev-debut').fill(J + 'T15:10');
    v('le début change (15:10) : la fin se déplace d\'autant — les 2 h sont gardées', (await duree(A, 'ev')).fin, J + 'T17:10');
    await A.page.locator('#ev-fin').fill(J + 'T15:55');
    const e3 = await duree(A, 'ev');
    v('la fin tapée à la main (15:55) : le trio dit « 45 min »', [e3.plus, e3.actif, e3.chips], ['45 min', true, ['30 min', '1 h']]);
    await A.page.locator('#ev-debut').fill(J + 'T09:00');
    v('… et un début changé ensuite garde ces 45 min', (await duree(A, 'ev')).fin, J + 'T09:45');
    await capture(A, 'geste-1-duree-iphone');
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('« Enregistrer » : « Rendez-vous ajouté à ton agenda »', await attendre(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /Rendez-vous ajouté/.test(document.getElementById('mot').textContent)));
    const D1 = (await agendaAlice()).find(e => e.titre === 'Durée QXW') || {};
    v('le service a le rendez-vous de demain, 09:00 → 09:45', [D1.debut === instantParis(J + 'T09:00'), (D1.fin - D1.debut) / 60000], [true, 45], D1);

    console.log('\n── 2. iPhone : « Coller une confirmation » (presse-papiers fermé : on colle soi-même) ──');
    await toucher(A, '#btn-rdv-nouveau');
    await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && !!document.getElementById('ev-duree'));
    v('la carte « Coller une confirmation » : fermée, 44 px au moins, au-dessus du titre', await A.page.evaluate(() => { const b = document.querySelector('#info-corps [data-evt="coller"]'); return b ? [b.querySelector('.reglage-texte').firstChild.textContent, b.getAttribute('aria-expanded'),
      document.getElementById('ev-coller-zone').hidden, Math.round(b.getBoundingClientRect().height) >= 44, !!(b.compareDocumentPosition(document.getElementById('ev-titre')) & Node.DOCUMENT_POSITION_FOLLOWING)] : null; }), ['Coller une confirmation', 'false', true, true, true]);
    A.requetes.length = 0;
    await toucher(A, '[data-evt="coller"]');
    vrai('le toucher ouvre la zone ; le presse-papiers refusé, le champ attend le texte (il a le focus)', await attendre(A, () => !document.getElementById('ev-coller-zone').hidden && document.querySelector('[data-evt="coller"]').getAttribute('aria-expanded') === 'true' && document.activeElement && document.activeElement.id === 'ev-coller-texte'));
    v('   le champ fait 16 px (Safari zoomerait), et la zone dit que le texte reste sur l\'appareil', await A.page.evaluate(() => [parseFloat(getComputedStyle(document.getElementById('ev-coller-texte')).fontSize) >= 16, /reste sur ton appareil/.test(document.getElementById('ev-coller-zone').textContent)]), [true, true]);
    const fiche = () => A.page.evaluate(() => ['ev-titre', 'ev-avec', 'ev-debut', 'ev-fin', 'ev-lieu'].map(id => document.getElementById(id).value));
    const avant = await fiche();
    await A.page.locator('#ev-coller-texte').fill('Merci pour votre commande, à bientôt !');
    await toucher(A, '[data-evt="coller-remplir"]');
    vrai('un texte sans date : l\'écran le DIT', await attendre(A, () => /pas trouvé de date/.test(document.getElementById('ev-coller-res').textContent)));
    v('   ⛔ et rien n\'a bougé dans la fiche', await fiche(), avant);
    v('   (population) le lieu est vide, donc pas encore de « Y aller »', [avant[4], await A.page.evaluate(() => !!document.querySelector('#ev-trajet-zone .evt-tr-gestes') && !document.querySelector('#ev-trajet-zone [data-evt="gps"]'))], ['', true]);
    await A.page.locator('#ev-coller-texte').fill(CONF);
    await toucher(A, '[data-evt="coller-remplir"]');
    vrai('« Remplir le rendez-vous » : la fiche se remplit', await attendre(A, () => /^Rempli :/.test(document.getElementById('ev-coller-res').textContent)), await A.page.evaluate(() => document.getElementById('ev-coller-res').textContent));
    v('« Médecin », avec Dr Sophie Martin, demain 14:30 → 15:00 (la durée lue), l\'adresse ENTIÈRE (rue et ville) — ⛔ la date de réservation ignorée', await fiche(),
      ['Médecin', 'Dr Sophie Martin', J + 'T14:30', J + 'T15:00', '12 rue des Lilas, 78000 Versailles']);
    v('   l\'écran dit ce qu\'il a lu, et demande de vérifier', await A.page.evaluate(() => document.getElementById('ev-coller-res').textContent),
      'Rempli : « Médecin » · avec Dr Sophie Martin · ' + JOUR_DIT + ' à 14 h 30 · 30 min · 12 rue des Lilas, 78000 Versailles. Vérifie, puis enregistre.');
    v('   la durée suit : « 30 min » choisie', (await duree(A, 'ev')).chips, ['30 min✓', '1 h']);
    vrai('   « Y aller » paraît (le lieu est là), sans attendre un calcul', await attendre(A, () => !!document.querySelector('#ev-trajet-zone [data-evt="gps"]')));
    await A.page.locator('#ev-lieu').fill('');
    vrai('   ⛔ le lieu vidé : « Y aller » s\'en va (pas de bouton mort)', await attendre(A, () => !document.querySelector('#ev-trajet-zone [data-evt="gps"]')));
    await A.page.locator('#ev-lieu').fill('12 rue des Lilas, 78000 Versailles');
    vrai('   … et revient avec le lieu', await attendre(A, () => !!document.querySelector('#ev-trajet-zone [data-evt="gps"]')));
    await capture(A, 'geste-2-coller-iphone');

    console.log('\n── 3. iPhone : « Y aller » ──');
    await toucher(A, '#ev-trajet-zone [data-evt="gps"]');
    vrai('« Y aller » ouvre la feuille des applications, au-dessus de la fiche', await attendre(A, () => !document.getElementById('menu-fond').hidden && /Y aller/.test(document.getElementById('menu-msg').textContent)));
    await dormir(600);
    const g1 = await feuilleGps(A), q1 = enc('12 rue des Lilas, 78000 Versailles');
    v('iPhone : Plans, Google Maps, Waze — vers l\'adresse écrite, en voiture', g1.liens.map(x => [x.k, x.texte, x.href]), [['plans', 'Plans', 'maps://?daddr=' + q1 + '&dirflg=d'],
      ['google', 'Google Maps', 'https://www.google.com/maps/dir/?api=1&destination=' + q1 + '&travelmode=driving'], ['waze', 'Waze', 'https://waze.com/ul?q=' + q1 + '&navigate=yes']]);
    v('   l\'adresse dite en tête ; 44 px par ligne ; Plans sur place, les pages à part ; « Annuler » ; le focus sur la première', [g1.titre, g1.liens.every(x => x.h >= 44), g1.liens.map(x => x.cible), g1.annuler, g1.focus],
      ['12 rue des Lilas, 78000 Versailles', true, ['', '_blank', '_blank'], true, 'plans']);
    await capture(A, 'geste-3-y-aller-iphone');
    await toucher(A, '#menu-msg [data-gps-fermer]');
    vrai('« Annuler » ferme la feuille ; la fiche est toujours là, remplie', await attendre(A, () => document.getElementById('menu-fond').hidden && document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('ev-titre').value === 'Médecin'));
    await toucher(A, '[data-evt="trajet-calculer"]');
    vrai('« Calculer l\'heure de départ » : « Partir à »', await attendre(A, () => /Partir à/.test((document.getElementById('ev-tr-res') || {}).textContent || ''), null, 12000));
    await toucher(A, '#ev-trajet-zone [data-evt="gps"]');
    await menuOuvert(A);
    const g2 = await feuilleGps(A);
    v('calculé : vers l\'ARRIVÉE TROUVÉE (le libellé de l\'IGN)', [g2.titre, g2.liens.map(x => x.k), g2.liens[1] && g2.liens[1].href], [LI.label, ['plans', 'google', 'waze'], 'https://www.google.com/maps/dir/?api=1&destination=' + enc(LI.label) + '&travelmode=driving']);
    await toucher(A, '#menu-msg [data-gps-fermer]');
    await attendre(A, () => document.getElementById('menu-fond').hidden);
    await toucher(A, '[data-tr-mode="pied"]');
    vrai('à pied : recalculé', await attendre(A, () => document.querySelector('[data-tr-mode="pied"]').getAttribute('aria-pressed') === 'true' && /Partir à/.test((document.getElementById('ev-tr-res') || {}).textContent || ''), null, 12000));
    await toucher(A, '#ev-trajet-zone [data-evt="gps"]');
    await menuOuvert(A);
    const g3 = await feuilleGps(A);
    v('à pied : Plans et Google Maps à pied, ⛔ pas de Waze', [g3.liens.map(x => x.k), g3.liens[0] && /dirflg=w$/.test(g3.liens[0].href), g3.liens[1] && /travelmode=walking$/.test(g3.liens[1].href)], [['plans', 'google'], true, true]);
    await toucher(A, '#menu-msg [data-gps-fermer]');
    await attendre(A, () => document.getElementById('menu-fond').hidden);
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('« Enregistrer » : « Rendez-vous ajouté à ton agenda »', await attendre(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /Rendez-vous ajouté/.test(document.getElementById('mot').textContent)));
    const M1 = (await agendaAlice()).find(e => e.titre === 'Médecin') || {};
    v('le service a le rendez-vous collé : avec qui, le lieu, demain 14:30, 30 min, le trajet à pied', [M1.genre, M1.avec, M1.lieu, M1.debut === instantParis(J + 'T14:30'), (M1.fin - M1.debut) / 60000, M1.trajet && M1.trajet.mode],
      ['rdv', 'Dr Sophie Martin', '12 rue des Lilas, 78000 Versailles', true, 30, 'pied'], M1);
    v('⛔ le texte collé n\'est parti NULLE PART : la référence témoin n\'est dans aucune requête (la population : les requêtes de l\'enregistrement)', [A.requetes.length > 0, A.requetes.filter(r => r.includes(TEMOIN) || r.includes('Vitale')).length], [true, 0], A.requetes.length);
    v('⛔ et rien n\'est sorti de la machine', A.dehors, []);

    console.log('\n── 4. iPhone : l\'appui long, sans ouvrir la fiche ──');
    vrai('population : demain se choisit dans la semaine', await allerDemain(A));
    vrai('la journée de demain porte « Médecin »', await attendre(A, () => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /Médecin/.test(x.textContent))), await lignesJour(A));
    const ligne = A.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'Médecin' }).first();
    v('⛔ la ligne ne sélectionne pas son texte au doigt (iOS couperait l\'appui long pour sélectionner)', await ligne.evaluate(x => [getComputedStyle(x).webkitUserSelect || getComputedStyle(x).userSelect, getComputedStyle(x).userSelect]), ['none', 'none']);
    await appuiLong(A, ligne);
    vrai('l\'appui long ouvre le menu du rendez-vous — ⛔ pas sa fiche', await attendre(A, () => !document.getElementById('menu-fond').hidden && !document.documentElement.classList.contains('feuille-ouverte')));
    await dormir(600);
    const items = () => A.page.evaluate(() => Array.from(document.querySelectorAll('#menu-msg [data-ag-menu]')).map(x => x.textContent.trim()));
    const m1 = await items();
    v('le menu : « Marquer comme fait », « Reporter », « Décaler… » (déplacer), « Y aller »', ['Marquer comme fait', 'Reporter', 'Décaler…', 'Y aller'].map(t => m1.includes(t)), [true, true, true, true], m1);
    await toucher(A, '#menu-msg [data-ag-menu="gps"]');
    const g4 = await feuilleGps(A);
    v('« Y aller » : vers l\'arrivée trouvée, à pied (le trajet du rendez-vous) — Plans, Google Maps ; le focus sur Plans', [g4.titre, g4.liens.map(x => x.k), g4.focus], [LI.label, ['plans', 'google'], 'plans']);
    await toucher(A, '#menu-msg [data-gps-fermer]');
    vrai('« Annuler » : le menu se ferme, la journée est là', await attendre(A, () => document.getElementById('menu-fond').hidden && !document.documentElement.classList.contains('feuille-ouverte')));
    await appuiLong(A, ligne);
    await menuOuvert(A);
    await toucher(A, '#menu-msg [data-ag-menu="fait"]');
    vrai('« Marquer comme fait » : « « Médecin » : fait », sans ouvrir la fiche', await attendre(A, () => /« Médecin » : fait/.test(document.getElementById('mot').textContent) && !document.documentElement.classList.contains('feuille-ouverte')));
    vrai('la ligne : barrée, la coche VERTE devant le titre, « Fait : » pour un lecteur d\'écran', await attendre(A, () => { const x = Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).find(y => /Médecin/.test(y.textContent)); return !!x && x.classList.contains('fait') && !!x.querySelector('.reunion-titre .fait-vert') && /^Fait : Médecin/.test(x.getAttribute('aria-label')); }), await lignesJour(A));
    const vert = await vertDe(A), coche = await A.page.evaluate(() => { const x = Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).find(y => /Médecin/.test(y.textContent)), f = x.querySelector('.fait-vert'), r = f.getBoundingClientRect(); return [getComputedStyle(f).backgroundColor, Math.round(r.width), Math.round(r.height)]; });
    v('   la coche est du VERT de l\'application, ronde, 18 px', coche, [vert, 18, 18]);
    v('   le service : fait (l\'heure où il l\'a été)', Number.isFinite(((await agendaAlice()).find(e => e.titre === 'Médecin') || {}).fait), true);
    await capture(A, 'geste-4-fait-vert-iphone');
    await appuiLong(A, ligne);
    await menuOuvert(A);
    const m2 = await items();
    v('fait : le menu propose « Remettre à faire » (population : le menu est là) — ⛔ et plus « Y aller »', [m2.length >= 3, m2.includes('Remettre à faire'), m2.includes('Y aller')], [true, true, false], m2);
    await toucher(A, '#menu-msg [data-ag-menu="fait"]');
    vrai('« Remettre à faire » : plus de coche verte', await attendre(A, () => { const x = Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).find(y => /Médecin/.test(y.textContent)); return !!x && !x.classList.contains('fait') && !x.querySelector('.fait-vert'); }));
    v('   le service : à faire', ((await agendaAlice()).find(e => e.titre === 'Médecin') || {}).fait, null);

    console.log('\n── 5. Android, presse-papiers permis : la confirmation copiée se lit toute seule ──');
    const N = await ouvrir(b, svc.base, ANDROID, { presse: true });
    vrai('population : l\'Android se reconnaît (data-os="android")', await N.page.evaluate(() => document.documentElement.dataset.os === 'android'));
    const CONF2 = 'GARAGE DUPONT : votre véhicule est attendu le ' + J.split('-').reverse().slice(0, 2).join('/') + ' de 8h30 à 10h. 3 avenue de la Gare 69003 Lyon. Réf ' + TEMOIN + '. Rép STOP au 36111';
    await N.page.evaluate(t => navigator.clipboard.writeText(t), CONF2);
    await toucher(N, '#tabs a[data-vue="reunions"]');
    await attendre(N, () => !document.getElementById('vue-reunions').hidden && !!document.getElementById('btn-rdv-nouveau'));
    await toucher(N, '#btn-rdv-nouveau');
    await attendre(N, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && !!document.querySelector('[data-evt="coller"]'));
    N.requetes.length = 0;
    await toucher(N, '[data-evt="coller"]');
    vrai('un seul toucher : le texte copié est collé ET lu', await attendre(N, () => /^Rempli :/.test(document.getElementById('ev-coller-res').textContent)), await N.page.evaluate(() => document.getElementById('ev-coller-res').textContent));
    v('le SMS du garage : « Garage » pour titre, demain 08:30 → 10:00 (la plage), l\'adresse', await N.page.evaluate(() => ['ev-titre', 'ev-debut', 'ev-fin', 'ev-lieu'].map(id => document.getElementById(id).value)),
      ['Garage', J + 'T08:30', J + 'T10:00', '3 avenue de la Gare 69003 Lyon']);
    v('   la durée lue (1 h 30) : « Plus… » le dit', (await duree(N, 'ev')).plus, '1 h 30');
    await toucher(N, '#ev-trajet-zone [data-evt="gps"]');
    await menuOuvert(N);
    const g5 = await feuilleGps(N);
    v('Android : « Choisir une application » d\'abord (le choix du téléphone : toutes celles qui sont installées), puis Google Maps et Waze — ⛔ pas de Plans', g5.liens.map(x => [x.k, x.texte]), [['autre', 'Choisir une application'], ['google', 'Google Maps'], ['waze', 'Waze']]);
    v('   le choix du téléphone : un lien geo: vers l\'adresse, ouvert sur place', [g5.liens[0].href, g5.liens[0].cible], ['geo:0,0?q=' + enc('3 avenue de la Gare 69003 Lyon'), '']);
    await capture(N, 'geste-5-android');
    await toucher(N, '#menu-msg [data-gps-fermer]');
    v('⛔ le texte copié n\'est parti nulle part ; rien n\'est sorti de la machine', [N.requetes.filter(r => r.includes(TEMOIN)).length, N.dehors], [0, []]);

    console.log('\n── 6. Au bureau, de nuit ──');
    /* « Durée QXW » est fait (par l'iPhone, avant que le bureau s'ouvre — l'agenda d'un appareil se relit à l'ouverture) : vert dans la case de la semaine */
    const pf = await A0.post('/api/agenda/' + D1.id + '/fait', { fait: true });
    vrai('population : « Durée QXW » est fait au service', pf.code === 200 && Number.isFinite(((await agendaAlice()).find(e => e.titre === 'Durée QXW') || {}).fait), pf.code);
    const B = await ouvrir(b, svc.base, BUREAU, { nuit: true });
    await B.page.locator('#nav-side a[data-vue="reunions"]').click();
    await attendre(B, () => !document.getElementById('vue-reunions').hidden);
    /* un événement « toute la journée » n'a pas de durée : le trio se cache, et revient (une heure) quand on décoche */
    await B.page.locator('#btn-evenement-nouveau').click();
    vrai('population : « Nouvel événement » s\'ouvre avec « Toute la journée » et « Durée »', await attendre(B, () => document.getElementById('feuille-titre').textContent === 'Nouvel événement' && !!document.getElementById('ev-journee') && !!document.getElementById('ev-duree')));
    const visible = () => B.page.evaluate(() => { const z = document.getElementById('ev-duree'); return !!z && !z.hidden && z.getClientRects().length > 0; });
    const vu0 = await visible();
    await B.page.locator('#ev-journee').click();
    const vu1 = await visible();
    await B.page.locator('#ev-journee').click();
    v('« Toute la journée » cache la durée ; décochée, elle revient — une heure, la fin suit', [vu0, vu1, await visible(), (await duree(B, 'ev')).chips, minutes((await duree(B, 'ev')).debut, (await duree(B, 'ev')).fin)], [true, false, true, ['30 min', '1 h✓'], 60]);
    await B.page.keyboard.press('Escape');
    await attendre(B, () => !document.documentElement.classList.contains('feuille-ouverte'));
    vrai('population : le sélecteur Perso | Pro de la barre latérale est là', await attendre(B, () => Array.from(document.querySelectorAll('.cote-seg-side [data-cote="pro"]')).some(x => x.getClientRects().length)));
    await B.page.locator('.cote-seg-side [data-cote="pro"]').filter({ visible: true }).first().click();
    await attendre(B, () => document.documentElement.dataset.cote === 'pro' && !document.getElementById('btn-reunion-nouvelle').hidden);
    await B.page.locator('#btn-reunion-nouvelle').click();
    vrai('« Nouvelle réunion » : « Durée » sous « Début »', await attendre(B, () => !!document.getElementById('rf-duree') && document.getElementById('rf-debut').closest('.champ').nextElementSibling === document.getElementById('rf-duree')));
    await B.page.locator('#rf-debut').fill(J + 'T10:00');
    const r0 = await duree(B, 'rf');
    await B.page.locator('#rf-duree [data-duree="30"]').click();
    const r1 = await duree(B, 'rf');
    v('la réunion : le début posé garde sa durée ; « 30 min » met la fin à 10:30', [minutes(r0.debut, r0.fin) > 0, r1.fin, r1.chips], [true, J + 'T10:30', ['30 min✓', '1 h']]);
    await B.page.locator('#rf-duree-plus').selectOption('180');
    v('« Plus… » → « 3 h » : 13:00', [(await duree(B, 'rf')).fin, (await duree(B, 'rf')).plus], [J + 'T13:00', '3 h']);
    await B.page.locator('#rf-debut').fill(J + 'T14:00');
    v('le début de la réunion change (14:00) : la fin suit, 3 h plus tard', (await duree(B, 'rf')).fin, J + 'T17:00');
    await capture(B, 'geste-6-reunion-bureau-nuit');
    await B.page.keyboard.press('Escape');
    await attendre(B, () => !document.documentElement.classList.contains('feuille-ouverte'));
    await B.page.locator('.cote-seg-side [data-cote="perso"]').filter({ visible: true }).first().click();
    await attendre(B, () => document.documentElement.dataset.cote === 'perso');
    await B.page.evaluate(() => document.getElementById('sem-titre').click());
    vrai('la semaine porte les deux rendez-vous de demain', await attendre(B, () => { const t = document.getElementById('sem-grille').textContent; return /Médecin/.test(t) && /Durée QXW/.test(t); }, null, 12000)
      || (await B.page.evaluate(() => { document.getElementById('sem-suiv').click(); return true; }) && await attendre(B, () => { const t = document.getElementById('sem-grille').textContent; return /Médecin/.test(t) && /Durée QXW/.test(t); }, null, 12000)));
    const cases = await B.page.evaluate(() => { const l = Array.from(document.querySelectorAll('#sem-grille [data-ag="e"]')); const de = t => l.find(x => x.textContent.includes(t)); const f = de('Durée QXW'), m = de('Médecin');
      return { fait: f ? [f.classList.contains('fait'), getComputedStyle(f).backgroundColor, getComputedStyle(f).textDecorationLine] : null, afaire: m ? [m.classList.contains('fait'), getComputedStyle(m).backgroundColor] : null }; });
    /* ⛔ une couleur CALCULÉE par color-mix() revient en « color(srgb 0.19 0.82 0.35 / 0.26) » (des flottants 0–1), pas en rgb() : on reconnaît la FORME avant de convertir, et ce qu'on ne
       sait pas lire est rendu tel quel (le contrôle tombe en le montrant) — CLAUDE.md, 22 septembre 2026 */
    const lire = c => { const m = /^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/.exec(c); if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255, m[4] === undefined ? 1 : +m[4]].map(x => Math.round(x * 100) / 100);
      const n = /^rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)$/.exec(c); return n ? [+n[1], +n[2], +n[3], n[4] === undefined ? 1 : +n[4]] : c; };
    const vertB = lire(await vertDe(B)), fond = cases.fait ? lire(cases.fait[1]) : null, fondA = cases.afaire ? lire(cases.afaire[1]) : null;
    const vertAlpha = f => Array.isArray(f) && Array.isArray(vertB) && [0, 1, 2].every(i => Math.abs(f[i] - vertB[i]) <= 3) && f[3] > 0.15 && f[3] < 0.4;
    v('fait : sa case est barrée et TEINTÉE DU VERT de l\'application ; l\'autre (à faire) ne l\'est pas', [cases.fait && cases.fait[0], cases.fait && cases.fait[2], vertAlpha(fond), cases.afaire && cases.afaire[0], vertAlpha(fondA)],
      [true, 'line-through', true, false, false], { fait: fond, afaire: fondA, vert: vertB });
    const puce = B.page.locator('#sem-grille [data-ag="e"]').filter({ hasText: 'Médecin' }).first();
    await puce.click({ button: 'right' });
    await menuOuvert(B);
    const m3 = await B.page.evaluate(() => Array.from(document.querySelectorAll('#menu-msg [data-ag-menu]')).map(x => x.textContent.trim()));
    v('le clic droit : « Y aller » est dans le menu', m3.includes('Y aller'), true, m3);
    await B.page.locator('#menu-msg [data-ag-menu="gps"]').click();
    await dormir(400);
    const g6 = await feuilleGps(B);
    v('au bureau (ni Apple ni Android) : Google Maps seul… à pied (le trajet du rendez-vous), vers l\'arrivée trouvée', [g6.liens.map(x => x.k), g6.titre], [['google'], LI.label]);
    const [onglet] = await Promise.all([B.ctx.waitForEvent('page', { timeout: 9000 }).catch(() => null), B.page.locator('#menu-msg a[data-gps="google"]').click()]);
    if (onglet) await onglet.waitForLoadState().catch(() => {});
    v('« Google Maps » s\'ouvre dans un AUTRE onglet, vers l\'itinéraire à pied — et la page reste là, le menu fermé', [onglet && onglet.url(), await attendre(B, () => document.getElementById('menu-fond').hidden), B.page.url().startsWith(svc.base)],
      ['https://www.google.com/maps/dir/?api=1&destination=' + enc(LI.label) + '&travelmode=walking', true, true]);
    v('   (le faux a répondu : rien n\'est sorti de la machine, et c\'est la seule adresse demandée dehors)', B.dehors, ['https://www.google.com/maps/dir/?api=1&destination=' + enc(LI.label) + '&travelmode=walking']);
    if (onglet) await onglet.close();
    await capture(B, 'geste-7-semaine-bureau-nuit');
    /* ⛔ une arrivée PIÉGÉE : le libellé de l'IGN porte du balisage — « Y aller » le dit en texte */
    await B.page.locator('#btn-rdv-nouveau').click();
    await attendre(B, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && !!document.getElementById('ev-tr-depart'));
    await B.page.locator('#ev-titre').fill('Piège QXW');
    await B.page.locator('#ev-debut').fill(J + 'T18:00');
    await B.page.locator('#ev-lieu').fill('Rue balise');
    await B.page.locator('[data-evt="trajet-calculer"]').click();
    vrai('population : le calcul a trouvé l\'arrivée piégée', await attendre(B, () => /Partir à/.test((document.getElementById('ev-tr-res') || {}).textContent || ''), null, 12000));
    await B.page.locator('#ev-trajet-zone [data-evt="gps"]').click();
    await menuOuvert(B);
    /* ⛔ au bureau, le menu se place sous SON bouton — pas à l'endroit du clic droit d'avant (sur « Médecin », dans la semaine), ni dans le coin de l'écran */
    const pos = await B.page.evaluate(() => { const b = document.querySelector('#ev-trajet-zone [data-evt="gps"]').getBoundingClientRect(), m = document.getElementById('menu-msg').getBoundingClientRect();
      const x = Math.max(8, Math.min(b.left, innerWidth - m.width - 8)), y = Math.max(8, Math.min(b.bottom + 4, innerHeight - m.height - 8));
      return { ecart: [Math.round(Math.abs(m.left - x)), Math.round(Math.abs(m.top - y))], menu: [Math.round(m.left), Math.round(m.top)], bouton: [Math.round(b.left), Math.round(b.bottom)] }; });
    v('⛔ au bureau, « Y aller » ouvert d\'une fiche se place sous son bouton (et non au dernier clic droit)', pos.ecart.every(e => e <= 2), true, pos);
    const g7 = await feuilleGps(B);
    v('⛔ l\'arrivée piégée s\'affiche en TEXTE (aucun élément créé, rien d\'exécuté), et l\'adresse est encodée dans le lien', [g7.balises, await B.page.evaluate(() => window.__xss === undefined), g7.titre.includes('<img'), !!g7.liens[0] && !/[<>" ]/.test(g7.liens[0].href)], [0, true, true, true], g7);
    await B.page.keyboard.press('Escape');

    v('aucune erreur JavaScript', [A.erreurs, N.erreurs, B.erreurs], [[], [], []]);
  } finally { await b.close(); await svc.arreter(); await ign.fermer(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
