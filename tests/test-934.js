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

const SAIN = { ok: true, instance: 'beta', sha: 'a'.repeat(40), sauvegarde: { configuree: true, ageH: 0.5, essaiJours: 12 }, stripeEchecMin: 0, pieces: { n: 4, octets: 123456, illisibles: 0, effacementsRates: 0 }, sms: { mode: 'journal', envoyes24h: 3, coutJourEur: 0.2, budgetJourPct: 1, budgetHeurePct: 0, boucliers: 0, ovhEchecs: 0, refus: {} } };

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
vrai('⛔ une sauvegarde de 30 h crie', S.evaluer(Object.assign({}, SAIN, { sauvegarde: { configuree: true, ageH: 30 } }), 'beta').some(p => /30 h/.test(p)));
v('   une sauvegarde de 26 h ne crie pas encore (le seuil est « plus de 26 h »)', S.evaluer(Object.assign({}, SAIN, { sauvegarde: { configuree: true, ageH: 26 } }), 'beta'), []);
vrai('⛔ Stripe illisible depuis 120 minutes crie', S.evaluer(Object.assign({}, SAIN, { stripeEchecMin: 120 }), 'beta').some(p => /Stripe/.test(p)));
v('   à 90 minutes pile, non (la règle d\'OP GESTION : on crie AU-DELÀ de 90)', S.evaluer(Object.assign({}, SAIN, { stripeEchecMin: 90 }), 'beta'), []);
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
  const PUSH_SAIN = { actif: true, abonnements: 3, envoyes24h: 120, echecs24h: 4 };
  v('un /health avec des notifications push saines ne fait rien crier', S.evaluer(Object.assign({}, SAIN, { push: PUSH_SAIN }), 'beta'), []);
  vrai('⛔ un push désactivé (paire VAPID illisible) crie', S.evaluer(Object.assign({}, SAIN, { push: Object.assign({}, PUSH_SAIN, { actif: false }) }), 'beta').some(p => /notifications push sont désactivées/.test(p)));
  vrai('⛔ vingt échecs d\'envoi pour moins de livraisons crient', S.evaluer(Object.assign({}, SAIN, { push: { actif: true, abonnements: 3, envoyes24h: 5, echecs24h: 40 } }), 'beta').some(p => /40 échecs d'envoi contre 5 livraisons/.test(p)));
  v('   mais pas sous le seuil de volume (trois échecs sur un seul envoi : un hasard)', S.evaluer(Object.assign({}, SAIN, { push: { actif: true, abonnements: 1, envoyes24h: 1, echecs24h: 3 } }), 'beta'), []);
  v('   ni quand les livraisons l\'emportent (40 échecs, 500 livraisons)', S.evaluer(Object.assign({}, SAIN, { push: { actif: true, abonnements: 9, envoyes24h: 500, echecs24h: 40 } }), 'beta'), []);
  v('   et un /health sans la clé « push » (un service d\'avant) ne crie pas', S.evaluer(SAIN, 'beta'), []);
  vrai('⛔ aucun problème ne contient de point d\'accès ni de clé : seulement des nombres', S.evaluer(Object.assign({}, SAIN, { push: { actif: false, abonnements: 3, envoyes24h: 1, echecs24h: 99, endpoint: 'https://fcm.googleapis.com/x', cle: 'SECRETZXQ' } }), 'beta').every(p => !/fcm|SECRETZXQ/.test(p)));
  /* le /health sain d'exemple porte désormais le champ « push » : chaque feuille doit être surveillée ou nommée (la boucle de la section 2 le contrôle) */
  Object.assign(SAIN, { push: PUSH_SAIN });
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

t.fin();
