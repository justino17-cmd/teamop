// Tour 7 : la phrase de refus d'un relevé ne recouvre jamais le bouton Terminer (centre du bouton non couvert par la bulle, et aucune intersection visible), 7 profils x jour/nuit.
// usage : node interventions-restes-tour7-recouvrement.js <profil> [nuit] → « N ✓ · M ✗ »
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v;
  const sel = n => `[data-releve="${n}"]`, S = sel('Soufflage');
  const lire = (n, id) => p.evaluate(([s, i]) => { const e = document.querySelector(s); const F = fiche(i || (e && e.dataset.id)); return e ? { champ: e.value, mem: (F.releves || {})[e.dataset.releve], refuse: e.dataset.refuse || null, toast: (document.getElementById('toast') || {}).textContent || '' } : null; }, [sel(n), id]);
  const poser = async (n, av) => { await p.evaluate(([s, a]) => { const e = document.querySelector(s); e.value = a; e.dispatchEvent(new Event('change', { bubbles: true })); const T = document.getElementById('toast'); if (T) T.textContent = ''; }, [sel(n), av]); };
  const frappe = async (n, t, sortie = 'Tab') => { await p.locator(sel(n)).scrollIntoViewIfNeeded(); await p.locator(sel(n)).click({ clickCount: 3 }); await p.keyboard.press('Delete'); if (t) await p.keyboard.type(t, { delay: 12 }); if (sortie) await p.keyboard.press(sortie); await L.calme(p, 150); return lire(n); };
  const vide = () => p.evaluate(() => { const T = document.getElementById('toast'); if (T) T.textContent = ''; });
  const complete = id => p.evaluate(i => { const F = fiche(i); tousControles(F).forEach(k => F.coches[k] = true); F.signature = 'data:image/png;base64,iVBORw0KGgo='; F.absent = false; F.compte = F.compte || 'Fait.'; F.etat = 'encours'; (INTS.find(o => o.id === i) || {}).st = 'planifiee'; }, id);
  const clic = async sl => { const b = p.locator(sl).first(); await b.scrollIntoViewIfNeeded(); await b.click({ force: true }); await L.calme(p, 500); };
  await p.evaluate(() => { fiche('i1').metier = 'clim'; fiche('i1').releves = { Soufflage: '14' }; }); await complete('i1'); await I.devenir(c, 'sm', 'inter-x-i1');
  v('population : champ Soufflage et bouton Terminer présents', (await p.locator(S).count()) === 1 && (await p.locator('[data-action="terminer"]').count()) >= 1, 0);
  await poser('Soufflage', '14'); await frappe('Soufflage', '10-12');
  await p.locator('[data-action="terminer"]').first().scrollIntoViewIfNeeded();
  // on cherche la position où la bulle est la plus gênante : bouton calé en bas de fenêtre, puis au milieu
  for (const pos of ['visible', 'bas']) {
    if (pos === 'bas') await p.evaluate(() => { const b = document.querySelector('[data-action="terminer"]'); const r = b.getBoundingClientRect(); const sc = b.closest('#contenu,main,.vue') || document.scrollingElement; window.scrollBy(0, r.bottom - innerHeight + 4); });
    await p.evaluate(() => { try { toast('Un seul nombre ici : écris une seule mesure (ex. 14), pas « 3 sur 18 » ni « 10-12 ». Ta saisie n’est pas enregistrée.'); } catch (e) {} }); await L.calme(p, 450);
    const m = await p.evaluate(() => { const b = document.querySelector('[data-action="terminer"]'), T = document.getElementById('toast'); const rb = b.getBoundingClientRect(), rt = T.getBoundingClientRect(); const cx = rb.left + rb.width / 2, cy = rb.top + rb.height / 2; const vis = rb.bottom > 0 && rb.top < innerHeight;
      const inter = Math.max(0, Math.min(rb.right, rt.right) - Math.max(rb.left, rt.left)) * Math.max(0, Math.min(rb.bottom, rt.bottom) - Math.max(rb.top, rt.top));
      return { vis, on: T.classList.contains('on'), centreSousBulle: cx >= rt.left && cx <= rt.right && cy >= rt.top && cy <= rt.bottom, inter: Math.round(inter), bouton: [rb.left, rb.top, rb.width, rb.height].map(Math.round), bulle: [rt.left, rt.top, rt.width, rt.height].map(Math.round) }; });
    v(`${pos} : bulle visible`, m.on, m);
    v(`${pos} : le centre du bouton Terminer n'est pas sous la bulle`, !m.vis || !m.centreSousBulle, m);
    v(`${pos} : la bulle ne mord pas plus d'un quart du bouton`, !m.vis || m.inter <= m.bouton[2] * m.bouton[3] / 4, m);
    await L.capture(c, I.CAP + `tour7-recouvrement-${pos}-${profil}${nuit ? '-nuit' : ''}.png`);
  }
  const er = I.erreurs(c); v('aucune erreur de page', er.length === 0, er);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
