// LE REGARD — gérant F, RETOUCHES de mise en page (18 novembre 2026) : un contrôle durable par retouche, mesuré au navigateur.
//   node scratchpad/proto-final/sondes/regard-gerant-f-retouches.js [n,n…]   →  « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// n : 2 « Fermer » aligné · 3 « Créer le devis » sur une ligne à 320 px · 4 graphique d'activité qui occupe sa carte ·
//     5 écran vide qui propose un geste · 6 fondu du menu · 7 bande diagonale des écrans vides de nuit · 8 « Planifier » a une cible.
// (la retouche 1, noms de zone contre pastilles, est gardée par regard-gerant-f-recontrole-plan.js)
const L = require('../lib.js');
const v = L.v, F = process.argv[2] || '', sec = n => !F || F.split(',').includes(String(n));
const PROFILS = ['mac', 'windows', 'ipad', 'iphone', 'android', 'petit'];
const neuf = p => p.evaluate(() => { try { d3Cli = 't1'; d3Ouvert = null; d3Sel = null; d3Mode = null; cbEdit = null; cbReleve = null; cbFiltre = 'tout'; cbZone = ''; rgTous = true; rgQ = ''; rgSaisie = null; DX = null; } catch (e) {} });
const clic = async (p, sel, att) => { const ok = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 500); return ok; };

// écart de pixels entre deux captures d'une même zone (PNG décodés DANS la page : aucune dépendance)
const ecart = (p, a, b) => p.evaluate(async ([x, y]) => { const lire = async t => { const im = await createImageBitmap(new Blob([Uint8Array.from(atob(t), ch => ch.charCodeAt(0))], { type: 'image/png' })), c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, c.width, c.height).data; };
  const A = await lire(x), B = await lire(y); let max = 0; for (let i = 0; i < A.length; i += 4) { const d = Math.max(Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2])); if (d > max) max = d; } return max; }, [a.toString('base64'), b.toString('base64')]);
(async () => {
  for (const nuit of [false, true]) for (const profil of PROFILS) {
    const tag = profil + (nuit ? ' nuit' : ' jour');
    const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
    await p.evaluate(() => mchPoser(['3d'])); await L.calme(p, 500);

    // 2. « Fermer » d'un aperçu de PDF : centré comme la barre de trois boutons au-dessus de lui
    if (sec(2)) {
      await neuf(p); await L.aller(p, 'registre'); await clic(p, '[data-rg="cli|t1"]', 600); const ok = await clic(p, '[data-rg^="pdf|"]', 900);
      const m = await p.evaluate(() => { const f = document.querySelector('#calque .doc-barre ~ .actions [data-ferme="1"]'), bar = document.querySelector('#calque .doc-barre'); if (!f || !bar) return null;
        const rb = [...bar.children].map(x => x.getBoundingClientRect()), g = Math.min(...rb.map(r => r.left)), d = Math.max(...rb.map(r => r.right)), rf = f.getBoundingClientRect();
        return { centreBarre: (g + d) / 2, centreFermer: (rf.left + rf.right) / 2, nBarre: rb.length }; });
      v(`${tag} : aperçu du PDF — la barre et « Fermer » sont mesurés (population)`, ok && !!m && m.nBarre >= 2, m);
      v(`${tag} : aperçu du PDF — « Fermer » centré sous la barre`, !!m && Math.abs(m.centreFermer - m.centreBarre) <= 2, m);
      await L.ranger(p);
    }

    // 3. « Créer le devis » ne passe pas sur deux lignes (téléphone : barre du bas ; sinon : carte du résultat)
    if (sec(3)) {
      await neuf(p); await L.aller(p, 'devisXylo'); await p.selectOption('[data-dx="cli"]', { index: 1 }); await clic(p, '[data-dxb="zadd|Combles|bois"]', 400);
      await p.evaluate(() => { const e = document.querySelector('[data-dx^="zm|"]'); e.value = '60'; e.dispatchEvent(new Event('input', { bubbles: true })); }); await L.calme(p, 600);
      const m = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-dxb="creer"]')].find(e => e.offsetParent !== null); if (!b) return null; const r = b.getBoundingClientRect(), cs = getComputedStyle(b), lh = parseFloat(cs.lineHeight) || 18;
        const rg = document.createRange(); rg.selectNodeContents(b); const lignes = new Set([...rg.getClientRects()].map(x => Math.round(x.top))).size; return { h: Math.round(r.height), lignes, texte: b.textContent.trim(), w: Math.round(r.width), lh }; });
      v(`${tag} : devis xylophage — le bouton « Créer le devis » est mesuré (population)`, !!m && /Créer le devis/.test(m.texte), m);
      v(`${tag} : devis xylophage — « Créer le devis » tient sur une ligne`, !!m && m.lignes === 1, m);
      await L.ranger(p);
    }

    // 6. le fondu du haut du menu ne grise pas une entrée entièrement visible : pour chaque entrée dont toute la rangée est dans la liste, on compare son texte, avec et sans le fondu
    if (sec(6) && ['mac', 'windows', 'ipad'].includes(profil)) {   // sur téléphone le menu est un tiroir : même feuille de style, mesuré par la planche
      await neuf(p); await L.aller(p, 'registre');
      const aff = await p.evaluate(() => { const l = document.querySelector('.menu .m-liste'); if (!l) return null; const a = l.querySelector('a[aria-current], a.on, a.actif') ; return { sh: l.scrollHeight, ch: l.clientHeight, top: Math.round(l.scrollTop), haut: l.classList.contains('m-plus-haut') }; });
      // on descend la liste au maximum : la dernière entrée est visible, celles du haut passent dans le fondu
      for (const pos of ['courant', 'bas', 'milieu']) {
        await p.evaluate(q => { const l = document.querySelector('.menu .m-liste'); if (!l) return; if (q === 'bas') l.scrollTop = l.scrollHeight; else if (q === 'milieu') l.scrollTop = Math.round((l.scrollHeight - l.clientHeight) / 2); l.dispatchEvent(new Event('scroll')); }, pos); await L.calme(p, 300);
        const cibles = await p.evaluate(() => { const l = document.querySelector('.menu .m-liste'), m = l.getBoundingClientRect(), out = [];
          for (const a of l.querySelectorAll('a')) { const n = a.querySelector('.m-n') || a, rg = document.createRange(); rg.selectNodeContents(n); const rs = [...rg.getClientRects()].filter(r => r.width > 2 && r.height > 4); if (!rs.length) continue;
            const g = Math.min(...rs.map(r => r.left)), d = Math.max(...rs.map(r => r.right)), t = Math.min(...rs.map(r => r.top)), b = Math.max(...rs.map(r => r.bottom));
            const ra = a.getBoundingClientRect(); if (ra.top >= m.top - 0.5 && ra.bottom <= m.bottom + 0.5) out.push({ nom: n.textContent.trim().slice(0, 40), x: g, y: t, w: d - g, h: b - t }); }
          return { liste: { top: Math.round(m.top), bottom: Math.round(m.bottom), haut: l.classList.contains('m-plus-haut'), bas: l.classList.contains('m-plus-bas'), scroll: Math.round(l.scrollTop) }, out }; });
        const pires = [];
        for (const k of cibles.out) { const clip = { x: k.x, y: k.y, width: Math.max(1, k.w), height: Math.max(1, k.h) };
          const avec = await p.screenshot({ clip });
          await p.addStyleTag({ content: '.menu .m-liste{-webkit-mask-image:none!important;mask-image:none!important}' }).then(async h => { await L.calme(p, 100); k.sans = await p.screenshot({ clip }); await h.evaluate(e => e.remove()); });
          k.ecart = await ecart(p, avec, k.sans); pires.push([k.ecart, k.nom]); }
        pires.sort((a, b) => b[0] - a[0]);
        v(`${tag} : menu (${pos}) — des lignes de texte entièrement visibles sont mesurées (population)`, cibles.out.length >= 5, { n: cibles.out.length, liste: cibles.liste });
        v(`${tag} : menu (${pos}) — le fondu ne grise aucune entrée entièrement visible (écart ≤ 12/255)`, pires.length > 0 && pires[0][0] <= 12, pires.slice(0, 3));
      }
    }

    // 8. « Planifier » du registre a une cible réelle : la fiche d'un site sans intervention prévue (t2) porte le bouton, et il ouvre la création d'une visite
    if (sec(8)) {
      await neuf(p); await L.aller(p, 'registre'); await clic(p, '[data-rg="cli|t2"]', 600);
      const cible = await p.evaluate(() => [...document.querySelectorAll('[data-rg^="planifier|"]')].filter(e => e.offsetParent !== null).map(e => e.dataset.rg));
      v(`${tag} : registre — « Planifier » a une cible sur la fiche d'un site sans intervention prévue`, cible.length === 1 && cible[0] === 'planifier|t2', cible);
      await clic(p, '[data-rg="planifier|t2"]', 900);
      const ouvert = await p.evaluate(() => ({ site: typeof CREA !== 'undefined' && !!CREA && CREA.rgSite, type: typeof CREA !== 'undefined' && !!CREA && CREA.type, titre: [...document.querySelectorAll('h1,h2')].some(h => /Nouvelle intervention/.test(h.textContent) && h.offsetParent !== null) }));
      v(`${tag} : registre — « Planifier » ouvre la création d'une visite de contrôle`, ouvert.site === 't2' && ouvert.type === 'Visite de contrôle' && ouvert.titre, ouvert);
      await L.ranger(p);
    }

    // 4. le graphique d'activité occupe sa carte : les colonnes couvrent au moins 80 % de la largeur intérieure (trois barres serrées à gauche d'une carte de 1 100 px, avant)
    if (sec(4)) {
      await neuf(p); await L.aller(p, 'registre'); await clic(p, '[data-rg="cli|t1"]', 600);
      const m = await p.evaluate(() => { const h = document.querySelector('.d3-histo'); if (!h) return null; const car = h.getBoundingClientRect(), cs = getComputedStyle(h), cols = [...h.querySelectorAll('.d3-h')].map(x => x.getBoundingClientRect());
        const g = Math.min(...cols.map(r => r.left)), d = Math.max(...cols.map(r => r.right)), larg = car.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        return { n: cols.length, part: Math.round((d - g) / larg * 100) / 100, carte: Math.round(car.width), colonnes: Math.round(d - g), defile: h.scrollWidth > h.clientWidth + 1 }; });
      v(`${tag} : activité — le graphique est mesuré (population : au moins 3 colonnes)`, !!m && m.n >= 3, m);
      v(`${tag} : activité — les colonnes occupent au moins 80 % de la carte, sans défiler`, !!m && m.part >= 0.8 && !m.defile, m);
    }

    // 5. un écran vide propose le geste qui le remplit : le bouton existe, se voit, tient dans l'écran, et mène quelque part
    if (sec(5)) {
      await p.evaluate(() => { window.__cli = { ...D3_CLI }; Object.keys(D3_CLI).forEach(k => delete D3_CLI[k]); });
      for (const [page, attendu, cible] of [['registre', 'clients', '#clients'], ['carteBox', 'clients', '#clients']]) {
        await neuf(p); await L.aller(p, page);
        const m = await p.evaluate(() => { const e = document.querySelector('#contenu [data-vide] [data-go]'); if (!e) return null; const r = e.getBoundingClientRect(); return { go: e.dataset.go, texte: e.textContent.trim(), dedans: r.left >= 0 && r.right <= innerWidth + 0.5 && r.width > 40, haut: Math.round(r.height) }; });
        v(`${tag} : ${page} sans site — l'écran vide porte un bouton (population)`, !!m, m);
        v(`${tag} : ${page} sans site — le bouton « ${m && m.texte} » est entier à l'écran et assez haut pour un doigt`, !!m && m.dedans && m.haut >= 36, m);
        if (m) { await clic(p, '#contenu [data-vide] [data-go]', 700); const h = await p.evaluate(() => location.hash); v(`${tag} : ${page} sans site — le bouton mène à « ${attendu} »`, h === cible, h); }
      }
      await p.evaluate(() => { Object.assign(D3_CLI, window.__cli); });
    }
    await L.fin(c);
  }

  // 5 bis. la technicienne (sm) : « Aucun site au registre sur ta journée » propose « Voir ma journée »
  if (sec(5)) for (const profil of ['mac', 'petit']) for (const nuit of [false, true]) {
    const tag = profil + (nuit ? ' nuit' : ' jour') + ' (technicienne)', c = await L.ouvrir({ profil, qui: 'sm', nuit }), p = c.p;
    await p.evaluate(() => mchPoser(['3d'])); await L.calme(p, 500);
    await p.evaluate(() => { Object.keys(D3_CLI).forEach(k => delete D3_CLI[k]); }); await neuf(p); await L.aller(p, 'registre');
    const m = await p.evaluate(() => { const e = document.querySelector('#contenu [data-vide] [data-go]'); if (!e) return null; const r = e.getBoundingClientRect(); return { go: e.dataset.go, texte: e.textContent.trim(), dedans: r.left >= 0 && r.right <= innerWidth + 0.5, haut: Math.round(r.height) }; });
    v(`${tag} : registre sans site — bouton « Voir ma journée » entier et mesuré`, !!m && m.go === 'majournee' && m.dedans && m.haut >= 36, m);
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('✗ sonde tombée : ' + (e.stack || e)); try { await L.fermer(); } catch (x) {} process.exit(1); });
