// Matériel, étape 4 (Fournisseurs, matériel & produits) — LA DENSITÉ (spec § 1 et § 13) : la première ligne de donnée de chaque onglet doit venir avant la moitié de l'écran (0,6 au téléphone : le titre y passe sur deux lignes)
// et au plus 12 éléments touchables avant elle (dans l'écran, pas dans le menu). On compte la population d'abord : une mesure sur zéro ligne ne prouve rien.
// Usage : node materiel-four-densite.js [profil ...] → « N ✓ · M ✗ »  (défaut : les sept profils)
const L = require('../lib.js');
(async () => {
  const v = L.v, profils = process.argv.length > 2 ? process.argv.slice(2) : ['mac', 'mac720', 'windows', 'ipad', 'iphone', 'android', 'petit'];
  for (const profil of profils) {
    const c = await L.ouvrir({ profil, qui:'marc' }), p = c.p, tel = !!L.PROFILS[profil].mobile, SEUIL = tel ? .6 : .5;
    await L.aller(p, 'produits');
    for (const [onglet, sel, nom] of [['commandes', '.fx-acmd .fx-pl', 'Commandes (première ligne à commander)'], ['articles', '.fx-arts .fx-a', 'Articles'], ['fournisseurs', '.fx-c', 'Fournisseurs']]) {
      await p.evaluate(k => { prVue = k; rendre(); window.scrollTo(0, 0); }, onglet); await L.calme(p, 450);
      const m = await p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; const y = e.getBoundingClientRect().top + scrollY, h = innerHeight, Z = document.getElementById('contenu');
        const tous = [...Z.querySelectorAll('button, a[href], input, select, textarea, summary')].filter(x => x.offsetParent && x.getBoundingClientRect().width > 1 && x.getBoundingClientRect().top + scrollY < y - 1 && !e.contains(x));
        return { lignes:document.querySelectorAll(sel).length, y:Math.round(y), h, ratio:Math.round(y / h * 100) / 100, avant:tous.length, qui:tous.map(x => (x.getAttribute('aria-label') || x.textContent || x.placeholder || x.tagName).trim().slice(0, 24)) }; }, sel);
      v(profil + ' · ' + nom + ' : la population existe', !!m && m.lignes >= 3, m);
      if (!m) continue;
      v(profil + ' · ' + nom + ' : première ligne à ' + Math.round(m.ratio * 100) + ' % de l’écran (' + m.y + ' px sur ' + m.h + ')', m.ratio <= SEUIL, m);
      v(profil + ' · ' + nom + ' : ' + m.avant + ' éléments touchables avant elle (12 au plus)', m.avant <= 12, m.qui);
    }
    v(profil + ' : aucune erreur de page', c.err.length === 0, c.err); await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 120) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
