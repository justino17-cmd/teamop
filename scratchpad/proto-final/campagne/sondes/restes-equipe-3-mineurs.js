// RESTES ÉQUIPE, tour 3, points 4 à 6 (19 novembre 2026) :
//  H. l'en-tête de la fiche d'une personne DÉSACTIVÉE le dit (gérant ET lecteur) ; une invitée active dit toujours « invitation envoyée », une active ordinaire ne dit rien ;
//  S. sur la fiche de SOI, la phrase « … ci-dessous » vient APRÈS le bouton qu'elle désigne (et le nomme) ;
//  I. un signe invisible (U+200B/C/D, 2060, FEFF, 00AD, marques bidi) collé dans un Prénom/Nom est REFUSÉ aux 4 sites, avec une vraie raison ; « O'Neil », « Marie-Ève » restent acceptés ; rien d'invisible n'entre dans l'équipe ;
//  G. un compte désactivé ne propose plus « Nouveau téléphone » ni « Déconnecter partout » ; un compte actif les propose encore ; la réactivation les rend.
// ⛔ 127.0.0.1 seulement. usage : node restes-equipe-3-mineurs.js [mac|iphone|ipad|android|petit] [nuit] [section…]
const fs = require('fs'); const E = require('./equipe-outils.js'); const { L, v } = E; try { fs.mkdirSync(E.CAP, { recursive:true }); } catch (e) {}
const PROFIL = process.argv[2] || 'iphone', NUIT = process.argv[3] === 'nuit', SUF = `${PROFIL}-${NUIT ? 'nuit' : 'jour'}`;
const SECTIONS = process.argv.slice(NUIT ? 4 : 3), vaut = s => !SECTIONS.length || SECTIONS.includes(s);
const jouer = async (nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 260)); } };
const boutons = p => p.evaluate(() => [...document.querySelectorAll('#calque button, #calque a.btn')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim().replace(/\s+/g, ' ')));
const surtitre = p => p.evaluate(() => { const s = document.querySelector('#calque .panneau .surtitre'); return s ? s.textContent.replace(/\s+/g, ' ').trim() : ''; });
const INV = [['200B', '​'], ['200C', '‌'], ['200D', '‍'], ['2060', '⁠'], ['FEFF', '﻿'], ['00AD', '­'], ['200E', '‎'], ['200F', '‏'], ['202A', '‪'], ['202B', '‫'], ['202C', '‬'], ['202D', '‭'], ['202E', '‮'], ['2066', '⁦'], ['2067', '⁧'], ['2068', '⁨'], ['2069', '⁩']];
const desactiver = async (c, k) => { const p = c.p; await E.fiche(c, k); await L.toucher(c, `[data-eq="desact|${k}"]`); await L.calme(p, 400); if (await p.locator('[data-eqx^="desactok"]').count()) { await L.toucher(c, '[data-eqx^="desactok"]'); await L.calme(p, 400); } };
(async () => {
  let c = await E.marc(PROFIL, NUIT), p = c.p; const ferme = async () => { await E.ranger(c); };
  const inviter = async (pr, no, mail) => { await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 300); await p.fill('#eq-p', pr); await p.fill('#eq-n', no); await p.fill('#eq-m', mail); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 600); return p.evaluate(pr => { const q = EQUIPE.find(x => x.prenom === pr); return q && q.k; }, pr); };

  if (vaut('H')) await jouer('H en-tête désactivée', async () => {
    const k = await inviter('Inès', 'Garnier', 'ines.garnier@climservices17.fr'); v('H (population) Inès est invitée', !!k, k); if (!k) return;
    await ferme(); await E.fiche(c, k); let s = await surtitre(p);
    v('H invitée ACTIVE : « invitation envoyée »', /invitation envoyée/i.test(s) && !/désactivé/i.test(s), s);
    await desactiver(c, k); await ferme(); await E.fiche(c, k); s = await surtitre(p);
    v('H invitée DÉSACTIVÉE : l\'en-tête dit « désactivé(e) »', /désactivé\(e\)/.test(s), s);
    await L.capture(c, E.CAP + `rt3-entete-invitee-${SUF}.png`);
    await ferme(); await desactiver(c, 'sm'); await ferme(); await E.fiche(c, 'sm'); s = await surtitre(p);
    v('H une technicienne ordinaire désactivée : « désactivé(e) » aussi', /désactivé\(e\)/.test(s), s);
    await ferme(); await E.fiche(c, 'kb'); s = await surtitre(p);
    v('H (contre-épreuve) une personne ACTIVE n\'est pas dite désactivée', !/désactivé/i.test(s) && s.length > 3, s);
    // lecteur : Julie passe Responsable (lecture), le gérant ouvre l'application comme elle
    await ferme(); await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'resp'); await L.calme(p, 500); await L.toucher(c, '#calque [data-eqx^="profok|julie|resp"]'); await L.calme(p, 500);
    await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
    v('H (population) on est Julie, lectrice', await p.evaluate(() => acteur() === 'julie' && !peut('equipe', 'm')), await p.evaluate(() => acteur()));
    await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiltre = 'off'; rendre(); }); await L.calme(p, 300);
    await L.toucher(c, `[data-eq="fiche|${k}"]`); await L.calme(p, 400); s = await surtitre(p);
    v('H LECTEUR : l\'en-tête de la fiche dit « désactivé(e) » (pas seulement la pastille de la carte)', /désactivé\(e\)/.test(s), s);
    const g = await boutons(p); v('H LECTEUR : ni Nouveau téléphone ni Déconnecter partout', !g.some(x => /Nouveau téléphone|Déconnecter partout/.test(x)), g);
    await L.capture(c, E.CAP + `rt3-entete-lecteur-${SUF}.png`);
  });

  if (vaut('S')) await jouer('S phrase après son bouton', async () => {
    await E.fiche(c, 'marc');
    const r = await p.evaluate(() => { const P = document.querySelector('#calque .panneau'), tx = P.innerText.replace(/\s+/g, ' '), i = tx.indexOf('ci-dessous'), j = tx.indexOf('Copier le lien et l’identifiant'), m = tx.indexOf('M’envoyer un lien pour choisir'); const ph = [...P.querySelectorAll('small')].find(x => /ci-dessous/.test(x.textContent)); const bt = [...P.querySelectorAll('button')].find(b => /M’envoyer un lien/.test(b.textContent)); const cp = [...P.querySelectorAll('button')].find(b => /Copier le lien/.test(b.textContent)); return { i, j, m, ph:ph ? ph.textContent.trim() : '', apresCopier:!!(ph && cp && (cp.compareDocumentPosition(ph) & 4)), apresBouton:!!(ph && bt && (ph.compareDocumentPosition(bt) & 4)), nomme:ph ? /M’envoyer un lien/.test(ph.textContent) : false }; });
    v('S la phrase « ci-dessous » existe sur la fiche de soi', r.i > 0, r);
    v('S elle vient APRÈS « Copier le lien et l’identifiant » (ce qu\'elle ne désigne pas)', r.apresCopier, r);
    v('S ce qu\'elle désigne vient APRÈS elle (le bouton « M’envoyer un lien ») : « ci-dessous » dit vrai', r.apresBouton, r);
    v('S elle nomme le bouton sans ambiguïté', r.nomme, r.ph);
    await p.evaluate(() => { const e = [...document.querySelectorAll('#calque small')].find(x => /ci-dessous/.test(x.textContent)); if (e) e.scrollIntoView({ block:'center' }); }); await L.calme(p, 300); await L.capture(c, E.CAP + `rt3-soi-${SUF}.png`);
  });

  if (vaut('I')) await jouer('I signes invisibles', async () => {
    const r = await p.evaluate(inv => { const faux = [];
      for (const [nom, ch] of inv) for (const t of ['Marie' + ch, ch + 'Marie', 'Ma' + ch + 'rie', ch]) { const ok = nomPersonneOk(t) !== null, ph = nomRefus(t); if (ok || !ph) faux.push({ nom, t:JSON.stringify(t), ok, ph }); }
      return { faux, bons:[nomPersonneOk("O'Neil"), nomPersonneOk('Marie-Ève'), nomPersonneOk('Éric'), nomPersonneOk('Zoé 3')], phrase:nomRefus('Ma​rie') }; }, INV);
    v('I (population) 17 signes × 4 positions = 68 valeurs, toutes refusées AVEC une phrase', r.faux.length === 0, r.faux.slice(0, 5));
    v('I « O’Neil » et « Marie-Ève » restent acceptés (et deux autres)', r.bons[0] === 'O’Neil' && r.bons[1] === 'Marie-Ève' && r.bons[2] === 'Éric' && r.bons[3] === 'Zoé 3', r.bons);
    v('I la raison est vraie : elle parle d\'un signe invisible, pas de la liste des signes permis', /invisible/.test(r.phrase), r.phrase);
    const cas = [['200B', '​'], ['FEFF', '﻿'], ['00AD', '­'], ['202E', '‮'], ['2066', '⁦']], res = [];
    for (const [nom, ch] of cas) {
      for (const champ of ['eq-p', 'eq-n']) { await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 250);
        await p.fill('#eq-p', champ === 'eq-p' ? 'Paul' + ch : 'Paul'); await p.fill('#eq-n', champ === 'eq-n' ? 'Dupont' + ch : 'Dupont'); await p.fill('#eq-m', 'essai.invisible' + nom.toLowerCase() + champ.slice(3) + '@climservices17.fr');
        await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400); const ph = await p.evaluate(id => { const e = document.getElementById(id + '-err'); return e && !e.hidden ? e.textContent.trim() : ''; }, champ), t = await E.toast(p), cree = await p.evaluate(() => EQUIPE.some(x => /essai\.invisible/.test(x.mail || '')));
        res.push({ site:'inviter-' + champ, nom, ph:ph.slice(0, 50), t:t.slice(0, 50), cree }); await ferme(); }
      for (const champ of ['eqx-mp', 'eqx-mn']) { await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 300); await p.fill('#' + champ, (champ === 'eqx-mp' ? 'Karim' : 'Benali') + ch); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 400);
        const t = await E.toast(p), nom2 = await p.evaluate(() => eqDe('kb').prenom + '|' + eqDe('kb').nom); res.push({ site:'modifier-' + champ, nom, t:t.slice(0, 60), nom2 }); await ferme(); } }
    v('I (population) 5 signes × 4 sites = 20 essais', res.length === 20, res.length);
    v('I INVITER (Prénom, Nom) : refusé avec la raison « invisible », personne créée', res.filter(x => x.site.startsWith('inviter')).every(x => /invisible/.test(x.ph) && !x.cree), res.filter(x => x.site.startsWith('inviter') && !(/invisible/.test(x.ph) && !x.cree)).slice(0, 4));
    v('I MODIFIER (Prénom, Nom) : refusé avec la raison « invisible », la fiche ne bouge pas', res.filter(x => x.site.startsWith('modifier')).every(x => /invisible/.test(x.t) && !/[​-‏‪-‮⁠-⁯﻿­]/.test(x.nom2)), res.filter(x => x.site.startsWith('modifier')).slice(0, 4));
    // les cas acceptés par l'interface, pour de vrai
    await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 300); await p.fill('#eqx-mn', 'O\'Neil'); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 400);
    v('I « O\'Neil » est ENREGISTRÉ par Modifier la fiche', await p.evaluate(() => eqDe('kb').nom === 'O’Neil'), await p.evaluate(() => eqDe('kb').nom)); await ferme();
    await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 300); await p.fill('#eqx-mp', 'Marie-Ève'); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 400);
    v('I « Marie-Ève » est ENREGISTRÉ par Modifier la fiche', await p.evaluate(() => eqDe('kb').prenom === 'Marie-Ève'), await p.evaluate(() => eqDe('kb').prenom)); await ferme();
    const inv = await p.evaluate(() => EQUIPE.filter(x => /[­​-‏‪-‮⁠-⁯﻿]/.test(x.prenom + x.nom + (x.mail || ''))).map(x => x.k));
    v('I RIEN d\'invisible dans toute l\'équipe', inv.length === 0, inv);
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 250); await p.fill('#eq-p', 'Paul​'); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400); await L.capture(c, E.CAP + `rt3-invisible-${SUF}.png`); await ferme();
  });

  if (vaut('J')) await jouer('J signes invisibles voisins (recontrôle C1)', async () => {
    const CH = [0x034F, 0x115F, 0x1160, 0x17B4, 0x17B5, 0x180B, 0x180C, 0x180D, 0x3164, 0xFE00, 0xFE08, 0xFE0F, 0xFFA0].map(n => ['U+' + n.toString(16).toUpperCase().padStart(4, '0'), String.fromCharCode(n)]);
    const r = await p.evaluate(inv => { const faux = [], net = [];
      for (const [nom, ch] of inv) { for (const t of ['Marie' + ch, ch + 'Marie', 'Ma' + ch + 'rie', ch, ch + ch, ' ' + ch + ' ', 'A' + ch + ' B' + ch]) { const ok = nomPersonneOk(t) !== null, ph = nomRefus(t); if (ok || !/invisible/.test(ph)) faux.push({ nom, t: JSON.stringify(t), ok, ph }); }
        const n = nomPersonneNet('Ma' + ch + 'rie' + ch); if (n !== 'Marie') net.push({ nom, n: JSON.stringify(n) }); if (nomPersonneNet(ch) !== '') net.push({ nom, seul: JSON.stringify(nomPersonneNet(ch)) }); }
      const comb = String.fromCharCode(0x301);
      return { faux, net, bons: [nomPersonneOk("O'Neil"), nomPersonneOk('Marie-Ève'), nomPersonneOk('E' + comb + 'ric'), nomPersonneOk('Zoé 3'), nomPersonneOk('7')],
        marques: [comb, comb + comb, '.', '-', ' . ', String.fromCharCode(0x300, 0x36F)].map(t => ({ ok: nomPersonneOk(t), ph: nomRefus(t), net: nomPersonneNet(t) })) }; }, CH);
    v('J (population) 13 signes × 7 positions (collage, milieu, début, fin, seul, doublé, entouré d\'espaces) : tous refusés avec la phrase « invisible »', r.faux.length === 0, r.faux.slice(0, 5));
    v('J nomPersonneNet retire chacun de ces signes d\'un nom déjà rangé (et un nom fait d\'eux seuls devient vide)', r.net.length === 0, r.net.slice(0, 5));
    v('J « O\'Neil », « Marie-Ève », « É » combinant, « Zoé 3 » et « 7 » restent acceptés', r.bons[0] === 'O’Neil' && r.bons[1] === 'Marie-Ève' && r.bons[2] === 'E' + String.fromCharCode(0x301) + 'ric' && r.bons[3] === 'Zoé 3' && r.bons[4] === '7', r.bons);
    v('J un nom sans AUCUN signe visible (marques seules, point, tiret) est refusé avec une raison, et nettoyé en vide', r.marques.every(x => x.ok === null && x.ph && x.net === ''), r.marques);
    const res = [];
    for (const [nom, ch] of CH.filter(x => /3164|115F|FFA0|034F|17B4|FE0F/.test(x[0]))) {
      for (const champ of ['eq-p', 'eq-n']) { await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 250);
        await p.fill('#eq-p', champ === 'eq-p' ? 'Paul' + ch : 'Paul'); await p.fill('#eq-n', champ === 'eq-n' ? ch : 'Dupont'); await p.fill('#eq-m', 'essai.voisin' + nom.slice(2).toLowerCase() + champ.slice(3) + '@climservices17.fr');
        await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400); const ph = await p.evaluate(id => { const e = document.getElementById(id + '-err'); return e && !e.hidden ? e.textContent.trim() : ''; }, champ), cree = await p.evaluate(() => EQUIPE.some(x => /essai\.voisin/.test(x.mail || '')));
        res.push({ site: 'inviter-' + champ, nom, ph: ph.slice(0, 50), cree }); await ferme(); }
      for (const champ of ['eqx-mp', 'eqx-mn']) { await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 300); await p.fill('#' + champ, champ === 'eqx-mp' ? ch : 'Benali' + ch); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 400);
        const t = await E.toast(p), nom2 = await p.evaluate(() => eqDe('kb').prenom + '|' + eqDe('kb').nom); res.push({ site: 'modifier-' + champ, nom, t: t.slice(0, 60), nom2 }); await ferme(); } }
    v('J (population) 6 signes × 4 sites = 24 essais par l\'interface', res.length === 24, res.length);
    v('J INVITER : refusé avec la raison « invisible », personne créée', res.filter(x => x.site.startsWith('inviter')).every(x => /invisible/.test(x.ph) && !x.cree), res.filter(x => x.site.startsWith('inviter') && !(/invisible/.test(x.ph) && !x.cree)).slice(0, 4));
    v('J MODIFIER : refusé avec la raison « invisible », la fiche ne bouge pas', res.filter(x => x.site.startsWith('modifier')).every(x => /invisible/.test(x.t) && x.nom2 === 'Karim|Benali'), res.filter(x => x.site.startsWith('modifier') && !(/invisible/.test(x.t) && x.nom2 === 'Karim|Benali')).slice(0, 4));
  });

  if (vaut('G')) await jouer('G gestes de compte désactivé', async () => {
    const k = await inviter('Inès', 'Garnier', 'ines.garnier2@climservices17.fr'); if (!k) { v('G (population) Inès invitée', false, k); return; }
    const gs = ['Nouveau téléphone', 'Déconnecter partout'];
    await ferme(); await E.fiche(c, 'kb'); let g = await boutons(p);
    v('G (population) un compte ACTIF (Karim) les propose encore tous les deux', gs.every(x => g.includes(x)), g);
    await ferme(); await E.fiche(c, k); g = await boutons(p);
    v('G l\'invitée ACTIVE les propose encore (rien n\'est retiré à tort)', gs.every(x => g.includes(x)), g);
    await desactiver(c, k); await ferme(); await E.fiche(c, k); g = await boutons(p);
    v('G l\'invitée DÉSACTIVÉE ne propose ni « Nouveau téléphone » ni « Déconnecter partout »', !g.some(x => gs.includes(x)), g);
    v('G … et propose toujours « Réactiver le compte »', g.includes('Réactiver le compte'), g);
    await L.capture(c, E.CAP + `rt3-gestes-invitee-${SUF}.png`);
    await ferme(); await desactiver(c, 'sm'); await ferme(); await E.fiche(c, 'sm'); g = await boutons(p);
    v('G une technicienne connue désactivée : idem', !g.some(x => gs.includes(x)) && g.includes('Réactiver le compte'), g);
    const ses = await p.evaluate(() => !!SECU.sessions.sm); v('G (preuve par le code) une désactivée n\'a AUCUNE session ouverte à couper', !ses, ses);
    await L.toucher(c, '[data-eq="actif|sm"]'); await L.calme(p, 500); if (await p.locator('[data-eqx^="reactok"], [data-eqx^="actifok"]').count()) { await L.toucher(c, '[data-eqx^="reactok"], [data-eqx^="actifok"]'); await L.calme(p, 400); }
    await ferme(); await E.fiche(c, 'sm'); g = await boutons(p);
    v('G réactivée : les deux gestes reviennent', gs.every(x => g.includes(x)), g);
  });

  const errs = (c.err || []).filter(x => !/favicon|manifest/i.test(String(x)));
  v('aucune erreur de page', errs.length === 0, errs.slice(0, 3)); await E.fin();
})().catch(async e => { console.log('ÉCHEC DE LA SONDE :', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
