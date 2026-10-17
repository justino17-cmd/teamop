/* ══ i02 · r3#12 — « LA FIN EST DANS LE FUTUR » POUR UNE FIN SAISIE AVANT LE DÉBUT D'UN POINTAGE OUVERT ═══════
   Pointage ouvert depuis 08:00, il est 10:00, on corrige au ✎ avec « Fin = 07:00 » : `savePointage` applique la règle de
   nuit (fin < début → +24 h), obtient demain 07:00 et refuse avec « La fin est dans le futur — un pointage ne compte que
   des heures déjà travaillées ». Le refus est juste, le MOT est faux : l'erreur de frappe est une fin AVANT le début
   (la fenêtre « Pointage resté ouvert » le dit déjà : « La fin (07:00) est avant le début (08:00) », `ptFinRefus`).

   Ce banc EXÉCUTE la vraie `savePointage` (horloge en main) et regarde DEUX choses : le toast, et la base avant/après
   (une erreur de saisie ne doit RIEN écrire). La règle de nuit n'est pas touchée : 22:00 → 06:00 passe toujours, et un
   pointage ouvert depuis hier soir peut toujours être clos à 06:00 le lendemain.                              */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_HTML || path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ nettoyage SÛR : seuls les blocs qui COMMENCENT une ligne (CLAUDE.md) — un motif vise du code. */
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
const fn = nom => bloc('function ' + nom + '(');

console.log('\n── 1512 · 0. la population ──');
const PT = ['minutes', 'pt2', 'ptHM', 'ptHMS', 'ptJourDe', 'ptJour', 'ptOuvert', 'ptOubli', 'ptSecs', 'ptDuree', 'ptChrono', 'ptHoraires',
  'ptEstAMoi', 'ptMesPointages', 'ptOuverteMoi', 'ptNom', 'ptCle', 'ptDit', 'ptPauseEntre', 'ptTotal', 'ptBoutonJour', 'pointerDebut', 'pointerFin',
  'ptFermer', 'ptMaJournee', 'ptTickStart', 'ptTickStop', 'formPointage', 'savePointage', 'ptCloreOubliOk', 'ptDuJour', 'ptFinRefus'];
const manquent = PT.filter(n => !fn(n));
v('les ' + PT.length + ' fonctions du pointage sont trouvées', manquent, []);
const MAXH = (SRC.match(/const PT_MAX_H = (\d+);/) || [])[1];
vrai('… et le plafond PT_MAX_H', !!MAXH, MAXH);
v('⛔ une seule définition de savePointage', SRC.split('function savePointage(').length - 1, 1);
const CODE_PT = PT.map(fn).join('\n');

function monde() {
  const ctx = { db: { pointages: [], users: [{ id: 'uA', prenom: 'Justin', nom: 'Biret' }], techniciens: [{ id: 't1', nom: 'Marc' }] }, currentUser: { id: 'uA' },
    toasts: [], saves: 0, rendus: 0, fermes: 0, modales: [], current: 'pointage', navigator: {}, ticks: [], els: {} };
  vm.createContext(ctx);
  vm.runInContext(`
    let __t = 0; Date.now = () => __t; var setT = t => { __t = t; };
    var myTechId = () => null;
    var techName = id => 'Fiche ' + id;
    var fullName = u => ((u.prenom||'') + ' ' + (u.nom||'')).trim();
    var __n = 0; var uid = () => 'p' + (++__n);
    var save = () => { saves++; }; var toast = m => { toasts.push(m); }; var logEvent = () => {};
    var views = { pointage: () => { rendus++; } };
    var ptCloreOubli = id => {};
    var closeModal = () => { fermes++; }; var openModal = h => { modales.push(h); };
    var esc = x => String(x == null ? '' : x);
    var fmtShort = iso => iso;
    var ptPeutCorriger = () => true; var can = () => true; var ptTechsVisibles = () => db.techniciens;
    var setInterval = f => { ticks.push(f); return ticks.length; }; var clearInterval = () => {};
    var $ = id => els[id] || null; var document = { querySelectorAll: () => [] };
    var _ptTick = null;
    function FormData(t) { return Object.entries(t); }
    const PT_MAX_H = ${MAXH};
    ${CODE_PT}
    var todayISO = () => ptJour(Date.now());
  `, ctx);
  ctx.a = (jour, h, m = 0) => { const d = new Date(jour + 'T00:00:00'); d.setHours(h, m, 0, 0); vm.runInContext('setT(' + d.getTime() + ')', ctx); return d.getTime(); };
  ctx.run = js => vm.runInContext(js, ctx);
  return ctx;
}
const J1 = '2026-10-15', J2 = '2026-10-16';
const sauve = (W, id, champs) => W.run('savePointage({preventDefault(){},target:' + JSON.stringify(Object.assign({ techId: '', date: J2, debut: '08:00', fin: '', pause: '0', note: '' }, champs)) + '},' + JSON.stringify(id) + ')');
const photo = W => JSON.stringify(W.db.pointages);
/* un pointage ouvert à `h` heures le jour `jour`, puis l'horloge avance à `now` */
const ouvertA = (jour, h, now) => { const W = monde(); W.a(jour, h, 0); W.run('pointerDebut()'); W.a(now[0], now[1], now[2] || 0); return W; };

console.log('\n── 1512 · 1. ⛔ r3#12 · fin 07:00 sur un pointage ouvert depuis 08:00 : « avant le début », et RIEN d\'écrit ──');
{ const W = ouvertA(J2, 8, [J2, 10]);
  const id = W.db.pointages[0].id;
  vrai('population : un pointage ouvert depuis 08:00, il est 10:00', W.db.pointages.length === 1 && W.run('ptOuvert(db.pointages[0])') && W.run('ptHM(db.pointages[0].debutTs)') === '08:00' && W.run('ptHM(Date.now())') === '10:00', W.db.pointages[0]);
  const avant = photo(W), s0 = W.saves, f0 = W.fermes, r0 = W.rendus;
  sauve(W, id, { fin: '07:00' });
  const t = W.toasts[W.toasts.length - 1] || '';
  vrai('⛔ le toast nomme la vraie faute : la fin (07:00) est avant le début (08:00)', /La fin \(07:00\) est avant le début \(08:00\)/.test(t), t);
  vrai('⛔ … et ne parle PAS de futur', !/futur/.test(t), t);
  vrai('⛔ rien n\'est écrit : la base est identique octet pour octet, aucun save(), la fenêtre reste ouverte, rien redessiné', photo(W) === avant && W.saves === s0 && W.fermes === f0 && W.rendus === r0, [photo(W), W.saves, W.fermes, W.rendus]);
  v('… le pointage est toujours OUVERT (ni fin, ni finTs)', [W.db.pointages[0].fin || '', W.db.pointages[0].finTs || null, W.run('ptOuvert(db.pointages[0])')], ['', null, true]);
}
console.log('\n── 1512 · 2. contre-épreuves : ce qui doit continuer de passer, et de refuser comme avant ──');
{ const W = ouvertA(J2, 8, [J2, 10]); const id = W.db.pointages[0].id;
  sauve(W, id, { fin: '09:00' });
  const p = W.db.pointages[0];
  v('fin 09:00 (après le début, passée) : acceptée, les DEUX horodatages réécrits ensemble', [p.fin, W.run('ptHM(db.pointages[0].finTs)'), W.run('ptOuvert(db.pointages[0])'), /mis à jour/.test(W.toasts[W.toasts.length - 1])], ['09:00', '09:00', false, true]);
}
{ const W = ouvertA(J2, 8, [J2, 10]); const id = W.db.pointages[0].id; const avant = photo(W);
  sauve(W, id, { fin: '11:00' });
  vrai('fin 11:00 à 10:00 : c\'est bien le FUTUR — le message d\'avant, et rien d\'écrit', /futur/.test(W.toasts[W.toasts.length - 1]) && photo(W) === avant, W.toasts[W.toasts.length - 1]);
}
{ const W = ouvertA(J1, 22, [J2, 3]); const id = W.db.pointages[0].id; const avant = photo(W);   // ouvert hier 22:00, il est 03:00
  sauve(W, id, { date: J1, debut: '22:00', fin: '06:00' });
  const t = W.toasts[W.toasts.length - 1];
  vrai('nuit non finie (22:00 hier, il est 03:00), fin 06:00 : la nuit se lit au lendemain, dans le FUTUR — message d\'avant, rien d\'écrit', /futur/.test(t) && !/avant le début/.test(t) && photo(W) === avant, t);
}
{ const W = ouvertA(J1, 22, [J2, 10]); const id = W.db.pointages[0].id;   // la même nuit, close à 10:00 : 06:00 est passée
  sauve(W, id, { date: J1, debut: '22:00', fin: '06:00' });
  v('⛔ la règle de nuit est INTACTE : ouvert hier 22:00, clos à 06:00 → 8h00 comptées', [W.run('ptOuvert(db.pointages[0])'), W.run('ptHM(db.pointages[0].finTs)'), W.run('ptDuree(ptSecs(db.pointages[0]))')], [false, '06:00', '8h00']);
}
{ const W = monde(); W.a(J2, 18, 0);   // un pointage CLOS : la règle de nuit reste ce qu'elle était
  W.db.pointages.push({ id: 'c1', userId: 'uA', techId: '', date: J1, debut: '22:00', fin: '23:00', debutTs: new Date(J1 + 'T22:00:00').getTime(), finTs: new Date(J1 + 'T23:00:00').getTime() });
  sauve(W, 'c1', { date: J1, debut: '22:00', fin: '06:00' });
  v('pointage CLOS 22:00 → 06:00 : toujours la nuit (8h00), acceptée', [W.run('ptHM(db.pointages[0].finTs)'), W.run('ptDuree(ptSecs(db.pointages[0]))')], ['06:00', '8h00']);
}
console.log('\n════ test-1512 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
