// Matériel, étape 3 (Dépôts et camions) — la page, les fiches et TOUTES les feuilles sur les sept profils, jour et nuit : débordement contre la largeur POSÉE (deux lectures, puis on
// demande à la page si elle glisse), champs ≥ 16 px (taille calculée), cibles ≥ 44 px au doigt (zone qui répond), textes écrasés, libellés coupés, bouton du bas qui reste dans l'écran,
// barre du bas qui ne couvre pas la dernière carte, et les VALEURS LONGUES (camion de 72 signes, article de 72 signes, 12 345,67 €, 1 523 unités, client de 60 signes). Captures à REGARDER (outil Read).
// Usage : node materiel-depots-appareils.js [profil…]  → « N ✓ · M ✗ »      NUIT=0 : le jour seulement
const L = require('../lib.js');
const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel3/';
const PROFILS = process.argv.slice(2).length ? process.argv.slice(2) : ['mac', 'mac720', 'windows', 'ipad', 'iphone', 'android', 'petit'];
const LONG = 'Condensateur de démarrage permanent 5 µF 450 V à fixation universelle XL', CAM = 'Camion de Sophie-Marie Delaplanche-Vandenbroucke (utilitaire grand volume)';
(async () => {
  const v = L.v;
  for (const profil of PROFILS) for (const nuit of process.env.NUIT === '0' ? [false] : [false, true]) {
    const c = await L.ouvrir({ profil, nuit, qui:'marc' }), p = c.p, tag = `${profil}${nuit ? ' nuit' : ' jour'}`, f = `${profil}-${nuit ? 'nuit' : 'jour'}`, R = (g, a) => p.evaluate(g, a);
    await R(() => { window.horsLigneDebut = function () {}; });
    await R(a => { PRODUITS.find(x => x.id === 'p3').nom = a.n; PRODUITS.find(x => x.id === 'p3').q = 1523; PRODUITS.find(x => x.id === 'p3').pa = 12345.67; LIEUX.find(l => l.id === 'v1').nom = a.c; INTS.forEach(i => { if (CLIENTS[i.cli]) CLIENTS[i.cli].nom = 'Établissements hospitaliers du Grand Sud-Ouest Atlantique Nord'; }); }, { n:LONG, c:CAM });
    await L.aller(p, 'boxes'); await L.calme(p, 400);
    const ecrans = [['page', async () => {}, '#contenu'], ['avant', async () => { await R(() => mdAvant()); }, '#calque .panneau'], ['remplir', async () => { await R(() => bxReassort()); }, '#calque .panneau'],
      ['fiche-camion', async () => { await R(() => bxFiche('v1')); }, '#calque .panneau'], ['fiche-garage', async () => { await R(() => bxFiche('v4')); }, '#calque .panneau'], ['fiche-atelier', async () => { await R(() => bxFiche('atelier')); }, '#calque .panneau'],
      ['fiche-reserve', async () => { await R(() => bxFiche('d-hp')); }, '#calque .panneau'], ['dotation', async () => { await R(() => mdDotation('v1')); }, '#calque .panneau'], ['modifier', async () => { await R(() => bxModifier('v1')); }, '#calque .panneau'],
      ['nouvelle', async () => { await R(() => bxNouveau('')); }, '#calque .panneau'], ['fermer', async () => { await R(() => bxFermer('d-hp')); }, '#calque .panneau'], ['compter', async () => { await R(() => matCompter('v1')); }, '#calque .panneau']];
    for (const [k, ouvre, zone] of ecrans) {
      await L.ranger(p); await R(() => { MD.dot = null; MAT.C = null; rendre(); }); await L.calme(p, 250); await ouvre(); await L.calme(p, 450);
      const pop = await R(z => { const e = document.querySelector(z); return e ? { boutons:e.querySelectorAll('button').length, texte:e.innerText.length, lignes:e.querySelectorAll('.md-c, .md-lg, .md-r, .mat-l, .ms-ev, .ligne, .ligne-clic').length } : null; }, zone);
      v(`${tag} · ${k} : population (${pop && pop.boutons} boutons, ${pop && pop.lignes} lignes)`, !!pop && pop.boutons >= 2 && pop.texte > 40, pop);
      const dep = await L.deborde(c); v(`${tag} · ${k} : la page ne glisse pas de côté (${dep.largeur} posés, lu ${dep.premiere}/${dep.seconde})`, dep.bouge === 0 && dep.seconde <= c.largeur + 1, dep);
      if (k === 'page') { const t = await R(() => { const h = document.querySelector('#contenu h1').getBoundingClientRect(), b = document.querySelector('.md-tete .actions').getBoundingClientRect(), g = document.querySelector('.md-tete > div:first-child').getBoundingClientRect(); return { titre:Math.round(g.width), hh:Math.round(h.bottom), bh:Math.round(b.top), recouvre:!(h.bottom <= b.top + 1 || h.top >= b.bottom - 1 || h.right <= b.left + 1 || h.left >= b.right - 1) }; });
        v(`${tag} · page : le titre et les boutons de l'en-tête ne se recouvrent pas, et le titre garde sa largeur (${t.titre} px de ${c.largeur})`, !t.recouvre && (c.largeur > 760 || t.titre >= c.largeur * 0.8), t); }
      const dg = await L.doigts(p, zone); v(`${tag} · ${k} : champs ≥ 16 px`, dg.champs.length === 0, dg.champs); v(`${tag} · ${k} : aucun texte écrasé`, dg.ecrases.length === 0, dg.ecrases);
      // un libellé qui sort de son bouton est COUPÉ (« un libellé tronqué ne nomme rien ») : le contenu doit tenir dans le bouton qui le porte
      const coupes = await R(z => [...document.querySelector(z).querySelectorAll('button, .st, summary')].filter(b => b.offsetParent && !b.closest('.ctx, .tete-tel') && b.scrollWidth > b.clientWidth + 1 && getComputedStyle(b).overflowX !== 'auto' && getComputedStyle(b).overflowX !== 'scroll').map(b => (b.textContent || '').trim().slice(0, 40) + ' ' + b.scrollWidth + '>' + b.clientWidth).slice(0, 6), zone);
      v(`${tag} · ${k} : aucun libellé coupé dans son bouton`, coupes.length === 0, coupes);
      const petits = dg.petits.filter(x => !/^OP GESTION : revenir|^Menu\b/.test(x)); if (c.doigt) v(`${tag} · ${k} : cibles ≥ 44 px`, petits.length === 0, petits);
      if (zone !== '#contenu') { const pan = await R(() => { const e = document.querySelector('#calque .panneau'), pied = e.querySelector('.mat-pied, .fo-pied, .actions'); const r = pied && pied.getBoundingClientRect(); return { sw:e.scrollWidth, cw:e.clientWidth, pied:r ? Math.round(r.bottom) : null, H:innerHeight }; });
        v(`${tag} · ${k} : sans défilement latéral (${pan.sw} ≤ ${pan.cw})`, pan.sw <= pan.cw + 1, pan); if (pan.pied != null && !['fiche-camion', 'fiche-garage', 'fiche-atelier', 'fiche-reserve'].includes(k)) v(`${tag} · ${k} : le bouton du bas reste dans l'écran (${pan.pied} ≤ ${pan.H})`, pan.pied <= pan.H + 1, pan); }
      else if (c.doigt) { const bas = await R(() => { scrollTo(0, document.documentElement.scrollHeight); return new Promise(r => setTimeout(() => { const be = document.querySelector('.opg-tabs'), br = be && be.getBoundingClientRect(), l = [...document.querySelectorAll('#contenu .carte')].pop(), lr = l && l.getBoundingClientRect(); r({ dernier:lr ? Math.round(lr.bottom) : null, bar:br ? Math.round(br.top) : null }); }, 400)); });
        v(`${tag} · ${k} : en bas de page, la barre du bas ne couvre pas la dernière ligne (${bas.dernier} ≤ ${bas.bar})`, bas.bar == null || bas.dernier == null || bas.dernier <= bas.bar + 1, bas); await R(() => scrollTo(0, 0)); }
      if (['page', 'fiche-camion', 'remplir', 'avant'].includes(k) || (profil === 'iphone' && !nuit)) await L.capture(c, `${D}a-${k}-${f}.png`);
    }
    v(`${tag} : aucune erreur de page`, c.err.length === 0, c.err);
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
