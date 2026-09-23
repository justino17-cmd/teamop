/* ══ LA CHARPENTE SUR CHAQUE APPAREIL (v728) ══════════════════════════════════════════════
   Justin, 23 septembre 2026 : « vérifie l'application au complet… pour tous les appareils ».
   Les audits ne tournaient que sur deux profils (iPhone Safari, Mac Safari). Étendus à douze
   (scratchpad/profils.js), ils ont trouvé des défauts qu'aucun des deux ne pouvait voir :

   1. TABLETTE — un iPad se déclare « mobile » : la barre d'onglets s'affichait ET le menu
      latéral, permanent dès 781 px. Deux navigations, la pilule posée sur la carte
      utilisateur du menu (« Justin » et « Accueil » superposés), et ses décalages (bornés au
      téléphone) laissaient la bulle d'aide et « Voir sur la carte » DANS la barre.
   2. AU DOIGT — le menu s'écrit en 15,5 px : « Consommation produits » passait sur deux
      lignes à 258 et 262 px. Et la barre des jours du planning, l'épingle de note et le
      segmenté de période répondaient sur 11 à 30 px sur tablette : leurs planchers étaient
      bornés à la LARGEUR d'un téléphone, pas au doigt.
   3. PETIT TÉLÉPHONE — sur un Android de 360 px et un iPhone SE, le segmenté de période
      poussait toute la page à 382 px. Sur iPad portrait, deux segmentés de filtres (Produits,
      Bons) la poussaient à 840 et 898 : la règle « qu'ils tiennent sur une ligne » était
      ÉCRITE dans le commentaire de `SEG_MAX`, jamais codée.
   4. PARTOUT HORS TÉLÉPHONE — la bulle d'aide cachée derrière « Voir sur la carte ».
   5. LES ÉCRANS CARTE — `.content-map{padding:0!important}` retirait le dégagement de la barre
      d'onglets : la dernière carte restait dessous, même page tout en bas.

   Preuve de bout en bout au navigateur : `scratchpad/sonde-appareils.js` (12 appareils ×
   41 rubriques : largeur de page = largeur de l'appareil, aucun élément fixe posé sur un
   autre, une seule navigation, le menu sur une ligne). Ici : ce qui peut se lire et
   s'EXÉCUTER hors navigateur — les règles à leur place (dans le bon bloc @media), l'écriture
   du segmenté, et `segTient`, extraite et jouée sur des géométries fabriquées.            */
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
/* Le bloc @media (ou @container) qui CONTIENT une position donnée (par ses accolades), ou '' au premier niveau. */
function mediaDe(i) {
  let prof = 0, j = i;
  for (; j > 0; j--) { const c = SRC[j]; if (c === '}') prof++; else if (c === '{') { if (prof === 0) { const d = SRC.lastIndexOf('\n', j); const tete = SRC.slice(d + 1, j).trim();
    if (/^@(media|container)/.test(tete)) return tete; /* un sélecteur : on remonte d'un cran */ prof = 0; continue; } prof--; } }
  return '';
}
function regle(sel) { const i = SRC.indexOf(sel); return i < 0 ? null : { i, media: mediaDe(i) }; }

console.log('\n── 776 · 1. tablette : une seule navigation ──');
const tb = regle('html[data-kind="mobile"] .tabbar{display:none!important}');
vrai('population : la règle qui efface la barre d’onglets est trouvée', !!tb);
vrai('⛔ … elle vit dans @media (min-width:781px) — la largeur où le menu devient permanent', !!tb && /^@media \(min-width:781px\)/.test(tb.media), tb && tb.media);
const mb = regle('html[data-kind="mobile"] .menu-btn{display:none!important}');
vrai('… et le bouton du tiroir s’efface avec elle, au même endroit', !!mb && tb && mb.media === tb.media);
vrai('la barre s’affiche toujours pour un appareil « mobile » (téléphone)', /html\[data-kind="mobile"\] \.tabbar\{display:flex\}/.test(SRC));
const pad = regle('html[data-kind="mobile"] .content{padding-bottom:calc(var(--tabh) + 16px)}');
vrai('⛔ le dégagement de la barre ne vaut QUE là où elle est (≤ 780 px)', !!pad && /max-width:780px/.test(pad.media), pad && pad.media);
const carte = regle('html[data-kind="mobile"] .content.content-map{padding-bottom:calc(var(--tabh) + 16px)!important}');
vrai('⛔ les écrans Carte dégagent la barre d’onglets (le bord à bord ne retire plus le bas)', !!carte && /max-width:780px/.test(carte.media), carte && carte.media);

console.log('\n── 776 · 2. le menu au doigt, les fenêtres alignées ──');
const mw = regle('html[data-kind="mobile"] .sidebar{width:272px}');
vrai('⛔ au doigt (appareil « mobile »), le menu fait 272 px — à toute largeur', !!mw && mw.media === '', mw && mw.media);
vrai('… le bureau garde ses 258 px', /html\[data-kind="desktop"\] \.sidebar\{width:258px\}/.test(SRC));
const ovm = regle('html[data-kind="mobile"] .overlay.full{left:272px}'), ovd = regle('html[data-kind="desktop"] .overlay.full{left:258px}');
vrai('⛔ une fenêtre plein écran commence au bord RÉEL du menu (272 au doigt, 258 au bureau)',
  !!ovm && !!ovd && /min-width:781px/.test(ovm.media) && ovm.media === ovd.media);

console.log('\n── 776 · 3. les planchers tactiles suivent le DOIGT, pas la largeur ──');
const seg44 = regle('html[data-refonte] .tdb-seg span{min-height:44px;display:inline-flex;align-items:center}');
vrai('⛔ le segmenté de période prend 44 px au doigt, pas seulement sous 780 px', !!seg44 && /\(pointer:coarse\)/.test(seg44.media) && /max-width:780px/.test(seg44.media), seg44 && seg44.media);
for (const sel of ['html[data-refonte] .pld-j,html[data-refonte] .pld-note,html[data-refonte] .pld-lk{min-height:38px}',
  'html[data-refonte] .pld-nav u{width:38px;height:38px}',
  'html[data-refonte] .plg-pin{display:inline-flex;align-items:center;justify-content:center;min-width:38px;min-height:38px;vertical-align:middle}']) {
  const r = regle(sel);
  vrai('⛔ ' + sel.replace(/html\[data-refonte\] /g, '').slice(0, 44) + '… vit dans @media (pointer:coarse)', !!r && r.media === '@media (pointer:coarse)', r && r.media);
}

/* Trouvés par la passe SANS PLAFOND au téléphone (1 210 clics) : deux sous-vues qu'aucune passe
   plafonnée n'ouvrait. Même règle que `.tdb-jh` : un en-tête de jour qui ouvre ce jour est une
   commande ; la LARGEUR de la frise (18 px en « 3 mois »), elle, reste la décision écrite. */
const pgHd = regle('html[data-refonte] #content .pg-hd{min-height:38px;display:flex;flex-direction:column;justify-content:center}');
vrai('⛔ l’en-tête de jour du Planning général prend 38 px au doigt', !!pgHd && pgHd.media === '@media (pointer:coarse)', pgHd && pgHd.media);
const leg = regle('html[data-refonte] .plm-leg .lg.clic{min-height:38px;padding:0 12px}');
vrai('⛔ un technicien de la légende « Côte à côte » prend 38 px au doigt', !!leg && leg.media === '@media (pointer:coarse)', leg && leg.media);

console.log('\n── 776 · 4. le segmenté de période tient sur un petit téléphone ──');
const serre = regle('html[data-refonte] .tdb-seg span{padding-left:6px!important;padding-right:6px!important;font-size:11px}');
vrai('sous 440 px, le segmenté se resserre', !!serre && /max-width:440px/.test(serre.media), serre && serre.media);
const court = regle('html[data-refonte] .tdb-seg .sc{display:inline}');
vrai('sous 390 px, il prend le libellé court', !!court && /max-width:389px/.test(court.media), court && court.media);
/* ⛔ Le long ne part PAS en display:none : il sortirait aussi de ce que lit un lecteur d'écran, et
   le court y est caché (aria-hidden). Un aria-label sur un span sans rôle ne le remplaçait pas. */
const long = SRC.match(/html\[data-refonte\] \.tdb-seg \.sl\{([^}]*)\}/);
vrai('⛔ sous 390 px, le libellé long est masqué À L’ŒIL seulement (lu par un lecteur d’écran)',
  !!long && /position:absolute/.test(long[1]) && /clip:rect\(0 0 0 0\)/.test(long[1]) && /width:1px/.test(long[1])
  && /max-width:389px/.test(mediaDe(SRC.indexOf(long[0]))), long && long[1]);
vrai('⛔ … et aucune règle ne le passe en display:none', !/\.tdb-seg \.sl\{[^}]*display:none/.test(SRC));
vrai('… et le libellé court est caché partout ailleurs', /html\[data-refonte\] \.tdb-seg \.sc\{display:none\}/.test(SRC));
/* l'écriture RÉELLE du segmenté, exécutée */
const mSeg = SRC.match(/const seg=(\[\['jour'[\s\S]*?\.join\(''\));/);
vrai('population : l’écriture du segmenté est trouvée', !!mSeg);
if (mSeg) {
  const html = new Function('per', 'tdbPorteeSet', 'return ' + mSeg[1])('7', () => {});
  vrai('« Aujourd’hui » porte les deux libellés, le court masqué aux lecteurs d’écran',
    /<i class="sl">Aujourd’hui<\/i><i class="sc" aria-hidden="true">Auj\.<\/i>/.test(html));
  vrai('… le bouton ne s’en remet pas à un aria-label sur un span sans rôle : le long reste son texte',
    /<span class="" onclick="tdbPorteeSet\('jour'\)"><i class="sl">Aujourd’hui<\/i>/.test(html) && !/aria-label/.test(html));
  vrai('les autres choix restent des mots simples', />7 jours<\/span>/.test(html) && />Le mois<\/span>/.test(html));
  vrai('le choix actif garde sa classe', /<span class="on" onclick="tdbPorteeSet\('7'\)">7 jours<\/span>/.test(html));
}
vrai('le libellé court se traduit (anglais, espagnol)', /'Auj\.':'Today'/.test(SRC) && /'Auj\.':'Hoy'/.test(SRC));

console.log('\n── 776 · 5. un segmenté qui ne tient pas redevient une rangée de pastilles ──');
const mT = SRC.match(/function segTient\(g\)\{([\s\S]*?)\n\}/);
vrai('population : segTient est trouvée', !!mT);
if (mT) {
  const segTient = new Function('g', 'getComputedStyle', mT[1]);
  const faux = (largeur, parent, pg, pd) => ({ getBoundingClientRect: () => ({ width: largeur }), parentElement: { clientWidth: parent, _pg: pg, _pd: pd } });
  const gcs = p => ({ paddingLeft: p._pg + 'px', paddingRight: p._pd + 'px' });
  vrai('602 px dans une colonne de 548 à 24 px de marge (Bons, iPad portrait) : NE tient PAS', segTient(faux(602, 548, 24, 24), gcs) === false);
  vrai('544 px dans la même colonne (Produits) : ne tient pas non plus (500 utiles)', segTient(faux(544, 548, 24, 24), gcs) === false);
  vrai('273 px dans 390 − 32 : tient', segTient(faux(273, 390, 16, 16), gcs) === true);
  vrai('pile à la largeur utile (+1 d’arrondi) : tient', segTient(faux(501, 548, 24, 24), gcs) === true);
  vrai('une vue pas encore mesurée (largeur 0) : on ne décide rien sur du vide', segTient(faux(602, 0, 0, 0), gcs) === true);
}
const iI = SRC.indexOf('function segInit(');
const corpsInit = iI > 0 ? SRC.slice(iI, SRC.indexOf('\n}', iI)) : '';
vrai('⛔ segInit retire la classe quand un groupe de FILTRES ne tient pas', /fam\.sel==='\.filters' && !segTient\(g\)\)\{ g\.classList\.remove\('seg-on'\)/.test(corpsInit));
vrai('… le clic n’y pose plus de curseur', /if\(!g\.classList\.contains\('seg-on'\)\) return;/.test(corpsInit));
const iG = SRC.indexOf('function segGeste(');
vrai('… le glissement du doigt non plus', iG > 0 && /const debut=\(x,y\)=>\{\s*if\(!g\.classList\.contains\('seg-on'\)\) return;/.test(SRC.slice(iG, iG + 1200)));
const iR = SRC.indexOf('function segRepositionner(');
vrai('⛔ tourner la tablette RÉÉVALUE chaque groupe (segInit), pas seulement les segmentés', iR > 0 && /segInit\(document\)/.test(SRC.slice(iR, iR + 700)));

console.log('\n── 776 · 6. deux boutons flottants ne se couvrent plus, même sans barre ──');
const fab = regle('html[data-refonte] body:has(#assistant > .fab) .plm-fab{bottom:calc(24px + 58px + 10px)!important}');
vrai('⛔ « Voir sur la carte » monte au-dessus de la bulle d’aide À TOUTE LARGEUR (hors bloc téléphone)', !!fab && fab.media === '', fab && fab.media);
vrai('… et la règle du téléphone, plus précise, garde la main sous 780 px',
  /html\[data-refonte\] body\.rf-onglets:has\(#assistant > \.fab\) \.plm-fab\{\s*bottom:calc\(var\(--tabh\) \+ 10px \+ 58px \+ 10px\)!important\}/.test(SRC));

console.log('\n── 776 · 7. une rangée d’indicateurs ne force jamais ses colonnes ──');
/* Mesuré le 23 septembre 2026 (scratchpad/kpi-longs.js) : Pointage, Enveloppes et la fiche d'une
   enveloppe forçaient `repeat(3,1fr)`. Une valeur en 34 px gras ne se coupe pas : avec « 1523h30 »
   et « 12 345,67 € », la page passait à 444–547 px sur les trois téléphones et à 827 sur iPad.
   Même avec les données de démonstration (0h00), Pointage débordait à 360 px. */
const rangees = [...SRC.matchAll(/<div class="kpis" style="grid-template-columns:([^"]*)"/g)].map(m => m[1]);
vrai('population : les rangées d’indicateurs à colonnes écrites en ligne sont trouvées', rangees.length >= 5, rangees.length);
const forcees = rangees.filter(g => /repeat\(\s*\d+\s*,/.test(g));
vrai('⛔ aucune ne force un nombre de colonnes (repeat(N, …)) — elles se replient (auto-fit)', !forcees.length, forcees);
const a200 = rangees.filter(g => g === 'repeat(auto-fit,minmax(200px,1fr))').length;
vrai('les trois rangées à valeurs longues prennent 200 px par colonne', a200 === 3, a200);
/* l'arithmétique d'auto-fit, jouée sur la valeur LUE dans le fichier : colonnes, et place laissée à la valeur */
const min = 200, ecart = 15, marge = 40, plusLongue = 159;   /* « 1523h30 » en 34 px gras, mesuré */
const cartes = 3;   /* auto-fit EFFACE les pistes vides : trois cartes ne font jamais plus de trois colonnes */
const colonnes = w => Math.min(cartes, Math.max(1, Math.floor((w + ecart) / (min + ecart))));
const place = w => (w - ecart * (colonnes(w) - 1)) / colonnes(w) - marge;
const cas = [[328, 1], [358, 1], [398, 1], [500, 2], [1100, 3]];
vrai('une colonne sur les téléphones (328–398 px), deux sur iPad portrait, trois au bureau',
  cas.every(([w, n]) => colonnes(w) === n), cas.map(([w]) => w + '→' + colonnes(w)));
vrai('⛔ … et la plus longue valeur mesurée (159 px) tient dans chaque carte', cas.every(([w]) => place(w) >= plusLongue),
  cas.map(([w]) => w + '→' + Math.round(place(w))));

console.log('\n── 776 · 8. « Côte à côte » en une colonne : une colonne qui peut rétrécir ──');
/* Mesuré le 23 septembre 2026 : en vue Multi, la grille des techniciens imposait 396 px à un
   iPhone de 390 et 696 px à un iPad portrait — `1fr` ne descend pas sous le contenu. */
const split = regle('.plm-split{ grid-template-columns:minmax(0,1fr); }');
vrai('⛔ sous 1 100 px, la colonne unique est minmax(0,1fr)', !!split && /max-width:1100px/.test(split.media), split && split.media);
vrai('… et plus aucune règle ne la remet à « 1fr » nu', !/\.plm-split\{\s*grid-template-columns:1fr;/.test(SRC));

console.log('\n── 776 · 9. le libellé de la période passe à la ligne au téléphone ──');
/* Mesuré le 23 septembre 2026 : « Semaine du 21 sept. au 27 sept. » en nowrap + trois boutons de
   38 px = 350 px ; la page glissait de 30 px sur un Android de 360 (Jour : 6 px). */
const navB = regle('html[data-refonte] .pf-nav b{white-space:normal;text-align:center;flex:1 1 auto;min-width:0;line-height:1.2}');
vrai('⛔ au téléphone, le libellé de la période passe sur deux lignes au lieu de pousser la page', !!navB && /max-width:780px/.test(navB.media), navB && navB.media);
const navM = regle('html[data-refonte] .pf-nav{min-width:0}');
vrai('… et la barre peut rétrécir sous la largeur du libellé', !!navM && navM.media === (navB && navB.media));

console.log('\n── 776 · 10. l’analyse de consommation tient sur un téléphone ──');
/* Mesuré le 23 septembre 2026 (scratchpad/sonde-conso.js) : dès qu'il existe des consommations,
   page à 529 px sur un Android de 360 et barres écrasées à 0 px — libellé produit 270 px, noms
   230 / 250 px, valeurs 64 à 100 px, écrits EN LIGNE. La démonstration n'a aucune consommation. */
const iA = SRC.indexOf('function consoAnalyseHTML(){'), fA = iA > 0 ? SRC.slice(iA, SRC.indexOf('\nfunction ', iA + 30)) : '';
vrai('population : consoAnalyseHTML est trouvée', fA.length > 3000, fA.length);
vrai('⛔ le libellé produit n’a plus de largeur fixe (il peut rétrécir)', !/class="bar-lbl[^"]*" style="width:270px/.test(fA) && /flex:0 1 270px;min-width:0/.test(fA));
vrai('les quatre modèles de ligne portent la classe qui les replie au téléphone', (fA.match(/class="(bar-row )?cs-l"/g) || []).length === 4, (fA.match(/class="(bar-row )?cs-l"/g) || []).length);
vrai('… avec leur nom, leur barre et leur valeur nommés', (fA.match(/cs-nom/g) || []).length >= 4 && (fA.match(/cs-bar/g) || []).length >= 4 && (fA.match(/cs-val/g) || []).length >= 4);
const csl = regle('html[data-refonte] .cs-l{flex-wrap:wrap;row-gap:0!important}');
vrai('⛔ au téléphone (≤ 560 px), chaque ligne passe sur deux étages', !!csl && /max-width:560px/.test(csl.media), csl && csl.media);
vrai('… le nom sur toute la première ligne, la barre et la valeur sur la seconde',
  /\.cs-l::after\{content:'';flex:0 0 100%;order:2/.test(SRC) && /\.cs-l > \.cs-bar\{order:3/.test(SRC) && /\.cs-l > \.cs-val\{order:4/.test(SRC));

console.log('\n── 776 · 11. la liste des interventions passe sur deux étages quand la LISTE est étroite ──');
/* Mesuré le 23 septembre 2026 (scratchpad/sonde-int-liste.js), noms longs et interventions à venir :
   à 360 et 390 px la colonne de texte tombait à 0 px (titre sur 13 lignes, page à 395–415 px) ; sur
   iPad portrait, menu latéral ouvert, à 87–106 px dans un écran de 820. Heure, texte, compte à
   rebours, statut et boutons étaient côte à côte, et seul le texte cédait. */
{ /* bloc : les noms de cette section ne débordent pas sur les autres */
const iI = SRC.indexOf('views.interventions=function(){'), fI = iI > 0 ? SRC.slice(iI, SRC.indexOf('\nfunction ', iI + 30)) : '';
vrai('population : la vue Interventions est trouvée', fI.length > 5000, fI.length);
const iC = fI.indexOf('const card=i=>{'), fC = iC > 0 ? fI.slice(iC, fI.indexOf('</div>`; };', iC)) : '';
vrai('population : le modèle de ligne est trouvé', fC.length > 1000, fC.length);
vrai('la ligne, son heure, son compte à rebours et ses gestes portent leur classe',
  /class="pl-row int-l"/.test(fC) && /class="int-h"/.test(fC) && /class="int-cd"/.test(fC) && /class="int-a"/.test(fC));
vrai('⛔ la liste est enveloppée dans le conteneur qu’on interroge', /list\.length\? `<div class="int-liste">\$\{body\}<\/div>`/.test(fI));
vrai('… et ce conteneur est interrogeable sur sa largeur', /html\[data-refonte\] \.int-liste\{container-type:inline-size\}/.test(SRC));
const cq = regle('html[data-refonte] .int-l{flex-wrap:wrap;row-gap:10px!important}');
vrai('⛔ les deux étages dépendent de la largeur de la LISTE (requête de conteneur), pas de l’écran',
  !!cq && /^@container \(max-width:640px\)$/.test(cq.media), cq && cq.media);
const dans = sel => { const r = regle(sel); return !!r && !!cq && r.media === cq.media; };
vrai('… le chevron reste à droite du texte, compte à rebours et gestes passent dessous',
  dans('html[data-refonte] .int-l::after{order:1}') && dans('html[data-refonte] .int-l > .int-cd,html[data-refonte] .int-l > .int-a{order:2}'));
vrai('… les gestes se rangent en ligne à droite, sur une base nulle (sinon : un troisième étage)',
  dans('html[data-refonte] .int-l > .int-a{flex:1 1 0;flex-direction:row!important;flex-wrap:wrap;justify-content:flex-end'));
/* Le saut de ligne tient à une soustraction : la base du texte laisse de la place au CHEVRON sur
   le premier étage, et à RIEN d'autre. On relit les quatre nombres là où ils sont écrits. */
const reserve = +((SRC.match(/\.int-l > \.pl-info\{flex:1 1 calc\(100% - (\d+)px\)\}/) || [])[1] || NaN);
const heure = +((fC.match(/class="int-h" style="text-align:center;min-width:(\d+)px/) || [])[1] || NaN);
const bPl = SRC.slice(SRC.indexOf('html[data-refonte] .pl-row{\n  position:relative'), SRC.indexOf('}', SRC.indexOf('html[data-refonte] .pl-row{\n  position:relative')));
const ecart = +((bPl.match(/gap:(\d+)px!important/) || [])[1] || NaN);
const bCh = (SRC.match(/html\[data-refonte\] \.pl-row\[onclick\]::after\{\s*content:'';width:(\d+)px;height:\d+px;flex-shrink:0;margin-left:(\d+)px;\s*border-right:(\d+)px/) || []);
const chevron = +bCh[1] + +bCh[2] + +bCh[3];
vrai('population : réserve, heure, écart et chevron sont lus dans le code', [reserve, heure, ecart, chevron].every(Number.isFinite), { reserve, heure, ecart, chevron });
vrai('⛔ le chevron tient à côté du texte (heure + écart + écart + chevron ≤ réserve)', heure + 2 * ecart + chevron <= reserve,
  heure + 2 * ecart + chevron + ' pour ' + reserve);
vrai('⛔ … et rien d’autre : le reste ne peut pas accueillir un bouton de 38 px', reserve - (heure + 2 * ecart + chevron) < ecart + 38,
  reserve - (heure + 2 * ecart + chevron));
vrai('la preuve au navigateur existe (sonde des lignes, cinq appareils, quatre formes de ligne)', fs.existsSync(path.join(__dirname, '..', 'scratchpad', 'sonde-int-liste.js')));
}

console.log('\n── 776 · 12. un nom coupé à l’écran garde son nom entier en infobulle ──');
/* Mesuré le 23 septembre 2026 (audit des écrans profonds, valeurs longues, Android de 360) : le
   nom du technicien dans la grille « Équipe » du tableau de bord se lisait « Jean-Christophe
   Delacroix-Mo » — 106 px visibles sur 276 — sans rien pour lire le reste. Même coupe sur les
   pastilles d'activité (nowrap + ellipsis). */
{ const iT = SRC.indexOf('<div class="tdb-tec"'), lT = iT > 0 ? SRC.slice(iT, SRC.indexOf('>', iT) + 1) : '';
  vrai('population : la ligne d’équipe du tableau de bord est trouvée', lT.length > 20, lT);
  vrai('⛔ la ligne porte le nom entier du technicien en infobulle', /title="\$\{esc\(gr\.nom\)\}"/.test(lT), lT);
  const iA2 = SRC.indexOf('<div class="tdb-act"'), lA = iA2 > 0 ? SRC.slice(iA2, SRC.indexOf('>', iA2) + 1) : '';
  vrai('… et la pastille d’activité son titre entier', /title="\$\{esc\(actTitre\(a\)\)\}"/.test(lA), lA);
  vrai('(les deux sont bien coupés par la feuille — sinon l’infobulle ne servirait à rien)',
    /\.tdb-tec b\{[^}]*text-overflow:ellipsis/.test(SRC) && /\.tdb-act b\{[^}]*text-overflow:ellipsis/.test(SRC)); }

console.log('\n── 776 · 13. « Ma journée », l’écran du technicien, tient au téléphone ──');
/* Tous les audits tournent en ADMINISTRATEUR : l'écran qu'un technicien ouvre chaque matin n'y
   paraissait jamais. Mesuré le 23 septembre 2026 en se connectant comme technicien
   (scratchpad/sonde-ma-journee.js), noms longs : à 360 px le texte d'une carte tombait à 100 px
   (titre sur dix lignes), à 390 à 128 ; et le rappel du matin « Ta journée : … » écrasait son
   message à 70 px — un mot par ligne, « Établissements » coupé par « Voir ma journée ». */
{ const iK = SRC.indexOf('function intTechCard(i,opts){'), fK = iK > 0 ? SRC.slice(iK, SRC.indexOf('\nfunction ', iK + 30)) : '';
  vrai('population : la carte du technicien est trouvée', fK.length > 800, fK.length);
  vrai('sa ligne, son heure et son texte portent leur classe', /class="mj-l"/.test(fK) && /class="mj-h"/.test(fK) && /class="mj-t"/.test(fK));
  const iD = SRC.indexOf('function renderIntTechDay(SRC){'), fD = iD > 0 ? SRC.slice(iD, SRC.indexOf('\nfunction ', iD + 30)) : '';
  vrai('⛔ la journée entière est dans le conteneur qu’on interroge', /\$\('content'\)\.innerHTML=`<div class="mj">/.test(fD) && /<\/div>`;\s*\}?\s*$/.test(fD.trim()), fD.slice(-80));
  vrai('… et ce conteneur est interrogeable sur sa largeur', /html\[data-refonte\] \.mj\{container-type:inline-size\}/.test(SRC));
  const mq = regle('html[data-refonte] .mj-l{flex-wrap:wrap;');
  vrai('⛔ sous 440 px de liste, la carte passe sur deux étages', !!mq && /^@container \(max-width:440px\)$/.test(mq.media), mq && mq.media);
  const base = regle('html[data-refonte] .mj-l > .mj-t{flex:1 1 calc(100% - 80px)!important}');
  vrai('⛔ … avec une base qui BAT le `flex:1` écrit en ligne sur la colonne de texte (sans !important, rien ne passe à la ligne — mesuré)',
    !!base && base.media === (mq && mq.media) && /class="mj-t" style="flex:1;/.test(fK));
  vrai('… et le statut passe dessous, à droite', !!regle('html[data-refonte] .mj-l > .st{margin-left:auto}'));
  const res = 80, hh = +((fK.match(/class="mj-h" style="text-align:center;min-width:(\d+)px/) || [])[1] || NaN), gg = +((fK.match(/class="mj-l" style="display:flex;gap:(\d+)px/) || [])[1] || NaN);
  vrai('⛔ le premier étage garde l’heure (même élargie de 10 px par « ⏱ en cours ») et rien d’autre',
    Number.isFinite(hh) && Number.isFinite(gg) && hh + gg + 10 <= res && res - (hh + gg) < gg + 40, { heure: hh, ecart: gg, reserve: res });
  const iB = SRC.indexOf("b.id='fdr-banner';"), fB = iB > 0 ? SRC.slice(iB, SRC.indexOf('document.body.appendChild(b);', iB)) : '';
  vrai('population : le rappel du matin est trouvé', fB.length > 300, fB.length);
  vrai('⛔ le rappel se pose entre deux marges (plus de « left:50% » qui ne lui laissait que la moitié de l’écran)',
    /position:fixed;left:12px;right:12px;/.test(fB) && /margin:0 auto;width:max-content;max-width:min\(\d+px,calc\(100vw - 24px\)\)/.test(fB) && !/left:50%/.test(fB));
  vrai('… son message garde une ligne à lui quand tout ne tient pas (base 220 px, boutons dessous à droite)',
    /flex-wrap:wrap/.test(fB) && /<span style="flex:1 1 220px;min-width:0">/.test(fB) && /style="flex-shrink:0;margin-left:auto"/.test(fB));
  vrai('… et il passe au-dessus de la barre d’onglets, comme les messages', /body\.rf-onglets #fdr-banner\{bottom:calc\(var\(--tabh\) \+ 76px\)!important\}/.test(SRC));
  const hb = regle('html[data-refonte] body:has(#assistant > .fab) #fdr-banner{bottom:calc(24px + 58px + 12px)!important}');
  vrai('⛔ … et, sans barre d’onglets (tablette, ordinateur), au-dessus de la bulle d’aide qu’il atteint une fois élargi',
    !!hb && /min-width:781px/.test(hb.media), hb && hb.media);
  vrai('la preuve au navigateur existe (en technicien, quatre appareils)', fs.existsSync(path.join(__dirname, '..', 'scratchpad', 'sonde-ma-journee.js'))); }

console.log('\n── 776 · 14. une boîte centrée par « left:50% » se mesure sur la moitié de son cadre ──');
/* Mesuré le 23 septembre 2026 (scratchpad/sonde-opt-barre.js) : la barre « Ordre proposé » posée sur
   la carte après « Optimiser la tournée » faisait 164 px dans une carte de 328 — quatre lignes,
   152 px de haut sur la carte — et 250 px dans les 500 de l'iPad. Une boîte absolue ou fixe à
   largeur AUTOMATIQUE se mesure sur la place qui reste à droite de son bord gauche : avec
   `left:50%`, la moitié. Même cause que le rappel du matin (section 13). */
{ const iO = SRC.indexOf('.opt-barre{'), rO = iO > 0 ? SRC.slice(iO, SRC.indexOf('}', iO)) : '';
  vrai('population : la barre de la tournée optimisée est trouvée', rO.length > 100, rO.length);
  vrai('⛔ elle se pose entre deux marges, à la largeur de son contenu', /left:10px; right:10px; margin:0 auto; width:max-content;/.test(rO) && !/left:50%/.test(rO) && !/translateX\(-50%\)/.test(rO));
  /* Et le piège ne revient pas ailleurs : toute boîte centrée par left:50% + translateX(-50%) doit
     déclarer sa LARGEUR, ou ne pas pouvoir se replier (texte insécable, pseudo-élément sans contenu). */
  const cas = []; const re = /translateX\(-50%\)/g; let m;
  while ((m = re.exec(SRC))) { const i = m.index;
    const d = Math.max(SRC.lastIndexOf('{', i), SRC.lastIndexOf('style="', i), SRC.lastIndexOf("cssText='", i));
    const f = Math.min(...[SRC.indexOf('}', i), SRC.indexOf('"', i), SRC.indexOf("'", i)].filter(x => x > 0));
    const b = SRC.slice(d, f); if (!/left:\s*50%/.test(b)) continue;
    const sel = SRC.slice(SRC.lastIndexOf('\n', d) + 1, d).trim();
    const sur = /(^|[;{\s"'])(width|inline-size):/.test(b) || /white-space:\s*nowrap/.test(b) || /content:\s*''/.test(b)
      /* .toast : la refonte lui donne sa largeur (width:max-content), relu ici plutôt que cru */
      || (/^\.toast$/.test(sel) && /html\[data-refonte\] \.toast\{width:max-content;max-width:min\(/.test(SRC));
    cas.push({ sel: sel.slice(-40), sur }); }
  vrai('population : les boîtes centrées par left:50% sont recensées', cas.length >= 5, cas.length);
  vrai('⛔ chacune déclare sa largeur ou ne peut pas se replier', cas.every(c => c.sur), cas.filter(c => !c.sur));
  vrai('la preuve au navigateur existe (la vraie planOptBarre, quatre appareils)', fs.existsSync(path.join(__dirname, '..', 'scratchpad', 'sonde-opt-barre.js'))); }

console.log('\n── 776 · 15. un texte ne s’écrase plus : lignes à heure, lignes à gestes, titres de fenêtre ──');
/* Trouvés le 23 septembre 2026 par le critère « texte écrasé » de l'audit (valeurs longues,
   administrateur et technicien, Android de 360) — une colonne qui cède tout ne déborde pas, elle
   s'allonge, et aucun autre contrôle ne la voyait :
   · cartes du Planning (`planIntCard`) : titre à 101 px sur dix lignes ; tournée de la Carte des
     interventions (`renderTournee`) : adresse à 86 px sur seize lignes ;
   · demandes de commande de Validations : texte à 18 px à côté de 190 px de boutons ;
   · titre de fenêtre [Annuler] titre [Ajouter] : « Ajouter un produit aux boxes » sur cinq lignes,
     une barre de 188 px de haut. */
{ const corpsDe = d => { const i = SRC.indexOf(d); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\nfunction ', i + 20)); };
  const fP = corpsDe('function planIntCard(i,opts){'), fT = corpsDe('async function renderTournee(pts){');
  vrai('population : planIntCard et renderTournee sont trouvées', fP.length > 500 && fT.length > 500, [fP.length, fT.length]);
  vrai('les deux lignes « heure · texte · statut » portent la classe du composant', /class="pl-row lh"/.test(fP) && /class="pl-row lh"/.test(fT));
  const cl = regle('html[data-refonte] .pl-row.lh{container:ligne-heure / inline-size;flex-wrap:wrap;row-gap:8px!important}');
  vrai('⛔ la LIGNE est son propre conteneur (elle vit dans trois vues et un panneau)', !!cl && cl.media === '', cl && cl.media);
  const cb = regle('html[data-refonte] .lh > .pl-info{flex:1 1 calc(100% - 80px)}');
  vrai('⛔ sous 440 px de ligne, le texte prend la largeur et le statut passe dessous',
    !!cb && /^@container ligne-heure \(max-width:440px\)$/.test(cb.media) && !!regle('html[data-refonte] .lh > .st{margin-left:auto}'), cb && cb.media);
  const h1 = +((fP.match(/<div style="text-align:center;min-width:(\d+)px;flex-shrink:0">/) || [])[1] || NaN);
  const h2 = +((SRC.match(/\.pl-time\{[^}]*min-width:(\d+)px/) || [])[1] || NaN);
  vrai('⛔ … et la base laisse la place de l’heure (48 et 50 px, +10 de marge), rien de plus', [h1, h2].every(h => Number.isFinite(h) && h + 14 + 10 <= 80 && 80 - (h + 14) < 14 + 40), { planIntCard: h1, tournee: h2 });
  const fV = corpsDe('views.validations=function(){');
  vrai('population : la vue Validations est trouvée', fV.length > 2000, fV.length);
  vrai('les demandes de commande sont des lignes à gestes, leurs boutons nommés', /class="pl-row lga" data-dem=/.test(fV) && /<div class="lga-a" onclick="event\.stopPropagation\(\)"/.test(fV));
  const cg = regle('html[data-refonte] .lga > .pl-info{flex:1 1 calc(100% - 40px)}');
  vrai('⛔ sous 440 px de ligne : le texte et son chevron en haut, gestes et statut dessous, à droite',
    !!cg && /^@container ligne-gestes \(max-width:440px\)$/.test(cg.media) && !!regle('html[data-refonte] .lga::after{order:1}')
    && !!regle('html[data-refonte] .lga > .lga-a,html[data-refonte] .lga > .st{order:2;margin-left:auto}')
    && /html\[data-refonte\] \.pl-row\.lga\{container:ligne-gestes \/ inline-size;flex-wrap:wrap/.test(SRC), cg && cg.media);
  const sh = regle('html[data-refonte] .sheet-head > h3:not(.bxp-titre){order:3;flex:1 1 100%;text-align:left;text-wrap:balance}');
  vrai('⛔ au téléphone, le titre d’une fenêtre passe sous ses deux gestes (grand titre, pleine largeur)', !!sh && /max-width:560px/.test(sh.media), sh && sh.media);
  vrai('… la barre peut passer à la ligne, le geste de droite reste à droite, et « Produits de la box » garde sa ligne',
    !!regle('html[data-refonte] .sheet-head:has(> h3:not(.bxp-titre)){flex-wrap:wrap;row-gap:6px}')
    && !!regle('html[data-refonte] .sheet-head > h3:not(.bxp-titre) ~ :last-child{margin-left:auto}') && /\.bxp-titre\{white-space:nowrap\}/.test(SRC));
  vrai('une pastille ne se coupe pas en deux', /html\[data-refonte\] \.tag\{font-size:12px;font-weight:600;white-space:nowrap\}/.test(SRC));
  const AUD = fs.readFileSync(path.join(__dirname, '..', 'scratchpad', 'audit-profond.js'), 'utf8');
  vrai('l’audit porte le critère qui les a trouvés (texte écrasé), et attend la fin de l’animation d’entrée',
    /if\(signes<12 && lignes>=4\) out\.ecrases\.push/.test(AUD) && /!document\.querySelector\('\.content\.entre'\)\) return i;/.test(AUD));
  vrai('la preuve au navigateur des lignes à heure existe (Planning × 3 vues, tournée, 4 appareils)', fs.existsSync(path.join(__dirname, '..', 'scratchpad', 'sonde-lignes-heure.js'))); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
