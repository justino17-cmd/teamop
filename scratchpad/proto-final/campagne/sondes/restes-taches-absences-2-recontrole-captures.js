// Captures du recontrôle adverse (tour 2) : ce que l'écran DIT quand le glisser est refusé (samedi), « Modifier les dates » sur un week-end seul (Android de nuit,
// iPad de jour), « Proposer d'autres dates » avec une fin avant le début (petit écran de nuit : message ET bouton), et « Nouvelle absence » avec une fin avant le début.
// Chaque capture est précédée d'un contrôle de ce que l'écran affiche, et de la largeur du profil. usage : node restes-taches-absences-2-recontrole-captures.js
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v, CAP = O.CAP;
const plus = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); const z = n => String(n).padStart(2, '0'); return x.getFullYear() + '-' + z(x.getMonth() + 1) + '-' + z(x.getDate()); };
(async () => {
  require('fs').mkdirSync(CAP, { recursive:true });
  for (const [profil, nuit] of [['mac', false], ['mac', true], ['android', true], ['ipad', false], ['petit', true]]) {
    const c = await L.ouvrir({ profil, nuit, qui:'marc', hash:'absences' }); const p = c.p; await L.calme(p, 800); const tag = profil + (nuit ? '-nuit' : '-jour');
    const set = (id, x) => p.evaluate(([id, x]) => { const e = document.getElementById(id); e.value = x; ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles:true }))); if (typeof dtPeindre === 'function') dtPeindre(e); }, [id, x]);
    const sa = await p.evaluate(() => { for (let n = 2; n < 14; n++) if (new Date(jour(n) + 'T12:00:00').getDay() === 6) return jour(n); });
    const ve = plus(sa, -1);
    if (profil === 'mac') {   // le refus du glisser sur un samedi : le message se LIT, et la barre est restée à son vendredi
      const T = await p.evaluate(sa => { const ds = [-3, -2, -1, 0, 1, 2, 3].map(k => ajoute(sa, k)); return TECHS.filter(t => t.id).map(t => t.id).find(t => !ABSENCES.some(a => a.tech === t && ds.some(d => a.du <= d && d <= a.au)) && !DEMANDES_ABS.some(a => a.tech === t && ds.some(d => a.du <= d && d <= a.au))); }, sa);
      await p.evaluate(([T, ve]) => { ABSENCES.push({ ...ABSENCES.find(x => x.type), id:'zz-cap-1', tech:T, du:ve, au:ve, demi:null, type:'Congé payé', motif:'', statut:'validee' }); aOnglet = 'calendrier'; aCalPer = 0.5; aCalSem = aLundi(ve); aCalQui = 'tous'; rendre(); }, [T, ve]); await L.calme(p, 500);
      const pos = () => p.evaluate(([sa]) => { const b = document.querySelector('.ac-x[data-abs="a|zz-cap-1"]'); b.scrollIntoView({ block:'center', inline:'center' }); const a = ABSENCES.find(x => x.id === 'zz-cap-1'), cell = [...document.querySelectorAll('[data-acd]')].find(e => e.dataset.acd === sa && e.dataset.act === a.tech), r = b.getBoundingClientRect(), q = cell.getBoundingClientRect(); return { x:r.left + r.width / 2, y:r.top + r.height / 2, cx:q.left + q.width / 2, cy:q.top + q.height / 2 }; }, [sa]);
      let g = await pos(); await L.calme(p, 200); g = await pos();
      await p.mouse.move(g.x, g.y); await p.mouse.down(); await p.mouse.move(g.x + 12, g.y + 2, { steps:4 }); g = await pos(); await p.mouse.move(g.cx, g.cy, { steps:14 }); await p.waitForTimeout(200);
      await L.capture(c, CAP + `restes2-recontrole-glisser-pendant-${tag}.png`);
      await p.mouse.up(); await L.calme(p, 500);
      const e = await p.evaluate(() => ({ du:ABSENCES.find(x => x.id === 'zz-cap-1').du, toast:(document.getElementById('toast') || {}).innerText || '', on:document.getElementById('toast') && document.getElementById('toast').classList.contains('on'), W:innerWidth, bord:(() => { const t = document.getElementById('toast'); return t ? Math.round(t.getBoundingClientRect().right) : 0; })() }));
      v(`${tag} : glisser refusé sur un samedi — la barre reste à son vendredi, le message est visible et dans la largeur`, e.du === ve && e.on && /pas travaill/.test(e.toast) && e.bord <= e.W, e);
      await L.capture(c, CAP + `restes2-recontrole-glisser-refus-${tag}.png`);
    }
    if (profil === 'android' || profil === 'ipad') {
      await p.evaluate(sa => { aOnglet = 'calendrier'; rendre(); }, sa);
      await p.evaluate(() => aPanneauDates(ABSENCES.find(x => x.statut === 'validee' || !x.statut))); await L.calme(p, 300);
      await set('ax-du', sa); await set('ax-au', plus(sa, 1)); await L.calme(p, 300);
      const x = await p.evaluate(() => { const b = document.querySelector('[data-axok]'), r = document.querySelector('#calque .panneau, .panneau'); return { ap:document.getElementById('ax-apercu').innerText, dis:b.disabled, bord:r ? Math.round(r.getBoundingClientRect().right) : 0, W:innerWidth }; });
      v(`${tag} : Modifier les dates sur un week-end — message, bouton grisé, panneau dans la largeur`, /pas travaill/.test(x.ap) && x.dis && x.bord <= x.W + 1, x);
      await p.evaluate(() => document.getElementById('ax-apercu').scrollIntoView({ block:'center' })); await L.calme(p, 250);
      await L.capture(c, CAP + `restes2-recontrole-modifier-weekend-${tag}.png`);
      await p.evaluate(() => fermerPanneau());
    }
    if (profil === 'petit' || profil === 'mac') {   // « Proposer d'autres dates » : fin avant le début — le message ET le bouton
      const dd = await p.evaluate(() => (DEMANDES_ABS.find(x => x.etat === 'attente') || {}).id);
      await p.evaluate(id => aPanneauModif(DEMANDES_ABS.find(x => x.id === id)), dd); await L.calme(p, 300);
      await set('am-du', plus(sa, 3)); await set('am-au', plus(sa, 4)); await set('am-au', plus(sa, 1)); await L.calme(p, 300);
      const z = await p.evaluate(() => ({ ap:document.getElementById('am-apercu').innerText.replace(/\s+/g, ' '), dis:document.querySelector('[data-amodifok]').disabled }));
      console.log('  · constat ' + tag + ' : « Proposer d\'autres dates », fin avant le début → message « ' + z.ap + ' », bouton ' + (z.dis ? 'grisé' : 'ACTIF'));
      await p.evaluate(() => document.getElementById('am-apercu').scrollIntoView({ block:'center' })); await L.calme(p, 250);
      await L.capture(c, CAP + `restes2-recontrole-fin-avant-debut-${tag}.png`);
      await p.evaluate(() => fermerPanneau());
      // « Nouvelle absence » avec une personne libre sur le week-end suivant : fin avant le début, bouton
      const T = await p.evaluate(sa => { const ds = [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7].map(k => ajoute(sa, k)); return TECHS.filter(t => t.id).map(t => t.id).find(t => !ABSENCES.some(a => a.tech === t && ds.some(d => a.du <= d && d <= a.au)) && !DEMANDES_ABS.some(a => a.tech === t && ds.some(d => a.du <= d && d <= a.au))); }, sa);
      await p.evaluate(T => aPanneauNouveau(T), T); await L.calme(p, 300);
      await set('an-du', plus(sa, 3)); await set('an-au', plus(sa, 4)); await set('an-au', plus(sa, 1)); await L.calme(p, 300);
      const n = await p.evaluate(() => ({ ap:document.getElementById('an-apercu').innerText.replace(/\s+/g, ' '), dis:document.querySelector('[data-anouvok]').disabled }));
      console.log('  · constat ' + tag + ' : « Nouvelle absence » (personne libre), fin avant le début → message « ' + n.ap + ' », bouton ' + (n.dis ? 'grisé' : 'ACTIF'));
      v(`${tag} : « Nouvelle absence », fin avant le début → bouton grisé (comme un week-end)`, n.dis === true, n);
      await p.evaluate(() => fermerPanneau());
    }
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
