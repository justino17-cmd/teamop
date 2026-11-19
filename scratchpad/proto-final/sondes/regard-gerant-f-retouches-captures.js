// LE REGARD — gérant F, RETOUCHES : prend les captures des écrans retouchés (aperçu du PDF et son plan, barre du devis, activité, menu, écrans vides,
// « Planifier »), un profil et un mode (jour/nuit) à la fois. Les captures vont HORS dépôt ; c'est l'œil (planches) qui les juge.
//   node regard-gerant-f-retouches-captures.js <profil> [nuit]      → <CAP>/<scène>-<profil>-<jour|nuit>.png
const fs = require('fs'), path = require('path'), L = require('../lib.js');
const CAP = process.env.CAP_RETOUCHES || '/tmp/cap-ret/shots/';
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  await p.evaluate(() => mchPoser(['3d'])); await L.calme(p, 500);
  const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 500); return ok; };
  const neuf = () => p.evaluate(() => { try { d3Cli = 't1'; d3Ouvert = null; d3Sel = null; d3Mode = null; cbEdit = null; cbReleve = null; cbFiltre = 'tout'; cbZone = ''; rgTous = true; rgQ = ''; rgSaisie = null; DX = null; } catch (e) {} });
  const defiler = sel => p.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, sel);
  const prise = async nom => { await L.calme(p, 300); await L.capture(c, `${CAP}${nom}-${tag}.png`, false); };
  // 1 et 2 : aperçu du PDF du registre — le plan (pastilles / noms de zone) puis la barre et « Fermer »
  await neuf(); await L.aller(p, 'registre'); await clic('[data-rg="cli|t1"]', 600); await clic('[data-rg^="pdf|"]', 900);
  await defiler('#calque .d3-plan'); await prise('r1-pdf-plan');
  await defiler('#calque .doc-barre'); await p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); if (pan) pan.scrollTop = pan.scrollHeight; }); await prise('r2-pdf-barre');
  await L.ranger(p);
  // 3 : barre du bas du devis xylophage
  await neuf(); await L.aller(p, 'devisXylo'); await p.selectOption('[data-dx="cli"]', { index: 1 }); await clic('[data-dxb="zadd|Combles|bois"]', 400);
  await p.evaluate(() => { const e = document.querySelector('[data-dx^="zm|"]'); e.value = '60'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await L.calme(p, 600); await prise('r3-devis-barre');
  // 4 : activité, passage après passage
  await neuf(); await L.aller(p, 'registre'); await clic('[data-rg="cli|t1"]', 600); await defiler('.d3-histo'); await prise('r4-activite');
  // 6 : menu (ordinateur et tablette), la colonne descendue jusqu'à la fin
  if (!['iphone', 'android', 'petit'].includes(profil)) { await neuf(); await L.aller(p, 'registre'); await prise('r6-menu-courant');
    await p.evaluate(() => { const l = document.querySelector('.menu .m-liste'); l.scrollTop = Math.round((l.scrollHeight - l.clientHeight) / 2); l.dispatchEvent(new Event('scroll')); }); await prise('r6-menu-milieu'); }
  // 5 : écrans vides
  await p.evaluate(() => { window.__cli = { ...D3_CLI }; Object.keys(D3_CLI).forEach(k => delete D3_CLI[k]); });
  await neuf(); await L.aller(p, 'registre'); await prise('r5-vide-registre');
  await neuf(); await L.aller(p, 'carteBox'); await prise('r5-vide-carte');
  await p.evaluate(() => { Object.assign(D3_CLI, window.__cli); });
  // 8 : « Planifier » depuis la fiche d'un site sans intervention prévue
  await neuf(); await L.aller(p, 'registre'); await clic('[data-rg="cli|t2"]', 600); await defiler('[data-rg="planifier|t2"]'); await prise('r8-planifier-fiche');
  await clic('[data-rg="planifier|t2"]', 900); await prise('r8-planifier-ouvert');
  console.log(`[${tag}] prises` + (c.err.length ? ' · ERREURS : ' + c.err.slice(0, 3).join(' | ') : ' · aucune erreur JS'));
  await L.fin(c); await L.fermer(); process.exit(0);
})().catch(async e => { console.log('✗ ' + (e.stack || e)); try { await L.fermer(); } catch (x) {} process.exit(1); });
