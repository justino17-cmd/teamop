// Campagne « clients » (17 novembre 2026) — MODIFIER UN CLIENT (onglet Infos) : refus, valeurs longues, ce qui change ailleurs (en-tête, liste, recherche, position, historique), et qui est noté comme auteur.
// Usage : PROFIL=… QUI=marc|julie NUIT=1
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-clients/';
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const t = () => p.evaluate(() => ((document.querySelector('#toast') || {}).textContent || '').replace(/\s+/g, ' ').trim());
  const ouvrirInfos = async k => { await L.aller(p, 'client-x-' + k); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); };
  const champ = async (k, val) => { await p.fill(`[data-ci="${k}"]`, val); await p.evaluate(k => document.querySelector(`[data-ci="${k}"]`).blur(), k); await L.calme(p, 100); };
  const enreg = async () => { await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 350); };
  await ouvrirInfos('mr');
  const champs = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-ci]')].map(e => e.dataset.ci + (e.tagName === 'SELECT' ? ':select' : '')));
  console.log('  · champs de l’onglet Infos : ' + champs.join(', '));
  v('population : l’onglet Infos porte sept champs (nom, contact, téléphone, e-mail, type, adresse, accès)', champs.length === 7, champs);
  v('clients-06 : on peut corriger le NOM (ou la raison sociale) d’un client — une faute de frappe à la création ne se rattrape sinon pas', champs.some(x => /^nom/.test(x)), champs);
  v('clients-17 : l’onglet Infos permet d’archiver un client (la case d’Équipe dit « archiver un client » ; un client ne s’efface jamais)', await p.evaluate(() => !peut('crm', 's') || !!document.querySelector('#contenu [data-action="clientArchiverDemande"]')) , null);
  // refus
  await champ('contact', ''); await enreg(); v('contact vidé : refusé (« Indique le contact du client. »)', /Indique le contact/.test(await t()), await t());
  await ouvrirInfos('mr'); await champ('mail', 'pas-un-mail'); await enreg(); v('e-mail invalide : refusé', /e-mail est à vérifier/.test(await t()), await t());
  await ouvrirInfos('mr'); await champ('tel', 'abc'); await enreg(); v('téléphone « abc » refusé', /téléphone est à vérifier/.test(await t()), await t());
  await ouvrirInfos('mr'); await champ('tel', '12'); await enreg(); const t12 = await t(); v('téléphone « 12 » refusé ', /téléphone est à vérifier/.test(t12), t12);
  await ouvrirInfos('mr'); await champ('mail', ''); await champ('tel', ''); await enreg(); const vide = await t(); console.log('  · e-mail et téléphone vidés → « ' + vide + ' »');
  v('clients-12 : vider e-mail ET téléphone est refusé, avec la phrase « Garde au moins un téléphone ou un e-mail » (« ' + vide + ' »)', /Garde au moins un téléphone ou un e-mail/.test(vide), vide);
  // valeur valide : ce qui change ailleurs
  await ouvrirInfos('mr'); await champ('contact', 'Mme Roux-Lefèvre'); await champ('tel', '06 55 44 33 99'); await champ('mail', 'roux.lefevre@mail.fr');
  await champ('adr', '3 rue de Rochefort, 17300 Rochefort'); await champ('acces', 'Code du portail : 4567. Chien gentil.'); await enreg();
  v('modification valide : « Fiche de Mme Roux enregistrée. »', /Fiche de Mme Roux enregistrée/.test(await t()), await t());
  const apres = await p.evaluate(() => ({ h: (document.querySelector('.tete-client .gris') || {}).textContent, mail: (document.querySelector('.tete-client a[href^="mailto:"]') || {}).href, geo: CR_GEO.mr, sect: SECT_CLI.mr, c: CLIENTS.mr }));
  v('l’en-tête de la fiche montre le nouveau téléphone et la nouvelle adresse', /06 55 44 33 99/.test(apres.h) && /Rochefort/.test(apres.h), apres.h);
  v('le bouton « E-mail » écrit à la nouvelle adresse', /roux\.lefevre@mail\.fr/.test(apres.mail), apres.mail);
  v('clients-07 : changer l’adresse de Mme Roux d’Aytré à Rochefort déplace aussi son point sur la carte des tournées (CR_GEO ' + JSON.stringify(apres.geo) + ', secteur ' + apres.sect + ')', !!apres.geo && Math.abs(apres.geo[0] - 45.9378) < 0.05, { geo: apres.geo, sect: apres.sect });
  await L.aller(p, 'clients'); await p.evaluate(() => { chercheClient = ''; }); await p.fill('[data-cherche]', '06 55 44 33 99'); await L.calme(p, 250);
  v('la liste retrouve Mme Roux par son nouveau téléphone', (await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte b')].map(b => b.textContent))).includes('Mme Roux'));
  await p.fill('[data-cherche]', '06 55 44 33 22'); await L.calme(p, 250); v('… et plus par l’ancien', !(await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte b')].map(b => b.textContent))).includes('Mme Roux'));
  await p.evaluate(() => { chercheClient = ''; });
  // type pro ↔ part
  await ouvrirInfos('mr'); await p.selectOption('[data-ci="type"]', 'pro'); await enreg(); const sur = await p.evaluate(() => (document.querySelector('.surtitre') || {}).textContent); v('passer Mme Roux en « Professionnel » change son étiquette (« ' + sur + ' »)', /Client professionnel/.test(sur), sur);
  await ouvrirInfos('mr'); await p.selectOption('[data-ci="type"]', 'part'); await enreg();
  // valeurs longues
  await ouvrirInfos('md'); await champ('contact', 'Monsieur Jean-Christophe de la Tour-Maubourg-Delacroix'); await champ('adr', '12 bis rue du Docteur Jean-Baptiste de la Fontaine-Mortagne, Résidence Les Hauts de Salles, bâtiment C, 17220 Salles-sur-Mer'); await champ('acces', 'Entrée par le garage côté jardin, sonner deux fois, attendre. '.repeat(8)); await enreg();
  let d = await L.deborde(c); v('contact et adresse très longs : l’en-tête ne glisse pas de côté', d.bouge === 0, d);
  await L.capture(c, CAP + `modifier-long-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  await ouvrirInfos('md'); d = await L.deborde(c); v('onglet Infos avec un accès de 500 signes : aucun glissement', d.bouge === 0, d);
  if (c.doigt) { const g = await L.doigts(p, '#contenu'); v('onglet Infos : cibles ≥ 44 px', g.petits.length === 0, g.petits); v('onglet Infos : champs ≥ 16 px', g.champs.length === 0, g.champs); }
  await L.capture(c, CAP + `infos-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  // abandon : on modifie, on change d'onglet, on revient — la phrase le dit
  await ouvrirInfos('cp'); await champ('contact', 'Quelqu’un d’autre'); await L.toucher(c, '#contenu [role=tab][data-oc="histo"]');
  v('clients-15 : quitter l’onglet avec une saisie non enregistrée DEMANDE d’abord (fenêtre de l’application : Enregistrer / Abandonner / Continuer)', await p.evaluate(() => /sans l’enregistrer/.test((document.querySelector('#calque .panneau h2') || {}).textContent || '')), null);
  await L.toucher(c, '#calque [data-v="abandon"]'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]');
  v('abandonner la saisie : elle est perdue (la phrase « Rien n’est gardé tant que… » le dit)', (await p.evaluate(() => document.querySelector('[data-ci="contact"]').value)) === 'M. Pineau' && /Rien n’est gardé/.test(await p.evaluate(() => document.querySelector('#contenu .grille2').innerText)), null);
  // qui est noté comme auteur ? (journalAjout('marc',…) lit acteur(), le 17 novembre)
  const jn = await p.evaluate(() => { const L = JOURNAL.filter(j => /fiche du client/.test(j.action)); const e = L[L.length - 1]; return e ? { qui: e.qui, lib: e.el && e.el.lib } : null; });
  v(`historique-auteur : la modification d’une fiche client est notée au nom de celui qui la fait (${QUI})`, !!jn && jn.qui === QUI, jn);
  if (QUI === 'marc') { await L.aller(p, 'historique'); await p.fill('[data-hcherche]', 'Roux'); await L.calme(p, 300);
  const hh = await p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ')); v('l’écran Historique montre « a modifié la fiche du client » pour Mme Roux', /Roux/.test(hh) && /fiche du client/.test(hh), hh.slice(0, 300)); }
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e); process.exit(2); });
