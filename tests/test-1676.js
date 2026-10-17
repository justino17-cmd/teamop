/* ══ OP GESTION — LA CASE « EFFECTUÉ ? » ET LE COMPTE-RENDU CLÔTURENT AU JOUR RÉEL COMME LE MENU DE STATUT (campagne 2, 17 octobre 2026) ══════════
   Relecture du lot c2-dates-terminee : le lot annonçait QUATRE autres portes qui recalent l'intervention au jour réel (`intRecaleAuJourFait`) ;
   il n'y en avait que DEUX (le menu de statut, l'assistant de clôture). La case « Effectué ? » (`intEffToggle`) et le compte-rendu
   « Intervention effectuée » (`saveRapport`) posaient « terminée » et `finReel` mais laissaient l'intervention au jour PRÉVU du planning — alors que
   leur propre RETOUR (case décochée, `intRepasseNonTerminee`) rendait déjà la date : l'aller-retour n'était pas symétrique, et la même intervention
   n'atterrissait pas au même jour selon la porte. La règle est celle de `intRecaleAuJourFait` (« VOULU », rapport interventions#4) — pas une décision neuve.
   ⛔ « Terminer à la date prévue » (`intTerminerPrevu`) n'a RIEN à recaler : il pose la fin réelle sur le jour prévu lui-même. Ce banc le garde.
   ⛔ Ce banc EXÉCUTE les vraies saveRapport, intEffToggle, intSetStatutDo, intTerminerPrevu, intRecaleAuJourFait, intRepasseNonTerminee (g05-monde),
   et compare chaque porte au menu de statut sur la MÊME fiche. Le recalage ne joue qu'à l'ALLER : une fiche déjà terminée qu'on rouvre n'est pas redéplacée. ══════════════════════════ */
'use strict';
const G = require('./g05-monde.js');
const { monde, interv, cadre } = G;
const { vrai, v, fin } = cadre('test-1676');
const aujourdhui = new Date().toLocaleDateString('sv-SE');
const PASSE = '2026-10-10';
const rapport = (W, effectuee) => W.saveRapport({ preventDefault() {}, target: { effectuee: { checked: effectuee }, __data: { montant: '', moyenPaiement: '', infestation: '—', conformite: '—', recommandations: '' } } }, 'i1');
const mondeAvec = inter => { const W = monde({}); W.db.interventions = [inter]; W.exec('var __cloture=[]; clotureSuiteModal=function(id,askNext,msg){ __cloture.push(msg); };'); return W; };
const m = x => ({ statut: x.statut, date: x.date, datePrevue: x.datePrevue, dateRecale: x.dateRecale, fin: typeof x.finReel, duree: x.dureeReelle, recale: (x.histo || []).filter(h => /Faite le/.test(h.txt)).length });

console.log('\n── 1676 · 1. la population ──');
vrai('saveRapport, intEffToggle, intTerminerPrevu, intSetStatutDo, intRecaleAuJourFait : trouvées, une seule définition chacune',
  ['saveRapport', 'intEffToggle', 'intTerminerPrevu', 'intSetStatutDo', 'intRecaleAuJourFait'].every(n => G.fonction(n).length > 80 && G.SRC.split('function ' + n + '(').length === 2));

console.log('\n── 1676 · 2. la case « Effectué ? » : la même fiche, deux portes, le même résultat ──');
{ const A = mondeAvec(interv({ date: PASSE, debutReel: Date.now() - 1800000 })); A.exec("intEffToggle('i1',true)"); const a = A.db.interventions[0];
  const B = mondeAvec(interv({ date: PASSE, debutReel: Date.now() - 1800000 })); B.exec("intSetStatutDo('i1','terminee')"); const b = B.db.interventions[0];
  v('⛔ la case et le menu de statut : même statut, même date, même date prévue, même durée, même trace', m(a), m(b));
  v('   elle rejoint le jour réel et garde la date prévue en mémoire', [a.date, a.datePrevue], [aujourdhui, PASSE]);
  vrai('   le toast le dit', A.__toasts.some(t => /déplacée du/.test(t)), A.__toasts); }
{ const W = mondeAvec(interv({ date: PASSE, finReel: new Date('2026-10-12T10:00:00').getTime() })); W.exec("intEffToggle('i1',true)"); const i = W.db.interventions[0];
  v('une fin réelle DÉJÀ posée (chrono arrêté un autre jour) décide du jour, pas « maintenant »', [i.date, i.datePrevue], ['2026-10-12', PASSE]); }
{ const W = mondeAvec(interv({ date: aujourdhui })); W.exec("intEffToggle('i1',true)"); const i = W.db.interventions[0];
  vrai('faite le jour prévu : rien n\'est déplacé', i.date === aujourdhui && i.datePrevue === undefined && typeof i.finReel === 'number', [i.date, i.datePrevue]); }
{ const W = mondeAvec(interv({ date: PASSE })); W.exec("intEffToggle('i1',true)"); const n1 = W.db.interventions[0].histo.length; const d1 = W.db.interventions[0].date;
  W.exec("intEffToggle('i1',false)"); const i = W.db.interventions[0];
  v('⛔ l\'aller-retour est symétrique : décochée, la date prévue revient et la fin réelle part', [i.date, i.finReel, i.datePrevue, d1], [PASSE, undefined, undefined, aujourdhui]); }

console.log('\n── 1676 · 3. le compte-rendu « Intervention effectuée » ──');
{ const A = mondeAvec(interv({ date: PASSE, debutReel: Date.now() - 1800000 })); rapport(A, true); const a = A.db.interventions[0];
  const B = mondeAvec(interv({ date: PASSE, debutReel: Date.now() - 1800000 })); B.exec("intSetStatutDo('i1','terminee')"); const b = B.db.interventions[0];
  v('⛔ le compte-rendu et le menu de statut : même statut, même date, même date prévue, même trace', [m(a).statut, m(a).date, m(a).datePrevue, m(a).dateRecale, m(a).recale], [m(b).statut, m(b).date, m(b).datePrevue, m(b).dateRecale, m(b).recale]);
  vrai('   la fin réelle est posée', typeof a.finReel === 'number', a.finReel);
  vrai('   le message de clôture (clotureSuiteModal) dit le déplacement', A.__cloture.some(t => /faite le/.test(t) && /prévue le/.test(t)), A.__cloture); }
{ const W = mondeAvec(interv({ date: PASSE })); rapport(W, true); rapport(W, false); const i = W.db.interventions[0];
  v('⛔ cochée puis décochée : la date prévue revient, plus de fin réelle', [i.date, i.finReel, i.datePrevue], [PASSE, undefined, undefined]); }
{ const fin0 = Date.now() - 86400000 * 3; const W = mondeAvec(interv({ statut: 'terminee', date: '2026-10-14', datePrevue: PASSE, dateRecale: '2026-10-14', finReel: fin0 }));
  rapport(W, true); const i = W.db.interventions[0];
  v('⛔ rouvrir le compte-rendu d\'une fiche DÉJÀ terminée ne la redéplace pas (le recalage ne joue qu\'à l\'aller)', [i.date, i.datePrevue], ['2026-10-14', PASSE]);
  vrai('   ni ne rejoue la trace', (i.histo || []).filter(h => /Faite le/.test(h.txt)).length === 0, i.histo); }
{ const W = mondeAvec(interv({ date: PASSE })); rapport(W, false); const i = W.db.interventions[0];
  v('un compte-rendu NON effectué ne déplace rien', [i.date, i.datePrevue, i.statut], [PASSE, undefined, 'planifiee']); }

console.log('\n── 1676 · 4. « Terminer à la date prévue » : rien à recaler, et on le garde ──');
{ const W = mondeAvec(interv({ date: PASSE, heure: '09:00', duree: 60 })); W.exec("intTerminerPrevu('i1')"); const i = W.db.interventions[0];
  v('la fin réelle tombe sur le jour prévu : la date reste, aucune date prévue n\'est inventée', [i.date, i.datePrevue, i.statut], [PASSE, undefined, 'terminee']); }
{ const c = G.fonction('intTerminerPrevu');
  vrai('⛔ intTerminerPrevu n\'appelle PAS intRecaleAuJourFait (une fin au-delà de minuit déplacerait au lendemain une intervention faite à la date prévue)', !/intRecaleAuJourFait\(/.test(c)); }

console.log('\n── 1676 · 5. la règle dans le code ──');
{ for (const n of ['intEffToggle', 'saveRapport']) { const c = G.fonction(n);
    vrai('⛔ ' + n + ' appelle intRecaleAuJourFait (la fonction commune, pas une copie)', /intRecaleAuJourFait\(/.test(c));
    vrai('   et seulement à l\'ALLER (garde sur l\'ancien statut)', /ancien(Statut)?\s*!==\s*'terminee'/.test(c)); }
  vrai('une SEULE fonction pose le recalage : aucune copie du calcul « fait = finReel » ailleurs', (G.SRC.match(/i\.dateRecale\s*=/g) || []).length === 1, (G.SRC.match(/i\.dateRecale\s*=/g) || []).length); }
fin();
