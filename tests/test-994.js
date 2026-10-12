/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE ET LE SERVICE SE PARLENT : LES RÉUNIONS SONT À PRO, UN PERSO Y ENTRE PAR LE LIEN, UNE RÉUNION COMPTE DIX PERSONNES AU PLUS (famille 4 ; modèles `test-976` et `test-990`).

   Justin, 12 octobre 2026 : « Perso, c'est simple. C'est appel, message, et c'est tout… mais pas de réunion » ; Perso+ — « le retirer » ; « un Pro peut inviter des Persos à des réunions, mais que par lien ».
   Les VRAIES fonctions de `server-msg/public/api.js` et de `server-msg/public/source-serveur.js` (le module que la page appelle) sont exécutées dans Node contre le VRAI service — formule de PRODUCTION, un faux
   Stripe en boucle locale —, chaque personne étant un « appareil de poche » (cookie, Origin, flux). Ce que ni `test-992` (les routes seules) ni la sonde (le DOM) ne voient :
     · LE CONTRAT : plus aucune capacité ni méthode Perso+ ; `reunionPlafond` et chaque méthode que la page appelle ; une formule inconnue (un service d'avant qui dirait « perso_plus ») est lue « perso », jamais « pro » ;
     · LE REFUS D'ORGANISER SE DIT : `ErreurApi.offre` « pro », `raison` (perso / impaye / organisateur), `abonnementOuvert` — et la PHRASE dit ce que le service tient (les réunions sont à Pro, on y entre par le
       lien), n'écrit aucun prix ; une offre d'avant (« perso_plus ») n'est pas reconnue ;
     · UN PRO INVITE UN PERSO : `programmer()` et `inviterReunion()` rendent `parLien` (combien n'ont PAS été invités en leur nom), la fiche ne les compte pas, et le lien de la réunion se lit (l'hôte) et s'ouvre
       (l'aperçu, pour la personne Perso) ;
     · LE PLAFOND DE DIX PERSONNES : la page le LIT chez le service (`plafondReunion()`, la fiche d'une réunion), la onzième personne est refusée avec une phrase qui nomme le plafond ;
     · LA FEUILLE « SUPPRIMER MON COMPTE » ne parle plus d'abonnement personnel — lue dans le code de la page, le DOM étant joué par la sonde.
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
const METHODES = ['plafondReunion', 'espaces', 'programmer', 'reunion', 'reunions', 'inviterReunion', 'lienReunion', 'apercuReunion', 'supprimerCompte'];
const CLE = ['rk', 'test', 'BancPageProZzQq9X'].join('_');
const PRIX_PRO = { mensuel: 'price_BancPageProMensuelA1', annuel: 'price_BancPageProAnnuelB2' };
const JOUR = 86400000;
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const PHRASE_PERSO = 'Les réunions sont réservées à Messages Pro. Sans Pro, tu entres dans une réunion par le lien que son organisateur t\'envoie.';

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

(async () => {
  const MDP = { alice: 'pw-alice-1234', bob: 'pw-bob-123456', cleo: 'pw-cleo-12345', dan: 'pw-dan-123456' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  const fake = await fauxStripe();
  fake.poserTarif(PRIX_PRO.mensuel); fake.poserTarif(PRIX_PRO.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
  const quotas = { relire: { max: 1000, fenetreMs: 3600000 }, paiement: { max: 1000, fenetreMs: 3600000 }, portail: { max: 1000, fenetreMs: 3600000 }, reunion: { max: 1000, fenetreMs: 3600000 } };
  const env = { OPMSG_TEST_STRIPE: fake.hote };
  /* un service à la formule de PRODUCTION avec Messages Pro à vendre, et un autre SANS clé Stripe (rien ne se vend) */
  const svc = await T.lancerService({ urlGestion: og.url, config: { formule: { toutOuvert: false }, facturation: { cle: CLE, prix: PRIX_PRO, relectureMs: 3600000, timeoutMs: 3000 }, quotas }, env });
  const svcI = await T.lancerService({ urlGestion: og.url, config: { formule: { toutOuvert: false }, quotas }, env });
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
    const espacePro = (p, places) => { const e = S.espaceCreer({ nom: 'Pro ' + crypto.randomBytes(2).toString('hex'), proprio: p.id }).id; S.abonnementPoser(e, { client: 'cus_b994' + e.slice(2, 8), abonnement: 'sub_b994' + e.slice(2, 10), statut: 'active', places: places || 5, fin_periode: null, annule: false, impaye: false }, { adopter: true }); return e; };
    const entrer = (e, par, uid) => { const code = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code), genre: 'espace', cible: e, par, ttlMs: JOUR, max: 5 }); return S.invitationAccepter({ h: sha(code), uid, max: Infinity }); };
    return { S, pers, espacePro, entrer };
  }
  const postes = (re) => fake.appels.filter(a => a.m === 'POST' && re.test(a.chemin)).length;
  const corpsR = (o) => Object.assign({ titre: 'Point ' + crypto.randomBytes(2).toString('hex'), debut: '2026-12-08T14:00', fin: '2026-12-08T15:00', tz: 'Europe/Paris' }, o || {});

  try {
    const B = base(svc);
    const A = monter(svc), Bo = monter(svc), C = monter(svc), D = monter(svc), I = monter(svcI);
    const alice = await A.entrer('alice'), bob = await Bo.entrer('bob'), cleo = await C.entrer('cleo'), dan = await D.entrer('dan'), ida = await I.entrer('bob');
    /* Alice tient un espace Pro (soixante places) et Cleo en est membre ; Bob et Dan sont Perso, contacts d'Alice */
    const EA = B.espacePro({ id: alice.id }, 60);
    B.entrer(EA, alice.id, cleo.id);
    B.S.contactLier(alice.id, bob.id); B.S.contactLier(alice.id, dan.id);

    /* ═══ 1. LE CONTRAT ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Le contrat : plus rien de Perso+, la capacité `reunionPlafond`, les méthodes de la page, une formule inconnue lue « perso »');
    {
      vrai('population : quatre personnes sont entrées par le module sur le service qui vend Messages Pro, et une sur le service sans clé Stripe', new Set([alice.id, bob.id, cleo.id, dan.id]).size === 4 && !!ida.id);
      v('⛔ le module n\'annonce plus la capacité `persoPlus`, ni aucune méthode Perso+ — il annonce `reunionPlafond` et `reunions`', [A.src.capacites.persoPlus, Object.keys(A.src).filter(k => /persoPlus/i.test(k)), A.src.capacites.reunionPlafond, A.src.capacites.reunions], [undefined, [], true, true]);
      v('chaque méthode que la page appelle existe', METHODES.filter(k => typeof A.src[k] !== 'function'), []);
      v('`ErreurApi` porte `offre` « pro » et `abonnementOuvert` : un refus d\'abonnement lu du corps du service', (() => { const e = new OPMSG.ErreurApi('formule_requise', 402, 0, { raison: 'perso', offre: 'pro', abonnement_ouvert: true }); return [e.offre, e.raison, e.abonnementOuvert]; })(), ['pro', 'perso', true]);
      v('⛔ … et un champ qui n\'a pas la forme attendue n\'existe pas : l\'offre d\'avant (« perso_plus »), une offre inventée, une raison inventée ne sont pas rendues', (() => { const r = []; for (const x of [{ raison: 'perso', offre: 'perso_plus', abonnement_ouvert: true }, { raison: 'gratuit_pour_tous', offre: 'tout_gratuit', abonnement_ouvert: 'oui' }]) { const e = new OPMSG.ErreurApi('formule_requise', 402, 0, x); r.push([e.offre, e.raison, e.abonnementOuvert]); } return r; })(), [['', 'perso', true], ['', '', false]]);
      const ancien = monter(svc, { reecrire: (m, chemin) => (m === 'GET' && chemin === '/api/espaces') ? { statut: 200, corps: { espaces: [], formule: 'perso_plus', organiser: true, abonnement_ouvert: true } } : null });
      await ancien.entrer('bob');
      const ea = await ancien.src.espaces();
      v('⛔ un service d\'AVANT qui dirait « perso_plus » : la formule est lue « perso », jamais « pro » — et `organiser` reste ce que le service dit (c\'est lui qui décide)', [ea.formule, ea.organiser], ['perso', true]);
    }

    /* — les trois raisons d'un refus d'organiser se DISENT, chacune par sa phrase, sans prix — */
    {
      const dit = (raison) => new OPMSG.ErreurApi('formule_requise', 402, 0, { raison, offre: 'pro', abonnement_ouvert: true }).phrase();
      v('⛔ Perso et impayé : « les réunions sont réservées à Messages Pro », et on y entre par le lien ; un outil d\'organisateur dans un appel de groupe : « réservé aux réunions » — aucun prix',
        [dit('perso'), dit('impaye'), dit('organisateur'), [dit('perso'), dit('impaye'), dit('organisateur')].some(t => /\d\s*€|euro/i.test(t))],
        [PHRASE_PERSO, PHRASE_PERSO, 'Cet outil est réservé aux réunions : l\'organisateur de cet appel n\'a pas Messages Pro.', false]);
      const vieux = new OPMSG.ErreurApi('formule_requise', 402, 0, { raison: 'perso', offre: 'perso_plus', abonnement_ouvert: true });
      v('… et un refus d\'avant (offre « perso_plus ») retombe sur la phrase générique de Messages Pro — jamais une promesse de forfait qui n\'existe plus', [vieux.phrase(), /Perso\+|forfait/i.test(vieux.phrase())], ['Cette fonction fait partie de Messages Pro.', false]);
    }

    /* ═══ 2. PROGRAMMER SANS PRO : LE REFUS SE DIT ═══════════════════════════════════════════════════════════════ */
    console.log('\nProgrammer une réunion sans Messages Pro : le refus est dit en français, il propose Messages Pro et dit qu\'on entre par le lien');
    {
      const esp = await Bo.src.espaces();
      v('population : `espaces()` dit que Bob (Perso) ne peut pas organiser, et qu\'Alice (Pro) le peut', [esp.formule, esp.organiser, (await A.src.espaces()).organiser], ['perso', false, true]);
      const n0 = postes(/checkout\/sessions$/);
      const er = await attrape(Bo.src.programmer(corpsR()));
      v('⛔ Bob (Perso) programme : refusé — `formule_requise`, l\'offre « pro », la raison « perso », le bouton « S\'abonner » mènerait quelque part (Messages Pro se vend)', [codeDe(er), er && er.offre, er && er.raison, er && er.abonnementOuvert], ['formule_requise', 'pro', 'perso', true]);
      v('⛔ … la PHRASE dit la règle (les réunions sont à Pro, on y entre par le lien) et n\'écrit aucun prix', [phrase(er), /\d\s*€|euro/i.test(phrase(er))], [PHRASE_PERSO, false]);
      v('population : le refus n\'a rien ouvert chez Stripe (aucune session) ni rien écrit (l\'agenda de Bob est vide)', [postes(/checkout\/sessions$/) - n0, (await Bo.src.reunions(Date.parse('2026-12-01T00:00:00Z'), Date.parse('2026-12-20T00:00:00Z'))).length], [0, 0]);
      const iner = await attrape(I.src.programmer(corpsR()));
      v('⛔ sur le service SANS clé Stripe : le refus ne propose AUCUN bouton mort — `abonnementOuvert` est faux', [codeDe(iner), iner && iner.offre, iner && iner.abonnementOuvert], ['formule_requise', 'pro', false]);
    }

    /* ═══ 3. UN PRO INVITE UN PERSO : PAR LE LIEN ════════════════════════════════════════════════════════════════ */
    console.log('\nUn Pro invite un Perso : il n\'est pas invité en son nom, la page apprend combien passent par le lien, et le lien s\'ouvre');
    {
      const r = await A.src.programmer(corpsR({ titre: 'Avec Bob', invites: [bob.id, cleo.id] }));
      const fiche = await A.src.reunion(r.id);
      v('⛔ Alice (Pro) invite Bob (Perso) et Cleo (Pro) : `parLien` 1, aucun refusé — la fiche porte Alice et Cleo, pas Bob', [/^r_[0-9a-f]{32}$/.test(r.id), r.parLien, r.nonInvites, fiche.invites.map(i => i.id).sort()], [true, 1, 0, [alice.id, cleo.id].sort()]);
      const inv = await A.src.inviterReunion(r.id, [dan.id]);
      v('⛔ « Inviter » Dan (Perso) : personne n\'est ajouté, `parLien` 1 — la fiche garde ses deux personnes', [inv.ajoutes, inv.parLien, inv.nonAjoutes, (await A.src.reunion(r.id)).invites.length], [0, 1, 0, 2]);
      const inv2 = await A.src.inviterReunion(r.id, [cleo.id]);
      v('contre-épreuve : réinviter Cleo (Pro, déjà là) ne passe jamais par le lien (`parLien` 0)', inv2.parLien, 0);
      const code = await A.src.lienReunion(r.id);
      const ap = await Bo.src.apercuReunion(code);
      v('… Alice lit le LIEN de la réunion, et Bob (Perso) l\'ouvre : l\'aperçu dit le titre — c\'est par là qu\'il entre', [typeof code === 'string' && code.length > 10, ap && ap.titre], [true, 'Avec Bob']);
      const vu = await attrape(Bo.src.reunion(r.id));
      v('… et tant qu\'il n\'est pas entré par le lien, la réunion lui reste inconnue (il n\'a pas été invité en son nom)', [!!vu, vu && vu.code], [true, 'reunion_introuvable']);
      /* la page DIT à l'organisatrice qu'il faut envoyer le lien : la phrase est dans le code servi (le DOM se joue dans la sonde) */
      const code_ = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'public', 'opmsg-ui.js'), 'utf8'));
      vrai('⛔ la page lit `parLien` après « Programmer » et après « Inviter », et le dit (« envoie-lui le lien de la réunion »)', /r\.parLien \? 'Réunion programmée/.test(code_) && /r\.parLien \? 'Cette personne n\\'a pas Messages Pro : envoie-lui le lien de la réunion'/.test(code_));
    }

    /* ═══ 4. LE PLAFOND DE DIX PERSONNES ══════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne réunion compte au plus dix personnes : la page le LIT chez le service, la onzième est refusée avec une phrase qui nomme le plafond');
    {
      v('`plafondReunion()` : le chiffre du service (dix) — la page ne l\'écrit nulle part', await A.src.plafondReunion(), 10);
      const nCfg = () => A.reseau.requetes.filter(r => r.m === 'GET' && r.chemin === '/api/config').length, c0 = nCfg();
      await A.src.plafondReunion();
      v('… lu UNE fois : une seconde demande ne retourne pas au service (`GET /api/config` n\'est pas redemandé)', nCfg() - c0, 0);
      /* la foule : des membres de l'espace Pro d'Alice — Pro, donc invitables en leur nom (le plafond se mesure sans que `par_lien` s'en mêle) */
      const foule = []; for (let i = 0; i < 11; i++) { const p = B.pers('Foule'); B.entrer(EA, alice.id, p.id); foule.push(p); }
      const onze = await attrape(A.src.programmer(corpsR({ titre: 'Onze', invites: foule.slice(0, 10).map(p => p.id) })));
      v('⛔ Alice (Pro) invite DIX personnes : avec elle, c\'est la onzième — refus `reunion_pleine`, le plafond (10) est LU du corps du service et dit dans la phrase', [codeDe(onze), onze && onze.max, phrase(onze)], ['reunion_pleine', 10, 'Une réunion compte 10 personnes au plus, organisateur compris : celle-ci est complète.']);
      const dix = await A.src.programmer(corpsR({ titre: 'Dix', invites: foule.slice(0, 9).map(p => p.id) }));
      const fiche = await A.src.reunion(dix.id);
      v('contre-épreuve : NEUF invités + l\'organisatrice = dix personnes passent (aucun par le lien) — la fiche porte son plafond (10) et ses dix participants', [dix.parLien, fiche.plafond, fiche.invites.length], [0, 10, 10]);
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

    /* ═══ 5. LA PAGE NE PARLE PLUS DE PERSO+ ══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa page ne parle plus de Perso+ : ni feuille, ni abonnement personnel, ni retour de paiement — « Réunions » dit la règle et mène à Messages Pro');
    {
      const code = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'public', 'opmsg-ui.js'), 'utf8'));
      const debut = code.indexOf('async function rendreSuppression'), finF = code.indexOf("$('info-corps').addEventListener('change'", debut);
      const feuille = debut > 0 && finF > debut ? code.slice(debut, finF) : '';
      vrai('population : la fonction qui peint la feuille « Supprimer mon compte » est trouvée dans le code servi (une tranche vide passerait au vert sur tout)', feuille.length > 1500);
      vrai('⛔ la feuille « Supprimer mon compte » ne parle plus d\'abonnement personnel (ni « Ton abonnement », ni « renouvelé », ni la capacité)', !/persoPlus|Ton abonnement|renouvel/.test(feuille));
      v('⛔ le code servi de la page ne nomme plus Perso+ nulle part : capacité, méthodes, feuille, retour de Stripe', (code.match(/persoPlus|perso_plus|Perso\+|reg-pp|sp-abonnement/g) || []), []);
      const rp = code.indexOf('function rendreReunionsPro'), rpFin = code.indexOf('function ', rp + 30), corps = rp > 0 ? code.slice(rp, rpFin) : '';
      vrai('⛔ la feuille « Réunions » (ce que voit une personne Perso qui veut programmer) dit la règle — les réunions font partie de Messages Pro, Perso a les appels et les appels de groupe, on entre par le lien — et mène à Messages Pro (l\'espace d\'entreprise), sans prix',
        corps.length > 300 && /Les réunions font partie de Messages Pro/.test(corps) && /appels de groupe en audio comme en vidéo/.test(corps) && /lien que son organisateur/.test(corps) && /data-rp="entreprise"/.test(corps) && !/€|euro/.test(corps));
      vrai('… et un refus `formule_requise` (offre « pro ») d\'une programmation mène à cette feuille', /er\.code === 'formule_requise' && er\.offre === 'pro'\) \{ basculerFeuille\('reunions-pro'\)/.test(code));
    }
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêté */ } }
    for (const S of bases) { try { S.fermer(); } catch (e) { /* déjà fermé */ } }
    await svc.arreter(); await svcI.arreter(); await fake.fermer(); await og.fermer();
  }
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; process.exit(1); });
