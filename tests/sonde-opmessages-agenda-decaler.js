/* ══ SONDE — L'AGENDA DE PRO : LA SEMAINE EN GRILLE, LE CLIC DROIT, GLISSER POUR DÉCALER (avec un motif, l'autre prévenu) ═══════════════════════════════════════════
   La demande du 10 octobre 2026 : « l'agenda du mois, sur la semaine, j'aimerais bien un petit truc pareil » ; « quand on passe la souris dans les carrés où il y a des petits rendez-vous,
   qu'on puisse faire un clic droit » ; « rester cliqué sur le rendez-vous, glisser […] ça ouvre une page, voulez-vous décaler ce rendez-vous, on note, problème de déplacement, ça
   envoie aux deux personnes concernées ». Joué contre le VRAI service, deux personnes (Alice organise, Bruno est invité), au bureau (souris) et au téléphone (doigt) :
     1. au bureau, la semaine est une grille de sept cases, comme le mois ; la réunion y est un bouton qu'on peut tirer ;
     2. le clic droit ouvre le menu À L'ENDROIT du clic ; Échap le ferme et rend le focus ; Maj+F10 l'ouvre au clavier ;
     3. on tire la réunion sur un autre jour : « Décaler le rendez-vous » s'ouvre, l'heure gardée ; on choisit « Problème de déplacement » ; « Décaler et prévenir » ;
     4. Bruno reçoit la notification (ancien → nouvel horaire, le motif), la conversation de la réunion le dit ; la case du nouveau jour porte la réunion ;
     5. un chevauchement se DIT ; un événement personnel se tire aussi, sans motif ni personne à prévenir ;
     6. chez Bruno (invité), le menu propose de répondre, jamais de décaler ni d'annuler ;
     7. au téléphone, la bande des jours reste ; l'appui long sur une ligne ouvre le menu (feuille du bas), « Décaler… » ouvre la feuille ;
     8. au mois, un rendez-vous d'une case s'ouvre d'un clic ; la fiche de l'organisateur propose « Décaler ».
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-agenda-decaler.js          CAPTURES=/dossier pour les images.
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
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234' };
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false }, IPAD = { w: 820, h: 1180, dpr: 2, mobile: true };
const PARIS = 'Europe/Paris', JOUR = 86400000;
const TITRE = 'Visite chantier WQXZ', EVT = 'Appel fournisseur WQXZ', GENE = 'Dentiste WQXZ';

async function ouvrir(b, base, pf, login) {
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, erreurs: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  await page.goto(base + '/');
  await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
  return S;
}
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
async function toucher(S, sel) { const l = S.page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (S.pf.mobile) await l.tap(); else await l.click(); }
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
/* les dates en heure de Paris (le fuseau des deux navigateurs) */
const ymd = t => new Intl.DateTimeFormat('en-CA', { timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);
const jourSemaine = t => (new Date(ymd(t) + 'T12:00:00Z').getUTCDay() + 6) % 7;             // lundi 0 … dimanche 6
async function agenda(S) {
  await toucher(S, S.pf.mobile ? '#tabs a[data-vue="reunions"]' : '#nav-side a[data-vue="reunions"]');
  await attendre(S, () => { const s = document.getElementById('vue-reunions'); return !s.hidden && document.getElementById('liste-reunions').getAttribute('aria-busy') === 'false'; }, null, 12000);
}
/* la case d'un jour (par sa date « AAAA-MM-JJ » : le navigateur calcule son minuit) */
const caseDe = (S, zone, jour) => S.page.evaluate(([z, j]) => { const [y, m, d] = j.split('-').map(Number), t = new Date(y, m - 1, d).getTime(); const c = document.querySelector('#' + z + ' .mjour[data-case="' + t + '"]'); return c ? { t, titres: Array.from(c.querySelectorAll('[data-ag]')).map(x => x.textContent.replace(/\s+/g, ' ').trim()), bouge: Array.from(c.querySelectorAll('[data-ag].bouge')).map(x => x.textContent.replace(/\s+/g, ' ').trim()) } : null; }, [zone, jour]);
const centre = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; }, sel);
const menu = S => S.page.evaluate(() => { const f = document.getElementById('menu-fond'), m = document.getElementById('menu-msg'), r = m.getBoundingClientRect();
  return { ouvert: !f.hidden, ag: f.classList.contains('ag'), actions: Array.from(m.querySelectorAll('[data-ag-menu]')).map(b => b.textContent.trim()), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), bas: Math.round(r.bottom),
    focus: document.activeElement && document.activeElement.closest('#menu-msg') ? document.activeElement.textContent.trim() : null, titre: (m.querySelector('.menu-titre b') || {}).textContent || '' }; });
const feuille = S => S.page.evaluate(() => ({ ouverte: document.documentElement.classList.contains('feuille-ouverte'), titre: document.getElementById('feuille-titre').textContent, date: (document.getElementById('dc-date') || {}).value || null, heure: (document.getElementById('dc-heure') || {}).value || null,
  apres: ((document.getElementById('dc-apres') || {}).textContent || '').replace(/\s+/g, ' ').trim(), notes: Array.from(document.querySelectorAll('#info-corps .info-note')).filter(x => !x.hidden).map(x => x.textContent.replace(/\s+/g, ' ').trim()),
  conflit: (() => { const c = document.getElementById('dc-conflit'); return c && !c.hidden ? c.textContent : ''; })(), motifs: Array.from(document.querySelectorAll('#info-corps [data-dc-motif]')).map(b => b.textContent), ok: (document.querySelector('#info-corps [data-dc="ok"]') || {}).textContent || null,
  erreur: (() => { const e = document.getElementById('info-erreur'); return e && !e.hidden ? e.textContent : ''; })() }));
/* tirer à la souris, par petits pas (le navigateur voit un vrai glisser), et regarder AVANT de lâcher */
async function tirer(S, de, vers) {
  await S.page.mouse.move(de.x, de.y); await S.page.mouse.down();
  for (let i = 1; i <= 12; i++) { await S.page.mouse.move(de.x + (vers.x - de.x) * i / 12, de.y + (vers.y - de.y) * i / 12); await S.page.waitForTimeout(16); }
  const pendant = await S.page.evaluate(() => ({ fantome: !!document.querySelector('.mjour-elt.fantome'), cible: !!document.querySelector('.mjour.cible'), main: document.documentElement.classList.contains('ag-tire') }));
  await S.page.mouse.up();
  return pendant;
}

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MOTS.alice, nom: 'Alice Martin', actif: true }, bruno: { pass: MOTS.bruno, nom: 'Bruno Petit', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const a = await T.connecter(svc, og, 'alice', MOTS.alice), br = await T.connecter(svc, og, 'bruno', MOTS.bruno);
    const lien = await a.post('/api/contacts/lien', {}); await br.post('/api/liens/accepter', { code: lien.j.code });
    const brunoId = (await br.get('/api/moi')).j.moi.id;
    /* le jour de la réunion : après-demain ; le jour où on la tire : le lendemain s'il est dans la même semaine, sinon la veille (toujours à venir) */
    const t0 = Date.now(), D = ymd(t0 + 2 * JOUR), wD = jourSemaine(t0 + 2 * JOUR), CIBLE = wD < 6 ? ymd(t0 + 3 * JOUR) : ymd(t0 + JOUR), semaineSuivante = jourSemaine(t0) + 2 > 6;
    const cr = await a.post('/api/reunions', { titre: TITRE, lieu: 'Rue des Lilas', debut: D + 'T14:00', fin: D + 'T15:00', tz: PARIS, repetition: 'aucune', invites: [brunoId], notifier: false });
    const ev = await a.post('/api/agenda', { titre: EVT, debut: D + 'T09:00', fin: D + 'T09:30', tz: PARIS, rappel: null });
    vrai('population : la réunion d\'Alice (Bruno invité) et son événement personnel existent au service', cr.code === 201 && ev.code === 201, [cr.code, ev.code]);

    const A = await ouvrir(b, svc.base, BUREAU, 'alice');
    await agenda(A);
    if (semaineSuivante) { await toucher(A, '#sem-suiv'); await attendre(A, () => document.getElementById('liste-reunions').getAttribute('aria-busy') === 'false'); }
    console.log('\n── 1. Au bureau, la semaine est une grille, comme le mois ──');
    const g = await A.page.evaluate(() => ({ grille: getComputedStyle(document.getElementById('sem-grille')).display, bande: getComputedStyle(document.getElementById('sem-jours')).display, cases: document.querySelectorAll('#sem-grille .mjour').length,
      noms: Array.from(document.querySelectorAll('#sem-grille .mjour-nom')).map(x => x.textContent), boutons: Array.from(document.querySelectorAll('#sem-grille .mjour')).every(c => c.tagName === 'DIV' && c.querySelector('button.mjour-num')) }));
    v('la semaine : sept cases en grille (la bande des pastilles se range), chacune avec le nom du jour et son numéro-bouton', [g.grille, g.bande, g.cases, g.noms.length, g.boutons], ['grid', 'none', 7, 7, true], g);
    const c0 = await caseDe(A, 'sem-grille', D);
    vrai('la case d\'après-demain porte la réunion (14:00) et l\'événement (09:00), deux boutons qu\'on peut tirer', !!c0 && c0.titres.some(x => x.includes('14:00') && x.includes(TITRE)) && c0.titres.some(x => x.includes('09:00') && x.includes(EVT)) && c0.bouge.length === 2, c0);
    await capture(A, '1-semaine-grille-bureau');

    console.log('\n── 2. Le clic droit, à l\'endroit du clic ──');
    const selR = '#sem-grille [data-ag="r"]', p = await centre(A, selR);
    await A.page.mouse.click(p.x, p.y, { button: 'right' });
    await attendre(A, () => !document.getElementById('menu-fond').hidden);
    const m1 = await menu(A);
    v('le menu s\'ouvre là où on a cliqué (coin à ±2 px du pointeur), compact, et propose Ouvrir, Décaler…, Écrire aux participants, Annuler la réunion… — ⛔ plus « Ajouter à mon calendrier » (15 octobre 2026)',
      [m1.ouvert, m1.ag, Math.abs(m1.x - Math.round(p.x)) <= 2 && Math.abs(m1.y - Math.round(p.y)) <= 2, m1.titre, ['Ouvrir', 'Décaler…', 'Écrire aux participants', 'Annuler la réunion…'].every(t => m1.actions.includes(t)), m1.actions.some(t => /calendrier|\.ics/.test(t)), m1.focus],
      [true, true, true, TITRE, true, false, 'Ouvrir'], m1);
    await capture(A, '2-menu-clic-droit');
    await A.page.keyboard.press('Escape');
    vrai('Échap ferme le menu et rend le focus au rendez-vous', await attendre(A, () => document.getElementById('menu-fond').hidden && document.activeElement && document.activeElement.dataset.ag === 'r'));
    await A.page.keyboard.press('Shift+F10');
    await attendre(A, () => !document.getElementById('menu-fond').hidden);
    const m2 = await menu(A), r2 = await A.page.evaluate(s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.bottom) }; }, selR);
    v('au clavier, Maj+F10 l\'ouvre SOUS le rendez-vous, le premier choix au focus', [m2.ouvert, Math.abs(m2.x - r2.x) <= 2, m2.y >= r2.y && m2.y <= r2.y + 8, m2.focus], [true, true, true, 'Ouvrir'], { m2, r2 });
    await A.page.keyboard.press('Escape');
    await attendre(A, () => document.getElementById('menu-fond').hidden);
    /* un menu près du BORD reste dans l'écran */
    const bord = await A.page.evaluate(() => innerWidth);
    await A.page.mouse.click(bord - 4, 300, { button: 'right' });
    vrai('(population) un clic droit HORS d\'un rendez-vous n\'ouvre rien (le menu du navigateur reste le sien)', await A.page.evaluate(() => document.getElementById('menu-fond').hidden));

    console.log('\n── 3. Glisser sur un autre jour : « Décaler le rendez-vous » ──');
    /* tirer, puis revenir lâcher SUR le rendez-vous lui-même : on a renoncé — rien ne s'ouvre (le clic que le navigateur produit au relâcher est avalé) */
    const d0 = await centre(A, selR);
    await A.page.mouse.move(d0.x, d0.y); await A.page.mouse.down();
    for (let i = 1; i <= 8; i++) { await A.page.mouse.move(d0.x + 10 * i, d0.y + 6 * i); await A.page.waitForTimeout(16); }
    for (let i = 7; i >= 0; i--) { await A.page.mouse.move(d0.x + 10 * i, d0.y + 6 * i); await A.page.waitForTimeout(16); }
    await A.page.mouse.up(); await A.page.waitForTimeout(500);
    v('tirer puis revenir lâcher sur le rendez-vous lui-même : rien ne s\'ouvre (ni sa fiche ni la feuille), le fantôme est parti', await A.page.evaluate(() => [document.documentElement.classList.contains('feuille-ouverte'), !!document.querySelector('.mjour-elt.fantome'), document.documentElement.classList.contains('ag-tire')]), [false, false, false]);
    await A.page.mouse.move(10, 10);
    const pc = await A.page.evaluate(([j]) => { const [y, m, d] = j.split('-').map(Number), t = new Date(y, m - 1, d).getTime(), c = document.querySelector('#sem-grille .mjour[data-case="' + t + '"]'), r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.7 }; }, [CIBLE]);
    const pendant = await tirer(A, await centre(A, selR), pc);
    v('pendant le glisser : un fantôme suit la souris, la case visée s\'allume, la main est fermée', pendant, { fantome: true, cible: true, main: true });
    await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Décaler le rendez-vous' && !!document.getElementById('dc-date'));
    const f1 = await feuille(A);
    v('lâché sur ' + CIBLE + ' : la feuille « Décaler le rendez-vous » s\'ouvre, ce jour-là, l\'heure GARDÉE (14:00), Bruno nommé parmi ceux qui seront prévenus, six motifs proposés, « Décaler et prévenir »',
      [f1.titre, f1.date, f1.heure, f1.notes.some(n => /Seront prévenus : Bruno/.test(n)), f1.motifs.length, f1.ok, /14:00 – 15:00/.test(f1.apres)], ['Décaler le rendez-vous', CIBLE, '14:00', true, 6, 'Décaler et prévenir', true], f1);
    v('⛔ rien n\'est parti au service tant que la feuille n\'est pas validée : la réunion est toujours le ' + D + ' à 14:00', (await a.get('/api/reunions/' + cr.j.reunion.id)).j.reunion.debut, cr.j.reunion.debut);
    await toucher(A, '#info-corps [data-dc-motif="Problème de déplacement"]');
    v('« Problème de déplacement » se coche et remplit le motif', await A.page.evaluate(() => [document.getElementById('dc-motif').value, document.querySelector('[data-dc-motif="Problème de déplacement"]').getAttribute('aria-pressed')]), ['Problème de déplacement', 'true']);
    await capture(A, '3-feuille-decaler');
    await toucher(A, '#info-corps [data-dc="ok"]');
    vrai('« Décaler et prévenir » : la feuille se ferme, « Réunion décalée … — l\'autre participant est prévenu »', await attendre(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /Réunion décalée/.test(document.getElementById('mot').textContent) && /prévenu/.test(document.getElementById('mot').textContent), null, 12000),
      await A.page.evaluate(() => document.getElementById('mot').textContent));
    vrai('la case du ' + CIBLE + ' porte maintenant la réunion à 14:00, celle du ' + D + ' ne la porte plus', await attendre(A, ([cj, dj]) => { const t = j => { const [y, m, d] = j.split('-').map(Number); return new Date(y, m - 1, d).getTime(); };
      const cc = document.querySelector('#sem-grille .mjour[data-case="' + t(cj) + '"]'), cd = document.querySelector('#sem-grille .mjour[data-case="' + t(dj) + '"]');
      return cc && cd && Array.from(cc.querySelectorAll('[data-ag="r"]')).some(x => /14:00/.test(x.textContent)) && !cd.querySelector('[data-ag="r"]'); }, [CIBLE, D], 12000));

    console.log('\n── 4. Bruno est prévenu ──');
    const nb = (await br.get('/api/notifications')).j.notifications.filter(n => n.type === 'reunion_decalee');
    vrai('Bruno a UNE notification « décalée » : qui, l\'ancien et le nouvel horaire, le motif', nb.length === 1 && /Alice/.test(nb[0].texte) && /décalé la réunion du/.test(nb[0].texte) && /Motif : Problème de déplacement/.test(nb[0].texte), nb.map(n => n.texte));
    const ms = (await br.get('/api/conversations/' + cr.j.reunion.conv + '/messages')).j.messages.filter(x => x.type === 'systeme' && x.meta && x.meta.k === 'reunion_decalee');
    v('la conversation de la réunion le dit (un message, avec le motif)', [ms.length, ms[0] && ms[0].meta.motif], [1, 'Problème de déplacement']);

    console.log('\n── 5. Un chevauchement se dit ; un événement personnel se tire aussi ──');
    await a.post('/api/agenda', { titre: GENE, debut: CIBLE + 'T16:00', fin: CIBLE + 'T17:00', tz: PARIS, rappel: null });
    await A.page.evaluate(() => document.getElementById('sem-titre').click());           // relire (revenir à aujourd'hui recharge la fenêtre)
    if (semaineSuivante) { await toucher(A, '#sem-suiv'); }
    await attendre(A, ([g]) => document.getElementById('sem-grille').textContent.includes(g), [GENE], 12000);
    await A.page.mouse.click((await centre(A, selR)).x, (await centre(A, selR)).y, { button: 'right' });
    await attendre(A, () => !document.getElementById('menu-fond').hidden);
    await A.page.locator('#menu-msg [data-ag-menu="decaler"]').click();
    const vis = await attendre(A, () => { const h = document.getElementById('dc-heure'); return !!h && h.getClientRects().length > 0; });
    await A.page.locator('#dc-heure').fill('16:30');
    vrai('16:30 le même jour : « Attention, ce créneau chevauche « ' + GENE + ' » (16:00 – 17:00) »', await attendre(A, ([g]) => { const c = document.getElementById('dc-conflit'); return c && !c.hidden && c.textContent.includes(g) && /16:00 – 17:00/.test(c.textContent); }, [GENE]), (await feuille(A)).conflit);
    await toucher(A, '#info-corps [data-dc="non"]');
    await attendre(A, () => !document.documentElement.classList.contains('feuille-ouverte'));
    const selE = '#sem-grille [data-ag="e"]';
    const pd = await A.page.evaluate(([j]) => { const [y, m, d] = j.split('-').map(Number), t = new Date(y, m - 1, d).getTime(), c = document.querySelector('#sem-grille .mjour[data-case="' + t + '"]'), r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.8 }; }, [CIBLE]);
    const ce = await A.page.evaluate(([s, t]) => { const e = Array.from(document.querySelectorAll(s)).find(x => x.textContent.includes(t)); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, [selE, EVT]);
    await tirer(A, ce, pd);
    await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Décaler le rendez-vous' && !!document.getElementById('dc-date'));
    const f2 = await feuille(A);
    v('l\'événement tiré : la feuille, 09:00 gardé, AUCUN motif, « personne n\'est prévenu », « Décaler »', [f2.date, f2.heure, f2.motifs.length, f2.notes.some(n => /personne n.est prévenu/.test(n)), f2.ok], [CIBLE, '09:00', 0, true, 'Décaler'], f2);
    await toucher(A, '#info-corps [data-dc="ok"]');
    vrai('« Décaler » : « Événement décalé … à 09:00 »', await attendre(A, () => /Événement décalé/.test(document.getElementById('mot').textContent), null, 12000));
    const evs = (await a.get('/api/agenda?du=' + (t0 - JOUR) + '&au=' + (t0 + 9 * JOUR))).j;
    vrai('au service, l\'événement est le ' + CIBLE + ' à 09:00 (une demi-heure, comme avant)', !!evs && Array.isArray(evs.evenements) && evs.evenements.some(e => e.titre === EVT && ymd(e.debut) === CIBLE && e.fin - e.debut === 1800000), evs && evs.evenements && evs.evenements.map(e => [e.titre, ymd(e.debut)]));

    console.log('\n── 5 bis. La relecture : plusieurs jours, la case entière, Échap pendant un glisser ──');
    /* un SALON sur deux jours (journée entière) : saisi par son 2e jour et lâché un jour plus loin, il glisse d'UN jour — le 1er jour devient le 2e (avant : il sautait de deux) */
    const jours = await A.page.evaluate(() => { const a = new Date(); a.setHours(0, 0, 0, 0); return { cases: Array.from(document.querySelectorAll('#sem-grille .mjour')).map(c => +c.dataset.case), auj: a.getTime() }; });
    const iX = jours.cases.findIndex((t, i) => t >= jours.auj && i + 2 < jours.cases.length);
    vrai('(population) trois jours à venir de suite dans la semaine affichée', iX >= 0, jours);
    const X = ymd(jours.cases[iX]), X1 = ymd(jours.cases[iX + 1]), X2 = ymd(jours.cases[iX + 2]);
    const salon = await a.post('/api/agenda', { titre: 'Salon WQXZ', debut: X, fin: X1, journee: true, tz: PARIS, rappel: null });
    await A.page.evaluate(() => document.getElementById('sem-titre').click());
    if (semaineSuivante) { await toucher(A, '#sem-suiv'); }
    const vuSalon = await attendre(A, ([j]) => { const [y, m, d] = j.split('-').map(Number), t = new Date(y, m - 1, d).getTime(), c = document.querySelector('#sem-grille .mjour[data-case="' + t + '"]'); return !!c && c.textContent.includes('Salon WQXZ'); }, [X1], 12000);
    vrai('(population) le salon (' + X + ' → ' + X1 + ') est créé et paraît aussi dans la case de son 2e jour', salon.code === 201 && vuSalon, salon.code);
    const deSalon = await A.page.evaluate(([j]) => { const [y, m, d] = j.split('-').map(Number), t = new Date(y, m - 1, d).getTime(), e = Array.from(document.querySelectorAll('#sem-grille .mjour[data-case="' + t + '"] [data-ag="e"]')).find(x => x.textContent.includes('Salon WQXZ')); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, [X1]);
    const versSalon = await A.page.evaluate(([j]) => { const [y, m, d] = j.split('-').map(Number), t = new Date(y, m - 1, d).getTime(), c = document.querySelector('#sem-grille .mjour[data-case="' + t + '"]'), r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height * 0.85 }; }, [X2]);
    await tirer(A, deSalon, versSalon);
    await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Décaler le rendez-vous' && !!document.getElementById('dc-date'));
    const fs1 = await feuille(A);
    v('⛔ le salon saisi par son 2e jour (' + X1 + ') et lâché sur le ' + X2 + ' : la feuille propose de le commencer le ' + X1 + ' (UN jour plus tard), sur deux jours', [fs1.date, /2 jours/.test(fs1.apres), fs1.notes.some(n => /Sur 2 jours, comme avant/.test(n))], [X1, true, true], fs1);
    await toucher(A, '#info-corps [data-dc="non"]');
    await attendre(A, () => !document.documentElement.classList.contains('feuille-ouverte'));
    /* la case ENTIÈRE choisit le jour : un clic dans le bas vide d'une case (pas seulement la bande de son numéro) */
    const basCase = await A.page.evaluate(([j]) => { const [y, m, d] = j.split('-').map(Number), t = new Date(y, m - 1, d).getTime(), c = document.querySelector('#sem-grille .mjour[data-case="' + t + '"]'), r = c.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.bottom - 6, t }; }, [X2]);
    const sous = await A.page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.className : null; }, [basCase.x, basCase.y]);
    await A.page.mouse.click(basCase.x, basCase.y);
    vrai('⛔ un clic dans le BAS VIDE de la case du ' + X2 + ' (sous le pointeur : « ' + sous + ' ») choisit ce jour', await attendre(A, ([t]) => { const c = document.querySelector('#sem-grille .mjour.choisi'); return !!c && +c.dataset.case === t; }, [basCase.t], 4000), sous);
    /* Échap pendant un glisser, puis relâcher bien plus tard SUR le rendez-vous : rien ne s'ouvre (le clic est avalé jusqu'au relâcher, pas pendant une durée) */
    const e0 = await centre(A, selR);
    await A.page.mouse.move(e0.x, e0.y); await A.page.mouse.down();
    for (let i = 1; i <= 6; i++) { await A.page.mouse.move(e0.x + 12 * i, e0.y + 4 * i); await A.page.waitForTimeout(16); }
    const tireAvant = await A.page.evaluate(() => !!document.querySelector('.mjour-elt.fantome'));
    await A.page.keyboard.press('Escape');
    await A.page.waitForTimeout(900);
    await A.page.mouse.move(e0.x, e0.y); await A.page.mouse.up(); await A.page.waitForTimeout(500);
    v('⛔ Échap pendant un glisser (le fantôme était là), puis relâcher 0,9 s plus tard sur le rendez-vous : ni fiche ni feuille, plus de fantôme', [tireAvant, await A.page.evaluate(() => [document.documentElement.classList.contains('feuille-ouverte'), !!document.querySelector('.mjour-elt.fantome')])], [true, [false, false]]);
    await A.page.mouse.move(10, 10);

    console.log('\n── 6. Chez Bruno, l\'invité ──');
    const B = await ouvrir(b, svc.base, BUREAU, 'bruno');
    await agenda(B);
    if (semaineSuivante && jourSemaine(t0 + 3 * JOUR) !== 0) { /* la cible peut être dans la semaine courante */ }
    let vu = await attendre(B, ([t]) => document.getElementById('sem-grille').textContent.includes(t), [TITRE], 4000);
    if (!vu) { await toucher(B, '#sem-suiv'); vu = await attendre(B, ([t]) => document.getElementById('sem-grille').textContent.includes(t), [TITRE], 8000); }
    vrai('(population) la réunion est dans la grille de Bruno', vu);
    const bb = await B.page.evaluate(() => { const e = document.querySelector('#sem-grille [data-ag="r"]'); return e ? { bouge: e.classList.contains('bouge') } : null; });
    await B.page.mouse.click((await centre(B, '#sem-grille [data-ag="r"]')).x, (await centre(B, '#sem-grille [data-ag="r"]')).y, { button: 'right' });
    await attendre(B, () => !document.getElementById('menu-fond').hidden);
    const mb = await menu(B);
    v('le menu de l\'invité : Accepter, Peut-être, Refuser — ni « Décaler… » ni « Annuler la réunion… », et la réunion ne se tire pas', [bb && bb.bouge, ['Accepter', 'Peut-être', 'Refuser'].every(t => mb.actions.includes(t)), mb.actions.includes('Décaler…'), mb.actions.includes('Annuler la réunion…')], [false, true, false, false], mb);
    await B.page.locator('#menu-msg [data-ag-menu="reponse"][data-statut="accepte"]').click();
    vrai('« Accepter » depuis le menu : « Tu as accepté la réunion », et le service le sait', await attendre(B, () => /accepté/.test(document.getElementById('mot').textContent)) && (await br.get('/api/reunions/' + cr.j.reunion.id)).j.moi.statut === 'accepte');

    console.log('\n── 7. Au téléphone : la bande des jours, l\'appui long ──');
    const P = await ouvrir(b, svc.base, IPHONE, 'alice');
    await agenda(P);
    v('au téléphone, la bande des sept jours reste, la grille se range', await P.page.evaluate(() => [getComputedStyle(document.getElementById('sem-jours')).display, getComputedStyle(document.getElementById('sem-grille')).display]), ['grid', 'none']);
    /* aller au jour de la réunion par la bande (ou la semaine suivante) */
    const choisir = async (j) => { const ok = await P.page.evaluate(([x]) => { const [y, m, d] = x.split('-').map(Number), t = new Date(y, m - 1, d).getTime(), e = document.querySelector('#sem-jours [data-jour="' + t + '"]'); if (e) e.click(); return !!e; }, [j]); if (!ok) { await toucher(P, '#sem-suiv'); await P.page.waitForTimeout(400); await P.page.evaluate(([x]) => { const [y, m, d] = x.split('-').map(Number), t = new Date(y, m - 1, d).getTime(), e = document.querySelector('#sem-jours [data-jour="' + t + '"]'); if (e) e.click(); }, [j]); } };
    await choisir(CIBLE);
    await attendre(P, ([t]) => document.getElementById('liste-reunions').textContent.includes(t), [TITRE], 8000);
    const ligne = await P.page.locator('#liste-reunions [data-reunion]').first().boundingBox();
    vrai('(population) la ligne de la réunion est dans la liste du jour', !!ligne);
    const cdp = await P.ctx.newCDPSession(P.page);
    const tx = ligne.x + ligne.width / 2, ty = ligne.y + ligne.height / 2;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: tx, y: ty }] });
    await P.page.waitForTimeout(650);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await P.page.waitForTimeout(300);
    const mp = await menu(P);
    v('l\'appui long ouvre le menu en feuille du bas (la largeur de la feuille des messages, collée en bas, centrée), et le relâcher ne l\'a pas refermé', [mp.ouvert, mp.actions.includes('Décaler…'), mp.w >= 340, mp.bas >= 852 - 40, Math.abs(mp.x + mp.w / 2 - 393 / 2) <= 2], [true, true, true, true, true], mp);
    await capture(P, '4-menu-appui-long-iphone');
    await P.page.locator('#menu-msg [data-ag-menu="decaler"]').tap();
    vrai('« Décaler… » ouvre la feuille (le jour et l\'heure de la réunion)', await attendre(P, ([cj]) => document.getElementById('feuille-titre').textContent === 'Décaler le rendez-vous' && document.getElementById('dc-date') && document.getElementById('dc-date').value === cj && document.getElementById('dc-heure').value === '14:00', [CIBLE]));
    const tailles = await P.page.evaluate(() => Array.from(document.querySelectorAll('#info-corps input')).filter(x => x.getClientRects().length).map(x => parseFloat(getComputedStyle(x).fontSize)));
    v('iPhone : chaque champ de la feuille à 16 px au moins (Safari zoomerait)', [tailles.length >= 3, tailles.every(t => t >= 16)], [true, true], tailles);
    await toucher(P, '#info-corps [data-dc="non"]');

    console.log('\n── 7 bis. Sur iPad, au doigt : 44 px dans la semaine, la case entière au mois ──');
    const I = await ouvrir(b, svc.base, IPAD, 'alice');
    await agenda(I);
    if (semaineSuivante) { await toucher(I, '#sem-suiv'); await attendre(I, () => document.getElementById('liste-reunions').getAttribute('aria-busy') === 'false'); }
    await attendre(I, ([t]) => document.getElementById('sem-grille').textContent.includes(t), [TITRE], 8000);
    const ti = await I.page.evaluate(() => { const h = s => Array.from(document.querySelectorAll(s)).filter(e => e.getClientRects().length).map(e => Math.round(e.getBoundingClientRect().height));
      return { grille: getComputedStyle(document.getElementById('sem-grille')).display, doigt: matchMedia('(pointer: coarse)').matches, puces: h('#sem-grille .mjour-elt'), nums: h('#sem-grille .mjour-num') }; });
    v('iPad (820 px, au doigt) : la semaine en grille, et chaque rendez-vous et chaque numéro de jour répond sur 44 px au moins (population : des puces)', [ti.grille, ti.doigt, ti.puces.length > 0, ti.puces.every(x => x >= 44), ti.nums.length === 7 && ti.nums.every(x => x >= 44)], ['grid', true, true, true, true], ti);
    await toucher(I, '[data-reu-vue="mois"]');
    await attendre(I, () => !document.getElementById('mois').hidden && document.getElementById('liste-reunions').getAttribute('aria-busy') === 'false', null, 12000);
    let iMois = await attendre(I, ([t]) => document.getElementById('mois-jours').textContent.includes(t), [TITRE], 5000);
    if (!iMois) { await toucher(I, '#sem-suiv'); iMois = await attendre(I, ([t]) => document.getElementById('mois-jours').textContent.includes(t), [TITRE], 8000); }
    const pi = await I.page.evaluate(([t]) => { const e = Array.from(document.querySelectorAll('#mois-jours [data-ag="r"]')).find(x => x.textContent.includes(t)); if (!e) return null; const r = e.getBoundingClientRect(), c = e.closest('.mjour'); return { x: r.left + r.width / 2, y: r.top + r.height / 2, h: Math.round(r.height), t: +c.dataset.case, pe: getComputedStyle(e).pointerEvents }; }, [TITRE]);
    vrai('(population) au mois, la réunion est une puce de la case', iMois && !!pi, pi);
    await I.page.touchscreen.tap(pi.x, pi.y);
    vrai('⛔ au mois, au doigt, toucher la petite puce (' + (pi && pi.h) + ' px) choisit le JOUR (la case entière répond) et la liste du jour, dessous, porte la réunion — aucune fiche ne s\'ouvre par erreur',
      await attendre(I, ([t, ti2]) => { const c = document.querySelector('#mois-jours .mjour.choisi'); return !!c && +c.dataset.case === t && document.getElementById('liste-reunions').textContent.includes(ti2) && !document.documentElement.classList.contains('feuille-ouverte'); }, [pi.t, TITRE], 4000), pi);
    await I.page.evaluate(() => document.querySelector('[data-reu-vue="semaine"]').click());
    v('aucune erreur JavaScript sur iPad', I.erreurs, []);

    console.log('\n── 8. Le mois ; la fiche de l\'organisateur ──');
    await toucher(A, '[data-reu-vue="mois"]');
    await attendre(A, () => !document.getElementById('mois').hidden && document.getElementById('liste-reunions').getAttribute('aria-busy') === 'false', null, 12000);
    let dansMois = await attendre(A, ([t]) => document.getElementById('mois-jours').textContent.includes(t), [TITRE], 5000);
    if (!dansMois) { await toucher(A, '#sem-suiv'); dansMois = await attendre(A, ([t]) => document.getElementById('mois-jours').textContent.includes(t), [TITRE], 8000); }
    vrai('(population) la réunion est dans une case du mois', dansMois);
    await A.page.locator('#mois-jours [data-ag="r"]').first().click();
    vrai('un clic sur le rendez-vous d\'une case ouvre sa fiche (« Réunion »), et l\'organisateur y trouve « Décaler »', await attendre(A, () => document.getElementById('feuille-titre').textContent === 'Réunion' && !!document.querySelector('#info-corps [data-reu="decaler"]'), null, 12000));
    await toucher(A, '#info-corps [data-reu="decaler"]');
    vrai('« Décaler » de la fiche ouvre la feuille, à l\'horaire actuel', await attendre(A, ([cj]) => document.getElementById('feuille-titre').textContent === 'Décaler le rendez-vous' && document.getElementById('dc-date') && document.getElementById('dc-date').value === cj, [CIBLE]));
    await A.page.locator('#dc-heure').fill('14:00');
    await toucher(A, '#info-corps [data-dc="ok"]');
    vrai('le même horaire est refusé, et l\'écran le DIT (« C\'est déjà son horaire »)', await attendre(A, () => { const e = document.getElementById('info-erreur'); return e && !e.hidden && /déjà son horaire/.test(e.textContent); }));

    v('aucune erreur JavaScript', [A.erreurs, B.erreurs, P.erreurs], [[], [], []]);
  } catch (e) {
    /* ⛔ un geste qui n'aboutit pas (un élément jamais visible, une feuille jamais ouverte) est un CONSTAT, pas une mort : la sonde le dit, imprime son total et sort en 1 */
    vrai('la sonde va au bout de son parcours (arrêtée par : ' + String(e && e.message || e).split('\n')[0].slice(0, 200) + ')', false);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
