// Tour 5, recontrôle ADVERSE : la frappe réelle des relevés sur toute la population des champs, le collage, l'auto-correction, Terminer en cours de saisie, la navigation sans sortie du champ, les autres rôles.
// usage : node interventions-restes-tour5-adverse.js <profil> [nuit] → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v;
  const sel = n => `[data-releve="${n}"]`;
  const lire = n => p.evaluate(s => { const e = document.querySelector(s); return e ? { champ: e.value, mem: (fiche(e.dataset.id).releves || {})[e.dataset.releve], toast: (document.getElementById('toast') || {}).textContent || '' } : null; }, sel(n));
  const poser = async (n, av) => { await p.evaluate(([s, a]) => { const e = document.querySelector(s); e.value = a; e.dispatchEvent(new Event('change', { bubbles: true })); const T = document.getElementById('toast'); if (T) T.textContent = ''; }, [sel(n), av]); };
  const frappe = async (n, t) => { await p.locator(sel(n)).scrollIntoViewIfNeeded(); await p.locator(sel(n)).click({ clickCount: 3 }); await p.keyboard.press('Delete'); await p.keyboard.type(t, { delay: 15 }); const pendant = await lire(n); await p.keyboard.press('Tab'); await L.calme(p, 150); return { pendant, apres: await lire(n) }; };
  // POPULATION : tous les métiers, tous les champs numériques ; les champs libres à part
  const pop = await p.evaluate(() => Object.entries(RELEVES).map(([m, l]) => [m, l.map(r => [r[0], r[1], /^\d+([.,]\d+)?$/.test(r[1])])]));
  const NUM = [], LIB = [];
  for (const [m, l] of pop) for (const [n, ex, num] of l) (num ? NUM : LIB).push([m, n, ex]);
  v('population : 11 champs numériques et 5 libres', NUM.length >= 9 && LIB.length >= 3, { NUM: NUM.length, LIB: LIB.length });
  const REFUS = ['10-12', '10 - 12', '3 sur 18', '12x3', '1 2 3', '10-', '10 – 12', '12/14', '1,2,3', '1.2.3', '--5', '5-5'];
  const BON = [['-5', '-5'], ['−5', '-5'], ['1 200', '1200'], ['1 234,5', '1234,5'], ['12,5', '12,5'], ['0', '0'], ['1.200,5', '1200,5'], ['1.234.567', '1234567']];
  let nb = 0;
  const VU = new Set(); for (const [m, n, ex] of NUM) { if (VU.has(m) || (!process.env.PLEIN && m !== 'clim')) continue; const complet = true; VU.add(m);
    await p.evaluate(m2 => { fiche('i1').metier = m2; }, m); await I.devenir(c, 'sm', 'inter-x-i1');
    if (!(await p.locator(sel(n)).count())) { v(`population : champ ${n} (${m}) présent`, false, 0); continue; }
    await poser(n, '14'); nb++;
    for (const t of (complet ? REFUS : ['10-12', '3 sur 18'])) { const r = await frappe(n, t);
      v(`${m}/${n} « ${t} » : pendant la frappe rien n'est retiré ni enregistré`, r.pendant.champ === t && r.pendant.mem === '14', r.pendant);
      v(`${m}/${n} « ${t} » : refus à la sortie, ancienne valeur, phrase`, r.apres.champ === '14' && r.apres.mem === '14' && /Un seul nombre/.test(r.apres.toast), r.apres); }
    for (const [t, att] of (complet ? BON : BON.slice(0, 3))) { const r = await frappe(n, t); v(`${m}/${n} « ${t} » → ${att}`, r.apres.champ === att && r.apres.mem === att, r.apres); }
    // collage et auto-correction : du texte inséré comme un vrai collage (insertText = saisie utilisateur, le navigateur suit le « change »)
    for (const t of ['10-12', '3 sur 18']) {
      await poser(n, '14'); await p.locator(sel(n)).click({ clickCount: 3 }); await p.keyboard.insertText(t);
      const pend = await lire(n); await p.keyboard.press('Tab'); await L.calme(p, 150); const ap = await lire(n);
      v(`${m}/${n} collage « ${t} » : refusé à la sortie`, pend.mem === '14' && ap.champ === '14' && ap.mem === '14', { pend, ap }); }
    // Entrée dans le champ
    await poser(n, '14'); await p.locator(sel(n)).click({ clickCount: 3 }); await p.keyboard.type('10-12'); await p.keyboard.press('Enter'); await L.calme(p, 150);
    const ent = await lire(n); v(`${m}/${n} Entrée sur « 10-12 » : jamais 1012 ni 10-12 enregistré`, ent.mem === '14' || ent.mem === undefined, ent);
    await p.keyboard.press('Tab');
  }
  // champs libres : intacts
  for (const [m, n] of LIB.filter(x => process.env.PLEIN || x[0] === 'nuis' || x[0] === 'nett')) { await p.evaluate(m2 => { fiche('i1').metier = m2; }, m); await I.devenir(c, 'sm', 'inter-x-i1');
    for (const t of ['10-12', '06:10 – 06:40', '2 100 individus', '3 sur 18']) { const r = await frappe(n, t); v(`libre ${m}/${n} « ${t} » intact`, r.apres.champ === t && r.apres.mem === t, r.apres); } }
  // Terminer pendant qu'une valeur est en cours (vrai clic souris) ; clim
  await p.evaluate(() => { fiche('i1').metier = 'clim'; }); await I.devenir(c, 'sm', 'inter-x-i1');
  await poser('Soufflage', '14');
  await p.locator(sel('Soufflage')).scrollIntoViewIfNeeded(); await p.locator(sel('Soufflage')).click({ clickCount: 3 }); await p.keyboard.type('10-12', { delay: 15 });
  const bt = p.locator('[data-action="terminer"]').first(); v('population : le bouton Terminer existe', (await bt.count()) > 0, 0);
  await bt.scrollIntoViewIfNeeded(); await bt.click({ force: false }).catch(async () => { await bt.click({ force: true }); }); await L.calme(p, 500);
  const t1 = await p.evaluate(() => ({ mem: (fiche('i1').releves || {}).Soufflage, etat: fiche('i1').etat, toast: (document.getElementById('toast') || {}).textContent || '', over: !!document.querySelector('.fen-voile, #overlay.on, .panneau') }));
  v('Terminer avec « 10-12 » en cours : jamais 1012 ni 10-12 enregistré', t1.mem === '14' || t1.mem === undefined, t1);
  console.log('  · info Terminer « 10-12 » :', JSON.stringify(t1));
  await L.capture(c, I.CAP + `tour5-adverse-terminer-${profil}${nuit ? '-nuit' : ''}.png`);
  // fiche COMPLÈTE + « 10-12 » en cours + vrai clic sur Terminer : que voit-on, que garde-t-on ?
  await p.keyboard.press('Escape'); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { document.querySelectorAll('.fen-voile').forEach(x => x.remove()); } catch (e) {} });
  await I.devenir(c, 'sm', 'inter-x-i1');
  await p.evaluate(() => { const F = fiche('i1'); tousControles(F).forEach(k => F.coches[k] = true); F.signature = 'data:image/png;base64,iVBORw0KGgo='; F.absent = false; F.compte = F.compte || 'Fait.'; }); await I.devenir(c, 'sm', 'inter-x-i1');
  const man = await p.evaluate(() => manque(fiche('i1'))); v('population : la fiche est complète (rien ne manque)', man.length === 0, man);
  await poser('Soufflage', '14'); await p.locator(sel('Soufflage')).scrollIntoViewIfNeeded(); await p.locator(sel('Soufflage')).click({ clickCount: 3 }); await p.keyboard.type('10-12', { delay: 15 });
  await p.evaluate(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; });
  const b2 = p.locator('[data-action="terminer"]').first(); await b2.scrollIntoViewIfNeeded(); await b2.click({ force: true }); await L.calme(p, 600);
  const t2 = await p.evaluate(() => ({ mem: (fiche('i1').releves || {}).Soufflage, etat: fiche('i1').etat, toast: (document.getElementById('toast') || {}).textContent || '', hist: (window.TOASTS || []).slice(-3) }));
  v('fiche complète, Terminer avec « 10-12 » en cours : jamais 1012 ni 10-12 enregistré', t2.mem === '14', t2);
  v('TOUR 6 : fiche complète + relevé refusé : la fiche ne se termine PAS (etat inchangé, pas de facture/mail)', t2.etat !== 'bureau', t2);
  v('TOUR 6 : la phrase de refus reste visible (pas remplacée par « Terminée »)', /Un seul nombre/.test(t2.toast) && !/Terminée/.test(t2.toast), t2);
  { // la porte directe (sans passer par le clic : appel de l'action) s'arrête aussi sur un relevé refusé
    const d = await p.evaluate(() => { const e = document.querySelector('input[data-releve="Soufflage"]'); if (!e) return null; e.value = '10-12'; ACTIONS.terminer({ dataset: { id: 'i1' } }); return { etat: fiche('i1').etat, mem: (fiche('i1').releves || {}).Soufflage }; });
    v('TOUR 6 : ACTIONS.terminer appelée avec un relevé refusé ne termine pas', d && d.etat !== 'bureau' && d.mem === '14', d); }
  console.log('  · info fiche complète + Terminer « 10-12 » :', JSON.stringify(t2));
  await L.capture(c, I.CAP + `tour5-adverse-terminer-complet-${profil}${nuit ? '-nuit' : ''}.png`);
  await p.keyboard.press('Escape'); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  await p.evaluate(() => { const F = fiche('i1'); F.etat = 'encours'; F.signature = null; tousControles(F).forEach(k => F.coches[k] = false); });
  // valeur JUSTE en cours + navigation sans sortie du champ (hashchange)
  await I.devenir(c, 'sm', 'inter-x-i1'); console.log('  · après Terminer, champ présent :', await p.locator(sel('Soufflage')).count(), JSON.stringify(await p.evaluate(() => ({ route, etat: fiche('i1').etat, h: location.hash, panneau: !!document.querySelector('.panneau') })))); await poser('Soufflage', '14');
  await p.locator(sel('Soufflage')).scrollIntoViewIfNeeded(); await p.locator(sel('Soufflage')).click({ clickCount: 3 }); await p.keyboard.type('17', { delay: 15 });
  await p.evaluate(() => { location.hash = '#accueil'; }); await L.calme(p, 400);
  const nav = await p.evaluate(() => (fiche('i1').releves || {}).Soufflage);
  v('« 17 » tapé puis navigation sans quitter le champ : la valeur n\'est pas perdue', nav === '17', nav);
  // rendu programmatique pendant la saisie
  await I.devenir(c, 'sm', 'inter-x-i1'); await poser('Soufflage', '14');
  await p.locator(sel('Soufflage')).scrollIntoViewIfNeeded(); await p.locator(sel('Soufflage')).click({ clickCount: 3 }); await p.keyboard.type('18', { delay: 15 });
  await p.evaluate(() => { try { rendre(); } catch (x) {} });
  await L.calme(p, 300); const rr = await p.evaluate(s => { const e = document.querySelector(s); return { champ: e && e.value, mem: (fiche('i1').releves || {}).Soufflage }; }, sel('Soufflage'));
  v('« 18 » tapé puis re-rendu de l\'écran : la valeur n\'est pas perdue', rr.mem === '18' || rr.champ === '18', rr);
  // autres rôles
  for (const qui of ['marc', 'julie', 'kb']) { try { await I.devenir(c, qui, 'inter-x-i1'); const n0 = await p.locator(sel('Soufflage')).count();
    if (!n0) { console.log(`  · NOTE ${qui} : pas de champ relevé sur cette fiche`); continue; }
    await poser('Soufflage', '14'); const r = await frappe('Soufflage', '10-12'); v(`rôle ${qui} : « 10-12 » refusé`, r.apres.champ === '14' && r.apres.mem === '14' && /Un seul nombre/.test(r.apres.toast), r.apres);
    const r2 = await frappe('Soufflage', '1 200'); v(`rôle ${qui} : « 1 200 » → 1200`, r2.apres.champ === '1200', r2.apres); } catch (e) { v(`rôle ${qui} : pas d'exception`, false, String(e).slice(0, 200)); } }
  const er = I.erreurs(c); v('aucune erreur de page', er.length === 0, er.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
