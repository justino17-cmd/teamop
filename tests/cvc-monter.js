/* ══ L'ATELIER DES BANCS « CVC » — chauffage · climatisation · froid ═════════════════════════════
   Ce fichier n'est pas un banc (il ne s'appelle pas test-*.js) : il monte, dans un bac à sable, le VRAI bloc CVC
   d'app.html — tout ce qui se trouve entre le marqueur d'ouverture et celui de fermeture — avec des doubles pour ce
   qui touche l'écran, le réseau et les droits. Les bancs test-2895 et suivants s'en servent, et ils exécutent donc le
   fichier livré, pas une copie.
   ⛔ Le bloc est découpé sur ses deux MARQUEURS (des lignes de commentaire écrites exprès), jamais sur un nom de
   fonction : un motif qui vise un nom tombe sur le commentaire qui l'explique (CLAUDE.md, « un motif de banc doit viser
   du code »). Un marqueur introuvable fait JETER l'atelier — une tranche vide passerait au vert sur tout. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const DEBUT = '═══ CVC — LE PARC D\'APPAREILS', FIN = '═══ fin du bloc CVC ═══';
const i0 = APP.indexOf(DEBUT), i1 = APP.indexOf(FIN);
if (i0 < 0 || i1 < i0) throw new Error('bloc CVC introuvable dans app.html');
const BLOC = APP.slice(APP.lastIndexOf('\n', i0) + 1, APP.indexOf('\n', i1) + 1);
if (BLOC.length < 2000) throw new Error('bloc CVC trop court : ' + BLOC.length);

const cdc = x => JSON.parse(JSON.stringify(x));

/* Les VRAIES fonctions d'écriture PDF d'app.html (`_pdfTxt` écrit, `_pdfLarg` mesure) : le banc lit le PDF qu'elles produisent. */
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); const fin = m ? m.index : Math.min(APP.length, d + 80000);
  let bout = APP.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }
const PDF_FN = ['function _pdfTranslit(', 'function _pdfTxt(', 'const _PDF_L=', 'function _pdfLarg(', 'function _pdfCoupe(']
  .map(decoupe).join('\n');

/* opts : { db, metier, today, droits:{ 'crm.ajouter':false… }, clientsVisibles:[ids] , tous:true } */
function monter(opts) {
  const o = opts || {};
  const W = { console, Date, Math, JSON, Set, Map, Object, Array, String, Number, Promise, isNaN, parseInt, parseFloat, RegExp, Error,
    atob: s => Buffer.from(s, 'base64').toString('latin1'), btoa: s => Buffer.from(s, 'latin1').toString('base64'),
    __toasts: [], __saves: 0, __modals: [], __logs: [], __interForm: [], __fiches: [], __go: [], __droits: o.droits || {}, __metier: o.metier || 'chauffage',
    __today: o.today || '2026-10-23', __visibles: o.clientsVisibles || null, __n: 0, setTimeout: () => 0, __mails: [], __windows: [], __mailOk: true, __jpeg: o.jpeg || '', __pack: o.pack || { presta: [] }, __noPopup: false };
  W.db = cdc(o.db || { clients: [], interventions: [], appareils: [], contrats: [] });
  vm.createContext(W);
  vm.runInContext(`
    var currentUser={id:'u1',role:'admin',prenom:'Test',nom:'Admin'};
    function metierId(){ return __metier; } function todayISO(){ return __today; }
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function uid(){ return 'id'+(++__n); }
    function _fmt(iso,long){ if(!iso) return '—'; var p=String(iso).split('-'); return long?p[2]+'/'+p[1]+'/'+p[0]:p[2]+'/'+p[1]; }
    function fmtShort(iso){ return _fmt(iso,false); } function fmtLong(iso){ return _fmt(iso,true); }
    function docNomGarde(){ return true; } function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function logEvent(a,d){ __logs.push([a,d]); }
    function closeModal(){} function openModal(h){ __modals.push(h); } function go(v){ __go.push(v); }
    function ficheClient(id){ __fiches.push(id); } function champManque(m){ __toasts.push('CHAMP: '+m); } function champDe(f,n){ return f&&f.elements?f.elements[n]||null:null; }
    function clientName(id){ var c=(db.clients||[]).find(function(x){return x.id===id;}); return c?c.nom:''; }
    function canCat(g,d){ var k=g+'.'+d; return Object.prototype.hasOwnProperty.call(__droits,k)?!!__droits[k]:true; }
    function permGarde(g,d,q){ if(canCat(g,d)) return true; toast((d==='ajouter'?'Créer':'Modifier')+' '+q+' n\\'est pas autorisé pour ton compte (Permissions)'); return false; }
    function visibleClients(l){ return __visibles?(l||[]).filter(function(c){return __visibles.indexOf(c.id)>=0;}):(l||[]); }
    function visibleDocs(l){ return l||[]; }   /* volontairement SANS filtre : la visite d'un contrat doit se garder elle-même par le client qu'on voit */
    function ouvrables(){ var ids=new Set(visibleClients(db.clients||[]).map(function(c){return c.id;})); return {cli:function(c){return !!c&&ids.has(c.id);},int:function(i){return !!i;}}; }
    function intTypes(){ return ['Entretien annuel chaudière','Entretien pompe à chaleur','Entretien climatisation','Dépannage chauffage','Entretien chaudière fioul ou bois','Contrat d’entretien']; }
    function formIntervention(id,pre){ __interForm.push({id:id,pre:pre}); }
    function renderIntDetail(id){ __go.push('det:'+id); }
    function delItem(c,id){ __go.push('del:'+c+':'+id); }
    function confirm(m){ return true; }
    var document={getElementById:function(){return null;}};
    function intHisto(i,t){ (i.histo=i.histo||[]).push(t); } function fullName(u){ return ((u.prenom||'')+' '+(u.nom||'')).trim(); }
    function techNames(i){ return i.techNom||'Tom Sonde'; } function metierPack(){ return __pack; }
    function docEntete(m){ return {nom:'Alpha Chauffage',couleur:'#C0392B',logo:'',adresse:'2 quai Alpha'}; }
    function docCoordLignes(h){ return ['2 quai Alpha, 33000 Bordeaux','SIRET 222 222 222 00022 · Tél. 05 56 00 00 00']; }
    async function devisLogoJpeg(){ return null; }
    async function papImplJpeg(src,max,q){ return __jpeg?{b64:__jpeg,w:3,h:1}:null; }
    const PAP_IMPL_MAX_B64=5000000;
    async function srvMail(to,sub,body,okMsg,cat,box,opts){ __mails.push({to:to,sub:sub,body:body,opts:opts}); return __mailOk; }
    function intSocMailOpts(){ return {brandName:'Alpha Chauffage',societe:'Alpha Chauffage'}; }
    var window={open:function(){ var w={ecrit:'',location:{href:''},document:{write:function(t){w.ecrit+=t;},close:function(){}},close:function(){ w.ferme=true; }}; __windows.push(w); return __windows.length&&!__noPopup?w:null; }};
    /* v780 : la fenêtre PDF commune (pdfFeuille, une couche du DOM) — ici on retient ce qu'elle reçoit et ce que sa fabrique rend. */
    var __feuilles=[]; function pdfFeuille(o){ var f={o:o,d:null}; __feuilles.push(f); return Promise.resolve(o.fabrique()).then(function(d){ f.d=d; if(d&&d.err){ toast('⚠️ '+d.err); if(o.siErreur) o.siErreur(d); } else if(d&&d.manque&&d.manque.length) toast('⚠️ Non jointe au PDF : '+d.manque.join(', ')); }); }
    var URL={createObjectURL:function(b){ return 'blob:test'; },revokeObjectURL:function(){}}; var Blob=function(a,o){ this.parts=a; this.type=o&&o.type; };
    var navigator={};
  `, W);
  vm.runInContext(PDF_FN, W);
  vm.runInContext(BLOC, W);
  return W;
}
/* Un formulaire factice : elements[nom] = {value, checked} */
function formulaire(vals) {
  const els = {};
  Object.keys(vals).forEach(k => { const v = vals[k]; els[k] = (typeof v === 'boolean') ? { checked: v, value: v ? 'on' : '' } : { value: String(v) }; });
  return { elements: els };
}
/* lire un PDF écrit à la main : structure, pages, images, texte dessiné (police, taille, position) */
function lirePdf(pdf) {
  const r = { pb: [] };
  if (!pdf.startsWith('%PDF-1.4\n')) r.pb.push('en-tête');
  const sx = /startxref\n(\d+)\n%%EOF$/.exec(pdf); if (!sx) { r.pb.push('startxref'); return r; }
  const xr = +sx[1]; if (pdf.slice(xr, xr + 5) !== 'xref\n') r.pb.push('startxref ne pointe pas sur la table');
  const n = +(/xref\n0 (\d+)\n/.exec(pdf.slice(xr)) || [])[1];
  const ent = pdf.slice(xr).split('\n').slice(2, 2 + n);
  for (let k = 1; k < n; k++) { const off = parseInt(ent[k], 10); if (pdf.slice(off, off + String(k).length + 6) !== k + ' 0 obj') r.pb.push('objet ' + k + ' mal placé'); }
  r.pages = +(/\/Type \/Pages \/Kids \[[^\]]*\] \/Count (\d+)/.exec(pdf) || [])[1];
  r.images = (pdf.match(/\/Subtype \/Image/g) || []).length;
  r.textes = []; const reT = /\/F([12]) ([\d.]+) Tf\n([\d.-]+) ([\d.-]+) Td\n\(((?:\\.|[^\\)])*)\) Tj/g; let m;
  while ((m = reT.exec(pdf))) r.textes.push({ gras: m[1] === '2', sz: +m[2], x: +m[3], y: +m[4], t: m[5].replace(/\\(.)/g, '$1') });
  const WA = { 128: '\u20AC', 133: '\u2026', 140: '\u0152', 145: '\u2018', 146: '\u2019', 147: '\u201C', 148: '\u201D', 149: '\u2022', 150: '\u2013', 151: '\u2014', 153: '\u2122', 156: '\u0153' };
  r.textes.forEach(t => { t.u = t.t.replace(/[\x80-\x9F]/g, ch => WA[ch.charCodeAt(0)] || ch); });
  return r; }
module.exports = { monter, formulaire, BLOC, APP, cdc, lirePdf };
