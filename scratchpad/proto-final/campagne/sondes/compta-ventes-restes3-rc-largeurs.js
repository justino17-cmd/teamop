// Recontrôle adverse, tour 3 : la facture à valider aux largeurs CHARNIÈRES (autour de 1250 px, où l'en-tête de colonnes et les mots au-dessus des champs se relaient), valeurs longues.
// Contrôle : un seul des deux jeux de mots est visible (jamais les deux, jamais aucun), rien ne se chevauche, la carte ne déborde pas.
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const nuit = process.argv[2] === 'nuit', c = await L.ouvrir({ profil: 'mac', qui: 'marc', nuit }), p = c.p;
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50';
    F.pieces = [{ nom: 'Nettoyant échangeur', q: '0,5 L', pu: 10.33 }, { nom: 'Installation pompe à chaleur — main-d’œuvre et déplacement longue durée sur site', q: '1 250', pu: 1234567.89 }];
    factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-w'; });
  await X.fiche(c, 'fx-w');
  for (const W of [320, 390, 768, 1024, 1180, 1249, 1250, 1251, 1280, 1366, 1600]) {
    await p.setViewportSize({ width: W, height: 900 }); await L.calme(p, 600);
    const m = await p.evaluate(() => { const vis = e => e && e.offsetParent !== null && e.getBoundingClientRect().width > 0;
      const entete = vis(document.querySelector('.fac-lgs .dv-lg-t')), mots = [...document.querySelectorAll('.fac-lgs .fac-et')].filter(vis).length;
      const car = document.querySelector('.fac-lgs').getBoundingClientRect(), ch = [];
      document.querySelectorAll('.fac-lgs .dv-lg:not(.dv-lg-t)').forEach((l, k) => { const b = [...l.children].filter(vis).map(e => ({ n: e.className || e.tagName, r: e.getBoundingClientRect() }));
        for (let i = 0; i < b.length; i++) { if (b[i].r.right > car.right + 1 || b[i].r.left < car.left - 1) ch.push(k + ':' + b[i].n + ' sort de la carte'); for (let j = i + 1; j < b.length; j++) { const a = b[i].r, d = b[j].r; if (a.left < d.right - 1 && d.left < a.right - 1 && a.top < d.bottom - 1 && d.top < a.bottom - 1) ch.push(k + ':' + b[i].n + ' × ' + b[j].n); } } });
      const coupe = [...document.querySelectorAll('.fac-lgs .fac-et')].filter(vis).filter(e => e.scrollWidth > e.clientWidth + 1).length;
      return { entete, mots, ch, coupe, deb: document.documentElement.scrollWidth - innerWidth }; });
    L.v(W + ' px : un seul jeu de mots (en-tête ' + m.entete + ', mots ' + m.mots + ')', m.entete !== (m.mots > 0), m);
    L.v(W + ' px : rien ne se chevauche, rien ne sort de la carte, mots entiers, pas de défilement latéral', m.ch.length === 0 && m.coupe === 0 && m.deb <= 0, m.ch);
    if ([320, 1180, 1251].includes(W)) await L.capture(c, X.CAP.replace('campagne-compta-ventes/', 'cv-rc3/') + `rc3-larg-${W}${nuit ? '-nuit' : ''}.png`);
  }
  await L.fermer(c);
})().catch(e => { console.error(e); process.exit(1); });
