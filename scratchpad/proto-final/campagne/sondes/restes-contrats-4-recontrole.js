// RECONTRÔLE ADVERSE des restes des contrats, tour 4 : ce que la lecture du prix rangé, le repli du tableau selon la CARTE (container query)
// et le compteur « kpi-long » ont pu casser à côté.
// usage : node restes-contrats-4-recontrole.js [profil] [nuit] → « N ✓ · M ✗ »
//  A : largeur de fenêtre qui varie (761 → 1 700 px) : le tableau ne perd jamais sa colonne Client (≥ 100 px) ni ne déborde de sa carte ; au-dessus du seuil, tableau complet
//  B : totaux de 5 à 9 chiffres sur les profils étroits : aucun compteur coupé ni sorti de sa carte
//  C : saisies extrêmes de l'aperçu (1e999, abc, -5, 0,001, vide, 12 décimales) : jamais NaN / Infinity / undefined, aucune erreur de page
//  D : les autres rôles ouvrent la liste sans erreur ni débordement
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-contrats-4-recontrole/';
require('fs').mkdirSync(CAP, { recursive: true });
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
  const W = L.PROFILS[profil].w;
  // données longues : noms de clients, titres, prix à six chiffres, états variés
  await p.evaluate(() => { const noms = Object.keys(CLIENTS); noms.forEach(i => { CLIENTS[i].nom = 'Copropriété Les Hauts de la Rochelle-Saint-Nicolas-de-la-Grave'; });
    CONTRATS.forEach(k => { k.titre = 'Entretien annuel des climatisations de la résidence · bâtiment A, B, C et D · 48 cassettes'; k.prix = 123456.78; });
    CONTRATS.push({ id:'c9', num:'CTR-2026-099', cli:noms[0], modele:'nett', titre:'Nettoyage', freq:12, prix:99999.99, fact:'visite', st:'signe', signe:'02/01/2026', debut:'01/01/2026', fin:'31/12/2026', faites:11 }); });
  // A : balayage de largeur
  if (!c.doigt) for (const w of [761, 900, 1000, 1100, 1180, 1300, 1500, 1700]) {
    await p.setViewportSize({ width: w, height: 900 }); await L.aller(p, 'accueil'); await L.aller(p, 'contrats'); await L.calme(p, 500);
    const r = await p.evaluate(() => { const car = document.querySelector('#contenu .ctr-liste'), t = car && car.querySelector('table');
      const th = [...car.querySelectorAll('thead th')].map(h => [h.textContent, Math.round(h.getBoundingClientRect().width)]), cl = th.find(h => h[0] === 'Client');
      const cr = car.getBoundingClientRect();
      return { carte: Math.round(cr.width), cl, repli: th.some(h => h[1] === 0), tab: t ? Math.round(t.getBoundingClientRect().width) : 0, tabSort: t ? t.getBoundingClientRect().right > cr.right + 1 : null, carteDefile: car.scrollWidth > car.clientWidth + 1, page: document.documentElement.scrollWidth,
        cellules: [...car.querySelectorAll('tbody tr:first-child td')].map(d => Math.round(d.getBoundingClientRect().width)) }; });
    console.log('  ·', w, 'carte', r.carte, 'client', r.cl && r.cl[1], r.repli ? 'repli' : 'tableau', 'tab', r.tab, 'cellules', r.cellules.join('/'));
    v('A ' + w + ' : population (carte et colonne Client trouvées)', r.carte > 0 && !!r.cl, r);
    v('A ' + w + ' : colonne Client ≥ 100 px ou repli', r.cl && (r.cl[1] >= 100 || r.repli), r);
    v('A ' + w + ' : le tableau ne sort pas de sa carte, la carte ne défile pas de côté', !r.tabSort && !r.carteDefile, r);
    v('A ' + w + ' : la page ne déborde pas', r.page <= w + 1, r.page);
    if (w >= 1500) v('A ' + w + ' : tableau complet au-dessus du seuil', !r.repli, r);
  }
  // B : totaux (la fenêtre revient à la largeur POSÉE du profil après le balayage)
  if (!c.doigt) await p.setViewportSize({ width: W, height: L.PROFILS[profil].h });
  for (const total of [5000, 99999.99, 123456.78, 999999.99, 4999999.98, 99999999.99].filter(t => !(t > 5e7 && W < 340))) {   // 150 contrats AU PLAFOND (149 999 999,98 €) à 320 px : hors de portée d'une entreprise de terrain, noté comme doute au tour 4, pas une garde
    await p.evaluate(t => { CONTRATS.forEach(k => { if (k.st === 'signe') k.prix = t / 2; else k.prix = 100; }); }, total);
    await L.aller(p, 'accueil'); await L.aller(p, 'contrats'); await L.calme(p, 500);
    const r = await p.evaluate(() => ({ kp: [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => { const b = k.querySelector('b'), kr = k.getBoundingClientRect(), br = b.getBoundingClientRect(); return { t: b.textContent, coupe: b.scrollWidth > b.clientWidth + 1, hors: br.right > kr.right + 1 || br.left < kr.left - 1, taille: getComputedStyle(b).fontSize, larg: Math.round(kr.width) }; }), page: document.documentElement.scrollWidth }));
    const tag = 'B ' + total;
    v(tag + ' : population (4 compteurs)', r.kp.length === 4, r.kp);
    v(tag + ' : aucun compteur coupé ni sorti de sa carte', !r.kp.some(k => k.coupe || k.hors), r.kp);
    v(tag + ' : la page ne déborde pas', r.page <= W + 1, r.page);
    if (total === 123456.78 || total === 99999999.99) { await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; const k = document.querySelector('#contenu .kpis'); if (k) k.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300); await p.screenshot({ path: CAP + 'kpi-' + total + '-' + profil + (nuit ? '-nuit' : '-jour') + '.png' }); }
  }
  // C : aperçu, saisies extrêmes
  const erreurs0 = c.err ? c.err.length : 0;
  for (const s of ['1e999', 'abc', '-5', '0,001', '', '1234567890123', '0.123456789012', '１２', '  42  ', '1 000,5']) {
    await L.aller(p, 'contrat-nouveau'); await L.calme(p, 250); await p.fill('[data-b="prix"]', s); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 300);
    const t = await p.evaluate(() => document.querySelector('#contenu').textContent.replace(/[\s  ]+/g, ' '));
    const mauvais = /NaN|Infinity|∞|undefined|\[object/.test(t);
    const ap = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)); return h ? h.nextElementSibling.textContent.replace(/[\s  ]+/g, ' ').trim().slice(0, 120) : ''; });
    console.log('  ·', JSON.stringify(s), '→', ap);
    v('C ' + JSON.stringify(s) + ' : ni NaN, ni Infinity (∞), ni undefined', !mauvais && !!ap, ap);
  }
  v('C : aucune erreur de page', (c.err ? c.err.length : 0) === erreurs0, c.err && c.err.slice(erreurs0));
  await L.fin(c);
  // D : autres rôles
  for (const qui of ['julie', 'sm', 'kb']) {
    const d = await L.ouvrir({ profil, qui, hash: 'contrats', nuit }); await L.calme(d.p, 500);
    const r = await d.p.evaluate(() => ({ h: location.hash, txt: (document.querySelector('#contenu') || {}).textContent || '', kp: document.querySelectorAll('#contenu .kpis .kpi').length, page: document.documentElement.scrollWidth }));
    console.log('  ·', qui, r.h, 'compteurs', r.kp, 'texte', r.txt.length);
    v('D ' + qui + ' : page affichée (hash et contenu), pas de NaN/undefined', r.txt.length > 20 && !/NaN|undefined|\[object/.test(r.txt), { h: r.h, n: r.txt.length });
    v('D ' + qui + ' : la page ne déborde pas', r.page <= W + 1, r.page);
    v('D ' + qui + ' : aucune erreur de page', !(d.err && d.err.length), d.err);
    await L.fin(d);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
