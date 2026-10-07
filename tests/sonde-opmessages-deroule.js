/* ══ SONDE — LES MENUS DÉROULANTS DES INFOS D'UNE CONVERSATION, DANS LA VRAIE PAGE SERVIE ═══════════════════════════════════════════════════════════════
   7 octobre 2026, capture à l'appui : « quand on clique sur Messages éphémères et Mettre en sourdine, il faudrait que ça soit en menu déroulant ». Le premier changeait de
   valeur à chaque toucher (24 h, 7 jours, 90 jours, désactivés…), la seconde était trois puces. Désormais : la ligne dit sa valeur (⌃⌄), le menu SORT d'elle, une coche
   devant le choix en cours — le « pop-up button » d'iOS et du Mac. Contre le VRAI service :
     1. téléphone (390 px, au doigt) : le menu s'ouvre, collé à la ligne et dans l'écran ; ses choix, sa coche, le focus sur le choix en cours ; « 24 heures » s'enregistre ;
     2. ⛔ le toucher qui referme le menu AU DEHORS ne fait rien d'autre (l'interrupteur voisin ne bascule pas) ;
     3. la sourdine : « Non » ; 8 heures → « Jusqu'à … » et le service a l'échéance ; le menu dit alors l'échéance et propose « Réactiver » ; « Toujours » se coche ;
     4. ⛔ un nouveau rendu de la feuille (le groupe renommé ailleurs) garde le menu OUVERT sur la nouvelle ligne ; une valeur changée ailleurs le REFERME ;
     5. un membre qui n'administre pas : la ligne dit la valeur, sans ⌃⌄, et ne s'ouvre pas ;
     6. « Nouveau groupe » : la même ligne, le même menu ;
     7. bureau (souris, clavier) : collé à la ligne, lignes de 34 px au moins ; ↑ ↓ Début Fin, Entrée choisit, ⛔ Échap referme le MENU et pas la feuille ;
     8. aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION ; ⛔ UNE GÉOMÉTRIE SE LIT APRÈS DEUX IMAGES.
   Lancer :   node tests/sonde-opmessages-deroule.js   (CAPTURES=/dossier pour les images)   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
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
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc' };
const TITRE_EPH = 'Les nouveaux messages disparaissent pour tous après ce délai';

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben);
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
    const G = (await A0.post('/api/conversations/groupe', { nom: 'Chantier Sud', membres: [B0.moi.id] })).j.conversation.id;
    const detail = async () => (await A0.get('/api/conversations/' + G)).j;
    const ouvrir = async (login, bureau, sombre) => {
      const ctx = await b.newContext(bureau ? { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'fr-FR', colorScheme: sombre ? 'dark' : 'light' }
        : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'fr-FR', colorScheme: sombre ? 'dark' : 'light' });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const S = { ctx, page, erreurs: [], bureau };
      page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      return S;
    };
    const att = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 100 }).then(() => true, () => false);
    const capture = async (S, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const toucher = (S, sel) => S.bureau ? S.page.locator(sel).first().click() : S.page.locator(sel).first().tap();
    const deuxImages = S => S.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { void document.body.offsetWidth; r(); }))));
    /* l'état du menu : ouvert, ses choix (libellé, coché), le titre, qui a le focus, et sa place par rapport à la ligne ouverte */
    const menu = S => S.page.evaluate(() => {
      const D = document.getElementById('deroule'), ouvert = !!D && D.matches(':popover-open');
      const ligne = document.querySelector('[aria-haspopup="menu"][aria-expanded="true"]');
      const choix = Array.from(document.querySelectorAll('#deroule-liste .deroule-choix')).map(x => ({ t: x.textContent.trim(), c: x.getAttribute('aria-checked'), role: x.getAttribute('role'), coche: !!x.querySelector('.deroule-coche svg'), h: Math.round(x.getBoundingClientRect().height) }));
      const t = document.getElementById('deroule-titre');
      const a = document.activeElement;
      let geo = null;
      if (ouvert && ligne) {
        const m = D.getBoundingClientRect(), l = ligne.getBoundingClientRect();
        geo = { droite: Math.round(m.right - l.right), dessous: Math.round(m.top - l.bottom), dessus: Math.round(l.top - m.bottom), dansEcran: m.left >= 0 && m.top >= 0 && m.right <= innerWidth + 0.5 && m.bottom <= innerHeight + 0.5, l: Math.round(m.width), haut: Math.round(m.height) };
      }
      return { ouvert, ligne: ligne ? ligne.dataset.act || ligne.id : null, nLignes: document.querySelectorAll('[aria-haspopup="menu"][aria-expanded="true"]').length, choix, titre: t && !t.hidden ? t.textContent : null, focus: a && a.classList.contains('deroule-choix') ? a.textContent.trim() : a ? (a.dataset.act || a.id || a.tagName) : null, sep: document.querySelectorAll('#deroule-liste .deroule-sep').length, geo };
    });
    const colle = g => !!g && Math.abs(g.droite) <= 1.5 && ((g.dessous >= 4 && g.dessous <= 8) || (g.dessus >= 4 && g.dessus <= 8)) && g.dansEcran;
    const valeur = (S, act) => S.page.evaluate(a => { const x = document.querySelector('#info-corps [data-act="' + a + '"] .reglage-valeur'); return x ? x.textContent.trim() : null; }, act);
    const infos = async S => {
      await S.page.evaluate(g => { location.hash = '#messages/' + g; }, G);
      await att(S, () => document.documentElement.dataset.conv === '1' && /Chantier Sud/.test(document.getElementById('conv-titre').textContent));
      await toucher(S, '#conv-titre');
      return att(S, () => document.getElementById('feuille-titre').textContent === 'Infos' && !!document.querySelector('#info-corps [data-act="ephemeres"]'));
    };

    /* ═══ 1. TÉLÉPHONE : les messages éphémères ═══ */
    console.log('\n1. Téléphone, au doigt : « Messages éphémères »');
    const A = await ouvrir('ana', false);
    vrai('population : Ana ouvre les infos de « Chantier Sud » (elle l\'administre)', await infos(A));
    v('la ligne : un menu (aria-haspopup), sa valeur « Désactivés », le signe ⌃⌄', await A.page.evaluate(() => { const r = document.querySelector('#info-corps [data-act="ephemeres"]'); return [r.getAttribute('aria-haspopup'), r.getAttribute('aria-expanded'), r.querySelector('.reglage-valeur').textContent.trim(), !!r.querySelector('.reglage-valeur .chev-ud'), r.disabled]; }), ['menu', 'false', 'Désactivés', true, false]);
    await toucher(A, '#info-corps [data-act="ephemeres"]'); await deuxImages(A);
    let m = await menu(A);
    v('le menu s\'ouvre (couche du dessus) sur la ligne ouverte', [m.ouvert, m.ligne, m.nLignes], [true, 'ephemeres', 1]);
    v('ses choix, la coche devant « Désactivés » seulement (menuitemradio)', m.choix.map(x => [x.t, x.c, x.role, x.coche]), [['Désactivés', 'true', 'menuitemradio', true], ['24 heures', 'false', 'menuitemradio', false], ['7 jours', 'false', 'menuitemradio', false], ['90 jours', 'false', 'menuitemradio', false]]);
    v('le titre dit ce que fait le réglage ; le focus est sur le choix en cours', [m.titre, m.focus], [TITRE_EPH, 'Désactivés']);
    vrai('⛔ COLLÉ à la ligne (bord droit aligné, 6 px dessous ou dessus) et entier dans l\'écran — ' + JSON.stringify(m.geo), colle(m.geo));
    vrai('au doigt : chaque choix fait 44 px au moins — ' + m.choix.map(x => x.h).join(', '), m.choix.length === 4 && m.choix.every(x => x.h >= 44));
    await capture(A, 'deroule-1-ephemeres-telephone');
    await A.page.locator('#deroule-liste .deroule-choix', { hasText: '24 heures' }).tap();
    vrai('« 24 heures » : le menu se referme, la ligne le dit', await att(A, () => !document.getElementById('deroule').matches(':popover-open') && document.querySelector('#info-corps [data-act="ephemeres"] .reglage-valeur').textContent.trim() === '24 heures'));
    v('le service l\'a retenu (86 400 s) ; le focus revient à la ligne', [(await detail()).conversation.ephemere_s, await A.page.evaluate(() => document.activeElement && document.activeElement.dataset.act)], [86400, 'ephemeres']);

    /* ═══ 2. le toucher qui referme au dehors ne fait rien d'autre ═══ */
    console.log('\n2. ⛔ Refermer au dehors ne touche pas ce qui est dessous');
    await toucher(A, '#info-corps [data-act="ephemeres"]'); await deuxImages(A);
    m = await menu(A);
    v('population : le menu est rouvert, coche sur « 24 heures »', [m.ouvert, m.choix.filter(x => x.c === 'true').map(x => x.t)], [true, ['24 heures']]);
    const annAvant = await A.page.evaluate(() => document.querySelector('#info-corps [data-act="annonces"]').getAttribute('aria-checked'));
    await A.page.locator('#info-corps [data-act="annonces"]').tap();
    await A.page.waitForTimeout(600);
    v('le menu est refermé, l\'interrupteur « Seuls les admins écrivent » n\'a PAS basculé (page et service)', [(await menu(A)).ouvert, await A.page.evaluate(() => document.querySelector('#info-corps [data-act="annonces"]').getAttribute('aria-checked')), (await detail()).conversation.annonces_seules ? 'true' : 'false'], [false, annAvant, annAvant]);
    await A.page.locator('#info-corps [data-act="annonces"]').tap();
    vrai('contre-épreuve : le toucher SUIVANT, lui, bascule l\'interrupteur', await att(A, (av) => document.querySelector('#info-corps [data-act="annonces"]').getAttribute('aria-checked') !== av, annAvant));
    await A.page.locator('#info-corps [data-act="annonces"]').tap();
    await att(A, (av) => document.querySelector('#info-corps [data-act="annonces"]').getAttribute('aria-checked') === av, annAvant);
    await toucher(A, '#info-corps [data-act="ephemeres"]'); await deuxImages(A);
    await toucher(A, '#info-corps [data-act="ephemeres"]');
    await A.page.waitForTimeout(500);
    v('toucher la ligne d\'un menu ouvert le REFERME (il ne se rouvre pas aussitôt)', (await menu(A)).ouvert, false);

    /* ═══ 3. la sourdine ═══ */
    console.log('\n3. La sourdine');
    v('la ligne « Mettre en sourdine » : un menu, valeur « Non »', await A.page.evaluate(() => { const r = document.querySelector('#info-corps [data-act="sourdine"]'); return r ? [r.getAttribute('aria-haspopup'), r.querySelector('.reglage-texte').textContent.trim(), r.querySelector('.reglage-valeur').textContent.trim()] : null; }), ['menu', 'Mettre en sourdine', 'Non']);
    await toucher(A, '#info-corps [data-act="sourdine"]'); await deuxImages(A);
    m = await menu(A);
    v('le menu : son titre, trois durées, rien de coché, pas de « Réactiver »', [m.ouvert, m.titre, m.choix.map(x => x.t), m.choix.filter(x => x.c === 'true').length, m.sep], [true, 'Plus de notification de cette conversation', ['8 heures', '1 semaine', 'Toujours'], 0, 0]);
    vrai('collé à sa ligne, dans l\'écran — ' + JSON.stringify(m.geo), colle(m.geo));
    await capture(A, 'deroule-2-sourdine-telephone');
    await A.page.locator('#deroule-liste .deroule-choix', { hasText: '8 heures' }).tap();
    vrai('« 8 heures » : la ligne dit « Jusqu\'à HH:MM » (ou « Jusqu\'à demain HH:MM »)', await att(A, () => /^Jusqu'à (demain )?\d\d:\d\d$/.test(document.querySelector('#info-corps [data-act="sourdine"] .reglage-valeur').textContent.trim())));
    const muet = (await detail()).moi.muet_jusqua;
    vrai('le service a l\'échéance (dans huit heures, à une minute près)', Math.abs(muet - (Date.now() + 8 * 3600000)) < 60000);
    await toucher(A, '#info-corps [data-act="sourdine"]'); await deuxImages(A);
    m = await menu(A);
    v('en sourdine, le menu dit l\'échéance, sans l\'année (« ' + m.titre + ' »), et propose d\'abord « Réactiver les notifications », puis les durées', [/^En sourdine jusqu'à (demain )?\d\d:\d\d$/.test(m.titre || ''), m.choix.map(x => x.t), m.sep], [true, ['Réactiver les notifications', '8 heures', '1 semaine', 'Toujours'], 1]);
    await capture(A, 'deroule-3-sourdine-posee');
    await A.page.locator('#deroule-liste .deroule-choix', { hasText: 'Toujours' }).tap();
    vrai('« Toujours » : la ligne dit « Toujours »', await att(A, () => document.querySelector('#info-corps [data-act="sourdine"] .reglage-valeur').textContent.trim() === 'Toujours'));
    await toucher(A, '#info-corps [data-act="sourdine"]'); await deuxImages(A);
    m = await menu(A);
    v('rouvert : « En sourdine pour toujours », « Toujours » coché', [m.titre, m.choix.filter(x => x.c === 'true').map(x => x.t)], ['En sourdine pour toujours', ['Toujours']]);
    await A.page.locator('#deroule-liste .deroule-choix', { hasText: 'Réactiver les notifications' }).tap();
    vrai('« Réactiver » : la ligne redit « Non »', await att(A, () => document.querySelector('#info-corps [data-act="sourdine"] .reglage-valeur').textContent.trim() === 'Non'));
    v('et le service n\'a plus d\'échéance', (await detail()).moi.muet_jusqua, 0);

    /* ═══ 4. un nouveau rendu pendant que le menu est ouvert ═══ */
    console.log('\n4. ⛔ La feuille se redessine pendant que le menu est ouvert');
    await toucher(A, '#info-corps [data-act="ephemeres"]'); await deuxImages(A);
    vrai('population : le menu est ouvert', (await menu(A)).ouvert);
    const ancienne = await A.page.evaluateHandle(() => document.querySelector('#info-corps [data-act="ephemeres"]'));
    await A0.post('/api/conversations/' + G + '/maj', { nom: 'Chantier Sud-Est' });
    vrai('le groupe renommé ailleurs : la feuille se redessine (nouveau nom, nouvelle ligne)', await att(A, () => /Chantier Sud-Est/.test(document.querySelector('#info-corps .info-nom').textContent)));
    await deuxImages(A);
    m = await menu(A);
    v('⛔ le menu reste OUVERT, sur la NOUVELLE ligne (une seule ligne ouverte, l\'ancienne est partie)', [m.ouvert, m.ligne, m.nLignes, await A.page.evaluate(x => x.isConnected, ancienne)], [true, 'ephemeres', 1, false]);
    vrai('et toujours collé à elle — ' + JSON.stringify(m.geo), colle(m.geo));
    await A0.post('/api/conversations/' + G + '/maj', { ephemere_s: 604800 });
    vrai('⛔ la valeur changée ailleurs (7 jours) : le menu se REFERME (sa coche mentirait), la ligne dit « 7 jours »', await att(A, () => !document.getElementById('deroule').matches(':popover-open') && document.querySelector('#info-corps [data-act="ephemeres"] .reglage-valeur').textContent.trim() === '7 jours'));
    v('aucune ligne ne se dit ouverte ; le focus est sur la ligne', await A.page.evaluate(() => [document.querySelectorAll('[aria-expanded="true"][aria-haspopup="menu"]').length, document.activeElement && document.activeElement.dataset.act]), [0, 'ephemeres']);

    /* ═══ 5. un membre qui n'administre pas ═══ */
    console.log('\n5. Un membre qui n\'administre pas');
    const B = await ouvrir('ben', false);
    vrai('population : Ben ouvre les infos', await infos(B));
    v('la ligne dit la valeur, sans ⌃⌄, sans menu, inactive', await B.page.evaluate(() => { const r = document.querySelector('#info-corps [data-act="ephemeres"]'); return [r.querySelector('.reglage-valeur').textContent.trim(), !!r.querySelector('.chev-ud'), r.getAttribute('aria-haspopup'), r.disabled]; }), ['7 jours', false, null, true]);
    { const bx = await B.page.locator('#info-corps [data-act="ephemeres"]').boundingBox(); await B.page.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); }
    await B.page.waitForTimeout(500);
    v('la toucher n\'ouvre rien', (await menu(B)).ouvert, false);
    vrai('sa sourdine à lui, elle, s\'ouvre (c\'est la sienne)', await (async () => { await toucher(B, '#info-corps [data-act="sourdine"]'); await deuxImages(B); return (await menu(B)).ouvert; })());
    await B.page.keyboard.press('Escape');
    vrai('Échap referme son menu ; la feuille reste', await att(B, () => !document.getElementById('deroule').matches(':popover-open') && document.documentElement.classList.contains('feuille-ouverte')));

    /* ═══ 6. « Nouveau groupe » ═══ */
    console.log('\n6. « Nouveau groupe » : la même ligne, le même menu');
    await A.page.keyboard.press('Escape');
    await att(A, () => !document.documentElement.classList.contains('feuille-ouverte'));
    await A.page.evaluate(() => { location.hash = '#messages'; });
    await att(A, () => document.documentElement.dataset.conv !== '1');
    await toucher(A, '#btn-plus');
    await att(A, () => !!document.querySelector('[data-nd-act="groupe"]'));
    await toucher(A, '[data-nd-act="groupe"]');
    vrai('population : la feuille « Nouveau groupe » est ouverte', await att(A, () => document.getElementById('feuille-titre').textContent === 'Nouveau groupe' && document.getElementById('g-ephemeres').getClientRects().length > 0));
    v('sa ligne : un menu, « Désactivés », ⌃⌄', await A.page.evaluate(() => { const r = document.getElementById('g-ephemeres'); return [r.getAttribute('aria-haspopup'), document.getElementById('g-ephemeres-val').textContent, !!r.querySelector('.chev-ud')]; }), ['menu', 'Désactivés', true]);
    await toucher(A, '#g-ephemeres'); await deuxImages(A);
    m = await menu(A);
    v('le menu s\'ouvre, sur cette ligne, coche sur « Désactivés »', [m.ouvert, m.ligne, m.choix.filter(x => x.c === 'true').map(x => x.t)], [true, 'g-ephemeres', ['Désactivés']]);
    vrai('collé à la ligne — ' + JSON.stringify(m.geo), colle(m.geo));
    await capture(A, 'deroule-4-nouveau-groupe');
    await A.page.locator('#deroule-liste .deroule-choix', { hasText: '7 jours' }).tap();
    v('« 7 jours » : la ligne le dit, le signe ⌃⌄ est toujours là', await A.page.evaluate(() => [document.getElementById('g-ephemeres-val').textContent, !!document.querySelector('#g-ephemeres .chev-ud'), document.getElementById('deroule').matches(':popover-open')]), ['7 jours', true, false]);
    await A.page.keyboard.press('Escape');

    /* ═══ 7. BUREAU : souris et clavier, jour et nuit ═══ */
    console.log('\n7. Bureau : souris, clavier, jour et nuit');
    for (const sombre of [false, true]) {
      const D = await ouvrir('ana', true, sombre);
      vrai('population (' + (sombre ? 'nuit' : 'jour') + ') : les infos s\'ouvrent au bureau', await infos(D));
      await toucher(D, '#info-corps [data-act="ephemeres"]'); await deuxImages(D);
      m = await menu(D);
      const attendue = { 0: 'Désactivés', 86400: '24 heures', 604800: '7 jours', 7776000: '90 jours' }[(await detail()).conversation.ephemere_s];
      v('(' + (sombre ? 'nuit' : 'jour') + ') le menu s\'ouvre, coche sur la valeur du service (« ' + attendue + ' »)', [m.ouvert, m.choix.filter(x => x.c === 'true').map(x => x.t)], [true, [attendue]]);
      vrai('collé à la ligne, dans l\'écran — ' + JSON.stringify(m.geo), colle(m.geo));
      vrai('lignes de 34 px au moins, texte de 15 px — ' + m.choix.map(x => x.h).join(', '), m.choix.every(x => x.h >= 34) && await D.page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('#deroule-liste .deroule-choix')).fontSize) === 15));
      const fond = await D.page.evaluate(() => { const s = getComputedStyle(document.getElementById('deroule')); return [s.backgroundColor !== 'rgba(0, 0, 0, 0)', /blur/.test(s.backdropFilter || s.webkitBackdropFilter || '')]; });
      v('une vitre AVEC sa matière (fond et flou)', fond, [true, true]);
      await capture(D, 'deroule-5-bureau-' + (sombre ? 'nuit' : 'jour'));
      if (sombre) { await D.ctx.close(); continue; }
      /* le clavier */
      await D.page.keyboard.press('ArrowDown');
      v('↓ : « 90 jours »', (await menu(D)).focus, '90 jours');
      await D.page.keyboard.press('ArrowDown');
      v('↓ en bout de liste : retour à « Désactivés »', (await menu(D)).focus, 'Désactivés');
      await D.page.keyboard.press('ArrowUp');
      v('↑ : « 90 jours »', (await menu(D)).focus, '90 jours');
      await D.page.keyboard.press('Home');
      v('Début : « Désactivés »', (await menu(D)).focus, 'Désactivés');
      await D.page.keyboard.press('End');
      v('Fin : « 90 jours »', (await menu(D)).focus, '90 jours');
      await D.page.keyboard.press('Escape');
      await D.page.waitForTimeout(300);
      v('⛔ Échap referme le MENU, pas la feuille ; le focus revient à la ligne', await D.page.evaluate(() => [document.getElementById('deroule').matches(':popover-open'), document.documentElement.classList.contains('feuille-ouverte'), document.activeElement && document.activeElement.dataset.act]), [false, true, 'ephemeres']);
      await D.page.keyboard.press('Enter'); await deuxImages(D);
      m = await menu(D);
      v('Entrée sur la ligne : le menu s\'ouvre, focus sur le choix en cours', [m.ouvert, m.focus], [true, '7 jours']);
      await D.page.keyboard.press('ArrowUp'); await D.page.keyboard.press('Enter');
      vrai('↑ puis Entrée : « 24 heures » s\'enregistre', await att(D, () => document.querySelector('#info-corps [data-act="ephemeres"] .reglage-valeur').textContent.trim() === '24 heures'));
      v('le service l\'a ; le focus est sur la ligne', [(await detail()).conversation.ephemere_s, await D.page.evaluate(() => document.activeElement && document.activeElement.dataset.act)], [86400, 'ephemeres']);
      await D.page.keyboard.press('Enter'); await deuxImages(D);
      await D.page.keyboard.press('Tab');
      await D.page.waitForTimeout(200);
      v('Tab referme le menu et poursuit depuis la ligne (le focus quitte le menu, reste dans la feuille)', await D.page.evaluate(() => [document.getElementById('deroule').matches(':popover-open'), !!document.activeElement && !document.activeElement.classList.contains('deroule-choix') && !!document.activeElement.closest('#feuille')]), [false, true]);
      /* la souris : un clic dehors ferme sans agir */
      await toucher(D, '#info-corps [data-act="ephemeres"]'); await deuxImages(D);
      await D.page.mouse.click(30, 30);
      await D.page.waitForTimeout(400);
      v('un clic hors de la feuille ferme le menu ET LAISSE la feuille ouverte (le voile n\'a pas reçu ce clic)', await D.page.evaluate(() => [document.getElementById('deroule').matches(':popover-open'), document.documentElement.classList.contains('feuille-ouverte')]), [false, true]);
      v('aucune erreur JavaScript (bureau)', D.erreurs, []);
      await D.ctx.close();
    }

    v('aucune erreur JavaScript (téléphone : Ana, Ben)', [A.erreurs, B.erreurs], [[], []]);
  } catch (e) {
    vrai('la sonde est morte : ' + (e && e.stack || e), false);
  } finally {
    try { await b.close(); } catch (e) {}
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
