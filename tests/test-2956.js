/* ⛔ CE QUE CE FICHIER GARDE — LA DÉCLARATION « LA BÊTA EN AVANCE » (tests/beta-en-avance.js) EST VRAIE, SERT PARTOUT, ET NE TOLÈRE QUE CE QU'ELLE DIT (23 octobre 2026).

   Sur cette branche `app.html` est la bêta : elle connaît dix métiers de plus que le public, dit « Validation des mouvements » là où le
   public lit « Validations DR », et applique des catégories que la Tour (donc le client) dit encore ne pas appliquer. Ces trois écarts
   sont déclarés dans UN fichier, et les bancs qui comparent `app.html` aux pièces publiques (2890, 2893, 2871, 2950, 835, 837, 846,
   848) les tolèrent — exactement ceux-là. Une tolérance qu'on peut oublier de retirer est une porte ouverte : ce banc tient donc
   quatre choses, chacune lue dans le CODE ou exécutée :
     1. la déclaration dit VRAI sur les vrais fichiers (métiers connus d'app.html et fermés dans metiers.json, libellé porté par
        app.html et ancien libellé dans metiers.json et la Tour, catégories lues par app.html et drapeau de la Tour faux) ;
     2. les fonctions qui la jugent MORDENT : une déclaration qui devient fausse (mutation de l'entrée) est signalée, et la tolérance
        ne dépasse pas la déclaration (un autre libellé, un autre métier ne passent pas) ;
     3. elle est déclarée à UN seul endroit, et chaque banc qui compare app.html à une pièce publique la lit ;
     4. le générateur (`scripts/metiers-generer.js`) l'honore dans les deux sens, sur un arbre fabriqué : déclaration pleine →
        « Validation des mouvements », déclaration vidée → le titre public de metiers.json ; titre public qui a changé → il s'arrête.
   Et il n'existe plus de seconde copie du référentiel (design/metiers-referentiel.json).
   Rien ne sort d'ici : aucun réseau, aucune donnée de client. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process');
const RACINE = path.join(__dirname, '..');
const { nu, litteral, evalue } = require('./metiers-outils.js');
const BETA = require('./beta-en-avance.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');

console.log('\n── 2956 · la bêta en avance : une déclaration, vraie, et rien de plus ──');

/* ══ 1. LA DÉCLARATION DIT VRAI SUR LES VRAIS FICHIERS ══ */
console.log('\n1. La déclaration est vraie');
const APPN = nu(lire('app.html')), TOURN = nu(lire('tour.html'));
const J = JSON.parse(lire('metiers.json'));
const NAV = evalue(litteral(APPN, 'const NAV = ['));
const ORDRE_APP = evalue(litteral(APPN, 'const METIERS_ORDRE=['));
const libNav = {}; NAV.forEach(g => g.items.forEach(i => { libNav[i.k] = { l: i.l }; }));
const titresPublics = Object.fromEntries(Object.keys(J.rubriques).map(k => [k, J.rubriques[k].titre]));
function appLitCats(src) { let i = -1, lit = false; while ((i = src.indexOf('/api/espaces/etat', i + 1)) >= 0) if (/cats/i.test(src.slice(i, i + 6000))) lit = true; return lit; }
const LIT = appLitCats(APPN);
const DRAPEAU = (/var CATS_APPLIQUEES=(true|false);/.exec(TOURN) || [])[1];
const DRAPEAU_B = DRAPEAU === 'true' ? true : DRAPEAU === 'false' ? false : undefined;
vrai('(population) la déclaration porte dix métiers, un libellé et l\'avance des catégories — et les fichiers se lisent (23 métiers dans app.html, 13 ouverts, ' + Object.keys(libNav).length + ' rubriques au menu)',
  BETA.PAS_ENCORE_OUVERTS.length === 10 && Object.keys(BETA.LIBELLES).length === 1 && BETA.BETA_EN_AVANCE.categoriesAppliquees === true
  && ORDRE_APP.length === 23 && J.ouverts.length === 13 && Object.keys(libNav).length >= 40 && typeof DRAPEAU === 'string', [ORDRE_APP.length, J.ouverts.length, DRAPEAU]);
egal('⛔ métiers : les dix déclarés sont connus d\'app.html et FERMÉS dans metiers.json', BETA.mensongesMetiers(ORDRE_APP, J.ouverts), []);
egal('⛔ libellés : app.html porte le libellé déclaré, metiers.json (donc la grille du client) l\'ancien', BETA.mensongesLibelles(libNav, titresPublics), []);
egal('⛔ catégories : app.html les lit, le drapeau de la Tour dit encore faux', BETA.mensongesCategories(LIT, DRAPEAU_B), []);
egal('   et hors de la déclaration, le menu d\'app.html dit EXACTEMENT les titres de metiers.json (aucun autre écart toléré)',
  Object.keys(libNav).filter(k => J.rubriques[k] && BETA.libellePublic(k, libNav[k].l) !== J.rubriques[k].titre), []);
egal('   et l\'application publique connaît exactement les treize `ouverts` de metiers.json, dans l\'ordre', BETA.ordrePublic(ORDRE_APP), J.ouverts);

/* ══ 2. LES FONCTIONS MORDENT ══ */
console.log('\n2. Les fonctions qui la jugent mordent (mutation de leur entrée), et la tolérance ne dépasse pas la déclaration');
egal('un métier déclaré que metiers.json OUVRE → la déclaration est fausse', BETA.mensongesMetiers(ORDRE_APP, J.ouverts.concat(['incendie'])).length, 1);
egal('un métier déclaré qu\'app.html ne connaît plus → fausse', BETA.mensongesMetiers(ORDRE_APP.filter(k => k !== 'piscine'), J.ouverts).length, 1);
egal('un libellé déclaré qu\'app.html ne porte plus → fausse', BETA.mensongesLibelles(Object.assign({}, libNav, { validations: { l: 'Validations DR' } }), titresPublics).length, 1);
egal('un libellé que la pièce publique a déjà adopté (metiers.json dit « Validation des mouvements ») → fausse', BETA.mensongesLibelles(libNav, Object.assign({}, titresPublics, { validations: 'Validation des mouvements' })).length >= 1, true);
egal('une rubrique déclarée qui disparaît du menu → fausse', BETA.mensongesLibelles(Object.assign({}, libNav, { validations: undefined }), titresPublics).length >= 1, true);
egal('des catégories déclarées appliquées mais qu\'app.html ne lit pas → fausse', BETA.mensongesCategories(false, false).length, 1);
egal('… ou dont le drapeau de la Tour est passé à vrai (promesse publique) → fausse', BETA.mensongesCategories(true, true).length, 1);
egal('… ou dont le drapeau n\'est pas lu → fausse', BETA.mensongesCategories(true, undefined).length, 1);
egal('la tolérance de libellé est EXACTEMENT celle-là : le libellé déclaré se lit comme le public',
  [BETA.libellePublic('validations', 'Validation des mouvements')], ['Validations DR']);
egal('… un autre libellé de la même rubrique ne passe pas, un libellé déclaré posé sur une autre rubrique non plus',
  [BETA.libellePublic('validations', 'Validations'), BETA.libellePublic('clients', 'Validation des mouvements'), BETA.libellePublic('constructor', 'x'), BETA.libellePublic('__proto__', 'x')],
  ['Validations', 'Validation des mouvements', 'x', 'x']);
egal('la tolérance de métiers retire EXACTEMENT les dix déclarés, ni un de plus ni un de moins', ORDRE_APP.filter(k => BETA.ordrePublic(ORDRE_APP).indexOf(k) < 0), BETA.PAS_ENCORE_OUVERTS);
egal('… et l\'application publique ne lit les catégories que si app.html les lit SANS l\'avance déclarée', [BETA.categoriesLuesParPublique(true), BETA.categoriesLuesParPublique(false)], [false, false]);

/* ══ 3. UN SEUL ENDROIT, LU PAR CHAQUE BANC ══ */
console.log('\n3. Déclarée à un seul endroit, lue par chaque banc qui compare app.html à une pièce publique');
const fichiersTests = fs.readdirSync(__dirname).filter(f => /\.js$/.test(f));
const definitions = fichiersTests.filter(f => /\b(?:const|let|var)\s+PAS_ENCORE_OUVERTS\s*=/.test(nu(fs.readFileSync(path.join(__dirname, f), 'utf8'))));
egal('⛔ la liste des métiers en avance n\'est écrite que dans tests/beta-en-avance.js', definitions, ['beta-en-avance.js']);
const LECTEURS = { 'test-2890.js': 'beta-en-avance', 'test-2893.js': 'beta-en-avance', 'test-2871.js': 'beta-en-avance', 'test-2950.js': 'beta-en-avance',
  'test-835.js': 'metiers-publics', 'test-837.js': 'metiers-publics', 'test-846.js': 'metiers-publics', 'test-848.js': 'metiers-publics' };
egal('⛔ chacun des huit bancs lit la déclaration (directement, ou par tests/metiers-publics.js qui la réexporte)',
  Object.keys(LECTEURS).filter(f => !new RegExp("require\\('\\./" + LECTEURS[f] + "(?:\\.js)?'\\)").test(nu(fs.readFileSync(path.join(__dirname, f), 'utf8')))), []);
vrai('   tests/metiers-publics.js la réexporte (sa liste vient de la déclaration, pas d\'un second littéral)',
  /require\('\.\/beta-en-avance\.js'\)/.test(nu(fs.readFileSync(path.join(__dirname, 'metiers-publics.js'), 'utf8'))) && require('./metiers-publics.js').PAS_ENCORE_OUVERTS === BETA.PAS_ENCORE_OUVERTS);
vrai('   le générateur lit la même déclaration (libellés)', /require\(path\.join\(RACINE, 'tests', 'beta-en-avance\.js'\)\)/.test(nu(lire('scripts/metiers-generer.js'))));
vrai('⛔ il n\'existe qu\'UN référentiel : design/metiers-referentiel.json est supprimé', !fs.existsSync(path.join(RACINE, 'design', 'metiers-referentiel.json')));
const LECTEURS_ANCIEN = fichiersTests.map(f => 'tests/' + f).concat(fs.readdirSync(path.join(RACINE, 'scripts')).filter(f => /\.js$/.test(f)).map(f => 'scripts/' + f))
  .filter(f => f !== 'tests/test-2956.js' && /(?:readFileSync|require)\([^;]*metiers-referentiel/.test(nu(fs.readFileSync(path.join(RACINE, f), 'utf8'))));
egal('   et rien ne le lit plus (aucun banc ni script ne LIT l\'ancien chemin)', LECTEURS_ANCIEN, []);

/* ══ 4. LE GÉNÉRATEUR HONORE LA DÉCLARATION, DANS LES DEUX SENS ══ */
console.log('\n4. Le générateur, sur un arbre fabriqué');
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'b2956-'));
try {
  const monter = (nom, decl, metiersJson) => {
    const r = path.join(bac, nom);
    fs.mkdirSync(path.join(r, 'scripts'), { recursive: true }); fs.mkdirSync(path.join(r, 'tests'), { recursive: true });
    fs.copyFileSync(path.join(RACINE, 'scripts', 'metiers-generer.js'), path.join(r, 'scripts', 'metiers-generer.js'));
    fs.copyFileSync(path.join(RACINE, 'app.html'), path.join(r, 'app.html'));
    fs.writeFileSync(path.join(r, 'tests', 'beta-en-avance.js'), decl);
    fs.writeFileSync(path.join(r, 'metiers.json'), metiersJson);
    return r;
  };
  const titreDans = r => { const N = nu(fs.readFileSync(path.join(r, 'app.html'), 'utf8')); return evalue(litteral(N, 'const RUBRIQUES_INFO={')).validations[0]; };
  const lancer = (r, ...args) => cp.spawnSync(process.execPath, [path.join(r, 'scripts', 'metiers-generer.js'), ...args], { encoding: 'utf8' });
  const brut = lire('metiers.json');
  const declPleine = "module.exports = { LIBELLES: { validations: { beta: 'Validation des mouvements', public: 'Validations DR' } } };";
  const declVide = 'module.exports = { LIBELLES: {} };';
  const r1 = monter('pleine', declPleine, brut);
  vrai('(population) l\'arbre fabriqué part d\'un app.html qui porte le titre déclaré', titreDans(r1) === 'Validation des mouvements', titreDans(r1));
  const g1 = lancer(r1, '--verifier');
  vrai('déclaration pleine : app.html (déjà à jour) passe `--verifier`', g1.status === 0, (g1.stdout + g1.stderr).trim());
  const r2 = monter('vide', declVide, brut);
  const g2 = lancer(r2, '--verifier');
  vrai('⛔ déclaration VIDÉE : le même app.html n\'est plus à jour (il porte l\'écart que plus rien ne déclare)', g2.status === 1, g2.status);
  const g2b = lancer(r2);
  vrai('   … et le script écrit alors le titre PUBLIC de metiers.json', g2b.status === 0 && titreDans(r2) === 'Validations DR', [g2b.status, titreDans(r2), g2b.stderr]);
  const g2c = lancer(r2, '--verifier');
  vrai('   … après quoi `--verifier` passe', g2c.status === 0, g2c.status);
  const J2 = JSON.parse(brut); J2.rubriques.validations.titre = 'Validation des mouvements';
  const r3 = monter('perimee', declPleine, JSON.stringify(J2));
  const g3 = lancer(r3);
  vrai('⛔ titre public changé dans metiers.json alors que la déclaration annonce l\'ancien : le script S\'ARRÊTE (déclaration périmée), app.html intact',
    g3.status === 3 && /périmée/.test(g3.stderr) && fs.readFileSync(path.join(r3, 'app.html'), 'utf8') === fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8'), [g3.status, g3.stderr.slice(0, 200)]);
} finally { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) {} }

console.log('\n── 2956 : ' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
