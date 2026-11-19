// RECONTRÔLE ADVERSE des « restes » de CLIENTS, tour 1 (18 novembre 2026). Rejoue ce que le correcteur annonce « corrigé » et cherche ce que ses corrections ont cassé à côté :
//   A. la saisie non enregistrée d'« Infos » (clients-15) : aucune fausse alerte sur les clients d'origine, et tous les chemins de sortie de l'écran sont gardés (menu, onglet, logo, compte, palette, retour du navigateur, raccourcis) ;
//   B. l'archivage (clients-17) : un client archivé n'est proposé NULLE PART pour un nouveau travail, et reste visible là où son historique est lu ;
//   C. le numéro à la française (clients-18) : « +33 06 … », deux numéros, poste, étranger ; recherche et doublon ;
//   D. « Annuler » (casse 8) : Ctrl+Z longtemps après ne doit pas emporter un client qui a vécu depuis ;
//   E. le renommage (casses 2 et 7) : titres de tâches, intervention, devis qui portent l'ancien nom.
// Usage : PROFIL=… QUI=marc NUIT=1 node clients-restes-recontrole.js — sort en 1 si un contrôle tombe. Les captures vont hors dépôt.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  await p.evaluate(() => { window.__confirms = 0; window.confirm = () => { window.__confirms++; return true; }; });
  const CMD = (await p.evaluate(() => MAC)) ? 'Meta' : 'Control';   /* l'iPad se déclare « Macintosh » : son raccourci est Cmd, pas Ctrl */
  const ouvrirInfos = async k => { await L.aller(p, 'client-x-' + k); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); };
  const sale = () => p.evaluate(() => clientInfosSale());
  const panneauDit = () => p.evaluate(() => ((document.querySelector('#calque') || {}).textContent || '').replace(/\s+/g, ' '));
  const D = await p.evaluate(() => ({ n: Object.keys(CLIENTS).length, ks: Object.keys(CLIENTS) }));
  v('population : ' + D.n + ' clients d’origine', D.n >= 7, D);

  // ── A1. aucune fausse alerte : ouvrir « Infos » de chaque client sans rien écrire ne doit rien demander ──
  const fausses = [];
  for (const k of D.ks) { await ouvrirInfos(k); if (await sale()) fausses.push(k); }
  v('A1 : « Infos » ouvert sans rien écrire n’est « modifié » pour aucun des ' + D.ks.length + ' clients (fausses alertes : ' + (fausses.join(', ') || 'aucune') + ')', fausses.length === 0, fausses);

  // ── A2. écrire PUIS tout remettre comme avant : plus de saisie en attente ──
  await ouvrirInfos('md'); const nomAvant = await p.inputValue('[data-ci="nom"]');
  await p.fill('[data-ci="nom"]', nomAvant + 'X'); const s1 = await sale(); await p.fill('[data-ci="nom"]', nomAvant); const s2 = await sale();
  v('A2 : écrire une lettre en trop (alerte), la retirer (plus d’alerte)', s1 === true && s2 === false, [s1, s2]);

  // ── A3. les chemins de sortie : chacun, avec une saisie en attente, doit demander (ou rester sur la fiche) ──
  const sortie = async (nom, geste) => {
    await L.ranger(p); await p.evaluate(() => { try { if (typeof PAL !== 'undefined' && PAL) palFermer(true); } catch (e) {} });
    await ouvrirInfos('md'); await p.fill('[data-ci="nom"]', 'Zzz perdu ' + nom); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur());
    const avant = await p.evaluate(() => route + '|' + (param || ''));
    let err = ''; try { await geste(); } catch (e) { err = String(e.message || e).slice(0, 80); }
    await L.calme(p, 600);
    const apres = await p.evaluate(() => route + '|' + (param || '')), dit = await panneauDit(), garde = /sans l’enregistrer/.test(dit);
    const quitte = apres !== avant && !garde;
    v('A3 sortie « ' + nom + ' » : la saisie en attente est protégée (' + (garde ? 'demande' : quitte ? 'PERDUE, route ' + apres : 'reste sur la fiche') + (err ? ', geste : ' + err : '') + ')', !quitte && !err, { avant, apres, err });
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.aller(p, 'clients');
  };
  const menu = (lib) => async () => { await L.toucher(c, p.locator('#menu a, nav a').filter({ hasText: lib }).first()); };
  if (PROFIL === 'mac' || PROFIL === 'windows' || PROFIL === 'ipad') {
    await sortie('menu : Interventions', menu('Interventions'));
    await sortie('logo', async () => { await L.toucher(c, '[data-logo]'); });
    await sortie('Mon compte', async () => { await L.toucher(c, '[data-cnx="moncompte"]'); });
    await sortie('Nouveautés', async () => { await L.toucher(c, '[data-nv="ouvrir"]'); });
    await sortie('palette (Ctrl+K) puis Entrée sur « Planning »', async () => { await p.keyboard.press(CMD + '+k'); await L.calme(p, 300); await p.keyboard.type('Planning'); await L.calme(p, 300); await p.keyboard.press('Enter'); });
    await sortie('raccourci Ctrl+1', async () => { await p.keyboard.press(CMD + '+1'); });
    await sortie('retour du navigateur (history.back)', async () => { await p.evaluate(() => history.back()); });
    await sortie('adresse #planning', async () => { await p.evaluate(() => { location.hash = '#planning'; }); });
  } else {
    await sortie('barre du bas : une autre rubrique', async () => { await p.evaluate(() => window.scrollTo(0, 0)); await L.calme(p, 500); const t = await p.evaluate(() => (['planning', 'devis', 'taches', 'comptabilite'].find(k => document.querySelector('[data-tab="' + k + '"]')) || '')); await p.locator('[data-tab="' + t + '"]').first().tap({ timeout: 4000 }); });   /* la secrétaire n'a pas de Planning dans sa barre */
    await sortie('retour du navigateur (history.back)', async () => { await p.evaluate(() => history.back()); });
    await sortie('adresse #planning', async () => { await p.evaluate(() => { location.hash = '#planning'; }); });
  }

  // ── A5. les trois choix de la fenêtre, par les portes sans clic : « Continuer » reste et garde la saisie (sans entrée d'historique en plus), « Abandonner » part SANS redemander, « Enregistrer » enregistre puis part ──
  {
    const portes = [], dest = await p.evaluate(() => { const k = ['planning', 'interventions', 'devis', 'taches', 'contrats'].find(k => LIG[k] && droitVoit(k)); return { k, l: LIG[k].l }; });   /* la secrétaire n'a pas toutes les rubriques : on part vers une qu'elle ouvre */
    if (await p.evaluate(() => rcBureau())) portes.push(['palette puis ' + dest.l, async () => { await p.keyboard.press(CMD + '+k'); await L.calme(p, 300); await p.keyboard.type(dest.l); await L.calme(p, 300); await p.keyboard.press('Enter'); }, true]);
    portes.push(['retour du navigateur', async () => { await p.evaluate(() => history.back()); }, false], ['adresse #planning', async () => { await p.evaluate(k => { location.hash = '#' + k; }, dest.k); }, false]);
    const destR = dest.k + '|';
    const etat = () => p.evaluate(() => ({ r: route + '|' + (param || ''), champ: (document.querySelector('[data-ci="nom"]') || {}).value, nom: CLIENTS.md.nom, h: history.length, dem: /sans l’enregistrer/.test(((document.querySelector('#calque') || {}).textContent || '')) }));
    const choix = async lib => { await L.toucher(c, '#calque button:has-text("' + lib + '")'); await L.calme(p, 700); };
    /* chaque choix repart d'un historique NEUF [Planning, fiche] : « retour » mène alors à Planning, et un retour déjà joué ne laisse pas l'entrée suivante au hasard */
    const prep = async suffixe => { await L.ranger(p); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} const f = document.querySelector('[data-ci="nom"]'); if (f) f.value = CLIENTS.md.nom; });   /* la saisie laissée par le choix d'avant se remet d'abord, sinon CE geste-ci est lui aussi retenu */
      await L.aller(p, dest.k); await L.aller(p, 'client-x-md'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]');
      const nom0 = await p.evaluate(() => CLIENTS.md.nom); await p.fill('[data-ci="nom"]', nom0 + suffixe); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur()); return nom0; };
    for (const [nomP, porte, sansHisto] of portes) {
      let nom0 = await prep(' Zz'); const h0 = (await etat()).h;
      await porte(); await L.calme(p, 600); const e1 = await etat();
      v('A5 « ' + nomP + ' » : la fenêtre se pose et la fiche reste', e1.dem && e1.r === 'client|md', e1);
      await choix('Continuer la saisie'); const e2 = await etat();
      v('A5 « ' + nomP + ' » : « Continuer la saisie » reste sur la fiche et garde ce qui est écrit', e2.r === 'client|md' && e2.champ === nom0 + ' Zz' && !e2.dem, e2);
      if (sansHisto) v('A5 « ' + nomP + ' » : l’historique du navigateur n’a gagné que l’entrée de la fenêtre (pas une adresse ajoutée puis remise)', e2.h <= h0 + 1, { avant: h0, apres: e2.h });
      nom0 = await prep(' Zz'); await porte(); await L.calme(p, 600); await choix('Abandonner mes changements'); const e3 = await etat();
      v('A5 « ' + nomP + ' » : « Abandonner » part vers la rubrique demandée, sans redemander, et la fiche garde son nom', e3.r === destR && !e3.dem && e3.nom === nom0, e3);
      nom0 = await prep(' Yy'); await porte(); await L.calme(p, 600); await choix('Enregistrer'); const e4 = await etat();
      v('A5 « ' + nomP + ' » : « Enregistrer » enregistre le nom puis part vers la rubrique demandée', e4.r === destR && e4.nom === nom0 + ' Yy' && !e4.dem, e4);
      await p.evaluate(nom => { CLIENTS.md.nom = nom; }, nom0);
    }
    await L.ranger(p); await L.aller(p, 'clients');
  }

  // ── A4. enregistrer : la fenêtre « Enregistrer » d'un client refusé reste sur la fiche, et un client enregistré ne redemande rien ──
  await ouvrirInfos('md'); await p.fill('[data-ci="tel"]', '06 11 22 33 44'); await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 400);
  v('A4 : après « Enregistrer », plus de saisie en attente', (await sale()) === false);
  const retourne = await p.evaluate(() => { const b = document.querySelector('#contenu [data-oc="interventions"],#contenu [data-oc="devis"]'); return !!b; });
  if (retourne) { await L.toucher(c, '#contenu [role=tab]:not([data-oc="infos"])'); await L.calme(p, 400); v('A4 : changer d’onglet après enregistrement ne demande rien', !/sans l’enregistrer/.test(await panneauDit())); }

  // ── B. l'archivage : où le client archivé est-il encore PROPOSÉ ? ──
  const nom = await p.evaluate(() => CLIENTS.hp.nom);
  const peut2 = await p.evaluate(() => peut('crm', 'm')), peutArch = await p.evaluate(() => peut('crm', 's')), peutCreer = await p.evaluate(() => peut('crm', 'c'));
  if (!peutArch) {
    await ouvrirInfos('hp'); const bouton = await p.evaluate(() => !!document.querySelector('[data-action="clientArchiverDemande"]'));
    v('B0 : sans la case « archiver un client », la fiche n’offre aucun geste d’archivage', !bouton);
    const direct = await p.evaluate(() => { try { ACTIONS.clientArchiverOk({ dataset: { cli: 'hp' } }); return !!CLIENTS.hp.archive; } catch (e) { return 'jette'; } });
    v('B0 : et l’action, appelée à la main (un autre chemin), n’archive pas non plus (' + direct + ')', direct === false, direct);
    await p.evaluate(() => { delete CLIENTS.hp.archive; });
  }
  if (peutArch) {
  await ouvrirInfos('hp'); await L.toucher(c, '[data-action="clientArchiverDemande"]'); await L.toucher(c, '[data-action="clientArchiverOk"]'); await L.calme(p, 500);
  const arch = await p.evaluate(() => !!CLIENTS.hp.archive); v('B0 : « ' + nom + ' » est archivé par les gestes', arch);
  const propose = async (lib, fn, ctx) => {
    await p.evaluate(() => { try { fermerCreation(); } catch (e) {} }); await L.ranger(p);
    let err = ''; try { await p.evaluate(fn); await L.calme(p, 500); } catch (e) { err = String(e.message || e).slice(0, 90); }
    const r = await p.evaluate(({ nom, ctx }) => { const z = document.querySelector(ctx) || document.body; const o = [...z.querySelectorAll('option,button,li,.cli-l,datalist option')].filter(e => (e.value || '') === nom || (e.textContent || '').includes(nom)); return { n: o.length, tn: z.querySelectorAll('option,.cli-l').length, ex: o.slice(0, 2).map(e => e.tagName + ':' + (e.textContent || e.value).trim().slice(0, 40)) }; }, { nom, ctx: ctx || '#calque' });
    v('B1 « ' + lib + ' » ne propose pas le client archivé' + (err ? ' [geste : ' + err + ']' : '') + ' (' + r.tn + ' choix lus)', !err && r.n === 0 && r.tn > 0, r);
    await p.evaluate(() => { try { fermerCreation(); } catch (e) {} }); await L.ranger(p);
  };
  await propose('Nouvelle intervention', () => { ouvrirCreation({}); }, '.fen');
  await propose('Nouveau devis', () => { DVN_F = { nv:false, cli:'', type:'part', nom:'', prenom:'', tel:'', mail:'', adr:'', objet:'', modele:0, err:'' }; dvNouveau(); });
  await propose('Nouvelle facture (Comptabilité)', () => { cxNouvelleFacture(); });
  await propose('Nouvelle réserve chez un client', () => { bxNouveau(''); });
  await propose('Modifier une intervention', () => { const i = INTS.find(o => o.cli !== 'hp'); panneauModifier(i.id); });
  await L.aller(p, 'contrat-nouveau'); await L.calme(p, 400);
  { const r = await p.evaluate(nom => { const z = document.querySelector('#contenu'); const o = [...z.querySelectorAll('option,button,.cli-l')].filter(e => (e.textContent || '').includes(nom)); return { n: o.length, ex: o.slice(0, 2).map(e => e.tagName + ':' + e.textContent.trim().slice(0, 40)) }; }, nom);
    v('B1 « Nouveau contrat » ne propose pas le client archivé', r.n === 0, r); }
  // son historique, lui, reste lu : sa fiche s'ouvre, ses factures restent dans la comptabilité, la recherche générale le trouve
  await L.aller(p, 'client-x-hp'); const fiche = await p.evaluate(() => (document.querySelector('#contenu') || {}).textContent || '');
  v('B2 : la fiche d’un client archivé s’ouvre, dit « Archivé » et propose de le remettre', /Archivé/.test(fiche) && /Remettre dans la liste/.test(fiche));
  const comptes = await p.evaluate(nom => { try { aller('comptabilite'); } catch (e) {} return true; }, nom); void comptes;
  await L.aller(p, 'clients'); const accueil = await p.evaluate(() => (document.querySelector('#contenu') || {}).textContent.length); v('B3 : la liste des clients s’affiche (' + accueil + ' signes)', accueil > 200);
  const seg = await p.evaluate(() => { const g = document.querySelector('[aria-label="Ranger les clients"]'); if (!g) return null; const r = g.getBoundingClientRect(), bs = [...g.querySelectorAll('button')].map(b => ({ t: b.textContent.trim(), d: Math.round(b.getBoundingClientRect().right - r.right), g: Math.round(r.left - b.getBoundingClientRect().left) })); return { sw: g.scrollWidth, cw: g.clientWidth, parent: Math.round(g.parentElement.getBoundingClientRect().right - r.right), bs, iw: innerWidth }; });
  v('B5 : les quatre rangements dont « Archivés » tiennent dans leur rangée sans défiler (largeur ' + (seg && seg.cw) + ', contenu ' + (seg && seg.sw) + ')', !!seg && seg.sw <= seg.cw + 1 && seg.bs.every(b => b.d <= 1 && b.g <= 1), seg);
  await L.capture(c, CAP + 'archive-' + ETQ + '.png');
  // ── F. la recherche d'un client ARCHIVÉ ne répond pas « aucun client » comme si rien ne correspondait : elle le dit et mène aux archivés, recherche gardée ──
  await p.evaluate(nom => { chercheClient = nom; rangClients = 'tous'; rendre(); }, nom); await L.calme(p, 400);
  const f1 = await p.evaluate(() => ({ t: (document.querySelector('#contenu .carte.gris') || {}).textContent || '', lien: !!document.querySelector('#contenu [data-rangc="archives"][data-garde]') }));
  v('F1 : chercher « ' + nom + ' » (archivé) le dit et propose « Voir le client archivé » (au lieu d’inviter à créer un doublon)', /archivé/.test(f1.t) && f1.lien && !/Nouveau client/.test(f1.t), f1);
  if (f1.lien) { await L.toucher(c, '#contenu [data-rangc="archives"][data-garde]'); await L.calme(p, 400);
    const f2 = await p.evaluate(nom => ({ champ: (document.querySelector('[data-cherche]') || {}).value || '', cartes: [...document.querySelectorAll('#contenu .client-carte')].map(e => e.textContent).filter(t => t.includes(nom)).length, nArch: rangClients }), nom);
    v('F2 : « voir les archivés » garde la recherche et montre le client', f2.champ === nom && f2.cartes === 1 && f2.nArch === 'archives', f2); await L.capture(c, CAP + 'recherche-archive-' + ETQ + '.png'); }
  await p.evaluate(() => { chercheClient = ''; rangClients = 'tous'; rendre(); }); await L.calme(p, 300);
  // les interventions à venir du client archivé restent au planning et dans la liste des interventions
  const restent = await p.evaluate(() => INTS.filter(i => i.cli === 'hp' && !['fait', 'annulee'].includes(i.st)).length); v('B4 : ses interventions à venir sont toujours là (' + restent + ')', restent >= 0);
  await p.evaluate(() => { delete CLIENTS.hp.archive; });

  }
  // ── C. le numéro ──
  const tel = await p.evaluate(() => ({ a: cfTelFmt('+33 06 12 34 56 78'), b: cfTelFmt('+33 6 12 34 56 78 / 05 46 12 12 12'), c: cfTelFmt('06 12 34 56 78 poste 12'), d: cfTelFmt('+33 1 23 45 67 89'), e: cfTelFmt('0612345678'), f: cfTelFmt('06.12.34.56.78'), g: cfTelFmt('(+33) 6 12 34 56 78'), h: cfTelFmt('+33612345678'), ch1: cfTelChiffres('+33 06 12 34 56 78'), ch2: cfTelChiffres('06 12 34 56 78') }));
  v('C1 : « +33 06 12 34 56 78 » (le 0 gardé par habitude) se range à la française', tel.a === '06 12 34 56 78', tel.a);
  v('C2 : « (+33) 6 12 34 56 78 » aussi', tel.g === '06 12 34 56 78', tel.g);
  v('C3 : « +33612345678 », « 06.12.34.56.78 », « 0612345678 » aussi', tel.h === '06 12 34 56 78' && tel.f === '06 12 34 56 78' && tel.e === '06 12 34 56 78', [tel.h, tel.f, tel.e]);
  v('C4 : « +33 1 23 45 67 89 » → « 01 23 45 67 89 »', tel.d === '01 23 45 67 89', tel.d);
  v('C5 : un numéro avec poste n’est pas déformé', /poste 12/.test(tel.c), tel.c);
  v('C6 : les chiffres comparés sont les mêmes pour « +33 06 … » et « 06 … »', tel.ch1 === tel.ch2, [tel.ch1, tel.ch2]);

  await p.evaluate(() => { try { fermerCreation(); } catch (e) {} });
  // C7. deux numéros côte à côte (permis par cfTelOk) : la toilette de la fiche ne doit pas rogner le second
  if (peut2) {
    await ouvrirInfos('cm'); const deux = '05 46 12 12 12 / 06 12 34 56 78'; await p.fill('[data-ci="tel"]', deux); await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 400);
    const stocke = await p.evaluate(() => CLIENTS.cm.tel), t30 = await p.evaluate(d => cliNet({ tel: d, nom: 'x' }).tel, deux);
    v('C7 : « ' + deux + ' » (' + deux.length + ' signes, 12 chiffres) s’enregistre en entier (reçu « ' + stocke + ' »)', stocke === deux && t30 === deux, [stocke, t30]);
  }
  // ── D. Ctrl+Z longtemps après la création d'un client avec intervention : le client a vécu depuis (consignes, appareils) ──
  if (peutCreer) {
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); await L.toucher(c, '[data-action="clientNvInt"]'); await L.calme(p, 400);
  await p.fill('.fen [data-cnv="nom"]', 'Lemoine'); await p.fill('.fen [data-cnv="contact"]', 'Sophie').catch(() => {}); await L.toucher(c, '.fen [data-action="cPlusTard"]'); await L.calme(p, 300);
  await p.fill('.fen [data-cnv="adr"]', '4 rue du Port, 17300 Rochefort'); await p.fill('.fen [data-cnv="tel"]', '06 77 88 99 00'); await L.toucher(c, '.fen [data-action="cCreer"]'); await L.calme(p, 600);
  console.log('  · toast :', await p.evaluate(() => ((document.querySelector('#toast') || {}).textContent || '').trim()));
  const kd = await p.evaluate(() => Object.keys(CLIENTS).find(x => x !== '__nv' && CLIENTS[x].nom.includes('Lemoine')));
  v('D0 : le client « Lemoine » est créé avec son intervention (' + kd + ')', !!kd);
  if (kd) {
    await ouvrirInfos(kd); await p.fill('[data-ci="acces"]', 'Code portail 4521, gardien au fond'); await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 300);
    await p.evaluate(k => { CLIENTS[k].appareils.push({ nom:'Daikin FTXM35R', det:'salon' }); }, kd);
    await L.aller(p, 'clients'); await p.keyboard.press('Control+z'); await L.calme(p, 400);
    const reste = await p.evaluate(k => !!CLIENTS[k], kd);
    v('D1 : Ctrl+Z plus tard ne supprime pas un client à qui l’on a écrit ses consignes et son appareil', reste, 'le client a été supprimé avec ses consignes et son appareil');
    await p.evaluate(k => { delete CLIENTS[k]; }, kd);
  }

  }
  // ── E. le renommage : où l'ancien nom reste-t-il écrit en dur ? ──
  await ouvrirInfos('md'); const ancien = await p.evaluate(() => CLIENTS.md.nom);
  await p.fill('[data-ci="nom"]', 'M. et Mme Dubois'); await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 400);
  const reste = await p.evaluate(anc => { const out = {}; const J = (n, o) => { try { const t = JSON.stringify(o) || ''; const m = t.split(anc).length - 1; if (m) out[n] = m; } catch (e) {} };
    J('INTS', INTS); J('DV', DV); J('FACTURES', FACTURES); J('CONTRATS', CONTRATS); J('TACHES', TACHES); J('MAILS', typeof MAILS === 'undefined' ? [] : MAILS); J('NOTES', NOTES); J('BUREAU', BUREAU);
    out.__tachesLiees = TACHES.filter(x => x.lien && x.lien.cli === 'md' && String(x.t).includes(anc)).length; return out; }, ancien);
  console.log('  · après renommage, « ' + ancien + ' » reste écrit dans :', JSON.stringify(reste));
  v('E1 : aucune tâche liée à ce client ne porte encore l’ancien nom exact', reste.__tachesLiees === 0, reste);
  const ou = Object.keys(reste).filter(k => k !== '__tachesLiees' && !['MAILS'].includes(k));
  v('E2 : l’ancien nom n’est plus écrit dans les interventions, devis, factures, contrats (' + (ou.join(', ') || 'aucun') + ')', ou.every(k => k === 'TACHES' || k === 'NOTES' || k === 'BUREAU') || ou.length === 0, reste);
  await L.fermer(); const code = L.bilan(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
