// Tour 2 des restes « Tâches · Absences · Menu » : les deux panneaux corrigés se REGARDENT (« Modifier les dates » sur un week-end seul,
// « Proposer d'autres dates » sur un week-end seul) sur trois profils, jour et nuit. Chaque capture est précédée d'un contrôle de ce que dit
// l'écran (le message, le bouton grisé, rien qui déborde de la largeur du profil). usage : node restes-taches-absences-2-captures.js — « N ✓ · M ✗ »
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v, CAP = O.CAP;
(async () => {
  for (const [profil, nuit] of [['mac', false], ['iphone', true], ['petit', false], ['petit', true]]) {
    const c = await L.ouvrir({ profil, nuit, qui:'marc', hash:'absences' }); const p = c.p; await L.calme(p, 800);
    const set = (id, x) => p.evaluate(([id, x]) => { const e = document.getElementById(id); e.value = x; ['input', 'change'].forEach(t => e.dispatchEvent(new Event(t, { bubbles:true }))); if (typeof dtPeindre === 'function') dtPeindre(e); }, [id, x]);   // dtPeindre : le bouton de date montre la valeur posée, comme après un choix au calendrier
    const we = await p.evaluate(() => { for (let n = 3; n < 40; n++) { const d = new Date(jour(n) + 'T12:00:00'); if (d.getDay() === 6) return [jour(n), jour(n + 1)]; } });
    const tag = profil + (nuit ? '-nuit' : '-jour');
    // 1 — « Modifier les dates » sur un week-end
    await p.evaluate(() => aPanneauDates(ABSENCES.find(x => x.statut === 'validee' || !x.statut))); await L.calme(p, 300);
    await set('ax-du', we[0]); await set('ax-au', we[1]); await L.calme(p, 300);
    const x = await p.evaluate(() => { const b = document.querySelector('[data-axok]'), r = document.querySelector('#calque .panneau, .panneau'); return { ap:document.getElementById('ax-apercu').innerText, dis:b.disabled, bord:r ? Math.round(r.getBoundingClientRect().right) : 0, W:innerWidth }; });
    v(`${tag} : Modifier les dates sur un week-end : message « pas travaillés », bouton grisé, panneau dans la largeur`, /pas travaill/.test(x.ap) && x.dis && x.bord <= x.W + 1, x);
    await p.evaluate(() => document.getElementById('ax-apercu').scrollIntoView({ block:'center' })); await L.calme(p, 250);
    await L.capture(c, CAP + `restes2-modifier-dates-weekend-${tag}.png`);
    await p.evaluate(() => fermerPanneau());
    // 2 — « Proposer d'autres dates » : week-end seul, puis « Du » après la fin → « Au » suit
    const dd = await p.evaluate(() => (DEMANDES_ABS.find(x => x.etat === 'attente') || {}).id);
    await p.evaluate(id => aPanneauModif(DEMANDES_ABS.find(x => x.id === id)), dd); await L.calme(p, 300);
    await set('am-du', we[0]); await set('am-au', we[1]); await L.calme(p, 300);
    const z = await p.evaluate(() => ({ ap:document.getElementById('am-apercu').innerText, dis:document.querySelector('[data-amodifok]').disabled }));
    v(`${tag} : Proposer d'autres dates sur un week-end : message « pas travaillés », bouton grisé`, /pas travaill/.test(z.ap) && z.dis, z);
    await p.evaluate(() => document.getElementById('am-apercu').scrollIntoView({ block:'center' })); await L.calme(p, 250);
    await L.capture(c, CAP + `restes2-proposer-weekend-${tag}.png`);
    await p.evaluate(() => fermerPanneau());
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
