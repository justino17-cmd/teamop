// Captures à REGARDER (18 novembre 2026) : l'accueil et l'écran TVA du cadre avec un crédit de TVA (avant/après l'arrêt), et la rubrique Paie, par profil, de jour et de nuit.
// usage : node compta-restes-coherence-2-captures.js <profil> [nuit]      (les images vont hors dépôt)
const X = require('./compta-reste-outils.js'), L = X.L;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-compta-2/';
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  const f = await X.cadreCompta(c); L.v('le cadre est ouvert', !!f); await p.waitForTimeout(1200);
  const va = async (r, nom, haut) => { await f.evaluate(k => { UI.expert = false; try { aller(k); } catch (e) {} }, r); await p.waitForTimeout(900); if (haut) await f.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, haut); await p.waitForTimeout(500); await L.capture(c, CAP + tag + '-' + nom + '.png'); };
  await f.evaluate(() => { try { toutTraiter(); rendre(); } catch (e) {} }); await p.waitForTimeout(900);
  await va('accueil', 'accueil', '#contenu .kpis'); await va('tva', 'tva', '#tva-auto');
  await f.evaluate(() => { const q = aVerifier; aVerifier = () => []; try { tvaDeclarer('2026-10'); } finally { aVerifier = q; } rendre(); }); await p.waitForTimeout(900);
  await va('tva', 'tva-arretee', '#tva-auto'); await f.evaluate(() => { const e = document.querySelector('#cmpt-tva-suite'); if (e) e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(400); await L.capture(c, CAP + tag + '-tva-suite.png');
  await va('paie', 'paie');
  const d = await L.deborde(c).catch(() => null); console.log('débordement', JSON.stringify(d));
  await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
