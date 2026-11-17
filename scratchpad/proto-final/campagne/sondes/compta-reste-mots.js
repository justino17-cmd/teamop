// Relecture des MOTS : le texte visible de chaque onglet de ma partie, en mode application (ce que lit une vraie personne), écrit dans
// campagne/mots-compta-reste.json ; repère les restes d'échafaudage (prototype, vraie version, exemple, fictif, essai, simul…) et les sigles.
// usage : node compta-reste-mots.js [qui] — « N ✓ · M ✗ » : un reste d'échafaudage trouvé est un ✗
const X = require('./compta-reste-outils.js'), L = X.L, fs = require('fs');
const ECHAF = /prototype|vraie version|pour l.essai|d.exemple|fictif|fictive|simul[ée]|démonstration|dans cette démo|à titre d.exemple/i;
(async () => {
  const qui = process.argv[2] || 'marc', c = await L.ouvrir({ profil: 'mac', qui }), p = c.p, sortie = {};
  for (const [o, nom] of X.ONGLETS) {
    await X.compta(c, o); await L.calme(p, 400); const t = await X.texte(p); sortie[o] = t;
    const m = [...new Set((t.match(new RegExp('[^.\\n]*(' + ECHAF.source + ')[^.\\n]*', 'gi')) || []).map(s => s.trim().slice(0, 160)))];
    L.v(`mots · ${nom} : aucun reste d'échafaudage`, m.length === 0, m);
  }
  fs.writeFileSync(`${__dirname}/../mots-compta-reste.json`, JSON.stringify(sortie, null, 1));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
