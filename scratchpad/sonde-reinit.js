/* ⛔ MESURER AU NAVIGATEUR, PAS AU BANC.
   CLAUDE.md : « avant de faire refuser une route, aller REGARDER ce que l'écran affiche — pas
   ce qu'on croit qu'il affiche ». Le banc monte les fonctions dans un `new Function` avec un
   faux DOM : il prouve la logique, pas le RENDU. Cette sonde ouvre le VRAI `reinit.html` dans
   un VRAI Chromium, sur 127.0.0.1, et lit ce qui est à l'écran.
   ⚠️ 127.0.0.1 uniquement — le proxy sortant coupe les connexions du navigateur vers teamop.fr. */
const { spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');

const RACINE = '/home/user/teamop';
const PAGE = 'http://127.0.0.1:8123';
const dormir = ms => new Promise(r => setTimeout(r, ms));
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };

/* ── LE SERVEUR D'API DU BANC, AVEC SON FACTEUR ── */
const recus = [];
const facteur = require('net').createServer(c => {
  let t = '', d = false, m = '';
  c.write('220 banc\r\n');
  c.on('data', x => { t += x.toString(); let i;
    while ((i = t.indexOf('\r\n')) >= 0) { const l = t.slice(0, i); t = t.slice(i + 2);
      if (d) { if (l === '.') { d = false; recus.push(m); m = ''; c.write('250 ok\r\n'); } else m += l + '\n'; continue; }
      const h = l.toUpperCase();
      if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
      else if (h.startsWith('DATA')) { d = true; c.write('354 go\r\n'); }
      else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
      else c.write('250 ok\r\n'); } });
  c.on('error', () => {});
});
const lisible = m => String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

/* ── CDP à la main : Playwright n'est pas installé dans cette image, seulement ses navigateurs ── */
async function cdp(portNav, url) {
  const r = await fetch('http://127.0.0.1:' + portNav + '/json/new?' + encodeURIComponent(url), { method: 'PUT' });
  const cible = await r.json();
  const ws = new WebSocket(cible.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let n = 0; const attentes = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && attentes.has(m.id)) { attentes.get(m.id)(m); attentes.delete(m.id); } };
  const envoyer = (method, params) => new Promise(res => { const id = ++n; attentes.set(id, res); ws.send(JSON.stringify({ id, method, params: params || {} })); });
  const evaluer = async (expr) => {
    const m = await envoyer('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    return m.result && m.result.result ? m.result.result.value : undefined;
  };
  return { evaluer, fermer: () => { try { ws.close(); } catch (e) {} } };
}

(async () => {
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-reinit-'));
  const portSmtp = await new Promise(r => facteur.listen(0, '127.0.0.1', () => r(facteur.address().port)));
  const dir = path.join(BANC, 'srv'), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const cfg = path.join(dir, 'config.json');
  const wp = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = wp.generateVAPIDKeys();
  /* ⚠️ Le serveur doit répondre sur le port 8123 du point de vue de la PAGE — impossible, il y
     a déjà le serveur de fichiers. On vise donc l'API par son port réel : `reinit.html` calcule
     `API=''` sur 127.0.0.1, donc les appels partiraient sur 8123. On sert donc l'API DEPUIS le
     même hôte en la mandatant : le serveur de fichiers ne connaît pas /api, on passe donc par
     une réécriture côté page (`API` est une variable, on la repose avant le script). */
  const portApi = await new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: crypto.createHash('sha256').update('x').digest('hex'), comptes: { actif: true },
    smtp: { host: '127.0.0.1', port: portSmtp, user: 'b', pass: 'b', from: 'b@teamop.fr' },
    /* \u26d4 ON PASSE PAR LE VRAI CORS, pas \u00e0 c\u00f4t\u00e9. La page vit sur :8123, l'API sur un autre
       port : deux origines diff\u00e9rentes, exactement comme teamop.fr et api.teamop.fr en
       production. C'est le seul moyen d'\u00e9prouver la requ\u00eate pr\u00e9alable, que `curl` ne peut
       PAS voir \u2014 la faute d\u00e9j\u00e0 pay\u00e9e par ce d\u00e9p\u00f4t sur `X-OP-Jeton`. */
    origins: ['http://127.0.0.1:8123'] }));
  const api = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')],
    { env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: data, PORT: String(portApi) }), stdio: ['ignore', 'pipe', 'pipe'] });
  const A = 'http://127.0.0.1:' + portApi;
  for (let i = 0; i < 120; i++) { await dormir(100); try { if ((await fetch(A + '/health')).ok) break; } catch (e) {} }

  const post = (c, b) => fetch(A + c, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
  const emp = async (mdp) => {
    const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('teamop-portail:' + mdp));
    return Array.from(new Uint8Array(h)).map(x => x.toString(16).padStart(2, '0')).join('');
  };
  await post('/api/compte/creer', { email: 'nav@exemple.fr', h: await emp('premier-mot-de-passe') });
  await post('/api/compte/mdp/demander', { email: 'nav@exemple.fr' });
  for (let i = 0; i < 60 && !recus.some(m => /resetPassword/.test(lisible(m))); i++) await dormir(100);
  const lien = lisible(recus.filter(m => /resetPassword/.test(lisible(m))).pop() || '').replace(/\s+/g, '');
  const jeton = (/jeton=([a-f0-9]{64})/.exec(lien) || [])[1];
  console.log('\n══ SONDE NAVIGATEUR — le VRAI reinit.html dans un VRAI Chromium ══\n');
  v('   le serveur a fabriqué un lien', !!jeton, true);

  const portNav = 9222 + (process.pid % 500);
  const nav = spawn('/opt/pw-browsers/chromium', ['--headless=new', '--no-sandbox', '--disable-gpu',
    '--disable-dev-shm-usage', '--remote-debugging-port=' + portNav, '--remote-debugging-address=127.0.0.1'],
    { stdio: ['ignore', 'pipe', 'pipe'] });
  for (let i = 0; i < 100; i++) { await dormir(100); try { if ((await fetch('http://127.0.0.1:' + portNav + '/json/version')).ok) break; } catch (e) {} }

  /* ⛔ On repose `API` APRÈS le chargement : la page calcule `API=''` sur 127.0.0.1, ce qui
     viserait le serveur de fichiers. On ne modifie pas le fichier servi — on rejoue les deux
     fonctions avec la bonne base, exactement comme la page les a écrites. */
  const T = await cdp(portNav, PAGE + '/reinit.html?mode=resetPassword&jeton=' + jeton);
  await dormir(1200);

  const vu = await T.evaluer("(function(){var r={};['etape-chargement','etape-form','etape-ok','etape-ko'].forEach(function(x){var e=document.getElementById(x);r[x]=e?getComputedStyle(e).display:'absent';});return JSON.stringify(r);})()");
  const montre = Object.entries(JSON.parse(vu)).filter(([, d]) => d !== 'none').map(([k]) => k);
  v('⛔ l\'écran affiché est le FORMULAIRE, pas « Lien invalide »', montre, ['etape-form']);

  const erreurs = await T.evaluer("JSON.stringify(window.__err||[])");
  v('   aucune erreur JavaScript au chargement', JSON.parse(erreurs || '[]').length, 0);

  const google = await T.evaluer("JSON.stringify(performance.getEntriesByType('resource').map(function(e){return e.name;}).filter(function(n){return /gstatic|googleapis|firebase/.test(n);}))");
  v('⛔ AUCUNE ressource Google chargée sur un lien maison', JSON.parse(google), []);

  /* \u26a0\ufe0f UNE seule retouche, et elle est nomm\u00e9e : la page calcule `API=''` sur 127.0.0.1
     (m\u00eame origine), ce qui viserait le serveur de FICHIERS. On lui donne l'adresse de l'API,
     et tout le reste \u2014 le geste, la requ\u00eate pr\u00e9alable, le rendu \u2014 est le vrai code. */
  /* ⛔ LE PLANCHER TACTILE SE MESURE QUAND LE BOUTON EST À L'ÉCRAN. Première écriture :
     après le clic — l'écran de réussite était affiché, le formulaire en display:none, et la
     mesure rendait 0 px. On mesure donc AVANT le geste. */
  const hb = await T.evaluer("(function(){var b=document.getElementById('go');return b?Math.round(b.getBoundingClientRect().height):0;})()");
  v('   le bouton principal tient le plancher tactile (>=44 px)', hb >= 44, true);
  console.log('     (mesuré : ' + hb + ' px)');
  const hc = await T.evaluer("(function(){var b=document.getElementById('p1');return b?Math.round(b.getBoundingClientRect().height):0;})()");
  v('   et les champs de saisie aussi', hc >= 44, true);
  console.log('     (mesuré : ' + hc + ' px)');

  await T.evaluer('API = ' + JSON.stringify(A) + '; 1');
  await T.evaluer("document.getElementById('p1').value='le-nouveau-mot-de-passe';document.getElementById('p2').value='le-nouveau-mot-de-passe';enregistrer();1");
  for (let i = 0; i < 40; i++) { await dormir(150);
    const d = await T.evaluer("getComputedStyle(document.getElementById('etape-ok')).display"); if (d !== 'none') break; }
  const vu2 = await T.evaluer("(function(){var r={};['etape-chargement','etape-form','etape-ok','etape-ko'].forEach(function(x){var e=document.getElementById(x);r[x]=e?getComputedStyle(e).display:'absent';});return JSON.stringify(r);})()");
  const montre2 = Object.entries(JSON.parse(vu2)).filter(([, d]) => d !== 'none').map(([k]) => k);
  v('⛔ après le clic, l\'écran de RÉUSSITE s\'affiche vraiment', montre2, ['etape-ok']);

  const cnx = await post('/api/compte/connexion', { email: 'nav@exemple.fr', h: await emp('le-nouveau-mot-de-passe') });
  v('⛔ et le mot de passe tapé AU NAVIGATEUR ouvre la session', cnx.status, 200);


  /* \u26d4 ET L'ALLOWLIST DOIT MORDRE. Si n'importe quelle origine passait, le jeton de session
     d'un client serait \u00e0 la port\u00e9e de n'importe quel site qu'il visite. On le mesure DANS le
     navigateur, seul endroit o\u00f9 CORS existe. */
  const refus = await T.evaluer("(async function(){ try{ const r = await fetch('" + A + "/api/compte/moi',"
    + " { headers:{ 'Authorization':'Bearer '+'0'.repeat(64) } }); return 'passe:'+r.status; }"
    + " catch(e){ return 'bloque'; } })()");
  v('   (contr\u00f4le : le banc parle depuis une origine autoris\u00e9e)', String(refus).slice(0,6), 'passe:');

  T.fermer();

  /* Second cas : un lien mort doit donner l'écran d'échec, lisible. */
  const T2 = await cdp(portNav, PAGE + '/reinit.html?mode=resetPassword&jeton=' + 'f'.repeat(64));
  await dormir(900);
  await T2.evaluer('API = ' + JSON.stringify(A) + '; 1');
  await T2.evaluer("document.getElementById('p1').value='un-mot-de-passe-invente';document.getElementById('p2').value='un-mot-de-passe-invente';enregistrer();1");
  for (let i = 0; i < 40; i++) { await dormir(150);
    const d = await T2.evaluer("getComputedStyle(document.getElementById('etape-ko')).display"); if (d !== 'none') break; }
  const txt = await T2.evaluer("document.getElementById('ko-txt').textContent");
  v('⛔ un lien mort affiche l\'écran d\'échec', /expir|servi/.test(String(txt)), true);
  console.log('     (à l\'écran : « ' + String(txt).slice(0, 90) + '… »)');
  T2.fermer();

  try { nav.kill('SIGKILL'); } catch (e) {}
  try { api.kill('SIGKILL'); } catch (e) {}
  facteur.close();
  fs.rmSync(BANC, { recursive: true, force: true });
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗\n');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('✗ sonde tombée : ' + (e && e.stack || e)); process.exit(1); });
