/* test-3006 — LA CLÉ SSH DE LA PRODUCTION NE SE LIT QUE DEPUIS L'ENVIRONNEMENT PROTÉGÉ `serveur-prod` (25 octobre 2026).
   Un secret du DÉPÔT se lit depuis n'importe quelle branche qui modifie un workflow ; `VPS_SSH_KEY` ouvre un shell root sur la production. Comme
   `msg-prod` pour OP MESSAGES, le job qui la lit déclare son environnement (qui n'accepte que `main`, réglé dans GitHub). Ce banc lit TOUS les
   workflows, découpés par job : un job qui lit `secrets.VPS_SSH_KEY` (le nom exact, pas `_TEST`, `_MSG_…`) sans `environment: serveur-prod` le fait tomber. */
'use strict';
const fs = require('fs'), path = require('path');
const D = path.join(__dirname, '..', '.github', 'workflows');
let ok = 0, ko = 0;
const vrai = (t, c, info) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (info !== undefined ? ' — ' + String(info).slice(0, 300) : '')); } };
const fichiers = fs.readdirSync(D).filter(f => /\.ya?ml$/.test(f));
vrai('(population) les workflows sont lus : ' + fichiers.length, fichiers.length >= 5);
const lecteurs = [], fautifs = [];
for (const f of fichiers) {
  const t = fs.readFileSync(path.join(D, f), 'utf8').replace(/^\s*#.*$/gm, '');
  const i = t.search(/^jobs:\s*$/m); if (i < 0) continue;
  const jobs = t.slice(i).split(/^(?=  [A-Za-z0-9_-]+:\s*$)/m).slice(1);
  for (const j of jobs) {
    const nom = (/^  ([A-Za-z0-9_-]+):/.exec(j) || [])[1];
    if (!/secrets\.VPS_SSH_KEY\b(?!_)/.test(j)) continue;
    lecteurs.push(f + ' › ' + nom);
    if (!/^    environment:\s*serveur-prod\s*$/m.test(j)) fautifs.push(f + ' › ' + nom);
  }
}
vrai('(population) au moins un job lit la clé de production (le déploiement du serveur) : ' + lecteurs.join(', '), lecteurs.length >= 1);
vrai('⛔ chacun déclare l’environnement protégé `serveur-prod`', !fautifs.length, fautifs.join(', '));
console.log(`\ntest-3006 : ${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);
