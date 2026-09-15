/* ══ « Promesse rejetée : Attempt to get records… » N'EST PAS UN BUG D'OP GESTION ══════════

   Dossier remonté de la console TEAM OP le 15 septembre 2026 : ELAN, iPhone · Safari,
   rubrique « Plans », gravité Moyenne, 1 occurrence à 9 h 11.

   La rubrique ne désigne rien : `tmCat()` nomme l'écran OUVERT au moment du rejet, jamais le
   coupable. Le diagnostic automatique a donc envoyé chercher dans Plans — où il n'y a pas une
   ligne d'IndexedDB. C'est ça, le vrai défaut : le rapport était FAUX, et un rapport faux fait
   chercher au mauvais endroit.

   OÙ ÇA VIENT, constaté et non déduit — firebase-auth-compat.js 10.12.2, le fichier que
   l'application charge vraiment, téléchargé et relu :
     startPolling(){ this.pollTimer = setInterval(async()=>this._poll(), 800) }
     async _poll(){ await this._withRetries(e => { var t = kr(e,!1).getAll(); … }) }
   La promesse rendue par cette fonction fléchée `async` n'est consommée par PERSONNE : pas un
   `.catch()`, pas un `await`. WebKit tue les transactions IndexedDB quand la page passe en
   arrière-plan sur iPhone ; le poll en vol se rejette, et le rejet part en `unhandledrejection`.
   Le message est celui de WEBKIT : il n'existe nulle part dans les 340 Ko du SDK — cherché
   avant de conclure, c'est ce qui a écarté l'hypothèse « code de la rubrique Plans ».

   MESURÉ au navigateur (scratchpad/sonde-idb.js, sur beta.html), avant et après :
     avant · rejet WebKit → /api/bug ENVOYÉ, Tour ENVOYÉ
     après · rejet WebKit → écarté des deux ; vraie erreur applicative → toujours envoyée. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 693 · le poll IndexedDB de Firebase n\'est plus signalé comme un bug ──');

/* ── Le VRAI filtre, extrait du fichier livré ── */
const m = APP.match(/^const BRUIT_IDB=(\/.*\/i);$/m);
v('BRUIT_IDB est trouvé dans app.html', !!m, true);
const BRUIT = m ? new Function('return ' + m[1] + ';')() : /$^/;

/* ⛔ Il doit être déclaré AVANT les deux vigies qui s'en servent : un `const` lu dans sa zone
   morte temporelle jette, et jeter DANS un gestionnaire d'erreur rendrait l'application
   aveugle à toutes les erreurs suivantes. C'est exactement le piège du 10 septembre. */
const iDecl = APP.indexOf('const BRUIT_IDB=');
const iVigie = APP.indexOf('(function(){ const sent={};');
const iMoniteur = APP.indexOf("var TM_APP='opgestion'");
v('⛔ déclaré avant la vigie /api/bug', iDecl > 0 && iDecl < iVigie, true);
v('⛔ déclaré avant le moniteur de la Tour', iDecl > 0 && iDecl < iMoniteur, true);

/* ── Ce qu'il doit reconnaître : le message d'ELAN, mot pour mot, et ses cousins ── */
[
  ['le message exact remonté par ELAN (WebKit)', 'Attempt to get records from database without an in-progress transaction'],
  ['sa variante au singulier', 'UnknownError: Attempt to get a record from database without an in-progress transaction'],
  ['l\'écriture, même famille', 'Attempt to store record in an IDBObjectStore without an in-progress transaction'],
  ['la formulation de Chrome', "Failed to execute 'getAll' on 'IDBObjectStore': The transaction is not active."],
  ['celle de Firefox', 'A request was placed against a transaction which is currently not active, or which is finished.'],
  ['le nom de l\'exception', 'TransactionInactiveError'],
  ['la base coupée sous iOS', 'Connection to Indexed Database server lost. Refresh the page to try again'],
].forEach(([nom, msg]) => v('écarté : ' + nom, BRUIT.test(msg), true));

/* ⛔ ET SURTOUT CE QU'IL NE DOIT PAS MANGER. Un filtre trop large, c'est une panne qu'on ne
   voit plus — et cette application vit de ce que la Tour lui remonte. */
[
  ['une vraie erreur applicative', 'boum — vraie erreur applicative'],
  ['un accès à undefined', "Cannot read properties of undefined (reading 'produits')"],
  ['un refus du nuage', 'Missing or insufficient permissions.'],
  ['une transaction Stripe', 'transaction refusée par la banque'],
  ['un quota de stockage', 'QuotaExceededError: The quota has been exceeded.'],
  ['une base introuvable', 'NotFoundError: The object store was not found.'],
  ['un JSON cassé', 'Unexpected token < in JSON at position 0'],
].forEach(([nom, msg]) => v('signalé quand même : ' + nom, BRUIT.test(msg), false));

/* ── Il ne filtre QUE les promesses ── */
v('⛔ window.onerror n\'est pas touché (une erreur SYNCHRONE reste un bug)',
  /window\.addEventListener\('error',e=>rep\(e\.message,e\.filename,e\.lineno,e\.error&&e\.error\.stack\)\);/.test(APP), true);
v('la vigie /api/bug écarte le bruit sur rejet', /if\(BRUIT_IDB\.test\(m\)\)\{ try\{ console\.warn\(/.test(APP), true);
v('le moniteur de la Tour aussi', /if\(BRUIT_IDB\.test\(m\)\) return; tmPush\('erreur','Promesse rejetée/.test(APP), true);
v('⛔ écarté du signalement, PAS effacé : la console du navigateur le garde',
  /console\.warn\('IndexedDB suspendu en arrière-plan \(poll de Firebase Auth\)/.test(APP), true);

/* ── Ce qui rend le filtre sûr : aucun de NOS usages d'IndexedDB ne peut produire un rejet ──
   Chacun est dans un try/catch qui REND une valeur. Si ça changeait un jour, le filtre
   deviendrait un cache-misère — ce test le bloque avant. */
function corps(entete) {
  const d = APP.indexOf(entete); if (d < 0) return null;
  let n = 0;
  for (let i = APP.indexOf('{', d); i < APP.length; i++) {
    if (APP[i] === '{') n++; else if (APP[i] === '}') { n--; if (!n) return APP.slice(d, i + 1); } }
  return null;
}
const DEPOT = corps('function miseDeCote(base,motif){'), LISTE = corps('function miseDeCoteListe(){');
v('miseDeCote est trouvée', !!DEPOT, true);
v('miseDeCoteListe est trouvée', !!LISTE, true);
v('⛔ miseDeCote ne rejette jamais : son onsuccess est sous try/catch qui rend false',
  !!DEPOT && /onsuccess=e=>\{ const d=e\.target\.result; try\{/.test(DEPOT) && /\}catch\(err\)\{ res\(false\); \}/.test(DEPOT), true);
v('⛔ miseDeCoteListe non plus : try/catch qui rend []',
  !!LISTE && /onsuccess=e=>\{ const d=e\.target\.result; try\{/.test(LISTE) && /\}catch\(err\)\{ res\(\[\]\); \}/.test(LISTE), true);
v('⛔ et le ménage des clés « :opgestion » est lui aussi sous try/catch',
  /dm\.onsuccess=function\(\)\{ try\{ const d=dm\.result;/.test(APP), true);
/* Trois usages, pas quatre : un quatrième non gardé rouvrirait le trou. */
v('⛔ toujours exactement trois ouvertures d\'IndexedDB dans l\'application',
  (APP.match(/indexedDB\.open\(/g) || []).length, 3);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
