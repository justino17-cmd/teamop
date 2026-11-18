// RECONTRÔLE ADVERSE DE « UNE SEMAINE DE L'ENTREPRISE » (18 novembre 2026, voie final-parcours, étape 2/2).
// Les sondes parcours-1 à 12 jouent des valeurs RONDES (65 €, 2 filtres, « 58,40 »). Ici on rejoue à la main, avec d'AUTRES valeurs
// (prix à virgule, quantité 2,5, client au nom long avec apostrophe, « < » et « & »), puis trois parcours que personne n'avait joués.
//   R=1 : parcours 1 rejoué — client au nom long (apostrophe, « & », guillemets), quantité 2,5, quantité avec unité « 0,5 L », prix 12,49
//   R=2 : parcours 5 rejoué — notes de frais à valeurs ingrates (17,35 · 1 234,56 · « 9.40 » · « 12,5 € »), doublon, montants illisibles
//   R=3 : parcours 6 rejoué — congé de 5 jours pour 3 de solde, refus avec une raison à apostrophe, nouvelle demande sur des jours chargés
//   R=4 : NOUVEAU — intervention annulée après le départ des pièces  ⛔ ROUGE (7 ✗) TANT QUE LES TROIS DÉFAUTS DE L'ANNULATION NE SONT PAS CORRIGÉS
//   R=5 : NOUVEAU — une facture payée en deux fois (chèque au bureau puis carte du client)
//   R=6 : NOUVEAU — un devis refusé par le client, refait moins cher, signé
//   R=7 : NOUVEAU — une facture payée en partie puis annulée par un avoir (le trop-perçu à rembourser)
// Réglages : R=1,5 (plusieurs sections), PROFIL=mac|iphone|android… NUIT=1. Les contrôles « (constat, DOUTE n) » fixent le comportement d'AUJOURD'HUI d'un point soumis à Justin :
// s'il change, le contrôle tombe et on le relit. Contre-épreuve : mutations-recontrole-parcours.sh. Livrable : final/parcours-recontrole.json.
// ⛔ 127.0.0.1 seulement, entreprise fictive. Chaque contrôle prouve d'abord sa population. Rend « N ✓ · M ✗ » et sort en 1 si un contrôle tombe.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const R = process.env.R || '1';
const FERMER_FEUILLE = c => S(c, () => { const b = document.querySelector('#calque [data-ferme]'); if (b) b.click(); });
const toast = c => S(c, () => ((document.getElementById('toast') || {}).innerText || '').replace(/\s+/g, ' ').trim());
const NOM_LONG = 'Établissements d’Aubigné & Fils — Résidence « Les Mouettes » <i>SARL</i> (Saint-Jean-d’Angély)';
const SECTIONS = {};

/* ───────── R1 : le parcours 1 avec des valeurs ingrates ───────── */
SECTIONS['1'] = async () => {
  const c = await P.demarrer(), p = c.p;
  // le nom du client : long, avec apostrophe typographique, « & », guillemets français et une balise
  await L.aller(p, 'client-x-hp'); await clic(c, '[data-oc="infos"]');
  await p.locator('[data-ci="nom"]').fill(NOM_LONG); await clic(c, '[data-action="clientEnreg"]'); await p.waitForTimeout(500);
  const nom = await S(c, () => CLIENTS.hp.nom);
  v('R1-0 population : le client « hp » porte un nom de plus de 80 signes, avec son apostrophe, son « & » et ses guillemets ; les « < » « > » sont retirés (aucune balise ne reste)', nom.length > 80 && nom.includes('d’Aubigné & Fils') && nom.includes('« Les Mouettes »') && !/[<>]/.test(nom), nom);
  console.log('   nom enregistré :', JSON.stringify(nom), '| toast :', net(await toast(c)));
  // le courriel → l'intervention
  await L.aller(p, 'boiteMail'); await L.attendre(p, () => !!(window.R && window.R() && window.R().querySelectorAll('.msg').length), 9000); await p.waitForTimeout(600);
  const msg = p.locator('#courrier-hote .msg', { hasText:'Climatisation chambre 214' }).first();
  if (c.doigt) await msg.tap(); else await msg.click(); await p.waitForTimeout(800);
  const bt = p.locator('#courrier-hote .hband button', { hasText:'Créer l’intervention' }).first();
  if (c.doigt) await bt.tap(); else await bt.click(); await p.waitForTimeout(900);
  await S(c, () => document.querySelector('.fen [data-cfact="temps"]').click()); await p.waitForTimeout(250);
  await S(c, () => document.querySelector('.fen [data-action="cPlusTot"]').click()); await p.waitForTimeout(300);
  const fenTxt = net(await txt(c, '.fen'));
  v('R1-1 (écran) la fenêtre de création écrit le nom long en texte, entier', fenTxt.includes('Établissements d’Aubigné & Fils') && !/<i>/.test(fenTxt) || /<i>SARL<\/i>/.test(fenTxt), fenTxt.slice(0, 300));
  await cap(c, 'rc1-fenetre-' + P.PROFIL);
  await S(c, () => document.querySelector('.fen [data-action="cCreer"]').click()); await p.waitForTimeout(1000);
  const id = await S(c, () => INTS[INTS.length - 1].id);
  await L.aller(p, 'inter-x-' + id); await clic(c, '[data-action="modifInt"]');
  await p.fill('#m-d', '2026-10-31'); await p.fill('#m-h', '11:00'); await clic(c, '[data-action="modifIntOk"]'); await p.waitForTimeout(500);
  // la technicienne : une pièce du catalogue à 2,5 ET une pièce « avec unité »
  await P.passer(c, 'sm', 'majournee'); await clic(c, '[data-rl="go|inter-x-' + id + '"]');
  const px = await S(c, () => ({ cat:CATALOGUE.filter(x => /filtre/i.test(x[0])).map(x => [x[0], x[1]]), bord:PRODUITS.find(x => x.id === 'p1').loc.v1 }));
  await p.fill('#p-nom', 'Filtre à charbon'); await p.fill('#p-q', '2,5'); await clic(c, '[data-action="pieceAjout"]'); await p.waitForTimeout(500);
  const feuille = net(await txt(c, '#calque'));
  v('R1-2 (constat, DOUTE 1) Sophie tape « 2,5 » : la feuille « Noter les pièces utilisées ? » se règle SANS UN MOT sur ce que le camion porte (« à bord ' + px.bord + ' ») : la quantité tapée n’y est plus lisible', /Noter les pièces utilisées/.test(feuille) && /à bord 2/.test(feuille) && !/2,5/.test(feuille), feuille.slice(0, 400));
  await cap(c, 'rc1-feuille-' + P.PROFIL);
  await S(c, () => { const b = [...document.querySelectorAll('#calque button')].find(b => /C.est bon/.test(b.textContent)); if (b) b.click(); }); await p.waitForTimeout(700);
  const att = await S(c, i => MVTS_ATT.filter(m => m.inter === i).map(m => [m.pid, m.q, m.de, typeof m.q]), id);
  v('R1-3 (constat, DOUTE 1) la sortie de stock en attente est de 2 (plafonnée au camion) alors que la fiche garde « 2,5 » et que la facture le facturera : trois chiffres pour une pièce', att.length === 1 && att[0][1] === 2 && (await S(c, i => fiche(i).pieces[0].q, id)) === '2,5', att);
  await FERMER_FEUILLE(c);
  await p.fill('#p-nom', 'Liquide de nettoyage'); await p.fill('#p-q', '0,5 L'); await clic(c, '[data-action="pieceAjout"]'); await p.waitForTimeout(500); await FERMER_FEUILLE(c);
  const fc = await S(c, i => fiche(i).pieces.map(x => [x.nom, x.q, x.pu]), id);
  console.log('   pièces de la fiche :', JSON.stringify(fc));
  // la suite : photo, contrôles, compte rendu, signature, Terminer
  await p.setInputFiles('.ph.ajout input[type=file]', P.PNG); await p.waitForTimeout(800);
  const ctrls = await S(c, () => [...document.querySelectorAll('input[data-ctrl]')].map(e => e.dataset.ctrl));
  for (const k of ctrls) await S(c, k => { const e = document.querySelector('input[data-ctrl="' + k + '"]'); e.scrollIntoView({ block:'center' }); e.click(); }, k);
  await p.fill('textarea[data-champ=trouve]', 'Filtre à charbon colmaté — l’évaporateur est « encrassé » & le ventilateur <b>bruyant</b>.');
  await p.fill('textarea[data-champ=compte]', 'Remplacement du filtre, nettoyage au liquide, essai de froid : 7,5 °C soufflés.');
  const sig = await P.signer(c, 'canvas#signe'); v('R1-4 la signature se trace', sig);
  await clic(c, '[data-action="terminer"]'); await p.waitForTimeout(900);
  const fin = await S(c, i => ({ st:INTS.find(o => o.id === i).st, facs:FACTURES.filter(f => f.int === i).map(f => ({ id:f.id, st:f.st, lignes:lignesDe(f).map(l => [l.d, l.q, l.qn, l.pu]) })) }), id);
  console.log('   facture préparée :', JSON.stringify(fin));
  v('R1-5 (donnée) Terminer : une facture préparée « à valider »', fin.st === 'fait' && fin.facs.length === 1 && fin.facs[0].st === 'avalider', fin);
  await FERMER_FEUILLE(c);
  // le gérant : accepte les envois, relit la facture
  await P.passer(c, 'marc', 'stock'); await clic(c, '[data-ms="envois"]'); await p.waitForTimeout(500);
  const env = net(await txt(c, '#calque'));
  console.log('   envois :', env.slice(0, 500));
  const ids = await S(c, i => MVTS_ATT.filter(m => m.inter === i).map(m => m.id), id);
  for (const a of ids) { await clic(c, '#calque [data-ms="acc|' + a + '"]'); await p.waitForTimeout(500); }
  const s1 = await S(c, () => { const x = PRODUITS.find(o => o.id === 'p1'); return { q:x.q, v1:x.loc.v1, att:MVTS_ATT.length }; });
  console.log('   stock après acceptation :', JSON.stringify(s1));
  await FERMER_FEUILLE(c);
  v('R1-6 (donnée) le camion n’a que 2 filtres et Sophie en a noté 2,5 : le stock du camion n’est JAMAIS négatif', (s1.v1 || 0) >= 0 && s1.q === 12, s1);
  await L.aller(p, 'facture-x-f-' + id); await p.waitForTimeout(500);
  const f0 = net(await txt(c, '#contenu'));
  console.log('   facture (écran) :', f0.slice(0, 900));
  await cap(c, 'rc1-facture-' + P.PROFIL);
  const ht = await S(c, i => { const f = FACTURES.find(o => o.int === i); return { ht:htDe(f), ttc:ttcDe(f), tva:f.tva, restant:restant(f), lignes:lignesDe(f).map(l => [l.d, l.q, totLigne(l)]) }; }, id);
  console.log('   chiffres :', JSON.stringify(ht));
  const nomVu = f0.includes('Établissements d’Aubigné & Fils');
  v('R1-7 (écran) la facture écrit le nom du client avec son apostrophe, son « & » et ses guillemets, sans balise interprétée', nomVu && f0.includes('« Les Mouettes »') && (await S(c, () => [...document.querySelectorAll('#contenu i')].filter(e => e.textContent === 'SARL').length)) === 0, f0.slice(0, 200));
  // la ligne « 2,5 » : la page dit-elle ce qu’elle facture ?
  const l25 = ht.lignes.find(l => /filtre/i.test(l[0]));
  v('R1-8 (donnée) la ligne « Filtre à charbon × 2,5 » vaut 2,5 × son prix unitaire, au centime', !!l25 && Math.round(l25[2] * 100) === Math.round(2.5 * (px.cat.find(x => x[0] === 'Filtre à charbon') || [0, 0])[1] * 100), { l25, cat:px.cat });
  const lU = ht.lignes.find(l => /liquide/i.test(l[0]));
  console.log('   ligne « 0,5 L » :', JSON.stringify(lU));
  // « Liquide de nettoyage × 0,5 L » n'a pas de prix : la page le dit et bloque l'envoi ; on le chiffre à 12,49 € et on regarde ce que la page FACTURE
  const bloque = await S(c, () => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return !!b && b.disabled; });
  v('R1-9 (écran) une ligne sans prix bloque « Aperçu et envoi » (le bouton est grisé) et la page dit « 1 ligne sans prix »', bloque && /1 ligne sans prix/.test(f0), { bloque });
  const k = await S(c, () => [...document.querySelectorAll('input[data-prix]')].map(e => e.dataset.prix + ':' + e.value));
  await p.fill('input[data-prix="3"]', '12,49'); await p.locator('input[data-prix="3"]').dispatchEvent('change'); await p.waitForTimeout(500);
  const f1 = net(await txt(c, '#contenu')); const i1 = f1.indexOf('LES LIGNES');
  console.log('   après prix 12,49 :', f1.slice(i1, i1 + 900));
  await cap(c, 'rc1-facture-prix-' + P.PROFIL);
  const d1 = await S(c, i => { const f = FACTURES.find(o => o.int === i); return { ht:Math.round(htDe(f) * 100), ttc:Math.round(ttcDe(f) * 100), lignes:lignesDe(f).map(l => [l.d, l.q, l.pu, Math.round(totLigne(l) * 100)]) }; }, id);
  console.log('   données :', JSON.stringify(d1), k);
  const lq = d1.lignes[3];
  v('R1-10 (constat, DOUTE 2) « Liquide de nettoyage » tapé « 0,5 L » à 12,49 € : la ligne vaut 12,49 € (quantité avec unité = 1 × le prix tapé), pas 0,5 × 12,49 = 6,25 €', lq[3] === 1249, { lq });
  const lus = { ht:L.cents((/Total HT(?: \(partiel\))?\s*([\d  ]+,\d\d)\s*€\s*TVA/.exec(f1) || [])[1] || '0'), tva:L.cents((/TVA[^€]*?\s([\d  ]+,\d\d)\s*€\s*Total TTC/.exec(f1) || [])[1] || '0'), ttc:L.cents((/Total TTC\s*([\d  ]+,\d\d)/.exec(f1) || [])[1] || '0') };
  v('R1-11 (écran) Total HT + TVA = Total TTC au centime (' + JSON.stringify(lus) + ') et les trois lus à l’écran sont ceux des données', lus.ht > 0 && lus.ht + lus.tva === lus.ttc && lus.ht === d1.ht && lus.ttc === d1.ttc, { lus, d1 });
  // les mentions légales, l'aperçu : la ligne « 0,5 L » telle que le CLIENT la lira
  await clic(c, '[data-cx="fiche"]'); await p.waitForTimeout(600);
  await S(c, () => { const f = (i, x) => { const e = document.getElementById(i); if (e && !e.value) { e.value = x; e.dispatchEvent(new Event('input', { bubbles:true })); e.dispatchEvent(new Event('change', { bubbles:true })); } };
    f('fl-forme', 'SARL'); f('fl-cap', '10000'); f('fl-rcs', 'RCS La Rochelle 123 456 789'); f('fl-ass', 'AXA Entreprises'); f('fl-num', 'POL-17-2026'); f('fl-asc', 'Responsabilité civile et décennale'); f('fl-zone', 'France'); });
  await clic(c, '[data-cx="ficheok"]'); await p.waitForTimeout(600);
  await clic(c, '[data-action="apercuEnvoi"]'); await p.waitForTimeout(700);
  const ap = net(await txt(c, '#calque')); const ia = ap.indexOf('Liquide');
  console.log('   aperçu, ligne du liquide :', ap.slice(Math.max(0, ia - 80), ia + 200));
  v('R1-12 (écran) l’aperçu (ce que le client lira) porte le nom long entier et « Liquide de nettoyage »', ap.includes('d’Aubigné & Fils') && ia > 0, ap.slice(0, 200));
  await cap(c, 'rc1-apercu-' + P.PROFIL);
  await L.fin(c);
};


/* ───────── outils communs aux sections suivantes ───────── */
const cts = x => L.cents(String(x || '0').replace(/[  ]/g, ''));
const kpis = async c => { await L.aller(c.p, 'accueil'); await c.p.waitForTimeout(600); const t = net(await txt(c, '#contenu')); const n = re => { const m = re.exec(t); return m ? L.cents(m[1]) : null; };
  return { arecevoir:n(/([\d  ]+,\d\d) € à recevoir/), recu:n(/([\d  ]+,\d\d) € reçu en octobre/) }; };
const tresor = async c => { await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(700); const t = net(await txt(c, '#contenu')); const n = re => { const m = re.exec(t); return m ? L.cents(m[1].replace('−', '-')) : null; };
  return { treso:n(/([\d  ]+,\d\d) € trésorerie/), dep:n(/([\d  ]+,\d\d) €\s*dépenses d’octobre/), t }; };
// le courriel de Mme Bernard → une intervention chez « hp » (Sophie), ramenée à aujourd'hui 11 h ; rend son identifiant
const creerInt = async c => { const p = c.p;
  await L.aller(p, 'boiteMail'); await L.attendre(p, () => !!(window.R && window.R() && window.R().querySelectorAll('.msg').length), 9000); await p.waitForTimeout(600);
  const msg = p.locator('#courrier-hote .msg', { hasText:'Climatisation chambre 214' }).first(); if (c.doigt) await msg.tap(); else await msg.click(); await p.waitForTimeout(800);
  const bt = p.locator('#courrier-hote .hband button', { hasText:'Créer l’intervention' }).first(); if (c.doigt) await bt.tap(); else await bt.click(); await p.waitForTimeout(900);
  await S(c, () => document.querySelector('.fen [data-cfact="temps"]').click()); await p.waitForTimeout(250);
  await S(c, () => document.querySelector('.fen [data-action="cPlusTot"]').click()); await p.waitForTimeout(300);
  await S(c, () => document.querySelector('.fen [data-action="cCreer"]').click()); await p.waitForTimeout(1000);
  const id = await S(c, () => INTS[INTS.length - 1].id);
  await L.aller(p, 'inter-x-' + id); await clic(c, '[data-action="modifInt"]');
  await p.fill('#m-d', '2026-10-31'); await p.fill('#m-h', '11:00'); await clic(c, '[data-action="modifIntOk"]'); await p.waitForTimeout(500);
  return id; };

/* ───────── R2 : le parcours 5 (note de frais) avec des montants ingrats ───────── */
SECTIONS['2'] = async () => {
  const c = await P.demarrer({ qui:'sm' }), p = c.p;
  const e0 = await S(c, () => ({ n:NDF.length, att:NDF.filter(x => x.etat === 'attente').length }));
  await P.passer(c, 'marc', 'accueil'); const t0 = await tresor(c);
  v('R2-0 population : 4 notes de frais dont 3 en attente ; la Comptabilité donne ses « dépenses d’octobre »', e0.n === 4 && e0.att === 3 && t0.dep > 0, { e0, dep:t0.dep });
  await P.passer(c, 'sm', 'majournee');
  // chaque cas : [nature, montant tapé, TVA, montant attendu en euros ou null (refusé), TVA attendue en centimes]
  const CAS = [['Carburant', '17,35', '20', 17.35, 289], ['Repas sur un chantier', '1 234,56', '10', 1234.56, 11223], ['Péage ou parking', '9.40', '20', 9.4, 157], ['Carburant', '12,5 €', '5.5', 12.5, 65]];
  const faites = [];
  for (const [nat, m, tva, att, tvaC] of CAS) {
    await L.aller(p, 'majournee'); await FERMER_FEUILLE(c); const ouvre = await clic(c, '[data-rl="ndf"]'); await p.waitForTimeout(500);
    if (!ouvre || !(await p.$('#rn-o'))) { v('R2-1 population : la feuille « Nouvelle note de frais » s’ouvre', false, 'cas ' + nat + ' ' + m); continue; }
    await p.selectOption('#rn-o', nat); await p.fill('#rn-m', m); await p.selectOption('#rn-t', tva); await p.setInputFiles('#rn-p', P.PNG); await p.waitForTimeout(300);
    const n0 = await S(c, () => NDF.length), ids0 = await S(c, () => NDF.map(x => x.id));
    await clic(c, '#calque [data-rl="ndfok"]'); await p.waitForTimeout(800);
    // un second envoi identique (même jour, même montant) doit demander confirmation
    const n1 = await S(c, () => NDF.length), d = await S(c, a => { const x = NDF.find(o => !a.includes(o.id)); return x ? { id:x.id, objet:x.objet, ttc:x.ttc, tva:x.tva, etat:x.etat, recu:!!x.recu } : {}; }, ids0);
    const tv = await S(c, () => (document.getElementById('toast') || {}).innerText || '');
    v('R2-1 (donnée) « ' + nat + ' ' + m + ' » devient une note de ' + att + ' € TTC, TVA ' + tva + ' %, en attente', n1 === n0 + 1 && Math.abs(d.ttc - att) < 0.0001 && +d.tva === +tva && d.etat === 'attente', { d, tv: net(tv) });
    faites.push(d);
    await FERMER_FEUILLE(c);
  }
  // le doublon : même nature, même jour, même montant → la feuille demande « c'est bien ça ? » au lieu de créer
  await L.aller(p, 'majournee'); await FERMER_FEUILLE(c); await clic(c, '[data-rl="ndf"]'); await p.waitForTimeout(500);
  await p.selectOption('#rn-o', 'Carburant'); await p.fill('#rn-m', '17,35'); await p.setInputFiles('#rn-p', P.PNG);
  const nA = await S(c, () => NDF.length); await clic(c, '#calque [data-rl="ndfok"]'); await p.waitForTimeout(600);
  const nB = await S(c, () => NDF.length), dbl = net(await txt(c, '#rn-dbl'));
  v('R2-2 le même ticket (Carburant 17,35, même jour) ne crée PAS une 2e note sans le demander : la feuille dit « déjà », ' + dbl.slice(0, 80), nB === nA && dbl.length > 5, { nA, nB, dbl });
  await FERMER_FEUILLE(c);
  // refus : montants illisibles
  for (const bad of ['abc', '0', '-5', '1e3', '12,3,4']) {
    await L.aller(p, 'majournee'); await FERMER_FEUILLE(c); await clic(c, '[data-rl="ndf"]'); await p.waitForTimeout(500);
    await p.selectOption('#rn-o', 'Péage ou parking'); await p.fill('#rn-m', bad); const na = await S(c, () => NDF.length);
    await clic(c, '#calque [data-rl="ndfok"]'); await p.waitForTimeout(400);
    const nb = await S(c, () => NDF.length), tt = net(await toast(c));
    v('R2-3 le montant « ' + bad + ' » est refusé avec une phrase (aucune note créée)', nb === na && tt.length > 5, { tt });
    await FERMER_FEUILLE(c);
  }
  // le gérant relit : liste, TVA affichée, total « Valider les notes avec ticket », Comptabilité
  await P.passer(c, 'marc', 'achats'); await clic(c, '[data-ac="onglet|notes"]:visible'); await p.waitForTimeout(500);
  const ach = net(await txt(c, '#contenu'));
  console.log('   achats :', ach.slice(0, 1400));
  await cap(c, 'rc2-notes-' + P.PROFIL);
  const lignes = faites.map(d => [d.objet, d.ttc]);
  const tvaLues = [...ach.matchAll(/TVA ([\d  ]+,\d\d) € sur le ticket/g)].map(m => cts(m[1]));
  v('R2-4 (écran) les TVA lues sur les tickets sont celles qu’on calcule à la main : 2,89 · 112,23 · 1,57 · 0,65', [289, 11223, 157, 65].every(x => tvaLues.includes(x)), { tvaLues });
  const ok = await S(c, ids => { ids.forEach(i => { const b = document.querySelector('[data-ac="ndfok|' + i + '"]'); if (b) b.click(); }); return ids.length; }, faites.map(d => d.id)); await p.waitForTimeout(900);
  const val = await S(c, ids => ids.map(i => NDF.find(x => x.id === i).etat), faites.map(d => d.id));
  v('R2-5 (donnée) les 4 notes sont validées une à une', val.every(e => e === 'validee'), val);
  const t1 = await tresor(c);
  const somme = Math.round(17.35 * 100) + 123456 + 940 + 1250;
  v('R2-6 (écran) « dépenses d’octobre » monte de 17,35 + 1 234,56 + 9,40 + 12,50 = 1 273,81 € (' + t0.dep + ' → ' + t1.dep + ')', t1.dep - t0.dep === 127381, { t0:t0.dep, t1:t1.dep, attendu:127381, somme });
  await P.passer(c, 'sm', 'techfrais'); const mf = net(await txt(c, '#contenu'));
  console.log('   Mes frais :', mf.slice(0, 700));
  v('R2-7 (écran) « Mes frais » de Sophie écrit 1 234,56 € avec l’espace insécable et les 4 notes', /1\s234,56\s€/.test(mf) && /17,35\s€/.test(mf) && /9,40\s€/.test(mf) && /12,50\s€/.test(mf), mf.slice(0, 500));
  await cap(c, 'rc2-mesfrais-' + P.PROFIL);
  await L.fin(c);
};

/* ───────── R3 : le parcours 6 (congé) — trop de jours, refus, nouvelle demande ───────── */
SECTIONS['3'] = async () => {
  const c = await P.demarrer({ qui:'sm', profil:process.env.PROFIL || 'iphone' }), p = c.p;
  await L.aller(p, 'absences');
  const mc = net(await txt(c, '#contenu'));
  v('R3-0 population : Sophie a 3 jours de congés payés restants', /Congés payés\s*3 j restants sur 25/.test(mc), mc.slice(0, 200));
  await clic(c, '[data-atdem]'); await p.waitForTimeout(500);
  const poser = async (du, au, motif) => { await S(c, a => { document.getElementById('ad-du').value = a[0]; document.getElementById('ad-au').value = a[1]; document.getElementById('ad-m').value = a[2]; ['ad-du', 'ad-au', 'ad-m'].forEach(i => document.getElementById(i).dispatchEvent(new Event('input', { bubbles:true }))); }, [du, au, motif]); await L.calme(p, 300); };
  // 1) du lundi 23 au vendredi 27 novembre : 5 jours ouvrés pour 3 de solde
  await poser('2026-11-23', '2026-11-27', 'Voyage chez ma tante d’Angoulême : « les 5 jours » & plus');
  const f5 = net(await txt(c, '#calque'));
  console.log('   formulaire 5 jours :', f5.slice(0, 600));
  v('R3-1 (écran) 5 jours ouvrés pour 3 disponibles : la feuille le DIT (« 5 jours ouvrés », solde dépassé) et ne l’annonce pas « 3 → −2 » en silence', /5 jours ouvrés/.test(f5) && /(dépass|insuffis|pas assez|manque|de trop|en trop|sans solde|anticip)/i.test(f5), f5.slice(0, 500));
  await cap(c, 'rc3-depasse-' + P.PROFIL);
  const n0 = await S(c, () => DEMANDES_ABS.length);
  await clic(c, '[data-atenvoi]'); await p.waitForTimeout(700);
  const n1 = await S(c, () => DEMANDES_ABS.length), d = await S(c, () => { const x = DEMANDES_ABS[DEMANDES_ABS.length - 1]; return x && { id:x.id, du:x.du, au:x.au, type:x.type, motif:x.motif, etat:x.etat }; }), tt = net(await toast(c));
  console.log('   après envoi :', JSON.stringify({ n0, n1, d, tt }));
  if (n1 === n0) { v('R3-2 le dépassement est REFUSÉ à l’envoi avec une phrase', tt.length > 5, tt); await FERMER_FEUILLE(c); }
  else {
    v('R3-2 (donnée) la demande dépassant le solde est acceptée à l’envoi, le motif garde l’apostrophe et le « & » tels quels', d && d.motif === 'Voyage chez ma tante d’Angoulême : « les 5 jours » & plus', d);
    // le gérant la REFUSE avec un motif à apostrophe
    await P.passer(c, 'marc', 'absences'); const ab = net(await txt(c, '#contenu'));
    const carte = net(await S(c, id => { const b = document.querySelector('[data-aok="' + id + '"]'); const k = b && b.closest('.at-d, .carte, [data-ademid]'); return k ? k.innerText : ''; }, d.id));
    console.log('   carte du gérant :', carte.slice(0, 500));
    v('R3-3 (écran) la carte du gérant annonce le solde négatif (« 3 jours disponibles → − 2 » ou une mise en garde) et le motif complet', /(−|-)\s?2|dépass|insuffis|manque/i.test(carte) && /tante d’Angoulême/.test(carte), carte.slice(0, 400));
    await clic(c, '[data-anon="' + d.id + '"]'); await p.waitForTimeout(400);
    await p.fill('#an-raison', 'L’équipe d’été est déjà à 4 sur 6 : on ne peut pas « libérer » 5 jours.'); await clic(c, '[data-anonok="' + d.id + '"]'); await p.waitForTimeout(700);
    const apres = await S(c, id => ({ dem:DEMANDES_ABS.some(x => x.id === id), ref:aRefusees.filter(x => x.id === id).map(x => x.raison), abs:ABSENCES.filter(a => a.tech === 'sm' && a.du === '2026-11-23').length }), d.id);
    v('R3-4 (donnée) refusée : la demande quitte la file, la raison est gardée, AUCUNE absence n’est posée', !apres.dem && apres.ref.length === 1 && apres.abs === 0, apres);
    await L.aller(p, 'absences'); await clic(c, '[data-aonglet="soldes"]'); await p.waitForTimeout(400);
    const so = net(await txt(c, '#contenu'));
    v('R3-5 (écran) Soldes : Sophie reste à 3 / 25 (un refus ne consomme rien)', /Sophie( Martin)? 3 \/ 25/.test(so), so.slice(0, 300));
    await P.passer(c, 'sm', 'absences'); const mc2 = net(await txt(c, '#contenu'));
    console.log('   Mes congés après refus :', mc2.slice(0, 700));
    v('R3-6 (écran) Sophie lit le refus ET sa raison en entier (apostrophe, guillemets)', /L’équipe d’été est déjà à 4 sur 6/.test(mc2) && /(refus|Refus)/.test(mc2), mc2.slice(0, 500));
    await cap(c, 'rc3-refus-' + P.PROFIL);
    // nouvelle demande : le lundi 2 et le mardi 3 novembre (Sophie a des interventions ces jours-là)
    await clic(c, '[data-atdem]'); await p.waitForTimeout(500); await poser('2026-11-02', '2026-11-03', 'Rendez-vous médical');
    await clic(c, '[data-atenvoi]'); await p.waitForTimeout(700);
    const d2 = await S(c, () => { const x = DEMANDES_ABS[DEMANDES_ABS.length - 1]; return x && { id:x.id, du:x.du, etat:x.etat }; });
    console.log('   2e demande :', JSON.stringify(d2), '| toast :', net(await toast(c)));
    await P.passer(c, 'marc', 'absences'); await S(c, () => { aOnglet = 'valider'; rendre(); }); await p.waitForTimeout(400);
    const carte2 = net(await S(c, id => { const b = document.querySelector('[data-aok="' + id + '"]'); const k = b && b.closest('.at-d, .carte, [data-ademid]'); return k ? k.innerText : ''; }, d2.id));
    const ab2 = net(await txt(c, '#contenu')), j2 = ab2.indexOf('lundi 2 novembre');
    console.log('   carte avec interventions :', carte2.slice(0, 600), '| page :', ab2.slice(Math.max(0, j2 - 150), j2 + 600));
    await cap(c, 'rc3-conflit-' + P.PROFIL);
    // Valider sans avoir réglé les deux interventions : que se passe-t-il ?
    const avant = await S(c, () => INTS.filter(i => i.tech === 'sm' && (i.d === '2026-11-02' || i.d === '2026-11-03') && i.st !== 'annulee').map(i => [i.id, i.tech, i.d, i.h]));
    await clic(c, '[data-aok="' + d2.id + '"]'); await p.waitForTimeout(700);
    const tv = net(await toast(c)), ap = await S(c, id => ({ abs:ABSENCES.filter(a => a.tech === 'sm' && a.du === '2026-11-02').length, dem:DEMANDES_ABS.some(x => x.id === id), ints:INTS.filter(i => i.tech === 'sm' && (i.d === '2026-11-02' || i.d === '2026-11-03') && i.st !== 'annulee').length, journalSM:0 }), d2.id);
    console.log('   Valider avec 2 interventions non reprises :', JSON.stringify({ avant: avant.length, tv, ap }));
    const pan = net(await txt(c, '#calque'));
    v('R3-8 (population) il y avait ' + avant.length + ' interventions de Sophie ces deux jours', avant.length >= 1, avant);
    const rep = await S(c, ids => ids.map(([i, t, d, h]) => { const o = INTS.find(x => x.id === i); return [i, o.tech, o.d === d && o.h === h, o.st]; }), avant);
    v('R3-9 (donnée + écran) valider reprend les rendez-vous de Sophie : chacun passe à un AUTRE collègue (Tom ou Karim) au même jour et à la même heure, jamais sans personne, et le toast nomme ceux qui sont prévenus', rep.length === avant.length && rep.every(r => ['tl', 'kb'].includes(r[1]) && r[2] && r[3] !== 'annulee') && /Tom aussi/.test(tv) && /Karim aussi/.test(tv), { rep, tv });
  }
  await L.fin(c);
};

/* ───────── R4 : NOUVEAU — l'intervention annulée après le départ des pièces ───────── */
SECTIONS['4'] = async () => {
  const c = await P.demarrer(), p = c.p;
  const id = await creerInt(c);
  await P.passer(c, 'sm', 'majournee'); await clic(c, '[data-rl="go|inter-x-' + id + '"]');
  await p.fill('#p-nom', 'Filtre à charbon'); await p.fill('#p-q', '1'); await clic(c, '[data-action="pieceAjout"]'); await p.waitForTimeout(500);
  await S(c, () => { const b = [...document.querySelectorAll('#calque button')].find(b => /C.est bon/.test(b.textContent)); if (b) b.click(); }); await p.waitForTimeout(700);
  const att0 = await S(c, i => MVTS_ATT.filter(m => m.inter === i).map(m => [m.id, m.pid, m.q, m.de]), id);
  v('R4-0 population : une sortie de 1 filtre attend l’accord du bureau, le stock n’a pas bougé', att0.length === 1 && att0[0][2] === 1, att0);
  const stock0 = await S(c, () => PRODUITS.find(x => x.id === 'p1').q);
  const ntf0 = await S(c, () => NOTIFS.filter(n => n.k === 'sm').length);
  // le gérant annule l'intervention par le geste du Planning (menu « Annuler l’intervention… »)
  await P.passer(c, 'marc', 'planning');
  const L0 = await S(c, () => ({ notifs:NOTIFS.length, avis:typeof A_AVIS !== 'undefined' ? A_AVIS.length : -1, journal:JOURNAL.length, taches:TACHES.length, att:MVTS_ATT.length }));
  await S(c, i => planConfirmer('annuler', i), id); await p.waitForTimeout(400);
  const conf = net(await txt(c, '#calque')); console.log('   confirmation :', conf.slice(0, 300));
  await clic(c, '[data-planconf="annuler|' + id + '"]'); await p.waitForTimeout(700);
  const tt = net(await toast(c));
  const a1 = await S(c, i => ({ st:INTS.find(o => o.id === i).st, att:MVTS_ATT.filter(m => m.inter === i).length, ntf:NOTIFS.filter(n => n.k === 'sm' && /annul/i.test(n.txt)).map(n => n.txt), facs:FACTURES.filter(f => f.int === i).length, journal:JOURNAL.filter(j => JSON.stringify(j).includes(i) && /annul/i.test(JSON.stringify(j))).length, mails:(typeof MAILS !== 'undefined' ? MAILS : []).filter(m => JSON.stringify(m).includes('chambre 214') && /annul/i.test(JSON.stringify(m))).length }), id);
  const L1 = await S(c, () => ({ notifs:NOTIFS.length, avis:typeof A_AVIS !== 'undefined' ? A_AVIS.length : -1, journal:JOURNAL.length, taches:TACHES.length, att:MVTS_ATT.length }));
  console.log('   après annulation :', JSON.stringify(a1), '| toast :', tt, '| avant/après :', JSON.stringify(L0), JSON.stringify(L1));
  v('R4-1 (donnée) annulée : st « annulee »', a1.st === 'annulee', a1);
  v('R4-2 (donnée) la sortie de stock EN ATTENTE pour cette intervention annulée a disparu de la file (ou est marquée), pas laissée à l’acceptation', a1.att === 0, a1);
  v('R4-3 (écran) le toast promet « le client est prévenu par e-mail » : une trace de ce courriel existe (une ligne de l’Historique, un message envoyé)', !/prévenu par e-mail/.test(tt) || L1.journal > L0.journal || a1.mails > 0, { tt, L0, L1 });
  v('R4-4 (donnée) Sophie est prévenue que son intervention de 11 h est annulée (une notification ou un avis de plus)', a1.ntf.length >= 1 || L1.notifs > L0.notifs || L1.avis > L0.avis, { L0, L1 });
  // l'écran Stock du gérant
  await L.aller(p, 'stock'); const st = net(await txt(c, '#contenu')); const m = /(\d+) envois? à accepter/.exec(st);
  console.log('   Stock :', (m && m[0]) || '(aucun « envois à accepter »)');
  if (m) { await clic(c, '[data-ms="envois"]'); await p.waitForTimeout(400); const env = net(await txt(c, '#calque')); console.log('   envois :', env.slice(0, 600)); v('R4-5 (écran) la file « envois à accepter » ne propose pas la sortie de pièces d’une intervention ANNULÉE (« 1 Filtre à charbon chez Hôtel de la Plage »)', !/Hôtel de la Plage/.test(env), env.slice(0, 400)); 
    // et si le gérant accepte ce reste d'envoi : le stock baisse pour un travail qui n'a pas eu lieu
    const q0 = await S(c, () => PRODUITS.find(x => x.id === 'p1').q), restes = await S(c, i => MVTS_ATT.filter(x => x.inter === i).map(x => x.id), id);
    if (restes.length) { await clic(c, '#calque [data-ms="acc|' + restes[0] + '"]'); await p.waitForTimeout(600); }
    const q1 = await S(c, () => PRODUITS.find(x => x.id === 'p1').q);
    v('R4-5b (donnée) accepter l’envoi resté en file NE retire PAS de stock pour une intervention annulée (filtres ' + q0 + ' → ' + q1 + ')', restes.length === 0 || q1 === q0, { restes, q0, q1 });
    await FERMER_FEUILLE(c); }
  // Sophie : Ma journée ne montre plus l'annulée ; sa fiche dit « annulée » et ne propose pas Terminer
  await P.passer(c, 'sm', 'majournee'); const tj = net(await txt(c, '#contenu'));
  v('R4-6 (écran) « Ma journée » de Sophie n’affiche plus l’intervention annulée', !/chambre 214/.test(tj), tj.slice(0, 300));
  await L.aller(p, 'inter-x-' + id); const fi = net(await txt(c, '#contenu')); const peutTerminer = await S(c, () => !!document.querySelector('[data-action="terminer"]'));
  console.log('   fiche annulée (Sophie) :', fi.slice(0, 300), '| bouton Terminer :', peutTerminer);
  v('R4-7 (écran) la fiche d’une intervention annulée dit « Annulée » et ne propose PAS « Terminer » (sinon une facture naîtrait)', /Annulée/.test(fi) && !peutTerminer, { fi:fi.slice(0, 200), peutTerminer });
  // « Terminer » sur une fiche annulée : la fiche se remplit comme d'habitude, puis le bouton
  if (peutTerminer) {
    const ctrls = await S(c, () => [...document.querySelectorAll('input[data-ctrl]')].map(e => e.dataset.ctrl));
    for (const k of ctrls) await S(c, k => { const e = document.querySelector('input[data-ctrl="' + k + '"]'); e.scrollIntoView({ block:'center' }); e.click(); }, k);
    await p.fill('textarea[data-champ=trouve]', 'Rien : annulée.').catch(() => {}); await p.fill('textarea[data-champ=compte]', 'Intervention annulée avant mon arrivée.').catch(() => {});
    await P.signer(c, 'canvas#signe').catch(() => {});
    await clic(c, '[data-action="terminer"]'); await p.waitForTimeout(900);
    const t2 = await S(c, i => ({ st:INTS.find(o => o.id === i).st, facs:FACTURES.filter(f => f.int === i).map(f => [f.st, lignesDe(f).length]) }), id);
    console.log('   après « Terminer » sur la fiche annulée :', JSON.stringify(t2), '| toast :', net(await toast(c)));
    v('R4-7b (donnée) toucher « Terminer » sur une intervention ANNULÉE ne la ressuscite pas (elle reste « annulee », aucune facture préparée)', t2.st === 'annulee' && t2.facs.length === 0, t2);
    await FERMER_FEUILLE(c);
  }
  // le client : son espace ne la montre plus comme à venir
  await S(c, () => { rlChanger('client', { cli:'hp', muet:true, ec:'interventions' }); }); await L.calme(p, 700);
  const ec = net(await txt(c, '#contenu')); console.log('   espace client :', ec.slice(0, 400));
  v('R4-8 (écran) l’espace du client ne montre pas l’intervention annulée parmi ses rendez-vous à venir', !/chambre 214[^]{0,80}(Planifiée|à venir)/i.test(ec), ec.slice(0, 300));
  await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
  // Rétablir : le geste « Rétablir » du toast rend tout comme avant
  await L.fin(c);
};

/* ───────── R5 : NOUVEAU — une facture payée en deux fois (chèque au bureau, puis carte du client) ───────── */
SECTIONS['5'] = async () => {
  const c = await P.demarrer(), p = c.p;
  const k0 = await kpis(c), t0 = await tresor(c);
  const f = await S(c, () => { const x = FACTURES.find(o => o.st === 'envoyee' && ttcDe(o) > 100); return { id:x.id, num:x.num, cli:x.cli, ttc:Math.round(ttcDe(x) * 100), recu:x.recu || 0 }; });
  v('R5-0 population : une facture envoyée de plus de 100 € existe (' + f.num + ', ' + f.ttc / 100 + ' €)', !!f.id && f.ttc > 10000, f);
  await L.aller(p, 'facture-x-' + f.id);
  await clic(c, '[data-action="partiel"]'); await p.waitForTimeout(400);
  const part = Math.round(f.ttc * 0.53) / 100;   // 53 % : un montant à centimes ingrats
  await p.fill('#pp-m', String(part).replace('.', ',')); await p.selectOption('#pp-mode', 'Chèque');
  await clic(c, '[data-action="partielOk"]'); await p.waitForTimeout(700);
  const a1 = await S(c, id => { const x = FACTURES.find(o => o.id === id); return { st:x.st, recu:Math.round((x.recu || 0) * 100), rest:Math.round(restant(x) * 100), enc:ENCAISSEMENTS.filter(e => e.fac === x.num).map(e => [Math.round(e.ttc * 100), e.mode, e.tva]) }; }, f.id);
  const partC = Math.round(part * 100);
  v('R5-1 (donnée) 1er paiement : « partielle », reçu ' + partC / 100 + ', reste ' + (f.ttc - partC) / 100 + ', UN encaissement par chèque', a1.st === 'partielle' && a1.recu === partC && a1.rest === f.ttc - partC && a1.enc.length === 1 && a1.enc[0][1] === 'Chèque', a1);
  const ff = net(await txt(c, '#contenu'));
  v('R5-2 (écran) la facture dit « Payée en partie », « Déjà reçu − ' + (partC / 100).toFixed(2).replace('.', ',') + ' € », « Reste à payer »', /Payée en partie/.test(ff) && /Déjà reçu/.test(ff) && /Reste à payer/.test(ff), ff.slice(0, 300));
  const k1 = await kpis(c);
  v('R5-3 (écran) Accueil : « à recevoir » baisse de ' + partC / 100 + ' € et « reçu » monte de ' + partC / 100 + ' € (pas du total de la facture)', k0.arecevoir - k1.arecevoir === partC && k1.recu - k0.recu === partC, { k0, k1, partC });
  // le gérant ne peut pas encaisser plus que le reste
  await L.aller(p, 'facture-x-' + f.id); await clic(c, '[data-action="partiel"]'); await p.waitForTimeout(300);
  await p.fill('#pp-m', String((f.ttc - partC) / 100 + 0.01).replace('.', ',')); await clic(c, '[data-action="partielOk"]'); await p.waitForTimeout(400);
  const tt = net(await toast(c)), a2 = await S(c, id => Math.round((FACTURES.find(o => o.id === id).recu || 0) * 100), f.id);
  v('R5-4 un paiement d’UN centime de plus que le reste est refusé avec le montant restant, et rien n’est écrit', /dépasse/.test(tt) && a2 === partC, { tt, a2 });
  await FERMER_FEUILLE(c);
  // le client paie le SOLDE par carte : la fenêtre doit demander le reste, pas le total
  await S(c, i => { rlChanger('client', { cli:i, muet:true, ec:'factures' }); }, f.cli); await L.calme(p, 800);
  const ec = net(await txt(c, '#contenu')); const reste = (f.ttc - partC) / 100;
  const resteTxt = reste.toFixed(2).replace('.', ',');
  console.log('   espace client :', ec.slice(0, 500));
  v('R5-5 (écran client) le bouton dit « Payer ' + resteTxt + ' € » (le reste) et pas le total ' + (f.ttc / 100).toFixed(2).replace('.', ','), ec.includes('Payer ' + resteTxt.replace(/(\d)(\d{3}),/, '$1 $2,')) || new RegExp('Payer ' + resteTxt.replace(',', '[,.]').replace(/\s/g, '\\s?') + '\\s?€').test(ec), ec.slice(0, 500));
  await cap(c, 'rc5-client-' + P.PROFIL);
  await clic(c, '[data-ec^="payer|"]'); await p.waitForTimeout(900);
  const pay = net(await txt(c, '#calque')); console.log('   fenêtre de paiement :', pay.slice(0, 300));
  v('R5-6 (écran client) la fenêtre de paiement demande « Montant ' + resteTxt + ' € »', pay.includes('Montant ' + resteTxt) || pay.replace(/\s/g, '').includes('Montant' + resteTxt.replace(/\s/g, '') + '€'), pay.slice(0, 200));
  await p.fill('#ec-cb', '4242 4242 4242 4242'); await p.fill('#ec-ex', '12/30'); await p.fill('#ec-cvc', '123'); await clic(c, '[data-ec^="payok|"]'); await p.waitForTimeout(1500);
  const a3 = await S(c, id => { const x = FACTURES.find(o => o.id === id); return { st:x.st, recu:Math.round((x.recu || 0) * 100), mode:x.mode, enc:ENCAISSEMENTS.filter(e => e.fac === x.num).map(e => [Math.round(e.ttc * 100), e.mode]) }; }, f.id);
  v('R5-7 (donnée) soldée : « payee », reçu = total, DEUX encaissements (chèque puis carte) dont la somme est le total', a3.st === 'payee' && a3.recu === f.ttc && a3.enc.length === 2 && a3.enc.reduce((s, e) => s + e[0], 0) === f.ttc, a3);
  await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
  const k2 = await kpis(c), t2 = await tresor(c);
  v('R5-8 (écran) Accueil : « à recevoir » revient au niveau d’avant et « reçu » monte du TOTAL de la facture, une seule fois', k2.arecevoir === k0.arecevoir - f.ttc && k2.recu - k0.recu === f.ttc, { k0, k2, ttc:f.ttc });
  v('R5-9 (écran) Comptabilité : la trésorerie monte du total, au centime (' + t0.treso + ' → ' + t2.treso + ')', t2.treso - t0.treso === f.ttc, { t0:t0.treso, t2:t2.treso });
  await L.aller(p, 'facture-x-' + f.id); const f2 = net(await txt(c, '#contenu'));
  console.log('   facture soldée :', f2.slice(0, 400));
  v('R5-10 (écran) la facture soldée : « Payée », « Reste à payer 0,00 € », aucun bouton d’encaissement', /Payée/.test(f2) && /Reste à payer 0,00/.test(f2) && !(await p.$('[data-action="partiel"]')), f2.slice(0, 300));
  await L.fin(c);
};

/* ───────── R7 : NOUVEAU — une facture payée en partie (chèque 64,13 €), puis annulée par un avoir : le trop-perçu à rembourser ───────── */
SECTIONS['7'] = async () => {
  const c = await P.demarrer(), p = c.p;
  const k0 = await kpis(c), t0 = await tresor(c);
  const f = await S(c, () => { const x = FACTURES.find(o => o.num === 'FAC-2026-0144'); return { id:x.id, num:x.num, ttc:Math.round(ttcDe(x) * 100), ht:x.ht, tva:x.tva }; });
  v('R7-0 population : la facture FAC-2026-0144 existe, « envoyee », ' + f.ttc / 100 + ' € TTC', !!f.id && f.ttc === 12100, f);
  await L.aller(p, 'facture-x-' + f.id); await clic(c, '[data-action="partiel"]'); await p.waitForTimeout(300);
  await p.fill('#pp-m', '64,13'); await p.selectOption('#pp-mode', 'Chèque'); await clic(c, '[data-action="partielOk"]'); await p.waitForTimeout(700); await FERMER_FEUILLE(c);
  const k1 = await kpis(c);
  v('R7-1 (écran) après 64,13 € : « à recevoir » −64,13 et « reçu » +64,13', k0.arecevoir - k1.arecevoir === 6413 && k1.recu - k0.recu === 6413, { k0, k1 });
  await L.aller(p, 'facture-x-' + f.id); await clic(c, '[data-action="avoir"]'); await p.waitForTimeout(600);
  const av = net(await txt(c, '#calque')); console.log('   feuille de l’avoir :', av.slice(0, 600));
  v('R7-2 (écran) la feuille de l’avoir dit le montant 121,00 € TTC ET qu’un acompte déjà reçu (64,13 €) devra être remboursé', /121,00/.test(av) && /64,13/.test(av), av.slice(0, 500));
  await clic(c, '#calque [data-action="avoirOk"]'); await p.waitForTimeout(900);
  const a1 = await S(c, id => { const x = FACTURES.find(o => o.id === id); const a = FACTURES.find(o => o.st === 'avoir' && /0144/.test(o.objet || '')); return { st:x.st, recu:Math.round((x.recu || 0) * 100), rest:Math.round(restant(x) * 100), avoir:a ? { num:a.num, ttc:Math.round(ttcDe(a) * 100) } : null, rembourse:typeof rembourseFait === 'function' ? !!rembourseFait(x) : null }; }, f.id);
  console.log('   après l’avoir :', JSON.stringify(a1));
  v('R7-3 (donnée) la facture est « annulee », reste à payer 0, un avoir de −121,00 € TTC existe', a1.st === 'annulee' && a1.rest === 0 && a1.avoir && a1.avoir.ttc === -12100, a1);
  const fa = net(await txt(c, '#contenu'));
  v('R7-4 (écran) la facture annulée dit « À rembourser au client » 64,13 € (le client a payé, l’avoir l’annule) — pas « Remboursé » tant que ce n’est pas fait', /À rembourser au client\s*64,13/.test(fa) && !/Remboursé au client/.test(fa), fa.slice(0, 500));
  await cap(c, 'rc7-avoir-' + P.PROFIL);
  const k2 = await kpis(c), t2 = await tresor(c);
  console.log('   Accueil :', JSON.stringify({ k0, k1, k2 }), '| trésorerie :', t0.treso, t2.treso);
  v('R7-5 (écran) Accueil : « à recevoir » a baissé de 121,00 € en tout (64,13 payés + 56,87 annulés par l’avoir, sans compter deux fois), et « reçu » garde les 64,13 € réellement encaissés', k0.arecevoir - k2.arecevoir === 12100 && k2.recu - k0.recu === 6413, { k0, k2 });
  await L.fin(c);
};

/* ───────── R6 : NOUVEAU — un devis refusé par le client, refait moins cher, signé ───────── */
SECTIONS['6'] = async () => {
  const c = await P.demarrer(), p = c.p;
  const set = async (sel, val) => { await p.fill(sel, val); await p.locator(sel).dispatchEvent('change'); };
  const dvKpi = async () => { await L.aller(p, 'devis'); await p.waitForTimeout(500); const t = net(await txt(c, '#contenu')); const n = re => { const m = re.exec(t); return m ? L.cents(m[1]) : null; }; return { attente:n(/([\d  ]+,\d\d) € en attente de réponse/), acceptes:n(/([\d  ]+,\d\d) € acceptés/), t }; };
  const e0 = await S(c, () => ({ dv:dvInit().length, facs:FACTURES.length, ints:INTS.length }));
  const d0 = await dvKpi();
  v('R6-0 population : des devis existent, « en attente » et « acceptés » ont un montant', e0.dv >= 8 && d0.attente > 0 && d0.acceptes > 0, { e0, d0:[d0.attente, d0.acceptes] });
  const creerEnvoyer = async (objet, prixMO) => {
    await L.aller(p, 'devis'); await clic(c, '[data-dv="nouveau"]'); await p.waitForTimeout(900);
    await p.selectOption('#dvn-cli', 'md'); await p.fill('#dvn-objet', objet); await clic(c, '[data-dvn="modele|3"]'); await clic(c, '[data-dvn="creer|1"]'); await p.waitForTimeout(1200);
    const id = await S(c, () => location.hash.split('-x-')[1]);
    await clic(c, '[data-dv="ligneSup|' + id + '|0"]'); await p.selectOption('[data-dvcat]', 'Circulateur classe A'); await p.waitForTimeout(400);
    await set('#contenu input[data-dvl="' + id + '|0|0"]', 'Main-d’œuvre d’O’Brien — 2,5 h'); await set('#contenu input[data-dvl="' + id + '|0|2"]', prixMO);
    return id; };
  const id1 = await creerEnvoyer('Remplacement du circulateur (1re version)', '87,35');
  await p.selectOption('[data-dvacompte]', '30'); await p.waitForTimeout(400);
  const ed1 = net(await txt(c, '#contenu')); console.log('   devis 1 :', ed1.slice(ed1.indexOf('Total HT') - 100, ed1.indexOf('Total HT') + 200));
  const dd1 = await S(c, i => { const d = DEVIS_REG[i]; const L = devisLignes(d); return { ht:Math.round(dvSomme(L) * 100), tva:d.tva, lignes:L.map(l => [l[0], l[1], l[2]]) }; }, id1);
  console.log('   données devis 1 :', JSON.stringify(dd1));
  const htTxt = L.cents((/Total HT\s*([\d  ]+,\d\d)\s*€\s*TVA/.exec(ed1) || [])[1] || '0'), ttcTxt = L.cents((/Total TTC\s*([\d  ]+,\d\d)/.exec(ed1) || [])[1] || '0');
  v('R6-1 (écran) HT lu = HT calculé (' + dd1.ht + ') et TTC = HT + TVA ' + dd1.tva + ' % au centime', htTxt === dd1.ht && ttcTxt === Math.floor((2 * dd1.ht * (1000 + dd1.tva * 10) + 1000) / 2000), { htTxt, ttcTxt, dd1 });
  await clic(c, '[data-dv="envoyer|' + id1 + '"]'); await p.waitForTimeout(700); await clic(c, '[data-mailenvoi="1"]'); await p.waitForTimeout(900);
  const num1 = await S(c, o => dvInit().find(x => x.objet === o).num, 'Remplacement du circulateur (1re version)');
  const d1 = await dvKpi();
  v('R6-2 (écran) « en attente de réponse » monte du TTC du devis 1', d1.attente - d0.attente === ttcTxt, { d0:d0.attente, d1:d1.attente, ttcTxt });
  // le client REFUSE (deux touchers : la page demande confirmation)
  await S(c, () => { rlChanger('client', { cli:'md', muet:true, ec:'devis' }); }); await L.calme(p, 700);
  await clic(c, '[data-ec="signer|' + num1 + '"]'); await p.waitForTimeout(700);
  await clic(c, '.panneau [data-dv^="clientRefus|"]'); await p.waitForTimeout(300);
  const conf = net(await S(c, () => (document.getElementById('dv-err') || {}).innerText || ''));
  v('R6-3 (écran client) le 1er toucher sur « Refuser » demande confirmation, sans refuser encore', /vraiment refuser/.test(conf) && await S(c, n => dvEtat(dvInit().find(x => x.num === n)) === 'attente', num1), conf);
  await clic(c, '.panneau [data-dv^="clientRefus|"]'); await p.waitForTimeout(800);
  const r1 = await S(c, n => { const d = dvInit().find(x => x.num === n); return { e:dvEtat(d), motif:d.motif, int:d.int || null, fa:d.facAcompte || null }; }, num1);
  v('R6-4 (donnée) refusé : « refuse », aucune intervention ni facture d’acompte n’est née', r1.e === 'refuse' && !r1.int && !r1.fa && (await S(c, () => ({ ints:INTS.length, facs:FACTURES.length }))).ints === e0.ints, r1);
  const ecR = net(await txt(c, '#contenu')); console.log('   client après refus :', ecR.slice(0, 300));
  v('R6-5 (écran client) le devis refusé n’a plus de bouton « Lire et signer »', !(await p.$('[data-ec="signer|' + num1 + '"]')), ecR.slice(0, 200));
  // le gérant : il lit le refus, refait une version
  await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
  const d2 = await dvKpi();
  v('R6-6 (écran) « en attente » retombe au niveau d’avant (le devis refusé n’y est plus compté)', d2.attente === d0.attente, { d0:d0.attente, d2:d2.attente });
  await L.aller(p, 'devis-x-' + id1);
  const fd = net(await txt(c, '#contenu')); console.log('   fiche du devis refusé :', fd.slice(0, 400));
  v('R6-7 (écran) la fiche dit « Refusé » avec son motif, garde son numéro ' + num1 + ' et propose « Refaire ce devis »', /Refusé/.test(fd) && fd.includes(num1) && /Refaire ce devis/.test(fd) && /Refusé en ligne par le client/.test(fd), fd.slice(0, 200));
  await clic(c, '[data-dv^="version|"]'); await p.waitForTimeout(900);
  const id2 = await S(c, () => location.hash.split('-x-')[1]);
  v('R6-8 un brouillon BR… s’ouvre, repris du devis refusé, et le devis refusé garde sa place (il ne devient pas « remplacé »)', /^BR/.test(id2) && id2 !== id1 && await S(c, ([a, n]) => dvEtat(dvInit().find(x => x.num === n)) === 'refuse' && DEVIS_REG[a].source && /Repris du devis/.test(DEVIS_REG[a].source) && !DEVIS_REG[a].remplace, [id2, num1]));
  await set('#contenu input[data-dvl="' + id2 + '|0|2"]', '79,90');
  const ed2 = net(await txt(c, '#contenu'));
  const dd2 = await S(c, i => { const d = DEVIS_REG[i]; return { ht:Math.round(dvSomme(devisLignes(d)) * 100), tva:d.tva, acompte:d.acompte }; }, id2);
  v('R6-9 (écran) le prix baissé change le total : HT = ' + dd2.ht / 100 + ', moins que la 1re version (' + dd1.ht / 100 + ')', dd2.ht < dd1.ht && L.cents((/Total HT\s*([\d  ]+,\d\d)\s*€\s*TVA/.exec(ed2) || [])[1] || '0') === dd2.ht, { dd1, dd2 });
  await clic(c, '[data-dv="envoyer|' + id2 + '"]'); await p.waitForTimeout(700); await clic(c, '[data-mailenvoi="1"]'); await p.waitForTimeout(900);
  const num2 = await S(c, i => DEVIS_REG[i].num, id2);
  v('R6-10 (donnée) le devis refait reçoit un NOUVEAU numéro (' + num2 + ' ≠ ' + num1 + ')', /^D-2026-\d+$/.test(num2) && num2 !== num1, { num1, num2 });
  // le client signe la 2e version
  await S(c, () => { rlChanger('client', { cli:'md', muet:true, ec:'devis' }); }); await L.calme(p, 700);
  const ecB = net(await txt(c, '#contenu')); console.log('   client, 2 versions :', ecB.slice(0, 500));
  v('R6-11 (écran client) les DEUX numéros sont lisibles : le refusé comme « Refusé », le neuf « À signer »', ecB.includes(num2) && /À signer/.test(ecB) && ecB.includes(num1), ecB.slice(0, 400));
  await clic(c, '[data-ec="signer|' + num2 + '"]'); await p.waitForTimeout(700);
  await S(c, () => { document.getElementById('dv-ok').checked = true; }); await p.fill('#dv-nom', 'M. O’Durand');
  await P.signer(c, '#dv-signe'); await S(c, () => { document.querySelector('.panneau [data-dv^="signer|"]').click(); }); await L.calme(p, 800);
  const acc = await S(c, ([n1, n2]) => { const a = dvInit().find(x => x.num === n1), b = dvInit().find(x => x.num === n2); return { e1:dvEtat(a), e2:dvEtat(b), int2:b.int, fa2:b.facAcompte, int1:a.int || null, nInt:INTS.length, nFac:FACTURES.length, intsDuNom:INTS.filter(i => i.id === 'i-' + n1 || i.id === 'i-' + n2).map(i => i.id) }; }, [num1, num2]);
  v('R6-12 (donnée) le refusé reste refusé, le refait est accepté ; UNE intervention et UNE facture d’acompte sont nées, toutes deux du 2e devis', acc.e1 === 'refuse' && acc.e2 === 'accepte' && acc.nInt === e0.ints + 1 && acc.nFac === e0.facs + 1 && acc.int1 === null && acc.intsDuNom.length === 1 && acc.intsDuNom[0] === 'i-' + num2, acc);
  await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
  const d3 = await dvKpi();
  v('R6-13 (écran) Devis : « acceptés » monte du TTC de la 2e version seulement ; « en attente » revient à son niveau d’avant', d3.acceptes - d0.acceptes === Math.floor((2 * dd2.ht * (1000 + dd2.tva * 10) + 1000) / 2000) && d3.attente === d0.attente, { d0:[d0.attente, d0.acceptes], d3:[d3.attente, d3.acceptes], dd2 });
  await L.fin(c);
};

(async () => {
  const noms = R.split(',');
  for (const n of noms) await P.sec('recontrôle ' + n, SECTIONS[n] || (async () => { throw new Error('section inconnue ' + n); }));
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
