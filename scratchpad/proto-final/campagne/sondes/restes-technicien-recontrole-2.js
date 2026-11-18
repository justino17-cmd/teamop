// Recontrôle adverse des restes du technicien, tour 2 (18 novembre 2026) : ce que les corrections (983d82e0, c6250a3a, c021eb16) ont pu casser À CÔTÉ.
//  M · montants de « Mes frais » : « 12 € », « 12€ », « 12,50 € », « 1 234,50 € », espace insécable avant « € » (iOS), « 12 €. », et les refus ;
//  E · « (0,5 L) » insécable à l'écran : la recherche tapée avec une espace ordinaire trouve toujours l'article (Stock et Articles) ;
//  C · Mon camion à 320 × 568 SANS pièce qui manque : la page se rend sans erreur et sans glissement ;
//  F · hors réseau, la ligne de Mon camion dit à l'écran que la prise attend (pas seulement un toast) ;
//  A · deux absences d'UN jour côte à côte (doigt) : chacune garde une zone qui répond ;
//  R · iPad : l'invite de recherche d'Articles suit la rotation (elle est choisie au rendu d'après innerWidth).
// Usage : node restes-technicien-recontrole-2.js [profil=iphone] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-technicien-recontrole-2/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'techfrais' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  await L.calme(p, 600);
  // ── M · les montants ──
  const cas = [['12 €', 12], ['12€', 12], ['12,50 €', 12.5], ['12,50€', 12.5], ['1 234,50 €', 1234.5], ['12 €', 12], ['12 €', 12], ['12.50 €', 12.5], ['12 euros', 12], ['12 euro', 12], ['12 €.', null], ['12 € TTC', null], ['€12', null], ['12 e', null], ['0 €', null], ['-5 €', null], ['5.000 €', null], ['1.500', null], ['1,500', null]];
  await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 300);
  const ouvert = await R(() => !!document.getElementById('rn-m'));
  v(`[${J}] M · population : le formulaire de Mes frais est ouvert`, ouvert);
  if (ouvert) {
    for (const [saisie, attendu] of cas) {
      if (!(await R(() => !!document.getElementById('rn-m')))) { await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 300); }
      const ids0 = await R(() => NDF.map(n => n.id));
      await R(() => { const o = document.getElementById('rn-o'); const k = [...o.options].findIndex(x => x.value && !/km|kilom/i.test(x.value + x.textContent)); o.selectedIndex = k; o.dispatchEvent(new Event('change', { bubbles: true })); }); await p.fill('#rn-m', saisie); await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 300);
      const t = await R(() => (document.getElementById('toast') || {}).textContent || ''), nouv = await R(i0 => NDF.filter(n => !i0.includes(n.id)).map(n => ({ id: n.id, ttc: n.ttc })), ids0), cree = nouv.length > 0;
      v(`[${J}] M · « ${saisie.replace(/[\u00a0\u202f]/g, '␣')} » ${attendu === null ? 'ne crée rien et dit une phrase' : 'est lu ' + attendu}`, attendu === null ? (!cree && /\S/.test(t)) : (cree && Math.abs(nouv[0].ttc - attendu) < 0.011), { t: t.slice(0, 120), nouv });
      if (saisie === '5.000 €') { v(`[${J}] M · « 5.000 € » dit la phrase de la Comptabilité (pas clair : 5000 ou 5,00)`, /pas clair/.test(t) && /5000/.test(t), t.slice(0, 160)); await L.capture(c, CAP + `frais-5000-${J}.png`); }
      if (cree) await R(i0 => { for (let i = NDF.length - 1; i >= 0; i--) if (!i0.includes(NDF[i].id)) NDF.splice(i, 1); rendre(); }, ids0);
      else await R(() => { const d = document.getElementById('rn-dbl'); if (d && !d.hidden) { const b = d.querySelector('[data-axa="grosnon"]'); if (b) b.click(); } });
    }
    await L.ranger(p);
  }
  // ── M2 · l'achat en magasin lit le même chiffre que Mes frais : « 5.000 » (cinq mille) ne devient pas 5 € ──
  await L.aller(p, 'techfrais');
  await R(() => { const d = DEM_ACHAT.find(o => o.id === 'da3'); Object.assign(d, { etat: 'aacheter', accord: AUJ, par: 'marc', le: AUJ }); rendre(); }); await L.calme(p, 300);
  if (await R(() => !!document.querySelector('[data-axa="tick|da3"]'))) for (const saisie of ['5.000', '1.500 €']) {
    await L.toucher(c, '[data-axa="tick|da3"]'); await L.calme(p, 300); await p.fill('#ax-m', saisie); await L.toucher(c, '[data-axa^="tickok"]'); await L.calme(p, 400);
    const A = await R(() => { const a = ACHATS.find(o => o.id === 'ada3'); return a ? a.ht * (1 + a.tva / 100) : null; }), t = await R(() => (document.getElementById('toast') || {}).textContent || '');
    v(`[${J}] M2 · achat en magasin : « ${saisie} » (milliers à la française) n'est pas lu comme 5 ou 1,5 €`, A === null || A > 100, { A, t: t.slice(0, 100) });
    if (A !== null) await R(() => { const i = ACHATS.findIndex(o => o.id === 'ada3'); if (i >= 0) ACHATS.splice(i, 1); const d = DEM_ACHAT.find(o => o.id === 'da3'); Object.assign(d, { etat: 'aacheter' }); delete d.reel; rendre(); }); else await L.ranger(p);
  }
  // ── E · la recherche tape l'espace ordinaire, l'affichage porte l'insécable ──
  for (const [hash, vue] of [['stock', null], ['produits', 'articles']]) {
    const c2 = await L.ouvrir({ profil, qui: 'marc', nuit, hash }), p2 = c2.p; await L.calme(p2, 600);
    if (vue) { await p2.evaluate(v2 => { prVue = v2; rendre(); }, vue); await L.calme(p2, 400); }
    const sel = await p2.evaluate(() => { const i = [...document.querySelectorAll('input')].find(e => e.offsetParent && /Cherch|Rechercher|^Article/i.test(e.placeholder || '')); if (!i) return null; i.setAttribute('data-sonde', '1'); return 'input[data-sonde="1"]'; });
    v(`[${J}] E · population : un champ de recherche existe sur ${hash}`, !!sel);
    if (sel) {
      await p2.fill(sel, 'échangeur 0,5 L'); await L.calme(p2, 500);
      const E = await p2.evaluate(() => [...document.querySelectorAll('#contenu .fo-n > b')].map(b => b.textContent.replace(/ /g, ' ')).filter(t => /échangeur/i.test(t)));
      v(`[${J}] E · ${hash} : « échangeur 0,5 L » (espace ordinaire) trouve le nettoyant`, E.some(t => /0,5 L/.test(t)), E);
    }
    await L.fin(c2);
  }
  // ── C · Mon camion à 320 × 568 sans pièce qui manque ──
  if (profil === 'petit' || profil === 'android') {
    await L.aller(p, 'moncamion');
    await R(() => { window.__lm = window.lieuManques; window.lieuManques = () => []; rendre(); scrollTo(0, 0); }); await L.calme(p, 500);
    const C = await R(() => { const pg = document.querySelector('.mc-page'), bb = document.querySelector('.barre-bas'), bar = bb && getComputedStyle(bb).display !== 'none' ? bb.getBoundingClientRect().top : innerHeight;
      return { kids: pg ? [...pg.children].map(e => (e.id || e.className).toString().slice(0, 30) + '@' + Math.round(e.getBoundingClientRect().top) + '/o' + getComputedStyle(e).order) : null, bar: Math.round(bar), sw: document.documentElement.scrollWidth }; });
    console.log('   ', JSON.stringify(C));
    v(`[${J}] C · population : Mon camion est rendu sans pièce qui manque`, !!C.kids && C.kids.length > 1, C);
    v(`[${J}] C · aucun glissement latéral`, C.sw <= c.largeur + 1, C.sw);
    await L.capture(c, CAP + `camion-sans-manque-${J}.png`);
    await R(() => { window.lieuManques = window.__lm; rendre(); });
  }
  // ── F · hors réseau : l'écran dit que la prise attend ──
  await L.aller(p, 'moncamion'); await R(() => scrollTo(0, 0));
  await c.ctx.setOffline(true); await p.waitForTimeout(250);
  const bt = await R(() => !!document.querySelector('[data-mat^="pris|"]'));
  v(`[${J}] F · population : un bouton « Je l'ai pris » existe, réseau coupé`, bt);
  if (bt) {
    const nom0 = await R(() => document.querySelector('[data-mat^="pris|"]').closest('.mc-l').querySelector('b').textContent);
    await L.toucher(c, '[data-mat^="pris|"]'); await L.calme(p, 300);
    const apres = await R(nom => ({ file: MAT.file.length, ligne: ([...document.querySelectorAll('.mc-l')].find(e => e.querySelector('b') && e.querySelector('b').textContent === nom) || {}).textContent, toutpris: (document.querySelector('[data-mat="toutpris"]') || {}).textContent, envois: (document.getElementById('contenu').textContent.match(/Part dès que le réseau revient/g) || []).length }), nom0);
    console.log('   après la prise hors réseau :', JSON.stringify(apres));
    await L.capture(c, CAP + `camion-hors-reseau-${J}.png`);
    v(`[${J}] F · la prise hors réseau se lit à l'écran (ligne « Part dès que le réseau revient » dans Mes envois)`, apres.envois > 0, apres);
    await c.ctx.setOffline(false); await p.waitForTimeout(700); await L.calme(p, 300);
    const retour = await R(() => ({ file: MAT.file.length, att: MVTS_ATT.length }));
    v(`[${J}] F · le réseau revient : la file part`, retour.file === 0, retour);
  } else await c.ctx.setOffline(false);
  // ── A · deux absences d'un jour côte à côte au doigt ──
  if (c.doigt) {
    await R(() => { const base = aLundi(AUJ); ABSENCES.push({ id: 'zz1', tech: 'sm', du: ajoute(base, 1), au: ajoute(base, 1), type: 'RTT' }, { id: 'zz2', tech: 'sm', du: ajoute(base, 2), au: ajoute(base, 2), type: 'Maladie' }); });
    await L.aller(p, 'absences'); await L.calme(p, 600);
    const A = await R(() => { const bs = [...document.querySelectorAll('.acm-x')].filter(b => /zz/.test(b.dataset.abs || '')); bs[0] && bs[0].scrollIntoView({ block: 'center' });
      return bs.map(b => { const r = b.getBoundingClientRect(), y = r.top + r.height / 2; let g = 1e9, d = -1e9; for (let x = r.left - 8; x < r.right + 8; x += .5) { const e = document.elementFromPoint(x, y); if (e && b.contains(e)) { if (x < g) g = x; if (x > d) d = x; } } return { id: b.dataset.abs, w: Math.round(r.width), repond: Math.round(d - g + .5) }; }); });
    v(`[${J}] A · population : deux absences d'un jour voisines sont au calendrier`, A.length === 2, A);
    for (const a of A) v(`[${J}] A · ${a.id} répond sur 38 px au moins (${a.repond} px)`, a.repond >= 36, a);
    await L.capture(c, CAP + `absences-voisines-${J}.png`);
    await R(() => { ABSENCES.splice(ABSENCES.findIndex(a => a.id === 'zz1'), 1); ABSENCES.splice(ABSENCES.findIndex(a => a.id === 'zz2'), 1); });
  }
  // ── R · iPad : rotation ──
  if (profil === 'ipad') {
    const c3 = await L.ouvrir({ profil, qui: 'marc', nuit, hash: 'produits' }), p3 = c3.p; await L.calme(p3, 600);
    await p3.setViewportSize({ width: 1180, height: 820 }); await L.calme(p3, 500);
    await p3.evaluate(() => { prVue = 'articles'; rendre(); }); await L.calme(p3, 500);
    const mesure = () => p3.evaluate(() => { const i = [...document.querySelectorAll('input[placeholder]')].find(e => e.offsetParent && /Cherch|Rechercher|^Article/i.test(e.placeholder)); if (!i) return null; const cs = getComputedStyle(i), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; return { ph: i.placeholder, texte: Math.round(cv.measureText(i.placeholder).width), place: Math.round(i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), w: innerWidth }; });
    const paysage = await mesure(); v(`[${J}] R · paysage : l'invite tient`, !!paysage && paysage.texte <= paysage.place, paysage);
    await p3.setViewportSize({ width: 820, height: 1180 }); await L.calme(p3, 800);
    const portrait = await mesure(); v(`[${J}] R · après rotation vers le portrait SANS rien rouvrir : l'invite tient (${portrait && portrait.texte} px pour ${portrait && portrait.place})`, !!portrait && portrait.texte <= portrait.place, portrait);
    await L.capture(c3, CAP + `articles-rotation-${J}.png`);
    await L.fin(c3);
  }
  const err = c.err.filter(x => !/ERR_/.test(x)); v(`[${J}] aucune erreur JavaScript`, err.length === 0, err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
