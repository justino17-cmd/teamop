/* ══ SONDE — LA MISE À JOUR OBLIGATOIRE D'OP MESSAGES, DANS LA VRAIE PAGE SERVIE ═══════════════════════════════════════════════════════════════
   Demandé le 6 octobre 2026 : « pour les mises à jour, je veux aussi le forçage de mise à jour, comme sur OP GESTION depuis la Tour ». La Tour pose
   un minimum pour l'instance (chez OP GESTION — ici le faux `fauxOpGestion`, sa route `/api/version`) ; le VRAI service le relit et refuse d'écrire
   sous lui (426) ; la VRAIE page servie (`server-msg/public/`) doit alors se mettre à jour d'elle-même, sans « Plus tard ». La sonde joue :
     1. pas de minimum : la page travaille, aucun écran ;
     2. la Tour exige la version suivante ; la page ÉCRIT (par son vrai `api.js`) → 426 → l'écran « Mise à jour obligatoire » couvre tout, sans
        « Plus tard », la barre avance, puis la page se recharge ;
     3. revenue toujours sous le minimum (le service sert encore l'ancienne page) → elle le DIT et propose « Réessayer », sans relancer en boucle ;
     4. la Tour lève l'exigence → « Réessayer » recharge, et la page est de nouveau libre (« OP MESSAGES est à jour ») ;
     5. le minimum de nouveau posé, une page qu'on OUVRE (sans rien écrire) se met à jour dès le démarrage.
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-maj-forcee.js          CAPTURES=/dossier pour les images.
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
const NUM = parseInt((/const OPMSG_VERSION = ([0-9]+);/.exec(fs.readFileSync(path.join(__dirname, '..', 'server-msg', 'public', 'opmsg-ui.js'), 'utf8')) || [])[1] || '0', 10);

(async () => {
  if (!NUM) { console.error('Sonde non lançable : server-msg/public/opmsg-ui.js ne porte pas de numéro (lancer node scripts/opmsg-public.js).'); process.exit(2); }
  const og = await T.fauxOpGestion({ alice: { pass: MOT, nom: 'Alice Martin', actif: true }, bruno: { pass: 'pw-bruno-1234', nom: 'Bruno Petit', actif: true } });
  const port = await T.portLibre();
  /* le service fait croire qu'il sert une page plus récente (NUM + 1) : la page chargée (NUM) est celle restée en arrière — sinon le service ignorerait un minimum
     au-dessus de sa propre page (`version-client.js`), et la sonde ne jouerait rien */
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], beta: { relectureMs: 150 } }, env: { OPMSG_TEST_VERSION_PAGE: String(NUM + 1) } });
  const minServi = async () => ((await T.client(svc.base).get('/api/config')).j || {}).min_client;
  const exiger = async (n) => { og.versionMin = n; return T.attendre(async () => (await minServi()) === Math.max(1, n), 8000); };
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const ctx = await b.newContext({ viewport: { width: IPHONE.w, height: IPHONE.h }, deviceScaleFactor: IPHONE.dpr, isMobile: true, hasTouch: true, reducedMotion: 'reduce', locale: 'fr-FR', baseURL: svc.base });
    const page = await ctx.newPage(); page.setDefaultTimeout(9000);
    const erreurs = [], chargements = [], refus426 = [];
    page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 220)));
    page.on('framenavigated', f => { if (f === page.mainFrame()) chargements.push(new URL(f.url()).search); });
    page.on('response', r => { if (r.status() === 426) refus426.push(new URL(r.url()).pathname); });
    let retenir = null;
    await page.route(/\/source-serveur\.js$/, async (r) => { if (retenir) await retenir.promesse; return r.continue(); });
    const attendre = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
    const visible = (id) => page.evaluate(x => { const e = document.getElementById(x); return !!e && !e.hidden && e.getClientRects().length > 0; }, id);
    const toucher = async (sel) => { await page.locator(sel).filter({ visible: true }).first().tap(); };
    const capture = async (nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const motDit = (txt) => attendre(t => { const m = document.getElementById('mot'); return !!m && m.classList.contains('on') && m.textContent.includes(t); }, txt);
    /* une écriture par le VRAI api.js de la page (window.OPMSG) — ce que fait n'importe quel geste qui écrit */
    const ecrire = () => page.evaluate(() => window.OPMSG.creer({ base: '' }).creerEvenement({ titre: 'Point', debut: '2026-10-08T10:00', fin: '2026-10-08T11:00', tz: 'Europe/Paris' }).then(() => 'ok', e => e.code));

    await page.goto(svc.base + '/');
    await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MOT); await toucher('#c-entrer');
    vrai('population : Alice est connectée dans la vraie page servie (version ' + NUM + ')', await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }));

    console.log('\n── 1. pas de minimum : la page travaille ──');
    v('la page connaît son numéro', await page.evaluate(() => window.OPMSG_VERSION_CLIENT), NUM);
    v('une écriture passe', await ecrire(), 'ok');
    await page.waitForTimeout(1800);
    v('aucun écran de mise à jour', [await visible('maj-ecran'), await visible('maj-bandeau')], [false, false]);

    console.log('\n── 2. la Tour exige la version suivante : la page qui écrit se met à jour ──');
    /* ⛔ un brouillon en cours (relecture du gardien) : il doit survivre au rechargement. Bruno devient contact d'Alice (par le service), Alice ouvre leur
       conversation et commence à écrire — sans envoyer. */
    const api = (m, chemin, corps) => page.evaluate(async ([m, chemin, corps]) => { const r = await fetch(chemin, { method: m, credentials: 'same-origin', headers: m === 'GET' ? {} : { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: m === 'GET' ? undefined : JSON.stringify(corps) }); let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; }, [m, chemin, corps]);
    const bruno = await T.connecter(svc, og, 'bruno', 'pw-bruno-1234');
    const idB = (await bruno.get('/api/moi')).j.moi.identifiant;
    const t = await api('POST', '/api/contacts/identifiant', { identifiant: idB });
    await api('POST', '/api/contacts/demander', { id: t.j && t.j.id });
    const dem = ((await bruno.get('/api/contacts/demandes')).j || {});
    const recue = (dem.recues || [])[0];
    await bruno.post('/api/contacts/demandes/repondre', { id: recue && recue.id, accepter: true });
    const dir = await api('POST', '/api/conversations/directe', { uid: t.j && t.j.id });
    const convId = dir.j && (dir.j.id || (dir.j.conversation && dir.j.conversation.id));
    if (convId) { await page.evaluate((id) => { location.hash = '#messages/' + id; }, convId); await attendre(() => { const x = document.getElementById('saisie'); return !!x && x.getClientRects().length > 0; }); await page.locator('#saisie').fill('Brouillon en cours, à ne pas perdre'); }
    v('population : une conversation où écrire un brouillon', !!convId, true, ) ; if (!convId) console.log('      ' + JSON.stringify({ t: t.j, dem, dir }).slice(0, 600));
    vrai('le service a relu le minimum de la Tour (' + (NUM + 1) + ')', await exiger(NUM + 1));
    let lacher; retenir = { promesse: new Promise(r => { lacher = r; }) };
    const avant = chargements.length;
    v('l\'écriture reçoit 426', await ecrire(), 'version_trop_ancienne');
    vrai('l\'écran « Mise à jour obligatoire » couvre tout', await attendre(() => { const e = document.getElementById('maj-ecran'); return !!e && !e.hidden && document.getElementById('maj-titre').textContent === 'Mise à jour obligatoire'; }));
    v('⛔ sans « Plus tard » : le bandeau est rangé, son bouton n\'est pas à l\'écran', [await visible('maj-bandeau'), await visible('maj-plus-tard')], [false, false]);
    vrai('la barre avance pendant le téléchargement', await attendre(() => +document.getElementById('maj-piste').getAttribute('aria-valuenow') > 4));
    const geo = await page.evaluate(() => { const r = document.getElementById('maj-ecran').getBoundingClientRect(); return [Math.round(r.width) >= innerWidth - 1, Math.round(r.height) >= innerHeight - 1]; });
    v('l\'écran couvre la fenêtre entière', geo, [true, true]);
    await capture('1-obligatoire');
    lacher(); retenir = null;
    vrai('puis la page se RECHARGE (« ?maj=1 »)', await page.waitForURL(/\?maj=1/, { timeout: 9000 }).then(() => true, () => false) || chargements.slice(avant).includes('?maj=1'));
    await page.waitForLoadState('load');

    console.log('\n── 3. revenue toujours sous le minimum : elle le dit, sans boucler ──');
    if (convId) vrai('⛔ le brouillon a survécu au rechargement : rouvert, la conversation le rend dans le champ', await page.evaluate((id) => { location.hash = '#messages'; setTimeout(() => { location.hash = '#messages/' + id; }, 80); return true; }, convId) && await attendre(() => { const x = document.getElementById('saisie'); return !!x && x.value === 'Brouillon en cours, à ne pas perdre'; }));
    vrai('« n\'a pas encore pu s\'installer », et « Réessayer »', await attendre(() => { const e = document.getElementById('maj-ecran'); const r = document.getElementById('maj-reessayer'); return !!e && !e.hidden && !!r && !r.hidden && document.getElementById('maj-etat').textContent.includes('pas encore pu'); }));
    await page.waitForTimeout(2500);
    v('⛔ aucun rechargement de plus tout seul', chargements.filter(s => s === '?maj=1').length, 1);
    v('⛔ et l\'écran reste (on ne travaille pas sous le minimum)', await visible('maj-ecran'), true);
    await capture('2-pas-encore');

    console.log('\n── 4. la Tour lève l\'exigence : « Réessayer », et la page est libre ──');
    vrai('le service a relu « aucun minimum »', await exiger(0));
    const avant2 = chargements.length;
    await toucher('#maj-reessayer');
    vrai('« Réessayer » recharge', await T.attendre(() => chargements.slice(avant2).includes('?maj=1'), 9000));
    await page.waitForLoadState('load');
    vrai('« OP MESSAGES est à jour »', await motDit('OP MESSAGES est à jour'));
    await page.waitForTimeout(800);
    v('l\'écran de mise à jour est rangé, et une écriture repasse', [await visible('maj-ecran'), await ecrire()], [false, 'ok']);

    console.log('\n── 5. le minimum de nouveau posé : une page qu\'on OUVRE se met à jour dès le démarrage ──');
    vrai('le service a relu ' + (NUM + 1), await exiger(NUM + 1));
    const nAvant = refus426.length, avant3 = chargements.length;
    await page.goto(svc.base + '/');
    vrai('dès le démarrage, la mise à jour obligatoire part et recharge', await T.attendre(() => chargements.slice(avant3).includes('?maj=1'), 12000));
    v('… sans avoir eu besoin d\'un refus (la page a lu le minimum dans /api/config)', refus426.length - nAvant, 0);
    v('aucune erreur JavaScript de toute la sonde', erreurs, []);
    await ctx.close();
  } finally {
    await b.close(); await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
