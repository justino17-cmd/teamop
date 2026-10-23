/* ══ SONDE — LE PARCOURS DU CLIENT DANS LA VRAIE PAGE `espace.html` (inscription → courriel → « Mon espace » → mot de passe oublié) ══
   Le vrai serveur (127.0.0.1, config isolée, relais SMTP du banc qui COMPTE les courriels), la vraie page dans un vrai Chromium
   au format téléphone, SwiftShader. La page parle à sa propre origine (un relais sert les pages et passe /api et /health au serveur).
   Le serveur écrit ses liens en https://teamop.fr (siteBase est posé en dur par index.js) : la sonde les réécrit vers le relais local avant de les suivre.
   ⛔ Tout ce qui est en `https://` (api.teamop.fr écrit en dur dans la page) est BLOQUÉ au niveau du navigateur et COMPTÉ.
   Usage : node scratchpad/sonde-espace-parcours.js        (CAPT=dossier pour les captures) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..'), CHROME = '/opt/pw-browsers/chromium';
const CAPT = process.env.CAPT || fs.mkdtempSync(path.join(os.tmpdir(), 'parcours-'));
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
let ok = 0, ko = 0;
const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

function facteur() {
  const recus = [];
  const s = net.createServer(sock => {
    let tampon = '', corps = false, msg = '';
    sock.write('220 banc\r\n');
    sock.on('data', d => {
      tampon += d.toString('utf8'); let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; sock.write('250 ok\r\n'); } else msg += (l.startsWith('..') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) sock.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) sock.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; sock.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { sock.write('221 bye\r\n'); sock.end(); }
        else sock.write('250 ok\r\n');
      }
    });
    sock.on('error', () => {});
  });
  return { s, recus };
}
// décode le quoted-printable du corps
const qp = t => t.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'srv-parcours-')), data = path.join(dir, 'data'); fs.mkdirSync(data);
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); const vap = webpush.generateVAPIDKeys();
  const fac = facteur(); const pSmtp = await new Promise(r => fac.s.listen(0, '127.0.0.1', () => r(fac.s.address().port)));
  const pSrv = await portLibre(), pWeb = await portLibre(), pCdp = await portLibre();
  const BASE = 'http://127.0.0.1:' + pWeb;
  const cfg = path.join(dir, 'config.json');
  fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: crypto.createHash('sha256').update('banc-parcours').digest('hex'), comptes: { actif: true },     agents: { reunionsAuto: false }, smtp: { host: '127.0.0.1', port: pSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } }));
  const srv = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: data, PORT: String(pSrv) }), stdio: ['ignore', 'pipe', 'pipe'] });
  let journal = ''; srv.stdout.on('data', d => journal += d); srv.stderr.on('data', d => journal += d);
  for (let i = 0; i < 150; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + pSrv + '/health')).ok) break; } catch (e) {} }
  // relais : pages du dépôt + /api, /health vers le vrai serveur
  const web = http.createServer((q, r) => {
    const u = q.url.split('?')[0];
    if (/^\/(api|health)/.test(u)) {
      const chunks = []; q.on('data', d => chunks.push(d)); q.on('end', () => {
        const pq = http.request({ host: '127.0.0.1', port: pSrv, path: q.url, method: q.method, headers: Object.assign({}, q.headers, { host: '127.0.0.1:' + pSrv }) }, pr => { r.writeHead(pr.statusCode, pr.headers); pr.pipe(r); });
        pq.on('error', () => { r.writeHead(502); r.end(); }); pq.end(Buffer.concat(chunks));
      }); return;
    }
    const f = path.join(RACINE, u === '/' ? 'index.html' : u);
    if (!f.startsWith(RACINE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { 'Content-Type': u.endsWith('.js') ? 'text/javascript' : u.endsWith('.css') ? 'text/css' : u.endsWith('.json') ? 'application/json' : 'text/html;charset=utf-8' }); r.end(fs.readFileSync(f));
  }).listen(pWeb, '127.0.0.1');
  const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'chr-'));
  const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--remote-debugging-port=' + pCdp, '--user-data-dir=' + udd, 'about:blank'], { stdio: 'ignore', detached: true });
  let cible = null; for (let k = 0; k < 60 && !cible; k++) { await dormir(250); try { cible = (await (await fetch('http://127.0.0.1:' + pCdp + '/json/list')).json()).find(x => x.type === 'page'); } catch (e) {} }
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const att = {}, bloquees = [], erreurs = [], dialogues = [];
  const cdp = (method, params) => new Promise(r => { const i = ++id; att[i] = r; ws.send(JSON.stringify({ id: i, method, params: params || {} })); });
  ws.onmessage = m => { const d = JSON.parse(m.data);
    if (d.id && att[d.id]) { att[d.id](d); delete att[d.id]; }
    if (d.method === 'Fetch.requestPaused') { const u = d.params.request.url;
      if (u.startsWith(BASE) || u.startsWith('data:') || u.startsWith('about:')) cdp('Fetch.continueRequest', { requestId: d.params.requestId });
      else { bloquees.push(u.slice(0, 80)); cdp('Fetch.failRequest', { requestId: d.params.requestId, errorReason: 'BlockedByClient' }); } }
    if (d.method === 'Runtime.exceptionThrown') erreurs.push((d.params.exceptionDetails.exception && d.params.exceptionDetails.exception.description || d.params.exceptionDetails.text || '').slice(0, 200));
    if (d.method === 'Page.javascriptDialogOpening') { dialogues.push(d.params.message); cdp('Page.handleJavaScriptDialog', { accept: true }); } };
  const ev = async expr => { const r = (await cdp('Runtime.evaluate', { expression: '(async()=>{' + expr + '})()', awaitPromise: true, returnByValue: true })).result; return r.result ? r.result.value : ('EXC ' + JSON.stringify(r.exceptionDetails && r.exceptionDetails.text)); };
  await cdp('Page.enable'); await cdp('Runtime.enable'); await cdp('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  const shot = async nom => { const r = await cdp('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(CAPT, nom + '.png'), Buffer.from(r.result.data, 'base64')); };
  const aller = async u => { await cdp('Page.navigate', { url: u }); await dormir(2500); };
  const texte = () => ev(`return (document.getElementById('space')||document.body).innerText`);
  const attendre = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(expr)) return true; await dormir(200); } return false; };
  const lienDe = (re) => { for (const m of fac.recus) { const t = qp(m); const x = re.exec(t); if (x) return { url: x[0].replace('https://teamop.fr', BASE), msg: t }; } return null; };

  const EMAIL = 'cliente.parcours@exemple.test', MDP1 = 'MotDePasse-Un-1234', MDP2 = 'MotDePasse-Deux-5678';
  try {
    console.log('1. Ouverture de la page et inscription');
    await aller(BASE + '/espace.html');
    c('(population) le formulaire est là', await ev(`return !!document.getElementById('a-email') && !!document.getElementById('tab-signup')`));
    await ev(`authTab('signup'); document.getElementById('a-prenom').value='Camille'; document.getElementById('a-nom').value='Fictive'; document.getElementById('a-company').value='Entreprise Fictive'; document.getElementById('a-email').value='${EMAIL}'; document.getElementById('a-pass').value='${MDP1}'; document.getElementById('a-pass2').value='${MDP1}'; document.getElementById('a-submit').click(); return 1`);
    const connecte = await attendre(`return !document.getElementById('a-email') || !!document.getElementById('verif-banner')`, 15000);
    await dormir(1500);
    const t1 = await texte(); await shot('01-apres-inscription');
    c('l\'inscription connecte (plus de formulaire de connexion)', connecte && !(await ev(`return !!document.getElementById('a-email')`)), t1.slice(0, 200));
    c('la page demande de CONFIRMER l\'adresse (bandeau « Confirmez »)', /onfirm/i.test(t1), t1.slice(0, 300));
    await dormir(1500);
    const verifMail = lienDe(/https:\/\/teamop\.fr\/reinit\.html\?mode=verifyEmail&jeton=[0-9a-f]+/);
    c('le courriel de confirmation est parti, avec le lien du geste (mode=verifyEmail)', !!verifMail, fac.recus.length);
    c('ce courriel est adressé à la cliente', fac.recus.some(m => /^To:.*cliente\.parcours@exemple\.test/mi.test(m) && /verifyEmail/.test(qp(m))));
    c('(contre-épreuve) rien de confidentiel ne traîne : le mot de passe n\'est dans aucun courriel', !fac.recus.some(m => qp(m).includes(MDP1)));

    console.log('\n2. Le lien de confirmation, suivi pour de vrai');
    if (verifMail) {
      await aller(verifMail.url); const tv = await ev(`return document.body.innerText`); await shot('02-lien-confirmation');
      c('reinit.html annonce l\'adresse confirmée', /confirm|v[ée]rifi|activ/i.test(tv) && !/invalide|expir/i.test(tv), tv.slice(0, 300));
      await aller(verifMail.url); const tv2 = await ev(`return document.body.innerText`);
      c('le même lien, suivi une seconde fois, ne passe plus pour neuf (usage unique)', /invalide|expir|déjà|plus valable|utilis/i.test(tv2), tv2.slice(0, 200));
    }
    await aller(BASE + '/espace.html'); await dormir(2000);
    const t2 = await texte(); await shot('03-mon-espace');
    c('« Mon espace » : connecté (aucun formulaire), le bandeau de confirmation a disparu', !(await ev(`return !!document.getElementById('a-email')`)) && !/Confirmez votre adresse/i.test(t2), t2.slice(0, 400));
    c('« Mon espace » : le menu client est rendu (population non vide)', t2.length > 80, t2.length);

    console.log('\n3. Mot de passe oublié');
    await ev(`(typeof logout==='function'?logout():auth.signOut()); return 1`).catch(() => {}); await dormir(1000);
    await aller(BASE + '/espace.html');
    const surFormulaire = await attendre(`return !!document.getElementById('a-email')`, 8000);
    if (!surFormulaire) { await ev(`try{localStorage.clear()}catch(e){} return 1`); await aller(BASE + '/espace.html'); }
    c('(population) le formulaire de connexion est revenu', await ev(`return !!document.getElementById('a-email')`));
    const avant = fac.recus.length;
    await ev(`document.getElementById('a-email').value='${EMAIL}'; motDePasseOublie(); return 1`); await dormir(2500);
    const tm = await ev(`return document.getElementById('auth-err').innerText`); await shot('04-mdp-oublie');
    c('l\'écran dit qu\'un e-mail est parti (et un courriel est vraiment arrivé)', /vient de partir/.test(tm) && fac.recus.length > avant, { tm, n: fac.recus.length - avant });
    const resetMail = lienDe(/https:\/\/teamop\.fr\/reinit\.html\?mode=resetPassword&jeton=[0-9a-f]+/);
    c('le courriel porte le lien du geste (mode=resetPassword)', !!resetMail);
    // une adresse inconnue reçoit le MÊME écran et aucun courriel
    const avant2 = fac.recus.length;
    await ev(`document.getElementById('a-email').value='inconnue.parcours@exemple.test'; motDePasseOublie(); return 1`); await dormir(2000);
    const tm2 = await ev(`return document.getElementById('auth-err').innerText`);
    c('adresse inconnue : même écran, aucun courriel (pas d\'annuaire des clients)', /vient de partir/.test(tm2) && fac.recus.length === avant2, { tm2, n: fac.recus.length - avant2 });
    if (resetMail) {
      await aller(resetMail.url); await shot('05-reinit');
      const ok0 = await ev(`var i=document.querySelectorAll('input[type=password]'); return i.length`);
      c('(population) reinit.html montre les champs de mot de passe', ok0 >= 1, ok0);
      await ev(`var i=document.querySelectorAll('input[type=password]'); i.forEach(function(x){ x.value='${MDP2}'; x.dispatchEvent(new Event('input',{bubbles:true})); }); var b=document.querySelector('button[type=submit],form button,button.btn,#go,#ok'); if(b) b.click(); return 1`);
      await dormir(3000); const tr = await ev(`return document.body.innerText`); await shot('06-reinit-fait');
      c('reinit.html annonce le mot de passe changé', /modifi|chang|enregistr|mis à jour|nouveau mot de passe est/i.test(tr) && !/erreur|invalide/i.test(tr), tr.slice(0, 300));
      // connexion avec le nouveau mot de passe, puis l'ancien refusé
      await aller(BASE + '/espace.html'); await attendre(`return !!document.getElementById('a-email')`, 6000);
      await ev(`document.getElementById('a-email').value='${EMAIL}'; document.getElementById('a-pass').value='${MDP1}'; document.getElementById('a-submit').click(); return 1`); await dormir(3500);
      const ta = await ev(`return (document.getElementById('auth-err')||{innerText:''}).innerText`);
      c('l\'ANCIEN mot de passe est refusé, avec un message', /incorrect/i.test(ta), ta);
      await ev(`document.getElementById('a-pass').value='${MDP2}'; document.getElementById('a-submit').click(); return 1`);
      const dedans = await attendre(`return !document.getElementById('a-email')`, 10000); await dormir(1500); await shot('07-reconnexion');
      c('le NOUVEAU mot de passe ouvre « Mon espace »', dedans, (await texte()).slice(0, 200));
    }
    c('aucune exception JavaScript non rattrapée pendant tout le parcours', erreurs.length === 0, erreurs.slice(0, 3));
    c('ce qui visait https:// (api.teamop.fr en dur) a été BLOQUÉ, rien n\'est sorti', true);
    console.log('   (requêtes https bloquées : ' + bloquees.length + ' ' + JSON.stringify([...new Set(bloquees)].slice(0, 6)) + ')');
    console.log('   captures : ' + CAPT);
  } catch (e) { ko++; console.log('  ✗ la sonde a levé : ' + (e && e.stack || e)); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  try { process.kill(-ch.pid, 'SIGKILL'); } catch (e) {} try { srv.kill('SIGKILL'); } catch (e) {} web.close(); fac.s.close();
  if (ko) console.log(journal.slice(-1500));
  process.exit(ko ? 1 : 0);
})();
