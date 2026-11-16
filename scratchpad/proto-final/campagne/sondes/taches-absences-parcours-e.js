// Parcours E : points précis relevés aux captures — la technicienne (page ouverte directement) et la fenêtre du calendrier après une saisie.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
(async () => {
  // E1 — Karim ouvre « Mes congés » depuis une page neuve (pas un changement de session dans la page)
  for (const qui of ['kb', 'sm']) {
    const c = await L.ouvrir({ profil: 'mac', qui, hash: 'absences' }); const p = c.p; await L.calme(p, 600);
    const r = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, nouvelle: [...document.querySelectorAll('#contenu button')].some(b => /Nouvelle absence/.test(b.textContent)), nonAssigne: /Non assigné/.test(document.getElementById('contenu').innerText), retourEquipe: /Toute l’équipe/.test(document.getElementById('contenu').innerText), tete: (document.querySelector('#contenu .ac-seul-t, #contenu [class*=seul]') || {}).textContent, calQui: typeof aCalQui !== 'undefined' ? aCalQui : null }));
    console.log(qui, JSON.stringify(r)); await L.capture(c, O.CAP + `E1-mes-conges-${qui}.png`, true);
    v(`E1 ${qui} : son calendrier ne dit pas « Non assigné » et n’offre pas « Nouvelle absence »`, !r.nonAssigne && !r.nouvelle, r);
    v(`E1 ${qui} : pas de lien « Toute l’équipe » (il ne voit pas les collègues)`, !r.retourEquipe, r);
    await L.fin(c);
  }
  // E2 — après « Enregistrer l'absence » le calendrier montre l'absence qu'on vient de poser
  { const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'absences' }); const p = c.p; await L.calme(p, 600);
    await p.evaluate(() => document.querySelector('[data-aonglet=calendrier]').click()); await L.calme(p, 300);
    await p.evaluate(() => document.querySelector('[data-anouv]').click()); await L.calme(p, 300);
    await p.selectOption('#an-t', 'tl'); await p.selectOption('#an-ty', 'Congé payé'); await p.fill('#an-du', '2026-11-23'); await p.fill('#an-au', '2026-11-27'); await p.evaluate(() => document.getElementById('an-au').dispatchEvent(new Event('change', { bubbles: true }))); await L.calme(p, 200);
    await p.evaluate(() => document.querySelector('[data-anouvok]').click()); await L.calme(p, 600);
    const f = await p.evaluate(() => { const J = aPerJours(); return { du: J[0], au: J[J.length - 1], per: aCalPer, titre: (document.querySelector('.ac-per, .a-perlib') || {}).textContent, absTom: ABSENCES.filter(a => a.tech === 'tl').map(a => a.du + '>' + a.au), blocs: [...document.querySelectorAll('#contenu .ac-b, #contenu [data-abs]')].map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 30)) }; });
    console.log('fenêtre après saisie :', JSON.stringify(f));
    v('E2 : l’absence posée (23→27 nov) est dans la période affichée', f.du <= '2026-11-23' && f.au >= '2026-11-27', f);
    await L.capture(c, O.CAP + 'E2-apres-saisie.png', true); await L.fin(c); }
  // E3 — la technicienne envoie une demande : le message du bas ne lui propose pas « Voir comme Marc »
  { const c = await L.ouvrir({ profil: 'iphone', qui: 'sm', hash: 'absences' }); const p = c.p; await L.calme(p, 600);
    await L.toucher(c, '[data-atdem]'); await L.calme(p, 400);
    await p.evaluate(() => { document.getElementById('ad-du').value = jour(20); document.getElementById('ad-au').value = jour(22); document.getElementById('ad-du').dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('ad-au').dispatchEvent(new Event('input', { bubbles: true })); document.getElementById('ad-du').dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('ad-au').dispatchEvent(new Event('change', { bubbles: true })); });
    await L.calme(p, 300); await L.toucher(c, '[data-atenvoi]'); await L.calme(p, 500);
    const t = await p.evaluate(() => ({ toast: (document.getElementById('toast') || {}).innerText, bouton: [...document.querySelectorAll('#toast button')].map(b => b.textContent) }));
    console.log('toast après demande :', JSON.stringify(t)); await L.capture(c, O.CAP + 'E3-toast-demande.png');
    v('E3 : pas de bouton « Voir comme Marc » pour la technicienne (échafaudage)', !t.bouton.some(b => /comme Marc/.test(b)), t);
    if (t.bouton.some(b => /comme Marc/.test(b))) { await p.evaluate(() => document.querySelector('#toast button').click()); await L.calme(p, 500); const apres = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, aComme, ROLE })); console.log('après le bouton :', JSON.stringify(apres)); v('E3 : le bouton fait ce qu’il dit (écran du gérant)', apres.h1 === 'Absences et congés', apres); }
    await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
