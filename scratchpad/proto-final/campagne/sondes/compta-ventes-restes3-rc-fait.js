// Recontrôle adverse, tour 3 : Julie annule, ouvre la tâche par « Voir la tâche », la marque FAITE depuis la fenêtre ; ce qui doit se redire partout (fiche, Tâches, Historique, gérant).
// Puis le gérant la remet à faire : la fiche redit « à rembourser » à Julie ET à lui. Usage : node compta-ventes-restes3-rc-fait.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'julie', nuit }), p = c.p;
  const cap = n => L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-rc3/') + `rc3-fait-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  const tc = async sel => { const r = await p.evaluate(q => { const e = document.querySelector(q); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
    if (!r) return false; await p.waitForTimeout(300); if (c.doigt) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y); await L.calme(p, 450); return true; };
  const fiche = async () => { await X.fiche(c, 'f128'); return (await X.texte(p, '#contenu')).replace(/[  ]/g, ' '); };
  await X.fiche(c, 'f128'); const ok = [await tc('[data-action="partiel"]')]; await X.saisir(c, '#pp-m', '500'); ok.push(await tc('#calque [data-action="partielOk"]'));
  await X.fiche(c, 'f128'); ok.push(await tc('[data-action="avoir"]'), await tc('#calque [data-action="avoirOk"]')); await L.calme(p, 500);
  L.v('population : Julie encaisse 500 € puis annule', ok.every(Boolean), ok);
  let t = await fiche(); L.v('F1 · la fiche dit « à rembourser »', /à rembourser/i.test(t), 0);
  const o = await tc('#contenu .alerte [data-tmodif]'), f1 = await tc('.panneau .t-gestes-b [data-tfait]');
  L.v('F2 · Julie ouvre la tâche et touche « Fait » dans la fenêtre', o && f1, { o, f1 }); await L.calme(p, 500);
  t = await fiche();
  L.v('F3 · la fiche dit « remboursés » (plus « à rembourser »)', /remboursés/i.test(t) && !/à rembourser/i.test(t.replace(/Annulée.*?\n/, '')), t.split('\n').filter(l => /rembours/i.test(l)).join(' | '));
  const info = await p.evaluate(() => { const r = TACHES.find(x => x.cle === 'remb-f128'); return r && r.fait ? { par: r.fait.par, quoi: r.fait.quoi } : null; });
  L.v('F4 · la tâche est faite par Julie', info && info.par === 'julie', info);
  const j = await p.evaluate(() => JOURNAL.filter(x => /rembours|tâche|fait/i.test((x.action || '') + (x.det || ''))).slice(0, 3).map(x => x.qui + ' · ' + x.action));
  console.log('  · journal :', JSON.stringify(j)); console.log('  · entrées complètes :', JSON.stringify(await p.evaluate(() => JOURNAL.filter(x => x.el && x.el.id === 'f128').map(x => ({ qui: x.qui, action: x.action, det: x.det })))));
  L.v('F5 · l’Historique garde une ligne au nom de Julie', j.length > 0 && j.every(x => !/^marc/.test(x)), j);
  await cap('julie-fait');
  // le gérant relit
  await p.evaluate(() => rlChanger('patron')); await L.calme(p, 700);
  t = await fiche(); L.v('F6 · le gérant lit « remboursés » aussi', /remboursés/i.test(t) && !/à rembourser/i.test(t.replace(/Annulée.*?\n/, '')), 0);
  // « Remettre à faire » : la fiche d'une tâche faite n'offre plus « Voir la tâche » ; on passe par la liste des Tâches (filtre des faites), comme une personne
  await p.evaluate(() => aller('taches')); await L.calme(p, 600);
  const trouve = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-tmodif]')].find(e => /Rembourser/i.test(e.closest('li,div,article') ? e.closest('li,div,article').innerText : e.innerText)); return b ? b.dataset.tmodif : null; });
  console.log('  · gérant, liste des Tâches : tâche « Rembourser » faite ' + (trouve ? 'visible' : 'ABSENTE (masquée dans « Faites » ?)'));
  const idT = await p.evaluate(() => TACHES.find(x => x.cle === 'remb-f128').id);
  await p.evaluate(i => tDetail(i), idT);
  await L.calme(p, 500);
  const f2 = await tc('.panneau .t-gestes-b [data-tfait]'); await L.calme(p, 400);
  console.log('  · gérant : « Remettre à faire » touché : ' + f2);
  t = await fiche(); L.v('F7 · remise à faire par le gérant : la fiche redit « à rembourser »', f2 && /à rembourser/i.test(t), t.split('\n').filter(l => /rembours/i.test(l)).join(' | '));
  const cadre = await p.evaluate(() => { const r = TACHES.find(x => x.cle === 'remb-f128'); return r ? { qui: r.qui, fait: !!r.fait } : null; });
  L.v('F8 · la tâche reste à Julie, non faite', cadre && cadre.qui === 'julie' && !cadre.fait, cadre);
  await L.fermer(c);
})().catch(e => { console.error(e); process.exit(1); });
