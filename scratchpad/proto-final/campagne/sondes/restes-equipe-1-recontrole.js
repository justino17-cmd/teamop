// RECONTRÔLE ADVERSE des restes « équipe », tour 1 (18 novembre 2026). Ce que les corrections de restes-equipe-1 ont pu casser À CÔTÉ :
//  1. la bulle qui ne recopie plus le refus : l'utilisateur voit-il le refus AU MOINS UNE FOIS (phrase visible OU bulle), jamais ni l'un ni l'autre,
//     sur « Inviter », « Habilitation », « Modifier la fiche » et sur Mon entreprise (même fonction entVerifier) ; petit écran compris ;
//  2. la phrase courte du nom : dit-elle vrai ? (un nom qui commence par un tiret, un point, une apostrophe est refusé ; 60 / 61 signes) ;
//  3. le compte désactivé : fiche (actif, invité, verrouillé), carte, contre-épreuve réactivé, lecture seule (Responsable) ;
//  4. la fiche de soi à la première personne, de bout en bout (texte entier, bouton, bulle, journal) ;
//  5. « Voir ce compte » / « Voir ces comptes » (un et deux comptes verrouillés), taille du bouton, débordement ;
//  6. filtres vides (Invités, Désactivés) : la phrase, la mise en page.
// ⛔ 127.0.0.1 seulement. usage : node restes-equipe-1-recontrole.js [mac|iphone|ipad|android|petit] [nuit] [section…]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'iphone', NUIT = process.argv[3] === 'nuit', SUF = `${PROFIL}-${NUIT ? 'nuit' : 'jour'}`;
const SECTIONS = process.argv.slice(NUIT ? 4 : 3), vaut = s => !SECTIONS.length || SECTIONS.includes(s);
const LARG = L.PROFILS[PROFIL].w, DOIGT = !!L.PROFILS[PROFIL].doigt;
const TEL = LARG <= 760;   // la règle de la bulle (entVerifier) est celle des téléphones : max-width:760px, pas « tout appareil tactile » ; sur iPad (820) et au bureau la bulle redit la phrase, sans rien couvrir (doute, pas défaut)
const jouer = async (nom, fn) => { try { await fn(); } catch (e) { v(`${nom} : le parcours va jusqu'au bout`, false, String(e.message).slice(0, 260)); } };
// la phrase écrite sous un champ est-elle LÀ (dans l'écran, au-dessus de la rangée collée) ?
const visible = (p, id) => p.evaluate(id => { const e = document.getElementById(id + '-err'); if (!e || e.hidden || !e.textContent.trim()) return false; const r = e.getBoundingClientRect(), P = e.closest('#calque .panneau'); if (!P || r.height <= 0) return false;
  const pr = P.getBoundingClientRect(), ac = P.querySelector(':scope > .actions'); const bas = Math.min(pr.bottom, innerHeight, ac ? ac.getBoundingClientRect().top : pr.bottom); return r.top >= pr.top - 1 && r.bottom <= bas + 1; }, id);
const phrase = (p, id) => p.evaluate(id => { const e = document.getElementById(id + '-err'); return e && !e.hidden ? e.textContent.trim() : ''; }, id);
// « l'utilisateur est informé » : la phrase est à l'écran, ou la bulle la dit
const informe = async (p, id) => { const ph = await phrase(p, id), vis = await visible(p, id), t = await E.toast(p); return { ph, vis, toast:t, ok:!!ph && (vis || t.includes(ph.slice(0, 20))), doublon:!!ph && vis && t.includes(ph.slice(0, 20)) }; };
const pastille = p => p.evaluate(() => { const t = document.getElementById('toast'); if (!t || !t.classList.contains('on')) return null; const r = t.getBoundingClientRect(); return { top:Math.round(r.top), bottom:Math.round(r.bottom), left:Math.round(r.left), right:Math.round(r.right) }; });
const cartes = p => p.evaluate(() => [...document.querySelectorAll('#contenu .eq-grille > .eq-c')].map(x => x.querySelector('.fo-n b').textContent));
(async () => {
  const c = await E.marc(PROFIL, NUIT), p = c.p;
  const relever = (nom, d) => { console.log('  · RELEVÉ ' + nom + ' :', typeof d === 'string' ? d : JSON.stringify(d)); v(nom, true); };
  const ferme = async () => { await E.ranger(c); };

  if (vaut('A')) await jouer('A inviter, une seule erreur (l\'e-mail, tout en bas)', async () => {
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 300);
    await p.fill('#eq-p', 'Zoé'); await p.fill('#eq-n', 'Marchand'); await p.fill('#eq-m', 'zoe.sans-arobase');
    await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400);
    const i = await informe(p, 'eq-m');
    v('A (population) la phrase de l\'e-mail est écrite', i.ph.length > 8, i);
    v('A le refus de l\'e-mail est dit (phrase à l\'écran OU bulle), jamais ni l\'un ni l\'autre', i.ok, i);
    if (TEL) v('A téléphone : pas de doublon (phrase ET bulle qui la recopie)', !i.doublon, i);
    const foc = await p.evaluate(() => document.activeElement && document.activeElement.id); v('A le focus est sur le champ fautif', foc === 'eq-m', foc);
    await L.capture(c, E.CAP + `rc-restes-inviter-mail-${SUF}.png`);
    await ferme();
  });

  if (vaut('A')) await jouer('A inviter, trois erreurs, valeurs longues', async () => {
    await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 300);
    await p.fill('#eq-p', ''); await p.fill('#eq-n', 'Dur<b>and de la Tour-Maubourg-Saint-Germain'); await p.fill('#eq-m', 'quelquun@sansPoint');
    await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400);
    const ids = ['eq-p', 'eq-n', 'eq-m']; const r = {}; for (const id of ids) r[id] = await informe(p, id);
    v('A (population) les trois phrases sont écrites', ids.every(id => r[id].ph.length > 8), ids.map(id => r[id].ph.length));
    v('A le PREMIER champ fautif est informé (la bulle dit le premier, la phrase est sous lui)', r['eq-p'].ok, r['eq-p']);
    if (TEL) v('A téléphone : la bulle ne recopie pas une phrase déjà visible', !r['eq-p'].doublon, r['eq-p']);
    const hn = await p.evaluate(() => { const e = document.getElementById('eq-n-err'), lh = parseFloat(getComputedStyle(e).lineHeight) || 18; return { lignes:Math.round(e.getBoundingClientRect().height / lh), largeur:Math.round(e.getBoundingClientRect().width), signes:e.textContent.length }; });
    v('A la phrase du nom tient en TROIS lignes au plus sur ce profil (une demi-colonne de téléphone)', hn.lignes <= 3, hn);
    const t = await pastille(p), cache = await p.evaluate(t => { if (!t) return []; return [...document.querySelectorAll('#calque .erreur, #calque label, #calque .btn')].filter(e => { const q = e.getBoundingClientRect(); return q.height > 0 && q.bottom > t.top && q.top < t.bottom && q.right > t.left && q.left < t.right && q.bottom > 0 && q.top < innerHeight && (e.classList.contains('erreur') ? !e.hidden && e.textContent.trim() : true); }).map(e => (e.className || e.tagName) + ' « ' + e.textContent.trim().slice(0, 30) + ' »'); }, t);
    v('A la bulle ne recouvre ni phrase, ni libellé, ni bouton de la fenêtre', cache.length === 0, cache);
    const deb = await p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return { sw:P.scrollWidth, cw:P.clientWidth, page:document.documentElement.scrollWidth }; });
    v('A la fenêtre ne déborde pas de côté (largeur posée du profil)', deb.sw <= deb.cw + 1 && deb.page <= LARG + 1, deb);
    await L.capture(c, E.CAP + `rc-restes-inviter-3-${SUF}.png`);
    // corriger efface le refus (la règle « un refus ne survit pas à la correction »)
    await p.fill('#eq-p', 'Zoé'); await L.calme(p, 200);
    v('A corriger le prénom efface SON refus (et pas celui du nom)', !(await phrase(p, 'eq-p')) && !!(await phrase(p, 'eq-n')), { p:await phrase(p, 'eq-p'), n:await phrase(p, 'eq-n') });
    await ferme();
  });

  if (vaut('A')) await jouer('A habilitation', async () => {
    await E.fiche(c, 'tl'); await L.toucher(c, '[data-eq="habajout|tl"]'); await L.calme(p, 300);
    await p.fill('#eq-hn', 'Formation levage');
    if (await p.evaluate(() => document.getElementById('eqx-hs').checked)) await p.locator('#eqx-hs').uncheck();
    await p.fill('#eqx-hd', '2026-06-01'); await p.fill('#eqx-hn', '2026-05-01');
    await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 400);
    const i = await informe(p, 'eqx-hn'); v('A habilitation : « fin avant obtention » est dite (phrase à l\'écran OU bulle)', i.ok, i);
    if (TEL) v('A habilitation, téléphone : pas de doublon', !i.doublon, i);
    // nom vide : le refus d'un champ en HAUT de la fenêtre pendant qu'on regarde le bas
    await p.fill('#eq-hn', ''); await p.evaluate(() => { const P = document.querySelector('#calque .panneau'); P.scrollTop = P.scrollHeight; }); await L.calme(p, 200);
    await L.toucher(c, '[data-eq="habok|tl"]'); await L.calme(p, 400);
    const j = await informe(p, 'eq-hn'); v('A habilitation : nom vide, fenêtre défilée en bas : le refus est dit (le champ est remonté sous le focus, ou la bulle parle)', j.ph.length > 5 && j.ok, j);
    await L.capture(c, E.CAP + `rc-restes-habilitation-${SUF}.png`);
    await ferme();
  });

  if (vaut('A')) await jouer('A modifier la fiche (nom refusé : bulle seule)', async () => {
    await E.fiche(c, 'kb'); await L.toucher(c, '[data-eqx="modifier|kb"]'); await L.calme(p, 300);
    await p.fill('#eqx-mn', 'Be<n>ali'); await L.toucher(c, '[data-eqx="modifok|kb"]'); await L.calme(p, 400);
    const t = await E.toast(p), ph = await p.evaluate(() => [...document.querySelectorAll('#calque .erreur')].filter(e => !e.hidden && e.textContent.trim()).map(e => e.textContent.trim()));
    v('A modifier : le refus du nom est dit (bulle ou phrase)', /Lettres, chiffres/.test(t) || ph.some(x => /Lettres, chiffres/.test(x)), { t, ph });
    const ou = await p.evaluate(() => { const t = document.getElementById('toast'); const r = t && t.classList.contains('on') ? t.getBoundingClientRect() : null; return r ? { top:Math.round(r.top), bas:innerHeight } : null; });
    if (DOIGT && ou) v('A modifier : la bulle est dans l\'écran', ou.top > 0 && ou.top < ou.bas, ou);
    await ferme();
  });

  if (vaut('B')) await jouer('B nom : la phrase dit-elle vrai ?', async () => {
    // l'application garde « lettres, chiffres, espaces, points, apostrophes, tirets » mais le premier signe doit être une lettre ou un chiffre
    const cas = [['-Marie', 'tiret en tête'], ['.Marie', 'point en tête'], ['’Marie', 'apostrophe en tête'], ['O\'Neil', 'apostrophe au milieu'], ['Marie-Ève', 'tiret et accent'], ['Jean 3', 'chiffre'], ['A'.repeat(60), '60 signes'], ['A'.repeat(61), '61 signes (tapé par la machine)']];
    const res = [];
    for (const [val, lib] of cas) {
      await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 250);
      await p.evaluate(() => { const n = document.getElementById('eq-n'); n.removeAttribute('maxlength'); });
      await p.fill('#eq-p', 'Paul'); await p.fill('#eq-n', val); await p.fill('#eq-m', 'paul.essai@climservices17.fr');
      await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 400);
      const ph = await phrase(p, 'eq-n'), t = await E.toast(p); res.push({ lib, val:val.slice(0, 12), refuse:!!ph, ph, toast:t.slice(0, 60) });
      await ferme(); if (!ph) { await p.evaluate(() => { const k = EQUIPE[EQUIPE.length - 1].k; if (EQUIPE[EQUIPE.length - 1].prenom === 'Paul') EQUIPE.pop(); try { rendre(); } catch (e) {} }); } }
    v('B (population) huit valeurs jouées', res.length === 8, res.length);
    const refuses = res.filter(x => x.refuse);
    v('B un refus qui dit « tirets seulement » n\'est pas rendu à quelqu\'un qui n\'a tapé que des lettres, espaces et tirets : « -Marie » (tiret en tête)', !res[0].refuse, res[0]);
    v('B idem pour le point et l\'apostrophe en TÊTE (la phrase promet ce qu\'elle refuse : le signe est permis ailleurs)', !res[1].refuse && !res[2].refuse, [res[1], res[2]]);
    v('B « O\'Neil », « Marie-Ève », « Jean 3 », 60 signes : acceptés', [3, 4, 5, 6].every(i => !res[i].refuse), res.slice(3, 7));
    v('B 61 signes : refusé, et la phrase dit 60', res[7].refuse && /60/.test(res[7].ph), res[7]);
  });

  if (vaut('C')) await jouer('C filtres vides, avant toute désactivation', async () => {
    await L.aller(p, 'equipe');
    for (const [f, re, nom] of [['invites', /Aucune invitation en attente.*Inviter une personne/, 'Invités'], ['off', /Aucun compte désactivé/, 'Désactivés']]) {
      await p.evaluate(f => { eqFiltre = f; rendre(); }, f); await L.calme(p, 400);
      const n = (await cartes(p)).length, t = await E.texte(p, '#contenu');
      v(`C « ${nom} » : population : aucune carte (c'est bien un état vide)`, n === 0, n);
      v(`C « ${nom} » : la phrase dit quoi faire`, re.test(t), t.slice(0, 250));
      const g = await p.evaluate(() => { const q = document.querySelector('#contenu .eq-grille p'); if (!q) return null; const r = q.getBoundingClientRect(); return { h:Math.round(r.height), l:Math.round(r.left), r:Math.round(r.right), page:document.documentElement.scrollWidth }; });
      v(`C « ${nom} » : la phrase est dans l'écran, sans débordement`, !!g && g.l >= 0 && g.r <= LARG && g.page <= LARG + 1, g);
      await p.evaluate(() => { const q = document.querySelector('#contenu .eq-grille p'); if (q) q.scrollIntoView({ block:'center' }); }); await L.calme(p, 300);
      await L.capture(c, E.CAP + `rc-restes-vide-${f}-${SUF}.png`); }
    // le chip « Invités » existe-t-il, et dit-il le bon état ?
    const chips = await p.evaluate(() => [...document.querySelectorAll('#contenu .seg button')].map(b => b.textContent.trim() + (b.getAttribute('aria-pressed') === 'true' ? ' *' : '')));
    v('C les filtres affichés (population)', chips.length >= 4, chips);
    await p.evaluate(() => { eqFiltre = 'tous'; rendre(); });
  });

  if (vaut('D')) await jouer('D désactivé : fiche, carte, réactivation', async () => {
    const ids = ['tl'];
    // 1. Tom (actif) désactivé par le geste de l'écran
    await E.fiche(c, 'tl'); await L.toucher(c, '[data-eq="desact|tl"]'); await L.calme(p, 400);
    if (await p.locator('[data-eqx^="desactok"]').count()) { await L.toucher(c, '[data-eqx^="desactok"]'); await L.calme(p, 400); }
    v('D (population) Tom est désactivé', await p.evaluate(() => eqDe('tl').actif === false), await E.texte(p, '#calque'));
    await ferme();
    await E.fiche(c, 'tl'); await L.calme(p, 300);
    let t = await E.texte(p, '#calque');
    const g = await p.evaluate(() => [...document.querySelectorAll('#calque button, #calque a.btn')].map(b => b.textContent.trim().replace(/\s+/g, ' ')));
    v('D fiche d\'un désactivé : ni provisoire ni lien, et on lui dit pourquoi', !g.some(x => /mot de passe provisoire|lien pour choisir/i.test(x)) && /Tom ne peut pas se connecter/.test(t), g);
    v('D fiche d\'un désactivé : « Réactiver le compte » est là, « Ouvrir l’application comme » non, « Désactiver » non', g.some(x => /Réactiver le compte/.test(x)) && !g.some(x => /Ouvrir l’application comme/.test(x)) && !g.some(x => /Désactiver le compte/.test(x)), g);
    const dbl = (t.match(/réactive d’abord/g) || []).length; v('D la phrase « réactive d\'abord » n\'est écrite qu\'une fois', dbl === 1, dbl);
    // le bloc « Connexion » d'un désactivé : « Dernière connexion », « Nouveau téléphone »… sont-ils cohérents ?
    v('D (relevé) les gestes de sécurité restants sur la fiche d\'un désactivé', true, g.filter(x => /téléphone|Déconnecter|Déverrouiller|Copier le lien/.test(x)));
    await p.evaluate(() => { const e = document.querySelector('#calque .cn-acces'); if (e) e.scrollIntoView({ block:'center' }); }); await L.calme(p, 300);
    await L.capture(c, E.CAP + `rc-restes-desactive-${SUF}.png`);
    await ferme();
    // 2. la CARTE de la liste : pas de bouton de mot de passe pour lui
    await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiltre = 'off'; rendre(); }); await L.calme(p, 400);
    const carte = await p.evaluate(() => { const c0 = document.querySelector('#contenu .eq-grille > .eq-c'); return c0 ? { nom:c0.querySelector('.fo-n b').textContent, boutons:[...c0.querySelectorAll('button')].map(b => b.textContent.trim()) } : null; });
    v('D filtre « Désactivés » : Tom y est, sans bouton de mot de passe', !!carte && /Tom/.test(carte.nom) && !carte.boutons.some(x => /mot de passe|lien pour choisir/i.test(x)), carte);
    await L.capture(c, E.CAP + `rc-restes-off-${SUF}.png`);
    // les autres filtres ne le comptent plus, et le total de places a baissé
    for (const f of ['terrain', 'bureau', 'invites']) { await p.evaluate(f => { eqFiltre = f; rendre(); }, f); await L.calme(p, 200); const n = await cartes(p); v(`D filtre « ${f} » : Tom n'y est pas`, !n.some(x => /Tom/.test(x)), n); }
    // 3. invité puis désactivé
    await p.evaluate(() => { eqFiltre = 'tous'; rendre(); }); await L.calme(p, 200);
    await L.toucher(c, '[data-eq="inviter"]'); await L.calme(p, 300);
    await p.fill('#eq-p', 'Inès'); await p.fill('#eq-n', 'Garnier'); await p.fill('#eq-m', 'ines.garnier@climservices17.fr'); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 600);
    const k = await p.evaluate(() => { const q = EQUIPE.find(x => x.prenom === 'Inès'); return q && q.k; });
    v('D (population) l\'invitée Inès existe', !!k, k);
    if (k) {
      await ferme(); await E.fiche(c, k); t = await E.texte(p, '#calque');
      v('D fiche d\'une INVITÉE active : « Renvoyer l’invitation » ; pas de phrase « ne peut pas se connecter »', /Renvoyer l’invitation/.test(t) && !/ne peut pas se connecter/.test(t), t.slice(0, 260));
      await L.toucher(c, `[data-eq="desact|${k}"]`); await L.calme(p, 400); if (await p.locator('[data-eqx^="desactok"]').count()) { await L.toucher(c, '[data-eqx^="desactok"]'); await L.calme(p, 400); }
      await ferme(); await E.fiche(c, k); t = await E.texte(p, '#calque');
      { const i = Math.max(0, t.search(/connexion/i)); relever('D (relevé) fiche d\'une invitée DÉSACTIVÉE (bloc Connexion)', t.slice(i, i + 700)); }
      const gi = await p.evaluate(() => [...document.querySelectorAll('#calque button')].filter(b => b.offsetParent !== null).map(b => b.textContent.trim()));
      v('D invitée désactivée : on ne lui propose pas de « Renvoyer l’invitation » (un compte désactivé ne se connecte pas) ni de « nouveau mot de passe » (elle n\'en a jamais eu)', !gi.some(x => /Renvoyer l’invitation/.test(x)) && !/nouveau mot de passe/.test(t), gi);
      await L.capture(c, E.CAP + `rc-restes-invitee-desactivee-${SUF}.png`);
      await ferme(); }
    // 4. verrouillée puis désactivée (Léa est verrouillée au départ)
    await E.fiche(c, 'lr'); await L.toucher(c, '[data-eq="desact|lr"]'); await L.calme(p, 400); if (await p.locator('[data-eqx^="desactok"]').count()) { await L.toucher(c, '[data-eqx^="desactok"]'); await L.calme(p, 400); }
    await ferme(); await E.fiche(c, 'lr'); t = await E.texte(p, '#calque');
    v('D (relevé) fiche d\'un compte verrouillé ET désactivé', true, t.slice(t.indexOf('Connexion'), t.indexOf('Connexion') + 520));
    const bloc = t.slice(Math.max(0, t.search(/connexion/i)), Math.max(0, t.search(/connexion/i)) + 700);
    const deux = /ne peut pas se connecter/.test(t) && /utilise « Déverrouiller »/.test(t);
    relever('D (relevé) verrouillée ET désactivée : les deux consignes sont-elles écrites ensemble ?', { deuxConsignes:deux, bloc });
    const ordre = !deux || /d’abord son compte/.test(t) && /Déverrouiller/.test(t);
    await L.capture(c, E.CAP + `rc-restes-lr-desactivee-${SUF}.png`);
    await ferme();
    // 5. Tom réactivé : ses deux gestes reviennent
    await E.fiche(c, 'tl'); await L.toucher(c, '[data-eq="actif|tl"]'); await L.calme(p, 500);
    if (await p.locator('[data-eqx^="reactok"], [data-eqx^="actifok"]').count()) { await L.toucher(c, '[data-eqx^="reactok"], [data-eqx^="actifok"]'); await L.calme(p, 400); }
    const reac = await p.evaluate(() => eqDe('tl').actif === true); v('D (population) Tom est réactivé', reac, await E.texte(p, '#calque'));
    await ferme(); await E.fiche(c, 'tl'); await L.calme(p, 300);
    const g2 = await p.evaluate(() => ({ repose:!!document.querySelector('#calque [data-cnx^="repose"]'), lien:!!document.querySelector('#calque [data-eq^="mdp"]'), phrase:/ne peut pas se connecter/.test(document.querySelector('#calque .panneau').innerText) }));
    v('D réactivé : les deux gestes reviennent, la phrase « ne peut pas se connecter » part', g2.repose && g2.lien && !g2.phrase, g2);
    // le geste du lien marche et dit la vérité
    await L.toucher(c, '[data-eq="mdp|tl"]'); await L.calme(p, 400); const tt = await E.toast(p);
    v('D réactivé : « Lui envoyer un lien » dit à qui il est parti, et que Tom choisit lui-même', /Lien envoyé à .*tom/i.test(tt) && /choisit elle-même|choisit lui-même|choisit/.test(tt), tt);
    await ferme();
  });

  if (vaut('E')) await jouer('E fiche de soi, de bout en bout', async () => {
    await E.fiche(c, 'marc'); const t = await E.texte(p, '#calque');
    const reste3 = [/Marc reçoit/, /à lui remettre/, /Marc le change/, /Lui envoyer/, /Lui donner/, /Changer son mot de passe/, /demande à un autre administrateur\.$/].filter(r => r.test(t)).map(String);
    v('E sur sa propre fiche : aucune phrase d\'instruction à la 3e personne (« Lui », « Marc reçoit », « à lui remettre », « Changer son »)', reste3.length === 0, reste3);
    relever('E (relevé) le bloc Connexion de Marc sur sa propre fiche', t.slice(Math.max(0, t.search(/connexion/i)), Math.max(0, t.search(/connexion/i)) + 650));
    const ordre = await p.evaluate(() => { const P = document.querySelector('#calque .panneau'), ph = [...P.querySelectorAll('small')].find(s => /utilise le lien ci-dessous/.test(s.textContent)), b = P.querySelector('[data-eq="mdp|marc"]'); return { phrase:!!ph, bouton:!!b, apres:!!(ph && b && (ph.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)) }; });
    v('E « utilise le lien ci-dessous » : le lien est bien EN DESSOUS de la phrase (population : les deux existent)', ordre.phrase && ordre.bouton && ordre.apres, ordre);
    const g = await p.evaluate(() => [...document.querySelectorAll('#calque button')].map(b => b.textContent.trim()));
    v('E sur sa propre fiche : pas de « mot de passe provisoire » ni de « Ouvrir l’application comme Marc »', !g.some(x => /provisoire|comme Marc/i.test(x)), g);
    await p.evaluate(() => { const e = document.querySelector('#calque .cn-acces'); if (e) e.scrollIntoView({ block:'start' }); }); await L.calme(p, 300);
    await L.capture(c, E.CAP + `rc-restes-soi-${SUF}.png`);
    const av = await p.evaluate(() => (typeof SECU !== 'undefined' && SECU.journal ? SECU.journal.length : -1));
    await L.toucher(c, '[data-eq="mdp|marc"]'); await L.calme(p, 400); const tt = await E.toast(p);
    v('E le geste dit « tu choisis toi-même » (pas « la personne choisit »)', /tu choisis toi-même/.test(tt) && !/la personne/.test(tt), tt);
    // la trace de l'Équipe : lit-on « Marc a envoyé un lien de mot de passe à Marc » ?
    const tr = await p.evaluate(() => { const j = JOURNAL[JOURNAL.length - 1]; return j ? JSON.stringify({ qui:j.qui, action:j.action || j.a, lib:j.lib, det:j.det }) : ''; });
    relever('E (relevé) la trace laissée par ce geste', tr.slice(0, 260));
    await ferme();
  });

  if (vaut('F')) await jouer('F « Voir ce compte » / « Voir ces comptes »', async () => {
    await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiltre = 'tous'; rendre(); }); await L.calme(p, 300);
    const un = await p.evaluate(() => { const b = document.querySelector('#contenu .sec-bandeau'); return b ? { t:b.innerText.replace(/\s+/g, ' ').trim(), bt:b.querySelector('button').textContent.trim() } : null; });
    // Léa a été désactivée en D : ne plus la compter comme verrouillée est son affaire ; on remet les deux verrous pour la mesure
    await p.evaluate(() => { const h = new Date(secuMaint()); h.setHours(18, 2, 0, 0); h.setDate(h.getDate() - 1); for (const k of ['lr']) { eqDe(k).actif = true; SECU.comptes[k].verrou = { le:h.getTime(), par:'telephone', jusqua:null, n:1 }; } rendre(); }); await L.calme(p, 400);
    const a = await p.evaluate(() => { const b = document.querySelector('#contenu .sec-bandeau'); return b ? { t:b.innerText.replace(/\s+/g, ' ').trim(), bt:b.querySelector('button').textContent.trim() } : null; });
    v('F un compte verrouillé : le bouton dit « Voir ce compte »', !!a && a.bt === 'Voir ce compte', { avant:un, a });
    await p.evaluate(() => { const h = new Date(secuMaint()); h.setHours(9, 30, 0, 0); SECU.comptes.kb.verrou = { le:h.getTime(), par:'telephone', jusqua:null, n:2 }; rendre(); }); await L.calme(p, 400);
    const d = await p.evaluate(() => { const b = document.querySelector('#contenu .sec-bandeau'), q = b.querySelector('button').getBoundingClientRect(), r = b.getBoundingClientRect(); return { t:b.innerText.replace(/\s+/g, ' ').trim(), bt:b.querySelector('button').textContent.trim(), bh:Math.round(q.height), bw:Math.round(q.width), droite:Math.round(r.right), page:document.documentElement.scrollWidth }; });
    v('F deux comptes verrouillés : « 2 comptes verrouillés : … » et le bouton « Voir ces comptes »', /^2 comptes verrouillés/.test(d.t) && d.bt === 'Voir ces comptes', d);
    v('F le bouton du bandeau est au moins aussi haut qu\'un doigt (44 px) sur téléphone, et le bandeau ne déborde pas', (!DOIGT || d.bh >= 44) && d.droite <= LARG + 1 && d.page <= LARG + 1, d);
    await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.classList.remove('on'); const b = document.querySelector('#contenu .sec-bandeau'); if (b) b.scrollIntoView({ block:'center' }); }); await L.calme(p, 300);   // la bulle du geste d'avant ne doit pas passer sur la capture
    await L.capture(c, E.CAP + `rc-restes-bandeau-${SUF}.png`);
    await L.toucher(c, '.sec-bandeau [data-sec2="voir"]'); await L.calme(p, 600);
    const dest = await p.evaluate(() => ({ route, h1:(document.querySelector('#contenu h1, h1') || {}).textContent }));
    v('F le bouton mène à l\'écran Sécurité', dest.route === 'securite', dest);
    const sv = await E.texte(p, '#contenu'); v('F l\'écran Sécurité montre BIEN les deux comptes verrouillés (ce que le bouton annonçait)', /Léa/.test(sv) && /Karim/.test(sv), sv.slice(0, 300));
    await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.classList.remove('on'); window.scrollTo(0, 0); }); await L.calme(p, 300);
    await L.capture(c, E.CAP + `rc-restes-securite-${SUF}.png`);
    await p.evaluate(() => { SECU.comptes.kb.verrou = null; SECU.comptes.lr.verrou = null; });
  });

  if (vaut('G')) await jouer('G Responsable (lecture) devant un désactivé', async () => {
    // Tom est réactivé à la fin de D : on le désactive de nouveau pour que Julie le lise
    await p.evaluate(() => { eqDe('tl').actif = false; rendre(); });
    await E.fiche(c, 'julie'); await p.selectOption('#calque select[data-eqprof="julie"]', 'resp'); await L.calme(p, 500); await L.toucher(c, '#calque [data-eqx^="profok|julie|resp"]'); await L.calme(p, 500);
    await E.fiche(c, 'julie'); await L.toucher(c, '[data-cnx="comme|julie"]'); await L.calme(p, 900);
    v('G (population) on est Julie, Responsable, avec Équipe au menu', await p.evaluate(() => acteur() === 'julie' && rlLignes().some(x => x.k === 'equipe')), await p.evaluate(() => acteur()));
    await L.aller(p, 'equipe'); await p.evaluate(() => { eqFiltre = 'off'; rendre(); }); await L.calme(p, 300);
    const vides = (await cartes(p)).length; v('G (population) le filtre « Désactivés » montre au moins Tom', vides >= 1, await cartes(p));
    await L.toucher(c, '[data-eq="fiche|tl"]'); await L.calme(p, 400); const t = await E.texte(p, '#calque');
    v('G un lecteur ne lit pas « réactive d\'abord son compte » (il ne peut pas)', !/réactive d’abord/.test(t) && !/Réactiver le compte/.test(t), t.slice(0, 300));
    const ecr = await p.evaluate(() => [...document.querySelectorAll('#calque button')].filter(b => b.offsetParent !== null && !b.disabled).map(b => b.textContent.trim()).filter(x => /mot de passe|lien pour|Réactiver|Désactiver|Modifier|Ajouter une habilitation/i.test(x)));
    v('G un lecteur n\'a aucun geste d\'écriture VISIBLE sur la fiche d\'un désactivé', ecr.length === 0, ecr);
    await L.capture(c, E.CAP + `rc-restes-lecteur-desactive-${SUF}.png`);
  });

  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await E.fin();
})();
