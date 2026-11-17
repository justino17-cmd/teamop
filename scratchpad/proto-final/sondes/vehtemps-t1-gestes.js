// Temps de travail, étape 1 — LES GESTES du gérant, joués au clic : terminer la journée de Tom en UN geste (à sa fin d'habitude, jamais l'heure
// qu'il est), accepter sa demande, rappeler, filtrer par les chiffres, valider (une personne, le lot, « Annuler », « À revalider »), le mois et ses
// quatre états, le mois fermé (aucune écriture), « Ajouter une journée » (motif obligatoire), « La règle », « Rappels ».
// Chaque contrôle prouve d'abord sa population (jamais un zéro sur du vide). Navigateur sur 127.0.0.1 seulement, un seul à la fois.
const L = require('../lib.js'), v = L.v;
const txt = (c, sel) => c.p.evaluate(s => (document.querySelector(s) || {}).textContent || '', sel);
const n = (c, sel) => c.p.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent !== null || getComputedStyle(e).position === 'fixed').length, sel);
const clic = async (c, sel) => { const ok = await L.toucher(c, sel); if (!ok) console.log('   (pas atteint : ' + sel + ')'); return ok; };
const ev = (c, f, a) => c.p.evaluate(f, a);
const frais = async (profil, qui) => { const c = await L.ouvrir({ profil: profil || 'mac', qui: qui || 'marc', calme: true }); await L.aller(c.p, 'pointage'); return c; };
const lignes = c => c.p.evaluate(() => [...document.querySelectorAll('.tt-areg .tt-lig')].map(e => e.innerText.replace(/\s+/g, ' ').trim()));
const toastClic = (c, lib) => c.p.evaluate(l => { const b = [...document.querySelectorAll('#toast button')].find(x => x.textContent === l); if (b) b.click(); return !!b; }, lib);

(async () => {
  /* ── A. « Terminer à 16:47 » : un geste, à la fin d'habitude, jamais l'heure qu'il est ── */
  { const c = await frais(); const av = await ev(c, () => { const p = POINTAGES.find(o => o.qui === 'tl' && ptOuvert(o)); PT_VALIDE['tl' + lundi(p.date)] = true; return { id:p.id, h:ptxFinPropose(p).h, now:hNow(), tr:PT_TRACE.length, debut:p.debut, sem:'tl' + lundi(p.date) }; });   // une semaine DÉJÀ validée : terminer une journée doit la remettre à valider
    const l0 = await lignes(c); v('A : la population — la journée de Tom est ouverte et sa fin proposée n\'est pas l\'heure qu\'il est', !!av.id && av.h !== av.now && l0.length === 4, { av, l0 });
    const lib = await txt(c, '[data-tt^="terminer|"]'); v('A : le bouton dit l\'heure proposée', lib.trim() === 'Terminer à ' + av.h, lib);
    await clic(c, '[data-tt^="terminer|"]');
    const ap = await ev(c, id => { const p = POINTAGES.find(o => o.id === id), t = PT_TRACE[PT_TRACE.length - 1]; return { fin:p.fin, pause:p.pause, tr:PT_TRACE.length, t, val:Object.keys(PT_VALIDE).filter(k => /^tl/.test(k)), toast:(document.getElementById('toast') || {}).innerText }; }, av.id);
    v('A : la journée est terminée à la fin proposée (jamais « maintenant »)', ap.fin === av.h && ap.fin !== av.now, ap);
    v('A : la pause est celle d\'habitude, la trace est écrite (avant → après, qui, pourquoi)', ap.pause > 0 && ap.tr === av.tr + 1 && ap.t.champ === 'fin' && ap.t.apres === av.h && ap.t.par === 'marc' && ap.t.motif.length > 10, ap.t);
    v('A : la semaine de Tom, validée avant, est remise à valider (ptDevalide) — la population : elle l\'était', (await ev(c, k => !PT_VALIDE[k], av.sem)), av.sem);
    v('A : le toast dit ce qui est parti et porte « Annuler »', /terminée à/.test(ap.toast) && /Annuler/.test(ap.toast), ap.toast);
    const l1 = await lignes(c); v('A : la rangée a disparu de « À régler » (4 → 3) et la pastille de l\'onglet suit', l1.length === 3 && (await txt(c, '[data-tt="onglet|auj"] .t-nb')).trim() === '3', l1.length);
    await toastClic(c, 'Annuler'); await c.p.waitForTimeout(250);
    const re = await ev(c, id => ({ fin:POINTAGES.find(o => o.id === id).fin, tr:PT_TRACE.length }), av.id);
    v('A : « Annuler » rouvre la journée et retire la trace', re.fin === null && re.tr === av.tr && (await lignes(c)).length === 4, re);
    await L.fin(c); }

  /* ── B. « Accepter 17:40 » ── */
  { const c = await frais(); const av = await ev(c, () => { const d = paieJourSignale('tl'), p = ptJour('tl', d)[0]; PAIE.confirmes.tl = { le:'30/10 · 18:00' }; return { d, avant:p.fin, tr:PT_TRACE.length, req:ptxReq('tl') }; });
    const lib = (await txt(c, '[data-tt="accepter|tl"]')).trim(); v('B : la demande de Tom est une rangée « Demande » avec UN bouton « Accepter 17:40 »', lib === 'Accepter ' + av.req.fin && av.req.fin === '17:40', lib);
    const l0 = (await lignes(c)).find(x => /^Demande /.test(x)); v('B : la rangée cite ses mots et dit « il a fini à 17:40 et non à 16:42 »', /il a fini à 17:40 et non à 16:42/.test(l0) && /J’ai oublié de pointer/.test(l0), l0);
    await ev(c, () => rendre()); await clic(c, '[data-tt="accepter|tl"]');
    const ap = await ev(c, a => { const p = ptJour('tl', a.d)[0], t = PT_TRACE[PT_TRACE.length - 1]; return { fin:p.fin, t, tr:PT_TRACE.length, sig:!!PAIE.signales.tl, conf:!!PAIE.confirmes.tl, toast:document.getElementById('toast').innerText }; }, av);
    v('B : l\'heure est corrigée, la trace est écrite, la demande est réglée', ap.fin === '17:40' && ap.tr === av.tr + 1 && ap.t.avant === av.avant && ap.t.apres === '17:40' && !ap.sig, ap);
    v('B : Tom devra reconfirmer (sa confirmation tombe) et le toast le DIT avec « Annuler »', !ap.conf && /reconfirmer/.test(ap.toast) && /Annuler/.test(ap.toast), ap.toast);
    await toastClic(c, 'Annuler'); await c.p.waitForTimeout(250);
    const re = await ev(c, a => ({ fin:ptJour('tl', a.d)[0].fin, sig:!!PAIE.signales.tl, tr:PT_TRACE.length }), av);
    v('B : « Annuler » remet la demande à traiter et l\'heure d\'avant', re.fin === av.avant && re.sig && re.tr === av.tr, re);
    await L.fin(c); }

  /* ── C. demander l'heure, rappeler ── */
  { const c = await frais(); const nt0 = await ev(c, () => NOTIFS.length);
    await clic(c, '[data-tt^="demander|"]'); const d1 = await ev(c, () => ({ dem:Object.keys(PTX.demande || {}).length, nt:NOTIFS.length, k:NOTIFS[NOTIFS.length - 1].k }));
    v('C : « Lui demander son heure » envoie UNE notification à Tom', d1.dem === 1 && d1.nt === nt0 + 1 && d1.k === 'tl', d1);
    const l = (await lignes(c))[0]; v('C : la rangée dit « Demande envoyée » et propose « Redemander »', /Demande envoyée à 10:40/.test(l) && /Redemander son heure/.test(l), l);
    await clic(c, '[data-tt="rappeler1|sm"]'); const r1 = await ev(c, () => ({ r:PTX.rappele.sm, nt:NOTIFS[NOTIFS.length - 1] }));
    v('C : « Lui rappeler » prévient Sophie, et SEULEMENT elle', r1.r === '10:40' && r1.nt.k === 'sm' && !(await ev(c, () => PTX.rappele.tl === '10:40' && NOTIFS.filter(o => o.k === 'tl' && /pas encore commencé/.test(o.txt) && o.h === '10:40').length)), r1);
    const carte = (await txt(c, '.tt-rap-carte button')).trim(); v('C : le bouton de carte nomme les deux (« Envoyer un rappel à Sophie et Tom »)', carte === 'Envoyer un rappel à Sophie et Tom', carte);
    await clic(c, '.tt-rap-carte button'); const r2 = await ev(c, () => PTX.rappele.tl);
    v('C : le bouton de carte rappelle Tom aussi', r2 === '10:40', r2);
    await L.fin(c); }

  /* ── D. les chiffres sont des portes ── */
  { const c = await frais(); const tot = await n(c, '.tt-qui .tt-l'); v('D : la population — « Qui est où » montre 4 personnes (Julie n\'est pas attendue, Marc a sa carte)', tot === 4, tot);
    await clic(c, '[data-tt="filtre|absent"]'); const f1 = await n(c, '.tt-qui .tt-l'); const nom = await txt(c, '.tt-qui .tt-l b');
    v('D : « absente » ne montre que Léa, et dit qu\'un filtre est posé', f1 === 1 && /Léa/.test(nom) && (await n(c, '.tt-filtre')) === 1, { f1, nom });
    await clic(c, '[data-tt="filtre|absent"]'); v('D : toucher le même chiffre retire le filtre', (await n(c, '.tt-qui .tt-l')) === 4 && (await n(c, '.tt-filtre')) === 0);
    await clic(c, '[data-tt="filtre|attendu"]'); v('D : « pas encore commencé » ne montre que Sophie et Tom', (await n(c, '.tt-qui .tt-l')) === 2);
    await clic(c, '.tt-filtre .lien'); v('D : « Tout voir » retire le filtre', (await n(c, '.tt-qui .tt-l')) === 4);
    await clic(c, '[data-tt="onglet|mois"]'); await clic(c, '.tt-k [data-tt="areg"]'); await c.p.waitForTimeout(500);
    v('D : le chiffre « à régler » ramène à la file, depuis un autre onglet', (await ev(c, () => ptOnglet)) === 'auj' && (await n(c, '#tt-areg')) === 1);
    await L.fin(c); }

  /* ── E. la semaine : valider ── */
  { const c = await frais(); await clic(c, '[data-tt="onglet|semaine"]');
    const noms = await ev(c, () => { const L0 = lundi(AUJ), S = ttSemEtat(L0); return { ok:S.ok, reste:S.reste, bouton:document.querySelector('.tt-barre .btn') && document.querySelector('.tt-barre .btn').textContent }; });
    v('E : la population — 4 personnes en règle (Sophie, Léa, Julie, Marc), Karim et Tom à régler', noms.ok.join() === 'sm,lr,julie,marc' && noms.reste.join() === 'kb,tl', noms);
    v('E : le bouton dit « Valider les 4 personnes en règle » (plus « Valider 4 semaines »)', noms.bouton === 'Valider les 4 personnes en règle', noms.bouton);
    v('E : une pastille par ligne, et un seul bouton « Valider » par personne en règle (grille)', (await n(c, '.tt-grille .tt-gl .tt-pc')) === 6 && (await n(c, '.tt-grille .tt-pc .btn')) === 4);
    await clic(c, '.tt-barre .btn'); const noms2 = await n(c, '#calque .panneau .fo-r'); v('E : la feuille liste les 4 noms', noms2 === 4 && /Valider 4 personnes/.test(await txt(c, '#calque .panneau h2')));
    await clic(c, '#calque .btn.large'); const ap = await ev(c, () => ({ val:Object.keys(PT_VALIDE).filter(k => PT_VALIDE[k] && k.endsWith(lundi(AUJ))).map(k => k.replace(lundi(AUJ), '')).sort().join(), toast:document.getElementById('toast').innerText }));
    v('E : les 4 sont validées pour la paie, et le toast les nomme avec « Annuler »', ap.val === 'julie,lr,marc,sm' && /4 personnes validées/.test(ap.toast) && /Annuler/.test(ap.toast), ap);
    v('E : quatre pastilles « Validée », plus de bouton de lot', (await n(c, '.tt-grille .st-v')) === 4 && (await n(c, '.tt-barre .btn')) === 0);
    /* une heure qui bouge après la validation : « À revalider » */
    await ev(c, () => { ptDevalide('sm', lundi(AUJ)); rendre(); }); await c.p.waitForTimeout(200);
    const rev = await ev(c, () => [...document.querySelectorAll('.tt-grille .tt-gl')].map(e => e.innerText.replace(/\s+/g, ' ')).find(x => /Sophie/.test(x)));
    v('E : une heure corrigée après la validation dit « À revalider » (pas « À valider »)', /À revalider/.test(rev) && !/À valider/.test(rev), rev);
    await toastClic(c, 'Annuler'); await L.fin(c); }
  { const c = await frais(); await clic(c, '[data-tt="onglet|semaine"]'); await clic(c, '.tt-barre .btn'); await clic(c, '#calque .btn.large'); await toastClic(c, 'Annuler'); await c.p.waitForTimeout(250);
    v('E : « Annuler » défait la validation du lot (rien de validé, et pas de « À revalider » fantôme)', Object.values(await ev(c, () => PT_VALIDE)).filter(Boolean).length === 0 && !/À revalider/.test(await txt(c, '.tt-sem')));
    await clic(c, '.tt-grille .tt-pc .btn'); const un = await ev(c, () => ({ val:Object.keys(PT_VALIDE).filter(k => PT_VALIDE[k]), toast:document.getElementById('toast').innerText }));
    v('E : « Valider » d\'une ligne valide CETTE personne (la première en règle : Sophie), avec « Annuler »', un.val.length === 1 && /^sm/.test(un.val[0]) && /Annuler/.test(un.toast), un);
    await clic(c, '[data-tt="nav|-1"]'); v('E : la flèche ‹ change de semaine', /19 oct\. au 25 oct\./.test(await txt(c, '.st-nav b')), await txt(c, '.st-nav b'));
    await clic(c, '[data-tt="nav|1"]'); v('E : la flèche › revient, puis se désactive sur la semaine en cours', /26 oct\./.test(await txt(c, '.st-nav b')) && await ev(c, () => document.querySelector('[data-tt="nav|1"]').disabled));
    await L.fin(c); }

  /* ── F. la feuille d'une personne ── */
  { const c = await frais(); await clic(c, '[data-tt="onglet|semaine"]'); await clic(c, '.tt-grille [data-tt^="sem|kb|"].st'); const o = await ev(c, () => ({ h2:(document.querySelector('#calque .panneau h2') || {}).textContent, sept:document.querySelectorAll('#calque .tt-sept .tt-jr').length, alerte:(document.querySelector('#calque .panneau .fo-alerte') || {}).innerText || '', btns:[...document.querySelectorAll('#calque .panneau .btn.large, #calque .panneau .lien')].map(b => b.textContent.trim()) }));
    v('F : Karim — sept lignes, ses points écrits UNE fois, « Voir les points à régler » (pas de « Valider quand même » : des repères rouges)', o.h2 === 'Karim Benali' && o.sept === 7 && /13h05/.test(o.alerte) && o.btns.includes('Voir les points à régler') && !o.btns.includes('Valider quand même'), o);
    await clic(c, '#calque .tt-sept .tt-jr'); v('F : toucher un jour ouvre la journée (fiche existante, étape suivante)', /Karim|lundi|26/.test(await txt(c, '#calque .panneau')) && (await n(c, '#calque .panneau')) === 1);
    await L.ranger(c.p); await clic(c, '.tt-grille [data-tt^="sem|sm|"]'); const s = await ev(c, () => [...document.querySelectorAll('#calque .panneau .btn.large')].map(b => b.textContent.trim()));
    v('F : Sophie (en règle) — « Valider la semaine de Sophie »', s.join() === 'Valider la semaine de Sophie', s);
    await clic(c, '#calque .btn.large'); v('F : la valider ferme la feuille, la semaine de Sophie est validée', (await n(c, '#calque .panneau')) === 0 && (await ev(c, () => !!PT_VALIDE['sm' + lundi(AUJ)])));
    await L.fin(c); }

  /* ── G. le mois et ses quatre états ── */
  { const c = await frais(); await clic(c, '[data-tt="onglet|mois"]');
    const m0 = await ev(c, () => { const V = PT_GENS.map(paieVariables); return { kpi:[...document.querySelectorAll('.tt-k')[1].querySelectorAll('.kpi b')].map(e => e.textContent), somme:ttHL(V.reduce((s, x) => s + x.tot, 0)), plus:ttHL(V.reduce((s, x) => s + x.s25 + x.s50, 0)), btn:[...document.querySelectorAll('.tt-paie .btn')].map(b => b.textContent.trim()), phrase:document.querySelector('.tt-phrase').textContent, lignes:document.querySelectorAll('.tt-mois .tt-p').length }; });
    v('G : la population — six personnes, les chiffres sont ceux de paieVariables (jamais recalculés autrement)', m0.lignes === 6 && m0.kpi[0] === m0.somme && m0.kpi[1] === m0.plus, m0);
    v('G : état 1 — « Valider ce qui est en règle » (le MÊME libellé que la Paie)', m0.btn[0] === 'Valider ce qui est en règle', m0.btn);
    v('G : la phrase nomme ce qu\'il reste, en mots simples, sans « 30 semaines »', /Il reste 1 journée à terminer/.test(m0.phrase) && !/semaines? pas encore validée/.test(m0.phrase), m0.phrase);
    await clic(c, '.tt-paie .btn'); const m1 = await ev(c, () => ({ btn:document.querySelector('.tt-paie .btn').textContent.trim(), val:Object.values(PT_VALIDE).filter(Boolean).length }));
    v('G : « Valider ce qui est en règle » valide (même fonction que la Paie) puis le bouton dit ce qui BLOQUE', m1.val > 0 && m1.btn === 'Voir ce qu’il reste à régler', m1);
    await toastClic(c, 'Annuler');
    /* tout validé, des confirmations manquent : état 2 */
    await ev(c, () => { const p = POINTAGES.find(o => o.qui === 'tl' && ptOuvert(o)); p.fin = '16:40'; p.pause = 45; delete PAIE.signales.tl; PT_GENS.forEach(k => paieVariables(k).semaines.forEach(w => { PT_VALIDE[k + w.L] = true; })); delete PAIE.confirmes.kb; ptOnglet = 'mois'; rendre(); });
    const m2 = await ev(c, () => ({ btn:[...document.querySelectorAll('.tt-paie .btn, .tt-paie .lien')].map(b => b.textContent.trim() + '|' + b.className), nc:PT_GENS.filter(k => !PAIE.confirmes[k]).length }));
    v('G : état 2 — tout est validé : « Demander de confirmer » (gris, pas bloquant) et le lien « Passer à la paie quand même »', /^Demander de confirmer\|btn gris/.test(m2.btn[0]) && /^Passer à la paie quand même/.test(m2.btn[1]), m2);
    const nt = await ev(c, () => NOTIFS.length); await clic(c, '[data-tt="confirmer"]'); const nt2 = await ev(c, () => NOTIFS.length);
    v('G : « Demander de confirmer » notifie chaque salarié qui n\'a pas confirmé, et le dit', nt2 - nt === m2.nc && /Demande envoyée à/.test(await txt(c, '.tt-paie')), { nt, nt2, nc:m2.nc });
    await ev(c, () => { PT_GENS.forEach(k => { PAIE.confirmes[k] = { le:'31/10 · 10:40' }; }); rendre(); });
    v('G : état 3 — tout est réglé : « Passer à la paie » (noir)', (await txt(c, '.tt-paie .btn')).trim() === 'Passer à la paie' && !/gris/.test(await ev(c, () => document.querySelector('.tt-paie .btn').className)));
    await clic(c, '.tt-paie .btn'); await c.p.waitForTimeout(600); v('G : « Passer à la paie » ouvre Comptabilité › Paie', (await ev(c, () => route)) === 'comptabilite' && (await ev(c, () => CP.onglet)) === 'paiemois', await ev(c, () => route + '/' + CP.onglet));
    await L.aller(c.p, 'pointage'); await ev(c, () => { PAIE.verrou = { le:'31/10 · 10:40', par:'marc', emp:'ABCD1234' }; ptOnglet = 'mois'; rendre(); });
    { const ph = await txt(c, '.tt-paie .tt-phrase'), bt = (await txt(c, '.tt-paie .btn')).trim(); v('G : état 4 — mois fermé : la phrase le dit, « Voir la paie »', /est fermé\s:\splus aucune heure ne peut changer/.test(ph) && bt === 'Voir la paie', { ph, bt }); }
    await L.fin(c); }

  /* ── H. le mois FERMÉ : aucune écriture, nulle part ── */
  { const c = await frais(); await ev(c, () => { PAIE.verrou = { le:'31/10 · 10:40', par:'marc', emp:'ABCD1234' }; rendre(); });
    const av = await ev(c, () => ({ p:JSON.stringify(POINTAGES), tr:PT_TRACE.length, val:JSON.stringify(PT_VALIDE) }));
    v('H : la population — mois fermé, rien d\'« à régler » ne reste proposé sur ses jours (plus de « Terminer à… »)', (await n(c, '[data-tt^="terminer|"]')) === 0 && (await ev(c, () => paieMoisVerrou(AUJ))));
    await ev(c, () => { const p = POINTAGES.find(o => o.qui === 'tl' && ptOuvert(o)); ttTerminerRapide(p.id, ptxFinPropose(p).h); });
    const a1 = await ev(c, () => ({ p:JSON.stringify(POINTAGES), tr:PT_TRACE.length, t:document.getElementById('toast').innerText })); v('H : forcer « Terminer » ne change rien et le dit', a1.p === av.p && a1.tr === av.tr && /fermé/.test(a1.t), a1.t);
    await ev(c, () => ttValiderUn('sm', lundi(AUJ))); v('H : forcer « Valider » ne change rien', (await ev(c, () => JSON.stringify(PT_VALIDE))) === av.val);
    { const okN = await ev(c, () => ttSemEtat(lundi(AUJ)).ok.length); await ev(c, () => ttValiderLot(lundi(AUJ)));   // le bouton du lot est caché, mais la fonction est joignable : la garde doit tenir seule
      v('H : forcer « Valider le lot » (des personnes EN RÈGLE existent : ' + okN + ') ne valide personne', okN > 0 && (await ev(c, () => JSON.stringify(PT_VALIDE))) === av.val, okN); }
    await clic(c, '[data-tt="ajout"]'); await ev(c, () => { document.getElementById('tt-aq').value = 'lr'; document.getElementById('tt-aj').value = jour(-2); document.getElementById('tt-am').value = 'test'; }); await clic(c, '[data-tt="ajoutok"]');
    const a2 = await ev(c, () => ({ p:JSON.stringify(POINTAGES), t:document.getElementById('toast').innerText })); v('H : « Ajouter une journée » dans un mois fermé est refusé, rien n\'est écrit', a2.p === av.p && /fermé/.test(a2.t), a2.t);
    await L.ranger(c.p); await clic(c, '[data-tt="onglet|semaine"]'); v('H : la Semaine dit « Octobre est fermé » et ne propose plus de valider', /Octobre est fermé/.test(await txt(c, '.tt-conteneur, #contenu')) && (await n(c, '.tt-barre .btn')) === 0);
    await L.fin(c); }

  /* ── I. « Ajouter une journée » ── */
  { const c = await frais(); const base = await ev(c, () => ({ np:POINTAGES.length, tr:PT_TRACE.length, nt:NOTIFS.length }));
    await clic(c, '[data-tt="ajout"]'); v('I : la feuille s\'ouvre, le motif est demandé', /Pourquoi/.test(await txt(c, '#calque .panneau')) && (await n(c, '#calque #tt-am')) === 1);
    const lea = await ev(c, () => { document.getElementById('tt-aq').value = 'lr'; document.getElementById('tt-aj').value = jour(-1); document.getElementById('tt-ad').value = '08:00'; document.getElementById('tt-af').value = '12:00'; document.getElementById('tt-ap').value = '0'; return { prevu:ptJour('lr', jour(-1)).length, abs:!!absDe('lr', jour(-1)) }; });
    await clic(c, '[data-tt="ajoutok"]'); const r0 = await ev(c, () => ({ np:POINTAGES.length, t:document.getElementById('toast').innerText }));
    v('I : sans motif, rien n\'est écrit et on dit pourquoi (la condition est VISIBLE avant)', r0.np === base.np && /pourquoi/i.test(r0.t) && (await n(c, '#calque .panneau')) === 1, r0.t);
    await ev(c, () => { const m = document.getElementById('tt-am'); if (m) m.value = 'Oubli de pointer, confirmé avec elle'; }); await clic(c, '[data-tt="ajoutok"]');
    const r1 = await ev(c, () => { const t = PT_TRACE[PT_TRACE.length - 1], p = POINTAGES[POINTAGES.length - 1]; return { np:POINTAGES.length, tr:PT_TRACE.length, t, p, nt:NOTIFS.length, toast:document.getElementById('toast').innerText }; });
    v('I : avec le motif, la journée est ajoutée, tracée (« pas de pointage → 08:00–12:00 »), le salarié prévenu', r1.np === base.np + 1 && r1.tr === base.tr + 1 && r1.t.champ === 'journee' && r1.t.apres === '08:00–12:00' && r1.t.motif.length > 5 && r1.nt === base.nt + 1 && r1.p.qui === 'lr', r1);
    v('I : le toast porte « Annuler » ; annuler retire la journée et la trace', /Annuler/.test(r1.toast) && await (async () => { await toastClic(c, 'Annuler'); const r = await ev(c, () => ({ np:POINTAGES.length, tr:PT_TRACE.length })); return r.np === base.np && r.tr === base.tr; })());
    await clic(c, '[data-tt="ajout"]'); await ev(c, () => { document.getElementById('tt-aq').value = 'sm'; document.getElementById('tt-aj').value = jour(-1); document.getElementById('tt-am').value = 'doublon'; }); await clic(c, '[data-tt="ajoutok"]');
    v('I : une journée déjà pointée n\'est pas doublée', (await ev(c, () => POINTAGES.length)) === base.np && /déjà une journée/.test(await ev(c, () => document.getElementById('toast').innerText)));
    await ev(c, () => { fermerPanneau(); const i = POINTAGES.findIndex(o => o.qui === 'sm' && o.date === jour(-2)); POINTAGES.splice(i, 1); rendre(); });
    const l = (await lignes(c)).find(x => /n’a pas pointé/.test(x)); v('I : une journée planifiée sans pointage devient UNE rangée « Sophie avait une intervention jeudi et n\'a pas pointé »', !!l && /Sophie/.test(l) && /Ajouter sa journée/.test(l), l);
    await clic(c, '[data-tt^="ajout|sm|"]'); v('I : « Ajouter sa journée » ouvre la feuille préremplie (Sophie, le jeudi)', (await ev(c, () => document.getElementById('tt-aq').value)) === 'sm' && (await ev(c, () => document.getElementById('tt-aj').value)) === (await ev(c, () => jour(-2))));
    await L.fin(c); }

  /* ── J. « La règle », « Rappels » ── */
  { const c = await frais(); await clic(c, '[data-tt="regle"]'); const r = await ev(c, () => ({ h2:document.querySelector('#calque .panneau h2').textContent, det:document.querySelectorAll('#calque .tt-det').length, refs:[...document.querySelectorAll('#calque .tt-det')].map(e => e.textContent).join('|'), pied:document.querySelector('#calque .panneau').textContent }));
    v('J : « La règle » — cinq repères, la référence du Code du travail DANS le « ? »', r.h2 === 'La règle' && r.det === 5 && /L3121-18/.test(r.refs) && /expert-comptable/.test(r.pied), r);
    v('J : la référence n\'est écrite que là (plus nulle part ailleurs dans l\'écran)', !/L3121|L3131|L3132/.test(await txt(c, '#contenu')));
    await L.ranger(c.p); await clic(c, '[data-tt="rappels"]'); await ev(c, () => { document.getElementById('tt-rap').checked = false; }); await clic(c, '[data-tt="rappelsok"]');
    v('J : éteindre les rappels s\'écrit et la ligne le dit', (await ev(c, () => PTX.rappels)) === false && /rappels automatiques sont éteints/.test(await txt(c, '.tt-aide')));
    await L.fin(c); }

  /* ── K. entrées et retours ── */
  { const c = await frais(); await clic(c, '[data-tt="onglet|semaine"]'); await L.aller(c.p, 'equipe'); await L.aller(c.p, 'pointage');
    v('K : on revient TOUJOURS sur « Aujourd\'hui »', (await ev(c, () => ptOnglet)) === 'auj' && (await ev(c, () => document.querySelector('.seg [aria-pressed="true"]').textContent)).startsWith('Aujourd’hui'));
    await L.aller(c.p, 'equipe'); await ev(c, () => eqFiche('sm')); await clic(c, '[data-eq="heures|sm"]'); await c.p.waitForTimeout(500);
    v('K : « Ses heures › » d\'Équipe ouvre le MOIS de la personne (VEHICULES-TEMPS § 8 : étape 5), la feuille de Sophie ouverte', (await ev(c, () => route)) === 'pointage' && (await ev(c, () => ptOnglet)) === 'mois' && (await ev(c, () => (document.querySelector('#calque .panneau h2') || {}).textContent)) === 'Sophie Martin', await ev(c, () => ptOnglet));
    await ev(c, () => { ptOnglet = 'paie'; rendre(); }); v('K : l\'ancien onglet « paie » devient « Mois »', (await ev(c, () => ptOnglet)) === 'mois');
    await L.aller(c.p, 'comptabilite'); await ev(c, () => paieAller('paiemois')); await c.p.waitForTimeout(400);
    const e1 = await ev(c, () => { const V = PT_GENS.map(paieVariables), E = paieEtapes(V); return { t:E[0].d, vt:document.body.innerText.includes('Valider ce qui est en règle') }; });
    v('K : la Paie dit les mêmes mots (« N personnes ont encore des heures à valider », « Valider ce qui est en règle »)', /personnes ont encore des heures à valider/.test(e1.t) && !/semaines pas encore validées/.test(e1.t) && e1.vt, e1);
    await L.fin(c); }

  /* ── L. grille ou liste, selon la largeur du CONTENEUR (jamais celle de l'écran) ── */
  for (const profil of ['mac', 'windows', 'ipad', 'iphone', 'android', 'petit']) { const c = await frais(profil); await clic(c, '[data-tt="onglet|semaine"]');
    const o = await ev(c, () => ({ g:getComputedStyle(document.querySelector('.tt-grille')).display, l:getComputedStyle(document.querySelector('.tt-liste')).display, w:document.querySelector('.tt-conteneur').clientWidth }));
    const grille = ['mac', 'windows'].includes(profil); v(`L : ${profil} (conteneur ${o.w} px) — ${grille ? 'la grille de sept jours' : 'la liste, plus de grille'}`, grille ? o.g !== 'none' && o.l === 'none' : o.g === 'none' && o.l !== 'none', o);
    await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
