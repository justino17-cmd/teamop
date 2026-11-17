// Parcours J « compta-ventes » : les GESTES MALADROITS. Double toucher sur « Valider et envoyer » et sur « Carte », retour du navigateur depuis une fiche, Échap et la croix
// sur chaque fenêtre, adresse #facture-x-… rechargée, fiche d'une facture qui n'existe pas, annuler au milieu d'une saisie.
// usage : node compta-ventes-parcours-j.js [profil]       « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  // — retour du navigateur depuis une fiche —
  await X.compta(c, 'fventes', { cat: 'ventes' }); await p.evaluate(() => { const b = document.querySelector('[data-cx="doc|fac|f144"]'); if (b) b.click(); }); await L.calme(p, 500);
  const sur = await p.evaluate(() => ({ route, param, hash: location.hash }));
  L.v('toucher une ligne ouvre la fiche FAC-2026-0144 (adresse #facture-x-f144)', sur.route === 'facture' && sur.param === 'f144', sur);
  await p.goBack(); await L.calme(p, 600);
  const retour = await p.evaluate(() => ({ route, onglet: CP.onglet, h1: (document.querySelector('#contenu h1') || {}).textContent }));
  L.v('« Retour » du navigateur ramène à la liste des factures (Comptabilité), pas à l’Accueil', retour.route === 'comptabilite', retour);
  // — adresse rechargée —
  await p.evaluate(() => { location.hash = '#facture-x-f144'; }); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
  const rech = await p.evaluate(() => ({ route, param, h1: (document.querySelector('#contenu h1') || {}).textContent }));
  L.v('l’adresse #facture-x-f144 rechargée rouvre la facture (ou une page propre), sans erreur', rech.route === 'facture' || rech.route === 'accueil' || rech.route === 'comptabilite', rech);
  await p.evaluate(() => { location.hash = '#facture-x-zzz'; }); await L.calme(p, 600);
  const inconnue = await p.evaluate(() => ({ route, h1: (document.querySelector('#contenu h1') || {}).textContent, texte: document.querySelector('#contenu').innerText.slice(0, 80) }));
  L.v('une facture qui n’existe pas ne casse rien : on retombe sur la liste ou un message', !!inconnue.h1 || !!inconnue.texte, inconnue);
  // — double toucher sur « Carte » —
  await X.fiche(c, 'f143'); const d0 = await X.donnees(p);
  await p.locator('[data-payer="f143|Carte"]').first().dblclick(); await p.waitForTimeout(500);
  const d1 = await X.donnees(p); L.v('un double toucher sur « Carte » n’enregistre qu’UN paiement de 114,00 €', d1.E.length === d0.E.length + 1, { avant: d0.E.length, apres: d1.E.length, derniers: d1.E.slice(0, 2) });
  // — double toucher sur « Valider et envoyer » —
  await p.evaluate(() => { FACTURES.unshift({ id: 'fj1', num: '—', cli: 'cm', objet: 'Essai du double toucher', lignes: [{ d: 'Essai', q: '1', pu: 100 }], ht: 0, tva: 20, st: 'avalider', emise: '—', ech: '—' }); });
  const n0 = await p.evaluate(() => numSuiv); await X.fiche(c, 'fj1'); await L.toucher(c, '[data-action="apercuEnvoi"]');
  await p.locator('#calque [data-action="envoyer"]').first().dblclick().catch(() => {}); await p.waitForTimeout(600);
  const n1 = await p.evaluate(() => ({ numSuiv, nb: FACTURES.filter(f => f.objet === 'Essai du double toucher').length, num: FACTURES.find(f => f.id === 'fj1').num }));
  L.v('un double toucher sur « Valider et envoyer » donne UN numéro (le suivant), pas deux', n1.numSuiv === n0 + 1 && n1.nb === 1, { n0, n1 });
  // — Échap et la croix sur chaque fenêtre —
  for (const [nom, ouvre] of [['Ajouter', () => X.compta(c, 'fventes', { cat: 'ventes' }).then(() => L.toucher(c, '[data-cx="nouveau"]'))], ['Relancer', () => X.fiche(c, 'f128').then(() => L.toucher(c, '[data-action="relance"]'))], ['Paiement en partie', () => X.fiche(c, 'f128').then(() => L.toucher(c, '[data-action="partiel"]'))], ['Faire un avoir', () => X.fiche(c, 'f140').then(() => L.toucher(c, '[data-action="avoir"]'))], ['Paiement reçu', () => X.compta(c, 'paiements').then(() => L.toucher(c, '[data-action="ajoutEnc"]'))]]) {
    await ouvre(); const ouverte = await p.evaluate(() => !!document.querySelector('#calque .panneau'));
    await p.keyboard.press('Escape'); await L.calme(p, 400); const apresEsc = await p.evaluate(() => !!document.querySelector('#calque .panneau'));
    L.v(`« ${nom} » : la fenêtre s’ouvre (population) et Échap la ferme`, ouverte && !apresEsc, { ouverte, apresEsc });
    await ouvre(); await L.toucher(c, '#calque .x, #calque [data-ferme].x, #calque button[aria-label*="ermer"]'); await L.calme(p, 400);
    const apresX = await p.evaluate(() => !!document.querySelector('#calque .panneau'));
    L.v(`« ${nom} » : la croix la ferme`, !apresX, apresX);
    const donnees = await X.donnees(p); L.v(`« ${nom} » : fermée sans rien enregistrer (aucun nouveau paiement ni avoir)`, donnees.E.length === d1.E.length && !donnees.F.some(f => f.st === 'avoir' && f.id.startsWith('av')), donnees.E.length);
  }
  // — annuler au milieu d'une nouvelle facture : rien n'est créé —
  await X.compta(c, 'fventes', { cat: 'ventes' }); const nF = (await X.donnees(p)).F.length; await L.toucher(c, '[data-cx="nouveau"]'); await L.toucher(c, '#calque [data-cx="facture"]'); await X.saisir(c, '#nf-d', 'Essai annulé'); await X.saisir(c, '#nf-p', '10'); await L.toucher(c, '#calque [data-ferme="1"].btn'); await L.calme(p, 400);
  L.v('annuler au milieu d’une nouvelle facture ne crée rien', (await X.donnees(p)).F.length === nF, (await X.donnees(p)).F.length - nF);
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
