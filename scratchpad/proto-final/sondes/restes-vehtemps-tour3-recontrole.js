// Restes « vehtemps », tour 3 — RECONTRÔLE ADVERSE : (a) TT.viaPaie / TT.sys, (c) eqxRestes (toutes les semaines, ligne grise), (d) vhCourt, bulletin.
// Chemins DIFFÉRENTS de la sonde du tour 2 : clic réel sur lien de menu, retour par la barre, rechargement à chaud, adresse tapée, retour rapide après un clic,
// Planning / Mes heures, rôle technicien, personne sans pointage, mois verrouillé.
//   PROFILS=mac,iphone,…  NUIT=0,1  PARTIES=retour,depart,voisins
const L = require('../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-vt-t3rc/';
const ev = (c, f, a) => c.p.evaluate(f, a);
const PROFILS = (process.env.PROFILS || 'mac').split(','), NUITS = (process.env.NUIT || '0').split(',').map(x => x === '1'), PARTIES = (process.env.PARTIES || 'retour,depart,voisins').split(',');
const actif = c => ev(c, () => ({ route, onglet:((document.querySelector('#contenu .seg [aria-pressed="true"]') || { innerText:'' }).innerText || '').replace(/\s+/g, ' ').trim(), viaPaie:TT.viaPaie, sys:TT.sys }));
const sansErr = c => c.err.filter(x => !/ERR_/.test(x));
const att = (c, ms) => L.calme(c.p, ms || 800);
async function versPaieParBouton(c, sansVerrou) { // Temps de travail › Mois › le vrai bouton (mois verrouillé : « Voir la paie ») ou, sans verrou, paieAller depuis Temps de travail
  await L.aller(c.p, 'pointage'); if (sansVerrou) { await L.toucher(c, '#contenu [data-tt="onglet|mois"]'); await att(c, 300); await ev(c, () => paieAller('mois')); await att(c, 900); return (await actif(c)).route === 'comptabilite'; }
  await ev(c, () => { ttViaPaie('verrouok'); }); await L.toucher(c, '#contenu [data-tt="onglet|mois"]'); await att(c, 400);
  const ok = await L.toucher(c, '#contenu >> text=/Passer à la paie|Voir la paie/'); await att(c, 900); return ok && (await actif(c)).route === 'comptabilite'; }
async function menuTemps(c) { // clic réel sur le lien du menu, ou la feuille du menu sur téléphone
  let ok = await L.toucher(c, '#menu a[href="#pointage"]', { delai:1500 });
  if (!ok) { await ev(c, () => feuilleMenu()); await att(c, 500); ok = await L.toucher(c, '#calque .panneau [data-go="pointage"]', { delai:2500 }); }
  await att(c, 900); return ok; }
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : '') + ' · ', tag = nom.trim().replace(/[ ·]+/g, '-');
    if (PARTIES.includes('retour')) {
      // R1 : Paie par le bouton, puis clic RÉEL sur le menu (hash change par le lien, pas par aller) → Aujourd'hui ; puis retour système → ? ; avance ; retour
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); const d = await versPaieParBouton(c); v(nom + 'R1 population : dans la Paie', d, await actif(c));
        const ok = await menuTemps(c); const a = await actif(c);
        v(nom + 'R1 menu (clic réel) depuis la Paie ouvre Aujourd’hui (menu touché ' + ok + ')', ok && a.route === 'pointage' && /^Aujourd/.test(a.onglet), a);
        await ev(c, () => history.back()); await att(c, 900); const b = await actif(c);
        await ev(c, () => history.forward()); await att(c, 900); const f = await actif(c);
        v(nom + 'R1 après le menu : retour/avance ne ressuscitent pas Mois (' + JSON.stringify([b.route, b.onglet, f.route, f.onglet]) + ')', f.route === 'pointage' && /^Aujourd/.test(f.onglet), [b, f]);
        v(nom + 'R1 aucune erreur', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }
      // R2 : rechargement à chaud DANS la Paie, puis retour système → Temps de travail doit s'ouvrir (Aujourd'hui, drapeau perdu) sans erreur
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); const d = await versPaieParBouton(c); v(nom + 'R2 population : dans la Paie', d, await actif(c));
        await c.p.reload(); await att(c, 1500); try { await ev(c, () => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); } catch (e) {}
        const a0 = await actif(c); await ev(c, () => history.back()); await att(c, 1000); const a = await actif(c);
        v(nom + 'R2 après rechargement, le retour ne plante pas (' + JSON.stringify([a0.route, a.route, a.onglet]) + ')', sansErr(c).length === 0 && ['pointage', 'accueil', 'comptabilite'].includes(a.route), [a0, a, c.err.slice(0, 2)]); await L.fin(c); }
      // R2b : sans verrou (paieAller depuis Temps de travail, onglet Mois) → retour système → Mois
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); const d = await versPaieParBouton(c, true); v(nom + 'R2b population : dans la Paie (sans verrou)', d, await actif(c));
        await ev(c, () => history.back()); await att(c, 900); const a = await actif(c); v(nom + 'R2b retour système sans verrou : Mois (' + a.onglet + ')', a.route === 'pointage' && /^Mois/.test(a.onglet), a); await L.fin(c); }
      // R3 : adresse tapée (#pointage) depuis la Paie : ni menu ni retour — on constate seulement qu'aucune vue morte ne sort
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); const d = await versPaieParBouton(c);
        await ev(c, () => { location.hash = 'pointage'; }); await att(c, 900); const a = await actif(c);
        v(nom + 'R3 adresse tapée #pointage depuis la Paie : une vue valide s’ouvre (' + a.onglet + ')', a.route === 'pointage' && /^(Aujourd|Mois|Semaine)/.test(a.onglet), a); await L.fin(c); }
      // R4 : retour système tout de suite après un clic sur un lien d'ancre quelconque (fenêtre de 700 ms de navClic) : le retour doit rouvrir Mois
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); const d = await versPaieParBouton(c);
        await ev(c, () => { const a = document.createElement('a'); a.href = '#comptabilite'; a.hidden = true; document.body.appendChild(a); a.click(); a.remove(); history.back(); }); await att(c, 1000); const a = await actif(c);
        v(nom + 'R4 retour système < 700 ms après un clic d’ancre : rouvre Mois (' + JSON.stringify(a.onglet) + ')', a.route === 'pointage' && /^Mois/.test(a.onglet), a); await L.fin(c); }
      // R5 : Paie par le bouton, puis la barre ‹ Revenir (clic réel), puis Paie à nouveau par bouton, puis menu : Aujourd'hui ; puis à la main : Planning › Temps : Aujourd'hui
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); let d = await versPaieParBouton(c);
        await L.toucher(c, '#contenu [data-retourva]'); await att(c, 900); const a = await actif(c);
        v(nom + 'R5 barre ‹ Revenir : Mois', a.route === 'pointage' && /^Mois/.test(a.onglet), a);
        d = await L.toucher(c, '#contenu >> text=/Passer à la paie|Voir la paie/'); await att(c, 900);
        await ev(c, () => history.back()); await att(c, 900); const b = await actif(c);
        v(nom + 'R5 Paie bouton → retour système : Mois encore', b.route === 'pointage' && /^Mois/.test(b.onglet), b);
        await ev(c, () => aller('planning')); await att(c, 600); await ev(c, () => aller('pointage')); await att(c, 800); const e = await actif(c);
        v(nom + 'R5 Planning puis Temps de travail : Aujourd’hui', e.route === 'pointage' && /^Aujourd/.test(e.onglet), e);
        await L.capture(c, CAP + 'r5-' + tag + '.png'); v(nom + 'R5 aucune erreur', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }
      // R6 : depuis le Planning (lien réel), Paie, retour : on revient au Planning ; et la barre « Revenir » du Planning ne montre pas « Temps de travail »
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'planning');
        await ev(c, () => paieAller('mois')); await att(c, 900); const txt = await ev(c, () => (document.querySelector('[data-retourva]') || { innerText:'' }).innerText);
        v(nom + 'R6 Planning › Paie : la barre dit « Planning » (' + txt + ')', /Planning/.test(txt), txt);
        await L.toucher(c, '#contenu [data-retourva]'); await att(c, 800); const a = await actif(c);
        v(nom + 'R6 barre ramène au Planning (' + a.route + ')', a.route === 'planning', a);
        await ev(c, () => aller('pointage')); await att(c, 700); const b = await actif(c);
        v(nom + 'R6 puis Temps de travail : Aujourd’hui', /^Aujourd/.test(b.onglet), b); await L.fin(c); }
      // R7 : rôles — technicienne (sm), chef d'équipe (kb), secrétaire : Temps de travail (s'il s'ouvre) et la Paie ne cassent pas ; viaPaie jamais collé
      for (const qui of ['sm', 'kb', 'julie', 'lr']) {
        const c = await L.ouvrir({ profil, nuit, qui, calme:true });
        const r = await ev(c, () => ({ voit:droitVoit('pointage'), paie:rlPermis('comptabilite') })); await L.aller(c.p, 'pointage'); const a = await actif(c);
        await ev(c, () => { try { paieAller('mois'); } catch (e) {} }); await att(c, 700); const b = await actif(c); await ev(c, () => history.back()); await att(c, 800); const d = await actif(c);
        await ev(c, () => { aller('pointage'); }); await att(c, 700); const e = await actif(c);
        v(nom + 'R7 ' + qui + ' (voit pointage ' + r.voit + ', paie ' + r.paie + ') : ' + [a.route, b.route, d.route, d.onglet, e.route, e.onglet].join('›') + ' · drapeau ' + e.viaPaie, sansErr(c).length === 0 && e.viaPaie !== true, c.err.slice(0, 3));
        if (r.voit && r.paie) v(nom + 'R7 ' + qui + ' : Temps de travail repris par aller() ouvre Aujourd’hui', /^Aujourd/.test(e.onglet) || e.route !== 'pointage', e);
        await L.fin(c); }
      // R8 : mois verrouillé : Paie par bouton, retour, Mois toujours ; ligne alertes sans exception
      { const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await ev(c, () => { ttViaPaie('verrouok'); }); await att(c, 500);
        const d = await versPaieParBouton(c); await ev(c, () => history.back()); await att(c, 900); const a = await actif(c);
        v(nom + 'R8 mois verrouillé : retour système rouvre Mois (' + a.onglet + ')', d && a.route === 'pointage' && /^Mois/.test(a.onglet), a);
        await L.capture(c, CAP + 'r8-' + tag + '.png'); v(nom + 'R8 aucune erreur', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c); }
    }
    if (PARTIES.includes('depart')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true });
      const R = await ev(c, () => PT_GENS.map(k => { const r = eqxRestes(k); const brut = [...new Set(POINTAGES.filter(o => o.qui === k).map(o => lundi(o.date)))]; return { k, nPt:r.pt ? r.pt.length : 0, enCours:!!r.ptEnCours, pointeCetteSemaine:POINTAGES.some(o => o.qui === k && lundi(o.date) === lundi(AUJ)), brut:brut.length, L0:lundi(AUJ) }; }));
      v(nom + 'D1 population : ' + R.length + ' personnes, ' + R.filter(x => x.brut).length + ' avec des pointages', R.length > 0 && R.some(x => x.brut), R);
      v(nom + 'D1 ligne grise ⇔ pointé cette semaine et non validée', R.every(x => !x.enCours || x.pointeCetteSemaine), R.filter(x => x.enCours && !x.pointeCetteSemaine));
      // une personne SANS aucun pointage : on les efface (copie jetable), l'alerte et la ligne grise doivent se taire
      const S = await ev(c, () => { const k = 'tl'; const sauve = POINTAGES.filter(o => o.qui === k); for (let i = POINTAGES.length - 1; i >= 0; i--) if (POINTAGES[i].qui === k) POINTAGES.splice(i, 1); const r = eqxRestes(k); let fen = ''; try { fermerPanneau(); eqxDepart(k); fen = document.querySelector('#calque .panneau') ? document.querySelector('#calque .panneau').innerText : ''; } catch (e) { fen = 'ERR ' + e.message; } return { r:{ pt:r.pt, enCours:r.ptEnCours }, fen:fen.slice(0, 400), sauve:sauve.length }; });
      v(nom + 'D2 sans aucun pointage (' + S.sauve + ' effacés) : ni alerte, ni ligne grise, aucune « semaine » dans la fenêtre', S.r.pt === false && !S.r.enCours && !/semaine/.test(S.fen.replace(/Avant de désactiver/, '')) , S);
      // une seule vieille semaine (5 oct.) : le libellé donne la date, pas « dernière »
      const U = await ev(c, () => { const k = 'sm'; const L0 = lundi(AUJ); const vieux = ajoute(L0, -35); const garde = POINTAGES.filter(o => o.qui === k); for (let i = POINTAGES.length - 1; i >= 0; i--) if (POINTAGES[i].qui === k) POINTAGES.splice(i, 1); Object.keys(PT_VALIDE).filter(x => x.startsWith(k)).forEach(x => delete PT_VALIDE[x]); POINTAGES.push({ id:'zz1', qui:k, date:vieux, deb:'08:00', fin:'16:00' }); let fen = ''; try { fermerPanneau(); eqxDepart(k); fen = document.querySelector('#calque .panneau').innerText; } catch (e) { fen = 'ERR ' + e.message; } const r = eqxRestes(k); return { vieux, n:r.pt && r.pt.length, fen:fen.replace(/\s+/g, ' ').slice(0, 500), cle:Object.keys(POINTAGES[0]).join() }; });
      v(nom + 'D3 une seule vieille semaine non validée : l’alerte la date (' + U.vieux + ')', U.n === 1 && /Pointage de la semaine du/.test(U.fen) && !/semaine dernière/.test(U.fen), U);
      await L.capture(c, CAP + 'd3-' + tag + '.png');
      v(nom + 'D aucune erreur', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c);
      // mois verrouillé : les semaines du mois verrouillé ne comptent plus ; « Ouvrir ses heures » ne ment pas
      const c2 = await L.ouvrir({ profil, nuit, qui:'marc', calme:true });
      const M = await ev(c2, () => { ttViaPaie('verrouok'); const out = PT_GENS.map(k => { const r = eqxRestes(k); const brut = [...new Set(POINTAGES.filter(o => o.qui === k).map(o => lundi(o.date)))].filter(Lx => ttSemFinie(Lx) && !PT_VALIDE[k + Lx]); return { k, pt:r.pt ? r.pt.length : 0, brut:brut.length, verr:brut.filter(Lx => ptxJours(Lx).every(d => paieMoisVerrou(d))).length }; }); return { out, mois:PAIE_MOIS }; });
      v(nom + 'D4 mois verrouillé : pt = non validées − celles dont tous les jours sont verrouillés', M.out.every(x => x.pt === x.brut - x.verr), M);
      v(nom + 'D4 population : au moins une semaine non validée avant verrou, ou aucune (dit)', M.out.some(x => x.brut > 0) || true, M.out.map(x => x.k + ':' + x.brut + '/' + x.verr + '/' + x.pt).join(' '));
      await L.fin(c2);
    }
    if (PARTIES.includes('voisins')) {
      // alertes voisines : l'accueil dit « Temps de travail · N choses à régler » : cohérent avec l'onglet ? ; vhCourt ; bulletin sans « Prototype » en mode appli
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true });
      const A = await ev(c, () => { const t = document.body.innerText; const m = t.match(/Temps de travail · [^\n]*/); return m && m[0]; });
      const V = await ev(c, () => ['Yaris', 'Élantra', 'Olivier', 'Yeti', 'Ypsilon', 'Hilux', 'Ã', 'Œuvre', '', 'Ibiza', 'Ulysse', 'Hybrid Y'].map(n => { try { return n + '=' + vhCourt({ modele:n, marque:'Marque' }); } catch (e) { return n + '=ERR'; } }));
      v(nom + 'V1 vhCourt (aucune exception) : ' + V.join(' | '), V.every(x => !/ERR/.test(x)), V);
      const B = await ev(c, () => { try { const d = paieBulletinDoc(PT_GENS[0]); const e = document.createElement('div'); e.innerHTML = typeof d === 'string' ? d : (d.outerHTML || ''); return { mode:enApp(), proto:/Prototype/.test(e.textContent), l:e.textContent.length }; } catch (e) { return { err:e.message }; } });
      v(nom + 'V2 bulletin en mode application : aucune mention « Prototype » (' + JSON.stringify(B) + ')', B.mode === true && B.proto === false && B.l > 100, B);
      v(nom + 'V3 alerte accueil (info) : ' + A, true, A);
      v(nom + 'V aucune erreur', sansErr(c).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
