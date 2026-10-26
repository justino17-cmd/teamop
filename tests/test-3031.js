/* ⛔ CE QUE CE FICHIER GARDE — PENDANT UN APPEL OU UNE RÉUNION, LA BANNIÈRE D'UNE AUTRE CONVERSATION RESTE, PLUS FINE, ET NE REÇOIT QUE LE TOUCHER DE SON BOUTON (Justin, 26 octobre 2026, décision #3,
   testeur « salle#4 »).

   Avant : la bannière d'arrivée d'un message (« Ana — Tu viens ? ») descendait par-dessus le titre et « Quitter » de la salle, et se touchait tout entière : un doigt qui visait « Quitter » ou le titre
   ouvrait la conversation de l'autre — et réduisait la salle. Maintenant, tant que l'écran d'appel est sous les yeux (`html[data-appel]`), elle est plus fine (une ligne de titre, le texte sur deux
   lignes au plus, une icône de 24 px, ni « maintenant » ni l'aide), son corps laisse passer le toucher (`pointer-events: none`) et son seul bouton, « Ouvrir », le reçoit (sa zone de toucher fait 44 px
   de haut, la bannière reste fine). Hors d'un appel, RIEN ne change : toute la bannière se touche, sans bouton.

   Ce banc MESURE dans un vrai Chromium (127.0.0.1, la page de l'aperçu, jour et nuit, un téléphone de 390 px et un bureau de 1280 px) — jamais le texte de la feuille de style :
     1. HORS APPEL : la bannière touchable reçoit le toucher partout (le point au centre est elle), le bouton « Ouvrir » n'existe pas à l'écran, la bannière garde sa hauteur d'avant ;
     2. ⛔ EN APPEL : le point au centre de la bannière est CE QUI EST DESSOUS (l'écran d'appel : le toucher passe), le bouton « Ouvrir » est là, 44 px de zone de toucher, sa pointe reçoit le toucher ;
        la bannière est plus fine que hors appel ; elle n'a plus « maintenant » ni l'aide ;
     3. un vrai clic au corps de la bannière ne fait RIEN (elle reste affichée, rien n'est ouvert) ; un vrai clic sur « Ouvrir » l'ouvre (la bannière part) ;
     4. une bannière qui ne mène nulle part n'a pas de bouton « Ouvrir » (même en appel) ; l'étiquette vocale du bouton dit où il mène ;
     5. le bouton est lisible : contraste ≥ 4,5:1 de jour comme de nuit.
   ⛔ Un banc de CSS ne cherche jamais un motif dans un commentaire : il MESURE. Sans Chromium il se saute et le dit. Lancer : node tests/test-3031.js   (CAPTURES=/dossier pour les images). */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();

let pw = null;
for (const c of ['playwright-core', '/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
const CHROME = process.env.CHROME_MSG || '/opt/pw-browsers/chromium';
const PEUT = !!pw && fs.existsSync(CHROME);
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.css': 'text/css', '.mp3': 'audio/mpeg' };
const CONV = 'conv:c_' + 'a1b2c3d4'.repeat(4);

(async () => {
  /* ── 0. `notifier` (la vraie) : le bouton « Ouvrir » suit la bannière — visible quand elle mène quelque part, avec l'étiquette de sa destination ── */
  console.log('0. `notifier` pose le bouton « Ouvrir »');
  {
    const P = require('./outils-page-reunions');
    const els = {}; const $ = (id) => els[id] || (els[id] = { textContent: '', hidden: true, dataset: {}, attrs: {}, classes: new Set(), classList: { toggle(c, on) { on ? els[this.id].classes.add(c) : els[this.id].classes.delete(c); }, add() {}, remove() {} }, setAttribute(k, x) { this.attrs[k] = x; } });
    for (const id of ['notif', 'notif-texte', 'notif-aide', 'notif-ouvrir']) { $(id); els[id].classList.id = id; els[id].classList = { id, toggle: (c, on) => { on ? els[id].classes.add(c) : els[id].classes.delete(c); }, add: (c) => els[id].classes.add(c), remove: () => {} }; }
    const M = P.monter({ notifier: P.decl('function notifier(') }, { $, ORDRE: ['messages', 'contacts'], minNotif: 0, clearTimeout: () => {}, setTimeout: () => 0 });
    vrai('(population) `notifier` est trouvée', !!M.F.notifier && M.absents.length === 0);
    M.F.notifier('Ana · Chantier Nord', 'Ouvrir…', CONV);
    v('une conversation : le bouton est visible, il dit « Ouvrir la conversation », la bannière est touchable', [els['notif-ouvrir'].hidden, els['notif-ouvrir'].attrs['aria-label'], els.notif.classes.has('touchable'), els.notif.dataset.vers], [false, 'Ouvrir la conversation', true, CONV]);
    M.F.notifier('Demande', '', 'contacts');
    v('les contacts : « Ouvrir les contacts »', [els['notif-ouvrir'].hidden, els['notif-ouvrir'].attrs['aria-label']], [false, 'Ouvrir les contacts']);
    M.F.notifier('Invitation', '', 'invitations');
    v('les invitations : « Ouvrir les invitations »', [els['notif-ouvrir'].hidden, els['notif-ouvrir'].attrs['aria-label']], [false, 'Ouvrir les invitations']);
    M.F.notifier('Message', 'Rien à ouvrir', '');
    v('⛔ une bannière qui ne mène nulle part : le bouton est caché (même pendant un appel, la feuille de style n\'affiche que les boutons non cachés), la bannière n\'est pas touchable', [els['notif-ouvrir'].hidden, els.notif.classes.has('touchable'), els.notif.dataset.vers], [true, false, '']);
  }
  if (!PEUT) { console.log('  — playwright-core ou Chromium absent : la mesure au navigateur n\'est pas exécutée'); fin(); return; }
  /* un petit serveur de fichiers sur 127.0.0.1 : la page de l'aperçu et ses voisins (jamais un site distant) */
  const srv = http.createServer((q, r) => {
    const f = path.join(RACINE, decodeURIComponent(q.url.split('?')[0]));
    if (!f.startsWith(RACINE)) { r.writeHead(403); r.end(); return; }
    fs.readFile(f, (e, d) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }), r.end(d)));
  });
  await new Promise((ok) => srv.listen(0, '127.0.0.1', ok));
  const base = 'http://127.0.0.1:' + srv.address().port + '/apercu/opmessages/index.html';
  let nav = null;
  try { nav = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.log('  — Chromium ne se lance pas (' + e.message.split('\n')[0] + ') : la mesure au navigateur n\'est pas exécutée'); srv.close(); fin(); return; }
  try {
    const PROFILS = [['iphone', { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['bureau', { viewport: { width: 1280, height: 800 } }]];
    for (const [nom, pf] of PROFILS) for (const nuit of [false, true]) {
      const mode = nom + (nuit ? ' · nuit' : ' · jour');
      console.log('\n── ' + mode + ' ──');
      const ctx = await nav.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', colorScheme: nuit ? 'dark' : 'light' }, pf));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 200)));
      await page.goto(base);
      const pret = await page.waitForFunction(() => !!document.getElementById('notif') && !!document.getElementById('notif-ouvrir') && document.getElementById('app') && !document.getElementById('app').hidden, null, { timeout: 15000 }).then(() => true, () => false);
      vrai('(population) la page de l\'aperçu est chargée avec sa bannière et son bouton « Ouvrir » (' + mode + ')', pret);
      /* deux trames ET une lecture forcée avant toute mesure de taille (CLAUDE.md) */
      const poser = () => page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth; void document.body.offsetHeight; });
      /* la bannière dans l'état où `notifier()` la laisse : posée, touchable (vers une conversation), son bouton visible ; le texte et l'aide d'un vrai message */
      const poserBanniere = (o) => page.evaluate(({ vers, aide }) => {
        const n = document.getElementById('notif'), b = document.getElementById('notif-ouvrir');
        document.getElementById('notif-texte').textContent = 'Ana · Chantier Nord'; document.getElementById('notif-aide').textContent = aide || '';
        n.dataset.vers = vers; n.classList.toggle('touchable', !!vers); n.classList.add('on'); b.hidden = !vers;
        b.setAttribute('aria-label', vers ? 'Ouvrir la conversation' : 'Ouvrir');
      }, o);
      const mesure = () => page.evaluate(() => {
        const n = document.getElementById('notif'), b = document.getElementById('notif-ouvrir'), r = n.getBoundingClientRect(), br = b.getBoundingClientRect(), cs = getComputedStyle(n), bs = getComputedStyle(b);
        const au = (x, y) => document.elementFromPoint(x, y);
        const centre = au(r.left + r.width / 2, r.top + r.height / 2), pointe = br.width ? au(br.left + br.width / 2, br.top + br.height / 2) : null;
        /* la zone de toucher du bouton : le point 5 px AU-DESSUS de son bord haut, encore dans la bannière */
        const haut = br.width ? au(br.left + br.width / 2, br.top - 5) : null;
        const rgb = (c) => { const m = /rgba?\(([^)]+)\)/.exec(c); return m ? m[1].split(',').slice(0, 3).map(Number) : null; };
        const lum = (c) => { const a = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
        const fb = rgb(bs.backgroundColor), fc = rgb(bs.color), ratio = fb && fc ? (Math.max(lum(fb), lum(fc)) + 0.05) / (Math.min(lum(fb), lum(fc)) + 0.05) : 0;
        return { haut: Math.round(r.height), larg: Math.round(r.width), pe: cs.pointerEvents, bpe: bs.pointerEvents, bdisp: bs.display, bh: Math.round(br.height), bhaut: !!(haut && haut.closest('#notif-ouvrir')),
          centreNotif: !!(centre && centre.closest('#notif')), centreSous: centre ? (centre.closest('#appel-ecran') ? 'appel' : centre.closest('#salle-ecran') ? 'salle' : centre.tagName) : null, pointeBouton: !!(pointe && pointe.closest('#notif-ouvrir')),
          maintenant: getComputedStyle(n.querySelector('.notif-tete span')).display, aide: getComputedStyle(document.getElementById('notif-aide')).display, ratio: Math.round(ratio * 100) / 100, opac: cs.opacity,
          img: Math.round(n.querySelector('img').getBoundingClientRect().width) };
      });
      const aide = 'Ouvrir pour répondre à tout le groupe sans quitter ce que tu fais.';
      /* — hors appel — */
      await poserBanniere({ vers: CONV, aide }); await poser();
      const hors = await mesure();
      await (DOSSIER ? (fs.mkdirSync(DOSSIER, { recursive: true }), page.screenshot({ path: path.join(DOSSIER, 'banniere-' + nom + (nuit ? '-nuit' : '-jour') + '-hors-appel.png') })) : null);
      v('(population) hors appel : la bannière est affichée et touchable', [hors.opac, hors.pe], ['1', 'auto']);
      v('⛔ hors appel : le centre de la bannière EST la bannière (elle reçoit le toucher partout, comme avant)', hors.centreNotif, true);
      v('hors appel : le bouton « Ouvrir » n\'est pas à l\'écran, « maintenant » et l\'aide si', [hors.bdisp, hors.maintenant === 'none', hors.aide === 'none'], ['none', false, false]);
      vrai('hors appel : la bannière garde sa hauteur d\'avant (au-delà de 70 px avec l\'aide, icône de 38 px)', hors.haut >= 70 && hors.img === 38);
      /* — en appel : on pose l'écran d'appel comme `afficherAppel` (data-appel) — */
      await page.evaluate(() => { document.documentElement.dataset.appel = '1'; }); await poserBanniere({ vers: CONV, aide }); await poser();
      const en = await mesure();
      await (DOSSIER ? page.screenshot({ path: path.join(DOSSIER, 'banniere-' + nom + (nuit ? '-nuit' : '-jour') + '-en-appel.png') }) : null);
      vrai('(population) en appel : l\'écran d\'appel est sous la bannière et la bannière est affichée', en.opac === '1' && en.centreSous === 'appel');
      v('⛔ en appel : le centre de la bannière n\'est PLUS la bannière : le toucher passe à l\'écran d\'appel qui est dessous', [en.pe, en.centreNotif, en.centreSous], ['none', false, 'appel']);
      v('⛔ en appel : le bouton « Ouvrir » est là, reçoit le toucher à sa pointe, et sa zone de toucher fait 44 px (un point à 5 px au-dessus de lui est encore lui)', [en.bdisp, en.bpe, en.pointeBouton, en.bhaut, en.bh >= 32], ['flex', 'auto', true, true, true]);
      vrai('⛔ en appel : la bannière est plus FINE (' + en.haut + ' px contre ' + hors.haut + ' hors appel) et tient en deux lignes de texte au plus : ≤ 56 px', en.haut < hors.haut && en.haut <= 56);
      v('… sans « maintenant » ni l\'aide, avec une icône de 24 px', [en.maintenant, en.aide, en.img], ['none', 'none', 24]);
      vrai('elle tient dans l\'écran (largeur ≤ celle de l\'écran, 440 au plus)', en.larg <= pf.viewport.width && en.larg <= 440);
      vrai('⛔ le bouton est lisible : contraste ' + en.ratio + ':1 (≥ 4,5)', en.ratio >= 4.5);
      /* — un vrai clic au corps de la bannière — */
      const bb = await page.evaluate(() => { const r = document.getElementById('notif').getBoundingClientRect(), b = document.getElementById('notif-ouvrir').getBoundingClientRect(); return { x: Math.round(r.left + 24), y: Math.round(r.top + r.height / 2), bx: Math.round(b.left + b.width / 2), by: Math.round(b.top + b.height / 2) }; });
      const hashAvant = await page.evaluate(() => location.hash);
      if (pf.hasTouch) await page.touchscreen.tap(bb.x, bb.y); else await page.mouse.click(bb.x, bb.y);
      await poser();
      v('⛔ un vrai clic au CORPS de la bannière ne fait rien : elle reste affichée (« on » posée) et l\'adresse n\'a pas bougé (la conversation de l\'autre n\'est pas ouverte)', await page.evaluate((h) => [document.getElementById('notif').classList.contains('on'), location.hash === h], hashAvant), [true, true]);
      /* — un vrai clic sur « Ouvrir » — */
      if (pf.hasTouch) await page.touchscreen.tap(bb.bx, bb.by); else await page.mouse.click(bb.bx, bb.by);
      await poser();
      vrai('⛔ un vrai clic sur « Ouvrir » l\'ouvre : la bannière part (le geste voulu passe)', await page.evaluate(() => !document.getElementById('notif').classList.contains('on')));
      /* — une bannière qui ne mène nulle part — */
      await poserBanniere({ vers: '', aide: '' }); await poser();
      const sans = await mesure();
      v('une bannière qui ne mène nulle part n\'a pas de bouton « Ouvrir », même en appel (rien à ouvrir)', [sans.bdisp, sans.pe], ['none', 'none']);
      /* — l'étiquette vocale — */
      await poserBanniere({ vers: CONV, aide: '' });
      v('l\'étiquette vocale du bouton dit où il mène', await page.evaluate(() => document.getElementById('notif-ouvrir').getAttribute('aria-label')), 'Ouvrir la conversation');
      /* — la fin de l'appel rend la bannière à son état d'avant — */
      await page.evaluate(() => { delete document.documentElement.dataset.appel; }); await poserBanniere({ vers: CONV, aide }); await poser();
      const apres = await mesure();
      v('⛔ l\'appel fini, la bannière redevient celle d\'avant (touchable partout, sans bouton, de la même hauteur)', [apres.centreNotif, apres.bdisp, apres.haut], [true, 'none', hors.haut]);
      v('aucune erreur JavaScript (' + mode + ')', erreurs, []);
      await ctx.close();
    }
  } finally {
    await nav.close(); srv.close();
  }
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
