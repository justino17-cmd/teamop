/* ══ v764 · LES RAPPELS D'ÉCHÉANCE DES CONTRATS ═══════════════════════════════════════════════════════════════════
   Justin, 29 septembre 2026 : « rappels d'échéance, ça il faudra le faire ». La page Métiers du site les promettait,
   l'application ne les faisait pas (la promesse est retirée du site, test-846 § 7, tant que la production ne les a pas).

   Ce banc EXÉCUTE, dans un bac à sable, les vraies fonctions d'app.html :
   1. ctrEcheance — un contrat ACTIF (ou sans statut : fiche d'avant le champ) dont la date de fin tombe dans les
      CTR_RAPPEL_J jours, ou est passée, rend son nombre de jours ; tout autre contrat rend null. Joué en heure de
      Paris, AUTOUR du changement d'heure (un jour de 23 h ou de 25 h ne décale pas le compte) ;
   2. ctrRappels — la liste de l'écran ET de la cloche : visibleDocs (la liste de l'écran), triée, la plus urgente
      en tête ;
   3. views.contrats — le bandeau, la pastille sur la ligne, `data-ctr` (ce que vise la cloche), le ✎ seulement à
      qui peut modifier ; ⛔ et RIEN NE S'ÉCRIT : ni `save()`, ni une ligne de la base qui change ;
   4. computeNotifs — la vraie : la ligne de la cloche paraît à qui voit le module Contrats ET peut modifier une
      vente ; ni à l'un sans l'autre, ni sur une formule qui grise l'écran ; son geste mène à la ligne de l'écran.
   Le geste au doigt, sur la bêta : scratchpad/sonde-ctr-echeances.js. */
'use strict';
process.env.TZ = 'Europe/Paris';   // le changement d'heure du 25 octobre 2026 est dans la population
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
/* une fonction fléchée ou une vue se termine à la fin de sa ligne `};` — views.contrats est un bloc = function(){…}; */
const vue = debut => { const b = bloc(debut); return b ? b + ';' : ''; };

console.log('\n── 847 · 0. la population ──');
const F = {
  RJ: ligne('const CTR_RAPPEL_J='), ECH: bloc('function ctrEcheance(ct,auj){'), RAP: bloc('function ctrRappels(auj){'),
  TXT: bloc('function ctrEcheanceTexte(j){'), PAS: bloc('function ctrPastille(j){'), BAN: bloc('function ctrBandeau(ech,cMod){'),
  ST: ligne('const CTR_ST='), VUE: vue('views.contrats=function(){'), NOTIF: bloc('function computeNotifs(){') };
v('les fonctions sont trouvées', Object.entries(F).filter(([, s]) => !s).map(([k]) => k), []);
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)',
  ['function ctrEcheance(', 'function ctrRappels(', 'function ctrEcheanceTexte(', 'function ctrPastille(', 'function ctrBandeau(', 'const CTR_RAPPEL_J='].map(n => SRC.split(n).length - 1), [1, 1, 1, 1, 1, 1]);
v('le délai est de 30 jours', F.RJ.trim(), 'const CTR_RAPPEL_J=30;');

/* ── le bac à sable : les vraies fonctions, des doubles pour ce qui n'est pas en jeu ── */
const AUJ = '2026-10-20';   // cinq jours avant le changement d'heure
const plus = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
function monde(o) {
  o = o || {};
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, Promise,
    db: { contrats: o.contrats || [], clients: [{ id: 'c1', nom: 'Hôtel du Port' }, { id: 'c2', nom: 'Boulangerie <Martin>' }],
      boxes: [], demandes: [], boxMvtAttente: [], bons: [], enveloppes: [], interventions: [], produits: [] },
    currentUser: { id: 'u1', role: o.role || 'commercial', prenom: 'Léa', nom: 'Test' },
    __voitContrats: o.voit !== false, __modifier: o.modifier !== false, __cache: o.cache || new Set(), __saves: 0,
    __html: '', __entete: null, localStorage: { getItem: () => null, setItem: () => {} } };
  vm.createContext(ctx);
  vm.runInContext(`
    ${F.ST}\n${F.RJ}
    function todayISO(){ return '${AUJ}'; }
    function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function fmtShort(d){ return d? d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4) : '—'; }
    function eur(n){ return (n||0)+' €'; }
    function clientName(id){ const c=db.clients.find(x=>x.id===id); return c?c.nom:''; }
    function visibleDocs(l){ return (l||[]).filter(x=>!__cache.has(x.id)); }
    function canCat(g,d){ if(g==='ventes'&&d==='modifier') return __modifier; return g==='ventes'; }
    function userSeesModule(u,k){ return k==='contrats' ? __voitContrats : false; }
    function notifVoitModule(){ return false; } function can(){ return false; } function respBonsMoi(){ return false; }
    function notifMoi(){ return false; } function jourDe(t){ return new Date(t).toISOString().slice(0,10); }
    var notifSeen=new Map(); function saveNotifSeen(){}
    /* les autres familles de la cloche, hors jeu ici : des doubles qui ne signalent rien */
    function produitsRecents(){ return []; } function notifBoxConcerne(){ return false; } function notifBoxOk(){ return false; }
    function boxNouveautes(){ return []; } function produitCree(){ return 0; } function stockTotaux(){ return {}; } function stockVoitTout(){ return false; }
    function visibleDemandes(){ return []; } function visibleBoxMvts(){ return []; } function visibleInts(){ return []; } function ouvrables(){ return {}; }
    function save(){ __saves++; }
    var FREQ={mensuel:'Mensuel',trimestriel:'Trimestriel',semestriel:'Semestriel',annuel:'Annuel'};
    function badge(M,k){ const x=M[k]; return x? '<span class="st '+x.c+'">'+x.l+'</span>' : '<span class="st">—</span>'; }
    function setHeader(t,s,b){ __entete={t:t,s:s,b:b}; }
    function tableCard(cols,rows){ return '<table><tr>'+cols.map(c=>'<th>'+c+'</th>').join('')+'</tr>'+rows+'</table>'; }
    function emptyState(ic,t,b,f){ return '<div class="vide">'+t+'</div>'; }
    function $(id){ return id==='content' ? { set innerHTML(h){ __html=h; }, get innerHTML(){ return __html; } } : null; }
    var views={};
    ${F.ECH}\n${F.RAP}\n${F.TXT}\n${F.PAS}\n${F.BAN}\n${F.VUE}\n${F.NOTIF}`, ctx);
  return ctx;
}
const run = (ctx, code) => vm.runInContext(code, ctx);

console.log('\n── 847 · 1. ctrEcheance : qui est en rappel, et à combien de jours ──');
{
  const c = monde(), e = ct => run(c, 'ctrEcheance(' + JSON.stringify(ct) + ')');
  v('fin dans 30 jours : en rappel (la borne est comprise)', e({ statut: 'actif', dateFin: plus(AUJ, 30) }), 30);
  v('fin dans 31 jours : pas encore', e({ statut: 'actif', dateFin: plus(AUJ, 31) }), null);
  v('fin aujourd\'hui : 0', e({ statut: 'actif', dateFin: AUJ }), 0);
  v('fin passée de 5 jours, toujours « Actif » : −5 (il faut le renouveler ou le passer en « Expiré »)', e({ statut: 'actif', dateFin: plus(AUJ, -5) }), -5);
  v('⛔ autour du changement d\'heure (25 octobre, un jour de 25 h) : le compte reste juste', [e({ statut: 'actif', dateFin: '2026-10-26' }), e({ statut: 'actif', dateFin: '2026-10-25' })], [6, 5]);
  v('et au printemps (29 mars 2027, un jour de 23 h), vu du 20 mars', run(c, `ctrEcheance({statut:'actif',dateFin:'2027-03-30'},'2027-03-20')`), 10);
  v('un contrat SANS statut (fiche d\'avant le champ) compte pour actif', e({ dateFin: plus(AUJ, 10) }), 10);
  v('⛔ suspendu, expiré : jamais de rappel', [e({ statut: 'suspendu', dateFin: plus(AUJ, 3) }), e({ statut: 'expire', dateFin: plus(AUJ, -3) })], [null, null]);
  v('sans date de fin, ou une date illisible : pas d\'échéance', [e({ statut: 'actif' }), e({ statut: 'actif', dateFin: '' }), e({ statut: 'actif', dateFin: '2026-13' }), e(null)], [null, null, null, null]);
  v('le texte dit le délai, dans les deux sens', [0, 1, 12, -1, -40].map(j => run(c, 'ctrEcheanceTexte(' + j + ')')),
    ['se termine aujourd’hui', 'se termine dans 1 j', 'se termine dans 12 j', 'terminé depuis 1 j', 'terminé depuis 40 j']);
}

/* la population des écrans et de la cloche : sept contrats, dont trois en rappel — et un en rappel CACHÉ à l'utilisateur */
const CONTRATS = () => [
  { id: 'k1', num: 'CTR-2026-001', titre: 'Entretien annuel', clientId: 'c1', frequence: 'annuel', montant: 480, statut: 'actif', dateDebut: '2025-11-01', dateFin: plus(AUJ, 12) },
  { id: 'k2', num: 'CTR-2026-002', titre: 'Dératisation', clientId: 'c2', frequence: 'trimestriel', montant: 240, statut: 'actif', dateDebut: '2025-10-01', dateFin: plus(AUJ, -3) },
  { id: 'k3', num: 'CTR-2026-003', titre: 'Contrat long', clientId: 'c1', frequence: 'mensuel', montant: 90, statut: 'actif', dateDebut: '2026-01-01', dateFin: plus(AUJ, 200) },
  { id: 'k4', num: 'CTR-2026-004', titre: 'Suspendu', clientId: 'c1', frequence: 'annuel', montant: 100, statut: 'suspendu', dateDebut: '2025-01-01', dateFin: plus(AUJ, 2) },
  { id: 'k5', num: 'CTR-2026-005', titre: 'Sans fin', clientId: 'c2', frequence: 'annuel', montant: 100, statut: 'actif', dateDebut: '2025-01-01', dateFin: '' },
  { id: 'k6', num: 'CTR-2026-006', titre: 'Ancien, sans statut', clientId: 'c2', frequence: 'annuel', montant: 50, dateDebut: '2025-01-01', dateFin: plus(AUJ, 30) },
  { id: 'k7', num: 'CTR-2026-007', titre: 'Caché', clientId: 'c1', frequence: 'annuel', montant: 10, statut: 'actif', dateDebut: '2025-01-01', dateFin: plus(AUJ, 1) }];

console.log('\n── 847 · 2. ctrRappels : la liste de l\'écran ET de la cloche ──');
{
  const c = monde({ contrats: CONTRATS(), cache: new Set(['k7']) });
  const r = run(c, 'ctrRappels().map(x=>[x.ct.id,x.j])');
  v('(population) 7 contrats, dont 4 dans la fenêtre — un caché à l\'utilisateur', [run(c, 'db.contrats.length'), CONTRATS().filter(ct => run(c, 'ctrEcheance(' + JSON.stringify(ct) + ')') !== null).length], [7, 4]);
  v('les trois qu\'il VOIT, le plus urgent en tête (l\'échu d\'abord)', r, [['k2', -3], ['k1', 12], ['k6', 30]]);
  v('⛔ le contrat caché par visibleDocs n\'y est pas (la cloche ne nomme que ce que l\'écran montre)', r.some(x => x[0] === 'k7'), false);
}

console.log('\n── 847 · 3. l\'écran Contrats : bandeau, pastilles, ligne visée — et rien ne s\'écrit ──');
{
  const c = monde({ contrats: CONTRATS(), cache: new Set(['k7']) }), avant = JSON.stringify(run(c, 'db'));
  run(c, 'views.contrats()');
  const h = run(c, '__html');
  vrai('(population) l\'écran est rendu, sept lignes moins la cachée', (h.match(/<tr data-ctr="/g) || []).length === 6);
  vrai('le bandeau dit « 3 contrats à renouveler », en tête de l\'écran', /class="card ctr-echeances"/.test(h) && h.indexOf('ctr-echeances') < h.indexOf('<table>') && />⏰ 3 contrats à renouveler</.test(h));
  const ban = h.slice(h.indexOf('ctr-echeances'), h.indexOf('<table>'));
  v('   il nomme chacun, dans l\'ordre, avec son délai et sa date', ['CTR-2026-002', 'CTR-2026-001', 'CTR-2026-006'].map(n => ban.indexOf(n)).every((x, i, a) => x > 0 && (i === 0 || x > a[i - 1])), true);
  vrai('   « terminé depuis 3 j (17/10/2026) », « se termine dans 12 j (01/11/2026) »', ban.includes('terminé depuis 3 j (17/10/2026)') && ban.includes('se termine dans 12 j (01/11/2026)'));
  vrai('   ⛔ le nom du client est échappé (« Boulangerie <Martin> » ne devient pas une balise)', ban.includes('Boulangerie &lt;Martin&gt;') && !ban.includes('<Martin>'));
  v('   un ✎ « Mettre à jour » par contrat (droit de modifier)', (ban.match(/onclick="formContrat\('k[0-9]'\)">✎ Mettre à jour</g) || []).length, 3);
  const ligneDe = id => { const i = h.indexOf('<tr data-ctr="' + id + '"'); return h.slice(i, h.indexOf('</tr>', i)); };
  v('la pastille de chaque ligne', ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map(id => (ligneDe(id).match(/<span class="st st-(?:org|red)" style="white-space:nowrap">([^<]*)</) || [])[1] || null),
    ['Fin dans 12 j', 'Échu', null, null, null, 'Fin dans 30 j']);
  vrai('⛔ ouvrir l\'écran n\'écrit RIEN : ni save(), ni une ligne de la base qui change', run(c, '__saves') === 0 && JSON.stringify(run(c, 'db')) === avant);
  const c2 = monde({ contrats: CONTRATS(), modifier: false });
  run(c2, 'views.contrats()');
  const h2 = run(c2, '__html');
  vrai('sans le droit de modifier : le bandeau informe, sans ✎', /⏰ 4 contrats à renouveler/.test(h2) && !/Mettre à jour/.test(h2));
  const c3 = monde({ contrats: CONTRATS().filter(ct => ['k3', 'k4', 'k5'].includes(ct.id)) });
  run(c3, 'views.contrats()');
  vrai('aucun contrat en rappel : pas de bandeau (et les lignes sont là)', !/ctr-echeances/.test(run(c3, '__html')) && (run(c3, '__html').match(/<tr data-ctr=/g) || []).length === 3);
}

console.log('\n── 847 · 4. la cloche : la vraie computeNotifs ──');
{
  const cloche = o => { const c = monde(Object.assign({ contrats: CONTRATS(), cache: new Set(['k7']) }, o)); return [c, run(c, 'computeNotifs()').filter(n => /^ctrech:/.test(n.id))]; };
  const [c, n] = cloche({});
  v('voit Contrats et peut modifier : une ligne par contrat en rappel, pas plus — ⛔ la plus urgente en tête (l\'échu)', n.map(x => x.id), ['ctrech:k2:' + plus(AUJ, -3), 'ctrech:k1:' + plus(AUJ, 12), 'ctrech:k6:' + plus(AUJ, 30)]);
  vrai('   le texte : « Contrat à renouveler — CTR-2026-001 · Hôtel du Port : se termine dans 12 j »', n.some(x => x.txt === '<b>Contrat à renouveler</b> — CTR-2026-001 · Hôtel du Port : se termine dans 12 j'));
  vrai('   l\'échu le dit : « Contrat échu … terminé depuis 3 j », client échappé', n.some(x => x.txt === '<b>Contrat échu</b> — CTR-2026-002 · Boulangerie &lt;Martin&gt; : terminé depuis 3 j'));
  run(c, 'views.contrats()');
  const h = run(c, '__html');
  v('   ⛔ son geste ouvre Contrats et vise une ligne QUE L\'ÉCRAN PORTE (data-ctr)', n.map(x => { const m = /^go\('contrats'\);cible\('ctr','([^']+)'\)$/.exec(x.act); return !!m && h.includes('<tr data-ctr="' + m[1] + '"'); }), [true, true, true]);
  v('   ⛔ jamais le contrat caché à l\'utilisateur', n.some(x => /k7/.test(x.id)), false);
  vrai('   un contrat renouvelé (date de fin changée) repart à zéro : son identifiant porte la date', new Set(n.map(x => x.id.split(':')[2])).size === 3);
  v('sans le droit de modifier une vente : rien dans la cloche', cloche({ modifier: false })[1].length, 0);
  v('⛔ sans le module Contrats (formule Gratuit, impayé, métier, case) : rien — même administrateur', cloche({ voit: false, role: 'admin' })[1].length, 0);
  v('aucun contrat : rien, et la cloche calcule ses autres familles sans jeter', cloche({ contrats: [] })[1].length, 0);
  vrai('⛔ la cloche n\'écrit rien non plus', run(c, '__saves') === 0);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
