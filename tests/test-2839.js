/* ══ test-2839 · LA FEUILLE « CRÉER » SE TIRE, UN DOIGT ARRÊTÉ NE RELANCE RIEN, LE BORD RÉSISTE ═══════════════════════════════
   Audit apple-design du 21 octobre 2026, points 17, 26 et 27.
   · 17 — la feuille « Créer » du téléphone porte une poignée iOS qui ne glissait pas : le doigt la saisissait, rien ne bougeait.
   · 26 — la vitesse au relâcher du balayage entre rubriques était celle du DERNIER mouvement : un doigt arrêté avant de lâcher
     relançait quand même l'écran suivant. vitesseRelache mesure sur les 100 dernières ms, et rend 0 après 80 ms d'arrêt.
   · 27 — au bord (pas de rubrique de ce côté) la pastille avançait d'un cran sous le doigt puis revenait : une butée. Elle
     RÉSISTE désormais (elastique, la constante 0,55 d'UIScrollView), comme au-delà d'un onglet.
   Ce banc EXÉCUTE vitesseRelache, elastique et le geste de la feuille (creerGeste) extraits d'app.html, au doigt et à
   l'horloge simulés, et relit le branchement du balayage. La preuve au vrai doigt : scratchpad/sonde-gestes-bord.js
   (origine 4 ✓ 8 ✗, corrigée 12 ✓).                                                                                   */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = CODE.indexOf(debut); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }   // un commentaire de fin de ligne (« n'est » n'ouvre pas une chaîne)
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(i, k + 1);
}
console.log('\n── 2839 · 0. la population ──');
const VIT = bloc('function vitesseRelache('), ELA = bloc('function elastique('), PROJ = bloc('function swipeProjeter(');
const CONST = (/const SWIPE_ENGAGE=[^;]*;/.exec(CODE) || [''])[0];
const GESTE = bloc('(function creerGeste(){'), ONG = bloc('function ongletsGeste(');
vrai('vitesseRelache, elastique et swipeProjeter sont trouvées', VIT.length > 100 && ELA.length > 40 && PROJ.length > 30, [VIT.length, ELA.length, PROJ.length]);
vrai('le geste de la feuille « Créer » est trouvé', GESTE.length > 600, GESTE.length);
vrai('le balayage entre rubriques est trouvé', ONG.length > 2000, ONG.length);
const H = {}; vm.createContext(H);
try { vm.runInContext(CONST + '\n' + PROJ + '\n' + VIT + '\n' + ELA, H); } catch (e) { H.err = e.message; }
const fn = (n) => typeof H[n] === 'function' ? H[n] : () => NaN;

console.log('\n── 2839 · 1. la vitesse au relâcher (point 26) ──');
{ const v = fn('vitesseRelache');
  const vite = [[0, 1000], [20, 1016], [40, 1032], [60, 1048]];
  vrai('un doigt qui file (20 px toutes les 16 ms) : ~1 250 px/s', Math.abs(v(vite, 1050) - 1250) < 30, v(vite, 1050));
  vrai('⛔ le même doigt ARRÊTÉ depuis 300 ms : vitesse nulle (rien ne relance)', v(vite, 1348) === 0, v(vite, 1348));
  vrai('… à 80 ms tout juste, il compte encore ; au-delà, plus', v(vite, 1128) !== 0 && v(vite, 1129) === 0, [v(vite, 1128), v(vite, 1129)]);
  const ralenti = [[0, 1000], [100, 1010], [110, 1150], [115, 1200]];
  vrai('seuls les 100 derniers ms comptent : un élan ancien ne gonfle pas la vitesse finale', v(ralenti, 1205) < 200, v(ralenti, 1205));
  vrai('un seul échantillon : vitesse nulle', v([[0, 1000]], 1001) === 0); }

console.log('\n── 2839 · 2. la résistance au bord (point 27) ──');
{ const e = fn('elastique');
  vrai('elle avance moins que le doigt, de moins en moins', e(10, 30) < 10 && e(100, 30) - e(90, 30) < e(20, 30) - e(10, 30), [e(10, 30), e(100, 30)]);
  vrai('elle ne dépasse jamais sa borne, même tirée de 10 000 px', e(10000, 30) < 30 && e(10000, 30) > 29, e(10000, 30));
  vrai('elle garde le sens du doigt', e(-50, 30) === -e(50, 30) && e(-50, 30) < 0);
  vrai('la constante d’UIScrollView (0,55) : 55 px tirés sur une borne de 26,6 rendent ~14 px', Math.abs(e(55, 26.6) - 14.15) < 0.2, e(55, 26.6)); }

console.log('\n── 2839 · 3. le balayage entre rubriques est branché ──');
vrai('chaque mouvement est gardé (échantillons [x, t])', /hist\.push\(\[cx,performance\.now\(\)\]\)/.test(ONG));
vrai('au relâcher, la vitesse est celle des derniers instants (vitesseRelache), pas celle du dernier mouvement', /vitesse=vitesseRelache\(hist,performance\.now\(\)\);\s*const arrivee=dx\+swipeProjeter\(vitesse\)/.test(ONG));
vrai('on sait au départ s’il existe une rubrique de chaque côté', /voisins=\[j>0, j>=0&&j<vues\.length-1\]/.test(ONG));
vrai('sans rubrique de ce côté, la pastille résiste dès le départ ; au-delà d’un onglet, aussi (plus de butée Math.min/Math.max)', /!existe \? elastique\(brut,/.test(ONG) && /largeur\+elastique\(/.test(ONG) && !/Math\.max\(-largeur,Math\.min\(largeur/.test(ONG));
vrai('le tiroir du menu mesure sa vitesse de la même façon', /vitesseRelache\(r\.hist,performance\.now\(\)\)/.test(bloc('(function tiroirGeste(){')));

console.log('\n── 2839 · 4. la feuille « Créer » se tire (point 17) ──');
function monde(o) {
  o = o || {};
  const J = { ecoute: {}, horloge: 1000, fermee: 0 };
  const cl = (init) => { const s = new Set(init); return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c) }; };
  const f = { style: {}, getBoundingClientRect: () => ({ height: 450 }) };
  const ov = { style: {}, classList: cl(o.fermee ? ['creer-ov'] : ['creer-ov', 'on', 'vu']), querySelector: (s) => s === '.creer-sheet' ? f : null };
  const doc = { addEventListener: (t, fn) => { (J.ecoute[t] = J.ecoute[t] || []).push(fn); }, getElementById: (id) => id === 'creer' ? ov : null,
    documentElement: { dataset: { kind: o.bureau ? 'desktop' : 'mobile' } } };
  const ctx = { document: doc, console, Math, String, parseFloat, performance: { now: () => J.horloge }, matchMedia: () => ({ matches: !o.large }),
    getComputedStyle: (x) => ({ backgroundColor: x === ov ? 'rgba(0, 0, 0, 0.35)' : '' }),
    creerFermer: () => { J.fermee++; ov.classList.remove('vu'); } };
  vm.createContext(ctx);
  try { vm.runInContext(CONST + '\n' + PROJ + '\n' + VIT + '\n' + ELA + '\n' + GESTE + ')();', ctx); } catch (e) { J.err = e.message; }
  const cible = { closest: (s) => s === '.creer-sheet' ? f : null };
  const tire = (type, e) => (J.ecoute[type] || []).forEach(fn => fn(e));
  const doigt = {
    pose(x, y) { tire('touchstart', { touches: [{ clientX: x, clientY: y }], target: cible }); },
    bouge(x, y, ms) { J.horloge += (ms === undefined ? 16 : ms); const e = { touches: [{ clientX: x, clientY: y }], cancelable: true, empeche: false, preventDefault() { e.empeche = true; } }; tire('touchmove', e); return e; },
    attend(ms) { J.horloge += ms; }, leve() { tire('touchend', { touches: [] }); },
  };
  return { J, f, ov, doigt };
}
{ const M = monde();
  vrai('le code s’exécute', !M.J.err, M.J.err);
  M.doigt.pose(200, 500); M.doigt.bouge(200, 520); M.doigt.bouge(200, 540); const e = M.doigt.bouge(200, 560);
  vrai('tirée de 60 px vers le bas : la feuille suit, 1:1', M.f.style.transform === 'translateY(60.0px)', M.f.style.transform);
  const alpha = parseFloat((/rgba\([^,]*,[^,]*,[^,]*,\s*([\d.]+)\)/.exec(M.ov.style.backgroundColor || '') || [])[1]);
  vrai('… le voile s’éclaircit PAR SA COULEUR (0,35 × (1 − 60/450))', Math.abs(alpha - 0.35 * (1 - 60 / 450)) < 0.01, M.ov.style.backgroundColor);
  vrai('… jamais par l’opacité du conteneur (elle couperait le flou de la vitre qu’il contient)', !M.ov.style.opacity, M.ov.style.opacity);
  vrai('… et la page ne défile pas en même temps (touchmove annulé)', e.empeche === true);
  M.doigt.attend(300); M.doigt.leve();
  vrai('lâchée lentement : elle remonte (pas fermée), depuis la position affichée (valeurs en ligne retirées)', M.J.fermee === 0 && M.f.style.transform === '' && M.f.style.transition === '' && M.ov.style.backgroundColor === '', [M.J.fermee, M.f.style.transform]); }
{ const M = monde(); M.doigt.pose(200, 500); for (let y = 520; y <= 700; y += 20) M.doigt.bouge(200, y); M.doigt.attend(300); M.doigt.leve();
  vrai('tirée de 200 px (plus d’un tiers de 450) : elle se ferme', M.J.fermee === 1); }
{ const M = monde(); M.doigt.pose(200, 500); M.doigt.bouge(200, 520, 10); M.doigt.bouge(200, 540, 10); M.doigt.bouge(200, 560, 10); M.doigt.leve();
  vrai('une chiquenaude de 60 px en 30 ms : la vitesse projetée la ferme', M.J.fermee === 1); }
{ const M = monde(); M.doigt.pose(200, 500); M.doigt.bouge(200, 480); M.doigt.bouge(200, 460); M.doigt.bouge(200, 440); M.doigt.bouge(200, 420);
  const ty = parseFloat((/translateY\((-?[\d.]+)px\)/.exec(M.f.style.transform) || [])[1]);
  vrai('tirée de 80 px vers le haut : elle résiste (elle monte de moins de 40 px)', ty < 0 && ty > -40, M.f.style.transform);
  M.doigt.leve(); vrai('… et revient, sans se fermer', M.J.fermee === 0 && M.f.style.transform === ''); }
{ const M = monde(); M.doigt.pose(200, 500); const e = M.doigt.bouge(240, 505); M.doigt.bouge(290, 508); M.doigt.leve();
  vrai('un geste horizontal n’est pas pour la feuille (rien ne bouge, rien d’annulé)', !M.f.style.transform && !e.empeche && M.J.fermee === 0); }
{ const M = monde({ large: true }); M.doigt.pose(200, 500); M.doigt.bouge(200, 560); M.doigt.bouge(200, 700); M.doigt.leve();
  vrai('au-delà de 780 px (fenêtre centrée, sans poignée) : aucun geste', !M.f.style.transform && M.J.fermee === 0); }
{ const M = monde({ fermee: true }); M.doigt.pose(200, 500); M.doigt.bouge(200, 560); M.doigt.leve();
  vrai('feuille fermée : aucun geste', !M.f.style.transform && M.J.fermee === 0); }

console.log('\n── 2839 · 5. le voile de « Créer » ne coupe pas le flou de la feuille ──');
{ const css = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const regle = (sel) => { const m = new RegExp('(^|[}\\s])' + sel.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}').exec(css); return m ? m[2] : ''; };
  const base = regle('.creer-ov'), vu = regle('.creer-ov.vu');
  vrai('.creer-ov se fond par la couleur de son fond (transition de background-color), pas par son opacité', /transition:\s*background-color/.test(base) && !/opacity/.test(base), base.replace(/\s+/g, ' ').slice(0, 160));
  vrai('.creer-ov.vu pose le voile en couleur, sans opacité', /background:\s*rgba\(0,0,0,\.35\)/.test(vu) && !/opacity/.test(vu), vu); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
