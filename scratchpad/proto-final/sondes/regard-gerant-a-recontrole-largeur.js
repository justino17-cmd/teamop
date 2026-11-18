// RECONTRÔLE du regard gérant A (second regard, 18 novembre 2026) : la PAGE garde-t-elle la largeur de l'appareil ?
// Trouvé à la main : à 320 px, Planning et Interventions faisaient 340 px (innerWidth 340, scrollWidth 340) — la fenêtre de mise en page
// grandit, la page se réduit ou glisse de côté, et chaque fenêtre en plein écran (position:fixed) mesure 340 : la croix de « Rendez-vous
// en ligne » sortait de 4 px. Les audits de débordement qui comparent scrollWidth à innerWidth ne le voient pas : innerWidth a grandi avec la page
// (règle du dépôt : « on compare à la largeur POSÉE du profil »). Ici on compare à la largeur du profil, rubrique par rubrique et onglet par onglet.
//   node regard-gerant-a-recontrole-largeur.js [profil ...]      (par défaut : les six, jour)
// Chaque profil compte les écrans mesurés (population) ; sortie 1 si un contrôle tombe.
const L = require('../lib.js');
const LARGEUR = { mac: 1440, mac720: 1440, windows: 1366, ipad: 820, iphone: 390, android: 360, petit: 320 };
const profils = process.argv.slice(2).length ? process.argv.slice(2) : ['petit', 'android', 'iphone', 'ipad', 'windows', 'mac'];
let ok = 0, ko = 0;
const v = (m, c, d) => { if (c) ok++; else { ko++; console.log('  ✗ ' + m + (d ? ' — ' + d : '')); } };
const ECRANS = [
  ['accueil', null], ['statistiques', null], ['historique', null],
  ['planning', null], ['planning · jour', '[data-plvue=jour]'], ['planning · semaine', '[data-plvue=semaine]'], ['planning · mois', '[data-plvue=mois]'], ['planning · vue d\'ensemble', '[data-plvue=general]'], ['planning · sur mesure', '[data-plvue=multi]'],
  ['interventions', null], ['interventions · à planifier', '[data-filtreint=plan]'], ['interventions · toutes', '[data-filtreint=tout]'],
  ['taches', '[data-tonglet=auj]'], ['taches · à venir', '[data-tonglet=avenir]'], ['taches · faites', '[data-tonglet=faites]'],
  ['absences', '[data-aonglet=valider]'], ['absences · calendrier', '[data-aonglet=calendrier]'], ['absences · soldes', '[data-aonglet=soldes]'],
  ['inter-x-i1', null], ['inter-x-i5', null],
];
(async () => {
  for (const profil of profils) {
    const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p, W = LARGEUR[profil]; let n = 0;
    for (const [nom, sel] of ECRANS) {
      await L.ranger(p); await L.aller(p, nom.split(' · ')[0]);
      if (sel) { await p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); }, sel); await L.calme(p, 500); }
      const r = await p.evaluate(() => ({ iw: innerWidth, cw: document.documentElement.clientWidth, sw: document.documentElement.scrollWidth }));
      n++;
      v(`${profil} · ${nom} : la page garde la largeur de l'appareil (${W})`, r.iw === W && r.sw <= W + 1, JSON.stringify(r));
    }
    v(`${profil} : les ${ECRANS.length} écrans sont mesurés (population)`, n === ECRANS.length, String(n));
    await L.fin(c);
  }
  console.log(`== ${ok} ✓ · ${ko} ✗`);
  await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
