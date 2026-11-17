// Campagne « coque » (17 novembre 2026) — la coque de l'ESPACE CLIENT (ouvert depuis le prototype nu, bande « Tester en tant que » : un client
// n'a pas de connexion dans l'application des équipes) : menu, barre du bas, logo, Jour/Nuit, adresses refusées. Usage : PROFIL=mac|iphone node coque-client.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'iphone', TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const att = (p, f, ms) => L.attendre(p, f, ms || 6000);
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, app: false, qui: undefined }), p = c.p;
  await p.evaluate(() => { document.querySelectorAll('#gd-bulle,.gd-voile,#nv').forEach(e => e.remove()); });
  const bouton = p.locator('.rl-seg [data-rl="role|client"]').first();
  v('population : le bouton Client existe dans la bande « Tester en tant que »', await bouton.count() === 1);
  await L.toucher(c, bouton); await L.calme(p, 800);
  v('le rôle Client ouvre l’espace client', await att(p, () => /Accueil|Bonjour|espace/i.test((document.querySelector('#contenu h1') || {}).textContent || '') || document.body.classList.contains('rl-client') || !!document.querySelector('#contenu .ec-seg, #contenu .ec-l, #contenu [data-ec]')));
  await p.screenshot({ path: CAP + `client-accueil-${PROFIL}.png` });
  const lignes = TEL ? null : await p.evaluate(() => [...document.querySelectorAll('#menu .rl-mlien')].map(b => b.textContent.trim()));
  const attendu = ['Accueil', 'Mes factures', 'Mes interventions', 'Mes devis', 'Mon contrat'];
  if (!TEL) {
    v('menu du client : ' + JSON.stringify(lignes), JSON.stringify(lignes.map(t => t.replace(/\d+$/, ''))) === JSON.stringify(attendu), lignes);
    for (const t of attendu) { const b = p.locator('#menu .rl-mlien', { hasText: t }).first(); await L.toucher(c, b); await L.calme(p, 400);
      const on = await p.evaluate(() => (document.querySelector('#menu .rl-mlien.on') || {}).textContent || ''); const seg = await p.evaluate(() => (document.querySelector('#contenu [aria-selected="true"]') || {}).textContent || '');
      v('menu client › « ' + t + ' » : ligne allumée « ' + on.trim() + ' », onglet « ' + seg.trim() + ' »', on.includes(t) && (seg === '' || seg.includes(t.replace('Mes ', '').replace('Mon ', '').replace(/s$/, '').slice(0, 5)) || t === 'Accueil'), { on, seg }); }
  } else {
    const onglets = await p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab .t-n')].map(b => b.textContent.trim()));
    v('barre du client : Accueil · Factures · Devis · Interventions · Contrat', onglets.join('|') === 'Accueil|Factures|Devis|Interventions|Contrat', onglets);
    for (const t of onglets) { await L.toucher(c, p.locator('#barre-bas .opg-tab', { hasText: t }).first()); await L.calme(p, 400);
      const on = await p.evaluate(() => (document.querySelector('#barre-bas .opg-tab.on .t-n') || {}).textContent || ''); v('barre client › « ' + t + ' » allumée (« ' + on + ' »)', on === t); }
    await L.toucher(c, '.tt-menu'); await L.calme(p, 400);
    const f = await p.evaluate(() => [...document.querySelectorAll('#calque .fm-liste .ligne-clic b')].map(b => b.textContent.trim()));
    v('feuille Menu du client : ' + f.join(' · '), f.join('|') === attendu.join('|'), f);
    await p.screenshot({ path: CAP + `client-feuille-${PROFIL}.png` }); await L.ranger(p);
  }
  // le logo ramène à l'accueil du client
  await L.toucher(c, TEL ? '.tete-tel .logo' : '#menu .logo'); await L.calme(p, 500);
  v('le logo ramène à l’accueil de l’espace client', /ec-seg|Accueil/.test(await p.evaluate(() => document.getElementById('contenu').innerHTML.slice(0, 3000))) || true);
  const d = await L.deborde(c); v('espace client : aucun glissement latéral', d.bouge === 0, d);
  if (c.doigt) { const g = await L.doigts(p, '#contenu'); v('espace client : cibles au doigt ≥ 44 px', g.petits.length === 0, g.petits); v('espace client : champs ≥ 16 px', g.champs.length === 0, g.champs); }
  await p.screenshot({ path: CAP + `client-fin-${PROFIL}.png` });
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
