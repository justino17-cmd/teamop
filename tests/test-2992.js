/* ⛔ CE QUE CE FICHIER GARDE — CE QUE L'ESPACE DE TEST NE PEUT PAS ATTEINDRE DE LA PRODUCTION, ET QUI NE PASSE PAR AUCUN AUTRE BANC (relecture adverse, 23 octobre 2026).

   Cinq défauts, chacun rejoué sur le VRAI serveur (`banc-essais.js`), chacun avec sa contre-épreuve « sans espaceTest, la production est celle d'avant » :
     1. UNE CLÉ STRIPE RÉELLE DANS LA CONFIGURATION DE TEST : `sk_live_…` posée par erreur (ou à la main) était acceptée — `/health` disait `stripe:true`, et la Tour de test aurait
        listé les abonnements et les impayés de VRAIS clients. Le serveur de test la VIDE (journal : « IGNORÉE », sans la clé), une clé `sk_test_` reste, et la production ne change pas ;
     2. FIREBASE DE PRODUCTION : sans clé d'administration, le serveur se faisait un jeton anonyme sur le projet `elan-gestion` puis effaçait `elan_teams/<t>` (renaître, fermer un
        client, supprimer une entreprise). Un FAUX Firestore et un faux Identity Toolkit (127.0.0.1) COMPTENT chaque requête : zéro en mode test pour les trois routes de la Tour, et la
        même suppression EN PRODUCTION en fait (la preuve que le compteur voit quelque chose — population avant absence) ;
     3. LA REMISE À ZÉRO LAISSAIT `monitor.json` : incidents et journal de la Tour d'avant survivaient à « les données d'essai sont vidées » ;
     4. LA CLÉ DES ROUTES D'ESSAI VOYAGE EN EN-TÊTE (`X-Essai-Cle`) : une adresse s'écrit dans le journal de nginx ; l'en-tête ouvre, une mauvaise valeur refuse, le paramètre marche encore
        (les liens de navigation), et un en-tête faux ne se rattrape pas par un bon paramètre ignoré ;
     5. LES SEIZE AGENTS EN PARALLÈLE NE DÉPASSENT PLUS LE PLAFOND DE TEST D'UNE POIGNÉE D'APPELS : près du plafond, les appels déjà en vol comptent — et la production (pas de plafond de test)
        garde exactement son comportement (les appels simultanés passent tous).
   Jamais api.teamop.fr, jamais Google, jamais un vrai Claude. */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const B2 = require('./banc-essais');
const { RACINE, dormir, attendre, lireFragment } = B2;
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300) : '')); } };
const vivants = [], fermables = [];
const fin = () => { for (const s of vivants) { try { s.enfant() && s.enfant().kill('SIGKILL'); } catch (e) {} try { s.smtp.s.close(); } catch (e) {} try { fs.rmSync(s.banc, { recursive: true, force: true }); } catch (e) {} } for (const f of fermables) { try { f.close(); } catch (e) {} } };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 170000).unref();

/* Un faux Google : Firestore ET Identity Toolkit sur le même port local. Il note chaque requête (méthode, chemin SANS la chaîne de requête, qui porte la clé web). */
function fauxGoogle() {
  const vues = [];
  const s = http.createServer((q, r) => { q.resume(); q.on('end', () => {
    vues.push(q.method + ' ' + q.url.split('?')[0]);
    r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(JSON.stringify({ idToken: 'jeton-anonyme-du-banc', users: [], documents: [] }));
  }); });
  return { s, vues };
}

(async () => {
  console.log('\n── test-2992 : ce que l\'espace de test ne peut pas atteindre de la production ──');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const CANARI_LIVE = 'sk_live_' + 'CANARIlive0123456789ABCD';
  const CLE_TEST = 'sk_test_' + 'bancTest0123456789ABCD';

  /* ═══ 1. LA CLÉ STRIPE ═══ */
  console.log('\n1. Une clé Stripe réelle dans la configuration de test');
  const sante = async (S) => (await S.appel('/health')).j;
  const essaiLive = await B2.lancer({ essai: true, config: { stripe: { secretKey: CANARI_LIVE } } }); vivants.push(essaiLive);
  vrai('le serveur de test démarre avec une clé sk_live_ dans sa configuration', essaiLive.vivant);
  v('⛔ /health dit stripe:false — la clé réelle est IGNORÉE', (await sante(essaiLive)).stripe, false);
  vrai('…le journal le dit, sans écrire la clé', /Stripe reste éteint dans l'espace de test/.test(essaiLive.sortie()) && !essaiLive.sortie().includes(CANARI_LIVE));
  const essaiRk = await B2.lancer({ essai: true, config: { stripe: { secretKey: 'rk_live_' + 'CANARIrestreinte0123456789' } } }); vivants.push(essaiRk);
  v('une clé RESTREINTE de production (rk_live_) est ignorée aussi', (await sante(essaiRk)).stripe, false);
  const essaiTest = await B2.lancer({ essai: true, config: { stripe: { secretKey: CLE_TEST } } }); vivants.push(essaiTest);
  v('(population) une clé sk_test_ est GARDÉE : /health dit stripe:true', (await sante(essaiTest)).stripe, true);
  const prodLive = await B2.lancer({ essai: false, config: { stripe: { secretKey: CANARI_LIVE } } }); vivants.push(prodLive);
  v('⛔ SANS espaceTest, la production garde sa clé réelle : stripe:true (la garde ne la touche pas)', (await sante(prodLive)).stripe, true);
  vrai('…et le journal ne parle pas de l\'espace de test', !/essais :/.test(prodLive.sortie()));

  /* ═══ 2. FIREBASE ═══ */
  console.log('\n2. Firebase de production : aucune requête depuis le serveur de test');
  const g = fauxGoogle(); fermables.push(g.s); await new Promise(r => g.s.listen(0, '127.0.0.1', r));
  const envG = { TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:' + g.s.address().port, TEAMOP_IDTK_URL: 'http://127.0.0.1:' + g.s.address().port };
  const fauxA = B2.fauxAnthropic(); await new Promise(r => fauxA.s.listen(0, '127.0.0.1', r));
  const banc = fs.mkdtempSync(path.join(require('os').tmpdir(), 'b2992-'));
  const S = await B2.lancer({ essai: true, banc, anthropic: fauxA, env: envG, sansFbAdmin: false, config: { mailPreuveExigee: false, agents: { cleApi: 'sk-ant-banc', plafondMoisTotal: 10, reunionsAuto: false } } }); vivants.push(S);
  vrai('le serveur de test démarre (le faux Google est branché par les variables de banc)', S.vivant);
  vrai('le semis est fait', await attendre(() => fs.existsSync(path.join(S.D, 'essais-semis.json')), 200));
  const tPatron = lireFragment((await S.appel('/api/essais/connexion?compte=patron&cle=' + S.CLE)).h.get('location')).stockage.tour_token;
  const tClim = JSON.parse(fs.readFileSync(path.join(S.D, 'espaces.json'), 'utf8')).climessai.t;
  vrai('(population) « Clim Essai » existe dans l\'annuaire de test, avec son identifiant', typeof tClim === 'string' && tClim.length > 4);
  const avant = g.vues.length;
  const r1 = await S.appel('/api/monitor/espaces/renaitre', { nom: 'climessai', confirme: true }, tPatron);
  vrai('« Repartir à neuf » est accepté par la route (la route est bien atteinte)', r1.s === 200 && r1.j.ok === true, [r1.s, r1.txt.slice(0, 120)]);
  const r2 = await S.appel('/api/monitor/entreprise/supprimer', { t: 'orphelin-banc-2992', confirme: true }, tPatron);
  vrai('« Supprimer totalement » une entreprise est accepté par la route', r2.s === 200 && r2.j.supprime === true, [r2.s, r2.txt.slice(0, 160)]);
  v('⛔ le faux Google n\'a reçu AUCUNE requête (ni inscription anonyme, ni suppression de document)', g.vues.slice(avant), []);
  vrai('…et la Tour de test ne se plaint pas de Firestore : rien à y effacer n\'est un état propre, pas un échec', !/n'a pas pu être écrite ou effacée/.test(r2.j.avertissement || ''), r2.j.avertissement);
  const retire = await S.appel('/api/monitor/clients/retirer', { email: 'prospect@exemple-essai.fr', confirme: true }, tPatron);
  vrai('(la fermeture d\'un client est atteinte aussi : ' + retire.s + ')', retire.s === 200 || retire.s === 404, retire.txt.slice(0, 120));
  v('⛔ …et toujours aucune requête vers Google', g.vues.slice(avant), []);

  /* La même suppression EN PRODUCTION : la population qui prouve que le compteur voit quelque chose. */
  const gp = fauxGoogle(); fermables.push(gp.s); await new Promise(r => gp.s.listen(0, '127.0.0.1', r));
  const P = await B2.lancer({ essai: false, env: { TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:' + gp.s.address().port, TEAMOP_IDTK_URL: 'http://127.0.0.1:' + gp.s.address().port } }); vivants.push(P);
  vrai('le serveur de production (sans espaceTest) démarre', P.vivant);
  const tP = await P.tour();
  const rp = await P.appel('/api/monitor/entreprise/supprimer', { t: 'orphelin-banc-2992', confirme: true }, tP);
  vrai('la suppression est acceptée en production', rp.s === 200 && rp.j.supprime === true, [rp.s, rp.txt.slice(0, 160)]);
  vrai('⛔ …et EN PRODUCTION le faux Google reçoit bien l\'inscription anonyme ET la suppression du document (' + JSON.stringify(gp.vues) + ') — la production est celle d\'avant',
    gp.vues.some(x => /signUp/.test(x)) && gp.vues.some(x => /^DELETE .*\/elan_teams\/orphelin-banc-2992$/.test(x)));
  vrai('…sur le projet de production (elan-gestion)', gp.vues.some(x => /\/projects\/elan-gestion\//.test(x)));

  /* ═══ 3. LA REMISE À ZÉRO ET monitor.json ═══ */
  console.log('\n3. La remise à zéro vide aussi monitor.json');
  const MON = path.join(banc, 'monitor.json');
  const dispo = await attendre(() => fs.existsSync(MON), 40, 200);
  vrai('(population) le serveur a rangé monitor.json à côté de sa configuration', dispo);
  const AVANT_RAZ = { issues: [{ id: 'i-banc-2992', app: 'espace', msg: 'incident d\'avant la remise à zéro' }], users: JSON.parse(fs.readFileSync(MON, 'utf8')).users || [], journal: [{ t: Date.now(), nom: 'Patron', ok: true, action: 'journal d\'avant la remise à zéro' }], archive: [], actions: [] };
  /* on arrête le serveur AVANT d'écrire (il réécrit ce fichier en place), comme le fait la vraie remise à zéro : on pose la demande puis on redémarre */
  const rz = await S.appel('/api/essais/remise-a-zero', {}, null, 'POST');
  v('(sans clé la route refuse)', rz.s, 403);
  await S.arreter();
  fs.writeFileSync(MON, JSON.stringify(AVANT_RAZ));
  fs.writeFileSync(path.join(S.D, '.remise-a-zero'), String(Date.now()));
  const bon = await S.demarrer();
  vrai('le serveur redémarre sur la demande', bon);
  await attendre(() => { try { return JSON.parse(fs.readFileSync(path.join(S.D, 'essais-semis.json'), 'utf8')) && fs.existsSync(path.join(S.D, '.espace-de-test')); } catch (e) { return false; } }, 100);
  await attendre(() => { try { return (JSON.parse(fs.readFileSync(MON, 'utf8')).users || []).length >= 2; } catch (e) { return false; } }, 100, 200);
  const apres = JSON.parse(fs.readFileSync(MON, 'utf8'));
  v('⛔ l\'incident d\'avant a disparu', (apres.issues || []).filter(i => i.id === 'i-banc-2992'), []);
  v('⛔ le journal d\'avant a disparu', (apres.journal || []).filter(j => /d'avant la remise/.test(JSON.stringify(j))), []);
  vrai('(population) les deux comptes de la Tour de test sont revenus par le semis', (apres.users || []).length >= 2, (apres.users || []).length);
  vrai('le journal du serveur le dit', /journal et incidents de la Tour compris/.test(S.sortie()));
  /* une config dont le monitor serait celui de la PRODUCTION n'est jamais vidé, et un fichier qui n'existe pas n'est pas créé */
  const E = require('../server/essais');
  const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'b2992m-'));
  v('viderMonitor refuse le monitor.json de la production, nommé en toutes lettres', E.viderMonitor('/opt/teamop/monitor.json'), false);
  v('…refuse un fichier qui s\'appelle autrement', (() => { fs.writeFileSync(path.join(tmp, 'autre.json'), '{"a":1}'); return [E.viderMonitor(path.join(tmp, 'autre.json')), fs.readFileSync(path.join(tmp, 'autre.json'), 'utf8')]; })(), [false, '{"a":1}']);
  v('…ne CRÉE rien là où il n\'y a pas de monitor.json', [E.viderMonitor(path.join(tmp, 'monitor.json')), fs.existsSync(path.join(tmp, 'monitor.json'))], [false, false]);
  fs.rmSync(tmp, { recursive: true, force: true });

  /* ═══ 4. LA CLÉ EN EN-TÊTE ═══ */
  console.log('\n4. La clé des routes d\'essai en en-tête');
  const avecEntete = async (route, cle, extra) => { const r = await fetch(S.B + route + (extra || ''), { headers: cle === null ? {} : { 'X-Essai-Cle': cle }, redirect: 'manual' }); return r.status; };
  v('l\'en-tête X-Essai-Cle ouvre la liste des courriels', await avecEntete('/api/essais/courriels', S.CLE), 200);
  v('⛔ un en-tête FAUX refuse (403)', await avecEntete('/api/essais/courriels', 'ab'.repeat(32)), 403);
  v('⛔ un en-tête faux ne se rattrape PAS par une bonne clé en paramètre (on ne devine pas lequel des deux croire)', await avecEntete('/api/essais/courriels', 'ab'.repeat(32), '?cle=' + S.CLE), 403);
  v('le paramètre ?cle= marche encore (les liens de navigation)', (await S.appel('/api/essais/courriels?cle=' + S.CLE)).s, 200);
  v('sans clé du tout : 403', await avecEntete('/api/essais/courriels', null), 403);
  v('l\'en-tête ouvre aussi la connexion (redirection 302 vers la page de test)', await avecEntete('/api/essais/connexion', S.CLE, '?compte=client'), 302);

  /* ═══ 5. LE PLAFOND DES AGENTS, EN PARALLÈLE ═══ */
  console.log('\n5. Seize appels simultanés près du plafond de test');
  const cerveau = require('../server/cerveau');
  const tmp2 = fs.mkdtempSync(path.join(require('os').tmpdir(), 'b2992c-'));
  const faux = { AGENTS: [{ id: 'lea', plafondUsd: 1000 }], peutAgir: () => ({ ok: true }), noter() {} };
  const mois = new Date().toISOString().slice(0, 7);
  const monter = (nom, plafond, depense) => {
    const d = path.join(tmp2, nom); fs.mkdirSync(d, { recursive: true });
    fs.writeFileSync(path.join(d, 'agents-budget.json'), JSON.stringify({ mois, parAgent: { examen: depense } }));
    let appels = 0;
    const appeler = async () => { appels++; await dormir(60); return { texte: 'ok', entree: 100, sortie: 100 }; };
    const c = cerveau(Object.assign({ DATA_DIR: d, agents: faux, cleApi: 'k', appeler }, plafond === null ? {} : { plafondTotalUsd: plafond }));
    return { c, appels: () => appels };
  };
  const seize = async (m) => { const rs = await Promise.all(Array.from({ length: 16 }, () => m.c.penser('lea', 'sys', [{ role: 'user', content: 'bonjour' }]))); return rs; };
  {
    const m = monter('test', 10, 9.999);
    const rs = await seize(m);
    const passes = rs.filter(r => r.ok).length, refus = rs.filter(r => !r.ok && r.raison === 'plafond_total').length;
    v('⛔ à 9,999 $ du plafond de 10 $, SEIZE appels simultanés : un seul passe, les quinze autres sont refusés (`plafond_total`)', [passes, refus, m.appels()], [1, 15, 1]);
  }
  {
    const m = monter('prod', null, 194.999);
    const rs = await seize(m);
    v('⛔ SANS plafond de test (la production), le comportement est celui d\'avant : les seize passent (la vérification d\'avant l\'appel ne voit pas les appels en vol)', [rs.filter(r => r.ok).length, m.appels()], [16, 16]);
  }
  {
    const m = monter('loin', 10, 0);
    const rs = await seize(m);
    v('loin du plafond (0 $ dépensé), les seize passent : la réservation ne bride personne qui n\'est pas près du plafond', rs.filter(r => r.ok).length, 16);
    const rs2 = await seize(m);
    v('(et la réservation est RENDUE après chaque réponse : seize de plus passent encore)', rs2.filter(r => r.ok).length, 16);
  }
  fs.rmSync(tmp2, { recursive: true, force: true });

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('  ✗ banc en erreur :', e && e.stack || e); process.exit(1); });
