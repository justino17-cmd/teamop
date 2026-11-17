// Mise en page des écrans « Devis » : aucun glissement latéral (contre la largeur POSÉE du profil), cibles au doigt ≥ 44 px, champs ≥ 16 px,
// texte écrasé — avec des valeurs LONGUES (raison sociale de 77 signes, objet de 130, désignation de 90, 1523,5 × 12 345,67 €).
// usage : node devis-atelier-mise-en-page.js <profils séparés par des virgules> <jour|nuit|les deux>  (CAPT=1 : captures de chaque écran)
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v, fs = require('fs');
const profils = (process.argv[2] || 'mac,iphone').split(','), modes = process.argv[3] === 'jour' ? [false] : process.argv[3] === 'nuit' ? [true] : [false, true];
const LONG = { nom: 'Établissements Dupont-Lefèbvre-Martinez et Associés Climatisation Industrielle', objet: 'Remplacement complet de la centrale de traitement d’air du bâtiment B, dépose, évacuation, fourniture et pose, mise en service et réglages',
  des: 'Centrale de traitement d’air double flux haut rendement avec récupérateur à plaques et batterie à eau chaude intégrée' };
const PREP_LONG = `CLIENTS.zl = { nom:${JSON.stringify(LONG.nom)}, type:'pro', contact:'Jean-Baptiste Dupont-Lefèbvre', tel:'05 46 12 34 56', mail:'jean-baptiste.dupont-lefebvre@etablissements-dupont-lefebvre-martinez.example.fr', adr:'12 rue du Maréchal de Lattre de Tassigny, résidence Les Hauts de la Rochelle, bâtiment B, 17000 La Rochelle', acces:'', depuis:'2026', appareils:[] };
  dvCreer({ cli:'zl', objet:${JSON.stringify(LONG.objet)}, lignes:[[${JSON.stringify(LONG.des)}, 1523.5, 12345.67], ['Ligne libre sans prix', 1, null], ['Déplacement', 1, 29.17]], source:'essai' }); window.__long = location.hash;`;
(async () => {
  for (const profil of profils) for (const nuit of modes) {
    const tag = profil + (nuit ? '-nuit' : '-jour'); console.log('── ' + tag);
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 500);
    const mesure = async (nom, zone) => {
      await L.calme(p, 350); const d = await L.deborde(c), dg = c.doigt ? await L.doigts(p, zone || '#contenu') : { petits: [], champs: [], ecrases: [] };
      const lien = L.v;   // (population : la zone mesurée existe et porte du texte)
      const pop = await p.evaluate(z => { const R = document.querySelector(z) || document.body; return R.querySelectorAll('button, a, input, select, textarea').length; }, zone || '#contenu');
      v(`${tag} ${nom} : population mesurée (${pop} éléments)`, pop > 0);
      v(`${tag} ${nom} : aucun glissement latéral (page ${d.seconde} / ${d.largeur})`, d.bouge === 0 && d.seconde <= d.largeur + 1, d);
      if (c.doigt) { v(`devis-atelier-11 ${tag} ${nom} : cibles au doigt ≥ 44 px (${dg.petits.length} sous le seuil)`, dg.petits.length === 0, dg.petits); v(`devis-atelier-12 ${tag} ${nom} : champs ≥ 16 px`, dg.champs.length === 0, dg.champs); }
      v(`${tag} ${nom} : aucun texte écrasé`, dg.ecrases.length === 0, dg.ecrases);
      if (process.env.CAPT) await L.capture(c, O.CAP + `MEP-${tag}-${nom}.png`);
    };
    await L.aller(p, 'devis'); await p.evaluate(() => { dvFiltre = 'tous'; rendre(); }); await p.evaluate(PREP_LONG); await L.calme(p, 600);
    await mesure('fiche-longue'); await L.capture(c, O.CAP + `MEP-${tag}-fiche-longue-haut.png`);
    await p.evaluate(() => scrollTo(0, 1e5)); await L.calme(p, 300); if (process.env.CAPT) await L.capture(c, O.CAP + `MEP-${tag}-fiche-longue-bas.png`); await p.evaluate(() => scrollTo(0, 0));
    await L.aller(p, 'devis'); await p.evaluate(() => { dvFiltre = 'tous'; rendre(); }); await mesure('liste-tous');
    await p.evaluate(() => { dvFiltre = 'aenvoyer'; rendre(); }); await mesure('liste-aenvoyer');
    for (const [nom, route, prep] of [['fiche-attente', 'devis-x-D-2026-031'], ['fiche-accepte', 'devis-x-D-2026-040'], ['fiche-refuse', 'devis-x-D-2026-036'], ['fiche-expire', 'devis-x-D-2026-027'], ['fiche-brouillon', 'devis-x-BR1']]) { await L.aller(p, route); await mesure(nom); }
    for (const [nom, route, prep] of [['p-rapide', 'devis', 'dvNouveau()'], ['p-rapide-neuf-long', 'devis', `DVN_F = { nv:true, cli:'', type:'pro', nom:${JSON.stringify(LONG.nom)}, prenom:'Jean-Baptiste Dupont-Lefèbvre', tel:'0546123456', mail:'jean-baptiste.dupont-lefebvre@etablissements-dupont.example.fr', adr:'12 rue du Maréchal de Lattre de Tassigny, résidence Les Hauts de la Rochelle', objet:${JSON.stringify(LONG.objet)}, modele:1, err:'Ce client existe peut-être déjà : « ${LONG.nom} » (même e-mail, même téléphone ou même adresse). Touche encore « Préparer le devis » pour le créer quand même, ou choisis-le dans « Client existant ».' }; dvNouveau()`], ['p-dicter', 'devis', 'dvDicter()'], ['p-client-voit', 'devis-x-D-2026-031', 'dvClient(DEVIS_REG["D-2026-031"])'], ['p-reponse', 'devis-x-D-2026-031', 'dvReponse(DEVIS_REG["D-2026-031"])'], ['p-relance', 'devis-x-D-2026-031', 'dvRelancer(DEVIS_REG["D-2026-031"])'], ['p-envoi', 'devis-x-BR1', 'DEVIS_REG["BR1"].lignes[0][2] = 1500; dvEnvoyer(DEVIS_REG["BR1"])']]) {
      await L.aller(p, route); await p.evaluate(prep); await L.calme(p, 450); await mesure(nom, '#calque'); await L.ranger(p); }
    console.log('  erreurs de la page :', c.err.length, c.err.slice(0, 2)); await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
