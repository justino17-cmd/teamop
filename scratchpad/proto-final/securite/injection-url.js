// SONDE « injection par l'adresse » (audit de sécurité, angle injection, 17 novembre 2026) : ce que l'adresse de la page peut faire écrire à l'écran.
// L'application lit son écran dans le fragment (#client-x-…, #inter-x-…), et ses liens dans la requête (?auto=, ?lien=, ?app=) : on y met une
// charge numérotée, on regarde si elle sort de son texte ou exécute du code. Usage : node injection-url.js
process.env.RACINE = require('./injection-instr.js').preparer();
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', init: O.INIT, guide: false, attente: 1500 }); const { p } = c; p.on('dialog', d => d.dismiss().catch(() => {}));
  const SANS = id => `${id}'"><img/src=x/onerror=__xss('${id}')>`, SIMPLE = id => `${id}'+__xss('${id}')+'`, FAM = ['client', 'inter', 'facture', 'devis', 'contrat', 'signer', 'fournisseur', 'produit', 'box', 'vehicule', 'planning', 'taches', 'equipe', 'comptabilite', 'inconnu'];
  let n = 0, essais = 0, sorties = [], enc = 0; const legende = {};
  for (const f of FAM) for (const [nom, fab] of [['guillemets', SANS], ['apostrophes', SIMPLE]]) { const id = 'n' + (++n); legende[id] = `#${f}-x-<${nom}>`; essais++;
    try { await p.evaluate(h => { location.hash = h; }, `${f}-x-${fab(id)}`); await L.calme(p, 450); for (const fr of p.frames()) { const r = await fr.evaluate(O.LIRE).catch(() => null); if (r) r.sorti.forEach(s => sorties.push({ ...s, par: legende[id] })); } } catch (e) {} }
  // la même charge dans la requête : ?lien=, ?auto= (l'application les lit par une expression régulière stricte : on le vérifie)
  for (const q of ['lien', 'auto', 'app']) { const id = 'n' + (++n); legende[id] = '?' + q + '=<charge>'; essais++; const port = c.port;
    try { await p.goto(`http://127.0.0.1:${port}/apercu/prototype-op-gestion.html?app=1&${q}=${encodeURIComponent(SANS(id))}#accueil`, { waitUntil: 'load', timeout: 30000 }); await p.waitForTimeout(1200); for (const fr of p.frames()) { const r = await fr.evaluate(O.LIRE).catch(() => null); if (r) r.sorti.forEach(s => sorties.push({ ...s, par: legende[id] })); } } catch (e) {} }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice()).catch(() => []);
  console.log(`essais : ${essais} adresses · exécutions : ${hits.length} · sorties : ${sorties.length}`); sorties.slice(0, 12).forEach(s => console.log('  SORTIE', s.sorte, 'par', s.par));
  L.v('population : des adresses ont été essayées', essais >= 30, essais); L.v(`aucune charge d'adresse n'est sortie de son texte (${sorties.length})`, sorties.length === 0, sorties.slice(0, 3)); L.v(`aucune charge d'adresse n'a exécuté de code (${hits.length})`, hits.length === 0, hits.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
