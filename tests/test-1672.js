/* ══ INTERVENTIONS — DÉPOSER UNE LIGNE SUR UN JOUR RESPECTE LE CONGÉ VALIDÉ, COMME LE PLANNING (campagne 2, lot c2-planning-doigt) ═
   La puce de jour des Interventions (intDropDay) déplaçait la ligne sans aucun contrôle : une intervention déposée sur
   un jour où son technicien est en congé VALIDÉ partait quand même, sans refus, sans la confirmation « obligation de
   travailler », sans la trace « Placée malgré un congé », et sans ligne au journal du planning (qui a déplacé quoi).
   Les trois autres dépôts de jour (planDropDay du Mois et de la Semaine en liste, planDropTech) passent par
   planAbsGate, planStamp et planObligationLever — c'est la règle de ce fichier : « le journal DOIT précéder save(), et
   _oblig DOIT être retiré après planStamp » (voir planDepotApres). Au doigt comme à la souris : c'est la MÊME fonction.

   Ce banc EXÉCUTE la vraie intDropDay et ses vrais contrôles dans un bac à sable, par le geste de la souris (l'appel
   direct de l'ondrop), puis par le doigt (le vrai bloc tactile).                                                   */
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
const NOMS = ['planSnap', 'planStamp', 'absentOn', 'absStatut', 'absValidee', 'planAbsGate', 'planObligationLever', 'intTechIds', 'intDropDay'];
const FONC = {}; NOMS.forEach(n => { FONC[n] = bloc('function ' + n + '('); });
vrai('les fonctions réelles sont trouvées', NOMS.every(n => FONC[n].length > 40), NOMS.filter(n => FONC[n].length <= 40));
vrai('⛔ une seule définition de intDropDay', SRC.split('function intDropDay(').length === 2);

function monter(opts) {
  const O = Object.assign({ peut: true, confirmer: true, oblig: true, absence: { id: 'a1', techId: 'T1', du: '2026-10-19', au: '2026-10-19', type: 'conges', statut: 'validee' } }, opts || {});
  const S = { toasts: [], saves: 0, confirms: [], vues: [], histo: [] };
  const db = { interventions: [{ id: 'i1', titre: 'Dératisation', date: '2026-10-16', heure: '10:00', duree: 60, techId: 'T1', techIds: ['T1'], statut: 'planifiee', histo: [] }],
    absences: O.absence ? [O.absence] : [], planJournal: [] };
  const W = { console, Object, Math, JSON, Set, parseInt, Date, isNaN, String, Number, Array, db, currentUser: { id: 'u1' }, fullName: () => 'Justine Admin',
    canPlan: () => O.peut, can: c => c === 'planifObligerTravail' ? O.oblig : true, toast: m => S.toasts.push(String(m)), save() { S.saves++; },
    intHisto: (i, m) => { S.histo.push(m); i.histo.push(m); }, views: { interventions() { S.vues.push('interventions'); } },
    fmtShort: iso => iso, techName: id => ({ T1: 'Karim', T2: 'Sofia' })[id] || id, ABS_TYPES: { conges: 'congés' },
    confirm: m => { S.confirms.push(m); return O.confirmer; } };
  vm.createContext(W);
  vm.runInContext('var intSelDay="2026-10-16";', W);
  vm.runInContext(NOMS.map(n => FONC[n]).join('\n'), W);
  const depose = (iso) => W.intDropDay({ preventDefault() {}, dataTransfer: { getData: () => 'i1' } }, iso);
  return { W, S, db, i1: () => db.interventions[0], depose };
}

console.log('— 1. à la souris : un congé validé sur le jour visé');
{ const m = monter({ confirmer: false });
  m.depose('2026-10-19');
  vrai('confirmation REFUSÉE : la confirmation « obligation de travailler » est posée et la ligne ne bouge pas', m.S.confirms.length === 1 && /obligation/i.test(m.S.confirms[0]) && m.i1().date === '2026-10-16' && m.S.saves === 0, [m.S.confirms, m.i1().date, m.S.saves]); }
{ const m = monter({ confirmer: true });
  m.depose('2026-10-19');
  vrai('confirmation ACCEPTÉE : déposée, avec la trace « Placée malgré un congé » et l\'historique', m.i1().date === '2026-10-19' && !!m.i1().obligation && m.i1().histo.some(h => /Obligation de travailler/.test(h)), [m.i1().date, m.i1().obligation, m.i1().histo]);
  vrai('…enregistrée une fois, la vue redessinée, le geste le dit', m.S.saves === 1 && m.S.vues.length === 1 && m.S.toasts.some(t => /déplacée/i.test(t)), [m.S.saves, m.S.vues, m.S.toasts]);
  vrai('…le journal du planning dit qui a déplacé quoi, avec l\'obligation', m.db.planJournal.length === 1 && m.db.planJournal[0].vers.date === '2026-10-19' && /obligation/.test(m.db.planJournal[0].oblig), m.db.planJournal);
  vrai('…et le drapeau transitoire _oblig est retiré après le journal (sinon chaque entrée suivante l\'affirmerait)', m.i1()._oblig === undefined, m.i1()._oblig); }
{ const m = monter({ oblig: false });
  m.depose('2026-10-19');
  vrai('sans le droit « Obliger à travailler » : refus net, aucune confirmation, rien ne bouge', m.i1().date === '2026-10-16' && m.S.confirms.length === 0 && m.S.toasts.some(t => /Impossible/.test(t)) && m.S.saves === 0, [m.i1().date, m.S.confirms, m.S.toasts]); }
{ const m = monter({ absence: Object.assign({ id: 'a2', techId: 'T1', du: '2026-10-19', au: '2026-10-19', type: 'conges' }, { statut: 'attente' }) });
  m.depose('2026-10-19');
  vrai('une demande de congé encore EN ATTENTE ne bloque pas', m.i1().date === '2026-10-19' && m.S.confirms.length === 0, [m.i1().date, m.S.confirms]); }
{ const m = monter({ absence: { id: 'a3', techId: 'T2', du: '2026-10-19', au: '2026-10-19', type: 'conges', statut: 'validee' } });
  m.depose('2026-10-19');
  vrai('le congé d\'un AUTRE technicien ne concerne pas cette ligne', m.i1().date === '2026-10-19' && m.S.confirms.length === 0); }

console.log('— 2. sans congé : le journal du planning garde la trace, comme les autres dépôts de jour');
{ const m = monter({ absence: null });
  m.depose('2026-10-20');
  vrai('la ligne change de jour', m.i1().date === '2026-10-20' && m.W.intSelDay === '2026-10-20', [m.i1().date, m.W.intSelDay]);
  vrai('…avec une entrée au journal du planning (de → vers) et planBy', m.db.planJournal.length === 1 && m.db.planJournal[0].de.date === '2026-10-16' && m.db.planJournal[0].vers.date === '2026-10-20' && !!m.i1().planBy, [m.db.planJournal, m.i1().planBy]);
  vrai('…enregistrée une fois', m.S.saves === 1, m.S.saves);
  m.depose('2026-10-20');
  vrai('déposée sur son propre jour : rien ne change, rien n\'est enregistré de plus', m.S.saves === 1 && m.db.planJournal.length === 1); }
{ const m = monter({ absence: null, peut: false });
  m.depose('2026-10-20');
  vrai('sans le droit « Déplacer le planning » : refusée, rien ne bouge', m.i1().date === '2026-10-16' && m.S.saves === 0 && m.S.toasts.length === 1, [m.i1().date, m.S.toasts]); }

console.log('— 3. recensement du fichier');
{ const f = FONC.intDropDay;
  const iCan = f.indexOf('canPlan()'), iGate = f.indexOf('planAbsGate('), iDate = f.indexOf('i.date=iso'), iStamp = f.indexOf('planStamp('), iSave = f.indexOf('save()');
  vrai('intDropDay : le droit d\'abord, puis le congé, puis l\'écriture de la date, puis le journal, puis save()', iCan >= 0 && iCan < iGate && iGate < iDate && iDate < iStamp && iStamp < iSave, [iCan, iGate, iDate, iStamp, iSave]);
  vrai('…et la trace d\'obligation est levée AVANT save() (planObligationLever)', f.indexOf('planObligationLever(') > iStamp && f.indexOf('planObligationLever(') < iSave); }

console.log('\n════ test-1672 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
