/* ⛔ CE QUE CE FICHIER GARDE — LES CLIENTS DU PORTAIL, LE JOUR OÙ IL QUITTE GOOGLE.

   Décision de Justin, 25 septembre 2026 : la mise à jour publique supprime Firebase — le
   portail (`espace.html`) compris. Ses dossiers sont repris de Firestore par
   `POST /api/monitor/portail/importer` et rangés sous l'ADRESSE du client. Or un mot de passe
   Firebase ne se lit pas : le client doit en choisir un nouveau.

   ⛔ LE RISQUE, RELEVÉ LE JOUR MÊME : la connexion maison n'exige pas une adresse vérifiée. Entre
   l'import et le moment où le vrai client revient, n'importe qui pouvait « créer un compte » avec
   son adresse et lire son dossier. L'import crée donc, pour chaque adresse reprise, un compte
   « À POSER » (`preparer`, comptes.js) : sans mot de passe, refusé à la connexion comme une
   adresse inconnue, et que SEUL le lien de « Mot de passe oublié », reçu dans la boîte du
   client, ouvre.

   On monte les VRAIS modules (`comptes.js`, `portail.js`), branchés comme `index.js` les branche,
   et on parle en HTTP, avec un courrier de banc qui garde ce qui part. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const emp = (mdp) => sha('teamop-portail:' + mdp);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 60000).unref();

console.log('\n── 811 · les clients du portail repris de Google : leur compte les attend, personne d\'autre ne le prend ──');
(async () => {
  let express;
  try { express = require(path.join(RACINE, 'server', 'node_modules', 'express')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'b811-'));
  const app = express(); app.use(express.json());
  const courrier = [];
  const comptes = require(path.join(RACINE, 'server', 'comptes.js')).monterComptes(app, {
    dossier: dir, mailerEnvoi: async (o) => { courrier.push(o); }, quotaOk: () => true, journal: () => {} });
  const ADMIN = 'b'.repeat(40);
  const portail = require(path.join(RACINE, 'server', 'portail.js')).monterPortail(app, {
    dossier: dir, parJeton: comptes.parJeton, quotaOk: () => true, journal: () => {}, preparer: comptes.preparer,
    admin: (q, r, n) => (q.headers['x-admin'] === ADMIN ? n() : r.status(401).json({ error: 'tour' })),
    lireFirestore: async () => ([
      { email: 'Client.Ancien@Exemple.fr', prenom: 'Client', nom: 'Ancien', company: 'Nettoyage Ancien', formule: 'pro' },
      { email: 'deja@exemple.fr', prenom: 'Déjà', nom: 'Là', company: 'Déjà Là' },
      { email: '', prenom: 'Sans', nom: 'Adresse' },
    ]) });
  const srv = await new Promise(res => { const s = app.listen(0, '127.0.0.1', () => res(s)); });
  const B = 'http://127.0.0.1:' + srv.address().port;
  const post = async (route, corps, en) => { const r = await fetch(B + route, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, en || {}), body: JSON.stringify(corps || {}) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  const get = async (route, jeton) => { const r = await fetch(B + route, { headers: jeton ? { Authorization: 'Bearer ' + jeton } : {} });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };

  try {
    /* Un client déjà inscrit AVANT l'import, chez nous : son compte ne doit pas bouger. */
    await post('/api/compte/creer', { email: 'deja@exemple.fr', h: emp('mot-de-passe-deja-la') });
    const avantDeja = JSON.stringify(comptes._reg().c['deja@exemple.fr']);

    /* ── l'import ── */
    let r = await post('/api/monitor/portail/importer', {});
    v('l\'import exige la Tour', r.s, 401);
    r = await post('/api/monitor/portail/importer', {}, { 'x-admin': ADMIN });
    v('⛔ l\'import reprend les dossiers ET prépare un compte « à poser » pour l\'adresse sans compte',
      [r.s, r.j.repris, r.j.comptesPrepares], [200, 2, 1]);
    const c0 = comptes._reg().c['client.ancien@exemple.fr'];
    v('   ce compte n\'a aucun mot de passe', c0 && [c0.ap, c0.s, c0.e, c0.v], [1, '', '', 0]);
    v('⛔ un compte qui existait déjà n\'est pas touché d\'un octet', JSON.stringify(comptes._reg().c['deja@exemple.fr']), avantDeja);
    r = await post('/api/monitor/portail/importer', {}, { 'x-admin': ADMIN });
    v('   relancer l\'import ne refait rien', [r.j.repris, r.j.comptesPrepares], [0, 0]);

    /* ── un tiers essaie de prendre le compte ── */
    const envoisAvant = courrier.length;
    r = await post('/api/compte/creer', { email: 'client.ancien@exemple.fr', h: emp('mot-de-passe-du-tiers') });
    v('⛔ « créer un compte » avec l\'adresse d\'un client repris : même réponse que d\'habitude…', [r.s, r.j], [200, { ok: true }]);
    v('   …mais aucun compte n\'est créé par-dessus', [comptes._reg().c['client.ancien@exemple.fr'].ap, comptes._reg().c['client.ancien@exemple.fr'].e], [1, '']);
    v('   et le vrai client est prévenu, dans SA boîte', courrier.slice(envoisAvant).map(m => m.to), ['client.ancien@exemple.fr']);
    r = await post('/api/compte/connexion', { email: 'client.ancien@exemple.fr', h: emp('mot-de-passe-du-tiers') });
    v('⛔ le mot de passe du tiers n\'ouvre rien', [r.s, r.j.error], [401, 'identifiants_refuses']);
    r = await post('/api/compte/connexion', { email: 'client.ancien@exemple.fr', h: '' });
    v('   une empreinte vide non plus (le compte « à poser » n\'a qu\'une empreinte vide)', r.s, 400);
    r = await post('/api/compte/connexion', { email: 'client.ancien@exemple.fr', h: emp('') });
    v('   ni celle d\'un mot de passe vide', r.s, 401);
    r = await post('/api/compte/connexion', { email: 'client.ancien@exemple.fr', h: emp('n-importe-quoi') });
    v('⛔ un compte « à poser » se refuse comme une adresse INCONNUE (même réponse)', [r.s, r.j], [401, { error: 'identifiants_refuses' }]);
    v('   et ces essais ne le verrouillent pas contre son propriétaire', [comptes._reg().c['client.ancien@exemple.fr'].ech, comptes._reg().c['client.ancien@exemple.fr'].bloq], [0, 0]);
    v('⛔ sans session, le dossier ne se lit pas', (await get('/api/portail/moi')).s, 401);

    /* ── le vrai client : « Mot de passe oublié », le lien, le mot de passe ── */
    const avantLien = courrier.length;
    r = await post('/api/compte/mdp/demander', { email: 'client.ancien@exemple.fr' });
    const lettre = courrier.slice(avantLien)[0] || {};
    const jeton = ((/reinit\.html\?mode=resetPassword&jeton=([0-9a-f]{64})/.exec(lettre.text || '') || [])[1]) || '';
    v('⛔ « Mot de passe oublié » envoie un lien de NOTRE serveur à l\'adresse du client', [r.s, lettre.to, !!jeton], [200, 'client.ancien@exemple.fr', true]);
    r = await post('/api/compte/mdp/poser', { jeton, h: emp('son-vrai-mot-de-passe') });
    v('   le lien pose le mot de passe', r.s, 200);
    const c1 = comptes._reg().c['client.ancien@exemple.fr'];
    v('⛔ le compte devient ordinaire, et son adresse est vérifiée (le lien est arrivé chez lui)', [c1.ap === undefined, c1.v > 0, c1.e.length > 20], [true, true, true]);
    r = await post('/api/compte/connexion', { email: 'client.ancien@exemple.fr', h: emp('son-vrai-mot-de-passe') });
    v('⛔ il se connecte', [r.s, !!r.j.jeton], [200, true]);
    const moi = await get('/api/portail/moi', r.j.jeton);
    v('⛔ et retrouve SON dossier, repris de Google', [moi.s, moi.j && moi.j.dossier && moi.j.dossier.company], [200, 'Nettoyage Ancien']);
    r = await post('/api/compte/connexion', { email: 'client.ancien@exemple.fr', h: emp('mot-de-passe-du-tiers') });
    v('   le mot de passe du tiers, lui, ne marche toujours pas', r.s, 401);
    r = await post('/api/compte/mdp/poser', { jeton, h: emp('encore') });
    v('   le lien ne sert qu\'une fois', [r.s, r.j.error], [400, 'lien_expire']);
    v('⛔ le fichier des comptes ne contient aucun mot de passe', fs.readFileSync(path.join(dir, 'comptes-portail.json'), 'utf8').indexOf('son-vrai-mot-de-passe') < 0, true);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  srv.close(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
