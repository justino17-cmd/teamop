/* ══ SONDE — LE TRAJET D'UN RENDEZ-VOUS DANS LA VRAIE PAGE SERVIE : « PARTIR À … » ═══════════════════════════════════════════════════════════════════════════════════════════════
   13 octobre 2026 : « dans rendez-vous il faudrait pouvoir ajouter une adresse que ça calcule le temps de trajet pour dire à la personne à quelle heure il doit partir s'il veut arriver 5 ou 10
   minutes avant » ; « il accepte de donner sa localisation, on demande s'il part bien de là où il est ou ailleurs […] c'est à nous, l'application, de tout bien calculer » ; « sa position, ou
   changer : domicile, travail, ou une adresse ». Joué contre le VRAI service, qui calcule chez un FAUX IGN (la boucle locale) ; le navigateur a une position (La Défense) :
     1. iPhone : la fiche « Nouveau rendez-vous » porte « Trajet » — je pars de (Ma position par défaut), voiture ou à pied, arriver en avance (5 min par défaut) ;
     2. le lieu manque : l'écran le dit ; le lieu écrit, « Calculer » dit « Partir à HH:MM », la durée, d'où, vers où, et propose l'autre adresse trouvée ;
        ⛔ la PAGE n'a parlé qu'au service (aucun tiers) ; l'IGN a reçu la position ARRONDIE ;
     3. arriver 10 min avant : l'heure de partir recule, sans nouveau calcul ; « Plutôt : … » change le lieu et recalcule ; à pied : recalculé ; l'heure du rendez-vous change : « Partir à » suit ;
     4. enregistré : la ligne de l'agenda dit « Partir à » ; le service a rangé le trajet ; la fiche rouverte le reprend ;
     5. ⛔ le lieu change : le trajet part tout de suite, et se recalcule en quittant le champ ;
     6. Domicile, pas encore enregistré : son adresse se tape dans la fiche, s'enregistre, et le trajet part de là ; « Retirer le trajet » le retire au service ;
     7. l'heure de partir arrive : la bannière « Il est temps de partir » ;
     8. Profil › Mes lieux : Domicile (enregistré par la fiche), Travail à enregistrer, « Plutôt : … », Retirer ;
     9. un navigateur qui refuse la position : l'écran le dit, et propose le reste ;
    10. au bureau, de nuit, côté Pro : « Réunion » ET « Rendez-vous » ; un rendez-vous Pro avec son trajet depuis Domicile.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-trajet.js          CAPTURES=/dossier pour les images.
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
const MDP = 'pw-alice-trajet-1234';
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false };
const PARIS = 'Europe/Paris';
const POS = { lon: 2.2384627, lat: 48.8920334 };                                       // La Défense : « ma position »

async function ouvrir(b, base, pf, o) {
  const opts = Object.assign({ nuit: false, position: true }, o || {});
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: opts.nuit ? 'dark' : 'light', reducedMotion: 'reduce',
    locale: 'fr-FR', timezoneId: PARIS, acceptDownloads: true, geolocation: { latitude: POS.lat, longitude: POS.lon, accuracy: 30 }, permissions: opts.position ? ['geolocation'] : [] });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, erreurs: [], requetes: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  page.on('request', r => S.requetes.push(r.url()));
  await page.goto(base + '/');
  await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MDP); await page.locator('#c-entrer').click();
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
  return S;
}
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
async function toucher(S, sel) { const l = S.page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (S.pf.mobile) await l.tap(); else await l.click(); }
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
const localParis = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t)).replace(' ', 'T');
const hmParis = (t) => localParis(t).slice(11, 16);
const demain = () => localParis(Date.now() + 86400000).slice(0, 10);
const instantParis = (local) => { const brut = Date.parse(local + ':00Z'); let t = brut; for (let i = 0; i < 2; i++) t += brut - Date.parse(localParis(t) + ':00Z'); return t; };
const arr = (x) => Math.round(x * 1e4) / 1e4;
/* le texte de la zone « Trajet », et le résultat seul */
const zone = (S) => S.page.evaluate(() => { const z = document.getElementById('ev-trajet-zone'); return z ? z.textContent.replace(/\s+/g, ' ').trim() : null; });
const resultat = (S) => S.page.evaluate(() => { const r = document.getElementById('ev-tr-res'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; });

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP, nom: 'Alice Martin', actif: true } });
  const ign = await fauxIgn();
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, horloge: true, config: { origines: ['http://127.0.0.1:' + port], reunions: { planificateurMs: 150, bailMs: 2000 }, trajet: { base: ign.url, delaiMs: 2000 } } });
  const C = (label) => ign.CARNET.find(c => c.label === label);
  const R4 = C('8 Rue de Rivoli 75004 Paris'), R1 = C('8 Rue de Rivoli 75001 Paris'), TE = C('Tour Eiffel 75007 Paris'), LI = C('12 Rue des Lilas 78000 Versailles'), CP = C('Clinique du Parc 69006 Lyon');
  const minutesDe = (de, vers, mode) => Math.max(1, Math.ceil(ign.dureeMinutes({ lon: arr(de.lon), lat: arr(de.lat) }, { lon: arr(vers.lon), lat: arr(vers.lat) }, mode === 'pied' ? 'pedestrian' : 'car')));
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await ign.fermer(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'alice', MDP);
    const agendaAlice = async () => ((await A0.get('/api/agenda?du=' + (Date.now() - 2 * 86400000) + '&au=' + (Date.now() + 5 * 86400000))).j.evenements || []);
    const A = await ouvrir(b, svc.base, IPHONE);

    console.log('\n── 1. iPhone : « Nouveau rendez-vous » porte « Trajet » ──');
    await toucher(A, '#tabs a[data-vue="reunions"]');
    await attendre(A, () => !document.getElementById('vue-reunions').hidden && !!document.getElementById('btn-rdv-nouveau'));
    await toucher(A, '#btn-rdv-nouveau');
    vrai('la feuille « Nouveau rendez-vous » s\'ouvre, et la zone « Trajet » paraît (le service a dit qu\'il calcule)', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && !!document.getElementById('ev-tr-depart')));
    const init = await A.page.evaluate(() => ({ depart: document.getElementById('ev-tr-depart').value, options: Array.from(document.getElementById('ev-tr-depart').options).map(o => o.value + ':' + o.textContent),
      mode: Array.from(document.querySelectorAll('[data-tr-mode]')).map(x => x.dataset.trMode + (x.getAttribute('aria-pressed') === 'true' ? '✓' : '')), avance: document.getElementById('ev-tr-avance').value,
      bouton: (document.querySelector('[data-evt="trajet-calculer"]') || {}).textContent, note: /ni gardée, ni montrée à personne/.test(document.getElementById('ev-trajet-zone').textContent),
      lieuApres: document.getElementById('ev-lieu').compareDocumentPosition(document.getElementById('ev-trajet-zone')) === Node.DOCUMENT_POSITION_FOLLOWING, place: document.getElementById('ev-lieu').placeholder }));
    v('« Je pars de » : Ma position par défaut, puis Domicile et Travail (à enregistrer), ou une autre adresse ; voiture ; arriver 5 min avant ; « Calculer l\'heure de départ »', [init.depart, init.options, init.mode, init.avance, init.bouton],
      ['position', ['position:Ma position', 'domicile:Domicile (à enregistrer)', 'travail:Travail (à enregistrer)', 'adresse:Une autre adresse'], ['voiture✓', 'pied'], '5', 'Calculer l\'heure de départ']);
    v('   la position est dite pour ce qu\'elle est (ni gardée, ni montrée) ; la zone suit le lieu, qui dit à quoi il sert', [init.note, init.lieuApres, init.place], [true, true, 'Adresse — pour savoir quand partir']);
    const tailles = await A.page.evaluate(() => Array.from(document.querySelectorAll('#ev-trajet-zone button, #ev-trajet-zone select')).filter(x => x.getClientRects().length).map(x => Math.round(x.getBoundingClientRect().height)));
    v('iPhone : chaque commande du trajet fait 44 px au moins (population : le choix du départ, voiture, à pied, l\'avance, « Calculer »)', [tailles.length, tailles.every(h => h >= 44)], [5, true], tailles);

    console.log('\n── 2. Le lieu manque, puis « Partir à » ──');
    let n = ign.etat.appels.length;
    await toucher(A, '[data-evt="trajet-calculer"]');
    vrai('sans lieu : l\'écran le DIT (« Écris d\'abord le lieu du rendez-vous »), et rien ne part', await attendre(A, () => /Écris d'abord le lieu du rendez-vous/.test(document.getElementById('ev-trajet-zone').textContent)));
    v('   (rien chez l\'IGN)', ign.etat.appels.length - n, 0);
    await A.page.locator('#ev-titre').fill('Kiné QXT'); await A.page.locator('#ev-avec').fill('Mme Roux');
    const D0 = demain() + 'T14:00';
    await A.page.locator('#ev-debut').fill(D0); await A.page.locator('#ev-fin').fill(demain() + 'T14:45');
    await A.page.locator('#ev-lieu').fill('8 rue de Rivoli');
    for (const x of ['1440', '60']) await toucher(A, '#ev-rappels [data-evt-rappel="' + x + '"]');          // aucun rappel : seul le départ sonnera
    A.requetes.length = 0; n = ign.etat.appels.length;
    await toucher(A, '[data-evt="trajet-calculer"]');
    const m1 = minutesDe(POS, R4, 'voiture');
    vrai('« Partir à » paraît', await attendre(A, () => /Partir à/.test((document.getElementById('ev-tr-res') || {}).textContent || '')), await zone(A));
    const r1 = await resultat(A);
    v('   l\'heure de partir (14:00 − ' + m1 + ' min de trajet − 5 min d\'avance), la durée, d\'où, vers où, l\'autre adresse possible', [
      r1.includes('Partir à ' + hmParis(instantParis(D0) - (m1 + 5) * 60000)), r1.includes(m1 + ' min en voiture'), r1.includes('— depuis Ma position'), r1.includes('Pour arriver à 13:55, 5 min avant le rendez-vous.'),
      r1.includes('Vers ' + R4.label), r1.includes('Pas le bon endroit ? Plutôt :') && r1.includes(R1.label), r1.includes('Une notification te dira quand partir')], [true, true, true, true, true, true, true], r1);
    vrai('   population : un vrai trajet (plus de dix minutes)', m1 > 10, m1);
    v('⛔ la PAGE n\'a parlé qu\'au service (aucun tiers) — et à lui une fois, pour le calcul', [A.requetes.filter(u => !u.startsWith(svc.base) && !/^(data|blob):/.test(u)), A.requetes.filter(u => u.endsWith('/api/trajet')).length], [[], 1]);
    const ap = ign.etat.appels.slice(n);
    v('⛔ chez l\'IGN : le lieu tel que tapé, puis la position ARRONDIE à 4 décimales (une dizaine de mètres)', [ap.map(x => x.chemin), ap[0] && ap[0].params.q, ap[1] && ap[1].params.start], [['/geocodage/search', '/navigation/itineraire'], '8 rue de Rivoli', arr(POS.lon) + ',' + arr(POS.lat)]);
    await capture(A, 'trajet-1-partir-iphone');

    console.log('\n── 3. Arriver plus tôt, une autre adresse, à pied, une autre heure ──');
    n = ign.etat.appels.length;
    await A.page.locator('#ev-tr-avance').selectOption('10');
    vrai('arriver 10 min avant : l\'heure de partir RECULE de cinq minutes', await attendre(A, (t) => ((document.getElementById('ev-tr-res') || {}).textContent || '').includes('Partir à ' + t) && ((document.getElementById('ev-tr-res') || {}).textContent || '').includes('Pour arriver à 13:50'), hmParis(instantParis(D0) - (m1 + 10) * 60000)), await resultat(A));
    v('   sans nouveau calcul (rien chez l\'IGN)', ign.etat.appels.length - n, 0);
    await toucher(A, '[data-evt="trajet-autre"]');
    const m2 = minutesDe(POS, R1, 'voiture');
    vrai('« Plutôt : 8 Rue de Rivoli 75001 Paris » : le lieu devient cette adresse, et le trajet se recalcule vers elle', await attendre(A, (l) => document.getElementById('ev-lieu').value === l && ((document.getElementById('ev-tr-res') || {}).textContent || '').includes('Vers ' + l), R1.label), await resultat(A));
    v('   sa durée', (await resultat(A)).includes(m2 + ' min en voiture'), true);
    await toucher(A, '[data-tr-mode="pied"]');
    const m3 = minutesDe(POS, R1, 'pied');
    vrai('à pied : recalculé, la durée à pied (bien plus longue)', await attendre(A, (m) => ((document.getElementById('ev-tr-res') || {}).textContent || '').includes(m + ' min à pied') || ((document.getElementById('ev-tr-res') || {}).textContent || '').includes(' h ') && /à pied/.test(document.getElementById('ev-tr-res').textContent), m3), await resultat(A));
    v('   « À pied » est pressé, « Voiture » ne l\'est plus', await A.page.evaluate(() => Array.from(document.querySelectorAll('[data-tr-mode]')).map(x => x.getAttribute('aria-pressed'))), ['false', 'true']);
    const D1 = demain() + 'T16:30';
    await A.page.locator('#ev-debut').fill(D1); await A.page.locator('#ev-fin').fill(demain() + 'T17:15');
    vrai('l\'heure du rendez-vous change (16:30) : « Partir à » suit', await attendre(A, (t) => ((document.getElementById('ev-tr-res') || {}).textContent || '').includes('Partir à ' + t), hmParis(instantParis(D1) - (m3 + 10) * 60000)), await resultat(A));
    await capture(A, 'trajet-2-a-pied-iphone');

    console.log('\n── 4. Enregistré : « Partir à » dans l\'agenda, la fiche le reprend ──');
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('« Rendez-vous ajouté à ton agenda »', await attendre(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /Rendez-vous ajouté à ton agenda/.test(document.getElementById('mot').textContent)));
    const K = (await agendaAlice()).find(e => e.titre === 'Kiné QXT') || {};
    v('le service a rangé le trajet : la durée à pied, l\'avance, d\'où, vers où', K.trajet, { minutes: m3, km: Math.round(ign.distanceKm({ lon: arr(POS.lon), lat: arr(POS.lat) }, { lon: arr(R1.lon), lat: arr(R1.lat) }) * 1.3 * 10) / 10, mode: 'pied', avance: 10, depart: 'position', depart_label: 'Ma position', vers_label: R1.label });
    v('   et le départ est l\'échéance qui attend (aucun rappel coché)', [K.rappels, K.rappelEnAttente], [[], true]);
    /* demain, dans la semaine affichée (ou la suivante, un dimanche) : le bouton du jour porte son minuit LOCAL */
    vrai('population : le jour de demain se choisit dans la semaine', await A.page.evaluate(() => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
      let j = document.querySelector('#sem-jours [data-jour="' + (+d) + '"]');
      if (!j) { document.getElementById('sem-suiv').click(); j = document.querySelector('#sem-jours [data-jour="' + (+d) + '"]'); }
      if (j) j.click(); return !!j; }));
    vrai('la ligne de demain dit « Partir à HH:MM »', await attendre(A, (t) => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /Kiné QXT/.test(x.textContent) && x.textContent.includes('Partir à ' + t)), hmParis(instantParis(D1) - (m3 + 10) * 60000)),
      await A.page.evaluate(() => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).map(x => x.textContent.replace(/\s+/g, ' ').trim())));
    await A.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'Kiné QXT' }).first().tap();
    vrai('la fiche rouverte reprend le trajet : « Partir à », à pied, 10 min, depuis Ma position', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Rendez-vous' && /Partir à/.test((document.getElementById('ev-tr-res') || {}).textContent || '')
      && document.getElementById('ev-tr-avance') && document.getElementById('ev-tr-avance').value === '10' && document.querySelector('[data-tr-mode="pied"]').getAttribute('aria-pressed') === 'true' && document.getElementById('ev-tr-depart').value === 'position'), await zone(A));
    v('   « Recalculer » et « Retirer le trajet »', await A.page.evaluate(() => [(document.querySelector('[data-evt="trajet-calculer"]') || {}).textContent, !!document.querySelector('[data-evt="trajet-retirer"]')]), ['Recalculer', true]);

    console.log('\n── 5. ⛔ Le lieu change : le trajet part, puis se recalcule ──');
    await A.page.locator('#ev-lieu').fill('Tour Eiffel');
    vrai('dès la frappe : plus de « Partir à », et l\'écran dit pourquoi (« Le lieu a changé »)', await attendre(A, () => !document.getElementById('ev-tr-res') && /Le lieu a changé/.test(document.getElementById('ev-trajet-zone').textContent)), await zone(A));
    await A.page.locator('#ev-lieu').blur();
    const m4 = minutesDe(POS, TE, 'pied');
    vrai('en quittant le champ : recalculé vers la tour Eiffel', await attendre(A, () => ((document.getElementById('ev-tr-res') || {}).textContent || '').includes('Vers Tour Eiffel 75007 Paris')), await zone(A));
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('« Rendez-vous modifié »', await attendre(A, () => /Rendez-vous modifié/.test(document.getElementById('mot').textContent)));
    v('le service : le lieu et SON trajet', ((await agendaAlice()).filter(e => e.titre === 'Kiné QXT').map(e => [e.lieu, e.trajet && e.trajet.vers_label, e.trajet && e.trajet.minutes])), [['Tour Eiffel', TE.label, m4]]);
    /* ⛔ le lieu changé, puis « Enregistrer » AUSSITÔT : quitter le champ lance le recalcul, l'enregistrement l'attend (sinon le rendez-vous partait sans trajet) */
    await A.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'Kiné QXT' }).first().tap();
    await attendre(A, () => /Partir à/.test((document.getElementById('ev-tr-res') || {}).textContent || ''));
    await A.page.locator('#ev-lieu').fill('8 rue de Rivoli');
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('lieu changé puis « Enregistrer » tout de suite : « Rendez-vous modifié »', await attendre(A, () => /Rendez-vous modifié/.test(document.getElementById('mot').textContent) && !document.documentElement.classList.contains('feuille-ouverte')));
    v('   ⛔ le service a le NOUVEAU lieu et le trajet recalculé vers lui (l\'enregistrement a attendu le calcul)', ((await agendaAlice()).filter(e => e.titre === 'Kiné QXT').map(e => [e.lieu, e.trajet && e.trajet.vers_label, e.trajet && e.trajet.minutes])),
      [['8 rue de Rivoli', R4.label, minutesDe(POS, R4, 'pied')]]);
    await A.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'Kiné QXT' }).first().tap();
    await attendre(A, () => /Partir à/.test((document.getElementById('ev-tr-res') || {}).textContent || ''));
    await A.page.locator('#ev-lieu').fill('Tour Eiffel'); await A.page.locator('#ev-lieu').blur();
    await attendre(A, () => ((document.getElementById('ev-tr-res') || {}).textContent || '').includes('Vers Tour Eiffel 75007 Paris'));
    await toucher(A, '[data-evt="enregistrer"]');
    await attendre(A, () => /Rendez-vous modifié/.test(document.getElementById('mot').textContent) && !document.documentElement.classList.contains('feuille-ouverte'));
    v('   (remis vers la tour Eiffel pour la suite)', ((await agendaAlice()).filter(e => e.titre === 'Kiné QXT').map(e => e.lieu)), ['Tour Eiffel']);

    console.log('\n── 6. Domicile, enregistré depuis la fiche ; « Retirer le trajet » ──');
    await A.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'Kiné QXT' }).first().tap();
    await attendre(A, () => !!document.getElementById('ev-tr-depart'));
    await A.page.locator('#ev-tr-depart').selectOption('domicile');
    vrai('Domicile n\'est pas encore enregistré : le champ « Adresse de ton domicile » paraît, et dit qu\'elle sera gardée', await attendre(A, () => !!document.getElementById('ev-tr-adresse') && /Adresse de ton domicile/.test(document.getElementById('ev-trajet-zone').textContent) && /gardée pour la prochaine fois/.test(document.getElementById('ev-trajet-zone').textContent)), await zone(A));
    vrai('   ⛔ et le trajet d\'avant (depuis Ma position) est retiré : il ne part pas de là', await attendre(A, () => !document.getElementById('ev-tr-res')));
    await toucher(A, '[data-evt="trajet-calculer"]');
    vrai('« Calculer » sans adresse : l\'écran la demande', await attendre(A, () => /Écris l'adresse de ton domicile/.test(document.getElementById('ev-trajet-zone').textContent)));
    await A.page.locator('#ev-tr-adresse').fill('12 rue des Lilas, Versailles');
    await toucher(A, '[data-evt="trajet-calculer"]');
    const m5 = minutesDe(LI, TE, 'pied');
    vrai('le domicile s\'enregistre (« Domicile enregistré »), et le trajet part de là', await attendre(A, () => ((document.getElementById('ev-tr-res') || {}).textContent || '').includes('depuis Domicile')), await zone(A));
    v('   sa durée (Versailles → la tour Eiffel, à pied), et le service a rangé le domicile — sans que la page en voie le point', [(await resultat(A)).includes(minutesDe(LI, TE, 'pied') >= 60 ? 'à pied' : m5 + ' min à pied'), (await A0.get('/api/moi/lieux')).j.lieux],
      [true, { domicile: { label: LI.label }, travail: null }]);
    v('   le choix « Domicile » dit maintenant son adresse', await A.page.evaluate(() => Array.from(document.getElementById('ev-tr-depart').options).find(o => o.value === 'domicile').textContent), 'Domicile — ' + LI.label);
    await toucher(A, '[data-evt="trajet-retirer"]');
    vrai('« Retirer le trajet » : plus de « Partir à » (« Trajet retiré »)', await attendre(A, () => !document.getElementById('ev-tr-res') && /Trajet retiré/.test(document.getElementById('mot').textContent)));
    await toucher(A, '[data-evt="enregistrer"]');
    await attendre(A, () => /Rendez-vous modifié/.test(document.getElementById('mot').textContent));
    v('le service : plus de trajet (le lieu reste)', ((await agendaAlice()).filter(e => e.titre === 'Kiné QXT').map(e => [e.lieu, e.trajet])), [['Tour Eiffel', null]]);
    vrai('   la ligne ne dit plus « Partir à »', await attendre(A, () => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /Kiné QXT/.test(x.textContent) && !/Partir à/.test(x.textContent))));

    console.log('\n── 7. L\'heure de partir arrive : « Il est temps de partir » ──');
    const debut = Math.ceil((Date.now() + 60 * 60000) / 60000) * 60000;
    await toucher(A, '#btn-rdv-nouveau');
    await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && !!document.getElementById('ev-tr-depart'));
    await A.page.locator('#ev-titre').fill('Banque QXT');
    await A.page.locator('#ev-debut').fill(localParis(debut)); await A.page.locator('#ev-fin').fill(localParis(debut + 1800000));
    await A.page.locator('#ev-lieu').fill('Tour Eiffel');
    for (const x of ['1440', '60']) await toucher(A, '#ev-rappels [data-evt-rappel="' + x + '"]');
    await toucher(A, '[data-evt="trajet-calculer"]');
    await attendre(A, () => /Partir à/.test((document.getElementById('ev-tr-res') || {}).textContent || ''));
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('population : « Banque QXT » est enregistré, son départ attend', await attendre(A, () => /Rendez-vous ajouté/.test(document.getElementById('mot').textContent)) && ((await agendaAlice()).find(e => e.titre === 'Banque QXT') || {}).rappelEnAttente === true);
    const mB = minutesDe(POS, TE, 'voiture');
    svc.avancer((60 - mB - 5 + 1) * 60000);
    vrai('le service avance jusqu\'à l\'heure de partir : la bannière arrive (« Il est temps de partir · ' + mB + ' min en voiture, arrivée HH:MM »)', await attendre(A, (t) => { const x = document.getElementById('notif'); return x.classList.contains('on') && /Banque QXT/.test(x.textContent) && x.textContent.includes(t); }, 'Il est temps de partir · ' + mB + ' min en voiture, arrivée ' + hmParis(debut - 5 * 60000), 12000),
      await A.page.evaluate(() => document.getElementById('notif').textContent));
    await capture(A, 'trajet-3-partir-banniere-iphone');

    console.log('\n── 8. Profil › Mes lieux ──');
    await A.page.evaluate(() => { location.hash = '#reglages'; });
    vrai('la ligne « Mes lieux » est au Profil, et dit ce qui est enregistré (« Domicile »)', await attendre(A, () => { const b = document.querySelector('[data-reg-sec="lieux"]'); return !!b && /Mes lieux/.test(b.textContent) && document.getElementById('reg-v-lieux').textContent === 'Domicile'; }));
    await toucher(A, '[data-reg-sec="lieux"]');
    vrai('la rubrique s\'ouvre : Domicile (son adresse), Travail (« Pas encore enregistré »)', await attendre(A, (l) => { const c = document.getElementById('reg-lieux'); return !!c && c.getClientRects().length > 0 && c.textContent.includes(l) && /Pas encore enregistré/.test(c.textContent); }, LI.label));
    vrai('   elle dit à quoi ils servent, et ce qui part chez l\'IGN', await A.page.evaluate(() => /chiffrés/.test(document.getElementById('reg-sec-lieux').textContent) && /IGN/.test(document.getElementById('reg-sec-lieux').textContent)));
    await toucher(A, '[data-lieu-edit="travail"]');
    await attendre(A, () => !!document.getElementById('reg-lieu-travail'));
    await A.page.locator('#reg-lieu-travail').fill('8 rue de Rivoli');
    await toucher(A, '[data-lieu-ok="travail"]');
    vrai('« Enregistrer » : « Travail enregistré », l\'adresse trouvée, et l\'autre possible (« Plutôt : … »)', await attendre(A, (a) => /Travail enregistré/.test(document.getElementById('mot').textContent) && document.getElementById('reg-lieux').textContent.includes(a[0]) && !!document.querySelector('[data-lieu-choix="travail"]'), [R4.label]));
    await toucher(A, '[data-lieu-choix="travail"]');
    vrai('« Plutôt : 8 Rue de Rivoli 75001 Paris » : c\'est elle qui est gardée', await attendre(A, (a) => document.getElementById('reg-lieux').textContent.includes(a) && !document.getElementById('reg-lieux').textContent.includes('75004'), R1.label));
    v('   le service aussi', (await A0.get('/api/moi/lieux')).j.lieux.travail, { label: R1.label });
    await toucher(A, '[data-lieu-edit="travail"]');
    await attendre(A, () => !!document.querySelector('[data-lieu-retirer="travail"]'));
    await toucher(A, '[data-lieu-retirer="travail"]');
    vrai('« Retirer » : « Travail retiré », de nouveau « Pas encore enregistré »', await attendre(A, () => /Travail retiré/.test(document.getElementById('mot').textContent) && /Pas encore enregistré/.test(document.getElementById('reg-lieux').textContent)));
    v('   le service : plus de travail, le domicile reste', (await A0.get('/api/moi/lieux')).j.lieux, { domicile: { label: LI.label }, travail: null });
    await toucher(A, '[data-lieu-edit="travail"]');
    await attendre(A, () => !!document.getElementById('reg-lieu-travail'));
    await A.page.locator('#reg-lieu-travail').fill('Rue introuvable');
    await A.page.locator('#reg-lieu-travail').press('Enter');
    vrai('une adresse introuvable : l\'écran le dit (« L\'adresse de ton travail est introuvable »)', await attendre(A, () => /L'adresse de ton travail est introuvable/.test(document.getElementById('reg-erreur').textContent) && !document.getElementById('reg-erreur').hidden),
      await A.page.evaluate(() => document.getElementById('reg-erreur').textContent));
    await capture(A, 'trajet-4-mes-lieux-iphone');

    console.log('\n── 9. Un navigateur qui refuse la position ──');
    const N = await ouvrir(b, svc.base, IPHONE, { position: false });
    await toucher(N, '#tabs a[data-vue="reunions"]');
    await attendre(N, () => !document.getElementById('vue-reunions').hidden && !!document.getElementById('btn-rdv-nouveau'));
    await toucher(N, '#btn-rdv-nouveau');
    await attendre(N, () => !!document.getElementById('ev-tr-depart'));
    await N.page.locator('#ev-titre').fill('Poste QXT'); await N.page.locator('#ev-lieu').fill('Tour Eiffel');
    n = ign.etat.appels.length;
    await toucher(N, '[data-evt="trajet-calculer"]');
    vrai('« Ma position » refusée : l\'écran le dit, et propose Domicile, Travail ou une adresse', await attendre(N, () => /refuse de donner ta position/.test(document.getElementById('ev-trajet-zone').textContent) && /Domicile, Travail ou une adresse/.test(document.getElementById('ev-trajet-zone').textContent)),
      await zone(N));
    v('   ⛔ et rien n\'est parti (ni chez le service, ni chez l\'IGN)', [N.requetes.filter(u => u.endsWith('/api/trajet')).length, ign.etat.appels.length - n], [0, 0]);
    await N.page.locator('#ev-tr-depart').selectOption('domicile');
    vrai('   Domicile (déjà enregistré) : recalculé de là — le refus de la position n\'empêche rien', await attendre(N, () => /depuis Domicile/.test((document.getElementById('ev-tr-res') || {}).textContent || '') || false, null, 4000) || await (async () => { await toucher(N, '[data-evt="trajet-calculer"]'); return attendre(N, () => /depuis Domicile/.test((document.getElementById('ev-tr-res') || {}).textContent || '')); })(), await zone(N));

    console.log('\n── 10. Au bureau, de nuit, côté Pro : « Réunion » ET « Rendez-vous » ──');
    const B = await ouvrir(b, svc.base, BUREAU, { nuit: true });
    await toucher(B, '#nav-side a[data-vue="reunions"]');
    await attendre(B, () => !document.getElementById('vue-reunions').hidden);
    vrai('population : le sélecteur Perso | Pro de la barre latérale est là', await attendre(B, () => Array.from(document.querySelectorAll('.cote-seg-side [data-cote="pro"]')).some(x => x.getClientRects().length)));
    await toucher(B, '.cote-seg-side [data-cote="pro"]');
    vrai('côté Pro : la barre propose « Événement », « Réunion » ET « Rendez-vous », sur une rangée, au même écart', await attendre(B, () => { const vu = (id) => { const x = document.getElementById(id); return !!x && !x.hidden && x.getClientRects().length > 0; };
      const r = document.getElementById('btn-reunion-nouvelle').getBoundingClientRect(), d = document.getElementById('btn-rdv-nouveau').getBoundingClientRect(), ev = document.getElementById('btn-evenement-nouveau').getBoundingClientRect();
      return document.documentElement.dataset.cote === 'pro' && vu('btn-reunion-nouvelle') && vu('btn-rdv-nouveau') && r.left > ev.right && d.left > r.right && Math.abs(r.top - d.top) < 2 && Math.abs(ev.top - r.top) < 2
        && Math.abs((r.left - ev.right) - (d.left - r.right)) <= 1; }),
      null);
    console.log('      (en-tête : ' + await B.page.evaluate(() => ['btn-evenement-nouveau', 'btn-reunion-nouvelle', 'btn-rdv-nouveau'].map(id => { const x = document.getElementById(id); if (!x) return id + ' absent'; const r = x.getBoundingClientRect(); return id + (x.hidden ? ' caché ' : ' ') + Math.round(r.left) + '→' + Math.round(r.right) + ' @' + Math.round(r.top); }).join(' | ')) + ')');
    await toucher(B, '#btn-rdv-nouveau');
    await attendre(B, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && !!document.getElementById('ev-tr-depart'));
    await B.page.locator('#ev-titre').fill('Client QXT'); await B.page.locator('#ev-avec').fill('M. Garnier');
    await B.page.locator('#ev-debut').fill(demain() + 'T10:00'); await B.page.locator('#ev-fin').fill(demain() + 'T11:00');
    await B.page.locator('#ev-lieu').fill('Clinique du Parc, Lyon');
    await B.page.locator('#ev-tr-depart').selectOption('domicile');
    await toucher(B, '[data-evt="trajet-calculer"]');
    const mP = minutesDe(LI, CP, 'voiture');
    vrai('depuis Domicile (Versailles → Lyon, en voiture) : « Partir à »', await attendre(B, () => /Partir à/.test((document.getElementById('ev-tr-res') || {}).textContent || '') && /depuis Domicile/.test(document.getElementById('ev-tr-res').textContent)), await zone(B));
    v('   une longue route se dit en heures (« ' + Math.floor(mP / 60) + ' h … en voiture »)', (await resultat(B)).includes(Math.floor(mP / 60) + ' h ' + String(mP % 60).padStart(2, '0') + ' en voiture') || (await resultat(B)).includes(Math.floor(mP / 60) + ' h en voiture'), true);
    await capture(B, 'trajet-5-pro-bureau-nuit');
    await toucher(B, '[data-evt="enregistrer"]');
    vrai('« Rendez-vous ajouté à ton agenda »', await attendre(B, () => /Rendez-vous ajouté/.test(document.getElementById('mot').textContent)));
    v('le service : un rendez-vous PRO, avec son trajet depuis Domicile', ((await agendaAlice()).filter(e => e.titre === 'Client QXT').map(e => [e.genre, e.cote, e.trajet && e.trajet.depart, e.trajet && e.trajet.minutes, e.trajet && e.trajet.vers_label])), [['rdv', 'pro', 'domicile', mP, CP.label]]);
    v('⛔ aucune page n\'a parlé à un tiers', [A, N, B].map(S => S.requetes.filter(u => !u.startsWith(svc.base) && !/^(data|blob):/.test(u))), [[], [], []]);
    v('aucune erreur JavaScript', [A.erreurs, N.erreurs, B.erreurs], [[], [], []]);
  } finally { await b.close(); await svc.arreter(); await ign.fermer(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
