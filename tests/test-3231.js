/* ⛔ CE QUE CE FICHIER GARDE — LES COMPTES DU SITE SANS ESPACE ARRIVENT DANS « À TRAITER », ET « OUVRIR SON ACCÈS » FAIT TRAVAILLER LE CLIENT (30 octobre 2026).

   Justin : « j'ai beaucoup de demandes clients, il faut qu'on reçoive la demande dans la Tour, il faut que les clients puissent travailler confortablement ». Constat : un compte créé sur l'Espace
   client apparaissait dans Clients → « Comptes du site » (« Aucun espace ») et NULLE PART dans À traiter → Demandes.

     1. SERVEUR (le vrai, isolé, avec un facteur SMTP) : UNE alerte par compte neuf sans espace — jamais deux (registre écrit avant l'alerte, adresses empreintées), pas d'alerte pour un compte qui a
        un espace, un compte ignoré, ni pour les anciens comptes au premier passage ; le registre illisible n'est jamais réécrit ; rien de personnel au journal ;
     2. « Ignorer » : patron seul (401 sans session), rangé côté serveur, relu par `/api/monitor/comptes-site` (`ignore`), réversible, adresse invalide refusée ;
     3. TOUR (les VRAIES fonctions de tour.html) : la liste des comptes sans espace (ni espace, ni demande à traiter, ni ignoré, du plus récent au plus ancien), la pastille ;
     4. « Ouvrir son accès » : la VRAIE `pbCreer` de la Tour contre le vrai serveur — l'espace naît avec son métier ET son essai (formule + fin) par les routes d'aujourd'hui, et un échec se DIT. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3231-'));
const enfants = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 150000).unref();

console.log('\n── 3231 · les comptes du site sans espace, et « Ouvrir son accès » ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const REFB = require('./metiers-banc.js').ecrire(RACINE, banc);
  const MAINT = Date.now(), vap = webpush.generateVAPIDKeys();
  const PRE = path.join(banc, 'pre.js'); fs.writeFileSync(PRE, require('./metiers-banc.js').preload(RACINE, REFB.chemin));
  const recus = [];
  const smtp = require('net').createServer(c => { c.on('error', () => {}); let t = '', msg = '', corpsC = false; c.write('220 banc\r\n');
    c.on('data', d => { t += d.toString('utf8'); let i; while ((i = t.indexOf('\r\n')) >= 0) { const l = t.slice(0, i); t = t.slice(i + 2);
      if (corpsC) { if (l === '.') { corpsC = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
      const h = l.toUpperCase();
      if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n'); else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
      else if (h.startsWith('DATA')) { corpsC = true; c.write('354 go\r\n'); } else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); } else c.write('250 ok\r\n'); } }); });
  await new Promise(r => smtp.listen(0, '127.0.0.1', r));
  const lisible = m => Buffer.from(String(m).replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
  const sujets = () => recus.map(lisible).map(m => { const x = /^Subject: (.*(?:\n[ \t].*)*)/m.exec(m); return x ? x[1] : ''; });
  const annonces = () => recus.map(lisible).filter(m => /Un compte vient d'être créé sur l'Espace client/.test(m));

  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const mail = x => x + '@exemple-3231.fr';
  const cle = nom => String(nom).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const code64 = t => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t + '-' + 'x'.repeat(20) })).toString('base64');
  const compte = (id, cree, so) => ({ v: true, pr: 'Zelda' + id, no: 'Quuxbert', so: so || 'Société ' + id, cree, maj: cree });
  const C = { [mail('neuf')]: compte('neuf', MAINT - 3600000, 'Neuf Plomberie'), [mail('avecespace')]: compte('avecespace', MAINT - 3600000), [mail('ancien')]: compte('ancien', MAINT - 30 * 86400000),
    [mail('ignore')]: compte('ignore', MAINT - 3600000) };
  fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: C, j: {} }));
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ avecespace: { t: 't-avec-3231', nom: 'avecespace', email: mail('avecespace'), ts: MAINT - 1000, code: code64('t-avec-3231') },
    [cle('Cible Banc')]: { t: 't-cible-3231', nom: 'Cible Banc', email: mail('cible'), ts: MAINT - 1000, code: code64('t-cible-3231') } }));
  fs.writeFileSync(path.join(D, 'comptes-site-ignores.json'), JSON.stringify({ v: 1, e: [mail('ignore')] }));
  fs.writeFileSync(path.join(D, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', email: '', hash: sha('mot-de-passe-3231'), role: 'patron', actif: true, ts: MAINT }] }));
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-passe-3231'),
    comptes: { actif: true }, comptesScanMs: 500, notifDemandes: 'patron@banc-3231.fr', smtp: { host: '127.0.0.1', port: smtp.address().port, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } }));
  let journal = '', PORT = 9700 + (process.pid % 80), B = 'http://127.0.0.1:' + PORT;
  const lancer = async () => {
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
    enfants.push(e); e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
    let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    return { e, vivant };
  };
  let S = await lancer();
  vrai('le vrai serveur démarre, isolé', S.vivant, journal.slice(0, 600));
  if (!S.vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: corps === undefined ? 'GET' : 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (x) {} return { ok: r.ok, status: r.status, s: r.status, d: j || {}, j: j || {} }; };
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-3231' })).j.token;
  vrai('(population) la Tour se connecte (patron)', typeof PATRON === 'string' && PATRON.length > 10);

  console.log('\n1. une alerte par compte neuf sans espace — jamais deux');
  for (let i = 0; i < 40 && !annonces().length; i++) await dormir(150);
  await dormir(1800);   // plusieurs passages (500 ms) : une seule alerte doit rester
  let an = annonces();
  v('⛔ UNE seule alerte : celle du compte neuf sans espace (pas l\'ancien, pas celui qui a un espace, pas l\'ignoré)', [an.length, an.length && /E-mail : neuf@exemple-3231\.fr/.test(an[0]), an.length && /Entreprise : Neuf Plomberie/.test(an[0])], [1, true, true]);
  vrai('   le courriel dit où agir (Demandes → Comptes du site sans espace) et part à l\'adresse de Justin', /Comptes du site sans espace/.test(an[0] || '') && /^To: .*patron@banc-3231\.fr/mi.test(an[0] || ''));
  const registre = path.join(D, 'comptes-site-vus.json');
  const reg = fs.existsSync(registre) ? fs.readFileSync(registre, 'utf8') : '';
  vrai('le registre des comptes vus existe, EMPREINTÉ (aucune adresse en clair)', reg.includes('"h"') && !/exemple-3231/.test(reg), reg.slice(0, 200));
  vrai('   (population) il porte les quatre comptes (l\'ancien et celui qui a un espace sont inscrits sans bruit)', (JSON.parse(reg || '{"h":[]}').h || []).length === 4);

  console.log('\n   … un redémarrage ne ré-annonce rien ; un compte NEUF, lui, est annoncé');
  S.e.kill('SIGKILL'); await dormir(400);
  C[mail('apres')] = compte('apres', Date.now() - 1000, 'Apres Nettoyage');
  fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: C, j: {} }));
  S = await lancer(); vrai('(population) le serveur redémarre', S.vivant);
  for (let i = 0; i < 40 && annonces().length < 2; i++) await dormir(150);
  await dormir(1500);
  an = annonces();
  v('⛔ deux alertes en tout : le neuf d\'avant n\'est PAS ré-annoncé, le nouveau l\'est une fois', [an.length, /E-mail : apres@exemple-3231\.fr/.test(an[1] || ''), an.filter(m => /neuf@exemple-3231/.test(m)).length], [2, true, 1]);

  console.log('\n2. « Ignorer » : patron seul, rangé côté serveur, réversible');
  const PAT_PROTEGE = '/api/monitor/comptes-site/ignorer';
  v('sans session : refusé', [401, 403].includes((await appel(PAT_PROTEGE, { email: mail('neuf') })).status), true);
  const lst = async () => ((await appel('/api/monitor/comptes-site', undefined, PATRON)).j.comptes || []);
  let l = await lst();
  v('(population) la liste des comptes porte le drapeau `ignore` : l\'ignoré d\'avant oui, le neuf non', [l.length >= 4, (l.find(x => x.email === mail('ignore')) || {}).ignore, (l.find(x => x.email === mail('neuf')) || {}).ignore], [true, true, false]);
  v('adresse invalide : 400', (await appel(PAT_PROTEGE, { email: 'pas-une-adresse' }, PATRON)).status, 400);
  let r = await appel(PAT_PROTEGE, { email: mail('neuf'), ignorer: true }, PATRON);
  l = await lst();
  v('ignorer : 200, relu', [r.status, (l.find(x => x.email === mail('neuf')) || {}).ignore], [200, true]);
  vrai('   rangé sur disque (atomique, aucun .tmp)', JSON.parse(fs.readFileSync(path.join(D, 'comptes-site-ignores.json'), 'utf8')).e.includes(mail('neuf')) && !fs.readdirSync(D).some(f => /ignores.*\.tmp$/.test(f)));
  r = await appel(PAT_PROTEGE, { email: mail('neuf'), ignorer: false }, PATRON);
  l = await lst();
  v('ne plus ignorer : 200, relu', [r.status, (l.find(x => x.email === mail('neuf')) || {}).ignore], [200, false]);

  console.log('\n3. la Tour : les VRAIES fonctions de tour.html');
  const TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
  const a0 = TOUR.indexOf('function comptesSansEspace('), a1 = TOUR.indexOf('function demCompteCarte(');
  vrai('(population) le bloc « comptes sans espace » est trouvé dans tour.html', a0 > 0 && a1 > a0, [a0, a1]);
  const bacT = { CS: {}, ENT: {}, DEM: { vue: 'atraiter' }, demandesATraiter: () => [], demEspace: () => null };
  vm.runInNewContext(TOUR.slice(a0, a1), bacT);
  const jeu = (plus) => ({ loaded: true, err: '', comptes: [
    { email: 'vieux@x.fr', cree: 100, aUnEspace: false }, { email: 'recent@x.fr', cree: 900, aUnEspace: false }, { email: 'milieu@x.fr', cree: 500, aUnEspace: false },
    { email: 'espace@x.fr', cree: 700, aUnEspace: true }, { email: 'ignore@x.fr', cree: 800, aUnEspace: false, ignore: true }, { email: 'coupe@x.fr', cree: 600, aUnEspace: false, desactive: true }].concat(plus || []) });
  bacT.CS = jeu(); bacT.ENT = { loaded: true };
  v('⛔ sans espace, ni ignoré, ni désactivé : du plus récent au plus ancien', bacT.comptesSansEspace(false).map(c => c.email), ['recent@x.fr', 'milieu@x.fr', 'vieux@x.fr']);
  v('   la liste des IGNORÉS (réversible) ne montre que celui-là', bacT.comptesSansEspace(true).map(c => c.email), ['ignore@x.fr']);
  bacT.demandesATraiter = () => [{ c: { email: 'Milieu@x.fr' } }];
  v('   un compte qui a déjà une demande À TRAITER n\'est pas montré deux fois (casse comprise)', bacT.comptesSansEspace(false).map(c => c.email), ['recent@x.fr', 'vieux@x.fr']);
  bacT.demEspace = e => e === 'recent@x.fr' ? { t: 'x' } : null;
  v('   ⛔ un espace ouvert depuis la Tour (annuaire) le fait SORTIR de la liste', bacT.comptesSansEspace(false).map(c => c.email), ['vieux@x.fr']);
  v('   la pastille compte les demandes ET les comptes', bacT.attendDemandes(), 1 + 1);
  bacT.ENT = { loaded: false };
  v('   ⚠ annuaire pas encore lu : rien n\'est affirmé (une liste vide, pas une liste fausse)', bacT.comptesSansEspace(false).length, 0);
  bacT.ENT = { loaded: true }; bacT.CS = { loaded: true, err: 'panne', comptes: jeu().comptes };
  v('   lecture en panne : rien non plus (l\'écran dit la panne, il ne ment pas)', bacT.comptesSansEspace(false).length, 0);

  console.log('\n4. « Ouvrir son accès » : la VRAIE pbCreer contre le vrai serveur');
  const p0 = TOUR.indexOf('async function pbCreer('), p1 = TOUR.indexOf('/* pubLigne vivait');
  vrai('(population) pbCreer est trouvée', p0 > 0 && p1 > p0);
  let panneau = '';
  const bacP = { PB: { nom: 'Cible Banc', email: mail('cible'), ident: 'zelda', pass: 'motdepasse12', metier: 'plomberie', formule: 'pro', fin: '2030-01-15' },
    toast: () => {}, confirm: () => true, localStorage: { getItem: () => '{}' }, JSON, esc: x => String(x == null ? '' : x), jsq: x => String(x), espSlugJs: x => cle(x), catsPromesse: () => '', tourCatsAller() {},
    tourPanneau: h => { panneau = h; }, chargerAccesPublics() {}, chargerEntreprises() {}, chargerComptesSite() {}, chargerEssais() {}, LG_MSG_MODELE: '', LG_ZONE: '', Promise, RegExp, String,
    tourEspaceDe: async (email, nom, ident, mdp) => ({ nom, slug: cle(nom), ident, mdp }),
    apiPost: (u, b) => fetch(B + u, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + PATRON }, body: JSON.stringify(b) })
      .then(r => r.json().catch(() => ({})).then(d => ({ ok: r.ok, status: r.status, d: d || {} }))) };
  vm.runInNewContext(TOUR.slice(p0, p1), bacP);
  await bacP.pbCreer(null);
  const esp = () => JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'))[cle('Cible Banc')];
  v('⛔ l\'espace naît avec son MÉTIER et son ESSAI (formule + statut + fin) — il ne s\'ouvre pas suspendu', [esp().metier, esp().formule, esp().aboStatut, esp().aboFin], ['plomberie', 'pro', 'essai', '2030-01-15']);
  vrai('   le panneau final dit ce qui a été réglé', /✓ métier réglé/.test(panneau) && /✓ essai pro jusqu’au 2030-01-15/.test(panneau), panneau.slice(0, 200));
  v('   les champs du formulaire sont remis à zéro', [bacP.PB.metier, bacP.PB.formule, bacP.PB.fin, bacP.PB.nom], ['', '', '', '']);
  Object.assign(bacP.PB, { nom: 'Cible Banc', email: mail('cible'), ident: 'zelda', pass: 'motdepasse12', metier: 'pasunmetier', formule: 'pro', fin: '2030-02-20' });
  await bacP.pbCreer(null);
  vrai('⛔ un métier refusé par le serveur se DIT (« NON réglé »), et l\'essai est quand même posé', /⚠ métier NON réglé/.test(panneau) && /✓ essai pro jusqu’au 2030-02-20/.test(panneau), panneau.slice(0, 300));
  Object.assign(bacP.PB, { nom: 'Cible Banc', email: mail('cible'), ident: 'zelda', pass: 'motdepasse12', metier: '', formule: '', fin: '' });
  await bacP.pbCreer(null);
  vrai('   CONTRE-ÉPREUVE — sans métier ni formule choisis, rien n\'est écrit de plus (comme avant) et le panneau prévient que l\'espace est suspendu', !/✓ métier|⚠ métier|✓ essai/.test(panneau) && /Sans formule/.test(panneau));
  const TOUR_SRC = TOUR.slice(TOUR.indexOf('function demCompteOuvrir('), TOUR.indexOf('function demCompteOuvrir(') + 700);
  vrai('« Ouvrir son accès » pré-remplit adresse, entreprise, Pro et un essai de 14 jours, puis va au formulaire d\'accès public', /PB\.formule='pro'; PB\.fin=pbEssaiDefaut\(\)/.test(TOUR_SRC) && /setTab\('essais'\)/.test(TOUR_SRC) && /accAllerForm\('ac-f-pub'\)/.test(TOUR_SRC) && /86400000/.test(TOUR));
  vrai('   l\'onglet Demandes charge les comptes du site, et la pastille les lit', /if\(t==='demandes'\)\{[^}]*chargerComptesSite\(\)/.test(TOUR) && /v\.innerHTML=groupeOnglets\('demandes'\)\+vueDemandes\(\)\+demComptesHtml\(\)/.test(TOUR));

  console.log('\n5. rien de personnel dans le journal');
  await dormir(300);
  const perso = ['zelda', 'quuxbert', 'exemple-3231', 'neuf plomberie', 'apres nettoyage'].filter(x => journal.toLowerCase().includes(x));
  v('⛔ le journal ne contient ni nom, ni adresse, ni entreprise', perso, []);
  vrai('(population) le journal n\'est pas vide', journal.length > 50, journal.length);
  smtp.close(); fin();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
