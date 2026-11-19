// REJEU SŒUR 3 (19 novembre 2026) — Temps de travail, R4 du tour 3 : le retour du SYSTÈME se reconnaît à l'ÉTAT d'historique (une entrée déjà rendue), pas à une minuterie de 700 ms après un clic d'ancre.
// (a) clic d'ancre (même adresse) puis retour tout de suite → Mois ; (b) le même, le retour donné 0, 300 et 650 ms après ;
// (c) contre-épreuves : le clic RÉEL sur « Temps de travail » du menu, depuis la Paie, ouvre Aujourd'hui (une entrée neuve n'est pas un retour) ; l'avance rouvre la même vue ; une adresse tapée n'est pas un retour.
// PROFILS=mac,iphone (défaut) · TOUS=1 : les six · NUIT=1. ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ ».
const L = require('../lib.js'), v = L.v;
const PROFILS = process.env.TOUS ? ['mac', 'windows', 'ipad', 'iphone', 'android', 'petit'] : (process.env.PROFILS || 'mac,iphone').split(','), NUIT = !!process.env.NUIT;
const ev = (c, f, a) => c.p.evaluate(f, a), att = (c, ms) => L.calme(c.p, ms || 800);
const actif = c => ev(c, () => ({ route, onglet: ((document.querySelector('#contenu .seg [aria-pressed="true"]') || { innerText: '' }).innerText || '').replace(/\s+/g, ' ').trim(), sys: TT.sys, viaPaie: TT.viaPaie, nav: !!(history.state && history.state.nav) }));
async function versPaie(c) { await L.aller(c.p, 'pointage'); await ev(c, () => { ttViaPaie('verrouok'); }); await L.toucher(c, '#contenu [data-tt="onglet|mois"]'); await att(c, 400);
  await L.toucher(c, '#contenu >> text=/Passer à la paie|Voir la paie/'); await att(c, 900); return (await actif(c)).route === 'comptabilite'; }
(async () => {
  for (const profil of PROFILS) {
    const nom = profil + (NUIT ? ' nuit' : '') + ' · ';
    // (a)
    { const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', calme: true }); v(nom + 'a population : dans la Paie', await versPaie(c), await actif(c));
      await ev(c, () => { const a = document.createElement('a'); a.href = '#comptabilite'; a.hidden = true; document.body.appendChild(a); a.click(); a.remove(); history.back(); }); await att(c, 1000); const a = await actif(c);
      v(nom + 'a clic d’ancre (même adresse) puis retour < 700 ms : Mois (' + a.onglet + ')', a.route === 'pointage' && /^Mois/.test(a.onglet), a); await L.fin(c); }
    // (b) le même clic d'ancre, le retour donné à 0, 300 et 650 ms après (la fenêtre de 700 ms de l'ancienne minuterie) : Mois à chaque fois
    for (const d of [0, 300, 650]) { const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', calme: true }); v(nom + 'b' + d + ' population : dans la Paie', await versPaie(c), await actif(c));
      await ev(c, ms => new Promise(r => { const a = document.createElement('a'); a.href = '#comptabilite'; a.hidden = true; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => { history.back(); r(); }, ms); }), d); await att(c, 1000); const a = await actif(c);
      v(nom + 'b' + d + ' retour ' + d + ' ms après le clic d’ancre : Mois (' + a.onglet + ')', a.route === 'pointage' && /^Mois/.test(a.onglet), a); await L.fin(c); }
    // (c)
    { const c = await L.ouvrir({ profil, nuit: NUIT, qui: 'marc', calme: true }); v(nom + 'c population : dans la Paie', await versPaie(c), await actif(c));
      const e0 = await actif(c); v(nom + 'c l’entrée de la Paie porte sa marque d’historique', e0.nav, e0);
      let ok = await L.toucher(c, '#menu a[href="#pointage"]', { delai: 1500 }); if (!ok) { await ev(c, () => feuilleMenu()); await att(c, 500); ok = await L.toucher(c, '#calque .panneau [data-go="pointage"]', { delai: 2500 }); } await att(c, 900);
      const a = await actif(c); v(nom + 'c clic réel sur « Temps de travail » du menu : Aujourd’hui, pas un retour (menu touché ' + ok + ')', ok && a.route === 'pointage' && /^Aujourd/.test(a.onglet) && !a.sys, a);
      await ev(c, () => { location.hash = 'accueil'; }); await att(c, 600); await ev(c, () => { location.hash = 'pointage'; }); await att(c, 800); const t = await actif(c);
      v(nom + 'c adresse tapée #pointage : une entrée neuve, pas un retour (Aujourd’hui)', t.route === 'pointage' && /^Aujourd/.test(t.onglet) && !t.sys, t);
      v(nom + 'c aucune erreur de page', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 2)); await L.fin(c); }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
