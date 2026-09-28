/* ⛔ CE QUE CE FICHIER GARDE — la pastille ≡ de la Tour au téléphone, et son tiroir (v2.75).
   Justin, 27 septembre 2026, capture de la pastille ≡ d'OP GESTION à l'appui : « je voudrais aussi ça pour avoir
   accès à toutes les catégories dans la tour » ; puis, capture du menu du bureau de la Tour : « sur la tour sur
   téléphone je [veux] aussi ce menu ». La pastille ouvre un tiroir qui reprend le menu du bureau : la marque, qui
   conduit, l'interrupteur GESTION / MESSAGES, les sections, chaque vue avec son icône et son compteur, la vue ouverte
   marquée — dessiné au doigt.

   Ce banc EXÉCUTE la vraie `tiroirHtml` (extraite de tour.html, avec le vrai MENU, `menuVisible` et `vuePermise`) :
   TOUTES les vues que ce compte peut ouvrir, dans l'ordre, chacune une fois — et pas une de plus (celles du patron
   seul restent au patron) ; les compteurs recopiés du menu du bureau ; aucun id (ceux du menu du bureau y sont
   déjà : `setBdg` viserait le mauvais) ; le nom de qui conduit ÉCHAPPÉ. Puis il relit dans le CODE — commentaires
   retirés, règle du dépôt — les gardes que seul un navigateur peut jouer : jamais deux panneaux, le focus rendu à
   la pastille, Échap, le doigt par le TACTILE (le navigateur annule le flux de pointeur au premier mouvement
   horizontal), le tap qui suit un glissé avalé, le bureau qui referme.
   Le geste lui-même se mesure au doigt : `scratchpad/sonde-tour-tiroir.js`.
   TOUR_FICHIER : une copie mutée, pour éprouver ce banc sans toucher au fichier du dépôt. */
'use strict';
const fs = require('fs'), vm = require('vm');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || __dirname + '/../tour.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + d : ''), !!c, true);
/* on ne cherche que dans le CODE ; seuls les blocs qui COMMENCENT une ligne sont retirés (règle du dépôt) */
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function fonction(nom) {
  const m = new RegExp('\\nfunction ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) {
    const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === '/' && CODE[k + 1] === '*') { k = CODE.indexOf('*/', k) + 1; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return CODE.slice(m.index + 1, k + 1);
}
const ligne = (debut) => { const i = CODE.indexOf(debut); if (i < 0) return ''; return CODE.slice(i, CODE.indexOf('\n', i)); };
const bloc = (debut, fin) => { const i = CODE.indexOf(debut); if (i < 0) return ''; const j = CODE.indexOf(fin, i); return j < 0 ? '' : CODE.slice(i, j + fin.length); };

console.log('1. Les pièces sont là, une fois chacune');
['tiroirHtml', 'tiroirBasculer', 'tiroirPastille', 'ouvrirTiroir', 'fermerTiroir', 'tiroirAller', 'tiroirApp', 'tiroirRafraichir'].forEach(n =>
  v('une seule définition de ' + n, (CODE.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length, 1));
const HTML_PASTILLE = (SRC.match(/<button[^>]*id="menu-rond"[^>]*>/) || [''])[0];
vrai('la pastille est un <button> qui dit ce qu\'il ouvre (aria-controls, aria-expanded, un nom)',
  /type="button"/.test(HTML_PASTILLE) && /aria-controls="tiroir"/.test(HTML_PASTILLE) && /aria-expanded="false"/.test(HTML_PASTILLE) && /aria-label="Ouvrir le menu"/.test(HTML_PASTILLE) && /onclick="tiroirBasculer\(\)"/.test(HTML_PASTILLE), HTML_PASTILLE);
vrai('   elle est dans l\'en-tête, AVANT l\'identité (en haut à gauche)', SRC.indexOf('id="menu-rond"') > 0 && SRC.indexOf('id="menu-rond"') < SRC.indexOf('<div class="hg">'));
vrai('le tiroir est une fenêtre nommée (role="dialog", aria-modal, aria-label), caché au départ',
  /<div class="tiroir" id="tiroir" role="dialog" aria-modal="true" aria-label="[^"]+" hidden><\/div>/.test(SRC));
vrai('   son voile le referme', /<div class="scrim" id="scrim-tiroir" hidden onclick="fermerTiroir\(\)"><\/div>/.test(SRC));

console.log('\n2. Le tiroir, joué avec les vraies fonctions');
const MENU = bloc('var MENU=[', '];');
vrai('le menu est trouvé (population)', MENU.length > 300, MENU.length);
const JEU = [MENU, ligne('var PATRON_SEUL='), fonction('vuePermise'), fonction('menuVisible'),
  /* esc tient sur UNE ligne, et son expression régulière porte des guillemets : le compteur d'accolades la prendrait
     pour une chaîne ouverte et déborderait sur la fonction d'après */
  ligne('function esc('),
  bloc('var IC={', '};'), fonction('svg'), bloc('var APPS_TOUR={', '} };'), ligne('var APP_TEINTE='), fonction('tiroirHtml')].join('\n');
vrai('les pièces du jeu sont trouvées (population)', !/\n\n\n/.test('\n' + JEU + '\n') && JEU.indexOf('function tiroirHtml') > 0 && JEU.indexOf('var IC={') >= 0 && JEU.indexOf('var APPS_TOUR={') >= 0, JEU.length);
function jouer(o) {
  const els = {};
  const el = (id, txt, vu) => { els[id] = { textContent: txt, hidden: vu === false, style: { display: vu === false ? 'none' : '' } }; };
  el('h-sous', o.sous || '');
  el('app-n-gestion', '2', !!o.nGestion); el('app-n-messages', String(o.nMessages || 0), !!o.nMessages);
  el('bdg-surv', String(o.surv || 0), !!o.surv); el('bdg-supp', String(o.supp || 0), !!o.supp);
  const ctx = { MYROLE: o.role || 'patron', APP: o.app || 'gestion', TAB: o.tab || 'accueil', MYAPPS: o.apps || ['gestion'], TOUR_VERSION: 'v9.99',
    $: id => els[id] || null };
  vm.createContext(ctx);
  /* un tiroir absent ou cassé est un ÉCHEC compté, pas une exception : le banc rend toujours son total */
  try { vm.runInContext(JEU + '\n;__h = tiroirHtml(); __vues = []; menuVisible().forEach(function(g){ g.vues.forEach(function(x){ __vues.push(x[0]); }); });', ctx); }
  catch (e) { vrai('le tiroir se dessine sans erreur', false, String(e && e.message || e)); ctx.__h = ''; ctx.__vues = []; }
  const h = ctx.__h;
  const lignes = [...h.matchAll(/<button type="button" class="ti( on)?" data-t="([a-z]+)"( aria-current="page")?[^>]*>([\s\S]*?)<\/button>/g)]
    .map(m => ({ t: m[2], on: !!m[1], cur: !!m[3], bdg: (m[4].match(/<span class="(bdg-[rb])">(\d+)<\/span>/) || []).slice(1).join(':') }));
  return { h, lignes, vues: ctx.__vues };
}
let J = jouer({});
vrai('population : le menu du patron compte ' + J.vues.length + ' vues', J.vues.length >= 10, J.vues.length);
v('⛔ patron, GESTION : TOUTES les vues du menu, dans l\'ordre, chacune une fois', J.lignes.map(x => x.t), J.vues);
v('   la vue ouverte (Accueil), et elle seule, est marquée et annoncée (aria-current)', J.lignes.filter(x => x.on || x.cur).map(x => x.t + '/' + x.on + '/' + x.cur), ['accueil/true/true']);
v('   une section par groupe du menu, en capitales dessinées (pas tapées)', (J.h.match(/<div class="ti-sec">/g) || []).length, 4);
v('⛔ aucun id dans le tiroir (bdg-surv, app-n-… sont déjà au menu du bureau : setBdg viserait le mauvais)', (J.h.match(/\sid="/g) || []).length, 0);
vrai('   le pied : « Personnaliser la barre » (ferme le tiroir, ouvre la feuille) et « Quitter », puis la version',
  /onclick="fermerTiroir\(true\);ouvrirFeuille\('barre'\)"/.test(J.h) && /class="ti ti-quitter" onclick="doLogout\(\)"/.test(J.h) && /<div class="ti-version">Tour OP GESTION · v9\.99<\/div>/.test(J.h));
vrai('   chaque vue s\'ouvre par tiroirAller (qui referme avant d\'ouvrir)', J.lignes.length && J.h.match(/onclick="tiroirAller\('/g).length === J.lignes.length);
v('   une seule console : pas d\'interrupteur', /class="app-sw"/.test(J.h), false);

J = jouer({ surv: 3, supp: 0 });
v('les compteurs suivent le menu du bureau : Surveillance 3 (rouge), Courrier caché → rien', J.lignes.filter(x => x.bdg).map(x => x.t + '=' + x.bdg), ['surveillance=bdg-r:3']);
J = jouer({ surv: 0, supp: 5 });
v('   Courrier 5 (bleu), Surveillance à zéro → rien', J.lignes.filter(x => x.bdg).map(x => x.t + '=' + x.bdg), ['support=bdg-b:5']);

J = jouer({ role: 'collaborateur' });
v('⛔ un collaborateur : ni Accès, ni Équipe, ni Journal, ni Sauvegardes (patron seul, comme le serveur)',
  J.lignes.map(x => x.t).filter(t => ['essais', 'equipe', 'journal', 'donnees'].includes(t)), []);
v('   … et tout le reste, dans l\'ordre', J.lignes.map(x => x.t), J.vues);

J = jouer({ app: 'messages', apps: ['gestion', 'messages'], tab: 'support', nMessages: 0, nGestion: true });
v('console MESSAGES : ses vues seulement', J.lignes.map(x => x.t), J.vues);
vrai('   population : elles sont moins nombreuses que celles de GESTION', J.vues.length > 0 && J.vues.length < jouer({}).vues.length);
v('   la vue ouverte (Courrier) marquée', J.lignes.filter(x => x.on).map(x => x.t), ['support']);
const SW = (J.h.match(/<div class="app-sw"[\s\S]*?<\/div>/) || [''])[0];
v('deux consoles : l\'interrupteur, la console ouverte pressée', [...SW.matchAll(/data-app="(\w+)" aria-pressed="(\w+)"/g)].map(m => m[1] + '=' + m[2]), ['gestion=false', 'messages=true']);
vrai('   le compteur de l\'autre console est recopié (2), celui qui est caché le reste', /data-app="gestion"[\s\S]*?<span class="app-n">2<\/span>/.test(SW) && /data-app="messages"[\s\S]*?<span class="app-n" hidden>/.test(SW), SW);
vrai('   chaque bouton change de console par tiroirApp', (SW.match(/onclick="tiroirApp\('/g) || []).length === 2);
vrai('   la pastille de couleur vient de la table APP_TEINTE (le vérificateur de thème ne lit pas un nom bâti)',
  /<i style="--c:var\(--app-messages\)"><\/i>MESSAGES/.test(SW) && !/var\(--app-'\+a/.test(fonction('tiroirHtml')), SW);

J = jouer({ sous: 'Jo <img src=x onerror=alert(1)>' });
vrai('⛔ le nom de qui conduit est ÉCHAPPÉ', J.h.includes('Jo &lt;img src=x onerror=alert(1)&gt;') && !J.h.includes('<img src=x'), (J.h.match(/<div class="ti-nom">[\s\S]*?<\/div>/) || [''])[0]);
J = jouer({ sous: '' });
v('   sans nom, pas de ligne vide sous « La Tour »', /<div class="ti-nom"><b>La Tour<\/b><\/div>/.test(J.h), true);

console.log('\n3. Les gardes du geste, relues dans le code');
const OUV = fonction('ouvrirTiroir'), FER = fonction('fermerTiroir'), ALLER = fonction('tiroirAller'), APPF = fonction('tiroirApp'), PAST = fonction('tiroirPastille'), RAF = fonction('tiroirRafraichir');
vrai('population : les six fonctions du geste sont trouvées', [OUV, FER, ALLER, APPF, PAST, RAF].every(f => f.length > 20));
vrai('⛔ jamais deux panneaux : ouvrir le tiroir referme la feuille « Plus » AVANT de s\'afficher',
  /if\(feuilleVisible\(\)\) fermerFeuille\(\);/.test(OUV) && OUV.indexOf('fermerFeuille()') < OUV.indexOf('t.hidden=false'));
vrai('   le tiroir est réécrit à chaque ouverture (les compteurs du moment)', /t\.innerHTML=tiroirHtml\(\)/.test(OUV));
vrai('⛔ … et il repart de sa MARQUE : défilement remis à zéro une fois MONTRÉ (caché, il ignore scrollTop ; relecture)',
  OUV.indexOf('t.scrollTop=0;') > OUV.indexOf('t.hidden=false') && OUV.indexOf('t.hidden=false') > 0 && OUV.indexOf('t.scrollTop=0;') < OUV.indexOf("var on=t.querySelector('.ti.on')"));
vrai('   aria-expanded suit : vrai à l\'ouverture, faux à la fermeture', /tiroirPastille\(true\)/.test(OUV) && /tiroirPastille\(false\)/.test(FER)
  && /setAttribute\('aria-expanded',String\(ouvert\)\)/.test(PAST));
vrai('   le focus entre dans le tiroir, et revient à la pastille SEULEMENT s\'il y était', /\.focus\(\{preventScroll:true\}\)/.test(OUV)
  && /var dedans=t\.contains\(document\.activeElement\)/.test(FER) && /if\(dedans&&b\)/.test(FER));
vrai('   la page ne défile pas derrière (classe posée, puis retirée)', /classList\.add\('tiroir-ouvert'\)/.test(OUV) && /classList\.remove\('tiroir-ouvert'\)/.test(FER));
vrai('   refermer efface le déplacement posé par le doigt (il repart d\'où le doigt l\'a laissé)', /t\.style\.transform='';/.test(FER));
vrai('⛔ une vue choisie : le tiroir se referme PUIS la vue s\'ouvre sans transition de vue', /fermerTiroir\(\);\s*setTab\(v,true\)/.test(ALLER));
vrai('   changer de console depuis le tiroir passe par setApp', /setApp\(a,true\)/.test(APPF));
console.log('\n3 bis. Un seul point de rafraîchissement (relecture : Ctrl+Maj+G, le retour, un compteur)');
v('⛔ setTab, setBdg et majCompteursApp redessinent le tiroir ouvert', ['setTab', 'setBdg', 'majCompteursApp'].map(n => /tiroirRafraichir\(\);\s*\}$/.test(fonction(n))), [true, true, true]);
vrai('   rien si le tiroir est fermé', /if\(!_tiroirOuvert\) return;/.test(RAF));
vrai('   jamais sous un doigt posé : on retient, et on rattrape une fois le doigt levé et le clic passé',
  /if\(_tiroirDoigt\)\{ _tiroirARefaire=true; return; \}/.test(RAF) && /_tiroirDoigt=true; s=\{/.test(CODE) && /if\(_tiroirARefaire\) setTimeout\(function\(\)\{ if\(!_tiroirDoigt\) tiroirRafraichir\(\); \},400\)/.test(CODE));
vrai('   le défilement et le bouton qui a le focus sont gardés', /var st=t\.scrollTop/.test(RAF) && /t\.scrollTop=st;/.test(RAF) && /\.focus\(\{preventScroll:true\}\)/.test(RAF));
const ECHAP = ligne("document.addEventListener('keydown',function(e){ if(e.key==='Escape')");
vrai('⛔ Échap referme le tiroir d\'abord, la feuille ensuite', /if\(_tiroirOuvert\)\{ fermerTiroir\(\); return; \}/.test(ECHAP) && ECHAP.indexOf('fermerTiroir') < ECHAP.indexOf('fermerFeuille'), ECHAP);
const GESTE = bloc("(function(){ var s=null;\n  document.addEventListener('touchstart'", '})();');
vrai('population : le bloc du doigt est trouvé', GESTE.length > 800, GESTE.length);
vrai('⛔ le doigt par le TACTILE (touchstart / touchmove / touchend / touchcancel), jamais le pointeur',
  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].every(x => GESTE.includes("'" + x + "'")) && !/pointer(move|down|up)/.test(GESTE));
vrai('   seul un doigt posé DANS le tiroir ouvert compte', /if\(!_tiroirOuvert\|\|!t\|\|!e\.touches\|\|e\.touches\.length!==1\|\|!t\.contains\(e\.target\)\) return;/.test(GESTE));
vrai('   un doigt qui part à la verticale fait défiler, il ne tire pas le tiroir', /Math\.abs\(dy\)>=6&&Math\.abs\(dy\)>Math\.abs\(dx\)\)\{ s=null; return; \}/.test(GESTE));
vrai('   le tiroir suit le doigt vers la GAUCHE seulement (jamais au-delà du bord)', /var x=Math\.min\(0,dx\)/.test(GESTE));
vrai('   au lâcher, l\'élan PROJETÉ décide (0,998, comme la feuille)', /0\.998\/\(1-0\.998\)/.test(GESTE));
vrai('   un geste perdu (touchcancel) ne referme pas : le tiroir revient', /touchcancel',function\(\)\{ lacher\(true\); \}/.test(GESTE) && /if\(!annule&&projete>/.test(GESTE));
vrai('⛔ le tap qui suit un glissé est avalé (la ligne lâchée sous le doigt ne s\'ouvre pas)',
  /_tiroirGlisseFin=Date\.now\(\)/.test(GESTE) && /document\.addEventListener\('click',function\(e\)\{ if\(Date\.now\(\)-_tiroirGlisseFin>350\) return;/.test(GESTE) && /e\.preventDefault\(\); e\.stopPropagation\(\);/.test(GESTE) && /\},true\);/.test(GESTE));
vrai('   au clavier, Tab tourne dans le tiroir', /if\(e\.key!=='Tab'\|\|!_tiroirOuvert\) return;/.test(GESTE));
vrai('⛔ un écran qui s\'élargit (tablette qui tourne) referme le tiroir : le menu du bureau est là',
  /matchMedia\('\(min-width:900px\)'\)/.test(GESTE) && /if\(mq\.matches&&_tiroirOuvert\) fermerTiroir\(true\)/.test(GESTE));

console.log('\n4. Au bureau : rien de tout ça');
const CSS = SRC.slice(SRC.indexOf('/* 19 · (v2.75) LA PASTILLE DU MENU'), SRC.indexOf('</style>', SRC.indexOf('/* 19 · (v2.75) LA PASTILLE DU MENU')));
vrai('population : le bloc de style de la pastille est trouvé', CSS.length > 2000, CSS.length);
vrai('pastille, tiroir et voile sont éteints par défaut, et au bureau même par erreur (!important)',
  /\.menu-rond,\.tiroir,#scrim-tiroir\{display:none\}/.test(CSS) && /@media\(min-width:900px\)\{\.menu-rond,\.tiroir,#scrim-tiroir\{display:none!important\}\}/.test(CSS));
vrai('au téléphone : 44 × 44, ronde, touchée sans délai', /\.menu-rond\{display:flex;[^}]*width:44px;height:44px;[^}]*border-radius:50%;[^}]*touch-action:manipulation/.test(CSS));
vrai('   « animations réduites » : le tiroir ne glisse plus, il paraît — sauf sous le doigt (.glisse : il le suit)',
  /\.tiroir:not\(\.glisse\),\.tiroir\.on:not\(\.glisse\)\{transition:opacity[^}]*transform:none!important/.test(CSS)
  && /s\.engage=true; s\.t\.style\.transition='none'; s\.t\.classList\.add\('glisse'\);/.test(CODE) && /st\.t\.classList\.remove\('glisse'\)/.test(CODE) && /classList\.remove\('on','glisse'\)/.test(FER));
vrai('   « transparence réduite » : ni la pastille ni le tiroir ne floutent', /@media\(prefers-reduced-transparency:reduce\)\{\s*\.menu-rond,\.tiroir\{-webkit-backdrop-filter:none!important;backdrop-filter:none!important\}/.test(CSS));
vrai('   le titre qui monte dans l\'en-tête efface le logo (il tomberait sous le titre)', /body\.titre-cache \.hlogo\{opacity:0\}/.test(CSS));
vrai('⛔ le nom de qui conduit reste dans sa colonne (il s\'écrivait sous « GESTION », relecture) : colonne bornée, pastille d\'application entière',
  /\.hg\{min-width:0;flex:0 1 auto\}/.test(CSS) && /\.hnom\{min-width:0;overflow:hidden\}/.test(CSS) && /\.app-pill\{flex-shrink:0\}/.test(CSS));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
