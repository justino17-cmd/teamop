/* Génère beta.html — le canal d'essai isolé d'OP GESTION.
   Usage : node beta-build.js   (à relancer à chaque version à tester)
   La bêta a SES données locales (préfixe elanB_), SON espace de synchro par défaut
   (opgestion-beta) et un bandeau 🧪 BÊTA : elle ne touche jamais aux données
   de l'app réelle ni à celles des clients. Première connexion : admin / 1234.
   ⛔ L'espace s'appelait « elan-gestion-beta » jusqu'au 17 septembre 2026. Le renommer est
   sans danger POUR UNE SEULE RAISON, vérifiée et non supposée : la clé de chiffrement est
   dérivée de syncSecret() et SYNC_SALT, JAMAIS de l'identifiant d'espace (app.html,
   syncKey()). Renommer déplace donc le document Firestore sans rien rendre illisible.
   ⛔ ET CE RAISONNEMENT NE S'ÉTEND PAS À « elan-gestion » TOUT COURT : celui-là est le
   document PARTAGÉ de toutes les entreprises sans clé personnalisée. Le renommer les
   orphelinerait toutes d'un coup. */
const fs = require('fs');
let s = fs.readFileSync('app.html', 'utf8');
s = s.split("'elan_").join("'elanB_");
s = s.split('"elan_').join('"elanB_');
s = s.split("'op_devis_code'").join("'opB_devis_code'");
s = s.split("FB_TEAM='elan-gestion'").join("FB_TEAM='opgestion-beta'");
s = s.replace(/const APP_VERSION = '([0-9]+)'/, "const APP_VERSION = '$1-beta'");
/* ⛔ LA BÊTA PEUT PORTER UN NUMÉRO D'AVANCE SUR app.html (4 novembre 2026). Un correctif qui ne vit QUE dans ce générateur (le
   rattachement à la synchro, plus bas) change la bêta sans changer app.html : sans un numéro neuf, un appareil resté en 798-beta
   ne se mettrait jamais à jour (la bêta ne recharge que pour une version STRICTEMENT plus haute). Le plus grand des deux gagne :
   le jour où app.html dépasse ce nombre, il redevient la source, sans rien à toucher ici. */
const BETA_NUMERO = 805;
s = s.replace(/const APP_VERSION = '([0-9]+)-beta'/, (m, n) => "const APP_VERSION = '" + Math.max(parseInt(n, 10), BETA_NUMERO) + "-beta'");
/* ⛔ UN APPAREIL NEUF QUI OUVRE LA BÊTA REJOINT LA SYNCHRO DE LA BÊTA (Justin, 4 novembre 2026 : « sur mon compte bêta je ne vois pas
   ce que j'ai fait sur mon PC sur les autres appareils, mon téléphone ou mon Mac »). La bêta ne rattachait un appareil à son espace
   (`opgestion-beta`) que s'il portait DÉJÀ des traces de la bêta au premier chargement (`espaceHerite`, verdict gelé dans
   `elanB_repli_v1`) ou par un lien d'entreprise. La connexion bêta, elle, n'écrivait rien : un téléphone ou un Mac neuf restait
   sans espace (`syncEnabled()` faux), et travaillait seul — mesuré au navigateur, profil neuf : `syncTeam()` vide.
   Ici, une fois `/api/beta/login` ACCEPTÉ (jamais avant, jamais sur un refus), un appareil SANS espace rejoint celui de la bêta,
   avec la clé par défaut (SYNC_SECRET_DEFAULT, sa valeur n'est pas touchée), exactement ce que pose `espaceHerite`. Un appareil déjà
   rattaché (la bêta, ou une entreprise de test par son lien) ne change pas. `enterApp`, juste après, lance `syncInit()`.
   La production n'est pas concernée : ce bloc n'existe que dans beta.html. `tests/test-3253.js`. */
const BETA_LOGIN_OK = '    ub.pwdHash=h; ub.actif=true; ub.essai=true; delete ub.mustChangePwd; delete ub.pinHash; delete ub.sansMdp; save();';
if (s.split(BETA_LOGIN_OK).length !== 2) { console.error('ÉCHEC : la ligne de la connexion bêta acceptée doit être trouvée UNE fois dans app.html'); process.exit(1); }
s = s.split(BETA_LOGIN_OK).join(BETA_LOGIN_OK + "\n    try{ if(!syncTeam()){ localStorage.setItem('elanB_sync_team',FB_TEAM); localStorage.setItem('elanB_sync_secret',SYNC_SECRET_DEFAULT); localStorage.setItem('elanB_sync_on','1'); } }catch(_e){}   // beta-build.js : un appareil neuf rejoint la synchro de la bêta");
/* ⛔ v802 — LA BÊTA N'A QU'UN ESPACE : `opgestion-beta` (Justin, 5 novembre 2026 : « mon compte bêta ne synchronise toujours pas avec
   ce que j'ai fait sur les autres appareils »). Mesuré ce soir-là, en lecture seule sur api.teamop.fr : DEUX documents de bêta vivaient
   côte à côte. `elan-gestion-beta` (l'ancien nom, jusqu'au 17 septembre 2026) écrit à 23:38 UTC par une 801-beta (« teste », 2 devis,
   7 clients : le Mac), `opgestion-beta` écrit pour la dernière fois à 20:00 UTC (0 devis, 0 client). Le renommage n'avait JAMAIS migré
   les appareils déjà rattachés : leur `elanB_sync_team` gardait l'ancien nom, pour toujours ; et un appareil connecté avant la 799 ne
   repassait jamais par la connexion qui rattache. Les routes de boîte mail de la 801 n'acceptent que `opgestion-beta` : d'où « clé de
   l'entreprise non reconnue » dans la Boîte mail du Mac.
   Au démarrage, AVANT `espaceHerite` : un appareil sur l'ancien nom, ou sans espace mais avec une session bêta ouverte (connecté avant la 799,
   jamais repassé par la connexion qui rattache), passe d'office sur `opgestion-beta`, clé par défaut
   (la même clé que l'ancien espace : rien ne devient illisible). Sa base locale reste : la première synchro la RÉUNIT au document de la
   bêta (union par enregistrement, `fusionnerBases`), puis la renvoie — ce qu'il a fait n'est pas perdu, les autres appareils le voient.
   Un appareil rattaché à un AUTRE espace (une entreprise, par un lien) ne bouge pas tout seul : on ne mélange jamais les données d'une
   entreprise dans l'espace de la bêta, dont la clé est publique. `betaEspaceRejoindre()` le lui propose (Boîte mail, Paramètres), en
   partant de la base de la bêta, sans emporter la sienne. `tests/test-3258.js`. */
const HERITE = '(function espaceHerite(){ try{';
if (s.split(HERITE).length !== 2) { console.error('ÉCHEC : espaceHerite doit être trouvé UNE fois'); process.exit(1); }
s = s.split(HERITE).join("(function betaEspaceUnique(){ try{ const t=(localStorage.getItem('elanB_sync_team')||'').trim();\n"
  + "  let sess=false; try{ sess=!!(localStorage.getItem('elanB_session')||sessionStorage.getItem('elanB_session')); }catch(e){}\n"
  + "  if(t==='elan-gestion-beta'||(!t&&sess)){ localStorage.setItem('elanB_sync_team',FB_TEAM); if(!localStorage.getItem('elanB_sync_secret')) localStorage.setItem('elanB_sync_secret',SYNC_SECRET_DEFAULT);\n"
  + "    if(localStorage.getItem('elanB_sync_on')!=='0') localStorage.setItem('elanB_sync_on','1'); if(t) localStorage.setItem('elanB_espace_migre',t); }\n"
  + "}catch(e){} })();   // beta-build.js : un seul espace pour la bêta (voir le générateur)\n" + HERITE);
/* `betaEspaceAutre` et `betaEspaceRejoindre` vivent dans app.html (ESLint lit les noms de la page : test-818) ; seule la bêta les appelle. */

/* ⛔ LA BÊTA A SA VERSION MINIMALE À ELLE (Justin, 6 octobre 2026 : « qu'on sépare la version bêta et la version publique »).
   L'application demande `/api/version` ; la bêta demande `/api/version?canal=beta` — le minimum que la Tour pose sur la carte
   « Bêta » d'OP GESTION, jamais celui des clients (et inversement : exiger une bêta ne bloque aucun client). Un serveur d'avant
   ignore le paramètre et rend le minimum public, plus bas que tout numéro de bêta : rien ne casse pendant le déploiement.
   On exige UN appel trouvé, et on vérifie l'absence de l'ancien après coup : un appel de plus dans app.html, et la bêta lirait
   en silence le minimum des clients. */
const VER_AVANT = "fetch(PUSH_API+'/api/version',";
const nVer = s.split(VER_AVANT).length - 1;
if (nVer !== 1) { console.error('ÉCHEC : l\'appel à /api/version doit être trouvé UNE fois dans app.html, il l\'est ' + nVer + ' fois'); process.exit(1); }
s = s.split(VER_AVANT).join("fetch(PUSH_API+'/api/version?canal=beta',");
if (/PUSH_API\s*\+\s*'\/api\/version'/.test(s)) { console.error('ÉCHEC : la bêta lirait encore le minimum de la version publique'); process.exit(1); }
// La porte serveur : la bêta ne connaît aucun compte de départ et demande à api.teamop.fr
// avant d'ouvrir. Les accès se créent et se coupent depuis la Tour de contrôle (Accès bêta).
s = s.split("const BETA_ESSAI=false;").join("const BETA_ESSAI=true;");
// Sur la bêta, il n'y a ni entreprise à nommer ni espace à rejoindre : l'identifiant et le mot
// de passe viennent de la Tour, rien d'autre. On retire le champ « Entreprise » et le lien
// « changer d'entreprise » de l'écran de connexion — y taper un nom envoyait la page chercher
// une entreprise et expédier un lien de connexion à son adresse.
const ENT_AVANT = "${_surEspace?'':`<div class=\"field\"><label>Entreprise";
if (s.indexOf(ENT_AVANT) < 0) { console.error('ÉCHEC : le champ Entreprise de la connexion est introuvable'); process.exit(1); }
s = s.split(ENT_AVANT).join("${true?'':`<div class=\"field\"><label>Entreprise");
/* Le lien « Rejoindre un espace (code entreprise) » n'existe plus dans app.html depuis la v763 (Justin, 28 septembre 2026 :
   « que des liens pour les connexions ») : il ne reste que « changer d'entreprise », qu'on éteint ici comme avant. On
   vérifie l'ABSENCE de l'ancien lien : s'il revenait dans app.html, la bêta ne le cacherait plus. */
if (s.indexOf('teamopJoinPrompt') >= 0) { console.error('ÉCHEC : une entrée par code (teamopJoinPrompt) est revenue dans app.html'); process.exit(1); }
const LIEN_AVANT = '${(_surEspace&&_entNom)?`<div style="text-align:center;margin-top:14px"><a href="connexion.html?choix=1"';
if (s.indexOf(LIEN_AVANT) < 0) { console.error('ÉCHEC : le lien « changer d\'entreprise » de la connexion est introuvable'); process.exit(1); }
s = s.split(LIEN_AVANT).join('${false?`<div style="text-align:center;margin-top:14px"><a href="connexion.html?choix=1"');
/* On vérifie l'ABSENCE de la déclaration d'origine, pas la présence de la nouvelle. Chercher
   « const BETA_ESSAI=true; » n'importe où dans le fichier devenait creux : il suffisait qu'un
   commentaire de app.html cite cette ligne en exemple pour que l'assertion passe alors que le
   remplacement n'avait rien remplacé — la bêta serait partie identique à la production, sans
   porte serveur et sans outils, sans un mot d'avertissement. */
if (s.indexOf("const BETA_ESSAI=false;") >= 0) { console.error('ÉCHEC : la porte serveur de la bêta (BETA_ESSAI) n\'est pas armée — la déclaration d\'origine est toujours là'); process.exit(1); }
if (s.indexOf("const BETA_ESSAI=true;") < 0) { console.error('ÉCHEC : la porte serveur de la bêta (BETA_ESSAI) est absente'); process.exit(1); }
// La refonte (nouveau dessin ne du logo : sapin, menthe, diagonale) est ARMEE PAR LA BETA seule.
// app.html sert la v561 a tous les clients ; ici on pose data-refonte sur <html> et le bloc
// <style id="refonte-css"> prend la main. Un seul attribut separe les deux mondes.
// Depuis que la refonte est allumée en production, app.html porte DÉJÀ l'attribut. On ne le
// pose donc que s'il manque — sinon ce script échouait, ne trouvant plus « <html lang="fr"> »
// exactement, et la bêta ne se régénérait plus du tout.
if (s.indexOf('<html lang="fr" data-refonte>') >= 0) {
  /* rien à poser : la page source l'a déjà */
} else if (s.indexOf('<html lang="fr">') >= 0) {
  s = s.replace('<html lang="fr">', '<html lang="fr" data-refonte>');
} else { console.error('ÉCHEC : la balise <html> de la page est introuvable'); process.exit(1); }
s = s.replace(/<link rel="manifest"[^>]*>/, '');
/* La barre du haut ne porte QUE le nom — demande de Justin, 7 septembre 2026. Sur un
   téléphone il ne reste que 142 px entre le menu et les trois ronds, et « · 🧪 BÊTA » y
   mangeait la moitié du nom, tronqué en « OP GEST… ». Le repère de bêta ne disparaît pas
   pour autant : la couleur orange reste ici, la tête du menu affiche « BÊTA TESTE » en
   toutes lettres, l'écran de connexion aussi (ligne suivante), et l'adresse dit beta.html.
   Quatre marques valent mieux qu'une qui rend le nom illisible. */
s = s.split('<div class="topbar-brand mono">OP GESTION</div>').join('<div class="topbar-brand mono" style="color:var(--org)">OP GESTION</div>');
s = s.split('<h2>OP GESTION</h2>').join('<h2>OP GESTION <span style="font-size:12px;color:var(--org);vertical-align:middle">🧪 BÊTA</span></h2>');
if (s.indexOf("'elanB_gestion_v2'") < 0) { console.error('ÉCHEC : le stockage local de la bêta n\'est pas isolé (STORE_KEY)'); process.exit(1); }
if (s.indexOf("FB_TEAM='opgestion-beta'") < 0) { console.error('ÉCHEC : l\'espace de synchro bêta n\'est pas isolé (FB_TEAM)'); process.exit(1); }
/* ⛔ ET LA GARDE QUI COMPTE LE PLUS : le mot de passe et le sel de chiffrement CONTIENNENT
   « ELAN-GESTION » mais ne sont PAS des noms. Un renommage global les emporterait et rendrait
   les données de toutes les entreprises sans clé personnalisée définitivement illisibles, sur
   tous leurs appareils à la fois. Le générateur refuse de produire une bêta qui les aurait
   perdus — c'est la dernière barrière avant un fichier publié. */
if (s.indexOf("SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'") < 0) { console.error('ÉCHEC : SYNC_SECRET_DEFAULT a été modifié — c\'est le MOT DE PASSE de chiffrement, pas un nom'); process.exit(1); }
if (s.indexOf("SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE='") < 0) { console.error('ÉCHEC : SYNC_SALT a été modifié — c\'est le SEL de chiffrement, pas un nom'); process.exit(1); }
// Sortie par défaut : beta.html. Un chemin en argument sert au canal d'aperçu
// (scripts/apercu.sh), qui veut la même isolation des données sous /apercu/.
// La route PROPOSE du serveur exécute ce fichier dans un bac à sable dont le faux
// `process` n'a que exit() : on ne suppose jamais argv.
const sortie = (process.argv && process.argv[2]) || 'beta.html';

/* ⛔ GARDE DE NON-RÉGRESSION DE VERSION — posée le 17 septembre 2026, après l'avoir déclenchée
   pour de vrai pendant une vérification.
   La bêta publiée est souvent EN AVANCE sur `app.html` de `main` : c'est tout son rôle, elle
   est le canal d'essai. Le soir du renommage, beta.html servait la 701 alors que l'app.html de
   `main` était encore en 695. Lancer `node beta-build.js` depuis `main` a donc produit une
   695-beta et ÉCRASÉ la 701 — sans un mot, sans une erreur. Vu et restauré ce jour-là parce
   qu'un `cmp` traînait dans la commande ; la fois suivante, ça part en production.
   Le générateur refuse donc d'écrire une bêta dont le numéro est INFÉRIEUR à celle qu'il
   remplace. Revenir en arrière reste possible, mais il faut le VOULOIR : `BETA_RETROGRADER=1`.

   ⚠️ ET LA ROUTE PROPOSE DU SERVEUR NE DOIT PAS TOMBER DESSUS. Elle exécute ce fichier dans un
   bac à sable (server/index.js, `betaDepuis`) pour fabriquer une bêta candidate à partir d'une
   app corrigée — donc souvent d'une version plus basse que celle du dépôt. Deux raisons de la
   laisser passer, et la seconde suffirait seule : son faux `process` n'a QUE `exit()`, donc
   `process.env` est `undefined` ; et son faux `writeFileSync` ne touche jamais le disque, il
   capte la sortie en mémoire pour une pull request. Il n'y a rien à y rétrograder.
   ⚠️ Le faux `fs` n'a pas non plus `existsSync` : on lit dans un try/catch, jamais autrement. */
if (process.env && !process.env.BETA_RETROGRADER) {
  let ancienne = '';
  try { ancienne = String(fs.readFileSync(sortie, 'utf8')); } catch (e) { /* premier passage : rien à comparer */ }
  const numero = (t) => { const m = /APP_VERSION = '(\d+)/.exec(t || ''); return m ? parseInt(m[1], 10) : 0; };
  const vNeuve = numero(s), vAncienne = numero(ancienne);
  if (vAncienne && vNeuve < vAncienne) {
    console.error('ÉCHEC : refus d\'écrire ' + sortie + ' en v' + vNeuve + ' par-dessus une v' + vAncienne + '.'
      + ' La bêta publiée est plus récente que l\'app.html de cette branche — tu es probablement sur main'
      + ' alors que la bêta vient de la branche de travail. Si le retour en arrière est voulu :'
      + ' BETA_RETROGRADER=1 node beta-build.js');
    process.exit(1);
  }
}
fs.writeFileSync(sortie, s);
console.log(sortie + ' générée (' + Math.round(s.length / 1024) + ' Ko) — version ' + (s.match(/APP_VERSION = '([^']+)'/) || [])[1]);
