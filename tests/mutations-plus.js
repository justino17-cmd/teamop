/* ══ LES MUTATIONS DU « + » JUGÉES PAR LA SONDE — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER » (CLAUDE.md) ═════════════════════════════════
   Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js`). Les mutations que `tests/test-857.js` § 4 bis voit par le texte sont dans `tests/mutations-opmessages.js` (série N). Celles-ci ne sont vues que
   par un navigateur : l'index qui ne fait plus défiler, le glissé ignoré, une feuille ou une conversation qui EMPILE une entrée d'historique au lieu de remplacer la sienne (un retour qui rouvre la feuille).
   Chacune est posée dans l'ARBRE (la page, puis le générateur refait `server-msg/public/`), la sonde `sonde-opmessages-plus.js --rapide` est lancée, puis `git checkout` restaure.
   ⛔ Lancer APRÈS `git commit` du correctif : le `git checkout` restaure depuis HEAD, un correctif non commité partirait avec la mutation (CLAUDE.md, trois fois le 19 septembre 2026).
   Lancer :  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/mutations-plus.js            (les quatre)
             node tests/mutations-plus.js S2 S3                                                                   (seulement celles-là)
   Mesuré le 5 octobre 2026 : S1 79 ✓ 5 ✗ · S2 42 ✓ 5 ✗ · S3 83 ✓ 1 ✗ · S4 36 ✓ 4 ✗ (la sonde entière rend 0 ✗ sur l'arbre intact). */
'use strict';
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const PAGE = path.join(RACINE, 'apercu', 'opmessages', 'index.html');
const MUTATIONS = [
  ['S1', 'l\'index ne fait plus défiler (ndAller n\'écrit plus scrollTop)', '    $(\'nd-defile\').scrollTop = Math.max(0, cible.offsetTop - 4);\n', '    void cible;\n'],
  ['S2', '« Nouveau groupe » EMPILE une entrée (un retour rouvre « Nouvelle discussion »)', 'ouvrirFeuille(\'chat\', true)', 'ouvrirFeuille(\'chat\')'],
  ['S3', 'le glissé le long de l\'index est ignoré (pointermove)', 'if (!ndGlisse) return; const l = ndLettreSous', 'return; const l = ndLettreSous'],
  ['S4', 'un contact EMPILE la conversation au lieu de remplacer l\'entrée de la feuille (un retour rouvre la feuille)', 'memeRoute(h.p, cible)) rendreEntree(); else remplacer(cible);', 'memeRoute(h.p, cible)) rendreEntree(); else pousser(cible);'],
];
const lancer = (args, delai) => spawnSync(process.execPath, args, { cwd: RACINE, encoding: 'utf8', timeout: delai || 60000, env: process.env });
const git = (...a) => spawnSync('git', a, { cwd: RACINE, encoding: 'utf8' });
const choisies = process.argv.slice(2);
let tombees = 0, jouees = 0;
for (const [id, nom, a, b] of MUTATIONS) {
  if (choisies.length && !choisies.includes(id)) continue;
  const s = fs.readFileSync(PAGE, 'utf8');
  if (s.split(a).length !== 2) { console.log(id + ' · MAL VISÉE (le motif se trouve ' + (s.split(a).length - 1) + ' fois) — ' + nom); continue; }
  fs.writeFileSync(PAGE, s.replace(a, b));
  try {
    lancer(['scripts/opmsg-public.js']);
    const r = lancer(['tests/sonde-opmessages-plus.js', '--rapide'], 400000), sortie = (r.stdout || '') + (r.stderr || '');
    const rouges = sortie.match(/^ {2}✗ .*$/gm) || [], total = (sortie.match(/\d+ ✓ +\d+ ✗/g) || []).pop();
    jouees++; if (rouges.length) tombees++;
    console.log(id + ' · ' + (rouges.length ? 'TOMBE' : 'NE TOMBE PAS') + ' · ' + total + ' — ' + nom);
    rouges.slice(0, 3).forEach(x => console.log('      ' + x.slice(0, 190)));
  } finally {
    git('checkout', '--', 'apercu/opmessages/index.html', 'server-msg/public');
  }
}
console.log('\n' + tombees + ' / ' + jouees + ' mutations tombent ; git status : ' + JSON.stringify(git('status', '--short').stdout.trim()));
process.exit(tombees === jouees && jouees > 0 ? 0 : 1);
