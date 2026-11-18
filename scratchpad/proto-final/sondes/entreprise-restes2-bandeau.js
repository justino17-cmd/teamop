// RESTES ENTREPRISE, TOUR 2 — « Voir seul » à la Boîte mail : le bandeau « OP GESTION a reconnu » ne propose plus ses gestes (créer le client, confier, en faire une tâche, noter un paiement,
// ranger…) : tous ÉCRIVENT ailleurs que dans le courrier, la garde des droits les refusait un par un (27 gestes mesurés sur 9 messages avant la correction) mais les offrait. Ses LIENS (qui
// ouvrent une fiche) restent. Contre-épreuves : avec toutes les cases, les gestes sont là ; et par l'hôte (courrierAgir, sans passer par le bouton) la garde refuse encore, avec sa phrase.
// Usage : node …/entreprise-restes2-bandeau.js. Rend « N ✓ · M ✗ ». ⛔ 127.0.0.1, entreprise fictive.
const C = require('./entreprise-commun.js'); const D = require('./droits-commun.js'); const { L, v } = C;
const cases = (o) => Object.assign({ planif:'1111', inter:'1111', crm:'1111', ventes:'1111', compta:'1111', stock:'1111', temps:'1111', com:'1111', achats:'1111', admin:'1000' }, o || {});
const RELEVE = async () => { const h = [...document.querySelectorAll('*')].find(e => e.shadowRoot); const o = h.shadowRoot; const out = [];
  for (const id of [...o.querySelectorAll('.msg[data-id]')].map(r => r.getAttribute('data-id'))) { const r = o.querySelector('.msg[data-id="' + id + '"]'); if (!r) continue; r.click(); await new Promise(z => setTimeout(z, 200));
    out.push({ id, bandeau:!!o.querySelector('.hband'), gestes:o.querySelectorAll('.hacts [data-hote]').length, liens:o.querySelectorAll('.hliens [data-hote], .hfait [data-hote]').length }); }
  return out; };
(async () => {
  for (const [com, nom] of [['1000', 'Voir seul'], ['1010', 'Voir + Modifier']]) {
    const c = await D.ouvrirComme({ qui:'marc', appareil:'mac' }); const p = c.p;
    await p.evaluate(D.INJECTER, { k:'zz', prenom:'Zoé', nom:'Zéro', pd:'secr', terrain:false, cases:cases({ com }) }); await L.calme(p, 500);
    await L.aller(p, 'boiteMail'); await L.calme(p, 3000);
    const r = await p.evaluate(RELEVE); const avecBandeau = r.filter(x => x.bandeau), gestes = r.reduce((n, x) => n + x.gestes, 0), liens = r.reduce((n, x) => n + x.liens, 0);
    v(`${nom} : population (${r.length} messages lus, ${avecBandeau.length} avec un bandeau, ${liens} liens)`, r.length >= 5 && avecBandeau.length >= 5 && liens >= 1, r.map(x => x.id + ':' + x.gestes + '/' + x.liens).join(' '));
    if (com === '1000') {
      v(`${nom} : le bandeau ne propose AUCUN geste (${gestes})`, gestes === 0, gestes);
      // la garde tient encore quand le geste vient de l'hôte et non du bouton
      const g = await p.evaluate(async () => { const av = DROITS_REFUS.length, ca = Object.keys(CLIENTS).length, ta = Array.isArray(TACHES) ? TACHES.length : 0;
        courrierAgir('mbx:confier|s:b1:m5', { id:'s:b1:m5' });   /* un geste qui n'écrit QUE dans le courrier : sa case est la seule en cause (tour 3 : « devis » lit désormais la case Devis, pas celle de la Boîte mail) */ await new Promise(z => setTimeout(z, 600)); return { refus:DROITS_REFUS.slice(av).map(o => o.cat + '.' + o.x + ' ' + o.verbe), clients:[ca, Object.keys(CLIENTS).length], panneau:!!document.querySelector('#calque .panneau'), route }; });
      v(`${nom} : un geste lancé par l'hôte (sans bouton) est refusé par la garde`, g.refus.length >= 1 && g.refus.every(o => /^com\./.test(o)) && g.clients[0] === g.clients[1] && !g.panneau && g.route === 'boiteMail', g);
    } else v(`${nom} : les gestes du bandeau sont là (${gestes})`, gestes >= 10, gestes);
    await L.fin(c);
  }
  process.exit(L.bilan ? L.bilan() : 0);
})().catch(e => { console.error(e); process.exit(1); });
