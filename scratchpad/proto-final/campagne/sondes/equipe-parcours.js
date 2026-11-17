// ÉQUIPE : les parcours réels du gérant, de bout en bout — inviter, erreurs de saisie, places pleines, modifier une fiche, habilitations,
// désactiver puis réactiver, profils, « Ouvrir l'application comme … » et retour, règles d'habilitations, « Qui peut quoi », rechargement.
// On vérifie la COHÉRENCE d'un écran à l'autre (liste, compteurs, fiche, planning). Population comptée à chaque parcours. ⛔ 127.0.0.1 seulement.
// usage : node equipe-parcours.js [mac|iphone|…]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac';
const jouer = async (c, nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 200)); } };
const kpi = (c, k) => c.p.evaluate(k => { const b = document.querySelector(`[data-eqx="kpi|${k}"] b`); return b ? b.textContent.trim() : null; }, k);
const nomsListe = c => c.p.evaluate(() => [...document.querySelectorAll('#contenu .eq-grille .eq-c .fo-n b')].map(e => e.textContent.trim()));
const remplir = async (c, champs) => { for (const [id, val] of Object.entries(champs)) await c.p.fill('#' + id, val); };
(async () => {
  const c = await E.marc(PROFIL); const p = c.p;
  const inviter = async (pr, no, m, o) => { await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await remplir(c, { 'eq-p':pr, 'eq-n':no, 'eq-m':m }); if (o && o.role) await p.fill('#eq-r', o.role); if (o && o.profil) await p.selectOption('#eq-prof', o.profil);
    if (o && o.terrain === false) await p.evaluate(() => { const s = document.getElementById('eq-terrain'); if (s && s.checked) s.click(); }); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400); return { toast:await E.toast(p), pan:(await E.obs(p)).pan }; };
  // ── P1 · inviter une technicienne
  await jouer(c, 'P1 inviter', async () => {
    await L.aller(p, 'equipe'); const av = { places:await kpi(c, 'places'), inv:await kpi(c, 'invites'), noms:await nomsListe(c) };
    v('P1 population : 6 personnes avant, « 6 / 8 » places', av.noms.length === 6 && /6 \/ 8/.test(av.places), av);
    const r = await inviter('Camille', 'Dupont', 'camille.dupont@exemple.fr', { role:'Apprentie', profil:'tech' }); const fen = await E.texte(p, '#calque'); await E.ranger(c);
    await L.aller(p, 'equipe'); const ap = { places:await kpi(c, 'places'), inv:await kpi(c, 'invites'), noms:await nomsListe(c) };
    v('P1 la personne invitée paraît dans la liste', ap.noms.includes('Camille Dupont'), ap.noms);
    v('P1 la place est comptée : « 7 / 8 »', /7 \/ 8/.test(ap.places), ap.places);
    v('P1 « 1 invitation en attente »', ap.inv === '1', ap.inv);
    v('P1 après l’envoi, une fenêtre dit que l’invitation est partie ET donne le mot de passe provisoire à remettre en main propre', /invitation est partie/i.test(fen) && /Mot de passe provisoire/i.test(fen), fen.slice(0, 300));
    v('P1-02 la fenêtre ne se contredit pas : le formulaire dit « personne d’autre ne le connaît », la fenêtre donne un mot de passe à remettre en main propre', !(/personne d’autre ne le connaît/.test(await (async () => { await L.toucher(c, '[data-eq="inviter"]'); const t = await E.texte(p, '#calque'); await E.ranger(c); return t; })()) && /remets ce mot de passe/i.test(fen)), 'deux consignes contraires pour la même personne');
    await L.toucher(c, '[data-eq="filtre|invites"]'); v('P1 le filtre « Invités » montre exactement elle', JSON.stringify(await nomsListe(c)) === JSON.stringify(['Camille Dupont']), await nomsListe(c));
    await L.toucher(c, '[data-eq="filtre|terrain"]'); v('P1 « Terrain » : elle y est (case terrain cochée par défaut)', (await nomsListe(c)).includes('Camille Dupont'), await nomsListe(c));
    await L.toucher(c, '[data-eq="filtre|tous"]');
    const k = await p.evaluate(() => EQUIPE.find(q => q.prenom === 'Camille').k);
    await L.toucher(c, `[data-eq="fiche|${k}"]`); const t = await E.texte(p, '#calque');
    v('P1 sa fiche dit « invitation envoyée »', /invitation envoyée/i.test(t), t.slice(0, 120));
    v('P1 sa fiche propose « Renvoyer l’invitation » et « Annuler l’invitation »', /Renvoyer l’invitation/.test(t) && /Annuler l’invitation/.test(t), null);
    v('P1 sa fiche ne propose PAS « Envoyer un lien de mot de passe » (elle n’a pas encore de mot de passe)', !/Envoyer un lien de mot de passe/.test(t), null);
    await L.toucher(c, `[data-eq="relancer|${k}"]`); const tr = await E.toast(p); v('P1 « Renvoyer l’invitation » dit à qui', /Invitation renvoyée à camille/.test(tr), tr);
    await L.toucher(c, `[data-eqx="annulinv|${k}"]`); await L.calme(p, 400); const ta = await E.texte(p, '#calque') + ' ' + await E.toast(p);
    v('P1 « Annuler l’invitation » demande confirmation OU annule en le disant', /annul/i.test(ta), ta.slice(0, 200));
    await E.ranger(c);
  });
  // ── P2 · erreurs de saisie
  await jouer(c, 'P2 erreurs', async () => {
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.toucher(c, '[data-eq="inviterok"]'); const t1 = await E.toast(p);
    v('P2 formulaire vide : le message dit quoi faire (prénom ET nom)', /Prénom ET nom/.test(t1), t1);
    await remplir(c, { 'eq-p':'Rémi', 'eq-n':'Poulain', 'eq-m':'pas-une-adresse' }); await L.toucher(c, '[data-eq="inviterok"]'); const t2 = await E.toast(p);
    const inline = await p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return q ? [...q.querySelectorAll('.erreur,[role=alert],#eq-homo,.champ .faible')].map(e => e.textContent.trim()).filter(Boolean) : []; });
    v('P2 e-mail faux : refusé avec un message clair', /adresse e-mail valide/.test(t2), t2);
    v('P2-01 e-mail faux : le message est AUSSI écrit sous le champ (un clavier de téléphone cache le toast)', inline.some(x => /e-mail|adresse/i.test(x)), { inline, toast:t2 });
    await remplir(c, { 'eq-p':'Julie', 'eq-n':'Petit', 'eq-m':'x@y.fr' }); await L.toucher(c, '[data-eq="inviterok"]');
    const homo = await p.evaluate(() => (document.getElementById('eq-homo') || {}).textContent || ''); v('P2 homonyme : « existe déjà », avec l’astuce de l’initiale, écrit dans la fenêtre', /existe déjà/.test(homo) && /initiale/.test(homo), homo);
    const nb = await p.evaluate(() => EQUIPE.filter(q => q.prenom === 'Julie').length); v('P2 aucun doublon créé', nb === 1, nb);
    // un nom avec une balise : rien ne s'injecte
    await remplir(c, { 'eq-p':'<img src=x onerror=window.__xss=1>', 'eq-n':'Test', 'eq-m':'xss@exemple.fr' }); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400);
    const xss = await p.evaluate(() => window.__xss === 1); v('P2 une balise dans le prénom ne s’exécute pas', !xss, xss);
    await L.aller(p, 'equipe'); await L.calme(p, 400); v('P2 aucune erreur de page après ces essais', c.err.length === 0, c.err.slice(0, 3)); await E.ranger(c);
  });
  // ── P3 · places pleines
  await jouer(c, 'P3 places', async () => {
    const places = await p.evaluate(() => ({ actifs:EQUIPE.filter(q => q.actif).length, max:EQ_PLACES }));
    for (let i = places.actifs; i < places.max; i++) await inviter('Essai' + i, 'Place' + i, `essai${i}@exemple.fr`);
    await L.aller(p, 'equipe'); v('P3 toutes les places prises : le compteur le dit', /toutes prises|8 \/ 8/.test(await E.texte(p, '#contenu')), await kpi(c, 'places'));
    await L.toucher(c, '[data-eq="inviter"]'); const q = await E.texte(p, '#calque'); const tt = await E.toast(p);
    v('P3 inviter avec les places pleines : on le dit AVANT de remplir un formulaire, et on propose quoi faire', /place/i.test(q + tt) && /(désactive|ajoute|abonnement)/i.test(q + tt), (q + ' ' + tt).slice(0, 300));
    await E.ranger(c);
  });
  // ── P5 · modifier une fiche
  await jouer(c, 'P5 modifier', async () => {
    await E.fiche(c, 'julie'); await L.toucher(c, '[data-eqx="modifier|julie"]');
    await p.fill('#eqx-mp', ''); await L.toucher(c, '[data-eqx="modifok|julie"]'); const t1 = await E.toast(p);
    v('P5 prénom vidé : refusé, message clair', /prénom|nom/i.test(t1), t1);
    await p.fill('#eqx-mp', 'Sophie'); await p.fill('#eqx-mn', 'Martin'); await p.dispatchEvent('#eqx-mn', 'input'); await L.toucher(c, '[data-eqx="modifok|julie"]');
    const t2 = await E.toast(p) + ' ' + await p.evaluate(() => (document.getElementById('eqx-mhomo') || {}).textContent || '');
    v('P5 renommer en un nom déjà pris : refusé (deux comptes ne portent pas le même nom)', /existe déjà|déjà/i.test(t2) && (await p.evaluate(() => eqDe('julie').prenom)) === 'Julie', t2);
    await p.fill('#eqx-mp', 'Julie'); await p.fill('#eqx-mn', 'Petit-Moreau'); await p.fill('#eqx-mt', '06 99 88 77 66'); await L.toucher(c, '[data-eqx="modifok|julie"]'); await L.calme(p, 500);
    const d = await p.evaluate(() => ({ nom:eqNom(eqDe('julie')), tel:eqDe('julie').tel, hnom:typeof H_NOM === 'function' ? H_NOM('julie') : null }));
    v('P5 enregistré : la donnée change', d.nom === 'Julie Petit-Moreau' && d.tel === '06 99 88 77 66', d);
    await L.aller(p, 'equipe'); v('P5 la liste montre le nouveau nom', (await nomsListe(c)).includes('Julie Petit-Moreau'), await nomsListe(c));
    v('P5-01 le nom partout ailleurs (H_NOM : planning, tâches, pointage, historique) suit la fiche', d.hnom === 'Julie Petit-Moreau', { hnom:d.hnom, fiche:d.nom });
    await L.aller(p, 'pointage'); await L.calme(p, 600); const tpt = await E.texte(p, '#contenu'); v('P5-04 Temps de travail écrit le NOUVEAU nom de Julie (pas « Julie Petit » seul)', /Petit-Moreau/.test(tpt) || !/Julie Petit(?!-)/.test(tpt), (tpt.match(/Julie[^,.;]{0,16}/g) || []).slice(0, 3));
    await E.fiche(c, 'sm'); await L.toucher(c, '[data-eqx="modifier|sm"]'); await p.fill('#eqx-mn', 'Martin-Garcia'); await L.toucher(c, '[data-eqx="modifok|sm"]'); await L.calme(p, 600);
    const s2 = await p.evaluate(() => ({ hnom:H_NOM('sm'), tech:(TECHS.find(t => t.id === 'sm') || {}).nom, fiche:eqNom(eqDe('sm')) }));
    v('P5-02 une technicienne renommée : le planning (TECHS) et H_NOM suivent la fiche', s2.hnom === s2.fiche && s2.tech === s2.fiche, s2);
    await L.aller(p, 'planning'); await L.calme(p, 600); const pl = await E.texte(p, '#contenu'); v('P5-03 le planning écrit le NOUVEAU nom de la technicienne, pas l’ancien', /Martin-Garcia/.test(pl) || !/Sophie Martin(?!-)/.test(pl), pl.match(/Sophie[^,.;]{0,20}/g));
    await L.aller(p, 'historique'); const h = await E.texte(p, '#contenu'); v('P5 l’historique note le changement de fiche', /Julie/.test(h), h.slice(0, 150));
  });
  // ── P6 · habilitations
  await jouer(c, 'P6 habilitations', async () => {
    await L.aller(p, 'equipe'); const k0 = await kpi(c, 'hab');
    await E.fiche(c, 'tl'); await L.toucher(c, '[data-eq="habajout|tl"]'); await p.fill('#eq-hn', 'Certibiocide');
    await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 500); const tt = await E.texte(p, '#calque');
    v('P6 habilitation ajoutée : elle paraît dans la fiche de Tom', /Certibiocide/.test(tt), tt.slice(0, 200));
    const lg = await p.evaluate(() => eqDe('tl').habil.length); v('P6 la donnée a une habilitation de plus (2)', lg === 2, lg);
    await L.toucher(c, '#calque button[data-ferme]'); await L.aller(p, 'equipe'); const k1 = await kpi(c, 'hab'); v('P6 le compteur « à renouveler » ne bouge pas pour une habilitation valable 3 ans', k1 === k0, { k0, k1 });
    // renouveler celle de Karim
    await E.fiche(c, 'kb'); const j = await p.evaluate(() => eqDe('kb').habil.findIndex(h => /électrique/i.test(h[0])));
    await L.toucher(c, `[data-eq="renouv|kb|${j}"]`); await L.toucher(c, `[data-eqx="renouvok|kb|${j}"]`); await L.calme(p, 600);
    await L.aller(p, 'equipe'); const k2 = await kpi(c, 'hab'); v('P6 renouveler l’habilitation de Karim : le compteur baisse de 1', Number(k2) === Number(k0) - 1, { k0, k2 });
    const fin = await p.evaluate(j => eqDe('kb').habil[j][1], j); v('P6 la nouvelle fin est dans le futur lointain (≥ 2 ans)', fin && fin > '2028-01-01', fin);
  });
  // ── P6b · habilitation : saisies absurdes
  await jouer(c, 'P6b habilitation absurde', async () => {
    const nb = () => p.evaluate(() => eqDe('sm').habil.length); const n0 = await nb();
    await E.fiche(c, 'sm'); await L.toucher(c, '[data-eq="habajout|sm"]');
    await L.toucher(c, '#calque [data-eq="habok|sm"]'); const t0 = await E.toast(p); v('P6b nom vide : refusé, message clair', /nom de l’habilitation/.test(t0) && (await nb()) === n0, t0);
    await p.fill('#eq-hn', 'Habilitation électrique BR'); await L.toucher(c, '#calque [data-eq="habok|sm"]'); await L.calme(p, 500);
    v('P6b-01 une habilitation de MÊME nom déjà valable est refusée ou fusionnée (pas deux lignes identiques)', (await nb()) === n0, { avant:n0, apres:await nb() });
    await E.fiche(c, 'sm'); await L.toucher(c, '[data-eq="habajout|sm"]'); await p.fill('#eq-hn', 'Formation absurde'); await p.fill('#eqx-hn', '2020-01-01'); await L.toucher(c, '#calque [data-eq="habok|sm"]'); await L.calme(p, 500);
    const h = await p.evaluate(() => { const x = eqDe('sm').habil.find(o => o[0] === 'Formation absurde'); return x ? x[1] : 'absente'; });
    v('P6b-02 une fin de validité AVANT la date d’obtention (2020 < aujourd’hui) est refusée ou signalée', h === 'absente' || /Expir|avant|passée|antérieure/i.test(await E.toast(p)), { fin:h, toast:await E.toast(p) });
    await E.fiche(c, 'sm'); await L.toucher(c, '[data-eq="habajout|sm"]'); await p.fill('#eq-hn', 'Sans date remplie'); await p.fill('#eqx-hn', ''); await L.toucher(c, '#calque [data-eq="habok|sm"]'); await L.calme(p, 500);
    const h2 = await p.evaluate(() => { const x = eqDe('sm').habil.find(o => o[0] === 'Sans date remplie'); return x ? x[1] : 'absente'; });
    v('P6b-03 une date de fin LAISSÉE VIDE sans cocher « Sans date de fin » : on demande (pas de « sans date de fin » posé en silence)', h2 === 'absente' || h2 !== null, { fin:h2 });
  });
  // ── P7 · désactiver puis réactiver
  await jouer(c, 'P7 désactiver', async () => {
    await E.fiche(c, 'marc'); const dis = await p.evaluate(() => document.querySelector('#calque [data-eq="actif|marc"]').disabled);
    v('P7 le gérant (dernier administrateur) ne peut pas se désactiver : le bouton est désactivé et le dit', dis === true, dis);
    await E.fiche(c, 'tl'); const av = await p.evaluate(() => ({ ints:INTS.filter(i => i.tech === 'tl' && i.st !== 'fait' && i.st !== 'annulee' && i.d >= AUJ).length, places:EQUIPE.filter(q => q.actif).length }));
    await L.toucher(c, '[data-eq="actif|tl"]'); const t = await E.texte(p, '#calque'); v('P7 désactiver Tom : un écran de reprise annonce ce qui lui reste', /Avant de désactiver Tom/.test(t) && /intervention/i.test(t), t.slice(0, 160));
    await L.toucher(c, '[data-eqx="desactok|tl"]'); await L.calme(p, 600);
    const ap = await p.evaluate(() => ({ actif:eqDe('tl').actif, restent:INTS.filter(i => i.tech === 'tl' && i.st !== 'fait' && i.st !== 'annulee' && i.d >= AUJ).length, sansTech:INTS.filter(i => !i.tech && i.st === 'aplanifier').length }));
    v('P7 Tom est désactivé, plus aucune intervention à venir à son nom', ap.actif === false && ap.restent === 0, { av, ap });
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="filtre|off"]'); v('P7 « Désactivés » le liste', (await nomsListe(c)).includes('Tom Leroy'), await nomsListe(c));
    await L.toucher(c, '[data-eq="fiche|tl"]'); const t2 = await E.texte(p, '#calque'); v('P7 sa fiche propose « Réactiver le compte »', /Réactiver le compte/.test(t2), null);
    await L.toucher(c, '[data-eq="actif|tl"]'); await L.calme(p, 600);
    v('P7 réactivé : il redevient actif', await p.evaluate(() => eqDe('tl').actif) === true, null);
  });
  // ── P9 · profil
  await jouer(c, 'P9 profil', async () => {
    await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'resp'); await L.calme(p, 500); const conf = await E.texte(p, '#calque'); v('P9 changer de profil DEMANDE confirmation et dit ce que la personne gagne et perd', /Appliquer le profil Responsable \?/.test(conf) && /pourra en plus/.test(conf) && /ne pourra plus/.test(conf), conf.slice(0, 200)); await L.toucher(c, '#calque [data-eqx^="profok|julie|resp"]'); await L.calme(p, 600);
    const pr = await p.evaluate(() => eqDe('julie').droits.profil); v('P9 « Responsable » appliqué à Julie', /^resp/.test(pr), pr);
    const t = await E.texte(p, '#calque'); v('P9 la fiche dit « profil Responsable » et ce qu’elle voit de plus', /profil Responsable/.test(t) && /Ce que Julie voit/.test(t), t.slice(t.indexOf('Droits'), t.indexOf('Droits') + 200));
    await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
    const e = await p.evaluate(() => ({ qui:acteur(), lignes:rlLignes().map(x => x.k), bande:!!document.querySelector('.sec-bande'), txt:(document.querySelector('.sec-bande') || {}).textContent }));
    v('P10 « Ouvrir l’application comme Julie » : on est Julie et une bande le dit', e.qui === 'julie' && e.bande && /Julie/.test(e.txt), e);
    v('P10 Julie (Responsable) a Planning et Boîte mail, et LIT Équipe et Mon entreprise (case « L’entreprise et l’équipe » en lecture seule)', e.lignes.includes('planning') && e.lignes.includes('boiteMail') && e.lignes.includes('equipe') && e.lignes.includes('entreprise'), e.lignes);
    await L.toucher(c, '.sec-bande [data-sec2="revenir"]'); await L.calme(p, 800);
    const r = await p.evaluate(() => ({ qui:acteur(), hash:location.hash, bande:!!document.querySelector('.sec-bande') })); v('P10 « Revenir à mon compte » : on est Marc, sur Équipe, la bande a disparu', r.qui === 'marc' && r.hash === '#equipe' && !r.bande, r);
    await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'secr'); await L.calme(p, 500); await L.toucher(c, '#calque [data-eqx^="profok|julie|secr"]'); await L.calme(p, 400);
  });
  // ── P9b · « Travaille sur le terrain » : la forme de l'application change vraiment
  await jouer(c, 'P9b terrain', async () => {
    await L.aller(p, 'equipe'); const k0 = await kpi(c, 'terrain');
    await E.fiche(c, 'julie'); await L.toucher(c, '#calque input[data-eqt="julie"]'); await L.calme(p, 600);
    v('P9b cocher « Travaille sur le terrain » pour Julie : la donnée change', await p.evaluate(() => eqxTerrain(eqDe('julie'))) === true, null);
    await L.aller(p, 'equipe'); const k1 = await kpi(c, 'terrain'); v('P9b le compteur « sur le terrain » monte de 1', Number(k1) === Number(k0) + 1, { k0, k1 });
    await L.toucher(c, '[data-eq="filtre|terrain"]'); v('P9b le filtre « Terrain » la montre', (await nomsListe(c)).includes('Julie Petit') || (await nomsListe(c)).some(x => /^Julie/.test(x)), await nomsListe(c)); await L.toucher(c, '[data-eq="filtre|tous"]');
    await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
    const e = await p.evaluate(() => ({ lignes:rlLignes().map(x => x.k), ouv:location.hash })); v('P9b ouverte comme Julie : l’application a la forme TERRAIN (Ma journée, Mes frais, Mes heures…) et plus les écrans du bureau', e.lignes.includes('majournee') && !e.lignes.includes('devis'), e);
    await p.evaluate(() => secuRevenir()); await L.calme(p, 700);
    await E.fiche(c, 'julie'); await L.toucher(c, '#calque input[data-eqt="julie"]'); await L.calme(p, 500);
    v('P9b décochée : retour au bureau', await p.evaluate(() => eqxTerrain(eqDe('julie'))) === false, null);
  });
  // ── P8 · une règle d'habilitation se VOIT quand on confie une intervention à quelqu'un qui ne l'a pas
  await jouer(c, 'P8 habilitation exigée', async () => {
    await L.aller(p, 'planning'); await L.calme(p, 500);
    const cible = await p.evaluate(() => { const r = eqxRegles.find(o => o.type); const i = INTS.find(x => x.type === (r && r.type) && x.st !== 'fait' && x.st !== 'annulee' && x.d >= AUJ && x.tech !== 'tl'); const tl = eqDe('tl'); const manque = i ? eqxManque(i, 'tl', i.d).length : 0; return i ? { id:i.id, tech:i.tech, d:i.d, h:i.h, regle:r.hab, manque } : null; });
    v('P8 population : une intervention exigeant une habilitation que Tom n’a pas existe', !!cible && cible.manque >= 1, cible);
    if (cible && cible.manque) {
      await p.evaluate(({ id }) => { const i = INTS.find(x => x.id === id); poser(i, 'tl', i.d, i.h); }, cible); await L.calme(p, 600);
      const t = await E.texte(p, '#calque') + ' ' + await E.texte(p, '#contenu') + ' ' + await E.toast(p); const tech = await p.evaluate(({ id }) => INTS.find(x => x.id === id).tech, cible);
      v('P8 confier l’intervention à Tom : l’application prévient AVANT que Tom n’a pas l’habilitation, et dit qui l’a', /n’a pas l’habilitation|habilitation/i.test(t) && (tech !== 'tl' || /(l’a|l’ont)\b/.test(t)), { tech, extrait:(t.match(/[^.]{0,80}habilitation[^.]{0,100}/) || [''])[0] });
      await E.ranger(c); }
  });
  // ── P11 · règles d'habilitations
  await jouer(c, 'P11 règles', async () => {
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eqx="regles"]'); const av = await p.evaluate(() => eqxRegles.length);
    await p.selectOption('#eqx-rh', { index:0 }); await p.fill('#eqx-rm', 'zzzmot'); await L.toucher(c, '[data-eqx="regajout"]'); await L.calme(p, 400);
    const ap = await p.evaluate(() => eqxRegles.length); v('P11 une règle ajoutée : la liste en compte une de plus', ap === av + 1, { av, ap });
    const t = await E.texte(p, '#calque'); v('P11 la règle s’écrit en toutes lettres (« exige »)', /zzzmot/.test(t) && /exige/.test(t), t.slice(0, 200));
    await L.toucher(c, `[data-eqx="regsuppr|${ap - 1}"]`); await L.calme(p, 400); v('P11 « Retirer » enlève la règle', (await p.evaluate(() => eqxRegles.length)) === av, null); await E.ranger(c);
  });
  // ── P15 · « Qui peut quoi »
  await jouer(c, 'P15 qui peut quoi', async () => {
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="filtre|droits"]'); const n = await p.evaluate(() => ({ lignes:document.querySelectorAll('#contenu .eqx-table tbody tr').length, cols:document.querySelectorAll('#contenu .eqx-table thead th').length, actifs:EQUIPE.filter(q => q.actif).length }));
    v('P15 le tableau a une ligne par personne active et une colonne par catégorie et droit à part', n.lignes === n.actifs && n.cols >= 15, n);
    await L.toucher(c, '#contenu .eqx-cel'); v('P15 toucher une case du tableau ouvre la fiche', (await E.obs(p)).pan !== '', await E.obs(p));
    await E.ranger(c);
  });
  // ── P12 · rechargement : l'application reste saine
  await jouer(c, 'P12 rechargement', async () => { await p.reload({ waitUntil:'load' }); await p.waitForTimeout(1500); await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.aller(p, 'equipe'); const n = await nomsListe(c); v('P12 après rechargement : l’Équipe revient à ses six personnes de départ (prototype)', n.length === 6, n); });
  v('aucune erreur de page sur tous les parcours', c.err.length === 0, c.err.slice(0, 4));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
