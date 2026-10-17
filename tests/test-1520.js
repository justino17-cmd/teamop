/* ══ PLANNING — UNE INTERVENTION DÉPLACÉE VERS UNE PLACE SANS CONGÉ PERD LA TRACE « PLACÉE MALGRÉ UN CONGÉ » ══
   Lot i03 (17 octobre 2026), bug r3#0. `i.obligation={par,ts}` était posée par planAbsGate quand on
   confirmait l'obligation de travailler… et n'était JAMAIS retirée : la carte déplacée ensuite chez
   Karim (aucun congé) affichait encore « Placée malgré un congé par Justine Admin » au survol (plHovHtml),
   et le badge « congé » sur la carte. Le correctif de planning#4 n'avait réparé que `_oblig` (le Journal).
   La trace se retire AU GESTE de déplacement, une fois celui-ci ACQUIS (planObligationLever, appelée par
   chaque dépôt, « Déplacer… » et le changement de technicien juste avant leur save()) — jamais au chargement
   et jamais à la porte : planAbsGate ne fait que demander la permission, et « Annuler » ou un refus de
   chevauchement qui suivent doivent retrouver la trace d'avant (relecture du lot i03). Une place ENCORE en congé la garde.
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
  'function planMultiDrop(', 'function planWeekDrop(', 'function planDropTime(', 'function planDropCell(',
  'function planTechsOf(', 'function toMinH(', 'function planDeplacerValider(', 'function planDeplacerAnnuler(', 'function planChangerTech(', 'function planChangerTechAnnuler(',
  'function techAssignable(', 'function techPeutRecevoir(', 'function techRefusDesactive(', 'function planAffecteGate('];   // 17 oct. 2026 : les gestes d'affectation refusent un compte désactivé (règle jouée par test-1820)
const manquantes = FN.filter(h => APP.indexOf(h) < 0 && h !== 'function planObligationLever(');
const code = FN.filter(h => APP.indexOf(h) >= 0).map(decoupe).join('\n');

function monter() {
  const S = { toasts: [], saves: [], dialogues: [], reponse: true, reponseChev: true, peut: { planifDeplacer: true, planifObligerTravail: true, ajouter: true }, planSel: '2026-10-16' };
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
  W.confirm = m => { S.dialogues.push(m); return /assigner quand m/.test(m) ? S.reponseChev : S.reponse; };   // deux questions : l'obligation (reponse) et le chevauchement (reponseChev)
  W.fullName = u => u.prenom + ' ' + u.nom;
  W.techName = id => ({ T1: 'Karim Benali', T2: 'Sophie Martin', T3: 'Léa Roux' })[id] || '';
  W.fmtShort = iso => { const [, m, j] = iso.split('-'); return String(+j) + ' ' + ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'][+m - 1]; };
  W.ABS_TYPES = { conge: 'congé' };
  W.absValidee = a => a.statut === 'validee';
  W.uid = (() => { let n = 0; return () => 'n' + (++n); })();
  W.save = () => { S.saves.push(1); };
  W.serieShiftPropose = () => {};
  W.TECH_INACTIF_LBL = 'compte désactivé'; if (!W.db.users) W.db.users = [];
  W.intConflictOf = () => null;
  Object.defineProperty(W, 'planSel', { get: () => S.planSel, set: v => { S.planSel = v; }, enumerable: true });
  W.planJours = ['2026-10-16'];
  vm.createContext(W);
  W.db.techniciens = [{ id: 'T1' }, { id: 'T2' }, { id: 'T3' }];
  W.closeModal = () => {}; W.planMode = 'semaine';
  W.toastAnnuler = (m, a) => { S.annuler = { m, a }; };
  vm.runInContext(code + '\nvar DEP={id:"",tech:"",date:"",heure:"",depuis:""};', W);
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

console.log('— planAbsGate ne retire plus rien (elle demande la permission) ; planObligationLever retire, sur la place FINALE');
{ const { W, S } = monter(); S.db.absences.push(CONGE('T2', '2026-10-16'));
  const i = carte({ obligation: { par: 'Justine Admin', ts: 1 } });
  vrai('place sans congé : la porte laisse passer', W.planAbsGate('T1', '2026-10-15', i) === true);
  vrai('la porte ne touche PAS à la trace (le geste n\'est pas encore acquis)', !!i.obligation && i.obligation.ts === 1, i.obligation);
  vrai('place sans congé : planObligationLever retire la trace', W.planObligationLever(i) === true && i.obligation === undefined, i.obligation);
  const j = carte({ obligation: { par: 'Justine Admin', ts: 1 }, techId: '', techIds: [] });
  vrai('non assignée (personne n\'est en congé) : planObligationLever retire la trace', W.planObligationLever(j) === true && j.obligation === undefined, j.obligation);
  const k = carte();
  vrai('sans trace, rien à retirer, aucune clé créée', W.planAbsGate('T1', '2026-10-15', k) === true && W.planObligationLever(k) === false && !('obligation' in k), Object.keys(k));
  vrai('sans intervention (duplication) : pas d\'exception', W.planAbsGate('T1', '2026-10-15', null) === true && W.planObligationLever(null) === false);
  const m = carte({ date: '2026-10-16', techId: 'T2', techIds: ['T2'], obligation: { par: 'Justine Admin', ts: 1 } });
  vrai('place EN congé : planObligationLever garde la trace', W.planObligationLever(m) === false && !!m.obligation, m.obligation);
  const m2 = carte({ date: '2026-10-16', techId: 'T2', techIds: ['T2'] });
  vrai('place EN congé : la confirmation écrit la trace', W.planAbsGate('T2', '2026-10-16', m2) === true && m2.obligation.ts !== 1 && !!m2.obligation.par, m2.obligation);
  const eq = carte({ date: '2026-10-16', techId: 'T1', techIds: ['T1', 'T2'], obligation: { par: 'X', ts: 1 } });
  vrai('équipe dont un membre est en congé : la trace reste', W.planObligationLever(eq) === false && !!eq.obligation, eq.obligation); }

// « Déplacer… » (modale) et « Annuler » : la trace d'avant revient
function deplacer(W, S, i, tech, date) { vm.runInContext('DEP=' + JSON.stringify({ id: i.id, tech, date, heure: i.heure, depuis: '' }), W); W.planDeplacerValider(); }
console.log('— « Déplacer… » puis « Annuler » : la trace revient avec la place');
{ const { W, S } = monter(); S.db.interventions.push(carte()); S.db.absences.push(CONGE('T2', '2026-10-16'));
  const i = S.db.interventions[0];
  deplacer(W, S, i, 'T2', '2026-10-16');
  vrai('(témoin) posée de force chez Sophie : trace écrite', !!(i.obligation && i.obligation.par), i.obligation);
  vrai('« Annuler » après un déplacement vers un congé : la place d\'avant revient et la trace de ce geste part', (W.planDeplacerAnnuler(), i.techId === 'T1' && i.date === '2026-10-15' && i.obligation === undefined), [i.techId, i.date, i.obligation]); }
{ const { W, S } = monter(); const t0 = { par: 'Justine Admin', ts: 42 }; S.db.interventions.push(carte({ date: '2026-10-16', techId: 'T2', techIds: ['T2'], obligation: t0 })); S.db.absences.push(CONGE('T2', '2026-10-16'));
  const i = S.db.interventions[0];
  deplacer(W, S, i, 'T1', '2026-10-15');
  vrai('déplacée chez Karim (sans congé) : trace retirée', i.techId === 'T1' && i.obligation === undefined, [i.techId, i.obligation]);
  W.planDeplacerAnnuler();
  vrai('« Annuler » : l\'intervention est de nouveau chez Sophie EN congé ET la trace « malgré un congé » est revenue', i.techId === 'T2' && i.date === '2026-10-16' && !!i.obligation && i.obligation.ts === 42 && i.obligation.par === 'Justine Admin', [i.techId, i.date, i.obligation]); }
{ const { W, S } = monter(); S.db.interventions.push(carte({ date: '2026-10-16', techId: 'T2', techIds: ['T2'], obligation: { par: 'J', ts: 7 } })); S.db.absences.push(CONGE('T2', '2026-10-16'));
  const i = S.db.interventions[0];
  S.peut.planifObligerTravail = true; S.reponse = false;
  deplacer(W, S, i, 'T2', '2026-10-16');   // même place en congé, aucun changement : la trace reste
  vrai('« Déplacer… » vers une place encore en congé (confirmation) : la trace reste', i.techId === 'T2' && !!i.obligation, i.obligation); }

console.log('— changer de technicien (planChangerTech) : refus de chevauchement et « Annuler »');
{ const { W, S } = monter(); const t0 = { par: 'Justine Admin', ts: 42 };
  S.db.interventions.push(carte({ date: '2026-10-16', techId: 'T2', techIds: ['T2'], obligation: t0 }), { id: 'i2', titre: 'Autre', date: '2026-10-16', heure: '09:30', duree: 60, techId: 'T1', techIds: ['T1'], statut: 'planifiee', histo: [] });
  S.db.absences.push(CONGE('T2', '2026-10-16'));
  const i = S.db.interventions[0];
  S.reponseChev = false;   // « L'assigner quand même ? » refusé
  W.planChangerTech('i1', 'T1');
  vrai('chevauchement refusé : l\'intervention n\'a pas bougé', i.techId === 'T2', i.techId);
  vrai('chevauchement refusé : la trace « malgré un congé » est INTACTE (elle n\'a pas été levée à la porte)', !!i.obligation && i.obligation.ts === 42, i.obligation);
  S.reponseChev = true;
  W.planChangerTech('i1', 'T1');
  vrai('chevauchement accepté : chez Karim, trace retirée', i.techId === 'T1' && i.obligation === undefined, [i.techId, i.obligation]);
  W.planChangerTechAnnuler();
  vrai('« Annuler » : de nouveau chez Sophie en congé, la trace est revenue', i.techId === 'T2' && !!i.obligation && i.obligation.ts === 42, [i.techId, i.obligation]); }
{ const { W, S } = monter(); S.db.interventions.push(carte()); S.db.absences.push(CONGE('T2', '2026-10-15'));
  const i = S.db.interventions[0]; S.db.interventions.push({ id: 'i2', titre: 'Autre', date: '2026-10-15', heure: '09:30', duree: 60, techId: 'T2', techIds: ['T2'], statut: 'planifiee', histo: [] });
  S.reponseChev = false;   // l'obligation de travailler (reponse) est acceptée, le chevauchement refusé
  W.planChangerTech('i1', 'T2');
  vrai('chevauchement refusé AVANT la porte du congé : aucune obligation ni ligne de journal n\'est écrite sur une carte qui n\'a pas bougé', i.techId === 'T1' && i.obligation === undefined && !(i.histo || []).some(h => /Obligation/.test(JSON.stringify(h))), [i.techId, i.obligation, i.histo]); }

console.log('— le formulaire (saveIntervention) lit la même règle');
{ const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const d = SRC.indexOf('function saveIntervention(e,id)'); const f = d < 0 ? '' : SRC.slice(d, d + 14000);
  vrai('saveIntervention est trouvée', d > 0);
  vrai('elle retire la trace de la fiche fusionnée quand l\'obligation n\'est pas appliquée', /if\(!_forceAbs&&_m\.obligation&&!absentOn\(.*?\)\) delete _m\.obligation/.test(f), f.length); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
