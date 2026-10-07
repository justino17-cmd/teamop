/* ══ SONDE — DESSINER SUR L'ÉCRAN PARTAGÉ, ÉCRIRE, LE TABLEAU BLANC (la vraie page servie, trois navigateurs) ══════════════════════════════════════════════════════════════════
   7 octobre 2026 : « un système où on peut faire du partage d'écran, dessiner sur l'écran, ajouter du texte ». Contre le VRAI service : Ana (hôte, bureau), Ben (bureau), Cléo (TÉLÉPHONE, 390 px),
   un appel vidéo lancé depuis leur groupe (micros et caméras fabriqués par le navigateur ; l'écran partagé est une toile 1280 × 720 qui bouge) :
     1. personne ne partage : pas de « Annoter » ; Ben partage → « Annoter » paraît chez les trois, l'écran de Ben passe EN GRAND chez Ana et Cléo (pas chez Ben) ;
     2. Ana annote : un trait à la souris — ⛔ Cléo le voit SE TRACER avant qu'Ana lâche le bouton, et au MÊME endroit de l'image alors que sa vignette n'a pas la même taille (pixels relus
        sur son calque) ; un texte ; ⌘Z/Ctrl+Z le retire ; Cléo choisit le vert dans la palette et trace un rectangle qu'Ana voit en vert ;
     3. l'hôte réserve les annotations aux hôtes : « Annoter » disparaît chez Cléo ET chez Ben (son écran ne lui donne pas la main), reste chez Ana ; rendu à tous, il revient ;
     4. Ben arrête : la barre et le calque s'en vont, la vue revient en galerie ;
     5. Cléo ouvre un TABLEAU BLANC (Plus) : la vignette blanche paraît en grand chez les trois, Cléo est déjà en mode « Annoter » ; elle dessine, Ana le voit sur le blanc ; « Capturer » envoie
        l'image dans la discussion du groupe (une photo, légendée) ; Échap quitte le mode ; la barre tient dans les 390 px du téléphone, chaque bouton répond sur 44 px.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-annotations.js   (CAPTURES=/dossier pour les images)
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
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required',
  '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'];
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-1234567' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cleo Banc' };

/* l'écran partagé : une toile 1280 × 720 qui change (ce Chromium sans écran n'a rien à capturer) — la piste, l'émetteur et les autres sont les vrais */
const ECRAN = () => {
  const md = navigator.mediaDevices; if (!md) return;
  md.getDisplayMedia = async function () {
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g = cv.getContext('2d'); let k = 0;
    const fond = (window.__ecranN = (window.__ecranN || 0) + 1) % 2 ? '#243b6b' : '#8a1c1c';          // la seconde fenêtre choisie est ROUGE : « Changer de fenêtre » se voit chez les autres
    const dessiner = () => { k++; g.fillStyle = fond; g.fillRect(0, 0, 1280, 720); g.fillStyle = '#ffffff'; g.fillRect(80 + (k % 20) * 4, 80, 300, 40); };
    dessiner(); const iv = setInterval(dessiner, 100);
    const f = cv.captureStream(10); f.getTracks().forEach(t => { const arret = t.stop.bind(t); t.stop = function () { clearInterval(iv); arret(); }; });
    return f;
  };
};
/* relu DANS la page : le calque de la vignette du support, la boîte de l'image (calculée ici, indépendamment de la page), et la couleur d'un point de l'image (fx, fy entre 0 et 1) */
const LIRE = ([fx, fy, rayon]) => {
  const cv = document.querySelector('.annot-calque'); if (!cv || !cv.isConnected) return null;
  const t = cv.parentElement, W = t.clientWidth, H = t.clientHeight, v = t.id === 'salle-tableau' ? null : t.querySelector('video');
  const r = t.id === 'salle-tableau' ? 1.6 : v && v.videoWidth ? v.videoWidth / v.videoHeight : W / H, w = Math.min(W, H * r), h = w / r, bx = (W - w) / 2, by = (H - h) / 2;
  const k = cv.width / W, g = cv.getContext('2d'), R = rayon || 3;
  const x = Math.round((bx + fx * w) * k), y = Math.round((by + fy * h) * k);
  const d = g.getImageData(Math.max(0, x - R), Math.max(0, y - R), 2 * R + 1, 2 * R + 1).data;
  /* le point le plus « encré » de la fenêtre : opaque ET loin du blanc du tableau (sur le tableau, TOUT est opaque — le plus opaque serait le premier point venu) */
  let best = [0, 0, 0, 0], note = -1;
  for (let i = 0; i < d.length; i += 4) { const n = d[i + 3] * (Math.abs(d[i] - 251) + Math.abs(d[i + 1] - 251) + Math.abs(d[i + 2] - 253) + 1); if (n > note) { note = n; best = [d[i], d[i + 1], d[i + 2], d[i + 3]]; } }
  return { n: +cv.dataset.n || 0, tuile: t.id || t.dataset.uid || '', W, H, px: best };
};
const rouge = (px) => !!px && px[3] > 150 && px[0] > 200 && px[1] < 120 && px[2] < 120;
const vert = (px) => !!px && px[3] > 150 && px[1] > 150 && px[0] < 120 && px[2] < 140;

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], appels: { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben), C0 = await T.connecter(svc, og, 'cleo', MOTS.cleo);
    for (const [x, y] of [[A0, B0], [A0, C0], [B0, C0]]) { const l = await x.post('/api/contacts/lien', { max: 1 }); await y.post('/api/liens/accepter', { code: l.j.code }); }
    const G = (await A0.post('/api/conversations/groupe', { nom: 'Revue de projet', membres: [B0.moi.id, C0.moi.id] })).j.conversation.id;

    const ouvrir = async (login, tel) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', permissions: ['microphone', 'camera'], acceptDownloads: true },
        tel ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 } : { viewport: { width: 1280, height: 860 } }));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const S = { ctx, page, erreurs: [] }; page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.addInitScript(ECRAN);
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      return S;
    };
    const att = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
    const capture = async (S, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const visible = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && e.getClientRects().length > 0; };
    /* un geste de souris sur l'IMAGE du calque (fx, fy entre 0 et 1) */
    const pointSur = async (S, fx, fy) => S.page.evaluate(([fx, fy]) => {
      const cv = document.querySelector('.annot-calque'), t = cv.parentElement, r = cv.getBoundingClientRect(), W = t.clientWidth, H = t.clientHeight, v = t.id === 'salle-tableau' ? null : t.querySelector('video');
      const q = t.id === 'salle-tableau' ? 1.6 : v && v.videoWidth ? v.videoWidth / v.videoHeight : W / H, w = Math.min(W, H * q), h = w / q;
      return [r.left + (W - w) / 2 + fx * w, r.top + (H - h) / 2 + fy * h];
    }, [fx, fy]);
    const lire = (S, fx, fy, rayon) => S.page.evaluate(LIRE, [fx, fy, rayon || 3]);

    const A = await ouvrir('ana'), B = await ouvrir('ben'), C = await ouvrir('cleo', true);
    await A.page.evaluate(g => { location.hash = '#messages/' + g; }, G);
    await att(A, () => document.documentElement.dataset.conv === '1');
    await A.page.locator('#conv-cam').click();
    vrai('population : Ana est dans la salle', await att(A, () => document.documentElement.dataset.salle === '1', null, 20000));
    for (const S of [B, C]) { if (await att(S, () => { const x = document.getElementById('appel-repondre'); return !!x && x.getClientRects().length > 0; }, null, 20000)) await S.page.locator('#appel-repondre').click(); }
    vrai('population : Ben et Cléo sont dans la salle', await att(B, () => document.documentElement.dataset.salle === '1', null, 20000) && await att(C, () => document.documentElement.dataset.salle === '1', null, 20000));
    vrai('population : chez Ana, Ben et Cléo sont présents (deux vignettes)', await att(A, () => document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]').length === 2, null, 20000));

    console.log('\n1. Le support : un partage d\'écran');
    v('personne ne partage : « Annoter » n\'est proposé à personne', await Promise.all([A, B, C].map(S => S.page.evaluate(() => document.getElementById('salle-annoter').hidden))), [true, true, true]);
    /* Ben coupe sa caméra AVANT de partager : c'est le cas courant (on montre un document, pas son visage), et celui où l'écran se cachait derrière l'avatar */
    if (await B.page.evaluate(() => document.getElementById('salle-cam').getAttribute('aria-pressed') === 'true')) await B.page.locator('#salle-cam').click();
    vrai('population : la caméra de Ben est coupée', await att(B, () => document.getElementById('salle-cam').getAttribute('aria-pressed') === 'false'));
    await B.page.locator('#salle-partage').click();
    vrai('Ben partage : « Annoter » paraît chez les trois', await att(A, visible, 'salle-annoter') && await att(B, visible, 'salle-annoter') && await att(C, visible, 'salle-annoter'));
    const vueA = await A.page.evaluate(() => ({ vue: document.getElementById('salle-scene').dataset.vue, grand: (document.querySelector('#salle-scene > .salle-tuile.grand') || {}).dataset || {} }));
    v('chez Ana (et Cléo) la vue passe à « intervenant », l\'écran de Ben EN GRAND ; ⛔ chez Ben, rien ne bouge (il ne se regarde pas lui-même)',
      [vueA.vue, vueA.grand.ecran, await C.page.evaluate(() => document.getElementById('salle-scene').dataset.vue), await B.page.evaluate(() => document.getElementById('salle-scene').dataset.vue)], ['intervenant', '1', 'intervenant', 'galerie']);
    /* (le débit s'adapte : l'image peut arriver réduite, 960 × 540 — c'est sa PROPORTION, 16:9, qui compte pour les annotations) */
    const arrivee = () => { const v = document.querySelector('#salle-scene > .salle-tuile.grand video'); return !!v && v.videoWidth > 0 && Math.abs(v.videoWidth / v.videoHeight - 16 / 9) < 0.02; };
    vrai('l\'image partagée est arrivée chez Ana et Cléo (en 16:9, comme l\'écran de Ben)', await att(A, arrivee, null, 20000) && await att(C, arrivee, null, 20000));

    v('⛔ caméra coupée, l\'ÉCRAN de Ben se voit chez Ana : la vidéo est affichée, ni avatar ni « Caméra désactivée » par-dessus', await A.page.evaluate(() => { const t = document.querySelector('#salle-scene > .salle-tuile.grand'); return [getComputedStyle(t.querySelector('video')).display, getComputedStyle(t.querySelector('.tuile-av')).display, getComputedStyle(t.querySelector('.salle-sans-camera')).display]; }), ['block', 'none', 'none']);
    console.log('\n2. Ana annote');
    await A.page.locator('#salle-annoter').click();
    v('« Annoter » : la barre d\'outils paraît, le stylo est choisi, le calque prend la souris', await A.page.evaluate(() => [!document.getElementById('annot-barre').hidden, document.querySelector('#annot-barre [data-outil="stylo"]').getAttribute('aria-pressed'), getComputedStyle(document.querySelector('.annot-calque')).pointerEvents, document.getElementById('salle-annoter').getAttribute('aria-pressed')]), [true, 'true', 'auto', 'true']);
    const debut = await pointSur(A, 0.3, 0.3);
    await A.page.mouse.move(debut[0], debut[1]); await A.page.mouse.down();
    for (let i = 1; i <= 20; i++) { const p = await pointSur(A, 0.3 + 0.4 * i / 20, 0.3 + 0.3 * i / 20); await A.page.mouse.move(p[0], p[1]); await A.page.waitForTimeout(25); }
    vrai('⛔ Cléo voit le trait SE TRACER, avant qu\'Ana lâche le bouton', await att(C, () => { const c = document.querySelector('.annot-calque'); return !!c && c.dataset.n === '1'; }, null, 8000));
    await A.page.mouse.up();
    await att(C, () => true);
    await C.page.waitForTimeout(400);
    /* deux points du trait : son milieu, et un point près de son DÉBUT — loin du centre, là où des coordonnées prises sur la vignette (et pas sur l'image) s'écarteraient d'une taille d'écran à l'autre */
    const lc = await lire(C, 0.5, 0.45, 4), la = await lire(A, 0.5, 0.45, 4), lc2 = await lire(C, 0.34, 0.33, 4), la2 = await lire(A, 0.34, 0.33, 4);
    v('⛔ le trait tombe au MÊME endroit de l\'image chez Cléo (téléphone) et chez Ana (bureau), alors que leurs vignettes n\'ont pas la même taille : rouge au milieu et près du début, chez les deux',
      [rouge(lc && lc.px), rouge(la && la.px), rouge(lc2 && lc2.px), rouge(la2 && la2.px), !!lc && !!la && lc.W !== la.W], [true, true, true, true, true]);
    const ailleurs = await lire(C, 0.85, 0.15, 2);
    vrai('   et RIEN ailleurs (un point loin du trait reste transparent sur le calque de Cléo)', !!ailleurs && ailleurs.px[3] === 0);
    await capture(C, 'annot-telephone-trait');
    await A.page.locator('#annot-barre [data-outil="texte"]').click();
    const pt = await pointSur(A, 0.1, 0.75);
    await A.page.mouse.click(pt[0], pt[1]);
    vrai('le Texte : toucher l\'image ouvre un champ à cet endroit', await att(A, () => !!document.querySelector('.annot-saisie') && document.activeElement === document.querySelector('.annot-saisie')));
    await A.page.keyboard.type('Point clé à revoir'); await A.page.keyboard.press('Enter');
    vrai('Entrée pose le texte : Cléo a deux annotations', await att(C, () => (document.querySelector('.annot-calque') || {}).dataset.n === '2'));
    await capture(A, 'annot-bureau-texte');
    /* 8 octobre 2026 : « il faudrait pouvoir déplacer les textes » — avec l'outil Texte, Ana prend son texte et le fait glisser en haut à droite ; Cléo (téléphone) le voit à sa nouvelle place */
    const rougeVers = async (S, fx, fy, oui) => { for (let i = 0; i < 40; i++) { const l = await lire(S, fx, fy, 24); if (!!l && rouge(l.px) === oui) return true; await S.page.waitForTimeout(150); } return false; };
    vrai('population : le texte rouge est chez Cléo, en bas à gauche', await rougeVers(C, 0.13, 0.775, true));
    const d0 = await pointSur(A, 0.12, 0.77), d1 = await pointSur(A, 0.70, 0.12);
    await A.page.mouse.move(d0[0], d0[1]); await A.page.mouse.down();
    for (let i = 1; i <= 8; i++) await A.page.mouse.move(d0[0] + (d1[0] - d0[0]) * i / 8, d0[1] + (d1[1] - d0[1]) * i / 8);
    vrai('⛔ prendre son texte ne crée pas un nouveau champ (on le déplace, on n\'écrit pas)', await A.page.evaluate(() => !document.querySelector('.annot-saisie')));
    await A.page.mouse.up();
    vrai('⛔ Ana DÉPLACE son texte : chez Cléo (téléphone), il est en haut à droite…', await rougeVers(C, 0.71, 0.135, true));
    vrai('…et plus en bas à gauche', await rougeVers(C, 0.13, 0.775, false));
    vrai('…toujours deux annotations (le texte a bougé, il n\'a pas été recopié)', await att(C, () => (document.querySelector('.annot-calque') || {}).dataset.n === '2'));
    await capture(C, 'annot-telephone-texte-deplace');
    await A.page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
    vrai('⌘Z / Ctrl+Z retire le dernier geste d\'Ana : Cléo n\'en a plus qu\'une', await att(C, () => (document.querySelector('.annot-calque') || {}).dataset.n === '1'));
    await C.page.locator('#salle-annoter').click();
    await C.page.locator('#annot-couleur').click();
    vrai('Cléo ouvre la palette : huit couleurs et trois épaisseurs, sur des cibles de 44 px', await C.page.evaluate(() => { const l = Array.from(document.querySelectorAll('#annot-palette button')); return l.length === 11 && l.every(x => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().width >= 44); }));
    await C.page.locator('#annot-palette [data-couleur="vert"]').click();
    await C.page.locator('#annot-barre [data-outil="rect"]').click();
    const r1 = await pointSur(C, 0.15, 0.55), r2 = await pointSur(C, 0.35, 0.9);
    await C.page.mouse.move(r1[0], r1[1]); await C.page.mouse.down(); await C.page.mouse.move((r1[0] + r2[0]) / 2, (r1[1] + r2[1]) / 2); await C.page.mouse.move(r2[0], r2[1]); await C.page.mouse.up();
    vrai('Cléo trace un rectangle VERT : Ana le voit (deux annotations), vert sur son bord', await att(A, () => (document.querySelector('.annot-calque') || {}).dataset.n === '2') && vert((await lire(A, 0.25, 0.55, 4)).px));
    await capture(A, 'annot-bureau-rectangle');

    console.log('\n3. L\'hôte réserve les annotations aux hôtes');
    await A.page.locator('#salle-plus').click();
    vrai('population : le panneau Plus d\'Ana a « Tableau blanc et annotations »', await att(A, () => /Tableau blanc et annotations/.test(document.getElementById('salle-panneau-corps').textContent)));
    await A.page.locator('[data-sa="annot-permis"]').click();
    vrai('« Annotations des participants » coupé : chez Cléo, « Annoter » disparaît et son mode s\'éteint', await att(C, () => document.getElementById('salle-annoter').hidden && !document.getElementById('salle-ecran').hasAttribute('data-annoter')));
    v('   ⛔ chez Ben aussi, alors que c\'est SON écran (un partage s\'annonce, il ne donne pas la main) ; chez Ana (hôte), il reste', [await att(B, () => document.getElementById('salle-annoter').hidden), await A.page.evaluate(() => document.getElementById('salle-annoter').hidden)], [true, false]);
    await A.page.locator('[data-sa="annot-permis"]').click();
    vrai('rendu à tous : « Annoter » revient chez Cléo', await att(C, visible, 'salle-annoter'));
    await A.page.locator('#salle-panneau-fermer').click();

    console.log('\n3 ter. « Image dans l\'image » sur l\'écran de la réunion (8 octobre 2026)');
    const pipA = await A.page.evaluate(() => ({ permis: document.pictureInPictureEnabled === true, vu: !document.getElementById('salle-pip').hidden && document.getElementById('salle-pip').getClientRects().length > 0, rang: document.getElementById('salle-pip').parentElement === document.getElementById('salle-vue').parentElement }));
    v('la pastille « Image dans l\'image » est sur l\'écran de la réunion, à côté de « Vue », là où le navigateur le permet (ici : ' + (pipA.permis ? 'oui' : 'non') + ')', [pipA.vu, pipA.rang], [pipA.permis, true]);
    if (pipA.permis) {
      await A.page.locator('#salle-pip').click();
      vrai('la toucher ouvre l\'image flottante (la vidéo de l\'écran partagé), et la pastille le dit', await att(A, () => document.pictureInPictureElement && document.pictureInPictureElement.tagName === 'VIDEO' && document.getElementById('salle-pip').getAttribute('aria-pressed') === 'true', null, 6000));
      await A.page.locator('#salle-pip').click();
      vrai('la retoucher la ferme', await att(A, () => !document.pictureInPictureElement && document.getElementById('salle-pip').getAttribute('aria-pressed') === 'false', null, 6000));
    }

    console.log('\n3 bis. Ben change de fenêtre sans arrêter (8 octobre 2026)');
    const pxBen = (S) => S.page.evaluate((uid) => { const v = document.querySelector('#salle-scene .salle-tuile[data-uid="' + uid + '"] video'); if (!v || !v.videoWidth) return null; const c = document.createElement('canvas'); c.width = 8; c.height = 8; const g = c.getContext('2d'); g.drawImage(v, 0, 0, 8, 8); const d = g.getImageData(1, 6, 1, 1).data; return [d[0], d[1], d[2]]; }, B0.moi.id);
    const bleuAvant = await pxBen(A);
    vrai('population : Ana voit la fenêtre de Ben (bleue), et « Changer de fenêtre » n\'est proposé qu\'à Ben', !!bleuAvant && bleuAvant[2] > bleuAvant[0] && await B.page.evaluate(() => !document.getElementById('salle-partage-changer').hidden) && await A.page.evaluate(() => document.getElementById('salle-partage-changer').hidden), JSON.stringify(bleuAvant));
    vrai('population : il y a des annotations sur la fenêtre de Ben', await att(C, () => +(document.querySelector('.annot-calque') || {}).dataset.n > 0));
    await B.page.locator('#salle-partage-changer').click();
    let rougeApres = null; for (let i = 0; i < 40; i++) { rougeApres = await pxBen(A); if (rougeApres && rougeApres[0] > rougeApres[2] + 40) break; await A.page.waitForTimeout(150); }
    vrai('⛔ « Changer de fenêtre » : Ana voit la NOUVELLE fenêtre (rouge) dans la même vignette', !!rougeApres && rougeApres[0] > rougeApres[2] + 40, JSON.stringify(rougeApres));
    v('⛔ …sans que le partage s\'arrête : Ben partage toujours (« Arrêter »), le calque est toujours sur sa vignette chez Ana', [await B.page.evaluate(() => document.querySelector('#salle-partage .salle-cmd-texte').textContent), await A.page.evaluate(() => !!document.querySelector('.salle-tuile .annot-calque'))], ['Arrêter', true]);
    vrai('…et les annotations de l\'ancienne fenêtre sont effacées (elles tomberaient sur autre chose)', await att(C, () => (document.querySelector('.annot-calque') || {}).dataset.n === '0'));

    console.log('\n4. Ben arrête de partager');
    await B.page.locator('#salle-partage').click();
    vrai('chez Ben, « Changer de fenêtre » s\'efface avec le partage', await att(B, () => document.getElementById('salle-partage-changer').hidden));
    vrai('chez Ana : la barre d\'outils et le calque s\'en vont, « Annoter » disparaît, la vue revient en galerie', await att(A, () => document.getElementById('annot-barre').hidden && !document.querySelector('.annot-calque')?.isConnected && document.getElementById('salle-annoter').hidden && document.getElementById('salle-scene').dataset.vue === 'galerie'));

    console.log('\n5. Le tableau blanc');
    await C.page.locator('#salle-plus').click();
    await C.page.locator('[data-sa="tableau-ouvrir"]').click();
    vrai('Cléo ouvre un tableau blanc : la vignette « Tableau blanc » paraît EN GRAND chez les trois', await att(A, () => !!document.querySelector('#salle-tableau.grand')) && await att(B, () => !!document.querySelector('#salle-tableau.grand')) && await att(C, () => !!document.querySelector('#salle-tableau.grand')));
    vrai('   et Cléo y est déjà en mode « Annoter » (la barre est ouverte)', await att(C, () => !document.getElementById('annot-barre').hidden));
    const blanc = await lire(A, 0.9, 0.9, 1);
    vrai('le tableau est BLANC chez Ana (un point de l\'image)', !!blanc && blanc.px[0] > 240 && blanc.px[1] > 240 && blanc.px[2] > 240 && blanc.px[3] === 255);
    await C.page.locator('#annot-barre [data-outil="stylo"]').click();
    await C.page.locator('#annot-couleur').click(); await C.page.locator('#annot-palette [data-couleur="rouge"]').click();
    const s1 = await pointSur(C, 0.2, 0.5);
    await C.page.mouse.move(s1[0], s1[1]); await C.page.mouse.down();
    for (let i = 1; i <= 12; i++) { const p = await pointSur(C, 0.2 + 0.6 * i / 12, 0.5); await C.page.mouse.move(p[0], p[1]); await C.page.waitForTimeout(20); }
    await C.page.mouse.up();
    const vuA = await att(A, () => (document.querySelector('#salle-tableau .annot-calque') || {}).dataset.n === '1'), lA = await lire(A, 0.5, 0.5, 4);
    vrai('Cléo dessine sur le tableau : Ana voit le trait rouge sur le blanc', vuA && rouge(lA.px));
    await capture(C, 'annot-telephone-tableau');
    const barre = await C.page.evaluate(() => { const r = document.getElementById('annot-barre').getBoundingClientRect(); const l = Array.from(document.querySelectorAll('#annot-barre > button')).filter(x => !x.hidden); return { g: r.left, d: r.right, l: innerWidth, petits: l.filter(x => x.getBoundingClientRect().height < 44 || x.getBoundingClientRect().width < 44).length, n: l.length, depasse: document.documentElement.scrollWidth > innerWidth }; });
    v('au téléphone, la barre TIENT dans les 390 px (rien ne déborde) et chacun de ses ' + barre.n + ' boutons répond sur 44 px', [barre.g >= 0, barre.d <= barre.l, barre.petits, barre.depasse, barre.n >= 10], [true, true, 0, false, true]);
    await C.page.locator('#annot-capturer').click();
    let photo = null;
    for (let i = 0; i < 60 && !photo; i++) { const r = await A0.get('/api/conversations/' + G + '/messages'); const l = (r.j && (r.j.messages || r.j.items)) || []; photo = l.find(m => /Tableau blanc/.test(m.texte || '')) || null; if (!photo) await new Promise(ok => setTimeout(ok, 250)); }
    v('« Capturer » : l\'image du tableau part dans la discussion du groupe, en PHOTO légendée « Tableau blanc — … »', [!!photo, photo && photo.type, photo && /^Tableau blanc — /.test(photo.texte)], [true, 'photo', true]);
    /* 8 octobre 2026 : « quand on fait les captures d'écran ça marche pas » — la photo partait, mais la discussion de la SALLE n'en montrait que la légende */
    await A.page.locator('#salle-discussion').click();
    vrai('⛔ dans la discussion de la salle (Ana), la capture se VOIT : une image décodée, sa légende dessous', await att(A, () => Array.from(document.querySelectorAll('.salle-msg-photo')).some(x => { const i = x.querySelector('.salle-photo img'); return !!i && i.complete && i.naturalWidth > 100 && /^Tableau blanc — /.test((x.querySelector('.salle-photo-leg') || {}).textContent || ''); }), null, 15000),
      await A.page.evaluate(() => (document.getElementById('salle-panneau-corps') || {}).textContent || '').then(t => t.slice(0, 200)));
    await capture(A, 'annot-discussion-capture');
    await C.page.keyboard.press('Escape');
    vrai('Échap quitte le mode « Annoter » (la barre se range, le calque laisse passer le doigt)', await att(C, () => document.getElementById('annot-barre').hidden && getComputedStyle(document.querySelector('.annot-calque')).pointerEvents === 'none'));
    vrai('   ⛔ et Échap n\'a PAS quitté la salle', await C.page.evaluate(() => document.documentElement.dataset.salle === '1'));
    for (const [nom, S] of [['Ana', A], ['Ben', B], ['Cléo', C]]) v('aucune erreur JavaScript chez ' + nom, S.erreurs, []);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
