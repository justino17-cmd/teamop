// Restes des recontrôles « Clients », tour 1 (17 novembre 2026) : les décisions du chef (clients-04, 11, 12, 15, 17, le téléphone) et les casses du recontrôle
// (1 téléphone en +33 introuvable, 2 contact qui garde l'ancien nom, 3 créations sans position, 4 « le client seul », 5 deux rangements enfoncés, 6 doublon à deux espaces,
// 7 titres de tâches, 8 annuler, 9 « aucun résultat », 10 suggestions à 44 px).
// Usage : PROFIL=… QUI=marc NUIT=1 node clients-restes.js — chaque contrôle est joué par les gestes de l'écran, jamais en écrivant dans CLIENTS à la place de la personne
// (seul le téléphone « +33 » d'une base d'AVANT est posé à la main : l'écran ne sait plus en fabriquer).
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  // le navigateur ne doit JAMAIS ouvrir sa propre fenêtre de confirmation (clients-15) : on l'enregistre
  await p.evaluate(() => { window.__confirms = 0; window.confirm = () => { window.__confirms++; return true; }; });
  const t = () => p.evaluate(() => ((document.querySelector('#toast') || {}).textContent || '').replace(/\s+/g, ' ').trim());
  const ouvrirInfos = async k => { await L.aller(p, 'client-x-' + k); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); };
  const champ = async (k, val) => { await p.fill(`[data-ci="${k}"]`, val); await p.evaluate(k => document.querySelector(`[data-ci="${k}"]`).blur(), k); await L.calme(p, 100); };
  const enreg = async () => { await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 350); };
  const cartes = () => p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte b')].map(b => b.textContent));
  const chercher = async q => { await p.evaluate(() => { chercheClient = ''; }); await L.aller(p, 'clients'); await p.fill('[data-cherche]', q); await L.calme(p, 250); return cartes(); };
  const D = await p.evaluate(() => ({ n: Object.keys(CLIENTS).length, admin: droitAdmin(eqDe(acteur())), crm: eqDe(acteur()).droits.cats.crm }));
  console.log('  · population : ' + D.n + ' clients ; ' + JSON.stringify(D.crm) + (D.admin ? ' (administrateur)' : ''));
  v('population : des clients existent et la personne peut créer, changer et archiver', D.n >= 7 && (D.admin || (D.crm.c && D.crm.m && D.crm.s)), D);

  // ── le téléphone : écrit à la française à l'enregistrement, retrouvé quelle que soit l'écriture ──
  await ouvrirInfos('md'); await champ('tel', '+33 6 12 98 76 54'); await enreg();
  let tel = await p.evaluate(() => CLIENTS.md.tel); v('« +33 6 12 98 76 54 » s’enregistre « 06 12 98 76 54 » (reçu : « ' + tel + ' »)', tel === '06 12 98 76 54', tel);
  await ouvrirInfos('md'); await champ('tel', '0033 6 12 98 76 54'); await enreg(); tel = await p.evaluate(() => CLIENTS.md.tel); v('« 0033 6 12 98 76 54 » aussi', tel === '06 12 98 76 54', tel);
  await ouvrirInfos('md'); await champ('tel', '+33 (0)6.12.98.76.54'); await enreg(); tel = await p.evaluate(() => CLIENTS.md.tel); v('« +33 (0)6.12.98.76.54 » aussi', tel === '06 12 98 76 54', tel);
  await ouvrirInfos('md'); await champ('tel', '+44 20 7946 0958'); await enreg(); tel = await p.evaluate(() => CLIENTS.md.tel); v('un numéro étranger garde son « + » (« ' + tel + ' »)', tel === '+44 20 7946 0958', tel);
  await ouvrirInfos('md'); await champ('tel', '06 22 33 44 55'); await enreg();
  // une base d'AVANT garde un « +33 » : la recherche et le refus de doublon le comprennent
  await p.evaluate(() => { CLIENTS.hp.tel = '+33 5 46 11 22 44'; CLIENTS.cp.tel = '+33 6 98 76 54 32'; });
  for (const q of ['+33 5 46 11 22 44', '05 46 11 22 44', '0546112244', '+33546112244', '0033 5 46 11 22 44']) v('recherche « ' + q + ' » : retrouve l’Hôtel de la Plage (tel. enregistré en « +33 »)', (await chercher(q)).includes('Hôtel de la Plage'), await cartes());
  const dbl = await p.evaluate(() => [cfDoublonDe({ tel:'06 98 76 54 32', nom:'x', adr:'' }), cfDoublonDe({ tel:'+33 6 98 76 54 32', nom:'x', adr:'' }), cfDoublonDe({ tel:'0698765432', nom:'x', adr:'' })]);
  v('le refus de doublon voit « 06 98 76 54 32 », « +33 6 98 76 54 32 » et « 0698765432 » comme un seul client', dbl.every(x => x === dbl[0] && !!x), dbl);

  // ── clients-12 : e-mail ET téléphone vidés ──
  await ouvrirInfos('mr'); await champ('mail', ''); await champ('tel', ''); await enreg(); const vide = await t();
  v('clients-12 : vider e-mail ET téléphone est refusé, avec la phrase (« ' + vide + ' »)', /Garde au moins un téléphone ou un e-mail/.test(vide), vide);
  v('… et la fiche n’a pas changé', await p.evaluate(() => !!CLIENTS.mr.tel && !!CLIENTS.mr.mail), 0);
  await champ('tel', '06 55 44 33 22'); await enreg(); v('vider seulement l’e-mail reste permis (le téléphone suffit)', /Fiche de Mme Roux enregistrée/.test(await t()), await t());
  await ouvrirInfos('mr'); await champ('mail', 'roux@mail.fr'); await enreg();

  // ── clients-15 : quitter « Infos » avec une saisie non enregistrée ──
  await ouvrirInfos('mr'); await L.toucher(c, '#contenu [role=tab][data-oc="histo"]');
  v('sans rien changer, changer d’onglet ne demande rien', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))) && await p.evaluate(() => ongletClient === 'histo'));
  await ouvrirInfos('mr'); await p.fill('[data-ci="acces"]', 'Code du portail : 9876 (changé)'); await L.toucher(c, '#contenu [role=tab][data-oc="factures"]');
  let pan = await p.evaluate(() => ({ h2: (document.querySelector('#calque .panneau h2') || {}).textContent, boutons: [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim()).filter(x => x !== '✕'), onglet: ongletClient }));
  console.log('  · fenêtre : ' + JSON.stringify(pan)); await L.capture(c, CAP + 'quitter-infos-' + ETQ + '.png');
  v('clients-15 : une saisie non enregistrée + un autre onglet : la fenêtre de l’application demande, avec les trois choix', /sans l’enregistrer/.test(pan.h2 || '') && pan.boutons.join('|') === 'Enregistrer|Abandonner mes changements|Continuer la saisie' && pan.onglet === 'infos', pan);
  await L.toucher(c, '#calque [data-ferme]:not(.x)'); await L.calme(p, 200);
  v('« Continuer la saisie » : on reste sur Infos, la saisie est intacte', await p.evaluate(() => ongletClient === 'infos' && document.querySelector('[data-ci="acces"]').value === 'Code du portail : 9876 (changé)' && !document.querySelector('#calque .panneau')));
  await L.toucher(c, '#contenu [role=tab][data-oc="factures"]'); await L.toucher(c, '#calque [data-v="abandon"]'); await L.calme(p, 300);
  v('« Abandonner mes changements » : on change d’onglet, rien n’est gardé', await p.evaluate(() => ongletClient === 'factures' && CLIENTS.mr.acces !== 'Code du portail : 9876 (changé)'));
  await ouvrirInfos('mr'); await p.fill('[data-ci="acces"]', 'Portail : 4321, sonnette à droite'); await L.toucher(c, '#contenu [role=tab][data-oc="appareils"]'); await L.toucher(c, '#calque [data-v="enreg"]'); await L.calme(p, 400);
  v('« Enregistrer » : la fiche est enregistrée ET on arrive sur l’onglet demandé', await p.evaluate(() => ongletClient === 'appareils' && CLIENTS.mr.acces === 'Portail : 4321, sonnette à droite'), await p.evaluate(() => [ongletClient, CLIENTS.mr.acces]));
  await ouvrirInfos('mr'); await p.fill('[data-ci="nom"]', ''); await L.toucher(c, '#contenu [role=tab][data-oc="histo"]'); await L.toucher(c, '#calque [data-v="enreg"]'); await L.calme(p, 300);
  v('« Enregistrer » avec un champ refusé : on reste sur Infos, le refus se dit (« ' + await t() + ' »)', await p.evaluate(() => ongletClient === 'infos' && !document.querySelector('#calque .panneau')) && /nom du client/.test(await t()));
  await p.fill('[data-ci="nom"]', 'Mme Roux'); await L.ranger(p);
  await ouvrirInfos('mr'); await p.fill('[data-ci="acces"]', 'Une saisie qui ne doit pas se perdre'); await L.toucher(c, '#contenu [data-rl="retour"]'); await L.calme(p, 250);
  v('la flèche « ‹ Retour » demande aussi avant de perdre une saisie', await p.evaluate(() => route === 'client' && /sans l’enregistrer/.test((document.querySelector('#calque .panneau h2') || {}).textContent || '')));
  await L.toucher(c, '#calque [data-v="abandon"]'); await L.calme(p, 400);
  v('… et « Abandonner » la laisse partir (retour à l’écran d’avant)', await p.evaluate(() => route !== 'client' && !document.querySelector('#calque .panneau')), await p.evaluate(() => route));
  await ouvrirInfos('mr'); await L.toucher(c, '#contenu [data-rl="retour"]'); await L.calme(p, 300);
  v('sans saisie, « ‹ Retour » part sans rien demander', await p.evaluate(() => route !== 'client' && !document.querySelector('#calque .panneau')), await p.evaluate(() => route));
  await L.ranger(p);
  await ouvrirInfos('vp'); await p.fill('[data-ci="adr"]', '12 quai Valin, 17000 La Rochelle (à vérifier)'); await L.toucher(c, '#menu a[href="#clients"], #menu a[href="#accueil"]').catch(() => {});
  const viaMenu = await p.evaluate(() => !!document.querySelector('#calque .panneau h2') && /sans l’enregistrer/.test(document.querySelector('#calque .panneau h2').textContent) || window.innerWidth < 900);
  v('un lien du menu demande aussi (ordinateur ; au téléphone le menu est dans un tiroir)', viaMenu, 0); await L.ranger(p);
  v('jamais la fenêtre du navigateur (confirm) : ' + await p.evaluate(() => window.__confirms) + ' appel', (await p.evaluate(() => window.__confirms)) === 0);

  // ── clients-11 : les appareils ──
  await L.aller(p, 'client-x-vp'); await L.toucher(c, '#contenu [role=tab][data-oc="appareils"]');
  const ap0 = await p.evaluate(() => ({ n: CLIENTS.vp.appareils.length, boutons: [...document.querySelectorAll('#contenu .app-l .lien')].map(b => b.textContent.trim()), ajout: !!document.querySelector('#contenu [data-action="clientAppForm"][data-n="-1"]'), badge: [...document.querySelectorAll('#contenu .app-l')].map(l => /3 pannes/.test(l.textContent)) }));
  v('clients-11 : « ＋ Ajouter un appareil » et, par ligne, « Modifier » et « Retirer »', ap0.ajout && ap0.boutons.join('|') === 'Modifier|Retirer|Modifier|Retirer', ap0);
  await L.toucher(c, '[data-action="clientAppForm"][data-n="-1"]'); await L.toucher(c, '[data-action="clientAppEnreg"]');
  v('ajouter sans nom : refusé, la fenêtre reste', await p.evaluate(() => /nom de l’appareil/.test(document.getElementById('app-err').textContent) && !document.getElementById('app-err').hidden && CLIENTS.vp.appareils.length === 2));
  await p.fill('#app-nom', 'Groupe froid cuisine'); await p.fill('#app-det', 'Chambre froide positive · R452A · 2018'); await L.toucher(c, '[data-action="clientAppEnreg"]'); await L.calme(p, 300);
  let ap1 = await p.evaluate(() => ({ n: CLIENTS.vp.appareils.length, kpi: (document.querySelector('[data-oc="appareils"] b') || {}).textContent, vu: document.querySelector('#contenu').textContent.includes('Groupe froid cuisine') }));
  v('l’appareil ajouté est dans la fiche, le chiffre du haut le compte (« ' + ap1.kpi + ' »)', ap1.n === 3 && ap1.vu && /3 appareils/.test(ap1.kpi), ap1);
  await L.toucher(c, '#contenu .app-l:nth-of-type(3) [data-action="clientAppForm"]'); await p.fill('#app-det', 'Chambre froide positive · R452A · 2019'); await L.toucher(c, '[data-action="clientAppEnreg"]'); await L.calme(p, 300);
  v('modifier un appareil change sa ligne', await p.evaluate(() => CLIENTS.vp.appareils[2].det.endsWith('2019') && document.querySelector('#contenu').textContent.includes('2019')));
  await L.toucher(c, '#contenu .app-l:nth-of-type(1) [data-action="clientAppSuppr"]'); await L.capture(c, CAP + 'retirer-appareil-' + ETQ + '.png');
  v('retirer demande avant (fenêtre de l’application)', await p.evaluate(() => /Retirer cet appareil/.test((document.querySelector('#calque .panneau h2') || {}).textContent || '') && CLIENTS.vp.appareils.length === 3));
  await L.toucher(c, '[data-action="clientAppSupprOk"]'); await L.calme(p, 300);
  const ap2 = await p.evaluate(() => ({ noms: CLIENTS.vp.appareils.map(a => a.nom), badge: [...document.querySelectorAll('#contenu .app-l')].map(l => [l.querySelector('b').textContent, /3 pannes/.test(l.textContent)]) }));
  v('retirer le premier appareil : la mention « 3 pannes du ventilateur » reste sur l’unité extérieure, elle ne glisse pas sur un autre', ap2.noms.length === 2 && ap2.badge.filter(x => x[1]).length === 1 && ap2.badge.find(x => x[1])[0] === 'Daikin RXM35R', ap2);
  await L.toucher(c, '.toast-act, #toast button'); await L.calme(p, 300);
  v('« Annuler » du message remet l’appareil retiré (à sa place)', await p.evaluate(() => CLIENTS.vp.appareils.length === 3 && CLIENTS.vp.appareils[0].nom === 'Daikin FTXM35R'));
  if (c.doigt) { const g = await L.doigts(p, '#contenu'); v('onglet Appareils : cibles ≥ 44 px', g.petits.length === 0, g.petits); }
  await L.capture(c, CAP + 'appareils-' + ETQ + '.png');
  await L.toucher(c, '#contenu .app-l:nth-of-type(3) [data-action="clientAppSuppr"]'); await L.toucher(c, '[data-action="clientAppSupprOk"]'); await L.calme(p, 200);

  // ── casse 2 et 7 : renommer un particulier ; casse 6 : doublon à deux espaces ──
  await ouvrirInfos('mr'); await champ('nom', 'Mme Rouxel-Delacroix'); await enreg();
  const rn = await p.evaluate(() => ({ contact: CLIENTS.mr.contact, titre: TACHES.find(x => x.id === 't14').t, tete: (document.querySelector('.tete-client .gris') || {}).textContent }));
  v('casse 2 : renommer un particulier renomme aussi son contact (« ' + rn.contact + ' »)', rn.contact === 'Mme Rouxel-Delacroix', rn);
  v('casse 2 : l’en-tête de la fiche ne montre plus l’ancien nom', !/Mme Roux ·/.test(rn.tete || '') && !/(^|\s)Mme Roux(\s|$)/.test(rn.tete || ''), rn.tete);
  v('casse 7 : le titre de sa tâche suit (« ' + rn.titre + ' »)', /Mme Rouxel-Delacroix/.test(rn.titre) && !/Mme Roux\b(?!el)/.test(rn.titre), rn.titre);
  await L.capture(c, CAP + 'renomme-' + ETQ + '.png');
  const lst = await p.evaluate(() => { chercheClient = ''; aller('clients'); return null; }); await L.calme(p, 400);
  v('casse 2 : la carte de la liste ne répète pas l’ancien nom', !(await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte')].find(x => /Rouxel/.test(x.textContent)).textContent.includes('Mme Roux ·'))));
  await ouvrirInfos('mr'); await champ('nom', 'Mme Roux'); await enreg();
  await ouvrirInfos('mr'); await champ('nom', 'Restaurant  Le Vieux Port'); await enreg(); const dd = await t();
  v('casse 6 : « Restaurant  Le Vieux Port » (deux espaces) est refusé comme doublon (« ' + dd + ' »)', /porte déjà ce nom/.test(dd) && await p.evaluate(() => CLIENTS.mr.nom === 'Mme Roux'), dd);

  // ── casse 5 : un seul rangement enfoncé pendant une recherche ──
  for (const rang of ['mois', 'semaine']) {
    await p.evaluate(r => { chercheClient = ''; rangClients = r; aller('clients'); rendre(); }, rang); await L.calme(p, 300); await p.fill('[data-cherche]', 'durand'); await L.calme(p, 300);
    const pr = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-rangc][aria-pressed="true"]')].map(b => b.textContent.trim()));
    v('casse 5 : en « Par ' + rang + ' », pendant une recherche, UN seul rangement est enfoncé (' + pr.join(' + ') + ')', pr.length === 1 && /Tous/.test(pr[0]), pr);
  }
  await p.evaluate(() => { chercheClient = ''; rangClients = 'tous'; });

  // ── clients-17 : archiver ──
  await L.aller(p, 'client-x-cm'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]');
  v('clients-17 : « Archiver ce client » est dans l’onglet Infos', await p.evaluate(() => !!document.querySelector('#contenu [data-action="clientArchiverDemande"]')));
  await L.capture(c, CAP + 'infos-archiver-' + ETQ + '.png');
  const nom = await p.evaluate(() => CLIENTS.cm.nom);
  await L.toucher(c, '[data-action="clientArchiverDemande"]'); await L.capture(c, CAP + 'archiver-confirme-' + ETQ + '.png');
  v('archiver demande avant, dans la fenêtre de l’application', await p.evaluate(() => /Archiver/.test((document.querySelector('#calque .panneau h2') || {}).textContent || '') && !CLIENTS.cm.archive));
  await L.toucher(c, '[data-action="clientArchiverOk"]'); await L.calme(p, 400);
  v('le client archivé quitte la liste « Tous les clients »', !(await cartes()).includes(nom) && await p.evaluate(() => route === 'clients'), await cartes());
  v('le bouton « Archivés · 1 » apparaît', await p.evaluate(() => [...document.querySelectorAll('[data-rangc]')].some(b => /Archivés · 1/.test(b.textContent))));
  v('il n’est plus proposé pour un nouveau devis', await p.evaluate(() => { DVN_F = null; dvNouveau(); const o = [...document.querySelectorAll('#dvn-cli option')].map(x => x.textContent); fermerPanneau(); DVN_F = null; return o.length > 3 && !o.includes(CLIENTS.cm.nom); }));
  await L.toucher(c, '[data-rangc="archives"]'); await L.calme(p, 300); await L.capture(c, CAP + 'archives-' + ETQ + '.png');
  v('« Archivés » le montre, avec « Remettre dans la liste »', await p.evaluate(n => [...document.querySelectorAll('#contenu .client-carte b')].some(b => b.textContent === n) && !!document.querySelector('#contenu [data-action="clientRestaurer"]'), nom));
  await p.fill('[data-cherche]', nom.split(' ')[0].slice(0, 5)); await L.calme(p, 300); v('la recherche reste dans les archivés', await p.evaluate(() => document.querySelector('[data-rangc="archives"]').getAttribute('aria-pressed') === 'true' && document.querySelectorAll('#contenu .client-carte').length >= 1));
  await p.fill('[data-cherche]', ''); await L.calme(p, 200);
  await L.toucher(c, '#contenu .client-carte'); await L.calme(p, 300); await L.capture(c, CAP + 'fiche-archivee-' + ETQ + '.png');
  v('la fiche d’un client archivé s’ouvre, avec son bandeau et « Remettre dans la liste »', await p.evaluate(() => !!document.querySelector('#contenu .client-archive [data-action="clientRestaurer"]')));
  if (c.doigt) { const g = await L.doigts(p, '#contenu'); v('fiche archivée : cibles ≥ 44 px', g.petits.length === 0, g.petits); }
  await L.toucher(c, '#contenu .client-archive [data-action="clientRestaurer"]'); await L.calme(p, 300);
  v('remis dans la liste : plus de bandeau, il est dans « Tous les clients »', await p.evaluate(() => !CLIENTS.cm.archive && !document.querySelector('#contenu .client-archive')));
  await L.aller(p, 'clients'); v('… et la liste le montre', (await cartes()).includes(nom) && await p.evaluate(() => ![...document.querySelectorAll('[data-rangc]')].some(b => /Archivés/.test(b.textContent))));
  v('la case d’Équipe dit « archiver un client »', await p.evaluate(() => DROIT_PHRASES.crm.s === 'archiver un client'));
  // l'archivage d'un client qui a du travail en cours le dit
  await L.aller(p, 'client-x-vp'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); await L.toucher(c, '[data-action="clientArchiverDemande"]');
  v('archiver un client qui a du travail en cours le dit (interventions à venir, factures à recevoir)', await p.evaluate(() => /à venir|à recevoir/.test(document.querySelector('#calque .panneau').textContent)), await p.evaluate(() => document.querySelector('#calque .panneau').textContent));
  await L.ranger(p);

  // ── clients-04 : créer un client avec une intervention ──
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.capture(c, CAP + 'nouveau-panneau-' + ETQ + '.png');
  const bt = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim()).filter(x => x !== '✕'));
  v('casse 4 : le panneau « Nouveau client » propose aussi « Le client seul » (' + bt.join(' | ') + ')', bt.includes('Le client seul') && bt.includes('Avec une intervention') && bt.includes('Avec un devis'), bt);
  await L.toucher(c, '[data-action="clientNvInt"]'); await L.calme(p, 400);
  const nv = async (k, val) => { await p.fill(`.fen [data-cnv="${k}"]`, val); };
  await nv('nom', 'Lemoine'); await p.fill('.fen [data-cnv="contact"]', 'Sophie').catch(() => {});
  // le créneau : « Plus tard » suffit
  await L.toucher(c, '.fen [data-action="cPlusTard"]'); await L.calme(p, 300);
  await L.toucher(c, '.fen [data-action="cCreer"]'); let r4 = await t();
  v('clients-04 : sans adresse, la création est refusée et nomme le champ (« ' + r4 + ' »)', /adresse de l’intervention/.test(r4) && await p.evaluate(() => !!CREA && document.activeElement && document.activeElement.dataset.cnv === 'adr'), r4);
  await nv('adr', '4 rue du Port, 17300 Rochefort'); await L.toucher(c, '.fen [data-action="cCreer"]'); r4 = await t();
  v('clients-04 : avec l’adresse mais ni téléphone ni e-mail : refusé, nomme le champ (« ' + r4 + ' »)', /téléphone ou un e-mail/.test(r4) && await p.evaluate(() => !!CREA), r4);
  await nv('tel', '+33 6 11 22 33 44'); await L.toucher(c, '.fen [data-action="cCreer"]'); await L.calme(p, 600);
  const k4 = await p.evaluate(() => { const k = Object.keys(CLIENTS).find(x => CLIENTS[x].nom.includes('Lemoine')); return k ? { k, c: CLIENTS[k], geo: CR_GEO[k], sect: SECT_CLI[k] } : null; });
  v('clients-04 : l’adresse et le téléphone sont donnés : le client est créé', !!k4 && !(await p.evaluate(() => !!CREA)), k4);
  v('le téléphone s’écrit « 06 11 22 33 44 » (reçu « ' + (k4 && k4.c.tel) + ' »), la carte le place à Rochefort (' + JSON.stringify(k4 && k4.geo) + ') et le secteur est posé (« ' + (k4 && k4.sect) + ' »)', !!k4 && k4.c.tel === '06 11 22 33 44' && !!k4.geo && Math.abs(k4.geo[0] - 45.9378) < 0.05 && k4.sect === 'Sud', k4);
  // casse 8 : annuler retire le client ET l'intervention
  await p.keyboard.press('Control+z'); await L.calme(p, 400); const an = await t();
  const apresAn = await p.evaluate(k => ({ client: !!CLIENTS[k], int: INTS.some(i => i.cli === k) }), k4 && k4.k);
  v('casse 8 : « Annuler » après « nouveau client + intervention » retire l’intervention ET le client (« ' + an + ' »)', !apresAn.client && !apresAn.int, apresAn);

  // ── casse 4 : « le client seul » ──
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientSeul"]'); await L.calme(p, 300);
  await L.capture(c, CAP + 'client-seul-' + ETQ + '.png');
  await L.toucher(c, '[data-action="clientSeulOk"]'); const e1 = await p.evaluate(() => (document.querySelector('#calque .alerte') || {}).textContent);
  v('le client seul : sans nom, refusé (« ' + e1 + ' »)', /nom du client/.test(e1 || ''), e1);
  await p.fill('#cs-nom', 'Brunet'); await p.fill('#cs-contact', 'Hélène'); await L.toucher(c, '[data-action="clientSeulOk"]');
  const e2 = await p.evaluate(() => (document.querySelector('#calque .alerte') || {}).textContent); v('… sans téléphone ni e-mail : refusé (« ' + e2 + ' »)', /téléphone ou un e-mail/.test(e2 || ''), e2);
  await p.fill('#cs-tel', '0033 6 77 66 55 44'); await p.fill('#cs-adr', '18 rue des Marais, 17180 Périgny'); await L.toucher(c, '[data-action="clientSeulOk"]'); await L.calme(p, 500);
  const k5 = await p.evaluate(() => { const k = Object.keys(CLIENTS).find(x => CLIENTS[x].nom === 'Hélène Brunet'); return k ? { k, c: CLIENTS[k], geo: CR_GEO[k], sect: SECT_CLI[k], route, ints: INTS.filter(i => i.cli === k).length, dv: DV.filter(d => d.cli === k).length } : null; });
  v('le client seul : sa fiche est créée (« Hélène Brunet », 06 77 66 55 44), sans intervention ni devis, posée sur la carte, et on arrive dessus', !!k5 && k5.c.tel === '06 77 66 55 44' && k5.ints === 0 && k5.dv === 0 && !!k5.geo && k5.route === 'client', k5);
  await L.capture(c, CAP + 'client-seul-fiche-' + ETQ + '.png');
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientSeul"]'); await p.fill('#cs-nom', 'Brunet'); await p.fill('#cs-contact', 'Hélène'); await p.fill('#cs-tel', '06 11 00 11 00'); await L.toucher(c, '[data-action="clientSeulOk"]');
  const e3 = await p.evaluate(() => (document.querySelector('#calque .alerte') || {}).textContent); v('le client seul : le même nom demande de confirmer (« ' + e3 + ' »)', /porte déjà ce nom/.test(e3 || ''), e3);
  await L.ranger(p);

  // ── casse 3 : les autres façons de créer un client posent la position ──
  const cr = await p.evaluate(() => { const out = {};
    const test = (nom, adr) => { const k = 'zz' + nom; CLIENTS[k] = { nom, type:'part', contact:nom, tel:'+33 6 12 12 12 12', mail:'', adr, acces:'', depuis:'2026', appareils:[] }; return k; };
    out.finMail = (() => { const k = test('MailCli', 'Rochefort (adresse à compléter)'); clientFinir(k); return [CR_GEO[k], SECT_CLI[k], CLIENTS[k].tel]; })();
    out.finInconnu = (() => { const k = test('Inconnu', 'Saintes (adresse à compléter)'); clientFinir(k); return [CR_GEO[k] || null, SECT_CLI[k] || null]; })();
    return out; });
  v('casse 3 : « Rochefort (adresse à compléter) » est placé à Rochefort, secteur Sud, téléphone à la française', !!cr.finMail[0] && Math.abs(cr.finMail[0][0] - 45.9378) < 0.05 && cr.finMail[1] === 'Sud' && cr.finMail[2] === '06 12 12 12 12', cr.finMail);
  v('… et une ville inconnue n’invente rien (la carte dira « Position inconnue »)', cr.finInconnu[0] === null && cr.finInconnu[1] === null, cr.finInconnu);
  await p.evaluate(() => { delete CLIENTS.zzMailCli; delete CLIENTS.zzInconnu; });

  // ── casse 10 : les suggestions d'adresse font 44 px ──
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientNvInt"]'); await L.calme(p, 400);
  await p.fill('.fen [data-cnv="adr"]', 'rue'); await L.calme(p, 300);
  const sg = await p.evaluate(() => [...document.querySelectorAll('.adr-sug button')].map(b => Math.round(b.getBoundingClientRect().height)));
  v('casse 10 : ' + sg.length + ' suggestions d’adresse, toutes à 44 px au moins (' + sg.join(', ') + ')', sg.length >= 3 && sg.every(h => h >= 44), sg);
  await L.capture(c, CAP + 'suggestions-' + ETQ + '.png'); await L.ranger(p);
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  const code = L.bilan(); await L.fin(c); await L.fermer(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
