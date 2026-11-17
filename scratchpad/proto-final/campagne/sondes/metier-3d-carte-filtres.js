// Campagne « métiers » : les filtres de la Carte des box (Tout · À regarder · Rongeurs · Insectes · UV, et la liste des zones) montrent-ils les bonnes box ?
// Pour chaque filtre on touche sa pastille, puis on lit QUELLES box restent allumées sur le plan (celles qui n'ont pas la classe cb-off) et on les compare à ce
// que dit leur propre étiquette (« Box rongeurs sécurisée », « Piège à insectes rampants », « Désinsectiseur UV »). Rend « N ✓ · M ✗ ».
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const notes = []; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
(async () => {
  for (const site of ['Restaurant La Marée', 'Boulangerie Lemoine', 'Entrepôt Logistique Atlantique']) { const c = await O.ouvrir({ qui: 'marc', packs: O.METIERS.d3 }), p = c.p;
    await p.evaluate(() => aller('carteBox')); await L.calme(p, 800);
    await L.toucher(c, p.locator('#contenu button').filter({ hasText: new RegExp('^' + site) }).locator('visible=true').first()); await L.calme(p, 500);
    const lire = () => p.evaluate(() => [...document.querySelectorAll('#contenu .cb-planc [data-d3^="box|"]')].map(b => ({ id: b.dataset.d3.split('|')[1], lib: b.getAttribute('aria-label') || '', off: b.classList.contains('cb-off') })));
    const tous = await lire(); v(`${site} : le plan porte des box (population : ${tous.length})`, tous.length >= 3, tous.length);
    const ETIQ = { r: /rongeur/i, i: /insecte/i, v: /UV/i };
    for (const f of ['tout', 'regarder', 'r', 'i', 'v']) { const b = p.locator(`#contenu [data-cbx="filtre|${f}"]`).first(); await L.toucher(c, b); await L.calme(p, 500); const P = await lire(), on = P.filter(x => !x.off).map(x => x.id);
      if (ETIQ[f]) { const att = tous.filter(x => ETIQ[f].test(x.lib)).map(x => x.id);
        v(`${site} · filtre « ${f} » : montre exactement les box de ce type (${att.length} attendues)`, JSON.stringify(on) === JSON.stringify(att), `montrées ${JSON.stringify(on)} attendues ${JSON.stringify(att)}`); }
      else if (f === 'tout') v(`${site} · filtre « tout » : toutes les box (${tous.length})`, on.length === tous.length, JSON.stringify(on));
      else v(`${site} · filtre « À regarder » : au moins une box et pas plus que « Tout »`, on.length <= tous.length, JSON.stringify(on));
      if (on.length === 0) { const t = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' ')); v(`${site} · filtre « ${f} » sans résultat : l'écran dit qu'il n'y a aucune box de ce type (sinon le plan paraît cassé)`, /aucune|pas de box|aucun/i.test(t.replace(/Rongeurs|Insectes/g, '')) && /(aucune|aucun)[^.]{0,60}(box|type|UV|insecte)/i.test(t), 'rien de tel dans : ' + t.slice(0, 120)); }
      notes.push(`${site} · ${f} → ${on.join(',') || '(aucune)'}`); }
    v(`${site} : aucune erreur de page`, c.err.length === 0, c.err.join(' // ')); await L.fin(c); }
  await L.fermer(); process.exit(O.bilan('metier-3d-carte-filtres', ok, ko, notes));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
