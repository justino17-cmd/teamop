/* ══ SONDE — « VOIR LA TRANSCRIPTION » SOUS UN VOCAL, DANS LA VRAIE PAGE SERVIE (11 octobre 2026, « comme sur Instagram ») ══════════════════════════════════════════════
   Contre le VRAI service, deux personnes, et un FAUX ouvrier de transcription sur la boucle locale (il répond quand la sonde le décide ; le vrai est joué par test-1001
   et par le contrôle de l'installation). Ana au téléphone (390 px, au doigt), Ben au bureau :
     1. sous chaque vocal de Ben, « Voir la transcription » — 44 px sous le doigt, dans l'écran, du côté de la bulle ; RIEN sous un vocal trop long, rien sous un texte ;
     2. toucher : « Masquer la transcription », « Transcription en cours… », UN travail chez l'ouvrier, le focus reste sur le lien ;
     3. le texte arrive (par le flux) : dans une bulle de l'auteur, ÉCHAPPÉ, qui passe à la ligne et tient dans l'écran ; le lecteur d'écran l'apprend ;
     4. Ben, au bureau, sur SON vocal : le texte est déjà là — aucun nouveau calcul —, à droite ;
     5. un échec : la phrase et « Réessayer » (44 px) ; réessayer rend le focus au lien et le texte finit par arriver ;
     6. le menu d'un vocal : « Voir la transcription », puis « Copier la transcription » ;
     7. les deux thèmes (contraste du texte ≥ 4,5:1), les couleurs forcées (un contour), le mouvement réduit (la roue ne tourne pas) ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-transcription.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), http = require('http');
const T = require('./outils-msg');
const F = require('./outils-pieces');
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
const TEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, BUREAU = { viewport: { width: 1440, height: 900 } };
const SECRET = 'SondeSecret-' + 'Kx'.repeat(20);
const TEXTE = 'Salut Ana, je passe au chantier vers neuf heures <b>gras</b> ; prévois les clés du local technique, anticonstitutionnellementrallongé.';

/* LE FAUX OUVRIER : il note chaque travail et répond quand la sonde relâche */
function fauxOuvrier() {
  const o = { travaux: [], enAttente: [] };
  o.serveur = http.createServer((q, r) => {
    const rep = (code, j) => { r.writeHead(code, { 'content-type': 'application/json' }); r.end(JSON.stringify(j)); };
    if (q.headers.authorization !== 'Bearer ' + SECRET) { q.resume(); return rep(401, { error: 'non_autorise' }); }
    if (q.method === 'GET' && q.url === '/sante') { q.resume(); return rep(200, { ok: true, sha: 'banc0000', occupe: false }); }
    if (q.method === 'POST' && q.url === '/transcrire') { const m = []; q.on('data', d => m.push(d)); q.on('end', () => { const t = { n: Buffer.concat(m).length, repondre: rep }; o.travaux.push(t); o.enAttente.push(t); }); return; }
    q.resume(); rep(404, { error: 'introuvable' });
  });
  o.ecouter = () => new Promise(ok => o.serveur.listen(0, '127.0.0.1', () => { o.port = o.serveur.address().port; ok(); }));
  o.relacher = (code, j) => { const t = o.enAttente.shift(); if (t) t.repondre(code, j); return !!t; };
  return o;
}
/* contraste WCAG entre deux couleurs calculées « rgb(a)(…) » (le fond composé sur la page quand il est translucide) */
const lum = (c) => { const [r, g, b] = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const W = fauxOuvrier(); await W.ecouter();
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], transcription: { url: 'http://127.0.0.1:' + W.port, secret: SECRET, sondeMs: 100, delaiSondeMs: 1000, delaiBaseMs: 30000, delaiParSMs: 100 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); W.serveur.close(); process.exit(2); }
  const pages = [];
  try {
    const P = {}; for (const l of Object.keys(MOTS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    { const k = await P.ana.post('/api/contacts/lien', { max: 1 }); await P.ben.post('/api/liens/accepter', { code: k.j.code }); }
    const conv = (await P.ana.post('/api/conversations/directe', { uid: P.ben.moi.id })).j.conversation.id;
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const vocal = async (X, dur) => { const d = await F.deposer(X, { conv, genre: 'vocal', corps: F.webm(4000) }); if (d.code !== 201) throw new Error('dépôt refusé ' + d.code); return X.post('/api/conversations/' + conv + '/messages', { cid: cid(), type: 'vocal', piece: d.j.id, dur, bars: [6, 9, 14, 18, 12, 7, 6, 10, 15, 8] }); };
    await P.ben.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte: 'Je t\'envoie un vocal' });
    for (const dur of [4.2, 6, 400]) { const r = await vocal(P.ben, dur); if (r.code !== 201) throw new Error('vocal refusé ' + r.code); }
    vrai('population : le service voit l\'ouvrier (sa sonde a répondu)', await T.attendre(async () => { const h = await (await fetch(svc.base + '/health')).json(); return h.transcription && h.transcription.ok === true; }, 8000, 50));

    const ouvrir = async (login, pf, hash, extra) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' }, pf, extra || {}));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, erreurs: [] };
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/' + (hash || ''));
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      pages.push(X);
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.waitForTimeout(250); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    /* les vocaux dans l'ordre du fil : on vise par POSITION parmi les vocaux (le numéro n'est pas dans l'identifiant du message de la page) */
    const vocaux = (X) => X.page.evaluate(() => Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).filter(m => m.querySelector('.vocal')).map(m => m.dataset.mid));
    const etatN = async (X, n) => { const ids = await vocaux(X); return X.page.evaluate(({ mid }) => {
      const m = Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).find(x => x.dataset.mid === mid);
      const lien = m && m.querySelector('.transcrire-lien'), p = m && m.querySelector('p.transcription'), vo = m && m.querySelector('.vocal');
      const R = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return { g: Math.round(r.left), d: Math.round(r.right), h: Math.round(r.height), l: Math.round(r.width) }; };
      return { mid, lien: lien ? { mot: lien.textContent, exp: lien.getAttribute('aria-expanded'), ctrl: lien.getAttribute('aria-controls'), r: R(lien) } : null,
        texte: p ? { t: p.textContent, id: p.id, html: p.innerHTML, cls: p.className, lang: p.getAttribute('lang'), r: R(p), btn: p.querySelector('.tr-reessayer') ? R(p.querySelector('.tr-reessayer')) : null } : null,
        vocal: R(vo), vue: { l: innerWidth }, large: document.documentElement.scrollWidth <= innerWidth + 1, focus: document.activeElement && document.activeElement.dataset ? (document.activeElement.dataset.transcrire || null) : null };
    }, { mid: ids[n] }); };
    const annonce = (X) => X.page.evaluate(() => document.getElementById('conv-annonce').textContent);

    console.log('\n── 1. Au téléphone (390 px) : « Voir la transcription » sous les vocaux de Ben ──');
    const A = await ouvrir('ana', TEL, '#messages/' + conv);
    vrai('population : trois vocaux de Ben dans le fil', await att(A, () => Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).filter(m => m.querySelector('.vocal')).length === 3));
    vrai('le lien paraît sous les vocaux (la page a demandé au service si la transcription est installée)', await att(A, () => document.querySelectorAll('#conv-messages .transcrire-lien').length >= 1));
    const e0 = await etatN(A, 0), eLong = await etatN(A, 2);
    v('« Voir la transcription », fermé (aria-expanded="false")', e0.lien && [e0.lien.mot, e0.lien.exp], ['Voir la transcription', 'false']);
    v('⛔ 44 px sous le doigt, dans l\'écran, du côté de la bulle reçue (à gauche), et rien ne défile de côté', [e0.lien.r.h >= 44, e0.lien.r.g >= 0 && e0.lien.r.d <= e0.vue.l, Math.abs(e0.lien.r.g - e0.vocal.g) <= 12, e0.large], [true, true, true, true]);
    v('⛔ RIEN sous un vocal plus long que ce que le service transcrit (400 s > 300)', eLong.lien, null);
    v('   ni sous un texte', await A.page.evaluate(() => Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).filter(m => !m.querySelector('.vocal') && m.querySelector('.transcrire-lien')).length), 0);
    await capture(A, 'tr1-lien');

    console.log('\n── 2. Toucher : « Transcription en cours… », un seul calcul ──');
    await A.page.locator('#conv-messages .transcrire-lien').first().tap();
    vrai('« Masquer la transcription », et « Transcription en cours… » dans une bulle reliée au lien', await att(A, () => { const l = document.querySelector('#conv-messages .transcrire-lien[aria-expanded="true"]'); const p = l && document.getElementById(l.getAttribute('aria-controls')); return !!l && l.textContent === 'Masquer la transcription' && !!p && /Transcription en cours…/.test(p.textContent); }));
    vrai('⛔ UN travail chez l\'ouvrier, avec les octets du vocal', await T.attendre(() => W.travaux.length === 1 && W.travaux[0].n > 4000, 5000, 20));
    const e1 = await etatN(A, 0);
    v('le focus reste sur le lien (le fil s\'est redessiné)', e1.focus, e1.mid);
    v('la roue ne tourne pas en mouvement réduit', await A.page.evaluate(() => getComputedStyle(document.querySelector('.tr-roue')).animationName), 'none');
    await capture(A, 'tr2-en-cours');

    console.log('\n── 3. Le texte arrive par le flux ──');
    W.relacher(200, { ok: true, texte: TEXTE, langue: 'fr' });
    vrai('le texte s\'affiche sans recharger', await att(A, (t) => Array.from(document.querySelectorAll('#conv-messages p.transcription')).some(p => p.textContent === t), TEXTE));
    const e2 = await etatN(A, 0);
    v('⛔ ÉCHAPPÉ (le « <b> » du texte reste du texte), dans une bulle reçue, avec sa langue', [/<b>/.test(e2.texte.html), /&lt;b&gt;/.test(e2.texte.html), /\brecue\b/.test(e2.texte.cls), e2.texte.lang], [false, true, true, 'fr']);
    v('⛔ elle passe à la ligne et tient dans l\'écran (le mot très long compris), du côté du vocal ; rien ne défile de côté', [e2.texte.r.g >= 0 && e2.texte.r.d <= e2.vue.l, e2.texte.r.l <= Math.ceil(e2.vue.l * 0.82), e2.texte.r.h > 40, Math.abs(e2.texte.r.g - e2.vocal.g) <= 12, e2.large], [true, true, true, true, true]);
    vrai('le lecteur d\'écran l\'apprend (« Transcription prête », posé une trame après le rendu)', await att(A, () => document.getElementById('conv-annonce').textContent === 'Transcription prête'), await annonce(A));
    v('⛔ toujours un seul calcul', W.travaux.length, 1);
    await capture(A, 'tr3-texte');

    console.log('\n── 4. Ben, au bureau, sur SON vocal : déjà là ──');
    const B = await ouvrir('ben', BUREAU, '#messages/' + conv);
    vrai('population : le lien sous ses vocaux', await att(B, () => document.querySelectorAll('#conv-messages .transcrire-lien').length >= 2));
    await B.page.locator('#conv-messages .transcrire-lien').first().click();
    vrai('le texte est là tout de suite', await att(B, (t) => Array.from(document.querySelectorAll('#conv-messages p.transcription')).some(p => p.textContent === t), TEXTE));
    const eb = await etatN(B, 0);
    v('⛔ aucun nouveau calcul ; une bulle ENVOYÉE, à droite, alignée sur le vocal', [W.travaux.length, /\benvoyee\b/.test(eb.texte.cls), Math.abs(eb.texte.r.d - eb.vocal.d) <= 12], [1, true, true]);
    await capture(B, 'tr4-bureau');

    console.log('\n── 5. Un échec, puis « Réessayer » ──');
    await A.page.locator('#conv-messages .transcrire-lien:not([aria-expanded="true"])').first().tap();
    await T.attendre(() => W.enAttente.length === 1, 5000, 20);
    W.relacher(500, { error: 'echec', etape: 'whisper' });
    vrai('la phrase, et « Réessayer »', await att(A, () => Array.from(document.querySelectorAll('#conv-messages p.transcription')).some(p => /La transcription n'a pas pu se faire\./.test(p.textContent) && p.querySelector('.tr-reessayer'))));
    const e3 = await etatN(A, 1);
    v('⛔ « Réessayer » fait 44 px sous le doigt et tient dans l\'écran', [e3.texte.btn.h >= 44, e3.texte.btn.g >= 0 && e3.texte.btn.d <= e3.vue.l], [true, true]);
    await capture(A, 'tr5-echec');
    /* après un 500, le service attend la sonde suivante (100 ms ici) avant de reprendre un travail */
    await T.attendre(async () => { const h = await (await fetch(svc.base + '/health')).json(); return h.transcription.ok === true; }, 3000, 50); await A.page.waitForTimeout(300);
    await A.page.locator('#conv-messages .tr-reessayer').first().tap();
    vrai('⛔ « Réessayer » disparu, le focus passe au lien du même vocal', await att(A, (mid) => document.activeElement && document.activeElement.dataset && document.activeElement.dataset.transcrire === mid, e3.mid));
    vrai('un nouveau travail part', await T.attendre(() => W.enAttente.length === 1, 5000, 20));
    W.relacher(200, { ok: true, texte: 'Deuxième vocal transcrit', langue: 'fr' });
    vrai('le texte finit par arriver', await att(A, () => Array.from(document.querySelectorAll('#conv-messages p.transcription')).some(p => p.textContent === 'Deuxième vocal transcrit')));

    console.log('\n── 6. Le menu d\'un vocal ──');
    await A.page.locator('#conv-messages .transcrire-lien[aria-expanded="true"]').first().tap();     // refermer le premier
    const menuDe = async (n) => {
      const ids = await vocaux(A);
      await A.page.evaluate((mid) => { const m = Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).find(x => x.dataset.mid === mid); m.querySelector('.msg-plus').click(); }, ids[n]);
      await att(A, () => !document.getElementById('menu-fond').hidden && !!document.querySelector('#menu-msg [data-menu]'));
      await A.page.waitForTimeout(400);
      const l = await A.page.evaluate(() => Array.from(document.querySelectorAll('#menu-msg [data-menu]')).map(x => x.textContent));
      await A.page.keyboard.press('Escape'); await att(A, () => document.getElementById('menu-fond').hidden);
      return l;
    };
    const mFerme = await menuDe(0), mOuvert = await menuDe(1);
    v('fermée : le menu propose « Voir la transcription » ; ouverte et prête : « Copier la transcription »', [mFerme.includes('Voir la transcription'), mOuvert.includes('Copier la transcription'), mOuvert.includes('Voir la transcription')], [true, true, false]);

    console.log('\n── 7. Les deux thèmes, les couleurs forcées ──');
    const contrastes = [];
    for (const sch of ['light', 'dark']) {
      for (const X of [A, B]) {
        await X.page.emulateMedia({ colorScheme: sch, reducedMotion: 'reduce' }); await X.page.waitForTimeout(150);
        const c = await X.page.evaluate(() => { const p = Array.from(document.querySelectorAll('#conv-messages p.transcription')).find(x => !x.classList.contains('tr-note')); const l = document.querySelector('#conv-messages .transcrire-lien');
          if (!p || !l) return null;
          const col = (e, k) => { const m = getComputedStyle(e)[k].match(/[\d.]+/g).map(Number); return m; };
          const fondPage = col(document.getElementById('conv-fil') || document.body, 'backgroundColor');
          return { texte: col(p, 'color'), fond: col(p, 'backgroundColor'), lien: col(l, 'color'), page: fondPage }; });
        if (!c) { contrastes.push(0); continue; }
        const fondComp = (f, base) => f.length === 4 && f[3] < 1 ? [0, 1, 2].map(i => f[i] * f[3] + base[i] * (1 - f[3])) : f.slice(0, 3);
        const fondPage = c.page.length === 4 && c.page[3] < 0.5 ? (sch === 'dark' ? [0, 0, 0] : [255, 255, 255]) : c.page.slice(0, 3);
        contrastes.push(Math.min(ratio(c.texte.slice(0, 3), fondComp(c.fond, fondPage)), 99), ratio(c.lien.slice(0, 3), fondPage));
      }
    }
    vrai('⛔ le texte transcrit et le lien se lisent dans les deux thèmes (≥ 4,5:1 chacun) — ' + contrastes.map(x => x.toFixed(2)).join(', '), contrastes.every(x => x >= 4.5));
    await A.page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' }); await A.page.waitForTimeout(150);
    v('couleurs forcées : la bulle de texte garde un contour', await A.page.evaluate(() => getComputedStyle(document.querySelector('#conv-messages p.transcription')).borderTopStyle), 'solid');
    await A.page.emulateMedia({ forcedColors: 'none', colorScheme: 'light', reducedMotion: 'reduce' });

    v('⛔ aucune erreur JavaScript dans les deux pages', pages.map(X => X.erreurs).flat(), []);
  } catch (e) {
    console.log('  ✗ la sonde a jeté : ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    for (const X of pages) { try { await X.ctx.close(); } catch (e) { /* fermé */ } }
    try { await b.close(); } catch (e) { /* fermé */ }
    await svc.arreter(); await og.fermer(); W.serveur.close();
  }
  fin();
})();
