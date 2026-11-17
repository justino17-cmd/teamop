// Campagne « planning », ÉTAPE 3 (recontrôle adverse) : trois PARCOURS de bout en bout, d'autres que ceux du correcteur,
// qui comparent chaque écran au recalcul depuis les données (INTS) — jamais deux écrans entre eux seulement.
// Usage : timeout 580 node planning-recontrole-parcours.js <profil> [nuit] [PA PB PC]       « N ✓ · M ✗ », code 1 si un contrôle tombe.
//   PA  (téléphone) une urgence confiée à Tom depuis la carte : les cinq vues (jour, semaine, mois, sur mesure, carte) disent la même chose, « Annuler » les remet toutes
//   PB  (ordinateur) glisser : sur une plage occupée, une intervention terminée, une absence, vers le passé, annuler au bouton puis au clavier ; les chiffres restent justes
//   PC  (petit écran) « Sur mesure » : jours, personnes, vue enregistrée, rechargement, suppression ; défilement des jours au doigt
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const veut = args.filter(a => /^P[A-C]$/.test(a));
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-planning-recontrole/';
const PARC = []; const parcours = (n, f) => PARC.push([n, f]);
const vue = async (c, v, jour) => { await c.p.evaluate(({ v, jour }) => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = jour || AUJ; plMasques = new Set(); plJours = 6; rendre(); scrollTo(0, 0); }, { v, jour }); await L.calme(c.p, 500); };
const reouvrir = async c => { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 300); };
const toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
const kpis = p => p.evaluate(() => { const o = {}; document.querySelectorAll('#contenu [data-kpi]').forEach(b => o[b.dataset.kpi] = b.querySelector('b').textContent.trim()); return o; });
// ce que disent les DONNÉES d'un jour pour une personne (le recalcul de référence)
const donnees = (p, d, t) => p.evaluate(({ d, t }) => INTS.filter(i => i.d === d && (i.tech || '') === t && i.st !== 'annulee').map(i => i.id).sort(), { d, t });
const cartesCol = (p, d, t) => p.evaluate(({ d, t }) => { const o = [...document.querySelectorAll('.pc[data-int]')].filter(e => !e.closest('.fen') && (!t || e.closest('[data-tech="' + t + '"], [data-col]') !== null)); return o.length; }, { d, t });

parcours('PA · une urgence confiée à Tom depuis la carte : cohérence des cinq vues, puis « Annuler »', async c => {
  await vue(c, 'carte'); await L.calme(c.p, 2500);
  const av = await c.p.evaluate(() => { const u = INTS.find(i => i.id === 'i17'); return { tech: u.tech || '', d: u.d, aPl: INTS.filter(i => i.st === 'aplanifier').length, tom: INTS.filter(i => i.d === u.d && i.tech === 'tl' && i.st !== 'annulee').length }; });
  console.log('   avant :', JSON.stringify(av));
  L.v('PA · l’urgence i17 n’a personne et compte dans « à planifier » (population de départ)', av.tech === '' && av.aPl >= 2, av);
  await c.p.evaluate(id => crChoisir(id, false), 'i17'); await L.calme(c.p, 700);
  const lib = await c.p.evaluate(() => [...document.querySelectorAll('[data-crconf^="i17|"]')].map(b => b.dataset.crconf + ':' + b.textContent.trim()));
  console.log('   propositions :', JSON.stringify(lib));
  L.v('PA · la fiche propose de confier l’urgence à quelqu’un (Tom en tête)', lib.some(x => /^i17\|tl:/.test(x)), lib);
  await c.p.evaluate(() => { const b = document.querySelector('[data-crconf="i17|tl"]'); scrollBy(0, Math.round(b.getBoundingClientRect().top - 200)); }); await L.calme(c.p, 900);
  const libre = await c.p.evaluate(() => { const b = document.querySelector('[data-crconf="i17|tl"]').getBoundingClientRect(), t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!t && !!t.closest('[data-crconf]'); });
  L.v('PA · le bouton « Confier à Tom » de la carte est libre (rien dessus) une fois la page remontée', libre, libre);
  await L.toucher(c, '[data-crconf="i17|tl"]'); await L.calme(c.p, 700);
  const t1 = await toast(c.p); console.log('   toast :', t1);
  const ap = await c.p.evaluate(() => { const u = INTS.find(i => i.id === 'i17'); return { tech: u.tech, st: u.st, aPl: INTS.filter(i => i.st === 'aplanifier').length, tom: INTS.filter(i => i.d === u.d && i.tech === 'tl' && i.st !== 'annulee').length }; });
  L.v('PA · les données : i17 chez Tom, planifiée, « à planifier » − 1, Tom + 1', ap.tech === 'tl' && ap.st === 'planifiee' && ap.aPl === av.aPl - 1 && ap.tom === av.tom + 1, ap);
  L.v('PA · le message dit « passée à Tom » et propose « Annuler »', /Tom/.test(t1) && /Annuler/.test(t1), t1);
  // chaque vue relue : le chiffre « à planifier » et la carte de l'urgence chez Tom
  const d = av.d;
  for (const v of ['jour', 'semaine', 'multi', 'mois', 'general']) {
    await vue(c, v, d); await L.calme(c.p, 600); const k = await kpis(c.p);
    const lu = await c.p.evaluate(({ id }) => { const e = document.querySelector('.pc[data-int="' + id + '"]'); if (!e) return { carte: false }; const col = e.closest('.pl-col,.pl-cel,.pl-mj'); return { carte: true, dans: col ? (col.dataset.tech || col.dataset.col || col.dataset.cel || col.dataset.mj || col.className).slice(0, 30) : null, parent: e.closest('[data-tech]') ? e.closest('[data-tech]').dataset.tech : null }; }, { id: 'i17' });
    console.log('   ' + v + ' :', JSON.stringify(k), JSON.stringify(lu));
    L.v('PA · vue ' + v + ' : « à planifier » vaut ' + (av.aPl - 1) + ' (recalcul des données)', +k.plan === av.aPl - 1, k);
    if (['jour', 'multi', 'semaine'].includes(v)) L.v('PA · vue ' + v + ' : la carte de l’urgence est affichée, sans doublon', (await c.p.evaluate(() => document.querySelectorAll('.pc[data-int="i17"]:not(.fantome)').length)) >= 1, lu);
  }
  // Annuler (message sur la carte) remet tout
  await vue(c, 'carte', d); await L.calme(c.p, 1200); await c.p.evaluate(id => crChoisir(id, false), 'i17'); await L.calme(c.p, 400);
  await L.toucher(c, '[data-crconf="i17|tl"]').catch(() => {}); await L.calme(c.p, 500);
  await c.p.evaluate(() => annuler()); await L.calme(c.p, 500);
  const re = await c.p.evaluate(() => { const u = INTS.find(i => i.id === 'i17'); return { tech: u.tech || '', st: u.st, aPl: INTS.filter(i => i.st === 'aplanifier').length }; });
  L.v('PA · après « Annuler » : l’urgence est de nouveau sans personne et « à planifier » est revenu', re.tech === '' && re.st === 'aplanifier' && re.aPl === av.aPl, re);
  await vue(c, 'jour', d); const k2 = await kpis(c.p); L.v('PA · le tableau de chiffres du jour est revenu à sa valeur d’origine', +k2.plan === av.aPl, k2);
  await L.capture(c, CAP + `PA-jour-${profil}${nuit ? '-nuit' : ''}.png`);
});

parcours('PB · glisser à la souris : plage occupée, intervention terminée, absence, passé ; annuler au bouton puis au clavier', async c => {
  if (c.doigt) { L.v('PB · (profil au doigt : sans objet, joué sur ordinateur)', true); return; }
  await vue(c, 'semaine');
  const etat = () => c.p.evaluate(() => JSON.stringify(INTS.map(i => [i.id, i.tech, i.d, i.h, i.dur, i.st])));
  const base = await etat(); const kb = await kpis(c.p);
  const centre = id => c.p.evaluate(id => { const e = document.querySelector('.pc[data-int="' + id + '"] .t'); if (!e) return null; const r = e.getBoundingClientRect(); if (r.top < 0 || r.bottom > innerHeight) return null; return { x: r.left + Math.min(r.width / 2, 40), y: r.top + r.height / 2 }; }, id);
  const cible = (tech, d, h) => c.p.evaluate(({ tech, d, h }) => { const col = [...document.querySelectorAll('.pl-col')].find(x => x.dataset.tech === tech && x.dataset.d === d) || [...document.querySelectorAll('.pl-col')].find(x => x.dataset.tech === tech); if (!col) return null; col.scrollIntoView({ block: 'center', inline: 'center' }); const r = col.getBoundingClientRect(), pph = +col.dataset.pph; return { x: r.left + r.width / 2, y: r.top + ((h * 60) - H0 * 60) / 60 * pph + 6, d: col.dataset.d }; }, { tech, d, h });
  const glis = async (de, vers) => { await c.p.mouse.move(de.x, de.y); await c.p.mouse.down(); for (let k = 1; k <= 14; k++) { await c.p.mouse.move(de.x + (vers.x - de.x) * k / 14, de.y + (vers.y - de.y) * k / 14); await c.p.waitForTimeout(25); } await c.p.waitForTimeout(120); await c.p.mouse.up(); await L.calme(c.p, 500); };
  const cas = await c.p.evaluate(() => ({ occupee: INTS.filter(i => i.d === AUJ && i.tech === 'sm' && i.st !== 'fait').map(i => i.id + '@' + i.h), terminee: INTS.filter(i => i.st === 'fait' && i.tech && i.d === AUJ).map(i => i.id + '@' + i.tech), colonnes: [...document.querySelectorAll('.pl-col')].slice(0, 4).map(x => x.dataset.tech + '|' + x.dataset.d) }));
  console.log('   situation :', JSON.stringify(cas));
  // 1. poser i2 (Sophie) sur l'heure d'i1 (Sophie, 08:30) le même jour : chevauchement signalé, la pose est permise
  const dest = await cible('sm', await c.p.evaluate(() => AUJ), 8.5); const i2 = await centre('i2');
  L.v('PB · repères de glisser trouvés (carte i2 et colonne de Sophie aujourd’hui)', !!i2 && !!dest, { i2, dest });
  if (i2 && dest) { await glis(i2, dest); const t = await toast(c.p); const h2 = await c.p.evaluate(() => INTS.find(i => i.id === 'i2').h);
    console.log('   i2 posée sur 08:30 → ', h2, '|', t);
    L.v('PB · poser sur une plage occupée : le message PRÉVIENT du chevauchement (et propose Annuler)', /Chevauche/.test(t) && /Annuler/.test(t), { h2, t }); }
  // 2. annuler au bouton
  await c.p.evaluate(() => { const b = document.querySelector('#toast [data-toast-act], #toast button'); if (b) b.click(); }); await L.calme(c.p, 400);
  const apAnn = await etat(); L.v('PB · « Annuler » du message remet l’intervention exactement où elle était', apAnn === base, apAnn === base ? '' : 'différent');
  // 3. une intervention terminée : se laisse-t-elle déplacer ? (décision à rapporter)
  const f = (cas.terminee[0] || '').split('@')[0];
  if (f) { const dst = await cible('tl', await c.p.evaluate(() => AUJ), 15); const cf = await centre(f);
    L.v('PB · repères du glisser de la carte terminée trouvés', !!cf && !!dst, { cf, dst }); await c.p.evaluate(() => document.getElementById('toast').classList.remove('on')); if (cf && dst) await glis(cf, dst); const t = await toast(c.p); const mv = (await etat()) !== base;
    console.log('   intervention TERMINÉE ' + f + ' glissée plus tard dans la journée → déplacée :', mv, '|', t);
    L.v('PB · une intervention TERMINÉE : ou elle ne bouge pas ET un message le dit, ou elle bouge avec Annuler', mv ? /Annuler/.test(t) : t.length > 5, { deplacee: mv, t });
    await c.p.evaluate(() => annuler()); await L.calme(c.p, 300); }
  // 4. vers une date passée
  const pass = await c.p.evaluate(() => ajoute(AUJ, -3)); await vue(c, 'semaine', pass); await L.calme(c.p, 400);
  const colP = await cible('sm', pass, 10);
  console.log('   colonne de la date passée :', JSON.stringify(colP));
  // 5. clavier : Ctrl+Z après un déplacement
  await vue(c, 'semaine'); const a0 = await etat(); const ds = await cible('kb', await c.p.evaluate(() => ajoute(AUJ, 2)), 10); const ci = await centre('i4');
  L.v('PB · repères du glisser de i4 vers lundi trouvés', !!ci && !!ds, { ci, ds }); if (ci && ds) { await glis(ci, ds); const mv = (await etat()) !== a0; L.v('PB · glisser i4 vers lundi change bien l’intervention', mv, '');
    const kdep = await kpis(c.p);
    await c.p.keyboard.press('Control+z'); await L.calme(c.p, 500);
    L.v('PB · Ctrl+Z remet l’intervention où elle était', (await etat()) === a0, '');
    const kfin = await kpis(c.p); L.v('PB · les chiffres sont revenus à leur valeur d’origine après l’annulation au clavier', JSON.stringify(kfin) === JSON.stringify(await (async () => { await vue(c, 'semaine'); return kpis(c.p); })()), { avant: kb, apresAnnulation: kfin }); }
  // 6. recalcul final : chaque carte affichée correspond à une intervention des données, aucune en double
  const fin = await c.p.evaluate(() => { const ids = [...document.querySelectorAll('.pc[data-int]:not(.fantome)')].filter(e => !e.closest('.fen')).map(e => e.dataset.int); const dbl = ids.filter((x, k) => ids.indexOf(x) !== k); return { n: ids.length, dbl, inconnues: ids.filter(x => !INTS.some(i => i.id === x)) }; });
  L.v('PB · après tous ces gestes : aucune carte en double ni sans donnée', fin.dbl.length === 0 && fin.inconnues.length === 0, fin);
  await L.capture(c, CAP + `PB-semaine-${profil}${nuit ? '-nuit' : ''}.png`);
});

parcours('PC · « Sur mesure » au petit écran : jours, personnes, vue enregistrée, rechargement, suppression', async c => {
  await vue(c, 'multi');
  const lire = () => c.p.evaluate(() => ({ jours: [...multiJours], vuesNb: (typeof multiVues !== 'undefined' && multiVues.length) || null, cartes: document.querySelectorAll('.pc[data-int]').length, bouton: (document.querySelector('[data-mpop="dates"]') || {}).textContent.replace(/\s+/g, ' ').trim(), qui: (document.querySelector('[data-mpop="qui"]') || {}).textContent.replace(/\s+/g, ' ').trim(), vues: (document.querySelector('[data-mpop="vues"]') || {}).textContent.replace(/\s+/g, ' ').trim() }));
  const a0 = await lire(); console.log('   au départ :', JSON.stringify(a0));
  // choisir trois jours : aujourd'hui, lundi, mardi
  await L.toucher(c, '[data-mpop="dates"]'); await L.calme(c.p, 300);
  const j3 = await c.p.evaluate(() => [ajoute(AUJ, 3), ajoute(AUJ, 4)]);   // lundi 2 est déjà choisi au départ : on ajoute mardi et mercredi
  for (const j of j3) { await L.toucher(c, '[data-mjbascule="' + j + '"]'); await L.calme(c.p, 250); if (!(await c.p.evaluate(() => !!document.querySelector('.pm-pop')))) await L.toucher(c, '[data-mpop="dates"]'); }
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 400);
  const a1 = await lire(); L.v('PC · quatre jours choisis (aujourd’hui, lundi, mardi, mercredi)', a1.jours.length === 4 && j3.every(j => a1.jours.includes(j)), a1);
  // une seule personne : Karim
  await L.toucher(c, '[data-mpop="qui"]'); await L.calme(c.p, 300); await L.toucher(c, '[data-mqtous="0"]'); await L.calme(c.p, 300);
  if (!(await c.p.evaluate(() => !!document.querySelector('.pm-pop-qui')))) await L.toucher(c, '[data-mpop="qui"]');
  await c.p.evaluate(() => { const i = document.querySelector('.pm-pop-qui [data-mqt="kb"]'); if (i) i.click(); }); await L.calme(c.p, 400);
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 400);
  const a2 = await lire(); const attendu = await c.p.evaluate(() => INTS.filter(i => multiJours.includes(i.d) && i.tech === 'kb' && i.st !== 'annulee').length);
  console.log('   Karim seul :', JSON.stringify(a2), 'attendu', attendu);
  L.v('PC · Karim seul : le nombre de cartes affichées = celui des données (' + attendu + ')', a2.cartes === attendu, { a2, attendu });
  // enregistrer la vue
  await L.toucher(c, '[data-mpop="vues"]'); await L.calme(c.p, 300);
  const nbAvant = await c.p.evaluate(() => document.querySelectorAll('.pm-pop [data-mvue]').length);
  await L.toucher(c, '[data-action="vueEnregistrer"]'); await L.calme(c.p, 500);
  const champ = await c.p.evaluate(() => !!document.getElementById('vue-nom'));
  L.v('PC · « Enregistrer la vue actuelle » ouvre un panneau avec le champ du nom et le résumé des jours choisis', champ, champ);
  const resume = await c.p.evaluate(() => (document.querySelector('#panneau, .panneau, #pan') || document.body).textContent.replace(/\s+/g, ' ').match(/Enregistrer cette vue[^]{0,160}/)?.[0]);
  console.log('   panneau :', resume);
  if (champ) { await c.p.fill('#vue-nom', 'Karim · 4 jours très très longs pour voir si ça tient dans le menu'); await L.toucher(c, '[data-action="vueEnregistrerOk"]'); await L.calme(c.p, 600); console.log('   toast :', await toast(c.p)); }
  await L.toucher(c, '[data-mpop="vues"]').catch(() => {}); await L.calme(c.p, 400);
  const nbApres = await c.p.evaluate(() => document.querySelectorAll('.pm-pop [data-mvue]').length);
  L.v('PC · la vue enregistrée apparaît dans « Mes vues » (' + nbAvant + ' → ' + nbApres + ')', nbApres === nbAvant + 1, { nbAvant, nbApres, champ });
  await L.capture(c, CAP + `PC-vues-${profil}${nuit ? '-nuit' : ''}.png`);
  const larg = await c.p.evaluate(() => { const p = document.querySelector('.pm-pop'); if (!p) return null; const r = p.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right), iw: innerWidth }; });
  L.v('PC · le menu « Mes vues » tient dans l’écran (nom très long compris)', !larg || (larg.l >= 0 && larg.r <= larg.iw), larg);
  // appliquer la vue depuis un état différent, après rechargement
  await c.p.evaluate(() => { const b = document.querySelector('.pm-pop [data-mvue]:last-of-type'); });
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 300);
  await reouvrir(c); await vue(c, 'multi');
  await L.toucher(c, '[data-mpop="vues"]'); await L.calme(c.p, 400);
  const apRecharge = await c.p.evaluate(() => [...document.querySelectorAll('.pm-pop [data-mvue]')].map(b => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)));
  console.log('   après rechargement, « Mes vues » :', JSON.stringify(apRecharge));
  L.v('PC · après rechargement la vue enregistrée est toujours là', apRecharge.length >= nbApres, apRecharge);
  // supprimer la vue enregistrée
  const idx = await c.p.evaluate(() => { const bs = [...document.querySelectorAll('.pm-pop [data-mvuesuppr]')]; return bs.length ? bs[bs.length - 1].dataset.mvuesuppr : null; });
  if (idx !== null) { const n0 = (await c.p.evaluate(() => document.querySelectorAll('.pm-pop [data-mvuesuppr]').length)); await L.toucher(c, '.pm-pop [data-mvuesuppr="' + idx + '"]'); await L.calme(c.p, 500);
    const t = await toast(c.p); const n1 = await c.p.evaluate(() => { if (!document.querySelector('.pm-pop')) { const b = document.querySelector('[data-mpop="vues"]'); b && b.click(); } return document.querySelectorAll('.pm-pop [data-mvuesuppr]').length; });
    console.log('   suppression :', t, n0, '→', n1);
    L.v('PC · supprimer une vue enregistrée la retire de la liste', n1 === n0 - 1, { n0, n1, t }); }
  // défilement des jours au doigt
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 300); await vue(c, 'jour');
  const sc = await c.p.evaluate(() => { const d = document.querySelector('.pl-defile'); if (!d) return null; d.scrollLeft = 0; return { sw: d.scrollWidth, cw: d.clientWidth }; });
  if (sc && sc.sw > sc.cw + 20) { const cdp = await c.ctx.newCDPSession(c.p), T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    const y = await c.p.evaluate(() => { const d = document.querySelector('.pl-defile'); d.scrollLeft = 0; d.scrollIntoView({ block: 'start' }); scrollBy(0, -20); const r = d.getBoundingClientRect(); return r.top + Math.min(r.height, innerHeight - r.top - 60) * 0.55; }); await L.calme(c.p, 500);
    const surQui = await c.p.evaluate(y => { const t = document.elementFromPoint(300, y); return t ? (t.className || t.tagName).toString().slice(0, 40) : null; }, y); console.log('   le doigt se pose sur :', surQui, 'y =', Math.round(y));
    await T('touchStart', 300, y); for (let k = 1; k <= 12; k++) { await T('touchMove', 300 - k * 14, y); await c.p.waitForTimeout(30); } await T('touchEnd'); await cdp.detach(); await L.calme(c.p, 700);
    const apres = await c.p.evaluate(() => ({ sl: document.querySelector('.pl-defile').scrollLeft, sy: Math.round(scrollY) }));
    L.v('PC · un glissement du doigt vers la gauche fait défiler les personnes (scrollLeft > 0)', apres.sl > 20, { sc, apres });
  } else L.v('PC · le jour tient sans défilement latéral à ce profil (rien à faire défiler)', true, sc);
});

(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  for (const [nom, fn] of PARC) { const k = nom.split(' ')[0]; if (veut.length && !veut.includes(k)) continue; console.log('\n== ' + nom);
    try { await reouvrir(c); await vue(c, 'jour'); await fn(c); } catch (e) { L.v(k + ' · exception pendant le parcours', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
  L.v('aucune erreur JavaScript pendant les parcours', c.err.length === 0, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
