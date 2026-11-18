// Recontrôle adverse des restes « compta-ventes », tour 3 : la tâche « Rembourser » va désormais à qui ANNULE. Que voit l'AUTRE personne (le gérant quand c'est Julie, Julie quand c'est le gérant) ?
// Et le geste « Noter comme remboursé » : écrit-il au nom de celui qui l'a fait, partout (tâche, Historique, fiche, cadre) ?
// Usage : node compta-ventes-restes3-rc-remb.js [profil] [nuit]   — « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'julie', nuit }), p = c.p;
  const cap = n => L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-rc3/') + `rc3-remb-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  const tc = async sel => { const r = await p.evaluate(q => { const e = document.querySelector(q); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
    if (!r) return false; await p.waitForTimeout(300); if (c.doigt) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y); await L.calme(p, 450); return true; };
  const moi = await p.evaluate(() => tkxMoi());
  await X.fiche(c, 'f128'); const ok = [await tc('[data-action="partiel"]')]; await X.saisir(c, '#pp-m', '500'); ok.push(await tc('#calque [data-action="partielOk"]'));
  await X.fiche(c, 'f128'); ok.push(await tc('[data-action="avoir"]'), await tc('#calque [data-action="avoirOk"]')); await L.calme(p, 500);
  L.v('population : ' + moi + ' encaisse 500 € puis annule par un avoir', ok.every(Boolean) && moi === 'julie', { ok, moi });
  const t = await p.evaluate(() => { const r = TACHES.find(x => x.cle === 'remb-f128'); return r ? { qui: r.qui, t: r.t, fait: !!r.fait } : null; });
  L.v('la tâche existe et est à Julie', t && t.qui === 'julie', t);
  // ── le gérant, qui change de rôle sans recharger : voit-il la tâche, sur l'accueil et dans Tâches ? ──
  await p.evaluate(() => rlChanger('patron')); await L.calme(p, 700);
  await p.evaluate(() => aller('taches')); await L.calme(p, 700);
  const tg = await X.texte(p, '#contenu');
  const gerantVoit = /Rembourser/i.test(tg);
  console.log('  · gérant, écran Tâches : ' + (gerantVoit ? 'voit « Rembourser »' : 'NE voit PAS « Rembourser »') + ' | filtres : ' + (await p.evaluate(() => [...document.querySelectorAll('#contenu .filtre, #contenu [data-tkf], #contenu .puce')].map(e => e.innerText.trim()).slice(0, 10).join(' / '))));
  L.v('le gérant voit la tâche « Rembourser 500 € » ouverte par Julie (Tâches)', gerantVoit, tg.slice(0, 300));
  await cap('gerant-taches');
  await X.fiche(c, 'f128');
  const fg = await X.texte(p, '#contenu');
  console.log('  · gérant, fiche : ' + (fg.match(/[^\n]*rembours[^\n]*/gi) || []).join(' | '));
  L.v('la fiche dit « à rembourser » au gérant, avec un chemin vers la tâche', /à rembourser/i.test(fg) && await p.evaluate(() => !!document.querySelector('[data-tmodif]')), 0);
  const ouv = await tc('#contenu .alerte [data-tmodif]'); const pn = await p.evaluate(() => { const e = document.querySelector('.panneau'); return e ? e.innerText.replace(/\n{2,}/g, '\n').trim() : ''; });
  console.log('  · « Voir la tâche » ouvre :', JSON.stringify(pn.slice(0, 160)));
  L.v('« Voir la tâche » ouvre une fenêtre de tâche pour le gérant', ouv && /Rembourser/i.test(pn), pn.slice(0, 120));
  await cap('gerant-tache-ouverte');
  await L.fermer(c);
})().catch(e => { console.error(e); process.exit(1); });
