const O = require('./accueil-outils.js'), L = O.L;
(async () => {
  const profil = process.argv[2] || 'mac'; const c = await L.ouvrir({ profil, qui: 'marc' });
  const cas = [['devis', /a envoyé le devis/, /^Ouvrir/], ['paiement-terminal-133', /FAC-2026-0133/, /^Ouvrir/], ['droit', /donné un droit/, /^Ouvrir/], ['absence', /validé l’absence/, /^Ouvrir/]];
  for (const [nom, re, reb] of cas) {
    await c.p.evaluate("hMax=60"); await L.aller(c.p, 'historique'); await c.p.evaluate(() => document.querySelector('[data-hdeplier="1"]').click()); await L.calme(c.p, 300);
    const id = await c.p.evaluate(s => { const r = new RegExp(s); const e = [...document.querySelectorAll('[data-hj]')].find(x => r.test(x.innerText)); if (!e) return null; e.setAttribute('data-camp', '1'); return e.dataset.hj; }, re.source);
    await L.toucher(c, '[data-camp="1"]'); await c.p.waitForTimeout(300);
    await c.p.evaluate(s => { const r = new RegExp(s); const b = [...document.querySelectorAll('#calque .panneau button')].find(x => r.test(x.textContent.trim())); if (b) b.setAttribute('data-camp2', '1'); }, reb.source);
    await L.toucher(c, '[data-camp2="1"]'); await c.p.waitForTimeout(700);
    console.log('##', nom, id, JSON.stringify(await O.etat2(c.p)));
    console.log('   boutons du panneau :', await c.p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim().slice(0, 40) + (b.dataset ? ' {' + Object.entries(b.dataset).map(([k, v]) => k + '=' + v.slice(0, 20)).join(',') + '}' : ''))));
    await L.capture(c, O.CAP + `histo-cas-${nom}-${profil}.png`, false); await L.ranger(c.p);
  }
  console.log('ERR', c.err); await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(1); });
