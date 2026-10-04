/* ⛔ CE QUE CE FICHIER GARDE — PERSO+ EN HTTP, CONTRE LE VRAI SERVICE ET UN FAUX STRIPE : ce qui est GRATUIT, ce qui se PAYE, et ce qu'un corps de requête ne peut pas changer (famille 4, Perso+ du 4 octobre 2026).

   Décision de Justin : « Pour le public au niveau des forfaits je veux que ça soit comme WhatsApp : appel, message, appel vidéo. Pour tout ce qui est réunion […] il paye un forfait à 5 € par mois. » Les appels de GROUPE restent
   GRATUITS ; une personne gratuite INVITÉE à une réunion entre gratuitement — seul l'organisateur paie. Une RÉUNION compte au plus DIX personnes, organisateur compris, Perso+ comme Pro.
   Un VRAI service (formule de PRODUCTION : la bêta ouvre tout), un faux Stripe en boucle locale, des personnes fabriquées dans la base (WAL, comme `test-905`). Ce que `test-905` ne voit pas (la matrice joue les gardes, pas
   les histoires) et que `test-991` ne voit pas (les modules, pas le montage) est ici :

     1. LES ROUTES DU FORFAIT : l'état, payer, gérer, relire — la personne est CELLE DE LA SESSION, le corps ne nomme qu'un rythme ; un corps qui MENT (formule, statut, tarif, quantité, une autre personne) ne change rien :
        ni la session ouverte chez Stripe, ni la formule ; un compte non confirmé ne paie pas ; qui a déjà Pro ne paie pas deux fois ; un service sans tarif Perso+ est INERTE et le dit ;
     2. PROGRAMMER SE PAIE, ENTRER NON : Perso → 402 (`raison`, `offre`), Perso+ et Pro → 201, un abonnement en retard n'organise pas, Perso+ n'ouvre AUCUNE fonction d'entreprise ; l'invité Perso entre gratuitement (invitation
        ET lien d'invité) ; rien n'est écrit par un refus ;
     3. LE PLAFOND DE DIX PERSONNES : la onzième est refusée (création, invitation, lien) pour Perso+ comme pour Pro, avec le plafond dit ; une personne déjà invitée n'est jamais refusée ; un appel de GROUPE n'est pas concerné
        (sa limite est celle de la maille : six en audio, quatre en vidéo) ; AUCUNE route, AUCUNE offre ne vend le supplément « Grandes réunions » (il n'existe pas encore) ;
     4. LES OUTILS DE L'ORGANISATEUR D'UNE SALLE : dans un appel de groupe lancé par quelqu'un de gratuit, huit gestes refusent (402) et rien n'est écrit, le reste est à tous ; éteindre n'est jamais refusé ; dans la salle d'une
        RÉUNION, ou si celui qui a LANCÉ l'appel est Pro ou Perso+, tout marche — et c'est celui qui lance qui compte, pas l'hôte du moment ; la bêta ouvre tout ;
     5. LE COMPTE EFFACÉ ANNULE SON ABONNEMENT, par le VRAI balayeur du service (le câblage que `test-991` ne peut pas voir) : demandé, J+14, Stripe reçoit la résiliation ; Stripe muet, l'âge s'affiche dans /health et la
        résiliation aboutit quand Stripe revient.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque refus est précédé de la population qu'il aurait pu compter (les sessions ouvertes chez Stripe, les réunions, les participants). Toute attente est au
   GESTE (on sonde la condition), jamais au chronomètre. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
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
const att = (cond, ms = 10000) => T.attendre(cond, ms, 25);
const CLE = ['rk', 'test', 'BancPersoHttpZzQ9'].join('_');
const PRIX_PRO = { mensuel: 'price_BancHttpProMensuelA1', annuel: 'price_BancHttpProAnnuelB2' };
const PRIX_PP = { mensuel: 'price_BancHttpPersoMensuelC3', annuel: 'price_BancHttpPersoAnnuelD4' };

(async () => {
  const fake = await fauxStripe();
  fake.poserTarif(PRIX_PRO.mensuel); fake.poserTarif(PRIX_PRO.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
  fake.poserTarif(PRIX_PP.mensuel, { unit_amount: 500, product: { id: 'prod_bancpph', object: 'product', name: 'OP MESSAGES Perso+' } });
  fake.poserTarif(PRIX_PP.annuel, { unit_amount: 5000, recurring: { interval: 'year', interval_count: 1 }, product: { id: 'prod_bancpph', object: 'product', name: 'OP MESSAGES Perso+' } });
  const env = { OPMSG_TEST_STRIPE: fake.hote };
  const facturation = (perso) => Object.assign({ cle: CLE, prix: PRIX_PRO, relectureMs: 3600000, timeoutMs: 3000 }, perso === false ? {} : { perso: { prix: PRIX_PP } });
  const quotas = { relire: { max: 1, fenetreMs: 10000 }, paiement: { max: 1000, fenetreMs: 3600000 }, portail: { max: 1000, fenetreMs: 3600000 }, reunion: { max: 1000, fenetreMs: 3600000 }, rejoindre_code: { max: 1000, fenetreMs: 3600000 } };

  /* un service, la base ouverte à côté (WAL), des personnes et des clients fabriqués */
  async function monter(config, opts) {
    const o = opts || {};
    const svc = await T.lancerService({ horloge: true, config, env: o.sansStripe ? {} : env });
    let decal = 0;
    const maintenant = () => Date.now() + decal;
    const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
    let k = 0;
    const pers = (nom, verifie) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: verifie !== false });
    const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
    const avancer = (ms) => { decal += ms; svc.avancer(ms); };
    const brut = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
    const compte = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).get(...a).n; } finally { d.close(); } };
    return { svc, S, pers, cl, avancer, maintenant, brut, compte, fermer: async () => { try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(); } };
  }
  const paye = async (M, c, cycle) => {            // une personne paie : la session chez Stripe est réglée, le service RELIT
    const r = await c.post('/api/moi/perso-plus/paiement', { cycle: cycle || 'mensuel' });
    const sb = fake.payer(fake.derniereSession().id);
    M.avancer(11000);
    const e = await c.post('/api/moi/perso-plus/relire', {});
    return { r, sb, e };
  };
  const relire = async (M, c) => { M.avancer(11000); return c.post('/api/moi/perso-plus/relire', {}); };
  const espacePro = (M, p) => { const e = M.S.espaceCreer({ nom: 'Pro ' + crypto.randomBytes(2).toString('hex'), proprio: p.id }).id; M.S.abonnementPoser(e, { client: 'cus_b992' + e.slice(2, 8), abonnement: 'sub_b992' + e.slice(2, 10), statut: 'active', places: 5, fin_periode: null, annule: false, impaye: false }, { adopter: true }); return e; };

  const P = await monter({ formule: { toutOuvert: false }, facturation: facturation(), quotas, balayageMs: 200, appels: { balayageMs: 1000, perduMs: 600000 } });
  const { svc, S, pers, cl } = P;
  let I = null, B = null;
  try {
    const ana = pers('Ana'), dan = pers('Dan'), eve = pers('Eve'), fred = pers('Fred'), gus = pers('Gus'), ben = pers('Ben'), cleo = pers('Cleo'), ivan = pers('Ivan');
    espacePro(P, ana);
    const a1 = cl(ana), d1 = cl(dan), e1 = cl(eve), f1 = cl(fred), g1 = cl(gus), b1 = cl(ben), c1 = cl(cleo), i1 = cl(ivan);
    for (const p of [dan, eve, fred, gus, ben, cleo]) S.contactLier(ana.id, p.id);
    for (const p of [dan, fred, ben, cleo, gus, ana]) S.contactLier(eve.id, p.id);
    for (const p of [dan, ben, cleo, eve]) S.contactLier(gus.id, p.id);
    for (const p of [ben, cleo, eve, gus, ana]) S.contactLier(dan.id, p.id);

    /* ═══ 1. LES ROUTES DU FORFAIT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Les routes du forfait : la personne est celle de la session, le corps ne nomme qu\'un rythme, un corps qui ment ne change rien');
    {
      const etat = await d1.get('/api/moi/perso-plus');
      v('une personne qui n\'a rien : Perso, ne peut pas organiser, le paiement est ouvert, mode test, deux offres (5 € par mois, 50 € par an)', [etat.code, etat.j.formule, etat.j.organiser, etat.j.ouvert, etat.j.mode, etat.j.offres, etat.j.defaut, etat.j.nom, etat.j.inclus_par_pro],
        [200, 'perso', false, true, 'test', [{ id: 'mensuel', par: 'mois', euros: 5 }, { id: 'annuel', par: 'an', euros: 50 }], 'mensuel', 'Perso+', false]);
      vrai('… et rien d\'intérieur n\'est rendu : ni identifiant de tarif, de client ni d\'abonnement, ni la clé', !/price_|cus_|sub_|rk_test/.test(etat.txt));
      const esp = await d1.get('/api/espaces');
      v('`GET /api/espaces` dit aussi si la personne peut organiser (un booléen), sans rien de plus sur le forfait', [esp.j.organiser, esp.j.formule], [false, 'perso']);
      /* — le corps ne nomme qu'un rythme — */
      const avantS = fake.compter('POST', /checkout\/sessions$/);
      const menteur = await d1.post('/api/moi/perso-plus/paiement', { cycle: 'mensuel', formule: 'perso_plus', statut: 'active', prix: 'price_GratuitPourTous01', price: 'price_GratuitPourTous01', personne: eve.id, uid: eve.id, quantite: 99, quantity: 99, places: 50,
        abonnement: 'sub_inventeAbcd1234', client_reference_id: 'opmsg-perso:' + eve.id, metadata: { opmsg_personne: eve.id } });
      const sess = fake.dernier('POST', /checkout\/sessions$/), paire = (k) => (sess.paires.find(p => p[0] === k) || [])[1];
      vrai('population : une session a bien été ouverte chez Stripe (et une seule) pour ce corps menteur', menteur.code === 201 && fake.compter('POST', /checkout\/sessions$/) === avantS + 1 && /^https:\/\//.test(menteur.j.url));
      v('⛔ le corps qui MENT n\'a rien décidé : le tarif est celui de la configuration, UN siège, la référence et la métadonnée désignent DAN (la session), jamais Eve ni ce que le corps affirmait', [paire('line_items[0][price]'), paire('line_items[0][quantity]'), paire('client_reference_id'), paire('metadata[opmsg_personne]'), sess.paires.some(p => /GratuitPourTous|sub_inventeAbcd/.test(p[1] + p[0])), sess.paires.some(p => p[1] === eve.id)],
        [PRIX_PP.mensuel, '1', 'opmsg-perso:' + dan.id, dan.id, false, false]);
      const apres = (await d1.get('/api/moi/perso-plus')).j;
      v('⛔ et la FORMULE n\'a pas bougé : la personne reste Perso (payer commence chez Stripe, c\'est Stripe qui dit si c\'est payé) ; Eve non plus', [apres.formule, apres.organiser, apres.paiement_en_attente, (await e1.get('/api/moi/perso-plus')).j.formule], ['perso', false, true, 'perso']);
      for (const cyc of ['constructor', '__proto__', 'weekly', 12, null, ['mensuel']]) {
        const r = await d1.post('/api/moi/perso-plus/paiement', { cycle: cyc });
        v('un rythme qui n\'existe pas (' + JSON.stringify(cyc) + ') : 400 `offre_inconnue`', dit(r), [400, 'offre_inconnue']);
      }
      v('… et aucune session de plus n\'a été ouverte chez Stripe (population : le compteur d\'avant)', fake.compter('POST', /checkout\/sessions$/), avantS + 1);
      const reprise = await d1.post('/api/moi/perso-plus/paiement', { cycle: 'mensuel' });
      v('une session encore ouverte est REPRISE (même adresse), pas doublée', [reprise.code, reprise.j.url === menteur.j.url, reprise.j.reprise, fake.sessionsOuvertes().filter(s => s.client_reference_id === 'opmsg-perso:' + dan.id).length], [201, true, true, 1]);
      /* — un compte non confirmé — */
      const zed = pers('Zed', false), z1 = cl(zed);
      v('⛔ un compte NON CONFIRMÉ lit son état (S) mais ne paie pas ni ne gère (V) : 403 `adresse_non_confirmee`', [(await z1.get('/api/moi/perso-plus')).code, dit(await z1.post('/api/moi/perso-plus/paiement', { cycle: 'mensuel' })), dit(await z1.post('/api/moi/perso-plus/portail', {}))], [200, [403, 'adresse_non_confirmee'], [403, 'adresse_non_confirmee']]);
      /* — payer, relire — */
      const eveP = await paye(P, e1);
      v('⛔ Eve paie : la session est réglée chez Stripe, le service RELIT — Perso+, elle peut organiser ; l\'état est celui que Stripe a dit', [eveP.r.code, eveP.e.code, eveP.e.j.formule, eveP.e.j.organiser, eveP.e.j.abonnement && eveP.e.j.abonnement.statut, eveP.e.j.paiement_en_attente], [201, 200, 'perso_plus', true, 'active', false]);
      v('… `GET /api/espaces` le sait aussi', [(await e1.get('/api/espaces')).j.organiser, (await e1.get('/api/espaces')).j.formule], [true, 'perso_plus']);
      const rapide = await e1.post('/api/moi/perso-plus/relire', {});
      v('« J\'ai réglé — vérifier » ne se rejoue pas dans les dix secondes : 429 `quota_atteint`', dit(rapide), [429, 'quota_atteint']);
      /* — Perso+ n'ouvre AUCUNE fonction d'entreprise — */
      const avantE = P.compte('SELECT COUNT(*) AS n FROM espace');
      v('⛔ Perso+ n\'est PAS Pro : créer un espace (une fonction d\'entreprise) reste refusé — 402 `formule_requise`, rien de créé', [dit(await e1.post('/api/espaces', { nom: 'Entreprise d\'Eve' })), P.compte('SELECT COUNT(*) AS n FROM espace') - avantE], [[402, 'formule_requise'], 0]);
      /* — un seul abonnement, le portail — */
      const dbl = await e1.post('/api/moi/perso-plus/paiement', { cycle: 'annuel' });
      v('⛔ Eve a déjà un abonnement : 409 `abonnement_existant` AVEC le lien du portail (jamais un second prélèvement)', [dit(dbl), /^https:\/\/billing\.stripe\.test\//.test(dbl.j.portail || '')], [[409, 'abonnement_existant'], true]);
      const por = await e1.post('/api/moi/perso-plus/portail', {});
      v('le portail : une adresse https de Stripe ; sans paiement fait avant : 409 `pas_d_abonnement`', [por.code, /^https:\/\//.test(por.j.url), dit(await f1.post('/api/moi/perso-plus/portail', {}))], [200, true, [409, 'pas_d_abonnement']]);
      /* — qui a déjà Pro ne paie pas deux fois — */
      const avantPro = fake.compter('POST', /checkout\/sessions$/);
      const pro = await a1.get('/api/moi/perso-plus');
      v('⛔ un propriétaire d\'un espace Pro PAYÉ : l\'état dit `inclus_par_pro` (la page ne lui montre pas de prix), et payer Perso+ est refusé — 409 `formule_deja_incluse`, rien d\'ouvert chez Stripe', [pro.j.inclus_par_pro, pro.j.organiser, dit(await a1.post('/api/moi/perso-plus/paiement', { cycle: 'mensuel' })), fake.compter('POST', /checkout\/sessions$/) - avantPro], [true, true, [409, 'formule_deja_incluse'], 0]);
    }

    /* ═══ 2. PROGRAMMER SE PAIE, ENTRER NON ══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nProgrammer une réunion se paie (Perso+ ou Pro) ; en être invité, répondre, entrer par une invitation ou par le lien ne coûtent rien');
    const corpsR = (o) => Object.assign({ titre: 'Point', debut: P.maintenant() + 2 * 60000, fin: P.maintenant() + 62 * 60000, invites: [], notifier: false }, o || {});
    let reunionEve = null;
    {
      const n0 = P.compte('SELECT COUNT(*) AS n FROM reunion'), s0 = P.compte('SELECT COUNT(*) AS n FROM abonnement_perso');
      const perso = await d1.post('/api/reunions', corpsR());
      v('⛔ une personne PERSO (Dan) ne programme pas : 402 `formule_requise`, `raison` « perso », `offre` « perso_plus », et le bouton « S\'abonner » mène quelque part (`abonnement_ouvert`) — rien n\'est créé', [dit(perso), perso.j.raison, perso.j.offre, perso.j.abonnement_ouvert, P.compte('SELECT COUNT(*) AS n FROM reunion') - n0], [[402, 'formule_requise'], 'perso', 'perso_plus', true, 0]);
      const ment = await d1.post('/api/reunions', corpsR({ formule: 'pro', organiser: true, perso_plus: true, forfait: 'perso_plus', hote: ana.id }));
      v('⛔ un corps qui se dit Pro, organisateur ou Perso+ n\'y change rien : le même 402, toujours rien de créé', [dit(ment), P.compte('SELECT COUNT(*) AS n FROM reunion') - n0, P.compte('SELECT COUNT(*) AS n FROM abonnement_perso') - s0], [[402, 'formule_requise'], 0, 0]);
      reunionEve = await e1.post('/api/reunions', corpsR({ titre: 'Réunion d\'Eve', invites: [dan.id] }));
      const reunionAna = await a1.post('/api/reunions', corpsR({ titre: 'Réunion d\'Ana', invites: [dan.id] }));
      v('Perso+ (Eve) programme : 201 ; Pro (Ana) aussi : 201 — les deux invitent Dan, qui est Perso', [reunionEve.code, reunionAna.code, reunionEve.j.invites.length, reunionAna.j.invites.length], [201, 201, 2, 2]);
      /* — un abonnement en retard n'organise pas — */
      const ivanP = await paye(P, i1);
      v('population : Ivan, Perso+ payé, programme (201)', [(await i1.post('/api/reunions', corpsR({ titre: 'Avant le retard' }))).code, ivanP.e.j.organiser], [201, true]);
      fake.statut(ivanP.sb.id, 'past_due');
      const rIv = await relire(P, i1);
      const imp = await i1.post('/api/reunions', corpsR({ titre: 'Pendant le retard' }));
      v('⛔ Stripe dit « en retard » : l\'état le lit, la personne n\'organise PLUS, tout de suite (pas de sursis), `raison` « impaye » — mais son compte, ses messages, ses appels et ses réunions déjà programmées restent', [rIv.j.impaye, rIv.j.organiser, rIv.j.formule, dit(imp), imp.j.raison, (await i1.get('/api/reunions?du=' + (P.maintenant() - JOUR) + '&au=' + (P.maintenant() + 7 * JOUR))).code], [true, false, 'impaye', [402, 'formule_requise'], 'impaye', 200]);
      fake.statut(ivanP.sb.id, 'active'); await relire(P, i1);
      v('… réglé chez Stripe, relu : il organise de nouveau (201)', (await i1.post('/api/reunions', corpsR({ titre: 'Après le retard' }))).code, 201);
    }
    {
      /* — l'invité Perso entre gratuitement : par l'invitation, par le lien — */
      const id = reunionEve.j.reunion.id;
      const n0 = P.compte('SELECT COUNT(*) AS n FROM abonnement_perso');
      const rj = await d1.post('/api/reunions/' + id + '/rejoindre', {});
      v('⛔ Dan (PERSO, invité) ENTRE dans la salle de la réunion d\'Eve : 200, présent — l\'invité ne paie rien', [rj.code, rj.j.appel && rj.j.appel.genre, rj.j.appel && rj.j.appel.moi && rj.j.appel.moi.statut], [200, 'reunion', 'present']);
      const code = (await e1.post('/api/reunions/' + id + '/lien', {})).j.code;
      const apercu = await T.client(svc.base).post('/api/reunions/apercu', { code });
      const parLien = await f1.post('/api/reunions/rejoindre', { code });
      v('⛔ Fred (PERSO, sans invitation) entre PAR LE LIEN d\'invité : 200, il devient invité (accepté) et entre — l\'aperçu public ne dit que de quoi décider', [apercu.code, Object.keys(apercu.j.reunion).sort(), parLien.code, parLien.j.reunion === id, parLien.j.appel && parLien.j.appel.moi && parLien.j.appel.moi.statut], [200, ['attente', 'debut', 'en_cours', 'fin', 'titre'], 200, true, 'present']);
      v('… l\'agenda de Fred et le fichier .ics lui sont ouverts, il répond : tout cela est gratuit', [(await f1.get('/api/reunions/' + id)).code, (await f1.get('/api/reunions/' + id + '/ics')).code, dit(await f1.post('/api/reunions/' + id + '/reponse', { statut: 'peutetre' }))], [200, 200, [200, undefined]]);
      v('⛔ Dan et Fred restent Perso après tout cela (entrer ne leur a rien coûté et ne leur a rien donné) — aucune ligne d\'abonnement n\'est née', [(await d1.get('/api/moi/perso-plus')).j.formule, (await f1.get('/api/moi/perso-plus')).j.formule, P.compte('SELECT COUNT(*) AS n FROM abonnement_perso') - n0], ['perso', 'perso', 0]);
      v('mais ils n\'organisent pas pour autant : Fred ne programme pas, et n\'est pas l\'hôte (403) — ni n\'invite, ni ne renouvelle le lien', [dit(await f1.post('/api/reunions', corpsR())), dit(await f1.post('/api/reunions/' + id + '/inviter', { uids: [gus.id] })), dit(await f1.post('/api/reunions/' + id + '/lien', {}))], [[402, 'formule_requise'], [403, 'interdit'], [403, 'interdit']]);
    }

    /* ═══ 3. LE PLAFOND DE DIX PERSONNES ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne réunion compte au plus dix personnes, organisateur compris — Perso+ comme Pro ; un appel de groupe n\'est pas concerné ; le supplément ne se vend pas');
    {
      const foule = []; for (let i = 0; i < 12; i++) { const p = pers('Foule'); foule.push(p); S.contactLier(eve.id, p.id); S.contactLier(ana.id, p.id); }
      const f0 = cl(foule[0]);   // UN client pour la personne déjà invitée : la salle est liée à l'appareil qui y entre, c'est lui qui en sort
      const cfg = (await d1.get('/api/config')).j;
      v('la page lit le plafond du service (une seule constante) : dix', cfg.limites.reunion_personnes, 10);
      for (const [nom, c, hote] of [['Perso+ (Eve)', e1, eve], ['Pro (Ana)', a1, ana]]) {
        const n0 = P.compte('SELECT COUNT(*) AS n FROM reunion');
        const onze = await c.post('/api/reunions', corpsR({ titre: 'Onze ' + nom, invites: foule.slice(0, 10).map(p => p.id) }));
        v('⛔ ' + nom + ' : dix invités + l\'organisateur = ONZE personnes → 409 `reunion_pleine`, le plafond (10) est dit, rien de créé', [dit(onze), onze.j.max, P.compte('SELECT COUNT(*) AS n FROM reunion') - n0], [[409, 'reunion_pleine'], 10, 0]);
        const dix = await c.post('/api/reunions', corpsR({ titre: 'Dix ' + nom, invites: foule.slice(0, 9).map(p => p.id) }));
        v('population : neuf invités + l\'organisateur = DIX personnes → 201 (le refus d\'avant venait bien du nombre), la fiche dit son plafond', [dix.code, dix.j.invites.length, dix.j.plafond, P.compte('SELECT COUNT(*) AS n FROM reunion') - n0], [201, 10, 10, 1]);
        const id = dix.j.reunion.id;
        const plus = await c.post('/api/reunions/' + id + '/inviter', { uids: [foule[9].id] });
        v('⛔ ' + nom + ' : inviter une ONZIÈME personne → 409 `reunion_pleine`, la fiche garde ses dix', [dit(plus), plus.j.max, P.compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', id)], [[409, 'reunion_pleine'], 10, 10]);
        const code = (await c.post('/api/reunions/' + id + '/lien', {})).j.code;
        const onzieme = pers('Onzieme'), o1 = cl(onzieme);
        const lien = await o1.post('/api/reunions/rejoindre', { code });
        v('⛔ ' + nom + ' : la onzième personne qui entre par le LIEN → 409 `reunion_pleine`, elle n\'est pas inscrite', [dit(lien), lien.j.max, P.compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', id, onzieme.id)], [[409, 'reunion_pleine'], 10, 0]);
        const deja = await f0.post('/api/reunions/rejoindre', { code });
        v('une personne DÉJÀ invitée n\'est jamais refusée par le plafond : elle entre par le lien (200)', [deja.code, deja.j.reunion === id], [200, true]);
        if (deja.j.appel) await f0.post('/api/appels/' + deja.j.appel.id + '/quitter', {});   // elle sort de la salle : la même personne sert à la seconde réunion (sinon `occupe`)
        const retire = await c.post('/api/reunions/' + id + '/retirer', { uid: foule[8].id });
        const apresRetrait = await o1.post('/api/reunions/rejoindre', { code });
        v('contre-épreuve : on retire quelqu\'un, la place est libre — la même personne entre (200) : le refus venait bien du nombre', [retire.code, apresRetrait.code, P.compte('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', id)], [200, 200, 10]);
        void hote;
      }
      /* — l'appel de GROUPE n'est pas concerné — */
      const douze = []; for (let i = 0; i < 12; i++) douze.push(pers('Groupe'));
      const chef = pers('Chef'), ch1 = cl(chef);
      const grand = S.convCreerGroupe({ createur: chef.id, nom: 'Douze', membres: douze.map(p => p.id), annonces_seules: false, ephemere_s: 0 }).id;
      for (const p of douze) S.contactLier(chef.id, p.id);
      const lance = await ch1.post('/api/appels', { conv: grand, type: 'audio' });
      v('⛔ un appel de GROUPE gratuit de TREIZE personnes (Chef + douze) est lancé — 201, genre « groupe » : le plafond de dix est celui des RÉUNIONS, pas des appels', [lance.code, lance.j.appel && lance.j.appel.genre, lance.j.appel && lance.j.appel.capacite], [201, 'groupe', 6]);
      const reponses = [];
      for (const p of douze.slice(0, 6)) reponses.push((await cl(p).post('/api/appels/' + lance.j.appel.id + '/repondre', { accepte: true })).code);
      const dernier = await cl(douze[6]).post('/api/appels/' + lance.j.appel.id + '/repondre', { accepte: true });
      v('… sa limite est celle de la MAILLE : six en audio (l\'hôte + cinq répondent, la sixième personne qui répond est refusée par la CAPACITÉ de la salle, jamais par un « plafond de réunion »)', [reponses.slice(0, 5), dit(dernier).concat([dernier.j && dernier.j.error === 'reunion_pleine'])], [[200, 200, 200, 200, 200], [409, 'appel_complet', false]]);
      await ch1.post('/api/appels/' + lance.j.appel.id + '/quitter', {});
      /* — le supplément n'existe pas — */
      const offres = (await T.client(svc.base).get('/api/facturation/offres')).txt;
      vrai('⛔ le supplément « Grandes réunions » ne se VEND PAS : aucune route du manifeste (identifiant ou chemin), aucune offre publique, aucune clé de configuration publiée n\'en parle', !MANIFESTE.some(r => /supplement|grandes|webinaire|visio/i.test(r.id + ' ' + r.p)) && !/supplement|grandes|webinaire/i.test(offres) && !/supplement|grandes|webinaire/i.test(JSON.stringify(cfg)));
    }

    /* ═══ 4. LES OUTILS DE L'ORGANISATEUR D'UNE SALLE ════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes outils de l\'organisateur d\'une salle : refusés dans un appel de groupe lancé par quelqu\'un de gratuit, ouverts dans une réunion ou si celui qui lance est Pro ou Perso+');
    const OUTILS = [['verrouiller', { actif: true }], ['salle_attente', { actif: true }], ['exclure', null], ['couper_micro', { tous: true }], ['couper_micro', null], ['rec', { actif: true }],
      ['evt', { k: 'sondage', donnees: { op: 'ouvrir', question: 'On y va ?', choix: ['Oui', 'Non'] } }], ['evt', { k: 'minuteur', donnees: { op: 'demarrer', secondes: 60 } }]];
    const libere = async (...cs) => { for (const c of cs) { const r = await c.get('/api/appels'); if (r.j && r.j.actif) await c.post('/api/appels/' + r.j.actif.id + '/quitter', {}); } };
    const groupe = (createur, ...membres) => S.convCreerGroupe({ createur: createur.id, nom: 'G' + crypto.randomBytes(2).toString('hex'), membres: membres.map(p => p.id), annonces_seules: false, ephemere_s: 0 }).id;
    const geste = (c, id, nom, corps) => c.post('/api/salles/' + id + '/' + nom, corps || {});
    const lireSalle = async (c, id) => (await c.get('/api/salles/' + id)).j;
    {
      /* — dans un appel gratuit : Dan (Perso) lance, Ben répond — */
      await libere(d1, b1, c1, e1, g1);
      const g = groupe(dan, ben, cleo);
      const L = await d1.post('/api/appels', { conv: g, type: 'video' });
      const id = L.j.appel.id;
      await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
      const avant = await lireSalle(d1, id);
      v('population : un appel de groupe GRATUIT en cours, Dan hôte, Ben présent — sa salle dit qu\'elle n\'a PAS les outils (`outils: false`) ; l\'appel lancé l\'a été gratuitement (201)', [L.code, avant.appel.moi.grade, avant.appel.nb, avant.salle.outils], [201, 2, 2, false]);
      const refus = [];
      for (const [nom, corps] of OUTILS) {
        const c = corps === null ? { uid: ben.id } : corps;
        const r = await geste(d1, id, nom, c);
        refus.push([nom, dit(r), r.j && r.j.raison, r.j && r.j.offre]);
      }
      v('⛔ HUIT outils d\'organisateur : l\'hôte d\'un appel de groupe gratuit reçoit 402 `formule_requise` (`raison` « organisateur », `offre` « perso_plus ») — attente, verrou, retirer, couper un micro, couper TOUS les micros, enregistrement, sondage, minuteur',
        refus, OUTILS.map(([nom]) => [nom, [402, 'formule_requise'], 'organisateur', 'perso_plus']));
      const apres = await lireSalle(d1, id);
      v('⛔ et RIEN n\'a été écrit : pas de verrou, pas de salle d\'attente, pas d\'enregistrement, pas de sondage ni de minuteur, Ben est toujours présent', [apres.appel.verrou, apres.appel.attente, apres.appel.rec, apres.salle.sondage, apres.salle.minuteur, apres.appel.participants.filter(p => p.statut === 'present').length], [false, false, null, null, null, 2]);
      const libres = [['main', { actif: true }], ['reaction', { emoji: 'pouce' }], ['etat', { camera: true, micro: false, partage: true }]];
      const l1 = []; for (const [nom, corps] of libres) l1.push([nom, (await geste(b1, id, nom, corps)).code]);
      v('le reste est À TOUS dans un appel gratuit : la main levée, une réaction, l\'état du micro, de la caméra et du partage d\'écran (Ben, simple participant)', l1, libres.map(([nom]) => [nom, 200]));
      const l2 = [['partage', await geste(d1, id, 'partage', { actif: false })], ['epingle', await geste(d1, id, 'evt', { k: 'epingle', donnees: { op: 'epingler', uid: ben.id } })], ['cohote', await geste(d1, id, 'cohote', { uid: ben.id, actif: true })]];
      v('l\'hôte garde le réglage du partage d\'écran des participants, l\'épingle et la nomination d\'un co-hôte (ils ne sont pas des outils d\'organisateur)', l2.map(([nom, r]) => [nom, r.code]), [['partage', 200], ['epingle', 200], ['cohote', 200]]);
      await geste(d1, id, 'cohote', { uid: ben.id, actif: false });   // Ben redevient un simple participant (la suite juge l'ordre des refus)
      const eteindre = [await geste(d1, id, 'verrouiller', { actif: false }), await geste(d1, id, 'salle_attente', { actif: false }), await geste(d1, id, 'rec', { actif: false }), await geste(d1, id, 'evt', { k: 'minuteur', donnees: { op: 'arreter' } })];
      v('⛔ ÉTEINDRE n\'est JAMAIS refusé (déverrouiller, couper la salle d\'attente, arrêter l\'enregistrement, arrêter un minuteur) : une salle ne reste pas verrouillée parce que le forfait a lâché', eteindre.map(r => r.code), [200, 200, 200, 200]);
      const part = await geste(b1, id, 'verrouiller', { actif: true });
      const etranger = await geste(cl(fred), id, 'verrouiller', { actif: true });
      v('⛔ l\'ORDRE des refus : un simple participant reçoit 403 `interdit` (il connaît la salle), un étranger le même 404 qu\'une salle qui n\'existe pas — le forfait ne se lit qu\'APRÈS le droit', [dit(part), dit(etranger), dit(await geste(cl(fred), 'a_' + '0'.repeat(32), 'verrouiller', { actif: true }))], [[403, 'interdit'], [404, 'introuvable'], [404, 'introuvable']]);
      await libere(d1, b1, c1);
      /* — lancé par Perso+ (Gus) : tout marche — */
      const gp = groupe(gus, dan, ben);
      const L2 = await g1.post('/api/appels', { conv: gp, type: 'video' });
      const id2 = L2.j.appel.id;
      await d1.post('/api/appels/' + id2 + '/repondre', { accepte: true });
      await paye(P, g1);
      const lancee = await lireSalle(g1, id2);
      const ok = [];
      /* « retirer » passe en dernier : Dan, une fois sorti, ne serait plus la cible du micro à couper (404 `introuvable`, une autre réponse que celle qu'on mesure) */
      const ordre = OUTILS.map((_, i) => i).sort((x, y) => (OUTILS[x][0] === 'exclure') - (OUTILS[y][0] === 'exclure'));
      for (const i of ordre) { const [nom, corps] = OUTILS[i]; ok[i] = [nom, (await geste(g1, id2, nom, corps === null ? { uid: dan.id } : corps)).code]; }
      v('⛔ un appel de groupe lancé par quelqu\'un qui est PERSO+ (Gus, abonné pendant l\'appel : la formule se lit à CHAQUE geste) : les huit outils marchent (200) et la salle le dit (`outils: true`)', [lancee.salle.outils, ok], [true, OUTILS.map(([nom]) => [nom, 200])]);
      await libere(g1, d1, b1);
      /* — lancé par un Pro (Ana) — */
      const gpro = groupe(ana, dan, ben);
      const L3 = await a1.post('/api/appels', { conv: gpro, type: 'audio' });
      await d1.post('/api/appels/' + L3.j.appel.id + '/repondre', { accepte: true });
      v('lancé par un membre d\'une entreprise PRO (Ana) : la salle a ses outils, le verrou marche', [(await lireSalle(a1, L3.j.appel.id)).salle.outils, (await geste(a1, L3.j.appel.id, 'verrouiller', { actif: true })).code], [true, 200]);
      await libere(a1, d1, b1);
      /* — c'est celui qui LANCE qui compte, pas l'hôte du moment — */
      const g4 = groupe(dan, eve, ben);
      const L4 = await d1.post('/api/appels', { conv: g4, type: 'audio' });
      await e1.post('/api/appels/' + L4.j.appel.id + '/repondre', { accepte: true });
      await d1.post('/api/appels/' + L4.j.appel.id + '/quitter', {});
      const eveHote = await lireSalle(e1, L4.j.appel.id);
      v('⛔ Dan (gratuit) lance, Eve (Perso+) répond, Dan raccroche : Eve devient hôte — mais l\'appel a été lancé par un gratuit, ses outils restent refusés (402) et la salle dit `outils: false`', [eveHote.appel.moi.grade, eveHote.salle.outils, dit(await geste(e1, L4.j.appel.id, 'verrouiller', { actif: true }))], [2, false, [402, 'formule_requise']]);
      await libere(e1, b1);
      const g5 = groupe(eve, dan, ben);
      const L5 = await e1.post('/api/appels', { conv: g5, type: 'audio' });
      await d1.post('/api/appels/' + L5.j.appel.id + '/repondre', { accepte: true });
      await e1.post('/api/appels/' + L5.j.appel.id + '/quitter', {});
      const danHote = await lireSalle(d1, L5.j.appel.id);
      v('… et l\'inverse : Eve (Perso+) lance, Dan (gratuit) devient hôte quand elle raccroche — les outils sont ouverts (la salle a été lancée par une organisatrice) : le verrou marche', [danHote.appel.moi.grade, danHote.salle.outils, (await geste(d1, L5.j.appel.id, 'verrouiller', { actif: true })).code], [2, true, 200]);
      await libere(d1, b1);
      /* — la salle d'une RÉUNION a ses outils, même quand le forfait lâche ensuite — */
      const rEve = await e1.post('/api/reunions', corpsR({ titre: 'Salle d\'Eve', invites: [dan.id, ben.id] }));
      const enSalle = await e1.post('/api/reunions/' + rEve.j.reunion.id + '/rejoindre', { type: 'audio' });
      const idSalle = enSalle.j.appel.id;
      v('la salle d\'une RÉUNION (genre « reunion ») a ses outils : le verrou marche pour son organisatrice', [enSalle.j.appel.genre, (await lireSalle(e1, idSalle)).salle.outils, (await geste(e1, idSalle, 'verrouiller', { actif: true })).code], ['reunion', true, 200]);
      fake.statut(fake.abonnements.keys().next().value, 'active');
      const sbEve = Array.from(fake.abonnements.values()).find(sb => sb.metadata && sb.metadata.opmsg_personne === eve.id);
      fake.statut(sbEve.id, 'canceled'); await relire(P, e1);
      const lapse = await e1.get('/api/moi/perso-plus');
      v('⛔ le forfait d\'Eve est RÉSILIÉ : elle n\'organise plus (402 en programmant) — mais la salle de SA réunion, déjà programmée, garde ses outils (sondage, retirer, couper les micros)', [lapse.j.organiser, dit(await e1.post('/api/reunions', corpsR())), (await geste(e1, idSalle, 'evt', { k: 'sondage', donnees: { op: 'ouvrir', question: 'Encore ?', choix: ['Oui', 'Non'] } })).code, (await geste(e1, idSalle, 'couper_micro', { tous: true })).code],
        [false, [402, 'formule_requise'], 200, 200]);
      v('… et ÉTEINDRE ne se refuse jamais (déverrouiller, fermer le sondage)', [(await geste(e1, idSalle, 'verrouiller', { actif: false })).code, (await geste(e1, idSalle, 'evt', { k: 'sondage', donnees: { op: 'fermer' } })).code], [200, 200]);
      await libere(e1, d1, b1);
      /* — un appel de groupe lancé PAR Eve, dont le forfait a lâché : gratuit, comme un autre — */
      const g6 = groupe(eve, dan, ben);
      const L6 = await e1.post('/api/appels', { conv: g6, type: 'audio' });
      v('Eve (forfait résilié) lance un appel de groupe : toujours gratuit (201) — et sa salle n\'a plus les outils', [L6.code, (await lireSalle(e1, L6.j.appel.id)).salle.outils, dit(await geste(e1, L6.j.appel.id, 'rec', { actif: true }))], [201, false, [402, 'formule_requise']]);
      await libere(e1, d1, b1);
    }

    /* ═══ 4 bis. LA BÊTA OUVRE TOUT ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa bêta ouvre tout (« une catégorie masquée est une catégorie qu\'on ne peut plus éprouver ») — mais le paiement s\'y essaie');
    {
      B = await monter({ facturation: facturation(), quotas }, {});
      const bd = B.pers('BetaDan'), bb = B.pers('BetaBen'); B.S.contactLier(bd.id, bb.id);
      const x1 = B.cl(bd), y1 = B.cl(bb);
      const etat = await x1.get('/api/moi/perso-plus');
      v('sur la bêta, une personne qui n\'a rien organise (tout est ouvert) — l\'état le dit (`tout_ouvert`), et le paiement reste possible pour l\'essayer', [etat.j.formule, etat.j.organiser, etat.j.tout_ouvert, etat.j.ouvert, etat.j.inclus_par_pro], ['pro', true, true, true, false]);
      const paiement = await x1.post('/api/moi/perso-plus/paiement', { cycle: 'mensuel' });
      v('⛔ … sur la bêta le paiement de Perso+ s\'ESSAIE (201) : le service juge le RÉEL, pas le drapeau « tout ouvert » (sinon il ne s\'éprouverait jamais)', [paiement.code, /^https:\/\//.test(paiement.j.url)], [201, true]);
      v('la bêta programme (201) et ses salles d\'appel de groupe ont leurs outils', [(await x1.post('/api/reunions', corpsR())).code], [201]);
      const g = B.S.convCreerGroupe({ createur: bd.id, nom: 'Bêta', membres: [bb.id], annonces_seules: false, ephemere_s: 0 }).id;
      const L = await x1.post('/api/appels', { conv: g, type: 'audio' });
      await y1.post('/api/appels/' + L.j.appel.id + '/repondre', { accepte: true });
      v('… et le verrou d\'un appel de groupe gratuit marche sur la bêta (200)', [(await x1.get('/api/salles/' + L.j.appel.id)).j.salle.outils, (await geste(x1, L.j.appel.id, 'verrouiller', { actif: true })).code], [true, 200]);
    }

    /* ═══ 1 bis. UN SERVICE SANS TARIF PERSO+ EST INERTE ════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nSans tarif Perso+ (alors que Messages Pro est ouvert) le forfait est INERTE et le dit ; programmer reste refusé, sans bouton mort');
    {
      I = await monter({ formule: { toutOuvert: false }, facturation: facturation(false), quotas }, {});
      const ia = I.pers('Inerte'), i = I.cl(ia);
      const avant = fake.appels.length;
      const etat = await i.get('/api/moi/perso-plus');
      v('l\'état : fermé, aucune offre, aucun rythme — il ne promet rien', [etat.j.ouvert, etat.j.offres, etat.j.defaut, etat.j.organiser], [false, [], null, false]);
      v('⛔ payer, gérer, relire : 503 `abonnement_non_ouvert` — et rien n\'est parti chez Stripe', [dit(await i.post('/api/moi/perso-plus/paiement', { cycle: 'mensuel' })), dit(await i.post('/api/moi/perso-plus/portail', {})), dit(await i.post('/api/moi/perso-plus/relire', {})), fake.appels.length - avant],
        [[503, 'abonnement_non_ouvert'], [503, 'abonnement_non_ouvert'], [503, 'abonnement_non_ouvert'], 0]);
      const refus = await i.post('/api/reunions', corpsR());
      v('⛔ programmer est refusé ET `abonnement_ouvert` est FAUX : la page ne montrera aucun bouton « S\'abonner » qui ne mènerait nulle part', [dit(refus), refus.j.abonnement_ouvert, refus.j.offre], [[402, 'formule_requise'], false, 'perso_plus']);
    }

    /* ═══ 5. LE COMPTE EFFACÉ ANNULE SON ABONNEMENT ══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn compte effacé annule son abonnement : par le vrai balayeur du service (J+14), et il le REJOUE quand Stripe revient');
    {
      const hal = pers('Hal'), h1 = cl(hal);
      const halP = await paye(P, h1);
      const nSub = Array.from(fake.abonnements.values()).filter(sb => sb.status === 'active').length;
      const dem = await h1.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
      v('population : Hal, Perso+ payé, demande la suppression de son compte (200) — son abonnement court toujours chez Stripe (J+0)', [halP.e.j.organiser, dem.code, fake.resiliations.includes(halP.sb.id), nSub >= 1], [true, 200, false, true]);
      P.avancer(15 * JOUR);
      const fait = await att(() => fake.resiliations.includes(halP.sb.id));
      vrai('⛔ J+14 : le VRAI balayeur efface le compte et Stripe REÇOIT la résiliation de CET abonnement (le câblage de l\'effacement à la facturation, que ni le module ni le stockage ne voient)', fait);
      const aucun = P.compte('SELECT COUNT(*) AS n FROM abonnement_perso WHERE personne = ?', hal.id) + P.compte('SELECT COUNT(*) AS n FROM abonnement_a_annuler WHERE abonnement = ?', halP.sb.id);
      v('… la ligne de son abonnement est partie avec lui, la file est vide, /health ne dit qu\'un âge (zéro)', [aucun, (await T.client(svc.base).get('/health')).j.facturation.persoAnnulationMin], [0, 0]);
      /* — Stripe muet au moment de l'effacement — */
      const ina = pers('Ina'), n1 = cl(ina);
      const inaP = await paye(P, n1);
      await n1.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
      fake.mode = 'muet';
      P.avancer(15 * JOUR);
      const efface = await att(() => P.compte(`SELECT COUNT(*) AS n FROM personne WHERE id = ? AND etat = 'supprime'`, ina.id) === 1);
      P.avancer(3 * 3600000);
      const vieux = await att(async () => ((await T.client(svc.base).get('/health')).j.facturation.persoAnnulationMin) >= 180);
      v('⛔ Stripe muet : le compte est effacé quand même (l\'effacement n\'attend jamais le réseau), la résiliation est NOTÉE et attend — /health en dit l\'ÂGE (≥ 180 minutes), jamais un nombre d\'abonnés ni un identifiant', [efface, vieux, fake.resiliations.includes(inaP.sb.id), P.compte('SELECT COUNT(*) AS n FROM abonnement_a_annuler WHERE abonnement = ?', inaP.sb.id)], [true, true, false, 1]);
      const sante = (await T.client(svc.base).get('/health')).txt;
      vrai('… /health ne publie aucun identifiant (`sub_`, `cus_`, `p_…`) ni chiffre commercial autour de cela', !/sub_|cus_|"p_[0-9a-f]{32}"|abonn[ée]s?\b/i.test(sante));
      fake.mode = 'normal';
      P.avancer(3600000 + 11000);
      const reprise = await att(() => fake.resiliations.includes(inaP.sb.id), 15000);
      vrai('⛔ Stripe revient : la passe de relecture REJOUE la résiliation sans que personne n\'ait rien demandé — l\'abonnement est résilié, la file se vide, l\'âge retombe à zéro', reprise && await att(async () => (await T.client(svc.base).get('/health')).j.facturation.persoAnnulationMin === 0) && P.compte('SELECT COUNT(*) AS n FROM abonnement_a_annuler') === 0);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1500));
    process.exitCode = 1;
  }
  for (const M of [P, I, B]) { if (M) { try { await M.fermer(); } catch (e) { /* déjà fermé */ } } }
  try { await fake.fermer(); } catch (e) { /* déjà fermé */ }
  fin();
})();
