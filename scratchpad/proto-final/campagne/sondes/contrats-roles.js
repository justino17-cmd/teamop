// Les AUTRES rôles devant les contrats : qui voit « Contrats » au menu, qui l'ouvre par l'adresse, qui crée, qui voit une fiche ou la
// page de signature ; et le CLIENT, qui lit « Mon contrat » et signe le sien. Le menu de chacun se déduit de ses cases « Voir ».
// usage : node contrats-roles.js [profil]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const vue = async (c, h) => { await L.aller(c.p, h); const e = await O.lire(c.p); return { h1: e.h1, hash: e.hash, long: e.long }; };
  for (const qui of ['julie', 'kb', 'sm']) {
    const c = await L.ouvrir({ profil, qui }); const p = c.p;
    const droit = await p.evaluate(() => ({ role: ROLE, voit: rlPermis('contrats'), menu: !!document.querySelector('#menu [data-go="contrats"], nav [data-go="contrats"], [data-go="contrats"]') }));
    console.log(`\n── ${qui} :`, JSON.stringify(droit));
    const liste = await vue(c, 'contrats'), fiche = await vue(c, 'contrat-x-c1'), nouv = await vue(c, 'contrat-nouveau'), sign = await vue(c, 'signer-x-c3');
    console.log('  · liste', JSON.stringify(liste), '\n  · fiche', JSON.stringify(fiche), '\n  · nouveau', JSON.stringify(nouv), '\n  · signature', JSON.stringify(sign));
    if (droit.voit) {
      v(`R-${qui} : voit « Contrats » au menu ET l'ouvre`, droit.menu && /Contrats/.test(liste.h1), [droit, liste]);
      await L.aller(p, 'contrats'); const bt = await p.evaluate(() => [...document.querySelectorAll('#contenu .actions button')].map(b => b.innerText.trim()));
      console.log('  · boutons de la liste :', JSON.stringify(bt));
      await L.capture(c, O.CAP + `R-${qui}-liste-${profil}.png`);
    } else {
      v(`R-${qui} : sans le droit : pas de « Contrats » au menu`, !droit.menu, droit);
      v(`R-${qui} : sans le droit : l'adresse #contrats n'ouvre pas la liste`, !/^Contrats$/.test(liste.h1), liste);
      v(`R-${qui} : sans le droit : l'adresse d'une fiche n'ouvre pas le contrat`, !/CTR-/.test(fiche.h1), fiche);
      v(`R-${qui} : sans le droit : l'adresse « nouveau contrat » n'ouvre pas le formulaire`, !/chaudière|Climatisation|Plomberie|entretien/i.test(nouv.h1), nouv);
    }
    v(`R-${qui} : aucune erreur de la page`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // le client : prototype nu, bande « Tester en tant que », puis comme le fait le code
  const c = await L.ouvrir({ profil, app: false }); const p = c.p;
  await p.evaluate(() => rlChanger('client', { cli: 'cm' })); await L.calme(p, 600);
  const e0 = await O.lire(p); console.log('\n── client (Cabinet dentaire Martin) :', JSON.stringify(e0));
  const nav = await p.evaluate(() => [...document.querySelectorAll('[data-go]')].filter(b => b.offsetParent).map(b => b.dataset.go + '|' + b.innerText.trim().slice(0, 24)).slice(0, 14)); console.log('  · navigation :', JSON.stringify(nav));
  await L.capture(c, O.CAP + `R-client-accueil-${profil}.png`);
  await p.evaluate(() => aller('contrats')); await L.calme(p, 500); const ec = await O.lire(p);
  const txt = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' ').trim().slice(0, 500)); console.log('  · « Mon contrat » :', JSON.stringify(ec), '\n   ', txt);
  await L.capture(c, O.CAP + `R-client-moncontrat-${profil}.png`);
  v('R-client : « Mon contrat » parle du contrat de ce client (CTR-2026-011)', /CTR-2026-011/.test(txt), txt);
  v('R-client : « Mon contrat » ne montre pas le contrat d’un autre client', !/CTR-2026-004|CTR-2026-007/.test(txt), txt);
  const gs = await L.gestes(p, '#contenu'); console.log('  · gestes du client :', JSON.stringify(gs.map(g => g.lib.slice(0, 30) + '|' + g.data.slice(0, 30))));
  console.log('err', c.err.length, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
