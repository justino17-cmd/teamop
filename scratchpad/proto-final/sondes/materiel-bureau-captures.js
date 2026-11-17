// Matériel, étape 8 — les écrans corrigés de la relecture bureau, CAPTURÉS pour être REGARDÉS (outil Read) : jour ou nuit, un profil.
// Usage : node materiel-bureau-captures.js [profil] [nuit] → fichiers dans le dossier de captures (hors dépôt), « N captures ».
const L = require('../lib.js'), path = require('path');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel-corr/';
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', suf = profil + '-' + (nuit ? 'nuit' : 'jour');
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a); let n = 0;
  const snap = async nom => { await L.calme(p, 450); await L.capture(c, path.join(CAP, nom + '-' + suf + '.png')); n++; };
  await R(() => { SX.bout.find(o => o.id === 'R32-2231').reste = 0.6; rendre(); });
  await L.aller(p, 'boxes'); await snap('depots');
  await L.toucher(c, '[data-md="fiche|v1"]'); await snap('fiche-camion'); await L.ranger(p);
  await L.aller(p, 'stock'); await snap('stock');
  await R(() => matCompter('atelier')); await snap('compter'); await L.ranger(p);
  await L.aller(p, 'produits'); await snap('fournisseurs-commandes');
  await R(() => { prVue = 'fournisseurs'; rendre(); }); await R(() => fournFiche(MES_FOURN.find(f => f.dj === 0 && /Frigo/.test(f.nom)).id)); await snap('fournisseur-comptoir'); await L.ranger(p);
  await R(() => { prVue = 'articles'; rendre(); }); await L.toucher(c, '[data-pr^="nouveau|"]'); await snap('ajouter-article'); await L.ranger(p);
  await L.aller(p, 'achats'); await R(() => { const b = document.querySelector('[data-ac="transfert|da1"]'); if (b) b.scrollIntoView({ block: 'center' }); }); await L.toucher(c, '[data-ac="transfert|da1"]'); await snap('transfert-garage'); await L.ranger(p);
  await L.aller(p, 'accueil'); await snap('accueil');
  console.log(n + ' captures · erreurs de page : ' + c.err.length, c.err.slice(0, 2));
  await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); try { L.fermer(); } catch (x) {} process.exit(1); });
