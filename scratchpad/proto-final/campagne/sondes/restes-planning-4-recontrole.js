// Voie « restes », planning, TOUR 4 — RECONTRÔLE ADVERSE (18 novembre 2026). Le correctif du tour 4 est une règle de COMPOSANT
// (`.panneau .ligne-clic, .panneau .kpi-l, .panneau > .btn { flex-shrink:0 }`) : elle touche donc les ~99 panneaux de la page, pas seulement ceux du Planning.
// Cette sonde cherche ce qu'elle a cassé À CÔTÉ : pour chaque panneau qui s'ouvre au balayage des gestes d'un écran, elle mesure les éléments visés AVEC la règle
// puis SANS (flex-shrink:1 forcé), et exige qu'aucun ne soit COUPÉ par un ancêtre qui masque son débordement (hidden/clip) ni hors d'atteinte du défilement du panneau.
// Usage : timeout 580 node restes-planning-4-recontrole.js <profil> [nuit] [qui=marc|julie|sm|kb] <route> <route>…   « N ✓ · M ✗ », code 1 si un contrôle tombe.
const O = require('./taches-absences-outils.js'), L = O.L;
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const qui = (args.find(a => /^qui=/.test(a)) || 'qui=marc').slice(4), routes = args.filter(a => !L.PROFILS[a] && a !== 'nuit' && !/^qui=/.test(a));
const MAX = +(process.env.MAX || 30);
const MESURE = () => { const P = document.querySelector('#calque .panneau'); if (!P) return null;
  const vis = [...P.querySelectorAll('.ligne-clic, .kpi-l, :scope > .btn')], taille = () => vis.map(e => Math.round(e.getBoundingClientRect().height));
  const avec = taille(); const st = document.createElement('style'); st.textContent = '.panneau .ligne-clic,.panneau .kpi-l,.panneau > .btn{flex-shrink:1!important}'; document.head.appendChild(st); const sans = taille(); st.remove();
  const changes = vis.filter((e, i) => Math.abs(avec[i] - sans[i]) > 1).length;
  const coupes = []; vis.forEach(e => { const r = e.getBoundingClientRect(); if (!r.height || getComputedStyle(e).display === 'none') return;
    for (let a = e.parentElement; a && a !== P; a = a.parentElement) { const cs = getComputedStyle(a); if (!/(hidden|clip)/.test(cs.overflowY + cs.overflowX)) continue; const q = a.getBoundingClientRect();
      if (r.bottom > q.bottom + 1 && q.height > 0 && !/(auto|scroll)/.test(cs.overflowY)) { coupes.push((a.className || a.tagName) + ' coupe ' + (e.textContent || '').trim().slice(0, 30) + ' (' + Math.round(r.bottom - q.bottom) + ' px)'); break; } } });
  // la page ne doit pas glisser de côté à cause du panneau, et le panneau reste atteignable (défile ou tient)
  const pr = P.getBoundingClientRect(), tient = P.scrollHeight <= P.clientHeight + 1 || /(auto|scroll)/.test(getComputedStyle(P).overflowY);
  return { n: vis.length, changes, coupes, tient, debordeX: P.scrollWidth > P.clientWidth + 1, titre: (P.querySelector('h2') || P).textContent.trim().slice(0, 40) }; };
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui, hash: 'accueil' });
  let panneaux = 0, elems = 0, changes = 0, gestes = 0; const coupes = [], atteignables = [], debords = [], vus = new Set();
  for (const route of routes) {
    await O.neuf(c, route); const liste = await O.marquer(c.p, '#contenu');
    const cibles = liste.filter(g => g.data).slice(0, MAX); console.log('== ' + route + ' : ' + liste.length + ' gestes, ' + cibles.length + ' touchés');
    for (const g of cibles) {
      await O.neuf(c, route);   // page neuve à chaque geste : une fenêtre qui n'est pas un panneau (création, composeur) laisserait la suite inerte
      const lst = await O.marquer(c.p, '#contenu'); const s = lst.find(x => x.lib === g.lib && x.data === g.data); if (!s) continue;
      gestes++; const tk = await L.toucher(c, `[data-sonde="${s.i}"]`, { delai: 2500 }); if (process.env.DBG) console.log("   touché", tk, await c.p.evaluate(() => location.hash + " calque=" + document.getElementById("calque").innerHTML.length)); await L.calme(c.p, 500);
      const m = await c.p.evaluate(MESURE); if (process.env.DBG) console.log("   ", g.lib.slice(0,30), g.data.slice(0,30), m ? m.titre : null); if (!m) continue; const cle = route + '|' + m.titre + '|' + m.n; if (vus.has(cle)) continue; vus.add(cle);
      panneaux++; elems += m.n; changes += m.changes; if (m.coupes.length) coupes.push(route + ' / ' + m.titre + ' : ' + m.coupes.slice(0, 2).join(' ; ')); if (!m.tient) atteignables.push(route + ' / ' + m.titre); if (m.debordeX) debords.push(route + ' / ' + m.titre);
      if (m.changes) console.log('  panneau « ' + m.titre + ' » : ' + m.changes + ' éléments que la règle garde entiers');
    }
  }
  console.log({ gestes, panneaux, elems, changes });
  L.v('population : au moins un panneau mesuré par écran balayé', panneaux >= Math.max(1, routes.length), { panneaux, gestes });
  L.v('aucun élément visé par la règle n\'est coupé par un ancêtre qui masque son débordement', coupes.length === 0, coupes);
  L.v('chaque panneau reste atteignable (il tient ou il défile)', atteignables.length === 0, atteignables);
  L.v('aucun panneau ne déborde de côté', debords.length === 0, debords);
  L.v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fermer(); process.exit(L.bilan());
})().catch(e => { console.error(e); process.exit(2); });
