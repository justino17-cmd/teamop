// RECONTRÔLE ADVERSE des « restes » de CLIENTS, tour 2 (18 novembre 2026). Ne rejoue pas ce que la sonde du correcteur rejoue déjà (clients-restes-recontrole.js) : cherche ce que ses corrections ont CASSÉ À CÔTÉ.
//   H. l'historique du navigateur après « Abandonner » : la garde d'adresse remplace l'entrée où l'on est revenu — que devient le « retour » suivant ?
//   S. TOUTES les sorties de la fiche, énumérées dans le DOM (jamais d'une liste écrite à la main) : aucune ne perd la saisie d'« Infos » sans demander
//   V. « Devis IA » (dictée) : un client archivé est-il reconnu et reçoit-il un devis ?
//   U. Ctrl+Z : un client créé avec une intervention, simplement REGARDÉ (fiche, liste, onglets), part-il bien avec elle ? (une lecture qui écrit rendrait la signature fausse)
//   R. la recherche : un client archivé ET un actif qui correspondent ; la vue « Archivés » avec une recherche qui ne correspond qu'à un client actif
//   T. le numéro : cas limites de « +33 », le doublon, la recherche partielle, aucune fausse correspondance
//   W. la rangée « Archivés » : tient dans sa colonne à TOUTES les largeurs du profil (la règle ne vaut que sous 760 px)
// Usage : PROFIL=… QUI=marc NUIT=1 node clients-restes2-adverse.js — sort en 1 si un contrôle tombe. Captures hors dépôt.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, SEUL = process.env.SEUL || '';
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients2-adverse/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
const veut = k => !SEUL || SEUL.split(',').includes(k);
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  await p.evaluate(() => { window.__confirms = 0; window.confirm = () => { window.__confirms++; return true; }; window.open = () => null; });
  const ouvrirInfos = async k => { await L.aller(p, 'client-x-' + k); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); };
  const salir = async (suffixe) => { const n0 = await p.inputValue('[data-ci="nom"]'); await p.fill('[data-ci="nom"]', n0 + suffixe); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur()); return n0; };
  const etat = () => p.evaluate(() => ({ r: route + '|' + (param || ''), dem: /sans l’enregistrer/.test(((document.querySelector('#calque') || {}).textContent || '').replace(/\s+/g, ' ')), sale: clientInfosSale(), h: location.hash }));
  const choix = async lib => { await L.toucher(c, p.locator('#calque button').filter({ hasText: lib }).first()); await L.calme(p, 700); };
  const D = await p.evaluate(() => ({ n: Object.keys(CLIENTS).length, ks: Object.keys(CLIENTS), peutArch: peut('crm', 's'), peutMod: peut('crm', 'm') }));
  v('population : ' + D.n + ' clients d’origine, droits archiver ' + D.peutArch + ' modifier ' + D.peutMod, D.n >= 7, D);
  const PHONE = PROFIL === 'iphone' || PROFIL === 'android' || PROFIL === 'petit';

  // ── H. l'historique après « Abandonner » par le retour du navigateur ──
  if (veut('H')) {
    const RB = 'devis';   /* une rubrique que le gérant ET le secrétariat ouvrent */
    const hist = async () => p.evaluate(() => ({ r: route + '|' + (param || ''), n: history.length }));
    // référence : la même chaîne SANS saisie en attente
    await p.evaluate(() => { aller('accueil'); }); await L.calme(p, 500); await p.evaluate(x => { aller(x); }, RB); await L.calme(p, 500); await p.evaluate(() => { aller('client-x-md'); }); await L.calme(p, 500);
    await p.evaluate(() => history.back()); await L.calme(p, 700); const ref1 = await hist(); await p.evaluate(() => history.back()); await L.calme(p, 700); const ref2 = await hist();
    console.log('  · référence sans saisie : retour 1 (' + RB + ') →', ref1.r, ', retour 2 →', ref2.r);
    // avec une saisie : retour, « Abandonner », puis retour encore
    await p.evaluate(() => { aller('accueil'); }); await L.calme(p, 500); await p.evaluate(x => { aller(x); }, RB); await L.calme(p, 500);
    await ouvrirInfos('md'); await salir(' Zz');
    await p.evaluate(() => history.back()); await L.calme(p, 700); const e1 = await etat();
    v('H1 : le retour du navigateur avec une saisie pose la fenêtre et reste sur la fiche', e1.dem && e1.r === 'client|md', e1);
    await choix('Abandonner mes changements'); const e2 = await etat();
    v('H2 : « Abandonner » mène à la rubrique d’où l’on venait (' + RB + ') (' + e2.r + ')', e2.r.startsWith(RB), e2);
    await p.evaluate(() => history.back()); await L.calme(p, 700); const e3 = await etat();
    v('H3 : le retour SUIVANT du navigateur ne ramène pas sur la fiche abandonnée (route lue : ' + e3.r + ' · sans saisie, la référence donne ' + ref2.r + ')', !e3.r.startsWith('client'), { e3, ref1, ref2 });
    // H4 (tour 3) : « Continuer la saisie » après le retour du navigateur : on reste sur la fiche, l'adresse DIT la fiche, et le retour suivant retrouve la rubrique d'où l'on venait (en redemandant)
    await p.evaluate(() => { aller('accueil'); }); await L.calme(p, 500); await p.evaluate(x => { aller(x); }, RB); await L.calme(p, 500);
    await ouvrirInfos('md'); await salir(' Yy');
    await p.evaluate(() => history.back()); await L.calme(p, 700); await choix('Continuer la saisie'); const f1 = await etat();
    v('H4 : « Continuer la saisie » garde la fiche, sa saisie et une adresse qui dit la fiche (route ' + f1.r + ', adresse ' + f1.h + ')', f1.r === 'client|md' && !f1.dem && f1.sale && f1.h === '#client-x-md', f1);
    await p.evaluate(() => history.back()); await L.calme(p, 700); const f2 = await etat();
    v('H4b : le retour suivant retrouve ' + RB + ' et redemande, sans quitter la fiche tout seul (route ' + f2.r + ')', f2.dem && f2.r === 'client|md', f2);
    await choix('Abandonner mes changements'); const f3 = await etat();
    v('H4c : « Abandonner » mène à ' + RB + ' (route ' + f3.r + ')', f3.r.startsWith(RB), f3);
    await L.ranger(p);
  }

  // ── V. « Devis IA » : un client archivé est-il reconnu à la dictée ? ──
  if (veut('V')) {
    const nomHp = await p.evaluate(() => CLIENTS.hp.nom), mot = (nomHp.split(/\s+/).find(m => { const n = m.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(); return n.length > 3 && !['madame', 'monsieur', 'restaurant', 'cabinet', 'camping', 'hotel', 'copropriete', 'dentaire'].includes(n); }) || nomHp);   /* le mot que dvdPreparer retient : sans accent, hors des mots communs */
    await p.evaluate(() => { CLIENTS.hp.archive = true; });
    const r = await p.evaluate(mot => { const n0 = DV.length; try { DVD = null; dvDicter(); document.getElementById('dvd-t').value = 'Devis pour ' + mot + ', remplacement de la pompe, une heure de main-d’œuvre et le déplacement.'; dvdPreparer(); } catch (e) { return { err: String(e.message).slice(0, 80) }; }
      const nv = DV.slice(n0); return { n0, cree: nv.length, cli: nv.map(d => d.cli), toast: ((document.querySelector('#toast') || {}).textContent || '').trim().slice(0, 100) }; }, mot);
    v('V1 : dicter un devis pour « ' + mot + ' » (client ARCHIVÉ) ne lui prépare pas de devis (créés : ' + r.cree + ' pour ' + (r.cli || []).join(',') + ')', !r.err && !(r.cree > 0 && r.cli.includes('hp')), r);
    await p.evaluate(n0 => { delete CLIENTS.hp.archive; try { DV.splice(n0); } catch (e) {} try { fermerPanneau(); } catch (e) {} }, r.n0 === undefined ? 1e9 : r.n0); await L.ranger(p); await L.aller(p, 'clients');   /* le devis préparé pour l'archivé (s'il y en a un) est retiré : la sonde ne laisse rien derrière elle */
  }

  // ── U. Ctrl+Z après la création d'un client avec une intervention : le client simplement REGARDÉ part avec elle ──
  if (veut('U') && (await p.evaluate(() => peut('crm', 'c')))) {
    await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientNvInt"]'); await L.calme(p, 400);
    await p.fill('.fen [data-cnv="nom"]', 'Marchand'); await p.fill('.fen [data-cnv="contact"]', 'Paul').catch(() => {}); await L.toucher(c, '.fen [data-action="cPlusTard"]'); await L.calme(p, 300);
    await p.fill('.fen [data-cnv="adr"]', '9 quai Neuf, 17000 La Rochelle'); await p.fill('.fen [data-cnv="tel"]', '+33 06 55 66 77 88'); await L.toucher(c, '.fen [data-action="cCreer"]'); await L.calme(p, 600);
    const kn = await p.evaluate(() => Object.keys(CLIENTS).find(x => x !== '__nv' && CLIENTS[x].nom.includes('Marchand')));
    v('U0 : le client « Marchand » est créé avec son intervention (' + kn + ')', !!kn);
    if (kn) {
      const sig0 = await p.evaluate(k => JSON.stringify(CLIENTS[k]), kn);
      // on le REGARDE : la liste, la fiche, chaque onglet — une lecture ne doit rien écrire dans la fiche
      await L.aller(p, 'clients'); await L.aller(p, 'client-x-' + kn);
      for (const o of ['infos', 'interventions', 'devis', 'factures', 'appareils', 'histo']) { await L.toucher(c, '#contenu [role=tab][data-oc="' + o + '"]'); }
      await L.aller(p, 'comptabilite'); await L.aller(p, 'planning'); await L.aller(p, 'clients');
      const sig1 = await p.evaluate(k => JSON.stringify(CLIENTS[k]), kn);
      v('U1 : regarder la liste, la fiche et ses onglets n’écrit rien dans la fiche du client' + (sig0 === sig1 ? '' : ' (avant ' + sig0.slice(0, 160) + ' · après ' + sig1.slice(0, 160) + ')'), sig0 === sig1, [sig0, sig1]);
      await p.keyboard.press('Control+z'); await L.calme(p, 500);
      const reste = await p.evaluate(k => ({ cli: !!CLIENTS[k], ints: INTS.filter(i => i.cli === k).length, toast: ((document.querySelector('#toast') || {}).textContent || '').trim().slice(0, 120) }), kn);
      v('U2 : Ctrl+Z part avec l’intervention ET le client que personne n’a touché (client ' + reste.cli + ', interventions ' + reste.ints + ' · « ' + reste.toast + ' »)', !reste.cli && reste.ints === 0, reste);
      await p.evaluate(k => { delete CLIENTS[k]; }, kn);
    }
  }

  // ── R. la recherche, deux cas que le correctif ne dit pas ──
  if (veut('R')) {
    await p.evaluate(() => { CLIENTS.__ra = { nom: 'Rochefort Archive Test', type: 'part', contact: 'R. Archive', tel: '06 10 20 30 40', mail: 'ra@test.fr', adr: '1 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [], archive: true }; CLIENTS.__rv = { nom: 'Rochefort Vivant Test', type: 'part', contact: 'R. Vivant', tel: '06 10 20 30 41', mail: 'rv@test.fr', adr: '2 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [] }; chercheClient = 'Rochefort'; rangClients = 'tous'; rendre(); });
    await L.calme(p, 400);
    const r1 = await p.evaluate(() => ({ cartes: [...document.querySelectorAll('#contenu .client-carte')].map(e => e.textContent.trim().slice(0, 30)), note: [...document.querySelectorAll('#contenu .carte.gris')].map(e => e.textContent.trim().slice(0, 90)), lien: !!document.querySelector('#contenu [data-rangc="archives"][data-garde]') }));
    const archiveDit = r1.lien || r1.note.some(t => /archiv/i.test(t)) || (r1.cartes.some(t => /archiv/i.test(t)));
    v('R1 : « Rochefort » correspond à un client actif ET à un client archivé : la liste ne cache pas l’archivé sans un mot (indice « archivé » : ' + archiveDit + ' · cartes : ' + r1.cartes.length + ')', archiveDit, r1);
    await p.evaluate(() => { chercheClient = 'Vivant'; rangClients = 'archives'; rendre(); }); await L.calme(p, 400);
    const r2 = await p.evaluate(() => ({ note: [...document.querySelectorAll('#contenu .carte.gris')].map(e => e.textContent.trim().replace(/\s+/g, ' ').slice(0, 160)), cartes: document.querySelectorAll('#contenu .client-carte').length, lien: !!document.querySelector('#contenu [data-rangc="tous"]') }));
    const mene = r2.note.some(t => /(Tous|actif|liste)/i.test(t) && !/Nouveau client/.test(t)) || r2.note.every(t => !/Nouveau client/.test(t));
    v('R2 : dans « Archivés », une recherche qui ne correspond qu’à un client ACTIF ne propose pas de créer un doublon (' + r2.note.join(' | ') + ')', mene, r2);
    await L.capture(c, CAP + 'recherche-archivés-vide-' + ETQ + '.png');
    await p.evaluate(() => { delete CLIENTS.__ra; delete CLIENTS.__rv; chercheClient = ''; rangClients = 'tous'; rendre(); }); await L.calme(p, 300);
  }

  // ── T. le numéro : cas limites, doublon, recherche, aucune fausse correspondance ──
  if (veut('T')) {
    const t = await p.evaluate(() => {
      const F = x => cfTelFmt(x), C = x => cfTelChiffres(x), P = x => cfTelChiffres(x, true);
      return { f: ['+33 06 12 34 56 78', '+33 (0)6 12 34 56 78', '0033 06 12 34 56 78', '+33 06.12.34.56.78', '+33 6 12 34 56 7', '33 06 12 34 56 78', '+32 475 12 34 56', '+41 33 123 45 67', '+44 7700 900123', '+33 0 6 12 34 56 78', '(+33) 06 12 34 56 78', '+33 3 12 34 56 78', '+33 03 12 34 56 78'].map(x => [x, F(x), C(x)]),
        p: ['+33 06 12 34', '+33 6 12 34', '0033 6 12', '(+33) 06 12 34', '33000', '3306 12', '+33', '+33 6', '+44 7700 9', '+41 33 123'].map(x => [x, P(x)]),
        doublon: (() => { CLIENTS.__t = { nom: 'Zorglub Test', tel: '+33 06 12 34 56 78', mail: '', adr: '' }; const a = cfDoublonDe({ nom: 'Autre', tel: '06 12 34 56 78', mail: '', adr: '' }), b = cfDoublonDe({ nom: 'Autre', tel: '+33 6 12 34 56 78', mail: '', adr: '' }), c2 = cfDoublonDe({ nom: 'Autre', tel: '06 12 34 56 79', mail: '', adr: '' }); delete CLIENTS.__t; return [a, b, c2]; })() };
    });
    const m = Object.fromEntries(t.f.map(([x, f, ch]) => [x, [f, ch]]));
    v('T1 : « +33 06 12 34 56 78 », « +33 (0)6… », « 0033 06… », « +33 06.12… », « (+33) 06… », « +33 0 6 12… » se rangent tous en « 06 12 34 56 78 »', ['+33 06 12 34 56 78', '+33 (0)6 12 34 56 78', '0033 06 12 34 56 78', '+33 06.12.34.56.78', '(+33) 06 12 34 56 78', '+33 0 6 12 34 56 78'].every(x => m[x][0] === '06 12 34 56 78'), t.f);
    v('T2 : « +33 03 12 34 56 78 » et « +33 3 12 34 56 78 » se rangent en « 03 12 34 56 78 »', m['+33 3 12 34 56 78'][0] === '03 12 34 56 78' && m['+33 03 12 34 56 78'][0] === '03 12 34 56 78', [m['+33 3 12 34 56 78'], m['+33 03 12 34 56 78']]);
    v('T3 : un numéro trop court, sans « + », ou étranger n’est pas déformé (« +33 6 12 34 56 7 », « 33 06 12 34 56 78 », « +32 475… », « +41 33 123 45 67 », « +44… »)', ['+33 6 12 34 56 7', '33 06 12 34 56 78', '+32 475 12 34 56', '+41 33 123 45 67', '+44 7700 900123'].every(x => m[x][0] === x), ['+33 6 12 34 56 7', '33 06 12 34 56 78', '+32 475 12 34 56', '+41 33 123 45 67', '+44 7700 900123'].map(x => m[x]));
    const pm = Object.fromEntries(t.p);
    v('T4 : la saisie partielle « +33 06 12 34 », « +33 6 12 34 », « (+33) 06 12 34 », « 0033 6 12 » ramène à « 0612… »', pm['+33 06 12 34'] === '061234' && pm['+33 6 12 34'] === '061234' && pm['(+33) 06 12 34'] === '061234' && pm['0033 6 12'] === '0612', t.p);
    v('T5 : « 33000 » (un code postal), « 3306 12 » (sans +) et « +41 33 123 » ne sont pas pris pour un « +33 »', pm['33000'] === '33000' && pm['3306 12'] === '330612' && pm['+41 33 123'] === '4133123', t.p);
    v('T6 : le doublon voit le même numéro écrit de trois façons, et pas le voisin (« 06 12 34 56 79 »)', !!t.doublon[0] && !!t.doublon[1] && !t.doublon[2], t.doublon);
    // la recherche d'un client dont le numéro est écrit « +33 06 … » : par « 0612 », « 06 12 34 », « +33 6 12 »
    await p.evaluate(() => { CLIENTS.__t = { nom: 'Zorglub Test', type: 'part', contact: 'Z', tel: '+33 06 12 34 56 78', mail: '', adr: 'x', acces: '', depuis: '2026', appareils: [] }; });
    const trouve = {}; for (const q of ['0612', '06 12 34', '+33 6 12', '+33 06 12', '(+33) 6 12', '612 34', '0613', '33 06']) { trouve[q] = await p.evaluate(q => { chercheClient = q; rangClients = 'tous'; rendre(); return [...document.querySelectorAll('#contenu .client-carte')].some(e => e.textContent.includes('Zorglub')); }, q); }
    v('T7 : la recherche retrouve « +33 06 12 34 56 78 » par 0612, 06 12 34, +33 6 12, +33 06 12, (+33) 6 12 — et pas par 0613', ['0612', '06 12 34', '+33 6 12', '+33 06 12', '(+33) 6 12'].every(q => trouve[q]) && !trouve['0613'], trouve);
    await p.evaluate(() => { delete CLIENTS.__t; chercheClient = ''; rendre(); }); await L.calme(p, 300);
  }

  // ── W. la rangée « Archivés » tient dans sa colonne, à la largeur du profil ──
  if (veut('W')) {
    await p.evaluate(() => { CLIENTS.hp.archive = true; chercheClient = ''; rangClients = 'tous'; }); await L.aller(p, 'clients'); await L.calme(p, 400);
    const seg = await p.evaluate(() => { const g = document.querySelector('[aria-label="Ranger les clients"]'); if (!g) return null; const r = g.getBoundingClientRect(), col = g.parentElement.getBoundingClientRect(), bs = [...g.querySelectorAll('button')].map(b => { const q = b.getBoundingClientRect(); return { t: b.textContent.trim(), g: Math.round(q.left - col.left), d: Math.round(q.right - col.right), h: Math.round(q.height) }; });
      return { iw: innerWidth, sw: g.scrollWidth, cw: g.clientWidth, w: Math.round(r.width), col: Math.round(col.width), bs, page: document.documentElement.scrollWidth }; });
    v('W1 : les quatre rangements tiennent dans leur colonne (rangée ' + (seg && seg.w) + ' px dans ' + (seg && seg.col) + ', page ' + (seg && seg.page) + ' pour une fenêtre de ' + (seg && seg.iw) + ')', !!seg && seg.bs.length === 4 && seg.sw <= seg.cw + 1 && seg.bs.every(b => b.g >= -1 && b.d <= 1) && seg.page <= c.largeur + 1, seg);
    v('W2 : chaque bouton du rangement fait au moins 36 px de haut (cible tactile)', !!seg && seg.bs.every(b => b.h >= 36), seg && seg.bs.map(b => b.h));
    await L.capture(c, CAP + 'rangee-' + ETQ + '.png');
    await p.evaluate(() => { delete CLIENTS.hp.archive; rendre(); });
  }
  /* S en DERNIER : « Se déconnecter » (S2) ferme la séance, rien ne se joue après */
  // ── S. toutes les sorties de la fiche, énumérées dans le DOM, avec une saisie non enregistrée ──
  if (veut('S')) {
    const SEL = 'button, a, [data-action], [data-go], [data-oc], [data-tab], [role=tab], [data-nv], [data-logo], [data-cnx], [data-menu], [data-retour], [data-rl], [data-voir], [onclick]';
    const lister = () => p.evaluate(SEL => {
      const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
      return [...document.querySelectorAll(SEL)].filter(e => vis(e) && !e.closest('#calque') && !(e.getAttribute('href') && !/^#/.test(e.getAttribute('href'))))
        .map((e, i) => ({ i, sig: e.tagName + '|' + (e.dataset.action || e.dataset.go || e.dataset.oc || e.dataset.tab || e.dataset.nv || e.dataset.cnx || e.getAttribute('href') || e.className.toString().slice(0, 20)) + '|' + (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 28) }));
    }, SEL);
    await ouvrirInfos('md'); await salir(' Zz'); const liste = await lister(); await L.ranger(p);
    const vus = new Set(), uniques = liste.filter(o => !vus.has(o.sig) && vus.add(o.sig));
    v('S0 : population des sorties possibles depuis la fiche (' + uniques.length + ' sur ' + liste.length + ' éléments cliquables)', uniques.length >= 20, uniques.length);
    const fuites = [], dedans = ['clientEnreg', 'clientArchiverDemande', 'clientRestaurer'];
    for (const o of uniques.slice(0, +(process.env.MAXS || 120))) {
      if (/\|sortir\|/.test(o.sig)) continue;   /* « Se déconnecter » ferme la séance : jouée à part, en dernier (S2) */
      if (process.env.BAVARD) console.log('  · sortie ' + o.i + ' : ' + o.sig);
      /* la remise à zéro passe SANS la garde (CLI_LIBRE) : la sortie précédente a pu laisser la fiche salie ou en emmener une autre */
      await L.ranger(p);   /* d'abord : Échap peut ramener en arrière */
      await p.evaluate(() => { CLI_LIBRE = true; try { fermerPanneau(); CLI_RETENU = null; } catch (e) {} }); await L.aller(p, 'client-x-md'); await L.aller(p, 'client-x-md'); await p.evaluate(() => { CLI_LIBRE = false; });
      await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); if (!(await p.$('[data-ci="nom"]'))) { fuites.push(o.sig + ' → la fiche ne se rouvre pas ensuite (' + JSON.stringify(await p.evaluate(() => ({ r: route, p: param, o: ongletClient, h: location.hash, pan: ((document.querySelector('#calque') || {}).textContent || '').trim().replace(/\s+/g, ' ').slice(0, 70), tabs: document.querySelectorAll('#contenu [role=tab]').length }))) + ')'); continue; }
      const nom0 = await salir(' Zz'); const l2 = await lister(); const cible = l2.find(x => x.sig === o.sig); if (!cible) continue;
      const avant = await etat(); let err = '';
      try { await p.evaluate(({ SEL, sig }) => { const vis = e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
        const e = [...document.querySelectorAll(SEL)].filter(e => vis(e) && !e.closest('#calque') && !(e.getAttribute('href') && !/^#/.test(e.getAttribute('href')))).find(e => (e.tagName + '|' + (e.dataset.action || e.dataset.go || e.dataset.oc || e.dataset.tab || e.dataset.nv || e.dataset.cnx || e.getAttribute('href') || e.className.toString().slice(0, 20)) + '|' + (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 28)) === sig); if (e) e.click(); }, { SEL, sig: o.sig }); } catch (e) { err = String(e.message || e).slice(0, 60); }
      await L.calme(p, 450); const apres = await etat();
      const parti = apres.r !== avant.r, saisiePerdue = parti && !apres.dem && !apres.r.startsWith('client|md');
      if (saisiePerdue) fuites.push(o.sig + ' → ' + apres.r);
      // la saisie a-t-elle survécu à un geste qui ne quitte pas ? (une fenêtre qui s'ouvre ne doit pas la vider)
      if (!parti && !apres.dem && !dedans.some(d => o.sig.includes(d))) { const nom1 = await p.evaluate(() => (document.querySelector('[data-ci="nom"]') || {}).value); if (nom1 !== undefined && nom1 !== null && !/Zz/.test(nom1) && apres.r === 'client|md' && !(await p.evaluate(() => !!document.querySelector('#calque')))) fuites.push(o.sig + ' → la saisie a disparu sans quitter la fiche'); }
      await p.evaluate(nom => { CLIENTS.md.nom = nom; }, nom0.replace(/ Zz$/, ''));
    }
    v('S1 : aucune des ' + uniques.length + ' sorties ne perd la saisie sans demander (fuites : ' + (fuites.join(' ; ') || 'aucune') + ')', fuites.length === 0, fuites);
    // S2. « Se déconnecter » avec une saisie en attente : on RELÈVE ce qui se passe (constat, pas verdict : fermer la séance est un geste voulu)
    if (uniques.some(o => /\|sortir\|/.test(o.sig))) {
      await p.evaluate(() => { CLI_LIBRE = true; try { fermerPanneau(); CLI_RETENU = null; } catch (e) {} }); await L.aller(p, 'client-x-md'); await p.evaluate(() => { CLI_LIBRE = false; }); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); await salir(' Zz');
      await L.toucher(c, '[data-cnx="sortir"]'); await L.calme(p, 700);
      console.log('  · S2 (constat) « Se déconnecter » avec une saisie en attente :', JSON.stringify(await p.evaluate(() => ({ demande: /sans l’enregistrer/.test((document.querySelector('#calque') || {}).textContent || ''), route: route, connecte: !!document.querySelector('[data-cnx="moncompte"]'), texte: (((document.querySelector('#calque') || {}).textContent) || '').trim().replace(/\s+/g, ' ').slice(0, 120) }))));
    }
    await L.ranger(p); await L.aller(p, 'clients');
  }

  await L.fermer(); const code = L.bilan(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
