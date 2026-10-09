/* ══ SONDE — « MODIFIER » DE LA LISTE : ÉPINGLER, ARCHIVER, MARQUER LU, DANS LA VRAIE PAGE SERVIE (9 octobre 2026) ════════════════════════════════════════
   L'inventaire de Justin (« continue le développement ») : le bouton « Modifier » de la liste ne disait que « arrive bientôt », alors que le service savait épingler et archiver.
   Contre le VRAI service, quatre personnes, Ana au téléphone (360 px, l'écran le plus étroit), puis au bureau :
     1. « Modifier » : chaque ligne se COCHE au lieu de s'ouvrir, la barre d'onglets cède la place à la barre des gestes (dans l'écran, sans défilement de côté) ; rien de coché, rien d'actif ;
     2. deux conversations cochées → « Archiver » : elles sortent de la liste, une ligne « Archivées » en bas les rassemble ; le SERVICE les dit archivées ; on y entre, on en sort ;
     3. ⛔ quelqu'un écrit dans une archivée : elle REVIENT dans la liste — sauf celle qu'Ana a mise en sourdine, qui reste aux Archivées avec son point « non lu » ;
     4. épingler une conversation la met dans la rangée du haut ; toutes épinglées, le geste devient « Désépingler » ;
     5. « Lu » : une conversation non lue cochée perd son point, et le service le sait ;
     6. une recherche retrouve une archivée ; au bureau, Échap sort du mode ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-ranger.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678', dan: 'pw-dan-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc', dan: 'Dan Banc' };
const TEL = { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, BUREAU = { viewport: { width: 1440, height: 900 } };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], formule: { toutOuvert: false } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const pages = [];
  try {
    const P = {}; for (const l of Object.keys(MOTS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    for (const l of ['ben', 'cleo', 'dan']) { const k = await P.ana.post('/api/contacts/lien', { max: 1 }); await P[l].post('/api/liens/accepter', { code: k.j.code }); }
    const k2 = await P.ben.post('/api/contacts/lien', { max: 1 }); await P.cleo.post('/api/liens/accepter', { code: k2.j.code });
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const ecrire = (X, conv, texte) => X.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte });
    const D = {};
    for (const l of ['ben', 'cleo', 'dan']) { D[l] = (await P.ana.post('/api/conversations/directe', { uid: P[l].moi.id })).j.conversation.id; await ecrire(P.ana, D[l], 'Salut ' + NOMS[l].split(' ')[0]); await ecrire(P[l], D[l], 'Salut Ana'); }
    const FOOT = (await P.ana.post('/api/conversations/groupe', { nom: 'Foot du jeudi', membres: [P.ben.moi.id, P.cleo.moi.id] })).j.conversation.id;
    await ecrire(P.ben, FOOT, 'On joue jeudi ?');
    const listeAna = async () => (await P.ana.get('/api/conversations')).j.conversations;
    const de = async (id) => (await listeAna()).find(c => c.id === id) || {};
    v('population : quatre conversations chez Ana (trois directes, un groupe), aucune archivée ni épinglée', [(await listeAna()).length, (await listeAna()).filter(c => c.archive || c.epingle).length], [4, 0]);

    const ouvrir = async (login, pf, hash) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' }, pf));
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
    /* ce que la liste montre : les lignes ouvrables, les cochables (et cochées), la ligne « Archivées », la rangée des épinglées */
    const ecran = (X) => X.page.evaluate(() => ({
      ouvrir: Array.from(document.querySelectorAll('#liste-conv [data-ouvrir]')).map(x => x.dataset.ouvrir),
      choisir: Array.from(document.querySelectorAll('#liste-conv [data-choisir]')).map(x => x.dataset.choisir + (x.getAttribute('aria-pressed') === 'true' ? '*' : '')),
      archives: (() => { const a = document.querySelector('#liste-conv [data-archives]'); return a ? a.getAttribute('aria-label') : null; })(),
      epingles: document.getElementById('epingles').hidden ? [] : Array.from(document.querySelectorAll('#epingles [data-ouvrir]')).map(x => x.dataset.ouvrir),
      modifier: document.getElementById('btn-modifier').textContent,
      barre: document.getElementById('liste-actions').hidden ? null : { n: document.querySelector('.liste-actions-n').textContent, gestes: Array.from(document.querySelectorAll('#liste-actions [data-ranger]')).map(x => x.dataset.ranger + (x.disabled ? '-' : '')) },
    }));
    const tri = a => a.slice().sort();

    console.log('\n── 1. Au téléphone (360 px) : « Modifier » coche au lieu d\'ouvrir ──');
    const A = await ouvrir('ana', TEL, '#messages');
    await att(A, () => document.querySelectorAll('#liste-conv [data-ouvrir]').length === 4);
    v('population : la liste d\'Ana montre ses quatre conversations, « Modifier » au repos', [tri((await ecran(A)).ouvrir), (await ecran(A)).modifier], [tri([D.ben, D.cleo, D.dan, FOOT]), 'Modifier']);
    await A.page.locator('#btn-modifier').tap();
    await att(A, () => document.querySelectorAll('#liste-conv [data-choisir]').length === 4);
    const e1 = await ecran(A);
    v('« Modifier » : quatre lignes à cocher (aucune ouvrable), le bouton dit « OK », la barre dit « Touche des conversations » et ses trois gestes sont éteints',
      [e1.ouvrir.length, e1.choisir.length, e1.modifier, e1.barre], [0, 4, 'OK', { n: 'Touche des conversations', gestes: ['epingler-', 'archiver-', 'lu-'] }]);
    v('⛔ la barre d\'onglets cède la place (comme dans Mail) — population : elle était visible avant', await A.page.evaluate(() => getComputedStyle(document.querySelector('.tabs')).display), 'none');
    await A.page.locator('[data-choisir="' + D.ben + '"]').tap();
    await A.page.locator('[data-choisir="' + D.cleo + '"]').tap();
    /* ⛔ (relecture adverse) une recherche qui CACHE une cochée ne la décoche pas : effacer la recherche la rend cochée */
    await A.page.locator('#recherche-conv').fill('Foot');
    await att(A, () => document.querySelectorAll('#liste-conv [data-choisir]').length === 1);
    await A.page.locator('#recherche-conv').fill('');
    await att(A, () => document.querySelectorAll('#liste-conv [data-choisir]').length === 4);
    const e2 = await ecran(A);
    v('deux lignes cochées (aria-pressed) — ⛔ toujours cochées après une recherche qui les cachait — la barre dit « 2 sélectionnées » et ses gestes s\'allument', [e2.choisir.filter(x => x.endsWith('*')).length, e2.barre.n, e2.barre.gestes], [2, '2 sélectionnées', ['epingler', 'archiver', 'lu']]);
    const geo = await A.page.evaluate(() => { const r = document.getElementById('liste-actions').getBoundingClientRect(); return { dans: r.left >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5 && r.height > 40, large: document.documentElement.scrollWidth <= innerWidth, boutons: Array.from(document.querySelectorAll('#liste-actions button')).every(x => { const q = x.getBoundingClientRect(); return q.height >= 44 && q.width >= 44 && x.scrollWidth <= x.clientWidth + 1; }) }; });
    v('⛔ à 360 px : la barre tient dans l\'écran, rien ne défile de côté, chaque geste fait au moins 44 × 44 et son mot n\'est pas coupé', geo, { dans: true, large: true, boutons: true });
    await capture(A, 'r1-selection');

    console.log('\n── 2. « Archiver » : elles sortent de la liste, « Archivées » les rassemble ──');
    await A.page.locator('#liste-actions [data-ranger="archiver"]').tap();
    vrai('elles sortent de la liste, la ligne « Archivées, 2 » paraît en bas, et le mode « Modifier » est fini (la barre d\'onglets revient)',
      await att(A, (ids) => { const o = Array.from(document.querySelectorAll('#liste-conv [data-ouvrir]')).map(x => x.dataset.ouvrir); const a = document.querySelector('#liste-conv [data-archives]'); return o.length === 2 && !o.includes(ids[0]) && !o.includes(ids[1]) && a && /^Archivées, 2/.test(a.getAttribute('aria-label')) && document.querySelector('#liste-conv li:last-child [data-archives]') && document.getElementById('btn-modifier').textContent === 'Modifier' && getComputedStyle(document.querySelector('.tabs')).display !== 'none'; }, [D.ben, D.cleo]),
      JSON.stringify(await ecran(A)));
    v('⛔ (relecture adverse) le focus ne tombe pas sur la page : il revient sur « Modifier »', await A.page.evaluate(() => document.activeElement && document.activeElement.id), 'btn-modifier');
    v('⛔ le SERVICE les dit archivées — pour Ana seulement (Ben ne voit rien changer)', [(await de(D.ben)).archive, (await de(D.cleo)).archive, (await de(D.dan)).archive, ((await P.ben.get('/api/conversations')).j.conversations.find(c => c.id === D.ben) || {}).archive], [true, true, false, false]);
    await capture(A, 'r2-archivees-ligne');
    await A.page.locator('#liste-conv [data-archives]').tap();
    vrai('on entre dans « Archivées » : son titre, la phrase qui dit la règle, et les deux conversations (ouvrables)',
      await att(A, (ids) => { const t = document.querySelector('.liste-invit-tete h2'); const o = Array.from(document.querySelectorAll('#liste-conv [data-ouvrir]')).map(x => x.dataset.ouvrir).sort(); return t && t.textContent === 'Archivées' && /revient dans la liste quand on y écrit/.test(document.getElementById('liste-conv').textContent) && JSON.stringify(o) === JSON.stringify(ids.slice().sort()); }, [D.ben, D.cleo]));
    await capture(A, 'r2b-archivees');
    await A.page.locator('[data-archives-retour]').tap();
    vrai('« ‹ Messages » ramène à la liste', await att(A, () => !document.querySelector('.liste-invit-tete') && document.querySelectorAll('#liste-conv [data-ouvrir]').length === 2));

    console.log('\n── 3. ⛔ Quelqu\'un écrit dans une archivée : elle revient — sauf en sourdine ──');
    v('population : Ana met Dan en sourdine, puis l\'archive (Modifier → Dan → Archiver)', (await P.ana.post('/api/conversations/' + D.dan + '/prefs', { muet_jusqua: Date.now() + 3600000 })).code, 200);
    await A.page.locator('#btn-modifier').tap(); await A.page.locator('[data-choisir="' + D.dan + '"]').tap(); await A.page.locator('#liste-actions [data-ranger="archiver"]').tap();
    vrai('… « Archivées, 3 »', await att(A, () => { const a = document.querySelector('#liste-conv [data-archives]'); return a && /^Archivées, 3/.test(a.getAttribute('aria-label')); }));
    await ecrire(P.ben, D.ben, 'Tu es là ?');
    await ecrire(P.dan, D.dan, 'Rappelle-moi');
    await att(A, (ids) => { const o = Array.from(document.querySelectorAll('#liste-conv [data-ouvrir]')).map(x => x.dataset.ouvrir); const a = document.querySelector('#liste-conv [data-archives]'); return o.includes(ids[0]) && !o.includes(ids[1]) && a && /^Archivées, 2, dont 2 non lues/.test(a.getAttribute('aria-label')) && !!a.querySelector('.point'); }, [D.ben, D.dan]);
    const e3 = await ecran(A);
    v('⛔ Ben écrit : sa conversation REVIENT dans la liste (sans recharger) ; Dan écrit aussi, mais Ana l\'a mis en sourdine : il reste aux Archivées (avec Cléo, jamais lue), et la ligne porte un point « non lu »',
      [e3.ouvrir.includes(D.ben), e3.ouvrir.includes(D.dan), e3.archives, await A.page.evaluate(() => { const a = document.querySelector('#liste-conv [data-archives]'); return !!(a && a.querySelector('.point')); })],
      [true, false, 'Archivées, 2, dont 2 non lues', true]);
    v('… et le service dit la même chose', [(await de(D.ben)).archive, (await de(D.dan)).archive], [false, true]);

    console.log('\n── 4. Épingler, puis désépingler ──');
    await A.page.locator('#btn-modifier').tap(); await A.page.locator('[data-choisir="' + FOOT + '"]').tap();
    v('population : la barre propose « Épingler » (Foot n\'est pas épinglé)', (await ecran(A)).barre.gestes[0], 'epingler');
    await A.page.locator('#liste-actions [data-ranger="epingler"]').tap();
    vrai('Foot paraît dans la rangée des épinglées, en haut', await att(A, (f) => Array.from(document.querySelectorAll('#epingles [data-ouvrir]')).some(x => x.dataset.ouvrir === f) && !document.getElementById('epingles').hidden, FOOT));
    v('… le service le dit épinglé', (await de(FOOT)).epingle, true);
    await capture(A, 'r4-epingle');
    await A.page.locator('#btn-modifier').tap();
    v('⛔ en mode « Modifier », la rangée des épinglées se retire (on ne coche que dans la liste)', (await ecran(A)).epingles, []);
    await A.page.locator('[data-choisir="' + FOOT + '"]').tap();
    v('toutes les cochées sont épinglées : le geste devient « Désépingler »', (await ecran(A)).barre.gestes[0], 'desepingler');
    await A.page.locator('#liste-actions [data-ranger="desepingler"]').tap();
    vrai('la rangée des épinglées disparaît', await att(A, () => document.getElementById('epingles').hidden));
    v('… le service le dit', (await de(FOOT)).epingle, false);

    console.log('\n── 5. « Lu » ──');
    vrai('population : la conversation de Ben porte un point « non lu » (son « Tu es là ? »)', await att(A, (id) => { const x = document.querySelector('#liste-conv [data-ouvrir="' + id + '"]'); return x && !!x.querySelector('.point'); }, D.ben));
    await A.page.locator('#btn-modifier').tap(); await A.page.locator('[data-choisir="' + D.ben + '"]').tap();
    v('« Lu » est allumé (une cochée est non lue)', (await ecran(A)).barre.gestes[2], 'lu');
    await A.page.locator('#liste-actions [data-ranger="lu"]').tap();
    vrai('le point disparaît', await att(A, (id) => { const x = document.querySelector('#liste-conv [data-ouvrir="' + id + '"]'); return x && !x.querySelector('.point'); }, D.ben));
    v('⛔ … et le SERVICE le sait (plus rien de non lu chez Ana pour Ben)', (await de(D.ben)).non_lus, 0);
    await A.page.locator('#btn-modifier').tap(); await A.page.locator('[data-choisir="' + D.ben + '"]').tap();
    v('sentinelle : « Lu » est éteint quand rien de coché n\'est non lu (Ben, qu\'on vient de marquer lu)', (await ecran(A)).barre.gestes.slice(-1), ['lu-']);
    await A.page.locator('#btn-modifier').tap();

    console.log('\n── 6. La recherche, le bureau, Échap ──');
    await A.page.locator('#recherche-conv').fill('Cléo');
    vrai('⛔ une recherche retrouve une conversation archivée (Cléo) — et la ligne dit « Archivée »', await att(A, (id) => { const x = document.querySelector('#liste-conv [data-ouvrir="' + id + '"]'); return !!x && /Archivée/.test(x.querySelector('.conv-etiquette') ? x.querySelector('.conv-etiquette').textContent : ''); }, D.cleo));
    await A.page.locator('#btn-modifier').tap(); await A.page.locator('[data-choisir="' + D.cleo + '"]').tap();
    v('⛔ (relecture adverse) cochée depuis la recherche, l\'archivée propose « Désarchiver » (pas « Archiver ») et ne s\'épingle pas', (await ecran(A)).barre.gestes, ['epingler-', 'desarchiver', 'lu']);
    await A.page.locator('#btn-modifier').tap();
    await A.page.locator('#recherche-conv').fill('');
    const M = await ouvrir('ana', BUREAU, '#messages');
    await att(M, () => document.querySelectorAll('#liste-conv [data-ouvrir]').length >= 2);
    await M.page.locator('#liste-conv [data-ouvrir="' + FOOT + '"]').click();
    await att(M, () => document.documentElement.dataset.conv === '1');
    await M.page.locator('#btn-modifier').click();
    vrai('au bureau, « Modifier » coche aussi (une conversation ouverte à côté)', await att(M, () => document.querySelectorAll('#liste-conv [data-choisir]').length >= 2));
    await capture(M, 'r6-bureau');
    await M.page.keyboard.press('Escape');
    vrai('⛔ (relecture adverse) UN Échap sort du mode — et SEULEMENT du mode : la conversation ouverte à côté reste', await att(M, () => document.getElementById('btn-modifier').textContent === 'Modifier' && !document.querySelector('#liste-conv [data-choisir]')) && await M.page.evaluate(() => document.documentElement.dataset.conv === '1'));
    await M.page.keyboard.press('Escape');
    vrai('… le second Échap ferme la conversation', await att(M, () => document.documentElement.dataset.conv !== '1'));

    v('aucune erreur JavaScript, au téléphone comme au bureau', [A.erreurs, M.erreurs], [[], []]);
  } catch (e) {
    vrai('la sonde s\'est déroulée sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    for (const X of pages) { try { await X.ctx.close(); } catch (e) { /* déjà fermé */ } }
    try { await b.close(); } catch (e) { /* tant pis */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
