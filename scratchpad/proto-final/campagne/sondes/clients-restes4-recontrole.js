// RECONTRÔLE ADVERSE des « restes » de CLIENTS, tour 4 (19 novembre 2026) : ce que les cinq corrections ont pu CASSER à côté.
//   R1. dictée : un nom à trait d'union ou à apostrophe (« Saint-Hubert », « l’Escale ») reste reconnu comme avant le mot entier
//   R2. dictée : le mot entier ne reconnaît pas deux clients à la fois par un mot commun, et ne laisse pas passer un faux ami
//   R3. « Se déconnecter » : Échap garde la saisie ; après « Abandonner », la personne suivante ne reçoit pas la question ; une saisie refusée reste
//   R4. fil de la Comptabilité : un nom très long, deux renommages, un client de plus : aucune ligne dupliquée, aucune autre ligne touchée
//   R5. « aussi » dans « Archivés » : la ligne ne déborde pas (largeur du profil), une recherche vide n’en montre pas, le secrétariat la voit aussi
// Usage : PROFIL=… QUI=marc|julie NUIT=1 SEUL=R1,R3 node clients-restes4-recontrole.js — « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, SEUL = process.env.SEUL || '', TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients4-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '') + '-' + QUI;
const veut = k => !SEUL || SEUL.split(',').includes(k);
(async () => {
  require('fs').mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  await p.evaluate(() => { window.confirm = () => true; window.open = () => null; });
  const D0 = await p.evaluate(() => ({ n: Object.keys(CLIENTS).length, mr: !!CLIENTS.mr, md: !!CLIENTS.md }));
  v('population : ' + D0.n + ' clients, Mme Roux et Mme Durand présentes', D0.n >= 7 && D0.mr && D0.md, D0);
  const dicter = t => p.evaluate(t => { const n0 = DV.length; try { DVD = null; dvDicter(); document.getElementById('dvd-t').value = t; dvdPreparer(); } catch (e) { return { err: String(e.message).slice(0, 80) }; } const nv = DV.slice(n0); const r = { cree: nv.length, cli: nv.map(d => d.cli), toast: ((document.querySelector('#toast') || {}).textContent || '').trim() }; DV.splice(n0); try { fermerPanneau(); } catch (e) {} return r; }, t);
  const mk = (k, nom) => p.evaluate(([k, nom]) => { CLIENTS[k] = { nom, type: 'pro', contact: 'X', tel: '06 10 20 30 40', mail: 'x@test.fr', adr: '1 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [] }; }, [k, nom]);
  const rm = ks => p.evaluate(ks => { ks.forEach(k => delete CLIENTS[k]); }, ks);

  // ── R1. noms à trait d'union / apostrophe : ce que la dictée reconnaissait AVANT doit l'être encore ──
  if (veut('R1')) {
    await mk('__h1', 'Atelier Saint-Hubert'); await mk('__h2', 'Café de l’Escale'); await mk('__h3', 'Bar-Tabac Le Rialto'); await mk('__h4', 'Jean-Pierre Vasseur');
    const cas = [['Devis pour Saint-Hubert, une heure de main-d’œuvre.', '__h1'], ['Devis pour l’atelier Saint-Hubert, une heure', '__h1'], ['Devis pour l’Escale, une heure', '__h2'], ['Devis pour le café de l’Escale, une heure', '__h2'], ['Devis pour le Bar-Tabac, une heure', '__h3'], ['Devis pour Jean-Pierre Vasseur, une heure', '__h4'], ['Devis pour Jean-Pierre, une heure', '__h4']];
    for (const [t, k] of cas) { const r = await dicter(t); v('R1 : « ' + t.slice(0, 60) + ' » va à ' + k + ' (clients : ' + (r.cli || []).join(',') + ', « ' + (r.toast || '').slice(0, 50) + ' »)', !r.err && r.cree === 1 && r.cli[0] === k, r); }
    await rm(['__h1', '__h2', '__h3', '__h4']);
  }

  // ── R2. faux amis et mots communs ──
  if (veut('R2')) {
    await mk('__f1', 'Dupont Plomberie'); await mk('__f2', 'Dupont Électricité');
    const r = await dicter('Devis pour Dupont, une heure de main-d’œuvre.');
    v('R2a : deux clients portent « Dupont » : la dictée en choisit UN seul et le dit par son devis (devis ' + r.cree + ', ' + (r.cli || []).join(',') + ')', !r.err && r.cree === 1, r);
    for (const t of ['Devis pour un rouxlement, une heure', 'Devis pour la durandière, une heure', 'Devis pour mimosa, une heure', 'Devis pour un portail, une heure', 'Devis pour une plagiste de Royan, une heure']) { const q = await dicter(t); v('R2b : « ' + t + ' » : aucun client reconnu (devis ' + q.cree + ')', !q.err && q.cree === 0, q); }
    const o = await dicter('Devis pour Mme Rouxs, une heure'); v('R2c : pluriel toléré (« Rouxs ») : Mme Roux (' + (o.cli || []).join(',') + ')', !o.err && o.cree === 1 && o.cli[0] === 'mr', o);
    const e = await dicter('Devis pour Mme Roux.'); v('R2d : point final collé au nom, sans autre travail : le client est reconnu (devis ' + e.cree + ')', !e.err && (e.cree === 1 ? e.cli[0] === 'mr' : true), e);
    await rm(['__f1', '__f2']);
  }

  // ── R3. « Se déconnecter » ──
  if (veut('R3') && !TEL) {
    const cle = await p.evaluate(() => SESSION), nom0 = await p.evaluate(() => CLIENTS.md.nom);
    const etat = () => p.evaluate(() => ({ connecte: !!SESSION, sale: clientInfosSale(), nom: CLIENTS.md.nom, demande: /sans l’enregistrer/.test(((document.querySelector('#calque') || {}).textContent || '')), panneaux: document.querySelectorAll('#calque .panneau').length }));
    const salir = async s => { await L.aller(p, 'client-x-md'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); const n0 = await p.inputValue('[data-ci="nom"]'); await p.fill('[data-ci="nom"]', n0 + s); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur()); };
    const reouvrir = async k => { await p.evaluate(k => { CLI_LIBRE = true; try { fermerPanneau(); CLI_RETENU = null; } catch (e) {} sessionOuvrir(k); CLI_LIBRE = false; }, k); await L.calme(p, 700); };
    await salir(' Zz'); await L.toucher(c, '[data-cnx="sortir"]'); await L.calme(p, 700);
    let e = await etat(); v('R3a : la fenêtre de garde est posée (' + JSON.stringify(e) + ')', e.connecte && e.demande, e);
    await p.keyboard.press('Escape'); await L.calme(p, 600); e = await etat();
    v('R3b : Échap ferme la fenêtre SANS déconnecter ni perdre la saisie (connecté ' + e.connecte + ', saisie ' + e.sale + ', panneaux ' + e.panneaux + ')', e.connecte && e.sale && e.panneaux === 0, e);
    await L.toucher(c, '[data-cnx="sortir"]'); await L.calme(p, 700); e = await etat(); v('R3c : un second appui redemande (fenêtre ' + e.demande + ')', e.connecte && e.demande, e);
    // nom vidé : « Enregistrer » est REFUSÉ, on reste connecté, sur la fiche, la fenêtre fermée
    await p.evaluate(() => { document.querySelector('#calque [data-ferme]').click(); }); await L.calme(p, 500);
    await p.fill('[data-ci="nom"]', ''); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur());
    await L.toucher(c, '[data-cnx="sortir"]'); await L.calme(p, 700);
    await L.toucher(c, p.locator('#calque .panneau button').filter({ hasText: 'Enregistrer' }).first()); await L.calme(p, 900); e = await etat();
    v('R3d : nom vide + « Enregistrer » : refusé, on reste connecté (connecté ' + e.connecte + ', nom en base « ' + e.nom + ' »)', e.connecte && e.nom === nom0, e);
    await L.capture(c, CAP + 'refus-enregistrer-' + ETQ + '.png');
    // « Abandonner », puis une AUTRE personne se connecte : aucune question héritée de la saisie d'avant
    await p.fill('[data-ci="nom"]', nom0 + ' Qq'); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur());
    await L.toucher(c, '[data-cnx="sortir"]'); await L.calme(p, 700);
    await L.toucher(c, p.locator('#calque .panneau button').filter({ hasText: 'Abandonner' }).first()); await L.calme(p, 900); e = await etat();
    v('R3e : « Abandonner » : déconnecté, nom intact (connecté ' + e.connecte + ', « ' + e.nom + ' »)', !e.connecte && e.nom === nom0, e);
    const autre = await p.evaluate(k => Object.keys(SECU.comptes || {}).find(x => x !== k) || null, cle);
    await reouvrir(autre || cle); await L.aller(p, 'accueil'); await L.calme(p, 400);
    const e2 = await p.evaluate(() => ({ sale: clientInfosSale(), panneaux: document.querySelectorAll('#calque .panneau').length, session: SESSION }));
    await L.aller(p, 'clients'); await L.calme(p, 400);
    const e3 = await p.evaluate(() => ({ sale: clientInfosSale(), panneaux: document.querySelectorAll('#calque .panneau').length }));
    v('R3f : après « Abandonner », la session suivante (' + e2.session + ') n’hérite d’aucune saisie ni fenêtre (' + JSON.stringify(e2) + ' puis ' + JSON.stringify(e3) + ')', !e2.sale && e2.panneaux === 0 && !e3.sale && e3.panneaux === 0, { e2, e3 });
    await p.evaluate(n => { CLIENTS.md.nom = n; }, nom0); await reouvrir(cle);   /* la suite se joue avec la personne du départ */
  }

  // ── R4. fil de la Comptabilité ──
  if (veut('R4')) {
    await L.aller(p, 'comptabilite'); await p.evaluate(() => { cpSysteme = true; rendre(); }); await L.calme(p, 2500);
    const fr = L.cadre(p, /prototype-comptabilite\.html/);
    if (!fr) v('R4 : le cadre de la Comptabilité est chargé', false, p.frames().map(f => f.url().slice(-40)));
    else {
      const lire = () => fr.evaluate(() => ({ sur: FIL.filter(f => /sur place/.test(f.t)).map(f => f.t), tous: FIL.length, ecr: E.length }));
      const av = await lire();
      const long = 'Mme Roux-' + 'Delacroix-Vandenberghe '.repeat(4).trim();
      await p.evaluate(n => { CLIENTS.mr.nom = n; rendre(); }, long); await L.calme(p, 800); const a1 = await lire();
      v('R4a : nom très long (' + long.length + ' signes) : même nombre de lignes de fil et d’écritures (' + av.tous + '→' + a1.tous + ', ' + av.ecr + '→' + a1.ecr + '), nom suivi', a1.tous === av.tous && a1.ecr === av.ecr && a1.sur.length === av.sur.length && /Delacroix-Vandenberghe/.test(a1.sur[0]), { av, a1 });
      await p.evaluate(() => { try { document.querySelector('#toast').textContent = ''; } catch (e) {} }); await fr.evaluate(() => aller('fil')); await L.calme(p, 1200);
      const dom = await fr.evaluate(() => { const ligne = [...document.querySelectorAll('.fil > *')].find(e => /Reçu I6/.test(e.textContent)); const r = ligne && ligne.getBoundingClientRect(); const bad = []; document.querySelectorAll('.fil *').forEach(e => { const q = e.getBoundingClientRect(); if (q.width > 0 && q.right > innerWidth + 1) bad.push(e.tagName + ':' + Math.round(q.right)); }); return { iw: innerWidth, sw: document.documentElement.scrollWidth, ligne: !!ligne, droite: r ? Math.round(r.right) : 0, texte: ligne ? ligne.textContent.replace(/\s+/g, ' ').slice(0, 140) : '', bad: bad.slice(0, 4) }; });
      v('R4b : la ligne « Reçu I6 » du fil au nom très long est là, dans l’écran (droite ' + dom.droite + ' pour ' + dom.iw + ', défilable ' + dom.sw + ', débordants ' + dom.bad.length + ') : « ' + dom.texte + ' »', dom.ligne && dom.droite <= dom.iw && dom.sw <= dom.iw + 1 && dom.bad.length === 0, dom);
      await L.capture(c, CAP + 'fil-nom-long-' + ETQ + '.png');
      await fr.evaluate(() => aller('accueil')); await L.calme(p, 400);
      await p.evaluate(() => { CLIENTS.mr.nom = 'Mme Rouxel'; rendre(); }); await L.calme(p, 500); await p.evaluate(() => { CLIENTS.mr.nom = 'Mme Roux'; rendre(); }); await L.calme(p, 700); const a2 = await lire();
      v('R4c : deux renommages d’affilée puis retour : une seule ligne, nom d’origine (' + a2.sur.length + ', ' + a2.sur[0] + ')', a2.sur.length === av.sur.length && a2.sur[0] === av.sur[0] && a2.tous === av.tous, { av, a2 });
      const autres = await fr.evaluate(() => FIL.filter(f => !/sur place/.test(f.t)).map(f => f.t).slice(0, 3));
      v('R4d : les autres lignes du fil n’ont pas bougé (population ' + autres.length + ')', autres.length >= 1 && autres.every(t => !/Rouxel|Delacroix/.test(t)), autres);
    }
  }

  // ── R5. « aussi » dans « Archivés » ──
  if (veut('R5')) {
    await L.aller(p, 'clients');
    const poser = (rang, q, n) => p.evaluate(([rang, q, n]) => { ['__ra', '__rv', '__rvw', '__rvx'].forEach(k => delete CLIENTS[k]);
      CLIENTS.__ra = { nom: 'Zorglub Archive Test ' + 'Anticonstitutionnellement'.repeat(2), type: 'part', contact: 'R. A', tel: '06 10 20 30 40', mail: 'ra@test.fr', adr: '1 rue X, 17300 Zorglub', acces: '', depuis: '2026', appareils: [], archive: true };
      for (let i = 0; i < n; i++) CLIENTS['__rv' + ['', 'w', 'x'][i]] = { nom: 'Zorglub Vivant ' + (i + 1), type: 'part', contact: 'R. V', tel: '06 10 20 30 4' + i, mail: 'rv' + i + '@test.fr', adr: '2 rue X, 17300 Zorglub', acces: '', depuis: '2026', appareils: [] };
      chercheClient = q; rangClients = rang; rendre(); }, [rang, q, n]);
    await poser('archives', 'Zorglub', 3); await L.calme(p, 500);
    const m = await p.evaluate(() => { const l = [...document.querySelectorAll('#contenu .lien[data-rangc="tous"]')][0], pg = l && l.closest('p'); const r = pg && pg.getBoundingClientRect(); return { iw: innerWidth, sw: document.documentElement.scrollWidth, texte: pg ? pg.textContent.replace(/\s+/g, ' ') : '', droite: r ? Math.round(r.right) : 0, gauche: r ? Math.round(r.left) : 0, haut: l ? Math.round(l.getBoundingClientRect().height) : 0 }; });
    v('R5a : la ligne « aussi » (3 clients, carte au nom très long) reste dans l’écran (droite ' + m.droite + ' pour ' + m.iw + ', défilable ' + m.sw + ', bouton ' + m.haut + ' px) : « ' + m.texte.slice(0, 80) + ' »', /3 clients de ta liste correspondent aussi/.test(m.texte) && m.droite <= m.iw && m.sw <= m.iw + 1, m);
    await L.capture(c, CAP + 'aussi-long-' + ETQ + '.png');
    await poser('archives', '', 3); await L.calme(p, 300);
    const t0 = await p.evaluate(() => (document.querySelector('#contenu').textContent || '').replace(/\s+/g, ' '));
    v('R5b : recherche VIDE dans « Archivés » : aucune ligne « correspond aussi »', !/correspond/.test(t0), t0.slice(0, 120));
    await poser('archives', 'ZORGLUB', 1); await L.calme(p, 300);
    const t1 = await p.evaluate(() => (document.querySelector('#contenu').textContent || '').replace(/\s+/g, ' '));
    v('R5c : majuscules ignorées : la ligne « aussi » y est (' + /Un client de ta liste correspond aussi/.test(t1) + ')', /Un client de ta liste correspond aussi/.test(t1), t1.slice(0, 160));
    // le client archivé aussi trouvé par l’autre sens, jamais les deux lignes à la fois
    await poser('tous', 'Zorglub', 1); await L.calme(p, 300);
    const t2 = await p.evaluate(() => (document.querySelector('#contenu').textContent || '').replace(/\s+/g, ' '));
    v('R5d : dans « Tous », une seule des deux lignes (« archivé correspond aussi » ' + /archivé correspond aussi/.test(t2) + ', « de ta liste » ' + /de ta liste correspond/.test(t2) + ')', /archivé correspond aussi/.test(t2) && !/de ta liste correspond/.test(t2), t2.slice(0, 200));
    await p.evaluate(() => { ['__ra', '__rv', '__rvw', '__rvx'].forEach(k => delete CLIENTS[k]); chercheClient = ''; rangClients = 'tous'; rendre(); });
  }

  // ── R6. la carte d'un client au nom LONG (« ne rien laisser sortir de la carte ») : noms réalistes, puis un mot unique de 50 signes ──
  if (veut('R6')) {
    await L.aller(p, 'clients');
    const noms = [['Établissements Dupont-Delaunay Frères et Associés du Sud-Ouest', true], ['Société Civile Immobilière des Hauts de la Vieille Ville de La Rochelle', true], ['M. et Mme Van Der Westhuizen-Ouedraogo', true], ['Etablissementsdupontdelaunayfreresetassociesdusudouest', false]];
    for (const [nom, vise, arch] of noms.flatMap(x => [x, [x[0], x[1], true]])) {
      await p.evaluate(([nom, arch]) => { delete CLIENTS.__lg; CLIENTS.__lg = { nom, type: 'pro', contact: nom, tel: '06 10 20 30 40', mail: 'lg@test.fr', adr: '1 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [] }; if (arch) CLIENTS.__lg.archive = true; rangClients = arch ? 'archives' : 'tous'; chercheClient = nom.slice(0, 12); rendre(); }, [nom, !!arch]); await L.calme(p, 400);
      const m = await p.evaluate(() => { const k = [...document.querySelectorAll('#contenu .client-carte')].find(e => /@@@/.test('')) || [...document.querySelectorAll('#contenu .client-carte')][0]; if (!k) return null; const r = k.getBoundingClientRect(); const bad = []; k.querySelectorAll('*').forEach(e => { const q = e.getBoundingClientRect(); if (q.width > 0 && (q.right > r.right + 0.5 || q.left < r.left - 0.5)) bad.push(e.tagName + ':' + Math.round(q.right - r.right)); }); return { iw: innerWidth, sw: document.documentElement.scrollWidth, carteDroite: Math.round(r.right), carteGauche: Math.round(r.left), bad: bad.slice(0, 3), n: document.querySelectorAll('#contenu .client-carte').length }; });
      const ok = m && m.n === 1 && m.bad.length === 0 && m.sw <= m.iw + 1;
      if (vise) v('R6 : « ' + nom.slice(0, 48) + '… »' + (arch ? ' (archivé)' : '') + ' : rien ne sort de la carte (débordants ' + (m ? m.bad.length : '?') + ', défilable ' + (m ? m.sw + '/' + m.iw : '?') + ')', ok, m);
      else console.log('  · R6 (information, mot unique de ' + nom.length + ' signes' + (arch ? ', archivé' : '') + ') : ' + (ok ? 'tient' : 'sort de la carte ' + JSON.stringify(m)));
      if (!vise) await L.capture(c, CAP + 'carte-mot-unique-' + (arch ? 'arch-' : '') + ETQ + '.png');
    }
    await p.evaluate(() => { delete CLIENTS.__lg; chercheClient = ''; rendre(); });
  }

  const errs = c.err.filter(e => !/favicon/.test(e)); v('aucune erreur de page (' + errs.length + ')', errs.length === 0, errs.slice(0, 3));
  await L.fermer(); const code = L.bilan(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
