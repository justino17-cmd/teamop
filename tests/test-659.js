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

console.log('Un client installé ne fabrique plus de second espace vide — et plus aucun code ne sert à se connecter');

/* ⛔⛔ 28 SEPTEMBRE 2026 — PLUS AUCUN CODE. Justin : « je veux plus de code, que des liens pour les connexions » ; « c'est
   nous qui créons les liens pour les entreprises une fois leur demande faite ». Ce banc gardait « le bouton de création
   n'apparaît que sur un appareil non rattaché » et « Rejoindre un espace (code) reste » : les deux sont RETIRÉS, avec la
   liste des espaces créés (« Voir le code »), l'entrée « code entreprise » de l'écran de connexion et la clé d'équipe à
   taper. On vise la FORME DU CODE (onclick, définitions, balises), jamais une phrase : les commentaires qui expliquent le
   retrait nomment ces fonctions. */
const iCarte = APP.indexOf('<h3>🔗 Le lien de connexion de ton entreprise</h3>');
v('la carte existe toujours', iCarte > -1, true);
const carte = APP.slice(APP.lastIndexOf('<div class="card">', iCarte), APP.indexOf('🏢 Mon entreprise', iCarte));
v('la carte est trouvée entière (population)', carte.length > 1500, true);

// ── 1) Plus de création d'espace depuis l'application : c'est TEAM OP qui crée les liens.
v('⛔ aucun bouton « Créer un espace entreprise »', /onclick="teamopCreateSpace\(\)"/.test(APP), false);
v('⛔ et la fonction n\'existe plus', /function teamopCreateSpace\(|function teamopGenSpace\(|function teamopShowCode\(/.test(APP), false);

// ── 2) Plus de liste d'espaces créés ni de « Voir le code ».
v('⛔ ni liste des espaces créés, ni « Voir le code »', /teamopSpaces\(\)\.map|onclick="teamopShowSavedCode|function teamopSpaces\(/.test(APP), false);

// ── 3) Plus d'entrée par code : ni dans la carte, ni à l'écran de connexion.
v('⛔ aucun « Rejoindre / Changer d\'espace (code) »', /onclick="teamopJoinPrompt\(\)"|function teamopJoinPrompt\(|async function teamopJoin\(/.test(APP), false);
v('⛔ l\'écran de connexion n\'offre plus « code entreprise »', />Rejoindre un espace TeamOP \(code entreprise\)</.test(APP), false);
v('⛔ la clé d\'équipe ne se tape plus (le champ a disparu)', /<input id="sync-secret"/.test(APP), false);
v('un appareil rattaché à personne est renvoyé au LIEN que TEAM OP a envoyé',
  /ouvre le <b>lien de connexion<\/b> que TEAM OP t'a envoyé/.test(carte), true);
v('… et le lien d\'une entreprise s\'ouvre toujours (teamopLienCheck lit #entreprise=…)',
  /async function teamopLienCheck\(\)\{/.test(APP) && /entreprise=\(\[A-Za-z0-9\+\/=_-\]\{8,\}\)/.test(APP), true);

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
  v('et la carte s\'appelle « Le lien de connexion de ton entreprise »',
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
