/* ══ test-3170 · LES CORRECTIFS DE LA CAMPAGNE v779 — changer de métier après une démonstration, montants, TVA, droit de suppression, devis IA ═════════════
   La veille d'une réunion clim + plomberie (Justin, 28 octobre 2026), quatre vérifications au navigateur et une relecture ont remonté ce que ce banc EXÉCUTE
   (les vraies fonctions d'app.html, par `bac`, jamais une phrase) :
   1. ⛔ BLOQUANT — 3D remplie, puis « plomberie » dans « 🧰 Tester un métier » : 14 interventions de dératisation, 7 clients, 160 produits et 5 fournisseurs de la 3D
      restaient (des mots d'anti-nuisibles dans 10 rubriques). `metierSet` DIT ce qui part, demande, puis retire la démonstration et le catalogue de l'ancien pack ;
      un refus ne change rien ; les saisies à soi (produit « perso », client sans `demo`) ne sont jamais touchées ; hors bêta, rien ne se retire ;
   2. G1 — chaque intervention de démonstration (hors 3D, qui garde ses données À L'IDENTIQUE) porte un montant : la facture ne sort plus à 0,00 € ;
   3. G3 — sans nom d'entreprise, la démonstration le dit (tous les PDF sont refusés sans lui, et c'est voulu) ;
   4. relecture 5 — la note de dépannage de la démonstration chauffage chez un restaurant est à 20 %, pas 10 % (le taux réduit ne vaut que pour l'habitation) ;
   5. relecture 7 — un document du métier se supprime avec la case de SON droit (ventes pour un devis, int pour un rapport), celle qui le modifie ;
   6. B1 — le Devis IA distingue un réseau qui tombe (« le serveur ne répond pas », rien de retenu) d'un serveur d'avant (« mise à jour du serveur »).
   Mutations : scratchpad/mutations-v779-correctifs.py. */
'use strict';
const { lire, litteral, evalue, bac } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const { N } = lire('app.html');
const METIERS = evalue(litteral(N, 'const METIERS={'));
const CATALOGUE = evalue(litteral(N, 'const CATALOGUE=['));
const FOURS_3D = evalue(litteral(N, 'const FOURNISSEURS_3D=['));
METIERS['3d'].catalogue = CATALOGUE; METIERS['3d'].fournisseurs = FOURS_3D;   // posés à l'exécution par app.html (ligne « METIERS['3d'].catalogue=CATALOGUE »)
const idCat = nom => 'cat_' + nom.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

console.log('\n── 3170 · 0. population ──');
vrai('le catalogue 3D compte plus de 100 fiches et au moins 4 fournisseurs', CATALOGUE.length > 100 && FOURS_3D.length >= 4);
{ const f = bac('app.html', ['idCatalogue'], {}).fn.idCatalogue; vrai('(sonde) idCatalogue rend un identifiant « cat_… » déduit du nom', /^cat_/.test(f('ALTA 7000')), f('ALTA 7000')); }

console.log('\n── 3170 · 1. changer de métier après une démonstration ──');
const monde = (opts) => {
  opts = opts || {};
  const db = { metier: '3d', metierPlus: '', interventions: [], clients: [], techniciens: [], produits: [], fournisseurs: [], cahiers: [], plansPrevention: [], docsMetier: [], appareils: [] };
  const confirms = [], toasts = [], rendus = []; let saves = 0;
  const init = { METIERS, db, BETA_ESSAI: opts.beta !== false, console, currentUser: { id: 'u1', role: 'admin' }, INT_TYPES: ['Dératisation'], CVC_METIERS: ['chauffage', 'froid', 'energies'], NETT_METIERS: ['nettoyage'],
    confirm: m => { confirms.push(m); return opts.refus ? false : true; }, toast: m => toasts.push(m), save: () => { saves++; }, logEvent: () => {}, renderNav: () => {}, toastAnnuler: m => toasts.push(m),
    views: { parametres() { rendus.push(1); } }, syncRetraitVoulu: () => { init.__retrait = true; }, localStorage: { removeItem() {} }, planJours: [], planTechM: null };
  const b = bac('app.html', ['metierSet', 'metierResidu', 'metierResiduRetirer', 'metierPackDe', 'metierId', 'idCatalogue', 'slugNom'], init);
  return { db, b, confirms, toasts, rendus, saves: () => saves, init };
};
const peupler = (W) => {
  const d = W.db;
  d.interventions.push({ id: 'i1', titre: 'Dératisation', demo: 1 }, { id: 'i2', titre: 'Ma vraie intervention' }, { id: 'i3', titre: 'Journée d\'essai', demo: 'compta' });
  d.clients.push({ id: 'c1', nom: 'Client démo', demo: 1 }, { id: 'c2', nom: 'Mon vrai client' });
  d.techniciens.push({ id: 't1', nom: 'Démo', demo: 1 }, { id: 't2', nom: 'Vrai tech' });
  CATALOGUE.slice(0, 10).forEach(c => d.produits.push({ id: idCat(c[0]), nom: c[0], categorie: c[1] }));
  d.produits.push({ id: 'p_perso', nom: 'Mon produit à moi', perso: true }, { id: 'p_libre', nom: 'Produit libre' });
  FOURS_3D.slice(0, 3).forEach(f => d.fournisseurs.push({ id: 'f' + f.nom, nom: f.nom }));
  d.fournisseurs.push({ id: 'fperso', nom: 'Grossiste du coin' });
  d.cahiers.push({ id: 'ca1', demo: 1 }); d.docsMetier.push({ id: 'dm1', demo: 1 }, { id: 'dm2' }); d.appareils.push({ id: 'a1', demo: 1 }, { id: 'a2' });
};
{ const W = monde(); peupler(W);
  const r = W.b.fn.metierResidu();
  egal('(population) le résidu compte : 1 intervention, 1 client, 1 technicien de démonstration, 10 produits du catalogue, 3 fournisseurs, 3 autres fiches',
    [r.ints, r.clients, r.techs, r.produits, r.fours, r.autres], [1, 1, 1, 10, 3, 3]);
  vrai('… et la journée d\'essai de la comptabilité (demo:\'compta\') n\'y est PAS comptée', r.ints === 1);
  W.b.fn.metierSet('plomberie');
  vrai('⛔ UNE confirmation, qui NOMME ce qui part (chiffres) et dit que les saisies à soi restent', W.confirms.length === 1 && /1 intervention/.test(W.confirms[0]) && /10 produit/.test(W.confirms[0]) && /3 fournisseur/.test(W.confirms[0]) && /saisies à toi/.test(W.confirms[0]), W.confirms);
  egal('⛔ la démonstration et le catalogue 3D sont partis : seules restent la vraie intervention, la journée d\'essai, le vrai client, le vrai technicien',
    [W.db.interventions.map(x => x.id), W.db.clients.map(x => x.id), W.db.techniciens.map(x => x.id)], [['i2', 'i3'], ['c2'], ['t2']]);
  egal('… aucun produit ni fournisseur de la 3D ne reste ; les saisies à soi (« perso », un produit libre, un grossiste) restent',
    [W.db.produits.map(x => x.id).sort(), W.db.fournisseurs.map(x => x.id)], [['p_libre', 'p_perso'], ['fperso']]);
  egal('… les autres fiches de démonstration (cahier, document, appareil) partent, les vraies restent', [W.db.cahiers.length, W.db.docsMetier.map(x => x.id), W.db.appareils.map(x => x.id)], [0, ['dm2'], ['a2']]);
  vrai('… et le métier a bien changé, enregistré une fois, la suppression annoncée à la synchro (retrait voulu)', W.db.metier === 'plomberie' && W.saves() === 1 && W.init.__retrait === true);
}
{ const W = monde({ refus: true }); peupler(W); const avant = JSON.stringify(W.db);
  W.b.fn.metierSet('plomberie');
  vrai('⛔ refus de la confirmation : RIEN ne change (métier, données, aucun save) et la liste se redessine sur l\'ancien métier', JSON.stringify(W.db) === avant && W.db.metier === '3d' && W.saves() === 0 && W.rendus.length === 1);
}
{ const W = monde(); W.b.fn.metierSet('plomberie');
  vrai('base vide : aucune question, le métier change comme avant', W.confirms.length === 0 && W.db.metier === 'plomberie' && W.saves() === 1); }
{ const W = monde({ beta: false }); peupler(W);
  W.b.fn.metierSet('plomberie');
  vrai('⛔ HORS BÊTA (`BETA_ESSAI` faux) : aucune question et rien ne se retire — les données d\'une entreprise ne partent jamais par ce geste', W.confirms.length === 0 && W.db.interventions.length === 3 && W.db.produits.length === 12 && W.db.metier === 'plomberie'); }
{ const W = monde(); peupler(W); W.db.metier = 'plomberie';
  const r = W.b.fn.metierResidu();
  vrai('le résidu se lit sur le pack du métier ACTUEL : sous « plomberie », les produits de la 3D ne sont pas ceux du catalogue (le cas se traite AVANT le changement)', r.produits === 0 && r.fours === 0); }

console.log('\n── 3170 · 2. G1 — un montant à chaque intervention de démonstration ──');
const DEMO_PLOMB = evalue(litteral(N, 'const DEMO_PLOMB={')), DEMO_CHAUF = evalue(litteral(N, 'const DEMO_CHAUF={')), DEMO_NETT = evalue(litteral(N, 'const DEMO_NETT={'));
const DEMO_MONTANTS = evalue(litteral(N, 'const DEMO_MONTANTS=['));
const charger = (metier, nom) => {
  const db = { metier, clients: [], interventions: [], produits: [], boxes: [], techniciens: [], enveloppes: [], mouvements: [], docsMetier: [], appareils: [] };
  let n = 0, toasts = [];
  const init = { METIERS, INT_TYPES: ['Dératisation'], BETA_ESSAI: true, db, console, uid: () => 'u' + (++n), todayISO: () => '2026-10-28', shiftDay: (d, k) => d, toast: (m, ms) => toasts.push([m, ms]), save: () => {}, go: () => {}, confirm: () => true,
    currentUser: { id: 'u1', role: 'admin' }, planJours: [], CVC_METIERS: ['chauffage', 'froid', 'energies'], NETT_METIERS: ['nettoyage'], DEMO_PLOMB, DEMO_CHAUF, DEMO_NETT, DEMO_MONTANTS,
    DEMO_CLIENTS_3D: evalue(litteral(N, 'const DEMO_CLIENTS_3D=[')), DEMO_PLAN_3D: evalue(litteral(N, 'const DEMO_PLAN_3D=[')), entrepriseNom: () => nom === undefined ? '' : nom, localStorage: { removeItem() {} }, cvcDemoPoser: undefined };
  init.cvcDemoPoser = undefined; delete init.cvcDemoPoser;
  const b = bac('app.html', ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'intTypes', 'demoSemisDe', 'demoPlanGenerique', 'demoCompte', 'demoCharger'], init);
  b.fn.demoCharger(); return { db, toasts };
};
for (const m of ['plomberie', 'chauffage', 'nettoyage', 'electricite']) {
  const W = charger(m, 'Alpha SARL'); const mont = W.db.interventions.map(i => i.montant);
  vrai(m + ' : 14 interventions, TOUTES avec un montant > 0 (la facture ne sort plus à 0,00 €)', W.db.interventions.length === 14 && W.db.interventions.filter(i => i.demo).length === 14 && mont.slice(0, 13).every(x => Number(x) > 0), mont);
  vrai(m + ' : des montants variés (au moins 6 valeurs différentes) dans une fourchette réaliste (90 à 420)', new Set(mont.slice(0, 13)).size >= 6 && mont.slice(0, 13).every(x => x >= 90 && x <= 420), mont);
}
{ const W = charger('3d', 'Alpha SARL');
  vrai('⛔ la 3D garde ses données À L\'IDENTIQUE : AUCUN montant ajouté', W.db.interventions.length === 14 && W.db.interventions.every(i => !('montant' in i))); }

console.log('\n── 3170 · 3. G3 — sans nom d\'entreprise, la démonstration le dit ──');
{ const sans = charger('plomberie'), avec = charger('plomberie', 'Alpha SARL');
  vrai('sans nom : le message de fin de création demande de renseigner le nom de l\'entreprise (PDF), affiché assez longtemps pour être lu', sans.toasts.some(t => /Renseigne le nom de ton entreprise/.test(t[0]) && t[1] >= 5000), sans.toasts);
  vrai('avec un nom : le message est celui d\'avant, sans rien en plus', avec.toasts.length === 1 && !/Renseigne/.test(avec.toasts[0][0]) && /14 interventions sur 3 jours/.test(avec.toasts[0][0]), avec.toasts); }

console.log('\n── 3170 · 4. relecture 5 — le taux réduit ne vaut que pour l\'habitation ──');
{ const i = N.indexOf("ajoute('note-depannage',c1,{interventionId:iid(c1)},{execLe:todayISO(),tva:'20'");
  const iCh = N.indexOf("Recharge en fluide R32");
  const blocChauf = N.slice(N.lastIndexOf("ajoute('note-depannage'", iCh), iCh);
  vrai('la note de dépannage du « Restaurant Le Vieux Port » (chauffage) est à 20 %', /tva:'20'/.test(blocChauf) && !/tva:'10'/.test(blocChauf), blocChauf.slice(0, 200));
  vrai('(population) le client c1 du jeu chauffage est bien un restaurant', DEMO_CHAUF.clients[1][0] === 'Restaurant Le Vieux Port');
  const blocPlomb = N.slice(N.indexOf("ajoute('note-depannage',c1", N.indexOf('Remplacement du groupe de sécurité', N.indexOf('function docmDemoPoser') ) - 300), N.indexOf('Remplacement du groupe de sécurité', N.indexOf('function docmDemoPoser')) + 60);
  vrai('(population) le client c1 du jeu plomberie est un syndic de résidence (habitation) : son taux réduit reste', DEMO_PLOMB.clients[1][0] === 'Syndic Résidence Les Lilas' && /tva:'10'/.test(blocPlomb), blocPlomb.slice(0, 200)); }

console.log('\n── 3170 · 5. relecture 7 — la suppression d\'un document suit la case de SON droit ──');
{ const defs = { 'devis-depannage': { droit: 'ventes' }, 'rapport-etancheite': { droit: 'int' }, 'suivi-vignette': { droit: 'crm' } };
  const essai = (docId, droitsOk) => { const gardes = []; const db = { docsMetier: [{ id: 'd1', doc: docId }] }; let toasts = [], conf = [];
    const init = { db, console, COLL_GRP: evalue(litteral(N, 'const COLL_GRP={')), docmDef: id => defs[id], canCat: (g, a) => { gardes.push(g + ':' + a); return droitsOk.indexOf(g) >= 0; }, can: () => true, toast: m => toasts.push(m), confirm: m => { conf.push(m); return false; }, ptPeutCorriger: () => true, delLibelle: () => 'ce document', boxTxt: s => s };
    const b = bac('app.html', ['delItem'], init); b.fn.delItem('docsMetier', 'd1'); return { gardes, toasts, conf }; };
  let r = essai('devis-depannage', ['ventes']);
  vrai('un devis de dépannage : la garde lit « ventes », et avec cette case la suppression arrive à la confirmation', r.gardes[0] === 'ventes:supprimer' && r.conf.length === 1, r);
  r = essai('devis-depannage', ['crm']);
  vrai('… avec la seule case « crm » (celle de la collection), elle est REFUSÉE', r.gardes[0] === 'ventes:supprimer' && r.conf.length === 0 && r.toasts.length === 1, r);
  r = essai('rapport-etancheite', ['int']);
  vrai('un rapport d\'étanchéité : la garde lit « int »', r.gardes[0] === 'int:supprimer' && r.conf.length === 1, r);
  r = essai('suivi-vignette', ['crm']);
  vrai('un suivi de vignette : « crm » comme avant', r.gardes[0] === 'crm:supprimer' && r.conf.length === 1, r);
  r = essai('inconnu', ['crm']);
  vrai('un type de document inconnu retombe sur la case de la collection (« crm »)', r.gardes[0] === 'crm:supprimer', r); }

console.log('\n── 3170 · 6. B1 — le Devis IA distingue le réseau tombé du serveur d\'avant ──');
{ const dev = (reponse) => { let appels = 0; const init = { METIERS, BETA_ESSAI: false, db: { metier: 'plomberie' }, console, _devisMetierOk: null, _devisMetierReseau: false, PUSH_API: 'http://x', syncTeam: () => 't1',
      fetch: () => { appels++; return reponse === 'panne' ? Promise.reject(new Error('réseau')) : reponse === '502' ? Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({}) }) : Promise.resolve({ ok: true, json: () => Promise.resolve(reponse) }); },
      DEVIS_METIER_ATTENTE: 'MAJ-SERVEUR', DEVIS_METIER_RESEAU: 'SERVEUR-MUET' };
    const b = bac('app.html', ['devisMetierPret', 'devisMetierMsg', 'estMetier3D', 'metierId'], init); return { b, nb: () => appels }; };
  const vieux = dev({ ok: true });
  (async () => {
    vrai('serveur d\'AVANT (répond sans `metiers`) : non, le message dit « mise à jour du serveur », et le verdict se retient (un seul appel)', (await vieux.b.fn.devisMetierPret()) === false && vieux.b.fn.devisMetierMsg() === 'MAJ-SERVEUR' && (await vieux.b.fn.devisMetierPret()) === false && vieux.nb() === 1);
    const muet = dev('panne');
    vrai('⛔ réseau tombé : non, MAIS le message dit « le serveur ne répond pas » (pas « mise à jour du serveur »)…', (await muet.b.fn.devisMetierPret()) === false && muet.b.fn.devisMetierMsg() === 'SERVEUR-MUET');
    vrai('… et la panne n\'est PAS retenue : le geste suivant réessaie', (await muet.b.fn.devisMetierPret()) === false && muet.nb() === 2);
    const m502 = dev('502');
    vrai('une réponse 502 compte pour un serveur injoignable, pas pour un serveur d\'avant', (await m502.b.fn.devisMetierPret()) === false && m502.b.fn.devisMetierMsg() === 'SERVEUR-MUET');
    const neuf = dev({ ok: true, metiers: true });
    vrai('serveur à jour : oui, retenu', (await neuf.b.fn.devisMetierPret()) === true && (await neuf.b.fn.devisMetierPret()) === true && neuf.nb() === 1);
    vrai('la ligne d\'état du modal écrit une phrase quand le réseau tombe (le `.catch` ne se tait plus)', /\.catch\(\(\)=>\{ const el=\$\('dia-etat'\); if\(el&&!el\.textContent\)\{ el\.textContent='⚠ Le serveur ne répond pas/.test(N.replace(/\n/g, ' ')));
    console.log('\n════ test-3170 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
    process.exit(ko ? 1 : 0);
  })();
}
