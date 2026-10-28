/* ══ test-2898 · CVC 4 — LE RAPPEL ANNUEL DES CONTRATS D'ENTRETIEN ══════════════════════════════
   Justin, 23 octobre 2026 : un contrat d'entretien lié à un client / des appareils propose, à l'approche de l'échéance annuelle, de
   planifier la visite — une PROPOSITION, l'écriture attend un tap — visible dans le tableau de bord et les tâches.

   Ce banc EXÉCUTE le vrai bloc CVC d'app.html :
     1. l'échéance de la visite : dernière visite connue (génération 🔁, interventions rattachées au contrat, annulées exceptées) + période de la
        fréquence ; à défaut le début du contrat — la MÊME base que `genererInterventionContrat` ;
     2. ce qui la fait taire : visite déjà prévue, contrat suspendu / expiré / terminé, visite qui tomberait après la fin ;
     3. la proposition : client, contrat, appareils, type, date — et « Planifier » pré-remplit sans rien écrire ;
     4. un appareil que le contrat couvre n'est pas proposé une seconde fois (mais son étanchéité, si) ;
     5. le formulaire du contrat désigne ses appareils (cases qui suivent le client) ; l'enregistrement les range, limités au client choisi ;
     6. périmètre : jamais un contrat d'un client qu'on ne voit pas ; autre métier : rien, formulaire de contrat inchangé ;
     7. ouvrir un écran n'écrit pas. */
const { monter, cdc } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

const BASE = {
  clients: [{ id: 'c1', nom: 'Boulangerie Élise' }, { id: 'c2', nom: 'Mme Durand' }, { id: 'c3', nom: 'Hors périmètre' }],
  appareils: [
    { id: 'a1', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Saunier Duval', modele: 'Thema', miseEnService: '2022-01-10', emplacement: 'Chaufferie' },
    { id: 'a2', clientId: 'c1', type: 'pac_air', marque: 'Daikin', fluide: 'R32', charge: 1.2, miseEnService: '2025-01-01' },
    { id: 'a3', clientId: 'c2', type: 'chaudiere_fioul', marque: 'De Dietrich', miseEnService: '2023-05-05' }],
  contrats: [
    { id: 'k1', num: 'CTR-1', titre: 'Entretien annuel chaudière', clientId: 'c1', frequence: 'annuel', statut: 'actif', dateDebut: '2025-11-15', dateFin: '2027-11-14', appareilIds: ['a1'] },
    { id: 'k2', num: 'CTR-2', titre: 'Contrat Durand', clientId: 'c2', frequence: 'annuel', statut: 'actif', dateDebut: '2025-11-01', dateFin: '2027-10-31' },
    { id: 'k3', num: 'CTR-3', titre: 'Suspendu', clientId: 'c1', frequence: 'annuel', statut: 'suspendu', dateDebut: '2025-11-01' },
    { id: 'k4', num: 'CTR-4', titre: 'Hors périmètre', clientId: 'c3', frequence: 'annuel', statut: 'actif', dateDebut: '2025-11-01' }],
  interventions: []
};
const AUJ = '2026-10-23';
const visite = (db, id, today) => { const W = monter({ db, today: today || AUJ }); return W.cvcContratVisite(W.db.contrats.find(c => c.id === id), today || AUJ); };

console.log('\n── 2898 · 1. l’échéance de la visite ──');
{
  v('début 15/11/2025, annuel, aucune visite : 15/11/2026 (dans 23 j)', (({ date, j, base }) => ({ date, j, base }))(visite(BASE, 'k1')), { date: '2026-11-15', j: 23, base: 'debut' });
  const g = cdc(BASE); g.contrats[0].derniereGeneration = '2026-01-20';
  v('la génération 🔁 du 20/01/2026 pèse : prochaine visite 20/01/2027, hors horizon (365 j)', visite(g, 'k1'), null);
  const gg = cdc(BASE); gg.contrats[0].derniereGeneration = '2025-11-20';
  v('génération du 20/11/2025 : prochaine le 20/11/2026', visite(gg, 'k1').date, '2026-11-20');
  const r = cdc(BASE); r.interventions = [{ id: 'i1', contratId: 'k1', clientId: 'c1', statut: 'terminee', date: '2025-10-30' }];
  const e = visite(r, 'k1');
  v('une visite TERMINÉE rattachée au contrat (30/10/2025) → 30/10/2026 (dans 7 j), base « visite »', (({ date, j, base, depuis }) => ({ date, j, base, depuis }))(e), { date: '2026-10-30', j: 7, base: 'visite', depuis: '2025-10-30' });
  const an = cdc(BASE); an.interventions = [{ id: 'i1', contratId: 'k1', clientId: 'c1', statut: 'annulee', date: '2026-05-01' }, { id: 'i0', contratId: 'k1', clientId: 'c1', statut: 'terminee', date: '2025-10-30' }];
  v('⛔ une visite ANNULÉE ne compte pas (sinon l’échéance glisserait d’un an sans visite)', visite(an, 'k1').date, '2026-10-30');
  const au = cdc(BASE); au.interventions = [{ id: 'i1', contratId: 'AUTRE', clientId: 'c1', statut: 'terminee', date: '2026-09-01' }];
  v('une visite rattachée à un AUTRE contrat ne compte pas', visite(au, 'k1').date, '2026-11-15');
  const tri = cdc(BASE); tri.contrats[0].frequence = 'trimestriel'; tri.contrats[0].dateDebut = '2026-07-20';
  v('trimestriel : 20/07/2026 + 3 mois = 20/10/2026 (en retard de 3 j)', (({ date, j }) => ({ date, j }))(visite(tri, 'k1')), { date: '2026-10-20', j: -3 });
  const men = cdc(BASE); men.contrats[0].frequence = 'mensuel'; men.contrats[0].dateDebut = '2026-09-30';
  v('mensuel : 30/09 + 1 mois = 30/10 (le 31 se ramène au dernier jour du mois)', visite(men, 'k1').date, '2026-10-30');
  const sem = cdc(BASE); sem.contrats[0].frequence = 'semestriel'; sem.contrats[0].dateDebut = '2026-04-25';
  v('semestriel : 25/04 + 6 mois = 25/10', visite(sem, 'k1').date, '2026-10-25');
  const nf = cdc(BASE); delete nf.contrats[0].frequence;
  v('fréquence absente : annuelle par défaut', visite(nf, 'k1').date, '2026-11-15');
  v('à plus de 30 jours : rien (le 20/09, l’échéance est à 56 j)', visite(BASE, 'k1', '2026-09-20'), null);
  v('au 30e jour pile : proposée', visite(BASE, 'k1', '2026-10-16').j, 30);
}

console.log('\n── 2898 · 2. ce qui la fait taire ──');
{
  const W = monter({ db: BASE });
  v('contrat suspendu : rien', W.cvcContratVisite(W.db.contrats[2], AUJ), null);
  const ex = cdc(BASE); ex.contrats[0].statut = 'expire';
  v('contrat expiré : rien', visite(ex, 'k1'), null);
  const sansStatut = cdc(BASE); delete sansStatut.contrats[0].statut;
  vrai('contrat sans statut (fiche d’avant le champ) : compte pour actif', visite(sansStatut, 'k1') !== null);
  const fin = cdc(BASE); fin.contrats[0].dateFin = '2026-10-01';
  v('contrat TERMINÉ (date de fin passée) : rien, c’est le rappel de renouvellement qui parle', visite(fin, 'k1'), null);
  const fin3 = cdc(BASE); fin3.contrats[0].dateDebut = '2025-06-01'; fin3.contrats[0].dateFin = '2026-09-01';
  v('⛔ contrat terminé alors que la visite (01/06/2026) tombait AVANT sa fin : rien non plus', visite(fin3, 'k1'), null);
  const fin2 = cdc(BASE); fin2.contrats[0].dateFin = '2026-11-01';
  v('⛔ la prochaine visite (15/11) tomberait après la fin du contrat (01/11) : rien', visite(fin2, 'k1'), null);
  const sf = cdc(BASE); delete sf.contrats[0].dateFin;
  vrai('sans date de fin : proposée', visite(sf, 'k1') !== null);
  const sd = cdc(BASE); delete sd.contrats[0].dateDebut;
  v('sans début ni visite : rien (on n’invente pas)', visite(sd, 'k1'), null);
  for (const st of ['planifiee', 'encours', 'aplanifier']) {
    const p = cdc(BASE); p.interventions = [{ id: 'ip', contratId: 'k1', clientId: 'c1', statut: st, date: st === 'aplanifier' ? '' : '2026-11-10' }];
    v('visite déjà prévue (' + st + ') : plus proposée', visite(p, 'k1'), null);
  }
  const tp = cdc(BASE); tp.interventions = [{ id: 'ip', contratId: 'k1', clientId: 'c1', statut: 'terminee', date: '2026-10-22' }];
  v('visite faite hier : la suivante est dans un an, hors horizon', visite(tp, 'k1'), null);
}

console.log('\n── 2898 · 3. la proposition, et « Planifier » qui n’écrit rien ──');
{
  const W = monter({ db: BASE });
  const P = W.cvcPropositions(), C = P.filter(p => p.kind === 'contrat');
  v('trois visites de contrat sans restriction de périmètre (Durand et Hors-périmètre le 01/11, Élise le 15/11) ; le contrat suspendu n’en propose pas', C.map(p => [p.contratId, p.date]), [['k2', '2026-11-01'], ['k4', '2026-11-01'], ['k1', '2026-11-15']]);
  const k1 = C.find(p => p.contratId === 'k1');
  v('contenu : client, titre, appareils désignés, type, clé, jours', [k1.clientId, k1.titre, k1.appareilIds, k1.type, k1.cle, k1.j], ['c1', 'Visite d’entretien — Entretien annuel chaudière', ['a1'], 'Entretien annuel chaudière', 'ctr:k1:2026-11-15', 23]);
  const k2 = C.find(p => p.contratId === 'k2');
  v('⛔ contrat sans appareil désigné : la proposition CITE tout le parc couvert (sinon la visite ne remet l’horloge d’aucun appareil)', [k2.appareilIds, k2.couvre], [['a3'], ['a3']]);
  vrai('type par défaut du contrat Durand (chaudière fioul) : « Entretien chaudière fioul ou bois »', k2.type === 'Entretien chaudière fioul ou bois', k2.type);
  vrai('triées par urgence', P.every((p, k) => k === 0 || P[k - 1].j <= p.j));
  const avant = JSON.stringify(W.db);
  W.cvcPlanifier('ctr:k1:2026-11-15');
  const pre = W.__interForm[0].pre;
  v('« Planifier » pré-remplit : client, contrat, appareils, titre, type, date', [pre.clientId, pre.contratId, pre.appareilIds, pre.titre, pre.type, pre.date], ['c1', 'k1', ['a1'], 'Visite d’entretien — Entretien annuel chaudière', 'Entretien annuel chaudière', '2026-11-15']);
  vrai('⛔ rien n’est écrit : base identique, zéro save()', JSON.stringify(W.db) === avant && W.__saves === 0);
  /* la boucle se ferme d'elle-même : l'intervention créée porte contratId */
  const F = monter({ db: BASE }); F.db.interventions.push({ id: 'cree', contratId: 'k1', clientId: 'c1', statut: 'planifiee', date: '2026-11-15', appareilIds: ['a1'] });
  vrai('⛔ une fois la visite créée par le formulaire, la proposition disparaît d’elle-même', !F.cvcPropositions().some(p => p.contratId === 'k1'));
  const html = W.cvcTachesBloc(), dash = W.cvcDashSection(() => true);
  vrai('Tâches et tableau de bord la montrent, avec Planifier', /Visite d’entretien — Entretien annuel chaudière/.test(html) && /cvcPlanifier\('ctr:k1:2026-11-15'\)/.test(html) && /Visite d’entretien — Entretien annuel chaudière/.test(dash));
  vrai('un contrat ne remplit pas de « type » qui n’existe pas dans le pack (contrat sans parc : « Contrat d’entretien »)', (() => { const X = monter({ db: Object.assign(cdc(BASE), { appareils: [] }) }); return X.cvcPropositions().find(p => p.contratId === 'k2').type === 'Contrat d’entretien'; })());
}

console.log('\n── 2898 · 4. un appareil couvert n’est pas proposé deux fois ──');
{
  const W = monter({ db: BASE });
  const P = W.cvcPropositions();
  vrai('a1 (désigné par k1) : pas de ligne « Entretien — Chaudière gaz » en plus de la visite du contrat', !P.some(p => p.kind === 'entretien' && p.appareilIds[0] === 'a1'), P.map(p => p.cle));
  vrai('a3 (client c2, contrat k2 sans appareil désigné → tout le parc) : pas de doublon non plus', !P.some(p => p.kind === 'entretien' && p.appareilIds[0] === 'a3'));
  const B = cdc(BASE); B.contrats = []; const X = monter({ db: B });
  vrai('sans contrat, l’entretien de l’appareil redevient sa propre ligne (a1 : mise en service 2022 + 12 mois, en retard)', X.cvcPropositions().some(p => p.kind === 'entretien' && p.appareilIds[0] === 'a1'));
  /* a2 (pac_air) n'est pas désigné par k1 : son entretien reste proposé si dû */
  const C = cdc(BASE); C.appareils[1].miseEnService = '2024-11-20'; const Y = monter({ db: C });
  vrai('un appareil du même client NON désigné par le contrat garde sa propre ligne (a2, PAC à 24 mois : dû le 20/11/2026)', Y.cvcPropositions().some(p => p.kind === 'entretien' && p.appareilIds[0] === 'a2'));
  vrai('l’étanchéité d’un appareil couvert reste proposée : c’est une autre obligation', (() => { const Z = cdc(BASE); Z.contrats[0].appareilIds = ['a1', 'a2']; Z.appareils[1].charge = 3; Z.appareils[1].fluide = 'R410A'; Z.appareils[1].miseEnService = '2025-11-10'; const M = monter({ db: Z }); return M.cvcPropositions().some(p => p.kind === 'etancheite' && p.appareilIds[0] === 'a2'); })());
}

console.log('\n── 2898 · 5. le contrat désigne ses appareils ──');
{
  const W = monter({ db: BASE });
  const champ = W.cvcContratChamp(W.db.contrats[0]);
  vrai('le formulaire d’un contrat porte la zone « Appareils couverts », cases du client, a1 coché', /id="cvc-ct" data-client="c1"/.test(champ) && /value="a1" checked/.test(champ) && /value="a2" /.test(champ) && !/value="a2" checked/.test(champ) && !/value="a3"/.test(champ), champ);
  vrai('aucune case cochée = tout le parc : la phrase le dit', /aucun coché = tout le parc/.test(champ));
  vrai('client sans appareil : on le dit', /pas encore d’appareil/.test(W.cvcContratChamp({ clientId: 'c3' })));
  vrai('contrat neuf sans client : on invite à le choisir', /Choisissez le client/.test(W.cvcContratChamp({})));
  vrai('un nom d’appareil échappé', !/<img/.test(monter({ db: Object.assign(cdc(BASE), { appareils: [{ id: 'x', clientId: 'c1', type: 'vmc', marque: '<img src=x>' }] }) }).cvcContratChamp({ clientId: 'c1' })));
  /* changer de client réécrit la liste ; le même client la laisse */
  const zone = { dataset: { client: 'c1' }, innerHTML: 'AVANT' };
  require('vm').runInContext("document.getElementById=function(id){ return id==='cvc-ct'?__zone:null; }", W); W.__zone = zone;
  W.cvcContratMaj({ elements: { clientId: { value: 'c1' } } });
  vrai('même client : la zone n’est pas réécrite (les cases cochées restent)', zone.innerHTML === 'AVANT');
  W.cvcContratMaj({ elements: { clientId: { value: 'c2' } } });
  vrai('autre client : la zone suit (appareils de c2, rien de coché)', zone.dataset.client === 'c2' && /value="a3"/.test(zone.innerHTML) && !/value="a1"/.test(zone.innerHTML) && !/checked/.test(zone.innerHTML));
  /* enregistrement */
  const cases = (...v) => ['a1', 'a2', 'a3'].map(x => ({ value: x, checked: v.indexOf(x) >= 0 }));
  const form = (vals, zonePresente) => ({ querySelector: s => (zonePresente === false ? null : (s === '#cvc-ct' ? {} : null)), querySelectorAll: s => (s === 'input[name=cvcApp]' ? cases(...vals) : []) });
  const d = { clientId: 'c1', cvcApp: 'a2', titre: 'x' }; W.cvcContratLire(form(['a1', 'a2', 'a3']), d);
  v('⛔ seuls les appareils DU client choisi sont gardés (a3 est chez c2) ; le champ brut disparaît', d, { clientId: 'c1', titre: 'x', appareilIds: ['a1', 'a2'] });
  const d2 = { clientId: 'c1' }; W.cvcContratLire(form([]), d2);
  v('aucune case : liste vide = tout le parc', d2, { clientId: 'c1', appareilIds: [] });
  const d3 = { clientId: 'c1', titre: 'y' }; W.cvcContratLire(form(['a1'], false), d3);
  v('formulaire sans la zone (autre métier) : rien ne bouge, appareilIds conservés tels quels', d3, { clientId: 'c1', titre: 'y' });
}

console.log('\n── 2898 · 6. périmètre, autres métiers ──');
{
  const W = monter({ db: BASE, clientsVisibles: ['c2'] });
  v('⛔ un client qu’on ne voit pas : sa visite de contrat n’est jamais proposée', W.cvcPropositions().filter(p => p.kind === 'contrat').map(p => p.contratId), ['k2']);
  for (const metier of ['3d', 'plomberie', 'serrurerie']) {
    const A = monter({ db: BASE, metier });
    v(metier + ' : ni zone dans le formulaire du contrat, ni bloc Tâches, ni carte', [A.cvcContratChamp(A.db.contrats[0]), A.cvcTachesBloc(), A.cvcDashSection(() => true)], ['', '', '']);
  }
  const D = monter({ db: BASE, droits: { 'int.ajouter': false } });
  vrai('sans « Interventions → Ajouter » : la proposition se lit, sans bouton', /Visite d’entretien/.test(D.cvcTachesBloc()) && !/cvcPlanifier/.test(D.cvcTachesBloc()));
}

console.log('\n── 2898 · 7. ⛔ ouvrir un écran n’écrit pas ──');
{
  const W = monter({ db: BASE });
  const avant = JSON.stringify(W.db);
  W.cvcPropositions(); W.cvcTachesBloc(); W.cvcDashSection(() => true); W.cvcContratChamp(W.db.contrats[0]); W.db.contrats.forEach(c => W.cvcContratVisite(c, AUJ));
  vrai('base identique, zéro save(), zéro journal', JSON.stringify(W.db) === avant && W.__saves === 0 && W.__logs.length === 0);
}

console.log('\n── 2898 · 7 bis. ⛔ un calcul qui jette ne fait pas disparaître la carte sans un mot ──');
{
  const W = monter({ db: BASE }); W.console = { error() {} };
  vrai('départ : sans panne, la carte des Tâches est là', /Visite d’entretien/.test(W.cvcTachesBloc()));
  W.db.clients = {};   // une donnée inattendue : .map n'existe pas sur un objet
  const t = W.cvcTachesBloc(), d = W.cvcDashSection(() => true);
  vrai('Tâches : « Échéances d’entretien indisponibles » au lieu d’un écran vide', /cvc-taches/.test(t) && /indisponibles/.test(t), t.slice(0, 120));
  vrai('tableau de bord : la même ligne', /cvc-dash/.test(d) && /indisponibles/.test(d), d.slice(0, 120));
  const A = monter({ db: BASE, metier: 'antinuisibles' }); A.db.clients = {};
  v('autre métier : toujours rien', [A.cvcTachesBloc(), A.cvcDashSection(() => true)], ['', '']);
}

console.log('\n── 2898 · 8. les crochets du fichier livré ──');
{
  const { APP } = require('./cvc-monter.js');
  const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const iF = CODE.indexOf('function formContrat('), iS = CODE.indexOf('function saveContrat(');
  vrai('formContrat pose la zone des appareils et écoute le changement de client', iF > 0 && /\$\{typeof cvcContratChamp==='function'\?cvcContratChamp\(ct\):''\}/.test(CODE.slice(iF, iS)) && /onchange="if\(typeof cvcContratMaj==='function'\)cvcContratMaj\(this\)"/.test(CODE.slice(iF, iS)));
  vrai('saveContrat range les appareils AVANT de fusionner dans le contrat', /if\(typeof cvcContratLire==='function'\) cvcContratLire\(e\.target,d\);/.test(CODE.slice(iS, iS + 900)));
}

console.log('\n── 2898 · 9. ⛔ la boucle entière : un contrat « tout le parc », Planifier, la visite faite — l’entretien n’est plus dû ──');
{
  const W = monter({ db: BASE });
  const k2 = W.cvcPropositions().find(p => p.kind === 'contrat' && p.contratId === 'k2');
  vrai('départ : le contrat sans case cochée propose sa visite, et l’appareil du parc (fioul de 2023) est en retard', !!k2 && !!W.cvcEntretienEcheance(W.db.appareils[2]) && W.cvcJours(W.cvcEntretienEcheance(W.db.appareils[2]).date, AUJ) < 0);
  W.cvcPlanifier(k2.cle);
  const pre = W.__interForm[W.__interForm.length - 1].pre;
  v('« Planifier » ouvre l’intervention en CITANT le parc couvert, rattachée au contrat', [pre.appareilIds, pre.contratId], [['a3'], 'k2']);
  const db = cdc(BASE); db.interventions.push({ id: 'v1', clientId: pre.clientId, contratId: pre.contratId, type: pre.type, appareilIds: pre.appareilIds, statut: 'terminee', date: '2026-10-20' });
  const W2 = monter({ db, today: AUJ });
  v('visite terminée le 20/10 : aucune proposition (ni d’entretien en retard, ni de visite de contrat)', W2.cvcPropositions().filter(p => p.clientId === 'c2').map(p => p.cle), []);
  const W3 = monter({ db, today: '2026-10-23' });
  vrai('… et l’appareil porte la date de cette visite comme dernier entretien', (W3.cvcDernierEntretien(W3.db.appareils[2]) || {}).id === 'v1');
}

console.log('\n── 2898 · 10. ⛔ le bouton 🔁 et la proposition donnent la MÊME date, et pas deux visites ──');
{
  const { APP } = require('./cvc-monter.js'), vm = require('vm');
  const coupe = (a, b) => { const i = APP.indexOf(a), j = APP.indexOf(b, i); if (i < 0 || j < 0) throw new Error('introuvable : ' + a); return APP.slice(i, j); };
  const GEN = coupe('function ctrFreqDays(', 'function formContrat(');
  const charge = (db, today, metier, ok) => { const W = monter({ db, today, metier }); W.__ok = ok !== false; W.__confirms = 0; W.__created = [];
    vm.runInContext(`var ISO=function(dt){ return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0'); }; function notifyTechNewInt(o){ __created.push(o); } function estMetier3D(){ return false; } var views={contrats:function(){}};
      function confirm(m){ __confirms++; return __ok; } ` + GEN, W); return W; };
  /* contrat annuel du 01/03/2023, aucune visite : proposition au 01/03/2024 ; l'ancien calcul en jours donnait le 29/02/2024 */
  const db = cdc(BASE); db.contrats[1].dateDebut = '2023-03-01'; db.contrats[1].dateFin = '2030-03-01';
  const prop = monter({ db, today: '2024-02-20' }).cvcContratVisite(db.contrats[1], '2024-02-20');
  const W = charge(db, '2024-02-20');
  W.genererInterventionContrat('k2');
  v('annuel : 🔁 planifie le 01/03/2024 comme la proposition (pas le 29/02 des 365 jours)', [W.__created.length && W.__created[0].date, prop && prop.date], ['2024-03-01', '2024-03-01']);
  v('… la visite porte son contrat, et la génération est retenue', [W.__created[0].contratId, W.db.contrats[1].derniereGeneration], ['k2', '2024-03-01']);
  /* trimestriel du 01/07/2026 : 01/10/2026 (et non le 30/09 des 91 jours) */
  const dt = cdc(BASE); dt.contrats[1].frequence = 'trimestriel'; dt.contrats[1].dateDebut = '2026-07-01';
  const Wt = charge(dt, '2026-09-15'); Wt.genererInterventionContrat('k2');
  v('trimestriel : le 01/10/2026', Wt.__created[0].date, '2026-10-01');
  /* en retard : jamais dans le passé */
  const Wr = charge(db, '2026-10-23'); Wr.genererInterventionContrat('k2');
  v('contrat en retard : 🔁 planifie aujourd’hui, pas dans le passé', Wr.__created[0].date, '2026-10-23');
  /* une visite née de « Planifier » est déjà prévue : 🔁 demande, et ne crée rien si on refuse */
  const dp = cdc(BASE); dp.interventions.push({ id: 'vp', clientId: 'c2', contratId: 'k2', statut: 'planifiee', date: '2026-11-01', appareilIds: ['a3'] });
  const Wn = charge(dp, '2026-10-23', undefined, false); Wn.genererInterventionContrat('k2');
  v('⛔ visite déjà planifiée + refus : une question, aucune seconde visite, rien d’écrit', [Wn.__confirms, Wn.__created.length, Wn.__saves, Wn.db.contrats[1].derniereGeneration || ''], [1, 0, 0, '']);
  const Wo = charge(dp, '2026-10-23', undefined, true); Wo.genererInterventionContrat('k2');
  v('… et sur oui, elle est créée', [Wo.__confirms, Wo.__created.length], [1, 1]);
  /* autre métier : l'ancien calcul en jours, sans question */
  const Wa = charge(db, '2024-02-20', 'antinuisibles'); Wa.genererInterventionContrat('k2');
  v('hors métier à parc : le calcul d’avant (365 jours → 29/02/2024), sans confirmation', [Wa.__created[0].date, Wa.__confirms], ['2024-02-29', 0]);
}

console.log('\n══ test-2898 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
