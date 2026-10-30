/* ══ lot h04 / appareils#2 — « ＋ Ajouter un point de livraison (même commande) » TIENT DANS SON BOUTON ══
   Trouvé par l'audit des appareils (Android 360 px) : `.btn` est en `white-space:nowrap`, le libellé fait 353 px
   pour un bouton de 322 — le texte sortait du bouton (coupé à droite, « …même command ») et poussait la fenêtre
   « Nouveau bon » de 12 px vers la droite (`overlay.scrollLeft = 12`). Rien ne « dépassait » au sens d'un élément :
   c'est le TEXTE qui sortait de sa boîte, donc aucun audit de débordement d'élément ne le voyait.

   Ce banc EXÉCUTE la vraie `renderBonSites` (bac à sable, `$` simulé) et lit le bouton qu'elle écrit, puis rejoue
   la règle de feuille qui le complète (`.btn.sm.bon-site-ajout`) : le `padding:0 …!important` de `.btn.sm` collerait
   sinon deux lignes de texte aux bords. La preuve au pixel (360 et 320 px, jour et nuit : overlay.scrollLeft = 0,
   modal.scrollWidth <= clientWidth, bouton non coupé) vit dans
   scratchpad/gestion/correctifs/h04/sonde-bon.js (BANC_SITE=<worktree> sur beta.html).
   BANC_FICHIER : une copie mutée d'app.html, pour éprouver ce banc sans toucher au fichier du dépôt. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(process.env.BANC_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
// ⛔ ne retirer que les blocs qui COMMENCENT une ligne (CLAUDE.md : le motif naïf avale 107 000 caractères d'app.html)
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function corps(nom) { const m = new RegExp('(?:async\\s+)?function ' + nom + '\\(').exec(SRC); if (!m) return '';
  let i = SRC.indexOf('{', m.index), p = 0, q = null;
  for (let k = i; k < SRC.length; k++) { const c = SRC[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'" ) { q = c; continue; }
    if (c === '`') { // un gabarit : on saute jusqu'à sa fin en comptant ses ${ } imbriqués
      let d = 0; for (k++; k < SRC.length; k++) { if (SRC[k] === '\\') { k++; continue; } if (SRC[k] === '$' && SRC[k + 1] === '{') { d++; k++; continue; } if (SRC[k] === '}' && d) { d--; continue; } if (SRC[k] === '`' && !d) break; }
      continue; }
    if (c === '{') p++; else if (c === '}') { p--; if (!p) return SRC.slice(m.index, k + 1); } }
  return ''; }

console.log('— renderBonSites, exécutée —');
const f = corps('renderBonSites');
vrai('renderBonSites est trouvée', f.length > 200);
function rendre(sites) {
  const el = { innerHTML: '' };
  const W = { bonSites: sites, $: () => el, esc: s => String(s == null ? '' : s), exemple: () => 'Nom du site (ex : CAZABOX ST PORCHAIRE)' };
  vm.createContext(W);
  try { vm.runInContext(f + '\nrenderBonSites();', W); } catch (e) { return { err: String(e) }; }
  return { html: el.innerHTML };
}
for (const [nom, sites] of [['un point', [{ nom: '', adresse: '', cp: '', ville: '', contact: '', tel: '' }]],
  ['deux points', [{ nom: 'A', adresse: '', cp: '', ville: '', contact: '', tel: '' }, { nom: 'B', adresse: '', cp: '', ville: '', contact: '', tel: '' }]]]) {
  const r = rendre(sites);
  vrai(nom + ' : la fonction s\'exécute', !r.err, r.err);
  const m = /<button[^>]*>＋ Ajouter un point de livraison \(même commande\)<\/button>/.exec(r.html || '');
  vrai(nom + ' : le bouton « Ajouter un point de livraison » est écrit', !!m);
  const b = m ? m[0] : '';
  vrai(nom + ' : son libellé peut passer à la ligne (white-space:normal en ligne, contre le nowrap de .btn)', /style="[^"]*white-space:\s*normal/.test(b), b.slice(0, 200));
  vrai(nom + ' : il porte la classe de la règle de feuille (rembourrage vertical)', /class="[^"]*\bbon-site-ajout\b/.test(b), b.slice(0, 200));
  vrai(nom + ' : il garde sa pleine largeur et son libellé centré', /width:100%/.test(b) && /justify-content:center/.test(b));
}

console.log('— la feuille —');
const regle = /\.btn\.sm\.bon-site-ajout\s*\{([^}]*)\}/.exec(SRC);
vrai('la règle .btn.sm.bon-site-ajout existe', !!regle);
const dec = regle ? regle[1] : '';
vrai('elle laisse le libellé passer à la ligne (white-space:normal)', /white-space:\s*normal/.test(dec), dec);
vrai('elle redonne de l\'air en haut et en bas, en !important (le padding de .btn.sm l\'est)', /padding:\s*[1-9]\d*px\s+\d+px\s*!important/.test(dec), dec);
vrai('la hauteur suit le texte (height:auto) : deux lignes ne sont pas rognées', /height:\s*auto/.test(dec), dec);
// la règle qu'elle surcharge est bien en !important : sans le !important de la nôtre, elle ne gagnerait pas
vrai('la règle surchargée (.btn.sm) impose bien son padding en !important', /\.btn\.sm\{[^}]*padding:\s*0 12px\s*!important/.test(SRC));
// aucune règle de feuille ne force `nowrap` sur un .btn.sm en !important, qui reprendrait le dessus sur le style en ligne
const forceNowrap = [...SRC.matchAll(/([^{}]*\.btn[^{}]*)\{[^}]*white-space:\s*nowrap\s*!important[^}]*\}/g)].map(m => m[1].trim());
vrai('aucune règle ne force white-space:nowrap!important sur un .btn (elle vaincrait le style en ligne)', forceNowrap.length === 0, forceNowrap);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
