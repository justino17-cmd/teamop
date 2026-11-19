// PARCOURS 1 — « un e-mail de client arrive » jusqu'à « payée au centime » (17 novembre 2026, étape 1 « jouer-la-semaine »).
//   marc (gérant) : Boîte mail → « Créer l'intervention » → Planning → la ramène à aujourd'hui (✎ Modifier)
//   sm (technicienne) : Ma journée → la fiche : pièce prise dans son camion, photo, contrôles, compte rendu, signature → Terminer
//   marc : accepte la sortie de stock (le camion de Sophie baisse d'autant) → facture préparée → mentions légales → envoyée
//   le client (Mme Bernard, Hôtel de la Plage) : son espace → paie par carte
//   marc : Comptabilité, Accueil, fiche client, facture : tous disent « payée », au centime.
// Les données du prototype vivent dans la page : on PASSE LA MAIN (déconnexion / ouverture de l'autre rôle), on ne recharge JAMAIS.
// Chaque montant est recalculé ICI, à la main (65 + 45 + 2 × 24 = 158,00 € HT, + 2,5 × 12,49 = 31,23 → 189,23 € HT ; TVA 20 % = 37,85 € ; TTC 227,08 €), puis comparé à ce que la page DIT.
// PROFIL=mac|iphone|android… NUIT=1. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P, fs = require('fs');
const NOM = 'parcours 1 · ' + P.PROFIL + (P.NUIT ? ' nuit' : '');
const HT = 18923, TVA = 3785, TTC = 22708;   // centimes : 65 h-d’œuvre + 45 zone 2 + 2 filtres à 24 € (= 158,00) + « Liquide de nettoyage » 2,5 × 12,49 € = 31,23 (la moitié de centime monte : 31,225 → 31,23) ; TVA 20 % de 189,23 = 37,846 → 37,85 ; TTC 227,08
// ⛔ valeurs INGRATES exprès (18 novembre 2026) : une quantité décimale « 2,5 » et un prix à virgule 12,49. Avec des valeurs rondes, la mutation « « 2,5 » lu « 2 » » (parseInt) et celle de la fenêtre de paiement du client (le TOTAL au lieu du RESTE) laissaient ce parcours vert.
const HT0 = 15800;   // le total des trois premières lignes (avant que le bureau chiffre la ligne sans prix)
// les deux chiffres d'argent de l'Accueil du gérant, en centimes (lus sur l'écran, pas dans les tableaux)
const kpis = async c => { await L.aller(c.p, 'accueil'); await c.p.waitForTimeout(600); const t = net(await txt(c, '#contenu'));
  const n = re => { const m = re.exec(t); return m ? L.cents(m[1]) : null; };
  return { arecevoir:n(/([\d  ]+,\d\d) € à recevoir/), recu:n(/([\d  ]+,\d\d) € reçu en octobre/) }; };
const FERMER_FEUILLE = c => S(c, () => { const b = document.querySelector('#calque [data-ferme]'); if (b) b.click(); });
(async () => {
  let c;
  await P.sec('parcours 1', async () => {
    c = await P.demarrer(); const p = c.p;
    const e0 = await S(c, () => ({ ints:INTS.length, facs:FACTURES.length, enc:ENCAISSEMENTS.length, att:MVTS_ATT.length, filtres:PRODUITS.find(x => x.id === 'p1').loc.v1, q:PRODUITS.find(x => x.id === 'p1').q }));
    v('0 population : 24 interventions, 8 factures, le camion de Sophie porte 2 filtres à charbon (stock 14)', e0.ints === 24 && e0.facs === 8 && e0.filtres === 2 && e0.q === 14, e0);

    const k0 = await kpis(c);
    v('0b population : l’Accueil donne « à recevoir » et « reçu en octobre »', k0.arecevoir > 0 && k0.recu > 0, k0);
    /* ── A. le gérant : l’e-mail de Mme Bernard → l'intervention ── */
    await L.aller(p, 'boiteMail'); await L.attendre(p, () => !!(window.R && window.R() && window.R().querySelectorAll('.msg').length), 9000); await p.waitForTimeout(600);
    const msg = p.locator('#courrier-hote .msg', { hasText:'Climatisation chambre 214' }).first();
    v('A1 population : l’e-mail « Climatisation chambre 214 » est dans la Boîte mail', await msg.count() === 1);
    if (c.doigt) await msg.tap(); else await msg.click(); await p.waitForTimeout(800);
    const bouton = p.locator('#courrier-hote .hband button', { hasText:'Créer l’intervention' }).first();
    v('A2 la boîte reconnaît une panne et propose « Créer l’intervention »', await bouton.count() === 1);
    if (c.doigt) await bouton.tap(); else await bouton.click(); await p.waitForTimeout(900);
    const fen = await S(c, () => ({ ouverte:!!document.querySelector('.fen'), cli:CREA && CREA.cli, mail:CREA && CREA.mail, titre:CREA && CREA.titre }));
    v('A3 la fenêtre s’ouvre avec le client reconnu (Hôtel de la Plage) et l’e-mail lié', fen.ouverte && fen.cli === 'hp' && fen.mail === 'm1' && /chambre 214/.test(fen.titre || ''), fen);
    await S(c, () => document.querySelector('.fen [data-cfact="temps"]').click()); await p.waitForTimeout(250);   // « Au temps passé » : une visite sous contrat ne se facture pas
    await S(c, () => document.querySelector('.fen [data-action="cPlusTot"]').click()); await p.waitForTimeout(300);
    await cap(c, '1-A-fenetre-' + P.PROFIL);
    await S(c, () => document.querySelector('.fen [data-action="cCreer"]').click()); await p.waitForTimeout(1000);
    const nv = await S(c, () => { const i = INTS[INTS.length - 1]; return { id:i.id, tech:i.tech, st:i.st, d:i.d, h:i.h, cli:i.cli, fact:i.fact && i.fact.mode, n:INTS.length, mail:mlDe('m1').fait || '' }; });
    const id = nv.id;
    v('A4 (donnée) l’intervention existe : une de plus, chez Hôtel de la Plage, une technicienne, « planifiée », facturée au temps passé', nv.n === e0.ints + 1 && nv.cli === 'hp' && !!nv.tech && nv.st === 'planifiee' && nv.fact === 'temps', nv);
    v('A5 (donnée) la technicienne choisie est celle que le planning laissait libre : Sophie, lundi 2 novembre', nv.tech === 'sm' && nv.d === '2026-11-02', nv);
    v('A6 (donnée) l’e-mail est marqué « traité » : une intervention en est née', /Intervention créée/i.test(nv.mail), nv.mail);
    /* le Planning la montre (la carte porte l'identifiant) */
    await L.aller(p, 'planning'); await p.waitForTimeout(500);
    v('B1 (écran) le Planning montre la carte de la nouvelle intervention, au nom de Sophie', await S(c, i => { const k = document.querySelector('.pc[data-int="' + i + '"]'); return !!k || /chambre 214/.test(document.getElementById('contenu').innerText); }, id));

    /* ── C. le gérant la ramène à aujourd'hui 11 h (le client a écrit « aujourd'hui ») ── */
    await L.aller(p, 'inter-x-' + id);
    v('C1 population : la fiche de l’intervention s’ouvre et propose ✎ Modifier', await clic(c, '[data-action="modifInt"]'));
    await p.fill('#m-d', '2026-10-31'); await p.fill('#m-h', '11:00');
    await clic(c, '[data-action="modifIntOk"]'); await p.waitForTimeout(500);
    const toastMod = net(await S(c, () => (document.getElementById('toast') || {}).innerText || ''));
    const apresMod = await S(c, i => { const o = INTS.find(x => x.id === i); return { d:o.d, h:o.h, tech:o.tech, notifs:NOTIFS.filter(n => n.k === 'sm' && /chambre|Plage|déplac|modifi|confi/i.test(n.txt)).length }; }, id);
    v('C2 (donnée) l’intervention est aujourd’hui à 11:00 chez Sophie', apresMod.d === '2026-10-31' && apresMod.h === '11:00' && apresMod.tech === 'sm', apresMod);
    v('C3 le toast promet « Sophie reçoit une notification » : ELLE EXISTE (un message du bureau pour sm)', /Sophie reçoit une notification/.test(toastMod) ? apresMod.notifs >= 1 : true, { toastMod, apresMod });

    /* ── D. la technicienne : Ma journée → la fiche ── */
    const main1 = await P.passer(c, 'sm', 'majournee');
    v('D0 la main passe à Sophie dans la même page (rôle tech, aucun écran de connexion)', main1.ok && main1.ROLE === 'tech' && main1.SESSION === 'sm' && !main1.cnx, main1);
    const tj = await txt(c, '#contenu');
    v('D1 (écran) « Ma journée » de Sophie : 4 interventions, la nouvelle à 11:00 chez l’Hôtel de la Plage', /4 interventions aujourd’hui/.test(tj) && /11:00\s*Planifiée\s*Hôtel de la Plage\s*Climatisation chambre 214 en panne/.test(tj), tj.slice(0, 500));
    await cap(c, '1-D1-majournee-' + P.PROFIL);
    v('D2 population : le bouton « Commencer » de la nouvelle intervention existe', await clic(c, '[data-rl="go|inter-x-' + id + '"]'));
    const th = await txt(c, '#contenu');
    v('D3 (écran) la fiche dit la demande du client et l’adresse', /La climatisation de la chambre 214/.test(th) && /3 av\. de la Plage/.test(th), th.slice(0, 300));
    const ficheH = await S(c, i => ({ debut:fiche(i).debut, fin:fiche(i).fin }), id);
    v('D4 les heures « remplies toutes seules » de la fiche sont celles du RENDEZ-VOUS (11:00 – 12:00), pas celles d’avant le déplacement', ficheH.debut === '11:00' && ficheH.fin === '12:00', ficheH);
    /* la pièce : prise dans le camion, la feuille « Noter les pièces utilisées ? » */
    await p.fill('#p-nom', 'Filtre à charbon'); await p.fill('#p-q', '2');
    await clic(c, '[data-action="pieceAjout"]'); await p.waitForTimeout(500);
    const feuille = net(await txt(c, '#calque'));
    v('D5 (écran) la pièce ajoutée ouvre « Noter les pièces utilisées ? » : « à bord, 2 », ça part au bureau', /Noter les pièces utilisées/.test(feuille) && /Filtre à charbon/.test(feuille) && /à bord/.test(feuille) && /Ça part au bureau/.test(feuille), feuille.slice(0, 300));
    await S(c, () => { const b = [...document.querySelectorAll('#calque button')].find(b => /C.est bon/.test(b.textContent)); if (b) b.click(); }); await p.waitForTimeout(700);
    const att = await S(c, i => MVTS_ATT.filter(m => m.inter === i), id);
    v('D6 (donnée) « C’est bon » : UNE sortie attend l’accord du bureau (2 filtres, du camion v1) ; le stock n’a PAS bougé', att.length === 1 && att[0].pid === 'p1' && att[0].q === 2 && att[0].de === 'v1' && await S(c, () => PRODUITS.find(x => x.id === 'p1').loc.v1) === 2, att);
    /* une seconde pièce, hors catalogue : « 2,5 » (décimale) — le bureau la chiffrera à 12,49 € avant l'envoi */
    await p.fill('#p-nom', 'Liquide de nettoyage'); await p.fill('#p-q', '2,5'); await clic(c, '[data-action="pieceAjout"]'); await p.waitForTimeout(500); await FERMER_FEUILLE(c);
    const piq = await S(c, i => fiche(i).pieces.map(x => [x.nom, x.q]), id);
    v('D6b (donnée) la fiche porte deux pièces : 2 filtres et « 2,5 » de liquide de nettoyage (texte tel que tapé)', piq.length === 2 && piq[1][0] === 'Liquide de nettoyage' && piq[1][1] === '2,5', piq);
    v('D6c (donnée) la pièce hors catalogue n’ajoute AUCUNE sortie de stock : toujours une seule file pour cette intervention', (await S(c, i => MVTS_ATT.filter(m => m.inter === i).length, id)) === 1);
    /* photo, contrôles, compte rendu, signature */
    await p.setInputFiles('.ph.ajout input[type=file]', P.PNG); await p.waitForTimeout(800);
    const nph = await S(c, i => fiche(i).photos.length, id);
    v('D7 (donnée) la photo est ajoutée à la fiche (population : 1 photo)', nph === 1, nph);
    const ctrls = await S(c, () => [...document.querySelectorAll('input[data-ctrl]')].map(e => e.dataset.ctrl));
    v('D8 population : six contrôles de climatisation à cocher', ctrls.length === 6, ctrls);
    for (const k of ctrls) await S(c, k => { const e = document.querySelector('input[data-ctrl="' + k + '"]'); e.scrollIntoView({ block:'center' }); e.click(); }, k);
    await p.fill('textarea[data-champ=trouve]', 'Filtre à charbon colmaté, ventilateur correct.');
    await p.fill('textarea[data-champ=compte]', 'Remplacement du filtre, essai de froid concluant.');
    const man0 = await S(c, i => manque(fiche(i)), id);
    v('D9 (donnée) avant la signature il ne manque QUE la signature du client', man0.length === 1 && /signature/.test(man0[0]), man0);
    const sig = await P.signer(c, 'canvas#signe');
    v('D10 la signature se trace au doigt/souris sur le cadre (rien ne le recouvre)', sig);
    const man1 = await S(c, i => manque(fiche(i)), id);
    v('D11 (donnée) signée : plus rien ne manque, le bandeau dit « Tout est rempli »', man1.length === 0 && /Tout est rempli/.test(await txt(c, '#collant')), man1);
    await cap(c, '1-D11-fiche-' + P.PROFIL);
    await clic(c, '[data-action="terminer"]'); await p.waitForTimeout(900);
    const fin = await S(c, i => ({ st:INTS.find(o => o.id === i).st, etat:fiche(i).etat, facs:FACTURES.filter(f => f.int === i).map(f => ({ id:f.id, st:f.st, lignes:f.lignes.length })), toast:(document.getElementById('toast') || {}).innerText }), id);
    v('D12 (donnée) « Terminer » : l’intervention est faite, UNE facture est préparée « à valider » (4 lignes)', fin.st === 'fait' && fin.etat === 'bureau' && fin.facs.length === 1 && fin.facs[0].st === 'avalider' && fin.facs[0].lignes === 4, fin);
    const ecr = net(await txt(c, '#contenu'));
    v('D13 (écran) la fiche dit « Intervention terminée » et le compte rendu part au client', /Intervention terminée/.test(ecr) && /Envoyé/.test(ecr), ecr.slice(0, 200));
    v('D14 (donnée) la sortie du stock est TOUJOURS une seule : terminer ne redemande pas la pièce déjà notée', (await S(c, i => MVTS_ATT.filter(m => m.inter === i).length, id)) === 1);
    await FERMER_FEUILLE(c);

    /* ── E. le gérant accepte la sortie : le camion baisse d'autant ── */
    await P.passer(c, 'marc', 'stock');
    const st = net(await txt(c, '#contenu'));
    v('E1 (écran) Stock : « 3 envois à accepter » (le sien et deux autres du matin)', /3 envois à accepter/.test(st), st.slice(0, 200));
    await clic(c, '[data-ms="envois"]'); await p.waitForTimeout(500);
    const env = net(await txt(c, '#calque'));
    v('E2 (écran) l’envoi de Sophie dit « 2 Filtre à charbon chez Hôtel de la Plage », « il en restera 0 »', /Sophie a utilisé 2 Filtre à charbon chez Hôtel de la Plage/.test(env) && /il en restera 0/.test(env), env.slice(0, 300));
    await cap(c, '1-E2-envois-' + P.PROFIL);
    const idAtt = att[0].id;
    await clic(c, '#calque [data-ms="acc|' + idAtt + '"]'); await p.waitForTimeout(700);
    const s1 = await S(c, i => { const x = PRODUITS.find(o => o.id === 'p1'); return { q:x.q, v1:x.loc.v1 || 0, v2:x.loc.v2, hp:x.loc['d-hp'], att:MVTS_ATT.length, mv:MVTS.filter(m => m.inter === i).map(m => [m.type, m.q, m.de, m.valPar]) }; }, id);
    v('E3 (donnée) le stock suit : 14 → 12 au total, le camion de Sophie 2 → 0, les autres lieux intacts, l’envoi sort de la file, un mouvement « accepté par marc »', s1.q === 12 && s1.v1 === 0 && s1.v2 === 3 && s1.hp === 4 && s1.att === 2 && JSON.stringify(s1.mv) === '[["sortie",2,"v1","marc"]]', s1);
    await FERMER_FEUILLE(c);
    const ts = net(await txt(c, '#contenu'));
    v('E4 (écran) Stock dit maintenant « 2 envois à accepter » (Sophie n’y est plus)', /2 envois à accepter/.test(ts) && !/Sophie et Tom/.test(ts), ts.slice(0, 160));
    const manques = await S(c, () => lieuManques('v1').map(o => [o.x.nom, o.manque]));
    v('E5 (donnée) le camion de Sophie MANQUE désormais de 2 filtres à charbon (dotation 3, à bord 0… ) : « Mon camion » le lui dira', manques.some(m => m[0] === 'Filtre à charbon' && m[1] === 3), manques);

    /* ── F. la facture : les mentions légales, l'aperçu, l'envoi ── */
    await L.aller(p, 'facture-x-f-' + id);
    const f0 = net(await txt(c, '#contenu'));
    v('F1 (écran) la facture « À valider » reprend les 4 lignes : total HT PARTIEL 158,00 € (la ligne « 2,5 » n’a pas de prix) et la page dit « 1 ligne sans prix »', /À valider/.test(f0) && /Total HT \(partiel\) 158,00 €/.test(f0) && /1 ligne sans prix/.test(f0), f0.slice(0, 500));
    v('F1b l’envoi est bloqué tant qu’une ligne n’a pas de prix (bouton « Aperçu et envoi » grisé)', await S(c, () => { const b = document.querySelector('[data-action="apercuEnvoi"]'); return !!b && b.disabled; }));
    await p.fill('input[data-prix="3"]', '12,49'); await p.locator('input[data-prix="3"]').dispatchEvent('change'); await p.waitForTimeout(500);
    const f0b = net(await txt(c, '#contenu'));
    v('F1c (écran) chiffrée à 12,49 € : 2,5 × 12,49 = 31,23 € (31,225 monte au centime), HT 189,23 €, TVA 37,85 €, TTC 227,08 € — recalculés à la main', /Total HT 189,23 €/.test(f0b) && /37,85 €/.test(f0b) && /Total TTC 227,08 €/.test(f0b), f0b.slice(0, 600));
    v('F1d (donnée) la ligne vaut 31,23 € et le HT des quatre lignes 189,23 € (2,5 n’est pas lu « 2 » : 2 × 12,49 = 24,98)', await S(c, i => { const f = FACTURES.find(o => o.int === i); return Math.round(totLigne(lignesDe(f)[3]) * 100) === 3123 && Math.round(htDe(f) * 100) === 18923; }, id), await S(c, i => lignesDe(FACTURES.find(o => o.int === i)).map(l => [l.d, l.q, l.pu]), id));
    v('F2 (écran) la facture dit ce qu’il manque (« forme juridique, immatriculation, assurance ») tant que la fiche de l’entreprise n’est pas complète', /Il manque (sur cette facture : la forme juridique, l’immatriculation[^.]*l’assurance professionnelle|3 mentions( légales)?)/.test(f0), f0.slice(0, 300));
    v('F3 les heures de la facture sont celles du rendez-vous (11:00 – 12:00), pas 07:00 – 08:00', /sur place 11:00 – 12:00/.test(f0) && !/07:00/.test(f0), f0.slice(0, 600));
    await clic(c, '[data-cx="fiche"]'); await p.waitForTimeout(600);
    await S(c, () => { const f = (i, x) => { const e = document.getElementById(i); if (e && !e.value) { e.value = x; e.dispatchEvent(new Event('input', { bubbles:true })); e.dispatchEvent(new Event('change', { bubbles:true })); } };
      f('fl-forme', 'SARL'); f('fl-cap', '10000'); f('fl-rcs', 'RCS La Rochelle 123 456 789'); f('fl-ass', 'AXA Entreprises'); f('fl-num', 'POL-17-2026'); f('fl-asc', 'Responsabilité civile et décennale'); f('fl-zone', 'France'); });
    await clic(c, '[data-cx="ficheok"]'); await p.waitForTimeout(600);
    const f1 = net(await txt(c, '#contenu'));
    v('F4 (écran) les mentions légales complétées : la facture n’est plus bloquée', !/Il manque \d+ mention/.test(f1), f1.slice(0, 160));
    await clic(c, '[data-action="apercuEnvoi"]'); await p.waitForTimeout(600);
    const ap = net(await txt(c, '#calque'));
    v('F5 (écran) l’aperçu : FAC-2026-0146, Hôtel de la Plage, HT 189,23, TVA 37,85, TTC 227,08, envoyée à direction@hotelplage.fr', /Facture FAC-2026-0146/.test(ap) && /Hôtel de la Plage/.test(ap) && /Total HT 189,23 €/.test(ap) && /TVA 20 % 37,85 €/.test(ap) && /Total TTC 227,08 €/.test(ap) && /direction@hotelplage\.fr/.test(ap), ap.slice(0, 700));
    v('F6 l’aperçu dit « sur place 11:00 – 12:00 » (même heure que la fiche)', /le samedi 31 octobre, 11:00 – 12:00/.test(ap), ap.slice(150, 400));
    await clic(c, '#calque [data-action="envoyer"]'); await p.waitForTimeout(900);
    const fe = await S(c, i => { const f = FACTURES.find(o => o.int === i); return { num:f.num, st:f.st, ht:f.ht, tva:f.tva, emise:f.emise, ech:f.ech, ttc:ttcDe(f), restant:restant(f) }; }, id);
    v('F7 (donnée) envoyée : FAC-2026-0146, « envoyee », HT 189, TTC 227,08 (recalculé : ' + TTC / 100 + '), reste à payer 227,08', fe.num === 'FAC-2026-0146' && fe.st === 'envoyee' && Math.round(fe.ht * 100) === HT && Math.round(fe.ttc * 100) === TTC && Math.round(fe.restant * 100) === TTC, fe);
    const k1 = await kpis(c);
    v('F7b (écran) l’Accueil : « à recevoir » monte d’exactement 227,08 € à l’envoi de la facture, « reçu » ne bouge pas', k1.arecevoir - k0.arecevoir === TTC && k1.recu === k0.recu, { k0, k1 });
    const avantCompta = net(await (async () => { await L.aller(p, 'comptabilite'); await p.waitForTimeout(700); return txt(c, '#contenu'); })());
    const tresoAvant = (/([\d  ]+,\d\d) € trésorerie/.exec(avantCompta) || [])[1], routeAvant = (/\+ en route ([\d  ]+,\d\d) €/.exec(avantCompta) || [])[1];
    v('F8 population : Comptabilité (avant paiement) donne sa trésorerie (et pas encore d’« en route »)', !!tresoAvant && !routeAvant, avantCompta.slice(200, 900));

    /* ── G. le client paie ── */
    await S(c, () => { rlChanger('client', { cli:'hp', muet:true, ec:'factures' }); }); await L.calme(p, 800);
    const ec = net(await txt(c, '#contenu'));
    v('G1 (écran) l’espace client : FAC-2026-0146, 227,08 €, « À régler avant le 30/11 », bouton « Payer 227,08 € »', /FAC-2026-0146/.test(ec) && /227,08 €/.test(ec) && /À régler avant le 30\/11/.test(ec) && /Payer 227,08 €/.test(ec), ec.slice(0, 400));
    v('G2 (écran) le client lit les heures du rendez-vous : « 11:00 – 12:00 »', /11:00 – 12:00/.test(ec) && !/07:00/.test(ec), ec.slice(0, 300));
    await cap(c, '1-G1-client-' + P.PROFIL);
    await clic(c, '[data-ec^="payer|f-"]'); await p.waitForTimeout(900);
    const pay = net(await txt(c, '#calque'));
    v('G3 (écran) la fenêtre de paiement : « Payer la facture FAC-2026-0146 », « Montant 227,08 € »', /Payer la facture FAC-2026-0146/.test(pay) && /Montant 227,08 €/.test(pay), pay.slice(0, 200));
    await p.fill('#ec-cb', '4242 4242 4242 4242'); await p.fill('#ec-ex', '12/30'); await p.fill('#ec-cvc', '123');
    await clic(c, '[data-ec^="payok|"]'); await p.waitForTimeout(1500);
    const pf = await S(c, i => { const f = FACTURES.find(o => o.int === i); return { st:f.st, recu:f.recu, paye:f.paye, mode:f.mode, enc:ENCAISSEMENTS.filter(e => e.fac === f.num).map(e => [e.ttc, e.mode, e.tva]) }; }, id);
    v('G4 (donnée) payée : « payee », 227,08 € reçus par carte, UN encaissement de 227,08 € à 20 % de TVA', pf.st === 'payee' && Math.round(pf.recu * 100) === TTC && pf.mode === 'Carte' && JSON.stringify(pf.enc) === '[[227.08,"Carte",20]]', pf);
    const ec2 = net(await txt(c, '#contenu'));
    v('G5 (écran) le client lit « Payée le 31/10 » sur sa facture et plus de bouton Payer pour elle', /FAC-2026-0146[^€]*227,08 € Payée le 31\/10/.test(ec2) && !/Payer 227,08/.test(ec2), ec2.slice(0, 300));
    await cap(c, '1-G5-client-paye-' + P.PROFIL);

    /* ── H. le gérant relit : Comptabilité, Accueil, fiche du client, facture ── */
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
    await L.aller(p, 'comptabilite'); await p.waitForTimeout(800);
    const ca = net(await txt(c, '#contenu'));
    const tresoApres = (/([\d  ]+,\d\d) € trésorerie/.exec(ca) || [])[1], routeApres = (/\+ en route ([\d  ]+,\d\d) €/.exec(ca) || [])[1];
    const cts = x => L.cents(String(x || '0').replace(/[  ]/g, ''));
    v('H1 (écran) Comptabilité : la trésorerie monte d’EXACTEMENT 227,08 € (' + tresoAvant + ' → ' + tresoApres + '), dont « en route » (' + routeAvant + ' → ' + routeApres + ')', cts(tresoApres) - cts(tresoAvant) === TTC && cts(routeApres) - cts(routeAvant || '0') === TTC, { tresoAvant, tresoApres, routeAvant, routeApres });
    await cap(c, '1-H1-compta-' + P.PROFIL);
    const k2 = await kpis(c);
    v('H1b (écran) l’Accueil après paiement : « à recevoir » revient à son niveau d’avant, « reçu en octobre » monte d’exactement 227,08 €', k2.arecevoir === k0.arecevoir && k2.recu - k0.recu === TTC, { k0, k2 });
    const lig = await S(c, () => { const L1 = [...document.querySelectorAll('#contenu button, #contenu .ligne-clic, #contenu a')].find(e => /chambre 214/.test(e.innerText)); return L1 ? L1.innerText.replace(/\s+/g, ' ') : ''; });
    v('H2 population : l’Accueil montre la ligne de l’intervention terminée', /chambre 214/.test(lig), lig);
    v('H3 (écran) l’Accueil ne dit PLUS « à payer » : la facture est réglée (ligne : « ' + lig + ' »)', !/à payer/i.test(lig), lig);
    await cap(c, '1-H3-accueil-' + P.PROFIL);
    await L.aller(p, 'client-x-hp'); await p.waitForTimeout(700);
    const fc = net(await txt(c, '#contenu')), ligc = (/.{0,140}chambre 214.{0,200}/.exec(fc) || [''])[0];
    v('H4 (écran) la fiche du client place l’intervention « Payée » (extrait : « ' + ligc + ' »)', /Payée/.test(ligc) && !/à payer/i.test(ligc), ligc);
    await L.aller(p, 'facture-x-f-' + id); await p.waitForTimeout(600);
    const ff = net(await txt(c, '#contenu'));
    v('H5 (écran) la facture : « Payée », « Déjà reçu − 227,08 € », « Reste à payer 0,00 € »', /Payée/.test(ff) && /Déjà reçu − 227,08 €/.test(ff) && /Reste à payer 0,00 €/.test(ff), ff.slice(0, 400));
    const hist = await S(c, i => JOURNAL.filter(j => JSON.stringify(j).includes(i)).length, id);
    v('H6 (donnée) l’Historique a gardé la trace du parcours (création, fin, facture…) : au moins 3 lignes', hist >= 3, hist);
    v('H7 aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
