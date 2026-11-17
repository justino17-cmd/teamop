// Contraste de nuit (et de jour) des écrans « Devis » : chaque texte contre son fond réel (couleurs composées), seuil 4,5 (3 pour les grands textes).
// usage : node devis-atelier-contraste.js <profil> <jour|nuit>
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
  const ecrans = [['liste-tous', 'devis', 'dvFiltre="tous"; rendre()', '#contenu'], ['fiche-brouillon', 'devis-x-BR1', '', '#contenu'], ['fiche-attente', 'devis-x-D-2026-031', '', '#contenu'], ['fiche-accepte', 'devis-x-D-2026-040', '', '#contenu'], ['fiche-refuse', 'devis-x-D-2026-036', '', '#contenu'],
    ['p-rapide', 'devis', 'dvNouveau()', '#calque .panneau'], ['p-dicter', 'devis', 'dvDicter()', '#calque .panneau'], ['p-client-voit', 'devis-x-D-2026-031', 'dvClient(DEVIS_REG["D-2026-031"])', '#calque .panneau'], ['p-reponse', 'devis-x-D-2026-031', 'dvReponse(DEVIS_REG["D-2026-031"])', '#calque .panneau'], ['p-envoi', 'devis-x-BR1', 'DEVIS_REG["BR1"].lignes[0][2] = 1500; dvEnvoyer(DEVIS_REG["BR1"])', '#calque .panneau']];
  for (const [nom, route, prep, zone] of ecrans) {
    await L.aller(p, route); if (prep) { await p.evaluate(prep); await L.calme(p, 500); }
    const r = await O.A.contrastes(p, zone, 4.5, '.pdf, .pdf *');
    v(`contraste ${nuit ? 'nuit' : 'jour'} ${profil} ${nom} : ${r.n} textes mesurés, ${r.bas.length} sous le seuil`, r.n > 5 && r.bas.length === 0, r.bas);
    await L.ranger(p);
  }
  console.log('err', c.err.length);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
