/* ══ SONDE — LA VRAIE TOUR DANS UN NAVIGATEUR, CONTRE LE VRAI SERVEUR LOCAL (23 octobre 2026, campagne de vérification de la Tour) ══════════
   Les autres sondes de la Tour simulent l'API DANS LA PAGE ; celle-ci ne simule RIEN côté Tour : `tour.html` est servie en local, son `fetch` vers
   api.teamop.fr est réécrit vers un relais qui parle au VRAI `server/index.js` (isolé, 127.0.0.1, données jetables), et SEUL Anthropic est faux
   (un faux Claude qui répond « ici <nom> (faux cerveau de sonde) »). Aucune donnée réelle, aucune requête ne sort.
   Ce qu'elle joue, au vrai clic et à la vraie frappe, bureau clair puis téléphone sombre (encoches posées) :
     · la page Agents : seize cartes, tous à l'arrêt, « Auto » grisé depuis l'arrêt, le bouton « Toute l'équipe au travail » (≥ 44 px) → seize en BROUILLON,
       aucun en auto, une seule confirmation, le serveur le confirme ;
     · « Parler à Camille » → la messagerie sur son fil → mon message → sa réponse (ou la ligne du système qui dit pourquoi elle n'a pas pu : `test-2960`) ;
     · les pages du lot 1 (Accueil, Facturation, Incidents, Contrats, Rapport) et Agents, Messagerie, Journal : du texte, ni « undefined », ni « NaN », ni défilement latéral ;
     · (bureau) « @Cam » + Entrée, « @Hu » + Entrée, envoi : Camille ET Hugo répondent dans « Équipe », personne d'autre ; les fils Clients / Plateforme / Réunions ;
       l'onglet Direction montre la charte ; Camille passe en Auto au clic (confirmation) — et « Répondre seul aux questions courantes » reste FERMÉE ;
     · aucune exception JavaScript.
   Usage : node scratchpad/sonde-tour-reel.js   (CAPTURES=<dossier> pour les PNG) */
/* Sonde — la VRAIE Tour (navigateur piloté) contre le VRAI serveur local (faux Claude). 127.0.0.1 seulement, aucune donnée réelle.
   La page tour.html est servie par un petit serveur qui relaie /__api/* vers le vrai serveur ; le fetch de la page est réécrit de api.teamop.fr vers /__api. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net'), http = require('http');
const { spawn } = require('child_process');
const RACINE = path.resolve(__dirname, '..');
const CAP = process.env.CAPTURES || path.join(os.tmpdir(), 'tour-reel-captures'); fs.mkdirSync(CAP, { recursive: true });
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let ok = 0, ko = 0;
const v = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? ' — ' + String(JSON.stringify(d)).slice(0, 500) : '')); } };
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'reel-'));
const enfants = [];
const nettoyer = () => { enfants.forEach(e => { try { process.kill(-e.pid, 'SIGKILL'); } catch (x) { try { e.kill('SIGKILL'); } catch (y) {} } }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', nettoyer); for (const s of ['SIGTERM', 'SIGINT']) process.once(s, () => { nettoyer(); process.exit(130); });
setTimeout(() => { console.log('FIGÉ'); nettoyer(); process.exit(1); }, 420000).unref();

(async () => {
  const webpush = require(RACINE + '/server/node_modules/web-push');
  const PRE = path.join(banc, 'claude.js');
  fs.writeFileSync(PRE, `const vrai = globalThis.fetch; globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { const j = JSON.parse(String(opts && opts.body)); const nom = (/^Tu es (\\S+),/.exec(j.system) || [])[1] || '?';
    return new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: 'je réfléchis…', signature: 'sig' }, { type: 'text', text: 'Bonjour, ici ' + nom + ' (faux cerveau de sonde).' }], usage: { input_tokens: 500, output_tokens: 80 } }), { status: 200, headers: { 'content-type': 'application/json' } }); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-sonde-reel';
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_reel' }, agents: { cleApi: 'sk-ant-' + 'api03-banc-reel-xxxxxxxxxxxxxxxx', reunionsAuto: false } }));
  const PORT = await libre();
  const srv = spawn(process.execPath, ['--require', PRE, RACINE + '/server/index.js'], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' }), stdio: 'ignore', detached: true });
  enfants.push(srv);
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  v('serveur local vivant', vivant); if (!vivant) process.exit(1);
  const lj = await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.7.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json();

  for (let i = 0; i < 3; i++) await fetch('http://127.0.0.1:' + PORT + '/api/bug', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.3.0.' + (i + 1) }, body: JSON.stringify({ teamId: 'essai-sonde-' + (i % 2), app: 'opgestion', version: '772', msg: 'TypeError: sonde-incident-' + i + ' impossible de lire stock', src: 'app.html', line: 100 + i }) });
  const PAGE = fs.readFileSync(RACINE + '/tour.html', 'utf8');
  const pp = await libre(); let nXff = 0;
  const statique = http.createServer((q, r) => {
    const u = q.url;
    if (u.startsWith('/__api/')) {
      const ch = []; q.on('data', d => ch.push(d)); q.on('end', () => {
        const h = Object.assign({}, q.headers, { host: '127.0.0.1:' + PORT, 'x-forwarded-for': '10.8.' + Math.floor(nXff++ / 40) + '.1' }); delete h['content-length'];
        const body = Buffer.concat(ch);
        const rq = http.request({ host: '127.0.0.1', port: PORT, path: u.slice(6), method: q.method, headers: Object.assign(h, body.length ? { 'content-length': body.length } : {}) }, rs => { r.writeHead(rs.statusCode, rs.headers); rs.pipe(r); });
        rq.on('error', () => { r.writeHead(502); r.end(); }); rq.end(body); });
      return;
    }
    const p = decodeURIComponent(u.split('?')[0].split('#')[0]);
    if (p === '/' || p === '/tour.html') { r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(PAGE); }
    const x = path.join(RACINE, p.replace(/^\/+/, '')); if (!x.startsWith(RACINE)) { r.writeHead(403); return r.end(); }
    fs.readFile(x, (e, d) => { if (e) { r.writeHead(404); return r.end(); } r.writeHead(200, { 'Content-Type': x.endsWith('.png') ? 'image/png' : x.endsWith('.js') ? 'text/javascript' : x.endsWith('.svg') ? 'image/svg+xml' : 'application/octet-stream' }); r.end(d); });
  });
  await new Promise(res => statique.listen(pp, '127.0.0.1', res));
  const BASE = 'http://127.0.0.1:' + pp;

  const pc = await libre();
  const chrome = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--disable-dev-shm-usage', '--hide-scrollbars', '--lang=fr-FR',
    '--remote-debugging-port=' + pc, '--user-data-dir=' + path.join(banc, 'ch'), 'about:blank'], { stdio: 'ignore', detached: true });
  enfants.push(chrome);
  let cv = false; for (let i = 0; i < 150 && !cv; i++) { await dormir(100); try { cv = (await fetch('http://127.0.0.1:' + pc + '/json/version')).ok; } catch (x) {} }
  v('Chromium répond', cv); if (!cv) process.exit(1);

  const INIT = `(function(){ try{ localStorage.setItem('tour_token',${JSON.stringify(lj.token)}); localStorage.setItem('tour_nom','Patron'); localStorage.setItem('tour_role','patron'); localStorage.setItem('tour_apps',JSON.stringify(['gestion'])); }catch(e){}
    var orig=window.fetch.bind(window); window.__appels=[];
    window.fetch=function(u,o){ var s=String(u); if(s.indexOf('https://api.teamop.fr')===0){ window.__appels.push(((o&&o.method)||'GET')+' '+s.slice(21).split('?')[0]); return orig('/__api'+s.slice(21),o); } return orig(u,o); };
    window.__vt=0; if(document.startViewTransition){ var sv=document.startViewTransition.bind(document); document.startViewTransition=function(f){ var t=sv(f); window.__vt++; var fin=function(){ window.__vt--; }; t.finished.then(fin,fin); return t; }; }
  })();`;

  async function onglet(appareil, mode) {
    const cible = await (await fetch('http://127.0.0.1:' + pc + '/json/new?about:blank', { method: 'PUT' })).json();
    const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    let id = 0; const A = new Map(); const exceptions = [];
    ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && A.has(m.id)) { const a = A.get(m.id); A.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); } else if (m.method === 'Runtime.exceptionThrown') { const d = m.params.exceptionDetails; exceptions.push(String((d.exception && (d.exception.description || d.exception.value)) || d.text).split('\n').slice(0, 2).join(' | ')); } });
    const env = (me, pa) => { const i = ++id; return new Promise((res, rej) => { A.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); };
    await env('Runtime.enable'); await env('Page.enable');
    if (appareil === 'telephone') {
      await env('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }); await env('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await env('Emulation.setUserAgentOverride', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
      try { await env('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, topMax: 47, bottom: 34, bottomMax: 34, left: 0, leftMax: 0, right: 0, rightMax: 0 } }); } catch (e) {}
    } else await env('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await env('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: mode }] });
    await env('Page.addScriptToEvaluateOnNewDocument', { source: INIT });
    await env('Page.navigate', { url: BASE + '/tour.html' });
    const ev = async expr => { const r = await env('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text); return r.result.value; };
    let pret = false; for (let i = 0; i < 200 && !pret; i++) { await dormir(150); try { pret = await ev('return !!document.getElementById("app") && document.getElementById("app").classList.contains("on") && typeof AG!=="undefined"'); } catch (e) {} }
    if (!pret) throw new Error('la Tour n\'a pas démarré');
    await dormir(600);
    return { ev, env, exceptions, cap: async nom => { const r = await env('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAP, nom + '.png'), Buffer.from(r.data, 'base64')); },
      fermer: async () => { try { ws.close(); } catch (e) {} try { await fetch('http://127.0.0.1:' + pc + '/json/close/' + cible.id); } catch (e) {} } };
  }
  const STABLE = 'await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); void document.body.offsetWidth;';
  const APAISER = 'for(let i=0;i<60;i++){ if(!window.__vt && !document.querySelector("#vue.entre")) break; await new Promise(r=>setTimeout(r,50)); } await new Promise(r=>setTimeout(r,450));' + STABLE;

  for (const [appareil, mode] of [['bureau', 'light'], ['telephone', 'dark']]) {
    console.log('\n══ ' + appareil + ' · ' + mode + ' ══');
    for (const a of ['victor','ines','camille','hugo','margaux','lea','max','nina','theo','jules','chloe','emma','louis','sarah','lola','noah']) await fetch('http://127.0.0.1:' + PORT + '/api/monitor/agents/mode', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': '10.7.8.' + Math.floor(Math.random() * 200) }, body: JSON.stringify({ agent: a, mode: 'arret' }) });
    const O = await onglet(appareil, mode); const E = O.ev;
    await E('window.alert=()=>{}; window.prompt=()=>null; window.confirm=()=>{ window.__confirm=(window.__confirm||0)+1; return true; }; return 1;');

    /* --- Agents : état initial --- */
    await E('setTab("agents"); ' + 'for(let i=0;i<50&&!AG.loaded;i++) await new Promise(r=>setTimeout(r,100)); return 1;'); await E(APAISER);
    let etat = await E('var cs=[].slice.call(document.querySelectorAll(".ag-carte")); return {n:cs.length, noms:cs.map(c=>c.querySelector("h3").textContent), etats:cs.map(c=>c.getAttribute("data-etat")), cerv:cs.map(c=>c.querySelector(".ag-etat-cv").textContent.slice(0,40)), barre:document.querySelector(".ag-barre b").textContent, bouton:!![].slice.call(document.querySelectorAll(".ag-barre .ag-btn")).filter(b=>/Toute l/.test(b.textContent)).length};');
    v('seize cartes d\'agents (population)', etat.n === 16, etat.n);
    v('toutes à l\'arrêt, barre « 0 allumé sur 16 »', etat.etats.every(e => e === 'arret') && /0 allumé sur 16/.test(etat.barre), etat.barre);
    v('le bouton « Toute l\'équipe au travail » est là', etat.bouton === true);
    console.log('   cerveau : ' + [...new Set(etat.cerv)].join(' | '));
    v('aucun agent « Pas encore branché »', !etat.cerv.some(t => /Pas encore branch/.test(t)), etat.cerv.filter(t => /Pas encore/.test(t)).length);
    await O.cap('agents-avant-' + appareil + '-' + mode);
    // Auto est grisé depuis « arrêt »
    const autoOff = await E('var b=document.querySelectorAll(".ag-carte")[0].querySelector(\'button[data-m="auto"]\'); return b.disabled;');
    v('« Auto » est grisé sur un agent à l\'arrêt', autoOff === true);
    // clic réel sur le bouton
    const pos = await E('var b=[].slice.call(document.querySelectorAll(".ag-barre .ag-btn")).filter(b=>/Toute l/.test(b.textContent))[0]; b.scrollIntoView({block:"center"}); await new Promise(r=>setTimeout(r,200)); var r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,h:r.height};');
    v('le bouton fait ≥ 44 px de haut', pos.h >= 44, pos.h);
    const tap = async (x, y) => { await O.env('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 }); await O.env('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 }); };
    await tap(pos.x, pos.y);
    await E('for(let i=0;i<80;i++){ if(!AG.busy && AG.agents.every(a=>a.mode!=="arret")) break; await new Promise(r=>setTimeout(r,100)); } return 1;'); await dormir(500); await E(APAISER);
    etat = await E('var cs=[].slice.call(document.querySelectorAll(".ag-carte")); return {n:cs.length, etats:cs.map(c=>c.getAttribute("data-etat")), barre:document.querySelector(".ag-barre b").textContent, bouton:!![].slice.call(document.querySelectorAll(".ag-barre .ag-btn")).filter(b=>/Toute l/.test(b.textContent)).length, confirm:window.__confirm, toast:document.getElementById("toast").textContent};');
    v('après le clic : les seize en brouillon, aucun en auto', etat.etats.length === 16 && etat.etats.every(e => e === 'brouillon'), etat.etats);
    v('barre « 16 allumés sur 16 » et le bouton a disparu', /16 allumés sur 16/.test(etat.barre) && !etat.bouton, etat.barre);
    v('une seule confirmation demandée', etat.confirm === 1, etat.confirm);
    console.log('   toast : « ' + etat.toast + ' »');
    await O.cap('agents-apres-' + appareil + '-' + mode);
    const srvEtat = await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/agents', { headers: { Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': '10.7.9.' + Math.floor(Math.random() * 200) } })).json();
    v('le serveur confirme : 16 en brouillon', srvEtat.agents.every(a => a.mode === 'brouillon'));

    /* --- Parler à Camille --- */
    await E('agParler("camille");'); await E('for(let i=0;i<50&&!document.getElementById("ms-ecrit")&&!document.querySelector("textarea");i++) await new Promise(r=>setTimeout(r,100)); return 1;'); await E(APAISER);
    const ouv = await E('return {tab:TAB, fil:MS.fil, ta:!!document.querySelector("textarea"), sel:[].slice.call(document.querySelectorAll("textarea")).map(t=>t.id)};');
    v('« Parler à Camille » ouvre la Messagerie sur son fil', ouv.tab === 'messagerie' && ouv.fil === 'camille' && ouv.ta, ouv);
    await E('window.__nbRep=(document.body.innerText.match(/faux cerveau/g)||[]).length; var t=document.querySelector("textarea"); t.focus(); return t.id;');
    await O.env('Input.insertText', { text: 'Bonjour Camille, tu me reçois ?' });
    await O.env('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await O.env('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await E('for(let i=0;i<150;i++){ if((document.body.innerText.match(/faux cerveau/g)||[]).length>window.__nbRep||/exactement la même chose/.test(document.body.innerText)) break; await new Promise(r=>setTimeout(r,100)); } return 1;'); await E(APAISER);
    const rep = await E('var t=document.body.innerText; return {moi:/Bonjour Camille, tu me re/.test(t), elle:(t.match(/faux cerveau/g)||[]).length>window.__nbRep||/exactement la même chose/.test(t)};');
    v('mon message paraît dans le fil', rep.moi === true, rep); v('la réponse de Camille arrive dans le fil', rep.elle === true, rep);
    await O.cap('parler-camille-' + appareil + '-' + mode);

    /* --- Lot 1 : les pages en lecture --- */
    for (const [tab, motif] of [['accueil', /Accueil/i], ['facturation', /Factur/i], ['incidents', /Incident/i], ['contrats', /Contrat/i], ['rapport', /Rapport/i], ['agents', /Agents/i], ['messagerie', /Messagerie|Équipe/i], ['journal', /Journal/i]]) {
      await E('setTab(' + JSON.stringify(tab) + ');'); await dormir(1800); await E(APAISER);
      const pg = await E('var c=document.getElementById("vue")||document.getElementById("app"); var t=c.innerText; return {len:t.length, ex:t.slice(0,160).replace(/\\n+/g," | "), err:/Erreur JavaScript|undefined|NaN|\\[object/.test(t), x:(function(){var y=scrollY; scrollTo(9999,y); var x=scrollX; scrollTo(0,y); return x;})()};');
      v('« ' + tab + ' » s\'ouvre, du texte (population)', pg.len > 60 && motif.test(pg.ex + document_ok(pg)), pg.ex);
      if (tab === 'incidents') { const tx = await E('return document.getElementById("vue").innerText;'); console.log('   incidents (lecture) : ' + tx.replace(/\n+/g, ' | ').slice(150, 420)); }
      v('« ' + tab + ' » : pas de « undefined/NaN/[object » ni de défilement latéral', pg.err === false && pg.x === 0, pg);
      await O.cap(tab + '-' + appareil + '-' + mode);
    }

    if (appareil === 'bureau') {
      console.log('   — messagerie complète (desktop) —');
      const taper = async txt => { await O.env('Input.insertText', { text: txt }); };
      const touche = async (k, code) => { await O.env('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code, text: k === 'Enter' ? '\r' : undefined }); await O.env('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code }); };
      await E('setTab("messagerie"); await new Promise(r=>setTimeout(r,800)); messChoisir("equipe"); await new Promise(r=>setTimeout(r,800)); document.getElementById("ms-ta").focus(); return 1;');
      await taper('@Cam'); await dormir(300);
      const liste1 = await E('var l=document.getElementById("ms-mentions"); return {visible:!l.hidden, txt:l.innerText};');
      v('« @Cam » ouvre la liste avec Camille', liste1.visible && /Camille/.test(liste1.txt), liste1);
      await touche('Enter', 13); await taper(' et @Hu'); await dormir(300);
      const liste2 = await E('var l=document.getElementById("ms-mentions"); return {visible:!l.hidden, txt:l.innerText};');
      v('« @Hu » propose Hugo', liste2.visible && /Hugo/.test(liste2.txt), liste2);
      await touche('Enter', 13); await taper(' vous me lisez ?');
      const ta = await E('return document.getElementById("ms-ta").value;');
      v('la saisie dit « @Camille et @Hugo vous me lisez ? »', /@Camille.*@Hugo.*vous me lisez/.test(ta), ta);
      await E('window.__nbRep2=(document.getElementById("ms-flux").innerText.match(/faux cerveau/g)||[]).length; return 1;');
      await touche('Enter', 13);
      await E('for(let i=0;i<150;i++){ var t=document.getElementById("ms-flux").innerText; if(/ici Camille/.test(t)&&/ici Hugo/.test(t)) break; await new Promise(r=>setTimeout(r,100)); } return 1;'); await E(APAISER);
      const fl = await E('var t=document.getElementById("ms-flux").innerText; return {moi:/vous me lisez/.test(t), cam:/ici Camille/.test(t), hugo:/ici Hugo/.test(t), autre:/ici (Victor|Léa|Max|Nina|Jules|Margaux)/.test(t)};');
      v('le message paraît dans « Équipe », Camille ET Hugo répondent, personne d\'autre', fl.moi && fl.cam && fl.hugo && !fl.autre, fl);
      await O.cap('equipe-fil-bureau');
      for (const f of ['clients', 'plateforme', 'reunions']) {
        await E('messChoisir(' + JSON.stringify(f) + '); await new Promise(r=>setTimeout(r,1500)); return 1;'); await E(APAISER);
        const o = await E('return {pf:!document.getElementById("ms-pf").hidden, reu:!document.getElementById("ms-reu").hidden, hd:document.getElementById("ms-hd").innerText.replace(/\\n+/g," | "), pfTxt:document.getElementById("ms-pf").innerText.slice(0,300).replace(/\\n+/g," | "), reuTxt:document.getElementById("ms-reu").innerText.slice(0,300).replace(/\\n+/g," | ")};');
        v('fil « ' + f + ' » s\'ouvre (en-tête : ' + o.hd.slice(0, 60) + ')', o.hd.length > 3 && (f !== 'plateforme' || o.pf) && (f !== 'reunions' || o.reu) && (f === 'plateforme' || !o.pf) && (f === 'reunions' || !o.reu), o);
        if (f === 'plateforme') console.log('     panneau Plateforme : ' + o.pfTxt);
        if (f === 'reunions') console.log('     panneau Réunions : ' + o.reuTxt);
        await O.cap('fil-' + f + '-bureau');
      }
      // Direction : la charte
      await E('setTab("agents"); await new Promise(r=>setTimeout(r,800)); agSec("direction"); await new Promise(r=>setTimeout(r,1500)); return 1;'); await E(APAISER);
      const dir = await E('var t=document.getElementById("vue").innerText; var i=t.indexOf("Répondre seul"); return {ok:i>=0, extrait:t.slice(Math.max(0,i-20),i+260).replace(/\\n+/g," | ")};');
      v('Direction montre la charte « Répondre seul » (population)', dir.ok, dir);
      console.log('     ' + dir.extrait);
      await O.cap('direction-bureau');
      // Camille en Auto au vrai clic
      await E('setTab("agents"); await new Promise(r=>setTimeout(r,800)); agSec("equipe"); await new Promise(r=>setTimeout(r,400)); window.__confirm=0; return 1;'); await E(APAISER);
      const posA = await E('var c=[].slice.call(document.querySelectorAll(".ag-carte")).filter(c=>c.querySelector("h3").textContent==="Camille")[0]; var b=c.querySelector(\'button[data-m="auto"]\'); b.scrollIntoView({block:"center"}); await new Promise(r=>setTimeout(r,250)); var r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2,off:b.disabled};');
      v('Camille (brouillon) : le bouton Auto est actif', posA.off === false, posA);
      await tap(posA.x, posA.y); await dormir(1500); await E(APAISER);
      const apA = await E('var c=[].slice.call(document.querySelectorAll(".ag-carte")).filter(c=>c.querySelector("h3").textContent==="Camille")[0]; return {etat:c.getAttribute("data-etat"), conf:window.__confirm, autres:[].slice.call(document.querySelectorAll(".ag-carte")).filter(c=>c.getAttribute("data-etat")==="auto").length};');
      v('un clic sur Auto demande confirmation, puis Camille est en auto — elle seule', apA.etat === 'auto' && apA.conf === 1 && apA.autres === 1, apA);
      const ch2 = await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/agents/charte', { headers: { Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': '10.7.7.1' } })).json();
      v('⛔ la charte « Répondre seul » est restée FERMÉE (passer Camille en Auto ne l\'ouvre pas)', ch2.gestes.find(g => g.id === 'repondre_client').auto === false, ch2.gestes.find(g => g.id === 'repondre_client'));
    }
    function document_ok() { return ''; }
    v('aucune exception JavaScript', O.exceptions.length === 0, O.exceptions.slice(0, 3));
    const appels = await E('return window.__appels.length;'); console.log('   appels API relayés au vrai serveur : ' + appels);
    await O.fermer();
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERREUR ' + (e && e.stack || e)); nettoyer(); process.exit(2); });
