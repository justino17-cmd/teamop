/* ══ SONDE — LE RENDEZ-VOUS PERSONNEL DANS LA VRAIE PAGE SERVIE : « RENDEZ-VOUS » À LA PLACE DE « RÉUNION » CÔTÉ PERSO, AVEC QUI, PLUSIEURS RAPPELS ══════
   13 octobre 2026 : « dans Perso, à la place de réunion tu mets rendez-vous, comme ça les personnes peuvent gérer leurs rendez-vous personnels avec des rappels et tout ». Le 15 octobre,
   « Ajouter à mon calendrier » a quitté la fiche (Justin : « l'application fait déjà agenda » — sonde-opmessages-agenda-geste.js joue ce qui le remplace : coller une confirmation).
   Joué contre le VRAI service (la bêta ouvre tout : Alice a les deux côtés), horloge avancée au geste :
     1. iPhone, côté Perso : l'en-tête de l'Agenda propose « Événement » et « Rendez-vous » — « Réunion » y est caché ;
     2. « Rendez-vous » ouvre « Nouveau rendez-vous » : titre, « Avec », une heure (jamais « toute la journée »), les rappels en cases — la veille et 1 h avant cochés —, trois au plus ;
     3. enregistré, il paraît dans la journée : « Rendez-vous avec … », le lieu, ses rappels ; ⛔ sa fiche ne propose plus « Ajouter à mon calendrier » ;
     4. modifié (un rappel décoché), le service retient la nouvelle liste ;
     5. le rappel arrive dans la page et dit avec qui ;
     6. au bureau, de nuit : la fiche non plus ; côté Pro, l'en-tête propose « Réunion » ET « Rendez-vous » (le trajet, 13 octobre 2026 : « pareil pour pro »).
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-rendez-vous.js          CAPTURES=/dossier pour les images.
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const MDP = 'pw-alice-rdv-1234';
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false };
const PARIS = 'Europe/Paris';

async function ouvrir(b, base, pf, nuit) {
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: nuit ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS, acceptDownloads: true });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, erreurs: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  await page.goto(base + '/');
  await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MDP); await page.locator('#c-entrer').click();
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
  return S;
}
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
async function toucher(S, sel) { const l = S.page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (S.pf.mobile) await l.tap(); else await l.click(); }

/* (15 octobre 2026, « plus simple ») l'Agenda n'a plus qu'un « + » : il propose Rendez-vous, Événement, et Réunion côté Pro. On le touche, puis le choix — avec un seul choix,
   le « + » y va tout droit. `choixAgenda` lit ce que le « + » propose (et referme le menu). */
async function creerAgenda(S, quoi) {
  await toucher(S, '#btn-agenda-plus');
  await S.page.waitForFunction(() => { const d = document.getElementById('deroule'); return (d && !d.hidden) || !!document.querySelector('#feuille:not([hidden]), .feuille:not([hidden])'); }, null, { timeout: 8000 }).catch(() => {});
  if (await S.page.evaluate(() => { const d = document.getElementById('deroule'); return !!d && !d.hidden; })) await toucher(S, '#deroule-liste [data-valeur="' + quoi + '"]');
}
async function choixAgenda(S) {
  await toucher(S, '#btn-agenda-plus');
  const ouvert = await S.page.waitForFunction(() => { const d = document.getElementById('deroule'); return !!d && !d.hidden; }, null, { timeout: 8000 }).then(() => true, () => false);
  if (!ouvert) return null;
  const l = await S.page.evaluate(() => Array.from(document.querySelectorAll('#deroule-liste .deroule-choix')).map(b => b.textContent.trim()));
  await S.page.keyboard.press('Escape');
  await S.page.waitForFunction(() => document.getElementById('deroule').hidden, null, { timeout: 8000 }).catch(() => {});
  return l;
}
const lignes = (S) => S.page.evaluate(() => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).map(b => b.textContent.replace(/\s+/g, ' ').trim()));
const cases = (S) => S.page.evaluate(() => Array.from(document.querySelectorAll('#ev-rappels [data-evt-rappel]')).map(x => x.dataset.evtRappel + (x.getAttribute('aria-checked') === 'true' ? '✓' : '')));
/* les deux boutons de l'en-tête : [« Rendez-vous » visible, « Réunion » présent, « Réunion » visible] */
const entete = (S) => choixAgenda(S);      // ce que propose le « + » de l'Agenda (15 octobre 2026 : un seul « + »)
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
const localParis = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t)).replace(' ', 'T');
const aujourdhui = () => localParis(Date.now()).slice(0, 10);

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP, nom: 'Alice Martin', actif: true } });
  const port = await T.portLibre();
  /* `trajet: false` : le calcul du trajet FERMÉ (un réglage de production) — la fiche d'un rendez-vous garde alors « Y aller », qui n'a besoin d'aucun service */
  const svc = await T.lancerService({ port, urlGestion: og.url, horloge: true, config: { origines: ['http://127.0.0.1:' + port], reunions: { planificateurMs: 150, bailMs: 2000 }, trajet: false } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'alice', MDP);
    const agendaAlice = async () => ((await A0.get('/api/agenda?du=' + (Date.now() - 2 * 86400000) + '&au=' + (Date.now() + 5 * 86400000))).j.evenements || []);
    const A = await ouvrir(b, svc.base, IPHONE, false);

    console.log('\n── 1. iPhone, côté Perso : « Rendez-vous » à la place de « Réunion » ──');
    await toucher(A, '#tabs a[data-vue="reunions"]');
    vrai('population : Alice a les deux côtés (la bêta ouvre tout) et elle est côté Perso', await attendre(A, () => document.documentElement.dataset.cote === 'perso' && !document.getElementById('vue-reunions').hidden));
    v('⛔ le « + » de l\'Agenda : « Rendez-vous », puis « Événement » — PAS « Réunion » (Perso)', await entete(A), ['Rendez-vous', 'Événement']);

    console.log('\n── 2. « Nouveau rendez-vous » : avec qui, une heure, des rappels en cases ──');
    await creerAgenda(A, 'rdv');
    vrai('la feuille « Nouveau rendez-vous » : titre, « Avec », début, fin, lieu, les rappels, note', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && ['ev-titre', 'ev-avec', 'ev-debut', 'ev-fin', 'ev-lieu', 'ev-rappels', 'ev-note'].every(id => !!document.getElementById(id))));
    v('⛔ un rendez-vous a une heure : pas de « Toute la journée », et le début se règle à la minute', await A.page.evaluate(() => [!!document.getElementById('ev-journee'), document.getElementById('ev-debut').type]), [false, 'datetime-local']);
    v('les rappels : six cases, « la veille » et « 1 heure avant » cochées par défaut', await cases(A), ['1440✓', '60✓', '30', '15', '5', '0']);
    const mesures = await A.page.evaluate(() => [Array.from(document.querySelectorAll('#ev-rappels [data-evt-rappel]')).map(x => Math.round(x.getBoundingClientRect().height)), Array.from(document.querySelectorAll('#info-corps input, #info-corps textarea')).filter(x => x.getClientRects().length).map(x => parseFloat(getComputedStyle(x).fontSize))]);
    v('iPhone : chaque case de rappel fait 44 px au moins, chaque champ 16 px au moins (Safari zoomerait)', [mesures[0].length, mesures[0].every(h => h >= 44), mesures[1].length >= 5, mesures[1].every(t => t >= 16)], [6, true, true, true], mesures);
    /* (15 octobre 2026, « plus simple ») des PASTILLES : le texte court à l'écran, le nom entier pour le lecteur d'écran */
    v('les rappels en pastilles : « La veille · 1 h · 30 min · 15 min · 5 min · À l\'heure », chacune NOMMÉE en entier', await A.page.evaluate(() => Array.from(document.querySelectorAll('#ev-rappels [data-evt-rappel]')).map(x => [x.textContent.trim(), x.getAttribute('aria-label'), x.classList.contains('rappel-puce')])),
      [['La veille', 'La veille', true], ['1 h', '1 heure avant', true], ['30 min', '30 minutes avant', true], ['15 min', '15 minutes avant', true], ['5 min', '5 minutes avant', true], ['À l\'heure', 'À l\'heure', true]]);
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('sans titre : l\'écran le DIT (« Donne un titre au rendez-vous »)', await attendre(A, () => { const e = document.getElementById('info-erreur'); return e && !e.hidden && /titre au rendez-vous/.test(e.textContent); }));
    await toucher(A, '#ev-rappels [data-evt-rappel="15"]');
    v('un troisième rappel (15 min avant) se coche', await cases(A), ['1440✓', '60✓', '30', '15✓', '5', '0']);
    await toucher(A, '#ev-rappels [data-evt-rappel="5"]');
    vrai('⛔ un quatrième : refusé, et l\'écran le DIT (« Trois rappels au plus »)', await attendre(A, () => /Trois rappels au plus/.test(document.getElementById('mot').textContent)));
    v('   rien n\'a bougé (toujours trois cochés)', await cases(A), ['1440✓', '60✓', '30', '15✓', '5', '0']);
    await A.page.locator('#ev-titre').fill('Ostéopathe QXV'); await A.page.locator('#ev-avec').fill('Dr Morel');
    await A.page.locator('#ev-debut').fill(aujourdhui() + 'T20:00'); await A.page.locator('#ev-fin').fill(aujourdhui() + 'T20:45');
    await A.page.locator('#ev-lieu').fill('8 rue Lafayette');
    await capture(A, 'rdv-1-nouveau-iphone');
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('« Enregistrer » : la feuille se ferme, « Rendez-vous ajouté à ton agenda »', await attendre(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /Rendez-vous ajouté à ton agenda/.test(document.getElementById('mot').textContent)));

    console.log('\n── 3. Dans la journée, puis sa fiche : plus d\'« Ajouter à mon calendrier » ──');
    vrai('il paraît : 20:00 → 20:45, « Rendez-vous avec Dr Morel », le lieu, ses trois rappels', await attendre(A, () => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /20:00/.test(x.textContent) && /20:45/.test(x.textContent) && /Ostéopathe QXV/.test(x.textContent)
      && /Rendez-vous avec Dr Morel · 8 rue Lafayette · Rappels la veille, 1 h avant et 15 min avant/.test(x.textContent))), await lignes(A));
    const RV = (await agendaAlice()).find(e => e.titre === 'Ostéopathe QXV') || {};
    v('le service a retenu : un rendez-vous, avec Dr Morel, trois rappels (la veille, 1 h, 15 min), côté Perso', [RV.genre, RV.avec, RV.rappels, RV.cote], ['rdv', 'Dr Morel', [1440, 60, 15], 'perso']);
    await capture(A, 'rdv-2-journee-iphone');
    await A.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'Ostéopathe QXV' }).first().tap();
    vrai('le toucher ouvre « Rendez-vous » avec ses valeurs (titre, avec qui, rappels cochés)', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Rendez-vous' && document.getElementById('ev-titre').value === 'Ostéopathe QXV' && document.getElementById('ev-avec').value === 'Dr Morel'));
    v('   ses rappels, tels que le service les a rangés', await cases(A), ['1440✓', '60✓', '30', '15✓', '5', '0']);
    const fiche = await A.page.evaluate(() => ({ gestes: Array.from(document.querySelectorAll('#info-corps .evt-gestes [data-evt="fait"], #info-corps .evt-gestes [data-evt="reporter"]')).length,
      lien: document.querySelectorAll('#info-corps a[data-evt="ics"], #info-corps a[download], #info-corps a[href*="/ics"]').length, texte: /Ajouter à mon calendrier/.test(document.getElementById('info-corps').textContent) }));
    vrai('population : la fiche porte ses gestes (« Marquer comme fait » et les trois « Reporter »)', fiche.gestes === 4, fiche);
    v('⛔ plus d\'« Ajouter à mon calendrier » (15 octobre 2026 : « l\'application fait déjà agenda ») : ni lien vers le .ics, ni le texte', [fiche.lien, fiche.texte], [0, false]);
    /* ce service-ci a le trajet fermé : la fiche garde quand même « Y aller » vers son lieu — il n'a besoin d'aucun service */
    v('sans calcul de trajet (population : ni « Calculer », ni le choix du départ), « Y aller » est là, 44 px au moins', await A.page.evaluate(() => { const z = document.getElementById('ev-trajet-zone'), b = z && z.querySelector('[data-evt="gps"]');
      return [!!z && !z.querySelector('[data-evt="trajet-calculer"], #ev-tr-depart'), !!b && b.getClientRects().length > 0, !!b && Math.round(b.getBoundingClientRect().height) >= 44]; }), [true, true, true]);

    console.log('\n── 4. Modifier : un rappel décoché ──');
    await toucher(A, '#ev-rappels [data-evt-rappel="1440"]');
    v('« la veille » se décoche', await cases(A), ['1440', '60✓', '30', '15✓', '5', '0']);
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('enregistré : « Rendez-vous modifié », la ligne dit ses deux rappels', await attendre(A, () => /Rendez-vous modifié/.test(document.getElementById('mot').textContent) && Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /Ostéopathe QXV/.test(x.textContent) && /Rappels 1 h avant et 15 min avant/.test(x.textContent))), await lignes(A));
    v('le service a retenu la nouvelle liste, avec qui est gardé', ((await agendaAlice()).filter(e => e.titre === 'Ostéopathe QXV').map(e => [e.rappels, e.avec])), [[[60, 15], 'Dr Morel']]);

    console.log('\n── 5. Le rappel arrive dans la page, et dit avec qui ──');
    const debut = Math.ceil((Date.now() + 70 * 60000) / 60000) * 60000;
    await creerAgenda(A, 'rdv');
    await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && !!document.getElementById('ev-avec'));
    await A.page.locator('#ev-titre').fill('Garage QXV'); await A.page.locator('#ev-avec').fill('M. Blanc');
    await A.page.locator('#ev-debut').fill(localParis(debut)); await A.page.locator('#ev-fin').fill(localParis(debut + 1800000));
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('population : « Garage QXV » est enregistré (dans 70 minutes, ses rappels par défaut : la veille — déjà passée — et 1 h avant)', await attendre(A, () => /Rendez-vous ajouté/.test(document.getElementById('mot').textContent)));
    v('   le service : 1 h avant attend', (await agendaAlice()).filter(e => e.titre === 'Garage QXV').map(e => [e.rappels, e.rappelEnAttente]), [[[1440, 60], true]]);
    /* ⛔ AU GESTE, jamais au chronomètre : le service avance jusqu'à 59 minutes PILE avant le début. « Onze minutes » laissait au hasard de la seconde (le début est arrondi à la minute
       au-dessus) un reste de 59,5 min ou plus, que le rappel arrondit à 60 et dit « Aujourd'hui à HH:MM » — un passage sur deux, mesuré le 13 octobre 2026 (59,087 min : vert ; 59,947 : rouge) */
    svc.avancer(debut - Date.now() - 59 * 60000);
    vrai('le service avance de onze minutes : la bannière arrive (« Garage QXV — Dans 59 minutes · avec M. Blanc »)', await attendre(A, () => { const n = document.getElementById('notif'); return n.classList.contains('on') && /Garage QXV/.test(n.textContent) && /Dans (5[7-9]|60) minutes · avec M\. Blanc/.test(n.textContent); }, null, 12000),
      await A.page.evaluate(() => document.getElementById('notif').textContent));
    await capture(A, 'rdv-3-rappel-iphone');

    console.log('\n── 6. Au bureau, de nuit : la fiche non plus ; côté Pro, « Réunion » revient ──');
    const B = await ouvrir(b, svc.base, BUREAU, true);
    await toucher(B, '#nav-side a[data-vue="reunions"]');
    vrai('la journée porte « Ostéopathe QXV » (le même compte, un autre appareil)', await attendre(B, () => /Ostéopathe QXV/.test(document.getElementById('liste-reunions').textContent)));
    v('côté Perso au bureau aussi : « Rendez-vous », pas « Réunion »', await entete(B), ['Rendez-vous', 'Événement']);
    await B.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'Ostéopathe QXV' }).first().click();
    vrai('population : la fiche « Rendez-vous » s\'ouvre au bureau, avec ses valeurs', await attendre(B, () => document.getElementById('feuille-titre').textContent === 'Rendez-vous' && document.getElementById('ev-titre').value === 'Ostéopathe QXV' && !!document.querySelector('#info-corps [data-evt="fait"]')));
    v('⛔ au bureau non plus : rien à télécharger, pas d\'« Ajouter à mon calendrier »', await B.page.evaluate(() => [document.querySelectorAll('#info-corps a[download], #info-corps a[href*="/ics"]').length, /Ajouter à mon calendrier/.test(document.getElementById('info-corps').textContent)]), [0, false]);
    await capture(B, 'rdv-4-fiche-bureau-nuit');
    await B.page.keyboard.press('Escape');
    await attendre(B, () => !document.documentElement.classList.contains('feuille-ouverte'));
    vrai('population : le sélecteur Perso | Pro de la barre latérale est là', await attendre(B, () => Array.from(document.querySelectorAll('.cote-seg-side [data-cote="pro"]')).some(x => x.getClientRects().length)));
    await toucher(B, '.cote-seg-side [data-cote="pro"]');
    /* ⛔ côté Pro, « Réunion » ET « Rendez-vous » (13 octobre 2026, avec le trajet : « pareil pour pro, pour les réunions ou rendez-vous ») */
    vrai('population : côté Pro', await attendre(B, () => document.documentElement.dataset.cote === 'pro' && !!document.getElementById('btn-agenda-plus')));
    v('côté Pro : le « + » propose « Rendez-vous », « Événement » ET « Réunion »', await entete(B), ['Rendez-vous', 'Événement', 'Réunion']);
    await capture(B, 'rdv-5-pro-bureau-nuit');
    await toucher(B, '.cote-seg-side [data-cote="perso"]');
    vrai('population : de retour côté Perso', await attendre(B, () => document.documentElement.dataset.cote === 'perso'));
    v('de retour côté Perso : « Réunion » quitte le « + »', await entete(B), ['Rendez-vous', 'Événement']);

    v('aucune erreur JavaScript', [A.erreurs, B.erreurs], [[], []]);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
