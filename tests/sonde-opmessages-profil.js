/* ══ SONDE — LA CARTE DE PROFIL EN BAS À GAUCHE OUVRE LES RÉGLAGES, DANS LA VRAIE PAGE SERVIE ═════════════════════════════════════════════════════════════════
   Demandé le 6 octobre 2026, capture du bureau à l'appui : « pourquoi les réglages ne sont pas quand on clique sur le profil en bas à gauche ». La carte « moi » de la
   barre latérale (avatar, nom, statut) est désormais un lien vers Réglages, comme Discord ou Slack — et depuis le 7 octobre 2026 la SEULE entrée : « Profil » a quitté le menu. Joué au bureau, jour et nuit, à la
   souris et au clavier, contre le VRAI service.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-profil.js          CAPTURES=/dossier pour les images.
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
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const MOT = 'pw-alice-1234';

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MOT, nom: 'Alice Martin', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], beta: { relectureMs: 300 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    for (const nuit of [false, true]) {
      const mode = nuit ? 'nuit' : 'jour';
      console.log('\n── bureau 1440, ' + mode + ' ──');
      const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: nuit ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'fr-FR' });
      const page = await ctx.newPage(); page.setDefaultTimeout(9000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 220)));
      const attendre = (fn, arg) => page.waitForFunction(fn, arg, { timeout: 9000, polling: 50 }).then(() => true, () => false);
      const reglagesOuverts = () => attendre(() => { const s = document.getElementById('vue-reglages'); return !!s && !s.hidden && s.getClientRects().length > 0 && location.hash === '#reglages'; });
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MOT); await page.locator('#c-entrer').click();
      vrai('population : Alice est connectée, la carte de profil est à l\'écran avec son nom', await attendre(() => { const c = document.getElementById('moi-carte'); return !!c && c.getClientRects().length > 0 && document.getElementById('moi-nom').textContent.trim().length > 0; }));
      const geo = await page.evaluate(() => { const c = document.getElementById('moi-carte'), r = c.getBoundingClientRect(); return { tag: c.tagName, h: Math.round(r.height), bas: Math.round(innerHeight - r.bottom), nom: c.getAttribute('aria-label'), curseur: getComputedStyle(c).cursor, souligne: getComputedStyle(c).textDecorationLine }; });
      v('la carte est un LIEN nommé, répond sur 44 px, en bas de la barre, curseur de lien, sans soulignement', [geo.tag, geo.h >= 44, geo.bas < 40, geo.nom, geo.curseur, geo.souligne], ['A', true, true, 'Mon profil et mes réglages', 'pointer', 'none']);
      vrai('population : on part de Messages', await attendre(() => location.hash === '' || location.hash === '#messages'));
      await page.locator('#moi-carte').click();
      vrai('un clic sur la carte ouvre Réglages', await reglagesOuverts());
      /* depuis le 7 octobre 2026, le menu n'a plus de lien « Profil » : c'est la carte qui y mène, c'est donc ELLE qui porte la page (tests/sonde-opmessages-entree-profil.js joue le reste) */
      v('le menu n\'a pas de lien « Profil » (quatre rubriques, sans compter le tableau de bord d\'un compte pro), et c\'est la carte qui porte la page', await page.evaluate(() => [Array.from(document.querySelectorAll('#nav-side a')).filter(a => a.dataset.vue !== 'accueil').length, !!document.querySelector('#nav-side a[data-vue="reglages"]'), document.getElementById('moi-carte').getAttribute('aria-current')]), [4, false, 'page']);
      if (DOSSIER) { fs.mkdirSync(DOSSIER, { recursive: true }); await page.screenshot({ path: path.join(DOSSIER, 'profil-' + mode + '.png') }); }
      await page.goBack();
      vrai('le retour du navigateur ramène à Messages (une entrée d\'historique, pas deux)', await attendre(() => { const s = document.getElementById('vue-messages'); return !!s && !s.hidden; }));
      await page.locator('#moi-carte').focus(); await page.keyboard.press('Enter');
      vrai('au clavier : Entrée sur la carte ouvre Réglages', await reglagesOuverts());
      v('aucune erreur JavaScript', erreurs, []);
      await ctx.close();
    }
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
