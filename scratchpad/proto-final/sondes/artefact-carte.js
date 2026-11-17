// LA CARTE DANS L'ARTEFACT (règle i, 17 novembre 2026) : tout hôte hors liste est coupé SANS erreur visible. La carte réelle charge ses tuiles chez
// tiles.openfreemap.org et server.arcgisonline.com (coupés) ; ici, sans Internet, même ses bibliothèques (cdnjs, permises mais injoignables) manquent.
// Exigé : la page ne jette pas, et la carte DIT « Carte réelle indisponible ici… : dessin simplifié » avec un bouton « Réessayer » — jamais une carte vide muette.
// Les requêtes coupées sont COMPTÉES (le bac les nomme). ⛔ 127.0.0.1 seulement.
const A = require('./artefact-commun.js'), { bac, L, v } = A;
(async () => {
  for (const profil of ['mac', 'iphone']) {
    const c = await bac.ouvrir({ profil, qui: 'marc' }, {}); await A.calmer(c.p);
    await L.aller(c.p, 'planning'); await c.p.evaluate(() => { plVue = 'carte'; rendre(); });
    const fini = await L.attendre(c.p, () => crReelEtat === 'ko' || crReelEtat === 'ok', 16000);
    await L.calme(c.p, 400);
    const e = await bac.etat(c), z = await c.p.evaluate(() => ({ etat: crReelEtat, note: ((document.querySelector('.cr-note') || {}).textContent || '').trim(), dessin: !!document.querySelector('#cr-carte'), reessayer: !!document.querySelector('[data-crreessayer]') }));
    v(`${profil} carte : population (la vue Carte est affichée)`, z.dessin, z);
    v(`${profil} carte : l'état est tranché dans les 16 s (« ${z.etat} »)`, fini && z.etat === 'ko', z);
    v(`${profil} carte : l'écran DIT « Carte réelle indisponible ici » avec le dessin et « Réessayer »`, /Carte réelle indisponible ici/.test(z.note) && z.reessayer, z);
    v(`${profil} carte : hôtes coupés/permis comptés par le bac (${e.coupes.length} coupés, ${e.permisHorsLigne.length} permis hors ligne)`, e.coupes.length + e.permisHorsLigne.length >= 1, { c: e.coupes.slice(0, 2), p: e.permisHorsLigne.slice(0, 2) });
    v(`${profil} carte : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
