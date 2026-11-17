// Campagne « planning » : la poignée de la liste de la Carte des tournées (téléphone) fait ce que son nom dit, dans les deux sens (planning-10).
// Usage : timeout 300 node planning-poignee-liste.js [profil]      « N ✓ · M ✗ », code 1 si un contrôle tombe.
const L = require('../../lib.js'); const profil = process.argv[2] || 'iphone';
(async () => { const c = await L.ouvrir({ profil, qui: 'marc' });
  await c.p.evaluate(() => { aller('planning'); plVue = 'carte'; plRef = AUJ; rendre(); }); await L.calme(c.p, 3000);
  const st = () => c.p.evaluate(() => { const b = document.querySelector('[data-crfeuille]'); return b ? { sy: Math.round(scrollY), top: Math.round(document.getElementById('cr-l').getBoundingClientRect().top), nom: b.getAttribute('aria-label') } : null; });
  const s0 = await st(); L.v('la poignée existe, sous le nom « Voir toute la liste des étapes »', !!s0 && /liste des étapes/.test(s0.nom), s0);
  L.v('au départ la liste est sous la carte (en bas de l’écran)', !!s0 && s0.top > 300, s0);
  await L.toucher(c, '[data-crfeuille]'); await L.calme(c.p, 1400); const s1 = await st();
  L.v('un premier toucher amène la liste en haut de l’écran', s1.top < 60, s1);
  L.v('et le nom devient « Revenir à la carte »', /Revenir à la carte/.test(s1.nom), s1);
  await L.toucher(c, '[data-crfeuille]'); await L.calme(c.p, 1400); const s2 = await st();
  L.v('un second toucher ramène la carte (la liste redescend, la page remonte)', s2.top > s1.top + 200 && s2.sy < s1.sy, { s1, s2 });
  L.v('et le nom redevient « Voir toute la liste des étapes »', /liste des étapes/.test(s2.nom), s2);
  await L.fermer(); process.exit(L.bilan() ? 1 : 0); })();
