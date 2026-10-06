/* ══ SONDE — UN GROS FICHIER, DANS LA VRAIE PAGE SERVIE ══════════════════════════════════════════════════════════════════════
   Justin, 6 octobre 2026 : « Ce fichier est trop lourd (12 Mo au plus) » … « je veux 5 Go ». La sonde joue, dans Chromium, contre le VRAI service (réglages de départ) :
     1. un fichier de 60 Mo choisi dans « + → Fichier » part — refusé avant ce jour (25 Mo au plus) ;
     2. pendant l'envoi, le statut dit OÙ il en est : « Envoi… N % » (le réseau est bridé pour que l'envoi dure), et N MONTE ;
     3. l'autre personne le reçoit, et le TÉLÉCHARGEMENT passe par l'adresse du fichier (`/api/pieces/f_…`), jamais par un `blob:` — le navigateur l'écrit sur le disque
        sans que la page le tienne en mémoire ; le fichier téléchargé fait la bonne taille, octet pour octet.
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-gros-fichier.js        Code 1 si un contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio'];
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234' };
const Mo = 1048576;

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MOTS.alice, nom: 'Alice Martin', actif: true }, bruno: { pass: MOTS.bruno, nom: 'Bruno Petit', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], quotas: { piece: { max: 100000, fenetreMs: 3600000 } } } });
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-gros-'));
  const chemin = path.join(bac, 'video-chantier.mov'), corps = crypto.randomBytes(60 * Mo);
  fs.writeFileSync(chemin, corps);
  const empreinte = crypto.createHash('sha256').update(corps).digest('hex');
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'alice', MOTS.alice), B0 = await T.connecter(svc, og, 'bruno', MOTS.bruno);
    const lien = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: lien.j.code });
    const conv = (await A0.post('/api/conversations/directe', { uid: B0.moi.id })).j.conversation.id;

    const ouvrir = async (login) => {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 860 }, reducedMotion: 'reduce', locale: 'fr-FR', acceptDownloads: true });
      const page = await ctx.newPage(); page.setDefaultTimeout(15000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, null, { timeout: 15000 });
      await page.evaluate((id) => { location.hash = '#messages/' + id; }, conv);
      await page.waitForFunction(() => { const x = document.getElementById('saisie'); return !!x && x.getClientRects().length > 0; }, null, { timeout: 15000 });
      return { ctx, page, erreurs };
    };

    console.log('\n1 et 2. Alice envoie 60 Mo, le statut dit où en est l\'envoi');
    const A = await ouvrir('alice');
    /* le réseau BRIDÉ (≈ 12 Mo/s en montée) : l'envoi dure quelques secondes, le pourcentage a le temps de se montrer */
    const cdp = await A.ctx.newCDPSession(A.page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 5, downloadThroughput: -1, uploadThroughput: 12 * Mo });
    /* on relève CHAQUE texte de statut que l'écran montre pendant l'envoi */
    await A.page.evaluate(() => { window.__vus = []; new MutationObserver(() => { for (const s of document.querySelectorAll('.statut')) { const t = s.textContent.trim(); if (t && window.__vus[window.__vus.length - 1] !== t) window.__vus.push(t); } }).observe(document.body, { subtree: true, childList: true, characterData: true }); });
    await A.page.locator('#compo-doc').setInputFiles(chemin);
    const parti = await A.page.waitForFunction(() => window.__vus.includes('Envoyé') || window.__vus.some(t => /^Lu/.test(t)), null, { timeout: 60000, polling: 100 }).then(() => true, () => false);
    const vus = await A.page.evaluate(() => window.__vus);
    vrai('population : l\'envoi s\'est terminé (« Envoyé ») — statuts vus : ' + vus.slice(0, 6).join(' · ') + (vus.length > 6 ? ' …' : ''), parti);
    const pcs = vus.map(t => (/^Envoi… (\d+) %$/.exec(t) || [])[1]).filter(Boolean).map(Number);
    vrai('⛔ « Envoi… N % » s\'est montré pendant l\'envoi (' + pcs.length + ' valeurs : ' + pcs.slice(0, 8).join(', ') + ')', pcs.length >= 2);
    vrai('   …et N MONTE (jamais en arrière), sans dépasser 99 avant la fin', pcs.every((x, i) => i === 0 || x >= pcs[i - 1]) && pcs.length > 0 && Math.max(...pcs) <= 99 && pcs[pcs.length - 1] > pcs[0]);
    const msgs = (await B0.get('/api/conversations/' + conv + '/messages')).j.messages;
    const dernier = msgs[msgs.length - 1];
    v('le message est un fichier de 60 Mo, avec son nom', [dernier && dernier.type, dernier && dernier.meta && dernier.meta.taille, dernier && dernier.meta && dernier.meta.nom], ['fichier', corps.length, 'video-chantier.mov']);
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

    console.log('\n3. Bruno le télécharge : par l\'adresse du fichier, pas par la mémoire de la page');
    const B = await ouvrir('bruno');
    const bouton = B.page.locator('.fichier[data-fichier]').last();
    await bouton.waitFor({ state: 'visible', timeout: 15000 });
    vrai('population : la bulle du fichier est là, chez Bruno', await bouton.isVisible());
    const [dl] = await Promise.all([B.page.waitForEvent('download', { timeout: 30000 }), bouton.click()]);
    const url = dl.url();
    vrai('⛔ le téléchargement part de l\'adresse du fichier (' + url.replace(svc.base, '') .slice(0, 50) + '), jamais d\'un blob: tenu en mémoire', /\/api\/pieces\/f_[0-9a-f]{32}$/.test(url) && !/^blob:/.test(url));
    v('   le nom proposé est celui du fichier', dl.suggestedFilename(), 'video-chantier.mov');
    const sortie = path.join(bac, 'recu.mov'); await dl.saveAs(sortie);
    const recu = fs.readFileSync(sortie);
    v('   le fichier téléchargé est le même, octet pour octet (60 Mo)', [recu.length, crypto.createHash('sha256').update(recu).digest('hex') === empreinte], [corps.length, true]);
    v('aucune erreur JavaScript, chez Alice ni chez Bruno', A.erreurs.concat(B.erreurs), []);
    await A.ctx.close(); await B.ctx.close();
  } finally {
    try { await b.close(); } catch (e) { /* déjà fermé */ }
    await svc.arreter(); await og.fermer();
    fs.rmSync(bac, { recursive: true, force: true });
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
