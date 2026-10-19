/* ⛔ CE QUE CE FICHIER GARDE — LE MODULE `opcourrier.js` (OP COURRIER, 18 octobre 2026) : une pièce qu'on MONTE dans une autre application, pas une page.

   Justin : « je veux pas que ça soit une application à part ; je veux que ça remplace Mail […] quand tu l'intègres dans les applications c'est VIDE, les gens doivent se
   connecter à leur mail ». Le module est donc monté par OP GESTION (bêta), puis par la Tour et OP MESSAGES Pro ; ce banc garde ce qu'il promet à TOUS ses hôtes, sur le CODE LIVRÉ
   (les fonctions sont EXTRAITES et EXÉCUTÉES, jamais recopiées). Ce que seul un navigateur voit — le rendu, les trois formats, l'isolement de la feuille, le calque au-dessus de la barre
   de l'hôte — est gardé par les sondes `scratchpad/courrier/` (ctx 16, miss 50, sign 48, contraste AA, `sonde-module.js`, `sonde-gestion.js`).
     1. ⛔ la feuille est ENFERMÉE sous `.opc` : aucun sélecteur global (`:root`, `html`, `body`, `*`), des animations aux noms propres, aucun `position:fixed` hors du calque,
        aucune requête `@media` sur la largeur de l'ÉCRAN (le format se décide sur le conteneur) ;
     2. ⛔ AUCUNE DONNÉE D'EXEMPLE dans le module, ni dans `beta.html`, `app.html` ou `beta-build.js` : chaque expéditeur et chaque objet de la source de démonstration est cherché — et la
        liste est d'abord PROUVÉE non vide ; plus de mot de « maquette », de « bêta — aucun vrai mail », de drapeau de démo, de `sourceDemo` ;
     3. le module ne sort JAMAIS du réseau (aucun `fetch`), ne touche au stockage que deux fois (persist, restore), n'écrit pas le titre du document sans qu'on le lui demande ;
     4. le contrat de l'adaptateur : tout ce que le module appelle chez sa source est documenté en tête du fichier, et inversement ;
     5. la persistance, la VRAIE `persist` et la VRAIE `restore` : une clé (options.cleStockage), un stockage qui jette ne casse rien, ce que la source rend n'est jamais copié,
        ce qu'on écrit l'est, un instantané de la maquette (v3) est ignoré ;
     6. les fonctions qui traduisent la source (`depuisSource`, `paragraphes`, `surOver`, `dossierServeur`) rejouées sur des cas ;
     7. le module est dans le site assemblé, et les sondes qui le gardent existent.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE : chaque tranche extraite est d'abord PROUVÉE trouvée, chaque population comptée. Sans dépendance, aucun réseau. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
/* ⛔ un banc qui MEURT n'est pas un banc vert : une exception s'imprime comme un échec, avec son total */
process.on('uncaughtException', (e) => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const RACINE = path.join(__dirname, '..');
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');
const MOD = lire('opcourrier.js');
/* ⛔ on ne retire que les blocs qui COMMENCENT une ligne (CLAUDE.md : le motif naïf avale du vrai code) */
const sansComm = (t) => t.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/[ \t]{2,}\/\/[^\n]*$/gm, '');
/* le moteur de tri est gardé par test-2700 : on le retire pour que ses mots-clés (des marques, des arnaques) ne passent pas pour du code du module */
const iM = MOD.indexOf('var OPClassify = (function () {'), jM = MOD.indexOf('\n})();', iM) + '\n})();'.length;
vrai('(tranche trouvée) le moteur de tri embarqué', iM > 0 && jM > iM && jM - iM > 20000);
const SANS_MOTEUR = MOD.slice(0, iM) + MOD.slice(jM);
const CODE = sansComm(SANS_MOTEUR);
function tranche(quoi, debut, fin, src) {
  const s = src || MOD, i = s.indexOf(debut), j = i < 0 ? -1 : s.indexOf(fin, i + debut.length);
  vrai('(tranche trouvée) ' + quoi, i >= 0 && j > i && j - i > 40);
  return i >= 0 && j > i ? s.slice(i, j) : '';
}
/* une fonction du fichier, par son nom, découpée à l'accolade (les chaînes et regex de ces fonctions n'ont pas d'accolade orpheline) */
function fonction(src, nom) {
  const d0 = src.indexOf('  function ' + nom + '(');
  if (d0 < 0) return '';
  let p = 0;
  for (let k = src.indexOf('{', d0); k < src.length; k++) { if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (!p) return src.slice(d0, k + 1); } }
  return '';
}

/* ═════════════════════════════ 1. LA FEUILLE EST ENFERMÉE SOUS .opc ═════════════════════════════ */
console.log('1. La feuille de style est enfermée sous .opc');
const CSS = tranche('la feuille (var CSS = `…`)', 'var CSS = `', '`;\nvar FEUILLE').slice('var CSS = `'.length);
/* parcours des règles : (sélecteur, corps, ancêtres @) ; les @keyframes ne portent pas de sélecteurs d'élément */
const regles = [], medias = [], keyframes = [];
(function parcourir(css, pile) {
  let i = 0; const n = css.length;
  while (i < n) {
    const o = css.indexOf('{', i); if (o < 0) break;
    const pre = css.slice(i, o).replace(/\/\*[\s\S]*?\*\//g, ' ').trim();
    let d = 1, j = o + 1; while (j < n && d) { if (css[j] === '{') d++; else if (css[j] === '}') d--; j++; }
    const corps = css.slice(o + 1, j - 1);
    if (pre.startsWith('@')) {
      if (/^@keyframes/.test(pre)) keyframes.push(pre.replace(/^@keyframes\s+/, ''));
      else { if (/^@media/.test(pre)) medias.push(pre); parcourir(corps, pile.concat(pre)); }
    } else regles.push({ sel: pre, corps, pile });
    i = j;
  }
})(CSS, []);
vrai('(population) plus de huit cents règles, vingt @media, sept animations lues dans la feuille (' + regles.length + ', ' + medias.length + ', ' + keyframes.length + ')', regles.length > 800 && medias.length >= 20 && keyframes.length >= 6);
const selecteurs = [].concat(...regles.map(r => { const l = []; let d = 0, cur = ''; for (const c of r.sel) { if (c === '(' || c === '[') d++; if (c === ')' || c === ']') d--; if (c === ',' && !d) { l.push(cur.trim()); cur = ''; } else cur += c; } l.push(cur.trim()); return l.map(s => ({ s, r })); }));
v('⛔ AUCUN sélecteur ne commence ailleurs que par « .opc » (rien ne peut atteindre l\'application hôte)', selecteurs.filter(x => !/^\.opc(?![\w-])/.test(x.s)).map(x => x.s).slice(0, 5), []);
v('aucun sélecteur ne vise :root, html, body ni « * » seul', selecteurs.filter(x => /(^|[\s,>+~(])(:root|html|body)(?![\w-])/.test(x.s) || /(^|\s)\*$/.test(x.s.replace(/^\.opc(\[[^\]]*\]|:where\([^)]*\))*\s*,?\s*/, '')) && !/^\.opc(:where\([^)]*\))*\s+\*(::\w+)?$/.test(x.s)).map(x => x.s).slice(0, 5), []);
v('⛔ les animations ont des noms PROPRES (opc-…) : « fade » ou « pop » de l\'hôte ne peuvent pas être écrasés', keyframes.filter(k => !/^opc-/.test(k)), []);
const noms = new Set(keyframes);
const animUtilisees = regles.flatMap(r => (r.corps.match(/animation(?:-name)?\s*:[^;}]*/g) || []).flatMap(a => a.replace(/^animation(?:-name)?\s*:/, '').trim().split(/[\s,]+/).filter(t => /^[A-Za-z][\w-]*$/.test(t) && !/^(ease|linear|infinite|none|both|forwards|backwards|alternate|reverse|normal|paused|running|ease-in|ease-out|ease-in-out|initial|inherit|var)$/.test(t))));
vrai('(population) des animations sont utilisées par les règles (' + animUtilisees.length + ')', animUtilisees.length >= 8);
v('chaque animation utilisée est une des animations de la feuille', animUtilisees.filter(a => !noms.has(a)), []);
/* le format se décide sur le CONTENEUR (data-fmt, posé par le module) : aucune requête de largeur sur l'écran, sauf deux, assumées — les feuilles, elles, se posent sur l'écran */
const largeurs = medias.filter(m => /(min|max)-width/.test(m));
v('⛔ les seules requêtes de LARGEUR d\'écran : (max-width:520px), la grille des signataires, dans une feuille', largeurs, ['@media (max-width:520px)']);
vrai('le format passe par data-fmt : des centaines de règles lisent [data-fmt="…"] (' + (CSS.match(/\[data-fmt="/g) || []).length + ')', (CSS.match(/\[data-fmt="/g) || []).length > 150);
vrai('jour / nuit passe par data-theme (aucun @media prefers-color-scheme dans la feuille : l\'HÔTE décide)', !/prefers-color-scheme/.test(CSS) && (CSS.match(/\[data-theme="nuit"\]/g) || []).length >= 3);
const fixes = regles.filter(r => /position:\s*fixed/.test(r.corps)).map(r => r.sel.replace(/\.opc(?![\w-])(:where\([^)]*\))*\s*/g, '').split(',')[0].trim());
v('⛔ `position:fixed` seulement pour le calque, les feuilles, les menus et la notification (la pile iPhone, la colonne des boîtes, le voile et le bouton « écrire » sont ABSOLUS dans le cadre)', Array.from(new Set(fixes)).sort(), ['.menu', '.opc-layer', '.overlay', '.toast']);
v('aucune encoche de l\'appareil lue par le module (l\'hôte gère les siennes) : plus un env() dans la feuille', /env\(/.test(CSS), false);
vrai('les unités de conteneur remplacent celles de l\'écran (cqw) hors calque : ni 27vw, ni 42vw, ni 88vw, ni 52vw, ni 17vw', !/\b(27|42|88|52|17)vw\b/.test(CSS) && /cqw/.test(CSS));
vrai('all:initial sur .opc : les propriétés HÉRITÉES de l\'hôte (police, interlettrage…) ne traversent pas l\'arbre d\'ombre', /\.opc\{\s*all:initial;/.test(CSS));
vrai('la feuille est construite UNE fois et partagée (CSSStyleSheet + adoptedStyleSheets), avec un repli <style>', /new CSSStyleSheet\(\)/.test(CODE) && /adoptedStyleSheets\s*=\s*\[FEUILLE\]/.test(CODE) && /var FEUILLE = null/.test(CODE));
vrai('l\'arbre est un arbre d\'OMBRE (attachShadow, mode ouvert) et le calque est promu dans la couche supérieure (popover manuel, showPopover)', /attachShadow\(\{mode:"open"\}\)/.test(CODE) && /popover="manual"/.test(CODE) && /showPopover\(\)/.test(CODE));
vrai('le format se mesure sur le CONTENEUR (ResizeObserver sur l\'hôte, jamais matchMedia sur la largeur)', /new ResizeObserver\(/.test(CODE) && !/matchMedia\(\s*["']\(\s*(min|max)-width/.test(CODE));

/* ═════════════════════════════ 2. AUCUNE DONNÉE D'EXEMPLE ═════════════════════════════ */
console.log('\n2. Aucune donnée d\'exemple dans le module (ni dans beta.html, ni dans app.html)');
const DEMO = (() => { const sb = { window: {}, localStorage: { getItem: () => null, setItem() {} }, setTimeout: () => 0 }; vm.createContext(sb); vm.runInContext(lire('scratchpad/courrier/source-demo.js'), sb); return sb.window.OPCourrierDemo; })();
const sentinelles = new Set();
DEMO.messages.forEach(m => { if (m.de && m.de.email) sentinelles.add(m.de.email); if (m.objet && m.objet.length > 14) sentinelles.add(m.objet); });
DEMO.boites.forEach(b => { sentinelles.add(b.email); });
vrai('(population) la source de démonstration porte plus de trente messages et plus de soixante sentinelles (' + DEMO.messages.length + ' messages, ' + sentinelles.size + ' sentinelles)', DEMO.messages.length > 30 && sentinelles.size > 40);
for (const f of ['opcourrier.js', 'beta.html', 'app.html', 'beta-build.js']) {
  const t = lire(f);
  v('⛔ ' + f + ' : aucun expéditeur, aucun objet, aucune adresse de la source de démonstration', Array.from(sentinelles).filter(s => t.includes(s)).slice(0, 4), []);
}
const MOTS = [/Maquette/i, /aucun vrai mail/i, /Bêta\s+—/, /OPCOURRIER_SERVEUR/, /sourceDemo/, /courrier-beta/, /Justin Bruel/, /justin@/, /opcourrierB_v2/, /Bêta : /, /\bDEMO\b/];
v('aucun mot de la maquette dans le module (maquette, « aucun vrai mail », drapeau de démonstration, sourceDemo, courrier-beta…)', MOTS.filter(re => re.test(CODE)).map(String), []);
vrai('(population) le test des mots sait voir : « Maquette » ajouté serait trouvé', MOTS.some(re => re.test(CODE + '\nMaquette')));
vrai('la source d\'exemple vit sous scratchpad/courrier/ seulement', fs.existsSync(path.join(RACINE, 'scratchpad/courrier/source-demo.js')) && !fs.existsSync(path.join(RACINE, 'courrier-beta.html')));
vrai('« Simuler la signature » et « Recevoir un mail d\'exemple » existent, mais derrière capacites().simulation (jamais dans une application)', /CAP\.simulation\?'<button type="button" class="btn" data-act="signSim">/.test(CODE) && /CAP\.simulation\?'<div class="strow"><button type="button" class="btn" id="stTest">/.test(CODE));
vrai('l\'état vide invite à ajouter une boîte (« Aucune boîte mail connectée » + « Ajouter une boîte mail »)', /Aucune boîte mail connectée/.test(CODE) && /Ajouter une boîte mail/.test(CODE));

/* ═════════════════════════════ 3. RÉSEAU, STOCKAGE, TITRE ═════════════════════════════ */
console.log('\n3. Pas de réseau, un stockage, un titre qu\'on ne touche pas sans qu\'on le dise');
v('⛔ le module ne sort JAMAIS du réseau : ni fetch, ni XHR, ni WebSocket, ni sendBeacon, ni worker, ni image distante, ni import', ['fetch(', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'importScripts', 'new Image', 'new Worker', 'import(', 'serviceWorker'].filter(x => CODE.includes(x)), []);
const hotes = new Set(Array.from(CODE.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)).map(m => m[1].toLowerCase()));
v('les seules adresses du module : l\'espace de noms SVG (et les adresses d\'aide à la connexion, aucune)', Array.from(hotes).sort(), ['www.w3.org']);
v('ni sessionStorage, ni indexedDB, ni cookie, ni document.write, ni eval', ['sessionStorage', 'indexedDB', 'document.cookie', 'document.write', 'eval('].filter(x => CODE.includes(x)), []);
const persistance = tranche('la persistance (persist, restore, acctExists, validScope)', '  var restoredLost=0;', '  // ---------- Dates ----------');
vrai('⛔ le stockage n\'est touché que DEUX fois dans tout le fichier : persist écrit, restore lit, chacun dans un try', (CODE.match(/localStorage/g) || []).length === 2 && /function persist\(\)\{ try\{[^]*?localStorage\.setItem\(LS,JSON\.stringify\(snap\)\);\s*\}catch\(e\)\{\}/.test(persistance) && /function restore\(\)\{ try\{\s*var raw=localStorage\.getItem\(LS\);[^]*?\}catch\(e\)\{\} \}/.test(persistance));
vrai('la clé est celle de l\'hôte (options.cleStockage), « opcourrier » à défaut — jamais une clé écrite en dur', /var LS = String\(opt\.cleStockage \|\| "opcourrier"\)/.test(CODE) && !/["']elan[B]?_[a-z]/.test(CODE));
vrai('document.title n\'est écrit que si l\'hôte le demande (options.titreDocument) : « (n) » devant SON titre, qui lui est RENDU au démontage', /if\(opt\.titreDocument\) document\.title=\(n\?"\("\+n\+"\) ":""\)\+TITRE_ORIG/.test(CODE) && /if\(opt\.titreDocument\)\{ try\{ document\.title=TITRE_ORIG; \}catch\(e\)\{\} \}/.test(CODE) && (CODE.match(/document\.title\s*=/g) || []).length === 2);
vrai('tout ce que le module accroche hors de son arbre se décroche (sur(), finis, demonter)', /function sur\(cible, type, fn, o\)/.test(CODE) && /finis\.forEach\(function\(f\)\{ try\{ f\(\); \}catch\(e\)\{\} \}\)/.test(CODE) && !/\bwindow\.addEventListener\(/.test(CODE) && !/\bdocument\.addEventListener\(/.test(CODE));
vrai('l\'hôte retire le conteneur sans prévenir : le module s\'éteint de lui-même (hote.isConnected)', /if\(!hote\.isConnected\)\{ demonter\(\); return; \}/.test(CODE));
vrai('les raccourcis clavier n\'écoutent QUE l\'arbre du module (sr.addEventListener), jamais window ni document', !/window\.addEventListener\("key/.test(CODE) && !/document\.addEventListener\("key/.test(CODE) && /sr\.addEventListener\("keydown"/.test(CODE));

/* ═════════════════════════════ 4. LE CONTRAT DE L'ADAPTATEUR ═════════════════════════════ */
console.log('\n4. Le contrat de l\'adaptateur : ce que le module appelle est écrit en tête du fichier, et inversement');
const TETE = MOD.slice(0, MOD.indexOf('(function () {'));
const appelles = Array.from(new Set(Array.from(CODE.matchAll(/\bSRC\.(\w+)/g)).map(m => m[1]))).sort();
const documentes = ['ajouterBoite', 'boites', 'capacites', 'deplacer', 'envois', 'envoyer', 'lire', 'lireMX', 'marquer', 'messages', 'piece', 'retirerBoite', 'simuler', 'suivi'];
v('(population) les méthodes de la source appelées par le module', appelles, documentes);
v('⛔ chacune est DÉCRITE dans le contrat, en tête du fichier', documentes.filter(m => !new RegExp('\\b' + m + '\\(').test(TETE)), []);
v('les options documentées sont celles que le module lit (source, cotes, cote, cleStockage, theme, titre, onCompter, titreDocument, intervalle)', ['source', 'cotes', 'cote', 'cleStockage', 'theme', 'titre', 'onCompter', 'titreDocument', 'intervalle'].filter(o => !new RegExp('\\b' + o + '\\b').test(TETE) || !new RegExp('opt\\.' + o + '\\b').test(CODE)), []);
vrai('la valeur rendue : { demonter, cote, rafraichir }', /return \{\s*demonter:demonter,[\s\S]*?cote:function\(c\)[\s\S]*?rafraichir:function\(o\)/.test(CODE));
vrai('monter exige une source (message clair) et un conteneur', /l’option « source » \(l’adaptateur de données\) est obligatoire/.test(CODE));
const capDecl = (CODE.match(/CAP\[k\]=c\[k\]===true/g) || []).length;
vrai('toute capacité est FAUSSE tant que la source ne dit pas le contraire (=== true, jamais « truthy »)', capDecl === 1 && /var CAP=\{oauth:false,programmeServeur:false,signature:false,marquage:false,deplacement:false,simulation:false,reglagesServeur:false,mx:false,/.test(CODE));
for (const [k, mot] of [['oauth', 'Bientôt : connexion sécurisée'], ['programmeServeur', 'Bientôt : l’envoi à l’heure dite'], ['signature', 'Bientôt : l’envoi du document à signer'], ['destinataires', 'Bientôt : plusieurs destinataires']])
  vrai('« Bientôt » : ce que la source ne sait pas faire (' + k + ') est DIT — « ' + mot + ' »', CODE.includes(mot));
vrai('trois états : liste illisible ≠ liste vide (LOAD.boites wait | ok | ko ; un rejet n\'efface jamais ce qui était lu ; « Réception indisponible » ≠ « Aucun message »)', /LOAD\.boites="ko"/.test(CODE) && /Boîtes mail illisibles/.test(CODE) && /Réception indisponible/.test(CODE) && /LOAD\.msgs\[a\.id\]="ko"/.test(CODE));
vrai('l\'envoi se DIT : « Message envoyé » après la réponse de la source, un échec remet le message dans les brouillons', /function expedier\(m,quiet,fin\)/.test(CODE) && /Envoi impossible : /.test(CODE));

/* ═════════════════════════════ 5. LA PERSISTANCE — LA VRAIE ═════════════════════════════ */
console.log('\n5. La persistance (la vraie persist, la vraie restore)');
const MAJ_OVER = fonction(MOD, 'majOver');
vrai('(tranche trouvée) la fonction majOver (persist la lit : un persist qui jette en silence n\'écrit rien)', MAJ_OVER.length > 80);
function bac(stock) {
  const sb = { MESSAGES: [], ACCOUNTS: [{ id: 'b1', kind: 'pro', name: 'Boîte', email: 'a@x.fr', signature: 'sig' }], OVER: {}, GONE: [], SAVED: { kinds: {}, names: {}, sigs: {} }, SEEN: {},
    state: { scope: 'pro', folder: 'inbox', cat: 'principal', selected: null }, RULES: { senders: {}, domains: {} }, CONTACTS: { 'a@x.fr': true }, SETTINGS: { notif: true, threads: true },
    FOLDERS: [{ id: 'inbox' }, { id: 'sent' }, { id: 'drafts' }], COTES: ['pro'], LS: 'cle-hote', uid: 1, JSON, Date, Object, Array, String, parseInt, Math,
    kindOf: (a) => a.kind, isCat: (c) => ['principal', 'notif', 'recus', 'voyages', 'promos'].includes(c), syncSource() { sb.syncs++; }, syncs: 0, localStorage: stock };
  vm.createContext(sb);
  vm.runInContext(MAJ_OVER + '\n' + persistance + '\n;this.persist=persist; this.restore=restore; this.lost=()=>restoredLost;', sb);
  return sb;
}
{ const ecrits = []; const sb = bac({ setItem: (k, x) => ecrits.push([k, x]), getItem: () => null });
  sb.MESSAGES.push({ id: 's:b1:7', src: true, acct: 'b1', folder: 'inbox', read: true, flagged: false, subject: 'OBJET-DU-SERVEUR-QZX', preview: 'APERCU-QZX', body: ['CORPS-DU-SERVEUR-QZX'], from: { name: 'N', email: 'e@x.fr' }, _srv: { lu: false }, att: [] });
  sb.MESSAGES.push({ id: 'm1', user: true, acct: 'b1', folder: 'outbox', subject: 'ECRIT-PAR-LA-PERSONNE', body: ['TEXTE-ECRIT-QZX'], att: [], _files: ['fichier'], sending: true, to: 'c@x.fr' });
  vm.runInContext('persist()', sb);
  vrai('(population) persist a écrit UNE fois, sous la clé de l\'hôte', ecrits.length === 1 && ecrits[0][0] === 'cle-hote');
  const t = ecrits[0] ? ecrits[0][1] : '', snap = JSON.parse(t || '{}');
  vrai('un instantané versionné (v4)', snap.v === 4);
  v('⛔ ce que la SOURCE rend n\'est jamais copié sur l\'appareil (ni objet, ni aperçu, ni corps, ni expéditeur)', ['OBJET-DU-SERVEUR-QZX', 'APERCU-QZX', 'CORPS-DU-SERVEUR-QZX', 'e@x.fr'].filter(x => t.includes(x)), []);
  vrai('…seul l\'état de la personne l\'est (lu / drapeau / dossier de ce message reçu)', snap.msgs && snap.msgs['s:b1:7'] && snap.msgs['s:b1:7'].read === true && snap.msgs['s:b1:7'].a === 'b1');
  vrai('ce que la personne ÉCRIT l\'est (brouillons, envoyés), sans les champs de travail (_files, sending)', snap.user.length === 1 && snap.user[0].subject === 'ECRIT-PAR-LA-PERSONNE' && !('_files' in snap.user[0]) && !('sending' in snap.user[0]));
  vrai('persist rend la main à la source : le lu / le dossier changés partent (syncSource)', sb.syncs === 1);
  vrai('le côté, le nom et la signature de la boîte se gardent', snap.kinds.b1 === 'pro' && snap.names.b1 === 'Boîte' && snap.sigs.b1 === 'sig');
  /* et ça se relit : une autre séance */
  const sb2 = bac({ setItem() {}, getItem: () => t });
  vm.runInContext('restore()', sb2);
  vrai('restore relit les règles, le côté, les brouillons ; un envoi resté « en cours » revient dans les BROUILLONS (on ne sait pas s\'il est parti) et se DIT', sb2.MESSAGES.length === 1 && sb2.MESSAGES[0].folder === 'drafts' && sb2.lost() === 1);
  v('restore relit l\'état local des messages reçus', Object.keys(sb2.OVER), ['s:b1:7']); }
{ let n = 0; const sb = bac({ setItem: () => { n++; throw new Error('quota'); }, getItem: () => { n++; throw new Error('refusé'); } });
  let jete = null; try { vm.runInContext('persist(); restore();', sb); } catch (e) { jete = String(e); }
  vrai('(population) le stockage a été touché (et il a jeté) : ' + n + ' accès', n === 2);
  v('⛔ un stockage qui JETTE (quota, navigation privée) ne casse ni persist ni restore', jete, null); }
{ const sb = bac({ setItem() {}, getItem: () => JSON.stringify({ v: 3, scope: 'perso', folder: 'sent', cat: 'notif', rules: { senders: { 'x@y.fr': 'junk' }, domains: {} }, user: [{ id: 'm9', acct: 'a1', folder: 'sent' }], accounts: [{ id: 'z' }] }) });
  vm.runInContext('restore()', sb);
  vrai('un instantané de la MAQUETTE (v3) est ignoré : ni règles, ni messages, ni côté repris', sb.MESSAGES.length === 0 && sb.state.scope === 'pro' && Object.keys(sb.RULES.senders).length === 0); }
{ const sb = bac({ setItem() {}, getItem: () => JSON.stringify({ v: 4, scope: 'perso', user: [] }) });
  vm.runInContext('restore()', sb);
  v('un seul côté (COTES=[pro]) : un côté mémorisé qui n\'existe pas retombe sur le côté permis', sb.state.scope, 'pro'); }

/* ═════════════════════════════ 6. LES FONCTIONS QUI TRADUISENT LA SOURCE ═════════════════════════════ */
console.log('\n6. Ce que la source rend, tel que le module le lit');
const SUIVI_VAR = (MOD.match(/  var SUIVI_ETATS=\[[^;]*;/) || [''])[0];
vrai('(tranche trouvée) la liste des trois états du suivi', SUIVI_VAR.length > 60);
const FN = [SUIVI_VAR, 'msgErr', 'paragraphes', 'texteDe', 'folderOfStrict', 'attDe', 'suiviDe', 'depuisSource', 'surOver', 'dossierServeur', 'firstLine'].map(n => { if (n.startsWith('  var')) return n; const f = fonction(MOD, n); vrai('(tranche trouvée) la fonction ' + n, f.length > 40); return f; }).join('\n');

const bacTraduction = () => { const sb = { FOLDERS: [{ id: 'inbox' }, { id: 'sent' }, { id: 'archive' }, { id: 'junk' }, { id: 'trash' }], OVER: {}, CAP: { marquage: false, deplacement: false }, isCat: (c) => c === 'notif', String, Array, Date };
  vm.createContext(sb); vm.runInContext(FN + '\n;this.depuisSource=depuisSource; this.paragraphes=paragraphes; this.surOver=surOver; this.dossierServeur=dossierServeur; this.msgErr=msgErr;', sb); return sb; };
{ const sb = bacTraduction();
  const m = sb.depuisSource({ id: 7, de: { nom: 'Claire', email: 'c@x.fr' }, a: 'moi', objet: 'Sujet', corps: 'Un\n\nDeux\ntrois', date: 1000, lu: false, drapeau: true, pj: [{ nom: 'a.pdf', taille: '1 Ko', type: 'doc' }], ancien: true }, 'b1', 'inbox');
  v('depuisSource : identifiant préfixé de la boîte (deux boîtes ne se marchent pas dessus), expéditeur, état', [m.id, m.sid, m.acct, m.from.email, m.read, m.flagged, m.src, m.ancien, m.folder], ['s:b1:7', '7', 'b1', 'c@x.fr', false, true, true, true, 'inbox']);
  v('depuisSource : le texte devient des paragraphes (ligne vide = nouveau paragraphe)', JSON.parse(JSON.stringify(m.body)), ['Un', 'Deux\ntrois']);
  v('depuisSource : une pièce jointe, une date', [m.att.length, m.att[0].name, m.at], [1, 'a.pdf', 1000]);
  const sans = sb.depuisSource({ id: 'k', objet: 'x' }, 'b1', 'inbox');
  vrai('depuisSource : sans corps → body null (SRC.lire à l\'ouverture), sans expéditeur → message envoyé (from null)', sans.body === null && sans.from === null);
  vrai('depuisSource : un dossier inconnu retombe sur celui demandé, jamais sur un dossier fantôme', sb.depuisSource({ id: 1, dossier: 'nimportequoi' }, 'b1', 'sent').folder === 'sent');
  v('paragraphes : un tableau passe tel quel (citations comprises), un texte vide donne []', [JSON.parse(JSON.stringify(sb.paragraphes(['a', ['quote', 'b']]))), sb.paragraphes('  ').length], [['a', ['quote', 'b']], 0]);
  v('msgErr : un message lisible, sinon le défaut, jamais « undefined »', [sb.msgErr(new Error('refusé'), 'x'), sb.msgErr(null, 'défaut'), sb.msgErr({}, '')], ['refusé', 'défaut', 'erreur inconnue']);
  /* l'état local ne gagne que là où la source ne le garde pas */
  const a = sb.depuisSource({ id: 1, lu: false }, 'b1', 'inbox'); sb.OVER[a.id] = { read: true, flagged: true, folder: 'archive', co: 'notif', uj: 1 };
  sb.surOver(a); v('surOver (la source ne garde rien) : lu, drapeau, dossier et rangement de la personne s\'appliquent', [a.read, a.flagged, a.folder, a.co, a.uj], [true, true, 'archive', 'notif', true]);
  sb.CAP.marquage = true; sb.CAP.deplacement = true; const b = sb.depuisSource({ id: 2, lu: false }, 'b1', 'inbox'); sb.OVER[b.id] = { read: true, flagged: true, folder: 'archive' };
  sb.surOver(b); v('surOver (la source garde lu et dossier) : c\'est ELLE qui décide', [b.read, b.flagged, b.folder], [false, false, 'inbox']);
  const t = sb.depuisSource({ id: 3 }, 'b1', 'inbox');
  v('dossierServeur : un tri automatique vers Indésirables n\'est PAS un geste de la personne (la source ne l\'apprend pas)', (t.folder = 'junk', t.aj = true, t._srv.dos = 'inbox', sb.dossierServeur(t)), 'inbox');
  v('dossierServeur : un déplacement fait à la main, lui, part', (t.aj = false, t.folder = 'archive', sb.dossierServeur(t)), 'archive'); }

(async () => {
/* l'envoi programmé sans service côté source : il part PAGE OUVERTE ; un message dont l'heure est passée DEPUIS LONGTEMPS ne part pas tout seul */
{ const f = fonction(MOD, 'enRetard'); vrai('(tranche trouvée) la fonction enRetard', f.length > 40);
  const sb = { CAP: { programmeServeur: false }, MIN: 60000, RETARD_MAX: 120000, Date }; vm.createContext(sb); vm.runInContext(f + '\n;this.enRetard=enRetard;', sb);
  const m = (dt) => ({ folder: 'scheduled', sendAt: Date.now() - dt });
  v('⛔ sans service d\'envoi côté source : à l\'heure (ou 1 min de retard) le message part ; passé de plus de 2 min (page fermée entre-temps) il ATTEND un geste', [sb.enRetard(m(0)), sb.enRetard(m(60000)), sb.enRetard(m(3 * 3600000))], [false, false, true]);
  sb.CAP.programmeServeur = true; v('avec un service d\'envoi côté source, jamais « en retard » (c\'est lui qui envoie)', sb.enRetard(m(3 * 3600000)), false); }

/* l'ENVOI : la vraie `expedier` — « envoyé » ne s'écrit qu'APRÈS la réponse de la source, un échec remet le message dans les brouillons et le dit */
console.log('\n   L\'envoi : la vraie expedier');
{ const EXP = ['expedier', 'courrierDe', 'msgErr', 'bodyText'].map(n => { const f = fonction(MOD, n); vrai('(tranche trouvée) la fonction ' + n, f.length > 30); return f; }).join('\n');
  const joue = async (envoyer, extra) => {
    const notes = []; const sb = { vivant: true, SRC: { envoyer }, acctOf: () => ({ sid: 'b1', email: 'a@x.fr', name: 'A' }), learnContacts: () => notes.push('contacts'), renderAll: () => notes.push('rendu'), persist: () => notes.push('persist'),
      charger: () => notes.push('charger'), toast: (t) => notes.push('toast:' + t), Date, Array, String, Promise, setTimeout };
    vm.createContext(sb); vm.runInContext(EXP + '\n;this.expedier=expedier;', sb);
    const m = Object.assign({ id: 'm1', acct: 'b1', to: 'c@x.fr', subject: 'S', body: ['Bonjour'], folder: 'outbox', _files: ['f'], sendAt: 5 }, extra || {}); let fin = null;
    sb.expedier(m, false, (ok) => { fin = ok; }); await new Promise(r => setTimeout(r, 20));
    return { m, fin, notes, sb }; };
  const a = await joue(async (mail) => { if (mail.boite !== 'b1' || mail.a !== 'c@x.fr' || mail.objet !== 'S' || mail.texte !== 'Bonjour') throw new Error('courrier mal formé'); });
  v('envoi réussi : le message passe dans Envoyés, ses fichiers sont lâchés, les contacts appris', [a.m.folder, '_files' in a.m, 'sendAt' in a.m, a.fin, a.notes.includes('contacts')], ['sent', false, false, true, true]);
  const b = await joue(async () => { throw new Error('refusé par le serveur (essai)'); });
  v('⛔ envoi REFUSÉ : le message retourne dans les BROUILLONS (jamais « Envoyé »), l\'erreur de la source est DITE', [b.m.folder, b.fin, b.notes.filter(x => /^toast:/.test(x))], ['drafts', false, ['toast:Envoi impossible : refusé par le serveur (essai) — le message est dans Brouillons']]);
  const c = await joue(async () => { throw 'texte brut'; });
  vrai('un échec qui n\'est pas une Error ne jette pas non plus (il se dit « échec »)', c.m.folder === 'drafts' && /Envoi impossible : /.test(c.notes.join('|')));
  /* répondre dans le fil : la source reçoit l'identifiant du message auquel on répond, un nouveau message n'en porte pas */
  let recu = null;
  const r1 = await joue(async (mail) => { recu = mail; }, { repA: 's7' });
  v('⛔ une RÉPONSE porte enReponseA (l\'identifiant du message de la source), et la marque est lâchée après l\'envoi', [recu.enReponseA, 'repA' in r1.m, r1.notes.includes('charger')], ['s7', false, true]);
  let recu2 = null; const r2 = await joue(async (mail) => { recu2 = mail; });
  vrai('⛔ un NOUVEAU message ne porte aucun enReponseA (la clé n\'existe même pas : la source n\'invente pas de fil)', !('enReponseA' in JSON.parse(JSON.stringify(recu2))) && !r2.notes.includes('charger'));
  const r3 = await joue(async () => { throw new Error('refusé'); }, { repA: 's7' });
  vrai('…et un envoi REFUSÉ garde la marque (le brouillon rouvert répond toujours dans le fil)', r3.m.repA === 's7' && r3.m.folder === 'drafts'); }


/* ═════════════════════════════ 8. LES QUATRE GESTES D'AVANT : ENVOIS TEAMOP, PIÈCE REÇUE, SUIVI, RÉPONSE DANS LE FIL ═════════════════════════════ */
console.log('\n8. Envois TeamOP, télécharger une pièce, suivi d\'une demande, répondre dans le fil');
const attente = (ms) => new Promise(r => setTimeout(r, ms || 15));
{ /* les déclarations : faux tant que la source ne dit pas vrai ET n'a pas la méthode */
  const AC = fonction(MOD, 'appliquerCapacites');
  vrai('(tranche trouvée) appliquerCapacites', AC.length > 200);
  const joueCap = (c, src) => { const sb = { CAP: { dossiers: ['inbox'] }, SRC: src, state: { folder: 'envois' }, folderOfStrict: (d) => ({ id: d, journal: d === 'envois' }), Array }; vm.createContext(sb);
    vm.runInContext(AC + '\n;this.ap=appliquerCapacites;', sb); sb.ap(c); return sb; };
  const r0 = joueCap({ journalEnvois: true, telechargerPiece: true, suivi: true }, {});
  v('⛔ déclarés SANS la méthode correspondante, les trois gestes restent éteints (le module ne promet rien qu\'il ne sait pas appeler)', [r0.CAP.journalEnvois, r0.CAP.telechargerPiece, r0.CAP.suivi], [false, false, false]);
  v('…et un dossier « envois » mémorisé retombe sur la Réception quand le journal n\'existe pas', r0.state.folder, 'inbox');
  const r1 = joueCap({ journalEnvois: true, telechargerPiece: true, suivi: true }, { envois() {}, piece() {}, suivi() {} });
  v('⛔ déclarés ET méthodes présentes : allumés', [r1.CAP.journalEnvois, r1.CAP.telechargerPiece, r1.CAP.suivi, r1.state.folder], [true, true, true, 'envois']);
  const r2 = joueCap({ journalEnvois: 'oui', telechargerPiece: 1, suivi: {} }, { envois() {}, piece() {}, suivi() {} });
  v('…jamais sur une valeur « truthy » (=== true)', [r2.CAP.journalEnvois, r2.CAP.telechargerPiece, r2.CAP.suivi], [false, false, false]);
  const r3 = joueCap({ journalEnvois: true, dossiers: ['inbox', 'envois', 'sent'] }, { envois() {} });
  v('⛔ « envois » n\'est JAMAIS un dossier que la source remplit (le module ne lui demande pas ses messages)', r3.CAP.dossiers, ['inbox', 'sent']);
}
{ /* le journal : la vraie chargerJournal et la vraie depuisJournal */
  const F = ['paragraphes', 'texteDe', 'firstLine', 'msgErr', 'depuisJournal', 'chargerJournal'].map(n => { const f = fonction(MOD, n); vrai('(tranche trouvée) la fonction ' + n, f.length > 40); return f; }).join('\n');
  const bacJ = (src, cap) => { const sb = { CAP: { journalEnvois: cap !== false }, SRC: src, MESSAGES: [{ id: 's:b1:1', src: true, folder: 'inbox' }], LOAD: { envois: '', envErr: '' }, Promise, Array, String, Error }; vm.createContext(sb); vm.runInContext(F + '\n;this.chargerJournal=chargerJournal;', sb); return sb; };
  const sb = bacJ({ envois: async () => [{ id: 'a-1', a: 'x@y.fr', objet: 'Code', corps: 'Votre code.\n\nMerci', date: 5000, etat: 'echec' }, { id: 'a-1', a: 'doublon', objet: 'D' }, { id: 'b-1', a: 'z@y.fr', objet: 'Invitation', date: 4000, etat: 'bizarre' }, null, { a: 'sans id' }] });
  await sb.chargerJournal();
  const jr = sb.MESSAGES.filter(m => m.jr);
  v('⛔ chargerJournal : chaque ligne du serveur devient un message en LECTURE SEULE du dossier « envois », sans boîte ni expéditeur ; les doublons et lignes sans identifiant sont écartés', jr.map(m => [m.id, m.folder, m.acct, m.from, m.to, m.subject, m.read, m.flagged, m.at, m.etat]),
    [['j:a-1', 'envois', '', null, 'x@y.fr', 'Code', true, false, 5000, 'echec'], ['j:b-1', 'envois', '', null, 'z@y.fr', 'Invitation', true, false, 4000, '']]);
  v('…le texte devient des paragraphes, l\'aperçu est sa première ligne', [JSON.parse(JSON.stringify(jr[0].body)), jr[0].preview], [['Votre code.', 'Merci'], 'Votre code. Merci']);
  vrai('…et les messages des boîtes ne sont pas touchés', sb.MESSAGES.some(m => m.id === 's:b1:1') && sb.LOAD.envois === 'ok');
  let fails = true; const sb2 = bacJ({ envois: async () => { if (fails) throw new Error('journal en panne'); return []; } });
  sb2.MESSAGES.push({ id: 'j:vieux', jr: true, folder: 'envois' });
  await sb2.chargerJournal();
  v('⛔ un journal qui ne répond pas est « ko » et se DIT ; ce qu\'on avait lu reste (jamais « aucun envoi »)', [sb2.LOAD.envois, sb2.LOAD.envErr, sb2.MESSAGES.filter(m => m.jr).length], ['ko', 'journal en panne', 1]);
  fails = false; await sb2.chargerJournal();
  v('…et quand il répond VIDE, le journal est vide (et lu : « ok »)', [sb2.LOAD.envois, sb2.MESSAGES.filter(m => m.jr).length], ['ok', 0]);
  const sb3 = bacJ({ envois: async () => ({}) }); await sb3.chargerJournal();
  v('une réponse qui n\'est pas une liste est une panne, pas un journal vide', sb3.LOAD.envois, 'ko');
  let appele = 0; const sb4 = bacJ({ envois: async () => { appele++; return []; } }, false); sb4.MESSAGES.push({ id: 'j:x', jr: true });
  await sb4.chargerJournal();
  v('⛔ source qui ne déclare pas le journal : AUCUN appel, et aucune ligne de journal ne subsiste', [appele, sb4.MESSAGES.filter(m => m.jr).length], [0, 0]);
}
{ /* la page de lecture d'un envoi : texte échappé, rien d'exécuté, aucun geste de rangement */
  const F = ['journalHtml', 'initials', 'fmtFull', 'fmtDate', 'tsOf'].map(n => fonction(MOD, n)).join('\n');
  const sb = { H: (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), I: { warn: '<svg>W</svg>', sent: '<svg>S</svg>' }, String, Date, Array };
  vm.createContext(sb); vm.runInContext('function cap(s){return s}\nfunction initials(n){return String(n||"?").slice(0,2).toUpperCase()}\nfunction fmtFull(t){return "F"+t}\nfunction fmtDate(t){return "D"+t}\nfunction tsOf(m){return m.at}\n' + fonction(MOD, 'journalHtml') + '\n;this.j=journalHtml;', sb);
  void F;
  const h = sb.j({ subject: '<img src=x onerror=alert(1)>', to: 'a"b@y.fr', at: 9, etat: '', body: ['<script>alert(2)</script>\nligne'] });
  vrai('⛔ le journal est écrit comme du TEXTE : ni balise, ni gestionnaire d\'événement qui survive', !/<img|<script|onerror=alert/.test(h.replace(/&lt;[^]*?&gt;/g, '')) && h.includes('&lt;script&gt;alert(2)&lt;/script&gt;'));
  vrai('…aucun bouton de rangement ni de réponse (lecture seule), aucun lien', !/<button|<a |data-act|data-quick|href=/.test(h));
  vrai('…un envoi qui n\'est pas parti le DIT, un envoi sans texte aussi', /Non parti/.test(sb.j({ subject: 's', to: 'a', at: 1, etat: 'echec', body: [] })) && /aperçu non conservé/.test(sb.j({ subject: 's', to: 'a', at: 1, etat: '', body: [] })) && /Pas encore parti/.test(sb.j({ subject: 's', to: 'a', at: 1, etat: 'retard', body: ['x'] })));
}
{ /* l'état de la liste : un journal ne se trie pas, ne se marque pas, ne reçoit pas de réponse */
  const dA = fonction(MOD, 'doAct'); vrai('(tranche trouvée) doAct', dA.length > 500);
  vrai('⛔ doAct ne fait RIEN sur une ligne du journal (jr) : première instruction, avant tout geste', /var m=id\?msgById\(id\):msgById\(state\.selected\); if\(!m\|\|m\.jr\) return;/.test(dA));
  const RA = fonction(MOD, 'readActsHtml'), RT = fonction(MOD, 'readToolsHtml');
  vrai('⛔ …les barres d\'actions d\'un journal ne portent que la navigation précédent / suivant', /if\(m&&m\.jr\) return nav;/.test(RA) && /if\(!m\|\|m\.jr\) return '';/.test(RT));
  const SM = fonction(MOD, 'setMulti');
  vrai('…et la sélection multiple y est refusée (dite)', /folderOf\(state\.folder\)\.journal\)\{ toast\(/.test(SM));
  vrai('…inScopeOf laisse passer une ligne du journal quelle que soit la vue (Pro, Perso, une boîte) — elle n\'a pas de boîte', /function inScopeOf\(m,sc\)\{ if\(sc==="all"\|\|m\.jr\) return true;/.test(CODE));
}
{ /* télécharger une pièce */
  const NOM = fonction(MOD, 'nomFichierSur'), TEL = fonction(MOD, 'telechargerPiece');
  vrai('(tranche trouvée) nomFichierSur et telechargerPiece', NOM.length > 200 && TEL.length > 600);
  const sbn = {}; vm.createContext(sbn); vm.runInContext(NOM + '\n;this.n=nomFichierSur;', sbn);
  const N = (x) => sbn.n(x);
  v('⛔ nomFichierSur : un chemin n\'en est pas un (../, \\, :, *, ?, <, >, |, ") — il ne sort jamais du dossier de téléchargement', [N('../../etc/passwd'), N('C:\\Windows\\x.dll'), N('a<b>c|d?e*f".pdf')], ['_.._etc_passwd', 'C_Windows_x.dll', 'a_b_c_d_e_f_.pdf']);
  v('…ni point ni espace au début ou à la fin (fichier caché, extension masquée)', [N('..bashrc'), N('  rapport.pdf. '), N('.hidden')], ['bashrc', 'rapport.pdf', 'hidden']);
  v('⛔ …un caractère de contrôle ou une INVERSION de sens d\'écriture (U+202E : « fdp.exe » qui se lit « exe.pdf ») est retiré', [N('facture\u202Eexe.pdf'), N('a\u0000b\u001f.txt'), N('x\u200b\u2066y.doc')], ['factureexe.pdf', 'ab.txt', 'xy.doc']);
  v('…un nom réservé de Windows (CON, NUL, COM1, LPT9, AUX…) est préfixé', [N('CON'), N('nul.txt'), N('com1.pdf'), N('aux')], ['_CON', '_nul.txt', '_com1.pdf', '_aux']);
  v('…vide, ou fait de points : « piece-jointe », jamais un nom vide', [N(''), N(null), N('...'), N(undefined)], ['piece-jointe', 'piece-jointe', 'piece-jointe', 'piece-jointe']);
  const long = N('a'.repeat(300) + '.pdf');
  vrai('…un nom trop long est raccourci en gardant son extension', long.length === 120 && long.endsWith('.pdf'), long.length);
  v('un nom ordinaire (accents, espaces) ne change pas', N('Devis été 2026 (v2).pdf'), 'Devis été 2026 (v2).pdf');
  /* le geste, avec la vraie fonction */
  const bacT = (src, cap) => { const notes = [], liens = [];
    const sb = { CAP: { telechargerPiece: cap !== false }, SRC: src, vivant: true, Promise, Blob, String, Error, setTimeout: () => 0, URL: { createObjectURL: (b) => { notes.push('url:' + b.type + ':' + b.size); return 'blob:essai'; }, revokeObjectURL() {} },
      document: { createElement: () => { const l = { click() { liens.push({ href: l.href, download: l.download, rel: l.rel, hidden: l.hidden }); } }; return l; } }, sr: { appendChild() {}, removeChild() {} },
      toast: (t) => notes.push('toast:' + t), msgErr: (e, d) => (e && e.message) || d, nomFichierSur: N };
    vm.createContext(sb); vm.runInContext(TEL + '\n;this.tel=telechargerPiece;', sb); return { sb, notes, liens }; };
  const piece = { id: '0', name: '../facture\u202Eexe.pdf', size: '2 Ko', kind: 'doc' }, msg = { sid: 'b|1|INBOX', src: true, att: [piece] };
  let demandes = []; const T = bacT({ piece: async (id, p) => { demandes.push([id, p]); return new Blob(['%PDF contenu'], { type: 'text/html' }); } });
  T.sb.tel(msg, 0, null); await attente();
  v('⛔ telechargerPiece : demande (message, pièce) à la source, enregistre sous un nom ASSAINI', [demandes, T.liens.map(l => l.download)], [[['b|1|INBOX', '0']], ['_factureexe.pdf']]);
  vrai('⛔ …le contenu est rendu NEUTRE (octet-stream) : un « text/html » de la source ne devient jamais une page ; lien masqué, sans opener', T.notes.includes('url:application/octet-stream:12') && T.liens[0].hidden === true && T.liens[0].rel === 'noopener' && T.liens[0].href === 'blob:essai', T.notes);
  vrai('…et la personne est prévenue', T.notes.some(n => /^toast:Pièce téléchargée : /.test(n)));
  const T2 = bacT({ piece: async () => { await attente(30); return new Blob(['x']); } }); const m2 = { sid: 'i', src: true, att: [{ id: '3', name: 'a.txt' }] };
  T2.sb.tel(m2, 0, null); T2.sb.tel(m2, 0, null); await attente(60);
  v('⛔ un double clic ne télécharge qu\'UNE fois (la pièce est marquée en cours)', T2.liens.length, 1);
  T2.sb.tel(m2, 0, null); await attente(60);
  v('…et on peut la retélécharger ensuite', T2.liens.length, 2);
  const T3 = bacT({ piece: async () => { throw new Error('pièce introuvable'); } }); T3.sb.tel({ sid: 'i', src: true, att: [{ id: '3', name: 'a' }] }, 0, null); await attente();
  v('⛔ un refus de la source se DIT (« Téléchargement impossible »), aucun fichier', [T3.notes.filter(n => /^toast:/.test(n)), T3.liens.length], [['toast:Téléchargement impossible : pièce introuvable'], 0]);
  const T4 = bacT({ piece: async () => 'pas un blob' }); T4.sb.tel({ sid: 'i', src: true, att: [{ id: '3', name: 'a' }] }, 0, null); await attente();
  v('⛔ ce qui n\'est pas un Blob est refusé (jamais écrit comme un fichier)', [T4.liens.length, T4.notes.filter(n => /^toast:/.test(n))], [0, ['toast:Téléchargement impossible : pièce illisible']]);
  let n5 = 0; const T5 = bacT({ piece: async () => { n5++; return new Blob(['x']); } }, false); T5.sb.tel({ sid: 'i', src: true, att: [{ id: '3', name: 'a' }] }, 0, null); await attente();
  const T6 = bacT({ piece: async () => { n5++; return new Blob(['x']); } }); T6.sb.tel({ sid: 'i', src: true, att: [{ name: 'sans identifiant' }] }, 0, null); T6.sb.tel({ sid: 'i', src: false, att: [{ id: '1', name: 'écrit ici' }] }, 0, null); await attente();
  v('⛔ source qui ne déclare pas le geste, pièce sans identifiant, message écrit ici : AUCUN appel à la source', n5, 0);
  const RD = fonction(MOD, 'renderReading');
  vrai('⛔ le bouton n\'est dessiné QUE si la source sait télécharger ET que la pièce a un identifiant (dlOk && a.id != null), sur un message de la source', /var dlOk=!!m\.src&&CAP\.telechargerPiece&&typeof SRC\.piece==="function";/.test(RD) && /\(dlOk&&a\.id!=null\?'<button type="button" class="att-dl"/.test(RD));
  vrai('…et le nom de la pièce est ÉCHAPPÉ dans le libellé du bouton', /aria-label="Télécharger '\+H\(a\.name\)\+'"/.test(RD));
}
{ /* le suivi d'une demande */
  const SH = fonction(MOD, 'suiviHtml'), CS = fonction(MOD, 'changerSuivi'), SU = fonction(MOD, 'suiviDe');
  vrai('(tranche trouvée) suiviHtml, changerSuivi, suiviDe', SH.length > 300 && CS.length > 500 && SU.length > 100);
  const H = (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const bacS = (cap, src) => { const notes = []; const sb = { CAP: { suivi: cap !== false }, SRC: src, SUIVI_ETATS: [['aTraiter', 'À traiter'], ['enCours', 'En cours'], ['resolu', 'Résolu']], H, vivant: true, Promise, String, Error, notes,
      repeindreSuivi: (m, f) => notes.push('repeint:' + m.suivi.statut + ':' + m.suivi.assigne + ':' + (f || '')), toast: (t) => notes.push('toast:' + t), msgErr: (e, d) => (e && e.message) || d };
    vm.createContext(sb); vm.runInContext(SU + '\n' + SH + '\n' + CS + '\n;this.sh=suiviHtml; this.cs=changerSuivi; this.sd=suiviDe;', sb); return sb; };
  const base = () => ({ id: 's:b:1', sid: 'b|1|INBOX', src: true, folder: 'inbox', suivi: { statut: 'aTraiter', assigne: 'Léa "<b>"', par: 'Patron' } });
  const S1 = bacS(true, { suivi() {} });
  const h = S1.sh(base());
  vrai('⛔ suiviHtml : trois états, le courant est « pressé », la personne et le dernier geste y sont — ÉCHAPPÉS', (h.match(/data-suivi="/g) || []).length === 3 && /data-suivi="aTraiter" aria-pressed="true"/.test(h) && /data-suivi="resolu" aria-pressed="false"/.test(h) && h.includes('Léa &quot;&lt;b&gt;&quot;') && /Dernier geste : Patron/.test(h) && !/<b>/.test(h));
  v('⛔ …rien sans CAP.suivi, rien sur un message écrit ici, rien hors de la Réception, rien sans suivi connu (jamais un faux « à traiter »)', [bacS(false, { suivi() {} }).sh(base()), S1.sh(Object.assign(base(), { src: false })), S1.sh(Object.assign(base(), { folder: 'archive' })), S1.sh(Object.assign(base(), { suivi: null })), bacS(true, {}).sh(base())], ['', '', '', '', '']);
  v('suiviDe : trois états seulement, le reste n\'est pas un suivi', [S1.sd({ statut: 'enCours', assigne: 'x', par: 'y' }), S1.sd({ statut: 'inventé' }), S1.sd(null), S1.sd('resolu')], [{ statut: 'enCours', assigne: 'x', par: 'y' }, null, null, null]);
  /* le geste : appliqué d'abord, confirmé ou défait ensuite */
  let rendre = null; const S2 = bacS(true, { suivi: (id, p) => new Promise((ok) => { rendre = () => ok({ statut: 'resolu', assigne: 'Zoé', par: 'Agent' }); }) }); const m = base();
  S2.cs(m, { statut: 'resolu' }); await attente();
  v('⛔ changerSuivi : l\'état s\'applique AVANT la réponse (le doigt n\'attend pas le serveur), le focus revient sur le bouton touché', [m.suivi.statut, S2.notes], ['resolu', ['repeint:resolu:Léa "<b>":resolu']]);
  rendre(); await attente();
  v('…puis la réponse du serveur fait foi (personne et dernier geste compris)', m.suivi, { statut: 'resolu', assigne: 'Zoé', par: 'Agent' });
  const S3 = bacS(true, { suivi: async () => { throw new Error('serveur en panne'); } }); const m3 = base(); S3.cs(m3, { statut: 'enCours' }); await attente();
  v('⛔ un refus DÉFAIT le geste et le dit (l\'écran ne ment pas sur ce que le serveur a retenu)', [m3.suivi.statut, S3.notes.filter(n => /^toast/.test(n))], ['aTraiter', ['toast:Suivi non enregistré : serveur en panne']]);
  let appels = 0; const S4 = bacS(true, { suivi: async () => { appels++; return {}; } }); const m4 = base();
  S4.cs(m4, { statut: 'aTraiter' }); S4.cs(m4, { assigne: 'Léa "<b>"' }); S4.cs(Object.assign(base(), { src: false }), { statut: 'resolu' }); S4.cs(Object.assign(base(), { suivi: null }), { statut: 'resolu' }); bacS(false, { suivi: async () => { appels++; return {}; } }).cs(base(), { statut: 'resolu' }); await attente();
  v('⛔ rien ne part si rien ne change, ni sur un message écrit ici, ni sans suivi connu, ni sans CAP.suivi', appels, 0);
  const S5 = bacS(true, { suivi: async (id, p) => { S5.recu = [id, p]; return { statut: 'aTraiter', assigne: 'Max', par: 'P' }; } }); const m5 = base(); S5.cs(m5, { assigne: 'Max' }); await attente();
  v('…la personne seule part SANS statut (le serveur ne touche pas à ce qu\'on ne lui dit pas)', S5.recu, ['b|1|INBOX', { assigne: 'Max' }]);
  const RD = fonction(MOD, 'renderReading');
  vrai('⛔ la ligne de suivi est posée dans la lecture d\'un message reçu (catLine += suiviHtml(m))', /catLine\+=suiviHtml\(m\);/.test(RD));
}
{ /* répondre dans le fil */
  const RM = fonction(MOD, 'replyModel'), CD = fonction(MOD, 'courrierDe');
  vrai('(tranche trouvée) replyModel et courrierDe', RM.length > 300 && CD.length > 100);
  const sb = { acctOf: () => ({ email: 'moi@x.fr', sid: 'b1', name: 'Moi' }), quoteOf: () => '> citation', emailOf: (m) => m.from.email, bodyText: () => 'texte', Array, String };
  vm.createContext(sb); vm.runInContext(RM + '\n' + CD + '\n;this.rm=replyModel; this.cd=courrierDe;', sb);
  const recu = { src: true, sid: 's7', acct: 'b1', from: { name: 'C', email: 'c@x.fr' }, subject: 'Question', folder: 'inbox', rcpt: [] };
  v('⛔ replyModel : répondre à un message de la source garde SON identifiant (enReponseA) — Répondre comme Répondre à tous', [sb.rm(recu, false).enReponseA, sb.rm(recu, true).enReponseA], ['s7', 's7']);
  v('…répondre à un message écrit ici (envoyé, brouillon) ne référence rien', sb.rm({ src: false, acct: 'b1', from: null, to: 'a@x.fr', subject: 'S', folder: 'sent' }, false).enReponseA, null);
  v('courrierDe : la marque du brouillon (repA) devient enReponseA ; sans marque, la clé est absente de ce que la source reçoit', [sb.cd({ acct: 'b1', to: 'a@x.fr', subject: 'S', repA: 's7' }).enReponseA, 'enReponseA' in JSON.parse(JSON.stringify(sb.cd({ acct: 'b1', to: 'a@x.fr', subject: 'S' })))], ['s7', false]);
  const OC = fonction(MOD, 'openCompose'), FM = fonction(MOD, 'fillMsg'), DA = fonction(MOD, 'doAct');
  vrai('⛔ le composeur retient enReponseA, le rend avec les champs, le brouillon (fillMsg) le garde (repA) et le rouvre', /state\.compose=\{[^}]*enReponseA:model\.enReponseA\|\|null/.test(OC) && /enReponseA:state\.compose\.enReponseA\}; \}/.test(OC) && /if\(d\.enReponseA\) m\.repA=String\(d\.enReponseA\); else delete m\.repA;/.test(FM) && /enReponseA:m\.repA\|\|null\}\);/.test(DA));
  vrai('…la réponse rapide aussi répond dans le fil', /enReponseA:rm\?rm\.enReponseA:null\}\); \}/.test(CODE));
}

/* ═════════════════════════════ 7. LE SITE ET LES SONDES ═════════════════════════════ */
console.log('\n7. Dans le site assemblé, et gardé');
vrai('opcourrier.js est à la racine : le script d\'assemblage prend les *.js de la racine par leur forme', fs.existsSync(path.join(RACINE, 'opcourrier.js')) && /for f in \*\.html \*\.js/.test(lire('scripts/assembler-site.sh')));
v('les sondes qui gardent le module existent', ['ctx_check.js', 'miss_check.js', 'sign_check.js', 'audit_contrast.js', 'sonde-module.js', 'sonde-gestion.js', 'essai.html', 'source-demo.js', 'pilote.js'].filter(f => !fs.existsSync(path.join(RACINE, 'scratchpad/courrier', f))), []);
vrai('le moteur de tri du module est le MÊME texte que la référence (test-2700 le joue ; ici on vérifie qu\'il n\'est pas dupliqué)', (MOD.match(/var OPClassify = \(function \(\) \{/g) || []).length === 1);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
})();
