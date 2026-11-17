// SONDE « bouton Retour » (17 novembre 2026) — POUR CHAQUE SORTE DE CALQUE RECENSÉE (CAL_GENRES), au doigt sur téléphone et tablette, à la souris sur ordinateur :
//   ouvrir → Retour → fermé ET même écran (adresse, défilement, rendu non rejoué) → Retour → l'écran d'avant ;
//   ouvrir → fermer par la croix → Retour → l'écran d'avant, UNE seule fois ; history.length compté à chaque pas ;
//   Avancer après un Retour ne rouvre pas une fenêtre vide ; six ouvertures-fermetures ne font pas grossir l'historique.
// PROFIL=android|iphone|mac|… (par défaut android) ; GENRE=<fragment du nom> pour n'en jouer qu'un. Rend « N ✓ · M ✗ ».
const C = require('./retour-commun.js'), L = C.L, v = C.v;
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'android', qui: 'marc' }), p = c.p, filtre = (process.env.GENRE || '').split(',').filter(Boolean);   // GENRE=panneau,pdf : une partie seulement (les genres sont lancés par groupes, la machine est partagée)
  // la population : le nombre de calques recensés dans la PAGE doit être celui de la table de la sonde (sinon un calque neuf passerait sans être éprouvé)
  const pageGenres = await p.evaluate(() => CAL_GENRES.map(g => g.k));
  const sondeGenres = [...new Set(C.GENRES.map(g => g.k).concat(C.AILLEURS))];   // la visite guidée n'existe que dans le prototype « nu » (retour-parcours.js)
  if (!filtre.length) v('population : les ' + pageGenres.length + ' sortes de calques de la page sont toutes dans la sonde', pageGenres.every(k => sondeGenres.includes(k)) && sondeGenres.every(k => pageGenres.includes(k)), [pageGenres, sondeGenres]);
  let joues = 0;
  for (const g of C.GENRES) {
    if (filtre.length && !filtre.some(f => g.k === f)) continue;
    if (!C.applicable(g, c)) { console.log('  · ' + g.nom + ' : n\'existe pas sur ce profil (' + c.profil + ')'); continue; }
    joues++; const nom = g.nom + ' · ' + c.profil, avant = g.ecran === 'accueil' ? 'devis' : 'accueil';   // l'écran d'AVANT : toujours un autre que celui du calque
    // on se place : l'écran d'avant, puis l'écran du calque, défilé, marqué
    const prepare = async () => { await L.aller(p, avant); await L.aller(p, g.ecran); if (g.prepare) await g.prepare(c); await C.defiler(p); await C.marquer(p); };
    const ouvre = async () => { if (g.dans && !(await g.ouvrirParent(c))) return false; return g.ouvrir(c); };
    await prepare(); const h0 = await C.hist(p);
    v(nom + ' : départ propre (aucun calque, pile vide)', h0.ouverts === '' && h0.pile === '' && h0.pousse === 0, h0);
    // ── 1. ouvrir : UNE entrée (UNE de plus par niveau), même adresse, marqueur d'état
    const ok = await ouvre(); const h1 = await C.hist(p), niv = g.dans ? 2 : 1;
    if (!v(nom + ' : le geste ouvre bien le calque', ok && h1.ouverts.split(',').includes(g.k), h1)) { await L.ranger(p); continue; }
    v(nom + ' : ouvrir pose ' + niv + ' entrée(s) d\'historique, à la même adresse', h1.n === h0.n + niv && h1.h === h0.h && h1.pousse === niv && h1.st && h1.st.cal === niv, [h0.n, h1.n, h1.h, h1.st]);
    // ── 2. Retour : ferme le dernier ouvert, l'écran dessous reste où il était
    await C.retour(p); const h2 = await C.hist(p);
    if (g.dans) {
      v(nom + ' : Retour ferme d\'abord la date (le dernier ouvert), la fenêtre reste', !h2.ouverts.split(',').includes(g.k) && h2.ouverts.split(',').includes(g.dans) && h2.pousse === 1 && h2.h === h0.h, h2);
      await C.retour(p);
    }
    const h2b = g.dans ? await C.hist(p) : h2;
    v(nom + ' : Retour ferme le calque (plus rien d\'ouvert, pile vide, aucune entrée en travers)', h2b.ouverts === '' && h2b.pile === '' && h2b.pousse === 0 && !(h2b.st && h2b.st.cal), h2b);
    v(nom + ' : … l\'écran est resté où il était (même adresse' + (g.rend ? '' : ', défilement resté à ' + h1.y + ' px') + ')', h2b.h === h0.h && (g.rend || Math.abs(h2b.y - h1.y) <= 2), [h0.h, h2b.h, h1.y, h2b.y]);   // un calque qui redessine l\'écran à sa fermeture (rend) le fait aussi par SA croix : le défilement n\'est pas la mesure
    v(nom + ' : … l\'historique n\'a pas grandi', h2b.n === h1.n, [h1.n, h2b.n]);
    if (!g.rend) v(nom + ' : … le rendu de l\'écran dessous n\'est pas rejoué (sa marque est encore là)', await C.marque(p));
    // ── 3. Retour encore : l'écran d'AVANT (pas un second exemplaire du même)
    await C.retour(p); const h3 = await C.hist(p);
    v(nom + ' : Retour encore : on quitte l\'écran pour celui d\'avant (#' + avant + ')', h3.h === '#' + avant && h3.ouverts === '', h3);
    // ── 4. fermer par la croix : l'entrée est consommée, UN Retour mène à l'écran d'avant
    await prepare(); const b0 = await C.hist(p); const ok2 = await ouvre();
    const croix = await g.croix(c); await C.attendre(p, 700); const b1 = await C.hist(p);
    if (g.dans) v(nom + ' : fermer la date par sa croix : elle seule se ferme, la fenêtre reste (une entrée)', ok2 && croix && b1.ouverts === g.dans && b1.pousse === 1 && b1.st && b1.st.cal === 1 && b1.h === b0.h, [ok2, croix, b1]);
    else v(nom + ' : fermer par la croix : fermé, plus d\'entrée en travers, l\'écran est resté', ok2 && croix && b1.ouverts === '' && b1.pousse === 0 && !(b1.st && b1.st.cal) && b1.h === b0.h, [ok2, croix, b1]);
    v(nom + ' : … l\'historique n\'a pas grandi de plus de ' + (g.dans ? 2 : 1) + ' (' + b0.n + ' → ' + b1.n + ')', b1.n <= b0.n + (g.dans ? 2 : 1), [b0.n, b1.n]);
    if (g.dans) { await C.retour(p); await C.attendre(p, 300); }   // la fenêtre est encore là : un Retour la ferme
    await C.retour(p); const b2 = await C.hist(p);
    v(nom + ' : … et UN Retour mène à l\'écran d\'avant (pas à un doublon)', b2.h === '#' + avant, [b0.h, b2.h]);
    // ── 5. Avancer ne rouvre rien
    await prepare(); await ouvre(); await C.retour(p); if (g.dans) await C.retour(p);
    await C.avancer(p); const f1 = await C.hist(p);
    v(nom + ' : Avancer après Retour ne rouvre pas une fenêtre vide', f1.ouverts === '' && f1.pousse === 0 && f1.h === h0.h && !(f1.st && f1.st.cal), f1);
    await C.retour(p); const f2 = await C.hist(p);
    v(nom + ' : … et le Retour suivant mène bien à l\'écran d\'avant (l\'entrée repoussée n\'est pas restée)', f2.h === '#' + avant, f2);
    // ── 6. six ouvertures-fermetures : l'historique ne grossit pas
    await prepare(); const n0 = (await C.hist(p)).n; let pas = 0;
    for (let i = 0; i < 6; i++) { if (!(await ouvre())) break; await g.croix(c); await C.attendre(p, 450); if (g.dans) { await g.croix(c).catch(() => {}); } pas++; if (g.dans) await L.ranger(p); }
    const n1 = await C.hist(p);
    v(nom + ' : ' + pas + ' ouvertures-fermetures : l\'historique n\'a pas grandi de plus de ' + (g.dans ? 2 : 1) + ' (' + n0 + ' → ' + n1.n + ')', pas >= 5 && n1.n <= n0 + (g.dans ? 2 : 1) && n1.pousse === 0 && n1.ouverts === '', [pas, n0, n1]);
    await L.ranger(p);
  }
  v('population : ' + joues + ' calques joués sur ce profil', joues >= (filtre.length ? 1 : 8), joues);
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
