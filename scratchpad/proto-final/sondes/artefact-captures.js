// CAPTURES À REGARDER (17 novembre 2026) : la carte du numéro après « Appeler », la carte « à copier à la main », le visionneur d'un fichier choisi,
// sur ordinateur et téléphone, de jour et de nuit. Elles vont dans $CAP/artefact/ (hors dépôt) ; la sonde mesure aussi que la carte tient dans l'écran
// et que son texte est lisible (contraste de l'encre sur la carte ≥ 4,5).
const path = require('path');
const A = require('./artefact-commun.js'), { bac, L, v } = A;
const CAP = (process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap') + '/artefact';
const lum = c => { const [r, g, b] = c.map(x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
const rapport = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
(async () => {
  for (const profil of ['mac', 'iphone']) for (const nuit of [false, true]) {
    const T = `${profil} ${nuit ? 'nuit' : 'jour'}`;
    const c = await bac.ouvrir({ profil, nuit, qui: 'marc' }, { presse: 'refuse' }); await A.calmer(c.p);
    await c.p.evaluate(() => { location.hash = 'client-x-cm'; }); await L.calme(c.p, 700);
    const lien = c.p.locator('#contenu a[href^="tel:"]').first(); const ok = await L.toucher(c, lien);
    v(`${T} : population (le lien Appeler de la fiche est touché)`, ok, '');
    await c.p.waitForTimeout(400); await L.capture(c, path.join(CAP, `carte-appel-${profil}-${nuit ? 'nuit' : 'jour'}.png`));
    const m = await c.p.evaluate(() => { const z = document.getElementById('sortie-carte'); if (!z) return null; const cs = getComputedStyle(z.querySelector('.sc-v')), cb = getComputedStyle(z); const col = s => (s.match(/[\d.]+/g) || []).slice(0, 3).map(Number); const r = z.getBoundingClientRect(); return { fg: col(cs.color), bg: col(cb.backgroundColor), carte: [r.left, r.top, r.right, r.bottom].map(Math.round), L: innerWidth, H: innerHeight }; });
    v(`${T} : la carte est là et tient dans l'écran`, !!m && m.carte[0] >= 0 && m.carte[2] <= m.L && m.carte[3] <= m.H, m);
    if (m) v(`${T} : encre lisible sur la carte (${rapport(m.fg, m.bg).toFixed(1)}:1 ≥ 4,5)`, rapport(m.fg, m.bg) >= 4.5, m);
    await c.p.evaluate(() => copieSecours('Bonjour, voici votre compte rendu : https://climservices17.teamop.fr/r/7Q2K', { titre: 'Sélectionne le texte du SMS' })); await c.p.waitForTimeout(300);
    await L.capture(c, path.join(CAP, `carte-copie-${profil}-${nuit ? 'nuit' : 'jour'}.png`));
    v(`${T} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
