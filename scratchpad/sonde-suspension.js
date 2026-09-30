/* SONDE — L'APPLICATION SUSPENDUE (bêta v767). Justin, 30 septembre 2026 : « si une entreprise ne paye plus, le service est
   suspendu tant que c'est pas réglé » ; 20 septembre : « rien n'est perdu », et « c'est pas aux utilisateurs de savoir si
   l'entreprise paye ou pas. Que le compte admin ».
   Au navigateur, sur une COPIE de la bêta où BETA_ESSAI vaut false (la règle de PRODUCTION : la bêta, elle, n'est jamais
   suspendue). La réponse de /api/espaces/etat est SIMULÉE dans la page ; rien ne sort de 127.0.0.1.
   Ce qu'on mesure, en administrateur (bureau) puis en technicien (téléphone) :
     · une réponse « suspendue » (sans formule, sursis 0) : écran « Accès suspendu » quelle que soit la rubrique demandée, menu
       grisé (🔒) sauf les Paramètres, onglets du bas grisés sauf Paramètres ; les Paramètres restent ouverts ;
     · rien d'écrit : `db.forfait` intact, aucun save() ; un seul rappel par jour, à l'administrateur seul ;
     · l'administrateur voit pourquoi et comment régler ; le technicien, pas un mot de paiement ;
     · « J'ai réglé — vérifier » sur une réponse PAYÉE : tout revient d'un coup (écran, menu) ;
     · un serveur d'AVANT (formule + paye:false) : suspendue pareil, sans rien écrire ni poser de bandeau ;
     · une vérification impossible, une page d'erreur : rien ne change ; revenir sur l'application relit l'état ;
     · (seconde relecture de `relecteur`) « J'ai réglé — vérifier » touché depuis la carte des Paramètres rend SON bouton ;
       l'infobulle du 🔒 ne parle de règlement qu'à l'administrateur ; le technicien lit ce qui est vrai.
   Contre-épreuves : CONTRE=beta (la vraie bêta : jamais suspendue) ; SOURCE=<beta d'avant> (v766 : ne connaît pas l'écran).
   Usage : node sonde-suspension.js · CONTRE=beta node … · SOURCE=/chemin/beta-766.html node … */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http');
const { spawn } = require('child_process');
const RACINE = '/home/user/teamop', CHROME = '/opt/pw-browsers/chromium';
const SOURCE = process.env.SOURCE || path.join(RACINE, 'beta.html');
const CONTRE = process.env.CONTRE || '';
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const SUSP = { ok: true, paye: false, motif: 'accès suspendu', opMessages: false, metier: '', versionMin: 0, enLigne: 0, suspendu: true, sursisJours: 0 };
const PAYE = { ok: true, formule: 'business', quantite: 1, places: 3, paye: true, motif: 'abonnement Stripe (active)', opMessages: false, metier: '', versionMin: 0, enLigne: 0, suspendu: false, sursisJours: null };
const INIT = `try{ localStorage.setItem('elanB_sync_team','t-sonde-susp'); localStorage.setItem('elanB_sync_on','1'); }catch(e){}
  window.__ETAT = ${JSON.stringify(SUSP)};
  try{ const m=sessionStorage.getItem('__etatSonde'); if(m) window.__ETAT=JSON.parse(m); }catch(e){}
  window.__nEtat=0; window.__proxy502=false; const __f0=window.fetch.bind(window);
  window.fetch=function(u,o){ const s=String((u&&u.url)||u);
    if(/\\/api\\/espaces\\/etat$/.test(s)){ window.__nEtat++;
      if(window.__proxy502) return Promise.resolve(new Response('<html>502</html>',{status:502,headers:{'Content-Type':'text/html'}}));
      return Promise.resolve(new Response(JSON.stringify(window.__ETAT),{status:200,headers:{'Content-Type':'application/json'}})); }
    if(/\\/api\\/promo\\/valider$/.test(s)&&window.__promo){ window.__nPromo=(window.__nPromo||0)+1;
      return Promise.resolve(new Response(JSON.stringify(window.__promo),{status:200,headers:{'Content-Type':'application/json'}})); }
    if(/api\\.teamop\\.fr/.test(s)) return Promise.resolve(new Response('{"error":"sonde"}',{status:503,headers:{'Content-Type':'application/json'}}));
    return __f0(u,o); };`;
function cdpClient(ws) { let id = 0; const A = new Map(), E = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) E.forEach(f => { try { f(m); } catch (e) {} }); });
  return { envoyer(me, pa) { const i = ++id; return new Promise((res, rej) => { A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); }, sur(f) { E.push(f); } }; }
(async () => {
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'opg-susp-'));
  let PAGE = fs.readFileSync(SOURCE, 'utf8');
  /* la règle de production : BETA_ESSAI à false dans la COPIE servie (jamais dans le dépôt) */
  const avant = (PAGE.match(/const BETA_ESSAI=true;/g) || []).length;
  if (CONTRE !== 'beta') PAGE = PAGE.replace('const BETA_ESSAI=true;', 'const BETA_ESSAI=false;');
  console.log('\n══ ' + path.basename(SOURCE) + (CONTRE === 'beta' ? ' — la VRAIE bêta (BETA_ESSAI true)' : ' — copie en règle de production (BETA_ESSAI false)') + ' ══');
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
    /* animations réduites : un vrai réglage d'utilisateur, servi sans transition de vue (sinon on relève le calque d'une
       transition au lieu de l'écran) */
    await c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    const ev = async expr => { const r = await c.envoyer('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    const charger = async () => { await c.envoyer('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/beta.html' });
      for (let i = 0; i < 200; i++) { await dormir(250); try { if (await ev('return typeof db!=="undefined"&&!!db&&typeof enterApp==="function"')) return true; } catch (e) {} } return false; };
    const entrer = (id, role) => ev(`window.confirm=()=>true; window.alert=()=>{}; window.prompt=(q,d)=>d||''; window.open=function(u){ (window.__ouverts=window.__ouverts||[]).push(String(u)); return null; };
      window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.some(u=>u.id==='${id}')){ db.users.push({id:'${id}',prenom:'Sonde',nom:'${role}',login:'${id}',role:'${role}',actif:true,essai:true}); }
      db.forfait='business'; db.forfaitQty=3; save();
      currentUser=db.users.find(u=>u.id==='${id}');
      try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>localStorage.setItem('elanB_'+k+currentUser.id,'1')); }catch(e){}
      enterApp(currentUser);
      window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
      window.__saves=0; const s0=window.save; window.save=function(){ window.__saves++; return s0.apply(this,arguments); };
      return APP_VERSION;`);
    const etatEcran = () => ev(`const cont=document.getElementById('content'); const txt=(cont&&cont.textContent)||'';
      const boutons=[...(cont?cont.querySelectorAll('button'):[])].map(b=>b.textContent.replace(/\\s+/g,' ').trim());
      const nav=[...document.querySelectorAll('#nav .nav-item:not(.nav-item-fav)')];
      const onglets=[...document.querySelectorAll('.tab[data-tab]')].filter(t=>t.offsetParent!==null).map(t=>{ const ic=t.querySelector('.tab-ic'); return {k:t.dataset.tab, op:ic?+getComputedStyle(ic).opacity:null}; });
      return { acces: typeof accesSuspendu==='function'?accesSuspendu():'(absente)', classe: document.documentElement.classList.contains('acces-suspendu'),
        current, txt: txt.replace(/\\s+/g,' ').trim().slice(0,600), boutons,
        navTotal: nav.length, navLibres: nav.filter(x=>!x.classList.contains('nav-verrou')).map(x=>x.dataset.view||x.textContent.trim()),
        navVerrou: nav.filter(x=>x.classList.contains('nav-verrou')).length, onglets,
        verrouTitres: [...new Set(nav.filter(x=>x.classList.contains('nav-verrou')).map(x=>x.title))],
        forfait: db.forfait, attente: db.formuleAttente||null, bandeau: !!document.getElementById('bandeau-formule'),
        saves: window.__saves, toasts: window.__toasts.slice(), nEtat: window.__nEtat };`);
    const poserEtat = (o) => ev(`window.__ETAT=${JSON.stringify(o)}; return 1;`);
    /* ⚠️ oublier la marque du jour ET le relevé des toasts : sinon on compte aussi le rappel de l'OUVERTURE, et la sonde
       accuse l'application d'un doublon qu'elle a fabriqué elle-même (premier passage, 30 septembre 2026) */
    const rappelOubli = (id) => ev(`try{ localStorage.removeItem(suspensionCle()+'_rappel_${id}'); }catch(e){} window.__toasts=[]; return 1;`);

    /* ══ 1. L'ADMINISTRATEUR, AU BUREAU ══ */
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 1360, height: 900, deviceScaleFactor: 1, mobile: false });
    vrai('la page se charge (copie locale, rattachée à une entreprise de sonde)', await charger());
    console.log('   version : ' + await entrer('sonde-admin', 'admin'));
    await dormir(4200);   // l'appel automatique de l'ouverture passe (la réponse simulée : suspendue)
    const ouv = (await ev('return window.__toasts.slice();')).filter(t => /Abonnement non réglé/.test(t));
    vrai('⛔ à l\'ouverture (le vrai chemin, sans rien forcer) : UN rappel à l\'administrateur, pas deux', ouv.length === 1, ouv);
    await rappelOubli('sonde-admin');
    const s0 = await ev('return window.__saves;');
    await ev('await forfaitServeurSync(true); return 1;'); await dormir(400);
    await ev(`go('dashboard'); return 1;`); await dormir(500);
    let A = await etatEcran();
    vrai('(population) l\'ouverture a bien interrogé l\'état de l\'espace (réponse simulée)', A.nEtat >= 1, A.nEtat);
    vrai('⛔ suspendue : `accesSuspendu()` vrai, et la classe `acces-suspendu` posée sur <html>', A.acces === true && A.classe === true, [A.acces, A.classe]);
    vrai('⛔ le tableau de bord demandé mène à l\'écran « Accès suspendu »', A.current === 'suspendu' && /L’accès à OP GESTION est suspendu/.test(A.txt), [A.current, A.txt.slice(0, 120)]);
    await ev(`go('interventions'); return 1;`); await dormir(500);
    const A2 = await etatEcran();
    vrai('   … et une autre rubrique (Interventions) aussi', A2.current === 'suspendu', A2.current);
    vrai('⛔ l\'administrateur lit POURQUOI et COMMENT : « Régler mon abonnement », « J’ai réglé — vérifier », « code promo », « Tes données sont conservées »',
      A.boutons.some(b => /Régler mon abonnement/.test(b)) && A.boutons.some(b => /J’ai réglé — vérifier/.test(b)) && A.boutons.some(b => /code promo/.test(b)) && /Tes données sont conservées/.test(A.txt), A.boutons);
    vrai('⛔ le menu est GRISÉ (🔒) — toutes les rubriques sauf les Paramètres', A.navVerrou >= 10 && A.navLibres.every(v => v === 'parametres'), { verrou: A.navVerrou, libres: A.navLibres, total: A.navTotal });
    vrai('   … et l’infobulle de ses 🔒, à l’administrateur : « Accès suspendu jusqu’au règlement de l’abonnement »',
      A.verrouTitres.length === 1 && A.verrouTitres[0] === 'Accès suspendu jusqu’au règlement de l’abonnement', A.verrouTitres);
    await ev(`go('parametres'); return 1;`); await dormir(500);
    const A3 = await etatEcran();
    vrai('⛔ les Paramètres restent ouverts (l\'administrateur y règle son abonnement)', A3.current === 'parametres', A3.current);
    vrai('⛔ rien d\'écrit par la facturation : `db.forfait` intact, pas d\'attente, pas de bandeau, aucun save()', A3.forfait === 'business' && !A3.attente && !A3.bandeau && A3.saves === s0, [A3.forfait, A3.attente, A3.bandeau, A3.saves, s0]);
    const rappels = A3.toasts.filter(t => /Abonnement non réglé/.test(t));
    vrai('⛔ UN rappel à l\'administrateur : « l’accès à l’application est suspendu jusqu’au règlement… Rien n’est perdu »', rappels.length === 1 && /suspendu jusqu'au règlement/.test(rappels[0]) && /Rien n'est perdu/.test(rappels[0]), A3.toasts);
    await ev('await forfaitServeurSync(true); return 1;'); await dormir(300);
    vrai('   … et un seul par jour (une seconde lecture ne le répète pas)', (await etatEcran()).toasts.filter(t => /Abonnement non réglé/.test(t)).length === 1);
    /* « J'ai réglé — vérifier » depuis la carte « Forfait » des Paramètres (seconde relecture de `relecteur`, 30 septembre 2026) :
       rien ne repeint cet écran — le bouton doit se RENDRE, sinon il reste grisé sur « Vérification… » et il faut quitter la
       page pour réessayer. On marque LE bouton touché : c'est lui qui doit revenir actif, avec son libellé. */
    const pv0 = await ev(`window.__toasts=[]; const b=[...document.querySelectorAll('#content button')].find(x=>/J['’]ai réglé — vérifier/.test(x.textContent));
      if(!b) return {vu:false, cur: current}; b.dataset.sonde='pv'; const avant=b.textContent, svgAvant=!!b.querySelector('svg'); b.click(); return {vu:true, cur: current, avant, svgAvant, pendant: [b.disabled, b.textContent]};`);
    await dormir(1500);
    const pv1 = await ev(`const b=document.querySelector('#content button[data-sonde="pv"]');
      return b ? {cur: current, disabled: b.disabled, txt: b.textContent, svg: !!b.querySelector('svg'), toasts: window.__toasts.slice()} : {cur: current, absent: true};`);
    vrai('(population) la carte « Forfait » des Paramètres porte « J’ai réglé — vérifier », son « ↻ » dessiné (un <svg>) ; touché, il se grise PENDANT la vérification',
      pv0.vu && pv0.cur === 'parametres' && pv0.svgAvant === true && pv0.pendant[0] === true && /Vérification…/.test(pv0.pendant[1]), pv0);
    vrai('⛔ … toujours suspendue : le MÊME bouton revient actif, avec son libellé ET son icône — et l’administrateur lit que le règlement n’est pas arrivé',
      !pv1.absent && pv1.cur === 'parametres' && pv1.disabled === false && pv1.txt === pv0.avant && pv1.svg === true && (pv1.toasts || []).some(t => /Toujours suspendu/.test(t)), pv1);
    /* « ＋ Créer » pendant la suspension : l'écran qui explique (`relecteur`, 30 septembre 2026 — « Aucune création ouverte à ton
       compte » était faux, et ne menait nulle part). Depuis les Paramètres, la seule rubrique ouverte. */
    /* ⚠️ l'écran de départ se lit AVANT le clic : lu après, c'est le clic lui-même qu'on relevait (premier passage, 30
       septembre 2026 — la sonde accusait l'application d'avoir quitté les Paramètres toute seule ; un journal de go() avec
       sa pile a montré qu'aucun autre appel n'avait eu lieu) */
    const cr = await ev(`window.__toasts=[]; const cur=current; const b=document.getElementById('creer-btn'); const r=b?b.getBoundingClientRect():null;
      const vu=!!(b&&b.offsetParent!==null&&r.width>0&&r.height>0); if(vu) b.click(); return {vu, cur};`);
    await dormir(600);
    const CR = await etatEcran();
    vrai('(population) le bouton « ＋ Créer » est visible au bureau pendant la suspension, et on part des Paramètres', cr.vu && cr.cur === 'parametres', cr);
    vrai('⛔ « ＋ Créer » pendant la suspension mène à « Accès suspendu » — pas « Aucune création ouverte à ton compte »',
      CR.current === 'suspendu' && !CR.toasts.some(t => /Aucune création/.test(t)), [CR.current, CR.toasts]);
    /* revenir sur l'application relit l'état tant qu'elle est suspendue */
    const n0 = (await etatEcran()).nEtat;
    await ev(`document.dispatchEvent(new Event('visibilitychange')); return document.visibilityState;`); await dormir(600);
    vrai('⛔ revenir sur l\'application (visibilitychange) relit l\'état, tant qu\'elle est suspendue', (await etatEcran()).nEtat > n0);
    /* une vérification impossible, une page d'erreur du proxy : rien ne change */
    await poserEtat({ ok: true, verificationImpossible: true, opMessages: false, metier: '', versionMin: 0, enLigne: 0, suspendu: false, sursisJours: null });
    await ev('await forfaitServeurSync(true); return 1;'); await dormir(300);
    vrai('⛔ une vérification impossible ne rouvre rien (dans le doute, on ne coupe pas — et on ne rouvre pas non plus)', (await etatEcran()).acces === true);
    await ev('window.__proxy502=true; await forfaitServeurSync(true); window.__proxy502=false; return 1;'); await dormir(300);
    vrai('⛔ une page d\'erreur du proxy (502) ne rouvre rien non plus', (await etatEcran()).acces === true);
    /* « J'ai réglé — vérifier » quand on n'a PAS pu lire l'état : on ne dit pas « toujours suspendu » sur une réponse qu'on n'a
       pas eue (`relecteur`, 30 septembre 2026) — le vrai bouton, sur l'écran « Accès suspendu » */
    await ev(`go('dashboard'); return 1;`); await dormir(500);
    const verifier = async () => { await ev('window.__toasts=[]; return 1;');
      const clic = await ev(`const b=[...document.querySelectorAll('#content button')].find(x=>/J’ai réglé — vérifier/.test(x.textContent)); if(!b) return false; b.click(); return true;`);
      await dormir(1500); return { clic, toasts: await ev('return window.__toasts.slice();') }; };
    const dit = (x, re) => x.toasts.some(t => re.test(t));
    const vi = await verifier();   // l'état posé plus haut : vérification impossible
    vrai('⛔ « J’ai réglé — vérifier », vérification impossible : « Vérification impossible pour l’instant » — pas « Toujours suspendu »',
      vi.clic && dit(vi, /Vérification impossible pour l’instant/) && !dit(vi, /Toujours suspendu/), vi);
    await ev('window.__proxy502=true; return 1;');
    const v502 = await verifier();
    await ev('window.__proxy502=false; return 1;');
    vrai('   … une page d’erreur du proxy (502) : pareil', v502.clic && dit(v502, /Vérification impossible pour l’instant/) && !dit(v502, /Toujours suspendu/), v502);
    await poserEtat(SUSP);
    const vs = await verifier();
    vrai('   (témoin) une réponse LUE, toujours suspendue : « Toujours suspendu : le règlement n’est pas encore arrivé »',
      vs.clic && dit(vs, /Toujours suspendu : le règlement n’est pas encore arrivé/) && !dit(vs, /Vérification impossible/), vs);
    /* le règlement : « J'ai réglé — vérifier » sur une réponse payée */
    await ev(`go('dashboard'); return 1;`); await dormir(500);
    await poserEtat(PAYE);
    const cliqué = await ev(`const b=[...document.querySelectorAll('#content button')].find(x=>/J’ai réglé — vérifier/.test(x.textContent)); if(!b) return false; b.click(); return true;`);
    await dormir(1500);
    const R = await etatEcran();
    vrai('⛔ « J’ai réglé — vérifier », réponse payée : tout revient d\'un coup — accès rouvert, classe retirée, plus d\'écran suspendu',
      cliqué && R.acces === false && R.classe === false && R.current !== 'suspendu', [cliqué, R.acces, R.classe, R.current]);
    vrai('   … et le menu n\'a plus un seul 🔒', R.navVerrou === 0, R.navVerrou);
    /* un serveur d'AVANT : formule + paye:false */
    const s1 = R.saves;
    await poserEtat({ ok: true, formule: 'pro', quantite: 1, paye: false, motif: 'aucun paiement ni code promo', opMessages: false, metier: '', versionMin: 0, enLigne: 0, suspendu: false, sursisJours: null });
    await ev('await forfaitServeurSync(true); return 1;'); await dormir(600);
    const V = await etatEcran();
    vrai('⛔ un serveur d\'AVANT (formule + paye:false) : suspendue — `db.forfait` intact, pas d\'attente, pas de bandeau, aucun save()',
      V.acces === true && V.forfait === 'business' && !V.attente && !V.bandeau && V.saves === s1, [V.acces, V.forfait, V.attente, V.bandeau, V.saves - s1]);
    /* « J'ai un code promo » depuis l'écran suspendu : le code pris, l'état se relit AVANT « Code accepté » — sinon l'écran
       restait suspendu sous un message qui dit l'inverse (`relecteur`, 30 septembre 2026). Le serveur simulé sert alors la
       période offerte, comme le vrai une fois le code enregistré. (Code FICTIF : aucun code ne s'écrit dans le dépôt.) */
    await poserEtat(SUSP); await ev('await forfaitServeurSync(true); return 1;');
    await ev(`go('dashboard'); return 1;`); await dormir(500);
    const finP = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10), debP = new Date().toISOString().slice(0, 10);
    const PERIODE = { ok: true, formule: 'premium', quantite: 1, places: 3, paye: true, motif: 'période offerte', opMessages: false, metier: '', versionMin: 0, enLigne: 0, suspendu: false, sursisJours: null };
    const pr0 = await ev(`window.__nPromo=0; const b=[...document.querySelectorAll('#content button')].find(x=>/J’ai un code promo/.test(x.textContent)); if(!b) return {clic:false};
      b.click(); return {clic:true};`);
    await dormir(700);
    const pr1 = await ev(`const i=document.getElementById('promo-inp'); const b=i&&i.parentElement?[...i.parentElement.querySelectorAll('button')].find(x=>/Activer/.test(x.textContent)):null;
      if(!i||!b) return {cur: current, champ: !!i, bouton: !!b};
      window.__promo=${JSON.stringify({ ok: true, finLe: finP, mois: 3, formule: 'premium', debut: debP })}; window.__ETAT=${JSON.stringify(PERIODE)};
      const n0=window.__nEtat; i.value='SONDE-FICTIF'; b.click(); return {cur: current, champ: true, bouton: true, n0};`);
    await dormir(1500);
    const PR = await etatEcran();
    const modal = await ev(`const o=document.getElementById('overlay'); const m=document.querySelector('#overlay .modal, .modal'); return { ouvert: !!(o&&o.classList.contains('open')), txt: ((m&&m.textContent)||'').replace(/\\s+/g,' ').trim().slice(0,200), nPromo: window.__nPromo };`);
    vrai('(population) « 🎁 J’ai un code promo » mène aux Paramètres, où le champ et « Activer » sont là', pr0.clic && pr1.cur === 'parametres' && pr1.champ && pr1.bouton, [pr0, pr1]);
    vrai('   … et le code est bien parti au serveur (simulé)', modal.nPromo === 1, modal);
    vrai('⛔ code accepté depuis la suspension : l’état est relu AVANT l’annonce — accès rouvert, plus un seul 🔒, « Code accepté »',
      PR.acces === false && PR.classe === false && PR.navVerrou === 0 && PR.nEtat > pr1.n0 && /Code accepté/.test(modal.txt), [PR.acces, PR.classe, PR.navVerrou, PR.nEtat, pr1.n0, modal]);
    await ev('try{ closeModal(); }catch(e){} return 1;');

    /* ══ 2. LE TECHNICIEN, AU TÉLÉPHONE ══ */
    await c.envoyer('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 3, mobile: true });
    await c.envoyer('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await ev(`sessionStorage.setItem('__etatSonde', ${JSON.stringify(JSON.stringify(SUSP))}); return 1;`);
    vrai('la page se recharge au téléphone', await charger());
    await entrer('sonde-tech', 'technicien');
    await dormir(4200);
    await ev('await forfaitServeurSync(true); return 1;'); await dormir(400);
    await ev(`go('dashboard'); return 1;`); await dormir(600);
    const T = await etatEcran();
    vrai('⛔ le technicien : suspendu aussi, l\'écran « Accès suspendu »', T.acces === true && T.current === 'suspendu', [T.acces, T.current]);
    vrai('⛔ … sans un mot de paiement (« c’est pas aux utilisateurs de savoir si l’entreprise paye ») — et ce qui est vrai : « Ton administrateur peut le rétablir »',
      /Ton administrateur peut le rétablir depuis son application/.test(T.txt) && !/prévenu/.test(T.txt) && !/abonnement|paiement|payer|réglé|Régler/i.test(T.txt), T.txt.slice(0, 300));
    vrai('⛔ … et l’infobulle de ses 🔒 ne parle pas de règlement : « Accès momentanément suspendu »',
      T.navVerrou >= 1 && T.verrouTitres.length === 1 && T.verrouTitres[0] === 'Accès momentanément suspendu', { n: T.navVerrou, titres: T.verrouTitres });
    vrai('   … ses deux gestes : « Réessayer », « Mes réglages » — pas « Régler mon abonnement »', T.boutons.some(b => /Réessayer/.test(b)) && T.boutons.some(b => /Mes réglages/.test(b)) && !T.boutons.some(b => /Régler mon abonnement/.test(b)), T.boutons);
    vrai('⛔ … et AUCUN rappel de paiement pour lui', !T.toasts.some(t => /Abonnement|abonnement/.test(t)), T.toasts);
    const ongletsGris = T.onglets.filter(o => o.k !== '_plus' && o.k !== 'parametres');
    vrai('(population) la barre d\'onglets du bas est là, au téléphone', T.onglets.length >= 3, T.onglets);
    vrai('⛔ les onglets du bas sont GRISÉS (sauf « Plus » et Paramètres) — la barre garde ses onglets', ongletsGris.length >= 2 && ongletsGris.every(o => o.op !== null && o.op < 0.6), T.onglets);

    vrai('aucune erreur JavaScript de la page pendant la sonde', exceptions.length === 0, exceptions.slice(0, 5));
  } catch (e) {
    vrai('la sonde a JETÉ', false, String(e && e.stack || e).slice(0, 500));
  } finally { fermer(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
