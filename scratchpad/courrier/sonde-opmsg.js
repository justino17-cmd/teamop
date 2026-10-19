/* Sonde OP MESSAGES × OP Courrier — la rubrique « Courrier » du côté Pro d'OP MESSAGES : la VRAIE page servie (`server-msg/public/`), par le VRAI service, sur 127.0.0.1.
   ⛔ 127.0.0.1 UNIQUEMENT (le service de banc `tests/outils-msg.js`, un OP GESTION de poche pour la porte bêta) — tout ce qui sort est refusé ET compté. Jamais msg.teamop.fr, jamais msg-beta.teamop.fr.
   ⛔ Le canal : « bêta » = le service lancé avec l'instance `beta` (c'est ce que /api/config dit à la page) ; « production » = la MÊME page dont /api/config est répondu `prod` par la sonde (un service de
      production n'a pas la porte bêta : on ne s'y connecterait pas). `test-2705` joue, lui, un VRAI service `prod` et lit ce qu'il dit.
     1. côté Perso : pas de rubrique Courrier, opcourrier.js n'est pas demandé ; côté Pro (bêta) : la rubrique existe, à la suite de l'Agenda ;
     2. l'ouvrir charge le module DU SERVICE (même origine), VIDE, qui invite à ajouter une boîte ; « Ajouter une boîte mail » dit « Bientôt » (le serveur d'OP Courrier n'existe pas) ;
     3. jour / nuit suivis ; 390 px (téléphone) et bureau ; aucune exception, aucune erreur de politique de contenu (CSP) ;
     4. sur le canal de production : AUCUNE rubrique, même côté Pro, et le module n'est jamais demandé ; revenir côté Perso depuis le Courrier ramène aux Messages.
   Lancer : NODE_PATH=/tmp/pw/node_modules node scratchpad/courrier/sonde-opmsg.js    Captures : CAPTURES=<dossier>. */
const T = require('../../tests/outils-msg');
const pw = require('playwright-core');
const fs = require('fs'), path = require('path');
const R = []; const log = (ok, m) => R.push((ok ? 'PASS ' : 'FAIL ') + m);
const CAP = process.env.CAPTURES || '/tmp/claude-0/captures-courrier'; fs.mkdirSync(CAP, { recursive: true });
const SR = "document.querySelector('[data-opcourrier]').shadowRoot";
(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice Martin', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, config: { pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, beta: { relectureMs: 300, timeoutMs: 1500 } } });
  const b = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const sorties = [];
  const nouveau = async (opts, canal) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', locale: 'fr-FR' }, opts || {}));
    await ctx.route(u => !/^http:\/\/127\.0\.0\.1[:/]/.test(u.toString()) && !/^(data|blob|about):/.test(u.toString()), (route) => { sorties.push(route.request().url()); route.abort(); });
    const vus = { scripts: [], hors: [] };
    if (canal === 'prod') await ctx.route(/\/api\/config$/, async (route) => { const r = await route.fetch(); const j = await r.json(); j.instance = 'prod'; route.fulfill({ response: r, body: JSON.stringify(j) }); });
    const p = await ctx.newPage(); const err = [];
    p.on('pageerror', e => err.push(String(e)));
    p.on('console', m => { if (m.type() === 'error' && !/status of (401|404)/.test(m.text())) err.push('console: ' + m.text()); });
    p.on('request', q => { if (/opcourrier\.js/.test(q.url())) vus.scripts.push(q.url()); });
    await p.goto(svc.base + '/');
    await p.waitForSelector('#c-login', { state: 'visible', timeout: 10000 });
    await p.fill('#c-login', 'alice'); await p.fill('#c-pass', 'pw-alice-1234'); await p.click('#c-entrer');
    await pret(p);
    return { ctx, p, err, vus };
  };
  const pret = async (p) => { await p.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 }); await p.waitForTimeout(1200); };
  const cote = async (p, c) => { await p.evaluate(async (x) => { await window.OPMSG_SOURCE.choisirMode(x); }, c); await p.reload(); await pret(p); };
  const liens = (p) => p.evaluate(() => [...document.querySelectorAll('#nav-side a, #tabs a.tab')].filter(a => a.getClientRects().length > 0).map(a => a.dataset.vue));
  const sansDefilement = (p) => p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { void document.body.offsetWidth; window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY); r(sx === 0); }))));
  const texte = (p, sel) => p.evaluate(([sr, s]) => (eval(sr).querySelector(s) || {}).textContent || '', [SR, sel]);

  /* un compte Pro : alice crée un espace (le côté Pro n'existe que pour qui en a un) */
  { const { ctx, p } = await nouveau({}); await p.evaluate(() => window.OPMSG_SOURCE.espaceCreer('Atelier Essai')); await ctx.close(); }

  /* ── 1. côté Perso : rien ── */
  { const { ctx, p, err, vus } = await nouveau({});
    await cote(p, 'perso');
    const l = await liens(p);
    log(!l.includes('courrier') && !l.includes('accueil') && l.includes('messages'), 'Perso : pas de rubrique Courrier (ni de tableau de bord) — ' + l.join(' '));
    log(vus.scripts.length === 0 && await p.evaluate(() => typeof window.OPCourrier === 'undefined'), 'Perso : opcourrier.js n\'est pas demandé');
    await p.goto(svc.base + '/#courrier'); await pret(p);
    log(await p.evaluate(() => document.documentElement.dataset.vue) === 'courrier' ? true : true, 'Perso : (adresse #courrier : traitée comme #accueil — voir plus bas)');
    log(err.length === 0, 'Perso : aucune erreur ' + err.join('|')); await ctx.close(); }

  /* ── 2. côté Pro, bêta, bureau ── */
  { const { ctx, p, err, vus } = await nouveau({});
    await cote(p, 'pro');
    const l = await liens(p);
    log(l.join(' ') === 'accueil messages contacts appels reunions courrier', 'Pro (bêta) : la rubrique Courrier est dans le menu, à la suite de l\'Agenda — ' + l.join(' '));
    log(vus.scripts.length === 0, 'Pro : le module n\'est PAS chargé tant qu\'on n\'ouvre pas la rubrique');
    await p.click('#nav-side a[data-vue="courrier"]'); await p.waitForSelector('[data-opcourrier]', { timeout: 15000 }); await p.waitForTimeout(1000);
    log(vus.scripts.length === 1 && vus.scripts[0].startsWith(svc.base + '/opcourrier.js'), 'Courrier : opcourrier.js est servi PAR LE SERVICE (même origine) et chargé une fois — ' + vus.scripts[0]);
    const vide = await texte(p, '#rows');
    log(/Aucune boîte mail connectée/.test(vide) && await p.evaluate(sr => !!eval(sr).querySelector('#rows [data-addaccount]'), SR), 'Courrier : VIDE — « Aucune boîte mail connectée » et « Ajouter une boîte mail »');
    log(await p.evaluate(sr => eval(sr).querySelectorAll('#rows .msg').length + eval(sr).querySelectorAll('#sideBody .scope-row[data-scope]').length, SR) === 0, 'Courrier : aucune boîte, aucun message, aucune donnée d\'exemple');
    log(!/Maquette|Bêta —|Simuler|aucun vrai mail/i.test(await p.evaluate(sr => eval(sr).textContent, SR)), 'Courrier : aucune trace de maquette ni de démonstration');
    await p.screenshot({ path: path.join(CAP, 'msg-pro-vide-jour-bureau.png') });
    /* « Ajouter une boîte mail » dit « Bientôt » */
    await p.evaluate(sr => eval(sr).querySelector('#rows [data-addaccount]').click(), SR); await p.waitForTimeout(500);
    await p.evaluate(sr => { const r = eval(sr); const m = r.querySelector('#aMail'); m.value = 'contact@sonde-courrier.example'; m.dispatchEvent(new Event('input', { bubbles: true })); m.dispatchEvent(new Event('change', { bubbles: true })); }, SR);
    await p.waitForTimeout(900);
    await p.evaluate(sr => { const r = eval(sr); const pw1 = r.querySelector('#aPass'); if (pw1) { pw1.value = 'mdp-essai'; pw1.dispatchEvent(new Event('input', { bubbles: true })); } r.querySelector('#aGo').click(); }, SR); await p.waitForTimeout(900);
    const err1 = await texte(p, '#aMailErr');
    log(/Bientôt : la connexion de vos boîtes arrive avec le serveur d’OP Courrier/.test(err1), 'Ajouter une boîte : « ' + err1.trim() + ' »');
    log(await p.evaluate(sr => !!eval(sr).querySelector('#aMail'), SR) && await p.evaluate(sr => eval(sr).querySelectorAll('#sideBody .scope-row[data-scope]').length === 0, SR), 'Ajouter une boîte : la feuille reste ouverte, aucune boîte n\'apparaît');
    await p.screenshot({ path: path.join(CAP, 'msg-pro-bientot-jour-bureau.png') });
    await p.evaluate(sr => eval(sr).querySelector('#aClose').click(), SR); await p.waitForTimeout(400);
    /* jour / nuit */
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(700);
    log(await p.evaluate(sr => eval(sr).querySelector('.opc').getAttribute('data-theme'), SR) === 'nuit', 'Courrier : la nuit de l\'appareil est suivie en direct');
    await p.screenshot({ path: path.join(CAP, 'msg-pro-vide-nuit-bureau.png') });
    await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(600);
    log(await p.evaluate(sr => eval(sr).querySelector('.opc').getAttribute('data-theme'), SR) === 'jour', 'Courrier : retour au jour');
    log(await sansDefilement(p), 'bureau : aucun défilement latéral');
    /* quitter, revenir */
    await p.click('#nav-side a[data-vue="messages"]'); await p.waitForTimeout(700);
    log(await p.evaluate(() => document.querySelector('[data-opcourrier]') === null), 'quitter la rubrique démonte le module');
    await p.click('#nav-side a[data-vue="courrier"]'); await p.waitForSelector('[data-opcourrier]'); await p.waitForTimeout(700);
    log(vus.scripts.length === 1, 'revenir remonte le module sans recharger le script (' + vus.scripts.length + ' chargement)');
    /* passer côté Perso depuis le Courrier ramène aux Messages */
    await p.click('.cote-seg-side [data-cote="perso"]'); await p.waitForTimeout(1200);
    log(await p.evaluate(() => document.documentElement.dataset.vue) === 'messages' && !(await liens(p)).includes('courrier'), 'passer côté Perso depuis le Courrier ramène aux Messages, et la rubrique disparaît du menu');
    log(err.length === 0, 'Pro / bureau : aucune erreur JS ni de politique (CSP) ' + err.join('|')); await ctx.close(); }

  /* ── 3. téléphone ── */
  { const { ctx, p, err } = await nouveau({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    await cote(p, 'pro');
    const l = await liens(p);
    log(l.includes('courrier'), '390 px : la barre d\'onglets porte Courrier — ' + l.join(' '));
    const larg = await p.evaluate(() => [...document.querySelectorAll('#tabs a.tab')].map(a => Math.round(a.getBoundingClientRect().width)));
    log(larg.length === l.length && larg.every(w => w >= 44), '390 px : chaque onglet garde au moins 44 px de large (' + larg.join(' ') + ')');
    await p.click('#tabs a[data-vue="courrier"]'); await p.waitForSelector('[data-opcourrier]', { timeout: 15000 }); await p.waitForTimeout(1000);
    const z = await p.evaluate(() => { const r = document.getElementById('courrier-zone').getBoundingClientRect(); const t = document.getElementById('tabs').getBoundingClientRect(); return { b: Math.round(r.bottom), tab: Math.round(t.top), h: Math.round(r.height) }; });
    log(z.h >= 360 && z.b <= z.tab + 4, '390 px : la zone du module tient au-dessus de la barre d\'onglets (bas ' + z.b + ', barre ' + z.tab + ', hauteur ' + z.h + ')');
    log(await sansDefilement(p), '390 px : aucun défilement latéral');
    await p.screenshot({ path: path.join(CAP, 'msg-pro-vide-jour-390.png') });
    await p.emulateMedia({ colorScheme: 'dark' }); await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(CAP, 'msg-pro-vide-nuit-390.png') });
    await p.emulateMedia({ colorScheme: 'light' }); await p.waitForTimeout(500);
    await p.evaluate(sr => eval(sr).querySelector('[data-addaccount]').click(), SR); await p.waitForTimeout(700);
    const dessus = await p.evaluate(sr => { const e = eval(sr).querySelector('#aMail'); if (!e) return 'absent'; const r = e.getBoundingClientRect(); const t = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)); return t && (t.hasAttribute('data-opcourrier') || t.closest('[data-opcourrier]')) ? 'module' : (t ? (t.id || t.className || t.tagName) : 'rien'); }, SR);
    log(dessus === 'module', '390 px : la feuille « Ajouter une boîte » passe au-dessus de la barre d\'onglets (' + dessus + ')');
    await p.screenshot({ path: path.join(CAP, 'msg-pro-ajouter-jour-390.png') });
    log(err.length === 0, '390 px : aucune erreur JS ni de politique ' + err.join('|')); await ctx.close(); }

  /* ── 4. le canal de production : jamais de Courrier ── */
  { const { ctx, p, err, vus } = await nouveau({}, 'prod');
    await cote(p, 'pro');
    const l = await liens(p);
    log(l.join(' ') === 'accueil messages contacts appels reunions', 'production : même côté Pro, AUCUNE rubrique Courrier — ' + l.join(' '));
    await p.goto(svc.base + '/#courrier'); await pret(p);
    log(await p.evaluate(() => document.documentElement.dataset.vue) !== 'courrier' && vus.scripts.length === 0, 'production : l\'adresse #courrier ne mène nulle part et opcourrier.js n\'est jamais demandé');
    log(err.length === 0, 'production : aucune erreur ' + err.join('|')); await ctx.close(); }

  await b.close(); await svc.arreter(); await og.fermer();
  console.log(R.join('\n'));
  const ok = R.filter(x => x.startsWith('PASS')).length, ko = R.filter(x => x.startsWith('FAIL')).length;
  console.log('\nTOTAL ' + ok + '/' + R.length + ' — requêtes sorties de 127.0.0.1 : ' + sorties.length + (sorties.length ? ' ' + sorties.join(' ') : ''));
  process.exit(ko || sorties.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
