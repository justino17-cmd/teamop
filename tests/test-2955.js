/* ══ test-2955 · LES RESTES DE L'ANTI-NUISIBLES DANS CE QU'UN CLIENT REÇOIT — ET LA 3D D'ELAN NE CHANGE PAS ══════════════════════════
   23 octobre 2026, relecture du chantier « OP GESTION par métier » : `test-2951` jouait six ÉCRANS par métier et passait au vert
   pendant que cinq endroits disaient encore « biocide » à un plombier — l'étape 6 de la clôture guidée, le PDF du rapport, le
   rapport imprimé, le courriel — pendant que l'IA rédigeait « comme un dératiseur » et que l'assistant devis donnait pour exemple
   « dératisation d'un restaurant… 8 postes d'appâtage ». Un banc qui joue des écrans listés ne dit rien de la POPULATION des textes
   qu'un client voit : celui-ci joue les fabriques de DOCUMENTS (PDF, texte du courriel, rapport imprimé) et les envois (le prompt
   de l'IA) avec les vraies fonctions d'app.html et de beta.html.
   Règles gardées :
   · hors 3D, aucun document ne porte « biocide / Certibiocide / AMM / animaux domestiques » SAUF si une ligne de produit porte
     une AMM (une base venue de la 3D : un document déjà émis se relit tel quel, sur la donnée) ;
   · la 3D garde la mention À L'IDENTIQUE, et ses phrases d'avant (note du stock, exemple de devis, consigne de l'IA) ;
   · « Zones traitées » est un mot de la 3D (« Zones concernées » ailleurs), dans la fiche, le PDF et le courriel ;
   · le prompt de l'IA hors 3D ne parle ni de nuisibles, ni de méthodes, ni d'infestation, et n'envoie pas de lignes vides ;
   · une rubrique du masque dont l'entreprise a DÉJÀ des données (enveloppes, mouvements de box) reste ouverte ;
   · une fiche produit sans catégorie ne change pas de catégorie au premier « Enregistrer ».
   Population comptée avant chaque absence (« rien de biocide » sur un document qui ne s'est pas rendu passerait au vert).  */
'use strict';
const { lire, litteral, evalue, bac, fonction } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

const BIOCIDE = /biocide|certibiocide|\bAMM\b|animaux domestiques/i;
const HORS = ['plomberie', 'chauffage', 'incendie', 'piscine', 'autre'];
const TOUS = ['3d'].concat(HORS);
const NOMS_BASE = ['metiersPlusDe', 'metierPackDe', 'metierId', 'metierPack', 'estMetier3D', 'exemple', 'intTypes', 'libZones', 'mentionRegl', 'ammVisible', 'prodLineAmm', 'rapportProduitsLibres'];

(async () => {
for (const fichier of ['app.html', 'beta.html']) {
  console.log('\n══ ' + fichier + ' ══');
  const { N } = lire(fichier);
  const METIERS = evalue(litteral(N, 'const METIERS={')), INT_TYPES = evalue(litteral(N, 'const INT_TYPES = ['));
  const AS_STEPS = evalue(litteral(N, 'const AS_STEPS=['));
  const MENTION = (/const MENTION_REGL='((?:[^'\\]|\\.)*)'/.exec(N) || [])[1];
  const PDF_L = evalue(litteral(N, 'const _PDF_L=[')).map(l => l.split(' ').map(Number));
  vrai('(population) la mention réglementaire est trouvée dans le code (' + (MENTION || '').length + ' signes)', !!MENTION && BIOCIDE.test(MENTION));

  const monde = (m, lignes) => {
    const sortie = { html: '', toasts: [], ia: null, imprime: '' };
    const db0 = { metier: m, clients: [{ id: 'c1', nom: 'Copropriété Les Lilas', typeClient: 'pro', ville: 'Lyon', email: 'a@b.fr' }],
      techniciens: [{ id: 't1', nom: 'Marc Dubois' }], users: [], boxes: [], pointages: [], numMax: {}, contrats: [], devis: [], factures: [], vehicules: [], societes: [], champsPerso: [], absences: [], journal: [], fournisseurs: [],
      produits: [{ id: 'p1', nom: 'Gel blattes', amm: 'FR-2020-0123', matiereActive: 'Fipronil', categorie: 'TP18 — Insecticide' }, { id: 'p2', nom: 'Raccord laiton 20/27', categorie: 'Raccords et fittings' }],
      interventions: [{ id: 'i1', num: 'INT-1', titre: 'Passage du 20 octobre', clientId: 'c1', type: 'Contrôle', statut: 'terminee', date: '2026-10-20', heure: '09:00', duree: 60, adresse: '3 rue des Lilas',
        nuisibles: ['Rats'], methodes: ['Appâtage'], zones: 'cave', materiel: 'pièges', compteRendu: 'Fait',
        constat: { infestation: 'Fort', conformite: 'Conforme', indices: [], recommandations: 'RAS' }, produitsUtilises: lignes || [], prestation: [], champs: {}, signature: '', signatureTech: '' }] };
    const db = new Proxy(db0, { get(t, k) { if (typeof k === 'symbol' || k in t) return t[k]; return (t[k] = []); } });
    const init = { METIERS, INT_TYPES, AS_STEPS, BETA_ESSAI: false, db, sortie, console, document: { getElementById: id => id === 'rap-cr' ? { value: 'poseur de joint', disabled: false } : null }, MENTION_REGL: MENTION, _PDF_L: PDF_L, PAP_IMPL_MAX_B64: 1e9,
      PA_TYPES: { appat: { lbl: 'Appât rodonticide' } }, PRESTATION_ITEMS: [], PH_MARQUE: /^$/, T3D_CATS: {}, NUIS_3D: ['Rats'], INFEST_NIV: ['Faible'], CONFORMITE: ['Conforme'],
      esc: s => String(s == null ? '' : s), $: id => id === 'rap-cr' ? { value: 'poseur de joint', disabled: false } : null, toast: x => { sortie.toasts.push(String(x)); }, closeModal: () => {}, save: () => {}, go: () => {},
      openModal: h => { sortie.html = h; }, setHeader: () => {}, can: () => true, permGarde: () => true, canCat: () => true, currentUser: { id: 'u1', role: 'admin' },
      intNuis: new Set(['Rats']), intMeth: new Set(['Appâtage']), intTrait: {}, rapPhotos: [], rapTags: [], rapConstat: { infestation: 'Fort', indices: [] }, rapPresta: new Set(), rapNuis: [], rapChamps: {}, rapTpe: '', rapTraitement: {},
      asW: { id: 'i1', step: 5, infest: 'fort', obs: '', reco: '', zones: 'cave', materiel: 'pièges', noteInterne: '', sig: '', sigT: '', absent: false },
      INF_LV: [['faible', 'Faible', '#0a0']], METHODES: ['Appâtage'], RECO_3D: ['Phrase type 3D'], NUIS_CATS: [], T3D_NUIS_MAP: {}, intInfPrev: () => null, infRank: () => 0, intInfOf: () => '',
      produit: id => db.produits.find(p => p.id === id) || {}, clientName: id => (db.clients.find(c => c.id === id) || {}).nom || '', prodLineName: l => l.nomLibre || (db.produits.find(p => p.id === l.produitId) || {}).nom || '—', prodLineUnit: () => '',
      aplatDe: () => ['#000', '#fff'], encreDonnee: c => c, photoSrc: x => x, photoPid: () => '', current: 'dashboard', intStatutPermis: () => true, intTechIds: () => [], techNames: () => 'Marc Dubois',
      todayISO: () => '2026-10-23', fmtShort: x => x, rapportSociete: () => 'Plomberie Martin', rapportDuree: () => '1 h', rapportChampsPerso: () => [], traitementSummary: () => [], ficheSummary: () => [],
      t3dTexte: () => [], NUIS_TRAIT: {}, docEntete: () => ({ nom: 'Plomberie Martin', couleur: '#1E7A4E', logo: '' }), docCoordLignes: () => [],
      aiHasKey: () => true, aiKey: () => 'k', callClaude: async (sys, ctx) => { sortie.ia = { sys, ctx }; return 'Texte rédigé'; },
      STOCKAGE_ID: 'stockage', LANG_CUR: 'fr', k: (a, b, c, d) => d, entSocUnique: () => '', entSocietes: () => ['Modèle générique'], clientsProposes: () => db.clients, entNom: () => 'Plomberie Martin',
      devisIACode: () => '', norm: s => String(s || '').toLowerCase() };
    return { db, sortie, init };
  };
  const essai = (m, noms, lignes, extra) => { const w = monde(m, lignes); const b = bac(fichier, NOMS_BASE.concat(noms), Object.assign(w.init, extra || {})); return Object.assign(w, { b }); };
  const joue = (m, noms, lignes, appel, extra) => { try { const w = essai(m, noms, lignes, extra); const r = appel(w); return { w, html: w.sortie.html, r }; } catch (e) { return { erreur: String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') }; } };
  const ASYNC = async (m, noms, lignes, appel, extra) => { try { const w = essai(m, noms, lignes, extra); const r = await appel(w); return { w, html: w.sortie.html, r }; } catch (e) { return { erreur: String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') }; } };
  /* le texte dessiné par un PDF écrit à la main : chaque « (…) Tj » */
  const texteDuPdf = pdf => (String(pdf).match(/\(((?:\\.|[^\\)])*)\) Tj/g) || []).map(x => x.slice(1, -4).replace(/\\(.)/g, '$1')).join(' ');
  const SANS_AMM = [{ produitId: 'p2', qte: 1 }], AVEC_AMM = [{ produitId: 'p1', qte: 1 }];

  /* ── 1. l'étape 6 de la clôture guidée ── */
  console.log('\n1. assistRender, étape 6 (Signatures) : la mention des biocides');
  { const R = {};
    TOUS.forEach(m => { R[m + 'a'] = joue(m, ['assistRender'], SANS_AMM, w => w.b.fn.assistRender()); R[m + 'b'] = joue(m, ['assistRender'], AVEC_AMM, w => w.b.fn.assistRender()); R[m + 'c'] = joue(m, ['assistRender'], [], w => w.b.fn.assistRender()); });
    vrai('(population) l\'étape 6 se rend pour 6 métiers × 3 listes de produits, bouton « Clôturer » compris', Object.keys(R).every(k => R[k].html && /Clôturer l'intervention/.test(R[k].html)), Object.keys(R).filter(k => !R[k].html).map(k => k + ' : ' + R[k].erreur));
    egal('⛔ la 3D garde la mention À L\'IDENTIQUE, avec ou sans produit', TOUS.slice(0, 1).flatMap(m => ['a', 'b', 'c'].map(x => R[m + x].html.includes(MENTION))), [true, true, true]);
    egal('⛔ hors 3D, un produit SANS AMM (ou aucun) : pas un mot de biocide, de Certibiocide ni d\'animaux', HORS.flatMap(m => ['a', 'c'].filter(x => BIOCIDE.test(R[m + x].html)).map(x => m + x)), []);
    egal('   hors 3D, un produit qui PORTE une AMM (base venue de la 3D) : la mention reste — un document se relit tel quel', HORS.map(m => R[m + 'b'].html.includes(MENTION)), HORS.map(() => true)); }

  /* ── 2. le PDF que le client reçoit, et le texte du courriel ── */
  console.log('\n2. rapportPdfStr et genRapportTexte : ce que le client reçoit');
  { const R = {};
    for (const m of TOUS) for (const [x, l] of [['a', SANS_AMM], ['b', AVEC_AMM]]) {
      const j = joue(m, ['rapportPdfStr', '_pdfLarg', '_pdfCoupe', '_pdfTranslit', '_pdfTxt', 'rapportConstatLignes', 'genRapportTexte'], l, w => ({ pdf: w.b.fn.rapportPdfStr(w.db.interventions[0], { nom: 'Plomberie Martin', couleur: '#1E7A4E', lignes: [] }, {}), mail: w.b.fn.genRapportTexte(w.db.interventions[0]), lignes: w.b.fn.rapportConstatLignes(w.db.interventions[0]) }));
      R[m + x] = j.erreur ? j : Object.assign(j, { pdfTxt: texteDuPdf(j.r.pdf), mail: j.r.mail, lignes: j.r.lignes }); }
    vrai('(population) le PDF (texte dessiné), le courriel et les lignes de constat se rendent pour 6 métiers × 2 listes', Object.keys(R).every(k => R[k].pdfTxt && R[k].pdfTxt.length > 200 && R[k].mail && R[k].mail.length > 50 && Array.isArray(R[k].lignes)), Object.keys(R).filter(k => R[k].erreur).map(k => k + ' : ' + R[k].erreur));
    vrai('   le PDF dessine bien le produit utilisé (« Gel blattes » / « Raccord laiton ») : la mention ne manque pas parce que la section a sauté', TOUS.every(m => /Raccord laiton/.test(R[m + 'a'].pdfTxt) && /Gel blattes/.test(R[m + 'b'].pdfTxt)));
    egal('⛔ la 3D garde la mention dans le PDF ET dans le courriel (avec produit)', ['a', 'b'].map(x => [/Certibiocide/.test(R['3d' + x].pdfTxt), R['3d' + x].mail.includes(MENTION)]), [[true, true], [true, true]]);
    egal('⛔ hors 3D, produit sans AMM : ni le PDF ni le courriel ne parlent de biocide', HORS.filter(m => BIOCIDE.test(R[m + 'a'].pdfTxt) || BIOCIDE.test(R[m + 'a'].mail)), []);
    egal('   hors 3D, produit avec AMM : la mention reste dans les deux documents', HORS.filter(m => !/Certibiocide/.test(R[m + 'b'].pdfTxt) || !R[m + 'b'].mail.includes(MENTION)), []);
    egal('⛔ le tableau « Produits utilisés » du PDF : la 3D garde sa colonne « N° AMM » même sans AMM ; hors 3D elle ne paraît que si une ligne en porte une',
      [/N° AMM/.test(R['3da'].pdfTxt), HORS.map(m => /N° AMM/.test(R[m + 'a'].pdfTxt)), HORS.map(m => /N° AMM/.test(R[m + 'b'].pdfTxt) && /FR-2020-0123/.test(R[m + 'b'].pdfTxt))], [true, HORS.map(() => false), HORS.map(() => true)]);
    egal('⛔ « Zones traitées » : la 3D le garde, les autres écrivent « Zones concernées » (PDF, courriel, lignes de constat)',
      TOUS.map(m => [/Zones traitées/.test(R[m + 'a'].pdfTxt), /Zones traitées/.test(R[m + 'a'].mail), R[m + 'a'].lignes.some(r => r[0] === 'Zones traitées'), /Zones concernées/.test(R[m + 'a'].pdfTxt), /Zones concernées/.test(R[m + 'a'].mail), R[m + 'a'].lignes.some(r => r[0] === 'Zones concernées')]),
      TOUS.map(m => m === '3d' ? [true, true, true, false, false, false] : [false, false, false, true, true, true])); }

  /* ── 3. le rapport imprimé : la même mention, la même règle ── */
  console.log('\n3. printRapport : le rapport imprimé (la fenêtre d\'impression)');
  { const R = {};
    for (const m of TOUS) for (const [x, l] of [['a', SANS_AMM], ['b', AVEC_AMM]]) {
      R[m + x] = await ASYNC(m, ['printRapport'], l, async w => { const doc = { ecrit: '' };
        w.init.window = { open: () => ({ document: { write: h => { doc.ecrit += h; }, close() {} }, focus() {}, print() {}, confirm: () => true }) };
        w.b.scope.window = w.init.window; w.b.scope.setTimeout = () => 0; w.b.scope.photosResoudre = async () => {}; w.b.scope.planImgsResoudre = async () => {};
        await w.b.fn.printRapport('i1'); return doc.ecrit; }); }
    vrai('(population) le rapport imprimé se rend pour 6 métiers × 2 listes', Object.keys(R).every(k => typeof R[k].r === 'string' && /RAPPORT D'INTERVENTION/.test(R[k].r) && /Gel blattes|Raccord laiton/.test(R[k].r)), Object.keys(R).map(k => k + ' : ' + (R[k].erreur || (R[k].r || '').length)).slice(0, 4));
    egal('⛔ la 3D garde la mention dans le rapport imprimé', [R['3da'].r.includes(MENTION), R['3db'].r.includes(MENTION)], [true, true]);
    egal('⛔ hors 3D, produit sans AMM : le rapport imprimé ne parle pas de biocide (hors balises <style>)', HORS.filter(m => BIOCIDE.test(R[m + 'a'].r.replace(/<style>[\s\S]*?<\/style>/g, ''))), []);
    egal('⛔ le tableau « Produits utilisés » du rapport imprimé : colonne « N° AMM » en 3D, ou si une ligne en porte une — jamais une colonne de tirets', [/<th>N° AMM<\/th>/.test(R['3da'].r), HORS.map(m => /<th>N° AMM<\/th>/.test(R[m + 'a'].r)), HORS.map(m => /<th>N° AMM<\/th>/.test(R[m + 'b'].r) && /FR-2020-0123/.test(R[m + 'b'].r))], [true, HORS.map(() => false), HORS.map(() => true)]);
    egal('   hors 3D, produit avec AMM : la mention reste', HORS.filter(m => !R[m + 'b'].r.includes(MENTION)), []); }

  /* ── 4. la consigne de l'IA ── */
  console.log('\n4. aiGenRapport : ce qui part chez Anthropic');
  { const R = {};
    for (const m of TOUS) R[m] = await ASYNC(m, ['aiGenRapport'], SANS_AMM, async w => { await w.b.fn.aiGenRapport('i1'); return w.sortie.ia; });
    vrai('(population) l\'IA est appelée pour les six métiers, avec une consigne et un contexte', TOUS.every(m => R[m].r && R[m].r.sys && R[m].r.ctx), TOUS.filter(m => !(R[m].r && R[m].r.sys)).map(m => m + ' : ' + R[m].erreur));
    egal('⛔ la 3D garde sa consigne et ses trois lignes (nuisibles, méthodes, infestation) À L\'IDENTIQUE', [/^Tu es un technicien expert en lutte anti-nuisibles en France\./.test(R['3d'].r.sys), /Décris le constat, les actions réalisées et le traitement\./.test(R['3d'].r.sys), R['3d'].r.ctx.split('\n')],
      [true, true, ['Société : Plomberie Martin', 'Catégorie : Contrôle', 'Client : Copropriété Les Lilas', 'Adresse : 3 rue des Lilas', 'Nuisibles : Rats', 'Méthodes : Appâtage', 'Niveau d\'infestation : Fort', 'Notes du technicien : poseur de joint']]);
    egal('⛔ hors 3D : la consigne ne parle ni de nuisibles, ni de dératisation, ni de traitement ; elle nomme le métier', HORS.filter(m => /nuisible|dératis|traitement|biocide|infest/i.test(R[m].r.sys) || !R[m].r.sys.includes(METIERS[m].nom)), []);
    egal('⛔ hors 3D : le contexte n\'envoie ni « Nuisibles », ni « Méthodes », ni « Niveau d\'infestation » (pas de lignes vides chez Anthropic) — mais garde les notes', HORS.filter(m => /Nuisibles|Méthodes|infestation/i.test(R[m].r.ctx) || !/Notes du technicien : poseur de joint/.test(R[m].r.ctx) || !/Adresse : 3 rue des Lilas/.test(R[m].r.ctx)), []); }

  /* ── 5. la fiche d'intervention : carte « Produits & matériel » ── */
  console.log('\n5. intProdCard : la fiche d\'intervention');
  { const R = {};
    TOUS.forEach(m => { R[m + 'e'] = joue(m, ['intProdCard'], SANS_AMM, w => w.b.fn.intProdCard(w.db.interventions[0], true)); R[m + 'l'] = joue(m, ['intProdCard'], SANS_AMM, w => w.b.fn.intProdCard(w.db.interventions[0], false)); });
    const T = k => R[k].r;
    vrai('(population) la carte se rend, en édition et en lecture, pour six métiers', Object.keys(R).every(k => typeof T(k) === 'string' && /Produits & matériel/.test(T(k))), Object.keys(R).filter(k => R[k].erreur).map(k => k + ' : ' + R[k].erreur));
    egal('⛔ la 3D garde ses phrases (note du stock avec registre et box, « Zones traitées », exemple de matériel et de zones)', [/au registre — le stock ne bouge pas : il baisse quand on se sert dans une box ou le stockage\./.test(T('3de')), /Zones traitées/.test(T('3de')), /2 pièges à glu/.test(T('3de')), /cuisine, cave, réserve/.test(T('3de')), /Zones traitées/.test(T('3dl'))], [true, true, true, true, true]);
    egal('⛔ hors 3D : ni registre, ni box, ni pièges à glu, ni cave/réserve, ni « Zones traitées » (édition ET lecture)', HORS.flatMap(m => ['e', 'l'].filter(x => /registre|\bbox\b|pièges à glu|cave, réserve|Zones traitées/i.test(T(m + x))).map(x => m + x)), []);
    egal('   hors 3D : « Zones concernées » et un exemple du métier', HORS.filter(m => !/Zones concernées/.test(T(m + 'e')) || !/salle de bain, cuisine, local technique/.test(T(m + 'e')) || !/outillage, pièces, matériel posé/.test(T(m + 'e'))), []); }

  /* ── 6. l'assistant devis ── */
  console.log('\n6. devisIAModal : l\'exemple de l\'assistant devis');
  { const R = {}; TOUS.forEach(m => { R[m] = joue(m, ['devisIAModal'], [], w => w.b.fn.devisIAModal()); });
    vrai('(population) la fenêtre se rend pour les six métiers', TOUS.every(m => /dia-demande/.test(R[m].html || '')), TOUS.filter(m => !R[m].html).map(m => m + ' : ' + R[m].erreur));
    vrai('⛔ la 3D garde son exemple À L\'IDENTIQUE', /placeholder="Ex : dératisation d'un restaurant de 120 m² avec cave, 8 postes d'appâtage, 3 passages sur 2 mois, à Strasbourg"/.test(R['3d'].html));
    egal('⛔ hors 3D : un exemple tiré du premier type d\'intervention du métier, sans dératisation ni appâtage', HORS.filter(m => { const ph = (/id="dia-demande"[^>]*placeholder="([^"]*)"/.exec(R[m].html) || [])[1] || ''; return !(({ plomberie: 'remplacement d’un chauffe-eau électrique', chauffage: 'remplacement d’une chaudière gaz' })[m] ? ph.includes(({ plomberie: 'remplacement d’un chauffe-eau électrique', chauffage: 'remplacement d’une chaudière gaz' })[m]) : ph.includes(METIERS[m].types[0])) || /dératis|appât|restaurant|cave/i.test(ph); }), []); /* v779 : la plomberie et le chauffage ont leur exemple écrit pour eux */ }

  /* ── 7. un écran du masque dont l'entreprise a déjà des données reste ouvert ── */
  console.log('\n7. metierBloque : ce qui est saisi se lit');
  { const bl = (m, donnees, beta) => { const w = monde(m); Object.assign(w.db, donnees || {}); w.init.BETA_ESSAI = !!beta; const b = bac(fichier, NOMS_BASE.concat(['metierBloque']), w.init); return k => b.fn.metierBloque(k); };
    egal('⛔ la 3D ne ferme rien ; hors 3D les six rubriques du masque sont fermées SANS données', [bl('3d')('enveloppes'), HORS.map(m => ['registre', 'carteBox', 'devisXylo', 'boxes', 'saisieConso', 'enveloppes'].map(k => bl(m)(k)))], [false, HORS.map(() => [true, true, true, true, true, true])]);
    egal('   des enveloppes déjà rangées : « Enveloppes » reste ouvert hors 3D (les autres rubriques restent fermées)', HORS.map(m => { const f = bl(m, { enveloppes: [{ id: 'e1' }] }); return [f('enveloppes'), f('boxes'), f('registre'), f('saisieConso')]; }), HORS.map(() => [false, true, true, true]));
    egal('   des mouvements de box : « Consommation produits » reste ouvert ; ceux du seul stockage ne l\'ouvrent pas', HORS.map(m => [bl(m, { mouvements: [{ id: 'm1', boxId: 'b1' }] })('saisieConso'), bl(m, { mouvements: [{ id: 'm1', boxId: 'stockage' }] })('saisieConso'), bl(m, { mouvements: [{ id: 'm1', boxId: '' }] })('saisieConso')]), HORS.map(() => [false, true, true]));
    egal('   la bêta, métier 3D : voit tout (comme avant)', bl('3d', {}, true)('boxes'), false);
    egal('   la bêta, métier autre : le masque du métier s\'applique (v778 — « Tester un métier » montre ce que verra le client)', HORS.map(m => bl(m, {}, true)('enveloppes')), HORS.map(() => true)); }

  /* ── 8. une fiche produit sans catégorie garde « Sans catégorie » ── */
  console.log('\n8. formProduit : la catégorie vide ne change pas en silence');
  { const R = {};
    for (const m of ['3d', 'plomberie']) for (const [x, cat] of [['v', ''], ['p', 'Raccords et fittings']]) R[m + x] = joue(m, ['formProduit', 'categoriesProduit'], [], w => { w.db.produits.push({ id: 'p9', nom: 'Joint inconnu', categorie: cat, fournisseurs: ['Négoce'], prix: 3 }); w.init.CAT_LIST = ['TP18 — Insecticide']; w.b.fn.formProduit('p9'); }, { CAT_LIST: ['TP18 — Insecticide'], FOUR_PILLS: [], prodFours: new Set(), catAbrev: x => x, catColor: () => '#000', fourColor: () => '#000', eur: x => x, produitCle: x => x.nom, idProduit: x => x, estMetier: () => true, fichesGere: () => true });
    vrai('(population) le formulaire se rend (fiche sans catégorie, fiche rangée) pour la 3D et la plomberie', Object.keys(R).every(k => /name="categorie"/.test(R[k].html || '')), Object.keys(R).filter(k => !R[k].html).map(k => k + ' : ' + R[k].erreur));
    const premiereOption = k => (/<select name="categorie"[^>]*>\s*<option([^>]*)>([^<]*)</.exec(R[k].html) || []).slice(1, 3);
    egal('⛔ sans catégorie : la première option est « Sans catégorie », sélectionnée, de valeur vide (3D et autres)', ['3dv', 'plomberiev'].map(k => [/selected/.test(premiereOption(k)[0]), /value=""/.test(premiereOption(k)[0]), premiereOption(k)[1]]), [[true, true, 'Sans catégorie'], [true, true, 'Sans catégorie']]);
    egal('   une fiche rangée n\'a PAS d\'option vide (rien ne change pour elle)', ['3dp', 'plomberiep'].map(k => /<option value="" selected>Sans catégorie/.test(R[k].html)), [false, false]); }

  /* ── 9. le code : plus une seule mention nue ── */
  console.log('\n9. le code : toute lecture de la mention passe par mentionRegl');
  { const lignes = N.split('\n').filter(l => l.includes('MENTION_REGL') && !/^const MENTION_REGL=/.test(l) && !/^function mentionRegl\(/.test(l));
    vrai('(population) la mention est lue à six endroits du code (étape 6, PDF, rapport imprimé, courriel, dossier sanitaire — le plan d\'appâtage passe par `mr`)', lignes.length >= 5, lignes.length);
    egal('⛔ aucune ligne ne lit MENTION_REGL sans passer par mentionRegl( dans la même ligne', lignes.filter(l => !/mentionRegl\(/.test(l)).map(l => l.trim().slice(0, 90)), []);
    vrai('   le plan d\'appâtage calcule `mr=mentionRegl(` avant de couper la mention', /const mr=mentionRegl\(plans\.flatMap/.test(N)); }
}
console.log('\n── 2905 : ' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
