// Balayage de TOUS les gestes de « Achats et frais » (campagne du 17 novembre 2026) : on recense à partir du DOM, puis on touche
// chaque élément sur une page NEUVE (rechargée) et on dit ce qu'il a fait : écran, fenêtre, données, message.
// Usage : node achats-gestes.js [profil=mac] [qui=marc] [onglets=demandes,notes] [nuit=0|1]   (le technicien : qui=sm onglets=techfrais)
const { L, CAP, ouvrirAchats, recenser, donnees, txt, toast, titrePanneau } = require('./achats-outils.js'), v = L.v, fs = require('fs');
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc', onglets = (process.argv[4] || 'demandes,notes').split(','), nuit = process.argv[5] === '1';
  const sortie = { profil, qui, nuit, onglets: {} };
  for (const onglet of onglets) {
    let c = await ouvrirAchats({ profil, qui, nuit, onglet, hash: onglet === 'techfrais' ? 'techfrais' : 'achats' }); const liste = await recenser(c.p), n = liste.length;
    console.log(`\n── ${onglet} (${profil}, ${qui}) : ${n} gestes recensés`);
    v(`${onglet} : la population n'est pas vide`, n >= 5, n);
    v(`${onglet} : aucun geste sans nom`, liste.every(g => g.lib), liste.filter(g => !g.lib));
    const lignes = []; let touches = 0;
    for (let i = 0; i < n; i++) {
      if (i > 0) { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(1300); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await c.p.evaluate(t => { if (t === 'techfrais') aller('techfrais'); else { acOnglet = t; aller('achats'); } }, onglet); await L.calme(c.p, 500); await recenser(c.p); }
      const g = liste[i], avant = await L.etat(c.p), d0 = await donnees(c.p);
      const ok = await L.toucher(c, `[data-sg="${i}"]`, { delai: 3000 }); if (ok) touches++;
      const apres = await L.etat(c.p), d1 = await donnees(c.p), ch = L.change(avant, apres);
      const ligne = { i, lib: g.lib, data: g.data, touche: ok, change: ch, donnees: d0 !== d1, h1: apres.h1, panneau: apres.panneau, toast: apres.toast, hash: apres.hash, l: g.l, h: g.h };
      lignes.push(ligne);
      const fait = ok && (ch.length > 0 || ligne.donnees);
      console.log(`  ${fait ? '·' : '?'} [${i}] ${g.lib} (${g.data}) → ${ok ? (ch.join(',') || 'rien') + (ligne.donnees ? ' +données' : '') : 'NON TOUCHÉ'} ${apres.panneau ? '| fenêtre « ' + apres.panneau.slice(0, 50) + ' »' : ''} ${apres.toast ? '| « ' + apres.toast.slice(0, 80) + ' »' : ''}`);
      // une fenêtre ouverte se ferme par Échap ET par son bouton « Annuler » / sa croix
      if (apres.panneau) { await c.p.keyboard.press('Escape'); await L.calme(c.p, 400); const f = await L.etat(c.p); v(`${onglet} [${i}] « ${g.lib} » : Échap ferme la fenêtre`, !f.panneau, f.panneau.slice(0, 60)); }
    }
    v(`${onglet} : ${touches}/${n} gestes touchés`, touches === n, { touches, n });
    v(`${onglet} : chaque geste touché fait quelque chose`, lignes.filter(l => l.touche && !l.change.length && !l.donnees).length === 0, lignes.filter(l => l.touche && !l.change.length && !l.donnees).map(l => l.lib));
    sortie.onglets[onglet] = { recenses: n, touches, lignes }; await L.fin(c);
  }
  fs.writeFileSync(`${__dirname}/../achats-balayage-${qui}-${profil}${nuit ? '-nuit' : ''}.json`, JSON.stringify(sortie, null, 1));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
