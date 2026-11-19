// RESTES contrats, tour 5 — RECONTRÔLE ADVERSE. Rejoue les deux correctifs du tour (liste en cartes jusqu'à ~1 175 px ; aperçu du contrat qui n'écrit
// jamais un prix que la création refuserait) en cherchant ce qu'ils ont cassé à côté :
//  (A) balayage FIN de la largeur d'ordinateur (1 090 → 1 260), contrats de départ ET noms/titres longs : aucun mot coupé, aucun débordement,
//      tableau ou cartes mais jamais entre les deux, état toujours visible, un clic sur une ligne ouvre la fiche ;
//  (B) l'APERÇU et la CRÉATION disent la même chose pour une trentaine de saisies (dont celles qu'un vrai gérant tape : « 12 € », « 1 000,50 »,
//      « 1.000,50 », « 1000000 ») : l'article 4 vaut 0,00 € si et seulement si la création refuse, sinon HT de l'aperçu = prix rangé ;
//  (C) un refus ne consomme pas de numéro ; refusé puis corrigé repart juste ;
//  (D) ouverture à froid sur #contrat-nouveau (la constante CTR_PRIX_MAX est déclarée très bas dans le script : pas d'erreur à froid) ;
//  (E) les autres rôles ; (F) captures regardées.
// usage : node restes-contrats-5-recontrole.js [profil] [nuit] → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-contrats-5-recontrole/';
require('fs').mkdirSync(CAP, { recursive: true });
const nbsp = s => String(s).replace(/[\s  ]+/g, ' ').trim();
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrat-nouveau', nuit }), p = c.p; await L.calme(p, 400);
  const W = L.PROFILS[profil].w, H = L.PROFILS[profil].h;
  const a0 = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)); return h ? h.nextElementSibling.textContent.replace(/\s+/g, ' ') : null; });
  v('(D) ouverture à froid sur #contrat-nouveau : l’article 4 est écrit avec un prix', !!a0 && /€ HT par an/.test(a0) && !/NaN|∞|undefined/.test(a0), a0);
  v('(D) ouverture à froid sur #contrat-nouveau : aucune erreur de page', !(c.err && c.err.length), c.err);
  await L.aller(p, 'contrats');
  const k0 = await O.kpis(p); v('(D) liste des Contrats : quatre compteurs sans NaN', k0.length === 4 && k0.every(k => k.n && !/NaN|∞/.test(k.n)), k0);

  // (A) balayage fin de la largeur d'ordinateur
  if (!c.doigt) {
    for (const [libre, ws] of [[0, [1090, 1100, 1110, 1130, 1150, 1160, 1170, 1176, 1180, 1190, 1210, 1260]], [1, [1100, 1160, 1180, 1200]]]) {
      if (libre) await p.evaluate(() => { Object.keys(CLIENTS).forEach(i => { CLIENTS[i].nom = 'Syndicat des copropriétaires de la résidence Les Hauts de la Rochelle'; }); CONTRATS.forEach(k => { k.titre = 'Entretien annuel des climatisations de la résidence · bâtiment A, B, C et D · cage 12'; }); });
      for (const w of ws) {
        await p.setViewportSize({ width: w, height: 900 }); await L.aller(p, 'accueil'); await L.aller(p, 'contrats'); await L.calme(p, 450);
        const r = await p.evaluate(() => { const car = document.querySelector('#contenu .ctr-liste'), tab = car.querySelector('table'), th = [...car.querySelectorAll('thead th')].map(h => Math.round(h.getBoundingClientRect().width)),
            cartes = th.length > 0 && th.slice(2).every(x => x === 0);
          const lignes = [...car.querySelectorAll('tbody tr')].map(tr => { const b = tr.querySelector('td:nth-child(2) > b'), t = b.firstChild, mots = t.textContent.split(/[\s-]+/).filter(Boolean);
            const coupe = mots.some(m => { const i = t.textContent.indexOf(m), q = document.createRange(); q.setStart(t, i); q.setEnd(t, i + m.length); return q.getClientRects().length > 1; });
            const etat = [...tr.querySelectorAll('*')].find(e => /Sign|Envoy|attente|Termin/.test(e.textContent) && e.children.length === 0 && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden');
            return { coupe, etat: !!etat, nom: b.textContent.slice(0, 20) }; });
          return { carte: Math.round(car.getBoundingClientRect().width), tabW: Math.round(tab.getBoundingClientRect().width), cartes, th, lignes, page: document.documentElement.scrollWidth, defil: car.scrollWidth - car.clientWidth }; });
        const tag = '(A) ' + (libre ? 'noms longs ' : 'départ ') + w;
        console.log('  ·', tag, 'carte', r.carte, 'table', r.tabW, r.cartes ? 'CARTES' : 'TABLEAU', 'th', r.th.join('/'));
        v(tag + ' : population (carte mesurée, 3 lignes au moins)', r.carte > 0 && r.lignes.length >= 3, r.lignes.length);
        v(tag + ' : tableau ou cartes, jamais entre les deux', r.cartes || r.th.slice(2).every(x => x > 0), r.th);
        v(tag + ' : aucun mot du nom coupé en plein mot', r.lignes.every(l => !l.coupe), r.lignes.filter(l => l.coupe));
        v(tag + ' : l’état de chaque contrat se voit', r.lignes.every(l => l.etat), r.lignes.map(l => l.etat));
        v(tag + ' : le tableau ne sort pas de sa carte ; la page ne déborde pas', r.defil <= 1 && r.page <= w + 1, { defil: r.defil, page: r.page });
        if (!libre && (w === 1100 || w === 1180)) { await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; }); await p.screenshot({ path: CAP + 'liste-' + w + (nuit ? '-nuit' : '-jour') + '.png' }); }
      }
    }
    for (const w of [1100, 1280]) { await p.setViewportSize({ width: w, height: 900 }); await L.aller(p, 'accueil'); await L.aller(p, 'contrats');
      await L.toucher(c, '#contenu .ctr-tab tbody tr.clic td:nth-child(2) > b'); await L.calme(p, 400); const h = await p.evaluate(() => location.hash); v('(A) clic sur une ligne à ' + w + ' px ouvre la fiche du contrat', /contrat-x-/.test(h), h); }
  }
  await p.setViewportSize({ width: W, height: H });

  // (B) l'aperçu et la création disent la même chose
  const SAISIES = ['1e999', '-5', '0', '0,5', '0,99', '1', '1,00', '1,004', '1,005', '12', '12 €', '12€', '12,5', '1 000,50', '1.000,50', '1000000', '1000000,004', '1000000,005', '1000000,01', '1234567890123', 'abc', '', '  ', '１２', '00012', '.5', '5.', '1,2,3', '1e5', '0x10', '99999999999999999999', 'Infinity', 'NaN'];
  const lire = async s => { await L.aller(p, 'contrat-nouveau'); await L.calme(p, 200); await p.fill('[data-b="prix"]', s); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 250);
    return p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)), ch = document.querySelector('[data-b="prix"]').parentElement.querySelector('.faible');
      return { art: h ? h.nextElementSibling.textContent.replace(/[\s  ]+/g, ' ').trim() : '', aide: ch ? ch.textContent.replace(/[\s  ]+/g, ' ').trim() : '' }; }); };
  let nbOk = 0, nbRef = 0;
  for (const s of SAISIES) {
    const r = await lire(s), nul = /^0,00 € HT par an, soit 0,00 € TTC/.test(r.art);
    const n0 = await p.evaluate(() => CONTRATS.length);
    await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 450);
    const n1 = await p.evaluate(() => CONTRATS.length), refus = n1 === n0, k = refus ? null : await p.evaluate(() => CONTRATS[CONTRATS.length - 1]);
    const tag = '(B) ' + JSON.stringify(s);
    console.log('  ·', tag, '→', refus ? 'REFUSÉ' : 'accepté ' + k.prix, '|', r.art.slice(0, 40), '|', r.aide.slice(0, 50));
    v(tag + ' : aucun « NaN », « ∞ » ni « undefined » dans l’article 4 ni dans l’aide', !/NaN|∞|undefined/.test(r.art + ' ' + r.aide), r);
    v(tag + ' : l’aperçu vaut 0,00 € si et seulement si la création refuse', nul === refus, { art: r.art.slice(0, 50), refus });
    if (refus) { nbRef++; v(tag + ' : refusé → le champ le dit (au moins 1 € ou trop grand)', /au moins 1 €|trop grand/.test(r.aide), r.aide); }
    else { nbOk++; const ht = nbsp(r.art).split(' € HT')[0].replace(/ /g, '').replace(',', '.'); v(tag + ' : accepté → HT de l’aperçu = prix rangé', Math.abs(Number(ht) - k.prix) < 0.006, { ht, prix: k.prix }); }
  }
  v('(B) population : au moins 8 saisies acceptées et 15 refusées', nbOk >= 8 && nbRef >= 15, { nbOk, nbRef });

  // (C) un refus ne consomme pas de numéro ; refusé puis corrigé repart juste
  await L.aller(p, 'contrat-nouveau'); await L.calme(p, 200);
  const num0 = await p.evaluate(() => ctrNum());
  await p.fill('[data-b="prix"]', '1e999'); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 350);
  v('(C) un refus ne consomme pas de numéro', await p.evaluate(() => ctrNum()) === num0, num0);
  await p.fill('[data-b="prix"]', '480'); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 250);
  const art2 = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)); return h.nextElementSibling.textContent.replace(/[\s  ]+/g, ' ').trim(); });
  v('(C) refusé puis corrigé à 480 : l’aperçu écrit 480,00 € HT / 576,00 € TTC', /^480,00 € HT par an, soit 576,00 € TTC/.test(art2), art2);
  await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 500);
  const k2 = await p.evaluate(() => CONTRATS[CONTRATS.length - 1]); v('(C) créé au prix 480 avec le numéro annoncé', k2.prix === 480 && k2.num === num0, [k2.prix, k2.num, num0]);
  await L.aller(p, 'contrat-nouveau'); await p.fill('[data-b="prix"]', '1e999'); await p.dispatchEvent('[data-b="prix"]', 'change'); await p.selectOption('[data-b="freq"]', '12'); await L.calme(p, 300);
  const a12 = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)); return h.nextElementSibling.textContent.replace(/[\s  ]+/g, ' ').trim(); });
  v('(C) prix refusé + 12 visites : « 0,00 € HT par visite », sans NaN', /0,00 € HT par visite/.test(a12) && !/NaN|∞/.test(a12), a12);
  await p.screenshot({ path: CAP + 'apercu-refuse-' + profil + (nuit ? '-nuit' : '-jour') + '.png' });
  v('aucune erreur de page (marc)', !(c.err && c.err.length), c.err);
  await L.fin(c);

  // (E) autres rôles
  for (const qui of ['julie', 'sm', 'kb']) {
    const d = await L.ouvrir({ profil, qui, hash: 'contrats', nuit }); await L.calme(d.p, 400);
    const r = await d.p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, hash: location.hash, kp: document.querySelectorAll('#contenu .kpis .kpi').length, page: document.documentElement.scrollWidth }));
    if (qui === 'julie') { v('(E) julie : la liste des Contrats s’ouvre avec ses quatre compteurs', r.h1 === 'Contrats' && r.kp === 4, r); await d.p.evaluate(() => aller('contrat-nouveau')); await L.calme(d.p, 300);
      await d.p.fill('[data-b="prix"]', '1e999'); await d.p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(d.p, 250);
      const aj = await d.p.evaluate(() => (document.querySelector('[data-b="prix"]').parentElement.querySelector('.faible') || {}).textContent); v('(E) julie : l’aperçu refuse « 1e999 » et le dit', /trop grand/.test(aj || ''), aj); }
    else v('(E) ' + qui + ' : pas la rubrique Contrats (elle arrive ailleurs, comme décidé)', r.h1 !== 'Contrats', r);
    v('(E) ' + qui + ' : la page ne déborde pas', r.page <= L.PROFILS[profil].w + 1, r.page);
    v('(E) ' + qui + ' : aucune erreur de page', !(d.err && d.err.length), d.err); await L.fin(d);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
