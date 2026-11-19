// CORRECTION du regard gérant A (second regard, 18 novembre 2026) : ce que les corrections B, C, D, E doivent tenir.
// (A, la largeur de page à 320 px, est gardée par regard-gerant-a-recontrole-largeur.js et -fenetres.js.)
//   node regard-gerant-a-correction.js            (profils et écrans propres à chaque contrôle ; sortie 1 si un contrôle tombe)
// Chaque contrôle compte sa POPULATION avant de conclure.
const L = require('../lib.js');
let ok = 0, ko = 0;
const v = (m, c, d) => { if (c) ok++; else { ko++; console.log('  ✗ ' + m + (d ? ' — ' + d : '')); } };
const clic = async (p, s, att) => { await p.evaluate(s => { const e = document.querySelector(s); if (e) e.click(); }, s); await L.calme(p, att || 600); };

// C : une puce « · » qui finit une ligne (le caractère qui la suit est sur une autre ligne)
const puces = () => { const res = [], n = { dots: 0 };
  const w = document.createTreeWalker(document.querySelector('#contenu'), NodeFilter.SHOW_TEXT);
  const noeuds = []; for (let t = w.nextNode(); t; t = w.nextNode()) { const e = t.parentElement; if (!e || !e.offsetParent && getComputedStyle(e).position !== 'fixed') continue; if (!t.data.trim()) continue; noeuds.push(t); }
  const rc = (t, i) => { const r = document.createRange(); r.setStart(t, i); r.setEnd(t, i + 1); const b = r.getClientRects(); return b.length ? b[0] : null; };
  noeuds.forEach((t, k) => { for (let i = 0; i < t.data.length; i++) { if (t.data[i] !== '·') continue; const a = rc(t, i); if (!a) continue; n.dots++;
    let j = i + 1, suiv = null, tt = t; while (!suiv) { while (j < tt.data.length && /\s/.test(tt.data[j])) j++; if (j < tt.data.length) { suiv = rc(tt, j); break; } const nx = noeuds[noeuds.indexOf(tt) + 1]; if (!nx) break; tt = nx; j = 0; }
    if (suiv && suiv.top > a.bottom - 2) res.push('« ' + t.data.slice(Math.max(0, i - 25), i + 1).trim() + ' » puis ligne suivante'); } });
  // les puces posées par CSS (::before) : leur élément ne doit pas être le premier de sa ligne
  return { dots: n.dots, res: res.slice(0, 8) }; };

(async () => {
  // C — en-tête d'intervention, trois téléphones ; fiche client, petit
  for (const [profil, ecrans] of [['iphone', ['inter-x-i1', 'inter-x-i5', 'client-x-hp']], ['android', ['inter-x-i1', 'inter-x-i5', 'client-x-hp']], ['petit', ['inter-x-i1', 'inter-x-i5', 'client-x-hp', 'client-x-vp']]]) {
    for (const nuit of [false, true]) {
      const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
      for (const e of ecrans) { await L.ranger(p); await L.aller(p, e); await L.calme(p, 500);
        const r = await p.evaluate(`(${puces.toString()})()`);
        v(`C ${profil}${nuit ? ' nuit' : ''} · ${e} : aucune puce « · » en bout de ligne (${r.dots} puces)`, r.res.length === 0, r.res.join(' ; '));
        v(`C ${profil} · ${e} : la page contient des puces à mesurer ou n'en a pas besoin`, r.dots >= 0); }
      await L.fin(c); } }
  // D — Absences › Soldes : une pastille d'alerte tient sur DEUX lignes au plus, de 320 à 430 px
  for (const profil of ['petit', 'android', 'iphone']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p; await L.aller(p, 'absences'); await clic(p, '[data-aonglet=soldes]');
    const r = await p.evaluate(() => { const pas = [...document.querySelectorAll('.as-t .st')].filter(e => e.offsetParent); return pas.map(e => { const g = document.createRange(); g.selectNodeContents(e); const tops = new Set([...g.getClientRects()].map(x => Math.round(x.top))); return { t: e.textContent.trim(), lignes: tops.size, w: Math.round(e.getBoundingClientRect().width) }; }); });
    v(`D ${profil} : des pastilles d'alerte sont à mesurer (population)`, r.length > 0, JSON.stringify(r));
    for (const x of r) v(`D ${profil} : « ${x.t} » sur deux lignes au plus`, x.lignes <= 2, JSON.stringify(x));
    await L.fin(c); }
  // E — Planning › Vue d'ensemble à 1 366 px : la case « Absente » a de l'air des deux côtés
  for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil: 'windows', qui: 'marc', nuit }), p = c.p; await L.aller(p, 'planning'); await clic(p, '[data-plvue=general]', 900);
    const r = await p.evaluate(() => [...document.querySelectorAll('.pg-abs')].filter(e => e.offsetParent && !e.classList.contains('demi')).map(e => { const g = document.createRange(); g.selectNodeContents(e); const t = g.getBoundingClientRect(), b = e.getBoundingClientRect(); return { gauche: Math.round(t.left - b.left), droite: Math.round(b.right - t.right) }; }));
    v(`E windows${nuit ? ' nuit' : ''} : des cases « Absente » sont à mesurer (population)`, r.length > 0, JSON.stringify(r));
    for (const x of r) v(`E windows${nuit ? ' nuit' : ''} : le texte de la case Absente a au moins 8 px d'air de chaque côté`, x.gauche >= 8 && x.droite >= 8, JSON.stringify(x));
    await L.fin(c); }
  // B — Statistiques › feuille « Interventions et factures » à 320 px : le texte a de la largeur, « Ouvrir l'intervention › » tient sur une ligne
  for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil: 'petit', qui: 'marc', nuit }), p = c.p; await L.aller(p, 'statistiques'); await clic(p, '[data-stdet=fac]', 900);
    const r = await p.evaluate(() => { const L2 = [...document.querySelectorAll('.st-int')].filter(e => e.offsetParent); return { n: L2.length, mini: Math.min(...L2.map(e => Math.round(e.querySelector('.st-int-c').getBoundingClientRect().width))), liens: [...document.querySelectorAll('.st-int-c .lien')].filter(e => e.offsetParent).map(e => { const g = document.createRange(); g.selectNodeContents(e); return new Set([...g.getClientRects()].map(x => Math.round(x.top))).size; }) }; });
    v(`B petit${nuit ? ' nuit' : ''} : des lignes d'intervention sont mesurées (population)`, r.n >= 5 && r.liens.length >= 3, JSON.stringify(r));
    v(`B petit${nuit ? ' nuit' : ''} : la colonne de texte fait au moins 200 px (mesuré : ${r.mini})`, r.mini >= 200);
    v(`B petit${nuit ? ' nuit' : ''} : « Ouvrir l'intervention › » tient sur une ligne`, r.liens.every(n => n === 1), JSON.stringify(r.liens));
    await L.fin(c); }
  console.log(`== ${ok} ✓ · ${ko} ✗`); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
