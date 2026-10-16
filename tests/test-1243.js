/* ══ LA COLONNE DES MONTANTS ET LE CHAMP DE RECHERCHE — g03, accueil#9 et technicien#13 ═════════════════════
   Mesuré au navigateur (scratchpad/gestion/correctifs/g03/sonde-stats.js, sonde-recherche.js) :
   · Statistiques > Top clients : `.bar-val` était fixe à 64 px. « 1 055,00 € » passait sur deux lignes (« € » seul dessous),
     « 12 345,67 € » dépassait de 6 px, « 123 456,78 € » de 14 px, « 118 518 518,52 € » de 46 px — au-delà de la carte (texte
     jusqu'à x = 395 pour une carte qui s'arrête à 374 sur un iPhone). Après : une seule ligne, dans la carte, aux quatre
     tailles d'appareil ; la barre (`flex:1`) cède la place (35 px au pire sur Android avec 118 518 518,52 €) ;
   · Produits (technicien, iPhone) : « Rechercher un produit, une référence, un fournisseur… » (441 px) dans un champ de
     358 px (16 px de marge) était coupé net (`text-overflow:clip`) : « …une référence, ur ». Après : « …référence,… ».
   Ce que le banc garde : la CASCADE finale, pas une phrase — il relève TOUTES les règles de la feuille qui posent une largeur
   à `.bar-val` ou un `text-overflow` à `.search-inp`, et aucune ne doit défaire le correctif ; et il exécute la règle
   « une valeur s'écrit sur une ligne » sur les vrais montants que l'application formate (`eur`, extraite et jouée).
   La preuve au pixel : sonde-stats.js et sonde-recherche.js.                                                     */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.resolve(__dirname, '..', process.env.APP_FICHIER || 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* toutes les règles dont le sélecteur CONTIENT `sel` : [{ sel, corps }] — on part de chaque accolade ouvrante, jamais d'une liste écrite à la main */
function reglesContenant(motif) {
  const res = []; let i = -1;
  while ((i = SRC.indexOf('{', i + 1)) >= 0) {
    const d = Math.max(SRC.lastIndexOf('}', i), SRC.lastIndexOf('{', i - 1), SRC.lastIndexOf(';', i), SRC.lastIndexOf('>', i), SRC.lastIndexOf('\n', i - 1));
    const sel = SRC.slice(d + 1, i).trim(); const fin = SRC.indexOf('}', i);
    if (motif.test(sel) && fin > 0) res.push({ sel, corps: SRC.slice(i + 1, fin) });
  }
  return res;
}

console.log('── 1243 · 1. `.bar-val` : plancher de 64 px, largeur à son contenu, jamais coupée ──');
const bv = reglesContenant(/^\.bar-val$/);
vrai('la règle de base de `.bar-val` est trouvée', bv.length === 1, bv.length);
const c = bv[0] ? bv[0].corps : '';
vrai('plus de largeur fixe de 64 px (`width:64px`)', !/(^|;)\s*width:\s*64px/.test(c), c);
vrai('la largeur suit le contenu (`width:auto`) avec 64 px de plancher (`min-width:64px`)', /(^|;)\s*width:\s*auto/.test(c) && /min-width:\s*64px/.test(c), c);
vrai('un montant ne se coupe pas (`white-space:nowrap`)', /white-space:\s*nowrap/.test(c), c);
vrai('la colonne ne rétrécit pas sous son contenu (`flex-shrink:0`) : c\'est la barre qui cède', /flex-shrink:\s*0/.test(c));
const barre = reglesContenant(/^\.bar-track$/)[0];
vrai('la barre est la colonne qui cède (`flex:1`, sans largeur propre)', barre && /flex:\s*1/.test(barre.corps) && !/(^|;)\s*width:/.test(barre.corps), barre && barre.corps);
const toutesBarVal = reglesContenant(/\.bar-val\b/).filter(r => /(^|;)\s*width:\s*\d+px/.test(r.corps));
vrai('aucune autre règle de la feuille ne re-fixe la largeur de `.bar-val`', toutesBarVal.length === 0, toutesBarVal.map(r => r.sel));
vrai('la suite de la feuille ne remet pas `white-space:normal` sur `.bar-val`', reglesContenant(/\.bar-val\b/).every(r => !/white-space:\s*normal/.test(r.corps)));

console.log('── 1243 · 2. le vrai montant formaté par `eur` tient dans la colonne qu\'on lui donne ──');
const iEur = SRC.indexOf('const eur = n =>'), fEur = iEur < 0 ? -1 : SRC.indexOf("' €'; };", iEur);
vrai('la fonction `eur` est trouvée dans app.html', iEur > 0 && fEur > iEur, [iEur, fEur]);
const ctx = { Intl, Number, String, Math, parseFloat, isNaN };
vm.createContext(ctx);
let eur = null;
try { vm.runInContext('let _NF; ' + SRC.slice(iEur, fEur + 8) + '; this.eur = eur;', ctx); eur = ctx.eur; } catch (e) { vrai('`eur` s\'exécute dans le bac à sable', false, String(e.message)); }
vrai('`eur` est une fonction exécutable', typeof eur === 'function');
if (typeof eur === 'function') {
  const m = eur(118518518.52).replace(/[  ]/g, ' ');
  vrai('eur(118518518.52) rend « 118 518 518,52 € »', m === '118 518 518,52 €', m);
  /* la largeur utile à la colonne : Space Mono 13 px gras ≈ 7,8 px par signe — mesuré : 125 px pour ce montant, 78 pour « 1 055,00 € » */
  const largeur = s => Math.ceil(String(s).length * 7.8);
  vrai('… il lui faut plus de 64 px (la largeur fixe d\'avant le coupait de 46 px), et « 1 055,00 € » aussi (78 px)', largeur(m) > 64 && largeur(eur(1055)) > 64, [largeur(m), largeur(eur(1055))]);
}

console.log('── 1243 · 3. `.search-inp` : un libellé trop long finit par « … » ──');
const si = reglesContenant(/^\.search-inp$/);
vrai('la règle de base de `.search-inp` est trouvée (une seule)', si.length === 1, si.length);
vrai('`.search-inp` porte `text-overflow:ellipsis`', si[0] && /text-overflow:\s*ellipsis/.test(si[0].corps), si[0] && si[0].corps);
const ph = reglesContenant(/^\.search-inp::placeholder$/);
vrai('son `::placeholder` aussi (Firefox ne le lit que là)', ph.length === 1 && /text-overflow:\s*ellipsis/.test(ph[0].corps), ph.map(r => r.corps));
const defaits = reglesContenant(/search-inp/).filter(r => /text-overflow:\s*(clip|initial|unset)/.test(r.corps));
vrai('aucune règle de la feuille ne remet `text-overflow:clip` sur un champ de recherche', defaits.length === 0, defaits.map(r => r.sel));
vrai('le champ de Produits est bien un `.search-inp` (celui de la capture)', /<input class="search-inp" id="prd-search" placeholder="Rechercher un produit, une référence, un fournisseur…"/.test(SRC));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
