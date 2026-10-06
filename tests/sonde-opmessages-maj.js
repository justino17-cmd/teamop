/* ══ SONDE — « NOUVELLE VERSION D'OP MESSAGES » : LE BANDEAU, LA BARRE, LE RETOUR, DANS LA VRAIE PAGE SERVIE ════════════════════════════════════════════════════
   Demandé le 5 octobre 2026 : « que ça soit comme OP GESTION, un système avec une barre et la mise à jour qui se fait, ou même que ça affiche “mettre à jour”, parce
   que là je sais pas si les mises à jour se font ». La page compare son empreinte (`OPMSG_BUILD`, posée par `scripts/opmsg-public.js`) à celle que le service sert dans
   `/api/config` ; cette sonde joue la VRAIE PAGE SERVIE (`server-msg/public/`) contre le VRAI service, et fait croire à un déploiement en réécrivant la seule réponse
   `/api/config` (l'empreinte servie change, rien d'autre) :
     1. même empreinte → aucun bandeau (population : la page a bien LU la version, et « À propos » dit « à jour ») ;
     2. empreinte neuve → le bandeau « Nouvelle version » paraît, « Plus tard » le range ;
     3. « Mettre à jour » → l'écran de la barre, qui avance (un fichier retenu le temps de la lire), puis la page se recharge ;
     4. le retour se DIT : toujours l'ancienne version (un relais en retard) → « n'a pas encore pu s'installer », sans relancer ; la bonne → « OP MESSAGES est à jour » ;
        dans les deux cas l'adresse perd « ?maj=1 » ;
     5. un fichier qui ne vient pas → « Réessayer », et rien n'est rechargé.
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-maj.js          CAPTURES=/dossier pour les images.
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
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true };
const SERVIE = (/const OPMSG_BUILD = '([0-9a-f]{12})';/.exec(fs.readFileSync(path.join(__dirname, '..', 'server-msg', 'public', 'opmsg-ui.js'), 'utf8')) || [])[1];
const NEUVE = SERVIE ? SERVIE.split('').reverse().join('') === SERVIE ? 'abcdefabcdef' : SERVIE.split('').reverse().join('') : null;

(async () => {
  if (!SERVIE) { console.error('Sonde non lançable : server-msg/public/opmsg-ui.js ne porte pas d\'empreinte (lancer node scripts/opmsg-public.js).'); process.exit(2); }
  const og = await T.fauxOpGestion({ alice: { pass: MOT, nom: 'Alice Martin', actif: true } });
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], beta: { relectureMs: 300 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const ctx = await b.newContext({ viewport: { width: IPHONE.w, height: IPHONE.h }, deviceScaleFactor: IPHONE.dpr, isMobile: true, hasTouch: true, reducedMotion: 'reduce', locale: 'fr-FR', baseURL: svc.base });
    const page = await ctx.newPage(); page.setDefaultTimeout(9000);
    const erreurs = [], chargements = [], configs = [], vraies = [];
    page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 220)));
    page.on('framenavigated', f => { if (f === page.mainFrame()) chargements.push(new URL(f.url()).search); });
    /* le « déploiement » : `/api/config` sert l'empreinte qu'on veut ; tout le reste vient du vrai service */
    let servie = SERVIE, retenir = null, refuser = null;
    await page.route('**/api/config', async (r) => {
      const rep = await r.fetch(); const j = await rep.json(); configs.push(servie); vraies.push(j.build);
      await r.fulfill({ response: rep, json: Object.assign({}, j, { build: servie }) });
    });
    await page.route(/\/(opmsg-ui|api|source-serveur)\.js$/, async (r) => {
      const nom = new URL(r.request().url()).pathname;
      if (refuser && nom === refuser) return r.fulfill({ status: 503, body: 'indisponible' });
      if (retenir && nom === retenir.nom) { await retenir.promesse; }
      return r.continue();
    });
    const attendre = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
    const visible = (id) => page.evaluate(x => { const e = document.getElementById(x); return !!e && !e.hidden && e.getClientRects().length > 0; }, id);
    const toucher = async (sel) => { await page.locator(sel).filter({ visible: true }).first().tap(); };
    const capture = async (nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const motDit = (txt) => attendre(t => { const m = document.getElementById('mot'); return !!m && m.classList.contains('on') && m.textContent.includes(t); }, txt);

    await page.goto(svc.base + '/');
    await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MOT); await toucher('#c-entrer');
    vrai('population : Alice est connectée dans la vraie page servie', await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, 12000));

    console.log('\n── 1. même empreinte : rien à proposer ──');
    vrai('population : la page a LU la version servie (/api/config relu par la page)', await page.waitForTimeout(1800).then(() => configs.length > 0), configs.length);
    v('le VRAI service sert dans /api/config l\'empreinte de l\'interface qu\'il sert (lue dans opmsg-ui.js au démarrage)', [...new Set(vraies)], [SERVIE]);
    v('aucun bandeau quand la version servie est la sienne', await visible('maj-bandeau'), false);
    await toucher('a[data-vue="reglages"]');
    vrai('« À propos » dit l\'application et « à jour » (' + SERVIE.slice(0, 7) + ')', await attendre(x => { const t = document.getElementById('vue-reglages').textContent; return t.includes(x) && t.includes('à jour'); }, SERVIE.slice(0, 7), 6000));

    console.log('\n── 2. un déploiement : le bandeau paraît, « Plus tard » le range ──');
    servie = NEUVE;
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(20500);   // la page ne relit pas plus d'une fois toutes les 20 s (elle revient au premier plan souvent) : on attend cette garde, pas un résultat
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    vrai('revenir sur l\'application relit la version : le bandeau « Nouvelle version d\'OP MESSAGES » paraît', await attendre(() => { const e = document.getElementById('maj-bandeau'); return !!e && !e.hidden && e.textContent.includes('Nouvelle version'); }));
    const geo = await page.evaluate(() => { const e = document.getElementById('maj-bandeau').getBoundingClientRect(), bt = document.getElementById('maj-bouton').getBoundingClientRect(), pt = document.getElementById('maj-plus-tard').getBoundingClientRect();
      return { dedans: e.left >= 0 && e.right <= innerWidth, haut: Math.round(e.top), bt: Math.round(bt.height), pt: Math.round(pt.height), flou: getComputedStyle(document.getElementById('maj-bandeau')).backdropFilter }; });
    v('le bandeau tient dans l\'écran, en haut, ses deux boutons répondent sur 44 px, en verre', [geo.dedans, geo.haut < 80, geo.bt >= 44, geo.pt >= 44, /blur/.test(geo.flou)], [true, true, true, true, true]);
    await capture('1-bandeau');
    await toucher('#maj-plus-tard');
    v('« Plus tard » range le bandeau', await visible('maj-bandeau'), false);
    await page.evaluate(() => { const e = document.getElementById('maj-bandeau'); e.hidden = false; });   // on le rouvre comme le ferait le prochain rendez-vous (30 min plus tard)

    console.log('\n── 3. « Mettre à jour » : la barre avance, puis la page se recharge ──');
    let lacher; retenir = { nom: '/source-serveur.js', promesse: new Promise(r => { lacher = r; }) };
    const avant = chargements.length;
    await toucher('#maj-bouton');
    vrai('l\'écran « Mise à jour d\'OP MESSAGES » couvre l\'écran, le bandeau est rangé', await attendre(() => { const e = document.getElementById('maj-ecran'); return !!e && !e.hidden && document.getElementById('maj-bandeau').hidden; }));
    vrai('la barre AVANCE pendant qu\'un fichier est retenu (au-delà de 4 %, en dessous de 100 %) et dit les octets reçus', await attendre(() => { const p = +document.getElementById('maj-piste').getAttribute('aria-valuenow'); return p > 4 && p < 100 && /\d+ (Ko|Mo)/.test(document.getElementById('maj-etat').textContent); }));
    const pct = await page.evaluate(() => +document.getElementById('maj-piste').getAttribute('aria-valuenow'));
    await capture('2-barre');
    servie = NEUVE;   // un relais en retard : la page rechargée sert encore… l'ancienne empreinte du point de vue de la page (la sienne n'a pas changé)
    lacher();
    vrai('puis la page se RECHARGE, une fois, avec « ?maj=1 » (barre à ' + pct + ' % au moment retenu)', await page.waitForURL(/\?maj=1/, { timeout: 9000 }).then(() => true, () => false) || chargements.slice(avant).some(s => s === '?maj=1'), chargements.slice(avant));
    await page.waitForLoadState('load');

    console.log('\n── 4. le retour se DIT ──');
    vrai('version toujours différente (un relais qui garde l\'ancien fichier) → « n\'a pas encore pu s\'installer »', await motDit('pas encore pu s\'installer'));
    vrai('l\'adresse a perdu « ?maj=1 »', await attendre(() => !/maj=1/.test(location.search)));
    await page.waitForTimeout(2000);
    v('⛔ et elle ne relance RIEN toute seule (pas de bandeau tout de suite, pas de nouveau rechargement)', [await visible('maj-bandeau'), chargements.filter(s => s === '?maj=1').length], [false, 1]);
    servie = SERVIE;
    await page.goto(svc.base + '/?maj=1');
    vrai('version servie = la sienne → « OP MESSAGES est à jour »', await motDit('OP MESSAGES est à jour'));
    vrai('l\'adresse a perdu « ?maj=1 »', await attendre(() => !/maj=1/.test(location.search)));
    await capture('3-a-jour');

    console.log('\n── 5. un fichier qui ne vient pas ──');
    servie = NEUVE; retenir = null; refuser = '/api.js';
    await page.evaluate(() => { const e = document.getElementById('maj-bandeau'); e.hidden = false; });
    const avant2 = chargements.length;
    await toucher('#maj-bouton');
    vrai('le téléchargement échoue → « Réessayer » paraît, l\'écran dit de vérifier la connexion', await attendre(() => { const r = document.getElementById('maj-reessayer'); return !!r && !r.hidden && document.getElementById('maj-etat').textContent.includes('vérifie ta connexion'); }));
    await page.waitForTimeout(800);
    v('⛔ et rien n\'est rechargé', chargements.length - avant2, 0);
    await capture('4-echec');
    refuser = null;
    await toucher('#maj-reessayer');
    vrai('« Réessayer » reprend et recharge cette fois', await page.waitForURL(/\?maj=1/, { timeout: 9000 }).then(() => true, () => false) || chargements.slice(avant2).includes('?maj=1'));
    v('aucune erreur JavaScript de toute la sonde', erreurs, []);
    await ctx.close();
  } finally {
    await b.close(); await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
