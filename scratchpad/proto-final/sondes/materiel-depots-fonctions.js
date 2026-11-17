// Matériel, étape 3 (Dépôts et camions) — UNE définition par fonction, et plus rien de l'ancienne chaîne (trois vueBoxes, deux lieuFiche, deux réassorts, bxAFaire, bxInv*, LIEU_IC).
// Lit le TEXTE de la page : commentaires de bloc en début de ligne et lignes « // » retirés AVANT de chercher (un motif vise du code, jamais une phrase).
// Usage : node materiel-depots-fonctions.js [fichier]   → « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const fs = require('fs'), path = require('path');
const f = process.argv[2] || path.join(__dirname, '..', '..', '..', 'apercu', 'prototype-op-gestion.html');
const code = fs.readFileSync(f, 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0; const v = (n, c, d) => { if (c) { ok++; console.log('  ✓', n); } else { ko++; console.log('  ✗', n, d !== undefined ? '→ ' + d : ''); } };
const defs = nom => { const e = nom.replace(/\$/g, '\\$');
  return (code.match(new RegExp('^function ' + e + '\\(', 'gm')) || []).length + (code.match(new RegExp('^(?:const|let|var) ' + e + '\\s*=', 'gm')) || []).length + (code.match(new RegExp('^' + e + '\\s*=\\s*function', 'gm')) || []).length
    + (code.match(new RegExp('\\(\\(\\) => \\{ const [a-z0-9]+ = ' + e + '; ' + e + ' = function', 'gm')) || []).length + (code.match(new RegExp('if \\(typeof ' + e + ' === \'function\'\\) \\(\\(\\) => \\{ const [a-z0-9]+ = ' + e + '; ' + e + ' = function', 'gm')) || []).length; };
const UNE = ['vueBoxes', 'bxFiche', 'lieuFiche', 'bxTransferts', 'bxMaj', 'bxTransfertsOk', 'bxReassort', 'bxPreparer', 'bxPreparerReserve', 'bxModifier', 'bxModVue', 'bxModOk', 'bxFermer', 'bxFermerOk', 'bxNouveau', 'bxNouVue', 'bxNouOk',
  'mdCarte', 'mdBandeau', 'mdCompte', 'mdMenuPlus', 'mdMenuFiche', 'mdFermes', 'mdRouvrir', 'mdLigne', 'mdLigneAvant', 'mdAvant', 'mdRafraichir', 'mdMettre', 'mdAjouter', 'mdCmdAdd', 'mdDotation', 'mdDotationOk', 'camionsARemplir', 'bxPlan', 'bxBesoins', 'bxReservesBasses', 'bxReserveGroupe'];
for (const nom of UNE) v(nom + ' : une définition', defs(nom) === 1, defs(nom));
v('population : ' + UNE.length + ' fonctions contrôlées', UNE.length >= 38);
// l'ancienne chaîne a disparu : aucun appel, aucune déclaration
const MORT = ['LIEU_IC', 'bxAFaire', 'bxCarte', 'bxLigne', 'bxAnnuler', 'bxInv', 'bxInvChoix', 'bxInvVue', 'bxInvMaj', 'bxInvOk', 'bxInvLignes', 'bxInvEcarts', 'bxCompte', 'bxACompter', 'bxDernierComptage', 'stkReassort', 'stkVueInventaire', 'bxMonCamion'];
for (const nom of MORT) { const d = (code.match(new RegExp('\\b' + nom + '\\b', 'g')) || []).length; v(nom + ' : disparue (aucune occurrence dans le code)', d === 0, d + ' occurrences'); }
for (const a of ['data-bxl="rea"', 'data-bxl="comp|', 'data-bxl="prep"', 'data-bxl="resv|', 'data-bxl="inv', 'data-bxl-ou', 'data-bxl-ck', 'data-bxl="invchoix"', 'data-sk="reassort"', 'data-bx="nouveau"', 'class="carte bx-c"', 'class="bx-grille"', 'bxl-af'])
  v('plus de bouton ni de classe ancienne ' + a, !code.includes(a), code.split(a).length - 1);
v('plus d\'émojis de lieu (🏬 🚐 📦) dans le code', !/[🏬🚐]/u.test(code.slice(code.indexOf('function vueBoxes('), code.indexOf('function vueBoxes(') + 20000)));
// le conteneur de la partie Véhicule de « Mon camion » (autre agent) est toujours là : on n'y a pas touché
v('« Mon camion » garde son conteneur id="mc-vehicule"', /id="mc-vehicule"/.test(code));
// les trois portes d'écriture de Dépôts passent par stkAppliquer ET gardent la photo (Annuler), jamais d'écriture directe
const corps = nom => { const i = code.indexOf('function ' + nom + '('); const j = code.indexOf('\nfunction ', i + 10); return code.slice(i, j < 0 ? i + 4000 : j); };
for (const nom of ['bxTransfertsOk', 'mdMettre', 'bxFermerOk']) { const c = corps(nom); v(nom + ' : prend la photo du stock avant d\'écrire et rend « Annuler » (sxPhoto puis sxToast)', c.includes('sxPhoto()') && c.includes('sxToast('), c.length); }
v('mdCmdAdd et mdDotationOk : même chose (photo, puis sxToast)', corps('mdCmdAdd').includes('sxPhoto()') && corps('mdCmdAdd').includes('sxToast(') && corps('mdDotationOk').includes('sxPhoto()') && corps('mdDotationOk').includes('sxToast('));
v('la photo du stock garde aussi la liste à bord, le nom et la fermeture des lieux (sinon « Annuler » ne rend pas la liste)', /lx:LIEUX\.map\(l => \[l, l\.cible, l\.dotP, l\.nom, l\.resp, l\.note, l\.adr, l\.ferme\]\)/.test(code) && /p\.lx\.forEach/.test(code));
console.log(`\n== ${ok} ✓ · ${ko} ✗`); process.exit(ko ? 1 : 0);
