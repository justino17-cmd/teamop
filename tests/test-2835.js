/* ══ test-2835 · LE TIROIR DU MENU SE REPOUSSE AU DOIGT, ET SON VOILE SE FOND ═══════════════════════════════════════════
   Audit apple-design du 21 octobre 2026 (§ 2 « le contenu suit le doigt », § 5 « la vitesse projetée décide », § 6
   « rien ne surgit ni ne disparaît d'un coup »). Mesuré au vrai doigt sur l'original (scratchpad/sonde-tiroir.js,
   4 ✓ 5 ✗) : le menu du téléphone ne se fermait que par un toucher sur le voile ; un balayage SUR le voile changeait de
   rubrique (le glissement entre écrans le prenait) au lieu de fermer ; le menu ne suivait pas le doigt ; et le voile
   surgissait plein puis disparaissait d'un coup (display:none → block).
   Ce banc REJOUE LA CASCADE pour le voile (tests/outils-cascade-app.js), et EXÉCUTE le vrai geste (tiroirGeste,
   swipeProjeter) extrait d'app.html, dans un bac à sable au doigt et à l'horloge simulés.
   La preuve au vrai doigt : scratchpad/sonde-tiroir.js (corrigée 9 ✓, deux passes), scratchpad/capture-tiroir.js.   */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* un bloc jusqu'à SA fin : accolades comptées hors chaînes */
function bloc(debut) {
  const i = CODE.indexOf(debut); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(i, k + 1);
}

console.log('\n── 2835 · 0. la population ──');
const GESTE = bloc('(function tiroirGeste(){');
const PROJ = bloc('function swipeProjeter(');
const CONST = (/const SWIPE_ENGAGE=[^;]*;/.exec(CODE) || [''])[0];
const HORS = (/const SWIPE_HORS=\[([^\]]*)\]/.exec(CODE) || ['', ''])[1];
vrai('le geste du tiroir (tiroirGeste) est trouvé', GESTE.length > 600, GESTE.length);
vrai('swipeProjeter et ses constantes sont trouvées', PROJ.length > 30 && /SWIPE_DECEL/.test(CONST), [PROJ.length, CONST]);
vrai('la liste des zones écartées du glissement entre écrans est trouvée', HORS.length > 20, HORS);

console.log('\n── 2835 · 1. un balayage sur le voile ne change pas de rubrique ──');
vrai('le voile est écarté du glissement entre écrans (c’est le tiroir qui le prend)', /['"]\.sidebar-backdrop['"]/.test(HORS), HORS);

console.log('\n── 2835 · 2. le voile se fond (cascade rejouée, téléphone) ──');
const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const REGLES = C.regles(CSS);
const juge = (sobre) => (cond, w) => {
  const c = cond.toLowerCase();
  if (/\bprint\b/.test(c) || /hover:\s*none/.test(c)) return false;
  if (/prefers-reduced-motion:\s*reduce/.test(c) && !sobre) return false;
  if (/prefers-(contrast|reduced-transparency|color-scheme)/.test(c)) return false;
  const parts = c.match(/\((?:min|max)-width:\s*[\d.]+px\)/g) || [];
  return parts.every(p => { const m = /\((min|max)-width:\s*([\d.]+)px\)/.exec(p); return m[1] === 'min' ? w >= +m[2] : w <= +m[2]; });
};
/* le combinateur ~ est rejoué comme un descendant par l'outil : le menu se place donc en « ancêtre » du voile */
const html = { tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': 'light', 'data-marque': 'teamop', 'data-verre': '1', 'data-kind': 'mobile', lang: 'fr' } };
const body = { tag: 'body', classes: ['rf-onglets'], attrs: {} };
const voile = { tag: 'div', classes: ['sidebar-backdrop'], attrs: { id: 'sidebar-backdrop' } };
const chaine = (ouvert) => [html, body, { tag: 'aside', classes: ouvert ? ['sidebar', 'open'] : ['sidebar'], attrs: { id: 'sidebar' } }, voile];
const lit = (ouvert, prop, w, sobre) => { const g = C.gagnant(REGLES, chaine(ouvert), w || 390, prop, undefined, juge(!!sobre)); return g ? g.v : undefined; };
vrai('ouvert : le voile est plein, visible, et prend le toucher', lit(true, 'opacity') === '1' && lit(true, 'visibility') === 'visible' && lit(true, 'pointer-events') === 'auto',
  [lit(true, 'opacity'), lit(true, 'visibility'), lit(true, 'pointer-events')]);
vrai('fermé : le voile est transparent, caché, et laisse passer le toucher', lit(false, 'opacity') === '0' && lit(false, 'visibility') === 'hidden' && lit(false, 'pointer-events') === 'none',
  [lit(false, 'opacity'), lit(false, 'visibility'), lit(false, 'pointer-events')]);
/* display : seules les règles du voile (l'outil tient tout sélecteur d'attribut en ^= pour vrai, et une règle
   [onclick^=…] sans rapport gagnerait) */
const DU_VOILE = REGLES.filter(r => /sidebar-backdrop/.test(r.sel));
const disp = (ouvert) => { const g = C.gagnant(DU_VOILE, chaine(ouvert), 390, 'display', undefined, juge(false)); return g ? g.v : undefined; };
vrai('fermé, il reste dans la page (display:none couperait net : rien ne pourrait se fondre)', disp(false) === 'block' && disp(true) === 'block', [disp(false), disp(true)]);
const trO = lit(true, 'transition') || '', trF = lit(false, 'transition') || '';
vrai('à l’ouverture, l’opacité est animée (et la visibilité passe tout de suite)', /opacity\s+var\(--d-\d\)|opacity\s+[\d.]+m?s/.test(trO) && /visibility\s+0s\s*$/.test(trO.split(',').find(x => /visibility/.test(x)) || ''), trO);
vrai('à la fermeture, la visibilité attend la FIN du fondu (sinon il disparaît d’un coup)', /visibility\s+0s\s+linear\s+var\(--d-\d\)/.test(trF) && /opacity\s+var\(--d-\d\)/.test(trF), trF);
vrai('sous « réduire les animations », aucun fondu', /^none$/.test(lit(false, 'transition', 390, true) || '') && /^none$/.test(lit(true, 'transition', 390, true) || ''),
  [lit(false, 'transition', 390, true), lit(true, 'transition', 390, true)]);
vrai('contre-épreuve : au bureau (menu permanent), ces règles ne s’appliquent pas', lit(true, 'opacity', 1200) === undefined && lit(false, 'visibility', 1200) === undefined, [lit(true, 'opacity', 1200), lit(false, 'visibility', 1200)]);

console.log('\n── 2835 · 3. le menu suit le doigt, et la vitesse projetée décide ──');
function monde(o) {
  o = o || {};
  const J = { ecoute: {}, horloge: 1000 };
  const cl = (init) => { const s = new Set(init); return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c) }; };
  const sb = { id: 'sidebar', classList: cl(o.ferme ? ['sidebar'] : ['sidebar', 'open']), style: {}, getBoundingClientRect: () => ({ width: 280 }) };
  const bd = { id: 'sidebar-backdrop', style: {} };
  const ailleurs = { id: 'content' };
  const doc = { addEventListener: (t, f) => { (J.ecoute[t] = J.ecoute[t] || []).push(f); }, getElementById: (id) => id === 'sidebar' ? sb : id === 'sidebar-backdrop' ? bd : null };
  const ctx = { document: doc, console, Math, String, performance: { now: () => J.horloge }, matchMedia: () => ({ matches: !o.bureau }) };
  vm.createContext(ctx);
  try { vm.runInContext(CONST + '\n' + PROJ + '\n' + GESTE + ')();', ctx); } catch (e) { J.err = e.message; }
  const cible = (el) => ({ closest: (sel) => (sel === '#sidebar' && el === sb) || (sel === '#sidebar-backdrop' && el === bd) ? el : null });
  const tire = (type, e) => (J.ecoute[type] || []).forEach(f => f(e));
  const doigt = {
    pose(x, y, el) { tire('touchstart', { touches: [{ clientX: x, clientY: y }], target: cible(el || bd) }); },
    bouge(x, y, ms) { J.horloge += (ms === undefined ? 16 : ms); const e = { touches: [{ clientX: x, clientY: y }], cancelable: true, empeche: false, preventDefault() { e.empeche = true; } }; tire('touchmove', e); return e; },
    attend(ms) { J.horloge += ms; },
    leve() { tire('touchend', { touches: [] }); },
  };
  return { J, sb, bd, ailleurs, doigt };
}
{ const M = monde();
  vrai('le code s’exécute', !M.J.err, M.J.err);
  M.doigt.pose(370, 600); M.doigt.bouge(350, 602); const e = M.doigt.bouge(290, 604);
  vrai('tiré de 80 px vers la gauche : le menu est déplacé de −80 px (1:1)', M.sb.style.transform === 'translateX(-80px)', M.sb.style.transform);
  vrai('… le voile s’éclaircit à mesure (1 − 80/280)', Math.abs(+M.bd.style.opacity - (1 - 80 / 280)) < 0.01, M.bd.style.opacity);
  vrai('… le défilement de la page n’est pas pris en même temps (touchmove annulé)', e.empeche === true);
  vrai('… et la transition CSS est suspendue pendant que le doigt tient', M.sb.style.transition === 'none' && M.bd.style.transition === 'none', [M.sb.style.transition, M.bd.style.transition]);
  M.doigt.attend(200); M.doigt.leve();
  vrai('un petit tirage, doigt arrêté avant de lâcher : le menu REVIENT, ouvert', M.sb.classList.contains('open'));
  vrai('… et repart de la position affichée (la valeur en ligne est retirée, la transition CSS reprend)', M.sb.style.transform === '' && M.sb.style.transition === '' && M.bd.style.opacity === '', [M.sb.style.transform, M.sb.style.transition, M.bd.style.opacity]); }
{ const M = monde();
  M.doigt.pose(250, 500, M.sb); M.doigt.bouge(230, 500, 16); M.doigt.bouge(170, 500, 16); M.doigt.bouge(110, 500, 16); M.doigt.bouge(60, 500, 16); M.doigt.leve();
  vrai('un grand tirage (−190 px sur 280) : le menu se ferme', !M.sb.classList.contains('open')); }
{ const M = monde();
  M.doigt.pose(250, 500, M.sb); M.doigt.bouge(235, 500, 10); M.doigt.bouge(210, 500, 10); M.doigt.bouge(190, 500, 10); M.doigt.leve();
  vrai('une chiquenaude (−60 px en 30 ms) : la vitesse PROJETÉE dépasse la moitié, le menu se ferme', !M.sb.classList.contains('open')); }
{ const M = monde();
  M.doigt.pose(250, 500, M.sb); M.doigt.bouge(230, 500, 10); M.doigt.bouge(190, 500, 10); M.doigt.bouge(150, 500, 10); M.doigt.attend(300); M.doigt.leve();
  vrai('le même élan, mais le doigt ARRÊTÉ 300 ms avant de lâcher (−100 px) : plus d’élan, le menu revient', M.sb.classList.contains('open')); }

console.log('\n── 2835 · 4. ce que le tiroir ne prend pas ──');
{ const M = monde();
  M.doigt.pose(250, 500, M.sb); const e = M.doigt.bouge(245, 560); M.doigt.bouge(240, 620); M.doigt.leve();
  vrai('un geste plutôt vertical est rendu au défilement du menu (rien ne bouge, rien d’annulé)', !M.sb.style.transform && !e.empeche && M.sb.classList.contains('open'), [M.sb.style.transform, e.empeche]); }
{ const M = monde();
  M.doigt.pose(150, 500, M.sb); M.doigt.bouge(200, 500); M.doigt.bouge(260, 500); M.doigt.leve();
  vrai('vers la droite, il n’y a rien à tirer', !M.sb.style.transform && M.sb.classList.contains('open'), M.sb.style.transform); }
{ const M = monde();
  M.doigt.pose(370, 600, M.ailleurs); M.doigt.bouge(300, 600); M.doigt.bouge(200, 600); M.doigt.leve();
  vrai('un doigt posé ailleurs que sur le menu ou le voile ne le tire pas', !M.sb.style.transform && M.sb.classList.contains('open'), M.sb.style.transform); }
{ const M = monde({ ferme: true });
  M.doigt.pose(370, 600); M.doigt.bouge(300, 600); M.doigt.bouge(200, 600); M.doigt.leve();
  vrai('menu fermé : aucun geste', !M.sb.style.transform, M.sb.style.transform); }
{ const M = monde({ bureau: true });
  M.doigt.pose(250, 500, M.sb); M.doigt.bouge(200, 500); M.doigt.bouge(100, 500); M.doigt.leve();
  vrai('au bureau (menu permanent, plus de 780 px) : aucun geste', !M.sb.style.transform && M.sb.classList.contains('open'), M.sb.style.transform); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
