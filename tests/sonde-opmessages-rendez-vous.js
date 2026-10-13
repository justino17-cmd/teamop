/* ══ SONDE — LE RENDEZ-VOUS PERSONNEL DANS LA VRAIE PAGE SERVIE : « RENDEZ-VOUS » À LA PLACE DE « RÉUNION » CÔTÉ PERSO, AVEC QUI, PLUSIEURS RAPPELS, « AJOUTER À MON CALENDRIER » ══════
   13 octobre 2026 : « dans Perso, à la place de réunion tu mets rendez-vous, comme ça les personnes peuvent gérer leurs rendez-vous personnels avec des rappels et tout » ; puis « ils peuvent aussi
   l'ajouter à leur agenda, comme Apple fait ». Joué contre le VRAI service (la bêta ouvre tout : Alice a les deux côtés), horloge avancée au geste :
     1. iPhone, côté Perso : l'en-tête de l'Agenda propose « Événement » et « Rendez-vous » — « Réunion » y est caché ;
     2. « Rendez-vous » ouvre « Nouveau rendez-vous » : titre, « Avec », une heure (jamais « toute la journée »), les rappels en cases — la veille et 1 h avant cochés —, trois au plus ;
     3. enregistré, il paraît dans la journée : « Rendez-vous avec … », le lieu, ses rappels ; sa fiche porte « Ajouter à mon calendrier », un VRAI fichier .ics (ses rappels en VALARM) ;
     4. modifié (un rappel décoché), le service retient la nouvelle liste ;
     5. le rappel arrive dans la page et dit avec qui ;
     6. au bureau, de nuit : le lien du calendrier TÉLÉCHARGE le fichier ; côté Pro, l'en-tête propose « Réunion » ET « Rendez-vous » (le trajet, 13 octobre 2026 : « pareil pour pro »).
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
const lignes = (S) => S.page.evaluate(() => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).map(b => b.textContent.replace(/\s+/g, ' ').trim()));
const cases = (S) => S.page.evaluate(() => Array.from(document.querySelectorAll('#ev-rappels [data-evt-rappel]')).map(x => x.dataset.evtRappel + (x.getAttribute('aria-checked') === 'true' ? '✓' : '')));
/* les deux boutons de l'en-tête : [« Rendez-vous » visible, « Réunion » présent, « Réunion » visible] */
const entete = (S) => S.page.evaluate(() => { const vu = (id) => { const x = document.getElementById(id); return !!x && !x.hidden && x.getClientRects().length > 0; }; return [vu('btn-rdv-nouveau'), !!document.getElementById('btn-reunion-nouvelle'), vu('btn-reunion-nouvelle')]; });
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
const localParis = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t)).replace(' ', 'T');
const aujourdhui = () => localParis(Date.now()).slice(0, 10);
/* l'en-tête d'un fichier .ics, déplié (RFC 5545 § 3.1) : une ligne par propriété */
const deplier = (txt) => txt.replace(/\r\n /g, '').split('\r\n').filter(Boolean);

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP, nom: 'Alice Martin', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, horloge: true, config: { origines: ['http://127.0.0.1:' + port], reunions: { planificateurMs: 150, bailMs: 2000 } } });
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
    v('⛔ l\'en-tête de l\'Agenda : « Rendez-vous » visible, « Réunion » présent mais caché', await entete(A), [true, true, false]);
    v('   « Événement » est toujours là, et « Rendez-vous » se lit tel quel', await A.page.evaluate(() => [!!document.getElementById('btn-evenement-nouveau'), document.getElementById('btn-rdv-nouveau').textContent]), [true, 'Rendez-vous']);

    console.log('\n── 2. « Nouveau rendez-vous » : avec qui, une heure, des rappels en cases ──');
    await toucher(A, '#btn-rdv-nouveau');
    vrai('la feuille « Nouveau rendez-vous » : titre, « Avec », début, fin, lieu, les rappels, note', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && ['ev-titre', 'ev-avec', 'ev-debut', 'ev-fin', 'ev-lieu', 'ev-rappels', 'ev-note'].every(id => !!document.getElementById(id))));
    v('⛔ un rendez-vous a une heure : pas de « Toute la journée », et le début se règle à la minute', await A.page.evaluate(() => [!!document.getElementById('ev-journee'), document.getElementById('ev-debut').type]), [false, 'datetime-local']);
    v('les rappels : six cases, « la veille » et « 1 heure avant » cochées par défaut', await cases(A), ['1440✓', '60✓', '30', '15', '5', '0']);
    const mesures = await A.page.evaluate(() => [Array.from(document.querySelectorAll('#ev-rappels [data-evt-rappel]')).map(x => Math.round(x.getBoundingClientRect().height)), Array.from(document.querySelectorAll('#info-corps input, #info-corps textarea')).filter(x => x.getClientRects().length).map(x => parseFloat(getComputedStyle(x).fontSize))]);
    v('iPhone : chaque case de rappel fait 44 px au moins, chaque champ 16 px au moins (Safari zoomerait)', [mesures[0].length, mesures[0].every(h => h >= 44), mesures[1].length >= 5, mesures[1].every(t => t >= 16)], [6, true, true, true], mesures);
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

    console.log('\n── 3. Dans la journée, puis sa fiche : « Ajouter à mon calendrier » ──');
    vrai('il paraît : 20:00 → 20:45, « Rendez-vous avec Dr Morel », le lieu, ses trois rappels', await attendre(A, () => Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /20:00/.test(x.textContent) && /20:45/.test(x.textContent) && /Ostéopathe QXV/.test(x.textContent)
      && /Rendez-vous avec Dr Morel · 8 rue Lafayette · Rappels la veille, 1 h avant et 15 min avant/.test(x.textContent))), await lignes(A));
    const RV = (await agendaAlice()).find(e => e.titre === 'Ostéopathe QXV') || {};
    v('le service a retenu : un rendez-vous, avec Dr Morel, trois rappels (la veille, 1 h, 15 min), côté Perso', [RV.genre, RV.avec, RV.rappels, RV.cote], ['rdv', 'Dr Morel', [1440, 60, 15], 'perso']);
    await capture(A, 'rdv-2-journee-iphone');
    await A.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'Ostéopathe QXV' }).first().tap();
    vrai('le toucher ouvre « Rendez-vous » avec ses valeurs (titre, avec qui, rappels cochés)', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Rendez-vous' && document.getElementById('ev-titre').value === 'Ostéopathe QXV' && document.getElementById('ev-avec').value === 'Dr Morel'));
    v('   ses rappels, tels que le service les a rangés', await cases(A), ['1440✓', '60✓', '30', '15✓', '5', '0']);
    const lien = await A.page.evaluate(() => { const a = document.querySelector('#info-corps a[data-evt="ics"]'); return a ? { href: a.getAttribute('href'), dl: a.hasAttribute('download'), texte: a.querySelector('.reglage-texte').firstChild.textContent.trim(), h: Math.round(a.getBoundingClientRect().height) } : null; });
    v('« Ajouter à mon calendrier » : un lien de téléchargement vers le fichier .ics du rendez-vous, 44 px au moins', lien && [lien.texte, lien.href.endsWith('/api/agenda/' + RV.id + '/ics'), lien.dl, lien.h >= 44], ['Ajouter à mon calendrier', true, true, true], lien);
    const f = await A.page.evaluate(async (u) => { const r = await fetch(u, { credentials: 'include' }); return { code: r.status, type: r.headers.get('content-type'), disp: r.headers.get('content-disposition'), txt: await r.text() }; }, lien.href);
    const L = deplier(f.txt);
    v('le fichier (relu par la page, avec sa session) : un calendrier, nommé d\'après le rendez-vous', [f.code, (f.type || '').split(';')[0], f.disp], [200, 'text/calendar', 'attachment; filename="rendez-vous-osteopathe-qxv.ics"']);
    v('   son contenu : le titre, le lieu, « Avec : Dr Morel », et ⛔ trois alarmes — 15 min, 1 h, la veille', [L.find(l => l.startsWith('SUMMARY:')), L.find(l => l.startsWith('LOCATION:')), /Avec : Dr Morel/.test(L.find(l => l.startsWith('DESCRIPTION:')) || ''),
      L.filter(l => l.startsWith('TRIGGER:')).length, L.filter(l => l.startsWith('TRIGGER:')).slice(0, 2)], ['SUMMARY:Ostéopathe QXV', 'LOCATION:8 rue Lafayette', true, 3, ['TRIGGER:-PT15M', 'TRIGGER:-PT1H']]);

    console.log('\n── 4. Modifier : un rappel décoché ──');
    await toucher(A, '#ev-rappels [data-evt-rappel="1440"]');
    v('« la veille » se décoche', await cases(A), ['1440', '60✓', '30', '15✓', '5', '0']);
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('enregistré : « Rendez-vous modifié », la ligne dit ses deux rappels', await attendre(A, () => /Rendez-vous modifié/.test(document.getElementById('mot').textContent) && Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /Ostéopathe QXV/.test(x.textContent) && /Rappels 1 h avant et 15 min avant/.test(x.textContent))), await lignes(A));
    v('le service a retenu la nouvelle liste, avec qui est gardé', ((await agendaAlice()).filter(e => e.titre === 'Ostéopathe QXV').map(e => [e.rappels, e.avec])), [[[60, 15], 'Dr Morel']]);

    console.log('\n── 5. Le rappel arrive dans la page, et dit avec qui ──');
    const debut = Math.ceil((Date.now() + 70 * 60000) / 60000) * 60000;
    await toucher(A, '#btn-rdv-nouveau');
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

    console.log('\n── 6. Au bureau, de nuit : le fichier se télécharge ; côté Pro, « Réunion » revient ──');
    const B = await ouvrir(b, svc.base, BUREAU, true);
    await toucher(B, '#nav-side a[data-vue="reunions"]');
    vrai('la journée porte « Ostéopathe QXV » (le même compte, un autre appareil)', await attendre(B, () => /Ostéopathe QXV/.test(document.getElementById('liste-reunions').textContent)));
    v('côté Perso au bureau aussi : « Rendez-vous », pas « Réunion »', await entete(B), [true, true, false]);
    await B.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'Ostéopathe QXV' }).first().click();
    await attendre(B, () => !!document.querySelector('#info-corps a[data-evt="ics"]'));
    const [dl] = await Promise.all([B.page.waitForEvent('download', { timeout: 9000 }).catch(() => null), toucher(B, '#info-corps a[data-evt="ics"]')]);
    const contenu = dl ? fs.readFileSync(await dl.path(), 'utf8') : '';
    v('« Ajouter à mon calendrier » TÉLÉCHARGE le fichier : son nom, un calendrier, deux alarmes (la liste modifiée)', [dl && dl.suggestedFilename(), contenu.startsWith('BEGIN:VCALENDAR\r\n'), deplier(contenu).filter(l => l.startsWith('TRIGGER:'))],
      ['rendez-vous-osteopathe-qxv.ics', true, ['TRIGGER:-PT15M', 'TRIGGER:-PT1H']]);
    vrai('   et la page est restée là (la fiche est toujours ouverte, rien n\'a navigué)', await attendre(B, () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === 'Rendez-vous'));
    await capture(B, 'rdv-4-fiche-bureau-nuit');
    await B.page.keyboard.press('Escape');
    await attendre(B, () => !document.documentElement.classList.contains('feuille-ouverte'));
    vrai('population : le sélecteur Perso | Pro de la barre latérale est là', await attendre(B, () => Array.from(document.querySelectorAll('.cote-seg-side [data-cote="pro"]')).some(x => x.getClientRects().length)));
    await toucher(B, '.cote-seg-side [data-cote="pro"]');
    /* ⛔ côté Pro, « Réunion » ET « Rendez-vous » (13 octobre 2026, avec le trajet : « pareil pour pro, pour les réunions ou rendez-vous ») */
    vrai('côté Pro : l\'en-tête propose « Réunion » ET « Rendez-vous »', await attendre(B, () => { const vu = (id) => { const x = document.getElementById(id); return !!x && !x.hidden && x.getClientRects().length > 0; }; return document.documentElement.dataset.cote === 'pro' && vu('btn-reunion-nouvelle') && vu('btn-rdv-nouveau'); }));
    await capture(B, 'rdv-5-pro-bureau-nuit');
    await toucher(B, '.cote-seg-side [data-cote="perso"]');
    vrai('de retour côté Perso : « Rendez-vous » seul (« Réunion » se cache)', await attendre(B, () => { const x = document.getElementById('btn-rdv-nouveau'); return document.documentElement.dataset.cote === 'perso' && !!x && !x.hidden && document.getElementById('btn-reunion-nouvelle').hidden; }));

    v('aucune erreur JavaScript', [A.erreurs, B.erreurs], [[], []]);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
