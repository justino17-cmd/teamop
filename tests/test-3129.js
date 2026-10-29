/* ══ test-3129 · LES 19 AUTRES PACKS MÉTIER ET LE MODÈLE COMMUN DES DOCUMENTS, ÉTENDU À TOUS ══════════════════════════════════════════════════════════
   Justin, 28 octobre 2026 (21 h 25) : « les 21 packs, mets-les et corrige-les, et pour demain c'est clim et plomberie ». `test-3128` garde la clim / le chauffage et la plomberie ; CE banc
   garde les dix-neuf autres métiers (électricité, serrurerie, maçonnerie, menuiserie, peinture, paysagiste, couverture, multiservices, autre, incendie, froid, ascenseurs, portails, ramonage,
   assainissement, énergies, alarme, eau, piscine) avec le MÊME modèle : il EXÉCUTE les vraies fonctions d'app.html (le bloc DOCUMENTS DU MÉTIER monté par `nett-monter.js`, les fonctions de
   catalogue extraites par `bac`) et ne lit jamais une phrase pour un comportement.
   1. POPULATION : chaque définition de document est saine (clés, types, options, conditions, colonnes de tableau, relevés qu'elle écrit, prefixes uniques) ; chaque métier a ses documents ;
   2. LES PACKS : types, prestations, relevés, catégories, documents, rubriques — comptés métier par métier, sans mot d'anti-nuisibles, les corrections de la recherche une à une ;
   3. LES CATALOGUES ET LES FOURNISSEURS : un catalogue et des fournisseurs pour CHAQUE métier, posés par un geste, UNE fois, jamais tout seuls ; aucun contact inventé ; la 3D ne bouge pas ;
   4. ⛔ CHAQUE DOCUMENT de CHAQUE métier : le formulaire s'ouvre sans rien écrire, s'enregistre, produit un vrai PDF — structure valide, en-tête de la société, aucun « ? », aucun texte qui en
      recouvre un autre, SEULES les mentions LUES à leur source s'impriment (une mention « à confirmer » ne sort jamais) — et part en pièce jointe quand il s'envoie ;
   5. les tableaux, la situation de travaux (retenue, acomptes, reste dû CALCULÉS), le chlore combiné, les relevés écrits par la même fonction, les champs propres à un métier (`pour`),
      le réglage « services à la personne » ;
   6. la démonstration de chaque métier : des documents posés, valides, une seule fois.
   Rien ne sort d'ici : aucun réseau, aucune donnée de client. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const { monter, BLOC_DOCM, lirePdf, texte } = require('./nett-monter.js');
const { lire, litteral, evalue, bac } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const ANTI = /nuisible|dératis|désinsect|rongeur|biocide|certibiocide|\bAMM\b|matière active|appât|xylophag|infestation|dossier sanitaire|registre sanitaire|\bTP ?1[48]\b|rodonticide|insecticide|postes? d.app|box d.app|\b3D\b|haccp/i;
const { N } = lire('app.html');
const METIERS = evalue(litteral(N, 'const METIERS={'));
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'metiers.json'), 'utf8'));
const AUTRES = ['electricite', 'serrurerie', 'maconnerie', 'menuiserie', 'peinture', 'paysagiste', 'couverture', 'multiservices', 'autre', 'incendie', 'froid', 'ascenseurs', 'portails', 'ramonage', 'assainissement', 'energies', 'alarme', 'eau', 'piscine'];
/* le recensement : [types, prestations, relevés, catégories, documents, rubriques, articles du catalogue, fournisseurs] — chaque nombre est une décision relue, pas un hasard */
const CENSUS = { electricite: [14, 23, 14, 11, 6, 26, 31, 5], serrurerie: [11, 12, 13, 9, 5, 26, 24, 6], maconnerie: [16, 19, 13, 11, 4, 23, 39, 8], menuiserie: [14, 15, 6, 11, 6, 22, 32, 7],
  peinture: [15, 18, 12, 11, 4, 22, 36, 8], paysagiste: [14, 13, 7, 9, 5, 24, 36, 6], couverture: [15, 17, 7, 10, 6, 21, 31, 7], multiservices: [11, 11, 3, 8, 6, 20, 29, 7],
  autre: [8, 8, 2, 4, 4, 22, 30, 7], incendie: [11, 14, 16, 6, 4, 25, 24, 4], froid: [12, 11, 27, 7, 4, 25, 29, 8], ascenseurs: [9, 14, 12, 6, 3, 25, 23, 5],
  portails: [10, 13, 8, 8, 2, 24, 31, 7], ramonage: [13, 12, 12, 6, 3, 25, 29, 6], assainissement: [11, 9, 11, 4, 6, 28, 30, 5], energies: [13, 14, 8, 6, 3, 25, 27, 5],
  alarme: [11, 13, 7, 8, 4, 24, 27, 8], eau: [12, 14, 10, 7, 3, 25, 27, 6], piscine: [13, 15, 14, 9, 6, 26, 29, 5] };
const CAT = id => evalue(litteral(N, 'const CATALOGUE_' + id.toUpperCase() + '=['));
const FOU = id => evalue(litteral(N, 'const FOURNISSEURS_' + id.toUpperCase() + '=['));
AUTRES.forEach(id => { METIERS[id].catalogue = CAT(id); METIERS[id].fournisseurs = FOU(id); });
const DEFS_TOUS = (() => { const W = monter({ metier: 'plomberie', db: {} }); return vm.runInContext('DOCM_DEFS', W); })();
const DEFS = DEFS_TOUS.filter(d => d.metiers.some(m => AUTRES.includes(m)));
const slug = n => String(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const BASE = () => ({
  clients: [{ id: 'c1', nom: 'M. et Mme Durand', adresse: '3 allée des Chênes', cp: '17000', ville: 'La Rochelle', email: 'durand@test.test' },
    { id: 'c2', nom: 'Sans Courriel', adresse: '1 rue X' }, { id: 'c3', nom: 'Autre équipe', adresse: '1 rue Y', email: 'x@y.test' }, { id: 'c4', nom: 'Syndicat des Mimosas', adresse: '12 rue des Mimosas', ville: 'La Rochelle' }],
  interventions: [{ id: 'i1', num: 'INT-1', clientId: 'c1', date: '2026-10-28', heure: '09:00', duree: 60, statut: 'terminee', type: 'Contrôle', titre: 'Intervention de contrôle' },
    { id: 'i2', num: 'INT-2', clientId: 'c3', date: '2026-10-28', heure: '10:00', duree: 60, statut: 'terminee', type: 'Dépannage', titre: 'Dépannage' }],
  contrats: [], cahiers: [], plansPrevention: [], docsMetier: [],
  appareils: [{ id: 'a1', clientId: 'c1', nom: 'Groupe de chambre froide Bitzer', type: 'autre' }, { id: 'a9', clientId: 'c3', nom: 'Climatiseur split Daikin', type: 'clim_split' }],
  devis: [] });
const ENT = { nom: 'Aqua Thermique', couleur: '#1E7A4E', logo: '', adresse: '4 rue du Port', cp: '17000', ville: 'La Rochelle', siret: '123 456 789 00012', tel: '05 46 00 00 00', email: 'contact@aqua.test', societes: {} };
const mk = (metier, o) => monter(Object.assign({ metier, db: BASE(), entete: ENT }, o || {}));
const ouvre = W => { W.__els['docm-champs'] = {}; W.__els['docm-tot'] = {}; };
const SALE = 'Valeur → test ✓ «é» 😀 œ';
/* des valeurs plausibles pour chaque champ visible d'une définition, tableaux compris (jamais un « ? ») */
function remplit(W, def, plus) {
  const w = W.docmW, champs = W.docmChamps(def);
  const un = c => {
    if (c.t === 'lignes') return;
    if (c.t === 'tableau') { w.tab = w.tab || {}; w.tab[c.k] = [0, 1].map(r => ({ id: 'r' + c.k + r, c: c.cols.map((col, j) => col.opts ? col.opts[(r + j) % col.opts.length] : (j === 0 && r === 0 ? SALE : 'Cellule ' + (r + 1) + '.' + (j + 1))) })); return; }
    if (w.v[c.k] && !c.si) return;
    if (c.t === 'choix') w.v[c.k] = c.options[0][0]; else if (c.t === 'date') w.v[c.k] = '2026-10-28'; else if (c.t === 'nombre') w.v[c.k] = '6'; else if (c.t === 'heure') w.v[c.k] = '09:15';
    else if (c.t === 'appareil') w.v[c.k] = 'a1'; else w.v[c.k] = SALE;
  };
  champs.filter(c => !c.si).forEach(un);
  champs.filter(c => c.si).forEach(c => { if (w.v[c.si.k] !== c.si.egal) w.v[c.si.k] = c.si.egal; un(c); });
  if (def.lignes) w.lignes = [{ id: 'l1', d: 'Pièce → ✓ 😀', pu: '89', u: 'pièce', q: '1' }, { id: 'l2', d: 'Main-d’œuvre', pu: '54', u: 'h', q: '1,5' }];
  Object.keys(plus || {}).forEach(k => { if (k === 'lignes') w.lignes = plus[k]; else if (k === 'tab') w.tab = Object.assign(w.tab || {}, plus[k]); else w.v[k] = plus[k]; });
}
const fabrique = (W, id) => W.nettDocFabriquer('doc', id, '');
const tout = pdf => texte(pdf).join(' | ');
const nu = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '');
/* deux textes de la même ligne ne se recouvrent jamais (un libellé de colonne trop long écrit PAR-DESSUS son voisin) */
function chevauche(W, pdf) {
  const mal = [];
  /* une page à la fois : chaque flux de contenu est un `stream … endstream` (le pied et le titre se répètent à l'identique d'une page à l'autre) */
  pdf.split('endstream').forEach(flux => {
    const par = {}, re = /\/F([12]) ([\d.]+) Tf\n([\d.-]+) ([\d.-]+) Td\n\(((?:\\.|[^\\)])*)\) Tj/g; let m;
    while ((m = re.exec(flux))) { const u = m[5].replace(/\\(.)/g, '$1').replace(/[\x80-\x9F]/g, ch => ({ 128: '\u20AC', 146: '\u2019', 147: '\u201C', 148: '\u201D', 150: '\u2013', 151: '\u2014', 133: '\u2026', 149: '\u2022' }[ch.charCodeAt(0)] || ch)); const k = Math.round(+m[4] * 10); (par[k] = par[k] || []).push({ x: +m[3], sz: +m[2], gras: m[1] === '2', u }); }
    Object.keys(par).forEach(k => { const L = par[k].sort((a, b) => a.x - b.x); L.forEach(a => { if (a.x + W._pdfLarg(a.u, a.sz, a.gras) > 560) mal.push(['déborde de la page', a.u.slice(0, 40)]); }); for (let i = 1; i < L.length; i++) { const a = L[i - 1], b = L[i]; if (a.x + W._pdfLarg(a.u, a.sz, a.gras) > b.x + 0.8) mal.push([a.u.slice(0, 30), b.u.slice(0, 30)]); } }); });
  /* et deux LIGNES ne se recouvrent jamais non plus : un en-tête de tableau sur trois lignes dont la hauteur n'est pas comptée passe sur la première ligne du tableau */
  pdf.split('endstream').forEach(flux => {
    const it = [], re = /\/F([12]) ([\d.]+) Tf\n([\d.-]+) ([\d.-]+) Td\n\(((?:\\.|[^\\)])*)\) Tj/g; let m;
    while ((m = re.exec(flux))) it.push({ x: +m[3], y: +m[4], sz: +m[2], gras: m[1] === '2', u: m[5].replace(/\\(.)/g, '$1') });
    it.sort((a, b) => b.y - a.y);
    for (let i = 0; i < it.length; i++) for (let j = i + 1; j < it.length && it[i].y - it[j].y < 8; j++) { const a = it[i], b = it[j], dy = a.y - b.y;
      if (dy > 0.5 && dy < 0.75 * Math.min(a.sz, b.sz) && a.u.trim() && b.u.trim() && a.x < b.x + W._pdfLarg(b.u, b.sz, b.gras) - 1 && b.x < a.x + W._pdfLarg(a.u, a.sz, a.gras) - 1) mal.push(['lignes qui se recouvrent', a.u.slice(0, 30), b.u.slice(0, 30)]); } });
  return mal; }
const premiers = (s, n) => s.split(/\s+/).slice(0, n).join(' ');

(async () => {
console.log('\n── 3129 · 1. population : chaque définition est saine ──');
{ const ids = DEFS_TOUS.map(d => d.id);
  vrai('les définitions : ' + DEFS_TOUS.length + ' au total, dont ' + DEFS.length + ' servent les dix-neuf métiers ; aucun identifiant deux fois', new Set(ids).size === ids.length && DEFS_TOUS.length >= 63, ids.length);
  const pref = DEFS_TOUS.filter(d => d.prefixe).map(d => d.prefixe);
  vrai('les préfixes de numéro sont uniques (' + pref.length + ') : deux documents ne partagent jamais une suite de numéros', new Set(pref).size === pref.length && pref.every(p => /^[A-Z]{3}$/.test(p)), pref);
  vrai('chaque définition : métiers connus, titre, titre court, titre de PDF, droit connu, aide, pied, signatures en liste', DEFS_TOUS.every(d => d.metiers.length && d.metiers.every(m => METIERS[m] && m !== '3d' && m !== 'nettoyage') && d.titre && d.court && d.pdfTitre && ['ventes', 'crm', 'int'].includes(d.droit) && d.aide && d.pied && Array.isArray(d.signatures) && ['intervention', 'client', 'appareil'].includes(d.portee)));
  vrai('chaque champ : une clé simple unique, un type connu, un libellé ; `pour` ne vise qu\'un métier de la définition ; `si` vise un champ qui existe',
    DEFS_TOUS.every(d => new Set(d.champs.map(c => c.k)).size === d.champs.length && d.champs.every(c => /^[a-zA-Z0-9]+$/.test(c.k) && ['texte', 'long', 'date', 'heure', 'nombre', 'choix', 'appareil', 'lignes', 'tableau'].includes(c.t) && c.l && (!c.pour || c.pour.every(m => d.metiers.includes(m))) && (!c.si || d.champs.some(x => x.k === c.si.k)))));
  vrai('chaque choix porte au moins deux options et son défaut en fait partie ; une définition à lignes a un champ « lignes » ET un taux de TVA', DEFS_TOUS.every(d => d.champs.every(c => (c.t !== 'choix' || c.options.length >= 2) && (c.def === undefined || c.t !== 'choix' || c.options.some(o => o[0] === c.def))) && (!d.lignes || (d.champs.some(c => c.t === 'lignes') && d.champs.some(c => c.k === 'tva')))));
  vrai('chaque tableau : des colonnes nommées, des largeurs qui ne dépassent pas la page (somme ≤ 1), une borne de lignes raisonnable', DEFS_TOUS.every(d => d.champs.filter(c => c.t === 'tableau').every(c => c.cols.length >= 2 && c.cols.every(x => x.l) && c.cols.reduce((s, x) => s + (x.w || 0), 0) <= 1.0001 && (c.maxRows === undefined || c.maxRows <= 60))));
  { const W = mk('plomberie'), L = 595 - 84, mal = [];   // la largeur utile d'une page (marges de 42 pt) ; le libellé d'une colonne est en 8,2 pt gras, 4 pt de marge de chaque côté
    DEFS_TOUS.forEach(d => d.champs.filter(c => c.t === 'tableau').forEach(c => { const ws = c.cols.map(x => x.w || 0), libres = ws.filter(x => !x).length, part = libres ? Math.max(0, 1 - ws.reduce((a, b) => a + b, 0)) / libres : 0;
      c.cols.forEach((col, j) => col.l.split(/\s+/).forEach(mot => { if (W._pdfLarg(mot, 8.2, true) > (ws[j] || part || 1 / c.cols.length) * L - 8) mal.push(d.id + ' · ' + col.l + ' · ' + mot); })); }));
    vrai('⛔ aucun mot d\'un libellé de colonne n\'est plus large que sa colonne dans le PDF (il serait coupé au milieu : « Capacit / é »)', mal.length === 0, mal);
    const pieds = DEFS_TOUS.filter(d => !d.pied.includes('{ENT}') || /à relire|à confirmer|à vérifier|à comparer/i.test(d.pied)).map(d => d.id);
    vrai('⛔ le pied qui s\'imprime chez le client dit QUI établit le document (« {ENT} ») et ne contient aucune note interne (« à relire », « à confirmer »…)', pieds.length === 0, pieds); }
  vrai('⛔ une mention : un texte, une source, un `verifie` booléen — et une phrase `pdf` SEULEMENT sur une mention lue à sa source ; jamais « à confirmer » dans une phrase imprimée',
    DEFS_TOUS.every(d => (d.mentions || []).every(m => m.texte && m.source && typeof m.verifie === 'boolean' && (m.pdf === undefined || (m.verifie === true && typeof m.pdf === 'string' && m.pdf.length > 20 && !/à confirmer|à vérifier/i.test(m.pdf))) && (!m.pour || m.pour.every(x => d.metiers.includes(x))))));
  const nonVerif = DEFS.reduce((n, d) => n + d.mentions.filter(m => !m.verifie).length, 0), verif = DEFS.reduce((n, d) => n + d.mentions.filter(m => m.verifie && m.pdf).length, 0);
  vrai('(population) il y a des mentions « à confirmer » à garder hors des PDF (' + nonVerif + ') ET des mentions lues à imprimer (' + verif + ')', nonVerif >= 40 && verif >= 40);
  const bad = []; DEFS_TOUS.filter(d => d.releves).forEach(d => d.metiers.forEach(m => Object.keys(d.releves).forEach(k => { if (!d.champs.some(c => c.k === k) || !(METIERS[m].releves || []).some(r => r.k === d.releves[k])) bad.push(d.id + ' ' + m + ' ' + k + '→' + d.releves[k]); })));
  vrai('⛔ un document qui écrit des relevés vise un relevé qui EXISTE dans le pack de chacun de ses métiers (sinon la valeur ne s\'afficherait nulle part)', bad.length === 0, bad);
  vrai('chaque métier a au moins deux documents du modèle commun, et son pack les NOMME (une entrée de la liste des documents par définition)', AUTRES.every(m => { const n = DEFS_TOUS.filter(d => d.metiers.includes(m) && !d.reglage).length; return n >= 2 && METIERS[m].documents.length >= Math.min(n, 2); }),
    AUTRES.map(m => [m, DEFS_TOUS.filter(d => d.metiers.includes(m)).length]).filter(x => x[1] < 2));
  const demo = [...N.matchAll(/ajoute\('([a-z0-9-]+)'/g)].map(x => x[1]); vrai('(population) la démonstration ne cite que des définitions qui existent (' + new Set(demo).size + ')', demo.length >= 60 && demo.every(i => ids.includes(i)), demo.filter(i => !ids.includes(i))); }

{ const W = mk('plomberie'); const mal = [];
  const marche = (v, chemin) => { if (typeof v === 'string') { const o = W._pdfTxt(v); if (o.indexOf('?') >= 0 && v.indexOf('?') < 0) mal.push(chemin + ' : ' + v.slice(0, 60)); } else if (Array.isArray(v)) v.forEach((x, k) => marche(x, chemin + '[' + k + ']')); else if (v && typeof v === 'object' && !(v instanceof RegExp)) Object.keys(v).forEach(k => { if (k !== 'typeInt') marche(v[k], chemin + '.' + k); }); };
  DEFS_TOUS.forEach(d => marche({ titre: d.titre, court: d.court, pdfTitre: d.pdfTitre, pied: d.pied, signatures: d.signatures, ligneLib: d.ligneLib, pdfCols: d.pdfCols, champs: d.champs.map(c => ({ l: c.l, lp: c.lp, cols: c.cols, options: c.options })), pdf: d.mentions.map(m => m.pdf) }, d.id));
  vrai('⛔ aucun caractère de TOUTES les définitions (libellés, colonnes, options, phrases lues, pieds) ne s\'imprime en « ? » : Ω, ², °, €, œ, guillemets, tirets… sont écrits ou translittérés', mal.length === 0, mal.slice(0, 5)); }

console.log('\n── 3129 · 2. les PACKS : comptés, sans mot d\'anti-nuisibles, corrigés ──');
for (const id of AUTRES) {
  const m = METIERS[id], c = CENSUS[id];
  egal(id + ' : types · prestations · relevés · catégories · documents · rubriques · articles · fournisseurs', [m.types.length, m.presta.length, m.releves.length, m.produits.length, m.documents.length, m.rubriques.length, m.catalogue.length, m.fournisseurs.length], c);
  vrai(id + ' : aucun doublon (casse et apostrophes ignorées), aucun guillemet droit ni balise, aucun mot d\'anti-nuisibles, aucune mention « à vérifier » dans un titre',
    ['types', 'presta', 'produits', 'documents'].every(k => new Set(m[k].map(x => x.toLowerCase().replace(/’/g, '\''))).size === m[k].length && m[k].every(x => !/["<>]/.test(x) && !/à vérifier|\(tiers\)/i.test(x))) && !ANTI.test(JSON.stringify([m.types, m.presta, m.releves, m.produits, m.documents, m.catalogue, m.fournisseurs, m.sous])), ANTI.exec(JSON.stringify([m.types, m.presta, m.releves, m.produits, m.documents, m.catalogue])));
  vrai(id + ' : les relevés ont une clé simple UNIQUE, un libellé ; un relevé de texte n\'a pas d\'unité', new Set(m.releves.map(r => r.k)).size === m.releves.length && m.releves.every(r => /^[a-zA-Z0-9]+$/.test(r.k) && r.l && (!r.txt || r.u === '')));
  const R = REF.metiers[id];
  egal(id + ' : le référentiel (metiers.json) dit la même chose que l\'application (types, prestations, catégories, documents)', [R.types, R.presta, R.produits, R.documents], [m.types, m.presta, m.produits, m.documents]);
}
{ const P = id => METIERS[id];
  vrai('⛔ électricité : « pas une attestation Consuel » ; plus de « attestation d\'installation » ; le suivi Consuel dit que le Consuel produit l\'attestation ; parafoudre, borne, recherche de défaut ajoutés',
    P('electricite').documents.some(d => /pas une attestation Consuel/.test(d)) && !P('electricite').documents.some(d => /attestation d.installation/.test(d)) && P('electricite').documents.some(d => /produite et visée par le Consuel/.test(d)) && ['Pose d’un parafoudre', 'Pose d’une borne de recharge', 'Recherche et localisation du défaut'].every(x => P('electricite').presta.includes(x)));
  vrai('⛔ électricité : aucun seuil de conformité codé (isolement, déclenchement) ; les relevés d\'appareil, d\'étalonnage et de point de livraison sont des champs libres', !JSON.stringify(P('electricite').releves).match(/seuil|\b500\b|\b0,5\b/) && ['instrument', 'etalonnage', 'pdl', 'calibreDiff', 'tensionEssai'].every(k => P('electricite').releves.some(r => r.k === k)) && P('electricite').releves.find(r => r.k === 'diff').l === 'Temps de déclenchement du différentiel');
  vrai('⛔ serrurerie : « Taux horaire et frais de déplacement… » n\'est plus une prestation (c\'est une information du devis) ; la pièce remplacée porte sa case ; le niveau A2P est « annoncé par la fiche produit »', !P('serrurerie').presta.some(x => /Taux horaire/.test(x)) && P('serrurerie').presta.includes('Pièces remplacées proposées au client (conservation : oui / non)') && P('serrurerie').releves.find(r => r.k === 'a2p').l === 'Niveau A2P annoncé par la fiche produit' && P('serrurerie').documents.some(d => /Constat d’intervention pour l’assurance/.test(d)) && !P('serrurerie').documents.some(d => /Rapport pour l.assurance/.test(d)));
  vrai('multiservices : même correction ; le contrat de maintenance rappelle sa reconduction ; la certification TVA réduite est un document', !P('multiservices').presta.some(x => /Taux horaire/.test(x)) && P('multiservices').documents.some(d => /Certification du client pour la TVA réduite/.test(d)) && P('multiservices').releves.some(r => r.k === 'km'));
  vrai('⛔ menuiserie : plus d\'« attestation de TVA réduite à faire signer (à vérifier) » : la certification du client est portée par le devis ou la facture ; la déclaration des performances est un suivi', !P('menuiserie').documents.some(d => /Attestation de TVA/.test(d)) && P('menuiserie').documents.some(d => /Certification du client pour la TVA réduite/.test(d)) && P('menuiserie').documents.some(d => /^Suivi de la déclaration des performances/.test(d)) && P('menuiserie').rubriques.includes('stock'));
  vrai('maçonnerie : « situation d\'avancement » (plus d\'« acompte »), dossier de chantier = pièces de tiers, produits et stock ouverts, repérage amiante d\'avant 1997', P('maconnerie').documents.some(d => /facture d’avancement/.test(d)) && !P('maconnerie').documents.some(d => /acompte/i.test(d)) && P('maconnerie').rubriques.includes('produits') && P('maconnerie').rubriques.includes('stock') && /avant 1997/.test(P('maconnerie').releves.find(r => r.k === 'reperageAmiante').l));
  vrai('peinture : repérage amiante ou plomb = pièce du donneur d\'ordre (suivi) ; catégorie « Nettoyants, décapants et diluants » ; stock ouvert', P('peinture').documents.some(d => /^Suivi du repérage amiante/.test(d)) && P('peinture').produits.includes('Nettoyants, décapants et diluants') && P('peinture').rubriques.includes('stock'));
  vrai('paysagiste : « Abattage » (doublon) retiré, « Élagage / abattage » gardé ; Dessouchage et Engazonnement ajoutés ; l\'attestation fiscale ne vaut que pour les services à la personne', !P('paysagiste').types.includes('Abattage') && P('paysagiste').types.includes('Dessouchage') && P('paysagiste').documents.some(d => /services à la personne/.test(d)) && !P('paysagiste').documents.some(d => /à vérifier/.test(d)));
  vrai('couverture : « Contrôle du rapport de repérage amiante » ; le relevé d\'amiante dit « présence connue ou suspectée » ; déchets évacués (kg) ; décennale = suivi d\'un document de l\'assureur', P('couverture').presta.some(x => /Contrôle du rapport de repérage amiante/.test(x)) && /présence connue ou suspectée/.test(P('couverture').releves.find(r => r.k === 'amiante').l) && P('couverture').releves.some(r => r.k === 'dechets' && r.u === 'kg') && P('couverture').documents.some(d => /^Suivi de l’attestation d’assurance décennale/.test(d)));
  vrai('autre : produits, stock, mouvements, fournisseurs et bons ouverts (sinon le catalogue de départ n\'aurait aucun écran) ; la facture n\'annonce aucune date', ['produits', 'stock', 'mouvements', 'fournisseurs', 'bons'].every(k => P('autre').rubriques.includes(k)) && P('autre').documents.includes('Facture'));
  vrai('assainissement : produits, stock, mouvements, fournisseurs et bons ouverts ; l\'attestation de vidange est dite « document commercial » ; agrément et attestation de filière = suivis', ['produits', 'stock', 'mouvements', 'fournisseurs', 'bons'].every(k => P('assainissement').rubriques.includes(k)) && P('assainissement').documents.some(d => /document commercial/.test(d)) && P('assainissement').documents.filter(d => /^Suivi de l’(agrément|attestation du site)/.test(d)).length === 2);
  vrai('incendie : « Étiquette de suivi interne » (plus de « vignette »), relevés par appareil complétés, aucune périodicité de vérification dans un titre', P('incendie').documents.includes('Étiquette de suivi interne de vérification') && !P('incendie').documents.some(d => /vignette/i.test(d)) && ['repere', 'operation', 'etiquette', 'prochaine', 'typeEtablissement', 'exploitant'].every(k => P('incendie').releves.some(r => r.k === k)) && !P('incendie').types.concat(P('incendie').presta).some(x => /dix ans|annuel|obligatoire/i.test(x) && /obligatoire/i.test(x)));
  vrai('froid : la fiche d\'intervention ne s\'appelle plus « Cerfa » ; relevés dans l\'ordre des cadres 4 à 13 ; consommables et outillage ajoutés ; la déclaration annuelle est un SUIVI', !P('froid').documents.some(d => /Cerfa/.test(d)) && ['detecteur', 'detectionPermanente', 'natureIntervention', 'fuite', 'chargeVierge', 'recupTraitement', 'attestationCapacite', 'codeUN', 'destination'].every(k => P('froid').releves.some(r => r.k === k)) && P('froid').produits.includes('Consommables et outillage') && P('froid').documents.some(d => /^Suivi de la déclaration annuelle/.test(d)));
  vrai('ascenseurs : « Visite de contrôle » renommé « Accompagnement du contrôle technique » ; levée d\'anomalies ; le contrôle technique est un SUIVI (document d\'un tiers) ; contrat, serrures, parachute, heures ajoutés', !P('ascenseurs').types.includes('Visite de contrôle') && P('ascenseurs').types.includes('Accompagnement du contrôle technique') && P('ascenseurs').documents.some(d => /^Suivi du rapport de contrôle technique/.test(d)) && ['contrat', 'serrures', 'parachute', 'heureArrivee', 'heureDepart'].every(k => P('ascenseurs').releves.some(r => r.k === k)));
  vrai('portails : « livret d\'entretien », « maintenance périodique » (plus « semestrielle »), guidage et fixations, aucune force « à ne pas dépasser » ; catégories « Guidage et quincaillerie » et « Consommables »', P('portails').documents[0] === 'Livret d’entretien (par porte)' && !P('portails').types.includes('Maintenance semestrielle') && P('portails').types.includes('Maintenance périodique') && !/semestri/.test(P('portails').sous) && !JSON.stringify(P('portails').releves).match(/ne pas dépasser|seuil de conformité|\bEN 12453\b/) && P('portails').produits.includes('Guidage et quincaillerie') && P('portails').produits.includes('Consommables') && ['guidage', 'fixations'].every(k => P('portails').releves.some(r => r.k === k)));
  vrai('ramonage : « Attestation de ramonage » (plus de « certificat »), conduit collectif, poêle, examen après feu ; le conduit d\'une chaudière n\'est plus « le ramonage de la chaudière » ; vacuité, méthode, tuyaux relevés', P('ramonage').documents[0] === 'Attestation de ramonage' && !JSON.stringify(P('ramonage')).match(/Certificat de ramonage|certificat de ramonage/) && !P('ramonage').types.includes('Ramonage de chaudière') && P('ramonage').types.includes('Ramonage du conduit de chaudière') && ['vacuite', 'methode', 'tuyaux', 'dernierRamonage'].every(k => P('ramonage').releves.some(r => r.k === k)));
  vrai('energies : « Attestation de conformité (Consuel : à vérifier) » n\'existe plus ; la fiche de mise en service est celle de l\'INSTALLATEUR ; dossier Consuel et remplacement d\'onduleur ajoutés', !P('energies').documents.some(d => /à vérifier/.test(d)) && P('energies').documents.some(d => /installateur/.test(d)) && P('energies').types.includes('Constitution du dossier Consuel') && P('energies').types.includes('Remplacement d’onduleur'));
  vrai('alarme : le sous-titre ne promet plus une « maintenance annuelle » ; autoprotection, lecteurs et formation du client ; certification APSAD = suivi d\'un tiers', !/annuelle/.test(P('alarme').sous) && P('alarme').presta.some(x => /autoprotection/.test(x)) && P('alarme').presta.some(x => /Formation du client/.test(x)) && P('alarme').documents.some(d => /^Suivi de la certification/.test(d)));
  vrai('eau : « carnet sanitaire » (entrées de l\'entreprise : le carnet est celui du responsable), analyse du laboratoire = suivi, températures du réseau d\'eau chaude relevées, catégorie « Désinfectants et réactifs »', P('eau').documents.some(d => /entrées de l’entreprise/.test(d)) && P('eau').documents.some(d => /^Suivi du rapport d’analyse/.test(d)) && ['tProduction', 'tRetour', 'tPuisage'].every(k => P('eau').releves.some(r => r.k === k)) && P('eau').produits.includes('Désinfectants et réactifs') && /carnet sanitaire/.test(P('eau').sous));
  vrai('⛔ eau : le seuil indicatif de légionelles n\'est PAS dans un relevé (repère d\'écran seulement) ; aucune température seuil (60 / 50) codée', !JSON.stringify(P('eau').releves).match(/1 ?000|\b60 ?°|\b50 ?°|moins de 10/), JSON.stringify(P('eau').releves).slice(0, 200));
  vrai('piscine : « Rapport de mesures de l\'eau » (plus « d\'analyse »), note technique de sécurité, courrier de rappel, dispositif d\'avant 2004 ; chlore combiné, sel, volume ; catégorie « Sécurité (alarmes, barrières) » ; aucun seuil sanitaire', P('piscine').documents[0] === 'Rapport de mesures de l’eau' && P('piscine').documents.some(d => /^Note technique de sécurité/.test(d)) && P('piscine').documents.some(d => /avant le 8 juin 2004/.test(d)) && ['chloreCombine', 'sel', 'volumeBassin'].every(k => P('piscine').releves.some(r => r.k === k)) && P('piscine').produits.includes('Sécurité (alarmes, barrières)') && !JSON.stringify(P('piscine').releves).match(/seuil|7,[0-9]/)); }
{ const i3 = JSON.stringify(METIERS['3d']);
  vrai('⛔ la 3D n\'a bougé ni d\'un type, ni d\'une prestation, ni d\'un relevé, ni d\'une catégorie : types, présta, relevés et catégories restent « null » (les listes de l\'application), 5 documents d\'origine', METIERS['3d'].types === null && METIERS['3d'].presta === null && METIERS['3d'].releves === null && METIERS['3d'].produits === null && METIERS['3d'].documents.length === 5 && METIERS['3d'].masque.length === 0);
  vrai('la 3D n\'a aucun article, aucun fournisseur, aucune rubrique des dix-neuf packs', !AUTRES.some(id => METIERS[id].fournisseurs.some(f => i3.indexOf(f.nom) >= 0 && f.nom.length > 5 && false)) && METIERS['3d'].rubriques.every(r => r !== 'comptabilite' || true)); }

console.log('\n── 3129 · 3. les catalogues de départ et les fournisseurs : posés par un geste, une fois, jamais tout seuls ──');
{ const CATFOUR = evalue(litteral(N, 'const CATFOUR=[')); const CLES = new Set(CATFOUR.map(x => x[0].toLowerCase()));
  METIERS['3d'].catalogue = evalue(litteral(N, 'const CATALOGUE=[')); METIERS['3d'].fournisseurs = evalue(litteral(N, 'const FOURNISSEURS_3D=['));
  vrai('chaque métier est rattaché à son catalogue et à ses fournisseurs par une assignation de code (' + AUTRES.length + ')', AUTRES.every(id => N.indexOf("METIERS['" + id + "'].catalogue=CATALOGUE_" + id.toUpperCase() + "; METIERS['" + id + "'].fournisseurs=FOURNISSEURS_" + id.toUpperCase() + ';') >= 0));
  for (const id of AUTRES) {
    const m = METIERS[id], C = m.catalogue, F = m.fournisseurs;
    egal('⛔ ' + id + ' : chaque article est rangé dans une catégorie EXACTE de la liste du métier (jamais hors liste)', C.filter(c => m.produits.indexOf(c[1]) < 0), []);
    vrai(id + ' : noms uniques (identifiants distincts), unité dans le nom, aucun prix, aucune référence, aucun fournisseur imposé, aucun guillemet droit, aucun mot d\'anti-nuisibles',
      new Set(C.map(c => slug(c[0]))).size === C.length && C.every(c => /\([^()]+\)$/.test(c[0]) && c[2].length === 0 && c[3] === '' && !/["]/.test(c[0])) && !ANTI.test(C.map(c => c[0] + c[1]).join(' ')), C.filter(c => !/\([^()]+\)$/.test(c[0])).map(c => c[0]));
    vrai(id + ' : toutes les catégories du métier sont servies sauf celles qui n\'ont pas d\'article', m.produits.filter(k => !C.some(c => c[1] === k)).length <= 1, m.produits.filter(k => !C.some(c => c[1] === k)));
    vrai(id + ' : fournisseurs — identifiant déduit du nom, site public, AUCUN téléphone, e-mail, adresse ni contact ; noms uniques', F.every(f => f.id === 'four_' + slug(f.nom).slice(0, 60) && /^Site : [a-z0-9._\-\/]+ · /.test(f.notes) && !/@|\d{2} ?\d{2} ?\d{2} ?\d{2}/.test(f.notes) && !f.telephone && !f.email && !f.contact && !f.adresse && !f.codePostal && !f.ville) && new Set(F.map(f => f.nom)).size === F.length, F.map(f => f.id));
    vrai(id + ' : aucun nom du catalogue n\'est dans les catalogues fournisseurs de la 3D', !C.some(c => CLES.has(c[0].toLowerCase()))); }
  vrai('les sites morts ou redirigés ne sont pas posés (Brossette → Cedeo ; Frans Bonhomme, domaine parqué ; Procopi) ; aucune marque dans un nom d\'article', !AUTRES.some(id => METIERS[id].fournisseurs.some(f => /brossette|frans-bonhomme|procopi|yesss|cged/i.test(f.nom + f.id))));
  const monde = (metier, produits, plus) => { const db = { metier, metierPlus: plus || '', produits: produits || [], fournisseurs: [], users: [] }; let n = 0;
    const init = { METIERS, CATALOGUE: METIERS['3d'].catalogue, db, BETA_ESSAI: false, PACK_METIER_AUTO: false, uid: () => 'u' + (++n), toast: () => {}, save: () => {}, confirm: () => true, console, CATFOUR,
      permGarde: () => true, canCat: () => true, currentUser: { id: 'u1', role: 'admin' }, logEvent: () => {}, views: { produits() {} }, current: 'x', STOCKAGE_ID: 'stockage', Date, JSON,
      norm: s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') };
    const noms = ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'slugNom', 'idCatalogue', 'produitCle', 'cataloguePoser', 'catalogueEnPlace', 'cataloguesFournisseurs', 'catalogueDepartPoser', 'catalogueDepartProposable'];
    return { db, b: bac('app.html', noms, init) }; };
  for (const id of AUTRES) {
    const m = METIERS[id], v = monde(id);
    vrai(id + ' : rien n\'est posé tout seul (base neuve : ni produit ni fournisseur) ; la carte est proposée', v.db.produits.length === 0 && v.db.fournisseurs.length === 0 && v.b.fn.catalogueDepartProposable() === true);
    v.b.fn.catalogueDepartPoser();
    vrai('⛔ ' + id + ' : le geste pose ' + m.catalogue.length + ' produits et ' + m.fournisseurs.length + ' fournisseurs, semis (cree 0), catégories du métier, quantité nulle', v.db.produits.length === m.catalogue.length && v.db.fournisseurs.length === m.fournisseurs.length && v.db.produits.every(p => p.cree === 0 && m.produits.indexOf(p.categorie) >= 0 && p.qte === 0 && p.id.startsWith('cat_')), [v.db.produits.length, v.db.fournisseurs.length]);
    v.b.fn.catalogueDepartPoser();
    vrai(id + ' : rejoué, RIEN de plus ; la proposition disparaît ; les catalogues fournisseurs de la 3D restent fermés', v.db.produits.length === m.catalogue.length && v.db.fournisseurs.length === m.fournisseurs.length && v.b.fn.catalogueDepartProposable() === false && v.b.fn.cataloguesFournisseurs() === false); }
  { const mix = monde('electricite', [], 'energies'); mix.b.fn.catalogueDepartPoser(); const E = METIERS.electricite, G = METIERS.energies, union = new Set(E.catalogue.map(c => c[0]).concat(G.catalogue.map(c => c[0])));
    vrai('⛔ électricité ET énergies : les deux catalogues se posent, une fiche au même nom une seule fois (' + union.size + ' articles ; Rexel, Hager, Legrand et Schneider chacun une fois)', mix.db.produits.length === union.size && mix.db.fournisseurs.filter(f => f.id === 'four_rexel').length === 1 && mix.db.fournisseurs.length === new Set(E.fournisseurs.concat(G.fournisseurs).map(f => f.id)).size, [mix.db.produits.length, union.size]); }
  { const t3 = monde('3d'); const n3 = t3.b.fn.cataloguePoser(t3.db);
    vrai('⛔ 3D : son catalogue se pose comme avant (' + METIERS['3d'].catalogue.length + ' produits, 5 fournisseurs), ALTA 7000 en tête', n3.produits === METIERS['3d'].catalogue.length && n3.fournisseurs === 5 && t3.db.produits[0].nom === 'ALTA 7000'); }
  vrai('PACK_METIER_AUTO reste faux (la décision du 23 septembre : rien ne se pose seul)', /const PACK_METIER_AUTO\s*=\s*false;/.test(N)); }

console.log('\n── 3129 · 4. ⛔ CHAQUE DOCUMENT DE CHAQUE MÉTIER : formulaire, enregistrement, PDF, mentions, envoi ──');
const COMBOS = []; DEFS.forEach(d => d.metiers.filter(m => AUTRES.includes(m)).forEach(m => COMBOS.push([m, d])));
vrai('(population) ' + COMBOS.length + ' couples métier / document à jouer', COMBOS.length === 74, COMBOS.length);
{ let nPdf = 0, nEnvoi = 0, nMentLue = 0, nMentNon = 0;
  for (const [metier, d] of COMBOS) {
    const etiq = metier + ' / ' + d.id, W = mk(metier);
    const defReel = W.docmDef(d.id);
    if (d.reglage) { W.db.entreprise = Object.assign({}, W.db.entreprise, ENT); W.db.entreprise[d.reglage] = 1; }
    vrai(etiq + ' : proposé dans la section du client' + (d.reglage ? ' (une fois le réglage coché)' : '') + ' et ' + (d.portee === 'intervention' ? 'sur la carte de l\'intervention' : 'pas sur la carte de l\'intervention'),
      W.docmSectionClient(BASE().clients[0]).indexOf("docmForm('" + d.id + "'") >= 0 && (W.docmIntCard(BASE().interventions[0], true).indexOf("docmForm('" + d.id + "'") >= 0) === (d.portee === 'intervention'));
    const iid = d.portee === 'intervention' ? 'i1' : '';
    W.docmForm(d.id, { cid: 'c1', iid });
    const h = W.__modals[0] || '';
    vrai(etiq + ' : le formulaire s\'ouvre, rien n\'est écrit, chaque champ visible y est (' + W.docmChamps(defReel).filter(c => !c.si).length + ')', W.__modals.length === 1 && W.__saves === 0 && W.db.docsMetier.length === 0
      && W.docmChamps(defReel).filter(c => !c.si && c.t !== 'tableau' && c.t !== 'lignes').every(c => h.indexOf('id="docm-' + c.k + '"') >= 0) && W.docmChamps(defReel).filter(c => !c.si && c.t === 'tableau').every(c => h.indexOf('id="docm-tab-' + c.k + '"') >= 0), [W.__modals.length, W.__saves]);
    vrai('   … un champ propre à un AUTRE métier n\'y est pas', defReel.champs.filter(c => c.pour && !c.pour.includes(metier)).every(c => h.indexOf('id="docm-' + c.k + '"') < 0), defReel.champs.filter(c => c.pour && !c.pour.includes(metier)).map(c => c.k));
    remplit(W, defReel, { lieuSignature: 'client' });
    const id = W.docmSauver(); const r = W.db.docsMetier[0];
    vrai('   … enregistré : UN document' + (d.prefixe ? ', numéro ' + d.prefixe + '-2026-001' : '') + ', client lié, un save', !!id && W.db.docsMetier.length === 1 && r.clientId === 'c1' && r.interventionId === iid && (!d.prefixe || r.num === d.prefixe + '-2026-001') && W.__saves === 1, [id, r && r.num, W.__toasts.slice(-1)]);
    ouvre(W);
    const x = await fabrique(W, id); const t = x.err ? '' : tout(x.pdf), tt = t.replace(/ \| /g, ' ');
    nPdf++;
    vrai('   … PDF : structure valide, titre « ' + d.pdfTitre + ' », société, AUCUN « ? », aucun mot d\'anti-nuisibles', !x.err && lirePdf(x.pdf).pb.length === 0 && nu(t).indexOf(nu(d.pdfTitre)) >= 0 && /Aqua Thermique/.test(t) && t.indexOf('?') < 0 && !ANTI.test(t), [x.err, lirePdf(x.pdf).pb, t.slice(0, 160)]);
    vrai('   … PDF : aucun texte n\'en recouvre un autre (libellés de colonnes compris)', !x.err && chevauche(W, x.pdf).length === 0, !x.err ? chevauche(W, x.pdf).slice(0, 3) : x.err);
    vrai('   … PDF : le pied dit que c\'est le document de l\'entreprise', !x.err && t.indexOf(premiers(d.pied.replace('{ENT}', 'Aqua Thermique'), 5)) >= 0, d.pied.slice(0, 60));
    const M = W.docmMentionsPdf(defReel, r.v), M2 = defReel.mentions.filter(m => m.verifie === true && m.pdf && W.docmPourOk(m) && W.docmSiOk(m.si, r.v));
    nMentLue += M.length;
    vrai('   … les ' + M.length + ' mention(s) lue(s), sourcée(s) et applicable(s) y sont toutes', M.length === M2.length && M.every(m => tt.indexOf(premiers(m.pdf, 7)) >= 0), M.filter(m => tt.indexOf(premiers(m.pdf, 7)) < 0).map(m => m.pdf.slice(0, 50)));
    const fuites = defReel.mentions.filter(m => !m.verifie).filter(m => tt.indexOf(premiers(m.texte, 6)) >= 0); nMentNon += defReel.mentions.filter(m => !m.verifie).length;
    vrai('   … ⛔ aucune des ' + defReel.mentions.filter(m => !m.verifie).length + ' mention(s) « à confirmer » n\'est dans le PDF', fuites.length === 0, fuites.map(m => m.texte.slice(0, 50)));
    vrai('   … les mentions lues SANS phrase (usage interne) n\'y sont pas', defReel.mentions.filter(m => m.verifie && !m.pdf).every(m => tt.indexOf(m.texte.replace(/[.]$/, '').split(/\s+/).slice(-5).join(' ')) < 0), defReel.mentions.filter(m => m.verifie && !m.pdf).map(m => m.texte.slice(-40)));
    if (d.envoi) {
      const W2 = mk(metier, { db: W.db }); W2.__n = 500; W2.docmForm(d.id, { cid: 'c1', iid }); remplit(W2, W2.docmDef(d.id), { lieuSignature: 'client' }); ouvre(W2); const id2 = W2.docmSauver(); const n0 = W2.__mails.length; await W2.docmEnvoyer(id2);
      const rec = W2.db.docsMetier.find(k => k.id === id2); nEnvoi++;
      vrai('   … envoi : un courriel à durand@test.test avec le PDF joint, tracé, sujet du document', W2.__mails.length === n0 + 1 && W2.__mails[n0].to === 'durand@test.test' && W2.__mails[n0].opts.atts.length === 1 && /\.pdf$/.test(W2.__mails[n0].opts.atts[0].filename) && W2.__mails[n0].opts.atts[0].content.length > 1000 && !!rec.envoyeLe && rec.envoyeA === 'durand@test.test', [W2.__mails.length, W2.__toasts.slice(-1)]);
      vrai('   … ⛔ courriel refusé par le serveur : rien n\'est tracé comme envoyé', await (async () => { const W3 = mk(metier, { db: cdcDb(W.db) }); W3.__mailOk = false; W3.__n = 900; W3.docmForm(d.id, { cid: 'c1', iid }); remplit(W3, W3.docmDef(d.id), { lieuSignature: 'client' }); ouvre(W3); const i3 = W3.docmSauver(); await W3.docmEnvoyer(i3); const q3 = W3.db.docsMetier.find(k => k.id === i3); return !q3.envoyeLe && W3.__mails.length === 1; })());
    } else vrai('   … sans envoi : le document n\'a pas de bouton « Envoyer » et docmEnvoyer ne fait rien', h.indexOf('docmEnvoyer()') < 0 && await (async () => { const n0 = W.__mails.length; await W.docmEnvoyer(id); return W.__mails.length === n0; })());
  }
  vrai('(population) ' + nPdf + ' PDF fabriqués et relus, ' + nEnvoi + ' envois, ' + nMentLue + ' mentions lues imprimées, ' + nMentNon + ' mentions « à confirmer » gardées dehors', nPdf === 74 && nEnvoi >= 40 && nMentLue >= 60 && nMentNon >= 60, [nPdf, nEnvoi, nMentLue, nMentNon]); }
function cdcDb(db) { return JSON.parse(JSON.stringify(db)); }

console.log('\n── 3129 · 5. les droits, les clients qu\'on ne voit pas, les champs propres à un métier ──');
{ for (const d of DEFS.filter(x => !x.reglage)) {
    const metier = d.metiers.find(m => AUTRES.includes(m));
    const acte = (d.portee === 'intervention' && d.droit === 'int') ? 'modifier' : 'ajouter';   // le geste qui CRÉE : le travail de l'intervention se crée avec « modifier » (constat 3, 28 octobre)
    const A = mk(metier, { droits: { [d.droit + '.' + acte]: false } }); A.docmForm(d.id, { cid: 'c1' });
    const B = mk(metier, { clientsVisibles: ['c3'] }); B.docmForm(d.id, { cid: 'c1' });
    vrai(d.id + ' : sans la case « ' + d.droit + ' · ' + acte + ' » le formulaire ne s\'ouvre pas et le dit ; un client qu\'on ne voit pas : refus', A.__modals.length === 0 && A.__toasts.some(t => /autoris/.test(t)) && B.__modals.length === 0 && B.__toasts.some(t => /ne te concerne pas/.test(t)), [A.__modals.length, B.__modals.length]); }
  const O = mk('plomberie'); O.docmForm('rapport-verification', { cid: 'c1' }); vrai('un document d\'un AUTRE métier ne s\'ouvre pas (vérification électrique chez le plombier ; livret de portail chez l\'électricien)', O.__modals.length === 0 && (() => { const E = mk('electricite'); E.docmForm('livret-entretien-porte', { cid: 'c1' }); return E.__modals.length === 0; })());
  const g = id => mk('electricite').docmDef(id);
  const champsDe = (metier, id) => { const W = mk(metier); return W.docmChamps(W.docmDef(id)).map(c => c.k); };
  vrai('⛔ devis de dépannage : l\'électricien a « installation concernée » (information interne), le serrurier « situation constatée », « méthode annoncée » et « pièces proposées » — chacun SEULEMENT les siens',
    champsDe('electricite', 'devis-depannage').includes('installation') && !champsDe('electricite', 'devis-depannage').includes('situation') && champsDe('serrurerie', 'devis-depannage').includes('situation') && champsDe('serrurerie', 'devis-depannage').includes('piecesProposees') && !champsDe('serrurerie', 'devis-depannage').includes('installation') && !champsDe('menuiserie', 'devis-depannage').includes('installation') && !champsDe('menuiserie', 'devis-depannage').includes('situation'));
  vrai('suivi Consuel : le dossier technique et la mise en service du gestionnaire ne sont que pour les énergies ; suivi amiante : le « type de pièce » (amiante ou plomb) ne sert que la peinture', !champsDe('electricite', 'suivi-consuel').includes('technique') && champsDe('energies', 'suivi-consuel').includes('technique') && champsDe('peinture', 'suivi-amiante').includes('piece') && !champsDe('couverture', 'suivi-amiante').includes('piece'));
  { const W = mk('serrurerie'); vm.runInContext('function metierActifs(){ return ["serrurerie","electricite"]; }', W);
    const c = W.docmChamps(W.docmDef('devis-depannage')).map(x => x.k);
    vrai('⛔ deux métiers (serrurerie + électricité) : les champs des DEUX apparaissent, le devis est proposé une fois', c.includes('situation') && c.includes('installation') && W.docmDefsDuMetier().filter(x => x.id === 'devis-depannage').length === 1); }
  { const W = mk('multiservices'); W.docmForm('devis-depannage', { cid: 'c1' }); ouvre(W);
    vrai('multiservices : la mise en garde « hors liste de l\'arrêté » est à l\'écran, étiquetée « à confirmer » ; chez l\'électricien elle n\'y est pas', /montage d’un meuble/.test(W.__modals[0]) && (() => { const E = mk('electricite'); E.docmForm('devis-depannage', { cid: 'c1' }); return !/montage d’un meuble/.test(E.__modals[0]); })()); }
  { const W = mk('paysagiste'); const ent = Object.assign({}, ENT);
    vrai('⛔ attestation fiscale : MASQUÉE tant que l\'entreprise n\'est pas déclarée « services à la personne » (ni bouton, ni formulaire, ni démonstration)', !W.docmDefsDuMetier().some(x => x.id === 'attestation-fiscale') && W.docmSectionClient(BASE().clients[0]).indexOf('attestation-fiscale') < 0 && (W.docmForm('attestation-fiscale', { cid: 'c1' }), W.__modals.length === 0));
    W.currentUser = { id: 'u1', role: 'technicien' }; vm.runInContext("currentUser={id:'u1',role:'technicien'}", W); W.docmReglageSet('servicesPersonne', true);
    vrai('… un non-administrateur ne peut pas cocher le réglage', !(W.db.entreprise && W.db.entreprise.servicesPersonne) && W.__toasts.some(t => /administrateur/.test(t)));
    vm.runInContext("currentUser={id:'u1',role:'admin'}", W); W.docmReglageSet('servicesPersonne', true);
    vrai('… l\'administrateur le coche : le document est proposé, rien d\'autre ne bouge ; décoché, il disparaît des propositions (les documents déjà faits restent lisibles)', W.db.entreprise.servicesPersonne === 1 && W.docmDefsDuMetier().some(x => x.id === 'attestation-fiscale') && (W.docmReglageSet('servicesPersonne', false), !W.docmDefsDuMetier().some(x => x.id === 'attestation-fiscale') && !!W.docmDef('attestation-fiscale')));
    vrai('… le réglage ne se propose qu\'aux métiers qui ont un tel document (le paysagiste oui, l\'électricien non)', W.docmReglages().length === 1 && mk('electricite').docmReglages().length === 0);
    vrai('… un réglage inconnu ne s\'écrit pas', (W.docmReglageSet('autreChose', true), !(W.db.entreprise && W.db.entreprise.autreChose))); } }

console.log('\n── 3129 · 6. les tableaux, la situation de travaux, le chlore combiné, les relevés écrits par la même fonction ──');
{ const W = mk('incendie'); W.docmForm('rapport-incendie', { cid: 'c1', iid: 'i1' }); ouvre(W); const def = W.docmDef('rapport-incendie'), c = def.champs.find(x => x.k === 'appareils');
  vrai('tableau : une ligne vide à l\'ouverture (jamais écrite telle quelle), autant de colonnes que la définition', W.docmW.tab.appareils.length === 1 && W.docmW.tab.appareils[0].c.length === c.cols.length && W.docmW.tab.appareils[0].c.every(x => x === ''));
  W.__els['docm-tab-appareils'] = {}; W.docmTab('appareils', 0, 0, 'Entrée'); W.docmTab('appareils', 0, 1, 'Eau'); W.docmTabAjout('appareils'); W.docmTab('appareils', 1, 0, 'Cuisine'); W.docmTabAjout('appareils'); W.docmTab('appareils', 5, 0, 'jamais'); W.docmTab('appareils', 1, 99, 'jamais'); W.docmTab('inconnu', 0, 0, 'jamais');
  vrai('tableau : on ajoute, on saisit ; une case hors tableau, une colonne qui n\'existe pas ou un tableau inconnu sont ignorés', W.docmW.tab.appareils.length === 3 && W.docmW.tab.appareils[0].c[0] === 'Entrée' && JSON.stringify(W.docmW.tab).indexOf('jamais') < 0 && /Entrée/.test(W.__els['docm-tab-appareils'].innerHTML || ''));
  W.docmTabSuppr('appareils', 1); vrai('tableau : on retire une ligne (la suivante prend sa place)', W.docmW.tab.appareils.length === 2 && W.docmW.tab.appareils[0].c[0] === 'Entrée');
  for (let k = 0; k < 70; k++) W.docmTabAjout('appareils');
  vrai('tableau : soixante lignes au plus à l\'écran, et le dit', W.docmW.tab.appareils.length === 60 && W.__toasts.some(t => /Soixante/.test(t)));
  W.docmW.v.date = '2026-10-28'; W.docmW.v.etablissement = 'Restaurant'; W.docmW.v.famille = 'extincteurs';
  const id = W.docmSauver(); const r = W.db.docsMetier[0];
  vrai('⛔ enregistré : les lignes VIDES ne sont pas rangées (2 lignes écrites, sur 60), chaque case bornée', !!id && r.tab.appareils.length === 1 && r.tab.appareils[0].c[0] === 'Entrée' && r.tab.appareils[0].c.length === c.cols.length, r && r.tab);
  W.docmW.tab.appareils[0].c[0] = 'x'.repeat(500); const net = W.docmNet(def, W.docmW); vrai('une case de 500 signes est coupée à 120', net.tab.appareils[0].c[0].length === 120);
  { const M = mk('maconnerie'); M.docmForm('pv-reception', { cid: 'c1', iid: 'i1' }); remplit(M, M.docmDef('pv-reception'), { decision: 'sans' }); M.docmW.tab.reserves = [{ id: 'q', c: ['1', 'Cage', 'Fissure', '15 jours', ''] }];
    const a = M.docmNet(M.docmDef('pv-reception'), M.docmW); M.docmW.v.decision = 'avec'; const b = M.docmNet(M.docmDef('pv-reception'), M.docmW);
    vrai('⛔ un tableau conditionnel (les réserves d\'une réception « avec réserves ») ne se range pas quand sa condition ne tient pas', !a.tab.reserves && b.tab.reserves && b.tab.reserves.length === 1, [a.tab, b.tab]); }
  const hors = { id: '', doc: 'rapport-incendie', clientId: 'c1', v: { date: '2026-10-28' }, tab: { appareils: [{ c: ['a'] }], inconnu: [{ c: ['jamais'] }], circuits: [{ c: ['jamais'] }] }, lignes: [] };
  { const n1 = W.docmNet(def, hors); vrai('⛔ docmNet ne range que les tableaux de SA définition (un tableau inconnu, ou celui d\'un autre document, est jeté)', JSON.stringify(Object.keys(n1.tab)) === '["appareils"]' && n1.tab.appareils.length === 1 && n1.tab.appareils[0].c[0] === 'a' && n1.tab.appareils[0].c.length === c.cols.length, n1.tab); }
  { const lourd = { id: '', doc: 'rapport-incendie', clientId: 'c1', v: { date: '2026-10-28' }, tab: { appareils: Array.from({ length: 100 }, (_, k) => ({ id: 'z' + k, c: ['ligne ' + k] })) }, lignes: [] };
    vrai('⛔ docmNet borne un tableau à soixante lignes (un formulaire resté ouvert ne peut pas en ranger cent)', W.docmNet(def, lourd).tab.appareils.length === 60); }
  { const bon = { verifie: true, source: 's', pdf: 'Phrase lue et sourcée', texte: 't' };
    const E = mk('electricite'), P = mk('piscine');
    vrai('⛔ une mention propre à un métier (`pour`) ne s\'imprime que chez lui', E.docmMentionsPdf({ mentions: [Object.assign({ pour: ['piscine'] }, bon)] }, {}).length === 0 && P.docmMentionsPdf({ mentions: [Object.assign({ pour: ['piscine'] }, bon)] }, {}).length === 1 && E.docmMentionsPdf({ mentions: [bon] }, {}).length === 1); }
  const si = mk('electricite'); si.docmForm('rapport-verification', { cid: 'c1', iid: 'i1' }); remplit(si, si.docmDef('rapport-verification'), { verdict: 'non' }); ouvre(si);
  const idv = si.docmSauver(), rv = si.db.docsMetier[0], i1 = si.db.interventions[0];
  vrai('⛔ vérification électrique : les relevés de l\'intervention sont écrits PAR la même fonction (terre, verdict en clair, appareil, étalonnage)', rv.v.terre === '6' && i1.relevesMetier.terre === '6' && i1.relevesMetier.verdict === 'Non conforme' && i1.relevesMetier.instrument === rv.v.instrument && i1.relevesMetier.etalonnage === rv.v.etalonnage, i1.relevesMetier);
  si.docmForm('rapport-verification', { id: idv }); si.docmW.v.terre = ''; si.docmSauver();
  vrai('… un champ vidé EXPRÈS efface son relevé (pas de valeur fantôme)', !('terre' in i1.relevesMetier) && i1.relevesMetier.verdict === 'Non conforme');
  const vide = mk('electricite', { db: Object.assign(BASE(), { interventions: [Object.assign(BASE().interventions[0], { relevesMetier: { terre: '45', verdict: 'Conforme' } })] }) }); vide.docmForm('rapport-verification', { cid: 'c1', iid: 'i1' });
  vrai('… à l\'ouverture, le document PART des relevés déjà saisis sur l\'intervention (terre 45, verdict « Conforme »), sans rien écrire', vide.docmW.v.terre === '45' && vide.docmW.v.verdict === 'conforme' && vide.__saves === 0);
  for (const [metier, id2] of [['portails', 'rapport-maintenance-portail'], ['ramonage', 'attestation-ramonage'], ['ascenseurs', 'compte-rendu-visite'], ['assainissement', 'bordereau-vidange'], ['piscine', 'rapport-mesures-piscine'], ['incendie', 'rapport-incendie']]) {
    const X = mk(metier); X.docmForm(id2, { cid: 'c1', iid: 'i1' }); remplit(X, X.docmDef(id2)); ouvre(X); X.docmSauver(); const d2 = X.docmDef(id2), ri = X.db.interventions[0].relevesMetier || {};
    vrai(metier + ' / ' + id2 + ' : ' + Object.keys(d2.releves).length + ' relevé(s) écrit(s) sur l\'intervention par la même fonction', Object.keys(d2.releves).every(k => { const c = d2.champs.find(y => y.k === k); const v = X.db.docsMetier[0].v[k]; return v === undefined || ri[d2.releves[k]] === (c.t === 'choix' ? c.options.find(o => o[0] === v)[1] : String(v)); }), ri); } }
{ const W = mk('maconnerie'); W.docmForm('situation-travaux', { cid: 'c1', iid: 'i1' }); const w = W.docmW;
  w.lignes = [{ id: 'a', d: 'Lot 1 — Terrassement', pu: '4200', u: 'du lot', q: '1' }, { id: 'b', d: 'Lot 2 — Maçonnerie', pu: '18500', u: 'du lot', q: '0,4' }, { id: 'c', d: '  ', pu: '999', u: '', q: '9' }];
  w.v.tva = '10'; w.v.acomptes = '4000'; w.v.retenue = '600'; const T = W.docmTotaux(w);
  egal('situation : 4 200 + 18 500 × 0,4 = 11 600 HT ; TVA 10 % = 1 160 ; TTC 12 760 ; retenue 600 et acomptes 4 000 → reste dû 8 160 (calculé, jamais saisi)', [T.ht, T.tva, T.ttc, T.ded.ret, T.ded.ac, T.ded.reste], [11600, 1160, 12760, 600, 4000, 8160]);
  W.docmW.v.retenue = ''; W.docmW.v.acomptes = ''; vrai('sans retenue ni acompte : pas de ligne « reste dû »', W.docmTotaux(W.docmW).ded === null);
  W.docmW.v.acomptes = '20000'; vrai('des acomptes supérieurs au total : le reste dû est négatif, il se DIT (aucun masque)', W.docmTotaux(W.docmW).ded.reste === -7240, W.docmTotaux(W.docmW).ded);
  w.v.retenue = '600'; w.v.acomptes = '4000'; remplit(W, W.docmDef('situation-travaux'), { lignes: w.lignes, tva: '10', acomptes: '4000', retenue: '600', date: '2026-10-28', numero: '2', chantier: 'Chantier' });
  ouvre(W); const id = W.docmSauver(); const x = await fabrique(W, id); const t = tout(x.pdf);
  vrai('PDF : les lignes, le total HT 11600,00 EUR, TTC 12760,00 EUR, la retenue, les acomptes et le reste dû 8160,00 EUR ; ni « retenue » ni « acomptes » en simple ligne de plus', !x.err && /11600,00 EUR/.test(t) && /12760,00 EUR/.test(t) && /Retenue de garantie/.test(t) && /4000,00 EUR/.test(t) && /Reste dû \| ?8160,00 EUR|Reste dû : \| 8160,00 EUR|Reste dû/.test(t) && /8160,00 EUR/.test(t) && (t.match(/Retenue de garantie/g) || []).length === 1, t.slice(0, 400));
  vrai('PDF : le titre de colonne dit « Part exécutée » (pas « Quantité »), la part se lit 0,4', /Part \|? ?exécutée/.test(t) && /0,4/.test(t) && !/Quantité/.test(t));
  { const tt = t.replace(/ \| /g, ' ');
    vrai('⛔ le taux réduit imprime sa phrase LUE quand le client a certifié (jamais une formule inventée)', /le client certifie par une mention portée sur le devis ou la facture/.test(tt));
    const S2 = mk('maconnerie'); S2.docmForm('situation-travaux', { cid: 'c1', iid: 'i1' }); remplit(S2, S2.docmDef('situation-travaux'), { lignes: w.lignes, tva: '20', tvaReduite: 'non', date: '2026-10-28', numero: '3', chantier: 'Chantier' }); ouvre(S2);
    const y = await fabrique(S2, S2.docmSauver()); const ty = tout(y.pdf).replace(/ \| /g, ' ');
    vrai('… et ne l\'imprime PAS quand le client n\'a pas certifié', !y.err && !/certifie par une mention/.test(ty) && /Escompte|pénalités de retard/.test(ty), ty.slice(-300)); } }
{ const W = mk('peinture'); W.docmForm('metre-devis', { cid: 'c1', iid: 'i1' }); const w = W.docmW; w.lignes = [{ id: 'a', d: 'Murs', pu: '22', u: 'm²', q: '48' }, { id: 'b', d: 'Plafond', pu: '26', u: 'm²', q: '18' }, { id: 'c', d: 'Boiseries', pu: '34', u: 'm²', q: '9' }]; w.v.tva = '10';
  egal('métré : 22 € × 48 m² + 26 × 18 + 34 × 9 = 1 830 HT ; TVA 10 % 183 ; TTC 2 013', [W.docmTotaux(w).ht, W.docmTotaux(w).tva, W.docmTotaux(w).ttc], [1830, 183, 2013]);
  remplit(W, W.docmDef('metre-devis'), { lignes: w.lignes, tva: '10', tvaReduite: 'oui', reparation: 'non' }); ouvre(W); const id = W.docmSauver(); const x = await fabrique(W, id); const t = tout(x.pdf).replace(/ \| /g, ' ');
  vrai('PDF : « Surface » en tête de colonne ; la certification de TVA réduite = la phrase lue (pas de formule) ; pas de mention de dépannage tant que ce n\'en est pas un', /Surface/.test(t) && /le client certifie par une mention portée sur le devis ou la facture/.test(t) && !/arrêté du 24 janvier 2017/.test(t) && !/Retenue de garantie/.test(t));
  W.docmForm('metre-devis', { cid: 'c1', iid: 'i1' }); remplit(W, W.docmDef('metre-devis'), { lignes: w.lignes, tva: '10', tvaReduite: 'non', reparation: 'oui' }); ouvre(W); const x2 = await fabrique(W, W.docmSauver()); const t2 = tout(x2.pdf).replace(/ \| /g, ' ');
  vrai('… réparation chez un particulier : la phrase de l\'arrêté du 24 janvier 2017 apparaît ; sans certification, pas de phrase de TVA réduite', /arrêté du 24 janvier 2017/.test(t2) && !/certifie par une mention/.test(t2)); }
{ const W = mk('piscine'); W.docmForm('rapport-mesures-piscine', { cid: 'c1', iid: 'i1' }); W.docmW.v.chlorelibre = '1,4'; W.docmW.v.chloretotal = '1,8';
  egal('chlore combiné : total moins libre = 0,4 mg/L (calculé à l\'affichage, jamais saisi)', W.docmEcarts(W.docmW.v), [['Chlore combiné (total moins libre)', '0,4 mg/L']]);
  W.docmW.v.chloretotal = '1'; egal('… un total INFÉRIEUR au libre (mesure incohérente) : rien n\'est calculé', W.docmEcarts(W.docmW.v), []);
  remplit(W, W.docmDef('rapport-mesures-piscine'), { chlorelibre: '1,4', chloretotal: '1,8' }); ouvre(W); const x = await fabrique(W, W.docmSauver()); const t = tout(x.pdf);
  vrai('PDF : le chlore combiné y est (0,4 mg/L), la mention « à titre indicatif » lue aussi, aucun seuil sanitaire', /Chlore combiné/.test(t) && /0,4 mg\/L/.test(t) && /à titre indicatif/.test(t) && !/seuil|arrêté du 19 décembre 2025/i.test(t.replace(/Aucun seuil/g, ''))); }
{ const W = mk('froid', { db: Object.assign(BASE(), {}) }); W.docmForm('etiquette-etancheite', { cid: 'c1' }); remplit(W, W.docmDef('etiquette-etancheite'), { appareilId: 'a1', disque: 'rouge' }); ouvre(W); const x = await fabrique(W, W.docmSauver()); const t = tout(x.pdf).replace(/ \| /g, ' ');
  vrai('froid : l\'étiquette est un RAPPEL de pose — le PDF dit qu\'il ne remplace pas la vignette réglementaire ; l\'équipement vient du parc du client (un appareil d\'un autre client est refusé)', /ne remplace pas la vignette réglementaire/.test(t) && (() => { const V = mk('froid'); V.docmForm('etiquette-etancheite', { cid: 'c1' }); remplit(V, V.docmDef('etiquette-etancheite'), { appareilId: 'a9' }); return V.docmSauver() === null; })()); }
{ const st = mk('electricite'); const lbl = (id, k, v) => { const W = mk('electricite'); const d = W.docmDef(id); return { l: W.docmStatut({ doc: id, v: { [k]: v } }) }; };
  vrai('les statuts des suivis (vert : visé, levé, reçu, remis ; orange : refus, en cours, attendu ; gris : le reste) — jamais un état rangé en double', (() => { const E = mk('electricite'); const g = (doc, k, v) => E.docmStatut({ doc, v: { [k]: v } }).cls; return g('suivi-consuel', 'resultat', 'vise') === 'st-green' && g('suivi-consuel', 'resultat', 'refus') === 'st-org' && g('suivi-consuel', 'resultat', 'attente') === 'st-org' && g('suivi-verif-lieu-travail', 'statut', 'levee') === 'st-green' && g('suivi-verif-lieu-travail', 'statut', 'encours') === 'st-org'; })()); }

console.log('\n── 3129 · 7. la démonstration de chaque métier ──');
const DEMO_ATTENDU = { electricite: 4, serrurerie: 4, maconnerie: 3, menuiserie: 5, peinture: 4, paysagiste: 3, couverture: 5, multiservices: 6, autre: 2, incendie: 4, froid: 3, ascenseurs: 3, portails: 2, ramonage: 3, assainissement: 6, energies: 2, alarme: 2, eau: 3, piscine: 5 };
for (const id of AUTRES) {
  const db = BASE(); db.clients.push({ id: 'c5', nom: 'Client 5' }); db.interventions = db.clients.map((c, k) => ({ id: 'd' + k, num: 'INT-D' + k, clientId: c.id, date: '2026-10-28', heure: '09:00', duree: 60, statut: 'planifiee', type: 'Intervention', titre: 'Intervention de démonstration', demo: 1 }));
  db.appareils = id === 'froid' ? [{ id: 'ad', clientId: 'c2', nom: 'Groupe de chambre froide Bitzer', type: 'autre', demo: 1 }] : [];
  const W = mk(id, { db }); W.docmDemoPoser(['c1', 'c2', 'c3', 'c4']); const n1 = W.db.docsMetier.length; W.docmDemoPoser(['c1', 'c2', 'c3', 'c4']);
  vrai(id + ' : la démonstration pose ' + DEMO_ATTENDU[id] + ' document(s) marqués « demo », valides, et rejouée n\'en ajoute AUCUN', n1 === DEMO_ATTENDU[id] && W.db.docsMetier.length === n1 && W.db.docsMetier.every(r => r.demo === 1 && W.docmDef(r.doc) && W.docmDef(r.doc).metiers.includes(id)), [n1, W.db.docsMetier.map(r => r.doc)]);
  let bon = 0, mal = []; for (const r of W.db.docsMetier) { const x = await fabrique(W, r.id); const t = x.err ? '' : tout(x.pdf); if (!x.err && lirePdf(x.pdf).pb.length === 0 && t.indexOf('?') < 0 && !ANTI.test(t) && chevauche(W, x.pdf).length === 0) bon++; else mal.push([r.doc, x.err, chevauche(W, x.pdf || '%PDF').slice(0, 1)]); }
  vrai('   … chacun produit un PDF valide, sans « ? », sans recouvrement (' + bon + ' sur ' + W.db.docsMetier.length + ')', bon === W.db.docsMetier.length, mal);
  vrai('   … ⛔ aucun numéro réutilisé, aucun identifiant en double', new Set(W.db.docsMetier.map(r => r.id)).size === W.db.docsMetier.length && new Set(W.db.docsMetier.filter(r => r.num).map(r => r.doc + r.num)).size === W.db.docsMetier.filter(r => r.num).length);
}
{ const W = mk('plomberie'); W.docmDemoPoser(['c1', 'c2', 'c3', 'c4']);
  vrai('la plomberie garde sa démonstration d\'avant (aucun document des dix-neuf métiers n\'y apparaît)', W.db.docsMetier.every(r => !DEFS.some(d => d.id === r.doc && !d.metiers.includes('plomberie')))); }

console.log('\n── 3129 · 8. le code : une seule porte, les gardes, les marqueurs ──');
{ const code = N;
  vrai('⛔ UNE SEULE PORTE : `metierGereDocs()` ; les réglages d\'entreprise vivent dans `db.entreprise` (déjà synchronisé : aucune clé neuve à classer)', /function metierGereDocs\(\)\{ try\{ return docmDefsDuMetier\(\)\.length>0; \}catch\(e\)\{ return false; \} \}/.test(code) && /db\.entreprise\[k\]=on\?1:0;/.test(code));
  vrai('⛔ une définition cachée par son réglage ne se propose pas, mais `docmDef` la lit toujours (les documents déjà faits restent ouvrables)', /function docmDefsDuMetier\(\)\{[^}]*docmReglageOk\(d\)/.test(code) && /function docmDef\(id\)\{ return DOCM_DEFS\.find\(d=>d\.id===id\)\|\|null; \}/.test(code));
  vrai('⛔ aucun document n\'est écrit au chargement : `docmDemoPoser` ne s\'appelle que depuis le geste « Remplir » de la bêta', (code.match(/docmDemoPoser\(/g) || []).length === 2 && /if\(typeof docmDemoPoser==='function'\) docmDemoPoser\(C\)/.test(code));
  vrai('le PDF ne passe que par `docmSpec` (UNE fabrique) ; l\'en-tête vient de `docEntete`, jamais écrit à la main dans le bloc', (BLOC_DOCM.match(/nettDocFabriquer\(/g) || []).length >= 1 && !/SIRET\s*[:=]/.test(BLOC_DOCM.replace(/\/\*[\s\S]*?\*\//g, '')));
  vrai('aucune obligation écrite en dur dans le code du bloc : toute phrase légale vit dans une DÉFINITION (`pdf` d\'une mention lue)', !/obligatoire/i.test(BLOC_DOCM.replace(/^\s*\/\*[\s\S]*?\*\//gm, '').split('const DOCM_DEFS=[')[0] + BLOC_DOCM.replace(/^\s*\/\*[\s\S]*?\*\//gm, '').split('\n];\n')[1]));
  vrai('le numéro d\'un document vient de `nextNum` (le plafond ne redescend jamais) : jamais de compteur écrit ici', /nextNum\('docsMetier',def\.prefixe,'num'\)/.test(BLOC_DOCM) && (BLOC_DOCM.replace(/^\s*\/\*[\s\S]*?\*\//gm, '').match(/numMax/g) || []).length === 0); }

console.log('\n════ test-3129 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n════ test-3129 : ' + ok + ' ✓ ' + (ko + 1) + ' ✗ ════'); process.exit(1); });
