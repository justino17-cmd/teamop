/* ══ test-2951 · HORS ANTI-NUISIBLES, PLUS RIEN DE L'ANTI-NUISIBLES — ET LA 3D D'ELAN NE CHANGE PAS ════════════════════════════════
   22-23 octobre 2026 (cahier des métiers, point 5 ; Justin : « tu fasses bien OP GESTION en fonction des packs métiers »). Un
   plombier recevait « Nuisibles ciblés », « Méthodes », une clôture guidée qui demande le niveau d'infestation, un champ « N° AMM »
   et un « Dossier sanitaire ». UNE fonction décide (`estMetier3D`), lue par chaque écran qui SAISIT quelque chose de propre à la 3D.
   Ce banc EXÉCUTE les vraies fonctions d'app.html (et de beta.html) — formIntervention, assistRender (étapes 1 à 5), formRapport,
   saveRapport, formProduit, saveProduit, exportInterventionsCsv, ficheClient, formClient, views.techniciens, ficheTech, formTech,
   saveTech — pour la 3D et pour cinq autres métiers, et regarde ce que l'écran MONTRE et ce que l'enregistrement ÉCRIT.
   Quatre choses qu'il ne doit jamais laisser passer :
   · un écran hors 3D qui montre encore un mot ou un champ de l'anti-nuisibles ;
   · la 3D qui perd quoi que ce soit (chaque marqueur est exigé, écran par écran) ;
   · une DONNÉE effacée parce que son champ est caché (constat, nuisibles, AMM, Certibiocide d'une base venue de la 3D) ;
   · un document déjà émis qui ne se relit plus : les lignes d'un rapport se lisent sur la donnée, pas sur le métier d'aujourd'hui.
   La preuve au navigateur (écrans réels, jour et nuit, 1440, 1100 et 390 px, avant/après pour la 3D) vit dans
   scratchpad/metiers/sonde-b.js et scratchpad/metiers/sonde-recense.js.
   Population comptée avant chaque absence : « rien de l'anti-nuisibles » sur un écran qui ne s'est pas rendu passerait au vert.  */
'use strict';
const path = require('path');
const { lire, litteral, evalue, bac } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

/* Ce qu'aucun écran de saisie hors 3D ne doit dire. « sanitaire » seul n'y est pas (« Robinetterie & sanitaire » est un type de plomberie). */
const ANTI = /nuisible|dératis|désinsect|rongeur|biocide|\bAMM\b|matière active|appât|xylophag|infestation|dossier sanitaire|registre sanitaire|\bTP ?1[48]\b|rodonticide|insecticide|virucide|répulsif|proofing|piégeage|glu\b/i;
const METIERS_ESSAIS = ['plomberie', 'chauffage', 'incendie', 'piscine', 'autre'];
const NOMS_BASE = ['metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'libZones', 'mentionRegl', 'prodLineAmm', 'intTypes', 'categoriesProduit', 'categorieListe'];

(async () => {
for (const fichier of ['app.html', 'beta.html']) {
  console.log('\n══ ' + fichier + ' ══');
  const { N } = lire(fichier);
  const METIERS = evalue(litteral(N, 'const METIERS={')), INT_TYPES = evalue(litteral(N, 'const INT_TYPES = [')), CAT_LIST = evalue(litteral(N, 'const CAT_LIST=['));
  const AS_STEPS = evalue(litteral(N, 'const AS_STEPS=['));
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  /* Le monde de chaque essai : une entreprise du métier `m`, venue de la 3D (ses fiches portent des nuisibles, un constat, des AMM). */
  function monde(m) {
    const sortie = { html: '', csv: null, toasts: [] };
    const db0 = { metier: m, clients: [{ id: 'c1', nom: 'Copropriété Les Lilas', typeClient: 'pro', ville: 'Lyon' }, { id: 'c2', nom: 'Mme Durand', typeClient: 'particulier' }],
      techniciens: [{ id: 't1', nom: 'Marc Dubois', metier: 'Technicien', certibiocide: 'CB-123', certibiocideExp: '2027-01-01' }, { id: 't2', nom: 'Sophie Martin', metier: 'Technicien' }],
      users: [], boxes: [], pointages: [], numMax: {}, contrats: [], devis: [], factures: [], vehicules: [], societes: [], champsPerso: [], absences: [], journal: [], fournisseurs: [{ nom: 'Négoce Dupont' }],
      produits: [{ id: 'p1', nom: 'Gel blattes', amm: 'FR-2020-0123', matiereActive: 'Fipronil', categorie: 'TP18 — Insecticide', categorie3d: 'insecticide', fournisseurs: ['MABI'] },
        { id: 'p2', nom: 'Raccord laiton 20/27', categorie: 'Raccords et fittings', fournisseurs: ['Négoce Dupont'] }],
      interventions: [{ id: 'i1', num: 'INT-1', titre: 'Passage du 20 octobre', clientId: 'c1', type: 'Contrôle', statut: 'terminee', date: '2026-10-20', heure: '09:00', duree: 60,
        nuisibles: ['Rats'], methodes: ['Appâtage'], infestation: 'fort', zones: 'cave', materiel: 'pièges',
        constat: { infestation: 'Fort', conformite: 'Conforme', indices: ['Déjections'], recommandations: 'Boucher les accès' },
        produitsUtilises: [{ produitId: 'p1', qte: 1 }], prestation: [], champs: {}, compteRendu: 'Fait', montant: 90 },
        { id: 'i2', num: 'INT-2', titre: 'Fuite évier', clientId: 'c2', type: 'Dépannage fuite', statut: 'planifiee', date: '2026-10-23', heure: '14:00', duree: 60, nuisibles: [], produitsUtilises: [], prestation: [], champs: {} }] };
    /* une collection que le monde n'a pas fournie est une liste vide (db.pointages, db.vehicules…), jamais une erreur */
    const db = new Proxy(db0, { get(t, k) { if (typeof k === 'symbol' || k in t) return t[k]; return (t[k] = []); } });
    let fdata = {};
    const init = { METIERS, INT_TYPES, CAT_LIST, AS_STEPS, BETA_ESSAI: false, db, sortie, norm, console,
      openModal: h => { sortie.html = h; }, esc: s => String(s == null ? '' : s), $: () => null, toast: x => { sortie.toasts.push(String(x)); }, closeModal: () => {}, save: () => {}, go: () => {},
      NUIS_3D: ['Rats', 'Souris'], intNuis: new Set(['Rats']), intMeth: new Set(['Appâtage']), intTrait: {}, rapPhotos: [], rapTags: [], rapConstat: { infestation: 'Fort', indices: [] }, rapPresta: new Set(), rapNuis: [], rapChamps: {}, rapTpe: '',
      asW: { id: 'i1', step: 0, infest: 'fort', obs: '', reco: '', zones: 'cave', materiel: 'pièges', noteInterne: '', sig: '', sigT: '' },
      INF_LV: [['faible', 'Faible', '#0a0']], METHODES: ['Appâtage', 'Piégeage mécanique'], RECO_3D: ['Phrase type 3D'], NUIS_CATS: [], T3D_NUIS_MAP: {}, T3D_CATS: {}, INFEST_NIV: ['Faible', 'Fort'], CONFORMITE: ['Conforme', 'Non conforme'],
      intInfPrev: () => null, infRank: () => 0, intInfOf: () => '', produit: id => db.produits.find(p => p.id === id) || {}, clientName: id => (db.clients.find(c => c.id === id) || {}).nom || '', MENTION_REGL: 'Mention',
      aplatDe: () => ['#000', '#fff'], encreDonnee: c => c, fourColor: () => '#000', fmtShort: x => x, photoSrc: x => x, current: 'dashboard', FOUR_PILLS: ['MABI', 'SODIF', 'ARMOSA', 'ORCAD', 'ENSYSTEX'], prodFours: new Set(),
      intStatutPermis: () => true, intTechIds: () => [], visibleTechniciens: l => l, visibleClients: l => l, visibleInts: l => l, visibleBoxes: () => [], entSocUnique: () => '', intSocDefaut: () => '', MOYENS_PAIEMENT: ['CB'],
      ouvrables: () => ({ cli: () => true, int: () => true }), ptTotal: () => 0, permGarde: () => true, canCat: () => true, can: () => true, currentUser: { id: 'u1', role: 'admin' }, planPlaceLibre: () => true, fichesGere: () => true,
      statutLabel: () => '', STATUT_INT: { terminee: { l: 'Terminée' }, planifiee: { l: 'Planifiée' } }, csvCellMontant: x => x, techNames: () => 'Marc', techColor: () => '#000', initials: s => String(s).slice(0, 2), techDoublons: () => [], tableCard: (h, r) => h.join('|') + '\n' + r,
      csvDownload: (f, h, rows) => { sortie.csv = { h, rows }; }, nomNorm: s => norm(s), views: { produits() {}, techniciens() {} }, logEvent: () => {}, k: (a, b, c, d) => d, cliIsPro: c => c.typeClient !== 'particulier',
      FormData: function (f) { return Object.entries(f.__data || fdata); } };
    return { db, sortie, init, donnees: d => { fdata = d; } };
  }
  const essai = (m, noms, extra, blocs) => { const w = monde(m); const b = bac(fichier, NOMS_BASE.concat(fichier === 'beta.html' ? ['exemple'] : []).concat(noms), Object.assign(w.init, extra || {}), blocs); return Object.assign(w, { b }); };
  const rendu = (m, noms, appel, extra, blocs) => { try { const w = essai(m, noms, extra, blocs); appel(w); return { w, html: w.sortie.html }; } catch (e) { return { erreur: String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') }; } };
  const tous = ['3d'].concat(METIERS_ESSAIS);

  /* ── 1. Le formulaire d'intervention ── */
  console.log('\n1. formIntervention (la fenêtre « ＋ Intervention » et la modification)');
  { const R = {}; tous.forEach(m => { R[m] = rendu(m, ['formIntervention'], w => w.b.fn.formIntervention('i2')); });
    vrai('(population) le formulaire se rend pour les six métiers', tous.every(m => R[m].html && R[m].html.length > 2000), tous.filter(m => !R[m].html).map(m => m + ' : ' + R[m].erreur));
    egal('⛔ la 3D garde « Nuisibles ciblés » et « Méthodes / actions » (rien ne change pour ELAN)', [/Nuisibles ciblés/.test(R['3d'].html), /Méthodes \/ actions/.test(R['3d'].html), /id="int-nuis"/.test(R['3d'].html), /id="int-meth"/.test(R['3d'].html), /Dératisation cuisine/.test(R['3d'].html)], [true, true, true, true, true]);
    egal('⛔ les cinq autres métiers n\'en ont ni le titre ni le conteneur', METIERS_ESSAIS.filter(m => ANTI.test(R[m].html.replace(/Robinetterie & sanitaire/g, '')) || /int-nuis|int-meth/.test(R[m].html)), []);
    egal('   le titre propose un exemple du métier (le premier type de son pack)', METIERS_ESSAIS.map(m => (R[m].html.match(/placeholder="Titre \(ex : ([^)]*)\)"/) || [])[1]), METIERS_ESSAIS.map(m => METIERS[m].types[0])); }

  /* ── 2. La clôture guidée, étape par étape ── */
  console.log('\n2. assistRender : les étapes de la clôture guidée');
  { const etapes = [0, 1, 2, 4], R = {};
    tous.forEach(m => etapes.forEach(e => { R[m + e] = rendu(m, ['assistRender'], w => { w.init.asW.step = e; w.db.interventions[0].produitsUtilises = [{ produitId: 'p1', qte: 1 }]; w.b.fn.assistRender(); }); }));
    vrai('(population) 6 métiers × 4 étapes se rendent', tous.every(m => etapes.every(e => R[m + e].html && R[m + e].html.length > 1500)), Object.keys(R).filter(k => !R[k].html).map(k => k + ' : ' + R[k].erreur));
    const marq = { 0: [/Nuisible\(s\)/, /Niveau d'infestation/], 1: [/Méthodes \/ actions/], 2: [/AMM FR-2020-0123/, /Produits utilisés \(registre\)/], 4: [/Phrases types/, /Phase? type 3D|Phrase type 3D/] };
    egal('⛔ la 3D garde chaque marqueur de chaque étape (Nuisible(s), infestation, Méthodes, AMM, registre, phrases types)', etapes.map(e => marq[e].map(re => re.test(R['3d' + e].html))), etapes.map(e => marq[e].map(() => true)));
    egal('⛔ hors 3D : aucune étape ne parle de nuisibles, d\'infestation, de méthodes, d\'AMM ni de registre', METIERS_ESSAIS.flatMap(m => etapes.filter(e => ANTI.test(R[m + e].html) || /Méthodes \/ actions|Phrases types|\(registre\)/.test(R[m + e].html)).map(e => m + ' étape ' + (e + 1) + ' : ' + (R[m + e].html.match(new RegExp(ANTI.source + '|Méthodes \\/ actions|Phrases types|\\(registre\\)', 'ig')) || []).slice(0, 3).join('/'))), []);
    vrai('   l\'étape « Constat » garde ce qui sert à tous : le champ d\'observations', METIERS_ESSAIS.every(m => /Constat \/ observations/.test(R[m + 0].html) && /Constat — qu'as-tu trouvé sur place/.test(R[m + 0].html)));
    vrai('⛔ la 3D garde la phrase du bas de l\'étape « Produits » À L\'IDENTIQUE (une box ou le stockage) ; les autres n\'y parlent ni de registre ni de box', /Noté sur le rapport et au registre \(n° AMM, traçabilité biocide\) — le stock ne bouge pas : il baisse quand on se sert dans une box ou le stockage\./.test(R['3d2'].html) && METIERS_ESSAIS.every(m => /Noté sur le rapport — le stock ne bouge pas : il baisse quand on se sert dans le stockage\./.test(R[m + 2].html)));
    if (fichier === 'beta.html') { vrai('   l\'étape « Produits » reste (un plombier note ses pièces) : le menu propose les produits, sans AMM', METIERS_ESSAIS.every(m => /Raccord laiton 20\/27/.test(R[m + 2].html) && (m === 'plomberie' ? /Ajouter une pièce ou une fourniture/ : m === 'chauffage' ? /Ajouter une pièce —/ : /Ajouter un produit ou une pièce/).test(R[m + 2].html))); /* écart DÉCLARÉ de la bêta (v780) : « chauffage » ne parle plus de fluides — ils sont passés à « climatisation », que seule la bêta connaît (tests/beta-en-avance.js, metiersBetaSeule) ; la production garde « une pièce ou un fluide » */ } else { vrai('   l\'étape « Produits » reste (un plombier note ses pièces) : le menu propose les produits, sans AMM', METIERS_ESSAIS.every(m => /Raccord laiton 20\/27/.test(R[m + 2].html) && /Ajouter un produit ou une pièce/.test(R[m + 2].html))); }
    vrai('   les cinq étapes gardent leur zone et leur matériel (« Zones concernées »)', METIERS_ESSAIS.every(m => /Zones concernées/.test(R[m + 1].html)) && /Zones traitées/.test(R['3d1'].html)); }

  /* ── 3. Le compte-rendu complet, et son enregistrement ── */
  console.log('\n3. formRapport et saveRapport : le constat déjà saisi ne s\'efface pas');
  { const R = {}; tous.forEach(m => { R[m] = rendu(m, ['formRapport'], w => w.b.fn.formRapport('i1')); });
    vrai('(population) le compte-rendu se rend pour les six métiers', tous.every(m => R[m].html && R[m].html.length > 2500), tous.filter(m => !R[m].html).map(m => m + ' : ' + R[m].erreur));
    egal('⛔ la 3D garde le constat anti-nuisibles, les indices, le traitement par nuisible', [/Constat anti-nuisibles/.test(R['3d'].html), /id="rap-indices"/.test(R['3d'].html), /Traitement par nuisible/.test(R['3d'].html), /id="trait-inline"/.test(R['3d'].html)], [true, true, true, true]);
    egal('⛔ hors 3D : ni constat, ni indices, ni traitement par nuisible — mais les observations et les recommandations restent', METIERS_ESSAIS.filter(m => /Constat anti-nuisibles|rap-indices|Traitement par nuisible|trait-inline|rap-traitement|hygiène/.test(R[m].html) || !/Compte-rendu \/ actions réalisées/.test(R[m].html) || !/Recommandations au client/.test(R[m].html)), []);
    /* l'enregistrement : le formulaire n'envoie PAS infestation / conformité hors 3D — la fiche garde ce qu'elle portait */
    const sauver = (m, donnees) => { const w = essai(m, ['saveRapport'], { syncFactureFromIntervention: () => {}, intRepasseNonTerminee: () => '', clotureSuiteModal: () => {}, intHisto: () => {}, intRecurNext: () => '', rapConstat: { indices: ['Déjections'] }, rapTraitement: {}, intNuis: new Set(['Rats']), intTrait: {} });
      const e = { preventDefault() {}, target: { __data: donnees, effectuee: { checked: false } } };
      w.b.fn.saveRapport(e, 'i1'); return w.db.interventions[0]; };
    const horsFormulaire = { compteRendu: 'Robinet changé', recommandations: 'Surveiller' };
    const res = METIERS_ESSAIS.map(m => { try { return sauver(m, Object.assign({}, horsFormulaire)); } catch (e) { return { erreur: String(e.stack || e).split('\n').slice(0, 2).join(' | ') }; } });
    vrai('(population) saveRapport s\'exécute pour les cinq métiers', res.every(r => r.constat), res.map(r => r.erreur).filter(Boolean));
    egal('⛔ hors 3D, enregistrer le compte-rendu GARDE l\'infestation, la conformité, les indices et les nuisibles déjà saisis', res.filter(r => !r.constat || r.constat.infestation !== 'Fort' || r.constat.conformite !== 'Conforme' || JSON.stringify(r.constat.indices) !== '["Déjections"]' || JSON.stringify(r.nuisibles) !== '["Rats"]').length, 0);
    egal('   … et prend ce que l\'écran envoie (compte-rendu, recommandations)', res.map(r => [r.compteRendu, r.constat.recommandations]), METIERS_ESSAIS.map(() => ['Robinet changé', 'Surveiller']));
    const r3 = sauver('3d', Object.assign({ infestation: 'Faible', conformite: '—' }, horsFormulaire));
    egal('⛔ en 3D, le constat se lit toujours sur le formulaire (Faible) et « — » le vide, comme avant', [r3.constat.infestation, r3.constat.conformite], ['Faible', '']); }

  /* ── 4. Le formulaire produit ── */
  console.log('\n4. formProduit, la liste des fournisseurs, saveProduit');
  { const R = {}; tous.forEach(m => { R[m] = rendu(m, ['formProduit', 'renderProdFours'], w => { w.b.fn.formProduit('p2'); w.els = {}; }, { $: id => { const o = {}; return o; } }); });
    vrai('(population) le formulaire produit se rend pour les six métiers', tous.every(m => R[m].html && R[m].html.length > 3000), tous.filter(m => !R[m].html).map(m => m + ' : ' + R[m].erreur));
    egal('⛔ la 3D garde « Biocide », « N° AMM », « Matière active » et « Type de traitement »', [/Biocide/.test(R['3d'].html), /N° AMM/.test(R['3d'].html), /Matière active/.test(R['3d'].html), /name="categorie3d"/.test(R['3d'].html), /TP14 — Rodenticide/.test(R['3d'].html)], [true, true, true, true, true]);
    if (fichier === 'beta.html') { egal('⛔ le nom du produit : la 3D garde « Ex : XILIX 1000 », les autres un exemple de pièce', [/placeholder="Ex : XILIX 1000"/.test(R['3d'].html), METIERS_ESSAIS.filter(m => /XILIX|MABI|SODIF/.test(R[m].html) || !(m === 'plomberie' ? /placeholder="Ex : Mitigeur de lavabo \(pièce\)"/ : m === 'chauffage' ? /placeholder="Ex : Thermocouple \(pièce\)"/ : /placeholder="Ex : Raccord laiton 20\/27"/).test(R[m].html))], [true, []]); } else { egal('⛔ le nom du produit : la 3D garde « Ex : XILIX 1000 », les autres un exemple de pièce', [/placeholder="Ex : XILIX 1000"/.test(R['3d'].html), METIERS_ESSAIS.filter(m => /XILIX|MABI|SODIF/.test(R[m].html) || !/placeholder="Ex : Raccord laiton 20\/27"/.test(R[m].html))], [true, []]); }
    egal('⛔ hors 3D : ni biocide, ni AMM, ni matière active, ni type de traitement, ni catégorie de la 3D', METIERS_ESSAIS.filter(m => /Biocide|N° AMM|Matière active|categorie3d|Type de traitement|TP1[48]|Xylophage|Proofing/.test(R[m].html)), []);
    /* les pastilles de fournisseurs : les cinq noms du catalogue 3D ne sont proposés qu'à la 3D */
    const pills = m => { const w = essai(m, ['renderProdFours'], { $: id => (w.els[id] = w.els[id] || {}) }); w.els = {}; w.init.prodFours = new Set(); w.b.fn.renderProdFours(); return (w.els['prod-fours'] || {}).innerHTML || ''; };
    egal('⛔ la 3D propose MABI, SODIF, ARMOSA, ORCAD, ENSYSTEX', ['MABI', 'SODIF', 'ARMOSA', 'ORCAD', 'ENSYSTEX'].map(f => pills('3d').includes('>' + f + '<')), [true, true, true, true, true]);
    egal('⛔ hors 3D : seulement les fournisseurs de l\'entreprise', METIERS_ESSAIS.map(m => ['MABI', 'SODIF', 'ARMOSA', 'ORCAD', 'ENSYSTEX'].filter(f => pills(m).includes('>' + f + '<')).concat(pills(m).includes('>NÉGOCE DUPONT<') ? [] : ['NÉGOCE DUPONT absent'])), METIERS_ESSAIS.map(() => []));
    /* enregistrer la fiche d'un produit venu de la 3D, sans ses champs cachés : l'AMM et la matière active restent */
    const sp = m => { const w = essai(m, ['saveProduit'], { prodFours: new Set(['MABI']) }); w.init.prodFours = new Set(['MABI']);
      w.b.fn.saveProduit({ preventDefault() {}, target: { __data: { nom: 'Gel blattes', ref: 'X', categorie: 'TP18 — Insecticide', unite: 'unité', prix: '3,5' } } }, 'p1'); return w.db.produits[0]; };
    const p0 = METIERS_ESSAIS.map(sp);
    egal('⛔ hors 3D, enregistrer une fiche venue de la 3D GARDE son AMM, sa matière active, son type de traitement et sa catégorie', p0.filter(p => p.amm !== 'FR-2020-0123' || p.matiereActive !== 'Fipronil' || p.categorie3d !== 'insecticide' || p.categorie !== 'TP18 — Insecticide').length, 0); }

  /* la liste collée : la 3D garde son texte à l'IDENTIQUE (apostrophe droite comprise), son exemple de saisie d'anti-nuisibles */
  { const LP = m => rendu(m, ['formProduitsListe'], w => w.b.fn.formProduitsListe(), { permGarde: () => true }).html || '';
    vrai('⛔ « ＋ Liste » : la 3D garde mot pour mot « La catégorie est trouvée toute seule d\'après le nom… » et son exemple (Gel blattes Maxforce ; MABI ; 24,90)', /La catégorie est trouvée toute seule d'après le nom, et tu peux la corriger avant de valider\./.test(LP('3d')) && /Gel blattes Maxforce ; MABI ; 24,90/.test(LP('3d')), LP('3d').slice(0, 120));
    egal('⛔ hors 3D : ni l\'exemple de la 3D, ni la promesse d\'une catégorie « trouvée toute seule »', METIERS_ESSAIS.filter(m => !LP(m) || /Maxforce|MABI|trouvée toute seule/.test(LP(m)) || !/La catégorie se choisit dans la liste de ton métier/.test(LP(m))), []); }

  /* ── 5. Le CSV des interventions ── */
  console.log('\n5. exportInterventionsCsv : la colonne « Nuisibles »');
  { const csv = m => { const w = essai(m, ['exportInterventionsCsv']); w.b.fn.exportInterventionsCsv(); return w.sortie.csv; };
    const c3 = csv('3d');
    egal('⛔ la 3D garde la colonne « Nuisibles » (entre « Montant » et « Compte rendu »), avec ses valeurs', [c3.h.slice(-3), c3.rows[0].slice(-3).slice(0, 2)], [['Montant', 'Nuisibles', 'Compte rendu'], [90, 'Rats']]);
    const cs = METIERS_ESSAIS.map(csv);
    egal('⛔ hors 3D : plus de colonne « Nuisibles », et chaque ligne a autant de cellules que d\'en-têtes', cs.filter(c => c.h.includes('Nuisibles') || c.rows.some(r => r.length !== c.h.length)).length, 0);
    egal('   le reste est intact (12 colonnes → 12, compte rendu en dernier)', cs.map(c => [c.h.length, c.h[c.h.length - 1], c.rows[0][c.rows[0].length - 1]]), METIERS_ESSAIS.map(() => [12, 'Compte rendu', 'Fait'])); }

  /* ── 6. La fiche client ── */
  console.log('\n6. ficheClient et formClient : le dossier sanitaire');
  { const fiche = m => rendu(m, ['ficheClient'], w => w.b.fn.ficheClient('c1'), { sec: () => '', garSectionHtml: () => '', eur: x => x, docTot: () => ({ ttc: 0 }), badge: () => '', techPuces: () => '', prefPassage: {}, localStorage: {} }).html;
    const f3 = fiche('3d');
    vrai('(population) la fiche d\'un client professionnel se rend', f3 && f3.length > 800, rendu('3d', ['ficheClient'], w => w.b.fn.ficheClient('c1'), { sec: () => '', garSectionHtml: () => '', eur: x => x, docTot: () => ({ ttc: 0 }), badge: () => '', techPuces: () => '' }).erreur);
    vrai('⛔ la 3D garde la carte « Dossier sanitaire » et son bouton', /Dossier sanitaire/.test(f3) && /papDossierSanitaire\('c1'\)/.test(f3));
    egal('⛔ hors 3D : plus de carte « Dossier sanitaire » (ni de « n° AMM, Certibiocide »)', METIERS_ESSAIS.filter(m => /Dossier sanitaire|papDossierSanitaire|Certibiocide/.test(fiche(m))), []);
    const cl = m => rendu(m, ['formClient'], w => w.b.fn.formClient('c1'), { cliSousForm: () => '', cliSetType: () => {} }).html || '';
    vrai('⛔ le formulaire client : la 3D garde « plan d\'appâtage… dossier sanitaire activés » ; les autres disent autre chose', /plan d'appâtage du site, conformité alimentaire et dossier sanitaire activés\./.test(cl('3d')) && METIERS_ESSAIS.every(m => /Professionnel : raison sociale, SIRET/.test(cl(m)) && !ANTI.test(cl(m))), cl('plomberie').slice(0, 200)); }

  /* ── 7. Les techniciens et le Certibiocide ── */
  console.log('\n7. Techniciens : le Certibiocide (colonne, fiche, formulaire, enregistrement)');
  { const liste = m => { const w = essai(m, ['certibBadge', 'certibVisible', 'certibColonne'], {}, ['views.techniciens=function(){']); w.init.views.techniciens = w.init.views.techniciens; w.b.scope.views.techniciens(); return w.sortie; };
    const L3 = (() => { const w = essai('3d', ['certibBadge', 'certibVisible', 'certibColonne'], { setHeader: () => {}, emptyState: () => '', peutAjout: true, techDoublons: () => [] }, ['views.techniciens=function(){']); let c = ''; w.b.scope.$ = () => ({ set innerHTML(v) { c = v; } }); w.b.scope.views.techniciens(); return c; })();
    vrai('(population) la liste des techniciens se rend', /Marc Dubois/.test(L3), L3.slice(0, 120));
    egal('⛔ la 3D garde la colonne « Certibiocide » ET son badge', [/Technicien\|Rôle\|Téléphone\|Certibiocide\|Interv\./.test(L3), /st st-green|st st-grey|st st-red|st st-org/.test(L3)], [true, true]);
    const liste2 = m => { const w = essai(m, ['certibBadge', 'certibVisible', 'certibColonne'], { setHeader: () => {}, emptyState: () => '', techDoublons: () => [] }, ['views.techniciens=function(){']); let c = ''; w.b.scope.$ = () => ({ set innerHTML(v) { c = v; } });
      if (m !== 'plomberie+') w.db.techniciens.forEach(t => { delete t.certibiocide; delete t.certibiocideExp; }); w.b.scope.views.techniciens(); return c; };
    egal('⛔ hors 3D, sans Certibiocide saisi : plus de colonne', METIERS_ESSAIS.filter(m => /Certibiocide/.test(liste2(m))), []);
    const listeAvec = m => { const w = essai(m, ['certibBadge', 'certibVisible', 'certibColonne'], { setHeader: () => {}, emptyState: () => '', techDoublons: () => [] }, ['views.techniciens=function(){']); let c = ''; w.b.scope.$ = () => ({ set innerHTML(v) { c = v; } }); w.b.scope.views.techniciens(); return c; };
    egal('⛔ hors 3D, MAIS une fiche en porte un (base venue de la 3D) : la colonne reste, et seule cette fiche a un badge', METIERS_ESSAIS.filter(m => !/Certibiocide/.test(listeAvec(m)) || !/CB-123|st st-/.test(listeAvec(m))), []);
    const fiche = m => rendu(m, ['certibBadge', 'certibVisible', 'ficheTech'], w => { w.b.fn.ficheTech('t2'); }, { fmtShort: x => x, k: (a, b, c, d) => d, vPlaque: () => '', vehicules: [], techVeh: () => null }).html;
    const ft2 = METIERS_ESSAIS.map(fiche), ft3 = fiche('3d');
    vrai('(population) la fiche d\'un technicien se rend', ft3 && ft3.length > 300, rendu('3d', ['certibBadge', 'certibVisible', 'ficheTech'], w => w.b.fn.ficheTech('t2'), { fmtShort: x => x }).erreur);
    vrai('⛔ la 3D garde la ligne « Certibiocide » d\'un technicien qui n\'en a pas (« — »)', /Certibiocide/.test(ft3));
    egal('⛔ hors 3D : pas de ligne « Certibiocide » pour un technicien qui n\'en a pas', ft2.filter(h => /Certibiocide/.test(h || '')).length, 0);
    const form = (m, id) => rendu(m, ['certibVisible', 'formTech'], w => w.b.fn.formTech(id), { techCouleurChoix: () => '', fg: '' }).html;
    vrai('⛔ le formulaire technicien : la 3D garde les champs Certibiocide', /name="certibiocide"/.test(form('3d', 't2')) && /name="certibiocideExp"/.test(form('3d', 't2')), rendu('3d', ['certibVisible', 'formTech'], w => w.b.fn.formTech('t2'), { techCouleurChoix: () => '' }).erreur);
    egal('⛔ hors 3D : pas de champ Certibiocide pour qui n\'en a pas…', METIERS_ESSAIS.filter(m => /name="certibiocide/.test(form(m, 't2') || '')), []);
    egal('   … et la fiche qui en porte déjà un les GARDE à l\'écran (on ne cache pas ce qui est saisi)', METIERS_ESSAIS.filter(m => !/name="certibiocide"/.test(form(m, 't1') || '')), []);
    /* saveTech : sans les champs, la fiche garde son Certibiocide */
    const st = (m, d) => { const w = essai(m, ['saveTech'], { champManque: () => {}, champDe: () => null, compteHomonyme: () => null, homonymeMessage: () => '', adminSeul: () => true, techRemap: () => {}, proposerAbonnement: () => {}, roleLbl: () => 'Technicien', adminDepart: () => {}, fusionFiche: () => {}, nomNorm: s => norm(s),
        syncPlanning: () => {}, userRoleDe: () => '', techCleanup: () => {}, uid: () => 'n1', geste: () => {}, intHisto: () => {}, pushNotify: () => {} });
      w.init.currentUser = { id: 'u1', role: 'admin' };
      return Promise.resolve(w.b.fn.saveTech({ preventDefault() {}, target: { __data: d } }, 't1')).then(() => w.db.techniciens.find(t => t.id === 't1'), e => ({ erreur: String(e.stack || e).split('\n').slice(0, 2).join(' | ') })); };
    const cas = ['plomberie', 'chauffage', 'incendie'];
    console.log('\n8. saveTech : le Certibiocide déjà saisi survit à l\'enregistrement d\'un formulaire qui ne l\'a pas');
    const donnees = { nom: 'Marc Dubois', metier: 'Technicien', tel: '0600000000', email: 'm@x.fr', couleur: '#000', capH: '7', droitConges: '25' };
    const res = []; for (const m of cas) res.push(await st(m, Object.assign({}, donnees)));
    vrai('(population) saveTech s\'exécute pour les trois métiers', res.every(r => r && !r.erreur && r.id === 't1'), res.map(r => r && r.erreur).filter(Boolean));
    egal('⛔ hors 3D, enregistrer la fiche SANS les champs Certibiocide garde le n° et la date déjà saisis', res.filter(r => r.certibiocide !== 'CB-123' || r.certibiocideExp !== '2027-01-01').length, 0);
    const r3 = await st('3d', Object.assign({ certibiocide: '', certibiocideExp: '' }, donnees));
    egal('⛔ en 3D, un champ vidé à l\'écran vide la fiche, comme avant', [r3.certibiocide, r3.certibiocideExp], ['', '']);
    const r4 = await st('3d', Object.assign({ certibiocide: 'CB-999', certibiocideExp: '2030-05-05' }, donnees));
    egal('   … et un champ rempli s\'écrit', [r4.certibiocide, r4.certibiocideExp], ['CB-999', '2030-05-05']);
  }
}
  console.log('\n── 2901 : ' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
