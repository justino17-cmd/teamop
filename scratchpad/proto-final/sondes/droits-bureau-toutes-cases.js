// LA COQUE « gestion » OUVRE TOUT (version « après » de bureau-toutes-cases-avant.js) : une personne du bureau qui a TOUTES les cases ouvre chaque route d'équipe (0 exception, 0 écran vide), et une personne en
// LECTURE SEULE aussi (le même écran, sans bouton d'écriture). Témoin : le gérant. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
const ROUTES = ['accueil', 'statistiques', 'historique', 'planning', 'absences', 'interventions', 'taches', 'clients', 'devis', 'contrats', 'comptabilite', 'boiteMail', 'achats', 'stock', 'produits', 'boxes', 'equipe', 'pointage', 'vehicules', 'entreprise'];
(async () => {
  let n = 0; const pers = [['marc', null], ['complète', { k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, '1111'])), sp:{ atelier:1, valstock:1, commander:1, corrpt:1, comptes:1 } }], ['lecture seule', { k:'lc', prenom:'Lou', nom:'Lecture', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, k === 'temps' || k === 'stock' ? '1101' : '1000'])), sp:{} }]];
  for (const [nom, def] of pers) {
    const c = def ? await ouvrirComme(def) : await ouvrirComme('marc'); const erreurs = []; c.p.on('pageerror', e => erreurs.push(String(e.message || e).slice(0, 140)));
    for (const r of ROUTES) {
      const n0 = erreurs.length; await c.p.evaluate(x => { try { fermerPanneau(); aller(x); } catch (e) { window.__e = String(e.message || e); } }, r); await L.calme(c.p, 500);
      const m = await c.p.evaluate(() => { const e = document.querySelector('#contenu'); return { hash:location.hash.slice(1), texte:e ? e.innerText.replace(/\s+/g, ' ').trim().length : -1, titre:(e && e.querySelector('h1') || {}).textContent || '', cadre:!!document.getElementById('cpsys') && !document.getElementById('cpsys').hidden }; }); n++;
      const ouvre = m.hash === r || (r === 'comptabilite' && m.cadre); const ferme = (nom === 'lecture seule' && ['pointage', 'boxes'].includes(r)) ? 'fermé par « Supprimer » (voulu)' : null;
      if (ferme) { v(`${nom} · ${r} : ${ferme}`, !ouvre, m); continue; }
      v(`${nom} · ${r} : s'ouvre, sans exception, avec un contenu`, ouvre && erreurs.length === n0 && (r === 'comptabilite' || r === 'boiteMail' ? true : m.texte > 150), { m, err:erreurs.slice(n0) });
    }
    await L.fin(c);
  }
  v('population : vingt routes pour trois personnes', n === 60, n);
  await fin();
})().catch(e => { console.error(e); process.exit(1); });
