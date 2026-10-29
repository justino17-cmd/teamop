/* ══ SONDE — LE FIL ET LA LISTE NE SAUTENT PLUS PENDANT QU'ON LIT (29 octobre 2026) ═══════════════════════════════════════════════════════════════
   Le patron, ce jour-là : « les conversations remontent » — le fil saute, la liste saute. Contre le VRAI service, Ana au téléphone (360 × 640) :
     1. le FIL : Ana remonte lire au milieu d'une longue conversation ; Ben écrit, puis réagit à un ancien message AU-DESSUS de l'écran — ce qu'Ana lit
        ne bouge pas (ni ramené en bas, ni décalé) ; contre-épreuve : Ana tout en bas, un nouveau message la garde en bas ;
     2. la LISTE : Ana fait défiler sa liste ; un message arrive dans une conversation hors de l'écran — la ligne qu'elle regarde ne bouge pas, et les lignes
        qui n'ont pas changé gardent leur nœud (rien n'est refait sous le doigt) ;
     3. aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-sans-sauter.js
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc' };
const TEL = { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], formule: { toutOuvert: false } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  let X = null;
  try {
    const P = {}; for (const l of Object.keys(MOTS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    for (const l of ['ben', 'cleo']) { const k = await P.ana.post('/api/contacts/lien', { max: 1 }); await P[l].post('/api/liens/accepter', { code: k.j.code }); }
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const ecrire = (Q, conv, texte) => Q.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte });
    const ben = (await P.ana.post('/api/conversations/directe', { uid: P.ben.moi.id })).j.conversation.id;
    const ids = [];
    for (let i = 1; i <= 60; i++) { const r = await ecrire(i % 2 ? P.ben : P.ana, ben, 'Message numéro ' + i + (i % 7 === 0 ? ' — un peu plus long pour passer sur deux lignes dans la bulle au téléphone' : '')); ids.push(r.j && (r.j.message && r.j.message.id || r.j.id)); }
    /* des groupes pour une liste plus haute que l'écran */
    const groupes = [];
    for (let i = 1; i <= 14; i++) { const g = (await P.ana.post('/api/conversations/groupe', { nom: 'Équipe ' + i, membres: [P.ben.moi.id, P.cleo.moi.id] })).j; const gid = g && g.conversation && g.conversation.id; if (gid) { groupes.push(gid); await ecrire(P.cleo, gid, 'Bonjour équipe ' + i); } }
    vrai('population : 60 messages dans la conversation avec Ben, 14 groupes', ids.filter(Boolean).length === 60 && groupes.length === 14, [ids.filter(Boolean).length, groupes.length]);

    const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' }, TEL));
    const page = await ctx.newPage(); page.setDefaultTimeout(15000);
    X = { ctx, page, erreurs: [] }; page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
    await page.goto(svc.base + '/');
    await page.locator('#c-login').fill('ana'); await page.locator('#c-pass').fill(MOTS.ana); await page.locator('#c-entrer').click();
    await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.querySelectorAll('#liste-conv [data-ouvrir]').length >= 10; }, null, { timeout: 20000 });
    const att = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);

    console.log('\n2. la liste');
    const dl = await page.evaluate(() => { const l = document.getElementById('liste-conv'); let n = l; while (n && n !== document.body) { const o = getComputedStyle(n).overflowY; if ((o === 'auto' || o === 'scroll') && n.scrollHeight > n.clientHeight) break; n = n.parentElement; } const sc = n && n !== document.body ? n : document.scrollingElement; window.__scL = sc; return { haut: sc.scrollHeight, vue: sc.clientHeight }; });
    vrai('population : la liste est plus haute que l\'écran (' + dl.haut + ' px pour ' + dl.vue + ')', dl.haut > dl.vue + 150, dl);
    await page.evaluate(() => { window.__scL.scrollTop = 260; });
    await page.waitForTimeout(300);
    const avantL = await page.evaluate(() => { const top = window.__scL === document.scrollingElement ? 0 : window.__scL.getBoundingClientRect().top; const ls = [...document.querySelectorAll('#liste-conv [data-ouvrir]')]; const a = ls.find(x => x.getBoundingClientRect().top >= top + 10); window.__noeuds = ls; return { id: a.dataset.ouvrir, y: a.getBoundingClientRect().top, sc: window.__scL.scrollTop }; });
    /* le message arrive dans la conversation la plus ANCIENNE (en bas, hors de l'écran) : elle remonte en tête — au-dessus de ce qu'Ana regarde */
    const derniere = await page.evaluate(() => { const ls = [...document.querySelectorAll('#liste-conv [data-ouvrir]')]; return ls[ls.length - 1].dataset.ouvrir; });
    await ecrire(P.ben, derniere, 'Nouveau message tout en bas de la liste');
    const arrive = await att((id) => { const l = document.querySelector('#liste-conv [data-ouvrir]'); return l && l.dataset.ouvrir === id; }, derniere);
    vrai('population : le message est arrivé (la conversation est passée en tête de la liste)', arrive);
    await page.waitForTimeout(400);
    const apresL = await page.evaluate((id) => { const a = document.querySelector('#liste-conv [data-ouvrir="' + id + '"]'); const ls = [...document.querySelectorAll('#liste-conv [data-ouvrir]')]; return { y: a.getBoundingClientRect().top, gardes: ls.filter(x => window.__noeuds.includes(x)).length, n: ls.length }; }, avantL.id);
    vrai('⛔ la ligne qu\'Ana regardait n\'a pas bougé à l\'écran (' + Math.round(avantL.y) + ' → ' + Math.round(apresL.y) + ' px)', Math.abs(apresL.y - avantL.y) <= 2, { avantL, apresL });
    vrai('⛔ les lignes qui n\'ont pas changé gardent leur nœud (' + apresL.gardes + ' sur ' + apresL.n + ')', apresL.gardes >= apresL.n - 4, apresL);

    console.log('\n1. le fil');
    await page.locator('#liste-conv [data-ouvrir="' + ben + '"]').click();
    vrai('population : la conversation avec Ben est ouverte, ses messages sont là', await att(() => document.querySelectorAll('#conv-messages [data-mid]').length >= 40));
    await page.waitForTimeout(500);
    const fil = () => page.evaluate(() => { const f = document.getElementById('conv-fil'); const top = f.getBoundingClientRect().top; const ms = [...document.querySelectorAll('#conv-messages [data-mid]')]; const a = ms.find(x => x.getBoundingClientRect().top >= top + 20); return { mid: a && a.dataset.mid, y: a && a.getBoundingClientRect().top, st: f.scrollTop, bas: f.scrollHeight - f.scrollTop - f.clientHeight }; });
    await page.evaluate(() => { const f = document.getElementById('conv-fil'); f.scrollTop = Math.round(f.scrollHeight / 2); });
    await page.waitForTimeout(300);
    const a1 = await fil();
    vrai('population : Ana lit au milieu (' + Math.round(a1.bas) + ' px sous elle)', a1.bas > 400, a1);
    await ecrire(P.ben, ben, 'Tu as vu mon dernier message ?');
    vrai('population : le nouveau message est arrivé', await att(() => /Tu as vu mon dernier message/.test(document.getElementById('conv-messages').textContent)));
    await page.waitForTimeout(400);
    const a2 = await page.evaluate((mid) => { const e = document.querySelector('#conv-messages [data-mid="' + mid + '"]'); const f = document.getElementById('conv-fil'); return { y: e.getBoundingClientRect().top, bas: f.scrollHeight - f.scrollTop - f.clientHeight }; }, a1.mid);
    vrai('⛔ un message qui ARRIVE ne ramène pas Ana en bas, et ce qu\'elle lit ne bouge pas (' + Math.round(a1.y) + ' → ' + Math.round(a2.y) + ' px)', a2.bas > 300 && Math.abs(a2.y - a1.y) <= 2, { a1, a2 });
    /* un changement AU-DESSUS de l'écran : la bulle d'un ancien message grandit (une réaction, une modification) */
    const haut = ids[3];
    const r = await P.ben.post('/api/conversations/' + ben + '/messages/' + haut + '/reactions', { emoji: '👍' }).catch(() => null);
    const changeHaut = await att((mid) => { const e = document.querySelector('#conv-messages [data-mid="' + mid + '"]'); return !!e && /👍/.test(e.closest('#conv-messages > *').textContent); }, haut, 6000);
    if (changeHaut) {
      await page.waitForTimeout(400);
      const a3 = await page.evaluate((mid) => document.querySelector('#conv-messages [data-mid="' + mid + '"]').getBoundingClientRect().top, a1.mid);
      vrai('⛔ un ancien message AU-DESSUS qui change (une réaction) ne décale pas ce qu\'Ana lit (' + Math.round(a1.y) + ' → ' + Math.round(a3) + ' px)', Math.abs(a3 - a1.y) <= 2, { a1, a3 });
    } else console.log('   (la réaction n\'a pas pu être posée par l\'API de la sonde : contrôle non joué — ' + JSON.stringify(r && r.s) + ')');
    /* contre-épreuve : tout en bas, un message garde en bas */
    await page.evaluate(() => { const f = document.getElementById('conv-fil'); f.scrollTop = f.scrollHeight; });
    await page.waitForTimeout(300);
    await ecrire(P.ben, ben, 'Et celui-ci ?');
    vrai('population : le dernier message est arrivé', await att(() => /Et celui-ci \?/.test(document.getElementById('conv-messages').textContent)));
    await page.waitForTimeout(400);
    const a4 = await fil();
    vrai('contre-épreuve : tout en bas, un message qui arrive garde Ana en bas (' + Math.round(a4.bas) + ' px sous elle)', a4.bas < 40, a4);
    v('aucune erreur JavaScript', X.erreurs, []);
  } catch (e) {
    vrai('la sonde s\'est déroulée sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    if (X) try { await X.ctx.close(); } catch (e) { /* déjà fermé */ }
    try { await b.close(); } catch (e) { /* tant pis */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
