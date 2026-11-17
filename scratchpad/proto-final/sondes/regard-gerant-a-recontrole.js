// RECONTRÔLE du regard gérant A — la mesure du SECOND regard (17 novembre 2026). Elle ne reprend pas les contrôles du premier agent
// (regard-gerant-a.js, que l'on rejoue à part) : elle balaie TOUS les écrans de ses sept rubriques, sur les six profils, jour et nuit,
// pour une famille de défauts qu'il n'a mesurée que sur le Planning — le texte qui sort de sa pastille — et pour ce que ses
// corrections peuvent avoir abîmé à côté (débordement de page, texte coupé sans signe, rangée dont un élément sort de la boîte).
//   node regard-gerant-a-recontrole.js <profil> [nuit]            ex. : node regard-gerant-a-recontrole.js android nuit
// Chaque contrôle compte sa POPULATION avant de conclure (un zéro sur un ensemble vide ne prouve rien) ; sortie 1 si un contrôle tombe.
const L = require('../lib.js');
const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit');
let ok = 0, ko = 0; const echecs = [];
const v = (m, c, d) => { if (c) ok++; else { ko++; echecs.push(m + (d ? ' — ' + d : '')); console.log('  ✗ ' + m + (d ? ' — ' + d : '')); } };

// pour chaque bouton, pastille, champ, étiquette : le texte tient-il DANS la boîte qui le porte ? (le défaut n° 1 du premier regard, généralisé)
const textesQuiSortent = () => { const sorts = [], n = { boites: 0 };
  const vis = e => { const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none' && (e.offsetParent || cs.position === 'fixed'); };
  const ZONE = document.querySelector('#contenu') || document.body;
  for (const e of ZONE.querySelectorAll('button, a, select, label, summary, .btn, .chip, .pastille, [data-go], [role=button], span.st, b')) {
    if (!vis(e)) continue; const r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8) continue;
    const cs = getComputedStyle(e); if (/^(inline)$/.test(cs.display) && e.tagName !== 'A') continue;     // une étiquette « inline » n'a pas de boîte propre
    if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;                                  // un conteneur qui défile sort exprès
    n.boites++;
    const g = document.createRange(); g.selectNodeContents(e); const rs = [...g.getClientRects()].filter(x => x.width > 0.5 && x.height > 0.5); if (!rs.length) continue;
    const gauche = Math.min(...rs.map(x => x.left)), droite = Math.max(...rs.map(x => x.right));
    const txt = (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40);
    // un enfant qui défile ou est coupé exprès (ellipse) ne compte pas : on ne juge que ce qui est peint HORS de la boîte
    if (cs.overflowX === 'hidden' && e.scrollWidth <= e.clientWidth + 1) continue;
    if (droite > r.right + 1 || gauche < r.left - 1) sorts.push(e.tagName + '.' + String(e.className).slice(0, 30) + ' « ' + txt + ' » texte ' + Math.round(gauche) + '→' + Math.round(droite) + ' dans ' + Math.round(r.left) + '→' + Math.round(r.right)); }
  return { n: n.boites, sorts: sorts.slice(0, 12) }; };

// ce qui est coupé (overflow caché) SANS ellipse ni signe, hors défilement voulu
const coupes = () => { const res = [], n = { v: 0 };
  const ZONE = document.querySelector('#contenu') || document.body;
  for (const e of ZONE.querySelectorAll('*')) { const cs = getComputedStyle(e); if (!e.offsetParent && cs.position !== 'fixed') continue; if (!/hidden|clip/.test(cs.overflowX)) continue; if (e.children.length === 0 && !(e.textContent || '').trim()) continue;
    n.v++; if (e.scrollWidth > e.clientWidth + 2 && cs.textOverflow !== 'ellipsis' && !/auto|scroll/.test(cs.overflowX)) res.push(e.tagName + '.' + String(e.className).slice(0, 30) + ' « ' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) + ' » ' + e.scrollWidth + ' > ' + e.clientWidth); }
  return { n: n.v, res: res.slice(0, 10) }; };

(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const clic = async (sel, att) => { const ok2 = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return ok2; };
  const ecrans = [
    ['accueil', async () => { await L.aller(p, 'accueil'); }],
    ['stats-mois', async () => { await L.aller(p, 'statistiques'); await clic('[data-stper=mois]'); }],
    ['stats-annee', async () => { await L.aller(p, 'statistiques'); await clic('[data-stper=annee]'); }],
    ['stats-detail-fac', async () => { await L.aller(p, 'statistiques'); await clic('[data-stdet=fac]', 700); }],
    ['histo', async () => { await L.aller(p, 'historique'); }],
    ['plan-jour', async () => { await L.aller(p, 'planning'); await clic('[data-plvue=jour]', 600); }],
    ['plan-semaine', async () => { await L.aller(p, 'planning'); await clic('[data-plvue=semaine]', 700); }],
    ['plan-mois', async () => { await L.aller(p, 'planning'); await clic('[data-plvue=mois]', 700); }],
    ['plan-general', async () => { await L.aller(p, 'planning'); await clic('[data-plvue=general]', 700); }],
    ['plan-surmesure', async () => { await L.aller(p, 'planning'); await clic('[data-plvue=multi]', 700); }],
    ['plan-carte', async () => { await L.aller(p, 'planning'); await clic('[data-plvue=carte]', 1500); }],
    ['plan-creer', async () => { await L.aller(p, 'planning'); await clic('[data-creer]', 700); }],
    ['inter-auj', async () => { await L.aller(p, 'interventions'); await clic('[data-filtreint=auj]'); }],
    ['inter-avenir', async () => { await L.aller(p, 'interventions'); await clic('[data-filtreint=avenir]'); }],
    ['inter-aplanifier', async () => { await L.aller(p, 'interventions'); await clic('[data-filtreint=plan]'); }],
    ['inter-terminees', async () => { await L.aller(p, 'interventions'); await clic('[data-filtreint=fait]'); }],
    ['inter-toutes', async () => { await L.aller(p, 'interventions'); await clic('[data-filtreint=tout]'); }],
    ['inter-fiche-i1', async () => { await L.aller(p, 'inter-x-i1'); }],
    ['inter-fiche-i5', async () => { await L.aller(p, 'inter-x-i5'); }],
    ['inter-fiche-i6', async () => { await L.aller(p, 'inter-x-i6'); }],
    ['inter-creer', async () => { await L.aller(p, 'interventions'); await clic('[data-creer]', 700); }],
    ['taches-auj', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); }],
    ['taches-avenir', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=avenir]'); }],
    ['taches-faites', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=faites]'); }],
    ['taches-nouvelle', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); await clic('[data-tnouv]', 700); }],
    ['taches-suggestions', async () => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); await clic('[data-tsuggs]', 700); }],
    ['abs-valider', async () => { await L.aller(p, 'absences'); await clic('[data-aonglet=valider]', 600); }],
    ['abs-calendrier', async () => { await L.aller(p, 'absences'); await clic('[data-aonglet=calendrier]', 600); }],
    ['abs-soldes', async () => { await L.aller(p, 'absences'); await clic('[data-aonglet=soldes]', 600); }],
    ['abs-nouvelle', async () => { await L.aller(p, 'absences'); await clic('[data-anouv]', 700); }],
    ['abs-proposer', async () => { await L.aller(p, 'absences'); await clic('[data-aonglet=valider]'); await clic('[data-amodif=d3]', 700); }],
  ];
  let pop = 0, popCoupes = 0; const vus = [];
  for (const [nom, geste] of ecrans) {
    try { await L.ranger(p); await geste(); } catch (e) { v(nom + ' : l\'écran s\'ouvre', false, String(e.message).slice(0, 80)); continue; }
    // en fenêtre ouverte (panneau), on mesure dans le panneau ; sinon dans la page
    const dans = await p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); return !!(pan && getComputedStyle(pan).display !== 'none' && pan.offsetParent !== null); });
    const sel = dans ? '#calque .panneau' : '#contenu';
    const t = await p.evaluate(`(${textesQuiSortent.toString().replace("document.querySelector('#contenu') || document.body", `document.querySelector('${sel}') || document.body`)})()`);
    pop += t.n; vus.push(nom);
    v(`${nom} : aucun texte ne sort de sa pastille (${t.n} boîtes)`, t.sorts.length === 0, t.sorts.join(' ; '));
    const k = await p.evaluate(`(${coupes.toString().replace("document.querySelector('#contenu') || document.body", `document.querySelector('${sel}') || document.body`)})()`);
    popCoupes += k.n;
    v(`${nom} : aucun texte coupé sans ellipse (${k.n} zones qui coupent)`, k.res.length === 0, k.res.join(' ; '));
    if (!dans) { const d = await L.deborde(c); v(`${nom} : la page ne glisse pas de côté`, !d.bouge, d.coupable || ('scrollWidth ' + d.seconde + ' pour ' + d.largeur)); }
    if (c.doigt) { const g = await L.doigts(p, sel); v(`${nom} : aucun texte écrasé (< 12 signes par ligne sur 4 lignes ou plus)`, g.ecrases.length === 0, g.ecrases.join(' ; ')); v(`${nom} : aucun champ sous 16 px`, g.champs.length === 0, g.champs.join(' ; ')); }
  }
  v('population : tous les écrans se sont ouverts', vus.length === ecrans.length, vus.length + ' sur ' + ecrans.length);
  v('population : des boîtes ont été mesurées (un zéro ne prouve rien)', pop > 400, String(pop));
  v('aucune erreur JavaScript pendant le balayage', c.err.length === 0, c.err.slice(0, 3).join(' | '));
  console.log(`\n[${profil}-${nuit ? 'nuit' : 'jour'}] ${vus.length} écrans · ${pop} boîtes · ${popCoupes} zones qui coupent`);
  console.log(`== ${ok} ✓ · ${ko} ✗`);
  await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
