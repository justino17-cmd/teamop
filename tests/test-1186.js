/* ══ 1186 · LES PORTES OUBLIÉES DU LOT « CLÔTURER UNE INTERVENTION » (relecture du 17 octobre 2026) ═══════════════════
   La relecture du lot g05 a trouvé quatre trous que les bancs 1180 à 1185 ne jouaient pas :

   1. LE SELECT « STATUT » DU FORMULAIRE est une sixième porte de clôture : passer à Terminée par saveIntervention
      appelait sync SANS { cloture:true } → facture payée, aucune ligne de registre, aucun courriel ;
   2. LE RETOUR DU RECALAGE ne couvrait que le menu et la case : décocher « Effectuée » dans le rapport
      (saveRapport) et le select du formulaire quittaient Terminée sans rendre la date prévue ni retirer finReel ;
   3. LE GROUPE « À FACTURER » ne se forme plus que pour une intervention sans facture : le choix est ÉCRIT
      (« une intervention, une facture »), et une facture reprise est comptée « à éditer » ;
   4. UNE FACTURE D'AVANT (sans `montantInt`) doit suivre le prix tant qu'elle est un brouillon d'une ligne, et une
      facture « Facturer cette intervention » faite SANS prix (lignes = produits) ne doit jamais voir sa ligne 1 écrasée.

   Ce banc EXÉCUTE les vraies saveIntervention, saveRapport, syncFactureFromIntervention, factureAFacturer
   (tests/g05-monde.js).                                                                                          */
const { monde, attendre, interv, etat, cadre, SRC, fonction } = require('./g05-monde');
const { vrai, v, fin } = cadre('test-1186');

const AUJ = new Date().toLocaleDateString('sv-SE');
const PREVUE = new Date(Date.now() + 11 * 86400000).toLocaleDateString('sv-SE');
const arrondi = n => Math.round(n * 100) / 100;

/* le formulaire d'intervention tel que le navigateur l'enverrait (les champs que saveIntervention lit) */
function formulaire(i, extra) {
  return { preventDefault() {}, target: { __data: Object.assign({ titre: i.titre, clientId: i.clientId, date: i.date, heure: i.heure || '09:00', duree: '60',
    statut: i.statut, montant: String(i.montant == null ? '' : i.montant), moyenPaiement: i.moyenPaiement || '', adresse: '' }, extra || {}) } };
}
function depart(extra, opts) {
  const W = monde(opts); const it = interv(extra); W.db.interventions.push(it); W.syncFactureFromIntervention(it); return W;
}
const it0 = W => W.db.interventions[0];

(async () => {
  console.log('\n── 1186 · 0. la population ──');
  vrai('saveIntervention, saveRapport, factureAFacturer, facturesAEditer : une seule définition chacune',
    ['saveIntervention', 'saveRapport', 'factureAFacturer', 'facturesAEditer'].every(n => fonction(n).length > 60 && SRC.split('function ' + n + '(').length - 1 === 1));

  console.log('\n── 1186 · 1. ⛔ le select « Statut » du formulaire : sixième porte de clôture ──');
  for (const [label, moyen] of [['payée sur place', 'C) Espèces'], ['non payée', '']]) {
    const W = depart({ moyenPaiement: moyen }); const i = it0(W);
    W.saveIntervention(formulaire(i, { statut: 'terminee' }), 'i1'); await attendre();
    const e = etat(W);
    if (moyen) {
      v('[formulaire, ' + label + '] UNE facture payée à 33,50 € TTC, UNE ligne au registre reliée à la facture, UN courriel',
        [e.nbFactures, e.statuts, e.ttc, e.lignes, e.factureIds[0] === W.db.factures[0].id, W.__mails.length], [1, ['payee'], [33.5], 1, true, 1]);
    } else {
      v('[formulaire, ' + label + '] une facture à 33,50 € TTC, aucune ligne de registre, aucun courriel',
        [e.nbFactures, e.ttc, e.lignes, W.__mails.length], [1, [33.5], 0, 0]);
    }
    W.saveIntervention(formulaire(it0(W), { statut: 'terminee' }), 'i1'); await attendre();
    v('[formulaire, ' + label + '] enregistrer une seconde fois la fiche déjà terminée ne double rien',
      [W.db.factures.length, (W.db.registres || []).length, W.__mails.length], [1, moyen ? 1 : 0, moyen ? 1 : 0]);
  }
  { /* la même fiche par la porte du menu doit donner EXACTEMENT le même état que par le formulaire */
    const A = depart(); A.saveIntervention(formulaire(it0(A), { statut: 'terminee' }), 'i1'); await attendre();
    const B = depart(); B.intSetStatutDo('i1', 'terminee'); await attendre();
    v('formulaire et menu de statut : mêmes factures, mêmes lignes, mêmes courriels', [etat(A), A.__mails.length], [etat(B), B.__mails.length]); }
  { const W = monde(); W.saveIntervention(formulaire(interv({ statut: 'terminee', id: 'x' })), undefined); await attendre();
    v('créée directement « Terminée » et payée : facture payée, une ligne, un courriel', [W.db.factures.map(f => f.statut), (W.db.registres || []).length, W.__mails.length], [['payee'], 1, 1]); }
  { const W = depart(); W.saveIntervention(formulaire(it0(W), { statut: 'encours' }), 'i1'); await attendre();
    v('un autre statut que Terminée par le formulaire : ni ligne de registre, ni courriel, la facture reste un brouillon', [(W.db.registres || []).length, W.__mails.length, W.db.factures[0].statut], [0, 0, 'brouillon']); }

  console.log('\n── 1186 · 2. ⛔ le retour du recalage : saveRapport (case décochée) et le select du formulaire ──');
  const terminee = () => { const W = monde(); W.db.interventions.push(interv({ date: PREVUE, moyenPaiement: '', montant: 0, debutReel: Date.now() - 3600000 })); W.intSetStatutDo('i1', 'terminee'); return W; };
  { const W = terminee(); v('départ : terminée, déplacée au jour réel, fin réelle posée', [it0(W).date, it0(W).datePrevue, typeof it0(W).finReel], [AUJ, PREVUE, 'number']);
    W.saveRapport({ preventDefault() {}, target: { effectuee: { checked: false }, __data: { montant: '', moyenPaiement: '', infestation: '—', conformite: '—', recommandations: '' } } }, 'i1');
    const i = it0(W);
    v('saveRapport, « Intervention effectuée » décochée : statut « En cours », date prévue rendue, fin réelle et durée réelle retirées', [i.statut, i.date, i.finReel, i.dureeReelle], ['encours', PREVUE, undefined, undefined]);
    v('… `datePrevue` ne dort plus, l’historique le dit', [i.datePrevue, (i.histo || []).some(h => /Remise au/.test(h.txt))], [undefined, true]); }
  { const W = terminee(); W.saveRapport({ preventDefault() {}, target: { effectuee: { checked: true }, __data: { montant: '', moyenPaiement: '', infestation: '—', conformite: '—', recommandations: '' } } }, 'i1');
    v('saveRapport qui REste « effectuée » ne rend rien : la date du jour réel est gardée', [it0(W).statut, it0(W).date], ['terminee', AUJ]); }
  for (const retour of ['planifiee', 'encours']) {
    const W = terminee(); const i = it0(W);
    W.saveIntervention(formulaire(i, { statut: retour }), 'i1');
    v('formulaire, retour « ' + retour + ' » : date prévue rendue, fin réelle et durée réelle retirées', [it0(W).statut, it0(W).date, it0(W).finReel, it0(W).dureeReelle], [retour, PREVUE, undefined, undefined]);
  }
  { const W = terminee(); const i = it0(W); W.saveIntervention(formulaire(i, { statut: 'planifiee', date: '2026-12-24' }), 'i1');
    v('formulaire : une date RETOUCHÉE dans la même fenêtre est gardée (la personne a choisi)', [it0(W).statut, it0(W).date], ['planifiee', '2026-12-24']); }
  { const W = terminee(); const jour = it0(W).date; W.saveIntervention(formulaire(it0(W), { statut: 'annulee' }), 'i1');
    v('formulaire : « Annulée » n’est pas un retour au planning, la date reste', it0(W).date, jour); }
  { const W = terminee(); W.saveIntervention({ preventDefault() {}, target: { __data: { titre: 'Dératisation', clientId: 'cl1', date: it0(W).date, heure: '09:00', duree: '60', montant: '0' } } }, 'i1');
    v('un formulaire SANS select « Statut » ne change rien au statut ni à la date', [it0(W).statut, it0(W).date], ['terminee', AUJ]); }

  console.log('\n── 1186 · 3. le groupe « À facturer » : une intervention qui a sa facture la garde, les autres se regroupent ──');
  const JOUR = '2026-10-16';
  { const W = monde(); ['i1', 'i2'].forEach(id => { const x = interv({ id, titre: 'Passage ' + id, montant: 60, moyenPaiement: '', aFacturer: true, statut: 'terminee' }); W.db.interventions.push(x); W.syncFactureFromIntervention(x); });
    const avant = W.db.factures.length;
    const faites = W.factureAFacturer(JOUR, 'tK', 'uA');
    v('deux interventions du même client et du même jour, chacune avec SA facture : aucune facture de plus, les deux reprises', [avant, W.db.factures.length, faites.length], [2, 2, 2]);
    vrai('… et le groupe n’est pas formé (aucune facture `interIds`)', !W.db.factures.some(f => (f.interIds || []).length), W.db.factures.map(f => f.interIds)); }
  { const W = monde(); ['i1', 'i2'].forEach(id => W.db.interventions.push(interv({ id, titre: 'Passage ' + id, montant: 60, moyenPaiement: '', aFacturer: true, statut: 'terminee' })));
    const faites = W.factureAFacturer(JOUR, 'tK', 'uA');
    v('sans facture préalable : UNE facture de groupe, deux lignes, 120 € TTC (2 × 60)', [W.db.factures.length, faites.length, W.db.factures[0].lignes.length, arrondi(W.docTot(W.db.factures[0]).ttc)], [1, 1, 2, 120]);
    v('… elle est « à éditer » (1), et reste comptée après une seconde validation (aucune facture de plus)', (() => { const n = W.facturesAEditer().length; W.factureAFacturer(JOUR, 'tK', 'uA'); return [n, W.facturesAEditer().length, W.db.factures.length]; })(), [1, 1, 1]); }
  { const W = depart({ aFacturer: true, moyenPaiement: '', statut: 'planifiee' });   // brouillon posé à la création, intervention « à facturer »
    v('avant la validation du contrôle du jour : rien à éditer', W.facturesAEditer().length, 0);
    W.factureAFacturer(JOUR, 'tK', 'uA');
    v('le brouillon REPRIS d’une intervention « à facturer » compte « à éditer » (le bouton « Les factures à éditer » paraît)', [W.db.factures.length, W.facturesAEditer().length], [1, 1]);
    W.db.factures[0].statut = 'envoyee';
    v('… une fois envoyée, elle n’est plus à éditer', W.facturesAEditer().length, 0);
    W.db.factures[0].statut = 'brouillon'; it0(W).aFacturer = false;
    v('… et si l’intervention n’est plus « à facturer », elle ne l’est plus non plus', W.facturesAEditer().length, 0); }
  { const W = depart({ montant: 40 }); W.db.factures[0].statut = 'brouillon';
    v('un brouillon d’intervention qui n’est PAS « à facturer » n’est pas à éditer', W.facturesAEditer().length, 0); }

  console.log('\n── 1186 · 4. une facture d’AVANT suit le prix ; une facture sans prix ne voit pas sa ligne 1 écrasée ──');
  const ancienne = (extra, mnt) => { const W = monde(); const it = interv({ montant: mnt == null ? 100 : mnt, moyenPaiement: '' }); W.db.interventions.push(it);
    W.db.factures.push(Object.assign({ id: 'fAnc', num: 'FAC-2026-001', clientId: 'cl1', statut: 'brouillon', tva: 20, interventionId: 'i1', lignes: [{ designation: 'Dératisation', qte: 1, pu: 100 }] }, extra || {}));
    return W; };
  { const W = ancienne(); W.syncFactureFromIntervention(it0(W));
    v('brouillon d’avant (pu = prix, l’ancienne façon), prix inchangé : le montant ne bouge PAS (120 € TTC, pas 100)', [W.db.factures[0].lignes[0].pu, arrondi(W.docTot(W.db.factures[0]).ttc)], [100, 120]);
    vrai('… il porte désormais `montantInt` pour suivre la suite', W.db.factures[0].montantInt === 100, W.db.factures[0].montantInt);
    it0(W).montant = 150; W.syncFactureFromIntervention(it0(W));
    v('… puis le prix passe à 150 € : le brouillon suit (150,00 € TTC)', [W.db.factures[0].lignes[0].pu, arrondi(W.docTot(W.db.factures[0]).ttc)], [125, 150]); }
  { const W = ancienne(); it0(W).montant = 150; W.syncFactureFromIntervention(it0(W));
    v('brouillon d’avant, prix changé AVANT toute synchro : il suit le prix (150 € TTC), il ne part pas à l’ancien', [W.db.factures[0].lignes[0].pu, arrondi(W.docTot(W.db.factures[0]).ttc), W.db.factures[0].montantInt], [125, 150, 150]); }
  { const W = ancienne({ statut: 'envoyee' }); it0(W).montant = 150; W.syncFactureFromIntervention(it0(W));
    v('une facture d’avant déjà ÉMISE n’est jamais réécrite', [W.db.factures[0].lignes[0].pu, W.db.factures[0].montantInt], [100, undefined]); }
  { const W = ancienne({ lignes: [{ designation: 'Dératisation', qte: 1, pu: 100 }, { designation: 'Produit', qte: 2, pu: 10 }] }); it0(W).montant = 150; W.syncFactureFromIntervention(it0(W));
    v('un brouillon d’avant à PLUSIEURS lignes (édité à la main) n’est pas réécrit', W.db.factures[0].lignes.map(l => l.pu), [100, 10]); }
  { /* « Facturer cette intervention » faite SANS prix : lignes = produits utilisés, montantInt = 0 */
    const W = ancienne({ montantInt: 0, lignes: [{ designation: 'Gel (L)', qte: 2, pu: 10 }] }, 0);
    it0(W).montant = 50; W.syncFactureFromIntervention(it0(W));
    v('facture faite sans prix (montantInt 0, lignes = produits) : la ligne produit garde son prix unitaire (10), pas 41,67', [W.db.factures[0].lignes[0].pu, W.db.factures[0].lignes.length, W.db.factures[0].montantInt], [10, 1, 0]); }
  { const W = ancienne({ montantInt: 100 }); it0(W).montant = 150; W.syncFactureFromIntervention(it0(W));
    v('la facture tirée d’un prix (montantInt > 0) suit toujours un changement de prix (non-régression du lot)', [W.db.factures[0].lignes[0].pu, W.db.factures[0].montantInt], [125, 150]); }

  fin();
})();
