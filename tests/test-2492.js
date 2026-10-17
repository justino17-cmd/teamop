/* ══ L'ÉCRAN D'APPEL QUI SONNE : UN AVATAR, UN SEUL STATUT, ET RIEN QUI SE CHEVAUCHE (lot m19, appels#5 et appels@9) ══════════════════════════════
   Appel VIDÉO sortant qui sonne, sur un téléphone de 360 px, l'autre ayant un nom long (deux lignes) : la pastille « Sonnerie… » de sa vignette se posait en haut à gauche — SOUS
   l'en-tête, sur la 1re ligne du nom —, répétait le « Sonnerie… » déjà dit sous le nom, et l'étiquette « Vidéo de <prénom> » passait sous la vignette « Vous ». Avant que
   l'autre ait répondu, l'étiquette annonçait en plus une vidéo qui n'existe pas encore.

   La règle : tant que l'autre n'a pas répondu, UN AVATAR et UN STATUT (celui du haut de l'écran) ; la pastille « Sonnerie… » ne sert que dans la grille d'un appel de groupe (elle dit
   QUI sonne encore) ; « Vidéo de … » n'existe que quand l'autre a répondu, et se range à gauche de « Vous » (ellipse).

   Ce que ce fichier garde :
   1. la VRAIE fonction `htmlTuileAppel` (extraite de la page, exécutée) sur les trois mises en page (audio, vidéo, groupe) × (sonne, répondu) ;
   2. `rendreAppel` la CONSULTE (et n'écrit plus la pastille à la main) ;
   3. le CSS : l'étiquette vide n'affiche rien (`:empty`), et celle de la vidéo est bornée à gauche de « Vous » — 104 px au téléphone, 176 au bureau (les valeurs posées pour la vignette).
   Le chevauchement des rectangles, mesuré au navigateur (360 / 390 / bureau, nom de 2 lignes, deux fois) : scratchpad/messages/correctifs/m19/sonde-m19.js. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const C = require('./outils-cascade-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(process.env.OPMSG_RACINE || path.join(__dirname, '..'), 'apercu/opmessages/index.html'), 'utf8');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = C.sansCommJs(script);
const CSS = C.sansCommentaires((/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1]);

const src = C.ligne(JS, 'const esc = ') + '\n' + C.decl(JS, 'function htmlTuileAppel(');
vrai('(population) esc et htmlTuileAppel sont extraites de la page (' + src.length + ' caractères)', /const esc/.test(src) && /function htmlTuileAppel/.test(src));
let h = null;
try { h = new Function(src + '\nreturn htmlTuileAppel;')(); } catch (e) { h = null; }
vrai('htmlTuileAppel est exécutable', typeof h === 'function');
if (h) {
  const ben = (etat) => ({ id: 'u2', prenom: 'Ben', initiales: 'BD', etat });
  const compte = (html, motif) => (html.match(motif) || []).length;
  const ETAT = /class="tuile-etat"/g, SONNERIE = /Sonnerie…/g, VIDEO_DE = /Vidéo de/g;
  const sv = h(ben('sonne'), 'video', true), sa = h(ben('sonne'), 'audio', true), sg = h(ben('sonne'), 'groupe', true);
  const rv = h(ben('present'), 'video', true), rg = h(ben('present'), 'groupe', true);
  v('vidéo qui sonne : l\'avatar (les initiales) est là', compte(sv, /<span class="tuile-av" aria-hidden="true">BD<\/span>/g), 1);
  v('⛔ vidéo qui sonne : AUCUNE pastille « Sonnerie… » dans la vignette (le haut de l\'écran la dit, une seule fois)', [compte(sv, ETAT), compte(sv, SONNERIE)], [0, 0]);
  v('⛔ vidéo qui sonne : pas d\'étiquette « Vidéo de Ben » (une vidéo qui n\'existe pas encore) — l\'étiquette est VIDE, donc masquée', [compte(sv, VIDEO_DE), compte(sv, /<span class="tuile-nom"><\/span>/g)], [0, 1]);
  v('audio qui sonne : pas de pastille non plus (un appel à deux n\'a qu\'un statut, celui du haut)', [compte(sa, ETAT), compte(sa, /<span class="tuile-nom">Ben<\/span>/g)], [0, 1]);
  v('vidéo répondue : l\'étiquette « Vidéo de Ben » paraît, sans pastille', [compte(rv, /<span class="tuile-nom">Vidéo de Ben<\/span>/g), compte(rv, ETAT)], [1, 0]);
  v('⛔ groupe qui sonne : la pastille « Sonnerie… » reste (elle dit QUI sonne encore), avec le prénom', [compte(sg, ETAT), compte(sg, /<span class="tuile-nom">Ben<\/span>/g)], [1, 1]);
  v('groupe, tous présents : plus de pastille', compte(rg, ETAT), 0);
  vrai('la vidéo de l\'autre n\'est posée qu\'avec les médias (l\'aperçu n\'en a pas)', /^<video /.test(sv) && !/<video/.test(h(ben('sonne'), 'video', false)));
  vrai('l\'échappement tient : un prénom piégé ne sort pas du balisage', !/<img/.test(h({ id: 'x', prenom: '<img src=x onerror=1>', initiales: '<b>', etat: 'present' }, 'groupe', false)));
}

const rendre = C.decl(JS, 'function rendreAppel(');
vrai('(population) rendreAppel est trouvée', rendre.length > 500);
vrai('rendreAppel pose les vignettes par htmlTuileAppel(m, mise, …)', /t\.innerHTML = htmlTuileAppel\(m, mise, CAP\.appelsMedias\);/.test(rendre));
vrai('⛔ et n\'écrit plus la pastille ni l\'étiquette à la main', !/tuile-etat/.test(rendre) && !/Vidéo de/.test(rendre));

vrai('une étiquette vide ne dessine rien : `.tuile-nom:empty { display: none }`', /\.tuile-nom:empty \{[^}]*display: none/.test(CSS));
const borne = (larg) => new RegExp('\\.appel-ecran\\[data-mise="video"\\] \\.tuile:not\\(\\.vous\\) \\.tuile-nom \\{ max-width: calc\\(100% - max\\(16px, env\\(safe-area-inset-left, 0px\\)\\) - ' + larg + 'px - max\\(14px, env\\(safe-area-inset-right, 0px\\)\\) - 12px\\); \\}');
vrai('⛔ l\'étiquette de la vidéo est bornée à GAUCHE de « Vous » : 104 px de vignette au téléphone', borne(104).test(CSS));
vrai('…et 176 px au bureau (≥ 900 px)', new RegExp('@media \\(min-width: 900px\\) \\{ ' + borne(176).source).test(CSS.replace(/\s+/g, ' ')));
vrai('les largeurs bornées sont celles de la vignette « Vous » (104 et 176 posées dans le CSS de la vignette)', /\.appel-ecran\[data-mise="video"\] \.tuile\.vous \{[^}]*width: 104px/.test(CSS) && /\.appel-ecran\[data-mise="video"\] \.tuile\.vous \{ width: 176px/.test(CSS));

fin();
