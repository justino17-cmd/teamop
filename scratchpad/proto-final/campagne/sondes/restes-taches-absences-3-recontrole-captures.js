// Captures du recontrôle du tour 3 : message « fin avant début » + bouton grisé dans les formulaires, et l'étiquette de glisser qui dit le refus.
// usage : node restes-taches-absences-3-recontrole-captures.js [dossier] — les images se REGARDENT (hors dépôt).
const O = require('./taches-absences-outils.js'), L = O.L, path = require('path');
const DIR = process.argv[2] || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes3-recontrole';
const plus = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); const z = x => String(x).padStart(2, '0'); return x.getFullYear() + '-' + z(x.getMonth() + 1) + '-' + z(x.getDate()); };
(async () => {
  for (const [profil, nuit] of [['iphone', false], ['iphone', true], ['ipad', false], ['ipad', true], ['mac', false], ['mac', true]]) {
    const c = await L.ouvrir({ profil, nuit, qui:'marc', hash:'absences' }), p = c.p; await L.calme(p, 700);
    const set = (id, x) => p.evaluate(([id, x]) => { const e = document.getElementById(id); e.value = x; ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles:true }))); }, [id, x]);
    const n = `${profil}-${nuit ? 'nuit' : 'jour'}`;
    const d0 = await p.evaluate(() => { const a = ABSENCES.find(x => x.statut === 'validee'); return { id:a.id, du:a.du }; });
    const dem = await p.evaluate(() => DEMANDES_ABS.find(x => x.etat === 'attente').id);
    await p.evaluate(() => aPanneauNouveau()); await L.calme(p, 300); await set('an-au', plus((await p.evaluate(() => document.getElementById('an-du').value)), -3)); await L.calme(p, 300);
    await L.capture(c, path.join(DIR, `nouvelle-${n}.png`)); await p.evaluate(() => fermerPanneau());
    await p.evaluate(id => aPanneauDates(ABSENCES.find(x => x.id === id)), d0.id); await L.calme(p, 300); await set('ax-au', plus(d0.du, -3)); await L.calme(p, 300);
    await L.capture(c, path.join(DIR, `dates-${n}.png`)); await p.evaluate(() => fermerPanneau());
    await p.evaluate(d => aPanneauModif(DEMANDES_ABS.find(x => x.id === d)), dem); await L.calme(p, 300);
    const dd = await p.evaluate(d => DEMANDES_ABS.find(x => x.id === d).du, dem); await set('am-au', plus(dd, -3)); await L.calme(p, 300);
    await L.capture(c, path.join(DIR, `proposer-${n}.png`)); await p.evaluate(() => fermerPanneau());
    if (!c.doigt) { // glisser : l'étiquette qui annonce le refus (samedi)
      await p.evaluate(() => { aOnglet = 'calendrier'; aCalPer = 0.5; const a = ABSENCES.find(x => x.statut === 'validee'); aCalSem = aLundi(a.du); aCalQui = 'tous'; rendre(); }); await L.calme(p, 500);
      const info = await p.evaluate(() => { const b = [...document.querySelectorAll('.ac-x[data-abs^="a|"]')][0]; const id = b.dataset.abs.split('|')[1], a = ABSENCES.find(x => x.id === id);
        let sa = null; for (let k = 0; k < 14; k++) { const d = ajoute(a.du, k); if (new Date(d + 'T12:00:00').getDay() === 6 && document.querySelector('[data-acd="' + d + '"][data-act="' + a.tech + '"]')) { sa = d; break; } }
        b.scrollIntoView({ block:'center', inline:'center' }); const r = b.getBoundingClientRect(), c = [...document.querySelectorAll('[data-acd]')].find(e => e.dataset.acd === sa && e.dataset.act === a.tech); if (!c) return null; c.scrollIntoView({ block:'center', inline:'center' }); const q = c.getBoundingClientRect(); const r2 = b.getBoundingClientRect(); return { x:r2.left + r2.width / 2, y:r2.top + r2.height / 2, cx:q.left + q.width / 2, cy:q.top + q.height / 2 }; });
      if (info) { await p.mouse.move(info.x, info.y); await p.mouse.down(); await p.mouse.move(info.x + 12, info.y + 2, { steps:4 }); await p.mouse.move(info.cx, info.cy, { steps:14 }); await p.waitForTimeout(250);
        await L.capture(c, path.join(DIR, `glisser-samedi-${n}.png`)); await p.mouse.up(); await L.calme(p, 300); } else console.log('  · pas de case samedi visible : ' + n); }
    await L.fin(c);
  }
  await L.fermer(); console.log('captures dans ' + DIR);
})().catch(e => { console.error(e); L.fermer().then(() => process.exit(2)); });
