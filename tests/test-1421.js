/* ══ OP MESSAGES — AUCUNE PHRASE NE RENVOIE VERS « RÉGLAGES » : LA RUBRIQUE S'APPELLE PROFIL (lot m05 : reglages#5, pro#1) ══════════════════════════════
   Les réglages ont été rangés dans le Profil (rubriques « Confidentialité », « Entreprise et abonnement » — avec « Gérer l'abonnement »). Mais quatre phrases de la page et trois du
   client du service (`api.js`) disaient encore « Réglages › Confidentialité » ou « Réglages › Abonnement » : un chemin qui n'existe nulle part.
   Ce banc LIT les chemins que les phrases citent dans le CODE (jamais dans un commentaire : les blocs qui COMMENCENT une ligne sont retirés avant de chercher) :
     · toutes les phrases d'`api.js` (la table `MESSAGES` exécutée, pas son texte) et le code de la page et de `source-serveur.js` : aucune ne dit « Réglages › » ni « Réglages > » ;
     · la VRAIE `phraseEspace` de la page est exécutée (impayé, formule perso) ; les erreurs de l'espace (`places_epuisees`, `abonnement_actif`, `paiement_en_cours`) sont lues dans la vraie table ;
     · la note sous « Mon identifiant » nomme « Profil › Confidentialité » ;
     · (population) chaque chemin cité existe sur l'écran : la rubrique « Confidentialité » et « Entreprise et abonnement » sont déclarées dans Profil, avec le bouton « Gérer l'abonnement ».
   ⛔ Une absence se prouve sur une population : le nombre de phrases lues et de chemins « Profil › … » trouvés est compté avant de croire un zéro. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const sansCommentairesJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function extraire(src, entete) {
  const i = src.indexOf(entete); if (i < 0) return '';
  let n = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') n++; else if (c === '}') { n--; if (!n) break; } }
  return src.slice(i, j + 1);
}
const API = require(path.join(RACINE, 'server-msg', 'public', 'api.js'));
const PAGE = lire('apercu/opmessages/index.html'), SCRIPT = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1], JS = sansCommentairesJs(SCRIPT);
const SERVJS = sansCommentairesJs(lire('server-msg/public/source-serveur.js'));
const APIJS = sansCommentairesJs(lire('server-msg/public/api.js'));
const PERIME = /Réglages\s*[›>]/;

console.log('\nLes phrases du client du service (api.js)');
{
  const toutes = Object.entries(API.MESSAGES);
  vrai('(population) la table `MESSAGES` est lue (' + toutes.length + ' phrases) et porte les trois refus d\'abonnement', toutes.length > 100 && ['places_epuisees', 'abonnement_actif', 'paiement_en_cours'].every(k => typeof API.MESSAGES[k] === 'string'));
  v('⛔ aucune phrase de la table ne renvoie vers « Réglages › … » (la rubrique s\'appelle Profil)', toutes.filter(([, t]) => PERIME.test(t)).map(([k]) => k), []);
  v('⛔ « ajouter des places » mène à Profil › Entreprise et abonnement › Gérer l\'abonnement', /\(Profil › Entreprise et abonnement › Gérer l'abonnement\)/.test(API.MESSAGES.places_epuisees), true);
  v('⛔ « résilier avant de supprimer l\'espace » mène au même endroit', /\(Profil › Entreprise et abonnement › Gérer l'abonnement\)/.test(API.MESSAGES.abonnement_actif), true);
  v('⛔ « J\'ai réglé — vérifier » est cité avec son chemin réel : Profil › Entreprise et abonnement', /« J'ai réglé — vérifier » \(Profil › Entreprise et abonnement\)/.test(API.MESSAGES.paiement_en_cours), true);
  vrai('le code d\'api.js (hors commentaires) ne cite plus « Réglages › » (population : le fichier est lu, ' + APIJS.length + ' caractères)', APIJS.length > 20000 && !PERIME.test(APIJS));
}

console.log('\nLes phrases de la page');
{
  vrai('(population) le code de la page est lu (' + JS.length + ' caractères) et celui de source-serveur.js (' + SERVJS.length + ')', JS.length > 200000 && SERVJS.length > 50000);
  v('⛔ le code de la page ne cite plus « Réglages › … » ni « Réglages > … » dans une phrase', (JS.match(/[^\n]{0,60}Réglages\s*[›>][^\n]{0,30}/g) || []).map(s => s.trim()), []);
  v('le code de source-serveur.js non plus', (SERVJS.match(/[^\n]{0,60}Réglages\s*[›>][^\n]{0,30}/g) || []).length, 0);
  vrai('⛔ la note sous « Mon identifiant » dit où se coupe « Me trouver par mon identifiant » : Profil › Confidentialité', /« Me trouver par mon identifiant » se coupe dans Profil › Confidentialité\./.test(JS));

  const code = extraire(SCRIPT, 'function phraseEspace(e, defaut)');
  vrai('(population) `phraseEspace` est trouvée (' + code.length + ' caractères)', code.length > 300);
  const ctx = { phrase: (e, d) => (e && e.message) || d, euros: n => n + ' €' };
  vm.createContext(ctx);
  let f = null;
  try { vm.runInContext(code + '\nthis.f = phraseEspace;', ctx, { timeout: 1000 }); f = ctx.f; } catch (e) { f = null; }
  vrai('(population) `phraseEspace` s\'exécute', typeof f === 'function');
  if (f) {
    const impaye = f({ code: 'formule_requise', raison: 'impaye', message: 'Cette fonction fait partie de Messages Pro.' }, 'x');
    const perso = f({ code: 'formule_requise', raison: 'perso', message: 'Cette fonction fait partie de Messages Pro.' }, 'x');
    vrai('⛔ espace impayé : « règle-le (Profil › Entreprise et abonnement) pour les retrouver »', /règle-le \(Profil › Entreprise et abonnement\) pour les retrouver/.test(impaye) && !PERIME.test(impaye), impaye);
    vrai('⛔ espace sans abonnement : « (Profil › Entreprise et abonnement) »', /abonnement Messages Pro \(Profil › Entreprise et abonnement\)\./.test(perso) && !PERIME.test(perso), perso);
  }

  console.log('\nLes chemins cités existent à l\'écran');
  vrai('(population) Profil déclare « Confidentialité » et « Entreprise et abonnement » (lignes ET rubriques), avec le bouton « Gérer l\'abonnement »',
    /regLigne\('confidentialite', [^)]*'Confidentialité'\)/.test(JS) && /regSection\('confidentialite', 'Confidentialité'/.test(JS)
    && /regLigne\('entreprise', [^)]*'Entreprise et abonnement'\)/.test(JS) && /regSection\('entreprise', 'Entreprise et abonnement'/.test(JS) && /data-act="abo-portail"><span class="reglage-texte">Gérer l\\'abonnement</.test(JS));
  const chemins = new Set([...(JS + APIJS).matchAll(/Profil › [A-Za-zéèÉ ’']+?(?= ›|\)|\.|,)/g)].map(m => m[0].trim()));
  vrai('(population) les chemins « Profil › … » cités sont trouvés (' + [...chemins].join(' | ') + ')', chemins.size >= 2 && chemins.has('Profil › Confidentialité') && chemins.has('Profil › Entreprise et abonnement'));
}
fin();
