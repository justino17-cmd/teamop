// Correcteur du lot « vehtemps » — le TÉLÉPHONE (salarie-01, 02, 04, 05, 09, 11, 12).
//  01 : la question « Pourquoi changes-tu cette heure ? » se voit, entière, dès qu'elle paraît (le pied collant ne la recouvre plus) ;  02 : les cases du sélecteur d'heure font 44 px au doigt ;
//  04 : « C'est réglé » ferme TOUTES les tâches d'un souci signalé deux fois ;  05 : au téléphone, la première ligne « À régler » se lit sur le premier écran ;
//  09 : plus de code mort (ptxSemaine, l'écouteur ptsem) ;  11 : les blocs de « Ma journée » ne disparaissent pas si un marqueur change ;  12 : sur la Semaine, la première personne se lit sans défiler.
// Chaque contrôle prouve sa population. 127.0.0.1 seulement.
const fs = require('fs'), path = require('path');
const L = require('../lib.js'), v = L.v;
const ev = (c, f, a) => c.p.evaluate(f, a);
const PROFILS = (process.env.PROFILS || 'iphone,android,petit').split(',');
const BARRE = 100;   /* la barre d'onglets flottante + l'encoche mangent ~100 px en bas de l'écran */
(async () => {
  const SRC = fs.readFileSync(path.join(L.RACINE, 'apercu', 'prototype-op-gestion.html'), 'utf8');
  v('09 : plus de code mort dans le module Temps de travail (ptxSemaine, écouteur ptsem, branches sem / releve / sig du gestionnaire ptx)', !/ptxSemaine/.test(SRC) && !/data-pt\^="ptsem\|"/.test(SRC) && !/if \(a === 'sig'\) return ptxSigPanneau/.test(SRC) && !/data-ptx="(sem|releve|sig)\|/.test(SRC), {});
  for (const profil of PROFILS) {
    const nom = profil;
    /* ── 01 + 02 : la question du motif, les cases d'heure ── */
    { const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
      const id = await ev(c, () => { ttFicheJour('sm', '2026-10-28'); return ptJour('sm', '2026-10-28')[0].id; }); await L.calme(c.p, 500);
      await L.toucher(c, `#calque [data-ptc="${id}|fin"] + .dt-btn`); await c.p.waitForSelector('#dtpop', { timeout:3000 }); await L.calme(c.p, 300);
      const D = await ev(c, () => [...document.querySelectorAll('#dtpop .dt-h button')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().height)));
      v(nom + ' · 02 : population — des cases d\'heure sont dessinées', D.length >= 12, { n:D.length });
      v(nom + ' · 02 : chaque case d\'heure fait 44 px au moins au doigt', D.every(h => h >= 44), D.filter(h => h < 44).slice(0, 3));
      await L.toucher(c, '#dtpop [data-dth="17"]'); await L.toucher(c, '#dtpop [data-dtmn="40"]'); if (await c.p.$('#dtpop [data-dtok]')) await L.toucher(c, '#dtpop [data-dtok]'); await L.calme(c.p, 900);
      const M = await ev(c, () => { const m = document.getElementById('pt-motif'), b = document.getElementById('tt-enr'), bl = document.getElementById('tt-motif-bloc'); if (!m || bl.hidden) return { vu:false }; const r = m.getBoundingClientRect(), rb = b.getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { vu:true, H:innerHeight, haut:Math.round(r.top), bas:Math.round(r.bottom), btnHaut:Math.round(rb.top), btnBas:Math.round(rb.bottom), recouvert:!(at === m), valeur:document.querySelector('[data-ptc="' + b.closest('#tt-edit').parentNode.querySelector('[data-ptc]').dataset.ptc + '"]') && 1 }; });
      v(nom + ' · 01 : population — la question « Pourquoi ? » est apparue après le changement d\'heure', M.vu === true, M);
      v(nom + ' · 01 : le champ du motif est entier à l\'écran, au-dessus du bouton, et rien ne le recouvre', M.vu && !M.recouvert && M.haut >= 0 && M.bas <= M.btnHaut && M.btnBas <= M.H, M);
      await L.capture(c, '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps-corr/tel-motif-' + profil + '.png');
      await L.fin(c); }
    /* ── 05 + 12 : le gérant au téléphone ── */
    { const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
      const A = await ev(c, () => { const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top:Math.round(r.top), bas:Math.round(r.bottom) }; }; return { H:innerHeight, moi:q('.tt-moi'), areg:q('#tt-areg'), lig:q('#tt-areg .tt-lig'), n:document.querySelectorAll('#tt-areg .tt-lig').length }; });
      v(nom + ' · 05 : population — des lignes « À régler » ET la carte de sa journée', A.n >= 2 && !!A.moi && !!A.lig, A);
      if (profil === 'petit') v(nom + ' · 05 : (320 × 568, l\'en-tête et la barre mangent la moitié de l\'écran : la ligne ne tient pas au-dessus de la barre, on exige seulement qu\'elle passe avant la carte de sa journée)', A.lig.top < A.moi.top, A);
      else v(nom + ' · 05 : la première ligne « À régler » se lit sur le premier écran, au-dessus de la barre d\'onglets', A.lig.top >= 0 && A.lig.top + 60 <= A.H - BARRE, A);
      v(nom + ' · 05 : la carte de sa journée suit (elle n\'est pas perdue)', A.moi.top > A.areg.top, A);
      await ev(c, () => { ptOnglet = 'semaine'; rendre(); }); await L.calme(c.p, 500);
      const S = await ev(c, () => { const q = s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { top:Math.round(r.top), bas:Math.round(r.bottom), d:getComputedStyle(e).display }; }; return { H:innerHeight, k1:q('.tt-k1'), phrase:q('.tt-dit'), liste:q('.tt-liste .tt-p, .tt-liste > *'), nom:q('.tt-liste') }; });
      v(nom + ' · 12 : sur la Semaine, les quatre chiffres du jour ne sont plus répétés', !!S.k1 && S.k1.d === 'none', S);
      v(nom + ' · 12 : la phrase « la semaine est-elle en règle ? » se lit entière sans défiler', !!S.phrase && (profil === 'petit' ? S.phrase.top + 50 <= S.H - BARRE + 30 : S.phrase.bas <= S.H - BARRE), S);   /* 320 × 568 : l'en-tête et la barre mangent la moitié de l'écran, on exige le début de la phrase */
      v(nom + ' · 12 : la première personne commence au-dessus de la barre d\'onglets', !!S.liste && (profil === 'petit' || S.liste.top <= S.H - BARRE), S);
      await ev(c, () => { ptOnglet = 'auj'; rendre(); }); await L.calme(c.p, 400);
      v(nom + ' · 12 : contre-épreuve — sur « Aujourd\'hui », les quatre chiffres sont là', (await ev(c, () => getComputedStyle(document.querySelector('.tt-k1')).display)) !== 'none', {});
      await L.fin(c); }
    /* ── 04 : un souci signalé deux fois ── */
    { const c = await L.ouvrir({ profil, qui:'sm', calme:true });
      const R = await ev(c, () => { const V = vhCamionDe('sm'); const ouv = () => TACHES.filter(t => /vsouci-/.test(t.cle || '') && !t.fait).length; const sig = t => { vxSouciPanel(V.id); document.getElementById('vx-st').value = t; document.getElementById('vx-sx').value = ''; vxSouciOk(V.id); };
        const n0 = ouv(); sig('Pneu'); const n1 = ouv(); sig('Voyant allumé'); const n2 = ouv(); const liste = vxSouciTaches(V.souci).length; vxSouciRegle(V.id); const n3 = ouv(); const sans = !V.souci; document.querySelector('#toast button').click(); const n4 = ouv(); return { n0, n1, n2, liste, n3, sans, n4 }; });
      v(nom + ' · 04 : population — deux signalements = deux tâches urgentes ouvertes, un seul souci', R.n1 === R.n0 + 1 && R.n2 === R.n0 + 2 && R.liste === 2, R);
      v(nom + ' · 04 : « C\'est réglé » les ferme TOUTES (plus aucune tâche orpheline)', R.n3 === R.n0 && R.sans, R);
      v(nom + ' · 04 : « Annuler » les rouvre toutes les deux', R.n4 === R.n0 + 2, R);
      await L.fin(c); }
    /* ── 11 : « Ma journée » du technicien et du chef d'équipe ── */
    for (const qui of ['sm', 'kb']) { const c = await L.ouvrir({ profil, qui, calme:true }); await L.aller(c.p, 'majournee');
      const J = await ev(c, () => { const t = document.getElementById('contenu').textContent.replace(/[  ]/g, ' '); return { camion:!!document.querySelector('#contenu .vh-ligne, #contenu [data-vhacc], #contenu .vhc, #contenu [data-vx="camion"]') || /Mon camion|camion/i.test(t), carte:!!document.querySelector('#contenu .ptx-carte'), t:t.slice(0, 60) }; });
      v(nom + ' · 11 : ' + qui + ' — « Ma journée » porte la carte de sa journée de travail et la ligne du camion', J.carte && J.camion, J);
      await L.fin(c); }
    { const c = await L.ouvrir({ profil, qui:'sm', calme:true });
      const F = await ev(c, () => ({ a:majPoser('<p>x</p>', 'ABSENT', '<i>B</i>'), b:majPoser('<p>x</p><div class="m">', '<div class="m">', '<i>B</i>'), c:majPoser('<b>1</b></div>', '</div>', '<i>B</i>', true), d:majPoser('<p>x</p>', 'ABSENT', '') }));
      v(nom + ' · 11 : un marqueur absent ne fait plus disparaître le bloc (il passe à la fin), présent il se pose avant / après', F.a === '<p>x</p><i>B</i>' && F.b === '<p>x</p><i>B</i><div class="m">' && F.c === '<b>1</b></div><i>B</i>' && F.d === '<p>x</p>', F);
      await L.fin(c); }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR', e.stack || e); await L.fermer().catch(() => {}); process.exit(2); });
