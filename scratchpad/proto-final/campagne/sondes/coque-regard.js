// Campagne « coque », corrections (17 novembre 2026) — le REGARD sur ce qu'on a corrigé : captures à relire à l'œil.
// Écran de connexion (lien, identifiant) de jour et de nuit à 320 px et 390 px ; feuille « Menu » ; recherche et fenêtre devant la Comptabilité plein écran.
// Usage : PROFIL=petit|iphone|windows NUIT=1 node coque-regard.js — chaque capture est aussi comptée (population) : sans elles la sonde sort en 1.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'petit', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const suf = `${PROFIL}${NUIT ? '-nuit' : ''}`;
(async () => {
  if (PROFIL !== 'windows') {
    const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: null, attente: 300 }), p = c.p;
    v('l’écran de lien arrive', await L.attendre(p, () => !!document.getElementById('cn-form-lien'), 9000));
    await p.waitForTimeout(1500); await p.screenshot({ path: CAP + `regard-lien-${suf}.png` });
    await p.locator('#cn-lien').fill('teamop.fr/e/une-autre-entreprise'); await p.locator('#cn-form-lien button[type=submit]').first()[c.doigt ? 'tap' : 'click']();
    v('lien refusé : l’erreur est dite et le lien gardé', await L.attendre(p, () => /invalide/.test((document.getElementById('cn-err') || {}).textContent || '') && document.getElementById('cn-lien').value.length > 5, 9000));
    await p.waitForTimeout(900); await p.screenshot({ path: CAP + `regard-lien-refuse-${suf}.png` });
    await p.locator('#cn-lien').fill('teamop.fr/e/clim-services-17'); await p.locator('#cn-form-lien button[type=submit]').first()[c.doigt ? 'tap' : 'click']();
    v('l’écran d’identifiant arrive', await L.attendre(p, () => !!document.getElementById('cn-form'), 9000));
    await p.waitForTimeout(1500); await p.screenshot({ path: CAP + `regard-id-${suf}.png` });
    v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
    const c2 = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: 'marc' }), p2 = c2.p; await L.calme(p2, 800);
    if (await p2.locator('.tt-menu').count()) { await L.toucher(c2, '.tt-menu'); await L.calme(p2, 700); v('la feuille Menu est ouverte', await p2.evaluate(() => !!document.querySelector('#calque .fm-liste'))); await p2.screenshot({ path: CAP + `regard-menu-${suf}.png` }); }
    await L.fin(c2);
  } else {
    const c = await L.ouvrir({ profil: 'windows', nuit: NUIT, qui: 'julie' }), p = c.p; await L.calme(p, 1000);
    v('la Comptabilité plein écran est ouverte', await p.evaluate(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden; }));
    await p.keyboard.press('n'); await L.calme(p, 900);
    v('N : la fenêtre « Nouvelle intervention » est PAR-DESSUS la Comptabilité', await p.evaluate(() => { const f = document.querySelector('#fenetre .fen'); if (!f) return false; const r = f.getBoundingClientRect(), e = document.elementFromPoint(r.left + r.width / 2, r.top + 80); return !!e && !!e.closest('#fenetre'); }));
    await p.screenshot({ path: CAP + `regard-compta-N-${suf}.png` });
    await p.keyboard.press('Escape'); await L.calme(p, 500);
    await p.keyboard.press('Control+k'); await p.keyboard.type('heures', { delay: 20 }); await L.calme(p, 400);
    await p.screenshot({ path: CAP + `regard-compta-recherche-${suf}.png` });
    await p.keyboard.press('Escape'); await p.keyboard.press('Shift+Slash'); await L.calme(p, 600);
    await p.screenshot({ path: CAP + `regard-compta-aide-${suf}.png` });
    v('windows : pas de rubrique Trackpad dans l’aide', await p.evaluate(() => !/Trackpad/.test((document.querySelector('#calque .panneau') || {}).textContent || '')));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
