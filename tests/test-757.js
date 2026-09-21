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
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');

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
  return { i0, css: APP.slice(i0, b > 0 ? b : i0 + 9000).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ') };
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
  vrai('le verre de jour est à 34 %, pas 58 %', /--vr-fond:rgba\(255,255,255,\.34\)/.test(css));
  vrai('⛔ et l’ancienne valeur a bien disparu', !/--vr-fond:rgba\(255,255,255,\.58\)/.test(css));
  vrai('le verre de nuit est à 42 %', /--vr-fond:rgba\(28,28,30,\.42\)/.test(css));
  /* ⛔ LE REFLET EST UN DÉGRADÉ, PAS UNE OMBRE. C'est lui qui donne la matière : une ombre
     interne d'un pixel ne fait qu'un liseré. */
  vrai('⛔ le reflet est un dégradé à 135°', /--vr-reflet:linear-gradient\(135deg,rgba\(255,255,255,\.65\)/.test(css));
  vrai('⛔ … et plus une ombre interne', !/--vr-reflet:inset/.test(css));
  vrai('l’ombre porte les inserts blancs de la maquette',
    /--vr-ombre:0 16px 40px rgba\(31,38,64,\.12\),inset 0 1\.5px 0 rgba\(255,255,255,1\)/.test(css));
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
  vrai('le liseré de jour est à 85 %, comme la maquette', /--vr-liseret:rgba\(255,255,255,\.85\)/.test(css));
}

console.log('\n══ 3. LES HALOS VIENNENT DES LOGOS, PLUS DE LA COULEUR CHOISIE ══\n');
{
  const { css } = bloc('PLATEFORME — le rendu suit l\'appareil');
  vrai('⛔ aucun halo ne lit --acc (sinon la page devient violette quand on choisit Violet)',
    !/--vr-halos:[\s\S]{0,400}var\(--acc\)/.test(css));
  vrai('⛔ … ni --blue', !/--vr-halos:[\s\S]{0,400}var\(--blue\)/.test(css));
  /* Les deux teintes sont ÉCHANTILLONNÉES dans les PNG des logos : carré vert OP GESTION
     (#084030) et carré bleu nuit TEAM OP (#081028), remontées pour se voir en voile. */
  vrai('le halo vert d’OP GESTION est là (30,132,80)', /--vr-halos:[\s\S]{0,400}rgba\(30,132,80,/.test(css));
  vrai('le halo bleu de TEAM OP est là (47,79,158)', /--vr-halos:[\s\S]{0,400}rgba\(47,79,158,/.test(css));
  /* ⚠️ L'ARRÊT S'ÉCRIT rgba(r,g,b,0), JAMAIS `transparent` : `transparent` vaut rgba(0,0,0,0),
     donc le dégradé passe par du NOIR transparent et salit le bord. C'est une partie de ce
     qui rendait le fond terne. */
  vrai('⛔ les arrêts sont en rgba(...,0), pas en `transparent` (qui vire au noir)',
    /rgba\(30,132,80,0\) 70%/.test(css) && !/--vr-halos:[\s\S]{0,400}, ?transparent 70%/.test(css));
  vrai('le halo est appliqué au fond de la page', /body::after\{[\s\S]{0,300}background:var\(--vr-halos\)/.test(css));
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
  eq('les huit teintes de la palette ont toutes une source', sources.sort(), Object.keys(ACCENTS).sort());
  vrai('   … et il y en a bien huit', sources.length === 8, sources.length + ' : ' + sources.join(', '));
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
  vrai('la pilule en verre réserve sa propre place (98 px, pas 78)',
    /html\[data-verre="1"\]\[data-refonte\] body\.rf-onglets \.content\{padding-bottom:calc\(98px/.test(NU));
  /* Justin, 22 septembre 2026 : « même la part en bas j'aurais bien voulu la même barre que
     sur l'application qui sera prévue pour iOS ». En navigateur elle MONTE, elle ne s'aplatit
     plus — la règle disait le contraire avant. */
  vrai('⛔ en navigateur la pilule monte au lieu de s’aplatir',
    /html\[data-verre="1"\]\[data-kind="mobile"\]:not\(\[data-autonome="1"\]\) \.tabbar\{\s*bottom:calc\(env\(safe-area-inset-bottom,0px\) \+ 22px\);\s*\}/.test(NU));
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

console.log('\n═══ test-757 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
