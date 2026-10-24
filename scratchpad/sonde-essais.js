#!/usr/bin/env node
/* ══ SONDE DES PAGES DE TEST — au navigateur, contre un FAUX serveur de test ══════════════════════════════════════════════════════
   Cité par tests/test-2985.js. Ce que le banc ne peut pas voir (il lit du texte et exécute des fonctions seules) : que le lien
   « Se connecter comme client » d'essais.html, suivi du petit script injecté, OUVRE « Mon espace » connecté ; que courriels.html
   AFFICHE un courriel capté avec son lien cliquable ; que l'application de test écrit sous son préfixe (elanT_) et pas ailleurs ;
   et qu'AUCUNE requête ne part vers la production.

     node scratchpad/sonde-essais.js            → fabrique les pages (scripts/essais-build.js) dans un dossier neuf, les sert,
                                                  lance Chromium et rend un bilan ; code 0 si tout est vrai

   Montage — rien ne sort de la machine :
   · un serveur HTTPS en 127.0.0.1 (certificat auto-signé, fabriqué ici) joue le serveur de test : les pages fabriquées, plus
     /api/essais/* et quelques routes du portail, avec des réponses FICTIVES (adresses `exemple-essai.fr`, jeton inventé) ;
   · Chromium résout test.teamop.fr vers ce serveur (`--host-resolver-rules`) : les pages sont donc ouvertes à leur VRAIE adresse
     de test, et toute requête vers une autre adresse de TeamOP (api.teamop.fr, teamop.fr…) échouerait — c'est cela qu'on compte ;
   · `--no-proxy-server` : le proxy du conteneur n'est pas utilisé ; aucune donnée réelle, aucun compte réel.
   ⛔ Bêta/127.0.0.1 uniquement (CLAUDE.md) : ce navigateur n'ouvre QUE l'espace de test fabriqué ici. L'application de test est
   la vraie app.html mais sans aucune donnée, et le réseau vers la production est coupé par la résolution. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), https = require('https'), net = require('net'), http = require('http');
const { spawn, spawnSync } = require('child_process');

const RACINE = path.resolve(__dirname, '..');
const CHROME = process.env.CHROME || '/opt/pw-browsers/chromium';
const CLE = 'c0ffee'.repeat(10) + 'abcd';                 // 64 hexadécimaux, fictive
const HOTE = 'test.teamop.fr';
const dormir = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };

if (!fs.existsSync(CHROME)) { console.log('Chromium introuvable (' + CHROME + ') : la sonde ne peut pas tourner ici.'); process.exit(2); }

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-essais-'));
const PAGES = path.join(TMP, 'pages');
const portLibre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

/* ── 1. les pages, par le VRAI générateur ──────────────────────────────────────────────────────────────────────────────────────── */
{
  const r = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'essais-build.js'), PAGES, 'abcdef1234', 'sonde/essais'],
    { encoding: 'utf8', env: Object.assign({}, process.env, { ESSAIS_CLE: CLE }) });
  vrai('les pages se fabriquent (code 0)', r.status === 0, (r.stderr || '').slice(0, 300));
  if (r.status !== 0) { console.log('════ sonde-essais : ' + ok + ' ✓  ' + ko + ' ✗ ════'); process.exit(1); }
}

/* ── 2. le faux serveur de test ────────────────────────────────────────────────────────────────────────────────────────────────── */
const ACCES = [];                                         // chaque requête reçue : chemin (sans la clé)
const b64u = o => Buffer.from(JSON.stringify(o), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const COMPTES = {
  client: { stockage: { teamop_portail_jeton: 'jeton-client-essai-0123456789' }, page: 'espace.html' },
  prospect: { stockage: { teamop_portail_jeton: 'jeton-prospect-essai-0123456789' }, page: 'espace.html' },
  patron: { stockage: { tour_token: 'jeton-patron-essai', tour_nom: 'Patron Essai', tour_role: 'patron', tour_apps: JSON.stringify(['gestion']) }, page: 'tour.html' },
  collaborateur: { stockage: { tour_token: 'jeton-collab-essai', tour_nom: 'Collaboratrice Essai', tour_role: 'collaborateur', tour_apps: JSON.stringify(['gestion']) }, page: 'tour.html' },
};
const LIEN_COURRIEL = 'https://' + HOTE + '/reinit.html?mode=resetPassword&oobCode=essai123';
const COURRIELS = [{
  de: 'ne-pas-repondre@exemple-essai.fr', a: 'client@exemple-essai.fr', objet: 'Réinitialisation de votre mot de passe', date: '2026-10-23T09:30:00.000Z',
  texte: 'Bonjour,\nCliquez ici pour choisir un nouveau mot de passe : ' + LIEN_COURRIEL,
  html: '<p>Bonjour, <a href="' + LIEN_COURRIEL + '">choisir un mot de passe</a></p>',
  liens: [LIEN_COURRIEL, 'javascript:alert(1)', { href: 'https://' + HOTE + '/connexion.html', texte: 'La connexion' }],
}];
const TYPES = { '.html': 'text/html;charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.txt': 'text/plain' };
function repondre(q, r) {
  const u = new URL(q.url, 'https://' + HOTE);
  ACCES.push(q.method + ' ' + u.pathname);
  const json = (code, o, extra) => { r.writeHead(code, Object.assign({ 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, extra || {})); r.end(JSON.stringify(o)); };
  if (u.pathname === '/health') return json(200, { ok: true });
  if (u.pathname.startsWith('/api/essais/')) {
    if ((q.headers['x-essai-cle'] || u.searchParams.get('cle')) !== CLE) return json(403, { error: 'cle' });   // l'en-tête (les fetch des pages) ou le paramètre (les liens de connexion)
    if (u.pathname === '/api/essais/connexion') {
      const c = COMPTES[u.searchParams.get('compte')];
      if (!c) return json(400, { error: 'compte' });
      r.writeHead(302, { Location: 'https://' + HOTE + '/' + c.page + '#essai=' + b64u(c), 'Cache-Control': 'no-store' }); return r.end();
    }
    if (u.pathname === '/api/essais/courriels') return json(200, COURRIELS);
    if (u.pathname === '/api/essais/remise-a-zero' && q.method === 'POST') return json(200, { ok: true });
    return json(404, { error: 'absent' });
  }
  if (u.pathname === '/api/compte/moi') {
    const m = /Bearer jeton-(client|prospect)-essai/.exec(q.headers.authorization || '');
    return m ? json(200, { compte: { email: m[1] + '@exemple-essai.fr', verifie: true } }) : json(401, { error: 'session' });
  }
  /* la Tour, une fois entrée, interroge /api/monitor/* : le faux serveur lui répond « rien » plutôt que de la déconnecter */
  if (u.pathname.startsWith('/api/monitor/') && /Bearer jeton-(patron|collab)-essai/.test(q.headers.authorization || '')) return json(200, {});
  if (u.pathname === '/api/portail/moi') return json(200, { dossier: null });
  if (u.pathname.startsWith('/api/') || u.pathname === '/e/essai') return json(404, { error: 'absent' });
  const f = path.join(PAGES, decodeURIComponent(u.pathname === '/' ? '/index.html' : u.pathname));
  if (!f.startsWith(PAGES + path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { r.writeHead(404, { 'Content-Type': 'text/plain' }); return r.end('absent'); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); fs.createReadStream(f).pipe(r);
}

/* ── 3. un petit client CDP ────────────────────────────────────────────────────────────────────────────────────────────────────── */
function cdp(ws) {
  let id = 0; const att = new Map(), ecout = [];
  ws.addEventListener('message', ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; }
    if (m.id && att.has(m.id)) { const a = att.get(m.id); att.delete(m.id); m.error ? a.rej(new Error(m.error.message)) : a.res(m.result); }
    else if (m.method) ecout.forEach(f => { try { f(m); } catch (e) { /* un écouteur ne casse pas la sonde */ } }); });
  return { env(me, pa) { const i = ++id; return new Promise((res, rej) => { att.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method: me, params: pa || {} })); }); }, sur(f) { ecout.push(f); } };
}

(async () => {
  /* certificat auto-signé pour test.teamop.fr */
  const cle = path.join(TMP, 'k.pem'), cert = path.join(TMP, 'c.pem');
  const o = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', cle, '-out', cert, '-days', '2', '-subj', '/CN=' + HOTE, '-addext', 'subjectAltName=DNS:' + HOTE], { encoding: 'utf8' });
  if (o.status !== 0) { console.log('openssl a échoué : ' + (o.stderr || '').slice(0, 200)); process.exit(2); }
  const serveur = https.createServer({ key: fs.readFileSync(cle), cert: fs.readFileSync(cert) }, repondre);
  const pS = await portLibre(); await new Promise(r => serveur.listen(pS, '127.0.0.1', r));
  const pC = await portLibre();
  const chrome = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--no-proxy-server', '--ignore-certificate-errors',
    '--host-resolver-rules=MAP ' + HOTE + ' 127.0.0.1:' + pS + ', MAP * ~NOTFOUND , EXCLUDE 127.0.0.1', '--remote-debugging-port=' + pC, '--user-data-dir=' + path.join(TMP, 'profil'), '--window-size=900,900', 'about:blank'],
    { stdio: 'ignore' });
  const fin = async (code) => { try { chrome.kill('SIGKILL'); } catch (e) { /* idem */ } try { serveur.close(); } catch (e) { /* idem */ }
    try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) { /* idem */ }
    console.log('\n════ sonde-essais : ' + ok + ' ✓  ' + ko + ' ✗ ════'); process.exit(code); };
  let cible = null;
  for (let i = 0; i < 60 && !cible; i++) { await dormir(250);
    try { cible = await new Promise((res, rej) => { const rq = http.request({ host: '127.0.0.1', port: pC, path: '/json/new?about:blank', method: 'PUT' }, rs => { let d = ''; rs.on('data', c => d += c); rs.on('end', () => { try { res(JSON.parse(d)); } catch (e) { rej(e); } }); }); rq.on('error', rej); rq.end(); }); } catch (e) { /* le navigateur démarre */ } }
  if (!cible) { vrai('Chromium démarre', false); return fin(1); }
  const ws = new WebSocket(cible.webSocketDebuggerUrl); await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
  const C = cdp(ws);
  const REQ = [];                                          // toutes les adresses demandées par les pages
  C.sur(m => { if (m.method === 'Network.requestWillBeSent') REQ.push(m.params.request.url); });
  const ERR = []; C.sur(m => { if (m.method === 'Runtime.exceptionThrown') ERR.push((m.params.exceptionDetails.exception && m.params.exceptionDetails.exception.description || m.params.exceptionDetails.text || '').slice(0, 200)); });
  await C.env('Network.enable'); await C.env('Page.enable'); await C.env('Runtime.enable');
  const ev = async (expr) => { const r = await C.env('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); return r.result && r.result.value; };
  const attendre = async (expr, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 15000)) { try { if (await ev(expr)) return true; } catch (e) { /* la page se recharge */ } await dormir(150); } return false; };
  const aller = async (url) => { await C.env('Page.navigate', { url }); await dormir(300); };

  /* ── A. l'accueil des essais ─────────────────────────────────────────────────────────────────────────────────────────────── */
  console.log('\nA. essais.html');
  await aller('https://' + HOTE + '/essais.html');
  vrai('la page s\'ouvre et dit « Espace de test »', await attendre("document.querySelector('h1') && /Espace de test/.test(document.querySelector('h1').textContent)"));
  vrai('le serveur de test « répond » (vérifié par /health)', await attendre("document.getElementById('etat-serveur').textContent==='répond'"));
  vrai('le bandeau « ESPACE DE TEST » porte la branche et le commit', await ev("(document.getElementById('essai-bandeau')||{}).textContent") === 'ESPACE DE TEST — sonde/essais · abcdef1');
  vrai('le bandeau ne capte aucun clic (pointer-events:none) et ne couvre pas le bouton « courriels »',
    await ev("(function(){var b=document.getElementById('essai-bandeau'),l=document.getElementById('lien-courriels');var r=l.getBoundingClientRect();return getComputedStyle(b).pointerEvents==='none'&&document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)===l;})()"));
  const etapes = await ev("document.querySelectorAll('ol.etapes > li').length");
  vrai('(population) le parcours de base compte ses 6 étapes, chacune avec « ce que tu dois voir »', etapes === 6 && await ev("document.querySelectorAll('ol.etapes > li p.doux').length") === 6, etapes);

  /* ── B. « Se connecter comme client » → Mon espace connecté ──────────────────────────────────────────────────────────────── */
  console.log('\nB. le lien « Se connecter comme client »');
  const avantAcces = ACCES.length;
  await ev("document.getElementById('lien-client').click()");
  vrai('Mon espace s\'ouvre CONNECTÉ : l\'adresse du client est affichée en haut', await attendre("(function(){var e=document.getElementById('u-email');return !!e&&!e.classList.contains('hide')&&e.textContent.indexOf('client@exemple-essai.fr')>=0;})()", 20000));
  vrai('… le bouton de déconnexion est visible', await ev("!document.getElementById('btn-logout').classList.contains('hide')"));
  vrai('… et l\'écran de connexion (« Se connecter » / « Créer un compte ») n\'est PAS là', await ev("!document.getElementById('tab-login')"));
  vrai('le jeton est rangé là où la vraie page le lit (localStorage teamop_portail_jeton)', await ev("localStorage.getItem('teamop_portail_jeton')") === 'jeton-client-essai-0123456789');
  vrai('le fragment #essai= est effacé de l\'adresse (le jeton ne reste pas dans l\'historique)', await ev("location.hash===''") && await ev("location.pathname")  === '/espace.html', await ev('location.href'));
  vrai('le chemin est exactement : essais → /api/essais/connexion → espace.html → /api/compte/moi', ACCES.slice(avantAcces).some(a => a === 'GET /api/essais/connexion') && ACCES.slice(avantAcces).some(a => a === 'GET /api/compte/moi'), ACCES.slice(avantAcces));
  vrai('le bandeau est aussi sur Mon espace', await ev("!!document.getElementById('essai-bandeau')"));
  vrai('le titre dit « [TEST] »', /^\[TEST\]/.test(await ev('document.title')), await ev('document.title'));

  /* ── C. les autres comptes : le stockage est posé, la page voulue s'ouvre ───────────────────────────────────────────────── */
  console.log('\nC. prospect, patron, collaborateur');
  await aller('https://' + HOTE + '/api/essais/connexion?compte=prospect&cle=' + CLE);
  vrai('prospect : on arrive sur espace.html avec son jeton', await attendre("location.pathname==='/espace.html' && localStorage.getItem('teamop_portail_jeton')==='jeton-prospect-essai-0123456789' && location.hash===''"), await ev('location.href'));
  await aller('https://' + HOTE + '/api/essais/connexion?compte=patron&cle=' + CLE);
  vrai('patron : on arrive sur la Tour avec le jeton, le nom et le rôle', await attendre("location.pathname==='/tour.html' && localStorage.getItem('tour_token')==='jeton-patron-essai' && localStorage.getItem('tour_role')==='patron' && location.hash.indexOf('essai')<0"), await ev('location.href'));
  vrai('… et la Tour est OUVERTE : l\'écran de connexion est masqué, le nom et le rôle sont affichés', await attendre("document.getElementById('app').classList.contains('on') && document.getElementById('login').style.display==='none' && document.getElementById('h-nom').textContent==='Patron Essai' && /patron/.test(document.getElementById('h-role').textContent)"));
  await aller('https://' + HOTE + '/api/essais/connexion?compte=collaborateur&cle=' + CLE);
  vrai('collaborateur : la Tour s\'ouvre avec le rôle « collaborateur »', await attendre("location.pathname==='/tour.html' && localStorage.getItem('tour_role')==='collaborateur' && document.getElementById('app').classList.contains('on') && /collaborateur/.test(document.getElementById('h-role').textContent)"), await ev('location.href'));
  await aller('https://' + HOTE + '/api/essais/connexion?compte=inconnu&cle=' + CLE);
  vrai('un compte inconnu ne range rien (le serveur refuse, aucune redirection)', await ev("location.pathname.indexOf('/api/essais/connexion')===0"), await ev('location.href'));
  /* un fragment forgé : ni clé étrangère, ni redirection hors du site */
  const forge = { stockage: { 'elanT_gestion_v2': '{"forge":1}', 'top_monitor_off': '1', 'teamop_app': 'app.html' }, page: '//exemple-essai.fr/x' };
  await aller('https://' + HOTE + '/mentions-legales.html#essai=' + b64u(forge));
  vrai('un fragment forgé : la clé de la liste est rangée, la base de l\'application et les autres clés refusées, et la page reste sur le site',
    await attendre("localStorage.getItem('teamop_app')==='app.html' && location.hostname==='" + HOTE + "' && location.hash===''") && await ev("localStorage.getItem('elanT_gestion_v2')") === null && await ev("localStorage.getItem('top_monitor_off')") === null, await ev('location.href'));
  await ev("localStorage.removeItem('teamop_app')");   // la sonde range derrière elle : l'application ouverte plus bas ne doit voir que ses propres clés

  /* ── D. courriels.html ───────────────────────────────────────────────────────────────────────────────────────────────────── */
  console.log('\nD. courriels.html');
  await aller('https://' + HOTE + '/courriels.html');
  vrai('le courriel capté est listé (objet, destinataire)', await attendre("document.body.textContent.indexOf('Réinitialisation de votre mot de passe')>=0 && document.body.textContent.indexOf('client@exemple-essai.fr')>=0"));
  vrai('le compteur dit « 1 courriel »', await ev("document.getElementById('compte').textContent")  === '1 courriel');
  const hrefs = await ev("Array.prototype.map.call(document.querySelectorAll('.liens a'),function(a){return a.getAttribute('href');})");
  vrai('son lien est CLIQUABLE (une ancre vers reinit.html)', Array.isArray(hrefs) && hrefs.indexOf(LIEN_COURRIEL) >= 0, hrefs);
  vrai('un lien « javascript: » n\'est PAS rendu cliquable', Array.isArray(hrefs) && !hrefs.some(h => /^javascript:/i.test(h)), hrefs);
  vrai('(population) le lien à objet/texte (connexion.html) est rendu aussi', Array.isArray(hrefs) && hrefs.indexOf('https://' + HOTE + '/connexion.html') >= 0, hrefs);
  vrai('le courriel « tel que le client le voit » est dans un cadre isolé (sandbox vide)', await ev("(function(){var f=document.querySelector('iframe');return !!f&&f.getAttribute('sandbox')==='';})()"));
  await ev("document.querySelector('.liens a').click()");   // ouvre dans un nouvel onglet : on vérifie la cible plutôt que la navigation
  vrai('l\'ancre s\'ouvre dans un autre onglet sans donner la main à la page (noopener)', await ev("(function(){var a=document.querySelector('.liens a');return a.target==='_blank'&&/noopener/.test(a.rel);})()"));
  await aller(LIEN_COURRIEL);
  vrai('suivre ce lien ouvre reinit.html DE L\'ESPACE DE TEST, bandeau compris', await attendre("location.pathname==='/reinit.html' && !!document.getElementById('essai-bandeau')"), await ev('location.href'));

  /* ── E. la remise à zéro ─────────────────────────────────────────────────────────────────────────────────────────────────── */
  console.log('\nE. remise à zéro');
  await aller('https://' + HOTE + '/essais.html');
  await attendre("!!document.getElementById('remise')");
  const nAvantRemise = ACCES.length;
  await ev("window.confirm=function(){return true;}; document.getElementById('remise').click();");
  vrai('la remise à zéro appelle POST /api/essais/remise-a-zero, ATTEND le serveur (ici il ne tombe jamais : 8 s, puis la porte « client » redirige) et dit « C\'est fait » seulement après', await attendre("document.getElementById('remise-msg').textContent.indexOf('remis à zéro')>=0 && document.getElementById('remise-msg').textContent.indexOf('fait')>=0", 40000), await ev("document.getElementById('remise-msg').textContent"));
  vrai('(…) la page a bien sondé la porte « client » AVANT de dire que c\'est fait (au navigateur, avec redirect:manual)', ACCES.slice(nAvantRemise).indexOf('GET /api/essais/connexion') >= 0 && ACCES.slice(nAvantRemise).filter(x => x === 'GET /health').length >= 6);
  vrai('(…) la requête est bien un POST avec la clé', ACCES.indexOf('POST /api/essais/remise-a-zero') >= 0);

  /* ── F. l'application de test : un stockage à part, jamais la production ───────────────────────────────────────────────────── */
  console.log('\nF. app.html de test');
  await aller('https://' + HOTE + '/app.html');
  vrai('l\'application charge (le titre et le bandeau)', await attendre("/^\\[TEST\\]/.test(document.title) && !!document.getElementById('essai-bandeau')", 45000), await ev('document.title'));
  await dormir(3000);
  const cles = JSON.parse(await ev("JSON.stringify(Object.keys(localStorage).concat(Object.keys(sessionStorage)))"));
  const etrangeres = cles.filter(k => !/^(elanT_|opT_|teamop_|top_monitor|essai_|tour_)/.test(k));
  vrai('(population) l\'application a écrit au moins une clé sous son préfixe elanT_', cles.some(k => /^elanT_/.test(k)), cles);
  vrai('AUCUNE clé « elan_ » ni « elanB_ » (la base des vraies entreprises, de la bêta)', !cles.some(k => /^elan(B)?_/.test(k)), cles.filter(k => /^elan(B)?_/.test(k)));
  vrai('aucune clé hors des préfixes connus', etrangeres.length === 0, etrangeres);
  vrai('la version affichée est celle de l\'essai (« -essai »)', /-essai$/.test(await ev('String(APP_VERSION)')), await ev('String(APP_VERSION)'));
  vrai('la synchro d\'équipe de l\'essai vise son propre espace (FB_TEAM)', await ev('FB_TEAM') === 'opgestion-test');
  vrai('aucun service worker n\'est inscrit', await ev("navigator.serviceWorker.getRegistrations().then(function(r){return r.length;})") === 0);
  vrai('la bêta n\'est pas armée (BETA_ESSAI faux : on essaie la vraie application)', await ev('BETA_ESSAI') === false);

  /* ── G. aucune requête vers la production, sur tout le parcours ────────────────────────────────────────────────────────────── */
  console.log('\nG. le réseau de tout le parcours');
  const hotes = Array.from(new Set(REQ.filter(u => /^https?:/.test(u)).map(u => new URL(u).hostname)));
  vrai('(population) des requêtes ont bien été observées (' + REQ.length + ')', REQ.length > 20, REQ.length);
  vrai('⛔ AUCUNE requête vers api.teamop.fr', !hotes.includes('api.teamop.fr'), hotes);
  vrai('⛔ AUCUNE requête vers teamop.fr / www.teamop.fr / les services -beta', !hotes.some(h => /(^|\.)teamop\.fr$/.test(h) && h !== HOTE), hotes);
  vrai('les seuls hôtes de TeamOP joints sont ceux de l\'essai (' + HOTE + ')', hotes.filter(h => /teamop\.fr$/.test(h)).every(h => h === HOTE), hotes);
  vrai('aucune exception JavaScript non rattrapée sur les pages de l\'essai (hors app.html sans serveur)', ERR.filter(e => !/app\.html/.test(e)).length === 0, ERR.slice(0, 3));
  console.log('   hôtes vus : ' + hotes.join(', '));
  await fin(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (x) { /* idem */ } process.exit(1); });
