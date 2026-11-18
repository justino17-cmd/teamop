// Tour 4 : la barre « Relancer maintenant » + « Déjà fait » à 390 px, jour : une ligne, regardée sur capture.
const O = require('./client-outils.js'), L = O.L, v = L.v; const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', app: true, attente: 1500 }), p = c.p;
  const R = await p.evaluate(async () => { const t = TACHES.find(x => x.lien && /FAC-/.test(x.t || '') || /Relancer/.test(x.t || '')); if (!t) return null; tDetail(t.id); await new Promise(r => setTimeout(r, 400));
    const b = document.querySelector('#calque .tkx-barre'); return b ? { id: t.id, btns: [...b.querySelectorAll('.btn')].map(e => ({ t: e.textContent.trim(), h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) })) } : { id: t.id, sans: true }; });
  v('population : une tâche à barre trouvée', !!R && !R.sans, R);
  if (R && R.btns) { v('« Relancer… » sur une ligne (≤ 52 px)', R.btns[0].h <= 52, R.btns); v('« Déjà fait » garde sa largeur (≥ 80 px)', R.btns[1] ? R.btns[1].w >= 80 : true, R.btns); }
  await L.calme(p, 400); await L.capture(c, O.CAP + 'r4-relancer-' + profil + (nuit ? '-nuit' : '') + '.png');
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
