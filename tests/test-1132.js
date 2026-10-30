/* ══ g10 · clients#5 (suite) — LA CARTE INTERVENTIONS COMPTE LES INTERVENTIONS, ET PROPOSE DE LOCALISER ═════
   Mesuré au navigateur : un client créé avec une adresse n'était pas localisé ; ses interventions du jour ne
   paraissaient donc pas sur la carte, le sous-titre annonçait « Tournée du 05 janv. · 0 intervention(s) » alors
   qu'une intervention existait, et le texte « Aucune intervention géolocalisée ce jour (le client doit avoir une
   adresse localisée) » promettait un geste qui n'existait pas sur cet écran (le bouton « localiser les clients »
   ne vivait que dans le Planning général).

   Ce banc EXÉCUTE la vraie `views.carteInt` (avec les vraies `intPoints`, `renderTournee`, `carteTechVisible`)
   et la vraie `geocodeClients`, dans un bac à sable sans carte (Leaflet refusé : seul le texte nous importe).
   Le bouton est lu dans le balisage rendu, son `onclick` ÉVALUÉ tel qu'écrit.                              */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1132 · 0. la population ──');
const CI = bloc('views.carteInt=function(){'),
  RT = bloc('async function renderTournee('), GC = bloc('async function geocodeClients(){'),
  TV = ligne('function carteTechVisible(i){'), TS = bloc('function carteTechSet(){'), ES = ligne('function emptyState(ico,txt,btn,fn){'), ESC = ligne('const esc = s =>'),
  AIDE = bloc('function carteIntBilan(');
vrai('les pièces sont trouvées', CI.length > 1500 && RT.length > 500 && GC.length > 200 && !!TV && TS.length > 100 && !!ES && !!ESC, [CI.length, RT.length, GC.length]);
v('⛔ une seule définition de views.carteInt et de geocodeClients', [SRC.split('views.carteInt=function(').length - 1, SRC.split('function geocodeClients(').length - 1], [1, 1]);
const INTP = SRC.slice(SRC.indexOf('function intPoints(day){'), SRC.indexOf('let carteTechM=null'));
vrai('intPoints est découpée', INTP.length > 150 && INTP.length < 800, INTP.length);

function monde(clients, ints, { crm = true } = {}) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, RegExp,
    db: { clients, interventions: ints, techniciens: [] }, currentUser: { id: 'u1', role: 'admin' }, current: 'carteInt',
    __sub: '', __actions: '', __els: {}, __toasts: [], __geo: [], __saves: 0, __vues: 0, __crm: crm, localStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(`${ESC.replace('const ', 'var ')}\nvar boxTxt = function (s) { return s; };\n${ES}\n${TV}\n${TS}\n${INTP}\n${AIDE}\n${RT}\n${GC}
    var carteIntDay='2099-01-05', showSecteurs=false, carteDDopen=false, carteTechM=null, _map=null;
    function $(id){ return __els[id]||(__els[id]={innerHTML:'',classList:{add(){},remove(){}},style:{}}); }
    var views={ carteInt: function(){ __vues++; return carteIntImpl(); }, carte(){} };
    function setHeader(t,s,a){ __sub=s; __actions=a||''; }
    function mapFondBarre(){ return ''; } function deptSectors(){ return []; } function carteFiltreBar(){ return ''; }
    function fmtShort(d){ return 'D'+d; } function todayISO(){ return '2099-01-05'; } function shiftDay(d){ return d; }
    function techColor(){ return '#000'; } function techName(){ return ''; } function techPuces(){ return ''; } function planTechsOf(p){ return p.techId?[p.techId]:[]; }
    function planCardColor(){ return '#000'; } function numIcon(){ return null; } function keyLabel(){ return ''; } function deptOf(){ return ''; }
    function visibleInts(l){ return l; } function badge(){ return ''; } var STATUT_INT={};
    function loadLeaflet(){ return Promise.reject(new Error('pas de carte dans le banc')); }
    function fitMapHeightInt(){} function loadDeptGeo(){ return Promise.reject(); } function encreSur(){ return '#fff'; } function gpsLinks(){ return ''; }
    function canCat(){ return __crm; } function permGarde(){ if(__crm) return true; __toasts.push('refusé'); return false; }
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; }
    function geocode(q){ __geo.push(q); return Promise.resolve({lat:46.16,lng:-1.15}); }
    var document={ addEventListener(){}, removeEventListener(){} };
    function setTimeout(f){ f(); }
    var carteIntImpl;
    ${CI.replace('views.carteInt=function(){', 'carteIntImpl=function(){')}`, ctx);
  return ctx;
}
const attendre = () => new Promise(r => setImmediate(() => setImmediate(r)));
const bouton = h => (h.match(/<button[^>]*onclick="([^"]*geocodeClients\(\)[^"]*)"[^>]*>/) || [])[1];

(async () => {
  console.log('\n── 1132 · 1. le scénario du testeur : un client avec adresse, jamais localisé, une intervention ce jour ──');
  { const W = monde([{ id: 'c1', nom: 'Gambetta SARL', adresse: '10 rue Gambetta 17000 La Rochelle' }], [{ id: 'i1', clientId: 'c1', date: '2099-01-05', heure: '09:00', titre: 'Dératisation', statut: 'planifiee' }]);
    W.views.carteInt(); await attendre();
    vrai('⛔ le sous-titre compte l’intervention réelle (plus « 0 intervention(s) »)', /· 1 intervention/.test(W.__sub) && !/· 0 intervention/.test(W.__sub), W.__sub);
    vrai('… et dit qu’elle n’a pas de position', /à localiser|sans position/.test(W.__sub), W.__sub);
    const b = bouton(W.__actions);
    vrai('⛔ un bouton Localiser est proposé dans l’en-tête', !!b, W.__actions);
    const t = W.__els.tournee.innerHTML;
    vrai('⛔ … et dans le message de la tournée (le texte promettait un geste qui n’existait pas)', !!bouton(t) && /sans position|pas encore localis/.test(t), t);
    vrai('… le message ne dit plus « aucune intervention » : il y en a une', !/Aucune intervention/.test(t), t);
    if (b) { await vm.runInContext(b.replace(/&quot;/g, '"').replace(/&#39;/g, "'"), W); await attendre(); }
    v('son clic (évalué tel qu’écrit) localise le client', [W.db.clients[0].lat, W.db.clients[0].lng], [46.16, -1.15]);
    vrai('… et la carte est redessinée sur la tournée', W.__vues >= 2, W.__vues);
    W.__els = {}; W.views.carteInt(); await attendre();
    vrai('… plus de bouton une fois localisé', !bouton(W.__actions) && !bouton(W.__els.tournee.innerHTML), W.__actions);
    vrai('… et le sous-titre ne parle plus de position manquante', !/à localiser|sans position/.test(W.__sub), W.__sub); }

  console.log('\n── 1132 · 2. contre-épreuves : localisé, sans intervention, sans adresse ──');
  { const W = monde([{ id: 'c1', nom: 'A', adresse: 'x', lat: 46, lng: -1 }], [{ id: 'i1', clientId: 'c1', date: '2099-01-05', heure: '09:00', titre: 'T', statut: 'planifiee' }]);
    W.views.carteInt(); await attendre();
    vrai('client localisé : une intervention, aucun bouton', /· 1 intervention/.test(W.__sub) && !bouton(W.__actions) && !/Aucune intervention/.test(W.__els.tournee.innerHTML), W.__sub); }
  { const W = monde([{ id: 'c1', nom: 'A', adresse: 'x', lat: 46, lng: -1 }], []);
    W.views.carteInt(); await attendre();
    vrai('aucune intervention ce jour : « 0 » est vrai, et le message le dit simplement', /· 0 intervention/.test(W.__sub) && /Aucune intervention ce jour/.test(W.__els.tournee.innerHTML) && !bouton(W.__actions), [W.__sub, W.__els.tournee.innerHTML]); }
  { const W = monde([{ id: 'c1', nom: 'Sans adresse' }], [{ id: 'i1', clientId: 'c1', date: '2099-01-05', heure: '09:00', titre: 'T', statut: 'planifiee' }]);
    W.views.carteInt(); await attendre();
    vrai('client sans adresse : rien à localiser, pas de bouton — mais on le dit', !bouton(W.__actions) && !bouton(W.__els.tournee.innerHTML) && /pas d.adresse|sans adresse/.test(W.__els.tournee.innerHTML), W.__els.tournee.innerHTML); }
  { const W = monde([{ id: 'c1', nom: 'A', adresse: '10 rue Gambetta 17000 La Rochelle' }], [{ id: 'i1', clientId: 'c1', date: '2098-12-31', heure: '09:00', titre: 'T', statut: 'planifiee' }]);
    W.views.carteInt(); await attendre();
    vrai('une intervention d’un autre jour n’est pas comptée', /· 0 intervention/.test(W.__sub) && !bouton(W.__actions), W.__sub); }

  console.log('\n── 1132 · 3. ⛔ les droits : localiser réécrit des fiches client ──');
  { const W = monde([{ id: 'c1', nom: 'A', adresse: '10 rue Gambetta 17000 La Rochelle' }], [{ id: 'i1', clientId: 'c1', date: '2099-01-05', heure: '09:00', titre: 'T', statut: 'planifiee' }], { crm: false });
    W.views.carteInt(); await attendre();
    vrai('sans le droit de modifier les clients, le bouton n’est pas proposé', !bouton(W.__actions) && !bouton(W.__els.tournee.innerHTML), W.__actions);
    await W.geocodeClients();
    v('… et la fonction elle-même refuse (première instruction) : aucun appel au géocodeur, aucune fiche réécrite', [W.__geo.length, W.db.clients[0].lat == null], [0, true]);
    vrai('geocodeClients lit la case avant toute écriture', /^async function geocodeClients\(\)\{ if\(!permGarde\('crm','modifier'/.test(GC), GC.slice(0, 120)); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
