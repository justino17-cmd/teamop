/* ══ PLANNING — LE GLISSER AU DOIGT SE LIT AU TACTILE, ET SE DÉFAIT PROPREMENT (planning#11) ═════
   Trace du rapport (Chromium tactile) : pointerdown, UN pointermove, pointercancel — le navigateur
   reprend le doigt pour défiler (les cartes portent touch-action:pan-y) — puis seulement des touchmove.
   Le glisser tactile n'écoutait que le pointeur : rien n'était déposé, le clone « fantôme » restait
   collé à l'écran et window._planDragging restait vrai. CLAUDE.md le dit depuis le 22 septembre :
   « on écoute le TACTILE pour un doigt, le POINTEUR pour une souris ».
   Ce banc EXÉCUTE le vrai bloc du glisser tactile d'app.html contre un document simulé (écouteurs
   capturés, minuteries manuelles) : un doigt qui arme, déplace puis relâche dépose ; un doigt perdu
   (touchcancel) défait tout SANS déposer ; un défilement avant l'armement n'arme rien ; et l'appui long
   du menu contextuel (pointeur) ne s'ouvre pas par-dessus un glisser que le navigateur a repris.
   La preuve au navigateur est la sonde du scratchpad (CDP, vrai doigt simulé) — citée dans le commit. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

// le bloc du glisser tactile : de `let _tpDrag=null;` au marqueur du bloc suivant
const a0 = APP.indexOf('let _tpDrag=null;'), a1 = APP.indexOf('/* ═══════════════ PLANNING — traçabilité');
vrai('le bloc du glisser tactile est trouvé', a0 > 0 && a1 > a0, [a0, a1]);
// l'appui long du menu contextuel (pointeur) : de son pointerdown à son pointercancel/pointerup
const b0 = APP.indexOf("document.addEventListener('pointerdown',e=>{ if(e.pointerType!=='touch'||current!=='planning') return;");
const b1 = APP.indexOf('/* ── P15 : note de journée', b0);
vrai('le bloc de l\'appui long du menu est trouvé', b0 > 0 && b1 > b0, [b0, b1]);
const code = APP.slice(a0, a1) + '\n' + 'let _lpCtx=null;\n' + APP.slice(b0, b1);

function monter(opts) {
  const O = Object.assign({ peut: true }, opts || {});
  const S = { timers: [], t: 0, ecout: {}, ajout: [], drops: [], menus: 0, vues: 0 };
  const ecoute = (type, fn, o) => { (S.ecout[type] = S.ecout[type] || []).push({ fn, o }); };
  const zone = { classes: new Set(), classList: { add(c) { zone.classes.add(c); }, remove(c) { zone.classes.delete(c); } },
    getAttribute: k => k === 'data-drop' ? 'time:T2:8' : '', getBoundingClientRect: () => ({ top: 0 }) };
  const carte = { getAttribute: k => k === 'data-drag-int' ? 'i1' : '', offsetWidth: 100,
    cloneNode() { const g = { style: {}, enleve: false, remove() { g.enleve = true; } }; S.fantome = g; return g; } };
  const W = { console, Object, Math, JSON, Set, parseInt, Date, isNaN,
    document: { addEventListener: ecoute, body: { appendChild(g) { S.ajout.push(g); } }, elementFromPoint: () => ({ closest: sel => sel === '[data-drop]' ? zone : null }) },
    navigator: {}, window: { _planDragging: false },
    current: 'planning', canPlan: () => O.peut, planLigneDe: () => 'T1', views: { planning() { S.vues++; } },
    planDropCell: (e, ...r) => S.drops.push(['cell', ...r]), planDropTime: (e, ...r) => S.drops.push(['time', e.clientY, ...r]),
    plHovHide() {}, planCtxTarget: () => [{}], planCtxOpen: () => { S.menus++; },
    setTimeout: (fn, ms) => { const id = S.timers.length + 1; S.timers.push({ id, fn, a: S.t + ms, vivant: true }); return id; },
    clearTimeout: id => { const t = S.timers.find(x => x.id === id); if (t) t.vivant = false; } };
  vm.createContext(W);
  vm.runInContext(code, W);
  const avance = ms => { S.t += ms; S.timers.filter(x => x.vivant && x.a <= S.t).forEach(x => { x.vivant = false; x.fn(); }); };
  const tire = (type, e) => { (S.ecout[type] || []).forEach(l => l.fn(e)); };
  const doigt = (x, y) => ({ clientX: x, clientY: y });
  const touche = (type, x, y, extra) => { const ev = Object.assign({ touches: type === 'touchend' || type === 'touchcancel' ? [] : [doigt(x, y)], changedTouches: [doigt(x, y)], target: { closest: sel => sel === '[data-drag-int]' ? carte : null }, cancelable: true, prevenu: false, preventDefault() { ev.prevenu = true; } }, extra || {}); tire(type, ev); return ev; };
  const pointeur = (type, x, y) => { const ev = { pointerType: 'touch', clientX: x, clientY: y, target: { closest: sel => (sel === '[data-drag-int]' ? carte : null) } }; tire(type, ev); return ev; };
  return { W, S, avance, touche, pointeur, zone };
}

console.log('— un doigt arme, déplace, relâche : la carte est déposée');
{ const m = monter();
  vrai('des écouteurs tactiles sont posés (touchstart, touchmove, touchend, touchcancel)', ['touchstart', 'touchmove', 'touchend', 'touchcancel'].every(t => (m.S.ecout[t] || []).length > 0), Object.keys(m.S.ecout));
  m.touche('touchstart', 100, 100); m.avance(300);
  vrai('appui long : le fantôme paraît et le glisser est armé', m.S.ajout.length === 1 && m.W.window._planDragging === true, [m.S.ajout.length, m.W.window._planDragging]);
  const mv = m.touche('touchmove', 140, 400);
  vrai('le déplacement bloque le défilement (touchmove annulé)', mv.prevenu === true);
  vrai('le fantôme suit le doigt', /140|150/.test(m.S.fantome && m.S.fantome.style.transform || ''), m.S.fantome && m.S.fantome.style.transform);
  vrai('la zone survolée s\'allume', m.zone.classes.has('drop'));
  m.touche('touchend', 140, 400);
  vrai('relâché : la carte est déposée sur la zone (une fois)', m.S.drops.length === 1 && m.S.drops[0][0] === 'time' && m.S.drops[0][1] === 400, m.S.drops);
  vrai('le fantôme est retiré et _planDragging remis à faux', (m.S.fantome || {}).enleve === true && m.W.window._planDragging === false);
  vrai('la zone ne reste pas allumée', !m.zone.classes.has('drop')); }

console.log('— un doigt perdu (touchcancel) défait tout sans déposer');
{ const m = monter();
  m.touche('touchstart', 100, 100); m.avance(300); m.touche('touchmove', 140, 400);
  m.touche('touchcancel', 140, 400);
  vrai('rien n\'est déposé', m.S.drops.length === 0, m.S.drops);
  vrai('le fantôme est retiré', (m.S.fantome || {}).enleve === true);
  vrai('_planDragging est remis à faux', m.W.window._planDragging === false);
  vrai('la zone n\'est plus allumée', !m.zone.classes.has('drop'));
  m.touche('touchend', 140, 400);
  vrai('un touchend tardif ne dépose rien (état défait)', m.S.drops.length === 0); }

console.log('— un défilement avant l\'armement n\'arme rien');
{ const m = monter();
  m.touche('touchstart', 100, 100); m.touche('touchmove', 100, 160); m.avance(400);
  vrai('doigt parti de plus de 12 px avant 260 ms : pas de fantôme', m.S.ajout.length === 0 && m.W.window._planDragging === false);
  m.touche('touchend', 100, 160);
  vrai('et rien déposé', m.S.drops.length === 0); }

console.log('— sans le droit « Déplacer le planning »');
{ const m = monter({ peut: false });
  m.touche('touchstart', 100, 100); m.avance(400);
  vrai('aucun glisser tactile', m.S.ajout.length === 0 && m.W.window._planDragging === false); }

console.log('— l\'appui long du menu ne s\'ouvre pas par-dessus un glisser repris par le navigateur');
{ const m = monter();
  m.pointeur('pointerdown', 100, 100); m.pointeur('pointercancel', 100, 100); m.avance(600);
  vrai('pointercancel (le navigateur défile ou glisse) : pas de menu à 520 ms', m.S.menus === 0, m.S.menus); }
{ const m = monter();
  m.pointeur('pointerdown', 100, 100); m.avance(600);
  vrai('contre-épreuve : doigt immobile 520 ms → le menu s\'ouvre', m.S.menus === 1, m.S.menus); }

console.log('\n════ test-1273 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
