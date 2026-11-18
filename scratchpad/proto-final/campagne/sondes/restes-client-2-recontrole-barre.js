// La barre du bas de la fiche « Prévenir » : les DEUX boutons (« 💬 Prévenir X » et « ✓ Fait ») tiennent-ils dans l'écran, pour chaque client ?
// node restes-client-2-recontrole-barre.js <profil> [nuit]
// argument 4 : qui (marc, julie, sm, kb)
const O = require('./client-outils.js'), L = O.L, v = L.v; const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: process.argv[4] || 'marc', app: true, attente: 1500 }), p = c.p;
  const R = await p.evaluate(async () => { const o = {}; for (const k of Object.keys(CLIENTS).filter(k => CLIENTS[k].contact)) { const x = { id: 'tb' + k, t: 'Prévenir du retard de la pièce', qui: 'marc', d: AUJ, h: null, urgent: false, creePar: 'marc', creeLe: '31/10', lien: { t: 'client', id: k, lib: CLIENTS[k].nom, cli: k } }; TACHES.push(x);
      tDetail(x.id); await new Promise(r => setTimeout(r, 350)); const P = document.querySelector('#calque .panneau'); if (!P) { o[k] = 'PAS DE FENÊTRE'; continue; }
      const b = P.querySelector('.tkx-barre'), r = e => { if (!e) return null; const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right), Math.round(q.height)]; };
      o[k] = { lib: (P.querySelector('.tkx-barre [data-tkxprev]') || {}).textContent, barre: r(b), prev: r(P.querySelector('.tkx-barre [data-tkxprev]')), fait: r(P.querySelector('.tkx-barre [data-tfait]')), sw: b ? b.scrollWidth : 0, cw: b ? b.clientWidth : 0, ov: b ? getComputedStyle(b).overflowX : '' };
      try { fermerPanneau(); } catch (e) {} TACHES = TACHES.filter(y => y.id !== x.id); } return o; });
  console.log(JSON.stringify(R, null, 0));
  const lus = Object.values(R).filter(x => x && x.barre);
  v('population : une barre mesurée pour chaque client (≥ 8)', lus.length >= 8, lus.length);
  if (c.largeur <= 760) {
    v('les deux boutons de la barre tiennent dans l\'écran (largeur ' + c.largeur + ') pour chaque client', lus.every(x => x.prev && x.fait && x.prev[0] >= 0 && x.fait[1] <= c.largeur), Object.entries(R).filter(([k, x]) => x && x.barre && !(x.prev && x.fait && x.prev[0] >= 0 && x.fait[1] <= c.largeur)).map(([k, x]) => [k, x.lib, x.prev, x.fait]));
    v('la barre ne défile pas de côté', lus.every(x => x.sw <= x.cw + 1), Object.entries(R).filter(([k, x]) => x && x.barre && x.sw > x.cw + 1).map(([k, x]) => [k, x.sw, x.cw])); }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
