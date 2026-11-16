// L'échafaudage de revue n'existe pas en mode application (MENU-FINAL.md) : ni « Prototype », ni « pour l'essai », ni « faite », ni
// « Tester en tant que », ni « À refaire », ni « rien n'est enregistré », ni « Dans ce prototype », ni les interrupteurs de revue.
// Et hors du mode application (le prototype nu, pour l'équipe) il est bien là : sans ça, ce contrôle ne prouverait rien.
const { L, texteVisible } = require('./menu-commun.js'), v = L.v;
const ECHAFAUDAGE = [[/Prototype/i, 'Prototype'], [/pour l[’']essai/i, "pour l'essai"], [/Tester en tant que/i, 'Tester en tant que'], [/À refaire · \d+ sur \d+|On la refait ensemble/i, 'À refaire'], [/rien n[’']est enregistré/i, "rien n'est enregistré"],
  [/Dans ce prototype/i, 'Dans ce prototype'], [/simuler la réponse/i, 'simuler la réponse'], [/voir l[’']écran comme/i, "voir l'écran comme"], [/Recharge pour repartir/i, 'Recharge pour repartir']];
const ECRANS = { marc:['accueil', 'planning', 'interventions', 'inter-x-i1', 'client-x-vp', 'clientvoit', 'taches', 'absences', 'clients', 'devis', 'contrats', 'achats', 'stock', 'produits', 'boxes', 'equipe', 'pointage', 'vehicules', 'boiteMail', 'statistiques', 'historique'],
  julie:['taches', 'interventions', 'devis', 'contrats', 'achats'], sm:['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences', 'inter-x-i1'] };
(async () => {
  let ecrans = 0; const trouves = {};
  for (const profil of ['mac', 'iphone']) for (const qui of ['marc', 'julie', 'sm']) {
    const c = await L.ouvrir({ profil, qui }), tag = `${profil}/${qui}`;
    for (const r of ECRANS[qui]) {
      await c.p.evaluate(() => { const z = document.getElementById('cpsys'); if (z) { const b = z.querySelector('[data-cpsys="retour"]'); if (b) b.click(); } });
      await L.aller(c.p, r); ecrans++;
      let t = await texteVisible(c.p, ['#menu', '#contenu', '#barre-bas']);
      if (profil === 'iphone' && r === ECRANS[qui][0]) { await L.toucher(c, '#contenu .tt-menu'); t += '\n' + await texteVisible(c.p, ['#calque']); await L.ranger(c.p); }
      for (const [re, nom] of ECHAFAUDAGE) if (re.test(t)) (trouves[tag + ' · ' + nom] = trouves[tag + ' · ' + nom] || []).push(r);
    }
    // les panneaux de revue : la fiche d'une personne (Équipe), la fiche de l'intervention d'essai
    if (qui === 'marc') {   // les panneaux de création : une intervention, un client, une absence, une tâche
      for (const g of ["ouvrirCreation({})", "ACTIONS.clientNouveau()", "aPanneauNouveau('sm')"]) { await c.p.evaluate(x => { try { eval(x); } catch (e) {} }, g); await L.calme(c.p, 300); const t = await texteVisible(c.p, ['#calque']); ecrans++;
        for (const [re, nom] of ECHAFAUDAGE) if (re.test(t)) (trouves[tag + ' · panneau · ' + nom] = [g]); await L.ranger(c.p); }
      await L.aller(c.p, 'equipe'); await c.p.evaluate(() => eqFiche('sm')); await L.calme(c.p, 400); const t = await texteVisible(c.p, ['#calque']); ecrans++;
      for (const [re, nom] of ECHAFAUDAGE) if (re.test(t)) (trouves[tag + ' · fiche Équipe · ' + nom] = ['fiche']); await L.ranger(c.p); }
    const q = await c.p.evaluate(() => ({ bande:!!document.querySelector('.rl-bande'), proto:!!document.querySelector('.bandeau-proto'), faite:!!document.querySelector('.m-faite'), mch:!!document.querySelector('.mch-b'), az:!!document.querySelector('.rl-az') }));
    v(`${tag} : ni bande « Tester en tant que », ni bandeau « Prototype », ni « faite » dans le document`, !q.bande && !q.proto && !q.faite && !q.mch && !q.az, q);
    await L.fin(c);
  }
  v(`mode application : aucun mot d'échafaudage sur ${ecrans} écrans (menu, barre, feuille, panneaux)`, Object.keys(trouves).length === 0, trouves);
  v('population : des écrans lus', ecrans >= 60, ecrans);
  // le prototype nu : l'échafaudage est là (la preuve que la recherche ci-dessus sait trouver quelque chose)
  { const c = await L.ouvrir({ profil:'mac', app:false, qui:null }); const t = await texteVisible(c.p, ['#menu', '#contenu']);
    const eu = ECHAFAUDAGE.filter(([re]) => re.test(t)).map(x => x[1]);
    const nf = await c.p.evaluate(() => document.querySelectorAll('#menu .m-faite').length);
    v('prototype nu : la bande « Tester en tant que », le bandeau « Prototype » et les « faite » sont là', ['Tester en tant que', 'Prototype'].every(n => eu.includes(n)) && nf >= 8, { eu, faite:nf });
    await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
