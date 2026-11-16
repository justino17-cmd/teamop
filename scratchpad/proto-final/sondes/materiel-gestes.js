// Matériel — les « dix gestes » du §11 de refonte/MATERIEL.md, COMPTÉS au toucher. Cette sonde grandit d'étape en étape : l'étape 1 y met les gestes du
// TECHNICIEN (1, 2, 3, 5, 10) ; les gestes du gérant et du bureau (4, 6, 7, 8, 9) s'ajoutent avec Stock, Dépôts et Fournisseurs.
// Un geste = un toucher ou un clic (la barre du bas compte 1) ; les saisies ne comptent pas. Chaque geste doit ABOUTIR : le chiffre relu avant/après change comme prévu.
// Usage : node materiel-gestes.js → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v;
  const c = await L.ouvrir({ profil:'iphone', qui:'sm' }), p = c.p; let n = 0;
  const T = async (s, o) => { n++; const ok = await L.toucher(c, s, o); if (ok === false) throw new Error('cible non atteinte : ' + s); };
  const R = (f, a) => p.evaluate(f, a), zero = () => { n = 0; };
  const retour = async () => { await L.ranger(p); await L.aller(p, 'majournee'); await L.calme(p, 250); zero(); };
  const att = () => R(() => MVTS_ATT.length), dem = () => R(() => DEM_ACHAT.length);
  const barre = '.opg-tab[data-tab="moncamion"]';
  await retour();
  // population : la barre du bas existe et porte « Camion »
  v('population : la barre du bas porte « Camion » (le technicien y arrive en UN toucher)', await R(s => !!document.querySelector(s), barre));

  // GESTE 1 — voir ce qui manque dans mon camion : 1 toucher, la carte est visible sans défiler
  await T(barre); await L.calme(p, 400);
  const g1 = await R(() => { const m = document.querySelector('[data-vis="camion-manque"]'); const r = m && m.querySelector('.mc-l') && m.querySelector('.mc-l').getBoundingClientRect(); return { titre:m && m.querySelector('h3') && m.querySelector('h3').textContent.trim(), bas:r && Math.round(r.bottom), H:innerHeight }; });
  v('geste 1 · voir ce qui manque : 1 toucher (' + n + '), la carte « Il manque à bord » est visible sans défiler (' + g1.bas + ' < ' + g1.H + ')', n === 1 && /^Il manque à bord · \d/.test(g1.titre || '') && g1.bas < g1.H, g1);

  // GESTE 2 — savoir où est une pièce : Camion (1) puis le champ (2) ; la réponse dit les endroits
  await retour(); await T(barre); await L.calme(p, 300); await T('#mc-q'); await p.fill('#mc-q', 'filtre'); await L.calme(p, 300);
  const g2 = await R(() => (document.getElementById('mc-res') || {}).textContent || '');
  v('geste 2 · où est telle pièce : 2 touchers (' + n + ') puis la frappe, la réponse dit mon camion, l\'atelier, le camion d\'un collègue', n === 2 && /mon camion \d/.test(g2) && /atelier \d/.test(g2) && /camion de/.test(g2), g2.replace(/\s+/g, ' ').trim());

  // GESTE 3 — dire ce que j'ai utilisé : Camion, « J'ai utilisé », l'article, « Envoyer » = 4
  await retour(); const a0 = await att(); await T(barre); await L.calme(p, 300); await T('[data-mat="usage"]'); await L.calme(p, 300);
  await T('#calque [data-mat^="ajoute|"]'); await L.calme(p, 200); await T('#calque [data-mat="envoyer"]'); await L.calme(p, 300);
  v('geste 3 · dire ce que j\'ai utilisé : 4 touchers (' + n + ') — Camion, « J\'ai utilisé », l\'article, « Envoyer » — et UN envoi part', n === 4 && (await att()) === a0 + 1, [n, a0, await att()]);

  // GESTE 5 — dire ce que j'ai pris à l'atelier : Camion, « J'ai tout pris · N » = 2, doublon impossible
  await retour(); await R(() => { MVTS_ATT.splice(0, MVTS_ATT.length, ...MVTS_ATT.filter(m => ['a1', 'a2'].includes(m.id))); rendre(); }); const b0 = await att();
  await T(barre); await L.calme(p, 300); await T('[data-mat="toutpris"]'); await L.calme(p, 300);
  const b1 = await att(); const gris = await R(() => document.querySelectorAll('.mc-l.envoye').length);
  v('geste 5 · dire ce que j\'ai pris : 2 touchers (' + n + ') — Camion, « J\'ai tout pris » — ' + (b1 - b0) + ' demandes, ' + gris + ' lignes grises', n === 2 && b1 - b0 >= 2 && gris === b1 - b0, [b0, b1, gris]);
  await R(() => document.querySelector('[data-mat="toutpris"]') && document.querySelector('[data-mat="toutpris"]').click());
  v('… et un nouvel appui ne crée rien (le bouton a disparu)', (await att()) === b1);

  // GESTE 10 — signaler une pièce manquante : Camion, « Il me manque une pièce », la pièce, « Prévenir le bureau » = 4
  await retour(); const d0 = await dem(); await T(barre); await L.calme(p, 300); await T('[data-mat="manque"]'); await L.calme(p, 300);
  await p.fill('#mm-rech', 'raccord'); await L.calme(p, 250); await T('#calque [data-mat^="mpiece|"]'); await L.calme(p, 200); await T('#calque [data-mat="menvoyer"]'); await L.calme(p, 300);
  v('geste 10 · signaler une pièce manquante : 4 touchers (' + n + ') — Camion, « Il me manque », la pièce, « Prévenir le bureau » — UNE demande de plus', n === 4 && (await dem()) === d0 + 1, [n, d0, await dem()]);
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
