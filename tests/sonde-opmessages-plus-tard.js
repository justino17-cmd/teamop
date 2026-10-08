/* ══ SONDE — ENVOYER PLUS TARD, DANS LA VRAIE PAGE SERVIE (8 octobre 2026) ═════════════════════════════════════════════════════════════════════
   Justin : « fais tout ça » — « envoyer plus tard : écrire un message maintenant et le programmer pour demain 8 h ». Contre le VRAI service (son balayeur, l'horloge avancée au geste) :
     1. au bureau : la tuile « Plus tard » de la feuille « + » propose des heures (« Dans 1 heure », « Demain matin »…) et « Choisir une date » ; « Dans 1 heure » le programme :
        le champ se vide, la page le dit, une bulle EN POINTILLÉS paraît sous le fil avec l'heure prévue — et le SERVICE le tient ; ⛔ Ben ne voit RIEN ;
     2. au téléphone : l'APPUI LONG sur la flèche ouvre les mêmes heures, et le relâcher n'envoie PAS le message ; « Demain matin » le programme ;
     3. « Annuler » sur une bulle en pointillés : elle part, le service ne l'a plus ;
     4. ⛔ l'heure venue (horloge du service avancée) : le message part — Ben le reçoit, et chez Alice la bulle en pointillés devient un message.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-plus-tard.js          CAPTURES=/dossier pour les images.
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
const MOTS = { alice: 'pw-alice-12345678', ben: 'pw-ben-12345678' };
const NOMS = { alice: 'Alice Banc', ben: 'Ben Banc' };
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false };
const TEXTE_BEN = 'Peux-tu rappeler le client WQXZ demain ?';

async function ouvrir(b, base, pf, hash) {
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, erreurs: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  await page.goto(base + '/' + (hash || ''));
  await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MOTS.alice); await page.locator('#c-entrer').click();
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
  return S;
}
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
async function toucher(S, sel) { const l = S.page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (S.pf.mobile) await l.tap(); else await l.click(); }
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, horloge: true, config: { origines: ['http://127.0.0.1:' + port], balayageMs: 250 } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'alice', MOTS.alice), B0 = await T.connecter(svc, og, 'ben', MOTS.ben);
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const AB = (await A0.post('/api/conversations/directe', { uid: B0.moi.id })).j.conversation.id;
    await B0.post('/api/conversations/' + AB + '/messages', { cid: cid(), texte: TEXTE_BEN });
    const programmes = async () => ((await A0.get('/api/conversations/' + AB + '/programmes')).j.programmes || []).map(x => x.texte);
    const chezBen = async () => ((await B0.get('/api/conversations/' + AB + '/messages')).j.messages || []).map(x => x.texte);
    const T1 = 'Je passe au dépôt demain QXPT1', T2 = 'Rappelle-moi le devis QXPT2';

    console.log('\n── 1. Au bureau : la tuile « Plus tard » ──');
    const A = await ouvrir(b, svc.base, BUREAU, '#messages/' + AB);
    await attendre(A, () => document.querySelectorAll('#conv-messages .msg').length >= 1);
    await A.page.locator('#saisie').fill(T1);
    await toucher(A, '#compo-plus');
    vrai('population : la feuille « + » porte la tuile « Plus tard »', await attendre(A, () => !!document.querySelector('#menu-msg [data-plus="plus-tard"]')));
    await A.page.waitForTimeout(400);                     // un clic dans les 350 ms qui suivent l'ouverture est avalé (la garde du double toucher)
    await toucher(A, '#menu-msg [data-plus="plus-tard"]');
    await attendre(A, () => !!document.querySelector('#menu-msg [data-plus-tard]'));
    const choix = await A.page.evaluate(() => Array.from(document.querySelectorAll('#menu-msg [data-plus-tard]')).map(x => x.dataset.plusTard));
    vrai('« Plus tard » propose des heures (« Dans 1 heure », « Demain matin »…), « Choisir une date » et « Annuler »', choix.includes('1h') && choix.includes('matin') && choix.includes('choisi') && choix.includes('annuler'), JSON.stringify(choix));
    await capture(A, '1-plus-tard-bureau');
    const t0 = Date.now();
    await A.page.waitForTimeout(400);
    await toucher(A, '#menu-msg [data-plus-tard="1h"]');
    vrai('« Dans 1 heure » : la page le dit (« Programmé pour aujourd\'hui à … »), le champ se vide', await attendre(A, () => /^Programmé pour /.test(document.getElementById('mot').textContent) && document.getElementById('saisie').value === ''),
      await A.page.evaluate(() => [document.getElementById('mot').textContent, document.getElementById('avis').textContent, document.getElementById('saisie').value, !document.getElementById('menu-fond').hidden, document.getElementById('menu-msg').textContent.slice(0, 80)]));
    vrai('⛔ une bulle EN POINTILLÉS paraît sous le fil, avec l\'heure prévue et « Annuler »', await attendre(A, (t) => { const p = document.querySelector('#conv-programmes .prog-msg'); return !!p && !document.getElementById('conv-programmes').hidden && p.textContent.includes(t) && /Envoi prévu /.test(p.textContent) && getComputedStyle(p.querySelector('.bulle')).borderTopStyle === 'dashed' && !!p.querySelector('[data-prog-annuler]'); }, T1));
    await capture(A, '1b-programme-pointilles');
    v('⛔ le SERVICE le tient (dans une heure, à la minute)', await programmes(), [T1]);
    v('⛔ … et Ben ne voit RIEN (population : le message qu\'il a lui-même écrit)', [(await chezBen()).includes(TEXTE_BEN), (await chezBen()).includes(T1)], [true, false]);
    void t0;

    console.log('\n── 2. Au téléphone : l\'appui long sur la flèche ──');
    const P = await ouvrir(b, svc.base, IPHONE, '#messages/' + AB);
    await attendre(P, () => document.querySelectorAll('#conv-messages .msg').length >= 1);
    vrai('population : la bulle en pointillés est là aussi (le service la rend, pas l\'appareil)', await attendre(P, (t) => (document.getElementById('conv-programmes').textContent || '').includes(t), T1));
    await P.page.locator('#saisie').fill(T2);
    await attendre(P, () => !document.getElementById('envoyer').hidden);
    const r = await P.page.locator('#envoyer').boundingBox();
    const cdp = await P.ctx.newCDPSession(P.page);
    const pt = { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
    await P.page.waitForTimeout(800);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    vrai('l\'appui long ouvre les heures (« Envoyer plus tard »)', await attendre(P, () => !document.getElementById('menu-fond').hidden && /Envoyer plus tard/.test(document.getElementById('menu-msg').textContent) && !!document.querySelector('#menu-msg [data-plus-tard="matin"]')));
    await P.page.waitForTimeout(450);
    v('⛔ … et le relâcher n\'a PAS envoyé le message (le champ le garde, Ben n\'a rien)', [await P.page.evaluate(() => document.getElementById('saisie').value), (await chezBen()).includes(T2)], [T2, false]);
    await capture(P, '2-appui-long-iphone');
    await toucher(P, '#menu-msg [data-plus-tard="matin"]');
    vrai('« Demain matin » : programmé (la page dit « demain à 08:00 »), deux bulles en pointillés', await attendre(P, () => /^Programmé pour demain à 08:00/.test(document.getElementById('mot').textContent) && document.querySelectorAll('#conv-programmes .prog-msg').length === 2));
    v('   le service les tient tous les deux', (await programmes()).sort(), [T1, T2].sort());

    console.log('\n── 3. Annuler ──');
    await P.page.evaluate((t) => { const p = Array.from(document.querySelectorAll('#conv-programmes .prog-msg')).find(x => x.textContent.includes(t)); p.querySelector('[data-prog-annuler]').scrollIntoView({ block: 'center' }); }, T2);
    await P.page.locator('#conv-programmes .prog-msg', { hasText: T2 }).locator('[data-prog-annuler]').tap();
    vrai('« Annuler » : « Envoi annulé », la bulle part', await attendre(P, (t) => /Envoi annulé/.test(document.getElementById('mot').textContent) && !document.getElementById('conv-programmes').textContent.includes(t), T2));
    v('⛔ le service ne l\'a plus', await programmes(), [T1]);

    console.log('\n── 4. ⛔ L\'heure venue : il part ──');
    svc.avancer(61 * 60000);
    vrai('⛔ Ben le reçoit (un message d\'Alice)', await T.attendre(async () => (await chezBen()).includes(T1), 10000, 150));
    vrai('⛔ chez Alice, la bulle en pointillés est devenue un MESSAGE (plus de pointillés)', await attendre(A, (t) => Array.from(document.querySelectorAll('#conv-messages .msg.de-moi')).some(x => x.textContent.includes(t)) && document.getElementById('conv-programmes').hidden, T1, 12000),
      await A.page.evaluate(() => [document.getElementById('conv-programmes').hidden, document.getElementById('conv-messages').textContent.slice(-120)]));
    await capture(A, '4-parti');
    v('aucune erreur JavaScript', [A.erreurs, P.erreurs], [[], []]);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
