// CAPTURES « bouton Retour » (17 novembre 2026) : ce que l'œil doit voir. Une fenêtre ouverte par-dessus un écran, puis le MÊME écran après Retour (fenêtre fermée, rien de redessiné de travers),
// téléphone et ordinateur, jour ET nuit. Les captures vont dans $CAP (hors dépôt) et se REGARDENT (outil Read) : ce qui est laid, coupé ou mal aligné se corrige.
// PROFIL=android|iphone|mac (défaut android) ; NUIT=1. Rend « N ✓ · M ✗ ».
const path = require('path');
const C = require('./retour-commun.js'), L = C.L, v = C.v;
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/retour';
(async () => {
  const profil = process.env.PROFIL || 'android', nuit = !!process.env.NUIT, c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p, tel = C.etroit(c), tag = profil + (nuit ? '-nuit' : '-jour');
  await L.aller(p, 'accueil'); await L.aller(p, 'clients'); await C.defiler(p); await L.calme(p, 300);
  await L.capture(c, path.join(CAP, 'retour-' + tag + '-1-avant.png'));
  await L.toucher(c, '[data-action="clientNouveau"]'); await L.calme(p, 400);
  await L.capture(c, path.join(CAP, 'retour-' + tag + '-2-fenetre-ouverte.png'));
  const o = await C.hist(p); v('la fenêtre est ouverte (une entrée)', o.pousse === 1, o);
  await C.retour(p); await L.calme(p, 400);
  await L.capture(c, path.join(CAP, 'retour-' + tag + '-3-apres-retour.png'));
  const a = await C.hist(p); v('après Retour : la fenêtre est fermée et l\'écran est resté (Clients)', a.ouverts === '' && a.h === '#clients', a);
  if (tel) {
    await L.aller(p, 'accueil'); await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.calme(p, 400);
    await L.capture(c, path.join(CAP, 'retour-' + tag + '-4-menu-ouvert.png'));
    await C.retour(p); await L.calme(p, 400);
    await L.capture(c, path.join(CAP, 'retour-' + tag + '-5-menu-ferme.png'));
    const m = await C.hist(p); v('la feuille « Menu » est fermée par Retour, Accueil est resté', m.ouverts === '' && m.h === '#accueil', m);
  }
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
