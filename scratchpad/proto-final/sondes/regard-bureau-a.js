// LE REGARD — bureau (Julie, gestion des factures), rubriques Mes tâches · Interventions · Clients · Devis · Contrats · Comptabilité.
// Contrôles DURABLES des défauts de mise en page vus sur les captures (regard-bureau-a-captures.js) puis corrigés à la source.
// Rejouable seul : node scratchpad/proto-final/sondes/regard-bureau-a.js [numéros de contrôle, ex. « 1,3 »]  →  « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// Chaque défaut : la mesure qui l'accuse est celle qui le garde (on a vu la capture, on l'a corrigé, puis on mesure).
// ⛔ 127.0.0.1 seulement, entreprise fictive, aucun serveur.
const L = require('../lib.js');
const v = L.v, F = process.argv[2] || '', sec = n => !F || F.split(',').includes(n);
const LONG60 = 'Établissements Hospitaliers du Littoral Atlantique Sud-Ouest SA';
(async () => {
  // 1. FACTURE, les lignes au téléphone : trois colonnes (désignation, prix unitaire, total) laissaient ~100 px à la désignation (six lignes de texte)
  //    et un total de « 12 351,67 € » sortait de la carte. Le prix unitaire passe sous la désignation (« 1 127,27 € × 1 ») et sa colonne se referme.
  if (sec('1')) {
    for (const profil of ['petit', 'android', 'iphone']) for (const nuit of [false, true]) for (const long of [false, true]) {
      const c = await L.ouvrir({ profil, qui: 'julie', nuit });
      if (long) await c.p.evaluate(() => { FACTURES.forEach((f, n) => { f.ht = 12345.67 + n; f.objet = 'Remplacement complet du groupe extérieur et reprise des liaisons · 30/10'; }); });
      await L.aller(c.p, 'facture-x-f128');
      const r = await c.p.evaluate(() => { const t = document.querySelector('table.fac-lig'); if (!t) return null; const carte = t.closest('.carte'), cr = carte.getBoundingClientRect(), tr = t.getBoundingClientRect();
        const th = [...t.querySelectorAll('thead th')].map(e => e.getBoundingClientRect().width), td = t.querySelector('tbody tr td'), q = t.querySelector('tbody .l-q'), tot = [...t.querySelectorAll('tbody tr')].map(x => x.lastElementChild.getBoundingClientRect());
        return { th, des: td.getBoundingClientRect().width, qtxt: q ? q.textContent : '', qvu: q && getComputedStyle(q).display !== 'none', sortie: tr.right - cr.right, defile: carte.scrollWidth - carte.clientWidth, totDedans: tot.every(r => r.right <= cr.right + 0.5 && r.left >= cr.left) }; });
      const tag = `facture ${profil} ${nuit ? 'nuit' : 'jour'}${long ? ' (montants longs)' : ''}`;
      v(`${tag} : la table des lignes est trouvée (population)`, !!r, r);
      if (r) {
        v(`${tag} : la colonne du prix unitaire est refermée (${r.th[1]} px)`, r.th[1] <= 1, r.th);
        v(`${tag} : le prix unitaire se lit sous la désignation (« ${r.qtxt} »)`, r.qvu && /€/.test(r.qtxt) && /×/.test(r.qtxt), r);
        v(`${tag} : la désignation a au moins ${profil === 'petit' ? 120 : 150} px (${Math.round(r.des)})`, r.des >= (profil === 'petit' ? 120 : 150), r);
        v(`${tag} : la table reste dans sa carte, rien ne défile de côté`, r.sortie <= 0.5 && r.defile <= 1 && r.totDedans, r);
      }
      await L.fin(c);
    }
  }
  // 2. INTERVENTIONS, liste vide : « Rien ici. » ne disait ni pourquoi ni quoi faire. Une phrase par filtre ; sur « Toutes », la marche à suivre.
  if (sec('2')) {
    for (const profil of ['mac', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      await c.p.evaluate(() => { INTS.length = 0; });
      for (const [f, motif] of [['auj', /aujourd’hui/], ['avenir', /à venir/], ['plan', /planifier/], ['fait', /terminée/], ['tout', /Nouvelle intervention/]]) {
        await L.aller(c.p, 'interventions'); await c.p.evaluate(x => document.querySelector(`[data-filtreint=${x}]`).click(), f); await L.calme(c.p, 400);
        const t = await c.p.evaluate(() => { const z = [...document.querySelectorAll('#contenu .liste-bureau td.gris, #contenu .liste-tel > .gris')].filter(e => e.offsetParent); return z.map(e => e.textContent.trim()); });
        v(`interventions vides ${profil} · ${f} : une seule phrase est affichée (population)`, t.length === 1, t);
        v(`interventions vides ${profil} · ${f} : elle dit quoi (« ${(t[0] || '').slice(0, 60)} »)`, t.length === 1 && t[0] !== 'Rien ici.' && motif.test(t[0]), t);
      }
      await L.fin(c);
    }
  }
  // 3. CLIENTS « Par mois » sans client : l'écran restait BLANC sous le sélecteur. Les trois rangements disent quelque chose.
  if (sec('3')) {
    for (const profil of ['mac', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      await c.p.evaluate(() => { INTS.length = 0; FACTURES.length = 0; Object.keys(CLIENTS).forEach(k => delete CLIENTS[k]); });
      for (const r of ['tous', 'semaine', 'mois']) {
        await L.aller(c.p, 'clients'); await c.p.evaluate(x => document.querySelector(`[data-rangc=${x}]`).click(), r); await L.calme(c.p, 400);
        const t = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .carte.gris')].filter(e => e.offsetParent).map(e => e.textContent.trim()));
        v(`clients vides ${profil} · ${r} : un message est affiché (« ${(t[0] || '').slice(0, 50)} »)`, t.length === 1 && t[0].length > 25, t);
      }
      await L.fin(c);
    }
  }
  // 4. TÉLÉPHONE : un numéro ne se coupe pas en fin de ligne (« 05 46 00 » puis « 11 22 »). Espaces insécables sur la fiche « à planifier » et l'en-tête du client.
  if (sec('4')) {
    for (const profil of ['petit', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      for (const [h, motif] of [['inter-x-i5', 'fiche à planifier'], ['client-x-hp', 'en-tête du client']]) {
        await L.aller(c.p, h);
        const r = await c.p.evaluate(() => { const re = /\d{2}[  ]\d{2}[  ]\d{2}[  ]\d{2}[  ]\d{2}/; const z = [...document.querySelectorAll('#contenu .tete span.gris')].map(e => e.textContent).filter(t => re.test(t)); return { n: z.length, coupable: z.some(t => /\d{2} \d{2}/.test(t.match(re)[0])), txt: z[0] }; });
        v(`téléphone ${profil} · ${motif} : le numéro est lu (population)`, r.n === 1, r);
        v(`téléphone ${profil} · ${motif} : le numéro est tenu par des espaces insécables`, r.n === 1 && !r.coupable, r);
      }
      await L.fin(c);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
