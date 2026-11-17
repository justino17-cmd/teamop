// Parcours F : ce que la technicienne peut faire de l'écran « Mes congés » qui ne devrait pas être à elle ; un contrat signé sans date de fin ;
// la barre des tâches choisies (« Fait » sur un lot) ; « OP GESTION te propose ».
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
(async () => {
  // F1 — Sophie touche « ＋ Nouvelle absence » de SON calendrier
  { const c = await L.ouvrir({ profil: 'iphone', qui: 'sm', hash: 'absences' }); const p = c.p; await L.calme(p, 600);
    const n0 = await p.evaluate(() => ({ abs: ABSENCES.length, dec: DECISIONS_ABS.length }));
    const ok = await L.toucher(c, '#contenu [data-anouv]'); console.log('bouton « Nouvelle absence » touché :', ok);
    const f = await p.evaluate(() => ({ panneau: (document.querySelector('#calque .panneau h2') || {}).textContent, qui: document.getElementById('an-t') ? [...document.querySelectorAll('#an-t option')].map(o => o.textContent + (o.selected ? '*' : '')) : null }));
    console.log('formulaire :', JSON.stringify(f)); await L.capture(c, O.CAP + 'F1-sophie-nouvelle-absence.png');
    v('F1 : une technicienne n’a pas accès au formulaire « Nouvelle absence » du bureau (absences validées d’office, pour n’importe qui)', !f.panneau, f);
    if (f.panneau) { await p.selectOption('#an-t', 'kb'); await p.fill('#an-du', '2026-12-07'); await p.fill('#an-au', '2026-12-11'); await p.evaluate(() => document.getElementById('an-au').dispatchEvent(new Event('change', { bubbles: true }))); await L.toucher(c, '[data-anouvok]'); await L.calme(p, 500);
      const n1 = await p.evaluate(() => ({ abs: ABSENCES.length, dec: DECISIONS_ABS.length, derniere: ABSENCES[ABSENCES.length - 1] })); console.log('après « Enregistrer » par Sophie :', JSON.stringify(n1));
      v('F1 : Sophie ne peut pas poser d’absence validée à Karim', n1.abs === n0.abs, n1); }
    await L.fin(c); }
  // F2 — « Toute l'équipe » depuis l'écran d'une technicienne
  { const c = await L.ouvrir({ profil: 'iphone', qui: 'sm', hash: 'absences' }); const p = c.p; await L.calme(p, 600);
    await L.toucher(c, '#contenu [data-aqui-v="tous"]'); await L.calme(p, 400);
    const r = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, noms: [...document.querySelectorAll('#contenu .ac-nom, #contenu .ac-l b')].map(e => e.textContent.trim()).slice(0, 6), txt: document.getElementById('contenu').innerText.replace(/\s+/g, ' ').slice(0, 300) }));
    console.log('« Toute l’équipe » :', JSON.stringify(r)); await L.capture(c, O.CAP + 'F2-sophie-toute-equipe.png');
    v('F2 : le lien « Toute l’équipe » n’existe pas pour la technicienne (ou ne montre pas les absences des collègues)', !r.noms.length, r);
    await L.fin(c); }
  // F3 — contrat créé puis signé : pas de date de fin
  { const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'taches' }); const p = c.p; await L.calme(p, 600);
    await p.evaluate(() => { CONTRATS.push({ id: 'c9', num: 'CTR-2026-099', cli: 'md', modele: 'clim', titre: 'Entretien climatisation', freq: 2, prix: 480, fact: 'an', st: 'signe', signe: '31/10/2026', debut: '01/11/2026', faites: 0 }); });
    await p.evaluate(() => { try { rendre(); } catch (e) { window.__rendreErr = String(e.message); } }); await L.calme(p, 500);
    const r = await p.evaluate(() => ({ err: window.__rendreErr || null, h1: (document.querySelector('#contenu h1') || {}).textContent, long: document.getElementById('contenu').innerHTML.length }));
    console.log('Tâches avec un contrat signé sans fin :', JSON.stringify(r), 'erreurs page :', c.err.slice(0, 2)); await L.capture(c, O.CAP + 'F3-contrat-sans-fin.png');
    v('F3 : « Tâches » s’affiche quand un contrat signé n’a pas de date de fin', !r.err && r.h1 === 'Tâches' && !c.err.length, [r, c.err.slice(0, 2)]);
    await L.fin(c); }
  // F4 — « ✓ Fait » sur deux tâches choisies
  { const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'taches' }); const p = c.p; await L.calme(p, 600);
    await p.evaluate(() => { document.querySelector('[data-tsel=t3]').click(); document.querySelector('[data-tsel=t13]').click(); }); await L.calme(p, 300);
    await L.toucher(c, '[data-tsfait]'); await L.calme(p, 600);
    const r = await p.evaluate(() => ({ panneau: (document.querySelector('#calque .panneau') || {}).innerText, toast: (document.getElementById('toast') || {}).textContent, faits: TACHES.filter(x => x.fait && ['t3', 't13'].includes(x.id)).length }));
    console.log('« Fait » sur 2 :', JSON.stringify(r).slice(0, 700)); await L.capture(c, O.CAP + 'F4-fait-lot.png');
    await L.fin(c); }
  // F5 — le panneau « OP GESTION te propose »
  { const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'taches' }); const p = c.p; await L.calme(p, 600);
    await L.toucher(c, '[data-tsuggs]'); await L.calme(p, 500);
    const r = await p.evaluate(() => ({ h2: (document.querySelector('#calque .panneau h2') || {}).textContent, nb: document.querySelectorAll('#calque .panneau [data-tkxsug], #calque .panneau .tkx-s').length, btns: [...document.querySelectorAll('#calque .panneau button')].map(b => (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)).slice(0, 30) }));
    console.log('propositions :', JSON.stringify(r)); await L.capture(c, O.CAP + 'F5-propositions.png');
    await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
