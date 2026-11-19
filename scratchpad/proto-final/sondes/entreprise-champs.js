// « Mon entreprise » : pour CHAQUE champ, une valeur juste s'enregistre ; une valeur fausse est refusée avec le message EXACT de la spécification,
// écrit SOUS le champ (role="alert", aria-invalid, aria-describedby) ; le panneau reste ouvert et la donnée ne change pas ; < > " refusés
// dans tous les champs texte (le DOM relu : aucun élément injecté) ; l'adresse relue se redécoupe comme opdDonnees ; le SIRET de démonstration
// (qui ne passe pas la clé de contrôle) s'enregistre AVEC l'avertissement.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population (champs, cas) avant de conclure.
const { L, v, ouvrirEnt, champ, remplir, panneauOuvert, toast, fiche, fin } = require('./entreprise-commun.js');
const INT = 'Ce champ ne peut pas contenir de signes < > ni de guillemets droits.';
const ADR = 'Il manque la rue, le code postal ou la ville : une facture doit porter ton adresse.';
let nCas = 0;
async function cliquer(c, sel) { await c.p.locator(sel).first().click(); await L.calme(c.p, 200); }
// un cas refusé : on met `val` dans `id`, on enregistre, on lit le message SOUS le champ, et la fiche n'a pas bougé
async function refus(c, bouton, id, val, msg, avant, nom) {
  await remplir(c.p, id, val); await cliquer(c, bouton); nCas++;
  const r = await champ(c.p, id), ouv = await panneauOuvert(c.p), ap = await fiche(c.p);
  v(`${nom || id} = ${JSON.stringify(String(val).slice(0, 30))} : refusé avec « ${msg.slice(0, 60)} »`, r && r.err === msg && r.invalide && r.sousLeChamp && r.desc.includes(id + '-err') && ouv !== '' && JSON.stringify(ap) === JSON.stringify(avant), { r, ouv });
}
(async () => {
  // ───── carte 1 : ton entreprise
  { const c = await ouvrirEnt({ profil:'mac' }); const BTN = '[data-ent="identok"]';
    await L.toucher(c, '[data-ent="carte|ident"]'); const avant = await fiche(c.p);
    const bons = { 'en-nom':'Dupont Climatisation', 'en-patron':'Jean Dupont', 'en-rue':'12 avenue de la Mer, bât. B', 'en-cp':'17000', 'en-ville':'La Rochelle', 'en-tel':'+33 5 46 11 22 33', 'en-mail':'contact@dupont-clim.fr', 'en-site':'dupont-clim.fr' };
    for (const [id, val] of Object.entries(bons)) await remplir(c.p, id, val);
    await refus(c, BTN, 'en-nom', '', 'Le nom de l’entreprise est obligatoire.', avant); await remplir(c.p, 'en-nom', bons['en-nom']);
    await refus(c, BTN, 'en-nom', 'A'.repeat(61), 'Ce champ ne peut pas dépasser 60 signes.', avant); await remplir(c.p, 'en-nom', bons['en-nom']);
    for (const id of ['en-nom', 'en-patron', 'en-rue', 'en-ville', 'en-site']) for (const x of ['a<b', 'a>b', 'a"b']) { await refus(c, BTN, id, x, INT, avant); await remplir(c.p, id, bons[id]); }
    await refus(c, BTN, 'en-rue', '', ADR, avant); await remplir(c.p, 'en-rue', bons['en-rue']);
    await refus(c, BTN, 'en-ville', '', ADR, avant); await remplir(c.p, 'en-ville', bons['en-ville']);
    for (const x of ['1700', 'abcde', '170000', '']) { await refus(c, BTN, 'en-cp', x, 'Le code postal a cinq chiffres.', avant); } await remplir(c.p, 'en-cp', '17000');
    for (const x of ['abc', '12', 'tél 0546']) { await refus(c, BTN, 'en-tel', x, 'Ce numéro de téléphone ne semble pas juste.', avant); } await remplir(c.p, 'en-tel', bons['en-tel']);
    // un type=email du navigateur peut refuser avant nous : on passe par la valeur écrite pour que le message soit le nôtre
    for (const x of ['x@y', 'sans-arobase', 'a b@c.fr']) { await refus(c, BTN, 'en-mail', x, 'Cette adresse e-mail ne semble pas juste.', avant); } await remplir(c.p, 'en-mail', bons['en-mail']);
    // plusieurs refus à la fois : chacun sous SON champ
    await remplir(c.p, 'en-cp', '1'); await remplir(c.p, 'en-tel', 'x'); await cliquer(c, BTN);
    const a = await champ(c.p, 'en-cp'), b = await champ(c.p, 'en-tel'); v('deux champs faux : chacun écrit son message sous lui', a.err === 'Le code postal a cinq chiffres.' && b.err === 'Ce numéro de téléphone ne semble pas juste.', { a:a.err, b:b.err });
    const t = await toast(c.p); v('le premier refus est aussi dit en toast', /code postal a cinq chiffres/.test(t), t);
    const foc = await c.p.evaluate(() => document.activeElement && document.activeElement.id); v('le focus va au premier champ refusé', foc === 'en-cp', foc);
    await remplir(c.p, 'en-cp', '17000'); await remplir(c.p, 'en-tel', bons['en-tel']);
    // une valeur juste : enregistrée, panneau fermé, un refus d'avant effacé
    await cliquer(c, BTN); nCas++;
    const ap = await fiche(c.p), ouv = await panneauOuvert(c.p);
    v('valeur juste : le panneau se ferme', ouv === '', ouv);
    v('nom, dirigeant, tél, e-mail écrits', ap.E.nom === bons['en-nom'] && ap.E.patron === bons['en-patron'] && ap.E.tel === bons['en-tel'] && ap.E.mail === bons['en-mail'], ap.E);
    v('adresse écrite en UNE chaîne « rue, 17000 Ville »', ap.E.adr === '12 avenue de la Mer, bât. B, 17000 La Rochelle', ap.E.adr);
    v('le site reçoit https:// s’il n’y est pas', ap.E.site === 'https://dupont-clim.fr', ap.E.site);
    const od = await c.p.evaluate(() => { const o = opdDonnees().entreprise; return { adresse:o.adresse, cp:o.cp, ville:o.ville, nom:o.nom, site:o.site }; });
    v('l’adresse relue se redécoupe comme opdDonnees (rue avec virgule, code postal, ville)', od.adresse === '12 avenue de la Mer, bât. B' && od.cp === '17000' && od.ville === 'La Rochelle' && od.nom === 'Dupont Climatisation' && od.site === 'https://dupont-clim.fr', od);
    const t2 = await toast(c.p); v('un toast annonce l’enregistrement', /enregistrée/.test(t2), t2);
    await L.toucher(c, '[data-ent="carte|ident"]'); const r = await champ(c.p, 'en-rue'); v('le panneau rouvert est prérempli (rue sans le code postal)', r.val === '12 avenue de la Mer, bât. B', r);
    await L.fin(c); }

  // ───── carte 2 : tes mentions légales (le panneau est cxFicheLegale)
  { const c = await ouvrirEnt({ profil:'mac' }); const BTN = '[data-cx="ficheok"]';
    await L.toucher(c, '[data-ent="carte|legal"]'); const avant = await fiche(c.p);
    const bons = { 'fl-siret':'732 829 320 00074', 'fl-tva':'FR 40 303 123 456', 'fl-cap':'5 000', 'fl-rcs':'RCS La Rochelle 303 123 456', 'fl-ass':'MAAF Pro', 'fl-num':'décennale n° 123456', 'fl-asc':'MAAF, 79036 Niort', 'fl-zone':'France métropolitaine', 'fl-med':'CM2C, www.cm2c.net' };
    for (const [id, val] of Object.entries(bons)) await remplir(c.p, id, val); await c.p.selectOption('#fl-forme', 'SARL');
    for (const x of ['123', '1234567890123', 'abcdefghijklmn']) await refus(c, BTN, 'fl-siret', x, 'Le SIRET a quatorze chiffres. Tu le trouves sur ton avis de situation de l’Insee ou sur l’Annuaire des entreprises (annuaire-entreprises.data.gouv.fr).', avant); await remplir(c.p, 'fl-siret', bons['fl-siret']);
    for (const x of ['XX123456789', 'FR12', 'FR 12 12345678']) await refus(c, BTN, 'fl-tva', x, 'Un numéro de TVA français commence par FR, puis deux chiffres et les neuf chiffres de ton SIREN.', avant); await remplir(c.p, 'fl-tva', bons['fl-tva']);
    // ⛔ « tout-01 » : on ne refuse que ce qui est FAUX. Un capital qui n'est pas un montant est refusé ; un capital VIDE ne l'est pas (voir plus bas)
    for (const x of ['abc', 'beaucoup', '0']) await refus(c, BTN, 'fl-cap', x, 'Le capital est un montant en euros, par exemple 5 000.', avant); await remplir(c.p, 'fl-cap', bons['fl-cap']);
    for (const id of ['fl-rcs', 'fl-ass', 'fl-num', 'fl-asc', 'fl-zone', 'fl-med', 'fl-cap']) for (const x of ['a<b', 'a"b']) { await refus(c, BTN, id, x, INT, avant); await remplir(c.p, id, bons[id]); }
    await refus(c, BTN, 'fl-ass', 'x'.repeat(81), 'Ce champ ne peut pas dépasser 80 signes.', avant); await remplir(c.p, 'fl-ass', bons['fl-ass']);
    await c.p.selectOption('#fl-forme', 'SARL');
    await cliquer(c, BTN); nCas++;
    const ap = await fiche(c.p);
    v('SIRET rangé « 732 829 320 00074 » et TVA « FR40 303123456 »', ap.E.siret === '732 829 320 00074' && ap.E.tva === 'FR40 303123456', { s:ap.E.siret, t:ap.E.tva });
    v('assurance en QUATRE champs sous les noms de l’atelier (assureur, assurNum, assurc, assurZone), plus d’« assur » ni « zone »', ap.E.assureur === 'MAAF Pro' && ap.E.assurNum === 'décennale n° 123456' && ap.E.assurc === 'MAAF, 79036 Niort' && ap.E.assurZone === 'France métropolitaine' && !('assur' in ap.E) && !('zone' in ap.E), Object.keys(ap.E));
    v('forme, capital, immatriculation, médiateur écrits', ap.E.forme === 'SARL' && ap.E.capital === '5 000' && ap.E.rcs === bons['fl-rcs'] && ap.E.mediateur === bons['fl-med'], ap.E);
    const carte = await c.p.evaluate(() => { const e = document.querySelector('[data-ent="carte|legal"] .st'); return e && e.textContent; }); v('la carte passe à « Complète » (SIRET + mentions)', carte === 'Complète', carte);
    // « tout-01 » : forme, capital, immatriculation et assurance VIDES, SIRET juste : l'enregistrement passe, la fiche dit ce qui reste, la facture est débloquée
    await L.toucher(c, '[data-ent="carte|legal"]');
    for (const id of ['fl-cap', 'fl-rcs', 'fl-ass', 'fl-num', 'fl-asc', 'fl-zone', 'fl-med']) await remplir(c.p, id, ''); await c.p.selectOption('#fl-forme', ''); await cliquer(c, BTN); nCas++;
    { const ap2 = await fiche(c.p), ouv2 = await panneauOuvert(c.p), t3 = await toast(c.p), m = await c.p.evaluate(() => ({ M:entrepriseManque().length, L:cxMentionsManquantes().length }));
      v('SIRET seul (forme, capital, immatriculation, assurance vides) : enregistré, panneau fermé', ouv2 === '' && ap2.E.siret === '732 829 320 00074' && ap2.E.forme === '' && ap2.E.rcs === '', { ouv2, E:ap2.E });
      v('…la facture est débloquée (rien ne manque côté SIRET) et la fiche dit ce qui reste à compléter', m.M === 0 && m.L === 3, m);
      v('…le toast nomme ce qui reste', /Il reste à compléter : la forme juridique, l’immatriculation et l’assurance professionnelle\./.test(t3), t3); }
    await L.fin(c); }
  // le SIRET de démonstration ne passe pas la clé : il s'enregistre AVEC l'avertissement, la fiche reste « Complète » côté facture
  { const c = await ouvrirEnt({ profil:'mac' }); await L.toucher(c, '[data-ent="carte|legal"]');
    const s = await c.p.evaluate(() => ({ cle:cxSirenOk('123456789'), siret:ENTREPRISE.siret })); v('population : le SIRET de démonstration ne passe pas la clé de contrôle', s.cle === false && s.siret === '123 456 789 00012', s);
    await c.p.selectOption('#fl-forme', 'Entreprise individuelle (EI)'); await remplir(c.p, 'fl-rcs', 'RM La Rochelle'); await cliquer(c, '[data-cx="ficheok"]'); nCas++;
    const ap = await fiche(c.p), t = await toast(c.p); v('SIRET de démonstration enregistré (14 chiffres : seule condition de refus)', ap.E.siret === '123 456 789 00012' && (await panneauOuvert(c.p)) === '', ap.E.siret);
    v('un avertissement dit que le numéro de contrôle ne correspond pas', /Ce SIRET ne semble pas juste : le numéro de contrôle ne correspond pas\. Vérifie-le\./.test(t), t);
    const M = await c.p.evaluate(() => entrepriseManque().length); v('la fiche reste complète pour faire partir une facture', M === 0, M);
    await L.fin(c); }

  // ───── carte 4 : ta banque et ton comptable
  { const c = await ouvrirEnt({ profil:'mac' }); const BTN = '[data-ent="banqueok"]';
    await L.toucher(c, '[data-ent="carte|banque"]'); const avant = await fiche(c.p);
    const bons = { 'en-iban':'FR14 2004 1010 0505 0001 3M02 606', 'en-bic':'abcdfrpp', 'en-cab':'Cabinet Martin et Associés', 'en-expqui':'Claire Moreau', 'en-expmail':'c.moreau@martin-conseil.fr' };
    for (const [id, val] of Object.entries(bons)) await remplir(c.p, id, val);
    const IBANMSG = 'Cet IBAN ne semble pas juste. Vérifie-le : il commence par FR et compte 27 caractères.';
    for (const x of ['FR76 1234', 'FR14 2004 1010 0505 0001 3M02 607', 'pas un iban', '<b>FR1420041010050500013M02606']) await refus(c, BTN, 'en-iban', x, IBANMSG, avant); await remplir(c.p, 'en-iban', bons['en-iban']);
    for (const x of ['ABC', 'ABCDFRP', 'ABCDFRPPXXXX', 'ABCD-RPP']) await refus(c, BTN, 'en-bic', x, 'Un BIC a huit ou onze signes.', avant); await remplir(c.p, 'en-bic', bons['en-bic']);
    for (const x of ['x', 'a@b']) await refus(c, BTN, 'en-expmail', x, 'Cette adresse e-mail ne semble pas juste.', avant); await remplir(c.p, 'en-expmail', bons['en-expmail']);
    for (const id of ['en-cab', 'en-expqui']) for (const x of ['a<b', 'a"b']) { await refus(c, BTN, id, x, INT, avant); await remplir(c.p, id, bons[id]); }
    await cliquer(c, BTN); nCas++;
    const ap = await fiche(c.p);
    v('IBAN rangé par groupes de quatre, BIC en majuscules', ap.E.iban === 'FR14 2004 1010 0505 0001 3M02 606' && ap.E.bic === 'ABCDFRPP', { i:ap.E.iban, b:ap.E.bic });
    v('l’expert-comptable écrit dans CP_EXPERT (cabinet, nom, e-mail)', ap.X.cab === bons['en-cab'] && ap.X.qui === bons['en-expqui'] && ap.X.mail === bons['en-expmail'], ap.X);
    // le demo IBAN (FR76 3000 6000 0112 3456 7890 189) passe le contrôle mod 97 : l'enregistrer tel quel ne bloque pas
    const demo = await c.p.evaluate(() => entIbanOk('FR76 3000 6000 0112 3456 7890 189')); v('l’IBAN de démonstration passe le contrôle (rien à corriger pour l’enregistrer)', demo === true, demo);
    await L.fin(c); }

  // ───── carte 5 : tes horaires et tes tarifs
  { const c = await ouvrirEnt({ profil:'mac' }); const BTN = '[data-ent="horairesok"]';
    await L.toucher(c, '[data-ent="carte|horaires"]'); const avant = await fiche(c.p);
    const bons = { 'en-debut':'08:00', 'en-fin':'17:30', 'en-horaire':'72,5', 'en-minimum':'1,5', 'en-z1':'30', 'en-z2':'48,5', 'en-z3':'65' };
    for (const [id, val] of Object.entries(bons)) await remplir(c.p, id, val);
    const J = 'La journée doit durer au moins quatre heures.';
    await remplir(c.p, 'en-fin', '11:00'); await cliquer(c, BTN); nCas++; { const r = await champ(c.p, 'en-fin'); v('08:00 → 11:00 : « La journée doit durer au moins quatre heures. » sous « À »', r.err === J && r.sousLeChamp && r.invalide, r); }
    await remplir(c.p, 'en-debut', '18:00'); await remplir(c.p, 'en-fin', '08:00'); await cliquer(c, BTN); nCas++; { const r = await champ(c.p, 'en-fin'); v('fin avant le début : le même message', r.err === J, r); }
    await remplir(c.p, 'en-debut', bons['en-debut']); await remplir(c.p, 'en-fin', bons['en-fin']);
    for (const x of ['0', '501', 'abc', '', '-5']) await refus(c, BTN, 'en-horaire', x, 'Le tarif de l’heure doit être compris entre 1 et 500 €.', avant); await remplir(c.p, 'en-horaire', bons['en-horaire']);
    for (const x of ['0,3', '4,5', '1,25', 'x', '0']) await refus(c, BTN, 'en-minimum', x, 'Choisis une durée entre une demi-heure et quatre heures.', avant); await remplir(c.p, 'en-minimum', bons['en-minimum']);
    for (const id of ['en-z1', 'en-z2', 'en-z3']) { for (const x of ['501', '-1', 'x']) await refus(c, BTN, id, x, 'Un déplacement coûte entre 0 et 500 €.', avant); await remplir(c.p, id, bons[id]); }
    await cliquer(c, BTN); nCas++;
    const ap = await fiche(c.p);
    v('journée 08:00–17:30 écrite en minutes dans PARAMS', ap.P.debut === 480 && ap.P.fin === 1050, ap.P);
    v('tarif 72,5 ; minimum 90 min ; zones 30 / 48,5 / 65', ap.T.horaire === 72.5 && ap.T.minimum === 90 && ap.T.zone['1'] === 30 && ap.T.zone['2'] === 48.5 && ap.T.zone['3'] === 65, ap.T);
    v('`TARIFS.arrondi` n’est pas proposé (nulle part lu) et reste tel quel', ap.T.arrondi === 'heure', ap.T.arrondi);
    await L.fin(c); }
  v('population : cas joués', nCas >= 90, nCas);
  await fin();
})();
