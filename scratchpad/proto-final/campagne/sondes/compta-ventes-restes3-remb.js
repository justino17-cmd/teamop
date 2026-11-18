// Restes « compta-ventes », tour 3 : (1) la tâche « Rembourser » va à qui ANNULE (Julie comme Marc) et « Voir la tâche » l'OUVRE ; (2) tâche supprimée à la main : la fiche offre « Noter comme remboursé »
// et le dit partout (fiche, ligne du bas, cadre). Usage : node compta-ventes-restes3-remb.js [profil] [nuit] [qui]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', qui = process.argv[4] || 'julie', c = await L.ouvrir({ profil, qui, nuit }), p = c.p;
  const cap = n => L.capture(c, X.CAP + `restes3-remb-${qui}-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  const tc = async sel => { const r = await p.evaluate(q => { const e = document.querySelector(q); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
    if (!r) return false; await p.waitForTimeout(300); if (c.doigt) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y); await L.calme(p, 450); return true; };
  const moi = await p.evaluate(() => tkxMoi());
  await X.fiche(c, 'f128'); const ok = [await tc('[data-action="partiel"]')]; await X.saisir(c, '#pp-m', '500'); ok.push(await tc('#calque [data-action="partielOk"]'));
  await X.fiche(c, 'f128'); ok.push(await tc('[data-action="avoir"]'), await tc('#calque [data-action="avoirOk"]')); await L.calme(p, 500);
  L.v('population : ' + qui + ' (' + moi + ') encaisse 500 € puis annule par un avoir', ok.every(Boolean), ok);
  const t = await p.evaluate(() => { const t = TACHES.find(o => o.cle === 'remb-f128'); return t ? { id: t.id, qui: t.qui, creePar: t.creePar } : null; });
  L.v('R1 · la tâche « Rembourser » est à ' + moi + ', qui a annulé', !!t && t.qui === moi, t);
  await X.fiche(c, 'f128'); await cap('fiche-avant');
  L.v('R2 · la fiche dit « à rembourser » et offre « Voir la tâche »', await p.evaluate(() => /à rembourser/.test(document.querySelector('#contenu').innerText) && !!document.querySelector('#contenu .alerte [data-tmodif]')));
  const tt = await L.toucher(c, '#contenu .alerte [data-tmodif]'); console.log('  · toucher :', tt, JSON.stringify(await p.evaluate(() => ({ p: !!document.querySelector('.panneau'), r: document.querySelector('#contenu .alerte [data-tmodif]') && document.querySelector('#contenu .alerte [data-tmodif]').getBoundingClientRect().toJSON() })))); await L.calme(p, 500); const pan = await p.evaluate(() => { const e = document.querySelector('.panneau'); return e ? e.innerText : ''; });
  L.v('R3 · « Voir la tâche » ouvre la tâche « Rembourser 500,00 € » (et son bouton Fait), pas une liste', /Rembourser 500,00/.test(pan.replace(/[  ]/g, ' ')) && /Fait/.test(pan) || await p.evaluate(() => !!document.querySelector('#calque .panneau [data-tfait]')), pan.slice(0, 160));
  await cap('tache-ouverte');
  // la tâche est supprimée à la main (Modifier › Supprimer)
  await L.toucher(c, '#calque [data-tedit]'); await L.calme(p, 500); const sup = await L.toucher(c, '#calque [data-tsuppr]').then(() => true).catch(() => false); await L.calme(p, 500);
  L.v('R4 · tâche supprimée : population (elle l’est vraiment)', sup && await p.evaluate(() => !TACHES.some(o => o.cle === 'remb-f128')));
  await X.fiche(c, 'f128');
  const geste = await p.evaluate(() => [...document.querySelectorAll('#contenu button')].filter(b => /Noter comme remboursé/.test(b.textContent)).length);
  L.v('R5 · plus de tâche : la fiche offre UN geste « Noter comme remboursé »', geste === 1, geste); await cap('fiche-sans-tache');
  const aj0 = await p.evaluate(() => JOURNAL.length);
  await L.toucher(c, '#contenu [data-action="rembourseNote"]'); await L.calme(p, 500);
  const apres = await p.evaluate(() => ({ t: (TACHES.find(o => o.cle === 'remb-f128') || {}).fait || null, texte: document.querySelector('#contenu').innerText.replace(/[  ]/g, ' '), jr: JOURNAL.length, geste: !!document.querySelector('#contenu [data-action="rembourseNote"]') }));
  L.v('R6 · noté : la fiche dit « Remboursé au client » et « remboursés », sans « à rembourser », et le geste disparaît', /Remboursé au client/.test(apres.texte) && /remboursés au client/.test(apres.texte) && !/à rembourser/i.test(apres.texte) && !apres.geste, apres.texte.split('\n').filter(l => /rembours/i.test(l)));
  L.v('R7 · une tâche FAITE (par ' + moi + ') existe, avec sa ligne à l’Historique', !!apres.t && apres.t.par === moi && apres.jr === aj0 + 1, { fait: apres.t, jr: [aj0, apres.jr] }); await cap('fiche-apres');
  const f = await X.cadreOuvert(c); await f.evaluate(() => aller('ventes')); await p.waitForTimeout(900);
  const row = await f.evaluate(() => { const e = document.querySelector('#contenu tr[data-fac="FAC-2026-0128"]'); return e ? e.innerText.replace(/[  ]/g, ' ').replace(/\s+/g, ' ') : ''; });
  L.v('R8 · la liste de la Comptabilité dit « remboursés » (une seule vérité)', /rembours/.test(row) && !/à rembourser/i.test(row), row.slice(0, 200));
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
