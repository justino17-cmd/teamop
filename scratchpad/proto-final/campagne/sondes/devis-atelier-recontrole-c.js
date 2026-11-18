// RECONTRÔLE ADVERSE (étape 3), passe C : ce que les corrections de mise en page (11, 12, 13, 14) ont pu casser À CÔTÉ — captures à REGARDER, valeurs longues,
// « Voir en grand » (balayage : « sans effet visible »), et le total de ligne d'une FACTURE à valider (même grille que le devis).
// usage : node devis-atelier-recontrole-c.js <profil> <jour|nuit>      « N ✓ · M ✗ », code 1 si un contrôle tombe. Captures : …/cap/recontrole-devis-atelier/
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v, CAP = O.CAP.replace('campagne-devis-atelier', 'recontrole-devis-atelier');
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + '-' + (nuit ? 'nuit' : 'jour');
  const c = await L.ouvrir({ profil, qui: 'marc', nuit, hash: 'devis' }), p = c.p; await L.calme(p, 600);
  // 1. brouillon aux valeurs les plus longues plausibles
  await p.evaluate(() => { CLIENTS.zl = { nom: 'Établissements Dupont-Lefèbvre-Martinez et Associés', type: 'pro', contact: 'Jean-Baptiste Dupont-Lefèbvre', tel: '05 46 12 34 56', mail: 'jb@exemple.fr', adr: '12 rue du Maréchal de Lattre de Tassigny, 17000 La Rochelle', acces: '', depuis: '2026', appareils: [] };
    dvCreer({ cli: 'zl', objet: 'Remplacement complet de la centrale de traitement d’air du bâtiment B', lignes: [['Centrale de traitement d’air double flux haut rendement avec récupérateur à plaques', 1523.5, 12345.67], ['Main-d’œuvre', 12.25, 1999.99], ['Déplacement', 1, 29.17], ['Ligne libre sans prix', 1, null]], source: 'essai' }); window.__k = location.hash.replace('#devis-x-', ''); });
  const k = await p.evaluate(() => window.__k); await L.calme(p, 700);
  await L.capture(c, CAP + `fiche-longue-${tag}.png`);
  const dep = await L.deborde(c); v(`${tag} : fiche aux valeurs longues : aucun glissement latéral`, !dep.bouge, dep);
  // chaque ligne : aucun de ses champs ne chevauche un autre (rectangle, deux dimensions)
  const chev = await p.evaluate(() => { const bad = []; document.querySelectorAll('#contenu .dv-lg:not(.dv-lg-t)').forEach((l, i) => { const E = [...l.querySelectorAll('input, .dv-tot, .dv-x, button')].filter(e => e.offsetParent && e.getBoundingClientRect().width > 0).map(e => [e.className || e.tagName, e.getBoundingClientRect()]);
      for (let a = 0; a < E.length; a++) for (let b = a + 1; b < E.length; b++) { const A = E[a][1], B = E[b][1]; if (A.left < B.right - 1 && B.left < A.right - 1 && A.top < B.bottom - 1 && B.top < A.bottom - 1) bad.push([i, E[a][0], E[b][0]]); } }); return bad; });
  v(`${tag} : aucune case d’une ligne de devis n’en recouvre une autre`, chev.length === 0, chev.slice(0, 4));
  if (c.doigt) { const d = await L.doigts(p, '#contenu'); v(`${tag} : fiche longue : cibles ≥ 44 px`, d.petits.length === 0, d.petits.slice(0, 6)); v(`${tag} : fiche longue : champs ≥ 16 px`, d.champs.length === 0, d.champs.slice(0, 4)); v(`${tag} : fiche longue : aucun texte écrasé`, d.ecrases.length === 0, d.ecrases.slice(0, 3)); }
  // « Voir en grand » : ouvre le devis en grand, Échap le ferme, la page dessous n'a pas bougé
  const h0 = await p.evaluate(() => location.hash);
  const vg = await L.toucher(c, '[data-pdfplein]'); await L.calme(p, 400);
  const plein = await p.evaluate(() => { const d = document.getElementById('docplein'); return { ouvert: !!d && getComputedStyle(d).display !== 'none' && d.getBoundingClientRect().width > 100, txt: d ? d.innerText.replace(/\s+/g, ' ').slice(0, 80) : '' }; });
  v(`${tag} : « Voir en grand » ouvre le devis en grand (que le balayage voyait « sans effet »)`, vg && plein.ouvert, plein);
  await L.capture(c, CAP + `voir-en-grand-${tag}.png`);
  await p.keyboard.press('Escape'); await L.calme(p, 400);
  const ferme = await p.evaluate(() => { const d = document.getElementById('docplein'); return { ferme: !d || getComputedStyle(d).display === 'none' || d.getBoundingClientRect().width < 10, hash: location.hash }; });
  v(`${tag} : Échap referme le devis en grand et laisse la fiche`, ferme.ferme && ferme.hash === h0, ferme);
  // 2. facture à valider aux valeurs longues (même grille)
  await p.evaluate(() => { const id = 'fmep'; FACTURES.unshift({ id, num: '—', cli: 'vp', objet: 'Mise en service', lignes: [{ d: 'Mise en service d’une pompe à chaleur air-eau avec groupe extérieur, kit hydraulique et appoint électrique 9 kW', q: '1', pu: 12345.67 }, { d: 'Fluide frigorigène R32', q: '250 mL', pu: 48.5 }], ht: 0, tva: 20, st: 'avalider', emise: '—', ech: '—' }); });
  await L.aller(p, 'facture-x-fmep'); await L.toucher(c, '[data-action="ligneAjout"]'); await p.waitForTimeout(300);
  await p.locator('[data-fdes="2"]').fill('Déplacement hors zone avec nacelle'); await p.locator('[data-fqte="2"]').fill('12 345'); await p.locator('[data-prix="2"]').fill('1 523,5'); await p.locator('[data-prix="2"]').blur(); await L.calme(p, 400);
  await L.capture(c, CAP + `facture-longue-${tag}.png`);
  const f = await p.evaluate(() => { const ls = [...document.querySelectorAll('#contenu .fac-lgs .dv-lg:not(.dv-lg-t)')]; return ls.map(l => { const t = l.querySelector('.dv-tot'), q = l.querySelector('[data-fqte]'), x = l.querySelector('.dv-x, [data-action="ligneSup"]'); const R = e => e && e.getBoundingClientRect(); return { tot: t && t.textContent.trim(), totVisible: !!t && R(t).width > 0, totClip: !!t && t.scrollWidth > t.clientWidth + 1, qClip: !!q && q.scrollWidth > q.clientWidth + 1, left: Math.round(R(l.querySelector('[data-prix]')).left), totLeft: t ? Math.round(R(t).left) : null, xLeft: x ? Math.round(R(x).left) : null }; }); });
  v(`${tag} : facture à valider : le total de chaque ligne est visible et entier`, f.length === 3 && f.every(l => l.totVisible && !l.totClip && !l.qClip), f);
  if (!c.doigt) v(`${tag} : facture à valider (bureau) : les totaux de lignes sont alignés d’une ligne à l’autre`, new Set(f.map(l => l.totLeft)).size === 1 && new Set(f.map(l => l.xLeft)).size === 1, f.map(l => [l.totLeft, l.xLeft]));
  const dep2 = await L.deborde(c); v(`${tag} : facture à valider : aucun glissement latéral`, !dep2.bouge, dep2);
  // 3. le panneau d'envoi et de relance (message à 16 px)
  await L.aller(p, 'devis-x-D-2026-031'); await L.toucher(c, '[data-dv="relancer|D-2026-031"]'); await L.calme(p, 400);
  await L.capture(c, CAP + `relancer-${tag}.png`);
  const ml = await p.evaluate(() => ['ml-a', 'ml-o', 'ml-m'].map(i => parseFloat(getComputedStyle(document.getElementById(i)).fontSize))); v(`${tag} : relance : à, objet et message à 16 px au moins`, ml.every(x => x >= 16 || !c.doigt), ml);
  const dep3 = await L.deborde(c); v(`${tag} : relance : aucun glissement latéral`, !dep3.bouge, dep3);
  console.log('err', c.err.length, c.err.slice(0, 4)); v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
