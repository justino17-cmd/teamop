/* SONDE — LES OPTIONS DU PRO, AU NAVIGATEUR (bêta v768). Décision de Justin, 1er octobre 2026 (« Plus cher »).
   Le banc `tests/test-851.js` exécute les vraies fonctions dans un bac à sable ; cette sonde, elle, joue la VRAIE PAGE — ce que
   le bac à sable ne voit pas : l'ORDRE d'exécution du fichier (la copie d'appareil se lit-elle vraiment au démarrage ?), le
   menu et les onglets dessinés, le message de `go()`, la carte « Forfait » des Paramètres, la cloche, la fiche client.
   Au navigateur, sur une COPIE de la bêta où BETA_ESSAI vaut false (la règle de PRODUCTION : la bêta voit tout, par construction —
   voir « La bêta voit toutes les catégories » dans CLAUDE.md). La bêta est générée ICI par `node beta-build.js <sortie>` depuis
   l'app.html de l'arbre : `beta.html` n'est jamais touchée. La réponse de /api/espaces/etat est SIMULÉE dans la page (le serveur de
   cette branche ne connaît pas les options) ; rien ne sort de 127.0.0.1.
   Contre-épreuves : CONTRE=beta (la vraie bêta, BETA_ESSAI true : tout est ouvert, la sonde le dit) ;
   APP=<app.html d'avant> (la v767 : ne connaît pas les options — presque tout tombe).
   Usage : node scratchpad/sonde-options.js · CONTRE=beta node … · APP=/chemin/app-767.html node … */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http');
const { spawn, spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..'), CHROME = '/opt/pw-browsers/chromium';
const CONTRE = process.env.CONTRE || '';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500) : '')); } };
const T = 't-sonde-opts', CLE_OPTS = 'elanB_gestion_v2_opts', CLE_SUSP = 'elanB_gestion_v2_susp';
const payee = (o) => Object.assign({ ok: true, formule: 'pro', quantite: 1, places: 1, paye: true, motif: 'abonnement Stripe (active)', opMessages: false, metier: '', versionMin: 0, enLigne: 0, suspendu: false, sursisJours: null, options: [] }, o || {});
const INIT = `try{ localStorage.setItem('elanB_sync_team','${T}'); localStorage.setItem('elanB_sync_on','1'); }catch(e){}
  try{ const c=sessionStorage.getItem('__cache'); if(c){ const o=JSON.parse(c); if(o.opts) localStorage.setItem('${CLE_OPTS}',JSON.stringify(o.opts)); if(o.susp) localStorage.setItem('${CLE_SUSP}',JSON.stringify(o.susp)); } }catch(e){}
  window.__ETAT=null; window.__nEtat=0; window.__corps=[]; const __f0=window.fetch.bind(window);
  window.fetch=function(u,o){ const s=String((u&&u.url)||u);
    if(/\\/api\\/espaces\\/etat$/.test(s)){ window.__nEtat++; try{ window.__corps.push(String(o&&o.body)); }catch(e){}
      if(!window.__ETAT) return Promise.resolve(new Response('{"error":"sonde"}',{status:503,headers:{'Content-Type':'application/json'}}));
      return Promise.resolve(new Response(JSON.stringify(window.__ETAT),{status:200,headers:{'Content-Type':'application/json'}})); }
    if(/api\\.teamop\\.fr/.test(s)) return Promise.resolve(new Response('{"error":"sonde"}',{status:503,headers:{'Content-Type':'application/json'}}));
    return __f0(u,o); };`;
function cdpClient(ws) { let id = 0; const A = new Map(), E = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) E.forEach(f => { try { f(m); } catch (e) {} }); });
  return { envoyer(me, pa) { const i = ++id; return new Promise((res, rej) => { A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); }, sur(f) { E.push(f); } }; }
(async () => {
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'opg-opts-'));
  /* la bêta de l'arbre, fabriquée par le générateur du dépôt vers un fichier d'ici */
  const SOURCE_APP = process.env.APP || path.join(RACINE, 'app.html');
  const cwd = path.join(BANC, 'gen'); fs.mkdirSync(cwd); fs.copyFileSync(SOURCE_APP, path.join(cwd, 'app.html'));
  const gen = spawnSync('node', [path.join(RACINE, 'beta-build.js'), path.join(BANC, 'beta.html')], { cwd, encoding: 'utf8', env: Object.assign({}, process.env, { BETA_RETROGRADER: '1' }) });
  if (gen.status !== 0) { console.log('✗ beta-build a échoué : ' + gen.stderr); process.exit(1); }
  let PAGE = fs.readFileSync(path.join(BANC, 'beta.html'), 'utf8');
  const avant = (PAGE.match(/const BETA_ESSAI=true;/g) || []).length;
  if (CONTRE !== 'beta') PAGE = PAGE.replace('const BETA_ESSAI=true;', 'const BETA_ESSAI=false;');
  console.log('\n══ ' + path.basename(SOURCE_APP) + (CONTRE === 'beta' ? ' — la VRAIE bêta (BETA_ESSAI true)' : ' — copie en règle de production (BETA_ESSAI false)') + ' ══');
  vrai('(population) la copie porte UNE déclaration de BETA_ESSAI, et la copie de production l\'a bien à false', avant === 1 && (CONTRE === 'beta' || /const BETA_ESSAI=false;/.test(PAGE)));
  const pp = await portLibre(), pc = await portLibre();
  const statique = http.createServer((q, r) => { const u = q.url.split('?')[0].split('#')[0];
    if (u === '/beta.html') { r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(PAGE); }
    const x = path.join(RACINE, u.replace(/^\/+/, '')); if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : x.endsWith('.png') ? 'image/png' : x.endsWith('.svg') ? 'image/svg+xml' : 'text/html;charset=utf-8' }); r.end(d); }); });
  await new Promise(res => statique.listen(pp, '127.0.0.1', res));
  const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=' + pc, '--user-data-dir=' + path.join(BANC, 'ch'), 'about:blank'], { stdio: 'ignore' });
  const fermer = () => { try { chrome.kill('SIGKILL'); } catch (e) {} try { statique.close(); } catch (e) {} try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {} };
  try {
    for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + pc + '/json/version')).ok) break; } catch (e) {} }
    const cible = await (await fetch('http://127.0.0.1:' + pc + '/json/new?about:blank', { method: 'PUT' })).json();
    const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const c = cdpClient(ws), exceptions = [];
    c.sur(m => { if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text).split('\n')[0]); } });
    await c.envoyer('Runtime.enable'); await c.envoyer('Page.enable');
    await c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
    await c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1360, height: 900, deviceScaleFactor: 1, mobile: false });
    const ev = async expr => { const r = await c.envoyer('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    const charger = async () => { await c.envoyer('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/beta.html' });
      for (let i = 0; i < 200; i++) { await dormir(250); try { if (await ev('return typeof db!=="undefined"&&!!db&&typeof enterApp==="function"')) return true; } catch (e) {} } return false; };
    const entrer = (id, role) => ev(`window.confirm=()=>true; window.alert=()=>{}; window.prompt=(q,d)=>d||''; window.open=function(u){ (window.__ouverts=window.__ouverts||[]).push(String(u)); return null; };
      window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.some(u=>u.id==='${id}')){ db.users.push({id:'${id}',prenom:'Sonde',nom:'${role}',login:'${id}',role:'${role}',actif:true,essai:true}); }
      db.forfait='pro'; db.forfaitQty=1; db.forfaitSrv='teamop';
      if(!(db.produits||[]).some(p=>p.id==='pz')) db.produits.push({id:'pz',nom:'Gel de sonde',seuil:5,qte:0,categorie:'autre'});
      if(!(db.clients||[]).some(x=>x.id==='cl-z')) db.clients.push({id:'cl-z',nom:'Client de sonde',typeClient:'pro'});
      save();
      currentUser=db.users.find(u=>u.id==='${id}');
      try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>localStorage.setItem('elanB_'+k+currentUser.id,'1')); }catch(e){}
      enterApp(currentUser);
      window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
      window.__saves=0; const s0=window.save; window.save=function(){ window.__saves++; return s0.apply(this,arguments); };
      return APP_VERSION;`);
    const poser = (o) => ev(`window.__ETAT=${JSON.stringify(o)}; await forfaitServeurSync(true); await new Promise(r=>setTimeout(r,500)); return 1;`);
    const nav = () => ev(`const n=[...document.querySelectorAll('#nav .nav-item:not(.nav-item-fav)')]; return n.filter(x=>!x.classList.contains('nav-verrou')).map(x=>x.dataset.view||'');`);
    const onglets = () => ev(`return [...document.querySelectorAll('.tab[data-tab]')].filter(t=>t.offsetParent!==null).map(t=>t.dataset.tab);`);
    const vers = async (v) => { await ev(`window.__toasts=[]; go('${v}'); return 1;`); await dormir(500); return ev(`return {cur:current, toasts:window.__toasts.slice()};`); };
    const FERMEES_PRO = ['stock', 'produits', 'boxes', 'mouvements', 'demandes', 'validations', 'bons', 'fournisseurs', 'commandes', 'comptabilite', 'telecollecte', 'enveloppes', 'registre', 'saisieConso', 'brouillon'];
    const dans = (liste, ks) => ks.filter(k => liste.includes(k));

    /* ══ 0. LE DÉMARRAGE : la copie d'appareil se lit-elle VRAIMENT avant tout appel du serveur ? (l'ordre du fichier) ══ */
    await charger();   // une première visite pour avoir l'origine (le rangement est refusé sur about:blank)
    await ev(`sessionStorage.setItem('__cache',JSON.stringify({opts:{t:'${T}',o:['achats']},susp:{suspendu:true,sursis:0}})); return 1;`);
    vrai('la page se charge (copie locale, rattachée à une entreprise de sonde, serveur muet)', await charger());
    const boot = await ev(`return { opts: typeof _optsSrv==='undefined'?'(absent)':_optsSrv, charge: typeof optionsCharger, susp: typeof _susp==='undefined'?'(absent)':_susp, nEtat: window.__nEtat, brut: localStorage.getItem('${CLE_OPTS}') };`);
    vrai('⛔ AU DÉMARRAGE, avant toute réponse du serveur (muet), `_optsSrv` porte la copie d\'appareil — l\'ordre du fichier (pas de zone morte) est juste',
      JSON.stringify(boot.opts) === '["achats"]', boot);
    console.log('   (témoin d\'ordre, pas une vérification) la copie de SUSPENSION d\'un état antérieur est lue au démarrage : ' + (boot.susp && boot.susp.suspendu === true ? 'OUI' : 'NON — `suspensionCharger()` s\'exécute dans `load()` AVANT `let _susp` : sa copie ne sert jamais au démarrage (limite d\'AVANT, hors de ce chantier)') + ' · ' + JSON.stringify(boot.susp));
    await ev(`sessionStorage.removeItem('__cache'); localStorage.removeItem('${CLE_OPTS}'); localStorage.removeItem('${CLE_SUSP}'); return 1;`);
    await charger();
    console.log('   version : ' + await entrer('sonde-admin', 'admin'));
    await dormir(3200);   // l'appel automatique de l'ouverture passe (serveur muet : 503)

    /* ══ 1. PRO, AUCUNE OPTION (le serveur dit : payé, options []) ══ */
    await poser(payee({ options: [] }));
    const s0 = await ev('return window.__saves;');
    let N = await nav(), O = await onglets();
    vrai('(population) le menu porte des rubriques ouvertes au Pro (interventions, planning, clients…) — sinon un menu vide ne prouverait rien', dans(N, ['interventions', 'planning', 'clients']).length === 3, N);
    vrai('⛔ Pro sans option : AUCUNE des rubriques des quatre options au menu', dans(N, FERMEES_PRO).length === 0, dans(N, FERMEES_PRO));
    vrai('   … ni dans la barre d\'onglets', dans(O, FERMEES_PRO).length === 0, O);
    for (const [v, re] of [['stock', /option Stock \(\+9 € par utilisateur et par mois\) ou avec Business/], ['bons', /option Achats fournisseurs \(\+6 €/], ['comptabilite', /option Encaissements et compta \(\+6 €/], ['registre', /option Registre sanitaire \(métier 3D\) \(\+6 €/]]) {
      const r = await vers(v);
      vrai('⛔ #v=' + v + ' ferme et dit QUOI ACHETER à l\'administrateur — jamais « réglable dans Permissions »', r.cur === 'dashboard' && r.toasts.some(t => re.test(t)) && !r.toasts.some(t => /Permissions/.test(t)), r);
    }
    /* Paramètres : la carte Forfait */
    await ev(`go('parametres'); return 1;`); await dormir(600);
    let P = await ev(`const t=document.getElementById('content').textContent.replace(/\\s+/g,' '); return { txt:t, ajouter:[...document.querySelectorAll('#content button')].filter(b=>/^Ajouter$/.test(b.textContent.trim())).length, actives:(t.match(/Active/g)||[]).length };`);
    vrai('⛔ Paramètres → Forfait : « Options du Pro », les quatre options avec leur prix, QUATRE boutons « Ajouter »', /Options du Pro/.test(P.txt) && /Stock/.test(P.txt) && /\+ ?9 € \/ mois par utilisateur/.test(P.txt) && /Registre sanitaire \(métier 3D\)/.test(P.txt) && P.ajouter === 4, [P.ajouter, P.txt.slice(0, 200)]);
    vrai('⛔ … et les cartes d\'une catégorie fermée n\'y sont plus : ni « Contrôle des mouvements de stock », ni « Comptabilité »', !/Contrôle des mouvements de stock/.test(P.txt) && !/Ouvrir la Comptabilité/.test(P.txt));
    await ev(`const b=[...document.querySelectorAll('#content button')].find(b=>/^Ajouter$/.test(b.textContent.trim())); window.__ouverts=[]; b.click(); return 1;`);
    const ou = await ev('return window.__ouverts;');
    vrai('⛔ « Ajouter » (la première option, Stock) ouvre la page de paiement : formule Pro et UNE option', JSON.stringify(ou) === '["https://teamop.fr/recap-abonnement.html?formule=pro&options=stock"]', ou);
    /* la cloche, la fiche client */
    const notif = await ev(`return computeNotifs().map(n=>n.id).filter(i=>/^(stock|boxlow|arr|bonprep|env|tele|mvatt|dem):/.test(i));`);
    vrai('⛔ la cloche de l\'administrateur Pro sans option ne porte AUCUNE alerte du Stock, des bons, des enveloppes ou de la télécollecte (produit sous son seuil : posé)', notif.length === 0, notif);
    await ev(`ficheClient('cl-z'); return 1;`); await dormir(500);
    const fc = await ev(`const m=document.querySelector('.modal, #modal, .modal-card, #overlay'); return {txt:(document.body.innerText||'').includes('Client de sonde'), dossier:/Dossier sanitaire/.test(document.getElementById('modal')?document.getElementById('modal').textContent:(document.getElementById('overlay')||document.body).textContent)};`);
    vrai('⛔ la fiche client n\'offre plus le « Dossier sanitaire » (population : la fiche est ouverte)', fc.txt && !fc.dossier, fc);
    await ev('closeModal(); return 1;');
    vrai('⛔ la facturation ne s\'est RIEN écrit : aucun save() depuis la lecture, `db` sans trace d\'option', (await ev('return window.__saves;')) === s0 && !(await ev('return JSON.stringify(db).indexOf("optsSrv")>=0||("options" in db)||("opts" in db);')));

    /* ══ 2. PRO + STOCK : le serveur sert options ['stock'] ══ */
    const corps0 = await ev('return window.__corps.slice();');
    await poser(payee({ options: ['stock'] }));
    N = await nav(); O = await onglets();
    vrai('⛔ Pro + Stock : le menu montre les rubriques du Stock…', ['stock', 'produits', 'boxes', 'mouvements', 'demandes', 'validations'].every(k => N.includes(k)), N);
    vrai('⛔ … et SEULEMENT celles-là : bons, fournisseurs, comptabilité, registre restent fermés', dans(N, ['bons', 'fournisseurs', 'commandes', 'comptabilite', 'telecollecte', 'enveloppes', 'registre']).length === 0, dans(N, ['bons', 'fournisseurs', 'commandes', 'comptabilite', 'telecollecte', 'enveloppes', 'registre']));
    const rs = await vers('stock');
    vrai('   #v=stock s\'ouvre', rs.cur === 'stock', rs);
    const rb = await vers('bons');
    vrai('⛔ #v=bons reste fermé et nomme les Achats', rb.cur !== 'bons' && rb.toasts.some(t => /option Achats fournisseurs/.test(t)), rb);
    const notif2 = await ev(`return computeNotifs().map(n=>n.id).filter(i=>/^stock:/.test(i));`);
    vrai('⛔ la cloche : « Stock bas » est de retour avec l\'option (la même population que plus haut : un produit sous son seuil)', notif2.length === 1, notif2);
    await ev(`go('parametres'); return 1;`); await dormir(600);
    P = await ev(`const t=document.getElementById('content').textContent.replace(/\\s+/g,' '); return { txt:t, ligneStock:[...document.querySelectorAll('#content .pl-row')].some(r=>/\\bStock\\b/.test(r.textContent)&&r.querySelector('.st-green')&&/Active/.test(r.textContent)), ajouter:[...document.querySelectorAll('#content button')].filter(b=>/^Ajouter$/.test(b.textContent.trim())).length };`);
    vrai('⛔ Paramètres : Stock porte « ✓ … Active », il reste TROIS « Ajouter » ; la carte « Contrôle des mouvements de stock » est de retour', P.ligneStock === true && P.ajouter === 3 && /Contrôle des mouvements de stock/.test(P.txt), [P.ajouter, P.txt.slice(0, 160)]);
    const rangement = await ev(`return JSON.parse(localStorage.getItem('${CLE_OPTS}')||'null');`);
    vrai('⛔ la copie d\'appareil est rangée AVEC l\'identifiant de l\'entreprise', JSON.stringify(rangement) === JSON.stringify({ t: T, o: ['stock'] }), rangement);
    const corps = await ev('return window.__corps.slice(-1)[0];');
    vrai('⛔ l\'appareil dit au serveur `{t}` et RIEN d\'autre (jamais ce qu\'il croit avoir)', corps === JSON.stringify({ t: T }), corps);

    /* ══ 3. UN CHAMP ABSENT GARDE, UN TABLEAU VIDE REMPLACE ══ */
    const sansChamp = payee({}); delete sansChamp.options;
    await poser(sansChamp);
    vrai('⛔ un serveur d\'AVANT (pas de champ `options`) : l\'appareil GARDE le Stock', (await nav()).includes('stock'));
    await poser(payee({ options: 'stock' }));
    vrai('   `options` d\'une autre forme : gardé aussi', (await nav()).includes('stock'));
    await ev(`window.__ETAT={ok:true,verificationImpossible:true}; await forfaitServeurSync(true); await new Promise(r=>setTimeout(r,300)); return 1;`);
    vrai('   une vérification impossible : gardé', (await nav()).includes('stock'));

    /* ══ 4. LE REDÉMARRAGE : la copie d'appareil rouvre le Stock AVANT que le serveur réponde ══ */
    await charger(); await entrer('sonde-admin', 'admin'); await dormir(300);
    const apresRedemarrage = await ev(`return { opts: _optsSrv, nEtat: window.__nEtat };`);
    N = await nav();
    vrai('⛔ après un redémarrage, serveur MUET : les options de la copie d\'appareil ouvrent le Stock tout de suite (premier démarrage hors ligne)', JSON.stringify(apresRedemarrage.opts) === '["stock"]' && N.includes('stock') && !N.includes('bons'), [apresRedemarrage, N]);

    /* ══ 5. LE TECHNICIEN : aucun mot de paiement ══ */
    await ev(`const u=db.users.find(x=>x.id==='sonde-tech'); if(!u) db.users.push({id:'sonde-tech',prenom:'Sonde',nom:'Tech',login:'sonde-tech',role:'technicien',actif:true,essai:true}); save(); return 1;`);
    await entrer('sonde-tech', 'technicien'); await dormir(300);
    await ev(`db.permissions=db.permissions||{}; return 1;`);
    const rt = await vers('bons');
    vrai('⛔ un technicien : « n\'est pas incluse dans la formule de l\'entreprise » — pas un prix, pas Business, pas Permissions', rt.cur !== 'bons' && rt.toasts.some(t => /n'est pas incluse dans la formule de l'entreprise/.test(t)) && !rt.toasts.some(t => /€|Business|Permissions|option/.test(t)), rt);
    await entrer('sonde-admin', 'admin'); await dormir(300);

    /* ══ 6. LA SUSPENSION PASSE AVANT : une option ne lève rien ══ */
    await poser({ ok: true, suspendu: true, sursisJours: 0 });
    N = await nav();
    vrai('⛔ suspendu : tout est grisé sauf les Paramètres, MÊME avec une option servie (la copie est gardée, rien n\'est relu)', N.every(k => k === 'parametres') && (await ev('return [accesSuspendu(), _optsSrv];')).join() === 'true,stock', N);
    await poser(payee({ options: ['stock'] }));
    N = await nav();
    vrai('   le règlement rend tout d\'un coup : menu normal, Stock compris', N.includes('stock') && N.includes('interventions'), N);

    /* ══ 7. BUSINESS ET PREMIUM : tout est ouvert ══ */
    await poser(payee({ formule: 'business', options: [] }));
    N = await nav();
    vrai('⛔ Business : toutes les rubriques des quatre options sont au menu (la liste d\'options est vide, elles sont comprises)', ['stock', 'bons', 'comptabilite', 'registre', 'fournisseurs'].every(k => N.includes(k)), N);
    await ev(`go('parametres'); return 1;`); await dormir(500);
    const pb = await ev(`return document.getElementById('content').textContent.replace(/\\s+/g,' ');`);
    vrai('   Paramètres : « Toutes les options … incluses dans Business », aucun « Ajouter »', /Toutes les options.*incluses dans Business/.test(pb) && !/>Ajouter</.test(await ev(`return document.getElementById('content').innerHTML;`)));
    await poser(payee({ formule: 'pro', options: ['achats', 'compta'] }));
    N = await nav();
    vrai('⛔ Pro + Achats + Compta : les bons s\'ouvrent, la comptabilité aussi, le Stock reste fermé', ['bons', 'fournisseurs', 'comptabilite', 'telecollecte'].every(k => N.includes(k)) && !N.includes('stock') && !N.includes('boxes'), N);

    /* ══ 8. LA RELECTURE AU RETOUR SUR L'APPLICATION ══ */
    const n0 = await ev('return window.__nEtat;');
    await ev(`_etatLuLe=Date.now()-60000; document.dispatchEvent(new Event('visibilitychange')); return 1;`); await dormir(600);
    vrai('⛔ retour sur l\'application, dernière lecture il y a 1 min : PAS de relecture', (await ev('return window.__nEtat;')) === n0);
    await ev(`_etatLuLe=Date.now()-6*60000; document.dispatchEvent(new Event('visibilitychange')); return 1;`); await dormir(800);
    vrai('⛔ … il y a 6 min : l\'état est RELU (une option payée dans un autre onglet s\'ouvre sans relancer l\'application)', (await ev('return window.__nEtat;')) === n0 + 1);
    vrai('aucune exception JavaScript non rattrapée pendant la sonde', exceptions.length === 0, exceptions.slice(0, 3));
  } catch (e) { ko++; console.log('✗ la sonde est tombée : ' + (e && e.stack || e)); }
  finally { fermer(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})();
