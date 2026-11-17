// Restes du technicien, tour 2 (17 novembre 2026) : ce que le recontrôle du tour 1 a laissé ouvert, et ce que la relecture « Matériel » avait nommé.
//  A · la pastille « autres dates » est ronde (26 × 26) comme les deux autres, et le titre commence au même x (aussi sur la tâche confiée) ;
//  B · un message du bureau qui porte une adresse sans espace ne fait pas glisser la page de côté ;
//  C · « 12 € », « 12, » et « 12 euros » sont lus dans Mes frais ET dans l'achat en magasin (jamais « Indique le montant payé. » devant un champ rempli) ;
//  D · technicien-05 : UN mot, « manque(nt) à bord », sur Ma journée et dans Véhicules ;
//  E · technicien-11 : sans réseau, « Je l'ai pris » et « J'ai tout pris » attendent le réseau (file) au lieu de dire « Envoyé au bureau » ;
//  F · technicien-12 : « (0,5 L) » ne se coupe pas entre le nombre et l'unité dans la liste de Mon camion ;
//  G · technicien-13 : à 320 × 568, la première pièce de « Il manque à bord » est au-dessus de la barre du bas ;
//  H · technicien-14 : l'invite du champ de recherche d'Articles est lue en entier (Stock à 320 px aussi).
// Usage : node restes-technicien-3.js [profil=iphone] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-technicien-2/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'moncamion' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  await L.calme(p, 600);
  const barre = () => R(() => { const b = document.querySelector('.barre-bas'); return b && getComputedStyle(b).display !== 'none' ? b.getBoundingClientRect().top : innerHeight; });
  // ── D · un seul mot : « manquent à bord » sur Ma journée ──
  await L.aller(p, 'majournee');
  const mj = await R(() => (document.querySelector('.vh-ligne-cam') || {}).textContent || '');
  v(`[${J}] D · population : la ligne « Mon camion » de Ma journée existe`, /Mon camion/.test(mj), mj);
  v(`[${J}] D · Ma journée dit « manquent à bord », jamais « à remettre à bord »`, /manquent? à bord/.test(mj.replace(/[  ]/g, ' ')) && !/remettre/.test(mj), mj);
  // ── F · le nombre et son unité restent ensemble ──
  await L.aller(p, 'moncamion');
  const F = await R(() => { const noms = [...document.querySelectorAll('.mc-l .fo-n > b')], hit = noms.filter(b => /0,5.L\)/.test(b.textContent));
    return { n: noms.length, hit: hit.length, nbsp: hit.map(b => /0,5 L\)/.test(b.textContent)), lignes: hit.map(b => { const r = document.createRange(); r.selectNodeContents(b); return new Set([...r.getClientRects()].map(q => Math.round(q.top))).size; }) }; });
  v(`[${J}] F · population : les listes de Mon camion montrent des noms (dont celui du nettoyant)`, F.n > 0, F);
  if (F.hit) v(`[${J}] F · « (0,5 L) » : espace insécable entre 0,5 et L`, F.nbsp.every(Boolean), F);
  // ── G · la 1re pièce de « Il manque à bord » est visible au-dessus de la barre ──
  const G = await R(() => { const l = document.querySelector('.mc-liste .mc-l'); return l ? Math.round(l.getBoundingClientRect().bottom + scrollY) : -1; });
  const B = await barre();
  v(`[${J}] G · la 1re pièce qui manque est entière au-dessus de la barre du bas (bas de la ligne ${G}, barre ${Math.round(B)})`, G > 0 && G <= B, { G, B });
  await L.capture(c, CAP + `camion-${J}.png`, false);
  // ── E · sans réseau ──
  await c.ctx.setOffline(true); await p.waitForTimeout(200);
  const hors = await R(() => navigator.onLine === false);
  const att0 = await R(() => MVTS_ATT.length), f0 = await R(() => MAT.file.length);
  const bt = await R(() => !!document.querySelector('[data-mat^="pris|"]'));
  v(`[${J}] E · population : le réseau est coupé et un bouton « Je l'ai pris » existe`, hors && bt, { hors, bt });
  if (hors && bt) {
    await L.toucher(c, '[data-mat^="pris|"]'); await L.calme(p, 300);
    const t = await R(() => (document.getElementById('toast') || {}).textContent || ''), att1 = await R(() => MVTS_ATT.length), f1 = await R(() => MAT.file.length);
    v(`[${J}] E · « Je l'ai pris » sans réseau : le toast dit « Pas de réseau », jamais « Envoyé au bureau »`, /Pas de réseau/.test(t) && !/Envoyé au bureau/.test(t), t);
    v(`[${J}] E · …la prise attend dans la file (+1), rien n'entre chez le bureau`, f1 === f0 + 1 && att1 === att0, { f0, f1, att0, att1 });
    await c.ctx.setOffline(false); await p.waitForTimeout(600); await L.calme(p, 300);
    const att2 = await R(() => MVTS_ATT.length), f2 = await R(() => MAT.file.length);
    v(`[${J}] E · le réseau revient : la prise PART (file vide, un envoi de plus à accepter)`, f2 === 0 && att2 === att0 + 1, { f2, att2, att0 });
  }
  // « J'ai tout pris » sans réseau : une file par pièce qu'on peut prendre, jamais deux fois la même
  await L.aller(p, 'moncamion'); await c.ctx.setOffline(true); await p.waitForTimeout(200);
  const tp = await R(() => !!document.querySelector('[data-mat="toutpris"]'));
  if (tp) { const n0 = await R(() => MAT.file.length); await L.toucher(c, '[data-mat="toutpris"]'); await L.calme(p, 300);
    const n1 = await R(() => MAT.file.length), t = await R(() => (document.getElementById('toast') || {}).textContent || '');
    v(`[${J}] E · « J'ai tout pris » sans réseau : file +${n1 - n0}, toast « Pas de réseau »`, n1 > n0 && /Pas de réseau/.test(t), { n0, n1, t });
    const nid = await R(() => new Set(MAT.file.map(o => o.m.pid)).size === MAT.file.length); v(`[${J}] E · aucune pièce en double dans la file`, nid);
    if (n1 > n0) { const n2 = await R(() => { const b = document.querySelector('[data-mat="toutpris"]'); if (b) b.click(); return MAT.file.length; }); v(`[${J}] E · un second « J'ai tout pris » n'ajoute rien`, n2 === n1, { n1, n2 }); } }
  await c.ctx.setOffline(false); await p.waitForTimeout(600);
  // ── H · l'invite de recherche d'Articles et de Stock se lit en entier ──
  for (const [hash, qui] of [['fournisseurs', 'marc'], ['stock', 'marc']]) {
    const c2 = await L.ouvrir({ profil, qui, nuit, hash: hash === 'fournisseurs' ? 'produits' : hash }), p2 = c2.p; await L.calme(p2, 600);
    if (hash === 'fournisseurs') { await p2.evaluate(() => { prVue = 'articles'; rendre(); scrollTo(0, 0); }); await L.calme(p2, 500); }
    const H = await p2.evaluate(() => { const i = [...document.querySelectorAll('input[placeholder]')].find(e => e.offsetParent && /Cherch|Rechercher|^Article/i.test(e.placeholder)); if (!i) return null;
      const cs = getComputedStyle(i), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      return { ph: i.placeholder, texte: Math.round(cv.measureText(i.placeholder).width), place: Math.round(i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) }; });
    v(`[${J}] H · population : un champ de recherche est visible sur ${hash}`, !!H, H);
    if (H) v(`[${J}] H · l'invite « ${H.ph} » tient en entier (${H.texte} px pour ${H.place})`, H.texte <= H.place, H);
    await L.fin(c2);
  }
  const err = c.err.filter(x => !/ERR_/.test(x)); v(`[${J}] aucune erreur JavaScript`, err.length === 0, err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
