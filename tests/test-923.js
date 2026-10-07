/* ⛔ CE QUE CE FICHIER GARDE — LE SUIVI D'UN DOCUMENT : QUI L'A REÇU, LU, OUVERT, TÉLÉCHARGÉ (famille 3 : le VRAI service, en HTTP).

   7 octobre 2026 : « s'envoyer des documents par la réunion, par rapport au chat ; savoir qui a reçu le document, qui l'a téléchargé — très important pour les patrons ».
   `GET /api/pieces/:id/suivi` (garde V) rend, à l'AUTEUR de la pièce seul, chaque membre qui voit le message : reçu (la liste de ses conversations est arrivée sur un de ses
   appareils), lu (sa lecture de la conversation), ouvert (la première et la dernière lecture de la pièce, combien de fois). Ce banc tient ses règles :
     · ⛔ l'auteur seul : un membre, un étranger, une pièce inconnue ou mal formée reçoivent le même 404 ; un message SUPPRIMÉ pour tous n'a plus de suivi ;
     · une lecture qui part du DÉBUT compte une fois ; la suite d'une même lecture (une plage qui ne commence pas à 0) ne recompte pas ; l'auteur qui relit SA pièce ne compte pas ;
     · « reçu » se pose quand la liste des conversations arrive chez la personne ;
     · ⛔ un FICHIER téléchargé est toujours dit à son auteur ; une PHOTO ouverte et « lu » suivent les confirmations de lecture (réciproques) ;
     · ⛔ celui qui est arrivé APRÈS le message ne le voit pas : il n'est pas dans le suivi ;
     · le suivi survit à une base d'avant la migration 15 (`test-901`).  */
'use strict';
const T = require('./outils-msg');
const F = require('./outils-pieces');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const MDP = (l) => 'pw-' + l + '-1234';

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(['alice', 'bruno', 'carla', 'dave', 'eve'].map(l => [l, { pass: MDP(l), nom: l[0].toUpperCase() + l.slice(1) + ' Banc', actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { balayageMs: 150 } });
  const path = require('path');
  const compter = (sql, ...a) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(sql).get(...a).n; } finally { d.close(); } };
  try {
    const [A, B, C, D, E] = await Promise.all(['alice', 'bruno', 'carla', 'dave', 'eve'].map(l => T.connecter(svc, og, l, MDP(l))));
    const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); await y.post('/api/liens/accepter', { code: l.j.code }); };
    await relier(A, B); await relier(A, C); await relier(A, D);
    await C.post('/api/moi/maj', { prefs: { accuses: false } });          // Carla a coupé ses confirmations de lecture
    const G = (await A.post('/api/conversations/groupe', { nom: 'Réunion budget', membres: [B.moi.id, C.moi.id] })).j.conversation.id;
    const envoyer = (c, corps) => c.post('/api/conversations/' + G + '/messages', Object.assign({ cid: 'cid-' + Math.random().toString(36).slice(2) }, corps));
    const dep = await F.deposer(A, { conv: G, genre: 'fichier', nom: 'Budget 2027.pdf', corps: F.pdf() });
    const m = await envoyer(A, { type: 'fichier', piece: dep.j.id });
    const ph = await F.deposer(A, { conv: G, genre: 'photo', corps: F.png() });
    await envoyer(A, { type: 'photo', pieces: [{ id: ph.j.id, w: 8, h: 8 }] });
    await A.post('/api/conversations/' + G + '/membres/ajouter', { uids: [D.moi.id] });   // Dave arrive APRÈS les deux documents
    const suivi = (P, id) => P.get('/api/pieces/' + id + '/suivi');
    const ligne = (r, P) => (r.j.membres || []).find(x => x.id === P.moi.id);

    console.log('\n1. Le suivi, à l\'auteur seul');
    let r = await suivi(A, dep.j.id);
    v('population : 200, le fichier, Bruno et Carla (pas Dave, arrivé après ; pas Alice, l\'auteure)', [r.code, r.j.genre, r.j.membres.map(x => x.prenom).sort()], [200, 'fichier', ['Bruno Banc', 'Carla Banc']]);
    v('au départ : ni reçu, ni ouvert ; « lu » est caché pour Carla (confirmations coupées)', [ligne(r, B).recu, ligne(r, B).ouvert, ligne(r, C).lu, ligne(r, C).ouvert], [false, false, null, false]);
    v('⛔ Bruno (membre), Eve (étrangère), une pièce inconnue, un identifiant mal formé : le même 404', [(await suivi(B, dep.j.id)).code, (await suivi(E, dep.j.id)).code, (await suivi(A, 'f_' + '0'.repeat(32))).code, (await suivi(A, 'x')).code], [404, 404, 404, 404]);

    console.log('\n2. Reçu, téléchargé');
    await B.get('/api/conversations');
    r = await suivi(A, dep.j.id);
    v('Bruno relit sa liste de conversations : « reçu »', [ligne(r, B).recu, ligne(r, C).recu], [true, false]);
    await F.lirePiece(B, dep.j.id);
    r = await suivi(A, dep.j.id);
    const o1 = ligne(r, B).ouvert;
    vrai('Bruno télécharge le fichier : l\'heure de la première lecture, une fois', !!o1 && o1.n === 1 && o1.premier > 0 && o1.premier === o1.dernier);
    await F.lirePiece(B, dep.j.id, { range: 'bytes=10-20' }); await F.lirePiece(B, dep.j.id, { range: 'bytes=0-0' }); await F.lirePiece(B, dep.j.id);
    v('⛔ une RAFALE de lectures dans la minute (plages, sondage « bytes=0-0 », relecture) ne compte qu\'une fois', ligne(await suivi(A, dep.j.id), B).ouvert.n, 1);
    svc.avancer(61000);
    await F.lirePiece(B, dep.j.id);
    v('une nouvelle lecture une minute plus tard compte (deux fois)', ligne(await suivi(A, dep.j.id), B).ouvert.n, 2);
    await F.lirePiece(A, dep.j.id);
    v('l\'auteure qui relit SON fichier ne compte pas (elle n\'est pas dans la liste)', (await suivi(A, dep.j.id)).j.membres.some(x => x.id === A.moi.id), false);
    await F.lirePiece(C, dep.j.id, { range: 'bytes=1-' });
    r = await suivi(A, dep.j.id);
    vrai('⛔ Carla (confirmations coupées) télécharge le FICHIER — et SANS son premier octet (« bytes=1- ») : elle est vue quand même : son auteure le sait quand même (le fichier qu\'elle a envoyé), et « reçu » suit', !!ligne(r, C).ouvert && ligne(r, C).ouvert.n === 1 && ligne(r, C).recu === true);

    console.log('\n3. Une photo suit les confirmations de lecture');
    await F.lirePiece(B, ph.j.id); await F.lirePiece(C, ph.j.id);
    r = await suivi(A, ph.j.id);
    v('Bruno ouvre la photo : dit ; Carla l\'ouvre : CACHÉ (null), comme son « lu »', [!!ligne(r, B).ouvert, ligne(r, C).ouvert, ligne(r, C).lu], [true, null, null]);
    await C.post('/api/moi/maj', { prefs: { accuses: true } });
    v('⛔ Carla rallume ses confirmations : son ouverture d\'AVANT n\'apparaît pas (rien n\'a été gardé pendant qu\'elles étaient coupées)', ligne(await suivi(A, ph.j.id), C).ouvert, false);
    await C.post('/api/moi/maj', { prefs: { accuses: false } });
    const dernier = (await B.get('/api/conversations/' + G + '/messages')).j.messages.slice(-1)[0].seq;
    await B.post('/api/conversations/' + G + '/lu', { seq: dernier });
    v('Bruno lit la conversation : « lu »', ligne(await suivi(A, dep.j.id), B).lu, true);
    await A.post('/api/moi/maj', { prefs: { accuses: false } });
    r = await suivi(A, ph.j.id);
    v('⛔ RÉCIPROQUE : Alice coupe à son tour ses confirmations — elle ne voit plus ni « lu » ni l\'ouverture d\'une photo… ', [ligne(r, B).lu, ligne(r, B).ouvert], [null, null]);
    vrai('…mais le téléchargement d\'un FICHIER reste dit', !!ligne(await suivi(A, dep.j.id), B).ouvert);
    await A.post('/api/moi/maj', { prefs: { accuses: true } });

    const ex = await B.post('/api/compte/export', {});
    v('l\'export « Mes données » de Bruno dit les documents qu\'il a ouverts (ce que leurs auteurs voient de lui)', [ex.code, (ex.j && ex.j.documents_ouverts || []).map(x => x.piece).sort()], [200, [dep.j.id, ph.j.id].sort()]);

    console.log('\n4. L\'auteur qui ne voit plus son message ne suit plus rien');
    const G2 = (await A.post('/api/conversations/groupe', { nom: 'Équipe terrain', membres: [B.moi.id, C.moi.id] })).j.conversation.id;
    const depB = await F.deposer(B, { conv: G2, genre: 'fichier', nom: 'Note de Bruno.pdf', corps: F.pdf() });
    const mB = await B.post('/api/conversations/' + G2 + '/messages', { cid: 'cid-' + Math.random().toString(36).slice(2), type: 'fichier', piece: depB.j.id });
    v('population : Bruno suit son fichier dans « Équipe terrain »', (await suivi(B, depB.j.id)).code, 200);
    await B.post('/api/conversations/' + G2 + '/messages/supprimer', { seq: mB.j.seq, pour: 'moi' });
    v('⛔ Bruno masque son message « pour lui » : plus de suivi (404)', (await suivi(B, depB.j.id)).code, 404);
    const depB2 = await F.deposer(B, { conv: G2, genre: 'fichier', nom: 'Autre note.pdf', corps: F.pdf() });
    await B.post('/api/conversations/' + G2 + '/messages', { cid: 'cid-' + Math.random().toString(36).slice(2), type: 'fichier', piece: depB2.j.id });
    await F.lirePiece(C, depB2.j.id);
    v('population : Carla a téléchargé le second fichier de Bruno, et Bruno le voit', [(await suivi(B, depB2.j.id)).code, !!ligne(await suivi(B, depB2.j.id), C).ouvert], [200, true]);
    const ret = await A.post('/api/conversations/' + G2 + '/membres/retirer', { uid: B.moi.id });
    v('⛔ Bruno est RETIRÉ du groupe : il ne suit plus son fichier (le même 404) — ni les membres d\'aujourd\'hui, ni leurs téléchargements', [ret.code, (await suivi(B, depB2.j.id)).code], [200, 404]);

    console.log('\n5. Un compte effacé emporte son suivi');
    v('population : des lignes de suivi de Carla existent', compter('SELECT COUNT(*) AS n FROM piece_acces WHERE uid = ?', C.moi.id) > 0, true);
    const ef = await C.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
    svc.avancer(15 * 86400000);                                              // la suppression est échue (J+14) : le balayeur efface le compte
    const parti = await T.attendre(() => compter("SELECT COUNT(*) AS n FROM personne WHERE id = ? AND etat <> 'actif'", C.moi.id) === 1, 8000, 100);
    v('⛔ Carla efface son compte (échu à J+14) : ses lignes de suivi partent (la ligne `personne` reste anonymisée, le CASCADE ne joue pas)', [ef.code, !!parti, compter('SELECT COUNT(*) AS n FROM piece_acces WHERE uid = ?', C.moi.id)], [200, true, 0]);

    console.log('\n6. Un message supprimé n\'a plus de suivi');
    const sup = await A.post('/api/conversations/' + G + '/messages/supprimer', { seq: m.j.seq, pour: 'tous' });
    v('« supprimer pour tous » : le suivi répond 404', [sup.code, (await suivi(A, dep.j.id)).code], [200, 404]);
    v('sans session : 401', (await T.client(svc.base).get('/api/pieces/' + ph.j.id + '/suivi')).code, 401);

    /* 8 octobre 2026 : « l'enregistrement… qu'il se supprime 3 jours après, pour pas que ça prenne des Go pour rien » — un FICHIER envoyé avec `garder_s` porte son échéance ; le balayeur des
       éphémères emporte le message ET la pièce */
    console.log('\n7. Un fichier gardé trois jours');
    const dep3 = await F.deposer(A, { conv: G, genre: 'fichier', nom: 'Enregistrement réunion.webm', corps: F.pdf() });
    v('⛔ `garder_s` sur un TEXTE, ou une durée hors des trois permises (1, 3, 7 jours) : 400', [(await envoyer(A, { type: 'texte', texte: 'x', garder_s: 259200 })).code, (await envoyer(A, { type: 'fichier', piece: dep3.j.id, garder_s: 1000 })).code, (await envoyer(A, { type: 'fichier', piece: dep3.j.id, garder_s: '259200' })).code], [400, 400, 400]);
    const m3 = await envoyer(A, { type: 'fichier', piece: dep3.j.id, garder_s: 259200 });
    const vu3 = ((await B.get('/api/conversations/' + G + '/messages')).j.messages || []).find(x => x.seq === m3.j.seq);
    v('envoyé (201) : Bruno le voit avec son échéance — trois jours après l\'envoi, à la milliseconde', [m3.code, vu3 && vu3.expire - vu3.ts], [201, 259200000]);
    v('population : la pièce est là et se lit', [compter('SELECT COUNT(*) AS n FROM piece WHERE id = ?', dep3.j.id), (await F.lirePiece(B, dep3.j.id)).code], [1, 200]);
    svc.avancer(259200000 + 60000);
    const partie = await T.attendre(() => compter('SELECT COUNT(*) AS n FROM piece WHERE id = ?', dep3.j.id) === 0, 8000, 100);
    v('⛔ trois jours plus tard : le message est parti de la conversation, la pièce aussi (sa ligne, et sa lecture répond 404)', [!!partie, ((await B.get('/api/conversations/' + G + '/messages')).j.messages || []).some(x => x.seq === m3.j.seq), (await F.lirePiece(B, dep3.j.id)).code], [true, false, 404]);
  } finally { await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
