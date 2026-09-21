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

console.log('\n══ 4. ⛔⛔ LES HUIT TEINTES, PAS TROIS ══\n');
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
  vrai('   … et il y en a bien neuf', [...new Set(sources)].length === 9,
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
     de la palette : on revient au vert de la marque, le seul choix qui ne ment pas. */
  vrai('⛔ retirer celle qu’on porte ramène au vert de la marque',
    /accentPersoRetirer\(ev,hex\)\{[\s\S]{0,700}localStorage\.setItem\('elan_accent','green'\)/.test(NU));
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
  vrai('⛔ … et la bulle d’aide aussi (une barre qui monte fait monter ce qui flotte au-dessus)',
    /body\.rf-onglets #assistant > \.fab\{bottom:calc\(var\(--tabh\) \+ 10px\)!important\}/.test(NU));
  vrai('⛔ … et le message de confirmation', /body\.rf-onglets \.toast\{bottom:calc\(var\(--tabh\) \+ 66px\)/.test(NU));
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
  vrai('la barre est balayée par le passage qui pose les icônes', /'#mail-read','#tabbar'\]/.test(NU));
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
