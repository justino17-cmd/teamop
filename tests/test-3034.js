/* ⛔ CE QUE CE FICHIER GARDE — LES APPELS MANQUÉS D'AFFILÉE D'UNE MÊME PERSONNE FONT UNE LIGNE, « 3 appels manqués », COMME L'IPHONE (Justin, 26 octobre 2026, décision #9, testeur « appels@2 »).

   Le regroupement existait déjà, dans le module de données du service (`listeAppels` : deux manqués ne se suivent que si RIEN d'autre ne s'est passé entre eux avec cette personne ; `repetitions`) — gardé par
   `test-2493` (« manqué (2) » chez Ben, l'appel répondu à part). Ce qui changeait était la PHRASE : « Appel manqué (3) », une parenthèse que personne ne lit comme un nombre. Elle dit maintenant
   « 3 appels manqués », sans le type (les trois peuvent mêler audio et vidéo : la ligne n'en garde qu'un), et sa phrase vocale (`aria-label` du bouton « Rappeler ») dit la même chose.

   Les VRAIES fonctions de la page (`libelleAppel`, `ligneAppel`) sont extraites et exécutées :
     1. un manqué seul reste « Appel manqué » (« Appel vidéo manqué » en vidéo) ; deux et plus : « 2 appels manqués », « 5 appels manqués » ; le nombre est celui de la ligne ;
     2. ⛔ la contre-épreuve : ce qui n'est pas un manqué d'affilée ne change pas — un appel entrant ou sortant répété (`repetitions` ne vaut que pour un manqué), un appel de GROUPE manqué
        (jamais regroupé par la source) ;
     3. la ligne de l'historique (`ligneAppel`) : le texte visible ET l'étiquette vocale disent « 3 appels manqués », le nom reste rouge (classe `manque`), « Rappeler » rappelle le dernier ;
     4. l'ancienne forme « (3) » n'existe plus nulle part dans le texte rendu.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque cas est précédé de sa population (les fonctions sont trouvées, la ligne est rendue). */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
(async () => {
  const M = P.monter({
    dureeCourte: P.ligne('const dureeCourte ='), SENS_APPEL: P.ligne('const SENS_APPEL ='), ISSUE_APPEL: P.ligne('const ISSUE_APPEL ='),
    libelleAppel: P.decl('function libelleAppel('), ligneAppel: P.decl('function ligneAppel('),
  }, { esc, avatar: () => '<span class="avatar"></span>', icone: (n) => '<svg data-i="' + n + '"></svg>', libelleListe: () => 'hier' });
  console.log('0. La population');
  v('(population) chaque morceau est trouvé', M.absents, []);
  const L = (o) => M.F.libelleAppel(Object.assign({ groupe: false, type: 'audio', sens: 'entrant', repetitions: 1, duree: 0, membres: ['c1'] }, o));

  console.log('\n1. Les manqués d\'affilée disent combien');
  v('un manqué seul reste « Appel manqué » ; en vidéo, « Appel vidéo manqué »', [L({ sens: 'manque' }), L({ sens: 'manque', type: 'video' })], ['Appel manqué', 'Appel vidéo manqué']);
  v('⛔ deux, trois, cinq manqués d\'affilée : « 2 appels manqués », « 3 appels manqués », « 5 appels manqués »', [2, 3, 5].map(n => L({ sens: 'manque', repetitions: n })), ['2 appels manqués', '3 appels manqués', '5 appels manqués']);
  v('⛔ le type n\'est pas dit pour un groupement (audio et vidéo mêlés) : « 3 appels manqués » en vidéo comme en audio', [L({ sens: 'manque', repetitions: 3, type: 'video' }), L({ sens: 'manque', repetitions: 3, type: 'audio' })], ['3 appels manqués', '3 appels manqués']);
  vrai('l\'ancienne forme, une parenthèse après « manqué », n\'est plus écrite', ![2, 3, 12].some(n => /\(\d+\)/.test(L({ sens: 'manque', repetitions: n }))));

  console.log('\n2. Ce qui n\'est pas un manqué d\'affilée ne change pas');
  v('un appel entrant ou sortant n\'est jamais regroupé, même avec `repetitions` > 1 (la source ne le pose que pour un manqué)', [L({ sens: 'entrant', repetitions: 3, duree: 540 }), L({ sens: 'sortant', repetitions: 2, duree: 190 })], ['Appel entrant · 9 min', 'Appel sortant · 3 min']);
  v('un appel de GROUPE manqué garde sa phrase (« Appel de groupe manqué · 3 participants ») — la source ne regroupe pas les salles', L({ groupe: true, sens: 'manque', repetitions: 2, membres: ['c1', 'c2'] }), 'Appel de groupe manqué · 3 participants');
  v('l\'issue d\'un appel sortant qui n\'a pas abouti passe toujours devant (« Appel sans réponse »)', L({ sens: 'sortant', issue: 'manque' }), 'Appel sans réponse');

  console.log('\n3. La ligne de l\'historique');
  const html = M.F.ligneAppel({ id: 'h1', nom: 'Ben Durand', groupe: false, type: 'audio', sens: 'manque', repetitions: 3, duree: 0, membres: ['c1'], t: 1000 });
  vrai('(population) la ligne est rendue pour Ben Durand', /Ben Durand/.test(html) && /data-rappeler="h1"/.test(html));
  vrai('⛔ le texte visible dit « 3 appels manqués »', /<span class="appel-kind">[^]*<span>3 appels manqués<\/span>/.test(html));
  vrai('⛔ l\'étiquette vocale du bouton « Rappeler » aussi : « Rappeler Ben Durand — 3 appels manqués, hier »', /aria-label="Rappeler Ben Durand — 3 appels manqués, hier"/.test(html));
  vrai('le nom reste rouge (classe `manque`) — l\'info « manqué » ne se lit pas qu\'au texte', /appel-nom-ligne manque/.test(html));
  vrai('« Détails » (le bouton à côté) garde son étiquette', /aria-label="Détails de l&#39;appel avec Ben Durand"/.test(html));
  const seul = M.F.ligneAppel({ id: 'h2', nom: 'Ben Durand', groupe: false, type: 'audio', sens: 'manque', repetitions: 1, duree: 0, membres: ['c1'], t: 1000 });
  vrai('un manqué seul : « Appel manqué » (contre-épreuve : le texte ne devient pas « 1 appels manqués »)', /<span>Appel manqué<\/span>/.test(seul) && !/appels manqués/.test(seul));
  vrai('aucune parenthèse de nombre dans la ligne rendue', !/manqué \(\d+\)/.test(html));
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
