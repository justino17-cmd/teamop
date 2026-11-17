// Boîte mail — restes tour 2 (17 novembre 2026) : le téléphone tenu en PAYSAGE COURT montre au moins une ligne de message ENTIÈRE au-dessus de la barre d'onglets de l'hôte.
// (le tour 1 comptait contre le bas du module, que la barre d'onglets flottante recouvre : on compte ici contre le HAUT de cette barre.)
// ⛔ 127.0.0.1 seulement. Population comptée avant tout zéro ; sort en 1 si un contrôle tombe.
const { lib, v, entrer, cap, fin, sortie } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
(async () => {
  for (const [pr, w, h, nuit] of [['android', 740, 360, false], ['android', 740, 360, true], ['petit', 568, 320, false], ['petit', 568, 320, true], ['iphone', 844, 390, false], ['iphone', 844, 390, true]]) {
    const etiq = pr + (nuit ? ' nuit' : ' jour') + ' ' + w + '×' + h;
    try {
      const c = await entrer({ profil:pr, nuit }), p = c.p;
      await p.setViewportSize({ width:w, height:h }); await p.waitForTimeout(1600);
      const m = await S(c, () => { const R2 = window.R(), rc = e => { const b = e.getBoundingClientRect(); return { t:Math.round(b.top), b:Math.round(b.bottom), l:Math.round(b.left), r:Math.round(b.right) }; };
        const bar = document.querySelector('#barre-bas'), barre = bar && bar.getBoundingClientRect().height ? bar.getBoundingClientRect() : null;
        const ls = R2.querySelector('#listScroll').getBoundingClientRect(), bas = Math.min(ls.bottom, barre ? barre.top : ls.bottom);
        const lignes = [...R2.querySelectorAll('#rows .msg')], ent = lignes.filter(x => { const b = x.getBoundingClientRect(); return b.top >= ls.top - 1 && b.bottom <= bas + 1; }).length;
        const lt = R2.querySelector('.list .lt'), lb = R2.querySelector('.list .lb-title'), lbt = lb && rc(lb), bar2 = R2.querySelector('.list .list-bar'), btn = R2.querySelector('#btnSelect');
        const nom = R2.querySelector('#lbTitle');
        return { total:lignes.length, ent, barreHaut:barre && Math.round(barre.top), bas:Math.round(bas), ltAffiche:getComputedStyle(lt).display !== 'none', titreBarre:lb && getComputedStyle(R2.querySelector('.list .lb-titles')).opacity, titreTronque:!!nom && nom.scrollWidth > nom.clientWidth + 1, texte:nom && nom.textContent, titreRect:lbt, selRect:btn && rc(btn), sw:document.documentElement.scrollWidth }; });
      v('population ' + etiq + ' : la liste a des messages (' + m.total + ') et la barre de l\'hôte est mesurée (' + m.barreHaut + ')', m.total >= 3 && (m.barreHaut > 0 || pr === 'iphone'), m);   // l'iPhone en paysage n'a pas de barre flottante à mesurer
      v(etiq + ' : au moins une ligne entière au-dessus de la barre d\'onglets (' + m.ent + ')', m.ent >= 1, m);
      v(etiq + ' : l\'écran dit toujours de quelle boîte il s\'agit (grand titre ou titre de la barre, non coupé)', (m.ltAffiche || (Number(m.titreBarre) === 1 && !m.titreTronque)) && !!m.texte, m);
      v(etiq + ' : la page ne glisse pas de côté (' + m.sw + ')', m.sw <= w + 1);
      await cap(c, '../restes2/paysage-' + pr + (nuit ? '-nuit' : '-jour'));
      await fin(c);
    } catch (e) { v(etiq + ' : aucune exception', false, String(e && e.message || e).slice(0, 300)); }
  }
  await sortie();
})();
