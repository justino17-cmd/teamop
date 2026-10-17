/* ══ j03 · r4#0 — « REPRENDRE » NE RATTACHE PAS UNE INTERVENTION À UN CLIENT QUI N'EXISTE PLUS ═══════════════════════
   Vague 2 (h01) : `multiReprendre` restitue le champ caché `cli-id` APRÈS les événements rejoués (sinon `cliFilter` le vide).
   Mais il le posait tel quel, même si le client avait été supprimé entre la capture et la reprise (collègue, synchro) :
   le champ texte affichait toujours « Boulangerie Au Bon Pain », `cli-id` portait un identifiant mort, et `saveIntervention`
   — qui ne retombe sur le nom que pour un identifiant VIDE — créait l'intervention liée à un client fantôme, « Intervention
   créée », sans un mot.

   Ce banc EXÉCUTE les vraies `multiCapturer` / `multiReprendre` / `cliFilter` (le DOM minimal est celui de test-1400, relu
   dans son fichier : une seule définition) puis la vraie `saveIntervention` (le bac à sable de g05-monde), ET enchaîne les
   deux : ce que la reprise laisse dans le formulaire est exactement ce que `saveIntervention` reçoit.
   Sonde au navigateur : scratchpad/gestion/correctifs/j03/sonde-j03.js.                                              */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const T1400 = fs.readFileSync(path.join(__dirname, 'test-1400.js'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* ── le DOM minimal de test-1400 : relu dans son fichier (extraction, pas copie) ── */
const a0 = T1400.indexOf('function bloc(debut)'), a1 = T1400.indexOf("console.log('\\n── 1400 · 0."), b0 = T1400.indexOf('const VIDES'), b1 = T1400.indexOf('const ex = (W, code)');
vrai('le DOM de test-1400 est trouvé', a0 > 0 && a1 > a0 && b0 > a1 && b1 > b0, [a0, a1, b0, b1]);
const CLE = 'elan_multi_u1';
const { monde } = new Function('fs', 'path', 'vm', 'BRUT', 'CLE', T1400.slice(a0, a1) + T1400.slice(b0, b1) + '\nreturn { monde };')(fs, path, vm, BRUT, CLE);
const ex = (W, code) => vm.runInContext(code, W);
const champ = (W, sel) => W.document.querySelector(sel);

const FORM_INTERV = `<div class="modal-head"><h3>Intervention</h3></div><form id="intform">
  <input type="hidden" name="clientId" id="cli-id" value="">
  <input id="cli-search" oninput="cliFilter(this.value)"><div id="cli-list" class="soc-list" style="display:none"></div>
  <input name="titre" value=""><input type="hidden" name="heure" value="09:00"><span id="deb-aff">09:00</span><div id="fin-dit"></div>
  <input type="hidden" name="duree" value="60"><div id="int-nuis"></div><div id="int-meth"></div></form>`;
const CLIENTS = [{ id: 'c1', nom: 'Boulangerie Au Bon Pain' }, { id: 'c2', nom: 'Bar' }];
/* une saisie en cours : client choisi par la liste, titre tapé → capturée → page rechargée (monde neuf) */
function reprise(clientsAuRetour) {
  const stock = new Map(), W1 = monde(stock);
  ex(W1, `openModal(${JSON.stringify(FORM_INTERV)});`);
  champ(W1, '[name="titre"]').value = 'Cuisine'; champ(W1, '#cli-search').value = 'Boulangerie Au Bon Pain'; champ(W1, '#cli-id').value = 'c1';
  ex(W1, 'multiCapturer()');
  const W2 = monde(stock);
  ex(W2, 'db.clients=' + JSON.stringify(clientsAuRetour) + "; current='devis'; multiReprendre('devis');");
  return W2;
}

console.log('\n── 1620 · 1. multiReprendre : le client existe encore → restitué (comme avant) ──');
{ const W = reprise(CLIENTS);
  v('cli-id restitué', champ(W, '#cli-id').value, 'c1');
  v('le texte du client aussi', champ(W, '#cli-search').value, 'Boulangerie Au Bon Pain');
  v('le titre est restitué', champ(W, '[name="titre"]').value, 'Cuisine');
  vrai('le toast est celui de la reprise', W.__toasts.some(t => /Reprise là où tu en étais/.test(t)), W.__toasts); }

console.log('\n── 1620 · 2. multiReprendre : le client a été supprimé entre-temps → rien n\'est rattaché, et on le DIT ──');
let Wperdu;
{ const W = Wperdu = reprise([CLIENTS[1]]);
  v('⛔ cli-id reste VIDE (pas l\'identifiant d\'un client qui n\'existe plus)', champ(W, '#cli-id').value, '');
  v('⛔ le texte du champ client est vidé (il affichait encore le nom du client supprimé, comme si le choix tenait)', champ(W, '#cli-search').value, '');
  v('   les autres champs sont restitués quand même (titre)', champ(W, '[name="titre"]').value, 'Cuisine');
  vrai('⛔ la personne est avertie : le toast dit que le client n\'existe plus', W.__toasts.some(t => /n.existe plus/.test(t)), W.__toasts);
  vrai('   et ne dit pas « Reprise là où tu en étais » en même temps', !W.__toasts.some(t => /là où tu en étais/.test(t)), W.__toasts); }
{ const W = reprise([]);
  v('aucun client du tout : cli-id vide aussi', champ(W, '#cli-id').value, ''); }

console.log('\n── 1620 · 3. saveIntervention : un identifiant de client mort ne s\'enregistre pas ──');
const G = require('./g05-monde.js');
const { monde: mondeG, interv } = G;
const BASE = { titre: 'Cuisine', date: '2026-10-20', heure: '09:00', duree: '60', statut: 'planifiee' };
function envoyer(db, data, id, texte) {
  const W = mondeG({ db });
  W.document = { querySelectorAll: () => [], getElementById: i => i === 'cli-search' ? { value: texte || '' } : null };
  W.exec('var _saveInt=saveIntervention;');
  W.__e = { preventDefault() {}, target: { __data: Object.assign({}, BASE, data) } };
  W.exec(id ? "_saveInt(__e,'" + id + "')" : '_saveInt(__e)');
  return W;
}
const dbNeuve = (interventions) => ({ interventions: interventions || [], factures: [], registres: [], clients: [CLIENTS[1]], devis: [], users: [], techniciens: [] });
{ const W = envoyer(dbNeuve(), { clientId: 'c1' }, '', 'Boulangerie Au Bon Pain');
  v('⛔ identifiant mort : aucune intervention créée', W.db.interventions.length, 0);
  vrai('⛔ et la personne en est avertie', W.__toasts.some(t => /n.existe plus/.test(t)), W.__toasts);
  v('   rien n\'a été sauvegardé', W.__saves, 0); }
{ const W = envoyer(dbNeuve(), { clientId: 'c2' }, '', 'Bar');
  v('un identifiant VIVANT enregistre normalement', [W.db.interventions.length, W.db.interventions[0] && W.db.interventions[0].clientId], [1, 'c2']);
  vrai('   « Intervention créée »', W.__toasts.some(t => /Intervention créée/.test(t)), W.__toasts); }
{ const W = envoyer(dbNeuve(), { clientId: '' }, '', 'Bar');
  v('un identifiant vide + un nom connu retombe sur le client (comportement d\'avant)', W.db.interventions[0] && W.db.interventions[0].clientId, 'c2'); }
{ /* modifier une fiche DÉJÀ liée à un client disparu (défaut d'avant) ne se bloque pas : on corrige son titre */
  const W = envoyer(dbNeuve([interv({ id: 'i9', clientId: 'cMort' })]), { titre: 'Titre corrigé', clientId: 'cMort' }, 'i9');
  v('une fiche déjà liée à un client disparu reste modifiable', W.db.interventions[0].titre, 'Titre corrigé');
  const W2 = envoyer(dbNeuve([interv({ id: 'i9', clientId: 'c2' })]), { titre: 'X', clientId: 'cMort' }, 'i9');
  v('mais RE-lier une fiche à un client disparu est refusé', [W2.db.interventions[0].clientId, W2.db.interventions[0].titre], ['c2', 'Dératisation']); }

console.log('\n── 1620 · 4. la chaîne entière : reprise → envoi du formulaire → rien de rattaché à un fantôme ──');
{ const lu = { clientId: champ(Wperdu, '#cli-id').value, texte: champ(Wperdu, '#cli-search').value, titre: champ(Wperdu, '[name="titre"]').value };
  const W = envoyer(dbNeuve(), { clientId: lu.clientId, titre: lu.titre }, '', lu.texte);
  v('le formulaire repris, envoyé sans rien changer : aucune intervention rattachée à un client inexistant',
    W.db.interventions.filter(i => !W.db.clients.some(c => c.id === i.clientId)).length, 0);
  vrai('   il demande de choisir un client (« Indique un client »)', W.__toasts.some(t => /Indique un client/.test(t)), W.__toasts);
  v('   et rien n\'est enregistré', [W.db.interventions.length, W.db.clients.length, W.__saves], [0, 1, 0]); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
