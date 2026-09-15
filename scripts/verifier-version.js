/* Vérifie que les trois numéros de version d'OP GESTION restent cohérents, et qu'ils MONTENT
 * quand le fichier servi change.
 *
 * Pourquoi ce fichier existe. Rien ne vérifiait qu'une modification d'`app.html` s'accompagne
 * d'un `APP_VERSION` plus grand et d'un cache de service worker plus grand. Or les deux sont
 * ce qui fait arriver la nouvelle version sur le téléphone d'un technicien : sans le premier,
 * la Tour ne peut plus exiger de version ; sans le second, le service worker ressert
 * tranquillement l'ancienne page depuis son cache, et on croit avoir publié un correctif qui
 * n'atteint personne. C'est la panne silencieuse type — elle ne fait pas d'erreur, elle ne
 * fait rien du tout.
 *
 * ⛔ CE QU'IL NE VÉRIFIE PAS, ET C'EST DÉLIBÉRÉ : l'ÉCART entre les deux numéros.
 * Le 15 septembre 2026, un contrôle de la plateforme a signalé que le cache (v893) était loin
 * devant `APP_VERSION` (v693) — 200 d'écart, alors qu'il valait 199 depuis des dizaines de
 * versions. Le signalement était juste : l'écart avait bougé le soir même, le cache ayant été
 * monté de +3 quand l'application montait de +2. Mais l'écart n'est PAS un invariant : ce qui
 * compte est que le cache CHANGE, pas qu'il suive l'application à distance constante. Graver
 * 199 ici ferait rougir la CI pour une convention, et on apprendrait à passer outre — ce qui
 * est exactement la manière dont un contrôle meurt. On vérifie donc le mouvement, jamais
 * l'écart.
 *
 * Usage :  node scripts/verifier-version.js
 *          node scripts/verifier-version.js --base <commit>   (sinon : HEAD~1, puis origin/main)
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const RACINE = path.join(__dirname, '..');

/* ── les trois lectures, isolées pour être éprouvables (tests/test-709.js) ─────────────── */
const lireApp = (txt) => {
  const m = txt.match(/const APP_VERSION = '([^']+)'/g) || [];
  if (m.length !== 1) return { erreur: 'APP_VERSION doit apparaître EXACTEMENT une fois, trouvé ' + m.length };
  const v = m[0].match(/'([^']+)'/)[1];
  if (!/^\d+$/.test(v)) return { erreur: 'APP_VERSION n\'est pas un nombre : ' + JSON.stringify(v) };
  return { n: parseInt(v, 10) };
};
const lireBeta = (txt) => {
  const m = txt.match(/const APP_VERSION = '([^']+)'/g) || [];
  if (m.length !== 1) return { erreur: 'APP_VERSION doit apparaître EXACTEMENT une fois, trouvé ' + m.length };
  const v = m[0].match(/'([^']+)'/)[1];
  if (!/^\d+-beta$/.test(v)) return { erreur: 'la bêta doit porter « N-beta », trouvé ' + JSON.stringify(v) };
  return { n: parseInt(v, 10) };
};
const lireSw = (txt) => {
  const m = txt.match(/const CACHE = 'elan-gestion-v(\d+)'/g) || [];
  if (m.length !== 1) return { erreur: 'CACHE doit apparaître EXACTEMENT une fois, trouvé ' + m.length };
  return { n: parseInt(m[0].match(/v(\d+)/)[1], 10) };
};
/* ⛔ LA DÉCISION EST UNE FONCTION PURE, ET C'EST DÉLIBÉRÉ. Un contrôle qui ne peut s'éprouver
   que sur le vrai dépôt ne s'éprouve jamais sur le cas qu'il est censé attraper — on ne va pas
   fabriquer un faux commit pour vérifier qu'il rougit. Ici, `tests/test-709.js` lui présente
   les six situations, dont celles qui doivent le faire rougir, ET celles qui doivent le
   laisser vert : un contrôle qui rougit toujours ne protège pas mieux qu'un contrôle absent. */
function verdict(e) {
  const fautes = [];
  if (e.beta != null && e.app != null && e.beta !== e.app)
    fautes.push('la bêta n\'est pas la même version que l\'application : app v' + e.app + ' contre bêta v' + e.beta + ' — régénère avec « node beta-build.js »');
  if (e.appAvant == null || e.swAvant == null) return fautes;   // pas de point de comparaison
  if (e.appChange) {
    if (!(e.app > e.appAvant))
      fautes.push('app.html a changé mais APP_VERSION n\'a pas monté (v' + e.appAvant + ' → v' + e.app + ') : sans ça, la Tour ne peut plus exiger la nouvelle version');
    if (!(e.sw > e.swAvant))
      fautes.push('app.html a changé mais le cache du service worker n\'a pas monté (v' + e.swAvant + ' → v' + e.sw + ') : le téléphone resservira l\'ancienne page depuis son cache, et le correctif n\'atteindra personne');
  } else {
    if (e.app < e.appAvant || e.sw < e.swAvant)
      fautes.push('un numéro a RECULÉ : app v' + e.appAvant + '→v' + e.app + ', cache v' + e.swAvant + '→v' + e.sw);
  }
  return fautes;
}
module.exports = { lireApp, lireBeta, lireSw, verdict };

if (require.main !== module) return;

/* ── ce qui se lit sans point de comparaison ───────────────────────────────────────────── */
let ko = 0;
const dit = (t, e) => { if (e) { ko++; console.error('  ✗ ' + t + ' — ' + e); } else console.log('  ✓ ' + t); };

const app = lireApp(fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8'));
const beta = lireBeta(fs.readFileSync(path.join(RACINE, 'beta.html'), 'utf8'));
const sw = lireSw(fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8'));

dit('app.html porte un APP_VERSION unique et numérique', app.erreur);
dit('beta.html porte « N-beta »', beta.erreur);
dit('sw.js porte un cache unique et numérique', sw.erreur);
/* ── ce qui demande un point de comparaison ────────────────────────────────────────────── */
/* ⛔ `maxBuffer` N'EST PAS UN DÉTAIL DE CONFORT. Il vaut 1 Mio par défaut, et `app.html` en
   fait 3,2 : sans cette ligne, `git show HEAD~1:app.html` DÉPASSE le tampon, `execFileSync`
   lève, et ce script annonçait tranquillement « comparaison impossible » — vert, et aveugle
   sur la moitié qui compte. Constaté sur son tout premier essai, le 15 septembre 2026. Un
   contrôle qui se dégrade en silence est précisément ce que ce fichier existe pour empêcher :
   il ne s'accorde donc pas à lui-même ce qu'il refuse aux autres. */
const git = (...a) => { try { return execFileSync('git', a, { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim(); } catch (e) { return null; } };
const arg = process.argv.indexOf('--base');
const base = (arg > -1 && process.argv[arg + 1]) || (git('rev-parse', '--verify', 'HEAD~1') && 'HEAD~1') || (git('rev-parse', '--verify', 'origin/main') && 'origin/main') || null;

if (!base) {
  /* ⛔ UN CONTRÔLE QUI SE SAUTE LUI-MÊME N'EST PAS UN CONTRÔLE. En CI, ne pas pouvoir comparer
     est un ÉCHEC : `actions/checkout` ne ramène qu'un commit par défaut, et sans
     `fetch-depth: 2` cette moitié du contrôle deviendrait muette sans que personne le voie —
     verte, et aveugle. En local, on le dit et on s'arrête là. */
  const enCI = !!process.env.GITHUB_ACTIONS;
  console.error((enCI ? '✗' : '⚠️') + ' aucun point de comparaison (ni HEAD~1 ni origin/main)' +
    (enCI ? ' — il faut « fetch-depth: 2 » sur actions/checkout' : ' — seule la cohérence interne a été vérifiée'));
  process.exit(enCI || ko ? 1 : 0);
}

/* ⛔ ET SURTOUT PAS `git()` ICI : il applique `.trim()`, ce qui est juste pour lire un
   identifiant de commit et FAUX pour lire un fichier. Le saut de ligne final disparaissait,
   l'ancien app.html paraissait différent du nouveau, et le contrôle annonçait « app.html a
   changé, la version n'a pas monté » sur deux commits qui n'y avaient pas touché. Une alerte
   qui crie pour rien est une alerte qu'on apprend à ignorer — c'est la façon la plus sûre de
   tuer une barrière de publication. Deuxième faux départ de ce script, même soir. */
const avant = (f) => { try { return execFileSync('git', ['show', base + ':' + f], { cwd: RACINE, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return null; } };
const appAvant = lireApp(avant('app.html') || ''), swAvant = lireSw(avant('sw.js') || '');
const appChange = (avant('app.html') || '') !== fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');

if (appAvant.erreur || swAvant.erreur) {
  console.log('  · ' + base + ' ne porte pas de numéros lisibles — comparaison impossible, on ne la maquille pas');
} else {
  console.log('  · app.html ' + (appChange ? 'A CHANGÉ' : 'n\'a pas changé') + ' depuis ' + base);
  const fautes = verdict({ app: app.n, beta: beta.n, sw: sw.n, appAvant: appAvant.n, swAvant: swAvant.n, appChange });
  if (!fautes.length) console.log('  ✓ ' + (appChange ? 'les deux numéros ont monté' : 'aucun numéro n\'a reculé'));
  fautes.forEach(f => { ko++; console.error('  ✗ ⛔ ' + f); });
}

console.log((ko ? '✗' : '✓') + ' versions — app v' + (app.n || '?') + ' · bêta v' + (beta.n || '?') + ' · cache v' + (sw.n || '?') + (base ? ' (comparé à ' + base + ')' : ''));
process.exit(ko ? 1 : 0);
