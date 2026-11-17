// Restes compta-ventes, tour 1 (17 novembre 2026), décisions du chef 15, 16, 17 et 22 : au téléphone,
//  15 · les onglets d'un espace (Ventes, Achats, Trésorerie, Fiscal…) tiennent sur l'écran : aucun ne défile de côté, tous sont visibles et touchables (44 px) ;
//  16 · la tête de la Comptabilité gagne de la hauteur : la phrase d'explication tient sur une ligne ;
//  17 · la fiche d'une facture : le titre « FAC-… » est dans le premier écran, plus de fil d'Ariane, « Il manque… » sur une ligne ;
//  22 · dans la fenêtre de la comptabilité, un seul bouton de menu par barre : le ≡ s'efface, « Menu » d'OP GESTION reste, l'heure est libellée.
// Usage : node compta-ventes-restes-1.js [profil] [nuit]   (profil : iphone, android, petit, ipad, mac…)
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p, tel = c.largeur <= 760;
  const cap = n => L.capture(c, X.CAP + `restes1-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  // ── 15 : les onglets de chaque espace ──
  const espaces = await p.evaluate(() => CX_NAV.map(g => [g[0], g[3].map(x => x[0])]));
  L.v('population : six espaces, des onglets partout', espaces.length >= 6 && espaces.every(e => e[1].length >= 2), espaces.map(e => e[0] + ':' + e[1].length));
  for (const [g, onglets] of espaces) {
    await X.compta(c, onglets[0]); const m = await p.evaluate(() => { const s = document.querySelector('.cx-sous'); if (!s) return null; const r = s.getBoundingClientRect(), bs = [...s.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 24), g: Math.round(q.left), d: Math.round(q.right), h: Math.round(q.height), w: Math.round(q.width) }; });
      return { defile: s.scrollWidth > s.clientWidth + 1, largeur: Math.round(r.width), bs, lignes: new Set(bs.map(b => Math.round(b.h) && b.g <= bs[0].g + 1 ? 'x' : 'x')).size, tops: [...new Set([...s.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().top)))].length }; });
    if (!m) { L.v('15 · ' + g + ' : la bande d’onglets existe', false); continue; }
    L.v('15 · ' + g + ' : la bande d’onglets ne défile pas de côté', !m.defile, m.largeur + ' px, ' + m.bs.length + ' onglets');
    L.v('15 · ' + g + ' : chaque onglet est entièrement dans l’écran (0 ≤ g, d ≤ ' + c.largeur + ')', m.bs.every(b => b.g >= -1 && b.d <= c.largeur + 1), m.bs.filter(b => b.g < -1 || b.d > c.largeur + 1));
    if (c.doigt) L.v('15 · ' + g + ' : chaque onglet répond sur 44 px au moins', m.bs.every(b => b.h >= 43.5), m.bs.filter(b => b.h < 43.5));
    if (g === 'ventes' || g === 'fiscal') await cap('onglets-' + g);
  }
  // ── 16 : la tête de la Comptabilité ──
  await X.compta(c, 'fventes');
  const tete = await p.evaluate(() => { const t = document.querySelector('#contenu .tete'), ph = t && t.querySelector('.gris'); if (!t) return null; const r = t.getBoundingClientRect(), lh = ph ? parseFloat(getComputedStyle(ph).lineHeight) || 20 : 20; return { h: Math.round(r.height), phrase: ph ? ph.textContent.trim() : '', lignes: ph ? Math.round(ph.getBoundingClientRect().height / lh) : 0 }; });
  console.log('  tête :', JSON.stringify(tete));
  if (tel) { L.v('16 · la phrase d’explication de la tête tient sur une ligne', tete && tete.lignes <= 1, tete); L.v('16 · « Comment ça marche ? » reste touchable (il porte le reste)', await p.evaluate(() => !!document.querySelector('#contenu [data-cp="aide"]'))); }
  await cap('tete');
  // ── 17 : la fiche d'une facture envoyée (la 0145 d'une intervention) ──
  await X.fiche(c, 'f145'); const fi = await p.evaluate(() => { const h = document.querySelector('#contenu h1'), r = h && h.getBoundingClientRect(), bas = document.querySelector('.tabbar, #tabbar, nav.onglets-bas'); const b = bas ? bas.getBoundingClientRect().top : innerHeight; return { h1: h ? h.textContent.trim() : '', haut: r ? Math.round(r.top) : -1, bas: Math.round(r ? r.bottom : -1), ecran: Math.round(b), fil: !!document.querySelector('#contenu .cx-fil'), txt: document.querySelector('#contenu').innerText.slice(0, 300).replace(/\n+/g, ' | ') }; });
  console.log('  fiche :', JSON.stringify(fi));
  if (tel) { L.v('17 · le titre de la fiche est dans le premier écran', fi.h1 && fi.bas > 0 && fi.bas <= fi.ecran, fi); L.v('17 · plus de fil d’Ariane au téléphone', !(await p.evaluate(() => { const f = document.querySelector('#contenu .cx-fil'); return f && f.offsetParent !== null; }))); }
  await cap('fiche-facture');
  // ── 22 : la fenêtre de la comptabilité ──
  const f = await X.cadreOuvert(c); await L.calme(p, 500);
  const bar = await f.evaluate(() => { const v = e => e && e.offsetParent !== null && e.getBoundingClientRect().width > 0; const bt = document.querySelector('#barre .ouvrir-menu'), ch = document.querySelector('#barre .chip.vivant, #barre .chip[data-cmpt="lecture"]'); return { burger: v(bt), puce: ch ? ch.innerText.replace(/\s+/g, ' ').trim() : '', plus: !!document.querySelector('#barre-bas [data-a="menu"]') && v(document.querySelector('#barre-bas [data-a="menu"]')) }; });
  console.log('  fenêtre :', JSON.stringify(bar));
  if (tel) { L.v('22 · le ≡ de la fenêtre est effacé (la barre du bas « Plus » porte le menu)', !bar.burger && bar.plus, bar); L.v('22 · l’heure de la puce est libellée (« Relevé à … »)', /Relevé à/.test(bar.puce), bar.puce); }
  else L.v('22 · hors téléphone, le ≡ de la fenêtre reste quand la barre du bas n’existe pas (tablette)', c.largeur > 1000 || bar.burger, bar);
  const menuOG = await p.evaluate(() => { const b = [...document.querySelectorAll('button, a')].find(e => /^\s*Menu\s*$/i.test(e.textContent) && e.offsetParent !== null); return !!b; });
  if (tel) L.v('22 · le bouton « Menu » d’OP GESTION reste visible à côté de « ‹ OP GESTION »', menuOG);
  await cap('fenetre');
  console.log('  erreurs de page :', c.err.length ? c.err.slice(0, 3) : 'aucune'); L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); L.bilan(); await L.fermer(); process.exit(0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
