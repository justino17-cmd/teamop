// Campagne « métiers » : le groupe « Hygiène anti-nuisibles (3D) » paraît-il, et seulement, quand le pack 3D est pris — chez le gérant,
// le bureau et la technicienne, à l'ordinateur et au téléphone, et se retire-t-il tout seul quand le métier change ?
// Rejouable : « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const notes = [];
const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const G3 = 'Hygiène anti-nuisibles (3D)', TROIS = ['Registre sanitaire', 'Carte des box', 'Devis xylophage'];
// ce que la personne voit VRAIMENT dans son menu (le DOM), pas la table qui le nourrit
const menuDom = p => p.evaluate(() => { const m = document.getElementById('menu'); if (!m) return null; const r = m.getBoundingClientRect(), vis = r.width > 0 && getComputedStyle(m).display !== 'none';
  return { vis, texte: m.innerText.replace(/\s+/g, ' ').trim(), go: [...m.querySelectorAll('[data-go]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()) }; });
// la feuille « Menu » du téléphone, ouverte par SON bouton
const feuille = async c => { const ok1 = await L.toucher(c, '[data-menu="ouvrir"]'); await L.calme(c.p, 400);
  return { ok1, txt: await c.p.evaluate(() => { const q = document.querySelector('#calque .panneau') || document.querySelector('.feuille-menu,.fm'); return q ? q.innerText.replace(/\s+/g, ' ').trim() : ''; }) }; };
(async () => {
  // ── 1. gérant, ordinateur : avec et sans 3D, et le changement en direct ──
  let c = await O.ouvrir({ qui: 'marc', packs: O.METIERS.clim });
  let m = await O.menu(c.p);
  v('gérant sans 3D : aucun groupe 3D dans la table du menu', !m.some(([g]) => g === G3));
  let d = await menuDom(c.p); v('gérant sans 3D : le menu (DOM) ne dit ni « Hygiène » ni « Registre sanitaire »', d && d.vis && !/Hygi|Registre sanitaire|Carte des box|xylophage/i.test(d.texte), d && d.texte.slice(0, 200));
  v('gérant sans 3D : la population du menu est là (plus de 15 lignes)', d && d.go.length > 15, d && d.go.length);
  await O.poser(c.p, O.METIERS.d3); m = await O.menu(c.p); d = await menuDom(c.p);
  v('gérant avec 3D : le groupe a ses 3 lignes dans CATS', JSON.stringify((m.find(([g]) => g === G3) || [0, []])[1].map(x => x.split(':')[1])) === JSON.stringify(TROIS));
  v('gérant avec 3D : le menu (DOM) porte le titre du groupe', d && /Hygiène anti-nuisibles \(3D\)/.test(d.texte), d && d.texte.slice(-200));
  v('gérant avec 3D : le menu (DOM) porte les 3 lignes', TROIS.every(t => d && d.go.some(x => x.includes(t))), d && JSON.stringify(d.go.slice(-5)));
  // chaque ligne emmène au bon écran
  for (const [k, t] of [['registre', 'Registre sanitaire'], ['carteBox', 'Carte des box'], ['devisXylo', 'Devis xylophage']]) {
    const ok2 = await L.toucher(c, `#menu [data-go="${k}"]`); const e = await O.lire(c.p);
    v(`gérant : la ligne « ${t} » mène à l'écran « ${t} »`, ok2 && new RegExp(t, 'i').test(e.h1), 'h1=' + e.h1 + ' route=' + e.route); }
  // on est sur un écran 3D, le métier change : retour à l'accueil, avec un mot
  await O.poser(c.p, O.METIERS.clim); let e = await O.lire(c.p);
  v('métier retiré pendant qu\'on est sur le devis xylophage : retour à l\'accueil', e.route === 'accueil', 'route=' + e.route);
  const toast = await c.p.evaluate(() => { const t = document.getElementById('toast'); return t ? t.textContent : ''; });
  v('métier retiré : un mot dit pourquoi (toast), sans « 3D » incompréhensible', /métier 3D|hygiène anti-nuisibles/i.test(toast) && toast.length < 200, toast);
  notes.push('Le toast de retrait dit : « ' + toast + ' »');
  // adresse tapée à la main
  for (const k of ['registre', 'carteBox', 'devisXylo']) { await c.p.evaluate(h => { location.hash = h; }, k); await L.calme(c.p, 500); e = await O.lire(c.p);
    v(`adresse #${k} tapée sans pack 3D : on n'ouvre pas l'écran 3D`, e.route !== k && !/Registre sanitaire|Carte des box|Devis xylophage/.test(e.h1), 'route=' + e.route + ' h1=' + e.h1); }
  v('aucune erreur de page (gérant)', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c);

  // ── 2. technicienne ──
  for (const [packs, avec] of [[O.METIERS.clim, false], [O.METIERS.d3, true], [O.METIERS.d3clim, true]]) {
    c = await O.ouvrir({ qui: 'sm', packs }); d = await menuDom(c.p);
    v(`technicienne (${packs}) : Registre sanitaire ${avec ? 'présent' : 'absent'} du menu`, d && d.vis && (/Registre sanitaire/.test(d.texte) === avec), d && d.texte.slice(0, 300));
    v(`technicienne (${packs}) : ${avec ? 'le groupe est titré' : 'aucun titre « Hygiène »'}`, d && (/Hygiène anti-nuisibles/.test(d.texte) === avec));
    if (avec) { const ok3 = await L.toucher(c, '#menu [data-go="registre"]'); e = await O.lire(c.p); v('technicienne : Registre sanitaire s\'ouvre', ok3 && /Registre sanitaire/.test(e.h1), e.h1); }
    v(`technicienne (${packs}) : pas de Carte des box ni de Devis xylophage dans son menu`, d && !/Carte des box|Devis xylophage/.test(d.texte));
    v('technicienne : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); }

  // ── 3. bureau (Julie) ──
  for (const [packs, avec] of [[O.METIERS.clim, false], [O.METIERS.d3, true]]) {
    c = await O.ouvrir({ qui: 'julie', packs }); d = await menuDom(c.p);
    v(`bureau (${packs}) : groupe 3D ${avec ? 'présent' : 'absent'}`, d && d.vis && (/Hygiène anti-nuisibles/.test(d.texte) === avec), d && d.texte.slice(0, 400));
    if (avec) notes.push('Bureau avec 3D voit : ' + TROIS.filter(t => d.texte.includes(t)).join(' · '));
    await L.fin(c); }

  // ── 4. téléphone : la feuille « Menu » du gérant et de la technicienne ──
  for (const [qui, packs, avec] of [['marc', O.METIERS.clim, false], ['marc', O.METIERS.d3, true], ['sm', O.METIERS.d3, true], ['sm', O.METIERS.clim, false]]) {
    c = await O.ouvrir({ profil: 'iphone', qui, packs }); const f = await feuille(c);
    v(`iPhone ${qui} (${packs}) : la feuille Menu s'ouvre`, f.ok1 && f.txt.length > 50, f.txt.slice(0, 100));
    v(`iPhone ${qui} (${packs}) : la feuille ${avec ? 'porte' : 'ne porte pas'} le groupe 3D`, (/Hygiène anti-nuisibles/.test(f.txt) === avec), f.txt.slice(0, 500));
    await L.fin(c); }
  await L.fermer();
  process.exit(O.bilan('metier-3d-menu', ok, ko, notes));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
