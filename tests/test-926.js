/* ⛔ CE QUE CE FICHIER GARDE — LES CARTES D'UNE CONVERSATION : UNE POSITION, LA FICHE D'UN CONTACT, UN SONDAGE (famille 3 : le VRAI service, en HTTP).

   7 octobre 2026 : « on peut proposer la demande de localisation s'il l'active dans les paramètres — c'est une sécurité pour eux ; on peut partager des contacts directement ;
   faire des sondages personnalisables, avec ses règles de sondage — on garde le système de WhatsApp, mais on l'améliore ».
   Une carte est un message TEXTE (son résumé : ce que montrent une version d'avant, une notification, l'aperçu de la liste) qui porte sa forme dans `meta.k`. Ce banc tient :
     · ⛔ la POSITION est COUPÉE par défaut : le service la refuse (403 `position_desactivee`) tant que la personne ne l'a pas allumée dans Confidentialité — une page qui
       l'oublierait ne la ferait pas partir ; le résumé ne porte pas les coordonnées (une notification se lit sur un écran verrouillé) ;
     · ⛔ la FICHE d'un contact : seulement un de MES contacts, qui se laisse trouver (« par tous ») — sinon son choix de rester introuvable ne vaudrait rien ; qui la reçoit
       peut demander cette personne, avec les mêmes refus qu'une demande par identifiant ; une fiche qu'on ne voit pas (étranger, arrivé après) ne prouve rien ;
     · le SONDAGE et ses RÈGLES : plusieurs réponses ou une, anonyme (pour les MEMBRES : personne ne voit qui a voté quoi, l'auteur non plus), les membres ajoutent des
       choix ou non, les résultats visibles toujours / après avoir voté / à la clôture, une échéance ; clore (l'auteur ou un administrateur) ; jamais de vote après ;
       ⛔ deux choix qui ne diffèrent que par la casse ou les accents sont le même choix ; douze au plus ; le message effacé emporte le sondage ;
     · chaque changement prévient les membres (`sondage` : « relis-le », chacun avec SES droits) ;
     · une carte ne se modifie pas ; mes votes partent dans « Mes données ».  */
'use strict';
const path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { v, vrai, fin } = T.compteur();
const MDP = (l) => 'pw-' + l + '-1234';

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(['alice', 'bruno', 'carla', 'dave', 'eve'].map(l => [l, { pass: MDP(l), nom: l[0].toUpperCase() + l.slice(1) + ' Banc', actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true });
  const flux = [];
  const compter = (sql, ...a) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(sql).get(...a).n; } finally { d.close(); } };
  try {
    const [A, B, C, D, E] = await Promise.all(['alice', 'bruno', 'carla', 'dave', 'eve'].map(l => T.connecter(svc, og, l, MDP(l))));
    const B0id = B.moi.id;
    const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); await y.post('/api/liens/accepter', { code: l.j.code }); };
    await relier(A, B); await relier(A, C); await relier(A, D); await relier(A, E); await relier(B, C);
    const G = (await A.post('/api/conversations/groupe', { nom: 'Chantier Nord', membres: [B.moi.id, C.moi.id] })).j.conversation.id;
    const cid = () => 'cid-' + Math.random().toString(36).slice(2);
    const envoyer = (P, corps) => P.post('/api/conversations/' + G + '/messages', Object.assign({ cid: cid() }, corps));
    const message = async (P, seq) => (await P.get('/api/conversations/' + G + '/messages')).j.messages.find(m => m.seq === seq);
    const fB = await T.flux(B); flux.push(fB);

    console.log('\n1. La position : coupée tant qu\'on ne l\'allume pas');
    let r = await A.get('/api/moi/confidentialite');
    v('Confidentialité dit la position COUPÉE par défaut', [r.code, r.j.position], [200, false]);
    r = await envoyer(A, { type: 'position', lat: 48.8566, lng: 2.3522, precision: 12 });
    v('⛔ envoyer une position sans l\'avoir allumée : 403 position_desactivee (le service refuse, pas seulement la page)', [r.code, r.j.error], [403, 'position_desactivee']);
    r = await A.post('/api/moi/confidentialite', { position: 'oui' });
    v('le réglage n\'accepte qu\'un vrai ou faux', r.code, 400);
    await A.post('/api/moi/maj', { prefs: { position: true } });
    v('⛔ une seule porte l\'allume : « position » glissée dans les préférences générales (`/api/moi/maj`) n\'allume rien', [(await A.get('/api/moi/confidentialite')).j.position, (await envoyer(A, { type: 'position', lat: 1, lng: 1 })).code], [false, 403]);
    r = await A.post('/api/moi/confidentialite', { position: true });
    v('Alice l\'allume dans Confidentialité', [r.code, r.j.position], [200, true]);
    r = await envoyer(A, { type: 'position', lat: 48.8566123456, lng: 2.3522, precision: 12 });
    v('elle envoie sa position : 201', r.code, 201);
    let m = await message(B, r.j.seq);
    v('Bruno reçoit une carte « position » (coordonnées arrondies au millionième, la précision)', [m.type, m.meta], ['texte', { k: 'position', lat: 48.856612, lng: 2.3522, prec: 12 }]);
    v('⛔ le résumé ne porte PAS les coordonnées (il part dans une notification, se lit sur un écran verrouillé)', m.texte, '📍 Position partagée');
    const refusesPos = await Promise.all([
      envoyer(A, { type: 'position', lat: 91, lng: 0 }), envoyer(A, { type: 'position', lat: 0, lng: -181 }), envoyer(A, { type: 'position', lat: '48', lng: 2 }),
      envoyer(A, { type: 'position', lat: 1, lng: 1, precision: -1 }), envoyer(A, { type: 'position', lat: 1, lng: 1, texte: 'coucou' }), envoyer(A, { type: 'position', lat: NaN, lng: 1 }),
    ]);
    v('latitude hors bornes, longitude hors bornes, texte au lieu d\'un nombre, précision négative, un texte en plus, NaN : 400', refusesPos.map(x => x.code), [400, 400, 400, 400, 400, 400]);
    r = await A.post('/api/conversations/' + G + '/messages/modifier', { seq: m.seq, texte: '📍 Ailleurs' });
    v('⛔ une carte ne se modifie pas (son texte est son résumé)', [r.code, r.j.error], [409, 'type_invalide']);
    await A.post('/api/moi/confidentialite', { position: false });
    v('Alice la recoupe : le service refuse de nouveau', (await envoyer(A, { type: 'position', lat: 1, lng: 1 })).code, 403);

    console.log('\n2. La fiche d\'un contact');
    r = await envoyer(A, { type: 'contact', uid: D.moi.id });
    v('Alice partage la fiche de Dave (son contact, trouvable par tous) : 201', r.code, 201);
    const seqFiche = r.j.seq;
    m = await message(C, seqFiche);
    v('Carla reçoit une carte « contact » : l\'identifiant de Dave, son prénom seul', [m.meta.k, m.meta.uid, m.meta.prenom, typeof m.meta.identifiant], ['contact', D.moi.id, 'Dave', 'string']);
    v('⛔ le résumé (notification, aperçu, version d\'avant) ne nomme personne', m.texte, '👤 Fiche de contact');
    const refusesFiche = await Promise.all([
      envoyer(B, { type: 'contact', uid: D.moi.id }), envoyer(A, { type: 'contact', uid: A.moi.id }), envoyer(A, { type: 'contact', uid: 'p_x' }), envoyer(A, { type: 'contact' }),
    ]);
    v('⛔ Bruno partage Dave (pas un de SES contacts), Alice elle-même, un identifiant mal formé, rien : 404, 400, 400, 400', refusesFiche.map(x => x.code), [404, 400, 400, 400]);
    await D.post('/api/moi/confidentialite', { trouvable: 'personne' });
    r = await envoyer(A, { type: 'contact', uid: D.moi.id });
    v('⛔ Dave devient introuvable : sa fiche ne se partage plus (403 contact_non_partageable)', [r.code, r.j.error], [403, 'contact_non_partageable']);
    const demander = (P, corps) => P.post('/api/contacts/demander_carte', corps);
    r = await demander(C, { conv: G, seq: seqFiche });
    v('⛔ …et la fiche DÉJÀ envoyée ne permet plus de le demander (son choix vaut à l\'instant de la demande)', r.code, 404);
    v('⛔ …ni ne dit plus qui il est : la fiche se lit à l\'instant (ni identifiant, ni prénom)', (await message(C, seqFiche)).meta, { k: 'contact', uid: null, prenom: null, identifiant: null });
    await D.post('/api/moi/confidentialite', { trouvable: 'tous' });
    r = await demander(C, { conv: G, seq: seqFiche });
    v('Dave se laisse trouver de nouveau : Carla le demande depuis la fiche reçue — demande envoyée', [r.code, r.j.resultat], [200, 'envoyee']);
    v('…et sa fiche redit qui il est', [(await message(C, seqFiche)).meta.uid, (await message(C, seqFiche)).meta.prenom], [D.moi.id, 'Dave']);
    const recues = (await D.get('/api/contacts/demandes')).j.recues || [];
    vrai('Dave voit la demande de Carla', recues.some(x => x.id === C.moi.id));
    v('la redemander : « déjà envoyée »', (await demander(C, { conv: G, seq: seqFiche })).j.resultat, 'deja_envoyee');
    const refusesDem = await Promise.all([
      demander(E, { conv: G, seq: seqFiche }), demander(C, { conv: G, seq: 1 }), demander(C, { conv: G, seq: 0 }), demander(C, { conv: 'x', seq: seqFiche }), demander(C, { conv: G, seq: '3' }),
    ]);
    v('⛔ Eve (étrangère à la conversation), un message qui n\'est pas une fiche, un numéro nul, une conversation mal formée, un numéro en texte : 404, 404, 400, 400, 400', refusesDem.map(x => x.code), [404, 404, 400, 400, 400]);
    await A.post('/api/conversations/' + G + '/membres/ajouter', { uids: [D.moi.id] });
    v('⛔ Dave arrive APRÈS la fiche : elle n\'existe pas pour lui (404)', (await demander(D, { conv: G, seq: seqFiche })).code, 404);

    console.log('\n3. Le sondage et ses règles');
    const nouveau = (P, corps) => envoyer(P, Object.assign({ type: 'sondage' }, corps));
    const refusesSond = await Promise.all([
      nouveau(A, { question: 'Quand ?', choix: ['Lundi'] }),
      nouveau(A, { question: 'Quand ?', choix: ['Lundi', 'lundi'] }),
      nouveau(A, { question: 'Quand ?', choix: ['Été', 'ete'] }),
      nouveau(A, { question: 'Quand ?', choix: Array.from({ length: 13 }, (_, i) => 'Choix ' + i) }),
      nouveau(A, { question: '', choix: ['a', 'b'] }),
      nouveau(A, { question: 'Quand ?', choix: ['a', ''] }),
      nouveau(A, { question: 'Quand ?', choix: ['a', 'b'], regles: { multiple: 'oui' } }),
      nouveau(A, { question: 'Quand ?', choix: ['a', 'b'], regles: { resultats: 'jamais' } }),
      nouveau(A, { question: 'Quand ?', choix: ['a', 'b'], regles: { fin: Date.now() + 1000 } }),
      nouveau(A, { question: 'Quand ?', choix: ['a', 'x'.repeat(101)] }),
    ]);
    v('un seul choix, deux choix égaux (casse), deux choix égaux (accents), treize choix, sans question, un choix vide, une règle qui n\'est pas un booléen, un affichage inconnu, une échéance dans une seconde, un choix trop long : 400 partout', refusesSond.map(x => x.code), Array(10).fill(400));

    // un sondage « classique » : une réponse, résultats visibles
    r = await nouveau(A, { question: 'On se retrouve où ?', choix: ['Au dépôt', 'Sur le chantier', 'Au bureau'] });
    v('Alice crée un sondage : 201', r.code, 201);
    const S1 = r.j.seq;
    m = await message(B, S1);
    v('Bruno reçoit la carte « sondage » et son résumé', [m.meta, m.texte], [{ k: 'sondage', q: 'On se retrouve où ?' }, '📊 Sondage : On se retrouve où ?']);
    const lire = (P, s) => P.get('/api/conversations/' + G + '/sondages/' + s);
    const voter = (P, s, choix) => P.post('/api/conversations/' + G + '/sondages/' + s + '/voter', { choix });
    r = await lire(B, S1);
    v('Bruno le lit : trois choix, aucun vote, règles par défaut', [r.code, r.j.choix.map(c => c.texte), r.j.choix.map(c => c.n), r.j.regles], [200, ['Au dépôt', 'Sur le chantier', 'Au bureau'], [0, 0, 0], { multiple: false, anonyme: false, ajout: false, resultats: 'toujours', fin: null }]);
    v('⛔ une seule réponse permise : en donner deux est refusé', (await voter(B, S1, [0, 1])).code, 400);
    v('un choix qui n\'existe pas, un choix négatif : 400', [(await voter(B, S1, [3])).code, (await voter(B, S1, [-1])).code], [400, 400]);
    const n0 = fB.evenements.length;
    r = await voter(B, S1, [1]);
    v('Bruno vote « Sur le chantier » : ses choix, le décompte, qui', [r.code, r.j.mes_choix, r.j.choix[1].n, r.j.choix[1].qui], [200, [1], 1, [B.moi.id]]);
    vrai('⛔ les membres sont prévenus (« sondage » : relis-le)', !!(await fB.attendre(e => e.event === 'sondage' && e.data.seq === S1 && fB.evenements.indexOf(e) >= n0)));
    r = await voter(B, S1, [2]);
    v('il change d\'avis : son vote est REMPLACÉ, jamais ajouté', [r.j.mes_choix, r.j.choix.map(c => c.n)], [[2], [0, 0, 1]]);
    r = await voter(B, S1, []);
    v('une liste vide retire son vote', [r.j.mes_choix, r.j.votants], [[], 0]);
    await voter(B, S1, [2]); await voter(C, S1, [2]);
    v('Bruno et Carla votent « Au bureau » : 2', (await lire(A, S1)).j.choix[2].n, 2);
    r = await A.post('/api/conversations/' + G + '/sondages/' + S1 + '/choix', { texte: 'À la gare' });
    v('l\'autrice ajoute un choix (toujours permis à l\'auteur)', [r.code, r.j.choix.length], [200, 4]);
    r = await B.post('/api/conversations/' + G + '/sondages/' + S1 + '/choix', { texte: 'Au café' });
    v('⛔ Bruno ne le peut pas : la règle « les membres ajoutent des choix » est coupée (403)', r.code, 403);
    r = await B.post('/api/conversations/' + G + '/sondages/' + S1 + '/clore', {});
    v('⛔ Bruno ne clôt pas le sondage d\'Alice (ni auteur ni administrateur) : 403', r.code, 403);
    r = await A.post('/api/conversations/' + G + '/sondages/' + S1 + '/clore', {});
    v('Alice le clôt', [r.code, r.j.clos, r.j.peut_voter], [200, true, false]);
    r = await voter(C, S1, [0]);
    v('⛔ plus de vote après la clôture : 409 sondage_clos', [r.code, r.j.error], [409, 'sondage_clos']);
    v('⛔ ni de choix ajouté', (await A.post('/api/conversations/' + G + '/sondages/' + S1 + '/choix', { texte: 'Plus tard' })).code, 409);

    console.log('\n4. Les règles qui changent le sondage');
    // plusieurs réponses, anonyme, ajouts permis, résultats après avoir voté
    r = await nouveau(A, { question: 'Quels jours êtes-vous disponibles ?', choix: ['Lundi', 'Mardi'], regles: { multiple: true, anonyme: true, ajout: true, resultats: 'apres_vote' } });
    const S2 = r.j.seq;
    r = await lire(B, S2);
    v('⛔ « résultats après avoir voté » : Bruno ne voit aucun décompte avant de voter', [r.j.resultats_visibles, r.j.choix.map(c => c.n), r.j.votants], [false, [null, null], null]);
    v('…mais l\'autrice les voit toujours', (await lire(A, S2)).j.resultats_visibles, true);
    r = await voter(B, S2, [0, 1]);
    v('« plusieurs réponses » : Bruno coche lundi ET mardi ; il voit alors les décomptes', [r.code, r.j.mes_choix, r.j.choix.map(c => c.n), r.j.resultats_visibles], [200, [0, 1], [1, 1], true]);
    v('⛔ ANONYME : personne ne voit qui a voté quoi — Bruno non plus…', r.j.choix.map(c => c.qui), [null, null]);
    v('⛔ …ni l\'autrice', (await lire(A, S2)).j.choix.map(c => c.qui), [null, null]);
    r = await C.post('/api/conversations/' + G + '/sondages/' + S2 + '/choix', { texte: 'Mercredi' });
    v('« les membres ajoutent des choix » : Carla ajoute mercredi — ⛔ et, le sondage étant anonyme, qui l\'a ajouté ne se dit pas (il vote presque toujours pour lui)', [r.code, r.j.choix.map(c => c.texte), r.j.choix[2].ajoute_par], [200, ['Lundi', 'Mardi', 'Mercredi'], null]);
    r = await B.post('/api/conversations/' + G + '/sondages/' + S2 + '/choix', { texte: '  MERCREDI ' });
    v('⛔ « MERCREDI » existe déjà (casse, espaces) : 409 sondage_doublon', [r.code, r.j.error], [409, 'sondage_doublon']);
    for (let i = 3; i < 12; i++) await A.post('/api/conversations/' + G + '/sondages/' + S2 + '/choix', { texte: 'Jour ' + i });
    r = await C.post('/api/conversations/' + G + '/sondages/' + S2 + '/choix', { texte: 'Encore un' });
    v('⛔ douze choix au plus : le treizième est refusé (409 sondage_plein)', [r.code, r.j.error, (await lire(A, S2)).j.choix.length], [409, 'sondage_plein', 12]);

    // résultats à la clôture, échéance
    const debut = Date.now();
    r = await nouveau(A, { question: 'Vote secret jusqu\'à la fin', choix: ['Oui', 'Non'], regles: { resultats: 'apres_cloture', fin: debut + 3600000 } });
    const S3 = r.j.seq;
    await voter(B, S3, [0]);
    r = await lire(B, S3);
    v('⛔ « résultats à la clôture » : Bruno a voté et ne voit toujours rien', [r.j.mes_choix, r.j.resultats_visibles, r.j.choix.map(c => c.n)], [[0], false, [null, null]]);
    vrai('l\'échéance est dite', r.j.regles.fin === debut + 3600000 && r.j.clos === false);
    svc.avancer(3600000 + 1000);
    r = await lire(B, S3);
    v('l\'échéance passée : le sondage est clos tout seul, les résultats paraissent', [r.j.clos, r.j.resultats_visibles, r.j.choix.map(c => c.n), r.j.peut_voter], [true, true, [1, 0], false]);
    v('⛔ plus de vote après l\'échéance', (await voter(C, S3, [1])).code, 409);

    console.log('\n5. Ce que le sondage ne laisse pas voir');
    v('⛔ Eve (étrangère) : la garde de la conversation (404)', (await lire(E, S1)).code, 404);
    const S4 = (await nouveau(A, { question: 'Avant Eve ?', choix: ['Oui', 'Non'], regles: { anonyme: true, resultats: 'apres_cloture' } })).j.seq;
    await A.post('/api/conversations/' + G + '/membres/ajouter', { uids: [E.moi.id] });
    v('⛔ Eve, ajoutée APRÈS le sondage : 404', [(await lire(E, S1)).code, (await lire(E, S4)).code], [404, 404]);
    r = await nouveau(A, { question: 'Et maintenant ?', choix: ['Oui', 'Non'] });
    const S5 = r.j.seq;
    v('…un sondage posé après son arrivée, elle le lit', (await lire(E, S5)).code, 200);
    await voter(B, S4, [1]); await voter(B, S5, [0]);
    const evE = ((await E.get('/api/sync?depuis=0')).j.evenements || []).filter(x => x.event === 'sondage').map(x => x.data.seq);
    v('⛔ …et ne reçoit PAS les événements d\'un sondage d\'avant son arrivée (on y vote : elle l\'apprendrait) — population : celui d\'après, si', [evE.includes(S4), evE.includes(S5)], [false, true]);

    // (relecture du gardien) dans une DIRECTE, les deux membres sont « admin » : l'autre ne clôt pas MON sondage
    const dir = (await A.post('/api/conversations/directe', { uid: B.moi.id })).j.conversation.id;
    const S6 = (await A.post('/api/conversations/' + dir + '/messages', { cid: cid(), type: 'sondage', question: 'Résultats à la fin ?', choix: ['Oui', 'Non'], regles: { resultats: 'apres_cloture' } })).j.seq;
    r = await B.get('/api/conversations/' + dir + '/sondages/' + S6);
    v('⛔ directe : Bruno ne peut pas clore le sondage d\'Alice — ni annoncé, ni permis (403), et les résultats restent cachés', [r.j.peut_clore, (await B.post('/api/conversations/' + dir + '/sondages/' + S6 + '/clore', {})).code, (await B.get('/api/conversations/' + dir + '/sondages/' + S6)).j.resultats_visibles], [false, 403, false]);
    v('…Alice, l\'autrice, le peut', (await A.post('/api/conversations/' + dir + '/sondages/' + S6 + '/clore', {})).j.clos, true);
    v('un message qui n\'est pas un sondage, un numéro mal formé : 404, 400', [(await lire(A, seqFiche)).code, (await A.get('/api/conversations/' + G + '/sondages/1x')).code], [404, 400]);
    r = await A.post('/api/conversations/' + G + '/messages/supprimer', { seq: S2, pour: 'tous' });
    v('Alice efface son sondage pour tous…', r.code, 200);
    v('⛔ …il n\'existe plus pour personne (ni lecture, ni vote)', [(await lire(B, S2)).code, (await voter(B, S2, [0])).code], [404, 404]);
    v('⛔ …et ses choix (scellés, mais écrits) et ses votes ont quitté la base — pas seulement l\'écran', [compter('SELECT COUNT(*) AS n FROM sondage WHERE conv = ? AND seq = ?', G, S2), compter('SELECT COUNT(*) AS n FROM sondage_choix WHERE conv = ? AND seq = ?', G, S2), compter('SELECT COUNT(*) AS n FROM sondage_vote WHERE conv = ? AND seq = ?', G, S2)], [0, 0, 0]);
    vrai('(population : le sondage S1 garde, lui, ses quatre choix)', compter('SELECT COUNT(*) AS n FROM sondage_choix WHERE conv = ? AND seq = ?', G, S1) === 4);

    console.log('\n6. « Mes données »');
    const ex = await B.post('/api/compte/export', {});
    const votes = (ex.j && ex.j.votes_sondages) || [];
    vrai('l\'export de Bruno dit ses votes (conversation, message, choix, date)', ex.code === 200 && votes.some(x => x.conversation === G && x.message === S1 && x.choix === 2) && votes.every(x => typeof x.le === 'string'));

    console.log('\n7. L\'effacement d\'un compte ne trahit pas un vote anonyme');
    const S7 = (await nouveau(A, { question: 'Anonyme ?', choix: ['Oui', 'Non'], regles: { anonyme: true } })).j.seq;
    await voter(B, S7, [0]); await voter(C, S7, [1]);
    const avantEff = (await lire(A, S7)).j;
    const St = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: () => Date.now() + 3601000 });
    const eff = St.compteEffacer(B0id, { rejeu: true });
    vrai('population : le compte de Bruno est effacé', eff.effacee === true);
    const apresEff = (await lire(A, S7)).j;
    v('⛔ les décomptes ne bougent pas (un décompte qui baisse le jour d\'un effacement dirait ce qu\'il avait voté)', [apresEff.choix.map(c => c.n), apresEff.votants], [avantEff.choix.map(c => c.n), avantEff.votants]);
    v('⛔ …mais plus aucun vote ne porte son identifiant', compter('SELECT COUNT(*) AS n FROM sondage_vote WHERE uid = ?', B0id), 0);
  } catch (e) {
    vrai('le banc est mort : ' + (e && e.stack || e), false);
  } finally {
    for (const f of flux) f.fermer();
    await svc.arreter(); await og.fermer();
    fin('test-926');
  }
})();
