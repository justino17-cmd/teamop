/* ══ LE VERRE, LA PALETTE ET LES FAVORIS ═══════════════════════════════════════════════════
   Écrit le 22 septembre 2026, après une soirée de mesures sur le Mac et l'iPhone de Justin.
   Ce banc garde CINQ défauts qui étaient tous invisibles à la lecture :

   1. ⛔⛔ LE CYCLE DE VARIABLES. `.sidebar` définit `--t1:var(--side-ink)` ; la règle du verre
      définissait `--side-ink:var(--t1)`. Un cycle rend invalides TOUTES les variables qui y
      participent — sans erreur, sans avertissement, sans rien dans la console. Mesuré :
      `getComputedStyle(.sidebar).getPropertyValue('--t1')` rendait la chaîne VIDE ; le titre de
      groupe sortait de la même encre que l'item actif (c'est ce qui a fait lire « deux Tableau
      de bord » sur le Mac) et la coupe valait rgba(0,0,0,0).
   2. LE VERRE À 58 %. Deux fois l'opacité de la maquette (.34). À 58 % de blanc, une carte
      n'est plus une vitre : c'est une carte blanche, et le flou n'a plus rien à montrer.
      « J'ai pas le ressenti qu'en est un. »
   3. LES HALOS EN COULEUR D'ACCENT, à 42 %. Qui choisissait Violet se retrouvait avec une page
      violette. Chez Apple le fond reste neutre et la couleur vit dans les CONTRÔLES.
   4. ⛔⛔ TROIS TEINTES SUR HUIT. `--acc-src` n'était défini que pour blue, purple et orange :
      les cinq autres laissaient la variable vide, donc les treize jetons dérivés mouraient
      d'un coup et l'interface restait verte. Aucun moyen de s'en apercevoir à la lecture.
   5. DEUX BARRES DU BAS. `#tabbar` (la pilule en verre, z-index 38) et `.rf-tabs` (z-index 48)
      étaient dessinées toutes les deux sur un téléphone. La pilule existait, personne ne la
      voyait.

   ⛔ Tous les motifs visent du CODE, sur un texte dont les commentaires sont RETIRÉS — ce
   dépôt commente ses correctifs juste au-dessus du code, et un motif qui tombe dans un
   commentaire garde une phrase, pas un comportement. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
/* ⛔ LE NETTOYAGE SÛR : seuls les blocs qui COMMENCENT une ligne. Le motif naïf fait
   disparaître 107 069 caractères d'app.html, dont `saveVehicule` en entier. */
const NU_TEINTE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');

/* ⛔⛔ UN BANC QUI RECOPIE DES VALEURS GARDE UNE CROYANCE ; UN BANC QUI RELIT LA SOURCE GARDE
   UN ACCORD. Le 21 septembre 2026, les surfaces ont été TEINTÉES par la couleur choisie
   (Justin : « chaque couleur qu'on sélectionne, ça change toutes les nuances »). Les valeurs du
   document sont donc désormais enveloppées :
       --vr-fond:color-mix(in srgb,var(--acc-src,#1F7A5C) 4%,rgba(255,255,255,.58))
   Cinq contrôles de ce banc sont tombés — AUCUN parce qu'une vérité avait changé : mesuré au
   navigateur sur les neuf teintes, le verre reste à .58 (.596 une fois la teinte ajoutée), le
   dense reste plus dense (.88 jour, .93 nuit), la carte de nuit reste PLUS CLAIRE que la page
   (+13 à +15 de luminance), et la page de nuit n'est pas noire (17 à 25). Seul le TEXTE avait
   bougé. On dévoile donc la valeur du document avant de la comparer — et, pour que la teinte
   elle-même reste gardée, on la compte séparément plus bas : l'enlever fait tomber le banc. */
function devoile(txt) {
  let out = txt, tour = 0;
  const RE = /color-mix\(in srgb,\s*var\(--acc-src,\s*#[0-9A-Fa-f]{3,8}\)\s*[\d.]+%\s*,\s*((?:[^()]|\([^()]*\))*)\)/g;
  while (RE.test(out) && tour++ < 6) { RE.lastIndex = 0; out = out.replace(RE, '$1'); }
  /* la valeur dévoilée peut rester coupée sur plusieurs lignes (le --vr-page l'est) : on
     resserre les espaces pour que les motifs du document s'y retrouvent. */
  return out.replace(/,\s*\n\s*/g, ',').replace(/\(\s+/g, '(');
}
function teintesDe(txt) {
  return (txt.match(/var\(--acc-src,\s*#[0-9A-Fa-f]{3,8}\)\s*([\d.]+)%/g) || [])
    .map(m => parseFloat(/([\d.]+)%/.exec(m)[1]));
}
const NU = devoile(NU_TEINTE);

let ok = 0, ko = 0;
const vrai = (t, c, d) => { c ? ok++ : ko++; console.log((c ? '  ✓ ' : '  ✗ ') + t + (c ? '' : '\n      → ' + (d === undefined ? '' : d))); };
const eq = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), 'attendu ' + JSON.stringify(b) + ' · obtenu ' + JSON.stringify(a));

/* Une tranche bornée au bloc SUIVANT, jamais à `</style>` : une découpe qui déborde rend un
   verdict faux, et la preuve qu'elle a trouvé quelque chose est un contrôle à part entière. */
/* ⛔ ON DECOUPE DANS LE TEXTE BRUT, ON NETTOIE APRÈS. L'ancre d'un bloc est son TITRE, et un
   titre vit dans un commentaire : chercher l'ancre dans le texte déjà nettoyé rend -1, donc
   une tranche VIDE — et une tranche vide passe au vert sur tout. Pris le 22 septembre 2026,
   sur ce banc-ci, à sa première exécution. */
function bloc(ancre) {
  const i0 = APP.indexOf(ancre);
  if (i0 < 0) return { i0: -1, css: '' };
  const suite = APP.indexOf('/* ══', i0 + 40);
  const fin = APP.indexOf('</style>', i0);
  const b = (suite > 0 && (fin < 0 || suite < fin)) ? suite : fin;
  const brut = APP.slice(i0, b > 0 ? b : i0 + 9000).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  /* brut = le texte tel qu'il est écrit (la teinte comprise) ; css = la valeur du DOCUMENT,
     dévoilée de son enveloppe color-mix. Les deux sont rendus : les accords se vérifient sur
     css, la personnalisation sur brut. */
  return { i0, css: devoile(brut), brut };
}

console.log('\n══ 1. ⛔⛔ LE CYCLE DE VARIABLES — le défaut qui ne dit rien ══\n');
{
  /* La preuve NÉGATIVE d'abord : la forme fautive ne doit exister nulle part. */
  vrai('⛔ aucune règle n’écrit --side-ink:var(--t1) sur la sidebar',
    !/\.sidebar\s*\{[^}]*--side-ink:\s*var\(--t1\)/.test(NU));
  vrai('⛔ … ni --side-mut:var(--t3)', !/\.sidebar\s*\{[^}]*--side-mut:\s*var\(--t3\)/.test(NU));
  /* Puis la preuve POSITIVE : l'encre est capturée sur <html>, où --t1 n'est pas redéfini. */
  vrai('l’encre de la page est capturée sur <html>',
    /html\[data-verre="1"\]\s*\{[\s\S]{0,3000}--vr-encre:\s*var\(--t1\)/.test(NU));
  vrai('… et la sidebar la LIT au lieu de la recalculer',
    /html\[data-verre="1"\] \.sidebar\{[\s\S]{0,700}--side-ink:var\(--vr-encre\)/.test(NU));
  vrai('⛔ le titre de groupe tire son encre de --vr-encre, pas de --t1',
    /html\[data-verre="1"\] \.sidebar \.nav-label\{color:color-mix\(in srgb,var\(--vr-encre\)/.test(NU));
  vrai('⛔ la coupe aussi (un color-mix d’un color-mix transparent rendait rgba(0,0,0,0))',
    /html\[data-verre="1"\] \.nav-coupe\{background:color-mix\(in srgb,var\(--vr-encre\)/.test(NU));
  /* ⛔ Et la règle qui a créé le cycle doit rester en place : c'est elle qu'on ne doit pas
     « corriger » en retirant --t1 de la sidebar, ce qui casserait tout le reste du menu. */
  vrai('la sidebar définit toujours --t1 pour son propre contenu (c’est voulu)',
    /\.sidebar\{[^}]*--t1:var\(--side-ink\)/.test(NU));
}

console.log('\n══ 2. LE VERRE AUX VALEURS DE LA MAQUETTE ══\n');
{
  const { i0, css } = bloc('PLATEFORME — le rendu suit l\'appareil');
  vrai('⛔ le bloc PLATEFORME est trouvé (sinon tout ce qui suit est creux)', i0 > 0);
  vrai('   … et il a de la matière', css.length > 3000, css.length + ' caractères');
  /* ⛔⛔ CE BANC A GARDÉ LA MAUVAISE VALEUR PENDANT UNE JOURNÉE, ET C'EST LA LEÇON.
     Il exigeait « 34 %, pas 58 % » — un réglage fait à l'œil, contre la maquette. Justin a
     fourni le document le 22 septembre 2026 (« regarde bien que tout le reste soit comme le
     thème ») : § 4 dit .58, et il dit aussi liseré .72, reflet interne .85, ombre 0 10px 28px.
     C'est un ENSEMBLE : à .34 avec un liseré à .85, le liseré était plus opaque que la vitre
     qu'il borde — l'inverse d'une matière. Le banc gardait donc une moitié d'accord.
     Il garde maintenant `design/THEME-REFERENCE.md`, et `tests/test-759.js` relit le document
     lui-même pour que les deux ne puissent plus diverger en silence. */
  vrai('le verre de jour est à 58 %, la valeur du document', /--vr-fond:rgba\(255,255,255,\.58\)/.test(css));
  vrai('⛔ et le réglage fait à l’œil a bien disparu', !/--vr-fond:rgba\(255,255,255,\.34\)/.test(css));
  vrai('⛔ le liseré est MOINS opaque que la vitre (.72 contre .58 + reflet)',
    /--vr-liseret:rgba\(255,255,255,\.72\)/.test(css));
  /* ⛔⛔ DE NUIT, C'EST LA LUMIÈRE QUI ÉLÈVE, PAS L'OMBRE. `rgba(28,28,30,.42)` — la valeur
     de la maquette — est plus SOMBRE que la page : la carte s'enfonçait au lieu de se lever,
     et l'écran devenait un aplat de rectangles à peine distincts. Justin, 22 septembre 2026,
     sur son Mac : « revois les nuances de couleur, je la trouve moins belle l'app ».
     La surface de nuit est donc PLUS CLAIRE que le fond, et teintée du même bleu nuit — un
     film gris sur du bleu se voit, et se voit mal. */
  vrai('⛔ la surface de nuit est PLUS CLAIRE que la page (l’élévation se fait par la lumière)',
    /--vr-fond:rgba\(44,56,84,\.55\)/.test(css));
  /* Le document veut un voile BLANC pour la surface secondaire de nuit : un navy sur du navy
     ne se détache de rien, et c'est la lumière qui élève. */
  vrai('⛔ la surface secondaire de nuit est un voile BLANC, pas un second navy',
    /--vr-fond2:rgba\(255,255,255,\.08\)/.test(css));
  vrai('⛔ … et l’ancienne valeur, plus sombre que le fond, a disparu',
    !/--vr-fond:rgba\(28,28,30,\.42\)/.test(css));
  /* ⛔ PAS DE NOIR PUR — la règle est dans CLAUDE.md, et je l'avais recopié de la maquette. */
  vrai('⛔ la page de nuit n’est pas noire (halation, contraste dur sur OLED)',
    /--vr-page:linear-gradient\(180deg,#101A2E,#0A1120\)/.test(css) && !/--vr-page:linear-gradient\(180deg,#0a0a0c,#000\)/.test(css));
  /* ⛔ LE REFLET EST UN DÉGRADÉ, PAS UNE OMBRE. C'est lui qui donne la matière : une ombre
     interne d'un pixel ne fait qu'un liseré. */
  /* ⚠ RAMENÉ DE .65 À .22 — arithmétique, pas goût. Le document décrit le reflet comme un
     `inset 0 1px 0` (un cheveu de lumière) ; ce dépôt le peint en dégradé à 135°, ce qui donne
     la matière mais S'AJOUTE à la surface. Empilé sur .58, le coin clair montait à
     .58 + .42×.65 = .85 : un aplat blanc. À .22 le point le plus clair plafonne à .67, sous
     le liseré (.72), qui redevient la ligne la plus lumineuse de la carte — comme chez Apple. */
  vrai('⛔ le reflet est un dégradé à 135°', /--vr-reflet:linear-gradient\(135deg,rgba\(255,255,255,\.22\)/.test(css));
  vrai('   … et il ne blanchit plus la vitre qu’il éclaire',
    !/--vr-reflet:linear-gradient\(135deg,rgba\(255,255,255,\.65\)/.test(css));
  vrai('⛔ … et plus une ombre interne', !/--vr-reflet:inset/.test(css));
  vrai('l’ombre est celle du document (0 10px 28px / 0 14px 36px)',
    /--vr-ombre:0 10px 28px rgba\(0,0,0,\.08\)/.test(css)
    && /--vr-ombre-barre:0 14px 36px rgba\(0,0,0,\.14\)/.test(css));
  vrai('   … avec le reflet interne du document (inset 0 1px 0 rgba(255,255,255,.85))',
    /inset 0 1px 0 rgba\(255,255,255,\.85\)/.test(css));
  /* Le reflet doit être POSÉ, pas seulement déclaré : il se met en première couche de
     `background`. Un jeton défini que personne n'applique est du code mort qui a l'air d'une
     garde — c'est la règle d'`atts` dans /health, appliquée au style. */
  /* ⚠ ON COMPTE SUR TOUT LE FICHIER, PAS SUR CE BLOC. Les surfaces de verre sont éparpillées
     par nature : la carte et la barre du haut sont ici, la pilule du bas dans « NAVIGATION »,
     la feuille dans « + Créer », la fenêtre de connexion dans le sien. Compter dans la seule
     tranche PLATEFORME rendait 3 et faisait crier le banc sur du code juste — c'est la
     jumelle de la découpe qui déborde : ici elle ne déborde pas assez. */
  const poses = (NU.match(/background:var\(--vr-reflet\),var\(--vr-fond/g) || []).length;
  vrai('⛔ le reflet est POSÉ sur au moins huit surfaces (déclarer ne suffit pas)',
    poses >= 8, poses + ' surface(s)');
  /* Les quatre qui comptent le plus, nommées une par une : une surface oubliée se voit à l'œil
     comme un aplat au milieu de vitres. */
  ['.tabbar', '.creer-sheet', '.login-card', '.sidebar'].forEach(sel => {
    const bloc2 = NU.indexOf('html[data-verre="1"] ' + sel) >= 0 || NU.indexOf('] ' + sel + '{') >= 0;
    vrai('   ' + sel + ' est bien une surface de verre', bloc2);
  });
  vrai('le fond de page est celui du document (#f7f7f9 → #eeeef2)',
    /--vr-page:linear-gradient\(180deg,#f7f7f9,#eeeef2\)/.test(css));
}

/* ══════════════════════════════════════════════════════════════════════════════════════
   L'ENCRE POSÉE SUR L'ACCENT — un contraste, donc un CALCUL, pas un motif

   ⛔⛔ CE CONTRÔLE NE POUVAIT PAS ÊTRE UNE EXPRESSION RÉGULIÈRE. Le défaut qu'il garde était
   invisible à la lecture : le mode JOUR fonce la teinte de 22 % (`--acc`), mais l'encre posée
   dessus (`--on-acc`) restait celle de la NUIT — un navy #0B1426 — pour les teintes sans
   surcharge. Du sombre sur du sombre. Mesuré le 21 septembre 2026 sur les dix-huit
   combinaisons : bleu 3,03:1, violet 2,98:1, cyan 4,09:1 — trois des neuf couleurs que
   l'utilisateur peut choisir, illisibles en plein jour.
   ⚠ Et le commentaire qui vivait à cet endroit disait l'INVERSE du code (« le cyan, le rose
   et le rouge gardent leur encre sombre » alors qu'ils étaient déjà passés au blanc) : c'est
   le signe qui aurait dû alerter. Un banc qui calcule ne peut pas se faire mentir ainsi.
   ══════════════════════════════════════════════════════════════════════════════════════ */
{
  const hex = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
  const lin = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
  const lum = c => .2126 * lin(c[0]) + .7152 * lin(c[1]) + .0722 * lin(c[2]);
  const contraste = (a, b) => { const L1 = lum(a), L2 = lum(b); return (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05); };
  const foncer = (c, p) => c.map(v => Math.round(v * (1 - p)));

  const src = {}, onBase = {}, onJour = {}, accJour = {}, srcN = {}, onNuit = {};
  for (const m of NU_TEINTE.matchAll(/html\[data-refonte\]\[data-accent="(\w+)"\]\s*\{\s*--acc-src:(#[0-9A-Fa-f]{6});\s*--on-acc:(#[0-9A-Fa-f]{6});/g)) { src[m[1]] = m[2]; onBase[m[1]] = m[3]; }
  for (const m of NU_TEINTE.matchAll(/html\[data-refonte\]\[data-theme="light"\]\[data-accent="(\w+)"\]\s*\{([^}]*)\}/g)) {
    const o = /--on-acc:(#[0-9A-Fa-f]{6})/.exec(m[2]); if (o) onJour[m[1]] = o[1];
    const a = /--acc:color-mix\(in srgb,#000 (\d+)%/.exec(m[2]); if (a) accJour[m[1]] = +a[1] / 100;
  }
  for (const m of NU_TEINTE.matchAll(/html\[data-refonte\]\[data-theme="dark"\]\[data-accent="(\w+)"\]\s*\{\s*--acc-src:(#[0-9A-Fa-f]{6});\s*--on-acc:(#[0-9A-Fa-f]{6});/g)) { srcN[m[1]] = m[2]; onNuit[m[1]] = m[3]; }

  const teintes = Object.keys(src);
  /* ⛔ COMPTER LA POPULATION AVANT DE CROIRE UN VERDICT : sur une liste vide, « tout passe ». */
  /* Douze depuis le thème final du 24 septembre 2026 : les onze de la maquette (trois de marque —
     TEAM OP, OP GESTION, Marine — et huit système), plus le rouge qu'on ne retire pas. */
  vrai('les douze teintes sont lues, jour et nuit', teintes.length === 12 && Object.keys(srcN).length === 12,
    teintes.length + ' de jour, ' + Object.keys(srcN).length + ' de nuit');
  /* le fonçage par défaut du jour, lu dans la feuille plutôt que recopié ici */
  const parDefaut = (/html\[data-refonte\]\[data-theme="light"\]\[data-accent\]\{\s*--acc:color-mix\(in srgb,#000 (\d+)%/.exec(NU_TEINTE) || [, '22'])[1] / 100;
  vrai('le fonçage de jour est lu dans la feuille', parDefaut > 0 && parDefaut < 1, (parDefaut * 100) + ' %');

  /* ⛔⛔ ET IL Y A TROIS SURFACES D'ACCENT, PAS UNE. Ce contrôle n'en regardait qu'une (`--acc`)
     et laissait passer les deux autres. L'application peint aussi `--acc-fill` — le BOUTON
     PRINCIPAL, le bouton flottant, l'étiquette de carte, le rattrapage du planning — et
     `--acc2` — la bulle du message envoyé, « Fait », « Occupé ». Mesuré au navigateur le
     22 septembre 2026 : `--on-acc` passait 18/18 sur `--acc` et tombait CINQ fois sur
     `--acc-fill` (bleu 3,45 · violet 3,55 · rose 3,53 · rouge 3,64 de nuit, cyan 3,44 de jour)
     et CINQ fois sur `--acc2`. Une encre par surface, donc, et chacune calculée ici.
     ⚠ Les taux de fonçage sont LUS dans la feuille, jamais recopiés : les changer là-bas
     change ce banc, et c'est ce qui en fait un accord et non une croyance. */
  const taux = (bloc, jeton, defaut) => {
    const b = new RegExp('html\\[data-refonte\\]' + bloc + '\\[data-accent\\]\\{([\\s\\S]*?)\\}').exec(NU_TEINTE);
    if (!b) return defaut;
    const m = new RegExp('--' + jeton + ':color-mix\\(in srgb,#000 (\\d+)%').exec(b[1]);
    return m ? +m[1] / 100 : defaut;
  };
  const fillN = taux('', 'acc-fill', .20), acc2N = taux('', 'acc2', .18);
  const fillJ = taux('\\[data-theme="light"\\]', 'acc-fill', .14), acc2J = taux('\\[data-theme="light"\\]', 'acc2', .34);
  vrai('les taux de fonçage des trois surfaces sont lus dans la feuille',
    [fillN, acc2N, fillJ, acc2J].every(v => v > 0 && v < 1),
    'nuit fill ' + fillN + ' / acc2 ' + acc2N + ' · jour fill ' + fillJ + ' / acc2 ' + acc2J);

  /* les deux encres dérivées, avec leurs exceptions déclarées */
  const lireEncre = (jeton) => {
    const base = {}, jour = {}, nuit = {};
    for (const m of NU_TEINTE.matchAll(new RegExp('html\\[data-refonte\\]\\[data-theme="light"\\]\\[data-accent="(\\w+)"\\]\\s*\\{[^}]*--' + jeton + ':(#[0-9A-Fa-f]{6})', 'g'))) jour[m[1]] = m[2];
    for (const m of NU_TEINTE.matchAll(new RegExp('html\\[data-refonte\\]\\[data-theme="dark"\\]\\[data-accent="(\\w+)"\\]\\s*\\{[^}]*--' + jeton + ':(#[0-9A-Fa-f]{6})', 'g'))) nuit[m[1]] = m[2];
    return { base, jour, nuit };
  };
  const eFill = lireEncre('on-fill'), eAcc2 = lireEncre('on-acc2');
  /* ⛔ ET UN REMPLISSAGE PEUT ÊTRE DÉCLARÉ, PAS DÉRIVÉ. Le thème final donne aux trois teintes de
     marque le remplissage EXACT de la maquette (le « Créer » marine de jour, gris-bleu clair de
     nuit), et au graphite son gris foncé : ce sont des surfaces que le calcul par fonçage ne
     connaît pas. On les lit comme les encres — une exception déclarée, par teinte et par mode —
     et c'est ELLE qu'on éprouve quand elle existe. Sans ça, le banc jugerait une surface qui
     n'est jamais peinte. */
  const pFill = lireEncre('acc-fill'), pAcc2 = lireEncre('acc2');
  vrai('⛔ les remplissages déclarés sont lus (trois teintes de marque et le graphite)',
    ['teamop', 'marine', 'opgestion', 'graphite'].every(t => pFill.jour[t] && pFill.nuit[t]),
    JSON.stringify({ jour: pFill.jour, nuit: pFill.nuit }));
  /* `--on-fill` hérite de `--on-acc`, `--on-acc2` hérite de `--on-fill` : on rejoue la chaîne. */
  const encreFill = (t, jour) => (jour ? eFill.jour[t] : eFill.nuit[t]) || (jour ? onJour[t] : onNuit[t]) || onBase[t];
  const encreAcc2 = (t, jour) => (jour ? eAcc2.jour[t] : eAcc2.nuit[t]) || encreFill(t, jour);
  vrai('⛔ la chaîne des encres est déclarée (--on-fill puis --on-acc2 héritent)',
    /--on-fill:var\(--on-acc\)/.test(NU_TEINTE) && /--on-acc2:var\(--on-fill\)/.test(NU_TEINTE));
  /* ⛔ ET CE N'EST PAS UN CYCLE : la règle de cette page tue toute variable qui se lit elle-même. */
  vrai('   … et aucune encre ne se lit elle-même (le cycle tue les trois d’un coup)',
    !/--on-acc:\s*var\(--on-(fill|acc2)\)/.test(NU_TEINTE) && !/--on-fill:\s*var\(--on-acc2\)/.test(NU_TEINTE));

  teintes.forEach(t => {
    const aJ = foncer(hex(src[t]), accJour[t] !== undefined ? accJour[t] : parDefaut);
    const aN = hex(srcN[t] || src[t]);
    const cJ = contraste(aJ, hex(onJour[t] || onBase[t]));
    const cN = contraste(aN, hex(onNuit[t] || onBase[t]));
    vrai('   ' + t.padEnd(9) + ' l’encre tient sur l’accent de JOUR', cJ >= 4.5, cJ.toFixed(2) + ':1');
    vrai('   ' + t.padEnd(9) + ' … et sur celui de NUIT', cN >= 4.5, cN.toFixed(2) + ':1');
    /* --acc-fill : le bouton principal */
    const surfFJ = pFill.jour[t] ? hex(pFill.jour[t]) : foncer(hex(src[t]), fillJ);
    const surfFN = pFill.nuit[t] ? hex(pFill.nuit[t]) : foncer(hex(srcN[t] || src[t]), fillN);
    const fJ = contraste(surfFJ, hex(encreFill(t, true)));
    const fN = contraste(surfFN, hex(encreFill(t, false)));
    vrai('   ' + t.padEnd(9) + ' … sur le BOUTON (--acc-fill) de jour', fJ >= 4.5, fJ.toFixed(2) + ':1');
    vrai('   ' + t.padEnd(9) + ' … et de nuit', fN >= 4.5, fN.toFixed(2) + ':1');
    /* --acc2 : la bulle du message, « Fait », « Occupé » */
    const surfDJ = pAcc2.jour[t] ? hex(pAcc2.jour[t]) : foncer(hex(src[t]), acc2J);
    const surfDN = pAcc2.nuit[t] ? hex(pAcc2.nuit[t]) : foncer(hex(srcN[t] || src[t]), acc2N);
    const dJ = contraste(surfDJ, hex(encreAcc2(t, true)));
    const dN = contraste(surfDN, hex(encreAcc2(t, false)));
    vrai('   ' + t.padEnd(9) + ' … sur le SECOND accent (--acc2) de jour', dJ >= 4.5, dJ.toFixed(2) + ':1');
    vrai('   ' + t.padEnd(9) + ' … et de nuit', dN >= 4.5, dN.toFixed(2) + ':1');
  });

  /* ⛔ ET PLUS AUCUN BLANC EN DUR SUR UN APLAT D'ACCENT. C'est le défaut que les trois encres
     réparent : `color:#fff` sur `var(--acc)` tombait 9 fois sur 18 (1,09 à 3,65), et personne
     ne pouvait le voir à la lecture. Un contrôle qui compte des absences doit prouver qu'il
     regarde au bon endroit : on compte donc AUSSI les règles examinées. */
  {
    const CSS = (NU_TEINTE.match(/<style[^>]*>[\s\S]*?<\/style>/g) || []).join('');
    let examinees = 0, fautives = [], pos = 0;
    for (;;) {
      const o = CSS.indexOf('{', pos); if (o < 0) break;
      const f = CSS.indexOf('}', o); if (f < 0) break;
      /* ⛔ `lastIndexOf(x, o)` INCLUT l'index o — et o EST l'accolade ouvrante. Sans le -1, le
         sélecteur revient VIDE à chaque tour, le `if (!sel)` saute tout, et le banc annonce
         « 0 règle » sur 2 848 parcourues. C'est le compteur de population qui l'a attrapé :
         sans lui, « aucun blanc en dur » passait au vert sur rien du tout. */
      const deb = Math.max(CSS.lastIndexOf('}', o - 1), CSS.lastIndexOf('{', o - 1)) + 1;
      const sel = CSS.slice(deb, o).trim().replace(/\n/g, ' '), corps = CSS.slice(o + 1, f);
      pos = f + 1;
      if (!sel || sel[0] === '@') continue;
      if (!/background(?:-color|-image)?:[^;]*var\(--acc(?:-fill|2)?\)/.test(corps)) continue;
      examinees++;
      const c = /(?<!-)color:\s*(#[0-9A-Fa-f]{3,6}|white)\b/i.exec(corps);
      if (c && ['#fff', '#ffffff', 'white'].includes(c[1].toLowerCase())) fautives.push(sel.slice(0, 60));
    }
    vrai('⛔ il y a bien des règles à examiner (un zéro sur rien ne prouve rien)', examinees >= 15, examinees + ' règles');
    vrai('⛔ aucune ne pose un BLANC EN DUR sur un aplat d’accent', fautives.length === 0, fautives.join(' · '));
  }
}

/* ⛔⛔ AUCUNE RÈGLE NE DOIT VISER .kpis .kpi:first-child — ET C'EST CONTRE-INTUITIF, PARCE QUE
   DEUX DES TROIS RÈGLES QU'ON A RETIRÉES SERVAIENT À EN NEUTRALISER UNE TROISIÈME.
   Une règle `.kpis .kpi:first-child` pèse (0,3,0) ; le verre s'écrit `html[data-verre="1"] .kpi`,
   soit (0,2,1). La plus spécifique gagne, `!important` ou pas, des DEUX côtés. La première tuile
   du tableau de bord restait donc OPAQUE pendant que ses voisines étaient en verre — blanche le
   jour, #101A2E la nuit. Justin, 21 septembre 2026, capture à l'appui : « pourquoi le premier
   carré est noir ». Mesuré avant correction : α=1 sur la 1re tuile, α=.58 sur la 2e, dans les
   neuf teintes et les deux modes. La seule sortie est de n'écrire AUCUNE règle. */
{
  /* ⚠ On ne vise QUE la tuile elle-même : `.kpis .kpi:first-child{` ou `…:first-child,`.
     `.kpis .kpi:first-child .kpi-ico{` est une autre affaire — elle colore la tuile d'icône,
     pas le fond de la carte, et ne dispute donc rien au verre. Un motif qui les confondrait
     accuserait le code d'un défaut qu'il n'a pas. */
  const regles = (NU_TEINTE.match(/\.kpis\s+\.kpi:first-child\s*[,{]/g) || []);
  vrai('⛔ aucune règle ne vise la TUILE .kpis .kpi:first-child (elle battrait le verre)',
    regles.length === 0, regles.length ? regles.length + ' règle(s)' : 'aucune');
  /* le contre-contrôle : la tuile doit bien recevoir le verre par la règle commune */
  vrai('   … et .kpi est bien une surface de verre',
    /html\[data-verre="1"\][^{]*\.kpi[^{]*\{[^}]*--vr-fond/.test(NU));
}

/* ⛔ LE DÉVOILEMENT CI-DESSUS RENDRAIT LE BANC AVEUGLE À LA TEINTE ELLE-MÊME : sans ce
   contrôle, la RETIRER ne ferait tomber aucune vérification, et l'application redeviendrait
   identique dans les neuf teintes sans un mot. On la compte donc sur le texte BRUT, et on
   borne : au-delà, ce n'est plus une nuance, c'est une couche de peinture sur le contenu. */
{
  const t = teintesDe(NU_TEINTE);
  vrai('⛔ les surfaces sont bien TEINTÉES par la couleur choisie', t.length >= 20, t.length + ' enveloppe(s) color-mix(var(--acc-src) …)');
  /* ⛔⛔ UN TOTAL NE PROUVE PAS QUE CHAQUE JETON EST TEINTÉ — mesuré : retirer la teinte du
     SEUL --card de nuit ne faisait tomber aucun contrôle, le total restant bien au-dessus du
     plancher. C'est la règle du dépôt par l'autre bout : quand une mutation ne casse rien, la
     question n'est pas « le code est-il bon ? » mais « qu'est-ce que le banc ne REGARDE pas ? ».
     On compte donc jeton par jeton. Trois déclarations pour la palette (une de nuit, deux de
     jour — le réglage explicite et son miroir @media), deux pour le verre. --vr-fond2 de nuit
     est le voile BLANC du document : il ne se teinte pas, et c'est voulu. */
  const ATTENDU = { '--bg':3, '--bg1':3, '--bg2':3, '--bg3':3, '--card':3, '--card2':3,
                    '--deep':3, '--vr-fond':2, '--vr-fond-dense':2, '--vr-page':2 };
  Object.keys(ATTENDU).forEach(j => {
    const n = (NU_TEINTE.match(new RegExp('\\' + j + ':\\s*(?:linear-gradient\\([^;]*)?color-mix\\(in srgb,\\s*var\\(--acc-src', 'g')) || []).length;
    vrai('   ' + j + ' est teinté partout où il est déclaré', n >= ATTENDU[j], n + ' / ' + ATTENDU[j] + ' attendue(s)');
  });
  /* ⛔ LA SOURCE, JAMAIS UN DÉRIVÉ — mais seulement pour les JETONS DE SURFACE. `--acc` est
     lui-même dérivé (jour : color-mix(#000 22%, --acc-src)) : une surface bâtie dessus
     serait teintée deux fois et virerait au sale. Ailleurs dans la feuille, teinter un
     élément avec var(--acc) est normal et reste permis — ce contrôle ne vise que la palette. */
  ['--bg', '--bg1', '--bg2', '--bg3', '--card', '--card2', '--vr-fond', '--vr-fond2', '--vr-fond-dense']
    .forEach(jeton => {
      const decls = NU_TEINTE.match(new RegExp('\\' + jeton + ':\\s*color-mix\\([^;]*', 'g')) || [];
      const fautifs = decls.filter(d => /var\(--acc[),]/.test(d));
      vrai('   ' + jeton + ' se teinte depuis --acc-src, pas depuis un dérivé',
        fautifs.length === 0, decls.length + ' teinture(s)');
    });
  vrai('⛔ … et chaque teinte reste une nuance (≤ 12 %)',
    t.length > 0 && Math.max(...t) <= 12, t.length ? 'la plus forte : ' + Math.max(...t) + ' %' : 'aucune');
  /* ⛔ color-mix(…, transparent) ASSOMBRIT — transparent vaut rgba(0,0,0,0). Une teinte posée
     sur « transparent » salirait la surface au lieu de la colorer. */
  vrai('⛔ … et aucune ne se mélange à « transparent »',
    !/var\(--acc-src,[^)]*\)\s*[\d.]+%\s*,\s*transparent\s*\)/.test(NU_TEINTE));
}

/* ══════════════════════════════════════════════════════════════════════════════════════
   LE DÉGRADÉ DES BARRES — un seul jeton, cinq points d'application

   Justin, 21 septembre 2026, capture d'iPhone à l'appui : « que ce soit téléphone, Mac, tout
   appareil, quand les personnes sélectionnent une couleur dans les réglages, faudrait que le
   dégradé soit de la couleur […] moins présent, plus nuancé ».

   ⛔ POURQUOI CINQ POINTS ET PAS UN : le verre ne s'allume que sur Safari 26. Poser le dégradé
   uniquement sous `html[data-verre="1"]` laisserait Android, Chrome et toute transparence
   réduite avec des barres grises — le défaut exact qu'on venait de corriger sur les cartes.
   Il faut donc les DEUX chemins, pour la barre latérale comme pour la barre du haut, plus la
   barre d'onglets du téléphone.
   ══════════════════════════════════════════════════════════════════════════════════════ */
{
  const toutes = NU_TEINTE.match(/--rf-barre:\s*linear-gradient\([\s\S]*?\);/g) || [];
  /* ⛔⛔ LE GRAPHITE DE NUIT EST UNE EXCEPTION DÉCLARÉE, ET ELLE EST ARITHMÉTIQUE.
     Son accent de nuit est #F5F5F7 — presque blanc. Mélangé au navy de la barre il ne la
     COLORE pas, il l'ÉCLAIRCIT, donc il rapproche le fond de l'encre du menu. Mesuré au
     navigateur, bureau, verre allumé, les neuf teintes : le pire libellé passait de 4,07:1
     à 3,65:1 rien qu'en allumant le dégradé. Baisser la dose pour TOUT LE MONDE ne rendait
     que 3,76 et affadissait les huit autres teintes. Le graphite prend donc un voile
     d'ACIER (la teinte du logo) au lieu de son accent : perte ramenée à 0,06, soit du bruit.
     ⚠ Si quelqu'un retire cette exception, la lisibilité du menu baisse sans un mot. */
  const exception = toutes.filter(d => /143,163,188/.test(d));
  const defs = toutes.filter(d => !/143,163,188/.test(d));
  vrai('⛔ le dégradé des barres est défini pour le JOUR **et** pour la NUIT',
    defs.length === 2, defs.length + ' définition(s) générale(s)');
  vrai('⛔ le graphite de NUIT garde son exception d’acier (sinon le menu perd 0,4 de contraste)',
    exception.length === 1 && /data-accent="graphite"/.test(NU_TEINTE), exception.length + ' exception(s)');
  defs.forEach((d, i) => {
    vrai('   définition ' + (i + 1) + ' tire ses canaux de --acc-rgb, pas d’une teinte figée',
      /rgba\(var\(--acc-rgb/.test(d));
    /* ⛔ UN DÉGRADÉ QUI FINIT SUR « transparent » PASSE PAR DU NOIR et salit le bord :
       transparent vaut rgba(0,0,0,0). Les arrêts doivent porter la MÊME teinte. */
    vrai('   définition ' + (i + 1) + ' n’a aucun arrêt « transparent »', !/transparent/.test(d));
    const arrets = (d.match(/rgba\(var\(--acc-rgb[^)]*\)\s*,\s*\.?\d*\.?\d+\)/g) || []).length;
    vrai('   définition ' + (i + 1) + ' porte trois arrêts de la même teinte', arrets === 3, arrets + ' arrêt(s)');
  });
  /* ⛔ LE JOUR EST PLUS FORT QUE LA NUIT, ET C'EST UNE MESURE, PAS UN GOÛT : sur la barre
     latérale de jour, avant correctif, les neuf teintes ne se séparaient que de 8 unités et
     le dégradé haut→bas valait 5 à 7 — autant dire rien. Le blanc désature. */
  {
    const alpha = d => { const m = /rgba\(var\(--acc-rgb[^)]*\)\s*,\s*(\.?\d*\.?\d+)\)/.exec(d); return m ? parseFloat(m[1]) : 0; };
    /* la définition de NUIT porte le repli vert clair 46,184,114 ; celle de JOUR le vert sombre 30,132,80 */
    const nuit = defs.find(d => /46,184,114/.test(d)), jour = defs.find(d => /30,132,80/.test(d));
    vrai('   les deux définitions se distinguent par leur repli', !!nuit && !!jour);
    vrai('⛔ … et le JOUR est plus appuyé que la NUIT (le blanc désature)',
      !!nuit && !!jour && alpha(jour) > alpha(nuit), (jour ? alpha(jour) : '?') + ' contre ' + (nuit ? alpha(nuit) : '?'));
  }
  /* Les cinq points d'application, nommés un par un : un motif qui compte seulement les
     occurrences ne dirait pas LEQUEL manque. */
  const POINTS = [
    ['barre latérale, avec verre', /html\[data-verre="1"\] \.sidebar\{\s*background:var\(--vr-reflet\),var\(--rf-barre\),var\(--vr-fond\)/],
    ['barre du haut, avec verre',  /html\[data-verre="1"\] \.topbar\{\s*background:var\(--vr-reflet\),var\(--rf-barre\),var\(--vr-fond\)/],
    ['barre latérale, sans verre', /\.sidebar\{background:var\(--rf-barre\),var\(--side\)/],
    ['barre du haut, sans verre',  /\.topbar\{background:var\(--rf-barre\),var\(--toolbar\)/],
    ['barre d’onglets du téléphone', /background:var\(--rf-barre\),var\(--toolbar\);/],
  ];
  POINTS.forEach(([nom, re]) => vrai('   ' + nom + ' porte le dégradé', re.test(NU_TEINTE)));
  vrai('⛔ le dégradé se glisse SOUS le reflet, jamais par-dessus (c’est une teinture de la matière)',
    !/background:var\(--rf-barre\),var\(--vr-reflet\)/.test(NU_TEINTE));
}

/* ⛔⛔ LES 62 PIXELS DE VIDE SOUS LA CARTE UTILISATEUR. Un dégagement avait été posé sur la
   barre latérale du téléphone pour qu'elle ne passe pas sous la barre d'onglets. Mais le
   tiroir est à z-index 46 et `.rf-tabs` à 44 : il la COUVRE, toujours. Le dégagement ne
   creusait donc qu'un trou — mesuré au gabarit iPhone 15 Pro, tiroir ouvert : 62 px sous la
   carte, 96 px sur un vrai appareil avec l'encoche du bas. Justin : « tout en bas est
   vachement haut, faudrait qu'il soit au maximum au plus bas ». */
{
  const r = /html\[data-refonte\] body\.rf-onglets \.sidebar\{([^}]*)\}/.exec(NU_TEINTE);
  vrai('la règle du tiroir sur téléphone est trouvée', !!r);
  if (r) {
    vrai('⛔ aucun dégagement en pixels sous la carte utilisateur',
      !/padding-bottom:calc\(\s*\d+px/.test(r[1]), r[1].slice(0, 100));
    /* ⛔ ET PLUS AUCUN DÉGAGEMENT DU TOUT ICI. Il en portait un (`env(safe-area-inset-bottom)`)
       pendant que le pied portait ses 14 px : les deux S'AJOUTAIENT. Mesuré au gabarit iPhone
       installé, encoches simulées par le navigateur (Emulation.setSafeAreaInsetsOverride, les
       ZÉROS de l'émulateur cachaient tout) : 48 px sous la carte là où l'encoche en demande 34.
       Le dégagement vit désormais au SEUL endroit qui le doit, sur `.sidebar-foot`, et en
       `max()` — le plus grand des deux, jamais la somme. */
    vrai('⛔ … et plus aucune encoche non plus : elle est passée au pied, en un seul endroit',
      !/padding-bottom/.test(r[1]), r[1].slice(0, 100));
    /* le contre-contrôle : le tiroir doit bien rester AU-DESSUS de la barre d'onglets,
       sinon retirer le dégagement cacherait vraiment la carte. */
    vrai('⛔ … et le tiroir passe bien AU-DESSUS de la barre d’onglets',
      /z-index:46/.test(r[1]) && /\.rf-tabs\{[^}]*z-index:44/.test(NU_TEINTE));
  }
  /* La VÉRITÉ que gardait l'ancien contrôle — « la carte ne tombe pas sous la barre d'accueil »
     — n'a pas changé de valeur, elle a changé d'ADRESSE. On la garde donc là où elle vit. */
  const f = /\n\s*\.sidebar-foot\{([^}]*)\}/.exec(NU_TEINTE);
  vrai('la règle du pied du tiroir est trouvée', !!f);
  if (f) {
    vrai('⛔ l’encoche du bas est gardée, sur le pied',
      /padding-bottom:max\(14px,env\(safe-area-inset-bottom\)\)/.test(f[1]), f[1]);
    vrai('   … et c’est un max(), pas une addition : 34 px sur iPhone, 14 px ailleurs',
      !/padding-bottom:calc\([^)]*env\(safe-area-inset-bottom/.test(f[1]));
  }
}

/* ⛔⛔ UN SÉPARATEUR QUI NE SÉPARE RIEN EST UN TROU — mesuré le 22 septembre 2026, cinq gabarits.
   La rangée « SUITE » s'efface dès qu'il n'y a pas d'autre application à ouvrir (`suiteRefresh`),
   c'est-à-dire chez TOUTE entreprise sans OP MESSAGES : le cas ordinaire. Le filet et la marge
   de la carte utilisateur restaient pourtant sous le filet du pied — deux filets, 25 px de vide
   entre les deux, contre 15 px quand la rangée est là. Justin, capture à l'appui : « l'espace
   qu'il y a entre l'utilisateur tout en bas et le reste ».
   ⚠️ La mesure d'AVANT ne pouvait pas le voir : elle mesurait le pied COMME UN BLOC (« 0 de vide
   sous le pied ») et ne regardait jamais DEDANS. C'est la règle de cette page — une mesure qui
   compte des absences doit d'abord prouver qu'elle regarde au bon endroit. */
{
  vrai('la carte utilisateur perd son filet quand la rangée SUITE est masquée',
    /\.sidebar-foot\.sans-suite \.suite-user\{[^}]*border-top:0/.test(NU_TEINTE));
  vrai('   … et sa marge du haut avec (c’est elle qui creusait les 25 px)',
    /\.sidebar-foot\.sans-suite \.suite-user\{[^}]*margin-top:0/.test(NU_TEINTE));
  /* Le contre-contrôle : AVEC la rangée, le filet et la marge doivent RESTER — sinon la carte
     se colle au sélecteur d'application et on a juste déplacé le défaut. */
  vrai('⛔ … mais la carte garde filet et marge quand la rangée SUITE est là',
    /\n\.suite-user\{[^}]*border-top:1px solid var\(--brd\)[^}]*margin-top:10px/.test(NU_TEINTE));
  /* La classe se pose LÀ OÙ LE MASQUAGE SE DÉCIDE. Deux endroits finiraient par se contredire,
     et la moitié restée en arrière redessine le trou. On vise le CODE, pas le commentaire. */
  const SRCJS = NU_TEINTE.replace(/^[ \t]*\/\/.*$/gm, ' ');
  const sr = /function suiteRefresh\(\)\{([\s\S]*?)\n\}/.exec(SRCJS);
  vrai('la fonction suiteRefresh est trouvée', !!sr);
  if (sr) {
    vrai('⛔ suiteRefresh pose la classe au même endroit qu’il masque la rangée',
      /classList\.toggle\('sans-suite',\s*!soOn\)/.test(sr[1]), sr[1].slice(0, 200));
    vrai('   … sur le PIED, pas sur un ancêtre au hasard',
      /closest\('\.sidebar-foot'\)/.test(sr[1]));
  }
}

console.log('\n══ 3. LES HALOS VIENNENT DES LOGOS, PLUS DE LA COULEUR CHOISIE ══\n');
{
  const { css } = bloc('PLATEFORME — le rendu suit l\'appareil');
  vrai('⛔ aucun halo ne lit --acc (sinon la page devient violette quand on choisit Violet)',
    !/--vr-halos:[\s\S]{0,400}var\(--acc\)/.test(css));
  vrai('⛔ … ni --blue', !/--vr-halos:[\s\S]{0,400}var\(--blue\)/.test(css));
  /* Les deux teintes sont ÉCHANTILLONNÉES dans les PNG des logos : carré vert OP GESTION
     (#084030) et carré bleu nuit TEAM OP (#081028), remontées pour se voir en voile. */
  vrai('⛔⛔ les halos prennent la COULEUR CHOISIE, en canaux',
    /--vr-halos:[\s\S]{0,400}rgba\(var\(--acc-rgb,/.test(css));
  /* ⛔ ET LE REPLI EST LA TEINTE DE LA MARQUE : la page doit être juste même avant que le
     JavaScript ait posé `--acc-rgb`. Sans repli, `rgba(var(--acc-rgb),.26)` est invalide et
     le halo disparaît — un fond qui s'allume une seconde après le chargement. */
  vrai('⛔ … avec le vert d’OP GESTION en repli (avant que le JS ait tourné)',
    /rgba\(var\(--acc-rgb,30,132,80\)/.test(css));
  vrai('le halo bleu de TEAM OP reste, pour la profondeur', /rgba\(47,79,158,/.test(css));
  /* ⛔ `applyTheme` doit PUBLIER ces canaux, et depuis la teinte RÉSOLUE : pour les neuf
     teintes nommées elle vient de la feuille, pas d'un style en ligne. */
  vrai('⛔⛔ applyTheme publie --acc-rgb depuis la teinte RÉSOLUE',
    /getComputedStyle\(r\)\.getPropertyValue\('--acc-src'\)/.test(NU)
    && /setProperty\('--acc-rgb'/.test(NU));
  vrai('le halo bleu de TEAM OP est là (47,79,158)', /--vr-halos:[\s\S]{0,400}rgba\(47,79,158,/.test(css));
  /* ⚠️ L'ARRÊT S'ÉCRIT rgba(r,g,b,0), JAMAIS `transparent` : `transparent` vaut rgba(0,0,0,0),
     donc le dégradé passe par du NOIR transparent et salit le bord. C'est une partie de ce
     qui rendait le fond terne. */
  vrai('⛔ les arrêts sont en rgba(…,0), pas en « transparent » (qui vire au noir)',
    !/--vr-halos:[\s\S]{0,400}\btransparent\b/.test(css)
    && /rgba\(var\(--acc-rgb,[0-9,]+\),0\)/.test(css));
  vrai('le halo est appliqué au fond de la page', /body::after\{[\s\S]{0,300}background:var\(--vr-halos\)/.test(css));
  /* ⛔⛔ ET IL FAUT QU'IL SOIT VISIBLE. Un `::after` en `z-index:-1` se peint SOUS le fond de
     son propre parent : `body` n'établit pas de contexte d'empilement, donc son pseudo-élément
     négatif remonte dans celui de la RACINE et s'y peint AVANT le fond de `body`. Mesuré le
     22 septembre 2026 : les trois halos existaient, étaient justes, et étaient intégralement
     cachés sous le dégradé gris — la page avait l'air d'un aplat.
     ⚠ CE CONTRÔLE A ÉTÉ AJOUTÉ APRÈS COUP : la mutation « remettre le fond sur body » ne
     faisait tomber AUCUN des 82 contrôles. Une mutation qui ne casse rien ne dit pas que le
     code est bon, elle dit ce que le banc ne REGARDE pas. */
  vrai('⛔⛔ le fond de la page est sur <html> (sinon il recouvre les halos)',
    /html\[data-verre="1"\]\{background:var\(--vr-page\);background-attachment:fixed\}/.test(css));
  vrai('⛔⛔ … et body est rendu transparent, explicitement',
    /html\[data-verre="1"\] body\{background:transparent!important\}/.test(css));
  vrai('⛔ la forme fautive n’existe plus nulle part',
    !/html\[data-verre="1"\] body\{background:var\(--vr-page\)/.test(NU));
  /* ⚠ LA TAILLE AUSSI SE GARDE. 340 px de rayon sur un Mac de 1280 de large, c'étaient trois
     taches perdues dans un aplat : mesuré au navigateur, la page était indiscernable d'un fond
     uni. En vmax, le voile tient la même place sur un iPhone et sur un 27 pouces. */
  vrai('⚠ les halos se mesurent sur l’écran (vmax), pas en pixels fixes',
    /--vr-halos:[\s\S]{0,120}vmax/.test(css) && !/--vr-halos:[\s\S]{0,400}\d{3}px \d{3}px at/.test(css));
  /* Et la transparence réduite doit remettre un fond PLEIN sur <html>, pas seulement sur body :
     sinon la page reste sur le dégradé de verre alors qu'on vient de l'éteindre. */
  vrai('⛔ la transparence réduite remet un fond plein sur <html> AUSSI',
    /html\[data-verre="1"\]\{background:var\(--bg\)\}/.test(css));
  vrai('⛔ la transparence réduite l’éteint (c’est un besoin, pas une préférence)',
    /prefers-reduced-transparency: reduce/.test(css) && /body::after\{display:none\}/.test(css));
}

console.log('\n══ 4. ⛔⛔ TOUTES LES TEINTES, PAS TROIS ══\n');
{
  /* La liste affichée dans les Paramètres, et la liste des teintes sources. Les deux doivent
     coïncider EXACTEMENT : une entrée d'ACCENTS sans --acc-src est une couleur MORTE, et une
     source sans entrée est du style que personne n'atteint. */
  const m = NU.match(/const ACCENTS = \{[^}]+\}/);
  vrai('⛔ la liste ACCENTS est trouvée', !!m);
  const ACCENTS = m ? new Function('return ' + m[0].replace('const ACCENTS = ', '') + ';')() : {};
  const sources = [...NU.matchAll(/html\[data-refonte\]\[data-accent="([a-z]+)"\]\s*\{\s*--acc-src:/g)].map(x => x[1]);
  eq('chaque teinte de la palette a une source', [...new Set(sources)].sort(), Object.keys(ACCENTS).sort());
  /* ⛔ NEUF, ET PAS HUIT. Le document en nomme huit (le nôtre remplaçait `graphite` par
     `red`). On a ajouté `graphite` SANS retirer `red` : quelqu'un l'a peut-être déjà choisi,
     et supprimer sa règle laisserait `--acc-src` vide, donc tuerait les treize dérivés — la
     panne exacte du 11 au 22 septembre 2026. Une couleur ne se retire pas d'une palette que
     des gens utilisent. */
  /* ⛔ DOUZE depuis le thème final (24 septembre 2026) : les onze de la maquette et le rouge,
     qu'on sert encore à qui l'a choisi sans le proposer. */
  vrai('   … et il y en a bien douze', [...new Set(sources)].length === 12,
    [...new Set(sources)].length + ' : ' + [...new Set(sources)].sort().join(', '));
  /* ⛔⛔ ET CHACUNE A DEUX VALEURS : UNE DE JOUR, UNE DE NUIT. C'est ce qui manquait
     entièrement avant le 22 septembre — une seule teinte servait dans les deux thèmes. */
  const nuit = [...new Set([...NU.matchAll(/html\[data-refonte\]\[data-theme="dark"\]\[data-accent="([a-z]+)"\]\s*\{\s*--acc-src:/g)].map(x => x[1]))];
  eq('⛔ chaque teinte a AUSSI une valeur de nuit', nuit.sort(), [...new Set(sources)].sort());
  /* ⛔ Et la règle de nuit doit gagner : un sélecteur de plus (0,4,1 contre 0,3,1) ET écrite
     après. Inversées, la nuit serait rendue avec les teintes du jour, sans un mot. */
  vrai('⛔ la règle de nuit est écrite APRÈS celle du jour',
    NU.indexOf('[data-theme="dark"][data-accent="green"]') > NU.indexOf('[data-accent="green"]   {'));
  /* Les treize jetons dérivés : ils partent tous de --acc-src, donc ajouter une teinte ne
     demande qu'une ligne. C'est ce qui évite « la treizième sera oubliée ». */
  const der = NU.match(/html\[data-refonte\]\[data-accent\]\{[\s\S]{0,1400}?\n\}/);
  vrai('⛔ le bloc de dérivation est trouvé', !!der);
  const D = der ? der[0] : '';
  ['--acc:', '--acc2:', '--acc-txt:', '--acc-fill:', '--acc-fill-hover:', '--acc-fill-press:',
   '--tint:', '--side-active-ink:', '--side-avatar:', '--anneau:', '--focus-champ:', '--rf-halo:']
    .forEach(j => vrai('   ' + j + ' se dérive de la teinte', D.indexOf(j) >= 0));
  /* ⛔ ET LA COULEUR PERSONNELLE PASSE PAR LA MÊME PORTE. applyTheme tenait CINQ jetons à la
     main pendant que la feuille en dérive treize : les huit autres restaient VERTS sous une
     couleur personnalisée. On pose la SOURCE, la feuille fait le reste. */
  vrai('⛔ applyTheme pose --acc-src (une teinte), pas une liste de dérivés',
    /r\.style\.setProperty\('--acc-src',hx\)/.test(NU));
  vrai('⛔ … et le nettoyage retire --acc-src aussi',
    /\['--acc-src','--acc','--acc2','--on-acc','--acc-fill','--acc-fill-hover'\]\.forEach\(v=>r\.style\.removeProperty\(v\)\)/.test(NU));
}

console.log('\n══ 5. « MA COULEUR » EST UNE PALETTE, PAS UNE CASE ══\n');
{
  vrai('les couleurs personnelles sont une liste plafonnée', /const ACC_PERSO_MAX=6/.test(NU));
  vrai('elles se lisent depuis le stockage', /function accentsPerso\(\)\{/.test(NU));
  vrai('⛔ … en refusant ce qui n’est pas une couleur (une valeur abîmée à la main)',
    /accentsPerso\(\)\{[\s\S]{0,300}\/\^#\[0-9a-fA-F\]\{6\}\$\//.test(NU));
  vrai('une couleur choisie rejoint la palette', /function setAccentCustom\(hex\)\{[\s\S]{0,400}l\.unshift\(hex\)/.test(NU));
  vrai('⛔ … sans doublon (on retire l’ancienne occurrence avant de remettre en tête)',
    /setAccentCustom\(hex\)\{[\s\S]{0,400}filter\(h=>h\.toUpperCase\(\)!==hex\)/.test(NU));
  vrai('on peut en retirer une', /function accentPersoRetirer\(ev,hex\)\{/.test(NU));
  /* ⛔ Retirer la couleur QU'ON PORTE laisserait l'interface teintée par une couleur absente
     de la palette : on revient à la teinte du THÈME (thème final : TEAM OP ou OP GESTION), le
     seul choix qui ne ment pas. */
  vrai('⛔ retirer celle qu’on porte ramène à la teinte du thème',
    /accentPersoRetirer\(ev,hex\)\{[\s\S]{0,800}const ac=MARQUES\[getMarque\(\)\]\.accent;\s*prefLocal\('elan_accent',ac\)/.test(NU));
  vrai('la liste voyage avec la personne', /accentsPerso:'elan_accents_perso'/.test(NU));
  vrai('⛔ le mélange vers le noir est calculé en JavaScript (color-mix ne se lit pas d’ici)',
    /function melangeNoir\(hex,pc\)\{/.test(NU));
  vrai('⛔ l’encre se juge sur la teinte FONCÉE de jour, pas sur la teinte brute',
    /encreSur\(effectiveTheme\(\)==='light'\? ?melangeNoir\(hx,14\) ?: ?hx\)/.test(NU));
}

console.log('\n══ 6. LES FAVORIS ══\n');
{
  vrai('huit au maximum', /const FAV_MAX=8/.test(NU));
  vrai('ils se lisent filtrés par les droits', /function favorisLire\(\)\{/.test(NU));
  /* ⛔ Un droit retiré, un forfait changé ou un métier différent doivent faire DISPARAÎTRE le
     raccourci, pas afficher une rubrique interdite. On refiltre à chaque lecture. */
  vrai('⛔ … et le filtre est bien canSee, à CHAQUE lecture',
    /favorisLire\(\)\{[\s\S]{0,700}return l\.filter\(k=>\{ const it=ongletItem\(k\); return !!\(it && canSee\(it\)\); \}\)/.test(NU));
  vrai('le bloc sort en TÊTE du menu', /\$\('nav'\)\.innerHTML = favorisBloc\(\) \+ NAV\.map/.test(NU));
  vrai('on épingle et on désépingle', /function favorisBascule\(ev,k\)\{/.test(NU));
  vrai('un mode « Modifier » montre les étoiles', /function favorisEditer\(\)\{/.test(NU));
  /* ⛔ UN FAVORI EST UN RÉGLAGE DE PERSONNE, PAS UNE DONNÉE D'ENTREPRISE. L'écrire dans `db`
     le ferait partir à la synchro chez toute l'équipe — c'est la règle du multitâche, et
     celle de « rien ne s'écrit dans les données d'une entreprise au seul chargement ». */
  vrai('⛔ ils voyagent par u.pref, jamais par db', /favoris:'elan_favoris'/.test(NU));
  vrai('⛔ … et rien n’écrit db.favoris', !/db\.favoris/.test(NU));
  vrai('la loupe ne compte pas les favoris (sinon elle sortirait trop tôt)',
    /querySelectorAll\('\.nav-item:not\(\.nav-item-fav\)'\)\.length>=10/.test(NU));
}

console.log('\n══ 7. UNE SEULE BARRE DU BAS ══\n');
{
  /* Mesuré : #tabbar à y=817 en z-index 38, .rf-tabs par-dessus à y=842 en z-index 48. */
  vrai('⛔ l’ancienne barre est éteinte', /html\[data-refonte\] body\.rf-onglets \.rf-tabs\{display:none!important\}/.test(NU));
  vrai('⛔ … mais la classe body.rf-onglets RESTE (ce sont elle et non la barre qui décalent le contenu)',
    /html\[data-refonte\] body\.rf-onglets \.content\{padding-bottom/.test(NU));
  /* ⛔⛔ PLUS AUCUN CHIFFRE EN DUR — ET C'EST CE QU'ON GARDE MAINTENANT. Ce contrôle exigeait
     « 98 px, pas 78 » : deux valeurs écrites à la main, à côté de quatre autres (100, 76, 146,
     78). Resserrer la barre le 22 septembre 2026 demandait de les retrouver toutes, et en
     oublier une suffit à poser la bulle d'aide sur l'onglet « Plus » — déjà arrivé, mesuré.
     Tout dérive désormais de `--tabh`, qui dit la place prise sur CETTE plateforme. */
  vrai('⛔⛔ le contenu se décale d’après --tabh, jamais d’un chiffre écrit à la main',
    /body\.rf-onglets \.content\{padding-bottom:calc\(var\(--tabh\) \+ 16px\)!important\}/.test(NU));
  /* La bulle d'aide Leia a été retirée le 23 septembre 2026 (Justin : « on supprime totalement ») :
     ce qui flottait AU-DESSUS d'elle redescend à 10 px de la barre, d'après --tabh toujours. */
  vrai('⛔ … et le message de confirmation aussi, posé juste au-dessus de la barre (plus de bulle à éviter)',
    /body\.rf-onglets \.toast\{bottom:calc\(var\(--tabh\) \+ 10px\)!important/.test(NU));
  vrai('⛔ la bulle d’aide n’existe plus : ni élément, ni règle qui la vise',
    !/id="assistant"/.test(NU) && !/#assistant\b/.test(NU) && !/class="fab"/.test(NU));
  vrai('⛔⛔ ANDROID EST FIGÉ — Justin l’a demandé, ce n’est pas un oubli',
    /html\[data-refonte\]\[data-os="android"\] \.tabbar \.tab\{padding:10px 14px!important/.test(NU)
    && /html\[data-os="android"\] \.tab-ic\{font-size:19px\}/.test(NU));
  /* Justin, 22 septembre 2026 : « même la part en bas j'aurais bien voulu la même barre que
     sur l'application qui sera prévue pour iOS ». En navigateur elle MONTE, elle ne s'aplatit
     plus — la règle disait le contraire avant. */
  vrai('⛔ en navigateur la pilule monte au lieu de s’aplatir',
    /html\[data-verre="1"\]\[data-kind="mobile"\]:not\(\[data-autonome="1"\]\) \.tabbar\{\s*bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 16px\);\s*\}/.test(NU));
  vrai('⛔ … et elle ne redevient plus plate et collée',
    !/:not\(\[data-autonome="1"\]\) \.tabbar\{[^}]*border-radius:0/.test(NU));
  /* Les icônes SVG de l'application doivent passer sur la barre : sinon elle garde des émojis
     là où tout le reste de l'interface a des traits. */
  /* ⚠ On lit l'APPARTENANCE à la liste, pas sa dernière place : la feuille « Créer » (`#creer`) y
     est entrée après la barre le 24 septembre 2026, et « '#tabbar'] » tombait sur un ajout juste. */
  vrai('la barre est balayée par le passage qui pose les icônes', /var RACINES=\[[^\]]*'#tabbar'[^\]]*\]/.test(NU));
  /* ⛔ UNE SEULE CLÉ POUR UNE SEULE BARRE — et la reprise de l'ancienne, sinon ceux qui
     l'avaient réglée verraient leur choix revenir aux quatre rubriques d'origine sans un mot. */
  vrai('⛔ le réglage de l’ancienne barre est repris',
    /if\(!brut\)\{ try\{ const v=JSON\.parse\(localStorage\.getItem\('elan_barre_onglets'\)/.test(NU));
  vrai('⛔ … et seulement si le nouveau est vide (un choix récent ne se fait pas écraser)',
    /ongletsLire\(\)\{[\s\S]{0,900}if\(!brut\)\{/.test(NU));
}

console.log('\n══ 8. LES TITRES DE GROUPE ══\n');
{
  const { i0, css } = bloc('LES TITRES DE GROUPE ET LES FAVORIS');
  vrai('⛔ le bloc est trouvé (sinon tout ce qui suit est creux)', i0 > 0);
  vrai('   … et il a de la matière', css.length > 900, css.length + ' caractères');
  /* Chez Apple un en-tête de section est PETIT, demi-gras et nettement plus pâle : il
     structure, il n'appelle pas. Sur les captures du 22 septembre, « Tableau de bord » et
     « Planification » sortaient presque aussi noirs et aussi gras que les rubriques. */
  vrai('petit et demi-gras sur les systèmes Apple',
    /html\[data-os="ios"\] \.nav-label,html\[data-os="macos"\] \.nav-label\{[\s\S]{0,260}font-size:11px!important;font-weight:590!important/.test(css));
  vrai('⛔ et PAS en capitales (ce n’est pas la grammaire d’Apple)', /text-transform:none!important/.test(css));
  /* ⚠️ Sur verre, la pâleur seule ne suffit pas — le fond bouge sous le texte. On remonte la
     graisse d'un cran. C'est la règle de vibrance d'Apple, et le contraire de l'instinct. */
  vrai('⚠️ sur verre la graisse remonte (vibrance : le fond bouge sous le texte)',
    /html\[data-verre="1"\] \.sidebar \.nav-label\{font-weight:640!important\}/.test(css));
  vrai('la coupe remplace le titre qui répète une rubrique', /\.nav-coupe\{height:1px/.test(css));
  vrai('⛔ la première coupe reste muette (rien à séparer au-dessus)',
    /#nav \.nav-coupe:first-child,#nav #nav-rien \+ \.nav-coupe\{margin-top:4px;background:none\}/.test(css));
  vrai('le titre d’un groupe qui répète une de ses rubriques devient une coupe',
    /const repete = rows\.some\(r=>!r\.verrou && t\(r\.it\.l\)===t\(sec\.g\)\)/.test(NU));
  vrai('⛔ la coupe est muette pour un lecteur d’écran', /class="nav-coupe" aria-hidden="true"/.test(NU));
}


console.log('\n══ LA BARRE DU HAUT QUAND ON DESCEND, ET LE CLIGNOTEMENT AU CLIC ══\n');
{
  /* ⛔⛔ TROIS MUTATIONS N'ONT PAS MORDU LE 22 SEPTEMBRE AU SOIR, ET C'EST CE BLOC QUI
     MANQUAIT. La règle du dépôt dit qu'une mutation qui ne casse rien pose la question
     « qu'est-ce que le banc ne REGARDE pas ? ». Réponse : la barre descendue, le verre dense,
     et le fait que les halos du JOUR suivent la teinte (le motif tombait sur ceux de la nuit,
     qui eux la suivaient — une tranche juste pour la mauvaise moitié). */

  /* 1. LA BARRE NOIRE. Justin, capture à l'appui : « quand on descend dans les catégories,
     il y a cette barre noire là ». Mesuré : la barre passait de rgba(44,56,84,.55) — le verre,
     la teinte de la sidebar — à #080D18 à 93 %, un quasi-noir OPAQUE, reflet disparu. */
  vrai('⛔⛔ la barre descendue n’est plus un quasi-noir opaque',
    !/body\.defile \.topbar\{background:color-mix\(in srgb,var\(--bg\) 93%,transparent\)/.test(NU));
  vrai('⛔ sans verre elle prend --bg1, PLUS CLAIRE que la page (de nuit la lumière élève)',
    /html\[data-refonte\] body\.defile \.topbar\{background:var\(--bg1\)!important\}/.test(NU));
  vrai('⛔⛔ avec verre elle DENSIFIE son verre et garde son reflet',
    /html\[data-verre="1"\]\[data-refonte\] body\.defile \.topbar\{\s*background:var\(--vr-reflet\),var\(--vr-fond-dense\)!important\}/.test(NU));
  vrai('⛔ le jeton dense existe pour les DEUX thèmes',
    (NU.match(/--vr-fond-dense:/g) || []).length >= 2,
    (NU.match(/--vr-fond-dense:/g) || []).length + ' définition(s)');
  /* ⛔ ET IL DOIT ÊTRE PLUS DENSE QUE LE VERRE ORDINAIRE — sinon « densifier » ne veut rien
     dire, et le bouton qui défile dessous se lit encore à travers. */
  {
    const a = /--vr-fond:rgba\(255,255,255,\.(\d+)\)/.exec(NU);
    const b = /--vr-fond-dense:rgba\(255,255,255,\.(\d+)\)/.exec(NU);
    vrai('⛔ … et il est VRAIMENT plus dense que le verre ordinaire',
      !!(a && b) && (+b[1] > +a[1]), a && b ? a[1] + ' → ' + b[1] : 'introuvable');
  }
  /* ⛔ LA VALEUR ÉTAIT FAUSSE EN PLUS D'ÊTRE MAL CHOISIE : color-mix(…, transparent)
     ASSOMBRIT, parce que transparent vaut rgba(0,0,0,0). #0D1624 en sortait à #080D18.
     On interdit la forme dans tout le bloc du verre — c'est le même piège que sur les
     arrêts de dégradé, et il s'est déjà refermé deux fois. */
  vrai('⛔⛔ plus aucun color-mix vers « transparent » sur une surface du verre',
    !/--vr-[a-z-]*:\s*color-mix\(in srgb,[^;]*,\s*transparent\)/.test(NU));

  /* 2. LES HALOS DU JOUR SUIVENT LA TEINTE — et pas seulement ceux de la nuit. */
  {
    const jour = /html\[data-verre="1"\]\{[\s\S]*?--vr-halos:([\s\S]*?);/.exec(NU);
    const nuit = /html\[data-verre="1"\]\[data-theme="dark"\]\{[\s\S]*?--vr-halos:([\s\S]*?);/.exec(NU);
    vrai('⛔ les deux blocs de halos sont trouvés', !!jour && !!nuit);
    /* ⛔ ON COMPTE, ON NE SE CONTENTE PAS D'UNE OCCURRENCE. Mesuré par mutation : remplacer
       le PREMIER halo du jour par une couleur figée ne faisait rien tomber, parce que le
       TROISIÈME portait encore la teinte et satisfaisait le motif. Deux des trois halos
       suivent l'accent — on exige les deux, et le bleu de la marque reste le troisième. */
    const compte = (m) => ((m && m[1]) || '').match(/var\(--acc-rgb,/g) || [];
    /* QUATRE, et pas deux : DEUX halos × DEUX arrêts chacun. Le compte prouve donc d'un seul
       coup que les deux halos suivent la teinte ET que leurs deux bouts la portent — un arrêt
       resté figé salirait le bord, c'est le piège du `transparent`. */
    eq('⛔⛔ le JOUR : deux halos sur la couleur choisie, deux arrêts chacun', compte(jour).length, 4);
    eq('⛔⛔ la NUIT aussi', compte(nuit).length, 4);
    vrai('⛔ … et le troisième reste le bleu nuit de TEAM OP (la profondeur)',
      !!jour && /rgba\(47,79,158,/.test(jour[1]) && !!nuit && /rgba\(91,143,214,/.test(nuit[1]));
    /* ⛔ Deux arrêts de MÊME teinte : un arrêt « transparent » passerait par du noir. */
    for (const [q, m] of [['jour', jour], ['nuit', nuit]])
      vrai('⛔ ' + q + ' : les deux arrêts sont de la même teinte (pas de bord sali)',
        !!m && /rgba\(var\(--acc-rgb,[\d,]+\),0\)/.test(m[1]) && !/\btransparent\b/.test(m[1]));
  }

  /* 3. LE CLIGNOTEMENT AU CLIC. Justin, vidéo : « quand on clique ça fait un effet de couleur,
     j'aime pas ça ». `animation:none` sur l'ANCIENNE et la NOUVELLE capture les peint TOUTES
     LES DEUX : deux copies d'une surface à 55 % font 80 %, la teinte double et le halo
     d'accent ressort deux fois. Invisible tant que les barres étaient opaques, criant depuis
     le verre. On n'en montre qu'UNE. Mesuré au pixel : l'écart pendant la transition passe
     d'un lavis violet à 8/255 sur une seule image. */
  vrai('⛔⛔ l’ancienne capture des barres est EFFACÉE, pas empilée',
    /::view-transition-old\(barrelat\),::view-transition-old\(barrehaut\),\s*::view-transition-old\(barrebas\)\{animation:none;mix-blend-mode:normal;opacity:0\}/.test(NU));
  vrai('⛔ … et la nouvelle reste pleine', /::view-transition-new\(barrebas\)\{animation:none;mix-blend-mode:normal;opacity:1\}/.test(NU));
  vrai('⛔ la paire n’isole pas (sinon un mélange revient par la bande)',
    /::view-transition-image-pair\(barrebas\)\{isolation:auto\}/.test(NU));
  /* ⛔ LA BARRE DU BAS EN FAIT PARTIE : elle est fixe et persistante comme les deux autres,
     et sans nom elle entrait dans la capture RACINE — donc elle traversait le fondu. */
  vrai('⛔ la barre du bas est nommée, comme les deux autres', /\.tabbar\{view-transition-name:barrebas\}/.test(NU));
  vrai('⛔ … et neutralisée au changement de thème avec elles',
    /:root\.theme-vt \.sidebar,:root\.theme-vt \.topbar,:root\.theme-vt \.tabbar\{view-transition-name:none\}/.test(NU));
}

console.log('\n═══ test-757 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
