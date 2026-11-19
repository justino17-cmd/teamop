// LE REGARD — gérant F, SECOND REGARD : sur un plan de box (page, aperçu du PDF du registre, plan imprimé), le NOM d'une zone (« CUISINE »,
// « RÉSERVE », « COUR ») est-il recouvert par une pastille de box ? Vu sur capture (téléphone) : dans l'aperçu du PDF du registre, la pastille 5
// tombe sur « CUISINE », la 3 sur « RÉSERVE », la 1 sur « COUR ». La sonde mesure les rectangles : étiquette de zone contre chaque pastille.
//   node scratchpad/proto-final/sondes/regard-gerant-f-recontrole-plan.js [profil,profil…]   (défaut : mac,ipad,iphone,android,petit)
// Elle SORT EN 1 tant qu'un nom de zone est recouvert : c'est un constat, pas une garde verte (cf. regard-gerant-f-recontrole.json).
const L = require('../lib.js');
const v = L.v;
const profils = (process.argv[2] || 'mac,ipad,iphone,android,petit').split(',');
const clic = async (p, sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 600); return ok; };
// pour chaque plan visible : le nombre de pastilles qui recouvrent (de plus de 4 px² ) l'étiquette d'une zone
const mesure = (p, racine) => p.evaluate(r => { const out = []; for (const plan of document.querySelectorAll(r + ' .d3-plan')) { const pr = plan.getBoundingClientRect(); if (pr.width < 20) continue;
  const etiq = [...plan.querySelectorAll('.d3-z > i')].map(i => ({ n: i.textContent.trim(), r: (() => { const rg = document.createRange(); rg.selectNodeContents(i); return rg.getBoundingClientRect(); })() }));
  const pins = [...plan.querySelectorAll('.d3-box')].map(b => ({ n: b.textContent.trim(), r: b.getBoundingClientRect() }));
  const hits = []; for (const e of etiq) for (const b of pins) { const w = Math.min(e.r.right, b.r.right) - Math.max(e.r.left, b.r.left), h = Math.min(e.r.bottom, b.r.bottom) - Math.max(e.r.top, b.r.top); if (w > 2 && h > 2) hits.push(e.n + ' ← pastille ' + b.n + ' (' + Math.round(w) + '×' + Math.round(h) + ' px)'); }
  out.push({ largeurPlan: Math.round(pr.width), zones: etiq.length, pastilles: pins.length, hits }); } return out; }, racine);
(async () => {
  for (const profil of profils) {
    const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
    await p.evaluate(() => mchPoser(['3d'])); await L.calme(p, 500);
    const neuf = () => p.evaluate(() => { try { d3Cli = 't1'; d3Ouvert = null; d3Sel = null; d3Mode = null; cbEdit = null; cbReleve = null; cbFiltre = 'tout'; cbZone = ''; rgTous = true; rgQ = ''; rgSaisie = null; } catch (e) {} });
    // 1. la carte des box, à l'écran
    await neuf(); await L.aller(p, 'carteBox'); const a = await mesure(p, '#contenu');
    v(`${profil} : carte des box — un plan est mesuré (population)`, a.length >= 1 && a[0].zones >= 3 && a[0].pastilles >= 8, a.map(x => [x.largeurPlan, x.zones, x.pastilles]));
    v(`${profil} : carte des box — aucun nom de zone recouvert par une pastille`, a.every(x => !x.hits.length), a.map(x => x.hits));
    // 2. l'aperçu du PDF du registre
    await neuf(); await L.aller(p, 'registre'); await clic(p, '[data-rg="cli|t1"]', 600); const ok = await clic(p, '[data-rg^="pdf|"]', 900);
    const b = await mesure(p, '#calque');
    v(`${profil} : aperçu du PDF du registre — le plan est ouvert et mesuré (population)`, ok && b.length >= 1 && b[0].zones >= 3 && b[0].pastilles >= 8, b.map(x => [x.largeurPlan, x.zones, x.pastilles]));
    v(`${profil} : aperçu du PDF du registre — aucun nom de zone recouvert par une pastille`, b.every(x => !x.hits.length), b.map(x => x.hits));
    await L.ranger(p);
    // 3. la page du registre (plan de l'activité, s'il y en a un)
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('✗ sonde tombée : ' + (e.stack || e)); try { await L.fermer(); } catch (x) {} process.exit(1); });
