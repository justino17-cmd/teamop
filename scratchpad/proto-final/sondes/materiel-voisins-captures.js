// Matériel, étape 5 — les captures À REGARDER des écrans voisins : la carte « Matériel » de l'Accueil, la carte des pièces prévues d'une fiche (les trois états), la fenêtre « Nouvelle
// intervention » (pièces à prévoir) et la carte « Le matériel, refait » du guide. Usage : node materiel-voisins-captures.js <profil> [nuit] [dossier] → des PNG (hors dépôt) ; on les LIT.
const L = require('../lib.js'), path = require('path');
const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', DIR = process.argv[4] || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel5';
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui:'marc' }), p = c.p, tag = profil + (nuit ? '-nuit' : '-jour'), R = (f, a) => p.evaluate(f, a);
  const snap = async nom => { await L.calme(p, 450); await L.capture(c, path.join(DIR, `v-${nom}-${tag}.png`)); };
  const vers = async sel => { await R(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block:'center' }); }, sel); };
  await L.aller(p, 'accueil'); await vers('[data-vis="accueil-materiel"]'); await snap('1-accueil');
  // trois états sur la fiche de Sophie : prête (celle d'origine), à commander (un article acheté au besoin), en route (une commande confirmée)
  await R(() => { const x = PRODUITS.find(o => !o.retire && !(o.seuil > 0) && enCommande(o) === 0); window.__x = x; window.__q = x.q; x.q = 0; x.loc = {}; const i = INTS.find(o => o.id === 'i2'); window.__p = JSON.stringify(i.prevues);
    const y = PRODUITS.find(o => !o.retire && o.id !== x.id && o.seuil > 0 && enCommande(o) > 0) || PRODUITS.find(o => !o.retire && o.id !== x.id && enCommande(o) > 0);
    i.prevues = [...i.prevues, { nom:x.nom, q:2, pid:x.id }].concat(y ? [{ nom:y.nom, q:1, pid:y.id }] : []); });
  await L.aller(p, 'inter-x-i2'); await vers('[data-vis="inter-pieces"]'); await snap('2-fiche-pieces');
  await R(() => { const i = INTS.find(o => o.id === 'i2'); i.prevues = JSON.parse(window.__p); window.__x.q = window.__q; });
  await L.aller(p, 'planning'); await R(() => ouvrirCreation({ cli:'md' })); await L.calme(p, 600);
  await p.fill('#fenetre [data-cchamp="cpq"]', 'condens'); await R(() => { const e = document.querySelector('#fenetre [data-vis="crea-pieces"]'); if (e) e.scrollIntoView({ block:'center' }); }); await snap('3-creation-pieces');
  await R(() => fermerCreation()); await L.calme(p, 300);
  await R(() => { const b = document.querySelector('[data-nv="ouvrir"]'); if (b) b.click(); else nvOuvrir(); }); await L.calme(p, 500);
  for (let k = 0; k < 6; k++) { if (await R(() => !!document.querySelector('#nv [data-vis="guide-materiel"]'))) break; await R(() => document.querySelector('#nv [data-nv="apres"]').click()); await L.calme(p, 250); }
  await snap('4-guide');
  await L.aller(p, 'planning'); await snap('5-planning');
  console.log('erreurs :', JSON.stringify(c.err)); await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(2); });
