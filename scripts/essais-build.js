#!/usr/bin/env node
/* ══ LES PAGES DE L'ESPACE DE TEST — test.teamop.fr ══════════════════════════════════════════════════════════════════════════════
   Justin, 23 octobre 2026 : « toute modification, site, application, la Tour, je veux des espaces de test, et après on pousse ;
   chaque test expliqué dans un ordre ». Ce fichier FABRIQUE les pages de l'espace de test à partir des VRAIS fichiers du dépôt :

     node scripts/essais-build.js <dossier> <commit> <branche> [--config <config.json>] [--parcours <parcours.json>]

   · <dossier> : écrit SEULEMENT là (absent ou vide ; jamais la racine du dépôt ni un de ses parents). Le dépôt n'est pas touché.
   · la clé des routes d'essais (`espaceTestCle`, 64 hexadécimaux) se lit dans la config du serveur de test (--config, ou la variable
     TEAMOP_CONFIG) ou, pour un banc, dans ESSAIS_CLE. ⛔ Elle n'est écrite NULLE PART dans le dépôt et n'est jamais affichée : elle ne
     vit que dans essais.html et courriels.html du dossier produit, derrière l'authentification des pages (nginx, auth_basic).
   · --parcours (ou ESSAIS_PARCOURS) : un fichier JSON [{titre, quoi, attendu, lien?}] — les tests de CETTE modification, dans l'ordre,
     affichés AVANT le parcours de base sur essais.html. C'est ce qui répond à « chaque test expliqué dans un ordre ».
   · ESSAIS_RACINE : une autre racine de dépôt (les bancs y retirent un motif pour voir la fabrication échouer).

   ⛔ LA RÈGLE QUI COMMANDE TOUT : UNE PAGE DE TEST QUI ÉCRIRAIT DANS LES DONNÉES DE PRODUCTION EST LE PIRE DÉFAUT POSSIBLE. Chaque
   remplacement est donc GARDÉ (le motif doit être trouvé le nombre de fois attendu, sinon la fabrication échoue — un remplacement qui ne
   trouve rien ne coupe rien, en silence), et une dernière passe relit TOUT ce qui sort : si une adresse de production subsiste, rien
   n'est livré (le dossier est vidé).

   Inventaire de ce qui vise la production, page par page — remplacé vers le test, coupé, ou laissé, et pourquoi :
   ┌─────────────────────────────────────────────┬───────────┬─────────────────────────────────────────────────────────────────────┐
   │ https://api.teamop.fr (toutes les pages)    │ REMPLACÉ  │ → https://test.teamop.fr : même origine que les pages, pas de CORS  │
   │ https://teamop.fr, https://www.teamop.fr    │ REMPLACÉ  │ liens de connexion, de paiement, de la Tour : on reste dans l'essai │
   │ « teamop.fr/e/… », « teamop.fr/app.html… »  │ REMPLACÉ  │ l'adresse que la Tour écrit dans le courriel au client              │
   │ api.teamop.fr nu (messages du sentinelle)   │ REMPLACÉ  │ le texte dit la vérité sur le serveur joint                         │
   │ (www\.)?teamop\.fr dans les expressions     │ ÉLARGI    │ les pages reconnaissent aussi test.teamop.fr (suite, adresse collée)│
   │ clés « elan_ » (app, connexion, recap)      │ REMPLACÉ  │ → « elanT_ » : jamais la base d'une vraie entreprise                │
   │ 'op_devis_code' (app)                       │ REMPLACÉ  │ → 'opT_devis_code'                                                  │
   │ FB_TEAM de l'espace de repli (app)          │ REMPLACÉ  │ → 'opgestion-test' : jamais le document « elan-gestion »            │
   │ APP_VERSION (app)                           │ SUFFIXÉ   │ « -essai » (jamais « beta » : les outils de la bêta restent fermés) │
   │ service worker (toutes les pages)           │ COUPÉ     │ l'inscription est refusée ; sw.js n'est même pas copié             │
   │ manifeste de l'application installable      │ COUPÉ     │ on n'installe pas un espace de test sur un téléphone                │
   │ Google Analytics (cookies.js)               │ COUPÉ     │ une visite d'essai ne compte pas dans les statistiques du site      │
   │ price_… Stripe (recap-abonnement.html)      │ REMPLACÉ  │ → les tarifs de TEST (`stripe.prixEssai` de la config de test), les 10│
   │                                             │ ou LAISSÉ │   ou, sans table complète, LAISSÉS : le paiement n'est alors pas    │
   │                                             │           │   jouable et essais.html le DIT (voir plus bas)                     │
   │ courrier-beta.teamop.fr (Tour)              │ COUPÉ     │ → un nom qui ne se résout jamais (.invalid) : le jeton d'essai ne   │
   │                                             │           │   part pas chez un autre service, la Tour dit « injoignable »        │
   │ msg-beta.teamop.fr (Tour, adresse de lien)  │ COUPÉ     │ idem — OP MESSAGES a son propre serveur (CLAUDE.md), pas rebranché  │
   │ dashboard.stripe.com (Tour)                 │ → /test/  │ les liens ouvrent le tableau de bord Stripe en mode TEST            │
   │ demo.html                                   │ COPIÉE    │ elle n'a déjà aucun réseau (CSP) ; préfixe elanD_ propre            │
   │ polices Google, OSM, OSRM, géoportail,      │ LAISSÉ    │ services publics en LECTURE : aucune donnée de TeamOP n'y est écrite │
   │ adresse.data.gouv.fr, jsDelivr, unpkg,      │           │                                                                     │
   │ dicebear, blog.teamop.fr, liens d'aide      │           │                                                                     │
   │ api.anthropic.com (app, clé de l'utilisateur)│ LAISSÉ   │ l'appel part avec la clé que la personne y saisit, jamais la nôtre  │
   │ adresses « @teamop.fr » (texte, mailto)     │ LAISSÉ    │ du texte ; en essai les courriels sont captés, rien ne part         │
   │ beta.html, dev.html, messages*.html         │ ABSENTES  │ autres canaux (bêta, OP MESSAGES fermé), diag-geste, google…html    │
   └─────────────────────────────────────────────┴───────────┴─────────────────────────────────────────────────────────────────────┘
   ⛔ LE PAIEMENT SE JOUE (carte 4242) SEULEMENT SI LES DEUX MOITIÉS TIENNENT ENSEMBLE. `recap-abonnement.html` envoie à
   `POST /api/stripe/checkout` un identifiant `price_…` de la table de la page, et le serveur n'accepte que les MÊMES (`STRIPE_PRIX_FORMULE`,
   index.js). Les identifiants de production sont des tarifs créés en mode réel, que Stripe ne connaît pas avec une clé `sk_test`
   (« No such price »). `server/stripe-essai-prix.js` crée donc chez Stripe, en mode test, les dix tarifs équivalents et écrit la table
   `stripe.prixEssai` { price_ de production → price_ de test } dans la config de test ; le serveur de test (seulement `espaceTest`)
   remplace ses identifiants par ceux-là, et ce fabricant remplace les mêmes dans la page. ⚠️ Remplacer d'un seul côté donnerait
   `tarif_inconnu` : une demi-mesure qui change le message d'erreur sans rendre le paiement jouable. C'est pourquoi `PAIEMENT_JOUABLE`
   n'est PAS un réglage : il n'est vrai que si la config porte la table COMPLÈTE (les dix identifiants de la page, chacun avec un
   correspondant valide, distinct, qui n'est jamais un tarif de production). Sinon rien n'est remplacé, la page garde ses tarifs de
   production et essais.html dit la limite. La dernière passe refuse de livrer si, le paiement étant déclaré jouable, un `price_` de
   production subsiste quelque part, ou si un tarif de test manque dans la page de paiement.
   ⚠️ Firebase n'existe plus dans app.html (plus aucun script gstatic ni googleapis) : la synchro passe par le serveur de test, qui n'a
   pas de clé d'administration Google. `FB_TEAM` est tout de même isolé, comme beta-build.js isole l'espace bêta.
   ⚠️ Une origine par environnement : les pages d'essai vivent sur test.teamop.fr, donc leur localStorage n'est PAS celui de teamop.fr
   (le navigateur sépare les origines). Les préfixes sont une seconde ceinture, pas la seule. */
'use strict';
const fs = require('fs'), path = require('path');

const RACINE = path.resolve(process.env.ESSAIS_RACINE || path.join(__dirname, '..'));
const HOTE = 'test.teamop.fr';

function echec(m) { console.error('ÉCHEC : ' + m); process.exit(1); }

/* ── les arguments ─────────────────────────────────────────────────────────────────────────────────────────────────────────────── */
const argv = process.argv.slice(2);
function option(nom) { const i = argv.indexOf(nom); if (i < 0) return ''; const v = argv[i + 1]; argv.splice(i, 2); return v || ''; }
const CONFIG = option('--config') || process.env.TEAMOP_CONFIG || '';
const PARCOURS = option('--parcours') || process.env.ESSAIS_PARCOURS || '';
const [SORTIE_ARG, COMMIT, BRANCHE] = argv;
if (!SORTIE_ARG || !COMMIT || !BRANCHE) echec('usage : node scripts/essais-build.js <dossier> <commit> <branche> [--config <config.json>] [--parcours <parcours.json>]');
if (!/^[0-9a-f]{7,40}$/.test(COMMIT)) echec('le commit doit être un SHA hexadécimal (7 à 40 signes), reçu : ' + COMMIT.slice(0, 50));
if (!/^[A-Za-z0-9._\/+-]{1,120}$/.test(BRANCHE)) echec('le nom de la branche ne porte pas que des signes de nom de branche git');
const SORTIE = path.resolve(SORTIE_ARG);

/* La clé des routes d'essais. Jamais affichée. */
function lireCle() {
  let cle = process.env.ESSAIS_CLE || '';
  if (!cle) {
    if (!CONFIG) echec('la clé d\'essais est introuvable : donner --config <config du serveur de test> (ou TEAMOP_CONFIG), ou ESSAIS_CLE pour un banc');
    let j; try { j = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch (e) { echec('la config de test est illisible (' + path.basename(CONFIG) + ') : ' + e.message.slice(0, 80)); }
    if (j.espaceTest !== true) echec('cette config n\'est pas celle d\'un serveur de test (espaceTest absent) — les pages d\'essai ne se fabriquent pas pour la production');
    cle = String(j.espaceTestCle || '');
  }
  if (!/^[0-9a-f]{64}$/.test(cle)) echec('la clé d\'essais doit être 64 hexadécimaux (espaceTestCle)');
  return cle;
}
const CLE = lireCle();

/* Le dossier : absent ou vide, et jamais la racine du dépôt ni un dossier qui la contient (on n'écrit pas par-dessus le dépôt). */
{
  const rel = path.relative(SORTIE, RACINE);
  if (rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel))) echec('le dossier de sortie ne peut pas être la racine du dépôt ni un de ses parents');
  if (fs.existsSync(SORTIE) && fs.readdirSync(SORTIE).length) echec('le dossier de sortie n\'est pas vide : ' + path.basename(SORTIE) + ' (on fabrique dans un dossier neuf, puis on bascule)');
  fs.mkdirSync(SORTIE, { recursive: true });
}

const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const journal = [];   // ce que la fabrication a changé, page par page (affiché à la fin, jamais la clé)

/* ── les garde-fous de remplacement ───────────────────────────────────────────────────────────────────────────────────────────── */
let COURANT = '';
function remplacer(s, nom, avant, apres, attendu) {
  const n = s.split(avant).length - 1;
  const bon = attendu === 'plusieurs' ? n >= 1 : n === (attendu === undefined ? 1 : attendu);
  if (!bon) echec(COURANT + ' · ' + nom + ' : le motif doit être trouvé ' + (attendu === 'plusieurs' ? 'au moins une' : (attendu === undefined ? 1 : attendu)) + ' fois, il l\'est ' + n + ' fois');
  journal.push(COURANT + ' · ' + nom + ' ×' + n);
  return s.split(avant).join(apres);
}
/* idem avec une expression régulière (g) ; `min` : au moins ce nombre de remplacements, 0 = facultatif */
function remplacerRe(s, nom, re, fn, min) {
  let n = 0;
  const r = s.replace(re, function () { n++; return typeof fn === 'function' ? fn.apply(null, arguments) : fn; });
  if (n < (min === undefined ? 1 : min)) echec(COURANT + ' · ' + nom + ' : ' + n + ' remplacement(s), il en fallait au moins ' + (min === undefined ? 1 : min));
  if (n) journal.push(COURANT + ' · ' + nom + ' ×' + n);
  return r;
}

/* ── les pages à fabriquer ────────────────────────────────────────────────────────────────────────────────────────────────────── */
const ABSENTES = {
  'beta.html': 'la bêta est un canal à part (beta-build.js), ses comptes viennent de la Tour de production',
  'dev.html': 'canal bêta de développement',
  'messages.html': 'OP MESSAGES : son propre serveur, application fermée (CLAUDE.md)',
  'messages-beta.html': 'OP MESSAGES : son propre serveur, application fermée (CLAUDE.md)',
  'diag-geste.html': 'outil de diagnostic de développement',
  'google151be914dcdfaf7e.html': 'preuve de propriété du domaine pour Google : n\'a de sens que sur teamop.fr',
};
const PAGES = fs.readdirSync(RACINE).filter(f => /\.html$/.test(f) && !ABSENTES[f]).sort();
['index.html', 'espace.html', 'connexion.html', 'reinit.html', 'recap-abonnement.html', 'merci.html', 'tour.html', 'app.html', 'demo.html', '404.html', 'mentions-legales.html']
  .forEach(f => { if (PAGES.indexOf(f) < 0) echec('la page ' + f + ' manque à la racine du dépôt'); });

/* ── le petit script injecté : il lit #essai=<base64url d'un JSON> ─────────────────────────────────────────────────────────────── */
/* Contrat avec GET /api/essais/connexion : {"stockage":{clé:valeur}, "session":{clé:valeur}, "page":"espace.html"}.
   · « stockage » va dans localStorage, « session » (facultatif) dans sessionStorage ;
   · les clés passent par une LISTE FERMÉE (`CLES_STOCKAGE`, `CLES_SESSION`, ci-dessous), les valeurs sont des textes (un objet est mis en JSON) : un fragment forgé ne peut
     pas écrire n'importe quoi ni rediriger hors du site ;
   · le fragment est EFFACÉ avant tout (un jeton ne reste ni dans l'historique ni dans un lien copié), puis la page se recharge, ou va à
     `page` (un chemin du site, jamais une adresse complète) ;
   · il est posé EN TÊTE du <head> : il passe avant tous les scripts de la page, qui lisent le stockage à leur démarrage.
   Injecté par ce build, jamais dans les vraies pages. */
/* ⛔ UNE LISTE FERMÉE, PAS UNE FORME (relecture adverse, 23 octobre 2026) : un motif de forme laissait ranger `tour_token`, `tour_role`
   ou toute la base de l'application (`elanT_gestion_v2`) à qui forgeait un lien `#essai=…` — la Tour de la victime s'ouvrait sur une
   session choisie par l'envoyeur. Seules les clés qu'une connexion d'essai DOIT poser passent, séparément pour localStorage et
   sessionStorage (la Tour lit `tour_*` dans l'un puis dans l'autre). Les clés sont celles que lisent les vraies pages (espace.html :
   `teamop_portail_jeton`, `tour_*` ; connexion.html : `teamop_app`, `elan_sync_team`/`elan_entreprise_nom`/`elan_savedLogin` devenues
   `elanT_…` par ce build). `elanT_gestion_v2` (la base de l'application) n'y est PAS : une session d'essai ne fabrique pas de données. Une
   clé que la route de connexion du serveur de test voudrait poser et qui manque ici se lit dans la console (« clés refusées »). */
const CLES_STOCKAGE = ['teamop_portail_jeton', 'teamop_app', 'tour_token', 'tour_nom', 'tour_role', 'tour_apps', 'elanT_sync_team', 'elanT_entreprise_nom', 'elanT_savedLogin'];
const CLES_SESSION = ['tour_token', 'tour_nom', 'tour_role', 'tour_apps', 'tour_email'];
/* LES TARIFS DE TEST (`stripe.prixEssai`, écrits par server/stripe-essai-prix.js). Les identifiants de production viennent de la VRAIE page
   de paiement (pas d'une liste écrite ici, qui vieillirait). La table est complète ou elle n'est pas : une table à moitié posée remplacerait
   une partie des tarifs et laisserait l'autre au serveur de production — le pire des deux mondes. */
const PRIX_PROD_PAGE = Array.from(new Set(lire('recap-abonnement.html').match(/price_[A-Za-z0-9]{8,}/g) || []));
function lirePrixEssai() {
  if (!CONFIG) return null;
  let j; try { j = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch (e) { return null; }
  if (!j || j.espaceTest !== true) return null;
  const t = j.stripe && j.stripe.prixEssai;
  if (t === undefined || t === null) return null;
  const dire = m => { console.warn('avertissement : stripe.prixEssai ' + m + ' — aucun tarif n\'est remplacé, le paiement n\'est pas jouable (relance : bash install-test.sh stripe)'); return null; };
  if (typeof t !== 'object' || Array.isArray(t)) return dire('n\'est pas une table');
  if (!PRIX_PROD_PAGE.length) return dire('ne peut pas être vérifiée : la page de paiement ne porte aucun tarif price_…');
  const table = {};
  for (const id of PRIX_PROD_PAGE) {
    const v = Object.prototype.hasOwnProperty.call(t, id) ? t[id] : undefined;
    if (typeof v !== 'string' || !/^price_[A-Za-z0-9]+$/.test(v)) return dire('est incomplète ou mal formée (un tarif de la page n\'a pas de correspondant valide)');
    table[id] = v;
  }
  const test = Object.values(table);
  if (new Set(test).size !== test.length) return dire('donne le même tarif de test à deux tarifs de production');
  if (test.some(v => PRIX_PROD_PAGE.some(p => v.indexOf(p) >= 0))) return dire('prend un tarif de production pour un tarif de test');
  return table;
}
const PRIX_ESSAI = lirePrixEssai();
const PAIEMENT_JOUABLE = PRIX_ESSAI !== null;   // vrai SEULEMENT si la config de test porte la table complète (voir l'inventaire)
const SCRIPT_ESSAI = `<script id="essai-fragment">(function(){try{
var h=location.hash||'';if(h.indexOf('#essai=')!==0)return;
var corps=h.slice(7);history.replaceState(null,'',location.pathname+location.search);
var b=corps.replace(/-/g,'+').replace(/_/g,'/');while(b.length%4)b+='=';
var bin=atob(b),oct=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)oct[i]=bin.charCodeAt(i);
var j=JSON.parse(new TextDecoder().decode(oct));
if(!j||typeof j!=='object')return;
var OK_LS=${JSON.stringify(CLES_STOCKAGE)},OK_SS=${JSON.stringify(CLES_SESSION)},refus=[];
function ranger(st,o,ok){if(!o||typeof o!=='object')return 0;var n=0;
 Object.keys(o).slice(0,60).forEach(function(k){
  if(ok.indexOf(k)<0){refus.push(k);return;}
  var v=o[k];v=(typeof v==='string')?v:JSON.stringify(v);
  if(v==null||v.length>60000)return;
  try{st.setItem(k,v);n++;}catch(e){}});
 return n;}
try{ranger(localStorage,j.stockage,OK_LS);}catch(e){}
try{ranger(sessionStorage,j.session,OK_SS);}catch(e){}
if(refus.length){try{console.warn('essai : clés refusées (hors liste)',refus.join(','));}catch(_){}}
var p=typeof j.page==='string'?j.page:'';
if(/^[A-Za-z0-9_][A-Za-z0-9_.\\/-]{0,80}(\\?[A-Za-z0-9_=&%.-]{0,200})?$/.test(p)&&p.indexOf('..')<0&&p.indexOf('//')<0){location.replace('/'+p);}
else{location.reload();}
}catch(e){try{console.warn('essai : fragment illisible',e&&e.message);}catch(_){}}})();</script>`;

function bandeau() {
  return '<div id="essai-bandeau" role="note" style="position:fixed;left:6px;bottom:6px;z-index:2147483000;pointer-events:none;'
    + 'font:700 10.5px/1.25 -apple-system,system-ui,\'Segoe UI\',Roboto,sans-serif;letter-spacing:.04em;color:#fff;background:rgba(160,92,8,.93);'
    + 'padding:4px 9px;border-radius:99px;box-shadow:0 2px 10px rgba(0,0,0,.28);max-width:calc(100vw - 12px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'
    + 'ESPACE DE TEST — ' + esc(BRANCHE) + ' · ' + esc(COMMIT.slice(0, 7)) + '</div>';
}

/* ── la transformation commune à TOUTES les pages ─────────────────────────────────────────────────────────────────────────────── */
function communes(s, opts) {
  const o = opts || {};
  /* 1. les adresses de production → le test. L'ordre compte : www avant nu. */
  s = s.split('https://api.teamop.fr').join('https://' + HOTE);
  s = s.split('https://www.teamop.fr').join('https://' + HOTE);
  s = s.split('https://teamop.fr').join('https://' + HOTE);
  /* « teamop.fr/e/nom » et co. écrits sans schéma (l'adresse que la Tour met dans le courriel au client) */
  s = s.replace(/(^|[^A-Za-z0-9.@\/_-])teamop\.fr(?=\/(?:e\/|app\.html|beta\.html|connexion\.html|espace\.html|recap-abonnement\.html|tour\.html|reinit\.html|merci\.html))/g, (m, a) => a + HOTE);
  /* « api.teamop.fr » nu : les messages du sentinelle (« api.teamop.fr injoignable sur … ») disent le serveur réellement joint */
  s = s.replace(/(?<![A-Za-z0-9-])api\.teamop\.fr/g, HOTE);
  /* les expressions régulières qui reconnaissent « teamop.fr » reconnaissent aussi test.teamop.fr (adresse collée, retour de lien) */
  s = s.split('(www\\.)?teamop\\.fr').join('(www\\.|test\\.)?teamop\\.fr');
  /* le sentinelle de pannes réseau repère les appels à l'API par son nom : ici, c'est le serveur de test */
  s = s.split('/api\\.teamop\\.fr/.test(url)').join('/test\\.teamop\\.fr/.test(url)');
  /* 2. pas de service worker, pas de manifeste installable */
  s = s.replace(/navigator\.serviceWorker\.register\(/g, "(function(){return Promise.reject(new Error('espace de test : pas de service worker'))})(");
  s = s.replace(/<link\b[^>]*\brel=["']manifest["'][^>]*>\s*/gi, '');
  /* 3. noindex (nginx le dit aussi, par l'en-tête), le titre, et le script du fragment EN TÊTE du <head> — mais APRÈS la déclaration du jeu de
        caractères, qui doit rester dans les 1 024 premiers octets de la page (le script en fait plus : posé avant, il aurait fait deviner l'encodage). */
  let ajout = '';
  /* une page publique du site dit « index, follow » : sur le test elle dit noindex (une meta qui existe déjà est RÉÉCRITE, pas doublée) */
  if (/<meta[^>]+name=["']robots["']/i.test(s)) s = s.replace(/<meta[^>]+name=["']robots["'][^>]*>/i, '<meta name="robots" content="noindex,nofollow">');
  else ajout += '<meta name="robots" content="noindex,nofollow">';
  if (!o.sansFragment) ajout += SCRIPT_ESSAI;
  const ouvr = /<head(?:\s[^>]*)?>/i.exec(s);
  if (!ouvr || ouvr.index > 2000) echec(COURANT + ' \u00b7 la balise <head> est introuvable en t\u00eate de page');
  const apresHead = ouvr.index + ouvr[0].length;
  const cs = /<meta\s+charset=[^>]*>/i.exec(s.slice(apresHead, apresHead + 1500));
  if (cs) { const i = apresHead + cs.index + cs[0].length; s = s.slice(0, i) + ajout + s.slice(i); }
  else s = s.slice(0, apresHead) + '<meta charset="utf-8">' + ajout + s.slice(apresHead);
  /* 4. le titre dit où l'on est */
  s = s.replace(/<title>([^<]*)<\/title>/i, (m, t) => '<title>[TEST] ' + t + '</title>');
  /* 6. le bandeau, avant la DERNIÈRE fermeture du <body> (app.html écrit « </body> » dans des gabarits de fenêtres d'impression) */
  const f = s.lastIndexOf('</body>');
  if (f < 0 || /\S/.test(s.slice(f + 7).replace(/<\/html>/i, ''))) echec(COURANT + ' · la fermeture </body> de la page est introuvable ou n\'est pas la dernière');
  s = s.slice(0, f) + bandeau() + s.slice(f);
  return s;
}

/* ── les pages à part ─────────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* clés de stockage « elan_ » → « elanT_ » : tout ce qui, dans le code, nomme une clé d'une vraie entreprise. Le sel et le mot de passe de
   chiffrement (SYNC_SALT, SYNC_SECRET_DEFAULT) ne contiennent pas « elan_ » (tirets, majuscules, base64) et ne sont JAMAIS touchés :
   la fabrication refuse de livrer une page où ils auraient changé. */
function prefixe(s, min) {
  return remplacerRe(s, 'clés elan_ → elanT_', /(?<![A-Za-z0-9])elan_(?=[A-Za-z])/g, 'elanT_', min);
}
function gardeChiffrement(s, nom) {
  if (s.indexOf("SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'") < 0) echec(nom + ' : SYNC_SECRET_DEFAULT a été modifié — c\'est le MOT DE PASSE de chiffrement, pas un nom');
  if (s.indexOf("SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE='") < 0) echec(nom + ' : SYNC_SALT a été modifié — c\'est le SEL de chiffrement, pas un nom');
}

function pageApp(s) {
  s = prefixe(s, 100);
  s = remplacer(s, "code d'équipe devis", "'op_devis_code'", "'opT_devis_code'", 'plusieurs');
  s = remplacer(s, 'FB_TEAM (espace de repli)', "const FB_TEAM='elan-gestion';", "const FB_TEAM='opgestion-test';");
  s = remplacerRe(s, 'APP_VERSION « -essai »', /const APP_VERSION = '([0-9]+)'/, (m, v) => "const APP_VERSION = '" + v + "-essai'");
  /* BETA_ESSAI reste FAUX : on essaie la vraie application, pas la porte de la bêta. */
  if (s.indexOf('const BETA_ESSAI=false;') < 0) echec('app.html · BETA_ESSAI=false est introuvable : l\'essai doit rester la vraie application');
  if (s.indexOf("const STORE_KEY = 'elanT_gestion_v2';") < 0) echec('app.html · le stockage local de l\'essai n\'est pas isolé (STORE_KEY)');
  if (s.indexOf("const FB_TEAM='opgestion-test';") < 0) echec('app.html · l\'espace de synchro de l\'essai n\'est pas isolé (FB_TEAM)');
  return s;
}
function apresApp(s) {
  if (!/const PUSH_API='https:\/\/test\.teamop\.fr';/.test(s)) echec('app.html · PUSH_API ne vise pas le serveur de test');
  if (!/TM_URL='https:\/\/test\.teamop\.fr\/api\/monitor\/report'/.test(s)) echec('app.html · les rapports d\'erreurs ne vont pas au serveur de test');
  gardeChiffrement(s, 'app.html (après)');
  return s;
}
function pageTour(s) {
  /* OP Courrier (signature) et l'adresse de lien d'OP MESSAGES : d'autres services, pas ceux de l'essai. Un nom qui ne se résout jamais. */
  s = remplacer(s, 'COURRIER_SRV coupé', "var COURRIER_SRV='https://courrier-beta.teamop.fr';", "var COURRIER_SRV='https://courrier-indisponible-en-essai.invalid';");
  s = remplacer(s, 'BETA_MSG_ADRESSE coupée', "var BETA_MSG_ADRESSE='https://msg-beta.teamop.fr';", "var BETA_MSG_ADRESSE='https://msg-indisponible-en-essai.invalid';");
  s = remplacer(s, 'liens Stripe en mode test', 'https://dashboard.stripe.com/', 'https://dashboard.stripe.com/test/', 'plusieurs');
  return s;
}
function apresTour(s) {
  if (!/var API='https:\/\/test\.teamop\.fr';/.test(s)) echec('tour.html · l\'API de la Tour ne vise pas le serveur de test');
  return s;
}
function pagePortailLiee(s) { return prefixe(s, 1); }   // connexion.html, recap-abonnement.html : elles posent/lisent les clés de l'application

/* Les tarifs de production deviennent ceux de test. La page de paiement DOIT les porter tous (garde habituelle : un motif absent fait
   échouer la fabrication) ; une autre page qui en porterait un est traitée de même, sans l'exiger. */
function prixDeTest(s, f) {
  for (const prod of Object.keys(PRIX_ESSAI)) {
    if (f === 'recap-abonnement.html') s = remplacer(s, 'tarif Stripe ' + prod.slice(0, 12) + '… → tarif de test', prod, PRIX_ESSAI[prod], 'plusieurs');
    else if (s.indexOf(prod) >= 0) s = remplacer(s, 'tarif Stripe ' + prod.slice(0, 12) + '… → tarif de test', prod, PRIX_ESSAI[prod], 'plusieurs');
  }
  return s;
}

/* ── la fabrication ───────────────────────────────────────────────────────────────────────────────────────────────────────────── */
for (const f of PAGES) {
  COURANT = f;
  let s = lire(f);
  if (f === 'app.html') { gardeChiffrement(s, f); s = pageApp(s); }
  else if (f === 'tour.html') s = pageTour(s);
  else if (f === 'connexion.html' || f === 'recap-abonnement.html') s = pagePortailLiee(s);
  s = communes(s, { sansFragment: f === 'demo.html' });   // demo.html : pare-feu et politique de contenu, aucun compte à ranger
  if (PRIX_ESSAI) s = prixDeTest(s, f);
  if (f === 'app.html') s = apresApp(s);
  else if (f === 'tour.html') s = apresTour(s);
  fs.writeFileSync(path.join(SORTIE, f), s);
}

/* ── ce que les pages chargent ────────────────────────────────────────────────────────────────────────────────────────────────── */
COURANT = 'fichiers';
function copier(src, dst) { fs.mkdirSync(path.dirname(path.join(SORTIE, dst)), { recursive: true }); fs.copyFileSync(path.join(RACINE, src), path.join(SORTIE, dst)); }
['opcourrier.js', 'fond-anime-teamop.js', 'rubriques-choix.js', 'rubriques-choix.css'].forEach(f => { if (!fs.existsSync(path.join(RACINE, f))) echec(f + ' manque à la racine du dépôt'); copier(f, f); });
if (fs.existsSync(path.join(RACINE, 'favicon.ico'))) copier('favicon.ico', 'favicon.ico');
/* cookies.js : sans Google Analytics. Le bandeau et le choix restent (la page se comporte comme la vraie), seule la balise ne se charge jamais. */
{
  let c = lire('cookies.js');
  c = remplacer(c, 'Google Analytics coupé', 'function chargerGA() {\n    if (gaCharge) return;', "function chargerGA() {\n    return;   // espace de test : jamais de statistiques (scripts/essais-build.js)\n    if (gaCharge) return;");
  fs.writeFileSync(path.join(SORTIE, 'cookies.js'), c);
}
function copierDossier(d, ignore) {
  const src = path.join(RACINE, d);
  if (!fs.existsSync(src)) echec('le dossier ' + d + ' manque à la racine du dépôt');
  (function marche(rel) {
    for (const e of fs.readdirSync(path.join(src, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) marche(r);
      else if (!(ignore && ignore.test(r))) copier(path.join(d, r), path.join(d, r));
    }
  })('');
}
copierDossier('icons'); copierDossier('sons'); copierDossier('screenshots'); copierDossier('vitrine', /\.json$/);   // les empreintes de vitrine/ sont des outils de banc
/* `vitrine/v2/site.js` envoie la demande « Créer votre application » à l'API (30 octobre 2026) : dans l'espace de test, elle va au serveur de TEST */
{ COURANT = 'vitrine/v2/site.js'; const fv = path.join(SORTIE, 'vitrine', 'v2', 'site.js');
  fs.writeFileSync(fv, remplacer(fs.readFileSync(fv, 'utf8'), 'adresse de la demande du site → test', 'https://api.teamop.fr', 'https://' + HOTE, 1)); }

/* ── l'accueil des essais, la liste des courriels, le reste ───────────────────────────────────────────────────────────────────── */
const CSS_ESSAI = `<style>
:root{--fond:#f4f6fa;--carte:#fff;--encre:#16202f;--doux:#556070;--trait:#d9dfe9;--accent:#1b4fa0;--sur-accent:#fff;--ok:#146c43;--alerte:#9a5b00;--code:#eef1f6}
@media (prefers-color-scheme:dark){:root{--fond:#0d1422;--carte:#152033;--encre:#e9eef7;--doux:#9fb0c8;--trait:#2a3850;--accent:#7fb0ff;--sur-accent:#0d1422;--ok:#65d09a;--alerte:#f2b45a;--code:#1d2b44}}
*{box-sizing:border-box}html{background:var(--fond)}body{margin:0;background:var(--fond);color:var(--encre);font:16px/1.5 -apple-system,system-ui,"Segoe UI",Roboto,sans-serif;padding:0 16px 80px}
main{max-width:760px;margin:0 auto;padding-top:22px}h1{font-size:24px;margin:0 0 4px}h2{font-size:18px;margin:28px 0 8px}p{margin:6px 0}.doux{color:var(--doux);font-size:14px}
.carte{background:var(--carte);border:1px solid var(--trait);border-radius:14px;padding:14px 16px;margin:10px 0}
.bouton,button{display:inline-block;font-weight:600;font-size:15px;line-height:1;font-family:inherit;min-height:44px;padding:13px 16px;border-radius:10px;border:1.5px solid var(--accent);background:var(--accent);color:var(--sur-accent);text-decoration:none;cursor:pointer}
.bouton.creux,button.creux{background:transparent;color:var(--accent)}.bouton.danger,button.danger{border-color:var(--alerte);color:var(--alerte);background:transparent}
.rangee{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0}code,.mono{font-family:ui-monospace,Menlo,Consolas,monospace;background:var(--code);padding:1px 6px;border-radius:6px;font-size:13px;word-break:break-all}
ol.etapes{list-style:none;margin:0;padding:0;counter-reset:e}ol.etapes>li{counter-increment:e;position:relative;padding-left:46px}ol.etapes>li::before{content:counter(e);position:absolute;left:12px;top:14px;width:24px;height:24px;border-radius:99px;background:var(--accent);color:var(--sur-accent);font-weight:700;font-size:13px;line-height:24px;text-align:center}
.etat{display:inline-block;padding:2px 9px;border-radius:99px;font-size:13px;font-weight:600;background:var(--code)}.etat.ok{color:var(--ok)}.etat.pas{color:var(--alerte)}
label.coche{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:14px;color:var(--doux);min-height:32px}input[type=checkbox]{width:20px;height:20px}
details{margin-top:6px}summary{cursor:pointer;min-height:32px}iframe{width:100%;min-height:260px;border:1px solid var(--trait);border-radius:8px;background:#fff}
.liens a{display:block;word-break:break-all;padding:8px 0;min-height:36px;color:var(--accent)}pre{white-space:pre-wrap;word-break:break-word;background:var(--code);padding:10px;border-radius:8px;font-size:13px}
</style>`;

/* Le parcours de base : l'ordre est celui de Justin (« fais ces tests-là en premier, tu me dis s'il y a un problème, et je passe au deuxième »). */
const PARCOURS_BASE = [
  { titre: 'Se connecter comme client', quoi: 'Appuie sur « Se connecter comme client » ci-dessus. Tu n\'as rien à saisir : le compte « Clim Essai » est ouvert à ta place.',
    attendu: 'La page « Mon espace » s\'ouvre, connectée, au nom de l\'entreprise « Clim Essai » (métier chauffage). Si tu vois un écran de connexion ou une page d\'erreur : c\'est le problème n° 1, arrête-toi là et dis-le.' },
  { titre: 'Se connecter comme prospect', quoi: 'Appuie sur « Se connecter comme prospect ».',
    attendu: 'Mon espace s\'ouvre avec une demande d\'accès EN ATTENTE (métier plomberie, rubriques déjà choisies), pas d\'application ouverte. Si l\'entreprise est déjà ouverte ou si la demande a disparu : problème.' },
  { titre: 'Entrer dans la Tour comme patron', quoi: 'Appuie sur « Se connecter comme patron ».',
    attendu: 'La Tour de contrôle s\'ouvre sans demander de mot de passe, avec tous ses onglets. Cherche « Clim Essai » dans l\'onglet Entreprises, et la demande de « Plomberie Essai » dans l\'onglet Demandes (rubrique Clients).' },
  { titre: 'Entrer dans la Tour comme collaborateur', quoi: 'Appuie sur « Se connecter comme collaborateur ».',
    attendu: 'La Tour s\'ouvre avec les droits d\'un collaborateur : les onglets réservés au patron (par exemple les accès et la facturation) n\'y sont pas.' },
  { titre: 'Lire les courriels captés', quoi: 'Appuie sur « Voir les courriels captés ». Rien n\'est à faire avant : quatre courriels sont déjà arrivés à la préparation de l\'espace.',
    attendu: 'Quatre courriels : deux « Nouvelle demande à traiter » pour le patron (Clim Essai et Plomberie Essai), deux « Votre demande est bien reçue » pour le client et le prospect. Chacun montre son expéditeur, son destinataire (une adresse en exemple-essai.fr), son objet. Appuie sur un lien : il ouvre une page de test.teamop.fr, jamais de teamop.fr. Rien n\'est parti vers une vraie boîte. Pour en faire arriver un de plus : dans une fenêtre privée, ouvre « Mon espace », appuie sur « Mot de passe oublié ? » et saisis client@exemple-essai.fr, puis reviens ici et appuie sur « Actualiser ».' },
  { titre: 'Remettre l\'espace à zéro', quoi: 'Quand l\'espace est encombré, appuie sur « Remettre l\'espace à zéro » et confirme. La page attend que le serveur ait redémarré (une vingtaine de secondes) avant de dire que c\'est fait : ne recharge pas la page pendant ce temps.',
    attendu: 'Le message passe de « Le serveur redémarre… » à « C\'est fait ». Les données d\'essai sont vidées — le journal et les incidents de la Tour compris — et les quatre comptes reviennent propres. Tes anciennes connexions (client, patron…) ne valent plus : reconnecte-toi avec les boutons. Recommence l\'étape 1 : tu dois retrouver « Clim Essai » comme au début.' },
];

/* L'étape de paiement n'existe QUE si le paiement est jouable : une étape qui promettrait la carte 4242 sans que la page ait reçu ses tarifs de test
   ferait perdre une étape à Justin sur un refus de Stripe. Elle se place avant la remise à zéro (dernière étape de la base). */
const ETAPE_PAIEMENT = { titre: 'Payer un abonnement avec la carte de test',
  quoi: 'Reste connecté comme client, ouvre la page d\'abonnement (bouton « Ouvrir » ci-dessous), choisis Pro, appuie sur le bouton de paiement. Sur la page de Stripe, saisis la carte 4242 4242 4242 4242, une date de fin dans le futur (12/34), n\'importe quel code de sécurité (123) et un nom.',
  attendu: 'La page de Stripe porte le bandeau « mode test » et le bon montant (15 € par mois et par utilisateur pour Pro). Après le paiement, tu reviens sur test.teamop.fr (jamais sur teamop.fr) et la page de confirmation s\'ouvre. Aucun vrai prélèvement n\'a lieu : la clé est une clé de test.',
  lien: 'recap-abonnement.html?formule=pro' };
const PARCOURS_AFFICHE = PAIEMENT_JOUABLE ? PARCOURS_BASE.slice(0, PARCOURS_BASE.length - 1).concat([ETAPE_PAIEMENT], PARCOURS_BASE.slice(-1)) : PARCOURS_BASE;

function parcoursSupplementaire() {
  if (!PARCOURS) return [];
  let j; try { j = JSON.parse(fs.readFileSync(PARCOURS, 'utf8')); } catch (e) { echec('le parcours est illisible (' + path.basename(PARCOURS) + ') : ' + e.message.slice(0, 80)); }
  if (!Array.isArray(j) || !j.length) echec('le parcours doit être un tableau non vide de {titre, quoi, attendu, lien?}');
  return j.map((e, i) => {
    if (!e || typeof e.titre !== 'string' || typeof e.quoi !== 'string' || typeof e.attendu !== 'string') echec('l\'étape ' + (i + 1) + ' du parcours doit porter titre, quoi et attendu (des textes)');
    if (e.lien !== undefined && !/^\/?[A-Za-z0-9_][A-Za-z0-9_.\/?=&%#-]{0,200}$/.test(e.lien)) echec('l\'étape ' + (i + 1) + ' : « lien » doit être un chemin du site');
    return e;
  });
}

function carteEtape(e, idx, groupe) {
  const id = groupe + idx;
  return '<li class="carte" data-etape="' + esc(id) + '"><b>' + esc(e.titre) + '</b>'
    + '<p>' + esc(e.quoi) + '</p><p class="doux"><b>Ce que tu dois voir :</b> ' + esc(e.attendu) + '</p>'
    + (e.lien ? '<p><a class="bouton creux" href="' + esc(e.lien.replace(/^\/?/, '/')) + '">Ouvrir</a></p>' : '')
    + '<label class="coche"><input type="checkbox" data-coche="' + esc(id) + '"> Cette étape est bonne</label></li>';
}

function pageEssais() {
  const sup = parcoursSupplementaire();
  const lien = c => '/api/essais/connexion?compte=' + c + '&cle=' + CLE;
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light dark"><title>[TEST] Les essais — TeamOP</title>
${CSS_ESSAI}</head><body><main>
<h1>Espace de test</h1>
<p class="doux">Rien de ce que tu fais ici n'atteint une vraie entreprise : les courriels sont captés, les données sont à part${PAIEMENT_JOUABLE ? ', les paiements sont en mode test (carte 4242)' : ''}.</p>
${PAIEMENT_JOUABLE ? '' : '<div class="carte" id="limite-paiement"><p><b>Limite connue : le paiement ne se joue pas encore ici.</b> La page d\'abonnement porte les tarifs de production, que le mode test de Stripe ne connaît pas : la carte 4242 ne peut pas aboutir. Ne perds pas une étape dessus. Tout le reste (connexion, demandes, Tour, courriels) se joue normalement.</p></div>'}
<div class="carte"><p><b>Ce qui est en essai :</b> la branche <code>${esc(BRANCHE)}</code>, au commit <code>${esc(COMMIT.slice(0, 7))}</code>.</p>
<p class="doux">Serveur de test : <span class="etat" id="etat-serveur">vérification…</span></p></div>

<h2>Se connecter, sans rien saisir</h2>
<p class="doux" id="avis-cle">⛔ L'adresse de ces boutons porte la clé de cet espace de test : ne la copie pas et ne la colle pas dans la conversation. Ce qui se colle sans risque : la sortie de l'installation, <code>build.log</code> et <code>journalctl -u teamop-api-test -n 50</code>.</p>
<div class="rangee">
<a class="bouton" id="lien-client" href="${esc(lien('client'))}">Se connecter comme client</a>
<a class="bouton" id="lien-prospect" href="${esc(lien('prospect'))}">Se connecter comme prospect</a>
<a class="bouton" id="lien-patron" href="${esc(lien('patron'))}">Se connecter comme patron (la Tour)</a>
<a class="bouton" id="lien-collaborateur" href="${esc(lien('collaborateur'))}">Se connecter comme collaborateur (la Tour)</a>
</div>
<div class="rangee">
<a class="bouton creux" id="lien-courriels" href="/courriels.html">Voir les courriels captés</a>
<a class="bouton creux" href="/index.html">Le site</a>
<a class="bouton creux" href="/demo.html">La démonstration</a>
</div>
<div class="rangee"><button class="danger" id="remise" type="button">Remettre l'espace à zéro</button></div>
<p class="doux" id="remise-msg" role="status"></p>

<h2>Les tests, dans l'ordre</h2>
<p class="doux">Fais-les un par un, du haut vers le bas. Dès qu'une étape ne montre pas ce qui est écrit, arrête-toi, note ce que tu vois, et dis-le : on corrige avant de passer à la suivante. Ce que tu coches reste sur cet appareil.</p>
${sup.length ? '<h2>Les tests de cette modification</h2><ol class="etapes">' + sup.map((e, i) => carteEtape(e, i + 1, 'm')).join('') + '</ol><h2>Le parcours de base</h2>'
  : '<div class="carte" id="sans-tests-modification"><p><b>Aucun test propre à cette modification n\'est fourni.</b> Le parcours ci-dessous vérifie que l\'espace de test lui-même marche (connexions, Tour, courriels, remise à zéro) ; il ne teste pas ce que cette modification change. Les tests d\'une modification s\'écrivent dans <code>essais/parcours.json</code>, porté par la demande de fusion.</p></div>'}
<ol class="etapes">${PARCOURS_AFFICHE.map((e, i) => carteEtape(e, i + 1, 'b')).join('')}</ol>
</main>
${bandeau()}
<script>
(function(){
  var CLE=${JSON.stringify(CLE)}, COMMIT=${JSON.stringify(COMMIT)}, MEMOIRE='essai_etapes_'+COMMIT;
  function lireCoches(){ try{ return JSON.parse(localStorage.getItem(MEMOIRE)||'{}')||{}; }catch(e){ return {}; } }
  function poserCoches(o){ try{ localStorage.setItem(MEMOIRE,JSON.stringify(o)); }catch(e){} }
  var coches=lireCoches();
  Array.prototype.forEach.call(document.querySelectorAll('input[data-coche]'),function(c){
    c.checked=!!coches[c.getAttribute('data-coche')];
    c.addEventListener('change',function(){ var o=lireCoches(); o[c.getAttribute('data-coche')]=c.checked; poserCoches(o); });
  });
  var etat=document.getElementById('etat-serveur');
  fetch('/health',{cache:'no-store'}).then(function(r){ if(!r.ok) throw new Error(String(r.status)); return r.json().catch(function(){ return {}; }); })
    .then(function(){ etat.textContent='répond'; etat.className='etat ok'; },
          function(e){ etat.textContent='ne répond pas ('+(e&&e.message||'erreur')+')'; etat.className='etat pas'; });
  var btn=document.getElementById('remise'), msg=document.getElementById('remise-msg');
  /* ⛔ « C'EST FAIT » SEULEMENT QUAND LE SERVEUR EST REVENU. La route répond 200 puis ARRÊTE le serveur (l'unité systemd le relance : une quinzaine de secondes, plus le semis des
     comptes). Annoncer « c'est fait » sur le 200, c'était laisser cliquer « Se connecter comme client » sur un 502, ou sur {"error":"pas_encore_seme"}. On attend donc de VOIR le serveur
     tomber puis répondre (/health), puis que le semis soit fini : la porte « client » redirige (302), au lieu de répondre 503. */
  function pause(ms){ return new Promise(function(ok){ setTimeout(ok,ms); }); }
  function vivant(){ return fetch('/health',{cache:'no-store'}).then(function(r){ return r.ok; },function(){ return false; }); }
  function seme(){ return fetch('/api/essais/connexion?compte=client',{cache:'no-store',redirect:'manual',headers:{'X-Essai-Cle':CLE}}).then(function(r){ return r.type==='opaqueredirect'||r.status===302; },function(){ return false; }); }
  function attendreRedemarrage(){
    var debut=Date.now(), tombe=false;
    msg.textContent='Le serveur redémarre… compte une vingtaine de secondes, ne recharge pas la page.';
    function tour(){
      if(Date.now()-debut>90000) return Promise.reject(new Error('le serveur n\\'est pas revenu au bout de 90 secondes — regarde « Serveur de test » plus haut, puis recommence'));
      return pause(1000).then(vivant).then(function(v){
        if(!v){ tombe=true; return tour(); }
        if(!tombe && Date.now()-debut<8000) return tour();
        return seme().then(function(pret){ return pret?true:tour(); });
      });
    }
    return tour();
  }
  btn.addEventListener('click',function(){
    if(!window.confirm('Remettre l\\'espace de test à zéro ? Les données d\\'essai sont vidées (le journal et les incidents de la Tour aussi) et les quatre comptes reviennent comme au début.')) return;
    btn.disabled=true; msg.textContent='Remise à zéro en cours…';
    fetch('/api/essais/remise-a-zero',{method:'POST',headers:{'X-Essai-Cle':CLE}}).then(function(r){
      if(r.status===404) throw new Error('ce serveur n\\'est pas un serveur de test (route absente)');
      if(r.status===403) throw new Error('la clé d\\'essais est refusée');
      if(!r.ok) throw new Error('le serveur a répondu '+r.status);
      return attendreRedemarrage();
    }).then(function(){ msg.textContent='C\\'est fait : l\\'espace est remis à zéro. Tes anciennes connexions ne valent plus : reconnecte-toi avec les boutons ci-dessus.'; })
      .catch(function(e){ msg.textContent='Ça n\\'a pas marché : '+(e&&e.message||'erreur'); }).then(function(){ btn.disabled=false; });
  });
})();
</script>
</body></html>
`;
}

function pageCourriels() {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="robots" content="noindex,nofollow"><meta name="color-scheme" content="light dark"><title>[TEST] Courriels captés — TeamOP</title>
${CSS_ESSAI}</head><body><main>
<p><a href="/essais.html">‹ Les essais</a></p>
<h1>Courriels captés</h1>
<p class="doux">En essai, aucun courriel ne part : le serveur les range ici. Les 200 derniers, du plus récent au plus ancien. Cette liste se remet à jour toute seule.</p>
<div class="rangee"><button id="actualiser" type="button" class="creux">Actualiser</button> <span class="etat" id="compte" role="status"></span></div>
<div id="liste"></div>
</main>
${bandeau()}
<script>
(function(){
  var CLE=${JSON.stringify(CLE)};
  var liste=document.getElementById('liste'), compte=document.getElementById('compte');
  function el(nom,attrs,texte){ var e=document.createElement(nom); if(attrs) for(var k in attrs) e.setAttribute(k,attrs[k]); if(texte!=null) e.textContent=texte; return e; }
  function vers(c){ var a=c.a||c['à']||c.to||c.vers||''; return Array.isArray(a)?a.join(', '):String(a); }
  function quand(d){ try{ var x=new Date(d); return isNaN(x)?String(d||''):x.toLocaleString('fr-FR'); }catch(e){ return String(d||''); } }
  /* un lien n'est cliquable que s'il est http(s) : jamais javascript:, jamais data: */
  function lienSur(u){ u=String(u||''); return /^https?:\\/\\//i.test(u)?u:''; }
  function carte(c){
    var d=el('div',{'class':'carte'});
    d.appendChild(el('b',null,c.objet||c.sujet||'(sans objet)'));
    d.appendChild(el('p',{'class':'doux'},quand(c.date)+' — de '+String(c.de||c.from||'?')+' — à '+vers(c)));
    var liens=(c.liens||[]).map(function(l){ return typeof l==='string'?{href:l,texte:l}:{href:l&&(l.href||l.url),texte:l&&(l.texte||l.label||l.href||l.url)}; }).filter(function(l){ return lienSur(l.href); });
    if(liens.length){ var bloc=el('div',{'class':'liens'}); liens.forEach(function(l){ bloc.appendChild(el('a',{href:lienSur(l.href),target:'_blank',rel:'noopener'},String(l.texte||l.href))); }); d.appendChild(bloc); }
    if(c.texte){ var t=el('details'); t.appendChild(el('summary',null,'Le texte')); t.appendChild(el('pre',null,String(c.texte))); d.appendChild(t); }
    if(c.html){ var h=el('details'); h.appendChild(el('summary',null,'Le courriel tel que le client le voit')); var f=el('iframe',{sandbox:'',referrerpolicy:'no-referrer',title:'Courriel'}); f.srcdoc=String(c.html); h.appendChild(f); d.appendChild(h); }
    return d;
  }
  function dire(texte,cls){ liste.textContent=''; liste.appendChild(el('div',{'class':'carte'},texte)); compte.textContent=''; compte.className='etat '+(cls||''); }
  function charger(){
    fetch('/api/essais/courriels',{cache:'no-store',headers:{'X-Essai-Cle':CLE}}).then(function(r){
      if(r.status===404) throw new Error('ce serveur n\\'est pas un serveur de test (route absente)');
      if(r.status===403) throw new Error('la clé d\\'essais est refusée');
      if(!r.ok) throw new Error('le serveur a répondu '+r.status);
      return r.json();
    }).then(function(j){
      var l=Array.isArray(j)?j:(j&&(j.courriels||j.items))||[];
      compte.textContent=l.length+' courriel'+(l.length>1?'s':''); compte.className='etat ok';
      liste.textContent='';
      if(!l.length){ liste.appendChild(el('div',{'class':'carte doux'},'Aucun courriel capté pour l\\'instant.')); return; }
      l.forEach(function(c){ liste.appendChild(carte(c)); });
    }).catch(function(e){ dire('Impossible de lire les courriels : '+(e&&e.message||'erreur'),'pas'); });
  }
  document.getElementById('actualiser').addEventListener('click',charger);
  charger(); setInterval(function(){ if(document.visibilityState==='visible') charger(); },10000);
})();
</script>
</body></html>
`;
}

COURANT = 'essais';
fs.writeFileSync(path.join(SORTIE, 'essais.html'), pageEssais());
fs.writeFileSync(path.join(SORTIE, 'courriels.html'), pageCourriels());
fs.writeFileSync(path.join(SORTIE, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
fs.writeFileSync(path.join(SORTIE, 'essai.json'), JSON.stringify({ espace: 'test', commit: COMMIT, branche: BRANCHE, construit: new Date().toISOString(), pages: PAGES.length }) + '\n');

/* ── LA DERNIÈRE PASSE : relire TOUT ce qui sort. Une adresse de production subsistante, et rien n'est livré. ───────────────────── */
const INTERDITS = [
  ['https://api.teamop.fr', /https:\/\/api\.teamop\.fr/], ['https://teamop.fr', /https:\/\/teamop\.fr/], ['https://www.teamop.fr', /https:\/\/www\.teamop\.fr/],
  ['api.teamop.fr (nu)', /(?<![A-Za-z0-9-])api\.teamop\.fr/], ['//api.teamop.fr', /\/\/api\.teamop\.fr/],
  ['courrier-beta.teamop.fr en adresse', /https?:\/\/courrier-beta\.teamop\.fr/], ['msg-beta.teamop.fr en adresse', /https?:\/\/msg-beta\.teamop\.fr/],
  ['msg.teamop.fr en adresse', /https?:\/\/msg\.teamop\.fr/],
  ['firestore.googleapis.com', /firestore\.googleapis\.com/], ['firebaseio.com', /firebaseio\.com/], ['identitytoolkit', /identitytoolkit\.googleapis/],
  ['une inscription de service worker', /navigator\.serviceWorker\.register\(/],
];
/* Le jour où PAIEMENT_JOUABLE passe à vrai, les tarifs de PRODUCTION lus dans la vraie page ne doivent plus subsister nulle part :
   sinon essais.html promettrait une carte 4242 que Stripe (clé de test) refuse. Les identifiants viennent de la page elle-même, pas d'une
   liste écrite ici qui vieillirait. */
if (PAIEMENT_JOUABLE) {
  const prod = PRIX_PROD_PAGE.slice();
  if (!prod.length) echec('recap-abonnement.html ne porte plus aucun tarif price_… : le garde du paiement ne regarde rien — à revoir');
  Object.keys(PRIX_ESSAI || {}).forEach(id => { if (prod.indexOf(id) < 0) prod.push(id); });
  prod.forEach(id => INTERDITS.push(['tarif Stripe de production ' + id.slice(0, 12) + '…', new RegExp(id)]));
}
{
  const vus = [];
  (function marche(rel) {
    for (const e of fs.readdirSync(path.join(SORTIE, rel), { withFileTypes: true })) {
      const r = path.join(rel, e.name);
      if (e.isDirectory()) { marche(r); continue; }
      if (!/\.(html|js|css|json|txt)$/.test(e.name)) continue;
      const t = fs.readFileSync(path.join(SORTIE, r), 'utf8');
      for (const [nom, re] of INTERDITS) if (re.test(t)) vus.push(r + ' · ' + nom);
    }
  })('');
  if (vus.length) {
    fs.rmSync(SORTIE, { recursive: true, force: true });
    echec('une adresse de production subsiste dans les pages d\'essai — rien n\'est livré (dossier vidé) :\n  ' + vus.slice(0, 20).join('\n  '));
  }
}

if (PRIX_ESSAI) {
  /* le paiement est annoncé jouable : la page doit PORTER les dix tarifs de test (population comptée avant de croire une absence) */
  const page = fs.readFileSync(path.join(SORTIE, 'recap-abonnement.html'), 'utf8');
  const manquants = Object.values(PRIX_ESSAI).filter(id => page.indexOf(id) < 0);
  if (!Object.keys(PRIX_ESSAI).length || manquants.length) {
    fs.rmSync(SORTIE, { recursive: true, force: true });
    echec('le paiement est annoncé jouable mais la page de paiement ne porte pas ' + (manquants.length || 'aucun') + ' tarif(s) de test — rien n\'est livré (dossier vidé)');
  }
}

{
  const c = fs.readFileSync(path.join(SORTIE, 'cookies.js'), 'utf8');
  if (!/function chargerGA\(\) \{\s*return;/.test(c)) { fs.rmSync(SORTIE, { recursive: true, force: true }); echec('cookies.js : Google Analytics pourrait se charger — rien n\'est livré'); }
}

/* ── les références locales qui ne mènent à rien (avertissement : une page du dépôt peut en porter légitimement) ─────────────────── */
{
  const pendantes = [];
  for (const f of PAGES.concat(['essais.html', 'courriels.html'])) {
    const t = fs.readFileSync(path.join(SORTIE, f), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const re = /\b(?:src|href)=["']([^"'#?]+)(?:[?#][^"']*)?["']/g; let m;
    while ((m = re.exec(t))) {
      const u = m[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|mailto:|tel:|data:|javascript:)/i.test(u) || u === '/' || u.indexOf('${') >= 0 || u.indexOf('+') >= 0) continue;
      if (/^\/api\//.test(u)) continue;
      if (!/\.[A-Za-z0-9]{2,5}$/.test(u)) continue;
      const cible = path.join(SORTIE, u.replace(/^\//, ''));
      if (!fs.existsSync(cible)) pendantes.push(f + ' → ' + u);
    }
  }
  if (pendantes.length) console.warn('avertissement : ' + pendantes.length + ' référence(s) locale(s) sans fichier :\n  ' + Array.from(new Set(pendantes)).slice(0, 20).join('\n  '));
}

console.log('Pages d\'essai fabriquées dans ' + SORTIE + ' : ' + PAGES.length + ' pages + essais.html + courriels.html (commit ' + COMMIT.slice(0, 7) + ', ' + BRANCHE + ').');
console.log('Clé d\'essais lue (non affichée) ; ' + journal.length + ' remplacements gardés.');
