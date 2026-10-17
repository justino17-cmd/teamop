/* ⛔ CE QUE CE FICHIER GARDE — `scripts/verif-secrets.sh` RECONNAÎT LES CLÉS STRIPE, SLACK, SENDGRID ET NPM (17 octobre 2026).

   L'audit des skills OWASP a relevé qu'AUCUN de ces formats n'était reconnu, alors que le serveur appelle
   Stripe avec une clé secrète : une copie dans ce dépôt public ouvrirait le compte de facturation de toutes
   les entreprises. Ce banc lance le VRAI script dans un dépôt git temporaire et tient trois choses :
     1. chaque format neuf fait refuser (code 1) et se NOMME ;
     2. ⛔ la valeur du secret n'apparaît jamais dans la sortie — on la recolle dans des journaux de CI ;
     3. les exemples de documentation (`sk_test_xxx`, `whsec_...`) passent : un garde-fou qui crie faux se
        fait désactiver.
   ⚠️ Les fausses clés sont ÉCRITES EN MORCEAUX, comme dans test-716 : écrites d'un bloc, ce fichier ferait
   lui-même tomber le contrôle de la CI (`verif-secrets.sh --suivis`). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const SCRIPT = path.join(__dirname, '..', 'scripts', 'verif-secrets.sh');
if (spawnSync('git', ['--version']).status !== 0) { console.log('  (git absent — banc sauté)\n0 ✓  0 ✗'); return; }

/* 24 caractères qui ne ressemblent à rien de réel */
const corps = 'Zq8Kp3Lm7Wn2Xc5Vb9Rt4Yh6';
const CLES = [
  ['clé Stripe (secrète ou restreinte)', 'sk' + '_li' + 've_' + corps],
  ['clé Stripe (secrète ou restreinte)', 'rk' + '_te' + 'st_' + corps],
  ['secret de webhook Stripe', 'wh' + 'sec_' + corps],
  ['jeton Slack', 'xo' + 'xb-' + '1234567890-' + corps],
  ['clé SendGrid', 'S' + 'G.' + corps + '.' + corps],
  ['jeton npm', '//registry.npmjs.org/:_auth' + 'Token=' + corps],
];

function lancer(fichiers) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'secrets-'));
  spawnSync('git', ['init', '-q'], { cwd: dir });
  for (const [nom, contenu] of Object.entries(fichiers)) fs.writeFileSync(path.join(dir, nom), contenu);
  spawnSync('git', ['add', '-A'], { cwd: dir });
  const r = spawnSync('bash', [SCRIPT, '--suivis'], { cwd: dir, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: r.status, sortie: (r.stdout || '') + (r.stderr || '') };
}

console.log('\n1. Chaque format neuf est refusé, et nommé');
for (const [libelle, cle] of CLES) {
  const r = lancer({ 'config.js': 'const k = "' + cle + '";\n' });
  v('refusé : ' + libelle, r.code, 1);
  vrai('   et nommé dans la sortie', r.sortie.includes(libelle));
  v('   ⛔ sans jamais afficher la valeur', r.sortie.includes(corps), false);
}

console.log('\n2. Les exemples de documentation passent');
const r2 = lancer({ 'doc.md': [
  'Clé de test : sk_test_xxx (remplacer par la vôtre).',
  'Secret de webhook : whsec_...',
  'SendGrid : SG.xxxxx.yyyyy',
  'Slack : xoxb-...',
].join('\n') + '\n' });
v('un fichier d\'exemples courts ne fait rien refuser', r2.code, 0);

console.log('\n3. Population : le script a bien examiné quelque chose');
const r3 = lancer({ 'a.txt': 'rien\n', 'b.js': 'const k = "' + CLES[0][1] + '";\n' });
vrai('avec deux fichiers dont un fautif, il refuse (le banc ne mesure pas un dépôt vide)', r3.code === 1 && r3.sortie.includes('b.js'));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
