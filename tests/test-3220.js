/* ══ test-3220 · LE MÉTIER D'UNE INTERVENTION ET LA FACTURE QUI EN DÉCOULE (v782) ═══════════════════════════════════════════════════
   Justin, 30 octobre 2026 : « le logiciel va devoir comprendre plusieurs entreprises, voire la même mais des rôles différents : s'ils font une
   réparation de plomberie, la facture devrait être en plomberie ». Ce banc EXÉCUTE les vraies fonctions d'app.html (extraites par `bac`) :
   1. UNE entreprise à plusieurs métiers (principal + metierPlus + metierPlus2) : le métier de l'intervention se choisit (défaut : le principal) ;
   2. ⛔ une entreprise à UN SEUL métier ne voit AUCUN changement : ni champ écrit sur l'intervention, ni libellé, ni champ `metier` sur la facture,
      et la désignation de la ligne est celle d'avant, à l'octet ;
   3. la facture automatique ET « Facturer cette intervention » reprennent le métier : « Plomberie — … » en tête de la première ligne + champ `metier` ;
   4. la numérotation des factures n'en dépend pas (même numéro, mêmes totaux) ; une désignation qui dit déjà le métier n'est pas doublée ;
   5. un métier qui n'est pas celui de l'entreprise ne s'écrit jamais (formulaire falsifié, ✎ de la fiche) ; un métier déjà posé n'est jamais effacé
      par un formulaire qui n'a pas le champ (la synchro fusionne) ; les cases (« Modifier », « Ajouter ») sont lues avant toute écriture ;
   6. câblage lu dans le CODE : le sélecteur du formulaire et de la fiche n'existent que si l'entreprise a plusieurs métiers. */
'use strict';
const { bac, lire, litteral, evalue } = require('./metiers-outils.js');
const INT_CHAMPS_FICHE = evalue(litteral(lire('app.html').N, 'const INT_CHAMPS_FICHE=['));
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

const NOMS = ['metiersPlusDe', 'metierActifs', 'metierId', 'intMetierMulti', 'intMetierDe', 'metierCourt', 'intMetierLibelle', 'intMetierDesignation', 'intMetierFacture',
  'factureDeIntervention', 'intTvaFacture', 'intMontantHT', 'syncFactureFromIntervention', 'intGenererDoc', 'intEditField', 'saveIntervention'];
const METIERS = {
  '3d': { nom: '3D — Hygiène anti-nuisibles' }, plomberie: { nom: 'Plomberie' }, chauffage: { nom: 'Chauffage' },
  climatisation: { nom: 'Climatisation / Pompes à chaleur' }, electricite: { nom: 'Électricité' },
};
function monde(o) {
  o = o || {};
  const traces = { saves: 0, toasts: [], rendus: [], refus: [] }, seq = { n: 0 };
  const db = Object.assign({ metier: 'plomberie', metierPlus: '', metierPlus2: '', clients: [{ id: 'c1', nom: 'Client Test' }], interventions: [], factures: [], devis: [], techniciens: [], registres: [] }, o.db || {});
  const form = Object.assign({ titre: 'Fuite sous évier', clientId: 'c1', date: '2026-10-30', heure: '09:00', duree: '60', montant: '120', statut: 'planifiee', type: '' }, o.form || {});
  class FormData { constructor() { } [Symbol.iterator]() { return Object.entries(form)[Symbol.iterator](); } }
  const init = {
    db, METIERS, FormData, INT_CHAMPS_FICHE, currentUser: { id: 'u1', role: 'admin' }, current: 'interventions',
    uid: () => 'id' + (++seq.n), todayISO: () => '2026-10-30', docNum: kind => (kind === 'factures' ? 'FAC-2026-' : 'DEV-2026-') + String(db[kind].length + 1).padStart(3, '0'),
    permGarde: (cat, act) => { if (o.refuse && o.refuse.indexOf(cat + ':' + act) >= 0) { traces.refus.push(cat + ':' + act); return false; } return true; },
    userSeesModule: () => true, canCat: () => true, can: () => true, clientPropose: () => true,
    save: () => { traces.saves++; }, toast: t => traces.toasts.push(t), closeModal: () => { }, go: () => { }, logEvent: () => { }, renderIntDetail: id => traces.rendus.push(id),
    factFilter: '', intNum: () => 'INT-2026-001', intHisto: () => { }, planStamp: () => { }, notifyTechNewInt: () => { }, intNuis: [], intMeth: [], intTrait: {}, _intReport: null,
    document: { querySelectorAll: () => [], getElementById: () => null }, e: null, intRegistreEncaisse: () => { }, factureMailPayee: () => { },
    techForClient: () => null, techName: () => '', keyForClient: () => '', techForKey: () => null, intConflictOf: () => null, absentOn: () => null,
    parseInt, produit: () => ({}), prodLineUnit: () => '', stockConv: q => q, cvcFormLire: () => { }, toMin: () => 0, champManque: () => { },
    intRepasseNonTerminee: () => '', fmtShort: x => x, keyLabel: x => x,
  };
  const B = bac('app.html', NOMS, init);
  return { fn: B.fn, db, traces, vus: B.vus, ev: { preventDefault() { }, target: {} } };
}
const creer = (W) => { W.fn.saveIntervention(W.ev, null); return W.db.interventions[W.db.interventions.length - 1]; };

console.log('── 1. les fonctions pures ──');
{
  let W = monde({ db: { metierPlus: 'chauffage', metierPlus2: 'climatisation' } });
  vrai('trois métiers : plusieurs = vrai', W.fn.intMetierMulti() === true);
  egal('sans champ : le métier de l\'intervention est le PRINCIPAL', W.fn.intMetierDe({}), 'plomberie');
  egal('le métier posé et connu de l\'entreprise est lu', W.fn.intMetierDe({ metier: 'climatisation' }), 'climatisation');
  egal('⛔ un métier qui n\'est plus (ou n\'a jamais été) celui de l\'entreprise se lit « le principal »', [W.fn.intMetierDe({ metier: 'electricite' }), W.fn.intMetierDe({ metier: '__proto__' }), W.fn.intMetierDe({ metier: 42 })], ['plomberie', 'plomberie', 'plomberie']);
  egal('libellé court : « Climatisation / Pompes à chaleur » devient « Climatisation », « 3D — … » ne passe pas ici', [W.fn.intMetierLibelle({ metier: 'climatisation' }), W.fn.metierCourt('plomberie'), W.fn.metierCourt('zzz')], ['Climatisation', 'Plomberie', '']);
  egal('désignation : « Plomberie — Fuite »', W.fn.intMetierDesignation({}, 'Fuite sous évier'), 'Plomberie — Fuite sous évier');
  egal('… jamais doublée quand le titre le dit déjà', W.fn.intMetierDesignation({}, 'plomberie : fuite'), 'plomberie : fuite');
  W = monde();
  vrai('⛔ UN seul métier : pas plusieurs, libellé vide, désignation INCHANGÉE', W.fn.intMetierMulti() === false && W.fn.intMetierLibelle({}) === '' && W.fn.intMetierDesignation({}, 'Fuite') === 'Fuite');
  W = monde({ db: { metier: '3d' } });
  vrai('la 3D : un seul métier, jamais de libellé', W.fn.intMetierMulti() === false && W.fn.intMetierLibelle({}) === '');
}

console.log('── 2. création d\'une intervention (la vraie saveIntervention) ──');
{
  let W = monde({ db: { metierPlus: 'chauffage' }, form: { metier: 'chauffage' } });
  let it = creer(W);
  vrai('(population) l\'intervention est créée et le prix (120) est lu', !!it && it.montant === 120 && W.db.interventions.length === 1, it);
  egal('plusieurs métiers : le métier choisi est écrit sur l\'intervention', it.metier, 'chauffage');
  vrai('… et la facture automatique est « Chauffage — Fuite sous évier », du métier de l\'intervention', W.db.factures.length === 1 && W.db.factures[0].lignes[0].designation === 'Chauffage — Fuite sous évier' && W.db.factures[0].metier === 'chauffage', W.db.factures);
  W = monde({ db: { metierPlus: 'chauffage' }, form: { metier: 'plomberie' } }); creer(W);
  egal('le métier principal choisi : « Plomberie — … »', [W.db.interventions[0].metier, W.db.factures[0].lignes[0].designation], ['plomberie', 'Plomberie — Fuite sous évier']);
  W = monde({ db: { metierPlus: 'chauffage' }, form: { metier: 'electricite' } }); it = creer(W);
  vrai('⛔ formulaire falsifié (un métier que l\'entreprise n\'a pas) : rien n\'est écrit, la facture se lit au principal', it.metier === undefined && W.db.factures[0].lignes[0].designation === 'Plomberie — Fuite sous évier' && W.db.factures[0].metier === 'plomberie', [it.metier, W.db.factures[0]]);
  W = monde({ db: { metierPlus: 'chauffage' }, form: { metier: 'chauffage', montant: '' } }); it = creer(W);
  vrai('sans prix : pas de facture automatique (comme avant), le métier est quand même écrit', W.db.factures.length === 0 && it.metier === 'chauffage');
}

console.log('── 3. ⛔ UN SEUL MÉTIER : aucun changement ──');
{
  const W = monde({ form: {} }), W2 = monde({ form: { metier: 'plomberie' } });
  const it = creer(W);
  vrai('aucun champ metier sur l\'intervention (le formulaire n\'a pas de sélecteur)', !('metier' in it), Object.keys(it));
  vrai('… ni sur la facture ; désignation = le titre, à l\'octet', W.db.factures.length === 1 && !('metier' in W.db.factures[0]) && W.db.factures[0].lignes[0].designation === 'Fuite sous évier', W.db.factures[0]);
  const it2 = creer(W2);
  vrai('même un champ envoyé à la main : le métier est celui du principal (seul métier de l\'entreprise) mais la facture ne change pas', W2.db.factures[0].lignes[0].designation === 'Fuite sous évier' && !('metier' in W2.db.factures[0]), W2.db.factures[0]);
  egal('numérotation et totaux identiques avec ou sans plusieurs métiers', (() => { const A = monde({ form: {} }), B = monde({ db: { metierPlus: 'chauffage' }, form: { metier: 'chauffage' } }); creer(A); creer(B);
    const f = x => [x.db.factures[0].num, x.db.factures[0].tva, x.db.factures[0].lignes[0].pu, x.db.factures[0].lignes[0].qte, x.db.factures[0].statut]; return [f(A), f(B)]; })().map(JSON.stringify).filter((x, i, a) => a.indexOf(x) === i).length, 1);
}

console.log('── 4. « Facturer cette intervention » (intGenererDoc) ──');
{
  let W = monde({ db: { metierPlus: 'climatisation' } });
  W.db.interventions.push({ id: 'i1', titre: 'Recharge fluide', clientId: 'c1', montant: 90, metier: 'climatisation', produitsUtilises: [] });
  W.fn.intGenererDoc('i1', 'factures');
  let f = W.db.factures[0];
  vrai('la facture manuelle reprend le métier : « Climatisation — Recharge fluide » + champ metier', f && f.lignes[0].designation === 'Climatisation — Recharge fluide' && f.metier === 'climatisation' && f.interventionId === 'i1', f);
  W.fn.intGenererDoc('i1', 'factures');
  vrai('deuxième clic : pas de seconde facture (règle d\'avant intacte)', W.db.factures.length === 1, W.db.factures.length);
  W = monde(); W.db.interventions.push({ id: 'i1', titre: 'Recharge', clientId: 'c1', montant: 90, produitsUtilises: [] });
  W.fn.intGenererDoc('i1', 'factures'); f = W.db.factures[0];
  vrai('⛔ un seul métier : désignation d\'avant, aucun champ metier', f.lignes[0].designation === 'Recharge' && !('metier' in f), f);
  W = monde({ db: { metierPlus: 'chauffage' } }); W.db.interventions.push({ id: 'i1', titre: 'Sans prix', clientId: 'c1', montant: 0, produitsUtilises: [] });
  W.fn.intGenererDoc('i1', 'factures');
  vrai('sans prix ni produit : la ligne vide porte aussi le métier', W.db.factures[0].lignes[0].designation === 'Plomberie — Sans prix' && W.db.factures[0].lignes[0].pu === 0, W.db.factures[0]);
  W = monde({ db: { metierPlus: 'chauffage' } }); W.db.interventions.push({ id: 'i1', titre: 'Devis chaudière', clientId: 'c1', montant: 50, metier: 'chauffage', produitsUtilises: [] });
  W.fn.intGenererDoc('i1', 'devis');
  vrai('le devis tiré de l\'intervention aussi : « Chauffage — Devis chaudière » + champ metier', W.db.devis.length === 1 && W.db.devis[0].lignes[0].designation === 'Chauffage — Devis chaudière' && W.db.devis[0].metier === 'chauffage', W.db.devis);
}

console.log('── 5. écritures : cases lues, rien d\'effacé ──');
{
  let W = monde({ db: { metierPlus: 'chauffage' }, refuse: ['int:ajouter'], form: { metier: 'chauffage' } });
  W.fn.saveIntervention(W.ev, null);
  vrai('création sans la case « Ajouter » : rien n\'est écrit', W.db.interventions.length === 0 && W.db.factures.length === 0 && W.traces.saves === 0, W.traces);
  W = monde({ db: { metierPlus: 'chauffage' }, form: { metier: 'chauffage' } }); creer(W);
  const id = W.db.interventions[0].id;
  W.form = null;
  const W2 = monde({ db: Object.assign({}, W.db, { interventions: W.db.interventions, factures: W.db.factures }), form: { titre: 'Fuite sous évier (suite)', clientId: 'c1', date: '2026-10-30', montant: '120' } });
  W2.fn.saveIntervention(W2.ev, id);
  vrai('⛔ un formulaire SANS le champ métier ne l\'efface pas (fusion)', W2.db.interventions[0].metier === 'chauffage' && W2.db.interventions[0].titre === 'Fuite sous évier (suite)', W2.db.interventions[0]);
  W2.fn.intEditField(id, 'metier', 'plomberie');
  egal('✎ de la fiche : un métier de l\'entreprise s\'écrit', W2.db.interventions[0].metier, 'plomberie');
  const sv = W2.traces.saves; W2.fn.intEditField(id, 'metier', 'electricite');
  vrai('✎ de la fiche : un métier que l\'entreprise n\'a pas est refusé, rien n\'est enregistré', W2.db.interventions[0].metier === 'plomberie' && W2.traces.saves === sv, [W2.db.interventions[0].metier, W2.traces.saves - sv]);
  const W3 = monde({ db: { metierPlus: 'chauffage', interventions: [{ id: 'x', titre: 'T', clientId: 'c1', metier: 'plomberie' }] }, refuse: ['int:modifier'] });
  W3.fn.intEditField('x', 'metier', 'chauffage');
  vrai('✎ sans la case « Modifier » (INT_CHAMPS_FICHE) : refusé', W3.db.interventions[0].metier === 'plomberie' && W3.traces.refus.length === 1, W3.traces.refus);
  console.log('   (dépendances muettes du banc : ' + [...W2.vus].join(', ') + ')');
  vrai('(population) aucune fonction DE LA RÈGLE n\'est restée muette dans le banc', NOMS.every(n => !W2.vus.has(n)) && !['metierActifs', 'metiersPlusDe', 'METIERS'].some(n => W2.vus.has(n)), [...W2.vus]);
}

console.log('── 6. câblage lu dans le code ──');
{
  const { N } = lire('app.html');
  const i = N.indexOf('function formIntervention('), corps = N.slice(i, N.indexOf('\nfunction saveIntervention', i));
  vrai('le formulaire n\'offre le sélecteur « Métier » que si l\'entreprise a plusieurs métiers', /\$\{\(typeof intMetierMulti==='function'&&intMetierMulti\(\)===true\)\?`<div class="frow"><span class="frow-lbl">Métier<\/span>[\s\S]*?<select name="metier">/.test(corps));
  const d = N.indexOf('function renderIntDetail('), fiche = N.slice(d, d + 60000);
  vrai('la fiche montre le métier (lecture) et le propose (édition) sous la même condition', /intMetierMulti\(\)\?`<div class="int-metier-lecture"/.test(fiche) && /intMetierMulti\(\)\?`<div class="field"[^`]*<label>Métier<\/label><select onchange="intEditField\('\$\{id\}','metier'/.test(fiche));
  vrai('INT_CHAMPS_FICHE porte « metier » (la case « Modifier » le garde)', /const INT_CHAMPS_FICHE=\[[^\]]*'metier'/.test(N));
}

console.log(`\n════ test-3220 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
