// GARDE des « restes » de CLIENTS, tour 4 (19 novembre 2026) : les cinq corrections imposées par le chef de chantier, jouées jusqu'au bout.
//   A. « Archivés » : la ligne « … de ta liste correspond(ent) aussi » sous les cartes, même geste que dans l'autre sens (une carte + 2 clients actifs, singulier et pluriel)
//   B. la dictée sur un archivé dit le geste que CETTE personne peut faire (restaurer / demander à un responsable)
//   C. la dictée reconnaît un client par MOT ENTIER, accents et casse ignorés (« support » n'est pas « Port »)
//   D. « Se déconnecter » avec une saisie en attente : on demande AVANT, la fenêtre est AU PREMIER PLAN (elementFromPoint), les trois choix (Continuer, Enregistrer, Abandonner) ; palette comprise
//   E. le fil de la Comptabilité dit le client sous son nom ACTUEL après un renommage
// Usage : PROFIL=… QUI=marc|julie NUIT=1 SEUL=A,B node clients-restes4-adverse.js — « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Captures hors dépôt.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT, SEUL = process.env.SEUL || '', TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients4/', ETQ = PROFIL + (NUIT ? '-nuit' : '') + '-' + QUI;
const veut = k => !SEUL || SEUL.split(',').includes(k);
(async () => {
  require('fs').mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  await p.evaluate(() => { window.confirm = () => true; window.open = () => null; });
  const D0 = await p.evaluate(() => ({ n: Object.keys(CLIENTS).length, mr: !!CLIENTS.mr, vp: !!CLIENTS.vp, hp: !!CLIENTS.hp, peutArch: peut('crm', 's') }));
  v('population : ' + D0.n + ' clients, Mme Roux, Le Vieux Port, Hôtel de la Plage présents, droit de remettre dans la liste ' + D0.peutArch, D0.n >= 7 && D0.mr && D0.vp && D0.hp, D0);

  // ── A. la ligne « aussi » dans « Archivés » ──
  if (veut('A')) {
    await L.aller(p, 'clients');
    const lire = () => p.evaluate(() => ({ cartes: [...document.querySelectorAll('#contenu .client-carte')].map(e => e.textContent.trim().slice(0, 26)), texte: (document.querySelector('#contenu').textContent || '').replace(/\s+/g, ' '), lien: [...document.querySelectorAll('#contenu .lien[data-rangc="tous"][data-garde]')].length, vide: !!document.querySelector('#contenu .carte.gris') }));
    const poser = (rang, q, n) => p.evaluate(([rang, q, n]) => { delete CLIENTS.__ra; delete CLIENTS.__rv; delete CLIENTS.__rvw;
      CLIENTS.__ra = { nom: 'Zorglub Archive Test', type: 'part', contact: 'R. A', tel: '06 10 20 30 40', mail: 'ra@test.fr', adr: '1 rue X, 17300 Zorglub', acces: '', depuis: '2026', appareils: [], archive: true };
      for (let i = 0; i < n; i++) CLIENTS['__rv' + (i ? 'w' : '')] = { nom: 'Zorglub Vivant ' + (i + 1), type: 'part', contact: 'R. V', tel: '06 10 20 30 4' + i, mail: 'rv' + i + '@test.fr', adr: '2 rue X, 17300 Zorglub', acces: '', depuis: '2026', appareils: [] };
      chercheClient = q; rangClients = rang; rendre(); }, [rang, q, n]);
    await poser('archives', 'Zorglub', 1); await L.calme(p, 400); let a = await lire();
    v('A1 : « Archivés », « Zorglub » : UNE carte (l’archivé) ET la ligne « Un client de ta liste correspond aussi » avec son bouton (cartes ' + a.cartes.length + ', bouton ' + a.lien + ')', a.cartes.length === 1 && /Zorglub Archive/.test(a.cartes[0]) && /Un client de ta liste correspond aussi/.test(a.texte) && a.lien === 1, a);
    await L.capture(c, CAP + 'aussi-un-' + ETQ + '.png');
    await poser('archives', 'Zorglub', 2); await L.calme(p, 400); a = await lire();
    v('A2 : deux clients actifs correspondent : pluriel « 2 clients de ta liste correspondent aussi »', /2 clients de ta liste correspondent aussi/.test(a.texte) && a.lien === 1, a.texte.slice(0, 200));
    const b = await L.toucher(c, '#contenu .lien[data-rangc="tous"][data-garde]'); await L.calme(p, 500);
    const a3 = await p.evaluate(() => ({ rang: rangClients, q: (document.querySelector('[data-cherche]') || {}).value, cartes: [...document.querySelectorAll('#contenu .client-carte')].map(e => e.textContent.trim().slice(0, 22)) }));
    v('A3 : le bouton mène à « Tous les clients », garde la recherche et montre les deux clients actifs (atteint ' + b + ', ' + JSON.stringify(a3) + ')', b && a3.rang === 'tous' && a3.q === 'Zorglub' && a3.cartes.length === 2 && a3.cartes.every(x => /Zorglub Vivant/.test(x)), a3);
    // le sens inverse reste : dans « Tous », la carte active ET « Un client archivé correspond aussi »
    await poser('tous', 'Zorglub', 1); await L.calme(p, 300); a = await lire();
    v('A4 : le sens inverse n’a pas bougé (« Tous » : « Un client archivé correspond aussi »)', /Un client archivé correspond aussi/.test(a.texte) && a.cartes.length === 1, a);
    // pas d'archivé qui ne correspond pas : aucune ligne « aussi »
    await poser('archives', 'Archive', 1); await L.calme(p, 300); a = await lire();
    v('A5 : la recherche ne touche que l’archivé : aucune ligne « correspond aussi » (' + a.cartes.length + ' carte)', a.cartes.length === 1 && !/correspond/.test(a.texte), a);
    await p.evaluate(() => { delete CLIENTS.__ra; delete CLIENTS.__rv; delete CLIENTS.__rvw; chercheClient = ''; rangClients = 'tous'; rendre(); }); await L.calme(p, 200);
  }

  // ── B et C. la dictée ──
  if (veut('B') || veut('C')) {
    const dicter = t => p.evaluate(t => { const n0 = DV.length; try { DVD = null; dvDicter(); document.getElementById('dvd-t').value = t; dvdPreparer(); } catch (e) { return { err: String(e.message).slice(0, 80) }; } const nv = DV.slice(n0); const r = { cree: nv.length, cli: nv.map(d => d.cli), toast: ((document.querySelector('#toast') || {}).textContent || '').trim() }; DV.splice(n0); try { fermerPanneau(); } catch (e) {} return r; }, t);
    if (veut('B')) {
      await p.evaluate(() => { CLIENTS.hp.archive = true; }); const b1 = await dicter('Devis pour la Plage, une heure de main-d’œuvre.');
      const peut = await p.evaluate(() => peut('crm', 's'));
      const attendu = peut ? /restaure-le depuis « Clients »/ : /demande à un responsable de le restaurer/;
      v('B1 : dictée sur un archivé : le message propose un geste que cette personne peut faire (droit ' + peut + ') — « ' + b1.toast.slice(0, 120) + ' »', !b1.err && b1.cree === 0 && attendu.test(b1.toast) && (peut ? !/responsable/.test(b1.toast) : !/restaure-le/.test(b1.toast)) && /Hôtel de la Plage est archivé/.test(b1.toast), b1);
      await p.evaluate(() => { delete CLIENTS.hp.archive; });
    }
    if (veut('C')) {
      const cas = [['Devis pour Mme Roux, un support mural pour la pompe à chaleur, une heure de main-d’œuvre.', 'mr'], ['DEVIS POUR MME ROUX, UN SUPPORT MURAL, UNE HEURE', 'mr'], ['Devis pour le Vieux Port, une heure de main-d’œuvre.', 'vp'], ['Devis pour LE VIEUX PORT, une heure', 'vp'], ['Devis pour l’hôtel de la Plage, une heure', 'hp'], ['devis pour hotel de la plage, une heure', 'hp'], ['Devis pour la plage : une heure', 'hp']];
      for (const [t, k] of cas) { const r = await dicter(t); v('C : « ' + t.slice(0, 66) + ' » va à ' + k + ' (clients : ' + (r.cli || []).join(',') + ')', !r.err && r.cree === 1 && r.cli[0] === k, r); }
      // un mot qui CONTIENT le nom d'un client sans être ce mot : aucun client reconnu, aucun devis
      for (const t of ['Devis pour un support mural, une heure', 'Devis pour le passeport, une heure', 'Devis pour la plagiste, une heure']) { const r = await dicter(t); v('C : « ' + t + ' » ne désigne aucun client (devis ' + r.cree + ', « ' + r.toast.slice(0, 60) + ' »)', !r.err && r.cree === 0 && /pas reconnu/.test(r.toast), r); }
    }
  }

  // ── D. « Se déconnecter » ──
  if (veut('D')) {
    const etat = () => p.evaluate(() => ({ connecte: !!SESSION, sale: clientInfosSale(), nom: CLIENTS.md.nom, demande: /sans l’enregistrer/.test(((document.querySelector('#calque') || {}).textContent || '')), panneaux: document.querySelectorAll('#calque .panneau').length }));
    const devant = () => p.evaluate(() => { const pan = document.querySelector('#calque .panneau'); if (!pan) return false; const r = pan.getBoundingClientRect(), h = document.elementFromPoint(Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)); return !!h && pan.contains(h); });
    const salir = async s => { await L.aller(p, 'client-x-md'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); const n0 = await p.inputValue('[data-ci="nom"]'); await p.fill('[data-ci="nom"]', n0 + s); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur()); return n0; };
    const cle = await p.evaluate(() => SESSION), nom0 = await p.evaluate(() => CLIENTS.md.nom);
    const reouvrir = async () => { await p.evaluate(k => { CLI_LIBRE = true; try { fermerPanneau(); CLI_RETENU = null; } catch (e) {} sessionOuvrir(k); CLI_LIBRE = false; }, cle); await L.calme(p, 600); };
    const clicSortir = async () => { if (TEL) { await L.toucher(c, '[data-menu="ouvrir"]'); await L.calme(p, 500); } const ok = await L.toucher(c, '[data-cnx="sortir"]'); await L.calme(p, 700); return ok; };
    const choix = async lib => { await L.toucher(c, p.locator('#calque .panneau button').filter({ hasText: lib }).first()); await L.calme(p, 900); };
    if (TEL) console.log('  · D : au téléphone, « Se déconnecter » est dans la feuille « Menu » : c’est « Menu » qui demande avant (non rejoué ici : clients-restes3-adverse S1)');
    else {
      await salir(' Zz'); let ok = await clicSortir(); let e = await etat(), f = await devant();
      v('D1 : « Se déconnecter » avec une saisie : on demande AVANT (session ouverte ' + e.connecte + ', fenêtre ' + e.demande + ', AU PREMIER PLAN ' + f + ', atteint ' + ok + ')', ok && e.connecte && e.demande && f, { e, f });
      await L.capture(c, CAP + 'deconnexion-demande-' + ETQ + '.png');
      await choix('Continuer la saisie'); e = await etat();
      v('D2 : « Continuer la saisie » : toujours connecté, saisie gardée, fenêtre fermée (' + JSON.stringify(e) + ')', e.connecte && e.sale && !e.demande && e.panneaux === 0, e);
      ok = await clicSortir(); await choix('Enregistrer'); e = await etat();
      v('D3 : « Enregistrer » : le nom est enregistré (« ' + e.nom + ' ») PUIS la session se ferme (connecté ' + e.connecte + ')', e.nom === nom0 + ' Zz' && !e.connecte, e);
      await p.evaluate(n => { CLIENTS.md.nom = n; }, nom0); await reouvrir();
      await salir(' Yy'); ok = await clicSortir(); await choix('Abandonner mes changements'); e = await etat();
      const cnx = await p.evaluate(() => { const z = document.getElementById('cnx'); return !!z && z.getBoundingClientRect().width > 0; });
      v('D4 : « Abandonner » : la session se ferme, le nom en base n’a pas bougé (« ' + e.nom + ' »), l’écran de connexion est là (' + cnx + ') et aucune fenêtre de garde ne traîne derrière (' + e.panneaux + ')', !e.connecte && e.nom === nom0 && cnx && e.panneaux === 0, { e, cnx });
      await L.capture(c, CAP + 'deconnexion-apres-' + ETQ + '.png');
      await reouvrir();
      // sans saisie : déconnexion immédiate, rien ne se demande
      await L.aller(p, 'accueil'); ok = await clicSortir(); e = await etat();
      v('D5 : sans saisie en attente, « Se déconnecter » ne demande rien et déconnecte (connecté ' + e.connecte + ')', ok && !e.connecte && !e.demande, e);
      await reouvrir();
      // la palette (Ctrl+K) : « Se déconnecter » demande aussi
      await salir(' Pp'); const pal = await p.evaluate(() => { const x = palEntrees().find(o => o.l === 'Se déconnecter'); if (!x) return false; x.fn(); return true; }); await L.calme(p, 700); e = await etat(); f = await devant();
      v('D6 : la palette « Se déconnecter » demande aussi (entrée trouvée ' + pal + ', connecté ' + e.connecte + ', fenêtre ' + e.demande + ', au premier plan ' + f + ')', pal && e.connecte && e.demande && f, { e, f });
      await choix('Abandonner mes changements'); await reouvrir();
    }
    await p.evaluate(n => { CLIENTS.md.nom = n; }, nom0);
  }

  // ── E. le fil de la Comptabilité ──
  if (veut('E')) {
    await L.aller(p, 'comptabilite'); await p.evaluate(() => { cpSysteme = true; rendre(); }); await L.calme(p, 2500);
    const fr = L.cadre(p, /prototype-comptabilite\.html/);
    if (!fr) v('E : le cadre de la Comptabilité est chargé', false, p.frames().map(f => f.url().slice(-40)));
    else {
      const lire = () => fr.evaluate(() => FIL.filter(f => /sur place/.test(f.t)).map(f => f.t));
      const av = await lire(); v('E1 : population : le fil porte « Argent reçu sur place · Reçu I6 · Mme Roux » (' + av.length + ' ligne)', av.length >= 1 && /Mme Roux/.test(av[0]), av);
      await p.evaluate(() => { CLIENTS.mr.nom = 'Mme Rouxel-Delacroix'; rendre(); }); await L.calme(p, 800);
      const ap = await lire(), dom = await fr.evaluate(() => (document.body.innerText || '').match(/Reçu I6[^\n]*/g) || []);
      v('E2 : après le renommage le fil dit le NOM ACTUEL (' + ap[0] + ') et l’écran aussi (' + dom.join(' ¦ ') + ')', ap.length === av.length && /Rouxel-Delacroix/.test(ap[0]) && !/Mme Roux(?!el)/.test(ap[0]) && dom.every(x => !/Mme Roux(?!el)/.test(x)), { ap, dom });
      await p.evaluate(() => { CLIENTS.mr.nom = 'Mme Roux'; rendre(); }); await L.calme(p, 800);
      const re = await lire(); v('E3 : renommé en retour, le fil suit encore (' + re[0] + ')', /Mme Roux · /.test(re[0]) && !/Rouxel/.test(re[0]), re);
    }
  }

  const errs = c.err.filter(e => !/favicon/.test(e)); v('aucune erreur de page (' + errs.length + ')', errs.length === 0, errs.slice(0, 3));
  await L.fermer(); const code = L.bilan(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
