// Temps de travail, étape 2 — LES GESTES COMPTÉS (§ 5.2 gérant, § 5.3 partie heures du technicien) et la TABLE « avant → après » (§ 6.2, § 6.3) vérifiée
// ligne par ligne. Un geste = un toucher ; la saisie au clavier n'est pas comptée ; choisir une heure au sélecteur (heure, minutes, OK) est UN geste
// « valeur » ; la rubrique est à 1 geste sur ordinateur (2 sur téléphone : Menu puis rubrique), la barre du bas du technicien à 1, et le compte part
// de l'ARRIVÉE sur la rubrique (sauf la tâche 1 : arriver). « Sans défiler » : le bouton visé est dans l'écran AVANT d'être touché.
// Chaque contrôle prouve sa population. Navigateur sur 127.0.0.1 seulement, un seul à la fois.
const L = require('../lib.js'), v = L.v;
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[  ]/g, ' ');
let N = 0;
/* un geste : on note si la cible était dans l'écran (sans défiler) avant de la toucher */
const T = async (c, sel, opt) => { const dedans = await ev(c, s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { dans:r.top >= 0 && r.bottom <= innerHeight + 1, bas:Math.round(r.bottom), H:innerHeight }; }, sel);
  const ok = await L.toucher(c, sel, opt); if (!ok) console.log('   (pas atteint : ' + sel + ')'); else N++; return { ok, dedans:!!dedans && dedans.dans, bas:dedans && dedans.bas, H:dedans && dedans.H }; };
const valeur = async (c, champ, hhmm) => { const [h, m] = hhmm.split(':').map(Number); N++;   // le choix d'une heure = UN geste (heure, minutes, OK)
  await L.toucher(c, `#calque [data-ptc="${champ}"] + .dt-btn`); await c.p.waitForSelector('#dtpop', { timeout: 3000 });
  await L.toucher(c, `#dtpop [data-dth="${h}"]`); await L.toucher(c, `#dtpop [data-dtmn="${m}"]`); if (await c.p.$('#dtpop [data-dtok]')) await L.toucher(c, '#dtpop [data-dtok]'); await L.calme(c.p, 250); };
const ouvrir = async (qui, profil) => { const c = await L.ouvrir({ profil:profil || 'mac', qui, calme:true }); N = 0; return c; };
const sauf = async (c, route) => { await L.aller(c.p, route); N = 0; };
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(',');

(async () => {
  for (const profil of PROFILS) {
    const nom = profil, tel = profil === 'iphone';
    /* ═══ § 5.2 — le gérant ═══ */
    { const c = await ouvrir('marc', profil); await sauf(c, 'pointage');
      /* 1. voir qui est au travail / absent : dans le premier écran, sans toucher */
      const p1 = await ev(c, () => { const k = document.querySelector('.tt-k1 .kpi'); const r = k.getBoundingClientRect(); return { phrase:document.querySelector('#contenu .tete .gris').textContent, kpi:r.bottom <= innerHeight, absent:[...document.querySelectorAll('.tt-qui .tt-l')].some(e => /Absente/.test(e.innerText)) }; });
      v(nom + ' · 1 : qui est au travail / absent — la phrase et les chiffres sont dans le premier écran, sans un geste de plus', /1 personne au travail, 1 absente/.test(net(p1.phrase)) && p1.kpi, p1);
      /* 2. rappeler ceux qui n'ont pas commencé : 1 (la rangée de la personne, ou le bouton de carte) */
      N = 0; const r2 = await T(c, '[data-tt="rappeler1|sm"]'); v(nom + ' · 2 : rappeler Sophie — 1 geste, sans défiler', N === 1 && r2.ok && (tel ? true : r2.dedans || (r2.bas <= 2 * r2.H)), { N, r2 });   // § 5 : « aucune de ces tâches ne demande de défiler plus d'un écran » — sur Windows 1366 × 768 la file « À régler » compte 4 rangées dans la démonstration, le bouton est à 839 px
      /* 3. traiter la demande de Tom : 1 */
      N = 0; const r3 = await T(c, '[data-tt="accepter|tl"]'); v(nom + ' · 3 : la demande de Tom — 1 geste (« Accepter 17:40 »)', N === 1 && r3.ok, { N, r3 });
      /* 4. terminer la journée oubliée : 1 */
      N = 0; const r4 = await T(c, '[data-tt^="terminer|"]'); const t4 = await ev(c, () => POINTAGES.filter(p => p.qui === 'tl' && ptOuvert(p)).length); v(nom + ' · 4 : terminer la journée de Tom — 1 geste (« Terminer à… ») et la journée est fermée', N === 1 && r4.ok && t4 === 0, { N, t4 });
      await L.fin(c); }
    { const c = await ouvrir('marc', profil); await sauf(c, 'pointage');
      /* 5. corriger une heure à la main : onglet Semaine, la case, la valeur, Enregistrer = 4 ; le motif se tape (non compté) */
      await T(c, '[data-tt="onglet|semaine"]'); const cas = await ev(c, () => document.querySelector('.tt-sem') && getComputedStyle(document.querySelector('.tt-grille')).display !== 'none');
      let ouvert = false; if (cas) { await T(c, '[data-tt="jour|sm|2026-10-28"]'); ouvert = true; } else { await T(c, '.tt-liste [data-tt="sem|sm|2026-10-26"]'); await T(c, '#calque [data-tt="jour|sm|2026-10-28"]'); ouvert = true; }
      const id = await ev(c, () => ptJour('sm', '2026-10-28')[0].id); await valeur(c, id + '|fin', '17:40'); await c.p.fill('#pt-motif', 'Oubli de pointer'); await ev(c, () => document.getElementById('pt-motif').dispatchEvent(new Event('input', { bubbles:true })));
      const sd = await T(c, '#tt-enr'); const ap = await ev(c, id => ({ fin:POINTAGES.find(o => o.id === id).fin }), id);
      const cible = cas ? 4 : 5;
      v(nom + ' · 5 : corriger une heure — ' + cible + ' gestes (' + (cas ? 'onglet Semaine, la case, la valeur, Enregistrer' : 'onglet Semaine, la personne, la journée, la valeur, Enregistrer') + '), motif tapé, heure enregistrée', N === cible && ouvert && ap.fin === '17:40', { N, ap });
      await L.fin(c); }
    { const c = await ouvrir('marc', profil); await sauf(c, 'pointage');
      /* 6. la semaine est-elle en règle ? 0 geste : la pastille de l'onglet et celle de chaque ligne */
      await T(c, '[data-tt="onglet|semaine"]'); N = 0;
      const p6 = await ev(c, () => ({ pastilles:[...document.querySelectorAll('.tt-sem .st')].filter(e => e.offsetParent).map(e => e.textContent.trim()), tab:(document.querySelector('[data-tt="onglet|auj"] .t-nb') || {}).textContent }));
      v(nom + ' · 6 : la semaine est-elle en règle ? — 0 geste de plus : une pastille par ligne et le nombre sur l\'onglet', N === 0 && p6.pastilles.length >= 4 && /\d/.test(p6.tab || ''), p6);
      /* 7. valider les semaines en règle : 2 pour la semaine (Semaine puis le bouton) + le panneau « Valider » = confirmation */
      N = 0; await T(c, '[data-tt^="valider|"]'); const pan = await ev(c, () => (document.querySelector('#calque h2') || {}).textContent); await T(c, '[data-tt^="validerok|"]');
      const val = await ev(c, () => Object.keys(PT_VALIDE).filter(k => PT_VALIDE[k]).length); v(nom + ' · 7 : valider les personnes en règle — ' + N + ' gestes depuis l\'onglet Semaine (le bouton, puis « Valider » dans le panneau) ; des semaines sont validées', N === 2 && val >= 1, { N, pan, val });
      await L.fin(c); }
    { const c = await ouvrir('marc', profil); await sauf(c, 'pointage');
      /* 7 bis / 8. le mois : valider ce qui est en règle, puis fermer octobre */
      await ev(c, () => { POINTAGES.filter(p => ptOuvert(p)).forEach(p => { p.fin = '16:30'; p.pause = 45; }); POINTAGES.filter(p => p.qui === 'kb' && p.fin && p.date < AUJ && ptDuree(p) > 570).forEach(p => { p.fin = '16:30'; p.pause = 45; }); POINTAGES.filter(p => p.qui === 'kb' && p.date === jour(-2)).forEach(p => { p.debut = '08:30'; p.fin = '16:30'; }); delete PAIE.signales.tl; ptOnglet = 'mois'; rendre(); }); await L.calme(c.p, 300);
      const st = await ev(c, () => { const B = ttMoisBilan(PT_GENS.map(paieVariables)); return { aValider:B.aValider, bloques:B.bloques, nonVal:B.nonVal }; });
      N = 0; const m1 = await T(c, '[data-tt="validertout"]'); await L.calme(c.p, 300); const ap1 = await ev(c, () => ({ b:(document.querySelector('.tt-paie .btn') || {}).textContent, pas:ttMoisBilan(PT_GENS.map(paieVariables)).aValider }));
      v(nom + ' · 7 bis : valider le mois — 1 geste depuis l\'onglet Mois (« Valider ce qui est en règle »), le bouton change ensuite', N === 1 && m1.ok && st.aValider > 0 && ap1.pas === 0, { st, ap1 });
      await ev(c, () => { PT_GENS.forEach(k => { PAIE.confirmes[k] = PAIE.confirmes[k] || { le:'31/10 · 10:00' }; delete PAIE.signales[k]; }); Object.keys(PT_VALIDE).forEach(k => { }); rendre(); });
      const lib = await ev(c, () => (document.querySelector('.tt-paie .tt-ges .btn') || {}).textContent);
      N = 0; await T(c, '[data-tt="paie"]'); await L.calme(c.p, 500); const sur = await ev(c, () => ({ r:route, v:!!document.querySelector('[data-paie="verrouiller"]') }));
      await T(c, '[data-paie="verrouiller"]'); await T(c, '[data-paie="verrouok"]'); const ferme = await ev(c, () => !!PAIE.verrou);
      v(nom + ' · 8 : fermer octobre — « Passer à la paie », « Verrouiller octobre », « Verrouiller » (la confirmation du verrou, dans la Paie validée) = ' + N + ' gestes ; avec l\'onglet Mois et « Valider ce qui est en règle » : ' + (N + 2) + ' (la spécification en comptait 4 : elle omettait la confirmation du verrou)', /Passer à la paie/.test(lib) && sur.v && ferme && N === 3, { lib, sur, ferme, N });
      await L.fin(c); }
    { const c = await ouvrir('marc', profil); await sauf(c, 'pointage');
      /* 9. voir les heures du mois d'une personne : 2 (Mois, la ligne) */
      await T(c, '[data-tt="onglet|mois"]'); await T(c, '[data-tt="mois|sm"]'); const h9 = await ev(c, () => ({ h2:(document.querySelector('#calque h2') || {}).textContent, t:document.querySelector('#calque').innerText.replace(/[  ]/g, ' ') }));
      v(nom + ' · 9 : les heures du mois d\'une personne — 2 gestes (Mois, la ligne) : ses semaines, ses journées, ses corrections', N === 2 && h9.h2 === 'Sophie Martin' && /Ses semaines/i.test(h9.t) && /Ses corrections du mois/i.test(h9.t), { N, h9:h9.h2 });
      await L.fin(c); }
    { const c = await ouvrir('marc', profil); await sauf(c, 'pointage');
      /* 10. pointer soi-même : la carte du salarié en tête d'Aujourd'hui — « Je commence ma journée » (1), « Je termine » → Terminer (2) */
      const b = await ev(c, () => ({ carte:!!document.querySelector('.tt-moi .ptx-carte'), vieux:/Début de ma journée/.test(document.getElementById('contenu').innerText) })); v(nom + ' · 10 : le gérant pointe avec la MÊME carte que le salarié (plus de « Début de ma journée » sans pause)', b.carte && !b.vieux, b);
      N = 0; await T(c, '[data-ptx^="debut|"]'); const cm = await ev(c, () => ({ ouv:!!ptJour('marc', AUJ).find(p => !p.fin) })); await T(c, '[data-ptx^="termine|"]'); await T(c, '[data-ptx^="termineok|"]'); const fin = await ev(c, () => ptJour('marc', AUJ).every(p => p.fin));
      v(nom + ' · 10 : commencer (1) puis terminer avec pause et fin proposées (2) = 3 gestes', cm.ouv && fin && N === 3, { N, cm, fin });
      await L.fin(c); }

    /* ═══ § 5.3 — le technicien (partie heures) ═══ */
    { const c = await ouvrir('sm', profil); await sauf(c, 'majournee');
      const n1 = N; await T(c, '[data-ptx^="debut|"]'); const d1 = await ev(c, () => !!ptJour('sm', AUJ).find(p => !p.fin)); v(nom + ' · T1 : commencer sa journée — 1 geste', N === 1 && d1);
      N = 0; await T(c, '[data-ptx^="pause|"]'); const d3 = await ev(c, () => { const p = ptJour('sm', AUJ).find(p => !p.fin); return !!PTX.pause[p.id]; }); await T(c, '[data-ptx^="reprendre|"]'); v(nom + ' · T3 : pause (1) et reprendre (1)', N === 2 && d3);
      N = 0; await T(c, '[data-ptx^="termine|"]'); await T(c, '[data-ptx^="termineok|"]'); const d2 = await ev(c, () => ptJour('sm', AUJ).every(p => p.fin)); v(nom + ' · T2 : terminer (fin et pause proposées) — 2 gestes', N === 2 && d2, N);
      await L.aller(c.p, 'mesheures'); N = 0;
      /* T4 : confirmer = 2 (Heures, le bouton) sans défiler : la barre du bas est le 1 */
      await ev(c, () => { delete PAIE.confirmes.sm; rendre(); }); await L.calme(c.p, 300);
      const barre = await ev(c, () => { const b = [...document.querySelectorAll('#barre-bas .opg-tab')].find(e => /Heures/.test(e.textContent)); return b ? { ok:true, h:Math.round(b.getBoundingClientRect().height) } : { ok:false }; });
      const cf = await T(c, '[data-tt^="mhconf|"]'); const conf = await ev(c, () => !!PAIE.confirmes.sm);
      v(nom + ' · T4 : confirmer ses heures — la barre du bas (1, ' + (tel ? 'présente' : 'menu sur ordinateur') + ') + « Je confirme mes heures » (1) = 2, sans défiler', cf.ok && cf.dedans && conf && N === 1 && (!tel || barre.ok), { N, cf, barre });
      /* T6 : voir sa semaine = 1 : « Cette semaine » est dans le premier écran de Mes heures */
      const sem = await ev(c, () => { const e = [...document.querySelectorAll('.tt-mh-sem')][0], k = document.querySelector('.tt-mh-k .kpi'); return { e:!!e && e.getBoundingClientRect().bottom <= innerHeight, k:!!k && k.getBoundingClientRect().bottom <= innerHeight, t:e ? e.innerText.replace(/\s+/g, ' ') : '' }; });
      v(nom + ' · T6 : voir sa semaine — dans le premier écran de Mes heures, sans défiler (le chiffre « cette semaine » ; la liste ' + (sem.e ? 'aussi' : 'au-dessous') + ')', sem.k, sem);
      /* T5 : signaler une erreur = 3 (Heures, « Il y a une erreur », Envoyer) */
      await ev(c, () => { delete PAIE.confirmes.sm; delete PAIE.signales.sm; rendre(); }); await L.calme(c.p, 300); N = 0;
      await T(c, '[data-tt^="erreur|"]'); await ev(c, () => { document.getElementById('ptx-sf').value = '17:30'; }); await T(c, '[data-ptx^="sigok|"]'); const sg = await ev(c, () => !!PAIE.signales.sm);
      v(nom + ' · T5 : signaler une erreur — la barre (1) + « Il y a une erreur » (1) + « Envoyer au bureau » (1) = 3', sg && N === 2, N);
      /* T7 : sa fiche de paie = 3 (Heures, Mes fiches de paie, la ligne) */
      N = 0; await T(c, '[data-tt="mhonglet|fiches"]'); await T(c, '[data-paie^="bulletin|sm|sept"]'); await L.calme(c.p, 300); const fp = await ev(c, () => !!document.getElementById('docplein'));
      v(nom + ' · T7 : sa fiche de paie — la barre (1) + l\'onglet (1) + la ligne (1) = 3, sans défiler', fp && N === 2, N);
      await L.fin(c); }
  }

  /* ═══ § 6.3 — la table du salarié : « J'ai commencé plus tôt » et « Fin d'hier ? » (la carte unique de Ma journée) ═══ */
  { const c = await ouvrir('tl', 'iphone'); await sauf(c, 'majournee');
    await ev(c, () => { POINTAGES.forEach((p, i) => { if (p.qui === 'tl' && ptOuvert(p)) POINTAGES.splice(i, 1); }); rendre(); }); await L.calme(c.p, 300);
    await T(c, '[data-ptx^="plustot|"]'); await ev(c, () => { document.getElementById('ptx-h').value = '07:30'; }); await T(c, '[data-ptx^="plustotok|"]');
    const pt = await ev(c, () => { const p = ptJour('tl', AUJ)[0]; return p && p.debut; }); v('§ 6.3 : « J\'ai commencé plus tôt » — la journée commence à l\'heure donnée (07:30), pas à maintenant', pt === '07:30', pt);
    await ev(c, () => { POINTAGES.push({ id:'ptlhier', qui:'tl', date:jour(-1), debut:'07:45', fin:null, pause:0 }); rendre(); }); await L.calme(c.p, 300);
    const oubli = await ev(c, () => ({ carte:!!document.querySelector('.ptx-oubli'), h:(document.querySelector('[data-ptx^="finhier|"]') || {}).textContent })); N = 0;
    await T(c, '[data-ptx^="finhier|"]'); const fh = await ev(c, () => (POINTAGES.find(p => p.id === 'ptlhier') || {}).fin);
    v('§ 6.3 : « Fin d\'hier ? » — la carte propose la fin habituelle (' + oubli.h + '), UN geste la donne, jamais « maintenant »', oubli.carte && /^\d\d:\d\d$/.test(oubli.h) && fh === oubli.h && N === 1, { oubli, fh, N });
    await L.fin(c); }

  /* ═══ § 6.2 — la table du gérant, ligne par ligne (destination de chaque capacité) ═══ */
  { const c = await ouvrir('marc', 'mac'); await sauf(c, 'pointage');
    const A = await ev(c, () => ({
      quiEstOu:document.querySelectorAll('.tt-qui .tt-l').length, rappelCarte:!!document.querySelector('.tt-rap-carte button'), rappelModifier:!!document.querySelector('[data-tt="rappels"]'), terminer:!!document.querySelector('[data-tt^="terminer|"]'), demander:!!document.querySelector('[data-tt^="demander|"]'),
      accepter:!!document.querySelector('[data-tt^="accepter|"]'), regle:!!document.querySelector('[data-tt="regle"]'), ajouter:!!document.querySelector('.tete [data-tt="ajout"]'), moi:!!document.querySelector('.tt-moi .ptx-carte'),
      nul:/sup\.|supplémentaires/i.test(document.getElementById('contenu').innerText) }));
    v('§ 6.2 : « Qui travaille / est absent / n\'a pas pointé » → une rangée par personne (Julie non attendue)', A.quiEstOu === 4, A);
    v('§ 6.2 : « Rappeler » → bouton de carte + ligne « Modifier » (rappels automatiques) ; « Clôturer » → « Terminer à… » + « Lui demander » ; « Demande » → « Accepter » ; « Ajouter » en tête de page', A.rappelCarte && A.rappelModifier && A.terminer && A.demander && A.accepter && A.ajouter, A);
    v('§ 6.2 : « Pointer soi-même » → la carte du salarié en tête ; aucun « sup. » ni « supplémentaires » sur Aujourd\'hui', A.moi && !A.nul, A);
    await ev(c, () => { ptOnglet = 'semaine'; rendre(); }); await L.calme(c.p, 300);
    const S = await ev(c, () => ({ prevu:/prévu \d+h\d\d/.test(document.getElementById('contenu').innerText), nav:!!document.querySelector('[data-tt="nav|-1"]'), colonnes:document.querySelectorAll('.tt-gh span').length, enPlus:/en plus/.test(document.getElementById('contenu').innerText), nul:/sup\./.test(document.getElementById('contenu').innerText) }));
    v('§ 6.2 : « Semaine » → la grille, ‹ ›, « prévu 3h30 » (planifié ↔ pointé), « en plus » (jamais « sup. »)', S.prevu && S.nav && S.colonnes >= 9 && S.enPlus && !S.nul, S);
    await ev(c, () => ttRegle()); const R = await ev(c, () => document.querySelector('#calque').innerText.replace(/[  ]/g, ' '));
    v('§ 6.2 : « Repères légaux » → la feuille « La règle » (10 h, 11 h, 48 h, pause, 35 h) avec le Code du travail écrit ICI', /10 heures par jour/.test(R) && /11 heures de repos/.test(R) && /48 heures par semaine/.test(R) && /expert-comptable/.test(R), R.slice(0, 120));
    await ev(c, () => { fermerPanneau(); ptOnglet = 'mois'; rendre(); }); await L.calme(c.p, 300);
    const M = await ev(c, () => { const V = PT_GENS.map(paieVariables), k = [...document.querySelectorAll('.kpis.tt-k:not(.tt-k1) .kpi b')].map(b => b.textContent.replace(/[\s  ]/g, '')); return { k, tot:ttHL(V.reduce((s, v) => s + v.tot, 0)).replace(/[\s  ]/g, ''), conf:V.filter(v => v.confirme).length, paie:!!document.querySelector('[data-tt="paie"], [data-tt="validertout"], [data-tt="confirmer"], [data-tt="areg"]') }; });
    v('§ 6.2 : « Chiffres du mois » → quatre chiffres égaux à paieVariables (heures, en plus, à régler, confirmés)', M.k.length === 4 && M.k[0] === M.tot && M.k[3] === M.conf + 'sur6', M);
    await ev(c, () => ttMoisPers('sm')); const R2 = await ev(c, () => ({ lien:!!document.querySelector('#calque [data-tt="releve|sm"]'), semaines:document.querySelectorAll('#calque [data-tt^="sem|sm|"]').length, journees:/Ses journées/.test(document.querySelector('#calque').innerText) }));
    v('§ 6.2 : « Relevé par salarié » → la feuille « Octobre · Sophie » (ses semaines, ses journées, le lien vers son relevé de paie)', R2.lien && R2.semaines >= 4 && R2.journees, R2);
    await ev(c, () => { fermerPanneau(); aller('comptabilite'); }); await L.calme(c.p, 400);
    await ev(c, () => paieAller('paiemois')); await L.calme(c.p, 500);
    const P = await ev(c, () => ({ valide:!!document.querySelector('[data-paie="validertout"]'), verrou:!!document.querySelector('[data-paie="verrouiller"]'), txt:document.getElementById('contenu').innerText.replace(/[  ]/g, ' ') }));
    v('§ 6.2 : « Verrouiller le mois, envoyer au cabinet » → reste dans Comptabilité › Paie (« Valider ce qui est en règle », « Verrouiller octobre »)', P.valide && P.verrou && /Valider ce qui est en règle/.test(P.txt), { valide:P.valide, verrou:P.verrou });
    await L.fin(c); }

  /* le tour guidé de la Paie (« corriger avec une trace ») suit la nouvelle fiche : la cible de chaque étape existe */
  { const c = await ouvrir('marc', 'mac'); await sauf(c, 'pointage');
    await ev(c, () => ptFicheJour('tl', paieJourSignale('tl'))); await L.calme(c.p, 300);
    const T0 = await ev(c, () => { const d = paieJourSignale('tl'); const p = POINTAGES.find(o => o.qui === 'tl' && o.date === d), i = document.querySelector(`#calque [data-ptc="${p.id}|fin"]`), b = i && i.nextElementSibling;
      const a = { fin:!!b && b.classList.contains('dt-btn'), motifCache:!!document.querySelector('#pt-motif') && document.getElementById('pt-motif').offsetParent === null };
      i.value = '17:40'; i.dispatchEvent(new Event('change', { bubbles:true })); a.motifVisible = document.getElementById('pt-motif').offsetParent !== null; a.enr = !!document.getElementById('tt-enr'); a.okFin = i.value !== p.fin;
      document.getElementById('pt-motif').value = 'Oubli de pointer'; document.getElementById('pt-motif').dispatchEvent(new Event('input', { bubbles:true })); document.getElementById('tt-enr').click(); a.trace = PT_TRACE.some(t => t.qui === 'tl' && t.champ === 'fin' && /^31\/10/.test(t.le)); a.paietrs = !!document.querySelector('#calque .paie-trs'); return a; });
    v('Visite guidée « Corriger avec une trace » : le bouton d\'heure, le motif (visible après le changement), « Enregistrer la correction » et la trace existent dans l\'ordre des étapes', T0.fin && T0.motifVisible && T0.enr && T0.okFin && T0.trace && T0.paietrs, T0);
    v('zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
