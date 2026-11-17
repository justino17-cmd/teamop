// Matériel, étape 1 — « Mon camion » et ses trois feuilles sur les SEPT profils, de jour ET de nuit : débordement contre la largeur POSÉE du profil
// (deux lectures, puis on demande à la page si elle glisse), champs ≥ 16 px (taille CALCULÉE, pas de zoom d'iPhone), cibles ≥ 44 px (zone qui répond),
// textes écrasés, la barre du bas qui ne recouvre rien, et les VALEURS LONGUES (nom d'article de 60 signes, client de 60 signes, 12 345,67, 1523 h 30).
// Les captures vont dans un dossier hors dépôt : on les REGARDE. Usage : node materiel-appareils.js [profil…]  → « N ✓ · M ✗ »
const L = require('../lib.js');
const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel/';
const PROFILS = process.argv.slice(2).length ? process.argv.slice(2) : ['mac', 'mac720', 'windows', 'ipad', 'iphone', 'android', 'petit'];
const LONG = 'Condensateur de démarrage permanent 5 µF 450 V à fixation universelle XL';   // 72 signes
(async () => {
  const v = L.v;
  for (const profil of PROFILS) for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil, nuit, qui:'sm' }), p = c.p, tag = `${profil}${nuit ? ' nuit' : ' jour'}`, f = `${profil}-${nuit ? 'nuit' : 'jour'}`;
    await p.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} });
    await L.aller(p, 'moncamion');
    // valeurs longues posées AVANT le dessin : un article, un client, une intervention, des quantités
    await p.evaluate(n => { PRODUITS.find(x => x.id === 'p4').nom = n; CLIENTS[INTS.find(i => i.id === 'i1').cli].nom = 'Établissements hospitaliers du Grand Sud-Ouest Atlantique Nord'; INTS.find(i => i.id === 'i1').titre = 'Mise en service d’une pompe à chaleur air-eau bi-bloc'; PRODUITS.find(x => x.id === 'p4').loc.v1 = 12345.5; rendre(); }, LONG);
    await L.calme(p, 400);
    const pop = await p.evaluate(() => ({ lignes:document.querySelectorAll('#contenu .mc-l').length, boutons:document.querySelectorAll('#contenu button').length, champs:document.querySelectorAll('#contenu input').length }));
    v(`${tag} : population — ${pop.lignes} lignes, ${pop.boutons} boutons, ${pop.champs} champ`, pop.lignes >= 4 && pop.boutons >= 8 && pop.champs === 1, pop);
    const dep = await L.deborde(c); v(`${tag} : la page ne glisse pas de côté (${dep.largeur} px posés, lu ${dep.premiere}/${dep.seconde})`, dep.bouge === 0 && dep.seconde <= c.largeur + 1, dep);
    const dg = await L.doigts(p, '#contenu');
    v(`${tag} : champs ≥ 16 px`, dg.champs.length === 0, dg.champs); v(`${tag} : aucun texte écrasé`, dg.ecrases.length === 0, dg.ecrases);
    // le logo « OP GESTION » de la barre du haut (249×38) est le menu, pas cet écran : à signaler au chantier menu, pas à compter ici
    const petits = dg.petits.filter(x => !/^OP GESTION : revenir à l’écran d’ouvertu/.test(x)); if (c.doigt) v(`${tag} : cibles ≥ 44 px (hors logo du menu : ${dg.petits.length - petits.length})`, petits.length === 0, petits);
    // la barre du bas ne recouvre pas le dernier élément quand on arrive en bas
    if (c.doigt) { const bas = await p.evaluate(() => { scrollTo(0, document.documentElement.scrollHeight); return new Promise(r => setTimeout(() => { const b = document.querySelector('.opg-tabs, nav.opg-tabs, #barre-bas, .rl-barre') || document.querySelector('.opg-tab'); const be = b && (b.closest('nav') || b), br = be && be.getBoundingClientRect(), bar = br && br.height > 0 && br.width > 0 && getComputedStyle(be).display !== 'none' ? br : null;   /* une barre absente (iPad : le menu est à gauche) n'est pas une barre à 0 px */ const els = [...document.querySelectorAll('#contenu .mc-page > *')].filter(e => e.getBoundingClientRect().height > 0), last = els[els.length - 1], lb = last && last.getBoundingClientRect(); const tout = [...document.querySelectorAll('#contenu .mc-l, #contenu .mc-bord')], bt = tout[tout.length - 1] && tout[tout.length - 1].getBoundingClientRect(); r({ bar:bar && Math.round(bar.top), dernier:bt ? Math.round(bt.bottom) : null, H:innerHeight }); }, 400)); });
      v(`${tag} : en bas de page, la barre du bas ne couvre pas la dernière ligne (${bas.dernier} ≤ ${bas.bar})`, bas.bar == null || bas.dernier == null || bas.dernier <= bas.bar + 1, bas); await p.evaluate(() => scrollTo(0, 0)); }
    await L.capture(c, `${D}camion-${f}.png`, true);
    // les trois feuilles : ouvertes, mesurées, photographiées
    for (const [k, ouvre, apres] of [['usage', '[data-mat="usage"]', async () => { await p.fill('#mat-q', 'fluide'); await L.calme(p, 200); await L.toucher(c, '#calque [data-mat^="ajoute|"]'); await L.toucher(c, '#calque [data-mat="plus|0"]'); }], ['prise', '[data-mat="prise"]', async () => {}], ['manque', '[data-mat="manque"]', async () => { await p.fill('#mm-rech', 'fluide'); await L.calme(p, 200); await L.toucher(c, '#calque [data-mat^="mpiece|"]'); }]]) {
      await L.aller(p, 'moncamion'); await L.toucher(c, ouvre); await apres(); await L.calme(p, 350);
      const pan = await p.evaluate(() => { const e = document.querySelector('#calque .panneau'); if (!e) return null; const r = e.getBoundingClientRect(), pied = document.querySelector('#calque .mat-pied'), pr = pied && pied.getBoundingClientRect(); return { l:Math.round(r.left), r:Math.round(r.right), h:Math.round(r.height), W:innerWidth, sw:e.scrollWidth, cw:e.clientWidth, pied:pr && Math.round(pr.bottom), H:innerHeight, titre:(e.querySelector('h2') || {}).textContent }; });
      v(`${tag} : feuille « ${k} » ouverte`, !!pan && !!pan.titre, pan);
      if (pan) { v(`${tag} : feuille « ${k} » sans défilement latéral (${pan.sw} ≤ ${pan.cw})`, pan.sw <= pan.cw + 1, pan); v(`${tag} : feuille « ${k} » : le bouton du bas reste dans l'écran (${pan.pied} ≤ ${pan.H})`, pan.pied != null && pan.pied <= pan.H + 1, pan);
        const dp = await L.doigts(p, '#calque .panneau'); v(`${tag} : feuille « ${k} » : champs ≥ 16 px`, dp.champs.length === 0, dp.champs); v(`${tag} : feuille « ${k} » : aucun texte écrasé`, dp.ecrases.length === 0, dp.ecrases); if (c.doigt) v(`${tag} : feuille « ${k} » : cibles ≥ 44 px`, dp.petits.length === 0, dp.petits); }
      await L.capture(c, `${D}feuille-${k}-${f}.png`); await L.ranger(p);
    }
    v(`${tag} : aucune erreur de page`, c.err.length === 0, c.err);
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
