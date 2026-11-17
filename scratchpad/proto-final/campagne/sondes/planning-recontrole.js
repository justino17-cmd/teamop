// Campagne « planning », ÉTAPE 3 (recontrôle adverse) : rejoue les corrections AVEC D'AUTRES entrées que celles du correcteur
// et cherche ce qu'elles ont cassé à côté.
// Usage : timeout 580 node planning-recontrole.js <profil> [nuit] [R1 R3 R4 R5 R7 R11 …]    « N ✓ · M ✗ », code 1 si un contrôle tombe.
//   R1  planning-01 : le point d'une adresse (toutes les communes, casse, accents, rue qui porte le nom d'une autre commune)
//   R3  planning-03 : Échap sur les trois fenêtres de « Sur mesure », sans casser les autres Échap
//   R4  planning-06 : la zone invisible de la poignée de durée ne mange ni le toucher de la carte ni celui d'une carte courte
//   R5  planning-05 : cibles au doigt, mesurées par ce qui RÉPOND au point touché, sur chaque vue
//   R7  planning-07 : repères de la carte, TOUS les jours qui ont au moins deux étapes, avant et après un zoom
//   R12 restes : la bulle de trajet de la carte ne recouvre aucun repère et aucun repère n'est sous un bouton de la carte
//   R13 restes : une intervention terminée n'a pas la main qui attrape, et un glissement dit pourquoi rien ne bouge
//   R14 restes : le focus clavier ramène à droite de la colonne des noms une carte à moitié cachée (Vue d'ensemble)
//   R11 planning-11 : colonne collante de la Vue d'ensemble — carte amenée à l'écran, Tab, « Aujourd'hui », défilement normal
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const veut = args.filter(a => /^R\d+b?$/.test(a));
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-planning-recontrole/';
const PARC = [];
const parcours = (nom, fn) => PARC.push([nom, fn]);
const vue = async (c, v, jour) => { await c.p.evaluate(({ v, jour }) => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = jour || AUJ; plMasques = new Set(); plJours = 6; rendre(); scrollTo(0, 0); }, { v, jour }); await L.calme(c.p, 500); };
const reouvrir = async c => { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 300); };

parcours('R1 · planning-01 : le point d’une adresse écrite à la main', async c => {
  const t = await c.p.evaluate(() => {
    const cas = [
      ['12 Rue de la République, 17300 Rochefort', 'rochefort'], ['3 Avenue de la Plage, 17340 CHÂTELAILLON-PLAGE', 'chatelaillon'], ['8 rue des Lilas 17140 LAGORD', 'lagord'],
      ['14 Rue Gambetta, 17440 Aytré', 'aytre'], ['1 place du Marché, 17230 Marans', 'marans'], ['2 impasse du Port, Nieul-sur-Mer', 'nieul sur mer'], ['6 rue Verte, 17180 Périgny', 'perigny'],
      ['9 rue de la Mer, 17690 Angoulins', 'angoulins'], ['4 chemin des Vignes, Salles sur Mer', 'salles sur mer'], ['20 rue Saint-Jean du Pérot, 17000 La Rochelle', 'la rochelle'], ['5 rue du Port, 17138 Puilboreau', 'puilboreau'],
      ['12 Route de La Rochelle, 17300 Rochefort', 'rochefort'],        // rue qui porte le nom d'une AUTRE commune : le client est à Rochefort
      ['3 Rue de Rochefort, 17230 Marans', 'marans'],
      ['12 Route de La Rochelle Rochefort', 'rochefort'],               // ni virgule ni code postal : la dernière commune nommée l'emporte
      ['4 Avenue de Rochefort 17000 La Rochelle', 'la rochelle'],
    ];
    return cas.map(([adr, attendu]) => { const g = geoDeAdresse(adr), a = COMMUNES_GEO[attendu]; return { adr, attendu, g, ok: !!g && !!a && g[0] === a[0] && g[1] === a[1] }; });
  });
  for (const r of t.slice(0, 11)) L.v('R1 · « ' + r.adr + ' » est placée à ' + r.attendu, r.ok, r);
  for (const r of t.slice(11)) L.v('R1 · adresse dont la RUE porte le nom d’une autre commune : « ' + r.adr + ' » → ' + r.attendu, r.ok, r);
  const v = await c.p.evaluate(() => ({ vide: geoDeAdresse(''), nul: geoDeAdresse(null), inconnue: geoDeAdresse('5 chemin des Vignes, Nullepart-les-Oies'), copie: (() => { const a = geoDeAdresse('Rochefort'); a[0] = 0; return COMMUNES_GEO['rochefort'][0]; })() }));
  L.v('R1 · adresse vide, nulle ou inconnue : pas de point inventé', v.vide === null && v.nul === null && v.inconnue === null, v);
  L.v('R1 · le point rendu est une COPIE (le modifier ne change pas la table)', v.copie !== 0, v);
  // un client créé à la main dans une autre commune, par l'écran : carte + liens, sur le profil joué
  await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine');
  await L.toucher(c, '[data-creer]'); await L.attendre(c.p, () => !!document.querySelector('#fenetre .fen'));
  await L.toucher(c, '.fen [data-cnouveau="1"]');
  await c.p.fill('.fen [data-cnv="nom"]', 'Épicerie Fine des Quatre Vents de Châtelaillon-Plage et ses environs'); await c.p.fill('.fen [data-cnv="contact"]', 'M. Abélard-Lemaître'); await c.p.fill('.fen [data-cnv="tel"]', '06 41 52 63 74');
  await c.p.fill('.fen [data-cnv="adr"]', '27 Avenue de la Plage, 17340 Châtelaillon-Plage'); await L.calme(c.p, 300);
  const rep = await c.p.evaluate(() => (document.querySelector('.fen .adr-rep') || {}).textContent);
  L.v('R1 · le formulaire dit « Repérée : Châtelaillon-Plage » avec ses km', /Châtelaillon/.test(rep || '') && /\d+ km/.test(rep || ''), rep);
  const d0 = await c.p.evaluate(() => ajoute(AUJ, 3));
  await L.toucher(c, '.fen [data-ctype="Dépannage"]'); await c.p.evaluate(d => document.querySelector('.fen [data-cjour="' + d + '"]')?.click(), d0); await L.calme(c.p, 300);
  const dispo = await c.p.evaluate(() => { const b = [...document.querySelectorAll('.fen [data-dispo]')].find(x => !x.disabled && x.dataset.dispo.startsWith('kb|')) || [...document.querySelectorAll('.fen [data-dispo]')].find(x => !x.disabled); if (!b) return null; b.scrollIntoView({ block: 'center', inline: 'center' }); return b.dataset.dispo; });
  L.v('R1 · une case libre existe', !!dispo, dispo); if (!dispo) return;
  await L.toucher(c, '.fen [data-dispo="' + dispo + '"]');
  const av = await c.p.evaluate(() => INTS.map(x => x.id));
  await L.toucher(c, '[data-action="cCreer"]'); await L.calme(c.p, 600);
  console.log('   toast :', await c.p.evaluate(() => (document.getElementById('toast') || {}).textContent));
  const nv = await c.p.evaluate(a => INTS.filter(x => !a.includes(x.id) && x.id !== 'brouillon').map(x => ({ id: x.id, d: x.d, cli: x.cli })), av);
  L.v('R1 · une seule intervention créée', nv.length === 1, nv); if (nv.length !== 1) return;
  await vue(c, 'carte', nv[0].d); await L.toucher(c, '#contenu [data-crsel="' + nv[0].id + '"]'); await L.calme(c.p, 600);
  await L.capture(c, CAP + `R1-carte-${profil}${nuit ? '-nuit' : ''}.png`);
  const r = await c.p.evaluate(({ id }) => { const T = crTournees(plRef), s = T.flatMap(x => x.S).find(x => x.i.id === id); const f = document.querySelector('.cr-fiche');
    return { km: s && Math.round(s.tr.km), aDepot: s && crPos(s) === CR_DEPOT, liens: f ? [...f.querySelectorAll('[data-craller]')].map(a => a.href) : [], txt: f ? f.textContent.replace(/\s+/g, ' ').slice(0, 160) : null }; }, nv[0]);
  L.v('R1 · Châtelaillon n’est pas posée au dépôt et le trajet n’est pas nul', !!r && !r.aDepot && r.km > 8, r);
  L.v('R1 · les trois liens « Y aller avec » visent Châtelaillon (≈ 46.07,-1.09), pas le dépôt', r.liens.length === 3 && r.liens.every(h => /46\.07\d*,-1\.09\d*/.test(h)), r.liens);
  // et la fiche dit ce qu'elle a trouvé : un nom très long ne coupe rien
  const deb = await L.deborde(c); L.v('R1 · la carte avec un nom de client très long ne déborde pas du ' + c.profil, !deb || !deb.length || deb === 0 || (deb.deborde === false), deb);
});

parcours('R3 · planning-03 : Échap sur « Quels jours ? », « Personnes », « Mes vues »', async c => {
  await vue(c, 'multi');
  for (const k of ['dates', 'qui', 'vues']) {
    await L.toucher(c, '[data-mpop="' + k + '"]'); await L.calme(c.p, 300);
    const ouv = await c.p.evaluate(() => !!document.querySelector('[role=dialog], .mpop, .mp-pop'));
    L.v('R3 · « ' + k + ' » : la fenêtre est ouverte avant Échap', ouv, ouv);
    await c.p.keyboard.press('Escape'); await L.calme(c.p, 300);
    const ap = await c.p.evaluate(() => ({ ouv: !!document.querySelector('[role=dialog], .mpop, .mp-pop'), foc: document.activeElement && document.activeElement.getAttribute('data-mpop'), hash: location.hash, v: plVue }));
    L.v('R3 · « ' + k + ' » : Échap la ferme, rend le focus à son bouton, reste dans le planning', !ap.ouv && ap.foc === k && ap.hash === '#planning' && ap.v === 'multi', ap);
  }
  // Échap n'ouvre rien tout seul et ne casse pas la fenêtre de création (qui garde SON Échap)
  await L.toucher(c, '[data-creer]'); await L.attendre(c.p, () => !!document.querySelector('#fenetre .fen'));
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 400);
  L.v('R3 · Échap ferme la fenêtre « Nouvelle intervention »', !(await c.p.evaluate(() => !!document.querySelector('#fenetre .fen'))), '');
  // une fenêtre « Quels jours ? » ouverte puis une fenêtre de création : Échap ferme la création d'abord, la fenêtre « Quels jours ? » ensuite
  await L.toucher(c, '[data-mpop="dates"]'); await L.calme(c.p, 300);
  await c.p.evaluate(() => { const b = document.querySelector('[data-creer]'); b && b.click(); }); await L.calme(c.p, 400);
  const deux = await c.p.evaluate(() => ({ fen: !!document.querySelector('#fenetre .fen'), pop: !!document.querySelector('[role=dialog]') }));
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 400);
  const un = await c.p.evaluate(() => ({ fen: !!document.querySelector('#fenetre .fen'), pop: !!document.querySelector('[role=dialog]'), v: plVue }));
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 400);
  const zero = await c.p.evaluate(() => ({ fen: !!document.querySelector('#fenetre .fen'), pop: !!document.querySelector('[role=dialog]'), v: plVue }));
  console.log('   empilé :', JSON.stringify({ deux, un, zero }));
  L.v('R3 · deux fenêtres l’une sur l’autre : Échap ne ferme jamais les deux d’un coup, et le planning reste', !(deux.fen && deux.pop) || (!(un.fen && !un.pop) && zero.v === 'multi'), { deux, un, zero });
  L.v('R3 · après deux Échap, plus rien d’ouvert', !zero.fen && !zero.pop, zero);
  // Échap dans un champ de saisie de la fenêtre « Personnes » ne fait pas d'erreur
  await L.toucher(c, '[data-mpop="qui"]'); await L.calme(c.p, 300);
  await c.p.keyboard.press('Tab'); await c.p.keyboard.press('Escape'); await L.calme(c.p, 300);
  L.v('R3 · aucune erreur JavaScript après tous ces Échap', c.err.length === 0, c.err.slice(0, 3));
  // Échap dans les autres vues ne fait rien de surprenant
  for (const v of ['jour', 'semaine', 'mois', 'general']) { await vue(c, v); await c.p.keyboard.press('Escape'); await L.calme(c.p, 200);
    const h = await c.p.evaluate(() => ({ hash: location.hash, v: plVue })); L.v('R3 · Échap sur la vue ' + v + ' ne change rien', h.hash === '#planning' && h.v === v, h); }
});

parcours('R4 · planning-06 : la zone invisible de la poignée (doigt)', async c => {
  if (!c.doigt) { L.v('R4 · (profil à la souris : sans objet, la zone ne s’applique qu’au doigt)', true); return; }
  await vue(c, 'jour');
  const R = await c.p.evaluate(() => { const rs = []; document.querySelectorAll('.pl-col .pc[data-int]').forEach(pc => { const t = pc.querySelector('.tire'); if (!t) return; pc.scrollIntoView({ block: 'center' });
      const r = pc.getBoundingClientRect(), tr = t.getBoundingClientRect(); const x = r.left + r.width / 2; let nTire = 0, n = 0; for (let y = r.top + 1; y < r.bottom; y += 2) { n++; const e = document.elementFromPoint(x, y); if (e && e.closest('.tire') === t) nTire++; }
      rs.push({ id: pc.dataset.int, h: Math.round(r.height), tireH: Math.round(tr.height), part: +(nTire / n).toFixed(2), titre: (pc.textContent || '').replace(/\s+/g, ' ').slice(0, 28) }); }); return rs; });
  console.log('   cartes :', JSON.stringify(R.map(x => x.id + ':' + x.h + 'px→' + Math.round(x.part * 100) + '%')));
  L.v('R4 · ' + R.length + ' cartes modifiables mesurées (population)', R.length >= 4, R.length);
  const mal = R.filter(x => x.part > 0.6);
  L.v('R4 · aucune carte n’est à plus de 60 % une poignée (le reste doit rester la carte)', mal.length === 0, mal);
  // une carte courte : un toucher en son milieu ouvre bien la fiche
  const courtes = R.filter(x => x.h < 70).sort((a, b) => a.h - b.h);
  console.log('   cartes courtes (< 70 px) :', JSON.stringify(courtes));
  const cible = courtes[0] || R.sort((a, b) => a.h - b.h)[0];
  const pt = await c.p.evaluate(id => { const pc = document.querySelector('.pc[data-int="' + id + '"]'); pc.scrollIntoView({ block: 'center' }); const r = pc.getBoundingClientRect(); return { x: r.left + r.width * 0.3, y: r.top + r.height * 0.3 }; }, cible.id);
  await c.p.touchscreen.tap(pt.x, pt.y); await L.calme(c.p, 700);
  const h1 = await c.p.evaluate(() => location.hash);
  L.v('R4 · un toucher sur le haut de la carte la plus courte (' + cible.h + ' px) ouvre sa fiche', h1 === '#inter-x-' + cible.id, { h1, cible });
  await c.p.goBack().catch(() => {}); await L.calme(c.p, 500);
  // un toucher sur le titre d'une carte moyenne, juste AU-DESSUS de la zone, n'amorce pas un redimensionnement
  const moy = R.filter(x => x.h >= 70).sort((a, b) => b.h - a.h)[0];
  if (moy) { await vue(c, 'jour'); const d = await c.p.evaluate(id => { const pc = document.querySelector('.pc[data-int="' + id + '"]'); pc.scrollIntoView({ block: 'center' }); const t = pc.querySelector('.tire').getBoundingClientRect(), r = pc.getBoundingClientRect(); return { x: r.left + r.width / 2, yHaut: t.top - 4, dur: INTS.find(x => x.id === id).dur, bas: r.bottom }; }, moy.id);
    const cdp = await c.ctx.newCDPSession(c.p), T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await T('touchStart', d.x, d.yHaut); await c.p.waitForTimeout(80); await T('touchMove', d.x, d.yHaut + 14); await c.p.waitForTimeout(80); await T('touchEnd'); await L.calme(c.p, 500);
    const dur2 = await c.p.evaluate(id => INTS.find(x => x.id === id).dur, moy.id);
    L.v('R4 · poser le doigt 4 px AU-DESSUS de la zone (sur le texte) et le faire glisser ne change pas la durée', dur2 === d.dur, { avant: d.dur, apres: dur2 }); }
});

const cibles = (p, zone) => p.evaluate(z => { const R = document.querySelector(z || '#contenu'), out = [], vus = new Set();
  for (const e of R.querySelectorAll('button, a[href], [data-int], [data-bur], [data-voirjour], [data-plvue], [data-kpi], [data-mpop], [data-crsel], [data-crfocus], [data-crpin], [data-plnav], [data-pers], input, select, summary')) {
    const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || e.disabled) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    if (r.bottom < 0 || r.right < 0) continue; if (e.closest('[hidden]')) continue;
    // ce qui RÉPOND : l'élément (ou son ancêtre cliquable) au centre ; le plus grand rectangle d'une zone d'invisible compte
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1), cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1); let rep = null;
    if (r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth) { const t = document.elementFromPoint(cx, cy); rep = t && (t === e || e.contains(t) || t.contains(e)) ? t : null; }
    const w = Math.round(r.width), h = Math.round(r.height), cle = e.tagName + e.className + (e.getAttribute('data-int') || e.getAttribute('data-voirjour') || e.getAttribute('data-crsel') || '') + w + 'x' + h; if (vus.has(cle)) continue; vus.add(cle);
    out.push({ tag: e.tagName, cl: String(e.className).slice(0, 30), lib: (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 32), w, h, d: [...e.attributes].filter(a => /^data-/.test(a.name)).map(a => a.name).join(' ').slice(0, 40) }); }
  return out; }, zone);

parcours('R5 · planning-05 : cibles au doigt (44 px), chaque vue, hauteur ET largeur', async c => {
  if (!c.doigt) { L.v('R5 · (profil à la souris : sans objet)', true); return; }
  const rap = {};
  for (const v of ['jour', 'semaine', 'mois', 'general', 'multi', 'carte']) {
    await vue(c, v); await L.calme(c.p, v === 'carte' ? 2500 : 300);
    const t = await cibles(c.p); const pet = t.filter(x => (x.h < 44) && !/input|select/i.test(x.tag) || (x.w < 44 && /button/i.test(x.tag) && x.h < 44));
    rap[v] = { total: t.length, petits: pet.slice(0, 12).map(x => `${x.tag}.${x.cl}[${x.d}] « ${x.lib} » ${x.w}×${x.h}`) };
    L.v('R5 · vue ' + v + ' : ' + t.length + ' cibles recensées (population)', t.length >= 8, t.length);
    console.log('   ' + v + ' — sous 44 px :', pet.length, pet.slice(0, 8).map(x => `${x.lib || x.cl}:${x.w}×${x.h}`).join(' | '));
  }
  require('fs').mkdirSync(CAP, { recursive: true }); require('fs').writeFileSync(CAP + `R5-${profil}${nuit ? '-nuit' : ''}.json`, JSON.stringify(rap, null, 1));
  // les cibles de 40 px de la vue Mois : les pastilles de jours
  // le lien « Voir dans Tâches › » de la carte « tâches pour toi » (le résidu de la première recontrôle : 41 px) : ouvert, mesuré, et touché pour de vrai.
  // Elle n'est pas posée sur toutes les vues (la Carte n'en a pas) : on mesure celles qui l'ont, et on exige qu'au moins une l'ait.
  let vues = 0;
  for (const v of ['jour', 'semaine', 'mois', 'general', 'multi', 'carte']) { await vue(c, v); await L.calme(c.p, 400);
    const l = await c.p.evaluate(() => { const d = document.querySelector('details.t-ici'); if (!d) return null; d.open = true; const a = d.querySelector('.t-ici-tout'); if (!a) return null; a.scrollIntoView({ block: 'center' }); const r = a.getBoundingClientRect(); const t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { h: Math.round(r.height), w: Math.round(r.width), touche: !!t && (t === a || a.contains(t)), txt: a.textContent.trim() }; });
    if (!l) { console.log('   vue ' + v + ' : pas de carte « tâches pour toi » (sans objet)'); continue; } vues++;
    L.v('R5 · vue ' + v + ' : « Voir dans Tâches › » se touche sur ' + l.h + ' px de haut (44 au moins) et répond en son centre', l.h >= 44 && l.touche, l); }
  L.v('R5 · « Voir dans Tâches › » mesuré sur au moins une vue (population)', vues >= 1, vues);
});

parcours('R7 · planning-07 : repères de la carte, tous les jours à plusieurs étapes, avant et après un zoom', async c => {
  const jours = await c.p.evaluate(() => { const m = {}; INTS.forEach(i => { if (i.tech && i.d && i.st !== 'annulee') m[i.d] = (m[i.d] || 0) + 1; }); return Object.entries(m).filter(([d, n]) => n >= 2).map(([d, n]) => d).sort().slice(0, 7); });
  if (process.env.JOUR) jours.splice(0, jours.length, ...process.env.JOUR.split(','));
  console.log('   jours à ≥ 2 étapes :', jours.join(' '));
  L.v('R7 · plusieurs jours à rejouer (population)', jours.length >= 2, jours);
  for (const d of jours) {
    await c.p.evaluate(j => { crSel = null; crFocus = null; crLV = null; if (location.hash !== '#planning') aller('planning'); plVue = 'carte'; plRef = j; rendre(); }, d);
    for (let i = 0; i < 40; i++) { await c.p.waitForTimeout(500); if (await c.p.evaluate(() => crReelEtat === 'ok' && document.querySelectorAll('.cr-mk[data-crpin]').length > 0)) break; } await L.calme(c.p, 1200);
    const lire = () => c.p.evaluate(() => { const car = document.getElementById('cr-carte'); if (car) { const r0 = car.getBoundingClientRect(); window.scrollBy(0, Math.round(r0.top - 80)); } const ms = [...document.querySelectorAll('.cr-mk[data-crpin]')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.crpin, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; });
      const couverts = []; for (const m of ms) { const t = document.elementFromPoint(m.x, m.y), mk = t && t.closest && t.closest('.cr-mk[data-crpin]'); if (!mk || mk.dataset.crpin !== m.id) couverts.push(m.id + '@' + Math.round(m.x) + ',' + Math.round(m.y) + ' sy=' + Math.round(scrollY) + ' →' + (mk ? mk.dataset.crpin : (t ? (t.tagName + '.' + (t.getAttribute('class') || '') + '/' + (t.parentElement && t.parentElement.getAttribute('class') || '')) : 'rien-là'))); }
      let dmin = 1e9; for (let a = 0; a < ms.length; a++) for (let b = a + 1; b < ms.length; b++) dmin = Math.min(dmin, Math.hypot(ms[a].x - ms[b].x, ms[a].y - ms[b].y));
      const bords = ms.filter(m => m.x < 0 || m.y < 0 || m.x > innerWidth || m.y > innerHeight).map(m => m.id);
      return { n: ms.length, couverts, dmin: Math.round(dmin), bords, attendu: INTS.filter(i => i.d === plRef && i.st !== 'annulee' && (CR_GEO[i.cli] || true) && i.st !== 'fait' || i.d === plRef && i.st === 'fait').length }; });
    const a = await lire(); L.v('R7 · ' + d + ' : ' + a.n + ' repères (' + a.attendu + ' interventions ce jour), aucun recouvert, écart minimal ' + a.dmin + ' px', a.couverts.length === 0 && (a.n < 2 || a.dmin >= 28), a);
    for (const z of ['1', '-1', '-1']) { await L.toucher(c, '[data-crzoom="' + z + '"]'); await L.calme(c.p, 1400); }
    const b = await lire(); L.v('R7 · ' + d + ' après zoom +1, −1, −1 : aucun repère recouvert (' + b.n + ' repères, écart ' + b.dmin + ' px)', b.n === a.n && b.couverts.length === 0 && (b.n < 2 || b.dmin >= 28), b);
    await L.toucher(c, '[data-crrecentre]'); await L.calme(c.p, 1400); const e = await lire(); L.v('R7 · ' + d + ' après « Recentrer » : aucun repère recouvert', e.couverts.length === 0, e);
  }
  await L.capture(c, CAP + `R7-carte-${profil}${nuit ? '-nuit' : ''}.png`);
});

parcours('R7b · planning-07 : changer de jour AU BOUTON sur la carte réelle (zoomée) — les repères du nouveau jour sont-ils tous à l’écran ?', async c => {
  await c.p.evaluate(() => { crSel = null; crFocus = null; crLV = null; if (location.hash !== '#planning') aller('planning'); plVue = 'carte'; plRef = AUJ; rendre(); });
  for (let i = 0; i < 40; i++) { await c.p.waitForTimeout(500); if (await c.p.evaluate(() => crReelEtat === 'ok' && document.querySelectorAll('.cr-mk[data-crpin]').length > 0)) break; } await L.calme(c.p, 1500);
  const etat = () => c.p.evaluate(() => { const car = document.getElementById('cr-carte'), cr = car.getBoundingClientRect(); const ms = [...document.querySelectorAll('.cr-mk[data-crpin]')].map(e => { const r = e.getBoundingClientRect(); return { id: e.dataset.crpin, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    const hors = ms.filter(m => m.x < cr.left + 8 || m.x > cr.right - 8 || m.y < cr.top + 8 || m.y > cr.bottom - 8).map(m => m.id + '@' + Math.round(m.x - cr.left) + ',' + Math.round(m.y - cr.top));
    return { jour: plRef, n: ms.length, hors, carte: Math.round(cr.width) + 'x' + Math.round(cr.height), zoom: crLf && crLf.map ? +crLf.map.getZoom().toFixed(1) : null }; });
  await L.toucher(c, '[data-crzoom="1"]'); await L.calme(c.p, 1200); await L.toucher(c, '[data-crzoom="1"]'); await L.calme(c.p, 1200);
  const z0 = await etat(); console.log('   départ zoomé :', JSON.stringify(z0));
  const suivi = [];
  for (let k = 0; k < 6; k++) { await L.toucher(c, '[data-plnav="1"]'); await L.calme(c.p, 400); let e; for (let t = 0; t < 8; t++) { await c.p.waitForTimeout(500); e = await etat(); } suivi.push(e);
    console.log('   après « Suivant » ×' + (k + 1) + ' :', JSON.stringify(e)); }
  const avecRepères = suivi.filter(e => e.n >= 2);
  L.v('R7b · des jours à plusieurs repères ont été visités au bouton (population)', avecRepères.length >= 2, suivi.map(e => e.jour + ':' + e.n));
  L.v('R7b · à chaque jour, tous les repères sont dans la carte (cadrage refait au changement de jour)', avecRepères.every(e => e.hors.length === 0), avecRepères.filter(e => e.hors.length).map(e => e.jour + ' ' + e.hors.join(' ')));
  await L.capture(c, CAP + `R7b-${profil}${nuit ? '-nuit' : ''}.png`);
});

parcours('R11 · planning-11 : Vue d’ensemble, colonne collante et carte amenée à l’écran', async c => {
  await vue(c, 'general');
  const info = await c.p.evaluate(() => { const sc = document.querySelector('.pl-defile:has(.pg-g)'); if (!sc) return null; const cs = getComputedStyle(sc); const g = sc.querySelector('.pg-tec'), r = g.getBoundingClientRect();
    return { spl: cs.scrollPaddingLeft, sw: sc.scrollWidth, cw: sc.clientWidth, colL: Math.round(r.width), pos: getComputedStyle(g).position, nCartes: sc.querySelectorAll('[data-int]').length }; });
  console.log('   conteneur :', JSON.stringify(info)); L.v('R11 · la vue d’ensemble a un conteneur qui défile de côté', !!info && info.sw > info.cw, info); if (!info) return;
  L.v('R11 · son scroll-padding-left couvre la colonne des noms (' + info.spl + ' pour ' + info.colL + ' px)', parseFloat(info.spl) >= info.colL, info);
  // chaque carte, amenée par focus : visible, ET à droite de la colonne des noms
  const res = await c.p.evaluate(async () => { const sc = document.querySelector('.pl-defile:has(.pg-g)'); const cartes = [...sc.querySelectorAll('[data-int]')]; const mal = [], cou = []; let n = 0;
    const g = sc.querySelector('.pg-tec'); for (const e of cartes) { if (!e.hasAttribute('tabindex')) e.tabIndex = 0; e.focus(); { let a = -1, k = 0; for (let t = 0; t < 60 && k < 4; t++) { await new Promise(r => setTimeout(r, 60)); k = sc.scrollLeft === a ? k + 1 : 0; a = sc.scrollLeft; } } n++;   /* le défilement est animé : on attend qu'il ait fini de bouger */
      const sx = g.getBoundingClientRect().right, r = e.getBoundingClientRect(), cr = sc.getBoundingClientRect();
      if (r.width < 2) continue; const x = r.left + r.width / 2, y = r.top + Math.min(r.height / 2, 10); const t = document.elementFromPoint(x, y);
      if (r.left < sx - 1) mal.push(e.dataset.int + ' sous la colonne ' + Math.round(r.left) + '<' + Math.round(sx)); else if (r.right > cr.right + 1) cou.push(e.dataset.int + ' coupée à droite de ' + Math.round(r.right - cr.right) + ' px'); else if (t && t.closest('[data-int]') !== e) mal.push(e.dataset.int + ' recouverte par ' + (t.className || t.tagName)); }
    return { n, mal, cou }; });
  console.log('   cartes coupées au bord droit (info) :', JSON.stringify(res.cou));
  L.v('R11 · ' + res.n + ' cartes amenées par le focus : aucune sous la colonne des noms, hors champ ou recouverte', res.n >= 6 && res.mal.length === 0, res);
  // le clic sur une carte d'un jour lointain (ouvrir la fiche) et un retour ne déplace pas la vue de façon absurde
  const sl = await c.p.evaluate(() => { const sc = document.querySelector('.pl-defile:has(.pg-g)'); sc.scrollLeft = 0; const a = sc.scrollLeft; sc.scrollLeft = 300; return { a, b: sc.scrollLeft, max: sc.scrollWidth - sc.clientWidth }; });
  L.v('R11 · le défilement latéral reste libre (0 → 300 px)', sl.b >= Math.min(300, sl.max) - 2, sl);
  await L.capture(c, CAP + `R11-general-${profil}${nuit ? '-nuit' : ''}.png`);
});

parcours('R12 · restes : la bulle de trajet ne recouvre aucun repère, aucun repère sous un bouton de la carte', async c => {
  await vue(c, 'carte');
  for (let i = 0; i < 40; i++) { await c.p.waitForTimeout(500); if (await c.p.evaluate(() => crReelEtat === 'ok' && document.querySelectorAll('.cr-mk[data-crpin]').length > 0)) break; }
  await L.calme(c.p, 1500); await c.p.evaluate(() => { crLV = null; crCadrerReel(false); }); await L.calme(c.p, 900);
  const r = await c.p.evaluate(() => { const rr = e => e.getBoundingClientRect(), I = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const pins = [...document.querySelectorAll('.cr-mk[data-crpin]')], bulles = [...document.querySelectorAll('.cr-lbl-tr')], pane = e => e.closest('.leaflet-pane'), z = e => parseInt(getComputedStyle(pane(e)).zIndex, 10);
    const dessus = [], dessous = []; for (const b of bulles) for (const p of pins) { if (I(rr(b), rr(p)) > 30) (z(p) > z(b) ? dessus : dessous).push(p.dataset.crpin + ' / ' + b.textContent); }
    const obst = [...document.querySelectorAll('#cr-carte .cr-fonds, #cr-carte .cr-outils, #cr-carte .cr-chips, #cr-carte .cr-note')].filter(e => rr(e).width > 0);
    const sous = pins.filter(p => obst.some(o => I(rr(p), rr(o)) > 0)).map(p => p.dataset.crpin + ' sous ' + obst.find(o => I(rr(p), rr(o)) > 0).className);
    return { nPins: pins.length, nBulles: bulles.length, dessus, dessous, sous, nObst: obst.length }; });
  console.log('   ', JSON.stringify(r));
  L.v('R12 · la carte a ses repères et ses boutons (population)', r.nPins >= 6 && r.nObst >= 2, r);
  // sur un téléphone la carte fait 290 px de large : une bulle de 130 px ne trouve pas de place entre neuf repères et s'efface (le temps de route reste dit dans la liste des étapes)
  const liste = await c.p.evaluate(() => { const l = document.getElementById('cr-l'); return l ? /\d+ min/.test(l.textContent) && /\d+ km/.test(l.textContent) : false; });
  L.v('R12 · le temps et les km de route sont dits (bulle sur la carte, ou à défaut dans la liste des étapes)', r.nBulles >= 1 || liste, { nBulles: r.nBulles, liste });
  if (!c.doigt || c.largeur >= 700) L.v('R12 · sur un grand écran au moins une bulle de trajet est posée (population)', r.nBulles >= 1, r);
  L.v('R12 · aucune bulle de trajet ne recouvre un repère (elle se pose ailleurs sur le trajet, ou s\'efface) — ' + r.dessus.length + ' dessus, ' + r.dessous.length + ' dessous', r.dessous.length === 0 && r.dessus.length === 0, { dessus: r.dessus, dessous: r.dessous });
  L.v('R12 · aucun repère n\'est posé sous un bouton de la carte', r.sous.length === 0, r.sous);
  // le même, après un zoom de chaque sens : les repères se refont, la règle tient
  for (const k of [1, 1, -1, -1, -1]) { await c.p.evaluate(k => document.querySelector('[data-crzoom="' + k + '"]').click(), k); await L.calme(c.p, 900);
    const q = await c.p.evaluate(() => { const rr = e => e.getBoundingClientRect(), I = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const cont = document.querySelector('#cr-carte').getBoundingClientRect(), pins = [...document.querySelectorAll('.cr-mk[data-crpin]')].filter(p => { const b = rr(p), x = b.left + b.width / 2, y = b.top + b.height / 2; return x > cont.left + 24 && x < cont.right - 24 && y > cont.top + 24 && y < cont.bottom - 24; });   // un repère à moins de 24 px du bord est à moitié hors cadre : il se panoramique, on ne le compte pas
      const obst = [...document.querySelectorAll('#cr-carte .cr-fonds, #cr-carte .cr-outils, #cr-carte .cr-chips, #cr-carte .cr-note')].filter(e => rr(e).width > 0);
      const bul = [...document.querySelectorAll('.cr-lbl-tr')], rec = []; for (const b of bul) for (const p of document.querySelectorAll('.cr-mk[data-crpin]')) if (I(rr(b), rr(p)) > 30) rec.push(p.dataset.crpin + ' / ' + b.textContent);
      return { n: pins.length, nb: bul.length, rec, sous: pins.filter(p => obst.some(o => I(rr(p), rr(o)) > 0)).map(p => p.dataset.crpin) }; });
    L.v('R12 · zoom ' + (k > 0 ? '+' : '−') + ' : ' + q.n + ' repères dans le cadre, ' + q.nb + ' bulle(s), aucun repère sous un bouton ni sous une bulle', q.sous.length === 0 && q.rec.length === 0, q); }
  await L.capture(c, CAP + `R12-carte-${profil}${nuit ? '-nuit' : ''}.png`);
});

parcours('R13 · restes : une intervention terminée ne promet pas un geste qui ne vient pas', async c => {
  await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine');
  const f = await c.p.evaluate(() => { const e = [...document.querySelectorAll('.pc.fait[data-int]')].find(x => x.getBoundingClientRect().width > 20); if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'center' }); return { id: e.dataset.int, cur: getComputedStyle(e).cursor, n: document.querySelectorAll('.pc.fait[data-int]').length, autre: getComputedStyle(document.querySelector('.pc[data-int]:not(.fait)') || e).cursor }; });
  L.v('R13 · une intervention terminée est affichée (population)', !!f, f); if (!f) return;
  L.v('R13 · terminée : curseur « pointer » (elle s\'ouvre) et non la main qui attrape (' + f.cur + ')', f.cur === 'pointer', f);
  L.v('R13 · une intervention à venir garde la main qui attrape (' + f.autre + ') : elle se déplace', f.autre === 'grab', f);
  if (c.doigt) return;
  await L.calme(c.p, 300);
  const b = await c.p.evaluate(id => { const r = document.querySelector('.pc[data-int="' + id + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 12), id, h0: INTS.find(i => i.id === id).h, t0: INTS.find(i => i.id === id).tech }; }, f.id);
  await c.p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.classList.remove('on'); });
  await c.p.mouse.move(b.x, b.y); await c.p.mouse.down(); await c.p.mouse.move(b.x + 6, b.y + 30, { steps: 4 }); await c.p.mouse.move(b.x + 20, b.y + 90, { steps: 6 }); await c.p.waitForTimeout(150);
  const pendant = await c.p.evaluate(() => ({ glisse: document.body.classList.contains('glisse'), toast: (document.getElementById('toast') || {}).textContent, on: (document.getElementById('toast') || { classList: { contains: () => false } }).classList.contains('on') }));
  await c.p.mouse.up(); await L.calme(c.p, 300);
  const apres = await c.p.evaluate(id => { const i = INTS.find(x => x.id === id); return { h: i.h, t: i.tech, st: i.st, n: document.querySelectorAll('.pc[data-int="' + id + '"]').length }; }, f.id);
  console.log('   ', JSON.stringify({ pendant, apres }));
  L.v('R13 · le glissement n\'ouvre aucun fantôme', !pendant.glisse, pendant);
  L.v('R13 · il dit « Une intervention terminée ne se déplace pas »', pendant.on && /terminée ne se déplace pas/.test(pendant.toast || ''), pendant);
  L.v('R13 · rien n\'a bougé (même heure, même personne, même état, une seule carte)', apres.h === b.h0 && apres.t === b.t0 && apres.st === 'fait' && apres.n === 1, apres);
  // un simple clic (sans glisser) ne dit rien et ouvre la fiche
  await c.p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.classList.remove('on'); });
  const clic = await c.p.evaluate(id => { const r = document.querySelector('.pc[data-int="' + id + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(r.height / 2, 12) }; }, f.id);
  await c.p.mouse.click(clic.x, clic.y); await L.calme(c.p, 500);
  const o = await c.p.evaluate(() => ({ toast: (document.getElementById('toast') || { classList: { contains: () => false } }).classList.contains('on'), ouvert: !!document.querySelector('#fenetre .fen, .fen-voile, #contenu .fiche, [data-fiche]') || location.hash }));
  L.v('R13 · un simple clic ne dit pas « ne se déplace pas »', !o.toast, o);
});

parcours('R14 · restes : le focus clavier ramène à droite des noms une carte à moitié cachée', async c => {
  await vue(c, 'general');
  const res = await c.p.evaluate(async () => { const sc = document.querySelector('.pl-defile:has(.pg-g)'); if (!sc) return null; const g = sc.querySelector('.pg-tec'), cartes = [...sc.querySelectorAll('[data-int]')]; const mal = [], moitie = []; let n = 0;
    const calme = async () => { let a = -1, k = 0; for (let t = 0; t < 60 && k < 4; t++) { await new Promise(r => setTimeout(r, 60)); k = sc.scrollLeft === a ? k + 1 : 0; a = sc.scrollLeft; } };
    for (const e of cartes) { if (!e.hasAttribute('tabindex')) e.tabIndex = 0;
      // l'état qui échouait : la carte déjà à moitié visible sous la colonne, 11 px dépassant à droite
      const sx = g.getBoundingClientRect().right; let r = e.getBoundingClientRect(); sc.scrollLeft += r.left - (sx - r.width + 11); await calme(); r = e.getBoundingClientRect();
      const avant = Math.round(r.left - sx); if (avant < -20) moitie.push(e.dataset.int);
      e.focus(); await calme(); r = e.getBoundingClientRect(); n++; if (r.width > 2 && r.left < sx - 1) mal.push(e.dataset.int + ' sous la colonne ' + Math.round(r.left) + '<' + Math.round(sx)); }
    return { n, mal, moitie }; });
  L.v('R14 · la Vue d\'ensemble a un conteneur et des cartes', !!res && res.n >= 6, res); if (!res) return;
  // sur un écran large presque toute la grille tient : peu de cartes peuvent être mises à moitié sous la colonne ; au téléphone et sur iPad il y en a au moins trois
  L.v('R14 · ' + res.n + ' cartes mises à moitié sous la colonne puis focalisées (' + res.moitie.length + ' réellement à moitié cachées) : aucune ne reste sous les noms', res.mal.length === 0 && (c.largeur >= 1000 || res.moitie.length >= 3), res);
});

(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  for (const [nom, fn] of PARC) { const k = nom.split(' ')[0]; if (veut.length && !veut.includes(k)) continue; console.log('\n== ' + nom);
    try { await reouvrir(c); await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine'); await fn(c); } catch (e) { L.v(k + ' · exception pendant le parcours', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
  L.v('aucune erreur JavaScript pendant les parcours', c.err.length === 0, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
