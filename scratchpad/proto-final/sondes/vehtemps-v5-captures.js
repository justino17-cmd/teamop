// Véhicules et Temps de travail, étape 5 — LES CAPTURES À REGARDER (outil Read) : Mon camion et Ma journée (Sophie), l'Accueil du gérant (les deux lignes), la fiche d'Équipe de Sophie,
// sur les profils demandés, jour ET nuit. Dans chacune la sonde mesure aussi ce que l'œil ne voit pas toujours : un débordement latéral (contre la largeur POSÉE), une cible sous 44 px au doigt.
// Les images vont dans $CAP (hors dépôt) : /tmp/claude-0/…/scratchpad/cap/vehtemps5/. PROFILS=iphone,mac NUIT=0,1 ECRANS=camion,journee,accueil,equipe pour restreindre.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,windows,ipad,iphone,android,petit').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(x => x === '1');
const ECRANS = (process.env.ECRANS || 'camion,journee,accueil,equipe').split(',');
const CAP = (process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap') + '/vehtemps5/';
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? '-nuit' : '-jour');
    for (const ecran of ECRANS) {
      const qui = ecran === 'accueil' || ecran === 'equipe' ? 'marc' : 'sm', c = await L.ouvrir({ profil, qui, calme:true, nuit });
      const route = { camion:'moncamion', journee:'majournee', accueil:'accueil', equipe:'equipe' }[ecran];
      await L.aller(c.p, route); if (ecran === 'accueil') { await c.p.evaluate(() => { const b = document.querySelector('[data-vhacc]'); if (b) b.scrollIntoView({ block:'center' }); }); await L.calme(c.p, 500); }   // la carte « À faire maintenant » est sous le pli : on la regarde
      if (ecran === 'equipe') { await c.p.evaluate(() => eqFiche('sm')); await L.calme(c.p, 500); }
      await L.capture(c, CAP + ecran + '-' + nom + '.png');
      const d = await L.deborde(c), t = c.doigt ? await L.doigts(c.p, ecran === 'equipe' ? '#calque .panneau' : '#contenu') : { petits:[], ecrases:[] };
      const pop = await c.p.evaluate(e => ({ camion:!!document.querySelector('#mc-vehicule .vh-cam'), journee:!!document.querySelector('.vh-ligne-cam'), accueil:document.querySelectorAll('#contenu [data-vhacc]').length === 2, equipe:!!document.querySelector('#calque .panneau .eq-tete') }[e]), ecran);
      v(nom + ' · ' + ecran + ' : l\'écran attendu est affiché (population)', !!pop, pop);
      v(nom + ' · ' + ecran + ' : aucun débordement latéral (largeur ' + d.largeur + ')', d.bouge === 0 && d.seconde <= d.largeur, d);
      if (c.doigt) v(nom + ' · ' + ecran + ' : aucune cible sous 44 px au doigt, aucun texte écrasé', t.petits.length === 0 && t.ecrases.length === 0, t);
      v(nom + ' · ' + ecran + ' : zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
