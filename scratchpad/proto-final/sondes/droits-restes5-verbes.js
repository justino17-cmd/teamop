// RESTES « entreprise », tour 5 (19 novembre 2026) : les verbes qui n'étaient pas dans la table des gestes. Trois choses se jouent, dans la VRAIE page :
//  1. les gestes qui ÉCRIVENT (« Noter comme remboursé », « Oui, transférer », « Annuler le transfert », « Commander » d'une pièce prévue) sont refusés sans leur case, par la garde de la table
//     (le clic est avalé, un refus compté) ET par leur fonction quand la garde est contournée (DROITS_GARDE=false : un second chemin) — avant la première écriture ; avec la case, ils passent ;
//  2. les gestes qui ne font que REGARDER ou ranger sur l'appareil (« Voir les clients archivés », « Enregistrer sur cet appareil », « Confirmer sur mon téléphone », « Réglages ›») ne sont JAMAIS refusés,
//     même à qui n'a que « Voir » : avant, leur verbe avait la forme d'une écriture et un lecteur recevait « ce geste n'est pas ouvert à ton compte » ;
//  3. le paramètre data-v d'un data-action n'est pas un geste à lui seul.
// Usage : timeout 580 node …/droits-restes5-verbes.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
(async () => {
  const c = await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, '1111'])), sp:{ tout:1, prix:1, atelier:1, valstock:1, commander:1, corrpt:1, comptes:1 } });
  const r = await c.p.evaluate(async () => {
    window.__w = 0; window.addEventListener('click', ev => { if (ev.target && ev.target.dataset && ev.target.dataset.essaiDroits) { window.__w++; ev.stopImmediatePropagation(); ev.preventDefault(); } }, true);
    const CATS_VOIR = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats'], p = eqDe('rp'), sortie = { garde:[], fonction:[], lecture:[], n:{ garde:0, fonction:0, lecture:0 } };
    const toucher = (fam, verbe, suite) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-' + fam, verbe + (suite || '|essai')); b.dataset.essaiDroits = '1'; document.body.appendChild(b); const w0 = __w, r0 = DROITS_REFUS.length; b.click(); b.remove(); return { fire:__w - w0, refus:DROITS_REFUS.length - r0 }; };
    const cases = (cat, x, val) => { p.droits.cats[cat][x] = val; };
    // 1. la garde de la table : sans la case refusé, avec la case laissé passer
    const ECR = [['action', 'rembourseNote', 'ventes', 'm'], ['ac', 'transfertok', 'achats', 'm'], ['axa', 'trfannul', 'achats', 'm'], ['pdx', 'piece', 'stock', 'm']];
    for (const [fam, verbe, cat, x] of ECR) { sortie.n.garde++; cases(cat, x, 0); const a = toucher(fam, verbe); cases(cat, x, 1); const b = toucher(fam, verbe);
      if (!(a.fire === 0 && a.refus === 1 && b.fire === 1 && b.refus === 0)) sortie.garde.push(`${fam}|${verbe} (${cat}.${x}) : ${JSON.stringify([a, b])}`); }
    // 2. la FONCTION, garde de la table éteinte : sans la case rien ne s'écrit et un refus est compté ; avec la case, pas de refus
    window.DROITS_GARDE = false;
    { sortie.n.fonction++; cases('ventes', 'm', 0); const r0 = DROITS_REFUS.length, nT = TACHES.length; ACTIONS.rembourseNote({ dataset:{ id:'inconnue' } }); const sans = { refus:DROITS_REFUS.length - r0, taches:TACHES.length - nT };
      cases('ventes', 'm', 1); const r1 = DROITS_REFUS.length; ACTIONS.rembourseNote({ dataset:{ id:'inconnue' } }); const avec = { refus:DROITS_REFUS.length - r1 };
      if (!(sans.refus === 1 && sans.taches === 0 && avec.refus === 0)) sortie.fonction.push('rembourseNote : ' + JSON.stringify([sans, avec])); }
    { sortie.n.fonction++; const jouer = () => { AX.annul = { photo:null, lib:'essai', sig:'x' }; const r0 = DROITS_REFUS.length, a0 = AX.annul; const b = document.createElement('button'); b.setAttribute('data-axa', 'trfannul'); b.type = 'button'; document.body.appendChild(b);
        try { b.click(); } catch (e) {} b.remove(); return { refus:DROITS_REFUS.length - r0, annulIntact:AX.annul === a0 }; };
      cases('achats', 'm', 0); const sans = jouer(); cases('achats', 'm', 1); const avec = jouer(); AX.annul = null;
      if (!(sans.refus === 1 && sans.annulIntact && avec.refus === 0)) sortie.fonction.push('trfannul : ' + JSON.stringify([sans, avec])); }
    { sortie.n.fonction++; const jouer = () => { const r0 = DROITS_REFUS.length, nC = COMMANDES.length; const b = document.createElement('button'); b.setAttribute('data-pdx', 'piece|inconnue|inconnue'); b.type = 'button'; document.body.appendChild(b);
        try { b.click(); } catch (e) {} b.remove(); return { refus:DROITS_REFUS.length - r0, cmd:COMMANDES.length - nC }; };
      cases('stock', 'm', 0); const sans = jouer(); cases('stock', 'm', 1); const avec = jouer();
      if (!(sans.refus === 1 && sans.cmd === 0 && avec.refus === 0)) sortie.fonction.push('piece : ' + JSON.stringify([sans, avec])); }
    { sortie.n.fonction++; const d = DEM_ACHAT.find(o => o.etat === 'attente'); if (!d) sortie.fonction.push('transfertok : aucune demande en attente pour jouer le geste'); else {
        const jouer = () => { const r0 = DROITS_REFUS.length, nM = MVTS.length, t0 = typeof toast === 'function'; const b = document.createElement('button'); b.setAttribute('data-ac', 'transfertok|' + d.id); b.type = 'button'; document.body.appendChild(b);
          let err = null; try { b.click(); } catch (e) { err = String(e); } b.remove(); return { mvts:MVTS.length - nM, etat:d.etat, err }; };
        cases('achats', 'm', 0); const sans = jouer();
        if (!(sans.mvts === 0 && sans.etat === 'attente' && !sans.err)) sortie.fonction.push('transfertok sans la case : ' + JSON.stringify(sans)); cases('achats', 'm', 1); } }
    window.DROITS_GARDE = true;
    // 3. ce qui ne fait que regarder : jamais refusé, même à qui n'a que « Voir »
    /* ⛔ CATS existe AUSSI dans la page (les groupes du menu) : on donne la liste des cases par un autre nom, sinon le « Voir seul » ne se pose pas et les contrôles de lecture passent à vide */
    ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'].forEach(k => { p.droits.cats[k] = { v:1, c:0, m:0, s:0 }; }); sortie.voirSeul = CATS_VOIR.every(k => !peut(k, 'm', p) && !peut(k, 'c', p)); Object.keys(p.droits.sp).forEach(k => { p.droits.sp[k] = 0; });
    for (const [fam, verbe] of [['rangc', 'archives'], ['sortie', 'enregistrer'], ['secv', 'confirmer'], ['axa', 'reglages']]) { sortie.n.lecture++; const t = toucher(fam, verbe); if (!(t.fire === 1 && t.refus === 0)) sortie.lecture.push(`${fam}|${verbe} refusé à qui n'a que « Voir » : ${JSON.stringify(t)}`); }
    // data-v n'est pas un geste : seul, il ne se refuse pas ; porté par une action d'écriture, c'est l'action qui est jugée
    { sortie.n.lecture++; const t = toucher('v', 'enreg'); if (!(t.fire === 1 && t.refus === 0)) sortie.lecture.push('data-v seul refusé : ' + JSON.stringify(t));
      sortie.n.lecture++; const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-action', 'clientInfosSuite'); b.setAttribute('data-v', 'enreg'); b.dataset.essaiDroits = '1'; document.body.appendChild(b); const w0 = __w, r0 = DROITS_REFUS.length; b.click(); b.remove();
      if (!(__w - w0 === 0 && DROITS_REFUS.length - r0 === 1)) sortie.lecture.push('clientInfosSuite + data-v=enreg à qui n\'a que « Voir » : ' + JSON.stringify([__w - w0, DROITS_REFUS.length - r0, peut('crm', 'm', p), JSON.stringify(p.droits.cats.crm), window.DROITS_GARDE])); }
    return sortie; });
  console.log(`  · ${r.n.garde} gestes d'écriture gardés par la table, ${r.n.fonction} par leur fonction, ${r.n.lecture} gestes de lecture`);
  v('population : 4 gestes gardés par la table, 4 par leur fonction, 6 de lecture', r.n.garde === 4 && r.n.fonction === 4 && r.n.lecture === 6, r.n);
  v('population de la lecture : la personne n\'a bien que « Voir » partout (sinon rien n\'est refusé et les contrôles passent à vide)', r.voirSeul === true, r.voirSeul);
  v('la table : refus sans la case (clic avalé, refus +1), passage avec elle', r.garde.length === 0, r.garde);
  v('la fonction, garde de la table éteinte : rien ne s\'écrit sans la case, un refus est compté ; avec la case, aucun refus', r.fonction.length === 0, r.fonction);
  v('les gestes de lecture ne sont jamais refusés ; une action d\'écriture reste jugée sur sa propre case malgré data-v', r.lecture.length === 0, r.lecture);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c); await fin();
})().catch(e => { console.error(e); process.exit(1); });
