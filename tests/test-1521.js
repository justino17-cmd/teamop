/* ══ RAPPORTS — UNE LIGNE « TERMINÉE » NE MÈNE PAS À UN REFUS ════════════════════════════════════════════
   Lot i03 (17 octobre 2026), bug r3#5. formRapport refuse (toast « Rédiger ou clore cette intervention n'est pas
   autorisé ») sans « Interventions → Modifier » (intStatutPermis(i,'terminee')) — juste, c'est la règle du menu de
   statut. Mais views.rapports mettait quand même `onclick="formRapport(…)"` sur chacune des lignes terminées, et
   la liste des Interventions un bouton « Rapport » : un compte de lecture cliquait et n'obtenait qu'un refus, alors
   qu'il pouvait lire le compte-rendu avant le correctif des droits. La ligne mène désormais à la FICHE
   (detailIntervention, qui montre le compte-rendu sans « Rédiger ») quand le droit manque ; formRapport garde son refus.
   Le banc EXÉCUTE la vraie views.rapports et la vraie intStatutPermis, extraites d'app.html.                     */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const PERMIS = bloc('function intStatutPermis(i,st){'), RAP = bloc('views.rapports=function(){'), FR = bloc('function formRapport(id){');
vrai('les fonctions sont trouvées', PERMIS.length > 100 && RAP.length > 400 && FR.length > 100, [PERMIS.length, RAP.length, FR.length]);

function monde(droits, moi) {
  const ctx = { console, JSON, Math, Date, Array, String, Object, Number, __html: '', __toasts: [], __ouvert: [],
    db: { interventions: [
      { id: 'i1', titre: 'Dératisation', statut: 'terminee', date: '2026-10-10', clientId: 'c1', techId: 'T9', techIds: ['T9'], compteRendu: 'RAS' },
      { id: 'i2', titre: 'Désinsectisation', statut: 'terminee', date: '2026-10-11', clientId: 'c1', techId: 'T9', techIds: ['T9'], compteRendu: '' },
      { id: 'i3', titre: 'À clore', statut: 'encours', date: '2026-10-12', clientId: 'c1', techId: 'T9', techIds: ['T9'] }] } };
  vm.createContext(ctx);
  vm.runInContext(`
    function can(c){ return ${JSON.stringify(droits.can || {})}[c]===true; }
    function canCat(g,d){ return ${JSON.stringify(droits.cat || {})}[g+'.'+d]===true; }
    function myTechId(){ return ${JSON.stringify(moi || '')}; }
    function intTechIds(i){ return (i&&i.techIds&&i.techIds.length)?i.techIds:(i&&i.techId?[i.techId]:[]); }
    function setHeader(){} function visibleInts(l){ return l; } function esc(s){ return String(s==null?'':s); }
    function fmtShort(d){ return String(d); } function clientName(){ return 'Client'; } function badge(){ return ''; }
    function emptyState(){ return ''; } var STATUT_INT={};
    var $=function(id){ return { set innerHTML(v){ __html=v; } }; };
    function toast(m){ __toasts.push(m); } function detailIntervention(id){ __ouvert.push('fiche:'+id); }
    var views={}; ${PERMIS}\n${RAP}`, ctx);
  ctx.views.rapports();
  return ctx;
}
const lignes = html => [...html.matchAll(/<div class="pl-row lgt" onclick="([a-zA-Z]+)\('([^']+)'\)">[\s\S]*?<button class="btn ghost sm">([^<]*)<\/button>/g)].map(m => ({ fn: m[1], id: m[2], bouton: m[3] }));

console.log('— compte SANS « Interventions → Modifier » (compta, lecture seule)');
{ const W = monde({ cat: {} }, ''); const L = lignes(W.__html).filter(l => l.id !== 'i3');
  vrai('(population) deux lignes terminées trouvées', L.length === 2, L);
  vrai('aucune ligne terminée ne mène à formRapport (qui ne ferait que refuser)', L.every(l => l.fn !== 'formRapport'), L);
  vrai('elles mènent à la fiche', L.every(l => l.fn === 'detailIntervention'), L);
  vrai('le bouton dit « Voir » (pas « Rédiger »)', L.every(l => l.bouton === 'Voir'), L); }

console.log('— compte AVEC « Interventions → Modifier »');
{ const W = monde({ cat: { 'int.modifier': true } }, ''); const L = lignes(W.__html).filter(l => l.id !== 'i3');
  vrai('les lignes terminées mènent au formulaire', L.length === 2 && L.every(l => l.fn === 'formRapport'), L);
  vrai('le bouton garde « Voir » (rapport rédigé) et « Rédiger » (à compléter)', L[0].bouton === 'Voir' && L[1].bouton === 'Rédiger', L); }

console.log('— technicien SANS « Modifier », sur SA propre intervention (le geste du terrain)');
{ const W = monde({ cat: {} }, 'T9'); const L = lignes(W.__html).filter(l => l.id !== 'i3');
  vrai('il peut terminer la sienne : la ligne mène au formulaire', L.length === 2 && L.every(l => l.fn === 'formRapport'), L); }

console.log('— la liste des Interventions : le bouton « Rapport » lit la même règle');
{ const d = SRC.indexOf('title="Rapport" onclick='); const f = d < 0 ? '' : SRC.slice(d, d + 200);
  vrai('le bouton « Rapport » est trouvé', d > 0);
  vrai('il choisit formRapport / detailIntervention selon intStatutPermis(i,\'terminee\')', /onclick="\$\{intStatutPermis\(i,'terminee'\)\?'formRapport':'detailIntervention'\}\('\$\{i\.id\}'\)"/.test(f), f); }

console.log('— formRapport garde son propre refus (la garde reste)');
vrai('formRapport lit intStatutPermis en première instruction utile', /if\(!intStatutPermis\(i,'terminee'\)\)\{ toast\(/.test(FR));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
