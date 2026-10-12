/* ⛔ CE QUE CE FICHIER GARDE — LES RÉUNIONS SONT À PRO, EN HTTP, CONTRE LE VRAI SERVICE : ce que Perso permet, ce que Pro ouvre, ce qu'un corps de requête ne peut pas changer (famille 4).

   Justin, 12 octobre 2026 : « Perso, c'est simple. C'est appel, message, et c'est tout. Créer des groupes d'appels, créer des groupes d'appels vidéo, mais pas de réunion. » Perso+ (le forfait d'une personne, 4 octobre
   2026) est RETIRÉ — « le retirer » —, et « un Pro peut inviter des Persos à des réunions, mais que par lien ». Un VRAI service (formule de PRODUCTION : la bêta ouvre tout), un faux Stripe en boucle locale (pour qu'un
   « S'abonner » mène quelque part), des personnes fabriquées dans la base (WAL, comme `test-905`). Ce que `test-905` ne voit pas (la matrice joue les gardes, pas les histoires) et que `test-991` ne voit pas (les modules,
   pas le montage) est ici :

     0. PERSO+ N'EXISTE PLUS : ses quatre routes répondent 404 ;
     1. PROGRAMMER EST À PRO : Perso → 402 (`raison` « perso », `offre` « pro ») ; Pro → 201 ; un corps qui ment ne change rien ; une ligne Perso+ restée en base n'ouvre rien ; rien n'est écrit par un refus ;
     2. ÊTRE INVITÉ EN SON NOM EST À PRO : un contact Perso est rendu dans `par_lien` (à la création comme par « Inviter »), sans notification et sans rien voir de la réunion ; un contact Pro est invité ;
     3. LE LIEN FAIT ENTRER TOUT COMPTE : la personne Perso entre par le lien d'invité, devient invitée (acceptée), répond, lit la fiche et le fichier .ics — et n'organise pas pour autant ;
     4. LE PLAFOND DE DIX PERSONNES : la onzième est refusée (création, invitation, lien), avec le plafond dit ; une personne déjà invitée n'est jamais refusée ; un appel de GROUPE n'est pas concerné ; rien ne vend
        le supplément « Grandes réunions » ;
     5. LES OUTILS DE L'ORGANISATEUR D'UNE SALLE : dans un appel de groupe lancé par quelqu'un de Perso, huit gestes refusent (402, `offre` « pro ») et rien n'est écrit, le reste est à tous ; éteindre n'est jamais
        refusé ; dans la salle d'une RÉUNION, ou si celui qui a LANCÉ l'appel est Pro, tout marche — et c'est celui qui lance qui compte, pas l'hôte du moment ;
     6. LA BÊTA OUVRE TOUT : Perso y programme et y invite en son nom ; 7. SANS CLÉ STRIPE, le refus dit qu'aucun « S'abonner » ne mènerait nulle part.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque refus est précédé de la population qu'il aurait pu compter (les réunions, les participants, les notifications). */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { MANIFESTE } = require(path.join(T.SERVICE, 'manifeste.js'));

const JOUR = 86400000;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const dit = (rep) => [rep.code, rep.j && rep.j.error];
const CLE = ['rk', 'test', 'BancReunionsProZz9'].join('_');
const PRIX_PRO = { mensuel: 'price_BancHttpProMensuelA1', annuel: 'price_BancHttpProAnnuelB2' };
const tri = (l) => (l || []).slice().sort();

(async () => {
  const fake = await fauxStripe();
  fake.poserTarif(PRIX_PRO.mensuel); fake.poserTarif(PRIX_PRO.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
  const env = { OPMSG_TEST_STRIPE: fake.hote };
  const facturation = { cle: CLE, prix: PRIX_PRO, relectureMs: 3600000, timeoutMs: 3000 };
  const quotas = { reunion: { max: 1000, fenetreMs: 3600000 }, rejoindre_code: { max: 1000, fenetreMs: 3600000 } };

  /* un service, la base ouverte à côté (WAL), des personnes et des clients fabriqués */
  async function monter(config, opts) {
    const o = opts || {};
    const svc = await T.lancerService({ horloge: true, config, env: o.sansStripe ? {} : env });
    let decal = 0;
    const maintenant = () => Date.now() + decal;
    const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
    let k = 0;
    const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
    const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
    const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
    const compte = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).get(...a).n; } finally { d.close(); } };
    /* une entreprise PAYÉE (Messages Pro), et y faire entrer quelqu'un (une place payée vaut Pro pour son titulaire) */
    const espacePro = (p, places) => { const e = S.espaceCreer({ nom: 'Pro ' + crypto.randomBytes(2).toString('hex'), proprio: p.id }).id; S.abonnementPoser(e, { client: 'cus_b992' + e.slice(2, 8), abonnement: 'sub_b992' + e.slice(2, 10), statut: 'active', places: places || 5, fin_periode: null, annule: false, impaye: false }, { adopter: true }); return e; };
    const resilier = (e) => S.abonnementPoser(e, { client: 'cus_b992' + e.slice(2, 8), abonnement: 'sub_b992' + e.slice(2, 10), statut: 'canceled', places: 0, fin_periode: null, annule: true, impaye: false });
    const entrer = (e, par, uid) => { const code = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code), genre: 'espace', cible: e, par, ttlMs: JOUR, max: 5 }); return S.invitationAccepter({ h: sha(code), uid, max: Infinity }); };
    return { svc, S, pers, cl, maintenant, brut, compte, espacePro, resilier, entrer, fermer: async () => { try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(); } };
  }

  const P = await monter({ formule: { toutOuvert: false }, facturation, quotas, appels: { balayageMs: 1000, perduMs: 600000 } });
  const { svc, S, pers, cl } = P;
  let B = null, I = null;
  try {
    const ana = pers('Ana'), dan = pers('Dan'), eve = pers('Eve'), fred = pers('Fred'), gus = pers('Gus'), ben = pers('Ben'), cleo = pers('Cleo');
    const EA = P.espacePro(ana, 60), EE = P.espacePro(eve, 5);       // Ana et Eve : chacune SA entreprise payée ; Dan, Fred, Gus, Ben, Cleo : Perso
    const a1 = cl(ana), d1 = cl(dan), e1 = cl(eve), f1 = cl(fred), g1 = cl(gus), b1 = cl(ben), c1 = cl(cleo);
    for (const p of [dan, eve, fred, gus, ben, cleo]) S.contactLier(ana.id, p.id);
    for (const p of [dan, fred, ben, cleo, gus, ana]) S.contactLier(eve.id, p.id);
    for (const p of [dan, ben, cleo, eve]) S.contactLier(gus.id, p.id);
    for (const p of [ben, cleo, eve, gus, ana]) S.contactLier(dan.id, p.id);
    const corpsR = (o) => Object.assign({ titre: 'Point', debut: P.maintenant() + 2 * 60000, fin: P.maintenant() + 62 * 60000, invites: [], notifier: false }, o || {});
    const nots = async (c, cible) => (await c.get('/api/notifications')).j.notifications.filter(n => /^reunion_/.test(n.type) && (!cible || n.cible === cible));

    /* ═══ 0. PERSO+ N'EXISTE PLUS ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Perso+ est retiré : ses quatre routes n\'existent plus');
    {
      const r = [await d1.get('/api/moi/perso-plus'), await d1.post('/api/moi/perso-plus/paiement', { cycle: 'mensuel' }), await d1.post('/api/moi/perso-plus/portail', {}), await d1.post('/api/moi/perso-plus/relire', {})].map(x => x.code);
      v('⛔ l\'état, payer, gérer, relire : 404 — aucune ne répond plus, et le manifeste n\'en porte aucune', [r, MANIFESTE.filter(x => /perso-plus/.test(x.p)).length], [[404, 404, 404, 404], 0]);
      v('… et rien n\'est parti chez Stripe pour elles', fake.appels.filter(a => /opmsg-perso/.test(JSON.stringify(a))).length, 0);
    }

    /* ═══ 1. PROGRAMMER EST À PRO ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nProgrammer une réunion est à Pro ; Perso, ce sont les appels et les messages');
    let reunionEve = null;
    {
      const n0 = P.compte('SELECT COUNT(*) AS n FROM reunion');
      const perso = await d1.post('/api/reunions', corpsR());
      v('⛔ une personne PERSO (Dan) ne programme pas : 402 `formule_requise`, `raison` « perso », `offre` « pro », et « S\'abonner » mène quelque part (`abonnement_ouvert`) — rien n\'est créé', [dit(perso), perso.j.raison, perso.j.offre, perso.j.abonnement_ouvert, P.compte('SELECT COUNT(*) AS n FROM reunion') - n0], [[402, 'formule_requise'], 'perso', 'pro', true, 0]);
      const ment = await d1.post('/api/reunions', corpsR({ formule: 'pro', organiser: true, perso_plus: true, forfait: 'perso_plus', hote: ana.id }));
      v('⛔ un corps qui se dit Pro, organisateur ou Perso+ n\'y change rien : le même 402, toujours rien de créé', [dit(ment), ment.j.offre, P.compte('SELECT COUNT(*) AS n FROM reunion') - n0], [[402, 'formule_requise'], 'pro', 0]);
      { const d = P.brut(); try { d.prepare(`INSERT INTO abonnement_perso(personne, statut, abonnement, client, relu_le, cree) VALUES(?, 'active', 'sub_BancAncienPersoZz', 'cus_BancAncienPersoZz', ?, ?)`).run(dan.id, Date.now(), Date.now()); } finally { d.close(); } }
      const ancien = await d1.post('/api/reunions', corpsR());
      v('⛔ une ligne Perso+ « payée » restée en base (d\'avant le retrait) n\'ouvre RIEN : toujours 402, toujours rien de créé', [dit(ancien), P.compte('SELECT COUNT(*) AS n FROM reunion') - n0], [[402, 'formule_requise'], 0]);
      reunionEve = await e1.post('/api/reunions', corpsR({ titre: 'Réunion d\'Eve' }));
      const reunionAna = await a1.post('/api/reunions', corpsR({ titre: 'Réunion d\'Ana' }));
      v('population : Eve et Ana (Pro, chacune par SON entreprise) programment : 201 et 201 — le refus de Dan ne vient pas d\'une route qui refuse tout', [reunionEve.code, reunionAna.code, P.compte('SELECT COUNT(*) AS n FROM reunion') - n0], [201, 201, 2]);
    }

    /* ═══ 2. ÊTRE INVITÉ EN SON NOM EST À PRO ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nÊtre invité en son nom est à Pro : un contact Perso est rendu « par le lien »');
    {
      const c0 = await a1.post('/api/reunions', corpsR({ titre: 'Avec des Persos', invites: [dan.id, eve.id, fred.id], notifier: true }));
      v('⛔ Ana invite Dan et Fred (Perso) et Eve (Pro) : Eve est invitée ; Dan et Fred sont rendus dans `par_lien`, ni invités, ni parmi les refusés', [c0.code, tri(c0.j.invites.map(i => i.id)), tri(c0.j.par_lien), c0.j.non_invites], [201, tri([ana.id, eve.id]), tri([dan.id, fred.id]), []]);
      const id0 = c0.j.reunion.id;
      v('⛔ Eve reçoit son invitation ; Dan et Fred ne reçoivent RIEN, et la réunion leur reste inconnue (404 comme si elle n\'existait pas)', [(await nots(e1, id0)).length, (await nots(d1, id0)).length, (await nots(f1, id0)).length, (await d1.get('/api/reunions/' + id0)).code], [1, 0, 0, 404]);
      const inv = await a1.post('/api/reunions/' + id0 + '/inviter', { uids: [gus.id, ben.id, ana.id] });
      v('⛔ « Inviter » : Gus et Ben (Perso) sont rendus dans `par_lien`, personne n\'est ajouté — et un étranger reste dans `non_ajoutes`, jamais dans `par_lien`', [inv.code, inv.j.ajoutes, tri(inv.j.par_lien), await (async () => { const x = 'p_' + '0'.repeat(32), r = await a1.post('/api/reunions/' + id0 + '/inviter', { uids: [x] }); return [r.code, r.j.non_ajoutes, r.j.par_lien]; })()], [200, [], tri([gus.id, ben.id]), [200, ['p_' + '0'.repeat(32)], []]]);
      const ben2 = await d1.post('/api/reunions/' + id0 + '/inviter', { uids: [eve.id] });
      v('… et Dan, qui n\'est ni l\'hôte ni invité, ne peut rien y faire (404)', ben2.code, 404);
    }

    /* ═══ 3. LE LIEN FAIT ENTRER TOUT COMPTE ═════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe lien d\'une réunion fait entrer tout compte — c\'est ainsi qu\'un Perso y vient');
    {
      const id = reunionEve.j.reunion.id;
      const code = (await e1.post('/api/reunions/' + id + '/lien', {})).j.code;
      const apercu = await T.client(svc.base).post('/api/reunions/apercu', { code });
      const parLien = await f1.post('/api/reunions/rejoindre', { code });
      v('⛔ Fred (PERSO) entre PAR LE LIEN d\'Eve : 200, il devient invité (accepté) et entre dans la salle — l\'aperçu public ne dit que de quoi décider', [apercu.code, Object.keys(apercu.j.reunion).sort(), parLien.code, parLien.j.reunion === id, parLien.j.appel && parLien.j.appel.moi && parLien.j.appel.moi.statut], [200, ['attente', 'debut', 'en_cours', 'fin', 'titre'], 200, true, 'present']);
      v('… la fiche, le fichier .ics, répondre : tout lui est ouvert (il est invité, par le lien)', [(await f1.get('/api/reunions/' + id)).code, (await f1.get('/api/reunions/' + id + '/ics')).code, dit(await f1.post('/api/reunions/' + id + '/reponse', { statut: 'peutetre' }))], [200, 200, [200, undefined]]);
      v('mais il n\'organise pas pour autant : Fred ne programme pas (402), n\'invite pas et ne renouvelle pas le lien (403 : il n\'est pas l\'hôte)', [dit(await f1.post('/api/reunions', corpsR())), dit(await f1.post('/api/reunions/' + id + '/inviter', { uids: [gus.id] })), dit(await f1.post('/api/reunions/' + id + '/lien', {}))], [[402, 'formule_requise'], [403, 'interdit'], [403, 'interdit']]);
      const r = await f1.get('/api/appels'); if (r.j && r.j.actif) await f1.post('/api/appels/' + r.j.actif.id + '/quitter', {});
    }

    /* ═══ 4. LE PLAFOND DE DIX PERSONNES ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne réunion compte au plus dix personnes, organisateur compris ; un appel de groupe n\'est pas concerné ; le supplément ne se vend pas');
    {
      /* des collègues de l'entreprise payée d'Ana (donc Pro, invitables en leur nom), contacts d'Eve aussi */
      const foule = []; for (let i = 0; i < 12; i++) { const p = pers('Foule'); P.entrer(EA, ana.id, p.id); S.contactLier(eve.id, p.id); foule.push(p); }
      const f0 = cl(foule[0]);   // UN client pour la personne déjà invitée : la salle est liée à l'appareil qui y entre, c'est lui qui en sort
      v('la page lit le plafond du service (une seule constante) : dix', (await d1.get('/api/config')).j.limites.reunion_personnes, 10);
      for (const [nom, c] of [['Eve (Pro)', e1], ['Ana (Pro)', a1]]) {
        const n0 = P.compte('SELECT COUNT(*) AS n FROM reunion');
        const onze = await c.post('/api/reunions', corpsR({ titre: 'Onze ' + nom, invites: foule.slice(0, 10).map(p => p.id) }));
        v('⛔ ' + nom + ' : dix invités + l\'organisateur = ONZE personnes → 409 `reunion_pleine`, le plafond (10) est dit, rien de créé', [dit(onze), onze.j.max, P.compte('SELECT COUNT(*) AS n FROM reunion') - n0], [[409, 'reunion_pleine'], 10, 0]);
        const dix = await c.post('/api/reunions', corpsR({ titre: 'Dix ' + nom, invites: foule.slice(0, 9).map(p => p.id) }));
        v('population : neuf invités + l\'organisateur = DIX personnes → 201 (le refus d\'avant venait bien du nombre), la fiche dit son plafond', [dix.code, dix.j.invites.length, dix.j.plafond, dix.j.par_lien, P.compte('SELECT COUNT(*) AS n FROM reunion') - n0], [201, 10, 10, [], 1]);
        const id = dix.j.reunion.id;
        const plus = await c.post('/api/reunions/' + id + '/inviter', { uids: [foule[9].id] });
        v('⛔ ' + nom + ' : inviter une ONZIÈME personne → 409 `reunion_pleine`, la fiche garde ses dix', [dit(plus), plus.j.max, P.compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', id)], [[409, 'reunion_pleine'], 10, 10]);
        const code = (await c.post('/api/reunions/' + id + '/lien', {})).j.code;
        const onzieme = pers('Onzieme'), o1 = cl(onzieme);
        const lien = await o1.post('/api/reunions/rejoindre', { code });
        v('⛔ ' + nom + ' : la onzième personne (Perso) qui entre par le LIEN → 409 `reunion_pleine`, elle n\'est pas inscrite', [dit(lien), lien.j.max, P.compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', id, onzieme.id)], [[409, 'reunion_pleine'], 10, 0]);
        const deja = await f0.post('/api/reunions/rejoindre', { code });
        v('une personne DÉJÀ invitée n\'est jamais refusée par le plafond : elle entre par le lien (200)', [deja.code, deja.j.reunion === id], [200, true]);
        if (deja.j.appel) await f0.post('/api/appels/' + deja.j.appel.id + '/quitter', {});   // elle sort de la salle : la même personne sert à la seconde réunion (sinon `occupe`)
        const retire = await c.post('/api/reunions/' + id + '/retirer', { uid: foule[8].id });
        const apresRetrait = await o1.post('/api/reunions/rejoindre', { code });
        v('contre-épreuve : on retire quelqu\'un, la place est libre — la même personne (Perso) entre par le lien (200) : le refus venait bien du nombre', [retire.code, apresRetrait.code, P.compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', id)], [200, 200, 10]);
        if (apresRetrait.j.appel) await o1.post('/api/appels/' + apresRetrait.j.appel.id + '/quitter', {});
      }
      /* — l'appel de GROUPE n'est pas concerné, et il est gratuit — */
      const douze = []; for (let i = 0; i < 12; i++) douze.push(pers('Groupe'));
      const chef = pers('Chef'), ch1 = cl(chef);
      const grand = S.convCreerGroupe({ createur: chef.id, nom: 'Douze', membres: douze.map(p => p.id), annonces_seules: false, ephemere_s: 0 }).id;
      for (const p of douze) S.contactLier(chef.id, p.id);
      const lance = await ch1.post('/api/appels', { conv: grand, type: 'audio' });
      v('⛔ un appel de GROUPE de TREIZE personnes lancé par quelqu\'un de PERSO (Chef) : 201, genre « groupe » — appel et appel de groupe sont à Perso ; le plafond de dix est celui des RÉUNIONS', [lance.code, lance.j.appel && lance.j.appel.genre, lance.j.appel && lance.j.appel.capacite], [201, 'groupe', 6]);
      const reponses = [];
      for (const p of douze.slice(0, 6)) reponses.push((await cl(p).post('/api/appels/' + lance.j.appel.id + '/repondre', { accepte: true })).code);
      const dernier = await cl(douze[6]).post('/api/appels/' + lance.j.appel.id + '/repondre', { accepte: true });
      v('… sa limite est celle de la MAILLE : six en audio — la personne de trop est refusée par la CAPACITÉ de la salle, jamais par un « plafond de réunion »', [reponses.slice(0, 5), dernier.j && dernier.j.error === 'reunion_pleine'], [[200, 200, 200, 200, 200], false]);
      await ch1.post('/api/appels/' + lance.j.appel.id + '/quitter', {});
      const offres = (await T.client(svc.base).get('/api/facturation/offres')).txt;
      vrai('⛔ le supplément « Grandes réunions » ne se VEND PAS : aucune route du manifeste n\'en parle, aucune offre publique non plus', !MANIFESTE.some(r => /supplement|grandes|webinaire/i.test(r.id + ' ' + r.p)) && !/grandes|supplement|webinaire|visio/i.test(offres));
    }

    /* ═══ 5. LES OUTILS DE L'ORGANISATEUR D'UNE SALLE ════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes outils de l\'organisateur d\'une salle : refusés dans un appel de groupe lancé par quelqu\'un de Perso, ouverts dans une réunion ou si celui qui lance est Pro');
    const OUTILS = [['verrouiller', { actif: true }], ['salle_attente', { actif: true }], ['exclure', null], ['couper_micro', { tous: true }], ['couper_micro', null], ['rec', { actif: true }],
      ['evt', { k: 'sondage', donnees: { op: 'ouvrir', question: 'On y va ?', choix: ['Oui', 'Non'] } }], ['evt', { k: 'minuteur', donnees: { op: 'demarrer', secondes: 60 } }]];
    const libere = async (...cs) => { for (const c of cs) { const r = await c.get('/api/appels'); if (r.j && r.j.actif) await c.post('/api/appels/' + r.j.actif.id + '/quitter', {}); } };
    const groupe = (createur, ...membres) => S.convCreerGroupe({ createur: createur.id, nom: 'G' + crypto.randomBytes(2).toString('hex'), membres: membres.map(p => p.id), annonces_seules: false, ephemere_s: 0 }).id;
    const geste = (c, id, nom, corps) => c.post('/api/salles/' + id + '/' + nom, corps || {});
    const lireSalle = async (c, id) => (await c.get('/api/salles/' + id)).j;
    {
      /* — dans un appel de groupe lancé par Dan (Perso), Ben répond — */
      await libere(d1, b1, c1, e1, g1, a1);
      const L = await d1.post('/api/appels', { conv: groupe(dan, ben, cleo), type: 'video' });
      const id = L.j.appel.id;
      await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
      const avant = await lireSalle(d1, id);
      v('population : un appel de groupe lancé par Dan (Perso), Dan hôte, Ben présent — la salle dit qu\'elle n\'a PAS les outils (`outils: false`), et la réponse du lancement le disait déjà', [L.code, avant.appel.moi.grade, avant.appel.nb, avant.salle.outils, L.j.salle && L.j.salle.outils], [201, 2, 2, false, false]);
      const refus = [];
      for (const [nom, corps] of OUTILS) { const r = await geste(d1, id, nom, corps === null ? { uid: ben.id } : corps); refus.push([nom, dit(r), r.j && r.j.raison, r.j && r.j.offre]); }
      v('⛔ HUIT outils d\'organisateur : l\'hôte d\'un appel de groupe lancé par un Perso reçoit 402 `formule_requise` (`raison` « organisateur », `offre` « pro ») — attente, verrou, retirer, couper un micro, couper TOUS les micros, enregistrement, sondage, minuteur',
        refus, OUTILS.map(([nom]) => [nom, [402, 'formule_requise'], 'organisateur', 'pro']));
      const apres = await lireSalle(d1, id);
      v('⛔ et RIEN n\'a été écrit : pas de verrou, pas de salle d\'attente, pas d\'enregistrement, pas de sondage ni de minuteur, Ben est toujours présent', [apres.appel.verrou, apres.appel.attente, apres.appel.rec, apres.salle.sondage, apres.salle.minuteur, apres.appel.participants.filter(p => p.statut === 'present').length], [false, false, null, null, null, 2]);
      const libres = [['main', { actif: true }], ['reaction', { emoji: 'pouce' }], ['etat', { camera: true, micro: false, partage: true }]];
      const l1 = []; for (const [nom, corps] of libres) l1.push([nom, (await geste(b1, id, nom, corps)).code]);
      v('le reste est À TOUS dans un appel de groupe : la main levée, une réaction, l\'état du micro, de la caméra et du partage d\'écran (Ben, simple participant)', l1, libres.map(([nom]) => [nom, 200]));
      const eteindre = [await geste(d1, id, 'verrouiller', { actif: false }), await geste(d1, id, 'salle_attente', { actif: false }), await geste(d1, id, 'rec', { actif: false }), await geste(d1, id, 'evt', { k: 'minuteur', donnees: { op: 'arreter' } })];
      v('⛔ ÉTEINDRE n\'est JAMAIS refusé (déverrouiller, couper la salle d\'attente, arrêter l\'enregistrement, arrêter un minuteur)', eteindre.map(r => r.code), [200, 200, 200, 200]);
      v('⛔ l\'ORDRE des refus : un simple participant reçoit 403 `interdit`, un étranger le même 404 qu\'une salle qui n\'existe pas — la formule ne se lit qu\'APRÈS le droit', [dit(await geste(b1, id, 'verrouiller', { actif: true })), dit(await geste(f1, id, 'verrouiller', { actif: true }))], [[403, 'interdit'], [404, 'introuvable']]);
      await libere(d1, b1, c1);
      /* — lancé par une Pro (Ana) : tout marche — */
      const L3 = await a1.post('/api/appels', { conv: groupe(ana, dan, ben), type: 'audio' });
      await d1.post('/api/appels/' + L3.j.appel.id + '/repondre', { accepte: true });
      const ok = [], ordre = OUTILS.map((_, i) => i).sort((x, y) => (OUTILS[x][0] === 'exclure') - (OUTILS[y][0] === 'exclure'));
      for (const i of ordre) { const [nom, corps] = OUTILS[i]; ok[i] = [nom, (await geste(a1, L3.j.appel.id, nom, corps === null ? { uid: dan.id } : corps)).code]; }
      v('⛔ lancé par une membre d\'une entreprise PRO (Ana) : la salle a ses outils (`outils: true`), et les huit marchent (200)', [L3.j.salle && L3.j.salle.outils, ok], [true, OUTILS.map(([nom]) => [nom, 200])]);
      await libere(a1, d1, b1);
      /* — c'est celui qui LANCE qui compte, pas l'hôte du moment — */
      const L4 = await d1.post('/api/appels', { conv: groupe(dan, eve, ben), type: 'audio' });
      await e1.post('/api/appels/' + L4.j.appel.id + '/repondre', { accepte: true });
      await d1.post('/api/appels/' + L4.j.appel.id + '/quitter', {});
      const eveHote = await lireSalle(e1, L4.j.appel.id);
      v('⛔ Dan (Perso) lance, Eve (Pro) répond, Dan raccroche : Eve devient hôte — mais l\'appel a été lancé par un Perso, ses outils restent refusés (402) et la salle dit `outils: false`', [eveHote.appel.moi.grade, eveHote.salle.outils, dit(await geste(e1, L4.j.appel.id, 'verrouiller', { actif: true }))], [2, false, [402, 'formule_requise']]);
      await libere(e1, b1);
      const L5 = await e1.post('/api/appels', { conv: groupe(eve, dan, ben), type: 'audio' });
      await d1.post('/api/appels/' + L5.j.appel.id + '/repondre', { accepte: true });
      await e1.post('/api/appels/' + L5.j.appel.id + '/quitter', {});
      const danHote = await lireSalle(d1, L5.j.appel.id);
      v('… et l\'inverse : Eve (Pro) lance, Dan (Perso) devient hôte quand elle raccroche — les outils sont ouverts (la salle a été lancée par une organisatrice) : le verrou marche', [danHote.appel.moi.grade, danHote.salle.outils, (await geste(d1, L5.j.appel.id, 'verrouiller', { actif: true })).code], [2, true, 200]);
      await libere(d1, b1);
      /* — la salle d'une RÉUNION a ses outils, même quand Pro lâche ensuite — */
      const rEve = await e1.post('/api/reunions', corpsR({ titre: 'Salle d\'Eve', invites: [ana.id] }));
      const enSalle = await e1.post('/api/reunions/' + rEve.j.reunion.id + '/rejoindre', { type: 'audio' });
      const idSalle = enSalle.j.appel.id;
      v('la salle d\'une RÉUNION (genre « reunion ») a ses outils : le verrou marche pour son organisatrice', [enSalle.j.appel.genre, (await lireSalle(e1, idSalle)).salle.outils, (await geste(e1, idSalle, 'verrouiller', { actif: true })).code], ['reunion', true, 200]);
      P.resilier(EE);
      v('⛔ l\'abonnement de l\'entreprise d\'Eve est RÉSILIÉ : elle n\'organise plus (402) — mais la salle de SA réunion, déjà programmée, garde ses outils (sondage)', [dit(await e1.post('/api/reunions', corpsR())), (await geste(e1, idSalle, 'evt', { k: 'sondage', donnees: { op: 'ouvrir', question: 'Encore ?', choix: ['Oui', 'Non'] } })).code], [[402, 'formule_requise'], 200]);
      v('… et ÉTEINDRE ne se refuse jamais (déverrouiller, fermer le sondage)', [(await geste(e1, idSalle, 'verrouiller', { actif: false })).code, (await geste(e1, idSalle, 'evt', { k: 'sondage', donnees: { op: 'fermer' } })).code], [200, 200]);
      await libere(e1);
      const L6 = await e1.post('/api/appels', { conv: groupe(eve, dan, ben), type: 'audio' });
      v('Eve (redevenue Perso) lance un appel de groupe : toujours permis (201) — et sa salle n\'a plus les outils', [L6.code, (await lireSalle(e1, L6.j.appel.id)).salle.outils, dit(await geste(e1, L6.j.appel.id, 'rec', { actif: true }))], [201, false, [402, 'formule_requise']]);
      await libere(e1, d1, b1);
    }

    /* ═══ 6. LA BÊTA OUVRE TOUT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa bêta ouvre tout (« une catégorie masquée est une catégorie qu\'on ne peut plus éprouver »)');
    {
      B = await monter({ facturation, quotas }, {});
      const bd = B.pers('BetaDan'), bb = B.pers('BetaBen'); B.S.contactLier(bd.id, bb.id);
      const x1 = B.cl(bd), y1 = B.cl(bb);
      const r = await x1.post('/api/reunions', corpsR({ invites: [bb.id] }));
      v('sur la bêta, une personne qui n\'a rien programme (201) ET invite en son nom un contact qui n\'a rien (aucun `par_lien`)', [r.code, r.j.invites.length, r.j.par_lien], [201, 2, []]);
      const g = B.S.convCreerGroupe({ createur: bd.id, nom: 'Bêta', membres: [bb.id], annonces_seules: false, ephemere_s: 0 }).id;
      const L = await x1.post('/api/appels', { conv: g, type: 'audio' });
      await y1.post('/api/appels/' + L.j.appel.id + '/repondre', { accepte: true });
      v('… et le verrou d\'un appel de groupe marche sur la bêta (200)', [(await x1.get('/api/salles/' + L.j.appel.id)).j.salle.outils, (await geste(x1, L.j.appel.id, 'verrouiller', { actif: true })).code], [true, 200]);
    }

    /* ═══ 7. SANS CLÉ STRIPE ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nSans clé Stripe, le refus le dit : aucun « S\'abonner » qui ne mènerait nulle part');
    {
      I = await monter({ formule: { toutOuvert: false }, quotas }, { sansStripe: true });
      const i = I.cl(I.pers('Inerte'));
      const refus = await i.post('/api/reunions', corpsR());
      v('⛔ programmer est refusé ET `abonnement_ouvert` est FAUX : la page ne montrera aucun bouton « S\'abonner » qui ne mènerait nulle part', [dit(refus), refus.j.abonnement_ouvert, refus.j.offre], [[402, 'formule_requise'], false, 'pro']);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1500));
    process.exitCode = 1;
  }
  for (const M of [P, B, I]) { if (M) { try { await M.fermer(); } catch (e) { /* déjà fermé */ } } }
  try { await fake.fermer(); } catch (e) { /* déjà fermé */ }
  fin();
})();
