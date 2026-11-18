// CAPTURES à REGARDER des restes de la sécurité, tour 2 (18 novembre 2026) : un nom de client de 118 signes (plafond relevé de 80 à 120) dans la liste, la fiche et la bulle « est déjà chez »,
// sur les largeurs qui le tiennent le plus mal : 320 px (petit), iPad, iPhone, Mac ; on mesure aussi le débordement contre la largeur du profil. Hors dépôt : cap/rec-secu2/. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js');
const SORTIE = '/tmp/claude-0/-home-user-teamop/9be26ef7-266a-5a6c-9d53-503511d117fa/scratchpad/cap/rec-secu2/';
const LONG = 'Syndicat des copropriétaires de la résidence Les Jardins du Port de Rochefort-sur-Mer, représenté par son syndic';
(async () => {
  for (const [profil, nuit] of [['petit', true], ['petit', false], ['ipad', false], ['iphone', true], ['mac', false]]) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; const tag = profil + (nuit ? '-nuit' : '-jour');
    const n = await p.evaluate(nom => { const o = cliNet({ nom, contact: nom, mail: 'syndic@exemple.fr' }); const k = Object.keys(CLIENTS)[0]; CLIENTS[k].nom = o.nom; CLIENTS[k].contact = o.contact; return o.nom.length; }, LONG);
    L.v(tag + ' : population : le nom de ' + n + ' signes est rangé entier', n === LONG.length && n > 80, n);
    await p.evaluate(() => aller('clients')); await L.calme(p, 800); await L.capture(c, SORTIE + 'clients-' + tag + '.png');
    const d1 = await L.deborde(c); L.v(tag + ' : la liste des clients ne déborde pas', !d1 || !d1.deborde, d1);
    await p.evaluate(() => { const k = Object.keys(CLIENTS)[0]; toast(`Sophie est déjà chez ${esc(CLIENTS[k].nom)} de 09:00 à 11:00 : choisis une autre heure ou un autre technicien.`); }); await p.waitForTimeout(500); await L.capture(c, SORTIE + 'bulle-' + tag + '.png');
    await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.classList.remove('on'); }); await p.evaluate(() => aller('client-x-' + Object.keys(CLIENTS)[0])); await L.calme(p, 800); await L.capture(c, SORTIE + 'fiche-' + tag + '.png');
    const d2 = await L.deborde(c); L.v(tag + ' : la fiche du client ne déborde pas', !d2 || !d2.deborde, d2);
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
