// Décision (e) du chef de chantier : au téléphone, dans la Comptabilité plein écran du bureau, le bouton « Menu » (trois traits et le mot) reste
// visible à côté de « ‹ OP GESTION », pour tous les rôles. On le MESURE (visible, 44 px, rien ne le recouvre) et on le TOUCHE.
// usage : node restes-taches-absences-1-bureau-tel.js — « N ✓ · M ✗ », sort en 1 si un contrôle tombe. 127.0.0.1 seulement.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
(async () => {
  for (const [profil, nuit] of [['iphone', false], ['petit', true], ['android', false]]) {
    const c = await L.ouvrir({ profil, nuit, qui:'julie' }); const p = c.p; await L.calme(p, 900); const tag = `bureau ${profil}${nuit ? ' nuit' : ''}`;
    const r = await p.evaluate(() => { const B = [...document.querySelectorAll('#cpsys:not([hidden]) .cpsys-menu')].filter(b => b.getBoundingClientRect().width > 0);   // le bouton de la fenêtre ; celui de la page est dessous
      const o = B[0]; if (!o) return { n:0, route:typeof route !== 'undefined' ? route : null }; const q = o.getBoundingClientRect(), e = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2);
      const H = [...document.querySelectorAll('#cpsys .cpsys-barre button')].filter(b => b.getBoundingClientRect().width > 0).map(b => Math.round(b.getBoundingClientRect().height)), bar = document.querySelector('#cpsys .cpsys-barre'), D = bar.scrollWidth > bar.clientWidth + 1;
      return { n:B.length, boutons:H, deborde:D, haut:Math.round(q.height), larg:Math.round(q.width), gauche:Math.round(q.left), touche:!!e && (o === e || o.contains(e) || e.contains(o)), route:typeof route !== 'undefined' ? route : null }; });
    v(`${tag} : un bouton « Menu » visible existe (population)`, r.n > 0, r);
    if (r.n) { v(`${tag} : les boutons de la barre font au moins 44 px (${r.boutons}), tiennent sur la largeur, et rien ne recouvre « Menu »`, r.boutons.length === 3 && r.boutons.every(h => h >= 44) && !r.deborde && r.touche, r);
      await L.capture(c, O.CAP + `restes1-bureau-${profil}${nuit ? '-nuit' : ''}.png`);
      await L.toucher(c, '#cpsys .cpsys-menu'); await L.calme(p, 600);
      const f = await p.evaluate(() => { const P = document.querySelector('#calque .panneau'), V = document.querySelector('#calque .voile'), r = P ? P.getBoundingClientRect() : null, e = r ? document.elementFromPoint(r.left + r.width / 2, r.top + 40) : null; return { feuille:!!P, auDessus:!!e && !!P && P.contains(e), texte:(P ? P.innerText : '').replace(/\s+/g, ' ').slice(0, 160) }; });
      v(`${tag} : le toucher ouvre la feuille « Menu » (Julie Petit), AU-DESSUS de la Comptabilité`, f.feuille && f.auDessus && /Julie/.test(f.texte), f);
      // un choix de la feuille quitte la Comptabilité et mène à l'écran choisi
      await p.evaluate(() => document.querySelector('#calque [data-go="clients"]').click()); await L.calme(p, 700);
      const g = await p.evaluate(() => ({ route, cpsys:!!document.querySelector('#cpsys:not([hidden])'), feuille:!!document.querySelector('#calque .panneau') }));
      v(`${tag} : « Clients » dans la feuille ferme la Comptabilité et ouvre Clients`, g.route === 'clients' && !g.cpsys && !g.feuille, g); }
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
