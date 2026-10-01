/* ⛔ CE QUE CE FICHIER GARDE — LA MESSAGERIE PAR SES ROUTES : groupes, pagination, validation, notifications, éphémères (famille 5).

   `test-901` éprouve la base, `test-905` les gardes route par route. Celui-ci joue, par HTTP et avec les VRAIS
   gestionnaires, ce qu'une personne fait dans un groupe — et ce que le service doit REFUSER quand le corps est
   piégé :

     · GROUPES : création (le créateur est administrateur, les non-contacts sont RENDUS dans `non_ajoutes` et jamais
       ajoutés de force), ajout, retrait, promotion, rétrogradation, dernier administrateur (409), départ, nom, lien
       d'invitation (un nouveau membre ne voit PAS l'historique d'avant son arrivée) ;
     · « SEULS LES ADMINS ÉCRIVENT » : le membre est refusé (403 annonces_seules), l'administrateur écrit, et on peut
       lever la restriction ;
     · PAGINATION : `avant_seq`, `apres_seq`, `limite` — bornes, pages sans trou ni doublon, jamais les deux à la fois ;
     · VALIDATION : chaque champ de chaque route refuse une forme piégée (type, longueur, caractères de contrôle,
       marques bidirectionnelles) AVANT de toucher la base ; la base n'a pas bougé après un refus ;
     · MESSAGES : renvoi d'un même `cid` (même seq, aucun doublon), réponse à un message inconnu (404), modification par
       un autre (403), suppression pour moi / pour tous, administrateur qui supprime, réactions ;
     · NOTIFICATIONS DANS L'APPLICATION : contact ajouté, ajout à un groupe, mention — et seulement pour un membre ;
     · ÉPHÉMÈRES : le balayeur CÂBLÉ du vrai service retire les messages échus, l'horloge étant avancée ;
     · NON-LUS : `lu_seq` ne recule jamais, le compteur de la liste baisse. */

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
let ipN = 40; const ip = () => '198.51.100.' + (ipN++);
const hex = () => crypto.randomBytes(4).toString('hex');
const cid = (p) => 'cid-' + p + '-' + hex() + hex();

(async () => {
  const noms = ['alice', 'bob', 'carla', 'dave', 'eve', 'frank'];
  const og = await T.fauxOpGestion(Object.fromEntries(noms.map(n => [n, { pass: 'pw-' + n + '-1234', nom: n[0].toUpperCase() + n.slice(1), actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { balayageMs: 100 } });
  const lire = () => T.lireBase(path.join(svc.data, 'msg.db'));
  const compte = () => { const d = lire(); try { return ['message', 'membre', 'conversation', 'reaction', 'notification', 'lien'].map(t => d.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n).join('/'); } finally { d.close(); } };
  try {
    const P = {};
    for (const n of noms) P[n] = await T.connecter(svc, og, n, 'pw-' + n + '-1234', ip());
    const relier = async (a, b) => { const l = await P[a].post('/api/contacts/lien', {}); return P[b].post('/api/liens/accepter', { code: l.j.code }); };
    for (const n of ['bob', 'carla', 'dave']) await relier('alice', n);
    const envoyer = (c, conv, texte, extra) => c.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: cid('m'), texte }, extra || {}));

    console.log('Un groupe : création, administrateur, non-contacts rendus et jamais ajoutés de force');
    let G;
    {
      const r = await P.alice.post('/api/conversations/groupe', { nom: '  Équipe  terrain ', membres: [P.bob.moi.id, P.carla.moi.id, P.eve.moi.id] });
      v('création : 201', r.code, 201);
      G = r.j.conversation.id;
      v('le nom est nettoyé (espaces)', r.j.conversation.nom, 'Équipe terrain');
      v('⛔ « eve » n\'est pas un contact d\'Alice : RENDUE dans non_ajoutes, pas ajoutée', [r.j.non_ajoutes, r.j.conversation.membres_n], [[P.eve.moi.id], 3]);
      v('le créateur est administrateur, les autres membres', [r.j.moi.role, r.j.membres.filter(m => m.role === 'admin').length], ['admin', 1]);
      v('Bob voit le groupe dans sa liste, et il en est membre simple', (await P.bob.get('/api/conversations')).j.conversations.filter(c => c.id === G).map(c => c.role), ['membre']);
      v('Eve ne voit rien (404, comme un groupe inexistant)', (await P.eve.get('/api/conversations/' + G)).code, 404);
      const n = await P.bob.get('/api/notifications');
      v('Bob a reçu une notification « groupe_ajoute » dans l\'application', n.j.notifications.filter(x => x.type === 'groupe_ajoute').length, 1);
      v('et le compteur de non-lues le dit', n.j.non_lues >= 1, true);
    }

    console.log('\nLa création refuse une forme piégée — et la base n\'a pas bougé');
    {
      const avant = compte();
      const cas = [
        ['nom absent', {}], ['nom non texte', { nom: 12 }], ['nom vide', { nom: '   ' }], ['nom de contrôle seul', { nom: '\u0000‮​' }], ['nom de 81 signes', { nom: 'x'.repeat(81), membres: [] }],
        ['membres non liste', { nom: 'a', membres: 'x' }], ['membre mal formé', { nom: 'a', membres: ['pas-un-id'] }], ['membre non texte', { nom: 'a', membres: [{ $ne: 1 }] }],
        ['annonces_seules non booléen', { nom: 'a', membres: [], annonces_seules: 'oui' }], ['éphémère hors liste', { nom: 'a', membres: [], ephemere_s: 5 }],
        ['avatar_piece (étape 4)', { nom: 'a', membres: [], avatar_piece: 'x' }], ['trop de membres', { nom: 'a', membres: Array.from({ length: 1100 }, () => 'p_' + crypto.randomBytes(16).toString('hex')) }],
      ];
      for (const [nom, corps] of cas) { const r = await P.alice.post('/api/conversations/groupe', corps); v('refusé (400) : ' + nom, [r.code, r.j.error], [400, 'champ_invalide']); }
      v('⛔ aucune écriture après tous ces refus', compte(), avant);
      const bidi = await P.alice.post('/api/conversations/groupe', { nom: 'A‮B​C\u0007D', membres: [] });
      v('un nom qui porte des marques bidirectionnelles et un caractère de contrôle est nettoyé, pas retourné', bidi.j.conversation.nom, 'ABCD');
    }

    console.log('\nAjouter, retirer, promouvoir, rétrograder : seul un administrateur, et jamais de force');
    {
      v('un membre simple ne peut pas ajouter (403 interdit)', (await P.bob.post('/api/conversations/' + G + '/membres/ajouter', { uids: [P.dave.moi.id] })).code, 403);
      const aj = await P.alice.post('/api/conversations/' + G + '/membres/ajouter', { uids: [P.dave.moi.id, P.frank.moi.id] });
      v('Dave (contact) est ajouté, Frank (non contact) est rendu — pas ajouté', [aj.code, aj.j.ajoutes, aj.j.non_ajoutes], [200, [P.dave.moi.id], [P.frank.moi.id]]);
      v('Frank ne voit toujours rien', (await P.frank.get('/api/conversations/' + G)).code, 404);
      for (const [nom, corps] of [['liste vide', { uids: [] }], ['mal formé', { uids: ['x'] }], ['non liste', { uids: 'x' }]]) v('ajout refusé : ' + nom, (await P.alice.post('/api/conversations/' + G + '/membres/ajouter', corps)).code, 400);
      v('la promotion exige un booléen', (await P.alice.post('/api/conversations/' + G + '/admins', { uid: P.bob.moi.id, admin: 'oui' })).code, 400);
      v('Alice promeut Bob', (await P.alice.post('/api/conversations/' + G + '/admins', { uid: P.bob.moi.id, admin: true })).code, 200);
      v('Bob, devenu administrateur, peut maintenant ajouter', (await P.bob.post('/api/conversations/' + G + '/membres/ajouter', { uids: [P.carla.moi.id] })).code, 200);
      v('Alice rétrograde Bob', (await P.alice.post('/api/conversations/' + G + '/admins', { uid: P.bob.moi.id, admin: false })).code, 200);
      v('⛔ Bob n\'est plus administrateur : retirer quelqu\'un lui est refusé (403)', (await P.bob.post('/api/conversations/' + G + '/membres/retirer', { uid: P.dave.moi.id })).code, 403);
      v('⛔ le DERNIER administrateur ne peut pas se rétrograder (409 dernier_admin)', (await P.alice.post('/api/conversations/' + G + '/admins', { uid: P.alice.moi.id, admin: false })).j.error, 'dernier_admin');
      v('on ne se retire pas soi-même par « retirer » (400 : c\'est « quitter »)', (await P.alice.post('/api/conversations/' + G + '/membres/retirer', { uid: P.alice.moi.id })).code, 400);
      v('retirer une personne qui n\'est pas membre : 404', (await P.alice.post('/api/conversations/' + G + '/membres/retirer', { uid: P.eve.moi.id })).code, 404);
      v('Alice retire Dave', (await P.alice.post('/api/conversations/' + G + '/membres/retirer', { uid: P.dave.moi.id })).code, 200);
      v('Dave n\'a plus aucun droit sur le groupe (404 en lecture, en écriture)', [(await P.dave.get('/api/conversations/' + G)).code, (await envoyer(P.dave, G, 'je suis encore là ?')).code], [404, 404]);
      const maj = await P.alice.post('/api/conversations/' + G + '/maj', { nom: 'Terrain' });
      v('renommer', [maj.code, maj.j.conversation.nom], [200, 'Terrain']);
      v('renommer : nom vide, non texte, 81 signes → 400', [(await P.alice.post('/api/conversations/' + G + '/maj', { nom: '' })).code, (await P.alice.post('/api/conversations/' + G + '/maj', { nom: 1 })).code, (await P.alice.post('/api/conversations/' + G + '/maj', { nom: 'x'.repeat(81) })).code], [400, 400, 400]);
      v('un avatar ne se pose pas encore (étape 4) : 400', (await P.alice.post('/api/conversations/' + G + '/maj', { avatar: 'x' })).code, 400);
    }

    console.log('\nUne conversation directe n\'est pas un groupe : ni nom, ni membres, ni lien, ni départ');
    {
      const D = (await P.alice.post('/api/conversations/directe', { uid: P.bob.moi.id })).j.conversation.id;
      v('deux appels donnent la MÊME conversation (201 puis 200)', (await P.alice.post('/api/conversations/directe', { uid: P.bob.moi.id })).j.conversation.id, D);
      v('l\'autre côté la retrouve aussi', (await P.bob.post('/api/conversations/directe', { uid: P.alice.moi.id })).j.conversation.id, D);
      v('ouvrir une directe avec soi-même : 400', (await P.alice.post('/api/conversations/directe', { uid: P.alice.moi.id })).code, 400);
      v('avec un non-contact : 404 (on ne dit pas qui existe)', (await P.alice.post('/api/conversations/directe', { uid: P.eve.moi.id })).code, 404);
      const dej = { admin: await P.alice.post('/api/conversations/' + D + '/membres/ajouter', { uids: [P.carla.moi.id] }), lien: await P.alice.post('/api/conversations/' + D + '/lien', {}), maj: await P.alice.post('/api/conversations/' + D + '/maj', { nom: 'X' }), quit: await P.alice.post('/api/conversations/' + D + '/quitter', {}) };
      v('⛔ ajouter à une directe ou y poser un lien : 409 conversation_directe (jamais une promotion en groupe)', [dej.admin.j.error, dej.lien.j.error], ['conversation_directe', 'conversation_directe']);
      v('renommer une directe : 400, la quitter : 409', [dej.maj.code, dej.quit.code], [400, 409]);
      v('et elle compte toujours deux membres', (await P.alice.get('/api/conversations/' + D)).j.conversation.membres_n, 2);
    }

    console.log('\nLe lien d\'invitation d\'un groupe : un nouveau membre ne voit PAS l\'historique');
    {
      await envoyer(P.alice, G, 'avant Eve — secret de l\'équipe');
      const l = await P.alice.post('/api/conversations/' + G + '/lien', { max: 1, jours: 1 });
      v('Alice crée un lien (201)', l.code, 201);
      v('un membre simple ne crée pas de lien (403)', (await P.carla.post('/api/conversations/' + G + '/lien', {})).code, 403);
      for (const [nom, corps] of [['max à 0', { max: 0 }], ['max à 101', { max: 101 }], ['jours à 31', { jours: 31 }], ['jours texte', { jours: 'x' }]]) v('lien refusé : ' + nom, (await P.alice.post('/api/conversations/' + G + '/lien', corps)).code, 400);
      const ap = await P.eve.post('/api/liens/lire', { code: l.j.code });
      v('Eve lit l\'aperçu sans rejoindre (le nom du groupe, rien de plus)', [ap.code, ap.j.apercu.genre, ap.j.apercu.groupe.nom], [200, 'groupe', 'Terrain']);
      v('et n\'est toujours pas membre', (await P.eve.get('/api/conversations/' + G)).code, 404);
      const ac = await P.eve.post('/api/liens/accepter', { code: l.j.code });
      v('Eve accepte : elle est membre', [ac.code, ac.j.genre, ac.j.conversation.id], [200, 'groupe', G]);
      const hist = await P.eve.get('/api/conversations/' + G + '/messages');
      v('⛔ Eve ne lit RIEN d\'avant son arrivée (ni le texte ni le nombre)', hist.j.messages.filter(m => m.texte && /secret de l'équipe/.test(m.texte)).length, 0);
      await envoyer(P.alice, G, 'après Eve');
      v('mais lit ce qui suit', (await P.eve.get('/api/conversations/' + G + '/messages')).j.messages.filter(m => m.texte === 'après Eve').length, 1);
      const deux = await P.frank.post('/api/liens/accepter', { code: l.j.code });
      v('⛔ un lien à usage unique ne sert qu\'une fois : le second est 410 lien_invalide', [deux.code, deux.j.error], [410, 'lien_invalide']);
      v('et il répond comme un lien inventé (pas de différence observable)', (await P.frank.post('/api/liens/accepter', { code: 'x'.repeat(22) })).j.error, 'lien_invalide');
    }

    console.log('\nMessages : forme, taille, renvoi, réponse, modification, suppression, réaction');
    {
      const avant = compte();
      const cas = [
        ['sans cid', { texte: 'x' }], ['cid trop court', { cid: 'abc', texte: 'x' }], ['cid avec espace', { cid: 'a b c d e f g h', texte: 'x' }], ['cid non texte', { cid: 12345678, texte: 'x' }],
        ['texte absent', { cid: cid('t') }], ['texte non texte', { cid: cid('t'), texte: { a: 1 } }], ['texte vide', { cid: cid('t'), texte: '' }], ['texte de blancs', { cid: cid('t'), texte: ' \n\t ' }],
        ['texte de contrôles seuls', { cid: cid('t'), texte: '\u0000\u0007‮' }], ['type pièce (étape 4)', { cid: cid('t'), texte: 'x', type: 'image' }], ['reponse_a texte', { cid: cid('t'), texte: 'x', reponse_a: 'a' }], ['reponse_a zéro', { cid: cid('t'), texte: 'x', reponse_a: 0 }],
      ];
      for (const [nom, corps] of cas) { const r = await P.alice.post('/api/conversations/' + G + '/messages', corps); v('refusé (400) : ' + nom, [r.code, r.j.error], [400, 'champ_invalide']); }
      const long = await envoyer(P.alice, G, 'x'.repeat(8001));
      v('8 001 signes : 413 trop_long', [long.code, long.j.error], [413, 'trop_long']);
      v('16 001 signes UTF-16 : 413 aussi, avant tout travail', (await envoyer(P.alice, G, 'x'.repeat(16001))).code, 413);
      v('8 000 signes passent', (await envoyer(P.alice, G, 'y'.repeat(8000))).code, 201);
      v('⛔ rien n\'est écrit par les refus : seul le message de 8 000 signes est entré (+1 ligne de message)', compte().split('/')[0] - avant.split('/')[0], 1);
      const m = await envoyer(P.alice, G, 'bonjour');
      const c = cid('rejeu');
      const un = await envoyer(P.alice, G, 'une fois', { cid: c }), deux = await envoyer(P.alice, G, 'une fois', { cid: c });
      v('⛔ un renvoi (réponse perdue) rend le MÊME seq, sans créer un deuxième message', [un.code, deux.code, deux.j.deja, deux.j.seq === un.j.seq], [201, 200, true, true]);
      v('et un seul message porte ce texte', (await P.alice.get('/api/conversations/' + G + '/messages')).j.messages.filter(x => x.texte === 'une fois').length, 1);
      const rep = await envoyer(P.bob, G, 'en réponse', { reponse_a: m.j.seq });
      v('réponse à un message existant', [rep.code, (await P.bob.get('/api/conversations/' + G + '/messages')).j.messages.find(x => x.seq === rep.j.seq).repond_a], [201, m.j.seq]);
      v('réponse à un message inconnu : 404 message_inconnu', (await envoyer(P.bob, G, 'x', { reponse_a: 99999 })).j.error, 'message_inconnu');
      v('⛔ Eve ne répond pas à un message d\'AVANT son arrivée (404 : il n\'existe pas pour elle)', (await envoyer(P.eve, G, 'x', { reponse_a: 1 })).code, 404);
      const mod = await P.alice.post('/api/conversations/' + G + '/messages/modifier', { seq: m.j.seq, texte: 'bonjour corrigé' });
      v('l\'auteur modifie', [mod.code, mod.j.ok], [200, true]);
      v('⛔ un autre membre ne modifie pas (403)', (await P.bob.post('/api/conversations/' + G + '/messages/modifier', { seq: m.j.seq, texte: 'piraté' })).code, 403);
      v('et le texte lu est celui de l\'auteur', (await P.bob.get('/api/conversations/' + G + '/messages')).j.messages.find(x => x.seq === m.j.seq).texte, 'bonjour corrigé');
      for (const [nom, corps] of [['seq absent', { texte: 'x' }], ['seq zéro', { seq: 0, texte: 'x' }], ['seq texte', { seq: 'a', texte: 'x' }], ['texte vide', { seq: m.j.seq, texte: '' }], ['texte non texte', { seq: m.j.seq, texte: 5 }]]) v('modifier refusé : ' + nom, (await P.alice.post('/api/conversations/' + G + '/messages/modifier', corps)).code, 400);
      v('modifier un message inexistant : 404', (await P.alice.post('/api/conversations/' + G + '/messages/modifier', { seq: 99999, texte: 'x' })).code, 404);
      const rx = await P.bob.post('/api/conversations/' + G + '/messages/reagir', { seq: m.j.seq, emoji: '👍' });
      v('réaction', [rx.code, rx.j.reactions.map(r => r.emoji)], [200, ['👍']]);
      v('la même personne change de réaction : une seule ligne', (await P.bob.post('/api/conversations/' + G + '/messages/reagir', { seq: m.j.seq, emoji: '❤️' })).j.reactions.filter(r => r.uid === P.bob.moi.id).length, 1);
      v('une réaction vide la retire', (await P.bob.post('/api/conversations/' + G + '/messages/reagir', { seq: m.j.seq, emoji: '' })).j.reactions.length, 0);
      for (const e of ['abc', '<b>', 'x'.repeat(40), 12, null]) v('réaction refusée : ' + JSON.stringify(e), (await P.bob.post('/api/conversations/' + G + '/messages/reagir', { seq: m.j.seq, emoji: e })).code, 400);
      v('supprimer : « pour » doit être moi ou tous', (await P.alice.post('/api/conversations/' + G + '/messages/supprimer', { seq: m.j.seq, pour: 'personne' })).code, 400);
      const pourMoi = await envoyer(P.alice, G, 'pour moi seulement');
      await P.bob.post('/api/conversations/' + G + '/messages/supprimer', { seq: pourMoi.j.seq, pour: 'moi' });
      const lb = (await P.bob.get('/api/conversations/' + G + '/messages')).j.messages, la = (await P.alice.get('/api/conversations/' + G + '/messages')).j.messages;
      v('⛔ « pour moi » ne retire le message qu\'à celui qui le demande', [lb.some(x => x.seq === pourMoi.j.seq), la.some(x => x.seq === pourMoi.j.seq && x.texte === 'pour moi seulement')], [false, true]);
      const bobMsg = await envoyer(P.bob, G, 'message de Bob');
      v('⛔ un membre simple ne supprime pas « pour tous » le message d\'un autre (403)', (await P.carla.post('/api/conversations/' + G + '/messages/supprimer', { seq: bobMsg.j.seq, pour: 'tous' })).code, 403);
      v('l\'administrateur le peut', (await P.alice.post('/api/conversations/' + G + '/messages/supprimer', { seq: bobMsg.j.seq, pour: 'tous' })).code, 200);
      const apres = (await P.carla.get('/api/conversations/' + G + '/messages')).j.messages.find(x => x.seq === bobMsg.j.seq);
      v('la pierre tombale reste, le texte ne se lit plus nulle part', [apres.supprime, apres.texte], [true, null]);
      const d = lire(); try { vrai('et il n\'est plus lisible sur le disque', !/message de Bob/.test(JSON.stringify(d.prepare('SELECT corps_ch FROM message WHERE seq = ?').all(bobMsg.j.seq).map(r => Buffer.from(r.corps_ch || '').toString('latin1'))))); } finally { d.close(); }
    }

    console.log('\nLa pagination : avant_seq, apres_seq, limite — sans trou ni doublon');
    {
      const P2 = (await P.alice.post('/api/conversations/groupe', { nom: 'Pagination', membres: [P.bob.moi.id] })).j.conversation.id;
      const seqs = [];
      for (let i = 0; i < 25; i++) seqs.push((await envoyer(P.alice, P2, 'p' + i)).j.seq);
      const lis = async (q) => (await P.bob.get('/api/conversations/' + P2 + '/messages' + q));
      const dern = await lis('?limite=10');
      v('les 10 derniers, du plus ancien au plus récent', [dern.code, dern.j.messages.length, dern.j.a_plus, dern.j.messages.map(m => m.seq).join() === seqs.slice(-10).join()], [200, 10, true, true]);
      let toutes = [], avant = null, tours = 0;
      for (;;) { const r = await lis('?limite=10' + (avant ? '&avant_seq=' + avant : '')); toutes = r.j.messages.map(m => m.seq).concat(toutes); tours++; if (!r.j.a_plus) break; avant = r.j.messages[0].seq; }
      const texteSys = toutes.length - 25;
      v('⛔ remonter page par page rend tout, sans doublon et dans l\'ordre (les lignes système comprises : ' + texteSys + ')', [new Set(toutes).size === toutes.length, toutes.slice(-25).join() === seqs.join(), toutes.every((s, i) => i === 0 || s > toutes[i - 1])], [true, true, true]);
      vrai('population : plus d\'une page a été jouée', tours >= 3);
      const suite = await lis('?apres_seq=' + seqs[19] + '&limite=100');
      v('apres_seq rend les suivants, dans l\'ordre ascendant', suite.j.messages.map(m => m.seq).join(), seqs.slice(20).join());
      v('limite est plafonnée à 100 (jamais de lecture sans borne)', (await lis('?limite=100000')).code === 200 && (await lis('?limite=100000')).j.messages.length <= 100, true);
      for (const q of ['?limite=abc', '?avant_seq=-1', '?apres_seq=1.5', '?limite=1e3', '?avant_seq=5&apres_seq=2', '?limite=' + '9'.repeat(30)]) v('refusé (400) : ' + q, (await lis(q)).code, 400);
      v('limite=0 : valeur par défaut, pas une erreur ni une page vide infinie', (await lis('?limite=0')).j.messages.length > 0, true);
    }

    console.log('\n« Seuls les admins écrivent » : le membre est refusé, l\'administrateur écrit, la levée marche');
    {
      const A = (await P.alice.post('/api/conversations/groupe', { nom: 'Annonces', membres: [P.bob.moi.id], annonces_seules: true })).j.conversation.id;
      const b = await envoyer(P.bob, A, 'je veux parler');
      v('⛔ le membre simple : 403 annonces_seules', [b.code, b.j.error], [403, 'annonces_seules']);
      v('l\'administrateur écrit', (await envoyer(P.alice, A, 'annonce')).code, 201);
      const lu = await P.bob.get('/api/conversations/' + A + '/messages'), sq = lu.j.messages.find(x => x.texte === 'annonce').seq;
      v('le membre peut quand même lire et réagir', [lu.code, (await P.bob.post('/api/conversations/' + A + '/messages/reagir', { seq: sq, emoji: '👍' })).code], [200, 200]);
      v('un membre simple ne change pas le réglage (403)', (await P.bob.post('/api/conversations/' + A + '/maj', { annonces_seules: false })).code, 403);
      v('l\'administrateur lève la restriction', (await P.alice.post('/api/conversations/' + A + '/maj', { annonces_seules: false })).j.conversation.annonces_seules, false);
      v('et le membre écrit', (await envoyer(P.bob, A, 'merci')).code, 201);
      v('un réglage qui n\'est pas un booléen est refusé', (await P.alice.post('/api/conversations/' + A + '/maj', { annonces_seules: 'non' })).code, 400);
    }

    console.log('\nNotifications dans l\'application : contact ajouté, groupe, mention — jamais pour un non-membre');
    {
      const Gm = (await P.alice.post('/api/conversations/groupe', { nom: 'Mentions', membres: [P.bob.moi.id, P.carla.moi.id] })).j.conversation.id;
      const avantB = (await P.bob.get('/api/notifications')).j.notifications.length;
      await envoyer(P.alice, Gm, '@bob regarde', { mentions: [P.bob.moi.id, P.alice.moi.id, P.eve.moi.id, 'pas-un-id', { x: 1 }] });
      const nb = (await P.bob.get('/api/notifications')).j.notifications;
      v('Bob est notifié de la mention', nb.filter(x => x.type === 'mention').length, 1);
      v('⛔ ni l\'auteur (lui-même), ni un NON-membre (Eve), ni une valeur piégée ne reçoit rien', [(await P.alice.get('/api/notifications')).j.notifications.filter(x => x.type === 'mention').length, (await P.eve.get('/api/notifications')).j.notifications.filter(x => x.type === 'mention').length], [0, 0]);
      v('la notification dit « Alice a mentionné » sans le texte du message (l\'aperçu reste dans la conversation)', nb.filter(x => x.type === 'mention').every(x => !/regarde/.test(JSON.stringify(x))), true);
      const ctc = (await P.alice.get('/api/notifications')).j.notifications.filter(x => x.type === 'contact_ajoute');
      v('Alice a été prévenue quand Bob, Carla et Dave ont accepté son lien', ctc.length, 3);
      const l = (await P.bob.get('/api/notifications')).j.notifications.filter(x => !x.lue).slice(0, 2).map(x => x.id);
      v('marquer deux notifications lues', (await P.bob.post('/api/notifications/lues', { ids: l })).j.n, 2);
      v('toutes', (await P.bob.post('/api/notifications/lues', { toutes: true })).code, 200);
      v('et le compteur tombe à zéro', (await P.bob.get('/api/notifications')).j.non_lues, 0);
      for (const c of [{ ids: 'x' }, { ids: ['x'] }, { ids: Array.from({ length: 201 }, () => 'n_' + crypto.randomBytes(16).toString('hex')) }, {}]) v('« lues » refuse une forme piégée', (await P.bob.post('/api/notifications/lues', c)).code, 400);
      v('⛔ on ne marque pas lue la notification d\'un autre', (await P.carla.post('/api/notifications/lues', { ids: nb.map(x => x.id) })).j.n, 0);
      vrai('population : Bob avait des notifications avant et après', avantB >= 1 && nb.length >= avantB);
    }

    console.log('\nLe profil (moi/maj) : chaque champ validé, jamais l\'identité');
    {
      const E = P.eve;
      const ok = await E.post('/api/moi/maj', { prenom: ' Éve ', statut: 'en tournée', langue: 'fr-FR', tz: 'Europe/Paris', prefs: { presence: false } });
      v('mise à jour valide', [ok.code, ok.j.moi.prenom, ok.j.moi.statut, ok.j.moi.langue], [200, 'Éve', 'en tournée', 'fr-FR']);
      v('la préférence de présence est enregistrée', (await E.get('/api/moi')).j.moi.prefs.presence, false);
      for (const [nom, c] of [['prénom vide', { prenom: '  ' }], ['prénom de 61 signes', { prenom: 'x'.repeat(61) }], ['prénom non texte', { prenom: 3 }], ['statut de 141 signes', { statut: 'x'.repeat(141) }], ['langue mal formée', { langue: 'français' }], ['fuseau inconnu', { tz: 'Mars/Olympus' }], ['fuseau géant', { tz: 'x'.repeat(65) }], ['prefs non objet', { prefs: [1] }], ['pref non booléenne', { prefs: { presence: 'non' } }]]) v('refusé (400) : ' + nom, (await E.post('/api/moi/maj', c)).code, 400);
      const id0 = E.moi.id;
      const fl = await E.post('/api/moi/maj', { id: 'p_' + '0'.repeat(32), identifiant: 'beta:autre', origine: 'compte', verifie: false, statut: 'ok' });
      v('⛔ un identifiant, une origine ou une vérification envoyés sont IGNORÉS', [fl.j.moi.id, fl.j.moi.origine], [id0, 'beta']);
    }

    console.log('\nLes messages éphémères : le balayeur câblé du vrai service retire les échus');
    {
      const Ge = (await P.alice.post('/api/conversations/groupe', { nom: 'Éphémère', membres: [P.bob.moi.id], ephemere_s: 86400 })).j.conversation.id;
      v('la durée est portée par la conversation', (await P.bob.get('/api/conversations/' + Ge)).j.conversation.ephemere_s, 86400);
      const e = await envoyer(P.alice, Ge, 'ceci disparaîtra');
      v('le message est lisible au départ', (await P.bob.get('/api/conversations/' + Ge + '/messages')).j.messages.some(x => x.texte === 'ceci disparaîtra'), true);
      svc.avancer(25 * 3600000);
      /* ⛔ On attend la LIGNE, pas la lecture : depuis la relecture adverse les lectures filtrent l'échéance tout de suite
         (le message « part » avant le balayeur) ; remettre l'horloge avant le passage du balayeur laisserait la ligne. */
      const parti = await T.attendre(() => { const d = lire(); try { return d.prepare('SELECT COUNT(*) AS n FROM message WHERE conv = ? AND seq = ?').get(Ge, e.j.seq).n === 0; } finally { d.close(); } }, 6000, 50);
      svc.avancer(-25 * 3600000);
      vrai('⛔ le balayeur du service (pas un appel direct) a retiré le message échu', !!parti);
      const d = lire(); try { v('et la ligne n\'existe plus sur le disque', d.prepare('SELECT COUNT(*) AS n FROM message WHERE conv = ? AND seq = ?').get(Ge, e.j.seq).n, 0); } finally { d.close(); }
      v('une durée hors liste est refusée à la modification', (await P.alice.post('/api/conversations/' + Ge + '/maj', { ephemere_s: 3600 })).code, 400);
      v('et une durée de la liste passe', (await P.alice.post('/api/conversations/' + Ge + '/maj', { ephemere_s: 604800 })).j.conversation.ephemere_s, 604800);
    }

    console.log('\nLes non-lus : lu_seq ne recule jamais, la liste le montre');
    {
      const Gn = (await P.alice.post('/api/conversations/groupe', { nom: 'Non lus', membres: [P.bob.moi.id] })).j.conversation.id;
      const s = [];
      for (let i = 0; i < 4; i++) s.push((await envoyer(P.alice, Gn, 'n' + i)).j.seq);
      const non = async () => (await P.bob.get('/api/conversations')).j.conversations.find(c => c.id === Gn).non_lus;
      v('quatre messages d\'Alice : quatre non-lus pour Bob, zéro pour Alice', [await non(), (await P.alice.get('/api/conversations')).j.conversations.find(c => c.id === Gn).non_lus], [4, 0]);
      v('Bob lit jusqu\'au deuxième', (await P.bob.post('/api/conversations/' + Gn + '/lu', { seq: s[1] })).j.lu_seq, s[1]);
      v('il en reste deux', await non(), 2);
      v('⛔ un retour en arrière ne fait PAS reculer lu_seq', (await P.bob.post('/api/conversations/' + Gn + '/lu', { seq: s[0] })).j.lu_seq, s[1]);
      v('lu au-delà du dernier : borné (jamais plus que ce qui existe)', (await P.bob.post('/api/conversations/' + Gn + '/lu', { seq: 9999999 })).j.lu_seq <= 9999999, true);
      v('tout est lu', await non(), 0);
      for (const c of [{}, { seq: -1 }, { seq: 'a' }, { seq: 1.5 }]) v('« lu » refuse une forme piégée', (await P.bob.post('/api/conversations/' + Gn + '/lu', c)).code, 400);
      const pr = await P.bob.post('/api/conversations/' + Gn + '/prefs', { epingle: true, archive: false, muet_jusqua: Date.now() + 3600000 });
      v('épingler, désarchiver, mettre en sourdine', pr.code, 200);
      v('« prefs » vide ou piégé est refusé', [(await P.bob.post('/api/conversations/' + Gn + '/prefs', {})).code, (await P.bob.post('/api/conversations/' + Gn + '/prefs', { epingle: 'oui' })).code, (await P.bob.post('/api/conversations/' + Gn + '/prefs', { muet_jusqua: -5 })).code], [400, 400, 400]);
      v('la conversation épinglée passe en tête de SA liste', (await P.bob.get('/api/conversations')).j.conversations[0].id, Gn);
      v('et Alice ne la voit pas épinglée (la préférence est par membre)', (await P.alice.get('/api/conversations')).j.conversations.find(c => c.id === Gn).epingle, false);
    }

    console.log('\nQuitter un groupe : le dernier administrateur passe la main, le dernier membre le ferme');
    {
      const Gq = (await P.alice.post('/api/conversations/groupe', { nom: 'Départ', membres: [P.bob.moi.id, P.carla.moi.id] })).j.conversation.id;
      v('Alice (seule administratrice) quitte', (await P.alice.post('/api/conversations/' + Gq + '/quitter', {})).code, 200);
      v('⛔ le groupe n\'est pas orphelin : un membre a pris la relève', (await P.bob.get('/api/conversations/' + Gq)).j.membres.filter(m => m.role === 'admin').length, 1);
      v('Alice n\'a plus aucun droit (404)', (await P.alice.get('/api/conversations/' + Gq)).code, 404);
      await P.bob.post('/api/conversations/' + Gq + '/quitter', {}); await P.carla.post('/api/conversations/' + Gq + '/quitter', {});
      const d = lire(); try { v('le dernier parti, la conversation et ses messages n\'existent plus', [d.prepare('SELECT COUNT(*) AS n FROM conversation WHERE id = ?').get(Gq).n, d.prepare('SELECT COUNT(*) AS n FROM message WHERE conv = ?').get(Gq).n], [0, 0]); } finally { d.close(); }
    }
    console.log('\n' + 'Contacts : retirer, bloquer, débloquer, et la lecture d\'une personne');
    {
      v('bloquer une personne mal formée : 400', (await P.alice.post('/api/contacts/bloquer', { uid: 'x' })).code, 400);
      v('bloquer soi-même : 400', (await P.alice.post('/api/contacts/bloquer', { uid: P.alice.moi.id })).code, 400);
      v('bloquer un inconnu : 404', (await P.alice.post('/api/contacts/bloquer', { uid: 'p_' + '1'.repeat(32) })).code, 404);
      v('débloquer quelqu\'un qui n\'est pas bloqué : 404', (await P.alice.post('/api/contacts/debloquer', { uid: P.dave.moi.id })).code, 404);
      v('Alice bloque Dave', (await P.alice.post('/api/contacts/bloquer', { uid: P.dave.moi.id })).code, 200);
      v('la fiche de Dave se lit encore (c\'est un contact)', (await P.alice.get('/api/personnes/' + P.dave.moi.id)).j.personne.contact, true);
      v('Alice le débloque', (await P.alice.post('/api/contacts/debloquer', { uid: P.dave.moi.id })).code, 200);
      v('Alice retire Dave de ses contacts', (await P.alice.post('/api/contacts/retirer', { uid: P.dave.moi.id })).code, 200);
      v('⛔ la fiche d\'une personne qu\'on ne partage pas est 404 (pas d\'annuaire)', (await P.alice.get('/api/personnes/' + P.frank.moi.id)).code, 404);
      v('un identifiant de personne mal formé : 404', (await P.alice.get('/api/personnes/x')).code, 404);
      v('la liste des contacts rend des contacts, pas des inconnus', (await P.alice.get('/api/contacts')).j.contacts.some(c => c.id === P.frank.moi.id), false);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  await svc.arreter(); await og.fermer();
  fin();
})();
