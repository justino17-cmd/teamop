/* ⛔ CE QUE CE FICHIER GARDE — MESSAGES PRO CONTRE UN FAUX STRIPE : LE CORPS NE DÉCIDE JAMAIS DE CE QUI A ÉTÉ PAYÉ, ET UNE PANNE NE SUSPEND PERSONNE (famille 3 de SERVEUR.md § 3.11, étape 5, § 3.8).

   Le VRAI service (`server-msg/index.js`, clé de test, formule de production : ce qui n'est pas payé est refusé) parle en HTTP à un FAUX Stripe en boucle locale (`tests/outils-stripe.js`) qui
   reconstruit ce que Stripe ferait : une session de paiement « payée » fait naître l'abonnement que le service a DEMANDÉ (métadonnées, tarif, quantité, adresse). Ce qu'on garde ici :

     · ⛔ LE CORPS NE DÉCIDE JAMAIS : le tarif vient de la configuration (liste blanche), l'espace du chemin, l'adresse de la session, les places d'un nombre borné ; un corps qui nomme un autre tarif,
       un autre espace, une autre adresse, un autre mode, une autre adresse de retour n'est PAS ce qui part chez Stripe ; une autre origine est refusée avant même d'arriver ;
     · ⛔ LE VERDICT EST TOUJOURS RELU CHEZ STRIPE (au retour, par « J'ai réglé — vérifier », toutes les dix minutes) : payé = `active` ou `trialing`, rien d'autre ; un abonnement n'est celui d'un espace
       que si la session que NOUS avons ouverte le désigne, que sa métadonnée dit CET espace et que ses lignes sont NOS tarifs ; les places sont la quantité de NOS lignes ;
     · ⛔ UN SEUL ABONNEMENT VIVANT PAR ESPACE : en payer un second serait un second prélèvement — 409 avec le lien du portail ; une session encore ouverte est réutilisée ;
     · ⛔ UNE PANNE NE SUSPEND PERSONNE : Stripe muet, clé refusée, trop de demandes, réponse illisible — le dernier état connu sert, `stripeEchecMin` monte, rien n'est décidé sur une lecture ratée ;
     · la clé n'apparaît nulle part : ni /health, ni une réponse, ni le journal, ni le disque — même quand Stripe la répète dans un message d'erreur ;
     · inerte sans clé, et il le dit (test-961) ; ici : les plafonds du paiement, du portail et de la relecture.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque refus est précédé de la population qu'il aurait pu compter (les appels REÇUS par le faux Stripe). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { creerFacturation } = require(path.join(T.SERVICE, 'facturation.js'));
const { creerFormule } = require(path.join(T.SERVICE, 'formule.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const JOUR = 86400000;
/* Des valeurs de banc : des lettres hors de [0-9a-f], aucune ne ressemble à une clé réelle ni ne partage ses huit premiers ou derniers caractères avec un texte du service */
const CLE = ['rk', 'test', 'BancStripeZzQq9X'].join('_');
const PRIX = { mensuel: 'price_BancMensuelAaZz01', annuel: 'price_BancAnnuelBbYy02' };
const AUTRE_PRIX = 'price_ToutAutreProduitQq77';

(async () => {
  const fake = await fauxStripe({ prix: Object.values(PRIX).concat([AUTRE_PRIX]) });
  const svc = await T.lancerService({ config: { formule: { toutOuvert: false }, facturation: { cle: CLE, prix: PRIX, affichage: { mensuel: 15, annuel: 150 }, relectureMs: 3600000, timeoutMs: 3000 }, quotas: { relire: { max: 1000, fenetreMs: 10000 }, paiement: { max: 1000, fenetreMs: 3600000 } } }, env: { OPMSG_TEST_STRIPE: fake.hote } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  const raw = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  let k = 0;
  const pers = (nom, o) => S.personneCreer(Object.assign({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true }, o || {}));
  const vus = [];       // tout ce que le service a RÉPONDU à ce banc : on y cherche la clé, les tarifs, les identifiants de Stripe
  const cl = (p) => {
    const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 86400000 }); c.poserCookie(j); c.moi = p;
    const g = c.get, po = c.post;
    c.get = async (...x) => { const r = await g(...x); vus.push(r.txt); return r; };
    c.post = async (...x) => { const r = await po(...x); vus.push(r.txt); return r; };
    return c;
  };
  const entrer = (espace, par, uid) => { const code = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code), genre: 'espace', cible: espace, par, ttlMs: JOUR, max: 5 }); return S.invitationAccepter({ h: sha(code), uid, max: Infinity }); };
  const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan');
  const bob = pers('Bob', { identifiant: 'bob@exemple-banc.fr', origine: 'compte' }), eli = pers('Eli', { identifiant: 'eli@exemple-banc.fr', origine: 'compte' });
  const a = cl(ana), b = cl(ben), c = cl(cleo), d = cl(dan), bo = cl(bob), el = cl(eli);
  const E0 = S.espaceCreer({ nom: 'Entreprise Zéro', proprio: ana.id }).id; entrer(E0, ana.id, ben.id); entrer(E0, ana.id, cleo.id);
  const E1 = S.espaceCreer({ nom: 'Entreprise Un', proprio: bob.id }).id;
  const etat = async (cli, id) => (await cli.get('/api/espaces/' + id + '/facturation/etat'));
  const form = (appel) => Object.fromEntries(appel.paires);
  const relire = (cli, id) => cli.post('/api/espaces/' + id + '/facturation/relire', {});
  const payer = (cli, id, corps, extra) => cli.post('/api/espaces/' + id + '/facturation/paiement', corps, extra);
  const nouvelles = (avant) => fake.appels.slice(avant);

  try {
    /* ═══ 1. LES OFFRES ET L'ÉTAT : sans réseau, sans identifiant de tarif ════════════════════════════════════════════════════════════════════════ */
    console.log('Les offres et l\'état : lus sans réseau, sans clé, sans identifiant de tarif ni de client');
    {
      const o = await a.get('/api/facturation/offres');
      v('les offres : ouvert, en mode test, 15 € par mois ou 150 € par an, de 1 à 500 places — AUCUN identifiant de tarif, aucune clé', [o.code, o.j.ouvert, o.j.mode, o.j.places, o.j.defaut, o.j.offres, /price_|rk_|sk_/.test(o.txt)],
        [200, true, 'test', { min: 1, max: 500 }, 'mensuel', [{ id: 'mensuel', libelle: 'Messages Pro', par: 'mois', euros_par_place: 15 }, { id: 'annuel', libelle: 'Messages Pro', par: 'an', euros_par_place: 150 }], false]);
      const pub = await T.client(svc.base).get('/api/facturation/offres');
      v('les offres sont PUBLIQUES (garde P : le prix d\'un abonnement n\'est pas un secret) et ne disent toujours ni tarif ni clé', [pub.code, pub.j.ouvert, /price_|rk_|sk_/.test(pub.txt)], [200, true, false]);
      const avant = fake.appels.length;
      const e0 = await etat(a, E0);
      v('⛔ l\'état d\'un espace jamais abonné se lit SANS réseau : Perso, trois membres, aucune place, aucun paiement en attente', [e0.code, e0.j.ouvert, e0.j.mode, e0.j.abonnement, e0.j.formule, e0.j.places, e0.j.membres, e0.j.paiement_en_attente, e0.j.stripe_muet, fake.appels.length - avant], [200, true, 'test', null, 'perso', 0, 3, false, false, 0]);
      const h = (await T.client(svc.base).get('/health')).j;
      v('/health : le mode est « test », Stripe n\'est pas muet', [h.facturation.mode, h.stripeEchecMin], ['test', 0]);
    }

    /* ═══ 2. PAYER : le corps ne décide de rien ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nPayer : le corps ne décide ni du tarif, ni de l\'espace, ni de l\'adresse, ni du mode, ni de l\'adresse de retour');
    let sess0 = null;
    {
      const mal = [{ places: 0 }, { places: 2 }, { places: 501 }, { places: '3' }, { places: 3.5 }, { places: null }, {}, { places: -4 }, { places: 1e9 }];
      const avant = fake.appels.length;
      const rep = await Promise.all(mal.map(x => payer(a, E0, x)));
      v('⛔ un nombre de places invalide est refusé (400 `places_invalides`, avec le minimum = le nombre de membres : 3, et le maximum 500) — avant tout appel à Stripe', [rep.map(x => x.code), rep.map(x => x.j.error), rep[0].j.min, rep[0].j.max, fake.appels.length - avant], [Array(9).fill(400), Array(9).fill('places_invalides'), 3, 500, 0]);
      v('un tarif inconnu : 400 `offre_inconnue` (« mensuel » et « annuel » seulement)', [(await payer(a, E0, { places: 3, cycle: 'hebdomadaire' })).j.error, (await payer(a, E0, { places: 3, cycle: 7 })).j.error, (await payer(a, E0, { places: 3, cycle: ['mensuel'] })).j.error, fake.appels.length - avant], ['offre_inconnue', 'offre_inconnue', 'offre_inconnue', 0]);
      v('⛔ payer est réservé au PROPRIÉTAIRE de l\'espace : un membre simple (403) et un étranger (404) n\'atteignent jamais Stripe', [(await payer(b, E0, { places: 3 })).code, (await payer(d, E0, { places: 3 })).code, fake.appels.length - avant], [403, 404, 0]);
      /* LE CORPS FORGÉ */
      const forge = { places: 3, price: AUTRE_PRIX, prix: AUTRE_PRIX, tarif: AUTRE_PRIX, 'line_items[0][price]': AUTRE_PRIX, espace: E1, client_reference_id: 'opmsg:' + E1, customer_email: 'pirate@exemple.fr', mode: 'payment',
        success_url: 'https://pirate.example/gagne', cancel_url: 'https://pirate.example/perdu', metadata: { opmsg_espace: E1, produit: 'autre' }, subscription_data: { trial_period_days: 365 }, trial_period_days: 365, amount: 1, currency: 'eur', coupon: 'GRATUIT', allow_promotion_codes: true };
      const p0 = fake.appels.length;
      const r = await payer(a, E0, forge);
      const ap = nouvelles(p0).filter(x => x.m === 'POST' && x.chemin === '/v1/checkout/sessions');
      v('population : le service a appelé Stripe UNE fois pour créer la session', [r.code, ap.length], [201, 1]);
      const F = form(ap[0]);
      v('⛔ ce qui part chez Stripe : le TARIF de la configuration, l\'ESPACE du chemin, le mode « subscription », la quantité demandée — rien du corps forgé', [F['line_items[0][price]'], F['line_items[0][quantity]'], F.client_reference_id, F.mode, F['metadata[opmsg_espace]'], F['metadata[produit]'], F['subscription_data[metadata][opmsg_espace]'], F['subscription_data[metadata][produit]']], [PRIX.mensuel, '3', 'opmsg:' + E0, 'subscription', E0, 'opmsg', E0, 'opmsg']);
      v('⛔ JAMAIS la métadonnée `espace` (celle qu\'OP GESTION lit pour rattacher un abonnement à une entreprise), ni sur la session ni sur l\'abonnement : la nôtre s\'appelle `opmsg_espace` (population : la demande porte ses métadonnées)', [Object.keys(F).filter(k => /metadata/.test(k)).length, Object.keys(F).filter(k => /\[espace\]$/.test(k))], [4, []]);
      v('⛔ pas d\'adresse (un accès bêta n\'en a pas de confirmée), pas d\'essai, pas de coupon, pas de montant : le corps n\'a rien ajouté', [F.customer_email === undefined, ap[0].paires.map(x => x[0]).filter(x => /trial|coupon|promotion|amount|currency|discount/i.test(x)), ap[0].corps.includes('pirate') || ap[0].corps.includes(AUTRE_PRIX) || ap[0].corps.includes(E1)], [true, [], false]);
      v('⛔ les adresses de retour sont celles de LA PAGE (l\'origine de la requête, vérifiée par le service), jamais celles du corps', [F.success_url, F.cancel_url, F.locale], [svc.base + '/?abo=retour&e=' + E0 + '#reglages', svc.base + '/?abo=annule&e=' + E0 + '#reglages', 'fr']);
      v('la clé part en `Authorization: Bearer`, le corps en formulaire — et la clé n\'est PAS dans le corps', [ap[0].auth, /x-www-form-urlencoded/.test(ap[0].type), ap[0].corps.includes(CLE)], ['Bearer ' + CLE, true, false]);
      v('la réponse à la page : l\'adresse de la page de paiement de Stripe, rien d\'autre', [Object.keys(r.j), /^https:\/\/checkout\.stripe\.test\/c\/pay\/cs_banc/.test(r.j.url)], [['url'], true]);
      sess0 = fake.derniereSession();
      const e0 = (await etat(a, E0)).j;
      v('l\'espace attend un paiement (une session ouverte rangée), sans être abonné ni Pro', [e0.paiement_en_attente, e0.abonnement, e0.formule], [true, null, 'perso']);
      /* une session ouverte est RÉUTILISÉE */
      const p1 = fake.appels.length;
      const r2 = await payer(a, E0, { places: 4 });
      v('⛔ un clic de plus ne fait pas une seconde session : la même adresse est rendue (`reprise`), Stripe n\'est interrogé que pour la session existante', [r2.code, r2.j.url === r.j.url, r2.j.reprise, nouvelles(p1).filter(x => x.m === 'POST').length, fake.sessions.size], [201, true, true, 0, 1]);
      /* la ligne de l'adresse confirmée : l'adresse de la SESSION de la personne, jamais celle du corps */
      const rb = await payer(bo, E1, { places: 1, customer_email: 'pirate@exemple.fr' });
      const fb = form(fake.appels.slice().reverse().find(x => x.m === 'POST' && x.chemin === '/v1/checkout/sessions'));
      v('⛔ une personne dont l\'adresse est CONFIRMÉE : c\'est SON adresse qui part (`customer_email`), pas celle du corps', [rb.code, fb.customer_email, fb.client_reference_id], [201, 'bob@exemple-banc.fr', 'opmsg:' + E1]);
      /* le tarif annuel se choisit par son NOM, jamais par son identifiant */
      const E5 = S.espaceCreer({ nom: 'Annuelle', proprio: ana.id }).id;
      const ra = await payer(a, E5, { places: 2, cycle: 'annuel' });
      v('le rythme « annuel » est choisi par son nom : le tarif annuel de la configuration part', [ra.code, form(fake.appels.slice().reverse().find(x => x.m === 'POST' && x.chemin === '/v1/checkout/sessions'))['line_items[0][price]']], [201, PRIX.annuel]);
      /* ⛔ le rythme se cherche parmi les tarifs de la CONFIGURATION seulement (relecture du gardien : « constructor » ou « __proto__ » trouvaient une propriété héritée et partaient chez Stripe) */
      const pP = fake.appels.length, proto = [];
      for (const cycle of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf', '', 'MENSUEL', null, 42, ['mensuel']]) proto.push((await payer(a, E5, { places: 2, cycle })).j.error);
      v('⛔ un rythme qui n\'est pas « mensuel » ou « annuel » est refusé (400 `offre_inconnue`) — y compris les noms que tout objet hérite (`constructor`, `__proto__`, `toString`) — et AUCUNE session ne part chez Stripe', [proto, fake.appels.slice(pP).filter(x => x.m === 'POST').length], [Array(10).fill('offre_inconnue'), 0]);     // (les lectures de la passe de fond ne comptent pas : seul un POST aurait porté un tarif)
      /* une autre origine : refusée avant d'arriver */
      const p2 = fake.appels.length;
      const ori = await payer(a, E5, { places: 2 }, { origin: 'https://pirate.example' });
      v('⛔ une page d\'un AUTRE site ne déclenche aucun paiement : 403 avant même la route, Stripe n\'est pas appelé', [ori.code, fake.appels.slice(p2).filter(x => x.m === 'POST').length], [403, 0]);     // (POST seulement : la première passe de fond, cinq secondes après le démarrage, lit déjà les sessions rangées)
    }

    /* ═══ 3. LE RETOUR : le verdict est relu chez Stripe, l'abonnement est celui que la SESSION désigne ═══════════════════════════════════════════════ */
    console.log('\nLe retour : le verdict est relu chez Stripe — payé = `active` ou `trialing`, rien d\'autre');
    let sb0 = null;
    {
      const p0 = fake.appels.length;
      const r0 = await relire(a, E0);
      v('« J\'ai réglé — vérifier » AVANT le paiement : Stripe dit « session ouverte », rien ne change (toujours Perso, toujours en attente)', [r0.code, r0.j.formule, r0.j.paiement_en_attente, nouvelles(p0).map(x => x.m + ' ' + x.chemin.replace(/cs_\w+/, 'cs_x'))], [200, 'perso', true, ['GET /v1/checkout/sessions/cs_x']]);
      sb0 = fake.payer(sess0.id, { statut: 'active' });
      const p1 = fake.appels.length;
      const r1 = await relire(a, E0);
      v('⛔ après le paiement : la relecture lit la session, puis l\'abonnement qu\'elle désigne — l\'espace est Pro avec ses 3 places, payé jusqu\'à l\'échéance', [r1.code, r1.j.formule, r1.j.motif, r1.j.places, r1.j.abonnement.statut, r1.j.abonnement.places, r1.j.paiement_en_attente, Math.abs(r1.j.abonnement.fin_periode - (Date.now() + 30 * JOUR)) < 3600000, nouvelles(p1).map(x => x.m + ' ' + x.chemin.replace(/(cs|sub)_\w+/, '$1_x'))],
        [200, 'pro', 'abonne', 3, 'active', 3, false, true, ['GET /v1/checkout/sessions/cs_x', 'GET /v1/subscriptions/sub_x']]);
      v('… les fonctions Pro marchent : Ana crée un canal et un lien d\'invitation (les places sont prises : 402 `places_epuisees`)', [(await a.post('/api/espaces/' + E0 + '/canaux', { nom: 'payé' })).code, (await a.post('/api/espaces/' + E0 + '/invitations', {})).j.error], [201, 'places_epuisees']);
      v('⛔ l\'abonnement que NOTRE service a fait naître porte la métadonnée `opmsg_espace` et JAMAIS `espace` (celle qu\'OP GESTION lit pour rattacher un abonnement à une entreprise)', [Object.entries(sb0.metadata).sort().join('|'), 'espace' in sb0.metadata], [['opmsg_espace', E0].join(',') + '|' + 'produit,opmsg', false]);
      v('l\'état est le même pour l\'administrateur à la relecture suivante (le verdict ne dépend pas d\'une session consommée)', (await relire(a, E0)).j.abonnement.statut, 'active');
      /* un tiers (membre simple, étranger) ne relit ni ne force rien */
      v('un membre simple ne relit pas (403), un étranger non plus (404) : Stripe n\'est pas un compteur à tourner par n\'importe qui', [(await relire(b, E0)).code, (await relire(d, E0)).code], [403, 404]);
      /* un second paiement : 409 avec le portail */
      const p2 = fake.appels.length;
      const dbl = await payer(a, E0, { places: 5 });
      v('⛔ payer UNE SECONDE FOIS un espace abonné : 409 `abonnement_existant`, avec le lien du portail pour changer les places — aucune session neuve (un second abonnement serait prélevé en double)', [dbl.code, dbl.j.error, /^https:\/\/billing\.stripe\.test\/p\/session\//.test(dbl.j.portail), nouvelles(p2).filter(x => x.m === 'POST' && x.chemin === '/v1/checkout/sessions').length, fake.sessions.size], [409, 'abonnement_existant', true, 0, 3]);
      /* ── ce que la session désigne n'est adopté que si TOUT concorde : l'espace de la session, la métadonnée, NOS tarifs ── */
      const adopte = async (cli, id) => (await relire(cli, id)).j;
      const sessionDe = (id) => Array.from(fake.sessions.values()).filter(x => x.client_reference_id === 'opmsg:' + id).pop();
      const E7 = S.espaceCreer({ nom: 'Adoptions', proprio: bob.id }).id;
      await payer(bo, E7, { places: 1 });
      const s7 = sessionDe(E7), sb7 = fake.payer(s7.id, { statut: 'active' });
      sb7.metadata.opmsg_espace = E0;     // Stripe rend un abonnement qui prétend être celui d'E0 — pour la session d'E7
      v('⛔ une session qui désigne un abonnement dont la métadonnée dit UN AUTRE espace n\'est PAS adoptée : E7 reste Perso, la session est oubliée (pas de boucle de relecture)', [(await adopte(bo, E7)).formule, S.abonnementLire(E7).abonnement, S.abonnementLire(E7).session], ['perso', null, null]);
      v('… et l\'abonnement d\'E0 n\'a pas bougé', [(await etat(a, E0)).j.abonnement.statut, S.abonnementLire(E0).abonnement === sb0.id], ['active', true]);
      await payer(bo, E7, { places: 1 });
      const s7b = sessionDe(E7); fake.payer(s7b.id, { statut: 'active' });
      s7b.client_reference_id = 'opmsg:' + E0;      // la session cite un autre espace que celui pour lequel elle a été ouverte
      v('⛔ une session qui cite un AUTRE espace (`client_reference_id`) n\'est pas adoptée non plus', [(await adopte(bo, E7)).formule, S.abonnementLire(E7).abonnement], ['perso', null]);
      await payer(bo, E7, { places: 1 });
      const s7m = sessionDe(E7); fake.payer(s7m.id, { statut: 'active' });
      s7m.mode = 'payment';                          // une session qui n'est pas un ABONNEMENT (un paiement ponctuel) : elle ne désigne rien qu'on puisse relire
      v('⛔ une session qui n\'est pas en mode « subscription » n\'est pas adoptée non plus', [(await adopte(bo, E7)).formule, S.abonnementLire(E7).abonnement], ['perso', null]);
      await payer(bo, E7, { places: 1 });
      const s7c = sessionDe(E7), sb7c = fake.payer(s7c.id, { statut: 'active' });
      sb7c.items.data[0].price.id = AUTRE_PRIX;
      v('⛔ un abonnement dont AUCUNE ligne n\'est un de NOS tarifs (un autre produit du compte) n\'est pas adopté', [(await adopte(bo, E7)).formule, S.abonnementLire(E7).abonnement], ['perso', null]);
      await payer(bo, E7, { places: 2 });
      const s7d = sessionDe(E7), sb7d = fake.payer(s7d.id, { statut: 'active' });
      fake.ajouterLigne(sb7d.id, AUTRE_PRIX, 50);
      const r7 = await adopte(bo, E7);
      v('⛔ les places sont la quantité de NOS lignes seulement : une ligne d\'un autre produit (50 places) ne donne aucune place', [r7.formule, r7.places, r7.abonnement.places], ['pro', 2, 2]);
      /* ── tous les états que Stripe peut dire ── */
      const sbE7 = sb7d.id;
      const dit = async (statut, plus) => { fake.statut(sbE7, statut, plus); return adopte(bo, E7); };
      const tab = [];
      for (const st of ['trialing', 'active', 'incomplete', 'paused']) { const r = await dit(st); tab.push([st, r.formule, r.places]); }
      v('⛔ payé = `active` ou `trialing`, RIEN d\'autre : `incomplete` et `paused` ne donnent ni formule Pro ni place', tab, [['trialing', 'pro', 2], ['active', 'pro', 2], ['incomplete', 'perso', 0], ['paused', 'perso', 0]]);
      const second = [], p4 = fake.sessions.size;
      for (const st of ['incomplete', 'paused']) { fake.statut(sbE7, st); await adopte(bo, E7); const rp = await payer(bo, E7, { places: 2 }); second.push([st, rp.code, rp.j.error]); }
      v('⛔ un abonnement EN ATTENTE de paiement (`incomplete`) ou EN PAUSE existe encore chez Stripe : en ouvrir un second le ferait prélever deux fois le jour où l\'autre repart — 409 `abonnement_existant`, aucune session neuve', [second, fake.sessions.size - p4], [[['incomplete', 409, 'abonnement_existant'], ['paused', 409, 'abonnement_existant']], 0]);
      const fin2 = [];
      for (const st of ['incomplete_expired', 'canceled']) { fake.statut(sbE7, 'active'); await adopte(bo, E7); const r = await dit(st); fin2.push([st, r.formule, r.places]); }
      v('… ni `incomplete_expired` ni `canceled`', fin2, [['incomplete_expired', 'perso', 0], ['canceled', 'perso', 0]]);
      /* résilié : un état FINAL (plus relu), et l'espace peut payer de nouveau */
      const p3 = fake.appels.length;
      await relire(bo, E7);
      v('⛔ un abonnement résilié est un état FINAL : on ne le relit plus (aucun appel à Stripe)', nouvelles(p3).length, 0);
      const re = await payer(bo, E7, { places: 2 });
      v('… et l\'espace peut payer de nouveau : une session neuve (il n\'y a plus d\'abonnement vivant)', [re.code, nouvelles(p3).filter(x => x.m === 'POST' && x.chemin === '/v1/checkout/sessions').length], [201, 1]);
      /* Stripe ne connaît plus l'abonnement (404) = résilié */
      const sb7e = fake.payer(sessionDe(E7).id, { statut: 'active' });
      v('l\'abonnement adopté est celui de la NOUVELLE session', [(await adopte(bo, E7)).formule, S.abonnementLire(E7).abonnement === sb7e.id], ['pro', true]);
      fake.oublier(sb7e.id);
      v('⛔ Stripe qui ne connaît plus l\'abonnement (404) : résilié — Perso', [(await adopte(bo, E7)).formule, S.abonnementLire(E7).statut], ['perso', 'canceled']);
      /* le changement de places et la résiliation en fin de période se lisent */
      const E8 = S.espaceCreer({ nom: 'Places', proprio: bob.id }).id; entrer(E8, bob.id, dan.id);
      await payer(bo, E8, { places: 4 });
      const sb8 = fake.payer(sessionDe(E8).id, { statut: 'active', quantite: 4 });
      await adopte(bo, E8);
      fake.quantite(sb8.id, 6);
      v('le portail de Stripe change les places : la relecture les suit (4 → 6)', (await adopte(bo, E8)).places, 6);
      fake.quantite(sb8.id, 1);
      const bas = await adopte(bo, E8);
      v('⛔ une baisse SOUS le nombre de membres ne retire personne : elle est dite (`places_depassees`), les liens d\'invitation s\'arrêtent, tout le monde reste', [bas.places, bas.membres, bas.places_depassees, S.espaceMembresN(E8), (await bo.post('/api/espaces/' + E8 + '/invitations', {})).j.error], [1, 2, true, 2, 'places_epuisees']);
      const fiche1 = (await bo.get('/api/espaces/' + E8)).j, ficheMembre = (await d.get('/api/espaces/' + E8)).j;
      v('⛔ … et la FICHE de l\'espace le dit à l\'administrateur, avec les deux nombres (1 place, 2 membres) — le bloc « administrateur » n\'existe pas pour Dan, simple membre', [fiche1.admin.places, fiche1.membres_n, fiche1.admin.places_depassees, ficheMembre.admin], [1, 2, true, undefined]);
      fake.quantite(sb8.id, 2);
      const juste = await adopte(bo, E8);
      v('… autant de places que de membres : la fiche ne dit plus « dépassé »', (await bo.get('/api/espaces/' + E8)).j.admin.places_depassees, false);
      v('⛔ EXACTEMENT autant de places que de membres : pas de dépassement (personne ne manque de place), mais plus de lien (complet)', [juste.places, juste.membres, juste.places_depassees, (await bo.post('/api/espaces/' + E8 + '/invitations', {})).j.error], [2, 2, false, 'places_epuisees']);
      fake.statut(sb8.id, 'active', { cancel_at_period_end: true });
      v('« résilié à la fin de la période » : encore Pro, et l\'écran peut le dire (`annule`)', [(await adopte(bo, E8)).abonnement.annule, (await etat(bo, E8)).j.formule], [true, 'pro']);
      /* le sursis d'un impayé, daté de la première lecture ; l'impayé n'est constaté que par une lecture faite 7 jours plus tard */
      const E9 = S.espaceCreer({ nom: 'Retard', proprio: eli.id }).id;
      await payer(el, E9, { places: 1 });
      const sb9 = fake.payer(sessionDe(E9).id, { statut: 'active' });
      await adopte(el, E9);
      fake.statut(sb9.id, 'past_due');
      const r9 = await adopte(el, E9);
      v('⛔ `past_due` à la première lecture : encore Pro, en SURSIS de sept jours — l\'administrateur en lit la date', [r9.formule, r9.motif, Math.abs(r9.sursis_jusqua - (Date.now() + 7 * JOUR)) < 60000, S.abonnementLire(E9).impaye_depuis > 0], ['pro', 'sursis', true, true]);
      const decaler = (id, jours) => { const r = raw(); try { r.prepare('UPDATE abonnement SET impaye_depuis = impaye_depuis - ?, relu_le = relu_le - ? WHERE espace = ?').run(jours * JOUR, jours * JOUR, id); } finally { r.close(); } };
      decaler(E9, 8);     // la première lecture date de huit jours, la dernière aussi : il faut une lecture FAITE APRÈS
      v('⛔ huit jours après, mais SANS nouvelle lecture réussie : toujours le sursis (le temps ne court pas contre qui a peut-être payé entre-temps)', (await etat(el, E9)).j.formule, 'pro');
      const r9b = await adopte(el, E9);
      v('⛔ la lecture suivante, qui dit ENCORE le retard : impayé — les fonctions Pro refusent (402, avec la raison pour l\'administrateur), les places et les membres restent', [r9b.formule, r9b.motif, r9b.places, (await el.post('/api/espaces/' + E9 + '/canaux', { nom: 'refusé' })).j.raison, S.espaceMembresN(E9)], ['impaye', 'impaye', 1, 'impaye', 1]);
      fake.statut(sb9.id, 'active');
      v('réglé : tout revient d\'un coup (Pro, plus de date de retard)', [(await adopte(el, E9)).formule, S.abonnementLire(E9).impaye_depuis], ['pro', null]);
      fake.statut(sb9.id, 'unpaid'); await adopte(el, E9); decaler(E9, 9);
      v('`unpaid` compte comme `past_due` : même sursis, même issue', (await adopte(el, E9)).formule, 'impaye');
    }

    /* ═══ 4. UNE PANNE NE SUSPEND PERSONNE ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne panne ne suspend personne : Stripe muet, clé refusée, trop de demandes, réponse illisible — le dernier état connu sert');
    {
      const avant = (await etat(a, E0)).j;
      v('population : E0 est payée (Pro, 3 places) avant la panne', [avant.formule, avant.places, avant.stripe_muet], ['pro', 3, false]);
      for (const [mode, nom] of [['muet', 'Stripe répond 500'], ['refuse', 'la clé est refusée (401)'], ['limite', 'trop de demandes (429)'], ['illisible', 'une réponse qui n\'est pas du JSON']]) {
        fake.mode = mode;
        const p = fake.appels.length;
        const r = await relire(a, E0);
        const e = (await etat(a, E0)).j;
        v('⛔ ' + nom + ' : « J\'ai réglé » répond 502 `stripe_muet` ; l\'espace reste Pro avec ses places (le dernier état connu), Stripe est dit muet', [r.code, r.j.error, e.formule, e.places, e.stripe_muet, nouvelles(p).length > 0], [502, 'stripe_muet', 'pro', 3, true, true]);
      }
      fake.mode = 'normal';
      const sain = await relire(a, E0);
      v('Stripe revenu : la relecture réussit, l\'état se remet (plus « muet »)', [sain.code, sain.j.stripe_muet, sain.j.formule], [200, false, 'pro']);
      /* le sursis ne court pas pendant la panne */
      const Er = S.espaceCreer({ nom: 'Panne', proprio: eli.id }).id;
      await payer(el, Er, { places: 1 });
      const sbr = fake.payer(fake.derniereSession().id, { statut: 'active' });
      await relire(el, Er);
      fake.statut(sbr.id, 'past_due'); await relire(el, Er);
      const r2 = raw(); try { r2.prepare('UPDATE abonnement SET impaye_depuis = ?, relu_le = ? WHERE espace = ?').run(Date.now() - 30 * JOUR, Date.now() - 30 * JOUR + 3600000, Er); } finally { r2.close(); }
      v('population : un espace en retard depuis TRENTE jours d\'horloge, mais lu pour la dernière fois une heure après le premier retard : encore Pro (sursis)', (await etat(el, Er)).j.formule, 'pro');
      fake.mode = 'muet';
      v('⛔ pendant la panne de Stripe, il n\'est PAS suspendu : la relecture échoue (502) et le sursis ne se transforme pas en impayé', [(await relire(el, Er)).code, (await etat(el, Er)).j.formule, (await etat(el, Er)).j.motif], [502, 'pro', 'sursis']);
      fake.mode = 'normal';
      v('⛔ la première lecture RÉUSSIE qui suit et qui dit encore le retard le constate : impayé', (await relire(el, Er)).j.formule, 'impaye');
      /* ⛔ LA CLÉ N'EST NULLE PART */
      fake.mode = 'refuse'; fake.echo = true;
      const ec = await relire(a, E0), ep = await payer(a, E0, { places: 3 });
      v('⛔ Stripe qui répète la clé dans son message d\'erreur : la page ne reçoit RIEN de ce message (que `stripe_muet`) — ni en relisant, ni en payant (payer un espace déjà abonné rend le 409 sans lien de portail : Stripe est muet)', [ec.code, ec.j, ep.code, ep.j.error, ec.txt.includes(CLE) || ep.txt.includes(CLE), ec.txt.includes('Bearer') || ep.txt.includes('Bearer')], [502, { error: 'stripe_muet' }, 409, 'abonnement_existant', false, false]);
      fake.mode = 'normal'; fake.echo = false;
    }
    /* ═══ 5. LE PORTAIL ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe portail : changer les places, la carte, résilier — chez Stripe, jamais chez nous');
    {
      const por = (cli, id, extra) => cli.post('/api/espaces/' + id + '/facturation/portail', {}, extra);
      const Ev = S.espaceCreer({ nom: 'Vierge', proprio: eli.id }).id;
      const p0 = fake.appels.length;
      v('⛔ sans paiement il n\'y a pas de client chez Stripe : 409 `pas_d_abonnement`, et Stripe n\'est pas appelé', [(await por(el, Ev)).j.error, fake.appels.slice(p0).filter(x => x.m === 'POST').length], ['pas_d_abonnement', 0]);
      const r = await por(a, E0);
      const ap = fake.dernier('POST', /billing_portal/);
      const F = form(ap);
      v('le portail : 200 et l\'adresse de Stripe ; la demande porte le client de l\'abonnement et l\'adresse de retour de LA PAGE (jamais celle du corps), la clé en Bearer', [r.code, Object.keys(r.j), /^https:\/\/billing\.stripe\.test\/p\/session\//.test(r.j.url), F.customer === sb0.customer, F.return_url, ap.auth], [200, ['url'], true, true, svc.base + '/?abo=portail&e=' + E0 + '#reglages', 'Bearer ' + CLE]);
      v('⛔ réservé au PROPRIÉTAIRE (Ben, administrateur ou non : 403 ; un étranger : 404) ; une autre origine : 403', [(await por(b, E0)).code, (await por(d, E0)).code, (await por(a, E0, { origin: 'https://pirate.example' })).code], [403, 404, 403]);
      fake.portailConfigure = false;
      const np = await por(a, E0);
      v('⛔ le portail pas encore configuré chez Stripe (le geste de Justin) : 502 `paiement_indisponible` — une RÉPONSE de Stripe, pas une panne : Stripe n\'est pas dit muet', [np.code, np.j.error, (await etat(a, E0)).j.stripe_muet, /configuration/i.test(np.txt)], [502, 'paiement_indisponible', false, false]);
      fake.portailConfigure = true; fake.mode = 'muet';
      v('Stripe muet : 502 `stripe_muet`', (await por(a, E0)).j.error, 'stripe_muet');
      fake.mode = 'normal';
      /* ⛔ une adresse que Stripe « rendrait » et qui n'est pas http(s) (`javascript:`) ne fait jamais suivre la page : refus, et la session mal adressée n'est pas rangée */
      const adr = pers('Adr'), ad = cl(adr), Eu = S.espaceCreer({ nom: 'Adresse', proprio: adr.id }).id;
      fake.urlMauvaise = 'javascript:alert(1)';
      const ru = await payer(ad, Eu, { places: 1 }), pu = await por(a, E0);
      fake.urlMauvaise = null;
      v('⛔ une adresse de paiement ou de portail qui n\'est pas http(s) (« javascript: ») n\'est JAMAIS rendue à la page : 502 `stripe_muet`, et la session mal adressée n\'est pas rangée', [ru.code, ru.j.error, /javascript/.test(ru.txt), S.abonnementLire(Eu), pu.code, pu.j.error, /javascript/.test(pu.txt)], [502, 'stripe_muet', false, null, 502, 'stripe_muet', false]);
    }

    /* ═══ 5 bis. UNE SESSION SE RELIT TOUJOURS ; PAYER, RELIRE, DISSOUDRE SE FONT UN PAR UN ; ON NE DISSOUT PAS ENTRE UN PAIEMENT ET SA RELECTURE ════════════════════ */
    console.log('\nUne session de paiement se relit toujours, quel que soit son âge ; payer se fait un à la fois ; on ne dissout pas un espace entre un paiement et sa relecture');
    {
      /* relecture du gardien, 3 octobre 2026 : trois chemins par lesquels un paiement RÉGLÉ chez Stripe n'était jamais reconnu — et le client payait deux fois. Le service a l'horloge avancée à la main (`avancer`). */
      const svc5 = await T.lancerService({ horloge: true, config: { formule: { toutOuvert: false }, facturation: { cle: CLE, prix: PRIX, affichage: { mensuel: 15, annuel: 150 }, relectureMs: 3600000, timeoutMs: 3000 }, quotas: { relire: { max: 1000, fenetreMs: 1000 }, paiement: { max: 1000, fenetreMs: 3600000 } } }, env: { OPMSG_TEST_STRIPE: fake.hote } });
      const S5 = ouvrir({ chemin: path.join(svc5.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc5.cle, 'hex')) });
      try {
        const H = 3600000, chemin = (e, f) => '/api/espaces/' + e + '/' + f;
        /* un propriétaire neuf, son client et son espace : chaque scénario a le sien (trois espaces au plus par propriétaire) */
        const monde = (nom) => {
          const p = S5.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
          const c = T.client(svc5.base), j = jeton(); S5.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 20 * 86400000 }); c.poserCookie(j);
          const e = S5.espaceCreer({ nom: 'Espace ' + nom, proprio: p.id }).id;
          return { p, c, e, payer: (places = 1) => c.post(chemin(e, 'facturation/paiement'), { places }), relire: () => c.post(chemin(e, 'facturation/relire'), {}), etat: async () => (await c.get(chemin(e, 'facturation/etat'))).j,
            supprimer: () => c.post(chemin(e, 'supprimer'), { confirmation: 'SUPPRIMER' }), session: () => Array.from(fake.sessions.values()).filter(x => x.client_reference_id === 'opmsg:' + e).pop() };
        };

        /* ── (a) une session de plus de 24 h est RELUE avant d'être oubliée ── */
        const A = monde('Vingtcinq');
        await A.payer();
        const sA = A.session(); fake.payer(sA.id);                 // payée à la 23e heure, pendant que personne ne lisait Stripe…
        svc5.avancer(25 * H);                                      // … et lue pour la première fois à la 25e
        const lA = await A.relire();
        v('⛔ une session de plus de 24 h est RELUE avant d\'être oubliée : payée, elle devient l\'abonnement (avant, elle était oubliée SANS lecture : le paiement n\'était jamais reconnu, et le client payait une seconde fois)',
          [lA.code, lA.j.formule, lA.j.abonnement && lA.j.abonnement.statut, lA.j.paiement_en_attente, S5.abonnementLire(A.e).session], [200, 'pro', 'active', false, null]);
        const B = monde('Payeetoubliee');
        await B.payer();
        const sB = B.session(); fake.payer(sB.id);
        svc5.avancer(25 * H);
        const nB = fake.sessions.size, pB = await B.payer();
        v('⛔ payer de nouveau quand la session de plus de 24 h a été PAYÉE : 409 `abonnement_existant` (elle est relue et adoptée), aucune session neuve — un second abonnement serait prélevé en double',
          [pB.code, pB.j.error, fake.sessions.size - nB, S5.abonnementLire(B.e).abonnement !== null], [409, 'abonnement_existant', 0, true]);
        const C = monde('Expiree');
        await C.payer();
        const sC = C.session(); fake.expirer(sC.id);
        svc5.avancer(25 * H);
        const nC = fake.sessions.size, pC = await C.payer();
        v('une session de plus de 24 h que Stripe dit EXPIRÉE : on en ouvre une neuve (201), qui remplace l\'ancienne', [pC.code, fake.sessions.size - nC, S5.abonnementLire(C.e).session === C.session().id, C.session().id !== sC.id], [201, 1, true, true]);
        const D = monde('Muette');
        await D.payer();
        const sD = D.session(); svc5.avancer(25 * H); fake.mode = 'muet';
        const rD = await D.relire(), eD = await D.etat();
        v('⛔ Stripe muet pendant plus de 24 h : la session RESTE rangée et le dit (« paiement en attente » : on ne sait pas si elle a été payée) — rien n\'est oublié sur une lecture ratée', [rD.code, eD.paiement_en_attente, S5.abonnementLire(D.e).session === sD.id], [502, true, true]);
        fake.mode = 'normal'; fake.expirer(sD.id);
        const rD2 = await D.relire();
        v('… Stripe revenu dit « expirée » : alors seulement elle est oubliée', [rD2.code, rD2.j.paiement_en_attente, S5.abonnementLire(D.e).session], [200, false, null]);

        /* ── (b) payer se fait un à la fois, par espace ── */
        const E = monde('Simultanes');
        fake.retardMs = 60;
        const nS = fake.sessions.size, nP = fake.compter('POST', /^\/v1\/checkout\/sessions$/);
        const trois = await Promise.all([1, 2, 3].map(() => E.payer(2)));
        fake.retardMs = 0;
        v('⛔ trois « payer » SIMULTANÉS ne font qu\'UNE session chez Stripe et rendent la même adresse (avant : trois sessions ouvertes pour une seule retenue — en payer une autre créait un abonnement vivant que personne ne reconnaîtrait)',
          [trois.map(x => x.code), new Set(trois.map(x => x.j.url)).size, fake.sessions.size - nS, fake.compter('POST', /^\/v1\/checkout\/sessions$/) - nP], [[201, 201, 201], 1, 1, 1]);
        fake.payer(E.session().id);
        const rE = await E.relire();
        v('… la session retenue est bien celle qui se paie : reconnue, l\'espace est Pro avec ses deux places', [rE.code, rE.j.formule, rE.j.abonnement && rE.j.abonnement.places], [200, 'pro', 2]);

        /* ── (c) on ne dissout pas un espace entre un paiement et sa relecture ── */
        const F = monde('Dissous');
        await F.payer();
        fake.payer(F.session().id);                                 // payé chez Stripe, le service ne l'a pas lu (pas de webhook : jusqu'à dix minutes)
        const dF = await F.supprimer();
        v('⛔ dissoudre juste après un paiement que le service n\'a pas encore lu : le paiement est RELU d\'abord — c\'est un abonnement qui court (409 `abonnement_actif`), l\'espace existe toujours et il est Pro',
          [dF.code, dF.j.error, S5.espaceBrut(F.e) !== null, S5.abonnementLire(F.e).statut], [409, 'abonnement_actif', true, 'active']);
        const G = monde('Ouverte');
        await G.payer();
        const dG = await G.supprimer();
        v('⛔ une session encore OUVERTE (jamais payée) : on ne dissout pas — elle serait payable derrière un espace qui n\'existe plus (409 `paiement_en_cours`), rien n\'est supprimé, la session reste rangée',
          [dG.code, dG.j.error, S5.espaceBrut(G.e) !== null, S5.abonnementLire(G.e).session === G.session().id], [409, 'paiement_en_cours', true, true]);
        fake.expirer(G.session().id);
        const dG2 = await G.supprimer();
        v('… expirée, elle ne bloque plus : l\'espace est dissous (200)', [dG2.code, S5.espaceBrut(G.e)], [200, null]);
        const Hh = monde('Muet');
        await Hh.payer(); fake.mode = 'muet';
        const dH = await Hh.supprimer();
        fake.mode = 'normal';
        v('⛔ Stripe muet : on ne sait pas si la session a été payée — pas de dissolution (409 `paiement_en_cours`)', [dH.code, dH.j.error, S5.espaceBrut(Hh.e) !== null], [409, 'paiement_en_cours', true]);

        /* supprimer son COMPTE quand on est seul dans l'espace */
        const I = monde('Compte');
        await I.payer();
        const cI = await I.c.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
        v('⛔ supprimer son compte quand on est seul dans un espace dont un paiement est commencé : 409 `paiement_en_cours` — rien n\'est programmé', [cI.code, cI.j.error, S5.suppressionLe(I.p.id)], [409, 'paiement_en_cours', null]);
        fake.payer(I.session().id);
        const cI2 = await I.c.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
        v('… le paiement est RELU d\'abord : réglé, c\'est un abonnement qui court — 409 `espace_abonne` (résilier, ou confier l\'espace)', [cI2.code, cI2.j.error, S5.abonnementLire(I.e).statut], [409, 'espace_abonne', 'active']);
        fake.statut(S5.abonnementLire(I.e).abonnement, 'canceled');
        const cI3 = await I.c.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
        v('… résilié chez Stripe (le service ne le sait pas encore) : la relecture le voit, la suppression est programmée (200)', [cI3.code, S5.suppressionLe(I.p.id) !== null], [200, true]);
      } finally { fake.mode = 'normal'; fake.retardMs = 0; try { S5.fermer(); } catch (x) { /* déjà fermé */ } await svc5.arreter(); }
    }

    /* ═══ 6. LES PLAFONDS DU PAIEMENT, DU PORTAIL ET DE LA RELECTURE ══════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes plafonds : une relecture par dix secondes et par espace, le paiement et le portail par personne');
    {
      const svc2 = await T.lancerService({ config: { formule: { toutOuvert: false }, facturation: { cle: CLE, prix: PRIX, relectureMs: 3600000, timeoutMs: 3000 }, quotas: { paiement: { max: 2, fenetreMs: 3600000 }, portail: { max: 2, fenetreMs: 3600000 }, relire: { max: 1, fenetreMs: 1500 } } }, env: { OPMSG_TEST_STRIPE: fake.hote } });
      const S2 = ouvrir({ chemin: path.join(svc2.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc2.cle, 'hex')) });
      try {
        const o = S2.personneCreer({ identifiant: 'beta:Plafond' + crypto.randomBytes(2).toString('hex'), prenom: 'Plafond', nom: 'Banc', origine: 'beta', verifie: true });
        const j = jeton(); S2.sessionAjouter({ h: sha(j), personne: o.id, appareil: null, ttlMs: 86400000 });
        const cp = T.client(svc2.base); cp.poserCookie(j);
        const Ep = S2.espaceCreer({ nom: 'Plafonds', proprio: o.id }).id;
        const pa = [];
        for (let i = 0; i < 3; i++) pa.push(await cp.post('/api/espaces/' + Ep + '/facturation/paiement', { places: 1 }));
        v('⛔ le paiement : deux par heure (réglage de ce banc), le troisième est refusé 429 avec `Retry-After`', [pa.map(x => x.code), Number(pa[2].h.get('retry-after')) > 0, pa[2].j.error], [[201, 201, 429], true, 'quota_atteint']);
        const rl = [];
        for (let i = 0; i < 3; i++) rl.push(await cp.post('/api/espaces/' + Ep + '/facturation/relire', {}));
        v('⛔ la relecture : UNE par fenêtre et par espace (Stripe n\'est pas un compteur à tourner en boucle) — la deuxième de suite est refusée, avec le temps à attendre', [rl[0].code, rl[1].code, rl[2].code, Number(rl[1].h.get('retry-after')) > 0], [200, 429, 429, true]);
        const src = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'facturation.js'), 'utf8'));
        vrai('… et la fenêtre de PRODUCTION est de dix secondes (le banc joue 1,5 s pour ne pas dormir dix secondes : la valeur se lit dans le code)', /plafond\(res, 'relire', req\.espace\.espace\.id, \{ max: 1, fenetreMs: 10000 \}\)/.test(src));
        fake.payer(fake.derniereSession().id, { statut: 'active' });
        await T.dort(1600);
        const pad = await cp.post('/api/espaces/' + Ep + '/facturation/relire', {});
        const po = [];
        for (let i = 0; i < 3; i++) po.push(await cp.post('/api/espaces/' + Ep + '/facturation/portail', {}));
        v('⛔ après la fenêtre la relecture repasse (et adopte le paiement) ; le portail : deux par heure, le troisième est refusé (429)', [pad.code, pad.j.formule, po.map(x => x.code)], [200, 'pro', [200, 200, 429]]);
      } finally { try { S2.fermer(); } catch (x) { /* déjà fermé */ } await svc2.arreter(); }
    }

    /* ═══ 7. LA PASSE AUTOMATIQUE : sans que personne ne clique ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa passe automatique relit les espaces abonnés (toutes les dix minutes en service, ici toutes les 250 ms) — sans que personne ne clique');
    {
      const svc3 = await T.lancerService({ config: { formule: { toutOuvert: false }, facturation: { cle: CLE, prix: PRIX, relectureMs: 250, timeoutMs: 2000 }, quotas: { paiement: { max: 100, fenetreMs: 3600000 } } }, env: { OPMSG_TEST_STRIPE: fake.hote } });
      const S3 = ouvrir({ chemin: path.join(svc3.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc3.cle, 'hex')) });
      try {
        const o = S3.personneCreer({ identifiant: 'beta:Passe' + crypto.randomBytes(2).toString('hex'), prenom: 'Passe', nom: 'Banc', origine: 'beta', verifie: true });
        const j = jeton(); S3.sessionAjouter({ h: sha(j), personne: o.id, appareil: null, ttlMs: 86400000 });
        const cp = T.client(svc3.base); cp.poserCookie(j);
        const Ep = S3.espaceCreer({ nom: 'Passe', proprio: o.id }).id;
        await cp.post('/api/espaces/' + Ep + '/facturation/paiement', { places: 1 });
        const sess = fake.derniereSession();
        const sbp = fake.payer(sess.id, { statut: 'active' });
        const suit = async (cond, plafond = 8000) => T.attendre(async () => cond((await cp.get('/api/espaces/' + Ep + '/facturation/etat')).j), plafond, 40);
        vrai('⛔ le client revient SANS cliquer (il a fermé l\'onglet) : la passe adopte l\'abonnement que la session désigne — l\'espace devient Pro tout seul', await suit(e => e.formule === 'pro'));
        fake.statut(sbp.id, 'past_due');
        vrai('… Stripe dit « en retard » : la passe le range, sans aucun geste (sursis de sept jours : encore Pro)', await suit(e => e.abonnement && e.abonnement.statut === 'past_due' && e.formule === 'pro' && e.motif === 'sursis'));
        fake.statut(sbp.id, 'canceled');
        vrai('… Stripe dit « résilié » : la passe le range, l\'espace redevient Perso', await suit(e => e.abonnement && e.abonnement.statut === 'canceled' && e.formule === 'perso'));
        await T.dort(900);
        const lecturesAvant = fake.compter('GET', new RegExp('/v1/subscriptions/' + sbp.id + '$'));
        await T.dort(1000);
        v('⛔ un abonnement RÉSILIÉ est un état final : la passe ne le relit plus (quatre passes de plus, aucun appel à Stripe pour lui)', fake.compter('GET', new RegExp('/v1/subscriptions/' + sbp.id + '$')) - lecturesAvant, 0);
        /* la panne pendant la passe */
        const sess2 = (await cp.post('/api/espaces/' + Ep + '/facturation/paiement', { places: 1 })).code;
        const sb2 = fake.payer(fake.derniereSession().id, { statut: 'active' });
        vrai('population : un nouvel abonnement est adopté par la passe (' + sess2 + ')', await suit(e => e.formule === 'pro'));
        fake.mode = 'muet';
        fake.statut(sb2.id, 'past_due');
        await T.dort(900);
        v('⛔ pendant la panne la passe échoue SANS rien changer : l\'état reste « payé », Stripe est dit muet', await (async () => { const e = (await cp.get('/api/espaces/' + Ep + '/facturation/etat')).j; return [e.formule, e.abonnement.statut, e.stripe_muet]; })(), ['pro', 'active', true]);
        fake.mode = 'normal';
        vrai('… Stripe revenu, la passe rattrape tout seule (le retard est rangé, plus muet)', await suit(e => e.abonnement && e.abonnement.statut === 'past_due' && e.stripe_muet === false));
        const h3 = (await T.client(svc3.base).get('/health')).j;
        v('/health : Stripe n\'est plus muet — et l\'espace en retard n\'y est PAS compté (le retard est lu juste au-dessus : un nombre publié ne serait pas zéro ; /health est public, ces chiffres se lisent dans Stripe)', [h3.stripeEchecMin, Object.keys(h3.facturation).sort()], [0, ['mode', 'toutOuvert']]);
      } finally { try { S3.fermer(); } catch (x) { /* déjà fermé */ } await svc3.arreter(); }
    }
    /* ═══ 7 bis. /health DIT DEPUIS COMBIEN DE MINUTES STRIPE EST ILLISIBLE — c'est ce que lit la surveillance ═════════════════════════════════════════════ */
    console.log('\n/health.stripeEchecMin : depuis combien de minutes Stripe est illisible (l\'horloge du service avancée de deux heures)');
    {
      const svc4 = await T.lancerService({ horloge: true, config: { formule: { toutOuvert: false }, facturation: { cle: CLE, prix: PRIX, relectureMs: 3600000, timeoutMs: 2000 }, quotas: { relire: { max: 100, fenetreMs: 1000 } } }, env: { OPMSG_TEST_STRIPE: fake.hote } });
      const S4 = ouvrir({ chemin: path.join(svc4.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc4.cle, 'hex')) });
      try {
        const o = S4.personneCreer({ identifiant: 'beta:Muet' + crypto.randomBytes(2).toString('hex'), prenom: 'Muet', nom: 'Banc', origine: 'beta', verifie: true });
        const j = jeton(); S4.sessionAjouter({ h: sha(j), personne: o.id, appareil: null, ttlMs: 86400000 });
        const cp = T.client(svc4.base); cp.poserCookie(j);
        const Ep = S4.espaceCreer({ nom: 'Muet', proprio: o.id }).id;
        await cp.post('/api/espaces/' + Ep + '/facturation/paiement', { places: 1 });      // une session de paiement attend : il y a quelque chose à relire
        const sante = async () => (await T.client(svc4.base).get('/health')).j;
        v('population : Stripe répond, rien n\'est illisible', (await sante()).stripeEchecMin, 0);
        fake.mode = 'muet';
        v('Stripe muet : la relecture échoue (502)', (await cp.post('/api/espaces/' + Ep + '/facturation/relire', {})).code, 502);
        v('… à l\'instant même, zéro minute', (await sante()).stripeEchecMin, 0);
        svc4.avancer(125 * 60000);
        v('⛔ deux heures plus tard, sans lecture réussie : /health dit 125 minutes — c\'est ce que lit la surveillance (elle crie au-delà de 90)', (await sante()).stripeEchecMin, 125);
        fake.mode = 'normal';
        v('Stripe revenu, une lecture réussie : de nouveau zéro', [(await cp.post('/api/espaces/' + Ep + '/facturation/relire', {})).code, (await sante()).stripeEchecMin], [200, 0]);
      } finally { fake.mode = 'normal'; try { S4.fermer(); } catch (x) { /* déjà fermé */ } await svc4.arreter(); }
    }
    /* ═══ 8. LA CLÉ N'EST NULLE PART ══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa clé Stripe n\'est nulle part : ni dans une réponse, ni dans /health, ni dans le journal, ni sur le disque, ni dans la page servie');
    {
      const QUEUE = CLE.slice(-16);      // la fin de la clé de banc : des lettres qu'aucun texte du service ne partage
      const tout = vus.join('\n');
      const health = await T.client(svc.base).get('/health');
      const journal = svc.sortie.texte();
      const disque = (() => { let bt = Buffer.alloc(0); for (const sfx of ['', '-wal', '-shm']) { try { bt = Buffer.concat([bt, fs.readFileSync(path.join(svc.data, 'msg.db') + sfx)]); } catch (e) { /* absent */ } } return bt; })();
      const racine = await T.client(svc.base).get('/'), js = await T.client(svc.base).get('/api.js');
      vrai('population : le banc a relevé ' + vus.length + ' réponses du service, le journal, la base (' + disque.length + ' octets) et la page', vus.length > 80 && journal.length > 100 && disque.length > 8192 && racine.code === 200 && js.code === 200);
      v('⛔ la CLÉ (en entier, et sa fin) n\'est dans AUCUNE réponse du service, ni /health, ni la page, ni son client', [tout.includes(CLE), tout.includes(QUEUE), health.txt.includes(QUEUE), racine.txt.includes(QUEUE), js.txt.includes(QUEUE)], [false, false, false, false, false]);
      v('… ni dans le journal du service, ni sur son disque (la clé vit dans la configuration, jamais dans la base)', [journal.includes(CLE), journal.includes(QUEUE), disque.includes(Buffer.from(QUEUE))], [false, false, false]);
      v('⛔ les identifiants de TARIF (`price_…`) ne sortent jamais du service : aucune réponse, aucune page', [/price_Banc/.test(tout), /price_Banc/.test(racine.txt + js.txt + health.txt)], [false, false]);
      v('les identifiants de CLIENT et d\'ABONNEMENT de Stripe (`cus_`, `sub_`) ne sortent pas non plus (la page n\'en a pas besoin : elle ne parle qu\'à NOTRE service)', [/\bcus_\w{4,}/.test(tout), /\bsub_\w{4,}/.test(tout)], [false, false]);
      v('le journal ne dit que l\'événement : un motif court (`abonnement_non_reconnu`, `session_incoherente`, `stripe_echec`), jamais un corps de Stripe ni un espace', [/"evt":"stripe_echec"/.test(journal), /abonnement_non_reconnu/.test(journal), /"e_[0-9a-f]{32}"|opmsg:e_|Entreprise/.test(journal)], [true, true, false]);
      const dirs = h => h.facturation;
      v('/health : le mode et le drapeau de la bêta, rien d\'autre — aucun espace, aucun tarif, aucun chiffre commercial', [dirs(health.j).mode, Object.keys(dirs(health.j)).sort(), typeof health.j.stripeEchecMin], ['test', ['mode', 'toutOuvert'], 'number']);
    }

    /* ═══ 9. LE MODULE, AVEC UN `fetch` ET UNE HORLOGE INJECTÉS ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe module seul : les minutes de panne, la passe qui s\'arrête après trois échecs, une lecture partagée, la clé de production');
    {
      const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-962-'));
      try {
        const h = { t: 1790000000000 };
        const Sm = ouvrir({ chemin: path.join(bac, 'm.db'), scelleur: creerScelleur(crypto.randomBytes(32)), horloge: () => h.t });
        const formuleM = creerFormule({ stockage: Sm, config: { formule: { toutOuvert: false } } });
        const cfg = (o) => ({ facturation: Object.assign({ cle: CLE, mode: 'test', prix: PRIX, affichage: { mensuel: 15, annuel: 150 }, relectureMs: 600000, timeoutMs: 1000, testHote: null }, o || {}) });
        let appels = [], file = [];
        const rep = (statut, corps) => ({ ok: statut < 300, status: statut, json: async () => { if (corps === undefined) throw new Error('pas du JSON'); return corps; } });
        const fetchImpl = async (url, init) => { appels.push({ url, init }); const r = file.length ? file.shift() : rep(500, {}); if (r instanceof Error) throw r; return typeof r === 'function' ? r(url, init) : r; };
        const nouvelle = (o) => creerFacturation({ stockage: Sm, config: cfg(o), formule: formuleM, journaliser: () => {}, horloge: () => h.t, fetchImpl });
        const pers = (nom) => Sm.personneCreer({ identifiant: 'beta:' + nom + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'M', origine: 'beta', verifie: true });
        const abonne = (i) => { const p = pers('M' + i); const e = Sm.espaceCreer({ nom: 'M' + i, proprio: p.id }).id; Sm.abonnementPoser(e, { client: 'cus_mod' + i + 'aaaa', abonnement: 'sub_mod' + i + 'aaaa', statut: 'active', places: 2, fin_periode: null, annule: false, impaye: false }, { adopter: true }); return e; };
        const sbDe = (e, statut) => ({ id: 'sub_mod' + e.slice(2, 6), object: 'subscription', status: statut || 'active', metadata: { opmsg_espace: e, produit: 'opmsg' }, customer: 'cus_modaaaa', items: { data: [{ price: { id: PRIX.mensuel }, quantity: 2 }] }, current_period_end: Math.floor(h.t / 1000) + 86400 });
        const F1 = nouvelle();
        const e1 = abonne(1);
        /* les minutes de panne */
        file.push(new Error('ECONNRESET'));
        let err = null; try { await F1.relire(e1); } catch (e) { err = e.code; }
        v('⛔ un `fetch` qui jette : `reseau`, et c\'est le début d\'une panne (0 minute tout de suite)', [err, F1.echecMin()], ['reseau', 0]);
        h.t += 125 * 60000;
        v('… deux heures plus tard, `stripeEchecMin` dit 125 : c\'est ce que lit la surveillance (elle crie au-delà de 90)', F1.echecMin(), 125);
        file.push(rep(200, sbDe(e1)));
        await F1.relire(e1);
        v('⛔ une lecture réussie remet le compteur à zéro', F1.echecMin(), 0);
        /* chaque forme de réponse */
        const cas = [[rep(500, {}), 'stripe_panne', true], [rep(502, {}), 'stripe_panne', true], [rep(401, {}), 'cle_refusee', true], [rep(403, {}), 'cle_refusee', true], [rep(429, {}), 'trop_de_demandes', true],
          [rep(200, undefined), 'reponse_illisible', true], [rep(200, 'texte'), 'reponse_illisible', true], [rep(400, { error: { message: 'x' } }), 'refus', false]];
        const vu = [];
        for (const [r, code, panne] of cas) { file.push(r); let e2 = null; try { await F1.relire(e1); } catch (x) { e2 = x.code; } h.t += 60000; vu.push([e2, F1.echecMin() > 0 || e2 === null ? (panne ? 'muet' : 'pas muet') : 'pas muet']); if (!panne) { file.push(rep(200, sbDe(e1))); await F1.relire(e1); } else { file.push(rep(200, sbDe(e1))); await F1.relire(e1); } }
        v('⛔ chaque réponse a son code : 5xx → `stripe_panne`, 401 et 403 → `cle_refusee`, 429 → `trop_de_demandes`, pas du JSON → `reponse_illisible`, un autre 4xx → `refus` (une RÉPONSE : notre demande est fausse, ce n\'est pas une panne)', vu.map(x => x[0]), cas.map(x => x[1]));
        /* ⛔ UN 404 SUR UN ABONNEMENT NE LE DIT PAS « RÉSILIÉ » À LUI SEUL (relecture du gardien : la clé d'un AUTRE compte répond 404 à tout, et « résilié » est définitif). L'absence est confirmée quand
           Stripe CONNAÎT le client de l'abonnement et que la liste de ses abonnements ne le contient pas ; sinon le dernier état reste, et la panne se voit (`stripeEchecMin`). */
        const client = (e) => Sm.abonnementLire(e).client, R404 = { error: {} }, listeVide = { object: 'list', data: [], has_more: false };
        const perdu = async (e, reponses) => {
          const avantAppels = appels.length; file.push(...reponses); let err2 = null;
          try { await F1.relire(e); } catch (x) { err2 = x.code; }
          return { statut: Sm.abonnementLire(e).statut, appels: appels.slice(avantAppels).map(x => x.init.method + ' ' + x.url.replace('https://api.stripe.com', '').replace(/(sub|cus)_\w+/, '$1_x').replace(/\?.*$/, '?…')), err: err2 };
        };
        const ok404 = await perdu(e1, [rep(404, R404), rep(200, { id: client(e1), object: 'customer' }), rep(200, listeVide)]);
        v('⛔ un 404 sur l\'abonnement dont Stripe CONNAÎT le client et dont la liste ne le contient pas : absence CONFIRMÉE — résilié (une RÉPONSE, pas une panne : le compteur reste à zéro)', [ok404.statut, F1.echecMin(), ok404.appels], ['canceled', 0, ['GET /v1/subscriptions/sub_x', 'GET /v1/customers/cus_x', 'GET /v1/subscriptions?…']]);
        const e405 = abonne(41), e406 = abonne(42), e407 = abonne(43), e408 = abonne(44), e409 = abonne(45);
        const autreCompte = await perdu(e405, [rep(404, R404), rep(404, R404)]);
        v('⛔ la clé d\'un AUTRE compte (l\'abonnement ET le client répondent 404) : PAS résilié — le dernier état reste (« active »), deux appels seulement', [autreCompte.statut, autreCompte.appels.length, Sm.abonnementLire(e405).places], ['active', 2, 2]);
        h.t += 125 * 60000;
        v('… la panne de configuration se VOIT : au bout de deux heures `stripeEchecMin` dit 125 (la surveillance crie au-delà de 90) — un 404 n\'efface pas l\'alarme', F1.echecMin(), 125);
        const e410 = abonne(46), encore = await perdu(e410, [rep(404, R404), rep(404, R404)]);
        v('⛔ un SECOND espace dont l\'absence n\'est pas confirmée, lu pendant la panne, ne remet PAS le compteur à zéro (un 404 n\'est pas une lecture réussie : sinon chaque passe éteindrait l\'alarme qu\'elle vient d\'allumer)', [encore.statut, F1.echecMin()], ['active', 125]);
        file.push(rep(200, sbDe(e405)));
        await F1.relire(e405);
        v('… et une lecture réussie la remet à zéro', [F1.echecMin(), Sm.abonnementLire(e405).statut], [0, 'active']);
        const dedans = await perdu(e406, [rep(404, R404), rep(200, { id: client(e406), object: 'customer' }), rep(200, { object: 'list', data: [{ id: Sm.abonnementLire(e406).abonnement }], has_more: false })]);
        const pages = await perdu(e407, [rep(404, R404), rep(200, { id: client(e407), object: 'customer' }), rep(200, { object: 'list', data: [], has_more: true })]);
        const muet = await perdu(e408, [rep(404, R404), rep(500, {})]);
        const supprime = await perdu(e409, [rep(404, R404), rep(200, { id: client(e409), object: 'customer', deleted: true })]);
        v('⛔ la liste du client CONTIENT l\'abonnement (Stripe se contredit), ou a plus de cent abonnements (on ne peut pas conclure), ou Stripe ne répond pas à la confirmation : PAS résilié', [dedans.statut, pages.statut, muet.statut], ['active', 'active', 'active']);
        v('un client SUPPRIMÉ chez Stripe ne facture plus rien : l\'absence est confirmée sans lire la liste — résilié', [supprime.statut, supprime.appels.length], ['canceled', 2]);
        const sansClient = Sm.espaceCreer({ nom: 'Sans client', proprio: pers('SC').id }).id;
        Sm.abonnementPoser(sansClient, { client: null, abonnement: 'sub_modsansclient', statut: 'active', places: 1, fin_periode: null, annule: false, impaye: false }, { adopter: true });
        const sc = await perdu(sansClient, [rep(404, R404)]);
        v('un abonnement dont le service ne connaît pas le client ne peut pas être confirmé absent : PAS résilié (rien à demander à Stripe)', [sc.statut, sc.appels.length], ['active', 1]);
        /* (on les résilie à la main : la passe qui suit compte ses cinq espaces, pas ceux de ces cas) */
        for (const e of [e405, e406, e407, e408, e410, sansClient]) Sm.abonnementPoser(e, { client: null, abonnement: Sm.abonnementLire(e).abonnement, statut: 'canceled', places: 0, fin_periode: null, annule: false, impaye: false });
        /* la passe */
        const lot = Array.from({ length: 5 }, (_, i) => abonne(10 + i));
        appels = []; file = [];
        const rt = await F1.relireTous();
        v('⛔ la passe s\'arrête après TROIS échecs de suite (inutile de faire attendre deux cents espaces dix secondes chacun) : 3 lectures tentées sur 5, 3 échecs', [rt, appels.length], [{ ok: 0, ko: 3, total: 5 }, 3]);
        h.t += 61 * 60000;
        v('… et Stripe est dit muet depuis plus d\'une heure', F1.echecMin() >= 60, true);
        appels = []; file = lot.map(e => rep(200, sbDe(e)));
        const rt2 = await F1.relireTous();
        v('la passe suivante, Stripe revenu : tout est relu', [rt2, F1.echecMin()], [{ ok: 5, ko: 0, total: 5 }, 0]);
        for (const e of lot) Sm.abonnementPoser(e, { client: 'cus_x' + e.slice(2, 8), abonnement: Sm.abonnementLire(e).abonnement, statut: 'canceled', places: 0, fin_periode: null, annule: false, impaye: false });
        Sm.abonnementPoser(e1, { client: null, abonnement: Sm.abonnementLire(e1).abonnement, statut: 'canceled', places: 0, fin_periode: null, annule: false, impaye: false });
        appels = []; file = [new Error('x')];
        const vide = await F1.relireTous();
        v('⛔ rien à lire (tout est résilié) : la passe ne tente rien, et « rien ne dépend de Stripe » veut dire plus d\'échec en cours', [vide, appels.length, F1.echecMin()], [{ ok: 0, ko: 0, total: 0 }, 0, 0]);
        /* une lecture partagée */
        const e2 = abonne(30);
        appels = []; file = [async () => { await new Promise(r => setTimeout(r, 60)); return rep(200, sbDe(e2)); }];
        const [x1, x2] = await Promise.all([F1.relire(e2), F1.relire(e2)]);
        v('⛔ deux relectures SIMULTANÉES du même espace partagent UNE lecture chez Stripe', [appels.length, x1.formule, x2.formule], [1, 'pro', 'pro']);
        /* l'adresse de production */
        const FL = nouvelle({ cle: ['rk', 'live', 'BancProdZzQq9X'].join('_'), mode: 'live' });
        const eL = Sm.espaceCreer({ nom: 'Prod', proprio: pers('Prod').id }).id;
        appels = []; file = [rep(200, { id: 'cs_banc_live_1', url: 'https://checkout.stripe.test/c/pay/cs_banc_live_1' })];
        let sans = null; try { await FL.paiement({ espace: eL, places: 1, cycle: undefined, origine: 'https://msg.test', adresse: null }); } catch (x) { sans = x.code; }
        v('⛔ avec une clé de PRODUCTION, pas d\'adresse confirmée = pas de paiement (409 `adresse_requise`) : une facture n\'est pas envoyée à personne — et Stripe n\'est pas appelé', [sans, appels.length], ['adresse_requise', 0]);
        const avec = await FL.paiement({ espace: eL, places: 1, cycle: undefined, origine: 'https://msg.test', adresse: 'patron@exemple-banc.fr' });
        const FA = Object.fromEntries(new URLSearchParams(appels[0].init.body));
        v('… avec une adresse confirmée, elle part (`customer_email`) ; le mode de test, lui, laisse Checkout la demander', [avec.url, FA.customer_email, appels[0].init.method, appels[0].init.headers.Authorization, appels[0].init.redirect], ['https://checkout.stripe.test/c/pay/cs_banc_live_1', 'patron@exemple-banc.fr', 'POST', 'Bearer ' + ['rk', 'live', 'BancProdZzQq9X'].join('_'), 'error']);
        v('chaque appel suit les redirections en ERREUR (un Stripe compromis ne nous mène nulle part) et porte un délai', [typeof appels[0].init.signal, appels[0].url], ['object', 'https://api.stripe.com/v1/checkout/sessions']);
        /* le rythme par défaut suit ce qui est configuré */
        const FM = nouvelle({ prix: { annuel: PRIX.annuel } });
        const eA = Sm.espaceCreer({ nom: 'Annuel seul', proprio: pers('An').id }).id;
        appels = []; file = [rep(200, { id: 'cs_banc_an_1', url: 'https://checkout.stripe.test/c/pay/cs_banc_an_1' })];
        await FM.paiement({ espace: eA, places: 1, origine: 'https://msg.test', adresse: null });
        v('une configuration qui ne vend que l\'annuel : c\'est le rythme par défaut ; « mensuel » est alors inconnu', [Object.fromEntries(new URLSearchParams(appels[0].init.body))['line_items[0][price]'], await (async () => { try { await FM.paiement({ espace: eA, places: 1, cycle: 'mensuel', origine: 'https://msg.test', adresse: null }); return null; } catch (x) { return x.code; } })()], [PRIX.annuel, 'offre_inconnue']);
        /* sans clé : inerte */
        const FI = nouvelle({ cle: null, mode: 'inerte' });
        appels = [];
        const inerte = [await FI.offres(), (() => { try { FI.demarrer(); return 'ok'; } catch (x) { return x.code; } })(), await FI.relire(e1).catch(x => x.code), await FI.paiement({ espace: e1, places: 1, origine: 'x', adresse: null }).catch(x => x.code), await FI.portail({ espace: e1, origine: 'x' }).catch(x => x.code)];
        v('⛔ SANS CLÉ tout est inerte et le dit : les offres « pas ouvert », aucune minuterie, relire / payer / portail refusent `abonnement_non_ouvert` — et aucun appel réseau', [inerte[0].ouvert, inerte[0].motif, inerte[1], inerte[2], inerte[3], inerte[4], appels.length], [false, 'abonnement_pas_ouvert', 'ok', 'abonnement_non_ouvert', 'abonnement_non_ouvert', 'abonnement_non_ouvert', 0]);
        F1.arreter(); FM.arreter(); FL.arreter(); FI.arreter();
        /* la lecture d'un abonnement, pure */
        const L = F1.lireAbonnement;
        const e9 = 'e_' + 'a'.repeat(32), bon = { id: 'sub_abcdef', object: 'subscription', status: 'active', metadata: { opmsg_espace: e9, produit: 'opmsg' }, customer: { id: 'cus_abcdef' }, cancel_at_period_end: true, current_period_end: 1800000000, items: { data: [{ price: { id: PRIX.mensuel }, quantity: 3 }] } };
        v('lire un abonnement : le nôtre (métadonnée, tarif) rend ses places, son échéance en millisecondes, son annulation', (() => { const r = L(bon, e9); return [r.abonnement, r.client, r.statut, r.places, r.fin_periode, r.annule, r.impaye]; })(), ['sub_abcdef', 'cus_abcdef', 'active', 3, 1800000000000, true, false]);
        v('⛔ pas le nôtre — rien : un autre espace, un autre produit, une métadonnée absente, un autre tarif, un objet qui n\'est pas un abonnement, un identifiant mal formé', [L(bon, 'e_' + 'b'.repeat(32)), L(Object.assign({}, bon, { metadata: { opmsg_espace: e9, produit: 'autre' } }), e9), L(Object.assign({}, bon, { metadata: {} }), e9), L(Object.assign({}, bon, { items: { data: [{ price: { id: AUTRE_PRIX }, quantity: 3 }] } }), e9), L({ object: 'invoice' }, e9), L(Object.assign({}, bon, { id: 'sub_' }), e9), L(null, e9)], Array(7).fill(null));
        v('des quantités absurdes comptent pour UNE place par ligne (0, négative, décimale, texte) ; la somme est bornée', [0, -3, 1.5, '4', null].map(q => L(Object.assign({}, bon, { items: { data: [{ price: { id: PRIX.mensuel }, quantity: q }] } }), e9).places), [1, 1, 1, 1, 1]);
        v('l\'échéance se lit à l\'ancienne place (l\'abonnement) puis à la nouvelle (la ligne) : le compte Stripe fixe la version de son API, pas nous', [L(Object.assign({}, bon, { current_period_end: undefined, items: { data: [{ price: { id: PRIX.mensuel }, quantity: 1, current_period_end: 1900000000 }] } }), e9).fin_periode, L(Object.assign({}, bon, { current_period_end: undefined }), e9).fin_periode], [1900000000000, null]);
        Sm.fermer();
      } finally { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (x) { /* déjà parti */ } }
    }
  } catch (er) {
    console.log('  ✗ le banc est mort : ' + (er && er.stack || er));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  try { S.fermer(); } catch (x) { /* déjà fermé */ }
  await svc.arreter(); await fake.fermer();
  fin();
})();
