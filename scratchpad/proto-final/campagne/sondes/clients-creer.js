// Campagne « clients » (17 novembre 2026) — CRÉER UN CLIENT : avec une intervention, avec un devis ; champs vides, absurdes, très longs ; doublon ; annuler ;
// double toucher ; ce que le client créé devient (liste, fiche, historique, position sur la carte, recherche). Usage : PROFIL=… QUI=… NUIT=1
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-clients/';
const NOM60 = 'Établissements Dupont-Lefebvre & Fils de la Grande Rochelle SARL';   // 63 signes, avec « & » et des accents
const ADR120 = '12 bis rue du Docteur Jean-Baptiste de la Fontaine-Mortagne, Résidence Les Hauts de Salles, bâtiment C, 17220 Salles-sur-Mer';
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const nb = () => p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv').length);
  const t = () => p.evaluate(() => ((document.querySelector('#toast') || {}).textContent || '').replace(/\s+/g, ' ').trim());
  const fen = () => p.evaluate(() => !!document.querySelector('#fenetre .fen'));
  const ouvrirNv = async via => { await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, via === 'devis' ? '[data-action="clientNvDevis"]' : '[data-action="clientNvInt"]'); await L.calme(p, 400); };
  const remplir = async (o, via) => { for (const [k, val] of Object.entries(o)) { if (val === undefined) continue; const sel = via === 'devis' ? '#dvn-' + k : `.fen [data-cnv="${k}"]`; await p.fill(sel, val); await p.evaluate(s => { const e = document.querySelector(s); e && e.blur && e.blur(); }, sel); await L.calme(p, 150); } };
  const n0 = await nb();
  v('population : 8 clients au départ', n0 === 8, n0);
  // ── le panneau « Nouveau client » ──
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]');
  const pn = await p.evaluate(() => ({ h2: (document.querySelector('#calque .panneau h2') || {}).textContent, txt: (document.querySelector('#calque .panneau') || {}).innerText, boutons: [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim()) }));
  v('« ＋ Nouveau client » ouvre un panneau qui propose deux façons de commencer : ' + pn.boutons.join(' | '), pn.h2 === 'Nouveau client' && pn.boutons.includes('Avec une intervention') && pn.boutons.includes('Avec un devis'), pn);
  await L.capture(c, CAP + `creer-panneau-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  await L.ranger(p); v('Échap ferme le panneau « Nouveau client »', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
  // ── par une intervention : champs vides ──
  await ouvrirNv('int'); v('la fenêtre s’ouvre en « ＋ Nouveau client » (rien à choisir avant)', await p.evaluate(() => CREA && CREA.nouveau === true));
  let b = await p.evaluate(() => { const e = document.querySelector('[data-action="cCreer"]'); return { dis: e.disabled || e.getAttribute('aria-disabled') === 'true' || e.classList.contains('off'), cls: e.className }; });
  await L.toucher(c, '[data-action="cPlusTard"]'); await L.toucher(c, '[data-action="cCreer"]'); await L.calme(p, 400);
  let n1 = await nb(); v('champs vides + « Plus tard » + « Créer » : aucun client fantôme n’est créé (' + n1 + ')', n1 === n0 && (await fen() || /nom|client|tél|adresse|indique/i.test(await t())), { n1, toast: await t() });
  console.log('  · message affiché : « ' + (await t()) + ' » · bouton ' + JSON.stringify(b));
  // chaque refus se joue dans une fenêtre NEUVE (la fenêtre se ferme dès qu'un client est créé)
  const essai = async champs => { if (!(await fen())) await ouvrirNv('int'); await remplir(champs); await L.toucher(c, '[data-action="cPlusTard"]'); const avant = await nb(); await L.toucher(c, '[data-action="cCreer"]'); await L.calme(p, 350); return { cree: (await nb()) - avant, toast: await t(), ouverte: await fen() }; };
  const fermer = () => p.evaluate(() => { try { fermerCreation(); } catch (e) {} });
  let r = await essai({ nom: 'Essai un' }); await fermer();
  console.log('  · nom seul → ' + JSON.stringify(r));
  v('intervention-01 : un client sans téléphone, sans e-mail ni adresse ne se crée pas (le formulaire du devis, lui, l’exige)', r.cree === 0, r);
  await ouvrirNv('int'); r = await essai({ nom: 'Essai deux', tel: '12' }); v('téléphone « 12 » refusé (« à vérifier »)', r.cree === 0 && /téléphone|numéro/i.test(r.toast), r); await fermer();
  await ouvrirNv('int'); r = await essai({ nom: 'Essai trois', tel: '06 00 00 00 03', mail: 'pas-un-mail' }); v('e-mail « pas-un-mail » refusé', r.cree === 0 && /mail/i.test(r.toast), r); await fermer();
  const nBase = await nb(); console.log('  · ' + (nBase - n0) + ' client(s) de plus après les trois essais refusables : ces refus n’existent pas dans ce formulaire');
  await ouvrirNv('int'); await remplir({ nom: 'Dupont', tel: '06 11 22 33 44' }); await L.calme(p, 100);
  await remplir({ contact: 'Jean-Pierre', mail: 'jp.dupont@mail.fr', adr: ADR120 }); await L.calme(p, 300);
  const rep = await p.evaluate(() => (document.querySelector('.fen .adr-rep') || {}).innerText); v('l’adresse de 120 signes est « Repérée : Salles-sur-Mer » (' + (rep || '').replace(/\s+/g, ' ').slice(0, 80) + ')', /Salles-sur-Mer/.test(rep || ''), rep);
  await L.capture(c, CAP + `creer-rempli-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  let d = await L.deborde(c); v('fenêtre « Nouveau client » remplie avec une adresse de 120 signes : aucun glissement latéral', d.bouge === 0, d);
  if (c.doigt) { const g = await L.doigts(p, '#fenetre'); v('fenêtre de création : cibles ≥ 44 px', g.petits.length === 0, g.petits); v('fenêtre de création : champs ≥ 16 px', g.champs.length === 0, g.champs); }
  await L.toucher(c, '[data-action="cPlusTard"]'); await L.toucher(c, '[data-action="cCreer"]'); await L.calme(p, 600); n1 = await nb();
  v('avec tout renseigné : le client est créé (' + n1 + ' clients)', n1 === nBase + 1, { n1, toast: await t() });
  const k1 = await p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv').pop());
  const cr = await p.evaluate(k => ({ c: CLIENTS[k], geo: CR_GEO[k] || null, sect: SECT_CLI[k] || null, ints: INTS.filter(i => i.cli === k).map(i => ({ titre: i.titre, st: i.st, tech: i.tech })) }), k1);
  v('client créé : nom « ' + cr.c.nom + ' » = prénom + nom, type particulier, contact et coordonnées gardés', cr.c.nom === 'Jean-Pierre Dupont' && cr.c.type === 'part' && cr.c.tel === '06 11 22 33 44' && cr.c.mail === 'jp.dupont@mail.fr' && cr.c.adr === ADR120, cr.c);
  v('client créé avec une intervention : il a sa position sur la carte des tournées (Salles-sur-Mer)', !!cr.geo, cr.geo);
  v('… et son secteur (' + cr.sect + ')', !!cr.sect, cr.sect);
  v('l’intervention créée est à son nom, « à planifier »', cr.ints.length === 1 && cr.ints[0].st === 'aplanifier', cr.ints);
  await L.aller(p, 'clients'); await chercher(p, 'dupont'); const li = await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte b')].map(b => b.textContent)); v('la recherche « dupont » trouve le nouveau client ET M. et Mme Durand ? ' + li.join(' | '), li.includes('Jean-Pierre Dupont'), li);
  await p.fill('[data-cherche]', '0611223344'); await L.calme(p, 250); v('… et le trouve par son téléphone', (await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte b')].map(b => b.textContent))).includes('Jean-Pierre Dupont'));
  await L.aller(p, 'client-x-' + k1);
  const fi = await p.evaluate(() => ({ h1: document.querySelector('#contenu h1').textContent, sur: (document.querySelector('.surtitre') || {}).textContent, kpi: [...document.querySelectorAll('#contenu .kpis .kpi')].map(e => e.textContent.replace(/\s+/g, ' ').trim()), histo: [...document.querySelectorAll('#contenu .tl > button')].map(b => b.innerText.replace(/\s+/g, ' ')), mail: !!document.querySelector('.tete-client a[href^="mailto:"]') }));
  v('fiche du nouveau client : titre, « Particulier · depuis 2026 », historique = l’intervention créée', fi.h1 === 'Jean-Pierre Dupont' && /Particulier/.test(fi.sur) && fi.histo.length === 1 && /Dépannage/.test(fi.histo[0]), fi);
  console.log('  · tuiles du nouveau client : ' + JSON.stringify(fi.kpi));
  v('nouveau client : « 0,00 € payé » et « 0,00 € à recevoir », prochain passage « — » (rien de planifié)', /^0,00/.test(fi.kpi[0]) && /^0,00/.test(fi.kpi[1]) && /^—/.test(fi.kpi[2]), fi.kpi);
  v('nouveau client : la tuile appareils ne prétend pas qu’il a un appareil qu’on ne connaît pas (« ' + fi.kpi[3] + ' »)', /^0 appareil|à renseigner/.test(fi.kpi[3]) || /^Aucun/.test(fi.kpi[3]), fi.kpi[3]);
  await L.toucher(c, '#contenu [data-oc="appareils"]'); const app = await p.evaluate(() => document.querySelector('#contenu .grille2 > .carte').innerText.replace(/\s+/g, ' ')); console.log('  · appareils du nouveau client : « ' + app + ' »');
  v('onglet Appareils du nouveau client : pas de faux appareil « à compléter » sans moyen de le compléter', !/à compléter/.test(app) || (await p.evaluate(() => !!document.querySelector('#contenu .grille2 > .carte button, #contenu .grille2 > .carte input'))), app);
  await L.capture(c, CAP + `creer-fiche-nouveau-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  // ── par un devis ──
  await ouvrirNv('devis'); n1 = await nb();
  await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300);
  v('devis sans nom : « Indique le nom du client. »', /Indique le nom/.test(await p.evaluate(() => (document.querySelector('#calque .alerte') || {}).textContent || '')), null);
  await remplir({ nom: NOM60 }, 'devis'); await L.toucher(c, '[data-dvn="type|pro"]'); await L.toucher(c, '[data-dvn="creer|1"]');
  v('devis sans téléphone ni e-mail : refusé avec une phrase qui dit pourquoi', /téléphone ou un e-mail/.test(await p.evaluate(() => (document.querySelector('#calque .alerte') || {}).textContent || '')), null);
  await remplir({ nom: NOM60, prenom: 'Anne Ledoux', tel: '+33 6 12 34 56 78', mail: 'anne@ledoux-sarl.fr', adr: '12 rue de la République, 17300 Rochefort' }, 'devis'); await L.toucher(c, '[data-dvn="creer|1"]');
  v('devis sans objet : « Indique l’objet du devis. »', /objet du devis/.test(await p.evaluate(() => (document.querySelector('#calque .alerte') || {}).textContent || '')), null);
  await remplir({ objet: 'Remplacement de la pompe de relevage' }, 'devis'); await L.capture(c, CAP + `creer-devis-rempli-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 700); const n2 = await nb();
  v('avec tout renseigné (nom de 63 signes, téléphone +33) : le client pro est créé (' + n2 + ')', n2 === n1 + 1, { n2, h: await p.evaluate(() => location.hash), toast: await t() });
  const k2 = await p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv').pop());
  const cd = await p.evaluate(k => ({ c: CLIENTS[k], geo: CR_GEO[k] || null, sect: SECT_CLI[k] || null, dv: DV.filter(d => d.cli === k).map(d => d.objet) }), k2);
  v('client créé avec un devis : pro, raison sociale gardée, contact « Anne Ledoux », téléphone formaté (« ' + cd.c.tel + ' »)', cd.c.type === 'pro' && cd.c.nom === NOM60 && cd.c.contact === 'Anne Ledoux' && cd.c.tel.replace(/\D/g, '').endsWith('612345678'), cd.c);
  v('client créé avec un devis : le devis est à son nom', cd.dv.length === 1, cd.dv);
  v('client créé avec un devis : il a lui aussi sa position (Rochefort) pour la carte des tournées — comme celui créé avec une intervention', !!cd.geo, { geo: cd.geo, sect: cd.sect });
  await p.evaluate(() => { chercheClient = ''; }); await L.aller(p, 'clients'); const ln = await p.evaluate(() => { const e = [...document.querySelectorAll('#contenu .client-carte')].find(x => x.textContent.includes('Établissements')); window.__cartes = [...document.querySelectorAll('#contenu .client-carte')].map(x => x.textContent.slice(0, 30)); const r = e && e.getBoundingClientRect(); return e ? { w: Math.round(r.width), h: Math.round(r.height), t: e.querySelector('b').scrollWidth > e.querySelector('b').clientWidth } : null; });
  d = await L.deborde(c); v('carte au nom de 63 signes : aucun glissement latéral', d.bouge === 0 && !!ln, { d, ln, cartes: await p.evaluate(() => window.__cartes) });
  await L.capture(c, CAP + `creer-liste-long-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  await L.aller(p, 'client-x-' + k2); d = await L.deborde(c); v('fiche au nom de 63 signes : aucun glissement latéral', d.bouge === 0, d);
  await L.capture(c, CAP + `creer-fiche-long-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  // ── doublon : le même téléphone ──
  await ouvrirNv('devis'); await remplir({ nom: 'Autre', prenom: 'Quelqu', tel: '06 11 22 33 44', mail: '', adr: 'ici', objet: 'Test doublon' }, 'devis'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 300);
  const dbl = await p.evaluate(() => (document.querySelector('#calque .alerte') || {}).textContent || ''); v('même téléphone qu’un client existant : l’écran prévient (« ' + dbl.slice(0, 60) + '… »)', /existe peut-être déjà/.test(dbl) && /Jean-Pierre Dupont/.test(dbl), dbl);
  await L.toucher(c, p.locator('#calque .panneau button', { hasText: /^Annuler$/ }).first()); await L.calme(p, 300); v('« Annuler » du devis ferme sans rien créer', (await nb()) === n2 && !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
  // ── annuler au milieu : la création par intervention ne laisse rien derrière ──
  await ouvrirNv('int'); await remplir({ nom: 'Fantome', tel: '06 99 88 77 66' }); await L.toucher(c, '[data-action="cFermer"]'); await L.calme(p, 400);
  v('✕ au milieu de la création : aucun client créé, fenêtre fermée, pas de client « __nv » qui traîne', (await nb()) === n2 && !(await fen()) && await p.evaluate(() => !CLIENTS.__nv), null);
  await ouvrirNv('int'); await remplir({ nom: 'Fantome' }); await p.keyboard.press('Escape'); await L.calme(p, 400); console.log('  · Échap dans la fenêtre de création : fenêtre ' + ((await fen()) ? 'ouverte' : 'fermée'));
  await p.evaluate(() => { try { fermerCreation(); } catch (e) {} });
  // ── double toucher sur « Créer l’intervention » ──
  await ouvrirNv('int'); await remplir({ nom: 'Doublet', contact: 'Paul', tel: '06 77 66 55 44', adr: '4 rue du Port, 17000 La Rochelle' }); await L.toucher(c, '[data-action="cPlusTard"]');
  const reels = () => p.evaluate(() => INTS.filter(i => i.id !== 'brouillon').length), nI0 = await reels(), nC0 = await nb(); await p.locator('[data-action="cCreer"]').dblclick({ timeout: 4000 }).catch(() => {}); await L.calme(p, 600);
  v('double toucher sur « Créer l’intervention » : UNE seule intervention et UN seul client créés', (await reels()) === nI0 + 1 && (await nb()) === nC0 + 1, { ints: (await reels()) - nI0, clients: (await nb()) - nC0 });
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
  async function chercher(p, q) { await p.fill('[data-cherche]', q); await L.calme(p, 250); }
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e); process.exit(2); });
