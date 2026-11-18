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
  // 2. INTERVENTIONS, liste vide : « Rien ici. » ne disait ni pourquoi ni quoi faire. Une carte par filtre (titre + une phrase) ; « Toutes » et « À venir » proposent le geste.
  //    (La carte elle-même est celle de la voie « restes interventions » ; ce contrôle garde que les cinq filtres la montrent, et jamais le « Rien ici. » nu.)
  if (sec('2')) {
    for (const profil of ['mac', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      await c.p.evaluate(() => { INTS.length = 0; });
      for (const [f, motif, geste] of [['auj', /aujourd’hui/, true], ['avenir', /à venir/, true], ['plan', /planifier/, false], ['fait', /terminée/, false], ['tout', /Aucune intervention/, true]]) {
        await L.aller(c.p, 'interventions'); await c.p.evaluate(x => document.querySelector(`[data-filtreint=${x}]`).click(), f); await L.calme(c.p, 400);
        const t = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .t-vide')].filter(e => e.offsetParent).map(e => ({ titre: (e.querySelector('b') || {}).textContent || '', phrase: (e.querySelector('span') || {}).textContent || '', bouton: !!e.querySelector('[data-creer]') })));
        v(`interventions vides ${profil} · ${f} : une seule carte est affichée (population)`, t.length === 1, t);
        v(`interventions vides ${profil} · ${f} : elle dit quoi (« ${(t[0] || {}).titre} »)`, t.length === 1 && motif.test(t[0].titre + ' ' + t[0].phrase) && t[0].phrase.length > 25 && t[0].titre !== 'Rien ici.', t);
        v(`interventions vides ${profil} · ${f} : ${geste ? 'le geste « Nouvelle intervention » est proposé' : 'pas de bouton de création (le filtre ne se remplit pas par là)'}`, t.length === 1 && t[0].bouton === geste, t);
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
  // 5. ACHATS au téléphone : la rangée des catégories sortait de l'écran sans signe (« Véhicules & carburant » n'existait pas pour qui ne devinait pas de glisser), et le filtre
  //    « Sans justificatif » se lisait « Sans justific ». La rangée défile toujours mais son bord droit s'estompe ; les filtres passent à la ligne comme ceux des devis.
  if (sec('5')) {
    for (const profil of ['petit', 'android', 'iphone']) for (const nuit of [false, true]) {
      const c = await L.ouvrir({ profil, qui: 'julie', nuit }), larg = L.PROFILS[profil].w;
      await L.aller(c.p, 'comptabilite'); await c.p.evaluate(() => cxAller('fachats')); await L.calme(c.p, 700);
      const r = await c.p.evaluate(() => { const g = document.querySelector('#contenu .cx-cats'), sg = document.querySelector('#contenu .cx-outils .seg'); if (!g || !sg) return null;
        const mk = getComputedStyle(g).maskImage || getComputedStyle(g).webkitMaskImage, gr = g.getBoundingClientRect(), sr = sg.getBoundingClientRect();
        return { puces: g.children.length, defile: g.scrollWidth > g.clientWidth + 1, fondu: !!mk && mk !== 'none', padD: parseFloat(getComputedStyle(g).paddingRight), droite: gr.right,
          filtres: [...sg.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return { t: b.textContent.trim(), dedans: q.left >= sr.left - 0.5 && q.right <= sr.right + 0.5, enBoite: b.scrollWidth <= b.clientWidth + 1 }; }), sgDefile: sg.scrollWidth - sg.clientWidth };
      });
      const tag = `achats ${profil} ${nuit ? 'nuit' : 'jour'}`;
      v(`${tag} : la rangée des catégories et les filtres sont trouvés (population)`, !!r && r.puces >= 3 && r.filtres.length >= 4, r);
      if (r) {
        v(`${tag} : les catégories défilent (${r.puces} puces) et leur bord droit s'estompe`, !r.defile || r.fondu, r);
        v(`${tag} : le dernier chip a de la marge pour sortir du fondu (${r.padD} px)`, !r.defile || r.padD >= 36, r);
        v(`${tag} : chaque filtre est tout entier dans sa boîte (« ${r.filtres.map(f => f.t).join(' · ')} »)`, r.filtres.every(f => f.dedans && f.enBoite), r);
        v(`${tag} : la boîte des filtres ne défile pas de côté`, r.sgDefile <= 1, r);
      }
      await L.fin(c);
    }
  }
  // 6. FICHE CONTRAT / FACTURE à 320 px : « 1 tâche ouverte » se coupait en deux lignes (« 1 tâche / ouverte ») pendant que « pour ce contrat » gardait sa largeur.
  if (sec('6')) {
    for (const [h, motif] of [['contrat-x-c1', 'contrat'], ['facture-x-f128', 'facture']]) for (const profil of ['petit', 'android', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      await L.aller(c.p, h);
      const r = await c.p.evaluate(() => { const b = document.querySelector('#contenu .t-ici summary b'); if (!b) return null; const lh = parseFloat(getComputedStyle(b).lineHeight) || parseFloat(getComputedStyle(b).fontSize) * 1.3;
        return { txt: b.textContent, h: b.getBoundingClientRect().height, lh, nowrap: getComputedStyle(b).whiteSpace }; });
      v(`tâches de la fiche ${motif} ${profil} : le résumé est trouvé (population)`, !!r, r);
      if (r) v(`tâches de la fiche ${motif} ${profil} : « ${r.txt} » tient sur UNE ligne (${Math.round(r.h)} px pour une ligne de ${Math.round(r.lh)})`, r.h < r.lh * 1.6 && r.nowrap === 'nowrap', r);
      await L.fin(c);
    }
  }
  // 7. NOM DE CLIENT LONG, lien « Nom › » : la flèche ne reste jamais seule sur sa ligne (espace insécable devant), sur les fiches qui portent le lien.
  if (sec('7')) {
    for (const [h, motif] of [['contrat-x-c1', 'contrat'], ['facture-x-f128', 'facture'], ['inter-x-i1', 'intervention']]) for (const profil of ['petit', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      await c.p.evaluate(() => { Object.values(CLIENTS).forEach(k => { k.nom = 'Établissements Hospitaliers du Littoral Atlantique Sud-Ouest SA'; }); });
      await L.aller(c.p, h);
      const r = await c.p.evaluate(() => { const b = [...document.querySelectorAll('#contenu .tete button.lien[data-go^="client-x-"]')][0]; if (!b) return null; const t = b.textContent;
        const tn = b.firstChild; const rg = document.createRange(); rg.setStart(tn, tn.length - 1); rg.setEnd(tn, tn.length); const fl = rg.getClientRects()[0], rg2 = document.createRange(); rg2.setStart(tn, 0); rg2.setEnd(tn, 1); const d = rg2.getClientRects()[0];
        const lignes = new Set([...(() => { const r2 = document.createRange(); r2.selectNodeContents(tn); return [...r2.getClientRects()].map(x => Math.round(x.top)); })()]);
        return { fin: JSON.stringify(t.slice(-3)), insecable: / ›$/.test(t), lignes: lignes.size, seule: (() => { const r3 = document.createRange(); r3.setStart(tn, tn.length - 2); r3.setEnd(tn, tn.length - 1); const a = r3.getClientRects()[0]; return a ? Math.round(a.top) !== Math.round(fl.top) : false; })() }; });
      v(`lien du client (${motif}) ${profil} : trouvé, nom de 60 signes (population)`, !!r, r);
      if (r) { v(`lien du client (${motif}) ${profil} : « ${r.fin} » — la flèche est tenue au dernier mot par une espace insécable`, r.insecable, r); v(`lien du client (${motif}) ${profil} : la flèche ne reste pas seule sur sa ligne (${r.lignes} lignes)`, !r.seule, r); }
      await L.fin(c);
    }
  }
  // 8. FACTURES, liste vide : « Rien ici avec ces filtres. » s'écrivait aussi quand il n'y avait AUCUNE facture, sans dire quoi faire. Sans pièce : on dit pourquoi ; avec un filtre qui ne trouve rien : on dit d'ôter le filtre.
  if (sec('8')) {
    for (const profil of ['mac', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'julie' });
      const lire = async (cat, avant) => { await c.p.evaluate(a => { eval(a); }, avant); await L.aller(c.p, 'comptabilite'); await c.p.evaluate(x => cxAller(x), cat); await L.calme(c.p, 600);
        return c.p.evaluate(() => { const z = document.querySelector('#cx-liste .carte.cx-liste > p.gris'); return z ? z.textContent.trim() : null; }); };
      // plein + recherche sans résultat : le message du filtre
      const f = await lire('fventes', "CX.q = 'zzzqqq'; CX.st = 'tous'; CX.cat = 'ventes'");
      v(`factures ${profil} · recherche sans résultat : « ${(f || '').slice(0, 60)} »`, /ces filtres/.test(f || '') && /efface|Toutes/.test(f || ''), f);
      await c.p.evaluate(() => { CX.q = ''; });
      // vide : plus aucune facture de vente (ni avoir) → la phrase de départ
      const cnt = await c.p.evaluate(() => { window.__fac = FACTURES.slice(); FACTURES.length = 0; return cxDocs().filter(x => x.fam === 'ventes').length; });
      v(`factures ${profil} · sans facture : la population de ventes est vide (${cnt})`, cnt === 0, cnt);
      const g = await lire('fventes', "CX.q = ''; CX.st = 'tous'; CX.cat = 'ventes'");
      v(`factures ${profil} · sans facture : « ${(g || '').slice(0, 70)} » dit que rien n'existe encore et comment elles viennent`, /Aucune pièce pour l’instant/.test(g || '') && /intervention/.test(g || '') && !/ces filtres/.test(g || ''), g);
      await c.p.evaluate(() => { FACTURES.push(...window.__fac); });
      await L.fin(c);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
