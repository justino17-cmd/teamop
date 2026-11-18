// Le REGARD du gérant, rubriques Stock · Fournisseurs, matériel & produits · Dépôts et camions (17 novembre 2026).
// Chaque contrôle garde un défaut VU sur une capture (regardée à l'œil) puis corrigé à la source. Rejouable seul : « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// ⛔ 127.0.0.1 seulement, entreprise fictive, aucun serveur.
const L = require('../lib.js');
const v = L.v;
const aller = async (c, r) => { await L.aller(c.p, r); };
// « node regard-gerant-c.js 3 5 » ne joue que les sections 3 et 5 (les mutations n'en rejouent qu'une)
const SEL = process.argv.slice(2).map(Number), veut = n => !SEL.length || SEL.includes(n);
// largeur du texte d'une invite dans la police du champ : de quoi dire si elle tient (elle était coupée net à « une perso », « un fou »)
const invite = (p, sel) => p.evaluate(s => { const i = document.querySelector(s); if (!i) return null; const cs = getComputedStyle(i), c = document.createElement('canvas').getContext('2d'); c.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const util = i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return { texte: i.placeholder, large: Math.ceil(c.measureText(i.placeholder).width), util: Math.floor(util) }; }, sel);
(async () => {
  if (veut(1)) {
  // 1. Les bandeaux (Stock, Dépôts, Articles) : plus de rond vide qui ressemble à une case à cocher
  for (const profil of ['mac', 'iphone']) {
    const c = await L.ouvrir({ profil, qui: 'marc' });
    for (const [rub, att] of [['stock', 'Stock'], ['boxes', 'Dépôts et camions']]) {
      await aller(c, rub);
      const r = await c.p.evaluate(() => ({ n: document.querySelectorAll('.ms-bandeau').length, ronds: [...document.querySelectorAll('.ms-bandeau .t-etat')].filter(e => e.offsetWidth > 0).length }));
      v(`${att} (${profil}) : population — un bandeau`, r.n === 1, r);
      v(`${att} (${profil}) : aucun rond vide visible dans le bandeau`, r.ronds === 0, r);
    }
    // le bandeau des Articles (« à compléter ») n'apparaît pas dans ce jeu : on le POSE à la main pour juger la règle de feuille
    await c.p.evaluate(() => { const d = document.createElement('div'); d.className = 'carte dv-focus ms-bandeau'; d.id = 'faux-bandeau'; d.innerHTML = '<div class="dv-tache"><span class="t-etat" aria-hidden="true"></span><span class="dv-c"><b>x</b></span></div>'; document.getElementById('contenu').prepend(d); });
    const r = await c.p.evaluate(() => ({ ronds: [...document.querySelectorAll('#faux-bandeau .t-etat')].filter(e => e.offsetWidth > 0).length, pose: !!document.getElementById('faux-bandeau') }));
    v(`bandeau ajouté à la main (${profil}) : posé, et sans rond vide`, r.pose && r.ronds === 0, r);
    await L.fin(c);
  }
  }
  if (veut(2)) {
  // 2. Le menu : « Fournisseurs, matériel & produits » tient sur DEUX lignes, choisie ou non, sur chaque ordinateur et la tablette
  for (const profil of ['mac', 'mac720', 'windows', 'ipad']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await aller(c, 'produits');
    const r = await c.p.evaluate(() => { const a = [...document.querySelectorAll('.menu a')].find(x => /Fournisseurs, mat/.test(x.textContent)); if (!a) return null; const t = a.querySelector('.m-n > span'), lh = parseFloat(getComputedStyle(t).lineHeight) || 18;
      return { choisie: a.classList.contains('on'), lignes: Math.round(t.getBoundingClientRect().height / lh), haut: Math.round(a.getBoundingClientRect().height) }; });
    v(`menu (${profil}) : population — l'entrée est trouvée`, !!r, r);
    v(`menu (${profil}) : l'entrée choisie tient sur deux lignes au plus`, r && r.choisie && r.lignes <= 2, r);
    await c.p.evaluate(() => { aller('stock'); }); await L.calme(c.p, 500);
    const r2 = await c.p.evaluate(() => { const a = [...document.querySelectorAll('.menu a')].find(x => /Fournisseurs, mat/.test(x.textContent)), t = a.querySelector('.m-n > span'), lh = parseFloat(getComputedStyle(t).lineHeight) || 18; return { choisie: a.classList.contains('on'), lignes: Math.round(t.getBoundingClientRect().height / lh), haut: Math.round(a.getBoundingClientRect().height) }; });
    v(`menu (${profil}) : choisie ou non, la ligne garde la même hauteur`, r && !r2.choisie && r2.haut === r.haut, { choisie: r, non: r2 });
    await L.fin(c);
  }
  }
  if (veut(3)) {
  // 3. Stock › Articles au téléphone : l'état de l'article est SOUS le nom, le nom tient sur deux lignes au plus
  for (const profil of ['iphone', 'android', 'petit']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await aller(c, 'stock');
    const r = await c.p.evaluate(() => [...document.querySelectorAll('.ms-liste .ms-l.sk-l')].filter(l => l.querySelector('.st')).map(l => { const n = l.querySelector('.fo-n > b'), s = l.querySelector('.st'), nb = n.getBoundingClientRect(), sb = s.getBoundingClientRect(), lh = parseFloat(getComputedStyle(n).lineHeight) || 20;
      return { nom: n.textContent.slice(0, 22), lignesNom: Math.round(nb.height / lh), dessous: sb.top >= nb.bottom - 1, une: sb.height <= 2 * 18, dedans: sb.right <= l.getBoundingClientRect().right + 0.5 }; }));
    v(`articles (${profil}) : population — au moins 4 articles à état`, r.length >= 4, r.length);
    v(`articles (${profil}) : l'état est sous le nom`, r.every(x => x.dessous), r.filter(x => !x.dessous).map(x => x.nom));
    v(`articles (${profil}) : le nom ne passe pas sur plus de deux lignes`, r.every(x => x.lignesNom <= 2), r.map(x => x.nom + ':' + x.lignesNom));
    v(`articles (${profil}) : l'état tient sur une ligne, dans la rangée`, r.every(x => x.une && x.dedans), r.filter(x => !x.une || !x.dedans).map(x => x.nom));
    await L.fin(c);
  }
  }
  if (veut(4)) {
  // 4. Les invites des champs de recherche tiennent dans leur champ (téléphones, tablette)
  for (const profil of ['iphone', 'android', 'petit', 'ipad', 'mac']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await aller(c, 'stock');
    let i = await invite(c.p, '#ms-q'); v(`invite d'Articles (${profil}) : tient dans le champ`, !!i && i.large <= i.util, i);
    await c.p.evaluate(() => { stkOnglet = 'mvts'; }); await aller(c, 'stock');
    i = await invite(c.p, '#ms-mq'); v(`invite de « Ce qui a bougé » (${profil}) : tient dans le champ`, !!i && i.large <= i.util, i);
    await c.p.evaluate(() => { stkOnglet = 'ensemble'; prVue = 'articles'; }); await aller(c, 'produits');
    i = await invite(c.p, '#fx-q'); v(`invite des articles du fournisseur (${profil}) : tient dans le champ`, !!i && i.large <= i.util, i);
    await L.fin(c);
  }
  }
  if (veut(5)) {
  // 5. « À commander · N » et « Tout préparer » ne se touchent pas à 360 et 320 px
  for (const profil of ['android', 'petit', 'iphone']) {
    const c = await L.ouvrir({ profil, qui: 'marc' }); await c.p.evaluate(() => { prVue = 'commandes'; }); await aller(c, 'produits');
    const r = await c.p.evaluate(() => { const h = document.querySelector('.fx-ch h3'), b = document.querySelector('.fx-ch .btn'); if (!h || !b) return null; const a = h.getBoundingClientRect(), z = b.getBoundingClientRect();
      return { sepV: z.top >= a.bottom - 1, sepH: z.left >= a.right + 6 }; });
    v(`À commander (${profil}) : population — titre et bouton trouvés`, !!r, r);
    v(`À commander (${profil}) : le titre et le bouton ne se touchent pas`, r && (r.sepV || r.sepH), r);
    await L.fin(c);
  }
  }
  if (veut(6)) {
  // 6. Stock vide : « Choisir parmi les articles habituels de mon métier » reste dans sa carte (360 et 320 px)
  for (const profil of ['android', 'petit', 'iphone']) {
    const c = await L.ouvrir({ profil, qui: 'marc' });
    await c.p.evaluate(() => { PRODUITS.length = 0; }); await aller(c, 'stock');
    const r = await c.p.evaluate(() => { const k = document.querySelector('.ms-vide'), bs = [...document.querySelectorAll('.ms-vide .ms-vb .btn')]; if (!k) return null; const kr = k.getBoundingClientRect(); return { n: bs.length, dehors: bs.filter(b => b.getBoundingClientRect().right > kr.right + 0.5).length }; });
    v(`stock vide (${profil}) : population — deux boutons`, r && r.n === 2, r);
    v(`stock vide (${profil}) : aucun bouton ne sort de la carte`, r && r.dehors === 0, r);
    await L.fin(c);
  }
  }
  if (veut(7)) {
  // 7. La fiche d'un fournisseur montre l'adresse e-mail en entier (ordinateur, tablette, téléphone)
  for (const profil of ['mac', 'windows', 'ipad', 'iphone']) {   // 320 px : « commandes@climpieces-atlantique.fr » (287 px) dans un champ de 256 px, il défile — un champ de saisie
    const c = await L.ouvrir({ profil, qui: 'marc' }); await c.p.evaluate(() => { prVue = 'fournisseurs'; }); await aller(c, 'produits');
    await c.p.evaluate(() => fournFiche('cpa')); await L.calme(c.p, 600);
    const r = await c.p.evaluate(() => { const i = document.querySelector('input[data-fochamp="cpa|mail"]'); if (!i) return null; return { valeur: i.value, coupe: i.scrollWidth > i.clientWidth + 1 }; });
    v(`fiche fournisseur (${profil}) : population — le champ e-mail`, !!r && r.valeur.length > 20, r);
    v(`fiche fournisseur (${profil}) : l'adresse e-mail se lit en entier`, r && !r.coupe, r);
    await L.fin(c);
  }
  }
  if (veut(8)) {
  // 8. Numéros et chiffres qui ne se coupent pas : « En retard sur la commande 2026-039 » (320 px) et « Tout mettre dans les camions · 6 »
  { const c = await L.ouvrir({ profil: 'petit', qui: 'marc' }); await c.p.evaluate(() => { prVue = 'fournisseurs'; }); await aller(c, 'produits');
    const r = await c.p.evaluate(() => { const p = document.querySelector('.fx-c .st-r'); if (!p) return null; const lh = parseFloat(getComputedStyle(p).lineHeight) || 16, n = p.firstChild; const rg = document.createRange(); rg.selectNodeContents(n);
      const num = n.textContent.match(/\d{4}\W\d{3}/); const i = num ? num.index : -1, haut = k => { rg.setStart(n, k); rg.setEnd(n, k + 1); return Math.round(rg.getBoundingClientRect().top); };
      return { texte: n.textContent, enfants: p.childNodes.length, annee: i >= 0 ? haut(i) : null, fin: i >= 0 ? haut(i + 7) : null }; });
    v('carte fournisseur en retard (petit) : population — la pastille est un seul texte', !!r && r.enfants === 1 && r.annee !== null, r);
    v('carte fournisseur en retard (petit) : le numéro de commande ne se coupe pas au tiret', r && r.annee === r.fin, r);
    await c.p.evaluate(() => { aller('boxes'); }); await L.calme(c.p, 500);
    await c.p.evaluate(() => document.querySelector('[data-md=remplir]').click()); await L.calme(c.p, 600);
    const r2 = await c.p.evaluate(() => { const b = document.getElementById('md-rok'); if (!b) return null; const t = b.firstChild, rg = document.createRange(), haut = i => { rg.setStart(t, i); rg.setEnd(t, i + 1); return Math.round(rg.getBoundingClientRect().top); };
      const pt = t.textContent.lastIndexOf('·'), fin = t.textContent.length - 1; return { point: haut(pt), chiffre: haut(fin), texte: t.textContent }; });
    v('feuille « Remplir les camions » (petit) : population — le bouton du pied', !!r2, r2);
    v('feuille « Remplir les camions » (petit) : le « 6 » reste avec son point médian, pas seul sur sa ligne', r2 && r2.point === r2.chiffre, r2);
    await L.fin(c); }
  }
  // 9. Fiche d'un camion avec un MONTANT LONG : les trois tuiles ne se chevauchent pas et chaque chiffre reste dans la sienne
  if (veut(9)) {
    for (const profil of ['iphone', 'android', 'petit', 'ipad', 'mac']) {
      const c = await L.ouvrir({ profil, qui: 'marc' }); await c.p.evaluate(() => { PRODUITS.forEach(x => { x.pa = 12345.67; }); }); await aller(c, 'boxes');
      await c.p.evaluate(() => bxFiche('v1')); await L.calme(c.p, 700);
      const r = await c.p.evaluate(() => { const K = [...document.querySelectorAll('.md-kpis .kpi')]; return { n: K.length, montant: (K[1] || {}).textContent, dehors: K.filter(k => { const b = k.querySelector('b'), kr = k.getBoundingClientRect(), br = b.getBoundingClientRect(); return br.right > kr.right - 1 || br.left < kr.left + 1 || b.scrollWidth > b.clientWidth + 1; }).length,
        chevauche: K.some((k, i) => i && K[i - 1].getBoundingClientRect().right > k.getBoundingClientRect().left + 0.5) }; });
      v(`fiche camion, montant long (${profil}) : population — trois tuiles, un montant à cinq chiffres`, r.n === 3 && /\d{2}\s\d{3},\d{2}/.test(r.montant || ''), r);
      v(`fiche camion, montant long (${profil}) : aucun chiffre ne sort de sa tuile`, r.dehors === 0, r);
      v(`fiche camion, montant long (${profil}) : les tuiles ne se chevauchent pas`, !r.chevauche, r);
      await L.fin(c); }
  }
  // 10. Cartes de Dépôts et camions avec un MONTANT TRÈS LONG : le montant tient sur UNE ligne et reste dans sa carte (il se coupait avant la virgule)
  if (veut(10)) {
    for (const profil of ['iphone', 'android', 'petit', 'mac']) {
      const c = await L.ouvrir({ profil, qui: 'marc' }); await c.p.evaluate(() => { PRODUITS.forEach(x => { x.pa = 12345.67; x.q = 1523.5; }); }); await aller(c, 'boxes');
      const r = await c.p.evaluate(() => { const B = [...document.querySelectorAll('.md-c .client-chiffres b')].filter(b => /€/.test(b.textContent)); const lh = b => parseFloat(getComputedStyle(b).lineHeight) || 18;
        return { n: B.length, coupes: B.filter(b => b.getBoundingClientRect().height > lh(b) * 1.5).length, dehors: B.filter(b => b.getBoundingClientRect().right > b.closest('.md-c').getBoundingClientRect().right + 0.5).length }; });
      v(`cartes de dépôts, montants longs (${profil}) : population — au moins 3 montants`, r.n >= 3, r);
      v(`cartes de dépôts, montants longs (${profil}) : aucun montant ne passe sur deux lignes`, r.coupes === 0, r);
      v(`cartes de dépôts, montants longs (${profil}) : aucun montant ne sort de sa carte`, r.dehors === 0, r);
      const q = await c.p.evaluate(() => { const T = [...document.querySelectorAll('.md-c .client-chiffres')].filter(e => e.offsetWidth > 0); let chev = 0, n = 0; T.forEach(t => { const S = [...t.children]; S.forEach((e, i) => { if (!i) return; n++; if (S[i - 1].querySelector('b').getBoundingClientRect().right > e.getBoundingClientRect().left + 0.5 || S[i - 1].getBoundingClientRect().right > e.getBoundingClientRect().left + 0.5) chev++; }); }); return { rangees: T.length, jonctions: n, chev }; });
      v(`cartes de dépôts, montants longs (${profil}) : population — au moins 3 rangées de chiffres`, q.rangees >= 3, q);
      v(`cartes de dépôts, montants longs (${profil}) : un montant ne passe jamais sur la colonne voisine`, q.chev === 0, q);
      await L.fin(c); }
  }
  // 11. (320 px) Le segmenté Commandes / Articles / Fournisseurs ne touche pas les bords de sa pilule : au moins 4 px de chaque côté du contenu de chaque bouton
  if (veut(11)) {
    for (const profil of ['petit', 'android', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'marc' }); await c.p.evaluate(() => { prVue = 'articles'; }); await aller(c, 'produits');
      const r = await c.p.evaluate(() => [...document.querySelectorAll('.fx-seg button')].map(b => { const rb = b.getBoundingClientRect(), g = document.createRange(); g.selectNodeContents(b); const t = g.getBoundingClientRect(); return { mot: b.getAttribute('aria-label'), gauche: Math.round(t.left - rb.left), droite: Math.round(rb.right - t.right) }; }));
      v(`segmenté Matériel (${profil}) : population — trois onglets`, r.length === 3, r);
      v(`segmenté Matériel (${profil}) : au moins 4 px entre le contenu et le bord de chaque bouton`, r.every(x => x.gauche >= 4 && x.droite >= 4), r);
      await L.fin(c);
    }
  }
  // 12. Le bouton noir de l'en-tête tient sur UNE ligne, sur les trois onglets où il est court (« Nouvelle commande », « Ajouter un article »)
  if (veut(12)) {
    for (const profil of ['petit', 'android', 'iphone']) {
      const c = await L.ouvrir({ profil, qui: 'marc' });
      for (const vue of ['commandes', 'articles']) {
        await c.p.evaluate(x => { prVue = x; }, vue); await aller(c, 'produits');
        const r = await c.p.evaluate(() => { const b = document.querySelector('.fx-tete .actions>.btn:not(.fx-photo):not(.fx-plusb)'); if (!b) return null; const g = document.createRange(); g.selectNodeContents(b); const lh = parseFloat(getComputedStyle(b).lineHeight) || 18; return { texte: b.textContent.trim(), lignes: Math.round(g.getBoundingClientRect().height / lh) }; });
        v(`bouton noir de l'en-tête, ${vue} (${profil}) : population — le bouton existe`, !!r, r);
        v(`bouton noir de l'en-tête, ${vue} (${profil}) : une seule ligne`, r && r.lignes === 1, r);
      }
      await L.fin(c);
    }
  }
  // l'état d'une liste « A · B · C » à points médians (.pts) : un point n'est visible QUE s'il suit un élément de la même ligne
  // racine : la zone jugée (une fenêtre ouverte recouvre la liste derrière elle, dont les points ne sont alors pas « peints »)
  const orphelins = (p, racine) => p.evaluate(r => { const C = [...document.querySelectorAll((r || 'body') + ' .pts')].filter(e => e.offsetWidth > 0); let n = 0, mal = [];
    C.forEach(c => { const cr = c.getBoundingClientRect(), E = [...c.querySelectorAll('.pts-e')]; E.forEach((e, i) => { if (!i) return; const d = e.querySelector('.pts-d').getBoundingClientRect(), er = e.getBoundingClientRect(), pr = E[i - 1].getBoundingClientRect(), neuf = er.top > pr.top + 2; n++;
      e.querySelector('.pts-d').scrollIntoView({ block: 'center' }); const d2 = e.querySelector('.pts-d').getBoundingClientRect(), el = document.elementFromPoint(d2.left + d2.width / 2, d2.top + d2.height / 2), visible = !!el && !!el.closest('.pts-d');   // le point est-il PEINT ? (la coupe du conteneur le retire du test de survol)
      if (neuf && visible) mal.push(e.textContent.trim().slice(0, 30) + ' : point visible en tête de ligne'); if (!neuf && !visible) mal.push(e.textContent.trim().slice(0, 30) + ' : point caché au milieu d’une ligne'); }); });
    return { conteneurs: C.length, points: n, mal }; }, racine);
  // 13. Titres de groupe des Articles : le « · N » reste avec le mot qui le précède ; aucun point seul en tête ou en bout de ligne
  if (veut(13)) {
    for (const profil of ['petit', 'android', 'iphone', 'ipad']) {
      const c = await L.ouvrir({ profil, qui: 'marc' }); await c.p.evaluate(() => { prVue = 'articles'; }); await aller(c, 'produits');
      const r = await c.p.evaluate(() => [...document.querySelectorAll('.fx-arts summary.groupe')].map(sm => { const t = sm.querySelector('.pts-e:last-child'); if (!t) return null; const n = t.firstChild.nextSibling || t.lastChild, g = document.createRange(), tx = t.textContent, i = tx.lastIndexOf('·'); const w = [...t.childNodes].filter(x => x.nodeType === 3).pop(); g.setStart(w, w.textContent.lastIndexOf('·') + 1); g.setEnd(w, w.textContent.length); const a = g.getBoundingClientRect();
        const h = document.createRange(); h.setStart(w, 0); h.setEnd(w, 1); return { titre: sm.textContent.trim().slice(0, 40), memeLigne: Math.abs(a.top - h.getBoundingClientRect().top) < 3 }; }).filter(Boolean));
      v(`titres de groupe (${profil}) : population — au moins 10 titres`, r.length >= 10, r.length);
      v(`titres de groupe (${profil}) : le « · N » reste sur la ligne de son dernier mot`, r.every(x => x.memeLigne), r.filter(x => !x.memeLigne).map(x => x.titre));
      const o = await orphelins(c.p, '.fx-arts'); v(`titres de groupe (${profil}) : population — des séparateurs jugés`, o.points >= 10, o);
      v(`titres de groupe (${profil}) : aucun point médian seul en tête ou en bout de ligne`, o.mal.length === 0, o.mal);
      await L.fin(c);
    }
  }
  // 14. Fiche article : la ligne bleue des lieux ne finit jamais sur un point médian ; un article posé dans 3 lieux au nom long
  if (veut(14)) {
    for (const profil of ['petit', 'android', 'iphone', 'ipad', 'mac', 'windows']) {
      const c = await L.ouvrir({ profil, qui: 'marc' });
      await c.p.evaluate(() => { const x = PRODUITS.find(o => !o.retire); x.q = 20; x.loc = {}; LIEUX.filter(l => l.type !== 'atelier').slice(0, 3).forEach(l => { x.loc[l.id] = 3; }); window._xa = x.id; }); await aller(c, 'stock');
      await c.p.evaluate(() => prFiche(window._xa)); await L.calme(c.p, 700);
      const r = await c.p.evaluate(() => ({ n: document.querySelectorAll('#calque .ms-rep .ms-lien').length }));
      v(`fiche article, lieux (${profil}) : population — au moins 3 lieux`, r.n >= 3, r);
      const o = await orphelins(c.p, '#calque'); v(`fiche article, lieux (${profil}) : population — au moins 2 séparateurs jugés`, o.points >= 2, o);
      v(`fiche article, lieux (${profil}) : aucun point médian seul en tête ou en bout de ligne`, o.mal.length === 0, o.mal);
      await L.fin(c);
    }
  }
  // 15. Sur un appareil tactile le clavier ne monte pas tout seul dans la recherche du Stock (iPad compris) ; sur ordinateur le curseur y est déjà
  if (veut(15)) {
    for (const [profil, attendu] of [['ipad', false], ['iphone', false], ['android', false], ['mac', true], ['windows', true]]) {
      const c = await L.ouvrir({ profil, qui: 'marc' }); await aller(c, 'stock'); await c.p.waitForTimeout(300);
      const r = await c.p.evaluate(() => ({ actif: document.activeElement && document.activeElement.id, tactile: matchMedia('(pointer:coarse)').matches, champ: !!document.getElementById('ms-q') }));
      v(`recherche du Stock (${profil}) : population — le champ existe`, r.champ, r);
      v(`recherche du Stock (${profil}) : ${attendu ? 'le curseur y est déjà (ordinateur)' : 'le clavier ne monte pas tout seul (tactile)'}`, (r.actif === 'ms-q') === attendu, r);
      await L.fin(c);
    }
  }
  // 16. Stock vide : « Ajouter un article » et « Choisir parmi… » ont la même largeur
  if (veut(16)) {
    for (const profil of ['iphone', 'android', 'petit', 'ipad', 'mac']) {
      const c = await L.ouvrir({ profil, qui: 'marc' }); await c.p.evaluate(() => { PRODUITS.length = 0; }); await aller(c, 'stock');
      const r = await c.p.evaluate(() => [...document.querySelectorAll('.ms-vide .ms-vb .btn')].map(b => Math.round(b.getBoundingClientRect().width)));
      v(`stock vide (${profil}) : population — deux boutons`, r.length === 2, r);
      v(`stock vide (${profil}) : les deux boutons ont la même largeur`, r.length === 2 && Math.abs(r[0] - r[1]) <= 1, r);
      await L.fin(c);
    }
  }
  // 17. Stock › Articles : la ligne de lieux d'un article (« Atelier 5 · Sophie 2 · +2 lieux ») ne laisse jamais un point médian seul, avec des noms et des quantités longs
  if (veut(17)) {
    for (const profil of ['petit', 'android', 'iphone', 'ipad']) {
      const c = await L.ouvrir({ profil, qui: 'marc' });
      await c.p.evaluate(() => { PRODUITS.forEach((x, n) => { if (n % 2 === 0) { x.q = 1523.5; x.loc = {}; LIEUX.filter(l => l.type !== 'atelier').slice(0, 4).forEach(l => { x.loc[l.id] = 2.5; }); } }); }); await aller(c, 'stock');
      const o = await orphelins(c.p, '#contenu');
      v(`lignes de lieux du Stock (${profil}) : population — au moins 20 séparateurs jugés`, o.points >= 20, o);
      v(`lignes de lieux du Stock (${profil}) : aucun point médian seul en tête ou en bout de ligne`, o.mal.length === 0, o.mal.slice(0, 5));
      await L.fin(c);
    }
  }
  // 18. Fiche d'un camion : « 2 sur 3 · il manque 1 · à l'atelier : 5 » et « titre · quand » (Pour les prochaines visites) sans point médian seul, noms longs
  if (veut(18)) {
    for (const profil of ['petit', 'android', 'iphone', 'ipad']) {
      const c = await L.ouvrir({ profil, qui: 'marc' }); await c.p.evaluate(() => { PRODUITS.forEach((x, n) => { x.nom = 'Raccord à compression en laiton chromé pour tube multicouche 20 ' + n; }); }); await aller(c, 'boxes');
      await c.p.evaluate(() => bxFiche('v1')); await L.calme(c.p, 700);
      const o = await orphelins(c.p, '#calque');
      v(`fiche camion, lignes à points médians (${profil}) : population — au moins 4 séparateurs jugés`, o.points >= 4, o);
      v(`fiche camion, lignes à points médians (${profil}) : aucun point médian seul en tête ou en bout de ligne`, o.mal.length === 0, o.mal.slice(0, 5));
      await L.fin(c);
    }
  }
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
