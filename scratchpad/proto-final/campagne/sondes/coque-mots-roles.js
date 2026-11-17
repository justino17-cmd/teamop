// Restes coque, tour 2 (17 novembre 2026) — la recherche (Ctrl+K) connaît-elle les MOTS COURANTS de chaque rôle ?
// Le recontrôle 1 a vu que la technicienne n'obtenait rien pour « pointage », « voiture », « planning »… alors que Mes heures,
// Mon camion et Ma journée existent à son menu. La sonde compare chaque mot à ce que le rôle PEUT ouvrir : un mot qui mène à
// une rubrique fermée au rôle n'est pas un défaut (décision de rôle) ; un mot dont la rubrique existe au menu du rôle et qui
// ne répond pas en est un. « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
// Usage : PROFIL=mac node coque-mots-roles.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac';
// mot du débutant → libellé(s) de rubrique(s) du menu qui doivent répondre, PAR RÔLE (population du menu lue sur la page)
const ATTENDU = {
  sm: { pointage:'Mes heures', pointer:'Mes heures', heures:'Mes heures', 'fiche de paie':'Mes heures', véhicule:'Mon camion', voiture:'Mon camion', camion:'Mon camion', carburant:'Mon camion|Mes frais', essence:'Mon camion|Mes frais',
        planning:'Ma journée', calendrier:'Ma journée', rdv:'Ma journée', agenda:'Ma journée', intervention:'Ma journée', rapport:'Ma journée', photo:'Ma journée', chantier:'Ma journée', passage:'Ma journée',
        'note de frais':'Mes frais', remboursement:'Mes frais', frais:'Mes frais', congé:'Mes congés', absence:'Mes congés', vacances:'Mes congés', tâche:'Mes tâches', journée:'Ma journée' },
  julie: { facture:'Comptabilité', banque:'Comptabilité', paie:'Comptabilité', tva:'Comptabilité', client:'Clients', téléphone:'Clients', fournisseur:'Fournisseurs, matériel & produits' }
};
(async () => {
  for (const qui of Object.keys(ATTENDU)) {
    const c = await L.ouvrir({ profil: PROFIL, qui }), p = c.p;
    await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
    v(`${qui} population : la recherche s'ouvre`, await p.evaluate(() => !!document.getElementById('pal')));
    const menu = await p.evaluate(() => rcRubriques().map(r => r.l));
    v(`${qui} population : le menu du rôle est lu (${menu.length} rubriques)`, menu.length >= 3, menu);
    console.log('  · menu ' + qui + ' : ' + menu.join(' | '));
    let nbs = 0;
    for (const [mot, att] of Object.entries(ATTENDU[qui])) {
      const voulus = att.split('|').filter(l => menu.includes(l));
      if (!voulus.length) { console.log('  · (' + qui + ') « ' + mot + ' » → ' + att + ' : rubrique absente du menu de ce rôle, mot écarté'); continue; }
      await p.evaluate(() => { const q = document.getElementById('pal-q'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); });
      await p.keyboard.type(mot, { delay: 5 }); await p.waitForTimeout(40);
      const rep = await p.evaluate(() => [...document.querySelectorAll('#pal .pal-i b')].map(e => e.textContent));
      nbs++;
      v(`${qui} « ${mot} » mène à ${voulus.join(' ou ')}`, voulus.some(l => rep.includes(l)), rep.slice(0, 4));
    }
    v(`${qui} population : ${nbs} mots essayés`, nbs >= 5, nbs);
    await L.fin(c);
  }
  // la sonde rend sa place de navigateur et SORT : sans cela le processus reste vivant jusqu'au délai et garde une des quatre places de la machine (vu le 17 novembre, restes coque tour 2)
  await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
