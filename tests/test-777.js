/* ══ UNE ICÔNE SEULE A BESOIN D'UN NOM (v728) ═════════════════════════════════════════════
   Mesuré le 23 septembre 2026, en vérifiant l'iPad : le bouton ✎ de Secteurs n'avait ni texte,
   ni title, ni aria-label. La cause est générale. La refonte remplace les émojis par des traits
   (`icones()`, classe `rf-ic`) marqués `aria-hidden` — et un bouton qui ne portait QUE son émoji
   (✎ Modifier, 🗑 Supprimer, 🔄, 🖨️ : 33 dans le fichier) n'avait plus AUCUN nom : ni pour un
   lecteur d'écran, qui lisait l'émoji avant la refonte, ni en infobulle.

   `nommerIcone()` lui rend un nom au moment du remplacement : celui de son GESTE, à défaut
   l'émoji retiré. Trois règles, toutes jouées ici sur la VRAIE fonction extraite du fichier :
   · jamais par-dessus un nom posé par l'application (aria-label, aria-labelledby, title) ;
   · jamais avant `nommer()`, qui nomme mieux (l'infobulle `data-tip`, « Ouvrir le menu ») ;
   · jamais si la commande garde un texte — c'est lui, son nom.

   Preuve de bout en bout au navigateur (scratchpad/sans-nom.js, 41 rubriques) : 13 commandes
   sans nom au bureau et 14 au téléphone avant, 0 après ; et les 46 éléments à `data-tip`
   rencontrés gardent LEUR infobulle comme nom (scratchpad/tips.js).                          */
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* Découpe par ACCOLADES appariées, à partir d'une ouverture donnée. */
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) {
    const c = SRC[k];
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); }
  }
  return '';
}

console.log('\n── 777 · 1. la fonction, et où elle est appelée ──');
const fEMO = bloc('var EMO={'), fGESTE = bloc('var GESTE={'), fNom = bloc('function nommerIcone(hote,cle){');
vrai('population : EMO, GESTE et nommerIcone sont trouvés', fEMO.length > 2000 && fGESTE.length > 50 && fNom.length > 200,
  [fEMO.length, fGESTE.length, fNom.length]);
const fIc = bloc('function icones(racine){');
vrai('⛔ icones() nomme la commande APRÈS l’avoir vidée de son émoji',
  /hote\.replaceChild\(frag,noeud\);[\s\S]{0,80}nommerIcone\(hote,premiere\)/.test(fIc));
vrai('… avec la PREMIÈRE icône du texte remplacé', /if\(!premiere\) premiere=cle;/.test(fIc));
const fPas = bloc('function passage(){');
vrai('`nommer()` passe après le balayage des icônes (d’où les deux exceptions ci-dessous)',
  fPas.indexOf('balayerRacines()') > 0 && fPas.indexOf('nommer()') > fPas.indexOf('balayerRacines()'));

console.log('\n── 777 · 2. la vraie nommerIcone, jouée ──');
let traduire = null;
const nommerIcone = new Function('window', fEMO + ';\n' + fGESTE + ';\n' + fNom + ';\nreturn nommerIcone;')({ get t() { return traduire; } });
/* un élément fabriqué : juste ce que la fonction lit */
function el(tag, { attrs = {}, texte = '', classes = [] } = {}) {
  const a = Object.assign({}, attrs);
  const e = {
    tagName: tag, textContent: texte,
    hasAttribute: n => Object.prototype.hasOwnProperty.call(a, n),
    getAttribute: n => (Object.prototype.hasOwnProperty.call(a, n) ? a[n] : null),
    setAttribute: (n, v) => { a[n] = String(v); },
    classList: { contains: c => classes.includes(c) },
    closest: () => e, attrs: a,
  };
  return e;
}
{ const b = el('BUTTON'); nommerIcone(b, '✎');
  vrai('✎ seul → « Modifier », en nom ET en infobulle', b.attrs['aria-label'] === 'Modifier' && b.attrs.title === 'Modifier', b.attrs);
  vrai('… et un bouton garde son rôle natif (pas de role ajouté)', !b.hasAttribute('role')); }
{ const b = el('BUTTON'); nommerIcone(b, '🗑');
  vrai('🗑 seul → « Supprimer »', b.attrs['aria-label'] === 'Supprimer', b.attrs); }
{ const b = el('BUTTON'); nommerIcone(b, '🔄');
  vrai('🔄 seul → « Actualiser »', b.attrs['aria-label'] === 'Actualiser', b.attrs); }
{ const b = el('BUTTON'); nommerIcone(b, '🧪');
  vrai('une icône sans geste connu → l’émoji lui-même (ce qu’un lecteur lisait avant la refonte)', b.attrs['aria-label'] === '🧪', b.attrs); }
{ const s = el('SPAN', { attrs: { onclick: 'x()' } }); nommerIcone(s, '✎');
  vrai('un span qui agit reçoit son nom ET le rôle de bouton', s.attrs['aria-label'] === 'Modifier' && s.attrs.role === 'button', s.attrs); }
{ const b = el('BUTTON', { attrs: { 'aria-label': 'Modifier le client' } }); nommerIcone(b, '✎');
  vrai('⛔ un aria-label posé par l’application n’est jamais remplacé', b.attrs['aria-label'] === 'Modifier le client' && !b.hasAttribute('title'), b.attrs); }
{ const b = el('BUTTON', { attrs: { title: 'Poser un mot de passe' } }); nommerIcone(b, '🔑');
  vrai('⛔ un title posé par l’application non plus', b.attrs.title === 'Poser un mot de passe' && !b.hasAttribute('aria-label'), b.attrs); }
{ const b = el('BUTTON', { attrs: { 'aria-labelledby': 'x' } }); nommerIcone(b, '✎');
  vrai('⛔ ni un aria-labelledby', !b.hasAttribute('aria-label'), b.attrs); }
{ const b = el('BUTTON', { attrs: { 'data-tip': 'Semaine précédente' } }); nommerIcone(b, '←');
  vrai('⛔ une infobulle data-tip est laissée à nommer() — c’est LE nom écrit par l’application', !b.hasAttribute('aria-label') && !b.hasAttribute('title'), b.attrs); }
{ const b = el('BUTTON', { classes: ['menu-btn'] }); nommerIcone(b, '☰');
  vrai('⛔ le bouton du menu est laissé à nommer() (« Ouvrir le menu »)', !b.hasAttribute('aria-label'), b.attrs); }
{ const b = el('BUTTON', { texte: ' Supprimer ' }); nommerIcone(b, '🗑');
  vrai('⛔ une commande qui garde un texte n’est pas renommée : son texte EST son nom', !b.hasAttribute('aria-label'), b.attrs); }
{ traduire = s => ({ Modifier: 'Edit' })[s] || s; const b = el('BUTTON'); nommerIcone(b, '✎'); traduire = null;
  vrai('le nom suit la langue de l’interface (window.t)', b.attrs['aria-label'] === 'Edit', b.attrs); }
{ const b = el('BUTTON'); b.closest = () => null; nommerIcone(b, '✎');
  vrai('un émoji hors de toute commande : rien à nommer', !b.hasAttribute('aria-label')); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
