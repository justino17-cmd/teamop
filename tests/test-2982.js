/* ⛔ CE QUE CE FICHIER GARDE — LE SERVEUR EN MODE TEST (`espaceTest: true`), VRAI, JOUÉ EN HTTP (23 octobre 2026).

   Justin : « je veux bien un lien, un test pour faire une simulation comme si j'étais un client — j'ai pas envie de recréer des comptes à chaque fois ». Le même `index.js`,
   lancé avec `espaceTest`, contre un FAUX serveur d'envoi qui COMPTE ses connexions. Tout le banc tient sur ce compteur : il reste à ZÉRO du premier au dernier démarrage —
   le semis (une demande, un récapitulatif au patron, un accusé…), une inscription, un mot de passe oublié, le SMTP d'un client, la vérification d'une boîte.
     1. le semis : Clim Essai (chauffage, Pro en essai, rubriques posées), le prospect (demande EN ATTENTE, plomberie), le patron, le collaborateur, seize agents en Brouillon ;
     2. la clé : mauvaise, absente, mal formée, en majuscules → 403 sur les TROIS routes, et rien ne s'écrit (pas de demande de remise à zéro) ;
     3. les courriels : captés, lisibles, avec leurs liens VERS LE TEST — et le lien capté MARCHE (confirmer l'adresse, puis se connecter) ;
     4. « Se connecter comme… » : le fragment rendu, rangé dans un faux `localStorage`, ouvre la VRAIE fonction de la page (`portailMaison` d'`espace.html`) sur « Mon espace »
        (le compte, sa fiche, sa formule), et le jeton de la Tour passe `/api/monitor/moi` ; le collaborateur n'a pas les routes du patron ;
     5. les clés de stockage sont celles que LIT la page (relues dans `espace.html` et `tour.html`) ;
     6. le CORS de l'origine de test ; un test mal réglé (clé trop courte, `courrielsCaptes` absent) garde la capture et ferme les routes ;
     7. un `espaceTest` sur un dossier qui n'est PAS vierge ne sème rien (la production, par erreur).
   Le vrai serveur sur 127.0.0.1 ; jamais `api.teamop.fr`, jamais un vrai SMTP. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const B2 = require('./banc-essais');
const { RACINE, dormir, attendre, lisible, lireFragment } = B2;
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const vivants = [];
const fin = () => { for (const s of vivants) { try { s.enfant() && s.enfant().kill('SIGKILL'); } catch (e) {} try { s.smtp.s.close(); } catch (e) {} try { fs.rmSync(s.banc, { recursive: true, force: true }); } catch (e) {} } };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 170000).unref();
const sans = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* ── LA VRAIE FONCTION DE LA PAGE (espace.html) : `portailMaison`, contre un faux `localStorage` ─────────────────────────────────────────── */
const PAGE = fs.readFileSync(path.join(RACINE, 'espace.html'), 'utf8');
function tranche(debut, finMarque) { const i = PAGE.indexOf(debut); if (i < 0) return ''; const j = PAGE.indexOf(finMarque, i + debut.length); return j < 0 ? '' : PAGE.slice(i, j); }
function pageDuPortail(base, rangementInitial) {
  const adaptateur = tranche('const API_PORTAIL', 'const _pv = portailMaison();');
  if (!adaptateur) return null;
  const rangement = new Map(Object.entries(rangementInitial || {}));
  const code = adaptateur.replace(/const API_PORTAIL = [\s\S]*?;\n/, 'const API_PORTAIL = ' + JSON.stringify(base) + ';\n') + '\nreturn { pv: portailMaison() };';
  const f = new Function('fetch', 'window', 'crypto', 'TextEncoder', 'console', 'location', 'localStorage', 'sessionStorage', 'setTimeout', 'clearTimeout', code);
  const session = new Map();
  const r = f(fetch, { fetch }, crypto.webcrypto, TextEncoder, { warn: () => {}, log: () => {}, error: () => {} }, { hostname: '127.0.0.1' },
    { getItem: k => (rangement.has(k) ? rangement.get(k) : null), setItem: (k, x) => rangement.set(k, String(x)), removeItem: k => rangement.delete(k) },
    { getItem: k => (session.has(k) ? session.get(k) : null), setItem: (k, x) => session.set(k, String(x)), removeItem: k => session.delete(k) }, setTimeout, clearTimeout);
  return Object.assign(r, { rangement });
}

(async () => {
  console.log('\n── test-2982 : le serveur en mode test ──');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const S = await B2.lancer({ essai: true, config: { mailPreuveExigee: false } }); vivants.push(S);
  vrai('le vrai serveur démarre en mode test', S.vivant);
  const cle = S.CLE, avecCle = (r, c) => r + (r.includes('?') ? '&' : '?') + 'cle=' + (c === undefined ? cle : c);
  vrai('⛔ la marque de dossier de test est posée (dossier vierge au départ)', fs.existsSync(path.join(S.D, '.espace-de-test')));
  vrai('le semis se termine (drapeau posé)', await attendre(() => fs.existsSync(path.join(S.D, 'essais-semis.json')), 200));
  const journal = S.sortie();
  vrai('le journal l\'annonce, sans afficher la clé', /ESPACE DE TEST : courriels captés/.test(journal) && /semis fait/.test(journal) && !journal.includes(cle));
  v('   et sans erreur de semis', /semis incomplet|semis impossible/.test(journal), false);

  console.log('\n1. Le semis');
  const Tp = await (async () => { const r = await S.appel(avecCle('/api/essais/connexion?compte=patron'), undefined, null, 'GET'); return lireFragment(r.h.get('location')).stockage.tour_token; })();
  const liste = await S.appel('/api/monitor/espaces/liste', undefined, Tp);
  const clim = (liste.j.espaces || []).find(e => /clim ?essai/i.test(e.nom || ''));
  vrai('« Clim Essai » est dans l\'annuaire de la Tour, rattachée à l\'adresse du compte semé', clim && String(clim.email).toLowerCase() === 'client@exemple-essai.fr');
  const eClim = JSON.parse(fs.readFileSync(path.join(S.D, 'espaces.json'), 'utf8')).climessai;
  v('⛔ chauffage, Pro × 3, « essai » avec une fin à ~30 jours, rubriques posées (celles du conseil du métier)', [eClim.metier, eClim.formule, eClim.quantite, eClim.aboStatut, Math.abs(Math.round((Date.parse(eClim.aboFin) - Date.now()) / 86400000) - 30) <= 1, Array.isArray(eClim.cats) && eClim.cats.length > 5],
    ['chauffage', 'pro', 3, 'essai', true, true]);
  const cli = (await S.appel('/api/monitor/clients', undefined, Tp)).j.clients || [];
  const fClient = cli.find(c => c.email === 'client@exemple-essai.fr'), fPros = cli.find(c => c.email === 'prospect@exemple-essai.fr');
  v('le client : entreprise « Clim Essai », demande traitée', [fClient && fClient.entreprise, fClient && Object.keys(fClient.demandesTraitees || {})], ['Clim Essai', ['0']]);
  v('⛔ le prospect : « Plomberie Essai », une demande EN ATTENTE (non traitée) pour la plomberie, et AUCUN espace', [fPros && fPros.entreprise, fPros && fPros.demandes[0].metier, fPros && fPros.demandes[0].statut, fPros && Object.keys(fPros.demandesTraitees || {}).length, (liste.j.espaces || []).some(e => String(e.email).toLowerCase() === 'prospect@exemple-essai.fr')],
    ['Plomberie Essai', 'plomberie', 'nouveau', 0, false]);
  const ag = (await S.appel('/api/monitor/agents', undefined, Tp)).j.agents || [];
  v('⛔ les seize agents sont en Brouillon', [ag.length, ag.filter(a => a.mode === 'brouillon').length], [16, 16]);
  const equipe = (await S.appel('/api/monitor/users', undefined, Tp)).j.users || [];
  v('la Tour : un patron et un collaborateur', equipe.map(u => [u.nom, u.role]).sort(), [['Collaborateur Essai', 'collaborateur'], ['Patron Essai', 'patron']]);
  v('⛔ le courrier du semis (récapitulatifs, accusés) est CAPTÉ : le faux facteur n\'a vu aucune connexion', [S.smtp.connexions(), S.smtp.recus.length], [0, 0]);

  console.log('\n2. La clé');
  const brutes = ['/api/essais/courriels', '/api/essais/connexion?compte=client'];
  const refus = [];
  for (const c of [undefined, '', 'court', cle.toUpperCase(), cle.slice(0, 63) + (cle.endsWith('0') ? '1' : '0'), 'x'.repeat(64), cle + cle]) {
    for (const r of brutes) refus.push((await S.appel(c === undefined ? r : avecCle(r, c))).s);
    refus.push((await S.appel(c === undefined ? '/api/essais/remise-a-zero' : avecCle('/api/essais/remise-a-zero', c), {})).s);
  }
  v('⛔ absente, vide, trop courte, en MAJUSCULES, fausse d\'un caractère, 64 « x », doublée : 403 sur les trois routes (21 essais)', [refus.length, refus.every(s => s === 403)], [21, true]);
  vrai('⛔ …et aucun essai de remise à zéro n\'a rien écrit : pas de demande', !fs.existsSync(path.join(S.D, '.remise-a-zero')));
  v('le corps de la réponse ne dit pas pourquoi (pas de clé attendue, pas d\'indice)', (await S.appel(avecCle('/api/essais/courriels', 'court'))).j, { error: 'cle_refusee' });
  v('un compte inconnu est un 400 qui liste les quatre', (await S.appel(avecCle('/api/essais/connexion?compte=admin'))).j.comptes, ['client', 'prospect', 'patron', 'collaborateur']);
  vrai('…et un nom comme « constructor » ne passe pas (table sans prototype)', (await S.appel(avecCle('/api/essais/connexion?compte=constructor'))).s === 400 && (await S.appel(avecCle('/api/essais/connexion?compte=__proto__'))).s === 400);
  v('l\'en-tête empêche toute mise en cache, tout renvoi du référent et toute indexation', (r => [r.h.get('cache-control'), r.h.get('referrer-policy'), r.h.get('x-robots-tag')])(await S.appel(avecCle('/api/essais/courriels'))), ['no-store', 'no-referrer', 'noindex']);

  console.log('\n3. Les courriels captés');
  const c0 = (await S.appel(avecCle('/api/essais/courriels'))).j;
  vrai('(population) le semis a déjà rangé des courriels (accusés, récapitulatifs)', c0.nombre >= 2 && c0.courriels.length === c0.nombre);
  const emp = crypto.randomBytes(32).toString('hex');
  v('une inscription du portail est acceptée', (await S.appel('/api/compte/creer', { email: 'nouveau@exemple-essai.fr', h: emp, prenom: 'Nora', nom: 'Neuve', societe: 'Neuve SARL' })).s, 200);
  const m = await attendre(async () => ((await S.appel(avecCle('/api/essais/courriels'))).j.courriels || []).find(x => x.a.some(a => /nouveau@exemple-essai\.fr/.test(a)) && /verifyEmail/.test(x.texte)), 60);
  vrai('⛔ le courriel de confirmation est lisible sur /api/essais/courriels', m);
  const lien = m && m.liens.find(u => /mode=verifyEmail/.test(u));
  vrai('   son lien pointe vers la page de TEST (https://test.teamop.fr/reinit.html?mode=verifyEmail&jeton=…)', lien && /^https:\/\/test\.teamop\.fr\/reinit\.html\?mode=verifyEmail&jeton=[0-9a-f]{64}$/.test(lien));
  v('   de, objet, date', [m && m.de.includes('essai@exemple-essai.fr'), m && m.objet, m && !Number.isNaN(Date.parse(m.date))], [true, 'Confirmez votre adresse — TEAM OP', true]);
  const tous = (await S.appel(avecCle('/api/essais/courriels'))).j.courriels;
  vrai('   la liste va du plus récent au plus ancien', tous.length > 2 && tous.every((x, i) => i === 0 || Date.parse(tous[i - 1].date) >= Date.parse(x.date)));
  const jeton = lien && /jeton=([0-9a-f]{64})/.exec(lien)[1];
  v('⛔ le lien CAPTÉ marche : le jeton confirme l\'adresse', (await S.appel('/api/compte/verifier', { jeton })).s, 200);
  const cn = await S.appel('/api/compte/connexion', { email: 'nouveau@exemple-essai.fr', h: emp });
  v('   et le compte se connecte ensuite', [cn.s, cn.j.compte && cn.j.compte.verifie], [200, true]);
  /* mot de passe oublié */
  await S.appel('/api/compte/mdp/demander', { email: 'nouveau@exemple-essai.fr' });
  vrai('le courriel « mot de passe oublié » est capté, avec son lien de test', await attendre(async () => ((await S.appel(avecCle('/api/essais/courriels'))).j.courriels || []).some(x => x.liens.some(u => /^https:\/\/test\.teamop\.fr\/reinit\.html\?mode=resetPassword/.test(u))), 60));
  /* les chemins DIRECTS d'envoi */
  const tEsp = 'banc-' + crypto.randomBytes(3).toString('hex');
  await S.appel('/api/connexions', { t: tEsp, ev: 'connexion', login: 'x' });
  const sm = await S.appel('/api/sendmail', { teamId: tEsp, to: 'dest@exemple-essai.fr', subject: 'Chemin direct', text: 'bonjour https://teamop.fr/e/test', smtp: { host: '127.0.0.1', port: S.smtp.s.address().port, user: 'u', pass: 'p', from: 'client@exemple-essai.fr' } });
  v('l\'envoi par le SMTP d\'un client (connexion nodemailer à la main) est accepté', [sm.s, sm.j.ok], [200, true]);
  vrai('⛔ …et il est CAPTÉ, lien réécrit', ((await S.appel(avecCle('/api/essais/courriels'))).j.courriels || []).some(x => x.a.includes('dest@exemple-essai.fr') && x.texte.includes('https://test.teamop.fr/e/test')));
  const vb = await S.appel('/api/monitor/mail/boites', { email: 'boite@exemple-essai.fr', pass: 'x', smtpHost: '127.0.0.1', smtpPort: S.smtp.s.address().port, imapHost: '127.0.0.1', imapPort: 1 }, Tp);
  vrai('⛔ vérifier une boîte (SMTP `verify()`) ne se connecte à personne : le refus vient de la réception (IMAP, port fermé), pas de l\'envoi', vb.s === 400 && /IMAP/.test(vb.j.error || ''));
  v('⛔ APRÈS tout cela — inscription, mot de passe oublié, SMTP d\'un client, boîte vérifiée — le faux facteur n\'a TOUJOURS vu aucune connexion', [S.smtp.connexions(), S.smtp.recus.length], [0, 0]);

  console.log('\n4. « Se connecter comme… »');
  const aller = async (compte) => { const r = await S.appel(avecCle('/api/essais/connexion?compte=' + compte)); return { s: r.s, loc: r.h.get('location') || '', frag: lireFragment(r.h.get('location')) }; };
  const cl = await aller('client');
  v('client : 302 vers la page « Mon espace » de TEST, avec un fragment #essai=', [cl.s, /^https:\/\/test\.teamop\.fr\/espace\.html#essai=[A-Za-z0-9_-]+$/.test(cl.loc)], [302, true]);
  v('   le fragment ne porte QUE la clé de stockage du portail (un jeton de 64 hexadécimaux) et la page', [Object.keys(cl.frag.stockage), /^[0-9a-f]{64}$/.test(cl.frag.stockage.teamop_portail_jeton), cl.frag.page], [['teamop_portail_jeton'], true, '/espace.html']);
  vrai('   ⛔ ni la clé de test ni un mot de passe n\'y figurent', !cl.loc.includes(cle) && !JSON.stringify(cl.frag).includes(cle));
  const page = pageDuPortail(S.B, cl.frag.stockage);
  vrai('⛔ la VRAIE fonction de la page (`portailMaison`, espace.html) s\'extrait', page && page.pv);
  const moi = await new Promise(res => { page.pv.auth.onAuthStateChanged(u => res(u)); setTimeout(() => res('délai'), 5000); });
  v('⛔ rangé dans le localStorage, le fragment OUVRE la session : la page voit « client@exemple-essai.fr », adresse confirmée', [moi && moi.email, moi && moi.emailVerified], ['client@exemple-essai.fr', true]);
  const dos = await S.appel('/api/portail/moi', undefined, cl.frag.stockage.teamop_portail_jeton);
  v('« Mon espace » : le dossier de Clim Essai, sa formule payée (Pro), sa demande', [dos.s, dos.j.dossier && dos.j.dossier.company, dos.j.dossier && /pro/i.test(String(dos.j.dossier.plan)), dos.j.dossier && dos.j.dossier.demandes[0].metier], [200, 'Clim Essai', true, 'chauffage']);
  const cl2 = await aller('client');
  vrai('   chaque clic ouvre une session NEUVE (le jeton change) et la précédente reste valable', cl2.frag.stockage.teamop_portail_jeton !== cl.frag.stockage.teamop_portail_jeton && (await S.appel('/api/compte/moi', undefined, cl.frag.stockage.teamop_portail_jeton)).s === 200);

  const pr = await aller('prospect');
  const pMoi = await S.appel('/api/portail/moi', undefined, pr.frag.stockage.teamop_portail_jeton);
  v('prospect : sa session ouvre SON dossier — la demande d\'accès EN ATTENTE, plomberie', [pr.s, pMoi.s, pMoi.j.dossier && pMoi.j.dossier.company, pMoi.j.dossier && pMoi.j.dossier.demandes[0].statut, pMoi.j.dossier && pMoi.j.dossier.demandes[0].metier], [302, 200, 'Plomberie Essai', 'nouveau', 'plomberie']);

  const pa = await aller('patron');
  v('patron : 302 vers la Tour de TEST', [pa.s, /^https:\/\/test\.teamop\.fr\/tour\.html#essai=/.test(pa.loc)], [302, true]);
  v('   les quatre clés que lit tour.html', Object.keys(pa.frag.stockage).sort(), ['tour_apps', 'tour_nom', 'tour_role', 'tour_token']);
  const sp = pa.frag.stockage;
  const mp = await S.appel('/api/monitor/moi', undefined, sp.tour_token);
  v('⛔ le jeton rangé passe `/api/monitor/moi` : patron, les deux applications', [mp.s, mp.j.nom, mp.j.role, mp.j.apps], [200, 'Patron Essai', 'patron', ['gestion', 'messages']]);
  v('   `tour_apps` se relit en JSON comme la page le fait, et dit la même chose que le serveur', [JSON.parse(sp.tour_apps), sp.tour_nom, sp.tour_role], [mp.j.apps, 'Patron Essai', 'patron']);
  v('   le patron lit les routes du patron', (await S.appel('/api/monitor/users', undefined, sp.tour_token)).s, 200);
  const co = await aller('collaborateur'), sc = co.frag.stockage;
  const mc = await S.appel('/api/monitor/moi', undefined, sc.tour_token);
  v('collaborateur : sa session est celle d\'un collaborateur, OP GESTION seule', [mc.s, mc.j.nom, mc.j.role, mc.j.apps], [200, 'Collaborateur Essai', 'collaborateur', ['gestion']]);
  v('⛔ …et les routes du patron lui sont REFUSÉES (403)', [(await S.appel('/api/monitor/users', undefined, sc.tour_token)).s, (await S.appel('/api/monitor/journal', undefined, sc.tour_token)).s], [403, 403]);
  v('un jeton de la Tour n\'ouvre pas le portail, ni l\'inverse', [(await S.appel('/api/compte/moi', undefined, sp.tour_token)).s, (await S.appel('/api/monitor/moi', undefined, cl.frag.stockage.teamop_portail_jeton)).s], [401, 401]);
  v('⛔ le mot de passe des comptes semés n\'a jamais servi : on ne peut PAS se connecter à « Patron Essai » par `/api/monitor/login` avec un mot de passe deviné', (await S.appel('/api/monitor/login', { nom: 'Patron Essai', pass: 'patron' })).s, 403);

  console.log('\n5. Les clés sont celles que LIT la page');
  const TOUR = sans(fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8')), ESP = sans(PAGE);
  vrai('espace.html range la session du portail sous `teamop_portail_jeton` (CLE_JETON) et la relit au démarrage', /const CLE_JETON = 'teamop_portail_jeton'/.test(ESP) && /localStorage\.getItem\(CLE_JETON\)/.test(ESP));
  vrai('tour.html relit `tour_token` (localStorage d\'abord), `tour_nom`, `tour_role` et `tour_apps` au démarrage', /localStorage\.getItem\('tour_token'\)\?localStorage:sessionStorage/.test(TOUR) && /st\.getItem\('tour_nom'\)/.test(TOUR) && /st\.getItem\('tour_role'\)/.test(TOUR) && /JSON\.parse\(st\.getItem\('tour_apps'\)/.test(TOUR));
  const SRV = sans(fs.readFileSync(path.join(RACINE, 'server', 'essais.js'), 'utf8'));
  vrai('essais.js range exactement ces cinq noms', ['teamop_portail_jeton', 'tour_token', 'tour_nom', 'tour_role', 'tour_apps'].every(k => new RegExp('\\b' + k + '\\b').test(SRV)));

  console.log('\n6. Le CORS et le test mal réglé');
  const cors = async (B, o) => (await fetch(B + '/health', { method: 'OPTIONS', headers: { Origin: o, 'Access-Control-Request-Method': 'POST' } })).headers.get('access-control-allow-origin');
  v('l\'origine de test (espaceTestOrigine) est admise, celle du site aussi, une autre non', [await cors(S.B, 'https://test.teamop.fr'), await cors(S.B, 'https://teamop.fr'), await cors(S.B, 'https://evil.example')], ['https://test.teamop.fr', 'https://teamop.fr', null]);
  await S.nettoyer();
  const mal = await B2.lancer({ essai: true, config: { espaceTestCle: 'trop-courte', courrielsCaptes: false, mailPreuveExigee: false } }); vivants.push(mal);
  vrai('démarre quand même', mal.vivant);
  v('⛔ une clé mal formée : les routes N\'EXISTENT PAS (404), même présentée à l\'identique', [(await mal.appel('/api/essais/courriels?cle=trop-courte')).s, (await mal.appel('/api/essais/remise-a-zero?cle=trop-courte', {})).s], [404, 404]);
  vrai('…le journal le dit', /espaceTestCle. absente ou mal formée/.test(mal.sortie()));
  vrai('…et `courrielsCaptes: false` n\'est PAS obéi : un oubli ne rouvre rien (avertissement au journal)', /courrielsCaptes. n'est pas posé/.test(mal.sortie()));
  await mal.appel('/api/compte/creer', { email: 'zoe@exemple-essai.fr', h: emp });
  await dormir(1200);
  v('⛔ la capture est forcée : le courriel est rangé sur le disque, le faux facteur n\'a vu aucune connexion', [fs.existsSync(path.join(mal.D, 'courriels-essais.json')) && JSON.parse(fs.readFileSync(path.join(mal.D, 'courriels-essais.json'), 'utf8')).some(x => x.a.some(a => /zoe@/.test(a))), mal.smtp.connexions()], [true, 0]);
  await mal.nettoyer();

  console.log('\n7. Un dossier qui n\'est pas vierge ne reçoit rien');
  const reel = await B2.lancer({ essai: true, config: { mailPreuveExigee: false },
    donnees: (D) => { fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ vraieentreprise: { nom: 'Vraie Entreprise', code: 'x', t: 'vraie-0001', ts: 1, email: 'vrai@vraie.example' } })); } }); vivants.push(reel);
  vrai('démarre', reel.vivant);
  await dormir(2500);
  v('⛔ aucune marque, aucun semis, aucun compte d\'essai : le dossier est resté tel qu\'il était', [fs.existsSync(path.join(reel.D, '.espace-de-test')), fs.existsSync(path.join(reel.D, 'essais-semis.json')), Object.keys(JSON.parse(fs.readFileSync(path.join(reel.D, 'espaces.json'), 'utf8')))], [false, false, ['vraieentreprise']]);
  vrai('…le journal le dit', /REMISE À ZÉRO REFUSÉE \(dossier_non_vierge\)/.test(reel.sortie()));
  const pasSeme = await reel.appel(avecCle('/api/essais/connexion?compte=client', reel.CLE));
  v('…et « Se connecter comme client » dit que rien n\'est semé (503), sans ouvrir de session', [pasSeme.s, pasSeme.j.error, pasSeme.h.get('location')], [503, 'pas_encore_seme', null]);
  vrai('(le courrier reste capté : aucune connexion au faux facteur)', reel.smtp.connexions() === 0);
  await reel.nettoyer();

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
