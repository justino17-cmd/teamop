/* ══ 1184 · REPASSER « PLANIFIÉE » / « EN COURS » RENDS LA DATE PRÉVUE ET RETIRE LA FIN RÉELLE ═════════════════════
   Rapport du testeur interventions#4 (16 octobre 2026, reproduit deux fois) : intervention planifiée le 27/10,
   marquée « Terminée » par erreur → sa date devient le jour réel (« Faite le 16 oct. au lieu du 27 oct. »). Ce
   déplacement est VOULU et documenté (intRecaleAuJourFait : l'argent, le contrôle du jour et la télécollecte la
   retrouvent au bon endroit). Le défaut est le RETOUR : repassée « Planifiée », elle restait au 16/10, le rendez-
   client disparaissait du 27/10, `datePrevue` dormait sans servir, et `finReel` restait posé sur une fiche
   « Planifiée ».

   Règle : quitter « Terminée » pour « Planifiée »/« En cours » retire la fin réelle et la durée réelle, et remet la
   date prévue — SEULEMENT si c'est intRecaleAuJourFait qui l'avait déplacée (la date n'a pas été retouchée
   depuis) — avec une ligne d'historique.
   Ce banc EXÉCUTE les vraies intSetStatutDo, intEffToggle, intRecaleAuJourFait (tests/g05-monde.js).           */
const { monde, interv, cadre, SRC, fonction } = require('./g05-monde');
const { vrai, v, fin } = cadre('test-1184');

const AUJ = new Date().toLocaleDateString('sv-SE');
/* une date prévue dans le futur proche, toujours différente d'aujourd'hui */
const PREVUE = new Date(Date.now() + 11 * 86400000).toLocaleDateString('sv-SE');
function depart(extra) { const W = monde(); W.db.interventions.push(interv(Object.assign({ date: PREVUE, moyenPaiement: '', montant: 0 }, extra || {}))); return W; }
const it = W => W.db.interventions[0];

console.log('\n── 1184 · 0. la population ──');
vrai('les fonctions sont trouvées, une seule fois', ['intSetStatutDo', 'intEffToggle', 'intRecaleAuJourFait'].every(n => fonction(n).length > 100 && SRC.split('function ' + n + '(').length - 1 === 1));
{ const W = depart(); W.intSetStatutDo('i1', 'terminee');
  v('le recalage VOULU est intact : « Terminée » déplace au jour réel et garde la date prévue', [it(W).date, it(W).datePrevue, it(W).statut], [AUJ, PREVUE, 'terminee']);
  vrai('… la fin réelle est posée', !!it(W).finReel, it(W).finReel); }

console.log('\n── 1184 · 1. ⛔ le cas du rapport : Terminée puis Planifiée ──');
for (const retour of ['planifiee', 'encours']) {
  const W = depart({ debutReel: Date.now() - 3600000 }); W.intSetStatutDo('i1', 'terminee'); W.intSetStatutDo('i1', retour);
  const i = it(W);
  v('retour « ' + retour + ' » : la date prévue est rendue (le rendez-vous client reparaît)', [i.date, i.statut], [PREVUE, retour]);
  v('… la fin réelle et la durée réelle sont retirées (pas de fin réelle sur une fiche non terminée)', [i.finReel, i.dureeReelle], [undefined, undefined]);
  v('… le début réel du chrono, lui, reste (on ne perd pas ce que la personne a démarré)', typeof i.debutReel, 'number');
  vrai('… l’historique le dit', (i.histo || []).some(h => /Remise au/.test(h.txt)), (i.histo || []).map(h => h.txt));
  v('… `datePrevue` ne dort plus', i.datePrevue, undefined);
}

console.log('\n── 1184 · 2. la case « Effectué ? » défait aussi ──');
{ const W = depart(); W.intSetStatutDo('i1', 'terminee'); W.intEffToggle('i1', false);
  v('terminée par le menu puis case décochée : date prévue rendue, fin réelle retirée', [it(W).date, it(W).finReel, it(W).statut], [PREVUE, undefined, 'planifiee']); }
{ const W = depart(); W.intEffToggle('i1', true); W.intEffToggle('i1', false);
  v('la case seule (pas de recalage à défaire) : la date n’a jamais bougé', [it(W).date, it(W).statut], [PREVUE, 'planifiee']); }

console.log('\n── 1184 · 3. ⛔ seulement si c’est le recalage qui a déplacé la date ──');
{ const W = depart(); W.intSetStatutDo('i1', 'terminee'); it(W).date = '2026-12-24';   // la personne a retouché la date depuis
  W.intSetStatutDo('i1', 'planifiee');
  v('date retouchée à la main après le recalage : on n’y touche pas', it(W).date, '2026-12-24'); }
{ const W = depart({ statut: 'terminee', datePrevue: PREVUE, date: AUJ, finReel: Date.now() }); W.intSetStatutDo('i1', 'planifiee');
  v('fiche d’AVANT (datePrevue sans marque de recalage) : rendue aussi — datePrevue n’est écrite que par le recalage', it(W).date, PREVUE); }
{ const W = depart({ date: AUJ }); W.intSetStatutDo('i1', 'terminee'); W.intSetStatutDo('i1', 'planifiee');
  v('terminée le jour prévu (rien déplacé) : la date ne bouge pas', [it(W).date, it(W).statut], [AUJ, 'planifiee']); }
{ const W = depart(); W.intSetStatutDo('i1', 'terminee'); const jour = it(W).date; W.intSetStatutDo('i1', 'annulee');
  v('« Annulée » n’est pas un retour au planning : la date reste', it(W).date, jour); }
{ const W = depart(); W.intSetStatutDo('i1', 'planifiee');
  v('passer « Planifiée » depuis un autre statut que « Terminée » ne touche à rien', [it(W).date, it(W).statut, (it(W).histo || []).filter(h => /Remise au/.test(h.txt)).length], [PREVUE, 'planifiee', 0]); }

console.log('\n── 1184 · 4. un aller-retour complet ne perd rien ──');
{ const W = depart(); W.intSetStatutDo('i1', 'terminee'); W.intSetStatutDo('i1', 'planifiee'); W.intSetStatutDo('i1', 'terminee');
  v('terminer, annuler la clôture, re-terminer : la date prévue d’origine est toujours celle du 27 (ici +11 jours)', [it(W).date, it(W).datePrevue], [AUJ, PREVUE]); }

fin();
