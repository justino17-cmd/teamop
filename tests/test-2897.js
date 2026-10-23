/* ══ test-2897 · CVC 3 — FLUIDES FRIGORIGÈNES : LA FICHE D'INTERVENTION ET LE CALENDRIER D'ÉTANCHÉITÉ ═══════
   Justin, 23 octobre 2026 : pour un appareil qui contient un fluide, une fiche d'intervention fluides jointe à l'intervention (type de
   fluide, quantités chargée / récupérée, contrôle d'étanchéité, résultat), la PÉRIODICITÉ du contrôle selon la charge en tonnes équivalent
   CO2, avec et sans détection de fuite, l'échéance sur l'appareil et dans Tâches / tableau de bord quand elle approche — sans prétendre
   remplacer le Cerfa officiel (l'écran le dit).

   Les seuils eux-mêmes sont gardés par test-2895 §9 (aux frontières). Ce banc EXÉCUTE le vrai bloc CVC :
     1. la fiche s'écrit DANS l'intervention : champs, bornes, droits lus dans la fonction qui écrit, historique ;
     2. qui peut en recevoir une : un appareil qui contient un fluide, cité sur l'intervention, non annulée ;
     3. l'échéance d'étanchéité SE DÉDUIT du dernier contrôle enregistré (pas d'une copie) — période de la règle, doublée avec détection ;
     4. elle paraît sur la ligne de l'appareil, dans les Tâches et sur le tableau de bord, et seulement quand elle approche ;
     5. ⛔ l'écran dit que ce n'est pas le Cerfa officiel ; la mise à l'arrêt après quatre jours ouvrés est signalée ;
     6. ouvrir un écran n'écrit pas. */
const { monter, formulaire, cdc } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

const BASE = {
  clients: [{ id: 'c1', nom: 'Boulangerie Élise', email: 'elise@exemple.fr' }, { id: 'c2', nom: 'Mme Durand' }],
  appareils: [
    { id: 'a1', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Frisquet' },
    { id: 'a2', clientId: 'c1', type: 'clim_multi', marque: 'Mitsubishi', modele: 'MXZ', fluide: 'R410A', charge: 3, miseEnService: '2022-01-15', emplacement: 'Salle' },      // 6,26 t → 12 mois
    { id: 'a3', clientId: 'c1', type: 'pac_eau', marque: 'Atlantic', fluide: 'R32', charge: 1.5, miseEnService: '2023-03-01' },                                                  // 1,01 t : pas de contrôle périodique
    { id: 'a4', clientId: 'c2', type: 'clim_split', marque: 'Daikin', fluide: 'R410A', charge: 4, detection: true, miseEnService: '2024-02-20' }],                               // 8,35 t → 24 mois (détection)
  interventions: [
    { id: 'i1', clientId: 'c1', statut: 'terminee', date: '2026-04-02', type: 'Contrôle d’étanchéité des fluides frigorigènes', appareilIds: ['a2'],
      fichesFluides: [{ id: 'f1', appareilId: 'a2', date: '2025-11-20', nature: 'Contrôle d’étanchéité', fluide: 'R410A', charge: 0, recup: 0, controle: true, resultat: 'conforme', vignette: 'bleue' }] },
    { id: 'i2', clientId: 'c1', statut: 'encours', date: '2026-10-23', type: 'Maintenance', appareilIds: ['a1', 'a2', 'a3'] },
    { id: 'i3', clientId: 'c2', statut: 'terminee', date: '2026-08-01', appareilIds: ['a4'] },
    { id: 'i4', clientId: 'c1', statut: 'annulee', date: '2026-09-01', appareilIds: ['a2'], fichesFluides: [{ id: 'f9', appareilId: 'a2', date: '2026-09-01', controle: true, resultat: 'conforme' }] }],
  contrats: []
};
const FORM = o => formulaire(Object.assign({ date: '2026-10-23', nature: 'Contrôle d’étanchéité', fluide: 'R410A', prp: '', charge: '0,3', recup: '0', contenant: 'BT-22', bordereau: 'TD-2026-0042',
  controle: true, resultat: 'conforme', vignette: 'bleue', fuiteLieu: '', attestation: 'AC-1234', operateur: 'Tom Sonde', obs: 'RAS' }, o || {}));
const SOUMET = (W, iid, aid, fid, o) => W.cvcFicheSauver({ preventDefault() {}, target: FORM(o) }, iid, aid, fid || '');

console.log('\n── 2897 · 1. la fiche s’écrit DANS l’intervention ──');
{
  const W = monter({ db: BASE });
  SOUMET(W, 'i2', 'a2');
  const i = W.db.interventions[1], f = (i.fichesFluides || [])[0];
  vrai('une fiche est ajoutée à l’intervention (pas dans une autre collection)', !!f && i.fichesFluides.length === 1 && W.db.appareils.length === 4);
  vrai('champs numériques lus avec la virgule (0,3 kg), texte conservé', f && f.charge === 0.3 && f.recup === 0 && f.contenant === 'BT-22' && f.bordereau === 'TD-2026-0042' && f.attestation === 'AC-1234');
  vrai('le contrôle et son résultat sont gardés ; l’appareil est nommé (instantané)', f && f.controle === true && f.resultat === 'conforme' && f.vignette === 'bleue' && /Mitsubishi MXZ/.test(f.appLabel));
  vrai('historique, un save, creeLe / creePar, retour sur l’intervention', /Fiche fluides ajoutée/.test(i.histo.join('|')) && W.__saves === 1 && f.creeLe === '2026-10-23' && f.creePar === 'u1' && W.__go.includes('det:i2'));
  /* modifier */
  SOUMET(W, 'i2', 'a2', f.id, { charge: '0,5', obs: 'Corrigé' });
  vrai('modifier garde l’identifiant et ne duplique pas', i.fichesFluides.length === 1 && i.fichesFluides[0].id === f.id && i.fichesFluides[0].charge === 0.5 && i.fichesFluides[0].obs === 'Corrigé');
  /* un contrôle non coché n'emporte ni résultat ni vignette ni lieu de fuite */
  SOUMET(W, 'i2', 'a2', '', { controle: false, resultat: 'fuite_differee', vignette: 'rouge', fuiteLieu: 'raccord' });
  const g = i.fichesFluides[1];
  vrai('⛔ sans contrôle : ni résultat, ni vignette, ni localisation (une donnée sans objet fausserait l’échéance)', g && g.controle === false && g.resultat === '' && g.vignette === '' && g.fuiteLieu === '', g);
  SOUMET(W, 'i2', 'a2', '', { resultat: 'fuite_reparee', vignette: 'bleue', fuiteLieu: 'Raccord du détendeur' });
  vrai('fuite réparée : la localisation est gardée', i.fichesFluides[2].fuiteLieu === 'Raccord du détendeur' && i.fichesFluides[2].resultat === 'fuite_reparee');
  SOUMET(W, 'i2', 'a2', '', { resultat: 'conforme', fuiteLieu: 'ne devrait pas rester' });
  vrai('conforme : pas de localisation de fuite', i.fichesFluides[3].fuiteLieu === '');
  SOUMET(W, 'i2', 'a2', '', { vignette: 'verte' });
  vrai('une vignette inconnue est ignorée', i.fichesFluides[4].vignette === '');
  /* refus */
  const n = i.fichesFluides.length, sv = W.__saves;
  const essai = (nom, o, re) => { const t = W.__toasts.length; SOUMET(W, 'i2', 'a2', '', o); vrai('refus : ' + nom, i.fichesFluides.length === n && W.__saves === sv && (!re || re.test(W.__toasts.slice(t).join('|'))), W.__toasts.slice(t)); };
  essai('date invalide', { date: '23/10/2026' }, /Date/);
  essai('fluide inconnu', { fluide: 'R999' }, /fluide/);
  essai('quantité négative', { charge: '-2' }, /chargée/);
  essai('quantité récupérée absurde', { recup: '1e9' }, /récupérée/);
  essai('nature inconnue', { nature: 'Bricolage' }, /nature/);
  essai('contrôle sans résultat valide', { resultat: 'peut-être' }, /résultat/);
  /* valeurs longues */
  SOUMET(W, 'i2', 'a2', '', { contenant: 'C'.repeat(500), bordereau: 'B'.repeat(500), obs: 'O'.repeat(5000), operateur: 'P'.repeat(500), attestation: 'A'.repeat(500) });
  const L = i.fichesFluides[n];
  vrai('textes coupés aux bornes (80 / 80 / 600 / 120 / 80)', L.contenant.length === 80 && L.bordereau.length === 80 && L.obs.length === 600 && L.operateur.length === 120 && L.attestation.length === 80);
  /* supprimer */
  const nn = i.fichesFluides.length; W.cvcFicheSupprimer('i2', f.id);
  vrai('supprimer retire la fiche (après confirmation)', i.fichesFluides.length === nn - 1 && !i.fichesFluides.some(k => k.id === f.id));
  vrai('… et laisse une ligne d’historique', /Fiche fluides supprimée/.test(i.histo.join('|')));
  SOUMET(W, 'i2', 'a2', '', { prp: '2088' });
  vrai('le PRP de la plaque saisi sur la fiche est gardé', i.fichesFluides[i.fichesFluides.length - 1].prp === 2088);
  /* droits */
  const D = monter({ db: BASE, droits: { 'int.modifier': false } });
  SOUMET(D, 'i2', 'a2');
  vrai('⛔ « Interventions → Modifier » est lue DANS la fonction qui écrit', !D.db.interventions[1].fichesFluides && D.__saves === 0 && /pas autorisé/.test(D.__toasts.join('|')));
  D.cvcFicheSupprimer('i1', 'f1');
  vrai('⛔ … et pour supprimer', D.db.interventions[0].fichesFluides.length === 1);
  D.cvcFicheForm('i2', 'a2');
  vrai('… et pour ouvrir le formulaire', D.__modals.length === 0);
}

console.log('\n── 2897 · 2. qui peut recevoir une fiche fluides ──');
{
  const W = monter({ db: BASE });
  const refus = (nom, iid, aid, re) => { const t = W.__toasts.length, r = W.cvcFicheCtx(iid, aid); vrai('refus : ' + nom, r === null && re.test(W.__toasts.slice(t).join('|')), W.__toasts.slice(t)); };
  refus('une chaudière ne contient pas de fluide frigorigène', 'i2', 'a1', /ne contient pas de fluide/);
  refus('appareil non cité', 'i3', 'a2', /pas cité/);
  refus('appareil d’un autre client', 'i2', 'a4', /pas cité/);
  refus('intervention annulée', 'i4', 'a2', /annulée/);
  vrai('pompe à chaleur / climatiseur cités : accordée', !!W.cvcFicheCtx('i2', 'a2') && !!W.cvcFicheCtx('i2', 'a3'));
  const t = W.__toasts.length; W.cvcFicheForm('i2', 'a1');
  vrai('le formulaire ne s’ouvre pas pour une chaudière', W.__modals.length === 0);
  W.cvcFicheForm('i2', 'a2', 'fX');
  vrai('une fiche disparue se dit', /n’existe plus/.test(W.__toasts.join('|')) && W.__modals.length === 0);
}

console.log('\n── 2897 · 3. l’échéance d’étanchéité se DÉDUIT du dernier contrôle ──');
{
  const W = monter({ db: BASE });
  const ap = id => W.db.appareils.find(a => a.id === id);
  v('a2 (R410A 3 kg = 6,26 t → 12 mois) : dernier contrôle 20/11/2025 → 20/11/2026', (({ date, base, depuis, mois }) => ({ date, base, depuis, mois }))(W.cvcEtancheiteEcheance(ap('a2'))), { date: '2026-11-20', base: 'controle', depuis: '2025-11-20', mois: 12 });
  vrai('⛔ le contrôle d’une intervention ANNULÉE ne compte pas (f9 du 01/09/2026)', W.cvcEtancheiteDernier(ap('a2')).id === 'f1');
  v('a3 (R32 1,5 kg = 1,01 t) : pas de contrôle périodique, donc pas d’échéance', W.cvcEtancheiteEcheance(ap('a3')), null);
  v('a1 (chaudière, aucun fluide) : rien', W.cvcEtancheiteEcheance(ap('a1')), null);
  v('a4 (R410A 4 kg = 8,35 t, détection) : 24 mois depuis la mise en service (aucun contrôle enregistré)', (({ date, base, mois }) => ({ date, base, mois }))(W.cvcEtancheiteEcheance(ap('a4'))), { date: '2026-02-20', base: 'miseEnService', mois: 24 });
  ap('a4').detection = false;
  vrai('sans détection, la même charge passe à 12 mois : le calendrier suit la règle', W.cvcEtancheiteEcheance(ap('a4')).date === '2025-02-20');
  ap('a2').miseEnService = ''; W.db.interventions[0].fichesFluides = [];
  v('ni contrôle ni mise en service : aucune date inventée', W.cvcEtancheiteEcheance(ap('a2')), null);
  /* un contrôle plus récent repousse l'échéance */
  const W2 = monter({ db: BASE });
  SOUMET(W2, 'i2', 'a2', '', { date: '2026-10-23' });
  vrai('⛔ une nouvelle fiche avec contrôle repousse l’échéance (23/10/2026 + 12 mois)', W2.cvcEtancheiteEcheance(W2.db.appareils[1]).date === '2027-10-23');
  const W3 = monter({ db: BASE });
  SOUMET(W3, 'i2', 'a2', '', { date: '2026-10-23', controle: false });
  vrai('… mais une fiche SANS contrôle (simple recharge) ne la repousse pas', W3.cvcEtancheiteEcheance(W3.db.appareils[1]).date === '2026-11-20');
}

console.log('\n── 2897 · 4. l’échéance paraît sur l’appareil, les Tâches et le tableau de bord ──');
{
  const T4 = cdc(BASE); T4.interventions[1].statut = 'terminee';   // i2 (en cours) citait a1, a2, a3 : terminée, elle ne les « planifie » plus
  const W = monter({ db: T4, today: '2026-10-23' });
  const P = W.cvcPropositions();
  const E = P.filter(p => p.kind === 'etancheite');
  v('une proposition d’étanchéité : a2 (dans 28 j) ; a3 (non requis) et a4 (échue en 2026-02 : en retard)', E.map(p => p.appareilIds[0]), ['a4', 'a2']);
  const a2 = E.find(p => p.appareilIds[0] === 'a2');
  v('contenu : client, date, jours, titre, clé', [a2.clientId, a2.date, a2.j, a2.titre, a2.cle], ['c1', '2026-11-20', 28, 'Contrôle d’étanchéité — Climatiseur multisplit · Mitsubishi MXZ', 'etc:a2:2026-11-20']);
  vrai('le type d’intervention est celui du pack s’il existe, sinon vide (pas un libellé inventé)', a2.type === '' || a2.type === 'Contrôle d’étanchéité des fluides frigorigènes');
  vrai('l’entretien et l’étanchéité d’un même appareil sont deux lignes distinctes (deux obligations)', P.filter(p => p.appareilIds[0] === 'a2').map(p => p.kind).sort().join() === 'etancheite' || P.filter(p => p.appareilIds[0] === 'a2').length >= 1);
  const W2 = monter({ db: BASE, today: '2026-10-10' });
  vrai('à plus de 30 jours : l’étanchéité de a2 n’est pas encore proposée', !W2.cvcPropositions().some(p => p.kind === 'etancheite' && p.appareilIds[0] === 'a2'));
  /* planifiée : une intervention non terminée cite l'appareil → plus proposée. i2 (en cours) cite a2 */
  const W3 = monter({ db: BASE, today: '2026-10-23' });
  vrai('⛔ i2 (EN COURS, type « Maintenance ») cite a2 mais n’est NI un entretien NI un contrôle : l’étanchéité ET l’entretien de a2 restent proposés',
    W3.cvcPropositions().some(p => p.kind === 'etancheite' && p.appareilIds[0] === 'a2') && W3.cvcPropositions().some(p => p.kind === 'entretien' && p.appareilIds[0] === 'a2'), W3.cvcPropositions().map(p => p.cle));
  const W3a = monter({ db: BASE, today: '2026-10-23' }); W3a.db.interventions[1].type = 'Contrôle d’étanchéité des fluides frigorigènes';
  vrai('un CONTRÔLE D’ÉTANCHÉITÉ planifié sur a2 : l’étanchéité n’est plus proposée, l’entretien l’est encore (autre obligation)',
    !W3a.cvcPropositions().some(p => p.kind === 'etancheite' && p.appareilIds[0] === 'a2') && W3a.cvcPropositions().some(p => p.kind === 'entretien' && p.appareilIds[0] === 'a2'), W3a.cvcPropositions().map(p => p.cle));
  const W3d = monter({ db: BASE, today: '2026-10-23' }); W3d.db.interventions[1].type = 'Entretien pompe à chaleur';
  vrai('un ENTRETIEN planifié sur a2 : l’entretien n’est plus proposé, l’étanchéité l’est encore',
    W3d.cvcPropositions().some(p => p.kind === 'etancheite' && p.appareilIds[0] === 'a2') && !W3d.cvcPropositions().some(p => p.kind === 'entretien' && p.appareilIds[0] === 'a2'), W3d.cvcPropositions().map(p => p.cle));
  /* ⛔ le plafond de 30 jours : une étanchéité à onze mois n'encombre ni le tableau de bord ni les Tâches */
  const W5 = monter({ db: BASE, today: '2026-10-23' }); W5.db.interventions[1].statut = 'annulee';
  const e5 = W5.cvcEtancheiteEcheance(W5.db.appareils[1]);
  vrai('l’échéance d’étanchéité de a2 est bien dans onze mois d’ici l’an prochain (précondition)', e5 && e5.date === '2026-11-20', e5);
  const lim2 = (auj) => { const X = monter({ db: BASE, today: auj }); X.db.interventions[1].statut = 'annulee'; return X.cvcPropositions().some(p => p.kind === 'etancheite' && p.appareilIds[0] === 'a2'); };
  v('⛔ plafond 30 j : proposée à 30 j (21/10), pas à 31 j (20/10), toujours proposée en retard', [lim2('2026-10-21'), lim2('2026-10-20'), lim2('2026-12-01')], [true, false, true]);
  vrai('… et pas à plus de onze mois', !lim2('2025-12-01'));
  v('la pastille : orange jusqu’à 30 j, verte au-delà, rouge en retard', [W5.cvcPastille(30, '').includes('st-org'), W5.cvcPastille(31, '').includes('st-green'), W5.cvcPastille(-1, '').includes('st-red'), W5.cvcPastille(0, '').includes('st-org')], [true, true, true, true]);
  const W4 = monter({ db: BASE, today: '2026-10-23' }); W4.db.interventions[1].statut = 'terminee';
  vrai('… et reparaît dès qu’elle est terminée sans nouveau contrôle', W4.cvcPropositions().some(p => p.kind === 'etancheite' && p.appareilIds[0] === 'a2'));
  const html = W4.cvcTachesBloc();
  vrai('le bloc Tâches la montre avec son bouton Planifier', /Contrôle d’étanchéité — Climatiseur multisplit/.test(html) && /cvcPlanifier\('etc:a2:2026-11-20'\)/.test(html));
  vrai('le tableau de bord aussi', /Contrôle d’étanchéité — Climatiseur multisplit/.test(W4.cvcDashSection(() => true)));
  const ligne = W4.cvcLigneAppareil(W4.db.appareils[1]);
  vrai('la ligne de l’appareil dit la périodicité et la prochaine date, avec sa pastille', /Étanchéité/.test(ligne) && /20\/11/.test(ligne) && /12 mois/.test(ligne), ligne.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  vrai('un appareil sans fluide n’a pas de ligne d’étanchéité', !/Étanchéité/.test(W4.cvcLigneAppareil(W4.db.appareils[0])));
  vrai('⛔ un appareil à fluide SOUS le seuil (R32 1,5 kg) n’annonce pas de périodicité (« tous les undefined mois »)', !/Étanchéité/.test(W4.cvcLigneAppareil(W4.db.appareils[2])), W4.cvcLigneAppareil(W4.db.appareils[2]));
  W4.cvcPlanifier('etc:a2:2026-11-20');
  v('« Planifier » pré-remplit : client, titre, date, appareil — et n’écrit rien', [W4.__interForm[0].pre.clientId, W4.__interForm[0].pre.titre, W4.__interForm[0].pre.date, W4.__interForm[0].pre.appareilIds, W4.__saves],
    ['c1', 'Contrôle d’étanchéité — Climatiseur multisplit · Mitsubishi MXZ', '2026-11-20', ['a2'], 0]);
}

console.log('\n── 2897 · 5. ce que l’écran DIT ──');
{
  const W = monter({ db: BASE });
  W.cvcFicheForm('i2', 'a2');
  const h = W.__modals[0] || '';
  vrai('⛔ « ce n’est pas le Cerfa n° 15497*04 » est écrit sur le formulaire', /pas<\/b> le Cerfa n° 15497\*04/.test(h) && /conservée 5 ans/.test(h));
  vrai('le bordereau Trackdéchets : on n’en garde que le numéro', /Trackdéchets/.test(h) && /que le numéro/.test(h));
  vrai('le formulaire est pré-rempli avec le fluide de l’appareil et la date de l’intervention', /value="2026-10-23"/.test(h) && /<option value="R410A" selected>/.test(h));
  vrai('le contrôle est masqué tant qu’il n’est pas coché', /id="cvc-fiche-ctl" style="display:none"/.test(h));
  const t = W.cvcIntCard(W.db.interventions[1], false);
  vrai('la carte de l’intervention propose « ＋ Fiche fluides » pour les appareils à fluide seulement', /cvcFicheForm\('i2','a2'\)/.test(t) && /cvcFicheForm\('i2','a3'\)/.test(t) && !/cvcFicheForm\('i2','a1'\)/.test(t));
  { const W2 = monter({ db: BASE }); const h = W2.cvcIntCard(W2.db.interventions[0], false);
    vrai('⛔ la ligne d’une fiche garde la place de son texte (classe cvc-l, gestes dans cvc-l-fin) — une lettre par ligne à 390 px sinon', /class="pl-row cvc-l"/.test(h) && /class="cvc-l-fin"/.test(h), h.slice(0, 120)); }
  const r = W.cvcFicheResume({ fluide: 'R32', charge: 0.3, recup: 0, controle: true, resultat: 'fuite_differee' });
  vrai('le résumé d’une fiche dit fluide, quantités et résultat', r === 'R32 · chargé 0,3 kg · récupéré 0 kg · étanchéité : Fuite constatée, réparation différée', r);
  vrai('une fiche sans quantités ne dit pas « 0 kg » à tort', /chargé — · récupéré —/.test(W.cvcFicheResume({ fluide: 'R32', charge: '', recup: '' })));
  /* l'avertissement de la vignette rouge est dans la fonction qui le pose */
  const els = { controle: { checked: true }, resultat: { value: 'fuite_differee' }, date: { value: '2026-10-23' } };
  const info = { textContent: '', style: {} }, ctl = { style: {} };
  require('vm').runInContext("document.getElementById=function(id){ return id==='cvc-fiche-info'?__info:id==='cvc-fiche-ctl'?__ctl:null; }", W);
  W.__info = info; W.__ctl = ctl;
  W.cvcFicheMaj({ elements: els, dataset: { aid: 'a2' } });
  vrai('⛔ fuite à réparation différée : « mis à l’arrêt et son circuit vidangé » sous 4 jours ouvrés', /4 jours ouvrés/.test(info.textContent) && /vidangé/.test(info.textContent), info.textContent);
  els.resultat.value = 'conforme'; W.cvcFicheMaj({ elements: els, dataset: { aid: 'a2' } });
  vrai('contrôle conforme : le prochain contrôle est annoncé (23/10/2026 + 12 mois)', /27|2027/.test(info.textContent) && /12 mois/.test(info.textContent), info.textContent);
}

console.log('\n── 2897 · 6. ⛔ ouvrir un écran n’écrit pas ──');
{
  const W = monter({ db: BASE });
  const avant = JSON.stringify(W.db);
  W.cvcFicheForm('i2', 'a2'); W.cvcIntCard(W.db.interventions[1], true); W.cvcPropositions(); W.cvcTachesBloc(); W.cvcDashSection(() => true);
  W.db.appareils.forEach(a => { W.cvcLigneAppareil(a); W.cvcEtancheiteEcheance(a); W.cvcFiches(a); });
  W.formAppareil('a2');
  vrai('base identique, zéro save(), zéro journal', JSON.stringify(W.db) === avant && W.__saves === 0 && W.__logs.length === 0);
  const A = monter({ db: BASE, metier: 'plomberie' });
  v('autre métier : la carte est vide même avec des fiches en base', A.cvcIntCard(A.db.interventions[0], false), '');
}

console.log('\n── 2897 · 7. ⛔ un appareil retiré du parc ne rend pas ses fiches invisibles ──');
{
  const W = monter({ db: BASE });
  const I = W.db.interventions[0];
  I.fichesFluides.push({ id: 'f7', appareilId: 'a9', appLabel: 'Climatiseur split · Daikin Retiré', date: '2025-06-02', nature: 'Mise en service', fluide: 'R410A', charge: 2, recup: 0, controle: false });
  I.attestations = { a9: { etabliLe: '2025-06-03' } };
  const h = W.cvcIntCard(I, false);
  vrai('la fiche et l’attestation d’un appareil absent du parc restent LISIBLES sous « Appareil retiré du parc »', /Appareil retiré du parc/.test(h) && /Mise en service/.test(h) && /Daikin Retiré/.test(h) && /Attestation d’entretien établie le/.test(h), h.slice(-400));
  vrai('… sans bouton pour les modifier (l’appareil n’existe plus)', !/cvcFicheForm\('i1','a9'/.test(h) && !/cvcAttestationForm\('i1','a9'/.test(h));
  vrai('… et rien de tel quand tous les appareils cités existent', !/Appareil retiré/.test(W.cvcIntCard(W.db.interventions[1], false)));
  I.fichesFluides[I.fichesFluides.length - 1].appLabel = '<img src=x onerror=1>'; const h2 = W.cvcIntCard(I, false);
  vrai('⛔ le libellé gardé est échappé', !/<img src=x/.test(h2));
}

console.log('\n══ test-2897 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
