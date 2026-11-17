// UNE CATÉGORIE À MOITIÉ OUVERTE se dit : pour chaque combinaison partielle des cases c / m / s ayant un geste, le pied de l'écran existe et nomme EXACTEMENT les verbes absents (deux au plus) ;
// avec toutes les cases il n'existe pas, avec aucune c'est la phrase « Tu peux regarder cet écran, pas le modifier ». Le prénom est celui du premier administrateur actif. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const ECRANS = { clients:'crm', devis:'ventes', achats:'achats', stock:'stock', interventions:'inter', absences:'planif', vehicules:'temps' };   // route → catégorie (celle que la table donne en premier)
const TOUT = Object.fromEntries(['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'].map(k => [k, '1111']));
(async () => {
  let nComb = 0, nExiste = 0, nAbsent = 0;
  const c = await ouvrirComme({ k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases:TOUT, sp:{ atelier:1, valstock:1, commander:1, corrpt:1, comptes:1 } });
  for (const [route, cat] of Object.entries(ECRANS)) {
    const actifs = await c.p.evaluate(k => ['c', 'm', 's'].filter(x => droitCaseActive(k, x)), cat);
    const combos = []; for (let n = 0; n < (1 << actifs.length); n++) combos.push(actifs.filter((_, i) => n & (1 << i)));   // les cases ACCORDÉES
    for (const ok of combos) {
      const r = await c.p.evaluate(([k, ok, actifs, route]) => { const d = { v:1, c:0, m:0, s:0 }; ok.forEach(x => d[x] = 1); if (!actifs.includes('c')) d.c = 1; if (!actifs.includes('m')) d.m = 1; if (!actifs.includes('s')) d.s = 1; eqDe('rp').droits.cats[k] = d; if (route === 'vehicules') eqDe('rp').droits.cats.temps = d; aller(route); return new Promise(res => setTimeout(() => res({ note:(document.querySelector('.droits-note') || {}).textContent || '', role:(document.querySelector('.droits-note') || {}).getAttribute ? document.querySelector('.droits-note').getAttribute('role') : '' }), 700)); }, [cat, ok, actifs, route]);
      nComb++; const manque = actifs.filter(x => !ok.includes(x)); const noms = { c:'créer', m:'modifier', s:'supprimer' };
      if (!manque.length) { nAbsent++; v(`${route} avec ${actifs.join('+') || '—'} : toutes les cases, aucune ligne`, r.note === '', r.note); }
      else if (manque.length === actifs.length) { nExiste++; v(`${route} sans ${manque.join('/')} : la phrase de lecture seule, avec le prénom du gérant`, /^Tu peux regarder cet écran, pas le modifier\. Pour changer quelque chose, demande à Marc\.$/.test(r.note), r.note); }
      else { nExiste++; const mots = manque.map(x => noms[x]); const att = `Dans cette rubrique, ton compte ne peut pas ${mots.length === 1 ? mots[0] : mots.slice(0, -1).join(', ') + ' ou ' + mots[mots.length - 1]}. Pour changer ça, demande à Marc.`; v(`${route} sans ${manque.join('+')} : « ne peut pas ${mots.join(' ni ')} »`, r.note === att, { r, att }); }
    }
    await c.p.evaluate(k => { eqDe('rp').droits.cats[k] = { v:1, c:1, m:1, s:1 }; if (k === 'temps') {} }, cat);
  }
  v('population : des combinaisons jouées pour sept écrans, avec ligne et sans ligne', nComb >= 20 && nExiste >= 10 && nAbsent >= 5, { nComb, nExiste, nAbsent });
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2));
  await L.fin(c); await fin();
})().catch(e => { console.error(e); process.exit(1); });
