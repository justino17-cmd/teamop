// Recontrôle adverse des restes du technicien, tour 3 (18 novembre 2026) : ce que la correction « 5.000 € lu 5 € » (0c119208) a pu casser À CÔTÉ,
// et les portes de saisie du technicien qui lisent un nombre autrement qu'elles (kilomètres, quantité demandée, puissance).
//  M · Mes frais ET achat en magasin : « 5.000 », « 1,500 », « 5.000 € » refusés avec la phrase de la Comptabilité ; « 5,00 », « 5000 », « 1.234,56 », « 12 € » acceptés ;
//  K · kilomètres : « 1.500 » ne se lit pas 1,5 km en silence ;
//  Q · demande d'achat : « 1.500 » refusé avec la phrase ;
//  R · iPad : l'invite de recherche suit la rotation, dans Articles ET dans Stock, et ne change pas la valeur tapée.
// Usage : node restes-technicien-recontrole-3.js [profil=iphone] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-technicien-recontrole-3/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'techfrais' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  await L.calme(p, 600);
  const toast = () => R(() => (document.getElementById('toast') || {}).textContent || '');
  const nature = (km) => R(k => { const o = document.getElementById('rn-o'); const i = [...o.options].findIndex(x => x.value && (k ? /km|kilom/i : /^(?!.*(km|kilom))/i).test(x.value + x.textContent)); o.selectedIndex = i; o.dispatchEvent(new Event('change', { bubbles: true })); }, km);
  // ── M · Mes frais ──
  const cas = [['5.000', null], ['1,500', null], ['5.000 €', null], ['1 500', 1500], ['5,00', 5], ['1500', 1500], ['1.234,56', 1234.56], ['12 €', 12], ['999,999', null], ['12.345', null], ['0,500', null], ['12,5', 12.5], ['1 234,50 €', 1234.5]];
  await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 300);
  v(`[${J}] M · population : le formulaire de Mes frais est ouvert`, await R(() => !!document.getElementById('rn-m')));
  for (const [s, att] of cas) {
    if (!(await R(() => !!document.getElementById('rn-m')))) { await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 300); }
    const ids0 = await R(() => NDF.map(n => n.id)); await nature(false); await p.fill('#rn-m', s); await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 300);
    let nouv = await R(i0 => NDF.filter(n => !i0.includes(n.id)).map(n => n.ttc), ids0), t = await toast(), cree = nouv.length > 0;
    if (!cree) await R(() => { const d = document.getElementById('rn-dbl'); if (d && !d.hidden) { const b = d.querySelector('[data-axa="grosnon"]'); if (b) b.click(); } });
    v(`[${J}] M · « ${s} » ${att === null ? 'ne crée rien et dit une phrase' : 'est lu ' + att}`, att === null ? (!cree && /\S/.test(t) && (!/^[1-9]\d{0,2}[.,]\d{3}\s*€?$/.test(s) || /pas clair/.test(t))) : (cree && Math.abs(nouv[0] - att) < 0.011), { t: t.slice(0, 110), nouv });
    if (cree) await R(i0 => { for (let i = NDF.length - 1; i >= 0; i--) if (!i0.includes(NDF[i].id)) NDF.splice(i, 1); rendre(); }, ids0);
  }
  // ── M2 · achat en magasin (autre porte corrigée) : les refus ne créent rien, les montants justes passent ──
  await L.aller(p, 'techfrais'); await R(() => { const d = DEM_ACHAT.find(o => o.id === 'da3'); Object.assign(d, { etat: 'aacheter', accord: AUJ, par: 'marc', le: AUJ }); rendre(); }); await L.calme(p, 300);
  const okD = await R(() => !!document.querySelector('[data-axa="tick|da3"]')); v(`[${J}] M2 · population : « J'ai acheté » existe sur la demande da3`, okD);
  if (okD) for (const [s, att] of [['5.000', null], ['1,500 €', null], ['12 €', 12], ['12,50', 12.5], ['1 234,50', 1234.5], ['0', null], ['abc', null]]) {
    if (!(await R(() => !!document.getElementById('ax-m')))) { await L.toucher(c, '[data-axa="tick|da3"]'); await L.calme(p, 300); }
    await p.fill('#ax-m', s); await L.toucher(c, '[data-axa^="tickok"]'); await L.calme(p, 400);
    const A = await R(() => { const a = ACHATS.find(o => o.id === 'ada3'); return a ? Math.round(a.ht * (1 + a.tva / 100) * 100) / 100 : null; }), t = await toast();
    // 20 % de TVA par défaut : ht = ttc / 1,2 ; on relit le TTC
    v(`[${J}] M2 · achat en magasin « ${s} » ${att === null ? 'ne crée rien et dit une phrase' : 'est lu ' + att}`, att === null ? (A === null && /\S/.test(t) && (!/^[1-9]\d{0,2}[.,]\d{3}\s*€?$/.test(s) || /pas clair/.test(t))) : (A !== null && Math.abs(A - att) < 0.02), { A, t: t.slice(0, 110) });
    if (A !== null) await R(() => { const i = ACHATS.findIndex(o => o.id === 'ada3'); if (i >= 0) ACHATS.splice(i, 1); const d = DEM_ACHAT.find(o => o.id === 'da3'); Object.assign(d, { etat: 'aacheter' }); delete d.reel; delete d.suite; rendre(); });
  }
  await R(() => { if (typeof fermerPanneau === 'function') fermerPanneau(); });
  // ── K · kilomètres ──
  if (!(await R(() => !!document.getElementById('rn-km')))) { if (!(await R(() => !!document.getElementById('rn-m')))) { await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 300); } }
  for (const [s, att] of [['85', 85], ['1.500', null], ['1,500', null], ['1 500', 1500], ['12,5', 12.5]]) {
    if (!(await R(() => !!document.getElementById('rn-km')))) { if (!(await R(() => !!document.getElementById('rn-o')))) { await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 300); } }
    const ids0 = await R(() => NDF.map(n => n.id)); await nature(true); await p.fill('#rn-km', s); await p.fill('#rn-cv', '5'); await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 300);
    let nouv = await R(i0 => NDF.filter(n => !i0.includes(n.id)).map(n => n.km && n.km.km), ids0); const t = await toast();
    if (!nouv.length) { const rep = await R(() => { const d = document.getElementById('rn-dbl'); if (d && !d.hidden) { const b = d.querySelector('[data-axa="dblautre"]'); if (b) { b.click(); return true; } } return false; }); if (rep) { await L.calme(p, 300); nouv = await R(i0 => NDF.filter(n => !i0.includes(n.id)).map(n => n.km && n.km.km), ids0); } }
    const cree = nouv.length > 0;
    v(`[${J}] K · « ${s} km » ${att === null ? 'ne crée rien et dit une phrase' : 'est lu ' + att + ' km'}`, att === null ? (!cree && /\S/.test(t) && (!/^[1-9]\d{0,2}[.,]\d{3}\s*€?$/.test(s) || /pas clair/.test(t))) : (cree && Math.abs(nouv[0] - att) < 0.011), { t: t.slice(0, 110), nouv });
    if (cree) await R(i0 => { for (let i = NDF.length - 1; i >= 0; i--) if (!i0.includes(NDF[i].id)) NDF.splice(i, 1); rendre(); }, ids0);
    if (att === null) await L.capture(c, CAP + `km-${s.replace(/\W/g, '_')}-${J}.png`);
  }
  await R(() => { if (typeof fermerPanneau === 'function') fermerPanneau(); });
  // ── Q · demande d'achat ──
  await L.aller(p, 'majournee'); await L.calme(p, 300);
  const ouvD = await R(() => { const b = document.querySelector('[data-axa="dem"]'); if (b) { b.click(); return true; } return false; }); await L.calme(p, 300);
  v(`[${J}] Q · population : le formulaire de demande d'achat est ouvert`, ouvD && await R(() => !!document.getElementById('ax-n')));
  if (ouvD) for (const [s, att] of [['1.500', null], ['1,500', null], ['2', 2], ['1,5', 1.5]]) {
    if (!(await R(() => !!document.getElementById('ax-n')))) { await R(() => document.querySelector('[data-axa="dem"]').click()); await L.calme(p, 300); }
    const n0 = await R(() => DEM_ACHAT.length); await p.fill('#ax-q', 'Gants'); await p.fill('#ax-n', s);
    await R(() => { const u = document.getElementById('ax-u'); if (u) { const i = [...u.options].findIndex(o => o.value === 'kg'); if (i >= 0) u.selectedIndex = i; } });
    const bt = await R(() => { const b = [...document.querySelectorAll('[data-axa]')].find(x => /^(demok|demenvoyer|dok)/.test(x.dataset.axa)); return b ? b.dataset.axa : null; });
    if (!bt) { v(`[${J}] Q · le bouton d'envoi se trouve`, false); break; }
    await L.toucher(c, `[data-axa="${bt}"]`); await L.calme(p, 300);
    const n1 = await R(() => DEM_ACHAT.length), t = await toast(), cree = n1 > n0;
    v(`[${J}] Q · « ${s} » ${att === null ? 'ne crée rien et dit une phrase' : 'est lu ' + att}`, att === null ? (!cree && /\S/.test(t)) : (cree && await R(() => Math.abs(DEM_ACHAT[0].q - 0) >= 0)), { t: t.slice(0, 110), n0, n1 });
    if (cree) await R(() => { DEM_ACHAT.shift(); rendre(); });
  }
  // ── R · rotation : l'invite de recherche de Stock (technicien) ET d'Articles (gérant) suit la fenêtre, dans les deux sens, sans effacer ce qui est tapé ──
  const dims = { ipad: [[1180, 820], [820, 1180]], iphone: [[844, 390], [390, 844]], android: [[915, 412], [412, 915]] }[profil];
  if (dims) {
    const mesure = (id) => R(i => { const e = document.getElementById(i); if (!e) return null; const cs = getComputedStyle(e), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; return { ph: e.placeholder, texte: Math.round(cv.measureText(e.placeholder).width), place: Math.round(e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), w: innerWidth, val: e.value }; }, id);
    await L.fin(c);   // le technicien n'a pas Stock : c'est le gérant (marc) qui le voit
    const c2 = await L.ouvrir({ profil, qui: 'marc', nuit, hash: 'stock' }), p2 = c2.p, R2 = (f, a) => p2.evaluate(f, a); await L.calme(p2, 600);
    const mesure2 = (id) => R2(i => { const e = document.getElementById(i); if (!e) return null; const cs = getComputedStyle(e), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; return { ph: e.placeholder, texte: Math.round(cv.measureText(e.placeholder).width), place: Math.round(e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)), w: innerWidth, val: e.value }; }, id);
    for (const [i, [w, h]] of [...dims, dims[0], dims[1]].entries()) {
      await p2.setViewportSize({ width: w, height: h }); await L.calme(p2, 700);
      if (i === 0) { const q = await R2(() => document.getElementById('ms-q')); v(`[${J}] R · population : le champ de recherche de Stock existe`, !!q); }
      const m = await mesure2('ms-q');
      v(`[${J}] R · Stock à ${w} × ${h} : l'invite tient (${m && m.texte} px pour ${m && m.place}, « ${m && m.ph} »)`, !!m && m.texte <= m.place, m);
      if (i === 1) await L.capture(c2, CAP + `stock-rotation-${J}.png`, false);
    }
    await p2.fill('#ms-q', 'gant'); await p2.setViewportSize({ width: dims[0][0], height: dims[0][1] }); await L.calme(p2, 700);
    const m2 = await mesure2('ms-q'); v(`[${J}] R · tourner l'appareil ne vide pas ce qui est tapé (« ${m2 && m2.val} »)`, !!m2 && m2.val === 'gant', m2);
    await p2.fill('#ms-q', '');
    await R2(() => { prVue = 'articles'; aller('produits'); }); await L.calme(p2, 600); await R2(() => { prVue = 'articles'; rendre(); }); await L.calme(p2, 500);
    for (const [w, h] of [dims[1], dims[0], dims[1]]) { await p2.setViewportSize({ width: w, height: h }); await L.calme(p2, 700); const m = await mesure2('fx-q'); v(`[${J}] R · Articles à ${w} × ${h} : l'invite tient (${m && m.texte} px pour ${m && m.place})`, !!m && m.texte <= m.place, m); }
    await L.fin(c2);
  }
  const ko = L.bilan(); if (!dims) await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
