/* ══ g13 · ABSENCES — planning#7 (dates d'une absence VALIDÉE) et planning#8 (deux absences qui se recoupent) ═══
   planning#7 : `saveAbsence` fait `{...ancienne,...d}` sans toucher au statut. Un technicien déplaçait donc les
   dates d'une absence VALIDÉE (24 jours posés au 01–24/12) et elle restait « Validée par … » : une décision de
   responsable attachée à des dates qu'il n'a jamais vues. Le correctif : quand la période (ou le type, ou la
   personne) change et que l'éditeur n'est pas valideur (`absPeutValider`), l'absence repart en attente, sa
   décision effacée, et les responsables sont prévenus ; un valideur qui modifie garde sa décision.
   planning#8 : deux « Congés payés » du 02 au 06/11 pour la même personne étaient acceptées, et `absSolde`
   additionnait chaque absence (pris=10, reste=15 au lieu de 5/20). Le correctif : `saveAbsence` refuse un
   chevauchement (refusées et annulées exclues, l'absence éditée écartée) avec un toast qui nomme l'existante,
   et `absSolde` ne compte qu'une fois un jour recoupé (doublons déjà en base).

   Ce banc EXÉCUTE les vraies `saveAbsence`, `absPeutValider`, `absChevauche`, `absSolde`, `absJoursOuvres`,
   `absJoursListe` extraites d'app.html, dans un bac à sable. Les sondes navigateur : scratchpad/gestion/
   correctifs/g13/ (bug-abs-edit-valide.js, bug-abs-doublon.js).                                              */
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
const FN = n => bloc('function ' + n + '(');
const NOMS = ['saveAbsence', 'absPeutValider', 'absStatut', 'absValidee', 'absJoursOuvres', 'estOuvre', 'estFerie', 'feriesAn', 'shiftDay',
  'absSolde', 'absPeriodeRef', 'absDroit', 'absCompteSolde', 'absInfo'];
const FONC = Object.fromEntries(NOMS.map(n => [n, FN(n)]));
const OPT = ['absChevauche', 'absJoursListe', 'absValideursIds'];   // nées avec les correctifs : absentes du code d'avant
OPT.forEach(n => { FONC[n] = FN(n); });
const iA = SRC.indexOf('const ABS_INFO={'), ABS_INFO = SRC.slice(iA, SRC.indexOf('\n};', iA) + 3);

console.log('\n── 1140 · 0. la population ──');
v('les fonctions du bac à sable sont trouvées', NOMS.map(n => FONC[n].length > 40), NOMS.map(() => true));
vrai('la table des types est trouvée', ABS_INFO.length > 500 && /conge\s*:/.test(ABS_INFO), ABS_INFO.length);
v('⛔ une seule définition de chaque (une seconde gagnerait partout, en silence)',
  NOMS.concat(OPT).map(n => SRC.split('function ' + n + '(').length - 1 > 1 ? n : ''), NOMS.concat(OPT).map(() => ''));

/* Le monde : « aujourd'hui » vaut 16/10/2026 (période de congés du 1ᵉʳ juin 2026 au 31 mai 2027). */
function monde(absences, moi, users) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number,
    db: { absences, users: users || [], techniciens: [{ id: 'tS', nom: 'Sophie Martin', droitConges: 25 }, { id: 'tK', nom: 'Karim Benali', droitConges: 25 }] },
    currentUser: moi, __toasts: [], __push: [], __saves: 0, __log: [] };
  vm.createContext(ctx);
  vm.runInContext(`${ABS_INFO}
    const ABS_TYPES=Object.fromEntries(Object.entries(ABS_INFO).map(([k,v])=>[k,v.l]));
    const _FERIES={};
    var absJustifTmp='', absJustifNom='', views={absences(){}};
    function todayISO(){ return '2026-10-16'; }
    function can(c){ return userCap(currentUser,c); }
    function userCap(u,c){ return !!u && (u.role==='admin' || u.role==='chef'); }
    function myTechId(){ return currentUser.techId||null; }
    function permGarde(){ return true; }
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function closeModal(){}
    function logEvent(t,d){ __log.push(t); }
    function uid(){ return 'n'+(__saves+Math.floor(Math.random()*1e6)); }
    function techName(id){ const t=db.techniciens.find(x=>x.id===id); return t?t.nom:''; }
    function fmtShort(i){ return i.slice(8)+'/'+i.slice(5,7); }
    function pushNotify(t,b,u,d){ __push.push({t,b,u,d}); }
    function fullName(u){ return u.prenom+' '+u.nom; }
    ${Object.values(FONC).join('\n')}`, ctx);
  return ctx;
}
const adminU = { id: 'uA', prenom: 'Justin', nom: 'Roux', role: 'admin', actif: true };
const techU = { id: 'uK', prenom: 'Karim', nom: 'Benali', role: 'technicien', actif: true, techId: 'tK' };
const sophieU = { id: 'uS', prenom: 'Sophie', nom: 'Martin', role: 'technicien', actif: true, techId: 'tS' };
const chef2 = { id: 'uC', prenom: 'Léa', nom: 'Dupuis', role: 'chef', actif: true };
const USERS = () => [adminU, techU, sophieU, chef2].map(u => JSON.parse(JSON.stringify(u)));
const sauver = (W, id, champs) => W.saveAbsence({ preventDefault() {}, target: champs }, id);
/* saveAbsence lit FormData(e.target) : dans le bac à sable, FormData rend simplement les champs. */
function avecFormData(W) { vm.runInContext('function FormData(t){ return Object.entries(t); }', W); return W; }
const ABS_VALIDEE = () => ({ id: 'ab1', techId: 'tK', type: 'conge', du: '2026-10-26', au: '2026-10-26', statut: 'validee', parQui: 'Justin Roux', leQuand: '2026-10-10', motif: 'ok', creePar: 'uK', creeLe: '2026-10-10' });

console.log('\n── 1140 · 1. ⛔ planning#7 — un technicien déplace les dates d\'une absence VALIDÉE ──');
{ const W = avecFormData(monde([ABS_VALIDEE()], techU, USERS()));
  sauver(W, 'ab1', { techId: 'tK', type: 'conge', du: '2026-12-01', au: '2026-12-24', demi: '', note: '' });
  const a = W.db.absences[0];
  v('les dates ont bien changé (l\'enregistrement a eu LIEU)', [a.du, a.au, W.__saves], ['2026-12-01', '2026-12-24', 1]);
  v('⛔⛔ … et l\'absence n\'est PLUS validée : elle repart en attente', a.statut, 'attente');
  v('⛔ … la décision d\'avant est effacée (qui, quand, motif)', [a.parQui, a.leQuand, a.motif], ['', '', '']);
  vrai('… et on le DIT à l\'éditeur', W.__toasts.some(t => /attente/i.test(t)), W.__toasts);
  const p = W.__push[0];
  vrai('⛔ … les responsables sont prévenus (le chef et l\'administrateur — pas l\'éditeur lui-même)', p && p.d.slice().sort().join() === 'uA,uC', W.__push);
  vrai('… et la notification mène aux absences', p && /#v=absences/.test(p.u), p && p.u);
  v('la solde compte la demande en attente, plus en pris', [W.absSolde('tK').pris, W.absSolde('tK').demande > 0], [0, true]); }
{ const W = avecFormData(monde([ABS_VALIDEE()], techU, USERS()));
  sauver(W, 'ab1', { techId: 'tK', type: 'maladie', du: '2026-10-26', au: '2026-10-26', demi: '', note: '' });
  v('⛔ le TYPE seul change aussi (congé → maladie) : à revalider', W.db.absences[0].statut, 'attente'); }
{ const W = avecFormData(monde([ABS_VALIDEE()], techU, USERS()));
  sauver(W, 'ab1', { techId: 'tK', type: 'conge', du: '2026-10-26', au: '2026-10-26', demi: '', note: 'RDV à 9h' });
  const a = W.db.absences[0];
  v('contre-épreuve : la NOTE seule change → la validation tient (rien de ce qui a été validé n\'a bougé)', [a.statut, a.parQui, W.__push.length, a.note], ['validee', 'Justin Roux', 0, 'RDV à 9h']); }
{ const W = avecFormData(monde([ABS_VALIDEE()], adminU, USERS()));
  sauver(W, 'ab1', { techId: 'tK', type: 'conge', du: '2026-12-01', au: '2026-12-24', demi: '', note: '' });
  const a = W.db.absences[0];
  v('⛔ contre-épreuve : un VALIDEUR (administrateur, pas sa propre absence) garde sa décision en la modifiant', [a.du, a.statut, a.parQui, W.__push.length], ['2026-12-01', 'validee', 'Justin Roux', 0]); }
{ const ab = ABS_VALIDEE(); ab.techId = 'tS'; const W = avecFormData(monde([ab], chef2, USERS()));
  sauver(W, 'ab1', { techId: 'tS', type: 'conge', du: '2026-11-03', au: '2026-11-04', demi: '', note: '' });
  v('contre-épreuve : un responsable qui modifie l\'absence d\'un AUTRE garde la décision', W.db.absences[0].statut, 'validee'); }
{ const ab = ABS_VALIDEE(); delete ab.statut; delete ab.parQui; delete ab.leQuand;
  const W = avecFormData(monde([ab], techU, USERS()));
  sauver(W, 'ab1', { techId: 'tK', type: 'conge', du: '2026-12-01', au: '2026-12-24', demi: '', note: '' });
  v('une absence d\'AVANT le système de statut (« validée » par défaut) suit la même règle', W.db.absences[0].statut, 'attente'); }
{ const W = avecFormData(monde([], techU, USERS()));
  sauver(W, '', { techId: 'tK', type: 'conge', du: '2026-10-26', au: '2026-10-26', demi: '', note: '' });
  v('contre-épreuve : une CRÉATION naît en attente comme avant, sans notification de « revalidation »', [W.db.absences[0].statut, W.__push.length], ['attente', 0]); }

console.log('\n── 1140 · 2. ⛔ planning#8 — deux absences qui se recoupent ──');
const conge = (id, du, au, extra) => Object.assign({ id, techId: 'tS', type: 'conge', du, au, statut: 'validee', parQui: 'Justin Roux', leQuand: '2026-10-10', creePar: 'uA', creeLe: '2026-10-10' }, extra || {});
{ const W = avecFormData(monde([conge('x1', '2026-11-02', '2026-11-06')], adminU, USERS()));
  sauver(W, '', { techId: 'tS', type: 'conge', du: '2026-11-02', au: '2026-11-06', demi: '', note: '' });
  v('⛔⛔ le même congé redéposé : REFUSÉ (rien d\'ajouté)', [W.db.absences.length, W.__saves], [1, 0]);
  vrai('… le toast NOMME l\'existante (la personne, le type, les dates)', W.__toasts.some(t => /Sophie Martin/.test(t) && /Congés payés/.test(t) && /02\/11/.test(t) && /06\/11/.test(t)), W.__toasts); }
{ const W = avecFormData(monde([conge('x1', '2026-11-02', '2026-11-06')], adminU, USERS()));
  sauver(W, '', { techId: 'tS', type: 'maladie', du: '2026-11-06', au: '2026-11-09', demi: '', note: '' });
  v('⛔ un recoupement partiel (le dernier jour) est refusé aussi', W.db.absences.length, 1);
  sauver(W, '', { techId: 'tS', type: 'conge', du: '2026-11-09', au: '2026-11-10', demi: '', note: '' });
  v('contre-épreuve : le lendemain de la fin ne recoupe pas', W.db.absences.length, 2);
  sauver(W, '', { techId: 'tK', type: 'conge', du: '2026-11-02', au: '2026-11-06', demi: '', note: '' });
  v('contre-épreuve : la MÊME période pour une AUTRE personne passe', W.db.absences.length, 3); }
{ const W = avecFormData(monde([conge('x1', '2026-11-02', '2026-11-06', { statut: 'refusee' }), conge('x2', '2026-11-02', '2026-11-06', { statut: 'annulee' })], adminU, USERS()));
  sauver(W, '', { techId: 'tS', type: 'conge', du: '2026-11-02', au: '2026-11-06', demi: '', note: '' });
  v('contre-épreuve : une absence REFUSÉE ou ANNULÉE ne bloque pas', W.db.absences.length, 3); }
{ const W = avecFormData(monde([conge('x1', '2026-11-02', '2026-11-06', { statut: 'attente' })], adminU, USERS()));
  sauver(W, '', { techId: 'tS', type: 'conge', du: '2026-11-04', au: '2026-11-04', demi: '', note: '' });
  v('une demande EN ATTENTE bloque aussi (elle compte au solde)', W.db.absences.length, 1);
  sauver(W, 'x1', { techId: 'tS', type: 'conge', du: '2026-11-02', au: '2026-11-07', demi: '', note: '' });
  v('contre-épreuve : modifier SA PROPRE période (l\'absence éditée est exclue de la comparaison) passe', [W.db.absences[0].au, W.db.absences.length], ['2026-11-07', 1]); }
{ const W = avecFormData(monde([conge('x1', '2026-11-03', '2026-11-03', { demi: 'matin' })], adminU, USERS()));
  sauver(W, '', { techId: 'tS', type: 'conge', du: '2026-11-03', au: '2026-11-03', demi: 'aprem', note: '' });
  v('contre-épreuve : un matin et un après-midi du même jour ne se recoupent pas', W.db.absences.length, 2);
  sauver(W, '', { techId: 'tS', type: 'conge', du: '2026-11-03', au: '2026-11-03', demi: 'matin', note: '' });
  v('… mais deux matins, si', W.db.absences.length, 2); }
{ const W = avecFormData(monde([conge('x1', '2026-11-02', '2026-11-06'), conge('x2', '2026-11-02', '2026-11-06')], adminU, USERS()));
  sauver(W, 'x2', { techId: 'tS', type: 'conge', du: '2026-11-02', au: '2026-11-06', demi: '', note: 'corrigée' });
  v('un doublon d\'AVANT la règle : corriger sa note (période inchangée) reste possible', [W.db.absences[1].note, W.__saves], ['corrigée', 1]); }

console.log('\n── 1140 · 3. ⛔ planning#8 — absSolde ne compte pas deux fois un jour recoupé (doublons déjà en base) ──');
{ const W = monde([conge('x1', '2026-11-02', '2026-11-06'), conge('x2', '2026-11-02', '2026-11-06')], adminU, USERS());
  const so = W.absSolde('tS');
  v('⛔⛔ deux fois le même congé de 5 jours ouvrés : 5 pris (pas 10), 20 restants (pas 15)', [so.pris, so.reste], [5, 20]); }
{ const W = monde([conge('x1', '2026-11-02', '2026-11-04'), conge('x2', '2026-11-04', '2026-11-06')], adminU, USERS());
  v('un recoupement partiel (le 04/11 commun) : 5 jours, pas 6', W.absSolde('tS').pris, 5); }
{ const W = monde([conge('x1', '2026-11-02', '2026-11-04'), conge('x2', '2026-11-16', '2026-11-18')], adminU, USERS());
  v('contre-épreuve : deux congés DISTINCTS s\'additionnent toujours (3 + 3)', W.absSolde('tS').pris, 6); }
{ const W = monde([conge('x1', '2026-11-02', '2026-11-04'), conge('x2', '2026-11-03', '2026-11-05', { statut: 'attente' })], adminU, USERS());
  const so = W.absSolde('tS');
  v('une demande en attente sur des jours déjà validés ne se recompte pas : 3 pris, 1 demandé (le 05)', [so.pris, so.demande], [3, 1]); }
{ const W = monde([conge('x1', '2026-11-03', '2026-11-03', { demi: 'matin' }), conge('x2', '2026-11-03', '2026-11-03', { demi: 'aprem' })], adminU, USERS());
  v('contre-épreuve : un matin + un après-midi = une journée (0,5 + 0,5)', W.absSolde('tS').pris, 1); }
{ const W = monde([conge('x1', '2026-11-03', '2026-11-03', { demi: 'matin' }), conge('x2', '2026-11-03', '2026-11-03', { demi: 'matin' })], adminU, USERS());
  v('… mais deux matins identiques = une demi-journée', W.absSolde('tS').pris, 0.5); }
{ const W = monde([conge('x1', '2026-11-02', '2026-11-06', { type: 'maladie' }), conge('x2', '2026-11-02', '2026-11-06', { type: 'maladie' })], adminU, USERS());
  v('contre-épreuve : un type qui ne touche pas au solde ne le touche toujours pas', W.absSolde('tS').pris, 0); }

console.log(`\n════ test-1140 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
