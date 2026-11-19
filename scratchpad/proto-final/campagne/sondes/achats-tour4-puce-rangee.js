// Recontrôle adverse restes-achats tour 4 : la puce choisie est AMENÉE AU MILIEU DE SA RANGÉE (mesurée contre la rangée, pas contre la page).
// offsetLeft se compte depuis l'ancêtre positionné (la page) : il ajoute à la cible le décalage de la rangée dans la page (marge de gauche), donc la puce
// s'arrête plus à gauche que le milieu. Elle reste visible en entier — c'est pourquoi les sondes « visible » ne le voient pas —, mais elle n'est plus CENTRÉE.
// EXIGE, pour chaque lien/statut/catégorie qui amène la puce active dans une rangée qui défile : (1) la puce se voit en entier dans SA rangée ;
// (2) quand le défilement n'est borné ni à gauche ni à droite (0 < scrollLeft < max), le centre de la puce tombe à ±3 px du centre de la rangée ;
// (3) la population compte au moins une puce centrée (un zéro sur du vide ne prouve rien).
// COMME LA PAGE EXPÉDIÉE N'A AUCUNE RANGÉE DÉCALÉE (les trois rangées qui défilent — Ventes, Achats, Paiements — sont collées au bord de #contenu, donc offsetLeft
// et la mesure contre la rangée donnent le même nombre : l'ancienne forme est, sur ces écrans, équivalente), la sonde INJECTE une rangée représentative : une feuille
// de style `.cx-cats{margin-left:24px}` (la question posée est celle du CALCUL, pas de la mise en page) ; avec elle offsetLeft dépasse la mesure de 24 px, la puce
// s'arrête 24 px trop à gauche du milieu, et P7 tombe. Sans injection (P1-P4) elle garde la page telle qu'elle est.
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
  const base = { pop, centrees, defil }; const dec0 = decentre.length;
  await E(() => { const st = document.createElement('style'); st.id = 'sonde-decale'; st.textContent = '.cx-cats{margin-left:24px !important}'; document.head.appendChild(st); });
  pop = 0; centrees = 0; const mal2 = [], dec2 = [];
  const mesure2 = async (tag) => { await L.calme(p, 450); const rows = await E(lire); pop++;
    for (const x of rows) { if (!x) continue; if (x.g < -1 || x.d < -1) mal2.push([tag, x]); else if (x.sl > 3 && x.sl < x.max - 3) { centrees++; if (Math.abs(x.ecart) > 3) dec2.push([tag, x]); } } };
  for (const k of cats) { await E(k => { CX.st = 'tous'; CX.cat = k; cxAller('fachats'); }, k); await mesure2('décalée cat ' + k); }
  v('P5 rangée décalée de 24 px : la puce reste entière dans sa rangée', mal2.length === 0, mal2.slice(0, 5));
  v('P6 rangée décalée de 24 px : au moins une puce hors butée à vérifier', centrees >= 1, { centrees, pop });
  v('P7 rangée décalée de 24 px : hors butée, la puce est au milieu de sa rangée (±3 px)', dec2.length === 0, dec2.slice(0, 5));
  console.log('  ' + profil + (nuit ? ' nuit' : '') + ' : ' + base.pop + ' états, ' + base.defil + ' rangées qui défilent, ' + base.centrees + ' hors butée ; rangée décalée : ' + centrees + ' hors butée');
  v('P1 population : au moins 8 états, au moins 1 rangée qui défile', base.pop >= 8 && base.defil >= 1, base);
  v('P2 la puce choisie se voit en entier dans SA rangée', mal.length === 0, mal.slice(0, 5));
  v('P3 population : au moins une puce hors butée à vérifier', base.centrees >= 1, base);
  v('P4 hors butée, la puce est au milieu de sa rangée (±3 px)', decentre.length === 0, decentre.slice(0, 5));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
