/* ══ LE FORMULAIRE « NOUVEAU BON » AU TÉLÉPHONE — g03, achats#11 et achats#12 ═══════════════════════════════
   Mesuré au navigateur (scratchpad/gestion/correctifs/g03/sonde-bonform.js) :
   · achats#11 — « Ma commande » : le tableau garde ses 840 px (994 mesurés) dans un conteneur qui défile ; à l'ouverture
     sur iPhone on ne voyait que PRODUIT et CARTONS (sur Android, que PRODUIT), sans repère de défilement : U/CTN, UNITÉS,
     TOTAL et COMMENTAIRE hors écran. Sur iPad portrait, TOTAL et COMMENTAIRE aussi ;
   · achats#12 — le libellé « N° » restait seul au-dessus de sa valeur (iPhone, Android, iPad ET Mac) : `.frow>input{width:100%}`
     renvoyait le champ à la ligne ; et « 💾 Garder de côté » (125 px de contenu) dans un bouton de 111 px recouvrait le
     « F » d'« Aperçu PDF » — le contenu d'un bouton centré déborde des deux côtés.
   Ce que le banc fait : il EXÉCUTE la vraie `bonQtyList` (extraite d'app.html, dans un bac à sable) et lit le balisage ET la
   feuille qu'elle écrit ; il lit les règles `.frow` de la feuille et le pied de `renderBonLignes`.
   La preuve au pixel : sonde-bonform.js (rangées « N° » sur la même ligne, aucun bouton qui se recouvre, tous les champs
   des quantités atteignables à 360, 390 et 820 px). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.resolve(__dirname, '..', process.env.APP_FICHIER || 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* le texte d'une construction jusqu'à SON accolade fermante — pile de modes : code, chaîne, gabarit (avec ses ${…}) */
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  const pile = ['code', '{'];
  for (let k = SRC.indexOf('{', i) + 1; k < SRC.length; k++) {
    const mode = pile[pile.length - 1], c = SRC[k];
    if (mode === "'" || mode === '"') { if (c === '\\') k++; else if (c === mode) pile.pop(); continue; }
    if (mode === '`') { if (c === '\\') k++; else if (c === '`') pile.pop(); else if (c === '$' && SRC[k + 1] === '{') { pile.push('{'); k++; } continue; }
    if (c === "'" || c === '"' || c === '`') pile.push(c);
    else if (c === '{') pile.push('{');
    else if (c === '}') { pile.pop(); if (pile.length === 1) return SRC.slice(i, k + 1); }
  }
  return '';
}

console.log('── 1242 · 1. la vraie bonQtyList : chaque champ porte son étiquette, la feuille met les lignes en cartes ──');
const els = {};
const ctx = {
  $: (id) => els[id] || (els[id] = { innerHTML: '', textContent: '' }),
  document: { querySelector: () => null },
  bonLignes: [{ produitId: 'p1', designation: 'ALTA 7000', reference: 'R1', cartons: 1, upc: 6, quantite: 6 }, { produitId: '', designation: 'Libre', cartons: 0, upc: 0, quantite: 3 }],
  fournName: () => '', bonFourName: () => 'ORCAD', fourColor: () => 'red', encreDonnee: () => 'red', esc: (s) => String(s ?? ''),
  bonQtySum: () => {}, bonQtyTot: () => {}, bonQteTxt: () => '', bonQteTotTxt: () => '', _bqtyGroups: [], parseInt,
};
vm.createContext(ctx);
vm.runInContext(bloc('function bonQtyList('), ctx);
vrai('bonQtyList est extraite', typeof ctx.bonQtyList === 'function');
els['bqty-wrap'] = { innerHTML: '' };
ctx.bonQtyList();
const html = els['bqty-wrap'].innerHTML;
vrai('la liste a rendu un tableau', /<table>/.test(html) && html.length > 500, html.length);
for (const l of ['CARTONS', 'U/CTN', 'UNITÉS', 'TOTAL', 'COMMENTAIRE'])
  vrai('la cellule « ' + l + ' » porte son étiquette (data-l) — l\'en-tête disparaît sur petit écran', new RegExp('<td data-l="' + l.replace('/', '\\/') + '"').test(html));
vrai('la cellule de commentaire est reconnaissable (`bq-c`) et celle de suppression aussi (`bq-x`)', /<td data-l="COMMENTAIRE" class="bq-c">/.test(html) && /<td class="bq-x">/.test(html));
const style = (/<style>([\s\S]*?)<\/style>/.exec(html) || [])[1] || '';
const media = (/@media\(max-width:(\d+)px\)\{([\s\S]*)\}\s*$/.exec(style.trim()) || []);
vrai('la feuille embarquée porte un @media (max-width:900px)', +media[1] === 900, media[1]);
const m = media[2] || '';
vrai('… l\'en-tête du tableau disparaît (les étiquettes le remplacent)', /#bqty-wrap thead\{display:none\}/.test(m));
vrai('… le tableau perd sa largeur minimale de 840 px', /#bqty-wrap table\{min-width:0\}/.test(m));
vrai('… chaque ligne devient une carte qui passe à la ligne (flex + wrap)', /#bqty-wrap tr\{display:flex;flex-wrap:wrap/.test(m));
vrai('… chaque cellule affiche son étiquette (attr(data-l))', /#bqty-wrap td\[data-l\]::before\{content:attr\(data-l\)/.test(m));
vrai('… le produit prend toute la ligne, le commentaire aussi', /td:first-child\{flex:1 0 100%\}/.test(m) && /td\.bq-c\{flex:1 1 100%\}/.test(m));
vrai('au-dessus de 900 px, le tableau garde sa largeur d\'ordinateur (840 px)', /#bqty-wrap table\{[^}]*min-width:840px/.test(style));

console.log('── 1242 · 2. le champ « N° » se range à côté de son libellé ──');
const form = bloc('function formBon(');
vrai('formBon est trouvée', form.length > 500, form.length);
vrai('le N° du bon est un champ posé DIRECTEMENT après son libellé (le cas que la règle doit couvrir)', /<span class="frow-lbl mono"[^>]*>N°<\/span><input name="numero"/.test(form));
vrai('le champ numéro garde ses attributs (required, mono, text-align:right) — lot Numéros', /<input name="numero" required class="mono" style="text-align:right"/.test(form));
const i = SRC.indexOf('.frow>.frow-lbl+input:not([type=checkbox])');
const r = i < 0 ? '' : SRC.slice(i, SRC.indexOf('}', i));
vrai('une règle range le champ qui suit son libellé sur la même ligne (flex, base 140 px, largeur auto)', /flex:\s*1\s+1\s+140px/.test(r) && /width:\s*auto/.test(r) && /min-width:\s*0/.test(r), r);
vrai('… elle exclut cases, boutons radio, fichiers, curseurs et couleurs', ['checkbox', 'radio', 'file', 'range', 'color'].every(t => r.includes(':not([type=' + t + '])')));
vrai('… et elle est plus spécifique que `.frow>input{width:100%}` qu\'elle défait', /\.frow>input,\.frow>select,\.frow>textarea\{[^}]*width:100%/.test(SRC) && (r.match(/[.:\[]/g) || []).length > 3);

console.log('── 1242 · 3. le pied Aperçu / Garder de côté / Partager ──');
const lignes = bloc('function renderBonLignes(');
vrai('renderBonLignes est trouvée', lignes.length > 500, lignes.length);
const boutons = [...lignes.matchAll(/class="btn ghost sm" style="flex:1;justify-content:center;min-width:(\d+)px" onclick="(bonPdfDraft|bonGarder|bonShareDraft)\(\)"/g)];
vrai('les trois boutons du pied sont là', boutons.length === 3, boutons.map(b => b[2]));
vrai('chacun garde 140 px au moins : « 💾 Garder de côté » (≈ 125 px) ne déborde plus sur son voisin', boutons.length === 3 && boutons.every(b => +b[1] >= 140), boutons.map(b => b[1]));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
