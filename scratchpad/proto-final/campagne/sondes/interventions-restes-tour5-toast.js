// Tour 5 : sur ordinateur, la bulle « Lu… » ne recouvre plus la barre fixe « Je ne peux pas finir / Terminer » ; au téléphone la règle d'avant (barre non fixe) ne bouge pas.
// usage : node interventions-restes-tour5-toast.js <profil> [nuit]
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v;
  await p.evaluate(() => { fiche('i1').metier = 'clim'; }); await I.devenir(c, 'sm', 'inter-x-i1');
  const S = '[data-releve="Soufflage"]';
  await p.locator(S).scrollIntoViewIfNeeded();
  await p.locator(S).click({ clickCount: 3 }); await p.keyboard.press('Delete'); await p.keyboard.type('1 200', { delay: 20 }); await p.keyboard.press('Tab'); await L.calme(p, 500);
  const g = await p.evaluate(() => { const r = e => { const b = e.getBoundingClientRect(); return { h: Math.round(b.top), b: Math.round(b.bottom), g: Math.round(b.left), d: Math.round(b.right) }; };
    const t = document.getElementById('toast'), k = document.getElementById('collant'), fixe = k && getComputedStyle(k).position === 'sticky';
    return { toast: t && t.classList.contains('on') && r(t), texte: t && t.textContent, collant: k && r(k), fixe, H: innerHeight, W: innerWidth }; });
  v('population : la bulle « Lu » est visible', !!g.toast && /Lu 1/.test((g.texte || '').replace(/[  ]/g, ' ')), g);
  v('population : la barre d\'action existe', !!g.collant, g);
  const coupe = g.toast && g.collant && g.toast.b > g.collant.h && g.toast.h < g.collant.b && g.toast.d > g.collant.g && g.toast.g < g.collant.d;
  v('la bulle ne recouvre pas la barre « Je ne peux pas finir / Terminer »', !coupe, g);
  v('la bulle reste dans la fenêtre', g.toast && g.toast.h >= 0 && g.toast.b <= g.H, g);
  await L.capture(c, I.CAP + `tour5-toast-${profil}${nuit ? '-nuit' : ''}.png`);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
