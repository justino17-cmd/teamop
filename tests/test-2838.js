/* ══ test-2838 · CE QUI FLOTTE NAÎT DE CE QUI L'APPELLE, ET Y RETOURNE ══════════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, points 12 à 16 (§ 7 : origine ancrée, chemins symétriques ; § 12 : rien ne surgit
   ni ne disparaît d'un coup). La fenêtre secondaire, les roues d'heure, la lecture d'un courriel, le catalogue des bons, le
   panneau des notifications, le menu contextuel du planning, la carte de survol et le menu du compte apparaissaient ou
   disparaissaient en une image ; les roues avaient leur propre voile, flouté à 2 px.
   Ce banc EXÉCUTE la mécanique commune (animSobre, flottantEntre, flottantSort, feuilleSortir, et l'écouteur qui avale un
   geste pendant une sortie) extraite d'app.html, relit le branchement de chaque surface sur le code (commentaires ôtés) et
   la feuille (animations, « réduire les animations »). La preuve dans la page : scratchpad/sonde-sorties.js (origine
   15 ✓ 13 ✗, corrigée 28 ✓), images figées à mi-entrée, jour et nuit.                                                        */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function fonction(nom) {
  const m = new RegExp('\\nfunction ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(m.index + 1, k + 1);
}
const i0 = CODE.indexOf("document.addEventListener('click',function(e){ const t=e.target; const x=t&&t.closest&&t.closest('.flot-sort");
const AVALE = i0 > 0 ? CODE.slice(i0, CODE.indexOf('},true);', i0) + 8) : '';

console.log('\n── 2838 · 0. la population ──');
const MECA = ['animSobre', 'flottantEntre', 'flottantSort', 'feuilleSortir'].map(fonction);
vrai('la mécanique commune est trouvée (animSobre, flottantEntre, flottantSort, feuilleSortir)', MECA.every(x => x.length > 40), MECA.map(x => x.length));
vrai('l’écouteur qui avale un geste pendant une sortie est trouvé', AVALE.length > 80, AVALE.length);

function monde(sobre) {
  const J = { minut: [], ecoute: {} };
  const el = (rect) => { const cl = new Set(); const e = { isConnected: true, style: {}, retire: 0, offsetWidth: 10,
    classList: { add: (...c) => c.forEach(x => cl.add(x)), remove: (...c) => c.forEach(x => cl.delete(x)), contains: (c) => cl.has(c) },
    getBoundingClientRect: () => rect || { left: 100, top: 200, width: 220, height: 160 }, remove() { e.retire++; e.isConnected = false; } }; return e; };
  const ctx = { console, Math, window: {}, document: { addEventListener: (t, f, cap) => { (J.ecoute[t] = J.ecoute[t] || []).push(f); } },
    matchMedia: () => ({ matches: !!sobre }), setTimeout: (f, ms) => { J.minut.push({ f, ms }); return J.minut.length; }, clearTimeout: (id) => { if (J.minut[id - 1]) J.minut[id - 1].annule = true; } };
  ctx.window.matchMedia = ctx.matchMedia;
  vm.createContext(ctx);
  try { vm.runInContext(MECA.join('\n') + '\n' + AVALE, ctx); } catch (e) { J.err = e.message; }
  for (const f of ['flottantEntre', 'flottantSort', 'feuilleSortir']) if (typeof ctx[f] !== 'function') ctx[f] = () => {};
  const tourner = () => { const m = J.minut.splice(0); m.filter(x => !x.annule).forEach(x => x.f()); return m; };
  return { ctx, J, el, tourner };
}

console.log('\n── 2838 · 1. entrer depuis son ancre ──');
{ const M = monde(false); const e = M.el();
  vrai('le code s’exécute', !M.J.err, M.J.err);
  M.ctx.flottantEntre(e, 130, 230);
  vrai('l’élément grandit depuis le point donné, relatif à lui (130,230 → 30 px 30 px)', e.style.transformOrigin === '30px 30px', e.style.transformOrigin);
  vrai('… et porte la classe d’entrée', e.classList.contains('flot')); }

console.log('\n── 2838 · 2. sortir par le même chemin, puis partir ──');
{ const M = monde(false); const e = M.el(); M.ctx.flottantEntre(e, 0, 0); M.ctx.flottantSort(e);
  vrai('à la fermeture, l’élément est encore là et SORT (.flot-sort)', e.classList.contains('flot-sort') && e.retire === 0);
  M.ctx.flottantSort(e);
  vrai('une seconde fermeture pendant la sortie ne relance rien (une seule minuterie)', M.J.minut.length === 1, M.J.minut.length);
  const m = M.tourner();
  vrai('… et la sortie finie (160 ms au plus), il est retiré', e.retire === 1 && m[0].ms <= 200, { retire: e.retire, ms: m[0] && m[0].ms }); }
{ const M = monde(false); const e = M.el(); let fini = 0; M.ctx.flottantSort(e, () => { fini++; }); M.ctx.flottantEntre(e, 0, 0); M.tourner();
  vrai('une entrée pendant la sortie l’ANNULE (la carte de survol réutilise le même élément)', fini === 0 && !e.classList.contains('flot-sort') && e.classList.contains('flot'), { fini }); }
{ const M = monde(true); const e = M.el(); M.ctx.flottantSort(e);
  vrai('« réduire les animations » : il part tout de suite, sans minuterie', e.retire === 1 && M.J.minut.length === 0, { retire: e.retire, minut: M.J.minut.length }); }

console.log('\n── 2838 · 3. les feuilles plein écran ──');
{ const M = monde(false); const e = M.el(); M.ctx.feuilleSortir(e);
  vrai('une feuille qui part porte .feuille-sort, encore là', e.classList.contains('feuille-sort') && e.retire === 0);
  M.ctx.feuilleSortir(e); M.tourner();
  vrai('… retirée une seule fois à la fin de sa sortie', e.retire === 1, e.retire); }
{ const M = monde(true); const e = M.el(); M.ctx.feuilleSortir(e);
  vrai('« réduire les animations » : retirée tout de suite', e.retire === 1 && !M.J.minut.length); }

console.log('\n── 2838 · 4. pendant une sortie, un geste est avalé ──');
{ const M = monde(false); const f = (M.J.ecoute.click || [])[0];
  vrai('un écouteur de clic est posé (en capture)', typeof f === 'function');
  const clic = (cl) => { const ev = { prevenu: 0, arrete: 0, target: { closest: (s) => s.split(',').some(x => cl.includes(x.trim())) ? {} : null }, preventDefault() { ev.prevenu++; }, stopImmediatePropagation() { ev.arrete++; } }; if (f) f(ev); return ev; };
  vrai('un clic dans un menu qui SORT est avalé', clic(['.flot-sort']).arrete === 1);
  vrai('… dans une feuille qui sort aussi', clic(['.feuille-sort']).arrete === 1);
  vrai('… et dans la fenêtre secondaire qui sort (#overlay2.ferme)', clic(['#overlay2.ferme']).arrete === 1);
  vrai('contre-épreuve : un clic ailleurs passe', clic([]).arrete === 0); }

console.log('\n── 2838 · 5. chaque surface est branchée ──');
const F = (n) => fonction(n);
const branche = [
  ['le panneau des notifications ENTRE depuis la cloche', /flottantEntre\(/.test(F('openNotif'))],
  ['… et SORT (closeNotif ne vide plus le panneau d’un coup)', /flottantSort\(/.test(F('closeNotif')) && !/\$\('notif-panel'\)\.innerHTML=''\s*;\s*\}$/.test(F('closeNotif'))],
  ['le menu contextuel du planning naît sous le doigt (x, y)', /flottantEntre\(el,x,y\)/.test(F('planCtxOpen'))],
  ['… et sort (plus de remove() direct)', /flottantSort\(_ctxEl\)/.test(F('planCtxClose')) && !/_ctxEl\.remove\(\)/.test(F('planCtxClose'))],
  ['la carte de survol naît du bord de la carte survolée', /flottantEntre\(h,/.test(F('plHovShow'))],
  ['… et sort, puis se cache', /flottantSort\(h,/.test(F('plHovHide'))],
  ['le menu du compte naît du pointeur, et sort au toucher à côté comme par ses articles', /flottantEntre\(m,e\.clientX,e\.clientY\)/.test(F('userFootMenu')) && !/m\.remove\(\)/.test(F('userFootMenu')) && !/getElementById\('foot-menu'\)\.remove\(\)/.test(F('userFootMenu'))],
  ['la fenêtre secondaire sort par .ferme (minuterie), et une ouverture l’annule', /classList\.add\('ferme'\)/.test(F('closeSub')) && /setTimeout/.test(F('closeSub')) && /classList\.remove\('ferme'\)/.test(F('openSub'))],
  ['… et un retour pendant sa sortie passe à ce qu’elle recouvrait', /ov2\.classList\.contains\('open'\)&&!ov2\.classList\.contains\('ferme'\)/.test(F('retourFerme'))],
  ['les roues d’heure sortent par feuilleSortir, et une ouverture retire la précédente', /feuilleSortir\(/.test(F('fermeRoues')) && /getElementById\('roues-ov'\);\s*if\(ancien\)\s*ancien\.remove\(\)/.test(F('ouvreRoues'))],
  ['… « OK » pendant leur sortie ne rappelle rien', /feuille-sort'\)\)\s*return/.test(F('validRoues'))],
  ['… et leur voile est celui des fenêtres (--scrim, flou de 20 px), et non plus 2 px', /background:var\(--scrim\)[^']*backdrop-filter:blur\(20px\)/.test(F('ouvreRoues')) && !/blur\(2px\)/.test(F('ouvreRoues'))],
  ['la lecture d’un courriel repart par son « Retour » (feuilleSortir)', /onclick="feuilleSortir\(document\.getElementById\('mail-read'\)\)/.test(F('mailOpen'))],
  ['… et un changement de mode pendant sa sortie ne la rouvre pas', /!ov\.classList\.contains\('feuille-sort'\)/.test(F('mailBasculerMode'))],
  ['le catalogue des bons repart par feuilleSortir', /feuilleSortir\(/.test(F('bonCatClose'))],
];
for (const [t, v] of branche) vrai(t, v);

console.log('\n── 2838 · 6. la feuille : chaque mouvement, et rien sous « réduire les animations » ──');
const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
const anim = (sel) => { const re = new RegExp('(^|[},\\s])' + sel.replace(/[.#()]/g, '\\$&') + '\\s*\\{[^}]*animation:\\s*([\\w-]+)'); const m = re.exec(CSS); return m ? m[2] : null; };
const kf = (n) => n && new RegExp('@keyframes\\s+' + n + '\\s*\\{').test(CSS);
for (const [sel, nom] of [['.flot', 'entrée des menus'], ['.flot-sort', 'sortie des menus'], ['#mail-read', 'entrée de la lecture (par la droite)'], ['#mail-read.feuille-sort', 'sortie de la lecture'],
  ['#bon-cat', 'entrée du catalogue (par le bas)'], ['#bon-cat.feuille-sort', 'sortie du catalogue'], ['#roues-ov', 'entrée du voile des roues'], ['#roues-ov.feuille-sort', 'sortie du voile des roues']]) {
  const a = anim(sel); vrai(sel + ' : ' + nom + ' — une animation dont les images clés existent', !!a && kf(a), a);
}
vrai('la lecture d’un courriel entre et sort PAR LA DROITE (translateX(100%))', /@keyframes feuillePousse\{from\{transform:translateX\(100%\)\}/.test(CSS) && /@keyframes feuillePousseSort\{[^}]*\}?[^@]*translateX\(100%\)/.test(CSS));
vrai('le catalogue des bons monte et redescend (translateY(100%))', /@keyframes feuilleMonte\{from\{transform:translateY\(100%\)\}/.test(CSS) && /@keyframes feuilleDescend\{[^@]*translateY\(100%\)/.test(CSS));
vrai('le panneau des notifications a son origine du côté de la cloche (haut, à droite)', /\.notif-panel\{transform-origin:calc\(100% - \d+px\)/.test(CSS));
const SOBRE = (/@media \(prefers-reduced-motion: reduce\)\{\s*\.flot,\.flot-sort,[^{]*\{animation:none!important\}/.exec(CSS) || [''])[0];
vrai('« réduire les animations » éteint toutes ces animations', ['.flot', '.flot-sort', '#mail-read', '#bon-cat', '#roues-ov', '#roues-ov .roues-feuille'].every(x => SOBRE.includes(x)), SOBRE.slice(0, 120));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
