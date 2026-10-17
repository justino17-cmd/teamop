/* ══ PLANNING — UNE ACTIVITÉ (garage, dépôt, autre) SE GLISSE AU DOIGT COMME À LA SOURIS (campagne 2, lot c2-planning-doigt) ═
   Les blocs d'activité (data-act : .plt-act du Jour, .plg-act de la Semaine, et le Multi) se glissent à la souris par
   actDragStart, qui range « act:<id> » dans le transfert, et les trois dépôts horaires (planMultiDrop, planWeekDrop,
   planDropTime) reconnaissent ce préfixe avant de chercher une intervention. Le glisser TACTILE, lui, ne saisissait que
   data-drag-int et data-tp-int : un doigt posé sur une activité ne l'armait pas, et l'activité ne se déplaçait pas.

   Ce banc EXÉCUTE le vrai bloc du glisser tactile d'app.html avec les VRAIS dépôts horaires et le vrai actDeplace :
   un doigt qui arme, déplace et relâche sur une zone horaire déplace l'activité (jour, personne, heure déduite de la
   position du doigt moins l'endroit où il tenait le bloc) ; touchcancel ne dépose rien ; sans le droit « Déplacer le
   planning » rien ne s'arme ; une intervention n'est jamais touchée par le geste d'une activité.
   La preuve au navigateur : correctifs-c2/c2-planning-doigt/sonde-act.js (appui long CDP, iPad).                  */
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
vrai('le bloc du glisser tactile est trouvé', t0 > 0 && t1 > t0, [t0, t1]);
const NOMS = ['actAll', 'actDeplace', 'actTitre', 'actType', 'planYbord', 'planDropTime', 'planWeekDrop', 'planMultiDrop', 'clockFromMin'];
const FONC = {}; NOMS.forEach(n => { FONC[n] = bloc('function ' + n + '('); });
/* 17 oct. 2026 : un dépôt sur une personne passe par la règle « compte désactivé » (planAffecteGate, décision de Justin) — on fournit les
   VRAIES fonctions de la règle (jouée en entier par test-1820) ; sans elles, le dépôt jetait dans le bac à sable et rien ne bougeait. */
const REGLE = ['techAssignable', 'techPeutRecevoir', 'techRefusDesactive', 'planAffecteGate'].map(n => bloc('function ' + n + '('));
const LBL_INACTIF = (SRC.match(/^const TECH_INACTIF_LBL=[^\n]*$/m) || [''])[0].replace('const ', 'var ');
vrai('la règle « compte désactivé » est trouvée dans le fichier réel', REGLE.every(x => x.length > 30) && LBL_INACTIF.length > 20);
vrai('les fonctions réelles sont trouvées', NOMS.every(n => FONC[n].length > 30), NOMS.filter(n => FONC[n].length <= 30));
vrai('⛔ une seule définition de actDeplace (une seconde gagnerait partout, en silence)', SRC.split('function actDeplace(').length === 2);

function monter(opts) {
  const O = Object.assign({ peut: true, zone: 'time:T2:8:48', source: 'act' }, opts || {});
  const S = { timers: [], t: 0, ecout: {}, ajout: [], toasts: [], saves: 0, vues: 0, deposInt: 0 };
  const ecoute = (type, fn) => { (S.ecout[type] = S.ecout[type] || []).push(fn); };
  const zone = { classes: new Set(), classList: { add(c) { zone.classes.add(c); }, remove(c) { zone.classes.delete(c); } },
    getAttribute: k => k === 'data-drop' ? O.zone : '', getBoundingClientRect: () => ({ top: 200 }) };
  const bloc_ = { getAttribute: k => O.source === 'act' ? (k === 'data-act' ? 'a1' : '') : (k === 'data-tp-int' ? 'i1' : ''), offsetWidth: 100,
    getBoundingClientRect: () => ({ top: 100, height: 40 }),
    cloneNode() { const g = { style: {}, enleve: false, remove() { g.enleve = true; } }; S.fantome = g; return g; } };
  const db = { activites: [{ id: 'a1', type: 'garage', titre: 'Véhicule au garage', date: '2026-10-20', heure: '14:00', duree: 60, techId: 'T1' }],
    interventions: [{ id: 'i1', date: '2026-10-20', heure: '10:00', techId: 'T1', techIds: ['T1'] }] };
  const W = { console, Object, Math, JSON, Set, parseInt, Date, isNaN, String, Number, Array,
    document: { addEventListener: ecoute, body: { appendChild(g) { S.ajout.push(g); } }, elementFromPoint: () => ({ closest: sel => sel === '[data-drop]' ? zone : null }) },
    navigator: {}, window: { _planDragging: false }, current: 'planning', canPlan: () => O.peut, planLigneDe: () => 'T1', db,
    toast: m => S.toasts.push(String(m)), save() { S.saves++; }, views: { planning() { S.vues++; } }, fmtShort: iso => iso, ACT_TYPES: { garage: { l: 'Véhicule au garage', ic: 'G' }, autre: { l: 'Autre', ic: 'A' } },
    fmtHmin: x => String(x), esc: x => String(x), toMinH: h => { const m = /^(\d\d):(\d\d)$/.exec(h || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; },
    planSel: '2026-10-20', planGuideOff() {}, planDepotAvant() { S.deposInt++; return null; },
    setTimeout: (fn, ms) => { const id = S.timers.length + 1; S.timers.push({ id, fn, a: S.t + ms, vivant: true }); return id; },
    clearTimeout: id => { const t = S.timers.find(x => x.id === id); if (t) t.vivant = false; } };
  vm.createContext(W);
  vm.runInContext('var planSel="2026-10-20";', W);
  vm.runInContext(BRUT.slice(t0, t1) + '\n' + LBL_INACTIF + '\n' + REGLE.join('\n') + '\n' + NOMS.map(n => FONC[n]).join('\n'), W);
  const avance = ms => { S.t += ms; S.timers.filter(x => x.vivant && x.a <= S.t).forEach(x => { x.vivant = false; x.fn(); }); };
  const tire = (type, e) => { (S.ecout[type] || []).forEach(fn => fn(e)); };
  const doigt = (x, y) => ({ clientX: x, clientY: y });
  const touche = (type, x, y) => {
    const ev = { touches: type === 'touchend' || type === 'touchcancel' ? [] : [doigt(x, y)], changedTouches: [doigt(x, y)], cancelable: true, prevenu: false,
      target: { closest: sel => (sel === '[data-act]' && O.source === 'act') || (sel === '[data-tp-int]' && O.source === 'tp') ? bloc_ : null },
      preventDefault() { ev.prevenu = true; } };
    tire(type, ev); return ev; };
  // doigt posé à 110 px, bloc dont le haut est à 100 px : le doigt tient le bloc à 10 px de son bord ; relâché à 300 px, zone dont le haut est à 200 px
  const glisse = (fin) => { touche('touchstart', 100, 110); avance(300); touche('touchmove', 140, 300); if (fin !== false) touche(fin || 'touchend', 140, 300); };
  return { W, S, db, a1: () => db.activites[0], i1: () => db.interventions[0], avance, touche, glisse, zone };
}

console.log('— 1. le doigt saisit un bloc d\'activité et le dépose sur chaque zone horaire');
{ const m = monter({ zone: 'time:T2:8:48' });
  m.touche('touchstart', 100, 110); m.avance(300);
  vrai('appui long sur une activité : le fantôme paraît et le glisser est armé', m.S.ajout.length === 1 && m.W.window._planDragging === true, [m.S.ajout.length, m.W.window._planDragging]);
  m.touche('touchmove', 140, 300); m.touche('touchend', 140, 300);
  // Jour : colonne de T2 le jour affiché (planSel), 8 h, 48 px/h ; (300 − 200 − 10) px = 90 px = 112,5 min → arrondi aux 5 min : 115 min, soit 8 h + 1 h 55
  vrai('Jour : l\'activité passe chez la personne de la colonne, à l\'heure déduite de la position du doigt (09:55)', m.a1().techId === 'T2' && m.a1().heure === '09:55' && m.a1().date === '2026-10-20', m.a1());
  vrai('…enregistrée une fois, vue redessinée, le geste le dit', m.S.saves === 1 && m.S.vues === 1 && m.S.toasts.some(t => /Véhicule au garage/.test(t)), [m.S.saves, m.S.vues, m.S.toasts]);
  vrai('…et l\'intervention du même jour n\'est pas touchée, le dépôt d\'intervention n\'est jamais appelé', m.i1().heure === '10:00' && m.i1().techId === 'T1' && m.S.deposInt === 0, [m.i1(), m.S.deposInt]); }
{ const m = monter({ zone: 'cell:2026-10-22:T2:7:40' });
  m.glisse();
  vrai('Semaine : l\'activité passe au jour et à la personne de la case, à l\'heure du doigt (07:00 + 90 px / 40 = 2 h 15)', m.a1().date === '2026-10-22' && m.a1().techId === 'T2' && m.a1().heure === '09:15', m.a1()); }
{ const m = monter({ zone: 'multi:2026-10-21:T2:6:46' });
  m.glisse();
  vrai('Multi : l\'activité passe au jour et à la personne de la colonne', m.a1().date === '2026-10-21' && m.a1().techId === 'T2' && /^0[78]:/.test(m.a1().heure), m.a1()); }
{ const m = monter({ zone: 'time:T2:8:48' });
  m.glisse();
  vrai('le fantôme est retiré, rien ne reste allumé, _planDragging est faux', (m.S.fantome || {}).enleve === true && !m.zone.classes.has('drop') && m.W.window._planDragging === false); }

console.log('— 2. un doigt perdu, ou un geste sans le droit, ne déplace rien');
{ const m = monter();
  m.glisse('touchcancel');
  vrai('touchcancel : rien déposé, rien enregistré, plus de fantôme', JSON.stringify(m.a1()) === JSON.stringify({ id: 'a1', type: 'garage', titre: 'Véhicule au garage', date: '2026-10-20', heure: '14:00', duree: 60, techId: 'T1' }) && m.S.saves === 0 && (m.S.fantome || {}).enleve === true && m.W.window._planDragging === false, m.a1());
  m.touche('touchend', 140, 300);
  vrai('…et un touchend tardif ne dépose rien', m.a1().heure === '14:00' && m.S.saves === 0); }
{ const m = monter({ peut: false });
  m.glisse();
  vrai('sans le droit « Déplacer le planning » : le glisser ne s\'arme pas, rien ne bouge', m.S.ajout.length === 0 && m.a1().heure === '14:00' && m.S.saves === 0); }
{ const m = monter({ source: 'tp', zone: 'time:T2:8:48' });
  m.glisse();
  vrai('contre-épreuve : une ligne d\'intervention (data-tp-int) sur la même zone passe, elle, par le dépôt d\'intervention — et l\'activité ne bouge pas', m.S.ajout.length === 1 && m.S.deposInt === 1 && m.a1().heure === '14:00', [m.S.ajout.length, m.S.deposInt, m.a1().heure]); }

console.log('— 3. recensement du fichier : le geste lit les trois marques de source');
{ const ts = BRUT.slice(BRUT.indexOf("document.addEventListener('touchstart',e=>{ if(e.touches.length!==1"), BRUT.indexOf("document.addEventListener('touchmove'", t0));
  vrai('le touchstart lit data-drag-int, data-tp-int ET data-act', /closest\('\[data-drag-int\]'\)\|\|e\.target\.closest\('\[data-tp-int\]'\)\|\|e\.target\.closest\('\[data-act\]'\)/.test(ts), ts.slice(0, 160));
  vrai('…et l\'identifiant d\'une activité part préfixé « act: » (le préfixe que reconnaissent les trois dépôts horaires)', /'act:'\+c\.getAttribute\('data-act'\)/.test(ts));
  const dep = ['planMultiDrop', 'planWeekDrop', 'planDropTime'].map(n => FONC[n]);
  vrai('population : les trois dépôts horaires reconnaissent « act: » avant de chercher une intervention', dep.every(f => /id\.indexOf\('act:'\)===0\)\{[^}]*actDeplace\(/.test(f)), dep.map(f => f.length));
  const blocs = [...SRC.matchAll(/data-act="\$\{(a\.id)\}"/g)].length;
  vrai('population : les deux blocs d\'activité du Jour et de la Semaine portent data-act', blocs >= 2, blocs); }

console.log('\n════ test-1671 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
