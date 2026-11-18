// Recontrôle ADVERSE du tour 2 des restes « Tâches · Absences · Menu » (17 novembre 2026). Le correcteur a fermé cinq défauts (« Modifier les dates »
// et « Proposer d'autres dates » refusent un week-end seul / une demande en attente, « Au » suit « Du » dans les trois formulaires du gérant, un
// touchcancel ne fait plus avaler le toucher suivant). Ici on cherche ce que ces règles ont cassé À CÔTÉ — là où la même fonction (aAppliquer)
// ou la même règle sert un AUTRE geste que celui que la première sonde jouait :
//   · le GLISSER à la souris sur la frise (la sonde d'origine appelait aAppliquer à la main, jamais par un vrai glisser) : lâcher sur un week-end,
//     sur les jours d'une demande en attente, sur des jours libres (le geste normal doit marcher et s'annuler) ;
//   · « Déplacer » puis toucher un jour (mode téléphone, aDepl) vers les mêmes cibles ;
//   · « Au suit Du » par le VRAI sélecteur de date (clic sur le bouton, clic sur un jour : « input » puis « change »), pas par un événement posé à la main ;
//   · les gestes qui doivent TOUJOURS marcher : changer seulement le « demi », le refus d'une date de fin avant le début, un jour férié seul, un
//     vendredi-lundi ;
//   · l'état du bouton « Enregistrer » à chaque étape ; un technicien (rôle) ne voit aucune de ces portes ;
//   · le touchcancel : un appui long ordinaire (sans annulation) avale toujours SON clic de relâcher.
// Chaque contrôle dit l'attendu ; un ✗ est un défaut RÉEL. usage : node restes-taches-absences-2-recontrole.js — « N ✓ · M ✗ », sort en 1.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
// ajoute n jours à une date ISO (la page a `ajoute`, la sonde en a besoin hors page)
const plus = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); const z = x => String(x).padStart(2, '0'); return x.getFullYear() + '-' + z(x.getMonth() + 1) + '-' + z(x.getDate()); };
(async () => {
  const c = await L.ouvrir({ profil:'mac', nuit:false, qui:'marc', hash:'absences' }); const p = c.p; await L.calme(p, 800);
  const err = []; p.on('pageerror', e => err.push(e.message));
  const set = (id, x) => p.evaluate(([id, x]) => { const e = document.getElementById(id); e.value = x; ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles:true }))); }, [id, x]);
  const ferme = () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerMenu(); } catch (e) {} const t = document.getElementById('toast'); if (t) { t.classList.remove('on'); t.innerHTML = ''; } const d = document.getElementById('dtpop'); if (d) d.remove(); });
  const toast = () => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.innerText.replace(/\s+/g, ' ').trim() : ''; });
  // ── population : un samedi à venir et une personne libre autour
  const pop = await p.evaluate(() => {
    const dow = d => new Date(d + 'T12:00:00').getDay(); let sa = null; for (let n = 2; n < 14; n++) if (dow(jour(n)) === 6) { sa = jour(n); break; }
    const ds = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 9, 10, 11].map(k => ajoute(sa, k)), techs = TECHS.filter(t => t.id).map(t => t.id);
    const libre = t => !ABSENCES.some(a => a.tech === t && ds.some(d => a.du <= d && d <= a.au)) && !DEMANDES_ABS.some(a => a.tech === t && ds.some(d => a.du <= d && d <= a.au));
    return { auj:AUJ, sa, nAbs:ABSENCES.length, nDem:DEMANDES_ABS.length, libres:techs.filter(libre) }; });
  v('population : un samedi à venir, des absences, des demandes et au moins une personne libre autour', !!pop.sa && pop.nAbs > 0 && pop.nDem > 0 && pop.libres.length > 0, pop);
  const T = pop.libres[0], ve = plus(pop.sa, -1), lu = plus(pop.sa, 2), mar = plus(pop.sa, 3);
  const ID = 'zz-sonde-1';
  const lire = id => p.evaluate(id => { const a = ABSENCES.find(x => x.id === id); return a ? { du:a.du, au:a.au, demi:a.demi || null, glisse:document.body.classList.contains('ac-glisse'), flot:!!document.querySelector('.ac-flot'), depl:aDepl } : null; }, id);

  // ── 1. le GLISSER à la souris : une absence d'UN jour (créée pour la sonde, vendredi) lâchée sur le samedi qui suit
  await p.evaluate(([T, ve, id]) => { const m = ABSENCES.find(x => x.type); ABSENCES.push({ ...m, id, tech:T, du:ve, au:ve, demi:null, type:'Congé payé', motif:'sonde glisser', statut:'validee' }); aOnglet = 'calendrier'; aCalPer = 0.5; aCalSem = aLundi(ve); aCalQui = 'tous'; rendre(); }, [T, ve, ID]); await L.calme(p, 500);
  const vis = await p.evaluate(id => { const b = document.querySelector('.ac-x[data-abs="a|' + id + '"]'); if (!b) return { barre:false };
    const a = ABSENCES.find(x => x.id === id), cs = [...document.querySelectorAll('[data-acd]')].filter(e => e.dataset.act === a.tech);
    return { barre:true, cellules:cs.length, weekends:cs.filter(e => [0, 6].includes(new Date(e.dataset.acd + 'T12:00:00').getDay())).length }; }, ID);
  v('population : la barre de l\'absence de la sonde est dessinée dans la frise, avec des cases de jours', vis.barre && vis.cellules > 10, vis);
  const glisser = async (id, versDate) => {   // vrai glisser à la souris : la barre → la case du jour visé (sur sa ligne)
    const pos = () => p.evaluate(([id, d]) => { const b = document.querySelector('.ac-x[data-abs="a|' + id + '"]'), a = ABSENCES.find(x => x.id === id); if (!b) return null;
      const cell = [...document.querySelectorAll('[data-acd]')].find(e => e.dataset.acd === d && e.dataset.act === a.tech); if (!cell) return { cell:false };
      b.scrollIntoView({ block:'center', inline:'center' }); const r = b.getBoundingClientRect(), q = cell.getBoundingClientRect();
      return { cell:true, x:r.left + r.width / 2, y:r.top + r.height / 2, cx:q.left + q.width / 2, cy:q.top + q.height / 2, vu:q.left > 0 && q.right < innerWidth }; }, [id, versDate]);
    let g = await pos(); if (!g || !g.cell) return { ok:false, g }; await L.calme(p, 150); g = await pos();
    await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.mouse.move(g.x + 12, g.y + 2, { steps:4 });
    const g2 = await pos(); await p.mouse.move(g2.cx, g2.cy, { steps:14 }); await p.waitForTimeout(160);
    const pendant = await p.evaluate(() => ({ glisse:document.body.classList.contains('ac-glisse'), flot:((document.querySelector('.ac-flot') || {}).innerText || '').replace(/\s+/g, ' '), non:document.querySelectorAll('.ac-cible-non').length, cibles:document.querySelectorAll('.ac-cible').length }));
    await p.mouse.up(); await L.calme(p, 450); return { ok:true, vu:g2.vu, pendant }; };
  if (vis.barre) {
    const g1 = await glisser(ID, pop.sa); const e1 = await lire(ID), t1 = await toast();
    v('glisser (souris) : un jour lâché sur un SAMEDI est refusé — rien ne bouge, message « pas travaillés »', g1.ok && e1.du === ve && /pas travaill/.test(t1), { g1, e1, t1 });
    v('glisser : rien ne reste « en cours » après le refus (classe de glisser, étiquette flottante, mode déplacer)', !e1.glisse && !e1.flot && !e1.depl, e1);
    console.log('  · constat : l\'étiquette flottante AVANT de lâcher sur un samedi dit « ' + (g1.pendant && g1.pendant.flot) + ' »');
    v('glisser PENDANT, au-dessus d\'un samedi : la case est rouge (ac-cible-non) et l\'étiquette dit « rien ne bougera » (le refus se dit avant le lâcher)', g1.pendant && g1.pendant.non > 0 && /rien ne bougera/.test(g1.pendant.flot), g1.pendant);
    await ferme();
    await p.evaluate(([T, d]) => { DEMANDES_ABS.push({ ...DEMANDES_ABS[0], id:'zz-dem-1', tech:T, du:d, au:d, demi:null, etat:'attente', fil:[] }); rendre(); }, [T, mar]); await L.calme(p, 400);
    const g2 = await glisser(ID, mar); const e2 = await lire(ID), t2 = await toast();
    v('glisser : lâché sur les jours d\'une demande en attente de la même personne → refusé, rien ne bouge, message « accorde-la ou refuse-la d\'abord »', g2.ok && e2.du === ve && /accorde-la|refuse-la/.test(t2), { g2, e2, t2 });
    v('glisser : rien ne reste en cours après ce refus non plus', !e2.glisse && !e2.flot && !e2.depl, e2);
    console.log('  · constat : l\'étiquette flottante AVANT de lâcher sur une demande en attente dit « ' + (g2.pendant && g2.pendant.flot) + ' »');
    v('glisser PENDANT, au-dessus d\'une demande en attente : case rouge et phrase « rien ne bougera »', g2.pendant && g2.pendant.non > 0 && /rien ne bougera/.test(g2.pendant.flot), g2.pendant);
    await ferme(); await p.evaluate(() => { DEMANDES_ABS = DEMANDES_ABS.filter(x => x.id !== 'zz-dem-1'); rendre(); }); await L.calme(p, 300);
    // le geste NORMAL doit marcher : le même jour déplacé vers un jour ouvré libre, puis annulé
    const g3 = await glisser(ID, mar); const e3 = await lire(ID), t3 = await toast();
    v('glisser PENDANT, au-dessus d\'un jour ouvré libre : aucune case rouge, aucune phrase de refus (le geste normal ne se plaint pas)', g3.pendant && g3.pendant.cibles > 0 && g3.pendant.non === 0 && !/rien ne bougera|déjà/.test(g3.pendant.flot), g3.pendant);
    v('glisser : un jour lâché sur un jour ouvré LIBRE se déplace (le geste normal marche toujours)', g3.ok && e3.du === mar && e3.au === mar, { g3, e3, t3 });
    v('glisser : le message du déplacement dit « déplacée » et propose « Annuler »', /déplacée/.test(t3) && /Annuler/.test(t3), t3);
    await p.evaluate(() => { const b = [...document.querySelectorAll('#toast button')].find(x => /Annuler/.test(x.textContent)); if (b) b.click(); }); await L.calme(p, 300);
    const e4 = await lire(ID);
    v('glisser : « Annuler » rend l\'absence à son vendredi', e4.du === ve && e4.au === ve, e4);
    await ferme();
    // « Déplacer » puis toucher un jour (le mode du téléphone) vers un samedi
    await p.evaluate(id => { aDepl = { k:'a', id }; aRendreGarde(); }, ID); await L.calme(p, 350);
    const sam = await p.evaluate(([T, d]) => { const c = [...document.querySelectorAll('[data-acd]')].find(e => e.dataset.acd === d && e.dataset.act === T); if (!c) return false; c.scrollIntoView({ block:'center', inline:'center' }); const r = c.getBoundingClientRect(); return { x:r.left + r.width / 2, y:r.top + r.height / 2 }; }, [T, pop.sa]);
    v('population : la case du samedi existe dans la frise (mode « Déplacer »)', !!sam, sam);
    if (sam) { await p.mouse.click(sam.x, sam.y); await L.calme(p, 350);
      const e5 = await lire(ID), t5 = await toast();
      v('« Déplacer » puis toucher un SAMEDI : refusé (rien ne bouge, message), et on sort du mode déplacer', e5.du === ve && /pas travaill/.test(t5) && !e5.depl, { e5, t5 }); }
    await ferme();
  }

  // ── 2. « Au suit Du » par le VRAI sélecteur de date (bouton, puis un jour) dans les trois formulaires du gérant
  const choisir = async (id, iso) => {
    await p.evaluate(id => document.getElementById(id).nextElementSibling.scrollIntoView({ block:'center' }), id);
    await p.click('#' + id + ' + .dt-btn'); await p.waitForTimeout(150);
    for (let k = 0; k < 14; k++) { const ok = await p.evaluate(iso => !!document.querySelector('#dtpop .dt-grille [data-dtj="' + iso + '"]:not([disabled])'), iso); if (ok) break;
      const sens = await p.evaluate(iso => { const f = document.querySelector('#dtpop .dt-grille [data-dtj]'); return f && f.dataset.dtj.slice(0, 7) > iso.slice(0, 7) ? -1 : 1; }, iso);
      await p.click('#dtpop [data-dtm="' + sens + '"]'); await p.waitForTimeout(80); }
    await p.click('#dtpop .dt-grille [data-dtj="' + iso + '"]'); await p.waitForTimeout(200); };
  const champs = pre => p.evaluate(pre => ({ du:document.getElementById(pre + '-du').value, au:document.getElementById(pre + '-au').value, lib:document.getElementById(pre + '-au').nextElementSibling.innerText.replace(/\s+/g, ' ').trim(), ap:(document.getElementById(pre + '-apercu') || {}).innerText || '' }), pre);
  const loin = plus(lu, 42);   // un lundi loin : après la fin par défaut de chaque formulaire
  for (const [pre, ouvrir] of [['an', () => p.evaluate(() => aPanneauNouveau())], ['ax', () => p.evaluate(() => aPanneauDates(ABSENCES.find(x => x.id !== 'zz-sonde-1' && x.statut === 'validee')))], ['am', () => p.evaluate(() => aPanneauModif(DEMANDES_ABS.find(x => x.etat === 'attente')))]]) {
    await ouvrir(); await L.calme(p, 350);
    await choisir(pre + '-du', loin); const r = await champs(pre);
    v(`sélecteur réel (${pre}-) : choisir « Du » après la fin → « Au » suit (valeur ET bouton repeint) — Du ${loin}`, r.au === loin && /\d/.test(r.lib) && !/avant la date de début/.test(r.ap), r);
    const fin = plus(loin, 2), debut2 = plus(loin, 4); await choisir(pre + '-au', fin); await choisir(pre + '-du', debut2);
    const r2 = await champs(pre);
    v(`sélecteur réel (${pre}-) : « Au » choisi à la main (${fin}) n'est plus déplacé par un nouveau « Du » plus tard (${debut2}) — la date de fin avant le début se DIT`, r2.au === fin && r2.du === debut2 && /avant la date de d/.test(r2.ap), r2);
    const bt = await p.evaluate(pre => { const b = document.querySelector(pre === 'an' ? '[data-anouvok]' : pre === 'ax' ? '[data-axok]' : '[data-amodifok]'); return b ? b.disabled : null; }, pre);
    v(`(${pre}-) date de fin avant le début, état d'AVANT valide : le bouton d'enregistrement est grisé comme pour un week-end (sinon le message dit « non » et le bouton dit « oui »)`, bt === true, { bouton:bt, ap:r2.ap });
    await ferme(); }

  // ── 3. les gestes qui doivent toujours marcher, et l'état du bouton « Enregistrer » (formulaire « Modifier les dates » sur l'absence de la sonde)
  await p.evaluate(id => aPanneauDates(ABSENCES.find(x => x.id === id)), ID); await L.calme(p, 300);
  const etat = () => p.evaluate(() => ({ ap:document.getElementById('ax-apercu').innerText.replace(/\s+/g, ' ').trim(), dis:document.querySelector('[data-axok]').disabled }));
  await set('ax-du', pop.sa); await set('ax-au', pop.sa); const s1 = await etat();
  v('Modifier les dates : un samedi seul → message et bouton grisé', /pas travaill/.test(s1.ap) && s1.dis, s1);
  await set('ax-du', ve); await set('ax-au', lu); const s2 = await etat();
  v('Modifier les dates : vendredi → lundi (week-end au milieu) : accepté, bouton ACTIF, 2 jours ouvrés dits', !s2.dis && /2 jours ouvr/.test(s2.ap), s2);
  await set('ax-au', plus(ve, -2)); const s3 = await etat();
  v('Modifier les dates : date de fin avant le début → message ET bouton grisé (pas seulement un toast au clic)', /avant la date de d/.test(s3.ap) && s3.dis, s3);
  await set('ax-au', ve); await set('ax-du', ve); await p.evaluate(() => { const s = document.getElementById('ax-demi'); s.value = 'matin'; s.dispatchEvent(new Event('change', { bubbles:true })); }); const s4 = await etat();
  v('Modifier les dates : un seul jour, « matin seulement » → accepté, une demi-journée dite, bouton ACTIF', !s4.dis && /demi-journ/.test(s4.ap), s4);
  await p.evaluate(() => document.querySelector('[data-axok]').click()); await L.calme(p, 400);
  const e6 = await lire(ID);
  v('Modifier les dates : « Enregistrer » le demi-jour pose bien « matin » (seul le demi change, les jours restent)', e6 && e6.demi === 'matin' && e6.du === ve && e6.au === ve, e6);
  await ferme();
  // un jour férié seul
  const fer = await p.evaluate(() => Object.keys(A_FERIES).sort().find(x => x > AUJ && ![0, 6].includes(new Date(x + 'T12:00:00').getDay())) || null);
  if (fer) { await p.evaluate(id => aPanneauDates(ABSENCES.find(x => x.id === id)), ID); await L.calme(p, 300); await set('ax-du', fer); await set('ax-au', fer); const f1 = await etat();
    v(`Modifier les dates : un jour férié seul (${fer}) → « pas travaillés » et bouton grisé`, /pas travaill/.test(f1.ap) && f1.dis, f1); await ferme(); }
  else console.log('  · pas de jour férié ouvré à venir dans les données : contrôle non joué');
  v('aucune erreur JavaScript pendant les gestes du gérant', err.length === 0, err);
  await L.fin(c);

  // ── 4. le rôle : un technicien n'a aucune de ces portes (ni bouton, ni glisser)
  const t = await L.ouvrir({ profil:'mac', nuit:false, qui:'sm', hash:'absences' }); const q = t.p; await L.calme(q, 800);
  const R = await q.evaluate(() => ({ portes:['[data-anouv]', '[data-amodif]', '[data-aok]', '[data-axok]', '[data-asuppr]'].map(s => document.querySelectorAll(s).length), barres:document.querySelectorAll('.ac-x[data-abs]').length, lecture:aLecture() }));
  v('technicien : la vue Absences est en lecture et aucun bouton de gestion (nouvelle absence, valider, modifier les dates, supprimer) n\'est dessiné', R.lecture && R.portes.every(n => n === 0), R);
  const G = await q.evaluate(() => { const b = document.querySelector('.ac-x[data-abs]'); if (!b) return { barre:false }; b.scrollIntoView({ block:'center', inline:'center' }); const r = b.getBoundingClientRect(), id = b.dataset.abs.split('|')[1]; return { barre:true, id, x:r.left + r.width / 2, y:r.top + r.height / 2, du:(ABSENCES.find(a => a.id === id) || {}).du }; });
  if (G.barre) { await q.mouse.move(G.x, G.y); await q.mouse.down(); await q.mouse.move(G.x + 60, G.y, { steps:8 }); const pend = await q.evaluate(() => document.body.classList.contains('ac-glisse')); await q.mouse.up(); await L.calme(q, 300);
    const apres = await q.evaluate(id => (ABSENCES.find(a => a.id === id) || {}).du, G.id);
    v('technicien : un glisser à la souris sur une barre ne déplace rien', !pend && apres === G.du, { pend, apres, avant:G.du }); }
  else console.log('  · constat : le technicien ne voit aucune barre glissable dans sa vue (rien à glisser) — ' + JSON.stringify(R));
  await L.fin(t);

  // ── 5. touchcancel : un appui long ORDINAIRE (jusqu'au touchend) avale encore SON clic de relâcher, et seulement lui
  const g = await L.ouvrir({ profil:'iphone', nuit:false, qui:'marc', hash:'taches' }); const h = g.p; await L.calme(h, 800);
  const G2 = await h.evaluate(async () => {
    const dorm = ms => new Promise(r => setTimeout(r, ms)), bar = document.querySelector('.opg-barre'); if (!bar) return { err:'pas de barre' };
    const cible = bar.querySelector('button, a'); const r = cible.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const T = el => new Touch({ identifier:9, target:el, clientX:x, clientY:y });
    cible.dispatchEvent(new TouchEvent('touchstart', { bubbles:true, cancelable:true, touches:[T(cible)], targetTouches:[T(cible)], changedTouches:[T(cible)] }));
    await dorm(700); const ouverte = !!document.querySelector('#calque .panneau');
    let recu = 0; cible.addEventListener('click', ev => { recu++; ev.preventDefault(); ev.stopPropagation(); });
    document.dispatchEvent(new TouchEvent('touchend', { bubbles:true, changedTouches:[T(cible)] }));   // le relâcher de l'appui long
    cible.click(); await dorm(100);   // le clic du relâcher, juste derrière : il doit être AVALÉ
    const avale = recu === 0; await dorm(900);
    cible.click(); await dorm(60);    // un vrai toucher d'après : il doit arriver
    return { ouverte, avale, recuApres:recu }; });
  v('population : l\'appui long a ouvert « Ma barre »', G2.ouverte === true, G2);
  v('appui long ordinaire : le clic du relâcher est avalé (rien n\'arrive à la cible), le toucher d\'après arrive', G2.avale === true && G2.recuApres === 1, G2);
  const G3 = await h.evaluate(async () => {
    const dorm = ms => new Promise(r => setTimeout(r, ms)); try { fermerPanneau(); } catch (e) {}
    const bar = document.querySelector('.opg-barre'), cible = bar.querySelector('button, a'), r = cible.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    const T = el => new Touch({ identifier:11, target:el, clientX:x, clientY:y });
    cible.dispatchEvent(new TouchEvent('touchstart', { bubbles:true, cancelable:true, touches:[T(cible)], targetTouches:[T(cible)], changedTouches:[T(cible)] }));
    await dorm(200); document.dispatchEvent(new TouchEvent('touchcancel', { bubbles:true, changedTouches:[T(cible)] })); await dorm(700);
    const ouverte = !!document.querySelector('#calque .panneau'); let recu = 0; cible.addEventListener('click', ev => { recu++; ev.preventDefault(); ev.stopPropagation(); }); cible.click(); await dorm(60);
    return { ouverte, recu }; });
  v('touchcancel avant les 550 ms : l\'appui long ne s\'ouvre pas, le toucher d\'après arrive', G3.ouverte === false && G3.recu === 1, G3);
  await L.fin(g);
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
