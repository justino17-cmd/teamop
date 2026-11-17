// Les CORRECTIONS de la campagne « équipe » (17 novembre 2026) : un contrôle par défaut corrigé qui n'est pas déjà joué par les sondes du testeur,
// plus les captures à REGARDER. ⛔ 127.0.0.1 seulement, entreprise fictive.   usage : node equipe-corrections.js [mac|ipad|iphone|android|petit] [nuit]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac', NUIT = process.argv[3] === 'nuit', SUF = `${PROFIL}-${NUIT ? 'nuit' : 'jour'}`;
const comme = (p, id) => p.evaluate(i => secuVoirComme(i), id);
(async () => {
  const c = await E.marc(PROFIL, NUIT), p = c.p;
  // ── equipe-01 : le gérant ne se repose pas son propre mot de passe (sa session se couperait avant la lecture du provisoire)
  await E.fiche(c, 'marc'); await L.calme(p, 300);
  const sansBouton = await p.evaluate(() => !document.querySelector('#calque [data-cnx^="repose|marc"]'));
  v('equipe-01 la fiche de Marc ne propose pas « Lui donner un mot de passe provisoire »', sansBouton);
  const refus = await p.evaluate(() => { const av = SESSION; const r = secuReposer('marc'); return { r, meme:SESSION === av, toast:(document.getElementById('toast') || {}).textContent || '' }; });
  v('equipe-01 secuReposer(soi) est refusé par la fonction, la session reste ouverte, le toast dit à qui demander', refus.r === false && refus.meme && /autre administrateur/.test(refus.toast), refus);
  await E.ranger(c);
  // ── equipe-13 : deux boutons, deux noms, une phrase sous chacun
  await E.fiche(c, 'julie'); await L.calme(p, 300);
  const f = await p.evaluate(() => { const q = document.querySelector('#calque .panneau'), R = q.querySelector('.cn-mdp'), bs = R ? [...R.querySelectorAll('.cn-mdp-l')].map(l => ({ btn:l.querySelector('button').textContent.trim(), phrase:(l.querySelector('small') || {}).textContent || '', data:l.querySelector('button').getAttribute('data-cnx') || l.querySelector('button').getAttribute('data-eq') })) : [], txt = q.textContent;
    return { bs, mdp:q.querySelectorAll('[data-eq^="mdp|"]').length, repose:q.querySelectorAll('[data-cnx^="repose|"]').length, ancien:/Reposer|Envoyer un lien de mot de passe/.test(txt) }; });
  v('equipe-13 population : deux gestes de mot de passe dans le bloc', f.bs.length === 2, f);
  v('equipe-13 « Lui donner un mot de passe provisoire » + une phrase', f.bs[0] && f.bs[0].btn === 'Lui donner un mot de passe provisoire' && f.bs[0].phrase.length > 30, f.bs[0]);
  v('equipe-13 « Lui envoyer un lien pour choisir le sien » + une phrase', f.bs[1] && f.bs[1].btn === 'Lui envoyer un lien pour choisir le sien' && f.bs[1].phrase.length > 30, f.bs[1]);
  v('equipe-13 un seul bouton de chaque (pas de doublon dans la rangée d’actions), plus de « Reposer »', f.mdp === 1 && f.repose === 1 && !f.ancien, f);
  await L.toucher(c, '#calque [data-eq^="mdp|julie"]'); await L.calme(p, 400);
  v('equipe-13 « lien pour choisir le sien » : le toast dit à qui il part', /Lien envoyé à julie@/.test(await E.toast(p)), await E.toast(p));
  await E.fiche(c, 'julie'); await p.evaluate(() => { const b = document.querySelector('#calque .cn-acces'); if (b) b.scrollIntoView({ block:'start' }); }); await L.calme(p, 300);
  const dd = await L.deborde(c); v(`equipe-13 la fiche de Julie ne glisse pas de côté (${SUF})`, dd.bouge === 0, dd);
  await L.capture(c, E.CAP + `corr-connexion-julie-${SUF}.png`);
  if (c.doigt) { const t = await L.doigts(p, '#calque .cn-mdp'); v(`equipe-13 cibles au doigt ≥ 44 px (${SUF})`, t.petits.length === 0, t.petits); }
  await E.ranger(c);
  // ── equipe-05/06/07 : les refus de l'ajout d'une habilitation disent chacun SA phrase, sous le champ (le sondeur du testeur accepte « refusé ou signalé » : ici on exige la bonne phrase)
  await E.fiche(c, 'kb'); await L.toucher(c, '[data-eq="habajout|kb"]'); await L.calme(p, 400);
  const nb0 = await p.evaluate(() => eqDe('kb').habil.length), clic = async () => { await L.toucher(c, '#calque [data-eq^="habok|kb"]'); await L.calme(p, 300); }, err = () => p.evaluate(() => { const e = document.getElementById('eqx-hn-err'), n = document.getElementById('eq-hn-err'); return { fin:e ? e.textContent : '', nom:n ? n.textContent : '', marque:document.getElementById('eqx-hn').getAttribute('aria-invalid') }; });
  await p.fill('#eq-hn', 'Formation de test'); await p.fill('#eqx-hd', '2026-10-20'); await p.fill('#eqx-hn', '2026-10-10'); await clic(); const e6 = await err();
  v('equipe-06 une fin AVANT la date d’obtention est refusée avec cette phrase-là, sous le champ, champ marqué', /ne peut pas être avant/.test(e6.fin) && e6.marque === 'true' && await p.evaluate(() => eqDe('kb').habil.length) === nb0, e6);
  await p.fill('#eqx-hn', '2026-10-25'); await p.fill('#eqx-hd', '2026-10-25'); await p.fill('#eqx-hn', '2020-01-01'); await p.fill('#eqx-hd', '2019-01-01'); await clic(); const e6b = await err();
  v('equipe-06 une fin déjà passée est SIGNALÉE (« Expirée » tout de suite) et rien n’est ajouté au premier toucher', /déjà passée/.test(e6b.fin) && await p.evaluate(() => eqDe('kb').habil.length) === nb0, e6b);
  await p.fill('#eqx-hn', ''); await clic(); const e7 = await err();
  v('equipe-07 une date de fin vide sans « Sans date de fin » : on demande de choisir (phrase propre)', /Choisis la date de fin/.test(e7.fin) && await p.evaluate(() => eqDe('kb').habil.length) === nb0, e7);
  await p.fill('#eq-hn', 'Habilitation électrique BR'); await p.fill('#eqx-hn', '2027-10-25'); await clic(); const e5 = await err();
  v('equipe-05 une habilitation de même nom : refusée sous le champ du nom, avec la phrase qui renvoie à « Renouveler » ou dit qu’elle est valable', /a déjà/.test(e5.nom) && await p.evaluate(() => eqDe('kb').habil.length) === nb0, e5);
  await E.ranger(c);
  // ── equipe-09 : sur téléphone, adresse et rôle / téléphone chacun sur sa ligne
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 400);
  const iv = await p.evaluate(() => { const m = document.getElementById('eq-m').getBoundingClientRect(), r = document.getElementById('eq-r').getBoundingClientRect(); return { memeLigne:Math.abs(m.top - r.top) < 4, wMail:Math.round(m.width) }; });
  v(`equipe-09 Inviter : l’e-mail et le rôle se rangent selon la largeur (${SUF})`, c.largeur >= 640 ? iv.memeLigne : !iv.memeLigne && iv.wMail >= c.largeur - 90, { iv, largeur:c.largeur });
  await L.capture(c, E.CAP + `corr-inviter-${SUF}.png`); await E.ranger(c);
  await E.fiche(c, 'julie'); await L.toucher(c, '[data-eqx="modifier|julie"]'); await L.calme(p, 400);
  const mo = await p.evaluate(() => { const g = document.querySelector('#calque .eqx-modif .fo-garder'), s = g.querySelector('input').getBoundingClientRect(), tx = g.querySelector('span').getBoundingClientRect(); const m = document.getElementById('eqx-mm').getBoundingClientRect(), t = document.getElementById('eqx-mt').getBoundingClientRect(); return { lignes:Math.round(g.getBoundingClientRect().height / 20), phraseSousLibelle:tx.top >= s.bottom - 2, mailSousTel:t.top > m.top + 4, wMail:Math.round(m.width) }; });
  v(`equipe-09 Modifier : la phrase du terrain passe SOUS son libellé (${SUF})`, mo.phraseSousLibelle, mo);
  if (c.largeur < 640) v(`equipe-09 Modifier : e-mail et téléphone sur deux lignes (${SUF})`, mo.mailSousTel, mo);
  await L.capture(c, E.CAP + `corr-modifier-${SUF}.png`); await E.ranger(c);
  // ── equipe-10 : le bouton du toast au doigt
  if (c.doigt) { await L.aller(p, 'equipe'); await p.evaluate(() => toast('Le compte de Tom est désactivé.', { lib:'Annuler', fn:() => {} })); await L.calme(p, 400);
    const bt = await p.evaluate(() => { const r = document.querySelector('#toast button').getBoundingClientRect(); return { w:Math.round(r.width), h:Math.round(r.height) }; });
    v(`equipe-10 « Annuler » du toast ≥ 44 × 44 au doigt (${SUF})`, bt.h >= 44 && bt.w >= 44, bt); await L.capture(c, E.CAP + `corr-toast-${SUF}.png`); }
  // ── equipe-15 : un seul nom par catégorie
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="filtre|droits"]'); await L.calme(p, 500);
  const noms = await p.evaluate(() => { const col = [...document.querySelectorAll('.eqx-table thead th:not(:first-child):not(.eqx-sp) span')].map(e => e.textContent.trim()), liste = [...document.querySelectorAll('.eqx-dr-liste .eqx-dl b')].map(e => e.textContent.trim()); return { col, liste, ref:DR_CATS.map(o => o[1]) }; });
  v('equipe-15 population : le tableau a une colonne par catégorie (10)', noms.col.length === 10, noms);
  v('equipe-15 les titres du tableau sont ceux de DR_CATS, mot pour mot', JSON.stringify(noms.col) === JSON.stringify(noms.ref.map(n => n.replace(/’/g, "'"))), noms);
  v('equipe-15 la liste « Les catégories » reprend les mêmes noms', noms.ref.every(n => noms.liste.includes(n)), noms);
  // ── equipe-16 : le tableau ne se montre que s'il tient ; sinon la forme en listes
  const tab = await p.evaluate(() => { const t = document.querySelector('.eqx-dr-tab'), l = document.querySelector('.eqx-dr-liste'), vis = e => e && getComputedStyle(e).display !== 'none'; const T = t.querySelector('table'); return { tableau:vis(t), liste:vis(l), tientDansSaCarte:vis(t) ? T.scrollWidth <= t.clientWidth + 1 : null, carte:t.clientWidth }; });
  v(`equipe-16 le tableau ne se montre que s’il TIENT dans la carte, sinon la forme en listes (${SUF})`, tab.tableau !== tab.liste && (!tab.tableau || tab.tientDansSaCarte), tab);
  await L.capture(c, E.CAP + `corr-qui-peut-quoi-${SUF}.png`); await L.toucher(c, '[data-eq="filtre|tous"]');
  // ── equipe-18 : un Responsable en lecture voit des cases grisées et la phrase qui dit pourquoi
  await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'resp'); await L.calme(p, 500); await L.toucher(c, '#calque [data-eqx^="profok|julie|resp"]'); await L.calme(p, 500);
  await p.evaluate(() => { secuVoirComme('julie'); }); await L.calme(p, 900);
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="fiche|sm"]'); await L.calme(p, 500);
  await p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; }); await L.calme(p, 300);
  const R = await p.evaluate(() => { const q = document.querySelector('#calque .panneau'), cases = [...q.querySelectorAll('input[data-eqd], input[data-eqs], input[data-eqt]')]; return { n:cases.length, actives:cases.filter(i => !i.disabled).length, phrase:/Tu peux regarder ces droits/.test(q.textContent) }; });
  v('equipe-18 population : la fiche de Sophie montre des cases (≥ 40)', R.n >= 40, R);
  v('equipe-18 un Responsable (Équipe en lecture) : AUCUNE case active', R.actives === 0, R);
  v('equipe-18 une phrase dit « Tu peux regarder ces droits ; c’est Marc qui les règle »', R.phrase, R);
  await p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.scrollIntoView({ block:'start' }); }); await L.calme(p, 300);
  await L.capture(c, E.CAP + `corr-responsable-droits-${SUF}.png`); await E.ranger(c); await p.evaluate(() => secuRevenir()); await L.calme(p, 700);
  // ── equipe-11 : « Voir » décide SEUL — sans « Supprimer », Temps de travail et Dépôts et camions restent ouverts
  const k = await p.evaluate(() => 'julie');
  const ouverts = async (regle) => { await p.evaluate(regle); await comme(p, k); await L.calme(p, 800); const o = await p.evaluate(() => ({ pointage:droitVoit('pointage'), boxes:droitVoit('boxes'), vehicules:droitVoit('vehicules'), stock:droitVoit('stock') })); await p.evaluate(() => secuRevenir()); await L.calme(p, 500); return o; };
  const tout = "() => { const d = eqDe('julie').droits; d.profil = 'resp*'; for (const q of ['planif','inter','crm','ventes','compta','stock','temps','com','achats','admin']) d.cats[q] = { v:1, c:1, m:1, s:1 }; d.cats.admin = { v:0, c:0, m:0, s:0 }; }";
  const sans = "() => { const d = eqDe('julie').droits; d.cats.temps = { v:1, c:1, m:1, s:0 }; d.cats.stock = { v:1, c:1, m:1, s:0 }; }";
  const rien = "() => { const d = eqDe('julie').droits; d.cats.temps = { v:0, c:0, m:0, s:0 }; d.cats.stock = { v:0, c:0, m:0, s:0 }; }";
  const A = await ouverts(eval(tout)), B = await ouverts(eval(sans)), C = await ouverts(eval(rien));
  v('equipe-11 population : avec toutes les cases, Temps de travail et Dépôts et camions sont ouverts', A.pointage && A.boxes, A);
  v('equipe-11 sans « Temps de travail › Supprimer » : Temps de travail RESTE ouvert (« Voir » décide seul)', B.pointage === true && B.vehicules === true, B);
  v('equipe-11 sans « Stock › Supprimer » : Dépôts et camions RESTE ouvert', B.boxes === true && B.stock === true, B);
  v('equipe-11 contre-épreuve : sans « Voir », les deux se ferment', C.pointage === false && C.boxes === false, C);
  const ph = await p.evaluate(() => ({ t:DROIT_PHRASES.temps.v, s:DROIT_PHRASES.stock.v, ts:DROIT_PHRASES.temps.s, ss:DROIT_PHRASES.stock.s }));
  v('equipe-11 la phrase de « Voir » dit ce qu’elle ouvre (heures de toute l’équipe ; dépôts et camions), celle de « Supprimer » ne promet plus un écran', /heures de toute l’équipe/.test(ph.t) && /dépôts et les camions/.test(ph.s) && !/ouvrir/.test(ph.ts), ph);
  // ── equipe-20 : plus de consigne de testeur dans l'application
  await L.aller(p, 'entreprise'); await L.toucher(c, '[data-ent="lien|rdv"]'); await L.calme(p, 600);
  const rd = await p.evaluate(() => document.querySelector('#calque').textContent.replace(/\s+/g, ' '));
  v('equipe-20 Rendez-vous en ligne : plus de chemin « ouvre une intervention TERMINÉE… » dans l’application', !/TERMINÉE|Voir le lien client/.test(rd) && /Enregistré tout de suite/.test(rd), rd.slice(rd.indexOf('Enregistré') - 20, rd.indexOf('Enregistré') + 220));
  await E.ranger(c);
  // ── equipe-12 : un seul nom pour la carte et sa fenêtre
  await L.aller(p, 'entreprise'); await L.toucher(c, '[data-ent="carte|legal"]'); await L.calme(p, 500);
  const lg = await p.evaluate(() => ({ h2:document.querySelector('#calque h2').textContent.trim(), carte:[...document.querySelectorAll('#contenu [data-ent="carte|legal"]')].map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40))[0] }));
  v('equipe-12 la fenêtre s’appelle comme sa carte (« Tes mentions légales »)', lg.h2 === 'Tes mentions légales' && /Tes mentions légales/.test(lg.carte), lg); await E.ranger(c);
  v(`aucune erreur de page (${SUF})`, c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
