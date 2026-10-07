/* ══ SONDE — REVENIR À LA LISTE N'ALLUME PAS L'ANNEAU DE FOCUS AU DOIGT (la vraie page servie) ══════════════════════════════════════════════════════════════
   7 octobre 2026, capture d'un iPhone : « bug d'affichage » — la ligne de la conversation qu'on vient de quitter portait un cadre bleu carré, en travers des coins arrondis de
   la carte. C'était l'anneau `:focus-visible` : en revenant, la page rend le focus à la ligne (pour le clavier et le lecteur d'écran), et le navigateur l'allume parce que
   l'élément qui avait le focus juste avant — le CHAMP de saisie — l'avait (un champ l'a toujours). Contre le VRAI service :
     1. téléphone (390 px, au doigt) : écrire dans le champ, revenir (‹) — le focus est bien sur la ligne, SANS anneau ;
     2. bureau, au CLAVIER : Échap referme la conversation — le focus revient sur la ligne, AVEC l'anneau (le clavier en a besoin) ;
     3. l'anneau d'une ligne en tête ou en pied de carte suit l'arrondi de la carte (il ne coupe plus ses coins) ;
     4. les infos d'une conversation refermées au doigt : le titre reprend le focus sans anneau.
   Lancer :   node tests/sonde-opmessages-focus-retour.js   (CAPTURES=/dossier)   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
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
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc' };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben);
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
    const AB = (await A0.post('/api/conversations/directe', { uid: B0.moi.id })).j.conversation.id;
    await A0.post('/api/conversations/' + AB + '/messages', { cid: 'c1', texte: 'Bonjour' });
    const ouvrir = async (bureau) => {
      const ctx = await b.newContext(bureau ? { viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce', locale: 'fr-FR', colorScheme: 'dark' }
        : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'fr-FR', colorScheme: 'dark' });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const P = { ctx, page, erreurs: [] };
      page.on('pageerror', e => P.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill('ana'); await page.locator('#c-pass').fill(MOTS.ana); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => document.querySelectorAll('#liste-conv [data-ouvrir]').length > 0, null, { timeout: 15000 });
      return P;
    };
    const att = (P, fn, arg, ms) => P.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 100 }).then(() => true, () => false);
    const capture = async (P, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await P.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    /* ⛔ Chromium retire le focus d'un champ qui disparaît : il n'allume donc pas l'anneau comme Safari. On FORCE l'état `:focus-visible` sur l'élément focalisé (le protocole
       de pilotage, comme pour le survol) et on lit ce que la feuille en fait — c'est la question posée : « si le navigateur l'allume, se voit-il ? » */
    const forcer = async (P) => {
      const cdp = P.cdp || (P.cdp = await P.ctx.newCDPSession(P.page));
      await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument', { depth: 0 });
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: ':focus' });
      if (!nodeId) return null;
      await cdp.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: ['focus', 'focus-visible'] });
      return P.page.evaluate(() => { const a = document.activeElement, s = getComputedStyle(a); return { outline: s.outlineStyle, rayon: s.borderTopLeftRadius, doux: !!a.dataset.focusDoux }; });
    };
    const anneau = P => P.page.evaluate(() => { const a = document.activeElement; const s = a ? getComputedStyle(a) : null; return { ligne: !!a && a.matches('[data-ouvrir]'), titre: !!a && a.id === 'conv-titre', visible: !!a && a.matches(':focus-visible'), outline: s ? s.outlineStyle : null, rayon: s ? s.borderTopLeftRadius : null }; });

    console.log('\n1. Téléphone, au doigt : écrire, revenir');
    const A = await ouvrir(false);
    await A.page.locator('#liste-conv [data-ouvrir]').first().tap();
    await att(A, () => document.documentElement.dataset.conv === '1');
    await A.page.locator('#saisie').tap(); await A.page.keyboard.type('brouillon');
    await A.page.locator('#conv-retour').tap();
    vrai('population : retour à la liste', await att(A, () => document.documentElement.dataset.conv !== '1'));
    await A.page.waitForTimeout(400);
    let r = await anneau(A);
    v('le focus est rendu à la ligne (le lecteur d\'écran y reprend), SANS anneau visible', [r.ligne, r.visible, r.outline], [true, false, 'none']);
    let f = await forcer(A);
    v('⛔ et même si le navigateur l\'allume (Safari : l\'élément d\'avant, le champ, l\'avait) — `:focus-visible` forcé — la ligne rendue après un toucher ne montre pas d\'anneau', [f && f.doux, f && f.outline], [true, 'none']);
    await A.page.evaluate(() => { delete document.activeElement.dataset.focusDoux; });
    f = await forcer(A);
    v('l\'anneau d\'une ligne en tête de carte (au clavier) suit l\'arrondi de la carte : son rayon est celui de la carte', [f && f.outline, f && f.rayon], ['solid', await A.page.evaluate(() => getComputedStyle(document.querySelector('.carte-liste')).borderTopLeftRadius)]);
    await capture(A, 'focus-1-telephone');

    console.log('\n4. Les infos refermées au doigt');
    await A.page.locator('#liste-conv [data-ouvrir]').first().tap();
    await att(A, () => document.documentElement.dataset.conv === '1');
    await A.page.locator('#saisie').tap();
    await A.page.locator('#conv-titre').tap();
    await att(A, () => document.documentElement.classList.contains('feuille-ouverte'));
    await A.page.locator('#g-annuler').tap();
    await att(A, () => !document.documentElement.classList.contains('feuille-ouverte'));
    await A.page.waitForTimeout(400);
    r = await anneau(A);
    v('le titre de la conversation reprend le focus, sans anneau', [r.titre, r.visible], [true, false]);
    f = await forcer(A);
    v('⛔ …même `:focus-visible` forcé (la feuille refermée au doigt)', [f && f.doux, f && f.outline], [true, 'none']);
    v('aucune erreur JavaScript (téléphone)', A.erreurs, []);

    console.log('\n2-3. Bureau, au clavier');
    const D = await ouvrir(true);
    await D.page.locator('#liste-conv [data-ouvrir]').first().click();
    await att(D, () => document.documentElement.dataset.conv === '1');
    await D.page.locator('#saisie').click(); await D.page.keyboard.type('x');
    await D.page.keyboard.press('Escape');
    vrai('population : Échap referme la conversation', await att(D, () => document.documentElement.dataset.conv !== '1'));
    await D.page.waitForTimeout(400);
    r = await anneau(D);
    v('au clavier, le focus revient sur la ligne AVEC son anneau (le clavier en a besoin)', [r.ligne, r.visible, r.outline], [true, true, 'solid']);
    f = await forcer(D);
    v('…et rien ne l\'éteint : pas de marque « doux » après une touche', [f && f.doux, f && f.outline], [false, 'solid']);
    vrai('l\'anneau de la ligne en tête de carte suit l\'arrondi de la carte (rayon ' + r.rayon + ')', parseFloat(r.rayon) > 0);
    await capture(D, 'focus-2-bureau-clavier');
    v('aucune erreur JavaScript (bureau)', D.erreurs, []);
  } catch (x) {
    vrai('la sonde est morte : ' + (x && x.stack || x), false);
  } finally {
    try { await b.close(); } catch (x) {}
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
