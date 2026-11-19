// RESTES contrats, tour 5 : (1) le tableau des Contrats ne revient pas trop tôt : « Copropriété » ne se coupe pas en plein mot sur une fenêtre d'ordinateur
// de 1 080 à 1 200 px (menu ouvert) ; (2) l'aperçu de « Composer un contrat » n'écrit jamais un prix que la création refuserait (1e999, -5, 1 234 567 890 123 :
// « 0,00 € » comme un champ vide, et le champ dit pourquoi) ; (3) des valeurs ABSOLUES (le prix rangé se lit en arrondi décimal : 1.005 → 1,01 €, 99.995 → 100,00 €),
// pour que les mutations C19 et C23 ne survivent plus ; (4) un numéro de contrat ne se réutilise pas.
// usage : node restes-contrats-5.js [profil] [nuit] → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-contrats-5/';
require('fs').mkdirSync(CAP, { recursive: true });
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
  const W = L.PROFILS[profil].w, H = L.PROFILS[profil].h;
  // (1) balayage de la fenêtre d'ordinateur, contrats de départ (« Copropriété Les Mimosas ») ET nom très long
  if (!c.doigt) for (const [libre, ws] of [[false, [1080, 1100, 1120, 1140, 1150, 1160, 1165, 1170, 1175, 1180, 1200, 1280]], [true, [1100, 1150, 1180]]]) {
    if (libre) await p.evaluate(() => { Object.keys(CLIENTS).forEach(i => { CLIENTS[i].nom = 'Copropriété Les Hauts de la Rochelle-Saint-Nicolas-de-la-Grave'; }); CONTRATS.forEach(k => { k.titre = 'Entretien annuel des climatisations de la résidence · bâtiment A, B, C et D'; }); });
    for (const w of ws) {
      await p.setViewportSize({ width: w, height: 900 }); await L.aller(p, 'accueil'); await L.aller(p, 'contrats'); await L.calme(p, 500);
      const r = await p.evaluate(() => { const car = document.querySelector('#contenu .ctr-liste'), th = [...car.querySelectorAll('thead th')].map(h => [h.textContent, Math.round(h.getBoundingClientRect().width)]), cl = th.find(h => h[0] === 'Client');
        const mots = [...car.querySelectorAll('tbody tr td:nth-child(2) > b')].map(b => { const t = b.firstChild, mot = t.textContent.split(/[\s-]+/).sort((a, b) => b.length - a.length)[0], i = t.textContent.indexOf(mot), g = document.createRange(); g.setStart(t, i); g.setEnd(t, i + mot.length); return { mot, lignes: g.getClientRects().length }; });
        return { carte: Math.round(car.getBoundingClientRect().width), cl: cl && cl[1], repli: th.some(h => h[1] === 0), mots, page: document.documentElement.scrollWidth }; });
      console.log('  ·', libre ? 'noms longs' : 'départ', w, 'carte', r.carte, 'client', r.cl, r.repli ? 'repli' : 'tableau', r.mots.map(m => m.mot + ':' + m.lignes).join(' '));
      const tag = '(1) ' + (libre ? 'noms longs ' : '') + w;
      v(tag + ' : population (carte, colonne Client, noms trouvés)', r.carte > 0 && !!r.cl && r.mots.length >= 3, r);
      v(tag + ' : aucun mot du nom coupé en plein mot', r.mots.every(m => m.lignes === 1 || r.mots.length === 0), r.mots);
      v(tag + ' : tableau complet seulement si la colonne Client fait au moins 120 px', r.repli || r.cl >= 120, r);
      v(tag + ' : la page ne déborde pas', r.page <= w + 1, r.page);
      if (!libre && w === 1100) { await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; }); await p.screenshot({ path: CAP + 'liste-1100' + (nuit ? '-nuit' : '-jour') + '.png' }); }
      if (!libre && w === 1180) { await p.screenshot({ path: CAP + 'liste-1180' + (nuit ? '-nuit' : '-jour') + '.png' }); }
    }
  }
  await p.setViewportSize({ width: W, height: H });
  // (2) saisies que la création refuserait : l'aperçu les écrit comme un champ vide, et le champ dit pourquoi
  const lire = async s => { await L.aller(p, 'contrat-nouveau'); await L.calme(p, 250); await p.fill('[data-b="prix"]', s); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 300);
    return p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)), ch = document.querySelector('[data-b="prix"]').parentElement.querySelector('.faible');
      return { art: h ? h.nextElementSibling.textContent.replace(/[\s  ]+/g, ' ').trim() : '', aide: ch ? ch.textContent.replace(/[\s  ]+/g, ' ').trim() : '' }; }); };
  for (const [s, aide] of [['1e999', /ne se lit pas/], ['-5', /ne se lit pas/], ['1234567890123', /trop grand/], ['0,5', /trop bas.*au moins 1 €/], ['abc', /ne se lit pas/], ['', /Indique le prix/]]   /* tour 6 : chaque refus dit sa VRAIE raison (règle commune des montants) */) {
    const r = await lire(s); console.log('  ·', JSON.stringify(s), '→', r.art.slice(0, 60), '|', r.aide);
    v('(2) ' + JSON.stringify(s) + ' : l’article 4 écrit « 0,00 € HT par an, soit 0,00 € TTC »', /^0,00 € HT par an, soit 0,00 € TTC/.test(r.art), r.art);
    v('(2) ' + JSON.stringify(s) + ' : le champ dit pourquoi', aide.test(r.aide), r.aide);
  }
  // (3) valeurs absolues : le prix rangé est l'arrondi DÉCIMAL de la saisie (HT, TTC à 20 %, prix par visite)
  for (const [s, freq, ht, ttc, vis] of [['1.005', '1', '1,01', '1,21', null], ['99.995', '1', '100,00', '120,00', null], ['12,345', '1', '12,35', '14,82', null], ['10.0049', '1', '10,00', '12,00', null], ['100.005', '2', '100,01', '120,01', '50,01'], ['1 000,5', '4', '1 000,50', '1 200,60', '250,13']]) {
    await L.aller(p, 'contrat-nouveau'); await L.calme(p, 250); await p.selectOption('[data-b="freq"]', freq); await p.fill('[data-b="prix"]', s); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 300);
    const t = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)); return h.nextElementSibling.textContent.replace(/[\s  ]+/g, ' ').trim(); });
    const nbsp = x => x.replace(/ /g, ' ');
    v('(3) ' + s + ' : HT de l’aperçu = ' + ht, t.startsWith(ht.replace(/ /g, ' ') + ' € HT par an') || nbsp(t).startsWith(ht + ' € HT par an'), t);
    v('(3) ' + s + ' : TTC de l’aperçu = ' + ttc, nbsp(t).includes('soit ' + ttc + ' € TTC'), t);
    if (vis) v('(3) ' + s + ' : prix par visite = ' + vis, nbsp(t).includes('soit ' + vis + ' € HT par visite'), t);
  }
  // (3 bis) le même prix, une fois créé : la fiche dit la même chose (HT absolu, pas seulement « comme l'aperçu »)
  const k = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 1, prix: '1.005', fact: 'an', signer: false }); v('(3) « 1.005 » : contrat créé', !!k, k);
  if (k) { const rg = await p.evaluate(id => { const x = CONTRATS.find(o => o.id === id); return x.prix; }, k.id); v('(3) « 1.005 » : prix RANGÉ = 1,01 €', rg === 1.01, rg); }
  // (3 ter) le TTC d'un prix qui n'est pas un nombre vaut 0 (jamais NaN) — appelé directement : l'aperçu ne l'appelle plus avec « abc »
  const tt = await p.evaluate(() => [ctrTTC('abc', CONTRATS[0]), ctrTTC(undefined, CONTRATS[0]), ctrTTC(100, CONTRATS[0])]);
  v('(3) ctrTTC(« abc ») et ctrTTC(undefined) valent 0, ctrTTC(100) vaut 120 (TVA 20 %) ou plus', tt[0] === 0 && tt[1] === 0 && tt[2] >= 100, tt);
  // (4) un numéro de contrat ne se réutilise pas
  const k2 = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 1, prix: '300', fact: 'an', signer: false });
  v('(4) deux contrats créés de suite portent deux numéros différents, le second après le premier', !!k && !!k2 && k.num !== k2.num && k2.num > k.num, [k && k.num, k2 && k2.num]);
  v('(4) le numéro suivant dépasse tous les numéros existants', await p.evaluate(() => { const m = Math.max(...CONTRATS.map(x => +x.num.slice(9))); return +ctrNum().slice(9) === m + 1; }));
  v('aucune erreur de page', !(c.err && c.err.length), c.err);
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
