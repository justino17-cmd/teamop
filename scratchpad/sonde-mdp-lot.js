/* « Refaire les mots de passe provisoires » — sur la BÊTA, avec le fichier livré.
   Deux cas, et le second compte plus que le premier :
   A. le serveur prend → tous les mots de passe changent, la liste s'affiche, et CELUI QUI
      A DÉJÀ CHOISI LE SIEN n'est pas touché ;
   B. le serveur refuse → RIEN n'a bougé. C'est la règle v680 : on ne distribue pas des
      accès que la page de connexion ne connaît pas. */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const R = '/home/user/teamop';
const srv = http.createServer((q, r) => { const x = path.join(R, q.url.split('?')[0]);
  fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : 'text/html;charset=utf-8' }), r.end(d))); }).listen(8196, '127.0.0.1');
const H = 'c'.repeat(64);
const base = { users: [
  { id: 'a1', prenom: 'Justin', nom: 'Biret', login: 'justin', role: 'admin', actif: true, pwdHash: H, email: 'j@ex.fr', secu: '2026-09', acces: { caps: {}, modules: {} } },
  { id: 'u1', prenom: 'Romain', nom: 'Narbonne', login: 'romain', role: 'tech', actif: true, pwdHash: H, mustChangePwd: true, acces: { caps: {}, modules: {} } },
  { id: 'u2', prenom: 'Romain', nom: 'Avignon', login: 'romainavg', role: 'tech', actif: true, pwdHash: H, mustChangePwd: true, acces: { caps: {}, modules: {} } },
  { id: 'u3', prenom: 'Zampa', nom: '13', login: 'zampa', role: 'tech', actif: true, pwdHash: H, mustChangePwd: true, acces: { caps: {}, modules: {} } },
  { id: 'u4', prenom: 'Deja', nom: 'Fait', login: 'deja', role: 'tech', actif: true, pwdHash: H, email: 'd@ex.fr', secu: '2026-09', acces: { caps: {}, modules: {} } },
  { id: 'u5', prenom: 'Parti', nom: 'Ailleurs', login: 'parti', role: 'tech', actif: false, pwdHash: H, mustChangePwd: true, acces: { caps: {}, modules: {} } } ],
  produits: [], boxes: [], clients: [], interventions: [], mouvements: [], journal: [], techniciens: [] };
const L = (t, o) => console.log(t + ' ' + JSON.stringify(o));
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const p = await nav.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => console.log('  ! ' + String(e).slice(0, 160)));
  await p.route('**://api.teamop.fr/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await p.route('**://www.gstatic.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* n */' }));
  await p.addInitScript(j => { try { localStorage.setItem('elanB_gestion_v2', j); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_sync_on', '0'); } catch (e) {} }, JSON.stringify(base));
  await p.goto('http://127.0.0.1:8196/beta.html', { timeout: 120000, waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof resetPwdLot === 'function', { timeout: 60000 });

  // ── B d'abord : le REFUS ne doit rien laisser derrière lui ───────────────────────────
  L('B · le serveur refuse', await p.evaluate(async () => {
    currentUser = db.users.find(u => u.id === 'a1');
    window.confirm = () => true;
    window.annuaireMaintenant = async () => ({ ok: false, status: 426 });
    let dit = ''; const vt = window.toast; window.toast = t => { dit = String(t); };
    const avant = db.users.map(u => u.pwdHash + '|' + (u.mustChangePwd ? 1 : 0) + '|' + (u.secu || ''));
    await resetPwdLot();
    window.toast = vt;
    const apres = db.users.map(u => u.pwdHash + '|' + (u.mustChangePwd ? 1 : 0) + '|' + (u.secu || ''));
    return { rienNaBouge: JSON.stringify(avant) === JSON.stringify(apres),
      fenetreOuverte: document.getElementById('overlay').classList.contains('open'),
      message: dit.slice(0, 90) };
  }));

  // ── A : le serveur prend ─────────────────────────────────────────────────────────────
  L('A · le serveur prend', await p.evaluate(async () => {
    window.annuaireMaintenant = async () => ({ ok: true });
    const avant = {}; db.users.forEach(u => avant[u.login] = u.pwdHash);
    await resetPwdLot();
    await new Promise(r => setTimeout(r, 200));
    const change = l => db.users.find(u => u.login === l).pwdHash !== avant[l];
    const ov = document.getElementById('overlay');
    const t = ov.textContent || '';
    return {
      romainChange: change('romain'), romainavgChange: change('romainavg'), zampaChange: change('zampa'),
      dejaFaitIntact: !change('deja'),           // il a choisi le sien : on n'y touche pas
      moiIntact: !change('justin'),              // jamais soi-même
      desactiveIntact: !change('parti'),         // compte désactivé : hors lot
      tousProvisoires: ['romain','romainavg','zampa'].every(l => !!db.users.find(u => u.login === l).mustChangePwd),
      fenetre: ov.classList.contains('open'),
      titre: ((ov.querySelector('h3') || {}).textContent || '').slice(0, 40),
      listeMontreLesTrois: ['romain','romainavg','zampa'].every(l => t.indexOf(l) >= 0),
      montrePasLesAutres: t.indexOf('deja') < 0 && t.indexOf('parti') < 0,
      mdpDansLaListe: (t.match(/OP-[A-Za-z0-9]{8}/g) || []).length };
  }));

  await nav.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
