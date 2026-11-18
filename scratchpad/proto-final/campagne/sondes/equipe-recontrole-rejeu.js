// RECONTRÔLE ADVERSE (18 novembre 2026), troisième sonde : REJEU, avec mes propres valeurs, des défauts annoncés corrigés equipe-03/04/05/06/07/12/15/16/20.
// Les phrases sont LUES (et capturées pour être regardées) : la sonde dit ce que l'écran dit, elle ne cherche pas un mot attendu à l'avance.
// ⛔ 127.0.0.1 seulement. usage : node equipe-recontrole-rejeu.js [mac|iphone|ipad|android|petit] [nuit]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac', NUIT = process.argv[3] === 'nuit', SUF = `${PROFIL}-${NUIT ? 'nuit' : 'jour'}`;
const jouer = async (nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 240)); } };
const err = (p, id) => p.evaluate(id => { const e = document.getElementById(id + '-err'); return e && !e.hidden ? e.textContent.trim() : ''; }, id);
const bruit = {};
(async () => {
  const c = await E.marc(PROFIL, NUIT), p = c.p;
  await jouer('R1 inviter', async () => {
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 300);
    const phrase = await E.texte(p, '#calque');
    v('R1 (equipe-03) la phrase du bas du formulaire annonce le mot de passe provisoire à remettre en main propre, et ne dit plus « personne d\'autre ne le connaît »', /provisoire/.test(phrase) && /main propre/.test(phrase) && !/personne d’autre ne le connaît/.test(phrase), phrase.slice(-200));
    // trois fautes d'un coup : prénom vide, nom « <b> », e-mail sans point
    await p.fill('#eq-p', ''); await p.fill('#eq-n', 'Dur<b>and'); await p.fill('#eq-m', 'quelquun@sansPoint');
    await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 300);
    const e = { p:await err(p, 'eq-p'), n:await err(p, 'eq-n'), m:await err(p, 'eq-m') };
    const foc = await p.evaluate(() => document.activeElement && document.activeElement.id);
    v('R1 (equipe-04) trois champs fautifs : chacun dit SA phrase sous lui (population : 3)', e.p.length > 8 && e.n.length > 8 && e.m.length > 8, e);
    v('R1 (equipe-04) le curseur est sur le premier champ fautif (le prénom)', foc === 'eq-p', foc);
    v('R1 (equipe-04) la fenêtre reste ouverte et personne n\'est ajouté', await p.evaluate(() => !!document.getElementById('eq-p') && !EQUIPE.some(x => /Dur/.test(x.nom))), null);
    await L.capture(c, E.CAP + `rejeu-inviter-erreurs-${SUF}.png`);
    // l'adresse d'une personne désactivée compte aussi : « chaque personne se connecte avec la sienne »
    await p.fill('#eq-p', 'Paul'); await p.fill('#eq-n', 'Durand'); await p.fill('#eq-m', 'TOM@climservices17.fr'); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 300);
    const e2 = await err(p, 'eq-m'); v('R1 (equipe-04) une adresse déjà prise (écrite en MAJUSCULES) est refusée sous le champ, avec le nom de la personne', /Tom Leroy/.test(e2), e2);
    // une correction efface la phrase d'avant (un refus ne survit pas à la réussite qui le dément)
    await p.fill('#eq-m', 'paul.durand@exemple.fr'); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 500);
    const apres = await p.evaluate(() => ({ cree:EQUIPE.some(x => x.prenom === 'Paul'), restes:[...document.querySelectorAll('#calque .erreur')].filter(x => !x.hidden && x.textContent.trim()).map(x => x.textContent.trim()) }));
    v('R1 (equipe-04) corrigé : la personne est créée et aucune phrase d\'erreur ne reste affichée', apres.cree && apres.restes.length === 0, apres);
    await E.ranger(c);
  });
  await jouer('R2 habilitations', async () => {
    await E.fiche(c, 'tl'); await L.toucher(c, '[data-eq="habajout|tl"]'); await L.calme(p, 300);
    const nom0 = await p.evaluate(() => eqDe('tl').habil.map(h => h[0])); const avant = nom0.length;
    // 1. même nom que celle qu'il a déjà (casse et espaces différents)
    await p.fill('#eq-hn', '  habilitation ÉLECTRIQUE br '); await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 300);
    const e1 = await err(p, 'eq-hn'); v('R2 (equipe-05) même habilitation avec une autre casse/espaces : refusée SOUS le champ, avec une phrase qui renvoie à Renouveler ou dit qu\'elle est valable', e1.length > 20 && await p.evaluate(a => eqDe('tl').habil.length === a, avant), e1);
    // 2. fin avant l'obtention, saisie comme une personne : le nom (la durée d'une formation inconnue coche « Sans date de fin » toute seule), on la décoche, puis les deux dates TAPÉES
    await p.fill('#eq-hn', 'Formation levage'); await L.calme(p, 200);
    const apresNom = await p.evaluate(() => ({ sans:document.getElementById('eqx-hs').checked, finOff:document.getElementById('eqx-hn').disabled })); v('R2 population : une formation inconnue coche « Sans date de fin » et grise la fin (la saisie suit l\'état du formulaire)', apresNom.sans === apresNom.finOff, apresNom);
    if (apresNom.sans) await p.locator('#eqx-hs').uncheck();
    await p.fill('#eqx-hd', '2026-06-01'); await p.fill('#eqx-hn', '2026-05-01');
    await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 300); const e2 = await err(p, 'eqx-hn');
    v('R2 (equipe-06) fin AVANT obtention (tapées dans cet ordre) : refusée avec une phrase sous la date, rien ajouté', e2.length > 15 && await p.evaluate(a => eqDe('tl').habil.length === a, avant), e2);
    await L.capture(c, E.CAP + `rejeu-habilitation-fin-avant-${SUF}.png`);
    // 2 bis. fin déjà passée : signalée, confirmée par un second toucher
    await p.fill('#eqx-hd', '2020-01-01'); await p.fill('#eqx-hn', '2021-01-01'); await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 300);
    const e2b = await err(p, 'eqx-hn'), ajoute1 = await p.evaluate(a => eqDe('tl').habil.length, avant);
    v('R2 (equipe-06) fin déjà passée : signalée au premier toucher, rien ajouté encore', /passée|Expirée/i.test(e2b) && ajoute1 === avant, { e2b, ajoute1 });
    await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 400);
    v('R2 (equipe-06) un second toucher la note quand même : une de plus, « Expirée » dans la liste', await p.evaluate(a => eqDe('tl').habil.length === a + 1, avant), await E.toast(p));
    await E.ranger(c);
    // 3. date vide : on rouvre, on tape un nom connu (durée connue), on EFFACE la fin
    await E.fiche(c, 'tl'); await L.toucher(c, '[data-eq="habajout|tl"]'); await L.calme(p, 300);
    await p.fill('#eq-hn', 'Prévention du risque amiante'); await L.calme(p, 200); await p.fill('#eqx-hn', ''); await L.calme(p, 100);
    const sans3 = await p.evaluate(() => document.getElementById('eqx-hs').checked); if (sans3) await p.locator('#eqx-hs').uncheck(); await p.fill('#eqx-hn', '');
    const n3 = await p.evaluate(() => eqDe('tl').habil.length);
    await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 300); const e3 = await err(p, 'eqx-hn');
    v('R2 (equipe-07) date de fin effacée sans « Sans date de fin » : on demande de choisir, rien ajouté', /date|Sans date de fin/i.test(e3) && await p.evaluate(a => eqDe('tl').habil.length === a, n3), e3);
    await L.capture(c, E.CAP + `rejeu-habilitation-erreur-${SUF}.png`);
    // 4. « Sans date de fin » cochée : accepté, et seulement elle
    await p.locator('#eqx-hs').check();
    await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 500);
    v('R2 (equipe-07) « Sans date de fin » cochée : l\'habilitation est ajoutée (une de plus), sans date de fin', await p.evaluate(a => { const h = eqDe('tl').habil; return h.length === a + 1 && h[h.length - 1][1] == null; }, n3), await E.toast(p));
    await E.ranger(c);
  });
  await jouer('R3 écrans', async () => {
    await L.aller(p, 'entreprise'); await L.toucher(c, '[data-ent="carte|legal"]'); await L.calme(p, 400);
    const h = await p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return { h2:q && q.querySelector('h2') ? q.querySelector('h2').textContent.trim() : '', txt:q ? q.textContent.replace(/\s+/g, ' ').slice(0, 220) : '' }; });
    v('R3 (equipe-12) la carte « Tes mentions légales » ouvre une fenêtre qui porte le même nom', /mentions légales/i.test(h.h2), h);
    await E.ranger(c);
    await L.aller(p, 'entreprise'); const ouv = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-ent^="lien|"]')].find(x => /Rendez-vous en ligne/.test(x.textContent)); if (b) b.click(); return !!b; }); await L.calme(p, 600);
    const rdv = await E.texte(p, '#calque'); v('R3 population : la fenêtre « Rendez-vous en ligne » s\'ouvre', ouv && rdv.length > 100, rdv.slice(0, 80));
    v('R3 (equipe-20) la fenêtre ne contient plus de consigne de testeur ni de jargon (« TERMINÉE », « chemin », « prototype », « essai »)', !/TERMINÉE|chemin|prototype|testeur|à tester|essai/i.test(rdv), (rdv.match(/.{30}(TERMINÉE|chemin|prototype|testeur|à tester|essai).{30}/i) || [''])[0]);
    await L.capture(c, E.CAP + `rejeu-rdv-${SUF}.png`); await E.ranger(c);
    // Qui peut quoi : tableau ou listes selon la largeur ; jamais de page qui glisse
    await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiltre = 'droits'; rendre(); }); await L.toucher(c, '[data-eq="filtre|droits"]').catch(() => {}); await L.calme(p, 500);
    const q = await p.evaluate(() => { const t = document.querySelector('.eqx-dr-tab'), t2 = [...document.querySelectorAll('.eqx-table')].find(e => e.offsetParent !== null), hote = document.querySelector('.eqx-dr-hote'); return { tableau:!!t2, hote:hote ? hote.getBoundingClientRect().width : 0, tw:t2 ? t2.getBoundingClientRect().width : 0, listes:document.querySelectorAll('.eqx-dl').length, titres:[...document.querySelectorAll('.eqx-table th span')].map(s => s.textContent.trim()).slice(0, 12) }; });
    v('R3 (equipe-15/16) « Qui peut quoi » montre le tableau SEULEMENT s\'il tient dans sa carte, sinon les listes (population : au moins un des deux)', (q.tableau && q.tw <= q.hote + 1) || (!q.tableau && q.listes > 0), q);
    const dd = await L.deborde(c); v(`R3 « Qui peut quoi » : la page ne glisse pas de côté (${SUF})`, dd.bouge === 0, dd);
    await L.capture(c, E.CAP + `rejeu-qui-peut-quoi-${SUF}.png`);
  });
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 4));
  await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
