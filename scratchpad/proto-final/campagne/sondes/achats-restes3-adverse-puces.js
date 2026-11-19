// Recontrôle adverse restes achats tour 3 : la puce active sur TOUTES les rangées de la Comptabilité, tous profils.
const { L, ouvrirAchats, toast } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'petit', nuit = process.argv[3] === 'nuit';
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit, hash: false }), p = c.p, E = (f, a) => p.evaluate(f, a);
  await E(() => { aller('comptabilite'); }); await L.calme(p, 800);
  const secs = await E(() => CX_NAV.flatMap(s => s[3].map(o => o[0])));
  const cats = await E(() => CX_CATS.map(x => x.k)), sts = await E(() => Object.keys(CX_ST));
  let pop = 0, defil = 0, mal = [], pageGlisse = [];
  const mesure = async (tag) => { await L.calme(p, 250); const r = await E(() => ({ sx: scrollX, dw: document.documentElement.scrollWidth - innerWidth, rows: [...document.querySelectorAll('.cx-cats, .cx-outils .seg')].map(r => { const b = r.querySelector('[aria-pressed="true"]'), rr = r.getBoundingClientRect(); if (!b) return { defile: r.scrollWidth > r.clientWidth + 2, puce: false }; const rb = b.getBoundingClientRect(); return { defile: r.scrollWidth > r.clientWidth + 2, puce: true, g: Math.round(rb.left - rr.left), d: Math.round(rr.right - rb.right), sl: Math.round(r.scrollLeft), max: Math.round(r.scrollWidth - r.clientWidth) }; }) }));
    pop++; if (r.dw > 1 || r.sx) pageGlisse.push([tag, r.dw, r.sx]);
    for (const x of r.rows) if (x.defile) { defil++; if (x.puce && (x.g < -1 || x.d < -1)) mal.push([tag, x]); } };
  for (const s of secs) { await E(s => { cxAller(s); }, s); await mesure('sec ' + s); }
  await E(() => { cxAller('fachats'); });
  for (const k of cats) { await E(k => { CX.cat = k; rendre(); }, k); await mesure('cat ' + k); }
  await E(() => { CX.cat = 'tous'; });
  for (const s of sts) { await E(s => { CX.st = s; rendre(); }, s); await mesure('st ' + s); }
  await E(() => { CX.st = 'tous'; });
  v('A1 population : ' + pop + ' états mesurés, ' + defil + ' rangées qui défilent', pop > 20, { pop, defil });
  v('A2 la puce active est entière dans sa rangée', mal.length === 0, mal.slice(0, 6));
  v('A3 la page ne glisse pas de côté', pageGlisse.length === 0, pageGlisse.slice(0, 6));
  await L.fermer(c); L.bilan();
})().catch(e => { console.error(e); process.exit(1); });
