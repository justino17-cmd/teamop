/* ⛔ CE QUE CE FICHIER GARDE — `configurer-signature.js` EXÉCUTÉ (entrée redirigée), comme `configurer-yousign.js` dans test-1671
   Le script qui pose la boîte SMTP et allume la signature maison est le seul endroit où Justin saisit un mot de passe sur le VPS — et il recolle toutes ses
   sorties dans la conversation. On y garde donc :
     1. ⛔ le mot de passe, l'identifiant et le serveur ne sont JAMAIS réécrits (ni en sortie, ni en erreur) ; deux saisies différentes n'écrivent rien ;
     2. le fichier de configuration reste en 0600 et garde ce qui y était (la clé Yousign, l'origine, le reste) ;
     3. ⛔ poser n'ALLUME rien (le moteur interne est éteint par défaut) ; « allumer » est refusé tant que l'adresse et le SMTP ne sont pas posés ; « éteindre » revient à Yousign ;
     4. « tester » se connecte à un VRAI serveur SMTP local, dit « accepté » ou « refusé » par un statut, et n'envoie AUCUN courriel ;
     5. « vérifier » dit identique/différent, rien d'autre. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const { spawn } = require('child_process');
let ok = 0, ko = 0;
process.on('uncaughtException', (e) => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e).toString().split('\n').slice(0, 5).join(' | ')); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu ' + JSON.stringify(b) + ' · obtenu ' + JSON.stringify(a)); } };
const vrai = (t, a, d) => v(t + (d !== undefined && !a ? ' — ' + String(d).slice(0, 200) : ''), !!a, true);
const F = require('./courrier-faux');
if (!fs.existsSync(path.join(F.RACINE, 'node_modules', 'nodemailer'))) { console.log('  (sauté : server-courrier/node_modules manque — npm ci --prefix server-courrier)'); console.log('\n0 ✓  0 ✗'); process.exit(0); }

const MDP = 'Mot-de-Passe-Tres-Secret-42', HOTE = 'smtp.exemple-prive.test', ID = 'identifiant-prive@exemple-prive.test', CLE_YOUSIGN = 'CLE-YOUSIGN-A-NE-PAS-PERDRE-123';

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opcourrier-2802-'));
  const conf = path.join(dir, 'beta.json');
  fs.writeFileSync(conf, JSON.stringify({ origines: ['https://teamop.fr'], yousign: { cleApi: CLE_YOUSIGN, secretWebhook: 'S'.repeat(32), sandbox: true } }), { mode: 0o600 });
  const lancer = (action, lignes) => new Promise((fin) => {
    const e = spawn(process.execPath, [path.join(F.RACINE, 'configurer-signature.js'), 'beta'].concat(action ? [action] : []), { env: { PATH: process.env.PATH, OPCOURRIER_CONFIG: conf, OPCOURRIER_SANS_REDEMARRAGE: '1' } });
    let o = '', er = ''; e.stdout.on('data', (d) => { o += d; }); e.stderr.on('data', (d) => { er += d; }); e.on('close', (st) => fin({ status: st, stdout: o, stderr: er })); e.stdin.end((lignes || []).join('\n') + '\n');
  });
  const cfg = () => JSON.parse(fs.readFileSync(conf, 'utf8'));
  const sortie = (r) => r.stdout + r.stderr;

  console.log('\n── 1. Poser : la boîte SMTP, SANS rien allumer ──');
  let r = await lancer('', ['https://courrier-beta.teamop.fr/', HOTE, '587', 'non', ID, 'TeamOP Signature <signature@teamop.fr>', MDP, MDP]);
  v('poser : réussi', r.status, 0);
  v('…la configuration porte l\'adresse (sans « / » final), le serveur, le port, l\'identifiant, l\'expéditeur', [cfg().signature.urlPublique, cfg().signature.smtp.host, cfg().signature.smtp.port, cfg().signature.smtp.secure, cfg().signature.smtp.user, cfg().signature.smtp.from], ['https://courrier-beta.teamop.fr', HOTE, 587, false, ID, 'TeamOP Signature <signature@teamop.fr>']);
  vrai('…le mot de passe est posé', cfg().signature.smtp.pass === MDP);
  vrai('⛔ rien de secret n\'est réécrit : ni le mot de passe, ni l\'identifiant (saisis masqués), ni la clé Yousign (stdout + stderr)', ![MDP, ID, CLE_YOUSIGN, 'S'.repeat(32)].some((s) => sortie(r).includes(s)), sortie(r));
  vrai('…seuls ce qui n\'est pas secret s\'affiche comme on le tape (le nom du serveur, l\'adresse publique) : pas de masque pour ce qui n\'en demande pas', sortie(r).includes(HOTE) && sortie(r).includes('courrier-beta.teamop.fr'), sortie(r));
  v('⛔ poser n\'ALLUME rien : le moteur reste celui d\'avant (aucun réglage = Yousign)', cfg().signature.moteur, undefined);
  vrai('…ce qui y était reste (clé Yousign, origines, sandbox)', cfg().yousign.cleApi === CLE_YOUSIGN && cfg().yousign.sandbox === true && cfg().origines[0] === 'https://teamop.fr');
  v('…le fichier reste en 0600', fs.statSync(conf).mode & 0o777, 0o600);

  console.log('\n── 2. Deux saisies différentes n\'écrivent rien ──');
  const avant = fs.readFileSync(conf, 'utf8');
  r = await lancer('', ['', '', '', '', '', '', 'Autre-mot-de-passe-1', 'Autre-mot-de-passe-2']);
  v('mots de passe différents : refusé', r.status, 1);
  v('…la configuration est INCHANGÉE (octet pour octet)', fs.readFileSync(conf, 'utf8'), avant);
  vrai('…et rien n\'est réécrit', !['Autre-mot-de-passe-1', 'Autre-mot-de-passe-2', MDP].some((s) => sortie(r).includes(s)), sortie(r));
  r = await lancer('', ['', '', '', '', '', '', '', '']);
  v('tout laisser vide : « inchangé » partout, rien ne casse', [r.status, cfg().signature.smtp.pass === MDP], [0, true]);
  r = await lancer('', ['http://exemple.test', '', '', '', '', '', '', '']);
  v('une adresse publique en http (hors boucle locale) : refusée', [r.status, /https obligatoire/.test(sortie(r))], [1, true]);

  console.log('\n── 3. Allumer et éteindre ──');
  const frais = path.join(dir, 'frais.json'); fs.writeFileSync(frais, JSON.stringify({ yousign: { cleApi: CLE_YOUSIGN } }), { mode: 0o600 });
  const surFrais = (action) => new Promise((fin) => { const e = spawn(process.execPath, [path.join(F.RACINE, 'configurer-signature.js'), 'beta', action], { env: { PATH: process.env.PATH, OPCOURRIER_CONFIG: frais, OPCOURRIER_SANS_REDEMARRAGE: '1' } }); let o = ''; e.stdout.on('data', (d) => { o += d; }); e.stderr.on('data', (d) => { o += d; }); e.on('close', (st) => fin({ status: st, sortie: o })); e.stdin.end('\n'); });
  r = await surFrais('allumer');
  v('« allumer » sans rien de posé : refusé, et rien n\'est allumé', [r.status, JSON.parse(fs.readFileSync(frais, 'utf8')).signature], [1, undefined]);
  r = await lancer('allumer');
  v('« allumer » une fois tout posé : la signature maison est allumée', [r.status, cfg().signature.moteur], [0, 'interne']);
  r = await lancer('eteindre');
  v('« éteindre » : retour à Yousign', [r.status, cfg().signature.moteur], [0, 'yousign']);
  vrai('…allumer et éteindre ne touchent à rien d\'autre (mot de passe, clé Yousign)', cfg().signature.smtp.pass === MDP && cfg().yousign.cleApi === CLE_YOUSIGN);

  console.log('\n── 4. Vérifier : identique ou différent, jamais une valeur ──');
  r = await lancer('verifier', [MDP]); vrai('le bon mot de passe : « identique »', /identique/.test(r.stdout) && !sortie(r).includes(MDP), sortie(r));
  r = await lancer('verifier', ['pas-le-bon']); vrai('un autre : « DIFFÉRENT »', /DIFF/.test(r.stdout) && !sortie(r).includes('pas-le-bon') && !sortie(r).includes(MDP), sortie(r));

  console.log('\n── 5. Tester : un VRAI serveur SMTP local, aucun courriel envoyé ──');
  const smtp = await F.fauxSmtp();
  const c = cfg(); c.signature.smtp = { host: '127.0.0.1', port: smtp.port, secure: false, from: 'TeamOP Signature <signature@teamop.fr>' }; fs.writeFileSync(conf, JSON.stringify(c), { mode: 0o600 });
  r = await lancer('tester');
  vrai('un serveur qui répond : « accepte la connexion »', r.status === 0 && /accepte/.test(r.stdout), sortie(r));
  v('…et AUCUN courriel n\'a été envoyé', smtp.recus.length, 0);
  smtp.fermer(); await F.attendre(100);
  r = await lancer('tester');
  vrai('un serveur qui ne répond pas : « refuse ou ne répond pas », avec un code, jamais le serveur', r.status === 1 && /refuse ou ne répond pas/.test(r.stderr) && !sortie(r).includes('127.0.0.1'), sortie(r));
  const sansBoite = path.join(dir, 'sans.json'); fs.writeFileSync(sansBoite, '{}', { mode: 0o600 });
  vrai('sans boîte posée : « aucune boîte SMTP posée »', await new Promise((fin) => { const e = spawn(process.execPath, [path.join(F.RACINE, 'configurer-signature.js'), 'beta', 'tester'], { env: { PATH: process.env.PATH, OPCOURRIER_CONFIG: sansBoite } }); let o = ''; e.stderr.on('data', (d) => { o += d; }); e.on('close', (st) => fin(st === 1 && /aucune boîte SMTP/.test(o))); e.stdin.end(); }));

  console.log('\n── 6. Le fichier (lu) ──');
  const src = fs.readFileSync(path.join(F.RACINE, 'configurer-signature.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  vrai('le mot de passe ET l\'identifiant se saisissent MASQUÉS (le second argument de demander vaut true), jamais en argument de la ligne de commande', /demander\('  Mot de passe SMTP[^']*', true\)/.test(src) && /demander\('  Identifiant SMTP[\s\S]*?, true\)/.test(src) && !/process\.argv[^;]*(pass|user|ident)/i.test(src));
  vrai('le mot de passe ne se lit pas dans un test de connexion qui ÉCHOUE alors qu\'un identifiant et un mot de passe sont posés (stdout + stderr)', await (async () => { const c2 = cfg(); c2.signature.smtp = { host: '127.0.0.1', port: 9, secure: false, user: ID, pass: MDP, from: 'a@b.fr' }; fs.writeFileSync(conf, JSON.stringify(c2), { mode: 0o600 }); const x = await lancer('tester'); return x.status === 1 && ![MDP, ID].some((s) => sortie(x).includes(s)); })());
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
