// Matériel, étape 4 (Fournisseurs, matériel & produits) — les captures À REGARDER : les trois onglets, chaque fiche et chaque feuille, sur un profil, de jour ou de nuit.
// Usage : node materiel-four-captures.js <profil> [nuit] [dossier]   → des PNG dans le dossier (hors dépôt) ; rien à conclure ici : ON LES LIT (outil Read).
const L = require('../lib.js'), path = require('path');
const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', DIR = process.argv[4] || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel4';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui:'marc' }), p = c.p, tag = profil + (nuit ? '-nuit' : '-jour');
  const snap = async nom => { await L.calme(p, 450); await L.capture(c, path.join(DIR, `f-${nom}-${tag}.png`)); };
  const R = (f, a) => p.evaluate(f, a), clic = s => p.evaluate(x => { const e = document.querySelector(x); if (e) e.click(); return !!e; }, s);
  const bas = () => R(() => { const e = document.querySelector('#calque .panneau'); if (e) e.scrollTop = 9999; else window.scrollTo(0, 99999); }), haut = () => R(() => { const e = document.querySelector('#calque .panneau'); if (e) e.scrollTop = 0; else window.scrollTo(0, 0); });
  await L.aller(p, 'produits'); await R(() => { prVue = 'commandes'; rendre(); }); await snap('1-commandes');
  await bas(); await snap('1b-commandes-bas'); await haut();
  await clic('[data-fx="plus"]'); await snap('1c-menu-plus'); await L.ranger(p);
  await R(() => { prVue = 'articles'; rendre(); }); await snap('2-articles'); await bas(); await snap('2b-articles-bas'); await haut();
  await clic('[data-fx="filtre"]'); await snap('2c-filtre'); await L.ranger(p);
  await R(() => { prQ = 'condens'; rendre(); }); await snap('2d-recherche'); await R(() => { prQ = 'zzzzz'; rendre(); }); await snap('2e-rien'); await R(() => { prQ = ''; rendre(); });
  await R(() => { prVue = 'fournisseurs'; rendre(); }); await snap('3-fournisseurs'); await bas(); await snap('3b-four-bas'); await haut();
  await R(() => fournFiche('cpa')); await snap('4-fiche-four'); await bas(); await snap('4b-fiche-bas'); await haut(); await L.ranger(p);
  await R(() => fournFiche('fd')); await snap('4c-fiche-comptoir'); await L.ranger(p);
  await R(() => { FX.ajTab = 'liste'; fournListe(); }); await snap('5-ajouter-liste'); await R(() => { FX.ajTab = 'autre'; fournListe(); }); await snap('5b-ajouter-autre'); await L.ranger(p);
  await R(() => cmdPreparer('Clim Pièces Atlantique')); await snap('6-bon'); await bas(); await snap('6b-bon-bas'); await L.ranger(p);
  await R(() => cmdFiche('c39')); await snap('7-commande-confirmee'); await bas(); await snap('7b-commande-bas'); await haut(); await clic('[data-fx^="cplus|"]'); await snap('7c-menu-commande'); await L.ranger(p);
  await R(() => cmdFiche('c36')); await snap('8-commande-facture'); await L.ranger(p);
  await R(() => cmdFiche('c38')); await snap('8b-commande-partielle'); await L.ranger(p);
  await R(() => cmdReception('c38')); await snap('9-recevoir'); await bas(); await snap('9b-recevoir-bas'); await L.ranger(p);
  await R(() => cmdRappro('c36')); await snap('10-comparer'); await L.ranger(p);
  await R(() => fournTarifs('cpa')); await snap('11-import'); await L.ranger(p);
  await R(() => fournFacture('')); await snap('12-photo-facture'); await L.ranger(p);
  await R(() => { window.__M = MES_FOURN.splice(0); rendre(); }); await R(() => { prVue = 'fournisseurs'; rendre(); }); await snap('13-aucun-fournisseur'); await R(() => { MES_FOURN.push(...window.__M); rendre(); });
  console.log('erreurs :', JSON.stringify(c.err)); await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(2); });
