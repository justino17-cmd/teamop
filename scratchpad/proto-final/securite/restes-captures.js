// CAPTURES à REGARDER des restes de la sécurité, tour 1 (17 novembre 2026) : ce qui se VOIT après les corrections — un nom « Martin & Fils » dans une bulle et dans l'Historique (un seul « & », jamais « &amp; »),
// une unité « pièce(s) » / « paquet de 100 » dans « Envois à accepter », le formulaire « Nouveau client » avec un nom piégé (les chevrons disparaissent, le texte reste). Mac jour, iPhone nuit, iPad jour, Android nuit.
// Les captures vont dans cap/restes-securite/ (hors dépôt) et se LISENT à l'œil (outil Read). ⛔ 127.0.0.1 seulement.
const L = require('../lib.js');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-securite/';
(async () => {
  for (const [profil, nuit] of [['mac', false], ['iphone', true], ['ipad', false], ['android', true]]) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; const att = ms => p.waitForTimeout(ms);
    const tag = profil + (nuit ? '-nuit' : '-jour');
    await p.evaluate(() => { const k = Object.keys(CLIENTS)[0]; CLIENTS[k].nom = cliNet({ nom: 'Martin & Fils — L\'Hôtel <b>"x"</b>' }).nom; PRODUITS.slice(0, 3).forEach((x, i) => { x.u = uniteSure(['pièce(s)', 'paquet de 100', '€/h'][i]); }); journalAjout('marc', 'client', 'a répondu à Martin & Fils', { t: 'client', id: '', lib: 'Martin & Fils', cli: '' }, { det: 'Café « Chez Léa » & Cie · L\'Océan' }); });
    await p.evaluate(() => aller('historique')); await L.calme(p, 700); await L.capture(c, SORTIE + 'historique-' + tag + '.png');
    await p.evaluate(() => { const k = Object.keys(CLIENTS)[0]; toast(`${esc(tech('sm').nom.split(' ')[0])} est déjà chez ${esc(CLIENTS[k].nom)} de 09:00 à 11:00 : choisis une autre heure ou un autre technicien.`); }); await att(500); await L.capture(c, SORTIE + 'bulle-' + tag + '.png');
    await p.evaluate(() => { try { aller('stock'); } catch (e) {} }); await L.calme(p, 700); await L.capture(c, SORTIE + 'stock-' + tag + '.png');
    await L.fin(c);
  }
  await L.fermer();
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
