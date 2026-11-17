// Campagne « coque » (17 novembre 2026) — les BOUTONS de création rapide : « ＋ Nouvelle intervention » (Accueil), « Devis rapide » (Devis),
// « ＋ Nouveau client » (Clients), « ＋ Nouvelle tâche » (Tâches) : chacun s'ouvre, dit ce qu'il fait, se ferme (✕, Annuler, Échap) sans rien laisser.
// Puis le LIBELLÉ de chaque bouton « ＋ » de chaque rubrique : la règle de MENU-FINAL (« ＋ Nouveau… » / « ＋ Nouvelle… », une seule règle).
// Usage : PROFIL=mac|iphone QUI=marc|sm node coque-creation.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc';
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const fen = p => p.evaluate(() => { const f = document.getElementById('fenetre'); return f && f.innerText ? f.innerText.replace(/\s+/g, ' ').trim().slice(0, 80) : ''; });
const pan = p => p.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim().slice(0, 80) : ''; });
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI }), p = c.p;
  if (QUI === 'marc') {
    const cas = [
      ['accueil', '#contenu button, #contenu a', /Nouvelle intervention/, 'Nouvelle intervention', async () => fen(p)],
      ['devis', '#contenu button, #contenu a', /Devis rapide/, 'Devis', async () => (await pan(p)) + (await fen(p))],
      ['clients', '#contenu button, #contenu a', /Nouveau client/, 'client', async () => (await pan(p)) + (await fen(p))],
      ['taches', '#contenu button, #contenu a', /Nouvelle tâche|Détails/, 'tâche', async () => (await pan(p)) + (await p.evaluate(() => (document.activeElement || {}).placeholder || ''))],
    ];
    for (const [route, sel, motif, mot, lire] of cas) {
      await L.aller(p, route); await L.calme(p, 600);
      const b = p.locator(sel).filter({ hasText: motif }).first();
      v(`${route} : le bouton « ${motif.source} » est présent`, await b.count() > 0);
      if (!await b.count()) continue;
      const ok = await L.toucher(c, b); await L.calme(p, 800);
      const t = await lire(); v(`${route} : le bouton ouvre le bon geste (« ${t.slice(0, 50)} »)`, ok && new RegExp(mot, 'i').test(t), t);
      await p.screenshot({ path: CAP + `creation-bouton-${route}-${PROFIL}.png` });
      // fermer par Échap, puis rouvrir et fermer par la croix / Annuler
      await p.keyboard.press('Escape'); await L.calme(p, 500);
      const reste = (await fen(p)) + (await pan(p));
      v(`${route} : Échap ferme le geste ouvert (reste « ${reste.slice(0, 40)} »)`, reste === '', reste);
      await p.evaluate(() => { try { if (CREA) fermerCreation(); } catch (e) { } try { fermerPanneau(); } catch (e) { } });
    }
    // une création annulée ne laisse aucune trace : le nombre d'interventions est inchangé
    const n0 = await p.evaluate(() => INTS.length); await L.aller(p, 'accueil');
    await L.toucher(c, p.locator('#contenu button, #contenu a').filter({ hasText: /Nouvelle intervention/ }).first()); await L.calme(p, 700);
    const croix = p.locator('#fenetre [aria-label*="Fermer"], #fenetre .x, #fenetre button:has-text("✕"), #fenetre button:has-text("Annuler")').first();
    if (await croix.count()) { await L.toucher(c, croix); await L.calme(p, 500); }
    v('une intervention commencée puis annulée ne laisse rien (INTS ' + n0 + ' → ' + await p.evaluate(() => INTS.length) + ', fenêtre fermée)', (await p.evaluate(() => INTS.length)) === n0 && !(await fen(p)), { fen: await fen(p) });
  }
  // lint des libellés « ＋ » de toutes les rubriques du rôle
  const routes = await p.evaluate(() => rlLignes().filter(l => !l.ec).map(l => l.k));
  const hors = [], vus = new Set();
  for (const r of routes) {
    await p.evaluate(h => { location.hash = h; }, r); await L.calme(p, 700);
    if (await p.evaluate(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0; })) { await p.evaluate(() => document.querySelector('[data-cpsys="retour"]')?.click()); await L.calme(p, 500); }
    const L1 = await p.evaluate(() => [...document.querySelectorAll('#contenu button, #contenu a')].filter(e => e.offsetParent !== null).map(e => (e.getAttribute('aria-label') || e.textContent).replace(/\s+/g, ' ').trim()).filter(t => /^[＋+]/.test(t)));
    for (const t of L1) { const k = r + '|' + t; if (vus.has(k)) continue; vus.add(k); if (!/^[＋+] ?Nouvel(le)? /.test(t)) hors.push(r + ' : « ' + t + ' »'); }
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) { } });
  }
  console.log('  · boutons « ＋ » recensés :', vus.size, ' · hors règle :', hors.length);
  v('[coque-09] chaque bouton « ＋ » dit « ＋ Nouveau… » / « ＋ Nouvelle… » (règle du menu final) — ' + hors.join(' ; '), hors.length === 0, hors);
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
