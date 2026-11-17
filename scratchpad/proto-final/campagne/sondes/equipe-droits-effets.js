// « Qui peut quoi » : l'EFFET RÉEL de chaque case de droit, mesuré dans l'application ouverte COMME la personne.
// Méthode de testeur : on part de la personne qui a TOUT (sauf administrateur), on retire UNE case par la fiche (vraie case cochée à la souris)
// puis on ouvre l'application comme elle (vrai bouton « Ouvrir l'application comme … ») et on compare ce qu'elle voit et ce qu'elle peut toucher
// à ce que voit la même personne avec la case. Population comptée : cases jouées, routes comparées, gestes (boutons) qui disparaissent par case.
// ⛔ 127.0.0.1 seulement, entreprise fictive. Rejouable seule : « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const E = require('./equipe-outils.js'); const { L, v } = E;
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
const PROFIL = process.argv[2] || 'mac';
// routes de chaque catégorie (la table du fichier, relue ICI à la main : on ne la lit pas dans la page pour ne pas garder la page par elle-même)
const ROUTES = { planif:['planning', 'absences'], inter:['interventions', 'registre'], crm:['clients'], ventes:['devis', 'contrats', 'comptabilite'], compta:['comptabilite'],
  stock:['stock', 'produits', 'boxes'], temps:['pointage', 'vehicules'], com:['boiteMail'], achats:['achats'], admin:['equipe', 'entreprise'] };
const SPS = ['atelier', 'valstock', 'commander', 'corrpt', 'comptes', 'securite'];   // les droits à part que la fiche affiche (ceux qui agissent)
const SORTIE = process.argv[3] || '';
(async () => {
  const bilan = { cases:0, routes:0, disparus:{} };
  const c = await L.ouvrir({ profil:PROFIL, qui:'marc' });
  // 1. on fabrique « Rémi », une personne de bureau avec toutes les cases, par la VRAIE invitation puis les cases cochées dans sa fiche
  await L.aller(c.p, 'equipe');
  await L.toucher(c, '[data-eq="inviter"]');
  await c.p.fill('#eq-p', 'Rémi'); await c.p.fill('#eq-n', 'Poulain'); await c.p.fill('#eq-m', 'remi@climservices17.fr');
  await c.p.evaluate(() => { const s = document.getElementById('eq-terrain'); if (s && s.checked) s.click(); });
  const o0 = await E.obs(c.p);
  await L.toucher(c, '[data-eq="inviterok"]');
  const o1 = await E.obs(c.p);
  v('inviter Rémi Poulain par le formulaire : la personne paraît dans l\'équipe', await c.p.evaluate(() => !!EQUIPE.find(p => p.prenom === 'Rémi')), { o1: o1.toast });
  const k = await c.p.evaluate(() => EQUIPE.find(p => p.prenom === 'Rémi').k);
  // 2. on lui applique le profil Responsable puis on coche TOUT ce qui reste, case par case, par la fiche
  await E.fiche(c, k);
  await c.p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; });
  const nCases = await c.p.evaluate(() => document.querySelectorAll('#calque .eq-droits input[data-eqd]').length);
  v('la grille détaillée montre des cases (population)', nCases >= 30, nCases);
  await c.p.evaluate(({ k }) => { for (const cat of ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin']) eqDe(k).droits.cats[cat] = { v:1, c:1, m:1, s:1 }; ['tout', 'prix', 'atelier', 'valstock', 'commander', 'corrpt', 'comptes', 'securite'].forEach(s => { eqDe(k).droits.sp[s] = 1; }); eqDe(k).droits.profil = 'resp*'; }, { k });
  // 3. pour chaque catégorie × verbe : décocher la case DANS LA FICHE, ouvrir comme Rémi, relever les gestes de chaque route de la catégorie, revenir
  const relever = async () => c.p.evaluate(async ([routes]) => { const R = {}; for (const r of routes) { try { aller(r); } catch (e) { R[r] = null; continue; } await new Promise(z => setTimeout(z, 550)); const ok = (location.hash || '').replace('#', '').split('/')[0] === r; const q = document.querySelector('#contenu'); const lib = e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      R[r] = { ouvert:ok, boutons:q && ok ? [...q.querySelectorAll('button, a.btn, [role=button]')].filter(e => e.offsetParent !== null && !e.disabled).map(e => (e.dataset ? Object.entries(e.dataset).map(([a, b]) => a + '=' + String(b).split('|')[0]).join(',') : '') + ':' + lib(e)) : [] }; } return R; }, [Array.from(new Set(Object.values(ROUTES).flat().concat(['securite', 'accueil', 'statistiques', 'historique'])))]);
  const comme = async (id) => { await L.aller(c.p, 'equipe'); await c.p.evaluate(({ id }) => { fermerPanneau(); }, { id }); const ok = await c.p.evaluate(({ id }) => { try { return secuVoirComme(id); } catch (e) { return 'ERR ' + e.message; } }, { id }); await L.calme(c.p, 900); return ok; };
  const revenir = async () => { await c.p.evaluate(() => { try { secuRevenir(); } catch (e) {} }); await L.calme(c.p, 700); };
  const base = await (async () => { await comme(k); const r = await relever(); await revenir(); return r; })();
  const nBase = Object.values(base).reduce((a, o) => a + (o && o.boutons ? o.boutons.length : 0), 0);
  v('personne complète : elle voit les routes de toutes les catégories (population)', Object.values(base).filter(o => o && o.ouvert).length >= 14 && nBase >= 80, { ouvertes:Object.values(base).filter(o => o && o.ouvert).length, boutons:nBase });
  for (const cat of CATS) for (const x of ['v', 'c', 'm', 's']) {
    // on décoche par la VRAIE case de la fiche quand elle existe (sinon la case n'est pas affichée : règle « ce qu'on ne peut pas prouver ne s'affiche pas »)
    await E.fiche(c, k); await c.p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; });
    const sel = `#calque .eq-droits input[data-eqd="${k}|${cat}|${x}"]`;
    const presente = await c.p.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel);
    if (!presente) { bilan.disparus[cat + '.' + x] = 'case non affichée'; continue; }
    const avant = await c.p.evaluate(({ k, cat, x }) => !!eqDe(k).droits.cats[cat][x], { k, cat, x });
    await L.toucher(c, sel); const apres = await c.p.evaluate(({ k, cat, x }) => !!eqDe(k).droits.cats[cat][x], { k, cat, x });
    bilan.cases++; v(`case ${cat}.${x} : un toucher décoche (la donnée change) — ${avant} → ${apres}`, avant === true && apres === false, { avant, apres });
    await E.ranger(c);
    await comme(k); const sans = await relever(); await revenir();
    const ferme = [], perdus = [];
    for (const r of Object.keys(base)) { const b = base[r], s = sans[r]; if (!b || !b.ouvert) continue; bilan.routes++; if (!s || !s.ouvert) { ferme.push(r); continue; } const pb = new Set(s.boutons); b.boutons.forEach(o => { if (!pb.has(o)) perdus.push(r + ' » ' + o); }); }
    bilan.disparus[cat + '.' + x] = { fermees:ferme, boutonsPerdus:perdus.length, exemples:perdus.slice(0, 6) };
    if (x === 'v') v(`case ${cat}.v décochée : au moins une route de la catégorie se ferme`, ferme.length >= 1, { ferme });
    else { const PAR_CONCEPTION = { 'stock.s':['boxes'], 'temps.s':['pointage'] };   // ROUTE_DROIT : « Dépôts et camions » et les heures de toute l'équipe demandent « Supprimer » en plus (décidé, spec § 2.6)
      const att = PAR_CONCEPTION[cat + '.' + x] || []; v(`case ${cat}.${x} décochée : ne ferme que ce que la conception lui donne (${att.join(', ') || 'rien : seul « Voir » ferme'})`, JSON.stringify(ferme.slice().sort()) === JSON.stringify(att.slice().sort()), { ferme, att }); }
    // on la recoche à la souris
    await E.fiche(c, k); await c.p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; }); await L.toucher(c, sel);
    const re = await c.p.evaluate(({ k, cat, x }) => !!eqDe(k).droits.cats[cat][x], { k, cat, x }); v(`case ${cat}.${x} : recochée, la donnée revient`, re === true, re);
    // « Voir » décoché retire aussi Créer/Modifier/Supprimer d'effet : le recocher ne rend pas ceux qu'on avait coupés avant — on rétablit la ligne entière
    await c.p.evaluate(({ k, cat }) => { eqDe(k).droits.cats[cat] = { v:1, c:1, m:1, s:1 }; }, { k, cat });
  }
  // 4. les droits À PART : une case de la fiche (« Se servir à l'atelier… », « Valider… », « Envoyer des commandes… », « Corriger les pointages », « Créer des comptes », « Gérer la sécurité »)
  await E.fiche(c, k); const sps = await c.p.evaluate(() => [...document.querySelectorAll('#calque input[data-eqs]')].map(e => e.dataset.eqs.split('|')[1]));
  v('la fiche affiche les droits à part qui agissent (au moins 6)', sps.length >= 6, sps);
  for (const sp of SPS) {
    await E.fiche(c, k); const sel = `#calque input[data-eqs="${k}|${sp}"]`; const presente = await c.p.evaluate(s => !!document.querySelector(s), sel); if (!presente) { bilan.disparus['sp.' + sp] = 'case non affichée'; v(`droit à part ${sp} : affiché dans la fiche`, false, 'absent'); continue; }
    const av = await c.p.evaluate(({ k, sp }) => !!eqDe(k).droits.sp[sp], { k, sp }); await L.toucher(c, sel); const ap = await c.p.evaluate(({ k, sp }) => !!eqDe(k).droits.sp[sp], { k, sp });
    bilan.cases++; v(`droit à part ${sp} : un toucher le décoche (${av} → ${ap})`, av === true && ap === false, { av, ap }); await E.ranger(c);
    await comme(k); const sans = await relever(); await revenir(); const ferme = [], perdus = [];
    for (const r of Object.keys(base)) { const b = base[r], q = sans[r]; if (!b || !b.ouvert) continue; bilan.routes++; if (!q || !q.ouvert) { ferme.push(r); continue; } const pb = new Set(q.boutons); b.boutons.forEach(o => { if (!pb.has(o)) perdus.push(r + ' » ' + o); }); }
    bilan.disparus['sp.' + sp] = { fermees:ferme, boutonsPerdus:perdus.length, exemples:perdus.slice(0, 6) };
    if (sp === 'atelier') {   // son effet n'est pas un bouton : une sortie de stock de la personne ATTEND l'accord du gérant (MVTS_ATT) au lieu de bouger tout de suite
      const eff = async (kk) => c.p.evaluate(({ kk }) => { STK_VALID = true; const base = MVTS.find(x => x.type === 'sortie') || MVTS[0]; const m = JSON.parse(JSON.stringify(base)); m.id = 'zz' + Math.random().toString(36).slice(2, 7); m.qui = kk; m.type = 'sortie'; const att0 = MVTS_ATT.length; let r; try { r = typeof sxDepose === 'function' && !droitsAtelier(kk) ? sxDepose(m) : 'direct'; } catch (e) { r = 'ERR ' + e.message; } return { r, attente:MVTS_ATT.length - att0, droit:droitsAtelier(kk) }; }, { kk });
      await c.p.evaluate(({ k }) => { eqDe(k).droits.sp.valstock = 0; eqDe(k).droits.sp.atelier = 0; }, { k }); const sansAt = await eff(k);
      await c.p.evaluate(({ k }) => { eqDe(k).droits.sp.atelier = 1; }, { k }); const avecAt = await eff(k);
      v('droit à part atelier : décoché, une sortie de stock de la personne ATTEND l’accord du gérant ; coché, elle passe tout de suite', sansAt.droit === false && avecAt.droit === true && sansAt.attente >= avecAt.attente, { sansAt, avecAt });
      await c.p.evaluate(({ k }) => { eqDe(k).droits.sp.atelier = 1; eqDe(k).droits.sp.valstock = 1; }, { k });
    } else v(`droit à part ${sp} décoché : il se VOIT quelque part (une route se ferme ou au moins un bouton disparaît)`, ferme.length + perdus.length >= 1, bilan.disparus['sp.' + sp]);
    await c.p.evaluate(({ k, sp }) => { eqDe(k).droits.sp[sp] = 1; }, { k, sp });
  }
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  console.log(JSON.stringify(bilan.disparus, null, 1));
  v(`population : ${bilan.cases} cases jouées, ${bilan.routes} routes comparées`, bilan.cases >= 25 && bilan.routes >= 200, bilan);
  if (SORTIE) require('fs').writeFileSync(SORTIE, JSON.stringify(bilan, null, 1));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
