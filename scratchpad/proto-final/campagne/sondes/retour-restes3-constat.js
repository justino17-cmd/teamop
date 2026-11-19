// CONSTAT tour 3 du bouton Retour (19 novembre 2026) : mesure d'abord, sans rien conclure — F1 menu « ov-menu » de la Boîte mail, F2 composeur quitté par l'adresse (ordinateur),
// F3 OP Security + aller() par programme, F4 OP Security élargi puis rétréci. PROFIL=android|iphone|mac. Rend « N ✓ · M ✗ » (ici : constats, pas de verdict).
const M = require('../../sondes/mail-commun.js'), C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'mac';
const H = p => p.evaluate(() => ({ h: location.hash, n: history.length, st: history.state, pousse: CAL.pousse, pile: CAL.pile.join(','), ouv: calOuverts().join(','), sec: !!document.querySelector('#opsec[data-ouvert]'), w: innerWidth,
  mod: (() => { const r = window.R && window.R(); const ov = r && r.querySelector('#overlay'); return r ? { ov: ov ? ov.className : null, vue: r.querySelector('#app').getAttribute('data-view') } : null; })() }));
const dis = (t, o) => console.log('  ·', t, JSON.stringify(o));
(async () => {
  // F1 : un menu de la Boîte mail ouvert
  {
    const c = await M.entrer({ profil: PROFIL }), p = c.p;
    await L.aller(p, 'accueil'); await L.aller(p, 'boiteMail'); await M.pret(p, 6000);
    const ok = await p.evaluate(() => { const r = window.R(); const b = r.querySelector('#btnFilter'); if (b) b.click(); return r.querySelector('#overlay.ov-menu') ? 'btnFilter' : null; });
    await p.waitForTimeout(500); dis('F1 menu ouvert par', ok); dis('F1 avant Retour', await H(p));
    await C.retour(p); dis('F1 après UN Retour', await H(p));
    await M.fin(c);
  }
  // F2 : composeur ouvert puis départ par programme
  {
    const c = await M.entrer({ profil: PROFIL }), p = c.p;
    await L.aller(p, 'clients'); await L.aller(p, 'boiteMail'); await M.pret(p, 6000);
    await p.evaluate(() => window.R().querySelector('#btnCompose').click()); await p.waitForTimeout(800); dis('F2 composeur ouvert', await H(p));
    await L.aller(p, 'taches'); await p.waitForTimeout(600); dis('F2 après aller(taches)', await H(p));
    await C.retour(p); dis('F2 Retour 1', await H(p));
    await C.retour(p); dis('F2 Retour 2', await H(p));
    await M.fin(c);
  }
  // F3 : OP Security ouvert (téléphone), puis aller() par programme
  if (PROFIL !== 'mac') {
    const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p;
    await L.aller(p, 'interventions'); await L.aller(p, 'clients');
    await p.evaluate(() => { opsMonter(); opsOuvrir(); }); await p.waitForTimeout(600); dis('F3 OP Security ouvert', await H(p));
    await L.aller(p, 'accueil'); await p.waitForTimeout(700); dis('F3 après aller(accueil)', await H(p));
    await C.retour(p); dis('F3 Retour 1', await H(p));
    await C.retour(p); dis('F3 Retour 2', await H(p));
    // même chose, mais ouvert ET quitté dans la MÊME tâche (avant que l'observateur ait vu le calque)
    await L.aller(p, 'clients');
    await p.evaluate(() => { opsOuvrir(); aller('taches'); }); await p.waitForTimeout(800); dis('F3b ouvert + aller dans la même tâche', await H(p));
    await C.retour(p); dis('F3b Retour 1', await H(p));
    await L.fin(c);
  }
  // F4 : OP Security ouvert en étroit, fenêtre élargie puis rétrécie
  {
    const c = await L.ouvrir({ profil: PROFIL === 'mac' ? 'iphone' : PROFIL, qui: 'marc' }), p = c.p;
    await L.aller(p, 'clients'); await p.evaluate(() => { opsMonter(); opsOuvrir(); }); await p.waitForTimeout(500); dis('F4 étroit ouvert', await H(p));
    await p.setViewportSize({ width: 1300, height: 900 }); await p.waitForTimeout(700); dis('F4 élargi', await H(p));
    await p.setViewportSize({ width: c.largeur, height: c.hauteur }); await p.waitForTimeout(700); dis('F4 rétréci', await H(p));
    await L.fin(c);
  }
  await L.fermer();
})().catch(e => { console.log('exception', e.message); L.fermer().then(() => process.exit(1)); });
