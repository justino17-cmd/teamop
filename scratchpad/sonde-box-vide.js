/* ══ « Moi je vois les quantités, eux voient les box vides » ═══════════════════════════════
   UN SEUL APPAREIL, AUCUNE SYNCHRO. La même base, la même box, regardée par l'administrateur
   puis par le technicien. Si le technicien voit 0 u ici, le défaut est LOCAL (droits /
   affichage) et il n'a rien à voir avec le nuage. S'il voit la même chose que l'admin, alors
   c'est la synchro, et on ira chercher là.
   ⛔ beta.html, aucune donnée d'ELAN.  Usage : node sonde-box-vide.js */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const R = '/home/user/teamop';
const srv = http.createServer((q, r) => {
  const x = path.join(R, q.url.split('?')[0]);
  fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end())
    : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : 'text/html;charset=utf-8' }), r.end(d)));
}).listen(8191, '127.0.0.1');

/* Une base minimale mais RÉALISTE : un admin, un technicien rattaché à une fiche technicien,
   une box qui porte du stock et qui nomme ce technicien. Exactement la capture de Justin. */
const base = {
  users: [
    { id: 'u1', prenom: 'Bruno', nom: 'Folrent', login: 'admin', role: 'admin', actif: true, pwdHash: '', acces: { caps: {}, modules: {} } },
    { id: 'u2', prenom: 'florian', nom: 'duflot', login: 'florian.duflot', role: 'tech', techId: 't1', actif: true, pwdHash: '', acces: { caps: {}, modules: {} } },
  ],
  techniciens: [{ id: 't1', nom: 'florian duflot', userId: 'u2' }],
  produits: [
    { id: 'p1', nom: 'Appât rongeur bloc', cat: 'Appât', unite: 'u', stock: 0 },
    { id: 'p2', nom: 'Gel blattes', cat: 'Insecticide', unite: 'u', stock: 0 },
  ],
  boxes: [{
    id: 'b1', nom: 'ELAN EASY STOCKAGE - Nantes', zone: 'Nantes', num: '06',
    stock: { p1: 7000, p2: 199 }, _ms: { p1: 1757000000000, p2: 1757000000000 }, _m: 1757000000000,
    techIds: ['t1'], userIds: ['u2'], actif: true,
  }],
  clients: [], interventions: [], mouvements: [], journal: [], devis: [], factures: [], bons: [],
  fournisseurs: [], enveloppes: [], vehicules: [], demandes: [], contrats: [], pointages: [],
  messages: [], groupes: [], conducteurs: [], produitsDonnes: [], brouillons: [], champsPerso: [],
  taches: [], absences: [], chantiers: [], telecollectes: [], registres: [],
};

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const p = await nav.newPage({ viewport: { width: 390, height: 844 } });
  p.on('pageerror', e => console.log('  ! ' + String(e).slice(0, 160)));
  await p.route('**://api.teamop.fr/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await p.route('**://www.gstatic.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* n */' }));
  await p.addInitScript(j => { try {
    localStorage.setItem('elanB_gestion_v2', j); localStorage.setItem('elanB_vierge_v1', '1'); localStorage.setItem('elanB_sync_on', '0');
  } catch (e) {} }, JSON.stringify(base));
  await p.goto('http://127.0.0.1:8191/beta.html', { timeout: 120000, waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof rendreVueSure === 'function' && typeof visibleBoxes === 'function', { timeout: 60000 });

  const regarde = async (login) => p.evaluate(async (lg) => {
    const u = db.users.find(x => x.login === lg);
    enterApp(u);
    await new Promise(r => setTimeout(r, 500));
    current = 'boxes'; rendreVueSure('boxes');
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const c = document.getElementById('content');
    const b = db.boxes[0];
    return {
      qui: lg,
      voirTout: (function () { try { return !!can('voirTout'); } catch (e) { return 'erreur'; } })(),
      boxVisibles: visibleBoxes(db.boxes).length,
      stockDansLaBase: Object.values(b.stock || {}).reduce((n, s) => n + (+s || 0), 0),
      aDuStock: (function () { try { return !!boxADuStock(b); } catch (e) { return 'erreur:' + e.message; } })(),
      entete: (document.querySelector('.topbar h1, #hdr-sub, .sub') || {}).textContent || '',
      ecran: (c ? (c.innerText || '') : '').replace(/\s+/g, ' ').slice(0, 260),
      menus: (function () { try { return NAV.reduce((n, s) => n + s.items.filter(it => canSee(it)).length, 0); } catch (e) { return 'erreur'; } })(),
    };
  }, login);

  const a = await regarde('admin');
  const t = await regarde('florian.duflot');
  const ligne = (r) => {
    console.log('\n  ── ' + r.qui + ' ──');
    console.log('  voirTout               : ' + r.voirTout);
    console.log('  menus visibles         : ' + r.menus);
    console.log('  box visibles           : ' + r.boxVisibles);
    console.log('  stock DANS LA BASE     : ' + r.stockDansLaBase + ' u   (identique pour tous, c\'est le même objet)');
    console.log('  boxADuStock()          : ' + r.aDuStock);
    console.log('  écran                  : ' + r.ecran);
  };
  ligne(a); ligne(t);
  console.log('\n  ══ VERDICT ══');
  const mA = (a.ecran.match(/([\d  ]+) u/) || [])[1], mT = (t.ecran.match(/([\d  ]+) u/) || [])[1];
  console.log('  l\'admin lit      : ' + (mA ? mA.trim() + ' u' : '(aucune unité affichée)'));
  console.log('  le technicien lit: ' + (mT ? mT.trim() + ' u' : '(aucune unité affichée)'));
  console.log('  → ' + (mA === mT ? 'MÊME AFFICHAGE : le défaut n\'est pas local, il est dans la synchro.'
                                  : 'DIFFÉRENT SUR LE MÊME APPAREIL : le défaut est LOCAL (droits / affichage).'));
  await nav.close(); srv.close();
})();
