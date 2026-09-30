/* SONDE — les sept packs du 30 septembre 2026 (bêta v766) au navigateur : maçonnerie, menuiserie, peinture, espaces verts,
   couverture, multiservices et « Autre ». Pour chacun, réglé par TEAM OP comme en vrai (l'état de l'espace, simulé dans la
   page, porte le métier ; `forfaitServeurSync` l'applique) :
   · les types d'intervention du FORMULAIRE sont ceux du pack, sans rien du 3D ;
   · la fiche d'une intervention montre SES prestations et SES relevés ; un toucher sur une prestation (parenthèses et
     apostrophe typographique comprises) et un relevé saisi s'enregistrent — un relevé « texte » prend du texte, un relevé
     chiffré un nombre — et la fiche relue les montre ;
   · le menu : sur une copie de la bêta où BETA_ESSAI vaut false (la règle de PRODUCTION — la bêta, elle, voit tout par
     construction), Boxes et Registre disparaissent et `go('boxes')` refuse ; contre-épreuve dans la même page : en 3D,
     ils reviennent et `go('boxes')` ouvre.
   ⛔ Bêta seulement (copies du dépôt), 127.0.0.1 seulement ; la réponse du serveur est simulée dans la page.
   Usage : node scratchpad/sonde-packs-metier.js   ·   SOURCE=/chemin/beta.html node …  (contre-épreuve sur une autre copie) */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http');
const { spawn } = require('child_process');
const RACINE = '/home/user/teamop', CHROME = '/opt/pw-browsers/chromium';
const SOURCE = process.env.SOURCE || path.join(RACINE, 'beta.html');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 900) : '')); } };
const NEUFS = ['maconnerie', 'menuiserie', 'peinture', 'paysagiste', 'couverture', 'multiservices', 'autre'];
const NUIS = /dératis|désinsect|xylophag|nuisible|rongeur|cafard|punaise|termite|appât/i;
const INIT = `try{ localStorage.setItem('elanB_sync_team','t-sonde-766'); localStorage.setItem('elanB_sync_on','1'); }catch(e){}
  window.__ETAT = {ok:true,formule:'business',quantite:3,paye:true,motif:'',opMessages:false,metier:'',versionMin:0,enLigne:0,suspendu:false,sursisJours:0};
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

async function passe(nomPasse, page, production) {
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'opg-packs-'));
  const pp = await portLibre(), pc = await portLibre();
  const statique = http.createServer((q, r) => { const u = q.url.split('?')[0].split('#')[0];
    if (u === '/beta.html') { r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(page); }
    const x = path.join(RACINE, u.replace(/^\/+/, '')); if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : x.endsWith('.png') ? 'image/png' : 'text/html;charset=utf-8' }); r.end(d); }); });
  await new Promise(res => statique.listen(pp, '127.0.0.1', res));
  const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--remote-debugging-port=' + pc, '--user-data-dir=' + path.join(BANC, 'ch'), 'about:blank'], { stdio: 'ignore' });
  const fermer = () => { try { chrome.kill('SIGKILL'); } catch (e) {} try { statique.close(); } catch (e) {} try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {} };
  console.log('\n══ ' + nomPasse + ' ══');
  try {
    for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + pc + '/json/version')).ok) break; } catch (e) {} }
    const cible = await (await fetch('http://127.0.0.1:' + pc + '/json/new?about:blank', { method: 'PUT' })).json();
    const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    const c = cdpClient(ws), exceptions = [];
    c.sur(m => { if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text).split('\n')[0]); } });
    await c.envoyer('Runtime.enable'); await c.envoyer('Page.enable');
    /* animations réduites : une transition de vue ouverte pendant un relevé lit le calque de la transition (CLAUDE.md) */
    await c.envoyer('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await c.envoyer('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
    const ev = async expr => { const r = await c.envoyer('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    await c.envoyer('Page.navigate', { url: 'http://127.0.0.1:' + pp + '/beta.html' });
    let charge = false;
    for (let i = 0; i < 200 && !charge; i++) { await dormir(250); try { charge = await ev('return typeof db!=="undefined"&&!!db&&typeof enterApp==="function"'); } catch (e) {} }
    vrai('la page se charge (copie locale de la bêta' + (production ? ', BETA_ESSAI=false' : '') + ')', charge);
    const ent = await ev(`window.confirm=()=>true; window.alert=()=>{}; window.prompt=(q,d)=>d||'';
      window.horsLigneDebut=function(){}; try{_horsLigne=false;}catch(e){} const h=document.getElementById('hl-ecran'); if(h)h.remove(); window.pushPropose=function(){};
      window.secuAFaire=()=>false; window.emailRappelModal=function(){};
      if(!db.users.some(u=>u.id==='sonde-admin')){ db.users.push({id:'sonde-admin',prenom:'Sonde',nom:'Admin',login:'sonde',role:'admin',actif:true,essai:true,pinHash:'x'}); }
      if(!db.clients.some(x=>x.id==='c-sonde')) db.clients.push({id:'c-sonde',nom:'Client Sonde',ville:'Nantes',adresse:'1 rue de la Sonde'});
      save();
      currentUser=db.users.find(u=>u.id==='sonde-admin');
      try{ ['onboarded_','push_ask_','photo_prompt_'].forEach(k=>localStorage.setItem('elanB_'+k+currentUser.id,'1')); }catch(e){}
      enterApp(currentUser);
      window.__toasts=[]; const t0=window.toast; window.toast=function(m){ window.__toasts.push(String(m)); return t0.apply(this,arguments); };
      return {v:APP_VERSION, essai:BETA_ESSAI};`);
    vrai('(population) version 766, BETA_ESSAI = ' + ent.essai, /^766/.test(ent.v) && ent.essai === !production, ent);
    await dormir(4200);   // l'appel de l'ouverture passe, sur un serveur qui ne règle aucun métier
    const fermerFenetres = () => ev(`try{ closeModal(); }catch(e){} document.querySelectorAll('.overlay.open,.modal.open').forEach(x=>{ try{ x.classList.remove('open'); }catch(e){} }); return 1;`);

    const regler = async (m) => { await ev(`window.__toasts=[]; window.__ETAT.metier=${JSON.stringify(m)}; await forfaitServeurSync(); return 1;`); await dormir(500); await fermerFenetres(); };
    const menu = () => ev(`try{ renderNav(); }catch(e){} const n=[...document.querySelectorAll('.nav-item[data-view]')].map(x=>x.getAttribute('data-view')); return {n:n.length, boxes:n.includes('boxes'), registre:n.includes('registre'), voitBoxes:userSeesModule(currentUser,'boxes'), voitRegistre:userSeesModule(currentUser,'registre')};`);
    const essaiGo = async (vue) => { await ev(`go('dashboard'); return 1;`); await dormir(500); await ev(`go(${JSON.stringify(vue)}); return 1;`); await dormir(700); const r = await ev(`return current;`); await fermerFenetres(); return r; };

    for (const m of NEUFS) {
      await regler(m);
      const P = await ev(`const p=METIERS[${JSON.stringify(m)}]; return {met:metierId(), stock:db.metier, nom:p.nom, types:intTypes(), attendus:p.types, toasts:window.__toasts.slice()};`);
      console.log('\n  ── ' + P.nom);
      vrai('le métier du serveur s\'applique (' + m + '), et l\'administrateur en est prévenu', P.met === m && P.stock === m && P.toasts.some(t => t.indexOf('réglée pour : ' + P.nom) >= 0), P);
      /* le FORMULAIRE : les options du champ Catégorie, lues dans la fenêtre ouverte */
      await ev(`formIntervention(); return 1;`); await dormir(500);
      const F = await ev(`const s=document.querySelector('#intform select[name="type"]'); return s?[...s.options].map(o=>o.textContent).filter(t=>t!=='Choix'):null;`);
      await fermerFenetres();
      vrai('   le formulaire « Intervention » propose exactement les ' + (P.attendus || []).length + ' types du pack, rien du 3D',
        Array.isArray(F) && JSON.stringify(F) === JSON.stringify(P.attendus) && !F.some(t => NUIS.test(t)), { formulaire: F, pack: P.attendus });
      /* la FICHE : une intervention de ce métier, en modification (le stylo), puis relue */
      const id = 'i-sonde-' + m;
      await ev(`if(!db.interventions.some(x=>x.id===${JSON.stringify(id)})) db.interventions.push({id:${JSON.stringify(id)},clientId:'c-sonde',type:intTypes()[0],date:new Date().toISOString().slice(0,10),heure:'09:00',statut:'planifiee',techIds:[],produitsUtilises:[]}); save();
        detailIntervention(${JSON.stringify(id)}); return 1;`); await dormir(700);
      await ev(`intEdit=true; renderIntDetail(${JSON.stringify(id)}); return 1;`); await dormir(500);
      const D = await ev(`const p=metierPack(); const puces=[...document.querySelectorAll('#content .met-chip:not(.add)')].map(x=>x.textContent.replace(/^✓\\s*/,'').trim());
        const champs=[...document.querySelectorAll('#content .met-rel .field')].map(f=>{ const l=f.querySelector('label').cloneNode(true); l.querySelectorAll('span').forEach(x=>x.remove()); /* l'unité vit dans un <span> : un libellé peut porter ses propres parenthèses (« Cotes relevées (L × H) ») */ return {l:l.textContent.trim(), type:f.querySelector('input').getAttribute('type')||'text'}; });
        return {puces, presta:p.presta, champs, releves:p.releves.map(r=>({l:r.l,type:r.txt?'text':'number'}))};`);
      vrai('   la fiche montre les ' + D.presta.length + ' prestations du pack', JSON.stringify(D.puces) === JSON.stringify(D.presta), D);
      vrai('   … et ses ' + D.releves.length + ' relevés, chacun avec le bon champ (texte ou nombre)', JSON.stringify(D.champs) === JSON.stringify(D.releves), D);
      /* le toucher : la prestation la plus piégeuse (parenthèses, apostrophe typographique), sinon la première */
      const cible = D.presta.find(x => /[()’]/.test(x)) || D.presta[0];
      const clic = await ev(`const b=[...document.querySelectorAll('#content .met-chip:not(.add)')].find(x=>x.textContent.replace(/^✓\\s*/,'').trim()===${JSON.stringify(cible)}); if(!b) return 'introuvable';
        const r=b.getBoundingClientRect(); b.scrollIntoView({block:'center'}); await new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(res)));
        const r2=b.getBoundingClientRect(); const x=r2.left+r2.width/2, y=r2.top+r2.height/2; const e=document.elementFromPoint(x,y);
        if(!(e===b||b.contains(e))) return 'recouvert par '+(e&&e.className);
        b.click(); return 'ok';`); await dormir(500);
      /* un relevé texte (s'il y en a un) et un relevé chiffré, saisis comme au doigt : valeur puis « change » */
      const rt = D.releves.findIndex(r => r.type === 'text'), rn = D.releves.findIndex(r => r.type === 'number');
      const saisir = (ix, val) => ev(`const f=[...document.querySelectorAll('#content .met-rel .field')][${ix}]; if(!f) return false; const i=f.querySelector('input'); i.focus(); i.value=${JSON.stringify(val)}; i.dispatchEvent(new Event('change',{bubbles:true})); return true;`);
      if (rt >= 0) await saisir(rt, '120 × 215 cm');
      if (rn >= 0) await saisir(rn, '42.5');
      await dormir(400);
      const S = await ev(`const i=db.interventions.find(x=>x.id===${JSON.stringify(id)}); const p=metierPack();
        let st={}; try{ st=(JSON.parse(localStorage.getItem(STORE_KEY)||'{}').interventions||[]).find(x=>x.id===${JSON.stringify(id)})||{}; }catch(e){ st={err:String(e)}; }
        return {presta:i.prestaMetier||[], rel:i.relevesMetier||{}, stPresta:st.prestaMetier||[], stRel:st.relevesMetier||{}, cles:p.releves.map(r=>r.k)};`);
      vrai('   un toucher sur « ' + cible + ' » la coche, et c\'est enregistré sur l\'appareil', clic === 'ok' && S.presta.includes(cible) && S.stPresta.includes(cible), { clic, S });
      if (rt >= 0) vrai('   le relevé texte « ' + D.releves[rt].l + ' » prend du texte et le garde', S.rel[S.cles[rt]] === '120 × 215 cm' && S.stRel[S.cles[rt]] === '120 × 215 cm', S);
      if (rn >= 0) vrai('   le relevé chiffré « ' + D.releves[rn].l + ' » prend un nombre et le garde', S.rel[S.cles[rn]] === '42.5' && S.stRel[S.cles[rn]] === '42.5', S);
      await ev(`intEdit=false; renderIntDetail(${JSON.stringify(id)}); return 1;`); await dormir(500);
      const L = await ev(`const t=(document.querySelector('#content')||document.body).textContent; return {t:t.replace(/\\s+/g,' ').slice(0,4000), ro:[...document.querySelectorAll('#content .met-rel-ro > div')].map(d=>d.textContent.replace(/\\s+/g,' ').trim())};`);
      const attenduRo = [rt, rn].filter(x => x >= 0).sort((a, b) => a - b).length;
      vrai('   la fiche relue montre la prestation cochée et les relevés saisis (unité comprise)', L.t.indexOf(cible) >= 0 && L.ro.length === attenduRo, L.ro);
      vrai('   aucune trace du 3D sur la fiche (ni nuisibles, ni fiche de traitement)', !/Nuisibles & méthodes|Fiche de traitement|Plan d.appâtage/.test(L.t), L.t.slice(0, 300));
      await ev(`go('dashboard'); return 1;`); await dormir(400);
      /* le MENU (règle de production seulement) */
      const N = await menu();
      if (production) {
        vrai('   ⛔ le menu n\'a ni Boxes ni Registre (population : ' + N.n + ' rubriques)', N.n >= 8 && !N.boxes && !N.registre && !N.voitBoxes && !N.voitRegistre, N);
        const g = await essaiGo('boxes');
        vrai('   ⛔ et go(\'boxes\') refuse (on reste ailleurs)', g !== 'boxes', g);
      } else {
        vrai('   la bêta voit tout, par construction (Boxes au menu)', N.voitBoxes && N.voitRegistre, N);
      }
    }

    /* la CONTRE-ÉPREUVE, dans la même page : retour en 3D */
    await regler('3d');
    const T = await ev(`return {met:metierId(), types:intTypes()};`);
    console.log('\n  ── contre-épreuve : 3D');
    vrai('en 3D, les types historiques reviennent (Dératisation comprise)', T.met === '3d' && T.types.some(t => /Dératisation/.test(t)), T);
    if (production) {
      const N = await menu();
      vrai('⛔ en 3D, Boxes et Registre reviennent au menu', N.boxes && N.registre && N.voitBoxes && N.voitRegistre, N);
      const g = await essaiGo('boxes');
      vrai('⛔ et go(\'boxes\') ouvre', g === 'boxes', g);
    }
    /* Paramètres : la carte du métier réglé */
    await regler('autre');
    await ev(`go('parametres'); return 1;`); await dormir(900);
    vrai('Paramètres montre le métier réglé (« Autre métier de terrain »)', await ev(`return /Autre métier de terrain/.test(document.getElementById('content').textContent);`));
    vrai('aucune exception JavaScript pendant la passe', exceptions.length === 0, exceptions.slice(0, 6));
  } catch (e) { ko++; console.log('  ✗ la passe a jeté : ' + (e && e.stack || e)); }
  finally { fermer(); }
}

(async () => {
  const BETA = fs.readFileSync(SOURCE, 'utf8');
  await passe(path.basename(SOURCE) + ' telle quelle (la bêta voit tout)', BETA, false);
  const PROD = BETA.replace('const BETA_ESSAI=true;', 'const BETA_ESSAI=false;');
  vrai('(population) la copie « production » a bien BETA_ESSAI=false', PROD !== BETA && PROD.indexOf('const BETA_ESSAI=false;') > 0);
  await passe(path.basename(SOURCE) + ' avec BETA_ESSAI=false (la règle de production)', PROD, true);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})();
