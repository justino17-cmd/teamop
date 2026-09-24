/* ⛔ CE QUE CE FICHIER GARDE — LE RAPPORT D'INTERVENTION PART EN VRAI PDF JOINT (v744).

   Jusqu'ici, « Envoyer le rapport → par e-mail » ouvrait la fenêtre d'impression et envoyait le
   TEXTE du rapport : le serveur ne peut pas joindre ce que l'impression fabrique, et le client ne
   recevait jamais le document — ni photos, ni plan d'appâtage, ni signatures. Et la trace
   « Rapport envoyé à … » s'écrivait AVANT l'envoi, même quand il était refusé.

   On EXÉCUTE la vraie fabrique (`rapportPdfStr`) et le vrai circuit (`rapportVia`), extraits du
   fichier livré, et on lit le PDF qui sort : sa structure, son texte, ses images — et, parce qu'un
   document écrit à la main peut déborder de sa page sans que rien ne le dise, la LARGEUR de chaque
   ligne qu'il dessine. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c, info) => { c ? ok++ : ko++; console.log('  ' + (c ? '✓' : '✗') + ' ' + t + (c || info === undefined ? '' : '  → ' + info)); };

function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); const fin = m ? m.index : Math.min(APP.length, d + 80000);
  let bout = APP.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }

const FONCTIONS = ['const PA_TYPES=', 'const MENTION_REGL=', 'const PH_MARQUE=', 'function photoPid(', 'function photoSrc(', 'function planImgSrc(',
  'function papZoneOf(', 'function papRoomAt(', 'function papFrac(', 'function papMerc(', 'function papWorld(', 'function papLL2F(', 'function papMPerPx(',
  'function paReleveOf(', 'function paHistoPoste(', 'function paLastEtat(',
  'function _pdfTxt(', 'const _PDF_L=', 'function _pdfLarg(', 'function _pdfCoupe(', 'function _pdfDessinPlans(',
  'function rapportProduitsLibres(', 'function rapportChampsPerso(', 'const PAP_IMPL_MAX_B64=', 'function rapportPdfStr(',
  'const _rapEnvoi=', 'async function rapportVia('];
const SOURCES = FONCTIONS.map(decoupe);
vrai('les déclarations sont extraites du fichier réel (' + SOURCES.length + ')', SOURCES.every(x => x.length > 10));

function monter(base, ext) {
  const W = Object.assign({ console, Map, Set, Object, JSON, String, Math, Date, Array, Number, Promise, Error, isNaN, parseInt,
    atob: s => Buffer.from(s, 'base64').toString('latin1'), btoa: s => Buffer.from(s, 'latin1').toString('base64'),
    __toasts: [], __saves: 0, __mails: [], __impr: 0, __confirm: true, __confirms: [], __doc: null, __mailOk: true, __attente: null, __constat: [], __t3d: [],
    document: { getElementById: () => null } }, ext || {});
  W.db = JSON.parse(JSON.stringify(base));
  vm.createContext(W);
  vm.runInContext(SOURCES.join('\n') + `
    function todayISO(){ return '2026-09-24'; } function fmtShort(d){ return String(d||''); }
    function techNames(i){ return (i.techNom||'Tom Sonde'); } function produit(id){ return (db.produits||[]).find(p=>p.id===id)||{}; }
    function prodLineName(l){ return l.nomLibre||produit(l.produitId).nom||'—'; } function prodLineAmm(l){ return produit(l.produitId).amm||''; }
    function prodLineUnit(l){ return l.unite||''; }
    function rapportConstatLignes(i){ return __constat||[]; } function t3dTexte(i){ return __t3d||[]; }
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function closeModal(){}
    function intHisto(i,t){ (i.histo=i.histo||[]).push(t); } function genRapportTexte(i){ return 'RAPPORT TEXTE'; }
    function intSocMailOpts(i){ return {brandName:'Alpha Nuisibles',societe:'Alpha Nuisibles'}; } function rapportSociete(){ return 'Alpha Nuisibles'; } function canCat(){ return true; }
    function confirm(m){ __confirms.push(m); return __confirm; }
    async function printRapport(id){ __impr++; }
    async function rapportDocument(id){ if(__attente) await __attente; return __doc; }
    async function srvMail(to,sub,body,okMsg,cat,box,opts){ __mails.push({to,sub,body,opts}); return __mailOk; }
    const $=()=>null;`, W);
  return W;
}

/* ── lire un PDF écrit à la main : objets, xref, pages, texte dessiné ── */
function lirePdf(pdf) {
  const r = { ok: true, pb: [] };
  if (!pdf.startsWith('%PDF-1.4\n')) r.pb.push('en-tête');
  const sx = /startxref\n(\d+)\n%%EOF$/.exec(pdf); if (!sx) { r.pb.push('startxref'); r.ok = false; return r; }
  const xr = +sx[1]; if (pdf.slice(xr, xr + 5) !== 'xref\n') r.pb.push('startxref ne pointe pas sur la table');
  const n = +(/xref\n0 (\d+)\n/.exec(pdf.slice(xr)) || [])[1];
  const ent = pdf.slice(xr).split('\n').slice(2, 2 + n);
  for (let k = 1; k < n; k++) { const off = parseInt(ent[k], 10); if (pdf.slice(off, off + String(k).length + 6) !== k + ' 0 obj') r.pb.push('objet ' + k + ' mal placé'); }
  r.objets = n - 1;
  r.pages = +(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/.exec(pdf) || [])[1];
  r.images = (pdf.match(/\/Subtype \/Image/g) || []).length;
  /* chaque image : sa longueur déclarée est celle de son flux */
  const reImg = /\/Subtype \/Image [^>]*\/Length (\d+) >>\nstream\n/g; let m;
  while ((m = reImg.exec(pdf))) { const debut = m.index + m[0].length, L = +m[1]; if (pdf.slice(debut + L, debut + L + 10) !== '\nendstream') r.pb.push('longueur d\'image fausse'); }
  /* le texte : chaque « x y Td (…) Tj » avec sa police et sa taille */
  r.textes = []; const reT = /\/F([12]) ([\d.]+) Tf\n([\d.-]+) ([\d.-]+) Td\n\(((?:\\.|[^\\)])*)\) Tj/g;
  while ((m = reT.exec(pdf))) r.textes.push({ gras: m[1] === '2', sz: +m[2], x: +m[3], y: +m[4], t: m[5].replace(/\\(.)/g, '$1') });
  /* pour MESURER, on repasse de WinAnsi au caractère : « ’ » est l'octet 146 dans le flux, et sa
     largeur est celle de l'apostrophe (222), pas celle d'un caractère inconnu (556) — la première
     version de ce banc accusait le titre de déborder pour cette seule raison */
  const WA = { 128: '\u20AC', 133: '\u2026', 140: '\u0152', 145: '\u2018', 146: '\u2019', 147: '\u201C', 148: '\u201D', 150: '\u2013', 151: '\u2014', 156: '\u0153' };
  r.textes.forEach(t => { t.u = t.t.replace(/[\x80-\x9F]/g, ch => WA[ch.charCodeAt(0)] || ch); });
  r.ok = !r.pb.length; return r;
}
const JPEG1 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const IM = (w, h, nom, tag) => ({ b64: JPEG1, w, h, nom, tag });
const BASE = {
  clients: [{ id: 'cX', nom: 'Boulangerie Élise', email: 'elise@exemple.fr', adresse: '3 rue de l’Église' }],
  produits: [{ id: 'p1', nom: 'Brodifacoum pâte', amm: 'FR-2019-0042', ref: 'BRD-1' }],
  champsPerso: [{ id: 'f1', label: 'Accès', type: 'texte' }, { id: 'f2', label: 'Mesures', type: 'tableau', colonnes: ['Pièce', 'Temp.'] }],
  plansSite: { cX: [
    { id: 'plR', nom: 'Rez-de-chaussée', mode: 'rooms', version: 2, rooms: [{ nom: 'Cuisine', x: .1, y: .1, w: .4, h: .3, zoneAlim: true }],
      postes: [{ id: 'a', num: 1, x: .2, y: .6, type: 'appat', zone: 'Réserve' }, { id: 'b', num: 2, x: .5, y: .6, type: 'piege' }] },
    { id: 'plP', nom: 'Cour', mode: 'img', img: 'data:image/jpeg;base64,' + JPEG1, version: 1, rooms: [], postes: [{ id: 'd', num: 4, x: 40, y: 50, type: 'appat' }] },
    { id: 'plV', nom: 'Vide', mode: 'rooms', rooms: [], postes: [] }] },
  interventions: [{ id: 'i1', num: 'INT-2026-042', clientId: 'cX', titre: 'Passage mensuel — dératisation', date: '2026-09-24', heure: '09:30', duree: 45,
    adresse: '3 rue de l’Église, 17000 La Rochelle', desc: 'Contrôle des postes.', compteRendu: 'Nous avons contrôlé les postes ⚖️ 🐀 du site.\nConsommation au poste 1.',
    constat: { recommandations: 'Colmater le passage de câbles.' },
    produitsUtilises: [{ produitId: 'p1', qte: 2, unite: 'u' }, { nomLibre: 'Gel blattes', qte: 1, unite: 'tube' }],
    champs: { f1: 'Code portail 1234', f2: [['Cuisine', '4 °C'], ['Réserve', '18 °C']] },
    relevesPlan: [{ posteId: 'a', etat: 'consomme', note: 'Appât consommé à 80 %' }, { posteId: 'd', etat: 'ras' }],
    equipements: [{ nom: 'Pulvérisateur', reference: 'PX-9' }],
    photos: ['data:1', 'data:2', 'data:3', 'data:4', 'data:5'], photoTags: ['avant', 'apres'],
    signature: 'data:sig', signatureTech: 'data:sigt', signatureMeta: { cli: { nom: 'M. Élise', ts: 1790000000000 }, tech: { nom: 'Tom Sonde', ts: 1790000000000 } } }] };
const E = { nom: 'Alpha Nuisibles', couleur: '#C0392B', lignes: ['2 quai Alpha, 33000 Bordeaux', 'SIRET 222 222 222 00022 · TVA FR12222222222'], logo: IM(3, 1) };
const IMGS = { plans: { plP: IM(4, 3, 'P1') }, photos: [IM(4, 3, 'X1', 'avant'), IM(3, 4, 'X2', 'apres'), IM(1, 1, 'X3'), { manque: true }, IM(2, 1, 'X4')], sigCli: IM(3, 1, 'S1'), sigTech: IM(3, 1, 'S2') };

(async () => {
console.log('\n══ 1. UN VRAI PDF : structure, pages, images ══\n');
const W = monter(BASE); W.__constat = [['Prestation', 'Dératisation'], ['Nuisibles ciblés', 'Rats, souris']]; W.__t3d = ['', 'RONGEURS :', '- Infestation : Faible', '⚖️ Appâtage sans infestation constatée — justification : préventif'];
const pdf = W.rapportPdfStr(W.db.interventions[0], E, IMGS);
const P = lirePdf(pdf);
v('la structure se lit : xref juste, chaque objet à sa place', P.pb, []);
v('les images : logo + 1 plan + 4 photos + 2 signatures', P.images, 8);
vrai('au moins une page', P.pages >= 1);
const tout = P.textes.map(t => t.t).join('\n');
console.log('\n══ 2. LE CONTENU EST CELUI DU RAPPORT ══\n');
[['le titre du document', 'RAPPORT D\x92INTERVENTION'], ['la société', 'Alpha Nuisibles'], ['le numéro', 'INT-2026-042'], ['le client', 'Boulangerie \xC9lise'],
 ['le technicien', 'Tom Sonde'], ['la durée', '45 min'], ['le compte-rendu', 'Consommation au poste 1.'], ['les lignes de constat', 'Rats, souris'],
 ['le détail par type', 'RONGEURS :'], ['les recommandations', 'Colmater le passage de c\xE2bles.'], ['un champ personnalisé', 'Code portail 1234'],
 ['un champ tableau', '18 \xB0C'], ['le produit et son AMM', 'FR-2019-0042'], ['le produit libre', 'Gel blattes'], ['le relevé d\'un poste', 'Appât consommé à 80 %'.replace('â', '\xE2').replace('é', '\xE9')],
 ['l\'équipement', 'PX-9'], ['la signature du client, qui et quand', 'M. \xC9lise \x97 le '], ['la mention réglementaire', 'Certibiocide'], ['le pied de page', 'Page 1/']]
  .forEach(([q, t]) => vrai(q, tout.indexOf(t) >= 0, 'absent : ' + JSON.stringify(t)));
v('⛔ pas un seul « ? » venu d\'un émoji (WinAnsi n\'en a pas)', /\?\?|\? du site| \?$/m.test(tout), false);
vrai('   la phrase qui portait un émoji est bien là, sans lui', /contr\xF4l\xE9 les postes du site/.test(tout));
vrai('   le plan sans poste n\'est pas imprimé', tout.indexOf('Vide') < 0);

console.log('\n══ 3. ⛔ RIEN NE SORT DE LA PAGE ══\n');
{ const M = 42, RGT = 553; const trop = P.textes.filter(t => t.x + W._pdfLarg(t.u, t.sz, t.gras) > RGT + 1.5 || t.x < M - 0.5);
  v('chaque ligne tient entre les marges (largeur Helvetica réelle)', trop.map(t => t.t.slice(0, 40) + ' @' + t.x), []);
  const bas = P.textes.filter(t => t.y < 40); v('et rien sous le pied de page', bas.map(t => t.t.slice(0, 30)), []); }
{ /* un compte-rendu très long, un mot interminable : plusieurs pages, et toujours dans les marges */
  const W2 = monter(BASE); const i = W2.db.interventions[0];
  i.compteRendu = Array.from({ length: 160 }, (_, k) => 'Ligne ' + k + ' du compte-rendu, assez longue pour obliger la coupe à la largeur de la page imprimée.').join('\n') + '\nhttps://exemple.fr/' + 'x'.repeat(300);
  const P2 = lirePdf(W2.rapportPdfStr(i, E, IMGS));
  vrai('un long compte-rendu passe sur plusieurs pages', P2.pages >= 4, P2.pages);
  v('   la structure tient', P2.pb, []);
  const trop = P2.textes.filter(t => t.x + W2._pdfLarg(t.u, t.sz, t.gras) > 554.5);
  v('   ⛔ et le mot de 300 caractères est coupé, pas débordant', trop.map(t => t.t.slice(0, 30)), []);
  const pieds = (P2.textes.filter(t => /^Page \d+\/\d+$/.test(t.t))).map(t => t.t);
  v('   chaque page porte « Page k/N »', pieds.length, P2.pages);
  vrai('   la dernière ligne du compte-rendu est là', P2.textes.some(t => /Ligne 159 du compte-rendu/.test(t.t))); }
{ const W3 = monter(BASE); const i = W3.db.interventions[0]; i.clientAbsent = true; i.signature = ''; delete i.signatureMeta.cli;
  const t3 = lirePdf(W3.rapportPdfStr(i, E, Object.assign({}, IMGS, { sigCli: null }))).textes.map(t => t.t).join('\n');
  vrai('client absent : c\'est ÉCRIT dans le cadre de sa signature', /Client absent lors du passage/.test(t3)); }
{ const W4 = monter(BASE); const i = W4.db.interventions[0]; i.photos = []; i.produitsUtilises = []; i.relevesPlan = []; i.signature = ''; i.signatureTech = '';
  W4.db.plansSite = {}; i.champs = {}; i.equipements = []; i.constat = {}; i.desc = ''; i.compteRendu = '';
  const P4 = lirePdf(W4.rapportPdfStr(i, E, { plans: {}, photos: [] }));
  vrai('un rapport presque vide reste un PDF valide, d\'une page', P4.ok && P4.pages === 1, JSON.stringify(P4.pb));
  v('   sans mention réglementaire quand aucun produit n\'est utilisé', P4.textes.some(t => /Certibiocide/.test(t.t)), false); }
{ const W5 = monter(BASE); W5.db.plansSite.cX[1].img = 'piece:' + 'a'.repeat(64);
  const t5 = lirePdf(W5.rapportPdfStr(W5.db.interventions[0], E, Object.assign({}, IMGS, { plans: {} }))).textes.map(t => t.t).join('\n');
  vrai('⛔ un plan dont la photo n\'a pas pu être récupérée le DIT dans son cadre', /Photo du plan non disponible au moment de l\x92envoi/.test(t5)); }

console.log('\n══ 4. ⛔ L\'ENVOI : PDF JOINT, TRACE APRÈS LA RÉUSSITE, UN SEUL COURRIEL ══\n');
{ const W6 = monter(BASE); W6.__doc = { pdf: '%PDF', b64: 'QUJD', nom: 'Rapport-intervention-Boulangerie-Elise-2026-09-24.pdf', manque: { photos: 0, plans: 0 } };
  await W6.rapportVia('i1', 'mail'); const m = W6.__mails[0] || { opts: {} };
  v('un courriel, avec le PDF en pièce jointe', [W6.__mails.length, (m.opts.atts || [])[0]], [1, { filename: 'Rapport-intervention-Boulangerie-Elise-2026-09-24.pdf', content: 'QUJD' }]);
  v('⛔ sans repli sur un brouillon (mailto ne joint rien)', m.opts.sansMailto, true);
  v('   au nom de la société du passage (docMailOpts)', m.opts.brandName, 'Alpha Nuisibles');
  vrai('   le texte dit qu\'un PDF est joint', /joint à ce message, en PDF/.test(m.body));
  const i = W6.db.interventions[0];
  v('   la trace dit « PDF joint », une fois enregistrée', [i.rapportEnvoye && i.rapportEnvoye.pdf, W6.__saves, (i.histo || []).slice(-1)[0]], [true, 1, 'Rapport envoyé par e-mail à elise@exemple.fr (PDF joint)']);
  v('   et l\'impression ne s\'ouvre plus', W6.__impr, 0); }
{ const W7 = monter(BASE); W7.__doc = { pdf: '%PDF', b64: 'QUJD', nom: 'r.pdf', manque: {} }; W7.__mailOk = false;
  await W7.rapportVia('i1', 'mail'); const i = W7.db.interventions[0];
  v('⛔⛔ courriel refusé : RIEN ne se trace (ni rapportEnvoye, ni historique, ni save)', [i.rapportEnvoye || null, (i.histo || []).length, W7.__saves], [null, 0, 0]); }
{ const W8 = monter(BASE); let lache; W8.__attente = new Promise(r => { lache = r; }); W8.__doc = { pdf: '%PDF', b64: 'QUJD', nom: 'r.pdf', manque: {} };
  const a = W8.rapportVia('i1', 'mail'), b = W8.rapportVia('i1', 'mail'); lache(); await a; await b;
  v('⛔ deux touches rapides : UN seul courriel', W8.__mails.length, 1);
  await W8.rapportVia('i1', 'mail'); v('   le verrou se relâche après l\'envoi (un renvoi volontaire passe)', W8.__mails.length, 2); }
{ const W9 = monter(BASE); W9.__doc = { pdf: '%PDF', b64: 'QUJD', nom: 'r.pdf', manque: { photos: 2, plans: 1 } }; W9.__confirm = false;
  await W9.rapportVia('i1', 'mail');
  v('il manque des photos : on DEMANDE, et « non » n\'envoie rien', [W9.__confirms.length, W9.__mails.length], [1, 0]);
  vrai('   la question compte ce qui manque', /2 photo\(s\) et 1 photo\(s\) de plan/.test(W9.__confirms[0] || '')); }
{ const W10 = monter(BASE); W10.__doc = { err: 'Le rapport dépasse la taille qu’un courriel peut porter — rien n’est parti.' };
  await W10.rapportVia('i1', 'mail'); const m = W10.__mails[0] || { opts: {} }; const i = W10.db.interventions[0];
  v('PDF impossible : on retombe sur l\'ancien envoi (impression + texte), et on le dit', [W10.__impr, W10.__mails.length, !!(m.opts && m.opts.atts)], [1, 1, false]);
  vrai('   le message dit pourquoi', W10.__toasts.some(t => /dépasse la taille/.test(t) && /part en texte/.test(t)));
  v('   la trace dit « sans PDF »', [i.rapportEnvoye && i.rapportEnvoye.pdf, (i.histo || []).slice(-1)[0]], [false, 'Rapport envoyé par e-mail à elise@exemple.fr (texte, sans PDF)']); }

console.log('\n══ 5. LES MÊMES SOURCES QUE LE RAPPORT IMPRIMÉ ══\n');
{ const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  const corps = (h) => { const i = SRC.indexOf(h); if (i < 0) return ''; let d = 0; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) return SRC.slice(i, k + 1); } } return ''; };
  const pr = corps('async function printRapport('), pdf = corps('function rapportPdfStr('), txt = corps('function genRapportTexte(');
  [['rapportConstatLignes(i)', 'les lignes de constat'], ['rapportProduitsLibres(i)', 'les produits libres'], ['rapportChampsPerso(i)', 'les champs personnalisés']]
    .forEach(([f, q]) => vrai('⛔ ' + q + ' : le rapport imprimé et le PDF lisent la même fonction', pr.indexOf(f) > 0 && pdf.indexOf(f) > 0));
  vrai('   … et le courriel aussi, pour les produits', txt.indexOf('rapportProduitsLibres(i)') > 0);
  vrai('⛔ le plan est dessiné par la géométrie PARTAGÉE avec le plan d\'implantation', /_pdfDessinPlans\(/.test(pdf) && /_pdfDessinPlans\(/.test(corps('function papImplPdfStr(')));
  vrai('   plus aucune copie de la règle des produits libres', (SRC.match(/filter\(l=>!l\.categorie\|\|!\(\(\(i\.quest\|\|\{\}\)\[l\.categorie\]\|\|\{\}\)\.actif\)\)/g) || []).length === 1);
  const doc = corps('async function rapportDocument(');
  vrai('⛔ le document relit photos et plans du serveur sans rien enregistrer', /await photosResoudre\(i\.photos\)/.test(doc) && /await planImgsResoudre\(i\.clientId\)/.test(doc) && !/save\(\)/.test(doc));
  vrai('   et se réduit tant que le courriel ne peut pas le porter (PAP_IMPL_MAX_B64)', /b64\.length<=PAP_IMPL_MAX_B64/.test(doc));
  const env = corps('function envoiRapportClient(');
  vrai('   la fenêtre d\'envoi dit que le PDF est joint', /le rapport part en PDF joint/.test(env)); }

console.log('\n════ test-802 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('\n════ test-802 : ' + ok + ' ✓ ' + (ko + 1) + ' ✗ ════'); process.exit(1); });
