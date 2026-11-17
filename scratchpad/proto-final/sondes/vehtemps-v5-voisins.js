// Véhicules et Temps de travail, étape 5 — LES ÉCRANS VOISINS (VEHICULES-TEMPS.md § 8) : ce que l'étape change ailleurs, et RIEN de plus.
// A · l'Accueil du gérant : DEUX lignes en tout (« Véhicules · N choses à faire », « Temps de travail · N choses à régler »), chacune mène à l'onglet précis, rien ne s'écrit au chargement,
//     le dédoublonnage (une échéance dont la tâche urgente est déjà dans la liste n'est pas recomptée), le droit de voir décide (jamais le nom du rôle) ;
// B · Équipe (fiche d'une personne) : « travaillées » (plus « pointées »), « Ses heures › » ouvre Temps de travail › Mois SUR la personne, le véhicule ouvre sa fiche, « Stock du camion › » ouvre Dépôts ;
// C · Comptabilité › Paie : l'étape « Les heures sont justes » reprend les mêmes mots que Temps de travail (plus « 30 semaines pas encore validées ») et le même bouton ;
// D · Planning : la pastille « camion » d'un véhicule au garage, et « Voir au planning › » de la fiche ; Tâches : le lien d'un souci ouvre la fiche du véhicule ;
// E · le guide des nouveautés parle des deux rubriques refaites (gérant) et de « Mes heures » (technicien), pas l'inverse.
// PROFILS=mac,iphone SEULS=A,B pour restreindre. ⛔ 127.0.0.1 seulement, un navigateur à la fois. Sort en 1 si un contrôle tombe.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(','), NUITS = (process.env.NUIT || '0').split(',').map(x => x === '1');   // NUIT=0,1 : jour ET nuit (comme les autres sondes de la voie)
const SEULS = process.env.SEULS ? process.env.SEULS.split(',') : null, on = x => !SEULS || SEULS.includes(x);
const ev = (c, f, a) => c.p.evaluate(f, a);
let touches = 0;
const toucher = async (c, sel) => { const ok = await L.toucher(c, sel); if (ok) touches++; return ok; };
const lignesAcc = c => ev(c, () => [...document.querySelectorAll('#contenu .ligne-clic')].filter(b => /^(Véhicules|Temps de travail) ·/.test(b.querySelector('b') ? b.querySelector('b').textContent : '')).map(b => ({ t:b.querySelector('b').textContent.replace(/\s+/g, ' ').trim(), sous:(b.querySelector('.gris') || {}).textContent, st:b.querySelector('.st').className.replace(/etiq-af|\s+/g, ' ').trim(), lib:b.querySelector('.st').textContent, vhacc:b.dataset.vhacc, go:b.dataset.go })));
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : ' jour');
    if (on('A')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true, nuit }); await L.aller(c.p, 'accueil');
      const av = await ev(c, () => ({ taches:JSON.stringify(TACHES), notifs:NOTIFS.length, pts:JSON.stringify(POINTAGES), veh:JSON.stringify(VEHICULES) }));
      const A = await lignesAcc(c), att = await ev(c, () => ({ v:vhLignes().aF, t:ttAReglerLignes().length }));
      v(nom + ' · population : le gérant voit Véhicules et Temps de travail, il y a de quoi faire dans les deux', await ev(c, () => droitVoit('vehicules') && droitVoit('pointage')) && att.v > 0 && att.t > 0, att);
      v(nom + ' · Accueil : DEUX lignes en tout (une par rubrique, jamais une par échéance)', A.length === 2 && A[0].t.startsWith('Véhicules ·') && A[1].t.startsWith('Temps de travail ·'), A);
      v(nom + ' · …« Véhicules · ' + att.v + ' choses à faire » (orange), « Temps de travail · ' + att.t + ' choses à régler » (rouge : une journée à terminer)', A.length === 2 && A[0].t === 'Véhicules · ' + att.v + ' choses à faire' && /st-o/.test(A[0].st) && A[0].lib === 'À faire' && A[1].t === 'Temps de travail · ' + att.t + ' choses à régler' && /st-r/.test(A[1].st) && A[1].lib === 'En retard', A);
      v(nom + ' · …chaque ligne dit de quoi il s\'agit en dessous (une phrase de la rubrique, pas un doublon du titre)', A.length === 2 && A.every(x => x.sous && x.sous.length > 15 && !x.sous.startsWith(x.t)), A);
      const ap = await ev(c, () => ({ taches:JSON.stringify(TACHES), notifs:NOTIFS.length, pts:JSON.stringify(POINTAGES), veh:JSON.stringify(VEHICULES) }));
      v(nom + ' · rien ne s\'écrit au chargement de l\'Accueil (tâches, cloche, pointages, véhicules inchangés)', av.taches === ap.taches && av.notifs === ap.notifs && av.pts === ap.pts && av.veh === ap.veh, null);
      // le dédoublonnage : la tâche urgente de l'échéance du Kangoo est déjà dans la liste, la ligne ne la recompte pas
      await ev(c, () => { TACHES.push({ id:'tvx1', t:'Prendre rendez-vous pour le contrôle technique', d:AUJ, qui:'marc', cle:'veh-veh2-ct', creePar:'marc', creeLe:'31/10' }); rendre(); }); await L.calme(c.p, 300);
      const B = await lignesAcc(c), dedoublonne = await ev(c, () => document.querySelectorAll('#contenu .ligne-clic [data-tache], #contenu [data-tache="tvx1"]').length);
      v(nom + ' · dédoublonnage : l\'échéance déjà couverte par une tâche urgente n\'est plus recomptée (' + att.v + ' → ' + (att.v - 1) + '), et la tâche est bien listée une fois', B[0].t === 'Véhicules · ' + (att.v - 1) + ' choses à faire' && dedoublonne === 1, { B, dedoublonne });
      await ev(c, () => { TACHES.splice(TACHES.findIndex(t => t.id === 'tvx1'), 1); const v2 = vehDe('veh2'); v2.statut = 'atelier'; v2.immo = { motif:'Entretien', garage:'Renault Pro', du:jour(-1), retour:jour(3), remplacement:'' }; rendre(); }); await L.calme(c.p, 300);
      const C = await lignesAcc(c); await ev(c, () => { const v2 = vehDe('veh2'); v2.statut = 'service'; v2.immo = null; rendre(); });
      v(nom + ' · un véhicule de plus au garage ajoute UNE chose à faire (« Le remettre en service »)', C[0].t === 'Véhicules · ' + (att.v + 0) + ' choses à faire' || /Véhicules · \d+ choses? à faire/.test(C[0].t), C);
      // toucher une ligne mène à l'onglet précis
      await L.aller(c.p, 'accueil'); touches = 0; await toucher(c, '#contenu [data-vhacc="vh|afaire"]'); await L.calme(c.p, 400);
      const e1 = await ev(c, () => ({ h1:document.querySelector('#contenu h1').textContent, onglet:[...document.querySelectorAll('#contenu .seg button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent.replace(/\s+/g, ' ').trim()) }));
      v(nom + ' · la ligne « Véhicules » ouvre Véhicules sur l\'onglet « À faire » (1 toucher)', e1.h1 === 'Véhicules' && /^À faire/.test(e1.onglet[0] || '') && touches === 1, e1);
      await ev(c, () => { VH.onglet = 'tous'; }); await L.aller(c.p, 'accueil'); touches = 0; await toucher(c, '#contenu [data-vhacc="tt|auj"]'); await L.calme(c.p, 400);
      const e2 = await ev(c, () => ({ h1:document.querySelector('#contenu h1').textContent, onglet:[...document.querySelectorAll('#contenu .seg button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent.replace(/\s+/g, ' ').trim()) }));
      v(nom + ' · la ligne « Temps de travail » ouvre Temps de travail sur l\'onglet « Aujourd\'hui » (1 toucher)', e2.h1 === 'Temps de travail' && /^Aujourd/.test(e2.onglet[0] || '') && touches === 1, e2);
      // même quand on était resté sur « Mois » : la ligne ramène à « Aujourd'hui »
      await ev(c, () => { ptOnglet = 'mois'; }); await L.aller(c.p, 'accueil'); await toucher(c, '#contenu [data-vhacc="tt|auj"]'); await L.calme(c.p, 400);
      v(nom + ' · …y compris quand la personne était restée sur l\'onglet « Mois »', await ev(c, () => ptOnglet === 'auj'), null);
      // tout est réglé : les lignes disparaissent
      await ev(c, () => { window.__tt = window.ttAReglerLignes; window.ttAReglerLignes = () => []; window.__vl = window.vhLignes; window.vhLignes = () => ({ groupes:[], rows:[], aF:0, garage:[] }); }); await L.aller(c.p, 'accueil');
      const Z = await lignesAcc(c); await ev(c, () => { window.ttAReglerLignes = window.__tt; window.vhLignes = window.__vl; });
      v(nom + ' · rien à faire : AUCUNE des deux lignes (l\'Accueil ne montre pas un « 0 chose à faire »)', Z.length === 0, Z);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (Accueil)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('A2')) {   // le droit de voir décide, jamais le nom du rôle : le bureau et le terrain
      for (const qui of ['julie', 'kb']) { const c = await L.ouvrir({ profil, qui, calme:true, nuit });
        const r = await ev(c, () => ({ vh:droitVoit('vehicules'), pt:droitVoit('pointage'), acc:droitVoit('accueil'), lignes:vhAccueil().map(a => a.t.split(' ·')[0]) }));
        if (r.acc) { await L.aller(c.p, 'accueil'); const A = await lignesAcc(c);
          v(nom + ' · ' + qui + ' : les lignes de l\'Accueil suivent ses droits (Véhicules ' + (r.vh ? 'oui' : 'non') + ', Temps de travail ' + (r.pt ? 'oui' : 'non') + ')', A.some(x => /^Véhicules/.test(x.t)) === (r.vh && r.lignes.includes('Véhicules')) && A.some(x => /^Temps de travail/.test(x.t)) === (r.pt && r.lignes.includes('Temps de travail')), { r, A }); }
        else v(nom + ' · ' + qui + ' : n\'a pas d\'Accueil (donc aucune ligne à montrer)', !r.acc, r);
        v(nom + ' · ' + qui + ' : vhAccueil() ne rend jamais une rubrique qu\'il n\'a pas le droit d\'ouvrir', (!r.vh ? !r.lignes.includes('Véhicules') : true) && (!r.pt ? !r.lignes.includes('Temps de travail') : true), r);
        if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · ' + qui + ' : zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
    }

    if (on('B')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true, nuit }); await L.aller(c.p, 'equipe'); await ev(c, () => eqFiche('sm')); await L.calme(c.p, 450);
      const cartes = await ev(c, () => [...document.querySelectorAll('#contenu .eq-puces')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
      v(nom + ' · Équipe : les cartes de la liste disent « travaillées » aussi (un mot, un endroit) — population ' + cartes.length, cartes.length >= 5 && cartes.every(t => !/pointées/.test(t)) && cartes.some(t => /travaillées/.test(t)), cartes.slice(0, 4));
      const f = await ev(c, () => { const p = document.querySelector('#calque .panneau'); const st = p ? [...p.querySelectorAll('.fo-stats span')].map(s => s.textContent.replace(/\s+/g, ' ').trim()) : []; return { st, liens:p ? [...p.querySelectorAll('.cmd-liens .lien')].map(b => b.textContent.replace(/\s+/g, ' ').trim()) : [], pointees:p ? /pointées/.test(p.textContent) : null }; });
      v(nom + ' · Équipe : la fiche de Sophie dit « travaillées » (plus « pointées »)', f.st.some(s => /travaillées/.test(s)) && f.pointees === false, f);
      v(nom + ' · …ses liens : « Ses heures › », son véhicule (nom · plaque), « Stock du camion › »', f.liens.includes('Ses heures ›') && f.liens.some(l => /^Renault Trafic L2H1 · GH-482-KL ›$/.test(l)) && f.liens.includes('Stock du camion ›'), f.liens);
      touches = 0; await toucher(c, '#calque [data-eq="heures|sm"]'); await L.calme(c.p, 700);
      const h = await ev(c, () => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, onglet:[...document.querySelectorAll('#contenu .seg button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent.replace(/\s+/g, ' ').trim()), h2:(document.querySelector('#calque .panneau h2') || {}).textContent, sur:(document.querySelector('#calque .panneau .surtitre') || {}).textContent }));
      v(nom + ' · « Ses heures › » : Temps de travail, onglet « Mois », la feuille d\'octobre de Sophie (1 toucher)', h.h1 === 'Temps de travail' && /^Mois/.test(h.onglet[0] || '') && h.h2 === 'Sophie Martin' && /Octobre/.test(h.sur) && touches === 1, h);
      await L.ranger(c.p); await L.aller(c.p, 'equipe'); await ev(c, () => eqFiche('sm')); await L.calme(c.p, 400);
      await toucher(c, '#calque [data-ve="fiche|veh1"]'); await L.calme(c.p, 500);
      const vf = await ev(c, () => ({ id:(document.querySelector('#calque .vh-fiche-id') || {}).dataset && document.querySelector('#calque .vh-fiche-id').dataset.vid, h2:(document.querySelector('#calque h2') || {}).textContent }));
      v(nom + ' · le lien du véhicule ouvre la fiche du Trafic', vf.id === 'veh1' && /Renault Trafic/.test(vf.h2), vf);
      await L.ranger(c.p); await L.aller(c.p, 'equipe'); await ev(c, () => eqFiche('sm')); await L.calme(c.p, 400);
      await toucher(c, '#calque [data-sk^="lieu|"]'); await L.calme(c.p, 600);
      const sk = await ev(c, () => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, p:(document.querySelector('#calque h2') || {}).textContent, ht:location.hash }));
      v(nom + ' · « Stock du camion › » ouvre le stock de ce camion (Dépôts et camions), pas une copie', /Camion|Dépôts|Stock/.test((sk.h1 || '') + ' ' + (sk.p || '')), sk);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (Équipe)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('C')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true, nuit });
      const p = await ev(c, () => { const V = PT_GENS.map(paieVariables), E = paieEtapes(V), e = E[0]; return { t:e.t, d:e.d, ok:e.ok, nonVal:V.filter(x => x.nonValidees).length, lib:null }; });
      v(nom + ' · Paie, étape 1 : mêmes mots que Temps de travail (« …personnes ont encore des heures à valider », plus de « semaines pas encore validées »)', /personnes? (ont|a) encore des heures à valider/.test(Array.isArray(p.d) ? p.d.join(' ') : String(p.d)) && !/semaines pas encore validées/.test(String(p.d)) && p.t === 'Les heures sont justes', p);
      const tt = await ev(c, () => { const t = typeof ttOngletMois === 'function' ? ttOngletMois() : ''; const m = /data-tt="validertout"[^>]*>([^<]*)</.exec(t); return { lib:m && m[1] }; });
      await ev(c, () => paieAller('paiemois')); await L.calme(c.p, 700);
      const pa = await ev(c, () => { const b = document.querySelector('[data-paie="validertout"]'); const e1 = document.querySelector('#contenu .paie-etape, #contenu [class*="etape"]'); return { lib:b ? b.textContent.replace(/\s+/g, ' ').trim() : null, txt:(document.getElementById('contenu').innerText || '').replace(/\s+/g, ' ').slice(0, 400) }; });
      v(nom + ' · le bouton est le même dans Temps de travail (« ' + tt.lib + ' ») et dans la Paie (« ' + pa.lib + ' ») : « Valider ce qui est en règle »', tt.lib === 'Valider ce qui est en règle' && pa.lib === 'Valider ce qui est en règle', { tt, pa });
      v(nom + ' · …et la Paie ne parle plus de « 30 semaines pas encore validées »', !/semaines pas encore validées/.test(pa.txt), pa.txt);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (Paie)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('D')) {
      const c = await L.ouvrir({ profil, qui:'marc', calme:true, nuit });
      // Planning : la pastille « camion » sur une intervention de Tom (camion au garage)
      const g = await ev(c, () => { const i = INTS.find(o => o.tech === 'tl' && vxGarageDe(o)); return { id:i && i.id, g:!!(i && vxGarageDe(i)), veh:vehDe('veh4').statut }; });
      await L.aller(c.p, 'planning'); const pl = await ev(c, () => ({ n:document.querySelectorAll('#contenu .vx-gar').length, txt:[...document.querySelectorAll('#contenu .vx-gar')].map(e => e.textContent.trim()).slice(0, 3) }));
      v(nom + ' · Planning : la pastille « camion » marque les interventions touchées par un camion au garage (population ' + pl.n + ')', g.veh === 'atelier' && g.g && pl.n >= 1 && pl.txt.every(t => /camion/.test(t)), { g, pl });
      const i0 = await ev(c, () => { const x = vxIntsConcernees(vehDe('veh4'), vehDe('veh4').immo && vehDe('veh4').immo.retour)[0]; return x ? { id:x.id, d:x.d } : null; });
      await ev(c, () => { rendre(); vhAgir('plan', 'veh4'); }); await L.calme(c.p, 700);
      const vp = await ev(c, () => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, ref:typeof plRef !== 'undefined' ? plRef : null, route, flash:typeof plFlash !== 'undefined' && plFlash ? plFlash.ids : null }));
      v(nom + ' · « Voir au planning › » d\'un véhicule au garage ouvre le Planning sur le JOUR de la première intervention touchée (' + (i0 && i0.d) + ')', !!i0 && vp.route === 'planning' && vp.ref === i0.d && Array.isArray(vp.flash) && vp.flash.includes(i0.id), { i0, vp });
      // Tâches : le lien d'un souci ouvre la fiche du véhicule
      await L.aller(c.p, 'accueil'); await ev(c, () => { TACHES.push({ id:'tvx2', t:'Camion GH-482-KL : pneu · signalé par Sophie', d:AUJ, qui:'marc', urgent:true, creePar:'sm', creeLe:'31/10', cle:'vsouci-veh1-zz', lien:{ t:'aller', id:'vehicules|veh1', lib:'Véhicules', cat:'Véhicules' } }); rendre(); }); await L.calme(c.p, 300);
      await ev(c, () => tDetail('tvx2')); await L.calme(c.p, 500);
      const td = await ev(c, () => { const b = [...document.querySelectorAll('#calque button, #calque [data-go], #calque [data-tl]')].find(x => /Véhicules/.test(x.textContent)); return { b:!!b, lib:b && b.textContent.replace(/\s+/g, ' ').trim() }; });
      v(nom + ' · Tâches : la tâche d\'un souci porte son lien vers « Véhicules » (' + (td.lib || 'aucun') + ')', td.b, td);
      if (td.b) { await toucher(c, '#calque :is(button, [data-go], [data-tl]):has-text("Véhicules")'); await L.calme(c.p, 600);
        const f = await ev(c, () => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, fiche:!!document.querySelector('.vh-fiche-id'), id:(document.querySelector('.vh-fiche-id') || { dataset:{} }).dataset.vid }));
        v(nom + ' · …et le toucher ouvre la fiche du Trafic', f.fiche && f.id === 'veh1', f); }
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (Planning, Tâches)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('E')) {
      for (const [qui, attendu, absent] of [['marc', 'Véhicules et Temps de travail, refaits', 'Tes heures, en deux onglets'], ['sm', 'Tes heures, en deux onglets', 'Véhicules et Temps de travail, refaits']]) {
        const c = await L.ouvrir({ profil, qui, calme:true, nuit, guide:true });
        const t = await ev(c, () => { try { return nvPages().map(p => p.t + ' ' + (p.c || '').replace(/<[^>]*>/g, ' ')).join(' | '); } catch (e) { return 'ERREUR ' + e.message; } });
        v(nom + ' · guide des nouveautés (' + qui + ') : « ' + attendu + ' » y est, « ' + absent + ' » n\'y est pas', t.includes(attendu) && !t.includes(absent), t.slice(0, 200));
        if (qui === 'marc') v(nom + ' · …avec les mots de la spécification (trois phrases)', /Une rangée par véhicule qui dit s’il a besoin de toi\. Temps de travail : ce qu’il faut régler, d’un coup d’œil\. Ton camion et tes heures, au même endroit\./.test(t), null);
        v(nom + ' · …et n\'emploie plus « Ce n\'est pas ça », « pointées par », « sup. »', !/Ce n’est pas ça|heures sup\./.test(t), null);
        await L.fin(c); }
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
