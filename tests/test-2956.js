/* ⛔ CE QUE CE FICHIER GARDE — LA DÉCLARATION « LA BÊTA EN AVANCE » (tests/beta-en-avance.js) EST VRAIE, SERT PARTOUT, ET NE TOLÈRE QUE CE QU'ELLE DIT (23 octobre 2026).

   Sur cette branche `app.html` est la bêta : elle connaît dix métiers de plus que le public, dit « Validation des mouvements » là où le
   public lit « Validations DR », et applique des catégories que la Tour (donc le client) dit encore ne pas appliquer. Ces trois écarts
   sont déclarés dans UN fichier, et les bancs qui comparent `app.html` aux pièces publiques (2890, 2893, 2871, 2950, 835, 837, 846,
   848) les tolèrent — exactement ceux-là. Une tolérance qu'on peut oublier de retirer est une porte ouverte : ce banc tient donc
   quatre choses, chacune lue dans le CODE ou exécutée :
     1. la déclaration dit VRAI sur les vrais fichiers, qu'elle soit pleine (bêta en avance) ou VIDÉE (geste de publication du
        23 octobre 2026, v772) : ce que l'application publique connaît, lit et affiche est ce que disent les pièces publiques ;
     2. les fonctions qui la jugent MORDENT — sur des copies pleine et vide du vrai fichier, et des pièces fabriquées : une déclaration
        qui devient fausse est signalée, la tolérance ne dépasse pas la déclaration, et une déclaration vidée ne tolère plus rien ;
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

/* ══ 1. LA DÉCLARATION DIT VRAI SUR LES VRAIS FICHIERS ══
   Elle a deux états, et ce banc tient dans les deux : PLEINE (la bêta en avance : dix métiers, un libellé, l'avance des catégories)
   ou VIDÉE au geste de publication (23 octobre 2026, v772 : « oui publie »). Dans les deux, les invariants ci-dessous sont les mêmes :
   ce que l'application publique connaît, lit et affiche est ce que disent les pièces publiques. */
console.log('\n1. La déclaration est vraie, et les pièces publiques disent ce qu\'elle laisse');
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
const D = BETA.BETA_EN_AVANCE;
/* 29 octobre 2026 : la climatisation (séparée du chauffage) est connue d'app.html et pas encore ouverte au public — déclarée en avance EN PLUS des dix du 23 octobre, dans les deux états */
const CLIM_DECLAREE = D.metiers.indexOf('climatisation') >= 0, DIX_DECL = D.metiers.filter(k => k !== 'climatisation');
const PLEINE_ETAT = DIX_DECL.length === 10 && Object.keys(D.libelles).length === 1 && D.categoriesAppliquees === true;
const VIDE_ETAT = DIX_DECL.length === 0 && Object.keys(D.libelles).length === 0 && D.categoriesAppliquees === false;
vrai('(population) les fichiers se lisent (24 métiers dans app.html, ' + J.ouverts.length + ' ouverts, ' + Object.keys(libNav).length + ' rubriques au menu, app.html lit les catégories, drapeau de la Tour lu) — et la déclaration est ' + (VIDE_ETAT ? 'VIDÉE (publication faite)' : PLEINE_ETAT ? 'pleine (bêta en avance)' : 'dans un état inconnu'),
  ORDRE_APP.length === 24 && Object.keys(libNav).length >= 40 && LIT === true && typeof DRAPEAU === 'string' && (PLEINE_ETAT || VIDE_ETAT), [ORDRE_APP.length, J.ouverts.length, DRAPEAU, D]);
egal('⛔ métiers : chaque métier déclaré est connu d\'app.html et FERMÉ dans metiers.json', BETA.mensongesMetiers(ORDRE_APP, J.ouverts), []);
egal('⛔ la climatisation : déclarée en avance TANT QUE metiers.json ne l\'ouvre pas (et seulement alors) — le geste de publication fait les deux ensemble', [CLIM_DECLAREE, J.ouverts.indexOf('climatisation') < 0], [true, true]);
egal('⛔ libellés : chaque libellé déclaré est porté par app.html, et metiers.json (donc la grille du client) porte l\'ancien', BETA.mensongesLibelles(libNav, titresPublics), []);
egal('⛔ catégories : si l\'avance est déclarée, app.html les lit et le drapeau de la Tour dit encore faux', BETA.mensongesCategories(LIT, DRAPEAU_B), []);
egal('   et hors de la déclaration, le menu d\'app.html dit EXACTEMENT les titres de metiers.json (aucun autre écart toléré)',
  Object.keys(libNav).filter(k => J.rubriques[k] && BETA.libellePublic(k, libNav[k].l) !== J.rubriques[k].titre), []);
egal('   et l\'application publique connaît exactement les `ouverts` de metiers.json, dans l\'ordre', BETA.ordrePublic(ORDRE_APP), J.ouverts);
egal('⛔ et ce que l\'application publique lit des catégories est ce que la Tour promet au client (`CATS_APPLIQUEES`)', BETA.categoriesLuesParPublique(LIT), DRAPEAU_B);

/* ══ 2. LES FONCTIONS MORDENT ══
   Une déclaration vidée ne laisse rien à faire mentir : les fonctions se jugent donc sur deux COPIES du vrai fichier (seul le littéral
   `BETA_EN_AVANCE` remplacé), l'une pleine, l'autre vide, et sur des pièces fabriquées dans l'état d'avant la publication. */
console.log('\n2. Les fonctions qui la jugent mordent (copies pleine et vide du vrai fichier, pièces fabriquées), et la tolérance ne dépasse pas la déclaration');
const SRC_DECL = fs.readFileSync(path.join(__dirname, 'beta-en-avance.js'), 'utf8');
const LITT = /const BETA_EN_AVANCE = \{[\s\S]*?\n\};/g;
/* les scénarios fabriqués sont ceux de l'état d'AVANT la climatisation (les 23 métiers du 23 octobre) : la climatisation, déclarée en avance dans les deux états, n'y change rien — elle est jugée à part, plus bas */
const APP23 = ORDRE_APP.filter(k => k !== 'climatisation');
const DIX = APP23.filter(k => ['incendie', 'froid', 'ascenseurs', 'portails', 'ramonage', 'assainissement', 'energies', 'alarme', 'eau', 'piscine'].indexOf(k) >= 0);
const copie = (nom, litteralDecl) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'b2956' + nom + '-'));
  try { fs.writeFileSync(path.join(d, 'beta-en-avance.js'), SRC_DECL.replace(LITT, litteralDecl)); return require(path.join(d, 'beta-en-avance.js')); }
  finally { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} }
};
const P = copie('p', 'const BETA_EN_AVANCE = {\n  metiers: ' + JSON.stringify(DIX) + ",\n  libelles: { validations: { beta: 'Validation des mouvements', public: 'Validations DR' } },\n  categoriesAppliquees: true,\n};");
const V = copie('v', 'const BETA_EN_AVANCE = { metiers: [], libelles: {}, categoriesAppliquees: false };');
const OUVERTS_AVANT = APP23.filter(k => DIX.indexOf(k) < 0);
const titresAvant = Object.assign({}, titresPublics, { validations: 'Validations DR' });
const titresApres = Object.assign({}, titresPublics, { validations: 'Validation des mouvements' });
vrai('(population) le littéral se trouve UNE fois dans le vrai fichier, les dix métiers sont dans app.html, et le menu dit « Validation des mouvements »',
  (SRC_DECL.match(LITT) || []).length === 1 && DIX.length === 10 && OUVERTS_AVANT.length === 13 && libNav.validations && libNav.validations.l === 'Validation des mouvements', [DIX, libNav.validations]);
egal('(contre-épreuve) la copie pleine dit VRAI sur l\'état d\'avant la publication (13 ouverts, ancien titre, drapeau faux)',
  [P.mensongesMetiers(APP23, OUVERTS_AVANT), P.mensongesLibelles(libNav, titresAvant), P.mensongesCategories(true, false)], [[], [], []]);
egal('un métier déclaré que metiers.json OUVRE → la déclaration est fausse', P.mensongesMetiers(APP23, OUVERTS_AVANT.concat(['incendie'])).length, 1);
egal('⛔ tous les métiers ouverts (le geste de publication) sans vider la déclaration → dix mensonges', P.mensongesMetiers(APP23, APP23).length, 10);
egal('un métier déclaré qu\'app.html ne connaît plus → fausse', P.mensongesMetiers(APP23.filter(k => k !== 'piscine'), OUVERTS_AVANT).length, 1);
egal('un libellé déclaré qu\'app.html ne porte plus → fausse', P.mensongesLibelles(Object.assign({}, libNav, { validations: { l: 'Validations DR' } }), titresAvant).length, 1);
egal('un libellé que la pièce publique a déjà adopté (metiers.json dit « Validation des mouvements ») → fausse', P.mensongesLibelles(libNav, titresApres).length, 1);
egal('une rubrique déclarée qui disparaît du menu → fausse', P.mensongesLibelles(Object.assign({}, libNav, { validations: undefined }), titresAvant).length >= 1, true);
egal('des catégories déclarées appliquées mais qu\'app.html ne lit pas → fausse', P.mensongesCategories(false, false).length, 1);
egal('… ou dont le drapeau de la Tour est passé à vrai (promesse publique) → fausse', P.mensongesCategories(true, true).length, 1);
egal('… ou dont le drapeau n\'est pas lu → fausse', P.mensongesCategories(true, undefined).length, 1);
egal('la tolérance de libellé est EXACTEMENT celle-là : le libellé déclaré se lit comme le public',
  [P.libellePublic('validations', 'Validation des mouvements')], ['Validations DR']);
egal('… un autre libellé de la même rubrique ne passe pas, un libellé déclaré posé sur une autre rubrique non plus',
  [P.libellePublic('validations', 'Validations'), P.libellePublic('clients', 'Validation des mouvements'), P.libellePublic('constructor', 'x'), P.libellePublic('__proto__', 'x')],
  ['Validations', 'Validation des mouvements', 'x', 'x']);
egal('la tolérance de métiers retire EXACTEMENT les dix déclarés, ni un de plus ni un de moins', APP23.filter(k => P.ordrePublic(APP23).indexOf(k) < 0), DIX);
egal('… et l\'application publique ne lit les catégories que si app.html les lit SANS l\'avance déclarée', [P.categoriesLuesParPublique(true), P.categoriesLuesParPublique(false)], [false, false]);
egal('⛔ la déclaration VIDÉE ne tolère plus rien : aucun métier retiré, aucun libellé réécrit, les catégories lues comme app.html',
  [V.ordrePublic(APP23).length, V.libellePublic('validations', 'Validation des mouvements'), V.categoriesLuesParPublique(true), V.categoriesLuesParPublique(false)], [23, 'Validation des mouvements', true, false]);
egal('   … donc un métier resté FERMÉ, l\'ancien titre gardé ou le drapeau resté faux se voient dans les comparaisons de la section 1',
  [V.ordrePublic(APP23).join() === OUVERTS_AVANT.join(), V.libellePublic('validations', libNav.validations.l) === titresAvant.validations, V.categoriesLuesParPublique(true) === false], [false, false, false]);

const C = copie('c', "const BETA_EN_AVANCE = { metiers: ['climatisation'], libelles: {}, categoriesAppliquees: false };");
egal('(contre-épreuve) la climatisation seule en avance : vraie tant que metiers.json ne l\'ouvre pas', [C.mensongesMetiers(ORDRE_APP, J.ouverts), C.ordrePublic(ORDRE_APP).length], [[], 23]);
egal('… fausse le jour où metiers.json l\'ouvre sans vider la déclaration', C.mensongesMetiers(ORDRE_APP, J.ouverts.concat(['climatisation'])).length, 1);
egal('… et fausse si app.html ne la connaît plus', C.mensongesMetiers(ORDRE_APP.filter(k => k !== 'climatisation'), J.ouverts).length, 1);
egal('⛔ la tolérance retire EXACTEMENT la climatisation, ni un autre métier ni un libellé', [ORDRE_APP.filter(k => C.ordrePublic(ORDRE_APP).indexOf(k) < 0), C.libellePublic('validations', 'Validation des mouvements')], [['climatisation'], 'Validation des mouvements']);

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

/* ══ 4. LE GÉNÉRATEUR HONORE LA DÉCLARATION, DANS LES DEUX SENS ══
   Sur un arbre fabriqué, avec un metiers.json dans chacun des deux états (titre public d'avant, titre publié). */
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
  const avecTitre = t => { const j = JSON.parse(lire('metiers.json')); j.rubriques.validations.titre = t; return JSON.stringify(j, null, 1); };
  const jsonAvant = avecTitre('Validations DR'), jsonPublie = avecTitre('Validation des mouvements');
  const declPleine = "module.exports = { LIBELLES: { validations: { beta: 'Validation des mouvements', public: 'Validations DR' } } };";
  const declVide = 'module.exports = { LIBELLES: {} };';
  const r1 = monter('pleine', declPleine, jsonAvant);
  vrai('(population) l\'arbre fabriqué part d\'un app.html qui porte « Validation des mouvements »', titreDans(r1) === 'Validation des mouvements', titreDans(r1));
  const g1 = lancer(r1, '--verifier');
  vrai('déclaration pleine, titre public d\'avant : app.html (déjà à jour) passe `--verifier`', g1.status === 0, (g1.stdout + g1.stderr).trim());
  const r2 = monter('vide', declVide, jsonAvant);
  const g2 = lancer(r2, '--verifier');
  vrai('⛔ déclaration VIDÉE, titre public d\'avant : le même app.html n\'est plus à jour (il porte l\'écart que plus rien ne déclare)', g2.status === 1, g2.status);
  const g2b = lancer(r2);
  vrai('   … et le script écrit alors le titre PUBLIC de metiers.json', g2b.status === 0 && titreDans(r2) === 'Validations DR', [g2b.status, titreDans(r2), g2b.stderr]);
  const g2c = lancer(r2, '--verifier');
  vrai('   … après quoi `--verifier` passe', g2c.status === 0, g2c.status);
  const r3 = monter('perimee', declPleine, jsonPublie);
  const g3 = lancer(r3);
  vrai('⛔ titre public changé dans metiers.json alors que la déclaration annonce l\'ancien : le script S\'ARRÊTE (déclaration périmée), app.html intact',
    g3.status === 3 && /périmée/.test(g3.stderr) && fs.readFileSync(path.join(r3, 'app.html'), 'utf8') === fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8'), [g3.status, g3.stderr.slice(0, 200)]);
  const r4 = monter('publiee', declVide, jsonPublie);
  const g4 = lancer(r4, '--verifier');
  vrai('⛔ l\'état PUBLIÉ (déclaration vidée, titre public « Validation des mouvements ») : app.html est à jour, rien à réécrire', g4.status === 0, (g4.stdout + g4.stderr).trim());
} finally { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) {} }

console.log('\n── 2956 : ' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
