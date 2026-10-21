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
v('ni sessionStorage, ni cookie, ni document.write, ni eval', ['sessionStorage', 'document.cookie', 'document.write', 'eval('].filter(x => CODE.includes(x)), []);
/* IndexedDB : UNE seule porte (`idbOuvrir`), une base nommée d'après la clé de l'hôte — c'est là que vit le fichier d'une pièce (aperçu d'un PDF avant d'envoyer) */
{ const o = fonction(MOD, 'idbOuvrir'); vrai('(tranche trouvée) idbOuvrir', o.length > 100);
  v('⛔ indexedDB n\'est touché que par `idbOuvrir` (ouverture, sur une base `<cleStockage>_fichiers` jamais une clé écrite en dur) et par le test de présence du balayage', [(CODE.match(/indexedDB/g) || []).length, (o.match(/indexedDB/g) || []).length, /indexedDB\.open\(LS\+"_fichiers",1\)/.test(o)], [3, 2, true]); }
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
const documentes = ['ajouterBoite', 'boites', 'capacites', 'deplacer', 'envois', 'envoyer', 'lire', 'lireMX', 'marquer', 'messages', 'piece', 'retirerBoite', 'signature', 'simuler', 'suivi', 'traduire'];
v('(population) les méthodes de la source appelées par le module', appelles, documentes);
v('⛔ chacune est DÉCRITE dans le contrat, en tête du fichier', documentes.filter(m => !(m === 'signature' ? /^     signature\s+→/m : new RegExp('\\b' + m + '\\(')).test(TETE)), []);
v('⛔ …et les trois méthodes des gestes d\'avant (envois, piece, suivi) ont leur PROPRE ligne de contrat (une simple mention au passage ne suffit pas)', ['envois', 'piece', 'suivi', 'traduire'].filter(m => !new RegExp('^     ' + m + '\\(', 'm').test(TETE)), []);
v('les options documentées sont celles que le module lit (source, cotes, cote, cleStockage, theme, titre, onCompter, titreDocument, intervalle)', ['source', 'cotes', 'cote', 'cleStockage', 'theme', 'titre', 'onCompter', 'titreDocument', 'intervalle'].filter(o => !new RegExp('\\b' + o + '\\b').test(TETE) || !new RegExp('opt\\.' + o + '\\b').test(CODE)), []);
vrai('la valeur rendue : { demonter, cote, rafraichir }', /return \{\s*demonter:demonter,[\s\S]*?cote:function\(c\)[\s\S]*?rafraichir:function\(o\)/.test(CODE));
vrai('monter exige une source (message clair) et un conteneur', /l’option « source » \(l’adaptateur de données\) est obligatoire/.test(CODE));
const capDecl = (CODE.match(/CAP\[k\]=c\[k\]===true/g) || []).length;
vrai('toute capacité est FAUSSE tant que la source ne dit pas le contraire (=== true, jamais « truthy »)', capDecl === 1 && /var CAP=\{oauth:false,programmeServeur:false,signature:false,marquage:false,deplacement:false,simulation:false,reglagesServeur:false,mx:false,/.test(CODE));
for (const [k, mot] of [['oauth', 'Bientôt : connexion sécurisée'], ['programmeServeur', 'Bientôt : l’envoi à l’heure dite'], ['signature', 'partira quand Yousign sera branché'], ['destinataires', 'Bientôt : plusieurs destinataires']])
  vrai('« Bientôt » : ce que la source ne sait pas faire (' + k + ') est DIT — « ' + mot + ' »', CODE.includes(mot));
vrai('trois états : liste illisible ≠ liste vide (LOAD.boites wait | ok | ko ; un rejet n\'efface jamais ce qui était lu ; « Réception indisponible » ≠ « Aucun message »)', /"calme":"ko"/.test(CODE) && /Boîtes mail illisibles/.test(CODE) && /Réception indisponible/.test(CODE) && /LOAD\.msgs\[a\.id\]="ko"/.test(CODE));
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
  vm.createContext(sb); vm.runInContext('function cap(s){return s}\nfunction initials(n){return String(n||"?").slice(0,2).toUpperCase()}\nfunction fmtFull(t){return "F"+t}\nfunction fmtDate(t){return "D"+t}\nfunction tsOf(m){return m.at}\n' + fonction(MOD, 'entitesLues') + '\n' + fonction(MOD, 'corpsLu') + '\nvar _deco=null;\n' + fonction(MOD, 'journalHtml') + '\n;this.j=journalHtml;', sb);
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

/* ═════════════════════════════ 6 ter. v2.92 — LES BOÎTES SE DISTINGUENT, UNE BOÎTE CLIQUÉE OUVRE SA RÉCEPTION (Justin, capture de la Tour) ═════════════════════════════ */
console.log('\n6 ter. Trois boîtes de même nom, le clic sur une boîte, la catégorie vide, le volet de lecture vide');
{
  const F = ['nomPartage', 'acctLabel', 'acctSous'].map(n => { const f = fonction(MOD, n); vrai('(tranche trouvée) la fonction ' + n, f.length > 40); return f; }).join('\n');
  const jouer = (noms) => { const sb = { ACCOUNTS: noms.map((n, i) => ({ id: 'b' + i, name: n, email: 'a' + i + '@teamop.fr' })), String }; vm.createContext(sb); vm.runInContext(F + '\n;this.l=acctLabel;this.s=acctSous;', sb);
    return sb.ACCOUNTS.map(a => [sb.l(a), sb.s(a)]); };
  v('⛔ trois boîtes nommées « TEAM OP » : l\'ADRESSE est le libellé principal, le nom passe dessous', jouer(['TEAM OP', 'TEAM OP', 'TEAM OP']), [['a0@teamop.fr', 'TEAM OP'], ['a1@teamop.fr', 'TEAM OP'], ['a2@teamop.fr', 'TEAM OP']]);
  v('…la comparaison ignore casse et espaces (« Team Op » et « team op  » sont le même nom)', jouer(['Team Op', ' team op  '])[0], ['a0@teamop.fr', 'Team Op']);
  v('…des noms DIFFÉRENTS gardent leur nom, l\'adresse dessous (rien ne change pour qui a nommé ses boîtes)', jouer(['Support', 'Contrôle']), [['Support', 'a0@teamop.fr'], ['Contrôle', 'a1@teamop.fr']]);
  v('…seules les boîtes qui se ressemblent passent à l\'adresse', jouer(['Support', 'TEAM OP', 'TEAM OP']).map(x => x[0]), ['Support', 'a1@teamop.fr', 'a2@teamop.fr']);
  const sb0 = tranche('la ligne d\'une boîte dans la barre latérale', 'var acctRow=function(a)', 'tile:acctTile(a)', MOD);
  vrai('⛔ la barre latérale écrit le libellé distinct et le nom dessous (acctLabel / acctSous), l\'adresse reste en infobulle', /name:acctLabel\(a\),sub:acctSous\(a\),title:a\.email,badge:kindBadge\(k\),$/.test(sb0), sb0);
  vrai('…le champ « De » du composeur et de la signature distinguent aussi (adresse seule quand le nom est partagé)', (CODE.match(/H\(nomPartage\(a\)\?a\.email:a\.name\)/g) || []).length === 2);
  vrai('…un message écrit par la boîte elle-même (« À : » / expéditeur) prend le libellé distinct', /return m\.from\? m\.from\.name : acctLabel\(acctOf\(m\.acct\)\)/.test(CODE));
  const clic = tranche('le clic sur une boîte', 'var sc=e.target.closest(".scope-row[data-scope]");', 'var f=e.target.closest(".folder[data-folder]");', CODE);
  const iF = clic.indexOf('state.folder="inbox"'), iPh = clic.indexOf('if(isPhone())');
  vrai('⛔ cliquer une BOÎTE ouvre sa Boîte de réception AVANT de distinguer les formats (Mac et iPad comme iPhone) — le dossier regardé avant ne reste pas', iF > 0 && iPh > iF && /state\.filter="all"/.test(clic.slice(0, iPh)), clic);
  vrai('…et sur iPad le tiroir des boîtes se referme (comme le fait un dossier)', /layout\(\)==="pad"\)\{ closeDrawer\(\); return; \}/.test(clic));
  const ev = fonction(MOD, 'etatVide');
  vrai('(tranche trouvée) etatVide', ev.length > 600);
  vrai('⛔ une catégorie vide dont les AUTRES catégories portent des messages le DIT et offre « Voir tout » (une boîte de notifications n\'a rien dans « Principal », ce n\'est pas une boîte vide)',
    /ailleurs=\(!state\.query&&catActive\(\)&&state\.cat!=="tout"\)\?folderMessages\(state\.folder\)\.filter\(matchesFilter\)\.length:0/.test(ev) && /dans les autres catégories/.test(ev) && /data-cat-tout="1"/.test(ev) && /\[data-cat-tout\]"\)\)\{ setCat\("tout",false\)/.test(CODE));
  const css = (MOD.match(/\.opc \.reading-empty\{[^}]*\}/) || [''])[0];
  vrai('⛔ le volet de lecture vide est BORNÉ à son volet (largeur 100 %, rien ne dépasse) et le texte se replie plutôt que d\'être coupé', /box-sizing:border-box/.test(css) && /max-width:100%/.test(css) && /overflow:hidden/.test(css) && /\.opc \.reading-empty b\{[^}]*overflow-wrap:anywhere/.test(MOD) && /\.opc \.reading\{min-width:0\}/.test(MOD), css);
}


/* ═════════════════════════════ 6 quater. v2.92 — SIGNATURE « PRÊTE », NIVEAU EN DEUX MOTS, TRI PAR LA SOURCE ═════════════════════════════ */
console.log('\n6 quater. Signature sans prestataire (« Prête — en attente de Yousign »), niveau « Code SMS / Code e-mail », automatique du serveur');
{
  vrai('⛔ le niveau de signature ne propose que « Code SMS » (adv) et « Code e-mail » (simple) — les valeurs internes ne bougent pas, le défaut suit toujours le type',
    /<option value="adv"'\+\(pre\.level!=="simple"\?' selected':''\)\+'>Code SMS<\/option><option value="simple"'\+\(pre\.level==="simple"\?' selected':''\)\+'>Code e-mail<\/option>/.test(CODE) && !/Avancée — code par SMS|Simple — code par e-mail/.test(CODE));
  const env = tranche('le bouton Envoyer de la demande de signature', 'var a=$("#sgFrom").value, now=Date.now(), body=$("#sgMsg").value;', 'var m=mk({acct:a,folder:"sign"', CODE);
  vrai('⛔ sans prestataire, « Envoyer » RANGE la demande (état « ready », fenêtre fermée, message dans Signatures) — aucune fausse signature, aucun faux envoi (pas d\'apprentissage de contact, pas d\'événement « Envoyé à »)',
    /if\(!CAP\.signature\)\{/.test(env) && /st:"ready"/.test(env) && /closeOverlay\(\)/.test(env) && /state\.folder="sign"/.test(env) && /return; \}/.test(env) && !/learnContacts|Envoyé à/.test(env), env);
  vrai('…le toast le dit en une phrase : rangée, partira quand Yousign sera branché, rien n\'est parti', /Rangée dans Signatures : prête, elle partira quand Yousign sera branché\. Rien n’est parti\./.test(env));
  vrai('…l\'état a son libellé et ne s\'expire jamais (expires 0, signState ne touche que pending / viewed)', /ready:"Prête — en attente de Yousign"/.test(CODE) && /\(g\.st==="pending"\|\|g\.st==="viewed"\)&&Date\.now\(\)>g\.expires/.test(CODE));
  const carte = fonction(MOD, 'signCardHtml'), act = fonction(MOD, 'signAct');
  vrai('…sa carte propose « Renvoyer » et « Annuler », dit « Pas encore envoyé » de chaque signataire, jamais « Relancer » ni « Simuler »', /st==="ready"\) acts='<button type="button" class="btn primary" data-act="signSend">Renvoyer<\/button><button type="button" class="btn danger" data-act="signDrop">Annuler<\/button>'/.test(carte) && /Pas encore envoyé/.test(carte));
  vrai('⛔ « Renvoyer » ne prétend rien tant que la source ne sait pas signer, puis rouvre le formulaire REMPLI (et remplace la demande rangée) ; « Annuler » la retire', /signSend"\)\{[\s\S]*?if\(!CAP\.signature\)\{ toast\("Toujours en attente de Yousign — rien n’est parti\."\); return; \}[\s\S]*?remplace:m\.id/.test(act) && /signDrop"\)\{ removeMsg\(m\.id\)/.test(act) && /if\(pre\.remplace\) removeMsg\(pre\.remplace,true\)/.test(CODE));
  /* le tri par la source : la VRAIE refreshCls + classifyCtx, avec le VRAI moteur */
  const iM2 = MOD.indexOf('var OPClassify = (function () {'), jM2 = MOD.indexOf('\n})();', iM2) + '\n})();'.length;
  const RC = ['classifyCtx', 'refreshCls', 'emailOf', 'emailsIn'].map(n => { const f = fonction(MOD, n); vrai('(tranche trouvée) la fonction ' + n, f.length > 30); return f; }).join('\n');
  const jouerTri = (msgs, rules) => { const sb = { MESSAGES: msgs, CLS: {}, CONTACTS: {}, RULES: rules || { senders: {}, domains: {} }, String, Object, Array }; vm.createContext(sb);
    vm.runInContext(MOD.slice(iM2, jM2) + '\n' + RC + '\n;this.go=refreshCls;', sb); sb.go(); return sb.CLS; };
  const mm = (id, mail, nom, o) => Object.assign({ id, src: true, folder: 'inbox', from: { name: nom, email: mail }, to: 'support@teamop.fr', subject: 'Demande', preview: '', body: null, att: [] }, o);
  const A = mm('a', 'contact@societe-dupont.fr', 'Société Dupont', { subject: 'Question sur votre devis', autoSrc: false });
  const B = mm('b', 'noreply@teamop.fr', 'TeamOP', { subject: 'Votre code de connexion', autoSrc: true });
  const C = mm('c', 'contact@societe-dupont.fr', 'Société Dupont', { id: 'c', subject: 'Question sur votre devis' });
  const D = mm('d', 'info@teamop.fr', 'Formulaire du site', { subject: 'Nouveau message du site', autoSrc: false });
  const cls = jouerTri([A, B, C, D]);
  v('⛔ une PERSONNE qui écrit depuis une adresse générique (contact@) que la source ne juge pas automatique → Principal (le moteur seul disait Notifications)', [cls.a.cat, cls.c.cat], ['principal', 'notif']);
  v('…un envoi automatique reconnu par la source (noreply@teamop.fr) reste en Notifications', cls.b.cat, 'notif');
  v('…un formulaire du site (info@teamop.fr, non automatique pour la source) est Principal', cls.d.cat, 'principal');
  const cr = jouerTri([mm('r', 'contact@societe-dupont.fr', 'Société Dupont', { autoSrc: false })], { senders: { 'contact@societe-dupont.fr': 'notif' }, domains: {} });
  v('⛔ une règle de la personne passe AVANT la source (« toujours ranger cet expéditeur en Notifications »)', cr.r.cat, 'notif');
  const promo = jouerTri([mm('p', 'offres@boutique-exemple.fr', 'Boutique', { subject: 'Soldes -50 % : profitez des promotions', autoSrc: false, unsub: true })]);
  v('…une publicité (désabonnement) n\'est jamais promue en Principal par la source', promo.p.cat !== 'principal', true);
  const env2 = mm('s1', 'support@teamop.fr', 'Support', { folder: 'sent', to: 'marie.durand@exemple-client.fr', subject: 'Votre dossier' });
  const rep = mm('s2', 'info@exemple-client.fr', 'Cabinet Exemple', { subject: 'Re : Votre dossier' });
  v('…une personne à qui la boîte a ÉCRIT (Envoyés lu depuis la source) est un contact connu', [jouerTri([env2, mm('s3', 'marie.durand@exemple-client.fr', 'Marie Durand', { subject: 'Bonjour' })]).s3.reasons[0]], ['contact connu']);
  const dsrc = fonction(MOD, 'depuisSource');
  vrai('⛔ le champ `automatique` de la source (vrai / faux, jamais « truthy ») arrive sur le message', /autoSrc:typeof r\.automatique==="boolean"\?r\.automatique:null/.test(dsrc));
}


/* ═════════════════════════════ 6 quinquies. v2.92 — LE LOGO D'UNE BOÎTE (Justin : « qu'on puisse choisir un logo, qu'il s'affiche dans la barre ») ═════════════════════════════ */
console.log('\n6 quinquies. Logo par boîte : validé, recadré, rangé sur l\'appareil, retiré ; pastille à l\'initiale sinon');
{
  const F = ['logoValide', 'logoCadre', 'teinteAdresse', 'acctTile'].map(n => { const f = fonction(MOD, n); vrai('(tranche trouvée) la fonction ' + n, f.length > 40); return f; }).join('\n');
  const CST = tranche('les bornes du logo', 'var LOGO_PX=64', 'function logoValide', MOD);
  const sb = { SAVED: { logos: {} }, H: (x) => String(x), String, Number }; vm.createContext(sb);
  vm.runInContext(CST + '\n' + F + '\n;this.v=logoValide;this.c=logoCadre;this.t=teinteAdresse;this.tile=acctTile;this.PX=LOGO_PX;this.MAX=LOGO_MAX;', sb);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
  v('⛔ un PNG ou un JPEG en data URL est accepté', [sb.v(png), sb.v('data:image/jpeg;base64,/9j/4AAQSkZJRg==')], [true, true]);
  v('⛔ rien d\'autre ne passe : SVG (exécutable), HTML, GIF, URL distante, javascript:, type absent, non-chaîne', [
    sb.v('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='), sb.v('data:text/html;base64,PGgxPg=='), sb.v('data:image/gif;base64,R0lGOD'), sb.v('https://exemple.fr/logo.png'), sb.v('javascript:alert(1)'),
    sb.v('data:image/png,<svg onload=alert(1)>'), sb.v('data:image/png;base64,AAAA"onerror="alert(1)'), sb.v(null), sb.v(42), sb.v('')], Array(10).fill(false));
  v('…la taille est BORNÉE (quelques Ko) : 64 px, 24 000 caractères au plus', [sb.PX, sb.MAX, sb.v('data:image/png;base64,' + 'A'.repeat(sb.MAX - 22)), sb.v('data:image/png;base64,' + 'A'.repeat(sb.MAX))], [64, 24000, true, false]);
  v('le recadrage garde le CARRÉ du centre (paysage, portrait, carré)', [sb.c(200, 100), sb.c(100, 300), sb.c(64, 64)], [{ sx: 50, sy: 0, c: 100 }, { sx: 0, sy: 100, c: 100 }, { sx: 0, sy: 0, c: 64 }]);
  const a1 = { id: 'b1', email: 'support@teamop.fr' }, a2 = { id: 'b2', email: 'controle@teamop.fr' };
  const sans = sb.tile(a1), avec = (sb.SAVED.logos.b1 = png, sb.tile(a1));
  vrai('⛔ sans logo : une pastille à l\'INITIALE de l\'adresse, d\'une teinte stable par adresse (deux appels, même couleur ; deux adresses, deux couleurs)', /hsl\(\d+ 46% 30%\)[^>]*>S</.test(sans) && sb.t('support@teamop.fr') === sb.t('SUPPORT@teamop.fr') && sb.t('support@teamop.fr') !== sb.t('controle@teamop.fr') && /hsl\(\d+ 46% 30%\)[^>]*>C</.test(sb.tile(a2)), sans);
  vrai('⛔ avec logo : l\'image est une <img src="data:…"> sans texte alternatif parlant, jamais exécutée, et le logo d\'une boîte n\'habille pas l\'autre', /<img src="data:image\/png;base64,[^"]+" alt="" draggable="false">/.test(avec) && !/S</.test(avec) && /hsl\(/.test(sb.tile(a2)));
  sb.SAVED.logos.b1 = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=';
  vrai('…un logo rangé qui ne serait plus une petite image PNG / JPEG n\'est PAS peint (retour à la pastille)', /hsl\(/.test(sb.tile(a1)) && !/<img/.test(sb.tile(a1)));
  /* la VRAIE persist / restore : le logo est rangé avec l'appareil, relu après validation, retiré avec la boîte */
  const persistance = tranche('persist et restore', '  function persist(){ try{', '  function acctExists(id)', MOD);
  const valeurs = {}; const stock = { getItem: (k) => (k in valeurs ? valeurs[k] : null), setItem: (k, x) => { valeurs[k] = x; } };
  const mk2 = () => { const s2 = { LS: 'cle-test', localStorage: stock, JSON, Object, Array, String, GONE: [], OVER: {}, RULES: { senders: {}, domains: {} }, CONTACTS: {}, SETTINGS: { notif: true, threads: true }, MESSAGES: [], ACCOUNTS: [{ id: 'b1', email: 'a@x.fr', name: 'A', kind: 'pro', signature: '' }],
    SAVED: { kinds: {}, names: {}, sigs: {}, logos: {} }, state: { scope: 'pro', folder: 'inbox', cat: 'principal' }, COTES: ['pro'], FOLDERS: [{ id: 'inbox' }], uid: 1, restoredLost: 0, kindOf: () => 'pro', majOver() {}, syncSource() {}, isCat: () => true,
    CAP: {}, nettoye: (m) => m, emailsIn: () => [] };
    vm.createContext(s2); vm.runInContext(CST + '\n' + fonction(MOD, 'logoValide') + '\n' + persistance + '\n;this.persist=persist;this.restore=restore;', s2); return s2; };
  const p1 = mk2(); p1.SAVED.logos.b1 = png; p1.persist();
  const p2 = mk2(); p2.restore();
  v('⛔ le logo est RANGÉ avec la boîte (cleStockage) et relu à la reprise', p2.SAVED.logos.b1, png);
  const brut = JSON.parse(valeurs['cle-test']); brut.logos.b1 = 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='; brut.logos.b2 = png; valeurs['cle-test'] = JSON.stringify(brut);
  const p3 = mk2(); p3.restore();
  v('⛔ …et un rangement trafiqué ne fait rien entrer d\'exécutable : le SVG est jeté à la lecture, le PNG valide reste', [p3.SAVED.logos.b1, p3.SAVED.logos.b2], [undefined, png]);
  vrai('…le logo n\'est jamais envoyé à la source (aucun appel de SRC. avec lui), et le module ne charge rien d\'externe', !/SRC\.[a-zA-Z]+\([^)]*logo/.test(CODE) && !/fetch\s*\(/.test(CODE));
  const lf = fonction(MOD, 'logoDepuisFichier');
  vrai('⛔ le fichier choisi est refusé AVANT d\'être lu s\'il n\'est pas PNG / JPEG ou dépasse 8 Mo, puis recadré et réduit sur un <canvas> de 64 px', /\^image\\\/\(png\|jpeg\)\$/.test(lf) && /LOGO_FICHIER_MAX/.test(lf) && /logoCadre\(w,h\)/.test(lf) && /cv\.width=LOGO_PX/.test(lf) && /logoValide\(u\)/.test(lf));
  const ag = tranche('la ligne d\'une boîte', 'var acctRow=function(a)', 'tile:acctTile(a)}; };', MOD) + 'tile:acctTile(a)}; };';
  vrai('⛔ le logo (ou la pastille) est celui de la barre latérale, de l\'en-tête de liste et du champ « De »; le menu de la boîte le propose (« Changer le logo… »), l\'ajout aussi',
    /tile:acctTile\(a\)/.test(ag) && /acctTile\(acctOf\(state\.scope\)\)/.test(CODE) && /acctTile\(acctOf\(\$\("#cFrom"\)\.value\)\)/.test(CODE) && /label:"Changer le logo…"/.test(CODE) && /logoChoisi/.test(CODE) && /if\(logoValide\(extra\.logo\)\) SAVED\.logos\[id\]=extra\.logo/.test(CODE));
  vrai('…et il part avec la boîte (supprimée, son logo est effacé du rangement)', /Object\.keys\(SAVED\.logos\)/.test(CODE) && /delete SAVED\.logos\[id\]/.test(CODE));
}

/* ═════════════════════════════ 6 sexies. v2.92 — L'ÉTAT « ESPACE DE TEST » (source qui rejette avec `calme:true`) ═════════════════════════════ */
console.log('\n6 sexies. Un rejet « calme » n\'est pas une panne');
{
  const ch = fonction(MOD, 'charger'), ev = fonction(MOD, 'etatVide');
  vrai('⛔ un rejet qui porte `calme:true` pose l\'état « calme », tout autre rejet reste « ko » (la panne se dit)', /LOAD\.boites=e&&e\.calme===true\?"calme":"ko"/.test(ch));
  vrai('⛔ l\'état calme dit le message de la source tel quel, sans « Réessayer » ni « refusé » (role=status, pas alert), et ne propose pas d\'ajouter une boîte', /LOAD\.boites==="calme"\) return '<div class="empty" role="status">'\+I\.mail\+'<b>Espace de test<\/b><span>'\+H\(LOAD\.err\)\+'<\/span><\/div>';/.test(ev) && /LOAD\.boites==="calme"&&!ACCOUNTS\.length\?''/.test(CODE) && /Espace de test<\/span>/.test(CODE));
  vrai('…et la liste calme se repeint (renderAll) comme une panne se repeint', /LOAD\.boites==="ko"\|\|LOAD\.boites==="calme"/.test(CODE));
}

/* ═════════════════════════════ 6 septies. v2.92 — LES DOSSIERS DE SUIVI (À traiter, En cours, Assignés à moi) ═════════════════════════════ */
console.log('\n6 septies. Dossiers de suivi : seulement si la source déclare le suivi, comptés, et la pastille aussi');
{
  const F = ['nomSuivi', 'suiviDossier', 'suiviDossiers'].map(n => { const f = fonction(MOD, n); vrai('(tranche trouvée) la fonction ' + n, f.length > 40); return f; }).join('\n');
  const FOLD = tranche('les dossiers de suivi', '    {id:"s_atraiter"', '  ];', MOD);
  const jouer = (cap, msgs, fid) => { const sb = { CAP: cap, String, FOLDERS: [] }; vm.createContext(sb); vm.runInContext('var FOLDERS=[' + FOLD.replace(/\/\/[^\n]*/g, '') + '];\n' + F + '\n;this.d=suiviDossier;this.l=suiviDossiers;', sb);
    return { dans: msgs.filter(m => sb.d(m, fid)).map(m => m.id), liste: sb.l().map(f => f.id) }; };
  const m = (id, statut, assigne, o) => Object.assign({ id, src: true, folder: 'inbox', suivi: statut ? { statut, assigne: assigne || '', par: '' } : null }, o);
  const L = [m('a', 'aTraiter', ''), m('b', 'enCours', 'Patron'), m('c', 'resolu', 'Patron'), m('d', null), m('e', 'aTraiter', 'Léa Moreau'), m('f', 'enCours', ' patron '), m('g', 'aTraiter', 'Patron', { folder: 'archive' }), m('h', 'aTraiter', 'Patron', { src: false })];
  const cap = { suivi: true, moi: 'Patron' };
  v('⛔ « À traiter » = les demandes de la RÉCEPTION dont le suivi dit « à traiter » (ni résolues, ni sans suivi, ni archivées, ni écrites ici)', jouer(cap, L, 's_atraiter').dans, ['a', 'e']);
  v('⛔ « En cours » = celles dont le suivi dit « en cours »', jouer(cap, L, 's_encours').dans, ['b', 'f']);
  v('⛔ « Assignés à moi » = l\'assigné est la personne connectée (casse, accents, espaces ignorés), tant que ce n\'est pas RÉSOLU', jouer(cap, L, 's_moi').dans, ['b', 'f']);
  v('⛔ les trois dossiers n\'existent QUE si la source déclare le suivi ; « Assignés à moi » exige en plus un nom de personne', [jouer({ suivi: false }, L, 's_atraiter').liste, jouer({ suivi: true, moi: '' }, L, 's_moi').liste, jouer(cap, L, 's_moi').liste],
    [[], ['s_atraiter', 's_encours'], ['s_atraiter', 's_encours', 's_moi']]);
  const rs = fonction(MOD, 'renderSidebar'), inf = fonction(MOD, 'inFolder'), cpt = fonction(MOD, 'compter');
  vrai('⛔ la barre latérale a une section « Suivi » (compteur = le nombre de demandes, comme Brouillons), et « Autres dossiers » n\'en reprend pas', /if\(suiviDossiers\(\)\.length\) h\+=sect\("hSuivi","Suivi",suiviDossiers\(\)\);/.test(rs) && /f\.id==="scheduled"\|\|f\.suivi\)\{/.test(rs) && /FOLDERS\.filter\(function\(f\)\{return !f\.fav&&!f\.suivi;\}\)/.test(rs));
  vrai('…inFolder les lit sur l\'état de suivi (jamais un dossier de la boîte) ; un dossier de suivi choisi puis retiré par la source revient à la réception', /if\(\/\^s_\/\.test\(fid\)\) return CAP\.suivi&&suiviDossier\(m,fid\)/.test(inf) && /state\.folder="inbox";   \/\/ la source ne déclare plus le suivi/.test(rs));
  vrai('⛔ la PASTILLE du menu de l\'hôte compte les non lus ET les demandes « À traiter » (chaque message une fois, seulement avec le suivi déclaré)', /\(!m\.read\|\|\(CAP\.suivi&&!!m\.suivi&&m\.suivi\.statut==="aTraiter"\)\)/.test(cpt));
  vrai('…et `moi` ne vient que de la source déclarée (capacites().moi), jamais d\'une valeur par défaut', /CAP\.moi=CAP\.suivi&&typeof c\.moi==="string"\?c\.moi\.trim\(\):""/.test(CODE));
}

/* ═════════════════════════════ 6 octies. LE SON DES NOUVEAUX MAILS ═════════════════════════════ */
console.log('\n6 octies. Le son des nouveaux mails (Justin : « boîte ouverte ou autre, ça sonne quand même ; on peut l\'activer dans les paramètres »)');
{
  const U = fonction(MOD, 'sonUrl'), J = fonction(MOD, 'jouerSon');
  vrai('(tranches trouvées) sonUrl, jouerSon', U.length > 40 && J.length > 200);
  const bac = (o) => { const jour = []; const sb = { opt: o.opt || {}, SETTINGS: o.SETTINGS || { son: true }, navigator: o.nav || {}, jour,
    Audio: function (u) { if (o.jette) throw new Error('refus'); jour.push('nouveau:' + u); this.play = () => { jour.push('play:' + (sb.navigator.audioSession ? sb.navigator.audioSession.type : '-')); return o.refuse ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve(); }; } };
    vm.createContext(sb); vm.runInContext('var audioNouveau=null;\n' + U + '\n' + J + '\n;this.jouer=jouerSon;this.url=sonUrl;', sb); return sb; };
  let sb = bac({ nav: { audioSession: { type: 'auto' } } }); sb.jouer(); sb.jouer();
  v('⛔ le son joue ; l\'Audio est créé UNE seule fois (sons/courrier.mp3 à défaut), rejoué à chaque appel', sb.jour.filter(x => x.startsWith('nouveau')).concat(sb.jour.filter(x => x.startsWith('play')).length), ['nouveau:sons/courrier.mp3', 2]);
  v('⛔ iPhone : `audioSession.type = "ambient"` est posé AVANT de jouer — le son suit l\'interrupteur silencieux au lieu de jouer quand même', sb.jour.filter(x => x.startsWith('play')), ['play:ambient', 'play:ambient']);
  sb = bac({ nav: {} }); sb.jouer(); v('…un navigateur sans `audioSession` joue quand même (l\'API est optionnelle)', sb.jour, ['nouveau:sons/courrier.mp3', 'play:-']);
  sb = bac({ SETTINGS: { son: false } }); sb.jouer(); v('⛔ « Son des nouveaux mails » éteint : aucun son, aucun Audio créé', sb.jour, []);
  sb = bac({ opt: { son: false } }); sb.jouer(); v('…l\'hôte qui dit `son: false` n\'en a pas', [sb.jour, sb.url()], [[], '']);
  sb = bac({ opt: { son: 'courrier.mp3' } }); sb.jouer(); v('…l\'hôte choisit l\'adresse du fichier (OP MESSAGES : courrier.mp3, à côté de sa page)', sb.jour[0], 'nouveau:courrier.mp3');
  sb = bac({ refuse: true }); let jete = false; try { sb.jouer(); } catch (e) { jete = true; } v('⛔ le navigateur refuse la lecture (aucun geste encore) : rien ne casse, le mail suivant réessaie', [jete, sb.jour.length], [false, 2]);
  sb = bac({ jette: true }); jete = false; try { sb.jouer(); sb.jouer(); } catch (e) { jete = true; } v('…un Audio qui ne se construit pas ne casse rien non plus', jete, false);

  /* finCharge : la VRAIE fonction, rejouée sur des relevés */
  const FC = fonction(MOD, 'finCharge'); vrai('(tranche trouvée) finCharge', FC.length > 400);
  const relever = (msgs, o) => { o = o || {}; const jour = []; const sb2 = { vivant: true, LOAD: { boites: 'ok' }, MESSAGES: msgs, acctExists: () => true, SAVED: { kinds: {}, names: {}, sigs: {}, logos: {} }, state: { scope: 'pro' }, COTES: ['pro'], validScope: () => true,
    refreshCls() {}, empreinte: () => 'x', renderAll() {}, persist() {}, compter() {}, Object, SETTINGS: o.SETTINGS || { notif: true, son: true },
    jouerSon() { jour.push('son'); }, notifierArrivee(n) { jour.push('notif:' + n.length); return !!o.systeme; } };
    vm.createContext(sb2); vm.runInContext(FC + '\n;this.f=finCharge;', sb2); sb2.f('', true); return jour; };
  const mm = (id, o) => Object.assign({ id, folder: 'inbox', read: false, neuf: true }, o);
  v('⛔ un NOUVEAU mail non lu : un son et l\'alerte', relever([mm('a')]), ['notif:1', 'son']);
  v('⛔ un lot de cinq mails : UN SEUL son (et une seule alerte)', relever([mm('a'), mm('b'), mm('c'), mm('d'), mm('e')]), ['notif:5', 'son']);
  v('⛔ rien de nouveau (le premier chargement ne marque aucun `neuf`) : silence', relever([mm('a', { neuf: false }), mm('b', { neuf: undefined })]), []);
  v('⛔ un indésirable (rangé par le tri), un message lu, un ancien, un envoi : silence', relever([mm('a', { folder: 'junk' }), mm('b', { read: true }), mm('c', { ancien: true }), mm('d', { folder: 'sent' })]), []);
  v('⛔ le son ne dépend PAS de la boîte ouverte ni du dossier affiché : un mail d\'une autre boîte, pendant qu\'on lit les Envoyés', (() => { const l = [mm('a', { acct: 'autre' })]; return relever(l); })(), ['notif:1', 'son']);
  v('⛔ les notifications éteintes : le son sonne quand même (deux réglages à part)', relever([mm('a')], { SETTINGS: { notif: false, son: true } }), ['son']);
  v('⛔ page cachée + notification du SYSTÈME envoyée : c\'est le système qui sonne — la page ne double PAS', relever([mm('a')], { systeme: true }), ['notif:1']);
  /* la notification elle-même */
  const NA = fonction(MOD, 'notifierArrivee'); vrai('(tranche trouvée) notifierArrivee', NA.length > 300);
  const notif = (hidden, perm, son) => { const faits = []; const sb3 = { msgById: () => ({}), closeOverlay() {}, app: { classList: { contains: () => false } }, closeDrawer() {}, inScope: () => true, state: {}, renderAll() {}, selectMessage() {}, toast() {}, senderName: () => 'Claire', window: { focus() {} },
    document: { hidden }, SETTINGS: { son }, Notification: Object.assign(function (t, o) { faits.push(o); this.close = () => {}; }, { permission: perm }), open() {} };
    sb3.window.Notification = sb3.Notification; vm.createContext(sb3); vm.runInContext(NA + '\n;this.f=notifierArrivee;', sb3);
    const r = sb3.f([{ id: 'a', subject: 'Objet', preview: 'Aperçu' }]); return { r, faits }; };
  let n1 = notif(true, 'granted', true); v('⛔ page cachée + permission : notification du système (sa sonnerie, celle de l\'appareil), rend VRAI', [n1.r, n1.faits.length, n1.faits[0] && n1.faits[0].silent], [true, 1, false]);
  n1 = notif(true, 'granted', false); v('…« Son des nouveaux mails » éteint : la notification du système se tait aussi (`silent`)', [n1.r, n1.faits[0].silent], [true, true]);
  n1 = notif(false, 'granted', true); v('⛔ page visible : pas de notification du système, rend FAUX (c\'est le son de la page qui joue)', [n1.r, n1.faits.length], [false, 0]);
  n1 = notif(true, 'denied', true); v('…permission refusée : FAUX aussi, le son de la page joue', [n1.r, n1.faits.length], [false, 0]);
  /* les réglages */
  vrai('⛔ « Son des nouveaux mails » est un réglage rangé (SETTINGS.son, activé par défaut, relu par restore) à côté de « Notifications »', /var SETTINGS=\{notif:true,son:true,threads:true\}/.test(CODE) && /SETTINGS\.son=snap\.settings\.son!==false/.test(CODE) && /id="stSon"/.test(CODE) && CODE.indexOf('id="stNotif"') < CODE.indexOf('id="stSon"') && CODE.indexOf('id="stSon"') < CODE.indexOf('id="stThreads"'));
  vrai('…et il DIT qu\'il suit le mode silencieux de l\'appareil', /Suit le mode silencieux de l’appareil/.test(CODE));
  vrai('…le volume est celui de l\'appareil : aucun réglage de volume dans le module', !/\.volume\s*=/.test(CODE));
  vrai('(contre-épreuve) le son ne s\'appelle QUE depuis finCharge et le réglage (essai) — pas depuis un rendu', (CODE.match(/jouerSon\(\)/g) || []).length === 3 /* finCharge, essai du réglage, définition */);
  vrai('le fichier du son existe dans le dépôt, il est servi (dossier sons/) et copié pour OP MESSAGES', fs.existsSync(path.join(RACINE, 'sons', 'courrier.mp3')) && fs.statSync(path.join(RACINE, 'sons', 'courrier.mp3')).size > 5000 && /const SON = 'courrier\.mp3'/.test(lire('scripts/opmsg-public.js')) && /son: 'courrier\.mp3'/.test(lire('apercu/opmessages/index.html')));
  vrai('⛔ la politique d\'OP MESSAGES autorise le cadre `blob:` (la visionneuse de PDF) et rien d\'externe', (() => { const l = lire('scripts/opmsg-public.js').split('\n').find(x => x.startsWith('const CSP_SERVICE')) || ''; return /frame-src blob:;/.test(l) && !/https?:/.test(l); })());
  vrai('…les hôtes sans politique (Tour, beta.html, app.html) ne bloquent aucun cadre `blob:` — ou la portent', ['tour.html', 'beta.html', 'app.html'].every(f => { const m = lire(f).match(/<meta[^>]+Content-Security-Policy[^>]*>/i); return !m || /frame-src[^;]*blob:/.test(m[0]); }));
}

/* ═════════════════════════════ 6 nonies. L'APERÇU DU PDF AVANT D'ENVOYER ═════════════════════════════ */
console.log('\n6 nonies. Le fichier est gardé sur l\'appareil, l\'aperçu l\'ouvre (signature, message en rédaction)');
{
  /* un IndexedDB en mémoire, juste assez pour jouer les VRAIES fonctions du module */
  const bases = {};
  const fauxIDB = { open(nom) { const rq = {}; setTimeout(() => { const data = bases[nom] || (bases[nom] = new Map());
    rq.result = { close() {}, createObjectStore() {}, transaction() { const tx = {}; tx.objectStore = () => ({ put(vv, k) { data.set(k, vv); return {}; }, get(k) { return { result: data.get(k) }; }, delete(k) { data.delete(k); return {}; }, getAllKeys() { return { result: Array.from(data.keys()) }; } });
      setTimeout(() => tx.oncomplete && tx.oncomplete(), 0); return tx; } };
    if (rq.onupgradeneeded) rq.onupgradeneeded(); if (rq.onsuccess) rq.onsuccess(); }, 0); return rq; } };
  const NOMS = ['idbOuvrir', 'idbFaire', 'fidNeuf', 'fichierPoser', 'fichierLire', 'fidsDe', 'fichiersEffacer', 'fichiersDe', 'fichiersBalayer', 'removeMsg', 'apercuPiece', 'estPDF'];
  const F = NOMS.map(n => { const f = fonction(MOD, n); vrai('(tranche trouvée) la fonction ' + n, f.length > 40); return f; }).join('\n');
  const toasts = [], vus = [];
  const bac = (msgs) => { const sb = { LS: 'cle-test', window: { indexedDB: fauxIDB }, indexedDB: fauxIDB, Blob, Error, Promise, Date, Math, MESSAGES: msgs, vivant: true, toast: (t) => toasts.push(t), apercuPDF: (b, nom) => vus.push([b.size, nom]), setTimeout };
    vm.createContext(sb); vm.runInContext('var idbP=null;\n' + F + '\n;this.api={idbOuvrir,fichierPoser,fichierLire,fichiersDe,fichiersBalayer,removeMsg,apercuPiece,estPDF,fidsDe};', sb); return sb; };
  const dormir2 = (ms) => new Promise(r => setTimeout(r, ms));
  {
    const msgs = [{ id: 'm1', att: [{ name: 'a.pdf', fid: 'F1' }] }, { id: 'm2', att: [{ name: 'b.pdf', fid: 'F2' }, { name: 'c.pdf', fid: 'F1' }] }, { id: 'm3', att: [{ name: 'd.pdf', fid: 'F3' }], sign: { st: 'cancelled' } }, { id: 'm4', att: [{ name: 'img.png' }] }];
    const sb = bac(msgs), api = sb.api;
    for (const k of ['F1', 'F2', 'F3', 'F4']) await api.fichierPoser(k, new Blob(['%PDF-1.4 ' + k]));
    const lu = await api.fichierLire('F1');
    vrai('⛔ un fichier posé se relit tel quel (Blob PDF, sa taille)', lu && lu.size === 11 && lu.type === 'application/pdf', lu && lu.size);
    v('fidsDe : les clés d\'un message, sans doublon ni pièce sans fichier', [api.fidsDe(msgs[1]), api.fidsDe(msgs[3])], [['F2', 'F1'], []]);
    v('⛔ fichiersDe : les fichiers d\'une demande, SAUF ceux qu\'une autre pièce désigne encore (F1 est aussi dans m1)', api.fichiersDe(msgs[1]), ['F2']);
    api.fichiersBalayer(); await dormir2(40);
    v('⛔ le balayage du démarrage efface ce qu\'AUCUNE pièce ne désigne (F4) et ce qu\'une demande ANNULÉE désigne (F3) ; garde F1 et F2', [await api.fichierLire('F1') !== undefined, await api.fichierLire('F2') !== undefined, await api.fichierLire('F3') === undefined, await api.fichierLire('F4') === undefined], [true, true, true, true]);
    api.removeMsg('m2'); await dormir2(40);
    v('⛔ retirer une demande efface SES fichiers (F2), jamais celui qu\'une autre demande garde (F1)', [await api.fichierLire('F2') === undefined, await api.fichierLire('F1') !== undefined], [true, true]);
    api.removeMsg('m1', true); await dormir2(40);
    vrai('⛔ …`removeMsg(id, true)` (la demande rouverte et renvoyée reprend ses pièces) NE touche à aucun fichier', await api.fichierLire('F1') !== undefined);
    api.apercuPiece({ name: 'neuf.pdf', file: new Blob(['%PDF-1.4 12345']) }); v('aperçu : le fichier qu\'on vient de choisir s\'ouvre tel quel (en mémoire)', vus.pop(), [14, 'neuf.pdf']);
    api.apercuPiece({ name: 'a.pdf', fid: 'F1' }); await dormir2(40); v('⛔ aperçu : le fichier GARDÉ sur l\'appareil s\'ouvre (relu d\'IndexedDB)', vus.pop(), [11, 'a.pdf']);
    toasts.length = 0; api.apercuPiece({ name: 'x.pdf' }); v('⛔ aperçu : une pièce SANS fichier le dit', toasts, ['Fichier non conservé sur cet appareil']);
    toasts.length = 0; api.apercuPiece({ name: 'x.pdf', fid: 'F-disparu' }); await dormir2(40); v('⛔ aperçu : un fichier DISPARU (effacé, rangement purgé) le dit aussi — jamais une visionneuse vide', [toasts, vus.length], [['Fichier non conservé sur cet appareil'], 0]);
    v('estPDF : par le nom ou le type du fichier choisi, jamais une image', [api.estPDF({ name: 'a.PDF', kind: 'doc' }), api.estPDF({ name: 'scan', kind: 'doc', file: { type: 'application/pdf' } }), api.estPDF({ name: 'a.pdf', kind: 'img' }), api.estPDF({ name: 'a.docx', kind: 'doc' })], [true, true, false, false]);
    const sbErr = bac([]); sbErr.window = {}; sbErr.indexedDB = undefined; let r = 'rien';
    await sbErr.api.fichierLire('F1').then(() => { r = 'a répondu'; }, () => { r = 'refus dit'; }); v('⛔ sans IndexedDB (navigation privée) : un REFUS, jamais un fichier vide pris pour une réponse', r, 'refus dit');

    /* la visionneuse et les câblages — le rendu, lui, est gardé par la sonde du navigateur */
    const AP = fonction(MOD, 'apercuPDF'); vrai('(tranche trouvée) apercuPDF', AP.length > 800);
    vrai('⛔ le PDF s\'affiche dans un cadre dont l\'adresse est un `blob:` fabriqué ici (type FORCÉ à application/pdf : jamais lu comme une page), aucune origine externe — et SANS `sandbox` : Chromium refuse d\'y afficher un PDF (mesuré, « blocked by Chromium »)', !/sandbox/.test(CODE.replace(/\/\/[^\n]*/g, '')) && /URL\.createObjectURL\(new Blob\(\[blob\],\{type:"application\/pdf"\}\)\)/.test(AP) && !/https?:/.test(AP));
    vrai('…Fermer (bouton et Échap) et Télécharger ; l\'adresse est RÉVOQUÉE à la fermeture ; sur un appareil qui n\'affiche pas les PDF dans une page, le repli est « Télécharger »', /data-pv="close"/.test(AP) && /data-pv="dl"/.test(AP) && /e\.key==="Escape"/.test(AP) && /navigator\.pdfViewerEnabled!==false/.test(AP) && /pdfv-repli/.test(AP) && /revokeObjectURL/.test(fonction(MOD, 'fermerApercu')));
    vrai('⛔ fermer une feuille ferme la visionneuse (closeOverlay), et le démontage aussi', /function closeOverlay\(\)\{\s*fermerApercu\(\);/.test(CODE) && /finis\.push\(fermerApercu\)/.test(CODE));
    /* Justin, 19 octobre 2026 : « type, je veux pas » — la fenêtre n'a plus de champ « Type » (il décidait aussi de la contre-signature et du mot « devis »), et Yousign n'accepte des relances que tous les 1, 2, 7 ou 14 jours */
    vrai('⛔ « Envoyer pour signature » n\'a plus de champ « Type » : ni liste de types, ni #sgType, ni type posé sur la demande', !/sgType|SIGN_TYPES|"Contrat de prestation"|"Autre document"|\bg\.type\b|\bsign\.type\b/.test(CODE) && !/\btype:\$\(/.test(CODE));
    vrai('⛔ la contre-signature est DÉCOCHÉE d\'office (cochée seulement si la demande reprise la portait), jamais déduite d\'un type', /\(pre\.counter\?" checked":""\)/.test(CODE) && !/Bon d’intervention/.test(CODE));
    vrai('⛔ les relances sont dites « tous les 2 jours » (une valeur que Yousign accepte), jamais « 3 jours »', /Relances automatiques tous les 2 jours/.test(CODE) && !/3 jours/.test(CODE));
    vrai('⛔ la fenêtre « Envoyer pour signature » : un bouton Aperçu sur chaque PDF, le fichier est GARDÉ à l\'envoi (les trois branches : prête, locale, réelle), borné à la limite d\'un message', /data-dpv/.test(CODE) && (CODE.match(/att:docsGardes\(\)/g) || []).length === 3 && /tot\+f\.size>CAP\.pj\.octets/.test(CODE) && /fichierPoser\(fid,d\.file\)/.test(CODE));
    vrai('…la pièce n\'emporte que sa clé `fid` (jamais le fichier : il irait dans localStorage et dans la synchro)', /var o=\{name:d\.name,size:d\.size,kind:"doc"\}; if\(fid\) o\.fid=fid;/.test(CODE));
    vrai('…la demande ANNULÉE efface ses fichiers, la demande retirée aussi ; au démarrage, ce qu\'aucune pièce ne désigne s\'efface', /act==="signCancel"\)\{ g\.st="cancelled"; fichiersEffacer\(fichiersDe\(m\)\);/.test(CODE) && /restore\(\);\s*fichiersBalayer\(\);/.test(CODE));
    vrai('…la demande dans le dossier Signatures (la lecture) propose Aperçu sur ses PDF, et un message en rédaction aussi (data-pv-c)', /m\.sign&&estPDF\(a\)\?boutonApercu\(i,"data-pv-att"\)/.test(CODE) && /estPDF\(a\)\?boutonApercu\(i,"data-pv-c"\)/.test(CODE));
    vrai('…la limite tactile : le bouton Aperçu fait 44 px sur écran tactile', /@media \(pointer:coarse\)\{ \.opc \.att \.att-pv\{min-height:44px/.test(CSS));
  }
}

/* ═════════════════════════════ 6 decies. DÉSARCHIVER ═════════════════════════════ */
console.log('\n6 decies. Remettre dans la Réception (Archive, Indésirables, Corbeille)');
{
  const PR = fonction(MOD, 'peutRemettre'); vrai('(tranche trouvée) peutRemettre', PR.length > 60);
  const sb = {}; vm.createContext(sb); vm.runInContext(PR + '\n;this.p=peutRemettre;', sb);
  const mm = (folder, o) => Object.assign({ folder, from: { email: 'a@x.fr' } }, o);
  v('⛔ peutRemettre : un message REÇU dans Archive, Indésirables ou Corbeille — ni la Réception, ni les Envoyés, ni un message écrit ici, ni le journal', [sb.p(mm('archive')), sb.p(mm('junk')), sb.p(mm('trash')), sb.p(mm('inbox')), sb.p(mm('sent')), sb.p(mm('archive', { from: null })), sb.p(mm('archive', { jr: true })), sb.p(null)], [true, true, true, false, false, false, false, false]);
  /* doAct */
  const DA = fonction(MOD, 'doAct'); vrai('(tranche trouvée) doAct', DA.length > 500);
  const jour = []; const M = { a: mm('archive', { id: 'a' }), j: mm('junk', { id: 'j' }), i: mm('inbox', { id: 'i' }) };
  const sb2 = { msgById: (id) => M[id], state: { selected: null }, peutRemettre: sb.p, moveTo: (m, f, l) => jour.push(['move', m.id, f, l]), markNotJunk: (m) => jour.push(['notJunk', m.id]) };
  vm.createContext(sb2); vm.runInContext(DA + '\n;this.d=doAct;', sb2);
  sb2.d('toInbox', 'a'); sb2.d('toInbox', 'j'); sb2.d('toInbox', 'i');
  v('⛔ doAct(toInbox) : Archive/Corbeille → la Réception ; Indésirables → « pas un indésirable » (l\'expéditeur est mémorisé) ; un message déjà en Réception ne bouge pas', jour, [['move', 'a', 'inbox', 'Remis dans la réception'], ['notJunk', 'j']]);
  /* moveTo : « Annuler » le défait */
  const MT = fonction(MOD, 'moveTo'); vrai('(tranche trouvée) moveTo', MT.length > 300);
  const toasts = []; const m1 = mm('archive', { id: 'm1', uj: false, aj: false });
  const sb3 = { listIndex: () => 0, state: { selected: 'm1' }, backToListMobile() {}, renderAll() {}, persist() {}, refocus() {}, refreshCls() {}, msgById: () => m1, toast: (t, a) => toasts.push([t, a]) };
  vm.createContext(sb3); vm.runInContext(MT + '\n;this.mv=moveTo;', sb3);
  sb3.mv(m1, 'inbox', 'Remis dans la réception');
  v('⛔ remettre dans la Réception : le message est en Réception, marqué rangé par la personne (le tri ne le rejette pas), et un « Annuler » est proposé', [m1.folder, m1.uj, toasts[0][0], toasts[0][1].label], ['inbox', true, 'Remis dans la réception', 'Annuler']);
  toasts[0][1].onAct(); v('⛔ « Annuler » le remet là où il était (Archive) et le dit', [m1.folder, m1.uj, toasts[1][0]], ['archive', false, 'Annulé']);
  sb3.mv(m1, 'archive', 'Message archivé'); toasts[2][1].onAct(); v('⛔ « Annuler » après un ARCHIVAGE le défait aussi (retour en Réception)', m1.folder, 'archive');
  /* les câblages */
  const MA = fonction(MOD, 'multiAct');
  vrai('⛔ la barre de sélection multiple propose « Remettre dans la Réception » dans Archive, Indésirables et Corbeille (et Archiver ailleurs) ; l\'action ne déplace que des messages reçus', /state\.folder==="archive"\|\|state\.folder==="junk"\|\|inTrash\?b\("toInbox",I\.inbox,REMETTRE\):b\("archive",I\.archive,"Archiver"\)/.test(CODE) && /if\(act==="toInbox"\) sel=sel\.filter\(peutRemettre\)/.test(MA) && /act==="toInbox"\?"inbox"/.test(MA));
  vrai('⛔ le bouton de la barre de lecture (Mac, tactile, outils), la ligne au survol et le clic droit passent par peutRemettre', (CODE.match(/peutRemettre\(m\)/g) || []).length >= 7 && /id:"toInbox",label:REMETTRE,icon:I\.inbox/.test(CODE) && /data-q="toInbox"/.test(CODE) && /data-act="toInbox"/.test(CODE));
  vrai('…le libellé est « Remettre dans la Réception » et l\'icône celle de la boîte de réception', /var REMETTRE="Remettre dans la Réception"/.test(CODE));
}


/* ═════════════════════════════ 6 decies. LA VRAIE SIGNATURE (v2.95) : la source sait signer ═════════════════════════════ */
console.log('\n6 undecies. La vraie signature : capacité, état du serveur, relance, annulation, PDF signé, preuve — et toute erreur se DIT');
{
  const TETE_C = MOD.slice(0, MOD.indexOf('(function () {'));
  vrai('⛔ le contrat en tête décrit l\'objet `signature` et ses cinq autres méthodes (etat, relancer, annuler, signe, preuve) et la vue qu\'envoyer() rend',
    /^     signature\s+→ \{ envoyer, etat, relancer, annuler, signe, preuve \}/m.test(TETE_C) && /envoyer\(demande, fichiers\)/.test(TETE_C) && /etat\(id\) · relancer\(id\) · annuler\(id\)/.test(TETE_C) && /signe\(id, n\) → Blob/.test(TETE_C) && /preuve\(id, i\) → Blob/.test(TETE_C));
  /* la capacité : la déclaration ET les six méthodes */
  const AC = fonction(MOD, 'appliquerCapacites'); vrai('(tranche trouvée) appliquerCapacites', AC.length > 300);
  const six = { envoyer() {}, etat() {}, relancer() {}, annuler() {}, signe() {}, preuve() {} };
  const cap = (c, sg) => { const sb = { CAP: { pj: {} }, SRC: { signature: sg }, state: { folder: 'inbox' }, folderOfStrict: () => ({}), Array, Math }; vm.createContext(sb); vm.runInContext(AC + '\n;this.f=appliquerCapacites;', sb); sb.f(c); return [sb.CAP.signature, sb.CAP.signatureReelle]; };
  v('⛔ déclarée + les six méthodes → la signature RÉELLE ; déclarée sans objet → l\'ancien parcours (signature vraie, pas réelle)', [cap({ signature: true }, six), cap({ signature: true }, undefined), cap({ signature: true }, { envoyer() {} })], [[true, true], [true, false], [true, false]]);
  v('⛔ des méthodes SANS déclaration, ou une déclaration « truthy » : rien', [cap({}, six), cap({ signature: 'oui' }, six), cap(null, six)], [[false, false], [false, false], [false, false]]);
  /* le bloc : les fonctions de la vraie signature, EXTRAITES et jouées avec un faux SRC.signature */
  const BLOC = tranche('le bloc de la vraie signature', '  // ---------- La VRAIE signature', '  function signAct(act,m){', MOD);
  const SS = fonction(MOD, 'signState'), SP = fonction(MOD, 'signPreview'), ME = fonction(MOD, 'msgErr'), NF = fonction(MOD, 'nomFichierSur'); vrai('(tranche trouvée) signState, signPreview, msgErr, nomFichierSur', SS.length > 60 && SP.length > 100 && ME.length > 60 && NF.length > 200);
  const vue = (o) => Object.assign({ id: 'd1', etat: 'en_attente', echeance: Date.now() + 15 * 864e5, signataires: [{ nom: 'Marie', email: 'm@x.fr', contre: false, etat: 'pending' }, { nom: 'Justin', email: 'j@x.fr', contre: true, etat: 'pending' }], documents: [{ n: 1, nom: 'Contrat.pdf', taille: 10, signe: false }], preuves: 0, evenements: [{ t: 1, x: 'Envoyé à Marie' }] }, o || {});
  const demande = () => ({ id: 'm1', subject: 'Contrat', folder: 'sign', sign: { type: 'Contrat', level: 'adv', counter: true, remind: true, expires: 0, st: 'pending', signers: [{ name: 'Marie', email: 'm@x.fr', phone: '', st: 'pending' }], events: [] } });
  function bacS(sg, extra) {
    const notes = [], sb = Object.assign({ CAP: { signatureReelle: true }, SRC: { signature: sg }, MESSAGES: [], state: { folder: 'sign' }, vivant: true, toast: (t) => notes.push('toast:' + t), notes, Promise, JSON, Date, Math, Array, Error, Blob, String,
      msgById: (id) => sb.MESSAGES.filter((m) => m.id === id)[0] || null, renderAll: () => notes.push('rendu'), persist: () => notes.push('persist'), H: (x) => String(x), fichiersEffacer: () => notes.push('fichiers-effaces'), fichiersDe: () => [],
      document: { createElement: () => ({ click() { notes.push('clic:' + this.download); }, set href(x) {}, set rel(x) {}, set hidden(x) {} }) }, sr: { appendChild() {}, removeChild() {} }, URL: { createObjectURL: () => 'blob:x', revokeObjectURL() {} }, setTimeout: () => 0, fmtDay: String, firstLine: String }, extra || {});
    vm.createContext(sb);
    vm.runInContext(['var SIGN_RAF;', ME, NF, SS, SP, BLOC].join('\n') + '\n;this.api={signAppliquer,signEnCours,signRafraichir,signOuverture,signActSrv,signTelechargements,signEnregistrer,SIGN_RAF,signVue:()=>signVue};', sb);
    return sb;
  }
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms || 5));
  /* 1. signAppliquer : l'état du serveur fait foi */
  { const S = bacS(six), m = demande(); S.MESSAGES.push(m);
    vrai('⛔ une vue → l\'état, l\'échéance, l\'historique, l\'identifiant du serveur (`sign.srv`) ; rend VRAI si quelque chose a changé', S.api.signAppliquer(m, vue()) === true && m.sign.srv === 'd1' && m.sign.st === 'pending' && m.sign.expires > Date.now() && m.sign.events[0].x === 'Envoyé à Marie');
    v('…la MÊME vue une seconde fois ne change rien (pas de rendu inutile à chaque relevé)', S.api.signAppliquer(m, vue({ echeance: m.sign.expires })), false);
    S.api.signAppliquer(m, vue({ etat: 'ouvert', signataires: [{ nom: 'Marie', email: 'm@x.fr', contre: false, etat: 'viewed' }, { nom: 'Justin', email: 'j@x.fr', contre: true, etat: 'pending' }] }));
    v('⛔ « ouvert » : le signataire est « ouvert, pas encore signé »', [m.sign.st, m.sign.signers[0].st], ['viewed', 'viewed']);
    S.api.signAppliquer(m, vue({ etat: 'a_contresigner', signataires: [{ nom: 'Marie', email: 'm@x.fr', contre: false, etat: 'signed' }, { nom: 'Justin', email: 'j@x.fr', contre: true, etat: 'pending' }] }));
    v('⛔ « à contresigner » : le client a signé, pas la contre-signature', [m.sign.st, m.sign.signers[0].st, !!m.sign.me], ['counter', 'signed', false]);
    m.read = true; S.api.signAppliquer(m, vue({ etat: 'signe', preuves: 2, signataires: [{ nom: 'Marie', email: 'm@x.fr', contre: false, etat: 'signed' }, { nom: 'Justin', email: 'j@x.fr', contre: true, etat: 'signed' }], documents: [{ n: 1, nom: 'Contrat.pdf', signe: true }] }));
    v('⛔ « signé » : la demande l\'est, la contre-signature aussi, les téléchargements sont connus, le message repasse NON LU', [m.sign.st, !!m.sign.me, m.sign.docs, m.sign.preuves, m.read], ['signed', true, [{ n: 1, nom: 'Contrat.pdf' }], [{ n: 1, nom: 'Marie' }, { n: 2, nom: 'Justin' }], false]);
    v('⛔ chaque état du serveur a son état d\'écran (refuse, annule, expire…)', Object.entries({ refuse: 'declined', annule: 'cancelled', expire: 'expired', brouillon: 'ready' }).map(([k, st]) => { const mm = demande(); S.api.signAppliquer(mm, vue({ etat: k })); return mm.sign.st === st; }), [true, true, true, true]);
    let jette = null; try { S.api.signAppliquer(m, { etat: 'inventé', id: 'x' }); } catch (e) { jette = e.message; } vrai('⛔ un état que le serveur n\'a pas le droit de dire : ERREUR « illisible », l\'état n\'est pas touché', /illisible/.test(jette || '') && m.sign.st === 'signed', jette);
    const g2 = demande(); let j2 = null; try { S.api.signAppliquer(g2, null); } catch (e) { j2 = e.message; } vrai('…et pas de vue du tout : la même erreur', /illisible/.test(j2 || ''), j2);
    const cd = S.api.signTelechargements(m.sign);
    vrai('⛔ la carte d\'une demande signée : un bouton par PDF signé (data-act="signDl:n") et un par preuve, nommés', /data-act="signDl:1">Télécharger le PDF signé</.test(cd) && /data-act="signProof:1">Preuve — Marie</.test(cd) && /data-act="signProof:2">Preuve — Justin</.test(cd), cd); }
  /* 2. le relevé : en cours seulement, un échec se dit (une fois en fond, toujours à l'ouverture), jamais un tableau vide pris pour une réponse */
  { let reponses = {}, appels = []; const sg = Object.assign({}, six, { etat: (id) => { appels.push(id); return reponses[id] instanceof Error ? Promise.reject(reponses[id]) : Promise.resolve(reponses[id]); } });
    const S = bacS(sg); const a = demande(); a.id = 'a'; a.sign.srv = 'idA'; const b = demande(); b.id = 'b'; b.sign.srv = 'idB'; b.sign.st = 'signed'; const c = demande(); c.id = 'c'; /* local : pas de srv */ S.MESSAGES.push(a, b, c);
    v('(population) une demande en cours, une signée, une locale', [S.api.signEnCours(), S.MESSAGES.length], [true, 3]);
    reponses.idA = vue({ id: 'idA', etat: 'signe' });
    {
      await S.api.signRafraichir(true);
      v('⛔ le relevé ne questionne QUE les demandes du serveur encore en cours (ni la signée, ni la locale)', appels, ['idA']);
      v('…l\'état arrive, l\'écran est repeint et rangé, et le changement est ANNONCÉ', [a.sign.st, S.notes.includes('rendu'), S.notes.includes('persist'), S.notes.filter((n) => /toast:Document signé par tous/.test(n)).length], ['signed', true, true, 1]);
      v('…plus rien en cours : plus de relevé', [S.api.signEnCours(), (await S.api.signRafraichir(true), appels.length)], [false, 1]);
      const S2 = bacS(Object.assign({}, six, { etat: () => Promise.reject(new Error('Le service de signature est injoignable')) })); const e1 = demande(); e1.id = 'e'; e1.sign.srv = 'idE'; S2.MESSAGES.push(e1);
      await S2.api.signRafraichir(false); await S2.api.signRafraichir(false);
      v('⛔ échec du service en TÂCHE DE FOND : dit UNE fois (pas toutes les 60 s) avec la raison, l\'état reste celui d\'avant (jamais un faux « signé »)', [S2.notes.filter((n) => /L’état des signatures n’a pas pu être relu : Le service de signature est injoignable/.test(n)).length, e1.sign.st], [1, 'pending']);
      await S2.api.signRafraichir(true);
      v('…mais à l\'OUVERTURE de Signatures il se dit chaque fois', S2.notes.filter((n) => /n’a pas pu être relu/.test(n)).length, 2);
      const S3 = bacS(six, { CAP: { signatureReelle: false } }); const e3 = demande(); e3.id = 'f'; e3.sign.srv = 'idF'; S3.MESSAGES.push(e3);
      v('⛔ la source ne sait plus signer (service éteint) : le relevé ne fait rien et ne prétend rien', [S3.api.signEnCours(), await S3.api.signRafraichir(true), S3.notes], [false, undefined, []]);
      /* l'ouverture du dossier : un relevé par ouverture */
      let n = 0; const S4 = bacS(Object.assign({}, six, { etat: () => { n++; return Promise.resolve(vue({ id: 'idG' })); } })); const g = demande(); g.id = 'g'; g.sign.srv = 'idG'; S4.MESSAGES.push(g);
      S4.api.signOuverture(); S4.api.signOuverture(); await attendre(20); S4.state.folder = 'inbox'; S4.api.signOuverture(); S4.state.folder = 'sign'; S4.api.signOuverture(); await attendre(20);
      v('⛔ ouvrir Signatures relit l\'état UNE fois ; le quitter puis y revenir le relit', n, 2);
      await suite();
    }
  }
  async function suite() {
    /* 3. relancer, annuler, télécharger */
    let rep = null; const sg = Object.assign({}, six, { relancer: (id) => rep(id), annuler: (id) => rep(id), signe: (id, n) => rep(id, n), preuve: (id, i) => rep(id, i) });
    const mk3 = (S) => { const m = demande(); m.sign.srv = 'idR'; S.MESSAGES.push(m); return m; };
    { const S = bacS(sg), m = mk3(S); rep = () => Promise.resolve(vue({ id: 'idR', evenements: [{ t: 2, x: 'Relance envoyée à Marie' }] }));
      S.api.signActSrv('signRemind', m); await attendre(); v('⛔ Relancer : le serveur est appelé, l\'historique du serveur arrive, « Relance envoyée »', [m.sign.events[0].x, S.notes.includes('toast:Relance envoyée')], ['Relance envoyée à Marie', true]);
      rep = () => Promise.reject(new Error('Une relance vient de partir — patientez dix minutes.')); S.api.signActSrv('signRemind', m); await attendre();
      vrai('⛔ le serveur REFUSE la relance : le refus se DIT avec sa raison, jamais « Relance envoyée » (une seule annonce de succès au total)', S.notes.includes('toast:Relance impossible : Une relance vient de partir — patientez dix minutes.') && S.notes.filter((x) => x === 'toast:Relance envoyée').length === 1, S.notes.join(' | ')); }
    { const S = bacS(sg), m = mk3(S); let k = 0; rep = () => { k++; return new Promise((ok) => setTimeout(() => ok(vue({ id: 'idR', etat: 'annule' })), 20)); };
      S.api.signActSrv('signCancel', m); S.api.signActSrv('signCancel', m); await attendre(40);
      v('⛔ Annuler : une demande à la fois (le double clic n\'appelle le serveur qu\'UNE fois), état « annulé », fichiers de l\'appareil effacés', [k, m.sign.st, S.notes.includes('fichiers-effaces'), S.notes.includes('toast:Demande annulée')], [1, 'cancelled', true, true]);
      const S2 = bacS(Object.assign({}, sg, { annuler: () => Promise.reject(new Error('Le prestataire de signature (Yousign) a refusé la demande.')) })), m2 = mk3(S2); S2.api.signActSrv('signCancel', m2); await attendre();
      vrai('⛔ le serveur refuse l\'annulation : la demande reste EN COURS, les fichiers restent, le refus est dit', m2.sign.st === 'pending' && !S2.notes.includes('fichiers-effaces') && S2.notes.some((x) => /Annulation impossible : Le prestataire/.test(x)), S2.notes.join(' | ')); }
    { const S = bacS(sg), m = mk3(S); m.sign.docs = [{ n: 1, nom: 'Contrat 2027.pdf' }]; m.sign.preuves = [{ n: 1, nom: 'Marie' }]; const dem = [];
      rep = (id, n) => { dem.push([id, n]); return Promise.resolve(new Blob(['%PDF-1.4 x'])); };
      S.api.signActSrv('signDl:1', m); await attendre(); S.api.signActSrv('signProof:1', m); await attendre();
      v('⛔ « PDF signé » et « Dossier de preuve » : le bon document (n) et le bon signataire (i) sont demandés ; le fichier est enregistré sous un nom lisible', [dem, S.notes.filter((x) => /^clic:/.test(x))], [[['idR', 1], ['idR', 1]], ['clic:Contrat 2027 (signé).pdf', 'clic:Dossier de preuve — Marie.pdf']]);
      S.api.signActSrv('signDl:9', m); await attendre(); vrai('…un document qui n\'existe pas : « introuvable », aucun appel au serveur', dem.length === 2 && S.notes.includes('toast:Fichier introuvable.'));
      rep = () => Promise.reject(new Error('Le PDF signé se prépare — réessayez dans un instant.')); S.api.signActSrv('signDl:1', m); await attendre();
      vrai('⛔ le serveur ne l\'a pas encore : le refus se dit (« se prépare »), aucun téléchargement', S.notes.some((x) => /Téléchargement impossible : Le PDF signé se prépare/.test(x)) && S.notes.filter((x) => /^clic:/.test(x)).length === 2);
      rep = () => Promise.resolve(new Blob([])); S.api.signActSrv('signDl:1', m); await attendre();
      vrai('⛔ un fichier VIDE n\'est pas un PDF signé : refus lisible, pas de téléchargement fantôme', S.notes.some((x) => /Téléchargement impossible : Le service de signature a rendu un fichier vide/.test(x)) && S.notes.filter((x) => /^clic:/.test(x)).length === 2); }
    { const S = bacS(six, { CAP: { signatureReelle: false } }), m = mk3(S); S.api.signActSrv('signRemind', m); S.api.signActSrv('signDl:1', m); await attendre();
      v('⛔ le service n\'est plus joignable (capacité retirée) : relancer / télécharger le DISENT, ne font rien', S.notes.filter((x) => /n’est pas joignable/.test(x)).length, 2); }
    /* 4. le formulaire : le bouton Envoyer de la vraie signature */
    const env = tranche('l\'envoi réel', '    function envoyerReel(a,title,level,body){', '    setTimeout(function(){ (docs.length?$("#sgN0")', CODE);
    vrai('⛔ « Envoyer » avec la vraie signature appelle SRC.signature.envoyer, et ne RANGE la demande (mk, MESSAGES.push, toast « envoyée ») que DANS la réponse du serveur', env.indexOf('SRC.signature.envoyer(') > 0 && env.indexOf('SRC.signature.envoyer(') < env.indexOf('mk({acct:a') && env.indexOf('mk({acct:a') < env.indexOf('MESSAGES.push(m)') && env.indexOf('MESSAGES.push(m)') < env.indexOf('Demande de signature envoyée'));
    vrai('⛔ …l\'échec du serveur laisse la fenêtre OUVERTE, rend le bouton, dit « Rien n\'est parti » dans la fenêtre ET en toast ; jamais de closeOverlay avant la réponse', /function\(e\)\{ if\(!vivant\) return; libre\(\); var t=msgErr\(e,"échec de l’envoi"\); dit\("Rien n’est parti : "\+t\); toast\("Rien n’est parti : "\+t\); \}/.test(env) && env.indexOf('closeOverlay()') > env.indexOf('SRC.signature.envoyer('));
    vrai('…un seul envoi à la fois (le double clic ne crée pas deux demandes), le bouton est désactivé et marqué occupé', /if\(envoi\) return;/.test(env) && /go\.disabled=true; go\.setAttribute\("aria-busy","true"\)/.test(env));
    vrai('⛔ le niveau « Code SMS » devient `avance`, « Code e-mail » `simple` (les mots du serveur) ; la contre-signature est l\'expéditeur (sa boîte), avec SON mobile', /niveau:level==="adv"\?"avance":"simple"/.test(env) && /dem\.contresignature=\{nom:me\.name,email:me\.email,telephone:mob\}/.test(env));
    vrai('⛔ le mobile de l\'expéditeur est exigé avant d\'appeler le service (Code SMS + contre-signature) ; un modèle sans fichier est refusé avec sa raison', /contre&&level==="adv"&&!\/\^\\\+\?\[\\d\\s\.-\]\{9,\}\$\/\.test\(mob\)/.test(env) && /est un modèle sans fichier/.test(env));
    vrai('…les PDF viennent du fichier choisi OU de celui gardé sur l\'appareil (IndexedDB), et s\'ils ont disparu l\'envoi le dit', /d\.file\?Promise\.resolve\(d\.file\):fichierLire\(d\.fid\)/.test(env) && /n’est plus gardé sur cet appareil/.test(env));
    vrai('…le branchement : la vraie signature passe AVANT le rangement « Prête » ; sans elle, ce rangement reste intact', /if\(CAP\.signatureReelle\)\{ envoyerReel\(a,title,level,body\); return; \}\s*if\(!CAP\.signature\)\{/.test(CODE));
    vrai('une demande « Prête » déjà rangée peut être envoyée par « Renvoyer » : le formulaire rempli passe par le même envoi, et remplace la demande rangée', /if\(pre\.remplace\) removeMsg\(pre\.remplace,true\)/.test(env));
    vrai('la carte d\'une demande du serveur : contre-signature par le LIEN reçu par e-mail (pas de tracé local), relancer / annuler passent par le serveur ; une demande « Prête » dit que « Renvoyer » l\'envoie', /g\.srv\?'<b>À vous de signer<\/b> — lien reçu par e-mail'/.test(fonction(MOD, 'signCardHtml')) && /Rien n’est parti : « Renvoyer » l’envoie maintenant/.test(CODE) && /if\(g\.srv&&\/\^sign\(Remind\|Cancel\|Dl\|Proof\)\(:\|\$\)\/\.test\(act\)\)\{ signActSrv\(act,m\); return; \}/.test(fonction(MOD, 'signAct')));
    vrai('le relevé automatique : toutes les 60 s tant qu\'une demande est en cours, à l\'ouverture du dossier (renderAll)', /Date\.now\(\)-SIGN_RAF\.t>=60000-100&&signEnCours\(\)\) signRafraichir\(false\)/.test(CODE) && /paintTitle\(\); signOuverture\(\); \}/.test(CODE));
    vrai('le mobile de l\'expéditeur est gardé sur l\'appareil (réglages) et relu', /if\(contre&&level==="adv"\) SETTINGS\.mobile=mob/.test(env) && /SETTINGS\.mobile=snap\.settings\.mobile\.slice\(0,30\)/.test(CODE));
    vrai('⛔ le module ne sort toujours JAMAIS du réseau : aucun fetch, tout passe par SRC.signature', !/\bfetch\s*\(/.test(CODE) && !/XMLHttpRequest/.test(CODE));
  }
}

/* ═════════════════════════════ 7. LE SITE ET LES SONDES ═════════════════════════════ */
console.log('\n7. Dans le site assemblé, et gardé');
vrai('opcourrier.js est à la racine : le script d\'assemblage prend les *.js de la racine par leur forme', fs.existsSync(path.join(RACINE, 'opcourrier.js')) && /for f in \*\.html \*\.js/.test(lire('scripts/assembler-site.sh')));
v('les sondes qui gardent le module existent', ['ctx_check.js', 'miss_check.js', 'sign_check.js', 'audit_contrast.js', 'sonde-module.js', 'sonde-gestion.js', 'essai.html', 'source-demo.js', 'pilote.js'].filter(f => !fs.existsSync(path.join(RACINE, 'scratchpad/courrier', f))), []);
vrai('le moteur de tri du module est le MÊME texte que la référence (test-2700 le joue ; ici on vérifie qu\'il n\'est pas dupliqué)', (MOD.match(/var OPClassify = \(function \(\) \{/g) || []).length === 1);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
})();
