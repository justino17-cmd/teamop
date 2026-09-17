/* ══ test-721 — UNE ACTION DESTRUCTIVE TIENT LE PLANCHER TACTILE ════════════════════════════
 *
 * Revue d'affichage du 17 septembre 2026, sur la VRAIE bêta (compte teamopteste, espace
 * opgestion-beta), 42 écrans à 390 px, listes remplies de noms longs. Mesuré :
 * **1 109 cibles sur 1 810 sous 44 px**. C'est un compromis de DENSITÉ, assumé et documenté —
 * `.btn.sm` est volontairement bas, et le planning a des barres de 15 px qu'on ne peut pas
 * grossir sans détruire la grille hebdomadaire.
 *
 * ⛔ MAIS 88 DE CES CIBLES ÉTAIENT DES `.btn.danger`. La densité se discute ; effacer par
 * erreur, non. Sur un chantier — écran au soleil, une main, parfois un gant — un tap manqué
 * sur un bouton de suppression coûte une donnée, pas une seconde. C'est la seule classe de
 * boutons où le compromis ne se défend pas.
 *
 * ⛔ ET CE BANC GARDE AUSSI CONTRE MA PROPRE PRUDENCE. Premier essai : une dérogation à 40 px
 * pour les `.btn.danger.sm` dans une `.list-row`, au motif SUPPOSÉ que 44 px repousserait le
 * texte. Mesuré juste après : les 20 boutons 🗑 concernés rendaient 43 px — l'exception
 * maintenait sous le plancher exactement ceux qu'on voulait protéger. Retirée. Mesure finale :
 * 80 boutons destructifs, tous à 44 px, AUCUN des 42 écrans ne déborde, aucun texte coupé.
 * Toute dérogation future à ce plancher doit donc être MESURÉE avant d'être écrite.
 */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const BETA = fs.readFileSync(path.join(__dirname, '..', 'beta.html'), 'utf8');

let ok = 0, ko = 0;
const vrai = (nom, c) => { if (c) ok++; else { ko++; console.log('  ✗ ' + nom); } };

console.log('1. Le plancher existe, et il vise bien les trois formes');
const regle = /\.btn\.danger,html\[data-refonte\] \.btn\.danger,\s*\n?\s*html\[data-refonte\] \.btn\.danger\.sm\{min-height:44px!important\}/;
vrai('la règle du plancher à 44 px est présente', regle.test(APP));
vrai('… et elle couvre aussi la version `sm`', /html\[data-refonte\] \.btn\.danger\.sm\{min-height:44px/.test(APP));
/* ⛔ `!important` n'est pas de la coquetterie : `.btn.sm{min-height:34px}` est déclarée avec la
   même spécificité de classe. Sans lui, le plancher perdrait sur les boutons `sm`. */
vrai('le plancher est en !important, sinon .btn.sm le battrait', /\.btn\.danger\.sm\{min-height:44px!important\}/.test(APP));

console.log('2. ⛔ Aucune dérogation ne redescend sous 44 px');
/* On cherche toute règle qui poserait un min-height inférieur sur un bouton destructif. */
/* ⚠️ ET ON TIENT COMPTE DE LA CASCADE, sinon le banc crie faux. Premier essai : il a signalé
   `html[data-refonte] .ph-actions .btn.danger{min-height:42px}` comme une dérogation — sauf que
   ce 42 px est SANS `!important` et que le plancher en porte un : la cascade le résolvait déjà,
   et la mesure au navigateur donnait bien 80 boutons sur 80 à 44 px. Une règle sans `!important`
   ne bat pas un plancher qui en a un. Le drapeau était faux ; ce qu'il pointait ne l'était pas,
   et la règle a été corrigée pour dire ce qui s'applique vraiment. */
const derogations = (APP.match(/[^\n{]*\.btn\.danger[^{}\n]*\{[^}]*min-height:\s*(\d+)px\s*(!important)?/g) || [])
  .map(r => ({ r: r.slice(0, 90), px: parseInt(/min-height:\s*(\d+)px/.exec(r)[1], 10),
               fort: /min-height:\s*\d+px\s*!important/.test(r) }))
  .filter(x => x.px < 44 && x.fort);
vrai('aucune règle FORTE ne pose un plancher inférieur à 44 px sur un .btn.danger', derogations.length === 0);
/* ⛔ Et on exige aussi que les règles FAIBLES ne mentent plus : une règle qui dit 42 px sans
   pouvoir l'imposer reste un piège pour la prochaine main. */
const faibles = (APP.match(/[^\n{]*\.btn\.danger[^{}\n]*\{[^}]*min-height:\s*(\d+)px/g) || [])
  .map(r => ({ r: r.slice(0, 90), px: parseInt(/min-height:\s*(\d+)px/.exec(r)[1], 10) })).filter(x => x.px < 44);
vrai('aucune règle ne DIT moins de 44 px sur un .btn.danger, même sans pouvoir l\'imposer', faibles.length === 0);
if (faibles.length) faibles.forEach(d => console.log('      dit ' + d.px + 'px : ' + d.r));
if (derogations.length) derogations.forEach(d => console.log('      dérogation : ' + d.r + ' → ' + d.px + 'px'));
/* Et nommément, celle que j'avais inventée : elle ne doit pas revenir. */
vrai('la dérogation « list-row 40px » ne revient pas', !/\.list-row \.btn\.danger\.sm[^}]*min-height:40px/.test(APP));

console.log('3. La leçon est écrite à côté du code');
vrai('le commentaire dit pourquoi le destructif est à part', /la densité se discute ; effacer par erreur, non/i.test(APP) || /PAS D'EXCEPTION POUR LES LIGNES DE LISTE/.test(APP));
vrai('… et qu\'une dérogation doit être MESURÉE', /pour une raison que personne n'avait\s*\n?\s*vérifiée|La prudence inventée coûtait plus/.test(APP));

console.log('4. La bêta emporte la même règle');
vrai('beta.html porte le plancher', /\.btn\.danger\.sm\{min-height:44px!important\}/.test(BETA));
/* La bêta ne doit pas avoir perdu l'isolation au passage. */
vrai('… et reste isolée', BETA.indexOf("FB_TEAM='opgestion-beta'") > 0 && BETA.indexOf("'elanB_gestion_v2'") > 0);

console.log('5. ⚠️ Ce qu\'on NE prétend PAS avoir corrigé');
/* Un banc doit dire ce qu'il ne couvre pas, sinon il rassure à tort. Le reste des 1 109 cibles
   sous 44 px est un compromis de densité — décision de Justin, pas un défaut à corriger en
   silence. Les barres du planning (15 px) sont la grille hebdomadaire elle-même. */
vrai('.btn.sm garde son plancher bas, c\'est un choix documenté', /html\[data-refonte\] \.btn\.sm\{min-height:34px/.test(APP));
vrai('les barres du planning gardent leur hauteur de grille', /\.pg-pt\{ height:15px/.test(APP));

console.log('\n════ test-721 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
if (ko) process.exit(1);
