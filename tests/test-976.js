/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE ET LE SERVICE SE PARLENT, POUR LES RÉUNIONS PROGRAMMÉES (famille 4, étape 6 ; modèle `test-964`).

   Les VRAIES fonctions de `server-msg/public/api.js` et de `server-msg/public/source-serveur.js` (le module que la page appelle) sont exécutées dans Node contre le VRAI service, à deux ou trois
   personnes (chacune est un « appareil de poche » : cookie, Origin, flux). Ce que ni `test-973` (les routes seules) ni la sonde (le DOM) ne voient :
     · LE CONTRAT : la capacité `reunions`, chaque méthode que la page appelle, l'adresse du fichier .ics (une adresse de CE service, jamais une adresse venue du service) ;
     · UNE RÉUNION SE PROGRAMME, SE LIT, SE MODIFIE, S'ANNULE, SE SUPPRIME PAR LE MODULE : l'agenda d'une fenêtre porte ses occurrences en millisecondes UTC (une série hebdomadaire de trois dates qui traverse le
       25 octobre garde son heure LOCALE), les personnes ne sont que des identifiants que la page habille, l'hôte et le rôle viennent du service ;
     · LES AUTRES L'APPRENNENT EN DIRECT : l'événement `reunions` (et la notification d'invitation, de modification, d'annulation, dite dans le fuseau de celui qui la lit) arrive sans recharger ;
     · LA RÉPONSE ET LES RAPPELS D'UN INVITÉ ; un changement d'HORAIRE remet les réponses en attente, un simple lieu non ;
     · LA CONVERSATION DE LA RÉUNION est une conversation à plusieurs que la page sait nommer (`type:'reunion'`, `reunion:<id>`), avec les phrases système de la réunion ;
     · TOUT REFUS SE DIT en français et nomme CETTE réunion (jamais « la conversation ») ; une fonction Pro refusée ne retire rien ; le courriel dit « pas encore ouvert » seulement quand LE SERVICE l'a dit
       (`courrielOuvert()` rend `null` quand on n'a pas pu savoir) ;
     · LE TOUCHER D'UNE NOTIFICATION : seule une adresse `/#reunions/<identifiant>` de CE service ouvre une fiche ; le fuseau de l'appareil est dit au service UNE fois par séance.
   Toute attente est au GESTE (on sonde la condition), jamais au chronomètre ; les négatifs se prouvent par SENTINELLE. */
'use strict';
/* L'« appareil » de ce banc vit à NEW YORK (et non à Paris, où est la réunion, ni en UTC, fuseau par défaut d'un conteneur) : c'est ce que `Intl` rend à la source de données, donc ce qu'elle dit au service. */
process.env.TZ = 'America/New_York';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };
const JOUR = 86400000;
const METHODES = ['reunions', 'reunion', 'programmer', 'modifierReunion', 'annulerReunion', 'supprimerReunion', 'inviterReunion', 'retirerInviteReunion', 'quitterReunion', 'repondreReunion', 'rappelsReunion', 'adresseIcs', 'courrielOuvert', 'courrielReunion'];
const TITRE = 'Point TITRE-WQXZ-CANARI';

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

/* l'instant (UTC) où il est `hh:mm` à Paris le jour `jour` (« 2026-10-26 ») — un oracle par `Intl`, qui ne partage rien avec le service */
function instantParis(jour, hh, mm) {
  for (const off of [1, 2]) {
    const t = Date.parse(jour + 'T' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':00Z') - off * 3600000;
    const h = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t);
    if (h === String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0')) return t;
  }
  return NaN;
}
const jourParis = (t) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t);

(async () => {
  const MDP = { alice: 'pw-alice-1234', bob: 'pw-bob-123456', cleo: 'pw-cleo-12345', dan: 'pw-dan-123456' };
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MDP).map(k => [k, { pass: MDP[k], nom: k[0].toUpperCase() + k.slice(1) + ' Banc', actif: true }])));
  /* le service de la bêta (tout ouvert), un service à la formule de PRODUCTION, et un service dont le relais SMTP est configuré mais ne répond pas (un port fermé) */
  const portFerme = await T.portLibre();
  const svcA = await T.lancerService({ urlGestion: og.url, config: { quotas: { reunion: { max: 1000, fenetreMs: 3600000 }, courriel: { max: 1000, fenetreMs: 60000 } } } });
  const svcB = await T.lancerService({ urlGestion: og.url, config: { formule: { toutOuvert: false }, quotas: { reunion: { max: 1000, fenetreMs: 3600000 } } } });
  const svcC = await T.lancerService({ urlGestion: og.url, config: { courriel: { hote: '127.0.0.1', port: portFerme, securite: 'aucune', de: 'invitations@exemple.invalid', timeoutMs: 1000 }, quotas: { reunion: { max: 1000, fenetreMs: 3600000 }, courriel: { max: 1000, fenetreMs: 60000 } } } });
  const sources = [];

  /* un « appareil » : un navigateur de poche et le module de la page branché dessus. `sw` : ce que dit le service worker au toucher d'une notification ; `reecrire` : une route qui répond autre chose */
  function monter(svc, opts) {
    const o = opts || {};
    const nav = T.navigateur(svc.base);
    const reseau = { requetes: [] }, sw = { cb: null };
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: (cb) => { sw.cb = cb; }, abonnementActuel: async () => null };
    const f = async (url, init) => {
      const u = String(url), m = (init && init.method) || 'GET', chemin = u.replace(svc.base, '').split('?')[0];
      reseau.requetes.push({ m, chemin, corps: init && typeof init.body === 'string' ? init.body : null });
      if (o.panne && o.panne.test(m + ' ' + chemin)) return new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } });
      return nav.fetch(url, init);
    };
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
    const evs = [];
    src.ecouter(e => evs.push(e));
    sources.push(src);
    return { src, evs, reseau, nav, sw,
      async entrer(login) { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d)); return src.moi(); },
      attendreEv: (pred) => att(() => evs.some(pred)), vider: () => { evs.length = 0; } };
  }
  const phrase = (e) => e && e.dit ? e.phrase() : '';
  const codeDe = (e) => e ? e.code : null;

  try {
    const A = monter(svcA), B = monter(svcA), C = monter(svcA), D = monter(svcA);
    const alice = await A.entrer('alice'), bob = await B.entrer('bob'), cleo = await C.entrer('cleo'), dan = await D.entrer('dan');

    /* ═══ 1. LE CONTRAT ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Le contrat : la capacité `reunions`, les méthodes de la page, l\'adresse du fichier .ics');
    {
      v('le module annonce la capacité `reunions`', A.src.capacites.reunions, true);
      v('chaque méthode que la page appelle existe', METHODES.filter(k => typeof A.src[k] !== 'function'), []);
      vrai('population : quatre personnes sont entrées par la porte bêta', new Set([alice.id, bob.id, cleo.id, dan.id]).size === 4);
      vrai('⛔ le fuseau de l\'appareil est dit au service DÈS L\'ENTRÉE (avant tout geste d\'agenda) : on invite des gens qui n\'ont pas encore ouvert l\'onglet', !!(await att(() => B.reseau.requetes.some(r => r.m === 'POST' && r.chemin === '/api/moi/maj'))) && B.reseau.requetes.every(r => !/\/api\/reunions/.test(r.chemin)));
      v('⛔ l\'adresse du fichier .ics est une adresse de CE service : toute la série, ou UNE occurrence', [A.src.adresseIcs('r_' + 'a'.repeat(32)), A.src.adresseIcs('r_' + 'a'.repeat(32), { occurrence: 1793019600000 })],
        [svcA.base + '/api/reunions/r_' + 'a'.repeat(32) + '/ics?serie=1', svcA.base + '/api/reunions/r_' + 'a'.repeat(32) + '/ics?occurrence=1793019600000']);
    }

    /* Alice et Bob, et Dan, sont contacts ; Cléo n'est le contact de personne (on ne l'invite pas) */
    const lien1 = await A.src.lienContact(); await B.src.accepterLien(lien1.code);
    const lien2 = await A.src.lienContact(); await D.src.accepterLien(lien2.code);

    /* ═══ 2. PROGRAMMER, LIRE ═════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nProgrammer une série hebdomadaire de trois dates : l\'agenda, la fiche, les occurrences en UTC');
    const j0 = jourParis(Date.now() + 10 * JOUR);
    const dates = [0, 7, 14].map(n => jourParis(Date.parse(j0 + 'T12:00:00Z') + n * JOUR));
    const OCC = dates.map(d => instantParis(d, 14, 0));
    let R = null;
    {
      A.vider(); B.vider();
      const r = await A.src.programmer({ titre: TITRE, lieu: 'Salle B', debut: j0 + 'T14:00', fin: j0 + 'T15:00', tz: 'Europe/Paris', repetition: 'hebdomadaire', n: 3, invites: [bob.id, cleo.id], rappels: [15, 1440], notifier: true });
      R = r.id;
      v('programmer : l\'identifiant de la réunion, celui de sa conversation, et celle qu\'on n\'a pas pu inviter (Cléo n\'est pas un contact)', [/^r_[0-9a-f]{32}$/.test(r.id), /^c_[0-9a-f]{32}$/.test(r.conv), r.nonInvites], [true, true, 1]);
      const l = await A.src.reunions(OCC[0] - JOUR, OCC[2] + JOUR);
      v('⛔ l\'agenda de l\'hôte : la réunion, ses TROIS occurrences en millisecondes UTC — la série garde 14:00 à Paris de part et d\'autre du 25 octobre (oracle `Intl`)',
        [l.length, l[0] && l[0].occurrences.map(o => o.debut), l[0] && l[0].occurrences.map(o => o.fin - o.debut)], [1, OCC, [3600000, 3600000, 3600000]]);
      const x = l[0];
      v('… son titre, son lieu, son fuseau, sa répétition, ses rappels, et MON rôle (organisateur, rien à répondre)', [x.titre, x.lieu, x.tz, x.repetition, x.n, x.rappels, x.moi.hote, x.moi.statut, x.participantsN, x.annulee], [TITRE, 'Salle B', 'Europe/Paris', 'hebdomadaire', 3, [15, 1440], true, 'accepte', 2, false]);
      vrai('⛔ les personnes ne sont que des IDENTIFIANTS (la page les habille avec `personne(id)`) : l\'hôte et les participants sont des chaînes, et la source sait leur nom', typeof x.hote === 'string' && x.hote === alice.id && x.participants.every(p => typeof p === 'string') && A.src.personne(x.hote).nom === 'Alice Banc');
      const lb = await B.src.reunions(OCC[0] - JOUR, OCC[2] + JOUR);
      v('l\'agenda de l\'invité : la même réunion, SA réponse (en attente), l\'organisateur nommé', [lb.length, lb[0].moi.hote, lb[0].moi.statut, B.src.personne(lb[0].hote).nom], [1, false, 'attente', 'Alice Banc']);
      const vide = await B.src.reunions(OCC[2] + 3 * JOUR, OCC[2] + 10 * JOUR);
      v('une fenêtre sans occurrence : la réunion n\'y est pas (sentinelle de la population ci-dessus)', vide, []);
      const f = await B.src.reunion(R);
      v('la fiche : l\'horaire de la première occurrence, les invités et leur réponse, ma réponse, mes rappels (ceux de la réunion), la prochaine occurrence', [f.id, f.debut, f.fin, f.invites.map(p => [p.id === alice.id, p.statut, p.hote]), f.moi.statut, f.moi.rappels, f.moi.rappelsPerso, f.prochaine && f.prochaine.debut],
        [R, OCC[0], OCC[0] + 3600000, [[true, 'accepte', true], [false, 'attente', false]], 'attente', [15, 1440], false, OCC[0]]);
      vrai('⛔ l\'invité l\'apprend SANS recharger : l\'événement `reunions` de CETTE réunion arrive, avec la notification d\'invitation dite en français', !!(await B.attendreEv(e => e.type === 'reunions' && e.id === R)) && !!(await B.attendreEv(e => e.type === 'notification' && e.nature === 'reunion_invitation' && /Alice Banc vous a invité à une réunion/.test(e.texte))));
      const dit = (tz) => new Intl.DateTimeFormat('fr-FR', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(OCC[0]).replace(/\u202f|\u00a0/g, ' ');
      const invit = B.evs.find(e => e.type === 'notification' && e.nature === 'reunion_invitation');
      v('⛔ … et elle dit l\'heure de SON fuseau (New York), pas celle de la réunion (Paris) — alors qu\'il n\'a encore ouvert AUCUN écran d\'agenda : son appareil a dit son fuseau dès l\'entrée',
        [dit('America/New_York') !== dit('Europe/Paris'), invit.texte.includes(dit('America/New_York')), invit.texte.includes(dit('Europe/Paris'))], [true, true, false]);
      const tousSeuls = await A.src.reunions(OCC[0] - JOUR, OCC[2] + JOUR);
      vrai('population : l\'hôte n\'est pas notifié de son propre geste (aucune notification d\'invitation pour lui)', tousSeuls.length === 1 && !A.evs.some(e => e.type === 'notification' && e.nature === 'reunion_invitation'));
      const e1 = await attrape(A.src.programmer({ lieu: 'x', debut: j0 + 'T14:00', fin: j0 + 'T15:00' }));
      const e2 = await attrape(A.src.programmer({ titre: 'Fin avant début', debut: j0 + 'T15:00', fin: j0 + 'T14:00', tz: 'Europe/Paris' }));
      const e3 = await attrape(A.src.programmer({ titre: 'Fuseau', debut: j0 + 'T14:00', fin: j0 + 'T15:00', tz: 'Mars/Olympus' }));
      v('⛔ chaque refus du service SE DIT en français : pas de titre, une fin avant le début, un fuseau inconnu', [e1, e2, e3].map(e => [codeDe(e), phrase(e)]),
        [['titre_vide', 'Donne un titre à la réunion.'], ['fin_avant_debut', 'La fin de la réunion doit tomber après son début.'], ['fuseau_inconnu', 'Ce fuseau horaire n\'est pas connu.']]);
      const e4 = await attrape(B.src.reunion('r_' + '0'.repeat(32))), e5 = await attrape(C.src.reunion(R));
      v('⛔ une réunion qui n\'existe pas, ou dont on n\'est pas invité (Cléo) : la MÊME phrase, qui nomme CETTE réunion (jamais « la conversation »)', [codeDe(e4), codeDe(e5), phrase(e4), phrase(e5)],
        ['reunion_introuvable', 'reunion_introuvable', 'Cette réunion n\'existe plus, ou tu n\'y es plus invité.', 'Cette réunion n\'existe plus, ou tu n\'y es plus invité.']);
    }

    /* ═══ 3. LA RÉPONSE ET LES RAPPELS D'UN INVITÉ ═════════════════════════════════════════════════════════════════ */
    console.log('\nLa réponse et les rappels d\'un invité : en direct chez l\'hôte');
    {
      A.vider();
      await B.src.repondreReunion(R, 'accepte');
      vrai('⛔ l\'hôte l\'apprend SANS recharger (événement `reunions`) et la fiche dit « accepte »', !!(await A.attendreEv(e => e.type === 'reunions' && e.id === R)) && (await A.src.reunion(R)).invites.find(p => p.id === bob.id).statut === 'accepte');
      const e1 = await attrape(B.src.repondreReunion(R, 'oui')), e2 = await attrape(A.src.repondreReunion(R, 'accepte'));
      v('un statut inconnu et l\'organisateur qui « répond » à sa propre réunion : refusés, et DITS', [codeDe(e1), codeDe(e2), phrase(e2)], ['champ_invalide', 'hote_reponse', 'Tu organises cette réunion : tu n\'as pas à y répondre.']);
      await B.src.rappelsReunion(R, [5, 60]);
      const f = await B.src.reunion(R);
      v('MES rappels (5 minutes, 1 heure) remplacent ceux de la réunion — pour moi seul', [f.moi.rappels, f.moi.rappelsPerso, (await A.src.reunion(R)).moi.rappels], [[5, 60], true, [15, 1440]]);
      await B.src.rappelsReunion(R, null);
      const g = await B.src.reunion(R);
      v('rendre la main au réglage de la réunion : ses rappels reviennent', [g.moi.rappels, g.moi.rappelsPerso], [[15, 1440], false]);
      const e3 = await attrape(B.src.rappelsReunion(R, [7]));
      v('un rappel qui n\'existe pas est refusé et DIT', [codeDe(e3), phrase(e3)], ['rappel_invalide', 'Ce rappel n\'existe pas (5 minutes, 15 minutes, 1 heure ou 1 jour avant, quatre au plus).']);
    }

    /* ═══ 4. MODIFIER : UN LIEU NE REMET RIEN À ZÉRO, UN HORAIRE SI ═══════════════════════════════════════════════ */
    console.log('\nModifier : un lieu ne touche pas aux réponses, un horaire les remet en attente — et les autres le lisent');
    {
      B.vider();
      await A.src.modifierReunion(R, { lieu: 'Salle 2', notifier: false });
      const f = await B.src.reunion(R);
      v('un changement de LIEU : le lieu change, la réponse de Bob reste « accepte »', [f.lieu, f.moi.statut], ['Salle 2', 'accepte']);
      await A.src.modifierReunion(R, { debut: j0 + 'T15:00', fin: j0 + 'T16:00', tz: 'Europe/Paris', repetition: 'hebdomadaire', n: 3, notifier: true });
      const g = await B.src.reunion(R);
      v('⛔ un changement d\'HORAIRE : la première occurrence est à 15:00 à Paris, la réponse de Bob repart « en attente »', [g.debut === instantParis(j0, 15, 0), g.moi.statut], [true, 'attente']);
      vrai('… et il en est prévenu, dans SON fuseau (la notification dit l\'horaire changé)', !!(await B.attendreEv(e => e.type === 'notification' && e.nature === 'reunion_modifiee' && /a changé l'horaire de la réunion/.test(e.texte))));
      const e1 = await attrape(B.src.modifierReunion(R, { lieu: 'Piraté' }));
      v('⛔ un INVITÉ ne modifie pas : « interdit », dit, et rien n\'a changé', [codeDe(e1), phrase(e1), (await A.src.reunion(R)).lieu], ['interdit', 'Tu n\'as pas le droit de faire cela ici.', 'Salle 2']);
      const e2 = await attrape(A.src.modifierReunion(R, { rappels: [3] }));
      v('un rappel qui n\'existe pas, pour la réunion : refusé et dit', codeDe(e2), 'rappel_invalide');
    }

    /* ═══ 5. INVITER, RETIRER ═════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nInviter et retirer : des contacts seulement, l\'organisateur ne se retire pas');
    {
      const i1 = await A.src.inviterReunion(R, [dan.id], { notifier: true });
      const i2 = await A.src.inviterReunion(R, [cleo.id], { notifier: true });
      v('inviter un contact : ajouté ; inviter quelqu\'un qui n\'est pas un contact : rendu, pas ajouté', [i1, i2], [{ ajoutes: 1, nonAjoutes: 0 }, { ajoutes: 0, nonAjoutes: 1 }]);
      vrai('population : Dan voit la réunion dans son agenda, en attente de sa réponse', (await D.src.reunions(OCC[0] - JOUR, OCC[2] + JOUR)).some(x => x.id === R && x.moi.statut === 'attente'));
      await A.src.retirerInviteReunion(R, dan.id);
      v('retirer un invité : la réunion disparaît de son agenda (la sentinelle ci-dessus le voyait)', (await D.src.reunions(OCC[0] - JOUR, OCC[2] + JOUR)), []);
      const e1 = await attrape(A.src.retirerInviteReunion(R, alice.id));
      v('l\'organisateur ne se retire pas de sa réunion : refusé et dit', [codeDe(e1), phrase(e1)], ['hote_non_retirable', 'L\'organisateur ne se retire pas de sa réunion : annule-la ou supprime-la.']);
    }

    /* ═══ 6. LA CONVERSATION DE LA RÉUNION ════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa conversation de la réunion : une conversation à plusieurs que la page sait nommer');
    let CONV = null;
    {
      await B.src.rafraichirContacts();
      const liste = await B.src.lister();
      const c = liste.find(x => x.reunion === R);
      CONV = c && c.id;
      v('⛔ la liste de Bob porte la conversation de la réunion : son type, la réunion qu\'elle dit, le titre pour nom — et, le dernier message étant une phrase système (Dan retiré), un aperçu « Activité de la réunion » (jamais « du groupe »)', [c && c.type, c && c.reunion, c && c.nom, c && c.apercu], ['reunion', R, TITRE, 'Activité de la réunion']);
      const o = await B.src.ouvrir(CONV);
      v('l\'ouvrir : le type, la réunion, le titre — et les phrases système DE LA RÉUNION, dans l\'ordre des gestes (programmée, lieu changé, horaire changé, un invité ajouté puis retiré — que Bob ne connaît pas : « Quelqu\'un »)', [o.type, o.reunion, o.nom, o.messages.filter(m => m.systeme).map(m => m.texte)],
        ['reunion', R, TITRE, ['Alice Banc a programmé la réunion', 'Alice Banc a modifié la réunion', 'Alice Banc a changé l\'horaire de la réunion', 'Alice Banc a ajouté Quelqu\'un', 'Alice Banc a retiré Quelqu\'un']]);
      await B.src.envoyer(CONV, { texte: 'Je serai là' });
      const oa = await A.src.ouvrir(CONV);
      v('on y écrit comme dans un groupe : Alice lit le message de Bob', oa.messages.filter(m => !m.systeme).map(m => m.texte), ['Je serai là']);
      const e1 = await attrape(B.src.quitter(CONV));
      v('⛔ on ne QUITTE pas la conversation d\'une réunion toute seule : refusé et dit — et la phrase montre la vraie sortie (« Quitter la réunion », dans sa fiche)', [codeDe(e1), phrase(e1)], ['reunion_quitter', 'On ne quitte pas la conversation d\'une réunion toute seule : ouvre la réunion et choisis « Quitter la réunion ».']);
    }

    /* ═══ 6 bis. QUITTER LA RÉUNION ════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nQuitter la réunion : la sortie de l\'invité, dite par le module de la page');
    {
      await A.src.inviterReunion(R, [dan.id], { notifier: true });
      vrai('population : Dan est de nouveau invité, la réunion est dans son agenda', (await D.src.reunions(OCC[0] - JOUR, OCC[2] + JOUR)).some(x => x.id === R));
      D.vider();
      await D.src.quitterReunion(R);
      v('⛔ Dan quitte : sa réunion disparaît de son agenda, sa fiche ne se lit plus (la phrase nomme la réunion)', [(await D.src.reunions(OCC[0] - JOUR, OCC[2] + JOUR)), codeDe(await attrape(D.src.reunion(R)))], [[], 'reunion_introuvable']);
      vrai('… et sa page l\'apprend par l\'événement `reunions` de la réunion (« supprimée », POUR LUI : la fiche ouverte se ferme)', !!(await D.attendreEv(e => e.type === 'reunions' && e.id === R && e.supprime === true)));
      const fiche = await A.src.reunion(R);
      const phrases = (await A.src.ouvrir(CONV)).messages.filter(m => m.systeme).map(m => m.texte);
      v('⛔ l\'organisateur le VOIT partir : la fiche ne le liste plus et la conversation dit qui est parti', [fiche.invites.some(i => i.id === dan.id), phrases[phrases.length - 1]], [false, 'Dan Banc a quitté la réunion']);
      const e1 = await attrape(D.src.quitterReunion(R)), e2 = await attrape(A.src.quitterReunion(R));
      v('quitter une réunion dont on n\'est plus : refusé comme une réunion inexistante ; l\'organisateur ne quitte pas sa réunion : refusé et dit', [codeDe(e1), codeDe(e2), phrase(e2)], ['reunion_introuvable', 'hote_non_quittable', 'L\'organisateur ne quitte pas sa réunion : annule-la ou supprime-la.']);
    }

    console.log('\nUne réunion modifiée trop souvent : le refus se dit à l\'écran');
    {
      const rm = await A.src.programmer({ titre: 'Modifiée souvent', debut: j0 + 'T14:00', fin: j0 + 'T15:00', tz: 'Europe/Paris' });
      for (let i = 0; i < 20; i++) await A.src.modifierReunion(rm.id, { lieu: 'Salle ' + i });
      const e = await attrape(A.src.modifierReunion(rm.id, { lieu: 'Salle 20' }));
      v('⛔ la vingt et unième modification en une heure : refusée, et la phrase de l\'écran dit pourquoi — avec l\'attente que le service a donnée, une seule invitation à réessayer', [codeDe(e), e && e.statut, /^Cette réunion vient d'être modifiée vingt fois en une heure \(réessaie dans (59|60) min\)\.$/.test(phrase(e))], ['trop_de_modifications', 429, true]);
    }

    /* ═══ 7. LE FICHIER .ICS ══════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe fichier .ics : l\'adresse que la page ouvre rend un vrai calendrier');
    {
      const r = await B.nav.fetch(B.src.adresseIcs(R));
      const t = await r.text();
      v('toute la série : un calendrier téléchargé (pièce jointe), le titre, la règle de répétition', [r.status, /attachment/.test(r.headers.get('content-disposition') || ''), /^BEGIN:VCALENDAR/.test(t), t.includes('SUMMARY:' + TITRE), /RRULE:FREQ=WEEKLY;BYDAY=[A-Z]{2};COUNT=3\r?\n/.test(t)], [200, true, true, true, true]);
      const occ = instantParis(dates[1], 15, 0);
      const r2 = await B.nav.fetch(B.src.adresseIcs(R, { occurrence: occ }));
      const t2 = await r2.text();
      v('UNE occurrence : le fichier ne porte que celle-là (pas de règle de répétition)', [r2.status, /RRULE/.test(t2), /DTSTART/.test(t2)], [200, false, true]);
      const r3 = await B.nav.fetch(B.src.adresseIcs(R, { occurrence: occ + 60000 }));
      v('une date qui n\'est pas une occurrence : 404 (et pas un fichier inventé)', r3.status, 404);
    }

    /* ═══ 8. LE COURRIEL ══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe courriel : « pas encore ouvert » seulement quand le service l\'a dit');
    {
      const ouvertA = await A.src.courrielOuvert();
      const e1 = await attrape(A.src.courrielReunion(R, 'invite@exemple.invalid'));
      v('sans relais : le service dit « pas ouvert » (faux), et l\'envoi se refuse avec la phrase de l\'écran', [ouvertA, codeDe(e1), phrase(e1)], [false, 'courriel_non_ouvert', 'L\'envoi par courriel n\'est pas encore ouvert.']);
      const muet = monter(svcA, { panne: /GET \/api\/config/ });
      await muet.entrer('alice');
      v('⛔ quand on n\'a PAS PU savoir (la lecture de la configuration échoue) : `null` — jamais « faux » (on ne dit pas « pas encore ouvert » sur une panne de réseau)', await muet.src.courrielOuvert(), null);
      // un relais configuré mais qui ne répond pas (un port fermé) : ouvert, et l'envoi échoue avec une phrase qui promet ce qui est vrai
      const AC = monter(svcC); await AC.entrer('alice');
      const lc = await AC.src.programmer({ titre: 'Chez le relais muet', debut: j0 + 'T14:00', fin: j0 + 'T15:00', tz: 'Europe/Paris' });
      const e2 = await attrape(AC.src.courrielReunion(lc.id, 'invite@exemple.invalid'));
      const e3 = await attrape(AC.src.courrielReunion(lc.id, 'pas une adresse'));
      v('relais configuré : `courrielOuvert()` dit vrai ; un relais qui ne répond pas → « courriel_echec », une adresse fausse → « courriel_invalide », chacun DIT',
        [await AC.src.courrielOuvert(), codeDe(e2), phrase(e2), codeDe(e3), phrase(e3)],
        [true, 'courriel_echec', 'Le courriel n\'a pas pu partir. Il n\'est pas compté dans tes envois : réessaie dans un moment.', 'courriel_invalide', 'Cette adresse courriel n\'est pas valable.']);
    }

    /* ═══ 9. ANNULER, SUPPRIMER ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nAnnuler prévient et garde la réunion ; supprimer l\'emporte avec sa conversation');
    {
      B.vider();
      await A.src.annulerReunion(R);
      const f = await B.src.reunion(R);
      v('annulée : la fiche de Bob le dit, et la phrase système aussi', [f.annulee, (await B.src.ouvrir(CONV)).messages.filter(m => m.systeme).map(m => m.texte).pop()], [true, 'Alice Banc a annulé la réunion']);
      vrai('⛔ Bob en est prévenu EN DIRECT (annulation : elle part toujours)', !!(await B.attendreEv(e => e.type === 'notification' && e.nature === 'reunion_annulee' && /a annulé la réunion/.test(e.texte))));
      const e1 = await attrape(B.src.repondreReunion(R, 'accepte'));
      v('on ne répond plus à une réunion annulée : refusé et dit', [codeDe(e1), phrase(e1)], ['reunion_annulee', 'Cette réunion est annulée : elle ne se modifie plus.']);
      B.vider();
      await A.src.supprimerReunion(R, { notifier: false });
      vrai('⛔ Bob l\'apprend SANS recharger : l\'événement `reunions` de la réunion dit « supprimée »', !!(await B.attendreEv(e => e.type === 'reunions' && e.id === R && e.supprime === true)));
      const e2 = await attrape(B.src.reunion(R));
      vrai('… sa fiche ne se lit plus (la phrase nomme la réunion) et sa conversation a quitté sa liste', codeDe(e2) === 'reunion_introuvable' && !!(await att(async () => !(await B.src.lister()).some(x => x.id === CONV))));
    }

    /* ═══ 10. PROGRAMMER EST UNE FONCTION PRO ═════════════════════════════════════════════════════════════════════ */
    console.log('\nProgrammer est une fonction Pro : refusée à une personne Perso, et dite');
    {
      const P = monter(svcB); await P.entrer('alice');
      const e = await attrape(P.src.programmer({ titre: 'Réunion Perso', debut: j0 + 'T14:00', fin: j0 + 'T15:00', tz: 'Europe/Paris' }));
      v('⛔ à la formule de production, une personne sans espace payé ne programme pas : 402, une phrase, rien de créé', [codeDe(e), e && e.statut, phrase(e), (await P.src.reunions(OCC[0] - JOUR, OCC[2] + JOUR)).length], ['formule_requise', 402, 'Cette fonction fait partie de Messages Pro.', 0]);
    }

    /* ═══ 11. LE TOUCHER D'UNE NOTIFICATION, LE FUSEAU DE L'APPAREIL ══════════════════════════════════════════════ */
    console.log('\nLe toucher d\'une notification n\'ouvre que la fiche de CETTE origine ; le fuseau de l\'appareil est dit une fois');
    {
      const id = 'r_' + 'b'.repeat(32);
      A.vider();
      A.sw.cb({ type: 'ouvrir', url: '/#reunions/' + id });
      v('une adresse `/#reunions/<identifiant>` de ce service demande d\'ouvrir CETTE fiche', A.evs.filter(e => e.type === 'ouvrir'), [{ type: 'ouvrir', reunion: id }]);
      A.vider();
      for (const url of ['https://exemple.invalid/#reunions/' + id, '/#reunions/' + id + '/x', '/#reunions/r_zz', '/#reunions/../' + id, '//exemple.invalid/#reunions/' + id, 'javascript:alert(1)', 12, null]) A.sw.cb({ type: 'ouvrir', url });
      A.sw.cb({ type: 'autre', url: '/#reunions/' + id });
      v('⛔ rien d\'autre n\'ouvre quoi que ce soit : une autre origine, un chemin en plus, un identifiant mal formé, un schéma, un autre type (population : dix messages)', A.evs.filter(e => e.type === 'ouvrir'), []);
      const posts = A.reseau.requetes.filter(r => r.m === 'POST' && r.chemin === '/api/moi/maj');
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      v('le fuseau de l\'appareil a été dit au service UNE fois (et lui seul : rien d\'autre ne part dans ce corps)', [posts.length, posts.map(p => JSON.parse(p.corps))], [1, [{ tz }]]);
    }

    /* ═══ 12. LA LISTE BLANCHE DES CHAMPS ══════════════════════════════════════════════════════════════════════════ */
    console.log('\nCe que la page peut dire d\'une réunion : une liste blanche (rien d\'autre ne part)');
    {
      const avant = A.reseau.requetes.length;
      const j = jourParis(Date.now() + 40 * JOUR);
      await A.src.programmer({ titre: 'Champs en trop', debut: j + 'T14:00', fin: j + 'T15:00', tz: 'Europe/Paris', hote: bob.id, id: 'r_' + 'c'.repeat(32), conv: 'c_' + 'c'.repeat(32), version: 9, annulee: true, participants: [bob.id] });
      const posts = A.reseau.requetes.slice(avant).filter(r => r.m === 'POST' && r.chemin === '/api/reunions');
      vrai('population : la page a envoyé UNE demande de programmation', posts.length === 1);
      v('⛔ elle ne porte que les champs que la page a le droit de dire : ni hôte, ni identifiant, ni conversation, ni version, ni état, ni participants', posts.length ? Object.keys(JSON.parse(posts[0].corps)).sort() : null, ['debut', 'fin', 'titre', 'tz']);
    }
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêté */ } }
    await svcA.arreter(); await svcB.arreter(); await svcC.arreter(); await og.fermer();
  }
  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; process.exit(1); });
