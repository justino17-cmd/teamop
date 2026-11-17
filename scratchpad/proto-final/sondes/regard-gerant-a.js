// LE REGARD — gérant, rubriques Accueil · Statistiques · Historique · Planning · Interventions · Tâches · Absences et congés.
// Contrôles DURABLES des défauts de mise en page vus sur les captures (regard-gerant-a-captures.js) puis corrigés à la source.
// Rejouable seul : node scratchpad/proto-final/sondes/regard-gerant-a.js   →  « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// Chaque défaut : la mesure qui l'accuse est celle qui le garde (on a vu la capture, la corrigé, puis on mesure).
const L = require('../lib.js');
const v = L.v, F = process.argv[2] || '', sec = n => !F || F.split(',').includes(n);   // « node regard-gerant-a.js 3 » ne joue que le contrôle 3 (les mutations en rejouent un à la fois)
// getComputedStyle rend un color-mix() sous la forme « color(srgb 0.99 0.95 0.87) » : des flottants 0–1, pas du rgb() 0–255 (règle du dépôt : reconnaître la FORME avant de convertir)
const RVB = t => { const m = String(t).match(/[\d.]+/g); if (!m) return null; const n = m.map(Number); return /^color\(/.test(t) ? n.slice(0, 3).map(x => Math.round(x * 255)).concat(n[3] === undefined ? [1] : [n[3]]) : n.slice(0, 3).concat(n[3] === undefined ? [1] : [n[3]]); };
(async () => {
  // 1. PLANNING, les deux boutons de l'en-tête : à 360 px « ＋ Nouvelle intervention » dépassait la pastille de 5 px (son dernier
  //    « n », blanc, se perdait sur le fond clair) ; à 390 px le texte touchait les deux bords. On mesure le TEXTE (Range), pas la boîte.
  if (sec('1')) {
  for (const profil of ['petit', 'android', 'iphone']) for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil, qui: 'marc', nuit }); await L.aller(c.p, 'planning');
    const r = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .tete .actions .btn')].map(b => { const cs = getComputedStyle(b), rg = document.createRange(); rg.selectNodeContents(b); const t = rg.getBoundingClientRect(), bb = b.getBoundingClientRect();
      return { t: b.textContent.trim(), marge: Math.round(Math.min(t.left - bb.left, bb.right - t.right) * 10) / 10, dedans: t.left >= bb.left && t.right <= bb.right }; }));
    v(`planning ${profil} ${nuit ? 'nuit' : 'jour'} : les deux boutons de l'en-tête sont comptés (population)`, r.length === 2, r);
    for (const b of r) v(`planning ${profil} ${nuit ? 'nuit' : 'jour'} : « ${b.t} » a au moins 6 px d'air de chaque côté du texte`, b.dedans && b.marge >= 6, b);
    await L.fin(c);
  }

  }
  // 2. TÂCHES, l'en-tête du bureau : la phrase d'intro faisait 1 060 px sur UNE ligne et poussait « Exporter en PDF » sous elle,
  //    alors que partout ailleurs (Statistiques, Historique, Absences) le bouton est en haut à droite.
  if (sec('2')) {
  for (const profil of ['mac', 'windows', 'mac720']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await L.aller(c.p, 'taches');
    const r = await c.p.evaluate(() => { const h = document.querySelector('#contenu .tete h1'), b = document.querySelector('#contenu .tete .tkx-pdf'), i = document.querySelector('#contenu .tkx-intro'); if (!h || !b || !i) return null;
      const rb = b.getBoundingClientRect(), ri = i.getBoundingClientRect(), rh = h.getBoundingClientRect(); return { btnHaut: Math.round(rb.top), introBas: Math.round(ri.bottom), titreHaut: Math.round(rh.top), btnDroite: Math.round(rb.right), larg: innerWidth, introLarg: Math.round(ri.width) }; });
    v(`tâches ${profil} : l'en-tête est trouvé (population)`, !!r, r);
    if (r) { v(`tâches ${profil} : « Exporter en PDF » reste dans la rangée du titre (en haut du sous-titre, pas dessous)`, r.btnHaut < r.introBas - 10, r); v(`tâches ${profil} : le bouton est collé à droite comme sur les autres écrans`, r.btnDroite > r.larg - 60, r); }
    await L.fin(c);
  }

  }
  // 3. PLANNING, vue d'ensemble : Lun → Sam doit tenir SANS défiler à 1 366 px (la colonne du samedi, celle d'aujourd'hui, sortait de
  //    17 px sur un Mac et sa carte était coupée à droite).
  if (sec('3')) {
  for (const [profil, doitTenir] of [['mac', true], ['windows', true], ['mac720', false]]) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await L.aller(c.p, 'planning'); await c.p.evaluate(() => document.querySelector('[data-plvue=general]').click()); await L.calme(c.p, 700);
    const r = await c.p.evaluate(() => { const d = document.querySelector('.pl-defile'), g = d && d.querySelector('.pg-g'); return d && g ? { sw: d.scrollWidth, cw: d.clientWidth, cartes: g.querySelectorAll('.pc').length, jours: g.querySelectorAll('.pl-jh').length } : null; });
    v(`planning général ${profil} : la grille est trouvée, avec des cartes (population)`, !!r && r.cartes > 5 && r.jours === 7, r);
    if (r && doitTenir) v(`planning général ${profil} : six jours tiennent sans défiler (${r && r.sw} / ${r && r.cw})`, r.sw <= r.cw + 1, r);
    if (r && !doitTenir) v(`planning général ${profil} (1 280 px) : la grille défile, c'est voulu, et reste lisible`, r.sw >= r.cw, r);
    await L.fin(c);
  }

  }
  // 4. TÂCHES au téléphone : un champ qui coupe son texte d'invite au milieu d'un mot (« Chercher une tâ », « Nouvelle tâche pour dema »)
  //    n'invite à rien. On mesure le texte d'invite contre la place du champ, sur chaque onglet qui le porte.
  if (sec('4')) {
  for (const profil of ['petit', 'android', 'iphone', 'ipad']) {
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

  }
  // 4 bis. PLANNING sur iPad (820 px, menu permanent : 540 px pour le contenu) : les six vues doivent TOUTES se voir. « Carte » sortait à droite
  //        de la rangée (cachée par son défilement) — règle du dépôt : ce qu'on ne voit pas n'existe pas.
  if (sec('4b')) {
  for (const profil of ['ipad', 'windows']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await L.aller(c.p, 'planning');
    const r = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .pl-barre > .seg[aria-label="Vue"] button')].map(b => { const x = b.getBoundingClientRect(), box = b.closest('#contenu').getBoundingClientRect(); return { t: b.textContent.trim(), dedans: x.width > 10 && x.left >= box.left - 1 && x.right <= box.right + 1 && x.right <= innerWidth }; }));
    v(`planning ${profil} : les six vues sont comptées (population)`, r.length === 6, r);
    for (const b of r) v(`planning ${profil} : la vue « ${b.t} » se voit en entier dans la page`, b.dedans, b);
    await L.fin(c);
  }

  }
  // 5. TÂCHES, « Retards d'équipe » à 320 px : le ⚠️ restait seul sur la première ligne, le texte entier passait en dessous.
  if (sec('5')) {
  { const c = await L.ouvrir({ profil: 'petit', qui: 'marc' }); await L.aller(c.p, 'taches');
    const r = await c.p.evaluate(() => { const b = document.querySelector('#contenu .tkx-resume'); if (!b) return null; const ic = b.children[0].getBoundingClientRect(), tx = b.children[1].getBoundingClientRect(); return { icCentre: Math.round((ic.top + ic.bottom) / 2), txHaut: Math.round(tx.top), txBas: Math.round(tx.bottom), txGauche: Math.round(tx.left), icDroite: Math.round(ic.right) }; });
    v('tâches petit : le bandeau « Retards d\'équipe » est trouvé (population)', !!r, r);
    if (r) v('tâches petit : le ⚠️ et le texte sont sur la MÊME ligne (le texte commence à droite du signe)', r.txGauche >= r.icDroite - 1 && r.icCentre >= r.txHaut && r.icCentre <= r.txBas, r);
    await L.fin(c); }

  }
  // 6. BANDEAUX D'ALERTE (Tâches « Retards d'équipe », Absences « À régler avant de valider ») : de jour, 10-12 % du brun --orange
  //    donnait un gris-beige terne (238,232,227) à côté des cartes blanches. Une crème d'ambre claire : rouge ≥ 250, bleu ≥ 205, et plus chaude que grise.
  if (sec('6')) {
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

  }
  // 7. PLANNING, Mois au téléphone : le bilan « Le mois d'octobre 2026 · qui a travaillé » vit dans la rangée qui défile de côté (calée sur
  //    aujourd'hui) ; il partait à −467 px avec la grille et ne laissait qu'un bloc blanc. Il doit rester dans l'écran.
  if (sec('7')) { for (const profil of ['iphone', 'android', 'petit']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await L.aller(c.p, 'planning'); await c.p.evaluate(() => document.querySelector('[data-plvue=mois]').click()); await L.calme(c.p, 900);
    const r = await c.p.evaluate(() => { const d = document.querySelector('.pl-defile'), b = d && d.querySelector('.pl-mrec'); if (!d || !b) return null; const x = b.getBoundingClientRect(); return { gauche: Math.round(x.left), droite: Math.round(x.right), defile: Math.round(d.scrollLeft), largeur: innerWidth }; });
    v(`planning mois ${profil} : le bilan du mois est trouvé, et la grille a bien défilé (population : défilement > 0)`, !!r && r.defile > 0, r);
    if (r) v(`planning mois ${profil} : le bilan du mois reste dans l'écran`, r.gauche >= 0 && r.droite <= r.largeur, r);
    await L.fin(c); } }
  // 8. FICHE D'INTERVENTION, nom de client LONG : le lien du nom passait sur deux lignes CENTRÉES (un bouton centre son texte) au milieu d'une page alignée à gauche.
  if (sec('8')) { const c = await L.ouvrir({ profil: 'iphone', qui: 'marc' });
    await c.p.evaluate(() => { Object.values(CLIENTS).forEach(x => { x.nom = 'Résidence Les Terrasses de la Grande Plage et du Vieux Port'; }); }); await L.aller(c.p, 'inter-x-i1');
    const r = await c.p.evaluate(() => { const b = document.querySelector('#contenu .tete .lien'); if (!b) return null; const lh = parseFloat(getComputedStyle(b).lineHeight) || 20; return { align: getComputedStyle(b).textAlign, lignes: Math.round(b.getBoundingClientRect().height / lh) }; });
    v('fiche : le nom du client est trouvé et passe sur plusieurs lignes (population)', !!r && r.lignes >= 2, r);
    if (r) v('fiche : ses lignes sont alignées à gauche, comme le reste de la page', r.align === 'left' || r.align === 'start', r);
    await L.fin(c); }
  // 9. TÂCHES, le menu « Équipe » (381–760 px) : 2 px de marge à droite, le mot touchait la flèche. Il garde de quoi loger la flèche (≥ 16 px) et le mot tient.
  if (sec('9')) { const c = await L.ouvrir({ profil: 'iphone', qui: 'marc' }); await L.aller(c.p, 'taches');
    const r = await c.p.evaluate(() => { const s = document.querySelector('#contenu select.t-pour'); if (!s || !s.offsetParent) return null; const cs = getComputedStyle(s), cv = document.createElement('canvas').getContext('2d'); cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      return { mot: s.options[s.selectedIndex].text, texte: Math.round(cv.measureText(s.options[s.selectedIndex].text).width), dispo: Math.round(s.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), droite: parseFloat(cs.paddingRight) }; });
    v('tâches iphone : le menu « Équipe » est trouvé (population)', !!r, r);
    if (r) { v('tâches iphone : le mot tient à côté de la flèche native (≈ 14 px dans la boîte) avec 4 px d\'air', r.texte + 18 <= r.dispo, r); }
    await L.fin(c); }
  // 10. ABSENCES, calendrier : le nom du mois colle à droite de la colonne des noms (250 px). À 208 px il passait 42 px SOUS elle et « Octobre 2026 » se lisait « re 2026 ».
  if (sec('10')) { for (const profil of ['ipad', 'mac', 'windows', 'iphone', 'android']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await L.aller(c.p, 'absences'); await c.p.evaluate(() => document.querySelector('[data-aonglet=calendrier]').click()); await L.calme(c.p, 900);
    const r = await c.p.evaluate(() => { const nn = [...document.querySelectorAll('.ac-nom')].find(e => e.offsetParent), ems = [...document.querySelectorAll('.ac-mo em')].filter(e => e.offsetParent); if (!nn || !ems.length) return null; const bord = nn.getBoundingClientRect().right;
      return { bord: Math.round(bord), mois: ems.map(e => ({ t: e.textContent, gauche: Math.round(e.getBoundingClientRect().left) })) }; });
    v(`absences calendrier ${profil} : la colonne des noms et les mois sont trouvés (population)`, !!r && r.mois.length >= 1, r);
    if (r) for (const m of r.mois) v(`absences calendrier ${profil} : « ${m.t} » commence à droite de la colonne des noms (${m.gauche} ≥ ${r.bord})`, m.gauche >= r.bord - 1, r);
    await L.fin(c); } }
  // 11. INTERVENTIONS, liste vide : « Rien ici. » seul laissait un débutant sans piste. La liste dit pourquoi (par filtre) et, quand on peut en créer une, propose le geste.
  if (sec('11')) { for (const profil of ['mac', 'iphone']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await L.aller(c.p, 'interventions'); await c.p.evaluate(() => { INTS.length = 0; rendre(); }); await L.calme(c.p, 500);
    for (const [f, creer] of [['auj', true], ['avenir', true], ['plan', false], ['fait', false], ['tout', true]]) {
      await c.p.evaluate(x => document.querySelector(`[data-filtreint=${x}]`).click(), f); await L.calme(c.p, 400);
      const r = await c.p.evaluate(() => { const e = [...document.querySelectorAll('#contenu .t-vide')].find(x => x.offsetParent); return e ? { titre: (e.querySelector('b') || {}).textContent, aide: (e.querySelector('span') || {}).textContent, bouton: !!e.querySelector('[data-creer]'), brut: /Rien ici\./.test(document.getElementById('contenu').textContent) } : null; });
      v(`interventions ${profil} vide « ${f} » : un état vide complet est affiché (population)`, !!r && !!r.titre && !!r.aide, r);
      if (r) { v(`interventions ${profil} vide « ${f} » : plus de « Rien ici. » nu`, !r.brut, r); v(`interventions ${profil} vide « ${f} » : ${creer ? 'le geste « Nouvelle intervention » est proposé' : 'pas de bouton de création (rien à créer ici)'}`, r.bouton === creer, r); }
    }
    await L.fin(c); } }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
