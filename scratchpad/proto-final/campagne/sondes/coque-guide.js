// Campagne « coque » (17 novembre 2026) — le GUIDE DES NOUVEAUTÉS. REFAIT le 17 novembre par la voie « guide » : l'ancien guide (quatre pages, table NV_PLACE
// ligne à ligne) n'existe plus, et avec lui ce que cette sonde lisait (NV.pages à quatre pages, boutons « aller| », promesses d'une ligne « Rubrique › onglet »).
// Ce que la campagne voulait savoir reste vrai et se joue maintenant par les sondes du guide, que ce fichier lance au même format (PROFIL=mac|iphone QUI=marc,julie,sm,kb) :
//   guide-voir.js    chaque « Voir » mène à l'écran qu'il nomme, dont le titre porte les mots de la carte ;
//   guide-mots.js    chaque phrase est vraie sur son écran (la promesse est lue à l'écran), vingt mots au plus, aucun mot technique ;
//   guide-fermer.js  ✕, Échap, « Plus tard », un toucher dehors ferment ; « Nouveautés » rouvre ; une seule ouverture par compte ; jamais par-dessus une fenêtre.
const cp = require('child_process'), path = require('path');
const dossier = path.join(__dirname, '..', '..', 'sondes');
let ko = 0;
for (const s of ['guide-voir.js', 'guide-mots.js', 'guide-fermer.js']) {
  const r = cp.spawnSync('node', [path.join(dossier, s)], { env: { ...process.env, QUI: process.env.QUI || 'marc,sm' }, encoding: 'utf8', timeout: 570000 });
  const bil = ((r.stdout || '').match(/== \d+ ✓ · \d+ ✗/) || ['(pas de bilan)'])[0];
  console.log(s.padEnd(20), bil, '(sortie ' + r.status + ')'); if (r.status !== 0) { ko++; console.log((r.stdout || '').split('\n').filter(l => /^ ✗/.test(l)).slice(0, 6).join('\n')); } }
console.log(`\n== ${3 - ko} ✓ · ${ko} ✗`); process.exit(ko ? 1 : 0);
