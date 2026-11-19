// Le tableau de calcul de la TVA (OP COMPTABLE) prend la LARGEUR UTILE de sa carte sur iPad et iPhone (il était borné à 540 px : 77 % sur iPad),
// sans rien qui dépasse la largeur du profil, jour et nuit, même avec des montants très longs. Sur grand écran à la souris la borne reste (contre-épreuve).
// usage : node compta-reste-tva-largeur.js [profil] [nuit]     — sort en 1 si un contrôle tombe
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'ipad', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p; const f = await X.cadreCompta(c);
  await f.evaluate(() => { try { entrerLibre && UI.mode === 'choix' && entrerLibre(); } catch (e) {} aller('tva'); }); await p.waitForTimeout(700);
  const mes = () => f.evaluate(() => { const t = document.querySelector('#contenu .tva-calc'); if (!t) return null; const ca = t.closest('.carte'), cs = getComputedStyle(ca), inner = ca.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), r = t.getBoundingClientRect();
    return { lignes: t.children.length, w: Math.round(r.width), carte: Math.round(inner), droite: Math.round(r.right), W: innerWidth, defile: document.documentElement.scrollWidth - document.documentElement.clientWidth }; });
  const m = await mes(); v(`population : le tableau de calcul existe (${m && m.lignes} lignes) sur ${profil}${nuit ? ' nuit' : ''}`, !!m && m.lignes >= 3, m);
  if (m) {
    const doigt = !!c.doigt;
    if (doigt) v(`le tableau prend la largeur de sa carte (${m.w} sur ${m.carte} px)`, m.w >= m.carte - 1, m);
    else v(`sur grand écran à la souris la borne de lecture reste (${m.w} px, carte ${m.carte})`, m.w <= 541, m);
    v('rien ne dépasse la largeur du profil', m.droite <= c.largeur && m.defile <= 0, m);
    // valeurs longues : un montant de 14 signes ne fait pas glisser la page
    await f.evaluate(() => { document.querySelectorAll('#contenu .tva-calc b').forEach(b => { b.textContent = '−12 345 678 901,23 €'; }); }); await p.waitForTimeout(300);
    const l = await mes(); v('avec des montants très longs, rien ne dépasse non plus', l.droite <= c.largeur && l.defile <= 0, l);
    await L.capture(c, X.CAP + `tva-largeur-${profil}-${nuit ? 'nuit' : 'jour'}.png`);
  }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
