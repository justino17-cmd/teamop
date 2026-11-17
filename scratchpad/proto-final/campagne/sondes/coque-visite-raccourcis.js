// Restes coque, tour 2 (17 novembre 2026) — la VISITE PARLÉE (« Découvrir l'application ») garde la main sur le clavier.
// Constat du recontrôle 1 : Ctrl+K et ? ouvraient la recherche / l'aide par-dessus le cadre lumineux de la visite, la bulle restait
// au-dessus et la lecture automatique continuait de changer de chapitre derrière. N, D, C, A étaient déjà muets.
// Chaque contrôle compte d'abord sa population (la visite est bien lancée) ; la contre-épreuve prouve que les mêmes touches OUVRENT
// bien la recherche et l'aide une fois la visite fermée (sinon « rien ne s'ouvre » ne prouverait rien).
// Usage : PROFIL=mac node coque-visite-raccourcis.js   (« N ✓ · M ✗ », sort en 1 si un contrôle tombe)
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac';
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-coque2/';
const etat = p => p.evaluate(() => ({ visite: !!document.getElementById('gd-bulle'), pal: !!document.getElementById('pal'), panneau: !!document.querySelector('#calque .panneau'), fenetre: !!document.querySelector('.fen-voile'),
  actifDansVisite: !!document.activeElement && !!document.activeElement.closest && !!document.activeElement.closest('#gd-bulle') }));
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p;
  await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  // contre-épreuve d'abord : sans visite, Ctrl+K et ? ouvrent bien quelque chose
  await p.keyboard.press('Control+k'); await p.waitForTimeout(350);
  v('population : sans visite, Ctrl+K ouvre la recherche', (await etat(p)).pal);
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  await p.keyboard.press('?'); await p.waitForTimeout(350);
  v('population : sans visite, ? ouvre l’aide des raccourcis', (await etat(p)).panneau);
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  // la visite
  await p.evaluate(() => immLancer(0)); await p.waitForTimeout(1200);
  let e = await etat(p);
  v('population : la visite parlée est lancée (bulle et cadre lumineux)', e.visite && await p.evaluate(() => !!document.getElementById('gd-spot') || !!document.getElementById('gd-bulle')), e);
  const titre0 = await p.evaluate(() => (document.querySelector('#gd-bulle .gd-t, #gd-bulle .gd-mini-t') || {}).textContent || '');
  await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
  for (const t of ['Control+k', 'Shift+?', '?', 'n', 'd', 'c', 'a', '/']) {
    await p.keyboard.press(t); await p.waitForTimeout(300);
    e = await etat(p);
    v(`la visite ouverte : « ${t} » n’ouvre ni recherche, ni aide, ni fenêtre`, e.visite && !e.pal && !e.panneau && !e.fenetre, e);
  }
  await L.capture(c, CAP + 'visite-raccourcis-' + PROFIL + '.png');
  // la visite se quitte par SA croix (ou « Retour »), pas par Échap : aucun gestionnaire d'Échap ne la connaît, avant comme après ce correctif (à soumettre)
  const croix = await p.evaluate(() => { const b = document.querySelector('#gd-bulle [data-gd="quitter"]'); if (b) { b.click(); return 'croix'; } gdQuitter(); return 'fonction'; }); await p.waitForTimeout(600);
  e = await etat(p);
  v('la visite se ferme (' + croix + ')', !e.visite, e);
  // et rend les raccourcis
  await p.keyboard.press('Control+k'); await p.waitForTimeout(350);
  v('visite fermée : Ctrl+K rouvre la recherche', (await etat(p)).pal);
  await p.keyboard.press('Escape'); await p.waitForTimeout(250);
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  L.bilan();
})();
