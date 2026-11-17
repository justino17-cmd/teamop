// Recontrôle adverse des restes du technicien, tour 1 : les trois avis d'une même liste (validé, autres dates, refusé) sont alignés — pastille de même taille, titre au même x.
// Capture vue : le titre de « Autres dates » commençait 6 px plus à droite que les deux autres. Usage : node restes-technicien-recontrole-alignement.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'absences' }), p = c.p; await L.calme(p, 600);
  await p.evaluate(() => { aAvis('sm', { ic:'non', titre:'Refus de test', det:'Congé · du 1 au 2', msg:'' }); aAvis('sm', { ic:'info', titre:'Autres dates de test', det:'Congé · du 3 au 4', msg:'' }); aAvis('sm', { ic:'ok', titre:'Validation de test', det:'Congé · du 5 au 6', msg:'' }); rendre(); }); await L.calme(p, 500);
  const r = await p.evaluate(() => [...document.querySelectorAll('.carte.a-avis:not(.tkx-avis)')].filter(e => /de test/.test(e.textContent)).map(e => { const i = e.querySelector('.a-dec-i'), t = e.querySelector('.a-avis-c'), ri = i.getBoundingClientRect(), rt = t.getBoundingClientRect(), cs = getComputedStyle(i);
    return { cls: i.className.replace('a-dec-i ', ''), pastilleL: Math.round(ri.width * 10) / 10, pastilleH: Math.round(ri.height * 10) / 10, titreX: Math.round(rt.left * 10) / 10, flex: cs.flex, famille: cs.fontFamily.slice(0, 30), gap: getComputedStyle(e).columnGap }; }));
  console.log(JSON.stringify(r));
  v(`[${J}] population : trois avis`, r.length === 3, r);
  if (r.length === 3) { v(`[${J}] les trois pastilles ont la même largeur`, new Set(r.map(x => x.pastilleL)).size === 1, r); v(`[${J}] les trois titres commencent au même x`, new Set(r.map(x => x.titreX)).size === 1, r); }
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
