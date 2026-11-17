// Restes coque, tour 2 — RECONTRÔLE ADVERSE (17 novembre 2026). Rejoue ce que le correcteur a annoncé « corrigé » et cherche ce qu'il a cassé à côté.
// A. INVARIANT des mots cachés, pour CHAQUE rôle : tout mot caché (PAL_MOTS) d'une rubrique qui est AU MENU du rôle mène à cette rubrique
//    (lu sur la page : PAL_MOTS et rcRubriques()), et aucun mot ne mène à une rubrique que le rôle n'a pas. La liste FERME de coque-recontrole
//    pouvait cacher un mot muet d'une rubrique devenue ouverte (la secrétaire a désormais Temps de travail et Véhicules) : ici, rien n'est écarté d'avance.
// B. VISITE parlée : Ctrl+K, ?, Ctrl+1, Ctrl+], N D C A / ne font rien pendant la visite, la bulle de fin se ferme, les raccourcis REVIENNENT
//    (une bulle restée en place bloquerait la recherche pour de bon), et la visite lancée depuis la recherche (palette → « Découvrir »).
// C. Un téléphone : la visite s'y lance, se ferme, aucune erreur.
// Usage : PROFIL=mac node coque-tour2-recontrole.js [A|B|C|AB…]   « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', PARTIES = (process.env.PARTIES || 'ABC').toUpperCase();
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-coque2-rc/';
const etat = p => p.evaluate(() => ({ visite: !!document.getElementById('gd-bulle'), pal: !!document.getElementById('pal'), panneau: !!document.querySelector('#calque .panneau'), fenetre: !!document.querySelector('.fen-voile'),
  route: (typeof route !== 'undefined') ? route : '' }));
(async () => {
  if (PARTIES.includes('A')) {
    for (const qui of ['marc', 'julie', 'sm', 'kb']) {
      const c = await L.ouvrir({ profil: PROFIL, qui }), p = c.p;
      await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); });
      await p.keyboard.press('Control+k'); await p.waitForTimeout(500);
      v(`A ${qui} population : la recherche s'ouvre`, await p.evaluate(() => !!document.getElementById('pal')));
      const info = await p.evaluate(() => ({ menu: rcRubriques().map(r => ({ k: r.k, l: r.l })), mots: PAL_MOTS }));
      v(`A ${qui} population : menu lu (${info.menu.length} rubriques) et table des mots lue (${Object.keys(info.mots).length} clés)`, info.menu.length >= 3 && Object.keys(info.mots).length >= 10);
      const ouvertes = info.menu.filter(r => info.mots[r.k]);
      console.log(`  · ${qui} : ${info.menu.length} rubriques au menu, ${ouvertes.length} portent des mots cachés`);
      let essais = 0, muets = [], loin = [];
      for (const r of ouvertes) {
        const jetons = [...new Set(info.mots[r.k].split(/\s+/).filter(m => m.length >= 4))];
        for (const m of jetons) {
          await p.evaluate(() => { const q = document.getElementById('pal-q'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); });
          await p.keyboard.type(m, { delay: 3 }); await p.waitForTimeout(25);
          const rep = await p.evaluate(() => [...document.querySelectorAll('#pal .pal-i b')].map(e => e.textContent));
          essais++;
          const rang = rep.indexOf(r.l);
          if (rang < 0) muets.push(m + '→' + r.l + ' [' + rep.slice(0, 3).join(' | ') + ']'); else if (rang > 4) loin.push(m + '→' + r.l + ' (rang ' + (rang + 1) + ')');
        }
      }
      v(`A ${qui} population : ${essais} mots cachés essayés`, essais >= 5, essais);
      v(`A ${qui} : chaque mot caché d'une rubrique de SON menu mène à elle`, muets.length === 0, muets);
      if (loin.length) console.log(`  · ${qui} : mots qui mènent à leur rubrique mais au-delà du 5e rang : ${loin.join(' ; ')}`);
      // les mots de la technicienne ne volent la place de personne chez le gérant : « photo », « rapport » mènent à Interventions d'abord, « voiture » à Véhicules
      if (qui === 'marc') {
        for (const [mot, att] of [['voiture', 'Véhicules'], ['photo', 'Interventions'], ['rapport', 'Interventions'], ['absence', 'Absences et congés|Mes congés'], ['planning', 'Planning'], ['pointer', 'Temps de travail'], ['carburant', 'Véhicules']]) {
          await p.evaluate(() => { const q = document.getElementById('pal-q'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); });
          await p.keyboard.type(mot, { delay: 3 }); await p.waitForTimeout(30);
          const rep = await p.evaluate(() => [...document.querySelectorAll('#pal .pal-i b')].map(e => e.textContent));
          console.log(`  · marc « ${mot} » : ${rep.slice(0, 4).join(' | ') || '(rien)'}`);
          v(`A marc « ${mot} » : une réponse, et la bonne rubrique parmi les trois premières`, rep.length > 0 && att.split('|').some(l => rep.slice(0, 3).includes(l)), rep.slice(0, 4));
        }
      }
      await L.fin(c);
    }
  }
  if (PARTIES.includes('B')) {
    const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p;
    const sans = async () => { await p.evaluate(() => { const a = document.activeElement; if (a && a.blur) a.blur(); }); };
    await sans();
    const r0 = (await etat(p)).route;
    // B1 : la visite lancée depuis la recherche (le chemin de tout le monde), puis les touches
    await p.keyboard.press('Control+k'); await p.waitForTimeout(400);
    await p.keyboard.type('découvrir', { delay: 10 }); await p.waitForTimeout(150);
    await p.keyboard.press('Enter'); await p.waitForTimeout(1500);
    let e = await etat(p);
    v('B1 population : « Découvrir l’application » lancée depuis la recherche, recherche refermée', e.visite && !e.pal, e);
    await sans();
    const route1 = e.route;
    for (const t of ['Control+k', 'Shift+?', '?', 'Control+1', 'Control+3', 'Control+]', 'Control+[', 'n', 'd', 'c', 'a', '/']) {
      await p.keyboard.press(t); await p.waitForTimeout(250); e = await etat(p);
      v(`B1 visite ouverte : « ${t} » n’ouvre rien`, e.visite && !e.pal && !e.panneau && !e.fenetre, e);
    }
    v('B1 visite ouverte : les raccourcis de rubrique ne l’ont pas fait changer d’écran', (await etat(p)).route === route1, [route1, (await etat(p)).route]);
    await L.capture(c, CAP + 'visite-' + PROFIL + '.png');
    // B2 : la bulle de FIN se ferme et rend les raccourcis (une bulle restée bloquerait la recherche pour toujours)
    await p.evaluate(() => { gdFin(); }); await p.waitForTimeout(500);
    const fin = await p.evaluate(() => { const b = document.getElementById('gd-bulle'); return b ? { m: b.dataset.m, boutons: [...b.querySelectorAll('button')].map(x => x.textContent.trim() + '|' + (x.dataset.gd || x.dataset.imm || '') + '|' + x.getBoundingClientRect().width) } : null; });
    v('B2 population : la bulle de fin est affichée avec au moins un bouton', !!fin && fin.boutons.length >= 1, fin);
    console.log('  · bulle de fin : ' + JSON.stringify(fin));
    await sans(); await p.keyboard.press('Control+k'); await p.waitForTimeout(250);
    v('B2 bulle de fin ouverte : Ctrl+K reste muet (elle est devant)', !(await etat(p)).pal);
    await L.capture(c, CAP + 'visite-fin-' + PROFIL + '.png');
    const ferme = await p.evaluate(() => { const b = document.querySelector('#gd-bulle [data-gd="quitter"]') || document.querySelector('#gd-bulle [data-gd="fin"]') || document.querySelector('#gd-bulle button'); if (!b) return 'aucun'; const t = b.textContent.trim(); b.click(); return t; });
    await p.waitForTimeout(500); e = await etat(p);
    v('B2 un bouton de la bulle de fin la ferme (« ' + ferme + ' »)', !e.visite, e);
    await p.keyboard.press('Control+k'); await p.waitForTimeout(350);
    v('B2 la bulle fermée : Ctrl+K rouvre la recherche', (await etat(p)).pal);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    await p.keyboard.press('Control+1'); await p.waitForTimeout(600); const ra = (await etat(p)).route;
    await p.keyboard.press('Control+3'); await p.waitForTimeout(600); const rb = (await etat(p)).route;
    v('B2 la bulle fermée : Ctrl+1 puis Ctrl+3 changent de rubrique', ra !== rb, [ra, rb]);
    // B3 : la visite quittée par « Retour » de l'historique (le geste du téléphone, du trackpad et du bouton du navigateur)
    await p.evaluate(() => immLancer(0)); await p.waitForTimeout(1200);
    v('B3 population : visite relancée', (await etat(p)).visite);
    await p.evaluate(() => history.back()); await p.waitForTimeout(900); e = await etat(p);
    console.log('  · après Retour : visite=' + e.visite);
    if (e.visite) { await p.evaluate(() => gdQuitter()); await p.waitForTimeout(300); }
    await sans(); await p.keyboard.press('Control+k'); await p.waitForTimeout(350);
    v('B3 après la visite (fermée par Retour ou par la croix) : Ctrl+K ouvre la recherche', (await etat(p)).pal);
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    // B4 : le parcours de A à Z (même bulle, autre visite) retient aussi les raccourcis
    await p.evaluate(() => gdCommencer(0, 'az')); await p.waitForTimeout(1200); e = await etat(p);
    v('B4 population : le test de A à Z est lancé', e.visite, e);
    await sans(); await p.keyboard.press('Control+k'); await p.waitForTimeout(250);
    v('B4 test de A à Z : Ctrl+K reste muet', !(await etat(p)).pal);
    await p.evaluate(() => gdQuitter()); await p.waitForTimeout(300);
    await sans(); await p.keyboard.press('Control+k'); await p.waitForTimeout(300);
    v('B4 A à Z quitté : Ctrl+K rouvre la recherche', (await etat(p)).pal);
    v('B aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  if (PARTIES.includes('C')) {
    const c = await L.ouvrir({ profil: 'iphone', qui: 'marc' }), p = c.p;
    await p.evaluate(() => immLancer(0)); await p.waitForTimeout(1500);
    let e = await etat(p);
    v('C iPhone population : la visite est lancée', e.visite, e);
    const geo = await p.evaluate(() => { const b = document.getElementById('gd-bulle').getBoundingClientRect(); return { l: b.left, r: b.right, w: innerWidth, h: b.height }; });
    v('C iPhone : la bulle tient dans l’écran', geo.l >= 0 && geo.r <= geo.w + 0.5, geo);
    await L.capture(c, CAP + 'visite-iphone.png');
    const q = await p.evaluate(() => { const b = document.querySelector('#gd-bulle [data-gd="quitter"]'); if (!b) return 'aucune croix'; const r = b.getBoundingClientRect(); b.click(); return Math.round(r.width) + 'x' + Math.round(r.height); });
    await p.waitForTimeout(500);
    v('C iPhone : la croix ferme la visite (cible ' + q + ')', !(await etat(p)).visite);
    v('C iPhone aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  // la sonde rend sa place de navigateur et SORT : sans cela le processus reste vivant jusqu'au délai et garde une des quatre places de la machine (vu le 17 novembre, restes coque tour 2)
  await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
