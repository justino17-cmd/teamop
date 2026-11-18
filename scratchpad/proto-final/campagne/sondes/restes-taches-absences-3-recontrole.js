// Recontrôle ADVERSE du tour 3 des restes « Tâches · Absences » (18 novembre 2026), commit f169467c. Le correcteur a fait deux choses :
//   (1) « La date de fin est avant la date de début » grise désormais le bouton des trois formulaires du gérant (Nouvelle absence, Modifier les dates,
//       Proposer d'autres dates) — le formulaire de demande du technicien le faisait déjà ;
//   (2) le glisser dit le refus PENDANT le geste (case rouge + « rien ne bougera ») au lieu du seul lâcher.
// Ici on REJOUE au geste (vrai clic, vraie souris, vraie fonction appelée) et on cherche ce que ça a pu casser : bouton qui reste grisé quand les dates
// redeviennent bonnes, enregistrement d'un congé valide, glisser normal en semaine, glisser d'une demande (ouvre une proposition), case sans refus
// qui annonce quand même, autres rôles, téléphone, nuit. Les refus par la FONCTION qui enregistre sont joués en appel direct, geste séparé.
// usage : node restes-taches-absences-3-recontrole.js [capturesDir] — « N ✓ · M ✗ », sort en 1.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
const path = require('path'), CAP = process.argv[2] || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes3-recontrole';
const plus = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); const z = x => String(x).padStart(2, '0'); return x.getFullYear() + '-' + z(x.getMonth() + 1) + '-' + z(x.getDate()); };
(async () => {
  const c = await L.ouvrir({ profil:'mac', nuit:false, qui:'marc', hash:'absences' }); const p = c.p; await L.calme(p, 800);
  const err = []; p.on('pageerror', e => err.push(e.message));
  const set = (id, x) => p.evaluate(([id, x]) => { const e = document.getElementById(id); e.value = x; ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles:true }))); }, [id, x]);
  const ferme = () => p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerMenu(); } catch (e) {} const t = document.getElementById('toast'); if (t) { t.classList.remove('on'); t.innerHTML = ''; } const d = document.getElementById('dtpop'); if (d) d.remove(); });
  const toast = () => p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const vide = () => p.evaluate(() => { const t = document.getElementById('toast'); if (t) { t.classList.remove('on'); } });
  const pop = await p.evaluate(() => {
    const dow = d => new Date(d + 'T12:00:00').getDay(); let sa = null; for (let n = 2; n < 14; n++) if (dow(jour(n)) === 6) { sa = jour(n); break; }
    const ds = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 9, 10, 11, 12, 13].map(k => ajoute(sa, k)), techs = TECHS.filter(t => t.id).map(t => t.id);
    const libre = t => !ABSENCES.some(a => a.tech === t && ds.some(d => a.du <= d && d <= a.au)) && !DEMANDES_ABS.some(a => a.tech === t && ds.some(d => a.du <= d && d <= a.au));
    return { auj:AUJ, sa, nAbs:ABSENCES.length, nDem:DEMANDES_ABS.length, libres:techs.filter(libre) }; });
  v('population : un samedi à venir, des absences, des demandes, au moins une personne libre autour', !!pop.sa && pop.nAbs > 0 && pop.nDem > 0 && pop.libres.length > 0, pop);
  const T = pop.libres[0], ve = plus(pop.sa, -1), lu = plus(pop.sa, 2), mar = plus(pop.sa, 3), mer = plus(pop.sa, 4);
  const nbAbs = () => p.evaluate(() => ABSENCES.length);

  // ── 1. NOUVELLE ABSENCE par le vrai clic : fin avant début → bouton grisé ; dates redevenues bonnes → bouton ACTIF ; clic → enregistré
  await p.evaluate(T => { aOnglet = 'calendrier'; aCalQui = T; rendre(); }, T); await L.calme(p, 400);
  const sel = '[data-anouv]'; const vis = await p.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null).length, sel);
  v('population : un bouton « Nouvelle absence » est visible dans la vue', vis > 0, vis);
  await p.locator(sel).first().click(); await L.calme(p, 400);
  const nouv = () => p.evaluate(() => { const b = document.querySelector('[data-anouvok]'); return b ? { dis:b.disabled, ap:document.getElementById('an-apercu').innerText.replace(/\s+/g, ' ').trim() } : null; });
  await p.evaluate(T => { const s = document.getElementById('an-t'); s.value = T; s.dispatchEvent(new Event('change', { bubbles:true })); }, T);
  await set('an-du', mar); await set('an-au', mer); let s = await nouv();
  v('Nouvelle absence : dates bonnes (mardi → mercredi) → bouton ACTIF', s && !s.dis, s);
  await set('an-au', plus(mar, -2)); s = await nouv();
  v('Nouvelle absence : fin avant début → message dit ET bouton GRISÉ (au vrai clic)', s && s.dis && /avant la date de d/.test(s.ap), s);
  const n0 = await nbAbs(); await p.locator('[data-anouvok]').click({ force:true, timeout:1500 }).catch(() => {}); await L.calme(p, 300);
  v('Nouvelle absence : cliquer le bouton grisé n\'enregistre rien', (await nbAbs()) === n0, { avant:n0 });
  await set('an-au', mer); s = await nouv();
  v('Nouvelle absence : les dates redeviennent bonnes → le bouton se RÉACTIVE (sinon le gérant est bloqué)', s && !s.dis && !/avant la date de d/.test(s.ap), s);
  await set('an-au', plus(mar, -1)); await set('an-du', plus(mar, -3)); s = await nouv();
  v('Nouvelle absence : on corrige en bougeant « Du » (au ≥ du de nouveau) → bouton ACTIF', s && !s.dis, s);
  await set('an-du', mar); await set('an-au', mer);
  await p.locator('[data-anouvok]').click(); await L.calme(p, 500);
  const ap = await p.evaluate(([T, mar]) => ABSENCES.some(a => a.tech === T && a.du === mar), [T, mar]);
  v('Nouvelle absence : un congé valide, après l\'aller-retour par « fin avant début », s\'ENREGISTRE vraiment', ap && (await nbAbs()) === n0 + 1, { n0, apres:await nbAbs() });
  await ferme();
  // geste séparé : la fonction qui enregistre (le gestionnaire de clic) refuse de toute façon une fin avant début, même bouton activé à la main
  await p.evaluate(T => aPanneauNouveau(T), T); await L.calme(p, 300);
  await set('an-du', plus(pop.sa, 9)); await set('an-au', plus(pop.sa, 7));
  const n1 = await nbAbs(); await vide();
  await p.evaluate(() => { const b = document.querySelector('[data-anouvok]'); b.disabled = false; b.click(); }); await L.calme(p, 300);
  const t1 = await toast();
  v('Nouvelle absence, geste séparé : bouton réactivé de force + clic → la fonction refuse (message « avant la date de début », rien d\'enregistré)', /avant la date de d/.test(t1) && (await nbAbs()) === n1, { t1 });
  await ferme();

  // ── 2. MODIFIER LES DATES par le vrai chemin (clic sur la barre → menu → « Modifier les dates… »)
  const ID = 'zz-sonde-3';
  await p.evaluate(([T, ve, id]) => { const m = ABSENCES.find(x => x.type); ABSENCES.push({ ...m, id, tech:T, du:ve, au:ve, demi:null, type:'Congé payé', motif:'sonde 3', statut:'validee' }); aOnglet = 'calendrier'; aCalPer = 0.5; aCalSem = aLundi(ve); aCalQui = 'tous'; rendre(); }, [T, ve, ID]); await L.calme(p, 500);
  const lire = id => p.evaluate(id => { const a = ABSENCES.find(x => x.id === id); return a ? { du:a.du, au:a.au, demi:a.demi || null, glisse:document.body.classList.contains('ac-glisse'), flot:!!document.querySelector('.ac-flot'), depl:aDepl } : null; }, id);
  await p.evaluate(id => document.querySelector('.ac-x[data-abs="a|' + id + '"]').scrollIntoView({ block:'center', inline:'center' }), ID); await L.calme(p, 200);
  await p.locator('.ac-x[data-abs="a|' + ID + '"]').click({ button:'right' }); await L.calme(p, 350);
  const item = await p.evaluate(() => { const e = [...document.querySelectorAll('button, [role=menuitem], .menu-i, li')].find(x => /Modifier les dates/.test(x.textContent) && x.offsetParent !== null); if (!e) return null; const r = e.getBoundingClientRect(); return { x:r.left + r.width / 2, y:r.top + r.height / 2 }; });
  v('Modifier les dates : le clic DROIT sur la barre propose « Modifier les dates… » (chemin réel)', !!item, item);
  if (item) { await p.mouse.click(item.x, item.y); await L.calme(p, 350); }
  const mod = () => p.evaluate(() => { const b = document.querySelector('[data-axok]'); return b ? { dis:b.disabled, ap:document.getElementById('ax-apercu').innerText.replace(/\s+/g, ' ').trim() } : null; });
  s = await mod(); v('Modifier les dates : panneau ouvert, bouton ACTIF au départ', s && !s.dis, s);
  await set('ax-au', plus(ve, -3)); s = await mod();
  v('Modifier les dates : fin avant début → message ET bouton grisé', s && s.dis && /avant la date de d/.test(s.ap), s);
  const e0 = await lire(ID); await vide();
  await p.locator('[data-axok]').click({ force:true, timeout:1500 }).catch(() => {}); await L.calme(p, 250);
  v('Modifier les dates : le clic sur le bouton grisé ne change rien', JSON.stringify(await lire(ID)) === JSON.stringify(e0), e0);
  await set('ax-au', ve); s = await mod();
  v('Modifier les dates : dates redevenues bonnes → bouton RÉACTIVÉ', s && !s.dis && !/avant la date de d/.test(s.ap), s);
  await set('ax-du', ve); await set('ax-au', lu);
  await p.locator('[data-axok]').click(); await L.calme(p, 450); const e1 = await lire(ID);
  v('Modifier les dates : vendredi → lundi enregistré après l\'aller-retour (le congé valide passe)', e1.du === ve && e1.au === lu, e1);
  await ferme();
  // fonction qui enregistre, geste séparé : aAppliquer avec une fin avant le début
  await vide(); const r1 = await p.evaluate(([id, mar]) => { const a = ABSENCES.find(x => x.id === id); return aAppliquer(a, mar, plus0(mar), null); function plus0(d) { return ajoute(d, -2); } }, [ID, mar]); const t2 = await toast(); const e2 = await lire(ID);
  v('aAppliquer(fin avant début) : refus (faux), message, rien ne bouge', r1 === false && /avant la date de d/.test(t2) && e2.du === ve && e2.au === lu, { r1, t2, e2 });
  // bouton forcé dans le panneau, geste séparé
  await p.evaluate(id => aPanneauDates(ABSENCES.find(x => x.id === id)), ID); await L.calme(p, 250); await set('ax-au', plus(ve, -4)); await vide();
  await p.evaluate(() => { const b = document.querySelector('[data-axok]'); b.disabled = false; b.click(); }); await L.calme(p, 300);
  v('Modifier les dates, geste séparé : bouton réactivé de force + clic → la fonction refuse, rien ne bouge', /avant la date de d/.test(await toast()) && JSON.stringify(await lire(ID)) === JSON.stringify(e2), e2);
  await ferme();

  // ── 3. PROPOSER D'AUTRES DATES (vrai clic « ✎ Proposer d'autres dates » sur une demande en attente)
  const dem = await p.evaluate(() => { const d = DEMANDES_ABS.find(x => x.etat === 'attente'); return d ? d.id : null; });
  v('population : une demande en attente existe', !!dem, dem);
  await p.evaluate(() => { aOnglet = 'avalider'; try { rendre(); } catch (e) {} }); await L.calme(p, 400);
  let ouvert = await p.evaluate(d => { const b = document.querySelector('[data-amodif="' + d + '"]'); if (!b || b.offsetParent === null) return false; b.scrollIntoView({ block:'center' }); return true; }, dem);
  if (!ouvert) { await p.evaluate(() => { try { aOnglet = 'demandes'; rendre(); } catch (e) {} }); await L.calme(p, 300); ouvert = await p.evaluate(d => { const b = document.querySelector('[data-amodif="' + d + '"]'); return !!b && b.offsetParent !== null; }, dem); }
  if (ouvert) { await p.locator('[data-amodif="' + dem + '"]').first().click(); await L.calme(p, 350); }
  else { console.log('  · bouton « Proposer d\'autres dates » non visible dans l\'onglet : panneau ouvert par la fonction'); await p.evaluate(d => aPanneauModif(DEMANDES_ABS.find(x => x.id === d)), dem); await L.calme(p, 300); }
  const prop = () => p.evaluate(() => { const b = document.querySelector('[data-amodifok]'); return b ? { dis:b.disabled, ap:document.getElementById('am-apercu').innerText.replace(/\s+/g, ' ').trim() } : null; });
  s = await prop(); const dd = await p.evaluate(d => { const x = DEMANDES_ABS.find(q => q.id === d); return { du:x.du, au:x.au, tech:x.tech }; }, dem);
  v('Proposer d\'autres dates : panneau ouvert (dates de la demande)', !!s, s);
  const autreJ = plus(pop.sa, 21), a2 = plus(autreJ, 1);
  await set('am-du', dd.du); await set('am-au', plus(dd.du, -2)); s = await prop();
  v('Proposer d\'autres dates : fin avant début → message ET bouton grisé', s && s.dis && /avant la date de d/.test(s.ap), s);
  await vide(); await p.locator('[data-amodifok]').click({ force:true, timeout:1500 }).catch(() => {}); await L.calme(p, 250);
  v('Proposer d\'autres dates : clic sur le bouton grisé → rien d\'envoyé (la demande reste « attente », sans proposition)', await p.evaluate(d => { const x = DEMANDES_ABS.find(q => q.id === d); return x.etat === 'attente' && !x.prop; }, dem));
  // dates valides : on cherche deux jours ouvrés loin, hors absences de cette personne
  const ok2 = await p.evaluate(([t]) => { for (let n = 30; n < 90; n++) { const d = jour(n), e = ajoute(d, 0); if (aJours({ tech:t, du:d, au:e, demi:null }) && !ABSENCES.some(a => a.tech === t && a.du <= e && d <= a.au) && !DEMANDES_ABS.some(a => a.tech === t && a.du <= e && d <= a.au)) return d; } return null; }, [dd.tech]);
  await set('am-du', ok2); await set('am-au', ok2); s = await prop();
  v('Proposer d\'autres dates : dates redevenues bonnes (un jour ouvré libre) → bouton RÉACTIVÉ', s && !s.dis && !/avant la date de d/.test(s.ap), { ok2, s });
  await p.locator('[data-amodifok]').click(); await L.calme(p, 450);
  const dprop = await p.evaluate(d => { const x = DEMANDES_ABS.find(q => q.id === d); return x ? { etat:x.etat, prop:x.prop || null } : null; }, dem);
  v('Proposer d\'autres dates : la proposition valide part vraiment après l\'aller-retour', dprop && dprop.etat === 'proposee', dprop);
  await ferme();
  // geste séparé : bouton forcé sur une autre demande en attente s'il en reste, sinon rejouer avec la même
  const dem2 = await p.evaluate(d => { const x = DEMANDES_ABS.find(q => q.etat === 'attente' && q.id !== d); return x ? x.id : null; }, dem);
  if (dem2) { await p.evaluate(d => aPanneauModif(DEMANDES_ABS.find(x => x.id === d)), dem2); await L.calme(p, 250);
    const dd2 = await p.evaluate(d => { const x = DEMANDES_ABS.find(q => q.id === d); return { du:x.du }; }, dem2); await set('am-du', dd2.du); await set('am-au', plus(dd2.du, -3)); await vide();
    await p.evaluate(() => { const b = document.querySelector('[data-amodifok]'); b.disabled = false; b.click(); }); await L.calme(p, 300);
    v('Proposer d\'autres dates, geste séparé : bouton réactivé de force + clic → refus (message), demande intacte', /avant la date de d/.test(await toast()) && await p.evaluate(d => DEMANDES_ABS.find(x => x.id === d).etat === 'attente', dem2)); await ferme(); }
  else console.log('  · une seule demande en attente : contrôle « geste séparé » de la proposition non joué');

  // ── 4. GLISSER : le refus se dit PENDANT, sur tous les cas ; le geste normal ne se plaint pas ; la demande glissée ouvre une proposition
  await p.evaluate(([T, ve, id]) => { const a = ABSENCES.find(x => x.id === id); Object.assign(a, { tech:T, du:ve, au:ve, demi:null }); aOnglet = 'calendrier'; aCalPer = 0.5; aCalSem = aLundi(ve); aCalQui = 'tous'; rendre(); }, [T, ve, ID]); await L.calme(p, 500);
  const glisser = async (sel, tech, versDate, garde) => {
    const pos = () => p.evaluate(([sel, t, d]) => { const b = document.querySelector(sel); if (!b) return null; const cell = [...document.querySelectorAll('[data-acd]')].find(e => e.dataset.acd === d && e.dataset.act === t); if (!cell) return { cell:false };
      b.scrollIntoView({ block:'center', inline:'center' }); const r = b.getBoundingClientRect(), q = cell.getBoundingClientRect(); return { cell:true, x:r.left + r.width / 2, y:r.top + r.height / 2, cx:q.left + q.width / 2, cy:q.top + q.height / 2 }; }, [sel, tech, versDate]);
    let g = await pos(); if (!g || !g.cell) return { ok:false, g }; await L.calme(p, 150); g = await pos();
    await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.mouse.move(g.x + 12, g.y + 2, { steps:4 }); const g2 = await pos(); await p.mouse.move(g2.cx, g2.cy, { steps:14 }); await p.waitForTimeout(160);
    const pendant = await p.evaluate(() => ({ glisse:document.body.classList.contains('ac-glisse'), flot:((document.querySelector('.ac-flot') || {}).innerText || '').replace(/\s+/g, ' '), non:document.querySelectorAll('.ac-cible-non').length, cibles:document.querySelectorAll('.ac-cible').length }));
    if (garde) await garde();
    await p.mouse.up(); await L.calme(p, 450); return { ok:true, pendant }; };
  const barre = '.ac-x[data-abs="a|' + ID + '"]';
  // 4a. un jour libre en semaine : rien d'annoncé, déplacé, annulable
  const libreVu = await p.evaluate(([T, ve]) => { const ds = [...document.querySelectorAll('[data-acd]')].filter(e => e.dataset.act === T).map(e => e.dataset.acd).filter(d => d !== ve && aJours({ tech:T, du:d, au:d, demi:null }) && !ABSENCES.some(a => a.tech === T && a.du <= d && d <= a.au) && !DEMANDES_ABS.some(a => a.tech === T && a.du <= d && d <= a.au)); return ds.filter(d => d > ve)[1] || null; }, [T, ve]);
  v('population : un jour ouvré libre est visible dans la frise de la personne', !!libreVu, libreVu);
  await vide(); const g1 = await glisser(barre, T, libreVu);
  v('glisser PENDANT sur un jour ouvré libre : aucune case rouge, aucune phrase de refus', g1.ok && g1.pendant.cibles > 0 && g1.pendant.non === 0 && !/rien ne bougera|déjà/.test(g1.pendant.flot), g1.pendant);
  const ea = await lire(ID);
  v('glisser : un jour ouvré libre → l\'absence est déplacée (le geste normal marche)', ea.du === libreVu, ea);
  await p.evaluate(() => { const b = [...document.querySelectorAll('#toast button')].find(x => /Annuler/.test(x.textContent)); if (b) b.click(); }); await L.calme(p, 300);
  // 4b. une absence de PLUSIEURS jours, lâchée à cheval sur un week-end : permis (pas « rien ne bougera »)
  await p.evaluate(id => { const a = ABSENCES.find(x => x.id === id); Object.assign(a, { du:ajoute(a.du, 0), au:ajoute(a.du, 1) }); rendre(); }, ID); await L.calme(p, 300);
  const base = await lire(ID);
  await vide(); const g2 = await glisser(barre, T, plus(base.du, 3));
  const e2b = await lire(ID);
  console.log('  · constat : absence de 2 jours déplacée de 3 jours — pendant « ' + (g2.pendant && g2.pendant.flot) + ' », avant ' + base.du + '→' + base.au + ', après ' + e2b.du + '→' + e2b.au);
  v('glisser : l\'annonce pendant et le résultat au lâcher DISENT la même chose (refus annoncé ⇔ rien ne bouge)', g2.ok && ((/rien ne bougera|déjà/.test(g2.pendant.flot) || g2.pendant.non > 0) === (e2b.du === base.du && e2b.au === base.au)), { pendant:g2.pendant, base, e2b });
  await p.evaluate(([id, T, ve]) => { const a = ABSENCES.find(x => x.id === id); Object.assign(a, { tech:T, du:ve, au:ve, demi:null }); rendre(); }, [ID, T, ve]); await L.calme(p, 300);
  // 4c. samedi, puis une demande en attente de la même personne (ordre des phrases : le week-end et la demande se cumulent)
  await p.evaluate(([T, d]) => { DEMANDES_ABS.push({ ...DEMANDES_ABS[0], id:'zz-dem-3', tech:T, du:d, au:d, demi:null, etat:'attente', fil:[] }); rendre(); }, [T, pop.sa]); await L.calme(p, 300);
  await vide(); const g3 = await glisser(barre, T, pop.sa); const e3 = await lire(ID);
  v('glisser sur un samedi qui porte AUSSI une demande en attente : annonce rouge pendant, refus au lâcher, rien ne bouge', g3.ok && g3.pendant.non > 0 && /rien ne bougera/.test(g3.pendant.flot) && e3.du === ve, { g3:g3.pendant, e3 });
  await p.evaluate(() => { DEMANDES_ABS = DEMANDES_ABS.filter(x => x.id !== 'zz-dem-3'); rendre(); }); await ferme(); await L.calme(p, 300);
  // 4d. une case SANS refus ne doit rien annoncer, même juste à côté d'une case qui refuse (dimanche puis lundi) : on glisse du vendredi au lundi
  await vide(); const g4 = await glisser(barre, T, lu);
  v('glisser PENDANT vendredi → lundi (lundi libre) : rien d\'annoncé', g4.ok && g4.pendant.non === 0 && !/rien ne bougera|déjà/.test(g4.pendant.flot), g4.pendant);
  await p.evaluate(([id, T, ve]) => { const a = ABSENCES.find(x => x.id === id); Object.assign(a, { tech:T, du:ve, au:ve, demi:null }); rendre(); }, [ID, T, ve]); await L.calme(p, 300);
  // 4e. glisser une DEMANDE (ouvre une proposition) : vers un samedi → annonce + proposition ouverte sans envoi ; vers un jour libre → pas d'annonce, proposition préremplie
  await p.evaluate(() => { aOnglet = 'calendrier'; aCalPer = 0.5; const d = DEMANDES_ABS.find(x => x.etat === 'attente'); if (d) { aCalSem = aLundi(d.du); aCalQui = 'tous'; } rendre(); }); await L.calme(p, 400);
  const dg = await p.evaluate(() => { const d = DEMANDES_ABS.find(x => x.etat === 'attente' && document.querySelector('.ac-x[data-abs="d|' + x.id + '"]')); return d ? { id:d.id, tech:d.tech, du:d.du, au:d.au } : null; });
  v('population : une demande en attente est dessinée (barre glissable) dans la frise', !!dg, dg);
  if (dg) {
    const jl = await p.evaluate(([t, du]) => { for (let n = 1; n < 40; n++) { const d = ajoute(du, n), e = d; if (aJours({ tech:t, du:d, au:e, demi:null }) && !DEMANDES_ABS.some(a => a.tech === t && a.du <= e && d <= a.au) && document.querySelector('[data-acd="' + d + '"][data-act="' + t + '"]')) return d; } return null; }, [dg.tech, dg.du]);
    const sb = '.ac-x[data-abs="d|' + dg.id + '"]';
    const nbD = await p.evaluate(() => DEMANDES_ABS.length);
    if (jl) { await vide(); const g5 = await glisser(sb, dg.tech, jl);
      const pr = await p.evaluate(() => ({ ouvert:!!document.getElementById('am-du'), du:(document.getElementById('am-du') || {}).value, dis:(document.querySelector('[data-amodifok]') || {}).disabled }));
      v('glisser d\'une demande sur un jour libre : aucune annonce de refus ; la proposition s\'ouvre, préremplie, bouton ACTIF', g5.ok && g5.pendant.non === 0 && pr.ouvert && pr.du === jl && pr.dis === false, { pendant:g5.pendant, pr, jl });
      await ferme(); }
    else console.log('  · pas de jour libre trouvé pour la demande : contrôle non joué');
    const wk = await p.evaluate(([t, du]) => { for (let n = 1; n < 40; n++) { const d = ajoute(du, n); if ([6].includes(new Date(d + 'T12:00:00').getDay()) && document.querySelector('[data-acd="' + d + '"][data-act="' + t + '"]')) return d; } return null; }, [dg.tech, dg.du]);
    if (wk) { await vide(); const g6 = await glisser(sb, dg.tech, wk);
      const pr2 = await p.evaluate(() => ({ ouvert:!!document.getElementById('am-du'), dis:(document.querySelector('[data-amodifok]') || {}).disabled, ap:((document.getElementById('am-apercu') || {}).innerText || '').replace(/\s+/g, ' ') }));
      console.log('  · constat : demande glissée sur un samedi — pendant « ' + g6.pendant.flot + ' » ; proposition ouverte=' + pr2.ouvert + ' bouton grisé=' + pr2.dis);
      v('glisser d\'une demande sur un samedi : annoncé pendant, et au lâcher la proposition (si ouverte) a son bouton GRISÉ — rien ne part', g6.ok && g6.pendant.non > 0 && (!pr2.ouvert || pr2.dis === true), { pendant:g6.pendant, pr2 });
      v('glisser d\'une demande sur un samedi : le nombre de demandes est inchangé, la demande est toujours « attente »', await p.evaluate(([n, id]) => DEMANDES_ABS.length === n && DEMANDES_ABS.find(x => x.id === id).etat === 'attente', [nbD, dg.id]));
      await ferme(); }
  }
  // 4f. mode téléphone « Déplacer » + toucher : le refus se dit déjà (toast) ; vers un jour libre, ça marche
  await p.evaluate(([id, T, ve]) => { const a = ABSENCES.find(x => x.id === id); Object.assign(a, { tech:T, du:ve, au:ve, demi:null }); aOnglet = 'calendrier'; aCalSem = aLundi(ve); aCalQui = 'tous'; rendre(); }, [ID, T, ve]); await L.calme(p, 300);
  await p.evaluate(id => { aDepl = { k:'a', id }; aRendreGarde(); }, ID); await L.calme(p, 300);
  const cl = async d => { const q = await p.evaluate(([T, d]) => { const c = [...document.querySelectorAll('[data-acd]')].find(e => e.dataset.acd === d && e.dataset.act === T); if (!c) return null; c.scrollIntoView({ block:'center', inline:'center' }); const r = c.getBoundingClientRect(); return { x:r.left + r.width / 2, y:r.top + r.height / 2 }; }, [T, d]); if (q) { await p.mouse.click(q.x, q.y); await L.calme(p, 350); } return !!q; };
  await vide(); await cl(pop.sa); const dsam = await lire(ID); v('« Déplacer » + toucher un samedi : refusé, rien ne bouge, on sort du mode', dsam.du === ve && !dsam.depl && /pas travaill/.test(await toast()), dsam);
  await p.evaluate(id => { aDepl = { k:'a', id }; aRendreGarde(); }, ID); await L.calme(p, 300); await cl(libreVu); const dm = await lire(ID);
  v('« Déplacer » + toucher un jour ouvré libre : déplacé', dm.du === libreVu, dm);
  await ferme();
  v('aucune erreur JavaScript pendant les gestes du gérant', err.length === 0, err);

  // ── 5. captures : le message + bouton grisé dans les trois formulaires, jour et nuit, Mac
  const fs = require('fs'); fs.mkdirSync(CAP, { recursive: true });
  await L.fin(c);

  // ── 6. FORMULAIRE DE DEMANDE (technicien, rôle sm) : vrai clic, fin avant début → grisé ; redevient actif ; clic → envoyée
  const t = await L.ouvrir({ profil:'iphone', nuit:false, qui:'sm', hash:'absences' }); const q = t.p; await L.calme(q, 800);
  const setq = (id, x) => q.evaluate(([id, x]) => { const e = document.getElementById(id); e.value = x; ['input', 'change'].forEach(tt => e.dispatchEvent(new Event(tt, { bubbles:true }))); }, [id, x]);
  const errq = []; q.on('pageerror', e => errq.push(e.message));
  const okT = await q.evaluate(() => { try { aOnglet = 'calendrier'; } catch (e) {} return !!document.querySelector('[data-atdem]'); });
  if (!okT) await q.evaluate(() => { try { aller('absences'); } catch (e) {} }); await L.calme(q, 300);
  const visT = await q.evaluate(() => [...document.querySelectorAll('[data-atdem]')].filter(e => e.offsetParent !== null).length);
  v('population (technicien, iPhone) : « Demande de congé » est visible', visT > 0, visT);
  const tpl = await q.evaluate(() => { const nT = DEMANDES_ABS.length; return nT; });
  await q.locator('[data-atdem]').first().scrollIntoViewIfNeeded(); await q.locator('[data-atdem]').first().tap().catch(async () => { await q.locator('[data-atdem]').first().click(); }); await L.calme(q, 400);
  const dem3 = () => q.evaluate(() => { const b = document.querySelector('[data-atenvoi]'); return b ? { dis:b.disabled, ap:document.getElementById('ad-apercu').innerText.replace(/\s+/g, ' ').trim() } : null; });
  const jOk = await q.evaluate(() => { for (let n = 40; n < 120; n++) { const d = jour(n); if (aJours({ tech:aTech(), du:d, au:d, demi:null }) && ![...ABSENCES, ...DEMANDES_ABS].some(x => x.tech === aTech() && x.du <= d && d <= x.au)) return d; } return null; });
  await setq('ad-du', jOk); await setq('ad-au', jOk); let s3 = await dem3();
  v('Demande (technicien) : un jour ouvré libre → bouton ACTIF', s3 && !s3.dis, s3);
  await setq('ad-au', plus(jOk, -2)); s3 = await dem3();
  v('Demande (technicien) : fin avant début → message ET bouton grisé', s3 && s3.dis && /avant la date de d/.test(s3.ap), s3);
  await CAPTURE(t, 'demande-fin-avant-debut-iphone-jour');
  await setq('ad-au', jOk); s3 = await dem3(); v('Demande (technicien) : dates redevenues bonnes → bouton RÉACTIVÉ', s3 && !s3.dis, s3);
  await setq('ad-au', plus(jOk, -2));
  await q.evaluate(() => { const b = document.querySelector('[data-atenvoi]'); b.disabled = false; b.click(); }); await L.calme(q, 300);
  v('Demande (technicien), geste séparé : bouton réactivé de force + clic → rien n\'est envoyé', await q.evaluate(n => DEMANDES_ABS.length === n, tpl));
  await setq('ad-au', jOk); await q.locator('[data-atenvoi]').click(); await L.calme(q, 400);
  v('Demande (technicien) : après l\'aller-retour, la demande valide est envoyée', await q.evaluate(n => DEMANDES_ABS.length === n + 1, tpl));
  v('aucune erreur JavaScript côté technicien', errq.length === 0, errq);
  // le technicien ne glisse rien
  const G = await q.evaluate(() => ({ lecture:aLecture(), barres:document.querySelectorAll('.ac-x[data-abs]').length }));
  v('technicien : vue en lecture, le glisser n\'est pas armé', G.lecture === true, G);
  await L.fin(t);

  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
  function CAPTURE() {}
})().catch(e => { console.error(e); L.fermer().then(() => process.exit(2)); });
