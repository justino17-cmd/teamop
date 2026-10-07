/* ⛔ CE QUE CE FICHIER GARDE — LE RAPPORT DE PRÉSENCE D'UNE SALLE ET D'UNE RÉUNION (famille 3 : le VRAI service, parlé en HTTP, une horloge qu'on avance).

   Demandé le 7 octobre 2026 : « un vrai système de réunion très très pro… penser comme une entreprise ». Le rapport dit, pour l'hôte et l'organisateur :
     · qui est ENTRÉ, à quelle heure (la première fois), quand il est sorti (la dernière fois), combien de temps il est resté — sorties et retours COMPRIS, une présence en cours comptée jusqu'à maintenant ;
     · qui n'est JAMAIS entré : dans un appel de groupe, sonné sans répondre ou refusé ; dans une réunion, les invités, avec leur réponse à l'invitation ;
     · ⛔ à qui : l'hôte et les co-hôtes présents (la salle), l'ORGANISATEUR seul (la réunion) — un participant ne lit pas l'assiduité des autres ;
     · ⛔ la salle d'attente ne compte pas comme une présence ; une exclusion arrête le compteur.
   Les durées sont jouées sur l'horloge du service (`svc.avancer`), à la seconde près. */
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (180 s)'); process.exit(1); }, 180000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const SEC = 1000, MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const ZERO = Date.UTC(2026, 9, 22, 9, 0, 0);
const dit = (rep) => [rep.code, rep.j && rep.j.error];
const sec = (ms) => Math.round(ms / 1000);                // l'horloge du banc et celle du service s'écartent de quelques ms (le temps d'une requête) : on compare à la seconde

(async () => {
  const svc = await T.lancerService({ horloge: true, config: { appels: { balayageMs: 1000, perduMs: 600000 } } });
  let decal = ZERO - Date.now(); svc.avancer(decal);
  const maintenant = () => Date.now() + decal;
  const avancer = (ms) => { decal += ms; svc.avancer(ms); };
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  const pers = (prenom) => S.personneCreer({ identifiant: 'beta:' + prenom + crypto.randomBytes(3).toString('hex'), prenom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); return c; };
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve');
    for (const p of [ben, cleo, dan, eve]) S.contactLier(ana.id, p.id);
    const a1 = cl(ana), b1 = cl(ben), c1 = cl(cleo), d1 = cl(dan), e1 = cl(eve);
    const nom = (l, p) => (l.find(x => x.id === p.id) || null);

    console.log('Un appel de groupe : qui entre, qui sort, qui revient, qui ne vient pas');
    const groupe = S.convCreerGroupe({ createur: ana.id, nom: 'Chantier', membres: [ben.id, cleo.id, dan.id], annonces_seules: false, ephemere_s: 0 }).id;
    const t0 = maintenant();
    const id = (await a1.post('/api/appels', { conv: groupe, type: 'audio' })).j.appel.id, U = '/api/salles/' + id + '/presence';
    avancer(10 * SEC); await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
    avancer(10 * SEC); await c1.post('/api/appels/' + id + '/repondre', { accepte: true });
    avancer(60 * SEC); await c1.post('/api/appels/' + id + '/quitter', {});
    avancer(20 * SEC); await c1.post('/api/appels/' + id + '/rejoindre', {});
    avancer(40 * SEC);
    const r1 = await a1.get(U);
    vrai('population : l\'appel court depuis 140 s, Ana (l\'hôte) lit le rapport', r1.code === 200 && r1.j.en_cours === true && r1.j.genre === 'groupe');
    const A = nom(r1.j.venus, ana), B = nom(r1.j.venus, ben), C = nom(r1.j.venus, cleo);
    v('Ana, qui a lancé l\'appel : entrée à l\'instant du lancement, présente, 140 s', A && [sec(A.arrivee - t0), A.depart, A.present, A.duree_s, A.prenom], [0, null, true, 140, 'Ana']);
    v('Ben : entré à +10 s, présent, 130 s', B && [sec(B.arrivee - t0), B.present, B.duree_s], [10, true, 130]);
    v('⛔ Cleo, sortie puis revenue : sa PREMIÈRE entrée (+20 s), et le temps des deux passages (60 s + 40 s = 100 s) — pas les 20 s où elle était dehors', C && [sec(C.arrivee - t0), C.present, C.duree_s], [20, true, 100]);
    v('⛔ Dan, sonné sans répondre, n\'est PAS dans les présences : il est dans les absences, avec ce qui s\'est passé (« manque » : la sonnerie a fini sans réponse)', [nom(r1.j.venus, dan), r1.j.absents.map(x => [x.prenom, x.statut])], [null, [['Dan', 'manque']]]);
    v('l\'ordre : par heure d\'arrivée', r1.j.venus.map(x => x.prenom), ['Ana', 'Ben', 'Cleo']);
    v('⛔ Ben, simple participant, ne lit pas l\'assiduité des autres (le même refus qu\'une salle inconnue) ; Dan, qui sonne, non plus', [dit(await b1.get(U)).join(' '), dit(await d1.get(U)).join(' ')].map(x => /^(403|404) /.test(x)), [true, true]);
    await a1.post('/api/salles/' + id + '/cohote', { uid: ben.id, actif: true });
    v('   devenu co-hôte, Ben le lit', (await b1.get(U)).code, 200);
    await a1.post('/api/salles/' + id + '/exclure', { uid: cleo.id });
    avancer(30 * SEC);
    const C2 = nom((await a1.get(U)).j.venus, cleo);
    v('⛔ Cleo EXCLUE : son compteur s\'arrête à l\'exclusion (100 s), elle n\'est plus « présente », sa sortie est datée', C2 && [C2.duree_s, C2.present, sec(C2.depart - t0)], [100, false, 140]);
    avancer(5 * SEC);
    const fin1 = await a1.post('/api/salles/' + id + '/terminer', {});
    v('population : Ana termine l\'appel pour tous', fin1.code, 200);
    const tenu = S.presenceSalle(id, maintenant());
    v('⛔ la fin de la salle FERME les présences : Ana 175 s, Ben 165 s (plus « présents ») ; Dan, jamais venu, est « manqué »', [nom(tenu.venus, ana).duree_s, nom(tenu.venus, ben).duree_s, tenu.venus.some(x => x.present), tenu.en_cours, tenu.absents.map(x => [x.prenom, x.statut])],
      [175, 165, false, false, [['Dan', 'manque']]]);
    v('   et un rapport relu une heure plus tard dit la même chose (le temps ne court plus)', (() => { const x = S.presenceSalle(id, maintenant() + HEURE); return [nom(x.venus, ana).duree_s, nom(x.venus, ben).duree_s]; })(), [175, 165]);

    console.log('\nLa salle d\'attente ne compte pas comme une présence');
    const g2 = S.convCreerGroupe({ createur: ana.id, nom: 'Porte', membres: [ben.id, dan.id], annonces_seules: false, ephemere_s: 0 }).id;
    const id2 = (await a1.post('/api/appels', { conv: g2, type: 'audio' })).j.appel.id;
    await a1.post('/api/salles/' + id2 + '/salle_attente', { actif: true });
    const t2 = maintenant();
    await d1.post('/api/appels/' + id2 + '/repondre', { accepte: true });
    avancer(50 * SEC);
    const r2 = (await a1.get('/api/salles/' + id2 + '/presence')).j;
    v('Dan attend à la porte depuis 50 s : il n\'est pas dans les présences (il est dans les absences, « attente »)', [nom(r2.venus, dan), r2.absents.filter(x => x.prenom === 'Dan').map(x => x.statut)], [null, ['attente']]);
    await a1.post('/api/salles/' + id2 + '/admettre', { uid: dan.id });
    avancer(30 * SEC);
    const D = nom((await a1.get('/api/salles/' + id2 + '/presence')).j.venus, dan);
    v('⛔ admis : son ENTRÉE date de l\'admission (+50 s), et il compte 30 s — pas les 50 s passées à la porte', D && [sec(D.arrivee - t2), D.duree_s, D.present], [50, 30, true]);
    await a1.post('/api/salles/' + id2 + '/terminer', {});

    console.log('\nUne réunion programmée : ses séances, ses invités absents avec leur réponse — l\'organisateur seul');
    const debut = maintenant() + 5 * MIN;
    const cr = await a1.post('/api/reunions', { titre: 'Revue mensuelle', debut, fin: debut + HEURE, invites: [ben.id, cleo.id, eve.id] });
    vrai('population : la réunion est programmée', cr.code === 201);
    const R = cr.j.reunion.id, UR = '/api/reunions/' + R + '/presence';
    await c1.post('/api/reunions/' + R + '/reponse', { statut: 'decline' });
    await e1.post('/api/reunions/' + R + '/reponse', { statut: 'accepte' });
    v('avant toute séance : un rapport vide (aucune salle n\'a été ouverte)', (await a1.get(UR)).j, { seances: [] });
    const s1 = await a1.post('/api/reunions/' + R + '/rejoindre', {});
    const ts1 = maintenant();
    avancer(2 * MIN); await b1.post('/api/reunions/' + R + '/rejoindre', {});
    avancer(10 * MIN); await b1.post('/api/appels/' + s1.j.appel.id + '/quitter', {});
    avancer(3 * MIN); await a1.post('/api/appels/' + s1.j.appel.id + '/quitter', {});
    const rr = await a1.get(UR);
    const se = rr.j.seances[0];
    v('une séance : Ana 15 min, Ben 10 min (entré à +2 min) — finie', se && [se.en_cours, sec(se.debut - ts1), nom(se.venus, ana).duree_s, nom(se.venus, ben).duree_s, sec(nom(se.venus, ben).arrivee - ts1), sec(se.fin - ts1)], [false, 0, 900, 600, 120, 900]);
    /* l'agenda (8 octobre 2026 : « une fois que la réunion est terminée, ça le marque, avec les participants, la durée ») : l'occurrence porte SA séance — les noms pour l'organisatrice seule */
    const agenda = async (c) => ((await c.get('/api/reunions?du=' + (debut - 86400000) + '&au=' + (debut + 86400000))).j.reunions || []).find(x => x.id === R);
    const oA = (await agenda(a1)).occurrences[0], oB = (await agenda(b1)).occurrences[0];
    v('⛔ l\'agenda d\'Ana (organisatrice) : l\'occurrence porte sa séance — 15 min, deux présents nommés (Ana, Ben), pas « terminée pour tous », plus de salle ouverte', oA.seance && [oA.seance.duree_s, oA.seance.n, oA.seance.pour_tous, (oA.seance.presents || []).map(x => x.prenom), (await agenda(a1)).salle_ouverte], [900, 2, false, ['Ana', 'Ben'], false]);
    v('⛔ l\'agenda de Ben (invité) : la durée et le NOMBRE, jamais les noms (un invité ne lit pas l\'assiduité des autres)', oB.seance && [oB.seance.duree_s, oB.seance.n, 'presents' in oB.seance], [900, 2, false]);
    v('⛔ les ABSENTS d\'une réunion sont ses INVITÉS jamais entrés, avec leur réponse : Cleo a décliné, Eve avait accepté', se && se.absents.map(x => [x.prenom, x.reponse]).sort(), [['Cleo', 'decline'], ['Eve', 'accepte']]);
    v('⛔ un invité ne lit pas le rapport (Ben, venu, ni Eve) : refusé comme tout geste d\'organisateur', [(await b1.get(UR)).code, (await e1.get(UR)).code].map(c => c === 403 || c === 404), [true, true]);
    avancer(20 * MIN);
    await e1.post('/api/reunions/' + R + '/rejoindre', {});
    avancer(5 * MIN);
    const deux = (await a1.get(UR)).j.seances;
    v('une seconde séance (Eve rouvre la salle) : deux séances, la plus récente d\'abord ; Eve y est présente 5 min, et cette fois Ana (qui organise compte parmi les invités), Ben et Cleo sont absents', [deux.length, deux[0].en_cours, nom(deux[0].venus, eve) && nom(deux[0].venus, eve).duree_s, deux[0].absents.map(x => x.prenom).sort(), deux[1].venus.length],
      [2, true, 300, ['Ana', 'Ben', 'Cleo'], 2]);
    {
      const ouverte = await agenda(a1);
      v('la salle rouverte par Eve : l\'agenda dit « salle ouverte » (la page propose encore « Rejoindre »)', ouverte.salle_ouverte, true);
      await a1.post('/api/reunions/' + R + '/rejoindre', {});
      await a1.post('/api/salles/' + deux[0].appel + '/terminer', {});
      const fin2 = await agenda(a1), o2 = fin2.occurrences[0];
      v('⛔ Ana TERMINE POUR TOUS : plus de salle ouverte ; la séance de l\'occurrence réunit les deux salles (trois présents : Ana, Ben, Eve) et le dit « terminée pour tous »', [fin2.salle_ouverte, o2.seance && o2.seance.pour_tous, o2.seance && o2.seance.n, o2.seance && (o2.seance.presents || []).map(x => x.prenom)], [false, true, 3, ['Ana', 'Ben', 'Eve']]);
    }
    v('⛔ une réunion inconnue ou d\'un autre : 404', (await a1.get('/api/reunions/r_' + 'x'.repeat(20) + '/presence')).code, 404);
  } finally {
    try { S.fermer(); } catch (e) { /* déjà fermé */ }
    await svc.arreter();
  }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
