/* ══ LES TROIS DÉFAUTS QUE LA RELECTURE A TROUVÉS DANS LE REPORT DE LA v690 ════════════════

   Le 15 septembre 2026 au soir, la compression phase 2 et la passe de performance ont été
   reportées À LA MAIN depuis la branche de travail vers `main` — `git merge` était impossible,
   les deux côtés portant la v676 sous deux commits différents (3 Mo en conflit). Le report a
   été fait par un script à ancres affirmées uniques, et il a quand même laissé trois choses.
   L'agent `relecteur` les a trouvées AVANT publication. Ce banc les cloue, parce qu'un défaut
   trouvé une fois et non gardé revient par le chemin suivant.

   1. UNE LIGNE DUPLIQUÉE. Le bloc pris dans le fichier de la branche allait une ligne trop
      loin : `console.error('push : base trop lourde…')` s'est retrouvée deux fois de suite.
      Personne ne l'aurait vue à l'écran — c'est une trace console — mais un diagnostic futur
      aurait compté deux pannes là où il n'y en a qu'une.

   2. `_jsemCache` N'ÉTAIT OUBLIÉ QUE PAR UNE CLÉ SUR DEUX. `planJoursSem()` lit
      `elan_plan_jsem`, et à défaut se replie sur `elan_plan_hidewe`. Le commentaire affirmait
      « le seul endroit qui l'écrit l'oublie » : vrai de la première clé, faux de la seconde.
      Résultat pour quelqu'un qui n'a jamais touché au sélecteur de jours : « ✕ Tout effacer »
      remettait `elan_plan_hidewe` à 0 pendant que le cache gardait `[1,2,3,4,5]`, donc le
      week-end restait masqué — un bouton qui prétend tout réinitialiser et ne le fait pas.
      ⛔ L'événement `storage` ne rattrape rien : il ne se déclenche QUE dans les autres onglets.

   3. LA TRANCHE D'HISTORIQUE DÉBORDAIT SUR L'AUDIT. `journalView` sert les deux écrans :
      déplier l'Historique à 240 lignes ouvrait ensuite l'Audit à 240 aussi — la lenteur qu'on
      venait de retirer, réintroduite par la porte d'à côté. ⚠️ Et la correction a son propre
      piège : remettre la tranche à 80 à CHAQUE passage annulerait le bouton « Afficher la
      suite », qui re-rend le même écran par `go(current)`. D'où le repère sur `current`. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}
/* Découpe une fonction par ses accolades, jamais par une fenêtre de largeur fixe : une fenêtre
   se casse le jour où la fonction gagne un commentaire, et fait croire à une régression. */
function corps(nom) {
  const i = APP.indexOf(nom);
  if (i < 0) return '';
  let j = APP.indexOf('{', i), n = 0, k = j;
  for (; k < APP.length; k++) { if (APP[k] === '{') n++; else if (APP[k] === '}') { n--; if (!n) break; } }
  return APP.slice(i, k + 1);
}

console.log('\n── 701 · 1. le report n\'a pas laissé de ligne en double ──');
v('la trace « base trop lourde » n\'existe qu\'UNE fois',
  APP.split("console.error('push : base trop lourde même sans pièces").length - 1, 1);
/* Les autres lignes du même bloc, pour la même raison : un report qui glisse d'une ligne les
   duplique toutes ensemble, pas une par une. */
v('… le toast de refus aussi', APP.split('La base est trop lourde pour le nuage même sans pièces jointes').length - 1, 1);
v('… et le calcul de `det` aussi', APP.split('const det=(alle.doc?(').length - 1, 1);

console.log('\n── 701 · 2. les DEUX clés du réglage oublient le cache ──');
/* Chaque écriture de l'une ou l'autre clé doit être suivie, dans la même fonction, d'un oubli
   du cache. On vérifie fonction par fonction plutôt qu'au compteur : un compteur juste ne dit
   pas que l'oubli est au bon endroit. */
/* ⚠️ `planOptToggle` n'écrit PAS la clé en toutes lettres : elle la CALCULE
   (`const k=(cle==='we')?'elan_plan_hidewe':…` puis `setItem(k,…)`). Chercher
   `setItem('elan_plan_hidewe'` chez elle donnerait un faux négatif — et « corriger » le code
   pour faire passer un tel test serait exactement la faute que ce dépôt interdit. On demande
   donc la bonne chose : la fonction NOMME une des deux clés, et elle oublie le cache. */
const ecrivains = [
  ['planJoursSemSet', 'function planJoursSemSet('],
  ['planOptToggle', 'function planOptToggle('],
  ['planFiltresRaz', 'function planFiltresRaz('],
];
ecrivains.forEach(([nom, ancre]) => {
  const c = corps(ancre);
  v(nom + ' est trouvée', c.length > 0, true);
  v(nom + ' nomme bien une des deux clés du réglage', /'elan_plan_(jsem|hidewe)'/.test(c), true);
  v('… et elle écrit dans le stockage', /localStorage\.setItem\(/.test(c), true);
  v('⛔ ' + nom + ' oublie le cache', /_jsemCache=null/.test(c), true);
});
/* Le cas particulier de `planOptToggle` : l'oubli doit être posé sur la branche `we`, pas à
   l'aveugle sur `hidedone` — sinon basculer « masquer les terminées » jetterait un cache qui
   n'a rien à voir, et surtout l'oubli aurait l'air fait sans l'être si la branche change. */
v('planOptToggle n\'oublie le cache que pour la clé qui le nourrit',
  /if\(cle==='we'\) _jsemCache=null;/.test(corps('function planOptToggle(')), true);
/* ⛔ Et le repli doit rester CELUI qui justifie la règle : si `planJoursSem` cessait un jour de
   lire `elan_plan_hidewe`, les deux oublis de `planOptToggle` et `planFiltresRaz` deviendraient
   du bruit — mais s'il la lit, ils sont obligatoires. On garde donc le lien sous surveillance. */
const js = corps('function planJoursSem(');
v('planJoursSem lit bien les DEUX clés (c\'est ce qui rend les oublis obligatoires)',
  /elan_plan_jsem/.test(js) && /elan_plan_hidewe/.test(js), true);
v('… et rend le cache quand il est posé', /if\(_jsemCache\) return _jsemCache;/.test(js), true);
/* L'événement `storage` ne se déclenche QUE dans les autres onglets : il complète les oublis,
   il ne les remplace pas. Le retirer en croyant qu'il suffit est exactement l'erreur à éviter. */
v('l\'événement storage couvre les deux clés, en plus des oublis',
  /storage[^)]*plan_jsem\|plan_hidewe/.test(APP), true);

console.log('\n── 701 · 3. la tranche d\'historique appartient à l\'écran qu\'on regarde ──');
const jv = corps('function journalView(');
v('journalView est trouvée', jv.length > 0, true);
v('⛔ changer d\'écran remet la tranche à HIST_PAS',
  /_histVue!==current[\s\S]*_histMax=HIST_PAS/.test(jv), true);
v('… en se repérant sur `current`, pas sur un drapeau de l\'appelant',
  /_histVue=current/.test(jv), true);
/* ⚠️ Le piège de la correction : `histPlus` re-rend le MÊME écran. S'il remettait la tranche à
   zéro, ou si journalView la remettait sans comparer, le bouton « Afficher la suite » ne
   ferait plus rien du tout. */
const hp = corps('function histPlus(');
v('histPlus AJOUTE à la tranche, il ne la remet pas', /_histMax\+=n/.test(hp) && !/_histMax=HIST_PAS/.test(hp), true);
v('… et il re-rend le même écran (donc sans déclencher la remise à zéro)', /go\(current\)/.test(hp), true);
/* Les deux écrans servis par journalView : si un troisième arrive, il hérite de la règle. */
v('Historique et Audit passent tous deux par journalView',
  /views\.historique=function\(\)\{ journalView\(/.test(APP) && /views\.audit=function\(\)\{ journalView\(/.test(APP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
