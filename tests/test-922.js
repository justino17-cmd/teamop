/* ⛔ CE QUE CE FICHIER GARDE — CE QU'ON A EN COMMUN AVEC UNE PERSONNE (`GET /api/personnes/:id/commun`, famille 3 : le VRAI service, en HTTP).

   7 octobre 2026 : « au niveau des contacts, pour le pro, voir leur tableau de réunion — s'ils participent à la même réunion — quand on clique sur le contact ». La fiche d'un contact
   dit les réunions À VENIR où l'on est invités tous les deux, les groupes et les espaces qu'on partage. Ce banc tient ses règles :
     · les réunions communes, la prochaine d'abord, avec la réponse de l'AUTRE (`son_statut`) — qui suit quand il répond ;
     · ⛔ RIEN dont on ne fait pas partie : une réunion de l'autre sans nous, une réunion à nous sans lui, n'y sont jamais (sinon la fiche serait l'agenda de l'autre) ;
     · ⛔ ni une réunion ANNULÉE, ni une réunion au-delà de la fenêtre (62 jours) ;
     · les groupes à trois et plus (pas la conversation à deux) ; un groupe QUITTÉ par l'un sort de la liste ;
     · ⛔ la porte de la fiche (`personnes.lire`) : une personne qu'on ne voit pas, soi-même, un identifiant mal formé et quelqu'un qui nous a BLOQUÉS reçoivent le même 404.
   La page qui la montre (au bureau à droite, au téléphone en feuille) est la sonde `tests/sonde-opmessages-fiche-contact.js`. */
'use strict';
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const PARIS = 'Europe/Paris', H = 3600000, J = 24 * H;
function localDans(t, tz) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(t)) p[x.type] = x.value;
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
}

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
    await relier(A, B); await relier(A, C); await relier(B, C);
    const t0 = Math.ceil((Date.now() + J) / H) * H;
    const prog = async (P, titre, debut, invites) => { const r = await P.post('/api/reunions', { titre, debut: localDans(debut, PARIS), fin: localDans(debut + H, PARIS), tz: PARIS, invites: invites.map(x => x.moi.id), notifier: false }); if (r.code !== 201) throw new Error(titre + ' : ' + r.code + ' ' + r.txt); return r.j.reunion.id; };
    const r1 = await prog(A, 'Point chantier', t0, [B]);
    await prog(B, 'Visite client', t0 + 2 * J, [A, C]);
    await prog(A, 'Avec Cleo seule', t0 + J, [C]);
    await prog(B, 'Bruno et Cleo sans Alice', t0 + 3 * J, [C]);
    await prog(A, 'Dans quatre mois', t0 + 120 * J, [B]);
    const rAnn = await prog(A, 'Annulée', t0 + 4 * J, [B]);
    const g = await A.post('/api/conversations/groupe', { nom: 'Chantier Lyon', membres: [B.moi.id, C.moi.id] });
    const commun = async (P, uid) => P.get('/api/personnes/' + uid + '/commun');

    console.log('\n1. Les réunions en commun');
    let r = await commun(A, B.moi.id);
    v('population : 200, trois réunions à venir avec Bruno dans la fenêtre (dont l\'annulée, avant son annulation)', [r.code, r.j.reunions.map(x => x.titre)], [200, ['Point chantier', 'Visite client', 'Annulée']]);
    v('la réponse de Bruno : « attente » pour celles d\'Alice, « accepte » pour celle qu\'il organise', r.j.reunions.map(x => x.son_statut), ['attente', 'accepte', 'attente']);
    vrai('chaque réunion porte sa prochaine occurrence', r.j.reunions.every(x => x.occurrences.length === 1 && x.occurrences[0].debut >= t0));
    await A.post('/api/reunions/' + rAnn + '/annuler', { notifier: false });
    r = await commun(A, B.moi.id);
    v('⛔ une réunion ANNULÉE sort de la fiche', r.j.reunions.map(x => x.titre), ['Point chantier', 'Visite client']);
    v('⛔ ni une réunion de Bruno sans Alice, ni une d\'Alice sans Bruno, ni celle de quatre mois', r.j.reunions.map(x => x.titre).filter(t => /sans Alice|seule|quatre mois/.test(t)), []);
    const rep = await B.post('/api/reunions/' + r1 + '/reponse', { statut: 'accepte' });
    r = await commun(A, B.moi.id);
    v('Bruno accepte « Point chantier » : la fiche d\'Alice le dit', [rep.code, r.j.reunions[0].son_statut], [200, 'accepte']);
    v('chez Bruno, la fiche d\'Alice dit les mêmes réunions (le point de vue inverse)', (await commun(B, A.moi.id)).j.reunions.map(x => x.titre), ['Point chantier', 'Visite client']);
    v('la fiche de Cleo chez Alice : ses réunions avec elle seulement', (await commun(A, C.moi.id)).j.reunions.map(x => x.titre), ['Avec Cleo seule', 'Visite client']);

    const dec = await prog(A, 'Hebdo du lundi', t0 + 5 * J, [B]);
    await A.post('/api/reunions/' + dec + '/modifier', { repetition: 'hebdomadaire', notifier: false }).catch(() => {});
    await B.post('/api/reunions/' + dec + '/reponse', { statut: 'decline' });
    r = await commun(A, B.moi.id);
    v('une réunion que Bruno a DÉCLINÉE reste (il est invité), et la fiche le dit', r.j.reunions.filter(x => x.titre === 'Hebdo du lundi').map(x => x.son_statut), ['decline']);

    console.log('\n2. Les groupes');
    v('population : le groupe à trois est en commun (la conversation à deux non)', r.j.groupes.map(x => [x.nom, x.type]), [['Chantier Lyon', 'groupe']]);
    await B.post('/api/conversations/' + g.j.conversation.id + '/quitter', {});
    v('Bruno quitte le groupe : il sort de la fiche', (await commun(A, B.moi.id)).j.groupes, []);
    v('…mais pas de celle de Cleo', (await commun(A, C.moi.id)).j.groupes.map(x => x.nom), ['Chantier Lyon']);

    console.log('\n3. La porte');
    v('Dan (qu\'Alice ne voit pas), soi-même, un identifiant mal formé : 404', [(await commun(A, D.moi.id)).code, (await commun(A, A.moi.id)).code, (await commun(A, 'p_' + '0'.repeat(32))).code, (await A.get('/api/personnes/x/commun')).code], [404, 404, 404, 404]);
    const bl = await C.post('/api/contacts/bloquer', { uid: A.moi.id });
    v('⛔ Cleo bloque Alice : la fiche de Cleo n\'est plus lisible pour Alice (404, comme une personne qui n\'existe pas)', [bl.code, (await commun(A, C.moi.id)).code], [200, 404]);
    let n429 = 0;
    for (let i = 0; i < 125; i++) if ((await commun(A, B.moi.id)).code === 429) n429++;
    vrai('⛔ une boucle sur la fiche est plafonnée (120 lectures par minute) : ' + n429 + ' refus 429 sur 125', n429 > 0 && n429 < 125);
    v('sans session : 401', (await T.client(svc.base).get('/api/personnes/' + B.moi.id + '/commun')).code, 401);
  } finally { await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
