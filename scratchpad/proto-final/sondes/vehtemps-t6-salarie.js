// Temps de travail, étape 2 (T6) — LE SALARIÉ : « Ma journée de travail » (une seule fois, dans Ma journée) et « Mes heures » à deux onglets,
// « Ce mois-ci » et « Mes fiches de paie » : une phrase qui dit si le mois est prêt et UN bouton « Je confirme mes heures » (avec l'avertissement
// d'une journée encore ouverte : avertir, ne pas bloquer), « Il y a une erreur » en trois gestes, trois chiffres, UNE liste de journées regroupée
// par semaine (la même fonction que la feuille de semaine du gérant), la feuille d'une journée (la correction du bureau avant → après, par qui,
// pourquoi), les fiches de paie. Chaque contrôle prouve d'abord sa population. PROFILS=mac,iphone NUIT=0,1 pour restreindre.
const L = require('../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps2/';
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[\u00a0\u202f]/g, ' ');
const txt = async (c, sel) => net(await c.p.evaluate(s => (document.querySelector(s) || {}).innerText || '', sel));
const clic = async (c, sel) => { const ok = await L.toucher(c, sel); if (!ok) console.log('   (pas atteint : ' + sel + ')'); return ok; };
const shots = [];
const salarie = async (qui, profil, nuit, route) => { const c = await L.ouvrir({ profil:profil || 'iphone', qui, nuit:!!nuit, calme:true }); await L.aller(c.p, route || 'mesheures'); return c; };
const PROFILS = (process.env.PROFILS || 'mac,windows,ipad,iphone,android,petit').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(Number);
const HMAX = { iphone:1600, android:1750, petit:1900 };   // § 4.7 : ≤ 1 600 px sur iPhone ; Android (360) et 320 passent une ligne de plus sur chaque libellé

(async () => {
  /* ── A. la structure, sur Sophie (iPhone) ── */
  { const c = await salarie('sm', 'iphone');
    const s = await ev(c, () => { const z = document.getElementById('contenu'); return { h:z.scrollHeight, sur:(z.querySelector('.surtitre') || {}).textContent, h1:(z.querySelector('h1') || {}).textContent, gris:(z.querySelector('.tete .gris') || {}).textContent,
      onglets:[...z.querySelectorAll('.seg [data-tt^="mhonglet|"]')].map(b => b.textContent.trim()), txt:z.innerText.replace(/[\u00a0\u202f]/g, ' '), carteJournee:z.querySelectorAll('.ptx-carte').length, kpis:[...z.querySelectorAll('.tt-mh-k .kpi')].map(k => k.innerText.replace(/\s+/g, ' ').trim()),
      sem:[...z.querySelectorAll('.tt-mh-sem')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), jours:z.querySelectorAll('.tt-mh-j .tt-jr').length, boutons:z.querySelectorAll('button').length }; });
    v('A : le cadre — surtitre « Octobre 2026 », titre « Mes heures », la phrase', /Octobre 2026/i.test(s.sur) && s.h1 === 'Mes heures' && s.gris === 'Ce que tu as fait, et ce qui part sur ta paie.', s);
    v('A : DEUX onglets — « Ce mois-ci » et « Mes fiches de paie »', s.onglets.join('|') === 'Ce mois-ci|Mes fiches de paie', s.onglets);
    v('A : la carte « Ma journée de travail » n\'est PLUS recopiée ici (une ligne « Aujourd\'hui » à la place)', s.carteJournee === 0 && !/Ma journée de travail/.test(s.txt) && /Aujourd’hui : pas encore commencé/.test(s.txt), { c:s.carteJournee });
    v('A : trois chiffres — cette semaine, ce mois-ci, en plus ce mois-ci', s.kpis.length === 3 && /cette semaine/.test(s.kpis[0]) && /ce mois-ci/.test(s.kpis[1]) && /en plus ce mois-ci/.test(s.kpis[2]), s.kpis);
    v('A : UNE liste de journées regroupée par semaine — « Cette semaine » d\'abord, la plus récente en haut', s.sem.length >= 2 && /^Cette semaine/.test(s.sem[0]) && /^Semaine du 19 oct\. au 25 oct\./.test(s.sem[1]) && s.jours >= 8, s.sem);
    v('A : une semaine qui finit le mois suivant dit « payée avec novembre » (plus « se termine en novembre — +5h50 sup. »)', /payée avec novembre/.test(s.sem[0]) && !/sup\./.test(s.txt) && !/se termine en/.test(s.txt), s.sem[0]);
    v('A : les anciens blocs ont disparu — « Ce n\'est pas ça », « Heures corrigées par le bureau », « Semaine par semaine », « heures supplémentaires »', !/Ce n’est pas ça|Heures corrigées par le bureau|Semaine par semaine|supplémentaires/.test(s.txt), s.txt.slice(0, 200));
    v('A : la hauteur de la page — ≤ 1 600 px sur iPhone (3 004 px avant)', s.h <= 1600, s.h);
    v('A : le sens des mots — « en plus », jamais « sup. »', !/sup\./.test(s.txt));
    await L.fin(c); }

  /* ── B. confirmer : une phrase, un bouton ; l'avertissement d'une journée ouverte ── */
  { const c = await salarie('sm', 'iphone');
    const a0 = await ev(c, () => ({ pret:(document.querySelector('.tt-pret') || {}).innerText || '', boutons:[...document.querySelectorAll('.tt-pret button')].map(b => b.textContent.trim()) }));
    v('B : la phrase du mois prêt, un bouton « Je confirme mes heures » et un lien « Il y a une erreur »', /Tes heures d’octobre sont prêtes\./.test(net(a0.pret)) && /\d+h\d\d/.test(a0.pret) && a0.boutons.join('|') === 'Je confirme mes heures|Il y a une erreur', a0);
    await ev(c, () => { delete PAIE.confirmes.sm; ptxCommencer('sm'); }); await L.aller(c.p, 'mesheures');
    const ouv = await ev(c, () => ({ ligne:(document.querySelector('.tt-mh-auj') || {}).innerText || '', bouton:(document.querySelector('.tt-mh-auj button') || {}).textContent }));
    v('B : la population — Sophie a commencé : la ligne « Aujourd\'hui » dit l\'heure et propose « Je termine » (même bouton que Ma journée)', /Aujourd’hui : commencée à \d\d:\d\d · /.test(net(ouv.ligne)) && ouv.bouton === 'Je termine', ouv);
    await clic(c, '[data-tt^="mhconf|"]'); const av = await ev(c, () => ({ titre:(document.querySelector('#calque h2') || {}).textContent, boutons:[...document.querySelectorAll('#calque .actions button')].map(b => b.textContent.trim()), conf:!!PAIE.confirmes.sm }));
    v('B : avertir, ne pas bloquer — « Ta journée d\'aujourd\'hui n\'est pas terminée. Confirmer quand même ? » (rien n\'est confirmé encore)', /Ta journée d’aujourd’hui n’est pas terminée\./.test(av.titre) && av.boutons.join('|') === 'Confirmer quand même|Je termine d’abord' && !av.conf, av);
    await clic(c, '[data-tt="mhfin"]'); const fin = await ev(c, () => ({ route, carte:(document.querySelector('.ptx-carte h3') || {}).textContent, conf:!!PAIE.confirmes.sm }));
    v('B : « Je termine d\'abord » mène à Ma journée (la carte « Ma journée de travail »), rien n\'est confirmé', fin.route === 'majournee' && fin.carte === 'Ma journée de travail' && !fin.conf, fin);
    await L.aller(c.p, 'mesheures'); await clic(c, '[data-tt^="mhconf|"]'); await clic(c, '[data-tt^="mhconfok|"]'); await L.calme(c.p, 300);
    const ok = await ev(c, () => ({ conf:PAIE.confirmes.sm, bloc:(document.querySelector('#contenu .ok-bloc') || {}).innerText || '', pret:!!document.querySelector('.tt-pret'), toast:(document.getElementById('toast') || {}).innerText || '' }));
    v('B : « Confirmer quand même » confirme, le bloc devient « ✓ Tu as confirmé tes heures d\'octobre le 30/10 ou 31/10 » et le bouton disparaît', !!ok.conf && /Tu as confirmé tes heures d’octobre le \d\d\/\d\d/.test(net(ok.bloc)) && !ok.pret, ok);
    await ev(c, () => { PAIE.confirmes.sm = null; delete PAIE.confirmes.sm; const p = ptJour('sm', AUJ)[0]; p.fin = '10:30'; p.pause = 0; rendre(); }); await L.calme(c.p, 300);
    await clic(c, '[data-tt^="mhconf|"]'); const dir = await ev(c, () => ({ conf:!!PAIE.confirmes.sm, panneau:!!document.querySelector('#calque .panneau') }));
    v('B : sans journée ouverte, « Je confirme mes heures » confirme en UN geste (pas de fenêtre)', dir.conf && !dir.panneau, dir);
    await L.fin(c); }

  /* ── C. « Il y a une erreur » en 3 gestes (Heures, le lien, Envoyer) → la ligne « Demande » du gérant ── */
  { const c = await salarie('tl', 'iphone'); await ev(c, () => { delete PAIE.signales.tl; delete PAIE.confirmes.tl; rendre(); }); await L.calme(c.p, 250);
    const n0 = await ev(c, () => ttAReglerLignes().filter(o => o.lib === 'Demande' && o.k === 'tl').length);
    await clic(c, '[data-tt^="erreur|"]'); const f = await ev(c, () => ({ h2:(document.querySelector('#calque h2') || {}).textContent, jour:!!document.getElementById('ptx-sj'), grand:document.querySelectorAll('#calque .btn.large').length, titre:/Ce que j’ai vraiment fait/i.test(document.querySelector('#calque').innerText.replace(/[\u00a0\u202f]/g, ' ')), annuler:[...document.querySelectorAll('#calque button')].some(b => b.textContent === 'Annuler') }));
    v('C : le formulaire s\'appelle « Il y a une erreur », demande « Ce que j\'ai vraiment fait », UN grand bouton, plus de « Annuler »', f.h2 === 'Il y a une erreur' && f.jour && f.grand === 1 && f.titre && !f.annuler, f);
    await ev(c, () => { document.getElementById('ptx-sf').value = '17:40'; document.getElementById('ptx-st').value = 'J’ai oublié de pointer en partant chez le client'; });
    await clic(c, '[data-ptx^="sigok|"]'); await L.calme(c.p, 300);
    const ap = await ev(c, () => ({ sig:PAIE.signales.tl, lignes:ttAReglerLignes().filter(o => o.lib === 'Demande' && o.k === 'tl').length, bloc:(document.querySelector('#contenu .info') || {}).innerText || '' }));
    v('C : la demande est envoyée et arrive dans « À régler » du gérant (ligne « Demande »)', ap.sig && ap.sig.req && ap.sig.req.fin === '17:40' && ap.lignes === 1 && n0 === 0, ap);
    v('C : l\'écran dit « Ton message est parti au bureau le … On te préviendra quand c\'est corrigé. »', /Ton message est parti au bureau le \d\d\/\d\d\. On te préviendra quand c’est corrigé\./.test(net(ap.bloc)), ap.bloc);
    // depuis une journée : feuille → « Il y a une erreur » → le jour est déjà choisi
    await ev(c, () => { delete PAIE.signales.tl; rendre(); }); await clic(c, '[data-tt^="mhjour|tl|"]');
    const j = await ev(c, () => ({ h2:(document.querySelector('#calque h2') || {}).textContent, ligne:[...document.querySelectorAll('#calque .tt-ch')].map(e => e.innerText.replace(/\s+/g, ' ').trim()), btn:[...document.querySelectorAll('#calque .actions button')].map(b => b.textContent.trim()) }));
    v('C : la feuille d\'une journée — début, fin, pause, et UN seul bouton « Il y a une erreur »', j.ligne.length === 3 && j.btn.join('|') === 'Il y a une erreur', j);
    await clic(c, '#calque [data-tt^="erreur|"]'); const choisi = await ev(c, () => ({ d:document.getElementById('ptx-sj').value, deb:document.getElementById('ptx-sd').value }));
    v('C : le jour touché est DÉJÀ choisi dans le formulaire, avec ses heures', /^2026-10-\d\d$/.test(choisi.d) && !!choisi.deb, choisi);
    await L.fin(c); }

  /* ── D. la correction du bureau se lit dans la feuille de la journée (avant → après, par qui, pourquoi) ── */
  { const c = await salarie('sm', 'iphone'); await clic(c, '#contenu [data-tt="mhtout"]');
    const t = await ev(c, () => PT_TRACE.filter(x => x.qui === 'sm' && x.date.slice(0, 7) === PAIE_MOIS).map(x => x.date)); v('D : la population — Sophie a une correction dans le mois', t.length === 1, t);
    const mention = await ev(c, d => { const b = document.querySelector(`[data-tt="mhjour|sm|${d}"]`); return b ? b.innerText.replace(/\s+/g, ' ') : ''; }, t[0]);
    v('D : la liste dit « corrigée par le bureau » sur cette journée', /corrigée par le bureau/.test(mention), mention);
    await ev(c, d => { document.querySelector(`[data-tt="mhjour|sm|${d}"]`).click(); }, t[0]); await L.calme(c.p, 250);
    const f = net(await txt(c, '#calque'));
    v('D : la feuille montre « Corrigée par le bureau » : Début : ancienne → 07:30, par Marc, pourquoi', /Corrigée par le bureau/i.test(f) && /→ 07:30/.test(f) && /Marc/.test(f) && /Arrivée chez le client/.test(f), f.slice(0, 300));
    await L.fin(c); }

  /* ── E. mois fermé : plus de bouton de confirmation, plus de « Il y a une erreur » ── */
  { const c = await salarie('sm', 'iphone'); await ev(c, () => { delete PAIE.confirmes.sm; PAIE.verrou = { le:'31/10 · 10:40', par:'marc', emp:'ABCD1234' }; rendre(); }); await L.calme(c.p, 250);
    const e = await ev(c, () => ({ boutons:document.querySelectorAll('#contenu [data-tt^="mhconf|"], #contenu [data-tt^="erreur|"]').length, txt:document.getElementById('contenu').innerText.replace(/[\u00a0\u202f]/g, ' ') }));
    v('E : mois fermé sans confirmation — la phrase « Le mois est fermé : pour une erreur, parle au bureau, elle sera régularisée le mois prochain. », aucun bouton', e.boutons === 0 && /Le mois est fermé : pour une erreur, parle au bureau, elle sera régularisée le mois prochain\./.test(e.txt), e);
    await clic(c, '[data-tt^="mhjour|sm|"]'); const f = await ev(c, () => ({ btn:document.querySelectorAll('#calque [data-tt^="erreur|"]').length, txt:document.querySelector('#calque').innerText.replace(/[\u00a0\u202f]/g, ' ') }));
    v('E : la feuille d\'une journée du mois fermé n\'a plus « Il y a une erreur »', f.btn === 0 && /Le mois est fermé/.test(f.txt), f);
    await L.fin(c); }

  /* ── F. Mes fiches de paie : 3 gestes (Heures, l'onglet, la ligne) ── */
  { const c = await salarie('sm', 'iphone'); await clic(c, '[data-tt="mhonglet|fiches"]'); await L.calme(c.p, 250);
    const f = await ev(c, () => { const z = document.getElementById('contenu'); return { h:z.scrollHeight, txt:z.innerText.replace(/[\u00a0\u202f]/g, ' '), voir:[...z.querySelectorAll('[data-paie^="bulletin|"]')].map(b => b.getAttribute('aria-label')), onglet:[...z.querySelectorAll('.seg button')].filter(b => b.getAttribute('aria-pressed') === 'true').map(b => b.textContent.trim()) }; });
    v('F : l\'onglet « Mes fiches de paie » — octobre dit « Elle arrivera ici quand le bureau l\'aura validée. », septembre et août ont leur « Voir »', f.onglet[0] === 'Mes fiches de paie' && /Elle arrivera ici quand le bureau l’aura validée\./.test(f.txt) && f.voir.length === 2, f);
    v('F : aucun défilement — la page tient dans l\'écran (5 défilements avant)', f.h <= 844 + 120, f.h);
    await clic(c, '[data-paie^="bulletin|sm|sept"]'); await L.calme(c.p, 300); const b = await ev(c, () => { const z = document.getElementById('docplein'); return z ? z.innerText.replace(/\s+/g, ' ').slice(0, 200) : ''; }); v('F : « Voir » ouvre la fiche de paie de septembre (le document plein écran, paieBulletinVoir)', /Sophie Martin/.test(b) && /septembre/i.test(b), b);
    await L.fin(c); }

  /* ── G. « Ma journée de travail » : UNE seule fois, dans Ma journée ── */
  for (const qui of ['sm', 'tl', 'kb']) { const c = await salarie(qui, 'iphone', false, 'majournee');
    const n = await ev(c, () => [...document.querySelectorAll('#contenu .ptx-carte h3')].filter(h => h.textContent.trim() === 'Ma journée de travail').length); v('G : ' + qui + ' — « Ma journée de travail » apparaît UNE fois sur Ma journée', n === 1, n);
    await L.aller(c.p, 'mesheures'); const m = await ev(c, () => document.querySelectorAll('#contenu .ptx-carte').length); v('G : ' + qui + ' — et pas du tout sur Mes heures', m === 0, m); await L.fin(c); }

  /* ── H. les neuf appareils, jour ET nuit ── */
  for (const profil of PROFILS) for (const nuit of NUITS) { const c = await salarie('sm', profil, nuit), nom = profil + (nuit ? ' nuit' : ' jour');
    for (const onglet of ['mois', 'fiches']) { await ev(c, o => { TT.mh = o; rendre(); }, onglet); await L.calme(c.p, 350);
      const h = await ev(c, () => document.getElementById('contenu').scrollHeight), d = await L.deborde(c), t = await L.doigts(c.p, '#contenu'), pop = await ev(c, () => document.querySelectorAll('#contenu .tt-jr, #contenu .tt-fp').length);
      v(nom + ' · ' + onglet + ' : la population — la liste a des lignes', pop >= 2, pop);
      if (onglet === 'mois' && HMAX[profil]) v(nom + ' : la hauteur reste sous la cible (' + HMAX[profil] + ' px)', h <= HMAX[profil], h);
      v(nom + ' · ' + onglet + ' : aucun débordement latéral contre la largeur posée (' + c.largeur + ')', d.bouge === 0 && d.seconde <= c.largeur + 1, d);
      v(nom + ' · ' + onglet + (c.doigt ? ' : au doigt, aucune cible < 44 px, aucun champ < 16 px, aucun texte écrasé' : ' : aucun champ < 16 px, aucun texte écrasé'), (c.doigt ? t.petits.length === 0 : true) && t.champs.length === 0 && t.ecrases.length === 0, t);
      shots.push([onglet]); }
    await ev(c, () => { TT.mh = 'mois'; rendre(); }); await L.calme(c.p, 350);
    const t2 = await (async () => { await clic(c, '[data-tt^="mhjour|sm|"]'); return L.doigts(c.p, '#calque .panneau'); })(); v(nom + ' : la feuille d\'une journée — cibles et champs corrects', (c.doigt ? t2.petits.length === 0 : true) && t2.champs.length === 0, t2);
    await ev(c, () => fermerPanneau()); for (const o of ['mois', 'fiches']) if (!nuit || o === 'mois') { await ev(c, o => { TT.mh = o; rendre(); }, o); await L.calme(c.p, 400); await L.capture(c, CAP + 't6-' + profil + (nuit ? '-nuit-' : '-jour-') + o + '.png', true); }
    v(nom + ' : zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }

  /* ── I. valeurs longues ── */
  { const c = await salarie('sm', 'petit'); await ev(c, () => { H_GENS.sm.nom = 'Sophie Martin-Delacroix de la Châtaigneraie'; const p = ptJour('sm', jour(-1))[0] || ptJour('sm', jour(-2))[0]; p.note = 'Un chantier avec un nom de client beaucoup trop long pour tenir sur une seule ligne'; PT_TRACE.push({ pid:p.id, qui:'sm', date:p.date, champ:'fin', avant:'16:42', apres:'17:40', par:'marc', le:'31/10 · 10:12', motif:'Un motif interminable '.repeat(8) }); TT.mhTout = true; rendre(); });
    await L.calme(c.p, 300); const d = await L.deborde(c), t = await L.doigts(c.p, '#contenu'); v('I : valeurs longues sur 320 px — pas de débordement ni de texte écrasé (liste, kpis)', d.bouge === 0 && d.seconde <= 321 && t.ecrases.length === 0, { d, e:t.ecrases });
    await ev(c, () => { const p = PT_TRACE[PT_TRACE.length - 1]; ttMhJour('sm', p.date); }); await L.calme(c.p, 300); const d2 = await L.deborde(c), t2 = await L.doigts(c.p, '#calque .panneau');
    v('I : …et la feuille d\'une journée à la correction interminable', d2.bouge === 0 && d2.seconde <= 321 && t2.ecrases.length === 0, { d2, e:t2.ecrases }); await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
