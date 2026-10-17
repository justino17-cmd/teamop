/* ══ k03 · r5#1 — « LA FIN EST DANS LE FUTUR » POUR UNE FIN AVANT LE DÉBUT, SUR UN POINTAGE CLOS OU NEUF ════════
   Le lot i02 (test-1512) a nommé la vraie faute (« La fin (07:00) est avant le début (08:00) ») mais seulement pour un pointage
   OUVERT : la garde lisait `ancien && ptOuvert(ancien)`. Un pointage CLOS 06:00-07:30 corrigé avec Fin = 05:00, ou un pointage
   NEUF (＋) 08:00 → 07:00, retombaient sur la règle de nuit (+24 h) puis sur « La fin est dans le futur » : refus juste, mot
   faux. La condition qui dit « ce n'est pas une nuit » est celle du JOUR (début d'aujourd'hui, lendemain dans le futur) ; l'état
   du pointage n'y ajoute rien. Ce banc joue la TABLE DE VÉRITÉ (neuf / ouvert / clos × fin avant début aujourd'hui · nuit
   voulue · nuit pas finie · fin normale · vrai futur) sur la VRAIE savePointage, et compare db.pointages avant/après.   */
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

console.log('\n── 1650 · 0. la population ──');
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
const ts = (j, hm) => new Date(j + 'T' + hm + ':00').getTime();
/* un monde à l'état voulu : 'neuf' (aucun), 'ouvert' (debut→ouvert), 'clos' (debut→finClos) ; l'horloge est à `now` */
function etat(kind, jour, debut, finClos, now) {
  const W = monde();
  if (kind !== 'neuf') W.db.pointages.push({ id: 'p0', userId: 'uA', techId: '', date: jour, debut, fin: kind === 'clos' ? finClos : '', debutTs: ts(jour, debut), finTs: kind === 'clos' ? ts(jour, finClos) : null });
  W.a(now[0], now[1], now[2] || 0);
  return W;
}
const id0 = kind => kind === 'neuf' ? null : 'p0';
const dernier = W => W.toasts[W.toasts.length - 1] || '';
const N0 = W => W.db.pointages.length;

for (const kind of ['neuf', 'ouvert', 'clos']) {
  console.log('\n── 1650 · état « ' + kind + ' » ──');
  /* A. fin avant début, aujourd'hui, il est 10:00 */
  { const deb = kind === 'clos' ? '06:00' : '08:00', fin = kind === 'clos' ? '05:00' : '07:00', finClos = '07:30';
    const W = etat(kind, J2, deb, finClos, [J2, 10]);
    vrai('population A · ' + kind + ' : ' + (kind === 'neuf' ? 'aucun pointage' : 'un pointage ' + (kind === 'clos' ? 'clos' : 'ouvert')) + ', il est 10:00',
      N0(W) === (kind === 'neuf' ? 0 : 1) && W.run('ptHM(Date.now())') === '10:00' && (kind === 'neuf' || W.run('ptOuvert(db.pointages[0])') === (kind === 'ouvert')));
    const avant = photo(W), s0 = W.saves, f0 = W.fermes, r0 = W.rendus;
    sauve(W, id0(kind), { date: J2, debut: deb, fin });
    const t = dernier(W);
    vrai('⛔ A · ' + kind + ' · ' + deb + ' → ' + fin + ' aujourd\'hui : « La fin (' + fin + ') est avant le début (' + deb + ') »', t.indexOf('La fin (' + fin + ') est avant le début (' + deb + ')') === 0, t);
    vrai('A · … et pas un mot de « futur »', !/futur/.test(t), t);
    vrai('A · rien n\'est écrit : base identique, aucun save(), fenêtre ouverte, rien redessiné', photo(W) === avant && W.saves === s0 && W.fermes === f0 && W.rendus === r0, [photo(W), W.saves, W.fermes, W.rendus]); }
  /* B. nuit voulue : hier 22:00 → 06:00, il est 10:00 aujourd'hui : acceptée, 8h00 */
  { const W = etat(kind, J1, '22:00', '23:00', [J2, 10]);
    sauve(W, id0(kind), { date: J1, debut: '22:00', fin: '06:00' });
    v('B · ' + kind + ' · nuit hier 22:00 → 06:00 (il est 10:00) : acceptée, 8h00 comptées', [N0(W), W.run('ptHM(db.pointages[0].finTs)'), W.run('ptDuree(ptSecs(db.pointages[0]))'), /(mis à jour|enregistré)/.test(dernier(W))], [1, '06:00', '8h00', true]); }
  /* C. nuit PAS FINIE : hier 22:00, il est 03:00, fin 06:00 → la fin est dans le futur (vrai), rien d'écrit */
  { const W = etat(kind, J1, '22:00', '23:00', [J2, 3]);
    const avant = photo(W);
    sauve(W, id0(kind), { date: J1, debut: '22:00', fin: '06:00' });
    const t = dernier(W);
    vrai('C · ' + kind + ' · nuit pas finie (hier 22:00, il est 03:00), fin 06:00 : c\'est bien le FUTUR, rien d\'écrit', /futur/.test(t) && !/avant le début/.test(t) && photo(W) === avant, t); }
  /* D. fin normale après le début, passée */
  { const W = etat(kind, J2, '08:00', '09:00', [J2, 10]);
    sauve(W, id0(kind), { date: J2, debut: '08:00', fin: '09:00' });
    v('D · ' + kind + ' · 08:00 → 09:00 (il est 10:00) : acceptée', [N0(W), W.run('ptHM(db.pointages[0].finTs)'), W.run('ptOuvert(db.pointages[0])')], [1, '09:00', false]); }
  /* E. vrai futur : fin 11:00 à 10:00 */
  { const W = etat(kind, J2, '08:00', '09:00', [J2, 10]); const avant = photo(W);
    sauve(W, id0(kind), { date: J2, debut: '08:00', fin: '11:00' });
    vrai('E · ' + kind + ' · fin 11:00 à 10:00 : « futur », rien d\'écrit', /futur/.test(dernier(W)) && photo(W) === avant, dernier(W)); }
}
console.log('\n── 1650 · la règle de nuit d\'un pointage CLOS d\'un jour passé ne bouge pas (deux horodatages réécrits ensemble) ──');
{ const W = etat('clos', J1, '22:00', '23:00', [J2, 18]);
  sauve(W, 'p0', { date: J1, debut: '22:00', fin: '06:00' });
  v('clos du 15 22:00 → 06:00 corrigé le 16 à 18:00 : la nuit (8h00), fin et finTs ensemble', [W.run('ptHM(db.pointages[0].finTs)'), W.run('ptDuree(ptSecs(db.pointages[0]))'), W.db.pointages[0].fin], ['06:00', '8h00', '06:00']); }
console.log('\n════ test-1650 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
