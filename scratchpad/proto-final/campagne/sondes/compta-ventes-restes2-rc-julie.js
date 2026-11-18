// Recontrôle adverse, tour 2 : la tâche « Rembourser » naît AU NOM DE MARC (qui:'marc' en dur). Qui annule une facture déjà payée en partie et peut-il ensuite marquer le remboursement fait ?
// Usage : node compta-ventes-restes2-rc-julie.js [profil] [qui]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'julie', c = await L.ouvrir({ profil, qui }), p = c.p;
  const tc = async sel => { const r = await p.evaluate(q => { const e = document.querySelector(q); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }, sel);
    if (!r) return false; await p.waitForTimeout(300); if (c.doigt) await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y); await L.calme(p, 400); return true; };
  const moi = await p.evaluate(() => ({ role: typeof ROLE !== 'undefined' ? ROLE : null, moi: typeof tkxMoi === 'function' ? tkxMoi() : null }));
  console.log('  · connecté comme', JSON.stringify(moi));
  await X.fiche(c, 'f128'); const ok1 = await tc('[data-action="partiel"]'); await X.saisir(c, '#pp-m', '500'); const ok2 = await tc('#calque [data-action="partielOk"]'); await L.calme(p, 400);
  await X.fiche(c, 'f128'); const ok3 = await tc('[data-action="avoir"]'); const ok4 = await tc('#calque [data-action="avoirOk"]'); await L.calme(p, 500);
  L.v('population : ' + qui + ' a pu encaisser 500 € puis annuler par un avoir', ok1 && ok2 && ok3 && ok4, { ok1, ok2, ok3, ok4 });
  const x = await p.evaluate(() => { const t = TACHES.find(o => o.cle === 'remb-f128'); return t ? { qui: t.qui, creePar: t.creePar } : null; });
  console.log('  · la tâche :', JSON.stringify(x));
  await p.evaluate(() => aller('taches')); await L.calme(p, 600);
  const vue = await p.evaluate(() => /Rembourser 500/.test(document.querySelector('#contenu').innerText));
  console.log('  · ' + qui + ' voit la tâche dans SES Tâches :', vue);
  const t = (await (async () => { await X.fiche(c, 'f128'); return X.texte(p, '#contenu'); })()).split('\n').filter(l => /rembours/i.test(l));
  console.log('  · lignes de la fiche :', JSON.stringify(t));
  { const lien = await p.evaluate(() => [...document.querySelectorAll('#contenu button, #contenu a')].filter(b => /Voir la tâche/.test(b.textContent)).map(b => b.outerHTML.slice(0, 160)));
    console.log('  · lien :', JSON.stringify(lien));
    const ouvert = await tc('#contenu [data-tvoir], #contenu .lien[data-go], #contenu [data-action="voirTache"]'); await L.calme(p, 500);
    const pan = (await X.panneau(p)).slice(0, 200).replace(/\n/g, ' | '); console.log('  · après « Voir la tâche » :', ouvert, JSON.stringify(pan));
    const fait = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button, #contenu button')].filter(b => /Fait/.test(b.textContent) && b.offsetParent).length);
    console.log('  · boutons « Fait » visibles :', fait); }
  await p.evaluate(() => aller('taches')); await L.calme(p, 600);
  console.log('  · écran Tâches de ' + qui + ' :', JSON.stringify((await X.texte(p, '#contenu')).replace(/\n+/g, ' | ').slice(0, 500)));
  console.log('  · onglets/filtres :', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#contenu [data-tonglet], #contenu select option, #contenu .puce-c')].map(b => b.textContent.trim()).slice(0, 14))));
  L.v('la personne qui a annulé la facture retrouve le remboursement à marquer fait', !!x && (vue || x.qui === moi.moi), { x, vue });
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
