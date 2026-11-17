// RECONTRÔLE ADVERSE du bouton Retour (17 novembre 2026, voie « retour », étape 2) — ne dépend PAS de la liste CAL_GENRES de la page : il cherche le calque OUBLIÉ de son côté.
// SECTION (une par exécution : la machine est partagée, 580 s au plus) :
//   scan    : sur chaque écran du menu, il TOUCHE chaque bouton de l'écran (jusqu'à NB par écran) et regarde si quelque chose de grand et de fixe s'est posé PAR-DESSUS
//             sans que CAL_GENRES le sache (calOuverts() vide) → un calque oublié. SCAN_DE / SCAN_A : tranche de la liste des écrans.
//   pieges  : double Retour rapide, Retour pendant l'ouverture, fenêtre dans une fenêtre, Avancer, rechargement, bouton de fenêtre qui mène ailleurs, vingt ouvertures-fermetures puis UN Retour.
//   roles   : les pièges de fond (vingt cycles + Retour) pour chacun des quatre rôles.
//   cadres  : Comptabilité plein cadre (panneau DANS le cadre), atelier, paiement, boîte mail (composeur, tiroir), OP Security (téléphone simulé), feuille de la carte.
// PROFIL=android|iphone|mac|ipad|… (défaut android). Rend « N ✓ · M ✗ » ; écrit aussi un JSON de constats dans CAP (hors dépôt) pour le livrable.
const fs = require('fs'), path = require('path');
const C = require('./retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'android', SECTION = process.env.SECTION || 'pieges';
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap';
const constats = { oublies: [], doutes: [], notes: [] };
const dit = (liste, o) => { constats[liste].push(o); console.log('  ·', liste, JSON.stringify(o).slice(0, 300)); };

// ce qui est grand, fixe et visible À L'ÉCRAN, hors décor permanent (menu, barre du bas, toasts, ronds flottants) : un calque candidat
const CANDIDATS = () => {
  const vw = innerWidth, vh = innerHeight, out = [];
  const permanent = '#menu, .menu, .barre-bas, #toast, #sortie-carte, .ac-flot, #cnx-test, .sec-bande, .gd-spot, .regle, .fantome, .apercu, .ac-bulle, #opsec .ops-rond, #sec-conf-rond, .tt-haut';
  for (const e of document.querySelectorAll('body *')) {
    if (e.closest(permanent)) continue;
    const cs = getComputedStyle(e); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = e.getBoundingClientRect(); if (r.width * r.height < 0.12 * vw * vh) continue;
    if (e.closest('[hidden]')) continue;
    out.push((e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0, 2).join('.') : '') + ' ' + Math.round(r.width) + '×' + Math.round(r.height));
  }
  return out;
};
const etat = p => p.evaluate(() => ({ h: location.hash, n: history.length, st: history.state, pile: CAL.pile.join(','), pousse: CAL.pousse, ignore: CAL.ignore, off: CAL.off, ouverts: calOuverts().join(',') }));
const cands = p => p.evaluate(CANDIDATS);
const rangerTout = async p => { await L.ranger(p); await p.keyboard.press('Escape').catch(() => {}); await L.calme(p, 200); };

// ─────────────── SCAN : toucher chaque bouton de chaque écran ───────────────
async function scan() {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p, NB = parseInt(process.env.NB || '14', 10);
  const toutes = await p.evaluate(() => [...new Set([...document.querySelectorAll('#menu a[href^="#"], .barre-bas a[href^="#"]')].map(a => a.getAttribute('href').slice(1)))]);
  // SCAN_DETAILS=1 : les FICHES (client-x-…, inter-x-…, devis-x-…) — une par famille, trouvée depuis la liste : c'est là que vivent le plus de boutons
  let candidates = toutes;
  if (process.env.SCAN_DETAILS) { const fam = {}; for (const r of toutes) { await L.aller(p, r); const hs = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-go]')].map(e => e.dataset.go).filter(g => /-x-/.test(g))); for (const g of hs) { const k = g.replace(/-x-.*/, ''); if (!fam[k]) fam[k] = g; } } candidates = Object.values(fam); console.log('  fiches trouvées :', candidates.join(',')); }
  const de = parseInt(process.env.SCAN_DE || '0', 10), a = parseInt(process.env.SCAN_A || '999', 10), routes = candidates.slice(de, a);
  console.log('  écrans du menu :', toutes.length, '· cette tranche :', routes.join(','));
  v('le menu donne des écrans (population non vide)', toutes.length >= 20, toutes.length);
  let touches = 0, nouveau = 0;
  const vus = new Set();
  for (const route of routes) {
    await L.aller(p, route); await rangerTout(p);
    const liste = await p.evaluate(() => {
      const sig = new Set(), out = [];
      document.querySelectorAll('#contenu button, #contenu [role="button"], #contenu [data-creer], #contenu [data-action], #contenu .btn, #contenu summary').forEach((e, i) => {
        const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.disabled || e.closest('[hidden]')) return;
        const lib = (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
        if (/supprim|déconnect|quitter|réinitial|vider|effacer/i.test(lib)) return;
        const s = e.tagName + '|' + lib + '|' + (e.dataset.action || e.dataset.creer || e.dataset.go || ''); if (sig.has(s)) return; sig.add(s);
        out.push({ i, lib, s });
      });
      return out;
    });
    let n = 0;
    for (const b of liste) {
      if (n >= NB) break; if (vus.has(route + '|' + b.s)) continue; vus.add(route + '|' + b.s); n++;
      const h0 = (await etat(p)).h;
      const ok = await p.evaluate(i => { const e = document.querySelectorAll('#contenu button, #contenu [role="button"], #contenu [data-creer], #contenu [data-action], #contenu .btn, #contenu summary')[i]; if (!e) return false; e.scrollIntoView({ block: 'center' }); return true; }, b.i);
      if (!ok) continue;
      const loc = p.locator('#contenu button, #contenu [role="button"], #contenu [data-creer], #contenu [data-action], #contenu .btn, #contenu summary').nth(b.i);
      try { if (c.doigt) await loc.tap({ timeout: 2500 }); else await loc.click({ timeout: 2500 }); } catch (e) { continue; }
      touches++; await p.waitForTimeout(380);
      const e1 = await etat(p), cd = await cands(p);
      if (e1.h !== h0) { nouveau++; await L.aller(p, route); await rangerTout(p); continue; }
      const orphelins = cd.filter(x => true);
      if (orphelins.length && !e1.ouverts) dit('oublies', { ecran: route, bouton: b.lib, calque: orphelins.join(' | '), profil: PROFIL });
      else if (orphelins.length) { const connus = e1.ouverts; /* un calque connu est ouvert : on vérifie qu'un Retour le ferme bien */ await C.retour(p); const e2 = await etat(p), c2 = await cands(p); if (c2.length && e2.h === h0) dit('oublies', { ecran: route, bouton: b.lib, calque: c2.join(' | ') + ' (reste après Retour ; connus avant : ' + connus + ')', profil: PROFIL }); if (e2.h !== h0) { await L.aller(p, route); } }
      await rangerTout(p);
      // la fenêtre fermée, on est toujours sur l'écran ?
      if ((await etat(p)).h !== '#' + route) await L.aller(p, route);
    }
  }
  v('population : des boutons ont été touchés (' + touches + ')', touches >= routes.length * 2, touches);
  v('aucun calque oublié trouvé en touchant les boutons (' + constats.oublies.length + ')', constats.oublies.filter(o => !/#cpsys/.test(o.calque)).length === 0, constats.oublies.slice(0, 3));   // #cpsys : la Comptabilité plein cadre est une ROUTE, décision écrite de la page
  v('aucune erreur de page pendant le scan', c.err.length === 0, c.err.slice(0, 3));
  dit('notes', { touches, navigations: nouveau, ecrans: routes.length });
  await L.fin(c);
}

// ─────────────── PIÈGES ───────────────
// la fenêtre qu'on ouvre et ferme pour les pièges, selon le rôle et l'appareil : « Nouveau client » (panneau) si le rôle le voit, sinon la feuille « Menu » (téléphone), sinon la recherche (ordinateur)
async function ouverture(c) {
  const p = c.p; await L.aller(p, 'accueil'); await L.aller(p, 'clients'); await L.calme(p, 300);
  if (await p.$('[data-action="clientNouveau"]')) return { ecran: 'clients', genre: 'panneau', ouvrir: () => L.toucher(c, '[data-action="clientNouveau"]'), vite: () => p.locator('[data-action="clientNouveau"]').first().evaluate(e => e.click()), fermer: () => L.toucher(c, '#calque .panneau .x') };
  const ecran = (await p.evaluate(() => (document.querySelector('#menu a[href^="#"]') || {}).hash)) ? 'majournee' : 'accueil';
  const ok = await p.evaluate(() => { try { return typeof vues === 'function' && !!vues().majournee; } catch (e) { return false; } });
  const e0 = ok ? 'majournee' : 'accueil';
  if (C.etroit(c)) return { ecran: e0, genre: 'panneau', ouvrir: () => L.toucher(c, '.tt-menu[data-menu="ouvrir"]'), vite: () => p.locator('.tt-menu[data-menu="ouvrir"]').first().evaluate(e => e.click()), fermer: () => L.toucher(c, '#calque .panneau .x') };
  return { ecran: e0, genre: 'recherche', ouvrir: async () => { await p.keyboard.press('Control+k'); await L.calme(p, 300); return await p.evaluate(() => !!document.getElementById('pal')); }, vite: async () => { await p.keyboard.press('Control+k'); }, fermer: async () => { await p.keyboard.press('Escape'); await L.calme(p, 300); return true; } };
}
async function pieges(qui) {
  const c = await L.ouvrir({ profil: PROFIL, qui: qui || 'marc' }), p = c.p, nom = (qui || 'marc') + ' · ' + PROFIL;
  const op = await ouverture(c), H = '#' + op.ecran;
  // l'écran d'AVANT : un autre écran du menu (pour la technicienne, « accueil » est un alias de « Ma journée » : même adresse, rien à distinguer)
  const AVANT = (await p.evaluate(() => [...new Set([...document.querySelectorAll('#menu a[href^="#"]')].map(a => a.getAttribute('href').slice(1)))])).find(r => r !== op.ecran && r !== 'accueil') || 'accueil';
  const prelude = async (ecran) => { await L.aller(p, AVANT); await L.aller(p, ecran || op.ecran); await rangerTout(p); };
  await prelude(); await C.defiler(p);
  v(nom + ' : la fenêtre d\'épreuve est ' + op.genre + ' sur ' + op.ecran + ' (population)', true);

  // 1. double Retour rapide : ouvre, deux Retour d'affilée sans attendre → on est sorti de l'écran (une fenêtre, un écran d'avant), pas coincé, pas d'erreur
  await op.ouvrir(); const o1 = await etat(p);
  v(nom + ' : [double Retour] fenêtre ouverte, UNE entrée', o1.ouverts === op.genre && o1.pousse === 1, o1);
  await p.goBack().catch(() => {}); await p.goBack().catch(() => {}); await C.attendre(p, 900); const d1 = await etat(p);
  v(nom + ' : [double Retour] fenêtre fermée ET on a quitté ' + op.ecran + ' (un seul Retour par entrée, les deux ont porté)', d1.ouverts === '' && d1.pousse === 0 && d1.h !== H && !d1.off, d1);
  await C.avancer(p); await L.calme(p, 300); const d1b = await etat(p);
  v(nom + ' : [double Retour] Avancer revient sur ' + op.ecran + ' sans rouvrir la fenêtre', d1b.h === H && d1b.ouverts === '' && d1b.pousse === 0, d1b);

  // 2. Retour pendant l'ouverture : on touche et on recule SANS attendre
  await L.aller(p, op.ecran); await rangerTout(p);
  await op.vite(); await p.goBack().catch(() => {}); await C.attendre(p, 1100); const e2 = await etat(p);
  const coherent = e2.pile === '' ? e2.pousse === 0 : e2.pile.split(',').length === e2.pousse;
  v(nom + ' : [Retour pendant l\'ouverture] l\'état reste cohérent (pile = entrées poussées), pas d\'erreur', coherent && !e2.off && c.err.length === 0, e2);
  let sortie = false; for (let k = 0; k < 3 && !sortie; k++) { const e = await etat(p); if (e.h !== H && e.ouverts === '') sortie = true; else await C.retour(p); }
  v(nom + ' : [Retour pendant l\'ouverture] jamais coincé : trois Retour au plus pour quitter ' + op.ecran, sortie, await etat(p));

  // 3. fenêtre dans une fenêtre : Nouvelle tâche (panneau) → choisir une date → Retour (la date), Retour (le panneau), Retour (l'écran) — si le rôle peut créer une tâche
  await L.aller(p, 'accueil'); await L.aller(p, 'taches'); await rangerTout(p);
  if (await p.$('[data-tnouv]')) {
    if (await L.toucher(c, '[data-tnouv]') && await L.toucher(c, '#calque .dt-btn')) {
      const t1 = await etat(p);
      v(nom + ' : [fenêtre dans une fenêtre] deux niveaux (panneau, date), deux entrées', t1.pile === 'panneau,date' && t1.pousse === 2, t1);
      await C.retour(p); const t2 = await etat(p);
      v(nom + ' : … Retour 1 : la date se ferme, le panneau RESTE', t2.pile === 'panneau' && t2.h === '#taches' && !!(await p.$('#calque .panneau')), t2);
      await C.retour(p); const t3 = await etat(p);
      v(nom + ' : … Retour 2 : le panneau se ferme, on reste sur Tâches', t3.ouverts === '' && t3.h === '#taches' && t3.pousse === 0, t3);
      await C.retour(p); const t4 = await etat(p);
      v(nom + ' : … Retour 3 : on quitte Tâches', t4.h !== '#taches', t4);
    } else v(nom + ' : [fenêtre dans une fenêtre] la tâche et sa date s\'ouvrent', false);
  } else v(nom + ' : [fenêtre dans une fenêtre] ce rôle ne crée pas de tâche (rien à jouer)', true);

  // 4. rechargement fenêtre ouverte puis Retour
  await prelude();
  await op.ouvrir(); await p.reload({ waitUntil: 'load' }).catch(() => {}); await p.waitForTimeout(1400); await L.calme(p, 400); const r1 = await etat(p);
  v(nom + ' : [rechargement] fenêtre ouverte puis page rechargée : rien ne se rouvre, pile vide', r1.ouverts === '' && r1.pousse === 0 && !r1.pile, r1);
  await C.retour(p); const r2 = await etat(p);
  v(nom + ' : … UN Retour : on quitte ' + op.ecran + ' (pas une fenêtre fantôme)', r2.h !== H && r2.ouverts === '', r2);

  // 5. vingt ouvertures-fermetures par la croix puis UN Retour : on quitte l'écran, history.length n'a pas grossi
  await prelude(); const base = await etat(p); let rate = 0;
  for (let i = 0; i < 20; i++) { if (!await op.ouvrir()) { rate++; continue; } if (!await op.fermer()) { rate++; await rangerTout(p); } }
  await C.attendre(p, 900); const v20 = await etat(p);
  v(nom + ' : [20 cycles] ' + (20 - rate) + '/20 ouvertures-fermetures jouées par la croix', rate <= 2, rate);
  v(nom + ' : [20 cycles] après les cycles : plus aucune entrée de fenêtre, history.length a grossi de ' + (v20.n - base.n) + ' (≤ 1)', v20.pousse === 0 && v20.ouverts === '' && v20.n - base.n <= 1, v20);
  await C.retour(p); const v21 = await etat(p);
  v(nom + ' : [20 cycles] UN Retour : on QUITTE ' + op.ecran + ' (on n\'est pas resté coincé sur une fenêtre fantôme)', v21.h !== H, v21);

  // 6. un bouton de fenêtre qui mène ailleurs : la feuille « Menu » (téléphone) ou la recherche (ordinateur), puis Retour
  await prelude();
  let mene = false;
  if (C.etroit(c)) { if (await L.toucher(c, '.tt-menu[data-menu="ouvrir"]')) mene = await L.toucher(c, '#calque .fm-liste [data-go]:not([data-go="' + op.ecran + '"]):not([data-go="accueil"]):not([data-go="majournee"]), #calque .fm-liste a[href^="#"]:not([href="#' + op.ecran + '"]):not([href="#accueil"]):not([href="#majournee"])'); }
  else { await p.keyboard.press('Control+k'); await L.calme(p, 300); await p.keyboard.type('tâche'); await L.calme(p, 300); await p.keyboard.press('Enter'); await L.calme(p, 600); mene = true; }
  const m1 = await etat(p);
  v(nom + ' : [bouton qui mène ailleurs] on est arrivé, aucune fenêtre, aucune entrée de fenêtre', mene && m1.h !== H && m1.ouverts === '' && m1.pousse === 0, m1);
  await C.retour(p); const m2 = await etat(p);
  v(nom + ' : … UN Retour ramène à ' + op.ecran + ' (pas une fenêtre fermée dans le vide)', m2.h === H, m2);
  v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
}

// ─────────────── CADRES ET MODULES ───────────────
async function cadres() {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p, nom = PROFIL;
  // a. Comptabilité plein cadre : un panneau ouvert DANS le cadre ; Retour ?
  await L.aller(p, 'accueil');
  const entree = C.etroit(c) ? async () => { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); return L.toucher(c, '#calque [data-go="comptabilite"]'); } : async () => L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
  v(nom + ' : on entre dans la Comptabilité par le menu (population)', await entree()); await p.waitForTimeout(2000); await L.calme(p, 400);
  const fr = L.cadre(p, /prototype-comptabilite\.html/);
  v(nom + ' : la Comptabilité plein cadre est affichée (cadre trouvé)', !!fr);
  if (fr) {
    const pose = await fr.evaluate(() => { for (const b of [...document.querySelectorAll('[data-a]')].filter(e => e.offsetParent)) { const a = b.dataset.a; if (/^(route|menu|aller|nav|mode|fermer|guide|apparence)/.test(a)) continue; try { b.click(); } catch (e) { continue; } if (document.querySelector('#calque').innerHTML) return a + ' · ' + (b.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 30); } return null; });
    await p.waitForTimeout(600);
    const ouvert = await fr.evaluate(() => !!document.querySelector('#calque .voile, #calque .panneau, #calque > *'));
    const h0 = (await etat(p)).h;
    if (pose && ouvert) {
      await C.retour(p); const e1 = await etat(p);
      const ferme = await fr.evaluate(() => !document.querySelector('#calque .voile, #calque .panneau, #calque > *')).catch(() => 'cadre parti');
      if (e1.h !== h0 || ferme !== true) dit('oublies', { calque: 'panneau DANS la Comptabilité plein cadre (« ' + pose + ' »)', profil: PROFIL, constat: 'Retour ' + (e1.h !== h0 ? 'quitte la Comptabilité (' + h0 + ' → ' + e1.h + ')' : 'ne ferme pas le panneau') + ', panneau ' + (ferme === true ? 'fermé' : 'resté ouvert') });
      v(nom + ' : [Comptabilité] panneau ouvert dans le cadre (« ' + pose + ' ») : Retour ferme le panneau et laisse la Comptabilité', e1.h === h0 && ferme === true, { e1, ferme });
    } else dit('notes', { cadre: 'comptabilité', pose, ouvert, profil: PROFIL });
    // le tiroir du menu de la Comptabilité (téléphone) : un calque du cadre aussi — on y revient d'abord (le Retour d'au-dessus l'a quittée)
    await L.aller(p, 'accueil'); await entree(); await p.waitForTimeout(1800); await L.calme(p, 300);
    await fr.evaluate(() => { try { fermer(); } catch (e) {} document.body.classList.remove('menu-ouvert'); });
    const burger = await fr.evaluate(() => { const b = [...document.querySelectorAll('[data-a="menu"]')].find(x => x.offsetParent); if (!b) return false; b.click(); return document.body.classList.contains('menu-ouvert'); });
    if (burger) { const h0 = (await etat(p)).h; await C.retour(p); const e1 = await etat(p), ferme = await fr.evaluate(() => !document.body.classList.contains('menu-ouvert')).catch(() => 'cadre parti');
      if (e1.h !== h0 || ferme !== true) dit('oublies', { calque: 'tiroir du menu de la Comptabilité (téléphone)', profil: PROFIL, constat: 'Retour ' + (e1.h !== h0 ? 'quitte la Comptabilité (' + h0 + ' → ' + e1.h + ')' : 'laisse la Comptabilité') + ', tiroir ' + (ferme === true ? 'fermé' : 'resté ouvert') });
      v(nom + ' : [Comptabilité] tiroir du menu : Retour le ferme et laisse la Comptabilité', e1.h === h0 && ferme === true, { e1, ferme }); }
    else dit('notes', { cadre: 'tiroir de la Comptabilité absent à cette largeur', profil: PROFIL });
  }
  await L.fin(c);
}
// b. OP Security (téléphone simulé), feuille de la carte du planning, atelier : un calque INTERNE au cadre (confirmation, aperçu)
async function autres() {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p, nom = PROFIL;
  await L.aller(p, 'accueil'); await L.aller(p, 'clients'); await rangerTout(p);
  const base = async (r) => { await L.aller(p, 'accueil'); await L.aller(p, r || 'clients'); await rangerTout(p); };
  // OP Security : le rond n'existe que sur un écran étroit (sur grand écran le téléphone est un volet permanent)
  const rond = await p.evaluate(() => { const e = document.querySelector('#opsec .ops-rond'); if (!e) return 'absent'; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return cs.display === 'none' || !r.width ? 'masqué' : 'visible'; });
  if (rond === 'visible') {
    const h0 = (await etat(p)).h; await L.toucher(c, '#opsec .ops-rond'); await p.waitForTimeout(400);
    const ouvert = await p.evaluate(() => document.getElementById('opsec').hasAttribute('data-ouvert'));
    v(nom + ' : OP Security : le téléphone simulé s\'ouvre (population)', ouvert);
    if (ouvert) { await C.retour(p); const e1 = await etat(p), ferme = await p.evaluate(() => !document.getElementById('opsec').hasAttribute('data-ouvert'));
      if (e1.h !== h0 || !ferme) dit('oublies', { calque: 'OP Security (le téléphone simulé, ouvert par le rond 📱)', profil: PROFIL, constat: 'Retour ' + (e1.h !== h0 ? 'quitte l\'écran (' + h0 + ' → ' + e1.h + ')' : 'laisse l\'écran') + ', téléphone ' + (ferme ? 'fermé' : 'resté ouvert') });
      v(nom + ' : OP Security : Retour ferme le téléphone et laisse l\'écran', e1.h === h0 && ferme, { e1, ferme }); }
  } else {
    await base('clients');
    // le rond est masqué/absent : le téléphone s'ouvre par « montel » (menu) ou [data-ops-ouvrir] → on appelle les fonctions de la page, puis Retour
    const h0 = (await etat(p)).h; const ouvert = await p.evaluate(() => { try { opsMonter(); opsOuvrir(); return document.getElementById('opsec').hasAttribute('data-ouvert') && getComputedStyle(document.querySelector('#opsec .ops-fenetre')).display !== 'none'; } catch (e) { return false; } });
    if (ouvert) { await p.waitForTimeout(400); await C.retour(p); const e1 = await etat(p), ferme = await p.evaluate(() => !document.getElementById('opsec').hasAttribute('data-ouvert'));
      const large = await p.evaluate(() => opsLarge());
      if (!large && (e1.h !== h0 || !ferme)) dit('oublies', { calque: 'OP Security (le téléphone simulé, ouvert par le menu)', profil: PROFIL, constat: 'Retour ' + (e1.h !== h0 ? 'quitte l\'écran (' + h0 + ' → ' + e1.h + ')' : 'laisse l\'écran') + ', téléphone ' + (ferme ? 'fermé' : 'resté ouvert') });
      if (!large) v(nom + ' : OP Security (ouvert par le menu) : Retour ferme le téléphone et laisse l\'écran', e1.h === h0 && ferme, { e1, ferme }); else dit('notes', { opsec: 'volet permanent à cette largeur (pas un calque)', profil: PROFIL }); }
    else dit('notes', { opsec: rond + ' / ne s\'ouvre pas', profil: PROFIL });
  }
  await p.evaluate(() => { try { opsFermer(); } catch (e) {} });
  await rangerTout(p);
  // la confirmation OP Security d'un geste sensible (#sec-conf, plein écran, en attente du téléphone) : les sondes entrent par ?auto= qui l'accorde d'office → on le coupe pour la voir
  await base('taches'); const h00 = (await etat(p)).h;
  const sec = await p.evaluate(() => { try { SECU.auto = false; secuGarde('banque-ouvrir', () => {}); return !!document.getElementById('sec-conf'); } catch (e) { return 'exception : ' + e.message; } });
  await p.waitForTimeout(500);
  if (sec === true) {
    await C.retour(p); const e1 = await etat(p), reste = await p.evaluate(() => !!document.getElementById('sec-conf'));
    if (e1.h !== h00 || reste) dit('oublies', { calque: 'confirmation OP Security d\'un geste sensible (#sec-conf, plein écran)', profil: PROFIL, constat: 'Retour ' + (e1.h !== h00 ? 'quitte l\'écran (' + h00 + ' → ' + e1.h + ')' : 'laisse l\'écran') + ', confirmation ' + (reste ? 'restée ouverte' : 'fermée') });
    v(nom + ' : confirmation OP Security : Retour la ferme et laisse l\'écran', e1.h === h00 && !reste, { e1, reste });
    await p.evaluate(() => { try { secuConfFermer(true, false, true); } catch (e) {} });
  } else dit('notes', { sec_conf: sec, profil: PROFIL });
  await p.evaluate(() => { try { SECU.auto = true; } catch (e) {} }); await rangerTout(p);
  // la feuille de la carte du planning (téléphone, tablette en hauteur) : une épingle choisie
  if (C.etroit(c)) {
    await base('planning'); if (await L.toucher(c, '[data-plvue="carte"]')) { await L.calme(p, 600);
      const choisi = await L.toucher(c, '[data-crsel]'); await L.calme(p, 600); const feuille = await p.evaluate(() => !!document.getElementById('cr-ftel'));
      if (choisi && feuille) { const h0 = (await etat(p)).h; await C.retour(p); const e1 = await etat(p), reste = await p.evaluate(() => !!document.getElementById('cr-ftel'));
        dit('doutes', { calque: 'feuille de la carte du planning (#cr-ftel, une tournée choisie)', profil: PROFIL, constat: 'Retour ' + (e1.h !== h0 ? 'quitte le Planning (' + h0 + ' → ' + e1.h + ')' : 'reste sur le Planning') + ', feuille ' + (reste ? 'restée' : 'fermée') });
      } else dit('notes', { carte: 'pas de feuille', choisi, feuille, profil: PROFIL }); } }
  await rangerTout(p);
  // la visite parlée lancée DEPUIS l'application (immLancer) : Retour la ferme, sans erreur ; on note où l'on est
  await base('clients'); const vh = await p.evaluate(() => { try { immLancer(0); return location.hash; } catch (e) { return 'exception : ' + e.message; } }); await p.waitForTimeout(900);
  const bulle = await p.evaluate(() => !!document.getElementById('gd-bulle'));
  if (bulle) { const avant = await etat(p); await C.retour(p); await p.waitForTimeout(400); const apres = await etat(p), reste = await p.evaluate(() => !!document.getElementById('gd-bulle') || !!document.getElementById('gd-spot') && getComputedStyle(document.getElementById('gd-spot')).display !== 'none');
    v(nom + ' : [visite] Retour ferme la visite (bulle et halo) et n\'ouvre pas autre chose', !reste && apres.ouverts === '' && apres.pousse === 0, { avant, apres });
    await p.evaluate(() => { try { gdQuitter(); } catch (e) {} }); }
  else dit('notes', { visite: 'ne se lance pas par immLancer (' + vh + ')', profil: PROFIL });
  // l'atelier : un calque INTERNE (aperçu, fenêtre) puis Retour
  await L.aller(p, 'accueil'); await L.aller(p, 'devis'); const A = C.A;
  const f = await A.ouvrirAtelier(c, 'devis', null);
  v(nom + ' : l\'atelier s\'ouvre (population)', !!f);
  if (f) {
    await A.composerDevis(c, f, { client: 'vp', objet: 'Recontrôle du retour', articles: [{ ref: 'EL-ALL', qte: 1 }] }); await p.waitForTimeout(400);
    const ouvreInterne = await f.evaluate(() => { const essais = [...document.querySelectorAll('[data-act]')].filter(e => e.offsetParent && /apercu|aperçu|envoyer|signer|enregistrer/i.test((e.dataset.act || '') + ' ' + (e.textContent || ''))); for (const b of essais) { b.click(); if (document.querySelector('.voile:not(.fen-v)') || (typeof apercuOuvert === 'function' && apercuOuvert()) || document.getElementById('cl-signer')) return (b.dataset.act || b.textContent || '').trim().slice(0, 30); } return null; });
    await p.waitForTimeout(700);
    if (ouvreInterne) {
      const avant = await f.evaluate(() => ({ vue: S.vue, voile: !!document.querySelector('.voile:not(.fen-v)'), apercu: typeof apercuOuvert === 'function' && apercuOuvert(), nav: NAV.n }));
      await C.retour(p); await p.waitForTimeout(500); const h1 = await etat(p);
      const apres = await f.evaluate(() => ({ vue: S.vue, voile: !!document.querySelector('.voile:not(.fen-v)'), apercu: typeof apercuOuvert === 'function' && apercuOuvert(), nav: NAV.n })).catch(() => null);
      v(nom + ' : [atelier] calque interne (« ' + ouvreInterne + ' ») : Retour le ferme ET l\'éditeur reste (' + JSON.stringify(avant) + ' → ' + JSON.stringify(apres) + ')', !!apres && apres.vue === 'editeur' && !apres.voile && !apres.apercu && h1.h === '#devis', { h1, avant, apres });
    } else dit('notes', { atelier: 'aucun calque interne trouvé par les boutons testés', profil: PROFIL });
  }
  v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
}
// c. la Boîte mail : le composeur (« Nouveau message ») et le tiroir des boîtes, au Retour
async function courrier() {
  const M = require('./mail-commun.js'), c = await M.entrer({ profil: PROFIL }), p = c.p, nom = PROFIL;
  const e = () => p.evaluate(() => { const r = window.R && window.R(); return { h: location.hash, n: history.length, st: history.state, comp: !!(r && r.querySelector('#overlay:not(.ov-menu)')), tiroir: !!(r && r.querySelector('#app.nav-open')), vue: r ? r.querySelector('#app').getAttribute('data-view') : null, pile: CAL.pile.join(','), pousse: CAL.pousse }; });
  const e0 = await e(); v(nom + ' : la Boîte mail est affichée (population)', e0.h === '#boiteMail' && !!e0.vue, e0);
  // le composeur
  await p.evaluate(() => window.R().querySelector('#btnCompose').click()); await p.waitForTimeout(800); const e1 = await e();
  v(nom + ' : le composeur est ouvert (population)', e1.comp, e1);
  await C.retour(p); await p.waitForTimeout(400); const e2 = await e();
  const quitte = e2.h !== '#boiteMail';
  if (e1.comp && (quitte || e2.comp)) dit('oublies', { calque: 'composeur du courrier (« Nouveau message »)', profil: PROFIL, constat: 'Retour ' + (quitte ? 'quitte la Boîte mail (' + e1.h + ' → ' + e2.h + ')' : 'laisse l\'écran') + ', composeur ' + (e2.comp ? 'resté ouvert' : 'fermé') });
  v(nom + ' : Retour ferme le composeur et reste dans la Boîte mail', !e2.comp && !quitte, { e1, e2 });
  // le tiroir des boîtes (tablette)
  await L.aller(p, 'accueil'); await L.aller(p, 'boiteMail'); await M.pret(p); await p.waitForTimeout(400);
  const bouton = await p.evaluate(() => { const b = window.R().querySelector('#btnNav'); if (!b) return 'absent'; const r = b.getBoundingClientRect(); return r.width ? 'visible' : 'masqué'; });
  if (bouton === 'visible' && PROFIL === 'ipad') {
    await p.evaluate(() => window.R().querySelector('#btnNav').click()); await p.waitForTimeout(500); const t1 = await e();
    if (t1.tiroir) { await C.retour(p); const t2 = await e(); if (t2.tiroir || t2.h !== '#boiteMail') dit('oublies', { calque: 'tiroir des boîtes mail (iPad)', profil: PROFIL, constat: 'Retour ' + (t2.h !== '#boiteMail' ? 'quitte la Boîte mail' : 'laisse le tiroir') }); v(nom + ' : tiroir des boîtes : Retour le ferme et reste dans la Boîte mail', !t2.tiroir && t2.h === '#boiteMail', { t1, t2 }); }
  }
  v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await M.fin(c);
}

(async () => {
  if (SECTION === 'scan') await scan();
  else if (SECTION === 'pieges') await pieges(process.env.QUI);
  else if (SECTION === 'roles') { for (const q of ['marc', 'julie', 'sm', 'kb']) { try { await pieges(q); } catch (e) { v(q + ' : la sonde va jusqu\'au bout', false, String(e.message).split('\n')[0].slice(0, 200)); } } }
  else if (SECTION === 'cadres') await cadres();
  else if (SECTION === 'autres') await autres();
  else if (SECTION === 'courrier') await courrier();
  const ko = L.bilan();
  try { fs.mkdirSync(CAP, { recursive: true }); fs.writeFileSync(path.join(CAP, `retour-recontrole-${SECTION}-${PROFIL}${process.env.SCAN_DE ? '-' + process.env.SCAN_DE : ''}.json`), JSON.stringify(constats, null, 1)); } catch (e) {}
  await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.message).split('\n')[0].slice(0, 200)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
