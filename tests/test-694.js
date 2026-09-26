/* ══ LES FORMATEURS DE DATE : MÊME SORTIE, AU CARACTÈRE PRÈS ══════════════════════════════

   Justin, 15 septembre 2026 : « il y a aussi un bug d'interface, ça rame beaucoup ».
   Profil CPU pris au navigateur sur l'écran Rapports (base aux proportions d'ELAN, processeur
   ralenti ×4) : `fmtShort` pesait **56 % du temps de rendu**. `clientName` et son
   `db.clients.find()` par ligne — le suspect évident — en pesait 1 %. Le profileur a tranché
   contre l'hypothèse, et c'est lui qu'on a suivi.

   La cause : `date.toLocaleDateString(loc,opts)` CONSTRUIT un `Intl.DateTimeFormat` neuf à
   chaque appel. Trois cents dates à l'écran = trois cents constructions. On garde donc le
   formateur et on le réutilise.

   ⛔ ET C'EST ICI QUE ÇA DEVIENT DANGEREUX, d'où ce banc. `todayISO()` et `jourDe()` ne
   servent pas à afficher : ce sont des CLÉS DE DONNÉES — le jour d'un pointage, d'un
   mouvement, d'une tournée. Un seul caractère d'écart entre l'ancienne écriture et la nouvelle
   déplacerait des enregistrements d'un jour, en silence, chez un client qui travaille. On ne
   suppose donc pas l'équivalence : on la compare sur des centaines de dates, changements
   d'heure compris, avec les VRAIES fonctions extraites du fichier livré. */
process.env.TZ = 'Europe/Paris';   // le fuseau des utilisateurs : c'est là que les bascules font mal
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 694 · les formateurs gardés rendent exactement la même chose ──');

/* Le bloc réel, du cache jusqu'à fmtTs — extrait, pas recopié. */
const d = APP.indexOf('const _FMT={};');
const f = APP.indexOf("return f?f.format(d):d.toLocaleString('fr-FR',_O_TS); }");
v('le bloc des formateurs est trouvé dans app.html', d > 0 && f > d, true);
const SRC = APP.slice(d, f + "return f?f.format(d):d.toLocaleString('fr-FR',_O_TS); }".length);
const M = new Function(SRC + '; return {eur,todayISO,jourDe,isoDe,fmtDate,fmtShort,fmtJourCourt,fmtLong,fmtTs};')();

/* Les anciennes écritures, telles qu'elles étaient avant la v690 — la référence. */
const REF = {
  /* v751 : un montant s'écrit TOUJOURS avec deux décimales (« 170,70 € » à l'écran comme dans le PDF — vérification
     de A à Z du 26 septembre 2026). La référence suit la décision ; ce que ce banc garde reste le même : le
     formateur mis en cache rend exactement ce que rendrait l'écriture directe. */
  eur: n => (Number(n) || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €',
  jourDe: ts => new Date(ts || 0).toLocaleDateString('sv-SE'),
  fmtDate: iso => { if (!iso) return '—'; return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
  fmtShort: iso => { if (!iso) return '—'; return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }); },
  fmtJourCourt: iso => { if (!iso) return '—'; return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' }); },
  fmtLong: iso => { if (!iso) return '—'; return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }); },
  fmtTs: ts => new Date(ts).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
};

/* ── 1. Toutes les dates de quatre années, sur les quatre formats d'affichage ── */
const jours = [];
for (let a = 2024; a <= 2027; a++) for (let m = 1; m <= 12; m++) {
  const fin = new Date(Date.UTC(a, m, 0)).getUTCDate();
  for (let j = 1; j <= fin; j++) jours.push(a + '-' + String(m).padStart(2, '0') + '-' + String(j).padStart(2, '0'));
}
['fmtShort', 'fmtDate', 'fmtJourCourt', 'fmtLong'].forEach(nom => {
  let ecarts = 0, exemple = '';
  jours.forEach(iso => { const a = M[nom](iso), b = REF[nom](iso); if (a !== b && !exemple) exemple = iso + ' : ' + a + ' ≠ ' + b; if (a !== b) ecarts++; });
  v(nom + ' — ' + jours.length + ' jours, aucun écart' + (exemple ? ' (' + exemple + ')' : ''), ecarts, 0);
});
v('… et la valeur vide reste « — »', [M.fmtShort(''), M.fmtDate(null), M.fmtLong(undefined), M.fmtJourCourt(0)], ['—', '—', '—', '—']);

/* ── 2. ⛔ LES CLÉS DE DONNÉES : jourDe et isoDe, sur cinquante ans ──
   `isoDe` n'appelle plus `Intl` du tout : elle assemble l'année, le mois et le jour à la main.
   C'est cinquante fois plus rapide, et c'est la fonction la plus appelée de l'application —
   mais elle produit une CLÉ. On la compare donc à l'ancienne écriture sur toute la plage de
   dates qu'une entreprise peut manipuler, pas sur trois exemples. */
let ecartsJour = 0, exJour = '';
for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2027, 0, 1); t += 3600000) {
  const a = M.jourDe(t), b = REF.jourDe(t);
  if (a !== b) { ecartsJour++; if (!exJour) exJour = new Date(t).toISOString() + ' : ' + a + ' ≠ ' + b; }
}
v('⛔ jourDe — 8 760 horodatages de 2026, aucun écart' + (exJour ? ' (' + exJour + ')' : ''), ecartsJour, 0);

let ecartsIso = 0, exIso = '', nIso = 0;
for (let a = 2000; a <= 2050; a++) for (let m = 0; m < 12; m++) {
  const fin = new Date(a, m + 1, 0).getDate();
  for (let j = 1; j <= fin; j++) {
    const d = new Date(a, m, j, 13, 37, 0);
    nIso++;
    const x = M.isoDe(d), y = d.toLocaleDateString('sv-SE');
    if (x !== y) { ecartsIso++; if (!exIso) exIso = x + ' ≠ ' + y; }
  }
}
v('⛔ isoDe — ' + nIso.toLocaleString('fr-FR') + ' jours de 2000 à 2050, aucun écart' + (exIso ? ' (' + exIso + ')' : ''), ecartsIso, 0);
/* Minuit et 23 h 59 : c'est là qu'une erreur de fuseau ferait basculer le jour. */
let ecartsBord = 0;
for (let a = 2024; a <= 2028; a++) for (let m = 0; m < 12; m++) for (const [h, mi] of [[0, 0], [0, 1], [12, 0], [23, 59]]) {
  const d = new Date(a, m, 1, h, mi); if (M.isoDe(d) !== d.toLocaleDateString('sv-SE')) ecartsBord++;
  const e = new Date(a, m + 1, 0, h, mi); if (M.isoDe(e) !== e.toLocaleDateString('sv-SE')) ecartsBord++;
}
v('⛔ isoDe — minuit, 00h01, midi et 23h59, premiers et derniers jours de mois', ecartsBord, 0);

/* Les bascules d'heure, à la minute, dans les deux sens. */
[['printemps', Date.UTC(2026, 2, 29, 0, 0)], ['automne', Date.UTC(2026, 9, 25, 0, 0)]].forEach(([nom, t0]) => {
  let e = 0;
  for (let t = t0 - 7200000; t < t0 + 7200000; t += 60000) if (M.jourDe(t) !== REF.jourDe(t)) e++;
  v('⛔ bascule d\'heure (' + nom + '), minute par minute', e, 0);
});
v('jourDe(0) et jourDe(undefined) inchangés', [M.jourDe(0), M.jourDe(undefined)], [REF.jourDe(0), REF.jourDe(undefined)]);
v('todayISO ressemble bien à une date ISO', /^\d{4}-\d{2}-\d{2}$/.test(M.todayISO()), true);

/* ── 3. fmtTs porte une heure : son repli n'est pas le même ── */
let eTs = 0, exTs = '';
for (let t = Date.UTC(2026, 0, 1); t < Date.UTC(2026, 3, 1); t += 3600000 * 7) {
  const a = M.fmtTs(t), b = REF.fmtTs(t); if (a !== b) { eTs++; if (!exTs) exTs = new Date(t).toISOString() + ' : ' + a + ' ≠ ' + b; }
}
v('fmtTs — aucun écart' + (exTs ? ' (' + exTs + ')' : ''), eTs, 0);

/* ── 4. Les montants ── */
let eEur = 0;
[0, 1, 9, 10, 999, 1000, 1234.56, -42, 1e6, 0.5, null, undefined, 'x'].forEach(n => { if (M.eur(n) !== REF.eur(n)) eEur++; });
v('eur — aucun écart sur 13 valeurs, y compris null et texte', eEur, 0);

/* ── 5. Le formateur est bien GARDÉ (sinon le correctif ne sert à rien) ──
   ⚠️ On n'asserte PAS un nombre d'appels à `_fd` : `todayISO` et `jourDe` passent désormais par
   `isoDe`, et compter les appels aurait fait échouer un refactor parfaitement juste. Ce qui
   compte, c'est que CHACUNE des sept fonctions de date traverse le cache — par `_fd`, par
   `isoDe` ou par `_F` — et qu'aucune ne reconstruise un formateur pour elle seule. */
v('le cache de formateurs existe', /const _FMT=\{\};/.test(APP), true);
/* `isoDe` est le cas à part, et c'est le meilleur : elle n'appelle plus Intl DU TOUT. La
   garantie commune est « aucune fonction de date ne reconstruit un formateur par appel » —
   satisfaite ici en se passant du moteur, ailleurs en gardant le formateur. */
v('⛔ isoDe se passe entièrement d\'Intl (assemblage à la main)',
  /const isoDe = d => d\.getFullYear\(\)\+'-'\+String\(d\.getMonth\(\)\+1\)\.padStart\(2,'0'\)\+'-'\+String\(d\.getDate\(\)\)\.padStart\(2,'0'\);/.test(APP), true);
['todayISO', 'jourDe', 'fmtDate', 'fmtShort', 'fmtJourCourt', 'fmtLong', 'fmtTs'].forEach(nom => {
  const d2 = APP.indexOf(nom + ' =') >= 0 && APP.indexOf('const ' + nom) >= 0 ? APP.indexOf('const ' + nom) : APP.indexOf('function ' + nom + '(');
  const bout = d2 >= 0 ? APP.slice(d2, d2 + 340) : '';
  v(nom + ' passe par le cache', /_fd\(|isoDe\(|_F\(/.test(bout.split('\n')[0] + bout.split('\n')[1]), true);
});
/* Et les boucles de dates, celles que le profileur a nommées, ne reconstruisent plus rien. */
v('⛔ weekDays ne reconstruit plus sept formateurs par appel',
  /return Array\.from\(\{length:7\},\(_,k\)=>\{const x=new Date\(mon\);x\.setDate\(mon\.getDate\(\)\+k\);return isoDe\(x\);\}\); \}/.test(APP), true);
v('⛔ planJoursSem ne relit plus le stockage à chaque date',
  /function planJoursSem\(\)\{\n  if\(_jsemCache\) return _jsemCache;/.test(APP), true);
/* ⛔ RÉEXPRIMÉ, PAS AFFAIBLI — 15 septembre 2026, après relecture. Cette ligne épinglait le
   TEXTE d'un commentaire (« seul point d'écriture »), et ce commentaire était FAUX : deux clés
   nourrissent ce cache, pas une. Corriger le mensonge cassait le test — c'est le piège « un
   test qui teste son propre décor ». La garantie, elle, n'a pas bougé et elle s'est même
   élargie : TOUTE fonction qui écrit un des deux réglages oublie le cache.
   `tests/test-701.js` l'éprouve fonction par fonction ; ici on garde le contrat en une ligne. */
v('… et chaque écriture du réglage oublie le cache',
  ['planJoursSemSet', 'planOptToggle', 'planFiltresRaz'].every(nom => {
    const i = APP.indexOf('function ' + nom + '('); if (i < 0) return false;
    let j = APP.indexOf('{', i), n = 0, k = j;
    for (; k < APP.length; k++) { if (APP[k] === '{') n++; else if (APP[k] === '}') { n--; if (!n) break; } }
    return /_jsemCache=null/.test(APP.slice(i, k + 1));
  }), true);
v('⛔ plus un seul toLocaleDateString dans les formateurs',
  /function fmtShort\(iso\)\{ if\(!iso\) return '—'; return _fd\(/.test(APP), true);
v('… et le repli sans Intl est conservé', /catch\(e\)\{ f=null; \}/.test(APP) && /f\?f\.format\(d\):d\.toLocaleDateString\(loc,opts\)/.test(APP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
