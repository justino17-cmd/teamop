// Recontrôle adverse restes-achats tour 4 : la puce choisie est AMENÉE AU MILIEU DE SA RANGÉE (mesurée contre la rangée, pas contre la page).
// offsetLeft se compte depuis l'ancêtre positionné (la page) : il ajoute à la cible le décalage de la rangée dans la page (marge de gauche), donc la puce
// s'arrête plus à gauche que le milieu. Elle reste visible en entier — c'est pourquoi les sondes « visible » ne le voient pas —, mais elle n'est plus CENTRÉE.
// EXIGE, pour chaque lien/statut/catégorie qui amène la puce active dans une rangée qui défile : (1) la puce se voit en entier dans SA rangée ;
// (2) quand le défilement n'est borné ni à gauche ni à droite (0 < scrollLeft < max), le centre de la puce tombe à ±3 px du centre de la rangée ;
// (3) la population compte au moins une puce centrée (un zéro sur du vide ne prouve rien).
// Usage : node achats-tour4-puce-rangee.js profil [nuit]
const { L, ouvrirAchats } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit';
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const cats = await E(() => CX_CATS.map(x => x.k)), sts = await E(() => Object.keys(CX_ST));
  let pop = 0, centrees = 0, defil = 0; const mal = [], decentre = [];
  const lire = () => [...document.querySelectorAll('.cx-cats, .cx-outils .seg')].map(r => { const b = r.querySelector('[aria-pressed="true"]'); if (!b || r.scrollWidth <= r.clientWidth + 2) return null;
    const rb = b.getBoundingClientRect(), rr = r.getBoundingClientRect(), sl = r.scrollLeft, max = r.scrollWidth - r.clientWidth;
    return { puce: b.textContent.trim(), g: Math.round(rb.left - rr.left), d: Math.round(rr.right - rb.right), sl: Math.round(sl), max: Math.round(max), ecart: Math.round(((rb.left + rb.right) / 2 - (rr.left + rr.right) / 2) * 10) / 10 }; });
  const mesure = async (tag) => { await L.calme(p, 450); const rows = await E(lire); pop++;
    for (const x of rows) { if (!x) continue; defil++; if (x.g < -1 || x.d < -1) mal.push([tag, x]); else if (x.sl > 3 && x.sl < x.max - 3) { centrees++; if (Math.abs(x.ecart) > 3) decentre.push([tag, x]); } } };
  await E(() => { CX.cat = 'tous'; CX.st = 'tous'; cxAller('fachats'); });
  for (const k of cats) { await E(k => { CX.st = 'tous'; CX.cat = k; cxAller('fachats'); }, k); await mesure('cat ' + k); }
  for (const s of sts) { await E(s => { CX.cat = 'tous'; CX.st = s; cxAller('fachats'); }, s); await mesure('st ' + s); }
  console.log('  ' + profil + (nuit ? ' nuit' : '') + ' : ' + pop + ' états, ' + defil + ' rangées qui défilent, ' + centrees + ' hors butée');
  v('P1 population : au moins 8 états, au moins 1 rangée qui défile', pop >= 8 && defil >= 1, { pop, defil });
  v('P2 la puce choisie se voit en entier dans SA rangée', mal.length === 0, mal.slice(0, 5));
  v('P3 population : au moins une puce hors butée à vérifier', centrees >= 1, { centrees });
  v('P4 hors butée, la puce est au milieu de sa rangée (±3 px)', decentre.length === 0, decentre.slice(0, 5));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
