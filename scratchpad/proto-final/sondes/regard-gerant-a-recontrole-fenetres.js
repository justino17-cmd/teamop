// (« Nouvelle intervention » n'est pas un .panneau du calque : elle vit dans #fenetre et se mesure avec les écrans.)
// RECONTRÔLE du regard gérant A (second regard, 18 novembre 2026) : chaque FENÊTRE (panneau) ouverte depuis les sept rubriques
// du gérant tient-elle dans l'écran ? Trouvé sur capture : « Rendez-vous en ligne » à 320 px — la croix de fermeture sortait de
// l'écran de 16 px, le texte touchait le bord droit et les cartes perdaient leur bord droit (rien ne dépasse de la PAGE : c'est le
// panneau qui défile de côté, donc aucun audit de débordement de page ne le voit).
//   node regard-gerant-a-recontrole-fenetres.js [profil ...]      (par défaut : petit android iphone ipad, jour ; « petit nuit »…)
// Chaque contrôle compte sa population (une fenêtre qui s'ouvre, des cartes mesurées) ; sortie 1 si un contrôle tombe.
const L = require('../lib.js');
const profils = process.argv.slice(2).length ? process.argv.slice(2) : ['petit', 'android', 'iphone', 'ipad'];
let ok = 0, ko = 0;
const v = (m, c, d) => { if (c) ok++; else { ko++; console.log('  ✗ ' + m + (d ? ' — ' + d : '')); } };
const FENETRES = [
  ['rendez-vous en ligne', async (p, clic) => { await L.aller(p, 'planning'); return clic('[data-rrouvrir]', 700); }],
  ['nouvelle tâche', async (p, clic) => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tnouv]', 700); }],
  ['fiche de tâche', async (p, clic) => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tmodif=t1]', 700); }],
  ['OP GESTION te propose', async (p, clic) => { await L.aller(p, 'taches'); await clic('[data-tonglet=auj]'); return clic('[data-tsuggs]', 700); }],
  ['nouvelle absence', async (p, clic) => { await L.aller(p, 'absences'); return clic('[data-anouv]', 700); }],
  ['proposer d\'autres dates', async (p, clic) => { await L.aller(p, 'absences'); await clic('[data-aonglet=valider]'); return clic('[data-amodif=d3]', 700); }],
  ['refuser la demande', async (p, clic) => { await L.aller(p, 'absences'); await clic('[data-aonglet=valider]'); return clic('[data-anon=d3]', 700); }],
  ['statistiques : interventions et factures', async (p, clic) => { await L.aller(p, 'statistiques'); return clic('[data-stdet=fac]', 700); }],
  ['statistiques : par technicien', async (p, clic) => { await L.aller(p, 'statistiques'); return clic('[data-stdet=tech-kb]', 700); }],
];
(async () => {
  for (const spec of profils) {
    const [profil, m] = spec.split(':'), nuit = m === 'nuit';
    const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
    const clic = async (sel, att) => { const o = await p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(p, att || 450); return o; };
    let ouvertes = 0, cartes = 0;
    for (const [nom, geste] of FENETRES) {
      const q = `${profil}${nuit ? ' nuit' : ''} · ${nom}`;
      try { await L.ranger(p); const o = await geste(p, clic); if (o === false) { v(q + ' : la fenêtre s\'ouvre', false, 'geste sans cible'); continue; } } catch (e) { v(q + ' : la fenêtre s\'ouvre', false, String(e.message).slice(0, 80)); continue; }
      const r = await p.evaluate(() => {
        const pan = document.querySelector('#calque .panneau'); if (!pan || getComputedStyle(pan).display === 'none') return null;
        const pr = pan.getBoundingClientRect(), W = document.documentElement.clientWidth;
        const x = pan.querySelector('[data-fermer], .fermer, button[aria-label*="Fermer" i], button[aria-label*="fermer"]') || [...pan.querySelectorAll('button')].find(b => /^[×✕x]$/i.test(b.textContent.trim()));
        const xr = x ? x.getBoundingClientRect() : null;
        // les cartes et blocs du panneau : leur bord droit doit rester dans le panneau (et dans l'écran), avec de l'air
        const sorts = []; let n = 0;
        for (const e of pan.querySelectorAll('.carte, .info, h1, h2, h3, p, label, .champ, select, input, textarea')) { const cs = getComputedStyle(e); if (cs.display === 'none' || e.offsetParent === null) continue; const b = e.getBoundingClientRect(); if (b.width < 20 || b.height < 8) continue; n++;
          if (b.right > Math.min(pr.right, W) + 0.5) sorts.push(e.tagName + '.' + String(e.className).slice(0, 24) + ' « ' + (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28) + ' » droite ' + Math.round(b.right) + ' > ' + Math.round(Math.min(pr.right, W))); }
        return { sw: pan.scrollWidth, cw: pan.clientWidth, W, pr: Math.round(pr.right), x: xr ? { g: Math.round(xr.left), d: Math.round(xr.right) } : null, n, sorts: sorts.slice(0, 5) };
      });
      if (!r) { v(q + ' : un panneau est ouvert', false); continue; }
      ouvertes++; cartes += r.n;
      v(`${q} : le panneau ne défile pas de côté (scrollWidth ${r.sw} / ${r.cw})`, r.sw <= r.cw + 1, JSON.stringify(r));
      v(`${q} : la croix de fermeture est entière dans l'écran`, !r.x || (r.x.g >= 0 && r.x.d <= r.W), JSON.stringify(r.x) + ' pour ' + r.W);
      v(`${q} : aucun bloc ne sort du panneau à droite (${r.n} blocs)`, r.sorts.length === 0, r.sorts.join(' ; '));
    }
    v(`${profil}${nuit ? ' nuit' : ''} : les neuf fenêtres se sont ouvertes (population)`, ouvertes === FENETRES.length, ouvertes + ' sur ' + FENETRES.length);
    v(`${profil}${nuit ? ' nuit' : ''} : des blocs ont été mesurés`, cartes > 60, String(cartes));
    await L.fin(c);
  }
  console.log(`== ${ok} ✓ · ${ko} ✗`);
  await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
