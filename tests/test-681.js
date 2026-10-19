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

/* 2. (18 octobre 2026) L'ancien Courrier a été remplacé par OP Courrier : un MODULE dans un arbre d'ombre, qui n'a plus ni `.mail-rows` ni `.reg-tete` à la portée
      de la feuille de la Tour. Le rattrapage `.mail-rows .reg-tete{top:0}` n'a donc plus rien à viser et a été retiré avec l'écran ; ce banc garde qu'il est parti
      (une règle qui ne vise plus rien se prend pour une garde) et que la zone du module, elle, existe. */
const code = tour.replace(/\/\*[\s\S]*?\*\//g, ' ');
v('l\'ancien conteneur de défilement du Courrier (.mail-rows) et son rattrapage ne survivent pas à l\'écran', /\.mail-rows|\.mail-lect/.test(code), false);
v('la zone du module existe (.courrier-zone) et c\'est elle qui reçoit la hauteur', /\.courrier-zone\{[^}]*min-height/.test(code) && /function courrierAjuster\(/.test(code), true);

/* ⛔ Le rattrapage doit rester PLUS SPÉCIFIQUE, jamais réécrit en `.reg-tete{top:0}` tout
   court : posé à égalité, il annulerait le décalage sur TOUTE la Tour et les titres de
   groupe repasseraient sous la barre du haut sur les neuf autres écrans. */
/* Un sélecteur NU est précédé d'une fin de règle ou d'un saut de ligne ; le rattrapage, lui,
   est précédé d'une ESPACE (« .mail-rows .reg-tete »). C'est ce qui les distingue. */
const resets = (tour.match(/[}\n;]\s*\.reg-tete\{top:0\}/g) || []).length;
v('⛔ aucun `.reg-tete{top:0}` nu (il casserait les neuf autres écrans)', resets, 0);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
