/* ══ test-2832 · GLISSER UNE INTERVENTION AU DOIGT : CE QUE VOIT L'ŒIL EST CE QUE POSE LE DÉPÔT ══════════════════════════
   Audit apple-design du 21 octobre 2026 (§ 2 « touch and content should move together », en respectant le point de prise ;
   § 6 ; § 7). Au planning, au doigt (appui long puis glisser), le fantôme était posé coin haut-gauche au doigt + 10 px,
   pendant que le DÉPÔT soustrayait le point de prise (`_planGrabDy`) : une carte saisie en son milieu s'affichait des
   dizaines de pixels plus BAS que là où elle se posait — presque une heure. Et le doigt n'avait ni le repère d'heure de la
   souris (`planGuideMaj`), ni défilement au bord, ni retour à sa place quand le geste s'annule.
   Ce banc EXÉCUTE le vrai code tactile d'app.html (de `let _tpDrag=null;` au bloc suivant) dans un faux document : une carte,
   une zone de dépôt, un doigt. Il relit la position du fantôme dans sa `transform`, le point où le dépôt pose la carte, le
   repère, le défilement, le retour.
   La preuve au navigateur, au vrai doigt (CDP) : scratchpad/sonde-glisser-doigt.js.                                     */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

const i0 = BRUT.indexOf('let _tpDrag=null;'), i1 = BRUT.indexOf('/* ═══════════════ PLANNING — traçabilité', i0);
const BLOC = i0 > 0 && i1 > i0 ? BRUT.slice(i0, i1) : '';
console.log('\n── 2832 · 0. la population ──');
vrai('le bloc du glisser au doigt est trouvé', BLOC.length > 2000, BLOC.length);

/* ── le faux monde ── */
function monde(opts) {
  const o = opts || {};
  const ecoute = {}, minuteries = [], images = [], journal = { guide: [], off: 0, depot: null, defile: [] };
  const classes = () => { const s = new Set(); return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c), s }; };
  const RECT_CARTE = { left: 100, top: 200, width: 150, height: 60, right: 250, bottom: 260 };
  const zone = { classList: classes(), getAttribute: (a) => a === 'data-drop' ? (o.drop || 'multi:2026-10-22:t1:7:46') : null, closest: (s) => s === '[data-drop]' ? zone : null,
    getBoundingClientRect: () => ({ left: 0, top: 150, width: 390, height: 1200, right: 390, bottom: 1350 }) };
  const fantomes = [];
  const carte = { classList: classes(), isConnected: true, offsetWidth: 150, getAttribute: (a) => a === 'data-drag-int' ? 'i1' : null,
    closest: (s) => s === '[data-drag-int]' ? carte : null, getBoundingClientRect: () => RECT_CARTE,
    cloneNode: () => { const g = { style: {}, removeAttribute() {}, removed: false, remove() { g.removed = true; }, anims: [], animate: o.animer ? ((kf) => { const a = { kf, onfinish: null, oncancel: null }; g.anim = a; g.anims.push(a); return a; }) : undefined }; fantomes.push(g); return g; } };
  const doc = { addEventListener: (t, f) => { ecoute[t] = f; }, body: { appendChild() {} },
    elementFromPoint: (x, y) => (y >= 150 && y < 1350 && !o.horsZone ? { closest: (s) => s === '[data-drop]' ? zone : null } : { closest: () => null }) };
  const win = { _planDragging: false, _planDragId: '', _planGrabDy: 0, scrollBy: (x, y) => journal.defile.push(y) };
  const ctx = {
    document: doc, window: win, navigator: {}, current: 'planning', innerHeight: 800, console,
    canPlan: () => true, planLigneDe: () => 'L', techColor: () => '#123456',
    planGuideMaj: (e, col, h0, pph, coul) => journal.guide.push({ y: e.clientY, grab: win._planGrabDy, h0, pph, coul, col: col === zone }),
    planGuideOff: () => { journal.off++; },
    planMultiDrop: (f, j, t, h0, pph) => { journal.depot = { y: f.clientY, grab: win._planGrabDy, j, t, h0, pph }; },
    planWeekDrop: (f) => { journal.depot = { y: f.clientY, grab: win._planGrabDy, semaine: true }; }, planDropCell: () => { journal.depot = { cell: true }; },
    planDropTime: (f) => { journal.depot = { y: f.clientY, grab: win._planGrabDy, temps: true }; },
    views: { planning() {} },
    setTimeout: (f) => { minuteries.push(f); return minuteries.length; }, clearTimeout: () => {},
    requestAnimationFrame: (f) => { images.push(f); return images.length; }, cancelAnimationFrame: () => {},
    matchMedia: () => ({ matches: !o.animer }), Math, parseInt, isNaN,
  };
  ctx.window.scrollBy = win.scrollBy;
  vm.createContext(ctx);
  try { vm.runInContext(BLOC.replace(/window\.scrollBy\(/g, 'window.scrollBy('), ctx); } catch (e) { ctx.__err = e.message; }
  const toucher = (x, y) => ({ touches: [{ clientX: x, clientY: y }], changedTouches: [{ clientX: x, clientY: y }], cancelable: true, preventDefault() {}, target: carte });
  return { ctx, ecoute, minuteries, images, journal, carte, zone, fantomes, win, toucher };
}
/* la position du coin haut-gauche du fantôme, lue dans sa transform */
const coin = (g) => { const m = /translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/.exec((g && g.style.transform) || ''); return m ? [+m[1], +m[2]] : null; };

console.log('\n── 2832 · 1. le point saisi reste sous le doigt ──');
{
  const M = monde();
  vrai('le code s’exécute dans le faux document', !M.ctx.__err && typeof M.ecoute.touchstart === 'function', M.ctx.__err);
  M.ecoute.touchstart(M.toucher(160, 230));            // saisie : 60 px du bord gauche, 30 px du bord haut
  M.minuteries.forEach(f => f());                     // l'appui long arme le glisser
  const g = M.fantomes[0];
  vrai('l’appui long crée le fantôme et arme le glisser', !!g && M.win._planDragging === true);
  vrai('⛔ au soulèvement, le fantôme est EXACTEMENT sur la carte (aucun saut sous le doigt)', JSON.stringify(coin(g)) === JSON.stringify([100, 200]), coin(g));
  vrai('l’inclinaison et l’échelle tournent AUTOUR du point saisi (transform-origin), donc ne le déplacent pas', g && g.style.transformOrigin === '60px 30px', g && g.style.transformOrigin);
  vrai('la carte d’origine reste visible en fantôme, comme à la souris (plg-fantome)', M.carte.classList.contains('plg-fantome'));
  vrai('le repère d’heure connaît l’intervention glissée (_planDragId)', M.win._planDragId === 'i1', M.win._planDragId);
  M.ecoute.touchmove(M.toucher(180, 400));
  vrai('⛔ en glissant, le point saisi suit le doigt : coin = doigt − (60, 30)', JSON.stringify(coin(g)) === JSON.stringify([120, 370]), coin(g));
  const r = M.journal.guide[M.journal.guide.length - 1];
  vrai('le repère d’heure de la souris suit le doigt (planGuideMaj, avec le point de prise et l’échelle de la zone)', !!r && r.y === 400 && r.grab === 30 && r.h0 === 7 && r.pph === 46 && r.col, r);
  M.ecoute.touchend(M.toucher(180, 400));
  const d = M.journal.depot;
  vrai('⛔⛔ le dépôt pose le haut de la carte là où était le haut du fantôme (400 − 30 = 370)', !!d && d.y - d.grab === coin(g)[1], d);
  vrai('après le dépôt : fantôme retiré, glisser désarmé, repère effacé', g.removed && M.win._planDragging === false && M.journal.off > 0);
}

console.log('\n── 2832 · 2. le repère d’heure selon la zone ──');
for (const [drop, h0, pph] of [['time:2026-10-22:6:48', 6, 48], ['cell:2026-10-22:t2:8:40', 8, 40]]) {
  const M = monde({ drop });
  M.ecoute.touchstart(M.toucher(160, 230)); M.minuteries.forEach(f => f()); M.ecoute.touchmove(M.toucher(170, 500));
  const r = M.journal.guide[M.journal.guide.length - 1];
  vrai('zone « ' + drop.split(':')[0] + ' » : le repère prend son heure de départ (' + h0 + ') et son échelle (' + pph + ')', !!r && r.h0 === h0 && r.pph === pph, r);
}
{
  const M = monde({ drop: 'cell:2026-10-22:t2' });
  M.ecoute.touchstart(M.toucher(160, 230)); M.minuteries.forEach(f => f()); M.ecoute.touchmove(M.toucher(170, 500));
  vrai('une case SANS heures n’a pas de repère (on l’efface, on n’en invente pas)', M.journal.guide.length === 0 && M.journal.off > 0);
}

console.log('\n── 2832 · 3. au bord de l’écran, la page défile sous le doigt ──');
{
  const M = monde();
  M.ecoute.touchstart(M.toucher(160, 230)); M.minuteries.forEach(f => f());
  M.ecoute.touchmove(M.toucher(170, 400));
  for (let k = 0; k < 3 && M.images.length; k++) M.images.shift()();
  vrai('au milieu de l’écran, la page ne défile pas', M.journal.defile.length === 0, M.journal.defile);
  M.ecoute.touchmove(M.toucher(170, 780));            // 780 > 800 − 110 : bord bas
  for (let k = 0; k < 3 && M.images.length; k++) M.images.shift()();
  vrai('près du bord BAS, la page descend (et continue tant que le doigt y reste)', M.journal.defile.length >= 2 && M.journal.defile.every(v => v > 0), M.journal.defile);
  const M2 = monde();
  M2.ecoute.touchstart(M2.toucher(160, 230)); M2.minuteries.forEach(f => f()); M2.ecoute.touchmove(M2.toucher(170, 40));
  for (let k = 0; k < 2 && M2.images.length; k++) M2.images.shift()();
  vrai('près du bord HAUT, la page remonte', M2.journal.defile.length >= 1 && M2.journal.defile.every(v => v < 0), M2.journal.defile);
}

console.log('\n── 2832 · 4. un geste annulé ramène la carte à sa place ──');
{
  const M = monde({ animer: true, horsZone: true });
  M.ecoute.touchstart(M.toucher(160, 230)); M.minuteries.forEach(f => f()); M.ecoute.touchmove(M.toucher(300, 700));
  const g = M.fantomes[0], avant = g.anims.length;   // le soulèvement a déjà joué UNE animation : elle ne compte pas
  M.ecoute.touchend(M.toucher(300, 700));
  vrai('lâchée hors de toute zone : aucun dépôt', M.journal.depot === null);
  const kf = g.anims.length > avant ? g.anims[g.anims.length - 1].kf : null;
  vrai('… et le fantôme REVIENT à la carte d’origine (100, 200) au lieu de disparaître sur place — une animation NÉE au relâcher',
    !!kf && /translate\(300px|translate\(240px/.test(kf[0].transform) && /translate\(100px,\s*200px\)$/.test(kf[kf.length - 1].transform) && !g.removed, kf);
  g.anim && g.anim.onfinish && g.anim.onfinish();
  vrai('… puis il est retiré, et l’origine n’est plus en fantôme', g.removed && !M.carte.classList.contains('plg-fantome'));
  const M3 = monde({ animer: true });
  M3.ecoute.touchstart(M3.toucher(160, 230)); M3.minuteries.forEach(f => f()); M3.ecoute.touchmove(M3.toucher(200, 500));
  const avant3 = M3.fantomes[0].anims.length;
  M3.ecoute.touchcancel();
  vrai('un appel entrant (touchcancel) : même retour, et le glisser est désarmé', M3.fantomes[0].anims.length > avant3 && M3.win._planDragging === false);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
