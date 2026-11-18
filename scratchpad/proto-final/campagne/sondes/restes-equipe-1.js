// RESTES « équipe », tour 1 (18 novembre 2026) : rejoue les trois casses mineures du recontrôle adverse.
//  A. un refus de saisie ne s'affiche qu'UNE fois (sous le champ) : le toast ne recouvre pas la phrase écrite sous le champ ;
//  B. la fiche d'un compte DÉSACTIVÉ ne propose pas les deux gestes de mot de passe ;
//  C. le refus du nom tient en une phrase courte (pas sept lignes dans une demi-colonne) ;
//  D. (doutes) la fiche de SOI ne se parle pas à la troisième personne ; le bandeau « verrouillé » dit quoi faire ; l'horloge du « valable 72 heures ».
// ⛔ 127.0.0.1 seulement. usage : node restes-equipe-1.js [mac|iphone|ipad|android|petit] [nuit]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac', NUIT = process.argv[3] === 'nuit', SUF = `${PROFIL}-${NUIT ? 'nuit' : 'jour'}`;
const jouer = async (nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 240)); } };
const err = (p, id) => p.evaluate(id => { const e = document.getElementById(id + '-err'); return e && !e.hidden ? e.textContent.trim() : ''; }, id);
// le toast recouvre-t-il (même en partie) une phrase d'erreur visible ?
const recouvre = p => p.evaluate(() => { const t = document.getElementById('toast'); if (!t || !t.classList.contains('on')) return { toast:false }; const r = t.getBoundingClientRect();
  const sur = [...document.querySelectorAll('#calque .erreur')].filter(e => !e.hidden && e.textContent.trim()).filter(e => { const q = e.getBoundingClientRect(); return q.height > 0 && q.bottom > r.top && q.top < r.bottom && q.right > r.left && q.left < r.right && q.bottom > 0 && q.top < innerHeight; }).map(e => e.id);
  return { toast:true, texte:t.textContent.trim().slice(0, 80), recouvre:sur }; });
(async () => {
  const c = await E.marc(PROFIL, NUIT), p = c.p;
  await jouer('A inviter', async () => {
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 300);
    await p.fill('#eq-p', ''); await p.fill('#eq-n', 'Dur<b>and'); await p.fill('#eq-m', 'quelquun@sansPoint');
    await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400);
    const e = { p:await err(p, 'eq-p'), n:await err(p, 'eq-n'), m:await err(p, 'eq-m') };
    v('A population : les trois champs fautifs portent chacun leur phrase', e.p.length > 8 && e.n.length > 8 && e.m.length > 8, e);
    const r = await recouvre(p);
    v('A (casse 1) le toast ne recouvre aucune des phrases écrites sous les champs', r.recouvre === undefined || r.recouvre.length === 0, r);
    v('A (casse 3) le refus du nom tient en 90 signes au plus', e.n.length <= 90, e.n.length + ' : ' + e.n);
    const h = await p.evaluate(() => { const a = document.getElementById('eq-n-err').getBoundingClientRect(); return { n:Math.round(a.height), largeur:Math.round(a.width) }; });
    v('A (casse 3) la phrase du nom prend trois lignes au plus (≈ 70 px)', h.n <= 70, h);
    await L.capture(c, E.CAP + `restes-inviter-erreurs-${SUF}.png`);
    await E.ranger(c);
  });
  await jouer('A habilitation', async () => {
    await E.fiche(c, 'tl'); await L.toucher(c, '[data-eq="habajout|tl"]'); await L.calme(p, 300);
    await p.fill('#eq-hn', 'Formation levage'); await L.calme(p, 200);
    const sans = await p.evaluate(() => document.getElementById('eqx-hs').checked); if (sans) await p.locator('#eqx-hs').uncheck();
    await p.fill('#eqx-hd', '2026-06-01'); await p.fill('#eqx-hn', '2026-05-01');
    await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 400);
    const e2 = await err(p, 'eqx-hn'); v('A population : la phrase « fin avant obtention » est écrite sous la date', e2.length > 15, e2);
    const r = await recouvre(p);
    v('A (casse 1) le toast ne recouvre pas la phrase sous la date, ni le libellé « Joindre l\'attestation »', r.recouvre === undefined || r.recouvre.length === 0, r);
    // le toast recouvre-t-il le libellé du fichier ?
    const lib = await p.evaluate(() => { const t = document.getElementById('toast'); if (!t || !t.classList.contains('on')) return 'sans toast'; const r = t.getBoundingClientRect();
      const l = [...document.querySelectorAll('#calque label, #calque .btn')].filter(x => /attestation/i.test(x.textContent)); return l.filter(x => { const q = x.getBoundingClientRect(); return q.height > 0 && q.bottom > r.top && q.top < r.bottom; }).map(x => x.textContent.trim().slice(0, 30)); });
    v('A (casse 1) le toast ne cache pas « Joindre l\'attestation »', lib === 'sans toast' || lib.length === 0, lib);
    await L.capture(c, E.CAP + `restes-habilitation-${SUF}.png`);
    await E.ranger(c);
  });
  await jouer('B désactivé', async () => {
    // on désactive Tom par le geste de l'écran (fiche › Désactiver le compte ; s'il lui reste du travail, le panneau « Avant de désactiver » demande de confirmer)
    await E.fiche(c, 'tl'); await L.toucher(c, '[data-eq="desact|tl"]'); await L.calme(p, 400);
    for (const sel of ['[data-eqx^="desactok"]']) { if (await p.locator(sel).count()) { await L.toucher(c, sel); await L.calme(p, 400); break; } }
    const off = await p.evaluate(() => eqDe('tl') && eqDe('tl').actif === false);
    v('B population : Tom est désactivé (par le geste)', off, await E.texte(p, '#calque'));
    if (!off) return;
    await E.ranger(c); await E.fiche(c, 'tl'); await L.calme(p, 300);
    const t = await E.texte(p, '#calque');
    const gestes = await p.evaluate(() => ({ repose:!!document.querySelector('#calque [data-cnx^="repose"]'), lien:!!document.querySelector('#calque [data-eq^="mdp"]') }));
    v('B (casse 2) la fiche d\'un compte désactivé ne propose NI « mot de passe provisoire » NI « lien pour choisir le sien » (boutons)', !gestes.repose && !gestes.lien, gestes);
    v('B (casse 2) elle propose de le réactiver, et dit pourquoi pas de mot de passe', /Réactiver le compte/i.test(t) && /réactive d’abord son compte/i.test(t), t.slice(0, 300));
    await p.evaluate(() => { const e = document.querySelector('#calque .cn-acces'); if (e) e.scrollIntoView({ block:'center' }); }); await L.calme(p, 400);
    await L.capture(c, E.CAP + `restes-desactive-${SUF}.png`);
    await E.ranger(c);
    // contre-épreuve : un compte actif garde ses deux gestes
    await E.fiche(c, 'kb'); await L.calme(p, 300);
    const g2 = await p.evaluate(() => ({ repose:!!document.querySelector('#calque [data-cnx^="repose"]'), lien:!!document.querySelector('#calque [data-eq^="mdp"]') }));
    v('B contre-épreuve : un compte actif garde ses deux gestes', g2.repose && g2.lien, g2);
    await E.ranger(c);
  });
  await jouer('D doutes', async () => {
    // fiche de SOI : première personne
    await E.fiche(c, 'marc'); const tm = await E.texte(p, '#calque');
    v('D (doute 3) sur sa PROPRE fiche, le gérant lit « M’envoyer un lien… » et « Tu reçois un e-mail », jamais « Marc reçoit »', /M’envoyer un lien pour choisir un nouveau mot de passe/.test(tm) && /Tu reçois un e-mail/.test(tm) && !/Marc reçoit/.test(tm), tm.slice(0, 400));
    await p.evaluate(() => { const e = document.querySelector('#calque .cn-acces'); if (e) e.scrollIntoView({ block:'center' }); }); await L.calme(p, 400);
    await L.capture(c, E.CAP + `restes-soi-${SUF}.png`);
    await E.ranger(c);
    // « le mot de passe provisoire vaut 72 heures » : la date se calcule sur l'horloge du prototype (31/10), pas sur celle de la machine
    await E.fiche(c, 'kb'); await L.toucher(c, '[data-cnx="repose|kb"]'); await L.calme(p, 500);
    const tp = await E.texte(p, '#calque'), m = tp.match(/jusqu’au (\d\d)\/(\d\d) à (\d\d:\d\d)/);
    v('D (doute 1) « Valable 72 heures » : la date est celle du prototype (31/10 + 3 jours = 03/11)', !!m && m[1] === '03' && m[2] === '11', tp.slice(0, 400));
    await E.ranger(c);
    // le filtre « Invités » vide dit quoi faire
    await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiltre = 'invites'; rendre(); }); await L.calme(p, 300);
    const inv = await p.evaluate(() => document.querySelectorAll('#contenu .eq-grille > .eq-c').length), tv = await E.texte(p, '#contenu');
    if (!inv) v('D (doute 2) « Invités » vide : la phrase dit quoi faire (inviter)', /Aucune invitation en attente/.test(tv) && /Inviter une personne/.test(tv), tv.slice(0, 300));
    else v('D (doute 2) population : le filtre « Invités » est vide au départ', false, inv);
    await p.evaluate(() => { eqFiltre = 'off'; rendre(); }); await L.calme(p, 300);
    const tv2 = await E.texte(p, '#contenu'); const off2 = await p.evaluate(() => document.querySelectorAll('#contenu .eq-grille > .eq-c').length);
    v('D (doute 2) « Désactivés » : ' + (off2 ? 'des cartes' : 'phrase'), off2 > 0 || /Aucun compte désactivé/.test(tv2), tv2.slice(0, 200));
    await p.evaluate(() => { eqFiltre = 'tous'; rendre(); });
  });
  await E.fin();
})();
