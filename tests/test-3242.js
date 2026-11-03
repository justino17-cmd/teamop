/* test-3242 — PLUS DE « COULEUR DANS L'APPLICATION » (bêta v795, 3 novembre 2026).
 *
 * Justin, devant le bloc « Couleur dans l'application — inclus avec Business Premium » des Paramètres (la couleur de l'entreprise
 * devenait le thème de toute l'équipe) : « ça sert à rien du coup, donc tu peux supprimer ». Ce banc garde les deux moitiés :
 *   1. le bloc a disparu de la vue des Paramètres, et les fonctions qui l'écrivaient (entCouleur, entCouleurSet, entCouleurDel) aussi ;
 *   2. il EXÉCUTE la vraie `applyTheme` : une entreprise Business Premium dont la fiche porte encore une ancienne `couleur` ne colore
 *      plus l'application (`--acc-src` jamais posé, `data-accent` reste la teinte de la personne) ; la couleur PERSO d'un utilisateur
 *      marche toujours ; la couleur des DOCUMENTS (`couleurDoc`, docCouleurEnt) n'est pas touchée.
 * Rien n'est effacé de la base : l'ancien champ reste, il n'est plus lu (règle « rien ne s'écrit au seul chargement »). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', process.env.APP_FICHIER || 'app.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) { const i = SRC.indexOf(debut); if (i < 0) return ''; let p = 0;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return SRC.slice(i, k + 1); } } return ''; }

console.log('\n── 3242 · 1. le bloc et ses fonctions ont disparu ──');
const iV = CODE.indexOf('views.parametres=function'); const VUE = iV < 0 ? '' : CODE.slice(iV, iV + 400000);
vrai('la vue des Paramètres est trouvée', VUE.length > 10000, VUE.length);
vrai('plus de titre « Couleur dans l\'application » (le balisage, pas le commentaire qui le raconte)', !/class="form-sec">[^<]*Couleur dans l'application/.test(VUE));
vrai('plus de bouton « Choisir la couleur de l\'entreprise » ni de champ ent-couleur-in', !/Choisir la couleur de l.entreprise|ent-couleur-in/.test(VUE));
vrai('plus de phrase « devient le thème de couleur »', !/devient le (<b>)?th[eè]me de couleur/.test(CODE));
vrai('entCouleur, entCouleurSet, entCouleurDel n\'existent plus dans le code', !/\bentCouleur(Set|Del)?\s*\(/.test(CODE), (CODE.match(/\bentCouleur\w*\s*\(/g) || []));
vrai('la couleur des documents se choisit toujours (docCouleurZone dans la vue)', /docCouleurZone\(\)/.test(VUE));
vrai('Business Premium ne promet plus « la couleur de votre entreprise dans l\'application »', !/couleur de votre entreprise dans l\\'application/.test(CODE));

console.log('\n── 3242 · 2. la vraie applyTheme, une entreprise Premium qui porte encore une couleur ──');
const AT = bloc('function applyTheme(){');
vrai('applyTheme est trouvée', AT.length > 800, AT.length);
const DCE = bloc('function docCouleurEnt(){');
function jouer(accentPerso, hexPerso) {
  const attrs = {}, props = {};
  const r = { setAttribute: (k, v) => { attrs[k] = v; }, getAttribute: k => attrs[k], classList: { contains: () => false },
    style: { setProperty: (k, v) => { props[k] = v; }, removeProperty: k => { delete props[k]; }, getPropertyValue: k => props[k] || '' } };
  const W = { db: { entreprise: { nom: 'Clim Test', couleur: '#8B1E3F', couleurDoc: '#2458C5' } }, forfait: () => 'premium',
    document: { documentElement: r, querySelectorAll: () => [] }, getComputedStyle: () => ({ getPropertyValue: k => props[k] || '' }),
    effectiveTheme: () => 'dark', getAccent: () => accentPerso || '', getMarque: () => 'teamop', MARQUES: { teamop: { clair: '#fff', fonce: '#000' } },
    prefLocalLire: k => (k === 'elan_accent' ? accentPerso || null : k === 'elan_accent_hex' ? hexPerso || null : null),
    encreSur: () => '#fff', melangeNoir: h => h, $: () => null, applyBrand: () => {}, mapNuitSync: () => {}, THEME_ICO: {}, THEME_LBL: {},
    getThemePref: () => 'auto', DOC_COULEUR_DEFAUT: '#152340', entCouleur: () => '#8B1E3F' /* même si une vieille copie la fournissait, applyTheme ne doit plus la demander */ };
  vm.createContext(W); vm.runInContext(AT + '\n' + DCE + '\napplyTheme();', W);
  return { attrs, props, docCouleur: vm.runInContext('docCouleurEnt()', W) };
}
let r = jouer('', '');
vrai('sans couleur perso : --acc-src n\'est PAS posé (la couleur de l\'entreprise ne colore plus l\'application)', !('--acc-src' in r.props), r.props['--acc-src']);
vrai('sans couleur perso : data-accent reste la teinte par défaut (green)', r.attrs['data-accent'] === 'green', r.attrs['data-accent']);
vrai('la couleur des documents, elle, reste celle de l\'entreprise (couleurDoc)', r.docCouleur === '#2458C5', r.docCouleur);
r = jouer('custom', '#7A5AF8');
vrai('couleur perso de l\'utilisateur : toujours posée (--acc-src = sa teinte)', r.props['--acc-src'] === '#7A5AF8', r.props['--acc-src']);
vrai('… et data-accent = custom', r.attrs['data-accent'] === 'custom', r.attrs['data-accent']);
r = jouer('purple', '');
vrai('une teinte nommée choisie par l\'utilisateur passe par data-accent, sans couleur d\'entreprise', r.attrs['data-accent'] === 'purple' && !('--acc-src' in r.props), r);

console.log('\n── 3242 · 3. applyBrand ne relance plus le thème pour une couleur d\'entreprise ──');
const AB = (SRC.match(/function applyBrand\(\)\{[\s\S]*?\n(?=function brandBadgeSrc)/) || [''])[0].replace(/\/\*[\s\S]*?\*\//g, ' ');
vrai('applyBrand est trouvée', AB.length > 500, AB.length);
vrai('applyBrand ne lit plus la couleur de l\'entreprise ni n\'appelle applyTheme', !/entCouleur|\.couleur\b|applyTheme\(/.test(AB));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
