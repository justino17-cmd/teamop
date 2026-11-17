// Campagne « coque », RECONTRÔLE ADVERSE (17 novembre 2026) — ce que les corrections de la coque ont pu CASSER à côté.
// Les sondes coque-*.js gardent chaque défaut annoncé ; celle-ci cherche autour : l'écran de connexion devant lequel on tape des
// raccourcis, la recherche (Ctrl/Cmd+K) ouverte sous un guide ou une visionneuse, le focus qui boucle dans la fenêtre du dessus
// (fenêtre de création, panneau, atelier de devis, Comptabilité plein écran), la reconnexion d'une autre personne après une déconnexion.
// Chaque contrôle compte d'abord sa population (« la fenêtre existe ») : un zéro sur du vide ne prouve rien.
// Usage : PROFIL=mac|windows SECTION=a|b|c|d|e node coque-recontrole.js   (« N ✓ · M ✗ », sort en 1 si un contrôle tombe)
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', SEC = (process.env.SECTION || 'a,b,c,d,e').split(',');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const DOIGT = !!L.PROFILS[PROFIL].doigt;
const h1 = p => p.evaluate(() => ((document.querySelector('#contenu h1') || {}).textContent || '').replace(/\s+/g, ' ').trim());
// qui est tout en haut au centre de l'écran : l'élément et ses ancêtres (id/classe), pour dire QUI reçoit le clic
const dessus = (p, x, y) => p.evaluate(([x, y]) => { let e = document.elementFromPoint(x, y), s = []; for (let n = e; n && n !== document.body; n = n.parentElement) s.push(n.id ? '#' + n.id : (n.className && typeof n.className === 'string' ? '.' + n.className.split(' ')[0] : n.tagName)); return s.join('<'); }, [x, y]);
const centre = c => [Math.round(c.largeur / 2), Math.round(c.hauteur / 2)];
// le focus est-il dans la fenêtre dont le sélecteur est donné ?
const dedans = (p, sel) => p.evaluate(sel => { const m = document.querySelector(sel), a = document.activeElement; return !!m && !!a && m.contains(a); }, sel);
async function tabs(p, sel, n, maj) { let sorties = 0, faits = 0; for (let i = 0; i < n; i++) { await p.keyboard.press(maj ? 'Shift+Tab' : 'Tab'); faits++; if (!await dedans(p, sel)) sorties++; } return { sorties, faits }; }
const ouvertes = p => p.evaluate(() => ({ pal: !!document.getElementById('pal'), panneau: !!document.querySelector('#calque .panneau'), fenetre: !!document.querySelector('.fen-voile'), cp: (() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden; })(), contenu: ((document.getElementById('contenu') || {}).innerText || '').trim().length, menu: ((document.getElementById('menu') || {}).children || []).length }));
const CMD = PROFIL === 'mac' && false ? 'Meta' : 'Control';
const ESPACE = { ok: 0 };

(async () => {
  // ── A : l'écran de connexion reçoit des raccourcis du clavier : rien de l'application ne doit s'ouvrir derrière ─────────────────────
  if (SEC.includes('a')) {
    const c = await L.ouvrir({ profil: PROFIL, qui: null, attente: 400 }), p = c.p;
    v('A population : on est bien sur un écran de connexion (lien ou identifiant)', await L.attendre(p, () => !!document.getElementById('cnx'), 9000));
    await L.attendre(p, () => !!document.getElementById('cn-form-lien') || !!document.getElementById('cn-form'), 9000);
    await p.waitForTimeout(1500);
    // le focus est sur la page (pas dans un champ) : on tape tout ce qui, dans l'application, déclenche quelque chose
    await p.evaluate(() => { if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); });
    for (const k of [CMD + '+k', 'Shift+?', '?', 'n', 'd', 'c', 'a', '/', CMD + '+1', CMD + '+[', 'ArrowDown']) { await p.keyboard.press(k); await p.waitForTimeout(120); }
    await p.waitForTimeout(500);
    const o = await ouvertes(p);
    v('A Ctrl+K, ?, N, D, C, A, /, Ctrl+1 devant la connexion : ni recherche, ni panneau, ni fenêtre, ni Comptabilité', !o.pal && !o.panneau && !o.fenetre && !o.cp, o);
    v('A … et rien de l’application n’a été dessiné derrière (menu vide, contenu vide)', o.contenu === 0 && o.menu === 0, o);
    // changer l'adresse à la main pendant la connexion (un lien partagé, un favori) ne dessine rien non plus
    await p.evaluate(() => { location.hash = '#comptabilite'; }); await p.waitForTimeout(700);
    await p.evaluate(() => { location.hash = '#clients'; }); await p.waitForTimeout(700);
    const o2 = await ouvertes(p);
    v('A une adresse tapée pendant la connexion (#comptabilite, #clients) ne dessine ni Comptabilité plein écran ni écran', !o2.cp && o2.contenu === 0, o2);
    // la frappe dans le champ identifiant ne déclenche rien non plus (n, d, c, a, ?)
    const champ = await p.evaluate(() => { const e = document.querySelector('#cnx input[type=text], #cnx input:not([type])'); if (!e) return null; e.focus(); return e.id || e.name || 'champ'; });
    v('A population : un champ de saisie à remplir existe sur l’écran', !!champ, champ);
    await p.keyboard.type('ndca?/', { delay: 30 }); await p.waitForTimeout(300);
    const val = await p.evaluate(() => { const e = document.querySelector('#cnx input[type=text], #cnx input:not([type])'); return e ? e.value : null; });
    const o3 = await ouvertes(p);
    v('A taper « ndca?/ » dans le champ l’écrit tel quel et n’ouvre rien', val === 'ndca?/' && !o3.panneau && !o3.fenetre && !o3.pal, { val, o3 });
    await L.capture(c, CAP + `recontrole-a-connexion-${PROFIL}.png`);
    v('A aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── B : focus et dessus des fenêtres, jusque devant la Comptabilité plein écran ────────────────────────────────────────────────
  if (SEC.includes('b')) {
    const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p;
    v('B population : le gérant est connecté (menu et écran dessinés)', (await h1(p)).length > 0);
    // 1. « Nouvelle intervention » (N) : le focus entre et ne sort plus (Tab et Maj+Tab), Échap rend le focus
    await p.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); });
    await p.keyboard.press('n'); await p.waitForTimeout(900);
    const fen = await p.evaluate(() => !!document.querySelector('.fen-voile .fen'));
    v('B N ouvre la fenêtre « Nouvelle intervention »', fen);
    if (fen) {
      const t1 = await tabs(p, '.fen-voile .fen', 40, false), t2 = await tabs(p, '.fen-voile .fen', 40, true);
      v('B fenêtre de création : 40 Tab + 40 Maj+Tab, le focus n’en sort jamais', t1.sorties === 0 && t2.sorties === 0, { t1, t2 });
      await p.keyboard.press('Escape'); await p.waitForTimeout(500);
      v('B Échap ferme la fenêtre de création', !(await p.evaluate(() => !!document.querySelector('.fen-voile .fen'))));
    }
    // 2. le panneau des raccourcis (?) : un seul élément focalisable, le focus y reste, Échap le rend au corps (ou au bouton d'origine)
    await p.keyboard.press('Shift+?'); await p.waitForTimeout(500);
    const pan = await p.evaluate(() => !!document.querySelector('#calque .panneau'));
    v('B ? ouvre le panneau des raccourcis', pan);
    if (pan) { const t = await tabs(p, '#calque .panneau', 20, false); v('B panneau : 20 Tab, le focus n’en sort pas', t.sorties === 0, t); await p.keyboard.press('Escape'); await p.waitForTimeout(400); v('B Échap ferme le panneau', !(await p.evaluate(() => !!document.querySelector('#calque .panneau')))); }
    // 3. recherche par-dessus une fenêtre ouverte : elle doit se VOIR (dessus au centre) et Échap ne ferme qu'elle
    await p.keyboard.press('n'); await p.waitForTimeout(900);
    await p.keyboard.press(CMD + '+k'); await p.waitForTimeout(500);
    const [cx, cy] = centre(c);
    const pal = await p.evaluate(() => !!document.getElementById('pal'));
    v('B Ctrl+K pendant qu’une fenêtre de création est ouverte : la recherche s’ouvre', pal);
    if (pal) {
      const d = await dessus(p, cx, 150);
      v('B … et elle se VOIT (l’élément touché au-dessus de l’écran est la recherche)', /#pal/.test(d), d);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      const apres = await p.evaluate(() => ({ pal: !!document.getElementById('pal'), fen: !!document.querySelector('.fen-voile .fen') }));
      v('B Échap ferme la recherche et laisse la fenêtre de création (rien n’est perdu)', !apres.pal && apres.fen, apres);
    }
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    // 4. Comptabilité plein écran : N, D, C, A, ?, Ctrl+K — chaque ouverture se VOIT devant
    await p.evaluate(() => { location.hash = '#comptabilite'; }); await p.waitForTimeout(1500);
    const cp = await p.evaluate(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden; });
    v('B population : la Comptabilité plein écran est ouverte', cp);
    if (cp) {
      await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
      for (const [touche, sel, nom] of [['n', '.fen-voile .fen', 'N → Nouvelle intervention'], ['c', '.fen-voile .fen, #calque .panneau', 'C → Nouveau client']]) {
        await p.keyboard.press(touche); await p.waitForTimeout(1300);
        const ouv = await p.evaluate(s => !!document.querySelector(s), sel);
        const d = await dessus(p, cx, cy);
        v(`B Comptabilité plein écran, ${nom} : la fenêtre s’ouvre ET se voit devant`, ouv && !/#cpsys/.test(d), { ouv, d });
        if (ouv) { const t = await tabs(p, await p.evaluate(() => document.querySelector('.fen-voile .fen') ? '.fen-voile .fen' : '#calque .panneau'), 25, false); v(`B … 25 Tab : le focus reste dans la fenêtre (${nom})`, t.sorties === 0, t); }
        await p.keyboard.press('Escape'); await p.waitForTimeout(500);
        await p.evaluate(() => { const a = document.activeElement; if (a && a.blur && !document.getElementById('cpsys').contains(a)) a.blur(); });
      }
      const apresC = await p.evaluate(() => ({ cp: (() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden; })(), hash: location.hash, h1: (document.querySelector('#contenu h1') || {}).textContent || '' }));
      v('B C (Nouveau client) mène à l’écran Clients (la Comptabilité plein écran se quitte pour de bon, l’écran dessous est celui des clients)', !apresC.cp && /clients/.test(apresC.hash) && /Client/i.test(apresC.h1), apresC);
      await p.evaluate(() => { location.hash = '#comptabilite'; }); await p.waitForTimeout(1500);
      await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
      await p.keyboard.press('Shift+?'); await p.waitForTimeout(500);
      const d2 = await dessus(p, cx, cy), p2 = await p.evaluate(() => !!document.querySelector('#calque .panneau'));
      v('B Comptabilité plein écran : ? ouvre le panneau et il se voit devant', p2 && /panneau|voile/.test(d2), d2);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      await L.capture(c, CAP + `recontrole-b-compta-${PROFIL}.png`);
    }
    v('B aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── C : la recherche sous les couches qui la dépassent (guide des nouveautés 9500, visionneuse de justificatif 100000) ──────────────
  if (SEC.includes('c')) {
    const c = await L.ouvrir({ profil: PROFIL, qui: 'marc', guide: true }), p = c.p;
    await p.evaluate(() => { try { nvOuvrir(); } catch (e) {} }); await p.waitForTimeout(1500);
    const nv = await p.evaluate(() => { const z = document.getElementById('nv'); return !!z && z.getBoundingClientRect().width > 0; });
    v('C population : le guide des nouveautés est ouvert (première connexion)', nv);
    if (nv) {
      await p.keyboard.press(CMD + '+k'); await p.waitForTimeout(500);
      const o = await p.evaluate(() => ({ pal: !!document.getElementById('pal'), z: document.getElementById('pal') ? getComputedStyle(document.getElementById('pal')).zIndex : null, nv: !!document.getElementById('nv') }));
      if (o.pal) { const d = await dessus(p, ...centre(c).map((x, i) => i ? 160 : x)); v('C Ctrl+K sous le guide : si la recherche s’ouvre, elle se voit au-dessus', /#pal/.test(d), { o, d }); await p.keyboard.press('Escape'); await p.waitForTimeout(300); }
      else v('C Ctrl+K sous le guide : la recherche ne s’ouvre pas (elle serait cachée)', true, o);
      const apres = await p.evaluate(() => ({ nv: !!document.getElementById('nv'), pal: !!document.getElementById('pal') }));
      v('C Échap : la recherche (invisible ou non) ne reste pas ouverte à l’insu de la personne', !apres.pal, apres);
      // les touches de création et « ? » devant le guide (9500) : ouvrent-elles quelque chose DERRIÈRE lui, que la personne ne voit pas ?
      await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
      for (const k of ['n', 'c', 'Shift+?']) await p.keyboard.press(k).then(() => p.waitForTimeout(500));
      const der = await p.evaluate(() => ({ fen: !!document.querySelector('.fen-voile'), panneau: !!document.querySelector('#calque .panneau'), pal: !!document.getElementById('pal'), nv: !!document.getElementById('nv') }));
      v('C N, C et ? pendant que le guide est ouvert : rien ne s’ouvre derrière lui, à l’insu de la personne', !der.fen && !der.panneau && !der.pal, der);
      await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await p.waitForTimeout(400);
      const apresG = await p.evaluate(() => ({ fen: !!document.querySelector('.fen-voile'), panneau: !!document.querySelector('#calque .panneau') }));
      v('C … et en fermant le guide, aucune fenêtre jamais demandée n’apparaît', !apresG.fen && !apresG.panneau, apresG);
    }
    // le document en grand (#docplein, z-index 200, au-dessus des fenêtres à 38) et la pièce jointe du client (#cx-vis, 100000, au-dessus de la recherche à 9200) :
    // mêmes touches, même exigence — rien ne s'ouvre derrière eux (recontrôle coque, casse 1 : corrigé par rcDevant)
    for (const [nom, ouvrir, sel] of [
      ['document en grand', () => { const f = (typeof FACTURES !== 'undefined') && FACTURES[0]; if (!f) return false; docPlein(Object.assign(document.createElement('div'), { innerHTML: pdfFacture(f) }).firstElementChild); return !!document.getElementById('docplein'); }, '#docplein'],
      ['pièce jointe du client', () => { const a = (typeof ACHATS !== 'undefined') && ACHATS.find(x => x.piece && x.piece !== 'aucune'); if (!a) return false; cxVoir('ach', a.id); return !!document.getElementById('cx-vis'); }, '#cx-vis']]) {
      await p.evaluate(() => { aller('accueil'); }).catch(() => {}); await p.waitForTimeout(900);
      // départ propre : la fenêtre ouverte par « N » juste avant (fermeture animée) ne doit pas passer pour un effet de la visionneuse
      v('C départ propre : aucune fenêtre ni panneau ouvert avant ' + nom, await L.attendre(p, () => !document.querySelector('.fen-voile') && !document.querySelector('#calque .panneau'), 4000));
      const ok = await p.evaluate(ouvrir); await p.waitForTimeout(400);
      v('C population : ' + nom + ' ouvert', ok === true, ok);
      if (!ok) continue;
      await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
      for (const k of ['n', 'c', 'd', 'a', 'Shift+?', CMD + '+k']) { await p.keyboard.press(k); await p.waitForTimeout(250); }
      const der2 = await p.evaluate(s => ({ devant: !!document.querySelector(s), fen: !!document.querySelector('.fen-voile'), panneau: !!document.querySelector('#calque .panneau'), pal: !!document.getElementById('pal'), foc: (document.activeElement && document.activeElement.closest && !!document.activeElement.closest('.fen-voile,#pal,#calque')) }), sel);
      v('C ' + nom + ' : N, C, D, A, ? et Ctrl+K n’ouvrent rien derrière lui et le focus ne part pas dans une fenêtre cachée', der2.devant && !der2.fen && !der2.panneau && !der2.pal && !der2.foc, der2);
      await p.keyboard.press('Escape'); await p.waitForTimeout(400);
      v('C ' + nom + ' : Échap le ferme, et rend les raccourcis (N ouvre « Nouvelle intervention »)', await p.evaluate(s => !document.querySelector(s), sel) && (await p.keyboard.press('n'), await p.waitForTimeout(500), await p.evaluate(() => !!document.querySelector('.fen-voile'))));
      await p.evaluate(() => { try { closeModal && closeModal(); } catch (e) {} document.querySelectorAll('.fen-voile').forEach(e => e.remove()); });
    }
    // visionneuse de justificatif : ouverte par cxVoir (compta) — on cherche une pièce
    const vis = await p.evaluate(() => { try { aller('comptabilite'); } catch (e) {} return typeof cxVoir === 'function'; });
    await p.waitForTimeout(1200);
    if (vis) {
      const ouvre = await p.evaluate(() => { const b = document.querySelector('[data-cxvoir], [data-cxv]'); if (b) { b.click(); return 'bouton'; } try { const t = Object.keys(window).find(k => false); } catch (e) {} return ''; });
      v('C (visionneuse) information : le bouton « Voir le justificatif » ' + (ouvre ? 'existe' : 'est introuvable par ce motif : section non jouée'), true, ouvre);
    }
    v('C aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── D : se déconnecter puis se reconnecter en EN autre rôle : rien du premier ne reste, tout du second marche ──────────────────────
  if (SEC.includes('d')) {
    const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p;
    v('D population : Marc est connecté', (await h1(p)).length > 0 && await p.evaluate(() => !!document.querySelector('#menu *')));
    const menuMarc = await p.evaluate(() => [...document.querySelectorAll('#menu [data-rl], #menu a, #menu button')].length);
    await p.evaluate(() => { location.hash = '#clients'; }); await p.waitForTimeout(700); await p.evaluate(() => { location.hash = '#taches'; }); await p.waitForTimeout(700);
    await p.evaluate(() => sessionFermer()); await p.waitForTimeout(1800);
    const cnx = await p.evaluate(() => !!document.getElementById('cnx'));
    v('D « Se déconnecter » : l’écran de connexion arrive', cnx);
    // on regarde pendant 3 secondes que rien de Marc ne REVIENT dans la page (transitions tardives, minuteries)
    let revenu = false; for (let i = 0; i < 6; i++) { await p.waitForTimeout(500); const o = await ouvertes(p); if (o.contenu > 0 || o.menu > 0 || o.cp) revenu = true; }
    v('D pendant 3 s après la déconnexion, rien de l’écran de Marc ne revient derrière la connexion', !revenu);
    // le Retour du navigateur ne rend pas l'écran de Marc
    await p.evaluate(() => history.back()); await p.waitForTimeout(900);
    const o = await ouvertes(p);
    v('D Retour du navigateur après la déconnexion : toujours la connexion, rien de dessiné derrière', await p.evaluate(() => !!document.getElementById('cnx')) && o.contenu === 0 && !o.cp, o);
    // on se reconnecte en Julie (secrétariat) par le vrai formulaire : l'application reprend vie, avec SON menu
    const vue = await p.evaluate(() => ({ lien: !!document.getElementById('cn-form-lien'), id: !!document.querySelector('#cnx input[type=text], #cnx input:not([type])') }));
    v('D population : l’écran dit où l’on en est (identifiant à saisir)', vue.id || vue.lien, vue);
    // connexion par la fonction réelle de la page (les sondes secu-* jouent le téléphone ; ici on vérifie ce qui se redessine)
    await p.evaluate(() => { try { sessionOuvrir('julie'); } catch (e) { try { cnxEntrer('julie'); } catch (x) {} } }); await p.waitForTimeout(1800);
    const apres = await p.evaluate(() => ({ cnx: !!document.getElementById('cnx'), inert: [...document.querySelectorAll('.app, #barre-bas, #fenetre')].filter(e => e.hasAttribute('inert')).length, aria: [...document.querySelectorAll('.app, #barre-bas, #fenetre')].filter(e => e.getAttribute('aria-hidden') === 'true').length, titre: (document.querySelector('#contenu h1') || {}).textContent || '', menu: document.querySelectorAll('#menu button, #menu a').length, menuTout: document.querySelectorAll('#menu *').length, cp: !!(document.getElementById('cpsys') && !document.getElementById('cpsys').hidden), barre: document.querySelectorAll('#barre-bas *').length }));
    v('D population : une session a bien été rouverte (l’écran de connexion a disparu)', !apres.cnx, apres);
    if (!apres.cnx) { v('D reconnecté : plus rien d’inerte ni de caché aux lecteurs d’écran', apres.inert === 0 && apres.aria === 0, apres); v('D reconnecté : un titre et un menu sont dessinés', apres.titre.length > 0 && apres.menu > 0, apres);
      await p.mouse.click(Math.round(c.largeur / 2), Math.round(c.hauteur / 2)).catch(() => {}); }
    v('D aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }

  // ── E : feuille « Menu » et clavier — le focus entre, boucle, Échap la ferme et rend le bouton ; elle ne se rouvre pas toute seule ───
  if (SEC.includes('e')) {
    const t = ['iphone', 'android', 'petit'].includes(PROFIL) ? PROFIL : 'iphone';
    const c = await L.ouvrir({ profil: t, qui: 'sm' }), p = c.p;
    v('E population : la technicienne est connectée sur un téléphone', (await h1(p)).length > 0);
    const b = p.locator('[data-rl="menu"], .menu-bouton, #menu-bouton, button:has-text("Menu")').first();
    const nb = await b.count();
    v('E population : le bouton « Menu » existe', nb > 0);
    if (nb) {
      await L.toucher(c, b); await p.waitForTimeout(700);
      const f = await p.evaluate(() => !!document.querySelector('#calque .panneau .fm-liste'));
      v('E la feuille « Menu » s’ouvre', f);
      if (f) {
        const t1 = await tabs(p, '#calque .panneau', 30, false), t2 = await tabs(p, '#calque .panneau', 30, true);
        v('E feuille « Menu » : 30 Tab + 30 Maj+Tab, le focus reste dedans', t1.sorties === 0 && t2.sorties === 0, { t1, t2 });
        await p.keyboard.press('Escape'); await p.waitForTimeout(500);
        v('E Échap ferme la feuille', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
        const foc = await p.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('data-rl') || a.id || a.className || a.tagName) : null; });
        v('E … et le focus revient sur un bouton de la page (pas perdu dans le vide)', !!foc && foc !== 'BODY', foc);
        // rotation : la feuille ouverte puis la fenêtre élargie à l'écran de bureau — elle se ferme ; puis on revient au téléphone : elle ne revient pas seule
        await L.toucher(c, b); await p.waitForTimeout(500);
        await p.setViewportSize({ width: 1100, height: 700 }); await p.waitForTimeout(700);
        const sur = await p.evaluate(() => !!document.querySelector('#calque .panneau .fm-liste'));
        v('E fenêtre élargie à 1 100 px : la feuille « Menu » est fermée', !sur);
        await p.setViewportSize({ width: c.largeur, height: c.hauteur }); await p.waitForTimeout(700);
        const reste = await p.evaluate(() => ({ f: !!document.querySelector('#calque .panneau .fm-liste'), h1: (document.querySelector('#contenu h1') || {}).textContent || '' }));
        v('E retour à la largeur du téléphone : la feuille ne se rouvre pas seule, l’écran est intact', !reste.f && reste.h1.length > 0, reste);
      }
    }
    v('E aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // ── F : le vocabulaire d'un débutant dans la recherche — quels mots courants ne mènent nulle part, pour chaque rôle ───────────────
  if (SEC.includes('f')) {
    const MOTS = ['heures', 'pointage', 'congé', 'congés', 'vacances', 'véhicule', 'camion', 'voiture', 'essence', 'carburant', 'facture', 'devis', 'client', 'fournisseur', 'stock', 'matériel', 'produit', 'planning', 'calendrier', 'rdv', 'tâche', 'mail', 'courrier', 'message', 'banque', 'paie', 'équipe', 'technicien', 'mot de passe', 'logo', 'siret', 'tva', 'contrat', 'intervention', 'rapport', 'photo', 'déconnexion', 'nuit', 'jour', 'aide', 'raccourci', 'nouveautés', 'imprimer', 'export', 'dépôt', 'achat', 'note de frais', 'relance', 'impayé', 'paiement', 'absence', 'adresse', 'téléphone', 'coordonnées'];
    for (const qui of ['marc', 'julie', 'sm']) {
      const c = await L.ouvrir({ profil: PROFIL, qui }), p = c.p;
      await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
      await p.keyboard.press(CMD + '+k'); await p.waitForTimeout(500);
      const ok = await p.evaluate(() => !!document.getElementById('pal'));
      v(`F population (${qui}) : la recherche s’ouvre`, ok);
      const vides = [], reps = {};
      if (ok) for (const m of MOTS) { await p.evaluate(() => { const q = document.getElementById('pal-q'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); }); await p.keyboard.type(m, { delay: 5 }); await p.waitForTimeout(40);
        const n = await p.evaluate(() => [...document.querySelectorAll('#pal .pal-i b')].map(e => e.textContent)); reps[m] = n.slice(0, 3).join(' | '); if (!n.length) vides.push(m); await p.evaluate(() => { const q = document.getElementById('pal-q'); q.value = ''; }); }
      console.log(`  · ${qui} : ${vides.length}/${MOTS.length} mots sans réponse : ${vides.join(', ')}`);
      console.log('  · ' + qui + ' réponses : ' + JSON.stringify(reps).slice(0, 1800));
      v(`F ${qui} : au plus 12 mots courants sur ${MOTS.length} ne mènent nulle part`, vides.length <= 12, vides);
      await L.fin(c);
    }
  }
  // ── G : trois PARCOURS de bout en bout, gestes réels (toucher / clavier), captures à regarder ───────────────────────────────────
  if (SEC.includes('g1')) {   // téléphone, gérant : feuille Menu → Comptabilité → retour → barre du bas → Nuit → Nouveautés → déconnexion → reconnexion d'une autre personne
    const c = await L.ouvrir({ profil: 'iphone', qui: 'marc' }), p = c.p, tag = 'iphone';
    await L.toucher(c, '.tt-menu'); await L.calme(p, 500);
    v('G1 population : la feuille Menu est ouverte', await p.evaluate(() => !!document.querySelector('#calque .panneau .fm-liste')));
    await L.capture(c, CAP + 'recontrole-g1-feuille-jour.png');
    await L.toucher(c, p.locator('#calque .fm-liste button, #calque .fm-liste a').filter({ hasText: /^\s*\S*\s*Comptabilité/ }).first()); await L.calme(p, 1200);
    v('G1 « Comptabilité » (feuille Menu) ouvre la Comptabilité plein écran et ferme la feuille', await p.evaluate(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden && !document.querySelector('#calque .panneau'); }));
    await L.capture(c, CAP + 'recontrole-g1-compta.png');
    await L.toucher(c, '[data-cpsys="retour"]'); await L.calme(p, 900);
    v('G1 « ‹ OP GESTION » ramène à l’application, barre du bas visible', await p.evaluate(() => { const e = document.getElementById('cpsys'); return (!e || e.hidden) && document.querySelectorAll('#barre-bas .opg-tab').length >= 3; }));
    const tabs0 = await p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab')].map(e => e.textContent.trim()));
    await L.toucher(c, p.locator('#barre-bas .opg-tab').nth(1)); await L.calme(p, 700);
    v('G1 un onglet de la barre du bas change d’écran (' + tabs0.join(' · ') + ')', (await h1(p)).length > 0);
    await L.toucher(c, '.tt-menu'); await L.toucher(c, '#calque [data-modetheme="nuit"]'); await L.ranger(p);
    v('G1 Nuit choisi depuis la feuille : la page passe en nuit', await p.evaluate(() => document.documentElement.dataset.mode === 'nuit'));
    await L.capture(c, CAP + 'recontrole-g1-nuit.png');
    await L.toucher(c, '.tt-menu'); await L.calme(p, 400);
    const nouv = p.locator('#calque').getByText(/Nouveautés/).first();
    v('G1 population : la ligne Nouveautés existe dans la feuille', await nouv.count() > 0);
    await L.toucher(c, nouv); await L.calme(p, 900);
    const gOuv = await p.evaluate(() => { const z = document.getElementById('nv'); return !!z && z.getBoundingClientRect().width > 0; });
    v('G1 « Nouveautés » ouvre le guide', gOuv);
    if (gOuv) { await L.capture(c, CAP + 'recontrole-g1-guide-nuit.png'); await L.toucher(c, '#nv [data-nv="fermer"]'); await L.calme(p, 500); v('G1 le guide se ferme', await p.evaluate(() => !document.getElementById('nv') || document.getElementById('nv').getBoundingClientRect().width === 0)); }
    await L.toucher(c, '.tt-menu'); await L.toucher(c, '#calque [data-cnx="sortir"]'); await L.calme(p, 1400);
    const o = await ouvertes(p);
    v('G1 « Se déconnecter » : connexion, rien de Marc derrière, rien de cassé (inert posé)', await p.evaluate(() => !!document.getElementById('cn-form') && document.querySelector('.app').hasAttribute('inert')) && o.contenu === 0, o);
    await L.capture(c, CAP + 'recontrole-g1-connexion-nuit.png');
    await p.evaluate(() => sessionOuvrir('sm')); await p.waitForTimeout(1600);
    const t = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent || '', barre: [...document.querySelectorAll('#barre-bas .opg-tab')].map(e => e.textContent.trim()), nuit: document.documentElement.dataset.mode }));
    v('G1 reconnexion d’une technicienne : SA barre du bas (pas celle du gérant), un titre, le mode choisi gardé', t.barre.length >= 3 && JSON.stringify(t.barre) !== JSON.stringify(tabs0) && t.h1.length > 0, t);
    await L.capture(c, CAP + 'recontrole-g1-sm-nuit.png');
    v('G1 aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  if (SEC.includes('g2')) {   // ordinateur, secrétariat : recherche, droits, panneau des raccourcis, mode par la recherche, adresses refusée et inconnue, Retour
    const c = await L.ouvrir({ profil: PROFIL, qui: 'julie' }), p = c.p;
    await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await p.keyboard.press(CMD + '+k'); await p.waitForTimeout(500);
    await p.keyboard.type('client', { delay: 20 }); await p.waitForTimeout(300);
    const prem = await p.evaluate(() => { const b = document.querySelector('#pal .pal-i.on b'); return b ? b.textContent : null; });
    v('G2 recherche « client » : une première réponse (' + prem + ')', !!prem);
    await L.capture(c, CAP + `recontrole-g2-recherche-${PROFIL}.png`);
    await p.keyboard.press('Enter'); await p.waitForTimeout(1200);
    v('G2 Entrée mène quelque part : la recherche est fermée et un écran est dessiné', !(await p.evaluate(() => !!document.getElementById('pal'))) && (await h1(p)).length > 0, await h1(p));
    await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await p.keyboard.press('n'); await p.waitForTimeout(700);
    const nOuvre = await p.evaluate(() => !!document.querySelector('.fen-voile .fen'));
    await p.keyboard.press('Escape'); await p.waitForTimeout(500);
    await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
    await p.keyboard.press('Shift+?'); await p.waitForTimeout(500);
    const lignes = await p.evaluate(() => [...document.querySelectorAll('#calque .rc-l span:first-child')].map(e => e.textContent));
    v('G2 le panneau des raccourcis dit vrai : « Nouvelle intervention » y figure si et seulement si N l’ouvre (N ouvre : ' + nOuvre + ')', lignes.length > 5 && lignes.includes('Nouvelle intervention') === nOuvre, lignes);
    await L.capture(c, CAP + `recontrole-g2-raccourcis-${PROFIL}.png`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(400);
    await p.keyboard.press(CMD + '+k'); await p.waitForTimeout(400); await p.keyboard.type('nuit', { delay: 20 }); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
    v('G2 « nuit » dans la recherche passe en mode nuit', await p.evaluate(() => document.documentElement.dataset.mode === 'nuit'));
    await p.keyboard.press(CMD + '+k'); await p.waitForTimeout(400); await p.keyboard.type('automatique', { delay: 20 }); await p.keyboard.press('Enter'); await p.waitForTimeout(700);
    v('G2 « automatique » dans la recherche revient au mode automatique', await p.evaluate(() => document.querySelector('[data-modetheme="auto"]').getAttribute('aria-pressed') === 'true'));
    for (const h of ['#nimportequoi', '#planning', '#vehicules']) {
      await p.evaluate(h => { location.hash = h; }, h); await p.waitForTimeout(900);
      const r = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent || '', txt: ((document.getElementById('contenu') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 140), bouton: !!document.querySelector('#contenu [data-go], #contenu button') }));
      v(`G2 adresse ${h} : l’écran dit quelque chose d’humain et propose une sortie`, r.txt.length > 10 && r.bouton, r);
      if (h === '#nimportequoi') await L.capture(c, CAP + `recontrole-g2-inconnue-${PROFIL}.png`);
    }
    await p.evaluate(() => history.back()); await p.waitForTimeout(800);
    v('G2 Retour du navigateur après trois adresses : un écran dessiné, l’application tient', (await h1(p)).length > 0 || (await p.evaluate(() => ((document.getElementById('contenu') || {}).innerText || '').length > 10)));
    v('G2 aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  if (SEC.includes('g3')) {   // iPad : technicienne → adresse refusée, barre du bas, glisser les rôles par reconnexion
    const c = await L.ouvrir({ profil: 'ipad', qui: 'sm' }), p = c.p;
    const forme = await p.evaluate(() => ({ colonne: document.getElementById('menu').getBoundingClientRect().width > 100, barre: [...document.querySelectorAll('#barre-bas .opg-tab')].filter(e => e.getBoundingClientRect().width > 0 && getComputedStyle(document.getElementById('barre-bas')).display !== 'none').length }));
    v('G3 iPad : une seule navigation (colonne OU barre du bas, pas les deux)', (forme.colonne ? 1 : 0) + (forme.barre ? 1 : 0) === 1, forme);
    await p.evaluate(() => { location.hash = '#comptabilite'; }); await p.waitForTimeout(1000);
    const cp = await p.evaluate(() => { const e = document.getElementById('cpsys'); return { cp: !!e && !e.hidden, txt: ((document.getElementById('contenu') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 120) }; });
    v('G3 technicienne : #comptabilite ne l’y mène pas (pas de plein écran) et dit pourquoi', !cp.cp && cp.txt.length > 10, cp);
    await L.capture(c, CAP + 'recontrole-g3-refus-ipad.png');
    await p.evaluate(() => sessionFermer()); await p.waitForTimeout(1500);
    await p.evaluate(() => sessionOuvrir('marc')); await p.waitForTimeout(1600);
    const m = await p.evaluate(() => ({ lignes: document.querySelectorAll('#menu button, #menu a').length, barre: document.querySelectorAll('#barre-bas .opg-tab').length, cp: !!(document.getElementById('cpsys') && !document.getElementById('cpsys').hidden), h1: (document.querySelector('#contenu h1') || {}).textContent || '' }));
    v('G3 reconnexion du gérant sur l’iPad : menu complet, écran dessiné, pas d’écran de la technicienne', m.lignes > 15 && m.h1.length > 0, m);
    await L.capture(c, CAP + 'recontrole-g3-marc-ipad.png');
    v('G3 aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error('SONDE MORTE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
