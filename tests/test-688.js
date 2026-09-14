/* ══ L'APPLICATION PROPOSAIT DE SE CONNECTER SOUS LE COMPTE D'UN AUTRE ════════════════════
   Vidéo de Justin, 14 septembre 2026. Il se connecte en « justin » sur teamop.fr/e/elan, le
   serveur vérifie son identifiant et son mot de passe, l'application s'ouvre sur ELAN — et
   son écran de connexion propose « florent ».

   D'où ça vient : `elan_admin_login` porte l'identifiant DE DÉPART DE L'ESPACE (le champ « a »
   du code, choisi le jour de sa création — « florent » pour ELAN). Au démarrage, le bloc qui
   renomme le compte « admin » écrivait cet identifiant dans `elan_savedLogin`, écrasant celui
   que connexion.html venait d'y poser avec la personne réelle.

   Ce n'est pas un défaut d'affichage : c'est une confusion d'identité. On propose à quelqu'un
   d'entrer sous le compte d'un autre, juste après lui avoir demandé le sien.

   Second défaut du même chemin : l'ouverture automatique abandonnait EN SILENCE quand les
   comptes de l'entreprise n'étaient pas encore arrivés. La personne retombait sur un écran de
   connexion sans un mot, ce qui se lit « ça n'a pas marché » — alors que l'authentification,
   elle, avait parfaitement marché. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 688 · l\'identifiant proposé est celui de la personne, jamais celui de l\'espace ──');

/* La garde, éprouvée sur la vraie fonction extraite du fichier. */
/* ⚠️ La fonction s'arrête à SON catch, pas au prochain « }; » venu : sans cette borne le
   motif avalait le bloc suivant, et le banc échouait sur un `await` qui n'était pas à lui. */
const src = APP.match(/const savedLoginPoser=\(v\)=>\{[\s\S]*?\}catch\(_e\)\{\} \};/);
v('savedLoginPoser est trouvée dans app.html', !!src, true);
if (src) {
  const faire = (avant) => {
    const mem = { elan_savedLogin: avant };
    const f = new Function('localStorage', src[0] + '; return savedLoginPoser;')({
      getItem: k => (k in mem ? mem[k] : null), setItem: (k, x) => { mem[k] = String(x); } });
    f('florent');
    return mem.elan_savedLogin;
  };
  /* ⛔ LE CŒUR DU DÉFAUT. */
  v('⛔ un identifiant déjà retenu n\'est PAS écrasé par celui de l\'espace', faire('justin'), 'justin');
  v('… quelle que soit sa casse', faire('Justin'), 'Justin');
  /* Et le cas légitime continue de marcher : première mise en service, personne n'a de compte. */
  v('rien de retenu → l\'identifiant de départ est proposé', faire(''), 'florent');
  v('le générique « admin » se laisse remplacer', faire('admin'), 'florent');
  v('… même écrit en capitales', faire('ADMIN'), 'florent');
}
/* Les deux points d'écriture passent par la garde : un seul oublié et le défaut revient. */
v('⛔ plus aucune écriture directe de elan_savedLogin dans ce bloc',
  /savedLoginPoser\(_al\)/.test(APP) && !/setItem\('elan_savedLogin',_al\)/.test(APP), true);
v('… et les deux chemins l\'utilisent', (APP.match(/savedLoginPoser\(_al\)/g) || []).length, 2);

/* L'abandon de l'ouverture automatique parle, et garde l'identifiant de la personne. */
v('⛔ l\'abandon dit ce qui manque, au lieu de se taire',
  /const abandon=\(quoi\)=>\{ try\{ localStorage\.setItem\('elan_savedLogin',String\(j\.login\)\); \}/.test(APP), true);
v('… « les comptes ne sont pas encore arrivés » quand la base est vide',
  /Les comptes de l\\'entreprise ne sont pas encore arrivés sur cet appareil/.test(APP), true);
v('… « ton identifiant n\'existe pas ici » quand elle ne l\'est pas',
  /n\\'existe pas encore dans les comptes de cette entreprise/.test(APP), true);
v('… et le cas du mot de passe changé est distingué des deux autres',
  /Ton mot de passe a changé depuis/.test(APP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
