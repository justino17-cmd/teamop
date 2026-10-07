/* ══ SONDE — LE RAPPORT DE PRÉSENCE, DANS LA SALLE ET DANS LA FICHE D'UNE RÉUNION (la vraie page servie, deux navigateurs) ═══════════════════════════════════════════════════════
   7 octobre 2026 : « un vrai système de réunion très pro ». Contre le VRAI service : Ana (hôte) et Ben dans l'appel de leur groupe ; Cléo, membre, n'y vient pas.
     1. dans la salle, « Plus » › « Rapport de présence » (l'hôte seul : ⛔ pas chez Ben) : Ana et Ben « en ce moment », Cléo dans les absences ; « Exporter (CSV) » télécharge un fichier lisible
        par un tableur (séparateur « ; », en-tête UTF-8) qui porte les trois noms ;
     2. une réunion programmée, une séance jouée par l'API : sa fiche, chez l'organisatrice, a « Rapport de présence » ; touché, il dit la séance, Ana et Ben venus, Cléo absente avec sa réponse.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-presence.js   (CAPTURES=/dossier pour les images)
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

    console.log('\n1. Dans la salle');
    await A.page.locator('#salle-plus').click();
    vrai('« Plus » chez Ana (l\'hôte) propose « Rapport de présence »', await att(A, () => !!document.querySelector('[data-sa="presence"]')));
    await B.page.locator('#salle-plus').click();
    v('⛔ chez Ben (participant), « Plus » ne le propose pas (population : son panneau est ouvert)', await B.page.evaluate(() => [!document.getElementById('salle-panneau').hidden, !!document.querySelector('[data-sa="presence"]')]), [true, false]);
    await B.page.locator('#salle-panneau-fermer').click();
    await A.page.locator('[data-sa="presence"]').click();
    vrai('le rapport s\'ouvre : Ana et Ben « en ce moment », Cléo dans les absences', await att(A, () => { const t = document.getElementById('salle-panneau-corps').textContent; return document.getElementById('salle-panneau-titre').textContent === 'Rapport de présence' && /Ana Banc/.test(t) && /Ben Banc/.test(t) && (t.match(/en ce moment/g) || []).length === 2 && /Absences/.test(t) && /Cleo Banc/.test(t); }, null, 15000));
    await capture(A, 'presence-salle');
    const [dl] = await Promise.all([A.page.waitForEvent('download', { timeout: 15000 }).catch(() => null), A.page.locator('[data-sa="presence-csv"]').click()]);
    const csv = dl ? fs.readFileSync(await dl.path(), 'utf8') : '';
    v('« Exporter (CSV) » : un fichier « presence-revue-de-projet-AAAA-MM-JJ.csv », en-tête UTF-8, séparateur « ; », les trois noms (Cléo marquée « non »)',
      [!!dl && /^presence-revue-de-projet-\d{4}-\d{2}-\d{2}\.csv$/.test(dl.suggestedFilename()), csv.charCodeAt(0) === 0xfeff, /^\ufeff"Séance";"Nom";"Présence"/.test(csv), /"Ana Banc";"oui"/.test(csv), /"Ben Banc";"oui"/.test(csv), /"Cleo Banc";"non"/.test(csv)], [true, true, true, true, true, true]);
    await A.page.locator('[data-sa="presence-retour"]').click();
    vrai('« ‹ Plus » revient au panneau Plus', await att(A, () => document.getElementById('salle-panneau-titre').textContent === 'Plus'));
    await A.page.locator('#salle-panneau-fermer').click();
    await A.page.locator('#salle-quitter').click();
    if (await att(A, () => !!document.querySelector('[data-sa="terminer-confirmer"]'), null, 4000)) await A.page.locator('[data-sa="terminer-confirmer"]').click();
    await att(A, () => document.documentElement.dataset.salle !== '1', null, 15000);

    console.log('\n2. Dans la fiche d\'une réunion');
    const debut = Date.now() + 5 * 60000;
    const cr = await A0.post('/api/reunions', { titre: 'Point hebdo', debut, fin: debut + 3600000, invites: [B0.moi.id, C0.moi.id] });
    const R = cr.j.reunion.id;
    await C0.post('/api/reunions/' + R + '/reponse', { statut: 'decline' });
    const s1 = await A0.post('/api/reunions/' + R + '/rejoindre', {});
    await B0.post('/api/reunions/' + R + '/rejoindre', {});
    await new Promise(ok => setTimeout(ok, 1200));
    await B0.post('/api/appels/' + s1.j.appel.id + '/quitter', {}); await A0.post('/api/appels/' + s1.j.appel.id + '/quitter', {});
    vrai('population : une séance jouée (Ana et Ben entrés puis sortis), Cléo a décliné', cr.code === 201 && s1.code === 200);
    await A.page.evaluate(r => { location.hash = '#reunions/' + r; }, R);
    vrai('la fiche de la réunion, chez l\'organisatrice, propose « Rapport de présence »', await att(A, () => !!document.querySelector('#info-corps [data-reu="presence"]'), null, 15000));
    await A.page.locator('#info-corps [data-reu="presence"]').click();
    vrai('touché : la séance, Ana et Ben venus, Cléo absente « Avait décliné », et « Exporter (CSV) »', await att(A, () => { const t = document.getElementById('info-corps').textContent; return /2 présences, 1 absence/.test(t) && /Ana Banc/.test(t) && /Ben Banc/.test(t) && /Cleo BancAvait décliné/.test(t) && !!document.querySelector('#info-corps [data-reu="presence-csv"]'); }, null, 15000));
    await capture(A, 'presence-fiche');
    for (const [nom, S] of [['Ana', A], ['Ben', B]]) v('aucune erreur JavaScript chez ' + nom, S.erreurs, []);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
