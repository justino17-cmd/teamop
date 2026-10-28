/* ══ test-3150 · UNE FACTURE ÉMISE NE SE RÉÉCRIT PAS, NE SE SUPPRIME PAS, ET NE PART PAS TOUTE SEULE SANS CHOIX ══
   Comptable, 28 octobre 2026 — audit B1, B2, B4 (partie envoi). Trois défauts, un même effet : le document remis au
   client n'est plus celui que la base contient, ou la séquence des numéros a un trou.
   · B1  syncFactureFromIntervention réécrivait lignes, TVA et montant d'une facture ENVOYÉE ou PAYÉE quand le prix de
         l'intervention changeait (rejoué : payée à 10 % → 20 %). Désormais : un brouillon suit le prix et GARDE son taux ;
         une facture émise ne bouge pas, et l'utilisateur le SAIT (toast + journal : numéro et les deux montants).
   · B2  delFacture supprimait n'importe quelle facture et journalisait « f1 ». Désormais : seul un brouillon part, et le
         journal écrit son numéro et son montant. Les AUTRES portes qui font disparaître une facture sont recensées ici :
         la suppression générique (delItem), la remise à zéro (razAppliquer), la mise en production (resetProdWipe).
         Laissés, parce que ce ne sont que des données d'essai : « retirer la journée d'essai » de la comptabilité et de la
         télécollecte (demoComptaRetire, demoTeleRetire — rien que ce qui porte `demo`), « Vider les données » de la bêta
         (betaVider — outil gardé par BETA_ESSAI). Supprimer une intervention ou un client ne touche PAS aux factures.
   · B4  la facture « réglée sur place » partait seule par courriel (`factAuto!==false`) : elle ne part plus que si
         l'entreprise l'a CHOISI (`factAuto===true`), et l'écran (Comptabilité › ⚙ Facturation auto) dit « désactivé » par
         défaut, ce que fait le réglage et le taux de TVA appliqué.
   Ce banc EXÉCUTE les vraies fonctions d'app.html (bac à sable commun tests/g05-monde.js + les fonctions ajoutées ici).
   Population comptée avant chaque absence : un « rien n'a bougé » sur une base sans facture émise passerait au vert.   */
const fs = require('fs');
const { monde, attendre, interv, SRC, BRUT, bloc, ligne, fonction, cadre } = require('./g05-monde');
const { vrai, v, fin } = cadre('test-3150');

/* ── de quoi monter les fonctions de suppression, en plus de la chaîne intervention → facture ── */
const AJOUTS = ['delFacture', 'delItem', 'factLignesRegistre', 'factRegistreRetirer', 'facturesAGarder', 'razAppliquer', 'resetProdWipe',
  'factReglagesModal', 'factReglagesSave', 'delIntDo', 'delSerieDo', 'intArchive', 'serieSuivants', 'serieAutresActifs',
  'clientLiens', 'clientLiensTxt', 'liensPluriel', 'demoComptaRetire', 'demoTeleRetire'];
const CODE = {}; AJOUTS.forEach(n => { CODE[n] = fonction(n); });
const RAZ_LIGNES = (() => { const i = SRC.indexOf('const RAZ_LIGNES=['); const j = SRC.indexOf('];', i); return i < 0 ? '' : SRC.slice(i, j + 2); })();
const COLL_GRP = ligne('const COLL_GRP=');
const BETA_VIDER = fonction('betaVider');

function monde2(opts) {
  const o = opts || {};
  const W = monde(o);
  W.exec(`
    var __logs=[], __confirms=[], __reponse=${o.confirme === false ? 'false' : 'true'}, __finance=${o.finance === false ? 'false' : 'true'}, __els={}, __html='', __go2=[];
    function logEvent(a,b,c){ __logs.push([a,b,c]); }
    function confirm(m){ __confirms.push(String(m)); return __reponse; }
    function isFinanceMgr(){ return __finance; }
    function $(id){ return __els[id]||null; }
    function openModal(h){ __html=String(h); __modals++; }
    function toastAnnuler(m){ toast(m); }
    function delLibelle(){ return 'cet élément'; }
    var views={ factures(){}, comptabilite(){} }; var _delAvant=null; var _razChoix={};
    var REG_MODES={};
    function planSnap(){ return {}; } function techNames(){ return ''; } function syncRetraitVoulu(){} function exportData(){ __exports=(typeof __exports==='undefined'?0:__exports)+1; }
    function demoComptaCompte(){ return 0; } function demoTeleCompte(){ return 0; } var syncPush=undefined;
    ${COLL_GRP}
    ${RAZ_LIGNES}
    ${AJOUTS.map(n => CODE[n]).join('\n')}
    ${/* resetProdWipe lit DASH_DEFAULT et les collections */ 'var DASH_DEFAULT=["a","b"];'}
  `);
  /* les aides de droit : le monde commun répond « oui » à tout sauf ce qu'on lui retire (__droits) */
  W.exec('function adminSeul(){ return true; }');
  return W;
}

const FACT = (extra) => Object.assign({ id: 'f1', num: 'FAC-2026-001', clientId: 'cl1', interventionId: 'i1', date: '2026-10-16', statut: 'brouillon', tva: 20,
  montantInt: 100, lignes: [{ designation: 'Dératisation', qte: 1, pu: 83.33 }] }, extra || {});
/* ce que la synchro ne doit JAMAIS toucher sur une facture émise : lignes, TVA, montant d'origine, client, total */
const empreinte = (W, f) => JSON.stringify({ l: f.lignes, t: f.tva, m: f.montantInt, c: f.clientId, n: f.num, ttc: Math.round(W.docTot(f).ttc * 100) / 100 });
const journalDe = W => W.exec('__logs');

(async () => {
  /* ═════════════════════════════ 0. LA POPULATION ═════════════════════════════ */
  console.log('\n── 3150 · 0. la population ──');
  const NOMS = ['syncFactureFromIntervention', 'delFacture', 'delItem', 'razAppliquer', 'resetProdWipe', 'factureMailPayee', 'factureEmiseSignale',
    'factAutoActif', 'factReglagesModal', 'factReglagesSave', 'facturesAGarder', 'factureTauxPropre', 'docEmis', 'factureAFacturer'];
  v('toutes les fonctions sont trouvées (une tranche vide passerait au vert sur tout)', NOMS.filter(n => fonction(n).length < 40), []);
  v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)', NOMS.map(n => SRC.split('function ' + n + '(').length - 1), NOMS.map(() => 1));
  vrai('la liste de la remise à zéro est trouvée (une tranche vide passerait au vert)', RAZ_LIGNES.length > 200 && /k:'vente'/.test(RAZ_LIGNES), RAZ_LIGNES.length);

  /* ═════════════════════════════ 1. B1 — LA SYNCHRO ═════════════════════════════ */
  console.log('\n── 3150 · 1. B1 — un brouillon suit le prix et GARDE son taux ──');
  { /* brouillon à 10 % : l'intervention passe de 110 à 220 € TTC → HT 200 avec LE TAUX DU BROUILLON */
    const W = monde2(); const it = interv({ id: 'i1', montant: 220, moyenPaiement: '', statut: 'planifiee' }); W.db.interventions.push(it);
    W.db.factures.push(FACT({ tva: 10, montantInt: 110, lignes: [{ designation: 'Dératisation', qte: 1, pu: 100 }] }));
    W.syncFactureFromIntervention(it);
    const f = W.db.factures[0];
    v('brouillon à 10 % : le prix suit (HT 200), le taux reste 10, TTC 220', [f.lignes[0].pu, f.tva, f.montantInt, Math.round(W.docTot(f).ttc * 100) / 100], [200, 10, 220, 220]);
    vrai('… aucun avis « facture émise » : un brouillon n’en reçoit pas', W.__toasts.length === 0 && journalDe(W).length === 0, [W.__toasts, journalDe(W)]); }
  { /* le taux par défaut change : un brouillon à 5,5 % ne le suit pas */
    const W = monde2(); W.db.factTva = 20; const it = interv({ id: 'i1', montant: 211, moyenPaiement: '', statut: 'planifiee' }); W.db.interventions.push(it);
    W.db.factures.push(FACT({ tva: 5.5, montantInt: 105.5, lignes: [{ designation: 'Dératisation', qte: 1, pu: 100 }] }));
    W.syncFactureFromIntervention(it);
    const f = W.db.factures[0];
    v('brouillon à 5,5 % (défaut de l’entreprise 20 %) : 211 € TTC → HT 200, taux 5,5 gardé', [f.lignes[0].pu, f.tva], [200, 5.5]); }
  { /* brouillon sans taux : il prend celui de l'entreprise, comme avant */
    const W = monde2(); const it = interv({ id: 'i1', montant: 120, moyenPaiement: '', statut: 'planifiee' }); W.db.interventions.push(it);
    const f0 = FACT({ montantInt: 60, lignes: [{ designation: 'D', qte: 1, pu: 50 }] }); delete f0.tva; W.db.factures.push(f0);
    W.syncFactureFromIntervention(it);
    v('brouillon SANS taux : HT 100 au taux de l’entreprise (20 %), le taux est posé', [W.db.factures[0].lignes[0].pu, W.db.factures[0].tva], [100, 20]); }
  { /* branche f.auto (facture auto d'avant, pas de montantInt) et branche « brouillon d'avant » : même règle */
    const W = monde2(); const it = interv({ id: 'i1', montant: 220, moyenPaiement: '', statut: 'planifiee' }); W.db.interventions.push(it);
    const f1 = FACT({ tva: 10, auto: true, lignes: [{ designation: 'D', qte: 1, pu: 100 }] }); delete f1.montantInt; W.db.factures.push(f1);
    const it2 = interv({ id: 'i2', montant: 220, moyenPaiement: '', statut: 'planifiee' }); W.db.interventions.push(it2);
    const f2 = FACT({ id: 'f2', num: 'FAC-2026-002', interventionId: 'i2', tva: 10, lignes: [{ designation: 'D', qte: 1, pu: 77 }] }); delete f2.montantInt; W.db.factures.push(f2);
    W.syncFactureFromIntervention(it); W.syncFactureFromIntervention(it2);
    v('brouillon f.auto à 10 % : HT 200, taux 10', [W.db.factures[0].lignes[0].pu, W.db.factures[0].tva], [200, 10]);
    v('brouillon d’avant (une ligne, pas de montantInt) à 10 % : HT 200, taux 10', [W.db.factures[1].lignes[0].pu, W.db.factures[1].tva], [200, 10]); }

  console.log('\n── 3150 · 1 bis. B1 — une facture ÉMISE ne bouge JAMAIS, et on le dit ──');
  const ETATS = [['envoyee', 'envoyée'], ['payee', 'payée'], ['retard', 'en retard']];
  let emisesJouees = 0;
  for (const [st, nom] of ETATS) {
    /* le prix passe de 100 à 125 € TTC ; la facture a été émise à 10 % (HT 90,91) */
    const W = monde2(); const it = interv({ id: 'i1', montant: 125, moyenPaiement: '', statut: 'terminee', aFacturer: true }); W.db.interventions.push(it);
    W.db.factures.push(FACT({ statut: st, tva: 10, montantInt: 100, lignes: [{ designation: 'Dératisation', qte: 1, pu: 90.91 }] }));
    const f = W.db.factures[0], avant = empreinte(W, f); emisesJouees++;
    W.syncFactureFromIntervention(it);
    vrai(`[${nom}] population : la facture est bien émise et le prix a bien changé (100 → 125)`, W.docEmis(f) && f.montantInt === 100 && it.montant === 125);
    v(`⛔ [${nom}] lignes, TVA, montantInt, client, numéro et total : INCHANGÉS`, empreinte(W, f), avant);
    vrai(`[${nom}] le toast nomme le numéro, l’ancien et le nouveau prix, et l’avoir`, W.__toasts.length === 1 && /FAC-2026-001/.test(W.__toasts[0]) && /100\.00 €/.test(W.__toasts[0]) && /125\.00 €/.test(W.__toasts[0]) && /déjà émise/.test(W.__toasts[0]) && /avoir/.test(W.__toasts[0]), W.__toasts);
    const j = journalDe(W);
    vrai(`[${nom}] une ligne de journal nomme le NUMÉRO et les deux montants`, j.length === 1 && /FAC-2026-001/.test(j[0][1]) && /100\.00 €/.test(j[0][1]) && /125\.00 €/.test(j[0][1]) && j[0][2] === 'finance', j);
    W.syncFactureFromIntervention(it); W.syncFactureFromIntervention(it);
    vrai(`[${nom}] l’avis ne se répète pas à chaque enregistrement de l’intervention (1 toast, 1 ligne)`, W.__toasts.length === 1 && journalDe(W).length === 1, [W.__toasts.length, journalDe(W).length]);
    v(`[${nom}] … et la facture est toujours intacte après trois passages`, empreinte(W, f), avant);
  }
  { /* branche f.auto, émise : le cas qui réécrivait sans même comparer les prix */
    const W = monde2(); const it = interv({ id: 'i1', montant: 150, moyenPaiement: '', statut: 'terminee', aFacturer: true }); W.db.interventions.push(it);
    const f0 = FACT({ statut: 'envoyee', tva: 10, auto: true, lignes: [{ designation: 'D', qte: 1, pu: 100 }] }); delete f0.montantInt; W.db.factures.push(f0);
    const avant = empreinte(W, f0); emisesJouees++;
    W.syncFactureFromIntervention(it);
    v('⛔ facture auto ÉMISE (sans montantInt) : inchangée', empreinte(W, f0), avant);
    vrai('… et le prix d’origine dit est le total remis au client (110,00 €)', /110\.00 €/.test(W.__toasts[0] || '') && /150\.00 €/.test(W.__toasts[0] || ''), W.__toasts); }
  { /* « brouillon d'avant » devenu émis (une ligne, pas de montantInt, pas f.auto) */
    const W = monde2(); const it = interv({ id: 'i1', montant: 150, moyenPaiement: '', statut: 'terminee', aFacturer: true }); W.db.interventions.push(it);
    const f0 = FACT({ statut: 'payee', tva: 10, lignes: [{ designation: 'D', qte: 1, pu: 100 }] }); delete f0.montantInt; W.db.factures.push(f0);
    const avant = empreinte(W, f0); emisesJouees++;
    W.syncFactureFromIntervention(it);
    v('⛔ facture d’avant, une ligne, payée : inchangée', empreinte(W, f0), avant); }
  { /* le prix ne change pas : aucun avis, rien ne bouge */
    const W = monde2(); const it = interv({ id: 'i1', montant: 110, moyenPaiement: '', statut: 'terminee', aFacturer: true }); W.db.interventions.push(it);
    W.db.factures.push(FACT({ statut: 'envoyee', tva: 10, montantInt: 110, lignes: [{ designation: 'D', qte: 1, pu: 100 }] }));
    W.syncFactureFromIntervention(it);
    vrai('prix inchangé : ni toast ni journal sur la facture émise', W.__toasts.length === 0 && journalDe(W).length === 0, [W.__toasts, journalDe(W)]); }
  { /* le client de la fiche change : la facture émise garde le sien (il est écrit sur le PDF remis) */
    const W = monde2(); const it = interv({ id: 'i1', montant: 110, clientId: 'cl2', moyenPaiement: '', statut: 'terminee', aFacturer: true }); W.db.interventions.push(it);
    W.db.factures.push(FACT({ statut: 'envoyee', tva: 10, montantInt: 110, lignes: [{ designation: 'D', qte: 1, pu: 100 }] }));
    W.syncFactureFromIntervention(it);
    v('⛔ facture émise : le client écrit sur le document ne suit pas la fiche de l’intervention', W.db.factures[0].clientId, 'cl1'); }
  { /* jamais d'exception sans interface : ni toast ni logEvent */
    const W = monde2(); const it = interv({ id: 'i1', montant: 125, moyenPaiement: '', statut: 'terminee', aFacturer: true }); W.db.interventions.push(it);
    W.db.factures.push(FACT({ statut: 'payee', tva: 10, montantInt: 100, lignes: [{ designation: 'D', qte: 1, pu: 90.91 }] }));
    W.exec('toast=undefined; logEvent=undefined;');
    let erreur = null; try { W.syncFactureFromIntervention(it); } catch (e) { erreur = String(e); }
    v('⛔ sans interface (ni toast ni journal) : aucune exception, la facture reste intacte', [erreur, W.db.factures[0].lignes[0].pu, W.db.factures[0].tva], [null, 90.91, 10]); }
  { /* le passage de statut vers l'avant ne change pas : brouillon → envoyée → payée */
    const W = monde2(); const it = interv({ id: 'i1', montant: 120, moyenPaiement: '', statut: 'planifiee' }); W.db.interventions.push(it);
    W.syncFactureFromIntervention(it);
    v('création : un brouillon', W.db.factures.map(f => f.statut), ['brouillon']);
    it.statut = 'terminee'; it.aFacturer = true; W.syncFactureFromIntervention(it);
    v('intervention terminée à facturer : la facture passe « envoyée »', W.db.factures.map(f => f.statut), ['envoyee']);
    const ttc = Math.round(W.docTot(W.db.factures[0]).ttc * 100) / 100;
    it.aFacturer = false; it.moyenPaiement = 'C) Espèces'; W.syncFactureFromIntervention(it, { cloture: true });
    v('payée sur place ensuite : « payée », le montant n’a pas bougé', [W.db.factures[0].statut, Math.round(W.docTot(W.db.factures[0]).ttc * 100) / 100, W.db.factures[0].datePaiement ? true : false], ['payee', ttc, true]);
    it.statut = 'planifiee'; W.syncFactureFromIntervention(it);
    v('on ne redescend jamais (payée reste payée)', W.db.factures[0].statut, 'payee'); }
  vrai('⛔ population : au moins 5 cas de facture émise ont été jouées avant de croire « rien n’a bougé »', emisesJouees >= 5, emisesJouees);

  console.log('\n── 3150 · 1 ter. même défaut, autre porte — le groupe « à facturer » émis ne se complète pas ──');
  { const W = monde2();
    const i1 = interv({ id: 'i1', montant: 60, moyenPaiement: '', aFacturer: true, statut: 'terminee', date: '2026-10-16', techId: 'tK' });
    const i2 = interv({ id: 'i2', titre: 'Autre passage', montant: 60, moyenPaiement: '', aFacturer: true, statut: 'terminee', date: '2026-10-16', techId: 'tK' });
    W.db.interventions.push(i1);
    W.factureAFacturer('2026-10-16', 'tK', 'uA');
    const g = W.db.factures[0]; const avant = empreinte(W, g);
    vrai('population : le groupe existe, avec la première intervention', W.db.factures.length === 1 && g.aFacturer && g.lignes.length === 1, W.db.factures.length);
    W.db.interventions.push(i2); g.statut = 'envoyee';   // le groupe est parti chez le client
    W.factureAFacturer('2026-10-16', 'tK', 'uA');
    v('⛔ le groupe ENVOYÉ n’a gagné aucune ligne', empreinte(W, g), avant);
    vrai('… la seconde intervention a sa propre facture (brouillon), la première n’est pas doublée', W.db.factures.length === 2 && W.db.factures[1].statut === 'brouillon' && W.db.factures[1].interIds.join() === 'i2', W.db.factures.map(f => [f.num, f.statut, f.interIds])); }

  /* ═════════════════════════════ 2. B2 — LA SUPPRESSION ═════════════════════════════ */
  console.log('\n── 3150 · 2. B2 — delFacture : un brouillon part (journal : numéro + montant), une émise reste ──');
  { const W = monde2(); W.db.factures.push(FACT({ id: 'fb', num: 'FAC-2026-007', tva: 20, lignes: [{ designation: 'D', qte: 2, pu: 50 }] }));
    W.delFacture('fb');
    v('brouillon supprimé', W.db.factures.length, 0);
    const j = journalDe(W);
    vrai('⛔ le journal écrit le NUMÉRO et le montant (120,00 € TTC), pas l’identifiant interne', j.length === 1 && j[0][0] === 'Facture supprimée' && /FAC-2026-007/.test(j[0][1]) && /120\.00 €/.test(j[0][1]) && !/\bfb\b/.test(j[0][1]), j);
    vrai('… la question d’avant est posée', W.__confirms.length === 1 && /Supprimer cette facture/.test(W.__confirms[0]), W.__confirms); }
  for (const [st, nom] of ETATS) {
    const W = monde2(); W.db.factures.push(FACT({ id: 'fe', num: 'FAC-2026-009', statut: st }));
    W.db.registres.push({ id: 'r1', montant: 120, mode: 'VIR', interId: '', factureId: 'fe' });
    W.delFacture('fe');
    vrai(`population : la facture ${nom} était bien là, avec sa ligne de registre`, true);
    v(`⛔ [${nom}] la facture est TOUJOURS là, avec sa ligne de registre`, [W.db.factures.length, W.db.registres.length], [1, 1]);
    vrai(`[${nom}] message : le numéro, « émise », « ne se supprime pas », la numérotation continue, l’avoir`, W.__toasts.length === 1 && /FAC-2026-009/.test(W.__toasts[0]) && /est émise/.test(W.__toasts[0]) && /ne se supprime pas/.test(W.__toasts[0]) && /numérotation/.test(W.__toasts[0]) && /avoir/.test(W.__toasts[0]), W.__toasts);
    vrai(`[${nom}] aucune confirmation demandée, aucune suppression au journal`, W.__confirms.length === 0 && journalDe(W).length === 0, [W.__confirms, journalDe(W)]);
  }
  { const W = monde2({ confirme: false }); W.db.factures.push(FACT({ id: 'fb', statut: 'brouillon' }));
    W.delFacture('fb'); v('brouillon, confirmation refusée : rien ne change', [W.db.factures.length, journalDe(W).length], [1, 0]); }
  { const W = monde2({ droits: { 'ventes.supprimer': false } }); W.db.factures.push(FACT({ id: 'fb', statut: 'brouillon' }));
    W.delFacture('fb'); v('sans la case Ventes › Supprimer : refusé comme avant', [W.db.factures.length, W.__toasts.length], [1, 1]); }

  console.log('\n── 3150 · 2 bis. B2 — les AUTRES portes (recensement) ──');
  /* a. la suppression générique */
  { const W = monde2(); W.db.factures.push(FACT({ id: 'fe', num: 'FAC-2026-009', statut: 'envoyee' }), FACT({ id: 'fb', num: 'FAC-2026-010', statut: 'brouillon' }));
    W.db.devis = [{ id: 'd1', num: 'DEV-2026-001' }];
    W.delItem('factures', 'fe');
    v('⛔ delItem(factures) : une émise reste', W.db.factures.map(f => f.id), ['fe', 'fb']);
    W.delItem('factures', 'fb');
    v('delItem(factures) : un brouillon part (par delFacture)', W.db.factures.map(f => f.id), ['fe']);
    vrai('… et le journal écrit le numéro, pas « factures »', journalDe(W).some(l => l[0] === 'Facture supprimée' && /FAC-2026-010/.test(l[1])), journalDe(W));
    W.delItem('devis', 'd1');
    v('un devis se supprime toujours par le générique (rien d’autre n’a changé)', W.db.devis.length, 0); }
  /* b. supprimer une intervention ou une série n'emporte pas sa facture */
  { const W = monde2(); const it = interv({ id: 'i1', montant: 100, statut: 'terminee', moyenPaiement: '' }); W.db.interventions.push(it);
    W.db.factures.push(FACT({ id: 'fe', statut: 'envoyee' })); const avant = empreinte(W, W.db.factures[0]);
    W.delIntDo('i1');
    vrai('population : l’intervention est bien partie (archivée)', W.db.interventions.length === 0 && W.db.interventionsArchive.length === 1, W.db.interventions.length);
    v('⛔ supprimer l’intervention : sa facture émise est intacte', [W.db.factures.length, empreinte(W, W.db.factures[0])], [1, avant]);
    const j = interv({ id: 'i2', montant: 100, statut: 'terminee', moyenPaiement: '', groupId: 'g1', passageNum: 1 }), k = interv({ id: 'i3', montant: 100, statut: 'planifiee', moyenPaiement: '', groupId: 'g1', passageNum: 2 });
    W.db.interventions.push(j, k); W.db.factures.push(FACT({ id: 'fe2', num: 'FAC-2026-002', interventionId: 'i2', statut: 'payee' }));
    W.delSerieDo('i2', true);
    v('⛔ supprimer une série : la facture émise du passage est intacte', W.db.factures.map(f => f.id), ['fe', 'fe2']); }
  /* c. supprimer un client */
  { const W = monde2(); W.db.clients = [{ id: 'cl1', nom: 'Boulangerie Dupont' }]; W.db.factures.push(FACT({ id: 'fe', statut: 'envoyee' }));
    W.delItem('clients', 'cl1');
    v('⛔ supprimer un client : ses factures restent (la fiche part, pas le document)', [W.db.clients.length, W.db.factures.length], [0, 1]);
    vrai('… et la confirmation le dit, factures comprises', W.__confirms.length === 1 && /facture/i.test(W.__confirms[0]), W.__confirms); }
  /* d. la remise à zéro */
  { const W = monde2(); W.exec('_razChoix={vente:true};');
    W.db.devis = [{ id: 'd1' }]; W.db.contrats = [{ id: 'c1' }]; W.db.telecollectes = [{ id: 't1' }]; W.db.enveloppes = [{ id: 'e1' }];
    W.db.factures.push(FACT({ id: 'fa', num: 'FAC-2026-001', statut: 'envoyee' }), FACT({ id: 'fb', num: 'FAC-2026-002', statut: 'payee' }), FACT({ id: 'fc', num: 'FAC-2026-003', statut: 'retard' }), FACT({ id: 'fd', num: 'FAC-2026-004', statut: 'brouillon' }));
    v('population : la remise à zéro compte 3 factures émises à garder', W.facturesAGarder().map(f => f.id), ['fa', 'fb', 'fc']);
    W.razAppliquer();
    v('⛔ remise à zéro « devis, factures et contrats » : les 3 émises restent, le brouillon part', W.db.factures.map(f => f.id), ['fa', 'fb', 'fc']);
    v('… devis, contrats, télécollectes et enveloppes partent', [W.db.devis.length, W.db.contrats.length, W.db.telecollectes.length, W.db.enveloppes.length], [0, 0, 0, 0]);
    vrai('… le journal et le toast disent combien de factures émises sont conservées', journalDe(W).some(l => /3 factures émises conservées/.test(l[1])) && W.__toasts.some(t => /3 factures émises conservées/.test(t)), journalDe(W)); }
  { const W = monde2(); W.exec('_razChoix={vente:false, mouv:true};'); W.db.factures.push(FACT({ id: 'fa', statut: 'envoyee' }), FACT({ id: 'fd', num: 'FAC-2026-004', statut: 'brouillon' }));
    W.razAppliquer(); v('case « factures » décochée : aucune facture ne bouge', W.db.factures.length, 2); }
  { const W = monde2(); const ligneVente = (W.exec('RAZ_LIGNES')).find(l => l.k === 'vente');
    W.db.devis = [{ id: 'd' }]; W.db.factures.push(FACT({ id: 'fa', statut: 'envoyee' }), FACT({ id: 'fd', num: 'FAC-2026-004', statut: 'brouillon' }));
    v('l’écran compte ce qui partira vraiment (1 devis + 1 brouillon, pas l’émise)', ligneVente.n(), 2);
    vrai('… et il dit que les factures émises sont conservées', /ÉMISES/.test(ligneVente.d) && /CONSERVÉES/.test(ligneVente.d), ligneVente.d); }
  /* e. la mise en production */
  { const W = monde2(); W.db.clients = [{ id: 'cl1' }]; W.db.devis = [{ id: 'd1' }];
    W.db.factures.push(FACT({ id: 'fa', num: 'FAC-2026-001', statut: 'payee' }), FACT({ id: 'fd', num: 'FAC-2026-004', statut: 'brouillon' }));
    W.resetProdWipe();
    v('⛔ mise en production : la facture émise reste, le brouillon part, le reste est effacé', [W.db.factures.map(f => f.id), W.db.clients.length, W.db.devis.length], [['fa'], 0, 0]);
    vrai('… le journal le dit', journalDe(W).some(l => l[0] === 'Mise en production' && /1 facture émise conservée/.test(l[1])), journalDe(W)); }
  vrai('… et la fenêtre de confirmation dit que les factures émises sont conservées', /factures déjà émises<\/b>/.test(fonction('resetProduction')), '');
  /* f. ce qui est laissé, et pourquoi */
  { const W = monde2(); W.db.interventions.push(interv({ id: 'id', demo: 'compta' }), interv({ id: 'ir' }));
    W.db.factures.push(FACT({ id: 'fdemo', num: 'FAC-DEMO', demo: 'compta', interventionId: 'id', statut: 'payee' }), FACT({ id: 'freel', num: 'FAC-2026-001', interventionId: 'ir', statut: 'envoyee' }));
    W.demoComptaRetire(true);
    v('laissé : « retirer la journée d’essai » (comptabilité) ne retire QUE ce qui porte `demo` — la vraie facture émise reste', W.db.factures.map(f => f.id), ['freel']); }
  { const W = monde2(); W.db.interventions.push(interv({ id: 'id', demo: 'tele' }), interv({ id: 'ir' }));
    W.db.factures.push(FACT({ id: 'fdemo', num: 'FAC-DEMO', demo: 'tele', interventionId: 'id', statut: 'envoyee' }), FACT({ id: 'freel', num: 'FAC-2026-001', interventionId: 'ir', statut: 'payee' }));
    W.demoTeleRetire(true);
    v('laissé : « retirer la journée d’essai » (télécollecte) : idem', W.db.factures.map(f => f.id), ['freel']); }
  vrai('laissé : « Vider les données » de la bêta est gardé par BETA_ESSAI (outil de bêta, données d’essai)', /if\(!betaOutils\(\)\) return;/.test(BETA_VIDER) && /function betaOutils\(\)\{ return BETA_ESSAI===true; \}/.test(SRC), BETA_VIDER.slice(0, 80));
  /* g. recensement par le texte : aucune ligne de code, hors celles-ci, ne retire une facture */
  { const CODE_SEUL = SRC;
    const motifs = [/db\.factures\s*=\s*\(db\.factures\|\|\[\]\)\.filter\(/g, /db\.factures\s*=\s*\[\]/g, /db\.factures\s*=\s*gardees/g, /db\[coll\]\s*=\s*db\[coll\]\.filter\(/g, /factures\.splice\(/g, /\bdb\[k\]=\[\]/g];
    const nb = motifs.map(m => (CODE_SEUL.match(m) || []).length);
    /* attendus : delFacture (1 filtre) + demoComptaRetire + demoTeleRetire (2 filtres) = 3 ; aucun `= []` direct ; 2 `= gardees` (RAZ, mise en production) ;
       delItem (1, générique, qui ne reçoit plus jamais « factures » : redirigé en tête) ; aucun splice ; 1 `db[k]=[]` (mise en production, suivi de `= gardees`) */
    v('⛔ recensement du texte : les seules lignes de code qui retirent une facture sont celles examinées ici', nb, [3, 0, 2, 1, 0, 1]);
    vrai('… `delItem` redirige « factures » vers delFacture AVANT son générique', fonction('delItem').indexOf("if(coll==='factures'){ delFacture(id); return; }") > 0 && fonction('delItem').indexOf("if(coll==='factures'){ delFacture(id); return; }") < fonction('delItem').indexOf('db[coll]=db[coll].filter'), ''); }

  /* ═════════════════════════════ 3. B4 — L'ENVOI AUTOMATIQUE EST UN CHOIX ═════════════════════════════ */
  console.log('\n── 3150 · 3. B4 — la facture réglée sur place ne part que si l’entreprise l’a choisi ──');
  const cloturerPayee = async (reglage, fois) => {
    const W = monde2(reglage === 'absent' ? { db: { interventions: [], factures: [], registres: [], clients: [{ id: 'cl1', nom: 'Boulangerie Dupont', email: 'dupont@example.org' }], devis: [], users: [], techniciens: [] } } : {});
    if (reglage !== 'absent') W.db.factAuto = reglage;
    const it = interv({ id: 'i1', montant: 120, statut: 'planifiee', moyenPaiement: '' }); W.db.interventions.push(it);
    W.syncFactureFromIntervention(it);
    it.statut = 'terminee'; it.moyenPaiement = 'C) Espèces';
    for (let n = 0; n < (fois || 1); n++) { W.syncFactureFromIntervention(it, { cloture: true }); await attendre(); }
    return W;
  };
  { const W = await cloturerPayee('absent');
    vrai('population : la facture existe et est payée (la clôture a bien eu lieu)', W.db.factures.length === 1 && W.db.factures[0].statut === 'payee', W.db.factures.map(f => f.statut));
    v('⛔ réglage ABSENT (le cas de toute entreprise qui n’a rien choisi) : aucun courriel', [W.__mails.length, W.db.factAuto], [0, undefined]);
    vrai('… la facture n’est pas marquée « envoyée au client » (mailEnvoye)', !W.db.factures[0].mailEnvoye, W.db.factures[0].mailEnvoye); }
  { const W = await cloturerPayee(false); v('réglage désactivé (false) : aucun courriel', W.__mails.length, 0); }
  { const W = await cloturerPayee(null); v('réglage null : aucun courriel', W.__mails.length, 0); }
  { const W = await cloturerPayee('true'); v('réglage « true » en texte : aucun courriel (seul le booléen vrai active)', W.__mails.length, 0); }
  { const W = await cloturerPayee(true);
    vrai('réglage ACTIVÉ (true) : UN courriel, à l’adresse du client, avec le numéro de la facture', W.__mails.length === 1 && W.__mails[0].to === 'dupont@example.org' && /FAC-2026-001/.test(W.__mails[0].sujet), W.__mails);
    vrai('… et il reprend le taux et le total de la facture (120,00 € TTC)', /TVA 20% : 20\.00 €/.test(W.__mails[0].corps) && /Total TTC : 120\.00 €/.test(W.__mails[0].corps), W.__mails[0].corps); }
  { const W = await cloturerPayee(true, 3); v('réglage activé, trois clôtures de suite : toujours UN seul courriel', W.__mails.length, 1); }
  { const W = monde2(); delete W.db.factAuto; const f = FACT({ statut: 'payee' }); const it = interv({ id: 'i1' }); W.db.factures.push(f);
    W.factureMailPayee(f, it); await attendre();
    v('appel direct de factureMailPayee, réglage absent : aucun courriel (la garde est aussi dans la fonction)', W.__mails.length, 0);
    W.db.factAuto = true; W.factureMailPayee(f, it); await attendre();
    v('… réglage activé : il part', W.__mails.length, 1); }
  v('factAutoActif : seul le booléen true active', [undefined, null, false, 0, 1, 'true', 'oui', {}, true].map(x => { const W = monde2(); W.db.factAuto = x; return W.factAutoActif(); }), [false, false, false, false, false, false, false, false, true]);
  vrai('⛔ plus aucune lecture de `factAuto` en dehors de factAutoActif et du réglage (fini le « !==false » / « ===false »)', !/factAuto\s*[!=]==\s*false/.test(SRC) && (SRC.match(/factAuto/g) || []).length <= 12, (SRC.match(/factAuto/g) || []).length);

  console.log('\n── 3150 · 3 bis. B4 — l’écran du réglage ──');
  { const W = monde2(); delete W.db.factAuto; W.factReglagesModal(); const h = W.exec('__html');
    vrai('par défaut : « désactivé », la case n’est pas cochée', /Envoi automatique : <span id="fa-etat">désactivé<\/span>/.test(h) && !/id="fa-auto" checked/.test(h), h.slice(0, 200));
    vrai('… il dit ce que fait le réglage (facture déjà Payée, par e-mail, avec son PDF, sans relecture)', /Payée/.test(h) && /e-mail/.test(h) && /PDF/.test(h) && /sans que personne la relise/.test(h), '');
    vrai('… et le taux de TVA appliqué (20 %, par défaut — aucun réglage n’a été fait)', /<b>20 %<\/b> \(taux par défaut/.test(h), h.match(/Taux de TVA[^<]*<b>[^<]*<\/b>[^.]*/) );
    vrai('… avec la consigne de vérifier le taux AVANT d’activer', /Avant d.activer l.envoi, vérifie/.test(h), ''); }
  { const W = monde2(); W.db.factTva = 10; W.db.factAuto = true; W.factReglagesModal(); const h = W.exec('__html');
    vrai('réglage activé + taux 10 : « activé », case cochée, « 10 % » sans « par défaut »', /<span id="fa-etat">activé<\/span>/.test(h) && /id="fa-auto" checked/.test(h) && /<b>10 %<\/b>\./.test(h), h.slice(0, 300)); }
  { const W = monde2(); W.exec('__els={"fa-auto":{checked:true}};'); W.factReglagesSave();
    v('enregistrer avec la case cochée : factAuto vaut true, une ligne de journal, un toast', [W.db.factAuto, journalDe(W).length, W.__toasts.length], [true, 1, 1]);
    W.exec('__els={"fa-auto":{checked:false}};'); W.factReglagesSave();
    v('… décochée : factAuto vaut false (un choix explicite, pas un retour au défaut)', W.db.factAuto, false); }
  { const W = monde2({ finance: false }); delete W.db.factAuto; W.exec('__els={"fa-auto":{checked:true}};'); W.factReglagesModal(); W.factReglagesSave();
    v('⛔ sans le droit Comptabilité : ni fenêtre ni enregistrement', [W.exec('__html'), W.db.factAuto, W.__toasts.length], ['', undefined, 2]); }
  { const compta = bloc('views.comptabilite=function(');
    vrai('population : la vue Comptabilité est trouvée', compta.length > 200, compta.length);
    vrai('le réglage vit dans l’en-tête de Comptabilité (⚙ Facturation auto)', /setHeader\('Comptabilité'[^\n]*factReglagesModal\(\)/.test(compta), '');
    vrai('… et PAS dans views.parametres ni views.factures (autre branche : on n’y touche pas)', !/factReglagesModal|factAuto/.test(bloc('views.parametres=function(')) && !/factReglagesModal|factAuto/.test(bloc('views.factures=function(')), ''); }

  fin();
})().catch(e => { console.error(e); process.exit(2); });
