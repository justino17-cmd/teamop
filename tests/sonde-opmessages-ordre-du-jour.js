/* ══ SONDE — L'ORDRE DU JOUR ET LE COMPTE RENDU, DANS LA VRAIE PAGE SERVIE (8 octobre 2026) ═════════════════════════════════════════════════════════════
   Justin : « fais tout ça » — « un ordre du jour qu'on coche pendant la réunion, et un compte rendu automatique à la fin ». Contre le VRAI service, deux navigateurs :
     1. au bureau, Ana programme « Revue chantier » avec un ordre du jour (trois lignes) et invite Ben : la fiche dit « Ordre du jour 0 / 3 » ; elle coche « Budget » — la fiche et le SERVICE le disent ;
     2. elle entre dans la salle (« Rejoindre en audio ») ; Ben entre aussi ; « Plus » › « Ordre du jour » : les trois points, « Budget » coché ; elle coche « Planning » ; Ben (son téléphone, l'API)
        coche « Sécurité » — le panneau d'Ana le montre sans qu'elle touche rien ;
     3. « Terminer pour tous » : chez Ben (au téléphone), la conversation de la réunion porte la CARTE du compte rendu — « Compte rendu », le titre, « Présents (2) », « Ordre du jour · 3 / 3 ».
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-ordre-du-jour.js   (CAPTURES=/dossier pour les images)
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
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc' };
const PARIS = 'Europe/Paris';
const TEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, BUREAU = { viewport: { width: 1280, height: 860 } };
function localDans(t, tz) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(t)) p[x.type] = x.value;
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], appels: { balayageMs: 100, perduMs: 20000 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const pages = [];
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben);
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
    const ouvrir = async (login, pf, hash) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS, permissions: ['microphone', 'camera'] }, pf));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, erreurs: [], mobile: !!pf.isMobile };
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/' + (hash || ''));
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      pages.push(X);
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.waitForTimeout(300); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const toucher = async (X, sel) => { const l = X.page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (X.mobile) await l.tap(); else await l.click(); };

    console.log('\n── 1. Ana programme la réunion, avec son ordre du jour ──');
    const A = await ouvrir('ana', BUREAU, '#reunions');
    await att(A, () => !!document.getElementById('btn-reunion-nouvelle'));
    await toucher(A, '#btn-reunion-nouvelle');
    vrai('population : le formulaire porte le champ « Ordre du jour »', await att(A, () => !!document.getElementById('rf-odj') && document.querySelector('label[for="rf-odj"]').textContent === 'Ordre du jour'));
    const t0 = Math.ceil((Date.now() + 2 * 60000) / 60000) * 60000;
    await A.page.locator('#rf-titre').fill('Revue chantier QX');
    await A.page.locator('#rf-odj').fill('Budget\n\nPlanning\nSécurité');
    await A.page.locator('#rf-debut').fill(localDans(t0, PARIS)); await A.page.locator('#rf-fin').fill(localDans(t0 + 3600000, PARIS));
    await att(A, (u) => !!document.querySelector('[data-reu="form-invite"][data-uid="' + u + '"]'), B0.moi.id);
    await toucher(A, '[data-reu="form-invite"][data-uid="' + B0.moi.id + '"]');
    await toucher(A, '[data-reu="form-enregistrer"]');
    vrai('« Programmer » : la fiche s\'ouvre et dit « Ordre du jour 0 / 3 », trois points à cocher (la ligne vide est partie)', await att(A, () => { const l = document.querySelectorAll('#info-corps [data-reu="odj"]'); return l.length === 3 && Array.from(document.querySelectorAll('#info-corps .rubrique')).some(r => /Ordre du jour/.test(r.textContent) && /0 \/ 3/.test(r.textContent)); }),
      await A.page.evaluate(() => (document.getElementById('info-corps') || {}).textContent.slice(0, 300)));
    const R = ((await A0.get('/api/reunions?du=' + (Date.now() - 86400000) + '&au=' + (Date.now() + 3 * 86400000))).j.reunions || []).find(r => r.titre === 'Revue chantier QX');
    const odj = async () => ((await A0.get('/api/reunions/' + R.id)).j.reunion.ordre_du_jour || []).map(p => p.texte + (p.fait ? ' ✓' : ''));
    v('⛔ le SERVICE a l\'ordre du jour', await odj(), ['Budget', 'Planning', 'Sécurité']);
    await capture(A, 'o1-fiche');
    await toucher(A, '#info-corps [data-reu="odj"]');
    vrai('cocher « Budget » dans la fiche : coché, barré, « 1 / 3 »', await att(A, () => { const b = document.querySelector('#info-corps [data-reu="odj"]'); return !!b && b.getAttribute('aria-checked') === 'true' && b.classList.contains('fait') && Array.from(document.querySelectorAll('#info-corps .rubrique')).some(r => /1 \/ 3/.test(r.textContent)); }));
    /* ⛔ la COCHE se voit (8 octobre 2026, test de A à Z) : dans la fiche, `.info-corps .reglage .ic` peignait la coche en couleur d'accent — sur le rond plein, lui-même d'accent : un rond
       bleu sans coche. On lit les couleurs CALCULÉES et on reconnaît leur forme (`rgb()` ou `color(srgb …)`, CLAUDE.md) avant de comparer. */
    const coche = await A.page.evaluate(() => {
      const b = document.querySelector('#info-corps [data-reu="odj"][aria-checked="true"]'), r = b && b.querySelector('.evt-rond'), ic = r && r.querySelector('.ic');
      if (!ic) return null;
      const lire = (s) => { let m = /^rgba?\(([^)]+)\)$/.exec(s); if (m) return m[1].split(',').slice(0, 3).map(Number); m = /^color\(srgb ([^)]+)\)$/.exec(s); return m ? m[1].trim().split(/\s+/).slice(0, 3).map(x => Number(x) * 255) : null; };
      const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
      const fs = getComputedStyle(r).backgroundColor, ts = getComputedStyle(ic).color, fond = lire(fs), trait = lire(ts);
      if (!fond || !trait) return { illisible: [fs, ts] };
      const a = lum(fond), z = lum(trait);
      return { ratio: Math.round((Math.max(a, z) + 0.05) / (Math.min(a, z) + 0.05) * 100) / 100, opacite: +getComputedStyle(ic).opacity, fond: fs, trait: ts };
    });
    vrai('⛔ … et sa COCHE se voit dans le rond plein (contraste ≥ 3:1 entre le trait et le rond)', !!coche && coche.opacite === 1 && coche.ratio >= 3, coche);
    let lu = []; for (let i = 0; i < 40; i++) { lu = await odj(); if (lu[0] === 'Budget ✓') break; await new Promise(r => setTimeout(r, 100)); }
    v('… et le SERVICE le sait', lu, ['Budget ✓', 'Planning', 'Sécurité']);

    console.log('\n── 2. Dans la salle : le panneau « Ordre du jour » ──');
    vrai('population : la fiche propose « Rejoindre en audio » (la salle s\'ouvre avant le début)', await att(A, () => !!document.querySelector('#info-corps [data-reu="rejoindre"][data-type="audio"]')));
    await toucher(A, '#info-corps [data-reu="rejoindre"][data-type="audio"]');
    vrai('Ana est dans la salle', await att(A, () => document.documentElement.dataset.salle === '1', null, 20000));
    const rb = await B0.post('/api/reunions/' + R.id + '/rejoindre', {});
    vrai('population : Ben entre aussi (par son téléphone)', rb.code === 200);
    await toucher(A, '#salle-plus');
    vrai('« Plus » propose « Ordre du jour »', await att(A, () => !!document.querySelector('[data-sa="ordre"]')));
    await toucher(A, '[data-sa="ordre"]');
    vrai('le panneau « Ordre du jour » : trois points, « Budget » déjà coché, « 1 sur 3 traité »', await att(A, () => { const l = document.querySelectorAll('#salle-panneau-corps [data-sa="odj"]'); return document.getElementById('salle-panneau-titre').textContent === 'Ordre du jour' && l.length === 3 && l[0].getAttribute('aria-checked') === 'true' && /1 sur 3 traité/.test(document.getElementById('salle-panneau-corps').textContent); }),
      await A.page.evaluate(() => (document.getElementById('salle-panneau-corps') || {}).textContent.slice(0, 200)));
    await A.page.locator('#salle-panneau-corps [data-sa="odj"]').nth(1).click();
    vrai('Ana coche « Planning » : « 2 sur 3 traités »', await att(A, () => /2 sur 3 traités/.test(document.getElementById('salle-panneau-corps').textContent)));
    for (let i = 0; i < 40; i++) { lu = await odj(); if (lu[1] === 'Planning ✓') break; await new Promise(r => setTimeout(r, 100)); }
    v('… le SERVICE le sait', lu, ['Budget ✓', 'Planning ✓', 'Sécurité']);
    const idSecu = (await A0.get('/api/reunions/' + R.id)).j.reunion.ordre_du_jour[2].id;
    await B0.post('/api/reunions/' + R.id + '/ordre-du-jour', { point: idSecu, fait: true });
    vrai('⛔ Ben coche « Sécurité » de son côté : le panneau d\'Ana le montre SANS qu\'elle touche rien (« 3 sur 3 traités »)', await att(A, () => /3 sur 3 traités/.test(document.getElementById('salle-panneau-corps').textContent) && document.querySelectorAll('#salle-panneau-corps [data-sa="odj"][aria-checked="true"]').length === 3));
    await capture(A, 'o2-salle-ordre');

    console.log('\n── 3. « Terminer pour tous » : le compte rendu ──');
    await A.page.locator('#salle-panneau-fermer').click();
    await toucher(A, '#salle-quitter');
    vrai('population : « Quitter » propose « Terminer pour tous » à l\'hôte', await att(A, () => !!document.querySelector('[data-sa="terminer-confirmer"]')));
    await toucher(A, '[data-sa="terminer-confirmer"]');
    vrai('la salle se ferme chez Ana', await att(A, () => document.documentElement.dataset.salle !== '1', null, 20000));
    const B = await ouvrir('ben', TEL, '#messages/' + R.conv);
    vrai('⛔ chez Ben, la conversation de la réunion porte la carte du compte rendu : « Compte rendu », le titre, « Présents (2) », « Ordre du jour · 3 / 3 »', await att(B, () => {
      const c = document.querySelector('#conv-messages .compte-rendu'); if (!c) return false; const t = c.textContent;
      return /Compte rendu/.test(t) && /Revue chantier QX/.test(t) && /Présents \(2\)/.test(t) && /Ordre du jour · 3 \/ 3/.test(t) && c.querySelectorAll('.cr-points .evt-rond.plein').length === 3;
    }, null, 20000), await B.page.evaluate(() => { const c = document.querySelector('#conv-messages .compte-rendu'); return c ? c.textContent.slice(0, 300) : (document.getElementById('conv-messages') || {}).textContent.slice(0, 300); }));
    await capture(B, 'o3-compte-rendu');

    /* ⛔ 4. SUPPRIMÉE DEPUIS SA CONVERSATION (8 octobre 2026, test de A à Z) : la séance terminée n'est plus un bouton de l'Agenda — l'organisatrice passe par la conversation, dont le titre
       mène à la fiche. La conversation s'en allant avec la réunion, la page disait « Tu n'es plus dans cette conversation » par-dessus « Réunion supprimée ». */
    console.log('\n── 4. Ana supprime la réunion depuis sa conversation ──');
    await A.page.evaluate((c) => { location.hash = '#messages/' + c; }, R.conv);
    vrai('population : la conversation de la réunion s\'ouvre chez Ana, son compte rendu dedans', await att(A, () => !!document.querySelector('#conv-messages .compte-rendu') && document.getElementById('conv-titre').offsetWidth > 0, null, 15000));
    await toucher(A, '#conv-titre');
    vrai('son titre mène à la fiche, qui propose « Supprimer la réunion »', await att(A, () => !!document.querySelector('#info-corps [data-reu="supprimer-demander"]')));
    await toucher(A, '#info-corps [data-reu="supprimer-demander"]');
    await att(A, () => !!document.querySelector('#info-corps [data-reu="supprimer-confirmer"]'));
    await toucher(A, '#info-corps [data-reu="supprimer-confirmer"]');
    vrai('la conversation s\'en va (le flux du service l\'a retirée de la liste)', await att(A, (c) => !document.querySelector('[data-ouvrir="' + c + '"]') && !document.documentElement.dataset.conv, R.conv, 15000));
    await A.page.waitForTimeout(300);
    v('⛔ … et la page dit « Réunion supprimée » — pas « Tu n\'es plus dans cette conversation »', await A.page.evaluate(() => document.getElementById('mot').textContent), 'Réunion supprimée');

    v('aucune erreur JavaScript, ni chez Ana (bureau) ni chez Ben (téléphone)', [A.erreurs, B.erreurs], [[], []]);
  } catch (e) {
    vrai('la sonde s\'est déroulée sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    for (const X of pages) { try { await X.ctx.close(); } catch (e) { /* déjà fermé */ } }
    try { await b.close(); } catch (e) { /* tant pis */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
