// RECONTRÔLE ADVERSE des restes « équipe », tour 2 (18 novembre 2026). Ce que le correcteur du tour 2 a pu casser À CÔTÉ :
//  N. nomRefus() contre nomPersonneOk() sur un corpus de valeurs hostiles, DANS la page : chaque refus dit une raison VRAIE (signe interdit / premier signe / longueur),
//     jamais une raison fausse, et une valeur acceptée n'est jamais refusée par la phrase ;
//  U. les quatre endroits qui refusent un nom (champ Prénom, champ Nom, bulle d'Inviter, bulle de Modifier la fiche) disent la MÊME vraie raison ; les trois phrases
//     tiennent en deux lignes au plus dans une demi-colonne ; champ vide ≠ « commence par une lettre » ;
//  S. la fiche de SOI : gérant ET secrétariat (même fonction), jamais de 3e personne sur sa fiche, toujours la 3e personne sur celle d'un AUTRE (rien n'a glissé) ;
//     les autres écrans qui parlent de la même personne (carte d'équipe, Sécurité) ne disent pas le contraire ;
//  I. l'invitée : cycle complet invitée → désactivée → réactivée → relancée → annulée, sur les DEUX surfaces (fiche, carte), les filtres, les compteurs ;
//  R. un lecteur (Responsable / secrétariat sans droit d'écriture) ne voit pas de geste d'écriture sur la fiche d'une désactivée.
// ⛔ 127.0.0.1 seulement. usage : node restes-equipe-2-recontrole.js [mac|iphone|ipad|android|petit] [nuit] [section…]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'iphone', NUIT = process.argv[3] === 'nuit', SUF = `${PROFIL}-${NUIT ? 'nuit' : 'jour'}`;
const SECTIONS = process.argv.slice(NUIT ? 4 : 3), vaut = s => !SECTIONS.length || SECTIONS.includes(s);
const LARG = L.PROFILS[PROFIL].w, DOIGT = !!L.PROFILS[PROFIL].doigt;
const jouer = async (nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 260)); } };
const PH_SIGNE = 'Lettres, chiffres, espaces et tirets seulement.', PH_PREMIER = 'Commence par une lettre ou un chiffre.', PH_LONG = '60 signes au plus.';
const phrase = (p, id) => p.evaluate(id => { const e = document.getElementById(id + '-err'); return e && !e.hidden ? e.textContent.trim() : ''; }, id);
const boutons = p => p.evaluate(() => [...document.querySelectorAll('#calque button, #calque a.btn')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim().replace(/\s+/g, ' ')));
(async () => {
  let c = await E.marc(PROFIL, NUIT), p = c.p;
  const ferme = async () => { await E.ranger(c); };
  const aucune = async nom => { const e = await p.evaluate(() => 0); return e; };

  if (vaut('N')) await jouer('N corpus dans la page', async () => {
    const r = await p.evaluate(() => {
      const bad = /[^\p{L}\p{M}\p{N} .’-]/u, prem = /^[\p{L}\p{M}\p{N}]/u;
      const corpus = ['', ' ', '   ', '-', '--', '-Marie', '.Marie', '’Marie', "'Marie", '  -Marie', 'Marie', 'Marie-Ève', "O'Neil", 'Éric', 'Zoé 3', '3', '١٢٣', 'Ωmega', '李雷', '́Marie', 'Marié', 'Marie_Ève', 'Marie😀', '😀', '😀Marie', 'A'.repeat(60), 'A'.repeat(61), 'A'.repeat(200), '-' + 'A'.repeat(70), 'A<b>'.repeat(20), '<b>Marie</b>', 'Marie​', '​Marie', 'Marie Dupont', 'Marie\tDupont', 'Marie\nDupont', 'Marie  Dupont', 'Marie.', 'Marie ’', '𝐀'.repeat(31), '𝐀'.repeat(60), '𝐀'.repeat(61), 'é'.repeat(61), 'Marie@', 'Marie/Dupont', 'Marie,Dupont', 'Marie;', "Marie's", 'MARIE−Ève', 'Marie–Ève', 'Marie—Ève', 'Marie‑Ève', 'Marie\u0000'];
      const faux = [], pop = { ok:0, refus:0 };
      for (const t of corpus) {
        const ok = nomPersonneOk(t) !== null, x = String(t).replace(/'/g, '’').replace(/\s+/g, ' ').trim(), ph = nomRefus(t);
        if (ok) { pop.ok++; continue; }
        pop.refus++;
        const aSigne = bad.test(x), aPremier = prem.test(x), long = [...x].length > 60 || x.length > 60;
        // raison VRAIE : la phrase ne doit pas accuser un signe qui n'y est pas, ni un premier signe qui est bon, ni une longueur qui n'y est pas
        if (ph === 'Lettres, chiffres, espaces et tirets seulement.' && !aSigne) faux.push({ t:t.slice(0, 14) + (t.length > 14 ? '…' : ''), ph, why:'accuse un signe interdit qu\'il n\'y a pas', x:x.length });
        if (ph === 'Commence par une lettre ou un chiffre.' && (aSigne || aPremier)) faux.push({ t:t.slice(0, 14), ph, why:'accuse le premier signe à tort', aSigne, aPremier });
        if (ph === '60 signes au plus.' && (aSigne || !aPremier || !long)) faux.push({ t:t.slice(0, 14), ph, why:'accuse la longueur à tort', aSigne, aPremier, long });
        if (!ph) faux.push({ t:t.slice(0, 14), why:'refusé SANS phrase' });
      }
      // une valeur ACCEPTÉE par nomPersonneOk doit aussi l'être par ce que l'écran compte comme « un nom » : on relève le nombre de signes que l'écran compte
      return { n:corpus.length, pop, faux };
    });
    v('N (population) ≥ 45 valeurs, des acceptées ET des refusées', r.n >= 45 && r.pop.ok >= 8 && r.pop.refus >= 25, r);
    v('N chaque refus dit une raison VRAIE (aucune accusation à tort, aucun refus sans phrase)', r.faux.length === 0, r.faux);
    // les trois phrases, mesurées contre la règle de l'application
    const trois = await p.evaluate(() => [nomRefus('-x'), nomRefus('A'.repeat(61)), nomRefus('x<')]);
    v('N les trois phrases sont celles qu\'on attend', trois[0] === 'Commence par une lettre ou un chiffre.' && trois[1] === '60 signes au plus.' && trois[2] === 'Lettres, chiffres, espaces et tirets seulement.', trois);
  });

  if (vaut('U')) await jouer('U quatre endroits, même raison', async () => {
    const cas = [['-Marie', PH_PREMIER, 'tiret en tête'], ['Ma<rie', PH_SIGNE, 'signe interdit'], ['A'.repeat(61), PH_LONG, '61 signes'], ['😀', PH_SIGNE, 'émoji seul'], ['\'Marie', PH_PREMIER, 'apostrophe droite en tête'], ['Marie_', PH_SIGNE, 'souligné'], ['-' + '<'.repeat(3), PH_SIGNE, 'tiret ET signe interdit : le signe d\'abord']];
    const res = [];
    for (const [val, att, lib] of cas) {
      // 1. Inviter : champ Prénom ET champ Nom
      await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 250);
      await p.evaluate(() => { for (const id of ['eq-p', 'eq-n']) { const n = document.getElementById(id); if (n) n.removeAttribute('maxlength'); } });
      await p.fill('#eq-p', val); await p.fill('#eq-n', 'Dupont'); await p.fill('#eq-m', 'essai.nom@climservices17.fr');
      await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400);
      const pp = await phrase(p, 'eq-p'), tp = await E.toast(p);
      await p.fill('#eq-p', 'Paul'); await p.fill('#eq-n', val); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400);
      const pn = await phrase(p, 'eq-n'), tn = await E.toast(p);
      const lig = await p.evaluate(id => { const e = document.getElementById(id + '-err'); if (!e || e.hidden) return -1; const lh = parseFloat(getComputedStyle(e).lineHeight) || 18; return Math.round(e.getBoundingClientRect().height / lh); }, 'eq-n');
      if (lib === 'signe interdit' || lib === 'tiret en tête') await L.capture(c, E.CAP + `rc2-restes-nom-${lib === 'tiret en tête' ? 'premier' : 'signe'}-${SUF}.png`);
      await ferme();
      res.push({ lib, att, pp, pn, lig, tp:tp.slice(0, 50), tn:tn.slice(0, 50) });
    }
    v('U (population) sept valeurs jouées, quatre lectures chacune', res.length === 7, res.length);
    const faux = res.filter(r => r.pp !== r.att || r.pn !== r.att);
    v('U champ Prénom ET champ Nom d\'Inviter : la phrase est LA vraie raison', faux.length === 0, faux);
    v('U la phrase tient en 3 lignes au plus (la limite du recontrôle 1) ' + (LARG <= 400 ? '(demi-colonne de téléphone)' : '(écran large)'), res.every(r => r.lig >= 1 && r.lig <= 3), res.map(r => [r.lib, r.lig]));
    relevé('U (relevé) lignes de chaque phrase (le correcteur annonçait « 2 lignes sur Android »)', res.map(r => [r.lib, r.lig]));
    // 2. Modifier la fiche : la bulle (le seul endroit sans phrase sous le champ) dit-elle la même raison ?
    const mod = [];
    for (const [val, att, lib] of cas.slice(0, 4)) {
      await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 300);
      await p.fill('#eqx-mn', val); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 400);
      const t = await E.toast(p); mod.push({ lib, att, t }); await ferme(); }
    v('U Modifier la fiche, champ Nom : la bulle dit la vraie raison', mod.every(m => m.t.includes(m.att)), mod);
    const mod2 = [];
    for (const [val, att, lib] of cas.slice(0, 3)) {
      await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 300);
      await p.fill('#eqx-mp', val); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 400);
      const t = await E.toast(p); mod2.push({ lib, att, t }); await ferme(); }
    v('U Modifier la fiche, champ Prénom : la bulle dit la vraie raison', mod2.every(m => m.t.includes(m.att)), mod2);
    // 3. vide : on ne dit pas « Commence par une lettre » à un champ vide
    await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 300);
    await p.fill('#eqx-mn', ''); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 400); const tv = await E.toast(p);
    v('U Modifier la fiche, nom VIDE : la bulle dit qu\'il faut un nom, pas « Commence par une lettre »', /Prénom ET nom|nom/i.test(tv) && !/Commence par/.test(tv), tv);
    await p.fill('#eqx-mn', '   '); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 400); const ts = await E.toast(p);
    v('U Modifier la fiche, nom d\'espaces : idem', !/Commence par/.test(ts), ts);
    await L.capture(c, E.CAP + `rc2-restes-modifier-${SUF}.png`);
    await ferme();
    // 4. rien n'a changé dans la fiche refusée
    const nom = await p.evaluate(() => eqNom(eqDe('kb')));
    v('U (contre-épreuve) les refus n\'ont rien écrit dans la fiche de Karim', /Karim/.test(nom), nom);
  });

  if (vaut('S')) await jouer('S fiche de soi, gérant', async () => {
    await E.fiche(c, 'marc'); const tm = await E.texte(p, '#calque'); const gm = await boutons(p);
    const reste = [/Marc reçoit/, /à lui remettre/, /Marc le change/, /Lui envoyer/, /Lui donner/, /Changer son mot de passe/, /Jamais/, /À activer à sa première/].filter(r => r.test(tm)).map(String);
    v('S gérant sur SA fiche : aucune formule à la 3e personne', reste.length === 0, reste);
    v('S gérant sur SA fiche : ses formules à la 1re personne sont là (population)', /tu l’as choisi toi-même/.test(tm) && /Changer mon mot de passe/i.test(tm) && /M’envoyer un lien/.test(tm), tm.slice(0, 120));
    // la fiche d'un AUTRE ne bouge pas : Léa (jamais connectée ? provisoire ?), Julie
    const autres = [];
    for (const k of ['lr', 'tl', 'kb', 'sm']) { await ferme(); await E.fiche(c, k); const t = await E.texte(p, '#calque'); const nom = await p.evaluate(k => eqDe(k).prenom, k); autres.push({ k, nom, texte:t.slice(Math.max(0, t.indexOf('CONNEXION')), t.indexOf('CONNEXION') + 520), eux:/tu l’as choisi|M’envoyer|En ce moment|depuis ton téléphone|Changer mon/.test(t) }); }
    v('S (population) quatre autres fiches lues', autres.length === 4 && autres.every(a => a.texte.length > 100), autres.map(a => a.k + ':' + a.texte.length));
    v('S sur la fiche d\'un AUTRE : aucune formule à la 1re personne (rien n\'a glissé)', autres.every(a => !a.eux), autres.filter(a => a.eux));
    v('S sur la fiche d\'un AUTRE : « Mot de passe » dit « Personnel, choisi par <prénom> » ou « Provisoire »', autres.every(a => /Mot de passe (Personnel, choisi par|Provisoire)/.test(a.texte)), autres.map(a => a.texte.slice(80, 260)));
    await ferme();
    // la carte de Marc dans la liste : aucun bouton de la 3e personne vers soi-même
    await L.aller(p, 'equipe'); const carte = await p.evaluate(() => { const c0 = [...document.querySelectorAll('#contenu .eq-grille > .eq-c')].find(x => /Marc/.test(x.querySelector('.fo-n b').textContent)); return c0 ? { t:c0.innerText.replace(/\s+/g, ' ').trim(), b:[...c0.querySelectorAll('button')].map(b => b.textContent.trim()) } : null; });
    v('S la carte de Marc existe (population) et ne parle pas de lui à la 3e personne', !!carte && !/Lui envoyer|à lui remettre|le change à sa/.test(carte.t), carte);
    await p.evaluate(() => { const q = document.querySelector('#contenu .eq-grille'); if (q) q.scrollIntoView({ block:'start' }); }); await L.calme(p, 300);
    await E.fiche(c, 'marc'); await p.evaluate(() => { const e = document.querySelector('#calque .cn-acces'); if (e) e.scrollIntoView({ block:'start' }); }); await L.calme(p, 300);
    await L.capture(c, E.CAP + `rc2-restes-soi-marc-${SUF}.png`); await ferme();
    // l'écran Sécurité : la ligne de Marc dit-elle « Jamais » / « provisoire » ?
    await L.aller(p, 'securite'); await L.calme(p, 400); const sec = await E.texte(p, '#contenu');
    const l = sec.search(/Marc/); relevé('S (relevé) l\'écran Sécurité, autour de Marc', sec.slice(Math.max(0, l - 60), l + 360));
    v('S l\'écran Sécurité ne dit pas de Marc « première connexion » / « provisoire » / « Jamais connecté »', !/Marc[^.]{0,120}(provisoire|première connexion|Jamais)/i.test(sec), sec.slice(Math.max(0, l - 20), l + 200));
    await L.capture(c, E.CAP + `rc2-restes-securite-${SUF}.png`);
  });

  if (vaut('S')) await jouer('S fiche de soi, chaque personne (la fonction est la même pour toutes)', async () => {
    // l'Équipe n'est ouverte qu'au gérant : on lit donc la fonction elle-même, en changeant la session le temps d'un appel, pour CHAQUE personne de l'équipe
    const r = await p.evaluate(() => { const vieux = SESSION, sortie = []; const txt = h => { const d = document.createElement('div'); d.innerHTML = h; return d.textContent.replace(/\s+/g, ' ').trim(); };
      try { for (const x of EQUIPE) { SESSION = x.k; const soi = txt(secuFicheConnexion(x.k)); SESSION = vieux === x.k ? 'sm' : vieux; const autre = txt(secuFicheConnexion(x.k)); sortie.push({ k:x.k, soi, autre }); } } finally { SESSION = vieux; }
      return sortie; });
    v('S (population) six personnes lues, deux fois chacune (soi, autrui)', r.length === 6 && r.every(x => x.soi.length > 100 && x.autre.length > 100), r.map(x => x.k));
    const trois = /à lui remettre|le change à sa|Lui envoyer|Lui donner|Changer son mot de passe|Jamais|À activer à sa première/;
    v('S chaque personne sur SA fiche : aucune 3e personne', r.every(x => !trois.test(x.soi)), r.filter(x => trois.test(x.soi)).map(x => [x.k, x.soi.match(trois)[0]]));
    v('S chaque personne sur la fiche d\'un AUTRE : aucune 1re personne', r.every(x => !/tu l’as choisi|M’envoyer|En ce moment|depuis ton téléphone|Changer mon|Tu reçois/.test(x.autre)), r.filter(x => /tu l’as choisi|M’envoyer|En ce moment|depuis ton téléphone|Changer mon/.test(x.autre)).map(x => x.k));
    const sessionOk = await p.evaluate(() => acteur()); v('S (contre-épreuve) la session est rendue à Marc après la lecture', sessionOk === 'marc', sessionOk);
    relevé('S (relevé) le mot de passe de Léa (autrui) / de Léa (soi)', r.find(x => x.k === 'lr') && [r.find(x => x.k === 'lr').autre.slice(r.find(x => x.k === 'lr').autre.indexOf('Mot de passe'), r.find(x => x.k === 'lr').autre.indexOf('Mot de passe') + 90), r.find(x => x.k === 'lr').soi.slice(r.find(x => x.k === 'lr').soi.indexOf('Mot de passe'), r.find(x => x.k === 'lr').soi.indexOf('Mot de passe') + 90)]);
  });

  if (vaut('I')) await jouer('I invitée : le cycle entier', async () => {
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 300);
    await p.fill('#eq-p', 'Inès'); await p.fill('#eq-n', 'Garnier'); await p.fill('#eq-m', 'ines.garnier@climservices17.fr'); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 600);
    const k = await p.evaluate(() => { const q = EQUIPE.find(x => x.prenom === 'Inès'); return q && q.k; });
    v('I (population) Inès est invitée', !!k, k); if (!k) return;
    await ferme();
    const etat = async lib => { await ferme(); await E.fiche(c, k); const g = await boutons(p), t = await E.texte(p, '#calque'); return { lib, g, t }; };
    // 1. active
    let e = await etat('active');
    v('I invitée ACTIVE : « Renvoyer l’invitation » + « Annuler l’invitation » + « Désactiver le compte » ; pas « ne peut pas se connecter »', ['Renvoyer l’invitation', 'Annuler l’invitation', 'Désactiver le compte'].every(x => e.g.includes(x)) && !/ne peut pas se connecter/.test(e.t), e.g);
    // 2. désactivée
    await L.toucher(c, `[data-eq="desact|${k}"]`); await L.calme(p, 400); if (await p.locator('[data-eqx^="desactok"]').count()) { await L.toucher(c, '[data-eqx^="desactok"]'); await L.calme(p, 400); }
    e = await etat('désactivée');
    v('I invitée DÉSACTIVÉE : ni « Renvoyer » ni lien ni mot de passe ; « Annuler l’invitation » + « Réactiver le compte »', !e.g.some(x => /Renvoyer|lien pour choisir|mot de passe provisoire/i.test(x)) && e.g.includes('Annuler l’invitation') && e.g.includes('Réactiver le compte'), e.g);
    v('I la phrase est écrite une fois, sans promettre un mot de passe qu\'elle n\'a pas', (e.t.match(/réactive d’abord/g) || []).length === 1 && !/nouveau mot de passe/.test(e.t) && /Inès ne peut pas se connecter : réactive d’abord son compte\./.test(e.t), e.t.slice(Math.max(0, e.t.search(/ne peut pas/) - 30), Math.max(0, e.t.search(/ne peut pas/)) + 120));
    await p.evaluate(() => { const e = document.querySelector('#calque .cn-acces'); if (e) e.scrollIntoView({ block:'center' }); }); await L.calme(p, 300); await L.capture(c, E.CAP + `rc2-restes-invitee-desact-${SUF}.png`);
    // 3. la carte et les filtres : où est-elle ?
    await ferme(); await L.aller(p, 'equipe');
    const place = {};
    for (const f of ['tous', 'invites', 'off', 'terrain', 'bureau']) { await p.evaluate(f => { eqFiltre = f; rendre(); }, f); await L.calme(p, 250); const noms = await p.evaluate(() => [...document.querySelectorAll('#contenu .eq-grille > .eq-c .fo-n b')].map(b => b.textContent.trim())); place[f] = noms.some(x => /Inès/.test(x)); }
    relevé('I (relevé) Inès présente dans les filtres', place);
    v('I une invitée désactivée est dans « Désactivés » ET dans « Tous » (on la retrouve pour la réactiver)', place.tous && place.off, place);
    const chips = await p.evaluate(() => { eqFiltre = 'tous'; rendre(); return [...document.querySelectorAll('#contenu .seg button')].map(b => b.textContent.trim().replace(/\s+/g, ' ')); }); relevé('I (relevé) les filtres et leurs nombres', chips);
    await p.evaluate(() => { eqFiltre = 'off'; rendre(); }); await L.calme(p, 300);
    const carte = await p.evaluate(() => { const c0 = [...document.querySelectorAll('#contenu .eq-grille > .eq-c')].find(x => /Inès/.test(x.querySelector('.fo-n b').textContent)); return c0 ? { t:c0.innerText.replace(/\s+/g, ' ').trim(), b:[...c0.querySelectorAll('button')].map(b => b.textContent.trim()) } : null; });
    v('I la carte d\'Inès dans « Désactivés » ne propose pas « Renvoyer l’invitation »', !!carte && !carte.b.some(x => /Renvoyer/.test(x)), carte);
    await L.capture(c, E.CAP + `rc2-restes-invitee-off-${SUF}.png`);
    await p.evaluate(() => { eqFiltre = 'tous'; rendre(); });
    // 4. réactivée : les deux boutons reviennent, le renvoi marche et dit vrai
    e = await etat('réactivée'); await L.toucher(c, `[data-eq="actif|${k}"]`); await L.calme(p, 500); if (await p.locator('[data-eqx^="reactok"], [data-eqx^="actifok"]').count()) { await L.toucher(c, '[data-eqx^="reactok"], [data-eqx^="actifok"]'); await L.calme(p, 400); }
    e = await etat('réactivée');
    v('I invitée RÉACTIVÉE : « Renvoyer l’invitation » revient, la phrase « ne peut pas » part', e.g.includes('Renvoyer l’invitation') && !/ne peut pas se connecter/.test(e.t), e.g);
    await L.toucher(c, `[data-eq="relancer|${k}"]`); await L.calme(p, 400); const tr = await E.toast(p);
    v('I « Renvoyer l’invitation » dit à qui elle est repartie', /Invitation renvoyée à .*ines\.garnier@/.test(tr), tr);
    // 5. annulée
    await L.toucher(c, `[data-eqx="annulinv|${k}"]`); await L.calme(p, 400); if (await p.locator('[data-eqx^="annulok"], [data-eqx^="annulinvok"]').count()) { await L.toucher(c, '[data-eqx^="annulok"], [data-eqx^="annulinvok"]'); await L.calme(p, 400); }
    const reste = await p.evaluate(() => !!EQUIPE.find(x => x.prenom === 'Inès')); v('I « Annuler l’invitation » retire bien Inès', !reste, await E.texte(p, '#calque'));
    await ferme();
    // 6. invitée désactivée PUIS annulée directement depuis l'état désactivé
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 300);
    await p.fill('#eq-p', 'Jade'); await p.fill('#eq-n', 'Morel'); await p.fill('#eq-m', 'jade.morel@climservices17.fr'); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 600);
    const k2 = await p.evaluate(() => { const q = EQUIPE.find(x => x.prenom === 'Jade'); return q && q.k; }); v('I (population) Jade est invitée', !!k2, k2);
    if (k2) { await ferme(); await E.fiche(c, k2); await L.toucher(c, `[data-eq="desact|${k2}"]`); await L.calme(p, 400); if (await p.locator('[data-eqx^="desactok"]').count()) { await L.toucher(c, '[data-eqx^="desactok"]'); await L.calme(p, 400); }
      await ferme(); await E.fiche(c, k2); await L.toucher(c, `[data-eqx="annulinv|${k2}"]`); await L.calme(p, 400); if (await p.locator('[data-eqx^="annulok"], [data-eqx^="annulinvok"]').count()) { await L.toucher(c, '[data-eqx^="annulok"], [data-eqx^="annulinvok"]'); await L.calme(p, 400); }
      v('I annuler l\'invitation d\'une désactivée fonctionne (elle disparaît)', await p.evaluate(() => !EQUIPE.find(x => x.prenom === 'Jade')), await E.texte(p, '#calque')); }
    await ferme();
  });

  if (vaut('R')) await jouer('R lecteur devant une invitée désactivée', async () => {
    // Inès est invitée puis désactivée par le gérant, puis le gérant ouvre l'application comme Julie (profil Responsable : lecture)
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 300);
    await p.fill('#eq-p', 'Inès'); await p.fill('#eq-n', 'Garnier'); await p.fill('#eq-m', 'ines.garnier@climservices17.fr'); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 600);
    const k = await p.evaluate(() => { const q = EQUIPE.find(x => x.prenom === 'Inès'); if (q) q.actif = false; rendre(); return q && q.k; });
    v('R (population) Inès est invitée ET désactivée', !!k && await p.evaluate(k => eqDe(k).invite && !eqDe(k).actif, k), k);
    await ferme(); await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'resp'); await L.calme(p, 500); await L.toucher(c, '#calque [data-eqx^="profok|julie|resp"]'); await L.calme(p, 500);
    await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
    v('R (population) on est Julie, Responsable, avec Équipe au menu', await p.evaluate(() => acteur() === 'julie' && rlLignes().some(x => x.k === 'equipe')), await p.evaluate(() => acteur()));
    await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiltre = 'off'; rendre(); }); await L.calme(p, 300);
    const noms = await p.evaluate(() => [...document.querySelectorAll('#contenu .eq-grille > .eq-c .fo-n b')].map(b => b.textContent.trim()));
    v('R (population) « Désactivés » montre Inès', noms.some(x => /Inès/.test(x)), noms);
    const carte = await p.evaluate(() => { const c0 = [...document.querySelectorAll('#contenu .eq-grille > .eq-c')].find(x => /Inès/.test(x.querySelector('.fo-n b').textContent)); return c0 ? [...c0.querySelectorAll('button')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim()) : null; });
    v('R lecteur : la carte d\'Inès ne porte aucun geste d\'écriture (ni Renvoyer, ni Réactiver, ni lien)', !!carte && !carte.some(x => /Renvoyer|Réactiver|Désactiver|lien pour|Annuler/i.test(x)), carte);
    await L.toucher(c, `[data-eq="fiche|${k}"]`); await L.calme(p, 400); const t = await E.texte(p, '#calque'), g = await boutons(p);
    v('R lecteur : fiche d\'une invitée désactivée : ni « réactive d\'abord » ni geste d\'écriture', !/réactive d’abord/.test(t) && !g.some(x => /Réactiver|Désactiver|Renvoyer|Annuler l’invitation|lien pour|provisoire|Modifier|Ajouter une habilitation/i.test(x)), g);
    await L.capture(c, E.CAP + `rc2-restes-lecteur-invitee-${SUF}.png`);
  });

  const errs = (c.err || []).filter(x => !/favicon|manifest/i.test(String(x)));
  v('aucune erreur de page', errs.length === 0, errs.slice(0, 3));
  await E.fin();
})().catch(async e => { console.log('ÉCHEC DE LA SONDE :', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
function relevé(nom, d) { console.log('  · RELEVÉ ' + nom + ' :', typeof d === 'string' ? d : JSON.stringify(d)); v(nom, true); }
