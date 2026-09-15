/* ══ L'ORDRE DE MOT DE PASSE, EXÉCUTÉ POUR DE VRAI DANS UN NAVIGATEUR ══════════════════════
   `tests/test-702.js` lit le contrat dans le fichier ; ici on l'EXÉCUTE. On ouvre beta.html,
   on fait répondre au serveur un ordre `mdp`, on appelle la vraie `ordresVerifier()` et on
   regarde ce qu'elle a écrit dans `db` et ce qu'elle a acquitté.
   ⛔ beta.html et pas app.html : règle du dépôt pour tout navigateur piloté.

   ⚠️ PLAYWRIGHT APPARIE LES ROUTES EN ORDRE INVERSE D'ENREGISTREMENT. Le fourre-tout doit
   donc être posé EN PREMIER, sinon il avale les détournements précis — erreur déjà faite le
   15 septembre, une demi-heure perdue à croire que le stub ne servait pas.

   ⛔ ET UNE SECONDE CHOSE, MESURÉE ET PAS DEVINÉE : sur `beta.html`, `BETA_ESSAI` vaut `true`,
   et c'est la PREMIÈRE condition de sortie d'`ordresVerifier`. La sonde rendait donc « rien n'a
   bougé » sur du code parfaitement juste. Cette garde est VOULUE — la bêta n'appartient à
   aucune entreprise, elle ne doit jamais exécuter les ordres d'un client — et on ne la retire
   pas du fichier livré. On sert donc une COPIE de beta.html avec ce seul drapeau retourné, et
   on le dit ici plutôt que de le cacher : tout le reste est le code livré, caractère pour
   caractère. La garde elle-même est gardée par sa ligne dans `tests/test-702.js`.
   Usage : node sonde-ordre-mdp.js */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const R = '/home/user/teamop';
/* La copie servie : beta.html, moins le seul drapeau qui interdit d'exécuter un ordre. */
const BETA = fs.readFileSync(path.join(R, 'beta.html'), 'utf8');
if ((BETA.match(/const BETA_ESSAI=true;/g) || []).length !== 1) { console.error('⛔ BETA_ESSAI introuvable ou en double — la sonde ne sait plus ce qu\'elle sert'); process.exit(1); }
const BETA_HORS_ESSAI = BETA.replace('const BETA_ESSAI=true;', 'const BETA_ESSAI=false;');
const srv = http.createServer((q, r) => {
  const u = q.url.split('?')[0];
  if (u === '/beta.html') { r.writeHead(200, { 'Content-Type': 'text/html;charset=utf-8' }); return r.end(BETA_HORS_ESSAI); }
  const x = path.join(R, u);
  fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end())
    : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : 'text/html;charset=utf-8' }), r.end(d)));
}).listen(8191, '127.0.0.1');

const H_NEUF = 'e'.repeat(64);
const H_VIEUX = '1'.repeat(64);

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const page = await nav.newPage({ viewport: { width: 390, height: 844 } });
  const err = []; page.on('pageerror', e => err.push(String(e)));

  const acquittements = [];
  await page.route('**://api.teamop.fr/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));   // fourre-tout EN PREMIER
  await page.route('**/api/espaces/ordres', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, suppressions: [], mdp: [{ login: 'mireille', h: H_NEUF }] }) }));
  await page.route('**/api/espaces/ordre-fait', r => {
    try { acquittements.push(JSON.parse(r.request().postData() || '{}')); } catch (e) {}
    r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true,"n":0,"nm":1}' });
  });
  await page.route('**://www.gstatic.com/**', r => r.fulfill({ status: 200, contentType: 'text/javascript', body: '/* neutralise */' }));

  /* Une base minuscule, mais de VRAIES fiches : c'est `db.users` que la fonction va écrire. */
  const base = { users: [
    { id: 'u1', prenom: 'Mireille', nom: 'T', login: 'mireille', role: 'tech', actif: true, pwdHash: H_VIEUX, pinHash: 'vieuxpin', secu: '2026-09' },
    { id: 'u2', prenom: 'Autre', nom: 'P', login: 'autre', role: 'tech', actif: true, pwdHash: '9'.repeat(64), secu: '2026-09' } ] };
  await page.addInitScript(j => { try {
    localStorage.setItem('elanB_gestion_v2', j);
    localStorage.setItem('elanB_vierge_v1', '1');
    localStorage.setItem('elanB_sync_on', '0');
    localStorage.setItem('elanB_sync_team', 'ent-banc-1');
    localStorage.setItem('elanB_sync_secret', 'CLE-PRIVEE-DU-BANC-2026');
  } catch (e) {} }, JSON.stringify(base));

  await page.goto('http://127.0.0.1:8191/beta.html', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof ordresVerifier === 'function' && typeof db === 'object', { timeout: 30000 });

  const r = await page.evaluate(async (H) => {
    /* `ordresVerifier` sort tout de suite sans utilisateur connecté : on en pose un qui n'est
       PAS la cible, pour éprouver le chemin normal (personne n'est déconnecté). */
    currentUser = db.users.find(u => u.login === 'autre');
    const avant = JSON.parse(JSON.stringify(db.users.find(u => u.login === 'mireille')));
    await ordresVerifier();
    const apres = JSON.parse(JSON.stringify(db.users.find(u => u.login === 'mireille')));
    const autre = JSON.parse(JSON.stringify(db.users.find(u => u.login === 'autre')));
    /* Deuxième passage : l'ordre est encore servi (fenêtre de rattrapage), la fiche ne doit
       plus bouger — sinon chaque passage re-tamponnerait l'enregistrement. */
    await ordresVerifier();
    const apres2 = JSON.parse(JSON.stringify(db.users.find(u => u.login === 'mireille')));
    return { avant, apres, apres2, autre,
      journal: (db.journal || []).filter(j => /Tour de contrôle/.test(j.action || '')).map(j => j.action + ' · ' + j.detail) };
  }, H_NEUF);

  const dit = (nom, vrai) => console.log('  ' + (vrai ? '✓' : '✗') + ' ' + nom);
  console.log('\n  AVANT   pwdHash ' + r.avant.pwdHash.slice(0, 8) + '… · pinHash ' + (r.avant.pinHash || '—') + ' · secu ' + (r.avant.secu || '—') + ' · mustChangePwd ' + !!r.avant.mustChangePwd);
  console.log('  APRÈS   pwdHash ' + r.apres.pwdHash.slice(0, 8) + '… · pinHash ' + (r.apres.pinHash || '—') + ' · secu ' + (r.apres.secu || '—') + ' · mustChangePwd ' + !!r.apres.mustChangePwd);
  console.log('');
  const bons = [
    ['le mot de passe neuf est posé', r.apres.pwdHash === H_NEUF],
    ['l\'ancien PIN a disparu', !r.apres.pinHash],
    ['la campagne sécurité est relancée', !r.apres.secu && r.apres.mustChangePwd === true],
    ['⛔ l\'autre compte n\'est pas touché', r.autre.pwdHash === '9'.repeat(64) && !!r.autre.secu],
    ['⛔ un second passage ne réécrit rien', JSON.stringify(r.apres) === JSON.stringify(r.apres2)],
    ['l\'acquittement part, et distingue les deux sortes',
      acquittements.length >= 1 && JSON.stringify(acquittements[0].mdp) === '["mireille"]' && JSON.stringify(acquittements[0].logins) === '[]'],
    ['⛔ un second passage n\'acquitte pas deux fois une écriture', acquittements.length === 2],
    ['le geste est tracé au journal de l\'entreprise', r.journal.length === 1 && /Mot de passe refait/.test(r.journal[0])],
    ['aucune erreur de page', err.length === 0],
  ];
  bons.forEach(([n, b]) => dit(n, b));
  if (err.length) console.log('  ⚠ ' + err.join(' | '));
  console.log('\n  acquittements : ' + JSON.stringify(acquittements));
  console.log('  journal       : ' + JSON.stringify(r.journal));
  const tout = bons.every(([, b]) => b);
  console.log('\n  ' + (tout ? '✅ L\'ORDRE EST EXÉCUTÉ COMME PROMIS' : '⛔ ÉCHEC'));
  await nav.close(); srv.close();
  process.exit(tout ? 0 : 1);
})();
