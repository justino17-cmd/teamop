/* ══ L'ATELIER DES BANCS « NETTOYAGE » — cahier des tâches · contrôle qualité · plan de prévention ═══════════════════════════════
   Ce fichier n'est pas un banc (il ne s'appelle pas test-*.js) : il monte, dans un bac à sable, le VRAI bloc NETTOYAGE d'app.html — tout ce qui se trouve
   entre le marqueur d'ouverture et celui de fermeture — avec des doubles pour ce qui touche l'écran, le réseau et les droits. Les bancs test-3111 et suivants
   s'en servent : ils exécutent donc le fichier livré, pas une copie. Même méthode que `cvc-monter.js`.
   ⛔ Le bloc est découpé sur ses deux MARQUEURS (des lignes de commentaire écrites exprès), jamais sur un nom de fonction. Un marqueur introuvable fait JETER
   l'atelier — une tranche vide passerait au vert sur tout. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const { lirePdf, formulaire } = require('./cvc-monter.js');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const DEBUT = '═══ NETTOYAGE — LES SITES D\'UN CLIENT', FIN = '═══ fin du bloc NETTOYAGE ═══';
const SRC_BLOC = process.env.NETT_BLOC ? fs.readFileSync(process.env.NETT_BLOC, 'utf8') : APP;   // BANC_NETT_BLOC : une copie du bloc, pour l'éprouver avant de la poser
const i0 = SRC_BLOC.indexOf(DEBUT), i1 = SRC_BLOC.indexOf(FIN);
if (i0 < 0 || i1 < i0) throw new Error('bloc NETTOYAGE introuvable dans app.html');
const BLOC = SRC_BLOC.slice(SRC_BLOC.lastIndexOf('\n', i0) + 1, SRC_BLOC.indexOf('\n', i1) + 1);
if (BLOC.length < 20000) throw new Error('bloc NETTOYAGE trop court : ' + BLOC.length);
const cdc = x => JSON.parse(JSON.stringify(x));

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

/* opts : { db, metier, today, droits:{ 'crm.ajouter':false… }, clientsVisibles:[ids], techs:{intId:n}, socs:{ nom:{…} } } */
function monter(opts) {
  const o = opts || {};
  const W = { console, Date, Math, JSON, Set, Map, Object, Array, String, Number, Promise, isNaN, parseInt, parseFloat, RegExp, Error,
    atob: s => Buffer.from(s, 'base64').toString('latin1'), btoa: s => Buffer.from(s, 'latin1').toString('base64'),
    __toasts: [], __saves: 0, __modals: [], __logs: [], __fiches: [], __go: [], __droits: o.droits || {}, __metier: o.metier || 'nettoyage',
    __today: o.today || '2026-10-28', __visibles: o.clientsVisibles || null, __n: 0, setTimeout: () => 0, __mails: [], __windows: [], __mailOk: true,
    __forms: {}, __els: {}, __pack: o.pack || { presta: ['Aspiration des sols', 'Lavage des sols'] }, __noPopup: false, __confirm: true, __techs: o.techs || {},
    __logoOk: o.logo !== false, __entete: o.entete || { nom: 'Éclat Propreté', couleur: '#1E7A4E', logo: '', adresse: '4 rue du Port', cp: '17000', ville: 'La Rochelle', siret: '123 456 789 00012', tel: '05 46 00 00 00', email: 'contact@eclat.test' } };
  W.db = cdc(o.db || { clients: [], interventions: [], contrats: [], cahiers: [], plansPrevention: [] });
  vm.createContext(W);
  vm.runInContext(`
    var currentUser={id:'u1',role:'admin',prenom:'Test',nom:'Admin'};
    function metierId(){ return __metier; } function todayISO(){ return __today; }
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function uid(){ return 'id'+(++__n); }
    function _fmt(iso,long){ if(!iso) return '—'; var p=String(iso).split('-'); return long?p[2]+'/'+p[1]+'/'+p[0]:p[2]+'/'+p[1]; }
    function fmtShort(iso){ return _fmt(iso,false); } function fmtLong(iso){ return _fmt(iso,true); }
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function logEvent(a,d){ __logs.push([a,d]); }
    function closeModal(){} function openModal(h){ __modals.push(h); } function go(v){ __go.push(v); }
    function ficheClient(id){ __fiches.push(id); } function renderIntDetail(id){ __go.push('det:'+id); }
    function clientName(id){ var c=(db.clients||[]).find(function(x){return x.id===id;}); return c?c.nom:''; }
    function canCat(g,d){ var k=g+'.'+d; return Object.prototype.hasOwnProperty.call(__droits,k)?!!__droits[k]:true; }
    function permGarde(g,d,q){ if(canCat(g,d)) return true; toast((d==='ajouter'?'Créer':'Modifier')+' '+q+' n\\'est pas autorisé pour ton compte (Permissions)'); return false; }
    function ouvrables(){ var ids=__visibles?__visibles:(db.clients||[]).map(function(c){return c.id;}); return {cli:function(c){return !!c&&ids.indexOf(c.id)>=0;},int:function(i){return !!i&&ids.indexOf(i.clientId)>=0;}}; }
    function confirm(m){ return __confirm; }
    var document={getElementById:function(id){ return __forms[id]||__els[id]||null; }};
    function intHisto(i,t){ (i.histo=i.histo||[]).push(t); } function fullName(u){ return ((u.prenom||'')+' '+(u.nom||'')).trim(); }
    function intTechIds(i){ var n=__techs[i.id]||0, a=[]; for(var k=0;k<n;k++) a.push('t'+k); return a; }
    function rapportDuree(i){ var r=parseInt(i&&i.dureeReelle,10); return r>0?r:(parseInt(i&&i.duree,10)||0); }
    function addMin(h,m){ var p=h.split(':'), t=(+p[0])*60+(+p[1])+m; return String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0'); }
    function metierPack(){ return __pack; }
    function socDuClient(cid){ var c=(db.clients||[]).find(function(x){return x.id===cid;}); return (c&&c.soc)||''; }
    function docEntete(m){ var e=Object.assign({},__entete); if(m&&__entete.societes&&__entete.societes[m]) e=Object.assign(e,__entete.societes[m]); e.societe=m||''; return e; }
    function docCoordLignes(h){ return [[h.adresse,[h.cp,h.ville].filter(Boolean).join(' ')].filter(Boolean).join(', '),[h.tel?'Tél. '+h.tel:'',h.email||''].filter(Boolean).join('  ·  '),[h.siret?'SIRET '+h.siret:''].filter(Boolean).join('  ·  ')].filter(Boolean); }
    async function devisLogoJpeg(){ return __logoOk?null:null; }
    const PAP_IMPL_MAX_B64=5000000;
    function docMailOpts(m){ return m?{brandName:m,societe:m}:undefined; }
    async function srvMail(to,sub,body,okMsg,cat,box,opts){ __mails.push({to:to,sub:sub,body:body,opts:opts}); return __mailOk; }
    var window={open:function(){ var w={ecrit:'',location:{href:''},document:{write:function(t){w.ecrit+=t;},close:function(){}},close:function(){ w.ferme=true; }}; __windows.push(w); return __noPopup?null:w; }};
    var URL={createObjectURL:function(b){ return 'blob:test'; },revokeObjectURL:function(){}}; var Blob=function(a,o){ this.parts=a; this.type=o&&o.type; };
  `, W);
  vm.runInContext(PDF_FN, W);
  /* les `let` de premier niveau (la fenêtre de travail d'un formulaire) deviennent `var` : le banc doit pouvoir les lire et les poser, un `let` ne vit pas sur l'objet global */
  vm.runInContext(BLOC.replace(/^let /gm, 'var '), W);
  return W;
}
/* le texte du PDF, ligne par ligne, tel que l'écrit _pdfTxt */
function texte(pdf) { return lirePdf(pdf).textes.map(t => t.u); }
module.exports = { monter, formulaire, BLOC, APP, cdc, lirePdf, texte };
