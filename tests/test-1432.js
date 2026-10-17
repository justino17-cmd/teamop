/* ══ lot h04 / appareils#3 — RAPPORTS, ARCHIVES MENSUELLES, HISTORIQUE : LA COLONNE DE TEXTE NE S'ÉCRASE PLUS ══
   Mesuré par l'audit des appareils (Android 360, iPhone, 320 px) : le titre et la méta d'une ligne de Rapports ou
   d'Archives tenaient dans 113 à 118 px sur 4 lignes (71 à 79 px à 320), l'Historique dans 145 px sur 4 à 6 lignes.
   Une ligne flex dont la colonne de texte a une base nulle (`flex:1`) à côté d'un voisin en `white-space:nowrap`
   (bouton « Rédiger », statut, heure) : le voisin garde sa largeur, le texte cède TOUT — il ne déborde pas, il
   s'allonge, et aucun audit de débordement ne le voit (CLAUDE.md : « UNE COLONNE QUI CÈDE TOUT NE DÉBORDE PAS »).

   Correctif : la LIGNE est son propre conteneur. Rapports et Archives prennent `.pl-row.lgt` (le motif de `.lga`, avec
   un seuil plus bas, 380 px, parce que la ligne d'un iPad 820 mesure 417 px de contenu et tient sur une ligne :
   le seuil de `.lga`, 440, la faisait passer sur deux étages sans nécessité) ; l'Historique (`.tl-item`) devient un
   conteneur à son tour (400 px : 348 sur le plus grand iPhone, 450 sur iPad 820).

   Ce banc lit le CODE : le balisage de chacune des trois vues (aucune ligne n'est restée nue), et les règles de
   feuille (conteneur, seuil, ordre des enfants). Le seuil se contrôle sur des MESURES (largeurs de contenu relevées
   au navigateur par scratchpad/gestion/correctifs/h04/larg-lignes.js) : plus haut que le plus large téléphone,
   plus bas que l'iPad. La preuve au navigateur (320/360/390/430/744/820/1440 px, jour et nuit) est
   scratchpad/gestion/correctifs/h04/sonde-ecrase.js.
   BANC_FICHIER : une copie mutée d'app.html. */
'use strict';
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(process.env.BANC_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
// ⛔ seulement les blocs qui COMMENCENT une ligne (le motif naïf avale 107 000 caractères d'app.html)
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function tranche(debut, fin) { const i = SRC.indexOf(debut); if (i < 0) return ''; const j = SRC.indexOf(fin, i + debut.length); return j < 0 ? '' : SRC.slice(i, j); }
// les lignes de liste d'une vue : chaque ouverture `<div class="pl-row…"` avec sa classe
const lignes = (t) => [...t.matchAll(/<div class="(pl-row[^"]*)"/g)].map(m => m[1]);

// largeurs de CONTENU de la ligne relevées au navigateur (ce qu'interroge @container) : téléphones, puis iPad 820
const LARGEUR_MAX_TELEPHONE = 315;      // iPhone 430 (le plus large) : Rapports/Archives ; l'Historique y mesure 348
const LARGEUR_MAX_TELEPHONE_HIST = 348;
const LARGEUR_IPAD_820 = 417;           // Rapports/Archives (le menu latéral prend 272 px) ; l'Historique y mesure 450
const LARGEUR_IPAD_820_HIST = 450;

console.log('— le balisage des trois écrans —');
const rap = tranche('views.rapports=function', 'let rapPhotos');
const arc = tranche('views.archives=function', 'function shiftMonth(');
vrai('views.rapports est trouvée', rap.length > 300);
vrai('views.archives est trouvée', arc.length > 300);
const lr = lignes(rap), la = lignes(arc);
vrai('Rapports : deux listes de lignes (terminées, en attente)', lr.length === 2, lr);
vrai('Rapports : aucune ligne n\'est restée nue (.pl-row sans .lgt)', lr.length > 0 && lr.every(c => /\blgt\b/.test(c)), lr);
vrai('Archives : la liste des interventions du mois porte .lgt', la.length === 1 && /\blgt\b/.test(la[0]), la);
vrai('le texte reste dans .pl-info et son flex n\'est pas écrit en ligne (la règle de feuille ne porte pas !important)',
  !/class="pl-info"[^>]*style="[^"]*flex/.test(rap + arc));
const ti = SRC.match(/<div class="tl-item"[^>]*>[\s\S]{0,400}?<div class="tl-time">/);
vrai('Historique : la ligne .tl-item (pastille · .tl-body · .tl-time) est trouvée', !!ti && /tl-dot/.test(ti[0]) && /tl-body/.test(ti[0]));
vrai('Historique : le corps du texte n\'a pas de flex en ligne', !/class="tl-(body|time)"[^>]*style="[^"]*flex/.test(SRC));

console.log('— la feuille —');
const R1 = /html\[data-refonte\] \.pl-row\.lgt\{([^}]*)\}/.exec(SRC);
vrai('la ligne .pl-row.lgt est son propre conteneur (container: … / inline-size)', !!R1 && /container:\s*[\w-]+\s*\/\s*inline-size/.test(R1[1]), R1 && R1[1]);
vrai('et elle peut passer à la ligne (flex-wrap:wrap)', !!R1 && /flex-wrap:\s*wrap/.test(R1[1]), R1 && R1[1]);
const nom1 = R1 && (/container:\s*([\w-]+)\s*\//.exec(R1[1]) || [])[1];
const Q1 = nom1 && new RegExp('@container ' + nom1 + ' \\(max-width:(\\d+)px\\)\\{([\\s\\S]*?)\\n\\}').exec(SRC);
vrai('la requête de conteneur de .lgt est trouvée sous le NOM du conteneur', !!Q1);
const seuil1 = Q1 ? +Q1[1] : 0, c1 = Q1 ? Q1[2] : '';
vrai('seuil de .lgt : au-dessus du plus large téléphone (' + LARGEUR_MAX_TELEPHONE + ' px) — le texte y est écrasé sinon', seuil1 >= LARGEUR_MAX_TELEPHONE, seuil1);
vrai('seuil de .lgt : sous la ligne d\'un iPad 820 (' + LARGEUR_IPAD_820 + ' px) — elle garde sa mise en page d\'une ligne', seuil1 > 0 && seuil1 < LARGEUR_IPAD_820, seuil1);
vrai('le texte prend sa ligne (.lgt > .pl-info : base presque pleine)', /\.lgt > \.pl-info\{flex:1 1 calc\(100% - \d+px\)\}/.test(c1), c1);
vrai('bouton et statut passent dessous, à droite (order:2 + margin-left:auto)', /\.lgt > \.st,html\[data-refonte\] \.lgt > \.btn\{order:2;margin-left:auto\}/.test(c1), c1);
vrai('le chevron de la ligne reste avec le texte (::after order:1)', /\.lgt::after\{order:1\}/.test(c1), c1);

const R2 = /html\[data-refonte\] \.tl-item\{([^}]*)\}/.exec(SRC);
vrai('Historique : .tl-item est son propre conteneur', !!R2 && /container:\s*[\w-]+\s*\/\s*inline-size/.test(R2[1]), R2 && R2[1]);
vrai('et elle peut passer à la ligne', !!R2 && /flex-wrap:\s*wrap/.test(R2[1]), R2 && R2[1]);
const nom2 = R2 && (/container:\s*([\w-]+)\s*\//.exec(R2[1]) || [])[1];
const Q2 = nom2 && new RegExp('@container ' + nom2 + ' \\(max-width:(\\d+)px\\)\\{([\\s\\S]*?)\\n\\}').exec(SRC);
vrai('la requête de conteneur de .tl-item est trouvée', !!Q2);
const seuil2 = Q2 ? +Q2[1] : 0, c2 = Q2 ? Q2[2] : '';
vrai('seuil de .tl-item : au-dessus du plus large téléphone (' + LARGEUR_MAX_TELEPHONE_HIST + ' px)', seuil2 >= LARGEUR_MAX_TELEPHONE_HIST, seuil2);
vrai('seuil de .tl-item : sous l\'iPad 820 (' + LARGEUR_IPAD_820_HIST + ' px)', seuil2 > 0 && seuil2 < LARGEUR_IPAD_820_HIST, seuil2);
vrai('le texte prend la place à côté de la pastille (100% - 48px = 34 de pastille + 14 de gouttière)', /\.tl-item > \.tl-body\{flex:1 1 calc\(100% - 48px\)\}/.test(c2), c2);
vrai('l\'heure passe dessous, alignée sur le texte (pleine ligne, retrait de 48px)', /\.tl-item > \.tl-time\{flex:1 0 100%;padding-left:48px\}/.test(c2), c2);
vrai('la pastille et la gouttière mesurent bien 34 + 14 px (sinon le 48 est faux)', /\.tl-dot\{width:34px;/.test(SRC) && /\.tl-item\{display:flex;gap:14px/.test(SRC));

console.log('— les interdits —');
const bloc = (c1 || '') + (c2 || '') + (R1 ? R1[0] : '') + (R2 ? R2[0] : '');
vrai('pas de container-type sur #content (CLAUDE.md : il toucherait les éléments fixes)', !/#content\s*\{[^}]*container(-type)?:/.test(SRC));
vrai('pas de :has() qui lit [style…] (test-823)', !/:has\([^)]*\[style/.test(bloc));
vrai('aucune variable CSS reprise par elle-même (cycle)', !/--([\w-]+)\s*:\s*var\(--\1\)/.test(bloc));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
