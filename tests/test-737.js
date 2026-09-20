/* ⛔ CE QUE CE FICHIER GARDE — QUE `op-fs.js` ET LE SOCLE SE PARLENT VRAIMENT.

   C'est la règle cardinale de CLAUDE.md, et elle a été payée trois fois le 20 septembre 2026 :
   deux moitiés justes chacune de son côté, chacune avec ses bancs verts, et qui ne se parlaient
   pas. `{lignes:[…]}` contre `Array.isArray(b.enr)` — 400, boucle quittée, INERTE EN SILENCE.

   Ce banc ne monte donc pas un faux serveur et n'imite pas le shim : il lance le VRAI
   `server/index.js` en sous-processus, charge le VRAI `op-fs.js` par `require`, et les fait
   parler en HTTP sur 127.0.0.1 — exactement comme `messages.html` le fera.

   ⛔ ET IL MONTE DEUX APPAREILS, PAS UN. Un seul shim contre lui-même prouve qu'il sait relire
   ce qu'il vient d'écrire — c'est-à-dire presque rien. Ce qu'OP MESSAGES exige, c'est qu'un
   message écrit sur le téléphone d'Alexis apparaisse sur celui de Justin, par le flux, sans
   rechargement. Il faut deux miroirs séparés pour le voir, et c'est le seul contrôle qui
   éprouve vraiment `reveiller()`.

   ⚠️ Saute de lui-même si `server/node_modules` manque, comme toutes les suites du dépôt. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('\n(sauté : server/node_modules absent)\n0 ✓  0 ✗'); process.exit(0);
}

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const opFs = require(path.join(RACINE, 'op-fs.js'));

const KEK = crypto.randomBytes(32).toString('hex');
const MDP = 'mot-de-passe-du-banc-737';
const T = 'ent-msg-737', SLUG = 'entreprisemsg737', CLE = 'cle-propre-du-banc-737-2026';
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise(res => {
  const s = require('net').createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});

const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'opfs-737-'));
let enfant = null;

async function monter() {
  const dir = path.join(BANC, 'srv'), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const cfgPath = path.join(dir, 'config.json');
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha(MDP), socle: { actif: true },
  }));
  fs.writeFileSync(path.join(data, 'espaces.json'), JSON.stringify({
    [SLUG]: { slug: SLUG, nom: 'Entreprise du banc 737', email: 'banc@exemple.fr', t: T, code: b64({ t: T, k: CLE }), ts: 1 },
  }));
  const port = await portLibre();
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port), TEAMOP_KEK: KEK }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let journal = '';
  enfant.stdout.on('data', d => { journal += d; });
  enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  return { B, vivant, journal: () => journal };
}
const arreter = async () => {
  if (!enfant || enfant.exitCode !== null) return;
  await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) { res(); } });
};

/* Le jeton d'appareil : exactement ce que `messages.html` fera au démarrage. */
async function session(B, appId) {
  const r = await fetch(B + '/api/op/session', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ t: T, kh: sha(CLE), app_id: appId }) });
  const j = await r.json().catch(() => ({}));
  return { code: r.status, jeton: j.jeton || '', j };
}

/* Attendre qu'une condition devienne vraie, avec une BORNE — jamais une boucle infinie.
   Rendre `false` au bout du délai fait TOMBER le contrôle ; une boucle sans borne ferait
   simplement traîner le banc pour toujours, ce qui a l'air d'un serveur lent. */
async function jusqua(cond, ms) {
  const fin = Date.now() + (ms || 8000);
  while (Date.now() < fin) { if (await cond()) return true; await dormir(40); }
  return false;
}

(async () => {
  const S = await monter();
  if (!S.vivant) { console.log('  ✗ le serveur du banc n\'a pas démarré\n' + S.journal().slice(0, 600) + '\n0 ✓  1 ✗'); await arreter(); process.exit(1); }

  console.log('\n══ 1. LA PORTE : UN SHIM SANS JETON N\'OBTIENT RIEN ══\n');
  const muet = opFs({ base: S.B, jeton: '', appId: 'sans-jeton' });
  {
    const ouvert = await muet.demarrer();
    muet.arreter();
    v('⛔ sans jeton, le rattrapage échoue au lieu de rendre un miroir vide', ouvert, false);
    vrai('   et le miroir reste vide — jamais de « aucun message » sur une porte fermée', muet.taille() === 0);
  }

  const sA = await session(S.B, 'appareil-A');
  const sB = await session(S.B, 'appareil-B');
  v('la session de l\'appareil A est servie', sA.code, 200);
  v('la session de l\'appareil B est servie', sB.code, 200);
  vrai('et les deux jetons sont DIFFÉRENTS', !!sA.jeton && !!sB.jeton && sA.jeton !== sB.jeton);

  const A = opFs({ base: S.B, jeton: sA.jeton, appId: 'appareil-A' });
  const B = opFs({ base: S.B, jeton: sB.jeton, appId: 'appareil-B' });
  vrai('A démarre', await A.demarrer());
  vrai('B démarre', await B.demarrer());

  console.log('\n══ 2. UN DOCUMENT FAIT L\'ALLER-RETOUR PAR LE VRAI SERVEUR ══\n');
  {
    await A.collection('op_users').doc('u1').set({ nom: 'Alexis', role: 'tech', vu: 0 });
    const d = await A.collection('op_users').doc('u1').get();
    vrai('   il existe', d.exists);
    v('   et il porte ce qu\'on a écrit', d.data(), { nom: 'Alexis', role: 'tech', vu: 0 });
    v('   son identifiant est celui demandé', d.id, 'u1');
  }
  {
    /* ⛔ LE CONTRÔLE QUI PROUVE QUE ÇA SORT VRAIMENT DE L'APPAREIL. Tout ce qui précède
       passerait sur un miroir purement local qui ne parle à personne. */
    /* ⚠ ON INTERROGE PAR L'API PUBLIQUE, JAMAIS EN FOUILLANT `_miroir` À LA MAIN. Ce banc a
       d'abord cherché une clé `'op_users\u0000u1'` écrite en dur ; le jour où le rangement des
       chemins a changé, il a accusé le flux d'être mort alors qu'il marchait. Un contrôle qui
       connaît les entrailles tombe quand les entrailles bougent — et il ne dit rien de ce que
       `messages.html` verra, qui passe par `.get()`. */
    vrai('⛔ B le voit arriver par le flux, sans rechargement',
      await jusqua(async () => (await B.collection('op_users').doc('u1').get()).exists));
    const d = await B.collection('op_users').doc('u1').get();
    v('   et avec le même contenu, déchiffré par le serveur', d.data(), { nom: 'Alexis', role: 'tech', vu: 0 });
  }

  console.log('\n══ 3. LES CHEMINS IMBRIQUÉS — C\'EST TOUT LE MODÈLE D\'OP MESSAGES ══\n');
  {
    const ch = A.collection('op_companies').doc('c1').collection('channels').doc('general');
    await ch.set({ nom: 'Général', membres: ['u1'] });
    await ch.collection('messages').doc('m1').set({ txt: 'bonjour', ts: 1000, par: 'u1' });
    await ch.collection('messages').doc('m2').set({ txt: 'salut', ts: 2000, par: 'u2' });
    const q = await ch.collection('messages').orderBy('ts', 'asc').get();
    v('   deux messages dans le bon canal', q.size, 2);
    v('   et dans l\'ordre demandé', q.docs.map(d => d.id), ['m1', 'm2']);
    /* ⛔ Le chemin est la clé : un message d'un AUTRE canal ne doit pas apparaître ici. */
    await A.collection('op_companies').doc('c1').collection('channels').doc('autre')
      .collection('messages').doc('m3').set({ txt: 'ailleurs', ts: 1500 });
    const q2 = await ch.collection('messages').get();
    v('⛔ un message d\'un autre canal ne fuit pas dans celui-ci', q2.size, 2);

    /* ⛔⛔ LES DEUX CONTRÔLES QUI SUIVENT EXISTENT PARCE QUE LA MUTATION N'A RIEN CASSÉ.
       Retirer le filtre de PRÉFIXE laissait 48 ✓ 0 ✗ ; retirer celui de PROFONDEUR aussi. Les
       deux gardes se couvraient l'une l'autre sur le jeu d'essai d'au-dessus, où les chemins
       fautifs ont par hasard la même longueur — donc un reste VIDE, que l'autre garde attrape.
       C'est la leçon d'`instantanerVers` dans CLAUDE.md, dans les deux sens : une mutation qui
       ne casse rien peut dire qu'une autre garde la neutralise, ET que le banc ne joue pas le
       cas. Ici c'était les deux. */

    /* ⛔ CAS 1 — UNE AUTRE ENTREPRISE. Même genre, même longueur de chemin, même nom de canal :
       seul le PRÉFIXE les sépare, et le reste est propre (`mQ`, sans barre oblique) donc la
       garde de profondeur ne peut pas rattraper. Ce n'est pas un raffinement : c'est la
       conversation d'une entreprise qui apparaîtrait dans l'écran d'une autre. */
    await A.collection('op_companies').doc('c2').collection('channels').doc('general')
      .collection('messages').doc('mQ').set({ txt: 'chez le voisin', ts: 1 });
    const q3 = await ch.collection('messages').get();
    v('⛔⛔ le canal du MÊME NOM d\'une AUTRE entreprise ne fuit pas ici', q3.size, 2);
    vrai('   et son message n\'est nulle part dans la liste', !q3.docs.some(d => d.id === 'mQ'));

    /* ⛔ CAS 2 — UNE SOUS-COLLECTION DU MÊME GENRE. Le préfixe correspond parfaitement : seule
       la PROFONDEUR distingue une réponse rangée sous un message du message lui-même. Sans
       cette garde, une conversation afficherait ses propres réponses comme des messages de
       premier niveau, mélangées aux vrais. */
    await ch.collection('messages').doc('m1').collection('messages').doc('r1').set({ txt: 'une réponse', ts: 1100 });
    const q4 = await ch.collection('messages').get();
    v('⛔⛔ une sous-collection du même genre ne remonte pas d\'un cran', q4.size, 2);
    v('   et elle reste lisible là où elle est', (await ch.collection('messages').doc('m1').collection('messages').get()).size, 1);
  }

  console.log('\n══ 4. LES REQUÊTES QUE `messages.html` UTILISE VRAIMENT ══\n');
  {
    const rooms = A.collection('op_companies').doc('c1').collection('rooms');
    await rooms.doc('r1').set({ nom: 'Réunion A', members: ['u1', 'u2'], room: 'salon' });
    await rooms.doc('r2').set({ nom: 'Réunion B', members: ['u3'], room: 'salon' });
    await rooms.doc('r3').set({ nom: 'Réunion C', members: ['u1'], room: 'autre' });
    v('   where ==', (await rooms.where('room', '==', 'salon').get()).size, 2);
    v('   where array-contains', (await rooms.where('members', 'array-contains', 'u1').get()).size, 2);
    v('   where in', (await rooms.where('room', 'in', ['autre']).get()).size, 1);
    v('   deux where se cumulent', (await rooms.where('room', '==', 'salon').where('members', 'array-contains', 'u1').get()).size, 1);
    v('   limit garde le DÉBUT', (await rooms.orderBy('nom', 'asc').limit(2).get()).docs.map(d => d.id), ['r1', 'r2']);
    /* ⛔ `limit` et `limitToLast` confondus donneraient les 300 PREMIERS messages d'une
       conversation au lieu des 300 DERNIERS : un écran qui s'ouvre sur l'an dernier, sans
       erreur ni message. C'est la mutation qui doit faire tomber ce banc. */
    v('⛔ limitToLast garde la FIN', (await rooms.orderBy('nom', 'asc').limitToLast(2).get()).docs.map(d => d.id), ['r2', 'r3']);
    v('   orderBy desc', (await rooms.orderBy('nom', 'desc').get()).docs.map(d => d.id), ['r3', 'r2', 'r1']);
    const vide = await rooms.where('room', '==', 'nulle-part').get();
    vrai('   une requête sans résultat dit `empty`, elle ne jette pas', vide.empty && vide.size === 0);
  }

  console.log('\n══ 5. set/merge, update, delete, add ══\n');
  {
    const d = A.collection('op_users').doc('u1');
    await d.set({ vu: 5 }, { merge: true });
    v('   merge:true garde les champs absents du patch', (await d.get()).data(), { nom: 'Alexis', role: 'tech', vu: 5 });
    await d.set({ seul: true });
    v('⛔ set SANS merge remplace tout — c\'est la règle de Firestore', (await d.get()).data(), { seul: true });
    await d.update({ ajout: 1 });
    v('   update complète', (await d.get()).data(), { seul: true, ajout: 1 });
    /* ⛔ `messages.html` compte sur cet échec : plusieurs appels sont dans un `catch` qui crée
       le document autrement. Accepter en silence créerait des documents à moitié remplis. */
    let jete = false;
    try { await A.collection('op_users').doc('jamais-vu').update({ x: 1 }); } catch (e) { jete = true; }
    vrai('⛔ update sur un document absent JETTE', jete);
    const ref = await A.collection('op_users').doc('u1').collection('devices').add({ nom: 'iPhone' });
    vrai('   add fabrique un identifiant', !!ref.id && ref.id.length === 20);
    v('   et le document est là', (await ref.get()).data(), { nom: 'iPhone' });
    const r2 = await A.collection('op_users').doc('u1').collection('devices').add({ nom: 'iPhone' });
    vrai('⛔ deux add au MÊME contenu font DEUX documents, pas un', ref.id !== r2.id);
    await d.delete();
    vrai('   delete efface', !(await d.get()).exists);
    vrai('   et B voit la suppression arriver', await jusqua(async () => !(await B.collection('op_users').doc('u1').get()).exists));
  }

  console.log('\n══ 6. LES VALEURS SPÉCIALES ══\n');
  {
    const d = A.collection('op_companies').doc('c1').collection('members').doc('u9');
    await d.set({ tags: ['a'], n: 1 });
    await d.update({ tags: opFs.FieldValue.arrayUnion('b', 'a'), n: opFs.FieldValue.increment(2) });
    v('   arrayUnion ajoute sans doubler', (await d.get()).data().tags, ['a', 'b']);
    v('   increment additionne', (await d.get()).data().n, 3);
    await d.update({ tags: opFs.FieldValue.arrayRemove('a') });
    v('   arrayRemove retire', (await d.get()).data().tags, ['b']);
    const avant = Date.now();
    await d.update({ quand: opFs.FieldValue.serverTimestamp() });
    const q = (await d.get()).data().quand;
    vrai('   serverTimestamp pose une vraie date', typeof q === 'number' && q >= avant);
    await d.update({ n: opFs.FieldValue.delete() });
    vrai('   delete() retire le champ', !('n' in (await d.get()).data()));
  }

  console.log('\n══ 7. LE TEMPS RÉEL — onSnapshot ══\n');
  {
    const vus = [];
    const stop = B.collection('op_companies').doc('c1').collection('channels').doc('general')
      .collection('messages').orderBy('ts', 'asc').onSnapshot(qs => vus.push(qs.size));
    vrai('⛔ onSnapshot tire TOUT DE SUITE avec l\'état courant, comme Firestore', vus.length >= 1);
    const debut = vus[vus.length - 1];
    await A.collection('op_companies').doc('c1').collection('channels').doc('general')
      .collection('messages').doc('m9').set({ txt: 'du neuf', ts: 9000 });
    vrai('⛔ et il retire quand un AUTRE appareil écrit', await jusqua(() => vus[vus.length - 1] > debut));
    const apres = vus.length;
    stop();
    await A.collection('op_companies').doc('c1').collection('channels').doc('general')
      .collection('messages').doc('m10').set({ txt: 'après', ts: 10000 });
    await dormir(600);
    v('⛔ une fois arrêté, il ne tire plus — sinon un écran fermé continue de se dessiner', vus.length, apres);
  }

  console.log('\n══ 8. LE REFUS : ON ADOPTE LA VERSION DU SERVEUR, ON NE LA GARDE PAS ══\n');
  {
    /* ⛔ LE SOCLE REFUSE UNE ÉCRITURE DONT `maj_le` EST PÉRIMÉ. Si l'appareil gardait quand
       même sa version dans le miroir, son écran montrerait pour toujours un état que personne
       d'autre ne voit — et rien ne le signalerait. On fabrique le cas en poussant DIRECTEMENT
       une version plus récente que celle que A s'apprête à écrire. */
    /* ⛔ LA POUSSE BRUTE DOIT UTILISER LE MÊME RANGEMENT QUE LE SHIM. Ce banc a d'abord écrit
       `{c:'op_companies/c1/members', id:'conflit'}` — l'ancien rangement. Le serveur l'acceptait
       comme un enregistrement DIFFÉRENT, il n'y avait donc aucun conflit à observer, et les
       trois contrôles tombaient en accusant le shim. Le genre dans `c`, le chemin complet dans
       `id` : c'est `decouper()` qu'on reproduit ici, exprès, pour que ce banc tombe aussi le
       jour où le rangement changerait d'un seul côté. */
    const idDoc = 'conflit';
    const c = 'members', id = 'op_companies/c1/members/' + idDoc;
    await A.collection('op_companies').doc('c1').collection('members').doc(idDoc).set({ qui: 'A' });
    /* ⚠ DEUX MINUTES, PAS DIX. Le socle refuse toute date à plus de CINQ minutes dans le
       futur (`horlogeAvancee`, `server/socle.js:48`) : au-delà, elle vient d'une horloge
       déréglée, pas d'un appareil hors ligne. Le premier jet de ce banc demandait dix minutes
       et accusait le shim d'un refus que le SERVEUR avait raison d'opposer. C'est une
       contrainte que `op-fs.js` hérite du socle : une horloge de téléphone en avance fait
       refuser les messages, et l'écran doit savoir le dire. */
    const futur = Date.now() + 120000;
    const r = await fetch(S.B + '/api/op/pousser', { method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sB.jeton },
      body: JSON.stringify({ enr: [{ c: c, id: id, m: futur, r: { qui: 'le futur' }, e: opFs.empreinte({ qui: 'le futur' }) }] }) });
    v('   une version venue du futur est acceptée par le serveur', (await r.json()).acceptes, 1);
    let motif = '';
    try { await A.collection('op_companies').doc('c1').collection('members').doc(idDoc).set({ qui: 'A encore' }); }
    catch (e) { motif = e.motif || ''; }
    v('⛔ l\'écriture périmée est refusée, et le motif est dit', motif, 'perime');
    const d = await A.collection('op_companies').doc('c1').collection('members').doc(idDoc).get();
    v('⛔ et le miroir a ADOPTÉ la version du serveur, pas gardé la sienne', d.data(), { qui: 'le futur' });
  }

  console.log('\n══ 9. CE QUI EST VRAIMENT SUR LE DISQUE DU SERVEUR ══\n');
  {
    /* ⛔ LE CHIFFREMENT N'EST PAS UNE INTENTION : ON REGARDE LE FICHIER. Le socle scelle le
       corps avec la clé de l'entreprise — un texte de conversation lisible en clair dans
       `base.db` serait une fuite, et elle ne se verrait sur aucun écran. */
    /* ⛔⛔ LIRE `base.db` SEUL EST UN FAUX VERT, ET CE BANC S'Y EST FAIT PRENDRE. Le socle
       ouvre SQLite en mode WAL : ce qui vient d'être écrit vit dans `base.db-wal`, pas encore
       dans `base.db`. Les deux contrôles « pas de texte en clair » passaient donc parce que le
       fichier était QUASI VIDE — on aurait annoncé un chiffrement jamais mesuré. C'est la
       contre-épreuve de taille, et elle seule, qui l'a dit. On lit donc TOUT ce que le socle
       pose sur le disque. */
    const dossier = path.join(BANC, 'srv', 'data', 'socle', T);
    vrai('   la base de l\'entreprise existe bien sur le disque', fs.existsSync(path.join(dossier, 'base.db')));
    const morceaux = fs.readdirSync(dossier).filter(f => f.indexOf('base.db') === 0)
      .map(f => fs.readFileSync(path.join(dossier, f)));
    const brut = Buffer.concat(morceaux);
    vrai('   et le socle a bien écrit quelque chose — sinon les deux contrôles suivants ne prouvent rien', brut.length > 8192);
    vrai('⛔ le texte d\'un message n\'apparaît PAS en clair, WAL compris', brut.indexOf('du neuf') < 0);
    vrai('⛔ ni le nom d\'un salon', brut.indexOf('Réunion A') < 0);
    /* Contre-épreuve de la contre-épreuve : un jeton qu'on sait Être passé par là doit,
       lui, se retrouver — sinon on ne cherche pas dans le bon fichier et tout ce qui précède
       est vide de sens. `coll` n'est PAS chiffré : c'est une colonne en clair, par conception. */
    vrai('   ⚠ et on cherche au bon endroit : le nom de collection, lui, s\'y trouve', brut.indexOf('messages') >= 0);
  }

  A.arreter(); B.arreter();
  await arreter();
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(async (e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  await arreter();
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});
