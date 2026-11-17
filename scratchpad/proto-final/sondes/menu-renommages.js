// Les renommages : on rend CHAQUE route de chaque rôle (ordinateur et téléphone, feuille « Menu » comprise) et on cherche, dans le texte
// AFFICHÉ (innerText, pas le code de la page), les anciens noms (MENU-FINAL.md, « Renommages »). Une route qui ne rend rien se DIT.
const { L, ROUTES, texteVisible } = require('./menu-commun.js'), v = L.v;
const VIEUX = [[/tableau de bord/i, 'Tableau de bord'], [/\bCRM\b/, 'CRM'], [/\bBoxes\b/, 'Boxes'], [/Temps & équipe|Temps &amp; équipe/, 'Temps & équipe'], [/\bAdministration\b/, 'Administration'], [/Planification/, 'Planification'],
  [/\bCommunication\b/, 'Communication'], [/Métier 3D/, 'Métier 3D'], [/Toutes les catégories/, 'Toutes les catégories'], [/Interv\./, 'Interv.'], [/Absences (&|&amp;) congés/, 'Absences & congés'],
  [/Mes frais et demandes|Mes notes de frais/, 'Mes frais et demandes / Mes notes de frais'], [/Paiements et encaissements/, 'Paiements et encaissements'], [/Équipe et réglages/, 'Équipe et réglages'], [/Mon compte/, 'Mon compte']];
const TECH_SEUL = [[/notes de frais/i, 'notes de frais (côté technicien)']];
const ROUTES_RENDUES = {
  marc:['accueil', 'statistiques', 'historique', 'planning', 'interventions', 'clientvoit', 'taches', 'absences', 'clients', 'devis', 'contrats', 'boiteMail', 'comptabilite', 'achats', 'stock', 'produits', 'boxes', 'equipe', 'pointage', 'vehicules', 'registre', 'carteBox', 'devisXylo', 'factures', 'encaissements', 'inter-x-i1', 'client-x-vp'],
  julie:['taches', 'interventions', 'clients', 'devis', 'contrats', 'comptabilite', 'achats', 'inter-x-i1', 'client-x-vp'],
  sm:['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences', 'registre', 'inter-x-i1']
};
(async () => {
  let lus = 0, vides = 0;
  for (const profil of ['mac', 'iphone']) for (const qui of ['marc', 'julie', 'sm']) {
    const c = await L.ouvrir({ profil, qui }), tag = `${profil}/${qui}`;
    if (qui === 'marc') await c.p.evaluate(() => { mchPoser([...PACKS_ENT, '3d']); });   // le pack 3D est pris : ses trois écrans existent
    if (qui === 'sm') await c.p.evaluate(() => { mchPoser([...PACKS_ENT, '3d']); });
    const trouves = {};
    for (const r of ROUTES_RENDUES[qui]) {
      await c.p.evaluate(() => { const z = document.getElementById('cpsys'); if (z) { const b = z.querySelector('[data-cpsys="retour"]'); if (b) b.click(); } });
      await L.aller(c.p, r); lus++;
      const zones = profil === 'mac' ? ['#menu', '#contenu'] : ['#contenu', '#barre-bas'];
      const t = await texteVisible(c.p, zones);
      if (t.trim().length < 20) { vides++; v(`${tag} · #${r} : l'écran affiche du texte`, false, t.length); continue; }
      for (const [re, nom] of VIEUX.concat(qui === 'sm' ? TECH_SEUL : [])) if (re.test(t)) (trouves[nom] = trouves[nom] || []).push(r);
      // la feuille « Menu » (téléphone) : on la lit aussi, sur la première route
      if (profil === 'iphone' && r === ROUTES_RENDUES[qui][0]) { await L.toucher(c, '#contenu .tt-menu'); const f = await texteVisible(c.p, ['#calque']);
        for (const [re, nom] of VIEUX.concat(qui === 'sm' ? TECH_SEUL : [])) if (re.test(f)) (trouves[nom] = trouves[nom] || []).push('feuille Menu'); await L.ranger(c.p); }
    }
    v(`${tag} : aucun ancien nom dans le texte affiché (${ROUTES_RENDUES[qui].length} écrans lus)`, Object.keys(trouves).length === 0, trouves);
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
    await L.fin(c);
  }
  // la palette de recherche (ordinateur) et la barre personnalisable : mêmes noms
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' });
    const noms = await c.p.evaluate(() => palEntrees().filter(e => e.g === 'Aller à').map(e => e.l));
    v('palette : les rubriques sont celles du menu, avec les nouveaux noms', ['Accueil', 'Absences et congés', 'Achats et frais', 'Dépôts et camions', 'Paiements'].every(n => noms.includes(n)) && !noms.includes('Paiements et encaissements') && !noms.includes('Tableau de bord'), noms);
    const r = await c.p.evaluate(() => rcRubriques().map(x => x.l)); v('raccourcis ⌘ 1…9 : lus dans le même menu', r[0] === 'Accueil' && r[1] === 'Statistiques' && r.length === 20, r);
    const ch = await c.p.evaluate(() => mbChoix().map(x => x[1])); v('barre personnalisable : les choix sont les lignes du menu du gérant (sans « Plus »)', ch.length === 20 && !ch.some(x => /Plus/.test(x)), ch);
    await L.fin(c); }
  // les droits (Équipe) portent les noms de la table
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' }); await L.aller(c.p, 'equipe'); await c.p.evaluate(() => eqFiche('julie')); await L.calme(c.p, 400);
    // les cases de droits sont dans un bloc replié : on lit le texte du panneau, déplié ou non
    const t = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? P.textContent.replace(/\s+/g, ' ') : ''; });
    v('droits : « Équipe et réglages » est devenu « Équipe », « Achats » « Achats et frais », « encaissements » « paiements »', t.length > 200 && !/Équipe et réglages/.test(t) && /Achats et frais/.test(t) && /dépôts/.test(t) && !/encaissements/.test(t), t.slice(0, 80));
    await L.fin(c); }
  // « Ce que voit le client » n'a plus de ligne au menu : un texte ne doit pas y envoyer, il dit par où passer (la fiche d'une intervention)
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' }); await c.p.evaluate(() => panneauReglagesRdv()); await L.calme(c.p, 400);
    const t = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? P.textContent.replace(/\s+/g, ' ') : ''; });
    v('réglages des rendez-vous : le renvoi passe par la fiche d\'une intervention, pas par une ligne de menu qui n\'existe plus', /Pour les voir : ouvre une intervention, touche « Voir le lien client »/.test(t) && !/Pour les voir : « Ce que voit le client »/.test(t), t.slice(-300));
    await L.fin(c); }
  v('population : des écrans lus, aucun vide', lus >= 60 && vides === 0, { lus, vides });
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
