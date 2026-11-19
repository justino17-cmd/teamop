// Recontrôle ADVERSE du lot « vehtemps » (étape 9) : rejoue, AUTREMENT que le correcteur, les défauts annoncés « corrigés » — par de vrais touchers quand l'écran les offre,
// sans réemployer les contrôles de vehtemps-corr-*.js — et cherche ce que les corrections ont CASSÉ à côté. 127.0.0.1 seulement, entreprise fictive.
// Chaque contrôle prouve sa population ; sort en 1 si un contrôle tombe. PROFILS=… (mac,windows,mac720,ipad,iphone,android,petit), NUIT=0,1, SEULS=veh,tt,droits,tel
const L = require('../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/rc/';
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(','), NUITS = (process.env.NUIT || '0').split(',').map(x => x === '1'), SEULS = (process.env.SEULS || 'veh,tt,droits,tel').split(',');
const tel = p => ['iphone', 'android', 'petit'].includes(p);
const panneau = c => ev(c, () => { const z = document.querySelector('#calque .panneau'); return z ? z.innerText : ''; });
const gestes = c => ev(c, () => [...document.querySelectorAll('#calque .panneau button, #calque .panneau a')].filter(e => e.offsetParent).map(e => e.textContent.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ').trim()));
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : '');
    /* ═══════════════ VÉHICULES (le gérant) ═══════════════ */
    if (SEULS.includes('veh')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'vehicules');
      const ids = await ev(c, () => VEHICULES.map(x => x.id)); v(nom + ' · veh population : quatre véhicules', ids.length === 4, ids);
      // — liste : un TOUCHER sur la rangée du Kangoo (gerant-03, 14) —
      const tl = await L.toucher(c, '[data-vh="fiche|veh4"]'); v(nom + ' · veh : un toucher sur la rangée du Kangoo ouvre sa fiche', tl && /Kangoo/.test(await panneau(c)), tl);
      let t = net(await panneau(c)), g = await gestes(c);
      v(nom + ' · veh 03 : au garage, la fiche ne propose aucun « Noter le rendez-vous » et dit « Au garage jusqu’au »', !g.some(x => /Noter le rendez-vous/.test(x)) && /Au garage jusqu’au lundi 2 novembre/.test(t) && !/en retard de/.test(t), t.slice(0, 300));
      v(nom + ' · veh 14 : « Le remettre en service » une seule fois', g.filter(x => x === 'Le remettre en service').length === 1, g);
      await L.capture(c, CAP + 'veh-kangoo-' + nom + '.png');
      // — dépenses : somme des lignes = total de la phrase, pour CHAQUE véhicule (gerant-08, 09, 10) —
      for (const id of ids) {
        await ev(c, i => { fermerPanneau(); vehFiche(i); }, id); await L.calme(c.p, 350);
        await L.toucher(c, '#calque [data-vh="fonglet|depenses"]');
        const D = await ev(c, () => { const z = document.querySelector('#calque .panneau'); const ph = [...z.querySelectorAll('*')].map(e => e.children.length === 0 ? e.textContent : '').find(x => /dépensés depuis le/.test(x)) || (z.innerText.match(/[^\n]*dépensés depuis[^\n]*/) || [''])[0];
          const lignes = [...z.querySelectorAll('.vh-fr')].map(e => ({ t:e.innerText.replace(/\s+/g, ' ').trim(), m:(e.querySelector('.vh-mt') || {}).textContent || '' })); return { ph, lignes, txt:z.innerText.replace(/\s+/g, ' ') }; });
        const montant = s => L.cents(s) / 100, somme = D.lignes.reduce((a, l) => a + montant(l.m), 0), tot = montant((D.ph.match(/([\d\s\u00a0\u202f]+(?:,\d+)?)\s*€/) || [])[1].replace(/\s/g, '') + '€');
        v(nom + ' · veh 08 · ' + id + ' : population — des lignes de dépense et une phrase de total', D.lignes.length >= 4 && /dépensés depuis/.test(D.ph), { n:D.lignes.length, ph:D.ph.slice(0, 120) });
        v(nom + ' · veh 08 · ' + id + ' : la somme des lignes (' + somme.toFixed(2) + ') arrondie = le total dit (' + tot + ')', Math.abs(Math.round(somme) - tot) <= 1, D.lignes.map(l => l.m));
        v(nom + ' · veh 09 · ' + id + ' : la légende « hors taxes » est sous la liste', /hors taxes/.test(D.txt) && /120 €/.test(D.txt), '');
        v(nom + ' · veh 10 · ' + id + ' : la phrase dit un « par mois »', /€ par mois/.test(D.ph), D.ph.slice(0, 160));
        const faute = /\b(\w+)ss\b/.exec(D.txt) || /mo{2,}is/.exec(D.txt); v(nom + ' · veh (casse ?) · ' + id + ' : aucune faute d’accord (« moiss ») sur la fiche', !/moiss/.test(D.txt), (D.lignes.find(l => /moiss/.test(l.t)) || {}).t);
      }
      // — le « par mois » de la phrase se recalcule INDÉPENDAMMENT : total ÷ (jours entre le premier relevé et aujourd'hui ÷ 30,4) —
      await ev(c, () => { fermerPanneau(); vehFiche('veh1'); }); await L.calme(c.p, 350); await L.toucher(c, '#calque [data-vh="fonglet|depenses"]');
      const P = await ev(c, () => { const t = document.querySelector('#calque .panneau').innerText.replace(/\s+/g, ' '); const m = /([\d  ]+) € dépensés depuis le (\d+) (\w+), soit ([\d,]+) € du kilomètre et ([\d  ]+) € par mois/.exec(t); return m ? { tot:m[1], j:m[2], mo:m[3], pm:m[5], aujourd:AUJ } : { t:t.slice(0, 300) }; });
      v(nom + ' · veh 10 : population — la phrase des dépenses du Trafic se lit', !!P.tot, P);
      if (P.tot) { const tot = L.cents(P.tot + '€') / 100, pm = L.cents(P.pm + '€') / 100, jours = Math.round((new Date(P.aujourd + 'T12:00') - new Date('2026-06-23T12:00')) / 864e5), att = tot / (jours / 30.4);
        v(nom + ' · veh 10 : 552 € environ = ' + tot + ' ÷ (' + jours + ' j ÷ 30,4) = ' + att.toFixed(0), Math.abs(pm - att) <= 2, { pm, att }); }
      // — supprimer une dépense AU TOUCHER, puis « Annuler » (gerant-13) —
      const n0 = await ev(c, () => document.querySelectorAll('#calque .vh-fr:not(.vh-fr-liss)').length);
      v(nom + ' · veh 13 : population — des dépenses cliquables', n0 >= 4, n0);
      await L.toucher(c, '#calque .vh-fr:not(.vh-fr-liss)'); const gp = await gestes(c);
      v(nom + ' · veh 13 : la feuille d’une dépense propose « Supprimer cette dépense »', gp.some(x => /Supprimer cette dépense/.test(x)), gp);
      await L.toucher(c, '#calque [data-vx^="frdel|"]');
      const confirmer = await ev(c, () => [...document.querySelectorAll('#calque button')].filter(b => b.offsetParent && /Supprimer|Oui|Confirm/i.test(b.textContent)).map(b => b.textContent.trim()));
      const t1 = await ev(c, () => (document.getElementById('toast') || {}).textContent || '');
      if (/Dépense supprimée/.test(t1)) { const nn = await ev(c, () => document.querySelectorAll('#calque .vh-fr:not(.vh-fr-liss)').length); await L.toucher(c, '#toast button'); const t2 = await ev(c, () => (document.getElementById('toast') || {}).textContent || ''); const n2 = await ev(c, () => document.querySelectorAll('#calque .vh-fr:not(.vh-fr-liss)').length);
        v(nom + ' · veh 13 : « Dépense supprimée » puis « Annulé : la dépense est revenue » et la ligne revient', /Annulé\s*:\s*la dépense est revenue/.test(net(t2)) && n2 === n0, { t1, t2, n0, nn, n2 }); }
      else v(nom + ' · veh 13 : le geste supprime (ou demande confirmation)', confirmer.length > 0, { t1, confirmer });
      await L.capture(c, CAP + 'veh-depenses-' + nom + '.png');
      // — papiers : toast d'un document ajouté (reste du relevé gerant-15 d'origine, pas annoncé corrigé) —
      const toastDoc = await ev(c, () => { fermerPanneau(); const v0 = VEHICULES[0]; vxDocAjouter(v0.id, 'ct', new File(['x'], 'rapport.pdf', { type:'application/pdf' })); return (document.getElementById('toast') || {}).textContent || ''; });
      v(nom + ' · veh (reste de gerant-15 d\'origine) : le toast du rapport de contrôle technique dit le mot de l\'écran et s\'accorde', /Rapport du contrôle technique/i.test(toastDoc) && !/procès-verbal de contrôle ajoutée/.test(toastDoc), toastDoc);
      // — matériel (gerant-18) : « Il manque… » et « Les commander » sur deux lignes —
      await ev(c, () => { fermerPanneau(); vehFiche('veh1'); }); await L.calme(c.p, 300);
      const mt = await ev(c, () => { vhMatPanel('veh1', 'fiche'); const z = document.querySelector('#calque .panneau'); const i = [...z.querySelectorAll('*')].find(e => /Il manque/.test(e.textContent) && e.querySelector('button.lien')); if (!i) return { vu:false, t:z.innerText.slice(0, 300) }; const b = i.querySelector('button.lien'), r1 = i.querySelector('b') ? i.querySelector('b').getBoundingClientRect() : null, r2 = b.getBoundingClientRect(); return { vu:true, dessous:r2.top >= (r1 ? r1.bottom - 2 : 0), txt:i.innerText.replace(/\s+/g, ' ') }; });
      v(nom + ' · veh 16 (matériel) : « Les commander » passe sous la phrase « Il manque »', mt.vu && mt.dessous, mt); await L.capture(c, CAP + 'veh-materiel-' + nom + '.png');
      // — liste : une échéance dite une fois (gerant-15 annoncé / orig. 17) —
      await ev(c, () => { fermerPanneau(); aller('vehicules'); }); await L.calme(c.p, 400);
      const R = await ev(c, () => { const txt = document.querySelector('#contenu').innerText; const lignes = [...document.querySelectorAll('[data-vh^="fiche|"]')].filter(e => e.offsetParent).map(e => e.innerText.replace(/\s+/g, ' ')); return { assur:(txt.match(/Assurance/g) || []).length, lignes }; });
      v(nom + ' · veh 17 : l’assurance du groupe n’est écrite qu’une fois dans la liste (pas sous chaque véhicule)', R.assur === 1 && R.lignes.length === 4 && R.lignes.filter(l => /assurance/i.test(l)).length === 0, R);
      v(nom + ' · veh : les rangées parlent de la révision ou d’aucune autre échéance, jamais d’un texte vide', R.lignes.every(l => /règle|À faire|Au garage|garage/.test(l) && !/undefined|NaN|null/.test(l)), R.lignes);
      // — les trois sommes se recoupent : la liste (« 1 566 € payés en octobre ») et les fiches (lignes d'octobre) —
      const oct = await ev(c, () => (document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').match(/([\d\s]+) € payés en octobre/) || [])[1] || '');
      v(nom + ' · veh : la tuile « payés en octobre » se lit (1 566 €)', /1\s*566/.test(oct), oct);
      await L.capture(c, CAP + 'veh-liste-' + nom + '.png');
      const err = c.err.filter(e => !/ERR_/.test(e)); v(nom + ' · veh : aucune erreur de page', err.length === 0, err.slice(0, 3));
      await L.fin(c);
    }
    /* ═══════════════ DROITS (secrétariat) ═══════════════ */
    if (SEULS.includes('droits')) {
      const c = await L.ouvrir({ profil, nuit, qui:'julie', calme:true });
      const pe = await ev(c, () => ({ voit:droitVoit('pointage'), corr:droitSp(eqDe(acteur()), 'corrpt') }));
      v(nom + ' · droits : population — Julie n’a PAS « Corriger les pointages »', pe.corr === false, pe);
      // gerant-02 : des boutons forgés (le DOM d'un autre rôle) n'écrivent rien
      if (pe.voit) { await L.aller(c.p, 'pointage'); await ev(c, () => { ptOnglet = 'auj'; rendre(); }); await L.calme(c.p, 400);
        const av = await ev(c, () => ({ p:JSON.stringify(POINTAGES), x:JSON.stringify(PTX), btn:[...document.querySelectorAll('#contenu [data-tt^="terminer|"], #contenu [data-tt^="accepter|"], #contenu [data-tt^="fin|"]')].filter(e => e.offsetParent).length }));
        v(nom + ' · droits 02 : Julie ne voit aucun bouton « Terminer à » / « Accepter » / « Choisir l’heure »', av.btn === 0, av.btn);
        const ap = await ev(c, () => { const forge = a => { const b = document.createElement('button'); b.dataset.tt = a; b.style.cssText = 'position:fixed;left:0;top:0;width:40px;height:40px'; document.body.appendChild(b); b.click(); b.remove(); };
          forge('terminer|ptl2026-10-30|16:47'); forge('accepter|tl'); forge('ajoutok'); forge('jourok|kb|2026-10-28'); return { p:JSON.stringify(POINTAGES), x:JSON.stringify(PTX) }; });
        v(nom + ' · droits 02 : quatre boutons forgés n’écrivent ni pointage ni trace (POINTAGES, PTX identiques)', ap.p === av.p && ap.x === av.x, { pointages:ap.p === av.p, ptx:ap.x === av.x });
      } else v(nom + ' · droits : Julie ne voit pas Temps de travail (rien à forger)', true, '');
      // gerant-01 : « Ses heures › » dans la fiche Équipe d'une personne
      await L.aller(c.p, 'equipe'); await ev(c, () => eqFiche('sm')); await L.calme(c.p, 400);
      const h = await ev(c, () => ({ ouvert:!!document.querySelector('#calque .panneau'), heures:[...document.querySelectorAll('#calque [data-eq^="heures|"]')].length, txt:(document.querySelector('#calque .panneau') || { innerText:'' }).innerText.slice(0, 120) }));
      v(nom + ' · droits 01 : population — la fiche de Sophie est ouverte', h.ouvert, h);
      v(nom + ' · droits 01 : Julie ne voit pas « Ses heures › »', h.heures === (pe.voit ? h.heures : 0) && (pe.voit || h.heures === 0), h);
      const f = await ev(c, () => { const b = document.createElement('button'); b.dataset.eq = 'heures|sm'; b.style.cssText = 'position:fixed;left:0;top:0'; document.querySelector('#calque .panneau').appendChild(b); b.click(); b.remove(); return { onglet:ptOnglet, vue:typeof vueCourante !== 'undefined' ? vueCourante : '', panneau:!!document.querySelector('#calque .panneau'), txt:(document.querySelector('#calque .panneau') || { innerText:'' }).innerText.slice(0, 100) }; });
      v(nom + ' · droits 01 : « heures » forgé par Julie n’ouvre pas le mois de Sophie (aucun panneau « travaillées »)', !/travaillées/.test(f.txt) || pe.voit, f);
      await L.fin(c);
      // contre-épreuve : le gérant, lui, a le bouton et il ouvre
      const m = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(m.p, 'equipe'); await ev(m, () => eqFiche('sm')); await L.calme(m.p, 400);
      const ok = await L.toucher(m, '#calque [data-eq="heures|sm"]'); const t = net(await panneau(m));
      v(nom + ' · droits 01 (contre-épreuve) : Marc touche « Ses heures › » et le mois de Sophie s’ouvre', ok && /170h46|Octobre|travaill/i.test(t) || /Sophie/.test(t), t.slice(0, 160));
      await L.fin(m);
    }
    /* ═══════════════ TEMPS DE TRAVAIL (le gérant) ═══════════════ */
    if (SEULS.includes('tt')) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
      const A = await ev(c, () => ({ areg:(document.querySelector('[data-tt="areg"]') || {}).textContent || '', lignes:document.querySelectorAll('#contenu [data-tt^="terminer|"], #contenu [data-tt^="accepter|"], #contenu [data-tt^="jour|"][data-tt$="2026-10-28"], #contenu [data-tt^="sem|"]').length }));
      v(nom + ' · tt population : la file « À régler » existe', /4/.test(A.areg), A);
      // gerant-04 : « Voir la journée » d'une demande — au toucher
      const vj = await ev(c, () => [...document.querySelectorAll('#contenu [data-tt^="jour|tl|"]')].length); v(nom + ' · tt 04 : population — la demande de Tom a son lien « Voir la journée »', vj === 1, vj);
      await L.toucher(c, '#contenu [data-tt="jour|tl|2026-10-28"]'); let tp = net(await panneau(c));
      v(nom + ' · tt 04 : la fiche de la journée rappelle la demande (« Tom demande une correction… 17:40 ») et propose « Accepter 17:40 »', /Tom demande une correction/.test(tp) && /17:40/.test(tp) && (await gestes(c)).some(x => /Accepter 17:40/.test(x)), tp.slice(0, 260));
      await L.capture(c, CAP + 'tt-demande-' + nom + '.png');
      // gérer : Accepter depuis la fiche — écrit, l'« À régler » passe de 4 à 3
      const av = await ev(c, () => ({ f:(POINTAGES.find(p => p.qui === 'tl' && p.date === '2026-10-28') || {}).fin }));
      await L.toucher(c, '#calque [data-tt^="accepter|tl"]'); await L.calme(c.p, 500);
      const ap = await ev(c, () => { fermerPanneau(); aller('pointage'); return { f:(POINTAGES.find(p => p.qui === 'tl' && p.date === '2026-10-28') || {}).fin, areg:(document.querySelector('[data-tt="areg"]') || {}).textContent || '', pend:!!PAIE.signales.tl }; });
      await L.calme(c.p, 400);
      const areg = await ev(c, () => (document.querySelector('[data-tt="areg"]') || {}).textContent || '');
      v(nom + ' · tt 04 : Accepter 17:40 règle la journée de Tom (fin avant ' + av.f + ', après ' + ap.f + ') et « À régler » passe à 3', ap.f === '17:40' && /3/.test(areg), { av, ap, areg });
      // gerant-21 : toast du rappel
      await ev(c, () => { ptOnglet = 'auj'; rendre(); }); await L.calme(c.p, 300);
      if (tel(profil)) v(nom + ' · tt 21 : au téléphone, le bouton groupé est caché exprès (chaque rangée a son « Lui rappeler »)', await ev(c, () => { const b = document.querySelector('#contenu [data-tt="rappeler"]'); return !b || b.getBoundingClientRect().height === 0; }), '');
      else if (await c.p.$('#contenu [data-tt="rappeler"]')) { await ev(c, () => { const t = document.getElementById('toast'); if (t) t.textContent = ''; }); const tou = await L.toucher(c, '#contenu [data-tt="rappeler"]'); const t = await ev(c, () => (document.getElementById('toast') || {}).textContent || ''); v(nom + ' · tt 21 : le toast du rappel dit « Sophie et Tom » (toucher abouti : ' + tou + ')', /Rappel envoyé à Sophie et Tom/.test(t), t); } else v(nom + ' · tt 21 : le bouton « Envoyer un rappel » existe', false, '');
      // semaine : la grille ou la liste ; Karim en cours ; Léa le week-end
      await ev(c, () => { ptOnglet = 'semaine'; rendre(); }); await L.calme(c.p, 500);
      const S = await ev(c, () => { const g = document.querySelector('.tt-grille'), l = document.querySelector('.tt-liste'); const ca = (k, d) => { const b = [...document.querySelectorAll(`.tt-grille [data-tt="jour|${k}|${d}"]`)][0]; return b ? net0(b.textContent) : null; }; function net0(t) { return t.replace(/\s+/g, ' ').trim(); } return { grille:!!g && getComputedStyle(g).display !== 'none', liste:!!l && getComputedStyle(l).display !== 'none', w:innerWidth, kb:ca('kb', '2026-10-31'), lr:['2026-10-30', '2026-10-31', '2026-11-01'].map(d => ca('lr', d)) }; });
      if (S.grille) {
        v(nom + ' · tt 05 : Karim, samedi 31, est « en cours » (pas « 0h00 »)', /en cours/.test(S.kb) && !/0h00/.test(S.kb), S.kb);
        v(nom + ' · tt 19 : Léa en congé : « Congé payé » vendredi, « — » samedi et dimanche', /Congé/.test(S.lr[0]) && S.lr[1] === '—' && S.lr[2] === '—', S.lr);
      } else v(nom + ' · tt : la grille de sept jours est cachée sur cet écran, la liste est dessinée', S.liste && !S.grille, S);
      await L.capture(c, CAP + 'tt-semaine-' + nom + '.png');
      // gerant-19 (suite) : la feuille d'une personne — sept lignes — pas de « Congé payé » le week-end (ttJoursListe) ; gerant-20 : « pas encore »
      const Lr = await ev(c, () => { const k = 'lr', L0 = '2026-10-26'; try { fermerPanneau(); const b = document.createElement('button'); b.dataset.tt = 'sem|' + k + '|' + L0; document.body.appendChild(b); b.click(); b.remove(); } catch (e) {} const z = document.querySelector('#calque .panneau'); return z ? [...z.querySelectorAll('.tt-jr')].map(e => e.innerText.replace(/\s+/g, ' ').trim()) : null; });
      v(nom + ' · tt 19 (feuille d’une personne) : population — sept lignes pour Léa', Lr && Lr.length === 7, Lr);
      const Kb = await ev(c, () => { fermerPanneau(); const b = document.createElement('button'); b.dataset.tt = 'sem|kb|2026-10-26'; document.body.appendChild(b); b.click(); b.remove(); const z = document.querySelector('#calque .panneau'); return z ? [...z.querySelectorAll('.tt-jr')].map(e => e.innerText.replace(/\s+/g, ' ').trim()) : null; });
      v(nom + ' · tt 20 : population — la feuille de Karim finit par un jour à venir', Kb && Kb.length === 7 && /dim\. 1/.test(Kb[6]), Kb);
      v(nom + ' · tt 20 (orig., non annoncé) : un jour qui n’est pas arrivé se dit en entier, pas « pas encore » nu', Kb && !/pas encore\s*›?$/.test(Kb[6]), Kb && Kb[6]);
      if (Lr && Lr.length === 7) { v(nom + ' · tt 19 (feuille d’une personne) : « Congé payé » ni le samedi ni le dimanche', !/Congé/.test(Lr[5]) && !/Congé/.test(Lr[6]), Lr.slice(4)) }
      // mois fermé : la demande de Tom (si elle existe encore) n'est plus « à régler » (gerant-07)
      await L.fin(c);
      const f = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(f.p, 'pointage');
      const n7 = await ev(f, () => { const av = document.querySelectorAll('#contenu [data-tt^="accepter|"]').length; PAIE.verrou = { le:'31/10 · 09:00', par:'marc', emp:'x' }; rendre(); return av; }); await L.calme(f.p, 500);
      const ap7 = await ev(f, () => ({ acc:document.querySelectorAll('#contenu [data-tt^="accepter|"]').length, ter:document.querySelectorAll('#contenu [data-tt^="terminer|"]').length, areg:(document.querySelector('[data-tt="areg"]') || {}).textContent || '', txt:document.querySelector('#contenu').innerText.slice(0, 900) }));
      v(nom + ' · tt 07 : population — avant la fermeture d’octobre, une demande « Accepter » existait', n7 >= 1, n7);
      v(nom + ' · tt 07 : mois fermé, plus de bouton « Accepter » ni « Terminer à » dans « À régler »', ap7.acc === 0 && ap7.ter === 0, { acc:ap7.acc, ter:ap7.ter, areg:ap7.areg });
      const forge = await ev(f, () => { const x = JSON.stringify([POINTAGES, PTX]); const b = document.createElement('button'); b.dataset.tt = 'accepter|tl'; b.style.cssText = 'position:fixed;left:0;top:0;width:30px;height:30px'; document.body.appendChild(b); b.click(); b.remove(); return JSON.stringify([POINTAGES, PTX]) === x; });
      v(nom + ' · tt 07 : « Accepter » forgé sur un mois fermé n’écrit rien', forge, forge);
      await L.capture(f, CAP + 'tt-mois-ferme-' + nom + '.png');
      // ce que la fermeture a cassé à côté : l'onglet Mois reste lisible, et « Voir la paie » ramène ensuite sur Mois (orig. gerant-16, non annoncé)
      await ev(f, () => { ptOnglet = 'mois'; rendre(); }); await L.calme(f.p, 400);
      const vp = await ev(f, () => [...document.querySelectorAll('#contenu button')].filter(b => b.offsetParent && /Voir la paie|Passer à la paie/.test(b.textContent)).map(b => b.textContent.trim()));
      v(nom + ' · tt (mois fermé) : Mois propose « Voir la paie » ou « Passer à la paie »', vp.length >= 1, vp);
      await L.fin(f);
    }
    /* ═══════════════ LE TÉLÉPHONE ═══════════════ */
    if (SEULS.includes('tel') && tel(profil)) {
      const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
      // salarie-05 : la première ligne d'« À régler » est AVANT la carte de la journée du gérant et à l'écran
      const P5 = await ev(c, () => { const q = s => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top) : null; }; const reg = [...document.querySelectorAll('#contenu h3, #contenu .carte > h3, #contenu .tt-areg, #contenu [class*="areg"]')].find(e => /À régler/i.test(e.textContent)); const maj = [...document.querySelectorAll('#contenu h3')].find(e => /Ma journée de travail/i.test(e.textContent)); const prem = document.querySelector('#contenu [data-tt^="terminer|"], #contenu [data-tt^="fin|"]'); const bar = document.querySelector('#barre-bas'); return { reg:reg ? Math.round(reg.getBoundingClientRect().top) : null, maj:maj ? Math.round(maj.getBoundingClientRect().top) : null, prem:prem ? Math.round(prem.getBoundingClientRect().bottom) : null, bar:bar ? Math.round(bar.getBoundingClientRect().top) : innerHeight, H:innerHeight }; });
      v(nom + ' · tel 05 : « À régler » vient AVANT la carte de la journée', P5.reg !== null && P5.maj !== null && P5.reg < P5.maj, P5);
      v(nom + ' · tel 05 : le premier geste d’« À régler » est entièrement au-dessus de la barre du bas', P5.prem !== null && P5.prem <= P5.bar, P5);
      await L.capture(c, CAP + 'tel-ttaujourdhui-' + nom + '.png');
      // salarie-12 : Semaine et Mois ne répètent pas les quatre chiffres du jour
      await L.toucher(c, '[data-tt="onglet|semaine"]');
      const K = await ev(c, () => ({ kpis:[...document.querySelectorAll('#contenu .kpis')].filter(e => e.offsetParent).length, prem:(document.querySelector('#contenu .tt-liste [data-tt^="sem|"]') || { getBoundingClientRect:() => ({ bottom:0 }) }).getBoundingClientRect().bottom, bar:(document.querySelector('#barre-bas') || { getBoundingClientRect:() => ({ top:innerHeight }) }).getBoundingClientRect().top }));
      v(nom + ' · tel 12 : Semaine : la première personne se lit entièrement avant la barre du bas', K.prem > 0 && K.prem <= K.bar, K);
      await L.capture(c, CAP + 'tel-ttsemaine-' + nom + '.png');
      // salarie-01 : le champ « Pourquoi changes-tu cette heure ? » est visible et non recouvert
      await L.toucher(c, '.tt-liste [data-tt^="sem|kb|"]'); await L.toucher(c, '.panneau [data-tt="jour|kb|2026-10-28"]');
      const idf = await ev(c, () => { const b = document.querySelector('.panneau [data-ptc$="|fin"]'); return b ? b.dataset.ptc : null; });
      v(nom + ' · tel 01 : population — la feuille d’un jour de Karim a son champ « Fin »', !!idf, idf);
      if (idf) { await L.toucher(c, `.panneau [data-ptc="${idf}"] + .dt-btn`); await c.p.waitForSelector('#dtpop', { timeout:3000 }).catch(() => {}); await L.calme(c.p, 300);
        const D = await ev(c, () => [...document.querySelectorAll('#dtpop button')].filter(b => b.offsetParent).map(b => ({ t:b.textContent.trim(), h:Math.round(b.getBoundingClientRect().height), w:Math.round(b.getBoundingClientRect().width) })));
        v(nom + ' · tel 02 : population — le sélecteur d’heure a des boutons', D.length >= 24, D.length);
        v(nom + ' · tel 02 : toutes ses cases heure/minute font 44 px au moins au doigt', D.filter(x => /^\d\d$|^\d\d h|^\d+$/.test(x.t)).every(x => x.h >= 44), D.filter(x => x.h < 44).slice(0, 4));
        await L.capture(c, CAP + 'tel-selecteur-' + nom + '.png');
        await L.toucher(c, '#dtpop [data-dth="19"]'); await L.toucher(c, '#dtpop [data-dtmn="30"]'); if (await c.p.$('#dtpop [data-dtok]')) await L.toucher(c, '#dtpop [data-dtok]'); await L.calme(c.p, 900);
        const M = await ev(c, () => { const m = document.getElementById('pt-motif'), b = document.getElementById('tt-enr'); if (!m) return { vu:false }; const r = m.getBoundingClientRect(), rb = b.getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { vu:true, H:innerHeight, haut:Math.round(r.top), bas:Math.round(r.bottom), btnHaut:Math.round(rb.top), recouvert:!(at === m || m.contains(at)), at:at ? (at.className || at.tagName) : null }; });
        v(nom + ' · tel 01 : le champ « Pourquoi… » est dans l’écran et non recouvert par le pied collant', M.vu && M.haut >= 0 && M.bas <= M.H && !M.recouvert, M);
        await L.capture(c, CAP + 'tel-motif-' + nom + '.png'); }
      await L.fin(c);
      // salarie-04 : un souci signalé deux fois, puis « C'est réglé » — rien ne reste
      const s = await L.ouvrir({ profil, nuit, qui:'sm', calme:true });
      await L.aller(s.p, 'moncamion');
      const vid = await ev(s, () => { const b = document.querySelector('#contenu [data-vx^="souci|"]'); return b ? b.dataset.vx.split('|')[1] : null; });
      v(nom + ' · tel 04 : population — sm a « Un souci avec le camion » sur Mon camion', !!vid, vid);
      if (vid) {
        const ouv = () => ev(s, () => TACHES.filter(t => /^vsouci-/.test(t.cle || '') && !t.fait).length);
        let ok2 = true; for (let i = 0; i < 2; i++) { ok2 = ok2 && await L.toucher(s, '#contenu [data-vx^="souci|"]'); ok2 = ok2 && await L.toucher(s, '.panneau [data-vh="choix|vx-st|Voyant allumé"]'); ok2 = ok2 && await L.toucher(s, '.panneau [data-vx^="soucisok|"]'); await L.calme(s.p, 300); }
        const o2 = await ouv(); v(nom + ' · tel 04 : deux signalements au toucher (« Prévenir le bureau ») laissent deux tâches ouvertes', ok2 && o2 === 2, { ok2, o2 });
        const r = await ev(s, id => { vxSouciRegle(id); const reste = TACHES.filter(t => /^vsouci-/.test(t.cle || '') && !t.fait).length; document.querySelector('#toast button').click(); const rouvert = TACHES.filter(t => /^vsouci-/.test(t.cle || '') && !t.fait).length; return { reste, rouvert, souci:!!vehDe(id).souci }; }, vid);
        v(nom + ' · tel 04 : « C’est réglé » ferme les DEUX tâches, « Annuler » les rouvre', r.reste === 0 && r.rouvert === 2 && r.souci === true, r); }
      await L.fin(s);
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR de la sonde :', e && e.stack || e); await L.fermer(); process.exit(2); });
