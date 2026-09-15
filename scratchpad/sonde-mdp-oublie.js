/* « Mot de passe oublié » pour quelqu'un qui n'a JAMAIS pu entrer — demande de Justin,
   15 septembre 2026. Trois choses à prouver, et la troisième est la plus importante :
   A. un compte ENCORE PROVISOIRE et sans e-mail peut enregistrer le sien et recevoir le code ;
   B. un compte QUI A DÉJÀ SON ADRESSE garde le chemin ordinaire — celui qui exige que
      l'adresse tapée soit bien la sienne, et refuse toute autre ;
   C. après coup, l'application REDEMANDE mot de passe + e-mail — la 2e barrière de Justin. */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const R = '/home/user/teamop';
const srv = http.createServer((q, r) => { const x = path.join(R, q.url.split('?')[0]);
  fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : 'text/html;charset=utf-8' }), r.end(d))); }).listen(8197, '127.0.0.1');
const H = 'd'.repeat(64);
const base = { users: [
  { id: 'u2', prenom: 'Romain', nom: 'Avignon', login: 'romainavg', role: 'tech', actif: true, pwdHash: H, mustChangePwd: true, acces: { caps: {}, modules: {} } },
  { id: 'u9', prenom: 'Sert', nom: 'Sen', login: 'sersen', role: 'tech', actif: true, pwdHash: H, email: 'sersen@ex.fr', acces: { caps: {}, modules: {} } } ],
  produits: [], boxes: [], clients: [], interventions: [], mouvements: [], journal: [], techniciens: [] };
const L = (t, o) => console.log(t + ' ' + JSON.stringify(o));
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const p = await nav.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => console.log('  ! ' + String(e).slice(0, 160)));
  /* ⚠️ L'ORDRE COMPTE, ET IL EST À L'ENVERS DE L'INTUITION : Playwright essaie la DERNIÈRE
     route posée en premier. Le fourre-tout doit donc être posé AVANT les routes précises,
     sinon il les avale toutes — au premier passage, `verifie-nom` recevait « {"ok":true} »
     sans `correspond`, et la sonde a cru que le parcours ne s'ouvrait pas. */
  await p.route('**://api.teamop.fr/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await p.route('**://api.teamop.fr/api/espaces/verifie-nom', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"correspond":true}' }));
  await p.route('**://api.teamop.fr/api/sendcode', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await p.route('**://api.teamop.fr/api/checkcode', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await p.route('**://www.gstatic.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* n */' }));
  await p.addInitScript(j => { try { localStorage.setItem('elanB_gestion_v2', j); localStorage.setItem('elanB_vierge_v1', '1');
    localStorage.setItem('elanB_sync_team', 'elan-34oc'); localStorage.setItem('elanB_entreprise_nom', 'ELAN'); } catch (e) {} }, JSON.stringify(base));
  await p.goto('http://127.0.0.1:8197/beta.html', { timeout: 120000, waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof pwdForgotMailEnvoi === 'function', { timeout: 60000 });

  L('B · un compte qui a déjà son adresse garde le chemin ordinaire', await p.evaluate(async () => {
    const sleep = m => new Promise(r => setTimeout(r, m));
    pwdForgotModal(); await sleep(150);
    document.getElementById('pf-login').value = 'sersen';
    document.getElementById('pf-mail').value = 'pirate@ailleurs.fr';   // pas la sienne
    await pwdForgotSend(); await sleep(300);
    const err = document.getElementById('pf-err');
    return { refusAdresseEtrangere: (err && err.style.display !== 'none') ? (err.textContent || '').slice(0, 60) : '',
      pasDePorteDeSecours: !document.getElementById('pf-mail2'),
      titre: ((document.querySelector('#overlay h3') || {}).textContent || '').trim() };
  }));

  L('A · compte provisoire sans e-mail', await p.evaluate(async () => {
    const sleep = m => new Promise(r => setTimeout(r, m));
    window.annuaireMaintenant = async () => ({ ok: true });
    _syncGotInitial = true;
    pwdForgotModal(); await sleep(150);
    document.getElementById('pf-login').value = 'romainavg';
    document.getElementById('pf-mail').value = 'romain.avignon@gmail.com';
    await pwdForgotSend(); await sleep(250);
    const ecran1 = ((document.querySelector('#overlay h3') || {}).textContent || '').trim();
    document.getElementById('pf-ent').value = 'ELAN';
    await pwdForgotEntreprise('u2'); await sleep(250);
    const ecran2 = ((document.querySelector('#overlay h3') || {}).textContent || '').trim();
    const prerempli = (document.getElementById('pf-mail2') || {}).value || '';
    await pwdForgotMailEnvoi(); await sleep(250);
    const ecran3 = ((document.querySelector('#overlay h3') || {}).textContent || '').trim();
    const dit = (document.getElementById('overlay').textContent || '');
    return { ecran1, ecran2, prerempli, ecran3,
      codeVaChezLui: /romain\.avignon@gmail\.com/.test(dit),
      plusChezLePatron: !/adresse de l.entreprise/.test(dit) };
  }));

  L('C · après coup, l’app redemande tout', await p.evaluate(async () => {
    const sleep = m => new Promise(r => setTimeout(r, m));
    let pousse = null; window.pushNotify = (t, b) => { pousse = String(t) + ' | ' + String(b); };
    document.getElementById('pf-code').value = '123456';
    await pwdForgotCheck(); await sleep(250);
    document.getElementById('pf-p1').value = 'MonNouveau2026!';
    document.getElementById('pf-p2').value = 'MonNouveau2026!';
    await pwdForgotSave(); await sleep(250);
    const u = db.users.find(x => x.id === 'u2');
    return { email: u.email || '(vide)', mdpChange: u.pwdHash !== 'd'.repeat(64), provisoireLeve: !u.mustChangePwd,
      secuPosee: u.secu || '(absent)', redemandeTout: secuAFaire(u), equipePrevenue: (pousse || '').slice(0, 70) };
  }));

  await nav.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
