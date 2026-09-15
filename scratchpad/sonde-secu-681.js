/* v681 au navigateur, sur la BÊTA (jamais app.html : données de vrais clients).
   Quatre preuves, mesurées et non déduites :
   A. la campagne sécurité s'ouvre sur un compte en règle, et on n'en sort pas
   B. l'e-mail obligatoire ne se referme pas non plus
   C. thème et couleur partent sur la fiche, et une fiche venue d'ailleurs repeint l'appareil
   D. connexion.html, sur un téléphone DÉJÀ relié, montre bien la consigne + le champ */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const R = '/home/user/teamop';
const srv = http.createServer((q, r) => { const x = path.join(R, q.url.split('?')[0]);
  fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : 'text/html;charset=utf-8' }), r.end(d))); }).listen(8193, '127.0.0.1');
const base = { users: [{ id: 'u1', prenom: 'Jean', nom: 'Bon', login: 'jb', role: 'tech', actif: true,
    pwdHash: 'b'.repeat(64), email: 'jb@exemple.fr', acces: { caps: {}, modules: {} } }],
  produits: [], boxes: [], clients: [], interventions: [], mouvements: [], journal: [], techniciens: [] };
const L = (t, o) => console.log(t + ' ' + JSON.stringify(o));
(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const p = await nav.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => console.log('  ! ' + String(e).slice(0, 160)));
  await p.route('**://api.teamop.fr/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await p.route('**://www.gstatic.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* n */' }));
  await p.addInitScript(j => { try { localStorage.setItem('elanB_gestion_v2', j); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_sync_on', '0'); } catch (e) {} }, JSON.stringify(base));
  await p.goto('http://127.0.0.1:8193/beta.html', { timeout: 120000, waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof forcePwdSave === 'function' && typeof secuAFaire === 'function', { timeout: 60000 });

  // ── A. La campagne : compte avec un VRAI mot de passe et un e-mail, mais jamais passé par là
  L('A · campagne sécurité', await p.evaluate(async () => {
    const u = db.users[0]; u.pwdHash = 'b'.repeat(64); u.email = 'jb@exemple.fr'; delete u.secu; delete u.mustChangePwd;
    const retenu = secuAFaire(u);
    enterApp(u);
    await new Promise(r => setTimeout(r, 1400));              // la fenêtre s'ouvre à 600 ms
    const ouvert = document.getElementById('overlay').classList.contains('open');
    const titre = (document.querySelector('#overlay h3') || {}).textContent || '';
    const croix = !!document.querySelector('#overlay .modal-close');
    closeModal();                                             // un utilisateur qui tape à côté
    const resteOuvert = document.getElementById('overlay').classList.contains('open');
    return { retenu, ouvert, titre: titre.slice(0, 60), croix, resteOuvert,
      ditAccesNonActive: /accès n'est pas activé/.test(document.getElementById('overlay').textContent || '') };
  }));

  // ── A2. On ne repasse pas le MÊME mot de passe, et le bon geste referme tout
  L('A2 · le même mot de passe est refusé, un nouveau passe', await p.evaluate(async () => {
    const u = db.users[0];
    const sha = async s => { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); };
    u.pwdHash = await sha('MonAncien2026');                   // on connaît l'ancien, on va le retaper
    window.annuaireMaintenant = async () => ({ ok: true });   // le serveur dit oui
    forcePwdModal(); await new Promise(r => setTimeout(r, 150));
    document.getElementById('fp-p1').value = 'MonAncien2026';
    document.getElementById('fp-p2').value = 'MonAncien2026';
    document.getElementById('fp-mail').value = 'jb@exemple.fr';
    await forcePwdSave();
    const err = document.getElementById('fp-err');
    const refus = (err && err.style.display !== 'none') ? (err.textContent || '').slice(0, 70) : '';
    const encoreOuvert = document.getElementById('overlay').classList.contains('open');
    // maintenant un vrai nouveau mot de passe
    document.getElementById('fp-p1').value = 'Toulouse2026!';
    document.getElementById('fp-p2').value = 'Toulouse2026!';
    let dit = ''; const vrai = window.toast; window.toast = t => { dit = String(t); };
    await forcePwdSave(); window.toast = vrai;
    /* ⚠️ LA FERMETURE EST ANIMÉE : `closeModal` pose `.ferme` et ne retire `open` qu'au bout
       de 210 ms (app.html, vers la ligne 31509). Mesurer juste après l'appel lit « encore
       ouvert » sur une fenêtre qui se ferme — c'est ce que cette sonde a cru voir au premier
       passage. On laisse l'animation finir avant de juger. */
    await new Promise(r => setTimeout(r, 320));
    const ov2=document.getElementById('overlay');
    return { refus, encoreOuvert,
      ferme: !ov2.classList.contains('open'),
      ceQuiResteOuvert: ov2.classList.contains('open') ? ((ov2.querySelector('h3')||{}).textContent||'?').slice(0,40) : '',
      secu: u.secu || '(absent)', email: u.email, hachChange: u.pwdHash !== await sha('MonAncien2026'),
      aRefaire: secuAFaire(u), toast: dit.slice(0, 80) };
  }));

  // ── B. L'e-mail obligatoire : compte en règle côté mot de passe, mais sans adresse
  L('B · e-mail obligatoire', await p.evaluate(async () => {
    const u = db.users[0]; u.email = ''; currentUser.email = '';
    /* On repart d'un écran vide : les fenêtres différées d'enterApp (photo de profil, rappels
       du jour, garanties…) peuvent en avoir ouvert une entre-temps — c'est le décor de la
       sonde, pas le sujet. `emailRappelModal` refuse d'écraser une fenêtre ouverte, à raison. */
    _modalForcee = false; closeModal(true);
    document.getElementById('overlay').classList.remove('open');
    await new Promise(r => setTimeout(r, 80));
    emailRappelModal(); await new Promise(r => setTimeout(r, 150));
    const ov = document.getElementById('overlay');
    const t = ov.textContent || '';
    const avant = { ouvert: ov.classList.contains('open'), croix: !!ov.querySelector('.modal-close'), plusTard: /Plus tard/.test(t) };
    closeModal();
    const resteOuvert = ov.classList.contains('open');
    document.getElementById('er-mail').value = 'pas-une-adresse';
    emailRappelSave();
    const err = document.getElementById('er-err');
    const refus = (err && err.style.display !== 'none') ? (err.textContent || '').slice(0, 60) : '';
    document.getElementById('er-mail').value = 'jb@exemple.fr';
    emailRappelSave();
    await new Promise(r => setTimeout(r, 320));        // fermeture animée : voir A2
    return Object.assign(avant, { resteOuvert, refus, ferme: !ov.classList.contains('open'), email: u.email,
      sortieDeconnexion: /me déconnecter/.test(t) });
  }));

  // ── C. L'apparence suit la personne
  L('C · thème et couleur sur la fiche', await p.evaluate(async () => {
    const u = db.users.find(x => x.id === 'u1');
    setAccent('purple'); setThemePref('light');
    const ecrit = JSON.parse(JSON.stringify(u.pref || {}));
    /* ⚠️ LES CLÉS DE LA BÊTA SONT PRÉFIXÉES `elanB_` (beta-build.js réécrit `'elan_`). On lit
       donc PREF_CLES, celles que le fichier utilise vraiment, et pas un nom écrit en dur :
       au premier passage, cette sonde lisait `elan_accent` — le décor qu'elle venait de
       poser — et affichait « vert » alors que la page était bel et bien passée au violet. */
    const K = PREF_CLES;
    localStorage.setItem(K.accent, 'green'); localStorage.setItem(K.theme, 'dark');
    const bouge = prefAppliquer(u);
    return { ecrit, bouge, clesLues: [K.theme, K.accent],
      accentApresArrivee: localStorage.getItem(K.accent),
      themeApresArrivee: localStorage.getItem(K.theme),
      attributDom: document.documentElement.getAttribute('data-theme'),
      accentDom: document.documentElement.getAttribute('data-accent') };
  }));

  // ── D. connexion.html sur un téléphone DÉJÀ relié à une entreprise
  const p2 = await nav.newPage({ viewport: { width: 390, height: 844 } });
  await p2.route('**://api.teamop.fr/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"libre":false}' }));
  await p2.addInitScript(() => { try { localStorage.setItem('elan_sync_team', 'elan-34oc'); localStorage.setItem('elan_entreprise_nom', 'ELAN'); } catch (e) {} });
  await p2.goto('http://127.0.0.1:8193/connexion.html', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(700);
  L('D · page de connexion, appareil déjà relié', await p2.evaluate(() => {
    const vis = el => !!el && el.offsetParent !== null;
    const b = document.getElementById('etape-adresse');
    return { banniere: vis(document.getElementById('bloc-relie')),
      titreConsigne: (b && b.querySelector('.titre') || {}).textContent || '',
      champAdresseVisible: vis(document.getElementById('adr-nom')),
      boutonVisible: vis(document.getElementById('adr-btn')),
      aideParleDesIdentifiants: /On vient de te donner des identifiants/.test((b || {}).textContent || ''),
      changerEntreprise: /Changer d'entreprise/.test(document.body.textContent || ''),
      cartesApps: vis(document.getElementById('cartes-apps')) };
  }));

  await nav.close(); srv.close();
})().catch(e => { console.error(e); process.exit(1); });
