// REJEU SŒUR 3 (19 novembre 2026) — Équipe › « Avant de désactiver » : l'alerte des semaines de pointage non validées NOMME les semaines (ou les plages contiguës) une à une.
// Avant : « Du 28 sept. au 25 oct. » pour des semaines non contiguës — cela suggérait tout l'intervalle, validées comprises.
// Population posée : trois semaines non validées (deux contiguës, une isolée) AVEC une semaine validée entre elles. PROFILS=mac,iphone (défaut) · TOUS=1 · NUIT=1. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const PROFILS = process.env.TOUS ? ['mac', 'windows', 'ipad', 'iphone', 'android', 'petit'] : (process.env.PROFILS || 'mac,iphone').split(','), NUIT = !!process.env.NUIT;
(async () => {
  for (const profil of PROFILS) {
    const nom = profil + (NUIT ? ' nuit' : '') + ' · ';
    const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', calme: true }), p = c.p;
    const r = await p.evaluate(() => { const k = 'sm', L0 = lundi(AUJ), sem = n => ajoute(L0, -7 * n);
      POINTAGES = POINTAGES.filter(o => o.qui !== k); Object.keys(PT_VALIDE).forEach(x => { if (x.startsWith(k)) delete PT_VALIDE[x]; });
      [6, 5, 3, 2].forEach(n => POINTAGES.push({ id:'psem' + n, qui:k, date:sem(n), debut:'08:00', fin:'17:00', pause:60 }));   // semaines -6, -5 (contiguës), -3 (isolée), -2 (validée ci-dessous)
      PT_VALIDE[k + sem(2)] = true; const R = eqxRestes(k);
      eqxDepart(k); const al = [...document.querySelectorAll('#calque .a-alerte')].find(e => /semaines? pas encore valid|Pointage de la semaine/.test(e.textContent)), pet = al && al.querySelector('small');
      return { pts: R.pt && R.pt.map(x => x), plages: R.pt ? eqxPlagesSem(R.pt) : null, titre: al && al.querySelector('b').textContent, detail: pet ? pet.textContent : null, attendu: ['Du ' + jCourt(sem(6)) + ' au ' + jCourt(ajoute(sem(5), 6)), 'Du ' + jCourt(sem(3)) + ' au ' + jCourt(ajoute(sem(3), 6))] }; });
    v(nom + 'population : trois semaines non validées, la validée entre elles n’y est pas', !!r.pts && r.pts.length === 3, r);
    v(nom + 'le titre compte trois semaines', /^Pointage de 3 semaines/.test(r.titre || ''), r.titre);
    v(nom + 'le détail dit deux plages : « ' + r.attendu.join(' · ') + ' »', r.detail === r.attendu.join(' · '), r.detail);
    v(nom + 'il ne dit pas l’intervalle entier (la semaine validée n’y est pas comprise)', !!r.detail && !r.detail.includes(' au ' + (await p.evaluate(() => jCourt(ajoute(lundi(AUJ), -7 * 3 + 6))) ) + ' ') && r.detail.split(' · ').length === 2, r.detail);
    await p.evaluate(() => { const a = [...document.querySelectorAll('#calque .a-alerte')][0]; if (a) a.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300);
    await L.capture(c, '/tmp/claude-0/soeur3/equipe-semaines-' + profil + (NUIT ? '-nuit' : '') + '.png');
    // contre-épreuve : une suite de semaines contiguës reste UNE plage ; une seule semaine : une plage d'une semaine
    const r2 = await p.evaluate(() => { const L0 = lundi(AUJ), sem = n => ajoute(L0, -7 * n); return { suite: eqxPlagesSem([sem(5), sem(4), sem(3)]), seule: eqxPlagesSem([sem(4)]), attS: 'Du ' + jCourt(sem(5)) + ' au ' + jCourt(ajoute(sem(3), 6)), attU: 'Du ' + jCourt(sem(4)) + ' au ' + jCourt(ajoute(sem(4), 6)) }; });
    v(nom + 'trois semaines qui se touchent : une seule plage', r2.suite === r2.attS, r2); v(nom + 'une seule semaine : sa plage de sept jours', r2.seule === r2.attU, r2);
    v(nom + 'aucune erreur de page', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 2)); await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
