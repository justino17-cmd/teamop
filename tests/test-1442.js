/* ══ h05 · appareils#9 — L'INDICE DES CHAMPS (::placeholder) GARDAIT LE GRIS DU NAVIGATEUR ═══════════
   Mesuré au pixel sur l'iPhone, sous le verre : `::placeholder` = rgb(117,117,117) (#757575) dans les deux
   thèmes, contraste 2,3 à 3,9:1 la nuit, 3,8 à 4,5:1 le jour (Produits, Boxes, Bons, Boîte mail, Planning
   général). Seule `.nav-loupe input::placeholder` posait une couleur de l'application.

   Ce banc lit le CODE de la feuille (commentaires retirés) : une règle générale `input::placeholder,
   textarea::placeholder` donne un jeton de texte discret (--t3, réglé pour chaque thème et chaque teinte par
   test-757/759/773/774), `opacity:1` (Firefox estompe sinon l'indice par-dessus sa couleur), et AUCUNE règle
   ne pose un gris écrit en dur. Il garde aussi la contre-épreuve : l'indice reste plus pâle que le texte
   saisi (--t1) — il ne prend pas l'encre du texte.
   La mesure au pixel (40 mesures : 2 thèmes × 4 teintes extrêmes + vert × 5 rubriques, toutes ≥ 5,06:1, texte
   saisi toujours plus contrasté que l'indice) est scratchpad/gestion/correctifs/h05/sonde-placeholder.js.   */
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

console.log('\n── 1442 · 1. la population des règles ::placeholder ──');
const regles = [];
const re = /([^{}]*::placeholder[^{}]*)\{([^{}]*)\}/g; let m;
while ((m = re.exec(SRC))) regles.push({ sel: m[1].trim().replace(/\s+/g, ' '), corps: m[2].trim() });
vrai('au moins deux règles ::placeholder (la générale et celle de la loupe du menu)', regles.length >= 2, regles.length);
const generale = regles.find(r => /(^|,\s*)input::placeholder\s*,\s*textarea::placeholder$/.test(r.sel));
vrai('la règle générale « input::placeholder, textarea::placeholder » existe', !!generale, regles.map(r => r.sel));
/* j02 (r4#8-11) : l'indice ne prend plus --t3, réglé pour du texte posé sur la page — sous 4,5:1 sur la pilule du Planning de nuit
   (4,0) et dans la loupe du menu (3,2 / 3,6). Il a SON jeton --ph (l'encre du texte à 80 % la nuit, 68 % le jour), gardé par
   test-1610 sur les contrastes ; ici on garde seulement que la règle lit un JETON de l'application, jamais un gris en dur. */
vrai('elle donne un jeton de l\'application (--ph, dérivé de l\'encre — test-1610 en garde les contrastes)', !!generale && /color\s*:\s*var\(--ph\)/.test(generale.corps), generale && generale.corps);
vrai('elle fixe opacity:1 (l\'indice ne s\'estompe pas deux fois)', !!generale && /opacity\s*:\s*1\b/.test(generale.corps), generale && generale.corps);
const brutes = regles.filter(r => /color\s*:\s*(#|rgb|hsl|gr[ae]y|silver|darkgr)/i.test(r.corps));
vrai('aucune règle ::placeholder ne pose une couleur écrite en dur', brutes.length === 0, brutes);
/* la règle propre à la loupe (--t3 = 52 % d'encre dans .sidebar, 3,2 à 3,6:1) a été RETIRÉE : la loupe lit la règle générale, --ph y est calculé sur l'encre du menu */
vrai('la loupe du menu ne porte plus de règle ::placeholder à elle (--t3 y valait 52 % d\'encre)', !regles.some(r => /\.nav-loupe input::placeholder/.test(r.sel)));

console.log('\n── 1442 · 2. l\'indice n\'est pas l\'encre du texte saisi ──');
vrai('aucune règle ::placeholder ne prend --t1 (l\'encre du texte saisi)', !regles.some(r => /color\s*:\s*var\(--t1\)/.test(r.corps)), regles.map(r => r.corps));
const rampe = /--t1:#EAEEF7;[^}]*--t3:#8B9AB8/.test(SRC) && /--t1:#0E1526;[^}]*--t3:#66748C/.test(SRC);
vrai('--t1 et --t3 sont deux jetons distincts dans les deux thèmes de base (nuit et jour)', rampe);

console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
