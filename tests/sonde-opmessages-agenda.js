/* ══ SONDE — L'AGENDA PERSONNEL DANS LA VRAIE PAGE SERVIE : CRÉER, MODIFIER, JOURNÉE ENTIÈRE, SUPPRIMER, LE RAPPEL ═════════════════════════════════════════════════════════
   Le chantier du 6 octobre 2026 (« fais les 3 dans l'ordre » : l'agenda personnel, qui prépare l'agent « Pro Assistant »). Joué contre le VRAI service, horloge avancée au geste :
     1. l'onglet s'appelle « Agenda » et propose « Événement » à côté de « Réunion » ;
     2. Alice (iPhone 393, jour) crée « Dîner chez Léa » à 20:00 avec un rappel : il paraît dans la journée, avec son heure et son rappel ;
     3. elle le touche, le renomme, le passe en journée entière ; puis le supprime (deux touchers) ;
     4. un événement à rappel : le service avance l'horloge, la bannière « Rappel » arrive dans la page ;
     5. au bureau, de nuit : la même journée, lisible (capture).
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-agenda.js          CAPTURES=/dossier pour les images.
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
const MDP = 'pw-alice-1234';
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false };

async function ouvrir(b, base, pf, nuit) {
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: nuit ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' });
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
const lignes = (S) => S.page.evaluate(() => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).map(b => b.textContent.replace(/\s+/g, ' ').trim()));
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
const aujourdhui = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP, nom: 'Alice Martin', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, horloge: true, config: { origines: ['http://127.0.0.1:' + port], reunions: { planificateurMs: 150, bailMs: 2000 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A = await ouvrir(b, svc.base, IPHONE, false);
    console.log('\n── 1. L\'onglet « Agenda » ──');
    v('l\'onglet du téléphone dit « Agenda »', await A.page.evaluate(() => document.querySelector('#tabs a[data-vue="reunions"]').textContent.trim()), 'Agenda');
    await toucher(A, '#tabs a[data-vue="reunions"]');
    vrai('il s\'ouvre, titre « Agenda », avec « Événement » et « Réunion » en haut', await attendre(A, () => { const s = document.getElementById('vue-reunions'); return !s.hidden && document.getElementById('titre-reunions').textContent === 'Agenda' && !!document.getElementById('btn-evenement-nouveau') && document.getElementById('btn-reunion-nouvelle').textContent === 'Réunion'; }));
    vrai('population : la journée est chargée et vide (« Rien de prévu ce jour-là »)', await attendre(A, () => /Rien de prévu/.test(document.getElementById('liste-reunions').textContent)));

    console.log('\n── 2. Créer un événement ──');
    await toucher(A, '#btn-evenement-nouveau');
    vrai('« Événement » ouvre « Nouvel événement » : titre, journée entière, début, fin, lieu, rappel (15 min par défaut), note', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Nouvel événement' && !!document.getElementById('ev-titre') && document.getElementById('ev-rappel').value === '15' && !!document.getElementById('ev-note')));
    const m = await A.page.evaluate(() => Array.from(document.querySelectorAll('#info-corps input, #info-corps select, #info-corps textarea')).filter(x => x.getClientRects().length).map(x => parseFloat(getComputedStyle(x).fontSize)));
    v('iPhone : chaque champ à 16 px au moins (Safari zoomerait)', [m.length >= 6, m.every(t => t >= 16)], [true, true]);
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('sans titre : l\'écran le DIT', await attendre(A, () => { const e = document.getElementById('info-erreur'); return e && !e.hidden && /titre/.test(e.textContent); }));
    await A.page.locator('#ev-titre').fill('Dîner chez Léa');
    await A.page.locator('#ev-debut').fill(aujourdhui() + 'T20:00'); await A.page.locator('#ev-fin').fill(aujourdhui() + 'T22:30');
    await A.page.locator('#ev-lieu').fill('12 rue des Lilas');
    await capture(A, '1-nouvel-evenement-iphone');
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('« Enregistrer » : la feuille se ferme, « Événement ajouté à ton agenda »', await attendre(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /ajouté/.test(document.getElementById('mot').textContent)));
    vrai('il paraît dans la journée : 20:00 → 22:30, le titre, le lieu et « Rappel 15 min avant »', await attendre(A, () => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /20:00/.test(x.textContent) && /22:30/.test(x.textContent) && /Dîner chez Léa/.test(x.textContent) && /12 rue des Lilas · Rappel 15 min avant/.test(x.textContent))), await lignes(A));
    await capture(A, '2-journee-iphone');

    console.log('\n── 3. Modifier, journée entière, supprimer ──');
    await toucher(A, '#liste-reunions [data-evenement]');
    vrai('le toucher ouvre « Événement » avec ses valeurs', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Événement' && document.getElementById('ev-titre').value === 'Dîner chez Léa' && !!document.querySelector('[data-evt="supprimer"]')));
    await A.page.locator('#ev-titre').fill('Dîner chez Léa et Tom');
    await toucher(A, '#ev-journee');
    v('« Toute la journée » : début et fin deviennent des dates', await A.page.evaluate(() => [document.getElementById('ev-debut').type, document.getElementById('ev-fin').type]), ['date', 'date']);
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('enregistré : le nouveau titre, « Journée »', await attendre(A, () => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /Journée/.test(x.textContent) && /Dîner chez Léa et Tom/.test(x.textContent))), await lignes(A));
    await toucher(A, '#liste-reunions [data-evenement]');
    await attendre(A, () => !!document.querySelector('[data-evt="supprimer"]'));
    await toucher(A, '[data-evt="supprimer"]');
    vrai('« Supprimer » demande un second toucher', await attendre(A, () => /Toucher encore/.test(document.querySelector('[data-evt="supprimer"]').textContent)));
    await toucher(A, '[data-evt="supprimer"]');
    vrai('second toucher : supprimé, la journée est de nouveau vide', await attendre(A, () => /supprimé/.test(document.getElementById('mot').textContent) && document.querySelectorAll('#liste-reunions [data-evenement]').length === 0));

    console.log('\n── 4. Le rappel arrive dans la page ──');
    const debut = new Date(Date.now() + 20 * 60000);
    const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(debut).replace(' ', 'T');
    await toucher(A, '#btn-evenement-nouveau');
    await attendre(A, () => !!document.getElementById('ev-titre'));
    await A.page.locator('#ev-titre').fill('Appeler le garage'); await A.page.locator('#ev-debut').fill(local);
    const finL = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(debut.getTime() + 1800000)).replace(' ', 'T');
    await A.page.locator('#ev-fin').fill(finL);
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('population : « Appeler le garage » est dans l\'agenda (dans 20 minutes, rappel 15 minutes avant)', await attendre(A, () => /Appeler le garage/.test(document.getElementById('liste-reunions').textContent)));
    svc.avancer(6 * 60000);
    vrai('le service avance de six minutes : la bannière du rappel arrive (« Appeler le garage — Dans 14 minutes »)', await attendre(A, () => { const n = document.getElementById('notif'); return n.classList.contains('on') && /Appeler le garage/.test(n.textContent) && /Dans 1[3-5] minutes/.test(n.textContent); }, null, 12000));
    await capture(A, '3-rappel-iphone');

    console.log('\n── 5. Au bureau, de nuit ──');
    const B = await ouvrir(b, svc.base, BUREAU, true);
    await toucher(B, '#nav-side a[data-vue="reunions"]');
    vrai('la journée porte « Appeler le garage » (le même compte, un autre appareil)', await attendre(B, () => /Appeler le garage/.test(document.getElementById('liste-reunions').textContent)));
    await capture(B, '4-agenda-bureau-nuit');

    v('aucune erreur JavaScript', [A.erreurs, B.erreurs], [[], []]);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
