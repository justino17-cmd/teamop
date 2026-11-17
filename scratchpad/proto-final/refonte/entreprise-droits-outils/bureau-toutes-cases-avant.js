// Sonde de LECTURE, à jouer AVANT le câblage des droits (spécification § 5, `droits-bureau-toutes-cases`, critique du 17 novembre) :
// une personne de la coque « gestion » (Julie) à qui l'on ouvre TOUTES les routes d'équipe, sans toucher au code de la page.
// Question : un écran que cette coque n'a jamais ouvert (Accueil, Statistiques, Historique, Planning, Absences, Boîte mail, Stock,
// Dépôts, Équipe, Temps de travail, Véhicules…) se dessine-t-il sans exception, sans écran vide, sans mot « patron » égaré ?
// Témoin : Marc (coque patron) sur les mêmes routes — une erreur qui est aussi chez lui n'est pas due à la coque.
// ⛔ 127.0.0.1 seulement, entreprise fictive. Usage : timeout 400 node scratchpad/proto-final/refonte/entreprise-droits-outils/bureau-toutes-cases-avant.js
const L = require('../../lib.js'), v = L.v;
const ROUTES = ['accueil', 'statistiques', 'historique', 'planning', 'absences', 'interventions', 'taches', 'clients', 'devis', 'contrats', 'comptabilite', 'boiteMail', 'achats', 'stock', 'produits', 'boxes', 'equipe', 'pointage', 'vehicules'];
(async () => {
  const sortie = {};
  for (const qui of ['marc', 'julie']) {
    const c = await L.ouvrir({ profil: 'mac', qui });
    const erreurs = []; c.p.on('pageerror', e => erreurs.push(String(e.message || e).slice(0, 140)));
    if (qui === 'julie') await c.p.evaluate(() => { ROLES.gestion.routes.push(...['accueil', 'statistiques', 'historique', 'planning', 'absences', 'boiteMail', 'boxes', 'equipe', 'pointage', 'vehicules', 'stock', 'produits']); drRefuse = () => false; });
    sortie[qui] = {};
    for (const r of ROUTES) {
      const n0 = erreurs.length;
      await c.p.evaluate(x => { try { aller(x); } catch (e) { window.__e = String(e.message || e); } }, r); await L.calme(c.p, 500);
      const m = await c.p.evaluate(() => { const e = document.querySelector('#contenu'); const h = location.hash.replace('#', ''); return { hash: h, texte: e ? e.innerText.replace(/\s+/g, ' ').trim().length : -1, titre: (e && e.querySelector('h1') || {}).textContent || '', cadre: !!document.getElementById('cpsys'), jete: window.__e || null }; });
      sortie[qui][r] = { ...m, err: erreurs.slice(n0) }; await c.p.evaluate(() => { window.__e = null; });
    }
    await L.fin(c);
  }
  let n = 0;
  for (const r of ROUTES) { const j = sortie.julie[r], m = sortie.marc[r]; n++;
    console.log(`${r.padEnd(14)} marc: ${m.texte}c « ${m.titre.slice(0, 28)} » ${m.err.length ? 'ERR ' + m.err[0] : ''} | julie: ${j.texte}c « ${j.titre.slice(0, 28)} » #${j.hash} ${j.err.length ? 'ERR ' + j.err[0] : ''}${j.jete ? ' JETÉ ' + j.jete : ''}`);
    // trois écarts NORMAUX, nommés (mesurés le 17 novembre) : « Tâches » s'écrit « Mes tâches » pour le bureau (LIB_ROLE) ; la Comptabilité du bureau
    // s'ouvre dans le cadre plein écran #cpsys (son contenu n'est pas dans #contenu) ; la Boîte mail charge son module en différé (50 signes chez les deux).
    const titreOk = r === 'taches' ? j.titre === 'Mes tâches' : r === 'comptabilite' ? j.cadre : j.titre === m.titre;
    const texteOk = r === 'comptabilite' ? j.cadre : r === 'boiteMail' ? j.texte === m.texte : j.texte > 150;
    v(`${r} : s'ouvre pour la coque « gestion » (même écran que chez le gérant, aucune exception)`, j.err.length === 0 && !j.jete && titreOk && texteOk, { j, m: m.titre }); }
  v('population : 19 routes jouées pour chacune des deux personnes', n === 19, n);
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
