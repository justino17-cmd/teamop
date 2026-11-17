// « Composer un contrat » : le CHEMIN (bouton → atelier → retour), pas l'atelier lui-même (en refonte : défauts marqués zone « refonte »).
// usage : node contrats-atelier.js [profil]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats' }); const p = c.p; await L.calme(p, 500);
  const av = await O.kpis(p);
  await L.toucher(c, '[data-opd="contrat"]'); await p.waitForTimeout(2500); await L.calme(p, 500);
  const e = await O.lire(p); v('AT : « Composer un contrat » ouvre l’atelier (cadre plein écran)', e.atelier, e);
  const fr = await p.evaluate(() => { const z = document.getElementById('opdz'), f = z && z.querySelector('iframe'); const r = z ? z.getBoundingClientRect() : null; return { z: !!z, f: !!f, w: r && Math.round(r.width), h: r && Math.round(r.height), src: f && f.src.replace(/^.*\//, '') }; });
  console.log('  · cadre :', JSON.stringify(fr));
  v('AT : le cadre couvre tout l’écran', fr.z && fr.w >= c.largeur - 2 && fr.h >= c.hauteur - 2, fr);
  await L.capture(c, O.CAP + `AT-ouvert-${profil}.png`);
  const f = L.cadre(p); const gs = f ? await f.evaluate(() => [...document.querySelectorAll('button, a, [role=button]')].filter(b => b.offsetParent).map(b => (b.getAttribute('aria-label') || b.textContent).replace(/\s+/g, ' ').trim().slice(0, 40)).filter(Boolean).slice(0, 25)) : [];
  console.log('  · boutons de l’atelier :', JSON.stringify(gs));
  const retour = gs.find(t => /OP GESTION|Retour|Fermer|✕/.test(t));
  v('AT : l’atelier offre une sortie nommée (Retour à OP GESTION)', !!retour, gs);
  // Échap ferme
  await p.keyboard.press('Escape'); await L.calme(p, 600); let e2 = await O.lire(p);
  if (e2.atelier && f) { const b = f.locator('[aria-label*="OP GESTION"], button:has-text("OP GESTION")').first(); try { await b.click({ timeout: 3000 }); } catch (x) {} await p.waitForTimeout(900); e2 = await O.lire(p); }
  v('AT : on revient à la liste des Contrats', !e2.atelier && /Contrats/.test(e2.h1), e2);
  const ap = await O.kpis(p); v('AT : rien n’a été créé en ouvrant puis fermant (chiffres du haut inchangés)', JSON.stringify(av) === JSON.stringify(ap), [av, ap]);
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
