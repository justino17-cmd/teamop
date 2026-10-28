/* ══ BAC À SABLE COMMUN DES BANCS DU LOT « CLÔTURER UNE INTERVENTION » (tests 1180 à 1185) ══════════════
   Ce fichier n'est PAS une suite (son nom ne commence pas par « test- » : bancs-ci.sh ne le lance pas).
   Il extrait d'app.html les VRAIES fonctions de la chaîne intervention → facture → registre et les monte dans
   un bac à sable, avec des doubles pour ce qui touche l'écran, le réseau et le stockage.

   ⛔ Les fonctions sont cherchées par leur NOM dans le fichier dont les commentaires sont retirés (seuls
   les blocs qui COMMENCENT une ligne : CLAUDE.md, « le nettoyage naïf avale du code »). Un nom absent est
   simplement sauté : le même bac à sable sert avant et après le correctif (il doit TOMBER avant).
   ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i + debut.length - 1), prof = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k];
    if (c === '{') prof++; else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const fonction = nom => bloc('function ' + nom + '(');

/* comptable (28 octobre 2026) : la synchro lit `docEmis` (facture émise = jamais réécrite), `factureTauxPropre`, `factureEmiseSignale` et le réglage `factAutoActif` */
const FONCTIONS = ['factureDeIntervention', 'intTvaFacture', 'intMontantHT', 'docEmis', 'factureTauxPropre', 'factureEmiseSignale', 'factAutoActif', 'syncFactureFromIntervention', 'factureAutoIntervention', 'factureMailPayee',
  'intRegistreEncaisse', 'factureAFacturer', 'interAFacturer', 'regAdd', 'regDeLInter', 'regModeDe', 'docTot', 'intRecaleAuJourFait',
  'intRecaleDefaire', 'intHisto', 'intTechIds', 'intStatutPermis', 'saveRapport', 'assistFinish', 'assistCloture', 'asKeepSigs', 'intSetStatutDo',
  'intEffToggle', 'intTerminerPrevu', 'intGenererDoc', 'intInfOf', 'intEffectuer', 'formRapport', 'intRepasseNonTerminee', 'intInfestationConstat',
  'interReglee', 'interDejaRegle', 'intMoyenPaiementOptions', 'saveIntervention', 'facturesAEditer',
  /* assistCloture garde l'empreinte de son ouverture (« Fermer » sait s'il y a une saisie à perdre) depuis un autre lot : les vraies, pas un double */
  'asEmpreinte', 'asSigsVives', 'assistModifie'];
const CODE = FONCTIONS.map(fonction).filter(Boolean).join('\n');
const CONSTS = ['const ligTotLigne=', 'const ligHT=', 'const MOYENS_PAIEMENT =', 'const esc =', 'var _factureEmiseDite='].map(ligne).join('\n');

/* opts : { db, moi, droits:{ 'int.modifier':false, … }, voit:{ factures:false }, moiTech } */
function monde(opts) {
  const o = opts || {};
  const ctx = { console, Date, Math, JSON, Set, Map, Object, Array, String, Number, Promise, RegExp, setTimeout: f => f(),
    db: o.db || { factAuto: true /* comptable, 28 oct. 2026 : l'envoi automatique est un CHOIX (`factAuto===true`) — ces bancs jouent l'entreprise qui l'a activé ; test-3150 joue celle qui ne l'a pas fait */, interventions: [], factures: [], registres: [], clients: [{ id: 'cl1', nom: 'Boulangerie Dupont', email: 'dupont@example.org' }], devis: [], users: [], techniciens: [] },
    currentUser: o.moi || { id: 'uA', role: 'admin', prenom: 'Justin', nom: 'Roux' },
    __toasts: [], __mails: [], __saves: 0, __modals: 0, __go: [], __rendus: [], __docsOuverts: [],
    __droits: o.droits || {}, __voit: o.voit || {}, __moiTech: o.moiTech || '', __cadence: 0 };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(`
    ${CONSTS}
    var rapConstat={indices:[]}, rapPresta=new Set(), rapTraitement={}, intNuis=new Set(), intTrait={}, intMeth=new Set(), rapPhotos=[], rapTags=[], rapChamps=[], rapTpe='';
    var asW=null, _gpsAway={}, current='interventions', factFilter='tous';
    var _intReport=null;   // posé par formIntervention (lot g09 : ce qu'une duplication reporte) et relu par saveIntervention — le bac à sable doit le connaître
    var STATUT_INT={aplanifier:{l:'À planifier'},planifiee:{l:'Planifiée'},encours:{l:'En cours'},terminee:{l:'Terminée'},annulee:{l:'Annulée'}};
    function toast(m){ __toasts.push(String(m)); } function champManque(m){ toast(m); return false; } function champDe(f,n){ return f&&f.elements?f.elements[n]||null:null; } /* champManque (audit apple-design, point 33) : ici, son message seul — test-2850 éprouve le reste */
    function save(){ __saves++; }
    function logEvent(){} function closeModal(){} function openModal(){ __modals++; } function go(v){ __go.push(v); }
    function renderIntDetail(id){ __rendus.push(id); }
    function clotureSuiteModal(){} function notifyTechNewInt(){} function assistRender(){}
    function formDoc(k,id){ __docsOuverts.push(['formDoc',k,id]); } function printDoc(k,id){ __docsOuverts.push(['printDoc',k,id]); }
    function $(){ return null; }
    function FormData(t){ return Object.entries(t.__data); }
    function can(k){ return __droits['can.'+k]!==false; }
    function canCat(g,d){ return __droits[g+'.'+d]!==false; }
    function permGarde(g,d,q){ if(canCat(g,d)) return true; toast((d==='ajouter'?'Créer':'Modifier')+' '+q+' n\\'est pas autorisé pour ton compte (Permissions)'); return false; }
    function userSeesModule(u,k){ return __voit[k]!==false; }
    function myTechId(){ return __moiTech||null; }
    var fullName=u=>((u&&u.prenom)||'')+' '+((u&&u.nom)||'');
    var uid=(function(){ var n=0; return function(){ return 'id'+(++n); }; })();
    function todayISO(){ return new Date(Date.now()).toLocaleDateString('sv-SE'); }
    function fmtShort(iso){ return iso||'—'; }
    function eur(n){ return (Number(n)||0).toFixed(2)+' €'; }
    function clientName(id){ return ((db.clients||[]).find(c=>c.id===id)||{}).nom||'—'; }
    function techName(id){ return id||''; }
    function docNum(kind){ var p=kind==='devis'?'DEV':'FAC'; return p+'-2026-'+String((db[kind]||[]).length+1).padStart(3,'0'); }
    function intRecurNext(){ return ''; }
    function rapportSociete(){ return 'Entreprise'; } function docMailOpts(){ return undefined; }
    async function docPdfChaine(){ return ''; }
    async function srvMail(to,sujet,corps){ __mails.push({to,sujet,corps}); return true; }
    function regMigration(){}
    function produit(id){ return (db.produits||[]).find(p=>p.id===id)||{}; }
    function prodLineUnit(l){ return l.unite||'u'; } function stockConv(q){ return q; }
    function intNum(){ return 'INT-2026-001'; }
    var document={querySelectorAll:()=>[],getElementById:()=>null}; var ABS_TYPES={};
    function techForClient(){ return null; } function absentOn(){ return null; } function planStamp(){} function intConflictOf(){ return null; }
    function keyForClient(){ return ''; } function techForKey(){ return null; } function keyLabel(){ return ''; } function toMin(h){ var a=String(h||'').split(':'); return (+a[0]||0)*60+(+a[1]||0); }
    ${CODE}
  `, ctx);
  ctx.exec = code => vm.runInContext(code, ctx);
  return ctx;
}
/* laisse partir les promesses (courriel de facture) */
const attendre = () => new Promise(r => setTimeout(r, 15));

/* une intervention « normale » : 33,50 € encaissés en espèces (le cas du rapport du testeur) */
function interv(extra) {
  return Object.assign({ id: 'i1', num: 'INT-2026-001', titre: 'Dératisation', clientId: 'cl1', date: '2026-10-16', heure: '09:00', duree: 60,
    statut: 'planifiee', montant: 33.5, moyenPaiement: 'C) Espèces', techId: 'tK', techIds: ['tK'], constat: {}, histo: [] }, extra || {});
}
/* les compteurs qui disent « une intervention = une facture = une ligne de registre » */
function etat(W, id) {
  id = id || 'i1';
  const liees = W.db.factures.filter(f => f.interventionId === id || f.interId === id || (f.interIds || []).includes(id));
  return { nbFactures: W.db.factures.length, liees: liees.length, statuts: W.db.factures.map(f => f.statut),
    ttc: W.db.factures.map(f => Math.round(W.docTot(f).ttc * 100) / 100), lignes: (W.db.registres || []).filter(l => l.interId === id).length,
    factureIds: (W.db.registres || []).filter(l => l.interId === id).map(l => l.factureId) };
}

/* ── le petit cadre de sortie commun ── */
function cadre(titre) {
  let ok = 0, ko = 0;
  const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
  const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
  const fin = () => { console.log('\n════ ' + titre + ' : ' + ok + ' ✓  ' + ko + ' ✗ ════'); process.exit(ko ? 1 : 0); };
  return { vrai, v, fin };
}

module.exports = { SRC, BRUT, bloc, ligne, fonction, monde, attendre, interv, etat, cadre };
