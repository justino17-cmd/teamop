/* ══ test-3111 · LE PACK NETTOYAGE EST INSTALLÉ — quatre documents, un catalogue de départ, plus un mot d'anti-nuisibles ═══════════════
   Justin, 28 octobre 2026, la veille d'une réunion avec une entreprise de nettoyage : « il faut que le pack nettoyage soit installé ». Ce banc EXÉCUTE les vraies
   fonctions d'app.html (le bloc NETTOYAGE monté par `nett-monter.js`, les autres extraites par `bac`) et ne lit jamais une phrase pour un comportement :
   1. ⛔ UNE SEULE PORTE : `metierGereSites()` n'est vraie que pour le nettoyage — la 3D, la plomberie, le chauffage ne voient ni formulaire ni carte ni ligne de rapport ;
   2. D2 le cahier des tâches : créé, fusionné par enregistrement, versionné (un cahier validé qui change passe à la version suivante), refusé sans droit ou sur un client
      qu'on ne voit pas, une seule ligne de code pousse dans `db.cahiers` ;
   3. D3 le contrôle qualité : la note est CALCULÉE, et le relevé « résultat du contrôle qualité » s'écrit dans la MÊME fonction que la grille ;
   4. D4 le plan de prévention : le seuil de 400 heures se calcule sur le planifié OU le contrat, jamais sur 24 mois additionnés ; une annulée ne compte pas ;
   5. LES TROIS PDF : structure valide, texte relu, en-tête de la société par `docEntete`, AUCUN « ? » (un pictogramme, une flèche, un émoji saisis passent par `_pdfTranslit`),
      aucun mot d'anti-nuisibles ; l'envoi joint le PDF, et la trace ne s'écrit que si le courriel est parti ;
   6. le CATALOGUE de départ : 24 produits, 6 fournisseurs, catégories EXACTES du métier, posé UNE fois par un geste de l'administrateur — jamais au chargement, jamais deux fois ;
   7. ⛔ LA 3D D'ELAN NE CHANGE EN RIEN : ses exemples, ses libellés de droits, son catalogue, son planning de démonstration, son masque (bêta comprise).
   8. ⛔ LA RELECTURE ADVERSE DU 28 OCTOBRE (§ 13, douze constats) : le vocabulaire « box » d'un métier sans box (toasts, confirmations, états vides, Mouvements, fiche du
      STOCKAGE), la reprise d'une fenêtre (cahier, fiche de contrôle), la fiche client au téléphone, l'en-tête sans nom d'entreprise, le serveur du Devis IA, le moyen de
      paiement, la publication de la bêta ; les désignations de devis longues vivent dans test-793 § 2 bis.
   Au navigateur : scratchpad/nettoyage-sonde (sonde-parcours.js : le parcours complet ; sonde-stockage.js : 73 écrans et fenêtres APRÈS « Créer le stockage », rien ne dit « box » ;
   sonde-reprise.js : cahier et contrôle repris après un rechargement ; sonde-fiche.js : « Documents du site » à 390 px). Mutations : scratchpad/mutations-pack-nettoyage.py. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { monter, formulaire, BLOC, APP, cdc, lirePdf, texte } = require('./nett-monter.js');
const { lire, litteral, evalue, bac } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const ANTI = /nuisible|dératis|désinsect|rongeur|biocide|certibiocide|\bAMM\b|matière active|appât|xylophag|infestation|dossier sanitaire|registre sanitaire|\bTP ?1[48]\b|rodonticide|insecticide|postes? d.app|box d.app|\b3D\b|haccp/i;

const BASE = {
  clients: [{ id: 'c1', nom: 'Cabinet Dubreuil', adresse: '12 rue du Port', cp: '17000', ville: 'La Rochelle', email: 'compta@dubreuil.test', contact: 'Mme Roux' },
    { id: 'c2', nom: 'Résidence Les Peupliers', adresse: '3 allée des Chênes', ville: 'Salles', email: '' }, { id: 'c3', nom: 'Autre équipe', adresse: '1 rue X', email: 'x@y.test' }],
  contrats: [{ id: 'k1', num: 'CTR-2026-001', titre: 'Entretien mensuel' }],
  interventions: [], cahiers: [], plansPrevention: [] };
const iv = (id, date, duree, statut, extra) => Object.assign({ id, num: 'INT-' + id, clientId: 'c1', date, heure: '18:00', duree, statut, type: 'Nettoyage de bureaux' }, extra || {});
const zonesTest = () => [{ id: 'z1', nom: 'Bureaux', mode: '', produits: '', machines: '', taches: [{ id: 't1', t: 'Aspiration des sols', freq: 'quotidienne', jours: 'lun-ven', horaire: '18h-20h' }, { id: 't2', t: 'Vidage des corbeilles', freq: 'quotidienne', jours: '', horaire: '' }] },
  { id: 'z2', nom: 'Sanitaires', mode: 'Désinfecter puis rincer', produits: 'Détartrant sanitaires', machines: '', taches: [{ id: 't3', t: 'Nettoyage et désinfection des sanitaires', freq: 'quotidienne', jours: '', horaire: '' }] }];
const cahierTest = (extra) => Object.assign({ id: 'ca1', clientId: 'c1', site: 'Siège', referent: 'Mme Roux', version: 1, date: '2026-10-20', zones: zonesTest(), acces: 'Badge à retirer à l\'accueil', securite: 'Port des gants', nePasMelanger: 'javel et détartrant', valideLe: '', valideParNom: '' }, extra || {});

console.log('\n── 3111 · 0. population ──');
vrai('le bloc NETTOYAGE est trouvé dans app.html (' + BLOC.length + ' signes)', BLOC.length > 20000);
vrai('les fonctions des trois documents y sont', ['nettCahierSauver', 'nettControleSauver', 'nettPlanSauver', 'nettPdf', 'nettHeures400', 'nettDocEnvoyer'].every(n => BLOC.indexOf('function ' + n + '(') > 0));

console.log('\n── 3111 · 1. une seule porte : metierGereSites ──');
{ const tous = ['3d', 'plomberie', 'electricite', 'chauffage', 'froid', 'piscine', 'autre', 'multiservices'];
  egal('vrai pour le nettoyage seul', ['nettoyage'].concat(tous).map(m => monter({ metier: m, db: BASE }).metierGereSites()), [true].concat(tous.map(() => false)));
  for (const m of ['3d', 'plomberie', 'chauffage']) {
    const W = monter({ metier: m, db: BASE });
    W.nettCahierForm('', 'c1'); W.nettPlanForm('', 'c1'); W.nettControleForm('i1');
    vrai(m + ' : aucun formulaire ne s\'ouvre', W.__modals.length === 0, W.__modals.length);
    egal(m + ' : ni section, ni carte, ni ligne de rapport, ni proposition de tâche', [W.nettSectionClient(BASE.clients[0]), W.nettIntCard({ id: 'i1', type: 'Contrôle qualité chez le client' }, true), W.nettRapportLignes({ contratId: 'k1', heure: '08:00', duree: 60 }), W.nettTachesPourCard({ clientId: 'c1' })], ['', '', [], []]); } }

console.log('\n── 3111 · 2. D2 — le cahier des tâches ──');
{ const W = monter({ db: BASE, droits: {} });
  W.nettCahierForm('', 'c1');
  vrai('le formulaire s\'ouvre (nettoyage, client visible)', W.__modals.length === 1 && /Cahier des tâches/.test(W.__modals[0]));
  vrai('… il propose les champs du cahier (zones, accès, produits à ne pas mélanger, validation)', ['Consignes d’accès', 'Produits à ne pas mélanger', 'Validé le', 'Proposer des zones types'].every(s => W.__modals[0].indexOf(s) >= 0));
  vrai('rien n\'est écrit à l\'ouverture', W.__saves === 0 && W.db.cahiers.length === 0);
  vrai('un cahier sans zone ni tâche est refusé, rien n\'est écrit', W.nettCahierSauver() === null && W.db.cahiers.length === 0 && W.__saves === 0 && W.__toasts.some(t => /au moins une zone/.test(t)));
  W.nettCahModele();
  vrai('« zones types » : proposées dans la fenêtre de travail, toujours rien d\'écrit', W.nettCahW.zones.length === 4 && W.db.cahiers.length === 0);
  W.nettCahW.site = 'Siège'; const id = W.nettCahierSauver();
  vrai('enregistré : UN cahier, l\'identifiant rendu, un seul save', !!id && W.db.cahiers.length === 1 && W.db.cahiers[0].id === id && W.__saves === 1);
  const c = W.db.cahiers[0];
  vrai('… version 1, client lié, quatre zones, fréquence valide sur chaque tâche', c.version === 1 && c.clientId === 'c1' && c.zones.length === 4 && c.zones.every(z => z.taches.length && z.taches.every(t => ['quotidienne', 'hebdomadaire', 'mensuelle', 'annuelle'].includes(t.freq))));
  W.nettCahierSauver();
  vrai('enregistrer sans rien changer ne crée pas de doublon ni de version', W.db.cahiers.length === 1 && W.db.cahiers[0].version === 1);
  W.nettCahW.valideLe = '2026-10-28'; W.nettCahW.valideParNom = 'Mme Roux'; W.nettCahierSauver();
  vrai('la validation du client s\'enregistre sans changer de version', W.db.cahiers[0].valideLe === '2026-10-28' && W.db.cahiers[0].version === 1);
  W.nettCahW.zones[0].taches[0].t = 'Aspiration et lavage des sols'; W.nettCahierSauver();
  vrai('⛔ un cahier VALIDÉ dont le contenu change passe à la version 2 et perd sa validation', W.db.cahiers[0].version === 2 && W.db.cahiers[0].valideLe === '' && W.db.cahiers[0].date === '2026-10-28' && W.__toasts.some(t => /Version n° 2/.test(t)), W.db.cahiers[0]);
  W.nettCahW.valideLe = '2026-10-29'; W.nettCahW.valideParNom = 'M. Dubois'; W.nettCahW.zones[0].taches[0].t = 'Aspiration des sols'; W.nettCahierSauver();
  vrai('… si la personne pose elle-même une validation dans la même fenêtre, la version ne bouge pas', W.db.cahiers[0].version === 2 && W.db.cahiers[0].valideLe === '2026-10-29');
  { const sansDemo = BLOC.slice(0, BLOC.indexOf('function nettDemoPoser(')); vrai('une seule ligne de code pousse dans db.cahiers hors de la démonstration (nettCahierSauver)', (sansDemo.match(/db\.cahiers\.push\(/g) || []).length === 1, (sansDemo.match(/db\.cahiers\.push\(/g) || []).length); }
  // droits et visibilité
  const R = monter({ db: BASE, droits: { 'crm.ajouter': false } }); R.nettCahierForm('', 'c1');
  vrai('sans le droit « Clients · ajouter », le formulaire ne s\'ouvre pas et le dit', R.__modals.length === 0 && R.__toasts.some(t => /n.est pas autorisé/.test(t)));
  const V = monter({ db: BASE, clientsVisibles: ['c2'] }); V.nettCahierForm('', 'c1');
  vrai('un client qu\'on ne voit pas : refus, rien d\'ouvert', V.__modals.length === 0 && V.__toasts.some(t => /ne te concerne pas/.test(t)));
  const R2 = monter({ db: Object.assign(cdc(BASE), { cahiers: [cahierTest()] }), droits: { 'crm.modifier': false } }); R2.nettCahierForm('ca1');
  vrai('sans le droit « Clients · modifier », un cahier existant ne s\'ouvre pas non plus', R2.__modals.length === 0);
  // le cahier alimente le compte rendu
  const T = monter({ db: Object.assign(cdc(BASE), { cahiers: [cahierTest()] }) });
  egal('D1 : les tâches du cahier sont proposées « Zone — tâche » au compte rendu (sans doublon)', T.nettTachesPourCard({ clientId: 'c1' }), ['Bureaux — Aspiration des sols', 'Bureaux — Vidage des corbeilles', 'Sanitaires — Nettoyage et désinfection des sanitaires']);
  egal('… et une coche DÉJÀ posée que plus aucune liste ne propose reste lisible', T.nettTachesPourCard({ clientId: 'c1', prestaMetier: ['Ancienne tâche', 'Aspiration des sols'] }).slice(-1), ['Ancienne tâche']);
  egal('… un autre client n\'a rien', T.nettTachesPourCard({ clientId: 'c2' }), []);
  egal('D1 : le rapport porte le contrat et les horaires sur site', T.nettRapportLignes({ contratId: 'k1', heure: '18:00', duree: 90 }), [['Contrat', 'CTR-2026-001 — Entretien mensuel'], ['Horaires sur site', 'de 18:00 à 19:30']]);
  egal('… et rien sans contrat ni durée', T.nettRapportLignes({ heure: '18:00', duree: 0 }), []); }

console.log('\n── 3111 · 3. D3 — le contrôle qualité : la note est calculée ──');
{ const ints = [iv('i1', '2026-10-28', 60, 'terminee', { type: 'Contrôle qualité chez le client' })];
  const W = monter({ db: Object.assign(cdc(BASE), { interventions: ints, cahiers: [cahierTest()] }) });
  W.nettControleForm('i1');
  vrai('le formulaire s\'ouvre, et sa grille est celle du cahier du site (3 points)', W.__modals.length === 1 && W.nettCqW.zones.reduce((n, z) => n + z.items.length, 0) === 3 && W.nettCqW.zones[0].nom === 'Bureaux');
  vrai('rien n\'est écrit à l\'ouverture', W.__saves === 0 && !W.db.interventions[0].controleQualite);
  vrai('aucun point évalué : refus, rien d\'écrit', W.nettControleSauver() === false && !W.db.interventions[0].controleQualite && W.__saves === 0);
  egal('la note d\'une grille vide est vide', W.nettNote(W.nettCqW), { ok: 0, rep: 0, nc: 0, neuf: 3, n: 0, pct: null });
  W.nettCqEtat(0, 0, 'ok'); W.nettCqEtat(0, 1, 'reprendre'); W.nettCqEtat(1, 0, 'nc');
  egal('note : 1 propre sur 3 évalués = 33 %', W.nettNote(W.nettCqW), { ok: 1, rep: 1, nc: 1, neuf: 0, n: 3, pct: 33 });
  W.nettCqEtat(0, 1, 'ok'); W.nettCqEtat(1, 0, 'ok');
  egal('trois propres sur trois = 100 %', W.nettNote(W.nettCqW).pct, 100);
  W.nettCqEtat(1, 0, 'ok');   // un second toucher sur le même état le retire
  egal('un second toucher retire l\'évaluation (le point redevient non évalué)', [W.nettNote(W.nettCqW).n, W.nettNote(W.nettCqW).neuf], [2, 1]);
  W.nettCqEtat(1, 0, 'nc'); W.nettCqW.anomalies = 'Traces sur la vitre de l\'accueil'; W.nettCqW.actions = [{ t: 'Reprendre la vitre', resp: 'Chef d\'équipe', delai: '2026-11-02' }];
  vrai('enregistré : la fiche ET le relevé du métier s\'écrivent ensemble', W.nettControleSauver() === true && !!W.db.interventions[0].controleQualite && W.__saves === 1);
  const i = W.db.interventions[0];
  vrai('⛔ le relevé « résultat du contrôle qualité » est la note CALCULÉE, pas une saisie', i.relevesMetier.controleQualite.indexOf(W.nettNoteTxt(i.controleQualite)) === 0 && /^67 %/.test(i.relevesMetier.controleQualite), i.relevesMetier.controleQualite);
  vrai('… il porte les anomalies, bornées', /Traces sur la vitre/.test(i.relevesMetier.controleQualite) && i.relevesMetier.controleQualite.length <= 300);
  vrai('… une ligne d\'historique de l\'intervention', (i.histo || []).some(h => /contrôle qualité enregistrée/.test(h)));
  W.nettCqEtat(0, 0, 'nc'); W.nettControleSauver();
  vrai('modifier la grille réécrit le relevé (jamais deux exemplaires qui divergent)', i.relevesMetier.controleQualite.indexOf(W.nettNoteTxt(i.controleQualite)) === 0 && /^33 %/.test(i.relevesMetier.controleQualite), i.relevesMetier.controleQualite);
  const carte = W.nettIntCard(i, true);
  vrai('la carte de l\'intervention montre la note et les gestes', /33 %/.test(carte) && /Ouvrir la fiche/.test(carte) && /Aperçu PDF/.test(carte));
  vrai('une intervention d\'un autre type n\'a pas la carte (tant qu\'aucune fiche n\'existe)', W.nettIntCard({ id: 'x', type: 'Vitrerie' }, true) === '' && W.nettIntCard({ id: 'x', type: 'Vitrerie', controleQualite: i.controleQualite }, true) !== '');
  const R = monter({ db: Object.assign(cdc(BASE), { interventions: cdc(ints) }), droits: { 'int.modifier': false } }); R.nettControleForm('i1');
  vrai('sans le droit « Interventions · modifier », rien ne s\'ouvre', R.__modals.length === 0);
  const V = monter({ db: Object.assign(cdc(BASE), { interventions: cdc(ints) }), clientsVisibles: ['c2'] }); V.nettControleForm('i1');
  vrai('une intervention d\'un client qu\'on ne voit pas : refus', V.__modals.length === 0); }

console.log('\n── 3111 · 4. D4 — le seuil des 400 heures ──');
{ const h = (ints, opt, auj) => monter({ db: Object.assign(cdc(BASE), { interventions: ints }), techs: opt && opt.techs }).nettHeures400('c1', auj || '2026-10-28', opt);
  let r = h([iv('a', '2026-11-03', 120, 'planifiee')]);
  vrai('2 h planifiées, un agent : 2 h, seuil non atteint', r.prevues === 2 && r.total === 2 && r.atteint === false, r);
  r = h([iv('a', '2026-11-03', 120, 'planifiee')], { techs: { a: 3 } });
  vrai('trois techniciens affectés : 6 h (agents × durée)', r.prevues === 6, r);
  r = h([iv('a', '2026-11-03', 120, 'planifiee', { relevesMetier: { agents: '4' } })], { techs: { a: 3 } });
  vrai('le relevé « nombre d\'agents » prime sur l\'affectation', r.prevues === 8, r);
  r = h([iv('a', '2026-11-03', 120, 'annulee')]);
  vrai('une intervention ANNULÉE ne compte pas', r.prevues === 0 && r.faites === 0, r);
  r = h([iv('a', '2027-10-28', 60, 'planifiee'), iv('b', '2027-10-29', 600, 'planifiee')]);
  vrai('la fenêtre à venir est de 12 mois : le 28/10/2027 y est, le 29/10/2027 n\'y est pas', r.prevues === 1, r);
  r = h([iv('a', '2026-10-28', 60, 'planifiee')]);
  vrai('aujourd\'hui, pas encore terminée : à venir', r.prevues === 1 && r.faites === 0, r);
  r = h([iv('a', '2026-10-28', 60, 'terminee'), iv('b', '2025-10-28', 60, 'terminee'), iv('c', '2025-10-27', 60, 'terminee')]);
  vrai('réalisées : les 12 derniers mois (le 28/10/2025 en est exclu, aujourd\'hui y est)', r.faites === 1, r);
  r = h([iv('a', '2026-11-03', 60, 'planifiee')], { heuresContrat: '430' });
  vrai('heures annuelles du contrat : 430 h → seuil atteint, par l\'avenir', r.total === 430 && r.atteint === true && r.parAvenir === true, r);
  r = h([iv('a', '2026-11-03', 6000, 'planifiee')], { heuresContrat: '300' });
  vrai('⛔ le planifié (100 h) et le contrat (300 h) ne s\'ADDITIONNENT pas : on garde le plus haut', r.total === 300 && r.atteint === false, r);
  r = h([iv('a', '2026-11-03', 6000, 'planifiee')], { heuresContrat: '300', heuresSousTraitants: '100' });
  vrai('les sous-traitants s\'ajoutent : 300 + 100 = 400 h, seuil atteint (la borne est incluse)', r.total === 400 && r.atteint === true, r);
  r = h([iv('a', '2026-11-03', 6000, 'planifiee')], { heuresContrat: '299,9', heuresSousTraitants: '100' });
  vrai('399,9 h : non atteint', r.total === 399.9 && r.atteint === false, r);
  r = h([iv('a', '2026-10-20', 60 * 410, 'terminee')]);
  vrai('410 h déjà réalisées sur 12 mois : l\'alerte est levée, par le passé', r.faites === 410 && r.atteint === true && r.parPasse === true && r.parAvenir === false, r);
  const autre = monter({ db: Object.assign(cdc(BASE), { interventions: [iv('z', '2026-11-03', 120000, 'planifiee', { clientId: 'c2' })] }) }).nettHeures400('c1', '2026-10-28', {});
  vrai('les heures d\'un AUTRE client ne comptent pas', autre.prevues === 0, autre);
  const avant = JSON.stringify(BASE); h([iv('a', '2026-11-03', 60, 'planifiee')]);
  vrai('le calcul n\'écrit rien (fonction pure sur la base)', JSON.stringify(BASE) === avant); }

console.log('\n── 3111 · 5. le plan de prévention — l\'enregistrement ──');
{ const W = monter({ db: BASE });
  W.nettPlanForm('', 'c1');
  vrai('le formulaire s\'ouvre : projet pour signature, seuil, arrêté de 1993 laissé à l\'entreprise', W.__modals.length === 1 && /projet préparé pour signature/.test(W.__modals[0]) && /liste de l’arrêté du 19 mars 1993/.test(W.__modals[0]) && /Non précisé/.test(W.__modals[0]));
  vrai('rien n\'est écrit à l\'ouverture', W.__saves === 0 && W.db.plansPrevention.length === 0);
  const plan = { clientId: 'c1', site: 'Siège', repUtil: 'Mme Roux', fonctionUtil: 'Directrice', repExt: 'M. Martin', fonctionExt: 'Gérant', sousTraitants: '', nature: 'Nettoyage des locaux', horaires: 'lun-ven 18h-20h', effectif: '3',
    debut: '2026-11-01', fin: '2027-10-31', heuresContrat: '430', heuresSousTraitants: '', arrete1993: 'non', inspDate: '2026-10-25', inspParticipants: 'Mme Roux, M. Martin',
    interferences: 'Présence du personnel du cabinet jusqu\'à 18h30', phases: 'Utilisation d\'une autolaveuse en circulation', materiels: 'Autolaveuse, produits dosés', instructions: 'Gants, pas de mélange', secours: 'Trousse à l\'accueil', coordination: 'Chef d\'équipe : référent' };
  W.__forms['nett-plan'] = formulaire(plan);
  const id = W.nettPlanSauver('', 'c1');
  vrai('enregistré : UN plan, lié au client, le droit « modifier » tenu, un save', !!id && W.db.plansPrevention.length === 1 && W.db.plansPrevention[0].clientId === 'c1' && W.__saves === 1);
  vrai('… les champs sont rangés (bornés)', W.db.plansPrevention[0].repExt === 'M. Martin' && W.db.plansPrevention[0].heuresContrat === '430' && W.db.plansPrevention[0].arrete1993 === 'non');
  W.__forms['nett-plan'] = formulaire(Object.assign({}, plan, { arrete1993: 'peut-être', heuresContrat: '-5', debut: 'demain', nature: 'x'.repeat(900) }));
  W.nettPlanSauver(id, 'c1');
  vrai('une valeur étrangère est écartée, un texte trop long est borné, aucun doublon', W.db.plansPrevention.length === 1 && W.db.plansPrevention[0].arrete1993 === '' && W.db.plansPrevention[0].heuresContrat === '' && W.db.plansPrevention[0].debut === '' && W.db.plansPrevention[0].nature.length === 300);
  { const sansDemo = BLOC.slice(0, BLOC.indexOf('function nettDemoPoser(')); vrai('une seule ligne de code pousse dans db.plansPrevention hors de la démonstration (nettPlanSauver)', (sansDemo.match(/db\.plansPrevention\.push\(/g) || []).length === 1, (sansDemo.match(/db\.plansPrevention\.push\(/g) || []).length); }
  const R = monter({ db: BASE, droits: { 'crm.ajouter': false } }); R.nettPlanForm('', 'c1');
  vrai('sans le droit, le plan ne s\'ouvre pas', R.__modals.length === 0);
  const sec = monter({ db: Object.assign(cdc(BASE), { plansPrevention: [{ id: 'p1', clientId: 'c1', date: '2026-10-20' }] }) }).nettSectionClient(BASE.clients[0]);
  vrai('la section « Documents du site » montre le plan et le seuil', /Plan de prévention du 20\/10(?!\/)/.test(sec) && /seuil de 400 h/.test(sec)); }

console.log('\n── 3111 · 6. LES TROIS PDF — structure, texte, en-tête, aucun « ? » ──');
(async () => {
  const PIEGE = 'Aspiration → lavage ✓ 😀 « test » œuvre – tiret';   // flèche, coche, émoji, guillemets, ligature, tiret : tout ce que WinAnsi n'a pas
  const base = Object.assign(cdc(BASE), { clients: [Object.assign({}, BASE.clients[0], { soc: 'Éclat Sud' }), BASE.clients[1], BASE.clients[2]],
    cahiers: [cahierTest({ nePasMelanger: PIEGE })],
    interventions: [iv('i1', '2026-10-28', 60, 'terminee', { type: 'Contrôle qualité chez le client', rapportModele: 'Éclat Sud', controleQualite: { controleur: 'Léa Roux', clientPresent: 'oui',
      zones: [{ nom: 'Bureaux', items: [{ t: 'Sols aspirés', etat: 'ok' }, { t: PIEGE, etat: 'reprendre' }] }, { nom: 'Sanitaires', items: [{ t: 'Sanitaires désinfectés', etat: 'nc' }] }],
      anomalies: 'Traces → vitre ✓', actions: [{ t: 'Reprendre la vitre', resp: 'Chef', delai: '2026-11-02' }], contreControle: '2026-11-05', visaClient: 'Mme Roux' } }),
      iv('i2', '2026-12-01', 3000, 'planifiee'), iv('i3', '2026-10-10', 600, 'terminee')],
    plansPrevention: [{ id: 'p1', clientId: 'c1', site: 'Siège', date: '2026-10-28', repUtil: 'Mme Roux', fonctionUtil: 'Directrice', repExt: 'M. Martin', fonctionExt: 'Gérant', nature: 'Nettoyage des locaux ' + PIEGE,
      heuresContrat: '350', heuresSousTraitants: '60', arrete1993: '', inspDate: '2026-10-25', phases: 'Autolaveuse en circulation', interferences: '' }] });
  const entete = { nom: 'Éclat Propreté', couleur: '#1E7A4E', logo: '', adresse: '4 rue du Port', cp: '17000', ville: 'La Rochelle', siret: '123 456 789 00012', tel: '05 46 00 00 00', email: 'contact@eclat.test',
    societes: { 'Éclat Sud': { nom: 'Éclat Sud', raison: 'Éclat Sud SARL', siret: '999 888 777 00011', adresse: '9 quai Sud', couleur: '#2563EB' } } };
  const W = monter({ db: base, entete });
  const docs = { cahier: ['cahier', 'ca1', ''], controle: ['controle', 'i1', ''], plan: ['plan', 'p1', ''] };
  const R = {};
  for (const k of Object.keys(docs)) R[k] = await W.nettDocFabriquer.apply(null, docs[k]);
  vrai('(population) les trois documents se fabriquent', Object.keys(R).every(k => R[k].pdf && !R[k].err), Object.keys(R).map(k => k + ' : ' + (R[k].err || 'ok')));
  const L = {}; for (const k of Object.keys(R)) { L[k] = lirePdf(R[k].pdf); L[k].tx = L[k].textes.map(t => t.u); }
  vrai('(population) chaque PDF porte du texte', Object.keys(L).every(k => L[k].tx.length > 20), Object.keys(L).map(k => k + ' ' + L[k].tx.length));
  egal('structure PDF valide (en-tête, table des références, objets bien placés)', Object.keys(L).map(k => L[k].pb), [[], [], []]);
  vrai('⛔ aucun « ? » dans aucun document (un pictogramme saisi passe par _pdfTranslit, il ne devient pas un point d\'interrogation)', Object.keys(L).every(k => !L[k].tx.some(t => t.indexOf('?') >= 0)), Object.keys(L).map(k => L[k].tx.filter(t => t.indexOf('?') >= 0)));
  vrai('… et la saisie piège est bien arrivée dans les documents (sinon le contrôle ne mesure rien)', /Aspiration -> lavage|Aspiration -&gt; lavage|Aspiration/.test(L.cahier.tx.join(' ')) && L.controle.tx.join(' ').indexOf('Aspiration') >= 0 && L.plan.tx.join(' ').indexOf('Nettoyage des locaux') >= 0);
  vrai('aucun mot d\'anti-nuisibles dans les trois documents', Object.keys(L).every(k => !ANTI.test(L[k].tx.join(' '))), Object.keys(L).map(k => (L[k].tx.join(' ').match(ANTI) || [])[0]));
  vrai('⛔ l\'en-tête vient de docEntete(société du client) : « Éclat Sud » et son SIRET, pas l\'entreprise principale', Object.keys(L).every(k => L[k].tx.some(t => /Éclat Sud/.test(t)) && L[k].tx.some(t => /999 888 777/.test(t)) && !L[k].tx.some(t => /123 456 789/.test(t))), Object.keys(L).map(k => L[k].tx.slice(0, 4)));
  vrai('un nom de fichier propre, avec le client et la date', /^Cahier-des-taches-Cabinet-Dubreuil-2026-10-20\.pdf$/.test(R.cahier.nom) && /^Controle-qualite-.*2026-10-28\.pdf$/.test(R.controle.nom) && /^Plan-de-prevention-/.test(R.plan.nom), [R.cahier.nom, R.controle.nom, R.plan.nom]);
  // D2
  const tc = L.cahier.tx.join(' | ');
  vrai('D2 : titre, version, client, zones, tâches, fréquence, accès, sécurité, produits à ne pas mélanger, signatures', ['CAHIER DES TÂCHES'.replace('Â', 'A'), 'Version 1', 'Cabinet Dubreuil', 'Bureaux', 'Sanitaires', 'Aspiration des sols', 'Quotidienne', 'Badge', 'Port des gants', 'Aspiration', 'Pour le client', 'Non valid'].every(s => tc.replace(/Â/g, 'A').indexOf(s) >= 0), ['CAHIER DES TÂCHES'.replace('Â', 'A'), 'Version 1', 'Cabinet Dubreuil', 'Bureaux', 'Sanitaires', 'Aspiration des sols', 'Quotidienne', 'Badge', 'Port des gants', 'Aspiration', 'Pour le client', 'Non valid'].filter(s => tc.replace(/Â/g, 'A').indexOf(s) < 0));
  vrai('D2 : jamais d\'obligation légale inventée (aucun article de loi cité)', !/R\s?4412|R\s?4512|code du travail|arr[êe]t/i.test(tc));
  // D3
  const tq = L.controle.tx.join(' | ');
  vrai('D3 : note, résultats en toutes lettres, anomalies, actions, contre-contrôle, visa', ['Note : 33 %', 'Propre', 'A reprendre', 'Non conforme', 'Traces', 'Reprendre la vitre', 'Chef', '02/11/2026', '05/11/2026', 'Mme Roux', 'Le contrôleur', 'Le client'].every(s => tq.indexOf(s) >= 0 || tq.indexOf(s.replace('A reprendre', 'À reprendre')) >= 0), tq.slice(0, 700));
  vrai('D3 : aucune norme invoquée', !/NF\s?EN|ISO|13549/i.test(tq));
  // D4
  const tp = L.plan.tx.join(' | ');
  vrai('D4 : les entreprises, la prestation, le calcul du seuil, l\'inspection, les cinq rubriques de R4512-8, les signatures, la mention du CSE', ['PLAN DE PREVENTION', 'Mme Roux', 'M. Martin', '3. Le seuil des 400 heures', 'Total prévisible', 'Atteint', '4. L', 'Les phases', 'Les instructions aux travailleurs', 'premiers secours', 'coordination, de commandement et de sous-traitance', 'CSE', 'Le chef de l', 'tenu à la disposition'].every(s => tp.replace(/É/g, 'E').indexOf(s) >= 0 || tp.indexOf(s) >= 0), tp.slice(0, 900));
  vrai('D4 : le calcul est imprimé — 50 h planifiées (3 000 min x 1 agent), 350 h au contrat, 60 h de sous-traitance : total 410 h, atteint', /410 h/.test(tp) && /350 h/.test(tp) && /60 h/.test(tp) && /Atteint/.test(tp), tp.match(/[^|]*(heures|h)[^|]*/g));
  vrai('D4 : « travaux de la liste de l\'arrêté » non répondu → « À compléter », jamais un oui/non inventé', /arr.t. du 19 mars 1993 : *(\|)?/.test(tp.replace(/\s+/g, ' ')) && !/1993 : Oui|1993 : Non/.test(tp), tp.match(/[^|]*1993[^|]*/g));
  vrai('D4 : se dit PROJET, pas acte signé', /Projet/.test(tp) && /qu.une fois sign/.test(tp), tp.slice(-400));
  vrai('D4 : pour signature à la main — deux cases de signature vides, aucune image', L.plan.images === 0);
  // un document long se pagine
  const grand = cahierTest({ zones: Array.from({ length: 14 }, (_, z) => ({ id: 'z' + z, nom: 'Zone ' + z, mode: 'Mode opératoire détaillé de la zone ' + z + ' '.repeat(1) + 'avec assez de mots pour passer à la ligne plusieurs fois dans la page', produits: 'P', machines: 'M',
    taches: Array.from({ length: 6 }, (_, t) => ({ id: 't' + z + t, t: 'Tâche numéro ' + t + ' de la zone ' + z + ' dont le libellé est volontairement long pour passer sur deux lignes dans la colonne', freq: 'hebdomadaire', jours: 'lun, mer, ven', horaire: '18h-20h' })) })) });
  const G = monter({ db: Object.assign(cdc(base), { cahiers: [grand] }), entete }); const rg = await G.nettDocFabriquer('cahier', 'ca1', '');
  const lg = lirePdf(rg.pdf);
  vrai('un cahier de 14 zones se pagine (plusieurs pages, numérotées « Page k/n »), structure valide', lg.pages >= 3 && lg.pb.length === 0 && lg.textes.some(t => t.u === 'Page 1/' + lg.pages) && lg.textes.some(t => t.u === 'Page ' + lg.pages + '/' + lg.pages), [lg.pages, lg.pb]);

  console.log('\n── 3111 · 7. l\'aperçu et l\'envoi ──');
  const A = monter({ db: base, entete }); await A.nettDocApercu('cahier', 'ca1', '');
  vrai('l\'aperçu ouvre une fenêtre DANS le geste, et y met le PDF', A.__windows.length === 1 && /blob:test/.test(A.__windows[0].location.href) && !A.__toasts.some(t => /Autorise|Erreur/.test(t)), A.__windows.map(w => w.location.href));
  const P = monter({ db: base, entete }); P.__noPopup = true; await P.nettDocApercu('cahier', 'ca1', '');
  vrai('fenêtre bloquée : le dit, ne fabrique rien', P.__toasts.some(t => /pop-ups/.test(t)));
  const E1 = monter({ db: base, entete }); await E1.nettDocEnvoyer('cahier', 'ca1', '');
  vrai('envoi : UN courriel, au client, avec le PDF joint (un vrai %PDF) et la société en expéditeur', E1.__mails.length === 1 && E1.__mails[0].to === 'compta@dubreuil.test' && E1.__mails[0].opts.atts.length === 1
    && Buffer.from(E1.__mails[0].opts.atts[0].content, 'base64').toString('latin1').startsWith('%PDF-1.4') && E1.__mails[0].opts.brandName === 'Éclat Sud' && E1.__mails[0].opts.sansMailto === true, E1.__mails.map(m => [m.to, m.sub]));
  vrai('… la trace s\'écrit APRÈS l\'envoi réussi', E1.db.cahiers[0].envoyeA === 'compta@dubreuil.test' && E1.db.cahiers[0].envoyeLe > 0);
  const E2 = monter({ db: base, entete }); E2.__mailOk = false; await E2.nettDocEnvoyer('cahier', 'ca1', '');
  vrai('⛔ courriel refusé par le serveur : AUCUNE trace d\'envoi', E2.__mails.length === 1 && !E2.db.cahiers[0].envoyeLe && !E2.db.cahiers[0].envoyeA);
  const E3 = monter({ db: Object.assign(cdc(base), { clients: [Object.assign({}, base.clients[0], { email: '' }), base.clients[1], base.clients[2]] }), entete }); await E3.nettDocEnvoyer('cahier', 'ca1', '');
  vrai('client sans e-mail : le dit, rien ne part', E3.__mails.length === 0 && E3.__toasts.some(t => /e-mail du client/.test(t)));
  const E4 = monter({ db: base, entete }); await E4.nettDocEnvoyer('controle', 'i1', '');
  vrai('contrôle qualité : envoyé, tracé sur l\'intervention et dans son historique', E4.__mails.length === 1 && E4.db.interventions[0].controleQualite.envoyeA === 'compta@dubreuil.test' && (E4.db.interventions[0].histo || []).some(h => /envoyée par e-mail/.test(h)));
  const E5 = monter({ db: base, entete }); await E5.nettDocEnvoyer('plan', 'p1', '');
  vrai('plan de prévention : envoyé, tracé sur le plan', E5.__mails.length === 1 && E5.db.plansPrevention[0].envoyeA === 'compta@dubreuil.test' && /signer/.test(E5.__mails[0].body));
  const E6 = monter({ db: base, entete, droits: { 'crm.modifier': false } }); await E6.nettDocEnvoyer('cahier', 'ca1', '');
  vrai('sans le droit, aucun envoi', E6.__mails.length === 0);
  const E7 = monter({ db: base, entete }); const pa = E7.nettDocEnvoyer('cahier', 'ca1', ''), pb = E7.nettDocEnvoyer('cahier', 'ca1', ''); await pa; await pb;
  vrai('un double toucher ne part qu\'une fois', E7.__mails.length === 1, E7.__mails.length);

  console.log('\n── 3111 · 8. les écrans du pack parlent de nettoyage (vraies fonctions) ──');
  const FORM = [W.nettCahierForm, W.nettPlanForm].length; const F1 = monter({ db: base, entete }); F1.nettCahierForm('', 'c1'); F1.nettPlanForm('', 'c1'); F1.nettControleForm('i1');
  vrai('les trois formulaires ne parlent jamais d\'anti-nuisibles', F1.__modals.length === 3 && F1.__modals.every(h => !ANTI.test(h.replace(/Éclat/g, ''))), F1.__modals.map(h => (h.match(ANTI) || [])[0]));
  const S = F1.nettSectionClient(base.clients[0]);
  vrai('la section « Documents du site » : cahier, plan, boutons, sans anti-nuisibles', /Documents du site/.test(S) && /Siège · version 1/.test(S) && /Plan de prévention du 28\/10(?!\/)/.test(S) && !ANTI.test(S), S.slice(0, 300));

  console.log('\n── 3111 · 9. le catalogue de départ et le reste du pack (vraies fonctions d\'app.html) ──');
  await suite();
})();

async function suite() {
  const { N } = lire('app.html');
  const METIERS = evalue(litteral(N, 'const METIERS={'));
  const CATALOGUE_3D = evalue(litteral(N, 'const CATALOGUE=['));
  /* le pack produits et fournisseurs est rattaché AU MÉTIER par du code, hors du bloc généré : le banc refait les deux assignations qu'il lit dans le fichier */
  METIERS['3d'].catalogue = CATALOGUE_3D; METIERS['3d'].fournisseurs = evalue(litteral(N, 'const FOURNISSEURS_3D=['));
  const nett = (N.match(/METIERS\['nettoyage'\]\.catalogue\s*=\s*(\w+)/) || [])[1];
  vrai('le pack nettoyage est rattaché à un catalogue et à des fournisseurs (assignation de code)', !!nett && /METIERS\['nettoyage'\]\.fournisseurs\s*=\s*\w+/.test(N), nett);
  const CAT = nett ? evalue(litteral(N, 'const ' + nett + '=[')) : [];
  const FOUR = (() => { const f = (N.match(/METIERS\['nettoyage'\]\.fournisseurs\s*=\s*(\w+)/) || [])[1]; return f ? evalue(litteral(N, 'const ' + f + '=[')) : []; })();
  METIERS.nettoyage.catalogue = CAT; METIERS.nettoyage.fournisseurs = FOUR;
  vrai('24 produits, 6 fournisseurs', CAT.length === 24 && FOUR.length === 6, [CAT.length, FOUR.length]);
  const cats = METIERS.nettoyage.produits;
  egal('⛔ chaque produit est rangé dans une catégorie EXACTE de la liste du métier (jamais hors liste)', CAT.filter(c => cats.indexOf(c[1]) < 0), []);
  egal('… et les huit catégories sont toutes servies', cats.filter(k => !CAT.some(c => c[1] === k)), []);
  vrai('noms uniques, aucun mot d\'anti-nuisibles', new Set(CAT.map(c => c[0].toLowerCase())).size === 24 && !CAT.some(c => ANTI.test(c[0] + ' ' + c[1])), CAT.filter(c => ANTI.test(c[0])));
  vrai('fournisseurs : un identifiant déduit (jamais un uid), un site, aucun téléphone ni e-mail inventé', FOUR.every(f => /^four_[a-z0-9-]+$/.test(f.id) && /Site : /.test(f.notes) && !f.telephone && !f.email), FOUR.map(f => f.id));
  egal('… les six noms de la recherche', FOUR.map(f => f.nom), ['Paredes', 'Performance Hygiène', 'Lyreco', 'Manutan', 'Kärcher', 'Nilfisk']);
  // les vraies fonctions de pose
  const CATFOUR = evalue(litteral(N, 'const CATFOUR=['));
  const monde = (metier, produits) => { const db = { metier, produits: produits || [], fournisseurs: [], users: [] }; let n = 0;
    const init = { METIERS, CATALOGUE: CATALOGUE_3D, db, BETA_ESSAI: false, PACK_METIER_AUTO: false, uid: () => 'u' + (++n), toast: () => {}, save: () => {}, confirm: () => true, console, CATFOUR,
      permGarde: () => true, canCat: () => true, currentUser: { id: 'u1', role: 'admin' }, logEvent: () => {}, views: { produits() {} }, current: 'x', STOCKAGE_ID: 'stockage', Date, JSON,
      norm: s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') };
    const noms = ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'slugNom', 'idCatalogue', 'produitCle', 'cataloguePoser', 'catalogueEnPlace', 'cataloguesFournisseurs', 'catalogueDepartPoser', 'catalogueDepartProposable'];
    const b = bac('app.html', noms, init); return { db, b, toasts: init.toast }; };
  const vide = monde('nettoyage');
  vrai('rien n\'est posé tout seul : une base neuve de nettoyage n\'a ni produit ni fournisseur', vide.db.produits.length === 0 && vide.db.fournisseurs.length === 0);
  vrai('la proposition n\'est faite qu\'à l\'administrateur d\'un métier qui a un pack, tant que le catalogue n\'est pas en place', vide.b.fn.catalogueDepartProposable() === true && monde('plomberie').b.fn.catalogueDepartProposable() === false && monde('3d').b.fn.catalogueDepartProposable() === false);
  const r1 = vide.b.fn.catalogueDepartPoser();
  vrai('⛔ le geste pose 24 produits et 6 fournisseurs', vide.db.produits.length === 24 && vide.db.fournisseurs.length === 6, [vide.db.produits.length, vide.db.fournisseurs.length]);
  vrai('… semis (cree 0 : aucun « nouveau » ni notification), catégories du métier, unité, quantité nulle', vide.db.produits.every(p => p.cree === 0 && cats.indexOf(p.categorie) >= 0 && p.qte === 0 && p.id.startsWith('cat_')));
  vide.b.fn.catalogueDepartPoser();
  vrai('⛔ rejoué : RIEN de plus (pas deux fois)', vide.db.produits.length === 24 && vide.db.fournisseurs.length === 6);
  vrai('… et la proposition disparaît une fois le catalogue en place', vide.b.fn.catalogueDepartProposable() === false);
  const CLES = new Set(CATFOUR.map(x => x[0].toLowerCase()));
  vrai('aucun nom du pack nettoyage n\'est dans les catalogues fournisseurs de la 3D (ils ne comptent pas pour ouvrir le navigateur de 2 809 références)', !CAT.some(c => CLES.has(c[0].toLowerCase())));
  vrai('⛔ le catalogue de nettoyage n\'OUVRE PAS le navigateur des catalogues fournisseurs anti-nuisibles (cataloguesFournisseurs reste faux)', vide.b.fn.cataloguesFournisseurs() === false);
  const e = monde('nettoyage', [{ id: 'cat_detergent-de-sol-neutre-bidon-5-l', nom: CAT[4][0], categorie: CAT[4][1], qte: 7 }]); e.b.fn.catalogueDepartPoser();
  vrai('une fiche déjà là (même nom) n\'est pas dupliquée et garde son stock', e.db.produits.filter(p => p.nom === CAT[4][0]).length === 1 && e.db.produits.find(p => p.nom === CAT[4][0]).qte === 7 && e.db.produits.length === 24);
  const t3 = monde('3d'); const n3 = t3.b.fn.cataloguePoser(t3.db);
  vrai('⛔ 3D : son catalogue se pose comme avant (' + CATALOGUE_3D.length + ' produits, 5 fournisseurs), à l\'identique', n3.produits === CATALOGUE_3D.length && n3.fournisseurs === 5 && t3.db.produits[0].nom === 'ALTA 7000');
  const pl = monde('electricite'); const np = pl.b.fn.cataloguePoser(pl.db);
  vrai('électricité : toujours rien (un métier sans pack n\'a ni produit ni fournisseur ; v779 : la plomberie et le chauffage ont le leur)', np.produits === 0 && np.fournisseurs === 0);
  vrai('PACK_METIER_AUTO reste faux (la décision du 23 septembre : rien ne se pose seul)', /const PACK_METIER_AUTO\s*=\s*false;/.test(N));
  vrai('migrate() et load() ne posent pas le catalogue de départ (aucun appel hors du geste et du bouton)', (N.match(/catalogueDepartPoser\(/g) || []).length <= 5, (N.match(/catalogueDepartPoser\(/g) || []).length);
  await suite2(N, METIERS, CATALOGUE_3D);
  fin();
}
const USER_CAPS_LIT = N => evalue(litteral(N, 'const USER_CAPS=['));
async function suite2(N, METIERS, CATALOGUE_3D) {
  console.log('\n── 3111 · 10. ⛔ la 3D d\'ELAN ne change en RIEN ──');
  const EX3D = { tache: 'Ex : Rappeler le client / Commander des postes', entreprise: 'Ex : Pest Contrôle SARL', societe: 'Ex : 3D Sud-Ouest SARL', siteBon: 'Nom du site (ex : CAZABOX ST PORCHAIRE)', ville: 'ex : 17390 La Tremblade', produit: 'Ex : XILIX 1000',
    liste: 'Gel blattes Maxforce ; MABI ; 24,90\nMUSKIL bloc 10 kg ; SODIF\nGants nitrile taille 9', devis1: '« Dératisation chez Mme Martin, 12 rue des Lilas à Rochefort, 280 € TTC »', devis2: '« Punaises de lit, appartement 60 m², La Rochelle, à 650 »',
    devisIA: 'Ex : dératisation d\'un restaurant de 120 m² avec cave, 8 postes d\'appâtage, 3 passages sur 2 mois, à Strasbourg', materiel: 'Ex : 2 pièges à glu, 1 grille anti-intrusion…', produitsTitre: 'Produits utilisés (registre)', produitsAjout: '— Ajouter un produit du registre —' };
  const USER_CAPS = USER_CAPS_LIT(N);
  const monde = (metier, beta) => { const db = { metier, clients: [], interventions: [], produits: [], boxes: [], techniciens: [], enveloppes: [], mouvements: [] };
    const init = { METIERS, INT_TYPES: ['Dératisation'], BETA_ESSAI: !!beta, db, STOCKAGE_ID: 'stockage', console, uid: (() => { let n = 0; return () => 'u' + (++n); })(), todayISO: () => '2026-10-28', shiftDay: (d, n) => d,
      toast: () => {}, save: () => {}, go: () => {}, confirm: () => true, currentUser: { id: 'u1', role: 'admin' }, views: { parametres() {} }, planJours: [], NETT_METIERS: ['nettoyage'], fullName: () => 'Test' };
    const noms = ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'intTypes', 'metierBloque', 'sansBox', 'libBox', 'exemple', 'capTxt', 'demoSemisDe', 'demoPlanGenerique', 'demoCharger', 'demoRetirer', 'demoCompte',
      'metierActifs', 'metierGereSites', 'nettDemoPoser', 'nettCahierModele', 'nettControleDepart', 'nettNoteTxt', 'nettNote', 'nettPlanVide', 'nettCahiersDe', 'nettClient', 'nettTxt'];
    const consts = { DEMO_CLIENTS_3D: 'const DEMO_CLIENTS_3D=[', DEMO_PLAN_3D: 'const DEMO_PLAN_3D=[', DEMO_NETT: 'const DEMO_NETT={', DEMO_PLOMB: 'const DEMO_PLOMB={', DEMO_CHAUF: 'const DEMO_CHAUF={' };
    Object.keys(consts).forEach(k => { init[k] = evalue(litteral(N, consts[k])); });
    const b = bac('app.html', noms, init); return { db, b, init }; };
  const m3 = monde('3d'), mb3 = monde('3d', true);
  egal('exemple(…) rend, en 3D, chacun des textes d\'avant, mot pour mot', Object.keys(EX3D).map(k => m3.b.fn.exemple(k)), Object.keys(EX3D).map(k => EX3D[k]));
  egal('capTxt : aucun libellé de droit ne change en 3D (' + USER_CAPS.length + ' cases, libellé et explication)', USER_CAPS.filter(c => m3.b.fn.capTxt(c[1]) !== c[1] || m3.b.fn.capTxt(c[2] || '') !== (c[2] || '')).map(c => c[0]), []);
  egal('libBox : la 3D garde « box » (bêta comprise) ; sansBox est faux', [m3.b.fn.libBox('box', 'stockage'), mb3.b.fn.libBox('box', 'stockage'), m3.b.fn.sansBox(), mb3.b.fn.sansBox()], ['box', 'box', false, false]);
  { const d = m3.b.fn.demoSemisDe();
    vrai('le planning de démonstration de la 3D est celui d\'avant (7 clients, 13 créneaux, « Dératisation — passage 2/3 », checklist « Réappâtage »)', d.clients.length === 7 && d.clients[0][0] === 'Boulangerie Au Bon Pain' && d.planning.length === 13 && d.planning[0][3] === 'Dératisation — passage 2/3' && d.checklist.join() === 'Contrôle des postes,Réappâtage' && d.arepartir[0] === 'À répartir — contrôle annuel', [d.clients.length, d.planning.length]); }
  { const r = m3.b.fn; r.demoCharger(); const I = m3.db.interventions;
    vrai('demoCharger en 3D : 14 interventions, 3 techniciens, 7 clients, la checklist « Contrôle des postes » — et rien de nettoyage (ni cahier ni plan)', I.length === 14 && m3.db.techniciens.length === 3 && m3.db.clients.length === 7 && I[0].checklist[0].t === 'Contrôle des postes' && !m3.db.cahiers && !m3.db.plansPrevention, [I.length]); }
  vrai('le catalogue 3D est intact (' + CATALOGUE_3D.length + ' références, ALTA 7000 en tête) et son pack n\'a ni types ni prestations propres', METIERS['3d'].catalogue.length === CATALOGUE_3D.length && METIERS['3d'].catalogue[0][0] === 'ALTA 7000' && METIERS['3d'].types === null && METIERS['3d'].presta === null);
  egal('metierBloque : la bêta en 3D voit tout ; hors bêta la 3D ne ferme rien ; la bêta en nettoyage applique le masque ; le client de nettoyage aussi', [
    ['boxes', 'registre', 'enveloppes'].map(k => mb3.b.fn.metierBloque(k)), ['boxes', 'registre'].map(k => m3.b.fn.metierBloque(k)),
    ['boxes', 'registre', 'carteBox', 'devisXylo'].map(k => monde('nettoyage', true).b.fn.metierBloque(k)), ['boxes', 'registre'].map(k => monde('nettoyage', false).b.fn.metierBloque(k)), monde('nettoyage', true).b.fn.metierBloque('clients')],
    [[false, false, false], [false, false], [true, true, true, true], [true, true], false]);

  console.log('\n── 3111 · 11. le nettoyage : plus un mot d\'anti-nuisibles, plus de box (vraies fonctions) ──');
  const mn = monde('nettoyage', true);
  egal('(population) le nettoyage est bien reconnu, sans box', [mn.b.fn.metierId(), mn.b.fn.estMetier3D(), mn.b.fn.sansBox(), mn.b.fn.libBox('box', 'stockage')], ['nettoyage', false, true, 'stockage']);
  const cles = Object.keys(EX3D), exN = cles.map(k => [k, mn.b.fn.exemple(k)]);
  vrai('chaque exemple de saisie existe et ne dit rien d\'anti-nuisibles ni de box', exN.every(([k, v]) => v && !ANTI.test(v) && !/\bbox\b|CAZABOX|Pest|Sud-Ouest|Tremblade/i.test(v)), exN.filter(([k, v]) => !v || ANTI.test(v) || /\bbox\b|CAZABOX|Pest|Sud-Ouest|Tremblade/i.test(v)));
  egal('les exemples du nettoyage (assistant devis, entreprise, produit)', [mn.b.fn.exemple('devis1'), mn.b.fn.exemple('devis2'), mn.b.fn.exemple('entreprise'), mn.b.fn.exemple('produit')],
    ['« Nettoyage mensuel de bureaux, 120 m², 2 passages par semaine, à La Rochelle, 340 € HT »', '« Remise en état après travaux, appartement 60 m², à 650 € »', 'Ex : Éclat Propreté SARL', 'Ex : Détergent sols neutre 5 L']);
  const capsN = USER_CAPS.map(c => mn.b.fn.capTxt(c[1]) + ' ' + mn.b.fn.capTxt(c[2] || ''));
  vrai('les libellés de droits : ni Certibiocide, ni plan d\'appâtage, ni box (population : ' + capsN.length + ' cases)', capsN.length > 20 && !capsN.some(t => /certibiocide|appâtage|\bbox/i.test(t)), capsN.filter(t => /certibiocide|appâtage|\bbox/i.test(t)).map(t => t.slice(0, 80)));
  { const d = mn.b.fn.demoSemisDe(), types = METIERS.nettoyage.types, txt = d.planning.map(p => p[3] + ' ' + p[4]).concat(d.clients.map(c => c[0]), d.checklist, d.arepartir);
    vrai('le planning de démonstration du nettoyage : 13 créneaux, tous aux types du pack, aucun mot d\'anti-nuisibles', d.planning.length === 13 && d.planning.every(p => types.indexOf(p[4]) >= 0) && !ANTI.test(txt.join(' ')), txt.filter(t => ANTI.test(t)));
    vrai('… la checklist vient des prestations du pack', d.checklist.every(c => METIERS.nettoyage.presta.indexOf(c) >= 0), d.checklist); }
  { const r = mn.b.fn; r.demoCharger(); const I = mn.db.interventions;
    vrai('demoCharger en nettoyage : 14 interventions, 3 techniciens, 7 clients, aucun mot d\'anti-nuisibles', I.length === 14 && mn.db.techniciens.length === 3 && mn.db.clients.length === 7 && !ANTI.test(JSON.stringify(I.map(i => [i.titre, i.type, i.checklist])) + JSON.stringify(mn.db.clients.map(c => c.nom))), I.filter(i => ANTI.test(i.titre)).map(i => i.titre));
    vrai('⛔ …avec ses documents : 3 cahiers, 1 plan de prévention, UNE fiche de contrôle qualité déjà évaluée, le tout marqué démonstration', mn.db.cahiers.length === 3 && mn.db.cahiers.every(c => c.demo === 1 && c.zones.length === 4) && mn.db.plansPrevention.length === 1 && mn.db.plansPrevention[0].demo === 1
      && I.filter(i => i.controleQualite).length === 1 && I.find(i => i.controleQualite).relevesMetier.controleQualite.indexOf('%') > 0, [mn.db.cahiers && mn.db.cahiers.length, mn.db.plansPrevention && mn.db.plansPrevention.length]);
    r.demoRetirer();
    vrai('« Retirer la démonstration » emporte aussi les cahiers et le plan', mn.db.cahiers.length === 0 && mn.db.plansPrevention.length === 0 && mn.db.interventions.length === 0 && mn.db.clients.length === 0); }
  { const mp = monde('electricite', true); mp.b.fn.demoCharger(); const I = mp.db.interventions;
    vrai('un métier sans jeu écrit pour lui (électricité) : un planning bâti sur SES types, aucun mot d\'anti-nuisibles, aucun cahier', I.length === 14 && I.every(i => !i.type || METIERS.electricite.types.indexOf(i.type) >= 0) && !ANTI.test(JSON.stringify(I.map(i => [i.titre, i.type, i.checklist]))) && !mp.db.cahiers, I.slice(0, 3).map(i => i.titre)); }

  { const rap = (metier) => { const m = monde(metier, true); let html = ''; m.db.interventions = [{ id: 'i1', titre: 'Passage', clientId: 'c1' }]; m.db.clients = [{ id: 'c1', nom: 'Cabinet', email: 'a@b.test' }];
      const b = bac('app.html', ['envoiRapportClient', 'metierId', 'metierPackDe', 'metierPack', 'estMetier3D'], Object.assign(m.init, { openModal: h => { html = h; }, esc: s => String(s == null ? '' : s), clientName: () => 'Cabinet' }));
      b.fn.envoiRapportClient('i1'); return html; };
    const hn = rap('nettoyage'), h3 = rap('3d');
    vrai('« Envoyer le rapport au client » : nettoyage « photos, plans et signatures », 3D « plan d\'appâtage » comme avant', /photos, plans et signatures compris/.test(hn) && !/appâtage/.test(hn) && /photos, plan d’appâtage et signatures compris/.test(h3), [hn.slice(-160), h3.slice(-160)]); }
  console.log('\n── 3111 · 12. le code : registres, crochets, assistant devis, référentiel ──');
  const reg = (nom, re) => vrai('registre : ' + nom, re.test(N), nom);
  reg('l\'onglet Plans : « zones à traiter, accès, points sensibles » hors 3D, « postes d\'appâtage » à la 3D', /\$\{estMetier3D\(\)\?`<p style="color:var\(--t3\);font-size:12\.5px">Plans du site : postes d'appâtage[^`]*`\s*:`<p style="color:var\(--t3\);font-size:12\.5px">Plans du site : zones à traiter, accès, points sensibles/);
  reg('le sous-titre du technicien ne parle plus de box sans box', /\(sansBox\(\)\?'Mon activité — mon planning, mes bons':'Mon activité — mes box, mes bons, mon planning'\)/);
  reg('la visite guidée : « des documents » à la place de « des box » hors 3D', /s\.v==='clients'&&!estMetier3D\(\)\)\?Object\.assign\(\{\},s,\{h:s\.h\.replace\('des interventions et des box','des interventions et des documents'\)\}\)/);
  reg('les questions héritées d\'ELAN (type de traitement, véhicule, matériel) ne se posent qu\'à la 3D', /\+\(estMetier3D\(\)\?oui\('qTypeTraitement','Type de traitement'\):''\)/);
  reg('l\'intervention née d\'un contrat porte un type du métier hors 3D', /if\(!estMetier3D\(\)\)\{ const T=intTypes\(\), der=db\.interventions\.filter\(x=>x&&x\.contratId===id/);
  reg('« Modules OP » ne dit « 3D » qu\'à la 3D', /\$\{estMetier3D\(\)\?'3D, circuits internes…':'circuits internes…'\}/);
  reg('COLLECTIONS_DONNEES porte cahiers et plansPrevention', /const COLLECTIONS_DONNEES=\[[^\]]*'cahiers','plansPrevention'(?:,'docsMetier')?\]/);
  reg('COLLS_GARDEES porte les deux (garde-fou du rétrécissement)', /const COLLS_GARDEES=\[[^\]]*'cahiers','plansPrevention'(?:,'docsMetier')?\]/);
  reg('OP_CLASSES : deux listes (socle)', /cahiers: 'liste', plansPrevention: 'liste'/);
  reg('migrate() pose les deux collections (une base ancienne les reçoit vides)', /const cols = \['users'[^\]]*'cahiers','plansPrevention'(?:,'docsMetier')?\]/);
  reg('COL_GRP : les droits de la catégorie Clients', /const COLL_GRP=\{[^}]*cahiers:'crm',plansPrevention:'crm'/);
  reg('COLL_QUOI : le refus sait les nommer', /const COLL_QUOI=\{[^}]*cahiers:'un cahier des tâches',plansPrevention:'un plan de prévention'/);
  reg('DEL_NOMS : la suppression les nomme', /const DEL_NOMS=\{[^}]*cahiers:'le cahier des tâches',plansPrevention:'le plan de prévention'/);
  reg('la remise à zéro les vide', /'registres','appareils','cahiers','plansPrevention'(?:,'docsMetier')?\]\.forEach\(k=>\{ db\[k\]=\[\]; \}\)/);
  reg('« Effacer les clients » emporte leurs cahiers et leurs plans', /if\(c\.clients\)\{ db\.clients=\[\]; db\.appareils=\[\]; db\.cahiers=\[\]; db\.plansPrevention=\[\];/);
  reg('supprimer un client DIT combien de cahiers et de plans restent', /cahiers:n\('cahiers'\),plans:n\('plansPrevention'\)/);
  reg('la fiche client appelle nettSectionClient ; l\'intervention nettIntCard ; le rapport nettRapportLignes ; la carte des prestations nettTachesPourCard', /nettSectionClient\(c\)/.test(N) && /nettIntCard\(i,intEdit\)/.test(N) && /nettRapportLignes\(i\)\.forEach/.test(N) && /nettTachesPourCard\(i\)\.filter/.test(N) ? /./ : /^$/);
  reg('l\'assistant devis envoie l\'entreprise et le métier (jamais un client de plus)', /body:JSON\.stringify\(\{\s*t:syncTeam\(\), metier:metierId\(\),\s*messages:/);
  reg('les deux générateurs de devis envoient le métier', /body:JSON\.stringify\(\{team:syncTeam\(\),metier:metierId\(\),code:code\|\|undefined/);
  reg('metierBloque : la bêta ne voit tout qu\'en 3D', /function metierBloque\(k\)\{ if\(BETA_ESSAI&&estMetier3D\(\)\) return false;/);
  reg('cataloguesFournisseurs ne s\'ouvre pour un pack posé que pour la 3D', /if\(catalogueEnPlace\(\)&&estMetier3D\(\)\) return true;/);
  const REF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'metiers.json'), 'utf8')).metiers.nettoyage;
  const cles2 = REF.releves.map(r => r.k);
  vrai('D1 : le référentiel du nettoyage porte les relevés du compte rendu (tâches non réalisées, machines, consommables, anomalies, incidents, remarques, accès)', ['surface', 'agents', 'tps', 'heuresPrevues', 'nonRealisees', 'machines', 'consommables', 'anomalies', 'incidents', 'remarquesClient', 'acces', 'controleQualite'].every(k => cles2.indexOf(k) >= 0), cles2);
  egal('… et l\'application embarque les MÊMES relevés (copie générée)', METIERS.nettoyage.releves.map(r => r.k), cles2);
  vrai('… aucun mot d\'anti-nuisibles dans ces relevés', !ANTI.test(REF.releves.map(r => r.l).join(' ')));
  await suite3(N, METIERS);
}
/* ══ 3111 · 13. LA RELECTURE ADVERSE DU 28 OCTOBRE 2026 (testeur + relecteur) : douze constats, chacun vérifié avant d'être corrigé ══ */
async function suite3(N, METIERS) {
  console.log('\n── 3111 · 13. relecture adverse : le vocabulaire « box » (constats 1, 2, 3, 9) ──');
  const BOXW = /\bbox(es)?\b/i;
  /* les littéraux de chaîne des appels toast( / confirm( / emptyState( du fichier, lus dans le CODE (les commentaires de tête de ligne sont déjà retirés de N) */
  const sauteChaine = (s, i) => { const q = s[i]; i++;
    while (i < s.length) { const c = s[i];
      if (c === '\\') { i += 2; continue; }
      if (c === q) return i + 1;
      if (q === '`' && c === '$' && s[i + 1] === '{') { let d = 1; i += 2; while (d && i < s.length) { const e = s[i]; if (e === '\'' || e === '"' || e === '`') { i = sauteChaine(s, i); continue; } if (e === '{') d++; else if (e === '}') d--; i++; } continue; }
      i++; }
    return i; };
  const appels = (nom) => { const out = [], re = new RegExp('(?<![\\w.])' + nom + '\\(', 'g'); let m;
    while ((m = re.exec(N))) { let i = m.index + m[0].length, d = 1; const dep = i;
      while (i < N.length && d) { const c = N[i]; if (c === '\'' || c === '"' || c === '`') { i = sauteChaine(N, i); continue; } if (c === '(') d++; else if (c === ')') d--; i++; }
      out.push(N.slice(dep, i - 1)); }
    return out; };
  const litteraux = (arg) => { const L = []; for (let i = 0; i < arg.length;) { const c = arg[i]; if (c === '\'' || c === '"' || c === '`') { const f = sauteChaine(arg, i); L.push(arg.slice(i + 1, f - 1)); i = f; } else i++; } return L; };
  const corpus = []; for (const nom of ['toast', 'confirm', 'emptyState', 'toastAnnuler']) appels(nom).forEach(a => litteraux(a).forEach(l => { if (BOXW.test(l)) corpus.push(l); }));
  const mondeBox = (metier) => bac('app.html', ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'metierBloque', 'sansBox', 'libBox', 'boxTxt', 'mvtBoxActif'],
    { METIERS, BETA_ESSAI: false, db: { metier }, console, BOX_TXT: evalue(N.slice(N.indexOf('const BOX_TXT=[') + 'const BOX_TXT='.length, N.indexOf('\nfunction boxTxt(')).trim().replace(/;$/, '')), mvtFBox: 'stockage' });
  const bn = mondeBox('nettoyage'), b3 = mondeBox('3d');
  vrai('(population) ' + corpus.length + ' littéraux « box » dans les toasts, confirmations et états vides du fichier', corpus.length >= 60, corpus.length);
  egal('⛔ nettoyage : AUCUN de ces textes ne dit encore « box » une fois lu par boxTxt', corpus.map(t => bn.fn.boxTxt(t)).filter(t => BOXW.test(t)), []);
  egal('⛔ 3D : boxTxt rend chaque texte TEL QUEL (ELAN ne change en rien)', corpus.filter(t => b3.fn.boxTxt(t) !== t), []);
  egal('boxTxt ne touche pas ce qui n\'est pas une chaîne', [bn.fn.boxTxt(undefined), bn.fn.boxTxt(12)], [undefined, 12]);
  egal('les tournures les plus visibles, au nettoyage (supprimer un technicien, doublon de produit, fusion, retrait)', ['Il est retiré des box, des véhicules et du planning', 'dans les box comme au global', 'Le stock des box s\'additionne, rien d\'autre', 'Produit retiré de la box', 'Il n’y en a plus dans cette box', 'Ajouté à toutes les box'].map(t => bn.fn.boxTxt(t)),
    ['Il est retiré du stockage, des véhicules et du planning', 'dans le stockage comme au global', 'Le stock s\'additionne, rien d\'autre', 'Produit retiré du stockage', 'Il n’y en a plus dans ce stockage', 'Ajouté au stockage']);
  /* la table s'applique CENTRALEMENT : toast, toastAnnuler, emptyState ; et chaque confirm( qui parle de box passe par boxTxt ou libBox */
  vrai('toast(), toastAnnuler() et emptyState() lisent leur texte à travers boxTxt (un message neuf est couvert sans y penser)', /function toast\(msg,ms,genre\)\{[^}]*msg=boxTxt\(msg\)/.test(N) && /function toastAnnuler\(msg,appel,ms\)\{\s*msg=boxTxt\(msg\)/.test(N) && /function emptyState\(ico,txt,btn,fn\)\{ txt=boxTxt\(txt\)/.test(N));
  const confBox = appels('confirm').filter(a => BOXW.test(litteraux(a).join(' ')));
  vrai('(population) ' + confBox.length + ' confirm( parlent de box dans le fichier, et chacun passe par boxTxt ou libBox', confBox.length >= 8 && confBox.every(a => /^boxTxt\(/.test(a.trim()) || /libBox\(/.test(a)), confBox.filter(a => !/^boxTxt\(/.test(a.trim()) && !/libBox\(/.test(a)).map(a => a.slice(0, 70)));
  /* constat 1 : Stock > Mouvements */
  egal('constat 1 : les trois libellés de Mouvements (« Toutes les box », « Filtrer par box », « Aucune box ne correspond ») ne sortent que par libBox',
    [(N.match(/Toutes les box/g) || []).length, (N.match(/Filtrer par box/g) || []).length], [(N.match(/libBox\('Toutes les box','Tous les lieux'\)/g) || []).length, (N.match(/libBox\('Filtrer par box','Filtrer par lieu'\)/g) || []).length]);
  vrai('… « Aucune box ne correspond. » (journal) aussi, et le filtre par box est RETIRÉ de la barre quand sansBox() est vrai', /libBox\('Aucune box ne correspond\.','Aucun lieu ne correspond\.'\)/.test(N) && /\$\{sansBox\(\)\?'':`<div class="mvt-dd"/.test(N));
  egal('… et un filtre posé avant (le journal du stockage) ne reste PAS appliqué sans bouton pour le lever : mvtBoxActif rend vide sans box, la valeur en 3D', [bn.fn.mvtBoxActif(), b3.fn.mvtBoxActif()], ['', 'stockage']);
  vrai('… la liste du journal et celle des bons lisent mvtBoxActif(), plus mvtFBox en direct', (N.match(/mvtBoxActif\(\)/g) || []).length >= 5 && !/base=base\.filter\(m=>m\.boxId===mvtFBox\)/.test(N) && !/if\(mvtFBox&&r\.boxId!==mvtFBox\) return;/.test(N));
  /* constat 2 : l'état vide du catalogue */
  vrai('constat 2 : « ils serviront ensuite dans les box, les interventions… » passe par libBox (nettoyage : « dans les interventions et les bons de commande »)', /ils serviront ensuite '\+libBox\('dans les box, les interventions et les bons de commande\.','dans les interventions et les bons de commande\.'\)/.test(N));
  /* constat 9 : le stockage créé compte comme une box */
  vrai('constat 9 (a) : « ＋ Produit » : section « Stockage », « Ajouter ce produit au stockage », note sans « chaque box »', /libBox\('Boxes','Stockage'\)/.test(N) && /libBox\('Ajouter ce produit à toutes les box \('\+visibleBoxes\(db\.boxes\)\.length\+'\)','Ajouter ce produit au stockage'\)/.test(N) && /libBox\('Le produit apparaîtra dans chaque box[^']*','Le produit apparaîtra dans le stockage/.test(N));
  vrai('(b) Arrivage : « au stock » et « Arrivage » (plus « stock de la box » ni « Arrivage box »), jusque dans le journal et la cloche', /libBox\('À l\\'enregistrement, les quantités sont ajoutées directement au stock de la box(?:[^'\\]|\\.)*','À l\\'enregistrement, les quantités sont ajoutées directement au stock et l\\'équipe reçoit une notification « Arrivage ».'\)/.test(N) && /logEvent\(libBox\('Arrivage box','Arrivage'\)/.test(N) && /<b>\$\{libBox\('Arrivage box','Arrivage'\)\}<\/b>/.test(N));
  vrai('(c) le ✎ du stockage : « Modifier le stockage », adresse sans carte, plus de « Code box », plus de « Numéro (ex : BOX-0001) »', /<h3>\$\{boxTxt\(id\?'Modifier la box':'Nouvelle box'\)\}<\/h3>/.test(N) && /libBox\('Choisis une adresse pour placer la box sur la carte\.','Indique l’adresse du stockage \(facultatif\)\.'\)/.test(N) && /\$\{boxTxt\(t\)\}<\/button>`\)\.join\(''\)\}<\/div>/.test(N) && /libBox\('Numéro \(ex : BOX-0001\)','Numéro \(facultatif\)'\)/.test(N));
  vrai('(d) la fiche du stockage : on revient au Stock (pas « Boxes ») et « hors des box » ne se dit qu\'à la 3D', /retour=\(stk&&\(current==='stock'\|\|sansBox\(\)\)\)\?'stock':'boxes'/.test(N) && /Le stock de l’entreprise\$\{libBox\(', hors des box',''\)\}\./.test(N) && /title="\$\{boxTxt\('Ajouter ou retirer des produits de cette box'\)\}"/.test(N) && /<h3 class="bxp-titre">\$\{boxTxt\('Produits de la box'\)\}/.test(N));
  vrai('(e) Mouvements : la puce de groupe « Déplier cette box » ne se dit qu\'à la 3D', /\$\{libBox\('cette box','ce groupe'\)\}/.test(N));
  vrai('le menu de la box et le bouton « Ouvrir les box » de Produits donnés ne mènent pas à une rubrique masquée', /sansBox\(\)\?'':'📦 Ouvrir les box',sansBox\(\)\?'':"go\('boxes'\)"/.test(N));

  console.log('\n── 3111 · 13. relecture adverse : la reprise d\'une fenêtre (constat 4) ──');
  { const ctx = vm.createContext({ nettCahW: null, nettCqW: null, formLignes: null, intNuis: new Set(), intTrait: {}, intMeth: new Set(), prodFours: new Set(), demLignes: [], bonLignes: [], _bonEditId: '', bonSites: [], document: { querySelector() { return null; } }, nettCahMaj() { ctx.__maj.push('cah'); }, nettCqMaj() { ctx.__maj.push('cq'); }, __maj: [] });
    vm.runInContext('var MULTI_MODELES=' + litteral(N, 'const MULTI_MODELES = ['), ctx);
    const M = id => vm.runInContext('MULTI_MODELES.find(function(r){return r.id===' + JSON.stringify(id) + ';})', ctx);
    const ids = ['nett-cah-zones', 'nett-cq-zones', 'nett-cq-actions'];
    vrai('MULTI_MODELES porte le cahier, la fiche de contrôle et ses actions (une ligne chacun, comme les autres fenêtres)', ids.every(i => !!M(i)));
    const cah = { id: 'ca9', clientId: 'c1', site: 'Siège', zones: [{ nom: 'Bureaux', taches: [] }] };
    ctx.nettCahW = cah; const lu = M('nett-cah-zones').lire();
    vrai('⛔ le modèle du cahier est l\'objet ENTIER (site, zones, accès…), pas un fragment', lu === cah && lu.zones.length === 1);
    M('nett-cah-zones').ecrire({ id: 'ca9', site: 'Autre' }); vrai('… la reprise le REMET dans la variable (après un rechargement elle valait null) et le redessine', ctx.nettCahW && ctx.nettCahW.site === 'Autre' && (M('nett-cah-zones').rendre(), ctx.__maj.indexOf('cah') >= 0));
    ctx.nettCqW = null; M('nett-cq-zones').ecrire({ iid: 'i1', zones: [] }); vrai('… idem pour la fiche de contrôle', ctx.nettCqW && ctx.nettCqW.iid === 'i1' && (M('nett-cq-zones').rendre(), ctx.__maj.indexOf('cq') >= 0));
    vrai('… son second conteneur (les actions) ne porte aucun modèle : il n\'est là que pour ne pas être capturé deux fois', M('nett-cq-actions').lire() === undefined); }
  { const F = monter({ db: { clients: [{ id: 'c1', nom: 'Cabinet', adresse: '1 rue X' }], interventions: [{ id: 'i1', clientId: 'c1', date: '2026-10-20', type: 'Contrôle qualité chez le client', statut: 'planifiee' }], contrats: [], cahiers: [], plansPrevention: [] } });
    F.nettCahierForm('', 'c1'); F.nettControleForm('i1'); const [hc, hq] = F.__modals;
    vrai('(population) les deux formulaires s\'ouvrent', !!hc && !!hq);
    vrai('le cahier porte le conteneur du modèle (id) et CHAQUE champ du haut et du bas a un NOM (sans lui la reprise ne le retrouve pas : son identifiant automatique change à chaque dessin)',
      /id="nett-cah-zones"/.test(hc) && ['site', 'referent', 'acces', 'securite', 'nePasMelanger', 'valideLe', 'valideParNom'].every(k => new RegExp('name="nettCah_' + k + '" (?:oninput|onchange)="nettCahW\\.' + k + '=this\\.value"').test(hc)));
    vrai('… la fiche de contrôle aussi (deux conteneurs, cinq champs nommés)', /id="nett-cq-zones"/.test(hq) && /id="nett-cq-actions"/.test(hq) && ['controleur', 'clientPresent', 'anomalies', 'contreControle', 'visaClient'].every(k => new RegExp('name="nettCq_' + k + '" (?:oninput|onchange)="nettCqW\\.' + k + '=this\\.value"').test(hq)));
    const nus = []; for (const h of [hc, hq]) for (const m of h.matchAll(/<(?:input|textarea|select)\b[^>]*?(?:oninput|onchange)="nett(?:Cah|Cq)W\.([A-Za-z]+)=this\.value"[^>]*>/g)) if (!/ name="/.test(m[0])) nus.push(m[1]);
    egal('… et aucun champ de plus (hors des conteneurs du modèle) n\'est resté sans nom', nus, []);
    const A = monter({ db: { clients: [], interventions: [], contrats: [], cahiers: [], plansPrevention: [] } }); A.nettCahW = null; A.nettCqW = null; A.nettCahierSauver(); A.nettControleSauver();
    vrai('⛔ enregistrer sans état le DIT (deux messages) au lieu de ne rien faire en silence', A.__toasts.length === 2 && A.__toasts.every(t => /n’est plus à jour/.test(t)), A.__toasts);
    const S0 = monter({ db: { clients: [], interventions: [], contrats: [], cahiers: [], plansPrevention: [] } }); S0.nettCahW = null; S0.nettCahierSauver(true);
    vrai('… sauf pour l\'enregistrement silencieux de l\'envoi (c\'est l\'envoi qui parle)', S0.__toasts.length === 0); }

  console.log('\n── 3111 · 13. relecture adverse : la fiche client au téléphone (5), l\'en-tête sans nom (6), le Devis IA (7, 10) ──');
  { const base = { clients: [{ id: 'c1', nom: 'Cabinet', adresse: '1 rue X', email: 'a@b.test' }], interventions: [], contrats: [], plansPrevention: [{ id: 'p1', clientId: 'c1', date: '2026-10-20' }],
      cahiers: [{ id: 'k1', clientId: 'c1', site: 'Siège', version: 1, date: '2026-10-20', zones: [], valideLe: '2026-10-20' }] };
    const sec = monter({ db: base }).nettSectionClient(base.clients[0]);
    const lignes = sec.match(/<div class="pl-row"[^>]*>/g) || [];
    vrai('constat 5 : chaque ligne de « Documents du site » PASSE À LA LIGNE (les boutons descendent sous le texte) et le texte garde 220 px', lignes.length === 2 && lignes.every(l => /flex-wrap:wrap/.test(l)) && (sec.match(/class="pl-info" style="flex:1 1 220px"/g) || []).length === 2, lignes);
    vrai('… la pastille « validé le … » porte la date COURTE (fmtShort), plus « mercredi 28 octobre 2026 »', /validé le 20\/10<\/span>/.test(sec) && !/validé le 20\/10\/2026/.test(sec) && /Plan de prévention du 20\/10(?!\/)/.test(sec), sec.match(/validé le [^<]*/)); }

  console.log('\n── 3111 · 13. relecture adverse : le moyen de paiement (11), le serveur du Devis IA (7, 10), la publication (12) ──');
  { const monde = (metier) => bac('app.html', ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'moyensPaiement', 'moyensPaiementOptions', 'intMoyenPaiementOptions'],
      { METIERS, BETA_ESSAI: false, db: { metier }, console, esc: s => String(s == null ? '' : s), MOYENS_PAIEMENT: evalue(litteral(N, 'const MOYENS_PAIEMENT = [')), MOYENS_PAIEMENT_NEUTRES: evalue(litteral(N, 'const MOYENS_PAIEMENT_NEUTRES = [')) });
    const bn = monde('nettoyage'), b3 = monde('3d'), opts = h => [...h.matchAll(/<option[^>]*>([^<]*)<\/option>/g)].map(m => m[1]);
    const ELAN = ['A) Carte bancaire', 'B) Lien de paiement', 'C) Espèces', 'D) Chèque', 'E) Paiement en plusieurs fois - COFIDIS', 'F) Paiement en 2x - espèce + chèque', 'G) Paiement en 2x - CB + chèque', 'H) Virement'];
    egal('constat 11 : la 3D garde SA liste, mot pour mot (fiche et formulaires)', [opts(b3.fn.intMoyenPaiementOptions('')), b3.fn.moyensPaiement()], [['Aucun'].concat(ELAN), ELAN]);
    egal('… un autre métier reçoit la liste NEUTRE : ni COFIDIS, ni « 2x espèce + chèque »', opts(bn.fn.intMoyenPaiementOptions('')), ['Aucun', 'Carte bancaire', 'Espèces', 'Chèque', 'Virement', 'Lien de paiement']);
    vrai('… une valeur déjà rangée hors liste (une base venue de la 3D) reste proposée ET sélectionnée, fiche comme formulaires : un enregistrement ne l\'efface pas', /<option selected>C\) Espèces<\/option>/.test(bn.fn.intMoyenPaiementOptions('C) Espèces')) && /<option selected>C\) Espèces<\/option>/.test(bn.fn.moyensPaiementOptions('C) Espèces')) && opts(bn.fn.moyensPaiementOptions('C) Espèces'))[0] === 'C) Espèces');
    const regModeDe = bac('app.html', ['regModeDe'], {}).fn.regModeDe;
    egal('… chaque moyen neutre est reconnu par le registre des règlements (CB, ESP, CHQ, VIR, LDP)', ['Carte bancaire', 'Espèces', 'Chèque', 'Virement', 'Lien de paiement'].map(regModeDe), ['CB', 'ESP', 'CHQ', 'VIR', 'LDP']);
    vrai('… plus aucun formulaire ne lit MOYENS_PAIEMENT en direct (la liste du métier est la seule porte)', !/MOYENS_PAIEMENT\.map|MOYENS_PAIEMENT\.includes|concat\(MOYENS_PAIEMENT\)/.test(N) && (N.match(/moyensPaiementOptions\(i\.moyenPaiement\)/g) || []).length === 2); }
  { const dev = (metier, etat) => { let appels = 0; const b = bac('app.html', ['devisMetierPret', 'estMetier3D', 'metierId', 'metierPackDe', 'metierPack'], { METIERS, BETA_ESSAI: false, db: { metier }, console, _devisMetierOk: null, PUSH_API: 'http://x', syncTeam: () => 't1',
        fetch: () => { appels++; return etat === 'panne' ? Promise.reject(new Error('réseau')) : Promise.resolve({ json: () => Promise.resolve(etat) }); } }); return { b, nb: () => appels }; };
    const a = dev('3d', {}); vrai('constat 7/10 : la 3D n\'attend rien (la consigne du serveur d\'avant, à l\'identique) et n\'appelle même pas le serveur', (await a.b.fn.devisMetierPret()) === true && a.nb() === 0);
    const n0 = dev('nettoyage', { ok: true }); vrai('⛔ nettoyage, serveur d\'AVANT (pas de « metiers ») : le Devis IA et l\'assistant ne partent pas', (await n0.b.fn.devisMetierPret()) === false);
    const n1 = dev('nettoyage', { ok: true, metiers: true }); vrai('… serveur qui lit le métier (`metiers:true`) : ils partent', (await n1.b.fn.devisMetierPret()) === true);
    await n1.b.fn.devisMetierPret(); vrai('… la réponse se retient (un seul appel)', n1.nb() === 1);
    const n2 = dev('nettoyage', 'panne'); vrai('… serveur injoignable : ils ne partent pas non plus (et ne retiennent pas la panne)', (await n2.b.fn.devisMetierPret()) === false && n2.b.scope._devisMetierOk === null);
  }
  vrai('le Devis IA et l\'assistant demandent `devisMetierPret()` AVANT leur appel au serveur (devisIAGo, adEnvoyer) et le Devis IA se coupe à l\'ouverture', /if\(!\(await devisMetierPret\(\)\)\)\{ show\(DEVIS_METIER_ATTENTE\); return; \}\s*if\(btn\)\{ btn\.disabled=true;/.test(N) && /if\(!\(await devisMetierPret\(\)\)\)\{ toast\(DEVIS_METIER_ATTENTE,6000\); return; \}\s*adFil\.push\(\{role:'user'/.test(N) && /_devisMetierOk=\(j\.metiers===true\)/.test(N));
  { const base = { clients: [{ id: 'c1', nom: 'Cabinet', adresse: '1 rue X', email: 'a@b.test' }, { id: 'c2', nom: 'Autre', soc: 'Éclat Sud', adresse: '2 rue Y', email: 'c@d.test' }], interventions: [], contrats: [], plansPrevention: [],
      cahiers: [{ id: 'k1', clientId: 'c1', site: 'Siège', version: 1, date: '2026-10-20', zones: [{ id: 'z', nom: 'Bureaux', taches: [{ id: 't', t: 'Aspiration', freq: 'quotidienne', jours: '', horaire: '' }] }] },
        { id: 'k2', clientId: 'c2', site: 'Site', version: 1, date: '2026-10-20', zones: [{ id: 'z', nom: 'Bureaux', taches: [{ id: 't', t: 'Aspiration', freq: 'quotidienne', jours: '', horaire: '' }] }] }] };
    const sans = { nom: '', couleur: '#1E7A4E', logo: '', adresse: '', cp: '', ville: '', siret: '', tel: '', email: '', societes: { 'Éclat Sud': { nom: 'Éclat Sud', raison: 'Éclat Sud SARL', siret: '999', adresse: '9 quai', couleur: '#2563EB' } } };
    const W0 = monter({ db: base, entete: sans }), R = await W0.nettDocFabriquer('cahier', 'k1', '');
    vrai('constat 6 : sans nom d\'entreprise (Paramètres) ni société, le document n\'est PAS fabriqué : « Renseigne le nom de ton entreprise »', !R.pdf && /Renseigne le nom de ton entreprise \(Paramètres\)/.test(R.err || ''), R.err);
    const W1 = monter({ db: base, entete: sans }); await W1.nettDocApercu('cahier', 'k1', '');
    vrai('… l\'aperçu : une fenêtre ouverte DANS le geste, refermée, le refus dit', W1.__windows.length === 1 && W1.__windows[0].ferme === true && W1.__toasts.some(t => /Renseigne le nom de ton entreprise/.test(t)));
    const W2 = monter({ db: base, entete: sans }); await W2.nettDocEnvoyer('cahier', 'k1', '');
    vrai('⛔ … l\'envoi : AUCUN courriel, aucune trace d\'envoi', W2.__mails.length === 0 && !W2.db.cahiers[0].envoyeLe && W2.__toasts.some(t => /Renseigne le nom de ton entreprise/.test(t)), W2.__toasts);
    const W3 = monter({ db: base, entete: sans }), R3 = await W3.nettDocFabriquer('cahier', 'k2', '');
    vrai('… une société choisie sur le client (donc son nom en tête) suffit : le document se fabrique', !!R3.pdf && !R3.err, R3.err);
    const W4 = monter({ db: base, entete: Object.assign({}, sans, { nom: 'OP GESTION' }) }), R4 = await W4.nettDocFabriquer('cahier', 'k1', '');
    vrai('⛔ … et jamais sous « OP GESTION » : le nom du logiciel est refusé comme le nom vide', !R4.pdf && /Renseigne le nom/.test(R4.err || ''));
    const W5 = monter({ db: base, entete: Object.assign({}, sans, { nom: 'Éclat Propreté' }) }), R5 = await W5.nettDocFabriquer('cahier', 'k1', '');
    vrai('… avec un nom d\'entreprise, rien ne change : le document se fabrique', !!R5.pdf && !R5.err); }
  { const sh = path.join(__dirname, '..', 'scripts', 'verifier-publication-bete.sh'), cp = require('child_process'), os = require('os');
    vrai('constat 12 : le script de contrôle de la publication de la bêta existe', fs.existsSync(sh));
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pubbeta-')); const g = (...a) => cp.execFileSync('git', a, { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const lance = (...args) => { try { return { code: 0, out: cp.execFileSync('bash', [sh, ...args], { cwd: dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status, out: String(e.stdout || '') }; } };
    g('init', '-q'); g('config', 'user.email', 'a@b.test'); g('config', 'user.name', 'T'); for (const f of ['beta.html', 'app.html', 'demo.html', 'sw.js', 'REPRISE.md']) fs.writeFileSync(path.join(dir, f), 'v1'); g('add', '.'); g('commit', '-q', '-m', 'base');
    fs.writeFileSync(path.join(dir, 'beta.html'), 'v2'); g('add', 'beta.html'); const ok1 = lance();
    vrai('… beta.html seul : accepté', ok1.code === 0, ok1.out);
    fs.writeFileSync(path.join(dir, 'demo.html'), 'v2'); fs.writeFileSync(path.join(dir, 'sw.js'), 'v2'); g('add', 'demo.html', 'sw.js'); const ko1 = lance();
    vrai('⛔ … avec demo.html et sw.js dans l\'index : REFUSÉ, et les deux fichiers sont NOMMÉS', ko1.code === 1 && /demo\.html/.test(ko1.out) && /sw\.js/.test(ko1.out) && !/- beta\.html/.test(ko1.out), ko1.out);
    fs.rmSync(dir, { recursive: true, force: true }); }
}
function fin() {
  console.log(`\n════ test-3111 : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
}
