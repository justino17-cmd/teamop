/* ══ PLANNING — UNE INTERVENTION DÉPLACÉE VERS UNE PLACE SANS CONGÉ PERD LA TRACE « PLACÉE MALGRÉ UN CONGÉ » ══
   Lot i03 (17 octobre 2026), bug r3#0. `i.obligation={par,ts}` était posée par planAbsGate quand on
   confirmait l'obligation de travailler… et n'était JAMAIS retirée : la carte déplacée ensuite chez
   Karim (aucun congé) affichait encore « Placée malgré un congé par Justine Admin » au survol (plHovHtml),
   et le badge « congé » sur la carte. Le correctif de planning#4 n'avait réparé que `_oblig` (le Journal).
   La trace se retire AU GESTE de déplacement (planAbsGate, que les dépôts, « Déplacer… » et le changement
   de technicien appellent tous) — jamais au chargement. Une place ENCORE en congé la garde.
   Ce banc joue les quatre dépôts RÉELS (Multi, Semaine, Jour, case) extraits d'app.html, comme test-1270. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); const fin = m ? m.index : Math.min(APP.length, d + 80000);
  let bout = APP.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }

const FN = ['function toMin(', 'function indisposOf(', 'function indispoAt(', 'function absentOn(', 'function intTechIds(', 'function techNames(',
  'function intHisto(', 'function clockFromMin(', 'function planYbord(', 'function planEquipeApres(', 'function planPoserEquipe(', 'function planSnap(',
  'function planStamp(', 'function planDup(', 'function planObligationLever(', 'function planAbsGate(', 'function planDepotAvant(', 'function planDepotApres(',
  'function planMultiDrop(', 'function planWeekDrop(', 'function planDropTime(', 'function planDropCell('];
const manquantes = FN.filter(h => APP.indexOf(h) < 0 && h !== 'function planObligationLever(');
const code = FN.filter(h => APP.indexOf(h) >= 0).map(decoupe).join('\n');

function monter() {
  const S = { toasts: [], saves: [], dialogues: [], reponse: true, peut: { planifDeplacer: true, planifObligerTravail: true, ajouter: true }, planSel: '2026-10-16' };
  S.db = { interventions: [], absences: [], indispos: [], planJournal: [], techniciens: [{ id: 'T1' }, { id: 'T2' }, { id: 'T3' }] };
  S.currentUser = { id: 'u', prenom: 'Justine', nom: 'Admin', role: 'admin' };
  const W = { console, Object, JSON, String, Math, Date, Array, Number, parseInt, S,
    window: { _planGrabDy: 0, _planDragDe: null }, views: { planning() {} } };
  W.db = S.db; W.currentUser = S.currentUser;
  W.canPlan = () => S.peut.planifDeplacer;
  W.can = cap => !!S.peut[cap];
  W.canCat = (g, d) => g === 'int' && d === 'ajouter' ? S.peut.ajouter : true;
  W.permGarde = (g, d, q) => { if (W.canCat(g, d)) return true; W.toast('refus ' + q); return false; };
  W.toast = t => S.toasts.push(t);
  W.confirm = m => { S.dialogues.push(m); return S.reponse; };
  W.fullName = u => u.prenom + ' ' + u.nom;
  W.techName = id => ({ T1: 'Karim Benali', T2: 'Sophie Martin', T3: 'Léa Roux' })[id] || '';
  W.fmtShort = iso => { const [, m, j] = iso.split('-'); return String(+j) + ' ' + ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][+m - 1]; };
  W.ABS_TYPES = { conge: 'congé' };
  W.absValidee = a => a.statut === 'validee';
  W.uid = (() => { let n = 0; return () => 'n' + (++n); })();
  W.save = () => { S.saves.push(1); };
  W.serieShiftPropose = () => {};
  W.intConflictOf = () => null;
  Object.defineProperty(W, 'planSel', { get: () => S.planSel, set: v => { S.planSel = v; }, enumerable: true });
  W.planJours = ['2026-10-16'];
  vm.createContext(W);
  vm.runInContext(code, W);
  return { W, S };
}
function carte(extra) { return Object.assign({ id: 'i1', titre: 'Nid de frelons', date: '2026-10-15', heure: '09:00', duree: 60, techId: 'T1', techIds: ['T1'], statut: 'planifiee', histo: [] }, extra || {}); }
function evt(id) { return { preventDefault() {}, dataTransfer: { getData: () => id }, altKey: false, clientY: 100, currentTarget: { getBoundingClientRect: () => ({ top: 0 }) } }; }
const CONGE = (t, j) => ({ techId: t, du: j, au: j, statut: 'validee', type: 'conge' });
const DEPOTS = (W, e, iso, tech) => ({
  Multi: () => W.planMultiDrop(e, iso, tech, 8, 48),
  Semaine: () => W.planWeekDrop(e, iso, tech, 8, 48),
  Jour: () => { W.planSel = iso; W.planDropTime(e, tech, 8, 48); },
  Case: () => W.planDropCell(e, iso, tech)
});

console.log('— les fonctions du code réel');
vrai('toutes les fonctions du dépôt existent', manquantes.length === 0, manquantes);
vrai('planObligationLever existe (une seule définition)', APP.split('function planObligationLever(').length - 1 === 1);

for (const nom of ['Multi', 'Semaine', 'Jour', 'Case']) {
  console.log('— ' + nom);
  // 1. posée chez Sophie (congé le 16), puis déplacée chez Karim le 15 (aucun congé)
  { const { W, S } = monter(); S.db.interventions.push(carte()); S.db.absences.push(CONGE('T2', '2026-10-16'));
    DEPOTS(W, evt('i1'), '2026-10-16', 'T2')[nom]();
    const i = S.db.interventions[0];
    vrai(nom + ' : (témoin) la trace est posée après confirmation de l\'obligation', !!(i.obligation && i.obligation.par), i.obligation);
    S.toasts.length = 0;
    DEPOTS(W, evt('i1'), '2026-10-15', 'T1')[nom]();
    vrai(nom + ' : déplacée chez Karim (aucun congé) → i.obligation retirée', i.techId === 'T1' && i.date === '2026-10-15' && i.obligation === undefined, [i.techId, i.date, i.obligation]);
    vrai(nom + ' : le toast ne dit plus « malgré congé »', !S.toasts.some(t => /malgré congé/.test(t)), S.toasts); }
  // 2. déplacée vers une autre place encore en congé : la trace reste (et se réécrit)
  { const { W, S } = monter(); S.db.interventions.push(carte()); S.db.absences.push(CONGE('T2', '2026-10-16'), CONGE('T3', '2026-10-17'));
    DEPOTS(W, evt('i1'), '2026-10-16', 'T2')[nom]();
    DEPOTS(W, evt('i1'), '2026-10-17', 'T3')[nom]();
    const i = S.db.interventions[0];
    vrai(nom + ' : déplacée vers une autre place encore en congé → la trace reste', i.techId === 'T3' && !!(i.obligation && i.obligation.par), [i.techId, i.obligation]); }
  // 3. refus (pas de droit d'obliger) : rien ne bouge, la trace d'avant n'est pas touchée
  { const { W, S } = monter(); S.db.interventions.push(carte({ obligation: { par: 'X', ts: 1 } })); S.db.absences.push(CONGE('T2', '2026-10-16'));
    S.peut.planifObligerTravail = false;
    DEPOTS(W, evt('i1'), '2026-10-16', 'T2')[nom]();
    vrai(nom + ' : un dépôt refusé ne touche pas à la trace', S.db.interventions[0].techId === 'T1' && !!S.db.interventions[0].obligation, S.db.interventions[0]); }
}

console.log('— planAbsGate seule (les autres appelants : « Déplacer… », changer de technicien, passage manuel)');
{ const { W, S } = monter(); S.db.absences.push(CONGE('T2', '2026-10-16'));
  const i = carte({ obligation: { par: 'Justine Admin', ts: 1 } });
  vrai('place sans congé : la porte laisse passer', W.planAbsGate('T1', '2026-10-15', i) === true);
  vrai('place sans congé : la trace est retirée', i.obligation === undefined, i.obligation);
  const j = carte({ obligation: { par: 'Justine Admin', ts: 1 } });
  vrai('non assignée (aucune personne) : la porte laisse passer', W.planAbsGate('', '2026-10-16', j) === true);
  vrai('non assignée : la trace est retirée (personne n\'est en congé)', j.obligation === undefined, j.obligation);
  const k = carte();
  vrai('sans trace, rien à retirer, aucune clé créée', W.planAbsGate('T1', '2026-10-15', k) === true && !('obligation' in k), Object.keys(k));
  vrai('sans intervention (duplication) : pas d\'exception', W.planAbsGate('T1', '2026-10-15', null) === true);
  const m = carte({ obligation: { par: 'Justine Admin', ts: 1 } });
  vrai('place EN congé : la trace est réécrite par la confirmation', W.planAbsGate('T2', '2026-10-16', m) === true && m.obligation.ts !== 1, m.obligation); }

console.log('— le formulaire (saveIntervention) lit la même règle');
{ const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const d = SRC.indexOf('function saveIntervention(e,id)'); const f = d < 0 ? '' : SRC.slice(d, d + 14000);
  vrai('saveIntervention est trouvée', d > 0);
  vrai('elle retire la trace de la fiche fusionnée quand l\'obligation n\'est pas appliquée', /if\(!_forceAbs&&_m\.obligation&&!absentOn\(.*?\)\) delete _m\.obligation/.test(f), f.length); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
