// Captures du tour 3 des restes de CLIENTS (19 novembre 2026) : à REGARDER, jour et nuit, ordinateur et téléphone.
//   rech-actif-<profil> : « Archivés » + une recherche qui ne correspond qu'à un client ACTIF ; rech-deux-<profil> : un actif ET un archivé qui correspondent ;
//   dictee-<profil> : « Devis IA » dicté pour un client archivé ; retour-<profil> : la fenêtre posée par le retour du navigateur.
// Usage : PROFIL=… NUIT=1 node clients-restes3-captures.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT, ETQ = PROFIL + (NUIT ? '-nuit' : '');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients3/';
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc', nuit: NUIT }), p = c.p;
  require('fs').mkdirSync(CAP, { recursive: true });
  /* un client ACTIF fictif qui porte « Vivant » ET « Plage » : sans lui, R2 cherche un mot qu'aucun client d'origine ne porte et R1 n'a pas d'actif à croiser */
  await p.evaluate(() => { CLIENTS.hp.archive = true; CLIENTS.__rv = { nom: 'Plage Vivant Test', type: 'part', contact: 'R. Vivant', tel: '06 10 20 30 41', mail: 'rv@test.fr', adr: '2 rue X, 17300 Rochefort', acces: '', depuis: '2026', appareils: [] }; window.open = () => null; });
  await L.aller(p, 'clients');
  const chercher = async (txt, rang) => { await p.evaluate(([t, r]) => { rangClients = r; chercheClient = t; rendre(); }, [txt, rang]); await L.calme(p, 500); };
  await chercher('Vivant', 'archives');
  const t1 = await p.evaluate(() => (document.querySelector('#contenu .carte.gris') || {}).textContent || '');
  v('R2 : dans « Archivés », un client de la liste correspond : on le dit et on propose de le voir (« ' + t1.trim().slice(0, 90) + ' »)', /client de ta liste correspond/.test(t1) && !/Nouveau client pour/.test(t1) && !/Vérifie l’orthographe/.test(t1), t1);
  await L.capture(c, CAP + 'rech-actif-' + ETQ + '.png');
  await chercher('Plage', 'tous');
  const t2 = await p.evaluate(() => (document.querySelector('#contenu').textContent || '').replace(/\s+/g, ' '));
  v('R1 : un archivé qui correspond n’est pas caché sans un mot', /archivé correspond aussi|archivés correspondent aussi|Aucun client de ta liste/.test(t2), t2.slice(0, 200));
  await L.capture(c, CAP + 'rech-deux-' + ETQ + '.png');
  await p.evaluate(() => { delete CLIENTS.__rv; DVD = null; dvDicter(); document.getElementById('dvd-t').value = 'Devis pour Plage, remplacement de la pompe, une heure de main-d’œuvre.'; dvdPreparer(); });
  await L.calme(p, 400); await L.capture(c, CAP + 'dictee-' + ETQ + '.png');
  const t3 = await p.evaluate(() => (document.querySelector('#toast') || {}).textContent || '');
  v('V1 : la dictée pour un archivé dit pourquoi (« ' + t3.trim().slice(0, 90) + ' »)', /archivé/.test(t3), t3);
  await p.evaluate(() => { delete CLIENTS.hp.archive; delete CLIENTS.__rv; });
  await L.aller(p, 'client-x-md'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]');
  await p.fill('[data-ci="nom"]', (await p.inputValue('[data-ci="nom"]')) + ' Zz'); await p.evaluate(() => document.querySelector('[data-ci="nom"]').blur());
  await p.evaluate(() => history.back()); await L.calme(p, 800); await L.capture(c, CAP + 'retour-' + ETQ + '.png');
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error("PLANTÉ", e); process.exit(2); });
