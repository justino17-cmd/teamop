// Campagne « coque » (17 novembre 2026) — le MENU : sur ordinateur (colonne de gauche), au téléphone (bouton « Menu », feuille, barre du bas),
// pour chaque personne (marc gérant, julie secrétariat, sm technicienne, kb chef d'équipe) : chaque ligne est TOUCHÉE, on lit où elle mène
// (titre de l'écran, ligne allumée, adresse), la feuille se referme, la barre du bas suit, « Personnaliser la barre du bas » (gérant) se joue.
// Usage : PROFIL=mac|windows|mac720|ipad|iphone|android|petit  QUI=marc,julie,sm,kb  NUIT=1  node coque-menu.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'iphone', NUIT = !!process.env.NUIT, QUIS = (process.env.QUI || 'marc,julie,sm,kb').split(',');
const TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const h1 = p => p.evaluate(() => ((document.querySelector('#contenu h1') || {}).textContent || '').replace(/\s+/g, ' ').trim());
// Comptabilité s'ouvre en PLEIN ÉCRAN (son propre bandeau) : on en sort par « ‹ OP GESTION », ce que la sonde joue comme une personne
const cpOuvert = p => p.evaluate(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0 && getComputedStyle(e).display !== 'none'; });   // position:fixe : offsetParent vaut null
async function sortirCp(c, qui) { const p = c.p; if (!await cpOuvert(p)) return false;
  const b = p.locator('[data-cpsys="retour"]').first(); const ok = await L.toucher(c, b); await L.calme(p, 600);
  v(qui + ' : Comptabilité plein écran : « ‹ OP GESTION » ramène dans l’application (' + (await p.evaluate(() => location.hash)) + ')', ok && !(await cpOuvert(p)));
  if (c.doigt) { const t = await b.boundingBox().catch(() => null); }
  return true; }
const lib = t => t.replace(/\s+/g, ' ').trim();
// un titre « dit » la ligne : le titre contient le début du libellé, ou c'est l'écran d'ouverture du rôle (« Bonjour Marc », « Ma journée »)
const dit = (titre, l) => { const a = titre.toLowerCase(), b = l.toLowerCase(); return a.includes(b.slice(0, 6)) || /^bonjour/.test(a); };
(async () => {
  for (const qui of QUIS) {
    const c = await L.ouvrir({ profil: PROFIL, nuit: NUIT, qui }), p = c.p;
    console.log('— ' + qui + ' sur ' + PROFIL + (NUIT ? ' (nuit)' : ''));
    if (await cpOuvert(p)) await sortirCp(c, qui + ' (ouverture)');
    const menuVisible = await p.evaluate(() => { const m = document.getElementById('menu'); return !!m && m.offsetParent !== null && m.getBoundingClientRect().width > 100; });
    const sortieMenu = TEL || !menuVisible;
    v(qui + ' : population — ' + (sortieMenu ? 'bouton « Menu » présent' : 'colonne du menu présente'), sortieMenu ? await p.locator('.tt-menu').first().isVisible() : menuVisible);
    if (!sortieMenu) {
      // ordinateur : chaque ligne de la colonne
      const lignes = await p.evaluate(() => [...document.querySelectorAll('#menu a[href^="#"]:not(.logo)')].map(a => ({ h: a.getAttribute('href'), t: (a.querySelector('.m-n') || a).textContent.trim() })));
      v(qui + ' : la colonne a des lignes (population)', lignes.length >= 5, lignes.length);
      let n = 0;
      for (const l of lignes) {
        const loc = p.locator('#menu a[href="' + l.h + '"]').first(); await loc.scrollIntoViewIfNeeded().catch(() => {});
        if (!await L.toucher(c, loc)) { v(qui + ' : « ' + l.t + ' » se touche', false, 'cible non atteinte'); continue; }
        await L.calme(p, /Compta/.test(l.t) ? 1300 : 400); n++;
        if (await cpOuvert(p)) { v(qui + ' : « ' + l.t + ' » ouvre Comptabilité en plein écran', /Compta/.test(l.t)); await sortirCp(c, qui); continue; }
        const t = await h1(p), on = await p.evaluate(() => { const a = document.querySelector('#menu a.on'); return a ? (a.querySelector('.m-n') || a).textContent.trim() : ''; });
        v(qui + ' : « ' + l.t + ' » mène à un écran qui le dit (« ' + t.slice(0, 40) + ' »), ligne allumée « ' + on + ' », adresse ' + (await p.evaluate(() => location.hash)), dit(t, l.t) && on === l.t);
      }
      console.log('  · touchées : ' + n + ' / ' + lignes.length);
      // Ctrl/Cmd + 1…9 : la neuvième ligne de la colonne est la neuvième rubrique
      const R = await p.evaluate(() => rcRubriques().map(r => r.l));
      const CMD = (await p.evaluate(() => MAC)) ? 'Meta' : 'Control';   // un iPad se dit « Macintosh » : son clavier a ⌘, pas Ctrl
      for (const i of [1, 3, 9].filter(i => R[i - 1])) { await p.keyboard.press(CMD + '+' + i); await L.calme(p, 400); const t = await h1(p); v(qui + ' : ' + (CMD === 'Meta' ? 'Cmd' : 'Ctrl') + '+' + i + ' ouvre « ' + R[i - 1] + ' » (écran « ' + t.slice(0, 30) + ' »)', dit(t, R[i - 1])); }
      // le logo ramène à l'écran d'ouverture du rôle
      await L.toucher(c, '#menu .logo'); await L.calme(p, 400);
      const t0 = await h1(p); v(qui + ' : le logo ramène à l’écran d’ouverture (« ' + t0 + ' »)', /Bonjour|Ma journée|Comptabilité/.test(t0));
      // le pied est atteignable (Jour/Nuit/Auto, Nouveautés, Se déconnecter) sans que la page défile
      const pied = await p.evaluate(() => { const b = document.querySelector('#menu .cn-out'); if (!b) return null; const r = b.getBoundingClientRect(); return { bas: Math.round(r.bottom), h: innerHeight, vu: r.top >= 0 && r.bottom <= innerHeight }; });
      v(qui + ' : « Se déconnecter » reste visible en bas de la colonne (' + JSON.stringify(pied) + ')', !!pied && pied.vu);
      await p.screenshot({ path: CAP + `menu-${PROFIL}-${qui}${NUIT ? '-nuit' : ''}.png` });
    } else {
      // téléphone : la feuille « Menu »
      await L.toucher(c, '.tt-menu'); await L.calme(p, 400);
      const ouvert = await p.evaluate(() => !!document.querySelector('#calque .panneau h2') && document.querySelector('#calque .panneau h2').textContent.trim());
      v(qui + ' : le bouton « Menu » ouvre la feuille « Menu »', ouvert === 'Menu', ouvert);
      await p.screenshot({ path: CAP + `menu-feuille-${PROFIL}-${qui}${NUIT ? '-nuit' : ''}.png` });
      const lignes = await p.evaluate(() => [...document.querySelectorAll('#calque .fm-liste .ligne-clic')].map(b => ({ k: b.dataset.go || b.dataset.ec, t: (b.querySelector('b') || b).textContent.trim() })));
      const attendu = await p.evaluate(() => rlLignes().map(c => c.l));
      v(qui + ' : la feuille liste exactement les lignes du rôle (' + lignes.length + ')', JSON.stringify(lignes.map(x => x.t)) === JSON.stringify(attendu), { vu: lignes.map(x => x.t), attendu });
      // Échap et la croix ferment
      await p.keyboard.press('Escape'); await L.calme(p, 300);
      v(qui + ' : Échap ferme la feuille', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
      await L.toucher(c, '.tt-menu'); await L.toucher(c, '#calque .panneau .x');
      v(qui + ' : la croix ferme la feuille', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
      let n = 0;
      for (const l of lignes) {
        await L.toucher(c, '.tt-menu'); const ligne = p.locator('#calque .fm-liste .ligne-clic').filter({ has: p.locator('b', { hasText: new RegExp('^' + l.t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$') }) }).first(); await ligne.scrollIntoViewIfNeeded().catch(() => {});
        const ok = await L.toucher(c, ligne); if (!ok) { v(qui + ' : « ' + l.t + ' » se touche', false); await L.ranger(p); continue; }
        await L.calme(p, /Compta/.test(l.t) ? 1300 : 500); n++;
        if (await cpOuvert(p)) { v(qui + ' : feuille › « ' + l.t + ' » ouvre Comptabilité en plein écran', /Compta/.test(l.t)); await sortirCp(c, qui); continue; }
        const t = await h1(p), ferme = !(await p.evaluate(() => !!document.querySelector('#calque .panneau')));
        v(qui + ' : feuille › « ' + l.t + ' » mène à « ' + t.slice(0, 36) + ' » et referme la feuille', dit(t, l.t) && ferme, { t, ferme });
      }
      console.log('  · touchées : ' + n + ' / ' + lignes.length);
      // la barre du bas : chaque bouton
      const onglets = await p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab')].map(b => ({ k: b.dataset.tab || b.dataset.ec, nom: b.getAttribute('aria-label'), mot: b.querySelector('.t-n').textContent.trim() })));
      v(qui + ' : la barre du bas a des onglets (' + onglets.map(o => o.mot).join(' · ') + ')', onglets.length >= 4);
      for (const o of onglets) {
        const nm = o.nom.replace(/ · \d+$/, '');
        await L.toucher(c, p.locator('#barre-bas .opg-tab').filter({ has: p.locator('.t-n', { hasText: new RegExp('^' + o.mot + '$') }) }).first()); await L.calme(p, /Compta/.test(o.mot) ? 1300 : 500);
        if (await cpOuvert(p)) { v(qui + ' : barre › « ' + o.mot + ' » ouvre Comptabilité en plein écran', /Compta/.test(o.mot)); await sortirCp(c, qui); continue; }
        const t = await h1(p), on = await p.evaluate(() => { const b = document.querySelector('#barre-bas .opg-tab.on .t-n'); return b ? b.textContent.trim() : ''; });
        v(qui + ' : barre › « ' + o.mot + ' » mène à « ' + t.slice(0, 30) + ' », onglet allumé « ' + on + ' »', dit(t, nm) && on === o.mot, { t, on });
      }
      // la barre ne cache pas le bas de la page : le dernier élément se voit au-dessus d'elle
      for (const o of onglets.slice(0, 3)) {
        await L.toucher(c, p.locator('#barre-bas .opg-tab').filter({ has: p.locator('.t-n', { hasText: new RegExp('^' + o.mot + '$') }) }).first()); await L.calme(p, 400);
        await p.evaluate(() => scrollTo(0, 1e6)); await L.calme(p, 300);
        const m = await p.evaluate(() => { const b = document.querySelector('#barre-bas .opg-barre') || document.querySelector('.opg-barre'), br = b ? b.getBoundingClientRect() : null; const els = [...document.querySelectorAll('#contenu *')].filter(e => e.offsetParent && e.children.length === 0 && e.getBoundingClientRect().height > 2); const bas = Math.max(0, ...els.map(e => e.getBoundingClientRect().bottom)); return { barreHaut: br ? Math.round(br.top) : null, contenuBas: Math.round(bas) }; });
        v(qui + ' : « ' + o.mot + ' » en bas de page, rien sous la barre (contenu ' + m.contenuBas + ' ≤ barre ' + m.barreHaut + ')', m.barreHaut === null || m.contenuBas <= m.barreHaut + 1, m);
      }
      await p.evaluate(() => scrollTo(0, 0));
      // personnaliser la barre (gérant seulement)
      if (qui === 'marc') {
        await L.toucher(c, '.tt-menu'); await L.toucher(c, '[data-mabarre="~ouvrir"]'); await L.calme(p, 400);
        const titre = await p.evaluate(() => (document.querySelector('#calque .panneau h2') || {}).textContent);
        v('marc : « Personnaliser la barre du bas » ouvre « Ma barre »', titre === 'Ma barre', titre);
        await p.screenshot({ path: CAP + `menu-ma-barre-${PROFIL}${NUIT ? '-nuit' : ''}.png` });
        const retourBarre = await p.evaluate(() => { const b = document.querySelector('#calque .p-retour'); return b ? b.textContent.replace(/\s+/g, ' ').trim() : null; });
        console.log('  · « Ma barre » porte un bouton retour :', retourBarre);
        if (retourBarre) { const avant = await p.evaluate(() => (document.querySelector('#calque .panneau h2') || {}).textContent); await L.toucher(c, '#calque .p-retour'); await L.calme(p, 500);
          const apres = await p.evaluate(() => ({ h2: (document.querySelector('#calque .panneau h2') || {}).textContent || null, hash: location.hash }));
          v('« ‹ Retour » de « Ma barre » ramène à la feuille Menu (et non à un autre écran du parcours) — il a mené à ' + JSON.stringify(apres), apres.h2 === 'Menu', apres);
          await L.toucher(c, '.tt-menu'); await L.toucher(c, '[data-mabarre="~ouvrir"]'); await L.calme(p, 400); }
        const nbLignes = await p.evaluate(() => document.querySelectorAll('#calque .mb-l').length);
        v('marc : « Ma barre » propose toutes les rubriques du menu (' + nbLignes + ')', nbLignes === (await p.evaluate(() => rlLignes().length)));
        const dit1 = async () => p.evaluate(() => (document.querySelector('#calque .mb-dit') || {}).textContent);
        // 5 déjà choisis : en ajouter un sixième est refusé AVEC un mot
        await L.toucher(c, p.locator('#calque .mb-l:not(.on)').first());
        v('marc : un sixième bouton est refusé et le dit (« ' + await dit1() + ' »)', /au maximum/.test(await dit1() || ''));
        // retirer jusqu'à un seul : le dernier ne s'enlève pas
        for (let i = 0; i < 6; i++) await L.toucher(c, p.locator('#calque .mb-l.on').first());
        v('marc : le dernier bouton ne s’enlève pas (« ' + await dit1() + ' »)', /au moins un/.test(await dit1() || ''));
        const nOn = await p.evaluate(() => document.querySelectorAll('#barre-bas .opg-tab').length);
        v('marc : la barre derrière a bien changé en direct (' + nOn + ' onglet)', nOn === 1, nOn);
        await L.toucher(c, p.locator('#calque .mb-l:not(.on)').filter({ has: p.locator('b', { hasText: /^Stock$/ }) }).first()); await L.toucher(c, p.locator('#calque .mb-l:not(.on)').filter({ has: p.locator('b', { hasText: /^Équipe$/ }) }).first());
        await L.toucher(c, '[data-mabarre="~ok"]'); await L.calme(p, 400);
        const mots = await p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab .t-n')].map(b => b.textContent.trim()));
        v('marc : « Terminé » ferme et la barre montre mes choix (' + mots.join(' · ') + ')', mots.length === 3 && mots.includes('Stock'), mots);
        await p.screenshot({ path: CAP + `menu-barre-perso-${PROFIL}${NUIT ? '-nuit' : ''}.png` });
        await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1600);
        const apres = await p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab .t-n')].map(b => b.textContent.trim()));
        v('marc : ma barre est retenue après rechargement', JSON.stringify(apres) === JSON.stringify(mots), apres);
        await L.toucher(c, '.tt-menu'); await L.toucher(c, '[data-mabarre="~ouvrir"]'); await L.toucher(c, '[data-mabarre="~defaut"]'); await L.calme(p, 300);
        const o = await p.evaluate(() => [...document.querySelectorAll('#barre-bas .opg-tab .t-n')].map(b => b.textContent.trim()));
        v('marc : « Barre d’origine » remet Accueil · Planning · Interventions · Clients · Comptabilité', o.join('|') === 'Accueil|Planning|Interventions|Clients|Comptabilité', o);
        await L.ranger(p);
      } else {
        v(qui + ' : pas de « Personnaliser la barre » pour ce rôle (voulu : la barre est celle du rôle)', true);
      }
    }
    v(qui + ' : aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer();
  process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('SONDE MORTE', e); process.exit(2); });
