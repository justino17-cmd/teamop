// RECONTRÔLE ADVERSE des « restes » de CLIENTS, tour 3 (19 novembre 2026). Ne rejoue pas clients-restes2-adverse.js (H1 à H4c, V1, R1, R2 y sont) : cherche ce que les trois corrections du tour 3 ont laissé ou cassé À CÔTÉ.
//   D. le retour du navigateur avec une saisie en attente : DEUX retours d'affilée, Échap, clic à côté, « Enregistrer », retour vers une AUTRE fiche, puis la chaîne d'historique qui suit
//   Q. la recherche : dans « Archivés », un archivé ET un actif correspondent (le sens inverse de R1) ; « Remettre dans la liste » pendant une recherche
//   V. la dictée du Devis IA : un mot d'un client ACTIF qui n'a rien à voir (« support » contient « port ») détourne le devis ; archivé + actif cités ensemble
//   S. « Se déconnecter » avec une saisie en attente dans « Infos » : on joue le VRAI bouton du pied du menu (le doute du tour 2, resté non conclu)
// Usage : PROFIL=… QUI=marc|julie NUIT=1 SEUL=D,Q node clients-restes3-adverse.js — sort en 1 si un contrôle tombe. Captures hors dépôt.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, SEUL = process.env.SEUL || '';
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients3-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '') + '-' + QUI;
const veut = k => !SEUL || SEUL.split(',').includes(k);
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  await p.evaluate(() => { window.confirm = () => true; window.open = () => null; });
  const ouvrirInfos = async k => { await L.aller(p, 'client-x-' + k); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); };
  const salir = async suffixe => { const n0 = await p.inputValue('[data-ci="nom"]'); await p.fill('[data-ci="nom"]', n0 + suffixe); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur()); return n0; };
  const etat = () => p.evaluate(() => ({ r: route + '|' + (param || ''), dem: /sans l’enregistrer/.test(((document.querySelector('#calque') || {}).textContent || '').replace(/\s+/g, ' ')), nPanneaux: document.querySelectorAll('#calque .panneau').length, sale: clientInfosSale(), h: location.hash }));
  const choix = async lib => { await L.toucher(c, p.locator('#calque button').filter({ hasText: lib }).first()); await L.calme(p, 800); };
  const retour = async () => { await p.evaluate(() => history.back()); await L.calme(p, 800); };
  const D0 = await p.evaluate(() => ({ n: Object.keys(CLIENTS).length, cli: !!CLIENTS.md, peutMod: peut('crm', 'm') }));
  v('population : ' + D0.n + ' clients, M. et Mme Durand présent ' + D0.cli + ', droit de modifier ' + D0.peutMod, D0.n >= 7 && D0.cli && D0.peutMod, D0);
  const RB = 'devis';

  // ── D. l'historique ──
  if (veut('D')) {
    // D1 : DEUX retours d'affilée avant tout choix, puis « Continuer la saisie » : une seule fenêtre, la fiche reste, l'adresse dit la fiche
    await p.evaluate(x => { aller('accueil'); }); await L.calme(p, 400); await p.evaluate(x => { aller(x); }, RB); await L.calme(p, 500); await ouvrirInfos('md'); await salir(' Aa');
    await retour(); const d1a = await etat(); await retour(); const d1 = await etat();
    /* le premier retour pose UNE fenêtre ; le second est celui qui FERME la fenêtre (elle a sa propre entrée d'historique) : la fiche reste, la saisie aussi, et l'adresse dit de nouveau la fiche */
    v('D1 : deux retours d’affilée : le premier pose UNE fenêtre (' + d1a.nPanneaux + '), le second la ferme sans quitter la fiche ni perdre la saisie (route ' + d1.r + ', fenêtres ' + d1.nPanneaux + ', saisie ' + d1.sale + ', adresse ' + d1.h + ')', d1a.dem && d1a.nPanneaux === 1 && !d1.dem && d1.nPanneaux === 0 && d1.r === 'client|md' && d1.sale && d1.h === '#client-x-md', { d1a, d1 });
    const d1b = d1;
    v('D1b : après le second retour la fiche est là, la saisie aussi et l’adresse dit la fiche (route ' + d1b.r + ', adresse ' + d1b.h + ', saisie ' + d1b.sale + ')', d1b.r === 'client|md' && !d1b.dem && d1b.sale && d1b.h === '#client-x-md', d1b);
    await retour(); const d1c = await etat();
    v('D1c : le retour suivant redemande, sans quitter la fiche seul (route ' + d1c.r + ', fenêtre ' + d1c.dem + ')', d1c.dem && d1c.r === 'client|md', d1c);
    await choix('Abandonner mes changements'); const d1d = await etat();
    v('D1d : « Abandonner » mène à une rubrique, pas à la fiche (route ' + d1d.r + ')', !d1d.r.startsWith('client'), d1d);
    await L.ranger(p);

    // D2 : Échap à la place du bouton
    await p.evaluate(x => { aller('accueil'); }); await L.calme(p, 400); await p.evaluate(x => { aller(x); }, RB); await L.calme(p, 500); await ouvrirInfos('md'); await salir(' Bb');
    await retour(); const d2 = await etat(); await p.keyboard.press('Escape'); await L.calme(p, 800); const d2b = await etat();
    v('D2 : Échap sur la fenêtre pose la même issue que « Continuer » (route ' + d2b.r + ', adresse ' + d2b.h + ', fenêtre ' + d2b.dem + ', saisie ' + d2b.sale + ')', d2.dem && d2b.r === 'client|md' && !d2b.dem && d2b.sale && d2b.h === '#client-x-md', { d2, d2b });
    await retour(); const d2c = await etat();
    v('D2b : le retour suivant redemande (' + d2c.r + ', fenêtre ' + d2c.dem + ')', d2c.dem && d2c.r === 'client|md', d2c);
    await choix('Abandonner mes changements'); await L.ranger(p);

    // D3 : clic à côté de la fenêtre (le voile)
    await p.evaluate(x => { aller('accueil'); }); await L.calme(p, 400); await p.evaluate(x => { aller(x); }, RB); await L.calme(p, 500); await ouvrirInfos('md'); await salir(' Cc');
    await retour(); const d3 = await etat();
    const clicVoile = await p.evaluate(() => { const v = document.querySelector('#calque .fen-voile, #calque .voile, #calque'); const r = v.getBoundingClientRect(); return { x: 4, y: 4, tag: v.className }; });
    await p.mouse.click(clicVoile.x, clicVoile.y); await L.calme(p, 800); const d3b = await etat();
    v('D3 : un clic à côté de la fenêtre (' + clicVoile.tag + ') ferme sans perdre la fiche (route ' + d3b.r + ', adresse ' + d3b.h + ', fenêtre ' + d3b.dem + ', saisie ' + d3b.sale + ')', d3.dem && !d3b.dem && d3b.r === 'client|md' && d3b.sale && d3b.h === '#client-x-md', { d3, d3b });
    await L.ranger(p); await etat().then(async e => { if (e.sale) { await p.evaluate(() => { CLI_LIBRE = true; }); } });
    await p.evaluate(() => { CLI_LIBRE = true; try { fermerPanneau(); CLI_RETENU = null; } catch (e) {} }); await L.aller(p, 'accueil'); await p.evaluate(() => { CLI_LIBRE = false; });

    // D4 : « Enregistrer » après le retour : la saisie est gardée ET l'on arrive à la rubrique ; le retour suivant ne ramène pas sur la fiche
    await p.evaluate(x => { aller('accueil'); }); await L.calme(p, 400); await p.evaluate(x => { aller(x); }, RB); await L.calme(p, 500); await ouvrirInfos('md'); const n0 = await salir(' Dd');
    await retour(); await choix('Enregistrer'); const d4 = await etat(); const nom4 = await p.evaluate(() => CLIENTS.md.nom);
    v('D4 : « Enregistrer » après le retour garde la saisie (« ' + nom4 + ' ») et mène à ' + RB + ' (route ' + d4.r + ')', nom4 === n0 + ' Dd' && d4.r.startsWith(RB), { d4, n0, nom4 });
    await retour(); const d4b = await etat();
    v('D4b : le retour suivant ne ramène pas sur la fiche enregistrée (route ' + d4b.r + ')', !d4b.r.startsWith('client'), d4b);
    await p.evaluate(x => { CLIENTS.md.nom = x; }, n0); await L.ranger(p);

    // D5 : le retour du navigateur tombe sur la fiche d'UN AUTRE client (client A sale → retour → fiche Z) : « Continuer » reste sur A, « Abandonner » va sur Z
    await p.evaluate(() => { aller('accueil'); }); await L.calme(p, 400); await p.evaluate(() => { aller('client-x-mr'); }); await L.calme(p, 500); await ouvrirInfos('md'); await salir(' Ee');
    await retour(); const d5 = await etat();
    v('D5 : le retour vers la fiche d’un AUTRE client pose la fenêtre et garde la fiche de départ (route ' + d5.r + ', fenêtre ' + d5.dem + ')', d5.dem && d5.r === 'client|md', d5);
    await choix('Continuer la saisie'); const d5b = await etat();
    v('D5b : « Continuer » reste sur la fiche de départ, l’adresse dit la fiche de départ (route ' + d5b.r + ', adresse ' + d5b.h + ')', d5b.r === 'client|md' && d5b.h === '#client-x-md' && d5b.sale, d5b);
    await retour(); await choix('Abandonner mes changements'); const d5c = await etat();
    v('D5c : « Abandonner » mène à la fiche de l’autre client (route ' + d5c.r + ')', d5c.r === 'client|mr', d5c);
    await L.ranger(p);

    // D6 : « Enregistrer » REFUSÉ (nom vide) après le retour : on reste sur la fiche avec son message, l'adresse dit la fiche, le retour suivant redemande
    await p.evaluate(x => { aller('accueil'); }); await L.calme(p, 400); await p.evaluate(x => { aller(x); }, RB); await L.calme(p, 500); await ouvrirInfos('md');
    await p.fill('[data-ci="nom"]', ''); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur());
    await retour(); await choix('Enregistrer'); const d6 = await etat(); const nom6 = await p.evaluate(() => CLIENTS.md.nom);
    v('D6 : « Enregistrer » refusé après le retour : la fiche reste, l’adresse la dit, rien n’est écrit (route ' + d6.r + ', adresse ' + d6.h + ', nom en base « ' + nom6 + ' », fenêtre ' + d6.dem + ')', d6.r === 'client|md' && d6.h === '#client-x-md' && !d6.dem && nom6.length > 3, d6);
    await retour(); const d6b = await etat();
    v('D6b : le retour suivant redemande (route ' + d6b.r + ', fenêtre ' + d6b.dem + ')', d6b.dem && d6b.r === 'client|md', d6b);
    await choix('Abandonner mes changements'); await L.ranger(p);
    await L.capture(c, CAP + 'historique-' + ETQ + '.png');
  }

  // ── Q. la recherche ──
  if (veut('Q')) {
    await p.evaluate(() => { CLI_LIBRE = true; try { fermerPanneau(); CLI_RETENU = null; } catch (e) {} }); await L.aller(p, 'clients'); await p.evaluate(() => { CLI_LIBRE = false; });
    await p.evaluate(() => { CLIENTS.__ra = { nom: 'Rochefort Archive Test', type: 'part', contact: 'R. Archive', tel: '06 10 20 30 40', mail: 'ra@test.fr', adr: '1 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [], archive: true }; CLIENTS.__rv = { nom: 'Rochefort Vivant Test', type: 'part', contact: 'R. Vivant', tel: '06 10 20 30 41', mail: 'rv@test.fr', adr: '2 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [] }; chercheClient = 'Rochefort'; rangClients = 'archives'; rendre(); });
    await L.calme(p, 500);
    const q1 = await p.evaluate(() => ({ cartes: [...document.querySelectorAll('#contenu .client-carte')].map(e => e.textContent.trim().slice(0, 28)), texte: (document.querySelector('#contenu').textContent || '').replace(/\s+/g, ' '), lien: !!document.querySelector('#contenu [data-rangc="tous"][data-garde]') }));
    const ditActif = /client de ta liste correspond|clients de ta liste correspondent/.test(q1.texte) || q1.lien;
    v('Q1 : dans « Archivés », « Rochefort » correspond à un archivé ET à un client actif : la liste ne cache pas l’actif sans un mot (indice : ' + ditActif + ' · cartes : ' + q1.cartes.length + ')', ditActif, q1);
    await L.capture(c, CAP + 'archives-aussi-actif-' + ETQ + '.png');
    // Q2 : « Remettre dans la liste » pendant la recherche, dans « Archivés » : la liste se vide, la phrase doit mener à la liste, et le client remis y est
    await p.evaluate(() => { chercheClient = 'Archive Test'; rangClients = 'archives'; rendre(); }); await L.calme(p, 400);
    const peutRest = await p.evaluate(() => peut('crm', 's'));
    if (peutRest) {
      await L.toucher(c, '[data-action="clientRestaurer"][data-cli="__ra"]'); await L.calme(p, 600);
      const q2 = await p.evaluate(() => ({ texte: (document.querySelector('#contenu').textContent || '').replace(/\s+/g, ' ').slice(0, 260), arch: !!CLIENTS.__ra.archive, rang: rangClients, cartes: [...document.querySelectorAll('#contenu .client-carte')].map(e => e.textContent.trim().slice(0, 28)), valeur: (document.querySelector('[data-cherche]') || {}).value }));
      v('Q2 : « Remettre dans la liste » avec une recherche : le client est remis, l’écran bascule sur « Tous les clients » et le montre, la recherche gardée (rang ' + q2.rang + ', cartes ' + q2.cartes.length + ', recherche « ' + q2.valeur + ' »)', !q2.arch && q2.rang === 'tous' && q2.cartes.length === 1 && q2.valeur === 'Archive Test', q2);
      await L.capture(c, CAP + 'remis-dans-la-liste-' + ETQ + '.png');
    } else console.log('  · Q2 non joué : ce rôle n’a pas le droit d’archiver');
    // Q3 : le bouton « Voir le client de ma liste » (recherche « Vivant » dans « Archivés ») : il GARDE la recherche et montre le client actif
    await p.evaluate(() => { chercheClient = 'Vivant'; rangClients = 'archives'; rendre(); }); await L.calme(p, 400);
    const bq3 = await L.toucher(c, '#contenu [data-rangc="tous"][data-garde]'); await L.calme(p, 500);
    const q3 = await p.evaluate(() => ({ cartes: [...document.querySelectorAll('#contenu .client-carte')].map(e => e.textContent.trim().slice(0, 26)), valeur: (document.querySelector('[data-cherche]') || {}).value, rang: rangClients, pressed: [...document.querySelectorAll('#contenu .seg [aria-pressed="true"]')].map(e => e.textContent.trim()) }));
    v('Q3 : « Voir le client de ma liste » garde la recherche et montre le client actif (atteint ' + bq3 + ', cartes ' + q3.cartes.join(' / ') + ', recherche « ' + q3.valeur + ' », rangement enfoncé : ' + q3.pressed.join(',') + ')', bq3 && q3.cartes.length === 1 && /Vivant/.test(q3.cartes[0]) && q3.valeur === 'Vivant' && q3.pressed.length === 1 && q3.pressed[0] === 'Tous les clients', q3);
    // Q4 : le même mot, puis on EFFACE la recherche dans « Archivés » : la liste des archivés revient, sans phrase résiduelle
    await p.evaluate(() => { if (CLIENTS.__ra) CLIENTS.__ra.archive = true; chercheClient = 'Vivant'; rangClients = 'archives'; rendre(); }); await L.calme(p, 300);   /* Q2 a remis __ra dans la liste : on le range de nouveau pour qu'il y ait un archivé à retrouver */
    await p.fill('[data-cherche]', ''); await p.evaluate(() => document.querySelector('[data-cherche]').dispatchEvent(new Event('input', { bubbles: true }))); await L.calme(p, 500);
    const q4 = await p.evaluate(() => ({ texte: (document.querySelector('#contenu').textContent || '').replace(/\s+/g, ' '), cartes: document.querySelectorAll('#contenu .client-carte').length, rang: rangClients }));
    v('Q4 : effacer la recherche dans « Archivés » ramène les archivés, sans phrase de correspondance (cartes ' + q4.cartes + ', rang ' + q4.rang + ')', q4.cartes >= 1 && !/correspond/.test(q4.texte), q4);
    await p.evaluate(() => { delete CLIENTS.__ra; delete CLIENTS.__rv; chercheClient = ''; rangClients = 'tous'; rendre(); }); await L.calme(p, 300);
  }

  // ── V. la dictée ──
  if (veut('V')) {
    const dicter = async texte => p.evaluate(t => { const n0 = DV.length; try { DVD = null; dvDicter(); document.getElementById('dvd-t').value = t; dvdPreparer(); } catch (e) { return { err: String(e.message).slice(0, 80) }; } const nv = DV.slice(n0); const r = { cree: nv.length, cli: nv.map(d => d.cli), toast: ((document.querySelector('#toast') || {}).textContent || '').trim().slice(0, 120) }; DV.splice(n0); try { fermerPanneau(); } catch (e) {} return r; }, texte);
    // V2 : un client ACTIF nommé sans ambiguïté, mais un mot du métier contient le nom d'un autre (« support » contient « port » du Vieux Port)
    const v2 = await dicter('Devis pour Mme Roux, un support mural pour la pompe à chaleur, une heure de main-d’œuvre.');
    v('V2 : « Mme Roux » + « support mural » : le devis va à Mme Roux, pas à Le Vieux Port (clients : ' + (v2.cli || []).join(',') + ')', !v2.err && v2.cree === 1 && v2.cli[0] === 'mr', v2);
    // V3 : on cite l'archivé ET un actif : l'actif gagne (c'est le seul qui puisse recevoir un devis) ; le devis ne va jamais à l'archivé
    await p.evaluate(() => { CLIENTS.hp.archive = true; });
    const v3 = await dicter('Devis pour Mme Roux, à côté de l’hôtel de la Plage, une heure de main-d’œuvre.');
    v('V3 : la dictée cite « Plage » (archivé) et « Mme Roux » (actif) : le devis va à Mme Roux (clients : ' + (v3.cli || []).join(',') + ')', !v3.err && v3.cree === 1 && v3.cli[0] === 'mr', v3);
    // V4 : le message d'un client archivé au NOM LONG ou à caractères spéciaux se lit entier et sans entité
    await p.evaluate(() => { CLIENTS.__ar = { nom: 'Établissements Dupont & Fils « Les Embruns » — Saint-Jean-d’Angély (annexe nord)', type: 'pro', contact: 'X', tel: '', mail: '', adr: '', acces: '', depuis: '2026', appareils: [], archive: true }; });
    const v4 = await dicter('Devis pour Embruns, une heure de main-d’œuvre.');
    v('V4 : le message d’un archivé au nom long garde « & » et les guillemets (« ' + v4.toast.slice(0, 110) + ' »)', !v4.err && v4.cree === 0 && /Dupont & Fils/.test(v4.toast) && !/&amp;|&lt;/.test(v4.toast), v4);
    await p.evaluate(() => { delete CLIENTS.__ar; });
    // V6 : le message propose un geste que CETTE personne peut faire (le secrétariat ne peut pas remettre un client dans la liste : « Remettre dans la liste » n'existe que pour qui a le droit d'archiver)
    const v6 = await dicter('Devis pour la Plage, une heure de main-d’œuvre.'); const peutRest6 = await p.evaluate(() => peut('crm', 's'));
    v('V6 : le message d’un client archivé ne renvoie pas vers un geste impossible (droit de remettre dans la liste : ' + peutRest6 + ' · « ' + v6.toast.slice(0, 110) + ' »)', !v6.err && (peutRest6 || !/restaure-le/.test(v6.toast)), v6);
    await p.evaluate(() => { delete CLIENTS.hp.archive; });
    // V5 : l'archivage depuis l'écran, puis la dictée : même verdict que le drapeau posé à la main
    if (await p.evaluate(() => peut('crm', 's'))) {
      await L.aller(p, 'client-x-hp'); await p.evaluate(() => { try { ACTIONS.clientArchiverOk({ dataset: { cli: 'hp' } }); } catch (e) { window.__e = e.message; } });
      const arch = await p.evaluate(() => !!CLIENTS.hp.archive); const v5 = await dicter('Devis pour la Plage, une heure de main-d’œuvre.');
      v('V5 : après l’archivage par l’action de l’application, la dictée refuse (archivé ' + arch + ', devis créés ' + v5.cree + ', « ' + v5.toast.slice(0, 80) + ' »)', arch && v5.cree === 0 && /archivé/.test(v5.toast), v5);
      await p.evaluate(() => { delete CLIENTS.hp.archive; }); await L.ranger(p);
    }
    await L.capture(c, CAP + 'dictee-' + ETQ + '.png');
  }

  // ── S. « Se déconnecter » avec une saisie en attente ──
  if (veut('S')) {
    await p.evaluate(() => { CLI_LIBRE = true; try { fermerPanneau(); CLI_RETENU = null; } catch (e) {} }); await L.aller(p, 'accueil'); await p.evaluate(() => { CLI_LIBRE = false; });
    await ouvrirInfos('md'); await salir(' Ss');
    /* au téléphone le bouton est dans la feuille « Menu » : on l'ouvre par son bouton (la feuille pose sa propre fenêtre, donc elle ne passe pas pour la fenêtre de la saisie) */
    if (!(await p.evaluate(() => [...document.querySelectorAll('[data-cnx="sortir"]')].some(e => e.offsetParent)))) { await L.toucher(c, '[data-menu="ouvrir"]'); await L.calme(p, 500); }
    const bouton = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-cnx="sortir"]')].filter(e => e.offsetParent); return b.map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), texte: e.textContent.trim().slice(0, 30) }; }); });
    console.log('  · boutons « Se déconnecter » visibles :', JSON.stringify(bouton));
    const ok = bouton.length ? await L.toucher(c, '[data-cnx="sortir"]') : false; await L.calme(p, 800);
    const s = await p.evaluate(() => ({ demande: /sans l’enregistrer/.test(((document.querySelector('#calque') || {}).textContent || '')), connecte: !!SESSION, route, sale: clientInfosSale(), nom: CLIENTS.md.nom }));
    const fenetreVisible = await p.evaluate(() => { const pan = document.querySelector('#calque .panneau'), cn = document.getElementById('cnx'); if (!pan) return false; const r = pan.getBoundingClientRect(), x = Math.round(r.left + r.width / 2), y = Math.round(r.top + r.height / 2), h = document.elementFromPoint(x, y); return !!h && !!pan.contains(h); });
    v('S1 : « Se déconnecter » (vrai bouton, atteint : ' + ok + ' ; au téléphone, c’est le bouton « Menu » qui demande avant d’ouvrir la feuille) avec une saisie en attente dans « Infos » : la personne est PRÉVENUE avant de la perdre, ou la session reste ouverte (session ' + s.connecte + ', fenêtre posée ' + s.demande + ', fenêtre VISIBLE ' + fenetreVisible + ', saisie ' + s.sale + ')', (bouton.length > 0 || s.demande) && (s.connecte || fenetreVisible), { bouton, s, fenetreVisible });
    console.log('  · S (constat) :', JSON.stringify(s));
    await L.capture(c, CAP + 'deconnexion-' + ETQ + '.png');
  }

  const errs = c.err.filter(e => !/favicon/.test(e)); v('aucune erreur de page (' + errs.length + ')', errs.length === 0, errs.slice(0, 3));
  await L.fermer(); const code = L.bilan(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
