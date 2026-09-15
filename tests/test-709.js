/* ⛔ CE QUE CE FICHIER GARDE — le contrôle de version doit rougir sur les vrais oublis, ET
   rester vert le reste du temps. Les deux comptent autant.

   15 septembre 2026. Justin, après avoir lu une soirée de rapports : « il n'y a rien qui est
   vérifié quand on publie ». C'était vrai — rien ne vérifiait qu'une modification d'`app.html`
   s'accompagne d'un `APP_VERSION` plus grand et d'un cache de service worker plus grand.

   LES DEUX PANNES QUE ÇA LAISSE PASSER, et ni l'une ni l'autre ne fait d'erreur visible :
   1. `APP_VERSION` ne monte pas → la Tour ne peut plus exiger la nouvelle version. C'est le
      SECOND geste, celui qui referme vraiment un trou : un correctif de synchro ne protège que
      l'appareil qui le porte, et un seul téléphone resté en arrière peut encore effacer les
      données de toute l'équipe.
   2. Le cache du service worker ne monte pas → le téléphone ressert tranquillement l'ancienne
      page depuis son cache. On croit avoir publié, on a publié dans le vide.

   ⛔ ET C'EST ARRIVÉ LE SOIR MÊME, dans ce dépôt : le commit « Taper une lettre ne redessine
   plus une liste entière » modifiait `app.html` en laissant `APP_VERSION` à 691. Il n'a été
   rattrapé que parce qu'il n'était pas encore poussé. Le cas 1 de ce banc est exactement
   celui-là.

   ⚠️ LE BANC PORTE AUSSI LES CAS QUI DOIVENT RESTER VERTS. Un contrôle qui rougit toujours ne
   protège pas mieux qu'un contrôle absent : on apprend à passer outre, et le jour où il a
   raison, personne ne le lit. */

const { lireApp, lireBeta, lireSw, verdict } = require('../scripts/verifier-version.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const rougit = (t, e, motif) => { const f = verdict(e); v(t, f.length > 0 && motif.test(f.join(' | ')), true); };
const vert = (t, e) => { const f = verdict(e); v(t, f, []); };

console.log('Le contrôle de version rougit sur un oubli, et se tait le reste du temps');

// ── 1) les trois lectures, sur le texte réel qu'on trouve dans les fichiers
{
  v('APP_VERSION se lit', lireApp("truc\nconst APP_VERSION = '693'\nmachin"), { n: 693 });
  v('la bêta se lit', lireBeta("const APP_VERSION = '693-beta'"), { n: 693 });
  v('le cache du service worker se lit', lireSw("const CACHE = 'elan-gestion-v893';"), { n: 893 });
  v('⛔ un APP_VERSION en DOUBLE est refusé', !!lireApp("const APP_VERSION = '1'\nconst APP_VERSION = '2'").erreur, true);
  v('⛔ un APP_VERSION ABSENT est refusé', !!lireApp('rien du tout').erreur, true);
  v('⛔ un APP_VERSION non numérique est refusé', !!lireApp("const APP_VERSION = 'v693'").erreur, true);
  v('⛔ une bêta SANS le suffixe -beta est refusée', !!lireBeta("const APP_VERSION = '693'").erreur, true);
  v('un cache absent est refusé', !!lireSw("const CACHE = 'autre-chose'").erreur, true);
}

// ── 2) ⛔ LE CAS VÉCU : app.html change, APP_VERSION reste
console.log('\n── les oublis qui doivent faire rougir ──');
rougit('⛔ app.html change et APP_VERSION reste — le cas du 15 septembre',
  { app: 691, beta: 691, sw: 891, appAvant: 691, swAvant: 890, appChange: true }, /APP_VERSION n.a pas mont/);
rougit('⛔ app.html change et le CACHE reste — on publie dans le vide',
  { app: 694, beta: 694, sw: 893, appAvant: 693, swAvant: 893, appChange: true }, /cache du service worker n.a pas mont/);
rougit('⛔ les DEUX restent : les deux fautes sont nommées, pas seulement la première',
  { app: 693, beta: 693, sw: 893, appAvant: 693, swAvant: 893, appChange: true }, /APP_VERSION[\s\S]*cache|cache[\s\S]*APP_VERSION/);
rougit('⛔ un numéro RECULE, même sans changement d’app.html',
  { app: 692, beta: 692, sw: 893, appAvant: 693, swAvant: 893, appChange: false }, /RECUL/);
rougit('⛔ la bêta n’a pas été régénérée',
  { app: 694, beta: 693, sw: 894, appAvant: 693, swAvant: 893, appChange: true }, /bêta/);

// ── 3) ⚠️ LES CAS QUI DOIVENT RESTER VERTS — sans eux, le banc ne vaut rien
console.log('\n── et ce qui doit rester vert ──');
vert('une publication normale : les deux montent',
  { app: 694, beta: 694, sw: 894, appAvant: 693, swAvant: 893, appChange: true });
vert('un commit qui ne touche pas app.html ne doit rien faire monter',
  { app: 693, beta: 693, sw: 893, appAvant: 693, swAvant: 893, appChange: false });
vert('⚠️ l’ÉCART entre les deux numéros n’est PAS un invariant — +2 et +3 passent',
  { app: 695, beta: 695, sw: 896, appAvant: 693, swAvant: 893, appChange: true });
vert('sans point de comparaison, on ne juge pas ce qu’on ne sait pas',
  { app: 693, beta: 693, sw: 893, appAvant: null, swAvant: null, appChange: true });

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
if (ko) process.exitCode = 1;
