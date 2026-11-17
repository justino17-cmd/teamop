// Sonde « secu-structure » (double authentification, étape 2, §§ 2.2, 8.2, 9) : l'état de départ, où paraît le téléphone selon la LARGEUR de la fenêtre, et ce que les écrans mesurent.
// Population : l'état de départ (6 personnes, 2 téléphones prêts, 1 compte verrouillé, les deux lignes d'avant) puis, pour chaque profil (7 + l'iPad en paysage), les écrans de
// connexion, d'activation et de confirmation : le téléphone à droite (≥ 1100 px) ou en vue plein écran (en dessous), la pastille, le bouton rond, le NOMBRE lisible, débordement
// (contre la largeur POSÉE), cibles ≥ 44 px, champs ≥ 16 px, textes écrasés, téléphone SOMBRE de jour comme de nuit, aucun élément flottant sur l'application en vue étroite,
// et, à 1100 px et plus, le bouton rond ne recouvre aucune cible de plus de 44 px des écrans courants.
// Usage : PROFILS=mac,iphone NUIT=1 CAP=1 node secu-structure.js   (rend « N ✓ · M ✗ »)
const S = require('./secu-commun.js'), L = S.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/double-auth/';
L.PROFILS.ipadl = { w:1180, h:820, doigt:true, ua:L.PROFILS.ipad.ua, encoches:{ top:24, bottom:20, left:0, right:0 } };   // l'iPad en paysage : le seul profil tactile de 1100 à 1199 px
const TOUS = ['mac', 'mac720', 'windows', 'ipadl', 'ipad', 'iphone', 'android', 'petit'];
const PROFILS = (process.env.PROFILS || TOUS.join(',')).split(','), NUIT = !!process.env.NUIT, SEUIL = 1100;
const jn = NUIT ? 'nuit' : 'jour';
const lum = rgb => { const m = String(rgb).match(/[\d.]+/g); if (!m) return 1; const [r, g, b] = m.slice(0, 3).map(x => { x = Number(x) / 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
const croise = (a, b) => a && b && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
const rect = (c, sel) => c.p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(), cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || r.width < 1) return null; return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height }; }, sel);
(async () => {
  console.log('\n── 1. l’état de départ de la démonstration (§ 8.2) ──');
  { const c = await S.ouvrir({ profil:'mac', nuit:NUIT });
    const d = await c.p.evaluate(() => ({ n:EQUIPE.length, ids:EQUIPE.map(p => p.k).join(), prets:EQUIPE.filter(p => SECU.comptes[p.k].tel).map(p => p.k).join(), verr:EQUIPE.filter(p => SECU.comptes[p.k].verrou).map(p => p.k).join(), prov:EQUIPE.filter(p => SECU.comptes[p.k].prov).length,
      histoKb:SECU.comptes.kb.histo.length, histoLr:SECU.comptes.lr.histo.length, reconnuKb:SECU.comptes.kb.appareils.length, depart:{ pin:SECU_DEPART.pin, tel:SECU_DEPART.telPrets.join(), verr:SECU_DEPART.verrouilles.join() }, resteCase:!!document.getElementById('cn-reste') || /Rester connecté/.test(document.getElementById('cnx').textContent), cases:!!document.querySelector('[data-sec="cases-demo"]'), ouvert:!!document.getElementById('opsec') }));
    v('population : 6 personnes, 2 téléphones prêts (Karim, Léa), 1 compte verrouillé (Léa), 4 provisoires', d.n === 6 && d.prets === 'kb,lr' && d.verr === 'lr' && d.prov === 4, d);
    v('Karim : un appareil reconnu et une ligne d’historique ; Léa : une ligne d’historique (les deux lignes d’avant de la Sécurité)', d.reconnuKb >= 1 && d.histoKb >= 1 && d.histoLr >= 1, d);
    v('le départ est déclaré dans UN objet (SECU_DEPART) et il dit la même chose', d.depart.tel === 'kb,lr' && d.depart.verr === 'lr', d.depart);
    v('la case « Rester connecté » n’existe plus sur l’écran de connexion', !d.resteCase, d);
    v('l’encadré « Démonstration » est sous la carte de connexion, le téléphone est monté', d.cases && d.ouvert, d);
    const pr = await c.p.evaluate(() => ({ l:Object.keys(localStorage), s:Object.keys(sessionStorage) })); v('le rangement ne tient que le lien de l’entreprise (aucune clé de session ni de mot de passe)', pr.l.concat(pr.s).every(k => /^opg_proto_(espace|mode|barre|vues)$/.test(k)), pr);
    v('aucune erreur JavaScript au démarrage', c.err.length === 0, c.err.slice(0, 2)); await L.fin(c); }

  console.log('\n── 2. les profils : ' + PROFILS.join(', ') + ' · ' + jn + ' ──');
  for (const nom of PROFILS) {
    const c = await S.ouvrir({ profil:nom, nuit:NUIT }), W = c.largeur, H = c.hauteur, large = W >= SEUIL, tag = nom + ' ' + W + '×' + H + ' ' + jn;
    // 2a. l'écran de connexion
    const cn = await c.p.evaluate(() => ({ fen:!!document.querySelector('#opsec .ops-fenetre'), pastille:!!document.querySelector('#cnx .ops-pastille'), rond:!!document.querySelector('#opsec .ops-rond') }));
    const fen = await rect(c, '#opsec .ops-fenetre'), past = await rect(c, '#cnx .ops-pastille');
    if (large) {
      v(tag + ' · connexion : le téléphone est posé à droite, ouvert d’office (cadre de ' + (fen && Math.round(fen.width)) + ' px)', !!fen && fen.width >= 270 && fen.width <= 340, fen);
      v(tag + ' · le cadre reste dans la fenêtre (16 px des bords, ' + (fen && Math.round(fen.bottom)) + ' sur ' + H + ')', !!fen && fen.right <= W - 8 && fen.right >= W - 40 && fen.top >= 0 && fen.bottom <= H + 0.5, fen);
      const card = await rect(c, '#cnx .cn-carte'), demo = await rect(c, '[data-sec="cases-demo"]');
      v(tag + ' · le téléphone ne recouvre ni la carte de connexion ni l’encadré « Démonstration »', !croise(fen, card) && !croise(fen, demo), { fen, card, demo });
      v(tag + ' · pas de pastille « Ouvrir OP Security » (le téléphone est déjà là)', !past, past);
    } else {
      v(tag + ' · connexion : pas de cadre posé à côté, la pastille « Ouvrir OP Security » est là', !fen && !!past, { fen, past });
      v(tag + ' · la pastille est une cible de 44 px au moins et reste dans la fenêtre', !!past && past.height >= 44 && past.left >= 0 && past.right <= W + 0.5, past);
    }
    const db = await L.deborde(c); v(tag + ' · connexion : la page ne glisse pas de côté (' + db.seconde + ' px pour ' + W + ')', db.bouge === 0 && db.seconde <= W, db);
    const dg = await L.doigts(c.p, '#cnx'); v(tag + ' · connexion : cibles ≥ 44 px, champs ≥ 16 px, aucun texte écrasé', dg.petits.length === 0 && dg.champs.length === 0 && dg.ecrases.length === 0, dg);
    if (process.env.CAP) await L.capture(c, CAP + 'structure-' + nom + '-connexion-' + jn + '.png');
    // 2b. le téléphone : toujours sombre, et la vue plein écran en étroit
    if (!large) { await c.p.click('#cnx .ops-pastille'); await c.p.waitForTimeout(500); } else await S.telephone(c, 'marc');
    const ec = await c.p.evaluate(() => { const e = document.querySelector('#opsec .ops-ecran'); const cs = getComputedStyle(e); return { fond:cs.backgroundColor, couleur:cs.color }; });
    v(tag + ' · le téléphone est SOMBRE (' + ec.fond + ') de jour comme de nuit', lum(ec.fond) < 0.1, ec);
    if (!large) { const cad = await rect(c, '#opsec .ops-cadre'), rev = await rect(c, '#opsec .ops-revenir');
      if (W <= 760) { const fond = await c.p.evaluate(() => getComputedStyle(document.querySelector('#opsec .ops-fenetre')).backgroundColor);
        v(tag + ' · vue étroite : le téléphone remplit la largeur (' + (cad && Math.round(cad.width)) + ' px pour ' + W + ') sans cadre, sur un fond opaque (' + fond + ')', !!cad && cad.width >= W - 1 && cad.width <= W + 1 && /^rgb\(/.test(fond), { cad, fond }); }
      else v(tag + ' · iPad en portrait : le téléphone encadré (' + (cad && Math.round(cad.width)) + ' × ' + (cad && Math.round(cad.height)) + ') est centré sur le fond sombre', !!cad && Math.abs(cad.width - 320) < 2 && Math.abs((cad.left + cad.width / 2) - W / 2) < 2, cad);
      v(tag + ' · « ‹ Revenir à OP GESTION » est là, cible de 44 px et plus', !!rev && rev.height >= 43.5, rev); }
    const dbp = await L.deborde(c); v(tag + ' · le téléphone ouvert : la page ne glisse pas de côté', dbp.bouge === 0 && dbp.seconde <= W, dbp);
    const dgp = await L.doigts(c.p, '#opsec'); v(tag + ' · téléphone : cibles ≥ 44 px, champs ≥ 16 px, aucun texte écrasé', dgp.petits.length === 0 && dgp.champs.length === 0 && dgp.ecrases.length === 0, dgp);
    if (process.env.CAP) await L.capture(c, CAP + 'structure-' + nom + '-telephone-' + jn + '.png');
    if (!large) { await c.p.click('#opsec .ops-revenir'); await c.p.waitForTimeout(400); } else await S.fermerTel(c);
    // 2c. l'écran d'activation (Marc) et l'écran de confirmation (Karim : téléphone prêt)
    const prov = await S.provisoire(c, 'marc'); await S.connecter(c, 'marc', prov); const a = await S.attendreSel(c, '#cn-form-activer', 8000);
    v(tag + ' · « Active OP Security » s’ouvre', a); if (a) {
      const dbA = await L.deborde(c); v(tag + ' · activation : la page ne glisse pas de côté', dbA.bouge === 0 && dbA.seconde <= W, dbA);
      const dgA = await L.doigts(c.p, '#cnx'); v(tag + ' · activation : cibles ≥ 44 px, champs ≥ 16 px, aucun texte écrasé', dgA.petits.length === 0 && dgA.champs.length === 0 && dgA.ecrases.length === 0, dgA);
      const code = await rect(c, '[data-sec="code-activation"]'); v(tag + ' · le code d’activation (12 signes) tient dans la carte sans sortir', !!code && code.left >= 0 && code.right <= W + 0.5, code);
      if (process.env.CAP) await L.capture(c, CAP + 'structure-' + nom + '-activation-' + jn + '.png'); }
    await c.p.evaluate(() => { SECU.pc = { ecran:null, k:null, demandeId:null }; cnxMontrer('', 'karim'); }); await S.attendreSel(c, '#cn-id', 6000); await c.p.waitForTimeout(500);
    const clairK = await S.provisoire(c, 'kb'); await S.connecter(c, 'kb', clairK); const nb = await S.attendreSel(c, '[data-sec="nombre"]', 8000);
    v(tag + ' · « Confirme sur ton téléphone » : le nombre est affiché', nb);
    if (nb) {
      await c.p.evaluate(() => document.querySelector('[data-sec="nombre"]').scrollIntoView({ block:'center' })); await c.p.waitForTimeout(300);
      const n = await c.p.evaluate(() => { const e = document.querySelector('[data-sec="nombre"]'), r = e.getBoundingClientRect(); return { fs:parseFloat(getComputedStyle(e).fontSize), h:r.height, l:r.left, r:r.right, t:r.top, b:r.bottom, texte:e.textContent.trim(), vw:innerWidth, vh:innerHeight }; });
      v(tag + ' · le nombre est lisible : chiffres de ' + Math.round(n.fs) + ' px (56 au moins), entier dans la fenêtre', n.fs >= 56 && n.l >= 0 && n.r <= W + 0.5 && n.t >= 0 && n.b <= H + 0.5 && /^[1-9][0-9]$/.test(n.texte), n);
      if (!large) { const pa = await rect(c, '#cnx .ops-pastille'), nr = await rect(c, '[data-sec="nombre"]'); v(tag + ' · la pastille ne recouvre pas le nombre', !croise(pa, nr), { pa, nr }); }
      const dbC = await L.deborde(c); v(tag + ' · confirmation : la page ne glisse pas de côté', dbC.bouge === 0 && dbC.seconde <= W, dbC);
      const dgC = await L.doigts(c.p, '#cnx'); v(tag + ' · confirmation : cibles ≥ 44 px, champs ≥ 16 px, aucun texte écrasé', dgC.petits.length === 0 && dgC.champs.length === 0 && dgC.ecrases.length === 0, dgC);
      if (process.env.CAP) await L.capture(c, CAP + 'structure-' + nom + '-confirmation-' + jn + '.png');
      // approuver sur le téléphone puis regarder l'application
      const nombre = n.texte; await S.approuver(c, 'kb', nombre); await S.attendreApp(c, 15000); await c.p.waitForTimeout(1400); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await c.p.waitForTimeout(500);   /* le guide s'ouvre 900 ms après la connexion */
      const ap = await c.p.evaluate(() => ({ s:SESSION, cnx:!!document.getElementById('cnx') })); v(tag + ' · le nombre juste ouvre l’application de Karim', ap.s === 'kb' && !ap.cnx, ap);
      // 2d. après la connexion
      const fl = await c.p.evaluate(() => { const o = document.getElementById('opsec'), r = []; if (!o) return r; o.querySelectorAll('*').forEach(e => { const cs = getComputedStyle(e), b = e.getBoundingClientRect(); if (cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0 && b.height > 0 && (cs.position === 'fixed')) r.push(e.className + ' ' + Math.round(b.width) + '×' + Math.round(b.height)); }); return r; });
      if (!large) v(tag + ' · vue étroite : plus RIEN ne flotte sur l’application après la connexion (' + fl.length + ' élément)', fl.length === 0, fl);
      else { const rond = await rect(c, '#opsec .ops-rond'); await c.p.waitForTimeout(1300);   /* le bouton se range à la seconde qui suit (secuTic) */
        const rond2 = await rect(c, '#opsec .ops-rond'); v(tag + ' · bouton rond (52 px) au bas à droite : à 16 px des bords, ou décalé d’un cran s’il recouvrirait une cible', !!rond2 && Math.abs(rond2.width - 52) < 2 && (W - rond2.right) >= 15 && (W - rond2.right) <= 140 && (H - rond2.bottom) >= 15 && (H - rond2.bottom) <= 200, rond2);
        if (nom === 'mac' || nom === 'mac720') for (const vue of ['accueil', 'planning', 'interventions', 'clients', 'equipe']) { await L.aller(c.p, vue); await c.p.waitForTimeout(1400);
          const rc = await rect(c, '#opsec .ops-rond'), sous = await c.p.evaluate(() => { const o = []; document.querySelectorAll('#contenu button, #contenu a, #contenu [data-go], #contenu input, #contenu select, #contenu summary, #contenu [role=button]').forEach(e => { const b = e.getBoundingClientRect(); if (b.width >= 44 && b.height >= 20 && b.bottom > 0 && b.top < innerHeight && getComputedStyle(e).visibility !== 'hidden') o.push({ t:(e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30), left:b.left, top:b.top, right:b.right, bottom:b.bottom }); }); return o; });
          const touche = sous.filter(x => croise(rc, x)); v(tag + ' · « ' + vue + ' » : le bouton rond ne recouvre aucune des ' + sous.length + ' cibles', sous.length > 0 && touche.length === 0, touche.slice(0, 3)); }
        if (process.env.CAP) await L.capture(c, CAP + 'structure-' + nom + '-appli-' + jn + '.png'); }
    }
    v(tag + ' · aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('ERR', e); process.exit(1); });
