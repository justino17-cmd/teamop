// Le guide des nouveautés : chaque « Voir » de chaque rôle mène-t-il au BON écran, dont le titre porte les mots de la carte ?
// Usage : PROFIL=mac|iphone|android|petit|ipad QUI=marc,julie,sm,kb [NUIT=1] node guide-voir.js
// Population comptée d'abord (cartes par rôle : 1 à 6, la première est « Où sont passées mes rubriques ? ») ; chaque carte est jouée au BOUTON « Suivant » puis « Voir ».
const G = require('./guide-commun.js'), L = G.L, v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUIS = (process.env.QUI || 'marc,julie,sm,kb').split(','), TEL = G.TEL.includes(PROFIL);
(async () => {
  for (const QUI of QUIS) {
    const c = await G.ouvrir(PROFIL, QUI, !!process.env.NUIT), p = c.p, tag = `${QUI}/${PROFIL}`;
    const pg = await G.pages(c);
    v(`${tag} : population : le guide a ${pg.length} carte(s), entre 2 et 6`, pg.length >= 2 && pg.length <= 6, pg.map(x => x.k));
    v(`${tag} : la première carte est « Où sont passées mes rubriques ? »`, pg[0] && pg[0].t === 'Où sont passées mes rubriques ?', pg[0] && pg[0].t);
    for (let i = 0; i < pg.length; i++) {
      const x = pg[i];
      await p.evaluate(() => { try { document.getElementById('nv')?.remove(); fermerPanneau(); aller(rlOuverture()); } catch (e) {} }); await L.calme(p, 500);
      await p.evaluate(() => nvOuvrir()); await L.calme(p, 500);
      const n = await G.vers(c, i);
      v(`${tag} : carte ${i + 1} « ${x.t} » : on y arrive avec « Suivant » (carte devant : ${n + 1})`, n === i);
      const devant = await p.evaluate(() => { const e = document.querySelector('#nv .nv-carte:not([inert])'); return e ? e.dataset.nvK : null; });
      v(`${tag} : carte ${i + 1} : seule la carte « ${x.k} » est devant (les autres sont inertes)`, devant === x.k && (await p.evaluate(() => document.querySelectorAll('#nv .nv-carte[inert]').length)) === pg.length - 1, devant);
      const ok = await L.toucher(c, '#nv .nv-carte:not([inert]) .nv-voir'); await L.calme(p, 800);
      v(`${tag} : « Voir » de « ${x.t} » se touche et ferme le guide`, ok && !(await G.ouvert(p)));
      if (x.k === 'menu') {
        if (TEL) { const t = await p.evaluate(() => ((document.querySelector('#calque .panneau h2') || {}).textContent || '').trim()); v(`${tag} : « Voir » de la première carte ouvre la feuille « Menu » (titre : « ${t} »)`, t === 'Menu', t);
          const lignes = await p.evaluate(() => document.querySelectorAll('#calque .ligne-clic').length); v(`${tag} : …et la feuille liste les rubriques (population ${lignes})`, lignes >= 4, lignes);
          await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
        else { const h = await p.evaluate(() => { const m = document.getElementById('menu'); return !!m && m.classList.contains('nv-halo') && m.getBoundingClientRect().width > 100; }); v(`${tag} : « Voir » de la première carte met le menu de gauche en lumière`, h); }
        continue; }
      const d = await p.evaluate(() => ({ route, cp:(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0; })() }));
      const h1 = await G.h1(p), nom = await G.nomMenu(p), mot = G.sansAccent(x.mot);
      v(`${tag} : « Voir » de « ${x.t} » ouvre l'écran « ${x.voir} » (on est sur « ${d.route} »)`, d.route === x.voir, d);
      v(`${tag} : le titre de la carte porte le mot « ${x.mot} »`, G.sansAccent(x.t).includes(mot), x.t);
      v(`${tag} : l'écran d'arrivée porte le même mot (titre « ${h1} », menu « ${nom} »)`, G.sansAccent(h1).includes(mot) || G.sansAccent(nom).includes(mot), { h1, nom });
      v(`${tag} : l'écran d'arrivée n'est pas vide (un titre à l'écran)`, h1.length > 2 || d.cp, { h1 });
    }
    v(`${tag} : aucune erreur de console`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
