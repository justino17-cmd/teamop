// LE REGARD — la TECHNICIENNE (qui:'sm') sur le Registre sanitaire (consigne de la sœur 35 : « regarder aussi la technicienne »).
// Les mêmes scènes que le gérant (regard-gerant-f-captures.js, section 1), jouées avec son compte : on mesure ce qu'elle voit et
// ce qu'elle peut faire, pas seulement la mise en page. Écrit aussi un petit bilan JSON par profil (droits, scènes sans cible).
//   node regard-gerant-f-technicienne.js <profil> [nuit]
const fs = require('fs');
const L = require('../lib.js');
const CAP = process.env.CAP_REGARD || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/regard-technicienne-f/';
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
(async () => {
  fs.mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }), p = c.p, bilan = { profil, nuit, scenes: {} };
  const clic = async (sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return ok; };
  await p.evaluate(() => mchPoser(['3d'])); await L.calme(p, 500);
  const a3 = async h => { await p.evaluate(() => { try { d3Cli = 't1'; d3Ouvert = null; d3Sel = null; d3Mode = null; cbEdit = null; cbReleve = null; rgTous = true; rgQ = ''; rgSaisie = null; } catch (e) {} }); await L.aller(p, h); };
  const scene = async (nom, fn) => {
    try { const ok = await fn(); bilan.scenes[nom] = ok === false ? 'sans cible' : 'ok';
      await L.capture(c, `${CAP}${nom}-${tag}-s0.png`, false);
      const bas = await p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); const el = pan && getComputedStyle(pan).display !== 'none' ? pan : document.scrollingElement; if (el.scrollHeight <= el.clientHeight + 40) return false; el.scrollTop = el.scrollHeight; return true; });
      if (bas) { await L.calme(p, 350); await L.capture(c, `${CAP}${nom}-${tag}-s1.png`, false); }
    } catch (e) { bilan.scenes[nom] = 'erreur : ' + e.message.split('\n')[0]; }
    try { await L.ranger(p); } catch (e) {}
  };
  bilan.menu = await p.evaluate(() => { try { return { registre: !!document.querySelector('[data-go="registre"]'), droits: typeof can === 'function' ? !!can('registre') : null }; } catch (e) { return String(e); } });
  await scene('t01-reg-tous', async () => { await a3('registre'); });
  await scene('t02-reg-site', async () => { await a3('registre'); return clic('[data-rg="cli|t1"]', 600); });
  await scene('t03-reg-passage', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); return clic('[data-d3^="voir|"]', 600); });
  await scene('t04-reg-saisir', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); return clic('[data-rg="passage"]', 800); });
  await scene('t05-reg-pdf', async () => { await a3('registre'); await clic('[data-rg="cli|t1"]', 600); return clic('[data-rg^="pdf|"]', 800); });
  bilan.erreursJS = c.erreurs ? c.erreurs.length : null;
  fs.writeFileSync(`${CAP}bilan-${tag}.json`, JSON.stringify(bilan, null, 1));
  console.log(tag, JSON.stringify(bilan.scenes), JSON.stringify(bilan.menu));
  await c.fermer?.();
  process.exit(0);
})().catch(e => { console.log('✗ ' + e.message); process.exit(1); });
