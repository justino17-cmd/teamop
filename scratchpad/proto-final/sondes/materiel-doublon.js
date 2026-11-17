// Matériel, étape 5 (lot 6) — LE DOUBLE APPUI NE CRÉE JAMAIS UN SECOND ENVOI (spec § 8.1 (4), § 13 : la panne F2). Un technicien dans un camion, les doigts froids, touche deux fois : « Je l'ai pris »,
// « J'ai tout pris », « Envoyer » (J'ai utilisé) et « Prévenir le bureau » (Il me manque une pièce) ne doivent faire partir qu'UNE ligne vers le gérant ; la ligne passe à « Envoyé au bureau » et le bouton disparaît.
// Joué deux fois : par deux clics dans le même instant (le plus dur) ET par un vrai double toucher. Usage : node materiel-doublon.js [profil] → « N ✓ · M ✗ »
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'iphone', c = await L.ouvrir({ profil, qui:'sm' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  const att = () => R(() => MVTS_ATT.length), dem = () => R(() => DEM_ACHAT.length);
  const propre = async () => { await L.ranger(p); await R(() => { MVTS_ATT.splice(0, MVTS_ATT.length, ...MVTS_ATT.filter(m => ['a1', 'a2'].includes(m.id))); rendre(); }); await L.aller(p, 'moncamion'); await L.calme(p, 400); };
  await propre(); const a0 = await att();
  v('population : Sophie a des pièces à prendre (' + (await R(() => document.querySelectorAll('[data-vis="camion-manque"] [data-mat^="pris|"]').length)) + ') et ' + a0 + ' envois déjà en attente', (await R(() => document.querySelectorAll('[data-vis="camion-manque"] [data-mat^="pris|"]').length)) >= 2 && a0 === 2);
  // « Je l'ai pris » : deux clics dans le même instant
  await R(() => { const b = document.querySelector('[data-vis="camion-manque"] [data-mat^="pris|"]'); b.click(); b.click(); }); await L.calme(p, 400);
  v('« Je l\'ai pris », deux clics dans le même instant : UNE seule demande de plus (' + a0 + ' → ' + (await att()) + ')', (await att()) === a0 + 1);
  v('…la ligne passe à « Envoyé au bureau · en attente » (une ligne grise, avec « Annuler »)', await R(() => document.querySelectorAll('.mc-l.envoye').length === 1 && /Envoyé au bureau/.test(document.querySelector('.mc-l.envoye').textContent)));
  // un vrai double toucher sur une AUTRE ligne
  await propre(); const b0 = await att();
  await p.locator('[data-vis="camion-manque"] [data-mat^="pris|"]').first().dblclick({ timeout:4000 }).catch(async () => { await R(() => { const b = document.querySelector('[data-vis="camion-manque"] [data-mat^="pris|"]'); b.click(); b.click(); }); }); await L.calme(p, 400);
  v('« Je l\'ai pris », un vrai double toucher : UNE seule demande (' + b0 + ' → ' + (await att()) + ')', (await att()) === b0 + 1);
  // « J'ai tout pris · N »
  await propre(); const t0 = await att();
  await R(() => { const b = document.querySelector('[data-mat="toutpris"]'); b.click(); b.click(); b.click(); }); await L.calme(p, 400);
  const t1 = await att(), nb = await R(() => document.querySelectorAll('.mc-l.envoye').length);
  v('« J\'ai tout pris », trois clics : une demande par pièce, JAMAIS une de plus (' + (t1 - t0) + ' demandes, ' + nb + ' lignes grises, plus de bouton)', t1 - t0 === nb && nb >= 2 && !(await R(() => document.querySelector('[data-mat="toutpris"]'))), { t0, t1, nb });
  // le second « J'ai tout pris » (le bouton a disparu) ne peut rien créer ; une pièce déjà envoyée ne se renvoie pas
  const ids = await R(() => MVTS_ATT.filter(m => !['a1', 'a2'].includes(m.id)).map(m => m.pid + '|' + m.de + '|' + m.vers));
  v('aucune pièce n\'est envoyée deux fois (' + ids.length + ' demandes, ' + new Set(ids).size + ' distinctes)', ids.length === new Set(ids).size, ids);
  // « Envoyer » de « J'ai utilisé chez un client »
  await propre(); const u0 = await att();
  await R(() => document.querySelector('[data-mat="usage"]').click()); await L.calme(p, 400); await R(() => document.querySelector('#calque [data-mat^="ajoute|"]').click()); await L.calme(p, 300);
  await R(() => { const b = document.querySelector('#calque [data-mat="envoyer"]'); b.click(); b.click(); }); await L.calme(p, 500);
  v('« Envoyer » (J\'ai utilisé), deux clics : UNE seule demande (' + u0 + ' → ' + (await att()) + ')', (await att()) === u0 + 1 && !(await R(() => document.querySelector('#calque .panneau'))));
  // « Prévenir le bureau » (Il me manque une pièce)
  await propre(); const m0 = await dem();
  await R(() => document.querySelector('[data-mat="manque"]').click()); await L.calme(p, 400); await p.fill('#mm-rech', 'raccord'); await L.calme(p, 300); await R(() => document.querySelector('#calque [data-mat^="mpiece|"]').click()); await L.calme(p, 300);
  await R(() => { const b = document.querySelector('#calque [data-mat="menvoyer"]'); b.click(); b.click(); }); await L.calme(p, 500);
  v('« Prévenir le bureau » (Il me manque une pièce), deux clics : UNE seule demande d\'achat (' + m0 + ' → ' + (await dem()) + ')', (await dem()) === m0 + 1);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 100) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
