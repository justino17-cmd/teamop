// Les mots d'échafaudage lisibles dans le cadre OP COMPTABLE (mode application), rubrique par rubrique, vue simple ET vue comptable. « N ✓ · M ✗ » : une phrase trouvée est un ✗.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
const ECHAF = /prototype|vraie version|pour l.essai|d.exemple|fictif|fictive|simul[ée]|démonstration|dans cette démo|en vrai\b/i;
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc' }), p = c.p; const f = await X.cadreCompta(c); const vus = {};
  const lire = async vue => { const rs = await f.evaluate(() => [...document.querySelectorAll('#menu a')].map(a => a.getAttribute('href').slice(1)));
    for (const r of rs) { await f.evaluate(x => { try { aller(x); } catch (e) {} }, r); await p.waitForTimeout(400); const t = await f.evaluate(() => document.querySelector('#contenu').innerText);
      const m = [...new Set((t.match(new RegExp('[^.\\n]*(' + ECHAF.source + ')[^.\\n]*', 'gi')) || []).map(s => s.trim().slice(0, 170)))]; const k = vue + ' › ' + r; vus[k] = m; v(`compta-reste-08 · mots cadre · ${k} : aucun reste d'échafaudage`, m.length === 0, m); } };
  await lire('simple'); await f.evaluate(() => { UI.expert = true; rendre(); }); await p.waitForTimeout(500); await lire('comptable');
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
