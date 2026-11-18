// Recontrôle adverse des restes « compta-ventes », tour 2 : le remboursement d'une facture annulée, joué dans TOUS ses états (fait, remis à faire, annulé par le bouton du toast, tâche supprimée),
// et relu sur tous les écrans qui parlent de ce que le client doit encore recevoir (fiche, liste, client, tâches, accueil, journal, cadre de la Comptabilité).
// Usage : node compta-ventes-restes2-rc-remb.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const tc = async sel => { const r = await p.evaluate(q => { const e = document.querySelector(q); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
    if (!r) return false; await p.waitForTimeout(300); if (c.doigt) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y); await L.calme(p, 400); return true; };
  const cap = n => L.capture(c, X.CAP + `rc-remb-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  const fiche = async () => { await X.fiche(c, 'f128'); return X.texte(p, '#contenu'); };
  const dit = (t, re) => re.test(t.replace(/[  ]/g, ' '));
  // ── mise en place : 500 € reçus, puis l'avoir qui annule ──
  await X.fiche(c, 'f128'); await tc('[data-action="partiel"]'); await X.saisir(c, '#pp-m', '500'); await tc('#calque [data-action="partielOk"]'); await L.calme(p, 400);
  await X.fiche(c, 'f128'); await tc('[data-action="avoir"]'); await tc('#calque [data-action="avoirOk"]'); await L.calme(p, 500);
  const tid = await p.evaluate(() => { const x = TACHES.find(o => o.cle === 'remb-f128'); return x ? x.id : null; });
  L.v('population : la tâche « Rembourser » existe', !!tid);
  let t = await fiche(); L.v('avant : la fiche dit « À rembourser au client »', dit(t, /À rembourser au client\s*\n?\s*500,00/) && !/Remboursé au client/.test(t));
  // ── 1 · fait ──
  await p.evaluate(id => tCocher(id), tid); await L.calme(p, 400); t = await fiche();
  L.v('1 · tâche faite : « Remboursé au client 500,00 € », plus « À rembourser »', dit(t, /Remboursé au client\s*\n?\s*500,00/) && !/À rembourser au client/.test(t), t.slice(0, 80));
  await cap('1-fait');
  { const f = await X.cadreOuvert(c); await f.evaluate(() => aller('ventes')); await p.waitForTimeout(800);
    /* le cadre recouvre l'application : il se redessine à son prochain rendu, pas au message — on le fait rendre avant de lire, comme le fait la personne qui revient dessus */
    const ligne = async () => { await f.evaluate(() => aller('ventes')); await p.waitForTimeout(600); return f.evaluate(() => { const e = document.querySelector('#contenu tr[data-fac="FAC-2026-0128"]'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }); };
    const l1 = await ligne(); L.v('1b · la ligne de la liste du cadre dit « 500,00 € remboursés » (et non « à rembourser »)', /500,00\s€ remboursés/.test(l1) && !/à rembourser/.test(l1), l1.slice(0, 200));
    // retour à OP GESTION, la tâche est remise à faire PENDANT que le cadre est ouvert en dessous : la liste du cadre doit suivre
    await p.evaluate(id => tCocher(id), tid); await p.waitForTimeout(900); const l2 = await ligne();
    L.v('1c · tâche remise à faire alors que le cadre est déjà chargé : sa ligne redit « à rembourser »', /500,00\s€ à rembourser/.test(l2) && !/remboursés/.test(l2), l2.slice(0, 200));
    await p.evaluate(id => tCocher(id), tid); await p.waitForTimeout(900); const l3 = await ligne(); L.v('1d · refaite : « remboursés » de nouveau', /remboursés/.test(l3), l3.slice(0, 200));
    await p.evaluate(id => tCocher(id), tid); await p.waitForTimeout(500); await p.evaluate(id => tCocher(id), tid); await L.calme(p, 400); await X.fiche(c, 'f128'); }
  // ── 2 · remise à faire (le geste inverse, offert par la liste des tâches) ──
  await p.evaluate(id => tCocher(id), tid); await L.calme(p, 400); t = await fiche();
  L.v('2 · tâche remise à faire : la fiche redit « À rembourser » (l’écran suit la tâche dans les deux sens)', dit(t, /À rembourser au client\s*\n?\s*500,00/) && !/Remboursé au client/.test(t));
  // ── 3 · cochée puis « Annuler » dans la bulle ──
  await p.evaluate(id => tCocher(id), tid); await L.calme(p, 300);
  const ok3 = await tc('#toast button, #toast .toast-act, #toast [data-toast-act]'); await L.calme(p, 400); t = await fiche();
  L.v('3 · « Annuler » dans la bulle de la tâche : la fiche redit « À rembourser »', ok3 && dit(t, /À rembourser au client\s*\n?\s*500,00/), { ok3 });
  // ── 4 · la tâche est SUPPRIMÉE (Supprimer dans sa fenêtre) ──
  await p.evaluate(() => aller('taches')); await L.calme(p, 500);
  await L.toucher(c, '[data-tmodif="' + tid + '"]'); await L.calme(p, 500);
  console.log('  · boutons du détail :', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => [b.textContent.trim().slice(0, 30), b.className, Object.keys(b.dataset).join(',')]))));
  await tc('#calque [data-tedit]'); await L.calme(p, 500);
  console.log('  · fenêtre de la tâche :', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('[data-tsuppr]')].map(b => [b.outerHTML.slice(0, 80), !!b.offsetParent]))), JSON.stringify((await X.panneau(p)).slice(0, 120)));
  const sup = await tc('#calque [data-tsuppr]'); await L.calme(p, 500);
  t = await fiche(); const gone = await p.evaluate(() => !TACHES.some(o => o.cle === 'remb-f128'));
  console.log('  · tâche supprimée :', JSON.stringify({ sup, gone }), '| fiche :', JSON.stringify(t.replace(/\n/g, ' | ').slice(0, 260)));
  const geste = await p.evaluate(() => [...document.querySelectorAll('#contenu button, #contenu .lien')].map(b => b.textContent.trim()).filter(x => /rembours|payé|encaiss/i.test(x)));
  console.log('  · gestes de remboursement offerts sur la fiche, la tâche étant supprimée :', JSON.stringify(geste));
  L.v('4 · tâche supprimée : population (elle l’est vraiment)', sup && gone);
  console.log('  · lignes « rembours » de la fiche :', JSON.stringify(t.split('\n').filter(x => /rembours/i.test(x))));
  { const f = await X.cadreOuvert(c); await f.evaluate(() => aller('ventes')); await p.waitForTimeout(800); await f.evaluate(() => document.querySelector('#contenu tr[data-fac="FAC-2026-0128"]').click()); await p.waitForTimeout(600);
    const pan = await f.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }); console.log('  · cadre, tâche supprimée :', JSON.stringify(pan.slice(0, 400))); }
  await cap('4-supprimee');
  L.v('5 · l’application reste cohérente : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
