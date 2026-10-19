/* Sonde du MODULE OP Courrier — trois ajouts du 19 octobre 2026, jouées dans un vrai Chromium (127.0.0.1, la page d'essai, aucun octet sorti) :
     1. le SON des nouveaux mails : un Audio compté (jamais le premier relevé, un seul son pour un lot, silencieux si le réglage est éteint, `audioSession` posé, boîte/dossier indifférents) ;
     2. l'APERÇU d'un PDF : choisi dans « Envoyer pour signature » → Aperçu (cadre isolé sandbox vide, adresse blob:), fichier GARDÉ (IndexedDB) → rouvert depuis le dossier Signatures
        même après rechargement, effacé à l'annulation de la demande (« Fichier non conservé sur cet appareil ») ; Aperçu aussi sur un PDF joint à un mail en rédaction ;
     3. DÉSARCHIVER : « Remettre dans la Réception » dans Archive, « Annuler » après un archivage.
   Lancer : NODE_PATH=/tmp/pw/node_modules node scratchpad/courrier/sonde-son-apercu.js   (voir l'en-tête de pilote.js) */
const { ouvrir, bilan } = require('./pilote.js');
const R = []; const log = (ok, m) => R.push((ok ? 'PASS ' : 'FAIL ') + m);
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length 44>>stream\nBT /F1 24 Tf 40 100 Td (Bonjour PDF) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n');
const SR = "document.querySelector('[data-opcourrier]').shadowRoot";
(async () => {
  const P = await ouvrir();
  const nouveau = async (opts, cle) => {
    const ctx = await P.ctxPour(Object.assign({ viewport: { width: 1440, height: 900 } }, opts || {}));
    await ctx.addInitScript(() => { window.__sons = []; window.__avant = null;
      window.Audio = function (u) { window.__sons.push('nouveau:' + u); this.play = () => { window.__sons.push('play:' + (navigator.audioSession ? navigator.audioSession.type : '-')); return Promise.resolve(); }; };
      try { Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' }, configurable: true }); } catch (e) {} });
    const p = await ctx.newPage(); const err = [];
    p.on('pageerror', e => err.push(String(e))); p.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) err.push('console: ' + m.text()); });
    return { ctx, p, err };
  };
  const toast = (p) => p.evaluate((sr) => { const t = eval(sr).querySelector('#toast'); return t ? t.textContent : ''; }, SR);
  const sons = (p) => p.evaluate(() => window.__sons.slice());

  /* ── 1. le son ── */
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&cotes=pro')); await p.waitForTimeout(500);
    log((await sons(p)).length === 0, 'son : le premier chargement ne sonne PAS');
    await p.locator('[data-settings]').first().click(); await p.waitForTimeout(250);
    log(await p.locator('#stSon').count() === 1 && await p.locator('#stSon').isChecked(), 'son : le réglage « Son des nouveaux mails » existe, activé par défaut');
    log((await p.locator('.sheet').first().textContent()).includes('Suit le mode silencieux de l’appareil'), 'son : le réglage dit qu\'il suit le mode silencieux');
    await p.locator('#stNotif').uncheck();   // notifications éteintes : le son tient seul
    await p.locator('#stSon').uncheck(); await p.waitForTimeout(100);
    log((await sons(p)).length === 0, 'son : éteint, le réglage ne joue rien');
    await p.locator('#stSon').check(); await p.waitForTimeout(100);
    const essai = await sons(p);
    log(essai.length === 2 && essai[0] === 'nouveau:sons/courrier.mp3' && essai[1] === 'play:ambient', 'son : le rallumer joue un essai, l\'Audio vise sons/courrier.mp3, audioSession = ambient (' + essai.join(',') + ')');
    await p.evaluate(() => { window.__sons.length = 0; });
    await p.locator('#stTest').click(); await p.waitForTimeout(600);
    log((await sons(p)).filter(x => x.startsWith('play')).length === 1, 'son : « Recevoir un mail d\'exemple » : UN son (' + (await sons(p)).join(',') + ')');
    // un autre dossier affiché, un mail de plus : ça sonne quand même
    await p.locator('.folder[data-folder="sent"]').click().catch(() => {}); await p.waitForTimeout(200);
    await p.evaluate(() => { window.__sons.length = 0; });
    await p.evaluate(async () => { await window.__source.simuler('recevoir', { boite: (await window.__source.boites())[0].id }); await window.__opc.rafraichir(); });
    await p.waitForTimeout(500);
    log((await sons(p)).filter(x => x.startsWith('play')).length === 1, 'son : un dossier autre que la Réception est affiché → ça sonne quand même');
    // éteint : silence
    await p.locator('[data-settings]').first().click(); await p.waitForTimeout(250); await p.locator('#stSon').uncheck(); await p.locator('#stDone').click(); await p.waitForTimeout(150);
    await p.evaluate(() => { window.__sons.length = 0; });
    await p.evaluate(async () => { await window.__source.simuler('recevoir', { boite: (await window.__source.boites())[0].id }); await window.__opc.rafraichir(); });
    await p.waitForTimeout(500);
    log((await sons(p)).length === 0, 'son : réglage éteint → aucun son, même avec un nouveau mail');
    // rechargé : le réglage éteint est RETROUVÉ, et le premier chargement ne sonne pas
    await p.reload(); await p.waitForTimeout(500);
    await p.locator('[data-settings]').first().click(); await p.waitForTimeout(250);
    log(!(await p.locator('#stSon').isChecked()) && (await sons(p)).length === 0, 'son : le réglage éteint survit au rechargement, et ce premier chargement ne sonne pas');
    log(err.length === 0, 'son : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 2. l'aperçu d'un PDF ── */
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&cotes=pro')); await p.waitForTimeout(500);
    await p.locator('.folder[data-folder="sign"]').click(); await p.waitForTimeout(300);
    await p.locator('#rows [data-signnew]').click(); await p.waitForTimeout(250);
    await p.setInputFiles('#sgFile', { name: 'Contrat-test.pdf', mimeType: 'application/pdf', buffer: PDF }); await p.waitForTimeout(200);
    log(await p.locator('[data-dpv]').count() === 1, 'aperçu : la feuille « Envoyer pour signature » propose Aperçu sur le PDF choisi');
    await p.locator('[data-dpv]').click(); await p.waitForTimeout(500);
    const cadre = await p.evaluate((sr) => { const f = eval(sr).querySelector('#pdfv iframe'); return f ? { sandbox: f.getAttribute('sandbox'), src: f.src.slice(0, 5), titre: f.title } : null; }, SR);
    log(!!cadre && cadre.sandbox === null && cadre.src === 'blob:', 'aperçu : un cadre sur une adresse blob: (sans sandbox : Chromium refuserait le PDF) ' + JSON.stringify(cadre));
    await p.waitForTimeout(1200);
    log(p.frames().some(f => /^blob:/.test(f.url())), 'aperçu : le visualiseur du navigateur a chargé le blob: dans le cadre (' + p.frames().map(f => f.url().slice(0, 12)).join(' | ') + ')');
    log(await p.evaluate(() => navigator.pdfViewerEnabled), 'aperçu (information) : ce Chromium affiche les PDF dans une page');
    await p.screenshot({ path: process.env.CAPTURES ? process.env.CAPTURES + '/apercu-pdf.png' : '/tmp/claude-0/-home-user-teamop/a8f64c75-27dc-5d9d-9a87-428ec3a3d7ba/scratchpad/apercu-pdf.png' });
    log(await p.locator('#pdfv [data-pv="dl"]').count() === 1 && await p.locator('#pdfv [data-pv="close"]').count() === 1, 'aperçu : Fermer et Télécharger');
    const dl = p.waitForEvent('download'); await p.locator('#pdfv [data-pv="dl"]').click(); const d = await dl;
    log(d.suggestedFilename() === 'Contrat-test.pdf', 'aperçu : Télécharger rend le fichier sous son nom (' + d.suggestedFilename() + ')');
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    log(await p.locator('#pdfv').count() === 0 && await p.locator('#sgGo').count() === 1, 'aperçu : Échap ferme la visionneuse SEULE — la feuille dessous reste ouverte');
    await p.locator('[data-dpv]').click(); await p.waitForTimeout(300); await p.locator('#pdfv [data-pv="close"]').click(); await p.waitForTimeout(200);
    log(await p.locator('#pdfv').count() === 0, 'aperçu : Fermer ferme');
    // envoyer la demande, rouvrir depuis le dossier Signatures
    await p.fill('#sgName', 'Contrat test'); await p.fill('#sgN0', 'Claire Dubois'); await p.fill('#sgE0', 'claire@exemple.fr'); await p.fill('#sgP0', '06 12 34 56 78');
    await p.locator('#sgGo').click(); await p.waitForTimeout(500);
    const cles = () => p.evaluate(() => new Promise((ok) => { const r = indexedDB.open('opcourrierEssai_ui_fichiers', 1); r.onsuccess = () => { const q = r.result.transaction('f').objectStore('f').getAllKeys(); q.onsuccess = () => { r.result.close(); ok(q.result.length); }; }; r.onerror = () => ok(-1); }));
    log(await cles() === 1, 'aperçu : le fichier est GARDÉ sur l\'appareil (IndexedDB : 1 fichier)');
    log(await p.locator('[data-pv-att]').count() === 1, 'aperçu : la demande rangée dans Signatures propose Aperçu sur sa pièce');
    await p.locator('[data-pv-att]').click(); await p.waitForTimeout(400);
    log(await p.locator('#pdfv iframe').count() === 1, 'aperçu : …et elle s\'ouvre depuis le fichier gardé');
    await p.locator('#pdfv [data-pv="close"]').click(); await p.waitForTimeout(150);
    await p.reload(); await p.waitForTimeout(600);
    await p.locator('.folder[data-folder="sign"]').click(); await p.waitForTimeout(300); await p.locator('#rows .msg').first().click(); await p.waitForTimeout(300);
    await p.locator('[data-pv-att]').click(); await p.waitForTimeout(400);
    log(await p.locator('#pdfv iframe').count() === 1, 'aperçu : …même après rechargement de la page');
    await p.locator('#pdfv [data-pv="close"]').click(); await p.waitForTimeout(150);
    await p.locator('[data-act="signCancel"]').click(); await p.waitForTimeout(500);
    log(await cles() === 0, 'aperçu : annuler la demande EFFACE le fichier (IndexedDB : 0)');
    await p.locator('[data-pv-att]').click(); await p.waitForTimeout(400);
    log((await toast(p)).includes('Fichier non conservé sur cet appareil') && await p.locator('#pdfv').count() === 0, 'aperçu : une pièce dont le fichier a disparu le DIT (« ' + (await toast(p)) + ' »)');
    // un PDF joint à un message en rédaction
    await p.locator('.folder[data-folder="inbox"]').click().catch(() => {}); await p.waitForTimeout(200);
    await p.locator('[data-compose], #btnCompose').first().click(); await p.waitForTimeout(300);
    await p.setInputFiles('#cFile', { name: 'Devis.pdf', mimeType: 'application/pdf', buffer: PDF }); await p.waitForTimeout(200);
    log(await p.locator('[data-pv-c]').count() === 1, 'aperçu : un PDF joint à un message en rédaction propose Aperçu');
    await p.locator('[data-pv-c]').click(); await p.waitForTimeout(400);
    log(await p.locator('#pdfv iframe').count() === 1, 'aperçu : …et l\'ouvre au-dessus de la rédaction');
    await p.locator('#pdfv [data-pv="close"]').click(); await p.waitForTimeout(150);
    log(await p.locator('#cSheet').count() === 1, 'aperçu : …la rédaction est intacte dessous');
    log(err.length === 0, 'aperçu : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 2 bis. iPhone : le cadre ne s'affiche pas → le repli « Télécharger » ── */
  { const { ctx, p, err } = await nouveau({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    await p.addInitScript(() => { try { Object.defineProperty(navigator, 'pdfViewerEnabled', { value: false, configurable: true }); } catch (e) {} });
    await p.goto(P.avec('mode=demo&cotes=pro')); await p.waitForTimeout(500);
    await p.locator('#btnNav').click(); await p.waitForTimeout(250); await p.locator('.folder[data-folder="sign"]').click(); await p.waitForTimeout(300);
    await p.locator('#rows [data-signnew]').click(); await p.waitForTimeout(250);
    await p.setInputFiles('#sgFile', { name: 'Contrat-test.pdf', mimeType: 'application/pdf', buffer: PDF }); await p.waitForTimeout(200);
    await p.locator('[data-dpv]').tap(); await p.waitForTimeout(400);
    log(await p.locator('#pdfv iframe').count() === 0 && (await p.locator('#pdfv .pdfv-repli').textContent()).includes('Télécharger'), 'iphone : sans affichage intégré, la visionneuse dit « Télécharger » (pas de cadre vide)');
    const b = await p.locator('#pdfv [data-pv="dl"]').boundingBox(); log(b && b.height >= 44 - 1, 'iphone : le bouton Télécharger fait ≥ 44 px (' + (b && Math.round(b.height)) + ')');
    await p.screenshot({ path: '/tmp/claude-0/-home-user-teamop/a8f64c75-27dc-5d9d-9a87-428ec3a3d7ba/scratchpad/apercu-iphone.png' });
    log(err.length === 0, 'iphone : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  /* ── 3. désarchiver ── */
  { const { ctx, p, err } = await nouveau({});
    await p.goto(P.avec('mode=demo&cotes=pro')); await p.waitForTimeout(500);
    const dansInbox = () => p.locator('#rows .msg').count();
    const n0 = await dansInbox();
    await p.locator('#rows .msg').first().click(); await p.waitForTimeout(300);
    const sujet = (await p.locator('#rows .msg.sel .m-sub').first().textContent().catch(() => '')) || '';
    await p.locator('.acts-mac [data-act="archive"]').click(); await p.waitForTimeout(300);
    log(await dansInbox() === n0 - 1, 'archiver : le message quitte la Réception');
    log((await toast(p)).includes('Message archivé'), 'archiver : le toast dit « Message archivé »');
    await p.locator('#toast [data-act], #toast button').first().click(); await p.waitForTimeout(300);
    log(await dansInbox() === n0, 'archiver : « Annuler » le remet dans la Réception');
    await p.locator('#rows .msg').first().click(); await p.waitForTimeout(200); await p.locator('.acts-mac [data-act="archive"]').click(); await p.waitForTimeout(300);
    await p.locator('.folder[data-folder="archive"]').click(); await p.waitForTimeout(300);
    const na = await dansInbox();
    await p.locator('#rows .msg').first().click(); await p.waitForTimeout(300);
    const lib = await p.locator('.acts-mac [data-act="toInbox"]').getAttribute('aria-label');
    log(lib === 'Remettre dans la Réception' && await p.locator('.acts-mac [data-act="archive"]').count() === 0, 'désarchiver : dans Archive, le bouton Archiver devient « ' + lib + ' »');
    await p.locator('#rows .msg').first().click({ button: 'right' }); await p.waitForTimeout(250);
    log(((await p.locator('.menu, .sheet').last().textContent()) || '').includes('Remettre dans la Réception'), 'désarchiver : le clic droit le propose');
    await p.keyboard.press('Escape'); await p.waitForTimeout(150);
    await p.locator('.acts-mac [data-act="toInbox"]').click(); await p.waitForTimeout(300);
    log(await dansInbox() === na - 1, 'désarchiver : le message quitte Archive');
    await p.locator('.folder[data-folder="inbox"]').click(); await p.waitForTimeout(300);
    log(await dansInbox() === n0, 'désarchiver : …et réapparaît dans la Réception');
    await p.screenshot({ path: '/tmp/claude-0/-home-user-teamop/a8f64c75-27dc-5d9d-9a87-428ec3a3d7ba/scratchpad/desarchiver.png' });
    log(err.length === 0, 'désarchiver : aucune erreur JS ' + err.join('|')); await ctx.close(); }

  await bilan(R, P);
})();
