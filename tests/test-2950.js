/* ══ test-2950 · LES 23 MÉTIERS DE L'APPLICATION SONT CEUX DU RÉFÉRENTIEL — UNE VÉRITÉ, DEUX COPIES TENUES ÉGALES ═══════════════
   23 octobre 2026 (Justin : « je veux que tu fasses bien OP GESTION en fonction des packs métiers qu'on propose »).
   Le référentiel UNIQUE (metiers.json, à la racine — il n'y a plus de seconde copie dans design/) dit, pour chaque métier, ses rubriques conseillées, ses types d'intervention,
   ses prestations, ses relevés, ses catégories de produits et ses documents ; pour chaque rubrique, un titre et une explication.
   L'application marche hors ligne : elle en embarque une copie, ÉCRITE PAR UNE MACHINE (scripts/metiers-generer.js). Ce banc
   relit les DEUX et exige qu'elles disent la même chose — dans app.html comme dans beta.html — et il EXÉCUTE les vraies
   fonctions (metierPackDe, metierId, intTypes, metierBloque, metierSet, metierServeurAppliquer) pour chacun des 23 métiers.
   Ce qu'il ne doit pas laisser passer :
   · une table qui dérive à la main (un type ajouté dans app.html et pas dans le référentiel, ou l'inverse) ;
   · la 3D d'ELAN qui change : types, prestations, relevés et catégories restent EXACTEMENT ce qu'ils étaient (les deux types
     que le référentiel propose pour la 3D ne sont PAS repris — écart NOMMÉ ci-dessous, l'adopter est une décision de Justin) ;
   · un pack qui ouvre ce que seule la 3D ouvre (registre, box, devis xylophage, consommation, enveloppes) ;
   · une rubrique conseillée qui n'existe pas dans le menu, ou une rubrique du menu sans explication.
   Population comptée avant chaque absence : « rien ne diffère » sur 0 métier passerait au vert sur du néant.                   */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/* un littéral (objet ou tableau) qui suit une déclaration, borné par ses crochets — chaînes et commentaires sautés */
function litteral(src, debut) {
  const d0 = src.indexOf(debut); if (d0 < 0) return '';
  const o = src.indexOf(debut.trim().slice(-1) === '[' ? '[' : '{', d0 + debut.length - 1);
  const ouv = src[o], ferm = ouv === '[' ? ']' : '}';
  let prof = 0, q = null, k = o;
  for (; k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && src[k + 1] === '/') { const n = src.indexOf('\n', k); k = n < 0 ? src.length : n; continue; }
    if (c === ouv) prof++; else if (c === ferm) { prof--; if (!prof) break; }
  }
  return src.slice(o, k + 1);
}
function fonction(src, nom) {
  const m = new RegExp('(^|\\n)[ \\t]*function ' + nom + '\\(').exec(src); if (!m) return '';
  const d0 = src.indexOf('function ' + nom + '(', m.index);
  let k = src.indexOf('{', src.indexOf(')', d0)), prof = 0, q = null;
  for (; k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && src[k + 1] === '/') { const n = src.indexOf('\n', k); k = n < 0 ? src.length : n; continue; }
    if (c === '/' && src[k + 1] === '*') { const n = src.indexOf('*/', k + 2); k = n < 0 ? src.length : n + 1; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return src.slice(d0, k + 1);
}
const evalue = txt => vm.runInNewContext('(' + txt + ')');

const REF = JSON.parse(fs.readFileSync(path.join(RACINE, 'metiers.json'), 'utf8'));
/* la bêta précède le public sur UN titre (« Validation des mouvements ») : l'écart est déclaré dans tests/beta-en-avance.js, et seulement là */
const { libellePublic, LIBELLES } = require('./beta-en-avance.js');

/* ── ÉCARTS NOMMÉS (chacun est une décision, pas un oubli) ───────────────────────────────────────────────────────────────── */
/* La 3D d'ELAN ne change pas d'un mot : ces deux types, que le référentiel propose pour la 3D, ne sont PAS dans INT_TYPES. */
const TYPES_3D_NON_REPRIS = ['Désinfection de locaux', 'Audit hygiène et plan de lutte (HACCP)'];
/* Les rubriques que seule la 3D ouvre. */
const MASQUE_HORS_3D = ['registre', 'carteBox', 'devisXylo', 'boxes', 'saisieConso', 'enveloppes'];

function lire(fichier) {
  const SRC = fs.readFileSync(path.join(RACINE, fichier), 'utf8'), N = nu(SRC);
  return { SRC, N, METIERS: evalue(litteral(N, 'const METIERS={')), ORDRE: evalue(litteral(N, 'const METIERS_ORDRE=[')), INFO: evalue(litteral(N, 'const RUBRIQUES_INFO={')),
    INT_TYPES: evalue(litteral(N, 'const INT_TYPES = [')), CAT_LIST: evalue(litteral(N, 'const CAT_LIST=[')), NAV: evalue(litteral(N, 'const NAV = [')) };
}

console.log('\n── 2900 · les 23 métiers de l\'application sont ceux du référentiel ──');
console.log('\n1. Le référentiel');
vrai('(population) 23 métiers, 42 rubriques, dans l\'ordre du référentiel', REF.ordreMetiers.length === 23 && Object.keys(REF.rubriques).length === 42 && REF.ordreMetiers.every(k => REF.metiers[k]), REF.ordreMetiers.length);
egal('les treize métiers d\'avant restent en tête, dans leur ordre', REF.ordreMetiers.slice(0, 13), ['3d', 'plomberie', 'electricite', 'chauffage', 'serrurerie', 'nettoyage', 'maconnerie', 'menuiserie', 'peinture', 'paysagiste', 'couverture', 'multiservices', 'autre']);
egal('les dix nouveaux, dans l\'ordre de la recherche', REF.ordreMetiers.slice(13), ['incendie', 'froid', 'ascenseurs', 'portails', 'ramonage', 'assainissement', 'energies', 'alarme', 'eau', 'piscine']);

for (const fichier of ['app.html', 'beta.html']) {
  console.log('\n2. ' + fichier + ' — la copie embarquée dit la même chose');
  const A = lire(fichier);
  vrai('(population) ' + fichier + ' : METIERS, METIERS_ORDRE, RUBRIQUES_INFO, INT_TYPES, CAT_LIST et NAV se lisent dans le CODE', Object.keys(A.METIERS).length === 23 && A.ORDRE.length === 23 && Object.keys(A.INFO).length === 42 && A.INT_TYPES.length > 10 && A.CAT_LIST.length === 8 && A.NAV.length > 5);
  egal('METIERS_ORDRE = l\'ordre du référentiel', A.ORDRE, REF.ordreMetiers);
  egal('les clés de METIERS sont celles de METIERS_ORDRE, dans le même ordre', Object.keys(A.METIERS), A.ORDRE);
  const navCles = A.NAV.flatMap(g => g.items).map(it => it.k);
  const navLib = {}; A.NAV.forEach(g => g.items.forEach(it => { navLib[it.k] = it.l; }));
  const diffs = { identite: [], rubriques: [], types: [], presta: [], releves: [], produits: [], documents: [], masque: [] };
  for (const k of REF.ordreMetiers) {
    const r = REF.metiers[k], m = A.METIERS[k], est3d = k === '3d';
    if (!m) { diffs.identite.push(k + ' (absent)'); continue; }
    if (m.nom !== r.nom || m.ic !== r.ic || m.sous !== r.sous) diffs.identite.push(k);
    if (JSON.stringify(m.rubriques) !== JSON.stringify(r.rubriques)) diffs.rubriques.push(k);
    if (est3d) {
      /* la 3D : types → INT_TYPES (moins les deux écarts nommés), prestations et relevés → le diagnostic nuisibles, produits → CAT_LIST */
      if (m.types !== null || JSON.stringify(A.INT_TYPES) !== JSON.stringify(r.types.filter(t => TYPES_3D_NON_REPRIS.indexOf(t) < 0))) diffs.types.push(k);
      if (m.presta !== null || r.presta.length) diffs.presta.push(k);
      if (m.releves !== null || r.releves.length) diffs.releves.push(k);
      if (m.produits !== null || JSON.stringify(A.CAT_LIST) !== JSON.stringify(r.produits)) diffs.produits.push(k);
    } else {
      if (JSON.stringify(m.types) !== JSON.stringify(r.types)) diffs.types.push(k);
      if (JSON.stringify(m.presta) !== JSON.stringify(r.presta)) diffs.presta.push(k);
      if (JSON.stringify(m.releves) !== JSON.stringify(r.releves.map(x => Object.assign({ k: x.k, l: x.l, u: x.u || '' }, x.txt ? { txt: true } : {})))) diffs.releves.push(k);
      if (JSON.stringify(m.produits) !== JSON.stringify(r.produits)) diffs.produits.push(k);
    }
    if (JSON.stringify(m.documents) !== JSON.stringify(r.documents || [])) diffs.documents.push(k);
    if (JSON.stringify(m.masque) !== JSON.stringify(est3d ? [] : MASQUE_HORS_3D)) diffs.masque.push(k);
  }
  for (const f of Object.keys(diffs)) egal('⛔ ' + f + ' : aucun des 23 métiers ne diffère du référentiel', diffs[f], []);
  /* les écarts nommés se prouvent des DEUX côtés : sinon un écart « nommé » que plus rien n'impose passerait pour une décision */
  vrai('   (écart nommé) la 3D ne reprend PAS ' + TYPES_3D_NON_REPRIS.length + ' types : « ' + TYPES_3D_NON_REPRIS.join(' », « ') + ' » ne sont pas dans INT_TYPES, et le référentiel les propose bien',
    TYPES_3D_NON_REPRIS.every(t => A.INT_TYPES.indexOf(t) < 0 && REF.metiers['3d'].types.indexOf(t) >= 0));

  console.log('\n3. ' + fichier + ' — la cohérence interne de chaque pack');
  const incoherences = [];
  for (const k of A.ORDRE) {
    const m = A.METIERS[k];
    m.rubriques.forEach(c => { if (navCles.indexOf(c) < 0 && c !== 'parametres') incoherences.push(k + ' : rubrique « ' + c + ' » absente du menu'); });
    if (new Set(m.rubriques).size !== m.rubriques.length) incoherences.push(k + ' : rubrique en double');
    ['dashboard', 'utilisateurs', 'modulesElan', 'parametres'].forEach(c => { if (m.rubriques.indexOf(c) < 0) incoherences.push(k + ' : « ' + c + ' » (toujours ouverte) manque'); });
    if (k !== '3d') {
      MASQUE_HORS_3D.forEach(c => { if (m.rubriques.indexOf(c) >= 0) incoherences.push(k + ' conseille « ' + c + ' », que son masque ferme'); });
      if (new Set(m.releves.map(x => x.k)).size !== m.releves.length) incoherences.push(k + ' : deux relevés de même clé');
      if (new Set(m.types).size !== m.types.length) incoherences.push(k + ' : type en double');
      if (new Set(m.produits).size !== m.produits.length) incoherences.push(k + ' : catégorie de produits en double');
      if (m.types.length < 8 || m.presta.length < 5 || m.releves.length < 2 || m.produits.length < 4) incoherences.push(k + ' : pack trop maigre');
      if (/dératis|désinsect|xylophag|nuisible|rongeur|cafard|punaise|termite|biocide|certibiocide|\bTP ?1[48]\b/i.test([m.nom, m.sous].concat(m.types, m.presta, m.releves.map(x => x.l), m.produits, m.documents).join(' | '))) incoherences.push(k + ' parle de nuisibles');
    }
  }
  egal('⛔ aucun pack ne se contredit (rubrique inconnue, masque ouvert, relevé en double, pack maigre, nuisibles hors 3D)', incoherences, []);
  vrai('   la 3D conseille tout ce que les autres masquent (le registre, les box, le devis xylophage…)', MASQUE_HORS_3D.every(c => A.METIERS['3d'].rubriques.indexOf(c) >= 0));
  vrai('   (population) la 3D garde ses 8 catégories historiques et ses 16 types : rien n\'a bougé pour ELAN', A.CAT_LIST.length === 8 && A.INT_TYPES.length === 16 && A.METIERS['3d'].types === null && A.METIERS['3d'].produits === null);

  console.log('\n4. ' + fichier + ' — les rubriques : un titre et une explication pour chacune');
  egal('RUBRIQUES_INFO a les clés du référentiel, dans le même ordre', Object.keys(A.INFO), Object.keys(REF.rubriques));
  egal('⛔ chaque titre et chaque explication est celle du référentiel (mot pour mot)', Object.keys(REF.rubriques).filter(k => !A.INFO[k] || libellePublic(k, A.INFO[k][0]) !== REF.rubriques[k].titre || A.INFO[k][1] !== REF.rubriques[k].explication || !!A.INFO[k][2] !== !!REF.rubriques[k].toujours), []);
  const sansInfo = navCles.filter(k => !A.INFO[k]);
  /* « Produits donnés » n'est pas au menu : c'est une sous-catégorie de Boxes (SOUS_CATS), donc elle n'est pas dans NAV */
  egal('chaque rubrique du MENU a son explication', sansInfo, []);
  egal('le titre d\'une rubrique est le libellé du menu (le client lit le même mot dans les deux)', navCles.filter(k => A.INFO[k] && A.INFO[k][0] !== navLib[k]), []);
  vrai('   (population) il y a de quoi comparer : ' + navCles.length + ' rubriques au menu', navCles.length >= 38);
  egal('aucune explication ne porte une consigne interne (« il doit devenir… », « Aujourd\'hui », « Réservé à la 3D pour l\'instant » est permis, une parenthèse de chantier non)',
    Object.keys(A.INFO).filter(k => /il doit devenir|Le menu s'appelle/i.test(A.INFO[k][1])), []);
}

console.log('\n5. Le générateur : app.html est à jour, et beta.html en porte la même copie');
const gen = cp.spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'metiers-generer.js'), '--verifier'], { encoding: 'utf8' });
vrai('node scripts/metiers-generer.js --verifier → app.html est à jour avec le référentiel (sinon : relancer le script)', gen.status === 0, (gen.stdout + gen.stderr).trim());
const a1 = lire('app.html'), b1 = lire('beta.html');
egal('beta.html porte les mêmes METIERS, METIERS_ORDRE et RUBRIQUES_INFO qu\'app.html (beta-build.js les recopie)', [b1.METIERS, b1.ORDRE, b1.INFO], [a1.METIERS, a1.ORDRE, a1.INFO]);
/* UNE SEULE SOURCE : l'ancienne copie du référentiel (design/) a été supprimée — deux copies d'un même fichier divergent toujours */
vrai('il n\'existe pas de seconde copie du référentiel (design/metiers-referentiel.json supprimé)', !fs.existsSync(path.join(RACINE, 'design', 'metiers-referentiel.json')));
vrai('(population) l\'écart déclaré de titre est bien celui d\'app.html : ' + Object.keys(LIBELLES).join(', '), Object.keys(LIBELLES).every(k => a1.INFO[k] && a1.INFO[k][0] === LIBELLES[k].beta && REF.rubriques[k].titre === LIBELLES[k].public));

console.log('\n6. Les vraies fonctions, jouées pour chacun des 23 métiers');
{
  const A = a1, N = A.N;
  const NOMS = ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'intTypes', 'metierBloque', 'metierSet', 'metierServeurAppliquer',
    /* v779 : la liste effective des métiers et le pack combiné (un seul métier rend toujours l'objet d'avant) */
    'metiersActifsDe', 'metiersActifs', 'metiersAssocies', '_packListe', '_releveMeme', 'metierPackCombine', '_cleNom'];
  const FN = NOMS.map(n => fonction(N, n));
  vrai('(population) les quinze fonctions sont trouvées dans le fichier réel', FN.every(Boolean), NOMS.filter((n, i) => !FN[i]).join(', '));
  const monter = (beta, base) => {
    const vu = { saves: 0, journal: [], toasts: [] };
    const code = 'const BETA_ESSAI=' + (beta ? 'true' : 'false') + '; let db=' + JSON.stringify(base || {}) + '; let currentUser={role:"admin"}; let current="dashboard";\n'
      + 'const METIERS=' + litteral(N, 'const METIERS={') + ';\nconst INT_TYPES=' + litteral(N, 'const INT_TYPES = [') + ';\nconst CAT_LIST=' + litteral(N, 'const CAT_LIST=[') + ';\nconst METIERS_ORDRE=' + litteral(N, 'const METIERS_ORDRE=[') + ';\nconst METIERS_ASSOC_MAX=4, _packsCombines=new Map(), norm=s=>(s||"").toLowerCase();\n' + FN.join('\n')
      + '\nreturn { metierPackDe, metierId, metierPack, estMetier3D, intTypes, metierBloque, metierSet, appliquer: metierServeurAppliquer, db: () => db };';
    const f = new Function('save', 'logEvent', 'toast', 'toastAnnuler', 'views', 'renderNav', 'go', code);
    const a = f(() => { vu.saves++; }, (t, d) => { vu.journal.push(t + ' · ' + d); }, m => { vu.toasts.push(m); }, m => { vu.toasts.push(m); }, { parametres: () => {} }, () => {}, () => {});
    a.vu = vu; return a;
  };
  const rate = { pack: [], id: [], types: [], masque: [], set: [], serveur: [] };
  for (const k of REF.ordreMetiers) {
    const a = monter(false, { metier: k }), r = REF.metiers[k];
    if (a.metierPackDe({ metier: k }).nom !== r.nom) rate.pack.push(k);
    if (a.metierId() !== k || a.estMetier3D() !== (k === '3d')) rate.id.push(k);
    const attendus = k === '3d' ? A.INT_TYPES : r.types;
    if (JSON.stringify(a.intTypes()) !== JSON.stringify(attendus)) rate.types.push(k);
    /* hors bêta, un pack hors 3D ferme les six rubriques de la 3D ; la 3D n'en ferme aucune */
    if (MASQUE_HORS_3D.some(c => a.metierBloque(c) !== (k !== '3d')) || a.metierBloque('clients')) rate.masque.push(k);
    /* l'administrateur change de métier : db.metier suit, une ligne de journal, un enregistrement */
    const b = monter(false, { metier: k === 'piscine' ? 'eau' : 'piscine' }); b.metierSet(k);
    if (b.db().metier !== k || b.vu.saves !== 1 || !b.vu.journal.some(l => l.indexOf(r.nom) >= 0)) rate.set.push(k);
    /* TEAM OP règle le métier : il entre dans la base, une fois */
    const c = monter(false, {}); const fait = c.appliquer({ metier: k }), refait = c.appliquer({ metier: k });
    if (!fait || refait || c.db().metier !== k || c.vu.saves !== 1) rate.serveur.push(k);
  }
  for (const f of Object.keys(rate)) egal('⛔ ' + { pack: 'metierPackDe rend le pack du métier', id: 'metierId / estMetier3D', types: 'intTypes rend les types du pack (la 3D : INT_TYPES)', masque: 'metierBloque ferme les six rubriques de la 3D hors 3D, aucune dans la 3D', set: 'metierSet bascule sur ce métier (un save, une ligne de journal)', serveur: 'metierServeurAppliquer accepte le métier une fois, la seconde fois ne fait rien' }[f] + ' — pour les 23', rate[f], []);
  const beta = monter(true, { metier: 'plomberie' });
  /* v778 : la bêta voit toute la 3D (son outil de travail) ; un métier AUTRE choisi par « Tester un métier » applique son masque, comme chez un client */
  vrai('   la bêta, métier 3D : metierBloque rend faux (la bêta voit tout en 3D)', MASQUE_HORS_3D.every(c => monter(true, { metier: '3d' }).metierBloque(c) === false));
  vrai('   la bêta, métier plomberie : le masque du métier s\'applique (v778)', MASQUE_HORS_3D.every(c => beta.metierBloque(c) === true));
  const X = monter(false, {});
  egal('⛔ une valeur étrangère n\'entre jamais (hors liste, propriété héritée, pas une chaîne)', ['boulangerie', '__proto__', 'toString', 'constructor', 42, null, 'Piscine'].map(m => X.appliquer({ metier: m })), [false, false, false, false, false, false, false]);
  egal('   un métier inconnu ou absent retombe sur la 3D, comme avant (les entreprises d\'avant le choix du métier)', [X.metierId(), monter(false, { metier: 'boulangerie' }).metierId(), X.metierPackDe({}).nom], ['3d', '3d', REF.metiers['3d'].nom]);
}

console.log('\n── 2900 : ' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
