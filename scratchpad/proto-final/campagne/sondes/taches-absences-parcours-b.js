// Parcours B (gérant, ordinateur) : terminer, remettre à faire, reporter, confier, choisir plusieurs, filtres, recherche, rangements.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
const cmpt = p => p.evaluate(() => { const g = s => [...document.querySelectorAll(s)]; const o = {}; g('[data-tonglet]').forEach(b => { const m = b.textContent.match(/(\d+)\s*$/); o[b.dataset.tonglet] = m ? +m[1] : 0; }); return { o, lignes: g('#contenu [data-tmodif]').length, titres: g('#contenu [data-tmodif] .t-titre').map(e => e.textContent.trim()) }; });
const tab = async (p, k) => { await p.evaluate(k => document.querySelector(`[data-tonglet=${k}]`).click(), k); await L.calme(p, 300); };
const tache = (p, id) => p.evaluate(id => { const x = TACHES.find(o => o.id === id); return x ? JSON.parse(JSON.stringify(x)) : null; }, id);
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'taches' }); const p = c.p;
  const neuf = async () => { await O.neuf(c, 'taches'); };
  // B1 — terminer par la fiche, annuler, remettre à faire
  await neuf(); const a0 = await cmpt(p), j0 = await p.evaluate(() => JOURNAL.length);
  await p.evaluate(() => tDetail('t3')); await L.calme(p, 400);
  const fiche = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button, #calque .panneau a, #calque .panneau select')].map(e => (e.textContent || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().slice(0, 40)));
  console.log('fiche t3 :', JSON.stringify(fiche));
  await L.capture(c, O.CAP + 'B1-fiche-t3.png');
  await p.evaluate(() => document.querySelector('#calque .panneau [data-tfait]').click()); await L.calme(p, 400);
  let a1 = await cmpt(p), x = await tache(p, 't3');
  v('B1 : « Terminer » depuis la fiche : la tâche est faite (par Marc)', x.fait && x.fait.par === 'marc', x.fait);
  v('B1 : la fenêtre se ferme', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
  v('B1 : Aujourd’hui 7→6, la ligne a disparu', a1.o.auj === a0.o.auj - 1 && a1.lignes === a0.lignes - 1, [a0.o, a1.o]);
  v('B1 : l’historique le note', await p.evaluate(j => JOURNAL.length > j && /terminé/.test(JOURNAL[JOURNAL.length - 1].action), j0));
  await tab(p, 'faites'); const f1 = await cmpt(p); v('B1 : « Faites » en montre une de plus (3)', f1.lignes === 3 && f1.titres.some(t => /attestation TVA/.test(t)), f1);
  await L.capture(c, O.CAP + 'B1-faites.png');
  await p.evaluate(() => document.querySelector('#toast button') && document.querySelector('#toast button').click()); await L.calme(p, 300);
  x = await tache(p, 't3'); v('B1 : « Annuler » du toast remet la tâche à faire', !x.fait, x.fait);
  // remettre à faire depuis Faites (t9)
  await neuf(); await tab(p, 'faites'); await p.evaluate(() => tDetail('t9')); await L.calme(p, 300);
  await p.evaluate(() => document.querySelector('#calque .panneau [data-tfait]').click()); await L.calme(p, 300);
  x = await tache(p, 't9'); v('B1 : « Remettre à faire » une tâche faite', !x.fait, x.fait);
  // B2 — reporter
  await neuf(); await p.evaluate(() => tDetail('t3')); await L.calme(p, 300);
  await p.evaluate(() => document.querySelector('[data-trep^="t3|"]').click()); await L.calme(p, 300);
  x = await tache(p, 't3'); const dem = await p.evaluate(() => jour(1));
  v('B2 : « Demain » reporte la tâche à demain', x.d === dem, x.d);
  const c2 = await cmpt(p); v('B2 : elle quitte « Aujourd’hui » (6) et rejoint « À venir » (6)', c2.o.auj === 6 && c2.o.avenir === 6, c2.o);
  // B3 — confier à quelqu'un d'autre
  await neuf(); await p.evaluate(() => tDetail('t3')); await L.calme(p, 300);
  await p.selectOption('#calque [data-tconfier]', 'kb'); await L.calme(p, 400);
  x = await tache(p, 't3'); v('B3 : « Confier à Karim » change le responsable', x.qui === 'kb', x.qui);
  const retards = await p.evaluate(() => [...document.querySelectorAll('.tkx-retard-p')].map(e => e.textContent.trim()));
  console.log('retards équipe après confier :', retards);
  await p.selectOption('[data-tqui]', 'kb'); await L.calme(p, 300); const ck = await cmpt(p);
  v('B3 : le filtre « Karim » montre la tâche confiée', ck.titres.some(t => /attestation TVA/.test(t)), ck.titres);
  v('B3 : l’historique note qui a confié', await p.evaluate(() => /confi/.test(JSON.stringify(JOURNAL.slice(-2)))), await p.evaluate(() => JOURNAL.slice(-2).map(j => j.action)));
  // B4 — plusieurs à la fois
  await neuf(); const av = await cmpt(p);
  await p.evaluate(() => { document.querySelector('[data-tsel=t1]').click(); document.querySelector('[data-tsel=t12]').click(); }); await L.calme(p, 300);
  let bar = await p.evaluate(() => { const b = document.querySelector('.t-selbarre'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
  v('B4 : la barre dit « 2 choisies »', bar && /2\s*choisies/.test(bar), bar);
  await L.capture(c, O.CAP + 'B4-barre.png');
  await p.evaluate(() => document.querySelector('[data-tsd]:not([data-tsd="' + AUJ + '"])').click()); await L.calme(p, 400);
  const d1 = await p.evaluate(() => [TACHES.find(x => x.id === 't1').d, TACHES.find(x => x.id === 't12').d, jour(1)]);
  v('B4 : « Demain » reporte les deux d’un coup', d1[0] === d1[2] && d1[1] === d1[2], d1);
  await neuf(); await p.evaluate(() => { document.querySelector('[data-tsel=t1]').click(); document.querySelector('[data-tsel=t12]').click(); }); await L.calme(p, 300);
  await p.selectOption('[data-tsqui]', 'kb'); await L.calme(p, 400);
  v('B4 : « Confier à Karim » pour deux tâches', await p.evaluate(() => TACHES.find(x => x.id === 't1').qui === 'kb' && TACHES.find(x => x.id === 't12').qui === 'kb'), await p.evaluate(() => [TACHES.find(x => x.id === 't1').qui, TACHES.find(x => x.id === 't12').qui]));
  await neuf(); await p.evaluate(() => { document.querySelector('[data-tsel=t1]').click(); document.querySelector('[data-tsel=t12]').click(); }); await L.calme(p, 300);
  await p.evaluate(() => document.querySelector('[data-tsdevis]') && document.querySelector('[data-tsdevis]').click()); await L.calme(p, 600);
  const dv = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, hash: location.hash, atelier: !!document.querySelector('#opdz:not([hidden])'), texte: (document.getElementById('contenu') || {}).innerText.slice(0, 200) }));
  console.log('Ouvrir dans Devis →', JSON.stringify(dv)); await L.capture(c, O.CAP + 'B4-ouvrir-devis.png');
  v('B4 : « Ouvrir dans Devis » mène à Devis', /Devis/.test(dv.h1 || '') || /devis/.test(dv.hash), dv);
  await neuf(); await p.evaluate(() => { document.querySelector('[data-tsel=t1]').click(); document.querySelector('[data-tsel=t12]').click(); }); await L.calme(p, 300);
  await p.evaluate(() => document.querySelector('[data-tselvide]').click()); await L.calme(p, 300);
  v('B4 : « Annuler » vide la sélection et ferme la barre', await p.evaluate(() => !document.querySelector('.t-selbarre') && tSel.size === 0));
  await p.evaluate(() => { document.querySelector('[data-tsel=t3]').click(); document.querySelector('[data-tsel=t13]').click(); }); await L.calme(p, 300);
  await p.evaluate(() => document.querySelector('[data-tsfait]').click()); await L.calme(p, 500);
  const fl = await p.evaluate(() => [TACHES.find(x => x.id === 't3').fait, TACHES.find(x => x.id === 't13').fait, (document.getElementById('toast') || {}).textContent]);
  v('B4 : « ✓ Fait » termine les deux choisies', !!fl[0] && !!fl[1], fl);
  console.log('toast lot :', fl[2]);
  // B5 — filtres
  await neuf(); await p.evaluate(() => document.querySelector('[data-tkxfiltre=retard]').click()); await L.calme(p, 300);
  let f = await cmpt(p); v('B5 : filtre « En retard » = 2 lignes (comme la pastille)', f.lignes === 2, f);
  await p.evaluate(() => document.querySelector('[data-tkxfiltre=retard]').click()); await p.evaluate(() => document.querySelector('[data-tkxfiltre=urgent]').click()); await L.calme(p, 300);
  f = await cmpt(p); v('B5 : filtre « Urgentes » = 2 lignes', f.lignes === 2, f);
  await p.evaluate(() => document.querySelector('[data-tkxfiltre=urgent]').click()); await p.evaluate(() => document.querySelector('[data-tkxfiltre=sansdate]').click()); await L.calme(p, 400);
  f = await cmpt(p); const ong = await p.evaluate(() => (document.querySelector('[data-tonglet][aria-pressed=true]') || {}).textContent);
  v('B5 : filtre « Sans date 1 » : la pastille annonce 1, l’écran montre 1 ligne (pas « aucune tâche »)', f.lignes === 1, { f, ong, vide: await p.evaluate(() => (document.querySelector('.t-vide') || {}).textContent) });
  await L.capture(c, O.CAP + 'B5-sansdate.png');
  // B6 — recherche
  await neuf(); await p.fill('[data-tkxcherche]', 'durand'); await L.calme(p, 500); f = await cmpt(p);
  v('B6 : « durand » trouve les tâches des Durand (4)', f.lignes >= 3, f);
  await p.fill('[data-tkxcherche]', '0128'); await L.calme(p, 500); f = await cmpt(p); v('B6 : « 0128 » trouve la tâche de la facture', f.lignes === 1, f);
  await p.fill('[data-tkxcherche]', 'zzzqx'); await L.calme(p, 500); const vide = await p.evaluate(() => (document.querySelector('.t-vide') || {}).textContent);
  v('B6 : recherche sans résultat : message qui dit quoi faire', /Aucune tâche ne correspond/.test(vide || '') && /Enlève|efface/i.test(vide), vide);
  // B7 — rangements
  await neuf(); for (const k of ['heure', 'personne']) { await p.selectOption('[data-tkxrang]', k); await L.calme(p, 400); f = await cmpt(p); v(`B7 : ranger par ${k} : ${f.lignes} lignes (7 attendues)`, f.lignes === 7, f); await L.capture(c, O.CAP + `B7-${k}.png`); }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
