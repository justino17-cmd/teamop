/* ══ test-3172 · CHAUFFAGE ET CLIMATISATION SÉPARÉS, ET LES PACKS COMBINÉS ═══════════════════════════════════════════════════════════
   Justin, 29 octobre 2026 : « Fais-moi un pack Clim et plomberie séparées aussi » — il a choisi de SÉPARER la climatisation du chauffage —, puis :
   « Fais des packs, combinés, et des packs séparés de chaque chose ». Ce banc lit le référentiel (metiers.json), le pack embarqué (app.html) et EXÉCUTE
   les vraies fonctions de choix de métier (bac) :
   1. le référentiel : « climatisation » existe, juste après « chauffage », ouvert ; ce que chacun contient (et ne contient pas) ;
   2. ⛔ RIEN N'EST PERDU : l'UNION des deux packs redonne exactement ce que « Chauffage / Climatisation » portait (types, prestations, relevés,
      catégories, catalogue de 39 articles) — une entreprise restée sur `chauffage` qui ajoute la climatisation retrouve tout ;
   3. le catalogue de départ et les fournisseurs de chacun : catégories du métier seulement, aucun contact inventé ;
   4. les packs COMBINÉS : quatre, le premier de la liste est le métier principal, ce ne sont PAS des métiers de plus (rien dans `METIERS`) ;
   5. `metiersPlusDe` / `metierPackDe` : jusqu'à DEUX associés, la réunion pas à pas, sans second métier le pack est LA MÊME référence qu'avant ;
   6. `metierComboSet`, `metierSet('combo:…')`, `metierPlusSet`, `metierPlus2Set` : l'administrateur seul, rangé dans la base, journalisé, un save, « Annuler » rend l'état d'avant.
   Au navigateur : scratchpad/sonde-metier-clim.js. */
'use strict';
const fs = require('fs'), path = require('path');
const { lire, litteral, evalue, bac } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const REF = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'metiers.json'), 'utf8'));
const { N } = lire('app.html');
const METIERS = evalue(litteral(N, 'const METIERS={'));
const ORDRE = evalue(litteral(N, 'const METIERS_ORDRE=['));
const COMBOS = evalue(litteral(N, 'const METIERS_COMBOS=['));
const CC = evalue(litteral(N, 'const CATALOGUE_CHAUF=[')), CL = evalue(litteral(N, 'const CATALOGUE_CLIM=['));
const FC = evalue(litteral(N, 'const FOURNISSEURS_CHAUF=[')), FL = evalue(litteral(N, 'const FOURNISSEURS_CLIM=['));
const CP = evalue(litteral(N, 'const CATALOGUE_PLOMB=[')), FP = evalue(litteral(N, 'const FOURNISSEURS_PLOMB=['));
METIERS.chauffage.catalogue = CC; METIERS.chauffage.fournisseurs = FC; METIERS.climatisation.catalogue = CL; METIERS.climatisation.fournisseurs = FL; METIERS.plomberie.catalogue = CP; METIERS.plomberie.fournisseurs = FP;   // l'application les rattache plus bas (assignations de code)
const ch = REF.metiers.chauffage, cl = REF.metiers.climatisation;
const ens = l => new Set(l);
const inter = (a, b) => a.filter(x => b.includes(x));
const unionDe = (...L) => [...new Set([].concat(...L))];

console.log('\n── 3172 · 1. le référentiel ──');
vrai('« climatisation » existe, nommé « Climatisation / Pompes à chaleur », icône ❄️', !!cl && cl.nom === 'Climatisation / Pompes à chaleur' && cl.ic === '❄️', cl && cl.nom);
vrai('« chauffage » s\'appelle « Chauffage » et garde son identifiant', ch.nom === 'Chauffage' && Object.keys(REF.metiers).includes('chauffage'), ch.nom);
const i = REF.ordreMetiers.indexOf('chauffage');
vrai('l\'ordre : climatisation juste après chauffage, dans le référentiel ET dans l\'application', REF.ordreMetiers[i + 1] === 'climatisation' && ORDRE[ORDRE.indexOf('chauffage') + 1] === 'climatisation', [REF.ordreMetiers.slice(i, i + 3), ORDRE.slice(2, 7)]);
const BETA = require('./beta-en-avance.js');
vrai('⛔ « climatisation » n\'est PAS dans `ouverts` : la version publique ne la connaît pas (un client qui la choisirait recevrait le pack 3D) — elle est déclarée en avance (tests/beta-en-avance.js) jusqu\'au geste de publication', !REF.ouverts.includes('climatisation') && BETA.PAS_ENCORE_OUVERTS.includes('climatisation'), [REF.ouverts.length, BETA.PAS_ENCORE_OUVERTS]);
vrai('24 métiers (23 + la climatisation), dans le référentiel et dans l\'application', Object.keys(REF.metiers).length === 24 && ORDRE.length === 24 && Object.keys(METIERS).length === 24, [Object.keys(REF.metiers).length, ORDRE.length]);
vrai('les fonctions communes qui citaient le chauffage citent aussi la climatisation (F1, F2, F3, F6, F7, F8, F11, F12)', ['F1', 'F2', 'F3', 'F6', 'F7', 'F8', 'F11', 'F12'].every(f => REF.fonctionsCommunes[f].metiers.includes('climatisation')), 0);
vrai('les mêmes rubriques pour les deux (aucune ouverte par défaut en plus ni en moins)', JSON.stringify(ch.rubriques) === JSON.stringify(cl.rubriques) && ch.rubriques.length === 24);
vrai('chaque rubrique conseillée a sa raison, dans les deux métiers', [ch, cl].every(m => m.rubriques.every(r => typeof m.pourquoi[r] === 'string' && m.pourquoi[r].length > 20)));
vrai('chauffage : aucun mot de climatisation ni de fluide dans les raisons des rubriques', !Object.values(ch.pourquoi).some(t => /climatis|fluide|pompe à chaleur/i.test(t)), Object.values(ch.pourquoi).filter(t => /climatis|fluide|pompe à chaleur/i.test(t)));
vrai('climatisation : aucun mot de chaudière ni de combustion dans les raisons des rubriques', !Object.values(cl.pourquoi).some(t => /chaudi|combustion|ramonage/i.test(t)), Object.values(cl.pourquoi).filter(t => /chaudi|combustion|ramonage/i.test(t)));

console.log('\n── 3172 · 2. ce que chacun contient ──');
const T = (m, x) => m.types.includes(x), S = (m, x) => m.presta.includes(x);
vrai('chauffage : chaudières, ramonage, désembouage ; ni climatisation ni pompe à chaleur ni fluide', ['Entretien annuel chaudière', 'Entretien chaudière fioul ou bois', 'Ramonage', 'Désembouage', 'Dépannage chauffage'].every(x => T(ch, x)) && !ch.types.some(t => /climatis|pompe à chaleur|fluide|thermodynamique/i.test(t)), ch.types);
vrai('climatisation : entretien clim et PAC, dépannage, étanchéité, récupération, chauffe-eau thermodynamique ; ni chaudière ni ramonage', ['Entretien climatisation', 'Entretien pompe à chaleur', 'Dépannage climatisation', 'Contrôle d\'étanchéité des fluides frigorigènes', 'Récupération de fluide / démantèlement', 'Entretien chauffe-eau thermodynamique'].every(x => T(cl, x)) && !cl.types.some(t => /chaudi|ramonage|désembouage|dépannage chauffage/i.test(t)), cl.types);
vrai('chauffage : prestations de combustion (analyse, tirage, CO ambiant, rendement) ; aucune de fluide', ['Analyse de combustion', 'Mesure du tirage', 'Mesure du CO ambiant dans le local de la chaudière', 'Évaluation du rendement de la chaudière'].every(x => S(ch, x)) && !ch.presta.some(p => /fluide|frigorifique|inversion de cycle|unité/i.test(p)), ch.presta.filter(p => /fluide|frigorifique|inversion de cycle|unité/i.test(p)));
vrai('climatisation : prestations de fluide (charge, fuite, récupération, vignette, inversion de cycle) ; aucune de combustion', ['Contrôle de la charge de fluide', 'Récupération et pesée du fluide', 'Pose de la vignette de contrôle d\'étanchéité', 'Contrôle du fonctionnement de l’inversion de cycle'].every(x => S(cl, x)) && !cl.presta.some(p => /combustion|brûleur|tirage|chaudière|corps de chauffe|radiateur/i.test(p)), cl.presta.filter(p => /combustion|brûleur|tirage|chaudière|corps de chauffe|radiateur/i.test(p)));
const rk = m => m.releves.map(r => r.k);
vrai('relevés : le CO et la combustion au chauffage ; le fluide, le PRP, le bordereau à la climatisation', ['coAmbiant', 'co', 'co2', 'rdt', 'tfum', 'tirage', 'nox', 'pgaz', 'classe', 'instrument'].every(k => rk(ch).includes(k)) && ['fluide', 'fluideType', 'prp', 'tco2', 'fluideCharge', 'fluideRecup', 'contenant', 'bordereau', 'fuite'].every(k => rk(cl).includes(k)) && !rk(ch).includes('bordereau') && !rk(cl).includes('coAmbiant'), [rk(ch), rk(cl)]);
const dch = ch.documents.join(' | '), dcl = cl.documents.join(' | ');
vrai('chauffage : attestation de chaudière, de ramonage, suivi gaz et vignette ; pas d\'attestation PAC ni de fiche fluides', /Attestation d’entretien de chaudière/.test(dch) && /Attestation de ramonage/.test(dch) && /certificat de conformité gaz/.test(dch) && /vignette/.test(dch) && !/pompe à chaleur/.test(dch) && !/Cerfa/.test(dch), ch.documents);
vrai('climatisation : attestation PAC / clim (4 à 70 kW), fiche fluides Cerfa 15497, vignette ; pas d\'attestation de chaudière ni de ramonage ni de gaz', /pompe à chaleur ou de climatisation \(4 à 70 kW\)/.test(dcl) && /Cerfa 15497/.test(dcl) && /vignette/.test(dcl) && !/de chaudière/.test(dcl) && !/ramonage/i.test(dcl) && !/gaz/.test(dcl), cl.documents);
vrai('les deux ont le devis et la note de dépannage (mentions de l\'arrêté du 24 janvier 2017) ; chacun son rapport d\'intervention', [ch, cl].every(m => /Devis de dépannage/.test(m.documents[0]) && /Note de dépannage/.test(m.documents[1])) && /Rapport d’intervention chauffage$/.test(ch.documents[2]) && /Rapport d’intervention climatisation$/.test(cl.documents[2]), [ch.documents[2], cl.documents[2]]);
vrai('obligations : la chaudière et le CO au chauffage ; PAC, Cerfa, étanchéité, HFO, Trackdéchets à la climatisation — chacune avec sa source', ch.obligations.some(o => /chaudières de 4 à 400 kW/.test(o.texte)) && ch.obligations.some(o => /Seuils de CO/.test(o.texte)) && cl.obligations.some(o => /Pompes à chaleur et climatisations de 4 à 70 kW/.test(o.texte)) && cl.obligations.some(o => /Cerfa 15497/.test(o.texte)) && cl.obligations.some(o => /Trackdéchets/.test(o.texte)) && cl.obligations.some(o => /HFO/.test(o.texte)) && !ch.obligations.some(o => /Cerfa|Trackdéchets|HFO/.test(o.texte)) && !cl.obligations.some(o => /Seuils de CO|ramonage/i.test(o.texte)) && [ch, cl].every(m => m.obligations.every(o => /^https:\/\//.test(o.source))), [ch.obligations.length, cl.obligations.length]);
vrai('la périodicité « à confirmer » des PAC reste « à confirmer » (rien n\'est devenu une obligation)', cl.obligations.filter(o => /périodicité de deux ans/.test(o.texte)).every(o => o.aConfirmer === true) && cl.obligations.some(o => o.aConfirmer === true));

console.log('\n── 3172 · 3. ⛔ RIEN N\'EST PERDU : l\'union redonne l\'ancien « Chauffage / Climatisation » ──');
const ANC = { types: 16, presta: 30, releves: 22, produits: 12, documents: 9 };
vrai('types : 16 en tout (VMC dans les deux), aucun ne manque', unionDe(ch.types, cl.types).length === ANC.types, unionDe(ch.types, cl.types).length);
vrai('prestations : 30 en tout', unionDe(ch.presta, cl.presta).length === ANC.presta, unionDe(ch.presta, cl.presta).length);
vrai('relevés : 22 en tout, aucun perdu', unionDe(rk(ch), rk(cl)).length === ANC.releves, unionDe(rk(ch), rk(cl)).length);
vrai('catégories de produits : 12 en tout', unionDe(ch.produits, cl.produits).length === ANC.produits, unionDe(ch.produits, cl.produits).length);
vrai('documents : neuf en tout, dont les deux rapports d\'intervention qui remplacent « chauffage / climatisation »', unionDe(ch.documents, cl.documents).length === ANC.documents + 1 && unionDe(ch.documents, cl.documents).filter(d => /^Rapport d’intervention/.test(d)).length === 2, unionDe(ch.documents, cl.documents).length);
vrai('les pack embarqués disent la même chose que le référentiel (types, prestations, catégories, documents)', ['chauffage', 'climatisation'].every(k => JSON.stringify([METIERS[k].types, METIERS[k].presta, METIERS[k].produits, METIERS[k].documents]) === JSON.stringify([REF.metiers[k].types, REF.metiers[k].presta, REF.metiers[k].produits, REF.metiers[k].documents])));
vrai('les obligations d\'avant (12) sont toutes là, dans l\'un ou l\'autre', unionDe(ch.obligations.map(o => o.texte), cl.obligations.map(o => o.texte)).length === 12);

console.log('\n── 3172 · 4. les catalogues de départ et les fournisseurs ──');
const nomsC = l => l.map(a => a[0]);
vrai('chauffage : 28 articles ; climatisation : 16 ; l\'union redonne les 39 d\'avant', CC.length === 28 && CL.length === 16 && unionDe(nomsC(CC), nomsC(CL)).length === 39, [CC.length, CL.length, unionDe(nomsC(CC), nomsC(CL)).length]);
vrai('les cinq consommables communs sont dans les deux, rien d\'autre', inter(nomsC(CC), nomsC(CL)).length === 5, inter(nomsC(CC), nomsC(CL)));
vrai('aucun fluide ni appareil de climatisation dans le catalogue du chauffage ; aucune pièce de chaudière dans celui de la climatisation', !CC.some(a => /Fluide frigorigène|climatis|évaporateur|frigorifique|condensats|unité extérieure/i.test(a[0])) && !CL.some(a => /chaudière|brûleur|radiateur|circulateur|désembou|fumée|thermostat/i.test(a[0])), 0);
for (const [k, C] of [['chauffage', CC], ['climatisation', CL]]) {
  vrai(k + ' : chaque article range dans une catégorie du métier, et chaque catégorie du métier est servie', C.every(a => METIERS[k].produits.includes(a[1])) && METIERS[k].produits.every(p => C.some(a => a[1] === p)), METIERS[k].produits.filter(p => !C.some(a => a[1] === p)));
}
vrai('le rattachement : `METIERS[\'climatisation\'].catalogue=CATALOGUE_CLIM` et ses fournisseurs, dans le code', /METIERS\['climatisation'\]\.catalogue=CATALOGUE_CLIM; METIERS\['climatisation'\]\.fournisseurs=FOURNISSEURS_CLIM;/.test(N));
vrai('fournisseurs : cinq au chauffage (pas Climalife), cinq à la climatisation (Climalife, pas Chausson)', FC.length === 5 && FL.length === 5 && FL.some(f => f.nom === 'Climalife') && !FC.some(f => f.nom === 'Climalife') && !FL.some(f => f.nom === 'Chausson Matériaux') && FC.some(f => f.nom === 'Chausson Matériaux'), [FC.map(f => f.nom), FL.map(f => f.nom)]);
vrai('aucun contact, téléphone, courriel ni adresse inventé', [...FC, ...FL].every(f => !f.contact && !f.telephone && !f.email && !f.adresse), 0);

console.log('\n── 3172 · 5. les packs combinés ──');
egal('quatre packs, dans l\'ordre voulu', COMBOS.map(c => c.k), ['cvc', 'plombier-chauffagiste', 'plomberie-clim', 'plomberie-chauffage-clim']);
egal('« Chauffage + Climatisation (CVC) » : chauffage d\'abord', COMBOS[0].liste, ['chauffage', 'climatisation']);
egal('« Plombier-chauffagiste (Plomberie + Chauffage) » : plomberie d\'abord', COMBOS[1].liste, ['plomberie', 'chauffage']);
egal('« Plomberie + Climatisation »', COMBOS[2].liste, ['plomberie', 'climatisation']);
egal('« Plomberie + Chauffage + Climatisation »', COMBOS[3].liste, ['plomberie', 'chauffage', 'climatisation']);
egal('les noms demandés par Justin', COMBOS.map(c => c.nom), ['Chauffage + Climatisation (CVC)', 'Plombier-chauffagiste (Plomberie + Chauffage)', 'Plomberie + Climatisation', 'Plomberie + Chauffage + Climatisation']);
vrai('ce ne sont PAS des métiers de plus : aucun identifiant de pack dans METIERS, dans l\'ordre, ni dans le référentiel', COMBOS.every(c => !METIERS[c.k] && !ORDRE.includes(c.k) && !REF.metiers[c.k] && !REF.ordreMetiers.includes(c.k)));
vrai('chaque pack : des métiers connus (ouverts, ou déclarés en avance pour la bêta), distincts, jamais la 3D, au plus un principal et deux associés', COMBOS.every(c => c.liste.length >= 2 && c.liste.length <= 3 && new Set(c.liste).size === c.liste.length && c.liste.every(m => METIERS[m] && m !== '3d' && (REF.ouverts.includes(m) || BETA.PAS_ENCORE_OUVERTS.includes(m)))));
vrai('chaque pack a un nom, une icône et un identifiant sans espace', COMBOS.every(c => c.nom && c.ic && /^[a-z-]+$/.test(c.k)));

console.log('\n── 3172 · 6. la réunion des packs (la vraie `metierPackDe`) ──');
const NOMS = ['metiersPlusDe', 'metierPackDe', 'metierId', 'metierPack', 'metierActifs', 'metierPlusSet', 'metierPlus2Set', 'metiersAssociesPoser', 'metierComboDe', 'metierComboCourant', 'metierResiduDemander', 'metierComboSet', 'metierPackRestaurer', 'metierSet', 'metierGereParc', 'estMetier3D'];
const CVC = evalue(litteral(N, 'const CVC_METIERS=['));
const monde = (metier, p1, p2, o) => { const db = { metier, metierPlus: p1 || '', metierPlus2: p2 || '', clients: [], produits: [], fournisseurs: [], users: [{ id: 'u1', role: 'admin' }] }; const saves = [], toasts = [], journal = [], confirms = [];
  const init = Object.assign({ METIERS, METIERS_COMBOS: COMBOS, db, BETA_ESSAI: false, console, toast: m => toasts.push(m), save: () => saves.push(1), logEvent: (a, b) => journal.push([a, b]), renderNav: () => {}, currentUser: { id: 'u1', role: 'admin' },
    views: { parametres() {} }, CVC_METIERS: CVC, NETT_METIERS: ['nettoyage'], toastAnnuler: (m, code) => toasts.push(m + ' ⟲ ' + code), confirm: m => { confirms.push(m); return true; }, metierResidu: () => null, metierResiduRetirer: () => {} }, o || {});
  return { db, b: bac('app.html', NOMS, init), saves, toasts, journal, confirms, init }; };
const uniq = l => new Set(l.map(x => String(x).toLowerCase())).size === l.length;
vrai('sans associé : `metierPack` et `metierPackDe` rendent LA MÊME référence qu\'avant (chauffage, climatisation, plomberie)', ['chauffage', 'climatisation', 'plomberie'].every(k => { const w = monde(k); return w.b.fn.metierPack() === METIERS[k] && w.b.fn.metierPackDe(w.db) === METIERS[k]; }));
for (const c of COMBOS) {
  const w = monde(c.liste[0], c.liste[1], c.liste[2]), f = w.b.fn, pk = f.metierPack();
  const att = unionDe(...c.liste.map(m => METIERS[m].types)), attP = unionDe(...c.liste.map(m => METIERS[m].presta)), attD = unionDe(...c.liste.map(m => METIERS[m].documents));
  vrai(c.nom + ' : le pack servi est la réunion (types, prestations, documents), chacun une fois, le principal d\'abord', uniq(pk.types) && uniq(pk.presta) && uniq(pk.documents) && pk.types.length === att.length && pk.presta.length === attP.length && pk.documents.length === attD.length && pk.types[0] === METIERS[c.liste[0]].types[0] && pk.nom === METIERS[c.liste[0]].nom, [pk.types.length, att.length]);
  vrai(c.nom + ' : le catalogue et les fournisseurs réunis, sans doublon de nom ; les relevés par clé', uniq(pk.catalogue.map(a => a[0])) && uniq(pk.fournisseurs.map(x => x.nom)) && uniq(pk.releves.map(r => r.k)) && c.liste.every(m => METIERS[m].catalogue.every(a => pk.catalogue.some(b => b[0] === a[0]))));
  egal(c.nom + ' : `metierActifs` rend le principal puis les associés', f.metierActifs(), c.liste);
  egal(c.nom + ' : `metierComboCourant` reconnaît le pack', f.metierComboCourant(), c.k);
  vrai(c.nom + ' : `metierGereParc` — le parc d\'appareils s\'ouvre dès que l\'un des métiers est CVC', f.metierGereParc() === c.liste.some(m => CVC.includes(m)));
}
{ const w = monde('plomberie', 'chauffage', 'climatisation'), f = w.b.fn, a = f.metierPack(), b = f.metierPack(); vrai('le pack à trois est calculé une fois (même référence au second appel)', a === b); }
vrai('même ensemble, autre ordre : le pack à trois a les mêmes types (la réunion ne perd rien selon l\'ordre)', JSON.stringify([...monde('plomberie', 'chauffage', 'climatisation').b.fn.metierPack().types].sort()) === JSON.stringify([...monde('plomberie', 'climatisation', 'chauffage').b.fn.metierPack().types].sort()));
{ const f = monde('plomberie', '', 'climatisation').b.fn; vrai('un second associé SANS premier compte quand même (jamais deux fois le même)', JSON.stringify(f.metierActifs()) === '["plomberie","climatisation"]' && f.metierPack().types.includes('Entretien climatisation')); }
{ const f = monde('chauffage', 'climatisation', 'climatisation').b.fn; egal('deux fois le même associé : une seule fois', f.metierActifs(), ['chauffage', 'climatisation']); }
{ const f = monde('chauffage', 'chauffage', 'plomberie').b.fn; egal('un métier n\'est pas son propre complément ; l\'autre associé reste', f.metierActifs(), ['chauffage', 'plomberie']); }
{ const f = monde('chauffage', 'inexistant', '3d').b.fn; vrai('un identifiant inconnu et la 3D comme associé sont ignorés', JSON.stringify(f.metierActifs()) === '["chauffage"]' && f.metierPack() === METIERS.chauffage); }
{ const f = monde('3d', 'chauffage', 'climatisation').b.fn; vrai('⛔ la 3D ne reçoit jamais d\'associé : son pack est EXACTEMENT celui d\'avant', JSON.stringify(f.metierActifs()) === '["3d"]' && f.metierPack() === METIERS['3d']); }

console.log('\n── 3172 · 7. les gestes ──');
{ const w = monde('chauffage'), f = w.b.fn; f.metierComboSet('plomberie-chauffage-clim');
  vrai('`metierComboSet` pose le principal et les deux associés d\'un seul geste, journalisé, UN save, « Annuler » proposé', w.db.metier === 'plomberie' && w.db.metierPlus === 'chauffage' && w.db.metierPlus2 === 'climatisation' && w.saves.length === 1 && JSON.stringify(w.journal) === '[["Pack de métiers","Plomberie + Chauffage + Climatisation"]]' && w.toasts.some(t => /Plomberie \+ Chauffage \+ Climatisation/.test(t) && /metierPackRestaurer\('chauffage','',''\)/.test(t)), [w.db, w.toasts, w.journal]);
  w.b.fn.metierComboSet('plomberie-chauffage-clim'); vrai('… le même pack rejoué n\'écrit rien', w.saves.length === 1 && w.toasts[w.toasts.length - 1] === 'C’est déjà ton pack');
  f.metierPackRestaurer('chauffage', '', ''); vrai('`metierPackRestaurer` (l\'annulation) rend l\'état d\'avant, associés compris', w.db.metier === 'chauffage' && w.db.metierPlus === '' && w.db.metierPlus2 === '' && w.saves.length === 2); }
{ const w = monde('chauffage', 'plomberie'), f = w.b.fn; f.metierComboSet('cvc');
  vrai('un pack qui garde le même principal ne demande pas de retirer la démonstration, et REMPLACE les associés d\'avant', w.db.metier === 'chauffage' && w.db.metierPlus === 'climatisation' && w.db.metierPlus2 === '' && w.confirms.length === 0, w.db); }
{ const w = monde('chauffage', '', '', { metierResidu: () => ({ total: 3, ints: 3, clients: 0, techs: 0, produits: 0, fours: 0 }), confirm: m => { w.confirms.push(m); return false; } }); w.init.confirm = m => { w.confirms.push(m); return false; };
  w.b.fn.metierComboSet('plomberie-clim');
  vrai('changer de métier principal demande, comme `metierSet`, et un refus ne change RIEN', w.confirms.length === 1 && w.db.metier === 'chauffage' && w.db.metierPlus === '' && w.saves.length === 0, [w.confirms.length, w.db]); }
{ const w = monde('chauffage'); w.b.fn.metierComboSet('pack-inconnu'); w.b.fn.metierComboSet(''); vrai('un pack inconnu ne fait rien', w.db.metier === 'chauffage' && w.saves.length === 0); }
{ const w = monde('chauffage', '', '', { currentUser: { id: 'u2', role: 'technicien' } }); w.b.fn.metierComboSet('cvc'); vrai('⛔ seul l\'administrateur change de pack', w.db.metierPlus === '' && w.saves.length === 0 && w.toasts.some(t => /Seul l’administrateur/.test(t))); }
{ const w = monde('chauffage'); w.b.fn.metierSet('combo:plombier-chauffagiste');
  vrai('`metierSet(\'combo:…\')` aiguille vers le pack : la liste de la bêta et les cartes gardent leur appel', w.db.metier === 'plomberie' && w.db.metierPlus === 'chauffage', w.db); }
{ const w = monde('plomberie', 'chauffage', 'climatisation'); w.b.fn.metierSet('climatisation');
  vrai('`metierSet` d\'un métier simple : le métier qui devient principal quitte la liste des associés (jamais son propre complément)', w.db.metier === 'climatisation' && w.db.metierPlus === 'chauffage' && w.db.metierPlus2 === '', w.db); }
{ const w = monde('chauffage', 'plomberie', 'climatisation'); w.b.fn.metierSet('climatisation');
  vrai('… dans l\'un ou l\'autre des deux champs', w.db.metier === 'climatisation' && w.db.metierPlus === 'plomberie' && w.db.metierPlus2 === '', w.db); }
{ const w = monde('chauffage'); w.b.fn.metierPlus2Set('climatisation'); vrai('un second associé ne se pose pas sans le premier', w.db.metierPlus2 === '' && w.saves.length === 0);
  w.b.fn.metierPlusSet('plomberie'); w.b.fn.metierPlus2Set('climatisation');
  vrai('`metierPlus2Set` : rangé dans la base, journalisé, « Annuler » propose de remettre l\'ancien second', w.db.metierPlus === 'plomberie' && w.db.metierPlus2 === 'climatisation' && w.saves.length === 2 && w.toasts[w.toasts.length - 1].includes("metierPlus2Set('')") && w.journal.some(j => j[0] === 'Seconde activité complémentaire'), [w.db, w.toasts]);
  w.b.fn.metierPlus2Set('climatisation'); vrai('… rejoué, il n\'écrit rien', w.saves.length === 2);
  w.b.fn.metierPlus2Set('plomberie'); w.b.fn.metierPlus2Set('chauffage'); vrai('… le second ne peut être ni le premier ni le métier', w.db.metierPlus2 === 'climatisation' && w.saves.length === 2);
  w.b.fn.metierPlusSet('climatisation'); vrai('choisir comme PREMIER le métier qui était second le retire du second', w.db.metierPlus === 'climatisation' && w.db.metierPlus2 === '', w.db);
  w.b.fn.metierPlusSet('plomberie'); w.b.fn.metierPlus2Set('climatisation'); w.b.fn.metierPlusSet('');
  vrai('retirer le premier fait remonter le second, et « Annuler » rend les DEUX', w.db.metierPlus === 'climatisation' && w.db.metierPlus2 === '' && /metiersAssociesPoser\('plomberie','climatisation'\)/.test(w.toasts[w.toasts.length - 1]), [w.db, w.toasts[w.toasts.length - 1]]);
  w.b.fn.metiersAssociesPoser('plomberie', 'climatisation'); vrai('`metiersAssociesPoser` remet les deux associés', w.db.metierPlus === 'plomberie' && w.db.metierPlus2 === 'climatisation'); }
{ const w = monde('3d'); w.b.fn.metierPlusSet('chauffage'); w.b.fn.metierPlus2Set('climatisation');
  vrai('la 3D : « fait aussi » refusé, rien n\'est écrit (elle garde son pack tel quel)', w.db.metierPlus === '' && w.db.metierPlus2 === '' && w.saves.length === 0, w.db);
  w.b.fn.metierComboSet('cvc'); vrai('… un pack combiné, lui, la quitte pour son métier principal (la 3D n\'est jamais dans un pack)', w.db.metier === 'chauffage' && w.db.metierPlus === 'climatisation' && w.saves.length === 1, w.db); }

console.log('\n── 3172 · 8. le code : les cinq portes qui connaissaient le seul chauffage ──');
vrai('le parc d\'appareils (CVC_METIERS) compte la climatisation', CVC.includes('climatisation') && CVC.includes('chauffage'), CVC);
const DEFS = evalue(litteral(N, 'const DOCM_DEFS=[').replace(/DOCM_TVA/g, 'null').replace(/DOCM_OUI/g, 'null'));
const doc = id => DEFS.find(d => d.id === id).metiers;
egal('devis et note de dépannage : chauffage, climatisation, plomberie', [doc('devis-depannage'), doc('note-depannage')], [['chauffage', 'climatisation', 'plomberie'], ['chauffage', 'climatisation', 'plomberie']]);
egal('suivi de la vignette (fluides) : chauffage et climatisation ; suivi gaz : chauffage et plomberie, PAS la climatisation', [doc('suivi-vignette'), doc('suivi-gaz')], [['chauffage', 'climatisation'], ['chauffage', 'plomberie']]);
vrai('le planning de démonstration de chaque métier n\'emploie que des types de SON pack', ['DEMO_CHAUF', 'DEMO_CLIM'].every(n => { const D = evalue(litteral(N, 'const ' + n + '={')); const k = n === 'DEMO_CHAUF' ? 'chauffage' : 'climatisation'; return D.planning.length === 13 && D.planning.every(r => METIERS[k].types.includes(r[4])) && METIERS[k].types.includes(D.arepartir[1]) && D.clients.every(c => typeof c[3] === 'number' && typeof c[4] === 'number'); }));
vrai('`demoSemisDe` aiguille la climatisation vers DEMO_CLIM (sans toucher le chauffage)', /if\(metierId\(\)==='chauffage'\) return DEMO_CHAUF;\s*if\(metierId\(\)==='climatisation'\) return DEMO_CLIM;/.test(N));
vrai('l\'exemple de saisie de la climatisation existe, avec ses propres libellés', /climatisation:\{ entreprise:'Ex : Clim Océan SARL'/.test(N));
vrai('`metierPlus2` voyage comme `metierPlus` (réglage de l\'entreprise, synchronisé)', /metierPlus: 'reglage', metierPlus2: 'reglage'/.test(N));

console.log(`\n════ test-3172 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
