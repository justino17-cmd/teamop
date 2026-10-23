/* LES RÈGLES DE LA SENTINELLE (23 octobre 2026) — ce qui, dans l'état de santé du serveur, doit faire parler Max, Théo ou Nina.
 *
 * Justin : « je veux aussi des agents qui gèrent la surveillance, incidents ; en gros je veux des agents qui gèrent toutes les catégories de
 * la Tour ». Les seuils ne sont PAS inventés ici : ce sont ceux de `.github/scripts/surveillance.js`, la surveillance horaire de GitHub, qui reste
 * le seul endroit où la CI décide de crier. Chaque règle porte `ref`, la condition TELLE QU'ELLE EST ÉCRITE dans ce fichier-là, et `tests/test-2920.js`
 * relit `surveillance.js` (commentaires retirés) pour exiger que chaque `ref` y soit encore — c'est ce qui garde un ACCORD, pas une copie
 * (un seuil relevé d'un côté et oublié de l'autre ferait deux alarmes qui se contredisent).
 *
 * ⛔ UNE RÈGLE LIT DES NOMBRES, DES BOOLÉENS ET DES CLÉS DE TABLE — JAMAIS UN TEXTE. `/health` ne publie d'ailleurs rien d'autre, mais le texte d'une
 *    erreur (`portail.comptes.erreur`, `documents.erreur`) est une chaîne libre : la règle ne retient que SA PRÉSENCE. Les phrases (`texte`, `pistes`)
 *    sont écrites ICI, par nous ; un chiffre y entre arrondi, par `nb()`. C'est ce qui permet de les mettre dans un incident, un fil ou une consigne
 *    sans qu'un mot venu de l'extérieur y passe (`/api/monitor/report` est publique : son texte est forgeable).
 * ⛔ « ON NE SAIT PAS » N'EST PAS « TOUT VA BIEN », ET N'EST PAS UNE PANNE. Un champ absent (un serveur d'avant) ne déclenche rien, comme dans
 *    `surveillance.js` (`=== false`, `=== true`, `typeof … === 'number'`). Un état de santé illisible, c'est l'appelant qui le dit.
 * ⛔ CHAQUE RÈGLE A UN PROPRIÉTAIRE (`proprio`) : Max (le service), Théo (sauvegardes et conservation, le détail), Nina (la sécurité). Deux agents qui
 *    surveillent la même chose annoncent deux fois la même panne.
 *
 * `niveau` : critique (⛔⛔ de `surveillance.js` : on réveille Justin), important (⛔), info (⚠️ et les états durables). `zone` : liste fermée — la
 * « route concernée » que Jules lit.
 */
'use strict';

const NIVEAUX = ['info', 'important', 'critique'];
const ZONES = ['serveur', 'stripe', 'sauvegarde', 'conservation', 'courrier', 'portail', 'documents', 'socle', 'pieces', 'registres', 'limites', 'github', 'securite'];
const GRAVITE = { critique: 'haute', important: 'moyenne', info: 'faible' };

/* un nombre qui entre dans une phrase : entier, positif, borné — jamais une chaîne venue d'ailleurs */
const nb = x => (typeof x === 'number' && Number.isFinite(x)) ? String(Math.max(0, Math.min(999999, Math.round(x)))) : '?';
const num = x => (typeof x === 'number' && Number.isFinite(x)) ? x : null;
const at = (j, chemin) => { let c = j; for (const k of chemin.split('.')) { if (c === null || typeof c !== 'object') return undefined; c = c[k]; } return c; };
const sup = (j, chemin, seuil) => { const x = num(at(j, chemin)); return x !== null && x > seuil; };
const vrai = (j, chemin) => at(j, chemin) === true;
const faux = (j, chemin) => at(j, chemin) === false;
const present = (j, chemin) => { const x = at(j, chemin); return x !== undefined && x !== null && x !== false && x !== ''; };
const pl = (n, un, plus) => (n === 1 ? un : plus);
/* `surveillance.js` ne regarde le détail de la sauvegarde (échec, âge, élagage, copie mensuelle) que si elle n'est pas « inactive » — la branche `else if (j.sauvegarde)` */
const enMarche = j => { const s = at(j, 'sauvegarde'); return !!s && typeof s === 'object' && s.active !== false; };

const REGLES = [
  /* ═══ MAX — le service ═══ */
  { cle: 'sante_anormale', proprio: 'max', zone: 'serveur', niveau: 'critique', ref: '!j.ok',
    test: j => faux(j, 'ok'), valeurs: () => ({}), texte: () => 'le serveur se déclare en état anormal',
    pistes: 'Le serveur répond mais dit lui-même que quelque chose ne va pas. Premier réflexe : le journal du service, journalctl -u teamop-api.' },
  { cle: 'registre_illisible', proprio: 'max', zone: 'registres', niveau: 'critique',
    ref: 'j.registres.espaces === false || j.registres.fermes === false || j.registres.promos === false',
    test: j => !!j.registres && (faux(j, 'registres.espaces') || faux(j, 'registres.fermes') || faux(j, 'registres.promos')),
    valeurs: j => ({ annuaire: faux(j, 'registres.espaces') ? 1 : 0, fermetures: faux(j, 'registres.fermes') ? 1 : 0, codes_promo: faux(j, 'registres.promos') ? 1 : 0 }),
    texte: v => 'un registre du serveur est illisible (' + [v.annuaire ? 'l’annuaire des entreprises' : '', v.fermetures ? 'les fermetures' : '', v.codes_promo ? 'les codes promo déjà servis' : ''].filter(Boolean).join(', ') + ')',
    pistes: 'Le fichier n’est plus réécrit exprès : il est peut-être récupérable. Le réparer ou le restaurer depuis la sauvegarde, PUIS redémarrer. Journal : journalctl -u teamop-api | grep ILLISIBLE.' },
  { cle: 'stripe_illisible', proprio: 'max', zone: 'stripe', niveau: 'critique', ref: 'j.stripeEchecMin >= 90',
    test: j => { const x = num(j.stripeEchecMin); return x !== null && x >= 90; }, valeurs: j => ({ minutes: num(j.stripeEchecMin) }),
    texte: v => 'Stripe est illisible depuis ' + nb(v.minutes) + ' minutes : le serveur ne sait plus qui paie',
    pistes: 'Personne n’est suspendu pour autant, mais une entreprise qui vient de payer reste suspendue et les rappels J-7 attendent. Vérifier la clé Stripe du serveur et l’accès à api.stripe.com. Journal : journalctl -u teamop-api | grep -i stripe.' },
  { cle: 'email_desactive', proprio: 'max', zone: 'courrier', niveau: 'important', ref: '!j.email',
    test: j => faux(j, 'email'), valeurs: () => ({}), texte: () => 'l’envoi d’e-mails du serveur est désactivé',
    pistes: 'Les codes de sécurité et les courriels du serveur ne partent plus. Vérifier la configuration SMTP (smtp dans config.json) et le journal du service.' },
  { cle: 'pieces_jointes_off', proprio: 'max', zone: 'pieces', niveau: 'important', ref: '!j.atts',
    test: j => faux(j, 'atts'), valeurs: () => ({}), texte: () => 'les pièces jointes sont désactivées sur le serveur',
    pistes: 'Les bons de commande partent sans PDF. Vérifier le module des pièces au démarrage du service.' },
  { cle: 'portail_comptes', proprio: 'max', zone: 'portail', niveau: 'critique', ref: 'j.portail.comptes.erreur',
    test: j => present(j, 'portail.comptes.erreur'), valeurs: () => ({}), texte: () => 'les comptes du portail réglés ne se sont pas montés : plus aucun client ne peut se connecter à son espace',
    pistes: 'Le portail refuse de démarrer et le serveur continue sans lui. Journal : journalctl -u teamop-api | grep comptes.' },
  { cle: 'portail_dossiers', proprio: 'max', zone: 'portail', niveau: 'important', ref: 'j.portail.dossiers.erreur',
    test: j => present(j, 'portail.dossiers.erreur'), valeurs: () => ({}), texte: () => 'le portail client ne s’est pas monté : demandes, messages et nouveautés de l’espace client hors service',
    pistes: 'Journal : journalctl -u teamop-api | grep portail.' },
  { cle: 'demi_portail', proprio: 'max', zone: 'portail', niveau: 'important', ref: 'j.portail.comptes.actif === true',
    test: j => vrai(j, 'portail.comptes.actif') && faux(j, 'portail.dossiers.actif') && !present(j, 'portail.dossiers.erreur'), valeurs: () => ({}),
    texte: () => 'demi-portail : les comptes sont montés mais pas les dossiers, les clients se connectent et ne voient rien',
    pistes: 'Aucune exception côté portail : c’est un « si » qui est faux. Journal : journalctl -u teamop-api | grep portail.' },
  { cle: 'documents_non_montes', proprio: 'max', zone: 'documents', niveau: 'critique', ref: 'j.documents.actif !== true',
    test: j => !!j.documents && typeof j.documents === 'object' && j.documents.actif !== true, valeurs: () => ({}),
    texte: () => 'le rangement des documents d’équipe ne s’est pas monté : la synchro d’OP GESTION ne passe plus',
    pistes: 'Toute la synchro d’OP GESTION passe par ce module. Journal : journalctl -u teamop-api | grep documents.' },
  { cle: 'documents_illisibles', proprio: 'max', zone: 'documents', niveau: 'important', ref: 'j.documents.illisibles1h > 0',
    test: j => sup(j, 'documents.illisibles1h', 0), valeurs: j => ({ essais: num(at(j, 'documents.illisibles1h')) }),
    texte: v => 'un document d’équipe ne se lit plus sur le serveur (' + nb(v.essais) + ' essai' + pl(v.essais, '', 's') + ' dans l’heure) : cette entreprise ne reçoit plus rien',
    pistes: 'Regarder le dossier des documents sur le VPS : ls -la /opt/teamop/data/documents.' },
  { cle: 'documents_ecritures', proprio: 'max', zone: 'documents', niveau: 'important', ref: 'j.documents.ecrituresEchec1h > 0',
    test: j => sup(j, 'documents.ecrituresEchec1h', 0), valeurs: j => ({ echecs: num(at(j, 'documents.ecrituresEchec1h')) }),
    texte: v => nb(v.echecs) + ' écriture' + pl(v.echecs, '', 's') + ' de document d’équipe refusée' + pl(v.echecs, '', 's') + ' par le disque dans l’heure : le travail ne part plus',
    pistes: 'Le plus souvent le disque est plein. Sur le VPS : df -h.' },
  { cle: 'documents_quota', proprio: 'max', zone: 'documents', niveau: 'important', ref: 'j.documents.quotaRefus1h > 0',
    test: j => sup(j, 'documents.quotaRefus1h', 0), valeurs: j => ({ refus: num(at(j, 'documents.quotaRefus1h')) }),
    texte: v => nb(v.refus) + ' refus de budget du document d’équipe dans l’heure : une entreprise ne se synchronise plus normalement',
    pistes: 'Journal : journalctl -u teamop-api --since "1 hour ago".' },
  { cle: 'documents_copies_attente', proprio: 'max', zone: 'documents', niveau: 'important', ref: 'j.documents.copiesEnAttente1h > 0',
    test: j => sup(j, 'documents.copiesEnAttente1h', 0), valeurs: j => ({ copies: num(at(j, 'documents.copiesEnAttente1h')) }),
    texte: v => nb(v.copies) + ' copie' + pl(v.copies, '', 's') + ' de document d’équipe en attente dans l’heure : des appareils à jour ne se synchronisent pas',
    pistes: 'Tant que la version minimale n’est pas exigée ET confirmée chez Firestore, ces appareils restent sans synchro. Tour : exiger la dernière version, puis vérifier que Firestore est à jour.' },
  { cle: 'documents_copies_echec', proprio: 'max', zone: 'documents', niveau: 'info', ref: 'j.documents.copiesEchec1h > 0',
    test: j => sup(j, 'documents.copiesEchec1h', 0), valeurs: j => ({ copies: num(at(j, 'documents.copiesEchec1h')) }),
    texte: v => nb(v.copies) + ' copie' + pl(v.copies, '', 's') + ' depuis Firebase impossible' + pl(v.copies, '', 's') + ' dans l’heure ; les appareils réessaient',
    pistes: 'Si ça dure : la clé d’administration Firebase (/opt/teamop/firebase-admin.json), puis journalctl -u teamop-api | grep "copie firebase".' },
  { cle: 'synchro_refus', proprio: 'max', zone: 'limites', niveau: 'info', ref: 'j.limites.refusSynchro1h > 300',
    test: j => sup(j, 'limites.refusSynchro1h', 300), valeurs: j => ({ refus: num(at(j, 'limites.refusSynchro1h')) }),
    texte: v => nb(v.refus) + ' refus « trop de requêtes » sur la synchro dans l’heure : un bureau entier freiné, ou un robot qui vise ces routes',
    pistes: 'Les adresses ne sont pas publiées. Voir dans la Tour quelle entreprise a beaucoup d’appareils en ligne.' },
  { cle: 'processus_rejets', proprio: 'max', zone: 'serveur', niveau: 'important', ref: 'j.processus.rejets1h > 0',
    test: j => sup(j, 'processus.rejets1h', 0), valeurs: j => ({ rejets: num(at(j, 'processus.rejets1h')) }),
    texte: v => nb(v.rejets) + ' promesse' + pl(v.rejets, '', 's') + ' rejetée' + pl(v.rejets, '', 's') + ' sans gestionnaire dans l’heure : un défaut du serveur',
    pistes: 'Un défaut de code, jamais un client qui se trompe. Journal : journalctl -u teamop-api | grep "promesse rejetée".' },
  { cle: 'processus_erreurs', proprio: 'max', zone: 'serveur', niveau: 'important', ref: 'j.processus.erreurs1h > 0',
    test: j => sup(j, 'processus.erreurs1h', 0), valeurs: j => ({ erreurs: num(at(j, 'processus.erreurs1h')) }),
    texte: v => nb(v.erreurs) + ' erreur' + pl(v.erreurs, '', 's') + ' de route (5xx) dans l’heure',
    pistes: 'Une route a jeté : un défaut de code. Journal : journalctl -u teamop-api | grep "erreur de route".' },
  { cle: 'routes_doublons', proprio: 'max', zone: 'serveur', niveau: 'important', ref: "typeof j.routesDoublons === 'number' && j.routesDoublons > 0",
    test: j => sup(j, 'routesDoublons', 0), valeurs: j => ({ routes: num(j.routesDoublons) }),
    texte: v => nb(v.routes) + ' route' + pl(v.routes, '', 's') + ' de l’API déclarée' + pl(v.routes, '', 's') + ' deux fois : la seconde ne répond jamais, en silence',
    pistes: 'C’est la panne de /api/devis/etat. Voir le journal du démarrage du service.' },
  { cle: 'github_expire', proprio: 'max', zone: 'github', niveau: 'important', ref: 'j.ghExpireBientot === true',
    test: j => vrai(j, 'ghExpireBientot'), valeurs: () => ({}), texte: () => 'le jeton GitHub du serveur expire sous quinze jours (ou a expiré)',
    pistes: 'Le remplacer (fine-grained, dépôt teamop seul, Contents RW + Pull requests RW) et poser sa date dans github.expire de config.json. Sans lui « proposer un correctif » tombe en 401.' },
  { cle: 'socle_casse', proprio: 'max', zone: 'socle', niveau: 'critique', ref: 'j.socle.erreur',
    test: j => present(j, 'socle.erreur'), valeurs: () => ({}), texte: () => 'le socle (stockage serveur) n’a pas pu se monter au démarrage : il est cassé, pas éteint',
    pistes: 'Journal : journalctl -u teamop-api | grep "socle non monté".' },
  { cle: 'socle_illisibles', proprio: 'max', zone: 'socle', niveau: 'important', ref: 'j.socle.illisibles > 0',
    test: j => sup(j, 'socle.illisibles', 0), valeurs: j => ({ lignes: num(at(j, 'socle.illisibles')) }),
    texte: v => nb(v.lignes) + ' ligne' + pl(v.lignes, '', 's') + ' du socle ne se déchiffre' + pl(v.lignes, '', 'nt') + ' plus',
    pistes: 'Trafic, restauration mal ciblée ou bloc abîmé. Dans la Tour, l’aperçu d’un espace (« vérifier ») dit chez qui.' },
  { cle: 'pieces_pleines', proprio: 'max', zone: 'pieces', niveau: 'critique', ref: 'j.pieces.remplissage >= 95',
    test: j => { const x = num(at(j, 'pieces.remplissage')); return x !== null && x >= 95; }, valeurs: j => ({ pourcent: num(at(j, 'pieces.remplissage')) }),
    texte: v => 'le stockage des pièces jointes est à ' + nb(v.pourcent) + ' % : les prochains dépôts de photos seront refusés sur le terrain',
    pistes: 'Agrandir le disque du VPS ou relever piecesMaxTotal dans config.json.' },
  { cle: 'pieces_remplies', proprio: 'max', zone: 'pieces', niveau: 'info', ref: 'j.pieces.remplissage >= 80',
    test: j => { const x = num(at(j, 'pieces.remplissage')); return x !== null && x >= 80 && x < 95; }, valeurs: j => ({ pourcent: num(at(j, 'pieces.remplissage')) }),
    texte: v => 'le stockage des pièces jointes est à ' + nb(v.pourcent) + ' % du plafond',
    pistes: 'Prévoir de la place avant que les dépôts soient refusés (à 95 %).' },
  { cle: 'socle_ancre', proprio: 'max', zone: 'socle', niveau: 'important', ref: 'j.socle.ancreJours > 8',
    test: j => vrai(j, 'socle.actif') && sup(j, 'socle.ancreJours', 8), valeurs: j => ({ jours: num(at(j, 'socle.ancreJours')) }),
    texte: v => 'l’ancre du journal de diagnostic n’est pas sortie de la machine depuis ' + nb(v.jours) + ' jours',
    pistes: 'Le journal chaîné perd sa valeur de preuve tant que son ancre reste sur la machine.' },
  { cle: 'socle_sans_cle', proprio: 'max', zone: 'socle', niveau: 'critique', ref: 'j.socle.cle === false',
    test: j => vrai(j, 'socle.actif') && faux(j, 'socle.cle'), valeurs: () => ({}),
    texte: () => 'le socle tourne sans sa clé maître : les données des entreprises ne se déchiffrent plus',
    pistes: 'NE PAS générer une clé neuve (elle rendrait tout illisible) : retrouver /etc/teamop/kek, ou la restaurer depuis le gestionnaire de mots de passe.' },
  { cle: 'socle_divergence', proprio: 'max', zone: 'socle', niveau: 'critique', ref: 'j.socle.divergences.avecEcart > 0',
    test: j => sup(j, 'socle.divergences.avecEcart', 0), valeurs: j => ({ entreprises: num(at(j, 'socle.divergences.avecEcart')) }),
    texte: v => nb(v.entreprises) + ' entreprise' + pl(v.entreprises, '', 's') + ' en divergence : un appareil dit que sa base et celle du serveur ne se ressemblent plus',
    pistes: 'Voir la Tour (aperçu d’un espace) pour savoir chez qui ; ne rien restaurer avant de comprendre.' },
  { cle: 'socle_muet', proprio: 'max', zone: 'socle', niveau: 'info', ref: 'j.socle.divergences.espaces > 0', composee: true,   /* condition à plusieurs termes (espaces > 1 ET muets = espaces) : le banc ne la joue pas à la borne du seul premier */
    test: j => { const d = at(j, 'socle.divergences'); return !!d && num(d.espaces) > 1 && d.muets === d.espaces; }, valeurs: j => ({ entreprises: num(at(j, 'socle.divergences.espaces')) }),
    texte: v => 'aucune des ' + nb(v.entreprises) + ' entreprises du socle n’a donné de nouvelles : la vérification de divergence est muette',
    pistes: 'Aucun appareil ne remonte son empreinte : vérifier la version minimale exigée.' },
  { cle: 'socle_disque_plein', proprio: 'max', zone: 'socle', niveau: 'critique', ref: 'r.disque_plein > 0',
    test: j => sup(j, 'socle.refus7j.disque_plein', 0), valeurs: j => ({ ecritures: num(at(j, 'socle.refus7j.disque_plein')) }),
    texte: v => nb(v.ecritures) + ' écriture' + pl(v.ecritures, '', 's') + ' du socle refusée' + pl(v.ecritures, '', 's') + ' faute de place disque sur 7 jours : plus personne n’écrit',
    pistes: 'Une panne de plateforme. Agrandir le disque du VPS.' },
  { cle: 'socle_espace_plein', proprio: 'max', zone: 'socle', niveau: 'important', ref: 'r.espace_plein > 0',
    test: j => sup(j, 'socle.refus7j.espace_plein', 0), valeurs: j => ({ ecritures: num(at(j, 'socle.refus7j.espace_plein')) }),
    texte: v => nb(v.ecritures) + ' écriture' + pl(v.ecritures, '', 's') + ' refusée' + pl(v.ecritures, '', 's') + ' : une entreprise a atteint son plafond de stockage (sur 7 jours)',
    pistes: 'Régler socle.octetsMax dans config.json.' },
  { cle: 'socle_horloge', proprio: 'max', zone: 'socle', niveau: 'important', ref: 'r.horlogeAvancee > 0',
    test: j => sup(j, 'socle.refus7j.horlogeAvancee', 0), valeurs: j => ({ ecritures: num(at(j, 'socle.refus7j.horlogeAvancee')) }),
    texte: v => nb(v.ecritures) + ' écriture' + pl(v.ecritures, '', 's') + ' refusée' + pl(v.ecritures, '', 's') + ' pour horloge fausse sur 7 jours',
    pistes: 'L’heure du serveur ou celle d’un appareil dérive de plus de cinq minutes. Sur le VPS : timedatectl.' },
  { cle: 'socle_non_date', proprio: 'max', zone: 'socle', niveau: 'info', ref: 'r.non_date > 0',
    test: j => sup(j, 'socle.refus7j.non_date', 0), valeurs: j => ({ lignes: num(at(j, 'socle.refus7j.non_date')) }),
    texte: v => nb(v.lignes) + ' ligne' + pl(v.lignes, '', 's') + ' refusée' + pl(v.lignes, '', 's') + ' faute de date sur 7 jours',
    pistes: 'Des enregistrements que estampiller() ne tamponne pas n’atteindront jamais le socle.' },
  { cle: 'socle_lent_ecriture', proprio: 'max', zone: 'socle', niveau: 'important', ref: 'j.socle.latence.pousser.p95 > 1000',
    test: j => sup(j, 'socle.latence.pousser.p95', 1000), valeurs: j => ({ ms: num(at(j, 'socle.latence.pousser.p95')) }),
    texte: v => 'le socle met ' + nb(v.ms) + ' ms (p95) à accepter une écriture',
    pistes: 'Charge du VPS ou disque lent : uptime, iostat.' },
  { cle: 'socle_lent_lecture', proprio: 'max', zone: 'socle', niveau: 'important', ref: 'j.socle.latence.depuis.p95 > 2000',
    test: j => sup(j, 'socle.latence.depuis.p95', 2000), valeurs: j => ({ ms: num(at(j, 'socle.latence.depuis.p95')) }),
    texte: v => 'le socle met ' + nb(v.ms) + ' ms (p95) à servir une page de lecture : une synchro qui traîne chez tout le monde',
    pistes: 'Charge du VPS ou disque lent : uptime, iostat.' },
  { cle: 'bugs_applications', proprio: 'max', zone: 'serveur', niveau: 'important', ref: 'j.bugs1h > 0',
    test: j => sup(j, 'bugs1h', 0), valeurs: j => ({ erreurs: num(j.bugs1h) }),
    texte: v => nb(v.erreurs) + ' erreur' + pl(v.erreurs, '', 's') + ' signalée' + pl(v.erreurs, '', 's') + ' par les applications des entreprises dans la dernière heure',
    pistes: 'Le détail est dans le courriel d’alerte de la vigie et dans la Surveillance de la Tour (jamais ici : ce texte vient des appareils).' },
  /* le service de sauvegarde : Max dit qu'elle ne marche pas, Théo en donne le détail (motif, élagage, copie mensuelle) */
  { cle: 'sauvegarde_inactive', proprio: 'max', zone: 'sauvegarde', niveau: 'critique', ref: 'j.sauvegarde.active === false && j.sauvegarde.configuree === true',
    test: j => faux(j, 'sauvegarde.active') && vrai(j, 'sauvegarde.configuree'), valeurs: () => ({}),
    texte: () => 'la sauvegarde hors site est réglée et ne tourne pas : plus rien ne part hors du serveur',
    pistes: 'C’est une panne, pas une installation : le coffre est configuré et le module ne s’est pas monté. Journal : journalctl -u teamop-api | grep sauvegarde.' },
  { cle: 'sauvegarde_echec', proprio: 'max', zone: 'sauvegarde', niveau: 'critique', ref: 'j.sauvegarde.ok === false',
    test: j => enMarche(j) && faux(j, 'sauvegarde.ok'), valeurs: () => ({}),
    texte: () => 'la dernière sauvegarde hors site a échoué',
    pistes: 'Le motif est dans la Tour (Surveillance) ou dans journalctl -u teamop-api | grep sauvegarde.' },
  { cle: 'sauvegarde_jamais', proprio: 'max', zone: 'sauvegarde', niveau: 'important', ref: 'j.sauvegarde.ok === null',
    test: j => enMarche(j) && at(j, 'sauvegarde.ok') === null, valeurs: () => ({}),
    texte: () => 'aucune sauvegarde hors site n’a réussi depuis le dernier démarrage du serveur',
    pistes: 'Normal juste après un redémarrage tant que l’heure de la sauvegarde n’est pas passée ; sinon voir le journal.' },
  { cle: 'sauvegarde_vieille', proprio: 'max', zone: 'sauvegarde', niveau: 'critique', ref: 'j.sauvegarde.ageH > 26',
    test: j => enMarche(j) && at(j, 'sauvegarde.ok') !== false && at(j, 'sauvegarde.ok') !== null && sup(j, 'sauvegarde.ageH', 26), valeurs: j => ({ heures: num(at(j, 'sauvegarde.ageH')) }),
    texte: v => 'la dernière sauvegarde hors site date de ' + nb(v.heures) + ' h (plus de 26 h) : la minuterie ne tourne plus',
    pistes: 'Une sauvegarde quotidienne peut glisser de deux heures sans conséquence ; au-delà, la minuterie est arrêtée ou bloquée.' },

  /* ═══ THÉO — le détail des sauvegardes et la conservation des données ═══ */
  { cle: 'sauvegarde_non_branchee', proprio: 'theo', zone: 'sauvegarde', niveau: 'info', ref: 'j.sauvegarde.active === false',
    test: j => faux(j, 'sauvegarde.active') && !vrai(j, 'sauvegarde.configuree'), valeurs: () => ({}),
    texte: () => 'la sauvegarde hors site n’est pas encore branchée : les données du serveur ne sont copiées nulle part',
    pistes: 'Sur le VPS : node /opt/teamop/repo/server/configurer-sauvegarde.js (saisie masquée, jamais d’affichage d’un secret).' },
  { cle: 'sauvegarde_elagage', proprio: 'theo', zone: 'sauvegarde', niveau: 'important', ref: 'j.sauvegarde.elagageEchecs > 1',
    test: j => enMarche(j) && sup(j, 'sauvegarde.elagageEchecs', 1), valeurs: j => ({ nuits: num(at(j, 'sauvegarde.elagageEchecs')) }),
    texte: v => 'l’élagage du coffre échoue depuis ' + nb(v.nuits) + ' nuits : les vieilles archives ne sont plus supprimées',
    pistes: 'Le plus souvent la clé d’accès n’a pas le droit de lister le bucket. Le coffre grossit sans fin et la facture monte.' },
  { cle: 'sauvegarde_instantane', proprio: 'theo', zone: 'sauvegarde', niveau: 'important', ref: 'j.sauvegarde.instantaneEchecs > 0',
    test: j => enMarche(j) && sup(j, 'sauvegarde.instantaneEchecs', 0), valeurs: j => ({ bases: num(at(j, 'sauvegarde.instantaneEchecs')) }),
    texte: v => nb(v.bases) + ' base' + pl(v.bases, '', 's') + ' d’entreprise n’' + pl(v.bases, 'a', 'ont') + ' pas pu être copiée' + pl(v.bases, '', 's') + ' proprement dans la sauvegarde (copie brute à la place)',
    pistes: 'Une copie brute est récupérable mais pas garantie. C’est le signe d’une base abîmée ou d’une clé manquante : voir l’aperçu de l’espace dans la Tour.' },
  { cle: 'sauvegarde_mensuelle_vieille', proprio: 'theo', zone: 'sauvegarde', niveau: 'important', ref: 'j.sauvegarde.mensuelJ > 40',
    test: j => enMarche(j) && !faux(j, 'sauvegarde.mensuelActif') && sup(j, 'sauvegarde.mensuelJ', 40), valeurs: j => ({ jours: num(at(j, 'sauvegarde.mensuelJ')) }),
    texte: v => 'la dernière copie mensuelle date de ' + nb(v.jours) + ' jours (plus de 40)',
    pistes: 'C’est la copie qu’on emporte sur une autre machine. La sauvegarde du jour continue de réussir, donc rien d’autre ne le signale.' },
  { cle: 'sauvegarde_mensuelle_jamais', proprio: 'theo', zone: 'sauvegarde', niveau: 'info', ref: 'j.sauvegarde.mensuelJ === null',
    test: j => enMarche(j) && at(j, 'sauvegarde.mensuelJ') === null && !faux(j, 'sauvegarde.mensuelActif'), valeurs: () => ({}),
    texte: () => 'aucune copie mensuelle n’a encore été déposée',
    pistes: 'C’est celle qu’on emporte sur une autre machine. Voir la Tour (Surveillance) et journalctl -u teamop-api | grep mensuel.' },
  { cle: 'conservation_horloge', proprio: 'theo', zone: 'conservation', niveau: 'critique', ref: 'j.conservation.erreur',
    test: j => present(j, 'conservation.erreur'), valeurs: () => ({}),
    texte: () => 'l’horloge de conservation ne tourne plus : plus aucune date « ne paie plus depuis » n’est enregistrée',
    pistes: 'Ces dates ne se rattrapent pas : chaque heure de panne est une information perdue pour toujours. Journal : journalctl -u teamop-api | grep conservation.' },
  { cle: 'conservation_balayage', proprio: 'theo', zone: 'conservation', niveau: 'critique', ref: 'j.conservation.balayageOk === false',
    test: j => !present(j, 'conservation.erreur') && vrai(j, 'conservation.actif') && faux(j, 'conservation.balayageOk'), valeurs: () => ({}),
    texte: () => 'l’horloge de conservation est montée mais son balayage échoue : elle affiche « 0 suivie » sans qu’on puisse le distinguer d’une plateforme où tout le monde paie',
    pistes: 'Chaque heure ainsi est une date perdue pour toujours. Journal : journalctl -u teamop-api | grep balayage.' },
  { cle: 'conservation_echu', proprio: 'theo', zone: 'conservation', niveau: 'important', ref: 'j.conservation.echu === true',
    test: j => !present(j, 'conservation.erreur') && vrai(j, 'conservation.actif') && vrai(j, 'conservation.echu'), valeurs: () => ({}),
    texte: v => (v.entreprises > 0 ? nb(v.entreprises) + ' ' + pl(v.entreprises, 'entreprise a dépassé', 'entreprises ont dépassé') : 'au moins une entreprise a dépassé') + ' les 24 mois de conservation annoncés dans les CGV : nous gardons ses données au-delà de ce que nous avons écrit publiquement',
    pistes: 'Ce n’est pas une panne, c’est une exposition (limitation de conservation du RGPD). La suppression est un geste fixe : elle reste à Justin.' },
  { cle: 'conservation_preavis', proprio: 'theo', zone: 'conservation', niveau: 'info', ref: 'j.conservation.preavis === true',
    test: j => !present(j, 'conservation.erreur') && vrai(j, 'conservation.actif') && vrai(j, 'conservation.preavis'), valeurs: () => ({}),
    texte: v => (v.entreprises > 0 ? nb(v.entreprises) + ' ' + pl(v.entreprises, 'entreprise entre', 'entreprises entrent') : 'au moins une entreprise entre') + ' dans les 30 derniers jours de conservation : les CGV promettent un courriel de préavis',
    pistes: 'Rien n’envoie ce courriel : à faire à la main. Combien et qui : dans la Tour, la conservation.' },

  /* ═══ NINA — la sécurité ═══ */
  /* ⛔ « INCONNU » NE RÉVEILLE PERSONNE : c'est un teamId que L'APPELANT a choisi. Revue du 23 octobre 2026, rejoué : une seule requête anonyme (`X-Teamop-Kh` de 64 hexadécimaux + un
     teamId qui n'existe pas, sur /api/replies ou /api/mailboxes) pose `mailRefus.parMotif.inconnu` — et la règle d'origine, qui comptait tout motif hors absent/technique/partagee,
     donnait un push 🔴 à Justin, un incident « haute », un diagnostic de Jules (un appel à Claude) et un point de Victor devenu urgent, relançable toutes les ~2 h 10. Seul
     « invalide » (la preuve d'une clé présentée pour une entreprise qui EXISTE) désigne un appareil réel ; « inconnu » reste dit — en info, sans incident (`courrier_inconnu`), parce
     qu'une entreprise vivante tombée hors de l'annuaire produit exactement ça. La surveillance horaire (`surveillance.js`) garde sa règle large : elle crie par courriel, une fois par heure,
     elle ne pousse pas sur un téléphone ni n'appelle un modèle. D'où un `ref` qui reste celui de `surveillance.js` pendant que le `test` ci-dessous est volontairement PLUS ÉTROIT.
     ⛔ ET ON COMPTE CE QUI A MONTÉ DEPUIS LE DERNIER PASSAGE, MOTIF PAR MOTIF (`j.securite.refusInvalides`, posé par Nina comme `clesInvalides`) : `mailRefus.ts` est la date du dernier refus
     de N'IMPORTE QUEL motif, donc « total d'invalides > 0 et ts récent » se laissait réveiller par un refus « inconnu » forgé sur un vieil « invalide » de juillet. */
  { cle: 'courrier_refuse', proprio: 'nina', zone: 'securite', niveau: 'critique', ref: "motif !== 'absent' && motif !== 'technique' && motif !== 'partagee'",
    test: j => sup(j, 'securite.refusInvalides', 0), valeurs: j => ({ refus: num(at(j, 'securite.refusInvalides')) }),
    texte: v => 'des appareils se font refuser leur courrier maintenant (' + nb(v.refus) + ' refus de preuve de clé pour une entreprise qui existe) : une entreprise vivante dont la preuve de clé est refusée',
    pistes: 'Ces gens-là n’ont plus leur courrier (réception, envoi, boîte connectée). Qui exactement : dans la Tour, /api/mail/cles. Pour rouvrir le temps de comprendre : mailPreuveExigee à false dans config.json.' },
  { cle: 'courrier_inconnu', proprio: 'nina', zone: 'securite', niveau: 'info', sansIncident: true, src: 'index.js', ref: 'mailRefus.parMotif[motif] = (mailRefus.parMotif[motif] || 0) + 1',
    test: j => sup(j, 'securite.refusInconnus', 0), valeurs: j => ({ refus: num(at(j, 'securite.refusInconnus')) }),
    texte: v => nb(v.refus) + ' refus de courrier pour un espace que le serveur ne connaît pas',
    pistes: 'N’importe qui peut le provoquer d’une requête (le nom de l’espace est celui qu’il écrit) : ce n’est pas une alarme. Si ça dure, ou si une entreprise vivante n’a plus son courrier, regarder l’annuaire dans la Tour : une entreprise sortie de l’annuaire produit exactement ça.' },
  /* Ce que le SERVEUR relève déjà et que `/health` ne publie pas : Nina le lit par `securite()` (injecté) et le joint à l'état de santé sous `j.securite`. `src` : le fichier
     du serveur où la règle est écrite (la surveillance horaire ne la connaît pas) — le banc y relit `ref`. Pas de seuil de notre cru : un verrou existe quand le serveur l'a posé. */
  { cle: 'verrou_tour', proprio: 'nina', zone: 'securite', niveau: 'info', sansIncident: true, src: 'index.js', ref: 'const monLock = new Map()',
    test: j => sup(j, 'securite.verrousTour', 0), valeurs: j => ({ comptes: num(at(j, 'securite.verrousTour')) }),
    texte: v => nb(v.comptes) + ' compte' + pl(v.comptes, '', 's') + ' de la Tour (ou de la bêta) verrouillé' + pl(v.comptes, '', 's') + ' quinze minutes après cinq échecs de connexion d’affilée',
    pistes: 'Une faute de frappe suffit à poser un verrou. Si ce n’est personne de l’équipe, c’est à surveiller : le journal de la Tour (Système) montre les tentatives refusées.' },
  { cle: 'verrou_portail', proprio: 'nina', zone: 'securite', niveau: 'info', sansIncident: true, src: 'comptes.js', ref: 'ECHECS_MAX = 8',
    test: j => sup(j, 'securite.verrousPortail', 0), valeurs: j => ({ comptes: num(at(j, 'securite.verrousPortail')) }),
    texte: v => nb(v.comptes) + ' compte' + pl(v.comptes, '', 's') + ' du portail client bloqué' + pl(v.comptes, '', 's') + ' quinze minutes après huit échecs de mot de passe',
    pistes: 'Le blocage est par compte, pas par adresse IP. Un client qui se trompe en est la cause la plus fréquente ; plusieurs comptes à la fois, c’est autre chose.' },
  { cle: 'cle_invalide', proprio: 'nina', zone: 'securite', niveau: 'important', src: 'index.js', ref: 'invalide: cleEquipeVu.invalide',
    test: j => sup(j, 'securite.clesInvalides', 0), valeurs: j => ({ appareils: num(at(j, 'securite.clesInvalides')) }),
    texte: v => nb(v.appareils) + ' présentation' + pl(v.appareils, '', 's') + ' d’une preuve de clé d’équipe REFUSÉE depuis mon dernier passage : cette série doit rester à zéro',
    pistes: 'Une preuve invalide, c’est une clé qui ne correspond pas à l’entreprise : un appareil mal rattaché ou une tentative. Les routes concernées sont dans /health (cles.parRoute), sans entreprise nommée.' },
];

const PAR_CLE = new Map(REGLES.map(r => [r.cle, r]));

/* Les règles d'un propriétaire qui se déclenchent sur cet état de santé : Map cle → { niveau, zone, valeurs }. `j` illisible → null (on ne sait pas). */
function evaluer(j, proprio, maintenant) {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return null;
  const now = typeof maintenant === 'function' ? maintenant() : Date.now();
  const sortie = new Map();
  for (const r of REGLES) {
    if (proprio && r.proprio !== proprio) continue;
    let actif = false;
    try { actif = r.test(j, now) === true; } catch (e) { actif = false; }
    if (!actif) continue;
    let valeurs = {};
    try { valeurs = r.valeurs(j) || {}; } catch (e) { valeurs = {}; }
    const propres = {};
    for (const [k, x] of Object.entries(valeurs)) if (/^[a-z_]{1,30}$/.test(k) && (typeof x === 'number' ? Number.isFinite(x) : x === null)) propres[k] = x;
    sortie.set(r.cle, { niveau: r.niveau, zone: r.zone, valeurs: propres });
  }
  return sortie;
}

/* La phrase d'une règle pour ces valeurs : écrite ICI, avec des nombres arrondis. */
function texteDe(cle, valeurs) {
  const r = PAR_CLE.get(cle);
  if (!r) return '';
  try { return String(r.texte(valeurs || {})); } catch (e) { return ''; }
}

module.exports = { REGLES, PAR_CLE, NIVEAUX, ZONES, GRAVITE, evaluer, texteDe, nb };
