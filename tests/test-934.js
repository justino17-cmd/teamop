/* ⛔ CE QUE CE FICHIER GARDE — LA SURVEILLANCE D'OP MESSAGES : CHAQUE CHAMP DE /health EST SURVEILLÉ, OU NOMMÉ « VU ET PAS SURVEILLÉ ».

   La règle du dépôt (CLAUDE.md, `atts` et `mailRefus`) : un champ de `/health` que personne ne lit est du code mort qui a
   l'air d'une garde. `atts` était écrit `true` EN DUR : l'alarme « pièces jointes désactivées » ne pouvait jamais se
   déclencher. `mailRefus` était publié, commenté, expliqué dans CLAUDE.md — et lu par personne, du 11 au 21 septembre.

   Ce banc fait trois choses :
     1. il JOUE `evaluer` sur des /health fabriqués : chaque défaut annoncé fait sortir un problème, un service sain n'en
        fait sortir aucun (une alarme qui crie sur du sain se fait ignorer, puis désactiver) ;
     2. il compare les CHEMINS COMPLETS (`sauvegarde.ageH`, pas `ageH`) à ce que le code lit VRAIMENT : forme de lecture
        `j.<chemin>`, sur le fichier dont les COMMENTAIRES sont retirés. Un nom d'une lettre se trouve n'importe où dans un
        fichier JavaScript ; un sous-arbre passe sur le nom d'une feuille déjà listée ; un motif qui tombe dans un
        commentaire garde une phrase, pas un comportement — trois trous de `test-726`, relevés le 21 septembre 2026 ;
     3. il exige que la liste « vu et pas surveillé » ne parle que de champs qui existent, avec leur raison.
   ⚠️ La surveillance n'est PAS branchée sur un workflow (le DNS de msg-beta n'existe pas) : voir l'en-tête du fichier. */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const { banc, sansCommentairesJs, RACINE } = require('./bac-messages.js');
const t = banc();
const { v, vrai } = t;

const FICHIER = path.join(RACINE, '.github', 'scripts', 'surveillance-messages.js');
console.log('\n── 934 · la surveillance d\'OP MESSAGES ──');
vrai('le fichier existe', fs.existsSync(FICHIER));
const S = require(FICHIER);
const code = sansCommentairesJs(fs.readFileSync(FICHIER, 'utf8'));
vrai('une fois les commentaires retirés il reste du code (sinon les motifs ci-dessous passeraient sur du néant)', code.split('\n').filter(l => l.trim()).length > 40);
v('le module n\'a rien lancé en étant chargé (main ne tourne que lancé en direct)', typeof S.evaluer, 'function');

const SAIN = { ok: true, instance: 'beta', sha: 'a'.repeat(40), sauvegarde: { configuree: true, ageH: 0.5, essaiJours: 12, echecs: 0 }, stripeEchecMin: 0, facturation: { mode: 'test', toutOuvert: false }, pieces: { n: 4, octets: 123456, illisibles: 0, effacementsRates: 0 }, sms: { mode: 'journal', envoyes24h: 3, coutJourEur: 0.2, budgetJourPct: 1, budgetHeurePct: 0, boucliers: 0, ovhEchecs: 0, refus: {} } };

/* ══ 1. L'ÉVALUATION ═════════════════════════════════════════════════════════════════════════════════ */
v('un /health sain ne fait rien crier', S.evaluer(SAIN, 'beta'), []);
v('   un /health minimal (ok, instance, sha) — ce que le contrat garantit — est sain aussi', S.evaluer({ ok: true, instance: 'beta', sha: 'b'.repeat(40) }, 'beta'), []);
vrai('⛔ ok:false crie', S.evaluer(Object.assign({}, SAIN, { ok: false }), 'beta').some(p => /ok n'est pas vrai/.test(p)));
vrai('⛔ ok absent crie aussi (un service qui ne le dit pas n\'est pas sain)', S.evaluer({ instance: 'beta', sha: 'a'.repeat(40) }, 'beta').length >= 1);
vrai('⛔ une instance qui n\'est pas celle du domaine crie (la production derrière le domaine de la bêta)', S.evaluer(Object.assign({}, SAIN, { instance: 'prod' }), 'beta').some(p => /mauvais service/.test(p)));
vrai('   sans instance attendue, on ne compare pas (un domaine inconnu ne fait pas crier à tort)', S.evaluer(Object.assign({}, SAIN, { instance: 'prod', sms: Object.assign({}, SAIN.sms, { mode: 'ovh' }) }), null).length === 0);   // (en production, un mode SMS autre qu'« ovh » crie : c'est la ligne 8 ci-dessous)
vrai('⛔ un sha absent crie (le déployeur n\'a pas posé OPMSG_SHA)', S.evaluer({ ok: true, instance: 'beta' }, 'beta').some(p => /sha/.test(p)));
vrai('   un sha illisible aussi', S.evaluer(Object.assign({}, SAIN, { sha: 'zzz' }), 'beta').some(p => /sha/.test(p)));
vrai('   un sha abrégé (7 caractères) est accepté : le déployeur le tolère aussi', S.evaluer(Object.assign({}, SAIN, { sha: 'abc1234' }), 'beta').length === 0);
vrai('⛔ une sauvegarde non configurée crie', S.evaluer(Object.assign({}, SAIN, { sauvegarde: { configuree: false } }), 'beta').some(p => /sauvegarde/.test(p)));
vrai('⛔ une sauvegarde de 30 h crie', S.evaluer(Object.assign({}, SAIN, { sauvegarde: { configuree: true, ageH: 30, echecs: 0 } }), 'beta').some(p => /30 h/.test(p)));
v('⛔ le seuil est « plus de 2 h » (une copie par heure est promise) : 2 h pile ne crie pas', S.evaluer(Object.assign({}, SAIN, { sauvegarde: { configuree: true, ageH: 2, echecs: 0 } }), 'beta'), []);
vrai('   2,5 h crie (une passe entière a manqué)', S.evaluer(Object.assign({}, SAIN, { sauvegarde: { configuree: true, ageH: 2.5, echecs: 0 } }), 'beta').some(p => /3 h|2 h/.test(p)));
const avecSauv = (o, instance) => S.evaluer(Object.assign({}, SAIN, { instance: instance || 'beta' }, instance === 'prod' ? { sms: Object.assign({}, SAIN.sms, { mode: 'ovh' }) } : {}, { sauvegarde: Object.assign({ configuree: true, ageH: 0.4, essaiJours: 3, echecs: 0 }, o) }), instance || 'beta');
v('⛔ UNE passe ratée ne crie pas (un coffre qui hoquette), DEUX de suite crient', [avecSauv({ echecs: 1 }), avecSauv({ echecs: 2 }).length, /2 sauvegardes de suite/.test(avecSauv({ echecs: 2 })[0])], [[], 1, true]);
v('⛔ un âge NÉGATIF crie : la dernière sauvegarde « datée » de dans 480 h est une horloge en désordre, pas une sauvegarde toute fraîche (le service écrêtait l\'âge à 0, et rien ne criait)',
  [avecSauv({ ageH: -480 }).length, /horloge du serveur est en désordre/.test(avecSauv({ ageH: -480 })[0] || ''), /480 h dans le FUTUR/.test(avecSauv({ ageH: -480 })[0] || '')], [1, true, true]);
v('   une demi-heure de « futur » (une horloge qui se recale) ne crie pas : la tolérance est d\'une heure', [avecSauv({ ageH: -0.5 }), avecSauv({ ageH: -1 }), avecSauv({ ageH: -1.1 }).length], [[], [], 1]);
vrai('⛔ « configurée » et JAMAIS réussie (ageH:null) crie : l\'âge ne voit pas cette panne, et la minuterie peut ne rien tenter', avecSauv({ ageH: null }).some(p => /aucune n'a réussi/.test(p)));
v('   non configurée : on ne crie QUE « pas configurée » (pas aussi « jamais réussie »)', S.evaluer(Object.assign({}, SAIN, { sauvegarde: { configuree: false, ageH: null, essaiJours: null, echecs: 0 } }), 'beta').length, 1);
v('⛔ EN PRODUCTION, 35 jours sans exercice de restauration ne crient pas encore, 36 crient', [avecSauv({ essaiJours: 35 }, 'prod'), avecSauv({ essaiJours: 36 }, 'prod').length], [[], 1]);
vrai('   et « jamais réussi » (null) crie en production : une sauvegarde qu\'on n\'a jamais rouverte est une croyance', avecSauv({ essaiJours: null }, 'prod').some(p => /JAMAIS réussi/.test(p)));
v('⛔ EN BÊTA l\'exercice n\'est PAS une alarme (null, 40 jours : rien) — la bêta est jetable, et crier chaque mois y apprendrait à ignorer l\'alarme de la production', [avecSauv({ essaiJours: null }, 'beta'), avecSauv({ essaiJours: 400 }, 'beta')], [[], []]);
vrai('⛔ Stripe illisible depuis 120 minutes crie', S.evaluer(Object.assign({}, SAIN, { stripeEchecMin: 120 }), 'beta').some(p => /Stripe/.test(p)));
v('   à 90 minutes pile, non (la règle d\'OP GESTION : on crie AU-DELÀ de 90)', S.evaluer(Object.assign({}, SAIN, { stripeEchecMin: 90 }), 'beta'), []);
/* ⛔ Perso+ : une personne qui s'en va (suppression demandée, annulée ou compte effacé) dont l'abonnement n'a pas pu être arrêté, rétabli ou résilié chez Stripe — une carte prélevée pour quelqu'un qui est parti. /health ne dit que l'AGE du plus ancien geste en attente. */
const avecAnnulation = (min) => S.evaluer(Object.assign({}, SAIN, { facturation: { mode: 'test', toutOuvert: false, persoAnnulationMin: min } }), 'beta');
vrai('⛔ Perso+ : un geste d\'abonnement (arrêt du renouvellement, rétablissement ou résiliation) qui attend Stripe depuis plus d\'un jour (1 500 min) crie, et le message le dit en heures', avecAnnulation(1500).some(p => /Perso\+/.test(p) && /25 h/.test(p)));
v('   à 1 440 minutes pile (un jour), non — on crie AU-DELÀ', avecAnnulation(1440), []);
v('   aucune attente (0), un /health d\'avant (sans la clé) : rien', [avecAnnulation(0), S.evaluer(SAIN, 'beta').filter(p => /Perso\+/.test(p))], [[], []]);
vrai('   le message ne cite aucun identifiant et aucun nombre d\'abonnés', avecAnnulation(3000).every(p => !/sub_|cus_|p_[0-9a-f]{32}|abonnés/.test(p)));
vrai('⛔ une ligne chiffrée illisible crie (le service avale l\'erreur de lecture : sans ce champ, personne ne le saurait)', S.evaluer(Object.assign({}, SAIN, { base: { ok: true, schema: 1, illisibles: 2 } }), 'beta').some(p => /illisible/.test(p)));
v('   zéro ligne illisible : rien', S.evaluer(Object.assign({}, SAIN, { base: { ok: true, schema: 1, illisibles: 0 } }), 'beta'), []);
vrai('⛔ une pièce illisible crie (le service avale l\'erreur de lecture d\'un fichier : sans ce champ, des photos disparaîtraient sans que personne le sache)', S.evaluer(Object.assign({}, SAIN, { pieces: Object.assign({}, SAIN.pieces, { illisibles: 1 }) }), 'beta').some(p => /illisible/.test(p)));
v('   aucune pièce illisible : rien', S.evaluer(Object.assign({}, SAIN, { pieces: Object.assign({}, SAIN.pieces, { illisibles: 0 }) }), 'beta'), []);
vrai('⛔ cinq fichiers de pièces qu\'on n\'a pas pu effacer crient (ils s\'accumulent sur le disque)', S.evaluer(Object.assign({}, SAIN, { pieces: Object.assign({}, SAIN.pieces, { effacementsRates: 5 }) }), 'beta').some(p => /non effacé/.test(p)));
v('   quatre ne crient pas encore (un échec isolé se répare : le balayeur réessaie)', S.evaluer(Object.assign({}, SAIN, { pieces: Object.assign({}, SAIN.pieces, { effacementsRates: 4 }) }), 'beta'), []);
vrai('⛔ la relecture des accès bêta qui échoue depuis plus de cinq passages crie', S.evaluer(Object.assign({}, SAIN, { porte: { relecturesEchec: 6 } }), 'beta').some(p => /relecture/.test(p)));
v('   à cinq passages pile, non', S.evaluer(Object.assign({}, SAIN, { porte: { relecturesEchec: 5 } }), 'beta'), []);
vrai('   un /health qui n\'est pas un objet crie sans planter', S.evaluer(null, 'beta').length === 1 && S.evaluer('texte', 'beta').length === 1);
vrai('⛔ aucun problème ne contient d\'identifiant, d\'adresse ni de corps : seulement des mots de la surveillance (le dépôt est public)',
  S.evaluer({ ok: false, instance: 'x@y.fr', sha: 'jeton-secret', sauvegarde: { configuree: false }, stripeEchecMin: 500 }, 'beta').every(p => !/x@y\.fr|jeton-secret/.test(p)));
v('instanceDe : msg-beta → beta, msg → prod, un autre domaine → rien',
  [S.instanceDe('https://msg-beta.teamop.fr/health'), S.instanceDe('https://msg.teamop.fr/health'), S.instanceDe('https://exemple.fr/health')], ['beta', 'prod', null]);

/* ══ 1 bis. LES NOTIFICATIONS PUSH (/health.push) ═══════════════════════════════════════════════════════════════════════════════════ */
{
  const PUSH_SAIN = { actif: true, abonnements: 3, envoyes24h: 120, echecs24h: 4, refuses24h: 0 };
  v('un /health avec des notifications push saines ne fait rien crier', S.evaluer(Object.assign({}, SAIN, { push: PUSH_SAIN }), 'beta'), []);
  vrai('⛔ un push désactivé (paire VAPID illisible) crie', S.evaluer(Object.assign({}, SAIN, { push: Object.assign({}, PUSH_SAIN, { actif: false }) }), 'beta').some(p => /notifications push sont désactivées/.test(p)));
  vrai('⛔ vingt échecs d\'envoi pour moins de livraisons crient', S.evaluer(Object.assign({}, SAIN, { push: { actif: true, abonnements: 3, envoyes24h: 5, echecs24h: 40 } }), 'beta').some(p => /40 échecs d'envoi contre 5 livraisons/.test(p)));
  v('   mais pas sous le seuil de volume (trois échecs sur un seul envoi : un hasard)', S.evaluer(Object.assign({}, SAIN, { push: { actif: true, abonnements: 1, envoyes24h: 1, echecs24h: 3 } }), 'beta'), []);
  v('   ni quand les livraisons l\'emportent (40 échecs, 500 livraisons)', S.evaluer(Object.assign({}, SAIN, { push: { actif: true, abonnements: 9, envoyes24h: 500, echecs24h: 40 } }), 'beta'), []);
  v('   et un /health sans la clé « push » (un service d\'avant) ne crie pas', S.evaluer(SAIN, 'beta'), []);
  /* les refus 401/403 : c'est NOTRE clé VAPID que le service push refuse — jamais un retrait d'abonnement, donc seule la surveillance peut le voir */
  vrai('⛔ trois refus de nos clés (401/403) pour moins de livraisons crient, et disent que la paire est en cause', S.evaluer(Object.assign({}, SAIN, { push: { actif: true, abonnements: 3, envoyes24h: 1, echecs24h: 3, refuses24h: 3 } }), 'beta').some(p => /3 refus 401\/403 contre 1 livraisons/.test(p) && /VAPID/.test(p)));
  v('   deux refus ne crient pas (un abonnement d\'une autre paire, un hasard)', S.evaluer(Object.assign({}, SAIN, { push: { actif: true, abonnements: 3, envoyes24h: 0, echecs24h: 2, refuses24h: 2 } }), 'beta'), []);
  v('   ni quand les livraisons l\'emportent (quelques abonnements d\'une ancienne paire parmi des centaines de livraisons)', S.evaluer(Object.assign({}, SAIN, { push: { actif: true, abonnements: 300, envoyes24h: 400, echecs24h: 12, refuses24h: 12 } }), 'beta'), []);
  vrai('⛔ aucun problème ne contient de point d\'accès ni de clé : seulement des nombres', S.evaluer(Object.assign({}, SAIN, { push: { actif: false, abonnements: 3, envoyes24h: 1, echecs24h: 99, endpoint: 'https://fcm.googleapis.com/x', cle: 'SECRETZXQ' } }), 'beta').every(p => !/fcm|SECRETZXQ/.test(p)));
  /* le /health sain d'exemple porte désormais le champ « push » : chaque feuille doit être surveillée ou nommée (la boucle de la section 2 le contrôle) */
  Object.assign(SAIN, { push: PUSH_SAIN });
}

/* ══ 1 ter. LES RÉUNIONS PROGRAMMÉES (/health.reunions : le planificateur de rappels) ═══════════════════════════════════════════════════ */
{
  const R_SAIN = { actif: true, ageS: 7, echecs: 0, abandonnes: 0 };
  const avec = (o) => S.evaluer(Object.assign({}, SAIN, { reunions: Object.assign({}, R_SAIN, o) }), 'beta');
  v('un planificateur sain ne fait rien crier (un tour il y a sept secondes, aucun échec)', avec({}), []);
  vrai('⛔ un dernier tour vieux de dix minutes crie : la boucle est morte ou bloquée, plus aucun rappel ne part', avec({ ageS: 600 }).some(p => /planificateur des rappels de réunion ne tourne plus/.test(p) && /600 s/.test(p)));
  v('⛔ le seuil est « plus de cinq minutes » : 300 s pile ne crie pas, 301 crie', [avec({ ageS: 300 }), avec({ ageS: 301 }).length], [[], 1]);
  v('   « jamais tourné » (ageS null : la première seconde du service) ne crie pas', avec({ ageS: null }), []);
  vrai('⛔ trois tours de suite en échec crient (une erreur qui dure : un rappel qui lève à chaque passage ne part jamais)', avec({ echecs: 3 }).some(p => /3 tours de suite/.test(p)));
  v('   un ou deux échecs ne crient pas (un accroc isolé)', [avec({ echecs: 1 }), avec({ echecs: 2 })], [[], []]);
  v('   `actif:false` et des rappels abandonnés ne crient JAMAIS (un bail qui expire, un service qui revient après un arrêt : le fonctionnement voulu)', avec({ actif: false, abandonnes: 40 }), []);
  v('   un /health sans la clé « reunions » (un service d\'avant) ne crie pas', S.evaluer(SAIN, 'beta'), []);
  vrai('⛔ aucun problème ne contient d\'identifiant : seulement des nombres', avec({ ageS: 900, echecs: 5, titre: 'TITRE-SECRETZXQ', uid: 'p_deadbeef' }).every(p => !/SECRETZXQ|deadbeef/.test(p)));
  Object.assign(SAIN, { reunions: R_SAIN });
}

/* ══ 1 quater. LES APPELS À DEUX (/health.appels : le balayeur des sonneries échues et des appareils perdus) ══════════════════════════════ */
{
  const A_SAIN = { turn: false, ageS: 1, echecs: 0 };
  const avec = (o) => S.evaluer(Object.assign({}, SAIN, { appels: Object.assign({}, A_SAIN, o) }), 'beta');
  v('un balayeur sain ne fait rien crier (un passage il y a une seconde, aucun échec) — relais absent compris : tant que Justin n\'a pas lancé install-turn.sh, ce n\'est pas une panne', avec({}), []);
  vrai('⛔ un dernier passage vieux de dix minutes crie : la boucle est morte ou bloquée, plus aucun appel manqué ne s\'écrit', avec({ ageS: 600 }).some(p => /balayeur d'appels ne tourne plus/.test(p) && /600 s/.test(p)));
  v('⛔ le seuil est « plus de cinq minutes » : 300 s pile ne crie pas, 301 crie', [avec({ ageS: 300 }), avec({ ageS: 301 }).length], [[], 1]);
  v('   « jamais passé » (ageS null : la première seconde du service) ne crie pas', avec({ ageS: null }), []);
  vrai('⛔ trois passages de suite en échec crient (une erreur qui dure : une sonnerie échue qui lève à chaque tour ne devient jamais un appel manqué)', avec({ echecs: 3 }).some(p => /3 passages de suite du balayeur d'appels/.test(p)));
  v('   un ou deux échecs ne crient pas (un accroc isolé)', [avec({ echecs: 1 }), avec({ echecs: 2 })], [[], []]);
  v('   un relais installé ou non ne crie JAMAIS sans sonde (sans le résultat d\'une requête UDP, le service seul ne peut pas dire si coturn répond)', [avec({ turn: true }), avec({ turn: false })], [[], []]);
  const avecSonde = (o, sonde) => S.evaluer(Object.assign({}, SAIN, { appels: Object.assign({}, A_SAIN, o) }), 'beta', sonde);
  vrai('⛔ un relais ANNONCÉ par le service et MUET à la requête STUN en UDP crie (R6 : coturn arrêté, UDP 3478 fermé, DNS du relais)', avecSonde({ turn: true }, { relais: false }).some(p => /relais d'appels ne répond pas à une requête STUN/.test(p)));
  v('   sondé et répondant : rien ; non sondé : rien ; aucun relais annoncé (avant l\'installation de coturn) : rien, même si une sonde dit faux', [avecSonde({ turn: true }, { relais: true }), avecSonde({ turn: true }, {}), avecSonde({ turn: false }, { relais: false })], [[], [], []]);
  v('   un /health sans la clé « appels » (un service d\'avant) ne crie pas', S.evaluer(Object.assign({}, SAIN, { appels: undefined }), 'beta'), []);
  vrai('⛔ aucun problème ne contient d\'identifiant : seulement des nombres', avec({ ageS: 900, echecs: 5, appel: 'a_deadbeefcafe', uid: 'p_deadbeef' }).every(p => !/deadbeef/.test(p)));
  Object.assign(SAIN, { appels: A_SAIN });
}

/* ══ 1 quinquies (avant). LE SERVEUR DE VISIO (/health.visio, 8 octobre 2026) : hors service, ports fermés de l'extérieur, avis tous refusés ══════════════════════════════ */
{
  const V_SAIN = { configuree: true, ok: true, ageS: 4, echecs: 0, avisRecus: 12, avisRefuses: 0, retraitsForces: 1, commandesEchouees: 0 };
  const avec = (o, sonde) => S.evaluer(Object.assign({}, SAIN, { visio: Object.assign({}, V_SAIN, o) }), 'beta', sonde);
  v('un serveur de visio sain ne fait rien crier (sans sonde : on ne conclut rien des ports)', avec({}), []);
  v('   un service SANS visio (« configuree: false ») ou d\'avant (sans la clé) ne crie pas, même si une sonde dit faux : avant install-sfu.sh, « pas de visio » n\'est pas une panne', [S.evaluer(Object.assign({}, SAIN, { visio: { configuree: false } }), 'beta', { visio: false }), S.evaluer(Object.assign({}, SAIN, { visio: undefined }), 'beta')], [[], []]);
  vrai('⛔ configuré et HORS SERVICE (deux sondes ratées) : crie — les salles neuves repartent en maille, celles en cours sont coupées', avec({ ok: false, echecs: 2, ageS: 40 }).some(p => /serveur de visio ne répond plus au service/.test(p) && /opmsg-visio-beta/.test(p)));
  vrai('⛔ configuré, en service, mais son port TCP public MUET de l\'extérieur : crie — les pare-feu ne laissent pas passer l\'image', avec({}, { visio: false }).some(p => /ne se joint pas de l'extérieur/.test(p)));
  v('   sondé et joignable : rien', avec({}, { visio: true }), []);
  vrai('⛔ des avis REFUSÉS et AUCUN accepté : crie — la clé du service et celle de LiveKit ne sont plus la même paire, plus aucune entrée n\'est vérifiée', avec({ avisRecus: 0, avisRefuses: 7 }).some(p => /tous les avis du serveur de visio sont refusés/.test(p) && /7 refus/.test(p)));
  v('   un refus isolé parmi des avis acceptés ne crie pas (une requête locale malformée n\'est pas une panne) ; aucun avis du tout non plus (une heure sans salle)', [avec({ avisRefuses: 1 }), avec({ avisRecus: 0, avisRefuses: 0 })], [[], []]);
  v('   les compteurs cumulés ne crient pas (ils ne redescendent qu\'au redémarrage : une alarme dessus crierait chaque heure après une seule panne)', avec({ commandesEchouees: 9, retraitsForces: 40 }), []);
  vrai('⛔ aucun problème ne contient d\'identifiant : seulement des nombres', avec({ ok: false, avisRecus: 0, avisRefuses: 3, salle: 'beta-a_deadbeef' }, { visio: false }).every(p => !/deadbeef/.test(p)));
  /* ⛔ les ports de la sonde sont CEUX qu'install-sfu.sh ouvre (relus dans le script : deux copies d'un même chiffre divergent toujours) */
  const script = fs.readFileSync(path.join(RACINE, 'server-msg', 'install-sfu.sh'), 'utf8');
  const ports = {}; for (const m of script.matchAll(/^\s*(beta|prod)\) PORT_HTTP=(\d+); PORT_TCP=(\d+); PORT_UDP=(\d+) ;;/gm)) ports[m[1]] = Number(m[3]);
  v('les ports TCP sondés sont ceux qu\'install-sfu.sh ouvre, instance par instance', S.VISIO_PORTS_TCP, ports);
  Object.assign(SAIN, { visio: V_SAIN });
}

/* ══ 2. CHAQUE CHAMP EST LU PAR LE CODE (ou nommé) — sur le CHEMIN COMPLET, dans le CODE ═══════════════ */
const lecture = (chemin) => 'j.' + chemin;
vrai('la liste des champs surveillés est peuplée (population avant verdict)', S.CHAMPS_SURVEILLES.length >= 5);
for (const c of S.CHAMPS_SURVEILLES) {
  const motif = new RegExp('\\bj\\.' + c.split('.').join('\\.') + '\\b');   // `j.sauvegarde.ageH` en entier : jamais la feuille seule
  vrai('⛔ ' + c + ' : le code lit « ' + lecture(c) + ' » (chemin complet, hors commentaires)', motif.test(code));
}
vrai('   un chemin d\'une seule lettre n\'est pas admis (il se trouverait n\'importe où dans un fichier JavaScript)', S.CHAMPS_SURVEILLES.every(c => c.split('.').pop().length > 1));
v('⛔ aucun champ n\'est à la fois surveillé ET « vu et pas surveillé » (deux décisions contradictoires)', S.CHAMPS_SURVEILLES.filter(c => c in S.CHAMPS_VUS), []);
vrai('   chaque champ « vu et pas surveillé » porte sa RAISON (une phrase, pas un mot)', Object.values(S.CHAMPS_VUS).every(r => typeof r === 'string' && r.length > 25));
for (const c of Object.keys(S.CHAMPS_VUS)) {
  /* Une entrée qui parle d'un champ disparu est une décision prise pour du vide : le champ doit être lu par un exemple de /health. */
  const ex = c.split('.').reduce((o, k) => (o && typeof o === 'object') ? o[k] : undefined, SAIN);
  vrai('   « ' + c + ' » existe dans un /health d\'exemple (sinon la décision « vu et pas surveillé » porte sur du vide)', ex !== undefined);
}
v('⛔ le /health sain d\'exemple n\'a AUCUN champ ni surveillé ni nommé — un champ neuf oblige à trancher, une fois, par écrit', S.nonClasses(SAIN), []);
v('   un champ NEUF est repéré (le mécanisme voit ce qu\'il doit voir)', S.nonClasses(Object.assign({}, SAIN, { nouveau: 1, sauvegarde: Object.assign({}, SAIN.sauvegarde, { autre: 2 }) })), ['sauvegarde.autre', 'nouveau']);
v('   les tables à clés dynamiques s\'arrêtent à leur conteneur (y descendre ferait un faux orphelin au premier refus)', S.nonClasses({ ok: true, refus: { quelconque: 3 } }), ['refus']);

/* ══ 3. LE FICHIER LANCÉ EN DIRECT ═════════════════════════════════════════════════════════════════════ */
{
  /* Lancé en direct contre une adresse qui ne répond pas : il sort en 1 et le DIT, sans planter ni rien afficher d'autre.
     (Le réseau n'est pas nécessaire : une adresse locale fermée refuse la connexion tout de suite.) */
  const r = spawnSync(process.execPath, [FICHIER], { encoding: 'utf8', env: Object.assign({}, process.env, { OPMSG_SURVEILLE_URL: 'https://127.0.0.1:9/health' }), timeout: 30000 });
  v('⛔ lancé en direct sur un service injoignable : sortie 1 (GitHub ouvre alors une issue et prévient)', r.status, 1);
  vrai('   il le dit au format GitHub (::error::) et sans identifiant', /::error::OP MESSAGES : injoignable/.test(String(r.stdout)));
  const mentionnent = fs.readdirSync(path.join(RACINE, '.github', 'workflows')).filter(f => /surveillance-messages/.test(fs.readFileSync(path.join(RACINE, '.github', 'workflows', f), 'utf8')));
  v('   et il n\'est branché sur aucun workflow tant que le DNS n\'existe pas (le dire ici évite qu\'on le croie en service)', mentionnent, []);
}

/* ══ 4. LE /health VIVANT ═══════════════════════════════════════════════════════════════════════════════
   ⛔ Le /health sain d'exemple (SAIN, plus haut) s'écrit À LA MAIN : un champ ajouté au service et pas à l'exemple échappait à toute la section 2 — pris le 3 octobre 2026, quand
   `facturation` est entrée dans /health et que ce banc est resté vert. On part donc du /health que le VRAI service rend, bêta ET production. (Le service ne démarre pas sans ses
   dépendances : le banc le dit au lieu de passer sur du néant.)
   ⚠️ LA DETTE, NOMMÉE : ce contrôle a trouvé quatorze champs d'AVANT l'étape 5 que personne n'a jamais classés (ni surveillés, ni « vus et pas surveillés ») — la règle de la tête de ce
   fichier n'était tenue que sur l'exemple. Les classer demande des décisions qui sont à Justin (`disque.bas` : le service passe en lecture seule, faut-il crier ?), pas à un banc :
   ils sont listés ICI, un par un, et le banc exige qu'AUCUN champ neuf n'aille les rejoindre. Un champ classé depuis sort de la liste (le banc le dit), jamais l'inverse. */
const DETTE = ['version', 'uptimeS', 'base.ok', 'base.schema', 'flux.ouverts', 'flux.personnes', 'flux.refus', 'porte', 'porte.ouvertures', 'porte.refusAmont', 'porte.derniereRelectureOk', 'boucle.p99Ms', 'disque.bas', 'quotasRefus'];
const T = require('./outils-msg');
(async () => {
  /* ══ 1 quinquies. LA SONDE UDP DU RELAIS (R6) : une VRAIE requête STUN, jouée contre de faux relais en boucle locale ═══════════════════════════════════════
     ⛔ Chaque « faux » est PROUVÉ par un cas qui répond juste : une sonde qui rend toujours faux, ou toujours vrai, ne se verrait pas. Les délais sont ceux du banc (150 ms), pas ceux de la surveillance (3 s). */
  {
    const dgram = require('dgram');
    const faux = (repondre) => new Promise((ok) => { const s = dgram.createSocket('udp4'); s.vus = 0; s.on('message', (m, r) => { s.vus++; const rep = repondre(m, s.vus); if (rep) s.send(rep, r.port, r.address); }); s.bind(0, '127.0.0.1', () => ok(s)); });
    const succes = (m) => { const b = Buffer.from(m); b.writeUInt16BE(0x0101, 0); return b; };
    const sonder = (s, essais) => S.sonderRelais('127.0.0.1', s.address().port, 150, essais || 3);
    const serveurs = [];
    try {
      const bon = await faux(succes), muet = await faux(() => null), autreTxid = await faux((m) => { const b = succes(m); b[8] ^= 0xff; return b; }), erreur = await faux((m) => { const b = Buffer.from(m); b.writeUInt16BE(0x0111, 0); return b; });
      const tardif = await faux((m, n) => n >= 2 ? succes(m) : null);
      serveurs.push(bon, muet, autreTxid, erreur, tardif);
      v('⛔ un relais qui répond à la requête STUN (Binding, même identifiant de transaction) : la sonde rend VRAI — et il a bien reçu une requête de 20 octets', [await sonder(bon), bon.vus >= 1], [true, true]);
      v('⛔ un relais MUET, un relais qui répond avec un autre identifiant de transaction, un qui répond « erreur » : la sonde rend FAUX (population : chacun a bien reçu les trois essais)', [await sonder(muet), await sonder(autreTxid), await sonder(erreur), muet.vus, autreTxid.vus, erreur.vus], [false, false, false, 3, 3, 3]);
      v('   un paquet perdu n\'est pas une panne : la réponse au SECOND essai suffit', [await sonder(tardif), tardif.vus], [true, 2]);
      v('   un nom qui ne se résout pas : FAUX, sans lever', await S.sonderRelais('relais.invalid', 3478, 150, 2), false);
    } finally { for (const s of serveurs) { try { s.close(); } catch (e) { /* fermé */ } } }
  }
  /* ══ LA SONDE TCP DU SERVEUR DE VISIO : une connexion acceptée, ou rien. Prouvée dans les deux sens (une sonde qui rend toujours faux, ou toujours vrai, ne se verrait pas). ══ */
  {
    const netm = require('net');
    const ouvert = await new Promise((ok) => { const srv = netm.createServer((c) => { srv.vus = (srv.vus || 0) + 1; c.destroy(); }); srv.listen(0, '127.0.0.1', () => ok(srv)); });
    const ferme = await new Promise((ok) => { const srv = netm.createServer(); srv.listen(0, '127.0.0.1', () => { const port = srv.address().port; srv.close(() => ok(port)); }); });
    try {
      v('⛔ un port qui ACCEPTE : VRAI — et il a bien reçu une connexion', [await S.sonderVisioTcp('127.0.0.1', ouvert.address().port, 300, 3), !!(await T.attendre(() => ouvert.vus >= 1, 2000, 20))], [true, true]);
      v('⛔ un port FERMÉ : FAUX (trois essais) ; un nom qui ne se résout pas : FAUX, sans lever', [await S.sonderVisioTcp('127.0.0.1', ferme, 300, 3), await S.sonderVisioTcp('visio.invalid', 7881, 300, 2)], [false, false]);
    } finally { ouvert.close(); }
  }
  if (!fs.existsSync(path.join(T.SERVICE, 'node_modules'))) {
    console.log('  — server-msg/node_modules absent : le /health vivant n\'est pas joué (npm ci dans server-msg/)');
    t.fin();
    return;
  }
  const vus = new Set();
  for (const instance of ['beta', 'prod']) {
    let svc = null;
    try { svc = await T.lancerService({ instance }); }
    catch (e) { vrai('le service ' + instance + ' démarre pour qu\'on lise son /health (' + String(e.message).split('\n')[0].slice(0, 160) + ')', false); continue; }
    try {
      const h = (await T.client(svc.base).get('/health')).j;
      vrai('population : le /health ' + instance + ' vivant a des champs à classer (' + (h ? S.chemins(h).length : 0) + ')', !!h && S.chemins(h).length >= 15);
      const sans = S.nonClasses(h);
      for (const c of sans) vus.add(c);
      v('⛔ le /health ' + instance + ' VIVANT n\'a aucun champ NEUF sans décision — un champ neuf oblige à trancher, une fois, par écrit (l\'exemple écrit à la main ne le voyait pas)', sans.filter(c => !DETTE.includes(c)), []);
      vrai('   la facturation y est, et elle est classée : `stripeEchecMin` est surveillé, le mode et le drapeau de la bêta sont nommés', !!h.facturation && S.nonClasses({ stripeEchecMin: 0, facturation: h.facturation }).length === 0);
      v('⛔ … et RIEN d\'autre : ni espaces, ni abonnés, ni impayés (/health est public : ces chiffres commerciaux se lisent dans Stripe)', S.chemins(h.facturation).sort(), ['mode', 'persoAnnulationMin', 'toutOuvert']);
    } finally { if (svc) await svc.arreter(); }
  }
  v('⛔ chaque champ de la dette existe encore et n\'est toujours pas classé (un champ classé sort de la liste : elle ne parle jamais du vide)', DETTE.filter(c => !vus.has(c)), []);
  t.fin();
})();
