// IMPRIME LA CONSIGNE COMPLÈTE de chaque étape d'une voie, telle que voies.js la donnerait à son agent — sans rien lancer.
// Pourquoi : une SESSION SŒUR (une autre machine, ouverte quand celle du chef de chantier n'a plus de processeurs) doit pouvoir jouer
// une étape elle-même, ou la confier à un sous-agent, si l'outil Workflow ne lui est pas ouvert. Même chargement que essai-a-blanc.js.
//   node scratchpad/proto-final/workflows/consigne.js '{"voie":"vehtemps","depuis":7,"jusqua":7,"arbre":"/home/user/wt-soeur"}'
//   node scratchpad/proto-final/workflows/consigne.js '{"voie":"guide","arbre":"/home/user/wt-soeur"}' --liste     # les étiquettes seulement
const fs = require('fs'), path = require('path');
let args; try { args = JSON.parse(process.argv[2] || ''); } catch (e) { console.error('✗ premier argument : les args de la voie, en JSON — ' + e.message); process.exit(2); }
const liste = process.argv.includes('--liste');
const src = fs.readFileSync(path.join(__dirname, 'voies.js'), 'utf8').replace(/^export const meta\b/m, 'const meta');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const fn = new AsyncFunction('args', 'agent', 'log', 'phase', 'parallel', 'pipeline', 'budget', src);
const vus = [];
fn(args, async (texte, opts) => { vus.push({ label: opts.label, texte }); return 'x'; }, () => {}, () => {}, async t => Promise.all(t.map(f => f())), async () => [], { total: null, spent: () => 0, remaining: () => Infinity })
  .then(() => { if (!vus.length) { console.error('✗ aucune étape pour ces args'); process.exit(1); }
    for (const v of vus) console.log(liste ? v.label : `\n════════ ${v.label} ════════\n${v.texte}`); })
  .catch(e => { console.error('✗ ' + e.message); process.exit(1); });
