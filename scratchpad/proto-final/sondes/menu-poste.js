// Le POSTE écrit sous le nom de la personne est UN seul mot, celui que la fiche Équipe porte : « Gérant », « Secrétariat », « Technicienne »…
// (16 novembre 2026, relecture : le menu de l'ordinateur écrivait « Patron », la feuille « Menu » du téléphone « Gérant »).
// Le nom de ROLE de revue (Patron, Gestion, Technicien) ne s'affiche jamais en mode application. Ordinateur : la carte du haut de la colonne
// (#menu .rl-moi) ; téléphone : la ligne du haut de la feuille « Menu » (.fm-moi). Ouvertures avec session (?auto=) ET changement de personne.
// ⛔ 127.0.0.1 seulement. Une sonde compte sa population avant de conclure.
const { L } = require('./menu-commun.js'), v = L.v;
const POSTES = { marc:'Gérant', julie:'Secrétariat', sm:'Technicienne', kb:'Chef d’équipe' };
(async () => {
  let n = 0;
  for (const profil of ['mac', 'ipad']) for (const nuit of [false, true]) for (const [qui, poste] of Object.entries(POSTES)) {
    const c = await L.ouvrir({ profil, nuit, qui }); await L.calme(c.p, 300);
    const m = await c.p.evaluate(() => { const e = document.querySelector('#menu .rl-moi'); return e && e.offsetParent ? { nom:e.querySelector('b').textContent.trim(), poste:e.querySelector('small').textContent.trim() } : null; });
    const tag = `${profil} ${nuit ? 'nuit' : 'jour'} ${qui}`;
    if (m) { n++; v(`${tag} : la carte du menu dit « ${poste} » (le poste d'Équipe), jamais le nom du rôle de revue`, m.poste === poste, m); }
    else v(`${tag} : pas de carte « moi » visible (permis, la colonne se tasse sur un écran bas) — le pied porte le nom`, true);
    await L.fin(c);
  }
  for (const [qui, poste] of Object.entries(POSTES)) {
    const c = await L.ouvrir({ profil:'iphone', qui }); await L.calme(c.p, 300);
    await L.aller(c.p, qui === 'sm' ? 'majournee' : qui === 'julie' ? 'devis' : 'accueil'); await L.calme(c.p, 300);   // la Comptabilité de la secrétaire s'ouvre en plein écran, sans bouton « Menu »
    await L.toucher(c, '#contenu .tt-menu'); await L.calme(c.p, 400);
    const f = await c.p.evaluate(() => { const e = document.querySelector('#calque .panneau .fm-moi'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; });
    n++; v(`iphone ${qui} : la feuille « Menu » dit « ${poste} »`, !!f && f.endsWith('· ' + poste), f);
    await L.fin(c);
  }
  // personne qui change sans recharger (la revue) : le poste suit
  { const c = await L.ouvrir({ profil:'mac', qui:'marc' }); await c.p.evaluate(() => sessionOuvrir('julie')); await L.calme(c.p, 400);
    const m = await c.p.evaluate(() => { const e = document.querySelector('#menu .rl-moi small'); return e ? e.textContent.trim() : null; });
    n++; v('marc → julie sans recharger : « Secrétariat »', m === 'Secrétariat', m); await L.fin(c); }
  // le prototype nu : personne n'est connecté, on choisit un rôle dans « Tester en tant que » — le poste vient de la personne que le rôle représente
  { const c = await L.ouvrir({ profil:'mac', app:false, qui:null });
    for (const [role, poste] of [['patron', 'Gérant'], ['gestion', 'Secrétariat'], ['tech', 'Technicienne']]) {
      await c.p.evaluate(r => rlChanger(r, { muet:true }), role); await L.calme(c.p, 400);
      const m = await c.p.evaluate(() => { const e = document.querySelector('#menu .rl-moi small'); return e ? e.textContent.trim() : null; });
      n++; v(`prototype nu, rôle ${role} : « ${poste} »`, m === poste, m); }
    await L.fin(c); }
  v('population : des cartes et des feuilles ont été lues', n >= 8, n);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
