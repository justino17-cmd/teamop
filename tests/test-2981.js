/* ⛔ CE QUE CE FICHIER GARDE — SANS `espaceTest`, LE SERVEUR EST CELUI D'AVANT, À L'IDENTIQUE (23 octobre 2026, l'espace de test).

   `server/` est une publication : un push le déploie chez des clients réels. Tout ce que le mode test ajoute doit donc être INERTE en production — et « inerte » se prouve sur
   le VRAI serveur, avec la configuration de production, y compris quand elle porte par erreur les réglages du serveur de test (la clé, l'origine, `courrielsCaptes`,
   le plafond des agents) ou un `espaceTest` qui n'est pas exactement `true` (« true », 1, « oui »).
     1. les trois routes `/api/essais/*` répondent 404 — même avec la bonne clé, quelle que soit la méthode ;
     2. un courriel PART : un faux serveur d'envoi compte ses connexions (une inscription du portail ouvre une connexion, le message arrive, lien en https://teamop.fr),
        le chemin direct de `/api/sendmail` (SMTP d'un client) aussi ; rien n'est capté (aucun `courriels-essais.json`) ;
     3. aucun dossier de test : ni marque, ni semis, ni comptes d'essai dans la Tour ;
     4. l'origine de test n'est pas admise en CORS (l'origine du site l'est toujours) ;
     5. le plafond des agents ne baisse pas : 10 $ dépensés, un agent répond encore (`test-2983` joue le même scénario AVEC `espaceTest`, où il se tait) ;
     6. `comptes.actif` ne s'allume pas tout seul : sans lui, les routes du portail restent absentes.
   Le vrai serveur, un faux facteur et un faux Anthropic sur 127.0.0.1. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const B2 = require('./banc-essais');
const { RACINE, dormir, attendre, lisible } = B2;
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const vivants = [];
const fin = () => { for (const s of vivants) { try { s.enfant() && s.enfant().kill('SIGKILL'); } catch (e) {} try { s.smtp.s.close(); } catch (e) {} try { fs.rmSync(s.banc, { recursive: true, force: true }); } catch (e) {} } };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 150000).unref();

(async () => {
  console.log('\n── test-2981 : sans espaceTest, le serveur ne change pas ──');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const CLE_LEURRE = 'ab'.repeat(32);
  /* La configuration de PRODUCTION qui porte, par erreur, tous les réglages du serveur de test — sauf `espaceTest` lui-même. */
  const reglagesDeTest = { mailPreuveExigee: false /* (le banc rouvre la preuve de clé : /api/sendmail ne s'ouvre pas autrement à un espace inventé) */, espaceTestCle: CLE_LEURRE, espaceTestOrigine: 'https://test.teamop.fr', courrielsCaptes: true, agents: { plafondMoisTotal: 10, cleApi: 'sk-ant-banc', reunionsAuto: false } };
  const faux = B2.fauxAnthropic(); await new Promise(r => faux.s.listen(0, '127.0.0.1', r));
  const prodSrv = await B2.lancer({ essai: false, config: reglagesDeTest, anthropic: faux });
  vivants.push(prodSrv);
  vrai('le vrai serveur démarre avec la config de production (réglages de test présents, `espaceTest` absent)', prodSrv.vivant);
  const S = prodSrv;

  console.log('\n1. Les trois routes n\'existent pas');
  const routes = ['/api/essais/courriels', '/api/essais/connexion?compte=client', '/api/essais/remise-a-zero', '/api/essais/inconnue'];
  const rep = [];
  for (const r of routes) for (const m of ['GET', 'POST']) rep.push((await S.appel(r + (r.includes('?') ? '&' : '?') + 'cle=' + CLE_LEURRE, m === 'POST' ? {} : undefined, null, m)).s);
  v('⛔ 404 partout, MÊME avec la bonne clé (celle du config), en GET comme en POST', rep, rep.map(() => 404));
  v('…et sans clé', [(await S.appel('/api/essais/courriels')).s, (await S.appel('/api/essais/remise-a-zero', {})).s], [404, 404]);
  vrai('(population) le serveur répond bien ailleurs : /health 200', (await S.appel('/health')).s === 200);
  const sortie1 = S.sortie();
  vrai('le journal ne parle ni d\'espace de test, ni de routes montées', !/ESPACE DE TEST|essais :/.test(sortie1));

  console.log('\n2. Un courriel PART');
  const emp = crypto.randomBytes(32).toString('hex');
  const c0 = S.smtp.connexions();
  v('une inscription du portail est acceptée', (await S.appel('/api/compte/creer', { email: 'nouveau@exemple-essai.fr', h: emp, prenom: 'N', nom: 'N', societe: 'S' })).s, 200);
  const m1 = await attendre(() => S.smtp.recus.map(lisible).find(m => /^To:[^\n]*nouveau@exemple-essai\.fr/mi.test(m) && /mode=verifyEmail/.test(m)), 60);
  vrai('⛔ le courriel de confirmation ARRIVE au faux serveur d\'envoi', m1);
  vrai('   par une connexion de plus', S.smtp.connexions() > c0);
  vrai('   avec le lien de la PRODUCTION (https://teamop.fr/reinit.html…), pas celui d\'un espace de test', m1 && /https:\/\/teamop\.fr\/reinit\.html\?mode=verifyEmail&jeton=/.test(m1) && !/test\.teamop\.fr/.test(m1));
  vrai('⛔ rien n\'est capté : pas de `courriels-essais.json`', !fs.existsSync(path.join(S.D, 'courriels-essais.json')));
  /* le chemin DIRECT : le SMTP d'un client, par /api/sendmail (nodemailer.createTransport à la main, hors mailerEnvoi) */
  const tEsp = 'banc-' + crypto.randomBytes(3).toString('hex');
  await S.appel('/api/connexions', { t: tEsp, ev: 'connexion', login: 'x' });
  const n0 = S.smtp.recus.length;
  const sm = await S.appel('/api/sendmail', { teamId: tEsp, to: 'dest@exemple-essai.fr', subject: 'Chemin direct', text: 'bonjour', smtp: { host: '127.0.0.1', port: S.smtp.s.address().port, user: 'u', pass: 'p', from: 'client@exemple-essai.fr' } });
  v('l\'envoi par le SMTP d\'un client est accepté', [sm.s, sm.j.ok], [200, true]);
  vrai('⛔ …et il PART aussi (le faux serveur reçoit un message de plus, pour dest@)', await attendre(() => S.smtp.recus.length > n0 && S.smtp.recus.map(lisible).slice(n0).some(m => /^To:[^\n]*dest@exemple-essai\.fr/mi.test(m)), 60));

  console.log('\n3. Aucun dossier de test');
  const noms = fs.readdirSync(S.D);
  v('ni marque, ni demande, ni semis, ni courriels captés', noms.filter(n => n === '.espace-de-test' || n === '.remise-a-zero' || n === 'essais-semis.json' || n === 'courriels-essais.json'), []);
  vrai('(population) le dossier de données contient bien d\'autres fichiers', noms.length > 3);
  const espaces = fs.existsSync(path.join(S.D, 'espaces.json')) ? fs.readFileSync(path.join(S.D, 'espaces.json'), 'utf8') : '';
  vrai('aucune entreprise semée (pas de « Clim Essai »), aucun client semé', !/climessai/i.test(espaces) && !/climessai|prospect@exemple-essai/i.test(fs.existsSync(path.join(S.D, 'clients.json')) ? fs.readFileSync(path.join(S.D, 'clients.json'), 'utf8') : ''));
  const T = await S.tour();
  vrai('la Tour ouvre sa session par le mot de passe de la config (pas de compte « Patron Essai »)', T);
  v('   et son équipe est celle de la config : aucun utilisateur semé', (await S.appel('/api/monitor/users', undefined, T)).j.users || [], []);

  console.log('\n4. Le CORS');
  const cors = async (origine) => (await fetch(S.B + '/health', { method: 'OPTIONS', headers: { Origin: origine, 'Access-Control-Request-Method': 'POST' } })).headers.get('access-control-allow-origin');
  v('⛔ l\'origine de TEST n\'est pas admise (le réglage `espaceTestOrigine` seul ne l\'ouvre pas)', await cors('https://test.teamop.fr'), null);
  v('l\'origine du site l\'est toujours', await cors('https://teamop.fr'), 'https://teamop.fr');

  console.log('\n5. Le plafond des agents ne baisse pas');
  /* 10 $ déjà dépensés ce mois-ci : sous le plafond de test (10 $), au-dessous de celui de production (195 $) */
  S.arreter && await S.arreter();
  const faux2 = B2.fauxAnthropic(); await new Promise(r => faux2.s.listen(0, '127.0.0.1', r));
  const mois = new Date().toISOString().slice(0, 7);
  const prod2 = await B2.lancer({ essai: false, config: reglagesDeTest, anthropic: faux2, donnees: (D) => fs.writeFileSync(path.join(D, 'agents-budget.json'), JSON.stringify({ mois, parAgent: { examen: 10.5 } })) });
  vivants.push(prod2);
  const T2 = await prod2.tour();
  v('(population) le budget du mois porte 10,50 $ dépensés', JSON.parse(fs.readFileSync(path.join(prod2.D, 'agents-budget.json'), 'utf8')).parAgent.examen, 10.5);
  const aut = (await prod2.appel('/api/monitor/agents/mode', { agent: 'lea', mode: 'brouillon' }, T2)).s;
  const env = (await prod2.appel('/api/monitor/conversations/envoyer', { fil: 'lea', texte: 'Léa, un point ?' }, T2)).s;
  v('Léa est en brouillon, la question part', [aut, env], [200, 200]);
  vrai('⛔ Léa interroge Claude malgré les 10,50 $ du mois : le plafond de production est resté à 195 $ (le réglage de test est ignoré)', await attendre(() => faux2.recus.length >= 1, 80));

  console.log('\n6. Un `espaceTest` qui n\'est pas exactement `true` ne lève rien');
  for (const valeur of ['true', 1, 'oui']) {
    const s = await B2.lancer({ essai: false, config: Object.assign({ espaceTest: valeur }, reglagesDeTest, { agents: { reunionsAuto: false } }) }); vivants.push(s);
    const r3 = [(await s.appel('/api/essais/courriels?cle=' + CLE_LEURRE)).s, fs.existsSync(path.join(s.D, '.espace-de-test')), fs.existsSync(path.join(s.D, 'essais-semis.json'))];
    v('espaceTest: ' + JSON.stringify(valeur) + ' → routes 404, ni marque ni semis', r3, [404, false, false]);
    await s.nettoyer();
  }
  const sansComptes = await B2.lancer({ essai: false, config: { comptes: { actif: false } } }); vivants.push(sansComptes);
  v('⛔ sans `comptes.actif`, les routes du portail restent absentes (le mode test ne les allume que chez lui)', (await sansComptes.appel('/api/compte/connexion', { email: 'a@exemple-essai.fr', h: 'x'.repeat(20) })).s, 404);
  await sansComptes.nettoyer();

  await prodSrv.nettoyer(); await prod2.nettoyer(); faux.s.close(); faux2.s.close();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
