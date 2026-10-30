/* ══ g11 · SUPPRIMER SANS LAISSER D'ORPHELINS : CLIENT, BOX, FOURNISSEUR ═══════════════════════════════
   Trois suppressions qui retiraient une fiche en laissant derrière elle ce qui la désignait :

   · clients#6 — `delItem('clients')` demandait « Supprimer cet élément ? » à un client qui avait des
     interventions, des devis, des factures : elles restaient avec un client « — » (et sans adresse, qui
     venait du client). On ne REFUSE pas la suppression (aucune règle ne protège les factures ici : `delFacture`
     en supprime une avec le seul droit « Ventes · supprimer ») : on la CONFIRME en NOMMANT ce qui reste sans
     client — interventions, devis, factures, contrats, box, chiffres à l'appui.
   · stock#3 — `delItem('boxes')` détachait les bons et les demandes, mais pas `db.boxMvtAttente` : une
     demande de sortie en attente du DR restait « à valider » pour une box disparue, et « Valider » la
     passait en silence à « refuse » (box introuvable). Elle est maintenant REFUSÉE avec un motif lisible
     (« box supprimée »), par la même fonction que tout refus (`boxMvtRefuser` : le bon d'arrivage lié
     redevient « à réceptionner », l'auteur est prévenu). Les brouillons de la box partent.
   · achats#5 — `delFournisseur` ne disait pas que des bons le portaient, et le bon n'avait que
     `fournisseurId` : « Sans fournisseur », « e-mail manquant », PDF « FOURNISSEUR — ». On compte les bons
     (en cours / total) dans la confirmation, et le bon GARDE le nom (`b.fournisseur`, que tout l'écran lit
     déjà en repli) et l'adresse (`b.emailDest`).

   Ce banc EXÉCUTE les vraies `delItem`, `delFournisseur`, `boxMvtRefuser` et les aides de comptage,
   extraites d'app.html. Une collection sans lien se supprime comme avant.                               */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ Seuls les blocs de commentaire qui COMMENCENT une ligne (CLAUDE.md : le motif naïf avale du code). */
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

console.log('\n── 1200 · 0. la population ──');
const DEL = bloc('function delItem(coll,id){'), DELF = bloc('function delFournisseur(id){'), REF = bloc('function boxMvtRefuser(m,motif){');
const LIENS = ['function clientLiens(', 'function clientLiensTxt(', 'function liensPluriel(', 'function boxDemandesAttente(', 'function boxDemandesRetirer(', 'function fournisseurBons('].map(bloc);
v('les fonctions réelles sont trouvées', [DEL.length > 1500, DELF.length > 200, REF.length > 300], [true, true, true]);
v('⛔ une seule définition de chaque (une seconde gagnerait partout, en silence)',
  ['function delItem(', 'function delFournisseur(', 'function boxMvtRefuser(', 'function clientLiens(', 'function boxDemandesRetirer(', 'function fournisseurBons(', 'function liensPluriel(', 'function boxDemandesAttente(', 'function clientLiensTxt('].map(n => SRC.split(n).length - 1), [1, 1, 1, 1, 1, 1, 1, 1, 1]);
vrai('toutes les aides sont extraites (population non vide)', LIENS.every(b => b.length > 40), LIENS.map(b => b.length));

/* ── Le bac à sable : les vraies fonctions, des doubles pour l'écran. ── */
function monde(db, opts) {
  opts = opts || {};
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, db, __toasts: [], __confirms: [], __saves: 0, __push: [], __log: [],
    __reponse: opts.confirm !== false, currentUser: { id: 'uA', prenom: 'Justin', nom: 'Roux', role: opts.role || 'admin' } };
  vm.createContext(ctx);
  vm.runInContext(`
    var STOCKAGE_ID='stockage';
    var COLL_GRP={clients:'crm',boxes:'stock',fournisseurs:'com',interventions:'int'};
    function canCat(){ return true; } function can(){ return true; } function permGarde(){ return true; }
    function ptPeutCorriger(){ return true; }
    function estStockage(b){ return !!b&&b.id==='stockage'; }
    function boxTxt(s){ return s; } function toast(m){ __toasts.push(String(m)); } function confirm(m){ __confirms.push(String(m)); return __reponse; }
    function save(){ __saves++; } function closeModal(){} function go(){} function logEvent(a,b){ __log.push(a+' '+b); }
    var current='clients'; var views={fournisseurs(){}};
    function delSerieModal(){} function delIntModal(){} function serieAutresActifs(){ return []; }
    function techArchiver(){} function delUser(){}
    function fullName(u){ return (u.prenom||'')+' '+(u.nom||''); } function todayISO(){ return '2026-10-17'; }
    function delegationTracer(){} function pushNotify(t,b,u,d){ __push.push(t+' | '+b); }
    function boxMvtLibelle(m){ return 'mvt '+m.id; }
    function bonNum(b){ return b.numero||''; }
    ${LIENS.join('\n')}
    ${REF}
    ${DEL}
    ${DELF}
  `, ctx);
  return ctx;
}
const copie = o => JSON.parse(JSON.stringify(o));

/* ═════════════ 1 · CLIENTS ═════════════ */
console.log('\n── 1200 · 1. clients#6 — un client avec historique ──');
const baseClients = () => ({
  clients: [{ id: 'cA', nom: 'Hôtel de la Plage' }, { id: 'cB', nom: 'Boulangerie Dupont' }, { id: 'cC', nom: 'Café Seul' }],
  interventions: [{ id: 'i1', clientId: 'cA' }, { id: 'i2', clientId: 'cA' }, { id: 'i3', clientId: 'cB' }],
  devis: [{ id: 'd1', clientId: 'cA' }], factures: [{ id: 'f1', clientId: 'cB', num: 'F-1' }], contrats: [], boxes: [], fournisseurs: [], bons: []
});
{ /* a. client avec interventions + devis, sans facture : confirmation précise, rien n'est supprimé d'autre */
  const w = monde(baseClients()); w.delItem('clients', 'cA');
  vrai('la confirmation compte les interventions liées', /2 interventions/.test(w.__confirms[0] || ''), w.__confirms);
  vrai('la confirmation compte les devis liés', /1 devis/.test(w.__confirms[0] || ''), w.__confirms);
  vrai('elle NOMME le client', /Hôtel de la Plage/.test(w.__confirms[0] || ''), w.__confirms);
  vrai('elle dit que les éléments restent SANS client', /sans client/i.test(w.__confirms[0] || ''), w.__confirms);
  vrai('le message n\'est plus le générique « Supprimer cet élément ? »', !/^Supprimer cet élément \?$/.test(w.__confirms[0] || ''), w.__confirms);
  v('accepté : le client part', w.db.clients.map(c => c.id), ['cB', 'cC']);
  v('… et AUCUNE intervention, aucun devis n\'est supprimé', [w.db.interventions.length, w.db.devis.length], [3, 1]);
}
{ /* b. annulé : rien ne bouge */
  const w = monde(baseClients(), { confirm: false }); w.delItem('clients', 'cA');
  v('annulé : le client reste', w.db.clients.length, 3);
  v('annulé : rien n\'est enregistré', w.__saves, 0);
}
{ /* c. client avec facture : PAS de refus — une confirmation qui chiffre la facture et dit qu'elle reste sans client */
  const w = monde(baseClients()); w.delItem('clients', 'cB');
  vrai('une confirmation est proposée (la suppression n\'est pas interdite)', w.__confirms.length === 1, w.__confirms);
  vrai('… elle compte la facture : « 1 facture »', /1 facture/.test(w.__confirms[0] || ''), w.__confirms);
  vrai('… elle compte aussi l\'intervention liée', /1 intervention/.test(w.__confirms[0] || ''), w.__confirms);
  vrai('… elle dit que la facture reste SANS client', /sans client/i.test(w.__confirms[0] || '') && /facture sans client/.test(w.__confirms[0] || ''), w.__confirms);
  vrai('… et ne prétend PAS qu\'une facture ne se supprime pas', !/ne se supprime pas|obligation/i.test(w.__confirms[0] + w.__toasts.join('|')), [w.__confirms, w.__toasts]);
  v('accepté : le client part', w.db.clients.map(c => c.id), ['cA', 'cC']);
  v('… la facture est conservée (rien d\'autre n\'est supprimé)', w.db.factures.map(f => f.id), ['f1']);
  v('… l\'intervention aussi', w.db.interventions.length, 3);
  v('… une sauvegarde est faite', w.__saves, 1);
}
{ /* c'. facture liée mais annulé : rien ne bouge */
  const w = monde(baseClients(), { confirm: false }); w.delItem('clients', 'cB');
  v('annulé : le client reste, la facture aussi, rien enregistré', [w.db.clients.length, w.db.factures.length, w.__saves], [3, 1, 0]);
}
{ /* d. client sans lien : comme avant */
  const w = monde(baseClients()); w.delItem('clients', 'cC');
  v('sans lien : une confirmation, le client part', [w.__confirms.length, w.db.clients.map(c => c.id)], [1, ['cA', 'cB']]);
}
{ /* e. une box liée au client compte aussi */
  const b = baseClients(); b.boxes = [{ id: 'bx1', clientId: 'cC' }];
  const w = monde(b); w.delItem('clients', 'cC');
  vrai('une box rattachée au client est comptée', /1 box/.test(w.__confirms[0] || ''), w.__confirms);
}
{ /* f. le droit se lit AVANT tout : pas de confirmation sans droit */
  const w = monde(baseClients()); vm.runInContext('function canCat(){ return false; }', w); w.delItem('clients', 'cA');
  v('sans la case « supprimer » : ni confirmation ni suppression', [w.__confirms.length, w.db.clients.length], [0, 3]);
}

/* ═════════════ 2 · BOX ═════════════ */
console.log('\n── 1200 · 2. stock#3 — supprimer une box avec une demande de sortie en attente ──');
const baseBox = () => ({
  clients: [], interventions: [], devis: [], factures: [], contrats: [], fournisseurs: [],
  boxes: [{ id: 'bxT', nom: 'Box Cuisine' }, { id: 'bxZ', nom: 'Box Autre' }, { id: 'stockage', nom: 'Stockage' }],
  bons: [{ id: 'bonA', numero: 'BC-1', statut: 'arrivageNote', boxId: 'bxT', recuPar: 'Karim', recuLe: 1, arrivage: { enAttenteDR: true } }],
  demandes: [], boxDecisions: [{ id: 'bxT', ecartes: ['p1'] }, { id: 'bxZ', ecartes: ['p2'] }],
  boxMvtAttente: [
    { id: 'm1', statut: 'enAttente', type: 'retrait', boxId: 'bxT', produitId: 'alta', parId: 'uK' },
    { id: 'm2', statut: 'enAttente', type: 'arrivage', boxId: 'bxT', bcId: 'bonA', statutAvant: 'envoyee', parId: 'uK' },
    { id: 'm3', statut: 'brouillon', type: 'ajustementLot', boxId: 'bxT', parId: 'uK' },
    { id: 'm4', statut: 'enAttente', type: 'retrait', boxId: 'bxZ', produitId: 'alta', parId: 'uK' },
    { id: 'm5', statut: 'valide', type: 'retrait', boxId: 'bxT', produitId: 'alta', parId: 'uK' }]
});
{
  const w = monde(baseBox()); w.delItem('boxes', 'bxT');
  const att = id => w.db.boxMvtAttente.find(m => m.id === id);
  vrai('la box est supprimée', !w.db.boxes.find(b => b.id === 'bxT'));
  vrai('⛔ plus AUCUNE demande « en attente » ne vise la box supprimée', !w.db.boxMvtAttente.some(m => m.boxId === 'bxT' && m.statut === 'enAttente'), w.db.boxMvtAttente);
  v('la demande de retrait est REFUSÉE (et gardée : sa trace reste)', att('m1') && att('m1').statut, 'refuse');
  v('… avec un motif lisible', att('m1') && att('m1').motifRefus, 'box supprimée');
  v('l\'arrivage lié est refusé aussi', att('m2') && att('m2').statut, 'refuse');
  v('… et son bon redevient « envoyée » (à réceptionner), pas coincé en « arrivage noté »', w.db.bons[0].statut, 'envoyee');
  v('le brouillon de la box part (personne ne l\'enverra)', att('m3'), undefined);
  v('la demande d\'UNE AUTRE box est intacte', att('m4') && att('m4').statut, 'enAttente');
  v('l\'historique déjà validé reste tel quel', att('m5') && att('m5').statut, 'valide');
  v('l\'auteur est prévenu du refus', w.__push.length > 0 && /Refusé/.test(w.__push.join('|')), true);
  vrai('les décisions de nouveautés de l\'autre box ne sont pas touchées', w.db.boxDecisions.some(d => d.id === 'bxZ'), w.db.boxDecisions);
}
{
  const w = monde(baseBox()); const n = JSON.stringify(w.db.boxMvtAttente);
  const dlg = monde(baseBox(), { confirm: false }); dlg.delItem('boxes', 'bxT');
  v('annulé : aucune demande n\'est refusée ni retirée', JSON.stringify(dlg.db.boxMvtAttente), n);
  v('annulé : la box reste', dlg.db.boxes.length, 3);
  const c = monde(baseBox()); c.delItem('boxes', 'bxT');
  vrai('la confirmation annonce les 2 demandes qui seront refusées', /2 demandes?/.test(c.__confirms[0] || ''), c.__confirms);
}
{
  const w = monde(baseBox()); w.delItem('boxes', 'stockage');
  v('le Stockage ne se supprime toujours pas', [w.db.boxes.length, w.__confirms.length], [3, 0]);
  const s = baseBox(); s.boxMvtAttente = []; const x = monde(s); x.delItem('boxes', 'bxZ');
  vrai('une box sans demande : confirmation d\'avant, sans mention de demandes', x.__confirms.length === 1 && !/demande/.test(x.__confirms[0]), x.__confirms);
}

/* ═════════════ 3 · FOURNISSEUR ═════════════ */
console.log('\n── 1200 · 3. achats#5 — supprimer un fournisseur référencé par des bons ──');
const baseFour = () => ({
  clients: [], interventions: [], devis: [], factures: [], contrats: [], boxes: [],
  fournisseurs: [{ id: 'fA', nom: 'ARMOSA', email: 'cmd@armosa.fr' }, { id: 'fB', nom: 'ENSYSTEX', email: 'x@ens.fr' }, { id: 'fC', nom: 'ORCAD' }],
  bons: [{ id: 'b1', numero: 'BC-1', fournisseurId: 'fA', statut: 'prete' }, { id: 'b2', numero: 'BC-2', fournisseurId: 'fA', statut: 'envoyee' },
    { id: 'b3', numero: 'BC-3', fournisseurId: 'fA', statut: 'livree' }, { id: 'b4', numero: 'BC-4', fournisseurId: 'fB', statut: 'brouillon' }]
});
const nomBon = (w, b) => { const f = w.db.fournisseurs.find(x => x.id === b.fournisseurId); return (f ? f.nom : '') || b.fournisseur || 'Sans fournisseur'; };
{
  const w = monde(baseFour()); w.delFournisseur('fA');
  vrai('la confirmation compte les bons (3)', /3 bons/.test(w.__confirms[0] || ''), w.__confirms);
  vrai('… dont 2 encore en cours', /2 en cours/.test(w.__confirms[0] || ''), w.__confirms);
  vrai('… et nomme le fournisseur', /ARMOSA/.test(w.__confirms[0] || ''), w.__confirms);
  v('accepté : le fournisseur part', w.db.fournisseurs.map(f => f.id), ['fB', 'fC']);
  v('… aucun bon n\'est supprimé', w.db.bons.length, 4);
  v('⛔ chaque bon GARDE le nom du fournisseur supprimé', w.db.bons.filter(b => b.fournisseurId === 'fA').map(b => nomBon(w, b)), ['ARMOSA', 'ARMOSA', 'ARMOSA']);
  v('… et son adresse e-mail (le bon reste envoyable)', w.db.bons.filter(b => b.fournisseurId === 'fA').map(b => b.emailDest), ['cmd@armosa.fr', 'cmd@armosa.fr', 'cmd@armosa.fr']);
  v('les bons d\'un autre fournisseur ne sont pas touchés', [w.db.bons[3].fournisseur, w.db.bons[3].emailDest], [undefined, undefined]);
}
{
  const w = monde(baseFour(), { confirm: false }); w.delFournisseur('fA');
  v('annulé : le fournisseur reste, les bons ne sont pas modifiés', [w.db.fournisseurs.length, JSON.stringify(w.db.bons) === JSON.stringify(baseFour().bons)], [3, true]);
}
{
  const w = monde(baseFour()); w.delFournisseur('fC');
  vrai('un fournisseur sans bon : la confirmation d\'avant, sans mention de bons', w.__confirms.length === 1 && !/bon/.test(w.__confirms[0]), w.__confirms);
  v('… et il part', w.db.fournisseurs.map(f => f.id), ['fA', 'fB']);
  const x = monde(baseFour(), { role: 'technicien' }); x.delFournisseur('fA');
  v('réservé à l\'administrateur (inchangé)', [x.__confirms.length, x.db.fournisseurs.length], [0, 3]);
}
{ /* un bon qui avait déjà une adresse saisie pour lui ne la perd pas */
  const b = baseFour(); b.bons[0].emailDest = 'autre@armosa.fr'; const w = monde(b); w.delFournisseur('fA');
  v('l\'adresse déjà saisie sur le bon n\'est pas écrasée', w.db.bons[0].emailDest, 'autre@armosa.fr');
}

console.log('\n════ test-1200 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
