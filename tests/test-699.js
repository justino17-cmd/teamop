/* ══ v681 — « SINON RIEN NE MARCHE » ══════════════════════════════════════════════════════

   Quatre demandes de Justin, le 15 septembre 2026, dans la même heure, toutes nées de la même
   journée : une équipe entière bloquée dehors pendant qu'il redonnait des accès à la main.

   1. « tout le monde va se connecter, leur obliger à changer leur mot de passe ET leur mail,
      sinon rien marche » — puis, plus précis : « ça met une page changez votre mot de passe
      pour une histoire de sécurité, ajoutez bien un e-mail pour pouvoir récupérer votre mot
      de passe perdu dans le futur ; si cela n'est pas fait, votre accès n'est pas activé ».
   2. « on voit les identifiants qui changent leur mot de passe, et on voit ceux qui sont
      toujours en mot de passe provisoire » — dans la Tour.
   3. « j'ai changé les couleurs et tout, mais sur mon iPhone ça n'a pas changé, il faut que
      ça synchronise bien entre chaque appareil ».
   4. « ici le lien il faut vraiment que ça les ramène à la 2e photo et que les utilisateurs
      suivent les consignes » — la page qu'on donne avec des identifiants.

   ⚠️ CE QUE CE FICHIER ÉPROUVE, ET COMMENT. Les fonctions sont EXTRAITES du fichier livré par
   comptage d'accolades, jamais par une fenêtre de largeur fixe : quatre tests se sont cassés
   cette semaine parce qu'un `APP.slice(i, i+3500)` coupait au milieu d'une fonction qui avait
   grossi. Ce qui ne peut pas s'exécuter (du balisage, un ordre d'appel) se lit dans le texte,
   et c'est dit à chaque fois. */
const fs = require('fs'), path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const APP = R('app.html'), SRV = R('server/index.js'), TOUR = R('tour.html'), CNX = R('connexion.html');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}
/* La vraie fonction, bornée par ses accolades — pas par un nombre de caractères. */
function extraire(src, entete) {
  const d = src.indexOf(entete); if (d < 0) return null;
  let n = 0;
  for (let i = src.indexOf('{', d); i < src.length; i++) {
    if (src[i] === '{') n++; else if (src[i] === '}') { n--; if (!n) return src.slice(d, i + 1); } }
  return null;
}

console.log('\n── 699 · mot de passe + e-mail obligatoires, apparence partagée, lien qui ramène à la consigne ──');

/* ══ 1. LA CAMPAGNE SÉCURITÉ ═══════════════════════════════════════════════════════════ */
{
  const SECU = (APP.match(/const SECU_MDP='([^']+)'/) || [])[1] || '';
  v('la campagne porte un marqueur daté', /^\d{4}-\d{2}$/.test(SECU), true);
  /* ⛔ La vraie fonction lit `BETA_ESSAI` depuis le 22 septembre 2026 : on le lui fournit.
     Ici on monte la PRODUCTION — c'est ce que ce banc surveille ; `test-665` et `test-749`
     tiennent le sens bêta. */
  const secuAFaire = new Function("const BETA_ESSAI=false;const SECU_MDP='" + SECU + "';" + extraire(APP, 'function secuAFaire(') + '; return secuAFaire;')();
  v('⛔ un compte jamais passé par la campagne est retenu', secuAFaire({ pwdHash: 'a'.repeat(64), email: 'x@y.fr' }), true);
  v('⛔ un mot de passe provisoire est retenu', secuAFaire({ pwdHash: 'a'.repeat(64), mustChangePwd: true, email: 'x@y.fr', secu: SECU }), true);
  v('⛔ un compte sans mot de passe est retenu', secuAFaire({ email: 'x@y.fr', secu: SECU }), true);
  v('un compte en règle passe', secuAFaire({ pwdHash: 'a'.repeat(64), email: 'x@y.fr', secu: SECU }), false);
  /* ⚠️ L'E-MAIL N'EST VOLONTAIREMENT PAS DANS CE TEST : une adresse effacée plus tard par
     l'administrateur ne doit pas redemander un CHANGEMENT DE MOT DE PASSE, juste l'adresse.
     C'est `emailRappelModal` qui tient ce cas, éprouvé plus bas. */
  v('une adresse effacée ne redemande pas le mot de passe', secuAFaire({ pwdHash: 'a'.repeat(64), secu: SECU }), false);
  /* ⛔ ET JAMAIS SUR UN ACCÈS D'ESSAI. Le mot de passe d'un compte bêta vit sur le serveur
     (`beta-comptes.json`, géré depuis la Tour), pas sur la fiche : le changer ici ne
     changerait rien, la fiche locale et la vraie porte diraient deux choses différentes, et
     on réclamerait une adresse de récupération à un compte qui n'en a pas. */
  v('⛔ un accès bêta n’est jamais retenu', secuAFaire({ login: 'testeur', essai: true }), false);
  /* ⛔ DEUX GARDES SUR CETTE PORTE, ET ON LES EXIGE TOUTES LES DEUX. Le motif d'avant
     épousait une écriture sur UNE ligne : ajouter la garde de la bêta au-dessus le faisait
     tomber alors que le code était bon. On vise donc le CORPS de la fonction, pas sa mise en
     page — c'est la règle « un motif vise du code, jamais une forme de rédaction ». */
  { const em = extraire(APP, 'function emailRappelModal(');
    v('le corps d’emailRappelModal est trouvé (sinon les deux contrôles sont creux)', em.length > 60, true);
    v('… et la fenêtre d’e-mail ne s’ouvre pas sur un accès bêta du serveur',
      /if\(!currentUser\|\|currentUser\.essai\) return;/.test(em), true);
    v('… ni sur la bêta elle-même (Justin, 22 septembre 2026)',
      /if\(BETA_ESSAI\) return;/.test(em), true); }

  const fps = extraire(APP, 'async function forcePwdSave(');
  v('⛔ « changer » veut dire changer : le même mot de passe est refusé',
    /if\(currentUser\.pwdHash&&neufH===currentUser\.pwdHash\)/.test(fps), true);
  v('⛔ l’e-mail reste exigé, et validé pour de bon',
    /if\(!\/\^\[\^@\\s\]\+@\[\^@\\s\]\+\\\.\[\^@\\s\]\+\$\/\.test\(fm\)\)/.test(fps), true);
  v('la campagne se marque sur la fiche', /currentUser\.secu=SECU_MDP;/.test(fps), true);
  /* ⛔ LE RETOUR EN ARRIÈRE (v680) DOIT EMPORTER LE NOUVEAU CHAMP. Si le serveur refuse le
     dépôt, on remet l'état d'avant : `secu` oublié dans `avant`, et la campagne resterait
     marquée FAITE alors que rien n'a été enregistré. */
  v('⛔ … et repart en arrière si le serveur refuse', /secu:currentUser\.secu\}/.test(fps), true);
  v('l’écran dit que l’accès n’est pas activé tant que ce n’est pas fait',
    /ton accès n'est pas activé/.test(APP.replace(/\\'/g, "'")), true);

  /* Les deux autres chemins de mot de passe marquent aussi la campagne — sinon on la
     redemanderait à quelqu'un qui vient de la faire. */
  const mcs = extraire(APP, 'async function monComptePwdSave(');
  v('changer son mot de passe soi-même vaut la campagne', /currentUser\.secu=SECU_MDP;/.test(mcs), true);
  v('… et le retour en arrière l’emporte aussi', /secu:currentUser\.secu\}/.test(mcs), true);
  const pfs = extraire(APP, 'async function pwdForgotSave()');
  v('une réinitialisation par e-mail vaut la campagne', /u\.secu=SECU_MDP;/.test(pfs), true);
  /* ⚠️ ÉPINGLER UNE ACCOLADE, C'EST ÉPINGLER UNE LIGNE. Ce test cherchait `secu:u.secu}` :
     il est tombé le jour où l'état d'avant s'est mis à emporter AUSSI l'e-mail (v686, la porte
     de secours qui enregistre l'adresse de la personne) — donc le jour où la garantie s'est
     RENFORCÉE. On vérifie que le retour en arrière emporte les deux, sans dire dans quel ordre. */
  v('… et son retour en arrière aussi', /const avant=\{[^}]*secu:u\.secu/.test(pfs), true);
  v('⛔ … e-mail compris, depuis qu\'il peut être posé par ce chemin', /const avant=\{[^}]*email:u\.email/.test(pfs), true);

  /* ⛔ ET LES DEUX CHEMINS QUI CRÉENT UN MOT DE PASSE NEUF, pas seulement les trois qui en
     CHANGENT un. Oubliés à la première livraison, trouvés par `relecteur` : la toute première
     inscription d'une entreprise se voyait répondre, 600 ms après avoir choisi son mot de
     passe, « Sécurité — active ton accès : choisis un mot de passe DIFFÉRENT ». Ça ne bloquait
     pas — mais c'était le premier contact d'un client avec le produit. */
  v('⛔ la création du compte administrateur marque la campagne', /admin\.actif=true; admin\.secu=SECU_MDP;/.test(APP), true);
  v('⛔ le rattachement d’un compte teamop.fr aussi', /_site\.pwdHash=await sha256\(pin\); _site\.secu=SECU_MDP;/.test(APP), true);
}

/* ══ 2. L'E-MAIL : PLUS DE « PLUS TARD » ═══════════════════════════════════════════════ */
{
  const erm = extraire(APP, 'function emailRappelModal(');
  v('la fenêtre d’e-mail se marque forcée', /_modalForcee=true;/.test(erm), true);
  v('⛔ elle n’a plus de croix', /modal-close/.test(erm), false);
  v('⛔ elle n’a plus de « Plus tard »', /Plus tard/.test(erm), false);
  /* ⛔ ET ELLE NE RENONCE PLUS. Avant, une autre fenêtre ouverte la faisait abandonner pour
     toute la session — donc un compte sans e-mail passait au travers chaque fois qu'un autre
     message s'affichait, c'est-à-dire souvent. */
  v('⛔ elle repasse quand une autre fenêtre occupe l’écran', /setTimeout\(\(\)=>emailRappelModal\(n\),2500\)/.test(erm), true);
  v('… mais pas indéfiniment', /n<=8/.test(erm), true);
  /* ⚠️ UNE SORTIE, UNE SEULE : sur un téléphone partagé, quelqu'un connecté sur le compte d'un
     collègue serait sinon enfermé devant une fenêtre qui lui demande l'adresse d'un autre. */
  v('une seule sortie : se déconnecter', /onclick="logout\(\)"/.test(erm), true);
  const ers = extraire(APP, 'function emailRappelSave(');
  v('l’adresse est validée pour de bon', /\^\[\^@\\s\]\+@\[\^@\\s\]\+\\\.\[\^@\\s\]\+\$/.test(ers), true);
  v('⛔ et la fenêtre se dé-force avant de se fermer', /_modalForcee=false; closeModal\(\);/.test(ers), true);
  v('le verrou général tient toujours', /function closeModal\(force\)\{ if\(_modalForcee&&force!==true\) return;/.test(APP), true);
  v('la déconnexion lève le verrou', /_modalForcee=false; closeModal\(true\);/.test(APP), true);
}

/* ══ 3. CE QUE LA TOUR VOIT ════════════════════════════════════════════════════════════ */
{
  /* Côté application : deux booléens dans l'annuaire, et RIEN d'autre. */
  const dep = extraire(APP, 'async function annuaireDeposer()');
  const envois = (dep.match(/envoi\.push\(/g) || []).length;
  v('les deux chemins de dépôt envoient l’état', envois, 2);
  v('⛔ les DEUX portent p et m', (dep.match(/p:annuaireEtatP\(u\),m:annuaireEtatM\(u\)/g) || []).length, 2);
  /* ⛔ L'ADRESSE E-MAIL ELLE-MÊME NE SORT JAMAIS. L'annuaire est un annuaire de connexion ;
     une fuite de comptes.json ne doit pas devenir une fuite d'adresses. */
  v('⛔ l’adresse e-mail ne part pas dans l’annuaire', /envoi\.push\(\{[^}]*email/.test(dep), false);
  const etatM = new Function(extraire(APP, 'function annuaireEtatM(') + '; return annuaireEtatM;')();
  v('m vaut 1 quand une adresse existe', etatM({ email: 'a@b.fr' }), 1);
  v('m vaut 0 sans adresse', etatM({ email: '   ' }), 0);
  /* ⛔ LA SIGNATURE DOIT LES VOIR. Sans ça, quelqu'un qui vient de changer son mot de passe
     ne redéposerait rien — l'annuaire garderait « provisoire » pour toujours, et la Tour
     afficherait un état faux sans que personne comprenne pourquoi. */
  v('⛔ la signature d’annuaire compte l’état', /annuaireEtatP\(u\)\+annuaireEtatM\(u\)/.test(APP), true);

  /* Côté serveur : les clés sont posées MÊME À 0 — « fait » ne doit pas se confondre avec
     « déposé par une version qui ne savait pas répondre ». */
  v('le serveur garde p, même à 0', /if \(typeof c\.p !== 'undefined'\) table\[login\]\.p = c\.p \? 1 : 0;/.test(SRV), true);
  v('le serveur garde m, même à 0', /if \(typeof c\.m !== 'undefined'\) table\[login\]\.m = c\.m \? 1 : 0;/.test(SRV), true);
  const etatBool = new Function("return " + (SRV.match(/const etatBool = [^;]+;/) || [''])[0].replace(/^const etatBool = /, '').replace(/;$/, '') + ';')();
  v('⛔ un annuaire d’avant la v681 rend « on ne sait pas »', etatBool({ s: 'x' }, 'p'), null);
  v('… et non « tout va bien »', etatBool({ p: 0 }, 'p'), false);
  v('un compte encore provisoire est vu', etatBool({ p: 1 }, 'p'), true);

  /* ⛔ L'ÉTAT DES MOTS DE PASSE NE SORT QUE POUR LE PATRON. La route de dossier est sous
     `monAdmin`, donc un collaborateur de la Tour la lit aussi — et « encore sur le mot de passe
     provisoire » sur un compte qui a DÉJÀ servi est une information qu'il n'avait pas : le mot
     de passe provisoire se dérive du nom, et la route de connexion est publique. Signalé par
     `gardien`. On RETIRE les champs, on ne pose pas un drapeau que l'écran respecterait : un
     drapeau laisse l'information dans la réponse, il suffirait de la lire. */
  v('⛔ les champs sont retirés pour un non-patron',
    /if \(!voitEtat\) utilisateurs\.forEach\(u => \{ delete u\.provisoire; delete u\.mail; \}\);/.test(SRV), true);
  v('… et c’est bien le rôle patron qui ouvre', /const voitEtat = !!\(req\.tourUser && req\.tourUser\.role === 'patron'\);/.test(SRV), true);
  /* Le compte de départ d'un espace neuf : le serveur CONNAÎT la réponse (le vérificateur est
     dérivé du mot de passe provisoire), rendre « on ne sait pas » serait se taire par paresse. */
  v('le compte semé est marqué provisoire', /table\[login\] = \{ s: sel, e: d\.toString\('hex'\), n: '', p: 1, m: 0 \};/.test(SRV), true);

  /* Côté Tour : trois états à l'écran, et le « on ne sait pas » ne se peint pas en vert. */
  v('la Tour marque le mot de passe provisoire', /u\.provisoire===true\) p\+='<span class="past p-rouge"/.test(TOUR), true);
  v('… et le mot de passe changé', /u\.provisoire===false\) p\+='<span class="past p-vert"/.test(TOUR), true);
  v('… et l’absence d’e-mail', /u\.mail===false\) p\+='<span class="past p-ambre"/.test(TOUR), true);
  v('⛔ « on ne sait pas » n’est jamais peint en vert', /u\.provisoire\)\s*p\+='<span class="past p-vert"/.test(TOUR), false);
  v('le compte est résumé en tête de section', /encore sur le mot de passe provisoire/.test(TOUR), true);
}

/* ══ 4. L'APPARENCE SUIT LA PERSONNE ═══════════════════════════════════════════════════ */
{
  const cles = new Function('return ' + (APP.match(/const PREF_CLES=\{[^}]+\}/) || [''])[0].replace('const PREF_CLES=', '') + ';')();
  /* ⚠️ CE NOMBRE EST UNE DÉCISION, PAS UN CONSTAT. Chaque entrée de `PREF_CLES` est un réglage
     qui VOYAGE d'un appareil à l'autre avec la fiche de la personne. En ajouter un doit se
     voir ici, une fois, par écrit — sinon on ferait voyager par mégarde quelque chose qui doit
     rester sur l'appareil. La barre d'onglets a été ajoutée le 21 septembre 2026 : c'est un
     choix de personne (« mes quatre rubriques »), pas un état d'appareil.
     Le 22 septembre, deux de plus, et pour la même raison : les couleurs qu'on s'est
     fabriquées (« Ma couleur », jusqu'à six) et les rubriques qu'on a épinglées en tête de
     menu. Justin : « qu'on puisse bien aussi sauvegarder sa couleur par utilisateur ».
     ⛔ Ce qui NE doit PAS entrer ici : le brouillon de multitâche, le rendu forcé de la carte
     Appareil, le drapeau de vidage — ce sont des états d'APPAREIL. Les faire voyager les
     répandrait sur les téléphones de toute l'équipe.
     Le 21 septembre 2026, un huitième : le FOND DE CARTE (Jour / Nuit / Satellite). Il
     voyage pour la même raison que le thème, dont il est le pendant sur la carte — c'est un
     choix de lisibilité de la personne, pas une caractéristique de la machine. Il reste
     DOUBLÉ dans le rangement de l'appareil, pour que la carte s'ouvre juste avant même que
     la fiche du compte soit relue. */
  v('huit réglages voyagent', Object.keys(cles).sort(),
    ['accent', 'accentHex', 'accentsPerso', 'carte', 'favoris', 'lang', 'onglets', 'theme']);
  v('… et ce sont les vraies clés de stockage',
    [cles.theme, cles.accent, cles.accentHex, cles.accentsPerso, cles.lang, cles.onglets, cles.favoris, cles.carte],
    ['elan_theme', 'elan_accent', 'elan_accent_hex', 'elan_accents_perso', 'elan_lang', 'elan_onglets', 'elan_favoris', 'elan_carte']);

  /* La vraie fonction, éprouvée sur un faux stockage. */
  const mem = {};
  const faux = { getItem: k => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); } };
  const prefAppliquer = new Function('localStorage', 'PREF_CLES',
    extraire(APP, 'function prefAppliquer(') + '; return prefAppliquer;')(faux, cles);
  const fiche = { id: 'u1', pref: { theme: 'light', accent: 'purple', accentHex: '#7A5AF8', lang: 'fr' } };
  v('⛔ le thème choisi ailleurs arrive sur cet appareil', prefAppliquer(fiche), true);
  v('… et il est bien posé', [mem.elan_theme, mem.elan_accent, mem.elan_accent_hex], ['light', 'purple', '#7A5AF8']);
  v('un second passage ne change plus rien', prefAppliquer(fiche), false);
  v('une fiche sans réglage ne touche à rien', prefAppliquer({ id: 'u2' }), false);
  /* ⛔ ET SURTOUT : IL N'ÉCRIT PAS DANS LA BASE. Remonter les réglages de l'appareil vers la
     fiche au chargement, ce serait deux téléphones ouverts qui se repoussent leur thème à
     tour de rôle — et une écriture au seul chargement, ce que ce dépôt s'interdit. */
  const avant = JSON.stringify(fiche);
  prefAppliquer(fiche);
  v('⛔ appliquer n’écrit JAMAIS sur la fiche', JSON.stringify(fiche), avant);
  v('⛔ … et la fonction ne contient aucun save()', /save\(\)/.test(extraire(APP, 'function prefAppliquer(')), false);

  /* Les quatre points de saisie écrivent, eux — c'est un tap, pas un chargement. */
  v('le thème s’enregistre sur la fiche', /prefEcrire\('theme',p\)/.test(APP), true);
  v('la couleur aussi', /prefEcrire\('accent',a\)/.test(APP), true);
  v('la couleur personnalisée aussi', /prefEcrire\('accentHex',hex\); prefEcrire\('accent','custom'\)/.test(APP), true);
  v('la langue aussi', /prefEcrire\('lang',l\)/.test(APP), true);
  const pe = extraire(APP, 'function prefEcrire(');
  v('⛔ une valeur inchangée n’estampille pas la fiche', /if\(u\.pref\[cle\]===val\) return;/.test(pe), true);
  v('… et rien ne s’écrit sans personne connectée', /if\(!currentUser\|\|!PREF_CLES\[cle\]/.test(pe), true);
  /* Et les deux moments où on applique : l'ouverture de session, et l'arrivée d'une synchro. */
  v('appliqué à la connexion', /try\{ prefAppliquer\(u\); \}catch\(e\)\{\}/.test(APP), true);
  v('⛔ appliqué aussi quand la synchro apporte le changement d’un autre appareil',
    /try\{ if\(currentUser\) prefAppliquer\(currentUser\); \}catch\(e\)\{\}/.test(APP), true);
}

/* ══ 5. LE LIEN RAMÈNE À LA CONSIGNE ═══════════════════════════════════════════════════
   Ne s'exécute pas : c'est du balisage et un ordre d'insertion dans le DOM. La preuve
   fonctionnelle vit dans `scratchpad/sonde-cnx-page.js`, qui ouvre la vraie page dans les
   quatre états d'un téléphone (neuf, relié à une entreprise, resté sur l'espace par défaut,
   identifiant mémorisé) et compte les champs visibles. */
{
  const br = CNX.slice(CNX.indexOf('if(_esp&&!adr){'), CNX.indexOf('if(!_esp){ var lec='));
  /* ⛔ LE DÉFAUT EXACT : la bannière ÉCRASAIT le bloc de consigne (`b.innerHTML=…`), donc un
     téléphone déjà relié n'avait ni champ d'adresse ni consigne — alors que c'est précisément
     cette page qu'on donne à quelqu'un avec ses identifiants. */
  v('⛔ la bannière n’écrase plus le bloc de consigne', /b\.innerHTML=/.test(br), false);
  v('elle vit dans son propre bloc', /ban\.innerHTML=/.test(br), true);
  v('… posé AVANT la consigne', /insertBefore\(ban,b\)/.test(br), true);
  v('⛔ et la consigne reste affichée', /b\.style\.display='block';/.test(br), true);
  v('le texte d’aide parle à celui qui vient de recevoir ses identifiants', /On vient de te donner des identifiants/.test(br), true);
  /* Le bloc de consigne, lui, n'a pas bougé : c'est bien l'écran de la photo 2. */
  v('le titre de la consigne est intact', /<div class="titre">Comment te connecter \?<\/div>/.test(CNX), true);
  v('… et son champ d’adresse aussi', /id="adr-nom"/.test(CNX), true);
  v('« Changer d’entreprise » reste la sortie', /Changer d\\?'entreprise/.test(br), true);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
