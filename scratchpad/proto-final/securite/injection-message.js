// SONDE « messages entre fenêtres » (audit de sécurité, angle injection, 17 novembre 2026) : une AUTRE origine peut-elle parler à la page
// de comptabilité ouverte seule ? Deux origines sur la même machine (127.0.0.1 et localhost) : la page « attaquante » ouvre la comptabilité
// (window.open) et lui envoie un message de rôle. La comptabilité intégrée dans OP GESTION vérifie la source (ev.source) ; seule la copie
// ouverte seule ne le fait pas. Usage : node injection-message.js
const L = require('../lib.js');
(async () => {
  const c = await L.ouvrir({ profil: 'mac', page: 'prototype-comptabilite.html', requete: '', attente: 1500 }); const port = c.port, { ctx } = c;
  const avant = await c.p.evaluate(() => ({ role: CMPT.role, paie: CMPT.paie, entree: [...document.querySelectorAll('[data-route],[data-nav]')].map(e => (e.textContent || '').trim()).join('|').slice(0, 300) }));
  L.v('population : la comptabilité seule démarre en rôle « gestion », sans la paie', avant.role === 'gestion' && !avant.paie, avant);
  const att = await ctx.newPage(); await att.goto(`http://localhost:${port}/apercu/prototype-paiement.html`, { waitUntil: 'load', timeout: 30000 });   // une autre ORIGINE que la comptabilité
  L.v('population : la page attaquante est bien d’une autre origine', await att.evaluate(() => location.origin) !== `http://127.0.0.1:${port}`, await att.evaluate(() => location.origin));
  const [pop] = await Promise.all([ctx.waitForEvent('page'), att.evaluate(u => { window.__w = window.open(u, 'victime'); }, `http://127.0.0.1:${port}/apercu/prototype-comptabilite.html`)]);
  await pop.waitForLoadState('load'); await pop.waitForTimeout(1500);
  await att.evaluate(() => { window.__w.postMessage({ opc_role: { role: 'patron', paie: true } }, '*'); });   // depuis une AUTRE origine
  await pop.waitForTimeout(800);
  const apres = await pop.evaluate(() => ({ role: CMPT.role, paie: CMPT.paie }));
  console.log('  après le message d’une autre origine :', JSON.stringify(apres));
  L.v('un message d’une AUTRE origine ne change pas le rôle de la comptabilité', apres.role === 'gestion' && !apres.paie, apres);
  // contre-épreuve : la comptabilité INTÉGRÉE (dans OP GESTION) ne se laisse pas parler par n'importe quelle fenêtre — pas de mutation ici, lecture du code
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
