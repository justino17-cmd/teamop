// Cadre Paiement seul : le courriel de REÇU (« Merci <contact>. ») pour chaque modèle de client, lu rendu par ecranTel() (la vraie fonction de la page).
// node restes-client-2-recontrole-paiement.js <profil> [nuit] → « N ✓ · M ✗ »
const L = require('../../lib.js'), v = L.v; const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
(async () => {
  const c = await L.ouvrir({ profil, nuit, page: 'prototype-paiement.html', app: false, attente: 1500 }), p = c.p;
  const R = await p.evaluate(() => { const o = []; for (let i = 0; i < MODELES.length; i++) { const m = MODELES[(S.numFac - 146) % MODELES.length]; S.numFac++; const g = { id: 'fz' + i, num: 'FAC-2026-0' + S.numFac, cli: m[0], contact: m[1], objet: m[2], ht: m[3], tva: m[4] }; S.factures.push(g); emettre(g, 'mail'); const pa = nouveauPaiement(g, 'carte', ttc(g)); reussir(pa);
      const out = { contact: m[1] }; for (const t of ['facture', 'recu']) { const ms = S.boite.filter(x => x.fid === g.id && x.type === t).pop(); S.msg = ms.id; S.ecran = 'lire'; const h = ecranTel(); const d = document.createElement('div'); d.innerHTML = h; out[t] = (d.querySelector('p:not(.petit)') || d).textContent.trim().slice(0, 40); } o.push(out); } return o; });
  console.log(JSON.stringify(R));
  v('population : tous les modèles de client rejoués (≥ 5)', R.length >= 5 && R.every(x => x.facture && x.recu), R.length);
  v('« facture » : jamais « Bonjour Le syndic »', R.every(x => !/Bonjour (Le|La|Les|L['’])/i.test(x.facture)), R.map(x => x.facture));
  v('« reçu » : jamais « Merci Le syndic. »', R.every(x => !/^Merci (Le|La|Les|L['’])/i.test(x.recu)), R.filter(x => /^Merci (Le|La|Les|L['’])/i.test(x.recu)).map(x => x.recu));
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
