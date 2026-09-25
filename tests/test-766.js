/* ══════════════════════════════════════════════════════════════════════════════════════
   test-766 — UNE VARIABLE CSS UTILISÉE ET JAMAIS DÉFINIE EST UNE PROPRIÉTÉ IGNORÉE

   ⛔ CE BANC EXISTE PARCE QU'UN OUTIL NE SUFFIT PAS. `scripts/verifier-theme.js` savait
   dire tout cela depuis des semaines — et il n'est lancé par AUCUN workflow, par
   AUCUN script de la CI. Mesuré le 22 septembre 2026 : `var(--bd)` (une faute de frappe
   pour `--brd`) vivait dans `.multi-bar`, la barre « Reprendre » du multitâche. Pas
   d'erreur, pas de console, pas de bordure : la propriété était simplement ignorée.
   C'est la règle de `CLAUDE.md` retournée contre elle-même — « une garde décrite dans ce
   fichier n'est pas une garde ; aller lire le code qui crie ». Personne ne criait.

   Trois familles, et elles ne se valent pas :
   · `var(--x)` SANS secours, `--x` jamais définie → la propriété entière est JETÉE. Faute.
   · `var(--x, secours)` où `--x` n'existe pas → ça marche, mais le secours est la SEULE
     valeur : le jeton ne suit ni le thème ni la couleur choisie. Toléré, mais DÉCLARÉ un
     par un dans ECARTS, avec sa raison — même mécanique que « vu et pas surveillé »
     (test-726) et que les écarts au document de thème (test-759). Un écart tacite devient
     un oubli en une semaine.
   · un ACCORD DE VALEURS : `--rf-modal-marge` doit valoir le rembourrage horizontal de la
     règle qui le porte, sinon le panneau qui s'en sert rentre ou déborde. Mesuré au
     navigateur avant/après : 10 px d'écart de chaque côté sur la feuille de Réglages.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };

/* ⛔ LE NETTOYAGE NAÏF AVALE 107 069 CARACTÈRES D'app.html — dont `saveVehicule` entière.
   On ne retire que les blocs qui COMMENCENT une ligne : ce sont les seuls que ce dépôt
   utilise pour expliquer du code. */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* ⛔ Ces jetons ne sont jamais écrits dans le fichier : c'est le NAVIGATEUR qui les fournit.
   Les chercher comme les autres ferait crier le banc sur du code juste. */
const FOURNIS_PAR_LE_NAVIGATEUR = [];

/* ⛔ LES ÉCARTS ASSUMÉS — un jeton jamais défini mais toujours utilisé AVEC son secours.
   Chaque ligne est une décision prise une fois, par écrit. Vider cette liste est un but,
   pas une obligation ; y ajouter sans raison est la faute. */
const ECARTS = {
  /* (vide — les trois écarts du 22 septembre ont été corrigés le jour même :
      --bd était une faute de frappe pour --brd, --warn est devenu --org, et
      --rf-modal-marge est désormais posée sur les règles qui décident du rembourrage) */
};

const PAGES = ['app.html', 'beta.html'];

console.log('\n══ 1. AUCUNE VARIABLE UTILISÉE SANS SECOURS N’EST ORPHELINE ══\n');
for (const f of PAGES) {
  const brut = fs.readFileSync(path.join(RACINE, f), 'utf8');
  const SRC = nu(brut);
  vrai(f + ' — population : le nettoyage n’a rien avalé (saveVehicule survit)',
    /function saveVehicule/.test(SRC));

  /* DÉFINITIONS : une déclaration CSS `--x:`, un style en ligne, ou un setProperty en JS. */
  const defs = new Set();
  (SRC.match(/--[a-zA-Z0-9_-]+\s*:/g) || []).forEach(m => defs.add(m.replace(/\s*:$/, '')));
  (SRC.match(/setProperty\(\s*['"`](--[a-zA-Z0-9_-]+)/g) || [])
    .forEach(m => defs.add(m.replace(/.*['"`]/, '')));
  FOURNIS_PAR_LE_NAVIGATEUR.forEach(v => defs.add(v));
  /* ⛔ LE PLANCHER EST MESURÉ, PAS DEVINÉ : 152 jetons le 22 septembre 2026 (les deux
     fichiers, au jeton près). 120 laisse respirer un rangement de palette et attrape
     quand même un analyseur cassé — un « 0 orphelin » sur trois jetons lus ne vaut rien. */
  vrai(f + ' — population : au moins 120 jetons définis (152 mesurés le 22/09/2026)',
    defs.size >= 120, defs.size + ' trouvés');

  /* USAGES : on sépare ceux qui portent un secours de ceux qui n'en portent pas. */
  const sansSecours = new Map(), avecSecours = new Map();
  const re = /var\(\s*(--[a-zA-Z0-9_-]+)\s*(,)?/g;
  let m, total = 0;
  while ((m = re.exec(SRC))) {
    total++;
    const cible = m[2] ? avecSecours : sansSecours;
    cible.set(m[1], (cible.get(m[1]) || 0) + 1);
  }
  vrai(f + ' — population : au moins 500 usages de var() lus', total >= 500, total + ' usages');

  const orphelins = [...sansSecours.keys()].filter(v => !defs.has(v));
  vrai(f + ' — ⛔ aucune variable utilisée SANS secours n’est orpheline (la propriété serait jetée)',
    orphelins.length === 0, orphelins.join(', '));

  const tolerés = [...avecSecours.keys()].filter(v => !defs.has(v));
  const nonDeclarés = tolerés.filter(v => !(v in ECARTS));
  vrai(f + ' — ⛔ tout jeton qui ne vit que par son secours est DÉCLARÉ dans ECARTS',
    nonDeclarés.length === 0, nonDeclarés.join(', '));

  const declaresMorts = Object.keys(ECARTS).filter(v => !tolerés.includes(v));
  vrai(f + ' — ⛔ … et ECARTS ne parle d’aucun jeton disparu (une décision prise pour du vide)',
    declaresMorts.length === 0, declaresMorts.join(', '));
}

console.log('\n══ 2. L’ACCORD DE VALEURS : LA MARGE DE PLEINE LARGEUR SUIT LE REMBOURRAGE ══\n');
for (const f of PAGES) {
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  /* La feuille de Réglages est une CARTE : c'est `.modal.carte` (0,2,0) qui décide, pas
     `.modal` (0,1,0). Le banc relit la règle réelle, il ne recopie pas un chiffre. */
  const regle = (SRC.match(/\.modal\.carte\{[^}]*\}/) || [])[0] || '';
  vrai(f + ' — population : la règle .modal.carte est trouvée', regle.length > 60, regle.length + ' caractères');
  const pad = (regle.match(/padding:\s*([0-9.]+)px\s+([0-9.]+)px/) || [])[2];
  const jeton = (regle.match(/--rf-modal-marge:\s*([0-9.]+)px/) || [])[1];
  vrai(f + ' — ⛔ .modal.carte porte --rf-modal-marge', !!jeton, 'absente');
  vrai(f + ' — ⛔ … et elle vaut EXACTEMENT son rembourrage horizontal (' + pad + 'px)',
    !!pad && jeton === pad, 'rembourrage ' + pad + ' ≠ jeton ' + jeton);

  /* Et le panneau qui s'en sert doit bien la lire des DEUX côtés — une marge sans son
     rembourrage rendrait le contenu hors de la carte. */
  const pan = (SRC.match(/#rf-reglages\{[^}]*\}/) || [])[0] || '';
  vrai(f + ' — population : la règle du panneau de réglages est trouvée', pan.length > 60, pan.length + ' caractères');
  vrai(f + ' — ⛔ le panneau sort de la marge ET la rend en rembourrage',
    /margin:0 calc\(var\(--rf-modal-marge[^)]*\) \* -1\)/.test(pan) && /padding:[^;]*var\(--rf-modal-marge/.test(pan));
}

console.log('\n══ 3. LES TROIS FAUTES DU 22 SEPTEMBRE NE PEUVENT PLUS REVENIR ══\n');
for (const f of PAGES) {
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  vrai(f + ' — ⛔ plus de var(--bd) : c’était --brd, et la barre « Reprendre » n’avait pas de filet',
    !/var\(\s*--bd\s*\)/.test(SRC));
  vrai(f + ' — ⛔ l’écran de refus prend le jeton d’alerte du thème, pas un ambre figé',
    /var\(--org,#d97706\)/.test(SRC) && !/var\(--warn/.test(SRC));
}

console.log('\n═══ test-766 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
