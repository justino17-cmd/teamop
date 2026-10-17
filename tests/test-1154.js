/* ══ g16 · accueil#12 (2e passe) — LES LIBELLÉS QUI PORTENT UN NOMBRE, LES FENÊTRES SUR <body>, LES DATES D'ÉCRAN ══
   La première passe (test-1153) a traduit les libellés ENTIERS d'un nœud. La relecture a montré ce qu'elle laissait en
   français sur les quatre écrans, en English comme en Español :
   · les titres de la fenêtre de détail du tableau de bord, qui portent un nombre (« 3 interventions sur la période »,
     « 2 absents sur la période », « 4h de travail prévu ») — le dictionnaire compare le texte entier d'un nœud ;
   · cette fenêtre elle-même : posée sur <body>, elle n'est pas dans celles que l'observateur de langue suit, donc AUCUN de
     ses textes (boutons « Ouvrir les absences », « Rien à afficher… », « jusqu'à N j ») n'était traduit ;
   · la grille du planning (« SAM 17 », « 2 à répartir », « libre », « + 3 autres ») ;
   · Archives (« Interventions du mois (N) », « octobre 2026 », les dates des lignes) ;
   · Historique (« Afficher la suite · N évènement(s) plus anciens », l'heure de chaque ligne, les actions les plus courantes).

   La parade : composer ces libellés par `nbT` (on traduit le MOT, le nombre reste), traduire la fenêtre une fois posée
   (`translateNode`), et donner aux dates D'ÉCRAN leur langue (`fmtLongEcran`…) sans toucher à `fmtLong`/`fmtShort`/`fmtTs`,
   qui écrivent aussi les documents d'un client. En français, rien ne change — sinon la forme « évènement(s) plus anciens »,
   devenue « 1 évènement plus ancien » / « N évènements plus anciens » parce qu'un mot se traduit au singulier ou au pluriel.

   Ce banc EXÉCUTE les vraies `tdbDetail`, `tdbPlanning`, `views.archives` et `journalView` dans les trois langues, et
   émule l'observateur de langue en traduisant chaque texte de nœud par le vrai dictionnaire (comme `translateNode`).
   Il exige : le français inchangé, et aucun fragment français sur l'écran en en/es. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 500) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const tranche = (a, b) => { const i = SRC.indexOf(a); if (i < 0) return ''; const j = SRC.indexOf(b, i); return j < 0 ? '' : SRC.slice(i, j); };

console.log('\n── 1154 · 0. la population ──');
const iDico = SRC.indexOf('const I18N={'), iFin = SRC.indexOf('function t(s){', iDico);
const DICO = iDico < 0 || iFin < 0 ? '' : SRC.slice(iDico, iFin);
const P = {
  t: ligne('function t(s){'), nbT: ligne('function nbT('), ecranLoc: ligne('function ecranLoc('),
  fmtLongEcran: ligne('function fmtLongEcran('), fmtShortEcran: ligne('function fmtShortEcran('), fmtTsEcran: ligne('function fmtTsEcran('),
  moisEcran: ligne('function moisEcran('), fmtHmin: ligne('function fmtHmin('),
  fmtLong: ligne('function fmtLong('), fmtShort: ligne('function fmtShort('), fmtTs: bloc('function fmtTs('),
  fmt: tranche('const _FMT={};', 'const _fd='), fd: ligne('const _fd='),
  dDetail: bloc('function tdbDetail('), dPlan: bloc('function tdbPlanning('), arch: bloc('views.archives=function('), journal: bloc('function journalView('),
  esc: ligne('const esc = s =>'), ico: ligne('const TYPE_ICO='), lbl: ligne('const TYPE_LBL='), statut: ligne('const STATUT_INT ='), badge: ligne('const badge = '),
};
for (const [k, s] of Object.entries(P)) vrai('la pièce « ' + k + ' » est trouvée', s.length > 20, k);
v('une seule définition de nbT et de moisEcran', [SRC.split('function nbT(').length - 1, SRC.split('function moisEcran(').length - 1], [1, 1]);

/* Un monde : les vraies fonctions, tout le reste en bouchons fidèles. */
function monde(lang) {
  const tr = { html: '' };
  const det = { f: null }, contenu = { html: '' }, appels = { translateNode: 0 };
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, parseInt, Intl, __lang: lang, __det: det, __contenu: contenu, __appels: appels };
  vm.createContext(ctx);
  vm.runInContext(`
    ${DICO.replace('const I18N=', 'var I18N=')}
    function getLang(){ return __lang; }
    ${P.t}\n${P.nbT}\n${P.ecranLoc}\n${P.fmt}\n${P.fd}\n${P.fmtLong}\n${P.fmtShort}\n${P.fmtTs}\n${P.fmtLongEcran}\n${P.fmtShortEcran}\n${P.fmtTsEcran}\n${P.moisEcran}\n${P.fmtHmin}
    ${P.esc}\n${P.ico.replace('const ', 'var ')}\n${P.lbl.replace('const ', 'var ')}\n${P.statut.replace('const ', 'var ')}\n${P.badge.replace('const ', 'var ')}
    var INT_STCOLOR={}, histFilter='all', _histMax=5, _histVue='', HIST_PAS=5, current='historique', archMonth='2026-10';
    function emptyState(a,txt){ return '<p>'+txt+'</p>'; }
    function setHeader(){}
    /* l'observateur de langue, tel que translateNode : le texte ENTIER d'un nœud, ou le texte après un symbole */
    function trad(html){ return html.replace(/>([^<>]+)</g,function(m,x){ var k=x.trim(); if(!k) return m; var d=I18N[__lang]; if(!d||__lang==='fr') return m;
      if(d[k]!=null&&d[k]!==k) return '>'+x.replace(k,d[k])+'<';
      var q=k.match(/^([^\\p{L}\\p{N}]+)\\s*(.+)$/u); if(q&&d[q[2]]!=null&&d[q[2]]!==q[2]) return '>'+x.replace(q[2],d[q[2]])+'<'; return m; }); }
    function translateNode(f){ __appels.translateNode++; f.innerHTML=trad(f.innerHTML); }
    var __f=null;
    var document={ createElement:function(){ return { id:'', className:'', innerHTML:'', addEventListener:function(){}, remove:function(){ __f=null; } }; },
      getElementById:function(id){ return id==='td-det'?__f:null; }, body:{ appendChild:function(f){ __f=f; __det.f=f; } } };
    var window={ addEventListener:function(){}, removeEventListener:function(){} };
    function $(id){ return id==='content' ? { set innerHTML(h){ __contenu.html=trad(h); }, get innerHTML(){ return __contenu.html; } } : { set textContent(x){}, set innerHTML(x){} }; }
    var TOD='2026-10-14';
    function todayISO(){ return TOD; }
    function isoDe(d){ return d.toLocaleDateString('sv-SE'); }
    function shiftDay(iso,n){ var d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n); return d.toLocaleDateString('sv-SE'); }
    var db={ techniciens:[{id:'t1',nom:'Karim Benali'}], clients:[{id:'c1',nom:'Cl',ville:'Lyon'}], absences:[{id:'a1',techId:'t1',type:'conges',du:'2026-10-14',au:'2026-10-16',statut:'validee'}],
      interventions:[
        {id:'i1',titre:'Dératisation',date:'2026-10-14',heure:'09:00',statut:'planifiee',duree:90,clientId:'c1',techId:'t1'},
        {id:'i2',titre:'Nettoyage',date:'2026-10-15',heure:'10:00',statut:'planifiee',duree:60,clientId:'c1'},
        {id:'i3',titre:'Désinsectisation',date:'',statut:'aplanifier',duree:30,clientId:'c1'},
        {id:'i4',titre:'Retard',date:'2026-10-10',heure:'08:00',statut:'planifiee',duree:60,clientId:'c1',techId:'t1'},
        {id:'i5',titre:'Autre',date:'2026-10-16',heure:'08:00',statut:'planifiee',duree:60,clientId:'c1'},
        {id:'i6',titre:'Autre2',date:'2026-10-16',heure:'09:00',statut:'planifiee',duree:60,clientId:'c1'},
        {id:'i7',titre:'Autre3',date:'2026-10-16',heure:'10:00',statut:'planifiee',duree:60,clientId:'c1'},
        {id:'i8',titre:'Autre4',date:'2026-10-16',heure:'11:00',statut:'planifiee',duree:60,clientId:'c1'},
        {id:'i9',titre:'Autre5',date:'2026-10-16',heure:'12:00',statut:'planifiee',duree:60,clientId:'c1'},
        {id:'i10',titre:'Autre6',date:'2026-10-16',heure:'13:00',statut:'planifiee',duree:60,clientId:'c1'}],
      journal:[{id:'j1',ts:1760000000000,userId:'u',userNom:'X',action:'Connexion',detail:'d',type:'auth'},{id:'j2',ts:1759990000000,userId:'u',userNom:'X',action:'Facture payée',detail:'d',type:'finance'}],
      factures:[], demandes:[], pointages:[], users:[] };
    var currentUser={id:'u'};
    function tdbJours(){ return ['2026-10-14','2026-10-15','2026-10-16']; }
    function can(){ return true; }
    function myTechId(){ return 't1'; }
    function visibleInts(l){ return l; }
    function visibleJournal(l){ return l; }
    function planTechsOf(i){ return i.techId?[i.techId]:[]; }
    function intTechIds(i){ return i.techId?[i.techId]:[]; }
    function planIntDe(i,id){ var t=planTechsOf(i); return id?t.indexOf(id)>=0:!t.length; }
    function planAutres(){ return []; } function planPileAutres(){ return ''; } function planCouleurDans(){ return '#000'; }
    function techColor(){ return '#111'; } function techName(id){ return id==='t1'?'Karim Benali':''; } function initials(n){ return String(n).slice(0,2); }
    function clientName(id){ return 'Client '+id; } function tdbActs(){ return []; } function actAll(){ return []; } function actTitre(){ return ''; }
    function tdbAbsences(){ return db.absences; } function absValidee(){ return true; }
    function absInfo(){ return { l:'Congés', c:'#900' }; } function absJoursOuvres(){ return 3; } function absNb(n){ return String(n); }
    function tdbRetards(){ return db.interventions.filter(function(i){ return i.date && i.date<TOD; }); }
    function tdbPortee(){ return '7'; } function toutVoir(){ return true; }
    function techPuces(){ return ''; } function dureeStr(m){ return m+' min'; } function eur(x){ return x+' €'; }
    function docTot(){ return {ttc:0}; } function ymOfX(){ return ''; }
    function archStats(ym){ return { ints:db.interventions.slice(0,2), facts:[], caPaye:0, caTot:0, dem:[], pts:[], minTot:0 }; }
    var DASH_CARDS={}; function journalAuteur(j){ return j.userNom; } function tdbDetailEchap(){} function tdbDetailFerme(){}
    ${P.dDetail}\n${P.dPlan}\n${P.journal}\n var views={}; views.archives=${P.arch.replace(/^views\.archives=/, '')};
  `, ctx);
  return ctx;
}
/* le français qui ne doit plus rester à l'écran en en/es (les DONNÉES — noms de clients, titres — sont écrites sans ces mots) */
const FR = /quand sa date|Touche une ligne|Une intervention est|sur la période|travail prévu|à planifier|à répartir|en retard|Ouvrir |Rien à afficher|jours? ouvr|jours? de retard|jusqu'à|\bdont\b|d’activités|plus anciens?|Afficher la suite|Interventions du mois|\blibre\b|\b(DIM|LUN|MAR|MER|JEU|VEN|SAM)\b|\bautres?\b|octobre|Aucune intervention|Non assigné|Équipe|Facture payée|\bdu\b|\bau\b/;
const texte = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');

console.log('\n── 1. le français ne bouge pas (hormis le pluriel de « évènement ») ──');
try {
  const m = monde('fr');
  const T = k => { m.tdbDetail(k); const h = m.__det.f.innerHTML; return texte(h); };
  vrai('détail « int » en français : « 3 interventions sur la période » ou la forme de la donnée', /\d+ interventions? sur la période/.test(T('int')), T('int').slice(0, 120));
  vrai('détail « abs » : « 1 absent sur la période »', /1 absent sur la période/.test(T('abs')), T('abs').slice(0, 120));
  vrai('détail « temps » : « … de travail prévu »', /\d+h\d* de travail prévu/.test(T('temps')), T('temps').slice(0, 100));
  vrai('détail « plan » : « 1 intervention à planifier »', /1 intervention à planifier/.test(T('plan')), T('plan').slice(0, 100));
  vrai('détail « retard » : « N interventions en retard », « N jours de retard », « jusqu\'à N j »', /interventions? en retard/.test(T('retard')) && /jours? de retard/.test(T('retard')) && /jusqu'à \d+ j/.test(T('retard')), T('retard').slice(0, 300));
  m.journalView('Historique', '');   // la première ouverture pose la tranche (HIST_PAS) ; on la réduit ensuite pour voir « Afficher la suite »
  vm.runInContext('_histMax=1', m);
  m.journalView('Historique', '');
  vrai('Historique en français : « Afficher la suite · 1 évènement plus ancien »', /Afficher la suite · 1 évènement plus ancien/.test(texte(m.__contenu.html)), texte(m.__contenu.html).slice(-150));
  m.views.archives();
  vrai('Archives en français : « Interventions du mois (2) » et « octobre 2026 »', /Interventions du mois \(2\)/.test(texte(m.__contenu.html)) && /octobre 2026/.test(texte(m.__contenu.html)), texte(m.__contenu.html).slice(0, 200));
  v('fmtLongEcran / fmtShortEcran / fmtTsEcran en français = les fonctions d\'origine, au caractère près',
    [m.fmtLongEcran('2026-10-14'), m.fmtShortEcran('2026-10-14'), m.fmtTsEcran(1760000000000)], [m.fmtLong('2026-10-14'), m.fmtShort('2026-10-14'), m.fmtTs(1760000000000)]);
} catch (e) { vrai('section 1 : exécution sans exception', false, String(e && e.message)); }

for (const L of ['en', 'es']) {
  console.log('\n── 2. ' + L + ' : plus de fragment français sur les écrans ──');
  try {
  const m = monde(L);
  for (const k of ['int', 'plan', 'retard', 'abs', 'temps']) {
    m.tdbDetail(k);
    const h = m.__det.f.innerHTML, tx = texte(h);
    vrai(L + ' · détail « ' + k + ' » : la fenêtre est traduite une fois posée (translateNode appelé)', m.__appels.translateNode >= 1, m.__appels.translateNode);
    vrai(L + ' · détail « ' + k + ' » : plus de français', !FR.test(tx), (tx.match(FR) || [])[0] + ' ← ' + tx.slice(0, 260));
    vrai(L + ' · détail « ' + k + ' » : la fenêtre n\'est pas vide (population)', tx.length > 40, tx);
  }
  m.tdbDetail('retard');
  vrai(L + ' · détail « retard » : l\'explication est UNE phrase traduite (pas « late » dans du français)', /(is <b>late<\/b>|está <b>con retraso<\/b>)/.test(m.__det.f.innerHTML), m.__det.f.innerHTML.slice(0, 400));
  m.tdbDetail('int');
  vrai(L + ' · le titre garde son nombre : « 3 … »', /^\s*\d+ /.test(texte(m.__det.f.innerHTML)), texte(m.__det.f.innerHTML).slice(0, 60));
  const grille = texte(m.tdbPlanning());
  vrai(L + ' · grille du planning : population (une ligne d\'équipe et ses jours)', grille.length > 100 && /Karim Benali/.test(grille), grille.slice(0, 100));
  /* la grille est dans #content : l'observateur la traduit, comme pour les autres cartes */
  const grilleTr = texte(m.trad(m.tdbPlanning()));
  vrai(L + ' · grille du planning : plus de français (jours, « à répartir », « libre », « + N autres »)', !FR.test(grilleTr), (grilleTr.match(FR) || [])[0] + ' ← ' + grilleTr.slice(0, 300));
  vrai(L + ' · grille : « + 2 autres » devient un mot de la langue', /\+ 2 (others|otras)/.test(grilleTr), grilleTr);
  vrai(L + ' · grille : les jours abrégés', L === 'en' ? /\bWED\b/.test(grilleTr) : grilleTr.includes('MIÉ'), grilleTr.slice(0, 200));
  m.journalView('Historique', '');
  const jh0 = texte(m.__contenu.html);
  vm.runInContext('_histMax=1', m);
  m.journalView('Historique', '');
  const jh = jh0 + ' ' + texte(m.__contenu.html);
  vrai(L + ' · Historique : plus de français', !FR.test(jh), (jh.match(FR) || [])[0] + ' ← ' + jh);
  vrai(L + ' · Historique : « Afficher la suite · 1 … » avec le nombre', /1 (older event|evento anterior)/.test(jh), jh.slice(-120));
  vrai(L + ' · Historique : l\'action courante « Facture payée » est traduite', /(Invoice paid|Factura pagada)/.test(jh), jh);
  m.views.archives();
  const ah = texte(m.__contenu.html);
  vrai(L + ' · Archives : plus de français', !FR.test(ah), (ah.match(FR) || [])[0] + ' ← ' + ah.slice(0, 300));
  vrai(L + ' · Archives : le mois dans la langue (October 2026 / octubre 2026)', L === 'en' ? /October 2026/.test(ah) : /octubre de 2026|octubre 2026/.test(ah), ah.slice(0, 120));
  vrai(L + ' · Archives : « (2) » reste (le nombre est conservé)', /\(2\)/.test(ah), ah);
  } catch (e) { vrai(L + ' : exécution sans exception', false, String(e && e.message)); }
}

console.log('\n── 3. les documents d\'un client restent en français, quelle que soit la langue de l\'écran ──');
{
  const m = monde('en');
  v('fmtLong / fmtShort / fmtTs ne dépendent pas de la langue',
    [m.fmtLong('2026-10-14'), m.fmtShort('2026-10-14')], [monde('fr').fmtLong('2026-10-14'), monde('fr').fmtShort('2026-10-14')]);
  vrai('fmtLongEcran(en) écrit bien en anglais', typeof m.fmtLongEcran === 'function' && /Wednesday/.test(m.fmtLongEcran('2026-10-14')));
  const DOCS = ['docPdfStr', 'bonPdfStr', 'rapportPdfStr', 'printRapport', 'docEntete', 'printArchive'];
  vrai('population : les fabriques de documents sont trouvées', DOCS.every(f => bloc('function ' + f + '(').length > 100), DOCS.filter(f => bloc('function ' + f + '(').length <= 100));
  vrai('aucun document ne lit les variantes d\'écran (ils restent en français)', DOCS.every(f => !/(fmtLongEcran|fmtShortEcran|fmtTsEcran|moisEcran)/.test(bloc('function ' + f + '('))));
}

console.log('\n── 4. les clés ajoutées ne sont pas mortes ──');
{
  const dico = vm.runInNewContext(DICO.replace('const I18N=', 'var I18N=') + ';I18N');
  const code = SRC.replace(DICO, ' ');
  const CLES = ['intervention à planifier', 'interventions à planifier', 'intervention en retard', 'interventions en retard', 'absent sur la période', 'absents sur la période',
    'jour de retard', 'jours de retard', 'jour ouvré', 'jours ouvrés', 'évènement plus ancien', 'évènements plus anciens', 'Afficher la suite', 'Interventions du mois', 'à répartir', 'libre', 'dont', 'd’activités'];
  for (const k of CLES) {
    vrai('« ' + k + ' » est écrite par un écran (nbT/t) ET traduite en en/es', code.includes("'" + k + "'") && !!dico.en[k] && !!dico.es[k] && dico.en[k] !== k, k);
  }
}

console.log('\n══ test-1154 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
