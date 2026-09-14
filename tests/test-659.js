/* ⛔ CE QUE CE FICHIER GARDE — un client déjà installé ne peut plus fabriquer un second
   espace vide au nom de son entreprise.

   11 septembre 2026. Dans la Tour, à côté du vrai espace d'ELAN — « elan-34oc », dix-huit box
   et douze mille unités — il y en avait un second : « elan-d4v8 », même forme, même préfixe,
   AUCUNE connexion jamais remontée. Personne ne l'avait commandé.

   La machine à le fabriquer était dans l'application du client : la carte « Espaces entreprise
   (TeamOP) », visible dès qu'on est administrateur, offrait « ＋ Créer un espace entreprise ».
   teamopCreateSpace() tire un identifiant neuf, une clé neuve, enregistre la fiche sur
   l'appareil et affiche un lien — sans rien demander au serveur. Au nom de « ELAN », ça donne
   un second lien, indiscernable du vrai, qui mène à une base vierge. Justin, le jour même :
   « j'ai mis un autre lien et il n'existe pas… quand un lien n'existe pas, ça ne devrait rien
   faire. Tu m'étonnes qu'il y ait des bugs après. »

   Le bouton ne sert vraiment qu'au premier démarrage, sur un appareil rattaché à personne.
   Passé ce moment, il n'a qu'un effet possible, et c'est une panne. On le retire alors — sans
   retirer « Rejoindre un espace », qui est le chemin qui REMET un appareil au bon endroit, et
   qui doit dire ce qu'il fait avant de le faire. */

const fs = require('fs');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

console.log('Un client installé ne fabrique plus de second espace vide');

/* On travaille sur la carte elle-même, pas sur tout le fichier : « teamopCreateSpace » est
   aussi nommée dans sa propre définition, et un test qui la cherche partout passerait au vert
   en ayant tout raté. */
const iCarte = APP.indexOf('Espaces entreprise (TeamOP)');
v('la carte existe toujours', iCarte > -1, true);
/* Le titre est un ternaire : le nom pour un client installé précède celui de l'opérateur dans
   le fichier. On remonte donc jusqu'au début de la carte, sinon la moitié du bloc est hors champ. */
const carte = APP.slice(APP.lastIndexOf('<div class="card">', iCarte), APP.indexOf('🏢 Mon entreprise', iCarte));

// ── 1) Le bouton de création est conditionné à l'ABSENCE de rattachement.
{
  /* On compte les APPELS (onclick), pas les mentions : le commentaire qui explique la règle
     nomme la fonction lui aussi, et un test qui compterait les deux serait au vert par hasard. */
  const appels = (carte.match(/onclick="teamopCreateSpace\(\)"/g) || []).length;
  v('un seul bouton de création dans la carte', appels, 1);
  const i = carte.indexOf('onclick="teamopCreateSpace()"');
  const avant = carte.slice(Math.max(0, i - 90), i);
  v('⛔ il est précédé de la garde espaceRattache()', /\$\{espaceRattache\(\)\?''\s*:\s*`<button/.test(avant), true);
}

// ── 2) La liste des espaces fabriqués disparaît elle aussi : elle porte les mêmes liens.
{
  v('la liste « Espaces créés » est conditionnée de la même façon',
    carte.indexOf('(!espaceRattache()&&teamopSpaces().length)?') > -1, true);
}

// ── 3) « Rejoindre » RESTE — c'est le chemin de réparation — mais il se nomme et s'annonce.
{
  v('le bouton « Rejoindre » n’a pas été retiré', carte.indexOf('teamopJoinPrompt()') > -1, true);
  v('il se renomme quand l’appareil est déjà rattaché',
    carte.indexOf("espaceRattache()?'Changer d’espace (code)':'Rejoindre un espace (code)'") > -1, true);
  v('⛔ et il prévient qu’il quitte l’entreprise en cours',
    /quitte l.entreprise en cours/.test(carte) && carte.indexOf('${espaceRattache()?`<p') > -1, true);
  v('l’avertissement dit aussi que les collègues ne perdent rien',
    /restent intactes pour tes collègues/.test(carte), true);
}

// ── 4) L'adresse de l'entreprise, elle, ne bouge pas : c'est la seule chose à distribuer.
/* ⚠️ Le libellé disait « LIEN DE CONNEXION DE TON ENTREPRISE » jusqu'au 14 septembre 2026. Il
   dit « ADRESSE » depuis, parce que ce qu'on y montre a changé de nature : c'était un lien
   porteur de la clé d'équipe (`#entreprise=…`), c'est désormais teamop.fr/e/<entreprise>, qui
   n'ouvre rien toute seule — voir tests/test-678.js. Le BLOC, lui, doit toujours être là :
   c'est ce que ce contrôle garde, et c'est pour ça qu'on vérifie AUSSI que la valeur affichée
   passe par lienConnexionEntreprise() plutôt que de se contenter du titre. */
{
  v('l’adresse de l’entreprise reste affichée', carte.indexOf('ADRESSE DE TON ENTREPRISE') > -1, true);
  v('⛔ et c’est bien la fonction filtrée qui la fournit', /id="par-lien"[^>]*>\$\{esc\(lienConnexionEntreprise\(\)\)\}/.test(carte), true);
  v('et la carte se renomme pour un client installé',
    carte.indexOf('Le lien de connexion de ton entreprise') > -1, true);
}

// ── 5) La garde elle-même : espaceRattache() lit bien le rattachement réel, pas un drapeau à part.
{
  const i = APP.indexOf('function espaceRattache()');
  v('espaceRattache() existe', i > -1, true);
  const f = APP.slice(i, i + 200);
  v('elle lit elan_sync_team — la seule marque du rattachement', /localStorage\.getItem\('elan_sync_team'\)/.test(f), true);
  v('et ne jette jamais', /catch\(e\)\{ return false; \}/.test(f), true);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
