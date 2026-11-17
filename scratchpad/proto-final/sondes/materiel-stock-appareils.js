// Matériel, étape 2 (Stock) — la page Stock et TOUTES ses feuilles sur les sept profils, jour et nuit : débordement contre la largeur POSÉE (deux lectures, puis on
// demande à la page si elle glisse), champs ≥ 16 px (taille calculée), cibles ≥ 44 px au doigt (zone qui répond), textes écrasés, bouton du bas qui reste dans l'écran,
// et les VALEURS LONGUES (nom d'article de 72 signes, client de 60 signes, 12 345,67 €, 1 523 unités). Les captures sont à REGARDER (outil Read).
// Usage : node materiel-stock-appareils.js [profil…]  → « N ✓ · M ✗ »      NUIT=0 : le jour seulement
const L = require('../lib.js');
const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel2/';
const PROFILS = process.argv.slice(2).length ? process.argv.slice(2) : ['mac', 'mac720', 'windows', 'ipad', 'iphone', 'android', 'petit'];
const LONG = 'Condensateur de démarrage permanent 5 µF 450 V à fixation universelle XL';
(async () => {
  const v = L.v;
  for (const profil of PROFILS) for (const nuit of process.env.NUIT === '0' ? [false] : [false, true]) {
    const c = await L.ouvrir({ profil, nuit, qui:'marc' }), p = c.p, tag = `${profil}${nuit ? ' nuit' : ' jour'}`, f = `${profil}-${nuit ? 'nuit' : 'jour'}`, R = (g, a) => p.evaluate(g, a);
    await R(() => { window.horsLigneDebut = function () {}; });
    await R(n => { PRODUITS.find(x => x.id === 'p3').nom = n; PRODUITS.find(x => x.id === 'p3').q = 1523; PRODUITS.find(x => x.id === 'p3').pa = 12345.67; CLIENTS[INTS.find(i => i.id === 'i1').cli].nom = 'Établissements hospitaliers du Grand Sud-Ouest Atlantique Nord'; }, LONG);
    await L.aller(p, 'stock'); await L.calme(p, 400);
    const ecrans = [['articles', async () => {}, '#contenu'], ['journal', async () => { await R(() => { stkOnglet = 'mvts'; rendre(); }); }, '#contenu'],
      ['quoi', async () => { await R(() => matGOuvrir('quoi')); }, '#calque .panneau'], ['sortir', async () => { await R(() => { matGOuvrir('sortir', { pid:'p3' }); MAT.G.pour = 'collegue'; MAT.G.collegue = 'lr'; matGVue(); }); }, '#calque .panneau'],
      ['ranger', async () => { await R(() => { matGOuvrir('ranger', { pid:'p3' }); MAT.G.origine = 'comptoir'; MAT.G.montant = '18,50'; matGVue(); }); }, '#calque .panneau'], ['deplacer', async () => { await R(() => matGOuvrir('deplacer', { pid:'p3' })); }, '#calque .panneau'],
      ['compter', async () => { await R(() => matCompter('atelier')); }, '#calque .panneau'], ['envois', async () => { await R(() => msEnvois()); }, '#calque .panneau'], ['fiche', async () => { await R(() => prFiche('p3')); }, '#calque .panneau'],
      ['formulaire', async () => { await R(() => prFormulaire(PRODUITS.find(x => x.id === 'p3'))); }, '#calque .panneau'], ['registre', async () => { await R(() => sxRegistre()); }, '#calque .panneau'], ['filtre', async () => { await R(() => msFiltrer()); }, '#calque .panneau'],
      ['reglages', async () => { await R(() => msReglagesVue()); }, '#calque .panneau']];
    for (const [k, ouvre, zone] of ecrans) {
      await L.ranger(p); await R(() => { stkOnglet = 'ensemble'; rendre(); }); await L.calme(p, 250); await ouvre(); await L.calme(p, 450);
      const pop = await R(z => { const e = document.querySelector(z); return e ? { boutons:e.querySelectorAll('button').length, texte:e.innerText.length, lignes:e.querySelectorAll('.ms-l, .ms-g, .mat-l, .ms-ev, .ligne, .ligne-clic').length } : null; }, zone);
      v(`${tag} · ${k} : population (${pop && pop.boutons} boutons, ${pop && pop.lignes} lignes)`, !!pop && pop.boutons >= 2 && pop.texte > 40, pop);
      const dep = await L.deborde(c); v(`${tag} · ${k} : la page ne glisse pas de côté (${dep.largeur} posés, lu ${dep.premiere}/${dep.seconde})`, dep.bouge === 0 && dep.seconde <= c.largeur + 1, dep);
      const dg = await L.doigts(p, zone); v(`${tag} · ${k} : champs ≥ 16 px`, dg.champs.length === 0, dg.champs); v(`${tag} · ${k} : aucun texte écrasé`, dg.ecrases.length === 0, dg.ecrases);
      // un libellé qui sort de son bouton est COUPÉ (« un libellé tronqué ne nomme rien ») : le contenu doit tenir dans le bouton qui le porte
      const coupes = await R(z => [...document.querySelector(z).querySelectorAll('button, .st, summary')].filter(b => b.offsetParent && !b.closest('.ctx, .tete-tel') && b.scrollWidth > b.clientWidth + 1 && getComputedStyle(b).overflowX !== 'auto' && getComputedStyle(b).overflowX !== 'scroll').map(b => (b.textContent || '').trim().slice(0, 40) + ' ' + b.scrollWidth + '>' + b.clientWidth).slice(0, 6), zone);
      v(`${tag} · ${k} : aucun libellé coupé dans son bouton`, coupes.length === 0, coupes);
      const petits = dg.petits.filter(x => !/^OP GESTION : revenir|^Menu\b/.test(x)); if (c.doigt) v(`${tag} · ${k} : cibles ≥ 44 px`, petits.length === 0, petits);
      if (zone !== '#contenu') { const pan = await R(() => { const e = document.querySelector('#calque .panneau'), pied = e.querySelector('.mat-pied, .fo-pied, .actions'); const r = pied && pied.getBoundingClientRect(); return { sw:e.scrollWidth, cw:e.clientWidth, pied:r ? Math.round(r.bottom) : null, H:innerHeight }; });
        v(`${tag} · ${k} : sans défilement latéral (${pan.sw} ≤ ${pan.cw})`, pan.sw <= pan.cw + 1, pan); if (pan.pied != null && !['fiche', 'formulaire', 'registre'].includes(k)) v(`${tag} · ${k} : le bouton du bas reste dans l'écran (${pan.pied} ≤ ${pan.H})`, pan.pied <= pan.H + 1, pan); }
      else if (c.doigt) { const bas = await R(() => { scrollTo(0, document.documentElement.scrollHeight); return new Promise(r => setTimeout(() => { const be = document.querySelector('.opg-tabs'), br = be && be.getBoundingClientRect(), l = [...document.querySelectorAll('#contenu .ms-l, #contenu .ms-g, #contenu .ms-pied, #contenu .carte')].pop(), lr = l && l.getBoundingClientRect(); r({ dernier:lr ? Math.round(lr.bottom) : null, bar:br ? Math.round(br.top) : null }); }, 400)); });
        v(`${tag} · ${k} : en bas de page, la barre du bas ne couvre pas la dernière ligne (${bas.dernier} ≤ ${bas.bar})`, bas.bar == null || bas.dernier == null || bas.dernier <= bas.bar + 1, bas); await R(() => scrollTo(0, 0)); }
      if (['articles', 'sortir', 'fiche', 'compter'].includes(k) || (profil === 'iphone' && !nuit)) await L.capture(c, `${D}a-${k}-${f}.png`);
    }
    v(`${tag} : aucune erreur de page`, c.err.length === 0, c.err);
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
