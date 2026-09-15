/* ══ UNE ÉCRITURE PÉRIMÉE NE REMPLACE PLUS LE DOCUMENT DE L'ÉQUIPE ═════════════════════════

   Justin, 15 septembre 2026 au soir, chez ELAN : « quand il se déplace dans un endroit, ça
   synchronise et ça efface tout ce qu'ils sont en train de faire », « plus rien dans les box ».

   LE MÉCANISME. `syncPush` vérifie `_syncApplying` À SON ENTRÉE, fige une copie de `db`, puis
   ATTEND — mesure, compression, chiffrement. Pendant cette attente, le récepteur (`onSnapshot`)
   peut recevoir l'écriture d'un autre appareil et REMPLACER `db` par un objet neuf. La copie
   figée reste attachée à l'ancien objet (`fusionnerBases` ne mute jamais en place). On écrivait
   donc `_fbDoc.set(...)` — qui remplace le document EN ENTIER, sans `merge` — avec une base
   d'AVANT : tout ce que le collègue venait de pousser disparaissait du document canonique, donc
   de l'équipe entière à la réception suivante.

   ⛔ ET C'EST LA COMPRESSION DE LA v690 QUI L'A RENDU VISIBLE. La fenêtre existait déjà
   (~178 ms), la v690 l'a portée à ~433 ms sur un téléphone de terrain — deux à trois fois plus
   large, sur le profil d'appareil qui se déplace en 4G. Le symptôme est apparu le jour de cette
   publication. Ce n'est pas une coïncidence, et il faut l'écrire ici : une optimisation peut
   élargir une fenêtre de course sans qu'aucun test ne le voie.

   La parade : un compteur qui avance à CHAQUE remplacement de `db`. On le note avant d'attendre,
   on le relit avant d'écrire. S'il a bougé, on n'écrit pas — on repart d'une base fraîche.

   ⚠️ La preuve FONCTIONNELLE (on provoque vraiment la course, dans un navigateur) vit dans
   `scratchpad/sonde-course-synchro.js`. Ici on garde le contrat. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

console.log('\n── 706 · le compteur de génération ──');
v('_dbGen est déclaré une seule fois', (APP.match(/^let _dbGen=0;$/gm) || []).length, 1);
/* ⛔ LE POINT QUI COMPTE : TOUT endroit qui remplace `db` doit l'incrémenter. Un seul oublié
   et la garde devient une loterie — elle protégerait un chemin sur deux, et le défaut reviendrait
   sans qu'on comprenne pourquoi il ne se reproduit qu'une fois sur deux.

   ⛔ CE BANC A DÉJÀ MENTI UNE FOIS, LE JOUR MÊME OÙ IL A ÉTÉ ÉCRIT. Il ne cherchait que le motif
   littéral `db=remote;` et annonçait « exactement deux endroits ». Il y en avait QUATRE, et deux
   lui échappaient par construction : le canal multi-onglets (`db=nd`, événement `storage`) et
   l'import d'un fichier de sauvegarde (`db=migrate(...)`, dans un `FileReader.onload`) — tous
   deux asynchrones, donc tous deux capables de remplacer la base sous un envoi en cours.
   Trouvé par `relecteur`. On énumère donc TOUTES les affectations de `db` du fichier, et
   chacune doit soit faire avancer le compteur, soit figurer dans la liste des exceptions
   justifiées ci-dessous. Un cinquième site ajouté un jour fera rougir ce test au lieu de passer
   inaperçu. */
const lignes = APP.split('\n');
const affect = [];
/* Les commentaires de ce dépôt CITENT le code (« … et l'applique en bloc (`db=remote`) ») :
   sans les écarter, le banc exige un compteur sur une phrase française. On suit donc les blocs
   `/* … *\/` ligne à ligne. Si ce suivi se dérèglait et avalait le fichier, le banc deviendrait
   AVEUGLE au lieu de rougir — c'est le contrôle de plancher juste en dessous qui l'interdit. */
let dansComm = false;
lignes.forEach((l, n) => {
  const etait = dansComm;
  const o = l.lastIndexOf('/*'), f = l.lastIndexOf('*/');
  if (o > f) dansComm = true; else if (f > o) dansComm = false;
  if (etait || /^\s*(\/\*|\*|\/\/)/.test(l)) return;
  if (/(^|[^.\w$])db=[^=]/.test(l)) affect.push({ n: n + 1, l: l.trim() });
});
v('les affectations de `db` sont retrouvées dans le fichier', affect.length >= 5, true);

/* La SEULE exception, et elle se justifie par la chronologie, pas par le confort : cette
   fusion-là vit DANS `syncPush`, de façon synchrone, AVANT que `_genAvant` ne soit relevé.
   Elle fait partie de l'instantané qu'on s'apprête à écrire — la compter reviendrait à
   abandonner chaque envoi à cause de son propre travail. */
const EXCEPTIONS = [/db=fusionnerBases\(db,remote,true\);/];
affect.forEach(a => {
  if (EXCEPTIONS.some(r => r.test(a.l))) { ok++; console.log('  ✓ ligne ' + a.n + ' : exception justifiée (fusion interne à syncPush, avant le repère)'); return; }
  v('ligne ' + a.n + ' : le remplacement de `db` fait avancer le compteur', /_dbGen\+\+/.test(a.l), true);
});
v('⛔ au moins les quatre remplacements connus sont couverts', affect.filter(a => /_dbGen\+\+/.test(a.l)).length >= 4, true);

console.log('\n── 706 · la garde, avant d\'écrire ──');
v('le repère est pris AVANT la compression',
  /const _genAvant=_dbGen;\n    const alle=await syncAllegerNuage\(db\);/.test(APP), true);
v('⛔ et relu JUSTE AVANT l\'écriture', /if\(_dbGen!==_genAvant\)\{/.test(APP), true);
/* La garde doit précéder `_fbDoc.set` — la placer après ne servirait à rien, et c'est le genre
   d'erreur qu'un déplacement de bloc introduit sans bruit. */
const iGarde = APP.indexOf('if(_dbGen!==_genAvant){'), iSet = APP.indexOf('const _ecriture=_fbDoc.set({enc:e.enc');
v('⛔ elle est bien AVANT l\'écriture, pas après', iGarde > 0 && iSet > iGarde, true);
/* Le bloc de garde doit être court : entre lui et l'écriture, rien qui puisse encore attendre. */
v('… et rien n\'attend entre la garde et l\'écriture',
  !/await/.test(APP.slice(iGarde, iSet)), true);

console.log('\n── 706 · abandonner n\'est pas perdre ──');
const bloc = APP.slice(iGarde, iGarde + 620);
/* `_syncTs` sert à la réception (« ce que je reçois est plus vieux que moi, je l'ignore »). Le
   laisser avancé après une écriture ABANDONNÉE rendrait l'appareil sourd à ses collègues —
   c'est la panne du 11 septembre, et elle serait réintroduite ici en silence. */
v('⛔ le repère de réception est remis comme avant', /_syncTs=_tsAvant;/.test(bloc), true);
v('une nouvelle tentative est reprogrammée', /syncPush\(true\)/.test(bloc), true);
v('… et on sort sans écrire', /\n      return;\n    \}/.test(bloc), true);
/* Une trace, pour qu'on sache que ça s'est produit plutôt que de le deviner dans six mois. */
v('l\'abandon laisse une trace en console', /push abandonné : la base a changé pendant la compression/.test(bloc), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
