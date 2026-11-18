// PARCOURS 12 — « le parcours 1 en entier AU TÉLÉPHONE, pour chaque rôle » : le courriel du client, la création par le gérant, le camion de la technicienne, la facture du bureau, l'espace du client
// qui paie, puis la Comptabilité, l'Accueil et la fiche qui disent « payée » — rejoués sur iPhone (jour ET nuit), Android (360 px), le plus petit écran (320 px) et iPad. Le parcours 1 prend ses profils
// par PROFIL=… NUIT=1 : cette sonde ne fait que le lancer cinq fois, à la suite (un seul navigateur à la fois), et additionne (17 novembre 2026).
// ⛔ 127.0.0.1 seulement. Sort en 1 si une exécution tombe.
const { spawnSync } = require('child_process'), path = require('path');
const CAS = [['iphone', '0'], ['iphone', '1'], ['android', '0'], ['petit', '0'], ['ipad', '0']];
let ok = 0, ko = 0, tombes = 0;
for (const [profil, nuit] of CAS) {
  const r = spawnSync('node', [path.join(__dirname, 'parcours-1.js')], { env:Object.assign({}, process.env, { PROFIL:profil, NUIT:nuit }), encoding:'utf8', timeout:540000 });
  const sortie = (r.stdout || '') + (r.stderr || ''), m = [...sortie.matchAll(/== (\d+) ✓ · (\d+) ✗/g)].pop();
  const n = m ? +m[1] : 0, f = m ? +m[2] : 1; ok += n; ko += f; if (r.status !== 0 || !m) tombes++;
  console.log('  ' + ((r.status === 0 && m && !f) ? '✓' : '✗') + ' parcours 1 sur ' + profil + (nuit === '1' ? ' (nuit)' : ' (jour)') + ' : ' + n + ' ✓ · ' + f + ' ✗ (sortie ' + r.status + ')');
  if (f || r.status !== 0) console.log(sortie.split('\n').filter(l => /✗/.test(l)).slice(0, 4).map(l => '      ' + l.slice(0, 300)).join('\n'));
}
console.log('\n== ' + ok + ' ✓ · ' + (ko + (tombes && !ko ? tombes : 0)) + ' ✗');
process.exit(ko || tombes ? 1 : 0);
