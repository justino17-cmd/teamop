// Guide des nouveautés : après rotation en paysage, « Voir » est-il VRAIMENT visible (elementFromPoint + part visible dans la zone qui défile) ? Mesurer le rectangle ne suffit pas :
// un bouton caché sous le pli passe un contrôle de 44 px. Voir refonte/guide-relecture-tout.json (tout-01).
// Deux passes : « vrai » = les encoches d'un téléphone EN TRAVERS (iPhone : 0 en haut, 21 en bas, 47 de chaque côté ; Android : barre d'état de 24 en haut ; iPad : inchangées) —
// la carte ne défile pas et « Voir » se touche ; « dur » = les encoches du PORTRAIT gardées après la rotation (le cas que la sonde faisait par erreur : 103 px perdus sur l'iPhone),
// où « Voir » doit rester visible même si la carte défile. lib.ouvrir ne pose que les encoches du portrait : la rotation les rejoue ici.
const G = require('./guide-commun.js'), L = G.L, v = L.v;
const TRAVERS = { iphone:{ top:0, bottom:21, left:47, right:47 }, android:{ top:24, bottom:0, left:0, right:0 }, petit:null, ipad:{ top:24, bottom:20, left:0, right:0 } };
(async () => {
  for (const PASSE of ['vrai', 'dur']) for (const PROFIL of ['iphone','android','petit','ipad']) for (const q of ['sm','marc','julie']) {
    if (PASSE === 'dur' && q === 'julie') continue;
    const pr = L.PROFILS[PROFIL];
    const c = await G.ouvrir(PROFIL, q, false), p = c.p;
    await p.setViewportSize({ width: pr.h, height: pr.w });
    if (PASSE === 'vrai' && TRAVERS[PROFIL]) { const cdp = await p.context().newCDPSession(p); const e = TRAVERS[PROFIL];
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top:e.top, bottom:e.bottom, left:e.left, right:e.right, topMax:e.top, bottomMax:e.bottom, leftMax:e.left, rightMax:e.right } }); }
    await L.calme(p, 900);
    const pg = await G.pages(c);
    v(`${PASSE} ${q}/${PROFIL} : population : ${pg.length} cartes`, pg.length >= 2, pg.length);
    for (let i = 0; i < pg.length; i += 1) {
      await G.vers(c, i);
      const r = await p.evaluate(() => { const z = document.getElementById('nv'); const car = z.querySelector('.nv-carte:not([inert])'); const b = car.querySelector('.nv-voir'); const br = b.getBoundingClientRect(); const cx = br.left + br.width/2, cy = br.top + br.height/2;
        const el = document.elementFromPoint(cx, cy); const f = z.querySelector('.nv-defile').getBoundingClientRect(), fe = z.querySelector('.nv-feuille').getBoundingClientRect();
        const hautVu = Math.round(Math.min(br.bottom, f.bottom) - br.top), reste = Math.round(car.scrollHeight - car.clientHeight);
        const lis = [...car.querySelectorAll('li')], liVue = lis.every(l => { const b = l.getBoundingClientRect(); return b.top >= f.top - 1 && b.bottom <= f.bottom + 1; });
        return { voirVisible: !!el && (el === b || b.contains(el)), voirVu: hautVu + '/' + Math.round(br.height), cache: Math.round(br.bottom - f.bottom), defileCarte: reste, lignesVues: liVue, feuilleBas: Math.round(fe.bottom), H: innerHeight }; });
      v(`${PASSE} ${q}/${PROFIL} paysage carte ${i+1} : « Voir » entièrement visible et touchable (${r.voirVu} px vus, cache ${r.cache})`, r.voirVisible && r.cache <= 0, r);
      if (PASSE === 'vrai') { v(`${PASSE} ${q}/${PROFIL} paysage carte ${i+1} : la carte ne défile pas (${r.defileCarte} px de trop)`, r.defileCarte <= 1, r);
        v(`${PASSE} ${q}/${PROFIL} paysage carte ${i+1} : toutes les lignes sont vues`, r.lignesVues, r); }
    }
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
