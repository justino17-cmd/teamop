/* ══════════════════════════════════════════════════════════════════════════════════════
   test-771 — LES ÉCRANS PROFONDS AU DOIGT : CE QUI RÉPOND, PAS CE QUI SE DESSINE

   Trouvé le 22 septembre 2026 par l'audit des écrans profonds au téléphone (227 écrans,
   467 clics, 6 085 éléments), puis REMESURÉ au doigt simulé : non plus le rectangle de
   l'élément, mais la zone qui le déclenche vraiment (`elementFromPoint` sur la verticale
   du centre — l'élément, son libellé, sa rangée ou son enrobe). 411 « petites cibles »
   dessinées sont devenues 188 éléments distincts, dont une bonne part répondaient déjà
   sur 44 px grâce à la rangée `.frow`. Ce qui restait, famille par famille :

   | famille | avant | la règle |
   |---|---|---|
   | boutons des FENÊTRES écrits à la main (nuisibles, méthodes, indices, Oui/Non…) | 28–34 px, 82 commandes | le plancher de `#content`, étendu à `.modal` et `.dp` |
   | options des menus du planning (`.pf-opt`, `.abs-tyit`) | 32–36 | 44, une ligne de liste |
   | raccourcis, flèches, liens, croix de filtre, « Tout effacer » | 15–28 | 38 |
   | statut, client, téléphone, courriel de la fiche d'intervention | 16–26 | 44 |
   | l'œil du mot de passe | 32 | 44 |
   | champs dans une pilule (recherches, `.pf-inw`, « Valeur… ») | 14–17 | l'enrobe entier (test-770) |
   | menus déroulants, dates « Du / Au » | 35 | 38 |

   ⛔⛔ ET UNE FAMILLE QUE PERSONNE NE CHERCHAIT : SAFARI ZOOME SUR UN CHAMP SOUS 16 px.
   La règle tactile posait 16 px sur `input[type=text]` — et un champ SANS attribut type est
   un champ texte que ce sélecteur ne voit pas. Mesuré : 39 champs sous 16 px sur DEUX
   rubriques seulement, toute la fenêtre Intervention à 15 px, la recherche de Mouvements à
   13,2. Sur un iPhone, chacun faisait zoomer la page au premier toucher — et elle restait
   zoomée. Taille CALCULÉE, pas taille visée : c'est ce que compte désormais l'audit.

   Et deux défauts de mise en page trouvés en chemin :
   · le menu « Filtrer par box » de Mouvements sortait de 84 px par la GAUCHE au téléphone
     (ancré `right:0` sur un bouton qui, la barre passée à la ligne, tombe à gauche) ;
   · la colonne collante des noms du planning général cachait, à tout `scrollIntoView`, la
     case qu'on voulait montrer (190 px sur 358 au téléphone) : `scroll-padding-left`.

   ⛔ Ce banc lit le CODE (commentaires retirés) des deux fichiers servis. La preuve de
   comportement vit dans scratchpad/sonde-cibles.js (17 écrans, 0 cible sous 38 px qui
   réponde, 20 cases de grille écartées par décision écrite) et audit-profond.js.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function blocMedia(src, entete) {
  const blocs = []; let i = 0;
  while ((i = src.indexOf(entete, i)) >= 0) {
    const o = src.indexOf('{', i); let p = 1, j = o + 1;
    while (j < src.length && p > 0) { if (src[j] === '{') p++; else if (src[j] === '}') p--; j++; }
    blocs.push(src.slice(o + 1, j - 1)); i = j;
  }
  return blocs;
}
const echap = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

for (const f of ['app.html', 'beta.html']) {
  console.log('\n══ ' + f + ' ══\n');
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  vrai('population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(SRC));
  const doigt = blocMedia(SRC, '@media (pointer:coarse)').find(b => /\.frow-val > select\{padding-top:12px/.test(b)) || '';
  vrai('population : le bloc « au doigt » des cibles est trouvé', doigt.length > 4000, doigt.length + ' caractères');
  const regle = (sel, decl) => new RegExp(echap(sel) + '[^{]*\\{[^}]*' + echap(decl)).test(doigt);

  /* ── 1. les fenêtres ont le plancher du contenu ── */
  vrai('⛔ les boutons écrits à la main dans une FENÊTRE ont 38 px (nuisibles, méthodes, indices…)',
    /html\[data-refonte\] \.modal button:not\(\.btn\):not\(\.chip\):not\(\.tab\):not\(\.pf-b\):not\(\.modal-close\):not\(\.mdp-oeil\),\s*html\[data-refonte\] \.dp button:not\(\.btn\):not\(\.chip\):not\(\.tab\):not\(\.pf-b\)\{min-height:38px\}/.test(doigt));
  vrai('… sauf dans un tableau, comme dans le contenu', regle('html[data-refonte] .modal .tbl button', 'min-height:0'));
  vrai('⛔ l’œil du mot de passe prend les 44 px que le champ lui réserve', regle('html[data-refonte] .mdp-oeil', 'width:44px;height:44px'));

  /* ── 2. les menus du planning ── */
  vrai('⛔ une option de menu du planning est une ligne de liste (44)', /html\[data-refonte\] \.pf-opt,html\[data-refonte\] \.abs-tyit\{min-height:44px\}/.test(doigt));
  for (const s of ['.pf-h span', '.pg-rac span', '.pg-gt span', '.pf-raz', '.pf-lk'])
    vrai('⛔ « ' + s + ' » a le plancher des petites commandes', new RegExp('html\\[data-refonte\\] ' + echap(s) + '[,{][^}]*?\\{?[^}]*min-height:38px').test(doigt));
  vrai('⛔ les flèches de semaine du menu Jours', regle('html[data-refonte] .pf-semnav u', 'width:38px;height:38px'));
  vrai('⛔ la croix d’un filtre actif prend toute la hauteur de sa pastille',
    regle('html[data-refonte] .pf-chip', 'min-height:38px') && regle('html[data-refonte] .pf-chip b', 'align-self:stretch'));
  vrai('le champ du planning remplit sa pilule', regle('html[data-refonte] .pf-inw input', 'align-self:stretch'));
  vrai('une intervention de la vue « une personne » est une ligne qu’on ouvre (38)', regle('html[data-refonte] .pgf-ev', 'min-height:38px'));

  /* ── 3. la fiche d'une intervention : la règle ET la classe qu'elle vise ── */
  vrai('⛔ le statut qu’on change : règle', regle('html[data-refonte] .st-menu', 'min-height:44px'));
  vrai('⛔ … et le badge porte bien la classe', /<span class="st-menu" onclick="intStatutMenu\(/.test(SRC));
  vrai('⛔ le client qu’on ouvre : règle', regle('html[data-refonte] .int-cli', 'min-height:44px'));
  vrai('⛔ … et les DEUX rangées client la portent (fiche et reprise)',
    (SRC.match(/<div class="int-cli" style="display:flex;gap:10px;align-items:center;margin:8px 0 4px;cursor:pointer" onclick="(ficheClient|intPickClient)\(/g) || []).length === 2);
  vrai('⛔ le numéro qu’on appelle et l’adresse à qui on écrit (44)',
    /#content a\[href\^="tel:"\]:not\(\.btn\)[^{]*\.modal a\[href\^="mailto:"\]:not\(\.btn\)\{\s*display:inline-flex;align-items:center;min-height:44px\}/.test(doigt));
  vrai('la valeur d’un code de box : règle et classe', regle('html[data-refonte] .code-val', 'min-height:44px') && /<div class="code-val" style=/.test(SRC));
  vrai('la recherche du menu des box : règle et classe', regle('html[data-refonte] .mvt-menu-q', 'min-height:44px') && /<div class="mvt-menu-q" style=/.test(SRC));
  vrai('⛔ menus déroulants et dates hors rangée : 38',
    /html\[data-refonte\] #content select,html\[data-refonte\] \.modal select,\s*html\[data-refonte\] input\[type=date\]:not\(\.frow > \*\):not\(\.frow-val > \*\),\s*html\[data-refonte\] input\[type=time\]:not\(\.frow > \*\):not\(\.frow-val > \*\)\{min-height:38px\}/.test(doigt));

  /* ── 4. Safari ne zoome plus : TOUT champ saisissable est à 16 px au doigt ── */
  const zoom = (doigt.match(/[^{}]*\{font-size:16px!important\}/g) || []).join(' ');
  vrai('population : la règle des 16 px est trouvée', zoom.length > 200, zoom.length + ' caractères');
  for (const s of ['input:not([type])', 'input[type=text]', 'input[type=number]', 'input[type=tel]', 'input[type=email]',
                   'input[type=search]', 'input[type=url]', 'input[type=date]', 'select', 'textarea'])
    vrai('⛔ 16 px au doigt pour « ' + s + ' »', zoom.includes('html[data-refonte] ' + s + ',') || zoom.includes('html[data-refonte] ' + s + '{'));

  /* ── 5. deux mises en page ── */
  const mvt = blocMedia(SRC, '@media(max-width:560px)').find(b => /\.mvt-menu\{/.test(b)) || '';
  vrai('⛔ au téléphone, le menu des box prend la barre entière pour bloc conteneur',
    /\.mvt-bar\{position:relative\}/.test(mvt) && /\.mvt-dd\{position:static!important\}/.test(mvt)
    && /\.mvt-menu\{left:0!important;right:0!important;width:auto!important\}/.test(mvt));
  vrai('… et les trois pièces portent bien leur classe',
    /class="mvt-menu" style="position:absolute/.test(SRC) && /class="mvt-bar" style="display:flex/.test(SRC) && /class="mvt-dd" style="position:relative/.test(SRC));
  vrai('⛔ la colonne des noms du planning général : largeur en variable, et le défilement la respecte',
    /\.pg-wrap\{ overflow-x:auto; --pg-nom:190px; scroll-padding-left:var\(--pg-nom\); \}/.test(SRC));
  vrai('⛔ … la grille la lit (plus de 190 écrit en dur), largeur minimale comprise',
    /grid-template-columns:var\(--pg-nom,190px\) repeat\(\$\{n\},minmax\(\$\{larg\}px,1fr\)\) 96px;min-width:calc\(var\(--pg-nom,190px\) \+ \$\{n\*larg\+96\}px\)/.test(SRC)
    && !/grid-template-columns:190px repeat\(\$\{n\}/.test(SRC));
  vrai('… et au téléphone elle passe à 150 px, les noms longs à la ligne plutôt que coupés',
    /@media\(max-width:560px\)\{ \.pg-wrap\{ --pg-nom:150px; \}\s*\.pg-wrap \.pg-pers b\{ white-space:normal;/.test(SRC));
}

console.log('\n═══ test-771 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
