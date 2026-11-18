// Recontrôle adverse metier-3d, 18 novembre 2026 (recontrole-01) : dans « Saisir un passage », la phrase sous « Produits posés »
// (« Le stock du camion de X descend de ce que tu poses ») suit-elle l'applicateur choisi ? Le gérant change l'applicateur : la phrase
// doit nommer SON camion. Population : au moins trois applicateurs offerts. Rend « N ✓ · M ✗ ».
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
(async () => { for (const profil of ['mac', 'iphone']) { const c = await O.ouvrir({ profil, qui: 'marc', packs: O.METIERS.d3 }), p = c.p; await L.aller(p, 'registre');
  await L.toucher(c, p.locator('#contenu [data-rg="cli|t1"]').first()); await L.calme(p, 500);
  await L.toucher(c, p.locator('#contenu [data-rg="passage"]').locator('visible=true').first()); await L.calme(p, 700);
  const opts = await p.evaluate(() => [...document.querySelectorAll('#rg-appl option')].map(o => [o.value, o.textContent.trim()]));
  v(profil + ' : au moins trois applicateurs offerts (population)', opts.length >= 3, JSON.stringify(opts));
  for (const [val, lib] of opts.slice(0, 4)) { await p.selectOption('#rg-appl', val); await L.calme(p, 400);
    const ph = await p.evaluate(() => { const m = (document.getElementById('calque') || document).innerText.match(/Le stock du camion de [^.]*\./); return m ? m[0] : ''; });
    const prenom = lib.split(/\s|\(/)[0]; v(profil + ' : applicateur « ' + lib + ' » → la phrase nomme ' + prenom, ph.includes(prenom), '« ' + ph + ' »'); }
  await L.fin(c); }
  await L.fermer(); process.exit(O.bilan('metier-3d-recontrole-f', ok, ko, [])); })().catch(async e => { console.log('ERREUR', e.stack); await L.fermer(); process.exit(2); });
