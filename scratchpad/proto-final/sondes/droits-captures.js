// Captures À REGARDER (outil Read), ordinateur et téléphones, jour ET nuit : la lecture seule (phrase sous le titre), la catégorie partielle (phrase en pied), l'écran « aucune rubrique »,
// le refus d'un geste (toast), la fiche d'une personne (bloc Droits). Vont dans /tmp/…/cap/droits/, jamais dans le dépôt. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, CAP, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
(async () => {
  let n = 0;
  for (const [appareil, nuit] of [['iphone', false], ['mac', true], ['android', true], ['ipad', false]]) {
    const tag = `${appareil}-${nuit ? 'nuit' : 'jour'}`;
    // 1. lecture seule : Clients
    let c = await ouvrirComme({ k:'lc', prenom:'Lou', nom:'Lecture', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, '1000'])), sp:{}, appareil, nuit });
    await L.aller(c.p, 'clients'); await L.capture(c, CAP + `lecture-seule-clients-${tag}.png`); n++;
    // 2. un geste refusé : le toast
    await c.p.evaluate(() => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('data-action', 'clientNouveau'); document.body.appendChild(b); b.click(); b.remove(); }); await L.calme(c.p, 400);
    await L.capture(c, CAP + `refus-${tag}.png`); n++;
    // 3. catégorie partielle (Devis : ni supprimer)
    await c.p.evaluate(() => { eqDe('lc').droits.cats.ventes = { v:1, c:1, m:1, s:0 }; aller('devis'); }); await L.calme(c.p, 600);
    await c.p.evaluate(() => { const e = document.querySelector('.droits-note'); if (e) e.scrollIntoView({ block:'center' }); }); await L.calme(c.p, 300);
    await L.capture(c, CAP + `partiel-devis-${tag}.png`); n++;
    await L.fin(c);
    // 4. aucune rubrique ouverte
    c = await ouvrirComme({ k:'vi', prenom:'Vic', nom:'Vide', pd:'secr', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, '0000'])), sp:{}, appareil, nuit });
    await L.aller(c.p, 'taches'); await L.capture(c, CAP + `aucune-rubrique-${tag}.png`); n++;
    const t = await c.p.evaluate(() => ({ lignes:rlLignes().map(x => x.k), phrase:(document.querySelector('.droits-vide') || {}).textContent || '' }));
    v(`${tag} : une personne sans aucune case n'a que « Mes tâches » et la phrase le dit`, t.lignes.join() === 'taches' && /Ton gérant n’a encore ouvert aucune rubrique à ton compte/.test(t.phrase), t);
    await L.fin(c);
  }
  v('population : seize captures à regarder', n === 16, n);
  await fin();
})().catch(e => { console.error(e); process.exit(1); });
