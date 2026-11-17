// Campagne « métiers », défaut metier-3d-04 : les pastilles du plan des box (28 px de dessin) répondent-elles sur 44 px ?
// Un doigt touche un POINT : on demande au navigateur qui reçoit le toucher à ±21 px du centre de chaque pastille (règle du dépôt :
// une cible se mesure à ce qu'elle déclenche, pas à son rectangle). Les points qui tombent sur une autre pastille voisine sont comptés à part.
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
(async () => {
  for (const profil of (process.argv[2] || 'iphone,android,petit,ipad').split(',')) for (const nuit of [false, true]) {
    const c = await O.ouvrir({ profil, nuit, qui: 'marc', packs: O.METIERS.d3 }), p = c.p;
    await p.evaluate(() => aller('carteBox')); await L.calme(p, 900);
    const r = await p.evaluate(async () => { const pins = [...document.querySelectorAll('#contenu .d3-plan .d3-box')]; if (!pins.length) return { n: 0 };
      pins[0].scrollIntoView({ block: 'center' }); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
      const res = []; for (const e of pins) { const rc = e.getBoundingClientRect(), cx = rc.left + rc.width / 2, cy = rc.top + rc.height / 2; if (cy < 70 || cy > innerHeight - 70) { e.scrollIntoView({ block: 'center' }); await new Promise(r => requestAnimationFrame(r)); }
        const q = e.getBoundingClientRect(), x = q.left + q.width / 2, y = q.top + q.height / 2, pts = [[-21, 0], [21, 0], [0, -21], [0, 21]], recu = pts.map(([dx, dy]) => { const t = document.elementFromPoint(x + dx, y + dy); return t === e || e.contains(t) ? 'moi' : (t && t.closest('.d3-box') ? 'voisin' : (t ? t.tagName + '.' + String(t.className).slice(0, 20) : 'rien')); });
        res.push({ id: e.getAttribute('data-d3'), dessin: Math.round(q.width) + '×' + Math.round(q.height), recu }); }
      return { n: pins.length, res }; });
    const nom = `${profil}-${nuit ? 'nuit' : 'jour'}`;
    v(nom + ' : le plan a ses pastilles (population)', r.n >= 8, JSON.stringify(r).slice(0, 200));
    if (!r.n) { await L.fin(c); continue; }
    const mal = r.res.filter(x => x.recu.some(z => z !== 'moi' && z !== 'voisin'));
    v(nom + ' [metier-3d-04] : à ±21 px du centre, le toucher revient à la pastille (ou à sa voisine)', mal.length === 0, JSON.stringify(mal.slice(0, 3)));
    console.log('  · ' + nom + ' : ' + r.n + ' pastilles de ' + r.res[0].dessin + ' ; ' + r.res.filter(x => x.recu.includes('voisin')).length + ' avec une voisine à moins de 21 px');
    await L.fin(c);
  }
  await L.fermer(); process.exit(O.bilan('metier-3d-zone-pastilles', ok, ko, []));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
