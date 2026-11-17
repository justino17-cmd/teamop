// RELEVÉ de la VISITE PARLÉE (« Découvrir l'application », l'immersion complète) : chaque chapitre, chaque pas, chaque phrase que la voix lit
// et que la bulle affiche. On la lance comme la personne (immLancer), on met en pause la voix automatique et on avance par « Suivant ».
// usage : node mots-visite.js [profil] → /tmp/…/cap/final-mots/visite-<profil>.json
const L = require('../lib.js'); const fs = require('fs');
const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/final-mots/';
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', qui: 'marc' }); const p = c.p; const pas = []; let boucle = 0, derniere = '';
  await p.evaluate(() => { immLancer(0); });
  await L.calme(p, 900);
  while (boucle++ < 500) {
    const b = await p.evaluate(() => { const g = document.getElementById('gd-bulle'); return g ? { texte: g.innerText.replace(/[ \t\r\n\f\v]+/g, ' ').trim(), cle: g.dataset.m, fin: /fini/.test(g.innerText) && !g.querySelector('[data-gd="suivant"]') } : null; });
    if (!b) { await p.waitForTimeout(500); if (boucle > 8 && !pas.length) break; continue; }
    if (b.cle !== derniere) { derniere = b.cle; const att = await p.evaluate(() => [...document.querySelectorAll('#gd-bulle [aria-label],#gd-bulle [title]')].map(e => e.getAttribute('aria-label') || e.title)); pas.push({ cle: b.cle, texte: b.texte, attrs: att }); }
    if (b.fin) break;
    const ok = await p.evaluate(() => { const g = document.querySelector('#gd-bulle [data-gd="suivant"]'); if (g) { g.click(); return true; } const q = document.querySelector('#gd-bulle [data-gd="debut"], #gd-bulle [data-gd="entrer"]'); if (q) { q.click(); return true; } IMM.pause = true; return false; });
    await p.waitForTimeout(ok ? 420 : 700);
    if (!ok && boucle > 400) break;
  }
  fs.writeFileSync(D + 'visite-' + c.profil + '.json', JSON.stringify({ pas, erreurs: c.err }));
  console.log('visite :', pas.length, 'pas relevés, erreurs de page', c.err.length, 'dernier :', (pas[pas.length - 1] || {}).texte);
  await L.fin(c); await L.fermer();
})().catch(e => { console.error('ÉCHEC', e); process.exit(2); });
