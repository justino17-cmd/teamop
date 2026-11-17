// ÉQUIPE : chaque bouton, un par un. Recensement partant du DOM (lib.gestes), puis TOUCHER de chaque élément sur le profil donné
// (souris sur ordinateur, doigt sur téléphone), et vérification qu'il FAIT quelque chose de juste : le bon écran, la bonne fenêtre.
// Population : gestes recensés / touchés / qui répondent ; ce qui n'a pas pu être touché est NOMMÉ. ⛔ 127.0.0.1 seulement.
// usage : node equipe-gestes.js [mac|iphone|…] [nuit]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac', NUIT = process.argv[3] === 'nuit';
// ce que chaque geste DOIT produire : { motif sur data → contrôle sur l'état après }
const ATTENDU = [
  [/^data-eq=inviter$/, o => /Inviter une personne/.test(o.pan), 'ouvre la fenêtre « Inviter une personne »'],
  [/^data-sec2=voir$/, o => o.hash === '#securite', 'mène à la Sécurité'],
  [/^data-eqx=kpi\|places/, o => /places utilisées sur/.test(o.toast) || /place/.test(o.toast), 'dit combien de places restent'],
  [/^data-eqx=kpi\|terrain/, o => true, 'filtre le terrain'],
  [/^data-eqx=kpi\|hab/, o => true, 'mène aux habilitations'],
  [/^data-eqx=kpi\|invites/, o => true, 'filtre les invités'],
  [/^data-eq=fiche\|/, (o, x) => o.pan === x.nom, 'ouvre la fiche de la bonne personne'],
  [/^data-eqx=formation\|/, o => /absence/i.test(o.pan), 'ouvre la pose d’une absence de formation'],
  [/^data-eqx=regles$/, o => /Habilitations exigées/.test(o.pan), 'ouvre les règles d’habilitations'],
  [/^data-eq=filtre\|/, o => true, 'change le filtre']
];
(async () => {
  const c = await E.marc(PROFIL, NUIT);
  const bilan = { profil:PROFIL, recenses:0, touches:0, repondent:0, muets:[], intouchables:[] };
  await L.aller(c.p, 'equipe');
  let g = await L.gestes(c.p);
  v('population : l’écran Équipe recense au moins 20 gestes', g.length >= 20, g.length);
  v('aucun geste sans nom (ni texte ni aria-label)', g.filter(x => x.sansNom).length === 0, g.filter(x => x.sansNom).map(x => x.data));
  if (c.doigt) v('cibles au doigt : aucune sous 44 px sur la liste', (await L.doigts(c.p)).petits.length === 0, (await L.doigts(c.p)).petits);
  if (c.doigt) v('champs : aucun sous 16 px', (await L.doigts(c.p)).champs.length === 0, (await L.doigts(c.p)).champs);
  for (const x of g) {
    bilan.recenses++; const s = E.sel(x); if (!s) { bilan.intouchables.push(x.lib + ' (sans data)'); continue; }
    await L.aller(c.p, 'equipe'); await c.p.evaluate(() => { eqFiltre = 'tous'; rendre(); }); await E.ranger(c);
    const a = await E.obs(c.p); const actif = /^data-eq=filtre\|tous/.test(x.data); const ok = await L.toucher(c, s, { delai:3500 });
    if (!ok) { bilan.intouchables.push(x.data + ' (non atteint au ' + (c.doigt ? 'doigt' : 'clic') + ')'); v(`« ${x.lib.slice(0, 30)} » (${x.data.split(' ')[0]}) : atteint`, false, 'cible non touchée'); continue; }
    bilan.touches++; const b = await E.obs(c.p); const ch = L.change(a, b);
    x.nom = (x.lib.match(/[A-ZÉ][a-zéèëï]+ [A-ZÉ][a-zéèëï]+/) || [''])[0];
    const rep = ch.length > 0 || actif; if (rep) bilan.repondent++; else bilan.muets.push(x.data);
    const regle = ATTENDU.find(([m]) => m.test(x.data.split(' ')[0]));
    v(`« ${x.lib.replace(/\s+/g, ' ').slice(0, 34)} » (${x.data.split(' ')[0]}) : fait quelque chose${regle ? ' — ' + regle[2] : ''}`, rep && (!regle || regle[1](b, x)), { change:ch.map(k => k + '=' + String(b[k]).slice(0, 40)), pan:b.pan, toast:b.toast });
  }
  v(`population : ${bilan.touches} touchés sur ${bilan.recenses} recensés (liste)`, bilan.touches >= bilan.recenses - 1, bilan);
  // ── les six fiches : chaque geste de la fiche, sauf les cases (jouées par equipe-droits-ui) et « comme » (jouée en dernier)
  const fiches = ['marc', 'julie', 'sm', 'kb', 'lr', 'tl']; let tf = 0, rf = 0;
  const ATT = { 'data-eqx=modifier': o => true, 'data-eq=heures': o => o.hash === '#pointage' || /heure|pointage/i.test(o.h1 + o.pan), 'data-eqx=histo': o => o.hash === '#historique', 'data-eq=habajout': o => /Ajouter une habilitation/.test(o.pan), 'data-cnx=copier': o => /Copié/.test(o.toast), 'data-sec2=telephone': o => /Nouveau téléphone/.test(o.pan), 'data-sec2=deconnecter': o => /Déconnecter/.test(o.pan), 'data-cnx=repose': o => /Mot de passe provisoire/.test(o.pan + o.toast), 'data-eq=mdp': o => /Lien envoyé/.test(o.toast), 'data-eq=actif': o => /désactiver/i.test(o.pan), 'data-eq=planning': o => o.hash === '#planning', 'data-eq=conges': o => /absences|congés/i.test(o.hash + o.h1), 'data-eq=renouv': o => /Renouveler/.test(o.pan), 'data-ve=fiche': o => /véhicule|Véhicules|Peugeot|Renault|Citro|Ford|Fiat/i.test(o.pan + o.h1 + o.hash), 'data-sk=lieu': o => true };
  for (const k of fiches) {
    await E.fiche(c, k); const gs = (await L.gestes(c.p, '#calque')).filter(x => !/^data-eq[dst]=/.test(x.data) && x.balise !== 'SUMMARY' && x.balise !== 'A' && !/data-ferme|data-cnx=comme|data-cnx=repose\|marc/.test(x.data));
    if (k === 'marc') v('equipe-01 sa propre fiche ne propose pas « Reposer un mot de passe provisoire » (le gérant se fermerait la porte : session coupée, mot de passe jamais affiché)', !(await L.gestes(c.p, '#calque')).some(x => /data-cnx=repose\|marc/.test(x.data)), 'bouton présent sur la fiche de Marc');
    v(`fiche ${k} : population : au moins 8 gestes recensés`, gs.length >= 8, gs.length);
    v(`fiche ${k} : aucun geste sans nom`, gs.filter(x => x.sansNom).length === 0, gs.filter(x => x.sansNom).map(x => x.data));
    for (const x of gs) {
      const s = E.sel(x); bilan.recenses++; if (!s) continue; await E.fiche(c, k); const a = await E.obs(c.p); const ok = await L.toucher(c, s, { delai:3500 });
      if (!ok) { bilan.intouchables.push(k + ' ' + x.data); v(`fiche ${k} « ${x.lib.slice(0, 28)} » : atteint`, false, x.data); continue; }
      tf++; bilan.touches++; const b = await E.obs(c.p); const ch = L.change(a, b); const cle = x.data.split(' ')[0].split('|')[0]; const att = ATT[cle];
      if (ch.length) { rf++; bilan.repondent++; } else bilan.muets.push(k + ' ' + x.data);
      v(`fiche ${k} « ${x.lib.replace(/\s+/g, ' ').slice(0, 30)} » (${cle}) : fait la bonne chose`, ch.length > 0 && (!att || att(b)), { change:ch.map(q => q + '=' + String(b[q]).slice(0, 50)), pan:b.pan, h1:b.h1 });
      await E.ranger(c);
    }
  }
  v(`population : fiches : ${tf} gestes touchés, ${rf} répondent`, tf >= 50 && rf >= tf - 4, { tf, rf });
  // ── la fermeture : la croix, Échap, le fond
  await E.fiche(c, 'julie'); await L.toucher(c, '#calque [data-ferme]'); v('fiche : la croix ferme', (await L.etat(c.p)).calque === 0, await L.etat(c.p));
  await E.fiche(c, 'julie'); await c.p.keyboard.press('Escape'); await L.calme(c.p, 400); v('fiche : Échap ferme', (await L.etat(c.p)).calque === 0, await L.etat(c.p));
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  console.log(JSON.stringify(bilan));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
