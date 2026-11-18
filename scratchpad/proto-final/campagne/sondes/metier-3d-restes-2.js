// Restes metier-3d, tour 2 (18/11) : les trois défauts nés du recontrôle du tour 1, joués par de VRAIS boutons, métier par métier.
//  V : Planning › Mes vues › « ＋ Enregistrer la vue actuelle » — l'exemple du champ « Son nom » ne parle de climatisation qu'à la climatisation.
//  A : fiche client › Appareils › « Ajouter un appareil » — le nom et le détail d'exemple, et le libellé du détail (« gaz » seulement clim / chauffage-clim-plomberie).
//  R : Registre sanitaire › « Saisir un passage » — camion plein : « descend de ce que tu poses » ; camion vide : « ne bouge pas », jamais les deux ; le bouton « Voir le Stock » a sa ligne.
// Usage : node metier-3d-restes-2.js V|A|R      Rend « N ✓ · M ✗ ».
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const notes = []; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const PART = process.argv[2] || 'V';
const CAP = O.CAP.replace('campagne-metier-3d', 'restes-metier-3d');
(async () => {
  const JEUX = ['clim', 'demo', 'd3', 'nett', 'plomb', 'chauf', 'd3clim'];
  if (PART === 'V' || PART === 'A') for (const jeu of JEUX) { const climSeule = ['clim', 'demo'].includes(jeu), c = await O.ouvrir({ qui: 'marc', packs: O.METIERS[jeu] }), p = c.p; p.on('dialog', d => d.dismiss().catch(() => {}));
    if (PART === 'V') {
      await L.aller(p, 'planning'); await L.calme(p, 600);
      const sm = p.locator('[data-plvue="multi"]').locator('visible=true').first(); if (await sm.count()) { await L.toucher(c, sm); await L.calme(p, 500); }   // « Mes vues » n'existe que dans la vue « Sur mesure »
      const vues = p.locator('[data-mpop="vues"]').locator('visible=true').first(); v(jeu + ' : « Mes vues » existe (population)', await vues.count() > 0); if (!(await vues.count())) { await L.fin(c); continue; }
      await L.toucher(c, vues); await L.calme(p, 400); const en = p.locator('[data-action="vueEnregistrer"]').locator('visible=true').first(); v(jeu + ' : « Enregistrer la vue actuelle » existe (population)', await en.count() > 0); if (!(await en.count())) { await L.fin(c); continue; }
      await L.toucher(c, en); await L.calme(p, 500);
      const ph = await p.evaluate(() => (document.getElementById('vue-nom') || {}).placeholder || ''); notes.push(jeu + ' → « ' + ph + ' »');
      v(jeu + ' : le champ « Son nom » porte un exemple (population)', ph.length > 4, ph);
      if (climSeule) v(jeu + ' (contre-épreuve) : la climatisation garde « équipe clim »', /clim/.test(ph), ph); else { v(jeu + ' : aucun mot de climatisation dans l\'exemple', !O.MOTS_CLIM.test(ph), ph); v(jeu + ' : l\'exemple reste un exemple de planning', /^ex\. /.test(ph) && /équipe/.test(ph), ph); }
      await L.capture(c, CAP + `vue-${jeu}.png`);
    } else {
      await L.aller(p, 'clients'); await L.calme(p, 500);
      const ouv = await p.evaluate(() => { const k = Object.keys(CLIENTS).find(x => CLIENTS[x].appareils && CLIENTS[x].appareils.length && !CLIENTS[x].archive); return k || ''; }); v(jeu + ' : un client avec appareils existe (population)', !!ouv, ouv); if (!ouv) { await L.fin(c); continue; }
      await L.aller(p, 'client-x-' + ouv); await L.calme(p, 500);
      const tab = p.locator('#contenu [data-onglet="appareils"], #contenu button:has-text("Appareils")').locator('visible=true').first(); if (await tab.count()) { await L.toucher(c, tab); await L.calme(p, 400); }
      const aj = p.locator('[data-action="clientAppForm"][data-n="-1"]').locator('visible=true').first(); v(jeu + ' : « Ajouter un appareil » existe (population)', await aj.count() > 0); if (!(await aj.count())) { await L.fin(c); continue; }
      await L.toucher(c, aj); await L.calme(p, 500);
      const m = await p.evaluate(() => ({ nom: (document.getElementById('app-nom') || {}).placeholder || '', det: (document.getElementById('app-det') || {}).placeholder || '', lib: ((document.getElementById('app-det') || {}).closest('label') || { textContent: '' }).firstChild.textContent })); notes.push(jeu + ' → « ' + m.nom + ' » / « ' + m.det + ' » / ' + m.lib);
      v(jeu + ' : les deux champs portent un exemple (population)', m.nom.length > 4 && m.det.length > 4, JSON.stringify(m));
      if (climSeule) { v(jeu + ' (contre-épreuve) : la climatisation garde son Daikin et son split', /Daikin/.test(m.nom) && /Split/.test(m.det) && /gaz/.test(m.lib), JSON.stringify(m)); }
      else { v(jeu + ' : aucun mot de climatisation dans les exemples', !O.MOTS_CLIM.test(m.nom + ' ' + m.det), JSON.stringify(m)); v(jeu + ' : le libellé du détail ne parle pas de gaz (sauf métiers du froid)', /gaz/.test(m.lib) === (jeu === 'd3clim' ? false : false), m.lib); }
      await L.capture(c, CAP + `appareil-${jeu}.png`); }
    v(jeu + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); }
  if (PART === 'R') for (const [profil, nuit, qui] of [['mac', false, 'marc'], ['iphone', true, 'marc'], ['iphone', false, 'sm']]) { const c = await O.ouvrir({ profil, nuit, qui, packs: O.METIERS.d3 }), p = c.p; p.on('dialog', d => d.dismiss().catch(() => {})); const t = `${profil}${nuit ? ' nuit' : ''} ${qui}`;
    await L.aller(p, 'registre'); await L.calme(p, 500);
    const bc = p.locator('#contenu [data-rg="cli|t1"]').first(); if (await bc.count()) { await L.toucher(c, bc); await L.calme(p, 500); }
    const bp = p.locator('#contenu [data-rg="passage"]').locator('visible=true').first(); v(t + ' : « Saisir un passage » existe (population)', await bp.count() > 0); if (!(await bp.count())) { await L.fin(c); continue; }
    await L.toucher(c, bp); await L.calme(p, 700);
    const lire = () => p.evaluate(() => { const ph = document.getElementById('rg-camion-ph'), pr = document.getElementById('rg-prods'); const lien = document.querySelector('[data-rg="stock"]'); const fr = ph && ph.getBoundingClientRect(), fl = lien && lien.getBoundingClientRect(); const nbL = ph ? Math.round(fr.height / parseFloat(getComputedStyle(ph).lineHeight)) : 0;
      return { phrase: ph ? ph.textContent.trim() : '', prods: pr ? pr.textContent.trim() : '', n: document.querySelectorAll('#rg-camion').length, lienDessous: lien ? fl.top >= fr.bottom - 1 : null, opts: [...document.querySelectorAll('#rg-appl option')].map(o => o.value), hPhrase: ph ? Math.round(fr.height) : 0, nbL }; });
    let m = await lire(); const vus = { plein: 0, vide: 0 };
    const opts = qui === 'sm' ? [null] : m.opts; v(t + ' : au moins deux applicateurs (population)', qui === 'sm' || opts.length >= 2, JSON.stringify(opts));
    for (const o of opts) { if (o) { await p.selectOption('#rg-appl', o); await L.calme(p, 300); } m = await lire(); const vide = /aucun biocide dans le camion/.test(m.prods); vus[vide ? 'vide' : 'plein']++;
      v(t + ' ' + (o || '(connecté)') + ' : une seule phrase « camion » (id unique)', m.n === 1, JSON.stringify(m.n));
      if (vide) { v(t + ' ' + (o || '') + ' (camion vide) : la phrase ne promet pas de baisse', /ne bouge pas/.test(m.phrase) && !/descend/.test(m.phrase), m.phrase); v(t + ' ' + (o || '') + ' (camion vide) : un seul mot sur la baisse du stock, pas de contradiction', !(/aucun biocide/.test(m.prods) && /descend de ce que tu poses/.test(m.phrase)), m.phrase); }
      else v(t + ' ' + (o || '') + ' (camion plein) : la phrase dit que le stock descend', /descend de ce que tu poses/.test(m.phrase) && !/ne bouge pas/.test(m.phrase), m.phrase);
      if (m.lienDessous !== null) v(t + ' ' + (o || '') + ' : « Voir le Stock » est sous la phrase, la phrase garde sa hauteur de texte (' + m.nbL + ' ligne(s), ' + m.hPhrase + ' px)', m.lienDessous && m.hPhrase < 90, JSON.stringify(m)); }
    notes.push(t + ' : ' + JSON.stringify(vus)); if (qui !== 'sm') { v(t + ' : on a vu un camion vide ET un plein (population)', vus.vide > 0 && vus.plein > 0, JSON.stringify(vus)); }
    await p.evaluate(() => { const e = document.getElementById('rg-camion-ph'); e && e.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300); await L.capture(c, CAP + `camion2-${profil}${nuit ? '-nuit' : ''}-${qui}.png`);
    v(t + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); }
  await L.fermer(); process.exit(O.bilan('metier-3d-restes-2 ' + PART, ok, ko, notes));
})().catch(async e => { console.log('ERREUR', e.stack); await L.fermer(); process.exit(2); });
