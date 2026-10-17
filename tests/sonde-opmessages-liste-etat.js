/* ══ SONDE — LA LISTE DES MESSAGES DIT LA SOURDINE, LA RÉPONSE ET L'ÉPINGLE NON LUE, DANS LA VRAIE PAGE SERVIE (lot m10, 17 octobre 2026) ═════════════════════════
   Contre le VRAI service, quatre personnes, Ana au téléphone (360 px, l'écran le plus étroit) puis au bureau :
     1. une conversation EN SOURDINE porte son croissant de lune barré (visible, dans la ligne, entre le nom et l'heure) et son point « non lu » est GRIS ;
     2. ⛔ une conversation dont le dernier mot est celui d'Ana (« Vous : … ») ne montre PAS de point « non lu », alors que le service compte toujours les messages d'avant ;
     3. une conversation ÉPINGLÉE et non lue porte un point sur son bouton de la rangée du haut — dans l'écran, sur l'avatar, pas coupé ;
     4. une ligne en sourdine ne déborde pas de l'écran (aucun défilement de côté), au téléphone comme au bureau ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-liste-etat.js   (CAPTURES=/dossier pour les images)
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
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const ecrire = (X, conv, texte) => X.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte });
    const D = {};
    for (const l of ['ben', 'cleo', 'dan']) D[l] = (await P.ana.post('/api/conversations/directe', { uid: P[l].moi.id })).j.conversation.id;
    await ecrire(P.ben, D.ben, 'Tu viens demain ?');                     // Ben : non lu, puis EN SOURDINE
    await ecrire(P.cleo, D.cleo, 'Le devis est prêt');                   // Cléo : non lu, puis ÉPINGLÉE
    await ecrire(P.dan, D.dan, 'On se retrouve où ?');                   // Dan : un message non lu, puis Ana répond sans ouvrir
    await ecrire(P.ana, D.dan, 'Au dépôt à 8 h');
    await P.ana.post('/api/conversations/' + D.ben + '/prefs', { muet_jusqua: Date.now() + 8 * 3600000 });
    await P.ana.post('/api/conversations/' + D.cleo + '/prefs', { epingle: true });
    const brute = async (id) => ((await P.ana.get('/api/conversations')).j.conversations || []).find(c => c.id === id) || {};
    v('population : le SERVICE compte un non lu chez Ben, chez Cléo ET chez Dan (envoyer n\'est pas lire), Ben est en sourdine, Cléo épinglée',
      [(await brute(D.ben)).non_lus, (await brute(D.cleo)).non_lus, (await brute(D.dan)).non_lus, (await brute(D.ben)).muet_jusqua > Date.now(), (await brute(D.cleo)).epingle], [1, 1, 1, true, true]);

    const ouvrir = async (login, pf) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' }, pf));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, erreurs: [] };
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      pages.push(X);
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.waitForTimeout(250); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    /* ce que la liste montre pour chaque conversation : le point, sa couleur, le croissant, l'aperçu */
    const ecran = (X) => X.page.evaluate(() => {
      const r = {};
      for (const b of document.querySelectorAll('#liste-conv [data-ouvrir]')) {
        const pt = b.querySelector('.point'), sd = b.querySelector('.conv-sourdine'), rc = sd ? sd.getBoundingClientRect() : null;
        r[b.dataset.ouvrir] = { point: !!pt, muet: !!(pt && pt.classList.contains('muet')), couleurPoint: pt ? getComputedStyle(pt).backgroundColor : null, croissant: !!sd, tailleCroissant: rc ? [Math.round(rc.width), Math.round(rc.height)] : null,
          croissantLabel: sd ? sd.getAttribute('aria-label') : null, apercu: (b.querySelector('.conv-apercu') || {}).textContent || '', gras: b.querySelector('.conv-nom') ? getComputedStyle(b.querySelector('.conv-nom')).fontWeight : null };
      }
      const ep = {};
      for (const b of document.querySelectorAll('#epingles [data-ouvrir]')) {
        const pt = b.querySelector('.epingle-point'), av = b.querySelector('.avatar'), rb = b.getBoundingClientRect(), ra = av.getBoundingClientRect(), rp = pt ? pt.getBoundingClientRect() : null;
        ep[b.dataset.ouvrir] = { point: !!pt, dansLEcran: !!rp && rp.left >= 0 && rp.right <= window.innerWidth && rp.top >= 0, surAvatar: !!rp && rp.left >= ra.left && rp.right <= ra.right + 2 && rp.top <= ra.top + 12 && rp.bottom > ra.top, dansLeBouton: !!rp && rp.left >= rb.left && rp.right <= rb.right && rp.top >= rb.top };
      }
      return { lignes: r, epingles: ep, largeur: document.documentElement.scrollWidth, fenetre: window.innerWidth };
    });

    for (const [nom, pf] of [['telephone', TEL], ['bureau', BUREAU]]) {
      console.log('\n' + nom + ' : la liste d\'Ana');
      const A = await ouvrir('ana', pf);
      vrai('population : les trois conversations sont dans la liste', await att(A, (n) => document.querySelectorAll('#liste-conv [data-ouvrir]').length >= n, 3));
      await att(A, (id) => !!document.querySelector('#epingles [data-ouvrir="' + id + '"]'), D.cleo);
      const e = await ecran(A);
      await capture(A, 'liste-etat-' + nom);
      const ben = e.lignes[D.ben] || {}, cleo = e.lignes[D.cleo] || {}, dan = e.lignes[D.dan] || {};
      v('⛔ Ben (en sourdine, non lu) : un croissant visible « En sourdine », et un point GRIS', [ben.croissant, ben.croissantLabel, !!ben.tailleCroissant && ben.tailleCroissant[0] > 8 && ben.tailleCroissant[1] > 8, ben.point, ben.muet], [true, 'En sourdine', true, true, true]);
      v('Cléo (ordinaire, épinglée, non lue) n\'a ni croissant ni point gris', [cleo.croissant, cleo.muet], [false, false]);
      v('⛔ Dan : le dernier mot est celui d\'Ana — « Vous : Au dépôt à 8 h », aucun point « non lu », alors que le service en compte un', [dan.apercu.replace(/^.*Vous/, 'Vous'), dan.point], ['Vous : Au dépôt à 8 h', false]);
      const rc = e.epingles[D.cleo] || {};
      v('⛔ Cléo, épinglée et non lue : un point sur son bouton de la rangée du haut, sur l\'avatar, dans l\'écran', [rc.point, rc.surAvatar, rc.dansLEcran, rc.dansLeBouton], [true, true, true, true]);
      vrai('(population) la rangée des épinglées ne contient que Cléo', Object.keys(e.epingles).length === 1);
      vrai('aucun défilement de côté (la page tient dans la largeur de l\'appareil)', e.largeur <= e.fenetre);
      v('aucune erreur JavaScript', A.erreurs, []);
    }
  } catch (e) {
    vrai('la sonde s\'est déroulée sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    for (const X of pages) { try { await X.ctx.close(); } catch (e) { /* déjà fermé */ } }
    try { await b.close(); } catch (e) { /* tant pis */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
