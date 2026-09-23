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
/* Le bloc @media qui CONTIENT une position donnée (par ses accolades), ou '' au premier niveau. */
function mediaDe(i) {
  let prof = 0, j = i;
  for (; j > 0; j--) { const c = SRC[j]; if (c === '}') prof++; else if (c === '{') { if (prof === 0) { const d = SRC.lastIndexOf('\n', j); const tete = SRC.slice(d + 1, j).trim();
    if (/^@media/.test(tete)) return tete; /* un sélecteur : on remonte d'un cran */ prof = 0; continue; } prof--; } }
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

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
