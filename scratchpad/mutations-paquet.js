/* Contre-épreuve du PAQUET GIT de l'espace de test (test-3321, 2988, 2989) : chaque mutation remet un vrai défaut dans une COPIE du dépôt
   (git archive de HEAD — rien n'est touché ici) et exige que la suite visée TOMBE. Usage : node scratchpad/mutations-paquet.js
   ⛔ Ordre du dépôt : correctif → banc → commit → mutation (ce script part de HEAD). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execSync, spawnSync } = require('child_process');
const DEPOT = path.join(__dirname, '..');
const D = 'server/deployer-test.sh', I = 'server/install-test.sh', E = 'scripts/atelier/envoyer-test.sh';
const MUTATIONS = [
  { id: 'M1', quoi: 'le paquet n\'est plus contrôlé (git bundle verify retiré)', f: D, avant: 'git_miroir bundle verify -q "$PAQUET" >/dev/null 2>&1 \\', apres: 'true \\', suites: ['3321'] },
  { id: 'M2', quoi: 'la tête n\'est plus comparée au sha demandé', f: D, avant: '| grep -qxF "$SHA refs/heads/$BRANCHE" \\', apres: '| grep -q "" \\', suites: ['3321'] },
  { id: 'M3', quoi: 'la taille n\'est plus refusée', f: D, avant: '[ "$(stat -c %s "$PAQUET")" -le "$MAX_OCTETS" ] ||', apres: 'true ||', suites: ['3321'] },
  { id: 'M4', quoi: 'le déployeur retourne chercher le commit sur le réseau (fetch origin)', f: D, avant: '  || { echo "✗ le commit $COURT est inconnu du miroir', apres: '  || git_miroir fetch --quiet origin "$SHA" 2>/dev/null || { echo "✗ le commit $COURT est inconnu du miroir', suites: ['3321', '2988'] },
  { id: 'M5', quoi: 'l\'installeur retélécharge ses fichiers de root sur le réseau', f: I, avant: '  git_prod show "$SRC_SHA:$1" > "$2" 2>/dev/null && [ -s "$2" ]', apres: '  curl -fsSL -o "$2" "https://raw.githubusercontent.com/x/y/$SRC_SHA/$1" 2>/dev/null && [ -s "$2" ]', suites: ['2989'] },
  { id: 'M6', quoi: 'la clé de l\'atelier n\'est plus bridée à son adresse (from= retiré)', f: I, avant: 'LIGNE="from=\\"$ATELIER_IP\\",restrict,', apres: 'LIGNE="restrict,', suites: ['2989'] },
  { id: 'M7', quoi: 'l\'ancienne clé de GitHub n\'est plus retirée', f: I, avant: 'grep -v -e " $MARQUE_SSH\\$" -e " $MARQUE_SSH_ANCIENNE\\$" "$AUTH"', apres: 'grep -v -e " $MARQUE_SSH\\$" "$AUTH"', suites: ['2989'] },
  { id: 'M8', quoi: 'l\'installeur ne vérifie plus que le dépôt de la production appartient à root', f: I, avant: 'if [ -z "$R" ] && [ "$(stat -c %u "$DEPOT_PROD" "$DEPOT_PROD/.git")" != $\'0\\n0\' ]; then', apres: 'if false; then', suites: ['2989'] },
  { id: 'M9', quoi: 'l\'envoi de l\'atelier renvoie tout l\'historique (etat ignoré)', f: E, avant: 'CONNUS+=("$l")', apres: 'true', suites: ['3321'] },
];
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mutations-paquet-'));
execSync(`git -C ${DEPOT} archive HEAD | tar -x -C ${dir}`);
let echecs = 0;
const lancer = (s) => { const r = spawnSync('node', ['tests/test-' + s + '.js'], { cwd: dir, encoding: 'utf8', timeout: 300000 }); const m = (r.stdout.match(/(\d+) ✓\s+(\d+) ✗/g) || []).pop() || '?'; return { ko: /(\d+) ✗/.exec(m) ? +/(\d+) ✗/.exec(m)[1] : -1, m, rc: r.status }; };
const base = ['3321', '2988', '2989'].map(s => [s, lancer(s)]);
console.log('TÉMOIN (aucune mutation) :', base.map(([s, r]) => s + ' ' + r.m).join(' · '));
if (base.some(([, r]) => r.ko !== 0)) { console.log('✗ le témoin n\'est pas vert : rien à prouver'); process.exit(1); }
for (const m of MUTATIONS) {
  const p = path.join(dir, m.f); const orig = fs.readFileSync(p, 'utf8');
  if (orig.split(m.avant).length !== 2) { console.log(`✗ ${m.id} : l'ancre n'est pas trouvée une fois (mutation mal visée)`); echecs++; continue; }
  try {
    fs.writeFileSync(p, orig.replace(m.avant, () => m.apres));
    const res = m.suites.map(s => [s, lancer(s)]);
    const tombe = res.some(([, r]) => r.ko !== 0);
    console.log(`${tombe ? '✓' : '✗'} ${m.id} ${m.quoi} → ${res.map(([s, r]) => s + ' ' + r.m).join(' · ')}${tombe ? '' : '   ⛔ LA MUTATION NE MORD PAS'}`);
    if (!tombe) echecs++;
  } finally { fs.writeFileSync(p, orig); }
}
fs.rmSync(dir, { recursive: true, force: true });
console.log(echecs ? `\n⛔ ${echecs} mutation(s) ne mordent pas` : '\n✓ toutes les mutations font tomber leur sonde');
process.exit(echecs ? 1 : 0);
