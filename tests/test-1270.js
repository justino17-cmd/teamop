/* ══ PLANNING — LES QUATRE DÉPÔTS (Multi, Semaine, Jour, case) FONT LE MÊME ENCHAÎNEMENT ═══════
   Lot g12 des tests d'application (16 octobre 2026). Les quatre fonctions de dépôt de carte avaient
   DIVERGÉ, et la vue par défaut (Multi) cumulait cinq défauts que les trois autres n'avaient pas :
     planning#0  planMultiDrop appelait planAbsGate(i,iso,techId) — arguments inversés, le contrôle
                 d'absence ne trouvait jamais rien : un dépôt chez une personne en congé passait ;
     planning#1  elle ne lisait pas e.altKey : « Alt + glisser = dupliquer » déplaçait l'original ;
     planning#2  elle n'appelait jamais indispoAt : un créneau d'indisponibilité ne refusait rien ;
     planning#3  save() AVANT planStamp(i,…) : planJournal/planBy écrits après la sauvegarde, donc
                 perdus au rechargement (ce banc relève ce que `save` voit, pas l'état final) ;
     planning#4  planWeekDrop ne retirait jamais i._oblig : toutes les entrées suivantes du Journal
                 affirmaient « obligation de travailler appliquée » (piste fausse, à portée RH) ;
                 et la confirmation disait « le 17 oct.. Appliquer » (fmtShort finit déjà par « . »).
   Plutôt que de corriger quatre copies, l'enchaînement est UN (planDepotAvant / planDepotApres) :
   ce banc joue donc la MÊME série de contrôles sur les QUATRE fonctions réelles, extraites d'app.html. */
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
const manquantes = FN.filter(h => APP.indexOf(h) < 0);
// planDepotAvant/Apres n'existent pas dans le code AVANT correctif : le banc doit alors TOMBER, pas mourir.
const code = FN.filter(h => APP.indexOf(h) >= 0).map(decoupe).join('\n');

function monter() {
  const S = { toasts: [], saves: [], dialogues: [], reponse: true, peut: { planifDeplacer: true, planifObligerTravail: true, ajouter: true }, planSel: '2026-10-16' };
  S.db = { interventions: [], absences: [], indispos: [], planJournal: [], techniciens: [{ id: 'T1' }, { id: 'T2' }, { id: 'T3' }] };
  S.currentUser = { id: 'u', prenom: 'Justine', nom: 'Admin', role: 'admin' };
  const W = { console, Object, JSON, String, Math, Date, Array, Number, parseInt, S,
    window: { _planGrabDy: 0, _planDragDe: null }, views: { planning() { S.vuesRedessinees = (S.vuesRedessinees || 0) + 1; } } };
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
  W.save = () => { S.saves.push({ journal: S.db.planJournal.length, planBy: S.db.interventions.map(i => !!i.planBy), obl: S.db.interventions.map(i => !!i._oblig) }); };
  W.serieShiftPropose = () => {};
  W.intConflictOf = () => null;
  Object.defineProperty(W, 'planSel', { get: () => S.planSel, set: v => { S.planSel = v; }, enumerable: true });
  W.planJours = ['2026-10-16'];
  vm.createContext(W);
  vm.runInContext(code, W);
  return { W, S };
}
function carte(extra) { return Object.assign({ id: 'i1', titre: 'Nid de frelons', date: '2026-10-15', heure: '09:00', duree: 60, techId: 'T1', techIds: ['T1'], statut: 'planifiee', histo: [] }, extra || {}); }
function evt(id, alt, y) { return { preventDefault() {}, dataTransfer: { getData: () => id }, altKey: !!alt, clientY: y == null ? 100 : y, currentTarget: { getBoundingClientRect: () => ({ top: 0 }) } }; }

console.log('— les fonctions du code réel');
vrai('planDepotAvant et planDepotApres existent (l\'enchaînement commun)', manquantes.length === 0, manquantes);

// Les quatre dépôts : même signature d'appel de test. y=100 px, PPH 48 → 8 h + 125 min ≈ 10:05.
const DEPOTS = {
  Multi: (W, e) => W.planMultiDrop(e, '2026-10-16', 'T2', 8, 48),
  Semaine: (W, e) => W.planWeekDrop(e, '2026-10-16', 'T2', 8, 48),
  Jour: (W, e) => { W.planSel = '2026-10-16'; W.planDropTime(e, 'T2', 8, 48); },
  Case: (W, e) => W.planDropCell(e, '2026-10-16', 'T2')
};
// Dépôt « Case » : pas d'heure (jour + personne seulement), donc pas de contrôle d'indisponibilité.
for (const [nom, depot] of Object.entries(DEPOTS)) {
  console.log('— ' + nom);
  // planning#0 : absence validée, sans droit d'obliger → refus net, rien ne bouge
  { const { W, S } = monter();
    S.db.interventions.push(carte()); S.db.absences.push({ techId: 'T2', du: '2026-10-16', au: '2026-10-16', statut: 'validee', type: 'conge' });
    S.peut.planifObligerTravail = false;
    depot(W, evt('i1'));
    const i = S.db.interventions[0];
    vrai(nom + ' : chez une personne en congé, sans le droit d\'obliger → refusé', i.techId === 'T1' && i.date === '2026-10-15', [i.techId, i.date]);
    vrai(nom + ' : le refus le dit', S.toasts.some(t => /Impossible/.test(t)), S.toasts); }
  // planning#0 bis : avec le droit, la confirmation est posée ; refusée → rien ne bouge
  { const { W, S } = monter(); S.db.interventions.push(carte()); S.db.absences.push({ techId: 'T2', du: '2026-10-16', au: '2026-10-16', statut: 'validee', type: 'conge' });
    S.reponse = false; depot(W, evt('i1'));
    vrai(nom + ' : confirmation de l\'obligation posée', S.dialogues.length === 1, S.dialogues);
    vrai(nom + ' : confirmation refusée → rien ne bouge', S.db.interventions[0].techId === 'T1', S.db.interventions[0].techId);
    vrai(nom + ' : le message de confirmation n\'a pas de double point', S.dialogues.length === 1 && !/\.\./.test(S.dialogues[0]), S.dialogues); }
  // obligation acceptée : journal, _oblig retiré (planning#4), journal écrit AVANT save (planning#3)
  { const { W, S } = monter(); S.db.interventions.push(carte()); S.db.absences.push({ techId: 'T2', du: '2026-10-16', au: '2026-10-16', statut: 'validee', type: 'conge' });
    S.reponse = true; depot(W, evt('i1'));
    const i = S.db.interventions[0];
    vrai(nom + ' : obligation acceptée → déplacé chez Sophie', i.techId === 'T2', i.techId);
    vrai(nom + ' : l\'obligation est tracée sur la fiche', !!(i.obligation && i.obligation.par), i.obligation);
    vrai(nom + ' : _oblig est retiré après usage (planning#4)', i._oblig === undefined, i._oblig);
    vrai(nom + ' : une entrée de journal, avec l\'obligation', S.db.planJournal.length === 1 && /obligation de travailler/.test(S.db.planJournal[0].oblig || ''), S.db.planJournal);
    vrai(nom + ' : le journal et planBy sont écrits AVANT la sauvegarde (planning#3)', S.saves.length > 0 && S.saves[S.saves.length - 1].journal === 1 && S.saves[S.saves.length - 1].planBy[0] === true, S.saves);
    // le déplacement SUIVANT (chez Karim, sans congé) n'hérite pas de l'obligation
    S.toasts.length = 0; S.reponse = true;
    const e2 = evt('i1');
    ({ Multi: () => W.planMultiDrop(e2, '2026-10-15', 'T1', 8, 48), Semaine: () => W.planWeekDrop(e2, '2026-10-15', 'T1', 8, 48), Jour: () => { W.planSel = '2026-10-15'; W.planDropTime(e2, 'T1', 8, 48); }, Case: () => W.planDropCell(e2, '2026-10-15', 'T1') })[nom]();
    const J = S.db.planJournal;
    vrai(nom + ' : la 2e entrée existe', J.length === 2, J.length);
    vrai(nom + ' : la 2e entrée n\'affirme PAS une obligation (planning#4)', J.length === 2 && J[1].oblig === '', J.map(x => x.oblig)); }
  // planning#1 : Alt + glisser = dupliquer, l'original ne bouge pas
  { const { W, S } = monter(); S.db.interventions.push(carte());
    depot(W, evt('i1', true));
    vrai(nom + ' : Alt + glisser crée une copie', S.db.interventions.length === 2, S.db.interventions.length);
    vrai(nom + ' : l\'original ne bouge pas', S.db.interventions[0].techId === 'T1' && S.db.interventions[0].date === '2026-10-15', S.db.interventions[0]);
    vrai(nom + ' : la copie est chez Sophie le 16', S.db.interventions[1] && S.db.interventions[1].techId === 'T2' && S.db.interventions[1].date === '2026-10-16', S.db.interventions[1]);
    vrai(nom + ' : toast « dupliquée »', S.toasts.some(t => /dupliqu/.test(t)), S.toasts); }
  // planning#1 bis : Alt + glisser sur une absence est contrôlé aussi
  { const { W, S } = monter(); S.db.interventions.push(carte()); S.db.absences.push({ techId: 'T2', du: '2026-10-16', au: '2026-10-16', statut: 'validee', type: 'conge' });
    S.peut.planifObligerTravail = false; depot(W, evt('i1', true));
    vrai(nom + ' : Alt + glisser chez une personne en congé → refusé, pas de copie', S.db.interventions.length === 1, S.db.interventions.length); }
  // planning#2 : indisponibilité (sauf la case de jour, qui n'a pas d'heure)
  if (nom !== 'Case') {
    const { W, S } = monter(); S.db.interventions.push(carte({ duree: 120 }));
    S.db.indispos.push({ techId: 'T2', date: '2026-10-16', debut: '09:00', fin: '18:00', motif: 'Garage' });
    depot(W, evt('i1'));
    vrai(nom + ' : dépôt sur un créneau d\'indisponibilité → refusé (planning#2)', S.db.interventions[0].techId === 'T1' && S.db.interventions[0].heure === '09:00', S.db.interventions[0]);
    vrai(nom + ' : le refus nomme l\'indisponibilité', S.toasts.some(t => /indisponible/.test(t)), S.toasts); }
  // droit « Déplacer le planning » : refus en première instruction
  { const { W, S } = monter(); S.db.interventions.push(carte()); S.peut.planifDeplacer = false; depot(W, evt('i1'));
    vrai(nom + ' : sans le droit de déplacer → rien ne bouge', S.db.interventions[0].techId === 'T1' && S.saves.length === 0, S.saves); }
  // dépôt ordinaire : déplacé, journalisé, sauvegardé une fois avec son journal
  { const { W, S } = monter(); S.db.interventions.push(carte()); depot(W, evt('i1'));
    const i = S.db.interventions[0];
    vrai(nom + ' : dépôt ordinaire → déplacé', i.techId === 'T2' && i.date === '2026-10-16', [i.techId, i.date]);
    vrai(nom + ' : journalisé avant la sauvegarde', S.saves.length >= 1 && S.saves[S.saves.length - 1].journal === 1, S.saves); }
}

console.log('\n════ test-1270 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
