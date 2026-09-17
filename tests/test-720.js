/* ══ test-720 — LE GÉNÉRATEUR NE RÉTROGRADE PLUS LA BÊTA EN SILENCE ═════════════════════════
 *
 * Le 17 septembre 2026 au soir, pendant les vérifications du renommage : `node beta-build.js`
 * lancé depuis `main` a produit une 695-beta et ÉCRASÉ la 701-beta publiée. Sans un mot, sans
 * une erreur. C'est le rôle même de la bêta d'être EN AVANCE sur `app.html` de `main` — donc ce
 * n'est pas un cas tordu, c'est le cas NORMAL dès qu'on se trompe de branche.
 * Vu ce jour-là parce qu'un `cmp` traînait dans la commande. La fois suivante, ça part.
 *
 * ⛔ CE BANC EXÉCUTE LE VRAI GÉNÉRATEUR, il ne relit pas son texte. Une garde qu'on lit peut
 * être juste et ne jamais se déclencher ; celle-ci est mise en situation, six fois.
 *
 * ⛔ ET LE SIXIÈME CAS EST CELUI QUI COMPTE AUTANT QUE LA GARDE : la route PROPOSE du serveur
 * exécute ce fichier dans un bac à sable pour fabriquer une bêta candidate depuis une app
 * CORRIGÉE — donc souvent d'une version plus basse. Une garde naïve casserait cette route. Le
 * bac à sable est donc reproduit ici à l'identique depuis server/index.js (`betaDepuis`).
 */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const RACINE = path.join(__dirname, '..');
const TMP = path.join(RACINE, 'tests', '.tmp-720');

let ok = 0, ko = 0;
const vrai = (nom, c) => { if (c) ok++; else { ko++; console.log('  ✗ ' + nom); } };
const eq = (nom, a, b) => { if (a === b) ok++; else { ko++; console.log('  ✗ ' + nom + '\n      obtenu  : ' + JSON.stringify(a) + '\n      attendu : ' + JSON.stringify(b)); } };

try { fs.mkdirSync(TMP, { recursive: true }); } catch (e) {}
const sortie = path.join(TMP, 'beta-essai.html');
const nettoie = () => { try { fs.unlinkSync(sortie); } catch (e) {} };

/* Lance le VRAI générateur vers un fichier d'essai. Jamais vers beta.html : un banc qui
   toucherait au fichier livré serait exactement le défaut qu'il surveille. */
function generer(env) {
  try {
    const out = cp.execFileSync('node', ['beta-build.js', sortie], {
      cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
      env: Object.assign({}, process.env, env || {}),
    });
    return { code: 0, sortie: out, err: '' };
  } catch (e) {
    return { code: e.status === undefined ? -1 : e.status, sortie: String(e.stdout || ''), err: String(e.stderr || '') };
  }
}
const versionDe = (f) => { try { const m = /APP_VERSION = '([^']+)'/.exec(fs.readFileSync(f, 'utf8')); return m ? m[1] : null; } catch (e) { return null; } };
const poser = (v) => fs.writeFileSync(sortie, "<html><script>const APP_VERSION = '" + v + "';</script></html>");
const VRAIE = (/APP_VERSION = '(\d+)'/.exec(fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8')) || [])[1];

console.log('0. Le point de départ');
vrai('app.html porte bien un numéro de version', !!VRAIE && +VRAIE > 0);

console.log('1. Aucun fichier en place → il écrit (premier passage)');
nettoie();
let r = generer();
eq('le générateur réussit', r.code, 0);
vrai('… et le fichier est écrit', !!versionDe(sortie));
eq('… à la version de app.html', versionDe(sortie), VRAIE + '-beta');

console.log('2. Une version PLUS ANCIENNE en place → il écrit (cas normal)');
poser((+VRAIE - 50) + '-beta');
r = generer();
eq('le générateur réussit', r.code, 0);
eq('… et remplace bien par la version courante', versionDe(sortie), VRAIE + '-beta');

console.log('3. La MÊME version en place → il écrit (régénération ordinaire)');
poser(VRAIE + '-beta');
r = generer();
eq('le générateur réussit', r.code, 0);
eq('… la version est inchangée', versionDe(sortie), VRAIE + '-beta');

console.log('4. ⛔ Une version PLUS RÉCENTE en place → IL REFUSE');
/* C'est exactement ce qui s'est passé : beta.html en 701, app.html de main en 695. */
poser((+VRAIE + 6) + '-beta');
r = generer();
eq('⛔ le générateur s\'arrête en erreur', r.code, 1);
vrai('… et le fichier plus récent est INTACT', versionDe(sortie) === (+VRAIE + 6) + '-beta');
vrai('… le message nomme les deux versions',
  r.err.indexOf('v' + VRAIE) >= 0 && r.err.indexOf('v' + (+VRAIE + 6)) >= 0);
vrai('… il dit la cause probable (mauvaise branche)', /main/.test(r.err));
vrai('… et comment passer outre', /BETA_RETROGRADER=1/.test(r.err));

console.log('5. … sauf si on le VEUT explicitement');
poser((+VRAIE + 6) + '-beta');
r = generer({ BETA_RETROGRADER: '1' });
eq('avec BETA_RETROGRADER=1, il écrit', r.code, 0);
eq('… et la version redescend, puisque c\'est demandé', versionDe(sortie), VRAIE + '-beta');

console.log('6. ⛔ La route PROPOSE du serveur ne doit PAS tomber sur la garde');
/* Le bac à sable, recopié depuis server/index.js (betaDepuis) — faux `fs` sans existsSync,
   faux `process` qui n'a QUE exit(), et une écriture qui ne touche jamais le disque. */
{
  const src = fs.readFileSync(path.join(RACINE, 'beta-build.js'), 'utf8');
  /* On lui donne une app d'une version PLUS BASSE que la bêta du dépôt : c'est la situation
     réelle de la route, et celle qui déclencherait la garde si elle était naïve. */
  const appBasse = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8')
    .replace(/const APP_VERSION = '\d+'/, "const APP_VERSION = '" + (+VRAIE - 100) + "'");
  let produite = null, refus = null, ecritDisque = 0;
  const fauxFs = {
    readFileSync: (f, e) => (String(f).endsWith('app.html') ? appBasse : fs.readFileSync(f, e)),
    writeFileSync: (f, d) => { ecritDisque++; if (String(f).endsWith('beta.html')) produite = d; },
  };
  try {
    new Function('require', 'console', 'process', src)(
      (n) => (n === 'fs' ? fauxFs : require(n)),
      { log: () => {}, error: (m) => { throw new Error(String(m)); } },
      { exit: (c) => { if (c) throw new Error('beta-build.js a refusé la génération'); } }
    );
  } catch (e) { refus = e.message; }
  vrai('⛔ le bac à sable produit bien une bêta, malgré une version plus basse', !!produite);
  eq('… et ne refuse rien', refus, null);
  vrai('… la bêta produite porte la version basse qu\'on lui a donnée',
    !!produite && produite.indexOf("APP_VERSION = '" + (+VRAIE - 100) + "-beta'") > 0);
  vrai('… et rien n\'a été écrit sur le vrai disque', ecritDisque === 1);
  /* La raison pour laquelle la garde se tait ici, vérifiée et pas supposée : le faux
     `process` n'expose pas `env`. Si un jour il l'exposait, la route casserait — et cette
     ligne le dirait avant. */
  vrai('la garde est bien conditionnée à l\'existence de process.env', /if \(process\.env && !process\.env\.BETA_RETROGRADER\)/.test(src));
  vrai('… et le bac à sable du serveur ne donne toujours que exit()',
    /\{ exit: \(c\) => \{ if \(c\) throw new Error\('beta-build\.js a refusé la génération'\); \} \}/
      .test(fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8')));
  vrai('… et son faux fs n\'a toujours pas existsSync (on lit en try/catch)',
    !/existsSync/.test(/const fauxFs = \{[\s\S]*?\};/.exec(fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8'))[0]));
}

console.log('7. Le fichier livré n\'a pas été touché par ce banc');
vrai('beta.html du dépôt est intact', !!versionDe(path.join(RACINE, 'beta.html')));

nettoie(); try { fs.rmdirSync(TMP); } catch (e) {}
console.log('\n════ test-720 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
if (ko) process.exit(1);
