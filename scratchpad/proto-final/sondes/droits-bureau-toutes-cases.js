// LA COQUE « gestion » OUVRE TOUT (version « après » de bureau-toutes-cases-avant.js) : une personne du bureau qui a TOUTES les cases ouvre chaque route d'équipe (0 exception, 0 écran vide), et une personne en
// LECTURE SEULE aussi (le même écran, sans bouton d'écriture). Témoin : le gérant. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, fin } = require('./droits-commun.js');
const CATS = ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'];
const ROUTES = ['accueil', 'statistiques', 'historique', 'planning', 'absences', 'interventions', 'taches', 'clients', 'devis', 'contrats', 'comptabilite', 'boiteMail', 'achats', 'stock', 'produits', 'boxes', 'equipe', 'pointage', 'vehicules', 'entreprise'];
(async () => {
  let n = 0; const pers = [['marc', null], ['complète', { k:'rp', prenom:'Rémi', nom:'Poulain', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, '1111'])), sp:{ atelier:1, valstock:1, commander:1, corrpt:1, comptes:1 } }], ['lecture seule', { k:'lc', prenom:'Lou', nom:'Lecture', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, k === 'temps' || k === 'stock' ? '1101' : '1000'])), sp:{} }], ['sans Supprimer', { k:'ss', prenom:'Sam', nom:'Sansupprimer', pd:'resp', terrain:false, cases:Object.fromEntries(CATS.map(k => [k, k === 'temps' || k === 'stock' ? '1110' : '1000'])), sp:{} }]];
  for (const [nom, def] of pers) {
    const c = def ? await ouvrirComme(def) : await ouvrirComme('marc'); const erreurs = []; c.p.on('pageerror', e => erreurs.push(String(e.message || e).slice(0, 140)));
    for (const r of (nom === 'sans Supprimer' ? ['pointage', 'boxes'] : ROUTES)) {
      const n0 = erreurs.length; await c.p.evaluate(x => { try { fermerPanneau(); aller(x); } catch (e) { window.__e = String(e.message || e); } }, r); await L.calme(c.p, 500);
      const m = await c.p.evaluate(() => { const e = document.querySelector('#contenu'); return { hash:location.hash.slice(1), texte:e ? e.innerText.replace(/\s+/g, ' ').trim().length : -1, titre:(e && e.querySelector('h1') || {}).textContent || '', cadre:!!document.getElementById('cpsys') && !document.getElementById('cpsys').hidden }; }); n++;
      /* restes entreprise, tour 6 : la sonde exigeait « Supprimer » pour Temps de travail et Dépôts et camions (spec § 8.1) ; la page a changé de règle le 17 novembre (equipe-11, décision du chef, ROUTE_CATS) :
         « Voir » décide SEUL si une personne voit une rubrique, retirer « Supprimer » ne cache jamais un écran — les boutons qui écrivent disparaissent, pas la page. La sonde était périmée (défaut dans la SONDE) : celle
         qui n'a pas « Supprimer » ouvre donc ces deux écrans comme les autres, avec leur contenu et sans exception. */
      const ouvre = m.hash === r || (r === 'comptabilite' && m.cadre);
      v(`${nom} · ${r} : s'ouvre, sans exception, avec un contenu`, ouvre && erreurs.length === n0 && (r === 'comptabilite' || r === 'boiteMail' ? true : m.texte > 150), { m, err:erreurs.slice(n0) });
    }
    await L.fin(c);
  }
  v('population : vingt routes pour trois personnes, plus deux routes ouvertes à la quatrième (sans Supprimer, « Voir » suffit)', n === 62, n);
  await fin();
})().catch(e => { console.error(e); process.exit(1); });
