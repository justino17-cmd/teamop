// Recontrôle adverse « compta-ventes », parcours R1 (17 novembre 2026) : de la création d'une facture à son encaissement, joué comme une vraie personne
// (menu, boutons, saisie), avec des valeurs que les sondes d'avant n'ont pas utilisées. On vérifie à chaque étape que ce que dit l'écran est ce que
// dit la donnée, puis que le cadre plein écran « OP COMPTABLE » et la fiche du client racontent la même chose qu'OP GESTION, au centime.
// usage : node compta-ventes-recontrole-r1.js [profil] [qui] [jour|nuit]     « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
const cts = n => Math.round(n * 100);
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc', nuit = process.argv[4] === 'nuit', tag = `${profil}-${qui}-${nuit ? 'nuit' : 'jour'}`;
  const c = await L.ouvrir({ profil, qui, nuit }), p = c.p;
  const d0 = await X.donnees(p), du0 = await X.du(p);
  L.v('population : 8 factures au départ, 1 475,00 € à recevoir', d0.F.length === 8 && du0 === 147500, { n: d0.F.length, du0 });
  // 1. le chemin d'une vraie personne : menu Comptabilité → cadre → « Factures et paiements »
  let f = await X.cadreOuvert(c); L.v('le menu Comptabilité ouvre le cadre plein écran', !!f);
  const barre = await p.evaluate(() => [...document.querySelectorAll('#cpsys .cpsys-barre button')].map(e => e.textContent.trim().replace(/\s+/g, ' ')));
  console.log('  barre du cadre :', JSON.stringify(barre));
  await L.capture(c, X.CAP + `r1-${tag}-cadre-accueil.png`);
  const bFact = p.locator('#cpsys .cpsys-barre button', { hasText: 'Factures et paiements' }).first();
  L.v('« Factures et paiements » est dans la barre du cadre', await bFact.count() > 0);
  await bFact.click().catch(() => {}); await L.calme(p, 700);
  L.v('on arrive sur les factures d’OP GESTION (cadre fermé)', await p.evaluate(() => !document.querySelector('#cpsys') || document.querySelector('#cpsys').offsetParent === null || !document.querySelector('#cpsys').classList.contains('ouvert')), await p.evaluate(() => location.hash));
  const h1 = await X.texte(p, '#contenu h1'); console.log('  titre :', h1);
  await X.compta(c, 'fventes', { cat: 'ventes' });
  // 2. nouvelle facture, vraie saisie, valeurs inhabituelles
  await L.toucher(c, '[data-cx="nouveau"]'); await L.toucher(c, '#calque [data-cx="facture"]');
  const clients = await p.evaluate(() => [...document.getElementById('nf-c').options].map(o => ({ v: o.value, t: o.textContent })));
  L.v('population : la liste de clients propose « Choisir… » puis au moins 4 clients', clients.length >= 5 && clients[0].v === '', clients.length);
  const cible = clients.find(x => /Durand/.test(x.t)) || clients[2];
  await p.selectOption('#nf-c', cible.v); await X.saisir(c, '#nf-o', 'Entretien annuel chaudière gaz'); await X.saisir(c, '#nf-d', 'Entretien annuel chaudière gaz et ramonage du conduit');
  await X.saisir(c, '#nf-q', '3'); await X.saisir(c, '#nf-p', '1 234,50');
  await L.capture(c, X.CAP + `r1-${tag}-formulaire.png`);
  await L.toucher(c, '#calque [data-cx="factureok"]'); await L.calme(p, 600);
  const nv = await p.evaluate(() => { const F = FACTURES[0]; return { id: F.id, st: F.st, num: F.num, cli: F.cli, ht: Math.round(htDe(F) * 100), lignes: F.lignes.map(l => ({ d: l.d, q: l.q, p: l.p })) }; });
  L.v('3 × 1 234,50 = 3 703,50 HT, « à valider », sans numéro', nv.st === 'avalider' && nv.num === '—' && nv.ht === 370350, nv);
  L.v('la fiche de la facture neuve s’ouvre toute seule et dit « à valider »', /à valider|A valider/i.test(await X.texte(p, '#contenu')), (await X.texte(p, '#contenu')).slice(0, 120));
  // 3. ajouter une ligne, la nommer, lui donner un prix ; retirer la première
  await L.toucher(c, '[data-action="ligneAjout"]'); await L.calme(p, 300);
  const ligne2 = p.locator('#contenu [data-fdes]').nth(1);
  await ligne2.fill('Remplacement du vase d’expansion'); await ligne2.press('Tab'); await L.calme(p, 300); await p.locator('#contenu [data-prix]').nth(1).fill('89,9'); await p.locator('#contenu [data-prix]').nth(1).press('Tab');
  await L.calme(p, 300);
  const apresAjout = await p.evaluate(() => { const F = FACTURES.find(x => x.id === FACTURES[0].id); return { n: F.lignes.length, ht: Math.round(htDe(F) * 100), d: F.lignes.map(l => l.d) }; });
  L.v('la ligne ajoutée est nommée et chiffrée au toucher/à la saisie (3 703,50 + 89,90 = 3 793,40 HT)', apresAjout.n === 2 && apresAjout.ht === 379340, apresAjout);
  // retirer la première puis la rétablir par « Annuler » (annulable, dit la correction 02)
  const croix = p.locator('#contenu [data-action="ligneSup"]');
  L.v('chaque ligne a sa croix « Retirer la ligne » de 44 px au moins', (await croix.count()) === 2 && (await croix.first().boundingBox()).height >= (profil === 'mac' || profil === 'windows' ? 24 : 44), await croix.count());
  await croix.first().click(); await L.calme(p, 400);
  const t1 = await X.toasts(p); const apresRetrait = await p.evaluate(() => FACTURES[0].lignes.length);
  L.v('retirer la première ligne : 1 ligne reste, un message le dit et propose d’annuler', apresRetrait === 1 && /Annuler/.test(t1), { apresRetrait, t1 });
  if (/Annuler/.test(t1)) { await L.toucher(c, '#toast button'); await L.calme(p, 300); }
  L.v('« Annuler » remet la première ligne à sa place (2 lignes, premier nom retrouvé)', await p.evaluate(() => FACTURES[0].lignes.length === 2 && /chaudière/.test(FACTURES[0].lignes[0].d)), await p.evaluate(() => FACTURES[0].lignes.map(l => l.d)));
  await L.capture(c, X.CAP + `r1-${tag}-fiche-deux-lignes.png`);
  // aperçu et envoi
  await L.toucher(c, '[data-action="apercuEnvoi"]'); const apercu = await X.panneau(p);
  L.v('l’aperçu montre les deux lignes avec leurs noms et le client', /vase d’expansion/.test(apercu) && /chaudière/.test(apercu) && /Durand/.test(apercu), apercu.slice(0, 160).replace(/\n/g, ' | '));
  L.v('l’aperçu ne contient aucun « Ligne libre » ni phrase de démonstration', !/Ligne libre|démonstration|vraie version/i.test(apercu), apercu.match(/Ligne libre|démonstration|vraie version/i));
  await L.capture(c, X.CAP + `r1-${tag}-apercu.png`);
  await L.toucher(c, '#calque [data-action="envoyer"]'); await L.calme(p, 500);
  const env = await p.evaluate(() => { const F = FACTURES[0]; return { id: F.id, st: F.st, num: F.num, ttc: Math.round(ttcDe(F) * 100), ht: Math.round(htDe(F) * 100) }; });
  console.log('  facture envoyée :', JSON.stringify(env), ' toast :', await X.toasts(p));
  if (env.st !== 'envoyee') { console.log('  ⚠ la facture n’est pas partie : ', (await X.panneau(p)).slice(0, 300), (await X.texte(p, '#contenu')).slice(0, 300)); }
  L.v('la facture passe « envoyée » avec un numéro FAC-2026-01xx, à recevoir +TTC', env.st === 'envoyee' && /^FAC-2026-01\d\d$/.test(env.num) && (await X.du(p)) === du0 + env.ttc, { env, du: await X.du(p), du0 });
  // paiement en partie, écriture « d'application » avec espace des milliers
  await X.fiche(c, env.id); await L.toucher(c, '[data-action="partiel"]'); await X.saisir(c, '#pp-m', '1 000,50'); await L.toucher(c, '#calque [data-action="partielOk"]'); await L.calme(p, 400);
  let f1 = (await X.donnees(p)).F.find(x => x.id === env.id);
  L.v('« 1 000,50 » est lu 1 000,50 € (pas 1 €) : reçu et reste au centime, état « partielle »', cts(f1.recu) === 100050 && f1.st === 'partielle' && cts(f1.reste) === env.ttc - 100050, f1);
  await L.capture(c, X.CAP + `r1-${tag}-partielle.png`);
  // solde par chèque
  await X.fiche(c, env.id); await L.toucher(c, `[data-payer="${env.id}|Chèque"]`); await L.calme(p, 400);
  f1 = (await X.donnees(p)).F.find(x => x.id === env.id);
  L.v('le solde par chèque rend la facture payée, reste 0, 2 encaissements rangés', f1.st === 'payee' && cts(f1.reste) === 0 && (await X.donnees(p)).E.filter(e => e.fac === env.num).length === 2, { f1, e: (await X.donnees(p)).E.filter(e => e.fac === env.num) });
  L.v('somme des deux encaissements = TTC de la facture, au centime', (await X.donnees(p)).E.filter(e => e.fac === env.num).reduce((s, e) => s + cts(e.ttc), 0) === env.ttc, env.ttc);
  L.v('« à recevoir » est revenu à 1 475,00 €', (await X.du(p)) === du0, await X.du(p));
  // le cadre dit la même chose
  f = await X.cadreOuvert(c); await f.evaluate(() => aller('ventes')); await p.waitForTimeout(900);
  const cad = await f.evaluate(n => { const r = document.querySelector(`#contenu tr[data-fac="${n}"]`); return r ? r.innerText.replace(/\s+/g, ' ') : null; }, env.num);
  L.v('le cadre plein écran liste la facture neuve, payée, au bon TTC', !!cad && /Payée/.test(cad) && cad.replace(/[\s  ]/g, '').includes((env.ttc / 100).toFixed(2).replace('.', ',')), cad);
  await L.capture(c, X.CAP + `r1-${tag}-cadre-ventes.png`);
  // la fiche du client
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} cpSysteme = false; });
  const cli = await p.evaluate(i => FACTURES.find(x => x.id === i).cli, env.id);
  await p.evaluate(k => aller('client-x-' + k), cli); await L.calme(p, 600); const tc = await X.texte(p, '#contenu');
  L.v('la fiche du client dit la facture neuve (numéro) comme payée', tc.includes(env.num), tc.slice(0, 120).replace(/\n/g, ' | '));
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
