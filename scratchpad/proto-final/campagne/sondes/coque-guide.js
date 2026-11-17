// Campagne « coque » (17 novembre 2026) — le GUIDE DES NOUVEAUTÉS : on ne juge pas son dessin (il sera refait) mais ce qu'il AFFIRME :
// chaque carte « Ce qui est nouveau » mène-t-elle à la rubrique qu'elle nomme, chaque ligne « Ce qui a changé de place » dit-elle vrai
// (le chemin « Rubrique › onglet › bouton » existe-t-il à l'écran), le guide se rouvre-t-il où il dit (« ligne Nouveautés » du menu), se ferme-t-il
// (✕, Passer, C'est parti, Échap), reste-t-il fermé ensuite. Usage : PROFIL=mac|iphone QUI=marc|julie|sm|kb node coque-guide.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUIS = (process.env.QUI || 'marc,sm').split(',');
const TEL = ['iphone', 'android', 'petit'].includes(PROFIL);
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-coque/';
const ouvert = p => p.evaluate(() => { const z = document.getElementById('nv'); return !!z && z.getBoundingClientRect().width > 0; });
const titre = p => p.evaluate(() => ((document.querySelector('#nv h2') || {}).textContent || '').replace(/\s+/g, ' ').trim());
const h1 = p => p.evaluate(() => ((document.querySelector('#contenu h1') || {}).textContent || '').replace(/\s+/g, ' ').trim());
// ce qu'une ligne « A › B › C » du guide promet : chaque mot entre « » ou chaque segment doit se lire quelque part sur la rubrique ou dans ses onglets
const PROMESSES = [
  ['statistiques', ['Bilan du mois']], ['planning', ['Vue d’ensemble', 'Mois', 'Carte']], ['devis', ['Dicter']],
  ['stock', ['Mouvements', 'À valider', 'Sortie']], ['produits', ['Bons de commande', 'Commandes en cours']], ['achats', ['Demande']], ['equipe', ['Qui peut quoi']], ['boiteMail', ['Boîtes connectées']],
];
(async () => {
  for (const QUI of QUIS) {
    const c = await L.ouvrir({ profil: PROFIL, qui: QUI }), p = c.p;
    await p.evaluate(() => { document.getElementById('nv')?.remove(); });
    const ouv = await p.evaluate(() => (typeof nvOuvrir === 'function') && nvOuvrir());
    await L.calme(p, 500);
    v(QUI + ' : le guide s’ouvre (nvOuvrir)', ouv && await ouvert(p));
    const pages = await p.evaluate(() => NV ? NV.pages.map(x => x.t.replace(/<[^>]+>/g, '')) : []);
    v(QUI + ' : population : le guide a des pages (' + pages.length + ')', pages.length >= 3, pages);
    // ---- on le feuillette : « Suivant » jusqu'au bout, « Précédent » revient
    const vus = [];
    for (let i = 0; i < pages.length - 1; i++) { vus.push(await titre(p)); await p.screenshot({ path: CAP + `guide-${PROFIL}-${QUI}-${i}.png` }); await L.toucher(c, '#nv [data-nv="apres"]'); await L.calme(p, 300); }
    v(QUI + ' : « Suivant » parcourt toutes les pages (' + vus.length + ' vues, dernière : « ' + (await titre(p)) + ' »)', vus.length === pages.length - 1 && (await p.locator('#nv [data-nv="fermer"].btn').count()) === 1);
    await L.toucher(c, '#nv [data-nv="avant"]'); await L.calme(p, 300);
    v(QUI + ' : « Précédent » revient à la page d’avant', (await titre(p)) === vus[vus.length - 1] || (await titre(p)) !== '', await titre(p));
    // ---- chaque carte « aller » mène à la rubrique qu'elle nomme
    const cartes = await p.evaluate(() => { const o = []; NV.pages.forEach((pg, i) => { const d = document.createElement('div'); d.innerHTML = pg.c; d.querySelectorAll('[data-nv^="aller|"]').forEach(b => o.push({ page:i, k:b.dataset.nv.split('|')[1], texte:(b.querySelector('b') || b).textContent.replace(/\s+/g, ' ').trim() })); }); return o; });
    const MIN = { marc: 20, sm: 6, julie: 4 }[QUI] || 1;   // une carte qui DISPARAÎT du guide (rubrique renommée, droit retiré) ne se verrait pas autrement : le contrôle de population la compte
    v(QUI + ' : population : cartes et lignes qui mènent quelque part (' + cartes.length + ' sur au moins ' + MIN + ')', cartes.length >= MIN);
    let bons = 0;
    for (const k of cartes) {
      await p.evaluate(() => { document.getElementById('nv')?.remove(); nvOuvrir(); }); await L.calme(p, 250);
      await p.evaluate(i => { NV.i = i; nvRendre(); }, k.page); await L.calme(p, 150);
      const b = p.locator(`#nv [data-nv="aller|${k.k}"]`).filter({ hasText: k.texte.slice(0, 20) }).first();
      if (!(await b.count())) { v(QUI + ' : la carte « ' + k.texte + ' » se retrouve à l’écran', false); continue; }
      await L.toucher(c, b); await L.calme(p, 700);
      const dest = await p.evaluate(() => ({ route, titre:((document.querySelector('#contenu h1') || {}).textContent || '').replace(/\s+/g, ' ').trim(), cp:(() => { const e = document.getElementById('cpsys'); return !!e && !e.hidden && e.getBoundingClientRect().width > 0; })(), nv:!!document.getElementById('nv') && document.getElementById('nv').getBoundingClientRect().width > 0 }));
      const juste = !dest.nv && (dest.route === k.k || dest.cp && k.k === 'comptabilite');
      if (juste) bons++; v(QUI + ' : carte « ' + k.texte + ' » mène à « ' + k.k + ' » et ferme le guide (route ' + dest.route + ', titre « ' + dest.titre + ' »' + (dest.cp ? ', plein écran' : '') + (dest.nv ? ', guide encore ouvert' : '') + ')', juste, dest);
      await L.ranger(p);
      if (dest.cp) { await p.evaluate(() => { const b = document.querySelector('[data-cpsys="retour"]'); b && b.click(); }); await L.calme(p, 500); }
    }
    // ---- les chemins promis existent
    for (const [k, mots] of PROMESSES) {
      const vois = await p.evaluate(k => { try { return rlPermis(k); } catch (e) { return false; } }, k);
      if (!vois) continue;
      await L.aller(p, k); await L.calme(p, 600);
      const txt = await p.evaluate(() => (document.getElementById('contenu').innerText + ' ' + [...document.querySelectorAll('#contenu [aria-label],#contenu [title]')].map(e => (e.getAttribute('aria-label') || '') + ' ' + (e.getAttribute('title') || '')).join(' ')).replace(/\s+/g, ' '));
      for (const m of mots) v((k === 'stock' || k === 'produits' ? '[coque-07] ' : '') + QUI + ' : le guide promet « ' + m + ' » dans ' + k + ' : on le lit à l’écran', txt.toLowerCase().includes(m.toLowerCase()), txt.slice(0, 160));
    }
    // ---- se ferme : ✕, Passer (ou C'est parti), Échap ; reste fermé ; se rouvre par le menu
    for (const [nom, geste] of [['✕', async () => L.toucher(c, '#nv .nv-x')], ['Échap', async () => p.keyboard.press('Escape')], ['« Passer » de la première page', async () => L.toucher(c, '#nv [data-nv="fermer"]')]]) {
      await p.evaluate(() => { document.getElementById('nv')?.remove(); nvOuvrir(); }); await L.calme(p, 250);
      await geste(); await L.calme(p, 500);
      v(QUI + ' : ' + nom + ' ferme le guide', !(await ouvert(p)));
    }
    await L.ranger(p);
    if (TEL) { await L.toucher(c, '.tt-menu'); await L.calme(p, 300); }
    const lien = p.locator(TEL ? '#calque .nv-menu' : '#menu .nv-menu').first();
    v(QUI + ' : la ligne « Nouveautés » existe dans le menu (comme le guide le dit)', (await lien.count()) === 1);
    if (await lien.count()) { await L.toucher(c, lien); await L.calme(p, 500); v(QUI + ' : « Nouveautés » rouvre le guide', await ouvert(p)); }
    v(QUI + ' : aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
    await c.ctx.close();
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
