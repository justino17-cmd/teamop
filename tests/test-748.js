/* ⛔ CE QUE CE FICHIER GARDE — LE MULTITÂCHE, ET CE QU'IL NE DOIT JAMAIS DEVENIR.

   Demandé par Justin le 21 septembre 2026 : pouvoir quitter un écran pour une autre catégorie,
   revenir, et continuer. Sur le terrain c'est la situation normale — on remplit une
   intervention, un client appelle, on va voir sa fiche, on revient.

   ⛔ LA RÈGLE QUI PRIME SUR LA FONCTIONNALITÉ : rien de tout cela ne s'écrit dans `db`. Une
   base est la propriété du client, et ce dépôt a déjà payé DEUX FOIS l'écriture silencieuse —
   `boxAutoNouveautes` qui tamponnait toutes les box à l'affichage, et le semis qui se répandait
   par la synchro. Un brouillon de fenêtre est un état d'APPAREIL : il vit dans localStorage,
   sous le préfixe de l'espace (donc la bêta a le sien) et sous l'identifiant du compte.

   ⚠️ CE QUI SE VÉRIFIE ICI EST LA FORME DU CODE. Le comportement — remplir, partir, revenir,
   reprendre — se mesure au NAVIGATEUR, parce qu'il faut un vrai DOM, un vrai `localStorage` et
   un vrai rendu de vue : voir `scratchpad/sonde-multi.js`, dont les chiffres sont cités dans
   `REPRISE.md`. Les deux ne se remplacent pas. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const SRC = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
/* ⛔ Nettoyage SÛR : le naïf avale 107 069 caractères d'app.html (voir CLAUDE.md). */
const NU = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/* ⚠️ LE CORPS S'ARRÊTE À LA FONCTION SUIVANTE. Une tranche de taille fixe déborde sur la
   fonction d'après : le contrôle « multiProposer n'ouvre PAS de fenêtre » tombait parce que
   la tranche avalait `openModal` juste en dessous. Le banc accusait le code d'un défaut qui
   n'existait pas — exactement ce que CLAUDE.md reproche à un motif mal ancré. */
const corps = (nom) => {
  const i = NU.indexOf('function ' + nom + '(');
  if (i < 0) return '';
  const j = NU.indexOf('\nfunction ', i + 10);
  return NU.slice(i, j < 0 ? i + 2200 : j);
};

console.log('\n══ 1. ⛔ LES PIÈCES EXISTENT ══\n');
for (const fn of ['multiCle', 'multiTout', 'multiEcrire', 'multiFrais', 'multiEnCours',
  'multiOublier', 'multiCapturer', 'multiReprendre', 'multiProposer']) {
  vrai('   ' + fn, NU.indexOf('function ' + fn + '(') >= 0);
}

console.log('\n══ 2. ⛔⛔ RIEN NE S\'ÉCRIT DANS LA BASE DE L\'ENTREPRISE ══\n');
/* La règle cardinale. Un multitâche qui rangerait ses brouillons dans `db` les ferait partir
   à la synchro, chez tout le monde, et ressusciterait ce qu'une équipe a supprimé exprès. */
const bloc = NU.slice(NU.indexOf('function multiCle('), NU.indexOf('function openModal('));
vrai('⛔⛔ aucune écriture dans db', !/\bdb\.[A-Za-z]+\s*(\.push|\[|=)/.test(bloc));
vrai('⛔ aucun appel à save()', !/\bsave\(\)/.test(bloc));
vrai('   tout passe par localStorage', /localStorage\.(get|set)Item/.test(bloc));

console.log('\n══ 3. ⛔ LE RANGEMENT EST CLOISONNÉ ══\n');
/* Deux cloisons, et les deux comptent : l'ESPACE (la bêta ne doit jamais voir les brouillons
   de la production) et le COMPTE (deux personnes sur le même téléphone de chantier). */
vrai('⛔ la clé dérive de STORE_KEY — donc la bêta a la sienne', /STORE_KEY/.test(corps('multiCle')));
vrai('⛔ la clé porte l\'identifiant du compte', /currentUser\s*&&\s*currentUser\.id/.test(corps('multiCle')));

console.log('\n══ 4. ⛔ LA CAPTURE PASSE AVANT LE CHANGEMENT D\'ÉCRAN ══\n');
/* Dès que `current` a changé, ce qu'on quittait est perdu : l'ordre n'est pas un détail. */
const g = corps('go');
const iCap = g.indexOf('multiCapturer()'), iCur = g.indexOf('current=view');
vrai('   go() capture', iCap >= 0);
vrai('⛔⛔ et il capture AVANT d\'écrire current=view', iCap >= 0 && iCur > iCap);
/* ⛔⛔ LA BARRE SE POSE DANS `rendreVueSure`, PAS DANS `go()` — ET C'EST UNE MESURE, PAS UN GOÛT.
   Posée depuis `go()` sur une minuterie de 60 ms, elle n'apparaissait JAMAIS : `rendreVueAnimee`
   écrit le conteneur APRÈS et la balayait. Vérifiée absente à 100, 300, 600, 1 200 et 2 500 ms. */
vrai('⛔⛔ la barre se pose dans rendreVueSure, là où l écran s écrit vraiment',
  /multiProposer\(view\)/.test(corps('rendreVueSure')));
vrai('⛔ et PLUS depuis go() sur une minuterie', !/setTimeout\([^)]*multiProposer/.test(g));
vrai('   go() repeint les pastilles du menu', /multiPastilles\(\)/.test(g));
/* ⚠️ On repeint la pastille, pas le menu entier : renderNav() reconstruit 42 lignes. */
vrai('⚠️ la pastille ne reconstruit pas tout le menu', !/renderNav\(\)/.test(corps('multiPastilles')));

console.log('\n══ 5. ⛔ NI FICHIER NI SECRET DANS LE BROUILLON ══\n');
/* Un mot de passe recopié dans localStorage y reste en clair, lisible par toute personne qui
   ouvre la console sur l'appareil. Et un fichier ne se restaure pas : le garder serait mentir. */
const cap = corps('multiCapturer');
vrai('⛔⛔ les champs de type password sont écartés', /type\s*===\s*'password'/.test(cap));
vrai('⛔ les champs de type file aussi', /type\s*===\s*'file'/.test(cap));

console.log('\n══ 6. ⛔ UN BROUILLON S\'OUBLIE ══\n');
vrai('⛔ il y a une durée de vie', /MULTI_VIE_MS\s*=\s*\d+\s*\*\s*3600000/.test(NU));
vrai('   et la fraîcheur se vérifie avant de proposer', /multiFrais\(e\)/.test(corps('multiProposer')));
vrai('⛔ un balisage trop gros n\'est pas gardé', /MULTI_MAX/.test(NU) && /length\s*<=\s*MULTI_MAX/.test(cap));
/* ⛔ LA LIGNE QUI EMPÊCHE LES DOUBLONS. Après un enregistrement, la fenêtre se ferme et la vue
   se rappelle : on repasse donc dans la capture SANS fenêtre ouverte, et l'entrée doit partir.
   Sans elle, l'écran proposerait de reprendre un devis déjà enregistré — et on en ferait deux. */
vrai('⛔⛔ une capture sans fenêtre ouverte EFFACE la reprise', /delete o\[current\]/.test(cap));

console.log('\n══ 7. ⛔ LA REPRISE REMET VRAIMENT LES VALEURS ══\n');
const rep = corps('multiReprendre');
vrai('   elle rouvre la fenêtre gardée', /openModal\(e\.html\)/.test(rep));
/* Certains écrans recalculent un total à la frappe : reposer une valeur sans rien émettre
   rendrait un devis dont les lignes sont là et le total à zéro — pire que pas de reprise. */
vrai('⛔ elle émet input/change pour que les totaux se recalculent', /dispatchEvent\(new Event\(/.test(rep));
vrai('   et elle oublie le brouillon une fois repris', /multiOublier\(vue\)/.test(rep));

console.log('\n══ 8. ⛔ ON NE ROUVRE RIEN TOUT SEUL ══\n');
/* Une fenêtre qui se rouvre d'elle-même à l'arrivée sur un écran est une surprise — et une
   surprise sur un téléphone de terrain se solde par un tap au mauvais endroit. */
const pro = corps('multiProposer');
vrai('⛔⛔ multiProposer n\'ouvre PAS la fenêtre', !/openModal\(/.test(pro));
vrai('   il propose une barre', /multi-bar/.test(pro));
vrai('   avec un bouton Reprendre', /multiReprendre\(/.test(pro));
vrai('   et de quoi l\'écarter', /multiOublier\(/.test(pro));

console.log('\n══ 9. ⛔ LE MENU DIT OÙ ON A LAISSÉ QUELQUE CHOSE ══\n');
vrai('   une pastille sur la rubrique concernée', /multi-pt/.test(NU) && /multiEnCours\(r\.it\.k\)/.test(NU));
vrai('   et son style existe', /\.multi-pt\{/.test(SRC));
vrai('   la barre a le sien aussi', /\.multi-bar\{/.test(SRC));

console.log('\n══ 10. ⛔ openModal GARDE LE BALISAGE ══\n');
/* On garde le BALISAGE, pas le nom de la fonction qui a ouvert : il y a plus de cent portes
   vers une fenêtre dans ce fichier, et les recenser serait une liste qui se périme. */
vrai('⛔ openModal enregistre le dernier balisage', /_multiHtml\s*=\s*String\(html/.test(NU));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
