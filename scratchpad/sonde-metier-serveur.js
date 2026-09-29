/* SONDE — le métier réglé par TEAM OP arrive dans l'application (bêta v765), au navigateur, avec un VRAI save().
   CLAUDE.md : « toute fonction qui ÉCRIT dans db autrement que par un geste de l'utilisateur se mesure au navigateur,
   sur la bêta, avec un vrai save() — pas au banc ». metierServeurAppliquer écrit db.metier à l'ouverture.
   Ce qu'on mesure : le métier s'applique (types, journal, message), UNE fois ; « vide » ne remet personne en 3D ;
   le save() de l'application ne re-date AUCUNE fiche (le piège de l'ombre, 20 septembre) — avec un témoin qui prouve que
   le tampon tourne bien (sinon « 0 fiche re-datée » ne prouverait rien) ; et le réglage survit à un rechargement.
   ⛔ Bêta seulement (copie du dépôt), 127.0.0.1 seulement ; la réponse du serveur est SIMULÉE dans la page.
   Usage : node sonde-metier-serveur.js   ·   SOURCE=/chemin/beta.html node …  (la contre-épreuve sur une autre copie) */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http');
const { spawn } = require('child_process');
const RACINE = '/home/user/teamop', CHROME = '/opt/pw-browsers/chromium';
const SOURCE = process.env.SOURCE || path.join(RACINE, 'beta.html');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const INIT = `try{ localStorage.setItem('elanB_sync_team','t-sonde-848'); localStorage.setItem('elanB_sync_on','1'); }catch(e){}
  window.__ETAT = window.__ETAT || {ok:true,formule:'business',quantite:1,paye:true,motif:'',opMessages:false,metier:'',versionMin:0,enLigne:0,suspendu:false,sursisJours:0};
  try{ const m=sessionStorage.getItem('__metierSonde'); if(m!==null) window.__ETAT.metier=m; }catch(e){}
  window.__nEtat=0; const __f0=window.fetch.bind(window);
  window.fetch=function(u,o){ const s=String((u&&u.url)||u);
    if(/\\/api\\/espaces\\/etat$/.test(s)){ window.__nEtat++; return Promise.resolve(new Response(JSON.stringify(window.__ETAT),{status:200,headers:{'Content-Type':'application/json'}})); }
    if(/api\\.teamop\\.fr/.test(s)) return Promise.resolve(new Response('{"error":"sonde"}',{status:503,headers:{'Content-Type':'application/json'}}));
    return __f0(u,o); };`;
function cdpClient(ws) { let id = 0; const A = new Map(), E = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) E.forEach(f => { try { f(m); } catch (e) {} }); });
  return { envoyer(me, pa) { const i = ++id; return new Promise((res, rej) => { A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); }, sur(f) { E.push(f); } }; }
(async () => {
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'opg-met-')), PAGE = fs.readFileSync(SOURCE, 'utf8');
  const pp = await portLibre(), pc = await portLibre();
  const statique = http.createServer((q, r) => { const u = q.url.split('?')[0].split('#')[0];
    if (u === '/beta.html') { r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(PAGE); }
    const x = path.join(RACINE, u.replace(/^\/+/, '')); if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : x.endsWith('.png') ? 'image/png' : 'text/html;charset=utf-8' }); r.end(d); }); });
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
    const ev = async expr => { const r = await c.envoyer('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    const charger = async () => { await c.envoyer('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/beta.html' });
      for (let i = 0; i < 200; i++) { await dormir(250); try { if (await ev('return typeof db!=="undefined"&&!!db&&typeof enterApp==="function"')) return true; } catch (e) {} } return false; };
    const entrer = () => ev(`window.confirm=()=>true; window.alert=()=>{}; window.prompt=(q,d)=>d||'';
      window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      if(!db.users.some(u=>u.id==='sonde-admin')){ db.users.push({id:'sonde-admin',prenom:'Sonde',nom:'Admin',login:'sonde',role:'admin',actif:true,essai:true}); save(); }
      currentUser=db.users.find(u=>u.id==='sonde-admin');
      try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>localStorage.setItem('elanB_'+k+currentUser.id,'1')); }catch(e){}
      enterApp(currentUser);
      window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
      window.__saves=0; const s0=window.save; window.save=function(){ window.__saves++; return s0.apply(this,arguments); };
      return APP_VERSION;`);
    const cliches = () => ev(`const o={}; collsFusion(db).forEach(c=>(db[c]||[]).forEach(r=>{ if(r&&r.id!=null) o[c+':'+r.id]=r._m||0; })); return o;`);
    /* les fiches qui EXISTAIENT et ont changé de date — une fiche NOUVELLE (la ligne de journal du métier) en prend une, et c'est juste */
    const diff = (a, b) => Object.keys(b).filter(k => k in a && a[k] !== b[k]);
    const nouvelles = (a, b) => Object.keys(b).filter(k => !(k in a));

    console.log('\n══ ' + path.basename(SOURCE) + ' ══');
    vrai('la bêta se charge (copie locale, rattachée à une entreprise de sonde)', await charger());
    const version = await entrer();
    console.log('   version : ' + version);
    await dormir(4200);   // l'appel automatique de l'ouverture (2,6 s) passe, sur un serveur qui ne règle aucun métier
    const E0 = await ev(`return {met:metierId(), stock:db.metier, nEtat:window.__nEtat, sync:syncEnabled(), types:intTypes().slice(0,3)};`);
    vrai('(population) l\'ouverture a bien interrogé l\'état de l\'espace, la synchro est ACTIVE (le tampon des fiches tourne), et l\'appareil part en 3D',
      E0.nEtat >= 1 && E0.sync === true && E0.met === '3d' && E0.stock === undefined, E0);

    /* le témoin : le tampon tourne pour de vrai — une fiche modifiée prend une date, une seule */
    await ev(`db.clients.push({id:'c-sonde-1',nom:'Client témoin',ville:'Lyon'}); db.clients.push({id:'c-sonde-2',nom:'Client témoin 2',ville:'Metz'}); save(); return 1;`);
    await dormir(300);
    const T1 = await cliches();
    await ev(`const c=db.clients.find(x=>x.id==='c-sonde-1'); c.ville='Lille'; save(); return 1;`); await dormir(300);
    const T2 = await cliches();
    v1 = diff(T1, T2);
    vrai('(témoin) une fiche modifiée puis enregistrée prend une date — une seule : le tampon tourne, un zéro plus bas voudra dire quelque chose',
      v1.length === 1 && v1[0] === 'clients:c-sonde-1', v1);

    /* le serveur règle « plomberie » : l'appel de l'application, rejoué comme à l'ouverture */
    await ev(`window.__ETAT.metier='plomberie'; window.__saves=0; window.__toasts=[]; return 1;`);
    const A0 = await cliches(), nJ0 = await ev(`return (db.journal||[]).length;`);
    await ev(`await forfaitServeurSync(); return 1;`); await dormir(400);
    const A1 = await cliches();
    const R = await ev(`return {met:metierId(), stock:db.metier, types:intTypes(), saves:window.__saves, toasts:window.__toasts.slice(), journal:(db.journal||[]).slice(0,3).map(j=>JSON.stringify(j)),
      menu:(document.querySelector('.sidebar')||document.body).textContent.length>0, stocke:(()=>{ try{ return JSON.parse(localStorage.getItem(STORE_KEY)||'{}').metier; }catch(e){ return 'illisible'; } })()};`);
    vrai('⛔ le métier du serveur s\'applique : l\'application passe en PLOMBERIE, avec les types d\'intervention du pack', R.met === 'plomberie' && R.stock === 'plomberie' && R.types.includes('Dépannage fuite') && !R.types.includes('Dératisation'), R);
    vrai('⛔ il est ENREGISTRÉ sur l\'appareil (le rangement relu porte « plomberie »)', R.stocke === 'plomberie', R.stocke);
    vrai('   un seul enregistrement, une ligne de journal « réglé par TEAM OP », et l\'administrateur est prévenu', R.saves === 1 && R.journal.some(j => /Métier de l.entreprise/.test(j) && /réglé par TEAM OP/.test(j)) && R.toasts.some(t => /réglée pour : Plomberie/.test(t)), R);
    const reDatees = diff(A0, A1);
    vrai('   la seule fiche nouvelle est la ligne de journal du métier', nouvelles(A0, A1).length === 1 && /^journal:/.test(nouvelles(A0, A1)[0]), nouvelles(A0, A1));
    vrai('⛔ ce save() ne re-date AUCUNE fiche (population : ' + Object.keys(A1).length + ' fiches) — l\'appareil ne s\'attribue rien', reDatees.length === 0 && Object.keys(A1).length >= 3, reDatees.slice(0, 8));

    await ev(`window.__saves=0; window.__toasts=[]; return 1;`); const nJ1 = await ev(`return (db.journal||[]).length;`);
    await ev(`await forfaitServeurSync(); return 1;`); await dormir(300);
    const R2 = await ev(`return {saves:window.__saves, toasts:window.__toasts.length, nJ:(db.journal||[]).length};`);
    vrai('⛔ une seconde ouverture ne réécrit rien (aucun save, aucune ligne, aucun message)', R2.saves === 0 && R2.toasts === 0 && R2.nJ === nJ1, R2);

    await ev(`window.__ETAT.metier=''; await forfaitServeurSync(); return 1;`); await dormir(300);
    vrai('⛔ le serveur « non réglé » (vide) : l\'application GARDE la plomberie — personne n\'est remis en 3D', (await ev(`return metierId();`)) === 'plomberie');

    /* le rechargement : l'appareil rouvert garde son métier, et un serveur qui dit toujours « plomberie » n'écrit rien de plus */
    const AVANT = await ev(`const o=JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); return {metier:o.metier, journal:(o.journal||[]).length, ligne:(o.journal||[]).filter(j=>/Métier de l.entreprise/.test(JSON.stringify(j))).length, clients:(o.clients||[]).map(c=>c.id), memJournal:(db.journal||[]).length};`);
    if (process.env.DIAG) console.log('   DIAG avant rechargement :', JSON.stringify(AVANT));
    await ev(`sessionStorage.setItem('__metierSonde','plomberie'); return 1;`);
    vrai('   la page se recharge', await charger());
    await entrer(); await dormir(4200);
    if (process.env.DIAG) console.log('   DIAG après rechargement :', JSON.stringify(await ev(`return {journal:(db.journal||[]).length, premiers:(db.journal||[]).slice(0,4).map(j=>(j.action||j.t||'')+' | '+(j.detail||j.d||'')), clients:(db.clients||[]).map(c=>c.id), stock:(()=>{ const o=JSON.parse(localStorage.getItem(STORE_KEY)||'{}'); return {journal:(o.journal||[]).length, clients:(o.clients||[]).map(c=>c.id)}; })()};`)));
    const R3 = await ev(`return {met:metierId(), saves:window.__saves, jr:(db.journal||[]).filter(j=>/Métier de l.entreprise/.test(JSON.stringify(j))).length, nEtat:window.__nEtat};`);
    vrai('⛔ après rechargement : toujours plomberie, l\'état relu, et pas une seconde ligne « Métier de l\'entreprise »', R3.met === 'plomberie' && R3.nEtat >= 1 && R3.jr === 1, R3);

    /* Paramètres : l'écran « Mon métier » le montre */
    await ev(`go('parametres'); return 1;`); await dormir(900);
    vrai('   Paramètres montre le métier réglé (Plomberie)', await ev(`const t=document.getElementById('content').textContent; return /Plomberie/.test(t);`));
    vrai('aucune exception JavaScript pendant la sonde', exceptions.length === 0, exceptions.slice(0, 5));
  } catch (e) { ko++; console.log('  ✗ la sonde a jeté : ' + (e && e.stack || e)); }
  finally { fermer(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})();
var v1;
