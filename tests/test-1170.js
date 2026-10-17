/* ══ g02 · NUMÉROS DE DOCUMENT (contrats, enveloppes, bons) ET ENCAISSEMENTS D'ENVELOPPE ═══════════════
   Bugs du testeur (ventes#5, facturation#12, achats#7, facturation#13, facturation#14), 16 octobre 2026.

   · ventes#5 / facturation#12 : formContrat et saveEnv numérotaient « longueur de la liste + 1 » : après la
     suppression d'un enregistrement qui n'est pas le dernier, le numéro proposé est DÉJÀ PRIS. Et
     `numPlafondRelever` ne lisait ni les contrats ni les enveloppes : leurs numéros supprimés reviendraient.
     CLAUDE.md : « un numéro de document ne se réutilise jamais ».
   · achats#7 : deux bons de commande pouvaient porter le même N° saisi à la main (`numDejaPris`).
   · facturation#13 : « Total encaissé » et « Chèques » comptaient les encaissements « En attente ».
   · facturation#14 : un encaissement de 0 € ou négatif était accepté.

   Ce banc EXÉCUTE les vraies fonctions d'app.html (extraites) dans un bac à sable : rien n'est recopié. Pas
   de motif sur du texte : chaque contrôle regarde ce que la fonction FAIT. APP_HTML=… vise un autre fichier
   (pour rejouer le banc contre le code d'avant).                                                          */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_HTML || path.join(__dirname, '..', 'app.html'), 'utf8');
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

console.log('\n── 1170 · 0. la population ──');
const F = {
  NUM_RE: ligne('const NUM_RE='), relever: bloc('function numPlafondRelever(){'), union: bloc('function numMaxUnion('), plafond: ligne('function numPlafond('),
  next: bloc('function nextNum('), pris: bloc('function numDejaPris('), doubles: bloc('function docNumsDoubles('),
  formContrat: bloc('function formContrat('), saveContrat: bloc('function saveContrat('), viewContrats: bloc('views.contrats=function(){'),
  saveEnv: bloc('function saveEnv('), formPaiement: bloc('function formPaiement('), savePaiement: bloc('function savePaiement('),
  payStat: ligne('const PAY_STAT='), envPaie: ligne('function envPaie('), envEnc: ligne('const envEncaisse='),
  envTotal: ligne('function envTotal('), envEsp: ligne('function envEsp('), envChq: ligne('function envChq('), envAtt: ligne('function envAttente('),
  bonValider: bloc('function bonValider('), bonGarder: bloc('function bonGarder('),
};
vrai('les fonctions de base sont trouvées', ['NUM_RE', 'relever', 'union', 'plafond', 'next', 'doubles', 'formContrat', 'saveContrat', 'saveEnv', 'formPaiement', 'savePaiement', 'payStat', 'envPaie', 'envTotal', 'envEsp', 'envChq', 'bonValider', 'bonGarder'].every(k => F[k].length > 10), Object.keys(F).filter(k => !F[k]));
// Sur le code d'AVANT ces trois-là n'existent pas : le bac à sable les remplace par des fonctions qui rendent l'ancien comportement.
const ABSENTS = { pris: !F.pris, envEnc: !F.envEnc, envAtt: !F.envAtt };
vrai('le code de g02 est présent (numDejaPris, envEncaisse, envAttente)', !ABSENTS.pris && !ABSENTS.envEnc && !ABSENTS.envAtt, ABSENTS);
v('⛔ une seule définition de numDejaPris (une seconde gagnerait partout, en silence)', SRC.split('function numDejaPris(').length - 1, 1);

const AN = new Date().getFullYear();
function monde(dbInit) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, isFinite, parseFloat,
    db: Object.assign({ contrats: [], enveloppes: [], bons: [], clients: [], techniciens: [], interventions: [], numMax: {} }, dbInit || {}),
    __toasts: [], __saves: 0, __html: '', currentUser: { id: 'u1', prenom: 'A', nom: 'B' } };
  vm.createContext(ctx);
  vm.runInContext(`var views={enveloppes(){},contrats(){}};
    ${F.NUM_RE.replace('const ', 'var ')}\n${F.relever}\n${F.union}\n${F.plafond}\n${F.next}\n${F.pris || 'function numDejaPris(){ return null; }'}\n${F.doubles}
    ${F.payStat.replace('const ', 'var ')}\n${F.envPaie}\n${(F.envEnc || '').replace('const ', 'var ')}\n${F.envTotal}\n${F.envEsp}\n${F.envChq}\n${F.envAtt || 'function envAttente(){ return undefined; }'}
    var __id=0; function uid(){ return 'n'+(++__id); }
    function toast(m){ __toasts.push(String(m)); } function save(){ numPlafondRelever(); __saves++; } function closeModal(){} function logEvent(){}
    function permGarde(){ return true; } function openModal(h){ __html=h; } function esc(s){ return s==null?'':String(s); }
    function todayISO(){ return '${AN}-06-01'; } function eur(n){ return n+' €'; } function ficheEnv(){}
    function clientPropose(){ return true; } function clientsProposes(){ return []; } function canCat(){ return true; }
    function FormData(t){ return Object.entries(t.__champs||{}); }
    var CTR_ST={actif:{l:'Actif'}}, FREQ={mensuel:'M'}, PAY_MODES=['Espèces','Chèque','Carte'];
    ${F.formContrat}\n${F.saveContrat}\n${F.saveEnv}\n${F.formPaiement}\n${F.savePaiement}`, ctx);
  return ctx;
}
const evt = champs => ({ preventDefault() {}, target: { __champs: champs, actif: { checked: true } } });
const numDe = html => { const m = /name="num"[^>]*value="([^"]*)"/.exec(html); return m && m[1]; };

console.log('\n── 1170 · 1. contrats : le plafond ne redescend jamais (ventes#5) ──');
{ const W = monde();
  for (let i = 1; i <= 3; i++) W.saveContrat(evt({ num: 'CTR-' + AN + '-00' + i, titre: 'C' + i, clientId: 'c', montant: '10' }), '');
  v('trois contrats créés', W.db.contrats.map(c => c.num), [1, 2, 3].map(i => 'CTR-' + AN + '-00' + i));
  W.db.contrats.shift(); W.save();
  vrai('population : il reste 2 contrats et le plafond vaut 3 (le contrat supprimé est dans la mémoire)', W.db.contrats.length === 2 && W.db.numMax['CTR-' + AN] === 3, [W.db.contrats.length, W.db.numMax]);
  W.formContrat('');
  v('⛔ le numéro proposé est 004 — jamais 003 (déjà porté), ni 001 (supprimé)', numDe(W.__html), 'CTR-' + AN + '-004');
  W.db.contrats.pop(); W.save(); W.formContrat('');
  v('même après suppression du dernier : 004 (le plafond a retenu 003)', numDe(W.__html), 'CTR-' + AN + '-004');
  const ex = W.db.contrats[0]; W.formContrat(ex.id);
  v('modifier un contrat garde son numéro', numDe(W.__html), ex.num); }

console.log('\n── 1170 · 2. contrats : un N° saisi à la main est unique ──');
{ const W = monde({ contrats: [{ id: 'a', num: 'CTR-' + AN + '-001', titre: 'Premier', clientId: 'c' }, { id: 'b', num: 'CTR-' + AN + '-002', titre: 'Second', clientId: 'c' }] });
  W.saveContrat(evt({ num: 'ctr-' + AN + '-001 ', titre: 'Intrus', clientId: 'c', montant: '1' }), '');
  v('⛔ le doublon (casse et espaces ignorés) est refusé : rien n\'est créé', W.db.contrats.length, 2);
  vrai('… et le message nomme le contrat en conflit', W.__toasts.some(t => /Premier/.test(t) && /déjà/.test(t)), W.__toasts);
  W.__toasts.length = 0;
  W.saveContrat(evt({ num: 'CTR-' + AN + '-009', titre: 'Neuf', clientId: 'c', montant: '1' }), '');
  v('contre-épreuve : un numéro libre passe', W.db.contrats.length, 3);
  W.saveContrat(evt({ num: 'CTR-' + AN + '-001', titre: 'Premier (renommé)', clientId: 'c', montant: '1' }), 'a');
  v('un contrat qui garde SON numéro se modifie (l\'enregistrement édité est exclu)', W.db.contrats.find(c => c.id === 'a').titre, 'Premier (renommé)');
  W.saveContrat(evt({ num: 'CTR-' + AN + '-002', titre: 'Premier', clientId: 'c', montant: '1' }), 'a');
  v('… mais ne peut pas prendre le numéro d\'un autre', W.db.contrats.find(c => c.id === 'a').num, 'CTR-' + AN + '-001');
  const W2 = monde({ contrats: [{ id: 'a', num: 'CTR-' + AN + '-003', titre: 'A', clientId: 'c' }, { id: 'b', num: 'CTR-' + AN + '-003', titre: 'B', clientId: 'c' }] });
  W2.saveContrat(evt({ num: 'CTR-' + AN + '-003', titre: 'B corrigé', clientId: 'c', montant: '1' }), 'b');
  v('un doublon déjà en base reste modifiable tant que son N° ne change pas (on ne renumérote pas seul)', W2.db.contrats.find(c => c.id === 'b').titre, 'B corrigé');
  v('… et la base n\'a pas été renumérotée', W2.db.contrats.map(c => c.num), ['CTR-' + AN + '-003', 'CTR-' + AN + '-003']); }

console.log('\n── 1170 · 3. numDejaPris : le helper ──');
{ const W = monde({ bons: [{ id: 'x', numero: 'BC-' + AN + '-001' }, { id: 'y', numero: '' }] });
  v('trouve par casse/espaces', (W.numDejaPris('bons', 'numero', ' bc-' + AN + '-001', '') || {}).id, 'x');
  v('exclut l\'enregistrement édité', W.numDejaPris('bons', 'numero', 'BC-' + AN + '-001', 'x'), null);
  v('un numéro vide n\'est jamais « pris » (même si un bon n\'en a pas)', [W.numDejaPris('bons', 'numero', '', ''), W.numDejaPris('bons', 'numero', '   ', ''), W.numDejaPris('bons', 'numero', null, '')], [null, null, null]);
  v('une collection absente ne jette pas', W.numDejaPris('nexistepas', 'num', 'X', ''), null); }

console.log('\n── 1170 · 4. enveloppes : numéro unique et plafond (facturation#12) ──');
{ const W = monde();
  for (let i = 0; i < 3; i++) W.saveEnv(evt({ nom: 'N' + i, prenom: 'P' }), '');
  v('trois enveloppes 001..003', W.db.enveloppes.map(e => e.numero), [1, 2, 3].map(i => 'ENV-' + AN + '-00' + i));
  W.db.enveloppes.shift(); W.save();
  W.saveEnv(evt({ nom: 'Nouvelle', prenom: 'P' }), '');
  v('⛔ après suppression de la 001 : la nouvelle est 004 (jamais 003, déjà prise)', W.db.enveloppes.map(e => e.numero), ['ENV-' + AN + '-002', 'ENV-' + AN + '-003', 'ENV-' + AN + '-004']);
  v('numéros tous distincts', new Set(W.db.enveloppes.map(e => e.numero)).size, 3);
  W.db.enveloppes.pop(); W.save(); W.saveEnv(evt({ nom: 'Autre', prenom: 'P' }), '');
  v('le numéro du DERNIER supprimé ne revient pas non plus (005)', W.db.enveloppes.map(e => e.numero).pop(), 'ENV-' + AN + '-005'); }

console.log('\n── 1170 · 5. fusion : le plafond se réunit par le MAXIMUM ──');
{ const W = monde();
  v('numMaxUnion garde le plus grand de chaque clé', W.numMaxUnion({ ['CTR-' + AN]: 7, ['ENV-' + AN]: 2 }, { ['CTR-' + AN]: 3, ['ENV-' + AN]: 9, ['BC-' + AN]: 1 }), { ['CTR-' + AN]: 7, ['ENV-' + AN]: 9, ['BC-' + AN]: 1 });
  W.db.numMax = W.numMaxUnion({ ['CTR-' + AN]: 3 }, { ['CTR-' + AN]: 6 }); W.formContrat('');
  v('le numéro proposé tient compte du plafond fusionné (007)', numDe(W.__html), 'CTR-' + AN + '-007'); }

console.log('\n── 1170 · 6. bons de commande : deux bons, jamais le même N° (achats#7) ──');
function mondeBon(bons) {
  const W = monde({ bons: bons || [], fournisseurs: [], boxes: [] });
  vm.runInContext(`var bonLignes=[{designation:'Produit',qte:1}], bonSites=[{}], bonsFilter='', _bonEditId='', __memo=0, current='bons', __nav=0, __champs={};
    function $(i){ return i==='bonform'?{__champs:__champs}:null; }
    function bonQteTot(){ return {ctn:1,u:0}; } function bonMemorise(){ __memo++; } function fournName(){ return ''; }
    function bonGroupes(){ return {'':bonLignes}; } function bonFourName(){ return ''; } function bonLivOf(){ return {}; } function fullName(){ return 'A B'; }
    function alert(m){ __toasts.push('ALERT '+m); } function go(){ __nav++; } views.bons=function(){ __nav++; };
    ${F.bonValider}\n${F.bonGarder}`, W);
  return W;
}
const chBon = (W, o) => vm.runInContext('__champs=' + JSON.stringify(Object.assign({ numero: '', date: AN + '-06-01', statut: 'prete', fournisseurId: '', boxId: '', notes: '', societe: '' }, o)), W);
{ const W = mondeBon([{ id: 'b1', numero: 'BC-' + AN + '-001', statut: 'prete' }]);
  chBon(W, { numero: 'BC-' + AN + '-001' }); W.bonValider('');
  v('⛔ le second BC-' + AN + '-001 est refusé : un seul bon en base', W.db.bons.length, 1);
  vrai('… le message nomme le numéro et rien n\'a été mémorisé au catalogue', W.__toasts.some(t => /BC-\d{4}-001/.test(t) && /déjà/.test(t)) && vm.runInContext('__memo', W) === 0, [W.__toasts, vm.runInContext('__memo', W)]);
  chBon(W, { numero: ' bc-' + AN + '-001 ' }); W.bonValider('');
  v('… casse et espaces n\'y changent rien', W.db.bons.length, 1);
  chBon(W, { numero: 'BC-' + AN + '-002' }); W.bonValider('');
  v('contre-épreuve : un numéro libre crée le bon', W.db.bons.map(b => b.numero), ['BC-' + AN + '-001', 'BC-' + AN + '-002']);
  chBon(W, { numero: 'BC-' + AN + '-001' }); W.bonValider('b1');
  v('modifier un bon sous SON numéro passe', W.db.bons.length, 2);
  chBon(W, { numero: 'BC-' + AN + '-002' }); W.bonValider('b1');
  v('… mais pas sous celui d\'un autre', W.db.bons.find(b => b.id === 'b1').numero, 'BC-' + AN + '-001'); }
{ const W = mondeBon([{ id: 'b1', numero: 'BC-' + AN + '-005', statut: 'prete' }, { id: 'b2', numero: 'BC-' + AN + '-005', statut: 'prete' }]);
  chBon(W, { numero: 'BC-' + AN + '-005', statut: 'envoyee', notes: 'n' }); W.bonValider('b2');
  v('doublon d\'avant : le bon reste modifiable sous son numéro', W.db.bons.find(b => b.id === 'b2').notes, 'n'); }

console.log('\n── 1170 · 6 bis. « Garder de côté » : le second chemin qui écrit un N° saisi (relecture achats#7) ──');
const garder = (W, num, editId) => { chBon(W, { numero: num }); vm.runInContext('_bonEditId=' + JSON.stringify(editId || ''), W); W.bonGarder(); };
{ const W = mondeBon([{ id: 'b1', numero: 'BC-' + AN + '-001', statut: 'prete' }]);
  garder(W, 'BC-' + AN + '-001');
  v('⛔ garder de côté un second BC-' + AN + '-001 est refusé : un seul bon en base', W.db.bons.length, 1);
  vrai('… le message nomme le numéro, aucun enregistrement, la fenêtre reste ouverte', W.__toasts.some(t => /BC-\d{4}-001/.test(t) && /déjà/.test(t)) && W.__saves === 0, [W.__toasts, W.__saves]);
  garder(W, ' bc-' + AN + '-001 ');
  v('… casse et espaces n\'y changent rien', W.db.bons.length, 1);
  garder(W, 'BC-' + AN + '-002');
  v('contre-épreuve : un numéro libre crée le brouillon', W.db.bons.map(b => b.numero + ':' + b.statut), ['BC-' + AN + '-001:prete', 'BC-' + AN + '-002:brouillon']);
  const bro = W.db.bons[1].id;
  garder(W, 'BC-' + AN + '-002', bro);
  v('un brouillon se regarde sous SON numéro sans se bloquer lui-même', W.db.bons.length, 2);
  garder(W, 'BC-' + AN + '-001', bro);
  v('… mais pas sous celui d\'un autre', W.db.bons.find(b => b.id === bro).numero, 'BC-' + AN + '-002');
  garder(W, '', null);
  vrai('sans numéro saisi, il en prend un libre (jamais un existant)', new Set(W.db.bons.map(b => b.numero)).size === W.db.bons.length && W.db.bons.length === 3, W.db.bons.map(b => b.numero));
  // le chemin signalé par la relecture : garder puis valider ne doit pas laisser passer le doublon
  const W2 = mondeBon([{ id: 'b1', numero: 'BC-' + AN + '-001', statut: 'prete' }]);
  garder(W2, 'BC-' + AN + '-001'); chBon(W2, { numero: 'BC-' + AN + '-001' }); vm.runInContext('_bonEditId=""', W2); W2.bonValider('');
  v('⛔ garder puis valider le même N° : toujours un seul bon BC-001', W2.db.bons.filter(b => b.numero === 'BC-' + AN + '-001').length, 1); }
{ const W = mondeBon([{ id: 'b1', numero: 'BC-' + AN + '-005', statut: 'brouillon' }, { id: 'b2', numero: 'BC-' + AN + '-005', statut: 'brouillon' }]);
  chBon(W, { numero: 'BC-' + AN + '-005', notes: 'n' }); vm.runInContext('_bonEditId="b2"', W); W.bonGarder();
  v('doublon d\'avant : le brouillon reste modifiable sous son numéro', W.db.bons.find(b => b.id === 'b2').notes, 'n'); }

console.log('\n── 1170 · 7. encaissements : seul « Encaissé » compte (facturation#13) ──');
{ const W = monde();
  const e = { paiements: [{ mode: 'Chèque', montant: 200, statut: 'attente' }, { mode: 'Chèque', montant: 50, statut: 'encaisse' }, { mode: 'Espèces', montant: 30, statut: 'encaisse' },
    { mode: 'Espèces', montant: 99, statut: 'annule' }, { mode: 'Carte', montant: 10 }, { mode: 'Chèque', montant: 5, statut: 'inconnu' }] };
  v('population : 6 encaissements dont 1 en attente et 1 annulé', e.paiements.length, 6);
  v('⛔ Total encaissé = 50 + 30 + 10 (statut absent = encaissé) + 5 (statut inconnu lu « Encaissé » par la fiche)', W.envTotal(e), 95);
  v('⛔ Chèques = 50 + 5 : le chèque en attente (200) n\'y est PAS', W.envChq(e), 55);
  v('Espèces = 30 (l\'annulé n\'y est pas)', W.envEsp(e), 30);
  v('l\'attente se dit à part : 200', W.envAttente(e), 200);
  v('une enveloppe sans paiement vaut 0 partout', [W.envTotal({}), W.envChq({}), W.envAttente({})], [0, 0, 0]);
  vrai('ce que la fiche affiche pour un statut inconnu est bien « Encaissé » (même règle que le compte)', /PAY_STAT\[p\.statut\]\|\|PAY_STAT\.encaisse/.test(SRC), null); }

console.log('\n── 1170 · 8. encaissements : montant > 0 exigé (facturation#14) ──');
{ const cas = [['0', 'zéro'], ['', 'vide'], ['abc', 'NaN'], ['-30', 'négatif'], ['0,00', 'zéro avec virgule'], ['-0.5', 'négatif décimal']];
  for (const [m, nom] of cas) {
    const W = monde({ enveloppes: [{ id: 'e1', numero: 'ENV-1', paiements: [] }] });
    W.savePaiement(evt({ mode: 'Carte', montant: m, date: AN + '-06-01', reference: '', statut: 'encaisse' }), 'e1');
    vrai('⛔ ' + nom + ' (« ' + m + ' ») est refusé et dit pourquoi', W.db.enveloppes[0].paiements.length === 0 && W.__toasts.length === 1 && /montant|négatif/.test(W.__toasts[0]) && W.__saves === 0, [W.db.enveloppes[0].paiements, W.__toasts]);
  }
  const W = monde({ enveloppes: [{ id: 'e1', numero: 'ENV-1', paiements: [] }] });
  W.savePaiement(evt({ mode: 'Carte', montant: '12,50', date: AN + '-06-01', reference: '', statut: 'encaisse' }), 'e1');
  v('contre-épreuve : « 12,50 » (virgule) est accepté à 12.5', W.db.enveloppes[0].paiements.map(p => p.montant), [12.5]);
  W.savePaiement(evt({ mode: 'Carte', montant: '0.01', date: AN + '-06-01', reference: '', statut: 'attente' }), 'e1');
  v('0,01 € passe (la limite basse est ouverte)', W.db.enveloppes[0].paiements.length, 2);
  W.formPaiement('e1');
  vrai('le champ porte min="0.01" (le navigateur le dit avant l\'envoi)', /<input[^>]*name="montant"[^>]*min="0\.01"|<input[^>]*min="0\.01"[^>]*name="montant"/.test(W.__html)); }

console.log('\n── 1170 · 9. contrats : le bandeau des doublons déjà en base ──');
function vueContrats(contrats) {
  const W = monde({ contrats });
  vm.runInContext(`var __content=''; function $(i){ return {set innerHTML(h){ __content=h; }}; } function setHeader(){} function visibleDocs(l){ return l; } function ctrRappels(){ return []; } function ctrBandeau(){ return ''; }
    function ctrPastille(){ return ''; } function badge(){ return ''; } function clientName(){ return ''; } function fmtShort(d){ return d; } function fmtShortAn(d){ return d; } function tableCard(){ return 'TABLE'; } function emptyState(){ return ''; }
    function ctrFreqDays(){ return 30; } function iAjDummy(){}
    ${F.viewContrats}`, W);
  W.views.contrats(); return { W, html: vm.runInContext('__content', W) };
}
{ const { W, html } = vueContrats([{ id: 'a', num: 'CTR-1', titre: 'A', clientId: 'c', dateDebut: '2026-01-01' }, { id: 'b', num: 'CTR-1', titre: 'B', clientId: 'c', dateDebut: '2026-01-02' }]);
  vrai('⛔ le doublon CTR-1 est annoncé en tête de la liste', /1 numéro en double/.test(html) && /CTR-1/.test(html), html.slice(0, 200));
  v('… sans renuméroter (les deux gardent CTR-1)', W.db.contrats.map(c => c.num), ['CTR-1', 'CTR-1']);
  const r = vueContrats([{ id: 'a', num: 'CTR-1', titre: 'A', clientId: 'c' }]);
  vrai('contre-épreuve : pas de doublon, pas de bandeau', !/en double/.test(r.html)); }

console.log('\n══ test-1170 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
