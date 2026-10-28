/* Outils de tests/test-3134.js (et de ses mutations) : monte les VRAIES fonctions d'app.html — la fabrique du PDF, l'en-tête,
   les montants et tout le bloc Factur-X — dans un bac à sable sans navigateur. Rien n'est recopié : si app.html change,
   le banc lit le nouveau texte. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');

/* Une déclaration de premier niveau, de son en-tête jusqu'à la fin de son bloc (on coupe avant la déclaration suivante,
   puis on recule jusqu'au dernier point où le texte se parse). */
function decoupe(h, src) { src = src || APP; const d = src.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{|\/\/ ⟦))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(src); const fin = m ? m.index : Math.min(src.length, d + 80000);
  let bout = src.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }

/* Tout le bloc Factur-X pur (de la banque de polices jusqu'aux gestes d'écran, exclus) : une seule tranche, contiguë. */
function blocFacturx() { const a = APP.indexOf('// ⟦FACTURX_POLICES:DEBUT⟧'), z = APP.indexOf('async function facturxPdfChaine(');
  if (a < 0 || z < a) throw new Error('bloc Factur-X introuvable'); return APP.slice(a, z); }

const FN = ['function socNom(', 'function rapportSociete(', 'function docEntete(', 'function docFranchiseTva(', 'function docCoordLignes(', 'function socStyle(', 'function entSocUnique(',
  'function entSocietes(', 'function entNom(', 'function bcEntete(', 'function bcCouleur(', 'function _pdfTranslit(', 'function _pdfTxt(', 'const _PDF_L=', 'function _pdfLarg(',
  'function docPdfStr(', 'function devisPdfStr(', 'function docTot(', 'const ligTotLigne=', 'const ligHT=', 'function factIsLate(', 'function cliAdresseDerive('];

const BASE_SANS_CLIENT = {
  entreprise: { nom: 'Nettoyage Excellence SARL', adresse: '1 rue de la Mairie', cp: '17000', ville: 'La Rochelle', siret: '73282932000074',
    tvaIntra: 'FR44732829320', iban: 'FR76 3000 6000 0112 3456 7890 189', bic: 'AGRIFRPP', tel: '0500000000', email: 'compta@excellence.example', logo: '', enteteBC: '' },
  societes: [], societesStyle: {}, interventions: [], devis: [], bons: [], fournisseurs: [] };

/* base : l'état de `db` ; options.maintenant : l'horloge ; options.xmldecl : si faux, ne charge pas le bloc Factur-X (pour mesurer l'avant). */
function monter(base, options) { options = options || {}; const SRC = options.app || APP;
  const W = { console, Object, JSON, String, Math, Date, Array, Number, Uint8Array, __html: '', unescape, encodeURIComponent, RegExp, Set, Map, Boolean, parseFloat, parseInt, isNaN,
    localStorage: { getItem: () => null }, atob: s => Buffer.from(s, 'base64').toString('latin1'), btoa: s => Buffer.from(s, 'latin1').toString('base64') };
  W.db = JSON.parse(JSON.stringify(base)); vm.createContext(W);
  const code = [decoupe('const REPORT_TEMPLATES =', SRC), decoupe('const isoDe =', SRC), ...FN.map(h => decoupe(h, SRC)),
    options.sansFacturx ? '' : blocFacturx(),
    `function todayISO(){ return '${options.aujourdhui || '2026-10-28'}'; } function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
     function eur(n){ return Number(n||0).toFixed(2)+' €'; } function encreSur(){ return '#fff'; } function toast(m){ __toasts.push(String(m)); } const __toasts=[];
     const DOC={devis:{coll:'devis',titre:'Devis',un:'devis',st:{}},factures:{coll:'factures',titre:'Facture',un:'facture',st:{}}};`].join('\n');
  vm.runInContext(code, W);
  return W; }

module.exports = { APP, decoupe, blocFacturx, monter, BASE_SANS_CLIENT, FN };
