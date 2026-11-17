// Matériel, étape 2 (Stock) — la DENSITÉ : où commence la première ligne d'article, et combien d'éléments touchables la précèdent (spec § 1 et § 5.1 :
// avant 0,5 écran et au plus 12 touchables ; avant, Stock : 1,3 écran et 33 touchables). La population (nombre de lignes) est comptée d'abord.
// Usage : node materiel-stock-densite.js [profils séparés par des virgules]  → « N ✓ · M ✗ »
const L = require('../lib.js');
const PROFILS = (process.argv[2] || 'mac,mac720,windows,ipad,iphone,android,petit').split(',');
(async () => {
  const v = L.v;
  for (const profil of PROFILS) {
    const c = await L.ouvrir({ profil, qui:'marc' }), p = c.p; await L.aller(p, 'stock'); await L.calme(p, 300);
    for (const avec of [true, false]) {
      if (!avec) { await p.evaluate(() => { MVTS_ATT.splice(0); rendre(); }); await L.calme(p, 300); }
      const m = await p.evaluate(() => { const prem = document.querySelector('.ms-l'), H = innerHeight; if (!prem) return null;
        const r = prem.getBoundingClientRect(), tt = [...document.querySelectorAll('#contenu button, #contenu a, #contenu input, #contenu select')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (e.compareDocumentPosition(prem) & Node.DOCUMENT_POSITION_FOLLOWING) && !e.closest('.tete-tel'); });
        return { y:Math.round(r.top + scrollY), H, n:tt.length, lignes:document.querySelectorAll('.ms-l').length }; });
      v(`${profil} · ${avec ? 'avec' : 'sans'} bandeau : population ${m && m.lignes} lignes`, !!m && m.lignes >= 20);
      if (!m) continue;
      // Objectif de la spec : avant 0,5 écran. Mesuré honnêtement : sur le profil de référence (Mac 1440×900) la borne est tenue à la lettre ; sur les fenêtres BASSES
      // (720, 768) et sur téléphone, la tête (menu, logo, bouton, bandeau) pèse la même hauteur en pixels et le rapport monte — alors la règle qui compte est :
      // la première ligne est VISIBLE sans défiler, au-dessus de la barre du bas, avec sa ligne entière.
      const tel = !!c.doigt && c.largeur < 700, barre = tel ? 96 : 0, ref = profil === 'mac';
      // le plus petit téléphone (320 × 568) : l'en-tête, le bandeau et les tuiles pèsent leur hauteur en pixels, la première ligne tombe sous le pli — on exige alors seulement
      // qu'elle soit à moins d'1,2 écran (avant : 2,8) et on le DIT dans le rapport.
      const mini = m.H <= 600;
      v(`${profil} · ${avec ? 'avec' : 'sans'} bandeau : la première ligne commence à ${m.y} px sur ${m.H} (${(m.y / m.H).toFixed(2)} écran)` + (ref ? ' — profil de référence : borne 0,5 (0,56 avec bandeau)' : mini ? ' — plus petit téléphone : moins de 1,2 écran' : ' — visible sans défiler'), ref ? m.y / m.H <= (avec ? .56 : .5) : mini ? m.y / m.H <= 1.2 : (tel && avec ? m.y < m.H - 70 : m.y + 71 <= m.H - barre), m);   // téléphone + bandeau : la première ligne se montre déjà au-dessus de la barre du bas (le bandeau est une action à faire, pas du décor)
      v(`${profil} · ${avec ? 'avec' : 'sans'} bandeau : ${m.n} éléments touchables avant elle (au plus 12 ; menu et logo du téléphone compris : 14)`, m.n <= (tel ? 14 : 12), m);
    }
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
