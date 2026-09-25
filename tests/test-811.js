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
  const app = express(); app.set('trust proxy', 1); app.use(express.json({ limit: '6mb' }));
  const courrier = []; let lent = 0;
  /* Les plafonds consultés, pour prouver qu'il existe un plafond PAR ADRESSE IP (`gardien`, N5). */
  const plafonds = [];
  const comptes = require(path.join(RACINE, 'server', 'comptes.js')).monterComptes(app, {
    dossier: dir, mailerEnvoi: async (o) => { if (lent) await new Promise(r => setTimeout(r, lent)); courrier.push(o); },
    quotaOk: (m, cle) => { plafonds.push(cle); return true; }, journal: () => {} });
  const ADMIN = 'b'.repeat(40), PATRON = 'p'.repeat(40);
  /* La Tour a deux gardes : un collaborateur (`monAdmin`) et le patron (`monPatronStrict`). */
  const estPatron = (q) => q.headers['x-admin'] === PATRON;
  const admin = (q, r, n) => ((q.headers['x-admin'] === ADMIN || estPatron(q)) ? n() : r.status(401).json({ error: 'tour' }));
  /* Comme `monPatronStrict` : sans session, 401 ; une session qui n'est pas celle du patron, 403. */
  const patron = (q, r, n) => (estPatron(q) ? n() : r.status(q.headers['x-admin'] ? 403 : 401).json({ error: 'patron' }));
  let google = [
    /* Un dossier COMPLET, tel que le portail de Google le gardait : la liste fermée d'avant en
       perdait la facturation, les demandes, l'offre et la formule payée. */
    { email: 'Client.Ancien@Exemple.fr', champs: { email: 'Client.Ancien@Exemple.fr', uid: 'uid-google-1', prenom: 'Client', nom: 'Ancien',
      company: 'Nettoyage Ancien', formule: 'pro', adresse: '1 rue du Port', cp: '17000', ville: 'La Rochelle', siret: '12345678900011',
      demandes: [{ app: 'OP GESTION', formule: 'Pro', statut: 'fourni', date: 1757000000000, besoin: 'trois techniciens' }],
      promo: { code: 'CODE-FICTIF', label: '3 mois offerts', until: 1790000000000, apps: ['elan'] }, promoUsed: ['CODE-FICTIF'],
      status: 'fourni', plan: 'Pro', apps: ['elan'], createdAt: 1756000000000 } },
    { email: 'squat@exemple.fr', champs: { email: 'squat@exemple.fr', prenom: 'Vrai', nom: 'Client', company: 'Vraie Entreprise', status: 'fourni' } },
    { email: 'verifie@exemple.fr', champs: { email: 'verifie@exemple.fr', prenom: 'Déjà', nom: 'Vérifié', company: 'De Google' } },
    { email: '', champs: { prenom: 'Sans', nom: 'Adresse' } },
    { email: 'lourd@exemple.fr', champs: { email: 'lourd@exemple.fr', company: 'Lourd', notes: 'x'.repeat(20000), gros: { t: 'x'.repeat(20000) }, profond: { a: { b: { c: { d: { e: 1 } } } } } } },
  ];
  const portail = require(path.join(RACINE, 'server', 'portail.js')).monterPortail(app, {
    dossier: dir, parJeton: comptes.parJeton, quotaOk: () => true, journal: () => {}, preparer: comptes.preparer, verifie: comptes.verifie,
    admin, patron, lireFirestore: async () => google,
    /* Comme `index.js` : la définition du code vient de `config.promos`, pas de la page. */
    promoDef: (c) => (c === 'TEST3' ? { code: c, mois: 3, epuise: false } : c === 'EPUISE' ? { code: c, mois: 1, epuise: true } : null) });
  const srv = await new Promise(res => { const s = app.listen(0, '127.0.0.1', () => res(s)); });
  const B = 'http://127.0.0.1:' + srv.address().port;
  const post = async (route, corps, en) => { const r = await fetch(B + route, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, en || {}), body: JSON.stringify(corps || {}) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  const get = async (route, jeton, en) => { const r = await fetch(B + route, { headers: Object.assign(jeton ? { Authorization: 'Bearer ' + jeton } : {}, en || {}) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  const lienDans = (lettre, mode) => ((new RegExp('reinit\\.html\\?mode=' + mode + '&jeton=([0-9a-f]{64})').exec((lettre && lettre.text) || '') || [])[1]) || '';
  const attendreCourrier = async (filtre) => { for (let i = 0; i < 50; i++) { const m = courrier.filter(filtre).pop(); if (m) return m; await new Promise(r => setTimeout(r, 20)); } return null; };

  try {
    /* ── AVANT l'import : un client vérifié, et un tiers qui prend l'adresse d'un client de Google ── */
    await post('/api/compte/creer', { email: 'verifie@exemple.fr', h: emp('mot-de-passe-verifie') });
    const lv = await attendreCourrier(m => m.to === 'verifie@exemple.fr' && /verifyEmail/.test(m.text || ''));
    const r0 = await post('/api/compte/verifier', { jeton: lienDans(lv, 'verifyEmail') });
    v('un client déjà inscrit chez nous confirme son adresse', r0.s, 200);
    const jv0 = (await post('/api/compte/connexion', { email: 'verifie@exemple.fr', h: emp('mot-de-passe-verifie') })).j.jeton;
    await post('/api/portail/demande', { company: 'Sa Propre Entreprise' }, { Authorization: 'Bearer ' + jv0 });
    const avantVerifie = JSON.stringify(comptes._reg().c['verifie@exemple.fr']);

    await post('/api/compte/creer', { email: 'squat@exemple.fr', h: emp('mot-de-passe-du-tiers') });
    let r = await post('/api/compte/connexion', { email: 'squat@exemple.fr', h: emp('mot-de-passe-du-tiers') });
    const jetonTiers = r.j.jeton;
    v('le tiers se connecte avec l\'adresse d\'un autre (rien ne l\'en empêche AVANT l\'import)', [r.s, !!jetonTiers], [200, true]);
    r = await post('/api/portail/demande', { company: 'Fausse Entreprise', besoin: 'donnez-moi le code' }, { Authorization: 'Bearer ' + jetonTiers });
    v('   et pose un dossier à son nom', [r.s, r.j.dossier && r.j.dossier.company], [200, 'Fausse Entreprise']);
    await post('/api/portail/message', { texte: 'renvoyez-moi le code d\'activation' }, { Authorization: 'Bearer ' + jetonTiers });

    /* ── l'import ── */
    r = await post('/api/monitor/portail/importer', {});
    v('l\'import exige la Tour', r.s, 401);
    r = await post('/api/monitor/portail/importer', {}, { 'x-admin': ADMIN });
    v('⛔ et plus précisément le PATRON : un collaborateur de la Tour ne crée pas de comptes (C5)', r.s, 403);
    r = await post('/api/monitor/portail/importer', {}, { 'x-admin': PATRON });
    const imp = r;
    v('⛔ l\'import : 3 dossiers repris, 1 gardé, 1 sans adresse, 2 comptes à poser, 1 compte non vérifié remis à poser',
      [r.s, r.j.repris, r.j.ignores, r.j.sansAdresse, r.j.comptesPrepares, r.j.comptesRemis], [200, 3, 1, 1, 2, 1]);
    v('⛔ le dossier que le tiers avait posé est REMPLACÉ par celui de Google (B1, variante)', [r.j.remplaces, portail._reg().d['squat@exemple.fr'].company], [1, 'Vraie Entreprise']);
    v('   et son fil part avec lui', portail._reg().f['squat@exemple.fr'], undefined);
    const cs = comptes._reg().c['squat@exemple.fr'];
    v('⛔ le compte du tiers redevient « à poser » : plus de mot de passe (B1)', cs && [cs.ap, cs.s, cs.e], [1, '', '']);
    r = await get('/api/portail/moi', jetonTiers);
    v('⛔ et sa session tombe : il ne lit PAS le dossier repris', r.s, 401);
    r = await post('/api/compte/connexion', { email: 'squat@exemple.fr', h: emp('mot-de-passe-du-tiers') });
    v('   ni ne se reconnecte', r.s, 401);
    v('⛔ un compte VÉRIFIÉ n\'est pas touché d\'un octet', JSON.stringify(comptes._reg().c['verifie@exemple.fr']), avantVerifie);
    v('⛔ ni le dossier qu\'il a posé lui-même : on part du VIVANT, Google ne l\'écrase pas',
      portail._reg().d['verifie@exemple.fr'] && portail._reg().d['verifie@exemple.fr'].company, 'Sa Propre Entreprise');
    const c0 = comptes._reg().c['client.ancien@exemple.fr'];
    v('   le client de Google reçoit un compte sans mot de passe', c0 && [c0.ap, c0.s, c0.e, c0.v], [1, '', '', 0]);
    const d0 = portail._reg().d['client.ancien@exemple.fr'] || {};
    v('⛔ TOUT son dossier est repris : facturation, demandes, offre, formule payée, date d\'inscription',
      [d0.adresse, d0.siret, d0.demandes && d0.demandes[0].besoin, d0.promo && d0.promo.code, d0.promoUsed, d0.status, d0.plan, d0.cree, d0.venuDe],
      ['1 rue du Port', '12345678900011', 'trois techniciens', 'CODE-FICTIF', ['CODE-FICTIF'], 'fourni', 'Pro', 1756000000000, 'firestore']);
    v('   sans l\'identifiant de Google, qui ne veut rien dire ici', d0.uid, undefined);
    const dl = portail._reg().d['lourd@exemple.fr'] || {};
    v('⛔ un sous-objet démesuré ou trop profond n\'entre pas, un texte se borne à 600 signes, le reste du dossier entre',
      [dl.company, (dl.notes || '').length, dl.gros, dl.profond, imp.j.champsRefuses], ['Lourd', 600, undefined, undefined, 2]);
    r = await post('/api/monitor/portail/importer', {}, { 'x-admin': PATRON });
    v('   relancer l\'import ne refait rien', [r.j.repris, r.j.comptesPrepares, r.j.comptesRemis, r.j.remplaces], [0, 0, 0, 0]);

    /* ── un tiers essaie encore ── */
    const envoisAvant = courrier.length;
    r = await post('/api/compte/creer', { email: 'client.ancien@exemple.fr', h: emp('mot-de-passe-du-tiers') });
    v('⛔ « créer un compte » avec l\'adresse d\'un client repris : même réponse que d\'habitude…', [r.s, r.j], [200, { ok: true }]);
    v('   …mais aucun compte n\'est créé par-dessus', [comptes._reg().c['client.ancien@exemple.fr'].ap, comptes._reg().c['client.ancien@exemple.fr'].e], [1, '']);
    const avis = await attendreCourrier(m => m.to === 'client.ancien@exemple.fr' && courrier.indexOf(m) >= envoisAvant);
    v('   et le vrai client est prévenu, dans SA boîte', !!avis, true);
    v('⛔ le courriel lui dit de passer par « Mot de passe oublié », pas de « se connecter simplement » (N3)',
      [/Mot de passe oublié/.test((avis && avis.text) || ''), /connectez-vous simplement/.test((avis && avis.text) || '')], [true, false]);
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
    const lettre = await attendreCourrier(m => m.to === 'client.ancien@exemple.fr' && courrier.indexOf(m) >= avantLien && /resetPassword/.test(m.text || ''));
    const jeton = lienDans(lettre, 'resetPassword');
    v('⛔ « Mot de passe oublié » envoie un lien de NOTRE serveur à l\'adresse du client', [r.s, !!jeton], [200, true]);
    r = await post('/api/compte/mdp/poser', { jeton, h: emp('son-vrai-mot-de-passe') });
    v('   le lien pose le mot de passe', r.s, 200);
    const c1 = comptes._reg().c['client.ancien@exemple.fr'];
    v('⛔ le compte devient ordinaire, et son adresse est vérifiée (le lien est arrivé chez lui)', [c1.ap === undefined, c1.v > 0, c1.e.length > 20], [true, true, true]);
    r = await post('/api/compte/connexion', { email: 'client.ancien@exemple.fr', h: emp('son-vrai-mot-de-passe') });
    const jc = r.j.jeton;
    v('⛔ il se connecte', [r.s, !!jc], [200, true]);
    let moi = await get('/api/portail/moi', jc);
    v('⛔ et retrouve SON dossier, repris de Google', [moi.s, moi.j && moi.j.dossier && moi.j.dossier.company, moi.j.dossier && moi.j.dossier.ville], [200, 'Nettoyage Ancien', 'La Rochelle']);
    r = await post('/api/compte/mdp/poser', { jeton, h: emp('encore') });
    v('   le lien ne sert qu\'une fois', [r.s, r.j.error], [400, 'lien_expire']);
    /* La seconde serrure : un dossier repris ne se montre qu'à une adresse PROUVÉE, même si l'ordre
       des gestes n'était pas celui prévu. On la voit en retirant la preuve à la main. */
    comptes._reg().c['client.ancien@exemple.fr'].v = 0;
    moi = await get('/api/portail/moi', jc);
    v('⛔ un dossier repris de Google, une adresse non prouvée : 403 (la seconde serrure)', [moi.s, moi.j.error], [403, 'adresse_non_verifiee']);
    v('   ni le fil', (await get('/api/portail/messages', jc)).s, 403);
    comptes._reg().c['client.ancien@exemple.fr'].v = Date.now();

    /* ── le tiers reprend-il la main en posant un mot de passe ? Seul le lien de la boîte le permet ── */
    const avant2 = courrier.length;
    await post('/api/compte/mdp/demander', { email: 'squat@exemple.fr' });
    const l2 = await attendreCourrier(m => m.to === 'squat@exemple.fr' && courrier.indexOf(m) >= avant2 && /resetPassword/.test(m.text || ''));
    v('   le lien part dans la boîte du VRAI propriétaire de l\'adresse — pas chez le tiers', !!l2 && l2.to, 'squat@exemple.fr');

    /* ── les dossiers : bornes (B2) ── */
    await post('/api/compte/creer', { email: 'neuf@exemple.fr', h: emp('mot-de-passe-neuf') });
    r = await post('/api/compte/connexion', { email: 'neuf@exemple.fr', h: emp('mot-de-passe-neuf') });
    const jn = r.j.jeton;
    r = await post('/api/portail/demande', { company: 'Neuve', facturation: { adresse: '2 rue', cp: '17000' }, demandes: [{ app: 'OP GESTION', besoin: 'x' }] }, { Authorization: 'Bearer ' + jn });
    v('un prospect NON vérifié dépose sa demande (le parcours d\'inscription n\'attend pas la confirmation)', [r.s, r.j.dossier && r.j.dossier.facturation && r.j.dossier.facturation.cp], [200, '17000']);
    r = await post('/api/portail/demande', { gros: { t: 'x'.repeat(20000) } }, { Authorization: 'Bearer ' + jn });
    v('⛔ un sous-objet de 20 Ko : refusé (413), il n\'entre pas', [r.s, r.j.error, (portail._reg().d['neuf@exemple.fr'] || {}).gros], [413, 'champ_trop_gros', undefined]);
    r = await post('/api/portail/demande', { profond: { a: { b: { c: { d: { e: { f: 1 } } } } } } }, { Authorization: 'Bearer ' + jn });
    v('⛔ un objet trop profond : refusé', r.s, 413);
    const moyen = {}; for (let i = 0; i < 3; i++) moyen['bloc' + i] = { t: 'y'.repeat(6000) };
    r = await post('/api/portail/demande', moyen, { Authorization: 'Bearer ' + jn });
    v('⛔ un dossier de plus de 16 Ko pour une adresse non vérifiée : refusé, et rien n\'en reste', [r.s, r.j.error, (portail._reg().d['neuf@exemple.fr'] || {}).bloc0], [413, 'dossier_trop_gros', undefined]);
    r = await fetch(B + '/api/portail/demande', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + jn }, body: '{"__proto__":{"pollue":1},"constructor":{"x":1},"ok":"oui"}' });
    v('   `__proto__` et `constructor` ne s\'écrivent pas', [r.status, ({}).pollue, (portail._reg().d['neuf@exemple.fr'] || {}).ok, Object.prototype.hasOwnProperty.call(portail._reg().d['neuf@exemple.fr'] || {}, 'constructor')], [200, undefined, 'oui', false]);
    for (let i = 0; i < 35; i++) await post('/api/portail/message', { texte: 'message ' + i }, { Authorization: 'Bearer ' + jn });
    v('⛔ le fil d\'une adresse non vérifiée est court (30 messages)', (portail._reg().f['neuf@exemple.fr'] || []).length, 30);

    /* ── la Tour : un code d'accès ne part qu'à une adresse prouvée, et du patron (C4, C5) ── */
    r = await post('/api/monitor/portail/message', { email: 'neuf@exemple.fr', texte: 'votre espace', access: 'CODE-ACCES' }, { 'x-admin': ADMIN });
    v('⛔ un collaborateur ne dépose pas de code d\'accès', r.s, 403);
    r = await post('/api/monitor/portail/message', { email: 'neuf@exemple.fr', texte: 'votre espace', access: 'CODE-ACCES' }, { 'x-admin': PATRON });
    v('⛔ ni le patron, vers une adresse jamais prouvée (409)', [r.s, r.j.error], [409, 'adresse_non_verifiee']);
    r = await post('/api/monitor/portail/message', { email: 'client.ancien@exemple.fr', texte: 'votre espace', access: 'CODE-ACCES' }, { 'x-admin': PATRON });
    v('   vers une adresse prouvée, oui', r.s, 200);
    r = await post('/api/monitor/portail/message', { email: 'neuf@exemple.fr', texte: 'bonjour' }, { 'x-admin': ADMIN });
    v('   un message sans code reste possible pour un collaborateur', r.s, 200);
    r = await get('/api/monitor/portail/demandes', null, { 'x-admin': ADMIN });
    const parMail = {}; for (const x of (r.j.demandes || [])) parMail[x.email] = x.verifie;
    v('   la Tour voit quelles adresses sont prouvées', [parMail['client.ancien@exemple.fr'], parMail['neuf@exemple.fr']], [true, false]);
    r = await post('/api/monitor/portail/etat', { email: 'client.ancien@exemple.fr', plan: 'Business' }, { 'x-admin': ADMIN });
    v('⛔ changer la formule affichée d\'un client : le patron seul (C5)', r.s, 403);

    /* ── la pollution de prototype, après un redémarrage (C6) ── */
    portail._relire(); comptes._relire();
    v('⛔ relues depuis le disque, les tables n\'ont pas de prototype', [Object.getPrototypeOf(portail._reg().d), Object.getPrototypeOf(portail._reg().f), Object.getPrototypeOf(comptes._reg().c), Object.getPrototypeOf(comptes._reg().j)], [null, null, null, null]);
    r = await post('/api/monitor/portail/etat', { email: '__proto__', plan: 'pollue', status: 'pollue' }, { 'x-admin': PATRON });
    v('⛔ `__proto__` comme adresse : refusé, et rien n\'est pollué', [r.s, ({}).plan, ({}).status], [400, undefined, undefined]);

    /* ── ce que le serveur dit du client (index.js) : la fiche, la suppression, la liste ── */
    v('majServeur pose les champs du SERVEUR — et ceux-là seulement',
      [portail.majServeur('client.ancien@exemple.fr', { status: 'fourni', plan: 'Business Premium', planFin: '2027-01-01', prenom: 'Pirate' }),
        portail._reg().d['client.ancien@exemple.fr'].plan, portail._reg().d['client.ancien@exemple.fr'].planFin, portail._reg().d['client.ancien@exemple.fr'].prenom],
      [true, 'Business Premium', '2027-01-01', 'Client']);
    r = await post('/api/portail/demande', { planFin: '9999-12-31', plan: 'Gratuit à vie', promo: { code: 'X', until: 4102444800000 }, promoUsed: [] }, { Authorization: 'Bearer ' + jc });
    v('⛔ le client n\'écrit ni sa formule, ni son échéance, ni son offre (elle vient du serveur)',
      [r.j.dossier.planFin, r.j.dossier.plan, r.j.dossier.promo && r.j.dossier.promo.code, r.j.dossier.promoUsed], ['2027-01-01', 'Business Premium', 'CODE-FICTIF', ['CODE-FICTIF']]);

    /* ── un code promo s'active PAR LE SERVEUR (`/api/portail/promo`) ── */
    await post('/api/compte/creer', { email: 'promo@exemple.fr', h: emp('mot-de-passe-promo') });
    const jp = (await post('/api/compte/connexion', { email: 'promo@exemple.fr', h: emp('mot-de-passe-promo') })).j.jeton;
    const au = { Authorization: 'Bearer ' + jp };
    v('un code sans session : refusé', (await post('/api/portail/promo', { code: 'TEST3' })).s, 401);
    v('⛔ un code inconnu : 404', (await post('/api/portail/promo', { code: 'INVENTE' }, au)).s, 404);
    v('⛔ un code épuisé : 410', (await post('/api/portail/promo', { code: 'EPUISE' }, au)).s, 410);
    const t0 = Date.now();
    /* Le corps essaie de choisir sa durée, son échéance et son libellé : rien de tout ça ne compte. */
    r = await post('/api/portail/promo', { code: ' test3 ', mois: 36, until: 4102444800000, label: '36 mois offerts' }, au);
    const dp = r.j.dossier || {};
    v('⛔ un code valide : accordé, avec la durée de `config.promos` — l\'échéance est calculée par le SERVEUR, le corps n\'y peut rien',
      [r.s, dp.promo && dp.promo.code, dp.promo && dp.promo.label, dp.promoUsed, Math.round(((dp.promo && dp.promo.until) - t0) / 86400000)],
      [200, 'TEST3', '3 mois offerts', ['TEST3'], 90]);
    v('   et le client le lit dans son fil, écrit par l\'équipe', (portail._reg().f['promo@exemple.fr'] || []).some(m => m.de === 'admin' && /TEST3/.test(m.t)), true);
    r = await post('/api/portail/promo', { code: 'TEST3' }, au);
    v('⛔ le même code une seconde fois : refusé (409)', [r.s, r.j.error], [409, 'deja_utilise']);
    portail._reg().d['promo@exemple.fr'].promoUsed = [];
    r = await post('/api/portail/promo', { code: 'TEST3' }, au);
    v('⛔ un autre pendant qu\'une offre court : refusé (409)', [r.s, r.j.error], [409, 'offre_active']);
    const l = comptes.liste();
    v('la liste pour la Tour ne contient ni sel ni vérificateur', l.every(x => !('s' in x) && !('e' in x) && x.email), true);
    v('   et dit qui est à poser', l.filter(x => x.aPoser).map(x => x.email).sort(), ['lourd@exemple.fr', 'squat@exemple.fr']);
    v('⛔ supprimer un compte du site efface le compte, ses jetons, le dossier et le fil',
      [comptes.supprimer('neuf@exemple.fr'), portail.supprimer('neuf@exemple.fr'), comptes._reg().c['neuf@exemple.fr'], portail._reg().d['neuf@exemple.fr'], portail._reg().f['neuf@exemple.fr'],
        Object.values(comptes._reg().j).some(e => e.m === 'neuf@exemple.fr')],
      [true, true, undefined, undefined, undefined, false]);
    v('   et sa session ne rouvre rien', (await get('/api/portail/moi', jn)).s, 401);

    /* ── durées et plafonds (C4, N5) ── */
    const chrono = async (corps) => { const t0 = Date.now(); await post('/api/compte/creer', corps); return Date.now() - t0; };
    let connu = 0, libre = 0;
    for (let i = 0; i < 3; i++) { connu += await chrono({ email: 'client.ancien@exemple.fr', h: emp('x' + i) }); libre += await chrono({ email: 'libre' + i + '@exemple.fr', h: emp('x' + i) }); }
    v('⛔ « créer un compte » dure autant sur une adresse connue que sur une libre (la durée ne dit plus qui existe)', connu / libre > 0.5, true);
    lent = 400;
    const t1 = Date.now(); r = await post('/api/compte/mdp/demander', { email: 'client.ancien@exemple.fr' }); const dt = Date.now() - t1;
    lent = 0;
    v('⛔ « mot de passe oublié » répond sans attendre le courriel (sinon la durée trahit l\'adresse connue)', [r.s, dt < 300], [200, true]);
    v('⛔ un plafond PAR ADRESSE IP existe sur la création, la connexion et le mot de passe oublié',
      ['creer-ip:', 'cnx-ip:', 'mdp-ip:'].map(p => plafonds.some(k => String(k).indexOf(p) === 0)), [true, true, true]);
    v('⛔ le fichier des comptes ne contient aucun mot de passe', fs.readFileSync(path.join(dir, 'comptes-portail.json'), 'utf8').indexOf('son-vrai-mot-de-passe') < 0, true);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  srv.close(); try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
