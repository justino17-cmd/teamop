const D = require('/home/user/wt-soeur/scratchpad/proto-final/sondes/double-auth-commun.js'); const R = require('./rt.js'); const { S, L } = R;
(async () => {
  const c = await S.ouvrir({ profil: process.argv[2] || 'mac', nuit: process.argv[3] === 'nuit' }); const log = (...a) => console.log(...a);
  await D.tous(c); await R.entrer(c, 'marc'); await R.fermeTel(c); await S.avancer(c, 6);
  await L.aller(c.p, 'equipe'); await c.p.waitForTimeout(700);
  const etat = () => c.p.evaluate(() => JSON.stringify({ eq: EQUIPE.map(p => p.k + (p.actif ? '+' : '-') + (p.profil || '')).join(',') }));
  const e0 = await etat();
  // S10 : une case de « Qui peut quoi »
  const tab = await c.p.$('#contenu button:has-text("Qui peut quoi"):visible'); await tab.click(); await c.p.waitForTimeout(600);
  const cases = await c.p.$$('#contenu input[type=checkbox][data-eqd], #contenu input[type=checkbox][data-eqs], #contenu input[type=checkbox][data-eqt]'); log('cases de droits visibles:', cases.length);
  if (cases.length) { const el = cases[3]; const av = await el.isChecked(); await el.evaluate(e => e.click()); await c.p.waitForTimeout(500);
    const cf = await D.conf(c); log('S10 case : conf', !!cf, '| case restaurée', (await el.isChecked()) === av, '| texte', cf && cf.texte.slice(0, 120));
    if (cf) { await c.p.keyboard.press('Escape'); await c.p.waitForTimeout(300); } }
  // S12 : désactiver
  await L.aller(c.p, 'equipe'); await c.p.waitForTimeout(500);
  await (await c.p.$('[data-eqx="fiche|julie"], [data-eq="fiche|julie"]')).click(); await c.p.waitForTimeout(700);
  const des = await c.p.$('#calque button:has-text("Désactiver le compte")'); await des.evaluate(e => e.click()); await c.p.waitForTimeout(700);
  const cf2 = await D.conf(c); log('S12 désactiver : conf', !!cf2, '| texte', cf2 && cf2.texte.slice(0, 120));
  if (cf2) { await c.p.keyboard.press('Escape'); await c.p.waitForTimeout(300); }
  log('état identique après ces deux gestes refusés :', e0 === await etat());
  await L.fermer();
})().catch(e => { console.log('EXC', e.message.slice(0, 600)); process.exit(1); });
