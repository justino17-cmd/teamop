/* ══ j03 · r4#1 — LA GARDE « CHAMP VIDE » REFUSE TOUT CE QUI N'A AUCUN RENDU, PAS SEULEMENT ZWSP/ZWNJ/ZWJ/WJ/BOM ═════════
   `vide()` de `saisieGardeInstaller` (fin d'app.html) disait « vide » pour une valeur faite d'espaces, de U+200B–200D, U+2060 et
   U+FEFF. Rejoué au navigateur (Utilisateurs > ＋) : un prénom U+200E (marque gauche-à-droite) créait un compte au prénom
   invisible ; U+00AD, U+2800 (braille vide) et U+3164 (Hangul filler) passaient la garde et n'étaient arrêtés que par le contrôle
   d'homonyme, parce que le compte U+200E existait déjà. Aucun second filet : `saveUser` nettoie par `nomSaisieNet`, qui ne
   fait que `\s+` → espace.

   Ce banc EXÉCUTE la vraie fonction (extraite d'app.html, brut) sur un faux document qui garde ses écouteurs : pour chaque valeur
   il envoie `submit` puis n'appelle la fonction d'enregistrement QUE si la garde n'a rien arrêté. « Refusé » veut dire : rien
   n'est écrit. Contre-épreuves (ce qui doit PASSER) : « Dupont » entouré d'espaces, un nom d'un seul émoji (et ses variantes :
   séquence ZWJ, sélecteur de variation, drapeau), une lettre accentuée décomposée, un idéogramme ; un champ VIDE reste l'affaire
   du navigateur (la garde ne dit rien).                                                                                      */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function bloc(debut) {
  const i = APP.indexOf(debut); if (i < 0) return '';
  let p = 0; for (let k = APP.indexOf('{', i); k < APP.length; k++) {
    if (APP[k] === '{') p++; else if (APP[k] === '}') { p--; if (!p) return APP.slice(i, k + 1); } }
  return ''; }

console.log('\n── 1621 · 0. la population ──');
const SRC = bloc('function saisieGardeInstaller(doc){');
vrai('la garde est trouvée dans app.html', SRC.length > 200, SRC.length);
vrai('elle est INSTALLÉE (un appel dans le code, pas dans un commentaire)', /^saisieGardeInstaller\(document\);/m.test(CODE));
vrai('une seule fonction « vide » dans la garde (code, hors commentaires)', (SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').match(/function vide\(/g) || []).length === 1);
if (!SRC) { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(1); }

function champ(valeur) {
  const c = { tagName: 'INPUT', type: 'text', name: 'prenom', value: valeur, disabled: false, focus() { c.focused = true; }, select() {},
    getAttribute(a) { return a === 'name' ? 'prenom' : a === 'aria-label' ? 'Prénom' : null; }, closest() { return null; } };
  return c;
}
function essai(valeur) {
  const toasts = [], ecouteurs = [], doc = { addEventListener(type, fn, capture) { ecouteurs.push({ type, fn, capture }); } };
  new Function('toast', SRC + '\nsaisieGardeInstaller(arguments[1]);')((m) => toasts.push(m), doc);
  const f = champ(valeur), form = { querySelectorAll: sel => sel === 'input[required],textarea[required]' ? [f] : [] };
  const e = { target: form, defaut: false, stop: false, preventDefault() { e.defaut = true; }, stopImmediatePropagation() { e.stop = true; } };
  let ecrit = 0;
  for (const l of ecouteurs.filter(l => l.type === 'submit' && l.capture === true)) { l.fn(e); if (e.stop) break; }
  if (!e.stop && !e.defaut) ecrit++;      // le onsubmit du formulaire : la fonction save*
  return { ecrit, toasts, f, e };
}
const U = (...cp) => String.fromCodePoint(...cp);

console.log('\n── 1621 · 1. chaque caractère SANS RENDU, seul ou répété, entouré d\'espaces → refusé, rien d\'écrit ──');
const INVISIBLES = [
  ['U+200E marque gauche-à-droite (le cas rejoué)', 0x200E], ['U+200F marque droite-à-gauche', 0x200F],
  ['U+00AD trait d\'union conditionnel', 0x00AD], ['U+2800 braille vide', 0x2800], ['U+3164 Hangul filler', 0x3164],
  ['U+115F Hangul choseong filler', 0x115F], ['U+1160 Hangul jungseong filler', 0x1160], ['U+FFA0 Hangul filler demi-chasse', 0xFFA0],
  ['U+034F liant de graphèmes', 0x034F], ['U+180E séparateur mongol', 0x180E], ['U+17B4 voyelle inhérente khmère', 0x17B4], ['U+17B5', 0x17B5],
  ['U+2061 fonction appliquée', 0x2061], ['U+2062 fois invisible', 0x2062], ['U+2063 séparateur invisible', 0x2063], ['U+2064 plus invisible', 0x2064],
  ['U+061C marque de lettre arabe', 0x061C], ['U+202A', 0x202A], ['U+202E inversion de sens', 0x202E], ['U+2066', 0x2066], ['U+2069', 0x2069],
  ['U+FE0F sélecteur de variation 16', 0xFE0F], ['U+FE00 sélecteur de variation 1', 0xFE00], ['U+180B sélecteur mongol', 0x180B],
  ['U+0001 contrôle', 0x0001], ['U+0085 saut de ligne suivant', 0x0085],
  ['U+E0020 caractère-étiquette', 0xE0020],
  /* ceux d'AVANT, qui doivent rester refusés */
  ['U+200B espace de largeur nulle', 0x200B], ['U+200C', 0x200C], ['U+200D', 0x200D], ['U+2060', 0x2060], ['U+FEFF', 0xFEFF], ['U+00A0 insécable', 0x00A0] ];
for (const [nom, cp] of INVISIBLES) {
  const c = U(cp), r = essai(c), r2 = essai(' ' + c + c + ' \t');
  vrai(nom + ' → refusé seul', r.ecrit === 0 && r.e.stop === true && r.e.defaut === true, r.toasts);
  vrai('   … et répété entre des espaces', r2.ecrit === 0 && r2.e.stop === true);
}
{ const r = essai(U(0x200E, 0x2800, 0x3164, 0x00AD, 0x20, 0x200B));
  vrai('un mélange de plusieurs invisibles → refusé, avec le toast « obligatoire »', r.ecrit === 0 && r.toasts.length === 1 && /obligatoire/.test(r.toasts[0]), r.toasts);
  vrai('   et le focus revient sur le champ', r.f.focused === true); }

console.log('\n── 1621 · 2. contre-épreuves : ce qui doit PASSER (un vrai signe, même seul) ──');
const PASSE = [
  ['« Dupont » entouré d\'espaces', '   Dupont  '], ['« A » seul', 'A'],
  ['un émoji seul', U(0x1F600)], ['un émoji + sélecteur de variation (❤️)', U(0x2764, 0xFE0F)],
  ['une séquence ZWJ (famille)', U(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467)], ['un drapeau (deux indicateurs régionaux)', U(0x1F1EB, 0x1F1F7)],
  ['une touche (1️⃣)', U(0x31, 0xFE0F, 0x20E3)], ['« é » décomposé (e + accent combinant)', 'e' + U(0x0301)],
  ['un idéogramme', U(0x674E)], ['une syllabe Hangul', U(0xAE40)], ['une lettre entourée d\'invisibles (LRM + O + LRM)', U(0x200E) + 'O' + U(0x200E)],
  ['un chiffre', '7'], ['une apostrophe', '\''], ['un tiret', '-'], ['un point', '.'] ];
for (const [nom, val] of PASSE) { const r = essai(val); vrai(nom + ' → accepté, la fonction d\'enregistrement est appelée', r.ecrit === 1 && !r.e.defaut && r.toasts.length === 0, r.toasts); }
{ const r = essai('');
  vrai('un champ VIDE reste l\'affaire du navigateur (la garde ne dit rien)', r.ecrit === 1 && r.toasts.length === 0 && !r.e.defaut); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
