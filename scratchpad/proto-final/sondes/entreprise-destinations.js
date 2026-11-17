// « Mon entreprise » : ce qu'on écrit dans les cartes ARRIVE là où ça s'imprime. On change nom, adresse, SIRET, TVA, téléphone, e-mail, IBAN, BIC,
// mentions légales, assurance (quatre champs), expert-comptable, horaires, tarifs et logo PAR LES VRAIS PANNEAUX, puis on lit les VRAIES fabriques de la page :
// facture, devis, contrat, bilan, bon et relevé de paie, espace client, registre, compte rendu… (leur texte), le bloc identité de l'atelier (opdDonnees),
// les créneaux du planning, une facture « au temps ». Le logo se compte avant de conclure : 17 gabarits dans le fichier, plus une seule initiale écrite en dur.
// ⛔ 127.0.0.1 seulement. Chaque contrôle compte sa population avant de conclure.
const fs = require('fs'), path = require('path');
const { L, v, ouvrirEnt, remplir, fiche, fin } = require('./entreprise-commun.js');
const PAGE = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
async function cliquer(c, sel) { await c.p.locator(sel).first().click(); await L.calme(c.p, 250); }
(async () => {
  // 0. le fichier lui-même : plus une seule initiale « CS » écrite en dur, dix-sept appels à logoEnt dans les gabarits
  const dur = (PAGE.match(/class="logo-ent">CS</g) || []).length, appels = (PAGE.match(/\$\{logoEnt\('(?:div|span)'\)\}/g) || []).length;
  v('population : 17 gabarits appellent logoEnt() (compté dans le fichier)', appels === 17, appels);
  v('aucune initiale « CS » écrite en dur dans un gabarit', dur === 0, dur);
  const c = await ouvrirEnt({ profil:'mac' });
  // 1. on remplit les cinq cartes par les vrais panneaux
  const N = { nom:'Zéphyr Confort Océan', patron:'Anaïs Tessier', rue:'8 rue des Embruns', cp:'17300', ville:'Rochefort', tel:'05 46 99 88 77', mail:'bonjour@zephyr-confort.fr', site:'zephyr-confort.fr' };
  await cliquer(c, '[data-ent="carte|ident"]');
  await remplir(c.p, 'en-nom', N.nom); await remplir(c.p, 'en-patron', N.patron); await remplir(c.p, 'en-rue', N.rue); await remplir(c.p, 'en-cp', N.cp); await remplir(c.p, 'en-ville', N.ville); await remplir(c.p, 'en-tel', N.tel); await remplir(c.p, 'en-mail', N.mail); await remplir(c.p, 'en-site', N.site);
  await cliquer(c, '[data-ent="identok"]');
  const G = { siret:'732 829 320 00074', tva:'FR40 303123456', forme:'SARL', capital:'8 000', rcs:'RCS Rochefort 111 222 333', assureur:'Assurances Océan', num:'RC 98765', asc:'Océan, 17000 La Rochelle', zone:'France et DOM', med:'Médiation Océan' };
  await cliquer(c, '[data-ent="carte|legal"]');
  await remplir(c.p, 'fl-siret', G.siret); await remplir(c.p, 'fl-tva', G.tva); await c.p.selectOption('#fl-forme', G.forme); await remplir(c.p, 'fl-cap', G.capital); await remplir(c.p, 'fl-rcs', G.rcs);
  await remplir(c.p, 'fl-ass', G.assureur); await remplir(c.p, 'fl-num', G.num); await remplir(c.p, 'fl-asc', G.asc); await remplir(c.p, 'fl-zone', G.zone); await remplir(c.p, 'fl-med', G.med);
  await cliquer(c, '[data-cx="ficheok"]');
  const B = { iban:'FR14 2004 1010 0505 0001 3M02 606', bic:'ZEPHFRPP', cab:'Cabinet Zéphyr Compta', qui:'Léa Marchand', mail:'lea@zephyr-compta.fr' };
  await cliquer(c, '[data-ent="carte|banque"]');
  await remplir(c.p, 'en-iban', B.iban); await remplir(c.p, 'en-bic', B.bic); await remplir(c.p, 'en-cab', B.cab); await remplir(c.p, 'en-expqui', B.qui); await remplir(c.p, 'en-expmail', B.mail);
  await cliquer(c, '[data-ent="banqueok"]');
  await cliquer(c, '[data-ent="carte|horaires"]');
  await remplir(c.p, 'en-debut', '06:30'); await remplir(c.p, 'en-fin', '19:00'); await remplir(c.p, 'en-horaire', '80'); await remplir(c.p, 'en-minimum', '2'); await remplir(c.p, 'en-z1', '31'); await remplir(c.p, 'en-z2', '47'); await remplir(c.p, 'en-z3', '66');
  await cliquer(c, '[data-ent="horairesok"]');
  const f = await fiche(c.p);
  v('les cinq panneaux ont écrit (population de départ)', f.E.nom === N.nom && f.E.siret === G.siret && f.E.iban === B.iban && f.P.debut === 390 && f.T.horaire === 80, { nom:f.E.nom, siret:f.E.siret });
  // 2. les fabriques de documents (texte lu : balises retirées, espaces ramenés à un)
  const lire = async (nom, js) => c.p.evaluate(({ js }) => { try { const h = String(eval(js)); return { ok:true, h, t:h.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, '\'').replace(/&quot;/g, '"').replace(/\s+/g, ' ') }; } catch (e) { return { ok:false, err:String(e.message || e) }; } }, { js });
  const pro = await c.p.evaluate(() => { const L = FACTURES.filter(f => f.num !== '—' && f.st !== 'avoir'); return { pro:(L.find(f => CLIENTS[f.cli].type === 'pro') || {}).id, part:(L.find(f => CLIENTS[f.cli].type === 'part') || {}).id }; });
  const DOCS = {
    facture:`pdfFacture(FACTURES.find(f => f.id === '${pro.pro}'))`, facturePart:`pdfFacture(FACTURES.find(f => f.id === '${pro.part}'))`,
    devis:`(dvInit(), docDevis(DV[0]))`, contrat:`pdfContrat(null, CONTRATS.find(k => k.st === 'signe'))`, bilan:`bilanPdf()`, compteRendu:`compteRenduPdf(INTS.find(i => i.st === 'fait').id)`,
    espaceClient:`(() => { const r = ROLE; try { ROLE = 'client'; return vueEspaceClient(); } finally { ROLE = r; } })()`, paie:`paieDoc('sm')`, bulletin:`paieBulletinDoc('sm', PAIE_NOM_MOIS && '2026-10')`, registre:`rgDoc && rgDoc('t1', 'tout')`,
    dvClient:`dvClient(DV[0])`, stBilan:`stBilan()`, hExport:`hExport()`, tExport:`tExport()`, aExport:`aExport()`
  };
  const T = {}; let lus = 0;
  for (const [k, js] of Object.entries(DOCS)) { const r = await lire(k, js); T[k] = r; if (r.ok && r.h.length > 200) lus++; else console.log('  · ' + k + ' : non lu (' + (r.err || 'trop court') + ')'); }
  v('population : au moins 11 fabriques de documents lues', lus >= 11, lus);
  const doc = (k, nom, txt) => { const r = T[k]; if (!r || !r.ok || r.h.length <= 200) return; v(`${k} : ${nom}`, r.t.includes(txt), txt); };
  for (const k of ['facture', 'devis', 'contrat', 'compteRendu', 'paie', 'bulletin', 'registre', 'bilan', 'stBilan', 'hExport', 'tExport', 'aExport', 'dvClient', 'espaceClient']) doc(k, 'le nom de l’entreprise', N.nom);
  for (const k of ['facture', 'devis', 'contrat', 'bilan', 'stBilan']) doc(k, 'l’adresse (rue)', N.rue);
  doc('facture', 'le SIRET', 'SIRET ' + G.siret); doc('facture', 'la TVA', G.tva);
  doc('facture', 'le téléphone', N.tel); doc('facture', 'l’e-mail', N.mail);
  doc('facture', 'l’IBAN ET le BIC à côté', B.iban + ' · BIC ' + B.bic);
  doc('espaceClient', 'l’IBAN', B.iban); doc('espaceClient', 'le BIC', B.bic);
  doc('facture', 'l’assurance en quatre champs au pied', 'Assurance : Assurances Océan n° RC 98765 (Océan, 17000 La Rochelle), zone couverte : France et DOM');
  doc('devis', 'l’assurance en quatre champs au pied', 'Assurance : Assurances Océan n° RC 98765 (Océan, 17000 La Rochelle), zone couverte : France et DOM');
  doc('facture', 'forme et capital', 'SARL au capital de 8 000 €'); doc('facture', 'l’immatriculation', G.rcs);
  doc('facturePart', 'le médiateur (facture à un particulier)', G.med);
  // l'expert-comptable : « Envoyer à… » ET la paie parlent au même cabinet
  const cab = await c.p.evaluate(() => ({ nom:PAIE_CAB.nom, qui:PAIE_CAB.qui, mail:PAIE_CAB.mail, doc:paieDoc('sm'), bil:bilanPdf() }));
  v('PAIE_CAB suit CP_EXPERT (cabinet, nom, e-mail : une seule source)', cab.nom === B.cab && cab.qui === B.qui && cab.mail === B.mail, cab);
  v('le relevé de paie s’adresse au nouveau cabinet', cab.doc.includes(B.cab) && cab.doc.includes('data-a="' + B.mail + '"'), 'paie');
  v('le bilan des encaissements part chez le nouveau comptable (data-a)', cab.bil.includes('data-a="' + B.mail + '"'), 'bilan');
  // l'atelier de devis lit les MÊMES noms
  const od = await c.p.evaluate(() => opdDonnees().entreprise);
  v('opdDonnees : nom, adresse, code postal, ville, tél, e-mail, site', od.nom === N.nom && od.adresse === N.rue && od.cp === N.cp && od.ville === N.ville && od.tel === N.tel && od.mail === N.mail && od.site === 'https://' + N.site, od);
  v('opdDonnees : SIRET, TVA, IBAN, BIC, forme, capital, RCS', od.siret === G.siret && od.tva === G.tva && od.iban === B.iban && od.bic === B.bic && od.forme === 'SARL' && od.capital === '8 000' && od.rcs === G.rcs, od);
  v('opdDonnees : l’assurance saisie dans la carte ARRIVE à l’atelier (le défaut du pont : assureur, assurNum, assurZone)', od.assureur === G.assureur && od.assurNum === G.num && od.assurZone === G.zone, { a:od.assureur, n:od.assurNum, z:od.assurZone });
  // horaires et tarifs : créneaux du planning, facture au temps
  const h = await c.p.evaluate(() => { try { ouvrirCreation({}); CREA.fact = 'temps'; const m = infoMode('temps'); const lg = lignesCrea(90, {}); const aide = document.body.innerText; fermerCreation && fermerCreation(); return { m, lg, rdv:rdvHeures({ dur:60 }, 'sm', AUJ).length ? hm(rdvHeures({ dur:60 }, 'sm', AUJ)[0][0] || 0) : '' , debut:hm(PARAMS.debut), fin:hm(PARAMS.fin) }; } catch (e) { return { err:String(e.message) }; } });
  if (h.err) console.log('  · horaires/tarifs : ' + h.err);
  v('créneaux : la journée de travail du planning est celle de la carte (06:30 – 19:00)', !h.err && h.debut.replace(/\D/g, '') === '0630' && h.fin.replace(/\D/g, '') === '1900', h);
  v('facture au temps : « 80,00 € HT de l’heure », minimum 2 h, déplacements 31 / 47 / 66', !h.err && /80,00\s€ HT de l’heure/.test(h.m) && /minimum 2\s?h/.test(h.m) && h.lg && h.lg[0][1] === 160 && h.lg[1][1] != null, h);
  const zs = await c.p.evaluate(() => [1, 2, 3].map(z => TARIFS.zone[z])); v('trois déplacements écrits', zs.join('|') === '31|47|66', zs);
  // 3. le logo : une image par le vrai champ « fichier », comptée dans chaque gabarit lu
  await cliquer(c, '[data-ent="carte|logo"]');
  await c.p.setInputFiles('#en-logo', { name:'logo.png', mimeType:'image/png', buffer:PNG }); await L.calme(c.p, 400);
  const ap = await c.p.evaluate(() => { const i = document.querySelector('#en-ap img.logo-ent'); return i ? i.getAttribute('src').slice(0, 22) : null; });
  v('l’aperçu montre l’image choisie avant d’enregistrer', ap === 'data:image/png;base64,', ap);
  await cliquer(c, '[data-ent="logook"]');
  const avec = {}; for (const [k, js] of Object.entries(DOCS)) { const r = await lire(k, js); if (r.ok && r.h.length > 200) avec[k] = r.h; }
  const nbImg = Object.entries(avec).filter(([k, h]) => /<img class="logo-ent" src="data:image\/png/.test(h)).map(([k]) => k), nbIni = Object.entries(avec).filter(([k, h]) => />ZC</.test(h)).map(([k]) => k);
  v(`population : ${Object.keys(avec).length} gabarits lus avec le logo`, Object.keys(avec).length >= 11, Object.keys(avec).length);
  v('le logo choisi est une IMAGE dans chaque gabarit lu', nbImg.length === Object.keys(avec).length, { image:nbImg, manque:Object.keys(avec).filter(k => !nbImg.includes(k)) });
  v('plus aucune initiale à côté de l’image', nbIni.length === 0, nbIni);
  const carte = await c.p.evaluate(() => (document.querySelector('[data-ent="carte|logo"] .ent-ligne') || {}).textContent); v('la carte dit « Choisi »', carte === 'Choisi', carte);
  // sans logo : les initiales du NOM (deux premiers mots) — « Zéphyr Confort Océan » → ZC
  await cliquer(c, '[data-ent="carte|logo"]'); await cliquer(c, '[data-ent="logoretirer"]'); await cliquer(c, '[data-ent="logook"]');
  const sans = await lire('facture', DOCS.facture); v('logo retiré : les initiales du nom (ZC) reviennent', />ZC</.test(sans.h) && !/data:image/.test(sans.h), sans.h.match(/class="logo-ent"[^>]*>[^<]*/g));
  await c.p.evaluate(() => { ENTREPRISE.nom = 'Dupont'; }); const un = await lire('facture', DOCS.facture); v('un nom d’un seul mot : une seule initiale', />D</.test(un.h), un.h.match(/class="logo-ent"[^>]*>[^<]*/g));
  v('aucune erreur de page', c.err.length === 0, c.err);
  await L.fin(c);
  await fin();
})();
