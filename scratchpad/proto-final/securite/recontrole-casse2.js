// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), angle « ce que les corrections ont CASSÉ », version GÉNÉRALE.
// recontrole-casse.js ne joue que les gestes du courrier avec quelques noms vrais. Ici : TOUTE donnée libre du prototype (le même parcours que la sonde
// d'injection par les données) reçoit un texte de bonne foi qui porte un « & » et une apostrophe droite (« Dupont & Fils d'Arc »), puis on visite les écrans,
// les fiches et les panneaux et on lit le TEXTE VISIBLE : une entité visible (&amp; &#39; &quot; &lt;) collée à ce texte, c'est une valeur échappée DEUX fois
// (à la source et à la sortie : le client lit « Dupont &amp; Fils »). Chaque champ fautif est nommé par son chemin dans les données.
// Population : nombre de champs mutés et de champs retrouvés à l'écran (un zéro sur du vide ne prouve rien) ; contre-épreuve : une entité posée exprès est vue.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const CLICS = +arg('clics', 3), QUI = arg('qui', 'marc');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/'; fs.mkdirSync(SORTIE, { recursive: true });
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: QUI, init: O.INIT, guide: false, attente: 1500 }); const { p } = c; p.on('dialog', d => d.dismiss().catch(() => {}));
  const noms = O.nomsPremierNiveau('prototype-op-gestion.html');
  const routes = await p.evaluate(() => { const R = Object.keys(vues()).filter(r => !/-x-/.test(r)), P = [];
    try { Object.keys(CLIENTS).forEach(k => P.push('client-x-' + k)); } catch (e) {} try { INTS.forEach(i => P.push('inter-x-' + i.id)); } catch (e) {} try { FACTURES.forEach(f => P.push('facture-x-' + (f.id || f.num))); } catch (e) {}
    try { Object.keys(DEVIS_REG).forEach(k => P.push('devis-x-' + k)); } catch (e) {} try { CONTRATS.forEach(k => P.push('contrat-x-' + k.id)); } catch (e) {} return R.concat(P); });
  const charge = "id => `¤${id}¤ Dupont & Fils d'Arc`";
  const res = await p.evaluate(`(${O.MUTER})(${JSON.stringify({ noms, round: 'A', chargeSrc: charge })})`);
  L.v('population : des champs ont été mutés', res.champs > 100, res);
  const champs = await p.evaluate(() => window.__champs);
  const vus = new Set(), fautifs = new Map(); let visites = 0;
  const lire = async ou => { const t = await p.evaluate(() => { const g = id => (document.getElementById(id) || {}).innerText || ''; return g('contenu') + '\n' + g('calque') + '\n' + g('toast'); }).catch(() => '');
    for (const m of t.matchAll(/¤(n\d+)¤ Dupont (&|&amp;|&#39;|&quot;|&lt;)?[^\n]{0,20}/g)) { vus.add(m[1]); }
    for (const m of t.matchAll(/¤(n\d+)¤ Dupont ?(&amp;|&#39;|&quot;|&lt;)|¤(n\d+)¤ Dupont & Fils d(&#39;|&amp;#39;|&quot;)/g)) { const id = m[1] || m[3]; if (!fautifs.has(id)) fautifs.set(id, { chemin: champs[id] || '?', ou, ex: m[0].slice(0, 60) }); }
    for (const m of t.matchAll(/¤(n\d+)¤ Dupont & Fils d&#39;/g)) { if (!fautifs.has(m[1])) fautifs.set(m[1], { chemin: champs[m[1]] || '?', ou, ex: m[0] }); } };
  for (const r of routes) { try { await p.evaluate(x => aller(x), r); await L.calme(p, 400); } catch (e) { continue; } visites++; await lire(r);
    const gs = (await L.gestes(p, '#contenu')).slice(0, CLICS);
    for (const g of gs) { try { const ici = await p.evaluate(() => location.hash); await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await p.waitForTimeout(200); await lire(r + ' ▸ ' + g.lib); await L.ranger(p); const la = await p.evaluate(() => location.hash); if (la !== ici) { await p.evaluate(x => aller(x), r); await L.calme(p, 250); } } catch (e) { await L.ranger(p).catch(() => {}); } } }
  const motif = ch => String(ch).replace(/\.\d+(?=\.|$)/g, '[]').replace(/\.[A-Za-z0-9_-]{1,40}-\d+\b/g, '.<clé>');
  const reg = {}; [...fautifs.values()].forEach(f => { const k = motif(f.chemin); (reg[k] = reg[k] || { n: 0, ou: f.ou, ex: f.ex }).n++; });
  console.log(`\nécrans visités : ${visites} · champs mutés : ${res.champs} · champs retrouvés à l'écran : ${vus.size} · champs à entité visible : ${fautifs.size}`);
  Object.entries(reg).sort().forEach(([k, v]) => console.log('  ENTITÉ ←', k, '×' + v.n, '· écran :', String(v.ou).slice(0, 70), '· vu :', JSON.stringify(v.ex)));
  L.v('population : ≥ 60 écrans visités', visites >= 60, visites);
  L.v('population : ≥ 100 champs retrouvés à l\'écran avec leur texte', vus.size >= 100, vus.size);
  L.v('AUCUN texte de bonne foi (« & », « \' ») ne s\'affiche avec une entité visible (double échappement) — champs : ' + fautifs.size, fautifs.size === 0, Object.keys(reg).slice(0, 8));
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'contenu-zz'; document.body.appendChild(d); });
  const ctl = await (async () => { await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.innerText = ''; document.getElementById('contenu').insertAdjacentHTML('beforeend', '<p id="zz-e">¤n9999¤ Dupont &amp;amp; Fils</p>'); }); const t = await p.evaluate(() => document.getElementById('contenu').innerText); await p.evaluate(() => { const e = document.getElementById('zz-e'); if (e) e.remove(); }); return /¤n9999¤ Dupont &amp;/.test(t); })();
  L.v('contre-épreuve : la lecture voit une entité posée exprès', ctl);
  fs.writeFileSync(SORTIE + 'casse2.json', JSON.stringify({ visites, mutes: res.champs, vus: vus.size, fautifs: [...fautifs.entries()] }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
