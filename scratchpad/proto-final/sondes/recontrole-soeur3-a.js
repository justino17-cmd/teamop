// RECONTRÔLE ADVERSE sœur 3 (19 novembre 2026) — point (a) : retour système du Temps de travail, variantes que le correcteur n'a pas jouées.
// PROFILS=mac,iphone,android · NUIT=1. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone,android').split(','), NUIT = !!process.env.NUIT;
const ev = (c, f, a) => c.p.evaluate(f, a), att = (c, ms) => L.calme(c.p, ms || 800);
const actif = c => ev(c, () => ({ route, onglet: ((document.querySelector('#contenu .seg [aria-pressed="true"]') || { innerText: '' }).innerText || '').replace(/\s+/g, ' ').trim(), sys: TT.sys, viaPaie: TT.viaPaie, nav: !!(history.state && history.state.nav), len: history.length }));
async function versPaie(c) { await L.aller(c.p, 'pointage'); await ev(c, () => { ttViaPaie('verrouok'); }); await L.toucher(c, '#contenu [data-tt="onglet|mois"]'); await att(c, 400);
  await L.toucher(c, '#contenu >> text=/Passer à la paie|Voir la paie/'); await att(c, 900); return (await actif(c)).route === 'comptabilite'; }
(async () => {
  for (const profil of PROFILS) {
    const nom = profil + (NUIT ? ' nuit' : '') + ' · ';
    // A1 : vrai clic sur un lien visible vers une AUTRE rubrique depuis la Paie, puis retour 100 ms après → Paie ; puis second retour → Mois (entrée marquée)
    { const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', calme: true }); v(nom + 'A1 population : dans la Paie', await versPaie(c), await actif(c));
      await ev(c, () => new Promise(r => { const a = document.createElement('a'); a.href = '#accueil'; a.textContent = 'x'; a.style.cssText = 'position:fixed;top:0;left:0;width:40px;height:40px;z-index:99999'; a.id = 'lienx'; document.body.appendChild(a); r(); }));
      await L.toucher(c, '#lienx', { delai: 1500 }); await c.p.waitForTimeout(100); const k = await actif(c); v(nom + 'A1 clic d’ancre vers #accueil : on y est (' + k.route + ')', k.route === 'accueil', k);
      await ev(c, () => history.back()); await att(c, 800); const b1 = await actif(c); v(nom + 'A1 retour 100 ms après le clic : la Paie (' + b1.route + ')', b1.route === 'comptabilite', b1);
      await ev(c, () => history.back()); await att(c, 900); const b2 = await actif(c); v(nom + 'A1 second retour : Temps de travail rouvert (drapeau « Voir la paie » tombé en passant par Accueil : Aujourd’hui voulu — ' + b2.onglet + ')', b2.route === 'pointage' && /^Aujourd/.test(b2.onglet), b2);
      await ev(c, () => history.forward()); await att(c, 800); const f1 = await actif(c); v(nom + 'A1 avance : la Paie', f1.route === 'comptabilite', f1);
      v(nom + 'A1 aucune erreur', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 2)); await L.fin(c); }
    // A2 : rechargement de la page sur la Paie puis retour système : pas d'erreur, onglet cohérent (état en mémoire perdu → Aujourd'hui accepté, jamais une page vide)
    { const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', calme: true }); v(nom + 'A2 population : dans la Paie', await versPaie(c), await actif(c));
      await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(1500); const r0 = await actif(c);
      await ev(c, () => history.back()); await att(c, 1000); const b = await actif(c);
      v(nom + 'A2 après rechargement puis retour : Temps de travail affiché, une vue valide (' + b.onglet + ')', b.route === 'pointage' && /^(Aujourd|Semaine|Mois)/.test(b.onglet), [r0, b]);
      v(nom + 'A2 aucune erreur', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 2)); await L.fin(c); }
    // A3 : depuis un AUTRE écran (clients → fiche → retour) le retour système est inchangé : on revient sur la liste, pas d'erreur
    { const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', calme: true });
      await L.aller(c.p, 'clients'); await L.aller(c.p, 'accueil'); await L.aller(c.p, 'pointage'); await ev(c, () => history.back()); await att(c, 700); const a = await actif(c);
      await ev(c, () => history.back()); await att(c, 700); const b = await actif(c); await ev(c, () => history.forward()); await att(c, 700); const d = await actif(c);
      v(nom + 'A3 pointage → retour : accueil ; retour : clients ; avance : accueil', a.route === 'accueil' && b.route === 'clients' && d.route === 'accueil', [a.route, b.route, d.route]);
      // entrée « neuve » : taper une adresse sur un écran marqué (retour au milieu de l'historique) puis retour système
      await ev(c, () => { location.hash = 'pointage'; }); await att(c, 700); const e1 = await actif(c); v(nom + 'A3 adresse tapée au milieu de l’historique : Aujourd’hui, entrée neuve (sys=' + e1.sys + ')', e1.route === 'pointage' && /^Aujourd/.test(e1.onglet) && !e1.sys, e1);
      v(nom + 'A3 aucune erreur', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 2)); await L.fin(c); }
    // A4 : double clic rapide (deux liens à 30 ms) puis deux retours ; la première entrée n'est jamais marquée ? on regarde ce que fait Temps de travail
    { const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', calme: true }); v(nom + 'A4 population : dans la Paie', await versPaie(c), await actif(c));
      await ev(c, () => { location.hash = 'pointage'; location.hash = 'accueil'; }); await att(c, 900);
      await ev(c, () => history.back()); await att(c, 900); const a = await actif(c);
      v(nom + 'A4 deux changements d’adresse dans le même tick puis retour : écran valide (' + a.route + '/' + a.onglet + '), pas d’erreur', !!a.route && c.err.filter(x => !/ERR_/.test(x)).length === 0, [a, c.err.slice(0, 2)]);
      await L.fin(c); }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout', false, String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
