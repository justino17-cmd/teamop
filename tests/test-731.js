/* ⛔ CE QUE CE FICHIER GARDE — LE CLASSEMENT DES CLÉS DE `db`. ÉTAPE 2 DU SOCLE, BANC N° 2.

   C'est le premier banc de l'étape la plus dangereuse du chantier, et il vient AVANT le
   convertisseur — pas après. La raison tient en une ligne de l'application :

       function collsFusion(d){ return Object.keys(d||{}).filter(k=>Array.isArray(d[k])…) }

   « toute clé qui se trouve être un tableau ». La règle est IMPLICITE, donc invisible, donc
   invérifiable. Un inventaire bâti sur `COLLECTIONS_DONNEES` (27 entrées) ou sur les 28 de
   `migrate()` rate `boxDecisions`, `produitsDistincts`, `bonsRemise`, `interventionsArchive`,
   `indispos`, `activites`, `mailSent`. Le convertisseur `opDecomposer` / `opRecomposer` touche
   TOUTES ces clés : une seule oubliée, et l'aller-retour perd des données sans bruit.

   `OP_CLASSES` (app.html) rend la règle explicite sans la figer : ce n'est pas une liste
   blanche des clés AUTORISÉES, c'est un classement de celles qui EXISTENT. Ce banc énumère les
   clés réellement employées et refuse la première qui n'est pas classée — créer une collection
   demain oblige donc à dire de quel genre elle est, une fois, par écrit.

   ⛔ ET IL NE LIT PAS QUE LE TEXTE : il exécute le VRAI `seed()` puis le VRAI `migrate()`,
   extraits du fichier livré, et compare la forme MESURÉE de chaque clé au genre déclaré. Un
   classement juste sur le papier et faux à l'exécution serait pire que pas de classement — on
   bâtirait le convertisseur dessus.

   ⚠️ Ce que ce banc NE peut PAS faire, et qu'il faut savoir : les 34 clés du semis ne sont pas
   les 83. Les autres naissent à l'usage (un bon de remise, une boîte mail, un profil de
   droits) et ne peuvent pas être mesurées sans exercer l'application. Pour celles-là, seul le
   recensement du CODE s'applique — et c'est l'aller-retour du banc n° 1, sur une base
   synthétique puis sur une base réelle exportée, qui les éprouvera. */

const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

console.log('\n── 731 · le classement des clés de db (socle, étape 2) ──');

/* ⛔ ON SCANNE LE CODE, PAS LES COMMENTAIRES. Ce dépôt est très commenté : `db.interventions`
   apparaît dans des dizaines d'explications, et un motif qui les attrape rend des clés qui
   n'existent pas. Pris trois fois le 19 septembre 2026 — voir CLAUDE.md. */
const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* Le classement, extrait du fichier livré et ÉVALUÉ — pas recopié. S'il change de forme, ce
   banc tombe, et c'est le comportement voulu. */
const iC = SRC.indexOf('const OP_CLASSES = {');
vrai('OP_CLASSES est dans le fichier livré', iC > 0);
let fin = -1, d = 0;
for (let k = SRC.indexOf('{', iC); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { fin = k + 1; break; } } }
const CLASSES = new Function('return ' + SRC.slice(SRC.indexOf('{', iC), fin) + ';')();
const GENRES = ['liste', 'liste_cle', 'liste_ts', 'box', 'dict', 'tombes', 'reglage'];

/* ══ 1. AUCUNE CLÉ DU CODE N'EST NON CLASSÉE ══════════════════════════════════════════════
   C'est LE contrôle du fichier. Tout le reste est du contexte. */
const employees = [...new Set([...CODE.matchAll(/\bdb\.([A-Za-z_][A-Za-z0-9_]*)/g)].map(m => m[1]))].sort();
vrai('le recensement trouve bien toutes les clés (83 au 19/09/2026, ce nombre bouge)', employees.length >= 80);
const nonClassees = employees.filter(k => !CLASSES[k]);
v('⛔ AUCUNE clé de `db` n\'est employée sans être classée', nonClassees, []);

/* Et l'inverse : une entrée qui ne correspond à rien est du classement mort, qui donne
   l'illusion d'une couverture. */
const fantomes = Object.keys(CLASSES).filter(k => !employees.includes(k));
v('⛔ et aucune entrée du classement ne vise une clé qui n\'existe plus', fantomes, []);
const genresInconnus = Object.entries(CLASSES).filter(([, g]) => !GENRES.includes(g)).map(([k]) => k);
v('   tous les genres employés sont des genres connus', genresInconnus, []);

/* ══ 2. LE CLASSEMENT EST COHÉRENT AVEC CE QUE L'APPLICATION DÉCLARE DÉJÀ ═════════════════
   Trois listes existent dans le fichier et disent chacune une partie de la vérité. Si le
   classement les contredit, c'est lui qui a tort — elles sont en production. */
const listeDe = (nom) => { const m = new RegExp('const ' + nom + '=\\[([^\\]]*)\\]').exec(CODE); return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : []; };
const DONNEES = listeDe('COLLECTIONS_DONNEES'), DICT = listeDe('COLLS_DICT');
vrai('COLLECTIONS_DONNEES est trouvée', DONNEES.length === 27);
vrai('COLLS_DICT est trouvée', DICT.length === 3);
v('⛔ les 27 de COLLECTIONS_DONNEES sont toutes des LISTES',
  DONNEES.filter(k => CLASSES[k] !== 'liste' && CLASSES[k] !== 'box'), []);
v('⛔ les 3 de COLLS_DICT sont toutes des DICTIONNAIRES', DICT.filter(k => CLASSES[k] !== 'dict'), []);

/* ══ 3. ⛔ LA FORME MESURÉE, PAS DÉDUITE — le vrai seed() et le vrai migrate() ═════════════
   Un classement juste sur le papier et faux à l'exécution serait pire que pas de classement. */
function extraire() {
  const bloc = (sig) => { const i = SRC.indexOf(sig); if (i < 0) return '';
    let p = 0, f = -1; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) { f = k + 1; break; } } } return SRC.slice(i, f); };
  const ligne = (sig) => { const i = SRC.indexOf(sig); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
  const iCat = SRC.indexOf('const CATALOGUE=');
  const cat = iCat < 0 ? '' : SRC.slice(iCat, SRC.indexOf('\n', SRC.indexOf('];', iCat)));
  const src = [cat, ligne('const isoDe = d =>'), ligne('const todayISO = () =>'),
    bloc('function slugNom('), bloc('function idCatalogue('), bloc('function defaultPerms('),
    bloc('function seed('), bloc('function migrate(')].join('\n');
  let n = 0;
  return new Function('uid', 'BETA_ESSAI', 'ID_ADMIN_DEPART', 'CAT_LIST', 'DASH_DEFAULT', 'FOURS_VER', 'PRIX_VER', 'console',
    src + '\nreturn {seed,migrate};')(() => 'u' + (++n), false, 'admin0', [], [], 1, 1, { log() {}, warn() {}, error() {} });
}
let base = null;
try { const api = extraire(); base = api.seed(); api.migrate(base); } catch (e) { base = null; console.log('      (extraction : ' + e.message + ')'); }
vrai('⛔ le VRAI seed() puis le VRAI migrate() s\'exécutent', !!base);

if (base) {
  const cles = Object.keys(base).sort();
  vrai('   et rendent une base vivante (34 clés au 19/09/2026)', cles.length >= 30);
  v('⛔ toute clé de la base VIVANTE est classée', cles.filter(k => !CLASSES[k]), []);

  const attenduTableau = new Set(['liste', 'liste_cle', 'liste_ts', 'box']);
  const mauvais = cles.filter(k => {
    const g = CLASSES[k], val = base[k];
    if (attenduTableau.has(g)) return !Array.isArray(val);
    if (g === 'dict') return !(val && typeof val === 'object' && !Array.isArray(val));
    if (g === 'tombes') return !(val && typeof val === 'object');
    return Array.isArray(val) && g === 'reglage' && k !== 'dashLayout' && k !== 'societes';
  });
  v('⛔ la FORME MESURÉE de chaque clé correspond à son genre déclaré', mauvais, []);

  /* ⛔ ET UNE LISTE DOIT PORTER SON IDENTIFIANT. Sans lui, une ligne du socle n'a pas
     d'identité : chaque synchro en recrée une copie, pour toujours. C'est exactement pour ça
     que `mailSent` et `planJournal` sont classés à part (`liste_ts`) au lieu d'être noyés
     dans `liste` — les y mettre aurait passé ce banc et cassé la synchro trois étapes plus
     loin, quand plus personne n'aurait relié les deux. */
  const sansId = [];
  cles.forEach(k => {
    const g = CLASSES[k];
    if (g !== 'liste' && g !== 'liste_cle' && g !== 'box') return;
    const champ = g === 'liste_cle' ? 'cle' : 'id';
    const orphelins = (base[k] || []).filter(r => !r || !r[champ]).length;
    if (orphelins) sansId.push(k + ' : ' + orphelins + ' sans ' + champ);
  });
  v('⛔ tout enregistrement d\'une liste porte son identifiant', sansId, []);

  /* Le contre-test de la ligne d'au-dessus : les `liste_ts` DOIVENT, elles, en manquer —
     sinon le genre n'a pas de raison d'être et on l'a créé pour rien. */
  const ts = cles.filter(k => CLASSES[k] === 'liste_ts');
  vrai('   et les `liste_ts` sont bien celles qui n\'en ont pas (le genre a une raison d\'être)',
    ts.length > 0 && ts.every(k => (base[k] || []).every(r => !r || !r.id)));
}

/* ══ 4. LE NOM DU CHAMP D'IDENTITÉ N'A QU'UNE SEULE DÉFINITION ════════════════════════════
   Deux copies calculeraient un jour deux identifiants différents, et la ligne viserait un
   enregistrement qui n'existe pas — sans rien dire. C'est la leçon de `fbUidEquipe`. */
v('⛔ OP_ID_DE n\'est défini qu\'une fois', (CODE.match(/const OP_ID_DE\s*=/g) || []).length, 1);
vrai('   et il couvre les genres qui ont un identifiant',
  /OP_ID_DE\s*=\s*\{[^}]*liste:\s*'id'[^}]*liste_cle:\s*'cle'[^}]*box:\s*'id'/.test(CODE));

/* ══ 5. LA BÊTA PORTE LE MÊME CLASSEMENT ══════════════════════════════════════════════════
   `beta.html` est RÉGÉNÉRÉE depuis `app.html` : un classement qui n'existe que d'un côté est
   un classement à moitié, et c'est sur la bêta que l'étape 2 se développe. */
{
  const B = fs.readFileSync(path.join(RACINE, 'beta.html'), 'utf8');
  const iB = B.indexOf('const OP_CLASSES = {');
  vrai('⛔ la bêta porte OP_CLASSES', iB > 0);
  if (iB > 0) {
    let f2 = -1, p2 = 0;
    for (let k = B.indexOf('{', iB); k < B.length; k++) { if (B[k] === '{') p2++; else if (B[k] === '}') { p2--; if (!p2) { f2 = k + 1; break; } } }
    const CB = new Function('return ' + B.slice(B.indexOf('{', iB), f2) + ';')();
    v('   et exactement le même', CB, CLASSES);
  }
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
