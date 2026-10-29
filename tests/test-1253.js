/* ══ g06 · DEVIS ET FACTURES : l'aperçu dit ce que dit le PDF, un devis ne devient facture qu'UNE fois ═════
   ventes#2 — `printDoc` (l'aperçu imprimable, aussi celui des factures) et `genDocTexte` (le corps du courriel)
   affichaient `eur(qte × pu)` BRUT, alors que le total et le PDF additionnent `ligTotLigne(l)` (arrondi PAR LIGNE,
   la règle écrite au-dessus de `ligHT`). 3 × (1,5 × 33,33) : 50,00 € ×3 affichés pour un total de 149,97 €, et le PDF
   joint disait 49,99 € ×3. La quantité s'imprimait aussi « 1.5 » au lieu de « 1,5 ». Le client recevait des lignes qui ne
   s'additionnaient pas au total, et le même devis donnait deux montants de ligne selon le document.
   ventes#3 / facturation#1 (même bug) — `devisToFacture` créait une facture à CHAQUE appel : FAC-001, -002, -003 pour
   le même devis, des numéros continus consommés, un client facturé plusieurs fois. Le bouton →🧾 restait proposé. Le
   double clic est guéri ailleurs (lot « fenêtre en fermeture ») ; ce banc garde le cas de deux clics ESPACÉS.
   Les doubles déjà en base ne sont pas supprimés (un document comptable ne disparaît pas de lui-même).

   Ce banc EXÉCUTE les vraies printDoc, genDocTexte, devisToFacture et docListView, avec la vraie ligTotLigne, docTot, eur. */
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

console.log('\n── 1253 · 0. la population ──');
const FN = ['function printDoc(', 'function genDocTexte(', 'function devisToFacture(', 'function devisFactureDe(', 'function docListView(', 'function docNumsDoubles(', 'function docTot('];
const CODE = FN.map(bloc);
const LTL = ligne('const ligTotLigne='), LHT = ligne('const ligHT='), EUR = bloc('const eur = n =>') + ';';
v('les fonctions sont trouvées', CODE.map(c => c.length > 60).concat(!!LTL, !!LHT, EUR.length > 100), Array(10).fill(true));
v('⛔ une seule définition de chaque', FN.map(n => SRC.split(n).length - 1), FN.map(() => 1));
/* la population qui compte : 1,5 × 33,33 est exactement le cas où le brut et l'arrondi par ligne divergent */
const L1 = { designation: 'Prestation', qte: 1.5, pu: 33.33 };
const brut = 1.5 * 33.33, arrondi = Number(brut.toFixed(2));
vrai('population : le brut (50,00) et l\'arrondi par ligne (49,99) divergent bien pour 1,5 × 33,33', Math.round(brut * 100) / 100 !== arrondi, [brut, arrondi]);

function monde(opts) {
  opts = opts || {};
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, __html: '', __toasts: [], __logs: [], __saves: 0, __nav: [], __ouvert: [], __can: Object.assign({ ajouter: true, modifier: true }, opts.can || {}),
    db: { devis: [{ id: 'd1', num: 'DV-2026-001', clientId: 'c1', date: '2026-10-01', statut: 'accepte', tva: 20, notes: 'n', rapportModele: '', lignes: [L1, L1, L1] },
                  { id: 'd2', num: 'DV-2026-002', clientId: 'c1', date: '2026-10-02', statut: 'accepte', tva: 20, lignes: [{ designation: 'Autre', qte: 1, pu: 10 }] }],
      factures: [], clients: [{ id: 'c1', nom: 'Boulangerie' }] }, current: 'devis', currentUser: { id: 'u1' } };
  if (opts.factures) ctx.db.factures = opts.factures;
  vm.createContext(ctx);
  vm.runInContext(`
    function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]); }
    let _NF; ${EUR}
    ${LTL}\n${LHT}
    const DOC={ devis:{coll:'devis',titre:'Devis',un:'devis',prefix:'DV',st:{brouillon:{l:'Brouillon'},accepte:{l:'Accepté'}}}, factures:{coll:'factures',titre:'Facture',un:'facture',prefix:'FAC',st:{brouillon:{l:'En attente'},payee:{l:'Payée'}}} };
    function docEntete(){ return { nom:'Ent SARL', couleur:'#0a7', logo:'', adresse:'', cp:'', ville:'', tel:'', siret:'', tvaIntra:'', iban:'', bic:'', raison:'' }; }
function docMentionsManquantes(){ return []; } function docMentionsGarde(){ return true; }     function rapportSociete(){ return 'Ent SARL'; } function encreSur(){ return '#fff'; } function todayISO(){ return '2026-10-16'; }
    var window={ open(){ return { document:{ write(h){ __html=h; }, close(){} }, focus(){} }; } };
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function logEvent(a,b){ __logs.push(a+' | '+b); }
    function canCat(g,d){ return !!__can[d]; } function can(){ return false; }
    function permGarde(g,d,q){ if(canCat(g,d)) return true; toast('Créer '+q+' n\\'est pas autorisé'); return false; }
    function go(v){ __nav.push('go('+v+')'); } var factFilter='tous';
    function formDoc(k,i){ __ouvert.push('formDoc('+k+','+i+')'); } function printDocOuvre(){ }
    var __id=0; function uid(){ return 'n'+(++__id); }
    function docNum(k){ const c=DOC[k].coll, m=(db[c]||[]).reduce((s,x)=>Math.max(s,parseInt((String(x.num||'').match(/(\\d+)$/)||[0,0])[1])||0),0); return DOC[k].prefix+'-2026-'+String(m+1).padStart(3,'0'); }
    function clientName(id){ return ((db.clients||[]).find(c=>c.id===id)||{}).nom||'—'; } function fmtShort(d){ return d||''; }
    function visibleDocs(l){ return l; } function setHeader(){} function badge(m,k){ return '<i>'+((m[k]||{}).l||k)+'</i>'; }
    function tableCard(h,rows){ return '<table>'+rows+'</table>'; } function emptyState(){ return ''; }
    const __el={ set innerHTML(h){ __html=h; } }; function $(id){ return __el; }
    ${CODE.join('\n')}`, ctx);
  // printDoc ouvre une fenêtre via window.open : le bac à sable la remplace APRÈS la définition de la fonction réelle
  ctx.printDoc = ctx.printDoc;
  return ctx;
}
const nb = s => String(s).replace(/[  ]/g, ' ');

console.log('\n── 1253 · 1. ventes#2 — l\'aperçu imprimable additionne comme le PDF ──');
{ const W = monde(); W.printDoc('devis', 'd1'); const h = nb(W.__html);
  const lignes = h.match(/<tr><td>Prestation<\/td>[\s\S]*?<\/tr>/g) || [];
  v('population : les trois lignes sont imprimées', lignes.length, 3);
  vrai('⛔ chaque ligne dit 49,99 € (l\'arrondi par ligne du PDF), pas 50,00 €', lignes.every(l => /49,99 €<\/td><\/tr>$/.test(l)), lignes);
  vrai('… la quantité s\'écrit « 1,5 » comme dans le PDF, pas « 1.5 »', lignes.every(l => /<td class="c">1,5<\/td>/.test(l)), lignes[0]);
  vrai('… et le total HT, lui, vaut 149,97 € : 3 × 49,99 — les lignes s\'additionnent', /Total HT<\/span><b>149,97 €/.test(h));
  const somme = lignes.map(l => +(l.match(/(\d+,\d\d) €<\/td><\/tr>$/) || [0, '0'])[1].replace(',', '.')).reduce((a, b) => a + b, 0);
  v('… somme des lignes imprimées = total HT imprimé', Math.round(somme * 100), 14997); }
{ const W = monde({ factures: [{ id: 'f1', num: 'FAC-2026-001', clientId: 'c1', date: '2026-10-01', statut: 'brouillon', tva: 20, lignes: [L1, { designation: 'B', qte: 2, pu: 18.75 }] }] });
  W.printDoc('factures', 'f1'); const h = nb(W.__html);
  vrai('le même printDoc sert aux factures : 49,99 € et 37,50 €', /49,99 €<\/td><\/tr>/.test(h) && /37,50 €<\/td><\/tr>/.test(h), h.match(/<td class="r">[^<]*<\/td><\/tr>/g));
  vrai('… et la quantité entière reste « 2 »', /<td class="c">2<\/td>/.test(h)); }

console.log('\n── 1253 · 2. ventes#2 — le texte du courriel de même ──');
{ const W = monde(); const t = nb(W.genDocTexte('devis', W.db.devis[0]));
  const bullets = t.split('\n').filter(l => l.startsWith('• '));
  v('population : trois puces', bullets.length, 3);
  vrai('⛔ « • Prestation — 1,5 × 33,33 € = 49,99 € » : quantité à virgule, ligne arrondie', bullets.every(l => l === '• Prestation — 1,5 × 33,33 € = 49,99 €'), bullets);
  vrai('… et le total TTC annoncé est celui du PDF (179,96 €)', /Total TTC : 179,96 €/.test(t), t.split('\n').slice(-6)); }

console.log('\n── 1253 · 3. ventes#3 / facturation#1 — un devis ne devient facture qu\'une fois ──');
{ const W = monde(); W.devisToFacture('d1');
  v('premier clic : une facture naît du devis (brouillon, devisId posé)', [W.db.factures.length, W.db.factures[0].devisId, W.db.factures[0].statut, W.db.factures[0].num], [1, 'd1', 'brouillon', 'FAC-2026-001']);
  v('… et le devis a ses 3 lignes copiées', W.db.factures[0].lignes.length, 3);
  const saves = W.__saves; W.__toasts.length = 0; W.__nav.length = 0;
  W.devisToFacture('d1'); W.devisToFacture('d1');
  v('⛔ deuxième et troisième clic (espacés) : AUCUNE facture de plus', W.db.factures.length, 1);
  v('… aucun numéro consommé, aucun enregistrement, aucune navigation vers un écran vide', [W.__saves, W.__nav], [saves, []]);
  vrai('… le toast NOMME la facture existante', W.__toasts.length === 2 && W.__toasts.every(t => /FAC-2026-001/.test(t)), W.__toasts);
  v('… et l\'OUVRE (la fiche de la facture existante)', W.__ouvert, ['formDoc(factures,n1)', 'formDoc(factures,n1)'].map(x => x.replace('n1', W.db.factures[0].id)));
  W.devisToFacture('d2');
  v('un AUTRE devis se convertit normalement (numéro suivant)', [W.db.factures.length, W.db.factures[1].num, W.db.factures[1].devisId], [2, 'FAC-2026-002', 'd2']); }
{ const W = monde({ can: { modifier: false } }); W.devisToFacture('d1'); W.devisToFacture('d1');
  vrai('sans le droit de modifier : le 2ᵉ clic ne crée rien non plus, et ouvre l\'aperçu (pas le formulaire)', W.db.factures.length === 1 && W.__ouvert.length === 0, [W.db.factures.length, W.__ouvert]); }
{ const W = monde({ can: { ajouter: false } }); W.devisToFacture('d1');
  v('⛔ permGarde(ajouter) reste en première instruction : refusé sans le droit', [W.db.factures.length, W.__toasts.length], [0, 1]); }
{ const W = monde({ factures: [{ id: 'fx', num: 'FAC-2026-001', devisId: '', date: '2026-10-01', statut: 'brouillon', lignes: [] }] }); W.devisToFacture('d1');
  v('une facture à devisId VIDE (née d\'ailleurs) ne bloque pas la conversion', W.db.factures.length, 2); }
{ const W = monde({ factures: [{ id: 'fa', num: 'FAC-2026-001', devisId: 'd1', date: '2026-10-01', statut: 'brouillon', lignes: [] }, { id: 'fb', num: 'FAC-2026-002', devisId: 'd1', date: '2026-10-01', statut: 'brouillon', lignes: [] }] });
  W.devisToFacture('d1');
  v('les doubles DÉJÀ en base ne sont pas supprimés, ni multipliés', W.db.factures.map(f => f.id), ['fa', 'fb']);
  vrai('… on ouvre la première', W.__ouvert[0] === 'formDoc(factures,fa)', W.__ouvert); }

console.log('\n── 1253 · 4. facturation#1 — la liste des devis : « →🧾 » seulement s\'il n\'y a pas encore de facture ──');
{ const W = monde(); W.docListView('devis', false); const h = W.__html;
  vrai('devis accepté sans facture : le bouton →🧾 est proposé, pour les deux devis', (h.match(/Convertir en facture/g) || []).length === 2 && !/Voir la facture/.test(h), h.length);
  W.devisToFacture('d1'); W.docListView('devis', false); const h2 = W.__html;
  vrai('⛔ d1 est converti : plus de →🧾 sur d1…', !/devisToFacture\('d1'\)" title="Convertir/.test(h2));
  vrai('… « Voir la facture » à la place, qui nomme la facture', /devisToFacture\('d1'\)" title="Voir la facture FAC-2026-001">Voir la facture/.test(h2), h2.slice(0, 200));
  vrai('… d2, pas converti, garde →🧾', /devisToFacture\('d2'\)" title="Convertir en facture">→🧾/.test(h2)); }
{ const W = monde({ can: { ajouter: false } }); W.docListView('devis', false);
  vrai('sans la case Ajouter : ni →🧾 ni « Voir la facture » (le bouton suit le droit du geste)', !/devisToFacture/.test(W.__html)); }

console.log('\n══ test-1253 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
