// LE REGARD, SECOND REGARD — bureau (Julie), recontrôle des neuf défauts corrigés par « regard-bureau-a » (18 novembre 2026).
// Le premier passage a gardé CHAQUE défaut là où il l'avait vu (regard-bureau-a.js). Celui-ci garde ce qu'il ne pouvait pas voir :
// les VOISINS qui partagent les mêmes règles (autres rôles, autres écrans, autres largeurs) — une règle corrigée pour un écran ne doit
// rien abîmer à côté. Rejouable seul : node scratchpad/proto-final/sondes/regard-bureau-a-recontrole.js [sections, ex. « 1,3 »]
// Sortie « N ✓ · M ✗ », code 1 si un contrôle tombe. Les CONSTATS (défauts neufs, non corrigés ici : on ne touche aucune page) s'impriment
// à part, sans compter comme échec — ils sont rendus dans regard-bureau-a-recontrole.json.
// Les trois ✗ de la première passe (fiche intervention en retard à 320 px, fiche « M. et Mme Durand » à 320 px) sont réglés ; § 5 garde les références de pièces de la TVA, § 6 les sept
//    retouches du second regard (18 novembre 2026) — chacune éprouvée par une mutation (scratchpad/proto-final/sondes/mutations-regard-bureau-a-recontrole.py).
// ⛔ 127.0.0.1 seulement, entreprise fictive, aucun serveur.
const L = require('../lib.js');
const v = L.v, F = process.argv[2] || '', G = process.argv[3] || '', sec = n => !F || F.split(',').includes(n), sub = n => !G || G.split(',').includes(n);   // 2ᵉ argument : une lettre de § 6 (« 6 a » = node … 6 a)
const constats = [];
(async () => {
  // 1. « N tâche(s) ouverte(s) » (.t-ici) : le premier passage l'a gardé sur contrat et facture, vus par Julie. La règle `.t-ici summary b{nowrap}` est
  //    PARTAGÉE : fiche client (jusqu'à « 4 tâches ouvertes »), intervention, facture, contrat, et tous les rôles qui les ouvrent. Population : on compte ce qu'on a trouvé.
  if (sec('1')) {
    let trouves = 0;
    for (const qui of ['julie', 'marc', 'kb', 'sm']) for (const profil of ['petit', 'android']) {
      const c = await L.ouvrir({ profil, qui });
      for (const h of ['inter-x-i2', 'inter-x-i9', 'client-x-md', 'client-x-hp', 'contrat-x-c1', 'facture-x-f144', 'facture-x-f128']) {
        try { await L.aller(c.p, h); } catch (e) { continue; }
        const r = await c.p.evaluate(() => { const s = document.querySelector('#contenu .t-ici summary'); if (!s) return null; const b = s.querySelector('b'), cs = getComputedStyle(b), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.3;
          const carte = s.closest('.t-ici'), rs = s.getBoundingClientRect(), rc = carte.getBoundingClientRect();
          // le texte long : la règle doit tenir aussi pour « 12 tâches ouvertes »
          const avant = b.textContent; b.textContent = '12 tâches ouvertes'; const h2 = b.getBoundingClientRect().height; b.textContent = avant;
          return { txt: avant, une: b.getBoundingClientRect().height < lh * 1.6, douze: h2 < lh * 1.6, dedans: rs.right <= rc.right + 1 && s.scrollWidth <= s.clientWidth + 1, ws: cs.whiteSpace }; });
        if (!r) continue; trouves++;
        v(`tâches « ${r.txt} » ${qui} ${profil} ${h} : une ligne, « 12 tâches ouvertes » aussi, et le résumé reste dans sa carte`, r.une && r.douze && r.dedans && r.ws === 'nowrap', r);
        const d = await L.deborde(c); v(`tâches ${qui} ${profil} ${h} : la page ne glisse pas de côté`, d.bouge === 0, d);
      }
      await L.fin(c);
    }
    v('tâches : la population est trouvée (au moins 20 fiches mesurées, tous rôles)', trouves >= 20, trouves);
  }

  // 2. Les rangées de la Comptabilité qui partagent `.cx-cats` et `.cx-outils .seg` : Factures, Achats, mais aussi Paiements (Sens + Moyen) et Banque.
  //    Le premier passage a gardé Achats et Factures ; ici, tous les écrans qui portent l'une des deux rangées, et le dernier chip doit pouvoir être ATTEINT au doigt.
  if (sec('2')) {
    let rangees = 0;
    for (const profil of ['petit', 'android', 'iphone']) for (const nuit of [false, true]) {
      const c = await L.ouvrir({ profil, qui: 'julie', nuit });
      for (const o of ['fventes', 'fachats', 'paiements', 'banque', 'clients', 'contrats', 'fournisseurs', 'ndf']) {
        await c.p.evaluate(x => { cxAller(x); }, o); await L.calme(c.p, 600);
        const r = await c.p.evaluate(() => { const sortie = [];
          for (const row of document.querySelectorAll('#contenu .cx-cats, #contenu .cx-outils .seg')) { if (!row.offsetParent) continue; const cr = row.getBoundingClientRect(), bts = [...row.querySelectorAll('button')]; if (!bts.length) continue;
            const defile = row.scrollWidth > row.clientWidth + 2; row.scrollLeft = row.scrollWidth; const dernier = bts[bts.length - 1].getBoundingClientRect(); const marge = cr.right - dernier.right; row.scrollLeft = 0;
            const coupes = bts.filter(b => b.scrollWidth > b.clientWidth + 1 && getComputedStyle(b).textOverflow === 'ellipsis').length;
            sortie.push({ cls: row.className.split(' ')[0] + ' « ' + (row.getAttribute('aria-label') || '') + ' »', defile, atteint: !defile || marge >= 4 || dernier.right <= innerWidth - 4, coupes, l: Math.round(cr.width), vue: cr.right <= innerWidth + 1 && cr.left >= -1 }); }
          return sortie; });
        for (const x of r) { rangees++; v(`compta ${o} ${profil} ${nuit ? 'nuit' : 'jour'} : ${x.cls} (${x.defile ? 'défile' : 'à la ligne'}) tient dans l'écran, rien de coupé, dernier chip atteignable`, x.vue && x.atteint && x.coupes === 0, x); }
        const d = await L.deborde(c); v(`compta ${o} ${profil} ${nuit ? 'nuit' : 'jour'} : la page ne glisse pas de côté`, d.bouge === 0, d);
      }
      await L.fin(c);
    }
    v('compta : au moins 30 rangées mesurées (population)', rangees >= 30, rangees);
  }

  // 3. Les tableaux de carte au téléphone (la pastille passe à la ligne, `@media ≤760`) : tous ceux qu'on atteint depuis le bureau — fiches client (onglet Factures
  //    de chacun des huit clients), contrat, facture — pas seulement le Cabinet dentaire du premier passage.
  if (sec('3')) {
    let tableaux = 0;
    for (const profil of ['petit', 'android', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      for (const h of ['vp', 'hp', 'md', 'mi', 'cm', 'cp', 'mr', 'rf']) {
        await L.aller(c.p, 'client-x-' + h);
        await c.p.evaluate(() => { const b = document.querySelector('[data-oc=factures]'); if (b) b.click(); }); await L.calme(c.p, 500);
        const r = await c.p.evaluate(() => { const sortie = []; for (const t of document.querySelectorAll('#contenu .tableau table')) { if (!t.offsetParent) continue; const carte = t.closest('.tableau'), rc = carte.getBoundingClientRect(), tr = t.getBoundingClientRect();
          const sort = [...t.querySelectorAll('td *, th *')].filter(e => !e.children.length && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().right > rc.right + 1).length;
          sortie.push({ lignes: t.querySelectorAll('tbody tr').length, dedans: tr.right <= rc.right + 1, sort, defile: carte.scrollWidth > carte.clientWidth + 1 }); } return sortie; });
        for (const x of r) { tableaux++; v(`client ${h} › factures ${profil} : le tableau (${x.lignes} ligne(s)) reste dans sa carte et rien n'en sort`, x.dedans && x.sort === 0 && !x.defile, x); }
      }
      await L.fin(c);
    }
    v('tableaux : population trouvée (au moins 10 tableaux)', tableaux >= 10, tableaux);
  }

  // 4. Les lignes d'une facture : le prix unitaire passe sous la désignation au téléphone ; sur ordinateur et tablette, les QUATRE colonnes restent (rien de caché à tort).
  //    Les huit factures, pas seulement la 128.
  if (sec('4')) {
    let fiches = 0;
    for (const profil of ['petit', 'android', 'iphone', 'ipad', 'mac', 'windows']) {
      const c = await L.ouvrir({ profil, qui: 'julie' }), tel = c.largeur <= 760;
      for (const f of ['f145', 'f144', 'f143', 'f142', 'f141', 'f140', 'f128', 'f121']) {
        await L.aller(c.p, 'facture-x-' + f);
        const r = await c.p.evaluate(() => { const t = document.querySelector('table.fac-lig'); if (!t) return null; const carte = t.closest('.carte'), rc = carte.getBoundingClientRect(), th = [...t.querySelectorAll('thead th')].map(x => ({ t: x.textContent.trim(), w: Math.round(x.getBoundingClientRect().width) }));
          const des = t.querySelector('tbody td'); return { th, des: Math.round(des.getBoundingClientRect().width), dedans: t.getBoundingClientRect().right <= rc.right + 1, q: !!t.querySelector('.l-q') }; });
        if (!r) continue; fiches++;
        if (tel) v(`facture ${f} ${profil} : la désignation a la place (${r.des} px), la colonne du prix unitaire est refermée et le tableau reste dans la carte`, r.des >= 140 && r.th[1].w <= 2 && r.dedans, r);
        else v(`facture ${f} ${profil} : les quatre colonnes sont là, le prix unitaire n'est pas refermé (${r.th[1].w} px)`, r.th.length >= 4 && r.th[1].w >= 40 && r.dedans, r);
      }
      await L.fin(c);
    }
    v('factures : population trouvée (au moins 40 fiches mesurées)', fiches >= 40, fiches);
  }

  // 5. TVA › « Achats d'octobre » : les références de pièces (second regard, corrigé).
  if (sec('5')) {
    for (const profil of ['mac', 'windows', 'ipad', 'iphone', 'petit']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      await c.p.evaluate(() => cxAller('tva')); await L.calme(c.p, 700);
      const r = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .gris.petit')].filter(e => !e.children.length && /^✓/.test(e.textContent.trim())).map(e => ({ t: e.textContent.trim(), lignes: Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).lineHeight) || 16)) })));
      const rr = await c.p.evaluate(() => { const pj = [...document.querySelectorAll('#contenu .cp-pj')]; return { n: pj.length, coupes: pj.filter(e => e.getBoundingClientRect().height > (parseFloat(getComputedStyle(e).lineHeight) || 16) * 1.6).map(e => e.textContent) }; });
      v(`TVA › achats d'octobre ${profil} : aucune référence de pièce coupée au milieu de son identifiant (${rr.n} mots gardés insécables, au moins 6)`, rr.n >= 6 && rr.coupes.length === 0, rr);
      v(`TVA › achats d'octobre ${profil} : la coche est collée au premier mot de la pièce (jamais seule sur sa ligne)`, await c.p.evaluate(() => [...document.querySelectorAll('#contenu .gris.petit')].filter(e => e.querySelector('.cp-pj')).every(e => /^✓/.test(e.querySelector('.cp-pj').textContent))), 'cp-pj');
      await L.fin(c);
    }
  }
  // 6. Les sept retouches du second regard (18 novembre 2026), chacune à l'endroit où elle a été vue, jour ET nuit, et un voisin qui ne devait pas bouger.
  if (sec('6')) {
    // 6a. tableau client « M. et Mme Durand » à 320 px : la pastille d'état est ENTIÈRE dans la carte (265 px dans 254 avant) ; voisin : à 360 px le tableau n'a pas changé de forme
    if (sub('a')) for (const nuit of [false, true]) {
      const c = await L.ouvrir({ profil: 'petit', qui: 'julie', nuit });
      await L.aller(c.p, 'client-x-md'); await c.p.evaluate(() => { const b = document.querySelector('[data-oc=factures]'); if (b) b.click(); }); await L.calme(c.p, 500);
      const r = await c.p.evaluate(() => { const t = [...document.querySelectorAll('#contenu .tableau table')].find(x => x.offsetParent); const k = t.closest('.tableau').getBoundingClientRect(), st = [...t.querySelectorAll('.st')].map(e => e.getBoundingClientRect());
        return { lignes: t.querySelectorAll('tbody tr').length, tableau: Math.round(t.getBoundingClientRect().width), carte: Math.round(k.width), pastilles: st.length, dehors: st.filter(x => x.right > k.right + 0.5).length }; });
      v(`pastille d'état (client Durand › Factures, 320 px ${nuit ? 'nuit' : 'jour'}) : le tableau (${r.tableau} px) tient dans la carte (${r.carte} px), ${r.pastilles} pastille(s) entières`, r.lignes >= 1 && r.pastilles >= 1 && r.tableau <= r.carte && r.dehors === 0, r);
      await L.fin(c);
    }
    // 6b. fiche intervention en retard à 320 px : le résumé « N tâche(s) ouverte(s) » reste dans sa carte, la coche ✅ a disparu ; voisin : fiche client SANS retard, résumé sur une seule ligne
    if (sub('b')) for (const [profil, qui, nuit] of [['petit', 'julie', false], ['petit', 'marc', true], ['android', 'julie', false]]) {
      const c = await L.ouvrir({ profil, qui, nuit });
      await L.aller(c.p, 'inter-x-i9');
      const r = await c.p.evaluate(() => { const s = document.querySelector('#contenu .t-ici summary'); return s ? { dedans: s.scrollWidth <= s.clientWidth + 1, retard: !!s.querySelector('.t-retard'), coche: /✅/.test(s.textContent) || !!s.querySelector('[aria-hidden]'), txt: s.textContent.trim().slice(0, 50) } : null; });
      v(`tâche en retard (intervention i9, ${profil} ${qui} ${nuit ? 'nuit' : 'jour'}) : le résumé reste dans sa carte, la pastille « en retard » est là, aucune coche ✅`, !!r && r.retard && r.dedans && !r.coche, r);
      await L.aller(c.p, 'client-x-md');
      const w = await c.p.evaluate(() => { const s = document.querySelector('#contenu .t-ici summary'); return s ? { h: Math.round(s.getBoundingClientRect().height), retard: !!s.querySelector('.t-retard'), coche: !!s.querySelector('[aria-hidden]') } : null; });
      v(`voisin : fiche client Durand (${profil}) : le résumé reste sur une ligne (${w && w.h} px) et sans coche`, !!w && w.h <= 50 && !w.coche, w);
      await L.fin(c);
    }
    // 6c. Devis, filtres sur iPad : les cinq sur UNE ligne ; voisin : Mac inchangé (une ligne, rembourrage d'origine 16 px), iPhone toujours en deux rangées
    if (sub('c')) for (const [profil, nuit, maxRangs] of [['ipad', false, 1], ['ipad', true, 1], ['mac', false, 1], ['iphone', false, 2]]) {
      const c = await L.ouvrir({ profil, qui: 'julie', nuit }); await L.aller(c.p, 'devis');
      const r = await c.p.evaluate(() => { const f = document.querySelector('#contenu .seg:has([data-dvf])'), b = [...f.querySelectorAll('button')], ys = [...new Set(b.map(x => Math.round(x.getBoundingClientRect().top)))]; return { n: b.length, rangs: ys.length, pad: getComputedStyle(b[0]).paddingLeft }; });
      v(`Devis, filtres (${profil} ${nuit ? 'nuit' : 'jour'}) : ${r.n} filtres sur ${r.rangs} rangée(s)`, r.n === 5 && (profil === 'iphone' ? r.rangs >= 2 : r.rangs === 1) && (profil === 'mac' ? r.pad === '16px' : true), r);
      await L.fin(c);
    }
    // 6d. Comptabilité › Ventes, sous-onglets : jamais d'orphelin au milieu (2 / 2) sur iPhone, Android, 320 px ; voisin : six onglets de la TVA (pas de grille de deux)
    if (sub('d')) for (const profil of ['iphone', 'android', 'petit']) for (const nuit of [false, true]) {
      const c = await L.ouvrir({ profil, qui: 'julie', nuit });
      const rangs = async o => { await c.p.evaluate(x => cxAller(x), o); await L.calme(c.p, 500); return c.p.evaluate(() => { const b = [...document.querySelectorAll('#contenu .cx-sous button')], ys = [...new Set(b.map(x => Math.round(x.getBoundingClientRect().top)))].sort((a, z) => a - z); return { n: b.length, rangs: ys.map(y => b.filter(x => Math.round(x.getBoundingClientRect().top) === y).length).join('/') }; }); };
      const a = await rangs('fventes'); v(`Ventes, sous-onglets (${profil} ${nuit ? 'nuit' : 'jour'}) : ${a.n} onglets rangés ${a.rangs}`, a.n === 4 && a.rangs === '2/2', a);
      const t = await rangs('tva'); v(`voisin : TVA, ${t.n} onglets (${profil} ${nuit ? 'nuit' : 'jour'}) gardent la ligne qui se coupe, pas la grille de deux (${t.rangs})`, t.n === 6 && !/^2\/2\/2$/.test(t.rangs), t);
      await L.fin(c);
    }
    // 6e. facture dans la liste Ventes à 320 px : l'objet est lisible (plus « R… »), sur trois lignes au plus ; voisin : à 390 px la ligne reste sur une seule ligne
    if (sub('e')) for (const [profil, nuit] of [['petit', false], ['petit', true], ['iphone', false]]) {
      const c = await L.ouvrir({ profil, qui: 'julie', nuit }); await c.p.evaluate(() => cxAller('fventes')); await L.calme(c.p, 500);
      await c.p.evaluate(() => { const b = document.querySelector('[data-cx="sec|factures"]'); if (b) b.click(); }); await L.calme(c.p, 600);
      const r = await c.p.evaluate(() => { const l = [...document.querySelectorAll('#contenu .cx-row .cx-doc .petit')].filter(e => /^FAC-/.test(e.textContent)); return { n: l.length, coupes: l.filter(e => e.scrollHeight > e.clientHeight + 1).length, lignes: l.map(e => Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).lineHeight) || 20))) }; });
      v(`facture dans Ventes (${profil} ${nuit ? 'nuit' : 'jour'}) : ${r.n} lignes, aucune coupée (jusqu'à ${Math.max(...r.lignes)} lignes)`, r.n >= 6 && r.coupes === 0 && (profil === 'iphone' ? Math.max(...r.lignes) === 1 : Math.max(...r.lignes) <= 3), r);
      await L.fin(c);
    }
    // 6f. fiche client : la tuile du prochain passage dit tout le titre (plus « …thermodyn… »), six onglets en 3 + 3 sur téléphone et iPad, une ligne au Mac
    if (sub('f')) for (const [profil, nuit] of [['mac', false], ['mac', true], ['iphone', false], ['android', true], ['petit', false], ['ipad', false]]) {
      const c = await L.ouvrir({ profil, qui: 'julie', nuit }); await L.aller(c.p, 'client-x-cm');
      const r = await c.p.evaluate(() => { const k = [...document.querySelectorAll('#contenu .kpis .kpi')][2], t = document.querySelector('#contenu [role=tablist][aria-label="Fiche client"]'), b = [...t.querySelectorAll('button')], ys = [...new Set(b.map(x => Math.round(x.getBoundingClientRect().top)))];
        return { tuile: k.textContent, rangs: ys.map(y => b.filter(x => Math.round(x.getBoundingClientRect().top) === y).length).join('/'), n: b.length, dehors: k.scrollWidth > k.clientWidth + 1 }; });
      v(`fiche client Martin (${profil} ${nuit ? 'nuit' : 'jour'}) : tuile « ${r.tuile.slice(5)} » en entier, onglets ${r.rangs}`, /thermodynamique/.test(r.tuile) && !/…/.test(r.tuile) && !r.dehors && r.n === 6 && (profil === 'mac' ? r.rangs === '6' : r.rangs === '3/3'), r);
      await L.fin(c);
    }
    // 6g. brouillon de devis : quantité et prix portent leur MOT à l'écran (téléphone, tablette) et leur aria-label ; au Mac l'en-tête de colonnes les nomme
    if (sub('g')) for (const [profil, nuit] of [['iphone', false], ['petit', true], ['ipad', false], ['mac', false]]) {
      const c = await L.ouvrir({ profil, qui: 'julie', nuit }); await L.aller(c.p, 'devis');
      const h = await c.p.evaluate(() => { const b = [...document.querySelectorAll('#contenu [data-go]')].find(x => /Brouillon/.test(x.textContent)); return b && b.dataset.go; }); await L.aller(c.p, h);
      const r = await c.p.evaluate(() => { const l = document.querySelector('#contenu .dv-lg:not(.dv-lg-t)'), et = [...l.querySelectorAll('.fac-et')].filter(e => getComputedStyle(e).display !== 'none').map(e => e.textContent), ch = [...l.querySelectorAll('input')], tete = document.querySelector('#contenu .dv-lg-t'), tv = tete && getComputedStyle(tete).display !== 'none';
        return { et, tete: tv, aria: ch.map(i => i.getAttribute('aria-label')), sw: document.documentElement.scrollWidth }; });
      const mot = profil === 'mac' ? r.tete : (r.et.includes('Qté') && r.et.includes('Prix unitaire HT'));
      v(`brouillon de devis (${profil} ${nuit ? 'nuit' : 'jour'}) : quantité et prix nommés à l'écran (${profil === 'mac' ? 'en-tête de colonnes' : r.et.join(' / ')}) et par aria-label (${r.aria.join(' / ')})`, mot && r.aria[1] === 'Quantité' && r.aria[2] === 'Prix unitaire HT' && r.sw <= (profil === 'iphone' ? 390 : profil === 'petit' ? 320 : profil === 'ipad' ? 820 : 1440), r);
      await L.fin(c);
    }
    // 6h. la coche ✅ devant « N tâche(s) ouverte(s) » : retirée du gabarit des fiches (client, intervention, facture, contrat) ; voisin : la coche de « Aucune tâche pour ce client » (état FAIT, vrai) reste
    if (sub('h')) {
      const c = await L.ouvrir({ profil: 'mac', qui: 'julie' }); let n = 0, avec = 0;
      for (const h of ['client-x-md', 'client-x-hp', 'inter-x-i9', 'inter-x-i2', 'contrat-x-c1', 'facture-x-f144']) { await L.aller(c.p, h); const r = await c.p.evaluate(() => { const s = document.querySelector('#contenu .t-ici summary'); return s ? { coche: !!s.querySelector('[aria-hidden]') || /✅/.test(s.textContent) } : null; }); if (r) { n++; if (r.coche) avec++; } }
      v(`coche ✅ des tâches ouvertes : ${n} fiches mesurées (au moins 5), aucune ne la porte (${avec})`, n >= 5 && avec === 0, { n, avec });
      await L.aller(c.p, 'client-x-cm'); const vide = await c.p.evaluate(() => /✅\s*Aucune tâche/.test(document.querySelector('#contenu').textContent)); v('voisin : « Aucune tâche pour ce client » garde sa coche (état fait)', vide, vide);
      await L.fin(c);
    }
  }
  constats.forEach(x => console.log('  CONSTAT', x));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); L.fermer().then(() => process.exit(2)); });
