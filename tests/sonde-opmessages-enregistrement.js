/* ══ SONDE — L'ENREGISTREMENT D'UNE RÉUNION : CE QU'IL CONTIENT, ET OÙ IL VA (la vraie page servie, deux navigateurs) ══════════════════════════════════════════════════════════
   7 octobre 2026 : « enregistrer les réunions, qu'ils puissent les renvoyer à des personnes qui n'ont pas pu assister ». Contre le VRAI service : Ana (hôte) et Ben dans l'appel vidéo de leur
   groupe ; Cléo, membre du groupe, n'y vient pas. Ben partage son écran (une toile 1280 × 720), Ana y trace un trait rouge, puis :
     1. Ana enregistre : le bandeau « REC » paraît chez Ben ; elle arrête → la carte « Enregistrement terminé » (titre, durée, taille), l'aperçu se lit en 1280 × 720, ⛔ l'image ENREGISTRÉE porte
        le trait rouge d'Ana (pixels relus sur la vidéo), et la carte dit que Cléo n'était pas là ;
     2. « Envoyer dans la discussion » : le fichier « Enregistrement — Revue de projet — … .webm » arrive dans la conversation du groupe (lu par l'API, côté Cléo) ;
     3. un second enregistrement : « Supprimer » demande une seconde touche (« Supprimer définitivement ? ») ;
     4. un troisième : « Enregistrer sur cet appareil » télécharge le fichier ;
     5. ⛔ Ana QUITTE la salle en enregistrant : la salle se ferme, la carte reste — le fichier n'est pas perdu.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-enregistrement.js   (CAPTURES=/dossier pour les images)
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
const ECRAN = () => {
  const md = navigator.mediaDevices; if (!md) return;
  md.getDisplayMedia = async function () {
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g = cv.getContext('2d'); let k = 0;
    const dessiner = () => { k++; g.fillStyle = '#243b6b'; g.fillRect(0, 0, 1280, 720); g.fillStyle = '#ffffff'; g.fillRect(80 + (k % 20) * 4, 80, 300, 40); };
    dessiner(); const iv = setInterval(dessiner, 100);
    const f = cv.captureStream(10); f.getTracks().forEach(t => { const arret = t.stop.bind(t); t.stop = function () { clearInterval(iv); arret(); }; });
    return f;
  };
};

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
    const ouvrir = async (login) => {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce', locale: 'fr-FR', permissions: ['microphone', 'camera'], acceptDownloads: true });
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
    const A = await ouvrir('ana'), B = await ouvrir('ben');
    const entrer = async () => {
      await A.page.evaluate(g => { location.hash = '#messages/' + g; }, G);
      await att(A, () => document.documentElement.dataset.conv === '1');
      await A.page.locator('#conv-cam').click();
      await att(A, () => document.documentElement.dataset.salle === '1', null, 20000);
      if (await att(B, () => { const x = document.getElementById('appel-repondre'); return !!x && x.getClientRects().length > 0; }, null, 20000)) await B.page.locator('#appel-repondre').click();
      return att(A, () => document.querySelectorAll('#salle-scene > .salle-tuile[data-uid]').length === 1, null, 20000) && att(B, () => document.documentElement.dataset.salle === '1', null, 20000);
    };
    const enregistrer = async (ms) => {
      await A.page.locator('#salle-rec-btn').click();
      const ok = await att(A, () => document.getElementById('salle-rec-btn').getAttribute('aria-pressed') === 'true');
      await A.page.waitForTimeout(ms);
      return ok;
    };
    vrai('population : Ana et Ben sont dans la salle du groupe (Cléo, membre, n\'y vient pas)', await entrer());
    vrai('population : « Enregistrer » est proposé à Ana (l\'hôte)', await att(A, () => { const x = document.getElementById('salle-rec-btn'); return !x.hidden && x.getClientRects().length > 0; }));

    console.log('\n1. Ce que l\'enregistrement contient');
    await B.page.locator('#salle-partage').click();
    vrai('population : Ben partage son écran, Ana l\'a en grand', await att(A, () => { const t = document.querySelector('#salle-scene > .salle-tuile.grand'); const v = t && t.querySelector('video'); return !!v && v.videoWidth > 0; }, null, 20000));
    await A.page.locator('#salle-annoter').click();
    const pt = (fx, fy) => A.page.evaluate(([fx, fy]) => { const cv = document.querySelector('.annot-calque'), t = cv.parentElement, r = cv.getBoundingClientRect(), v = t.querySelector('video'), q = v.videoWidth / v.videoHeight, W = t.clientWidth, H = t.clientHeight, w = Math.min(W, H * q), h = w / q; return [r.left + (W - w) / 2 + fx * w, r.top + (H - h) / 2 + fy * h]; }, [fx, fy]);
    await A.page.locator('#annot-barre [data-outil="rect"]').click();
    const p1 = await pt(0.3, 0.35), p2 = await pt(0.7, 0.75);
    await A.page.mouse.move(p1[0], p1[1]); await A.page.mouse.down(); await A.page.mouse.move((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2); await A.page.mouse.move(p2[0], p2[1]); await A.page.mouse.up();
    vrai('population : Ana a tracé un rectangle rouge sur l\'écran de Ben', await att(A, () => (document.querySelector('.annot-calque') || {}).dataset.n === '1'));
    await A.page.locator('#annot-fin').click();
    vrai('Ana enregistre : le bandeau « REC » paraît chez Ben', await enregistrer(500) && await att(B, () => !document.getElementById('salle-rec').hidden));
    await A.page.waitForTimeout(2500);
    await A.page.locator('#salle-rec-btn').click();
    vrai('Ana arrête : la carte « Enregistrement terminé » paraît', await att(A, () => !document.getElementById('rec-fin').hidden, null, 15000));
    const info = await A.page.evaluate(() => document.getElementById('rec-fin-info').textContent);
    vrai('   elle dit le titre, la durée et la taille (« Revue de projet · 3 s · 1 Mo »)', /^Revue de projet · \d+ s · \d+ Mo$/.test(info), info);
    /* 8 octobre 2026 : « il faudrait que ce soit de meilleure qualité » — au bureau 1080p (ailleurs 720p) */
    vrai('   l\'aperçu se lit : en 1920 × 1080 au bureau (1280 × 720 ailleurs)', await att(A, () => { const v = document.getElementById('rec-fin-video'), hd = document.documentElement.dataset.kind === 'desktop'; return v.readyState >= 2 && v.videoWidth === (hd ? 1920 : 1280) && v.videoHeight === (hd ? 1080 : 720); }, null, 15000),
      await A.page.evaluate(() => { const v = document.getElementById('rec-fin-video'); return document.documentElement.dataset.kind + ' ' + v.videoWidth + '×' + v.videoHeight; }));
    /* ⛔ l'image ENREGISTRÉE porte le rectangle d'Ana : une image de la vidéo, relue au pixel (le rouge des annotations, #ff3b30) */
    const rouges = await A.page.evaluate(async () => {
      const v = document.getElementById('rec-fin-video'); v.muted = true;
      try { v.currentTime = 1; await new Promise(ok => { v.onseeked = ok; setTimeout(ok, 1500); }); } catch (e) { /* une vidéo sans index : la première image */ }
      const c = document.createElement('canvas'); c.width = 1280; c.height = 720; const g = c.getContext('2d'); g.drawImage(v, 0, 0, 1280, 720);
      const d = g.getImageData(0, 0, 1280, 720).data; let n = 0;
      for (let i = 0; i < d.length; i += 4) if (d[i] > 200 && d[i + 1] < 110 && d[i + 2] < 110) n++;
      return n;
    });
    /* 8 octobre 2026 : « il faut que ça enregistre le son aussi » — la piste audio du fichier, DÉCODÉE (pas seulement présente) : l'énergie de la voix mélangée (le faux micro du navigateur bipe) */
    const son = await A.page.evaluate(async () => {
      /* la page interdit `fetch` vers une adresse blob: (sa politique) : on écoute l'aperçu lui-même, par un analyseur (la sortie du navigateur est coupée, le graphe tourne quand même) */
      try {
        const v = document.getElementById('rec-fin-video'), ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser(); an.fftSize = 2048;
        ctx.createMediaElementSource(v).connect(an); an.connect(ctx.destination); await ctx.resume();
        v.muted = false; v.volume = 1; v.currentTime = 0; await v.play();
        const d = new Float32Array(an.fftSize); let pic = 0, n = 0;
        const t0 = performance.now(); while (performance.now() - t0 < 2500) { an.getFloatTimeDomainData(d); for (let i = 0; i < d.length; i++) pic = Math.max(pic, Math.abs(d[i])); n++; await new Promise(r => setTimeout(r, 50)); }
        v.pause(); return { duree: Math.round(v.duration * 10) / 10 || 0, pic: Math.round(pic * 1000) / 1000, lectures: n };
      } catch (e) { return { erreur: String(e && e.message || e) }; }
    });
    vrai('⛔ le fichier porte du SON : sa piste audio se décode et n\'est pas muette (' + JSON.stringify(son) + ')', !son.erreur && son.lectures > 10 && son.pic > 0.01);
    vrai('⛔ l\'image ENREGISTRÉE porte le rectangle rouge d\'Ana (' + rouges + ' points rouges relus sur la vidéo)', rouges > 300);
    await att(A, () => !document.getElementById('rec-fin-absents').hidden, null, 6000);
    v('la carte dit qui n\'était pas là : Cléo', await A.page.evaluate(() => [!document.getElementById('rec-fin-absents').hidden, /^Pas là : Cleo Banc — /.test(document.getElementById('rec-fin-absents').textContent)]), [true, true]);
    await capture(A, 'rec-fin');
    v('le focus est sur « Envoyer dans la discussion », et Échap ne ferme PAS la carte (le fichier ne part pas en fumée)', await (async () => { const f = await A.page.evaluate(() => document.activeElement.id); await A.page.keyboard.press('Escape'); return [f, await A.page.evaluate(() => !document.getElementById('rec-fin').hidden), await A.page.evaluate(() => document.documentElement.dataset.salle === '1')]; })(), ['rec-fin-envoyer', true, true]);

    console.log('\n2. Envoyer à tous les participants, gardé trois jours');
    v('la carte dit « Envoyer à tous les participants » et « gardé 3 jours puis supprimé automatiquement »', await A.page.evaluate(() => [document.getElementById('rec-fin-envoyer').textContent, !document.getElementById('rec-fin-garde').hidden && /gardé 3 jours puis supprimé/.test(document.getElementById('rec-fin-garde').textContent)]), ['Envoyer à tous les participants', true]);
    await A.page.locator('#rec-fin-envoyer').click();
    vrai('la carte se ferme', await att(A, () => document.getElementById('rec-fin').hidden));
    let msg = null;
    for (let i = 0; i < 80 && !msg; i++) { const r = await C0.get('/api/conversations/' + G + '/messages'); const l = (r.j && (r.j.messages || r.j.items)) || []; msg = l.find(m => m.type === 'fichier') || null; if (!msg) await new Promise(ok => setTimeout(ok, 250)); }
    const meta = msg ? (msg.fichier || msg.meta || msg) : {};
    v('⛔ le service tient l\'échéance : le message expire TROIS JOURS après son envoi (le balayeur l\'emportera, fichier compris)', msg && msg.expire - msg.ts, 259200000);
    vrai('Cléo, qui n\'était pas là, a le fichier dans la conversation du groupe : « Enregistrement — Revue de projet — … .webm »', !!msg && /^Enregistrement — Revue de projet — \d{4}-\d{2}-\d{2} \d{2}h\d{2}\.webm$/.test(meta.nom || JSON.stringify(msg)), msg ? JSON.stringify(meta).slice(0, 200) : 'aucun message');

    console.log('\n3. Supprimer demande une seconde touche');
    vrai('population : un second enregistrement', await enregistrer(1500));
    await A.page.locator('#salle-rec-btn').click();
    await att(A, () => !document.getElementById('rec-fin').hidden, null, 15000);
    await A.page.locator('#rec-fin-jeter').click();
    v('une touche : « Supprimer définitivement ? », la carte reste', await A.page.evaluate(() => [document.getElementById('rec-fin-jeter').textContent, !document.getElementById('rec-fin').hidden]), ['Supprimer définitivement ?', true]);
    await A.page.locator('#rec-fin-jeter').click();
    vrai('la seconde la ferme', await att(A, () => document.getElementById('rec-fin').hidden));

    console.log('\n4. Enregistrer sur cet appareil');
    await enregistrer(1500);
    await A.page.locator('#salle-rec-btn').click();
    await att(A, () => !document.getElementById('rec-fin').hidden, null, 15000);
    const [dl] = await Promise.all([A.page.waitForEvent('download', { timeout: 15000 }).catch(() => null), A.page.locator('#rec-fin-garder').click()]);
    vrai('le navigateur télécharge « Enregistrement - Revue de projet - … .webm » (un nom en ASCII : il survit à tous les systèmes de fichiers)', !!dl && /^Enregistrement - Revue de projet - \d{4}-\d{2}-\d{2} \d{2}h\d{2}\.webm$/.test(dl.suggestedFilename()), dl && dl.suggestedFilename());
    if (dl) await dl.path().catch(() => null);

    console.log('\n5. Quitter la salle en enregistrant');
    await enregistrer(1500);
    await A.page.locator('#salle-quitter').click();
    if (await att(A, () => !!document.querySelector('[data-sa="quitter-simple"]'), null, 4000)) await A.page.locator('[data-sa="quitter-simple"]').click();
    vrai('⛔ la salle se ferme, la carte « Enregistrement terminé » reste : le fichier n\'est pas perdu', await att(A, () => document.documentElement.dataset.salle !== '1' && !document.getElementById('rec-fin').hidden, null, 15000));
    await capture(A, 'rec-fin-hors-salle');
    await A.page.locator('#rec-fin-jeter').click(); await A.page.locator('#rec-fin-jeter').click();
    for (const [nom, S] of [['Ana', A], ['Ben', B]]) v('aucune erreur JavaScript chez ' + nom, S.erreurs, []);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
