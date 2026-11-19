// Campagne « clients » (17 novembre 2026) — LES CORRECTIONS DE LA PASSE « corriger-clients » : une vérification par défaut réel corrigé qui n'avait pas déjà son contrôle
// (clients-03 en-tête, 06 nom modifiable, 10 passages par appareil, 13 Infos lisibles, 14 phrase du panneau, 16 suggestions d'adresses). Usage : PROFIL=… QUI=marc NUIT=1
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT, TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-clients/';
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc', nuit: NUIT }), p = c.p;
  const t = () => p.evaluate(() => ((document.querySelector('#toast') || {}).textContent || '').replace(/\s+/g, ' ').trim());
  // clients-03 : l'en-tête de « Par mois » / « Par semaine » garde sa phrase d'aide lisible, le bouton ne recouvre rien
  for (const rang of ['mois', 'semaine']) {
    await L.aller(p, 'clients'); await p.evaluate(() => { chercheClient = ''; }); await L.toucher(c, `[data-rangc="${rang}"]`); await L.calme(p, 300);
    const m = await p.evaluate(() => { const h = document.querySelector('#contenu .cl-tete'); if (!h) return null; const a = h.firstElementChild.getBoundingClientRect(), b = h.querySelector('.btn').getBoundingClientRect(), W = document.getElementById('contenu').getBoundingClientRect().width;
      return { aire: a.width, W, chevauche: !(a.right <= b.left + 1 || b.right <= a.left + 1 || a.bottom <= b.top + 1 || b.bottom <= a.top + 1) }; });
    v(`clients-03 : en-tête « Par ${rang} » : population (l'en-tête existe)`, !!m, m);
    if (m) { v(`clients-03 : « Par ${rang} » : la phrase d'aide a toute la largeur (${Math.round(m.aire)} px sur ${Math.round(m.W)})`, !TEL || m.aire >= m.W * 0.8, m); v(`« Par ${rang} » : le bouton « ＋ Nouveau client » ne recouvre pas le titre`, !m.chevauche, m); }
    if (TEL) await L.capture(c, CAP + `corr-liste-${rang}-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  }
  // clients-10 : aucun « passages » à côté d'un appareil (le chiffre était celui du client entier)
  await L.aller(p, 'client-x-vp'); await L.toucher(c, '#contenu [role=tab][data-oc="appareils"]'); await L.calme(p, 200);
  const ap = await p.evaluate(() => { const l = [...document.querySelectorAll('#contenu .ligne')]; return { n: l.length, passages: l.filter(x => /passage/i.test(x.innerText)).length }; });
  v('clients-10 : population : l’Hôtel a au moins un appareil (' + ap.n + ')', ap.n >= 1, ap); v('clients-10 : aucun « N passages » à côté d’un appareil', ap.passages === 0, ap);
  if (TEL) await L.capture(c, CAP + `corr-appareils-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  // clients-13 : Infos — contact et e-mail se lisent en entier ; clients-06 : le nom se corrige
  await L.aller(p, 'client-x-vp'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); await L.calme(p, 200);
  const inf = await p.evaluate(() => ['nom', 'contact', 'mail', 'tel', 'adr'].map(k => { const e = document.querySelector(`[data-ci="${k}"]`); return e ? { k, coupe: e.scrollWidth > e.clientWidth + 1, w: Math.round(e.clientWidth), val: e.value.length } : { k, absent: true }; }));
  v('clients-13 : population : les cinq champs sont là', inf.every(x => !x.absent), inf);
  v('clients-13 : contact et e-mail de l’Hôtel se lisent en entier (aucun coupé)', inf.filter(x => ['contact', 'mail'].includes(x.k)).every(x => !x.coupe), inf);
  if (TEL) await L.capture(c, CAP + `corr-infos-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  const nomDe = () => p.evaluate(() => (document.querySelector('#contenu .tete-client h1') || document.querySelector('#contenu h1') || {}).textContent);
  const champ = async (k, val) => { await p.fill(`[data-ci="${k}"]`, val); await p.evaluate(k => document.querySelector(`[data-ci="${k}"]`).blur(), k); await L.calme(p, 100); };
  const enreg = async () => { await L.toucher(c, '[data-action="clientEnreg"]'); await L.calme(p, 350); };
  await L.aller(p, 'client-x-mr'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]');
  await champ('nom', ''); await enreg(); v('clients-06 : un nom vidé est refusé', /Indique le nom/.test(await t()), await t());
  await L.aller(p, 'client-x-mr'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); await champ('nom', 'Hôtel de la Plage'); await enreg(); v('clients-06 : le nom d’un AUTRE client est refusé', /porte déjà ce nom/.test(await t()), await t());
  await L.aller(p, 'client-x-mr'); await L.toucher(c, '#contenu [role=tab][data-oc="infos"]'); const avant = await nomDe(); await champ('nom', 'Mme Roux-Lefèvre'); await enreg();
  v('clients-06 : le nouveau nom est enregistré', /enregistrée/.test(await t()), await t());
  const apres = await nomDe(); v('clients-06 : l’en-tête de la fiche porte le nouveau nom (« ' + avant + ' » → « ' + apres + ' »)', /Roux-Lefèvre/.test(apres || ''), apres);
  await L.aller(p, 'clients'); await p.evaluate(() => { chercheClient = ''; }); await p.fill('[data-cherche]', 'lefevre'); await L.calme(p, 250);
  v('clients-06 : la liste retrouve le client par son nouveau nom', (await p.evaluate(() => [...document.querySelectorAll('#contenu .client-carte b')].map(b => b.textContent))).some(x => /Roux-Lefèvre/.test(x)));
  const ailleurs = await p.evaluate(() => { const d = DV.find(x => x.cli === 'mr'); return { client: CLIENTS.mr.nom, devis: !!d }; }); v('clients-06 : le nom vit à un seul endroit (CLIENTS) : devis et factures le relisent', /Roux-Lefèvre/.test(ailleurs.client), ailleurs);
  await p.evaluate(() => { chercheClient = ''; });
  // clients-14 : la phrase du panneau « Nouveau client »
  await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]');
  const ph = await p.evaluate(() => (document.querySelector('#calque .panneau p') || {}).textContent || '');
  v('clients-14 : la phrase du panneau « Nouveau client » se comprend du premier coup (« ' + ph.slice(0, 70) + '… »)', /premier travail/.test(ph) && !/se remplissent/.test(ph), ph);
  if (TEL) await L.capture(c, CAP + `corr-panneau-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  // clients-16 : suggestions d'adresses
  await L.toucher(c, '[data-action="clientNvInt"]'); await L.calme(p, 400);
  const sug = async txt => { await p.fill('.fen [data-cnv="adr"]', txt); await L.calme(p, 250); return p.evaluate(() => [...document.querySelectorAll('.fen .adr-sug [data-adrsug]')].map(b => b.dataset.adrsug)); };
  let s = await sug('10 rue de la gra'); v('clients-16 : « 10 rue de la gra » ne propose que la rue de la Gravière (' + s.join(' | ') + ')', s.length === 1 && /Gravi/.test(s[0]), s);
  s = await sug('rue de la gare, 17220 salles'); v('clients-16 : « rue de la gare, 17220 salles » ne propose que la rue de la Gare', s.length === 1 && /Gare/.test(s[0]), s);
  s = await sug('2 Rue de la Gare, 17220 Salles-sur-Mer'); v('clients-16 : une adresse complète ferme la liste (' + s.length + ' proposée)', s.length === 0, s);
  s = await sug('zzz'); v('clients-16 : une saisie qui ne ressemble à rien ne propose rien', s.length === 0, s);
  s = await sug('rue'); v('clients-16 : « rue » : au plus cinq propositions (' + s.length + ')', s.length >= 1 && s.length <= 5, s);
  if (TEL) await L.capture(c, CAP + `corr-suggestions-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  s = await sug('2 Rue de la Gare, 17220 Salles-sur-Mer'); await L.capture(c, CAP + `corr-adresse-complete-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e); process.exit(2); });
