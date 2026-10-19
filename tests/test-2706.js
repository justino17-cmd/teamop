/* ⛔ CE QUE CE FICHIER GARDE — LES DOSSIERS CLIENTS (DOS-000123), LE VRAI SERVEUR (19 octobre 2026).
     · chaque client a UN numéro, de forme fermée, attribué dans l'ordre d'inscription, identique après un redémarrage ;
     · un numéro n'est JAMAIS réutilisé : client supprimé → sa fiche dit « supprimé », le nouveau client prend un numéro neuf ;
     · dossiers.json illisible : aucun numéro, 503 sur les deux routes, le fichier n'est pas réécrit par-dessus ;
     · seul le patron lit (la fiche porte le téléphone et l'adresse) ; numéro mal formé 400, inconnu 404 ;
     · la fiche porte ce qu'il faut pour rappeler le client, et le paiement est dit « on ne sait pas » quand on ne sait pas ;
     · l'adresse du client n'est écrite dans dossiers.json qu'en empreinte. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2706-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); fin(); process.exit(1); }, 120000).unref();
console.log('\n── 2706 · dossiers clients : le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const MDP = 'mot-de-passe-du-banc-2706'; let n = 0;
  const T0 = Date.now() - 10 * 86400000;
  const cl = (email, entreprise, jours, extra) => [email, Object.assign({ email, entreprise, inscrit: T0 + jours * 86400000 }, extra || {})];
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const ecrireClients = o => fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify(Object.fromEntries(o)));
  ecrireClients([cl('vieux@exemple-2706.fr', 'Vieux Client', 1, { tel: '06 12 34 56 78', prenom: 'Léa', nomFam: 'Martin', noteInterne: 'Rappeler après 18 h', demandes: [{ app: 'OP GESTION', formule: 'pro', statut: 'en attente', date: 5 }] }),
    cl('milieu@exemple-2706.fr', 'Milieu', 3), cl('recent@exemple-2706.fr', 'Récent', 5), cl('premier@exemple-2706.fr', 'Tout premier', 0)]);
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ vieuxclient: { t: 't-v-2706', nom: 'Vieux Client', email: 'vieux@exemple-2706.fr', ts: T0, formule: 'pro' } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP) }));
  async function demarrer(etiquette) {
    const PORT = 9400 + ((process.pid + (n++)) % 250); let journal = '';
    const e = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    vrai('le serveur « ' + etiquette + ' » démarre', vivant); if (!vivant) { console.log(journal.slice(0, 600)); process.exit(1); }
    const req = async (r, j) => { const x = await fetch(B + r, { headers: j ? { Authorization: 'Bearer ' + j } : {} }); let o = {}; try { o = await x.json(); } catch (y) {} return { s: x.status, j: o }; };
    const lg = await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) });
    const jeton = (await lg.json()).token;
    return { req, jeton, liste: q => req('/api/monitor/dossiers' + (q ? '?q=' + encodeURIComponent(q) : ''), jeton), fiche: x => req('/api/monitor/dossiers/' + x, jeton), arreter: async () => { e.kill('SIGKILL'); await dormir(300); }, journal: () => journal };
  }
  const lire = () => fs.readFileSync(path.join(D, 'dossiers.json'), 'utf8');

  console.log('\n1. Rétro-attribution : dans l\'ordre d\'inscription, forme fermée, stable');
  let S = await demarrer('premier démarrage');
  let L = await S.liste();
  v('la liste répond 200', L.s, 200);
  const num = Object.fromEntries(L.j.dossiers.map(d => [d.entreprise, d.numero]));
  v('quatre clients, quatre numéros', Object.keys(num).length, 4);
  vrai('chaque numéro a la forme DOS-nnnnnn', Object.values(num).every(x => /^DOS-\d{6}$/.test(x)));
  v('le plus ancien inscrit prend DOS-000001', num['Tout premier'], 'DOS-000001');
  v('puis dans l\'ordre d\'inscription', [num['Vieux Client'], num['Milieu'], num['Récent']], ['DOS-000002', 'DOS-000003', 'DOS-000004']);
  vrai('(population) quatre numéros distincts', new Set(Object.values(num)).size === 4);
  const brut = lire();
  vrai('dossiers.json ne porte aucune adresse en clair', !/exemple-2706|@/.test(brut));

  console.log('\n2. La fiche : de quoi rappeler le client');
  let F = await S.fiche('DOS-000002');
  v('la fiche répond 200', F.s, 200);
  const d = F.j.dossier || {};
  v('entreprise', d.client && d.client.entreprise, 'Vieux Client');
  v('téléphone', d.client && d.client.tel, '06 12 34 56 78');
  v('adresse e-mail', d.client && d.client.email, 'vieux@exemple-2706.fr');
  v('prénom et nom', [d.client && d.client.prenom, d.client && d.client.nom], ['Léa', 'Martin']);
  v('note interne', d.client && d.client.note, 'Rappeler après 18 h');
  v('l\'espace existant est trouvé', [d.espace && d.espace.existe, d.espace && d.espace.slug], [true, 'vieuxclient']);
  v('les demandes sont là', (d.demandes || []).length, 1);
  vrai('le paiement est dans l\'ensemble fermé', ['paye', 'impaye', 'aucun', 'inconnu'].includes(d.paiement && d.paiement.etat));
  F = await S.fiche('DOS-000003');
  v('un client sans espace le dit', F.j.dossier.espace, { existe: false });
  v('numéro mal formé → 400', (await S.fiche('DOS-12')).s, 400);
  v('numéro bien formé mais inconnu → 404', (await S.fiche('DOS-999999')).s, 404);
  v('le numéro se lit aussi en minuscules', (await S.fiche('dos-000002')).s, 200);
  L = await S.liste('vieux'); v('chercher par nom', L.j.dossiers.map(x => x.numero), ['DOS-000002']);
  L = await S.liste('DOS-000004'); v('chercher par numéro', L.j.dossiers.map(x => x.entreprise), ['Récent']);
  v('sans jeton → refusé', (await S.req('/api/monitor/dossiers')).s >= 401, true);
  v('fiche sans jeton → refusée', (await S.req('/api/monitor/dossiers/DOS-000002')).s >= 401, true);
  v('jeton bidon → refusé', (await S.req('/api/monitor/dossiers/DOS-000002', 'bidon')).s >= 401, true);

  console.log('\n3. Un redémarrage ne change aucun numéro');
  await S.arreter(); S = await demarrer('second démarrage');
  L = await S.liste();
  v('mêmes numéros après redémarrage', Object.fromEntries(L.j.dossiers.map(x => [x.entreprise, x.numero])), num);

  console.log('\n4. Jamais réutilisé : un client supprimé garde son numéro, le suivant en prend un neuf');
  await S.arreter();
  ecrireClients([cl('vieux@exemple-2706.fr', 'Vieux Client', 1), cl('milieu@exemple-2706.fr', 'Milieu', 3), cl('premier@exemple-2706.fr', 'Tout premier', 0), cl('nouveau@exemple-2706.fr', 'Nouveau', 9)]);
  S = await demarrer('après suppression');
  F = await S.fiche('DOS-000004');
  v('la fiche du supprimé dit « supprimé »', [F.s, F.j.dossier && F.j.dossier.supprime], [200, true]);
  vrai('…et ne porte aucune coordonnée', !/exemple-2706|Récent/.test(JSON.stringify(F.j)));
  L = await S.liste();
  v('le nouveau client prend DOS-000005, pas DOS-000004', (L.j.dossiers.find(x => x.entreprise === 'Nouveau') || {}).numero, 'DOS-000005');
  v('le supprimé n\'est plus dans la liste', L.j.dossiers.some(x => x.entreprise === 'Récent'), false);
  await S.arreter();

  console.log('\n5. dossiers.json illisible : on n\'invente rien, on n\'écrase rien');
  fs.writeFileSync(path.join(D, 'dossiers.json'), '{"prochain": 5, "parCle": {');
  const avant = lire();
  S = await demarrer('fichier illisible');
  v('la liste dit 503', (await S.liste()).s, 503);
  v('la fiche dit 503', (await S.fiche('DOS-000002')).s, 503);
  v('le fichier illisible n\'est pas réécrit', lire(), avant);
  await S.arreter();
  fs.writeFileSync(path.join(D, 'dossiers.json'), JSON.stringify({ prochain: 3, parCle: { x: 'pas-un-numero' } }));
  S = await demarrer('numéro illisible');
  v('un numéro de forme étrangère rend le registre illisible (503)', (await S.liste()).s, 503);
  await S.arreter();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + (e && e.stack || e)); process.exit(1); });
