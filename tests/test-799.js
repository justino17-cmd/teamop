/* ⛔ CE QUE CE FICHIER GARDE — PERSONNE CONNECTÉ, AUCUNE VUE.

   `go()` rend la vue dans une transition de vue (`document.startViewTransition`), donc PLUS TARD,
   hors de l'appel. Si la déconnexion passe entre les deux — un compte désactivé par la synchro juste
   à l'entrée, un jeton refusé, une session expirée — la vue se rendait SANS utilisateur. Mesuré le
   24 septembre 2026 dans la vraie page (`scratchpad/sonde-deconnexion.js`, déconnexion à 0 ms de
   l'entrée) : « Vue dashboard : TypeError … (reading 'role') », et « Affichage indisponible » écrit
   dans un `#content` que plus personne ne regardait. Contre-épreuve sur la v743 : l'erreur revient.
   ⚠️ C'était la dette « erreur console `syncInit` à la déconnexion » (REPRISE, septembre) — PAS
   reproduite telle quelle sur la v743 (synchro éteinte, puis allumée avec un Firebase simulé :
   0 erreur) ; c'est en cherchant le moment exact qu'est apparue celle-ci.
   On EXÉCUTE la vraie fonction, extraite du fichier livré. */
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };

const i = SRC.indexOf('function rendreVueSure(view){');
let d = 0, fin = -1;
for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { fin = k + 1; break; } } }
v('rendreVueSure est trouvée dans le fichier réel', i > 0 && fin > i, true);

const jouer = (utilisateur) => {
  const trace = { vues: 0, erreurs: [], ecrit: '' };
  const contenu = { set innerHTML(x) { trace.ecrit = x; }, get innerHTML() { return trace.ecrit; } };
  const f = new Function('views', 'currentUser', '$', 'console', 'multiProposer', 'segInit', 'segObserver', 'esc',
    SRC.slice(i, fin) + '\nreturn rendreVueSure;')(
    { dashboard: () => { trace.vues++; if (!utilisateur) throw new TypeError("Cannot read properties of null (reading 'role')"); } },
    utilisateur, () => contenu, { error: (...a) => trace.erreurs.push(a.join(' ')) }, () => {}, () => {}, () => {}, x => String(x));
  f('dashboard');
  return trace;
};

console.log('\n══ PERSONNE CONNECTÉ ══\n');
{
  const t = jouer(null);
  v('⛔ la vue ne se rend PAS', t.vues, 0);
  v('⛔ rien dans la console', t.erreurs, []);
  v('   et rien n\'est écrit dans #content', t.ecrit, '');
}
console.log('\n══ LE TÉMOIN : QUELQU\'UN EST CONNECTÉ ══\n');
{
  /* Sans ce témoin, « la vue ne se rend pas » pourrait vouloir dire qu'elle ne se rend plus JAMAIS. */
  const t = jouer({ id: 'u1', role: 'admin' });
  v('   la vue se rend', t.vues, 1);
  v('   sans erreur', t.erreurs, []);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
