#!/usr/bin/env node
/* Écrit dans app.html les TABLES DES MÉTIERS, depuis le référentiel UNIQUE (metiers.json, à la racine).

   ⛔ UNE SEULE SOURCE, UNE COPIE EMBARQUÉE. `metiers.json` est le référentiel de tout le monde : le serveur (`server/metiers.js`),
   la Tour, l'espace client, la page de paiement et le site le lisent ; l'ancienne copie `design/metiers-referentiel.json` n'existe
   plus (23 octobre 2026) — deux copies d'un même référentiel divergent toujours. Il dit, pour chacun des 23 métiers, ses rubriques
   conseillées, ses types d'intervention, ses prestations, ses relevés, ses catégories de produits et ses documents ; et, pour
   chaque rubrique du menu, un titre et une explication. L'application doit marcher HORS LIGNE : elle embarque donc une copie,
   écrite ICI par une machine, jamais à la main — `tests/test-2950.js` relit le référentiel ET l'application et exige qu'ils
   disent la même chose, rubrique par rubrique.
   ⛔ UN SEUL ÉCART, DÉCLARÉ : le référentiel dit ce que fait la version PUBLIQUE ; l'app.html de la bêta peut la précéder. Le titre
   d'une rubrique dont le libellé de menu est en avance (« Validation des mouvements » au lieu de « Validations DR ») vient de
   `tests/beta-en-avance.js` (`libelles`) — l'endroit unique où ces écarts se déclarent. Le jour de la publication la déclaration
   se vide, et ce script écrit alors le titre public tel que le dit `metiers.json`. Si le titre PUBLIC du référentiel n'est plus celui
   que la déclaration annonce, le script s'arrête : la déclaration est périmée.

   Ce qui est généré (entre les deux lignes-repères d'app.html) : `METIERS`, `METIERS_ORDRE`, `RUBRIQUES_INFO`.
   Ce qui NE l'est PAS, parce que c'est une décision de produit et pas une donnée du référentiel :
   · le pack 3D reste ce qu'il est (types: null → INT_TYPES, presta/releves: null → diagnostic nuisibles, produits: null →
     CAT_LIST). Les deux types que le référentiel y ajoute (« Désinfection de locaux », « Audit hygiène… ») ne sont PAS repris :
     la 3D d'ELAN ne change pas d'un mot (le banc nomme cet écart) ;
   · le `masque` : les rubriques que seule la 3D ouvre (MASQUE_HORS_3D) ;
   · le catalogue et les fournisseurs de la 3D, rattachés plus bas dans app.html.

   Usage :  node scripts/metiers-generer.js            écrit app.html
            node scripts/metiers-generer.js --verifier  rend 1 si app.html n'est pas à jour (sans l'écrire)          */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const REFERENTIEL = path.join(RACINE, 'metiers.json');
const { LIBELLES } = require(path.join(RACINE, 'tests', 'beta-en-avance.js'));
const APP = path.join(RACINE, 'app.html');
const DEBUT = '// ⟦METIERS:DEBUT⟧ — GÉNÉRÉ par scripts/metiers-generer.js depuis metiers.json. NE PAS ÉDITER ICI : on corrige le référentiel, puis on relance le script.';
const FIN = '// ⟦METIERS:FIN⟧';

/* Les rubriques que seule la 3D ouvre. `saisieConso` et `enveloppes` (la consommation box par box, les encaissements rangés avec
   le stock des box) y sont depuis le 23 octobre 2026 : le référentiel les dit « réservées à la 3D », et aucun autre métier n'a de
   box. La bêta voit tout (`metierBloque` rend faux quand BETA_ESSAI). */
const MASQUE_HORS_3D = ['registre', 'carteBox', 'devisXylo', 'boxes', 'saisieConso', 'enveloppes'];

/* le titre d'une rubrique tel qu'app.html l'écrit : celui du référentiel, sauf l'écart déclaré (la bêta précède le public) */
function titreApp(k, r) {
  if (!Object.prototype.hasOwnProperty.call(LIBELLES, k)) return r.titre;
  if (r.titre !== LIBELLES[k].public) { console.error('ÉCHEC : metiers.json titre « ' + k + ' » « ' + r.titre + ' », la déclaration (tests/beta-en-avance.js) annonce « ' + LIBELLES[k].public + ' » : elle est périmée'); process.exit(3); }
  return LIBELLES[k].beta;
}

const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const COL = 118;
/* un tableau de chaînes, replié à COL colonnes, chaque ligne indentée de `ind` espaces */
function tableau(items, ind) {
  const pad = ' '.repeat(ind), lignes = []; let cur = '';
  items.forEach((x, i) => {
    const t = x + (i < items.length - 1 ? ',' : '');
    if (cur && (pad + cur + ' ' + t).length > COL) { lignes.push(pad + cur); cur = t; } else cur = cur ? cur + ' ' + t : t;
  });
  if (cur) lignes.push(pad + cur);
  return lignes.join('\n');
}
const chaines = (a, ind) => '[\n' + tableau(a.map(q), ind + 2) + '\n' + ' '.repeat(ind) + ']';
function releve(r) { return '{k:' + q(r.k) + ',l:' + q(r.l) + ',u:' + q(r.u || '') + (r.txt ? ',txt:true' : '') + '}'; }

function fabriquer(ref) {
  const L = [];
  const ordre = ref.ordreMetiers;
  L.push(DEBUT);
  L.push('const METIERS={');
  ordre.forEach((k, ix) => {
    const m = ref.metiers[k], est3d = k === '3d', fin = ix === ordre.length - 1 ? '' : ',';
    L.push("  " + q(k) + ":{ nom:" + q(m.nom) + ", ic:" + q(m.ic) + ", sous:" + q(m.sous) + ",");
    if (est3d) L.push('    complet:true,');
    L.push('    rubriques:' + chaines(m.rubriques, 4) + ',');
    if (est3d) {
      L.push('    types:null, presta:null, releves:null, produits:null,');
    } else {
      L.push('    types:' + chaines(m.types, 4) + ',');
      L.push('    presta:' + chaines(m.presta, 4) + ',');
      L.push('    releves:[\n' + tableau(m.releves.map(releve), 6) + '\n    ],');
      L.push('    produits:' + chaines(m.produits, 4) + ',');
    }
    L.push('    documents:' + chaines(m.documents || [], 4) + ',');
    L.push('    masque:' + (est3d ? '[]' : '[' + MASQUE_HORS_3D.map(q).join(',') + ']') + ' }' + fin + (ix < ordre.length - 1 ? '\n' : ''));
  });
  L.push('};');
  L.push('const METIERS_ORDRE=[' + ordre.map(q).join(',') + '];');
  L.push('/* Le titre et l\'explication de chaque rubrique : [titre, explication, toujours ouverte]. Les mêmes textes que la page d\'abonnement et la Tour. */');
  L.push('const RUBRIQUES_INFO={');
  const ks = Object.keys(ref.rubriques);
  ks.forEach((k, i) => {
    const r = ref.rubriques[k];
    L.push('  ' + q(k) + ':[' + q(titreApp(k, r)) + ',' + q(r.explication) + ',' + (r.toujours ? 1 : 0) + ']' + (i < ks.length - 1 ? ',' : ''));
  });
  L.push('};');
  L.push(FIN);
  return L.join('\n');
}

const ref = JSON.parse(fs.readFileSync(REFERENTIEL, 'utf8'));
const bloc = fabriquer(ref);
const app = fs.readFileSync(APP, 'utf8');
const a = app.indexOf('// ⟦METIERS:DEBUT⟧'), b = app.indexOf(FIN);
if (a < 0 || b < a) { console.error('ÉCHEC : les deux lignes-repères ⟦METIERS:DEBUT⟧ / ⟦METIERS:FIN⟧ sont introuvables dans app.html'); process.exit(2); }
const neuf = app.slice(0, a) + bloc + app.slice(b + FIN.length);
if (process.argv.includes('--verifier')) {
  if (neuf !== app) { console.error('app.html n\'est pas à jour : relancer node scripts/metiers-generer.js'); process.exit(1); }
  console.log('app.html est à jour avec le référentiel'); process.exit(0);
}
if (neuf === app) { console.log('rien à changer'); process.exit(0); }
fs.writeFileSync(APP, neuf);
console.log('app.html réécrit : ' + ref.ordreMetiers.length + ' métiers, ' + Object.keys(ref.rubriques).length + ' rubriques');
