/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE ET LE SERVICE SE PARLENT, POUR LES ESPACES PROFESSIONNELS, LES CANAUX ET MESSAGES PRO (famille 4, modèle `test-958`).

   Les VRAIES fonctions de `server-msg/public/api.js` et de `server-msg/public/source-serveur.js` (le module que la page appelle) sont exécutées dans Node contre le VRAI service — deux fois :
   la bêta (tout ouvert : les espaces, les invitations, les canaux, les rôles se jouent sans payer) et un service à la formule de PRODUCTION contre un faux Stripe (ce qui n'est pas payé est refusé).
   Chaque personne est un « appareil de poche » (cookie, Origin) qui entre par la porte bêta, comme sur la page.

   Ce qu'il garde, et que ni `test-961` (les routes seules) ni la sonde (le DOM) ne voient :
     · LE CONTRAT : le module annonce la capacité `espaces` et porte chaque méthode que la page appelle ; AUCUNE méthode ne cherche quelqu'un par son nom (« Contacts de l'entreprise » n'est pas un annuaire) ;
     · UN ESPACE SE CRÉE, SE RENOMME, SE PARTAGE PAR UN LIEN (aperçu, acceptation, une seconde fois = « déjà ») ; les autres membres l'apprennent EN DIRECT (événement `espaces`) ;
     · « CONTACTS DE L'ENTREPRISE » : les membres de MON espace, leur rôle, le propriétaire, qui je suis — rien d'autre que ce que la page montre (ni adresse, ni numéro) ; un non-membre reçoit « introuvable » et
       ne voit RIEN ; un collègue peut écrire à un collègue sans être son contact ;
     · LES CANAUX : une conversation de type `canal` qui dit son espace et s'il est privé, avec son nom, ses membres, ses messages système (« a créé le canal ») ; public = tous les membres de l'espace,
       privé = ceux qu'on y met (un autre ne le voit pas, l'ajouter le lui montre, le retirer le lui retire EN DIRECT) ; un canal public ne se compose pas à la main ; renommer, supprimer ;
     · LES RÔLES : nommer un administrateur, seul le propriétaire rétrograde ou retire un administrateur, passer la propriété, quitter, dissoudre ;
     · TOUT REFUS SE DIT (`dit`, une phrase française) ; une fonction Pro refusée porte POURQUOI à l'administrateur seul (`raison`) et ne retire RIEN ;
     · MESSAGES PRO : les offres, l'état (sans réseau), payer (une adresse https de Stripe — et rien d'autre : une adresse `http:` ou `javascript:` est refusée par le module), « J'ai réglé — vérifier »
       relit chez Stripe, le portail, l'impayé (sursis puis suspension, rien n'est retiré), seul le propriétaire paie, un membre ne lit même pas l'état.
   Toute attente est au GESTE (on sonde la condition), jamais au chronomètre ; les négatifs se prouvent par SENTINELLE. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const JOUR = 86400000;
const CLE = ['rk', 'test', 'BancPageZzQq9X'].join('_');
const PRIX = { mensuel: 'price_BancPageMensuelAa01', annuel: 'price_BancPageAnnuelBb02' };
const METHODES = ['espaces', 'espace', 'espaceCreer', 'espaceRenommer', 'espaceTransferer', 'espaceQuitter', 'espaceDissoudre', 'espaceContacts', 'membreRole', 'membreRetirer', 'invitationCreer', 'invitationsRevoquer',
  'invitationLire', 'invitationAccepter', 'canalCreer', 'canalRenommer', 'canalSupprimer', 'canalAjouterMembres', 'canalRetirerMembre', 'abonnementOffres', 'abonnement', 'abonnementPayer', 'abonnementPortail', 'abonnementRelire'];

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

(async () => {
  const MDP = { alice: 'pw-alice-1234', bob: 'pw-bob-123456', cleo: 'pw-cleo-12345', dan: 'pw-dan-123456' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  const fake = await fauxStripe({ prix: Object.values(PRIX) });
  const svcA = await T.lancerService({ urlGestion: og.url });
  const svcB = await T.lancerService({ urlGestion: og.url, config: { formule: { toutOuvert: false }, facturation: { cle: CLE, prix: PRIX, affichage: { mensuel: 15, annuel: 150 }, relectureMs: 3600000, timeoutMs: 3000 },
    quotas: { relire: { max: 1000, fenetreMs: 10000 }, paiement: { max: 1000, fenetreMs: 3600000 }, portail: { max: 1000, fenetreMs: 3600000 }, lien: { max: 1000, fenetreMs: 3600000 }, canal: { max: 1000, fenetreMs: 3600000 } } }, env: { OPMSG_TEST_STRIPE: fake.hote } });
  const sources = [];
  const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };

  /* un « appareil » : un navigateur de poche (cookie, Origin) et le module de la page branché dessus ; `reecrire` peut modifier la réponse d'une route (pour éprouver une réponse que le service ne rend pas) */
  function monter(svc, opts) {
    const o = opts || {};
    const nav = T.navigateur(svc.base);
    const reseau = { requetes: [] };
    const f = async (url, init) => {
      const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(svc.base, '').split('?')[0];
      reseau.requetes.push({ m, chemin });
      const r = await nav.fetch(url, init);
      if (o.reecrire && o.reecrire.re.test(m + ' ' + chemin)) return new Response(JSON.stringify(o.reecrire.corps), { status: 200, headers: { 'Content-Type': 'application/json' } });
      return r;
    };
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
    const evs = [], morts = [];
    src.ecouter(e => evs.push(e));
    src.surSessionMorte(m => morts.push(m));
    sources.push(src);
    return { src, evs, morts, reseau, nav,
      async entrer(login) { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); return src.moi(); },
      attendreEv: (pred) => att(() => evs.some(pred)), vider: () => { evs.length = 0; } };
  }
  const phrase = (e) => e && e.dit ? e.phrase() : '';
  const codeDe = (e) => e ? e.code : null;

  try {
    /* ═══ 1. LE CONTRAT ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Le contrat : la capacité `espaces`, les méthodes de la page, et pas de recherche par nom');
    const A = monter(svcA), B = monter(svcB), C = monter(svcA), D = monter(svcA);
    const alice = await A.entrer('alice'), bob = await C.entrer('bob'), cleo = await D.entrer('cleo');
    {
      v('le module annonce la capacité `espaces`', A.src.capacites.espaces, true);
      v('chaque méthode que la page appelle existe', METHODES.filter(k => typeof A.src[k] !== 'function'), []);
      /* ⛔ UNE exception déclarée : `chercher` (« Retrouver », 9 octobre 2026) cherche dans les MESSAGES d'UNE conversation dont on est membre (garde M), jamais une personne —
         lu dans le CODE : la source passe un identifiant de conversation, l'API vise `/api/conversations/:id/messages/chercher`. Une autre méthode qui cherche fait tomber ce contrôle. */
      const SRC_TXT = require('fs').readFileSync(path.join(T.SERVICE, 'public', 'source-serveur.js'), 'utf8'), API_TXT = require('fs').readFileSync(path.join(T.SERVICE, 'public', 'api.js'), 'utf8');
      const chercherMessages = /async function chercher\(id, q, avant\) \{[^]*?await A\.chercher\(id, t, avantDe\(avant\)\)/.test(SRC_TXT)
        && /chercher: \(id, q, avant\) => appel\('GET', '\/api\/conversations\/' \+ e\(id\) \+ '\/messages\/chercher' \+ rq\(\{ q, avant_seq: avant \}\)\)/.test(API_TXT);
      v('⛔ « Contacts de l\'entreprise » n\'est pas un annuaire : aucune méthode ne cherche quelqu\'un par son nom (ni « rechercher », ni « annuaire », ni « trouver ») — seule `chercher`, qui vise les messages d\'UNE conversation',
        [Object.keys(A.src).filter(k => /recherch|annuaire|trouver|chercher/i.test(k) && k !== 'chercher'), chercherMessages], [[], true]);
      vrai('population : trois personnes sont entrées par la porte bêta', !!alice.id && !!bob.id && !!cleo.id && new Set([alice.id, bob.id, cleo.id]).size === 3);
    }

    /* ═══ 2. UN ESPACE SE CRÉE, SE RENOMME, SE LISTE ══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn espace se crée, se renomme, se liste');
    let E = null;
    {
      const vide = await A.src.espaces();
      v('au départ : aucun espace, une formule', [vide.espaces, vide.formule], [[], 'pro']);
      const d = await A.src.espaceCreer('Atelier Banc');
      E = d.id;
      v('créer un espace : il porte son nom, je suis propriétaire ET administrateur, seul membre, aucun canal', [d.nom, d.proprio, d.role, d.moiAdmin, d.membres, d.canaux, /^e_[0-9a-f]{32}$/.test(d.id)], ['Atelier Banc', true, 'admin', true, 1, [], true]);
      const l = await A.src.espaces();
      v('la liste le dit : propriétaire, administrateur, un membre', l.espaces.map(x => [x.nom, x.proprio, x.moiAdmin, x.membres]), [['Atelier Banc', true, true, 1]]);
      const r = await A.src.espaceRenommer(E, '  Atelier Banc Bis  ');
      v('renommer : le service retient le nom nettoyé', r.nom, 'Atelier Banc Bis');
      const e = await attrape(A.src.espaceCreer('   '));
      v('⛔ un nom vide est refusé et le refus SE DIT (code `champ_invalide`, une phrase française)', [codeDe(e), e && e.dit, phrase(e)], ['champ_invalide', true, 'Une information est incorrecte ou manquante.']);
      const e2 = await attrape(C.src.espaceRenommer(E, 'Piratage'));
      v('⛔ un NON-MEMBRE ne renomme rien : « introuvable » (la même réponse qu\'un espace qui n\'existe pas)', [codeDe(e2), e2 && e2.statut], ['introuvable', 404]);
    }

    /* ═══ 3. UN LIEN D'INVITATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn lien d\'invitation : l\'aperçu, l\'acceptation, « déjà », et les autres l\'apprennent en direct');
    {
      A.vider();
      const inv = await A.src.invitationCreer(E);
      vrai('le lien : un code long, une échéance dans environ 7 jours, un nombre de places', /^[A-Za-z0-9_-]{22}$/.test(inv.code) && Math.abs(inv.expireLe - (Date.now() + 7 * JOUR)) < 3600000 && inv.max >= 1);
      const a = await C.src.invitationLire(inv.code);
      v('l\'aperçu (Bob) dit QUI invite et DANS QUEL espace — et n\'accepte rien', [a.de, a.espace.nom, a.espace.membres, (await A.src.espace(E)).membres], ['Alice Banc', 'Atelier Banc Bis', 1, 1]);
      const e = await attrape(C.src.invitationLire('A'.repeat(22)));
      v('un code inconnu : « lien invalide » (410), dit', [codeDe(e), e && e.statut, phrase(e)], ['lien_invalide', 410, 'Ce lien n\'est plus valable (expiré, révoqué ou déjà utilisé).']);
      A.vider();      // ⛔ ce qu'Alice a reçu en CRÉANT le lien (le module prévient la page de ses propres gestes) ne compte pas : seul ce que le SERVICE lui dit quand Bob entre doit arriver
      const r = await C.src.invitationAccepter(inv.code);
      v('accepter : Bob rejoint l\'espace', [r.deja, r.espace.id, r.espace.nom], [false, E, 'Atelier Banc Bis']);
      const r2 = await C.src.invitationAccepter(inv.code);
      v('⛔ une seconde acceptation ne consomme rien : « déjà »', [r2.deja, (await A.src.espace(E)).membres], [true, 2]);
      vrai('⛔ Alice l\'apprend SANS recharger : l\'événement `espaces` de cet espace arrive', !!(await A.attendreEv(e2 => e2.type === 'espaces' && e2.id === E)));
      vrai('Bob a l\'espace dans ses espaces (membre simple, pas propriétaire)', (await C.src.espaces()).espaces.some(x => x.id === E && !x.proprio && !x.moiAdmin && x.role === 'membre'));
      const n = await A.src.invitationsRevoquer(E);
      v('révoquer les liens : le nombre révoqué, et un lien révoqué ne se lit plus', [n, codeDe(await attrape(D.src.invitationLire(inv.code)))], [1, 'lien_invalide']);
    }

    /* ═══ 4. « CONTACTS DE L'ENTREPRISE » ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n« Contacts de l\'entreprise » : les membres de MON espace, et personne d\'autre');
    {
      const c = await C.src.espaceContacts(E);
      v('Bob lit les deux membres : leur rôle, le propriétaire, qui il est', c.contacts.map(p => [p.nom, p.role, p.proprio, p.moi]), [['Alice Banc', 'admin', true, false], ['Bob Banc', 'membre', false, true]]);
      vrai('chaque ligne a de quoi s\'afficher (nom, initiales, couleur) — et rien d\'autre : ni adresse, ni numéro, ni identifiant de connexion', c.contacts.every(p => p.nom && p.initiales && Number.isInteger(p.avatar)) && !/@|beta:|\+\d{6}/.test(JSON.stringify(c)));
      v('l\'espace est nommé', c.espace.nom, 'Atelier Banc Bis');
      const e = await attrape(D.src.espaceContacts(E)), e2 = await attrape(D.src.espace(E));
      v('⛔ Cléo, qui n\'est PAS membre, ne voit RIEN : ni les contacts, ni l\'espace (« introuvable », la même réponse qu\'un espace qui n\'existe pas)', [codeDe(e), codeDe(e2), e.statut, e2.statut], ['introuvable', 'introuvable', 404, 404]);
      const e3 = await attrape(D.src.espaceContacts('e_' + '0'.repeat(32)));
      v('… exactement ce que répond un espace INEXISTANT', [codeDe(e3), e3.statut, phrase(e3) === phrase(e)], ['introuvable', 404, true]);
      v('Cléo n\'a aucun espace', (await D.src.espaces()).espaces, []);
      /* des collègues se parlent sans être contacts : Alice écrit à Bob par « Écrire » */
      const cid = await A.src.ouvrirDirecte(bob.id);
      const m = await A.src.envoyer(cid, { texte: 'Salut, collègue' });
      vrai('⛔ un collègue écrit à un collègue SANS être son contact : la conversation s\'ouvre et le message part', typeof cid === 'string' && !!m.id);
      vrai('… et Bob le reçoit (la conversation est dans sa liste, avec le message)', !!(await att(async () => (await C.src.lister(true)).some(x => x.id === cid && /Salut/.test(x.apercu)))));
      const e4 = await attrape(D.src.ouvrirDirecte(bob.id));
      v('⛔ une personne d\'un AUTRE espace n\'écrit pas à Bob (ni contact, ni collègue) : refusé, et dit', [e4 && e4.dit, phrase(e4).length > 0], [true, true]);
    }

    /* ═══ 5. LES CANAUX ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes canaux : public (tous les membres), privé (ceux qu\'on y met), renommer, supprimer');
    {
      C.vider();
      const k = await A.src.canalCreer(E, { nom: 'annonces' });
      v('créer un canal public : son nom, public, et la liste des canaux que je vois', [k.nom, k.prive, k.canaux.map(x => [x.nom, x.prive, x.membres])], ['annonces', false, [['annonces', false, 2]]]);
      vrai('Bob le trouve dans sa liste de conversations : type « canal », son espace, public, signé « # » (initiales)', !!(await att(async () => (await C.src.lister(true)).some(x => x.id === k.id && x.type === 'canal' && x.espace === E && x.prive === false && x.initiales === '#' && x.nom === 'annonces'))));
      const apercu = (await A.src.lister(true)).find(x => x.id === k.id);
      v('Alice le voit aussi, avec le message système du service', [apercu.type, apercu.apercu], ['canal', 'Activité du canal']);
      const m = await C.src.envoyer(k.id, { texte: 'Bonne journée à tous' });
      vrai('Bob écrit dans le canal', !!m.id);
      const ouvert = await A.src.ouvrir(k.id);
      v('Alice ouvre le canal : type, espace, public ; le message système dit « le canal » (jamais « le groupe »), le message de Bob est signé', [ouvert.type, ouvert.espace, ouvert.prive, ouvert.messages.filter(x => x.systeme).map(x => x.texte), ouvert.messages.filter(x => !x.systeme).map(x => [x.texte, x.auteur === bob.id])],
        ['canal', E, false, ['Vous avez créé le canal'], [['Bonne journée à tous', true]]]);
      const iA = await A.src.infos(k.id), iB = await C.src.infos(k.id);
      v('les infos : type, espace, rôles (mon rôle dans le canal est mon rôle dans l\'espace)', [iA.type, iA.espace, iA.prive, iA.moiAdmin, iB.moiAdmin, iA.membres.map(x => [x.nom, x.role]).sort((x, y) => x[0].localeCompare(y[0]))], ['canal', E, false, true, false, [['Alice Banc', 'admin'], ['Bob Banc', 'membre']]]);
      const e = await attrape(C.src.canalCreer(E, { nom: 'pirate' }));
      v('⛔ un membre simple ne crée pas de canal : refusé (`interdit`, dit)', [codeDe(e), e.statut, e.dit], ['interdit', 403, true]);
      const e2 = await attrape(A.src.canalAjouterMembres(E, k.id, [cleo.id]));
      v('un canal PUBLIC ne se compose pas à la main : « un canal public réunit tous les membres », et la phrase le dit', [codeDe(e2), phrase(e2)], ['canal_public', 'Un canal public réunit tous les membres de l\'espace : on y entre et on en sort avec l\'espace.']);

      /* un canal privé */
      C.vider();
      const p = await A.src.canalCreer(E, { nom: 'direction', prive: true, membres: [] });
      v('un canal PRIVÉ : privé, et Alice seule le voit', [p.prive, p.canaux.filter(x => x.prive).map(x => x.membres)], [true, [1]]);
      v('⛔ Bob ne le voit ni dans sa liste d\'espace, ni dans ses conversations', [(await C.src.espace(E)).canaux.map(x => x.nom), (await C.src.lister(true)).some(x => x.id === p.id)], [['annonces'], false]);
      v('⛔ Bob ne peut pas l\'ouvrir : « introuvable »', codeDe(await attrape(C.src.ouvrir(p.id).then(r => { if (r === null) throw Object.assign(new Error('x'), { code: 'introuvable' }); return r; }))), 'introuvable');
      const aj = await A.src.canalAjouterMembres(E, p.id, [bob.id]);
      vrai('l\'ajouter le lui MONTRE (dans sa liste, sans recharger)', aj === 1 && !!(await att(async () => (await C.src.lister(true)).some(x => x.id === p.id && x.prive === true))));
      C.vider();
      await A.src.canalRetirerMembre(E, p.id, bob.id);
      vrai('⛔ le retirer le lui RETIRE en direct : l\'événement `retire` arrive et la conversation sort de sa liste', !!(await C.attendreEv(x => x.type === 'retire' && x.id === p.id)) && !(await C.src.lister(true)).some(x => x.id === p.id));
      /* renommer / supprimer */
      const re = await A.src.canalRenommer(E, k.id, 'annonces générales');
      v('renommer un canal : la liste que le service rend, et Bob voit le nouveau nom', [re.map(x => x.nom).sort(), !!(await att(async () => (await C.src.lister(true)).some(x => x.id === k.id && x.nom === 'annonces générales')))], [['annonces générales', 'direction'], true]);
      await C.src.ouvrir(k.id);                       // Bob a ce canal sous les yeux
      C.vider();
      const apres = await A.src.canalSupprimer(E, k.id);
      v('supprimer un canal : la liste ne le porte plus', apres.map(x => x.nom), ['direction']);
      vrai('⛔ Bob, qui l\'avait ouvert, l\'apprend en direct (`retire` : la page s\'en retire) et sa liste ne le porte plus', !!(await C.attendreEv(x => x.type === 'retire' && x.id === k.id)) && !(await C.src.lister(true)).some(x => x.id === k.id));
      v('… et le canal n\'existe plus pour personne', codeDe(await attrape(A.src.infos(k.id).then(r => { if (r === null) throw Object.assign(new Error('x'), { code: 'introuvable' }); return r; }))), 'introuvable');
    }

    /* ═══ 6. LES RÔLES ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes rôles : nommer, rétrograder, retirer, passer la propriété, quitter, dissoudre');
    {
      await A.src.membreRole(E, bob.id, true);
      v('nommer Bob administrateur : il le voit', [(await C.src.espace(E)).moiAdmin, (await C.src.espace(E)).proprio], [true, false]);
      const e = await attrape(C.src.membreRole(E, alice.id, false));
      v('⛔ un administrateur NE rétrograde PAS le propriétaire : refusé, et dit', [codeDe(e), e.dit], ['interdit', true]);
      const e2 = await attrape(C.src.membreRetirer(E, alice.id));
      v('⛔ ni ne le retire', codeDe(e2), 'interdit');
      await A.src.membreRole(E, bob.id, false);
      v('le propriétaire rétrograde Bob : il est membre de nouveau', (await C.src.espace(E)).moiAdmin, false);
      const e3 = await attrape(A.src.espaceQuitter(E));
      v('⛔ le propriétaire ne quitte pas son espace : « passe d\'abord la propriété », dit', [codeDe(e3), phrase(e3)], ['proprio', 'Le propriétaire ne peut ni quitter son espace ni changer de rôle : transfère d\'abord la propriété à un autre membre.']);
      const t = await A.src.espaceTransferer(E, bob.id);
      v('passer la propriété à Bob : Alice reste administrateur, n\'est plus propriétaire ; Bob l\'est', [t.proprio, t.moiAdmin, (await C.src.espace(E)).proprio], [false, true, true]);
      /* Cléo rejoint puis part */
      const inv = await C.src.invitationCreer(E);
      await D.src.invitationAccepter(inv.code);
      D.vider();
      const retraitCleo = await C.src.membreRetirer(E, cleo.id);
      vrai('⛔ Bob retire Cléo : elle n\'a plus l\'espace (sa liste d\'espaces est vide) et l\'apprend en direct', !!(await D.attendreEv(x => x.type === 'espaces')) && (await D.src.espaces()).espaces.length === 0);
      v('⛔ retirer quelqu\'un RÉVOQUE les liens d\'invitation de l\'espace : la source dit combien (au moins celui par lequel Cléo était entrée), et l\'ancien code ne rouvre plus rien à Cléo (avant : elle rentrait avec)', [retraitCleo.liensRevoques >= 1, codeDe(await attrape(D.src.invitationAccepter(inv.code))), (await D.src.espaces()).espaces.length], [true, 'lien_invalide', 0]);
      await A.src.espaceQuitter(E);
      v('Alice quitte l\'espace (elle n\'est plus propriétaire) : elle n\'a plus aucun espace', (await A.src.espaces()).espaces, []);
      const e4 = await attrape(C.src.espaceDissoudre('e_' + '1'.repeat(32)));
      v('dissoudre un espace qu\'on ne possède pas : « introuvable »', codeDe(e4), 'introuvable');
      await C.src.espaceDissoudre(E);
      v('⛔ le propriétaire dissout l\'espace : plus rien, pour personne', [(await C.src.espaces()).espaces, codeDe(await attrape(C.src.espace(E)))], [[], 'introuvable']);
    }

    /* ═══ 7. MESSAGES PRO — LE SERVICE À LA FORMULE DE PRODUCTION ═════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nMessages Pro (le service à la formule de production, contre un faux Stripe)');
    {
      const AB = B, BB = monter(svcB);                                // Ana (propriétaire) et Ben (membre) sur le service à la formule de production
      const ana = await AB.entrer('alice'), ben = await BB.entrer('bob');
      const e0 = await attrape(AB.src.espaceCreer('Entreprise Un'));
      v('⛔ sans abonnement, CRÉER un espace est une fonction Pro : refusé (402 `formule_requise`), dit — et SANS raison (la personne n\'a pas d\'espace, il n\'y a rien à régler)', [codeDe(e0), e0.statut, phrase(e0), e0.raison], ['formule_requise', 402, 'Cette fonction fait partie de Messages Pro.', '']);
      /* un espace posé en base (le premier espace d'une entreprise ne naît pas d'une création libre) : Ana propriétaire, Ben membre */
      const S = ouvrir({ chemin: path.join(svcB.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svcB.cle, 'hex')) });
      const raw = () => new (require('node:sqlite').DatabaseSync)(path.join(svcB.data, 'msg.db'));
      const EB = S.espaceCreer({ nom: 'Entreprise Un', proprio: ana.id }).id;
      const code = crypto.randomBytes(16).toString('base64url');
      S.lienCreer({ h: crypto.createHash('sha256').update(code).digest('hex'), genre: 'espace', cible: EB, par: ana.id, ttlMs: JOUR, max: 5 });
      S.invitationAccepter({ h: crypto.createHash('sha256').update(code).digest('hex'), uid: ben.id, max: Infinity });
      const off = await AB.src.abonnementOffres();
      v('les offres (publiques) : ouvertes, en mode test, de 1 à 500 places, le prix par place — aucun identifiant de tarif', [off.ouvert, off.mode, off.places, off.defaut, off.offres, /price_|rk_|sk_/.test(JSON.stringify(off))],
        [true, 'test', { min: 1, max: 500 }, 'mensuel', [{ id: 'mensuel', libelle: 'Messages Pro', par: 'mois', eurosParPlace: 15 }, { id: 'annuel', libelle: 'Messages Pro', par: 'an', eurosParPlace: 150 }], false]);
      const a0 = await AB.src.abonnement(EB);
      v('l\'état d\'un espace jamais abonné (lu SANS réseau) : Perso, aucune place, deux membres, rien en attente', [a0.formule, a0.abonnement, a0.places, a0.membres, a0.paiementEnAttente, a0.stripeMuet, a0.ouvert], ['perso', null, 0, 2, false, false, true]);
      const eB1 = await attrape(AB.src.canalCreer(EB, { nom: 'general' })), eB2 = await attrape(AB.src.invitationCreer(EB));
      v('⛔ créer un canal ou un lien est une fonction Pro : refusé, et l\'ADMINISTRATEUR lit POURQUOI (`raison` « perso » : l\'espace n\'a pas d\'abonnement)', [codeDe(eB1), eB1.raison, codeDe(eB2), eB2.raison], ['formule_requise', 'perso', 'formule_requise', 'perso']);
      v('… mais RIEN n\'est retiré : l\'espace garde son membre et ses données', [(await AB.src.espace(EB)).membres, (await AB.src.espace(EB)).fonctionsPro], [2, false]);
      const eBn = await attrape(BB.src.abonnement(EB));
      v('⛔ un MEMBRE simple ne lit même pas l\'état de l\'abonnement : `interdit`', [codeDe(eBn), eBn.statut], ['interdit', 403]);
      const eBp = await attrape(BB.src.abonnementPayer(EB, { places: 2, cycle: 'mensuel' }));
      v('⛔ et ne paie pas : `interdit`', codeDe(eBp), 'interdit');

      /* payer */
      const avant = fake.appels.length;
      const pay = await AB.src.abonnementPayer(EB, { places: 2, cycle: 'mensuel' });
      vrai('payer : l\'adresse de la page de paiement de Stripe, en https', /^https:\/\/checkout\.stripe\.test\/c\/pay\/cs_banc/.test(pay.url) && pay.reprise === false);
      const sess = fake.derniereSession();
      v('le service a demandé à Stripe un abonnement de 2 places au tarif MENSUEL de la configuration, pour CET espace', [fake.appels.slice(avant).filter(x => x.m === 'POST' && x.chemin === '/v1/checkout/sessions').length, Object.fromEntries(sess.paires)['line_items[0][quantity]'], sess.client_reference_id], [1, '2', 'opmsg:' + EB]);
      v('l\'état dit qu\'un paiement attend', (await AB.src.abonnement(EB)).paiementEnAttente, true);
      const sb = fake.payer(sess.id, { statut: 'active' });
      AB.vider();
      const r = await AB.src.abonnementRelire(EB);
      v('⛔ « J\'ai réglé — vérifier » RELIT chez Stripe : l\'espace est en Messages Pro, deux places, plus rien en attente', [r.formule, r.abonnement.statut, r.abonnement.places, r.places, r.paiementEnAttente, r.membres], ['pro', 'active', 2, 2, false, 2]);
      vrai('… et la page est prévenue (événement `espaces`)', !!(await AB.attendreEv(x => x.type === 'espaces' && x.id === EB)));
      v('… et l\'espace peut maintenant créer un canal (la fonction Pro marche)', (await AB.src.canalCreer(EB, { nom: 'general' })).canaux.map(x => x.nom), ['general']);
      const ePl = await attrape(AB.src.invitationCreer(EB));
      v('⛔ les places sont prises (2 membres pour 2 places) : un lien est refusé (`places_epuisees`), avec les chiffres', [codeDe(ePl), ePl.places, ePl.membres], ['places_epuisees', 2, 2]);
      const por = await AB.src.abonnementPortail(EB);
      vrai('« Gérer l\'abonnement » : le portail de Stripe, en https', /^https:\/\/billing\.stripe\.test\/p\/session\//.test(por.url));
      const eEx = await attrape(AB.src.abonnementPayer(EB, { places: 3, cycle: 'mensuel' }));
      v('⛔ payer UNE SECONDE FOIS un espace abonné : refusé (`abonnement_existant`) AVEC le portail pour changer les places (un second abonnement serait prélevé en double)', [codeDe(eEx), /^https:\/\/billing\.stripe\.test\//.test(eEx.portail)], ['abonnement_existant', true]);

      /* l'impayé : le sursis, puis la suspension — sans rien retirer */
      fake.statut(sb.id, 'past_due');
      const r1 = await AB.src.abonnementRelire(EB);
      v('⛔ un paiement en retard : encore Pro, en SURSIS de sept jours (la date est celle du service)', [r1.formule, Math.abs(r1.sursisJusqua - (Date.now() + 7 * JOUR)) < 120000], ['pro', true]);
      const d = raw(); try { d.prepare('UPDATE abonnement SET impaye_depuis = impaye_depuis - ?, relu_le = relu_le - ? WHERE espace = ?').run(8 * JOUR, 8 * JOUR, EB); } finally { d.close(); }
      const r2 = await AB.src.abonnementRelire(EB);
      v('⛔ huit jours plus tard, la lecture qui dit encore le retard : impayé — les places et les membres restent', [r2.formule, r2.places, r2.membres], ['impaye', 2, 2]);
      const eIm = await attrape(AB.src.canalCreer(EB, { nom: 'refuse' }));
      v('⛔ les fonctions Pro refusent, et l\'administrateur lit POURQUOI (`raison` « impaye ») ; la phrase de la page ajoutera le remède', [codeDe(eIm), eIm.raison], ['formule_requise', 'impaye']);
      v('⛔ RIEN n\'est retiré : le canal, les deux membres, l\'espace', [(await AB.src.espace(EB)).canaux.map(x => x.nom), (await AB.src.espace(EB)).membres, (await BB.src.espaces()).espaces.map(x => x.nom)], [['general'], 2, ['Entreprise Un']]);
      fake.statut(sb.id, 'active');
      const r3 = await AB.src.abonnementRelire(EB);
      v('réglé : tout revient d\'un coup', [r3.formule, r3.sursisJusqua], ['pro', null]);

      /* ⛔ R12 : le portail de Stripe baisse les places SOUS le nombre de membres — personne n'est retiré ; la page reçoit du service (elle ne le recalcule pas) le dépassement et les deux nombres */
      fake.quantite(sb.id, 1);
      const rBas = await AB.src.abonnementRelire(EB), eBas = await AB.src.espace(EB), eBasMembre = await BB.src.espace(EB);
      v('⛔ une place pour deux membres : l\'état ET la fiche de l\'espace disent `placesDepassees` (les deux nombres : 1 place, 2 membres) ; personne n\'est retiré ; le simple membre ne reçoit pas le bloc',
        [rBas.placesDepassees, rBas.places, rBas.membres, eBas.admin.placesDepassees, eBas.admin.places, eBas.membres, eBasMembre.admin, (await AB.src.espace(EB)).membres], [true, 1, 2, true, 1, 2, null, 2]);
      fake.quantite(sb.id, 2);
      const rJuste = await AB.src.abonnementRelire(EB);
      v('… deux places pour deux membres : plus de dépassement, ni dans l\'état ni sur la fiche', [rJuste.placesDepassees, (await AB.src.espace(EB)).admin.placesDepassees], [false, false]);

      /* une adresse de paiement qui n'est pas en https n'est JAMAIS rendue à la page */
      const MAL = monter(svcB, { reecrire: { re: /POST \/api\/espaces\/[^/]+\/facturation\/(paiement|portail)$/, corps: { url: 'javascript:alert(1)' } } });
      await MAL.entrer('alice');
      const eJ = await attrape(MAL.src.abonnementPortail(EB));
      const MAL2 = monter(svcB, { reecrire: { re: /POST \/api\/espaces\/[^/]+\/facturation\/(paiement|portail)$/, corps: { url: 'http://pirate.example/paye' } } });
      await MAL2.entrer('alice');
      const eH = await attrape(MAL2.src.abonnementPortail(EB));
      v('⛔ une adresse de paiement `javascript:` ou `http:` (même venue du service) est REFUSÉE par le module : la page n\'ouvre pas n\'importe quoi', [codeDe(eJ), codeDe(eH), eJ.dit, eH.dit], ['reponse_illisible', 'reponse_illisible', true, true]);
    }
  } catch (er) {
    console.log('  ✗ le banc est mort : ' + (er && er.stack || er));
    process.exitCode = 1;
  }
  for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêté */ } }
  await svcA.arreter(); await svcB.arreter(); await fake.fermer(); await og.fermer();
  fin();
})();
