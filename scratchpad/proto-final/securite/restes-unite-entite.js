// RESTES DE LA SÉCURITÉ, tour 1 : « l'unité d'un article ne s'affiche JAMAIS avec une entité (&amp;) — Stock › Voir ». Rejoue ce que recontrole-casse2 a vu : une unité « Dupont & Fils d'Arc »
// posée sur TOUS les articles (donnée d'avant la règle ou importée), puis chaque écran de Stock, la fiche de chaque article, chaque fenêtre de ses gestes : aucun « &amp; », « &#39; », « &lt; » dans le TEXTE visible.
// Population : le nom de l'unité se lit à l'écran (≥ 10 endroits). Contre-épreuve : une entité posée exprès est vue. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js');
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500 }), p = c.p; const att = ms => p.waitForTimeout(ms);
  await p.evaluate(() => { PRODUITS.forEach(x => { x.u = 'Dupont & Fils d\'Arc'; }); });
  const lus = [], vus = new Set(); let nb = 0;
  const lire = async ou => { const t = await p.evaluate(() => { const z = document.getElementById('contenu'), q = document.getElementById('calque'), toast = document.getElementById('toast'); return [z, q, toast].filter(Boolean).map(e => e.innerText).join('\n'); }); if (/Dupont/.test(t)) vus.add(ou); const m = t.match(/.{0,40}(&amp;|&#39;|&quot;|&lt;|&gt;).{0,30}/g); if (m) lus.push({ ou, extraits: m.slice(0, 2) }); nb++; };
  const routes = await p.evaluate(() => Object.keys(vues()).filter(r => !/-x-/.test(r) && (typeof rlPermis !== 'function' || rlPermis(r))));
  const fiches = await p.evaluate(() => PRODUITS.slice(0, 30).map(x => x.id));
  const ecrans = routes.filter(r => /stock|materiel|produit|commande|achat|achats|stocks|depot|camion|inventaire/i.test(r)).concat(['stock', 'commandes']);
  for (const r of [...new Set(ecrans)]) { try { await p.evaluate(x => aller(x), r); await L.calme(p, 500); } catch (e) { continue; } await lire(r);
    for (const g of (await L.gestes(p, '#contenu')).slice(0, 14)) { try { await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(250); await lire(r + ' ▸ ' + g.lib); await L.ranger(p); } catch (e) { await L.ranger(p).catch(() => {}); } await p.evaluate(x => aller(x), r).catch(() => {}); await L.calme(p, 200); } }
  for (const id of fiches) { try { await p.evaluate(x => prFiche(x), id); await att(250); await lire('fiche ' + id); for (const g of (await L.gestes(p, '#calque')).slice(0, 4)) { try { await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(200); await lire('fiche ' + id + ' ▸ ' + g.lib); } catch (e) {} } await L.ranger(p); } catch (e) {} }
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'contenu-zz'; d.textContent = 'Dupont &amp; Fils'; document.getElementById('contenu').appendChild(d); }); const T = await p.evaluate(() => /&amp;/.test(document.getElementById('contenu').innerText));
  L.v('population : l\'unité « Dupont & Fils d\'Arc » est lisible à ≥ 10 endroits', vus.size >= 10, vus.size);
  L.v('contre-épreuve : une entité posée exprès est vue', T, T);
  L.v('AUCUNE entité visible dans le texte : ' + lus.length, lus.length === 0, lus.slice(0, 5));
  lus.slice(0, 10).forEach(x => console.log('  ENTITÉ', x.ou, '·', JSON.stringify(x.extraits)));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
