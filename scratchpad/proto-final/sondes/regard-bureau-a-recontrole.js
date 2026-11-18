// LE REGARD, SECOND REGARD — bureau (Julie), recontrôle des neuf défauts corrigés par « regard-bureau-a » (18 novembre 2026).
// Le premier passage a gardé CHAQUE défaut là où il l'avait vu (regard-bureau-a.js). Celui-ci garde ce qu'il ne pouvait pas voir :
// les VOISINS qui partagent les mêmes règles (autres rôles, autres écrans, autres largeurs) — une règle corrigée pour un écran ne doit
// rien abîmer à côté. Rejouable seul : node scratchpad/proto-final/sondes/regard-bureau-a-recontrole.js [sections, ex. « 1,3 »]
// Sortie « N ✓ · M ✗ », code 1 si un contrôle tombe. Les CONSTATS (défauts neufs, non corrigés ici : on ne touche aucune page) s'impriment
// à part, sans compter comme échec — ils sont rendus dans regard-bureau-a-recontrole.json.
// ⚠️ Trois ✗ sont ATTENDUS tant que deux défauts réels ne sont pas réglés (rendus dans regard-bureau-a-recontrole.json) : § 1, « 1 tâche ouverte » de la fiche
//    intervention à 320 px quand une tâche est en retard (julie, marc : le petit texte sort du résumé de 19 px) ; § 3, la fiche client « M. et Mme Durand »
//    (onglet Factures, 320 px) dont la pastille d'état sort de la carte de 11 px. Ils tombent le jour où la règle est corrigée.
// ⛔ 127.0.0.1 seulement, entreprise fictive, aucun serveur.
const L = require('../lib.js');
const v = L.v, F = process.argv[2] || '', sec = n => !F || F.split(',').includes(n);
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

  // 5. CONSTATS NEUFS (pas des contrôles qui échouent : on ne touche aucune page ici, on mesure pour le dire).
  if (sec('5')) {
    for (const profil of ['mac', 'windows', 'ipad', 'iphone', 'petit']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      await c.p.evaluate(() => cxAller('tva')); await L.calme(c.p, 700);
      const r = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .gris.petit')].filter(e => !e.children.length && /^✓/.test(e.textContent.trim())).map(e => ({ t: e.textContent.trim(), lignes: Math.round(e.getBoundingClientRect().height / (parseFloat(getComputedStyle(e).lineHeight) || 16)) })));
      const coupees = r.filter(x => x.lignes > 1);
      v(`constat TVA › achats d'octobre ${profil} : population trouvée (les pièces justificatives)`, r.length >= 3, r.length);
      if (coupees.length) constats.push(`TVA › « Achats d'octobre » ${profil} : ${coupees.length}/${r.length} références coupées sur plusieurs lignes (« ${coupees[0].t} » sur ${coupees[0].lignes})`);
      await L.fin(c);
    }
  }
  constats.forEach(x => console.log('  CONSTAT', x));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); L.fermer().then(() => process.exit(2)); });
