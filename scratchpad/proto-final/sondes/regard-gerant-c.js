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
      await L.fin(c); }
  }
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
