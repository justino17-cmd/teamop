// Campagne « clients » (17 novembre 2026) — AU CLAVIER (ordinateur) : touche « C » = Nouveau client, palette Ctrl/Cmd+K (client trouvé, « nouveau client »), Échap, Tab dans la liste.
// Usage : PROFIL=mac|windows node clients-clavier.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac';
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p;
  const cmd = PROFIL === 'mac' ? 'Meta' : 'Control';
  const MACdetecte = await p.evaluate(() => typeof MAC !== 'undefined' ? MAC : null); const mod = MACdetecte ? 'Meta' : 'Control';
  const pan = () => p.evaluate(() => (document.querySelector('#calque .panneau h2') || {}).textContent || '');
  await L.aller(p, 'accueil'); await p.locator('body').click({ position: { x: 700, y: 400 } }).catch(() => {}); await p.keyboard.press('c'); await L.calme(p, 500);
  v('touche « C » (annoncée « Nouveau client C ») ouvre « Nouveau client » depuis l’accueil', /Nouveau client/.test(await pan()), await pan()); await L.ranger(p);
  await L.aller(p, 'clients'); await p.keyboard.press('Escape'); await p.keyboard.press(mod + '+k'); await L.calme(p, 400);
  const pal = await p.evaluate(() => !!document.getElementById('pal')); v('Ctrl/Cmd + K ouvre la palette', pal);
  await p.keyboard.type('mimosa'); await L.calme(p, 400); const res = await p.evaluate(() => [...document.querySelectorAll('#pal .pal-i, #pal [data-pal], #pal li, #pal button')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 6));
  v('la palette trouve « Copropriété Les Mimosas » en tapant « mimosa » : ' + JSON.stringify(res), res.some(t => /Mimosas/.test(t)), res);
  await p.keyboard.press('Enter'); await L.calme(p, 600); const h = await p.evaluate(() => ({ hash: location.hash, h1: (document.querySelector('#contenu h1') || {}).textContent })); v('Entrée ouvre la fiche du client choisi', /client-x-mi/.test(h.hash) && /Mimosas/.test(h.h1), h);
  await p.keyboard.press(mod + '+k'); await L.calme(p, 300); await p.keyboard.type('nouveau client'); await L.calme(p, 400); await p.keyboard.press('Enter'); await L.calme(p, 600); v('la palette « nouveau client » + Entrée ouvre « Nouveau client »', /Nouveau client/.test(await pan()) || (await p.evaluate(() => !!document.querySelector('#fenetre .fen'))), await pan()); await L.ranger(p); await p.evaluate(() => { try { fermerCreation(); } catch (e) {} });
  // Tab : la liste se parcourt au clavier, Entrée ouvre
  await L.aller(p, 'clients'); await p.evaluate(() => document.activeElement && document.activeElement.blur()); let nom = ''; for (let i = 0; i < 14 && !/client-carte/.test(nom); i++) { await p.keyboard.press('Tab'); nom = await p.evaluate(() => (document.activeElement && document.activeElement.className) || ''); }
  v('Tab atteint une carte client (' + nom + ')', /client-carte/.test(nom), nom); await p.keyboard.press('Enter'); await L.calme(p, 500); v('Entrée sur une carte ouvre la fiche', /client-x-/.test(await p.evaluate(() => location.hash)));
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e); process.exit(2); });
