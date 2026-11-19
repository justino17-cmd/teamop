// RECONTRÔLE ADVERSE sœur 3 — point (b) : semaines non validées nommées. Variantes : 1,3,4,7 ; passage d'année ; changement d'heure ; désordre ; capture à regarder.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone,android').split(','), NUIT = !!process.env.NUIT;
(async () => {
  for (const profil of PROFILS) {
    const nom = profil + (NUIT ? ' nuit' : '') + ' · ';
    const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', calme: true }), p = c.p;
    const r = await p.evaluate(() => { const L0 = lundi(AUJ), sem = n => ajoute(L0, -7 * n), o = {};
      o.a = eqxPlagesSem([sem(7), sem(4), sem(3), sem(1)]);   // 1,3,4,7 : doit donner 3 plages (7) · (4-3) · (1)
      o.attA = ['Du ' + jCourt(sem(7)) + ' au ' + jCourt(ajoute(sem(7), 6)), 'Du ' + jCourt(sem(4)) + ' au ' + jCourt(ajoute(sem(3), 6)), 'Du ' + jCourt(sem(1)) + ' au ' + jCourt(ajoute(sem(1), 6))].join(' · ');
      o.annee = eqxPlagesSem(['2026-12-21', '2026-12-28', '2027-01-04', '2027-01-18']);   // passage d'année : 21→(4 janv) contiguës, 18 isolée
      o.dst = eqxPlagesSem(['2026-10-19', '2026-10-26', '2026-11-02']);   // changement d'heure du 25 octobre
      o.vide = eqxPlagesSem([]); o.desordre = eqxPlagesSem(['2026-11-09', '2026-10-26', '2026-11-02']);
      o.dbl = eqxPlagesSem(['2026-11-02', '2026-11-02']);
      return o; });
    v(nom + 'semaines 1,3,4,7 : trois plages dont une double', r.a === r.attA, [r.a, r.attA]);
    v(nom + 'passage d’année : « Du 21 déc. au 10 janv. · Du 18 janv. au 24 janv. » (3 contiguës puis 1)', /^Du 21 déc\.?.* au 10 janv\.?.* · Du 18 janv\.?.* au 24 janv/.test(r.annee), r.annee);
    v(nom + 'changement d’heure : une seule plage 19 oct. → 8 nov.', /^Du 19 oct\.?.* au 8 nov\.?[^·]*$/.test(r.dst), r.dst);
    v(nom + 'liste vide : chaîne vide, pas d’exception', r.vide === '', r.vide);
    v(nom + 'désordre : triées avant de regrouper (une plage)', !/·/.test(r.desordre), r.desordre);
    v(nom + 'doublon (non attendu) : à voir', true, r.dbl);
    // l'écran : 5 semaines non validées en 3 plages dans l'écran Équipe ; capture
    const e = await p.evaluate(() => { const k = 'sm', L0 = lundi(AUJ), sem = n => ajoute(L0, -7 * n);
      POINTAGES = POINTAGES.filter(o => o.qui !== k); Object.keys(PT_VALIDE).forEach(x => { if (x.startsWith(k)) delete PT_VALIDE[x]; });
      [7, 4, 3, 1].forEach(n => POINTAGES.push({ id:'psem' + n, qui:k, date:sem(n), debut:'08:00', fin:'17:00', pause:60 }));
      const R = eqxRestes(k); eqxDepart(k); const al = [...document.querySelectorAll('#calque .a-alerte')].find(x => /semaines? pas encore valid|Pointage de la semaine/.test(x.textContent));
      if (al) al.scrollIntoView({ block: 'center' }); const pet = al && al.querySelector('small'), b = al && al.getBoundingClientRect();
      return { n: R.pt && R.pt.length, titre: al && al.querySelector('b').textContent, detail: pet && pet.textContent, droite: b && Math.round(b.right), sw: document.documentElement.scrollWidth }; });
    v(nom + 'écran : 4 semaines, détail en 3 plages', e.n === 4 && e.detail && e.detail.split(' · ').length === 3, e);
    v(nom + 'écran : la carte ne sort pas de la largeur (' + e.droite + ' ≤ ' + c.largeur + ', page ' + e.sw + ')', e.droite <= c.largeur && e.sw <= c.largeur, e);
    await L.calme(p, 400); await L.capture(c, '/tmp/claude-0/recontrole/semaines-' + profil + (NUIT ? '-nuit' : '') + '.png');
    v(nom + 'aucune erreur', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 2)); await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout', false, String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
