// Une tâche que la technicienne confie au gérant par « Détails » : le gérant la reçoit-il, au bon nom, dans ses Tâches ? (campagne du 17 novembre 2026)
// Usage : node technicien-parcours-tache-pour-marc.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const devenir = async (p, k, h) => { await p.evaluate(([k, h]) => { if (SESSION) sessionFermer('deconnexion'); sessionOuvrir(k); aller(h); }, [k, h]); await L.calme(p, 800); };
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = nuit ? 'nuit' : 'jour';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'taches' }), p = c.p;
  const toast = () => p.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.trim() : ''; });
  await L.aller(p, 'taches'); await L.toucher(c, '[data-tnouv]'); await L.calme(p, 400);
  const champs = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau input, #calque .panneau select, #calque .panneau textarea')].map(e => (e.id || e.name || e.tagName) + ':' + e.type));
  console.log('   champs de « Nouvelle tâche » :', JSON.stringify(champs));
  v('G0 la fenêtre « Nouvelle tâche » a un champ « Quoi » et un « Pour qui »', await p.evaluate(() => !!document.querySelector('#calque #tk-t') && !!document.querySelector('#calque #tk-qui')), champs);
  await p.fill('#tk-t', 'Commander des cosses fast-on pour la mise en service de lundi'); await p.selectOption('#tk-qui', 'marc'); await L.calme(p, 200);
  await L.capture(c, CAP + `tache-pour-marc-${profil}-${J}.png`);
  const n0 = await p.evaluate(() => TACHES.length);
  const ok = await p.evaluate(() => { const b = [...document.querySelectorAll('#calque .panneau button')].find(x => /^(Ajouter|Créer|Enregistrer|Confier)/.test(x.textContent.trim())); if (!b) return ''; b.click(); return b.textContent.trim(); });
  await L.calme(p, 500); console.log('   bouton touché :', ok, '| toast :', await toast());
  v('G1 la tâche est créée (+1)', (await p.evaluate(() => TACHES.length)) === n0 + 1, { ok, toast: await toast() });
  v('G2 le message dit à qui elle est confiée', /Marc/.test(await toast()), await toast());
  await devenir(p, 'marc', 'taches');
  const tm = await txt(p); const dedans = await p.evaluate(() => TACHES.some(t => /cosses fast-on/.test(t.t) && t.qui === 'marc'));
  v('G3 la tâche est au nom de Marc (donnée)', dedans);
  v('G4 Marc la voit dans ses Tâches (« Aujourd’hui » ou « À venir »)', /cosses fast-on/.test(tm) || await p.evaluate(() => { const b = document.querySelector('[data-tonglet="avenir"]'); if (b) b.click(); return new Promise(r => setTimeout(() => r(/cosses fast-on/.test(document.getElementById('contenu').textContent)), 500)); }), tm.slice(0, 200));
  await L.capture(c, CAP + `tache-pour-marc-gerant-${profil}-${J}.png`);
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
