/* ══ PLANNING — UN APPUI LONG SUR UNE LIGNE QU'ON GLISSE NE DÉFAIT PAS LE GLISSER (campagne 2, lot c2-planning-doigt) ═════
   Le glisser tactile s'arme à 260 ms ; l'appui long du menu contextuel (pointerdown) se joue à 520 ms et, à l'ouverture,
   annule le glisser armé. Or depuis que les rangées de technicien (tech:), les puces et cases de jour (day:) et les puces des
   Interventions (intday:) portent un data-drop, le pointerdown les compte comme des « zones du menu » : tenir le doigt 520 ms
   sur une ligne de la liste Jour défaisait le glisser (_tpDrag = null, fantôme retiré) — et planCtxTarget ne rend AUCUN menu
   pour ces préfixes. Le geste mourait sans un mot (relecture du lot, rejoué au navigateur à 700 ms de tenue).
   Ce banc EXÉCUTE le vrai bloc tactile ET le vrai appui long (planCtxTarget, le pointerdown), avec les vrais dépôts : tenir 700 ms
   puis bouger dépose encore ; une carte à fantôme ou une case vide ouvre toujours son menu (c'est voulu, et le glisser cède). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
console.log('— 0. la population');
const t0 = BRUT.indexOf('let _tpDrag=null;'), t1 = BRUT.indexOf('/* ═══════════════ PLANNING — traçabilité');
const c0 = BRUT.indexOf('function planCtxTarget('), c1 = BRUT.indexOf('/* ── P15 : note de journée');
vrai('le bloc du glisser tactile est trouvé', t0 > 0 && t1 > t0, [t0, t1]);
vrai('le bloc de l\'appui long (planCtxTarget … pointercancel) est trouvé', c0 > 0 && c1 > c0, [c0, c1]);
const NOMS = ['planSnap', 'planStamp', 'absentOn', 'absStatut', 'absValidee', 'planAbsGate', 'planObligationLever', 'intTechIds', 'planEquipeApres', 'planPoserEquipe', 'planDropDay', 'planDropTech', 'intDropDay'];
const FONC = {}; NOMS.forEach(n => { FONC[n] = bloc('function ' + n + '('); });
/* 17 oct. 2026 : un dépôt sur une personne passe par la règle « compte désactivé » (planAffecteGate, décision de Justin) — on fournit les
   VRAIES fonctions de la règle (jouée en entier par test-1820) ; sans elles, le dépôt jetait dans le bac à sable et rien ne bougeait. */
const REGLE = ['techAssignable', 'techPeutRecevoir', 'techRefusDesactive', 'planAffecteGate'].map(n => bloc('function ' + n + '('));
const LBL_INACTIF = (SRC.match(/^const TECH_INACTIF_LBL=[^\n]*$/m) || [''])[0].replace('const ', 'var ');
vrai('la règle « compte désactivé » est trouvée dans le fichier réel', REGLE.every(x => x.length > 30) && LBL_INACTIF.length > 20);
vrai('les treize fonctions de dépôt sont trouvées', NOMS.every(n => FONC[n].length > 40), NOMS.filter(n => FONC[n].length <= 40));

function monter(o) {
  const O = Object.assign({ zone: 'tech:T2', source: 'tp', vue: 'planning' }, o || {});
  const S = { timers: [], t: 0, ecout: {}, ajout: [], toasts: [], saves: 0, menus: [], vues: [] };
  const ecoute = (type, fn) => { (S.ecout[type] = S.ecout[type] || []).push(fn); };
  const zone = { classes: new Set(), classList: { add(c) { zone.classes.add(c); }, remove(c) { zone.classes.delete(c); } },
    getAttribute: k => k === 'data-drop' ? O.zone : '', getBoundingClientRect: () => ({ top: 0 }) };
  const carte = { getAttribute: k => (O.source === 'tp' ? (k === 'data-tp-int' ? 'i1' : '') : (k === 'data-drag-int' ? 'i1' : '')), offsetWidth: 100,
    getBoundingClientRect: () => ({ top: 100, height: 60 }),
    cloneNode() { const g = { style: {}, enleve: false, remove() { g.enleve = true; } }; S.fantome = g; return g; } };
  const cible = { closest: sel => sel === '[data-drag-int]' ? (O.source === 'drag' ? carte : null) : sel === '[data-tp-int]' ? (O.source === 'tp' ? carte : null)
    : sel === '[data-drop]' ? zone : null };
  const db = { interventions: [{ id: 'i1', titre: 'Dératisation', date: '2026-10-16', heure: '10:00', duree: 60, techId: 'T1', techIds: ['T1'], statut: 'planifiee', histo: [] }],
    absences: [], planJournal: [] };
  const W = { console, Object, Math, JSON, Set, parseInt, Date, isNaN, String, Number, Array,
    document: { addEventListener: ecoute, body: { appendChild(g) { S.ajout.push(g); } }, elementFromPoint: () => ({ closest: sel => sel === '[data-drop]' ? zone : null }) },
    navigator: {}, window: { _planDragging: false }, current: O.vue,
    canPlan: () => true, can: () => true, planLigneDe: () => 'T1', db, currentUser: { id: 'u1' }, fullName: () => 'Justine Admin',
    toast: m => S.toasts.push(String(m)), save() { S.saves++; }, intHisto: (i, m) => i.histo.push(m),
    views: { planning() { S.vues.push('planning'); }, interventions() { S.vues.push('interventions'); } },
    fmtShort: iso => iso, techName: id => ({ T1: 'Karim', T2: 'Sofia', '': '' })[id] || id, techNames: i => (i.techIds || []).join(', '),
    ABS_TYPES: {}, intConflictOf: () => null, serieShiftPropose() {}, confirm: () => true,
    // l'ouverture du menu est observée : planCtxOpen note ce qu'on lui donne ; les fabriques d'items rendent un item (le menu existe)
    planCtxOpen: (x, y, items) => S.menus.push(items), planCtxItemsCard: () => [{ l: 'carte' }], planCtxItemsCell: () => [{ l: 'case' }], plHovHide() {},
    planSel: '2026-10-16', intSelDay: '2026-10-16',
    setTimeout: (fn, ms) => { const id = S.timers.length + 1; S.timers.push({ id, fn, a: S.t + ms, vivant: true }); return id; },
    clearTimeout: id => { const t = S.timers.find(x => x.id === id); if (t) t.vivant = false; } };
  vm.createContext(W);
  vm.runInContext('var planSel="2026-10-16", intSelDay="2026-10-16";', W);
  vm.runInContext(BRUT.slice(t0, t1) + '\n' + LBL_INACTIF + '\n' + REGLE.join('\n') + '\n' + NOMS.map(n => FONC[n]).join('\n'), W);
  // planCtxTarget + contextmenu + pointerdown/move/up/cancel ; les `let` _ctxEl/_lpCtx vivent plus haut dans le fichier : le bac à sable les déclare comme lui
  vm.runInContext('let _ctxEl=null,_lpCtx=null;\n' + BRUT.slice(c0, c1), W);
  const avance = ms => { S.t += ms; S.timers.filter(x => x.vivant && x.a <= S.t).forEach(x => { x.vivant = false; x.fn(); }); };
  const tire = (type, e) => { (S.ecout[type] || []).forEach(fn => fn(e)); };
  const doigt = (x, y) => ({ clientX: x, clientY: y });
  const touche = (type, x, y) => { const ev = { touches: type === 'touchend' || type === 'touchcancel' ? [] : [doigt(x, y)], changedTouches: [doigt(x, y)], cancelable: true, target: cible, preventDefault() {} }; tire(type, ev); return ev; };
  const appui = (x, y) => { tire('pointerdown', { pointerType: 'touch', clientX: x, clientY: y, target: cible }); };
  const i1 = () => db.interventions[0];
  return { W, S, db, i1, avance, touche, appui, zone, tire };
}
vrai('la déclaration de _lpCtx est là où le banc la suppose', BRUT.includes('let _ctxEl=null,_lpCtx=null;'));
const monterAvecCtx = monter;

console.log('— 1. tenir 700 ms sur une ligne d\'une zone de dépôt (tech:, day:, intday:) puis bouger : le dépôt se fait encore');
[['tech:T2', 'planning'], ['day:2026-10-18', 'planning'], ['intday:2026-10-19', 'interventions']].forEach(([z, vue]) => {
  const m = monterAvecCtx({ zone: z, vue });
  m.appui(100, 130); m.touche('touchstart', 100, 130);
  m.avance(300);
  vrai('« ' + z + ' » : à 300 ms le glisser est armé (fantôme posé)', !!m.S.fantome && m.W.window._planDragging === true, m.W.window._planDragging);
  m.avance(450);   // 750 ms au total : l'appui long de 520 ms a eu lieu
  vrai('« ' + z + ' » : l\'appui long a eu lieu mais n\'a ouvert AUCUN menu (rien à proposer sur une ligne de liste)', m.S.menus.length === 0, m.S.menus.length);
  vrai('« ' + z + ' » : …et le glisser est toujours vivant (fantôme non retiré, _planDragging vrai)', m.S.fantome.enleve === false && m.W.window._planDragging === true, [m.S.fantome.enleve, m.W.window._planDragging]);
  m.touche('touchmove', 140, 400); m.touche('touchend', 140, 400);
  const bon = z.startsWith('tech') ? m.i1().techId === 'T2' : m.i1().date === z.slice(z.indexOf(':') + 1);
  vrai('« ' + z + ' » : le dépôt se fait', bon && m.S.saves === 1, [m.i1().techId, m.i1().date, m.S.saves]); });

console.log('— 2. ce qui doit ouvrir un menu l\'ouvre toujours, et le glisser cède (voulu)');
{ const m = monterAvecCtx({ source: 'drag', zone: 'multi:T1:2026-10-16' });
  m.appui(100, 130); m.touche('touchstart', 100, 130); m.avance(300); m.avance(450);
  vrai('une carte à fantôme (data-drag-int) tenue 520 ms ouvre le menu de la carte', m.S.menus.length === 1 && m.S.menus[0][0].l === 'carte', m.S.menus);
  vrai('…et le glisser armé est défait (fantôme retiré, _planDragging faux)', m.S.fantome.enleve === true && m.W.window._planDragging === false); }
{ const m = monterAvecCtx({ source: 'none', zone: 'cell:T1:2026-10-16' });
  m.appui(100, 130); m.avance(600);
  vrai('une case vide (cell:) tenue 520 ms ouvre le menu de création', m.S.menus.length === 1 && m.S.menus[0][0].l === 'case', m.S.menus); }
{ const m = monterAvecCtx({ source: 'none', zone: 'time:2026-10-16:8' });
  m.appui(100, 130); m.avance(600);
  vrai('un créneau (time:) tenu 520 ms ouvre le menu de création', m.S.menus.length === 1, m.S.menus); }

console.log('— 3. le fichier : le glisser n\'est défait qu\'après avoir obtenu un menu');
{ const pd = BRUT.slice(BRUT.indexOf("document.addEventListener('pointerdown',e=>{ if(e.pointerType!=='touch'||current!=='planning')"), c1);
  const iM = pd.indexOf('planCtxTarget(tx,ty,tg)'), iD = pd.indexOf('_tpDrag=null;');
  vrai('population : le minuteur de l\'appui long est trouvé', iM > 0 && iD > 0, [iM, iD]);
  vrai('⛔ le menu est demandé AVANT de défaire le glisser', iM > 0 && iD > iM, [iM, iD]);
  vrai('…et un menu vide laisse le glisser en vie (sortie avant l\'annulation)', /if\(!\(items&&items\.length\)\) return;/.test(pd)); }

console.log('\n════ test-1673 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
