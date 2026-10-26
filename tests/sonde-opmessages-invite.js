/* ══ SONDE DE BOUT EN BOUT — L'INVITÉ SANS COMPTE, LA VRAIE PAGE, DE VRAIS NAVIGATEURS, DE LA VRAIE VOIX (Justin, 26 octobre 2026) ══════════════════════════════════════
   « Quand on va présenter l'application au client, sans qu'ils aient besoin d'installer : ça passe par le Web, ils cliquent sur le lien, ils peuvent rejoindre la réunion. Moi je valide que c'est bien eux,
   et quand ça se coupe, le lien est mort. »

   Deux navigateurs Chromium, contre le VRAI service (`server-msg/index.js`, 127.0.0.1), la VRAIE page de l'organisateur (`server-msg/public/index.html`) et la VRAIE page de l'invité (`invite.html`) :
     · l'ORGANISATEUR (un compte, au bureau, 1280 px) ouvre la fiche de sa réunion, touche « Copier le lien invité », et le presse-papiers porte `…/invite.html#i=<jeton de 32 signes>` ;
     · le CLIENT (un contexte VIERGE : aucun compte, aucun cookie, au téléphone, 390 px) ouvre le lien : il lit le titre et l'organisateur, rien d'autre ; tape son nom et son entreprise ; passe l'écran de préparation
       (l'aperçu de la caméra, la jauge du micro) ; l'organisateur n'est pas encore là → il le lit, et peut redemander tout de suite ; l'organisateur entre → le client ATTEND à la porte ;
     · l'organisateur lit « Paul — Plomberie Durand · invité sans compte » (bandeau et liste), touche « Admettre » → les deux se VOIENT et s'ENTENDENT (octets audio reçus qui croissent, images décodées) ;
     · l'organisateur TERMINE : le client lit la fin, rouvrir le lien dit « Cette réunion est terminée » ; un refus : l'écran de refus ; un lien régénéré : « Ce lien a été remplacé » ;
     · un nom HOSTILE (`<img onerror>`, `<script>`) s'écrit comme du TEXTE chez l'organisateur et chez le client (rien ne s'exécute) ;
     · le client n'a parlé qu'à `/api/invite/…` (chaque requête de sa page est relevée), n'a rien rangé (ni localStorage, ni sessionStorage, ni IndexedDB, ni cookie lisible), son cookie de session est `HttpOnly`,
       `SameSite=Strict`, sans date ; le jeton quitte la barre d'adresse dès qu'il est entré ; au téléphone rien ne déborde et chaque cible fait 44 px ; de JOUR et de NUIT.
   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), jamais au chronomètre. Tout se passe sur 127.0.0.1.

   Lancer :   NODE_PATH=/opt/node22/lib/node_modules node tests/sonde-opmessages-invite.js
              CAPTURES=/dossier   (les écrans aux étapes clés)   ·   TEINTES=jour|nuit|jour,nuit   (défaut : les deux)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const O = require('./outils-invite');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules node tests/sonde-opmessages-invite.js'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const TEINTES = (process.env.TEINTES || 'jour,nuit').split(',').filter(x => x === 'jour' || x === 'nuit');
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio',
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'];
const PROFILS = {
  bureau: { w: 1280, h: 800, dpr: 1, mobile: false },
  telephone: { w: 390, h: 844, dpr: 2, mobile: true },
};
const HOSTILE = '<img src=x onerror="window.__pwned=1">', HOSTILE_ENT = '"><script>window.__pwned=2</script>';

if (DOSSIER) fs.mkdirSync(DOSSIER, { recursive: true });
setTimeout(() => { console.log('  ✗ délai global de la sonde dépassé (9 min)'); process.exit(1); }, 540000).unref();

const noms = (s) => String(s || '').replace(/\s+/g, ' ').trim();
async function contexte(b, base, pf, teinte, extra) {
  const ctx = await b.newContext(Object.assign({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile,
    colorScheme: teinte === 'nuit' ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris', permissions: ['microphone', 'camera', 'clipboard-read', 'clipboard-write'], baseURL: base,
  }, extra || {}));
  /* ce que le navigateur fabrique : les pistes de `getUserMedia` (toutes arrêtées à la fin ?) et les connexions pair à pair (la voix passe-t-elle ?) — sans rien changer à ce que la page fait */
  await ctx.addInitScript(() => {
    window.__pistes = []; window.__connexions = [];
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = async (c) => { const f = await gum(c); f.getTracks().forEach(t => window.__pistes.push(t)); return f; };
    }
    const RPC = window.RTCPeerConnection;
    if (RPC) window.RTCPeerConnection = class extends RPC { constructor(...a) { super(...a); window.__connexions.push(this); } };
  });
  return ctx;
}
function suivre(page) {
  const S = { page, erreurs: [], requetes: [], dialogues: 0 };
  page.setDefaultTimeout(15000);
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 200)));
  page.on('request', r => { try { const u = new URL(r.url()); S.requetes.push({ m: r.method(), chemin: u.pathname }); } catch (e) { /* data: ou blob: */ } });
  page.on('dialog', d => { S.dialogues++; d.dismiss().catch(() => {}); });
  return S;
}
const attendre = (S, fonction, arg, plafond) => S.page.waitForFunction(fonction, arg, { timeout: plafond || 15000 }).then(() => true, () => false);
async function capture(S, nom) { if (!DOSSIER) return; try { await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); } catch (e) { /* la capture n'est pas une preuve */ } }
const texte = (S, sel) => S.page.evaluate((s) => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
const visible = (S, sel) => S.page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && !e.closest('[hidden]'); }, sel);

/* ce que la page du CLIENT mesure à chaque écran : rien ne déborde (contre la largeur POSÉE), chaque cible tactile fait 44 px au moins */
async function mesure(S, ecran, pf, sansCible) {
  await S.page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { void document.body.offsetWidth; r(); }))));
  await T.dort(250);
  const m = await S.page.evaluate((largeur) => {
    const racine = document.querySelector('main:not([hidden]), section:not([hidden]).salle') || document.body;
    const cibles = Array.from(racine.querySelectorAll('button, input[type=text], a[href]')).filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[hidden]'); });
    const trop = cibles.filter(e => { const r = e.getBoundingClientRect(); return r.height < 43.5 || r.width < 43.5; }).map(e => (e.id || e.tagName) + ':' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height));
    const deborde = document.documentElement.scrollWidth - largeur;
    return { cibles: cibles.length, trop, deborde };
  }, pf.w);
  vrai('population : ' + ecran + ' — ' + m.cibles + ' cible(s) tactile(s) mesurée(s)' + (sansCible ? ' (un écran de texte : aucune n\'est attendue)' : ''), sansCible ? m.cibles === 0 : m.cibles >= 1);
  v(ecran + ' : aucune cible sous 44 px', m.trop, []);
  vrai(ecran + ' : rien ne déborde de la largeur posée (' + m.deborde + ' px)', m.deborde <= 0);
}

async function parcours(base, svc, B, b, teinte) {
  const { S, pers, cl } = B;
  console.log('\n══════ ' + teinte.toUpperCase() + ' ══════');
  const ana = pers('Ana'), jetonAna = O.jetonCompte();
  S.sessionAjouter({ h: B.sha(jetonAna), personne: ana.id, appareil: null, ttlMs: 86400000 });
  const a1 = cl(ana);
  const rid = await B.programmer(a1, { titre: 'Devis Durand ' + teinte });
  const ctxH = await contexte(b, base, PROFILS.bureau, teinte);
  await ctxH.addCookies([{ name: 'opm', value: jetonAna, url: base }]);
  const H = suivre(await ctxH.newPage());
  const ctxC = await contexte(b, base, PROFILS.telephone, teinte);
  const C = suivre(await ctxC.newPage());
  try {
    /* ═══ 1. L'ORGANISATEUR COPIE LE LIEN ═══ */
    console.log('1. l\'organisateur ouvre la fiche et copie le lien « Invité (sans compte) »');
    await H.page.goto(base + '/#reunions/' + rid);
    vrai('la fiche de la réunion s\'ouvre', await attendre(H, () => document.querySelector('#info-corps [data-reu="inv-copier"]')));
    await capture(H, teinte + '-1-fiche-organisateur');
    const carte = await H.page.evaluate(() => { const b = document.querySelector('#info-corps [data-reu="inv-copier"]'); const c = b.closest('.carte'); return { rubrique: c.previousElementSibling && c.previousElementSibling.textContent.trim(), libelles: Array.from(c.querySelectorAll('.reglage-texte')).map(x => x.textContent.replace(/\s+/g, ' ').trim()), ancien: !!document.querySelector('#info-corps [data-reu="lien-copier"]') }; });
    v('⛔ la carte « Invité (sans compte) » : copier, (partager), régénérer — et le lien avec compte, lui, reste à sa place', [carte.rubrique, carte.libelles.length >= 2, /Copier le lien invité/.test(carte.libelles[0]), /Régénérer le lien invité/.test(carte.libelles[carte.libelles.length - 1]), carte.ancien], ['Invité (sans compte)', true, true, true, true]);
    await H.page.click('#info-corps [data-reu="inv-copier"]');
    vrai('la page dit « Lien invité copié »', await attendre(H, () => /Lien invité copié/.test(document.getElementById('mot').textContent)));
    const lien = await H.page.evaluate(() => navigator.clipboard.readText());
    vrai('⛔ le presse-papiers porte …/invite.html#i=<jeton de 32 signes>', new RegExp('^' + base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/invite\\.html#i=[A-Za-z0-9_-]{32}$').test(lien));
    const jeton = lien.split('#i=')[1];
    v('… c\'est bien le jeton que le service tient pour cette réunion (l\'aperçu public le dit)', await T.client(base).post('/api/invite/apercu', { jeton }).then(r => [r.code, r.j && r.j.reunion && r.j.reunion.titre]), [200, 'Devis Durand ' + teinte]);

    /* ═══ 2. LE CLIENT OUVRE LE LIEN ═══ */
    console.log('2. le client (aucun compte, un téléphone) ouvre le lien');
    await C.page.goto(lien);
    vrai('l\'écran d\'identité s\'affiche', await attendre(C, () => !document.getElementById('p-identite').hidden));
    v('⛔ il lit le titre de la réunion et son organisateur — rien d\'autre', [await texte(C, '#identite-titre'), await texte(C, '#identite-org')], ['Devis Durand ' + teinte, 'Organisée par Ana Banc']);
    const tout = await C.page.evaluate(() => document.getElementById('p-identite').textContent);
    vrai('… pas un horaire, pas un participant, pas un lieu (le texte de l\'écran ne contient que le titre, l\'organisateur et le formulaire)', !/\d{1,2}[:h]\d{2}/.test(tout) && !/Ben|Cléo|Banc /.test(tout.replace('Ana Banc', '')));
    await capture(C, teinte + '-2-client-identite');
    await mesure(C, 'identité', PROFILS.telephone);
    vrai('population : le client n\'a aucun cookie de compte', (await ctxC.cookies()).filter(c => c.name === 'opm').length === 0);
    await C.page.click('#b-continuer');
    v('⛔ la MENTION RGPD est lisible sur l\'écran d\'identité (responsable, 30 jours, contact) et ses deux liens sont ceux de TEAM OP', [await visible(C, '#rgpd'), /responsable du traitement/.test(await texte(C, '#rgpd')), /30 jours/.test(await texte(C, '#rgpd')), await C.page.evaluate(() => Array.from(document.querySelectorAll('#rgpd a')).map(a => a.getAttribute('href')))], [true, true, true, ['mailto:contact@teamop.fr', 'https://teamop.fr/confidentialite.html']]);
    v('⛔ un nom vide est refusé sur la page (rien n\'est envoyé)', [await visible(C, '#identite-erreur'), C.requetes.filter(r => r.chemin === '/api/invite/entrer').length], [true, 0]);
    await C.page.fill('#c-nom', 'Paul'); await C.page.fill('#c-ent', 'Plomberie Durand');
    await C.page.click('#b-continuer');
    vrai('l\'écran de préparation s\'ouvre, avec l\'aperçu de la caméra', await attendre(C, () => !document.getElementById('p-prepa').hidden && document.getElementById('apercu').dataset.camera === 'on'));
    const niv = await C.page.evaluate(() => new Promise(r => setTimeout(() => r(document.getElementById('niveau-i').style.transform), 600)));
    vrai('… et la jauge du micro bouge (la voix fabriquée par Chromium)', /scaleX\(0\.\d*[1-9]|scaleX\(1/.test(niv));
    await capture(C, teinte + '-3-client-preparation');
    await mesure(C, 'préparation', PROFILS.telephone);
    await C.page.click('#prepa-micro'); await C.page.click('#prepa-cam');
    v('couper le micro et la caméra se voit (les deux boutons sont enfoncés, l\'aperçu retombe sur l\'initiale)', [await C.page.getAttribute('#prepa-micro', 'aria-pressed'), await C.page.getAttribute('#prepa-cam', 'aria-pressed'), await C.page.getAttribute('#apercu', 'data-camera')], ['true', 'true', 'off']);
    await C.page.click('#prepa-micro'); await C.page.click('#prepa-cam');

    /* ═══ 3. L'ORGANISATEUR N'EST PAS ENCORE LÀ ═══ */
    console.log('3. l\'organisateur n\'est pas encore arrivé');
    await C.page.click('#b-entrer');
    vrai('le client le lit — et peut redemander tout de suite', await attendre(C, () => /pas encore arrivé/.test(document.getElementById('prepa-note').textContent) && document.getElementById('b-entrer').textContent === 'Réessayer maintenant' && !document.getElementById('b-entrer').disabled));
    v('… il n\'a rien écrit : aucune ligne d\'invité, aucun cookie', [Number(new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db')).prepare('SELECT COUNT(*) AS n FROM invite_sans_compte WHERE reunion = ?').get(rid).n), (await ctxC.cookies()).filter(c => c.name === 'opm-i').length], [0, 0]);
    await capture(C, teinte + '-4-client-organisateur-absent');

    /* ═══ 4. L'ORGANISATEUR ENTRE, LE CLIENT ATTEND ═══ */
    console.log('4. l\'organisateur ouvre la salle ; le client attend à la porte');
    await H.page.click('#info-corps [data-reu="rejoindre"][data-type="video"]').catch(async () => { await H.page.click('#info-corps [data-reu="rejoindre"]'); });
    vrai('l\'organisateur passe l\'écran « Avant d\'entrer »', await attendre(H, () => document.getElementById('avant-rejoindre')));
    await H.page.click('#avant-rejoindre');
    vrai('… et il est dans la salle', await attendre(H, () => !document.getElementById('salle-ecran').hidden));
    await C.page.click('#b-entrer');
    vrai('le client arrive à la porte : « En attente d\'admission »', await attendre(C, () => !document.getElementById('p-attente').hidden));
    v('… la page lit le titre de la réunion et l\'organisateur', await texte(C, '#attente-texte'), 'Ana Banc va vous laisser entrer dans « Devis Durand ' + teinte + ' ».');
    v('⛔ le jeton a QUITTÉ la barre d\'adresse (la session existe)', await C.page.evaluate(() => location.hash), '');
    await capture(C, teinte + '-5-client-attente');
    await mesure(C, 'attente', PROFILS.telephone);
    const ck = (await ctxC.cookies()).find(c => c.name === 'opm-i');
    v('⛔ son cookie de session : HttpOnly, SameSite=Strict, sans date', [!!ck, ck && ck.httpOnly, ck && ck.sameSite, ck && ck.expires], [true, true, 'Strict', -1]);
    v('… la page ne peut pas le lire (`document.cookie` est vide)', await C.page.evaluate(() => document.cookie), '');
    vrai('⛔ aucun micro ni caméra ne reste ouvert à la porte (toute piste fabriquée est arrêtée)', await C.page.evaluate(() => !(window.__pistes || []).some(t => t.readyState === 'live')));
    const bandeau = await attendre(H, () => /attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent));
    vrai('l\'organisateur lit le bandeau : « Paul (invité sans compte) attend d\'être admis »', bandeau);
    v('… exactement', await texte(H, '#salle-bandeaux .salle-bandeau .texte'), 'Paul (invité sans compte) attend d\'être admis.');
    await H.page.click('#salle-participants');
    vrai('il ouvre la liste des participants : « En attente d\'admission »', await attendre(H, () => /En attente d'admission/.test(document.getElementById('salle-panneau').textContent) || /En attente d'admission/.test(document.body.innerText)));
    const rang = await H.page.evaluate(() => { const r = Array.from(document.querySelectorAll('.salle-rang')).find(x => /Paul/.test(x.textContent)); return r ? { nom: r.querySelector('.texte').firstChild.textContent, petit: (r.querySelector('small') || {}).textContent, boutons: Array.from(r.querySelectorAll('button')).map(x => x.textContent.trim()) } : null; });
    v('⛔ sa ligne : « Paul — Plomberie Durand », « invité sans compte », les gestes « Admettre » et « Refuser »', [rang && rang.nom, rang && rang.petit, rang && rang.boutons], ['Paul — Plomberie Durand', 'invité sans compte', ['Admettre', 'Refuser']]);
    await capture(H, teinte + '-6-organisateur-liste-attente');

    /* ═══ 5. L'ORGANISATEUR FAIT ENTRER ═══ */
    console.log('5. il le fait entrer : ils se voient et s\'entendent');
    await H.page.click('.salle-rang [data-sa="admettre"]');
    vrai('le client entre dans la salle', await attendre(C, () => !document.getElementById('p-salle').hidden));
    vrai('… il voit sa tuile et celle d\'Ana', await attendre(C, () => document.querySelectorAll('#grille .tuile').length === 2));
    v('⛔ les noms des tuiles : « Vous » et « Ana Banc »', await C.page.evaluate(() => Array.from(document.querySelectorAll('#grille .tuile .nom b')).map(x => x.textContent).sort()), ['Ana Banc', 'Vous']);
    vrai('l\'organisateur voit « Paul — Plomberie Durand » parmi les présents', await attendre(H, () => Array.from(document.querySelectorAll('.salle-tuile, .tuile-nom, [data-uid]')).some(x => /Paul — Plomberie Durand/.test(x.textContent)) || /Paul — Plomberie Durand/.test(document.getElementById('salle-ecran').innerText)));
    const voix = async (S) => S.page.evaluate(async () => {
      const cs = window.__connexions || [];
      let octets = 0, images = 0;
      for (const pc of cs) { try { const st = await pc.getStats(); st.forEach(r => { if (r.type === 'inbound-rtp') { if (r.kind === 'audio') octets += r.bytesReceived || 0; if (r.kind === 'video') images += r.framesDecoded || 0; } }); } catch (e) { /* fermée */ } }
      return { octets, images, liaisons: cs.length };
    });
    const v0c = await voix(C), v0h = await voix(H);
    await T.dort(1500);
    const v1c = await voix(C), v1h = await voix(H);
    vrai('population : la page du client a une liaison pair à pair (' + v1c.liaisons + ')', v1c.liaisons >= 1);
    vrai('⛔ la VOIX passe dans les deux sens : les octets audio reçus CROISSENT (client ' + v0c.octets + ' → ' + v1c.octets + ', organisateur ' + v0h.octets + ' → ' + v1h.octets + ')', v1c.octets > v0c.octets && v1h.octets > v0h.octets);
    vrai('⛔ les IMAGES passent : l\'image décodée du client augmente (' + v0c.images + ' → ' + v1c.images + ')', v1c.images > v0c.images);
    const tuileAna = await C.page.evaluate(() => { const v = Array.from(document.querySelectorAll('#grille .tuile')).find(t => t.dataset.moi === 'false'); const e = v.querySelector('video'); return { camera: v.dataset.camera, w: e.videoWidth, joue: !e.paused && !!e.srcObject }; });
    vrai('… la vidéo d\'Ana joue dans la tuile du client', tuileAna.joue && tuileAna.w > 0);
    await capture(C, teinte + '-7-client-salle');
    await capture(H, teinte + '-8-organisateur-salle');
    await mesure(C, 'salle', PROFILS.telephone);
    v('les commandes du client : micro, caméra, main, quitter (pas de partage d\'écran, pas de discussion, pas de participants à gérer)', await C.page.evaluate(() => Array.from(document.querySelectorAll('.barre button')).map(x => x.id)), ['b-micro', 'b-cam', 'b-main', 'b-quitter']);
    await C.page.click('#b-main');
    vrai('il lève la main : l\'organisateur la voit', await attendre(H, () => /main levée/.test(document.getElementById('salle-ecran').innerText) || document.querySelector('[data-main="true"], .salle-main')));
    await C.page.click('#b-micro');
    v('il coupe son micro : le bouton le dit', await C.page.getAttribute('#b-micro', 'aria-pressed'), 'true');
    await C.page.click('#b-micro');

    /* — la page rechargée reprend sa place — */
    await C.page.reload();
    const repris = await attendre(C, () => !document.getElementById('p-salle').hidden && document.querySelectorAll('#grille .tuile').length === 2, undefined, 20000);
    if (!repris) console.log('      (diagnostic) écran : ' + await C.page.evaluate(() => Array.from(document.querySelectorAll('main, section.salle')).filter(e => !e.hidden).map(e => e.id).join(',')) + ' · tuiles : ' + await C.page.evaluate(() => document.querySelectorAll('#grille .tuile').length) + ' · erreurs : ' + JSON.stringify(C.erreurs) + ' · requêtes : ' + JSON.stringify(C.requetes.filter(r => r.chemin.startsWith('/api/')).slice(-8)));
    vrai('⛔ la page est RECHARGÉE : le client retrouve sa place dans la salle (sans repasser par la porte)', repris);

    /* ═══ 6. L'ORGANISATEUR TERMINE ═══ */
    console.log('6. l\'organisateur termine : la fin, puis le lien est mort');
    if (await visible(H, '#salle-panneau')) { await H.page.keyboard.press('Escape'); await attendre(H, () => document.getElementById('salle-panneau').hidden || getComputedStyle(document.getElementById('salle-panneau')).display === 'none'); }           // la liste des participants se referme avant d'ouvrir « Plus »
    await H.page.click('#salle-plus');
    await H.page.click('[data-sa="terminer-demander"]').catch(() => {});
    vrai('il termine pour tous', await attendre(H, () => document.querySelector('[data-sa="terminer-confirmer"]') !== null).then(async (ok) => { if (ok) await H.page.click('[data-sa="terminer-confirmer"]'); return ok; }));
    vrai('⛔ le client lit la fin de la réunion', await attendre(C, () => !document.getElementById('p-fin').hidden, undefined, 20000));
    v('… « La réunion est terminée » et « Ce lien ne fonctionne plus »', [await texte(C, '#fin-titre'), /Ce lien ne fonctionne plus/.test(await texte(C, '#fin-texte'))], ['La réunion est terminée', true]);
    await capture(C, teinte + '-9-client-fin');
    await mesure(C, 'fin', PROFILS.telephone, true);
    vrai('⛔ aucun micro ni caméra ne reste ouvert après la fin', await C.page.evaluate(() => !(window.__pistes || []).some(t => t.readyState === 'live')));
    await C.page.goto('about:blank'); await C.page.goto(lien);
    vrai('⛔ rouvrir le lien : « Cette réunion est terminée »', await attendre(C, () => !document.getElementById('p-mort').hidden));
    v('…', [await texte(C, '#mort-titre'), /Demandez un nouveau lien/.test(await texte(C, '#mort-texte'))], ['Cette réunion est terminée', true]);
    await capture(C, teinte + '-10-client-lien-mort');
    await mesure(C, 'lien mort', PROFILS.telephone, true);

    /* ═══ 7. LE CLIENT N'A PARLÉ QU'À L'INVITÉ, ET N'A RIEN RANGÉ ═══ */
    console.log('7. ce que la page du client a demandé et rangé');
    const api = C.requetes.filter(r => r.chemin.startsWith('/api/'));
    vrai('population : la page du client a fait ' + api.length + ' requêtes /api/', api.length >= 8);
    v('⛔ TOUTES sont sous /api/invite/ (aucune route de compte, de contact, de conversation, d\'agenda)', api.filter(r => !r.chemin.startsWith('/api/invite/')).map(r => r.m + ' ' + r.chemin), []);
    const statiques = Array.from(new Set(C.requetes.filter(r => !r.chemin.startsWith('/api/')).map(r => r.chemin)));
    vrai('… et les autres sont des fichiers servis (' + statiques.join(', ') + ')', statiques.every(p => /^\/(invite\.html|api\.js|source-serveur\.js|invite\.js|opmsg-[a-z0-9-]+\.png|vendor\/[a-z0-9.-]+\.js)$/.test(p)));
    const rangement = await C.page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, idb: indexedDB.databases ? (await indexedDB.databases()).length : 0, cache: typeof caches !== 'undefined' ? (await caches.keys()).length : 0 }));
    v('⛔ rien n\'est rangé sur l\'appareil : ni localStorage, ni sessionStorage, ni IndexedDB, ni cache', rangement, { local: 0, session: 0, idb: 0, cache: 0 });
    v('aucune erreur JavaScript, aucune boîte de dialogue, de part et d\'autre', [C.erreurs, H.erreurs, C.dialogues + H.dialogues], [[], [], 0]);
    vrai('population : les deux pages ont servi', H.requetes.length > 10 && C.requetes.length > 10);
  } catch (e) { console.log('  ✗ la sonde est morte (' + teinte + ') : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { await ctxH.close(); await ctxC.close(); } catch (e) { /* déjà */ } }
}

/* ═══ LES CAS DE BORD : le refus, le nom hostile, le lien régénéré — chacun avec son organisateur (un compte n'est que dans UNE salle à la fois) ═══ */
async function annexes(base, svc, B, b, teinte) {
  const { S, pers } = B;
  console.log('\n══════ ' + teinte.toUpperCase() + ' · cas de bord ══════');
  const ouvrirHote = async (nom) => {
    const p = pers(nom), j = O.jetonCompte();
    S.sessionAjouter({ h: B.sha(j), personne: p.id, appareil: null, ttlMs: 86400000 });
    const c = B.cl(p); const rid = await B.programmer(c, { titre: 'Réunion ' + nom + ' ' + teinte });
    const ctx = await contexte(b, base, PROFILS.bureau, teinte);
    await ctx.addCookies([{ name: 'opm', value: j, url: base }]);
    const H = suivre(await ctx.newPage());
    await H.page.goto(base + '/#reunions/' + rid);
    await attendre(H, () => document.querySelector('#info-corps [data-reu="rejoindre"]'));
    await H.page.click('#info-corps [data-reu="rejoindre"][data-type="video"]').catch(async () => { await H.page.click('#info-corps [data-reu="rejoindre"]'); });
    await attendre(H, () => document.getElementById('avant-rejoindre'));
    await H.page.click('#avant-rejoindre');
    const dedans = await attendre(H, () => !document.getElementById('salle-ecran').hidden);
    return { H, ctx, rid, c, dedans, jeton: (await B.lien(c, rid)) };
  };
  const ouvrirClient = async (jeton, nom, ent) => {
    const ctx = await contexte(b, base, PROFILS.telephone, teinte);
    const C = suivre(await ctx.newPage());
    await C.page.goto(base + '/invite.html#i=' + jeton);
    await attendre(C, () => !document.getElementById('p-identite').hidden);
    await C.page.fill('#c-nom', nom); await C.page.fill('#c-ent', ent || '');
    await C.page.click('#b-continuer');
    await attendre(C, () => !document.getElementById('p-prepa').hidden && document.getElementById('apercu').dataset.camera !== undefined);
    await C.page.click('#b-entrer');
    return { C, ctx };
  };
  const fermer = async (...l) => { for (const x of l) { try { await x.ctx.close(); } catch (e) { /* déjà */ } } };

  /* — un nom HOSTILE — */
  console.log('1. un nom hostile s\'écrit comme du texte, chez l\'organisateur et chez le client');
  {
    const o = await ouvrirHote('Hostile');
    vrai('population : l\'organisateur est dans la salle', o.dedans);
    const k = await ouvrirClient(o.jeton, HOSTILE, HOSTILE_ENT);
    vrai('le client attend à la porte', await attendre(k.C, () => !document.getElementById('p-attente').hidden));
    vrai('l\'organisateur lit le bandeau', await attendre(o.H, () => /attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent)));
    await o.H.page.click('#salle-participants');
    await attendre(o.H, () => /En attente d'admission/.test(document.body.innerText));
    const vu = await o.H.page.evaluate((h) => ({ texte: Array.from(document.querySelectorAll('.salle-rang .texte')).map(e => e.firstChild && e.firstChild.textContent).filter(Boolean), img: document.querySelectorAll('img[src="x"]').length, balises: document.querySelectorAll('#salle-ecran img[onerror], #salle-ecran [onerror]').length, pwned: window.__pwned === undefined }), HOSTILE);
    vrai('population : la ligne de la liste a été lue (' + vu.texte.length + ' ligne(s))', vu.texte.length >= 1);
    v('⛔ chez l\'organisateur, le nom hostile est du TEXTE (le nom et l\'entreprise, tels que tapés)', vu.texte.includes(HOSTILE + ' — ' + HOSTILE_ENT), true);
    v('⛔ … aucune balise n\'est née (`<img onerror>`), rien ne s\'est exécuté', [vu.balises, vu.pwned], [0, true]);
    await capture(o.H, teinte + '-11-organisateur-nom-hostile');
    await o.H.page.click('.salle-rang [data-sa="admettre"]');
    vrai('admis : le client entre', await attendre(k.C, () => !document.getElementById('p-salle').hidden));
    const toi = await k.C.page.evaluate(() => ({ pwned: window.__pwned === undefined, balises: document.querySelectorAll('[onerror], img[src="x"], script:not([src])').length, nom: document.getElementById('prepa-init') && document.getElementById('prepa-init').textContent }));
    v('⛔ chez le client : rien ne s\'est exécuté, aucune balise née', [toi.pwned, toi.balises], [true, 0]);
    const chezAna = await attendre(o.H, (h) => Array.from(document.querySelectorAll('#salle-ecran *')).some(e => e.children.length === 0 && e.textContent.includes(h)), '<img');
    if (!chezAna) console.log('      (diagnostic) texte de la salle : ' + JSON.stringify(await o.H.page.evaluate(() => document.getElementById('salle-ecran').innerText.slice(0, 600))));
    vrai('chez l\'organisateur, la salle (tuile et liste) porte le nom hostile comme TEXTE (« <img … » lu en lettres, aucune image née)', chezAna);
    v('… et toujours rien d\'exécuté', await o.H.page.evaluate(() => window.__pwned === undefined && document.querySelectorAll('#salle-ecran img[src="x"], #salle-ecran [onerror]').length === 0), true);
    v('aucune erreur JavaScript', [o.H.erreurs, k.C.erreurs], [[], []]);
    await fermer(o, k);
  }

  /* — un refus — */
  console.log('2. un refus : l\'écran de refus, et le client n\'entre pas');
  {
    const o = await ouvrirHote('Refus');
    const k = await ouvrirClient(o.jeton, 'Marc', 'Rival SA');
    vrai('le client attend à la porte', await attendre(k.C, () => !document.getElementById('p-attente').hidden));
    await attendre(o.H, () => /attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent));
    await o.H.page.click('#salle-participants');
    await attendre(o.H, () => document.querySelector('.salle-rang [data-sa="refuser"]'));
    await o.H.page.click('.salle-rang [data-sa="refuser"]');
    vrai('⛔ le client lit l\'écran de refus', await attendre(k.C, () => !document.getElementById('p-refus').hidden));
    v('… « Entrée refusée » et la raison', [await texte(k.C, '#refus-titre'), await texte(k.C, '#refus-texte')], ['Entrée refusée', 'L\'organisateur n\'a pas pu vous laisser entrer.']);
    await capture(k.C, teinte + '-12-client-refus');
    await mesure(k.C, 'refus', PROFILS.telephone);
    v('⛔ il n\'est pas dans la salle : l\'organisateur n\'y voit que lui', await o.H.page.evaluate(() => (document.getElementById('salle-ecran').innerText.match(/Marc/g) || []).length === 0 || !/Dans la salle[\s\S]*Marc/.test(document.body.innerText)), true);
    v('… et son entrée est refusée par le service : redemander → 403 `refuse`', await k.C.page.evaluate(async () => { const r = await fetch('/api/invite/redemander', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: '{}' }); return [r.status, (await r.json()).error]; }), [403, 'refuse']);
    /* ⛔ LE REFUS TIENT : un navigateur NEUF derrière la même adresse, par le même lien, lit l'écran de refus — il n'entre pas, et l'organisateur ne revoit personne à la porte */
    const k2 = await ouvrirClient(o.jeton, 'Marc', 'Rival SA');
    vrai('⛔ un navigateur neuf, même adresse, même lien : l\'écran de refus (403 `refuse`) — pas de seconde attente', await attendre(k2.C, () => !document.getElementById('p-refus').hidden));
    v('… l\'organisateur ne voit personne à la porte', await o.H.page.evaluate(() => !/attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent)), true);
    await fermer(o, k, k2);
  }

  /* — un vieux cookie d'un AUTRE lien — */
  console.log('2 bis. le navigateur porte la session d\'une autre réunion : le lien qu\'on vient de cliquer l\'emporte');
  {
    const oa = await ouvrirHote('LienA'), ob = await ouvrirHote('LienB');
    const k = await ouvrirClient(oa.jeton, 'Théo', 'Deux rendez-vous');
    vrai('population : le client attend à la porte de la réunion A', await attendre(k.C, () => !document.getElementById('p-attente').hidden));
    await attendre(oa.H, () => /attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent));
    await k.C.page.goto('about:blank');
    await k.C.page.goto(base + '/invite.html#i=' + ob.jeton);
    vrai('⛔ avec le lien de la réunion B, il lit l\'écran d\'IDENTITÉ de B (pas la salle d\'attente de A)', await attendre(k.C, () => !document.getElementById('p-identite').hidden));
    v('… son titre est celui de B', await texte(k.C, '#identite-titre'), 'Réunion LienB ' + teinte);
    vrai('⛔ et sa place à la porte de A est rendue : l\'organisateur de A ne voit plus personne attendre', await attendre(oa.H, () => !/attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent)));
    await k.C.page.fill('#c-nom', 'Théo'); await k.C.page.click('#b-continuer');
    await attendre(k.C, () => !document.getElementById('p-prepa').hidden && document.getElementById('apercu').dataset.camera !== undefined);
    await k.C.page.click('#b-entrer');
    vrai('puis il attend à la porte de B', await attendre(k.C, () => !document.getElementById('p-attente').hidden) && await attendre(ob.H, () => /attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent)));
    await fermer(oa, ob, k);
  }

  /* — le lien régénéré — */
  console.log('3. le lien régénéré : celui qui attendait lit « Ce lien a été remplacé »');
  {
    const o = await ouvrirHote('Regenere');
    const k = await ouvrirClient(o.jeton, 'Léa', '');
    vrai('le client attend à la porte', await attendre(k.C, () => !document.getElementById('p-attente').hidden));
    await attendre(o.H, () => /attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent));
    const r = await o.c.post('/api/reunions/' + o.rid + '/invite/regenerer', {});
    v('l\'organisateur régénère le lien (200, un invité renvoyé)', [r.code, r.j.coupes], [200, 1]);
    vrai('⛔ le client lit « Ce lien a été remplacé »', await attendre(k.C, () => !document.getElementById('p-mort').hidden));
    v('…', [await texte(k.C, '#mort-titre'), /Demandez-le-lui/.test(await texte(k.C, '#mort-texte'))], ['Ce lien a été remplacé', true]);
    await capture(k.C, teinte + '-13-client-lien-remplace');
    vrai('⛔ l\'organisateur ne voit plus personne qui attend', await attendre(o.H, () => !/attend d'être admis/.test(document.getElementById('salle-bandeaux').textContent)));
    const nv = await T.client(base).post('/api/invite/apercu', { jeton: r.j.jeton });
    v('le NOUVEAU lien marche (l\'aperçu le dit)', nv.code, 200);
    await fermer(o, k);
  }
}

(async () => {
  const B = await O.monter();
  const { svc } = B;
  const b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS });
  try {
    for (const teinte of TEINTES) { await parcours(svc.base, svc, B, b, teinte); await annexes(svc.base, svc, B, b, teinte); }
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { await b.close(); } catch (e) { /* déjà */ } await B.arreter(); }
  fin();
})();
