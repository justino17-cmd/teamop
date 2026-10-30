/* ══ g06 · L'ÉCRAN FACTURES : statuts, retard, « À facturer », ligne de facture, numéros en double ═════════
   Quatre défauts relevés au navigateur (testeurs OP GESTION, octobre 2026), tous dans `views.factures` :

   · facturation#5 — le formulaire d'une facture OFFRE le statut « En retard », mais l'écran ne calculait le
     retard qu'à partir de « envoyee » + 30 jours : une facture posée « retard » à la main sortait des
     compteurs « À encaisser » et « En retard » et de tous les filtres (sauf « Toutes »). L'argent dû
     disparaissait de l'écran. Le reste de l'application (compta, tableau de bord, virement) traite déjà
     `envoyee` ET `retard` comme impayés ;
   · facturation#6 — « À facturer » ne regardait que `f.interventionId`. Une intervention portée par une
     facture GROUPÉE (`interIds`, la validation de la journée) ou par une facture automatique (`interId`)
     restait proposée, et « Générer la facture » en créait une seconde, à un autre montant ;
   · facturation#9 — au téléphone, la colonne de texte d'une facture « Payée » (groupe Aperçu / FX / ↩︎ /
     Validée / 🗑) était écrasée à 0 px. Le motif existe déjà dans la feuille (`.pl-row.lga` + `.lga-a`) ;
     la ligne de facture ne l'avait pas. La mesure au navigateur est dans le scratchpad (sonde-g06-mobile.js) ;
     ce banc garde ce que le CODE doit porter ;
   · facturation#2 (sa part restante) — le bandeau « numéros en double » n'existait que dans la liste des
     devis ; une facture émise deux fois sous le même numéro (deux appareils) ne se voyait nulle part.

   Ce banc EXÉCUTE la vraie `views.factures` et la vraie `factIsLate` dans un bac à sable, avec les vraies
   `docTot`, `ligTotLigne`, `docNumsDoubles`, `esc`.                                                       */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* seuls les blocs qui COMMENCENT une ligne sont retirés (CLAUDE.md : le motif naïf avale du vrai code) */
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

console.log('\n── 1250 · 0. la population ──');
const VF = bloc('views.factures=function(){'), LATE = bloc('function factIsLate(f){'), DT = bloc('function docTot(d){'), DND = bloc('function docNumsDoubles(coll){'),
  LTL = ligne('const ligTotLigne='), LHT = ligne('const ligHT='), ESC = ligne('const esc=') || bloc('function esc(');
v('les fonctions sont trouvées', [VF.length > 3000, !!LATE, !!DT, !!DND, !!LTL, !!LHT], [true, true, true, true, true, true]);
v('⛔ une seule définition de factIsLate et de views.factures', ['function factIsLate(', 'views.factures=function'].map(n => SRC.split(n).length - 1), [1, 1]);

const EUR = bloc('const eur = n =>') + ';';
vrai('eur (la vraie) est trouvée', EUR.length > 100);
const JOUR = 86400000, iso = off => new Date(Date.now() - off * JOUR).toISOString().slice(0, 10);
function monde(factures, interventions, devis) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, __html: '', __entete: null,
    db: { factures, interventions: interventions || [], devis: devis || [], clients: [{ id: 'c1', nom: 'Boulangerie Au Bon Pain' }] },
    currentUser: { id: 'u1' } };
  vm.createContext(ctx);
  vm.runInContext(`
    function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
    let _NF; ${EUR}
    const FACT_ST={brouillon:{l:'En attente',c:'st-grey'},envoyee:{l:'Envoyée',c:'st-blue'},payee:{l:'Payée',c:'st-green'},retard:{l:'En retard',c:'st-red'}};
    function badge(map,k){ return '<span class="st '+((map[k]||{}).c||'')+'">'+((map[k]||{}).l||k)+'</span>'; }
    ${LTL}\n${LHT}\n${DT}\n${DND}\n${LATE}\n${bloc('function docEmis(d){')}   /* « émis » : une définition (lot g17) */
    let factFilter='tous'; function __ff(k){ factFilter=k; }
    function canCat(){ return true; } function isFinanceMgr(){ return true; }
    function visibleDocs(l){ return l; } function visibleInts(l){ return l; }
    function clientName(id){ return ((db.clients||[]).find(c=>c.id===id)||{}).nom||'—'; }
    function fmtShort(d){ return d||''; } function techNames(){ return 'Non assigné'; } function rapportSociete(){ return 'Ent'; }
    function setHeader(){} var views={};
    const __el={ set innerHTML(h){ __html=h; }, get innerHTML(){ return __html; } };
    function $(id){ return __el; }
    ${VF}`, ctx);
  return ctx;
}
const F = (id, statut, jours, ttc, extra) => Object.assign({ id, num: 'FAC-' + id, clientId: 'c1', date: iso(jours), statut, tva: 0, lignes: [{ designation: 'x', qte: 1, pu: ttc }] }, extra || {});
const nb = s => String(s).replace(/[\u202f\u00a0]/g, ' ');
/* lit un compteur « À encaisser (N) » : [montant, N] */
function kpi(html, lbl) { html = nb(html); const m = html.match(new RegExp('kpi-val">([^<]*)</div><div class="kpi-lbl">' + lbl + ' \\((\\d+)\\)')); return m ? [m[1], +m[2]] : null; }
function affichees(W, filtre) { W.__ff(filtre); W.views.factures(); return ['a', 'b', 'c', 'd', 'e', 'f'].filter(id => W.__html.includes("pdfDoc('factures','" + id + "')")); }

console.log('\n── 1250 · 1. facturation#5 — « En retard » posé à la main compte comme dû ET comme en retard ──');
{ const W = monde([F('a', 'retard', 2, 120)]);
  W.views.factures(); const h = W.__html;
  v('population : la facture « retard » existe (Total facturé 120)', /120,00 €<\/div><div class="kpi-lbl">Total facturé/.test(h), true);
  v('À encaisser : 120 € (1)', kpi(h, 'À encaisser'), ['120,00 €', 1]);
  v('En retard : 120 € (1)', kpi(h, 'En retard'), ['120,00 €', 1]);
  v('filtre « À encaisser » : la facture y est', affichees(W, 'envoyee'), ['a']);
  v('filtre « En retard » : la facture y est', affichees(W, 'retard'), ['a']);
  v('filtre « Toutes » : toujours là', affichees(W, 'tous'), ['a']);
  v('filtre « Payées » : pas là', affichees(W, 'payee'), []);
  v('factIsLate le dit', !!W.factIsLate(W.db.factures[0]), true); }
{ /* la population complète : chaque statut compte exactement une fois, et ce qui était juste le reste */
  const W = monde([F('a', 'envoyee', 2, 100), F('b', 'envoyee', 45, 200), F('c', 'retard', 3, 400), F('d', 'payee', 60, 800), F('e', 'brouillon', 1, 1600)]);
  W.views.factures(); const h = W.__html;
  v('À encaisser = envoyée récente + envoyée ancienne + retard (700 €, 3)', kpi(h, 'À encaisser'), ['700,00 €', 3]);
  v('En retard = envoyée de 45 jours + retard à la main (600 €, 2)', kpi(h, 'En retard'), ['600,00 €', 2]);
  v('Encaissé = la payée seule', /800,00 €<\/div><div class="kpi-lbl">Encaissé/.test(h), true);
  v('filtre « À encaisser » : a, b, c — ni la payée ni le brouillon', affichees(W, 'envoyee'), ['a', 'b', 'c']);
  v('filtre « En retard » : b et c', affichees(W, 'retard'), ['b', 'c']);
  v('filtre « En attente » : e', affichees(W, 'brouillon'), ['e']);
  v('filtre « Payées » : d', affichees(W, 'payee'), ['d']);
  v('la pastille de statut d\'une facture « retard » dit « En retard »', (affichees(W, 'tous'), /st-red">En retard/.test(W.__html)), true);
  v('une payée très ancienne n\'est JAMAIS en retard', !!W.factIsLate(W.db.factures[3]), false);
  v('un brouillon n\'est jamais en retard', !!W.factIsLate(W.db.factures[4]), false); }

console.log('\n── 1250 · 2. facturation#6 — une intervention déjà facturée n\'est plus proposée ──');
{ const T = (id) => ({ id, titre: 'Dératisation ' + id, statut: 'terminee', clientId: 'c1', date: iso(1), montant: 120 });
  const ints = [T('i1'), T('i2'), T('i3'), T('i4')];
  const W = monde([F('a', 'brouillon', 1, 120, { interventionId: 'i1' }), F('b', 'brouillon', 1, 120, { interIds: ['i2', 'x9'], aFacturer: true }), F('c', 'payee', 1, 120, { interId: 'i3', auto: true })], ints);
  W.views.factures(); const h = W.__html;
  const propose = id => h.includes("intGenererDoc('" + id + "','factures')");
  vrai('population : la rubrique « À facturer » est affichée (i4 est proposée)', propose('i4'));
  vrai('i1 (portée par f.interventionId) : plus proposée — comme avant', !propose('i1'));
  vrai('⛔ i2 (facture groupée, f.interIds) : plus proposée', !propose('i2'));
  vrai('⛔ i3 (facture automatique, f.interId) : plus proposée', !propose('i3'));
  v('le compteur « À facturer » ne compte que i4', (h.match(/<h3>À facturer<\/h3><span class="tag">(\d+)<\/span>/) || [])[1], '1'); }

console.log('\n── 1250 · 3. facturation#9 — la ligne de facture prend le motif .lga du dépôt ──');
{ const W = monde([F('a', 'payee', 5, 2962962, { valideCompta: true, datePaiement: iso(4) })]);
  W.views.factures(); const h = W.__html;
  const row = h.slice(Math.max(0, h.lastIndexOf('<div class="pl-row')));   // une seule facture : la ligne va jusqu'à la fin
  vrai('population : la ligne de facture est trouvée', row.includes('FAC-a'), row.slice(0, 80));
  vrai('la ligne porte la classe lga (le texte prend sa ligne sous 440 px)', /^<div class="pl-row[^"]*\blga\b/.test(row), row.slice(0, 60));
  vrai('… le groupe de gestes porte lga-a (il passe dessous, à droite)', /<span class="lga-a"/.test(row));
  vrai('… et il garde son flex-wrap', /class="lga-a"[^>]*flex-wrap:wrap/.test(row));
  vrai('le montant long est insécable (« € » ne passe pas seul à la ligne)', /<span style="white-space:nowrap">2.962.962,00.€<\/span>/.test(row), row.slice(0, 300));
  vrai('la règle de feuille qui range le groupe existe bien (sinon la classe ne fait rien)',
    /\.lga > \.lga-a,html\[data-refonte\] \.lga > \.st,html\[data-refonte\] \.lga > \.btn\{order:2;margin-left:auto\}/.test(SRC)); }

console.log('\n── 1250 · 4. facturation#2 (sa part) — le bandeau « numéros en double » paraît dans Factures ──');
{ const W = monde([F('a', 'envoyee', 2, 100, { num: 'FAC-2026-007' }), F('b', 'envoyee', 3, 100, { num: 'FAC-2026-007' }), F('c', 'envoyee', 4, 100, { num: 'FAC-2026-008' })]);
  W.views.factures(); const h = W.__html;
  vrai('deux factures au même numéro : le bandeau paraît', /1 numéro en double/.test(h), h.slice(0, 120));
  vrai('… il NOMME le numéro', /FAC-2026-007/.test(h.slice(0, h.indexOf('class="kpis"') > 0 ? h.indexOf('class="kpis"') : 600)) || /numéro en double[\s\S]{0,400}FAC-2026-007/.test(h));
  const W2 = monde([F('a', 'envoyee', 2, 100, { num: 'FAC-2026-007' }), F('c', 'envoyee', 4, 100, { num: 'FAC-2026-008' })]);
  W2.views.factures();
  vrai('numéros distincts : pas de bandeau', !/en double/.test(W2.__html)); }

console.log('\n══ test-1250 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
