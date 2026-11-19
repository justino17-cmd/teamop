// Captures du tour 3 (à REGARDER) : le menu de la Boîte mail avant/après Retour, « ‹ OP GESTION » qui ferme le panneau (on revient dans la Comptabilité : rien d'ouvert), OP Security rangé après un changement de largeur.
// PROFIL=android|iphone|mac ; NUIT=1. Captures dans CAP (hors dépôt).
const path = require('path'), M = require('../../sondes/mail-commun.js'), C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'android', NUIT = !!process.env.NUIT, CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/retour3';
const nom = s => path.join(CAP, `r3-${PROFIL}${NUIT ? '-nuit' : ''}-${s}.png`);
(async () => {
  { const c = await M.entrer({ profil: PROFIL, nuit: NUIT }), p = c.p;
    await p.evaluate(() => window.R().querySelector('#btnFilter').click()); await p.waitForTimeout(500); await L.capture(c, nom('1-menu-ouvert'));
    await C.retour(p); await L.capture(c, nom('2-apres-retour')); v('menu fermé, Boîte mail toujours là', await p.evaluate(() => !window.R().querySelector('#overlay') && location.hash === '#boiteMail'));
    await L.fin(c); }
  { const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: 'marc' }), p = c.p;
    await L.aller(p, 'interventions'); await L.aller(p, 'clients');
    if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); } else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
    await p.waitForTimeout(1700); await L.calme(p, 300); const f = L.cadre(p, /prototype-comptabilite\.html/);
    await f.evaluate(() => { const b = document.querySelector('[data-a="reglages"]'); if (b) b.click(); }); await p.waitForTimeout(600); await L.capture(c, nom('3-compta-panneau-ouvert'));
    await p.evaluate(() => document.querySelector('#cpsys [data-cpsys="retour"]').click()); await p.waitForTimeout(1500); await L.calme(p, 300); await L.capture(c, nom('4-apres-retour-OP-GESTION'));
    if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); } else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
    await p.waitForTimeout(1700); await L.calme(p, 300); await L.capture(c, nom('5-compta-rouverte-sans-panneau'));
    v('on revient dans la Comptabilité : aucun panneau ouvert', !(await f.evaluate(() => !!document.querySelector('#calque').innerHTML)));
    await L.fin(c); }
  if (L.PROFILS[PROFIL].w < 1100) { const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui: 'marc' }), p = c.p;
    await L.aller(p, 'clients'); await p.evaluate(() => { opsMonter(); opsOuvrir(); }); await p.waitForTimeout(500); await L.capture(c, nom('6-opsecurity-ouvert'));
    await p.setViewportSize({ width: 1300, height: 900 }); await p.waitForTimeout(700); await L.capture(c, nom('7-opsecurity-large'));
    await p.setViewportSize({ width: c.largeur, height: c.hauteur }); await p.waitForTimeout(700); await L.capture(c, nom('8-opsecurity-retreci'));
    await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { v('exception', false, String(e.message).slice(0, 200)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
