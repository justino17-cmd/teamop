// CONTRÔLE DE FUMÉE DE LA CONNEXION (chef de chantier, 17 novembre 2026) : l'écran de connexion du mode application s'ouvre
// SANS figer la page, par l'adresse (#lien-…) et par le bouton « Voir comme l'application » du mode revue, et l'on en revient.
// Pourquoi ce fichier existe : fumee-routes.js entre toujours avec un compte (?app=1&auto=marc) et ne passe donc JAMAIS par
// l'écran de connexion. Le 17 novembre à 12 h 54, l'arrêt d'urgence du chantier a enregistré une MUTATION d'essai restée dans
// la page (« Revenir au mode test » posé dans <body> au lieu de #cnx : la garde `c.querySelector('#cnx-test')` ne le voyait
// plus, l'observateur le reposait sans fin) : la page figeait à l'ouverture de la connexion — 918 contrôles de fumée verts
// pendant ce temps. C'est le bouton par lequel Justin atteint la connexion, OP Security et le guide dans l'artefact.
//   node scratchpad/proto-final/sondes/fumee-connexion.js            # mac, iphone
//   PROFILS=mac,android node …
// ⛔ 127.0.0.1 seulement. Chaque attente est BORNÉE : une page figée doit donner un ✗ qui dit où, jamais une sonde qui pend.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(','), SLUG = 'clim-services-17';
const borne = (p, ms, quoi) => Promise.race([p, new Promise((_, non) => setTimeout(() => non(new Error(quoi + ' : rien au bout de ' + ms / 1000 + ' s (page figée ?)')), ms))]);
const lire = p => p.evaluate(() => ({ app: typeof MODE_APP !== 'undefined' && MODE_APP === true, cnx: !!document.querySelector('#cnx'), champs: document.querySelectorAll('#cnx input').length,
  retour: document.querySelectorAll('#cnx-test').length, dedans: document.querySelectorAll('#cnx #cnx-test').length }));
(async () => {
  for (const profil of PROFILS) {
    // 1. Par l'adresse « #lien-<entreprise> », sans « ?app=1 » : c'est exactement ce que pose le bouton avant de recharger.
    let c = null;
    try {
      c = await borne(L.ouvrir({ profil, requete: '', hash: 'lien-' + SLUG, qui: null, attente: 1500 }), 70000, 'ouverture du mode application sans compte');
      const e = await borne(lire(c.p), 8000, 'lecture de l\'écran de connexion');
      v(`${profil} · par l'adresse : l'écran de connexion s'affiche, en mode application`, e.app && e.cnx, e);
      v(`${profil} · par l'adresse : « Revenir au mode test » existe UNE fois, et DANS la fenêtre de connexion`, e.retour === 1 && e.dedans === 1, e);
      v(`${profil} · par l'adresse : aucune erreur JavaScript`, !c.err.length, c.err.slice(0, 2));
    } catch (x) { v(`${profil} · par l'adresse : la page s'ouvre sans figer`, false, x.message.split('\n')[0]); }
    if (c) await borne(L.fin(c), 6000, 'fermeture').catch(() => {});
    // 2. Par le bouton du mode revue, puis retour par « Revenir au mode test ».
    c = null;
    try {
      c = await borne(L.ouvrir({ profil, app: false }), 70000, 'ouverture du mode revue');
      v(`${profil} · mode revue : le bouton « Voir comme l'application » est là`, await borne(c.p.evaluate(() => !!document.querySelector('.rl-voir')), 8000, 'lecture du mode revue'));
      await c.p.evaluate(() => { document.querySelector('.rl-voir').click(); }).catch(() => {});   // le geste recharge la page : l'évaluation peut être coupée, c'est attendu
      const arrive = await borne(c.p.waitForFunction(() => typeof MODE_APP !== 'undefined' && MODE_APP === true && !!document.querySelector('#cnx #cnx-test'), null, { timeout: 40000 }), 45000, 'après le bouton').then(() => true, x => x.message.split('\n')[0]);
      v(`${profil} · mode revue : le bouton mène à l'écran de connexion de l'application, « Revenir au mode test » dedans`, arrive === true, arrive);
      if (arrive === true) {
        const e = await borne(lire(c.p), 8000, 'lecture après le bouton');
        v(`${profil} · après le bouton : un seul « Revenir au mode test »`, e.retour === 1, e);
        await c.p.evaluate(() => { document.querySelector('#cnx-test').click(); }).catch(() => {});
        const revenu = await borne(c.p.waitForFunction(() => typeof MODE_APP !== 'undefined' && MODE_APP === false && !!document.querySelector('.rl-voir') && !document.querySelector('#cnx'), null, { timeout: 40000 }), 45000, 'retour au mode test').then(() => true, x => x.message.split('\n')[0]);
        v(`${profil} · « Revenir au mode test » ramène au mode revue`, revenu === true, revenu);
      }
    } catch (x) { v(`${profil} · mode revue : le passage en mode application ne fige pas`, false, x.message.split('\n')[0]); }
    if (c) await borne(L.fin(c), 6000, 'fermeture').catch(() => {});
  }
  await borne(L.fermer(), 10000, 'fermeture du navigateur').catch(() => {});
  process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('✗ la sonde a jeté :', e.message); await borne(L.fermer(), 8000, 'fermeture').catch(() => {}); process.exit(1); });
