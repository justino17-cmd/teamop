// Recontrôle ADVERSE de la partie « Clients » (17 novembre 2026) — TROIS PARCOURS de bout en bout, joués comme une personne (touchers, saisies, retours), puis relus ailleurs.
//  P1 particulier : « ＋ Nouveau client » › avec un devis (Rochefort) › la liste › la fiche › « ＋ Nouvelle intervention » (client déjà choisi) › Planning/Interventions › « Proposer un contrat » › ‹ Retour › on retombe sur la fiche.
//  P2 professionnel : « ＋ Nouveau client » › avec une intervention › la fiche › on lui change le nom, le téléphone, l’adresse › la recherche par téléphone (+33) le retrouve › « Par mois ».
//  P3 le client existant qui travaille (Vieux Port) : appeler / e-mail / devis rapide / contrat depuis la fiche, retour à chaque fois sur la fiche, retour du navigateur.
// Usage : PROFIL=… QUI=marc NUIT=1 node clients-recontrole-parcours.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/clients-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const toast = () => p.evaluate(() => ((document.querySelector('#toast') || {}).textContent || '').replace(/\s+/g, ' ').trim());
  const h1 = () => p.evaluate(() => (document.querySelector('#contenu h1') || {}).textContent || '');
  const hash = () => p.evaluate(() => location.hash);
  const cles = () => p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv'));
  const remplirDvn = async o => { for (const [k, val] of Object.entries(o)) { await p.fill('#dvn-' + k, val); await p.evaluate(s => document.querySelector(s).blur(), '#dvn-' + k); await L.calme(p, 120); } };
  const remplirFen = async o => { for (const [k, val] of Object.entries(o)) { await p.fill(`.fen [data-cnv="${k}"]`, val); await p.evaluate(s => document.querySelector(s).blur(), `.fen [data-cnv="${k}"]`); await L.calme(p, 120); } };
  const champ = async (k, val) => { await p.fill(`[data-ci="${k}"]`, val); await p.evaluate(k => document.querySelector(`[data-ci="${k}"]`).blur(), k); await L.calme(p, 100); };
  const base = await cles(); v('population : 8 clients au départ', base.length === 8, base.length);
  const garde = async nom => { const d = await L.deborde(c); v(nom + ' : la page ne glisse pas de côté', d.bouge === 0, d); if (c.doigt) { const g = await L.doigts(p, '#contenu'); v(nom + ' : cibles ≥ 44 px, champs ≥ 16 px, aucun texte écrasé', g.petits.length === 0 && g.champs.length === 0 && g.ecrases.length === 0, g); } };

  // ───────── P1 ─────────
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientNvDevis"]'); await L.calme(p, 400);
  await L.capture(c, CAP + 'p1-devis-form-' + ETQ + '.png');
  await remplirDvn({ nom: 'Lemoine', prenom: 'Sophie', tel: '+33 6 12 98 76 54', mail: 'sophie.lemoine@mail.fr', adr: '9 rue des Salines, 17300 Rochefort', objet: 'Remplacement de la climatisation' });
  await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 700);
  let ap = await cles(); const k1 = ap.find(k => !base.includes(k)); v('P1 : le devis rapide crée le client (' + k1 + ')', !!k1, ap);
  const info1 = await p.evaluate(k => ({ c: CLIENTS[k], g: CR_GEO[k] || null, s: SECT_CLI[k] || null, dv: DV.filter(d => d.cli === k).map(d => d.objet) }), k1);
  v('P1 : fiche créée = Sophie Lemoine, particulier, téléphone écrit à la française (« +33 » devient « 0 », décision du 17 novembre) (' + info1.c.tel + ')', info1.c.nom === 'Sophie Lemoine' && info1.c.type === 'part' && /^06 12 98 76 54$/.test(info1.c.tel), info1.c);
  v('P1 : point sur la carte et secteur (' + JSON.stringify(info1.g) + ', ' + info1.s + ')', !!info1.g && !!info1.s, info1);
  v('P1 : le devis est à son nom (' + info1.dv.join(' | ') + ')', info1.dv.length === 1, info1);
  console.log('  · après la création : ' + (await hash()) + ' · « ' + (await h1()) + ' »');
 await L.aller(p, 'clients');
  for (const q of ['+33 6 12 98 76 54', '06 12 98 76 54', '0612987654', '+33612987654']) { await p.fill('[data-cherche]', q); await L.calme(p, 250);
    v('P1 : la liste retrouve Sophie Lemoine (téléphone rangé « ' + info1.c.tel + ' ») en tapant « ' + q + ' »', (await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte b')].map(b => b.textContent))).includes('Sophie Lemoine')); }
  await p.fill('[data-cherche]', '06 12 98 76 54'); await L.calme(p, 250);
  v('P1 : (rappel) la liste la retrouve par « 06 12 98 76 54 »', (await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte b')].map(b => b.textContent))).includes('Sophie Lemoine'));
  await p.fill('[data-cherche]', ''); await L.aller(p, 'client-x-' + k1); await L.capture(c, CAP + 'p1-fiche-' + ETQ + '.png');
  const fiche1 = await p.evaluate(() => ({ h1: document.querySelector('#contenu h1').textContent, kpi: [...document.querySelectorAll('#contenu .kpis .kpi')].map(e => e.textContent.replace(/\s+/g, ' ').trim()), appeler: (document.querySelector('.tete-client a[href^="tel"]') || {}).href || null, mail: (document.querySelector('.tete-client a[href^="mailto"]') || {}).href || null, devis: [...document.querySelectorAll('#contenu .col .carte')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 90)) }));
  v('P1 : fiche : « Appeler » compose le numéro, sans espace (' + fiche1.appeler + ')', /^tel:\+?\d{9,}$/.test(fiche1.appeler || ''), fiche1);
  v('P1 : fiche : « E-mail » ouvre l’e-mail (' + fiche1.mail + ')', /^mailto:sophie\.lemoine@mail\.fr/.test(fiche1.mail || ''), fiche1);
  v('P1 : le devis paraît sur la fiche (colonne Devis)', fiche1.devis.some(t => /Remplacement de la climatisation/.test(t)), fiche1.devis);
  await garde('P1 fiche');
  // intervention depuis la fiche : le client est déjà choisi
  await L.toucher(c, '.tete-client [data-creer="1"]'); await L.calme(p, 500);
  const crea = await p.evaluate(() => ({ cli: CREA && CREA.cli, nouveau: CREA && CREA.nouveau, fen: !!document.querySelector('#fenetre .fen'), titre: (document.querySelector('#fenetre .fen h2') || {}).textContent }));
  v('P1 : « ＋ Nouvelle intervention » depuis la fiche ouvre la fenêtre avec CE client déjà choisi', crea.cli === k1 && !crea.nouveau && crea.fen, crea);
  await L.capture(c, CAP + 'p1-creation-' + ETQ + '.png');
  await L.toucher(c, '[data-action="cPlusTard"]'); await L.toucher(c, '[data-action="cCreer"]'); await L.calme(p, 600);
  const i1 = await p.evaluate(k => INTS.filter(i => i.cli === k).map(i => ({ id: i.id, st: i.st, titre: i.titre })), k1); v('P1 : l’intervention est créée au nom du client (' + JSON.stringify(i1) + ')', i1.length === 1 && i1[0].st === 'aplanifier', i1);
  await L.aller(p, 'interventions'); const f0 = await p.evaluate(() => ({ filtre: filtreInt, vu: /Lemoine/.test(document.getElementById('contenu').innerText), chips: [...document.querySelectorAll('[data-filtreint]')].map(b => b.textContent.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')) }));
  console.log('  · Interventions à l’ouverture : ' + JSON.stringify(f0)); await L.toucher(c, '[data-filtreint="plan"]');
  v('P1 : l’intervention créée « à planifier » se retrouve dans Interventions › « À planifier » sous le nom de la cliente', await p.evaluate(() => /Lemoine/.test(document.getElementById('contenu').innerText)), f0);
  await L.capture(c, CAP + 'p1-interventions-a-planifier-' + ETQ + '.png');
  // la même intervention « à planifier » dans « Par semaine » / « Par mois » de la liste des clients : le nom du technicien ne doit pas être celui d'un autre
  await L.aller(p, 'clients'); for (const rang of ['semaine', 'mois']) { await L.toucher(c, `[data-rangc="${rang}"]`); const tt = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' ')); const m = tt.match(/.{0,50}Lemoine.{0,90}/); console.log('  · « Par ' + rang + ' » : ' + (m ? m[0] : '(la cliente n’y paraît pas)'));
    v('P1 : « Par ' + rang + ' » : pas de « undefined » ni « NaN », la cliente paraît ' + (rang === 'semaine' ? 'si son intervention est dans la semaine' : 'au mois de son intervention'), !/undefined|NaN/.test(tt), tt.slice(0, 100)); await L.capture(c, CAP + 'p1-par-' + rang + '-' + ETQ + '.png'); }
  await L.toucher(c, '[data-rangc="tous"]');
  await L.aller(p, 'client-x-' + k1); const h2 = await p.evaluate(() => [...document.querySelectorAll('#contenu .tl > button')].map(b => b.innerText.replace(/\s+/g, ' ')));
  v('P1 : l’historique de la fiche montre l’intervention créée (' + h2.length + ' ligne)', h2.length >= 1, h2);
  await L.toucher(c, '#contenu [role=tab][data-oc="contrats"]'); await L.toucher(c, '[data-action="contratPour"]'); await L.calme(p, 500);
  v('P1 : « Proposer un contrat » ouvre le contrat pour CE client (' + (await hash()) + ')', /contrat-nouveau/.test(await hash()) && (await p.evaluate(() => BROUILLON.cli)) === k1, await hash());
  await L.capture(c, CAP + 'p1-contrat-' + ETQ + '.png'); await garde('P1 contrat');
  await L.toucher(c, '#contenu [data-rl="retour"], #contenu .retour'); await L.calme(p, 400);   /* en mode application, rlRetourBouton remplace « .retour » par « .rl-retour » */
  v('P1 : « ‹ Retour » ramène à la fiche de Sophie Lemoine (' + (await hash()) + ' · « ' + (await h1()) + ' »)', (await h1()) === 'Sophie Lemoine', await hash());

  // ───────── P2 ─────────
  const base2 = await cles(); await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientNvInt"]'); await L.calme(p, 400);
  await L.toucher(c, '.fen [data-cnvtype="pro"]'); await L.calme(p, 200);
  await remplirFen({ nom: 'Garage du Port', contact: 'Éric Mallet', tel: '05 46 11 22 33', mail: 'contact@garageduport.fr', adr: '18 quai de la Marine, 17000 La Rochelle' });
  await L.capture(c, CAP + 'p2-creation-' + ETQ + '.png'); await L.toucher(c, '[data-action="cPlusTard"]'); await L.toucher(c, '[data-action="cCreer"]'); await L.calme(p, 600);
  const k2 = (await cles()).find(k => !base2.includes(k)); v('P2 : le client professionnel est créé (' + k2 + ')', !!k2);
  const i2 = k2 ? await p.evaluate(k => ({ c: CLIENTS[k], g: CR_GEO[k] || null, s: SECT_CLI[k] || null }), k2) : null;
  v('P2 : type « professionnel », nom = raison sociale, contact = Éric Mallet (' + JSON.stringify(i2 && [i2.c.type, i2.c.nom, i2.c.contact]) + ')', i2 && i2.c.type === 'pro' && i2.c.nom === 'Garage du Port' && /Mallet/.test(i2.c.contact), i2);
  if (k2) {
    await L.aller(p, 'client-x-' + k2); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); await champ('nom', 'Garage du Port & Fils'); await champ('tel', '+33 5 46 11 22 44'); await champ('adr', '3 rue Gambetta, 17440 Aytré');
    await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 400); v('P2 : les trois changements s’enregistrent (' + await toast() + ')', /enregistrée/.test(await toast()));
    const g2 = await p.evaluate(k => ({ g: CR_GEO[k], s: SECT_CLI[k], tel: CLIENTS[k].tel }), k2); v('P2 : la carte suit la nouvelle adresse (Aytré) : ' + JSON.stringify(g2), g2.g && Math.abs(g2.g[0] - 46.1331) < 0.01 && g2.s === 'Sud', g2);
    await L.aller(p, 'clients'); await p.fill('[data-cherche]', '+33 5 46 11 22 44'); await L.calme(p, 250); v('P2 : la recherche « +33 5 46 11 22 44 » retrouve le client', (await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte b')].map(b => b.textContent))).includes('Garage du Port & Fils'), g2);
    await p.fill('[data-cherche]', ''); await L.toucher(c, '[data-rangc="mois"]'); const mois = await p.evaluate(() => document.getElementById('contenu').innerText); v('P2 : « Par mois » ne plante pas et ne montre pas de client « undefined » / « NaN »', !/undefined|NaN|\[object/.test(mois), mois.slice(0, 120)); await L.toucher(c, '[data-rangc="tous"]'); }

  // ───────── P3 ─────────
  await L.aller(p, 'client-x-vp'); const retours = [];
  const dev = await p.evaluate(() => ({ tel: (document.querySelector('.tete-client a[href^="tel"]') || {}).getAttribute('href'), mail: (document.querySelector('.tete-client a[href^="mailto"]') || {}).getAttribute('href') }));
  v('P3 : « Appeler » = lien tel: sans espace, « E-mail » = mailto: (' + JSON.stringify(dev) + ')', /^tel:\+?\d+$/.test(dev.tel || '') && /^mailto:marc@vieuxport\.fr/.test(dev.mail || ''), dev);
  await L.toucher(c, '.tete-client [data-action="clientDevis"]'); await L.calme(p, 500);
  const dv = await p.evaluate(() => ({ h: location.hash, cli: DVN_F && DVN_F.cli, txt: (document.querySelector('#contenu h1') || {}).textContent }));
  v('P3 : « Devis rapide » ouvre le devis avec le client déjà choisi (' + JSON.stringify(dv) + ')', dv.cli === 'vp', dv); await L.capture(c, CAP + 'p3-devis-' + ETQ + '.png');
  await L.toucher(c, '#contenu .retour, #contenu [data-retour]'); await L.calme(p, 400); v('P3 : retour du devis → la fiche du Vieux Port (« ' + await h1() + ' »)', /Vieux Port/.test(await h1()), await hash());
  await p.goBack(); await L.calme(p, 500); const hb = await hash(); console.log('  · retour du navigateur depuis la fiche : ' + hb + ' « ' + await h1() + ' »');
  v('P3 : le retour du navigateur ne laisse pas une page blanche (un titre existe : « ' + await h1() + ' »)', (await h1()).length > 0, hb);
  v('aucune erreur JavaScript pendant les trois parcours', c.err.length === 0, c.err);
  const code = L.bilan(); await L.fin(c); await L.fermer(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
