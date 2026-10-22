/* ══ OP MESSAGES — LA MISE EN PAGE : « UNE RÈGLE MANQUE, OU UNE MOITIÉ DE RÈGLE SURVIT À L'AUTRE » (lot m20, 17 octobre 2026) ═══════════════════════════════
   Huit défauts de CSS relevés par les agents d'essai de la bêta, mesurés ici DANS LA VRAIE PAGE SERVIE (le vrai service sur 127.0.0.1, un vrai Chromium) :

     medias#0    deux photos ou plus : les croix « Retirer la photo » s'empilaient TOUTES en haut à droite de l'ÉCRAN — le parent direct (`.ep-vig-l`, écrit par le JavaScript)
                 n'avait aucune règle, donc le bouton absolu remontait à l'aperçu plein écran : on ne pouvait retirer que la dernière. On TOUCHE le coin d'une vignette par
                 ses COORDONNÉES (jamais par sélecteur, qui trouve le bouton où qu'il soit) et on exige que SA photo parte ;
     medias#6    la tuile « Plus tard » de la feuille « + » n'avait pas de disque (fond transparent) : icône blanche sur blanc de jour ;
     medias#7    le titre des feuilles (Annuler / Fermer à gauche, Créer à droite) était décalé vers la droite : les deux boutons n'ont pas la même largeur ;
     contacts#9  fiche d'un contact à 360 px : les cinq gestes passaient 4 + 1, et « Programmer une réunion avec Ben » était coupé par une ellipse ;
     securite#1  un nom de 120 signes sans espace sortait de l'écran dans l'étiquette d'auteur d'un groupe (`.msg-nom`) ;
     appareils#0 chaque écran défilait de 1 px : les `.sr-seul` posés à la fin du document sont en position absolue SANS `top`, leur bas dépasse (ascenseur permanent sous Windows) ;
     appareils#1 Contacts au bureau défilait de 33 px : la fiche de droite fait `100vh − 52 px` et le contenu ajoute 32 px de marge basse ;
     salle@10    le lien d'invité : les boutons « Rejoindre en vidéo / en audio » touchaient le texte de la date et ne suivaient pas le centrage de la carte.

   ⛔ RÈGLES DE MESURE (CLAUDE.md) : toute largeur ou hauteur se lit après DEUX `requestAnimationFrame` ET une lecture forcée, et se CONFIRME à la seconde lecture ;
   un débordement finit par demander à la PAGE si elle bouge (`scrollTo` puis `scrollX` / `scrollY`) ; chaque absence est précédée de sa POPULATION (ce qui est comparé existe, et
   a été compté) ; une mutation du CSS doit faire tomber ces contrôles (voir le rapport du lot).
   ⛔ Un banc de CSS ne cherche jamais un motif dans un commentaire : il MESURE. Sans Chromium (ou sans les dépendances du service), il se saute et le dit.
   Lancer :   node tests/test-2600.js          CAPTURES=/dossier pour les images.   Code 1 si un contrôle tombe. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const F = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw = null;
for (const c of ['playwright-core', '/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
const CHROME = process.env.CHROME_MSG || '/opt/pw-browsers/chromium';
if (!pw || !fs.existsSync(CHROME)) {
  console.log('  — playwright-core ou Chromium absent : banc de mise en page non exécuté (il mesure dans un vrai navigateur)');
  console.log('\n0 ✓  0 ✗');
  process.exit(0);
}
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678' };
const NOMS = { ana: 'Ana Martin', ben: 'Ben Durand', cleo: 'Cléo Petit' };
const PARIS = 'Europe/Paris', H = 3600000;
/* ⛔ LE BANC ENVOIE SES INSTANTS (millisecondes UTC), JAMAIS « L'HEURE LOCALE DE CET INSTANT » : il raisonne en durées depuis MAINTENANT, et convertir un instant en heure
   de Paris perd l'heure vécue deux fois. Pris le 21 octobre 2026 : une réunion d'une heure qui commençait le 25 octobre à 2 h 32 (heure d'été) finissait à 2 h 32
   (heure d'hiver) — le texte « 02:32 → 02:32 » que le service lit, à bon droit, comme une fin égale au début (`fin_avant_debut`, 400). Aucune page ne l'envoie : celle
   d'OP MESSAGES additionne les durées sur l'horloge et refuse elle-même une fin qui n'est pas après le début ; `test-973` garde ce chemin, sur une horloge FIXE. */
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const UA_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';
const UA_MAC = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15';
const UA_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
const PROFILS = {
  iphone:  { viewport: { width: 390, height: 844 },  deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_IOS, colorScheme: 'dark' },
  android: { viewport: { width: 360, height: 800 },  deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: UA_ANDROID, colorScheme: 'dark' },
  mac:     { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, userAgent: UA_MAC, colorScheme: 'light' },
  windows: { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1, userAgent: UA_WIN, colorScheme: 'light' }
};
const PNG = [[220, 40, 40], [40, 160, 60], [40, 70, 220]].map(c => F.png({ w: 64, h: 64, couleur: c }));
const veut = (k) => !process.env.SEULS || process.env.SEULS.split(',').includes(k);   // SEULS=medias0,invite … pour ne rejouer qu'une section
const NOM_LONG = ['A'.repeat(60), 'N'.repeat(60)];   // 120 signes, aucune espace : le prénom et le nom que le service accepte au plus long

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], quotas: { piece: { max: 100000, fenetreMs: 3600000 } } } });
  let nav = null;
  try { nav = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.log('  — Chromium ne se lance pas (' + e.message.split('\n')[0] + ') : banc de mise en page non exécuté'); console.log('\n0 ✓  0 ✗'); await svc.arreter(); await og.fermer(); process.exit(0); }
  try {
    /* ── le monde : Ana, Ben, Cléo ; une conversation à deux, un groupe où Ana (au nom de 120 signes) écrit, une réunion dont Ana tient le lien ── */
    const C = {};
    for (const l of Object.keys(MOTS)) C[l] = await T.connecter(svc, og, l, MOTS[l]);
    for (const l of ['ben', 'cleo']) { const k = await C.ana.post('/api/contacts/lien', {}); await C[l].post('/api/liens/accepter', { code: k.j.code }); }
    const AB = (await C.ana.post('/api/conversations/directe', { uid: C.ben.moi.id })).j.conversation.id;
    const G = (await C.ana.post('/api/conversations/groupe', { nom: 'Chantier Nord', membres: [C.ben.moi.id, C.cleo.moi.id] })).j.conversation.id;
    await C.ben.post('/api/conversations/' + AB + '/messages', { cid: 'c-ben-0001', texte: 'Salut Ana, tu es dispo samedi ?' });
    await C.cleo.post('/api/conversations/' + G + '/messages', { cid: 'c-cleo-0001', texte: 'Les plans sont arrivés.' });
    const maj = await C.ana.post('/api/moi/maj', { prenom: NOM_LONG[0], nom: NOM_LONG[1] });
    vrai('population : le service accepte le nom de 120 signes d\'Ana (' + maj.code + ')', maj.code === 200);
    const dit = await C.ana.post('/api/conversations/' + G + '/messages', { cid: 'c-ana-0001', texte: 'Réunion demain matin ?' });
    v('population : Ana écrit dans le groupe (sous son nom de 120 signes)', dit.code, 201);
    const debut = Date.now() + 2 * 60000;
    const reu = await C.ana.post('/api/reunions', { titre: 'Point chantier', debut, fin: debut + H, tz: PARIS, invites: [C.ben.moi.id], rappels: [15], notifier: false });
    const lien = reu.j && reu.j.reunion ? await C.ana.post('/api/reunions/' + reu.j.reunion.id + '/lien', {}) : null;
    const codeLien = lien && lien.j && lien.j.code;

    /* ── une session = un navigateur d'un profil, connecté ── */
    const ouvrir = async (nom, login, extra) => {
      const pf = PROFILS[nom], tactile = !!pf.hasTouch;
      const ctx = await nav.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS, baseURL: svc.base }, pf, extra || {}));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 200)));
      const S = { ctx, page, nom, tactile, pf, erreurs };
      S.attendre = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);
      S.toucher = async (sel) => { const l = page.locator(sel).filter({ visible: true }).first(); if (tactile) await l.tap(); else await l.click(); };
      S.capture = async (n) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await page.screenshot({ path: path.join(DOSSIER, nom + '-' + n + '.png') }); };
      S.aller = async (h) => { await page.evaluate(x => { location.hash = x; }, h); };
      /* une VRAIE ouverture d'un lien (page neuve, la session reste) : c'est ce que fait l'invité qui touche le lien — pas un changement de `#` dans une page déjà ouverte */
      S.ouvrirLien = async (h) => { await page.goto('about:blank'); await page.goto(svc.base + '/' + h); };
      /* deux trames ET une lecture forcée, avant toute mesure de taille */
      S.poser = () => page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth; void document.body.offsetHeight; });
      await page.goto(svc.base + '/');
      /* ⛔ depuis le lot m02 l'écran d'ouverture est la connexion par ADRESSE (`#f-mel`) ; l'accès d'essai (`#c-login`) s'atteint par le lien « Accès d'essai (Tour de contrôle) » — on le touche
         comme une vraie personne, sans jamais forcer l'affichage d'un panneau masqué. Les deux sont prouvés présents avant d'agir (une attente vide ne prouverait rien). */
      const essaiDirect = await S.attendre(() => { const c = document.getElementById('c-login'), l = document.querySelector('#f-mel [data-cx-essai]'); return (c && c.getClientRects().length > 0) || (l && !l.hidden && l.getClientRects().length > 0); }, null, 15000);
      vrai('population : l\'écran de connexion propose l\'accès d\'essai (' + nom + ')', essaiDirect);
      if (await page.evaluate(() => { const c = document.getElementById('c-login'); return !(c && c.getClientRects().length > 0); })) await S.toucher('#f-mel [data-cx-essai]');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await S.toucher('#c-entrer');
      vrai('population : ' + NOMS[login] + ' est connecté(e) (' + nom + ')', await S.attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }));
      return S;
    };
    const rect = (sel, i) => ({ sel, i });

    /* ═══ medias#0 — chaque vignette porte SA croix, dans son coin, et elle retire SA photo ═══════════════════════════════════════════════ */
    for (const nom of veut('medias0') ? ['iphone', 'mac'] : []) {
      console.log('\n── medias#0 : les croix des photos empilées (' + nom + ') ──');
      const S = await ouvrir(nom, 'ana');
      await S.aller('#messages/' + AB);
      vrai('population : la conversation avec Ben est ouverte', await S.attendre(() => { const x = document.getElementById('saisie'); return !!x && x.getClientRects().length > 0; }));
      await S.page.locator('#compo-fichier').setInputFiles(PNG.map((buf, i) => ({ name: 'photo' + i + '.png', mimeType: 'image/png', buffer: buf })));
      vrai('population : l\'aperçu s\'ouvre avec TROIS vignettes chargées', await S.attendre(() => document.querySelectorAll('#ep-vignettes .ep-vig').length === 3 && Array.from(document.querySelectorAll('#ep-vignettes .ep-vig img')).every(i => i.complete && i.naturalWidth > 0)));
      await S.poser();
      const geo = await S.page.evaluate(() => Array.from(document.querySelectorAll('#ep-vignettes .ep-vig-l')).map(l => { const g = x => { const r = x.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); }; return { vig: g(l.querySelector('.ep-vig')), croix: g(l.querySelector('.ep-retirer')), src: l.querySelector('.ep-vig img').getAttribute('src') }; }));
      v('population : trois couples vignette / croix mesurés', geo.length, 3);
      v('⛔ les trois croix ne sont pas toutes au même endroit (toutes dans le coin de l\'écran)', new Set(geo.map(g => g.croix.join())).size, 3);
      v('⛔ chaque croix est DANS le coin haut droit de SA vignette', geo.map(g => g.croix[0] >= g.vig[0] && g.croix[2] <= g.vig[2] + 1 && g.croix[1] >= g.vig[1] && g.croix[3] <= g.vig[3]), [true, true, true]);
      await S.capture('medias0-avant');
      /* on TOUCHE le coin de la première vignette, par ses coordonnées : la croix de la photo 1 doit y répondre */
      const g0 = geo[0], x = g0.vig[2] - 11, y = g0.vig[1] + 11;
      if (S.tactile) await S.page.touchscreen.tap(x, y); else await S.page.mouse.click(x, y);
      vrai('toucher le coin de la vignette 1 retire une photo (' + x + ', ' + y + ')', await S.attendre(() => document.querySelectorAll('#ep-vignettes .ep-vig').length === 2 || document.querySelectorAll('#ep-vignettes .ep-vig').length === 0));
      const reste = await S.page.evaluate(() => Array.from(document.querySelectorAll('#ep-vignettes .ep-vig img')).map(i => i.getAttribute('src')));
      v('⛔ c\'est la PHOTO 1 qui est partie : restent la 2 et la 3, dans l\'ordre', reste, [geo[1].src, geo[2].src]);
      v('aucune erreur JavaScript', S.erreurs, []);
      await S.ctx.close();
    }

    /* ═══ medias#6 — la tuile « Plus tard » a un disque de couleur, comme les autres ═══════════════════════════════════════════════════ */
    for (const nom of veut('medias6') ? ['mac', 'android'] : []) {
      console.log('\n── medias#6 : le disque de « Plus tard » (' + nom + ') ──');
      const S = await ouvrir(nom, 'ana');
      await S.aller('#messages/' + AB);
      vrai('population : la conversation est ouverte', await S.attendre(() => { const x = document.getElementById('saisie'); return !!x && x.getClientRects().length > 0; }));
      await S.toucher('#compo-plus');
      vrai('population : la feuille « + » montre ses tuiles', await S.attendre(() => document.querySelectorAll('#menu-msg .pj-tuile').length >= 5));
      await S.poser();
      const d = await S.page.evaluate(() => Object.fromEntries(Array.from(document.querySelectorAll('#menu-msg .pj-tuile')).map(b => [b.dataset.plus, getComputedStyle(b.querySelector('.pj-disque')).backgroundColor])));
      vrai('population : « Plus tard » est dans la feuille (' + Object.keys(d).join(', ') + ')', d['plus-tard'] !== undefined);
      v('chaque tuile a un disque opaque (aucune « rgba(0, 0, 0, 0) »)', Object.entries(d).filter(([, c]) => /rgba\(0, 0, 0, 0\)|transparent/.test(c)).map(([k]) => k), []);
      v('« Plus tard » n\'emprunte pas la couleur d\'une autre tuile', Object.entries(d).filter(([k, c]) => k !== 'plus-tard' && c === d['plus-tard']).map(([k]) => k), []);
      await S.capture('medias6');
      v('aucune erreur JavaScript', S.erreurs, []);
      await S.ctx.close();
    }

    /* ═══ medias#7 — le titre d'une feuille est CENTRÉ sur la feuille, quels que soient les boutons de la barre ═══════════════════════════ */
    const centre = (S) => S.page.evaluate(async () => {
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.body.offsetWidth;
      const t = document.getElementById('feuille-titre'), f = document.getElementById('feuille'), bt = Array.from(document.querySelectorAll('#feuille .feuille-barre > *')).filter(e => e !== t && e.getClientRects().length > 0 && getComputedStyle(e).display !== 'none').map(e => { const g = document.createRange(); g.selectNodeContents(e); return Math.round(g.getBoundingClientRect().width); });
      const a = t.getBoundingClientRect(), b = f.getBoundingClientRect();
      return { titre: t.textContent, ecart: Math.round(((a.left + a.width / 2) - (b.left + b.width / 2)) * 10) / 10, boutons: bt, visible: a.width > 0 };
    });
    for (const nom of veut('medias7') ? ['iphone', 'android', 'mac'] : []) {
      console.log('\n── medias#7 : le titre des feuilles (' + nom + ') ──');
      const S = await ouvrir(nom, 'ana');
      await S.aller('#messages/' + G);
      vrai('population : le groupe est ouvert', await S.attendre(() => { const x = document.getElementById('saisie'); return !!x && x.getClientRects().length > 0; }));
      await S.toucher('#compo-plus');
      await S.attendre(() => !!document.querySelector('#menu-msg [data-plus="sondage"]'));
      await S.page.waitForTimeout(500);
      await S.toucher('#menu-msg [data-plus="sondage"]');
      vrai('population : la feuille « Nouveau sondage » est ouverte', await S.attendre(() => document.documentElement.classList.contains('feuille-ouverte') && /sondage/i.test(document.getElementById('feuille-titre').textContent)));
      await S.page.waitForTimeout(500);
      let m = await centre(S);
      vrai('population : un bouton Annuler et un bouton Créer, de libellés INÉGAUX, encadrent le titre (' + m.boutons.join(' ≠ ') + ' px de texte)', m.boutons.length >= 2 && m.boutons[0] !== m.boutons[m.boutons.length - 1]);
      vrai('⛔ « ' + m.titre + ' » est centré sur la feuille (écart ' + m.ecart + ' px, 1,5 au plus)', Math.abs(m.ecart) <= 1.5);
      await S.page.waitForTimeout(700); m = await centre(S);
      vrai('   …et à la seconde lecture (' + m.ecart + ' px)', Math.abs(m.ecart) <= 1.5);
      await S.capture('medias7-sondage');
      await S.page.keyboard.press('Escape');
      await S.page.waitForTimeout(400);
      /* la feuille « Nouvelle discussion » (Fermer rond, bouton de gauche masqué mais gardé dans la ligne) */
      await S.aller('#messages');
      await S.attendre(() => { const b = document.getElementById('btn-plus'); return !!b && b.getClientRects().length > 0 && !document.documentElement.classList.contains('feuille-ouverte'); });
      if (nom !== 'mac' || true) { await S.toucher('#btn-plus'); }
      const ouverte = await S.attendre(() => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent.trim().length > 0);
      if (ouverte) { await S.page.waitForTimeout(500); const m2 = await centre(S); vrai('« ' + m2.titre + ' » est centré sur la feuille (écart ' + m2.ecart + ' px)', Math.abs(m2.ecart) <= 1.5); await S.capture('medias7-nouvelle'); }
      else vrai('population : la feuille « + » de la liste s\'ouvre', false);
      v('aucune erreur JavaScript', S.erreurs, []);
      await S.ctx.close();
    }
    if (veut('invite')) {
      const S = await ouvrir('mac', 'ben');
      console.log('\n── medias#7 : la feuille d\'un lien d\'invité (seulement « Fermer » à gauche) ──');
      if (codeLien) {
        await S.ouvrirLien('#reunion=' + codeLien);
        vrai('population : la feuille « Réunion » de l\'invité s\'ouvre', await S.attendre(() => document.documentElement.classList.contains('feuille-ouverte') && /Point chantier/.test(document.getElementById('info-corps').textContent)));
        await S.page.waitForTimeout(500);
        const m = await centre(S);
        vrai('⛔ « ' + m.titre + ' » est centré sur la feuille (écart ' + m.ecart + ' px, 1,5 au plus)', Math.abs(m.ecart) <= 1.5);
      } else vrai('population : le lien d\'invité existe', false);
      await S.ctx.close();
    }

    /* ═══ contacts#9 — à 360 px, les cinq gestes de la fiche tiennent sur UNE ligne, et la ligne « Programmer une réunion » se lit en entier ═ */
    if (veut('contacts9')) {
      console.log('\n── contacts#9 : la fiche d\'un contact à 360 px ──');
      const S = await ouvrir('android', 'ana');
      await S.aller('#contacts');
      vrai('population : Ben est dans les contacts', await S.attendre(() => Array.from(document.querySelectorAll('#vc-corps [data-act="vc-ecrire"]')).some(x => /Ben Durand/.test(x.textContent))));
      await S.toucher('#vc-corps [data-act="vc-ecrire"][data-uid="' + C.ben.moi.id + '"]');
      vrai('population : la feuille de sa fiche est ouverte, avec ses gestes et la ligne « Programmer »', await S.attendre(() => document.getElementById('feuille').dataset.mode === 'personne' && document.querySelectorAll('#info-corps .vc-action').length >= 4 && !!document.querySelector('#info-corps [data-fiche="programmer"].fc-ligne .fc-titre')));
      await S.page.waitForTimeout(500);
      const lire = () => S.page.evaluate(async () => {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.body.offsetWidth;
        const g = Array.from(document.querySelectorAll('#info-corps .vc-action')).filter(x => x.getClientRects().length).map(x => ({ t: x.textContent.trim(), x: Math.round(x.getBoundingClientRect().left), y: Math.round(x.getBoundingClientRect().top), w: Math.round(x.getBoundingClientRect().width), coupe: x.scrollWidth > x.clientWidth + 1 }));
        const p = document.querySelector('#info-corps [data-fiche="programmer"].fc-ligne .fc-titre'), pr = p.getBoundingClientRect();
        return { g, prog: { texte: p.textContent, coupe: p.scrollWidth > p.clientWidth + 1 && getComputedStyle(p).whiteSpace === 'nowrap', lignes: Math.round(pr.height / parseFloat(getComputedStyle(p).lineHeight || '20')), haut: Math.round(pr.height) }, larg: innerWidth };
      });
      let m = await lire(); await S.page.waitForTimeout(600); const m2 = await lire();
      v('population : cinq gestes (Message, Appeler, Vidéo, Réunion, Favoris)', m.g.length, 5);
      v('⛔ les cinq gestes sont sur UNE ligne (4 + 1 avant) : ' + JSON.stringify(m.g.map(x => [x.x, x.y])), new Set(m.g.map(x => x.y)).size, 1);
      v('   …et à la seconde lecture', new Set(m2.g.map(x => x.y)).size, 1);
      v('   aucun libellé de geste n\'est coupé', m2.g.filter(x => x.coupe).map(x => x.t), []);
      vrai('⛔ « ' + m2.prog.texte + ' » se lit en entier (pas d\'ellipse sur une seule ligne)', !m2.prog.coupe);
      await S.capture('contacts9');
      v('aucune erreur JavaScript', S.erreurs, []);
      await S.ctx.close();
    }

    /* ═══ securite#1 — un nom de 120 signes sans espace reste dans la colonne ═════════════════════════════════════════════════════════════ */
    for (const nom of veut('securite1') ? ['iphone', 'android'] : []) {
      console.log('\n── securite#1 : l\'étiquette d\'auteur de 120 signes (' + nom + ') ──');
      const S = await ouvrir(nom, 'ben');
      await S.aller('#messages/' + G);
      vrai('population : le groupe est ouvert, et il porte l\'étiquette d\'Ana', await S.attendre(() => Array.from(document.querySelectorAll('.msg-nom')).some(e => e.textContent.length >= 50 && e.getClientRects().length > 0)));
      const lire = () => S.page.evaluate(async () => {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.body.offsetWidth;
        const e = Array.from(document.querySelectorAll('.msg-nom')).find(x => x.textContent.length >= 50), r = e.getBoundingClientRect();
        window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
        return { len: e.textContent.length, droite: Math.round(r.right), larg: innerWidth, sx };
      });
      const m = await lire(); await S.page.waitForTimeout(700); const m2 = await lire();
      v('population : l\'étiquette porte les 60 signes du prénom d\'Ana (rien n\'est tronqué par le service)', m.len, 60);
      vrai('⛔ l\'étiquette reste dans l\'écran : right = ' + m.droite + ' pour ' + m.larg, m.droite <= m.larg);
      vrai('   …et à la seconde lecture (' + m2.droite + ')', m2.droite <= m2.larg);
      v('   la page elle-même ne glisse pas de côté (poussée ' + m2.sx + ' px)', m2.sx, 0);
      await S.capture('securite1');
      v('aucune erreur JavaScript', S.erreurs, []);
      await S.ctx.close();
    }

    /* ═══ appareils#0 et #1 — aucun écran ne défile pour rien ═══════════════════════════════════════════════════════════════════════════════ */
    for (const nom of veut('appareils') ? ['iphone', 'android', 'mac', 'windows'] : []) {
      console.log('\n── appareils#0 / #1 : la page ne défile pas pour rien (' + nom + ') ──');
      const S = await ouvrir(nom, 'ana');
      const pop = await S.page.evaluate(() => Array.from(document.body.children).filter(e => e.classList.contains('sr-seul')).map(e => e.id));
      vrai('population : les .sr-seul posés à la fin du document sont là (' + pop.join(', ') + ')', pop.length >= 3);
      for (const [vue, hash] of [['messages', '#messages'], ['contacts', '#contacts'], ['appels', '#appels'], ['agenda', '#reunions']]) {
        await S.aller(hash);
        await S.attendre(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden && s.getClientRects().length > 0; }, vue === 'agenda' ? 'reunions' : vue);
        await S.page.waitForTimeout(400);
        const lire = () => S.page.evaluate(async () => {
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
          const d = document.documentElement; window.scrollTo(0, 9999); const sy = window.scrollY; window.scrollTo(0, 0);
          return { exces: d.scrollHeight - innerHeight, sy, ih: innerHeight, sh: d.scrollHeight };
        });
        const m = await lire(); await S.page.waitForTimeout(700); const m2 = await lire();
        vrai('population : la vue ' + vue + ' est affichée (fenêtre ' + m.ih + ' px)', m.ih > 0);
        vrai('⛔ ' + vue + ' : la page ne défile pas (scrollHeight − innerHeight = ' + m.exces + ', poussée ' + m.sy + ' px)', m.exces <= 0 && m.sy === 0);
        vrai('   …et à la seconde lecture (' + m2.exces + ', ' + m2.sy + ')', m2.exces <= 0 && m2.sy === 0);
      }
      v('aucune erreur JavaScript', S.erreurs, []);
      await S.ctx.close();
    }

    /* ═══ salle@10 — le lien d'invité : les boutons sont centrés, à distance du texte de la date et des bords de la carte ═════════════════ */
    for (const nom of veut('salle10') ? ['mac', 'iphone', 'android'] : []) {
      console.log('\n── salle@10 : les boutons du lien d\'invité (' + nom + ') ──');
      if (!codeLien) { vrai('population : le lien d\'invité existe', false); continue; }
      const S = await ouvrir(nom, 'ben');
      await S.ouvrirLien('#reunion=' + codeLien);
      vrai('population : la carte de la réunion propose de la rejoindre en vidéo et en audio', await S.attendre(() => !!document.querySelector('#info-corps .invite-carte [data-reu="invite-rejoindre"][data-type="audio"]')));
      await S.page.waitForTimeout(600);
      const lire = () => S.page.evaluate(async () => {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.body.offsetWidth;
        const car = document.querySelector('#info-corps .invite-carte').getBoundingClientRect(), rg = document.querySelector('#info-corps .invite-carte .info-actions'), date = rg.previousElementSibling.getBoundingClientRect();
        const bs = Array.from(rg.querySelectorAll('button')).map(b => b.getBoundingClientRect());
        const gauche = Math.min(...bs.map(b => b.left)) - car.left, droite = car.right - Math.max(...bs.map(b => b.right));
        return { haut: Math.round((Math.min(...bs.map(b => b.top)) - date.bottom) * 10) / 10, gauche: Math.round(gauche * 10) / 10, droite: Math.round(droite * 10) / 10, n: bs.length };
      });
      const m = await lire();
      v('population : deux boutons', m.n, 2);
      vrai('⛔ les boutons ne touchent pas le texte de la date (' + m.haut + ' px dessous, 8 au moins)', m.haut >= 8);
      vrai('⛔ les boutons sont centrés dans la carte (' + m.gauche + ' px à gauche, ' + m.droite + ' à droite)', Math.abs(m.gauche - m.droite) <= 2);
      vrai('   …et ne touchent pas le bord de la carte (10 px au moins)', m.gauche >= 10 && m.droite >= 10);
      await S.capture('salle10');
      v('aucune erreur JavaScript', S.erreurs, []);
      await S.ctx.close();
    }
  } finally { await nav.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; process.exit(1); });
