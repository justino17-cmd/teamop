/* ══ v740 — LE PLAN D'IMPLANTATION, REMIS À CHAQUE PASSAGE ═════════════════════════════════════
   Justin, 23 septembre 2026 : « à chaque intervention il envoie un nouveau plan s'il a été modifié,
   sinon il renvoie le même, c'est tout ». Puis : « chaque en-tête doit reconnaître l'entreprise qui
   est sur l'intervention, pour que le client reçoive bien le bon PDF ».

   Ce que ce banc tient, en EXÉCUTANT les vraies fonctions extraites d'app.html :
   · « modifié » se lit sur ce que le document IMPRIME (empreinte), pas sur `pl.version` — trois
     gestes de la fiche poste changeaient le document sans monter la version ;
   · une version par contenu envoyé : un plan inchangé repart avec la MÊME version, un plan changé
     monte d'un cran ;
   · l'envoi se lit par passage (`i.planEnvoi`), et survit quand l'autre appareil gagne `plansSite` ;
   · le client REÇOIT le plan : un PDF joint, valide (table xref juste, accents en WinAnsi) ; rien ne
     s'écrit si le courriel n'est pas parti, et un courriel refusé ne se rabat pas sur un brouillon
     sans pièce jointe (`sansMailto`) ;
   · l'en-tête est celui de la société de CETTE intervention.
   La mesure dans une vraie page (photo réelle, fenêtre de clôture, envoi intercepté) est
   `scratchpad/sonde-implantation.js`. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); const fin = m ? m.index : Math.min(APP.length, d + 80000);
  let bout = APP.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }
function corps(nom) { const m = new RegExp('(?:async\\s+)?function ' + nom + '\\(').exec(SRC); if (!m) return '';
  let i = SRC.indexOf('{', m.index), p = 0;
  for (let k = i; k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(m.index, k + 1); } }
  return ''; }

/* un vrai petit JPEG (1×1) : la structure du PDF se vérifie, pas son rendu */
const JPEG1 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
const FONCTIONS = ['function plansOf(', 'function papZoneOf(', 'function papRoomAt(', 'function papFrac(', 'function papMerc(', 'function papWorld(',
  'function papLL2F(', 'function papMPerPx(', 'function papPlanNum(', 'function _pdfTranslit(', 'function _pdfTxt(', 'function recEmpreinte(', 'const _PDF_L=', 'function _pdfLarg(',
  'function _pdfCoupe(', 'const PAP_IMPL_MAX_B64=', 'const _papImgEmp=', 'function papImgEmpCalc(', 'function papImgEmpreinte(',
  'function photoPid(', 'function photoSrc(', 'function photoMarquer(', 'function papImplPlans(', 'function papImplContenuPlan(',
  'function papImplEmpreintes(', 'function papImplDernier(', 'function papImplDernierPlan(', 'function papImplEtat(', 'function papImplEtatTxt(',
  'function _pdfDessinPlans(', 'function papImplPdfStr(', 'async function papImplDocument(', 'let _papImplEnvoi=', 'async function papImplantationEnvoyer(', 'function papImplCarteHtml(', 'function papImplClotureLigne(',
  'function papMarque(', 'function papTombe(', 'function papTouch(', 'function papFindPoste(', 'function papZoneAlimName(', 'function papSheetZone(', 'function papSheetProduit(', 'function papSheetSecure(',
  'function socNom(', 'function docEntete(', 'function docCoordLignes(', 'function docMailOpts(', 'function socDuClient(', 'function socStyle(', 'function entSocUnique('];
const CONSTS = ['const PA_TYPES=', 'const PAP_ZONES_ALIM=', 'const MENTION_REGL=', 'const PH_MARQUE='];
function monter(base) {
  const W = { console, Map, Set, Object, JSON, String, Math, Date, Array, Number, Promise, Uint8Array, Error, isNaN,
    atob: s => Buffer.from(s, 'base64').toString('latin1'), btoa: s => Buffer.from(s, 'latin1').toString('base64'),
    PUSH_API: 'http://127.0.0.1:1', fetch: () => Promise.resolve({ ok: true }), syncTeam: () => 't', APP_VERSION: '740',
    window: {}, __mails: [], __toasts: [], __saves: 0, __histo: [], __droit: true, __mailOk: true, __jpeg: null, __pieces: {},
    document: { querySelectorAll: () => [], getElementById: () => null } };
  W.db = JSON.parse(JSON.stringify(base));
  vm.createContext(W);
  vm.runInContext([...CONSTS.map(decoupe), ...FONCTIONS.map(decoupe),
    `function can(c){ return c==='modifierPlans'?__droit:true; }
     function toast(m){ __toasts.push(m); } function save(){ __saves++; } function intHisto(i,t){ (i.histo=i.histo||[]).push({txt:t}); __histo.push(t); }
     function fullName(u){ return u?(u.prenom+' '+u.nom):''; } function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
     function fmtShort(d){ return String(d||''); } function todayISO(){ return '2026-09-23'; } function entNom(){ return (db.entreprise&&db.entreprise.nom)||'OP GESTION'; }
     /* v744 : les VRAIES fonctions de pièce (photoPid, photoSrc, photoMarquer) sont extraites ; seul
        le réseau est simulé — une pièce connue de __pieces est rendue, les autres « on ne sait pas ». */
     async function pieceLire(id){ return (__pieces&&__pieces[id])?{dataUrl:__pieces[id]}:{inconnu:true,motif:'reseau'}; }
     function renderIntDetail(){} function papPosteSheet(){} function papAlimBlock(){}
     const produit=id=>db.produits.find(p=>p.id===id)||{};
     async function devisLogoJpeg(src){ return null; }
     async function papImplJpeg(src,max,q){ return __jpeg?__jpeg(src,max,q):(src?{b64:'${JPEG1}',w:1,h:1}:null); }
     async function srvMail(to,sub,body,okMsg,cat,box,opts){ __mails.push({to,sub,body,opts}); return __mailOk; }
     var currentUser={prenom:'Tom',nom:'Sonde'};`].join('\n'), W);
  return W;
}
const BASE = {
  entreprise: { nom: 'Nettoyage Excellence SARL', adresse: '1 rue de la Mairie', cp: '17000', ville: 'La Rochelle', siret: '11111111100011', tel: '0500000000' },
  societes: ['Alpha Nuisibles', 'Bêta Hygiène'],
  societesStyle: { 'Alpha Nuisibles': { couleur: '#C0392B', siret: '22222222200022', adresse: '2 quai Alpha', cp: '33000', ville: 'Bordeaux' }, 'Bêta Hygiène': { couleur: '#2E86C1' } },
  clients: [{ id: 'cX', nom: 'Boulangerie Élise', email: 'elise@exemple.fr', adresse: '3 rue de l’Église' }, { id: 'cN', nom: 'Sans courriel' }],
  produits: [{ id: 'p1', nom: 'Brodifacoum pâte', amm: 'FR-2019-0042' }, { id: 'p2', nom: 'Piège X', amm: 'FR-2020-0007' }],
  interventions: [
    { id: 'iA', clientId: 'cX', date: '2026-09-10', statut: 'terminee', rapportModele: 'Alpha Nuisibles' },
    { id: 'iB', clientId: 'cX', date: '2026-09-23', statut: 'encours', rapportModele: 'Bêta Hygiène' },
    { id: 'iG', clientId: 'cX', date: '2026-09-22', statut: 'encours', rapportModele: 'Modèle générique' }],
  plansSite: { cX: [
    { id: 'plR', nom: 'Rez-de-chaussée', mode: 'rooms', version: 2, rooms: [{ id: 'r1', nom: 'Cuisine', x: .1, y: .1, w: .4, h: .3, zoneAlim: true }],
      postes: [{ id: 'a', num: 1, x: .2, y: .6, type: 'appat', produitId: 'p1', secure: true, zone: 'Réserve', dateTubes: '' },
               { id: 'b', num: 2, x: .5, y: .6, type: 'piege' }, { id: 'c', num: 3, x: .8, y: .6, type: 'insecte', zone: 'Cuisine' }] },
    { id: 'plP', nom: 'Cour', mode: 'img', img: 'data:image/jpeg;base64,' + JPEG1, version: 1, rooms: [], postes: [{ id: 'd', num: 4, x: 40, y: 50, type: 'appat', produitId: 'p2' }] },
    { id: 'plV', nom: 'Réserve vide', mode: 'rooms', version: 1, rooms: [{ id: 'r2', nom: 'Vide', x: .1, y: .1, w: .2, h: .2 }], postes: [] }] } };

(async () => {
console.log('── 792 · 1. la population est là ──');
{ const W = monter(BASE);
  v('les plans qui implantent : ceux qui ont au moins un poste (le plan sans poste est écarté)', W.papImplPlans('cX').map(p => p.id), ['plR', 'plP']);
  vrai('le document a des postes à imprimer (4)', W.papImplPlans('cX').reduce((s, p) => s + p.postes.length, 0) === 4); }

console.log('── 792 · 2. « modifié » = ce que le document IMPRIME ──');
{ const W = monter(BASE); const e0 = W.papImplEmpreintes('cX').doc;
  v('deux calculs identiques', W.papImplEmpreintes('cX').doc, e0);
  const neutres = { 'version': pl => { pl.version = 9; }, 'historique': pl => { pl.historique = [{ a: 1 }]; }, 'trace d’envoi': pl => { pl.implantationEnvoyee = { ts: 1, par: 'x' }; },
    '_m': pl => { pl._m = 5; }, 'date des tubes UV (non imprimée)': pl => { pl.postes[0].dateTubes = '2026-01-01'; } };
  for (const [n, f] of Object.entries(neutres)) { const W2 = monter(BASE); f(W2.db.plansSite.cX[0]); v('ne change PAS l’empreinte : ' + n, W2.papImplEmpreintes('cX').doc, e0); }
  const imprimes = { 'la zone d’un poste': d => { d.plansSite.cX[0].postes[0].zone = 'Cave'; }, 'le produit posé': d => { d.plansSite.cX[0].postes[1].produitId = 'p1'; },
    'le n° d’AMM dans la fiche produit': d => { d.produits[0].amm = 'FR-2019-9999'; }, 'la boîte sécurisée': d => { d.plansSite.cX[0].postes[0].secure = false; },
    'la position x': d => { d.plansSite.cX[0].postes[0].x = .21; }, 'la position y': d => { d.plansSite.cX[0].postes[0].y = .61; },
    'le type': d => { d.plansSite.cX[0].postes[1].type = 'appat'; }, 'le numéro': d => { d.plansSite.cX[0].postes[1].num = 7; },
    'le nom du plan': d => { d.plansSite.cX[0].nom = 'RDC'; }, 'une pièce': d => { d.plansSite.cX[0].rooms[0].w = .5; },
    'la photo du plan': d => { d.plansSite.cX[1].img = 'data:image/jpeg;base64,AAAA'; }, 'un plan retiré': d => { d.plansSite.cX.splice(1, 1); },
    'un poste ajouté': d => { d.plansSite.cX[1].postes.push({ id: 'e', num: 5, x: 10, y: 10, type: 'piege' }); } };
  for (const [n, f] of Object.entries(imprimes)) { const b = JSON.parse(JSON.stringify(BASE)); f(b); const W2 = monter(b); vrai('CHANGE l’empreinte : ' + n, W2.papImplEmpreintes('cX').doc !== e0); } }

console.log('── 792 · 3. les états, et une version par contenu envoyé ──');
{ const W = monter(BASE); const i = () => W.db.interventions.find(x => x.id === 'iB');
  v('jamais envoyé', W.papImplEtat('cX').etat, 'jamais');
  vrai('… la carte le dit, et « délivré une fois » a disparu', /Jamais envoyé/.test(W.papImplCarteHtml(i())) && !/délivré une fois/.test(W.papImplCarteHtml(i())));
  vrai('… et le passage n’est pas encore servi', /Pas encore envoyé pour ce passage/.test(W.papImplCarteHtml(i())));
  await W.papImplantationEnvoyer('cX', 'iB');
  v('un courriel part', W.__mails.length, 1);
  v('après l’envoi : inchangé', W.papImplEtat('cX').etat, 'inchange');
  v('… les versions envoyées sont celles du plan', W.db.plansSite.cX.slice(0, 2).map(p => p.implantationEnvoyee.v), [2, 1]);
  vrai('… et le passage le sait (i.planEnvoi, avec l’empreinte de chaque plan)', !!(i().planEnvoi && i().planEnvoi.doc && i().planEnvoi.plans.length === 2 && i().planEnvoi.plans[0][2]));
  vrai('… une ligne dans l’historique du passage', W.__histo.length === 1 && /Plan d’implantation envoyé/.test(W.__histo[0]), W.__histo);
  vrai('… la carte dit « Inchangé » et « Envoyé pour ce passage »', /Inchangé depuis/.test(W.papImplCarteHtml(i())) && /Envoyé pour ce passage/.test(W.papImplCarteHtml(i())));
  W.db.plansSite.cX[0].postes[0].zone = 'Cave';                    // un changement sans papTouch (appareil d'avant)
  v('un changement de zone : modifié', W.papImplEtat('cX').etat, 'modifie');
  v('… le plan changé monte d’un cran, l’autre garde sa version', W.papImplEtat('cX').plans.map(x => x.v), [3, 1]);
  vrai('… la carte propose « le nouveau plan (version 3 / 1) »', /Envoyer le nouveau plan \(version 3 \/ 1\)/.test(W.papImplCarteHtml(i())));
  await W.papImplantationEnvoyer('cX', 'iB');
  v('après l’envoi du nouveau plan : sa version est écrite sur le plan', W.db.plansSite.cX[0].version, 3);
  vrai('… et son historique le dit', (W.db.plansSite.cX[0].historique || []).some(h => /version 3/.test(h.action)));
  vrai('… le courriel annonce la mise à jour', /mis à jour/.test(W.__mails[1].sub) && /remplace le précédent/.test(W.__mails[1].body), W.__mails[1].sub);
  await W.papImplantationEnvoyer('cX', 'iB');
  v('un renvoi à l’identique ne monte AUCUNE version', W.db.plansSite.cX.slice(0, 2).map(p => [p.version, p.implantationEnvoyee.v]), [[3, 3], [1, 1]]);
  vrai('… et le courriel dit « inchangé », pas « mis à jour »', /inchangé depuis notre envoi/.test(W.__mails[2].body) && !/mis à jour/.test(W.__mails[2].sub));
  const W3 = monter(BASE); W3.db.plansSite.cX[0].implantationEnvoyee = { ts: 5, par: 'Ancien appareil' };
  v('un envoi d’avant le suivi ({ts,par}) : état « inconnu », jamais « inchangé »', W3.papImplEtat('cX').etat, 'inconnu'); }

console.log('── 792 · 4. le PDF joint est un vrai PDF ──');
{ const W = monter(BASE); await W.papImplantationEnvoyer('cX', 'iB');
  const m = W.__mails[0]; const a = (m.opts && m.opts.atts || [])[0] || {};
  vrai('une pièce jointe, nommée en ASCII et en .pdf', /^Plan-implantation-[\w-]+-v[\d-]+\.pdf$/.test(a.filename || ''), a.filename);
  const pdf = Buffer.from(a.content || '', 'base64').toString('latin1');
  vrai('commence par %PDF-1.4 et finit par %%EOF', pdf.startsWith('%PDF-1.4') && pdf.endsWith('%%EOF'));
  const xr = +(pdf.match(/startxref\n(\d+)/) || [0, 0])[1]; const tab = pdf.slice(xr).split('\n'); const n = +((tab[1] || '').split(' ')[1] || 0); let bons = 0;
  for (let k = 1; k < n; k++) { const off = +tab[2 + k].slice(0, 10); if (pdf.slice(off).startsWith(k + ' 0 obj')) bons++; }
  vrai('chaque entrée de la table xref pointe sur son objet (' + (n - 1) + ' objets)', n > 5 && bons === n - 1, [bons, n - 1]);
  vrai('au moins une page', /\/Type \/Page /.test(pdf));
  vrai('le n° d’AMM est imprimé', pdf.includes('FR-2019-0042') && pdf.includes('FR-2020-0007'));
  vrai('« é » part en WinAnsi (\\xE9), pas en « ? »', pdf.includes('Rez-de-chauss\xe9e') && !pdf.includes('Rez-de-chauss?e'));
  vrai('la photo du plan est embarquée en JPEG (DCTDecode)', /\/Filter \/DCTDecode/.test(pdf));
  vrai('le corps dit « ci-joint » — et jamais la phrase destinée au technicien', /ci-joint/.test(m.body) && !/s.ouvre pour être joint/.test(m.body));
  v('un refus ne se rabat pas sur un brouillon sans pièce jointe (sansMailto)', m.opts.sansMailto, true); }

console.log('── 792 · 5. l’en-tête est celui de la société de CETTE intervention ──');
{ const W = monter(BASE); await W.papImplantationEnvoyer('cX', 'iA');
  const pdfA = Buffer.from(W.__mails[0].opts.atts[0].content, 'base64').toString('latin1');
  vrai('envoyé depuis une intervention « Alpha » : le PDF porte Alpha et SON SIRET', pdfA.includes('Alpha Nuisibles') && pdfA.includes('22222222200022') && !pdfA.includes('11111111100011'));
  v('… l’expéditeur du courriel est Alpha', W.__mails[0].opts.brandName, 'Alpha Nuisibles');
  const W2 = monter(BASE); await W2.papImplantationEnvoyer('cX', 'iB');
  const pdfB = Buffer.from(W2.__mails[0].opts.atts[0].content, 'base64').toString('latin1');
  vrai('depuis une intervention « Bêta » (plus récente, sans SIRET) : Bêta, avec les coordonnées de l’entreprise', pdfB.includes('B\xeata Hygi\xe8ne') && pdfB.includes('11111111100011') && !pdfB.includes('Alpha Nuisibles'));
  const W3 = monter(BASE); await W3.papImplantationEnvoyer('cX', 'iG');
  const pdfG = Buffer.from(W3.__mails[0].opts.atts[0].content, 'base64').toString('latin1');
  vrai('depuis une intervention « générique » : la société qui sert le client (la dernière réelle), jamais « Modèle générique »', !pdfG.includes('Mod\xe8le g\xe9n\xe9rique') && (pdfG.includes('Alpha Nuisibles') || pdfG.includes('B\xeata Hygi\xe8ne'))); }

console.log('── 792 · 6. rien ne s’écrit si le courriel n’est pas parti ──');
{ const W = monter(BASE); W.__mailOk = false; await W.papImplantationEnvoyer('cX', 'iB');
  v('refusé : aucune trace sur les plans, aucune sur le passage, aucun journal, aucun save', [W.db.plansSite.cX.some(p => p.implantationEnvoyee), !!W.db.interventions.find(x => x.id === 'iB').planEnvoi, W.__histo.length, W.__saves], [false, false, 0, 0]);
  const W2 = monter(BASE); W2.__jpeg = () => null; await W2.papImplantationEnvoyer('cX', 'iB');
  vrai('une photo de plan illisible : AUCUN courriel, et le refus se dit', W2.__mails.length === 0 && W2.__toasts.some(t => /photo du plan « Cour »/.test(t)), W2.__toasts);
  const W3 = monter(BASE); W3.__jpeg = () => ({ b64: 'A'.repeat(7000000), w: 10, h: 10 }); /* ~5,2 Mo de photo : au-delà de ce qu'un courriel porte, même réduite */ await W3.papImplantationEnvoyer('cX', 'iB');
  vrai('un document trop lourd pour un courriel : AUCUN courriel, et le refus se dit', W3.__mails.length === 0 && W3.__toasts.some(t => /dépasse la taille/.test(t)), W3.__toasts);
  const W4 = monter(BASE); W4.__droit = false; await W4.papImplantationEnvoyer('cX', 'iB');
  vrai('sans « Modifier les plans » : rien ne part', W4.__mails.length === 0 && W4.__toasts.some(t => /Modifier les plans/.test(t)));
  const W5 = monter(BASE); W5.db.interventions.push({ id: 'iN', clientId: 'cN', date: '2026-09-23' }); W5.db.plansSite.cN = [JSON.parse(JSON.stringify(BASE.plansSite.cX[0]))];
  await W5.papImplantationEnvoyer('cN', 'iN');
  vrai('un client sans e-mail : rien ne part, et on dit quoi faire', W5.__mails.length === 0 && W5.__toasts.some(t => /e-mail du client/.test(t))); }

console.log('── 792 · 7. deux appareils : la trace du passage survit ──');
{ const W = monter(BASE); await W.papImplantationEnvoyer('cX', 'iB');
  W.db.plansSite.cX = JSON.parse(JSON.stringify(BASE.plansSite.cX));   // l'autre appareil gagne plansSite en bloc, sans la trace
  v('les plans ont perdu leur trace…', W.db.plansSite.cX.some(p => p.implantationEnvoyee), false);
  v('… l’état se lit sur le passage : « inchangé », jamais « jamais »', W.papImplEtat('cX').etat, 'inchange');
  v('… et les versions envoyées aussi', W.papImplEtat('cX').plans.map(x => x.v), [2, 1]); }

console.log('── 792 · 8. la fenêtre de fin de passage le rappelle ──');
{ const W = monter(BASE); const i = W.db.interventions.find(x => x.id === 'iB');
  vrai('pas encore envoyé : une ligne et son bouton', /id="clot-plan"/.test(W.papImplClotureLigne(i)) && /papImplantationEnvoyer\('cX','iB'\)/.test(W.papImplClotureLigne(i)));
  await W.papImplantationEnvoyer('cX', 'iB');
  vrai('déjà envoyé pour ce passage : il le dit, sans bouton', /envoyé pour ce passage/.test(W.papImplClotureLigne(i)) && !/papImplantationEnvoyer/.test(W.papImplClotureLigne(i)));
  W.__droit = false; v('sans le droit : rien', W.papImplClotureLigne(W.db.interventions.find(x => x.id === 'iA')), '');
  vrai('la fenêtre de clôture l’affiche', /\$\{garQuickHtml\(id\)\}\$\{papImplClotureLigne\(it\)\}/.test(corps('clotureSuiteModal')));
  vrai('… et ne prétend plus que le rapport par e-mail « inclut le plan »', !/le PDF inclut les photos et le plan/.test(corps('clotureSuiteModal'))); }

console.log('── 792 · 9. la fiche poste note ce qui s’imprime ──');
{ const W = monter(BASE); const pl = () => W.db.plansSite.cX[0];
  W.papSheetZone('iB', 'a', 'Cave'); v('changer la zone monte la version et l’écrit dans l’historique', [pl().version, /zone « Cave »/.test((pl().historique || []).slice(-1)[0].action)], [3, true]);
  W.papSheetZone('iB', 'a', 'Cave'); v('… la même zone une seconde fois ne monte rien', pl().version, 3);
  W.papSheetProduit('iB', 'b', 'p2'); v('changer le produit posé aussi', [pl().version, /produit posé « Piège X »/.test(pl().historique.slice(-1)[0].action)], [4, true]);
  W.papSheetSecure('iB', 'a', false); v('changer la boîte sécurisée aussi', [pl().version, /non sécurisée/.test(pl().historique.slice(-1)[0].action)], [5, true]);
  W.papSheetSecure('iB', 'a', false); v('… à l’identique, rien', pl().version, 5); }

console.log('── 792 · 9 bis. un plan modifié PENDANT l’envoi : PDF, courriel et trace décrivent le même instantané ──');
/* La compression de la photo est asynchrone : pendant ce temps, une synchro ou un doigt peut
   ajouter un poste. Relecture du 23 septembre 2026 : le PDF relisait le plan vivant pendant que le
   numéro de version, le texte et la trace venaient de l'état pris avant — le client recevait un
   document que le registre de l'application ne décrivait pas. */
{ const W = monter(BASE);
  W.__jpeg = () => { W.db.plansSite.cX[0].postes.push({ id: 'z', num: 9, x: .9, y: .9, type: 'piege', zone: 'Grenierzz' }); W.__jpeg = null; return { b64: JPEG1, w: 1, h: 1 }; };
  await W.papImplantationEnvoyer('cX', 'iB');
  const m = W.__mails[0] || { opts: { atts: [{}] }, body: '' }, pdf = Buffer.from(m.opts.atts[0].content || '', 'base64').toString('latin1');
  vrai('population : le poste a bien été ajouté pendant l’envoi, et un PDF est parti', W.db.plansSite.cX[0].postes.some(p => p.id === 'z') && pdf.startsWith('%PDF'));
  vrai('le poste ajouté PENDANT la compression n’est pas dans le PDF parti', !pdf.includes('Grenierzz'));
  vrai('… le courriel compte les postes du PDF (4), pas ceux du plan vivant (5)', /, 4 poste\(s\)/.test(m.body), m.body.slice(0, 220));
  v('… et la carte dit « modifié » : le client n’a pas encore le poste 9', W.papImplEtat('cX').etat, 'modifie');
  const W2 = monter(BASE); W2.db.plansSite.cX[0].postes.push({ id: 'z', num: 9, x: .9, y: .9, type: 'piege', zone: 'Grenierzz' });
  await W2.papImplantationEnvoyer('cX', 'iB');
  vrai('contre-épreuve : posé AVANT l’envoi, le même poste est bien dans le PDF', Buffer.from(W2.__mails[0].opts.atts[0].content, 'base64').toString('latin1').includes('Grenierzz')); }

console.log('── 792 · 9 ter. v744 : la photo du plan vit sur le serveur ──');
/* Une photo de plan déposée s'écrit « piece:<64 hex> » là où son contenu n'est pas en mémoire. Le
   PDF la relit dans l'INSTANTANÉ, jamais dans la base ; s'il ne peut pas, rien ne part, et on dit
   pourquoi — un plan d'implantation sans son fond dirait « voici vos postes » sur une page blanche. */
{ const H = 'e'.repeat(64), IMGP = 'data:image/jpeg;base64,' + JPEG1;
  const avec = (etat) => { const W = monter(BASE); W.db.plansSite.cX[1].img = 'piece:' + H; W.db.plansSite.cX[1].imgEmp = 'emp-fixe'; if (etat) W.__pieces[H] = IMGP; return W; };
  { const W = avec(true); let vu = ''; W.__jpeg = (src) => { vu = src; return { b64: JPEG1, w: 1, h: 1 }; };
    const d = await W.papImplDocument('cX', W.db.interventions[1], W.papImplEtat('cX'));
    vrai('⛔ la photo relue du serveur part dans le PDF', !d.err && d.pdf && d.pdf.startsWith('%PDF'));
    v('   c\'est le CONTENU qui est converti, pas le marqueur', vu, IMGP);
    v('⛔ la base n\'a pas bougé (relue dans l\'instantané, pas dans db)', W.db.plansSite.cX[1].img, 'piece:' + H);
    v('   aucun save()', W.__saves, 0); }
  { const W = avec(false); let appele = 0; W.__jpeg = () => { appele++; return { b64: JPEG1, w: 1, h: 1 }; };
    const d = await W.papImplDocument('cX', W.db.interventions[1], W.papImplEtat('cX'));
    vrai('⛔ sans réseau : rien ne part, et le message dit pourquoi', /n’a pas pu être récupérée.*rien n’est parti/.test(d.err || ''), d.err);
    v('   et aucune conversion n\'a été tentée sur un marqueur', appele, 0);
    await W.papImplantationEnvoyer('cX', 'iB');
    v('   l\'envoi ne part pas, ne trace rien', [W.__mails.length, W.db.interventions[1].planEnvoi || null], [0, null]); }
  { const W = avec(false); W.__pieces = null;
    const r = { absente: true }; W.pieceLire = async () => r;
    const d = await W.papImplDocument('cX', W.db.interventions[1], W.papImplEtat('cX'));
    vrai('   une pièce effacée du serveur (404) le dit autrement : « reprends-la »', /n’est plus sur le serveur — reprends-la/.test(d.err || ''), d.err); }
  { const W = avec(true);
    v('⛔ l\'empreinte du plan tient à imgEmp, pas à la chaîne : déposé ou non, même état', W.papImplContenuPlan(W.db.plansSite.cX[1]).img, 'emp-fixe');
    W.db.plansSite.cX[1].img = 'piece:' + H + ':' + IMGP;
    v('   … contenu en mémoire ou non', W.papImplContenuPlan(W.db.plansSite.cX[1]).img, 'emp-fixe'); } }

console.log('── 792 · 10. la forme, là où l’exécution ne va pas ──');
{ vrai('la carte de l’onglet Plan passe par papImplCarteHtml', /if\(canEd\) h\+=papImplCarteHtml\(i\);/.test(SRC));
  vrai('l’ancien envoi « délivré une fois » n’existe plus', !/function papPrintImplantation\(/.test(SRC) && !/délivré une fois/.test(APP));
  vrai('papImplantationEnvoyer : la trace s’écrit APRÈS le résultat de srvMail', (() => { const c = corps('papImplantationEnvoyer'); const k = c.indexOf('const ok=await srvMail('); return k > 0 && c.indexOf('if(!ok) return;') > k && c.indexOf('pl.implantationEnvoyee=') > c.indexOf('if(!ok) return;'); })());
  vrai('srvMail : sansMailto rend false AVANT le lien mailto', (() => { const c = corps('srvMail'); const a = c.indexOf('if(opts&&opts.sansMailto) return false;'), b = c.indexOf("location.href='mailto:"); return a > 0 && b > a; })()); }

console.log(`\n════ test-792 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
