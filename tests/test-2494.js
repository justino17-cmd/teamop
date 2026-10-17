/* ══ UN APPEL QUI FINIT SE DIT À L'ÉCRAN : « Ben a raccroché · 02:14 » (lot m19, appels@3) ═══════════════════════════════════════════════════════
   Le refus, le manqué et l'absence de réponse avaient leur toast ; la fin d'un appel NORMAL n'avait qu'une annonce pour lecteur d'écran (`sr-seul`) : l'écran d'appel se fermait sans
   un mot. Désormais, un appel qui a eu lieu (une durée) se dit, par un toast visible EN PLUS de l'annonce : « <prénom> a raccroché · 02:14 » quand c'est l'autre, « Appel terminé · 02:14 »
   quand c'est soi. Un appel qui n'a pas duré (annulé, refusé, sans réponse) ne dit rien de plus : il a déjà sa phrase, ou n'en veut pas (annuler soi-même).

   Ce que ce fichier garde :
   1. la VRAIE fonction `phraseFinAppel` (extraite de la page, exécutée) : les deux phrases, la durée en minutes:secondes, une heure et plus, rien sans durée, l'autre sans prénom ;
   2. `quitterAppel` — LA sortie unique de tout chemin qui raccroche — pose le toast avec elle, depuis la durée que la source rend, JAMAIS pour une salle (leur sortie a son propre
      message) ; l'annonce pour lecteur d'écran est conservée ;
   3. `rafraichirAppel` sait que c'est l'AUTRE qui a fini : le drapeau est posé avant de fermer, seulement quand l'appel courait et que le service ne dit rien d'autre (pas d'avis :
      une perte de connexion a sa phrase, « La connexion a été perdue. », et le toast ne la double pas).
   La mesure au navigateur (Ben raccroche, Ana raccroche) : scratchpad/messages/correctifs/m19/sonde-fin.js. */
'use strict';
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const C = require('./outils-cascade-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(process.env.OPMSG_RACINE || path.join(__dirname, '..'), 'apercu/opmessages/index.html'), 'utf8');
const JS = C.sansCommJs((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]);

const src = C.ligne(JS, 'const dureeAppel = ') + '\n' + C.decl(JS, 'function phraseFinAppel(');
vrai('(population) dureeAppel et phraseFinAppel sont extraites de la page (' + src.length + ' caractères)', /const dureeAppel/.test(src) && /function phraseFinAppel/.test(src));
let ph = null;
try { ph = new Function(src + '\nreturn phraseFinAppel;')(); } catch (e) { ph = null; }
vrai('phraseFinAppel est exécutable', typeof ph === 'function');
if (ph) {
  v('⛔ l\'autre raccroche : « Ben a raccroché · 02:14 »', ph(true, 'Ben', 134), 'Ben a raccroché · 02:14');
  v('⛔ on raccroche soi-même : « Appel terminé · 02:14 »', ph(false, 'Ben', 134), 'Appel terminé · 02:14');
  v('une heure et plus : « Appel terminé · 1:02:05 »', ph(false, 'Ben', 3725), 'Appel terminé · 1:02:05');
  v('⛔ un appel qui n\'a pas duré (annulé, refusé, sans réponse) ne dit rien de plus : null', [ph(false, 'Ben', 0), ph(true, 'Ben', 0), ph(false, 'Ben', undefined), ph(true, 'Ben', NaN)], [null, null, null, null]);
  v('l\'autre raccroche mais son prénom est inconnu : « L\'autre a raccroché · 00:07 »', ph(true, '', 7), 'L\'autre a raccroché · 00:07');
}

const sortie = C.decl(JS, 'function quitterAppel(');
vrai('(population) quitterAppel est trouvée', sortie.length > 800);
vrai('⛔ le raccrochage pose le toast avec la durée que la source rend (`rec.duree`) : mot(phraseFinAppel(…))', /source\.terminerAppel\(id\)\.then\(rec => \{[\s\S]*?mot\(/.test(sortie) && /phraseFinAppel\(parAutre, [^)]*rec\.duree\)/.test(sortie));
vrai('l\'annonce pour lecteur d\'écran est conservée (annonceAppel(\'Appel terminé · …\'))', /annonceAppel\(rec\.duree > 0 \|\| !CAP\.appelsMedias \? 'Appel terminé · ' \+ dureeAppel\(rec\.duree\) : 'Appel terminé'\)/.test(sortie));
vrai('⛔ le toast n\'est jamais posé pour une salle (sa sortie a son propre message) : la décision se prend AVANT que l\'appel soit défait', /enSalleAvant = !!\(A && enSalle\(A\)\)/.test(sortie) && /enSalleAvant \? null : phraseFinAppel\(/.test(sortie) && sortie.indexOf('enSalleAvant =') < sortie.indexOf('etat.appelUI = null'));
vrai('le drapeau « fini par l\'autre » est lu AVANT que l\'appel soit défait (A.finiParAutre, sur A capturée)', /const parAutre = !!\(A && A\.finiParAutre\)/.test(sortie) && sortie.indexOf('const parAutre') < sortie.indexOf('etat.appelUI = null'));

const maj = C.decl(JS, 'async function rafraichirAppel(');
vrai('(population) rafraichirAppel est trouvée', maj.length > 300);
const i = maj.indexOf('snap.etat === \'termine\'');
const branche = i < 0 ? '' : maj.slice(i, maj.indexOf('raccrocherCouche();', i) + 20);
vrai('(population) la branche « l\'appel est fini sans qu\'on raccroche » est trouvée', branche.length > 40);
vrai('⛔ elle pose `A.finiParAutre` AVANT de fermer, seulement si l\'appel COURAIT (avant === \'en-cours\') et que le service ne dit rien d\'autre (pas d\'avis)',
  /A\.finiParAutre = avant === 'en-cours' && !snap\.avis;/.test(branche) && branche.indexOf('A.finiParAutre') < branche.indexOf('raccrocherCouche();'));

fin();
