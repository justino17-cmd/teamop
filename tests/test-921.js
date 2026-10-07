/* ⛔ CE QUE CE FICHIER GARDE — LES FAVORIS DE L'ONGLET CONTACTS (famille 3 : le VRAI service, en HTTP).

   Justin, 7 octobre 2026 : « les catégories Contacts qui manquent ». L'onglet Contacts gagne Tous · Favoris · Groupes · Entreprise ; le favori est le seul des quatre qui ÉCRIT,
   et il vit chez le service (une étoile posée sur l'iPhone se retrouve sur le Mac). Ce banc tient ses règles :
     · on étoile un contact (200), la liste le dit (`favori: true`), on le retire (200, `favori: false`) ;
     · ⛔ un favori est un POINT DE VUE : celui d'Alice ne se voit pas chez Bruno ;
     · ⛔ seul un booléen passe (« 1 », « oui », absent → 400) ; on ne s'étoile pas soi-même (400) ; un inconnu → 404 (on ne devine pas qui existe) ;
     · ⛔ un contact BLOQUÉ ne s'étoile pas (404) et ne ressort pas « favori » même s'il l'était avant le blocage ;
     · ⛔ un contact RETIRÉ emporte son favori : rajouté plus tard, il n'est pas favori ;
     · l'export « Mes données » dit quels contacts sont favoris.
   La migration 14 (colonne `contact.favori`) est gardée par `test-901` (une base neuve est au schéma de la dernière migration, une base d'avant y monte). */
'use strict';
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

(async () => {
  const og = await T.fauxOpGestion({
    alice: { pass: 'pw-alice-1234', nom: 'Alice Banc', actif: true }, bruno: { pass: 'pw-bruno-1234', nom: 'Bruno Banc', actif: true },
    cleo: { pass: 'pw-cleo-12345', nom: 'Cleo Banc', actif: true }, dan: { pass: 'pw-dan-123456', nom: 'Dan Banc', actif: true },
  });
  const svc = await T.lancerService({ urlGestion: og.url });
  try {
    const A = await T.connecter(svc, og, 'alice', 'pw-alice-1234'), B = await T.connecter(svc, og, 'bruno', 'pw-bruno-1234');
    const C = await T.connecter(svc, og, 'cleo', 'pw-cleo-12345'), D = await T.connecter(svc, og, 'dan', 'pw-dan-123456');
    const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); const r = await y.post('/api/liens/accepter', { code: l.j.code }); if (r.code !== 200) throw new Error('lien refusé : ' + r.code); };
    await relier(A, B); await relier(A, C);
    const fiche = async (P, uid) => ((await P.get('/api/contacts')).j.contacts || []).find(c => c.id === uid);

    console.log('\n1. Étoiler, désétoiler');
    vrai('population : Bruno et Cleo sont des contacts d\'Alice, pas favoris au départ', (await fiche(A, B.moi.id)).favori === false && (await fiche(A, C.moi.id)).favori === false);
    const r1 = await A.post('/api/contacts/favori', { uid: B.moi.id, favori: true });
    v('Alice étoile Bruno : 200, favori vrai', [r1.code, r1.j && r1.j.favori], [200, true]);
    v('…la liste d\'Alice le dit (Bruno favori, Cleo non)', [(await fiche(A, B.moi.id)).favori, (await fiche(A, C.moi.id)).favori], [true, false]);
    v('⛔ un favori est un point de vue : chez Bruno, Alice n\'est pas favori', (await fiche(B, A.moi.id)).favori, false);
    const r2 = await A.post('/api/contacts/favori', { uid: B.moi.id, favori: false });
    v('Alice retire l\'étoile : 200, favori faux, et la liste suit', [r2.code, r2.j && r2.j.favori, (await fiche(A, B.moi.id)).favori], [200, false, false]);

    console.log('\n2. Ce qui ne passe pas');
    for (const [nom, corps] of [['« 1 »', { uid: B.moi.id, favori: 1 }], ['« oui »', { uid: B.moi.id, favori: 'oui' }], ['sans favori', { uid: B.moi.id }], ['soi-même', { uid: A.moi.id, favori: true }], ['un uid mal formé', { uid: 'x', favori: true }]]) {
      const r = await A.post('/api/contacts/favori', corps);
      v('⛔ ' + nom + ' : 400 champ_invalide', [r.code, r.j && r.j.error], [400, 'champ_invalide']);
    }
    vrai('…et Bruno n\'est toujours pas favori après ces refus', (await fiche(A, B.moi.id)).favori === false);
    const inconnu = await A.post('/api/contacts/favori', { uid: D.moi.id, favori: true });
    v('⛔ Dan n\'est pas un contact d\'Alice : 404 introuvable', [inconnu.code, inconnu.j && inconnu.j.error], [404, 'introuvable']);
    const sansSession = await T.client(svc.base).post('/api/contacts/favori', { uid: B.moi.id, favori: true });
    vrai('⛔ sans session : refusé (' + sansSession.code + ')', sansSession.code === 401 || sansSession.code === 403);

    console.log('\n3. Un bloqué, un retiré');
    await A.post('/api/contacts/favori', { uid: C.moi.id, favori: true });
    vrai('population : Cleo est favori d\'Alice', (await fiche(A, C.moi.id)).favori === true);
    v('Alice bloque Cleo (200)', (await A.post('/api/contacts/bloquer', { uid: C.moi.id })).code, 200);
    v('⛔ un contact bloqué ne ressort pas « favori »', (await fiche(A, C.moi.id)).favori, false);
    v('⛔ et ne s\'étoile pas : 404', (await A.post('/api/contacts/favori', { uid: C.moi.id, favori: true })).code, 404);
    await A.post('/api/contacts/debloquer', { uid: C.moi.id });
    await A.post('/api/contacts/favori', { uid: B.moi.id, favori: true });
    vrai('population : Bruno est de nouveau favori', (await fiche(A, B.moi.id)).favori === true);
    v('Alice retire Bruno de ses contacts (200)', (await A.post('/api/contacts/retirer', { uid: B.moi.id })).code, 200);
    await relier(A, B);
    v('⛔ rajouté plus tard, Bruno n\'est PAS favori (le favori est parti avec le contact)', (await fiche(A, B.moi.id)).favori, false);

    console.log('\n4. L\'export « Mes données »');
    await A.post('/api/contacts/favori', { uid: B.moi.id, favori: true });
    const ex = await A.post('/api/compte/export', {});
    const dansExport = ex.j && (ex.j.contacts || []).find(c => c.id === B.moi.id);
    v('l\'export dit que Bruno est favori', [ex.code, dansExport && dansExport.favori], [200, true]);
  } finally {
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
