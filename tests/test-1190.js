/* ⛔ CE QUE CE FICHIER GARDE — LOT g08 : RÉCURRENCE DES INTERVENTIONS ET RAPPORT CLIENT (unité, durée).

   Quatre défauts, relevés au navigateur par les agents de test du 16 octobre 2026, rejoués ici sur les VRAIES
   fonctions extraites d'app.html (rien n'est recopié) :

   1. interventions#7 — `nextRecurDate` faisait `setMonth(+1)` sans borner : le 31 janvier se répétait le 3 mars
      (février sauté), le 30 novembre « trimestrielle » tombait en mars, le 29 février « annuelle » au 1er mars.
      On borne au dernier jour du mois cible ; et SANS dérive : l'occurrence suivante reprend le jour d'ancrage de la
      série (31 janv. -> 28 févr. -> 31 mars, pas 28 mars).
   2. interventions#6 — `intRecurNext` construisait l'occurrence sans `rapportModele` (la SOCIÉTE) : `docEntete()` sort
      alors le rapport, le devis, la facture du passage suivant au nom, SIRET, TVA et IBAN de l'entreprise principale.
   3. interventions#5 — le rapport imprimé et le PDF écrivaient `l.unite||''` : une ligne ajoutée par la Clôture guidée
      (sans champ `unite`) sortait « 2 » sans « L », dans un document biocide remis au client. La fiche et le registre
      lisent `prodLineUnit(l)` ; les deux documents aussi, désormais.
   4. interventions#15 — la section « Durée » montrait la durée PRÉVUE ; un passage de 95 min (prévu 60) disait 60.

   Les deux documents lisent les mêmes fonctions (`rapportDuree`, `rapportProduitsLibres`) : règle de test-802 § 5. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c, info) => { c ? ok++ : ko++; console.log('  ' + (c ? '✓' : '✗') + ' ' + t + (c || info === undefined ? '' : '  → ' + info)); };

/* découpe d'une déclaration dans le texte BRUT (une ancre qui ne se trouve pas = tranche vide = faux vert : on lève) */
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); const fin = m ? m.index : Math.min(APP.length, d + 80000);
  let bout = APP.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }
const existe = h => APP.indexOf(h) >= 0;

const FONCTIONS = ['function nextRecurDate(', 'function intRecurNext(', 'function prodLineUnit(', 'function rapportProduitsLibres(',
  'function rapportPdfStr(', 'async function printRapport(', 'function _pdfTranslit(', 'function _pdfTxt(', 'const _PDF_L=', 'function _pdfLarg(', 'function _pdfCoupe(',
  'const PH_MARQUE=', 'function photoPid(', 'function photoSrc(', 'function planImgSrc(', 'const MENTION_REGL=', 'function rapportChampsPerso(', 'function mentionRegl(', 'function ammVisible('];
if (existe('function rapportDuree(')) FONCTIONS.splice(3, 0, 'function rapportDuree(');
const SOURCES = FONCTIONS.map(decoupe);
vrai('les déclarations sont extraites du fichier réel (' + SOURCES.length + ')', SOURCES.every(x => x.length > 10));

function monter(base) {
  const W = { console, Map, Set, Object, JSON, String, Math, Date, Array, Number, Promise, Error, isNaN, parseInt, RegExp,
    atob: s => Buffer.from(s, 'base64').toString('latin1'), btoa: s => Buffer.from(s, 'latin1').toString('base64'),
    setTimeout: () => 0, __html: '', __uid: 0, __num: 0, __notifs: [], __histo: [],
    window: null, document: { getElementById: () => null } };
  W.window = { open: () => ({ document: { write: s => { W.__html += s; }, close() {} }, confirm: () => true, focus() {}, print() {}, close() {} }) };
  W.db = JSON.parse(JSON.stringify(base));
  vm.createContext(W);
  vm.runInContext(SOURCES.join('\n') + `
    function uid(){ return 'n'+(++__uid); } function intNum(){ return 'INT-2026-'+String(++__num+1).padStart(3,'0'); }
    function intTechIds(i){ return i.techIds||(i.techId?[i.techId]:[]); } function notifyTechNewInt(c){ __notifs.push(c.id); }
    function intHisto(i,t){ __histo.push(t); } function logEvent(){} function fmtShort(d){ return String(d||''); }
    function estMetier3D(){ return true; } /* ces bancs jouent la 3D : la mention et la colonne AMM y sont celles d'avant */ function todayISO(){ return '2026-10-16'; } function esc(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;'); }
    function techNames(i){ return 'Tom Sonde'; } function produit(id){ return (db.produits||[]).find(p=>p.id===id)||{}; }
    function prodLineName(l){ return l.nomLibre||produit(l.produitId).nom||'—'; } function prodLineAmm(l){ return produit(l.produitId).amm||''; }
    function rapportConstatLignes(i){ return []; } function t3dPdfHtml(){ return ''; } function paPdfHtml(){ return ''; }
    function docEntete(soc){ return {nom:soc||'ENTREPRISE PRINCIPALE',couleur:'#1E7A4E',logo:''}; } function docCoordLignes(){ return []; } function encreSur(){ return '#fff'; }
    function docNomGarde(){ return true; } function photosResoudre(){} function planImgsResoudre(){} function toast(){}
    const $=()=>null;`, W);
  return W;
}

console.log('\n══ 1. interventions#7 — LA RÉCURRENCE MENSUELLE NE SAUTE PAS UN MOIS ══\n');
{ const W = monter({ interventions: [] }); const N = (d, r, a) => W.nextRecurDate(d, r, a);
  v('31 janvier + mensuelle -> 28 février (pas le 3 mars)', N('2026-01-31', 'mensuelle'), '2026-02-28');
  v('31 janvier 2028 (bissextile) -> 29 février', N('2028-01-31', 'mensuelle'), '2028-02-29');
  v('30 novembre + trimestrielle -> 28 février (pas mars)', N('2026-11-30', 'trimestrielle'), '2027-02-28');
  v('31 août + semestrielle -> 28 février', N('2026-08-31', 'semestrielle'), '2027-02-28');
  v('29 février 2028 + annuelle -> 28 février 2029 (pas le 1er mars)', N('2028-02-29', 'annuelle'), '2029-02-28');
  v('31 mars + mensuelle -> 30 avril', N('2026-03-31', 'mensuelle'), '2026-04-30');
  v('30 décembre + mensuelle -> 30 janvier (passage d\'année)', N('2026-12-30', 'mensuelle'), '2027-01-30');
  v('un jour ordinaire ne bouge pas : 15 janvier -> 15 février', N('2026-01-15', 'mensuelle'), '2026-02-15');
  v('hebdomadaire inchangée', N('2026-01-31', 'hebdo'), '2026-02-07');
  v('bimensuelle inchangée', N('2026-01-31', 'bimensuelle'), '2026-02-14');
  v('une récurrence inconnue ne rend rien', N('2026-01-31', 'aucune'), '');
  /* sans dérive : l'ancre ramène le 31 quand le mois la permet */
  v('SANS dérive : 28 février, ancre 31 -> 31 mars (pas le 28)', N('2026-02-28', 'mensuelle', 31), '2026-03-31');
  v('   ancre 31, 31 mars -> 30 avril', N('2026-03-31', 'mensuelle', 31), '2026-04-30');
  v('   ancre 31, 30 avril -> 31 mai', N('2026-04-30', 'mensuelle', 31), '2026-05-31');
  v('   ancre 29 : 28 février 2029 annuelle -> 28 février 2030 (pas de 29 en 2030)', N('2029-02-28', 'annuelle', 29), '2030-02-28');
  v('   ancre 29 : 28 février 2031 annuelle -> 29 février 2032', N('2031-02-28', 'annuelle', 29), '2032-02-29');
  v('une occurrence DÉPLACÉE à la main repart de son jour : ancre 31 mais date 5 mars -> 5 avril', N('2026-03-05', 'mensuelle', 31), '2026-04-05');
  v('   ancre 31 et date 27 février (ce n\'est pas le 28 que l\'ancre aurait donné) -> 27 mars', N('2026-02-27', 'mensuelle', 31), '2026-03-27');
}

console.log('\n══ 2. interventions#7 + #6 — LA CHAÎNE VRAIE : intRecurNext crée l\'occurrence suivante ══\n');
{ const BASE = { interventions: [{ id: 'i0', num: 'INT-2026-001', titre: 'Passage', clientId: 'c1', techId: 't1', adresse: 'x', date: '2026-01-31', heure: '09:00', duree: 60,
    prio: 'normale', statut: 'terminee', recurrence: 'mensuelle', rapportModele: 'Beta Hygiene SAS', desc: '', montant: 50, groupId: '',
    moyenPaiement: 'cheque', aFacturer: true, finReel: 1, dureeReelle: 95, contratId: 'ctr1' }] };
  const W = monter(BASE); const I = W.db.interventions;
  const nd = W.intRecurNext(I[0]);
  v('la date rendue est le 28 février', nd, '2026-02-28');
  vrai('population : une occurrence a été créée', I.length === 2, 'taille ' + I.length);
  const o = I[1] || {};
  v('l\'occurrence est planifiée le 28 février', [o.date, o.statut], ['2026-02-28', 'planifiee']);
  v('⛔ elle garde la SOCIÉTÉ (rapportModele) — sinon l\'en-tête est celui de l\'entreprise principale', o.rapportModele, 'Beta Hygiene SAS');
  v('   et le document qu\'elle produira porte cette société', W.docEntete(o.rapportModele).nom, 'Beta Hygiene SAS');
  v('elle ne reprend PAS ce qui est propre au passage clos (moyenPaiement, aFacturer, finReel, dureeReelle)',
    ['moyenPaiement', 'aFacturer', 'finReel', 'dureeReelle'].filter(k => k in o), []);
  v('elle ne se rattache pas au contrat (un contrat génère SES passages)', 'contratId' in o, false);
  /* troisième tour : 28 février -> 31 mars, sans dérive */
  I[1].statut = 'terminee';
  const nd2 = W.intRecurNext(I[1]);
  v('SANS dérive : l\'occurrence suivante du 28 février tombe le 31 mars', nd2, '2026-03-31');
  I[2].statut = 'terminee';
  v('   puis le 30 avril', W.intRecurNext(I[2]), '2026-04-30');
  v('   la société voyage jusqu\'au bout de la série', I.map(x => x.rapportModele), ['Beta Hygiene SAS', 'Beta Hygiene SAS', 'Beta Hygiene SAS', 'Beta Hygiene SAS']);
  v('une intervention sans société (entreprise à une seule) reste sans société vide', monter({ interventions: [] }).intRecurNext({ id: 'z', recurrence: 'hebdo', date: '2026-01-05', titre: 't' }), '2026-01-12');
}

console.log('\n══ 3. interventions#5 — L\'UNITÉ D\'UNE LIGNE SANS CHAMP `unite` ══\n');
const BASEP = { clients: [{ id: 'cX', nom: 'Boulangerie Élise' }], produits: [{ id: 'p1', nom: 'ALTA 7000', amm: 'FR-1', ref: 'A7', unite: 'L' }],
  interventions: [{ id: 'i1', num: 'INT-2026-042', clientId: 'cX', titre: 'Passage', date: '2026-10-16', heure: '09:30', duree: 60, dureeReelle: 95, statut: 'terminee',
    produitsUtilises: [{ produitId: 'p1', qte: 2 }, { nomLibre: 'Gel blattes', qte: 1, unite: 'tube' }] }] };
function textesPdf(pdf) { const out = []; const re = /\(((?:\\.|[^\\)])*)\) Tj/g; let m; while ((m = re.exec(pdf))) out.push(m[1].replace(/\\(.)/g, '$1')); return out.join('\n'); }
(async () => {
  const W = monter(BASEP); const i = W.db.interventions[0];
  const E = { nom: 'Alpha', couleur: '#C0392B', lignes: [] };
  const pdf = textesPdf(W.rapportPdfStr(i, E, {}));
  vrai('population : la ligne du produit est dans le PDF', /ALTA 7000/.test(pdf), pdf.slice(0, 200));
  vrai('⛔ PDF : « 2 L » (l\'unité de la fiche produit), pas « 2 » seul', pdf.split('\n').includes('2 L'), JSON.stringify(pdf.split('\n').filter(l => /ALTA|^2/.test(l))));
  vrai('   la ligne qui porte SON unité la garde : « 1 tube »', /1 tube/.test(pdf));
  await W.printRapport('i1');
  const html = W.__html;
  vrai('population : le rapport imprimé a été écrit dans la fenêtre', /RAPPORT D'INTERVENTION/.test(html) && /ALTA 7000/.test(html), html.slice(0, 100));
  vrai('⛔ rapport imprimé : « 2 L » dans la cellule de quantité', />2 L<\/td>/.test(html), (html.match(/<td style="text-align:right">[^<]*<\/td>/g) || []).join(' | '));
  vrai('   la ligne qui porte SON unité la garde : « 1 tube »', />1 tube<\/td>/.test(html));

  console.log('\n══ 4. interventions#15 — LA DURÉE DU RAPPORT EST CELLE DU PASSAGE ══\n');
  vrai('population : la durée prévue (60) et la réelle (95) diffèrent', i.duree === 60 && i.dureeReelle === 95);
  vrai('⛔ rapport imprimé : « Durée : 95 min »', /Durée : 95 min/.test(html), (html.match(/Durée : [^<]*/) || [])[0]);
  vrai('   et plus « 60 min »', !/Durée : 60 min/.test(html));
  vrai('⛔ PDF : « 95 min »', /95 min/.test(pdf), (pdf.match(/Dur[^\n]*\n[^\n]*/) || [])[0]);
  vrai('   et plus « 60 min »', !/60 min/.test(pdf));
  /* sans durée réelle (pas encore terminée) : la prévue */
  const W2 = monter(BASEP); const j = W2.db.interventions[0]; delete j.dureeReelle; j.statut = 'planifiee';
  await W2.printRapport('i1');
  vrai('sans durée réelle, le rapport imprimé donne la durée prévue', /Durée : 60 min/.test(W2.__html));
  vrai('sans durée réelle, le PDF donne la durée prévue', /60 min/.test(textesPdf(W2.rapportPdfStr(j, E, {}))));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
