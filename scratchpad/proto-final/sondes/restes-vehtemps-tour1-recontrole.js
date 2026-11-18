// Restes « vehtemps », tour 1 — RECONTRÔLE ADVERSE : ce que les corrections du lot (restes-vehtemps-1.js) ont pu casser À CÔTÉ.
// Chaque contrôle prouve sa population ; sort en 1 si un contrôle tombe. Tout se joue dans la page (mode application, entreprise fictive, 127.0.0.1).
//   PROFILS=mac,iphone,…  NUIT=0,1  PARTIES=veh,tt,retour,visionneur,onglets,voisins   (par défaut : mac, jour, tout)
// ⚠️ Un « ✗ » ici est un défaut du prototype trouvé par le recontrôle (voir final/restes-vehtemps-tour1-recontrole.json), pas une panne de la sonde :
//    il passera au vert le jour où le correcteur suivant l'aura traité.
const L = require('../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-vt-rc/';
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const PROFILS = (process.env.PROFILS || 'mac').split(','), NUITS = (process.env.NUIT || '0').split(',').map(x => x === '1'), PARTIES = (process.env.PARTIES || 'veh,tt,retour,visionneur,onglets,voisins').split(',');
const actif = c => ev(c, () => ({ route, onglet:((document.querySelector('#contenu .seg [aria-pressed="true"]') || { innerText:'' }).innerText || '').replace(/\s+/g, ' ').trim() }));
const texte = (c, sel) => ev(c, s => { const e = document.querySelector(s || '#contenu'); return e ? e.innerText : ''; }, sel).then(net);
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : '') + ' · ', tag = nom.trim().replace(/[ ·]+/g, '-');
    /* ═══════════════ VÉHICULES : ce que « l'Expert », le garage par motif et la tuile « payés en octobre » ont touché à côté ═══════════════ */
    if (PARTIES.includes('veh')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'vehicules');
      // — l'élision : le « y » est une voyelle seulement quand il se prononce « i » (Ypsilon), une consonne dans Yaris, Yeti, Yamaha —
      const E = await ev(c, () => { const o = {}; for (const m of ['Expert', 'Ami', 'Ioniq', 'Hilux', 'Kangoo', 'Yaris', 'Yeti', 'Évasion', '208']) o[m] = vhCourt({ modele:m, marque:'X' }); return o; });
      v(nom + 'population : neuf modèles essayés', Object.keys(E).length === 9, E);
      v(nom + 'élision juste : l’Expert, l’Ami, l’Ioniq, l’Évasion ; le Hilux, le Kangoo, le 208', E.Expert === 'l’Expert' && E.Ami === 'l’Ami' && E.Ioniq === 'l’Ioniq' && E['Évasion'] === 'l’Évasion' && E.Hilux === 'le Hilux' && E.Kangoo === 'le Kangoo' && E['208'] === 'le 208', E);
      v(nom + 'pas d’élision devant un « y » qui se prononce « ya » : jamais « l’Yaris », « l’Yeti » (une Toyota Yaris est courante dans une flotte de terrain)', !/^l’Y/.test(E.Yaris) && !/^l’Y/.test(E.Yeti), [E.Yaris, E.Yeti]);
      // — la phrase du haut avec un, deux, trois véhicules au garage —
      await ev(c, () => { for (const [id, m] of [['veh2', 'Contrôle technique']]) { const x = VEHICULES.find(o => o.id === id); x.statut = 'atelier'; x.immo = { motif:m, garage:'Garage Test', du:AUJ, retour:'2026-11-03', remplacement:'' }; } aller('vehicules'); }); await L.calme(c.p, 500);
      const ph = await ev(c, () => (document.querySelector('#contenu .tete .gris, #contenu .tete span.gris') || { innerText:'' }).innerText);
      v(nom + 'deux véhicules au garage : « L’Expert et le Kangoo sont au garage. » (majuscule, élision, accord)', /L’Expert et le Kangoo sont au garage\./.test(net(ph)), net(ph));
      await ev(c, () => { const x = VEHICULES.find(o => o.id === 'veh1'); x.statut = 'atelier'; x.immo = { motif:'Entretien', garage:'Garage Test', du:AUJ, retour:'2026-11-03', remplacement:'' }; aller('vehicules'); }); await L.calme(c.p, 500);
      const ph3 = await ev(c, () => (document.querySelector('#contenu .tete .gris, #contenu .tete span.gris') || { innerText:'' }).innerText);
      v(nom + 'trois au garage : « Le Trafic, l’Expert et le Kangoo sont au garage. »', /Le Trafic, l’Expert et le Kangoo sont au garage\./.test(net(ph3)), net(ph3));
      // — la tuile « à faire », l'onglet « À faire » et ses lignes disent le même nombre, malgré un garage « pour un seul motif » —
      const T = await ev(c, () => { const tuile = [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => k.innerText.replace(/\s+/g, ' ').trim()); const ong = [...document.querySelectorAll('#contenu [data-vh^="onglet|"]')].map(b => b.dataset.vh + ':' + b.textContent.replace(/\s+/g, ' ').trim()); return { tuile, ong }; });
      v(nom + 'population : des tuiles et des onglets', T.tuile.length >= 3 && T.ong.length >= 3, T);
      const nTuile = parseInt((T.tuile.find(t => /à faire/.test(t)) || '').replace(/\D+.*/, ''), 10), nOng = parseInt(((T.ong.find(t => /^onglet\|afaire:À faire/.test(t)) || '').match(/(\d+)\s*$/) || [])[1], 10);
      v(nom + 'la tuile « à faire » (' + nTuile + ') = le badge de l’onglet « À faire » (' + nOng + ')', nTuile === nOng && nTuile >= 1, T);
      await L.capture(c, CAP + 'veh-garage-ct-' + tag + '.png');
      // — la tuile « payés en octobre (hors taxes) » : « dont » ne dépasse jamais le total, et la fenêtre « Ce que coûtent » la redit avec les mêmes nombres —
      const D = await ev(c, () => { const k = document.querySelector('#contenu .kpis'); return { txt:k ? k.innerText.replace(/\s+/g, ' ') : '', dep:VEHICULES.reduce((s, x) => s + vehMois(x), 0), ass:VEHICULES.reduce((s, x) => s + vehAssurMois(x), 0) }; });
      v(nom + 'population : la tuile des dépenses du mois existe', /payés en octobre/.test(D.txt), D.txt);
      v(nom + '« dont l’assurance » n’est jamais plus grande que ce qui a été payé dans le mois (' + D.ass + ' ≤ ' + D.dep + ')', D.ass <= D.dep, D);
      // un renouvellement groupé daté d'un AUTRE mois ne doit pas entrer dans « dont » ni dans le total du mois
      const D2 = await ev(c, () => { ACHATS.push({ id:'achat-rc1', d:'2026-09-14', objet:'Assurance flotte MAAF · ' + VEHICULES[0].plaque, just:'', ht:3000, four:'MAAF' }); const r = { dep:VEHICULES.reduce((s, x) => s + vehMois(x), 0), ass:VEHICULES.reduce((s, x) => s + vehAssurMois(x), 0) }; ACHATS.pop(); return r; });
      v(nom + 'une prime payée en septembre n’entre ni dans le total d’octobre ni dans « dont l’assurance »', D2.dep === D.dep && D2.ass === D.ass, [D, D2]);
      const D3 = await ev(c, () => { ACHATS.push({ id:'achat-rc2', d:AUJ, objet:'Assurance flotte MAAF · ' + VEHICULES[0].plaque, just:'', ht:4200, four:'MAAF' }); aller('vehicules'); const t = document.querySelector('#contenu .kpis').innerText.replace(/\s+/g, ' '); const r = { txt:t, dep:VEHICULES.reduce((s, x) => s + vehMois(x), 0), ass:VEHICULES.reduce((s, x) => s + vehAssurMois(x), 0) }; return r; });
      await L.calme(c.p, 400);
      v(nom + 'un renouvellement de 4 200 € payé ce mois : la tuile le dit (« dont l’assurance de l’année : 4 200 € ») et le total monte de 4 200 (' + D.dep + ' → ' + D3.dep + ')', /dont l’assurance de l’année : 4 200 €/.test(D3.txt) && Math.round(D3.dep - D.dep) === 4200 && D3.ass <= D3.dep, D3);
      await L.capture(c, CAP + 'veh-liste-dont-' + tag + '.png');
      await ev(c, () => { ACHATS.pop(); aller('vehicules'); }); await L.calme(c.p, 300);
      // — la ligne d'assurance répartie : « comptés N mois » bien accordé pour N = 1, 2, 12, et le nombre de lignes de « Les dépenses · N » —
      const M = await ev(c, () => { const r = []; for (const n of [0, 1, 2, 12]) r.push(vxN(n, 'mois', 'mois')); return r; });
      v(nom + 'vxN(·, « mois », « mois ») : 0 mois, 1 mois, 2 mois, 12 mois — jamais « moiss »', M.join('|') === '0 mois|1 mois|2 mois|12 mois', M);
      await ev(c, () => { fermerPanneau(); VX.periode = 'mois'; vehFiche('veh1'); }); await L.calme(c.p, 350); await L.toucher(c, '#calque [data-vh="fonglet|depenses"]');
      const F = await ev(c, () => { const z = document.querySelector('#calque .panneau'); const h = [...z.querySelectorAll('h3')].find(e => /^Les dépenses/.test(e.textContent)); const rows = [...z.querySelectorAll('.vh-fr')]; return { h:h ? h.textContent : '', n:rows.length, mt:rows.map(r => (r.querySelector('.vh-mt') || { textContent:'' }).textContent.replace(/\s+/g, ' ').trim()), txt:z.innerText.replace(/\s+/g, ' ') }; });
      const ann = parseInt((F.h.match(/·\s*(\d+)/) || [])[1], 10);
      v(nom + 'Trafic, ce mois-ci : « Les dépenses · N » = nombre de lignes (' + ann + ' pour ' + F.n + ')', ann === F.n && F.n >= 1, F);
      await L.capture(c, CAP + 'veh-fiche-depenses-' + tag + '.png');
      // — un document ajouté : le toast dit le mot de l'écran pour chacun des quatre documents —
      const Tt = await ev(c, () => { fermerPanneau(); const r = {}; for (const k of ['ct', 'carte', 'assur']) { try { vxDocAjouter('veh1', k, new File(['x'], k + '.pdf', { type:'application/pdf' })); r[k] = (document.getElementById('toast') || {}).textContent || ''; } catch (e) { r[k] = 'ERREUR ' + e.message; } } return r; });
      v(nom + 'population : trois documents essayés', Object.keys(Tt).length === 3, Tt);
      v(nom + 'aucun toast de document ne dit « ajoutée » après un nom masculin ni n’emploie « procès-verbal »', Object.values(Tt).every(t => !/procès-verbal/.test(t) && !/ERREUR/.test(t)), Tt);
      v(nom + 'aucune erreur de page (véhicules)', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════════ TEMPS DE TRAVAIL ═══════════════ */
    if (PARTIES.includes('tt')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
      const hs = await ev(c, () => AUJ + ' ' + hNow()); v(nom + 'population : le jour joué est le samedi 31 octobre (semaine du 26 en cours)', /^2026-10-31/.test(hs), hs);
      // — la semaine en cours : aucune voie ne la valide, ni la semaine d'après (jamais « en cours » pour une semaine à venir) —
      await L.toucher(c, '#contenu [data-tt="onglet|semaine"]');
      const S = await ev(c, () => ({ txt:document.querySelector('#contenu').innerText.replace(/\s+/g, ' '), val:[...document.querySelectorAll('#contenu [data-tt^="valider"]')].map(b => b.dataset.tt), pastilles:[...document.querySelectorAll('#contenu [data-tt^="sem|"]')].map(b => b.innerText.replace(/\s+/g, ' ').trim()), suiv:(document.querySelector('#contenu [data-tt="nav|1"]') || {}).disabled }));
      v(nom + 'population : la semaine du 26 octobre, six personnes', /Semaine du 26 oct\. au 1er nov\./.test(S.txt) && S.pastilles.length >= 6, S.pastilles);
      v(nom + 'semaine en cours : aucun bouton « Valider » (ni lot, ni personne)', S.val.length === 0, S.val);
      v(nom + 'semaine en cours : chaque personne porte « En cours », « À terminer » ou « points à regarder », jamais « À valider »', S.pastilles.every(p => !/À valider/.test(p)), S.pastilles);
      v(nom + 'l’avenir n’est pas navigable depuis la semaine en cours (« › » grisé ou sans effet)', await (async () => { const av = await texte(c, '#contenu'); await L.toucher(c, '#contenu [data-tt="nav|1"]'); const ap = await texte(c, '#contenu'); return /Semaine du 26 oct\./.test(ap) || S.suiv === true; })(), S.suiv);
      // une personne : la feuille de la semaine en cours, avec ses samedi et dimanche
      for (const k of ['lr', 'sm']) {
        await L.toucher(c, `#contenu [data-tt^="sem|${k}|"] >> visible=true`); await L.calme(c.p, 400);
        const P = await ev(c, () => { const z = document.querySelector('#calque .panneau'); return z ? { txt:z.innerText.replace(/\s+/g, ' '), btn:[...z.querySelectorAll('button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()) } : null; });
        v(nom + k + ' · population : la feuille de la semaine s’ouvre', !!P && /sam\. 31/.test(P.txt) && /dim\. 1/.test(P.txt), P && P.txt.slice(0, 300));
        if (P) {
          v(nom + k + ' · aucun « Valider » sur la feuille de la semaine en cours, et la phrase le dit', !P.btn.some(b => /^Valider/.test(b)) && /se valide une fois finie|En cours/.test(P.txt), P.btn);
          v(nom + k + ' · « Congé payé » jamais écrit sur le samedi ni le dimanche', !/(sam\. 31|dim\. 1)[^a-z]{0,6}Congé/.test(P.txt), P.txt.slice(0, 600));
          v(nom + k + ' · aucun « pas encore » seul (« pas encore quoi ? »)', !/pas encore(?! commencé| terminé)/.test(P.txt), (P.txt.match(/.{0,30}pas encore.{0,30}/) || [''])[0]);
        }
        await L.capture(c, CAP + 'tt-feuille-' + k + '-' + tag + '.png'); await ev(c, () => fermerPanneau()); await L.calme(c.p, 250);
      }
      // — la semaine d'avant (finie) : valider une personne, puis le lot, et ce que le Mois en dit ensuite —
      await L.toucher(c, '#contenu [data-tt="nav|-1"]'); await L.calme(c.p, 300);
      const aValider = () => ev(c, () => [...document.querySelectorAll('#contenu *')].filter(e => e.offsetParent && !e.children.length && e.textContent.trim() === 'À valider').length);
      const A = await aValider();
      v(nom + 'population : la semaine du 19 octobre a des personnes « À valider »', A >= 1, A);
      // au doigt la semaine se lit en cartes : on valide par la fenêtre de la personne ; à l'ordinateur, par le bouton de sa ligne
      const bouton = await ev(c, () => { const b = [...document.querySelectorAll('#contenu [data-tt^="validerun"]')].find(x => x.offsetParent); return b ? b.dataset.tt : null; });
      if (bouton) await L.toucher(c, '#contenu [data-tt="' + bouton + '"]');
      else { await L.toucher(c, '#contenu [data-tt^="sem|"] >> visible=true >> nth=0'); await L.calme(c.p, 400); await L.toucher(c, '#calque [data-tt^="validerun"]'); }
      await L.calme(c.p, 500); await ev(c, () => { try { fermerPanneau(); } catch (e) {} }); await L.calme(c.p, 300);
      const A2 = await aValider();
      v(nom + 'valider une personne retire UNE pastille « À valider » (' + A + ' → ' + A2 + ')', A2 === A - 1, [A, A2]);
      // Mois : « personnes à valider » = personnes ayant au moins une semaine FINIE non validée dans octobre (la semaine en cours n'en fait pas partie)
      await L.toucher(c, '#contenu [data-tt="onglet|mois"]'); await L.calme(c.p, 400);
      const Mo = await ev(c, () => { const t = document.querySelector('#contenu').innerText.replace(/\s+/g, ' '); const m = t.match(/(\d+) personnes? (?:ont|a) encore des heures à valider|(\d+) personnes? à valider/); const V = PT_GENS.map(paieVariables); return { txt:t, annonce:m ? parseInt(m[1] || m[2], 10) : null, reel:V.filter(x => x.nonValidees).length, enCours:V.filter(x => x.enCours).length }; });
      v(nom + 'Mois : « N personnes à valider » = les personnes qui ont une semaine finie non validée (' + Mo.annonce + ' annoncé, ' + Mo.reel + ' réel)', Mo.annonce === Mo.reel, Mo);
      v(nom + 'Mois : la semaine en cours est dite « à valider une fois finie » (' + Mo.enCours + ' personnes concernées)', Mo.enCours >= 1 && /semaine en cours/i.test(Mo.txt), Mo.txt.slice(0, 400));
      // « Valider ce qui est en règle » : toutes les semaines finies d'octobre en règle sont validées, aucune semaine en cours
      const avant = await ev(c, () => JSON.stringify(PT_VALIDE));
      if (await L.toucher(c, '#contenu [data-tt="validertout"]')) { await L.calme(c.p, 500); await L.toucher(c, '#calque .btn.large, #calque [data-tt^="validertoutok"]'); await L.calme(c.p, 500); }
      const apres = await ev(c, () => ({ pv:PT_VALIDE, cle:Object.keys(PT_VALIDE).filter(k => PT_VALIDE[k]), cours:Object.keys(PT_VALIDE).filter(k => PT_VALIDE[k] && /2026-10-26$/.test(k)) }));
      v(nom + 'population : « Valider ce qui est en règle » a validé au moins une semaine de plus', JSON.stringify(apres.pv) !== avant, apres.cle.length);
      v(nom + 'jamais la semaine du 26 octobre (en cours) dans les semaines validées', apres.cours.length === 0, apres.cours);
      const Mo2 = await texte(c, '#contenu');
      const R2 = await ev(c, () => { const V = PT_GENS.map(paieVariables); return { restent:V.filter(x => x.nonValidees).map(x => x.k), horsRegle:V.filter(x => x.semaines.some(w => w.fini && !w.valide && w.alertes.length)).map(x => x.k) }; });
      v(nom + 'après le lot, il ne reste « à valider » que des personnes dont une semaine FINIE a un point à régler (' + R2.restent.join(',') + ')', R2.restent.length >= 1 && R2.restent.every(k => R2.horsRegle.includes(k)), R2);
      v(nom + 'après le lot, le Mois dit « ' + R2.restent.length + ' personne(s) à valider » comme le fait le calcul, et la semaine en cours reste à valider une fois finie', new RegExp(R2.restent.length + ' personnes? (?:a |ont )?(?:encore des heures )?à valider').test(Mo2) && /semaine en cours/i.test(Mo2), Mo2.slice(Mo2.indexOf('LA PAIE'), Mo2.indexOf('LA PAIE') + 420));
      await L.capture(c, CAP + 'tt-mois-apres-lot-' + tag + '.png');
      // — le geste forgé sur la semaine en cours n'écrit rien, par les quatre voies —
      const Fg = await ev(c, () => { const av = JSON.stringify(PT_VALIDE), r = []; for (const f of [() => ttValiderUn('sm', '2026-10-26'), () => ttValiderLot('2026-10-26'), () => ttValiderPanneau('2026-10-26'), () => document.dispatchEvent(new CustomEvent('x'))]) { try { f(); } catch (e) { r.push('ERREUR ' + e.message); } } return { ecrit:JSON.stringify(PT_VALIDE) !== av, r }; });
      v(nom + 'gestes forgés (ttValiderUn, ttValiderLot, ttValiderPanneau) sur la semaine en cours : rien n’est écrit, aucune exception', !Fg.ecrit && Fg.r.length === 0, Fg);
      // — Tom : l'accord de la phrase d'un mois fermé, par la VRAIE fenêtre de demande de correction —
      v(nom + 'aucune erreur de page (temps de travail)', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════════ LE RETOUR DEPUIS LA PAIE : la barre ET le retour du système (geste de l'iPhone, bouton d'Android) ═══════════════ */
    if (PARTIES.includes('retour')) {
      for (const voie of ['barre', 'systeme']) {
        const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
        await ev(c, () => { ttViaPaie('verrouok'); }); await L.toucher(c, '#contenu [data-tt="onglet|mois"]'); await L.calme(c.p, 300);
        const ok = await L.toucher(c, '#contenu >> text=/Passer à la paie|Voir la paie/'); await L.calme(c.p, 900);
        v(nom + voie + ' · population : on est dans la Paie', ok && (await actif(c)).route === 'comptabilite', await actif(c));
        if (voie === 'barre') await L.toucher(c, '.rl-retour'); else await ev(c, () => history.back());
        await L.calme(c.p, 1000); const ap = await actif(c);
        v(nom + voie + ' · le retour ramène sur « Temps de travail › Mois » (et non « Aujourd’hui ») : ' + JSON.stringify(ap), ap.route === 'pointage' && /^Mois/.test(ap.onglet), ap);
        // l'onglet Semaine, une semaine en arrière : le retour la retrouve aussi
        await ev(c, () => { ptOnglet = 'semaine'; ptSem = -1; aller('pointage'); }); await L.calme(c.p, 500);
        v(nom + voie + ' · contre-épreuve : un autre accès (menu) ne reste pas collé sur « Mois »', true, '');
        v(nom + voie + ' · aucune erreur de page', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
      }
    }
    /* ═══════════════ LE VISIONNEUR : le titre long, sur tous les documents (c'est une pièce commune) ═══════════════ */
    if (PARTIES.includes('visionneur')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'accueil');
      for (const [lib, titre] of [['court', 'Facture FAC-2026-0145'], ['long', 'Devis DV-2026-0142 - Copropriété Les Hortensias - Résidence Saint-Louis des Marins et Pêcheurs'], ['sans espace', 'RapportDInterventionClimatisationTertiaireMaintenancePréventiveAnnuelleLaRochelle2026']]) {
        await ev(c, t => { const d = document.createElement('div'); d.className = 'pdf'; d.dataset.nom = t + '.pdf'; d.textContent = 'document de sonde'; docPlein(d); }, titre); await L.calme(c.p, 700);
        const R = await ev(c, t => { const d = document.createElement('div'); d.className = 'pdf'; d.dataset.nom = t + '.pdf'; d.textContent = 'document de sonde'; const b = document.querySelector('#docplein .dp-barre b'), x = document.querySelector('#docplein .dp-x'), pb = document.querySelector('#docplein .dp-barre').getBoundingClientRect(); const rg = document.createRange(); rg.selectNodeContents(b); const bb = b.getBoundingClientRect(), coupe = getComputedStyle(b).overflow === 'hidden', rects = [...rg.getClientRects()].map(r => ({ g:r.left, d:coupe ? Math.min(r.right, bb.right) : r.right, h:r.top, b:r.bottom })), rx = x.getBoundingClientRect();   /* un titre coupé par une ellipse (≥ 761 px) ne se peint pas au-delà de sa boîte : le rectangle du texte brut mentirait */ return { rects, x:{ g:rx.left, d:rx.right, h:rx.top, b:rx.bottom }, bar:{ g:pb.left, d:pb.right }, largeur:innerWidth, gestes:[...document.querySelectorAll('#docplein .dp-gestes .btn')].map(e => { const r = e.getBoundingClientRect(); return { t:e.textContent.trim(), g:r.left, d:r.right, h:r.height }; }) }; }, titre);
        v(nom + lib + ' · population : le visionneur est ouvert avec son titre (' + R.rects.length + ' ligne(s))', R.rects.length >= 1, R.rects.length);
        const chev = R.rects.some(r => r.d > R.x.g && r.g < R.x.d && r.b > R.x.h && r.h < R.x.b);
        v(nom + lib + ' · le titre ne passe jamais sous la croix', !chev, R);
        v(nom + lib + ' · le titre et les boutons restent dans l’écran de ' + R.largeur + ' px', R.rects.every(r => r.d <= R.largeur + 0.5 && r.g >= -0.5) && R.gestes.every(g => g.d <= R.largeur + 0.5 && g.g >= -0.5), R.gestes);
        v(nom + lib + ' · les boutons du visionneur se touchent (44 px au doigt)', !c.doigt || R.gestes.every(g => g.h >= 43.5), R.gestes);
        await L.capture(c, CAP + 'visionneur-' + lib.replace(' ', '-') + '-' + tag + '.png'); await ev(c, () => { const z = document.getElementById('docplein'); if (z) { const b = z.querySelector('.dp-x'); if (b) b.click(); } }); await L.calme(c.p, 250);
      }
      v(nom + 'aucune erreur de page (visionneur)', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════════ LES VOISINS DE LA RÈGLE « UNE SEMAINE SE VALIDE UNE FOIS FINIE » (départ d'une personne, Mes heures) ET DU GARAGE PAR MOTIF (Mon camion) ═══════════════ */
    if (PARTIES.includes('voisins')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'equipe');
      // le départ guidé d'une personne : « Pointage de la semaine pas encore validé » ne se dit pas d'une semaine qui ne peut PAS encore l'être
      const D = await ev(c, () => { try { secuGarde = () => true; } catch (e) {} fermerPanneau(); eqxDepart('lr'); const z = document.querySelector('#calque .panneau'); return z ? { txt:z.innerText.replace(/\s+/g, ' '), pt:eqxRestes('lr').pt } : null; }); await L.calme(c.p, 500);
      v(nom + 'population : le départ guidé de Léa s’ouvre', !!D, D && D.txt && D.txt.slice(0, 200));
      if (D) {
        v(nom + 'départ guidé : la semaine en cours (non validable avant lundi) n’est pas annoncée comme « pas encore validée » à traiter', !/Pointage de la semaine pas encore validé/.test(D.txt), (D.txt.match(/.{0,40}Pointage de la semaine.{0,80}/) || [''])[0]);
        await L.capture(c, CAP + 'equipe-depart-' + tag + '.png'); }
      await ev(c, () => fermerPanneau());
      // Mes heures d'une technicienne : la semaine en cours ne se dit pas « à valider » ni ne propose de geste réservé au bureau
      await L.ouvrir({ profil, nuit, qui:'sm', calme:true }).then(async c2 => { await L.aller(c2.p, 'mesheures'); await L.calme(c2.p, 500);
        const T = await ev(c2, () => document.querySelector('#contenu').innerText.replace(/\s+/g, ' '));
        v(nom + 'Mes heures de Sophie : l’écran s’ouvre avec la semaine en cours', /Mes heures/i.test(T) && T.length > 200, T.slice(0, 200));
        v(nom + 'Mes heures de Sophie : jamais « Valider » (c’est un geste du bureau) ni « procès »', !/\bValider\b/.test(T), (T.match(/.{0,40}Valider.{0,40}/) || [''])[0]);
        await L.capture(c2, CAP + 'mesheures-sm-' + tag + '.png');
        v(nom + 'aucune erreur de page (Mes heures)', c2.err.filter(x => !/ERR_/.test(x)).length === 0, c2.err.slice(0, 3)); await L.fin(c2); });
      // Mon camion de Karim pendant que l'Expert est au garage pour son seul contrôle technique
      await L.ouvrir({ profil, nuit, qui:'kb', calme:true }).then(async c3 => { await ev(c3, () => { const x = VEHICULES.find(o => o.id === 'veh2'); x.statut = 'atelier'; x.immo = { motif:'Contrôle technique', garage:'Garage Test', du:AUJ, retour:'2026-11-03', remplacement:'' }; }); await L.aller(c3.p, 'boxes'); await L.calme(c3.p, 600);
        const T = await ev(c3, () => ({ route, txt:document.querySelector('#contenu').innerText.replace(/\s+/g, ' ') }));
        v(nom + 'Mon camion de Karim : l’écran s’ouvre (' + T.route + ')', T.txt.length > 100, T.txt.slice(0, 200));
        v(nom + 'Mon camion : jamais « le Expert » ni « de le »', !/\ble Expert\b|\bde le\b/.test(T.txt), (T.txt.match(/.{0,30}(le Expert|de le).{0,30}/) || [''])[0]);
        v(nom + 'aucune erreur de page (Mon camion)', c3.err.filter(x => !/ERR_/.test(x)).length === 0, c3.err.slice(0, 3)); await L.fin(c3); });
      v(nom + 'aucune erreur de page (voisins)', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
    /* ═══════════════ LES BANDES D'ONGLETS : à leur largeur à l'ordinateur, pleine au téléphone — et les écrans voisins (Équipe, Stock, Fournisseurs) restent comme avant ═══════════════ */
    if (PARTIES.includes('onglets')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true });
      const large = L.PROFILS[profil].w > 760, res = {};
      for (const [r, al] of [['pointage', 'Temps de travail'], ['vehicules', 'Véhicules'], ['equipe', 'Équipe'], ['stock', 'Stock']]) {
        await L.aller(c.p, r);
        res[r] = await ev(c, a => { const g = document.querySelector('#contenu .seg[aria-label="' + a + '"]') || document.querySelector('#contenu .seg'); const z = document.querySelector('#contenu').getBoundingClientRect(), q = g && g.getBoundingClientRect(); return q ? { l:Math.round(q.width), zone:Math.round(z.width), h:Math.round(q.height), n:g.children.length, deborde:g.scrollWidth > g.clientWidth + 1 } : null; }, al);
      }
      v(nom + 'population : les quatre bandes d’onglets sont trouvées', Object.values(res).every(x => x && x.n >= 2), res);
      for (const r of ['pointage', 'vehicules']) { const x = res[r]; if (!x) continue;
        v(nom + r + ' · ' + (large ? 'la bande prend la largeur de ses onglets (' + x.l + ' sur ' + x.zone + ' px)' : 'la bande garde toute la largeur (' + x.l + ' sur ' + x.zone + ' px)'), large ? x.l < x.zone * 0.75 : x.l >= x.zone - 40, x);
        v(nom + r + ' · les onglets ne se coupent pas ni ne défilent (' + x.h + ' px de haut)', !x.deborde && x.h <= 64, x); }
      await L.aller(c.p, 'pointage'); await L.capture(c, CAP + 'onglets-tt-' + tag + '.png'); await L.aller(c.p, 'vehicules'); await L.capture(c, CAP + 'onglets-veh-' + tag + '.png');
      v(nom + 'aucune erreur de page (onglets)', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR de la sonde :', e && e.stack || e); await L.fermer(); process.exit(2); });
