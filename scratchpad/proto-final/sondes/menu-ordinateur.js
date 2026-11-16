// Le menu de l'ordinateur, rôle par rôle : groupes, ordre, noms, ligne surlignée, surtitre de l'écran, bon écran (MENU-FINAL.md).
// node scratchpad/proto-final/sondes/menu-ordinateur.js   → « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const { L, ATTENDU, ROUTES, G3D, lireMenu, aplatir, aplatirAttendu } = require('./menu-commun.js'), v = L.v;
(async () => {
  let lignesVues = 0, ecransVus = 0;
  for (const profil of process.env.RAPIDE ? ['mac'] : ['mac', 'windows']) for (const qui of ['marc', 'julie', 'sm']) {
    const c = await L.ouvrir({ profil, qui }), tag = `${profil}/${qui}`;
    const m = await lireMenu(c.p);
    v(`${tag} : le menu existe`, !!m);
    if (!m) { await L.fin(c); continue; }
    v(`${tag} : groupes, ordre et noms comme décidé`, aplatir(m.G) === aplatirAttendu(ATTENDU[qui]), { eu:aplatir(m.G) });
    v(`${tag} : aucun groupe d'une seule ligne (hors rôle technicien : sa ligne 3D)`, qui === 'sm' || m.G.every(g => g.L.length > 1 || g.t === ''), m.G.map(g => g.t + ':' + g.L.length));
    v(`${tag} : aucun groupe ne porte le nom d'une de ses lignes`, m.G.every(g => !g.t || !g.L.some(l => l.l === g.t)));
    const cg = m.G.flatMap(g => g.L).find(l => l.l === 'Comptabilité');
    v(`${tag} : petit gris sous Comptabilité`, qui === 'sm' ? !cg : !!cg && cg.sous === 'Factures, paiements, paie', cg);
    v(`${tag} : le logo ramène à l'écran d'ouverture du rôle`, m.logo === '#' + ({ marc:'accueil', julie:'comptabilite', sm:'majournee' })[qui], m.logo);
    v(`${tag} : pied = Apparence, Nouveautés, Se déconnecter (dans cet ordre, rien d'échafaudage)`, /^mode-seg/.test(m.pied[0] || '') && /^nv-menu/.test(m.pied[1] || '') && /^cn-out/.test(m.pied[2] || '') && m.pied.length === 3, m.pied);
    const pied = await c.p.evaluate(() => { const e = document.querySelector('#menu .pied'), r = e.getBoundingClientRect(); return { bas:Math.round(r.bottom), h:innerHeight }; });
    v(`${tag} : le pied reste dans l'écran`, pied.bas <= pied.h + 1, pied);
    // chaque ligne : on la touche, la ligne se surligne, le surtitre dit le groupe, l'écran a un titre
    const grpDe = {}; m.G.forEach(g => g.L.forEach(l => grpDe[l.l] = g.t));
    // la Comptabilité s'ouvre en plein écran (OP COMPTABLE) et couvre le menu : on en sort par SON bouton, comme l'utilisateur
    const sortirCompta = async () => { const ouvert = await c.p.evaluate(() => { const z = document.getElementById('cpsys'); return !!z && z.offsetParent !== null || (z && getComputedStyle(z).display !== 'none'); }); if (ouvert) { await L.toucher(c, '#cpsys [data-cpsys="retour"]'); await L.calme(c.p, 400); } };
    await sortirCompta();
    for (const [g, noms] of ATTENDU[qui]) for (const nom of noms) {
      const r = ROUTES[qui][nom]; lignesVues++;
      await sortirCompta();
      const ok = await L.toucher(c, `#menu a[href="#${r}"]`); if (!v(`${tag} · ${nom} : la ligne répond au toucher`, ok)) continue;
      await L.calme(c.p, 400);
      const e = await c.p.evaluate(() => { const g = s => { const x = document.querySelector(s); return x ? x.textContent.replace(/\s+/g, ' ').trim() : ''; }; return { sur:g('#contenu .surtitre'), h1:g('#contenu h1'), on:g('#menu a.on .m-n'), nbOn:document.querySelectorAll('#menu a.on').length, hash:location.hash }; });
      ecransVus++;
      v(`${tag} · ${nom} : exactement une ligne surlignée, et c'est elle`, e.nbOn === 1 && e.on === nom, e);
      v(`${tag} · ${nom} : l'écran a un titre`, e.h1.length > 1, e);
      // le surtitre dit le groupe (le gérant et le bureau) ; le bloc du haut dit « Accueil » ; le bureau en plein écran Comptabilité n'en a pas
      if (qui !== 'sm' && r !== 'comptabilite' && r !== 'accueil') v(`${tag} · ${nom} : le surtitre de l'écran dit « ${g || 'Accueil'} »`, e.sur === (g || 'Accueil'), e);
    }
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2));
    // le logo, depuis un écran profond
    await sortirCompta(); await L.aller(c.p, qui === 'sm' ? 'techfrais' : 'planning'); if (qui === 'julie') await L.aller(c.p, 'devis');
    await L.toucher(c, '#menu a.logo'); const h = await c.p.evaluate(() => location.hash);
    v(`${tag} : toucher le logo ramène à l'ouverture`, h === '#' + ({ marc:'accueil', julie:'comptabilite', sm:'majournee' })[qui], h);
    await L.fin(c);
  }
  const mini = process.env.RAPIDE ? 30 : 60; v('population : des lignes ont été touchées', lignesVues >= mini, lignesVues); v('population : des écrans ont été lus', ecransVus >= mini, ecransVus);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
