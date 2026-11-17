// LE REGARD — gérant, rubriques Registre sanitaire · Carte des box · Devis xylophage.
// Contrôles DURABLES des défauts de mise en page vus sur les captures (regard-gerant-f-captures.js) puis corrigés à la source.
// Rejouable seul : node scratchpad/proto-final/sondes/regard-gerant-f.js [n,n…]   →  « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// Chaque défaut : la mesure qui l'accuse est celle qui le garde (on a vu la capture, corrigé, puis on mesure). Les largeurs se mesurent
// contre la largeur POSÉE du profil (jamais innerWidth, qui grandit avec la page).
const L = require('../lib.js');
const v = L.v, F = process.argv[2] || '', sec = n => !F || F.split(',').includes(String(n));
const LARGEUR = { mac: 1440, ipad: 820, iphone: 390, android: 360, petit: 320 };
// l'état des trois écrans survit d'une scène à l'autre : on le remet à neuf avant chaque geste
const neuf = p => p.evaluate(() => { try { d3Cli = 't1'; d3Ouvert = null; d3Sel = null; d3Mode = null; cbEdit = null; cbReleve = null; cbFiltre = 'tout'; cbZone = ''; rgTous = true; rgQ = ''; rgSaisie = null; DX = null; } catch (e) {} });
const clic = async (p, sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 500); return ok; };
const NOMS = ['Établissements Hospitaliers du Littoral Atlantique Sud-Ouest SA', 'Résidence Les Terrasses de la Grande Plage et du Vieux Port', 'Société Coopérative Agricole des Producteurs Réunis de la Vallée'];
(async () => {
  for (const profil of ['mac', 'ipad', 'iphone', 'android', 'petit']) {
    const W = LARGEUR[profil], tel = W < 600;
    const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
    await p.evaluate(() => mchPoser(['3d'])); await L.calme(p, 500);

    // 1. REGISTRE, passages : « Forte » (60 px) et « Moyenne » (80 px) décalaient le titre de chaque passage. Le titre doit commencer au même x.
    if (sec(1)) {
      await neuf(p); await L.aller(p, 'registre'); await clic(p, '[data-rg="cli|t1"]', 600);
      const r = await p.evaluate(() => [...document.querySelectorAll('#contenu .ve-u[data-d3^="voir|"] > .fo-n')].map(e => Math.round(e.getBoundingClientRect().left * 10) / 10));
      v(`registre ${profil} : les passages sont comptés (population)`, r.length >= 3, r);
      v(`registre ${profil} : le titre de chaque passage commence au même endroit`, r.length >= 3 && Math.max(...r) - Math.min(...r) <= 1, r);
    }
    // 2. REGISTRE, lien de contrôle : le texte tombait à 30 px de large sur téléphone, une lettre par ligne.
    if (sec(2)) {
      await neuf(p); await L.aller(p, 'registre'); await clic(p, '[data-rg="cli|t1"]', 600);
      const r = await p.evaluate(() => { const e = document.querySelector('#contenu .rg-lienb .d3-lien > .fo-n'); if (!e) return null; const b = e.querySelector('b').getBoundingClientRect(); return { l: Math.round(e.getBoundingClientRect().width), titreLignes: Math.round(b.height / 20) }; });
      v(`registre ${profil} : le bloc « Lien de contrôle sanitaire » est trouvé (population)`, !!r, r);
      if (r) { v(`registre ${profil} : le texte du lien de contrôle fait au moins 200 px de large`, r.l >= 200, r); v(`registre ${profil} : le titre du lien de contrôle tient sur une ou deux lignes`, r.titreLignes <= 2, r); }
    }
    // 3. REGISTRE, aperçu du PDF : « Dat/e », « Benal/i », « Fort/e » — aucun mot ne se coupe en deux.
    if (sec(3)) {
      await neuf(p); await L.aller(p, 'registre'); await clic(p, '[data-rg="cli|t1"]', 600); await clic(p, '[data-rg^="pdf|"]', 900);
      const r = await p.evaluate(() => { const un = e => { const g = document.createRange(); g.selectNodeContents(e); return g.getClientRects().length; };
        const th = [...document.querySelectorAll('#calque .rg-doc th')], td = [...document.querySelectorAll('#calque .rg-doc td')].filter(e => !e.querySelector('.mini') && e.nextElementSibling);
        return { th: th.length, thCoupes: th.filter(e => un(e) > 1).map(e => e.textContent), td: td.length, tdCoupes: td.filter(e => un(e) > 1).map(e => e.textContent) }; });
      v(`registre ${profil} : l'aperçu du PDF est ouvert, en-têtes et cellules comptés (population)`, r.th >= 8 && r.td >= 6, r);
      v(`registre ${profil} : aucun en-tête du tableau ne passe à la ligne`, r.thCoupes.length === 0, r.thCoupes);
      v(`registre ${profil} : aucune date, aucun applicateur, aucune activité ne se coupe`, r.tdCoupes.length === 0, r.tdCoupes);
    }
    // 4. CARTE DES BOX, les commandes de l'en-tête : à 320 px « Relever les box » devenait un rond de trois lignes, « Touche le plan… » un pavé de quatre.
    if (sec(4)) {
      await neuf(p); await L.aller(p, 'carteBox');
      const mesure = () => p.evaluate(() => [...document.querySelectorAll('#contenu .cb-tete .actions > .btn, #contenu .cb-tete .actions > .cb-plus > summary')].map(b => { const g = document.createRange(); g.selectNodeContents(b); const r = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 40), h: Math.round(r.height), w: Math.round(r.width), lignes: g.getClientRects().length, dedans: r.right <= innerWidth && r.left >= 0 }; }));
      let r = await mesure(); v(`carte ${profil} : les trois commandes sont comptées (population)`, r.length === 3, r);
      for (const b of r) { v(`carte ${profil} : « ${b.t} » tient sur UNE ligne, dans une pastille (pas un rond)`, b.lignes === 1 && b.w > b.h * 1.8 && b.dedans, b); }
      await clic(p, '[data-d3="ajout"]', 700); r = await mesure(); const a = r.find(b => /Touche le plan/.test(b.t));
      v(`carte ${profil} : en mode « poser une box », la commande est trouvée (population)`, !!a, r);
      if (a) v(`carte ${profil} : « Touche le plan pour poser la box… » tient sur deux lignes au plus et prend de la largeur`, a.lignes <= 2 && a.w >= Math.min(220, W - 40), a);
    }
    // 5. CARTE DES BOX, les quatre tuiles : 11,5 px, « 17 / oct. » coupé en deux à 320 px.
    if (sec(5)) {
      await neuf(p); await L.aller(p, 'carteBox');
      const r = await p.evaluate(() => [...document.querySelectorAll('#contenu .cb-kpis .kpi')].map(k => { const b = k.querySelector('b'), s = k.querySelector('span'), g = document.createRange(); g.selectNodeContents(b); return { b: b.textContent.trim(), corps: parseFloat(getComputedStyle(s).fontSize), bLignes: g.getClientRects().length }; }));
      v(`carte ${profil} : les quatre tuiles sont comptées (population)`, r.length === 4, r);
      for (const k of r) { v(`carte ${profil} : la tuile « ${k.b} » : valeur sur une ligne, légende d'au moins 13 px (au téléphone)`, k.bLignes === 1 && (!tel || k.corps >= 12.9), k); }
    }
    // 6. CARTE DES BOX, le relevé en cours : un bouton qui ne se coupait pas poussait la carte 13 px hors d'un écran de 360.
    if (sec(6) && tel) {
      await neuf(p); await L.aller(p, 'carteBox'); await clic(p, '[data-cbx="rel"]', 900);
      const r = await p.evaluate(Wp => { const out = []; document.querySelectorAll('#contenu *').forEach(e => { const b = e.getBoundingClientRect(); if (b.width > 0 && b.right > Wp + 1 && getComputedStyle(e).position !== 'fixed') out.push(e.tagName + '.' + String(e.className).slice(0, 30) + ' ' + Math.round(b.right)); }); return { sw: document.documentElement.scrollWidth, out: out.slice(0, 6), cartes: document.querySelectorAll('#contenu .cb-rel').length }; }, W);
      v(`carte ${profil} : le relevé est ouvert (population)`, r.cartes === 1, r);
      v(`carte ${profil} : le relevé ne pousse pas la page de côté (≤ ${W} px)`, r.sw <= W, r);
    }
    // 7. SITES À NOM LONG : le sélecteur de site coupait « Établissements Hospitaliers du Littoral At… » à droite.
    if (sec(7)) {
      await p.evaluate(NM => { window.__nm = Object.fromEntries(Object.entries(D3_CLI).map(([k, x]) => [k, x.nom])); Object.keys(D3_CLI).forEach((k, i) => { D3_CLI[k].nom = NM[i % 3]; }); }, NOMS);
      for (const [h, sel] of [['registre', '#contenu .d3-cli button'], ['carteBox', '#contenu .d3-cli button']]) {
        await neuf(p); await L.aller(p, h);
        const r = await p.evaluate(s => [...document.querySelectorAll(s)].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.slice(0, 20), coupe: b.scrollWidth > b.clientWidth + 1, dedans: r.right <= innerWidth + 0.5 && r.left >= -0.5 }; }), sel);
        v(`${h} ${profil} : les boutons de site sont comptés (population)`, r.length >= 3, r);
        v(`${h} ${profil} : aucun nom de site n'est coupé ni ne sort de l'écran`, r.every(b => !b.coupe && b.dedans), r.filter(b => b.coupe || !b.dedans));
      }
      await p.evaluate(() => { Object.entries(window.__nm).forEach(([k, n]) => { D3_CLI[k].nom = n; }); });
    }
    // 8. DEVIS XYLOPHAGE, les quatre insectes : « Mérule (champignon) » tombait seul sur une seconde ligne dans un cadre gris (bureau).
    if (sec(8) && !tel) {
      await neuf(p); await L.aller(p, 'devisXylo');
      const r = await p.evaluate(() => [...document.querySelectorAll('#contenu .seg[aria-label="Insecte"] button')].map(b => Math.round(b.getBoundingClientRect().top)));
      v(`devis xylophage ${profil} : les quatre insectes sont comptés (population)`, r.length === 4, r);
      v(`devis xylophage ${profil} : les quatre insectes tiennent sur UNE ligne`, r.length === 4 && Math.max(...r) - Math.min(...r) <= 1, r);
    }
    // 9. DEVIS XYLOPHAGE, « Réglages du calcul » : une flèche dit qu'on peut l'ouvrir ; chaque libellé de rangée respire au-dessus de son champ.
    if (sec(9)) {
      await neuf(p); await L.aller(p, 'devisXylo');
      const r0 = await p.evaluate(() => { const s = document.querySelector('#contenu .xy-reg > summary'); if (!s) return null; const a = getComputedStyle(s, '::after'); return { fleche: a.content, marqueur: getComputedStyle(s).listStyleType }; });
      v(`devis xylophage ${profil} : le résumé « Réglages du calcul » est trouvé (population)`, !!r0, r0);
      if (r0) v(`devis xylophage ${profil} : il porte une flèche (le triangle du navigateur est retiré par display:flex)`, /›/.test(r0.fleche), r0);
      await p.evaluate(() => { const d = document.querySelector('#contenu .xy-reg'); if (d) d.open = true; }); await L.calme(p, 400);
      const r = await p.evaluate(() => { const L2 = [...document.querySelectorAll('#contenu .xy-reg-c > .deux-champs')]; return L2.slice(1).map((d, i) => { const prev = L2[i].getBoundingClientRect(); const lab = d.querySelector('label'); return Math.round(lab.getBoundingClientRect().top - prev.bottom); }); });
      v(`devis xylophage ${profil} : les rangées de réglages sont comptées (population)`, r.length >= 3, r);
      v(`devis xylophage ${profil} : au moins 14 px entre un champ et le libellé de la rangée suivante`, r.length >= 3 && Math.min(...r) >= 14, r);
    }
    // 10. UNE ENTREPRISE SANS AUCUN SITE : l'écran le dit (au lieu d'un tableau vide sous « tout est à jour »), et la carte ne jette plus d'erreur.
    if (sec(10) && profil === 'mac') {
      const err0 = c.err.length;
      await p.evaluate(() => { window.__sv = { ...D3_CLI }; Object.keys(D3_CLI).forEach(k => delete D3_CLI[k]); });
      for (const [h, titre] of [['registre', 'Registre sanitaire'], ['carteBox', 'Carte des box']]) {
        await neuf(p); await L.aller(p, h);
        const r = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, texte: document.querySelector('#contenu').innerText, kpis: document.querySelectorAll('#contenu .kpi').length }));
        v(`${h} sans aucun site : l'écran porte son titre « ${titre} » (population)`, r.h1 === titre, r.h1);
        v(`${h} sans aucun site : il dit « Aucun site au registre pour l'instant »`, /Aucun site au registre pour l.instant/.test(r.texte), r.texte.slice(0, 200));
        v(`${h} sans aucun site : ni « Rien d'urgent », ni tuile à zéro, ni bouton « Saisir un passage »`, !/Rien d.urgent/.test(r.texte) && r.kpis === 0 && !/Saisir un passage/.test(r.texte), r);
      }
      v('sans aucun site : aucune erreur JavaScript levée', c.err.length === err0, c.err.slice(err0));
      await p.evaluate(() => { Object.assign(D3_CLI, window.__sv); });
    }
    // 11. UN CHEVRON NE RESTE JAMAIS SEUL SUR SA LIGNE : « Voir l'intervention / › » sur téléphone.
    if (sec(11)) {
      await neuf(p); await L.aller(p, 'registre'); await clic(p, '[data-rg="cli|t1"]', 600);
      const r = await p.evaluate(() => [...document.querySelectorAll('#contenu .lien')].filter(e => /›/.test(e.textContent)).map(e => { const g = document.createRange(); g.selectNodeContents(e); const R = [...g.getClientRects()]; return { t: e.textContent.trim().slice(0, 30), derniere: Math.round(R[R.length - 1].width), nbsp: / ›$/.test(e.textContent.trim()) }; }));
      v(`registre ${profil} : les liens à chevron sont comptés (population)`, r.length >= 1, r);
      v(`registre ${profil} : aucun chevron ne reste seul sur sa ligne (la dernière ligne fait plus de 24 px)`, r.every(x => x.derniere > 24 && x.nbsp), r);
    }
    await L.fin(c);
    if (profil !== 'mac' && c.err.length) console.log('  · erreurs JS', profil, c.err.slice(0, 3));
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
