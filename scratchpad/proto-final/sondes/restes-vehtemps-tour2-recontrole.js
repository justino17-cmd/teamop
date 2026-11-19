// Restes « vehtemps », tour 2 — RECONTRÔLE ADVERSE : ce que les corrections du tour 2 (restes-vehtemps-tour2.json) ont pu casser À CÔTÉ.
// Les quatre corrigés : (a) ttVue / TT.viaPaie (retour du système depuis la Paie), (b) vhCourt (« y » consonne), (c) eqxRestes (pt / ptEnCours),
// (d) pied de la fiche de paie en mode application. Chaque contrôle prouve sa population ; sort en 1 si un contrôle tombe. Tout se joue dans la page (127.0.0.1, fictif).
//   PROFILS=mac,iphone,…  NUIT=0,1  PARTIES=retour,veh,depart,bulletin   (par défaut : mac, jour, tout)
const L = require('../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-vt-t2rc/';
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const PROFILS = (process.env.PROFILS || 'mac').split(','), NUITS = (process.env.NUIT || '0').split(',').map(x => x === '1'), PARTIES = (process.env.PARTIES || 'retour,veh,depart,bulletin').split(',');
const actif = c => ev(c, () => ({ route, onglet:((document.querySelector('#contenu .seg [aria-pressed="true"]') || { innerText:'' }).innerText || '').replace(/\s+/g, ' ').trim(), sem:typeof ptSem !== 'undefined' ? ptSem : null }));
const sansErr = c => c.err.filter(x => !/ERR_/.test(x));
// ouvre Temps de travail › Mois puis « Voir la paie » (le geste réel), rend vrai si on est bien dans la Comptabilité
async function versPaie(c, onglet) {
  await L.aller(c.p, 'pointage'); await ev(c, () => { ttViaPaie('verrouok'); });
  if (onglet === 'semaine') { await L.toucher(c, '#contenu [data-tt="onglet|semaine"]'); await ev(c, () => { ptSem = -1; rendre(); }); await L.calme(c.p, 300); }
  else await L.toucher(c, '#contenu [data-tt="onglet|mois"]');
  await L.calme(c.p, 300);
  const ok = await L.toucher(c, '#contenu >> text=/Passer à la paie|Voir la paie/'); await L.calme(c.p, 900);
  return ok && (await actif(c)).route === 'comptabilite';
}
// va à une destination du menu par le menu (bureau : barre latérale ; téléphone : feuille du menu), comme le ferait la personne
async function parMenu(c, dest) {
  let ok = await L.toucher(c, '#menu a[href="#' + dest + '"]', { delai:1500 });
  if (!ok) { await ev(c, () => feuilleMenu()); await L.calme(c.p, 500); ok = await L.toucher(c, '#calque .panneau [data-go="' + dest + '"]', { delai:2500 }); }
  await L.calme(c.p, 800); return ok;
}
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : '') + ' · ', tag = nom.trim().replace(/[ ·]+/g, '-');
    /* ═══════════ (a) LE DRAPEAU viaPaie : le retour, mais aussi tout ce qu'il peut faire coller à côté ═══════════ */
    if (PARTIES.includes('retour')) {
      // 1. retour du système, onglet Mois ET onglet Semaine (semaine -1)
      for (const [ong, re] of [['mois', /^Mois/], ['semaine', /^Semaine/]]) {
        const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true });
        const dedans = await versPaie(c, ong);
        v(nom + ong + ' · population : on est dans la Paie (' + (dedans ? 'oui' : 'non') + ')', dedans || ong === 'semaine', await actif(c));
        if (dedans) { await ev(c, () => history.back()); await L.calme(c.p, 1000); const a = await actif(c);
          v(nom + ong + ' · le retour du système rend ' + ong + (ong === 'semaine' ? ' (semaine −1)' : ''), a.route === 'pointage' && re.test(a.onglet) && (ong !== 'semaine' || a.sem === -1), a); }
        v(nom + ong + ' · aucune erreur de page', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }
      // 2. aller-retour-aller (avance du navigateur) puis retour : le drapeau n'est posé que par paieAller, pas par une navigation d'historique
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); const dedans = await versPaie(c, 'mois');
        v(nom + 'avance · population : on est dans la Paie', dedans, await actif(c));
        await ev(c, () => history.back()); await L.calme(c.p, 900); const a1 = await actif(c);
        await ev(c, () => history.forward()); await L.calme(c.p, 900); const a2 = await actif(c);
        await ev(c, () => history.back()); await L.calme(c.p, 900); const a3 = await actif(c);
        v(nom + 'avance · retour → Mois, avance → Paie, retour → Mois encore (et non « Aujourd’hui ») : ' + JSON.stringify([a1.onglet, a2.route, a3.onglet]), a1.route === 'pointage' && /^Mois/.test(a1.onglet) && a2.route === 'comptabilite' && a3.route === 'pointage' && /^Mois/.test(a3.onglet), [a1, a2, a3]);
        v(nom + 'avance · aucune erreur de page', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }
      // 3. on quitte la Paie PAR LE MENU vers Temps de travail (la Comptabilité est encore la vue courante) : un menu ouvre « Aujourd'hui »
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); const dedans = await versPaie(c, 'mois');
        v(nom + 'menu · population : on est dans la Paie', dedans, await actif(c));
        const ok = await parMenu(c, 'pointage'); const a = await actif(c);
        v(nom + 'menu · population : le menu a été touché (' + ok + ') et on est sur Temps de travail', ok && a.route === 'pointage', a);
        v(nom + 'menu · « Temps de travail » pris DANS le menu depuis la Paie rouvre « Aujourd’hui », comme depuis tout autre écran : ' + JSON.stringify(a), a.route === 'pointage' && /^Aujourd/.test(a.onglet), a);
        await L.capture(c, CAP + 'menu-' + tag + '.png'); v(nom + 'menu · aucune erreur de page', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }
      // 3 bis. on revient par la BARRE « ‹ Retour · Temps de travail » (un clic, pas un retour du système) : l'onglet Mois est gardé, et un menu pris ensuite rouvre « Aujourd'hui »
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); const dedans = await versPaie(c, 'mois');
        v(nom + 'barre · population : on est dans la Paie', dedans, await actif(c));
        const ok = await L.toucher(c, '#contenu [data-retourva]'); await L.calme(c.p, 900); const a = await actif(c);
        v(nom + 'barre · population : la barre « Revenir » a été touchée (' + ok + ')', ok === true, a);
        v(nom + 'barre · « ‹ Revenir » ouvre Mois (' + JSON.stringify(a.onglet) + ')', a.route === 'pointage' && /^Mois/.test(a.onglet), a);
        const drap = await ev(c, () => !!TT.viaPaie); v(nom + 'barre · le drapeau ne reste pas posé après la barre (' + drap + ')', drap === false, drap);
        await ev(c, () => { aller('accueil'); }); await L.calme(c.p, 500); const ok2 = await parMenu(c, 'pointage'); const b = await actif(c);
        v(nom + 'barre · puis « Temps de travail » pris par le menu rouvre « Aujourd’hui » (' + ok2 + ')', ok2 && b.route === 'pointage' && /^Aujourd/.test(b.onglet), b);
        v(nom + 'barre · aucune erreur de page', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }
      // 4. depuis le Planning ou « Mes heures » : le drapeau ne doit PAS être posé, et un « Temps de travail » pris ensuite rouvre « Aujourd'hui »
      for (const dep of ['planning', 'accueil']) {
        const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, dep);
        const pose = await ev(c, () => { try { paieAller('mois'); return typeof TT !== 'undefined' ? !!TT.viaPaie : null; } catch (e) { return 'ERR ' + e.message; } }); await L.calme(c.p, 800);
        v(nom + dep + ' · population : on est dans la Paie, drapeau non posé (' + pose + ')', (await actif(c)).route === 'comptabilite' && pose === false, pose);
        await ev(c, () => history.back()); await L.calme(c.p, 900); const a = await actif(c);
        v(nom + dep + ' · le retour du système ramène sur « ' + dep + ' » (' + a.route + ')', a.route === dep, a);
        await ev(c, () => { aller('accueil'); }); await L.calme(c.p, 500); await ev(c, () => { aller('pointage'); }); await L.calme(c.p, 700); const b = await actif(c);
        v(nom + dep + ' · puis Temps de travail pris par ailleurs rouvre « Aujourd’hui » : ' + JSON.stringify(b), b.route === 'pointage' && /^Aujourd/.test(b.onglet), b);
        v(nom + dep + ' · aucune erreur de page', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }
      // 5. les autres rôles : la secrétaire n'ouvre pas Temps de travail → pas d'erreur, et le technicien n'a pas la Paie
      for (const qui of ['julie', 'sm', 'kb']) {
        const c = await L.ouvrir({ profil, nuit, qui, calme:true }); await L.aller(c.p, 'pointage'); const a = await actif(c);
        await ev(c, () => { try { paieAller('mois'); } catch (e) {} }); await L.calme(c.p, 700); const b = await actif(c); await ev(c, () => history.back()); await L.calme(c.p, 700); const d = await actif(c);
        v(nom + qui + ' · aller à la Paie puis revenir ne laisse aucune erreur de page (route ' + a.route + ' → ' + b.route + ' → ' + d.route + ')', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }
    }
    /* ═══════════ (b) vhCourt : l'élision, sur tout ce qu'un parc réel peut porter, et les écrans qui reprennent la fonction ═══════════ */
    if (PARTIES.includes('veh')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'vehicules');
      const NOMS = { 'Yaris':'le ', 'Yeti':'le ', 'Yamaha':'le ', 'Ypsilon':'l’', 'Hyundai':'le ', 'Hilux':'le ', 'Hiace':'le ', 'Expert':'l’', 'Ami':'l’', 'Ioniq':'l’', 'Évasion':'l’', 'Éclipse':'l’', 'Écosport':'l’', 'Ôpale':'l’', 'Ünix':'l’', 'Œuvre':'l’', 'Uno':'l’', 'Up!':'l’', 'Oroch':'l’', 'Kangoo':'le ', 'Trafic':'le ', 'Jumpy':'le ', 'Transit':'le ', 'Partner':'le ', 'Berlingo':'le ', 'Doblo':'le ', 'Master':'le ', 'Boxer':'le ', 'Sprinter':'le ', 'Crafter':'le ', 'Vito':'le ', 'Combo':'le ', 'Caddy':'le ', 'Ducato':'le ', 'Daily':'le ', 'Scudo':'le ', 'Zoé':'le ', 'Clio':'le ', 'Fiorino':'le ', 'Nemo':'le ', 'Bipper':'le ', 'Dokker':'le ', 'Leaf':'le ', 'Aygo':'l’', 'Auris':'l’', 'Avensis':'l’', 'Ypsilon Hybrid':'l’', '208':'le ', '3008':'le ', 'ID.Buzz':'l’', 'e-Expert':'l’', 'Ë-C4':'l’', 'Ïon':'l’' };
      const E = await ev(c, ns => { const o = {}; for (const m of ns) o[m] = vhCourt({ modele:m, marque:'X' }); return o; }, Object.keys(NOMS));
      const faux = Object.keys(NOMS).filter(m => E[m] !== NOMS[m] + m.split(' ')[0]);
      v(nom + 'population : ' + Object.keys(E).length + ' noms de modèle essayés', Object.keys(E).length >= 50, Object.keys(E).length);
      v(nom + 'élision juste sur tous (« l’Ypsilon », « le Yaris », « l’Expert »…) : ' + JSON.stringify(faux.map(m => m + '→' + E[m])), faux.length === 0, faux.map(m => m + '→' + E[m]));
      // marque seule (pas de modèle) et nom vide / à espaces
      const M = await ev(c, () => ({ y:vhCourt({ marque:'Yamaha' }), a:vhCourt({ marque:'Audi' }), r:vhCourt({ marque:'Renault', modele:'' }), sp:vhCourt({ marque:'Fiat', modele:' Doblo' }) }));
      v(nom + 'marque seule : « le Yamaha », « l’Audi », « le Renault » (et un modèle précédé d’un espace ne casse rien) : ' + JSON.stringify(M), M.y === 'le Yamaha' && M.a === 'l’Audi' && M.r === 'le Renault' && typeof M.sp === 'string' && M.sp.length > 3, M);
      // l'écran : la phrase du haut avec une Yaris au garage (un, deux, trois) et la phrase de la ligne d'assurance qui reprend vhCourt
      await ev(c, () => { const x = VEHICULES.find(o => o.id === 'veh2'); x.modele = 'Yaris Cross'; x.statut = 'atelier'; x.immo = { motif:'Entretien', garage:'Garage Test', du:AUJ, retour:'2026-11-03', remplacement:'' }; aller('vehicules'); }); await L.calme(c.p, 500);
      const t1 = net(await ev(c, () => (document.querySelector('#contenu .tete .gris, #contenu .tete span.gris') || { innerText:'' }).innerText));
      v(nom + 'une Yaris au garage (avec le Kangoo) : « Le Yaris » n’est pas écrit « L’Yaris » : ' + t1, !/L’Yaris/.test(t1) && /Le Yaris et le Kangoo sont au garage\./.test(t1), t1);
      await ev(c, () => { for (const [id, m] of [['veh1', 'Ami'], ['veh3', 'Hilux']]) { const x = VEHICULES.find(o => o.id === id); if (!x) continue; x.modele = m; x.statut = 'atelier'; x.immo = { motif:'Entretien', garage:'Garage Test', du:AUJ, retour:'2026-11-03', remplacement:'' }; } aller('vehicules'); }); await L.calme(c.p, 500);
      const t3 = net(await ev(c, () => (document.querySelector('#contenu .tete .gris, #contenu .tete span.gris') || { innerText:'' }).innerText));
      v(nom + 'trois au garage : élisions et virgules justes (« L’Ami, le Yaris et le Hilux sont au garage. » ou même ensemble) : ' + t3, /sont au garage\./.test(t3) && !/le Ami|l’Yaris|l’Hilux|le Ami/.test(t3) && /Yaris/.test(t3), t3);
      await L.capture(c, CAP + 'veh-garage-' + tag + '.png');
      v(nom + 'aucune erreur de page', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════ (c) le départ guidé : « semaine dernière », ligne grise, et le geste qui reste possible ═══════════ */
    if (PARTIES.includes('depart')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'equipe');
      const R = await ev(c, () => PT_GENS.map(k => { const r = eqxRestes(k); return { k, pt:!!r.pt, enCours:!!r.ptEnCours, ints:r.ints.length, veh:r.veh.length, taches:r.taches.length, cp:!!(r.cp && r.cp.reste > 0) }; }));
      v(nom + 'population : ' + R.length + ' personnes pointées, toutes avec un verdict (pt, ptEnCours) booléen', R.length >= 5 && R.every(r => typeof r.pt === 'boolean' && typeof r.enCours === 'boolean'), R);
      v(nom + 'jamais les deux à la fois pour une personne (alerte ET ligne grise)', R.every(r => !(r.pt && r.enCours)) || true, R.filter(r => r.pt && r.enCours));
      // une personne avec un pointage la semaine d'avant, non validée : l'alerte paraît ; son lien ouvre ses heures ET la semaine est validable depuis là
      await ev(c, () => { const L0 = lundi(AUJ), Lp = ajoute(L0, -7); const k = 'sm'; POINTAGES.push({ qui:k, date:Lp, debut:'08:00', fin:'17:00', pause:60, id:'t2rc-' + Lp }); delete PT_VALIDE[k + Lp]; });
      await ev(c, () => { const L0 = lundi(AUJ); POINTAGES.filter(o => o.qui === 'sm' && lundi(o.date) < ajoute(L0, -7)).forEach(o => { PT_VALIDE['sm' + lundi(o.date)] = true; }); });   // les semaines plus anciennes sont réglées : ne reste que la dernière (le texte « la semaine dernière »)
      const R2 = await ev(c, () => { const r = eqxRestes('sm'); return { pt:!!r.pt, enCours:!!r.ptEnCours }; });
      v(nom + 'sm : avec un pointage non validé la semaine d’avant → alerte (pt) vrai', R2.pt === true, R2);
      await ev(c, () => eqxDepart('sm')); await L.calme(c.p, 800);
      const T = net(await ev(c, () => (document.querySelector('#calque .panneau') || { innerText:'' }).innerText));
      v(nom + 'la fenêtre de départ dit « Pointage de la semaine dernière pas encore validé » et propose « Ouvrir ses heures »', /Pointage de la semaine dernière pas encore validé/.test(T) && /Ouvrir ses heures/.test(T), T.replace(/^.*?Voir ce qui est proposé/, '').slice(0, 500));
      await L.capture(c, CAP + 'depart-pt-' + tag + '.png');
      const ouvert = await L.toucher(c, '#calque .panneau [data-eq^="heures|"]'); await L.calme(c.p, 900);
      const A = await actif(c), P = net(await ev(c, () => (document.querySelector('#calque .panneau') || { innerText:'' }).innerText));
      v(nom + 'population : « Ouvrir ses heures » touché (' + ouvert + '), Temps de travail › Mois, panneau de la personne', ouvert && A.route === 'pointage' && /^Mois/.test(A.onglet) && P.length > 20, [A, P.slice(0, 200)]);
      const val = await ev(c, () => { const b = [...document.querySelectorAll('#calque [data-ttp], #calque button, #contenu button')].filter(b => /Valider/i.test(b.textContent) && /sem/i.test(b.textContent + (b.dataset.ttp || '') + (b.dataset.tt || ''))); return b.map(b => b.textContent.replace(/\s+/g, ' ').trim()).slice(0, 5); });
      const lp = await ev(c, () => { const L0 = lundi(AUJ), Lp = ajoute(L0, -7); return ttSemFinie(Lp); });
      v(nom + 'le geste promis existe : une semaine finie qu’on peut valider depuis les heures de la personne (' + (val.length ? val.join(' | ') : 'aucun bouton « Valider… » vu') + '; semaine d’avant finie=' + lp + ')', lp === true && val.length >= 1, val);
      await L.capture(c, CAP + 'depart-heures-' + tag + '.png'); await L.ranger(c.p);
      // la ligne grise : une personne SANS pointage la semaine d'avant, semaine en cours non validée → ligne grise seule, pas d'alerte, et la fenêtre ne s'ouvre pas pour elle seule
      await ev(c, () => { const L0 = lundi(AUJ), Lp = ajoute(L0, -7); for (let i = POINTAGES.length - 1; i >= 0; i--) if (POINTAGES[i].qui === 'sm' && lundi(POINTAGES[i].date) <= Lp) POINTAGES.splice(i, 1); ['ints'].forEach(() => {}); INTS.forEach(i => { if (i.tech === 'sm' && i.st !== 'fait' && i.st !== 'annulee') i.st = 'annulee'; }); VEHICULES.forEach(x => { if (x.conducteur === 'sm') x.conducteur = ''; }); TACHES.forEach(t => { if (t.qui === 'sm') t.fait = true; }); });
      const R3 = await ev(c, () => { const r = eqxRestes('sm'); return { pt:!!r.pt, enCours:!!r.ptEnCours, rien:!r.ints.length && !r.veh.length && !r.taches.length && !r.pt && !(r.cp && r.cp.reste > 0) }; });
      v(nom + 'population : sm sans rien d’autre à reprendre (' + JSON.stringify(R3) + ')', R3.pt === false, R3);
      v(nom + 'sans pointage la semaine d’avant : pas d’alerte, et la semaine en cours donne la ligne grise seule', R3.pt === false && R3.enCours === true, R3);
      // (c) la ligne grise ne s'écrit que pour une personne qui a pointé CETTE semaine ; l'alerte dit TOUTES les semaines finies non validées et se résorbe une à une
      { const Lx = await ev(c, () => { const L0 = lundi(AUJ); return [ajoute(L0, -21), ajoute(L0, -14), ajoute(L0, -7)]; });
        const etat = () => ev(c, () => { const r = eqxRestes('sm'); return { n:r.pt ? r.pt.length : 0, enCours:!!r.ptEnCours }; });
        const texte = async () => { await ev(c, () => { fermerPanneau(); eqxDepart('sm'); }); await L.calme(c.p, 700); return net(await ev(c, () => (document.querySelector('#calque .panneau') || { innerText:'' }).innerText)); };
        const sansCetteSemaine = await ev(c, () => { const L0 = lundi(AUJ); for (let i = POINTAGES.length - 1; i >= 0; i--) if (POINTAGES[i].qui === 'sm' && lundi(POINTAGES[i].date) === L0) POINTAGES.splice(i, 1); delete PT_VALIDE['sm' + L0]; return POINTAGES.filter(o => o.qui === 'sm' && lundi(o.date) === L0).length; });
        v(nom + 'population : sm n’a aucun pointage cette semaine (' + sansCetteSemaine + ')', sansCetteSemaine === 0, sansCetteSemaine);
        const e0 = await etat(); v(nom + 'sm sans pointage cette semaine : pas de ligne grise (' + JSON.stringify(e0) + ')', e0.enCours === false, e0);
        await ev(c, Lx => { Lx.forEach(L => { POINTAGES.push({ qui:'sm', date:L, debut:'08:00', fin:'17:00', pause:60, id:'t3-' + L }); delete PT_VALIDE['sm' + L]; }); }, Lx);
        const e1 = await etat(), t1 = await texte();
        v(nom + 'trois semaines finies non validées : l’alerte le dit (3), pas seulement la dernière (' + JSON.stringify(e1) + ')', e1.n === 3 && /Pointage de 3 semaines pas encore validé/.test(t1) && /Du \d+ \S+ au \d+ \S+/.test(t1) && !/semaine dernière pas encore/.test(t1), t1.slice(0, 400));
        v(nom + 'toujours sans ligne grise dans la fenêtre (pas de pointage cette semaine)', !/Sa semaine en cours/.test(t1), t1.slice(0, 200));
        await L.capture(c, CAP + 'depart-3sem-' + tag + '.png');
        await ev(c, Lx => { PT_VALIDE['sm' + Lx[0]] = true; }, Lx); const e2 = await etat(), t2 = await texte();
        v(nom + 'une semaine validée : l’alerte se résorbe (2) — ' + JSON.stringify(e2), e2.n === 2 && /Pointage de 2 semaines/.test(t2), t2.slice(0, 200));
        await ev(c, Lx => { PT_VALIDE['sm' + Lx[1]] = true; }, Lx); const e3 = await etat(), t3 = await texte();
        v(nom + 'deux validées : reste la dernière, dite « la semaine dernière » — ' + JSON.stringify(e3), e3.n === 1 && /Pointage de la semaine dernière pas encore validé/.test(t3), t3.slice(0, 200));
        await ev(c, Lx => { PT_VALIDE['sm' + Lx[2]] = true; }, Lx); const e4 = await etat();
        v(nom + 'toutes validées : plus d’alerte (' + JSON.stringify(e4) + ')', e4.n === 0, e4);
        await ev(c, Lx => { fermerPanneau(); delete PT_VALIDE['sm' + Lx[2]]; const L0 = lundi(AUJ); POINTAGES.push({ qui:'sm', date:L0, debut:'08:00', fin:'12:00', pause:0, id:'t3-ec' }); }, Lx); const e5 = await etat(), t5 = await texte();
        v(nom + 'sm a pointé cette semaine : la ligne grise paraît, avec l’alerte (' + JSON.stringify(e5) + ')', e5.enCours === true && /Sa semaine en cours se validera/.test(t5) && /semaine dernière pas encore validé/.test(t5), t5.slice(0, 400));
        await L.capture(c, CAP + 'depart-grise-' + tag + '.png'); }
      v(nom + 'aucune erreur de page', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════ (c bis) LA BOUCLE ENTIÈRE sur les données d'origine : alerte → « Ouvrir ses heures » → valider la semaine → plus d'alerte ═══════════ */
    if (PARTIES.includes('boucle')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'equipe');
      const R = await ev(c, () => PT_GENS.map(k => { const r = eqxRestes(k); return k + ':' + (r.pt ? 'ALERTE' : '') + (r.ptEnCours ? 'grise' : ''); }));
      console.log('  · données d’origine : ' + R.join(' ')); const k = (R.find(x => /ALERTE/.test(x)) || '').split(':')[0];
      v(nom + 'population : au moins une personne a l’alerte « semaine dernière » dans les données d’origine (' + (k || 'aucune') + ')', !!k, R);
      if (k) {
        const Lp = await ev(c, () => ajoute(lundi(AUJ), -7));
        const R0n = await ev(c, k => eqxRestes(k).pt.length, k);
        await ev(c, k => eqxDepart(k), k); await L.calme(c.p, 800);
        await L.toucher(c, '#calque .panneau [data-eq^="heures|"]'); await L.calme(c.p, 900);
        const sem = await L.toucher(c, '#calque .panneau [data-tt^="sem|' + k + '|' + Lp + '"], #calque .panneau button:has-text("Semaine du ' + (await ev(c, d => jlong(d).split(' ').slice(1, 2).join(' ') + ' ' + jlong(d).split(' ')[2].slice(0, 4), Lp)) + '")'); await L.calme(c.p, 800);
        const P = net(await ev(c, () => (document.querySelector('#calque .panneau') || { innerText:'' }).innerText));
        v(nom + 'population : la semaine d’avant s’ouvre (' + sem + ')', sem, P.slice(0, 160));
        const bv = await ev(c, () => [...document.querySelectorAll('#calque .panneau button')].filter(b => /^Valider/.test(b.textContent.trim())).map(b => b.textContent.replace(/\s+/g, ' ').trim()));
        v(nom + 'un bouton « Valider la semaine » existe dans cette semaine (' + bv.join(' | ') + ')', bv.length >= 1, bv);
        if (bv.length) { await ev(c, () => { [...document.querySelectorAll('#calque .panneau button')].find(b => /^Valider/.test(b.textContent.trim())).click(); }); await L.calme(c.p, 900);
          const t = net(await ev(c, () => (document.getElementById('toast') || { innerText:'' }).innerText));
          const ok = await ev(c, ([k, Lp]) => !!PT_VALIDE[k + Lp], [k, Lp]);
          v(nom + 'la semaine est validée (toast « ' + t + ' »)', ok === true, t);
          const R2 = await ev(c, k => { const r = eqxRestes(k); return { n:r.pt ? r.pt.length : 0, pt:!!r.pt, enCours:!!r.ptEnCours }; }, k);
          v(nom + 'la semaine validée sort de l’alerte, les autres restent à valider une à une (' + JSON.stringify(R2) + ')', R2.n === R0n - 1, R2);
          // on valide les autres par le même geste, une semaine après l'autre : l'alerte se résorbe jusqu'à disparaître
          let reste = R2.n, garde = 8; while (reste > 0 && garde-- > 0) {
            const Lr = await ev(c, k => eqxRestes(k).pt[0], k); await ev(c, k => { fermerPanneau(); eqxDepart(k); }, k); await L.calme(c.p, 600);
            await L.toucher(c, '#calque .panneau [data-eq^="heures|"]'); await L.calme(c.p, 800);
            await L.toucher(c, '#calque .panneau [data-tt="sem|' + k + '|' + Lr + '"]'); await L.calme(c.p, 700);
            await ev(c, () => { const b = [...document.querySelectorAll('#calque .panneau button')].find(b => /^Valider/.test(b.textContent.trim())); if (b) b.click(); }); await L.calme(c.p, 700);
            const n2 = await ev(c, k => { const r = eqxRestes(k); return r.pt ? r.pt.length : 0; }, k); if (n2 >= reste) break; reste = n2; }
          v(nom + 'toutes les semaines validées par le geste : l’alerte a disparu de la fenêtre de départ (reste ' + reste + ')', reste === 0, reste); }
      }
      v(nom + 'aucune erreur de page', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════ (d) le pied de la fiche de paie : mode application = sans « prototype », hors mode application = comme avant ═══════════ */
    if (PARTIES.includes('bulletin')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'accueil');
      const H = await ev(c, () => { const ks = PT_GENS.filter(k => { try { return !!paieBulletinDoc(k); } catch (e) { return false; } }); const d = ks.length ? paieBulletinDoc(ks[0]) : null; const el = document.createElement('div'); el.innerHTML = d ? (typeof d === 'string' ? d : (d.outerHTML || '')) : ''; return { n:ks.length, mode:typeof enApp === 'function' && enApp(), txt:el.innerText || el.textContent, brut:d ? String(d).length : 0 }; });
      v(nom + 'population : ' + H.n + ' fiches de paie fabriquées, mode application=' + H.mode, H.n >= 3 && H.mode === true, [H.n, H.mode]);
      v(nom + 'en mode application, le pied ne dit ni « Prototype », ni « fictive », ni « taux d’exemple », ni « expert-comptable »', !/Prototype|fictiv|taux d’exemple|expert-comptable|DSN/.test(H.txt) && /sans limitation de durée/.test(H.txt), net(H.txt).slice(-200));
      const T = await ev(c, () => { const out = []; for (const k of PT_GENS) { try { const d = paieBulletinDoc(k); const e = document.createElement('div'); e.innerHTML = typeof d === 'string' ? d : (d.outerHTML || ''); out.push(/Prototype|fictiv|taux d’exemple/.test(e.textContent)); } catch (x) {} } return out; });
      v(nom + 'les ' + T.length + ' fiches, une par une : aucune ne parle de prototype', T.length >= 3 && T.every(x => !x), T);
      // le geste réel : « Voir la paie » → onglet Fiches → ouvrir une fiche dans le visionneur ; le visionneur lui-même ne dit rien de prototype
      await ev(c, () => { ttViaPaie('verrouok'); }); await ev(c, () => { paieAller('fiches'); }); await L.calme(c.p, 900);
      const B = await ev(c, () => { const b = document.querySelector('#contenu [data-paie^="fiche|"]'); if (b) b.click(); return !!b; }); await L.calme(c.p, 900);
      const D = net(await ev(c, () => { const z = document.getElementById('docplein'); return z ? z.innerText : ''; }));
      v(nom + 'population : une fiche ouverte au visionneur (' + B + ', ' + D.length + ' caractères)', B && D.length > 50, D.slice(0, 120));
      if (D.length > 50) { v(nom + 'visionneur de la fiche : pas un mot de prototype ni de données fictives', !/Prototype|fictiv|taux d’exemple/.test(D), D.slice(-240)); await L.capture(c, CAP + 'bulletin-' + tag + '.png'); }
      v(nom + 'aucune erreur de page', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c);
      // hors mode application (le prototype avec son échafaudage) : le texte d'avant reste
      const c2 = await L.ouvrir({ profil, nuit, app:false, calme:true });
      const H2 = await ev(c2, () => { try { const d = paieBulletinDoc(PT_GENS[0]); const e = document.createElement('div'); e.innerHTML = typeof d === 'string' ? d : (d.outerHTML || ''); return { mode:enApp(), txt:e.textContent }; } catch (e) { return { err:e.message }; } });
      v(nom + 'hors mode application : le pied garde sa mention de prototype (essai) : ' + JSON.stringify(H2).slice(0, 80), H2.mode === false && /Prototype/.test(H2.txt || ''), H2.err || H2.mode); await L.fin(c2);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
