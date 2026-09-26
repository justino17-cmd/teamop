/* ⛔ CE QUE CE FICHIER GARDE — la barre du bas de la Tour, au téléphone (v2.67).
   Justin, 26 septembre 2026, capture de la barre à l'appui : « j'aimerais qu'en restant appuyé sur la
   barre, je puisse la personnaliser et choisir ce que je veux dans la barre, et aussi que le glissement
   de la bulle marche comme sur OP GESTION ».

   Deux mécaniques, reprises d'OP GESTION (app.html : `ongletsPresse`, `ongletsBulle`, `formOnglets`) :
     · « Ma barre » : un appui long sur un onglet (ou « Plus » → « Personnaliser la barre ») ouvre une
       feuille où l'on choisit quatre vues, dans l'ordre où on les touche, PAR CONSOLE ;
     · la bulle : UNE pastille qui glisse d'un onglet à l'autre, qu'on attrape et qu'on promène au doigt.

   Ce banc joue les VRAIES fonctions du choix (extraites de tour.html, exécutées dans un bac à sable)
   et relit dans le CODE — commentaires retirés, règle du dépôt — les gardes du geste que seul un
   navigateur peut jouer. Le geste lui-même se mesure au doigt : `scratchpad/sonde-tour-barre.js`
   (de vrais événements tactiles, la bulle relevée image par image sous le doigt reçu par la page).

   Deux défauts trouvés en l'écrivant, et gardés ici :
     · le relâcher de l'appui long tombait sur la feuille montée SOUS le doigt : « Devis IA » se
       cochait tout seul, ou « Quatre vues au maximum » s'affichait avant qu'on ait rien touché ;
     · le toast avalait pendant deux secondes et demie le toucher de la ligne qu'il couvrait. */
'use strict';
const fs = require('fs'), vm = require('vm');
/* TOUR_FICHIER : une copie mutée, pour éprouver le banc sans jamais toucher le fichier du dépôt */
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || __dirname + '/../tour.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + d : ''), !!c, true);
/* on ne cherche que dans le CODE : les noms qu'on cherche sont écrits dans les commentaires qui les
   expliquent. Seuls les blocs qui COMMENCENT une ligne sont retirés (règle du dépôt). */
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/* une fonction jusqu'à SA fin : accolades comptées hors chaînes et hors commentaires — une découpe
   qui déborde rend un verdict faux (règle du dépôt) */
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
const NOMS = ['barreDispo', 'barreDe', 'barreLire', 'renderBarreBas', 'majBarreBas', 'bbCurPlacer', 'feuilleVisible', 'barrePresse', 'barreBulle',
  'barreBascule', 'barreCompteTxt', 'barreRepeindre', 'barreDefaut', 'barreValider'];
NOMS.forEach(n => v('une seule définition de ' + n, (CODE.match(new RegExp('\\nfunction ' + n + '\\(', 'g')) || []).length, 1));

console.log('\n2. Le choix, joué avec les vraies fonctions');
const MENU = bloc('var MENU=[', '];');
vrai('le menu est trouvé (population)', MENU.length > 300, MENU.length);
const JEU = [MENU, fonction('menuVisible'), ligne('var BAS_DEFAUT='), ligne('var BAS_MAX='), ligne('var BAS=BAS_DEFAUT'),
  bloc('var BAS_LIB={', '};'), fonction('barreDispo'), fonction('barreDe'), ligne('var _barreRepli='), fonction('barreLire'),
  ligne('var _barreBrouillon='), fonction('barreBascule'), fonction('barreCompteTxt'), fonction('barreRepeindre'),
  fonction('barreDefaut'), fonction('barreValider')].join('\n');
function bac(role, app) {
  const rangement = new Map(); let plein = false;
  const journal = { toasts: [], rendus: 0, fermee: 0 };
  const ctx = {
    APP: app || 'gestion', MYROLE: role || 'patron',
    localStorage: { getItem: k => rangement.has(k) ? rangement.get(k) : null,
      setItem: (k, x) => { if (plein) { const e = new Error('plein'); e.name = 'QuotaExceededError'; throw e; } rangement.set(k, String(x)); },
      removeItem: k => rangement.delete(k) },
    toast: (t) => journal.toasts.push(t), $: () => null, document: { querySelectorAll: () => [] },
    renderBarreBas: () => { journal.rendus++; }, fermerFeuille: () => { journal.fermee++; }, console };
  vm.createContext(ctx); vm.runInContext(JEU, ctx);
  return { ctx, rangement, journal, remplir: b => { plein = b; } };
}
{
  const p = bac('patron', 'gestion');
  v('par défaut (patron, GESTION) : la barre d’avant, à l’identique', p.ctx.barreLire(), ['accueil', 'surveillance', 'entreprises', 'essais']);
  const c = bac('collaborateur', 'gestion');
  v('par défaut (collaborateur) : le Courrier à la place d’Accès', c.ctx.barreLire(), ['accueil', 'surveillance', 'entreprises', 'support']);
  const m = bac('patron', 'messages');
  v('par défaut (console MESSAGES) : Accès n’y existe pas, le Courrier prend sa place', m.ctx.barreLire(), ['accueil', 'surveillance', 'entreprises', 'support']);
  v('la liste des vues suit le menu visible (patron, GESTION : 11 vues)', p.ctx.barreDispo().length, 11);
  v('…(collaborateur : ni Accès ni Équipe)', c.ctx.barreDispo().map(o => o.t).filter(t => t === 'essais' || t === 'equipe'), []);
}
{
  const p = bac('patron', 'gestion');
  const lire = x => { p.rangement.set('tour_barre_gestion', x); return p.ctx.barreLire(); };
  v('un choix de deux vues se complète par la barre d’origine', lire('journal,equipe'), ['journal', 'equipe', 'accueil', 'surveillance']);
  v('l’ordre choisi est respecté', lire('entreprises,accueil,journal,donnees'), ['entreprises', 'accueil', 'journal', 'donnees']);
  v('un doublon ne prend pas deux places', lire('journal,journal,equipe'), ['journal', 'equipe', 'accueil', 'surveillance']);
  v('une vue inconnue ou des blancs sont ignorés', lire(' , journal , inconnue ,'), ['journal', 'accueil', 'surveillance', 'entreprises']);
  v('au-delà de quatre, les quatre premières valides', lire('journal,equipe,donnees,devisia,abonnements'), ['journal', 'equipe', 'donnees', 'devisia']);
  const m = bac('patron', 'messages'); m.rangement.set('tour_barre_gestion', 'journal,equipe');
  v('une console, une barre : le choix de GESTION ne touche pas MESSAGES', m.ctx.barreLire(), ['accueil', 'surveillance', 'entreprises', 'support']);
  const c = bac('collaborateur', 'gestion'); c.rangement.set('tour_barre_gestion', 'essais,equipe,journal');
  v('⛔ une vue que le compte ne voit pas n’entre jamais dans sa barre, même « choisie »', c.ctx.barreLire(), ['journal', 'accueil', 'surveillance', 'entreprises']);
  const mv = bac('patron', 'messages'); mv.rangement.set('tour_barre_messages', 'devisia,abonnements,journal');
  v('…ni une vue d’une AUTRE console (Devis IA n’existe pas dans MESSAGES)', mv.ctx.barreLire(), ['journal', 'accueil', 'surveillance', 'entreprises']);
}
{
  const p = bac('patron', 'gestion');
  p.ctx._barreBrouillon = p.ctx.barreLire();
  p.ctx.barreBascule('essais');
  v('toucher une vue choisie la retire', p.ctx._barreBrouillon, ['accueil', 'surveillance', 'entreprises']);
  p.ctx.barreBascule('journal');
  v('toucher une autre la prend à la suite', p.ctx._barreBrouillon, ['accueil', 'surveillance', 'entreprises', 'journal']);
  p.ctx.barreBascule('equipe');
  v('une cinquième est refusée…', p.ctx._barreBrouillon, ['accueil', 'surveillance', 'entreprises', 'journal']);
  v('…et on le dit', /Quatre vues au maximum/.test(p.journal.toasts.pop() || ''), true);
  p.ctx.barreBascule('surveillance');
  v('retirer la deuxième fait remonter les suivantes', p.ctx._barreBrouillon, ['accueil', 'entreprises', 'journal']);
  v('le compte le dit', p.ctx.barreCompteTxt(3), '3 / 4 choisies — les places libres reprennent la barre d’origine');
  p.ctx.barreValider();
  v('Enregistrer range le choix pour CETTE console', p.rangement.get('tour_barre_gestion'), 'accueil,entreprises,journal');
  v('…redessine la barre et ferme la feuille', [p.journal.rendus, p.journal.fermee], [1, 1]);
  v('…et le dit', p.journal.toasts.pop(), 'Barre enregistrée');
  v('relu, le choix se complète', p.ctx.barreLire(), ['accueil', 'entreprises', 'journal', 'surveillance']);
  p.ctx.barreDefaut();
  v('« Réinitialiser » remet la barre d’origine dans le choix', p.ctx._barreBrouillon, ['accueil', 'surveillance', 'entreprises', 'essais']);
  p.ctx.barreValider();
  v('…et la barre d’origine ne s’écrit pas : la clé disparaît', p.rangement.has('tour_barre_gestion'), false);
  p.ctx._barreBrouillon = [];
  p.ctx.barreValider();
  v('un choix vide non plus', p.rangement.has('tour_barre_gestion'), false);
}
{
  /* ⛔ le rangement est PARTAGÉ par toute l'origine teamop.fr, et Safari le borne à 5 Mo */
  const p = bac('patron', 'gestion');
  p.remplir(true);
  p.ctx._barreBrouillon = ['journal', 'equipe', 'accueil', 'donnees'];
  let jete = null; try { p.ctx.barreValider(); } catch (e) { jete = e.message; }
  v('rangement plein : Enregistrer ne jette pas', jete, null);
  v('…la barre change quand même, pour cette visite', p.ctx.barreLire(), ['journal', 'equipe', 'accueil', 'donnees']);
  v('…et on dit qu’elle ne sera pas gardée', /appareil est plein/.test(p.journal.toasts.pop() || ''), true);
  p.remplir(false);
  p.ctx._barreBrouillon = ['journal', 'accueil', 'surveillance', 'entreprises'];
  p.ctx.barreValider();
  v('rangement libéré : le choix suivant est rangé, et la mémoire de repli oubliée', [p.rangement.get('tour_barre_gestion'), Object.keys(p.ctx._barreRepli)], ['journal,accueil,surveillance,entreprises', []]);
}

console.log('\n3. La barre et la bulle, relues dans le code (le geste se mesure au doigt : sonde-tour-barre.js)');
{
  const r = fonction('renderBarreBas');
  vrai('la barre porte sa bulle, un seul élément', /class="bb-cur" id="bb-cur" aria-hidden="true"/.test(r));
  vrai('elle arme l’appui long et la bulle', /barrePresse\(el\);\s*barreBulle\(el\);/.test(r));
  vrai('⛔ elle ne se réécrit pas quand rien n’a changé (la bulle SAUTERAIT)', /data-sig'\)===sig&&el\.querySelector\('\.bb'\)\)\{ majBarreBas\(\); return; \}/.test(r));
  vrai('le compteur d’une vue la suit dans la barre (id + "-bas")', /o\.bdg\?'<span class="bdg-r" id="'\+o\.bdg\+'-bas">0<\/span>'/.test(r));
  vrai('« Plus » porte son compteur', /id="bdg-plus-bas"/.test(r));
  const m = fonction('majBarreBas');
  vrai('les compteurs des vues rangées derrière « Plus » s’additionnent sur « Plus »', /if\(BAS\.indexOf\(o\.t\)<0\)\{ derriere\+=n; return; \}/.test(m) && /\$\('bdg-plus-bas'\)/.test(m));
  const p = fonction('bbCurPlacer');
  vrai('⛔ pendant qu’un doigt tient la bulle, personne ne la replace', /if\(bar\.classList\.contains\('tire'\)\) return;/.test(p));
  vrai('elle ne pose qu’un NUMÉRO de colonne (aucune géométrie recopiée)', /setProperty\('--bb-i',i\)/.test(p) && !/offsetLeft|getBoundingClientRect/.test(p));
  const pr = fonction('barrePresse');
  vrai('l’appui long : 550 ms', /\},550\);/.test(pr));
  vrai('⛔ un appui tenu SUR la bulle est une prise, pas un menu', /if\(bar\.classList\.contains\('tire'\)\|\|feuilleVisible\(\)\) return;\s*long=true;/.test(pr));
  vrai('on désarme au MOUVEMENT (8 px), pas au premier pointermove', /Math\.hypot\(e\.clientX-px,e\.clientY-py\)>8\) desarmer\(\)/.test(pr));
  vrai('⛔ le clic qui suit le relâcher est avalé OÙ QU’IL TOMBE (la feuille monte sous le doigt)', /document\.addEventListener\('click',function\(e\)\{\s*if\(!long\) return;\s*long=false;\s*if\(!leveA\|\|Date\.now\(\)-leveA>500\) return;\s*e\.preventDefault\(\); e\.stopPropagation\(\); \},true\);/.test(pr));
  vrai('⛔ …et un NOUVEL appui ferme la fenêtre (sans clic au relâcher, le tap suivant n’est pas avalé)', /var nouvelAppui=function\(\)\{ if\(long&&leveA\)\{ long=false; leveA=0; \} \};/.test(pr) && /document\.addEventListener\('pointerdown',nouvelAppui,true\);/.test(pr));
  vrai('…et seulement celui-là : le relâcher est daté, à la souris comme au doigt', /document\.addEventListener\('pointerup',lever,true\);/.test(pr) && /document\.addEventListener\('touchend',lever,true\);/.test(pr));
  const b = fonction('barreBulle');
  vrai('le DOIGT par les événements tactiles (le navigateur annule le flux de pointeur au premier mouvement horizontal)', /addEventListener\('touchstart'/.test(b) && /addEventListener\('touchmove',[\s\S]*?\},\{passive:false\}\);/.test(b) && /addEventListener\('touchend'/.test(b) && /addEventListener\('touchcancel'/.test(b));
  vrai('la SOURIS par les événements de pointeur, et seulement elle', (b.match(/if\(e\.pointerType!=='mouse'/g) || []).length === 4);
  vrai('⛔ la capture du pointeur n’est posée qu’une fois le geste ENGAGÉ (sinon un clic de souris n’ouvrirait plus rien)', /s\.engage=true;[\s\S]{0,200}bar\.setPointerCapture\(s\.pid\)/.test(b) && (b.match(/setPointerCapture/g) || []).length === 1);
  vrai('le seuil : six pixels, en deçà c’est un tap', /var SEUIL=6/.test(b));
  vrai('« sur la bulle » se lit sous son rectangle VISUEL (elle peut être encore en route)', /var surBulle=iOn>=0&&visible&&x>=r\.left-4&&x<=r\.right\+4;/.test(b) && /if\(surBulle\) soulever\(\);/.test(b));
  vrai('« Plus » n’est pas une place pour la bulle (les colonnes l’écartent)', /if\(b\.classList\.contains\('plus'\)\) return;/.test(b));
  vrai('le ressort au bord', /var elastique=function\(d,dim\)\{ return \(d\*dim\*0\.55\)\/\(dim\+0\.55\*d\); \};/.test(b));
  /* la définition ne suffit pas : une mutation qui retire l'EMPLOI laissait ce banc vert (M12) */
  vrai('…et il s’applique aux deux bords, là où la bulle se pose', /if\(t<a\) t=a-elastique\(a-t,dim\); else if\(t>z\) t=z\+elastique\(t-z,dim\);/.test(b));
  vrai('parti d’un autre onglet : rattrapée en 170 ms', /\(now-s\.tEng\)\/170/.test(b));
  vrai('⛔ UN GESTE, UNE NAVIGATION : le clic d’après est avalé, en capture, 350 ms', /bar\.addEventListener\('click',function\(e\)\{ if\(Date\.now\(\)-finBulle>350\) return; e\.preventDefault\(\); e\.stopPropagation\(\); \},true\);/.test(b));
  vrai('reposée sur la vue ouverte, elle ne navigue pas', /if\(!dest\|\|dest===TAB\)\{ bbCurPlacer\(true\); return; \}/.test(b));
  vrai('une feuille ouverte (le réglage, par un appui long) : la bulle n’emmène plus nulle part', /var bouger=function\(x,y\)\{\s*if\(!s\) return false;\s*if\(feuilleVisible\(\)\)\{ abandon\(\); return false; \}/.test(b) && /var lacher=function\(\)\{\s*if\(!s\) return;\s*if\(feuilleVisible\(\)\)\{ abandon\(\); return; \}/.test(b));
}

console.log('\n4. La feuille « Ma barre » et sa porte dans « Plus »');
{
  const f = fonction('ouvrirFeuille');
  vrai('ouvrirFeuille sait ouvrir « barre »', /\} else if\(quoi==='barre'\)\{/.test(f));
  vrai('le brouillon part de la barre actuelle', /_barreBrouillon=barreLire\(\);/.test(f));
  vrai('une ligne par vue du menu visible, un rang à droite', /menuVisible\(\)\.forEach[\s\S]*?data-barre="'\+x\[0\]\+'"[\s\S]*?<span class="rang" aria-hidden="true"><\/span>/.test(f));
  vrai('« Plus » porte « Personnaliser la barre »', /onclick="ouvrirFeuille\(\\'barre\\'\)"><span class="ic">'\+svg\('crayon',16\)\+'<\/span>Personnaliser la barre/.test(f));
  vrai('la feuille se peint dès son ouverture (numéros, compte)', /if\(quoi==='barre'\) barreRepeindre\(\);/.test(f));
  const r = fonction('barreRepeindre');
  vrai('⛔ on REPEINT les lignes, on ne réécrit pas la feuille (elle remonterait en haut sous le doigt)', /querySelectorAll\('#feuille \[data-barre\]'\)/.test(r) && !/innerHTML/.test(r));
  vrai('le rang se dit aussi à l’oreille', /setAttribute\('aria-label',[\s\S]*?', place '\+\(i\+1\)/.test(r));
}

console.log('\n5. La feuille de style');
{
  /* toutes les feuilles de la page : la couche du thème vit dans un second bloc <style> */
  const css = [...SRC.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  vrai('la feuille de style est lue (population)', css.length > 50000, css.length);
  const regle = (sel) => { const i = css.indexOf(sel + '{'); if (i < 0) return ''; return css.slice(i, css.indexOf('}', i) + 1); };
  const cur = regle('  .bb-cur');
  vrai('la bulle est trouvée dans la feuille (population)', cur.length > 100, cur.length);
  vrai('⛔ sa place vit dans `translate`, jamais dans `transform` (`scale` multiplierait le déplacement)', /translate:calc\(var\(--bb-i\) \* \(100% \+ var\(--bb-gout\)\) \+ var\(--bb-dx\)\) 0;/.test(cur) && !/transform:/.test(cur));
  vrai('sa largeur se DÉDUIT du nombre de colonnes', /width:calc\(\(100% - 2\*var\(--bb-pad\) - \(var\(--bb-n\) - 1\)\*var\(--bb-gout\)\) \/ var\(--bb-n\)\)/.test(cur));
  vrai('une seule marque : posée, la bulle remplace le fond de l’onglet ouvert (et seulement posée)', /\.barre-bas\.cur-on \.bb\.on\{background:transparent;box-shadow:none\}/.test(css));
  vrai('⛔ la barre garde le doigt : touch-action:none, ni sélection ni loupe', /\.barre-bas\{--bb-n:5;[^}]*touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none\}/.test(css));
  vrai('soulevée, elle grandit plus en hauteur qu’en largeur', /\.barre-bas\.tire \.bb-cur\{scale:1\.06 1\.16;/.test(css));
  vrai('mouvement réduit : elle ne glisse plus, et ne se soulève pas', /\.bb-cur\{transition:opacity \.15s ease!important\} \.barre-bas\.tire \.bb-cur\{scale:1\}/.test(css));
  vrai('la barre a sa propre transition de vue', /\.barre-bas\{view-transition-name:barre\}/.test(css));
  vrai('⛔ …et une seule de ses deux captures est montrée (deux copies d’un verre doublent sa teinte)', /::view-transition-old\(barre\)\{animation:none;mix-blend-mode:normal;opacity:0\}/.test(css) && /::view-transition-new\(barre\)\{animation:none;mix-blend-mode:normal;opacity:1\}/.test(css));
  vrai('⛔ un toast ne mange jamais un tap', /#toast\{pointer-events:none\}/.test(css));
  vrai('« Enregistrer » et « Réinitialiser » : 48 px au doigt', /\.barre-pied button\{flex:1;justify-content:center;min-height:48px;/.test(css));
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
