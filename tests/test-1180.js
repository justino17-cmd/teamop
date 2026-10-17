/* ══ 1180 · CLÔTURER UNE INTERVENTION : UNE FACTURE, UN MONTANT, UNE LIGNE DE REGISTRE — QUELLE QUE SOIT LA PORTE ══
   Rapports du testeur interventions#0, #1, facturation#0, technicien#0 (16 octobre 2026), tous reproduits deux fois :

   · « Rédiger » + « Effectué » créait DEUX factures « payées » (40,20 € et 33,50 € pour 33,50 € encaissés) :
     syncFactureFromIntervention rangeait la sienne sous `interventionId`, factureAutoIntervention cherchait
     sous `interId` et ne la trouvait pas ;
   · un même prix donnait 144 € (sync : prix traité en HT, TVA ajoutée) ou 120 € (auto : prix traité en TTC) —
     alors que le champ s'appelle « Prix encaissé (€) » ;
   · menu de statut, case « Effectué ? », « Terminer à la date prévue » : facture restée en brouillon et AUCUNE
     ligne au registre ; Clôture guidée : facture payée mais aucune ligne, aucun courriel.

   Ce banc EXÉCUTE les vraies fonctions d'app.html (tests/g05-monde.js) : cinq portes × (payée sur place / non
   payée), en comptant factures, montants TTC, lignes de registre et courriels.                                   */
const { monde, attendre, interv, etat, cadre, SRC, fonction } = require('./g05-monde');
const { vrai, v, fin } = cadre('test-1180');

/* une porte = (monde, id) → pose « terminée » par SON chemin */
const PORTES = {
  menu: W => W.intSetStatutDo('i1', 'terminee'),
  case: W => W.intEffToggle('i1', true),
  prevu: W => W.intTerminerPrevu('i1'),
  rapport: W => { const it = W.db.interventions.find(x => x.id === 'i1');
    W.saveRapport({ preventDefault() {}, target: { effectuee: { checked: true }, __data: { montant: String(it.montant).replace('.', ','), moyenPaiement: it.moyenPaiement || '', infestation: '—', conformite: '—', recommandations: '' } } }, 'i1'); },
  assist: W => { W.assistCloture('i1'); W.assistFinish('i1'); },
};

/* l'état de départ de tout le monde : l'intervention vient d'être créée par le formulaire (saveIntervention
   appelle syncFactureFromIntervention) — c'est donc un brouillon qui l'attend */
function depart(extra, opts) {
  const W = monde(opts);
  const it = interv(extra); W.db.interventions.push(it);
  W.syncFactureFromIntervention(it);
  return W;
}

(async () => {
  console.log('\n── 1180 · 0. la population ──');
  vrai('⛔ une seule définition de chaque fonction de la chaîne',
    ['syncFactureFromIntervention', 'factureAFacturer', 'regAdd', 'regDeLInter', 'intSetStatutDo', 'intEffToggle', 'intTerminerPrevu', 'saveRapport', 'assistFinish']
      .every(n => SRC.split('function ' + n + '(').length - 1 === 1));
  vrai('les cinq portes sont trouvées', Object.keys(PORTES).length === 5 && ['saveRapport', 'assistFinish', 'intTerminerPrevu', 'intEffToggle', 'intSetStatutDo'].every(n => fonction(n).length > 100));
  { const W = depart();
    v('départ : la création pose UN brouillon, au prix encaissé (33,50 € TTC)', [W.db.factures.length, W.db.factures[0].statut, etat(W).ttc], [1, 'brouillon', [33.5]]); }

  console.log('\n── 1180 · 1. ⛔ payée sur place : cinq portes, MÊME résultat ──');
  for (const [nom, porte] of Object.entries(PORTES)) {
    const W = depart(); porte(W); await attendre();
    const e = etat(W);
    v('[' + nom + '] une seule facture, payée, à 33,50 € TTC (pas 40,20 ni 73,70)', [e.nbFactures, e.liees, e.statuts, e.ttc], [1, 1, ['payee'], [33.5]]);
    v('[' + nom + '] UNE ligne au registre, qui porte l’identifiant de la facture', [e.lignes, e.factureIds[0] === W.db.factures[0].id], [1, true]);
    v('[' + nom + '] la ligne dit le bon montant, le bon mode, et « effectuer » comme source', [(W.db.registres[0]||{}).montant, (W.db.registres[0]||{}).mode, (W.db.registres[0]||{}).source], [33.5, 'ESP', 'effectuer']);
    v('[' + nom + '] UN courriel de facture, à l’adresse du client', [W.__mails.length, (W.__mails[0] || {}).to], [1, 'dupont@example.org']);
    porte(W); await attendre();
    const e2 = etat(W);
    v('[' + nom + '] re-jouer la porte ne double rien : 1 facture, 1 ligne, toujours 1 courriel', [e2.nbFactures, e2.lignes, W.__mails.length], [1, 1, 1]);
  }

  console.log('\n── 1180 · 2. ⛔ non payée : cinq portes, MÊME résultat, rien au registre ──');
  for (const [nom, porte] of Object.entries(PORTES)) {
    const W = depart({ moyenPaiement: '' }); porte(W); await attendre();
    const e = etat(W);
    v('[' + nom + '] une seule facture, à 33,50 € TTC, aucune ligne de registre, aucun courriel', [e.nbFactures, e.ttc, e.lignes, W.__mails.length], [1, [33.5], 0, 0]);
    vrai('[' + nom + '] … et elle n’est plus en brouillon : l’intervention est terminée', W.db.factures[0].statut !== 'brouillon', W.db.factures[0].statut);
  }

  console.log('\n── 1180 · 3. le prix est TTC, la TVA de l’entreprise s’applique (jamais 20 % en dur) ──');
  for (const tva of [20, 10, 5.5]) {
    const W = depart({ montant: 120 }, { db: { interventions: [], factures: [], registres: [], devis: [], clients: [{ id: 'cl1', nom: 'X', email: '' }], users: [], techniciens: [], factTva: tva } });
    PORTES.rapport(W);
    const f = W.db.factures[0], t = W.docTot(f);
    v('TVA ' + tva + ' % : 120 € encaissés → facture à 120,00 € TTC, TVA portée par la facture', [W.db.factures.length, Math.round(t.ttc * 100) / 100, f.tva], [1, 120, tva]);
  }

  console.log('\n── 1180 · 4. technicien#0 : le montant saisi au rapport, sans brouillon préalable ──');
  { const W = monde(); const it = interv({ id: 'i1', montant: 0, moyenPaiement: '' }); W.db.interventions.push(it); W.syncFactureFromIntervention(it);
    v('départ : pas de prix, pas de facture', W.db.factures.length, 0);
    W.saveRapport({ preventDefault() {}, target: { effectuee: { checked: true }, __data: { montant: '45,50', moyenPaiement: 'C) Espèces', infestation: '—', conformite: '—', recommandations: '' } } }, 'i1'); await attendre();
    const e = etat(W);
    v('45,50 € en espèces + « Effectué » : UNE facture payée de 45,50 € TTC (pas 100,10 €), une ligne', [e.nbFactures, e.statuts, e.ttc, e.lignes], [1, ['payee'], [45.5], 1]);
    W.saveRapport({ preventDefault() {}, target: { effectuee: { checked: false }, __data: { montant: '45,50', moyenPaiement: 'C) Espèces', infestation: '—', conformite: '—', recommandations: '' } } }, 'i1');
    v('« Enregistrer » sans « Effectué » ensuite : ni facture ni ligne de plus, rien ne disparaît', [W.db.factures.length, (W.db.registres || []).length], [1, 1]); }

  console.log('\n── 1180 · 5. les trois clés de lien : une facture d’AVANT est reconnue, pas doublée ──');
  for (const cle of ['interventionId', 'interId', 'interIds']) {
    const W = monde(); const it = interv(); W.db.interventions.push(it);
    const ancienne = { id: 'fAnc', num: 'FAC-2026-001', clientId: 'cl1', statut: 'brouillon', tva: 20, lignes: [{ designation: 'Dératisation', qte: 1, pu: 27.92 }] };
    if (cle === 'interIds') { ancienne.interIds = ['i1']; ancienne.aFacturer = true; } else ancienne[cle] = 'i1';
    W.db.factures.push(ancienne);
    PORTES.rapport(W); await attendre();
    v('clé « ' + cle + ' » : toujours UNE facture pour l’intervention (la même)', [W.db.factures.length, W.db.factures[0].id], [1, 'fAnc']);
  }
  { /* lecture seule : ce qui existe n’est ni migré ni réécrit (rien ne s’écrit au chargement) */
    const W = monde(); const it = interv(); W.db.interventions.push(it);
    const ancienne = { id: 'fAnc', num: 'FAC-2026-001', clientId: 'cl1', statut: 'envoyee', tva: 20, interventionId: 'i1', lignes: [{ designation: 'Dératisation', qte: 1, pu: 33.5 }] };
    W.db.factures.push(ancienne); const avant = JSON.stringify(W.db.factures);
    W.factureDeIntervention && W.factureDeIntervention('i1'); W.interAFacturer && W.interAFacturer(it);
    v('chercher une facture n’écrit RIEN dans les factures existantes', JSON.stringify(W.db.factures), avant);
    v('une facture émise d’AVANT (144 € de la TVA ajoutée) garde son montant tant que le prix ne change pas',
      (() => { const X = monde(); const i2 = interv({ montant: 120 }); X.db.interventions.push(i2);
        X.db.factures.push({ id: 'f144', num: 'FAC-2026-001', clientId: 'cl1', statut: 'envoyee', tva: 20, interventionId: 'i1', lignes: [{ designation: 'Dératisation', qte: 1, pu: 120 }] });
        PORTES.menu(X); return Math.round(X.docTot(X.db.factures[0]).ttc * 100) / 100; })(), 144); }

  console.log('\n── 1180 · 6. décocher ou repasser en cours ne supprime ni la facture ni la ligne ──');
  { const W = depart(); PORTES.case(W); await attendre();
    W.intEffToggle('i1', false);
    v('décocher « Effectué ? » : la facture et la ligne restent', [W.db.factures.length, W.db.registres.length], [1, 1]);
    W.intEffToggle('i1', true); await attendre();
    v('… le recocher ne crée ni 2ᵉ facture, ni 2ᵉ ligne, ni 2ᵉ courriel', [W.db.factures.length, W.db.registres.length, W.__mails.length], [1, 1, 1]); }

  console.log('\n── 1180 · 7. ce qui n’est pas de l’argent encaissé n’entre pas au registre ──');
  { const W = depart({ aFacturer: true }); PORTES.menu(W); await attendre();
    v('« à facturer » (rien encaissé sur place) : pas de ligne de registre, pas de courriel de facture payée', [W.db.registres.length, W.__mails.length], [0, 0]); }
  { const W = depart({ dejaRegle: true }); PORTES.menu(W); await attendre();
    v('« déjà réglé à un autre passage » : pas de ligne de registre', W.db.registres.length, 0); }
  { const W = depart(); W.db.registres.push({ id: 'rTele', interId: 'i1', montant: 33.5, mode: 'ESP', source: 'telecollecte', jourValide: true, factureId: '' });
    PORTES.menu(W); await attendre();
    v('une ligne déjà confirmée en télécollecte n’est NI doublée NI réécrite (un euro = une ligne)', [W.db.registres.length, W.db.registres[0].source, W.db.registres[0].montant], [1, 'telecollecte', 33.5]);
    v('… mais elle retrouve sa facture (pour « Annuler le paiement »)', (W.db.registres[0]||{}).factureId, W.db.factures[0].id); }

  console.log('\n── 1180 · 8. factureAFacturer : une intervention qui a déjà sa facture n’en reçoit pas une 2ᵉ (le groupe) ──');
  { const W = depart({ aFacturer: true, moyenPaiement: '', statut: 'terminee' });
    const faites = W.factureAFacturer('2026-10-16', 'tK', 'uA');
    v('l’intervention a son brouillon : le « À facturer » du contrôle du jour le reprend au lieu d’en créer un autre', [W.db.factures.length, faites.length, faites[0] && faites[0].id === W.db.factures[0].id], [1, 1, true]);
    v('… et le groupe, lui, garde son prix TTC → HT (120 € = 100 € HT + 20 %)', (() => { const X = monde(); const i = interv({ id: 'i9', montant: 120, aFacturer: true, moyenPaiement: '', statut: 'terminee' }); X.db.interventions.push(i);
      X.factureAFacturer('2026-10-16', 'tK', 'uA'); return Math.round(X.docTot(X.db.factures[0]).ttc * 100) / 100; })(), 120); }

  fin();
})();
