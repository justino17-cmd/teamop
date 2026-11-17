// Campagne « planning » : les PARCOURS réels d'une personne du bureau (gérant) dans le Planning, de bout en bout.
// Usage : timeout 900 node planning-parcours.js <profil> [nuit] [P1 P2 …]    (défaut : tous)
// Chaque parcours rejoue sur une page neuve, vérifie la cohérence des données d'un écran à l'autre et recalcule les totaux.
// « N ✓ · M ✗ », code 1 si un contrôle tombe. Un contrôle qui tombe sur un défaut rapporté porte son numéro (planning-NN).
const L = require('../../lib.js'), fs = require('fs'), path = require('path');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-planning/';
const veut = args.filter(a => /^P\d+$/.test(a));
const PARC = [];
const parcours = (nom, fn) => PARC.push([nom, fn]);
const dureeLue = t => { const m = String(t).replace(/\s+/g, ' ').match(/^(?:(\d+) h)?\s*(?:(\d+))?\s*(min)?$/); if (!m) return NaN; const t2 = String(t).replace(/\s+/g, ' ').trim(); const h = (t2.match(/(\d+) h/) || [])[1], mn = (t2.match(/h (\d+)/) || t2.match(/^(\d+) min/) || [])[1]; return (h ? +h * 60 : 0) + (mn ? +mn : 0); };
const kpis = p => p.evaluate(() => { const o = {}; document.querySelectorAll('#contenu [data-kpi]').forEach(b => o[b.dataset.kpi] = b.querySelector('b').textContent.trim()); return o; });
const toast = p => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.replace(/\s+/g, ' ').trim() : ''; });
const vue = async (c, v, jour) => { await c.p.evaluate(({ v, jour }) => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = jour || AUJ; plMasques = new Set(); plJours = 6; rendre(); scrollTo(0, 0); }, { v, jour }); await L.calme(c.p, 450); };
const reouvrir = async c => { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 300); };
const centre = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.width, h: r.height, b: r.bottom, hy: r.top }; }, sel);
// glisser : souris (ordinateur) ou appui long puis glissement au doigt (CDP) ; de (x,y) à (X,Y), pas de 12 px
async function glisser(c, de, vers, opt) {
  opt = opt || {};
  if (!c.doigt) { await c.p.mouse.move(de.x, de.y); if (opt.alt) await c.p.keyboard.down('Alt'); await c.p.mouse.down(); const n = 14; for (let k = 1; k <= n; k++) { await c.p.mouse.move(de.x + (vers.x - de.x) * k / n, de.y + (vers.y - de.y) * k / n); await c.p.waitForTimeout(25); } await c.p.waitForTimeout(120); await c.p.mouse.up(); if (opt.alt) await c.p.keyboard.up('Alt'); }
  else { const cdp = await c.ctx.newCDPSession(c.p), T = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
    await T('touchStart', de.x, de.y); await c.p.waitForTimeout(opt.court ? 250 : 520); const n = 14; for (let k = 1; k <= n; k++) { await T('touchMove', de.x + (vers.x - de.x) * k / n, de.y + (vers.y - de.y) * k / n); await c.p.waitForTimeout(40); } await c.p.waitForTimeout(150); await T('touchEnd'); await cdp.detach(); }
  await L.calme(c.p, 500);
}
const jourOuvre = async p => p.evaluate(() => ajoute(AUJ, 2));   // lundi 2 novembre

parcours('P1 · créer une intervention depuis le bouton « ＋ Nouvelle intervention » (client existant, case libre, facturation au temps)', async c => {
  await vue(c, 'semaine'); const avant = { k: await kpis(c.p), n: await c.p.evaluate(() => INTS.length) };
  const durAvant = dureeLue(avant.k.temps), nbAvant = +avant.k.int;
  L.v('P1 · le bouton ouvre la fenêtre « Nouvelle intervention »', await L.toucher(c, '[data-creer]') && await L.attendre(c.p, () => !!document.querySelector('#fenetre .fen')), '');
  await L.capture(c, CAP + `P1-fenetre-${profil}.png`);
  L.v('P1 · sans client, « Créer l’intervention » est inactif et le pied dit pourquoi', await c.p.evaluate(() => { const b = document.querySelector('[data-action="cCreer"]'); return b && b.disabled && /Choisis d’abord le client/.test(document.querySelector('.fen-pied').textContent); }), '');
  const cli = await c.p.evaluate(() => { const b = document.querySelector('.fen [data-ccli]'); return b ? b.dataset.ccli : null; });
  L.v('P1 · la liste propose des clients', !!cli, '');
  await L.toucher(c, '.fen [data-ccli="' + cli + '"]'); await L.toucher(c, '.fen [data-ctype="Entretien"]'); await L.toucher(c, '.fen [data-cdur="90"]');
  const d0 = await jourOuvre(c.p);
  await c.p.evaluate(d => { document.querySelector('.fen [data-cjour="' + d + '"]')?.click(); }, d0); await L.calme(c.p, 300);
  const dispo = await c.p.evaluate(() => { const b = [...document.querySelectorAll('.fen [data-dispo]')].find(x => !x.disabled && x.dataset.dispo.startsWith('sm|')); if (!b) return null; b.scrollIntoView({ block: 'center', inline: 'center' }); return b.dataset.dispo; });
  L.v('P1 · une case « Disponible » existe pour Sophie ce jour-là', !!dispo, dispo);
  await L.toucher(c, '.fen [data-dispo="' + dispo + '"]');
  const brou = await c.p.evaluate(() => { const b = INTS.find(i => i.id === 'brouillon'); return b ? { tech: b.tech, d: b.d, h: b.h, dur: b.dur } : null; });
  L.v('P1 · la case touchée pose un brouillon chez Sophie, 90 min', brou && brou.tech === 'sm' && brou.dur === 90, brou);
  await L.capture(c, CAP + `P1-etape3-${profil}.png`);
  const recap = await c.p.evaluate(() => document.querySelector('.fen-cote').textContent.replace(/\s+/g, ' '));
  L.v('P1 · le récapitulatif dit le client, Sophie et le jour', /Sophie Martin/.test(recap) && /Entretien/.test(recap), recap.slice(0, 160));
  // facture prévue recalculée : temps 90 min => minimum + à l'heure entamée (2 h), + déplacement zone
  const fact = await c.p.evaluate(() => { const T = {}; document.querySelectorAll('.fen-cote .fac-l').forEach(l => { const s = l.querySelectorAll('span'); T[s[0].textContent.trim()] = s[1].textContent.trim(); }); return { T, tarifs: { h: TARIFS.horaire, min: TARIFS.minimum, zone: TARIFS.zone[zoneCrea()] }, fact: CREA.fact }; });
  console.log('   facture prévue lue :', JSON.stringify(fact));
  if (fact.fact === 'temps') { const m = Math.max(fact.tarifs.min, Math.ceil(90 / 60) * 60), ht = m / 60 * fact.tarifs.h + fact.tarifs.zone; const lu = L.cents(fact.T['Total HT']); L.v('P1 · « Total HT » de la facture prévue = main-d’œuvre à l’heure entamée + déplacement (au centime)', lu === Math.round(ht * 100), { lu, attendu: Math.round(ht * 100) });
    const ttc = L.cents(fact.T['Total TTC']), tva = await c.p.evaluate(() => CREA.tva ?? (cliCrea().type === 'part' ? 10 : 20)); L.v('P1 · « Total TTC » = HT × (1 + TVA) au centime', Math.abs(ttc - Math.round(lu * (1 + tva / 100))) <= 1, { ttc, lu, tva }); }
  L.v('P1 · « Créer l’intervention » devient actif', await c.p.evaluate(() => !document.querySelector('[data-action="cCreer"]').disabled), '');
  await L.toucher(c, '[data-action="cCreer"]'); await L.calme(c.p, 500);
  const apres = await c.p.evaluate(({ d0 }) => { const n = INTS.filter(i => i.id !== 'brouillon').slice(-1)[0]; return { fen: !!document.querySelector('#fenetre .fen'), n, plRef, brouillon: INTS.some(i => i.id === 'brouillon'), total: INTS.length, carte: n ? !!document.querySelector('.pc[data-int="' + n.id + '"]') : false, vue: plVue }; }, { d0 });
  L.v('P1 · la fenêtre se referme et plus aucun brouillon ne traîne', !apres.fen && !apres.brouillon, apres);
  L.v('P1 · l’intervention existe : Sophie, 90 min, « à planifier » absent → planifiée', apres.n && apres.n.tech === 'sm' && apres.n.dur === 90 && apres.n.st === 'planifiee', apres.n);
  L.v('P1 · le planning s’ouvre sur le jour de l’intervention', apres.plRef === apres.n.d, { plRef: apres.plRef, d: apres.n && apres.n.d });
  L.v('P1 · la carte est dessinée dans la grille', apres.carte, apres.vue);
  await L.capture(c, CAP + `P1-apres-${profil}.png`);
  // KPI : si le jour créé est dans la période affichée, +1 intervention et +90 min
  await vue(c, 'semaine', apres.n.d); const k2 = await kpis(c.p);
  const att = await c.p.evaluate(() => { const J = joursPeriode(), L1 = INTS.filter(i => J.includes(i.d) && i.st !== 'annulee').concat(J.flatMap(histDe)); return { n: L1.length, mn: L1.reduce((s, i) => s + i.dur, 0) }; });
  L.v('P1 · le compteur « interventions » = nombre réel de la période', +k2.int === att.n, { affiche: k2.int, reel: att.n });
  L.v('P1 · « de travail prévu » = somme réelle des durées (recalculée)', dureeLue(k2.temps) === att.mn, { affiche: k2.temps, reel: att.mn });
  // la liste Interventions et l'historique le montrent
  // la liste s'ouvre sur « Aujourd’hui » : on la met sur « Toutes » par le bouton, comme le ferait la personne
  await L.aller(c.p, 'interventions'); await L.toucher(c, '[data-filtreint="tout"]'); const dansListe = await c.p.evaluate(({ t, id }) => !!document.querySelector('#contenu [data-go="inter-x-' + id + '"]') && document.getElementById('contenu').textContent.includes(t), { t: apres.n.titre, id: apres.n.id });
  L.v('P1 · l’intervention paraît dans la liste « Interventions »', dansListe, apres.n.titre);
  await L.aller(c.p, 'historique'); const dansHisto = await c.p.evaluate(() => /a créé l’intervention/.test(document.getElementById('contenu').textContent));
  L.v('P1 · l’historique note « a créé l’intervention »', dansHisto, '');
  // annuler (toast) retire l'intervention
});

parcours('P2 · créer par double-clic sur une case libre du planning (semaine), puis annuler au milieu', async c => {
  if (c.doigt) return console.log('   (double-clic : geste de souris — au doigt, c’est l’appui long, voir P2t)');
  const d0 = await jourOuvre(c.p); await vue(c, 'semaine', d0);
  const col = await c.p.evaluate(d => { const e = document.querySelector('.pl-col[data-tech="sm"][data-d="' + d + '"]'); if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + 300, hy: r.top }; }, d0);
  L.v('P2 · la colonne de Sophie existe ce jour-là', !!col, '');
  await c.p.mouse.dblclick(col.x, col.y); await L.calme(c.p, 400);
  const o = await c.p.evaluate(() => ({ fen: !!document.querySelector('#fenetre .fen'), b: (INTS.find(i => i.id === 'brouillon') || null) }));
  L.v('P2 · le double-clic ouvre la fenêtre avec le brouillon posé chez Sophie ce jour-là', o.fen && o.b && o.b.tech === 'sm' && o.b.d === d0, o);
  const n0 = await c.p.evaluate(() => INTS.filter(i => i.id !== 'brouillon').length);
  await L.toucher(c, '[data-action="cFermer"]'); await L.calme(c.p, 300);
  const f = await c.p.evaluate(() => ({ fen: !!document.querySelector('#fenetre .fen'), br: INTS.some(i => i.id === 'brouillon'), n: INTS.length }));
  L.v('P2 · « Annuler » ferme la fenêtre, retire le brouillon, ne crée rien', !f.fen && !f.br && f.n === n0, f);
  // Échap ferme aussi la fenêtre
  await c.p.mouse.dblclick(col.x, col.y); await L.calme(c.p, 400); await c.p.keyboard.press('Escape'); await L.calme(c.p, 300);
  const e2 = await c.p.evaluate(() => !!document.querySelector('#fenetre .fen'));
  L.v('P2 · Échap ferme la fenêtre de création (planning-ÉCHAP)', !e2, e2 ? 'la fenêtre reste ouverte' : '');
});

parcours('P3 · déplacer une intervention par glisser vers un autre technicien et un autre jour, puis Annuler', async c => {
  const d0 = await jourOuvre(c.p); await vue(c, 'semaine', d0);
  const it = await c.p.evaluate(d => { const i = INTS.find(x => x.d === d && x.tech && x.st === 'planifiee'); return i ? { id: i.id, tech: i.tech, d: i.d, h: i.h, dur: i.dur } : null; }, d0);
  L.v('P3 · il y a une intervention planifiée ce jour-là à déplacer', !!it, it); if (!it) return;
  const cibleTech = it.tech === 'kb' ? 'tl' : 'kb', d1 = await c.p.evaluate(d => ajoute(d, 1), d0);
  // la cible : la colonne de l'autre technicien, le lendemain (semaine : une grille par personne → on rend la personne visible)
  const de = await centre(c.p, '.pc[data-int="' + it.id + '"] .t'); L.v('P3 · la carte est visible et touchable', !!de, de); if (!de) return;
  const cible = await c.p.evaluate(({ t, d }) => { const e = document.querySelector('.pl-col[data-tech="' + t + '"][data-d="' + d + '"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { y: r.top + 400 - 0, top: r.top, left: r.left, w: r.width }; }, { t: cibleTech, d: d1 });
  L.v('P3 · la colonne cible existe', !!cible, { cibleTech, d1 }); if (!cible) return;
  // amener la cible dans la fenêtre : on la fait défiler au centre, puis on relit les deux positions
  await c.p.evaluate(({ t, d }) => document.querySelector('.pl-col[data-tech="' + t + '"][data-d="' + d + '"]').scrollIntoView({ block: 'center', inline: 'center' }), { t: cibleTech, d: d1 });
  const A = await centre(c.p, '.pc[data-int="' + it.id + '"] .t'); const B = await c.p.evaluate(({ t, d }) => { const r = document.querySelector('.pl-col[data-tech="' + t + '"][data-d="' + d + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: Math.min(innerHeight - 140, Math.max(120, r.top + r.height / 2)) }; }, { t: cibleTech, d: d1 });
  const visible = A && A.y > 0 && A.y < c.hauteur && B.y > 0 && B.y < c.hauteur;
  console.log('   départ', JSON.stringify(A && { x: Math.round(A.x), y: Math.round(A.y) }), 'arrivée', JSON.stringify({ x: Math.round(B.x), y: Math.round(B.y) }), 'visibles ensemble', visible);
  await glisser(c, A, B);
  const ap = await c.p.evaluate(id => { const i = INTS.find(x => x.id === id); return { tech: i.tech, d: i.d, h: i.h, dur: i.dur, st: i.st }; }, it.id);
  console.log('   après :', JSON.stringify(ap), '| toast :', await toast(c.p));
  L.v('P3 · la carte a changé de personne ou de jour (' + (c.doigt ? 'appui long + glissement au doigt' : 'souris') + ')', ap.tech !== it.tech || ap.d !== it.d, { avant: it, apres: ap, visible });
  const t3 = await toast(c.p); L.v('P3 · un message dit ce qui s’est passé et propose « Annuler »', /Annuler/.test(t3) && /Intervention/.test(t3), t3);
  await L.capture(c, CAP + `P3-apres-${profil}.png`);
  if (ap.tech !== it.tech || ap.d !== it.d) { await L.toucher(c, '#toast button'); const r = await c.p.evaluate(id => { const i = INTS.find(x => x.id === id); return { tech: i.tech, d: i.d, h: i.h }; }, it.id);
    L.v('P3 · « Annuler » remet la carte exactement où elle était', r.tech === it.tech && r.d === it.d && r.h === it.h, r); }
});

parcours('P4 · changer la durée en tirant le bas d’une carte (jour), le total « de travail prévu » suit', async c => {
  await vue(c, 'jour'); const it = await c.p.evaluate(() => { const i = INTS.find(x => x.d === AUJ && x.tech && x.st !== 'fait' && x.st !== 'annulee'); return i ? { id: i.id, dur: i.dur, tech: i.tech } : null; }); L.v('P4 · une intervention modifiable aujourd’hui', !!it, it); if (!it) return;
  const k0 = await kpis(c.p); const prise = await c.p.evaluate(id => { const e = document.querySelector('.pc[data-int="' + id + '"] .tire'); if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'center' }); const r = e.getBoundingClientRect(), pph = +e.closest('.pl-col').dataset.pph; const cx = r.left + r.width / 2, cy = r.top + r.height / 2, ok = (x, y) => { const t = document.elementFromPoint(x, y); return !!t && !!t.closest && t.closest('.tire') === e; }; let h = 0, b = 0; while (h < 60 && ok(cx, cy - h - 1)) h++; while (b < 60 && ok(cx, cy + b + 1)) b++;   // la zone qui RÉPOND, pseudo-élément compris, pas le rectangle
    return { x: cx, y: cy, pph, l: r.width, h: h + b + 1, hRect: r.height }; }, it.id);
  L.v('P4 · la poignée de durée est là', !!prise, prise); if (!prise) return;
  L.v('P4 · la poignée se saisit au doigt : au moins 24 px de haut et 44 de large (planning-POIGNEE)', !c.doigt || (prise.h >= 24 && prise.l >= 44), prise);
  await glisser(c, { x: prise.x, y: prise.y }, { x: prise.x, y: prise.y + prise.pph / 2 }, { court: true });
  const ap = await c.p.evaluate(id => INTS.find(x => x.id === id).dur, it.id);
  L.v('P4 · la durée a changé de ' + it.dur + ' à ' + ap + ' min (+30 min attendus ≈ ' + (it.dur + 30) + ')', ap !== it.dur && Math.abs(ap - (it.dur + 30)) <= 10 && ap % 5 === 0, { avant: it.dur, apres: ap });
  const k1 = await kpis(c.p); L.v('P4 · « de travail prévu » suit la durée (au minute)', dureeLue(k1.temps) - dureeLue(k0.temps) === ap - it.dur, { avant: k0.temps, apres: k1.temps, delta: ap - it.dur });
  console.log('   toast :', await toast(c.p));
});

parcours('P5 · affecter une intervention « Non assigné » (menu de la carte, puis depuis la Carte des tournées)', async c => {
  await vue(c, 'jour'); const k0 = await kpis(c.p); const it = await c.p.evaluate(() => { const i = INTS.find(x => !x.tech && x.d === AUJ && x.st === 'aplanifier'); return i ? { id: i.id, titre: i.titre } : null; }); L.v('P5 · une intervention non assignée existe aujourd’hui', !!it, it); if (!it) return;
  if (!c.doigt) { const r = await centre(c.p, '.pc[data-int="' + it.id + '"] .t'); await c.p.mouse.click(r.x, r.y, { button: 'right' }); await L.calme(c.p, 300);
    const menu = await c.p.evaluate(() => [...document.querySelectorAll('.ctx button')].map(b => b.textContent.trim().replace(/\s+/g, ' '))); L.v('P5 · le clic droit ouvre le menu de la carte (fiche, carte, modifier, date, personne…)', menu.length >= 8 && menu.some(x => /Changer de personne/.test(x)) && menu.some(x => /Ouvrir la fiche/.test(x)), menu);
    await c.p.locator('.ctx button', { hasText: 'Changer de personne' }).click(); await L.calme(c.p, 250);
    const pers = await c.p.evaluate(() => [...document.querySelectorAll('.ctx button')].map(b => b.textContent.trim().replace(/\s+/g, ' '))); console.log('   menu personnes :', JSON.stringify(pers));
    await c.p.locator('.ctx button', { hasText: 'Tom' }).click(); await L.calme(c.p, 400); }
  else { await c.p.evaluate(id => crConfier(id, 'tl'), it.id); await L.calme(c.p, 300); }
  const ap = await c.p.evaluate(id => { const i = INTS.find(x => x.id === id); return { tech: i.tech, st: i.st }; }, it.id);
  L.v('P5 · l’intervention est chez Tom et passe de « à planifier » à « planifiée »', ap.tech === 'tl' && ap.st === 'planifiee', ap);
  const k1 = await kpis(c.p); L.v('P5 · le chiffre « à planifier » baisse de 1', +k1.plan === +k0.plan - 1, { avant: k0.plan, apres: k1.plan });
  L.v('P5 · le message dit « passé à Tom Leroy » avec « Annuler »', /Tom/.test(await toast(c.p)), await toast(c.p));
  // le chiffre en haut doit être le même que la liste ouverte
  await L.toucher(c, '[data-kpi="plan"]'); const lp = await c.p.evaluate(() => document.querySelectorAll('#calque .kpi-l').length); L.v('P5 · la liste « À planifier » compte autant de lignes que le chiffre', lp === +k1.plan, { lignes: lp, chiffre: k1.plan }); await L.ranger(c.p);
});

parcours('P6 · poser une intervention chez une personne absente : refus clair, rien ne bouge', async c => {
  const d = await c.p.evaluate(() => ABSENCES[0].du <= AUJ ? AUJ : ABSENCES[0].du); await vue(c, 'jour', d); const abs = await c.p.evaluate(() => ({ t: ABSENCES[0].tech, du: ABSENCES[0].du, au: ABSENCES[0].au, type: ABSENCES[0].type }));
  const it = await c.p.evaluate(() => { const i = INTS.find(x => x.d === AUJ && x.tech && x.tech !== 'lr' && x.st !== 'fait'); return { id: i.id, tech: i.tech, h: i.h }; });
  const colTxt = await c.p.evaluate(t => { const e = document.querySelector('.pl-col[data-tech="' + t + '"]'); return e ? (e.querySelector('.pl-abs') ? e.querySelector('.pl-abs').textContent.trim() : '') : null; }, abs.t);
  L.v('P6 · la colonne de l’absent le dit (« Absent · Congé »)', /Absent/.test(colTxt || '') && /Congé/.test(colTxt || ''), colTxt);
  const A = await centre(c.p, '.pc[data-int="' + it.id + '"] .t'); await c.p.evaluate(t => document.querySelector('.pl-col[data-tech="' + t + '"]').scrollIntoView({ block: 'center', inline: 'center' }), abs.t);
  const A2 = await centre(c.p, '.pc[data-int="' + it.id + '"] .t'); const B = await c.p.evaluate(t => { const r = document.querySelector('.pl-col[data-tech="' + t + '"]').getBoundingClientRect(); return { x: r.left + r.width / 2, y: Math.min(innerHeight - 140, Math.max(140, r.top + r.height / 2)) }; }, abs.t);
  await glisser(c, A2 || A, B); const ap = await c.p.evaluate(id => INTS.find(x => x.id === id).tech, it.id); const t = await toast(c.p);
  L.v('P6 · la carte reste chez son technicien', ap === it.tech, { avant: it.tech, apres: ap });
  L.v('P6 · le message explique pourquoi (« est absente ce jour-là (Congé) »)', /absent/.test(t) && /Congé/.test(t), t);
  await L.capture(c, CAP + `P6-refus-${profil}.png`);
  // le chiffre « absent » mène au planning de la personne
  await L.toucher(c, '[data-kpi="abs"]'); const pa = await c.p.evaluate(() => document.querySelector('#calque .panneau') ? document.querySelector('#calque .panneau').textContent.replace(/\s+/g, ' ').slice(0, 200) : ''); L.v('P6 · « absent » ouvre la liste des absences avec « Voir son planning »', /Voir son planning/.test(pa) && /Congé/.test(pa), pa);
  await L.toucher(c, '#calque [data-kabs]'); await L.calme(c.p, 500); const st = await c.p.evaluate(() => ({ v: plVue, mj: multiJours.slice(), masq: [...plMasques] })); L.v('P6 · « Voir son planning » ouvre « Sur mesure » sur les jours de l’absence', st.v === 'multi' && st.mj.length >= 1, st);
});

parcours('P7 · réglages des rendez-vous en ligne : ouvrir, changer, revoir', async c => {
  await vue(c, 'semaine'); await L.toucher(c, '[data-rrouvrir]'); await L.calme(c.p, 400); const o = await L.etat(c.p);
  L.v('P7 · « Rendez-vous en ligne » ouvre le panneau du même nom', /Rendez-vous en ligne/.test(o.panneau), o.panneau);
  await L.capture(c, CAP + `P7-panneau-${profil}.png`);
  const cases = await c.p.evaluate(() => [...document.querySelectorAll('#calque [data-rr]')].map(e => e.dataset.rr + ':' + (e.type === 'checkbox' ? e.checked : e.value))); console.log('   réglages :', cases.length, 'champs');
  // décocher toutes les demi-journées → l'alerte « Aucun créneau » paraît
  await c.p.evaluate(() => { document.querySelectorAll('#calque .rr-grille input[type=checkbox]').forEach(e => { if (e.checked) e.click(); }); }); await L.calme(c.p, 300);
  const al = await c.p.evaluate(() => { const a = document.getElementById('rr-alerte'); return a && getComputedStyle(a).display !== 'none' ? a.textContent.trim() : ''; }); L.v('P7 · tout décoché : l’alerte « Aucun créneau n’est ouvert » paraît', /Aucun créneau/.test(al), al);
  await c.p.evaluate(() => { document.querySelector('#calque [data-rr="j1matin"]').click(); }); await L.calme(c.p, 250);
  const al2 = await c.p.evaluate(() => { const a = document.getElementById('rr-alerte'); return a && getComputedStyle(a).display !== 'none'; }); L.v('P7 · une demi-journée cochée : l’alerte disparaît', !al2, '');
  await c.p.evaluate(() => { const s = document.querySelector('#calque [data-rr="horizon"]'); s.value = '21'; s.dispatchEvent(new Event('change', { bubbles: true })); }); await L.calme(c.p, 250);
  await L.ranger(c.p); await L.toucher(c, '[data-rrouvrir]'); await L.calme(c.p, 300);
  const rel = await c.p.evaluate(() => ({ h: document.querySelector('#calque [data-rr="horizon"]').value, lun: document.querySelector('#calque [data-rr="j1matin"]').checked, mar: document.querySelector('#calque [data-rr="j2matin"]').checked }));
  L.v('P7 · en rouvrant, les réglages choisis sont là (horizon 21 j, lundi matin seul)', rel.h === '21' && rel.lun && !rel.mar, rel);
  const txt = await c.p.evaluate(() => document.querySelector('#calque .panneau').textContent.replace(/\s+/g, ' '));
  L.v('P7 · le texte d’aide ne renvoie pas vers un menu qui n’existe plus (« Ce que voit le client ») (planning-02)', !/Ce que voit le client/.test(txt), (txt.match(/Pour les voir[^.]*\./) || [''])[0]);
  const fermeX = await c.p.evaluate(() => !!document.querySelector('#calque .panneau .x, #calque [data-fermer], #calque .fermer'));
  await c.p.keyboard.press('Escape'); await L.calme(c.p, 250); L.v('P7 · Échap ferme le panneau', !(await L.etat(c.p)).panneau, '');
});

parcours('P8 · naviguer : jour précédent/suivant, mois, « Aujourd’hui », retour du navigateur', async c => {
  await vue(c, 'jour'); const lib0 = await c.p.evaluate(() => document.querySelector('.pl-nav b').textContent);
  await L.toucher(c, '[data-plnav="1"]'); const lib1 = await c.p.evaluate(() => document.querySelector('.pl-nav b').textContent);
  L.v('P8 · « Suivant » passe au jour d’après (dimanche 1er novembre)', /dimanche 1/.test(lib1), lib1);
  L.v('P8 · « Aujourd’hui » ramène au jour courant', await L.toucher(c, '[data-plnav="0"]') && /Aujourd’hui/.test(await c.p.evaluate(() => document.querySelector('.pl-nav b').textContent)), '');
  await vue(c, 'mois'); await L.toucher(c, '[data-plnav="1"]'); const m1 = await c.p.evaluate(() => document.querySelector('.pl-nav b').textContent); L.v('P8 · mois suivant = novembre 2026', /novembre 2026/.test(m1), m1);
  const nb = await c.p.evaluate(() => document.querySelectorAll('.pl-mj').length); L.v('P8 · la grille du mois a un nombre de jours multiple de 7', nb % 7 === 0 && nb >= 28, nb);
  const hors = await c.p.evaluate(() => { const ints = INTS.filter(i => i.d.startsWith('2026-11') && i.st !== 'annulee').length; return { ints, cartes: document.querySelectorAll('.pl-mj:not(.hors) .pc[data-int]').length }; }); console.log('   novembre :', JSON.stringify(hors));
  // toucher un jour du mois ouvre ce jour
  await c.p.evaluate(() => document.querySelector('.pl-mj:not(.hors) .pl-mp, .pl-mj:not(.hors) .n').click()); await L.calme(c.p, 400); const aprs = await c.p.evaluate(() => ({ v: plVue, d: plRef })); console.log('   toucher un jour du mois →', JSON.stringify(aprs));
});

(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  for (const [nom, fn] of PARC) { const k = nom.slice(0, 2); if (veut.length && !veut.includes(k)) continue; console.log('\n== ' + nom);
    try { await reouvrir(c); await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine'); await fn(c); } catch (e) { L.v(nom.slice(0, 2) + ' · exception pendant le parcours', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
  L.v('aucune erreur JavaScript pendant les parcours', c.err.length === 0, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
