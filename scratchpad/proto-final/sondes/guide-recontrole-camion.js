// Guide des nouveautés, recontrôle adverse (étape 4) : la promesse de la carte « Mon camion » (« dis au bureau ce que tu as utilisé ») jouée jusqu’à l’envoi « En attente du bureau ».
const G = require('/home/user/wt-soeur/scratchpad/proto-final/sondes/guide-commun.js'), L = G.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/guide-recontrole/';
const att = p => p.evaluate(() => (document.getElementById('contenu').innerText.match(/En attente du bureau/g)||[]).length);
(async () => {
  const c = await L.ouvrir({ profil:'iphone', qui:'sm' }); const p = c.p;
  await L.aller(p, 'moncamion'); await L.calme(p, 800);
  const n0 = await att(p);
  await p.getByRole('button', { name: /J.ai utilisé chez un client/ }).click(); await L.calme(p, 900);
  await p.locator('.panneau.large [aria-label*="Fluide R32"], .panneau.large button:has-text("＋")').nth(0).click(); await L.calme(p, 500);
  await p.screenshot({ path: CAP + 'sm-camion-choisi.png' });
  await p.getByRole('button', { name: /^Envoyer/ }).click(); await L.calme(p, 1200);
  const n1 = await att(p);
  const t = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g,' '));
  console.log(t.slice(0, 700));
  v(`camion : un envoi de plus « En attente du bureau » (${n0} → ${n1})`, n1 === n0 + 1, [n0, n1]);
  await p.screenshot({ path: CAP + 'sm-camion-envoye.png' });
  v('aucune erreur de console', c.err.length===0, c.err);
  const ko = L.bilan(); await L.fermer(); process.exit(ko?1:0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
