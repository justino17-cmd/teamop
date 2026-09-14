/* ══ COURRIER AU TÉLÉPHONE : L'EN-TÊTE DE GROUPE RECOUVRAIT LE PREMIER MESSAGE ══════════
   Capture de Justin, 14 septembre 2026 : dans « Non rattachées », le premier message est
   coupé en deux — on ne lit que la fin de son objet (« …34oc » »), le reste est sous une
   bande grise. Sans avoir rien fait défiler.

   La cause, isolée au navigateur et pas déduite : `.reg-tete{top:56px}` (bloc téléphone).
   Ce décalage existe pour qu'un titre de groupe s'arrête SOUS la barre du haut, elle-même
   collée à la page. Mais `.mail-rows` est son PROPRE conteneur de défilement
   (overflow-y:auto) : il n'y a aucune barre à contourner dedans, donc les 56 px ne décalent
   plus rien — ils POUSSENT l'en-tête, fond opaque compris, par-dessus la liste.

   MESURÉ (scratchpad/sonde-courrier-tel2.js, Chromium 390×844, thème jour) :
     avant           en-tête bas 400 · première ligne haut 355  →  +45 px recouverts
     en `static`     en-tête bas 348 · première ligne haut 355  →   −7 px (sain)
     après correctif en-tête bas 348 · première ligne haut 355  →   −7 px
     et le collage SERT toujours : après défilement dans la liste, en-tête top 263 = haut
     de la liste 263.

   La géométrie ne s'exécute pas en Node — ce banc tient les trois conditions SANS lesquelles
   le correctif redeviendrait faux, en relisant le vrai fichier. */
const fs = require('fs'), path = require('path');
const tour = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 681 · Courrier au téléphone : l\'en-tête ne recouvre plus le premier message ──');

/* 1. Le décalage de 56 px existe toujours — c'est LUI qui rend le rattrapage nécessaire.
      S'il disparaissait un jour, ce banc doit le dire plutôt que de garder une règle
      devenue inutile et incomprise. */
v('le décalage de 56 px du bloc téléphone est toujours là', /\.reg-tete\{top:56px\}/.test(tour), true);

/* 2. `.mail-rows` défile toujours tout seul. Si ce n'était plus le cas, l'en-tête collerait
      de nouveau à la page et le rattrapage deviendrait faux dans l'autre sens. */
v('.mail-rows est toujours son propre conteneur de défilement',
  /\.mail-rows\{overflow-y:auto;flex:1\}/.test(tour), true);

/* 3. Le rattrapage est posé, et sa spécificité BAT celle du bloc téléphone — c'est le point
      qui compte : deux classes contre une, donc l'ordre des règles n'y change rien. */
v('l\'en-tête colle à 0 à l\'intérieur de la liste de courrier',
  /\.mail-rows \.reg-tete\{top:0\}/.test(tour), true);

/* ⛔ Le rattrapage doit rester PLUS SPÉCIFIQUE, jamais réécrit en `.reg-tete{top:0}` tout
   court : posé à égalité, il annulerait le décalage sur TOUTE la Tour et les titres de
   groupe repasseraient sous la barre du haut sur les neuf autres écrans. */
/* Un sélecteur NU est précédé d'une fin de règle ou d'un saut de ligne ; le rattrapage, lui,
   est précédé d'une ESPACE (« .mail-rows .reg-tete »). C'est ce qui les distingue. */
const resets = (tour.match(/[}\n;]\s*\.reg-tete\{top:0\}/g) || []).length;
v('⛔ aucun `.reg-tete{top:0}` nu (il casserait les neuf autres écrans)', resets, 0);

/* 4. Ce qui N'EST PAS un défaut, et qu'on ne doit pas « corriger » par erreur : un message
      non lu déroule son objet sur deux lignes, les autres le tronquent. C'est voulu, et
      `-webkit-line-clamp` n'agit que parce que `.reg-l2` porte `overflow:hidden` — la même
      étourderie que celle qui a fait déborder l'en-tête. */
v('un message non lu montre son objet sur deux lignes',
  /\.reg-l\.cli\.att \.reg-l2\{white-space:normal;display:-webkit-box;-webkit-line-clamp:2/.test(tour), true);
v('… et le clamp tient parce que .reg-l2 masque son débordement',
  /\.reg-l2\{[^}]*overflow:hidden[^}]*\}/.test(tour), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
