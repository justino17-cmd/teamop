/* ══════════════════════════════════════════════════════════════════════════════════════
   test-767 — LES DEUX DÉFAUTS DU 22 SEPTEMBRE AU SOIR, GARDÉS PAR LEUR CAUSE

   Justin, deux captures : « c'est quoi ce fond moche là » et « je veux des boutons, c'est
   dans pointage ». Deux causes sans rapport, et la même leçon dans les deux : un sélecteur
   décrit une RELATION, pas l'objet qu'on avait en tête.

   1. ⛔⛔ `div:has(> input[placeholder^="Rechercher"])` ATTRAPE LE CONTENEUR DE LA PAGE.
      Sur Bons de commande, le champ « Rechercher… » est écrit en ENFANT DIRECT de
      `#content` : la zone de contenu entière prenait donc `border-radius:999px`, la vitre
      et son `backdrop-filter`. Mesuré au navigateur : `#content` 1 742 × 716 px, rayon
      999 px, flou 14 px, fond à 46 % — un disque pâle en travers de l'écran.
      ⚠️ Le diagnostic n'est venu ni de la lecture ni de la bissection des couches (deux
      fausses pistes : les halos du verre, puis les pseudo-éléments de `body`) mais de
      `CSS.getMatchedStylesForNode` — DEMANDER au navigateur quelle règle s'applique.
      Une pilule de recherche est un enrobage qui ne contient QUE le champ : c'est cela
      qu'on écrit, et c'est cela que ce banc exige.

   2. ⛔ UN `<button>` DANS `.seg` N'ÉTAIT STYLÉ NULLE PART. Toutes les règles du segment
      visaient `.plg-pl .seg span` — la barre du planning, et seulement elle, et seulement
      des `span`. Pointage est le seul écran qui met des `button` dans un `.seg` : ils
      sortaient BRUTS du navigateur, noirs et carrés, dans un conteneur en verre.
      Le composant vaut pour les deux balises, et le bouton perd ses atours d'origine.

   ⛔ Ce banc lit le CODE (les deux fichiers servis), pas une phrase : les commentaires sont
   retirés avant toute recherche, et chaque découpe prouve qu'elle a trouvé quelque chose.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };

/* ⛔ NETTOYAGE SÛR : seuls les blocs qui COMMENCENT une ligne. Le motif naïf avale
   107 069 caractères d'app.html, dont `saveVehicule` entière. */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const PAGES = ['app.html', 'beta.html'];

/* La garde : « ce div n'a aucun enfant qui ne soit pas le champ (ou son ornement) ». */
const GARDE = ':not(:has(> :not(input):not(svg):not(button):not(label)))';

console.log('\n══ 1. LA PILULE DE RECHERCHE NE PEUT PLUS ATTRAPER UNE ZONE DE PAGE ══\n');
for (const f of PAGES) {
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  vrai(f + ' — population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(SRC));

  /* ⛔ ON CLASSE CHAQUE EMPLOI, ON NE LES COMPTE PAS EN BLOC. Trois cas, et un seul est un
     défaut :
     · la garde suit tout de suite → le sélecteur ne vise qu'un vrai enrobage : juste ;
     · le sélecteur s'ARRÊTE là (suivi de « { », « , » ou d'un retour) → il peint le
       CONTENEUR, quel qu'il soit : c'est le défaut de Bons de commande ;
     · un DESCENDANT suit (« … input.search-inp ») → il peint le champ, pas le conteneur :
       juste, et la v720 en dépend.
     La première version de ce banc rangeait le troisième cas avec le deuxième et criait
     « 2 sans garde » sur du code correct. Un banc qui crie faux se fait désactiver. */
  const re = /(?:div|span):has\(> input\[placeholder\^="Rechercher"\]\)/g;
  const garde = [], conteneurNu = [], descendant = []; let m;
  while ((m = re.exec(SRC))) {
    const suite = SRC.slice(m.index + m[0].length, m.index + m[0].length + GARDE.length + 4);
    if (suite.startsWith(GARDE)) garde.push(1);
    else if (/^\s*[{,\n]/.test(suite)) conteneurNu.push(suite.slice(0, 24));
    else descendant.push(1);
  }
  const total = garde.length + conteneurNu.length + descendant.length;
  vrai(f + ' — population : la relation est bien employée (sinon ce banc garde du vide)',
    total >= 4, total + ' emploi(s) · ' + garde.length + ' gardés, ' + descendant.length + ' sur un descendant');
  vrai(f + ' — population : au moins un emploi vise un DESCENDANT (la règle anti-loupe de v720)',
    descendant.length >= 1);
  vrai(f + ' — ⛔ aucun de ces sélecteurs ne peint le CONTENEUR sans la garde',
    conteneurNu.length === 0, JSON.stringify(conteneurNu));

  vrai(f + ' — ⛔ la garde exige bien « aucun enfant autre que le champ »',
    SRC.includes(GARDE), 'garde absente du fichier');

  /* Et la contre-partie : la règle qui retire la loupe du champ niché reste LARGE —
     la borner ferait revenir deux vitres empilées (v720). */
  vrai(f + ' — ⛔ … mais la règle qui retire la loupe du champ niché reste large',
    /div:has\(> input\[placeholder\^="Rechercher"\]\) input\.search-inp/.test(SRC));
}

console.log('\n══ 2. LE SEGMENT EST UN COMPOSANT, PAS UN MORCEAU DE LA BARRE DU PLANNING ══\n');
for (const f of PAGES) {
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));

  vrai(f + ' — ⛔ plus une seule règle réservée à `.plg-pl .seg`',
    !/\.plg-pl \.seg/.test(SRC), 'il en reste');

  const base = (SRC.match(/\.seg span,\.seg button\{[^}]*\}/) || [])[0] || '';
  vrai(f + ' — population : la règle de base des items est trouvée', base.length > 80, base.length + ' caractères');
  /* ⛔ Un <button> arrive avec ses atours d'origine : sans ces trois remises à zéro, il
     reste gris, encadré et dans la police du système d'exploitation. */
  ['background:none', 'border:0', 'font-family:inherit'].forEach(p =>
    vrai(f + ' — ⛔ le bouton perd ses atours d’origine (' + p + ')', base.includes(p)));

  vrai(f + ' — ⛔ l’état choisi vaut pour les deux balises',
    /\.seg span\.on,\.seg button\.on\{/.test(SRC));
  vrai(f + ' — ⛔ … le survol aussi', /\.seg span:hover,\.seg button:hover\{/.test(SRC));

  /* la refonte doit couvrir le bouton partout où elle couvre le span */
  const spans = (SRC.match(/html\[data-refonte\] \.seg span(?![.:a-z-])/g) || []).length;
  const btns = (SRC.match(/html\[data-refonte\] \.seg button(?![.:a-z-])/g) || []).length;
  vrai(f + ' — population : la refonte parle bien du segment', spans >= 3, spans + ' règle(s)');
  vrai(f + ' — ⛔ la refonte couvre le bouton autant que le span',
    btns === spans, spans + ' span contre ' + btns + ' button');
}

console.log('\n══ 3. L’ÉCRAN QUI A DÉCLENCHÉ TOUT ÇA UTILISE BIEN CE COMPOSANT ══\n');
for (const f of PAGES) {
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  /* ⛔ Si Pointage cessait d'utiliser `.seg`, le banc ci-dessus garderait un composant que
     plus personne n'emploie — et le défaut reviendrait par une autre porte. */
  /* ⛔ ON DÉCOUPE SUR UNE ANCRE DU CODE, ET ON PROUVE QU'ON L'A TROUVÉE. Le premier
     motif excluait les accents inverses — or la ligne en contient (c'est un gabarit
     imbriqué) : il rendait une tranche VIDE, et une tranche vide passe au vert sur tout. */
  /* ⛔ … et l'ancre doit viser l'EMPLOI, pas la DÉFINITION : `ptSetPeriode(` tout court
     tombe sur `function ptSetPeriode(p){…}`, à 400 lignes de la barre. */
  const i0 = SRC.indexOf('onclick="ptSetPeriode(');
  vrai(f + ' — population : la barre de période de Pointage est trouvée', i0 > 0, 'ancre introuvable');
  const ligne = i0 > 0 ? SRC.slice(Math.max(0, i0 - 320), i0 + 60) : '';
  vrai(f + ' — ⛔ elle est bâtie en `.seg` + `<button>` — le cas que la règle doit couvrir',
    /class="seg"/.test(ligne) && /<button class="/.test(ligne), ligne.slice(-120));
}

console.log('\n═══ test-767 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
