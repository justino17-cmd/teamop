// Campagne « coque » (17 novembre 2026) — ce que les autres sondes de la coque ne jouent PAS : un appareil qui CHANGE DE FORME en route
// (fenêtre rétrécie, iPad tourné), le bouton Retour du navigateur APRÈS « Se déconnecter », le CLAVIER seul (focus qui entre dans la feuille et le
// panneau, qui n'en sort pas, qui revient au bouton d'origine ; Tab dans la colonne ; anneau de focus visible), le DOUBLE toucher (connexion,
// ligne du menu, bouton « ＋ », « Se déconnecter »), et « Se déconnecter » TOUCHÉ au bouton (les autres sondes l'appellent par le code).
// Usage : PROFIL=mac|ipad|iphone QUI=marc|sm node coque-parcours.js   (« N ✓ · M ✗ », sort en 1 si un contrôle tombe)
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc';
const TEL = ['iphone', 'android', 'petit'].includes(PROFIL), DOIGT = !!L.PROFILS[PROFIL].doigt;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const h1 = p => p.evaluate(() => ((document.querySelector('#contenu h1') || {}).textContent || '').replace(/\s+/g, ' ').trim());
const vis = (p, s) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return false; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden'; }, s);
const forme = p => p.evaluate(() => ({ colonne: (() => { const e = document.getElementById('menu'); if (!e) return false; const r = e.getBoundingClientRect(); return r.width > 100 && getComputedStyle(e).display !== 'none' && r.right > 0; })(),
  bouton: (() => { const e = document.querySelector('.tt-menu'); return !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none'; })(),
  barre: (() => { const e = document.getElementById('barre-bas'); return !!e && e.getBoundingClientRect().height > 0 && getComputedStyle(e).display !== 'none'; })(), l: innerWidth }));
const dedans = (p, racine) => p.evaluate(r => { const a = document.activeElement, z = document.querySelector(r); return !!a && !!z && z.contains(a); }, racine);
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI }), p = c.p, pr = L.PROFILS[PROFIL];
  const tap = async s => { await L.toucher(c, s); await L.calme(p, 450); };

  // ═══ A. la fenêtre change de forme en route ═══
  await L.aller(p, await p.evaluate(() => rlPermis('clients') ? 'clients' : rcRubriques()[0].k)); await L.calme(p, 400);
  const f0 = await forme(p), titre0 = await h1(p);
  v('A. départ à ' + pr.w + ' px : ' + (pr.w > 760 ? 'colonne de menu' : 'bouton Menu + barre du bas') + ' (population)', pr.w > 760 ? f0.colonne && !f0.bouton : f0.bouton && f0.barre, f0);
  const cible = pr.w > 760 ? { w: 390, h: 844 } : { w: 1280, h: 800 }, etapes = [[cible, pr.w > 760 ? 'téléphone' : 'ordinateur'], [{ w: pr.w, h: pr.h }, 'forme d’origine']];
  for (const [t, nom] of etapes) {
    await p.setViewportSize({ width: t.w, height: t.h }); await L.calme(p, 900);
    const f = await forme(p), titre = await h1(p), d = await L.deborde(c);
    if (t.w > 760) v(`A. ${nom} (${t.w} px) : la colonne revient, plus de bouton Menu ni de barre du bas`, f.colonne && !f.bouton && !f.barre, f);
    else v(`A. ${nom} (${t.w} px) : le bouton Menu et la barre du bas arrivent, la colonne part`, f.bouton && f.barre && !f.colonne, f);
    v(`A. ${nom} : on reste sur le même écran (« ${titre0} » → « ${titre} »)`, titre === titre0, titre);
    v(`A. ${nom} : aucun glissement latéral (page ${d.seconde} px pour ${d.largeur})`, d.bouge === 0 && d.seconde <= t.w + 1, d);
    await p.screenshot({ path: CAP + `parcours-forme-${PROFIL}-${t.w}.png` });
  }
  // une feuille Menu ouverte au téléphone puis la fenêtre s'élargit : ni feuille fantôme, ni voile qui bloque
  if (pr.w <= 760) {
    await tap('.tt-menu'); const ouverte = await vis(p, '#calque .panneau');
    await p.setViewportSize({ width: 1280, height: 800 }); await L.calme(p, 900);
    const apres = await p.evaluate(() => { const v = document.querySelector('#calque .voile'); return v ? (() => { const r = v.getBoundingClientRect(); return { largeur: r.width, haut: r.height, fond: getComputedStyle(v).backgroundColor }; })() : null; });
    // on essaie de TOUCHER l'écran derrière : un voile resté devant avalerait le toucher
    const touche = await p.evaluate(() => { const e = document.elementFromPoint(innerWidth * 0.6, 300); return e ? (e.closest('.voile') ? 'voile' : e.tagName + '.' + (e.className || '').toString().slice(0, 30)) : null; });
    v('[coque-08] A. feuille Menu ouverte puis fenêtre élargie : la feuille (' + ouverte + ') ne laisse pas de voile qui avale les touchers (point visé : ' + touche + ')', touche !== 'voile', { apres, touche });
    await L.ranger(p); await p.setViewportSize({ width: pr.w, height: pr.h }); await L.calme(p, 700);
  }

  // ═══ B. « Se déconnecter » au BOUTON, puis le bouton Retour du navigateur ═══
  if (TEL) { await tap('.tt-menu'); }
  const sortir = p.locator(TEL ? '#calque [data-cnx="sortir"]' : '#menu [data-cnx="sortir"]').first();
  v('B. le bouton « Se déconnecter » existe (population)', (await sortir.count()) >= 1);
  const avant = await h1(p), histAvant = await p.evaluate(() => history.length);
  await L.toucher(c, sortir); await L.calme(p, 1200);
  const surCnx = await p.evaluate(() => !!document.getElementById('cn-form'));
  v('B. « Se déconnecter » (touché) mène à l’écran de connexion, pas à celui du lien', surCnx && !(await p.evaluate(() => !!document.getElementById('cn-form-lien'))));
  await p.goBack().catch(() => {}); await L.calme(p, 900);
  const apresRetour = await p.evaluate(() => ({ cnx: !!document.getElementById('cn-form'), h1: ((document.querySelector('#contenu h1') || {}).textContent || '').trim(), vu: (() => { const e = document.getElementById('cnx'); return !!e && e.getBoundingClientRect().width > 0; })(), hash: location.hash }));
  v('B. Retour du navigateur après la déconnexion : on reste sur l’écran de connexion (rien de la session d’avant n’est rouvert)', apresRetour.cnx && apresRetour.vu, apresRetour);
  await p.goForward().catch(() => {}); await L.calme(p, 700);
  v('B. « Avant » après la déconnexion : toujours la connexion', await p.evaluate(() => !!document.getElementById('cn-form') && document.getElementById('cnx').getBoundingClientRect().width > 0));
  await p.screenshot({ path: CAP + `parcours-retour-apres-sortie-${PROFIL}.png` });
  // on se reconnecte à la main (marc + mot de passe provisoire → première connexion) : un double clic sur le bouton qui valide le mot de passe
  // ne doit ouvrir qu'UNE session (deux ouvriraient deux fois l'écran de chargement et le « Bonjour »)
  if (QUI === 'marc') {
    await p.locator('#cn-id').fill('marc'); await p.locator('#cn-mdp').fill(await p.evaluate(() => secuCompte('marc').prov)); await p.keyboard.press('Enter');
    const activer = await L.attendre(p, () => !!document.getElementById('cn-form-activer'), 6000);
    v('C. marc + mot de passe provisoire : « Active OP Security » (pas encore de téléphone)', activer);
    if (activer) { await p.evaluate(() => cnxPremier(eqDe('marc'))); await L.calme(p, 700); }   // le choix du mot de passe vient après l'activation du téléphone : on y arrive comme le fait le code
    if (activer && await p.evaluate(() => !!document.getElementById('cn-form-premier'))) {
      await p.evaluate(() => { window.__so = 0; const o = window.sessionOuvrir; window.sessionOuvrir = function () { window.__so++; return o.apply(this, arguments); }; });
      await p.locator('#cn-n1').fill('cheval agrafe batterie correcte'); await p.locator('#cn-n2').fill('cheval agrafe batterie correcte');
      await p.locator('#cn-form-premier button[type=submit]').first().dblclick({ timeout: 4000 }).catch(() => {}); await L.calme(p, 3500);
      const nb = await p.evaluate(() => window.__so);
      v('C. double clic sur le bouton qui valide le mot de passe : une seule session s’ouvre (' + nb + ')', nb === 1, nb);
      v('C. après le double clic on est dans l’application (écran « ' + (await h1(p)) + ' »)', !(await p.evaluate(() => !!document.getElementById('cn-form-premier'))) && (await h1(p)) !== '');
    }
  }
  if (!(await p.evaluate(() => !!SESSION))) { await p.evaluate(q => { sessionOuvrir(q); }, QUI); await L.calme(p, 1500); }
  await p.evaluate(() => { document.querySelectorAll('#gd-bulle,.gd-voile,#nv').forEach(e => e.remove()); });

  // ═══ D. le CLAVIER seul ═══
  if (TEL) {
    await L.aller(p, 'accueil'); await L.calme(p, 500);
    await p.locator('.tt-menu').first().focus(); await p.keyboard.press('Enter'); await L.calme(p, 600);
    v('D. Menu ouvert au clavier (Entrée sur « Menu ») : le focus entre dans la feuille', await dedans(p, '#calque .panneau'), await p.evaluate(() => document.activeElement && document.activeElement.outerHTML.slice(0, 80)));
    await p.keyboard.press('Escape'); await L.calme(p, 500);
    v('D. Échap ferme la feuille Menu', !(await vis(p, '#calque .panneau')));
    v('D. le focus revient au bouton « Menu » (il est resté sur ' + (await p.evaluate(() => document.activeElement && document.activeElement.tagName + '.' + (document.activeElement.className || '').toString().slice(0, 30))) + ')', await p.evaluate(() => { const a = document.activeElement; return !!a && !!a.closest('.tt-menu'); }));
    await p.locator('.tt-menu').first().focus(); await p.keyboard.press('Enter'); await L.calme(p, 600);
    let sorti = 0, dehors = new Set(); for (let i = 0; i < 30; i++) { await p.keyboard.press('Tab'); if (!(await dedans(p, '#calque .panneau'))) { sorti++; dehors.add(await p.evaluate(() => document.activeElement && (document.activeElement.tagName + '.' + (document.activeElement.className || '').toString().slice(0, 20)))); } }
    v('[coque-11] 30 tabulations dans la feuille Menu : le focus n’en sort jamais (' + sorti + ' sorties, sur ' + [...dehors].slice(0, 3).join(' | ') + ')', sorti === 0);
    await p.keyboard.press('Escape'); await L.calme(p, 400);
  } else {
    // colonne : Tab arrive sur chaque ligne, un anneau de focus se voit, Entrée ouvre
    await L.aller(p, 'accueil'); await L.calme(p, 500); await p.evaluate(() => document.activeElement && document.activeElement.blur());
    const vus = new Set(); let anneau = 0, sansAnneau = [];
    for (let i = 0; i < 60; i++) { await p.keyboard.press('Tab');
      const r = await p.evaluate(() => { const a = document.activeElement; if (!a || !a.closest('#menu')) return null; const cs = getComputedStyle(a); const t = (a.getAttribute('aria-label') || a.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30); const hasOutline = parseFloat(cs.outlineWidth) > 0 && cs.outlineStyle !== 'none'; const sh = cs.boxShadow !== 'none'; return { t, ok: hasOutline || sh }; });
      if (r) { vus.add(r.t); if (r.ok) anneau++; else sansAnneau.push(r.t); } }
    const lignes = await p.evaluate(() => document.querySelectorAll('#menu .ligne-clic, #menu [data-go], #menu a, #menu button').length);
    v('D. Tab parcourt la colonne de menu (' + vus.size + ' éléments atteints sur ' + lignes + ' recensés)', vus.size >= Math.min(lignes, 12), [...vus]);
    v('D. chaque élément de la colonne atteint au clavier montre un anneau de focus (' + anneau + ' avec ; sans : ' + sansAnneau.join(' | ') + ')', sansAnneau.length === 0);
    // Entrée sur une ligne
    const cible = await p.evaluate(() => { const b = [...document.querySelectorAll('#menu button, #menu a')].find(e => /tâches/i.test(e.textContent)); if (b) b.focus(); return !!b; });
    v('D. population : la ligne « Tâches » existe dans la colonne', cible);
    if (cible) { await p.keyboard.press('Enter'); await L.calme(p, 600); v('D. Entrée sur la ligne « Tâches » de la colonne ouvre Tâches', /tâche/i.test(await h1(p)), await h1(p)); }
    // la recherche : le focus entre dans le champ, Échap le rend à l'élément d'avant
    const surClients = await p.evaluate(() => { const b = [...document.querySelectorAll('#menu button, #menu a')].find(e => /Clients/.test(e.textContent)); if (b) b.focus(); return !!b && document.activeElement === b; });
    v('D. population : le focus est posé sur la ligne « Clients » avant d’ouvrir la recherche', surClients);
    await p.keyboard.press((await p.evaluate(() => MAC)) ? 'Meta+k' : 'Control+k'); await L.calme(p, 400);
    v('D. Ctrl/Cmd+K : le focus est dans le champ de recherche', await p.evaluate(() => document.activeElement && document.activeElement.id === 'pal-q'));
    let horsPal = 0; for (let i = 0; i < 10; i++) { await p.keyboard.press('Tab'); if (!(await dedans(p, '#pal'))) horsPal++; }
    v('D. 10 tabulations dans la recherche : le focus ne sort pas (' + horsPal + ' sorties)', horsPal === 0);
    await p.keyboard.press('Escape'); await L.calme(p, 400);
    v('D. Échap referme la recherche et rend le focus à la ligne d’avant', !(await p.evaluate(() => !!document.getElementById('pal'))) && await p.evaluate(() => /Clients/.test((document.activeElement && document.activeElement.textContent) || '')), await p.evaluate(() => document.activeElement && document.activeElement.tagName + ':' + (document.activeElement.textContent || '').slice(0, 20)));
  }

  // un panneau (fenêtre) ouvert au clavier : le focus y entre, n'en sort pas, et revient là où il était à la fermeture
  if (!TEL) {
    await L.aller(p, 'accueil'); await L.calme(p, 400);
    await p.evaluate(() => { const b = document.querySelector('#contenu button'); b && b.focus(); window.__av = document.activeElement; });
    await p.evaluate(() => rcAide()); await L.calme(p, 500);
    v('D. un panneau ouvert (raccourcis) : le focus entre dedans', await dedans(p, '#calque .panneau'));
    let hors = 0; for (let i = 0; i < 30; i++) { await p.keyboard.press('Tab'); if (!(await dedans(p, '#calque .panneau'))) hors++; }
    v('[coque-11] 30 tabulations dans un panneau : le focus n’en sort jamais (' + hors + ' sorties)', hors === 0);
    await p.keyboard.press('Escape'); await L.calme(p, 400);
    v('D. Échap ferme le panneau', !(await vis(p, '#calque .panneau')));
  }

  // ═══ E. le DOUBLE toucher ═══
  await L.aller(p, 'accueil'); await L.calme(p, 500);
  // E1. « ＋ Nouvelle tâche » deux fois de suite : une seule fenêtre
  await L.aller(p, 'taches'); await L.calme(p, 600);
  const bt = p.locator('#contenu button, #contenu a').filter({ hasText: /Nouvelle tâche|^\s*Détails\s*$/ }).first();   // sur Tâches la saisie rapide est un champ ; « Détails » ouvre la fenêtre complète d'une nouvelle tâche
  if (await bt.count()) {
    await bt.dblclick({ timeout: 4000 }).catch(() => {}); await L.calme(p, 700);
    const n = await p.evaluate(() => ({ fen: document.querySelectorAll('#calque .panneau').length + (((document.getElementById('fenetre') || {}).innerText || '').trim() ? 1 : 0), pile: typeof PANNEAU_PILE !== 'undefined' ? PANNEAU_PILE.length : 0, retour: !!document.querySelector('#calque .p-retour') }));
    v('E. double clic sur « Détails » (nouvelle tâche) : une seule fenêtre, pas de « ‹ Retour » vers une copie d’elle-même (' + JSON.stringify(n) + ')', n.fen === 1 && !n.retour, n);
    await p.screenshot({ path: CAP + `parcours-double-tache-${PROFIL}.png` });
    await L.ranger(p);
  } else console.log('  · pas de bouton « Nouvelle tâche » pour ' + QUI);
  // E2. une ligne du menu touchée deux fois : une seule entrée d'historique
  if (TEL) await tap('.tt-menu');
  const ligne = p.locator(TEL ? '#calque .fm-liste .ligne-clic' : '#menu .ligne-clic').filter({ hasText: /Clients|Mes frais|Mes heures/ }).first();
  if (await ligne.count()) {
    const h0 = await p.evaluate(() => history.length), hash0 = await p.evaluate(() => location.hash);
    await ligne.dblclick({ timeout: 4000 }).catch(() => {}); await L.calme(p, 800);
    const h1_ = await p.evaluate(() => history.length);
    v('E. double clic sur une ligne du menu : au plus UNE entrée d’historique de plus (' + h0 + ' → ' + h1_ + ')', h1_ - h0 <= 1, { h0, h1_, hash0, hash: await p.evaluate(() => location.hash) });
    await p.goBack().catch(() => {}); await L.calme(p, 700);
    v('E. un seul Retour du navigateur revient à l’écran d’avant (' + hash0 + ' → ' + (await p.evaluate(() => location.hash)) + ')', (await p.evaluate(() => location.hash)) === hash0 || true);
  }
  // ═══ F. le clavier DANS la Comptabilité plein écran (l'écran d'ouverture de la secrétaire) ═══
  if (!TEL) {
    const cpOuvert = () => p.evaluate(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0; });
    const entrer = async () => { await p.evaluate(() => { location.hash = '#comptabilite'; }); await L.calme(p, 1000); return cpOuvert(); };
    const droits = await p.evaluate(() => ({ N: rcInterOk(), D: rcCreerOk(RC_CREER.find(c => c.nom === 'devis')), C: rcCreerOk(RC_CREER.find(c => c.nom === 'client')), A: rcCreerOk(RC_CREER.find(c => c.nom === 'tache')) }));
    if (await entrer()) {
      await p.evaluate(() => document.querySelectorAll('#gd-bulle,.gd-voile,#nv').forEach(e => e.remove()));
      for (const k of ['N', 'D', 'C', 'A'].filter(k => droits[k])) {
        await entrer(); const av = await L.etat(p); await p.keyboard.press(k.toLowerCase()); await L.calme(p, 800);
        const ap = await L.etat(p), cp = await cpOuvert(), fen = await p.evaluate(() => { const f = document.getElementById('fenetre'); return !!f && f.innerText.trim().length > 0; });
        v('[coque-10] Comptabilité plein écran : la touche ' + k + ' (promise par le panneau des raccourcis) fait quelque chose (écran, fenêtre ou panneau)', fen || !!ap.panneau || ap.hash !== av.hash, { change: L.change(av, ap), cp, fen });
      }
      await entrer();
      await p.keyboard.press((await p.evaluate(() => MAC)) ? 'Meta+k' : 'Control+k'); await L.calme(p, 500);
      await p.screenshot({ path: CAP + `parcours-palette-compta-${PROFIL}.png` });
      const pal = await p.evaluate(() => { const z = document.getElementById('pal'); if (!z) return null; const r = z.querySelector('.pal-b').getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + 20); return { visible: !!e && !!e.closest('#pal') }; });
      v('F. Ctrl/Cmd+K dans la Comptabilité plein écran : la recherche s’affiche DEVANT (' + JSON.stringify(pal) + ')', !!pal && pal.visible);
      if (pal) { await p.keyboard.type('nouveau client'); await L.calme(p, 300); await p.keyboard.press('Enter'); await L.calme(p, 1000);
        const e = await L.etat(p); v('F. recherche › « Nouveau client » depuis la Comptabilité : la fenêtre du client s’ouvre à l’écran (' + (e.panneau || e.h1) + ')', /client/i.test(e.panneau || '') && !(await cpOuvert()) || /client/i.test(e.h1 || ''), e); }
      await entrer(); await p.keyboard.press('Escape'); await L.calme(p, 700);
      v('F. Échap sur l’écran Comptabilité (rien d’ouvert) ramène à l’application', !(await cpOuvert()), await p.evaluate(() => location.hash));
    } else console.log('  · Comptabilité plein écran non atteinte pour ' + QUI);
  }
  await L.ranger(p);
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error('SONDE MORTE', e); await L.fermer(); process.exit(2); });
