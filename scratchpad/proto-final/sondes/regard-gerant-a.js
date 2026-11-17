// LE REGARD — gérant, rubriques Accueil · Statistiques · Historique · Planning · Interventions · Tâches · Absences et congés.
// Contrôles DURABLES des défauts de mise en page vus sur les captures (regard-gerant-a-captures.js) puis corrigés à la source.
// Rejouable seul : node scratchpad/proto-final/sondes/regard-gerant-a.js   →  « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// Chaque défaut : la mesure qui l'accuse est celle qui le garde (on a vu la capture, la corrigé, puis on mesure).
const L = require('../lib.js');
const v = L.v;
// getComputedStyle rend un color-mix() sous la forme « color(srgb 0.99 0.95 0.87) » : des flottants 0–1, pas du rgb() 0–255 (règle du dépôt : reconnaître la FORME avant de convertir)
const RVB = t => { const m = String(t).match(/[\d.]+/g); if (!m) return null; const n = m.map(Number); return /^color\(/.test(t) ? n.slice(0, 3).map(x => Math.round(x * 255)).concat(n[3] === undefined ? [1] : [n[3]]) : n.slice(0, 3).concat(n[3] === undefined ? [1] : [n[3]]); };
(async () => {
  // 1. PLANNING, les deux boutons de l'en-tête : à 360 px « ＋ Nouvelle intervention » dépassait la pastille de 5 px (son dernier
  //    « n », blanc, se perdait sur le fond clair) ; à 390 px le texte touchait les deux bords. On mesure le TEXTE (Range), pas la boîte.
  for (const profil of ['petit', 'android', 'iphone']) for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil, qui: 'marc', nuit }); await L.aller(c.p, 'planning');
    const r = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .tete .actions .btn')].map(b => { const cs = getComputedStyle(b), rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect(), bb = b.getBoundingClientRect();
      return { t: b.textContent.trim(), marge: Math.round(Math.min(t.left - bb.left, bb.right - t.right) * 10) / 10, dedans: t.left >= bb.left && t.right <= bb.right }; }));
    v(`planning ${profil} ${nuit ? 'nuit' : 'jour'} : les deux boutons de l'en-tête sont comptés (population)`, r.length === 2, r);
    for (const b of r) v(`planning ${profil} ${nuit ? 'nuit' : 'jour'} : « ${b.t} » a au moins 6 px d'air de chaque côté du texte`, b.dedans && b.marge >= 6, b);
    await L.fin(c);
  }
  // 2. TÂCHES, l'en-tête du bureau : la phrase d'intro faisait 1 060 px sur UNE ligne et poussait « Exporter en PDF » sous elle,
  //    alors que partout ailleurs (Statistiques, Historique, Absences) le bouton est en haut à droite.
  for (const profil of ['mac', 'windows', 'mac720']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await L.aller(c.p, 'taches');
    const r = await c.p.evaluate(() => { const h = document.querySelector('#contenu .tete h1'), b = document.querySelector('#contenu .tete .tkx-pdf'), i = document.querySelector('#contenu .tkx-intro'); if (!h || !b || !i) return null;
      const rb = b.getBoundingClientRect(), ri = i.getBoundingClientRect(), rh = h.getBoundingClientRect(); return { btnHaut: Math.round(rb.top), introBas: Math.round(ri.bottom), titreHaut: Math.round(rh.top), btnDroite: Math.round(rb.right), larg: innerWidth, introLarg: Math.round(ri.width) }; });
    v(`tâches ${profil} : l'en-tête est trouvé (population)`, !!r, r);
    if (r) { v(`tâches ${profil} : « Exporter en PDF » reste dans la rangée du titre (en haut du sous-titre, pas dessous)`, r.btnHaut < r.introBas - 10, r); v(`tâches ${profil} : le bouton est collé à droite comme sur les autres écrans`, r.btnDroite > r.larg - 60, r); }
    await L.fin(c);
  }
  // 3. PLANNING, vue d'ensemble : Lun → Sam doit tenir SANS défiler à 1 366 px (la colonne du samedi, celle d'aujourd'hui, sortait de
  //    17 px sur un Mac et sa carte était coupée à droite).
  for (const [profil, doitTenir] of [['mac', true], ['windows', true], ['mac720', false]]) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await L.aller(c.p, 'planning'); await c.p.evaluate(() => document.querySelector('[data-plvue=general]').click()); await L.calme(c.p, 700);
    const r = await c.p.evaluate(() => { const d = document.querySelector('.pl-defile'), g = d && d.querySelector('.pg-g'); return d && g ? { sw: d.scrollWidth, cw: d.clientWidth, cartes: g.querySelectorAll('.pc').length, jours: g.querySelectorAll('.pl-jh').length } : null; });
    v(`planning général ${profil} : la grille est trouvée, avec des cartes (population)`, !!r && r.cartes > 5 && r.jours === 7, r);
    if (r && doitTenir) v(`planning général ${profil} : six jours tiennent sans défiler (${r && r.sw} / ${r && r.cw})`, r.sw <= r.cw + 1, r);
    if (r && !doitTenir) v(`planning général ${profil} (1 280 px) : la grille défile, c'est voulu, et reste lisible`, r.sw >= r.cw, r);
    await L.fin(c);
  }
  // 4. TÂCHES au téléphone : un champ qui coupe son texte d'invite au milieu d'un mot (« Chercher une tâ », « Nouvelle tâche pour dema »)
  //    n'invite à rien. On mesure le texte d'invite contre la place du champ, sur chaque onglet qui le porte.
  for (const profil of ['petit', 'android', 'iphone']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await L.aller(c.p, 'taches');
    for (const onglet of ['auj', 'avenir']) {
      await c.p.evaluate(o => document.querySelector(`[data-tonglet=${o}]`).click(), onglet); await L.calme(c.p, 500);
      const r = await c.p.evaluate(() => [...document.querySelectorAll('#contenu input[placeholder]')].filter(i => i.offsetParent).map(i => { const cs = getComputedStyle(i), cv = document.createElement('canvas').getContext('2d'); cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
        const dispo = i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return { p: i.placeholder, texte: Math.round(cv.measureText(i.placeholder).width), dispo: Math.round(dispo) }; }));
      v(`tâches ${profil} ${onglet} : les champs à texte d'invite sont comptés (population)`, r.length >= 2, r);
      for (const x of r) v(`tâches ${profil} ${onglet} : « ${x.p} » tient dans son champ (${x.texte} / ${x.dispo} px)`, x.texte <= x.dispo, x);
    }
    await L.fin(c);
  }
  // 5. TÂCHES, « Retards d'équipe » à 320 px : le ⚠️ restait seul sur la première ligne, le texte entier passait en dessous.
  { const c = await L.ouvrir({ profil: 'petit', qui: 'marc' }); await L.aller(c.p, 'taches');
    const r = await c.p.evaluate(() => { const b = document.querySelector('#contenu .tkx-resume'); if (!b) return null; const ic = b.children[0].getBoundingClientRect(), tx = b.children[1].getBoundingClientRect(); return { icCentre: Math.round((ic.top + ic.bottom) / 2), txHaut: Math.round(tx.top), txBas: Math.round(tx.bottom), txGauche: Math.round(tx.left), icDroite: Math.round(ic.right) }; });
    v('tâches petit : le bandeau « Retards d\'équipe » est trouvé (population)', !!r, r);
    if (r) v('tâches petit : le ⚠️ et le texte sont sur la MÊME ligne (le texte commence à droite du signe)', r.txGauche >= r.icDroite - 1 && r.icCentre >= r.txHaut && r.icCentre <= r.txBas, r);
    await L.fin(c); }
  // 6. BANDEAUX D'ALERTE (Tâches « Retards d'équipe », Absences « À régler avant de valider ») : de jour, 10-12 % du brun --orange
  //    donnait un gris-beige terne (238,232,227) à côté des cartes blanches. Une crème d'ambre claire : rouge ≥ 250, bleu ≥ 205, et plus chaude que grise.
  { const c = await L.ouvrir({ profil: 'mac', qui: 'marc' }); await L.aller(c.p, 'taches');
    const f = await c.p.evaluate(() => { const e = document.querySelector('#contenu .tkx-resume'); if (!e) return null; return getComputedStyle(e).backgroundColor; }).then(RVB);
    v('tâches : le bandeau « Retards d\'équipe » est trouvé, de jour (population)', !!f, f);
    if (f) { v('tâches jour : le fond du bandeau est une crème claire (rouge ≥ 250, bleu ≥ 205, opaque)', f[0] >= 250 && f[2] >= 205 && f[3] === 1, f); v('tâches jour : et il reste chaud (rouge − bleu ≥ 18) — pas un gris', f[0] - f[2] >= 18, f); }
    await L.aller(c.p, 'absences'); await c.p.evaluate(() => document.querySelector('[data-aonglet=valider]').click()); await L.calme(c.p, 500);
    const g = await c.p.evaluate(() => { const e = document.querySelector('#contenu .a-alerte'); if (!e) return null; return getComputedStyle(e).backgroundColor; }).then(RVB);
    v('absences : le bandeau « À régler avant de valider » est trouvé (population)', !!g, g);
    if (g) v('absences jour : son fond est la même crème claire', g[0] >= 250 && g[2] >= 205, g);
    await L.fin(c); }
  { const c = await L.ouvrir({ profil: 'mac', qui: 'marc', nuit: true }); await L.aller(c.p, 'taches');
    const f = await c.p.evaluate(() => { const e = document.querySelector('#contenu .tkx-resume'); return e ? getComputedStyle(e).backgroundColor : null; });
    v('tâches nuit : le bandeau garde un fond SOMBRE (la crème est pour le jour)', !!f && (f.match(/[\d.]+/g).slice(0, 3).map(Number).reduce((a, b) => a + b, 0) / 3) < 120, f);
    await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
