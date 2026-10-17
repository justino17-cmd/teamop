/* ══ 1181 · « FACTURER CETTE INTERVENTION » : UNE SEULE FACTURE, AU BON MONTANT, ET PAS POUR UN TECHNICIEN ═════════
   Rapports du testeur interventions#10, facturation#7 (et la part « montant » de facturation#0), 16 octobre 2026 :

   · deux clics sur « Facturer cette intervention » créaient FAC-…-002 puis FAC-…-003 à côté de la facture
     automatique : intGenererDoc ne regardait jamais s'il en existait déjà une ;
   · elle posait pu = prix puis ajoutait 20 % (120 € → 144 €) alors que « Prix encaissé » est un TTC ;
   · un technicien (aucune rubrique Factures au menu) voyait le bouton, créait une facture (numéro consommé) et
     était renvoyé sur le tableau de bord : « Ventes → Ajouter » vaut VRAI par défaut (catDeduitRegle rend null),
     la visibilité de la rubrique n'était lue nulle part.

   Ce banc EXÉCUTE la vraie intGenererDoc (tests/g05-monde.js). Le bouton, lui, vit dans renderIntDetail (trop de
   dépendances pour l'exécuter) : on lit son CODE (la ligne du bouton), commentaires retirés.                      */
const { monde, interv, cadre, SRC, fonction } = require('./g05-monde');
const { vrai, v, fin } = cadre('test-1181');

const arrondi = n => Math.round(n * 100) / 100;
const terminee = extra => interv(Object.assign({ statut: 'terminee', moyenPaiement: '', montant: 120 }, extra || {}));
function avecAuto(extra, opts) { const W = monde(opts); const it = terminee(extra); W.db.interventions.push(it); W.syncFactureFromIntervention(it); return W; }

console.log('\n── 1181 · 0. la population ──');
vrai('intGenererDoc est trouvée, une seule fois', fonction('intGenererDoc').length > 400 && SRC.split('function intGenererDoc(').length - 1 === 1);

console.log('\n── 1181 · 1. ⛔ interventions#10 : elle a déjà sa facture → on l’ouvre, on n’en crée pas une 2ᵉ ──');
{ const W = avecAuto();
  v('départ : la facture automatique existe (1)', W.db.factures.length, 1);
  W.intGenererDoc('i1', 'factures'); W.intGenererDoc('i1', 'factures');
  v('deux clics : toujours UNE facture', W.db.factures.length, 1);
  vrai('… un message dit laquelle (son numéro)', W.__toasts.some(t => t.includes(W.db.factures[0].num)), W.__toasts);
  v('… et elle est OUVERTE (jamais une page blanche)', W.__docsOuverts.map(d => d[1] + ':' + d[2]), ['factures:' + W.db.factures[0].id, 'factures:' + W.db.factures[0].id]);
  v('… le numéro de facture suivant n’est pas consommé', W.docNum('factures'), 'FAC-2026-002'); }
for (const cle of ['interId', 'interIds', 'factureId']) {
  const W = monde(); const it = terminee(); W.db.interventions.push(it);
  const f = { id: 'fOld', num: 'FAC-2026-001', clientId: 'cl1', statut: 'envoyee', tva: 20, lignes: [{ designation: 'x', qte: 1, pu: 100 }] };
  if (cle === 'interIds') { f.interIds = ['i1']; f.aFacturer = true; } else if (cle === 'interId') f.interId = 'i1'; else it.factureId = 'fOld';
  W.db.factures.push(f);
  W.intGenererDoc('i1', 'factures');
  v('facture d’AVANT rangée sous « ' + cle + ' » : reconnue, pas doublée', [W.db.factures.length, W.__docsOuverts.length], [1, 1]);
}
{ const W = avecAuto(); W.__droits['ventes.modifier'] = false; W.intGenererDoc('i1', 'factures');
  v('sans le droit de MODIFIER les ventes : on ouvre l’aperçu, pas le formulaire', W.__docsOuverts.map(d => d[0]), ['printDoc']); }

console.log('\n── 1181 · 2. le prix encaissé est un TTC (120 € ne devient pas 144 €) ──');
for (const tva of [20, 10]) {
  const W = monde({ db: { interventions: [], factures: [], devis: [], registres: [], clients: [{ id: 'cl1', nom: 'X' }], users: [], techniciens: [], factTva: tva } });
  W.db.interventions.push(terminee());
  W.intGenererDoc('i1', 'factures'); W.intGenererDoc('i1', 'devis');
  v('TVA ' + tva + ' % : facture à 120,00 € TTC', [W.db.factures.length, arrondi(W.docTot(W.db.factures[0]).ttc), W.db.factures[0].tva], [1, 120, tva]);
  v('TVA ' + tva + ' % : le devis tiré de la même intervention dit le même prix (120,00 € TTC)', [W.db.devis.length, arrondi(W.docTot(W.db.devis[0]).ttc)], [1, 120]);
  v('… la facture porte la clé unique (interventionId) et le prix dont elle est tirée', [W.db.factures[0].interventionId, W.db.factures[0].montantInt], ['i1', 120]);
}
{ const W = monde(); W.db.interventions.push(terminee({ montant: 0 })); W.intGenererDoc('i1', 'factures');
  v('sans prix : une facture à zéro, comme avant (rien d’inventé)', [W.db.factures.length, arrondi(W.docTot(W.db.factures[0]).ttc)], [1, 0]); }

console.log('\n── 1181 · 3. ⛔ facturation#7 : un compte qui ne voit pas la rubrique Factures n’en crée pas ──');
{ const W = monde({ moi: { id: 'uT', role: 'technicien', prenom: 'Tom', nom: 'Tech' }, voit: { factures: false } });
  W.db.interventions.push(terminee());
  W.intGenererDoc('i1', 'factures');
  v('technicien : aucune facture, aucun numéro consommé, pas de renvoi vers « Factures »', [W.db.factures.length, W.__go, W.__saves], [0, [], 0]);
  vrai('… et il sait pourquoi', W.__toasts.length === 1, W.__toasts); }
{ const W = monde({ moi: { id: 'uT', role: 'technicien' }, voit: { devis: false } }); W.db.interventions.push(terminee());
  W.intGenererDoc('i1', 'devis');
  v('… pareil pour un devis sans la rubrique Devis', [W.db.devis.length, W.__go], [0, []]); }
{ const W = monde({ moi: { id: 'uC', role: 'commercial' }, voit: { factures: true } }); W.db.interventions.push(terminee());
  W.intGenererDoc('i1', 'factures');
  v('contre-épreuve : qui voit la rubrique ET a « Ventes → Ajouter » facture normalement', [W.db.factures.length, W.__go], [1, ['factures']]); }
{ const W = monde({ droits: { 'ventes.ajouter': false } }); W.db.interventions.push(terminee()); W.intGenererDoc('i1', 'factures');
  v('contre-épreuve : sans « Ventes → Ajouter », même une rubrique visible ne suffit pas', W.db.factures.length, 0); }

console.log('\n── 1181 · 4. les boutons de la fiche lisent la même règle (le code de renderIntDetail) ──');
{ const lignesBouton = nom => SRC.split('\n').filter(l => l.includes("onclick=\"intGenererDoc('${id}','" + nom + "')\""));
  const f = lignesBouton('factures'), d = lignesBouton('devis');
  v('population : un bouton « Facturer » et un bouton « Créer un devis »', [f.length, d.length], [1, 1]);
  vrai('« Facturer cette intervention » exige la rubrique Factures EN PLUS de « Ventes → Ajouter »', /userSeesModule\(currentUser,'factures'\)/.test(f[0]) && /canCat\('ventes','ajouter'\)/.test(f[0]), f[0] && f[0].slice(0, 160));
  vrai('« Créer un devis » exige la rubrique Devis EN PLUS de « Ventes → Ajouter »', /userSeesModule\(currentUser,'devis'\)/.test(d[0]) && /canCat\('ventes','ajouter'\)/.test(d[0]), d[0] && d[0].slice(0, 160)); }
{ const c = fonction('intGenererDoc'); const g = c.indexOf("permGarde('ventes','ajouter'"), r = c.indexOf('userSeesModule(');
  vrai('⛔ la garde de la fonction qui ÉCRIT : la case en première instruction, la rubrique avant toute écriture', g >= 0 && g < 60 && r > g && r < c.indexOf('db[kind].push('), [g, r]); }

fin();
