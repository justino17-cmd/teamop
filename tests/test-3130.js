/* ══ test-3130 · LE PACK 3D : CE QUI ÉTAIT FAUX SUR UN DOCUMENT OU UN ÉCRAN ══════════════════════════════════════════════════════════
   28 octobre 2026. Justin garde le pack 3D pour les autres entreprises de dératisation et demande s'il peut être amélioré ; la proposition
   (A1 à A9, B10) a relevé sept choses FAUSSES — pas des décisions de produit. Ce banc EXÉCUTE les vraies fonctions d'app.html
   (`bac` de metiers-outils.js : le code, commentaires de tête de ligne retirés) et ne lit jamais une phrase pour un comportement :
   1. A1 le pied du registre sanitaire ne cite plus « arrêté du 8 octobre 2021 » (il n'existe pas) : la référence juste est l'arrêté du 9 octobre 2013
      modifié (Certibiocide), et le registre n'y est PAS présenté comme une obligation légale d'une forme précise ;
   2. A2 l'alerte « appâtage permanent » ne date plus d'« 2019 » ni n'« interdit » : elle renvoie à l'AMM du produit ; une zone de production
      alimentaire AVERTIT (« à vérifier dans l'AMM du produit ») au lieu de refuser — le poste est posé, déplacé, la zone choisie ;
   3. A3 le devis xylophage intégré n'imprime plus « NF DTU 68 », « garantis 10 ans », « sous 3 semaines », ni une seconde validité de 30 jours
      (le devis imprime déjà la sienne) ; « CTB-P+ » (certification des produits) reste ; la consigne de l'IA n'invente plus d'engagement ;
   4. A5 le registre imprimé affiche le certificat Certibiocide de CHAQUE technicien d'un passage, et ne reprend que les produits biocides
      (ni piège, ni EPI, ni matériel sans AMM — mais jamais une ligne qui porte une AMM, ni une saisie libre) ;
   5. A6 une intervention née d'un contrat 3D porte le type « Contrat anti nuisibles (HACCP) » (sans lui sa fiche ne s'ouvre pas) ; hors 3D, rien ne change ;
   6. A9 la plaque engluée, le vernis protecteur, le répulsif et le spray « sans biocide » ne sont plus en TP14 / TP18 ;
   7. B10 huit nuisibles de plus (termites, moustiques, taupes, poissons d'argent, cloportes, perce-oreilles, charançons, teignes des denrées) :
      dans le sélecteur, les diagnostics, les groupes de constat, et « Traitement xylophage » ne tombe plus sur « Autre ».
   Mutations : scratchpad/mutations-pack-3d-corrections (résultats cités dans le commit). */
'use strict';
const { lire, litteral, evalue, bac, fonction } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

const F = 'app.html';
const { N } = lire(F);
const METIERS = evalue(litteral(N, 'const METIERS={')), INT_TYPES = evalue(litteral(N, 'const INT_TYPES = ['));
const CATS_NON_BIO = evalue(litteral(N, 'const CATS_NON_BIOCIDES=['));
const PA_TYPES = evalue(litteral(N, 'const PA_TYPES={'));
const PAP_ZONES_ALIM = evalue(litteral(N, 'const PAP_ZONES_ALIM=['));
const CAT_LIST = evalue(litteral(N, 'const CAT_LIST=['));
const CATALOGUE = evalue(litteral(N, 'const CATALOGUE=['));
const NUISIBLES = evalue(litteral(N, 'const NUISIBLES = ['));
const NUIS_CATS = evalue(litteral(N, 'const NUIS_CATS = ['));
const NUIS_TRAIT = evalue(litteral(N, 'const NUIS_TRAIT = {'));
const CAT_AUTO = evalue(litteral(N, 'const CAT_AUTO = {'));
const NUIS_3D = evalue(litteral(N, 'const NUIS_3D=['));
const NUIS_GROUP = evalue(litteral(N, 'const NUIS_GROUP={'));
const TRAITEMENT = evalue(litteral(N, 'const TRAITEMENT={'));
/* `techName` est une flèche (const), pas une déclaration : on prend la VRAIE expression du fichier */
const TECHNAME = (/const techName = (id => \{[^\n]*\});/.exec(N) || [])[1];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const NOUVEAUX = ['Termites', 'Moustiques', 'Taupes', 'Poissons d’argent', 'Cloportes', 'Perce-oreilles', 'Charançons', 'Teignes des denrées'];

console.log('\n── 3130 · 0. population ──');
vrai('(population) le code des fonctions touchées est trouvé', ['printRegistre', 'registreBiocides', 'ligneBiocide', 't3dRegBanner', 'papPlacePoste', 'papMovePoste', 'papSheetZone', 'papAlimTxt', 'buildXyloDevisLocal', 'genererInterventionContrat'].every(n => fonction(N, n).length > 40));
vrai('(population) techName est trouvée dans le code', !!TECHNAME);
vrai('(population) le catalogue compte ' + CATALOGUE.length + ' références, les nuisibles ' + NUISIBLES.length, CATALOGUE.length === 160 && NUISIBLES.length > 20);

/* ── 1. A1 + A5 : le registre imprimé ── */
console.log('\n── 3130 · 1. A1 et A5 — printRegistre, joué ──');
function registre(db0) {
  const db = JSON.parse(JSON.stringify(db0)); const sortie = { html: '' };
  const w = { open: () => ({ document: { write: h => { sortie.html += h; }, close() {} }, print() {} }) };
  const init = { db, window: w, setTimeout: () => 0, esc, toast: () => {}, todayISO: () => '2026-10-28', CATS_NON_BIOCIDES: CATS_NON_BIO,
    docEntete: () => ({ nom: 'Dératisation Test', couleur: '#124E78', logo: '' }), socDuClient: () => '', docCoordLignes: () => [], encreSur: () => '#fff',
    produit: id => db.produits.find(p => p.id === id), techName: new Function('db', 'return ' + TECHNAME)(db) };
  const b = bac(F, ['printRegistre', 'registreInts', 'registreBiocides', 'ligneBiocide', 'intTechIds', 'prodLineUnit'], init);
  b.fn.printRegistre('c1');
  return { html: sortie.html, bio: b.fn.registreBiocides('c1') };
}
const BASE = {
  clients: [{ id: 'c1', nom: 'Boulangerie Élise' }],
  techniciens: [{ id: 't1', nom: 'Anna Marti', certibiocide: 'CERT-ANNA-111' }, { id: 't2', nom: 'Bruno Lenoir', certibiocide: 'CERT-BRUNO-222' }, { id: 't3', nom: 'Chloé Sans', certibiocide: '' }],
  produits: [
    { id: 'p1', nom: 'Bromadiolone bloc', amm: 'FR-2019-0042', categorie: 'TP14 — Rodenticide', matiereActive: 'bromadiolone' },
    { id: 'p2', nom: 'Gel blattes', amm: '', categorie: 'TP18 — Insecticide' },
    { id: 'p3', nom: 'Plaque engluée souris', amm: '', categorie: 'Piégeage' },
    { id: 'p4', nom: 'Demi-masque', amm: '', categorie: 'EPI' },
    { id: 'p5', nom: 'Poudreuse', amm: '', categorie: 'Matériel' },
    { id: 'p6', nom: 'Grillage acier', amm: '', categorie: 'Proofing' },
    { id: 'p7', nom: 'Piège avec AMM déclarée', amm: 'FR-2020-0007', categorie: 'Piégeage' },
    { id: 'p8', nom: 'Désinfectant surfaces', amm: '', categorie: 'Désinfection' },
    { id: 'p9', nom: 'Injection xylophage', amm: '', categorie: 'Xylophage' },
    { id: 'p10', nom: 'Ajouté en intervention', amm: '', categorie: 'Ajouté depuis une intervention' }],
  interventions: [
    { id: 'i1', clientId: 'c1', date: '2026-10-20', heure: '09:00', statut: 'terminee', type: 'Dératisation', techIds: ['t1', 't2'], produitsUtilises: [
      { produitId: 'p1', qte: 2, unite: 'u' }, { produitId: 'p2', qte: 1, unite: 'u' }, { produitId: 'p3', qte: 4, unite: 'u' }, { produitId: 'p4', qte: 1, unite: 'u' },
      { produitId: 'p5', qte: 1, unite: 'u' }, { produitId: 'p6', qte: 1, unite: 'u' }, { produitId: 'p7', qte: 1, unite: 'u' }, { produitId: 'p8', qte: 1, unite: 'u' },
      { produitId: 'p9', qte: 1, unite: 'u' }, { produitId: 'p10', qte: 1, unite: 'u' }, { nomLibre: 'Appât maison', qte: 3, unite: 'u', categorie: 'rongeurs' }, { produitId: 'p-supprime', qte: 1, unite: 'u' }] },
    { id: 'i2', clientId: 'c1', date: '2026-10-21', heure: '09:00', statut: 'terminee', type: 'Dératisation', techIds: ['t3'], produitsUtilises: [{ produitId: 'p1', qte: 1, unite: 'u' }] },
    { id: 'i3', clientId: 'c1', date: '2026-10-22', heure: '09:00', statut: 'terminee', type: 'Dératisation', techId: 't1', produitsUtilises: [{ produitId: 'p1', qte: 1, unite: 'u' }] }]
};
{ const R = registre(BASE), nom = l => l.nom;
  vrai('(population) le registre s\'imprime : 3 passages, des lignes de produits', /Registre sanitaire/.test(R.html) && (R.html.match(/<tr>/g) || []).length > 8, R.html.length);
  /* A1 */
  vrai('A1 « arrêté du 8 octobre 2021 » n\'est plus imprimé nulle part', !/8 octobre 2021/.test(R.html));
  vrai('A1 la référence Certibiocide est l\'arrêté du 9 octobre 2013 modifié', /arrêté du 9 octobre 2013 modifié/.test(R.html) && /Certibiocide/.test(R.html.slice(R.html.lastIndexOf('<p style="margin-top:24px'))));
  vrai('A1 le pied ne présente pas le registre comme une obligation réglementaire d\'une forme précise', !/traçabilité réglementaire/i.test(R.html) && /Document de traçabilité des traitements biocides/.test(R.html));
  /* A5 b : les produits */
  const noms = R.bio.map(nom);
  egal('A5(b) le registre ne garde que les biocides : insecticide, rodonticide, désinfectant, xylophage, ajouté en intervention, AMM déclarée, saisie libre, fiche disparue',
    [...new Set(noms)].sort(), ['Appât maison', 'Ajouté en intervention', 'Bromadiolone bloc', 'Désinfectant surfaces', 'Gel blattes', 'Injection xylophage', 'Piège avec AMM déclarée', 'Produit'].sort());
  vrai('A5(b) ni plaque engluée, ni EPI, ni poudreuse, ni grillage (aucune AMM) dans le registre — écran ET document', !/Plaque engluée|Demi-masque|Poudreuse|Grillage/.test(R.html) && !noms.some(n => /Plaque|masque|Poudreuse|Grillage/.test(n)));
  vrai('A5(b) la ligne d\'un « Piégeage » qui PORTE une AMM reste (on ne retire que ce qu\'on SAIT n\'être pas un biocide)', /Piège avec AMM déclarée/.test(R.html) && /FR-2020-0007/.test(R.html));
  /* A5 a : les certificats */
  const ligneP1 = R.html.split('</tr>').find(l => /Bromadiolone bloc/.test(l) && /20\/10\/2026/.test(l) && /Anna Marti/.test(l));
  vrai('A5(a) un passage à DEUX techniciens : le certificat des deux s\'imprime (Anna ET Bruno)', !!ligneP1 && /Anna Marti<br><span[^>]*>Certibiocide CERT-ANNA-111/.test(ligneP1) && /Bruno Lenoir<br><span[^>]*>Certibiocide CERT-BRUNO-222/.test(ligneP1), ligneP1);
  const ligneSans = R.html.split('</tr>').find(l => /Chloé Sans/.test(l));
  vrai('A5(a) un technicien sans certificat saisi : son nom seul, sans « Certibiocide » inventé', !!ligneSans && !/Certibiocide/.test(ligneSans.slice(ligneSans.indexOf('Chloé Sans'))), ligneSans);
  const ligneSeul = R.html.split('</tr>').find(l => /Anna Marti/.test(l) && !/Bruno/.test(l) && /Bromadiolone/.test(l));
  vrai('A5(a) un passage à UN technicien : toujours son certificat (rien ne régresse)', !!ligneSeul && /Certibiocide CERT-ANNA-111/.test(ligneSeul));
  vrai('A5(a) les lignes ont leur liste de techniciens (cette donnée-là est lue par le document)', R.bio.filter(l => l.intId === 'i1').every(l => Array.isArray(l.techs) && l.techs.length === 2 && l.techs[1].certibiocide === 'CERT-BRUNO-222'));
}

/* ── 2. A2 : appâtage permanent et zone alimentaire ── */
console.log('\n── 3130 · 2. A2 — l\'alerte renvoie à l\'AMM, la zone alimentaire avertit ──');
{ const i = { id: 'i1', materiel3d: { blocParaffine: { on: true, qte: 4 } }, quest: { rongeurs: { actif: true, reponses: { espece: 'Aucune présence' } } } };
  const b = bac(F, ['t3dRegBanner', 't3dRegAlerte'], { esc });
  const h = b.fn.t3dRegBanner(i);
  vrai('(population) l\'alerte se rend (appât posé, rien constaté) et porte sa zone de justification', /Appâtage|appâtage/.test(h) && /justifAppatage/.test(h), h.slice(0, 120));
  vrai('A2 plus de « 2019 » ni d\'« interdit » : la date inventée est partie', !/2019|interdit/i.test(h), h.match(/[^>]{0,60}(2019|interdit)[^<]{0,40}/i));
  vrai('A2 la consigne juste : pas autorisé par les AMM des rodenticides anticoagulants — lire l\'AMM du produit', /pas autorisé par les AMM des rodenticides anticoagulants/.test(h) && /lis l’AMM du produit/.test(h));
  vrai('A2 le texte garde la demande de justification (infestation avérée)', /infestation avérée/.test(h));
  vrai('A2 aucune alerte quand une présence est constatée (comportement inchangé)', b.fn.t3dRegBanner(Object.assign({}, i, { quest: { rongeurs: { actif: true, reponses: { crottes: 'oui', espece: 'Rats' } } } })) === ''); }

function monde() {
  const pl = { id: 'pl1', nom: 'Plan cuisine', mode: 'rooms', version: 1, historique: [], postes: [], rooms: [{ id: 'r1', nom: 'Cuisine', x: 0, y: 0, w: 0.5, h: 0.5, zoneAlim: true }, { id: 'r2', nom: 'Cave', x: 0.5, y: 0.5, w: 0.5, h: 0.5 }] };
  const db = { interventions: [{ id: 'i1', clientId: 'c1', histo: [] }], plansSite: { c1: [pl] } };
  const sortie = { toasts: [], modales: [], saves: 0 };
  const init = { db, PA_TYPES, PAP_ZONES_ALIM, toast: m => sortie.toasts.push(m), openModal: h => sortie.modales.push(h), can: () => true, papSansFond: () => false, uid: (() => { let n = 0; return () => 'u' + (++n); })(),
    intHisto: (i, t) => i.histo.push(t), save: () => { sortie.saves++; }, renderIntDetail: () => {}, papPosteSheet: () => {} };
  const b = bac(F, ['papPlacePoste', 'papMovePoste', 'papSheetZone', 'papAlimTxt', 'papRoomAlimAt', 'papZoneAlimName', 'papSetXY', 'papMarque', 'papTouch', 'papFindPoste', 'plansOf'], init);
  return { pl, db, sortie, fn: b.fn };
}
{ const W = monde();
  W.fn.papPlacePoste('i1', W.pl, 0.2, 0.2, 'appat');
  vrai('A2 un appât posé en cuisine (zone alimentaire) : le poste EST posé — un avertissement, plus un refus', W.pl.postes.length === 1 && W.sortie.saves === 1, [W.pl.postes.length, W.sortie.saves]);
  vrai('… et le message dit « à vérifier dans l\'AMM du produit », sans « impossible » ni « interdit »', W.sortie.toasts.length === 1 && /à vérifier dans l’AMM du produit/.test(W.sortie.toasts[0]) && /CUISINE/.test(W.sortie.toasts[0]) && !/impossible|interdit/i.test(W.sortie.toasts[0]), W.sortie.toasts);
  vrai('… aucune fenêtre de refus ne s\'ouvre', W.sortie.modales.length === 0);
  const n0 = W.sortie.toasts.length;
  W.fn.papPlacePoste('i1', W.pl, 0.7, 0.7, 'appat');
  vrai('un appât posé hors zone alimentaire : posé, SANS avertissement (le message n\'est pas un bruit de fond)', W.pl.postes.length === 2 && !/AMM du produit/.test(W.sortie.toasts[n0] || ''), W.sortie.toasts[n0]);
  W.fn.papPlacePoste('i1', W.pl, 0.2, 0.2, 'piege');
  vrai('un piège mécanique en cuisine : posé sans avertissement (l\'AMM ne concerne que l\'appât)', W.pl.postes.length === 3 && !/AMM du produit/.test(W.sortie.toasts[W.sortie.toasts.length - 1]));
  const po = W.pl.postes[1]; const n1 = W.sortie.toasts.length;
  W.fn.papMovePoste('i1', W.pl, po.id, 0.1, 0.1);
  vrai('déplacer un appât VERS la cuisine : déplacé (x,y changés) et averti', Math.abs(po.x - 0.1) < 1e-9 && /à vérifier dans l’AMM du produit/.test(W.sortie.toasts[n1]) && W.sortie.modales.length === 0, [po.x, W.sortie.toasts[n1]]);
  W.db.plansSite.c1[0].postes.push({ id: 'pz', num: 9, type: 'appat', note: '' });
  const n2 = W.sortie.toasts.length;
  W.fn.papSheetZone('i1', 'pz', 'Cuisine');
  const pz = W.pl.postes.find(p => p.id === 'pz');
  vrai('choisir la zone « Cuisine » pour un appât : la zone est ENREGISTRÉE et l\'avertissement paraît', pz.zone === 'Cuisine' && /à vérifier dans l’AMM du produit/.test(W.sortie.toasts[n2] || ''), [pz.zone, W.sortie.toasts[n2]]);
  const n3 = W.sortie.toasts.length;
  W.fn.papSheetZone('i1', 'pz', 'Cave');
  vrai('… choisir « Cave » : zone changée, aucun avertissement', pz.zone === 'Cave' && W.sortie.toasts.length === n3); }
vrai('A2 le code ne contient plus de fenêtre de refus (papAlimBlock) ni « appâts rodonticides interdits/exclus » en code actif',
  !/papAlimBlock/.test(N) && !/appâts rodonticides (interdits|exclus)/.test(N) && !/Impossible de placer un appât/.test(N));

/* ── 3. A3 : le devis xylophage ── */
console.log('\n── 3130 · 3. A3 — buildXyloDevisLocal, joué ──');
{ const b = bac(F, ['buildXyloDevisLocal'], {});
  const forms = [{ surface: '40', trait: 'Bûchage + traitement curatif par injection', nuis: 'Termites', ouvrage: 'Charpente', infest: 'Fort' }, { surface: '', trait: 'Traitement préventif', nuis: 'Capricornes', ouvrage: 'Combles' }, {}];
  const R = forms.map(f => b.fn.buildXyloDevisLocal(f));
  vrai('(population) 3 devis générés, des lignes et un objet', R.every(r => r.lignes.length >= 5 && r.objet.length > 40 && typeof r.garantie === 'string'));
  egal('A3 aucun devis n\'imprime « NF DTU », « 10 ans », « garantis », « 3 semaines » ni une seconde « valable 30 jours »',
    R.map(r => /DTU|10 ans|garantis|3 semaines|valable 30/i.test(r.garantie + ' ' + r.objet + ' ' + r.lignes.map(l => l.designation).join(' '))), [false, false, false]);
  vrai('A3 « CTB-P+ » (la certification des PRODUITS) reste, dans la garantie et la ligne de fourniture', R.every(r => /CTB-P\+/.test(r.garantie) && r.lignes.some(l => /CTB-P\+/.test(l.designation))));
  vrai('A3 la garantie imprimée est courte et ne chiffre aucun engagement (aucun chiffre)', R.every(r => !/\d/.test(r.garantie)), R[0].garantie); }
{ const i0 = N.indexOf("const sys='Tu es expert en traitement du bois"), i1 = N.indexOf("';\n", i0);
  vrai('(population) la consigne de l\'IA du devis xylophage est trouvée', i0 > 0 && i1 > i0);
  const sys = evalue(N.slice(i0 + 'const sys='.length, i1 + 1));
  vrai('A3 la consigne de l\'IA ne demande plus « garantie, normes, délais » : elle interdit d\'inventer un engagement', !/garantie, normes, délais/.test(sys) && /n'invente aucun engagement/.test(sys) && /"garantie":""/.test(sys));
  vrai('A3 le PDF du devis imprime déjà SA validité de 30 jours (on ne la double pas dans la garantie)', /Devis valable 30 jours à compter de sa date d\\'émission/.test(N)); }

/* ── 4. A6 : l'intervention née d'un contrat ── */
console.log('\n── 3130 · 4. A6 — genererInterventionContrat, joué ──');
function genere(metier, avant) {
  const db = { metier, clients: [{ id: 'c1', nom: 'Client', adresse: '1 rue X' }], contrats: [{ id: 'k1', num: 'CTR-1', titre: 'Contrat annuel', clientId: 'c1', frequence: 'mensuel', dateDebut: '2026-10-01' }], interventions: avant || [] };
  const init = { db, METIERS, INT_TYPES, permGarde: () => true, cvcContratProchaineDate: () => '', cvcContratPlanifiee: () => false, ISO: d => d.toISOString().slice(0, 10), todayISO: () => '2026-10-28',
    uid: () => 'nouv', notifyTechNewInt: () => {}, logEvent: () => {}, save: () => {}, toast: () => {}, fmtShort: d => d, views: { contrats: () => {} }, confirm: () => true };
  const b = bac(F, ['genererInterventionContrat', 'ctrFreqDays', 'estMetier3D', 'metierId', 'metierPack', 'intTypes'], init);
  b.fn.genererInterventionContrat('k1');
  return db.interventions.find(x => x.id === 'nouv');
}
{ const g3 = genere('3d');
  vrai('(population) l\'intervention née du contrat est créée', !!g3 && g3.contratId === 'k1');
  vrai('A6 en 3D : elle porte le type « Contrat anti nuisibles (HACCP) »', g3.type === 'Contrat anti nuisibles (HACCP)', g3.type);
  vrai('A6 ce type a bien une fiche (TRAITEMENT) et fait partie de la liste des types de la 3D', !!TRAITEMENT['Contrat anti nuisibles (HACCP)'] && INT_TYPES.indexOf('Contrat anti nuisibles (HACCP)') >= 0);
  const gp = genere('plomberie');
  vrai('A6 hors 3D (plomberie) : le comportement de la v778 est INCHANGÉ — un type du métier ou aucun, jamais le type de la 3D', !!gp && gp.type !== 'Contrat anti nuisibles (HACCP)', gp && gp.type);
  const tp = (METIERS.plomberie.types || [])[0];
  const gd = genere('plomberie', [{ id: 'old', contratId: 'k1', type: tp, date: '2026-09-01' }]);
  vrai('A6 hors 3D, avec une visite précédente du contrat : on reprend SON type', !tp || (gd && gd.type === tp), [tp, gd && gd.type]); }

/* ── 5. A9 : le catalogue ── */
console.log('\n── 3130 · 5. A9 — catégories du catalogue ──');
{ const cat = nom => (CATALOGUE.find(c => c[0] === nom) || [])[1];
  const T = ['GRANDE PLAQUE EN ISOREL ENGLUÉE RATS/SOURIS', 'VULCANO VERNIS PROTECTEUR', 'REPULSIF FOUINES ET MARTRES', 'SPRAY INSECTICIDE FROID SANS BIOCIDE - KILL FREEZE'];
  vrai('(population) les quatre références sont dans le catalogue', T.every(n => cat(n)), T.map(cat));
  egal('A9 plaque engluée → Piégeage ; vernis protecteur → Matériel ; répulsif → Piégeage ; spray sans biocide → Matériel', T.map(cat), ['Piégeage', 'Matériel', 'Piégeage', 'Matériel']);
  vrai('A9 toutes les catégories restent dans CAT_LIST (règle : jamais une catégorie hors de CAT_LIST)', CATALOGUE.every(c => CAT_LIST.includes(c[1])));
  const biocideRange = CATALOGUE.filter(c => /^TP(14|18)/.test(c[1]) && /engl|vernis|r[ée]pulsif|sans biocide|plaque|pi[èe]ge/i.test(c[0]));
  egal('A9 plus aucun objet de capture / vernis / répulsif / « sans biocide » rangé en TP14 ou TP18 (hors les deux que la proposition n\'a pas relevés)', biocideRange.map(c => c[0]).sort(), ['PIÈGE BLATTES GEOTRAP'].sort());
  egal('A9 les noms (donc les identifiants de fiches, invariant de test-634) n\'ont pas bougé : 160 noms, tous uniques', [CATALOGUE.length, new Set(CATALOGUE.map(c => c[0])).size], [160, 160]); }

/* ── 6. B10 : les nuisibles ── */
console.log('\n── 3130 · 6. B10 — huit nuisibles de plus ──');
{ const plat = NUIS_CATS.flatMap(c => c[1]);
  vrai('(population) le sélecteur compte ' + plat.length + ' nuisibles dans ' + NUIS_CATS.length + ' catégories', plat.length === 23 && NUIS_CATS.length === 5);
  egal('B10 chacun des huit est dans le sélecteur (une fois), dans la liste des nuisibles, dans les diagnostics 3D et a son groupe de constat',
    NOUVEAUX.map(n => [plat.filter(x => x === n).length, NUISIBLES.includes(n), NUIS_3D.includes(n), !!NUIS_GROUP[n]]), NOUVEAUX.map(() => [1, true, true, true]));
  vrai('B10 aucun doublon dans les listes, et tout nuisible du sélecteur est dans la liste générale', new Set(plat).size === plat.length && new Set(NUISIBLES).size === NUISIBLES.length && plat.every(n => NUISIBLES.includes(n)));
  vrai('B10 « Termites » ouvre la fiche « Traitement xylophage », qui existe et propose « Termites »', NUIS_TRAIT.Termites === 'Traitement xylophage' && JSON.stringify(TRAITEMENT['Traitement xylophage']).includes('"Termites"'));
  vrai('B10 chaque fiche de traitement visée existe (rien ne pointe dans le vide)', Object.values(NUIS_TRAIT).every(k => TRAITEMENT[k]), Object.entries(NUIS_TRAIT).filter(e => !TRAITEMENT[e[1]]));
  egal('B10 groupes de constat : moustiques et teignes → volants ; poissons d\'argent, cloportes, perce-oreilles, charançons → rampants', ['Moustiques', 'Teignes des denrées', 'Poissons d’argent', 'Cloportes', 'Perce-oreilles', 'Charançons'].map(n => NUIS_GROUP[n]), ['volant', 'volant', 'rampant', 'rampant', 'rampant', 'rampant']);
  /* le geste : choisir le type « Traitement xylophage » dans le formulaire pré-remplit le nuisible */
  const init = { CAT_AUTO, intNuis: new Set(), intMeth: new Set(), renderIntNuis: () => {}, renderIntMeth: () => {}, garCheckBanner: () => {}, document: { querySelector: () => null } };
  const b = bac(F, ['intOnCat'], init);
  b.fn.intOnCat({ value: 'Traitement xylophage' });
  egal('B10 le geste : choisir « Traitement xylophage » coche « Termites », plus « Autre »', [...b.scope.intNuis], ['Termites']);
  b.fn.intOnCat({ value: 'Dératisation' });
  egal('… et la dératisation reste Rats + Souris (rien d\'autre ne bouge)', [...b.scope.intNuis], ['Rats', 'Souris']);
  /* les générateurs de test : un type de la 3D pour chaque nuisible neuf */
  const typeFor = (/const typeFor=n=>\(\{([^}]*)\}\[n\]\|\|'([^']*)'\)/.exec(N) || []);
  vrai('B10 les générateurs « une intervention par nuisible » donnent à « Termites » le type « Traitement xylophage » (deux endroits)', (N.match(/'Termites':'Traitement xylophage','Pigeons'/g) || []).length === 2 && !!typeFor[1]); }

console.log('\n════ test-3130 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
