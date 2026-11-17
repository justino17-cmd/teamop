// Correcteur du lot « vehtemps » — TEMPS DE TRAVAIL, le gérant (gerant-04, 05, 07, 11, 12, 17, 18).
//  04 : « Voir la journée » d'une demande rappelle la demande, sa raison et le bouton Accepter ;  05 : une journée ouverte AUJOURD'HUI dit « en cours », jamais « 0h00 » ;
//  07 : une demande sur un mois fermé n'est plus une chose à régler (pas de bouton qui ne peut que refuser) ;  11 : le texte horaire d'une case ne touche plus son bord ;
//  12 : la grille de sept jours paraît dès 1280 px d'écran ;  17 : pas de « Congé payé » le week-end ;  18 : « Sophie et Tom ».
// Chaque contrôle prouve sa population. 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const PROFILS = (process.env.PROFILS || 'mac,windows,mac720,iphone').split(',');
const NUITS = (process.env.NUIT || '0').split(',').map(x => x === '1');
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : ''), tel = ['iphone', 'android', 'petit'].includes(profil);
    const c = await L.ouvrir({ profil, nuit, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
    /* ── 12 : la grille paraît dès 1280 px ── */
    await ev(c, () => { ptOnglet = 'semaine'; rendre(); }); await L.calme(c.p, 500);
    const G = await ev(c, () => { const g = document.querySelector('.tt-grille'), l = document.querySelector('.tt-liste'), cc = document.querySelector('.tt-conteneur'); return { grille:!!g && getComputedStyle(g).display !== 'none', liste:!!l && getComputedStyle(l).display !== 'none', conteneur:cc ? Math.round(cc.getBoundingClientRect().width) : 0, w:innerWidth }; });
    if (!tel) v(nom + ' · 12 : la grille de sept jours est dessinée (et non la liste du téléphone)', G.grille && !G.liste && G.conteneur >= 900, G);
    /* ── 11 : le texte horaire ne touche pas le bord de sa case ── */
    if (G.grille) {
      const H = await ev(c, () => [...document.querySelectorAll('.tt-grille .tt-j')].filter(b => b.offsetParent).map(b => { const r = b.getBoundingClientRect(); const sp = b.querySelector('span'); let max = 0; if (sp) { const rg = document.createRange(); rg.selectNodeContents(sp); for (const q of rg.getClientRects()) max = Math.max(max, q.right); } const bt = b.querySelector('b').getBoundingClientRect(); return { w:Math.round(r.width), marge:sp ? Math.round((r.right - 1 - max) * 10) / 10 : null, bdeb:Math.round((r.right - 1 - bt.right) * 10) / 10, horiz:sp ? /\d\d:\d\d/.test(sp.textContent) : false }; }));
      const avecH = H.filter(x => x.horiz);
      v(nom + ' · 11 : population — des cases avec un texte horaire', H.length >= 35 && avecH.length >= 10, { cases:H.length, horaires:avecH.length });
      v(nom + ' · 11 : le texte horaire garde 4 px au moins avant le bord de sa case (' + avecH.length + ' cases)', avecH.every(x => x.marge >= 4), avecH.filter(x => x.marge < 4).slice(0, 4));
      v(nom + ' · 11 : le total (« 7h05 ») ne touche pas le bord non plus', H.every(x => x.bdeb >= 2), H.filter(x => x.bdeb < 2).slice(0, 3));
    }
    const J = await ev(c, () => { const t = k => [...document.querySelectorAll('[data-tt="jour|' + k + '|2026-10-31"]')].filter(e => e.offsetParent)[0]; const aut = t('kb'); return aut ? { txt:aut.textContent, label:aut.getAttribute('aria-label') } : null; });
    if (G.grille) {
      /* ── 05 : Karim est au travail depuis 08:05 ── */
      const ouvK = await ev(c, () => POINTAGES.filter(p => p.qui === 'kb' && p.date === AUJ && !p.fin).length);
      v(nom + ' · 05 : population — Karim a une journée ouverte aujourd\'hui', ouvK === 1 && !!J, { ouvK, J });
      v(nom + ' · 05 : sa case dit « en cours · depuis 08:05 », jamais « 0h00 »', !!J && /en cours/.test(net(J.txt)) && /08:05/.test(net(J.txt)) && !/0h00/.test(net(J.txt)) && /en cours/.test(J.label), J);
      /* ── 17 : Léa en congé : pas de « Congé payé » le samedi 31 ni le dimanche 1er ── */
      const W = await ev(c, () => ['2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30', '2026-10-31', '2026-11-01'].map(d => { const b = [...document.querySelectorAll('[data-tt="jour|lr|' + d + '"]')].filter(e => e.offsetParent)[0]; return { d, t:b ? b.textContent.replace(/\s+/g, ' ').trim() : null, abs:!!absDe('lr', d), we:dObj(d).getDay() % 6 === 0 }; }));
      v(nom + ' · 17 : population — Léa est absente en semaine ET le week-end de la grille', W.some(x => x.abs && !x.we) && W.some(x => x.abs && x.we) && W.every(x => x.t !== null), W);
      v(nom + ' · 17 : « Congé payé » en semaine, « — » le samedi et le dimanche', W.filter(x => x.abs && !x.we).every(x => /Congé/.test(x.t)) && W.filter(x => x.we).every(x => !/Congé/.test(x.t) && /—/.test(x.t)), W.map(x => [x.d, x.t]));
    }
    await L.fin(c);
  }
  /* ── 18, 04, 07 : une ouverture par profil bureau ── */
  for (const profil of (process.env.PROFILS_G || 'mac,iphone').split(',')) {
    const nom = profil;
    { const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
      const t18 = await ev(c, () => { ptxRappeler(); return document.getElementById('toast').textContent; });
      v(nom + ' · 18 : « Rappel envoyé à Sophie et Tom. »', /Rappel envoyé à Sophie et Tom\./.test(net(t18)), t18);
      await L.fin(c); }
    { const c = await L.ouvrir({ profil, qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
      const R = await ev(c, () => ttAReglerLignes().map(o => o.lib + ':' + o.k + ':' + o.bouton.act));
      const dem = await ev(c, () => paieJourSignale('tl'));
      v(nom + ' · 04 : population — la demande de Tom est à régler (mois ouvert)', R.some(x => /^Demande:tl:accepter/.test(x)) && !!dem, { R, dem });
      await ev(c, d => { ttFicheJour('tl', d); }, dem); await L.calme(c.p, 500);
      const F = await ev(c, () => { const z = document.querySelector('#calque'); const dm = z.querySelector('.tt-demande'); return { texte:dm ? dm.textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ') : null, accepter:z.querySelectorAll('[data-tt="accepter|tl"]').length, bouton:dm && (dm.querySelector('button') || {}).textContent }; });
      v(nom + ' · 04 : la fiche de la journée rappelle la demande, sa raison et propose « Accepter 17:40 »', !!F.texte && /Tom demande une correction/.test(F.texte) && /17:40/.test(F.texte) && /oublié de pointer/.test(F.texte) && F.accepter === 1 && /Accepter 17:40/.test(F.bouton || ''), F);
      await L.capture(c, '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps-corr/t-demande-' + profil + '.png');
      /* 07 : mois fermé */
      await ev(c, () => { fermerPanneau(); PAIE.verrou = { le:'31/10 · 09:00', par:'marc', emp:'x' }; rendre(); }); await L.calme(c.p, 400);
      const R2 = await ev(c, () => ttAReglerLignes().map(o => o.lib + ':' + o.k)), n2 = await ev(c, () => [...document.querySelectorAll('#contenu [data-tt="accepter|tl"]')].length);
      v(nom + ' · 07 : mois fermé — la demande n\'est plus à régler et aucun « Accepter » n\'est proposé', !R2.some(x => /^Demande/.test(x)) && n2 === 0 && R.length > R2.length, { R2, n2 });
      await ev(c, d => { ttFicheJour('tl', d); }, dem); await L.calme(c.p, 400);
      const F2 = await ev(c, () => { const dm = document.querySelector('#calque .tt-demande'); return dm ? dm.textContent.replace(/\s+/g, ' ') : null; });
      v(nom + ' · 07 : sur la fiche du mois fermé, la demande se lit et dit « régularisée avec le mois suivant », sans bouton', !!F2 && /Tom demande/.test(F2) && /régularisée avec le mois suivant/.test(F2) && (await ev(c, () => document.querySelectorAll('#calque [data-tt="accepter|tl"]').length)) === 0, F2);
      await L.fin(c); }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR', e.stack || e); await L.fermer().catch(() => {}); process.exit(2); });
