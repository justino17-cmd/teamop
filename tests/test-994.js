/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE ET LE SERVICE SE PARLENT, POUR LE FORFAIT PERSO+ ET LE PLAFOND DE DIX PERSONNES (famille 4, étape 9 ; modèles `test-976` et `test-990`).

   Les VRAIES fonctions de `server-msg/public/api.js` et de `server-msg/public/source-serveur.js` (le module que la page appelle) sont exécutées dans Node contre le VRAI service — formule de PRODUCTION, un faux
   Stripe en boucle locale —, chaque personne étant un « appareil de poche » (cookie, Origin, flux). Ce que ni `test-992` (les routes seules) ni la sonde (le DOM) ne voient :
     · LE CONTRAT : les capacités `persoPlus` et `reunionPlafond`, chaque méthode que la page appelle, la formule `perso_plus` connue du module (`FORMULES`) — une formule inconnue est lue « perso », jamais « pro » ;
     · L'ÉTAT SANS RÉSEAU : le NOM du forfait et ses prix viennent du SERVICE (la page ne les écrit nulle part) ; la personne est celle de la session ;
     · PAYER : une adresse de Stripe, https seulement (une adresse venue du service qui n'est pas en https n'est jamais rendue) ; « J'ai réglé — vérifier » relit chez Stripe et prévient la page (`espaces`) ;
     · LE REFUS D'ORGANISER SE DIT : `ErreurApi.offre` « perso_plus », `raison` (perso / impaye / organisateur), `abonnementOuvert` — et la PHRASE promet ce que le service tient (rejoindre reste gratuit), n'écrit
       aucun prix, ne dit « fonction Pro » nulle part ; un espace déjà Pro n'achète pas un forfait de personne (409 `formule_deja_incluse`, avec sa phrase) ;
     · LE PLAFOND DE DIX PERSONNES : la page le LIT chez le service (`plafondReunion()`, la fiche d'une réunion), la onzième personne est refusée avec une phrase qui nomme le plafond ;
     · SUPPRIMER SON COMPTE AVEC UN ABONNEMENT PERSO+ : `supprimerCompte()` (le module) arrête le renouvellement chez Stripe, `connexion()` avant l'échéance dit « suppression annulée » ET le rétablit ; la feuille de
       la page dit UNE phrase (« Ton abonnement Perso+ ne sera plus renouvelé. ») — lue dans le code de la page, le DOM étant joué par la sonde.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque refus est précédé de ce qu'il aurait pu compter (sessions ouvertes chez Stripe, réunions). Toute attente est au GESTE. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const codeDe = (e) => e ? e.code : null;
const phrase = (e) => e && e.dit ? e.phrase() : '';
const METHODES = ['persoPlus', 'persoPlusPayer', 'persoPlusPortail', 'persoPlusRelire', 'plafondReunion', 'espaces', 'programmer', 'reunion', 'inviterReunion'];
const CLE = ['rk', 'test', 'BancPagePersoZzQq9X'].join('_');
const PRIX_PRO = { mensuel: 'price_BancPageProMensuelA1', annuel: 'price_BancPageProAnnuelB2' };
const PRIX_PP = { mensuel: 'price_BancPagePersoMensuelC3', annuel: 'price_BancPagePersoAnnuelD4' };
const JOUR = 86400000;

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

(async () => {
  const MDP = { alice: 'pw-alice-1234', bob: 'pw-bob-123456', cleo: 'pw-cleo-12345', dan: 'pw-dan-123456', erin: 'pw-erin-123456' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  const fake = await fauxStripe();
  fake.poserTarif(PRIX_PRO.mensuel); fake.poserTarif(PRIX_PRO.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
  const produit = { id: 'prod_bancpagepp', object: 'product', name: 'OP MESSAGES Perso+' };
  fake.poserTarif(PRIX_PP.mensuel, { unit_amount: 500, product: produit });
  fake.poserTarif(PRIX_PP.annuel, { unit_amount: 5000, recurring: { interval: 'year', interval_count: 1 }, product: produit });
  const quotas = { relire: { max: 1000, fenetreMs: 3600000 }, paiement: { max: 1000, fenetreMs: 3600000 }, portail: { max: 1000, fenetreMs: 3600000 }, reunion: { max: 1000, fenetreMs: 3600000 } };
  const facturation = (perso) => Object.assign({ cle: CLE, prix: PRIX_PRO, relectureMs: 3600000, timeoutMs: 3000 }, perso ? { perso: { prix: PRIX_PP } } : {});
  const env = { OPMSG_TEST_STRIPE: fake.hote };
  /* un service à la formule de PRODUCTION avec les tarifs Perso+, et un autre SANS (Messages Pro ouvert, Perso+ inerte) */
  const svc = await T.lancerService({ urlGestion: og.url, config: { formule: { toutOuvert: false }, facturation: facturation(true), quotas }, env });
  const svcI = await T.lancerService({ urlGestion: og.url, config: { formule: { toutOuvert: false }, facturation: facturation(false), quotas }, env });
  const sources = [];
  const bases = [];

  function monter(s, opts) {
    const o = opts || {};
    const nav = T.navigateur(s.base);
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
    const reseau = { requetes: [] };
    const f = async (url, init) => {
      const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(s.base, '').split('?')[0];
      reseau.requetes.push({ m, chemin, corps: init && typeof init.body === 'string' ? init.body : null });
      const a = o.reecrire && o.reecrire(m, chemin);
      if (a) return new Response(JSON.stringify(a.corps), { status: a.statut || 200, headers: { 'Content-Type': 'application/json' } });
      return nav.fetch(url, init);
    };
    const src = creerSourceServeur({ OPMSG, base: s.base, fetch: f, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
    const evs = [];
    src.ecouter(e => evs.push(e));
    sources.push(src);
    return { src, evs, reseau,
      async entrer(login) { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); return src.moi(); },
      attendreEv: (pred) => att(() => evs.some(pred)), vider: () => { evs.length = 0; } };
  }
  /* la base du service, ouverte à côté (WAL) : des personnes, des contacts et un espace Pro fabriqués */
  function base(s) {
    const S = ouvrir({ chemin: path.join(s.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(s.cle, 'hex')), horloge: Date.now });
    bases.push(S);
    let k = 0;
    const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
    const espacePro = (p) => { const e = S.espaceCreer({ nom: 'Pro ' + crypto.randomBytes(2).toString('hex'), proprio: p.id }).id; S.abonnementPoser(e, { client: 'cus_b994' + e.slice(2, 8), abonnement: 'sub_b994' + e.slice(2, 10), statut: 'active', places: 5, fin_periode: null, annule: false, impaye: false }, { adopter: true }); return e; };
    return { S, pers, espacePro };
  }
  const postes = (re) => fake.appels.filter(a => a.m === 'POST' && re.test(a.chemin)).length;
  const corpsR = (o) => Object.assign({ titre: 'Point ' + crypto.randomBytes(2).toString('hex'), debut: '2026-12-08T14:00', fin: '2026-12-08T15:00', tz: 'Europe/Paris' }, o || {});

  try {
    const B = base(svc), BI = base(svcI);
    const A = monter(svc), Bo = monter(svc), C = monter(svc), D = monter(svc), I = monter(svcI);
    const alice = await A.entrer('alice'), bob = await Bo.entrer('bob'), cleo = await C.entrer('cleo'), dan = await D.entrer('dan'), ida = await I.entrer('alice');

    /* ═══ 1. LE CONTRAT ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Le contrat : les capacités `persoPlus` et `reunionPlafond`, les méthodes de la page, la formule `perso_plus`');
    {
      v('le module annonce les capacités `persoPlus` et `reunionPlafond`', [A.src.capacites.persoPlus, A.src.capacites.reunionPlafond], [true, true]);
      v('chaque méthode que la page appelle existe', METHODES.filter(k => typeof A.src[k] !== 'function'), []);
      vrai('population : quatre personnes sont entrées par le module, sur le service à tarifs Perso+, et une sur le service sans', new Set([alice.id, bob.id, cleo.id, dan.id]).size === 4 && !!ida.id);
      v('`ErreurApi` porte `offre` et `abonnementOuvert` : un refus d\'abonnement lu du corps du service', (() => { const e = new OPMSG.ErreurApi('formule_requise', 402, 0, { raison: 'organisateur', offre: 'perso_plus', abonnement_ouvert: true }); return [e.offre, e.raison, e.abonnementOuvert]; })(), ['perso_plus', 'organisateur', true]);
      v('⛔ … et un champ qui n\'a pas la forme attendue n\'existe pas : une offre inconnue ou une raison inventée ne sont pas rendues', (() => { const e = new OPMSG.ErreurApi('formule_requise', 402, 0, { raison: 'gratuit_pour_tous', offre: 'tout_gratuit', abonnement_ouvert: 'oui' }); return [e.offre, e.raison, e.abonnementOuvert]; })(), ['', '', false]);
    }

    /* — les trois raisons d'un refus d'organiser se DISENT, chacune par sa phrase, sans prix ni « Pro » — */
    {
      const dit = (raison) => new OPMSG.ErreurApi('formule_requise', 402, 0, { raison, offre: 'perso_plus', abonnement_ouvert: true }).phrase();
      v('⛔ un paiement en retard se dit (« Ton paiement n\'est pas passé »), un outil d\'organisateur dans un appel gratuit aussi (« réservé aux réunions »), sans prix ni « Pro » — et rejoindre reste gratuit',
        [dit('impaye'), dit('organisateur'), [dit('perso'), dit('impaye'), dit('organisateur')].some(t => /\d\s*€|euro|\bPro\b/i.test(t))],
        ['Ton paiement n\'est pas passé : mets ta carte à jour (Réglages › Abonnement) pour organiser des réunions. Rejoindre une réunion où tu es invité reste gratuit.', 'Cet outil est réservé aux réunions : l\'organisateur de cet appel n\'a pas de forfait pour les organiser.', false]);
    }

    /* ═══ 2. L'ÉTAT, SANS RÉSEAU ══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nL\'état du forfait : le nom et les prix viennent du service, la personne est celle de la session');
    {
      const e = await A.src.persoPlus();
      v('⛔ Alice, sans abonnement : Perso, ne peut pas organiser, le service est OUVERT (mode test), le NOM et les PRIX viennent de lui — 5 € par mois, 50 € par an, mensuel par défaut',
        [e.nom, e.ouvert, e.mode, e.formule, e.organiser, e.inclusParPro, e.abonnement, e.impaye, e.paiementEnAttente, e.defaut, e.offres], ['Perso+', true, 'test', 'perso', false, false, null, false, false, 'mensuel', [{ id: 'mensuel', par: 'mois', euros: 5 }, { id: 'annuel', par: 'an', euros: 50 }]]);
      const aucun = A.reseau.requetes.filter(r => /perso-plus/.test(r.chemin));
      v('… une seule lecture, `GET /api/moi/perso-plus`, SANS identifiant de personne dans l\'adresse ni dans le corps', [aucun.length, aucun[0].m, aucun[0].chemin, aucun[0].corps], [1, 'GET', '/api/moi/perso-plus', null]);
      const esp = await A.src.espaces();
      v('`espaces()` dit si la personne peut organiser (Perso : non) et sa formule', [esp.formule, esp.organiser, esp.espaces.length], ['perso', false, 0]);
      const inerte = await I.src.persoPlus();
      v('⛔ sur un service SANS tarifs Perso+ (Messages Pro ouvert) : le forfait est INERTE et le dit — `ouvert: false`, aucune offre, aucun mode inventé', [inerte.ouvert, inerte.offres, inerte.formule, inerte.defaut], [false, [], 'perso', '']);
      const e2 = await A.src.persoPlus();
      v('population : le nom du forfait n\'est écrit nulle part dans la page — le module le rend tel que le service l\'a dit', e2.nom, 'Perso+');
    }

    /* ═══ 3. ORGANISER SE PAIE : LE REFUS SE DIT ══════════════════════════════════════════════════════════════════ */
    console.log('\nProgrammer une réunion avec le forfait Perso : le refus est dit en français, il propose le bon forfait et ne ment sur rien');
    {
      const n0 = postes(/checkout\/sessions$/);
      const er = await attrape(A.src.programmer(corpsR()));
      v('⛔ Alice (Perso) programme : refusé — `formule_requise`, l\'offre « perso_plus », la raison « perso », le bouton « S\'abonner » mènerait quelque part (le service est ouvert)', [codeDe(er), er && er.offre, er && er.raison, er && er.abonnementOuvert], ['formule_requise', 'perso_plus', 'perso', true]);
      v('⛔ … la PHRASE promet ce que le service tient (rejoindre reste gratuit), n\'écrit aucun prix, ne dit « Pro » ni « fonction Pro » nulle part', [phrase(er), /\d\s*€|euro|Pro\b/i.test(phrase(er))], ['Les réunions s\'organisent avec un forfait (Réglages › Abonnement). Rejoindre une réunion où tu es invité reste gratuit.', false]);
      v('population : le refus n\'a rien ouvert chez Stripe (aucune session) ni rien écrit (l\'agenda d\'Alice est vide)', [postes(/checkout\/sessions$/) - n0, (await A.src.reunions(Date.parse('2026-12-01T00:00:00Z'), Date.parse('2026-12-20T00:00:00Z'))).length], [0, 0]);
      const iner = await attrape(I.src.programmer(corpsR()));
      v('⛔ sur le service SANS tarifs Perso+ : le refus ne propose AUCUN bouton mort — `abonnementOuvert` est faux (la page dit seulement que ce n\'est pas ouvert)', [codeDe(iner), iner && iner.offre, iner && iner.abonnementOuvert], ['formule_requise', 'perso_plus', false]);
    }

    /* ═══ 4. PAYER, RELIRE, ORGANISER ═════════════════════════════════════════════════════════════════════════════ */
    console.log('\nPayer : l\'adresse de Stripe (https seulement), « J\'ai réglé — vérifier », puis la personne organise');
    {
      const n0 = postes(/checkout\/sessions$/);
      const r = await A.src.persoPlusPayer('annuel');
      const sess = fake.derniereSession();
      v('⛔ payer en ANNUEL : une adresse https de Stripe, une session ouverte (UNE), au tarif annuel de la configuration, un siège, la référence désigne ALICE (la session)',
        [/^https:\/\//.test(r.url), r.reprise, postes(/checkout\/sessions$/) - n0, (sess.paires.find(x => x[0] === 'line_items[0][price]') || [])[1], (sess.paires.find(x => x[0] === 'line_items[0][quantity]') || [])[1], (sess.paires.find(x => x[0] === 'client_reference_id') || [])[1]],
        [true, false, 1, PRIX_PP.annuel, '1', 'opmsg-perso:' + alice.id]);
      const avant = await A.src.persoPlus();
      v('… et la personne n\'est pas encore abonnée : payer COMMENCE chez Stripe (état « paiement en attente », formule Perso)', [avant.formule, avant.organiser, avant.paiementEnAttente], ['perso', false, true]);
      const sb = fake.payer(sess.id);
      A.vider();
      const apres = await A.src.persoPlusRelire();
      v('⛔ « J\'ai réglé — vérifier » : relu chez Stripe, la personne est PERSO+ — peut organiser, l\'abonnement est actif, plus de paiement en attente', [apres.formule, apres.organiser, apres.abonnement && apres.abonnement.statut, apres.abonnement && apres.abonnement.annule, apres.paiementEnAttente, sb.status], ['perso_plus', true, 'active', false, false, 'active']);
      vrai('… la page est PRÉVENUE (événement `espaces`) : son état est relu sans recharger', !!(await A.attendreEv(e => e.type === 'espaces')));
      const esp = await A.src.espaces();
      v('`espaces()` dit « perso_plus » et « peut organiser » — la formule est connue du module (jamais lue « pro »)', [esp.formule, esp.organiser], ['perso_plus', true]);
      const prog = await A.src.programmer(corpsR({ titre: 'Réunion payée' }));
      v('⛔ Alice (Perso+) programme : la réunion est créée (identifiant et conversation)', [/^r_[0-9a-f]{32}$/.test(prog.id), /^c_[0-9a-f]{32}$/.test(prog.conv)], [true, true]);
      const por = await A.src.persoPlusPortail();
      v('le portail de facturation : une adresse https de Stripe', /^https:\/\//.test(por.url), true);
      const dejaPaye = await attrape(A.src.persoPlusPayer('mensuel'));
      v('⛔ un abonnement existe : payer de nouveau est refusé (`abonnement_existant`) AVEC le lien du portail — jamais un second prélèvement', [codeDe(dejaPaye), /^https:\/\//.test(dejaPaye && dejaPaye.portail || '')], ['abonnement_existant', true]);
      const sansAbo = await attrape(Bo.src.persoPlusPortail());
      v('sans paiement fait : le portail est refusé (`pas_d_abonnement`)', codeDe(sansAbo), 'pas_d_abonnement');
    }

    /* ═══ 5. UNE ADRESSE QUI N'EST PAS EN HTTPS N'EST JAMAIS RENDUE ═══════════════════════════════════════════════════ */
    console.log('\nUne adresse de paiement qui n\'est pas en https n\'est jamais suivie');
    {
      const piege = monter(svc, { reecrire: (m, chemin) => (m === 'POST' && chemin === '/api/moi/perso-plus/paiement') ? { statut: 201, corps: { url: 'javascript:alert(1)' } } : (m === 'POST' && chemin === '/api/moi/perso-plus/portail') ? { statut: 200, corps: { url: 'http://billing.exemple.invalid/p' } } : null });
      await piege.entrer('cleo');
      const e1 = await attrape(piege.src.persoPlusPayer('mensuel')), e2 = await attrape(piege.src.persoPlusPortail());
      v('⛔ un service (ou un intermédiaire) qui répondrait `javascript:` ou `http:` : le module refuse (`reponse_illisible`), la page n\'ouvre rien', [codeDe(e1), codeDe(e2)], ['reponse_illisible', 'reponse_illisible']);
    }

    /* ═══ 6. UN ESPACE DÉJÀ PRO N'ACHÈTE PAS UN FORFAIT DE PERSONNE ═══════════════════════════════════════════════ */
    console.log('\nLe propriétaire d\'un espace Pro : les réunions sont déjà comprises, un forfait de personne ne lui apporterait rien');
    {
      B.espacePro({ id: dan.id });
      const e = await D.src.persoPlus();
      v('⛔ Dan, propriétaire d\'un espace Pro PAYÉ : `inclusParPro`, il organise — la page n\'a aucun prix à lui montrer', [e.inclusParPro, e.organiser, e.formule], [true, true, 'pro']);
      const n0 = postes(/checkout\/sessions$/);
      const er = await attrape(D.src.persoPlusPayer('mensuel'));
      v('… et payer Perso+ est refusé (`formule_deja_incluse`), avec sa phrase, sans rien ouvrir chez Stripe', [codeDe(er), phrase(er), postes(/checkout\/sessions$/) - n0], ['formule_deja_incluse', 'Ton espace est déjà en Messages Pro, qui comprend les réunions : un forfait personnel ne t\'apporterait rien de plus.', 0]);
      const p = await D.src.programmer(corpsR({ titre: 'Réunion Pro' }));
      v('… et il programme (Pro comprend les réunions)', /^r_[0-9a-f]{32}$/.test(p.id), true);
    }

    /* ═══ 7. LE PLAFOND DE DIX PERSONNES ══════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne réunion compte au plus dix personnes : la page le LIT chez le service, la onzième est refusée avec une phrase qui nomme le plafond');
    {
      v('`plafondReunion()` : le chiffre du service (dix) — la page ne l\'écrit nulle part', await A.src.plafondReunion(), 10);
      const nCfg = () => A.reseau.requetes.filter(r => r.m === 'GET' && r.chemin === '/api/config').length, c0 = nCfg();
      await A.src.plafondReunion();
      v('… lu UNE fois : une seconde demande ne retourne pas au service (`GET /api/config` n\'est pas redemandé)', nCfg() - c0, 0);
      const foule = []; for (let i = 0; i < 11; i++) { const p = B.pers('Foule'); foule.push(p); B.S.contactLier(alice.id, p.id); }
      const onze = await attrape(A.src.programmer(corpsR({ titre: 'Onze', invites: foule.slice(0, 10).map(p => p.id) })));
      v('⛔ Alice (Perso+) invite DIX personnes : avec elle, c\'est la onzième — refus `reunion_pleine`, le plafond (10) est LU du corps du service et dit dans la phrase', [codeDe(onze), onze && onze.max, phrase(onze)], ['reunion_pleine', 10, 'Une réunion compte 10 personnes au plus, organisateur compris : celle-ci est complète.']);
      const dix = await A.src.programmer(corpsR({ titre: 'Dix', invites: foule.slice(0, 9).map(p => p.id) }));
      const fiche = await A.src.reunion(dix.id);
      v('contre-épreuve : NEUF invités + l\'organisatrice = dix personnes passent — la fiche porte son plafond (10) et ses dix participants', [fiche.plafond, fiche.invites.length], [10, 10]);
      const plus = await attrape(A.src.inviterReunion(dix.id, [foule[9].id]));
      v('⛔ inviter une personne de plus sur une réunion complète : `reunion_pleine`, la même phrase, la fiche garde ses dix', [codeDe(plus), plus && plus.max, (await A.src.reunion(dix.id)).invites.length], ['reunion_pleine', 10, 10]);
      /* un service qui ne dit pas son plafond (un service d'avant) : la page ne bloque rien */
      const ancien = monter(svc, { reecrire: (m, chemin) => (m === 'GET' && chemin === '/api/config') ? { statut: 200, corps: { version: 'ancienne', instance: 'beta', limites: { pieces: {} } } } : null });
      await ancien.entrer('bob');
      v('⛔ un service qui ne dit pas son plafond (un service d\'avant) : `plafondReunion()` rend `null` — la page ne bloque rien et laisse le service répondre', await ancien.src.plafondReunion(), null);
      const panne = monter(svc, { reecrire: (m, chemin) => (m === 'GET' && chemin === '/api/config') ? { statut: 500, corps: { error: 'panne' } } : null });
      await panne.entrer('bob');
      const nP = () => panne.reseau.requetes.filter(r => r.m === 'GET' && r.chemin === '/api/config').length;
      const p1 = await panne.src.plafondReunion(), apres1 = nP(), p2 = await panne.src.plafondReunion();
      v('… une panne de la lecture : `null` aussi, et ELLE N\'EST PAS GARDÉE (la lecture suivante retourne voir le service : au moins une demande de plus)', [p1, p2, nP() > apres1], [null, null, true]);
    }

    /* ═══ 6. SUPPRIMER SON COMPTE AVEC UN ABONNEMENT PERSO+ ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nSupprimer son compte avec un abonnement Perso+ : la demande arrête le renouvellement, se reconnecter le rétablit, la feuille le dit en une phrase');
    {
      const E = monter(svc), erin = await E.entrer('erin');
      await E.src.persoPlusPayer('mensuel');
      const sbE = fake.payer(fake.derniereSession().id);
      const rel = await E.src.persoPlusRelire();
      const mods = () => fake.modifications.filter(m => m.id === sbE.id).map(m => m.cancel_at_period_end);
      v('population : Erin est Perso+, son abonnement se renouvelle chez Stripe', [rel.formule, rel.abonnement && rel.abonnement.annule, sbE.cancel_at_period_end, mods()], ['perso_plus', false, false, []]);
      const dem = await E.src.supprimerCompte();
      const arret = await att(() => fake.abonnements.get(sbE.id).cancel_at_period_end === true);
      v('⛔ `supprimerCompte()` (la méthode que la feuille appelle) : l\'échéance est dite, ET le renouvellement est arrêté chez Stripe — l\'abonnement reste actif, rien n\'est résilié',
        [Number.isSafeInteger(dem.suppression_le) && dem.suppression_le > Date.now(), arret, mods(), fake.abonnements.get(sbE.id).status, fake.resiliations.includes(sbE.id)], [true, true, [true], 'active', false]);
      const E2 = monter(svc);
      const retour = await E2.src.connexion('erin', MDP.erin);
      const retabli = await att(() => fake.abonnements.get(sbE.id).cancel_at_period_end === false);
      v('⛔ `connexion()` avant l\'échéance : la personne rendue DIT que la suppression est annulée (`suppression_annulee`), ET le renouvellement revient chez Stripe — deux changements en tout',
        [retour && retour.suppression_annulee === true, retabli, mods(), fake.resiliations.includes(sbE.id)], [true, true, [true, false], false]);
      /* la feuille : une phrase, lue dans le CODE de la page (le DOM se joue dans la sonde) — aucune consigne de résilier soi-même, aucune date de résiliation promise */
      const code = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'public', 'opmsg-ui.js'), 'utf8'));
      const debut = code.indexOf('async function rendreSuppression'), finF = code.indexOf("$('info-corps').addEventListener('change'", debut);
      const feuille = debut > 0 && finF > debut ? code.slice(debut, finF) : '';
      vrai('population : la fonction qui peint la feuille « Supprimer mon compte » est trouvée dans le code servi (une tranche vide passerait au vert sur tout)', feuille.length > 1500);
      vrai('⛔ la section « Ton abonnement » de la feuille n\'existe que pour un abonnement qui VIT, dit « ne sera plus renouvelé » avec le NOM venu du service, et ne renvoie plus au portail ni ne promet une résiliation à l\'effacement',
        /CAP\.persoPlus && pp\.etat && vivantPP\(pp\.etat\)\s*\?/.test(feuille) && /Ton abonnement ' \+ esc\(pp\.etat\.nom\) \+ ' ne sera plus renouvelé\./.test(feuille) && !/Gérer mon abonnement|résilie-le|est résilié chez Stripe/.test(feuille));
    }
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêté */ } }
    for (const S of bases) { try { S.fermer(); } catch (e) { /* déjà fermé */ } }
    await svc.arreter(); await svcI.arreter(); await fake.fermer(); await og.fermer();
  }
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; process.exit(1); });
