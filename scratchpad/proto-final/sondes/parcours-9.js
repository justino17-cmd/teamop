// PARCOURS 9 — « une nouvelle personne » : le gérant invite Nadia Fournier (assistante, profil Secrétariat, pas de terrain) par l'Équipe → son mot de passe provisoire → il lui RETIRE la case « Voir »
// des Ventes (devis, contrats, factures) dans ses droits détaillés → il ouvre l'application COMME elle (la bande le dit) : le menu, la recherche « Aller à », la palette « Faire », l'adresse tapée à la main
// et l'écran d'ouverture suivent tous la même décision → il revient à son compte (17 novembre 2026).
// Chiffres : 13 comptes sur 14 places → 14 sur 14 après l'invitation (relus sur l'écran) ; Devis, Contrats, Factures, Encaissements quittent le menu (la table de FERME.ventes de droits-cases-voir.js).
// PROFIL=… NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const toast = c => S(c, () => { const t = document.getElementById('toast'); return t ? (t.innerText || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; });
const VENTES = ['devis', 'contrats', 'factures', 'encaissements'];
const menuDOM = c => S(c, () => [...document.querySelectorAll('#menu a[href^="#"]:not(.logo)')].filter(a => a.offsetParent !== null || getComputedStyle(a).display !== 'none').map(a => a.getAttribute('href').slice(1)));
(async () => {
  let c;
  await P.sec('parcours 9', async () => {
    c = await P.demarrer({ qui:'marc' }); const p = c.p;
    const e0 = await S(c, () => ({ n:EQUIPE.length, actifs:EQUIPE.filter(x => x.actif).length, places:EQ_PLACES, nadia:EQUIPE.some(x => /Nadia/.test(x.prenom)) }));
    v('0 population : l’Équipe compte ' + e0.actifs + ' comptes sur ' + e0.places + ' places, et Nadia n’y est pas', e0.actifs > 0 && e0.actifs < e0.places && !e0.nadia, e0);

    /* ── A. l'invitation ── */
    await L.aller(p, 'equipe'); v('A1 population : « Inviter une personne » existe dans l’Équipe', await clic(c, '[data-eq="inviter"]')); await p.waitForTimeout(500);
    const f0 = net(await txt(c, '#calque'));
    v('A2 (écran) la feuille dit le nombre de comptes (' + e0.actifs + ' sur ' + e0.places + '), que l’invitation part par e-mail et que le mot de passe provisoire se remet en main propre', f0.includes(e0.actifs + ' comptes sur ' + e0.places + ' places') && /invitation par e-mail/.test(f0) && /remets-le-lui en main propre/.test(f0), f0.slice(0, 500));
    await clic(c, '#calque [data-eq="inviterok"]'); await p.waitForTimeout(500);
    /* le refus se dit SOUS le champ (restes équipe, tour 2, 18 novembre : sur téléphone la bulle ne répète plus un message déjà lisible sous le doigt) — au bureau, c'est la bulle qui le dit en plus : on lit les deux endroits */
    const dit3 = net((await toast(c)) + ' ' + await S(c, () => (document.getElementById('eq-p-err') || {}).textContent || ''));
    v('A3 (écran) envoyer SANS rien écrire refuse en disant pourquoi — sous le champ ou en bulle — (aucun compte créé)', /Écris son prénom ET son nom/.test(dit3) && (await S(c, () => EQUIPE.length)) === e0.n, dit3);
    const err0 = await S(c, () => [...document.querySelectorAll('#calque .erreur')].filter(e => !e.hidden && e.textContent.trim()).length);
    await p.fill('#eq-p', 'Nadia'); await p.fill('#eq-n', 'Fournier'); await p.fill('#eq-m', 'nadia@climservices17.fr'); await p.fill('#eq-r', 'Assistante'); await p.waitForTimeout(300);
    await S(c, () => { document.getElementById('eq-prof').value = 'secr'; document.getElementById('eq-terrain').checked = false; });
    const err1 = await S(c, () => ({ msgs:[...document.querySelectorAll('#calque .erreur')].filter(e => !e.hidden && e.textContent.trim()).length, invalides:document.querySelectorAll('#calque [aria-invalid="true"]').length }));
    v('A3b (écran) un refus ne survit pas à la correction : ' + err0 + ' messages rouges après le refus, 0 une fois le prénom, le nom et l’e-mail retapés', err0 === 3 && err1.msgs === 0 && err1.invalides === 0, { err0, err1 });
    await cap(c, '9-A-inviter-' + P.PROFIL);
    await clic(c, '#calque [data-eq="inviterok"]'); await p.waitForTimeout(700);
    const pv = net(await txt(c, '#calque'));
    v('A4 (écran) le mot de passe provisoire de Nadia s’affiche une fois, valable 72 heures, « Il ne sera plus affiché »', /Mot de passe provisoire pour Nadia/.test(pv) && /Valable 72 heures/.test(pv) && /Il ne sera plus affiché/.test(pv), pv.slice(0, 400));
    await clic(c, '#calque [data-sec2="prov-ok"]'); await p.waitForTimeout(600);
    const k = await S(c, () => (EQUIPE.find(x => x.prenom === 'Nadia') || {}).k);
    const n1 = await S(c, k => { const x = eqDe(k); return { role:x.role, terrain:x.terrain, actif:x.actif, mail:x.mail, vente:x.droits.cats.ventes, compte:!!SECU.comptes[k], n:EQUIPE.filter(o => o.actif).length }; }, k);
    v('A5 (donnée) Nadia existe : « Assistante », pas de terrain, ses droits sont ceux du Secrétariat (Ventes ouvertes), un compte de sécurité avec son provisoire, ' + n1.n + ' comptes', !!k && n1.role === 'Assistante' && n1.terrain === false && n1.actif && n1.vente.v === 1 && n1.compte && n1.n === e0.actifs + 1, n1);
    await L.aller(p, 'equipe'); const eq = net(await txt(c, '#contenu'));
    v('A6 (écran) l’Équipe la montre : « Nadia Fournier », « Assistante », « Invité »', /Nadia Fournier Assistante Invité/.test(eq), eq.slice(0, 300));

    /* ── B. ses droits : plus de Ventes ── */
    await S(c, k => eqFiche(k), k); await p.waitForTimeout(500);
    const ph = net(await txt(c, '#calque'));
    const voit0 = (/Ce que Nadia voit : ([^]*?)\. Ce que Nadia ne voit pas/.exec(ph) || [])[1] || '', nvoit0 = (/Ce que Nadia ne voit pas : ([^]*?)\./.exec(ph) || [])[1] || '';
    v('B1 (écran) sa fiche dit qu’elle voit « Devis », « Contrats » et « Clients », et pas « Planning » ni « Équipe »', /Devis/.test(voit0) && /Contrats/.test(voit0) && /Clients/.test(voit0) && /Planning/.test(nvoit0) && /Équipe/.test(nvoit0), { voit0, nvoit0 });
    await S(c, () => { const d = document.querySelector('#calque .eqx-det'); if (d) d.open = true; });
    v('B2 population : la case « Ventes › Voir » est cochée', await S(c, k => { const b = document.querySelector('#calque [data-eqd="' + k + '|ventes|v"]'); return !!b && b.checked; }, k));
    await S(c, k => document.querySelector('#calque [data-eqd="' + k + '|ventes|v"]').scrollIntoView({ block:'center' }), k); await p.waitForTimeout(300);
    await cap(c, '9-B2-droits-' + P.PROFIL);
    /* la grille des droits existe en DEUX exemplaires (le tableau et une version téléphone) : on touche celle qui se VOIT, au point où elle est */
    /* au téléphone, chaque catégorie est une ligne qui se DÉPLIE (« Devis, factures, contrats, paiements · voir, créer, modifier ») : on la touche d'abord, comme la personne */
    const accord = await S(c, k => { const e = [...document.querySelectorAll('#calque [data-eqd="' + k + '|ventes|v"]')].find(x => x.closest('details.eq-dr-m') && x.closest('details.eq-dr-m').getBoundingClientRect().width > 0); if (!e) return null; const d = e.closest('details.eq-dr-m'); const P_ = d.closest('.panneau'), r = d.getBoundingClientRect(), pr = P_.getBoundingClientRect(); P_.scrollTop += r.top - pr.top - pr.height / 2; return { ouvert:d.open }; }, k);
    if (accord) { await p.waitForTimeout(300); const sm = await S(c, k => { const d = [...document.querySelectorAll('#calque [data-eqd="' + k + '|ventes|v"]')].map(x => x.closest('details.eq-dr-m')).find(Boolean); const r = d.querySelector('summary').getBoundingClientRect(); return { x:r.x + r.width / 2, y:r.y + r.height / 2 }; }, k); await p.touchscreen.tap(sm.x, sm.y); await p.waitForTimeout(400);
      v('B2a (écran) au téléphone la catégorie « Devis, factures, contrats, paiements » se déplie au toucher de sa ligne', await S(c, k => [...document.querySelectorAll('#calque [data-eqd="' + k + '|ventes|v"]')].map(x => x.closest('details.eq-dr-m')).find(Boolean).open, k), accord); }
    const pt = await S(c, k => { const e = [...document.querySelectorAll('#calque [data-eqd="' + k + '|ventes|v"]')].find(x => x.getBoundingClientRect().width > 0); if (!e) return null; const P_ = e.closest('.panneau'), r = e.getBoundingClientRect(), pr = P_.getBoundingClientRect(); P_.scrollTop += r.top - pr.top - pr.height / 2; return true; }, k);   /* le panneau défile, pas la page : on le défile de la distance qui sépare la case du milieu */
    await p.waitForTimeout(400);   /* la page défile en douceur : on mesure APRÈS, jamais pendant */
    const pt2 = await S(c, k => { const e = [...document.querySelectorAll('#calque [data-eqd="' + k + '|ventes|v"]')].find(x => x.getBoundingClientRect().width > 0); const r = e.getBoundingClientRect(); return { x:r.x + r.width / 2, y:r.y + r.height / 2, H:innerHeight }; }, k);
    v('B2b population : la case « Ventes › Voir » a un exemplaire visible, dans l’écran (' + (pt2 && Math.round(pt2.y)) + ' sur ' + (pt2 && pt2.H) + ' px)', !!pt && !!pt2 && pt2.y > 0 && pt2.y < pt2.H, pt2);
    if (c.doigt) await p.touchscreen.tap(pt2.x, pt2.y); else await p.mouse.click(pt2.x, pt2.y);
    await p.waitForTimeout(600);
    const d1 = await S(c, k => ({ cats:eqDe(k).droits.cats.ventes, texte:(document.querySelector('#calque') || {}).innerText.replace(/\s+/g, ' ') }), k);
    const voit1 = (/Ce que Nadia voit : ([^]*?)\. Ce que Nadia ne voit pas/.exec(d1.texte.replace(/[  ]/g, ' ')) || [])[1] || '', nvoit1 = (/Ce que Nadia ne voit pas : ([^]*?)\./.exec(d1.texte.replace(/[  ]/g, ' ')) || [])[1] || '';
    v('B3 (donnée) décocher « Voir » ferme aussi les trois autres gestes de Ventes (créer, modifier, supprimer) : { v:0, c:0, m:0, s:0 }', d1.cats.v === 0 && d1.cats.c === 0 && d1.cats.m === 0 && d1.cats.s === 0, d1.cats);
    v('B4 (écran) sa fiche le redit tout de suite : « Devis » et « Contrats » passent dans « ne voit pas », « Clients » reste dans « voit »', !/Devis/.test(voit1) && !/Contrats/.test(voit1) && /Devis/.test(nvoit1) && /Contrats/.test(nvoit1) && /Clients/.test(voit1), { voit1, nvoit1 });

    /* ── C. ouvrir l'application comme elle ── */
    await S(c, k => { document.querySelector('[data-cnx="comme|' + k + '"]').click(); }, k); await p.waitForTimeout(1200);
    const e1 = await S(c, () => ({ session:SESSION, role:ROLE, bande:(document.querySelector('.sec-bande') || {}).innerText || '', lignes:rlLignes().map(x => x.k), ouv:rlOuverture(), route:route }));
    v('C1 (écran) la bande permanente dit « Tu vois l’application comme Nadia. » avec « Revenir à mon compte »', e1.session === k && /Tu vois l’application comme\s*Nadia/.test(e1.bande.replace(/\s+/g, ' ')) && /Revenir à mon compte/.test(e1.bande), e1.bande);
    const dom = await menuDOM(c);
    v('C2 (donnée = écran) le menu de Nadia : ' + e1.lignes.length + ' lignes, AUCUNE de Ventes (devis, contrats, factures, encaissements), et le menu à l’écran montre les mêmes', e1.lignes.length >= 6 && VENTES.every(x => !e1.lignes.includes(x)) && ['clients', 'stock', 'achats'].every(x => e1.lignes.includes(x)) && JSON.stringify(dom.filter(x => e1.lignes.includes(x))) === JSON.stringify(e1.lignes.filter(x => dom.includes(x))), { lignes:e1.lignes, dom });
    const ec = net(await txt(c, '#contenu'));
    v('C3 (écran) l’application s’ouvre sur un écran du bureau (« ' + e1.ouv + ' »), pas sur « Ma journée » : elle n’est pas de terrain', e1.ouv !== 'majournee' && !/Ma journée/.test(ec.slice(0, 80)) && e1.role !== 'technicien', { ouv:e1.ouv, route:e1.route, role:e1.role });
    await cap(c, '9-C3-ouverture-' + P.PROFIL);
    const hasPal = await S(c, () => rcBureau());
    if (hasPal) {
      await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
      const ouv = await S(c, () => !!document.getElementById('pal-q')); if (!ouv) await S(c, () => palOuvrir());
      await p.fill('#pal-q', 'devis'); await p.waitForTimeout(500);
      const pal = net(await txt(c, '#pal-l'));
      v('C4 (écran) la recherche « devis » ne trouve ni la rubrique Devis ni « Nouveau devis » (« Rien ne correspond à « devis » ») ', /Rien ne correspond à « devis »/.test(pal), pal.slice(0, 300));
      await p.fill('#pal-q', 'client'); await p.waitForTimeout(400);
      const pal2 = net(await txt(c, '#pal-l'));
      v('C5 (écran) la recherche « client » trouve encore la rubrique Clients (la case Clients est ouverte)', /Clients/.test(pal2), pal2.slice(0, 200));
      await cap(c, '9-C5-recherche-' + P.PROFIL);
      await S(c, () => palFermer(true));
    } else v('C4-5 population : la recherche « Aller à » est celle du bureau ; sur ce profil, le menu est la porte', true, 'téléphone / tablette');
    await S(c, () => { location.hash = '#devis'; }); await p.waitForTimeout(600);
    const t1 = await toast(c), h1 = await S(c, () => location.hash.slice(1));
    v('C6 (écran) l’adresse #devis tapée à la main est refusée et DIT pourquoi : « Cette rubrique est fermée à ton compte : demande à l’administrateur de la rouvrir »', /Cette rubrique est fermée à ton compte : demande à l’administrateur de la rouvrir/.test(t1) && h1 !== 'devis', { t1, h1 });
    await S(c, () => { location.hash = '#factures'; }); await p.waitForTimeout(500);
    v('C7 (écran) et #factures, qui dépend aussi de Ventes, est refusée de même', /fermée à ton compte/.test(await toast(c)) && (await S(c, () => location.hash.slice(1))) !== 'factures', await toast(c));
    await L.aller(p, 'clients'); const cl = net(await txt(c, '#contenu'));
    v('C8 (écran) Clients s’ouvre (« Clients › Voir » est resté coché) et ne propose plus « ＋ Nouveau devis » nulle part', /Clients/.test(cl.slice(0, 120)) && !/Nouveau devis/.test(cl), cl.slice(0, 250));
    await L.aller(p, 'comptabilite'); await p.waitForTimeout(500); const cp = net(await txt(c, '#contenu'));
    const cpR = await S(c, () => ({ ventes:!!document.querySelector('[data-cx="grp|ventes"]'), fventes:!!document.querySelector('[data-cx="sec|fventes"]'), grp:[...document.querySelectorAll('[data-cx^="grp|"]')].map(b => b.dataset.cx.split('|')[1]) }));
    v('C9 (observation, à dire à Justin) la Comptabilité de Nadia s’ouvre par SA case (« Comptabilité › Voir ») et montre l’onglet « Ventes » (le grand livre des factures) alors que « Ventes › Voir » est décochée : la case Ventes ferme les ÉCRANS Devis, Contrats, Factures, pas le livre de comptes', cpR.ventes && !cpR.fventes && /Comptabilité/.test(cp.slice(0, 60)), cpR);
    await cap(c, '9-C9-compta-' + P.PROFIL);
    await cap(c, '9-C8-clients-' + P.PROFIL);

    /* ── D. revenir ── */
    await clic(c, '.sec-bande-b'); await p.waitForTimeout(800);
    const e2 = await S(c, () => ({ session:SESSION, bande:!!document.querySelector('.sec-bande'), lignes:rlLignes().map(x => x.k) }));
    v('D1 (écran) « Revenir à mon compte » : la bande disparaît, le gérant retrouve tout son menu (Devis, Factures…) et l’Équipe', e2.session === 'marc' && !e2.bande && ['devis', 'contrats'].every(x => e2.lignes.includes(x)), e2);
    const j = net(await S(c, () => (document.getElementById('contenu') || {}).innerText || ''));
    const jh = await S(c, () => JOURNAL.filter(x => /ouvert l’application comme/.test(x.a || x.act || x.quoi || JSON.stringify(x))).length);
    v('D2 (donnée) le journal de l’entreprise garde la trace de ce geste (« a ouvert l’application comme »)', jh >= 1, jh);
    v('E aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
