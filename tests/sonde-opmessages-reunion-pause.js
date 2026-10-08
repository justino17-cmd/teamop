/* ══ SONDE — « NE PAS DÉRANGER PENDANT UNE RÉUNION », DANS LA VRAIE PAGE SERVIE (8 octobre 2026) ══════════════════════════════════════════════════════
   Justin : « fais tout ça » — pendant une réunion, les messages ne font pas sonner, et les autres voient qu'on est en réunion. Contre le VRAI service (son balayeur d'appels) :
     1. au bureau, Cléo regarde ses contacts : Ben « En ligne » ; Ben entre dans un appel de groupe → sa ligne dit « En réunion », son avatar porte la pastille rouge barrée ; Ben sort →
        « En ligne » de nouveau, plus de pastille rouge ;
     2. au téléphone, Ben ouvre Réglages › Notifications : « Pause pendant les réunions » est ALLUMÉ ; le toucher le coupe — le COMPTE le retient (`prefs.pause_reunion`) — et le retoucher le rallume.
   (Ce qui ne sonne pas, et le résumé à la sortie, se jouent au service : test-937, un faux service push dont chaque charge est déchiffrée.)
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-reunion-pause.js   (CAPTURES=/dossier pour les images)
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
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc' };
const TEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, BUREAU = { viewport: { width: 1440, height: 900 } };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], presenceGraceMs: 400, appels: { balayageMs: 150, perduMs: 600000 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const pages = [], flux = [];
  try {
    const P = {}; for (const l of Object.keys(MOTS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    for (const [x, y] of [['ana', 'ben'], ['ana', 'cleo'], ['ben', 'cleo']]) { const k = await P[x].post('/api/contacts/lien', { max: 1 }); await P[y].post('/api/liens/accepter', { code: k.j.code }); }
    const G = (await P.ana.post('/api/conversations/groupe', { nom: 'Réunion', membres: [P.ben.moi.id] })).j.conversation.id;
    vrai('population : un groupe Ana + Ben, et Cléo a Ben pour contact', !!G && ((await P.cleo.get('/api/contacts')).j.contacts || []).some(c => c.id === P.ben.moi.id));
    const fB = await T.flux(P.ben); flux.push(fB);            // Ben est « en ligne » (une page ouverte ailleurs)

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

    console.log('\n── 1. Cléo voit Ben « En réunion » ──');
    const C = await ouvrir('cleo', BUREAU, '#contacts');
    const ligneBen = (nom) => C.page.evaluate((n) => { const l = Array.from(document.querySelectorAll('#vue-contacts .contact')).find(x => (x.querySelector('.contact-nom') || {}).textContent === n); return l ? { role: (l.querySelector('.contact-role') || {}).textContent || '', rouge: !!l.querySelector('.avatar .presence.reunion'), vert: !!l.querySelector('.avatar .presence:not(.reunion)') } : null; }, nom);
    vrai('population : la ligne de Ben dit « En ligne », pastille verte', await att(C, () => { const l = Array.from(document.querySelectorAll('#vue-contacts .contact')).find(x => (x.querySelector('.contact-nom') || {}).textContent === 'Ben Banc'); return !!l && (l.querySelector('.contact-role') || {}).textContent === 'En ligne'; }), JSON.stringify(await ligneBen('Ben Banc')));
    const appel = await P.ana.post('/api/appels', { conv: G, type: 'audio' });
    const id = appel.j && appel.j.appel && appel.j.appel.id;
    const rep = await P.ben.post('/api/appels/' + id + '/repondre', { accepte: true });
    v('population : Ana lance l\'appel du groupe, Ben répond', [appel.code, rep.code], [201, 200]);
    vrai('⛔ la ligne de Ben dit « En réunion », avec la pastille rouge barrée (et plus la verte)', await att(C, () => { const l = Array.from(document.querySelectorAll('#vue-contacts .contact')).find(x => (x.querySelector('.contact-nom') || {}).textContent === 'Ben Banc'); return !!l && (l.querySelector('.contact-role') || {}).textContent === 'En réunion' && !!l.querySelector('.avatar .presence.reunion') && !l.querySelector('.avatar .presence:not(.reunion)'); }),
      JSON.stringify(await ligneBen('Ben Banc')));
    const pastille = await C.page.evaluate(() => { const p = document.querySelector('#vue-contacts .avatar .presence.reunion'); if (!p) return null; const s = getComputedStyle(p), a = getComputedStyle(p, '::after'); return { fond: s.backgroundColor, trait: a.content !== 'none' && a.content !== 'normal' && parseFloat(a.height) >= 2, titre: p.getAttribute('title') }; });
    v('la pastille est ROUGE et barrée d\'un trait blanc, son titre dit « En réunion »', pastille && [/^rgb\(2[0-9]{2}, [0-9]{1,2}, [0-9]{1,2}\)$/.test(pastille.fond), pastille.trait, pastille.titre], [true, true, 'En réunion']);
    await capture(C, 'p1-en-reunion');
    await P.ben.post('/api/appels/' + id + '/quitter', {});
    await P.ana.post('/api/appels/' + id + '/quitter', {});
    vrai('Ben sort : « En ligne » de nouveau, plus de pastille rouge', await att(C, () => { const l = Array.from(document.querySelectorAll('#vue-contacts .contact')).find(x => (x.querySelector('.contact-nom') || {}).textContent === 'Ben Banc'); return !!l && (l.querySelector('.contact-role') || {}).textContent === 'En ligne' && !l.querySelector('.avatar .presence.reunion'); }),
      JSON.stringify(await ligneBen('Ben Banc')));

    console.log('\n── 2. Ben règle « Pause pendant les réunions » ──');
    const B = await ouvrir('ben', TEL, '#reglages/notifications');
    vrai('population : Réglages › Notifications porte l\'interrupteur, ALLUMÉ par défaut', await att(B, () => { const x = document.getElementById('reg-notif-pause'); return !!x && x.getAttribute('aria-checked') === 'true' && /résume à la sortie/.test(x.textContent); }),
      await B.page.evaluate(() => (document.getElementById('reg-notif') || {}).textContent || 'pas de section'));
    await capture(B, 'p2-reglage');
    const prefs = async () => (await P.ben.get('/api/moi')).j.moi.prefs || {};
    await B.page.locator('#reg-notif-pause').tap();
    vrai('le toucher le COUPE (l\'écran le dit)', await att(B, () => { const x = document.getElementById('reg-notif-pause'); return !!x && x.getAttribute('aria-checked') === 'false' && /Coupé/.test(x.textContent); }));
    let lu = null; for (let i = 0; i < 40; i++) { lu = (await prefs()).pause_reunion; if (lu === false) break; await new Promise(r => setTimeout(r, 100)); }
    v('⛔ … et le COMPTE le retient (le service rendra les messages sonores pendant une réunion)', lu, false);
    await B.page.locator('#reg-notif-pause').tap();
    vrai('le retoucher le rallume', await att(B, () => { const x = document.getElementById('reg-notif-pause'); return !!x && x.getAttribute('aria-checked') === 'true'; }));
    for (let i = 0; i < 40; i++) { lu = (await prefs()).pause_reunion; if (lu === true) break; await new Promise(r => setTimeout(r, 100)); }
    v('… le compte aussi', lu, true);

    v('aucune erreur JavaScript, ni chez Cléo (bureau) ni chez Ben (téléphone)', [C.erreurs, B.erreurs], [[], []]);
  } catch (e) {
    vrai('la sonde s\'est déroulée sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    for (const f of flux) { try { f.fermer(); } catch (e) { /* déjà fermé */ } }
    for (const X of pages) { try { await X.ctx.close(); } catch (e) { /* déjà fermé */ } }
    try { await b.close(); } catch (e) { /* tant pis */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
