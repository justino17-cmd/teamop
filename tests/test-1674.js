/* ══ OP GESTION — LE FORMULAIRE D'INTERVENTION PASSÉ À « TERMINÉE » CLÔTURE COMME LES AUTRES PORTES (campagne 2, 17 octobre 2026) ══════════
   `saveIntervention` laissait passer une fiche à « Terminée » sans `finReel` ni recalage au jour réel : l'intervention restait au jour prévu
   du planning, sans fin réelle (la fiche « Effectif » vide, la cloche « Travail terminé » muette), alors que le menu de statut et l'assistant
   de clôture posent l'une et font l'autre (`intRecaleAuJourFait`, UNE fonction). Le retour (« Terminée » → « Planifiée » par le même
   formulaire) rendait déjà la date : l'aller-retour n'était pas symétrique.
   ⛔ Ce banc EXÉCUTE les vraies `saveIntervention`, `intSetStatutDo`, `intRecaleAuJourFait`, `intRepasseNonTerminee` (bac à sable de g05-monde),
   et compare la porte du formulaire à celle du menu de statut sur la MÊME fiche.
   Une date changée dans le MÊME envoi est le choix explicite de la personne : le recalage ne la défait pas. ══════════════════════════ */
'use strict';
const G = require('./g05-monde.js');
const { monde, interv, cadre } = G;
const { vrai, v, fin } = cadre('test-1674');
const aujourdhui = new Date().toLocaleDateString('sv-SE');
const PASSE = '2026-10-10';
const BASE = { titre: 'Dératisation', clientId: 'cl1', date: PASSE, heure: '09:00', duree: '60', statut: 'planifiee' };
function envoyer(inter, data) {
  const W = monde({ db: { interventions: [inter], factures: [], registres: [], clients: [{ id: 'cl1', nom: 'Boulangerie Dupont', email: 'dupont@example.org' }], devis: [], users: [], techniciens: [] } });
  W.exec('var _saveInt=saveIntervention;');
  W.__e = { preventDefault() {}, target: { __data: Object.assign({}, BASE, data) } };
  W.exec("_saveInt(__e,'" + inter.id + "')");
  return W;
}

console.log('\n── 1674 · 1. la population ──');
vrai('saveIntervention, intSetStatutDo et intRecaleAuJourFait sont trouvées (une seule définition de chacune)',
  ['function saveIntervention(', 'function intSetStatutDo(', 'function intRecaleAuJourFait('].every(n => G.SRC.split(n).length === 2));

console.log('\n── 1674 · 2. planifiée → terminée par le formulaire, date inchangée ──');
{ const W = envoyer(interv({ date: PASSE, debutReel: Date.now() - 3600000 }), { statut: 'terminee' }); const i = W.db.interventions[0];
  vrai('⛔ la fin réelle est posée (nombre, maintenant)', typeof i.finReel === 'number' && Math.abs(i.finReel - Date.now()) < 5000, i.finReel);
  vrai('⛔ la durée réelle suit (début posé)', i.dureeReelle >= 59 && i.dureeReelle <= 61, i.dureeReelle);
  v('⛔ elle rejoint le planning du jour réel', i.date, aujourdhui);
  v('   la date prévue d\'origine reste en mémoire', i.datePrevue, PASSE);
  v('   la marque du déplacement est posée', i.dateRecale, aujourdhui);
  vrai('   l\'historique le dit', (i.histo || []).some(h => /Faite le/.test(h.txt)), i.histo);
  vrai('   le toast le dit', W.__toasts.some(t => /déplacée du/.test(t)), W.__toasts);
  v('   le statut est « terminee » et la fiche est sauvée une fois', [i.statut, W.__saves], ['terminee', 1]); }
{ const W = envoyer(interv({ date: aujourdhui }), { statut: 'terminee', date: aujourdhui }); const i = W.db.interventions[0];
  vrai('faite le jour prévu : fin réelle posée, rien n\'est déplacé', typeof i.finReel === 'number' && i.date === aujourdhui && i.datePrevue === undefined, [i.finReel, i.date, i.datePrevue]);
  vrai('   sans début réel, pas de durée réelle inventée', i.dureeReelle === undefined, i.dureeReelle); }

console.log('\n── 1674 · 3. la même fiche, deux portes : le formulaire fait ce que fait le menu de statut ──');
{ const A = envoyer(interv({ date: PASSE, debutReel: Date.now() - 1800000 }), { statut: 'terminee' }).db.interventions[0];
  const W = monde({}); W.db.interventions = [interv({ date: PASSE, debutReel: Date.now() - 1800000 })]; W.exec("intSetStatutDo('i1','terminee')"); const B = W.db.interventions[0];
  const m = x => ({ statut: x.statut, date: x.date, datePrevue: x.datePrevue, dateRecale: x.dateRecale, fin: typeof x.finReel, duree: x.dureeReelle, recale: (x.histo || []).filter(h => /Faite le/.test(h.txt)).length });
  v('même statut, même date, même date prévue, même durée, même trace', m(A), m(B)); }

console.log('\n── 1674 · 4. une date changée dans le même envoi est le choix de la personne ──');
{ const W = envoyer(interv({ date: PASSE }), { statut: 'terminee', date: '2026-10-12' }); const i = W.db.interventions[0];
  v('la date saisie reste (pas de recalage par-dessus)', [i.date, i.datePrevue], ['2026-10-12', undefined]);
  vrai('   la fin réelle est posée quand même', typeof i.finReel === 'number', i.finReel); }

console.log('\n── 1674 · 5. modifier une fiche DÉJÀ terminée ne refait rien ──');
{ const fin0 = Date.now() - 86400000 * 2;
  const W = envoyer(interv({ statut: 'terminee', date: PASSE, finReel: fin0, dureeReelle: 42 }), { statut: 'terminee', titre: 'Titre corrigé' }); const i = W.db.interventions[0];
  v('la fin réelle d\'origine est gardée', i.finReel, fin0);
  v('la date n\'est pas déplacée', [i.date, i.datePrevue], [PASSE, undefined]);
  v('   le titre est corrigé', i.titre, 'Titre corrigé'); }

console.log('\n── 1674 · 6. l\'aller-retour est symétrique ──');
{ const W = envoyer(interv({ date: PASSE }), { statut: 'terminee' });
  W.__e = { preventDefault() {}, target: { __data: Object.assign({}, BASE, { statut: 'planifiee', date: aujourdhui }) } };
  W.exec("_saveInt(__e,'i1')"); const i = W.db.interventions[0];
  v('repassée « Planifiée » : la date prévue revient, plus de fin réelle', [i.date, i.finReel, i.datePrevue], [PASSE, undefined, undefined]); }

console.log('\n── 1674 · 7. la règle dans le code ──');
{ const c = G.fonction('saveIntervention');
  vrai('⛔ saveIntervention appelle intRecaleAuJourFait (la fonction commune, pas une copie)', /intRecaleAuJourFait\(/.test(c));
  vrai('   et pose la fin réelle', /finReel\s*=/.test(c)); }
fin();
