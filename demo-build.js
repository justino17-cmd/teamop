/* Génère demo.html — la DÉMONSTRATION PUBLIQUE d'OP GESTION : la vraie application, sans réseau ni compte, avec un exemple fictif par métier.
   Usage : node demo-build.js   (à relancer à chaque version ; le banc tests/test-2940.js refait la génération et compare à l'octet)
   Justin : « sur le site il faudrait faire un système de simulation des applications, qu'ils puissent tester ».
   Même principe que beta-build.js — app.html lu, des remplacements textuels, demo.html écrit — mais pour un autre public et donc
   d'autres coupures. ⛔ CE N'EST PAS LA BÊTA : `BETA_ESSAI` reste à `false` (il imposerait la porte serveur de la bêta et ouvrirait
   les outils de l'équipe). Un drapeau neuf, `DEMO_PUBLIQUE`, commande tout ce que la démonstration change.
   Ce qui est coupé, et par quoi :
   · le RÉSEAU — la politique de contenu du navigateur (aucune sortie hors de la page) et scripts/demo/pare-feu.js (bouchons qui
     refusent : fetch, XMLHttpRequest, sendBeacon, WebSocket, EventSource, notifications, service worker, liens vers l'extérieur) ;
   · le STOCKAGE — préfixe elanD_ (et la vue du pare-feu, qui ne montre que ce préfixe : l'origine teamop.fr est partagée avec
     l'application des clients) ; FB_TEAM n'existe pas côté serveur, `espaceHerite` ne rattache rien ;
   · les COMPTES — pas d'écran de connexion, pas de campagne mot de passe ni de rappel d'adresse, pas d'écran « Connexion requise » ;
   · le RÉFÉRENCEMENT — noindex, pas de manifeste, pas de service worker (une copie en cache garderait un vieil exemple).
   Chaque remplacement est GARDÉ : le motif doit être trouvé exactement le nombre de fois attendu, sinon la génération échoue (un
   remplacement qui ne trouve rien ne coupe rien, en silence — c'est le défaut que beta-build.js garde déjà).
   ⛔ SYNC_SECRET_DEFAULT et SYNC_SALT ne sont JAMAIS touchés (le mot de passe et le sel de chiffrement des entreprises, pas des noms) ;
   le générateur refuse de produire une démonstration qui les aurait perdus.                                                    */
const fs = require('fs');
const path = require('path');
const RACINE = __dirname;
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');
let s = lire('app.html');

function echec(m) { console.error('ÉCHEC : ' + m); process.exit(1); }
/* un motif, exactement `attendu` fois, remplacé tel quel (jamais une expression régulière : pas de caractère spécial à échapper) */
function remplacer(nom, avant, apres, attendu) {
  const n = s.split(avant).length - 1, voulu = attendu === undefined ? 1 : attendu;
  /* 'plusieurs' : au moins une fois (une clé écrite à plusieurs endroits — en ajouter un de plus dans app.html ne doit pas casser la génération) */
  if (voulu === 'plusieurs' ? n < 1 : n !== voulu) echec(nom + ' : le motif doit être trouvé ' + (voulu === 'plusieurs' ? 'au moins une' : voulu) + ' fois dans app.html, il l\'est ' + n + ' fois');
  s = s.split(avant).join(apres);
}
/* idem pour un bloc délimité (de `debut` à la première occurrence de `fin` qui suit, fin comprise) */
function remplacerBloc(nom, debut, fin, apres) {
  const i = s.indexOf(debut);
  if (i < 0 || s.indexOf(debut, i + 1) >= 0) echec(nom + ' : le début du bloc doit être trouvé UNE fois');
  const j = s.indexOf(fin, i);
  if (j < 0) echec(nom + ' : la fin du bloc est introuvable');
  s = s.slice(0, i) + apres + s.slice(j + fin.length);
}

/* ── 1. LE STOCKAGE : le préfixe de la démonstration ───────────────────────────────────────────────────────────────────────── */
{
  const avant = s.split("'elan_").length - 1 + s.split('"elan_').length - 1;
  if (avant < 100) echec('app.html ne porte que ' + avant + ' clés « elan_ » — le préfixe a changé, la démonstration ne serait plus isolée');
  s = s.split("'elan_").join("'elanD_");
  s = s.split('"elan_').join('"elanD_');
}
remplacer("code d'équipe devis", "'op_devis_code'", "'opD_devis_code'", 'plusieurs');
if (/['"]elan_/.test(s)) echec('une clé « elan_ » subsiste : la démonstration lirait ou écrirait dans l\'application des clients');
if (s.indexOf("const STORE_KEY = 'elanD_gestion_v2';") < 0) echec('le stockage local de la démonstration n\'est pas isolé (STORE_KEY)');

/* ── 2. AUCUNE SYNCHRO : l'espace n'existe pas côté serveur, et rien ne rattache l'appareil ─────────────────────────────────── */
remplacer('FB_TEAM', "const FB_TEAM='elan-gestion';", "const FB_TEAM='demo-sans-espace';");
remplacer('espaceHerite', "if(localStorage.getItem('elanD_sync_team')) return;   // déjà rattaché à son entreprise",
  "if(DEMO_PUBLIQUE) return;                            // démonstration : aucun espace, aucun hérité\n  if(localStorage.getItem('elanD_sync_team')) return;   // déjà rattaché à son entreprise");
remplacer('syncEnabled', "function syncEnabled(){ return localStorage.getItem('elanD_sync_on')!=='0' && !!syncTeam(); }",
  "function syncEnabled(){ return !DEMO_PUBLIQUE && localStorage.getItem('elanD_sync_on')!=='0' && !!syncTeam(); }");
remplacer('teamopLienCheck', 'async function teamopLienCheck(){', 'async function teamopLienCheck(){ if(DEMO_PUBLIQUE) return false;');

/* ── 3. LE DRAPEAU : DEMO_PUBLIQUE vrai, BETA_ESSAI faux ───────────────────────────────────────────────────────────────────── */
remplacer('DEMO_PUBLIQUE', 'const BETA_ESSAI=false;', 'const BETA_ESSAI=false;\n/* Vrai uniquement dans demo.html (demo-build.js). Jamais BETA_ESSAI : la démonstration n\'est pas la bêta. */\nconst DEMO_PUBLIQUE=true;');
remplacer('PAGE_APP', "const PAGE_APP=BETA_ESSAI?'beta.html':'app.html';", "const PAGE_APP=DEMO_PUBLIQUE?'demo.html':(BETA_ESSAI?'beta.html':'app.html');");
{
  const m = /const APP_VERSION = '([0-9]+)'/.exec(s);
  if (!m) echec('APP_VERSION introuvable');
  s = s.replace(m[0], "const APP_VERSION = '" + m[1] + "-demo'");
}

/* ── 4. AUCUN COMPTE : une session locale, pas de campagne de sécurité, pas d'écran « Connexion requise » ─────────────────────── */
/* « Ton entreprise — Bienvenue ! » : une démonstration n'a pas d'entreprise réelle à remplir, et la fenêtre recouvrait le premier écran du visiteur (les documents, eux, la demandent toujours à leur geste) */
remplacer('entAccueilCheck', 'function entAccueilCheck(n){ n=n||0; try{', 'function entAccueilCheck(n){ n=n||0; try{ if(DEMO_PUBLIQUE) return;');
remplacer('secuAFaire', 'function secuAFaire(u){ if(BETA_ESSAI) return false;', 'function secuAFaire(u){ if(BETA_ESSAI||DEMO_PUBLIQUE) return false;');
remplacer('emailRappelModal', 'function emailRappelModal(passe){ if(BETA_ESSAI) return;', 'function emailRappelModal(passe){ if(BETA_ESSAI||DEMO_PUBLIQUE) return;');
remplacer('horsLigneDebut', 'function horsLigneDebut(motif){', 'function horsLigneDebut(motif){ if(DEMO_PUBLIQUE) return;   // pas de réseau voulu : jamais d\'écran « Connexion requise »');
remplacer('battement', 'async function battement(){\n  clearTimeout(_hbTimer);', 'async function battement(){\n  if(DEMO_PUBLIQUE) return;\n  clearTimeout(_hbTimer);');
remplacer('rep() — rapports d\'erreurs', 'function rep(msg,src,line,stack){ try{', 'function rep(msg,src,line,stack){ try{ if(window.__demoPublique) return;   // la démonstration ne signale rien à personne\n');

/* ── 5. PAS DE SERVICE WORKER, PAS DE MANIFESTE ────────────────────────────────────────────────────────────────────────────── */
remplacer('service worker', "navigator.serviceWorker.register('sw.js')", "(function(){return Promise.reject(new Error('démonstration : pas de service worker'))})()");
remplacer('manifeste', '<link rel="manifest" href="manifest.webmanifest">\n', '');
remplacer('titre', '<title>OP GESTION</title>', '<title>OP GESTION — Démonstration</title>');

/* ── 6. OP MESSAGES : « Bientôt », jamais un lien ──────────────────────────────────────────────────────────────────────────── */
remplacerBloc('rangée OP MESSAGES du menu', '<a id="suite-opmsg" href="messages.html"', '</a>',
  '<div id="suite-opmsg" class="suite-row suite-mini" style="display:none;color:var(--t2);cursor:default" title="OP MESSAGES — bientôt disponible">\n'
  + '            <img src="icons/plan-msg.png" alt="" style="width:20px;height:20px;border-radius:6px;flex-shrink:0;object-fit:cover">\n'
  + '            <b style="font-size:11.5px">OP MESSAGES</b>\n'
  + '            <span style="margin-left:auto;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--t3)">Bientôt</span>\n'
  + '          </div>');
remplacer('bouton flottant OP MESSAGES', '<a class="msg-flot" id="msg-flot" href="messages.html" style="display:none" aria-label="Ouvrir OP MESSAGES" title="OP MESSAGES">',
  '<a class="msg-flot" id="msg-flot" href="#" style="display:none" aria-hidden="true" tabindex="-1" title="OP MESSAGES — bientôt disponible">');
remplacer('suiteRefresh', "const soOn=!!(can('opMessages')&&planOpMsg()&&opMsgDisponible());", "const soOn=DEMO_PUBLIQUE||!!(can('opMessages')&&planOpMsg()&&opMsgDisponible());");
if (/messages(-beta)?\.html/.test(s)) echec('un lien vers OP MESSAGES subsiste (messages.html)');

/* la Boîte mail (OP Courrier) : aucune boîte ne se connecte ici — l'état « calme » du module, avec les mots de la démonstration */
remplacer('boîtes du courrier', "if(BETA_ESSAI){ const e=new Error('Espace de test : aucune vraie boîte mail ne se connecte ici. Les vrais mails se testent dans la Tour.'); e.calme=true; throw e; }",
  "if(BETA_ESSAI||DEMO_PUBLIQUE){ const e=new Error(DEMO_PUBLIQUE?'Dans la démonstration, aucune boîte mail ne se connecte : rien n\\'est reçu, rien n\\'est envoyé.':'Espace de test : aucune vraie boîte mail ne se connecte ici. Les vrais mails se testent dans la Tour.'); e.calme=true; throw e; }");
/* les cartes : le fond de carte vient d'un serveur de tuiles — rien ne sort d'ici. Le chargement de Leaflet échoue d'emblée (le code attend déjà un échec) et la zone dit pourquoi au lieu de rester un grand blanc */
remplacer('loadLeaflet', 'function loadLeaflet(){ return new Promise((res,rej)=>{\n  if(window.L) return res();',
  "function loadLeaflet(){ return new Promise((res,rej)=>{\n  if(window.L) return res();\n  if(DEMO_PUBLIQUE){ try{ demoPubliqueCarteMessage(); }catch(e){} return rej(new Error('démonstration : pas de fond de carte')); }");
/* « Changer d'application » (Paramètres) emmène au portail du site : la démonstration y renvoie par un simple lien, sans toucher à rien de l'origine */
remplacer("Changer d'application", `<button class="btn ghost sm" onclick="try{localStorage.removeItem('teamop_app')}catch(e){};location.href='index.html?hub=1'">Changer d'application</button>`,
  `<button class="btn ghost sm" onclick="location.href='index.html'">Retour au site</button>`);

/* « Forcer la mise à jour (vider le cache) » (Paramètres) effaçait tout le Cache Storage de l'origine — celui de la VRAIE application. La démonstration n'en a pas : elle recharge. */
remplacer('forceUpdate', 'async function forceUpdate(){', "async function forceUpdate(){\n  if(DEMO_PUBLIQUE){ location.reload(); return; }   // le cache de l'origine est celui de la VRAIE application");
/* l'assistant devis et le Devis IA passent par un serveur : une phrase de démonstration, pas « Code d'accès requis » ni « Le serveur ne répond pas » */
remplacer('Assistant devis', "  if(!adCode()){\n    $('content').innerHTML=`<div class=\"card\"><div class=\"card-head\"><h3>🔒 Code d'accès requis</h3></div>",
  "  if(DEMO_PUBLIQUE){ demoPubliqueAssistantDevis(); return; }\n  if(!adCode()){\n    $('content').innerHTML=`<div class=\"card\"><div class=\"card-head\"><h3>🔒 Code d'accès requis</h3></div>");
remplacer('Devis IA — message', "  if(demande.trim().length<5){ show('Décris la prestation d\\'abord.'); return; }\n",
  "  if(demande.trim().length<5){ show('Décris la prestation d\\'abord.'); return; }\n  if(DEMO_PUBLIQUE){ show(demoPubliqueDevisIAMessage()); return; }\n");
remplacer('Devis IA — état', "  // état en direct : le serveur dit si l'entreprise est activée et combien il reste de devis aujourd'hui\n  fetch(PUSH_API+'/api/devis/etat?team='",
  "  // état en direct : le serveur dit si l'entreprise est activée et combien il reste de devis aujourd'hui\n  if(DEMO_PUBLIQUE) demoPubliqueDevisIAEtat(); else fetch(PUSH_API+'/api/devis/etat?team='");
/* les liens sms: et mailto: écrits par l'application ouvriraient la messagerie du visiteur avec le contenu de l'exemple : sept affectations, détournées vers `demoNav` */
remplacer('sms: (location.href)', "location.href='sms:'+", "demoNav.href='sms:'+", 4);
remplacer('mailto: (location.href)', "location.href='mailto:'+", "demoNav.href='mailto:'+", 1);
remplacer('mailto: (window.location.href)', 'window.location.href=`mailto:${mail}?subject=', 'demoNav.href=`mailto:${mail}?subject=', 2);
if (/location\.href\s*=\s*['"`](?:sms|mailto|tel):/.test(s)) echec('une affectation de location.href vers sms:/mailto:/tel: subsiste : elle ouvrirait la messagerie du visiteur');

/* ── 7. LE BANDEAU, ET LE DÉMARRAGE : le choix du métier prend la place de boot() ──────────────────────────────────────────── */
remplacer('bandeau', 'try{ multiProposer(view); }catch(_e){}', 'try{ multiProposer(view); }catch(_e){}\n  try{ if(DEMO_PUBLIQUE) demoPubliqueBandeau(); }catch(_e){}');
{
  const module = lire('scripts/demo/scenarios.js') + '\n' + lire('scripts/demo/demo-publique.js') + '\n';
  remplacer('démarrage', 'try{ txtAppliquer(); }catch(e){}\nboot();\n',
    'try{ txtAppliquer(); }catch(e){}\n/* ═══ DÉMONSTRATION PUBLIQUE (scripts/demo/) ═══ */\n' + module + 'if(DEMO_PUBLIQUE) demoPubliqueBoot(); else boot();\n');
}

/* ── 8. LE HAUT DE LA PAGE : la politique de contenu, noindex, et le pare-feu — avant tout autre script ────────────────────── */
const CSP = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:",   // l'application est un fichier unique, écrit en ligne ; deux gestes évaluent du texte (recherche globale, formulaire) ; « self » : opcourrier.js, chargé à l'ouverture de la Boîte mail
  "style-src 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "media-src 'self' data: blob:",
  "connect-src data: blob:",                          // aucune adresse réseau : seulement ce qui est fabriqué dans la page
  "frame-src blob: data:",
  "object-src blob: data:",
  "worker-src blob:",
  "manifest-src 'none'",
  "base-uri 'self'",
  "form-action 'none'"
].join('; ');
remplacer('haut de page', '<meta charset="utf-8">\n',
  '<meta charset="utf-8">\n'
  + '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n'
  + '<meta name="robots" content="noindex,nofollow">\n<meta name="referrer" content="no-referrer">\n'
  + '<script>\n' + lire('scripts/demo/pare-feu.js') + '</script>\n');
{
  const iPare = s.indexOf('LE PARE-FEU DE LA DÉMONSTRATION'), iApp = s.indexOf("const STORE_KEY = 'elanD_gestion_v2'");
  if (iPare < 0 || iApp < 0 || iPare > iApp) echec('le pare-feu doit précéder le script de l\'application');
}

/* ── 9. LES GARDES QUI COMPTENT LE PLUS ────────────────────────────────────────────────────────────────────────────────────── */
if (s.indexOf('const BETA_ESSAI=false;') < 0 || s.indexOf('const BETA_ESSAI=true;') >= 0) echec('BETA_ESSAI doit rester à false : la démonstration n\'est pas la bêta');
if (s.indexOf('const DEMO_PUBLIQUE=true;') < 0) echec('DEMO_PUBLIQUE n\'est pas armé');
if (s.indexOf("const FB_TEAM='demo-sans-espace';") < 0) echec('FB_TEAM n\'est pas isolé');
/* ⛔ le mot de passe et le sel de chiffrement CONTIENNENT « ELAN-GESTION » mais ne sont pas des noms : un renommage global les
   emporterait et rendrait illisibles les données de toutes les entreprises sans clé personnalisée. */
if (s.indexOf("SYNC_SECRET_DEFAULT='ELAN-GESTION-7F3A9C2E-cloud-2026'") < 0) echec('SYNC_SECRET_DEFAULT a été modifié — c\'est le MOT DE PASSE de chiffrement, pas un nom');
if (s.indexOf("SYNC_SALT='RUxBTi1HRVNUSU9OLXNhbHQtdjE='") < 0) echec('SYNC_SALT a été modifié — c\'est le SEL de chiffrement, pas un nom');

const sortie = (process.argv && process.argv[2]) || 'demo.html';
fs.writeFileSync(sortie, s);
console.log(sortie + ' générée (' + Math.round(s.length / 1024) + ' Ko) — version ' + (s.match(/APP_VERSION = '([^']+)'/) || [])[1]);
