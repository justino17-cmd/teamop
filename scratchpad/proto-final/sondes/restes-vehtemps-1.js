// Restes « vehtemps », tour 1 : les entrées restées ouvertes du recontrôle (étape 9) ET les cinq décisions du chef du 17/11 à 12 h 25, rejouées AU TOUCHER dans la page
// (mode application, entreprise fictive, 127.0.0.1 seulement). Chaque contrôle prouve sa population ; sort en 1 si un contrôle tombe.
//   PROFILS=mac,iphone,…  NUIT=0,1  PARTIES=veh,tt   (par défaut : mac, jour, les deux)
const L = require('../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-vt/';
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const PROFILS = (process.env.PROFILS || 'mac').split(','), NUITS = (process.env.NUIT || '0').split(',').map(x => x === '1'), PARTIES = (process.env.PARTIES || 'veh,tt').split(',');
const toast = c => ev(c, () => (document.getElementById('toast') || {}).textContent || '').then(net);
const panneau = c => ev(c, () => { const z = document.querySelector('#calque .panneau'); return z ? z.innerText : ''; }).then(net);
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : '') + ' · ';
    /* ═══════════════ VÉHICULES ═══════════════ */
    if (PARTIES.includes('veh')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'vehicules');
      // — « moiss », et le nombre de lignes de « Les dépenses · N » —
      const ids = await ev(c, () => VEHICULES.map(x => x.id)); v(nom + 'population : quatre véhicules', ids.length === 4, ids);
      const bandeV = await ev(c, () => { const g = document.querySelector('#contenu .seg[aria-label="Véhicules"]'), z = document.querySelector('#contenu').getBoundingClientRect(), r = g && g.getBoundingClientRect(); return g ? { g:r.width, z:z.width, n:g.querySelectorAll('button').length, w:[...g.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().width)) } : null; });
      v(nom + 'population : la bande d’onglets de Véhicules (3 onglets)', !!bandeV && bandeV.n === 3, bandeV);
      if (bandeV) v(nom + 'la bande d’onglets de Véhicules ' + (profil === 'mac' || profil === 'windows' || profil === 'ipad' ? 'prend la largeur de ses onglets (pas toute la ligne)' : 'garde ses colonnes égales sur toute la largeur'), (profil === 'mac' || profil === 'windows') ? bandeV.g < bandeV.z * 0.6 : (profil === 'iphone' || profil === 'android' || profil === 'petit') ? bandeV.g > bandeV.z * 0.9 && Math.max(...bandeV.w) - Math.min(...bandeV.w) <= 2 : true, bandeV);
      for (const id of ids) {
        await ev(c, i => { fermerPanneau(); vehFiche(i); }, id); await L.calme(c.p, 350); await L.toucher(c, '#calque [data-vh="fonglet|depenses"]');
        for (const per of ['mois', '12m', 'tout']) {
          await ev(c, ([i, p]) => { VX.periode = p; vehFiche(i); const b = document.querySelector('#calque [data-vh="fonglet|depenses"]'); if (b) b.click(); }, [id, per]); await L.calme(c.p, 250);
          const D = await ev(c, () => { const z = document.querySelector('#calque .panneau'); const h = [...z.querySelectorAll('h3')].find(e => /^Les dépenses/.test(e.textContent)); return { txt:z.innerText, n:z.querySelectorAll('.vh-fr').length, h:h ? h.textContent : '' }; });
          const annonce = parseInt((D.h.match(/·\s*(\d+)/) || [])[1], 10);
          v(nom + id + ' · ' + per + ' · population : une liste de dépenses', D.n >= 1, D.n);
          v(nom + id + ' · ' + per + ' : « Les dépenses · N » compte toutes les lignes (' + annonce + ' pour ' + D.n + ')', annonce === D.n, D.h);
          v(nom + id + ' · ' + per + ' : aucune faute « moiss »', !/moiss/.test(D.txt), (D.txt.match(/[^\n]*moiss[^\n]*/) || [''])[0]);
        }
      }
      await ev(c, () => { VX.periode = '12m'; fermerPanneau(); vehFiche('veh1'); }); await L.calme(c.p, 300); await L.toucher(c, '#calque [data-vh="fonglet|depenses"]');
      const ass = await ev(c, () => (document.querySelector('#calque .vh-fr-liss') || { innerText:'' }).innerText); v(nom + 'population : la ligne « Assurance » du Trafic existe', /Assurance/.test(ass), ass);
      v(nom + 'la ligne d’assurance dit « comptés 4 mois » (jamais « moiss »)', /comptés 4 mois\b/.test(net(ass)) && !/moiss/.test(ass), net(ass));
      // — le toast d'un document ajouté : le mot de l'écran, et l'accord —
      const T = await ev(c, () => { fermerPanneau(); const r = {}; for (const [k, f] of [['ct', 'a.pdf'], ['carte', 'b.pdf'], ['assur', 'c.pdf']]) { vxDocAjouter('veh1', k, new File(['x'], f, { type:'application/pdf' })); r[k] = (document.getElementById('toast') || {}).textContent || ''; } return r; });
      v(nom + 'toast du rapport de contrôle : « Le rapport du contrôle technique ajouté pour »', /^Le rapport du contrôle technique ajouté pour /.test(net(T.ct)), T.ct);
      v(nom + 'toast de la carte grise et de l’attestation : féminin conservé', /^La carte grise ajoutée pour /.test(net(T.carte)) && /^L’attestation d’assurance ajoutée pour /.test(net(T.assur)), [T.carte, T.assur]);
      // — au garage pour le contrôle technique : la ligne du CT le dit, PAS celle de la courroie ; l'élision de la phrase du haut —
      await ev(c, () => { fermerPanneau(); aller('vehicules'); }); await L.calme(c.p, 400);
      await ev(c, () => vehFiche('veh2')); await L.calme(c.p, 350);
      const af = await ev(c, () => [...document.querySelectorAll('#calque .vh-ech')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
      v(nom + 'population : l’Expert a deux échéances (contrôle technique, courroie)', af.length >= 2 && /Contrôle technique/.test(af.join('|')) && /Courroie/.test(af.join('|')), af);
      await L.toucher(c, '#calque >> text="Mettre au garage"'); const pg = await panneau(c);
      v(nom + 'la feuille « Mettre au garage » propose « Contrôle technique » par défaut', /Contrôle technique/.test(pg), pg.slice(0, 200));
      await L.toucher(c, '#calque .btn.large'); await L.calme(c.p, 500);
      const st = await ev(c, () => VEHICULES.find(x => x.id === 'veh2').statut); v(nom + 'l’Expert est au garage', st === 'atelier', st);
      await ev(c, () => { fermerPanneau(); vehFiche('veh2'); }); await L.calme(c.p, 400);
      const afg = await ev(c, () => [...document.querySelectorAll('#calque .vh-ech')].map(e => ({ t:e.innerText.replace(/\s+/g, ' ').trim(), b:[...e.querySelectorAll('button')].map(b => b.textContent.trim()) })));
      const lCt = afg.find(x => /Contrôle technique/.test(x.t)), lCo = afg.find(x => /Courroie/.test(x.t));
      v(nom + 'population : les deux lignes se retrouvent au garage', !!lCt && !!lCo, afg);
      if (lCt && lCo) {
        v(nom + 'la ligne du contrôle technique dit « Au garage jusqu’au lundi 2 novembre » et ne propose pas de rendez-vous', /Au garage jusqu’au/.test(lCt.t) && !lCt.b.some(x => /rendez-vous/i.test(x)), lCt);
        v(nom + 'la ligne de la courroie ne dit PAS « Au garage » (le garage a été noté pour le contrôle seul)', !/Au garage/.test(lCo.t), lCo);
      }
      await L.capture(c, CAP + 'veh-garage-ct-' + nom.trim().replace(/[ ·]+/g, '-') + '.png');
      // contre-épreuve : un garage pour « Entretien » couvre la courroie, pas le contrôle technique
      const ctr = await ev(c, () => { const v2 = VEHICULES.find(x => x.id === 'veh2'); v2.immo.motif = 'Entretien'; const E = vehEcheances(v2); return { ct:vhEchAuGarage(v2, E.find(e => e.k === 'ct')), ent:vhEchAuGarage(v2, E.find(e => e.k === 'entretien')) }; });
      v(nom + 'contre-épreuve : motif « Entretien » → la courroie est au garage, pas le contrôle technique', ctr.ent === true && ctr.ct === false, ctr);
      await ev(c, () => { VEHICULES.find(x => x.id === 'veh2').immo.motif = 'Contrôle technique'; });
      // — la phrase du haut de la liste : « L’Expert et le Kangoo sont au garage » —
      await ev(c, () => { fermerPanneau(); aller('vehicules'); }); await L.calme(c.p, 400);
      const ph = net(await ev(c, () => document.querySelector('#contenu .tete').innerText));
      v(nom + 'la liste dit « L’Expert et le Kangoo sont au garage » (jamais « Le Expert »)', /L’Expert et le Kangoo sont au garage/.test(ph) && !/Le Expert|le Expert/.test(ph), ph);
      // — le chiffre du haut : « payés en octobre », puis, après un renouvellement groupé, « dont l'assurance de l'année » —
      const tuile = () => ev(c, () => { const k = document.querySelector('#contenu .vh-k [data-vh="cout"]'); return k ? { n:k.querySelector('b').textContent, l:k.querySelector('span').innerText } : null; }).then(x => x && { n:net(x.n), l:net(x.l) });
      const t0 = await tuile(); v(nom + 'population : la tuile du coût existe', !!t0, t0);
      v(nom + 'la tuile dit « payés en octobre » (pas « dépensés ») et n’annonce aucune assurance tant qu’aucune prime n’est payée', t0 && /payés en octobre/.test(t0.l) && !/assurance/.test(t0.l), t0);
      const euros0 = L.cents(t0.n) / 100;
      const grp = await ev(c, () => !!document.querySelector('#contenu [data-vh^="groupe|"]')); v(nom + 'population : la ligne « Assurance · les 4 véhicules » est proposée', grp, grp);
      if (grp) {
        await L.toucher(c, '#contenu [data-vh^="groupe|"]'); await c.p.fill('#calque #vx-fm', '4200'); await L.toucher(c, '#calque .btn.large'); await L.calme(c.p, 600);
        const t1 = await tuile(); const euros1 = L.cents(t1.n) / 100;
        v(nom + 'après un renouvellement de 4 200 €, la tuile reste ce qui a été PAYÉ (' + euros0 + ' → ' + euros1 + ') et nomme la part « dont l’assurance de l’année : 4 200 € »', Math.round(euros1 - euros0) === 4200 && /dont l’assurance de l’année : 4 200 €/.test(t1.l), t1);
        await L.capture(c, CAP + 'veh-tuile-assurance-' + nom.trim().replace(/[ ·]+/g, '-') + '.png');
        await L.toucher(c, '#contenu [data-vh="cout"]'); const pc = await panneau(c);
        v(nom + '« Ce que coûtent les véhicules » dit la même chose : « payés en octobre (hors taxes) » et la part de l’assurance', /payés en octobre \(hors taxes\)/.test(pc) && /dont l’assurance de l’année : 4 200 €/.test(pc), pc.slice(0, 260));
        await L.capture(c, CAP + 'veh-cout-assurance-' + nom.trim().replace(/[ ·]+/g, '-') + '.png');
      }
      v(nom + 'aucune erreur de page (véhicules)', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════════ TEMPS DE TRAVAIL ═══════════════ */
    if (PARTIES.includes('tt')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
      // — la phrase sous le titre dit ce que les chiffres disent —
      const H = await ev(c, () => ({ phrase:([...document.querySelectorAll('#contenu *')].filter(e => !e.children.length && /^Aujourd’hui, /.test(e.textContent))[0] || { innerText:'' }).innerText, k:[...document.querySelectorAll('#contenu .tt-k1 .kpi')].map(e => e.innerText.replace(/\s+/g, ' ').trim()) }));
      const bandeT = await ev(c, () => { const g = document.querySelector('#contenu .seg[aria-label="Temps de travail"]'), z = document.querySelector('#contenu').getBoundingClientRect(), r = g && g.getBoundingClientRect(); return g ? { g:r.width, z:z.width, n:g.querySelectorAll('button').length, w:[...g.querySelectorAll('button')].map(b => Math.round(b.getBoundingClientRect().width)) } : null; });
      v(nom + 'population : la bande d’onglets de Temps de travail (3 onglets)', !!bandeT && bandeT.n === 3, bandeT);
      if (bandeT) v(nom + 'la bande d’onglets de Temps de travail ' + (profil === 'mac' || profil === 'windows' ? 'prend la largeur de ses onglets' : 'garde ses colonnes égales sur toute la largeur'), (profil === 'mac' || profil === 'windows') ? bandeT.g < bandeT.z * 0.6 : (profil === 'iphone' || profil === 'android' || profil === 'petit') ? bandeT.g > bandeT.z * 0.9 && Math.max(...bandeT.w) - Math.min(...bandeT.w) <= 2 : true, bandeT);
      const nAtt = parseInt((H.k.find(x => /pas encore commencé/.test(x)) || '').match(/\d+/), 10);
      v(nom + 'population : des personnes « pas encore commencé » dans les chiffres', nAtt >= 1, H.k);
      v(nom + 'la phrase du haut dit « ' + nAtt + ' pas encore commencé » comme les chiffres', new RegExp(nAtt + ' pas encore commencé').test(net(H.phrase)), H.phrase);
      // — « Qui est où » : une intervention en cours, rien de pointé —
      const Q = await ev(c, () => { const e = ttEtats().find(x => x.etat === 'attendu' && x.tourne); return e ? { k:e.k, nom:H_NOM(e.k), h:e.tourne.h, st:e.tourne.st } : null; });
      v(nom + 'population : quelqu’un a une intervention qui a démarré sans pointage (Sophie, 08:30)', !!Q, Q);
      if (Q) { const lig = net(await ev(c, nm => { const l = [...document.querySelectorAll('#contenu .tt-l')].find(e => e.innerText.includes(nm)); return l ? l.innerText : ''; }, Q.nom));
        v(nom + 'sa ligne dit « Une intervention est en cours depuis ' + Q.h + ', rien n’est pointé »', new RegExp('Une intervention est en cours depuis ' + Q.h + ', rien n’est pointé').test(lig) && /Pas encore commencé/.test(lig) && /Lui rappeler/.test(lig), lig); }
      const sansInt = net(await ev(c, () => { const e = ttEtats().filter(x => x.etat === 'attendu' && !x.tourne)[0]; if (!e) return ''; const l = [...document.querySelectorAll('#contenu .tt-l')].find(x => x.innerText.includes(H_NOM(e.k))); return l ? l.innerText : ''; }));
      v(nom + 'contre-épreuve : une personne attendue SANS intervention démarrée garde « devait commencer à »', sansInt === '' || /devait commencer à/.test(sansInt), sansInt);
      await L.capture(c, CAP + 'tt-auj-' + nom.trim().replace(/[ ·]+/g, '-') + '.png');
      // — la semaine EN COURS ne se valide pas —
      await L.toucher(c, '#contenu [data-tt="onglet|semaine"]'); await L.calme(c.p, 300);
      const S0 = await ev(c, () => { const L0 = lundi(AUJ), S = ttSemEtat(L0); return { fini:S.fini, ok:S.ok.length, vus:S.vus.length, L0, boutons:document.querySelectorAll('#contenu [data-tt^="valider|"]').length, un:document.querySelectorAll('#contenu [data-tt^="validerun|"]').length, txt:document.querySelector('#contenu').innerText, pastilles:[...document.querySelectorAll('#contenu .tt-pc .st')].map(e => e.textContent.trim()) }; });
      v(nom + 'population : la semaine affichée est celle d’aujourd’hui, pas finie, avec des personnes qui ont pointé', S0.fini === false && S0.vus >= 3, { fini:S0.fini, vus:S0.vus });
      v(nom + 'Semaine en cours : aucun bouton « Valider… » n’est proposé (ni lot, ni personne)', S0.boutons === 0 && S0.un === 0, S0);
      v(nom + 'Semaine en cours : la phrase dit « Semaine en cours : elle se valide une fois finie. »', /Semaine en cours : elle se valide une fois finie\./.test(net(S0.txt)), net(S0.txt).slice(0, 300));
      v(nom + 'Semaine en cours : les pastilles ne disent pas « À valider »', S0.pastilles.length > 0 && !S0.pastilles.some(x => /À valider|À revalider/.test(x)), S0.pastilles);
      const forge = await ev(c, () => { const av = JSON.stringify(PT_VALIDE); const L0 = lundi(AUJ); ttValiderUn('sm', L0, true); ttValiderLot(L0); ttValiderPanneau(L0); return { chg:JSON.stringify(PT_VALIDE) !== av, toast:(document.getElementById('toast') || {}).textContent || '' }; });
      v(nom + 'Semaine en cours : un geste forgé (valider une personne, le lot) n’écrit rien', forge.chg === false && /se valide une fois finie/.test(forge.toast), forge);
      await L.capture(c, CAP + 'tt-semaine-encours-' + nom.trim().replace(/[ ·]+/g, '-') + '.png');
      // contre-épreuve : la semaine d'avant (finie) garde son bouton quand des personnes sont en règle
      await L.toucher(c, '#contenu [data-tt="nav|-1"]'); await L.calme(c.p, 300);
      const S1 = await ev(c, () => { const L1 = ajoute(lundi(AUJ), -7), S = ttSemEtat(L1); return { fini:S.fini, ok:S.ok.length, boutons:document.querySelectorAll('#contenu [data-tt^="valider|"]').length, enc:/Semaine en cours/.test(document.querySelector('#contenu').innerText) }; });
      v(nom + 'contre-épreuve : la semaine d’avant est finie et ne parle pas de « semaine en cours »', S1.fini === true && S1.enc === false, S1);
      v(nom + 'contre-épreuve : la semaine d’avant propose « Valider » exactement quand des personnes y sont en règle (' + S1.ok + ')', (S1.ok > 0) === (S1.boutons > 0), S1);
      await L.toucher(c, '#contenu [data-tt="nav|1"]'); await L.calme(c.p, 300);
      // la feuille d'une personne : pas de bouton de validation, la phrase
      await L.toucher(c, '#contenu .tt-sem [data-tt^="sem|"]:visible'); await L.calme(c.p, 400);
      const F0 = await ev(c, () => ({ txt:document.querySelector('#calque .panneau').innerText, valider:[...document.querySelectorAll('#calque .panneau button')].filter(b => /^Valider/.test(b.textContent.trim())).map(b => b.textContent.trim()) }));
      v(nom + 'la feuille d’une personne, semaine en cours : la phrase et aucun « Valider… »', /Semaine en cours : elle se valide une fois finie\./.test(net(F0.txt)) && F0.valider.length === 0, F0.valider);
      await ev(c, () => fermerPanneau());
      // — la feuille d'une personne en congé : le week-end dit « pas de journée », jamais « Congé payé » ; un jour à venir dit « à venir » —
      const cong = await ev(c, () => PT_GENS.filter(k => ptxJours(lundi(AUJ)).some(d => dObj(d).getDay() % 6 === 0 && absDe(k, d))));
      v(nom + 'population : quelqu’un est en congé un jour de week-end de la semaine', cong.length >= 1, cong);
      if (cong.length) {
        await ev(c, k => { ttSemainePers(k, lundi(AUJ)); }, cong[0]); await L.calme(c.p, 400);
        const J = await ev(c, () => [...document.querySelectorAll('#calque .tt-sept .tt-jr')].map(e => ({ d:e.querySelector('.tt-jd').innerText, t:e.querySelector('.fo-n').innerText })));
        const we = J.filter(x => /^(sam|dim)\./i.test(net(x.d)));
        v(nom + 'population : sept jours, dont samedi et dimanche', J.length === 7 && we.length === 2, J);
        v(nom + 'samedi et dimanche ne disent pas « Congé payé »', we.every(x => !/Congé|congé|RTT/.test(x.t)), we);
        v(nom + 'un jour qui n’est pas arrivé dit « à venir » (jamais « pas encore »)', J.some(x => /à venir/.test(x.t)) && !J.some(x => /pas encore/.test(x.t)), J);
        v(nom + 'un jour ouvré en congé le dit encore (contre-épreuve)', J.some(x => /Congé payé|RTT|Congé/.test(x.t)), J);
        await L.capture(c, CAP + 'tt-feuille-conge-' + nom.trim().replace(/[ ·]+/g, '-') + '.png');
        await ev(c, () => fermerPanneau());
      }
      // — Mois : une semaine à cheval dit « dont X en octobre », et la somme des lignes retombe sur le chiffre du haut —
      await L.toucher(c, '#contenu [data-tt="onglet|mois"]'); await L.calme(c.p, 400);
      const bilan = net(await ev(c, () => document.querySelector('#contenu').innerText));
      v(nom + 'Mois : la phrase « Il reste … » cite la semaine en cours, à valider une fois finie', /[Ll]a semaine en cours(,| est) à valider une fois finie/.test(bilan), bilan.slice(0, 400));
      const vm = await ev(c, () => PT_GENS.filter(k => paieVariables(k).semaines.some(w => w.mois !== w.tot)));
      v(nom + 'population : au moins une personne a une semaine à cheval sur deux mois', vm.length >= 1, vm);
      for (const k of vm.slice(0, 3)) {
        await ev(c, kk => { fermerPanneau(); ttMoisPers(kk); }, k); await L.calme(c.p, 400);
        const R = await ev(c, () => { const z = document.querySelector('#calque .panneau'); const top = z.querySelector('.fo-stats b'); const lignes = [...z.querySelectorAll('.tt-jr[data-tt^="sem|"]')].map(e => ({ t:e.querySelector('.fo-n').innerText.replace(/\s+/g, ' '), b:e.querySelector(':scope > b').innerText })); return { top:top ? top.innerText : '', lignes }; });
        const mn = s => { const [h, m] = String(s).replace(/\s/g, '').split('h'); return (+h) * 60 + (+m || 0); };
        const somme = R.lignes.reduce((s, l) => { const m = l.t.match(/dont ([\d\s]+h\d*) en octobre/); return s + mn(m ? m[1] : l.b); }, 0);
        v(nom + k + ' · population : des lignes de semaines', R.lignes.length >= 3, R);
        v(nom + k + ' · les semaines à cheval disent « dont … en octobre » et la somme des lignes (' + somme + ' min) = le chiffre du haut (' + R.top + ')', R.lignes.some(l => /en octobre/.test(l.t)) && somme === mn(R.top), R);
        await L.capture(c, CAP + 'tt-mois-pers-' + k + '-' + nom.trim().replace(/[ ·]+/g, '-') + '.png'); await ev(c, () => fermerPanneau());
      }
      // — « Valider ce qui est en règle » (Mois) ne prend que les semaines finies —
      const vt = await ev(c, () => { const av = { ...PT_VALIDE }; const cur = lundi(AUJ); ttViaPaie('validertout'); const apres = { ...PT_VALIDE }; return { cur:PT_GENS.some(k => apres[k + cur]), neuves:Object.keys(apres).filter(k => !av[k]).length, finies:Object.keys(apres).filter(k => !av[k]).every(k => ttSemFinie(k.slice(-10))) }; });
      v(nom + 'Mois › « Valider ce qui est en règle » : aucune semaine en cours n’est validée, seules des semaines finies', vt.cur === false && vt.finies === true, vt);
      // — le mois fermé : « il sera régularisé » pour Tom (homme), « elle sera régularisée » pour une femme —
      const reg = await ev(c, () => { ttViaPaie('verrouok'); const d = paieJourSignale('tl'); const r = {}; for (const [k, dd] of [['tl', d]]) { fermerPanneau(); ttFicheJour(k, dd); const z = document.querySelector('#calque .panneau'); r[k] = z ? z.innerText.replace(/\s+/g, ' ') : ''; fermerPanneau(); }
        const sg = Object.keys(PAIE.signales); return { r, sg, fem:ttFem('sm') }; });
      v(nom + 'population : Tom a une demande de correction sur un mois fermé', /demande une correction/.test(reg.r.tl), reg.r.tl.slice(0, 200));
      v(nom + 'le mois fermé : « il sera régularisé avec le mois suivant » pour Tom (jamais « elle »)', /il sera régularisé avec le mois suivant/.test(reg.r.tl) && !/elle sera régularisée/.test(reg.r.tl), reg.r.tl.slice(0, 400));
      const regF = await ev(c, () => { const k0 = PAIE.signales.sm; PAIE.signales.sm = PAIE.signales.tl || { txt:'x' }; const d = paieJourSignale('tl'); fermerPanneau(); ttFicheJour('sm', d); const z = document.querySelector('#calque .panneau'); const t = z ? z.innerText.replace(/\s+/g, ' ') : ''; fermerPanneau(); if (k0) PAIE.signales.sm = k0; else delete PAIE.signales.sm; return t; });
      v(nom + 'contre-épreuve : pour une salariée, « elle sera régularisée »', regF === '' || /elle sera régularisée/.test(regF) || !/demande une correction/.test(regF), regF.slice(0, 200));
      // — la Paie : « en plus » et « payée avec novembre », jamais « sup. » ni « se termine en » —
      const P = await ev(c, () => { const o = {}; for (const k of ['kb', 'sm']) { fermerPanneau(); paieReleve(k); const z = document.querySelector('#calque .panneau'); o[k] = z ? z.innerText.replace(/\s+/g, ' ') : ''; o[k + 'Doc'] = paieDoc(k).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); } fermerPanneau(); return o; });
      v(nom + 'population : le relevé de Karim et le document se lisent', P.kb.length > 200 && P.kbDoc.length > 200, [P.kb.length, P.kbDoc.length]);
      v(nom + 'le relevé de la Paie : « en plus » et « payée avec novembre », jamais « sup. » ni « se termine en »', /en plus/.test(P.kb) && /payée avec novembre/.test(P.kb) && !/\bsup\./.test(P.kb + P.kbDoc + P.sm + P.smDoc) && !/se termine en/.test(P.kb + P.sm), P.kb.slice(0, 500));
      v(nom + 'aucune erreur de page (temps de travail)', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════════ RETOUR DE LA PAIE ═══════════════ */
    if (PARTIES.includes('retour')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
      await ev(c, () => { ttViaPaie('verrouok'); });   // le mois d'octobre est fermé : « Voir la paie » existe (le chemin du recontrôle)
      await L.toucher(c, '#contenu [data-tt="onglet|mois"]'); await L.calme(c.p, 300);
      const bt = await ev(c, () => [...document.querySelectorAll('#contenu .tt-bilan button, #contenu button')].filter(b => b.offsetParent && /Passer à la paie|Voir la paie/.test(b.textContent)).map(b => b.textContent.trim()));
      v(nom + 'population : un bouton mène à la Paie depuis Mois', bt.length >= 1, bt);
      if (bt.length) {
        await L.toucher(c, '#contenu >> text=/Passer à la paie|Voir la paie/'); await L.calme(c.p, 900);
        const rt = await ev(c, () => ({ route, barre:!!document.querySelector('.rl-retour'), t:(document.querySelector('.rl-retour') || { innerText:'' }).innerText }));
        v(nom + 'on arrive dans la Paie avec le moyen de revenir (« ‹ Retour · Temps de travail »)', rt.route === 'comptabilite' && /Temps de travail/.test(rt.t), rt);
        await L.toucher(c, '.rl-retour'); await L.calme(c.p, 900);
        const ap = await ev(c, () => ({ route, actif:(document.querySelector('#contenu .seg [aria-pressed="true"]') || { innerText:'' }).innerText.replace(/\s+/g, ' ').trim() }));
        v(nom + 'le retour ramène sur l’onglet « Mois » d’où l’on est parti', ap.route === 'pointage' && /^Mois/.test(ap.actif), ap);
        // contre-épreuve : un retour depuis l'onglet Semaine ne force pas « Mois » (rien n'est collé)
        await ev(c, () => { aller('accueil'); }); await L.calme(c.p, 500); await L.aller(c.p, 'pointage');
        const ap2 = await ev(c, () => (document.querySelector('#contenu .seg [aria-pressed="true"]') || { innerText:'' }).innerText.replace(/\s+/g, ' ').trim());
        v(nom + 'contre-épreuve : revenir à Temps de travail par le menu (sans passer par la Paie) rouvre « Aujourd’hui »', /^Aujourd/.test(ap2), ap2);
      }
      v(nom + 'aucune erreur de page (retour)', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════════ LE VISIONNEUR D'UNE FICHE DE PAIE (titre sous la croix) ═══════════════ */
    if (PARTIES.includes('visionneur')) {
      const c = await L.ouvrir({ profil, nuit, qui:'sm', calme:true }); await L.aller(c.p, 'mesheures');
      await L.toucher(c, '#contenu [data-tt="mhonglet|fiches"]'); await L.toucher(c, '#contenu [data-paie^="bulletin|"]'); await L.calme(c.p, 700);
      const R = await ev(c, () => { const z = document.querySelector('#docplein'); if (!z) return null; const b = z.querySelector('.dp-barre b'), x = z.querySelector('.dp-x'), rg = document.createRange(); rg.selectNodeContents(b);
        const rects = [...rg.getClientRects()].map(r => ({ g:r.left, d:r.right, h:r.top, b:r.bottom })), rx = x.getBoundingClientRect(), pb = b.getBoundingClientRect();
        return { titre:b.textContent, rects, x:{ g:rx.left, d:rx.right, h:rx.top, b:rx.bottom }, boite:{ g:pb.left, d:pb.right }, largeur:innerWidth, dedans:rects.every(r => r.d <= pb.right + 0.5) }; });
      v(nom + 'population : le visionneur de la fiche de paie est ouvert, avec son titre et sa croix', !!R && R.rects.length >= 1, R && R.titre);
      if (R) { const chevauche = R.rects.some(r => r.d > R.x.g && r.g < R.x.d && r.b > R.x.h && r.h < R.x.b);
        v(nom + 'le titre « ' + R.titre + ' » ne passe pas sous la croix (' + R.rects.length + ' ligne(s))', !chevauche && R.dedans, R);
        v(nom + 'le titre reste dans l’écran (' + R.largeur + ' px)', R.rects.every(r => r.d <= R.largeur && r.g >= 0), R.rects); }
      await L.capture(c, CAP + 'visionneur-' + nom.trim().replace(/[ ·]+/g, '-') + '.png');
      v(nom + 'aucune erreur de page (visionneur)', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR de la sonde :', e && e.stack || e); await L.fermer(); process.exit(2); });
