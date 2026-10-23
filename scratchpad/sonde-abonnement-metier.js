/* ══ SONDE — L'ABONNEMENT DE BOUT EN BOUT, AU NAVIGATEUR, CONTRE LE VRAI SERVEUR (23 octobre 2026) ═══════════════════════════════
   Justin : « quand ils prennent un abonnement, ils choisissent le métier, et c'est obligatoire ; ils cochent les catégories ; et quand ils
   cochent, ça explique la catégorie » — la demande arrive PRÉ-COCHÉE dans la Tour, Justin ajuste, l'acceptation pose les rubriques,
   OP GESTION ne montre que celles-là.
   Les bancs (2891, 2892, 848, 2871, 2893) exécutent les VRAIES fonctions de chaque page, sans navigateur. Cette sonde fait tourner les pages
   ENTIÈRES dans Chromium, le VRAI serveur (référentiel RÉEL, 23 métiers ouverts) répondant derrière :
     1. espace.html (portail) : la demande SANS métier est refusée à l'écran (rien n'est écrit) ; le métier choisi pré-coche la grille, chaque case
        a son explication VISIBLE ; on décoche une rubrique ; la demande part ; la liste propose les 23 métiers ;
     2. recap-abonnement.html (paiement) : sans métier, « Choisissez votre métier » et AUCUNE requête de paiement ne part ; avec un métier, la
        requête porte métier ET rubriques ; 23 métiers proposés ;
     3. creer.html (site) : 23 boutons de métier, la demande ne part pas sans métier, la grille arrive pré-cochée ;
     4. tour.html : la demande arrive PRÉ-COCHÉE avec le choix du client, on ajuste, « Accepter » ouvre l'espace avec le métier ET les rubriques ;
     5. /api/espaces/etat rend `cats` ; beta.html (copie en règle de production, BETA_ESSAI false) ne montre que ces rubriques ;
     6. un métier FERMÉ reste refusé (serveur sur un référentiel fabriqué : tests/metiers-banc.js).
   ⛔ 127.0.0.1 seulement, des entreprises et des adresses fictives ; le navigateur ne vise que beta.html (copie), jamais app.html ; tout hôte
   externe est coupé. Usage : NODE_PATH=/tmp/pw/node_modules node scratchpad/sonde-abonnement-metier.js [dossier de captures] */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), net = require('net'), crypto = require('crypto');
const { spawn } = require('child_process');
const { chromium } = require('playwright-core');
const RACINE = path.resolve(__dirname, '..');
const CAPS = process.argv[2] || path.join(os.tmpdir(), 'sonde-abo-caps');
fs.mkdirSync(CAPS, { recursive: true });
const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 600) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), { obtenu: a, attendu: b });

const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'abo-sonde-'));
const enfants = [];
let browser = null;
const fin = async () => { try { if (browser) await browser.close(); } catch (e) {} for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } });

/* ── le VRAI serveur, isolé ── */
async function lancerServeur(nom, referentielFerme) {
  const D = path.join(banc, nom, 'data'); fs.mkdirSync(D, { recursive: true });
  const MAINT = Date.now();
  const cle = n => n; // clé d'annuaire = nom d'accès
  const code = (t, n) => Buffer.from(JSON.stringify({ t, k: 'k-' + t + '-' + 'x'.repeat(24), a: 'paul', n }), 'utf8').toString('base64').replace(/=+$/, '');
  const paye = { formule: 'pro', quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Sonde', aboStatut: 'actif', aboPar: 'Sonde', aboTs: MAINT - 1000 };
  // une entreprise DÉJÀ ouverte et payée (pour la bêta : elle reçoit ses rubriques)
  const T_BETA = 't-sonde-abo-beta';
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ 'beta-sonde': Object.assign({ t: T_BETA, nom: 'beta-sonde', email: 'beta@exemple-sonde.fr', ts: MAINT - 1000, code: code(T_BETA, 'beta-sonde') }, paye) }));
  const MAIL = 'chantal@exemple-sonde.fr', MAIL2 = 'paul@exemple-sonde.fr';
  const brut = crypto.randomBytes(32).toString('hex'), brut2 = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: { [MAIL]: { v: true, pr: 'Chantal', no: 'Chaud', so: 'Chauffe Sonde' }, [MAIL2]: { v: true, pr: 'Paul', no: 'Plomb', so: 'Plomb Sonde' } },
    j: { [sha(brut)]: { m: MAIL, g: 'session', exp: MAINT + 86400000 }, [sha(brut2)]: { m: MAIL2, g: 'session', exp: MAINT + 86400000 } } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, nom, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-passe-sonde'), comptes: { actif: true }, agents: { reunionsAuto: false } }));
  fs.writeFileSync(path.join(banc, nom, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha('mot-de-passe-sonde'), role: 'patron', actif: true, ts: MAINT }] }));
  const PORT = await portLibre();
  const args = []; if (referentielFerme) { const P = path.join(banc, nom, 'preload.js'); fs.writeFileSync(P, referentielFerme.preload(RACINE, referentielFerme.chemin)); args.push('--require', P); }
  args.push(path.join(RACINE, 'server', 'index.js'));
  let journal = '';
  const e = spawn(process.execPath, args, { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, nom, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
  e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 200 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  if (!vivant) throw new Error('le serveur ne démarre pas : ' + journal.slice(0, 800));
  return { B, MAIL, MAIL2, brut, brut2, T_BETA, kill: () => e.kill('SIGKILL') };
}
let ipN = 0;
const appel = async (B, route, corps, jeton, methode) => { const r = await fetch(B + route, { method: methode || (corps === undefined ? 'GET' : 'POST'),
  headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.8.' + (++ipN % 250) + '.' + (process.pid % 250) }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
  let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j: j || {} }; };

/* ── le serveur de pages : les fichiers du dépôt + /api, /health relayés au vrai serveur ── */
const TYPES = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
function serveurPages(cible, remplacements) {
  const s = http.createServer((q, r) => {
    const u = q.url.split('?')[0];
    if (/^\/(api|health)/.test(u)) {
      const p = http.request(cible + q.url, { method: q.method, headers: Object.assign({}, q.headers, { host: new URL(cible).host }) }, rep => { r.writeHead(rep.statusCode, rep.headers); rep.pipe(r); });
      p.on('error', () => { r.writeHead(502); r.end(); }); q.pipe(p); return;
    }
    const f = path.join(RACINE, decodeURIComponent(u === '/' ? '/index.html' : u));
    if (!f.startsWith(RACINE) || /(^|\/)(server|server-msg|server-courrier|\.git)(\/|$)/.test(path.relative(RACINE, f)) && !/\.(js|css)$/.test(f)) { r.writeHead(404); r.end(); return; }
    fs.readFile(f, (e, d) => {
      if (e) { r.writeHead(404); r.end(); return; }
      if (remplacements && remplacements[u]) d = Buffer.from(remplacements[u](d.toString('utf8')), 'utf8');
      r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); r.end(d);
    });
  });
  return new Promise(res => s.listen(0, '127.0.0.1', () => { enfants.push({ kill: () => s.close() }); res({ S: 'http://127.0.0.1:' + s.address().port }); }));
}
/* Une page du navigateur : tout hôte externe est coupé, api.teamop.fr est relayé au vrai serveur local. */
async function nouvellePage(ctxOpts, cible, spies) {
  const ctx = await browser.newContext(Object.assign({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 }, locale: 'fr-FR' }, ctxOpts || {}));
  const page = await ctx.newPage();
  if (spies) page.on('request', rq => { const u = rq.url(); if (/\/api\//.test(u)) spies.push({ m: rq.method(), u: u.replace(/^https?:\/\/[^/]+/, ''), corps: rq.postData() }); });
  const erreurs = []; page.on('pageerror', e => erreurs.push(String(e.message || e).slice(0, 200)));
  await ctx.route(url => !/^https?:\/\/127\.0\.0\.1[:/]/.test(url.href) && !/^(data|blob|about):/.test(url.href), async route => {
    const u = route.request().url();
    if (/^https:\/\/api\.teamop\.fr\//.test(u)) {
      try {
        const h = Object.assign({}, route.request().headers()); delete h.host; delete h['content-length'];
        const rep = await fetch(u.replace('https://api.teamop.fr', cible), { method: route.request().method(), headers: h, body: ['GET', 'HEAD'].includes(route.request().method()) ? undefined : route.request().postData() });
        const buf = Buffer.from(await rep.arrayBuffer());
        return route.fulfill({ status: rep.status, headers: { 'content-type': rep.headers.get('content-type') || 'application/json', 'access-control-allow-origin': '*' }, body: buf });
      } catch (e) { return route.abort(); }
    }
    return route.abort();
  });
  return { ctx, page, erreurs };
}
const attendre = async (page, fn, arg, ms) => { try { await page.waitForFunction(fn, arg, { timeout: ms || 8000 }); return true; } catch (e) { return false; } };

(async () => {
  const REF_ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
  browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: REF_ARGS });
  const SRV = await lancerServeur('reel');
  const { B } = SRV;
  const PATRON = (await appel(B, '/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-sonde' })).j.token;
  vrai('(population) le vrai serveur démarre et le patron se connecte', typeof PATRON === 'string' && PATRON.length > 10);
  const REF = (await appel(B, '/api/metiers')).j;
  const N = JSON.parse(fs.readFileSync(path.join(RACINE, 'metiers.json'), 'utf8')).ouverts;
  vrai('(population) le serveur sert le référentiel RÉEL : 23 métiers ouverts, 38 rubriques', REF.ok === true && REF.ouverts.length === 23 && Object.keys(REF.rubriques).length === 38 && N.length === 23, { ouverts: (REF.ouverts || []).length, rub: Object.keys(REF.rubriques || {}).length });
  egal('   … les 23 sont ceux de metiers.json, dans l\'ordre', REF.ouverts, N);
  const { S } = await serveurPages(B);
  const spies = [];
  const clients = async () => ((await appel(B, '/api/monitor/clients', undefined, PATRON)).j.clients || []);

  try {
    /* ══ 1. LE PORTAIL — espace.html ══ */
    console.log('\n── 1. espace.html : le portail, la demande d\'accès ──');
    {
      const { ctx, page, erreurs } = await nouvellePage({}, B, spies);
      await page.addInitScript(([j]) => { try { localStorage.setItem('teamop_portail_jeton', j); } catch (e) {} }, [SRV.brut]);
      await page.goto(S + '/espace.html', { waitUntil: 'domcontentloaded' });
      const charge = await attendre(page, () => typeof openView === 'function' && typeof ratInit === 'function', null, 15000);
      vrai('la page du portail se charge (fonctions du portail présentes)', charge);
      await dormir(1500);
      await page.evaluate(() => { try { openView('demandes'); } catch (e) { window.__e = String(e); } });
      const form = await attendre(page, () => !!document.getElementById('r-metier') && !!document.getElementById('r-company'), null, 8000);
      vrai('(population) le formulaire de demande est à l\'écran (champ métier + entreprise)', form, await page.evaluate(() => (document.body.innerText || '').slice(0, 300)));
      const opts = await page.evaluate(() => [...document.querySelectorAll('#r-metier option')].map(o => o.value));
      egal('la liste propose le choix vide puis les 23 métiers, dans l\'ordre du référentiel', opts, [''].concat(REF.ouverts));
      vrai('(population) 24 options', opts.length === 24);
      const zone0 = await page.evaluate(() => (document.getElementById('r-rub') || {}).textContent || '');
      vrai('avant tout choix, la zone des rubriques DIT de choisir un métier (elle n\'est pas vide)', /Choisissez votre métier/.test(zone0), zone0.slice(0, 200));
      vrai('   … aucune case n\'est affichée sans métier', (await page.locator('#r-rub input[type=checkbox]').count()) === 0);
      // remplir le formulaire SANS métier
      const remplir = async (m) => {
        await page.fill('#r-prenom', 'Chantal'); await page.fill('#r-nom', 'Chaud'); await page.fill('#r-company', 'Chauffe Sonde'); await page.fill('#r-tel', '06 12 34 56 78');
        await page.fill('#r-lien', 'chauffe-sonde'); await page.fill('#r-users', '3'); await page.selectOption('#r-formule', 'Pro'); await page.fill('#r-besoin', 'Entretien annuel des chaudières');
        if (m) { await page.selectOption('#r-metier', m); }
      };
      await remplir('');
      const avant = (await clients()).length;
      await page.click('text=Envoyer ma demande');
      await dormir(1500);
      const msg1 = await page.evaluate(() => (document.getElementById('req-msg') || {}).textContent || '');
      vrai('⛔ SANS métier : la demande est refusée À L\'ÉCRAN, avec les mots « métier »', /métier/i.test(msg1), msg1);
      const syncSans = spies.filter(x => /clients\/sync/.test(x.u)).length;
      const avantApres = (await clients()).length;
      vrai('   … et RIEN n\'est écrit chez le serveur (aucune fiche client de plus)', avantApres === avant, { avant, apres: avantApres });
      await page.screenshot({ path: path.join(CAPS, 'portail-sans-metier.png'), fullPage: false });
      // choisir un métier
      await page.selectOption('#r-metier', 'chauffage');
      await dormir(500);
      const g = await page.evaluate(() => { const cases = [...document.querySelectorAll('#r-rub input[type=checkbox]')]; const labels = cases.map(c => { const l = c.closest('label') || c.parentElement; return { id: c.id || c.name || c.value, coche: c.checked, dis: c.disabled, txt: (l.innerText || '').trim().slice(0, 140) }; }); return { n: cases.length, coches: cases.filter(c => c.checked).length, dis: cases.filter(c => c.disabled).length, labels }; });
      vrai('(population) la grille affiche des cases', g.n >= 30, g.n);
      const conseil = REF.metiers.chauffage.rubriques;
      vrai('⛔ pré-cochée selon le métier : autant de cases cochées (modifiables) que le conseil « chauffage » (' + conseil.length + ') + les 4 incluses', g.coches >= conseil.length && g.coches <= conseil.length + 4, g);
      const expl = await page.evaluate(() => { const l = [...document.querySelectorAll('#r-rub .rub-expl')]; return { n: l.length, vides: l.filter(e => !(e.textContent || '').trim()).length, visibles: l.filter(e => { const r = e.getBoundingClientRect(); const st = getComputedStyle(e); return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none'; }).length }; });
      vrai('chaque case porte son explication, non vide', expl.n > 0 && expl.vides === 0, expl);
      vrai('   … toutes VISIBLES sans survol (une explication par case, dépliée)', expl.visibles === expl.n, expl);
      const raisons = await page.locator('#r-rub .rub-raison, #r-rub [class*="raison"]').count();
      vrai('   … et les rubriques conseillées par le métier portent leur raison', raisons > 0, raisons);
      await page.screenshot({ path: path.join(CAPS, 'portail-grille-chauffage.png'), fullPage: true });
      // décocher une rubrique (stock) puis envoyer
      const cle = REF.ordre.find(k => k === 'stock') || conseil[0];
      const caseStock = page.locator('#r-rub input[type=checkbox][data-k="' + cle + '"], #r-rub input[type=checkbox][value="' + cle + '"], #r-rub #r-' + cle + ', #r-rub input[id$="-' + cle + '"]').first();
      const trouvee = await caseStock.count();
      vrai('(population) la case « ' + cle + ' » est trouvée', trouvee > 0);
      const etaitCochee = trouvee ? await caseStock.isChecked() : null;
      if (trouvee) await caseStock.uncheck({ force: true }).catch(() => caseStock.click({ force: true }));
      const finCochee = trouvee ? await caseStock.isChecked() : null;
      vrai('   … elle était cochée et ne l\'est plus après le geste', etaitCochee === true && finCochee === false, { etaitCochee, finCochee });
      const nSync = spies.filter(x => /clients\/sync/.test(x.u)).length;
      await page.click('text=Envoyer ma demande');
      await attendre(page, () => /prise en compte|bien prise/i.test(document.body.innerText || ''), null, 8000);
      await dormir(800);
      const cs = await clients();
      const fiche = cs.find(c => c.email === SRV.MAIL);
      const dem = fiche && (fiche.demandes || [])[(fiche.demandes || []).length - 1];
      vrai('(population) la demande est arrivée chez le serveur (fiche du client + demande)', !!dem, JSON.stringify(cs).slice(0, 300));
      vrai('⛔ la demande porte le MÉTIER choisi', dem && dem.metier === 'chauffage', dem);
      vrai('⛔ … et les rubriques cochées, SANS celle qu\'on a décochée', dem && Array.isArray(dem.cats) && dem.cats.length >= conseil.length - 1 && dem.cats.indexOf(cle) < 0, dem && dem.cats);
      vrai('   … l\'écran confirme la prise en compte', /prise en compte|bien prise/i.test(await page.evaluate(() => document.body.innerText || '')));
      vrai('aucune exception JavaScript sur le portail', erreurs.length === 0, erreurs);
      await page.screenshot({ path: path.join(CAPS, 'portail-apres-envoi.png'), fullPage: false });
      await ctx.close();
    }

    /* ══ 2. LA PAGE DE PAIEMENT — recap-abonnement.html ══ */
    console.log('\n── 2. recap-abonnement.html : la page de paiement ──');
    {
      spies.length = 0;
      const { ctx, page, erreurs } = await nouvellePage({}, B, spies);
      await page.addInitScript(([j]) => { try { localStorage.setItem('teamop_portail_jeton', j); } catch (e) {} }, [SRV.brut2]);
      await page.goto(S + '/recap-abonnement.html?formule=pro', { waitUntil: 'domcontentloaded' });
      const bloc = await attendre(page, () => !!document.getElementById('metierAbo'), null, 15000);
      vrai('(population) le bloc « VOTRE MÉTIER · obligatoire » est à l\'écran', bloc, await page.evaluate(() => (document.body.innerText || '').slice(0, 400)));
      const opts = await page.evaluate(() => [...document.querySelectorAll('#metierAbo option')].map(o => o.value));
      egal('la liste propose le choix vide puis les 23 métiers', opts, [''].concat(REF.ouverts));
      const entete = await page.evaluate(() => (document.querySelector('.titre-options[for=metierAbo]') || {}).textContent || '');
      vrai('   … marqué « obligatoire »', /obligatoire/i.test(entete), entete);
      const btn = page.locator('#btnPayer');
      vrai('(population) le bouton de paiement existe', (await btn.count()) === 1);
      await btn.click();
      await dormir(1200);
      const txt = await page.evaluate(() => document.body.innerText || '');
      vrai('⛔ SANS métier : l\'écran dit « Choisissez votre métier avant de payer » + « Rien n\'a été payé »', /Choisissez votre métier avant de payer/.test(txt) && /Rien n.a été payé/.test(txt), txt.slice(0, 300));
      vrai('   … et AUCUNE requête de paiement n\'est partie vers le serveur', spies.filter(x => /stripe\/checkout/.test(x.u)).length === 0, spies);
      await page.screenshot({ path: path.join(CAPS, 'paiement-sans-metier.png'), fullPage: true });
      await page.selectOption('#metierAbo', 'plomberie');
      await dormir(600);
      const gp = await page.evaluate(() => { const v = document.getElementById('rubVolet'); if (v) v.open = true; const c = [...document.querySelectorAll('#rubriquesAbo input[type=checkbox]')]; return { n: c.length, coches: c.filter(x => x.checked).length, expl: document.querySelectorAll('#rubriquesAbo .rub-expl').length }; });
      vrai('avec un métier : la grille des rubriques apparaît, pré-cochée, avec ses explications', gp.n >= 30 && gp.coches >= 10 && gp.expl > 0, gp);
      await page.screenshot({ path: path.join(CAPS, 'paiement-grille-plomberie.png'), fullPage: true });
      spies.length = 0;
      await btn.click();
      await dormir(2500);
      const ch = spies.find(x => /stripe\/checkout/.test(x.u));
      let corps = null; try { corps = ch && JSON.parse(ch.corps); } catch (e) {}
      vrai('⛔ AVEC un métier, la requête de paiement part et porte le métier', !!corps && corps.metier === 'plomberie', ch);
      vrai('   … et les rubriques cochées (liste de clés, dans l\'ordre du menu)', !!corps && Array.isArray(corps.cats) && corps.cats.length >= 10 && corps.cats.every(k => REF.ordre.indexOf(k) >= 0), corps && corps.cats);
      const txt2 = await page.evaluate(() => document.body.innerText || '');
      // pas de clé Stripe sur ce serveur local : le refus doit se DIRE à l'écran, pas disparaître
      vrai('   … le refus du paiement (pas de Stripe local) se dit à l\'écran, sans fausse promesse de succès', txt2.length > 100 && !/Merci pour votre paiement/i.test(txt2), txt2.slice(0, 200));
      vrai('aucune exception JavaScript sur la page de paiement', erreurs.length === 0, erreurs);
      await ctx.close();
    }

    /* ══ 3. LA DEMANDE DU SITE — creer.html ══ */
    console.log('\n── 3. creer.html : la demande de création, sur le site ──');
    {
      const { ctx, page, erreurs } = await nouvellePage({}, B, spies);
      await page.goto(S + '/creer.html', { waitUntil: 'domcontentloaded' });
      await attendre(page, () => document.querySelectorAll('#metiers-choix button').length > 0, null, 12000);
      const bt = await page.evaluate(() => [...document.querySelectorAll('#metiers-choix button')].map(b => ({ k: b.getAttribute('data-pack'), t: (b.textContent || '').trim() })));
      vrai('(population) les boutons de métier sont rendus', bt.length > 0, bt.length);
      vrai('le site propose les 23 métiers', bt.length === 23, bt.length);
      egal('   … les mêmes que le serveur, dans le même ordre', bt.map(b => b.k), REF.ouverts);
      const opts = await page.evaluate(() => JSON.parse(document.getElementById('referentiel-metiers').textContent));
      egal('   … et le référentiel embarqué dans la page est celui que sert le serveur (ouverts)', opts.ouverts, REF.ouverts);
      await page.fill('input[name=c0]', 'Dupont'); await page.fill('input[name=c1]', 'Marie');
      const champs = await page.$$eval('#demande input[name]', es => es.map(e => e.name));
      for (const n of champs) { if (/mail/i.test(n) || n === 'c3') { /* ignoré, rempli plus bas */ } }
      await page.evaluate(() => { document.querySelectorAll('#demande input[name]').forEach(e => { if (!e.value) e.value = /mail/i.test(e.name) || e.type === 'email' ? 'marie@exemple-sonde.fr' : e.type === 'tel' ? '0612345678' : 'Essai'; }); });
      await page.click('#demande button[type=submit]');
      await dormir(800);
      const err1 = await page.evaluate(() => { const e = document.getElementById('erreur-metier'); return { hidden: e.hidden, txt: e.textContent }; });
      vrai('⛔ SANS métier : le message « Choisissez votre métier » est affiché et la demande ne part pas', err1.hidden === false && /Choisissez votre métier/.test(err1.txt) && (await page.evaluate(() => document.querySelector('.avis-envoi').hidden)) === true, err1);
      await page.screenshot({ path: path.join(CAPS, 'site-sans-metier.png'), fullPage: false });
      await page.click('#metiers-choix button >> nth=3');
      await dormir(500);
      const gr = await page.evaluate(() => { const c = [...document.querySelectorAll('#rubriques-grille input[type=checkbox]')]; return { visible: !document.getElementById('rubriques-demande').hidden, n: c.length, coches: c.filter(x => x.checked).length, expl: document.querySelectorAll('#rubriques-grille .rub-expl').length }; });
      vrai('avec un métier : la grille « Vos rubriques » apparaît, pré-cochée, avec ses explications', gr.visible && gr.n >= 30 && gr.coches >= 10 && gr.expl > 0, gr);
      await page.screenshot({ path: path.join(CAPS, 'site-grille.png'), fullPage: true });
      vrai('aucune exception JavaScript sur la page du site', erreurs.length === 0, erreurs);
      await ctx.close();
    }

    /* ══ 4. LA TOUR — la demande arrive pré-cochée, Justin ajuste, accepte ══ */
    console.log('\n── 4. tour.html : la demande pré-cochée, l\'acceptation ──');
    let T_NEUF = null;
    {
      spies.length = 0;
      const { ctx, page, erreurs } = await nouvellePage({ viewport: { width: 1440, height: 1000 } }, B, spies);
      await page.addInitScript(([tk]) => { try { localStorage.setItem('tour_token', tk); localStorage.setItem('tour_nom', 'Patron'); localStorage.setItem('tour_role', 'patron'); localStorage.setItem('tour_apps', JSON.stringify(['gestion', 'messages'])); } catch (e) {} }, [PATRON]);
      await page.goto(S + '/tour.html', { waitUntil: 'domcontentloaded' });
      const pret = await attendre(page, () => typeof setTab === 'function' && typeof demAccepter === 'function' && typeof CLI !== 'undefined', null, 20000);
      vrai('la Tour se charge', pret, await page.evaluate(() => (document.body.innerText || '').slice(0, 200)));
      await page.evaluate(() => { try { if (APP !== 'gestion') setApp('gestion', true); } catch (e) {} setTab('demandes', true); });
      const carte = await attendre(page, () => document.querySelectorAll('.dem-carte').length > 0, null, 15000);
      vrai('(population) la demande du portail est dans la Tour (« à traiter »)', carte, await page.evaluate(() => (document.body.innerText || '').slice(0, 300)));
      await attendre(page, () => document.querySelectorAll('.dem-carte .dem-cats input[type=checkbox]').length >= 38, null, 15000);
      await dormir(500);
      const lu = await page.evaluate(() => { const c = document.querySelector('.dem-carte'); const cases = [...c.querySelectorAll('.dem-cats input[type=checkbox]')]; return { nom: (c.querySelector('.reg-t1') || {}).textContent, metier: [...c.querySelectorAll('.kv > div')].map(d => d.textContent).find(t => /Métier/.test(t)), n: cases.length, coches: cases.filter(x => x.checked).length, info: (c.querySelector('[id^="dc-info-"]') || {}).textContent || '', expl: c.querySelectorAll('.cat-expl').length, raisons: c.querySelectorAll('.cat-raison').length, caseStock: (c.querySelector('input[id$="-stock"]') || {}).checked, retour: [...c.querySelectorAll('.dem-cats-actions button')].map(b => b.textContent).join(' | ') }; });
      vrai('la carte dit le métier demandé (Chauffage)', /Chauffage/i.test(lu.metier || ''), lu.metier);
      vrai('(population) la grille de la Tour a 38 cases', lu.n === 38, lu.n);
      const dc = (await clients()).find(c => c.email === SRV.MAIL);
      const cats = dc.demandes[dc.demandes.length - 1].cats;
      vrai('⛔ la grille est PRÉ-COCHÉE avec le choix du client (même nombre de cases cochées que les rubriques envoyées + les quatre incluses non listées)', lu.coches >= cats.length && lu.coches <= cats.length + 4, { lu, envoyees: cats.length });
      vrai('   … la rubrique décochée par le client l\'est dans la Tour aussi', lu.caseStock === false || cats.indexOf('stock') < 0, lu.caseStock);
      vrai('   … le compteur dit « pré-cochées avec le choix du client », le bouton de retour parle du choix du client', /choix du client/.test(lu.info) && /Revenir au choix du client/.test(lu.retour), { info: lu.info, retour: lu.retour });
      vrai('   … chaque case a son explication (38) et les conseillées du métier leur raison', lu.expl === 38 && lu.raisons > 0, { expl: lu.expl, raisons: lu.raisons });
      await page.screenshot({ path: path.join(CAPS, 'tour-demande.png'), fullPage: false });
      // ajuster : décocher « devis », puis accepter
      const cibleK = 'devis';
      const avantCoche = await page.evaluate(k => { const c = document.querySelector('.dem-carte input[id$="-' + k + '"]'); return c ? c.checked : null; }, cibleK);
      await page.evaluate(k => { const c = document.querySelector('.dem-carte input[id$="-' + k + '"]'); if (c && c.checked) c.click(); }, cibleK);
      const info2 = await page.evaluate(() => (document.querySelector('.dem-carte [id^="dc-info-"]') || {}).textContent || '');
      vrai('Justin ajuste : décocher une rubrique met le compteur à jour (« ajustées »)', avantCoche === true && /ajustées/.test(info2), { avantCoche, info2 });
      await page.fill('.dem-carte input[id^="dem-id-"]', 'chantal');
      await page.click('.dem-carte >> text=Accepter et ouvrir l’espace');
      const accepte = await attendre(page, () => !document.querySelector('.dem-carte .btn-plein') || /traitée|ouvert/i.test(document.body.innerText), null, 15000);
      await dormir(2500);
      const et = (await appel(B, '/api/monitor/espaces/liste', undefined, PATRON)).j.espaces || [];
      const esp = et.find(e => /chauffe/i.test(e.nom) || e.ident === 'chantal');
      vrai('(population) l\'espace de Chauffe Sonde est ouvert dans l\'annuaire du serveur', !!esp, et.map(e => e.nom));
      const lienNom = esp && esp.nom;
      const ent = (await appel(B, '/api/monitor/entreprises', undefined, PATRON)).j.entreprises || [];
      const e1 = ent.find(e => e.nom === lienNom || e.slug === lienNom);
      T_NEUF = e1 && e1.t;
      vrai('(population) on retrouve son identifiant d\'espace', !!T_NEUF, ent.map(e => [e.nom, e.t]));
      const etat = (await appel(B, '/api/espaces/etat', { t: T_NEUF })).j;
      vrai('⛔ l\'acceptation pose le MÉTIER (service de l\'état)', etat.metier === 'chauffage', etat);
      vrai('⛔ … et les rubriques retenues : celles du client, SANS « devis » (ajusté par Justin) et sans « stock » (décoché par le client)', Array.isArray(etat.cats) && etat.cats.indexOf('devis') < 0 && etat.cats.indexOf('stock') < 0 && etat.cats.length >= 10, etat.cats);
      vrai('   … les quatre rubriques « toujours » ne sont pas dans la liste restreinte (elles ne se décochent jamais)', Array.isArray(etat.cats) && ['dashboard', 'utilisateurs', 'modulesElan', 'parametres'].every(k => etat.cats.indexOf(k) < 0), etat.cats);
      vrai('aucune exception JavaScript dans la Tour', erreurs.length === 0, erreurs);
      await page.screenshot({ path: path.join(CAPS, 'tour-apres-acceptation.png'), fullPage: false });
      await ctx.close();
    }

    /* ══ 5. OP GESTION — la bêta (copie en règle de production) ne montre que les rubriques retenues ══ */
    console.log('\n── 5. beta.html (copie, BETA_ESSAI false) : le menu suit les rubriques de l\'entreprise ──');
    {
      const copie = src => { const n = src.replace(/\bBETA_ESSAI\s*=\s*true\b/, 'BETA_ESSAI = false'); if (n === src) throw new Error('BETA_ESSAI introuvable'); return n; };
      const P = await serveurPages(B, { '/beta.html': copie });
      const etat = (await appel(B, '/api/espaces/etat', { t: T_NEUF })).j;
      const { ctx, page, erreurs } = await nouvellePage({ viewport: { width: 1440, height: 1000 } }, B, spies);
      await page.addInitScript(([t]) => { try { localStorage.setItem('elanB_sync_team', t); localStorage.setItem('elanB_sync_on', '1'); } catch (e) {} }, [T_NEUF]);
      await page.goto(P.S + '/beta.html', { waitUntil: 'domcontentloaded' });
      const charge = await attendre(page, () => typeof catBloque === 'function', null, 30000);
      vrai('la copie de la bêta se charge, rattachée à l\'entreprise de la sonde', charge);
      await page.evaluate(() => { window.confirm = () => true; window.alert = () => {}; window.prompt = (q, d) => d || '';
        window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {} const h = document.getElementById('hl-ecran'); if (h) h.remove(); window.pushPropose = function () {};
        if (!db.users.some(u => u.id === 'sonde-admin')) { db.users.push({ id: 'sonde-admin', prenom: 'Sonde', nom: 'Admin', login: 'sonde', role: 'admin', actif: true, essai: true }); save(); }
        currentUser = db.users.find(u => u.id === 'sonde-admin');
        try { ['onboarded_', 'push_ask_', 'photo_prompt_'].forEach(k => localStorage.setItem('elanB_' + k + currentUser.id, '1')); } catch (e) {}
        enterApp(currentUser); });
      await page.evaluate(async () => { await forfaitServeurSync(true); });
      await dormir(800);
      const lireCats = () => page.evaluate(() => { try { return JSON.parse(localStorage.getItem('elanB_cats') || 'null'); } catch (e) { return 'illisible'; } });
      const recu = await attendre(page, () => { try { return Array.isArray(JSON.parse(localStorage.getItem('elanB_cats'))); } catch (e) { return false; } }, null, 20000);
      vrai('⛔ l\'appareil a LU les rubriques de l\'entreprise auprès du vrai serveur et les a gardées (elanB_cats)', recu, await lireCats());
      const cats = await lireCats();
      egal('   … ce sont exactement celles que le serveur sert (l\'appareil les range triées)', (cats || []).slice().sort(), (etat.cats || []).slice().sort());
      const bloq = await page.evaluate(ks => ks.map(k => [k, catBloque(k)]), ['devis', 'stock', 'planning', 'interventions', 'clients', 'factures']);
      vrai('catBloque : « devis » et « stock » (retirés) sont bloqués, « planning » et « interventions » (retenus) ne le sont pas', bloq.find(x => x[0] === 'devis')[1] === true && bloq.find(x => x[0] === 'stock')[1] === true && bloq.find(x => x[0] === 'planning')[1] === false && bloq.find(x => x[0] === 'interventions')[1] === false, bloq);
      const menu = await page.evaluate(() => { try { renderNav(); } catch (e) {} const l = [...document.querySelectorAll('#nav .nav-item, .sidebar .nav-item, nav .nav-item, [data-nav-id]')]; return { n: l.length, ids: l.map(x => x.getAttribute('data-nav-id') || x.getAttribute('data-go') || (x.getAttribute('onclick') || '').replace(/^.*go\('([^']+)'.*$/, '$1')) }; });
      vrai('(population) le menu affiche des rubriques', menu.n >= 5, menu);
      vrai('⛔ le MENU ne montre pas « devis » ni « stock » (retirés), et montre « planning » (retenu)', menu.ids.indexOf('devis') < 0 && menu.ids.indexOf('stock') < 0 && menu.ids.indexOf('planning') >= 0, menu.ids);
      await page.screenshot({ path: path.join(CAPS, 'application-menu-restreint.png'), fullPage: false });
      vrai('aucune exception JavaScript dans l\'application', erreurs.length === 0, erreurs);
      await ctx.close();
    }

    /* ══ 6. UN MÉTIER FERMÉ RESTE REFUSÉ (référentiel fabriqué) ══ */
    console.log('\n── 6. un métier fermé reste refusé (serveur sur un référentiel fabriqué) ──');
    {
      const banc2 = require(path.join(RACINE, 'tests', 'metiers-banc.js'));
      const REFB = banc2.ecrire ? banc2.ecrire(RACINE, banc) : null;
      vrai('(population) le banc de référentiel fabriqué est disponible', !!banc2.preload && !!REFB, Object.keys(banc2));
      if (banc2.preload && REFB) {
        const S2 = await lancerServeur('ferme', { preload: banc2.preload, chemin: REFB.chemin });
        const ref2 = (await appel(S2.B, '/api/metiers')).j;
        vrai('(population) le serveur fabriqué sert moins de 23 métiers ouverts, et connaît des métiers fermés', ref2.ok && ref2.ouverts.length < 23, ref2.ouverts && ref2.ouverts.length);
        const ferme = REFB.fermes && REFB.fermes[0];
        vrai('(population) un métier fermé est désigné par le banc', !!ferme, REFB);
        const sync = d => appel(S2.B, '/api/clients/sync', { nom: 'Banc ferme', entreprise: 'Société fermée', inscrit: Date.now(), apps: ['OP GESTION'], demandes: [d], plan: '', planStatus: 'actif' }, S2.brut);
        const dem = plus => Object.assign({ app: 'OP GESTION', formule: 'Pro', statut: 'nouveau', date: Date.now() - 5000, besoin: 'Entretien', users: '3', code: '', lien: 'ferme-sonde' }, plus || {});
        const r0 = await sync(dem({ metier: '' }));
        vrai('sans métier : refus clair', r0.s === 400 && r0.j.error === 'metier_requis', r0);
        const r1 = await sync(dem({ metier: ferme }));
        vrai('⛔ métier FERMÉ : refus (metier_ferme)', r1.s === 400 && r1.j.error === 'metier_ferme', r1);
        const ouvert = ref2.ouverts[1] || ref2.ouverts[0];
        const r2 = await sync(dem({ metier: ouvert }));
        vrai('   … contre-épreuve : le même corps avec un métier OUVERT passe', r2.s === 200, r2);
        S2.kill();
      }
    }
  } catch (e) {
    ko++; console.log('  ✗ EXCEPTION DE LA SONDE : ' + (e && e.stack || e));
  } finally {
    await fin();
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗   (captures : ' + CAPS + ')');
  process.exit(ko ? 1 : 0);
})();
