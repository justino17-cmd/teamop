// Mise en page de l'Accueil, des Statistiques et de l'Historique : débordement (contre la largeur POSÉE du profil), cibles au doigt, champs < 16 px,
// textes écrasés, recouvrement par la barre du bas — jour ET nuit, valeurs usuelles ET valeurs longues.
// node accueil-mise-en-page.js <profil> [nuit] [long] ; captures dans le dossier temporaire (à REGARDER). « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), long = process.argv.includes('long');
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p, tag = `${profil}${nuit ? '-nuit' : '-jour'}${long ? '-long' : ''}`;
  if (long) await p.evaluate(() => {   // le nom le plus long plausible, des montants à cinq chiffres, un titre d'intervention de 70 signes
    CLIENTS.md.nom = 'Société civile immobilière des Hauts de la Rochelle et associés'; CLIENTS.mi.nom = 'Copropriété Résidence Les Mimosas du Vieux Port de La Rochelle';
    FACTURES.find(f => f.id === 'f128').ht = 12345.67 / 1.1; INTS.find(i => i.id === 'i5').titre = 'Entretien annuel de la chaudière à granulés et ramonage du conduit de fumée';
    CONTRATS.forEach(k => { k.prix = k.prix * 8.3; }); });
  for (const vue of ['accueil', 'statistiques', 'historique']) {
    await L.aller(c.p, vue); await L.calme(p, 700);
    const pop = await p.evaluate(() => document.querySelectorAll('#contenu *').length);
    v(`${vue} ${tag} : la page a du contenu (population)`, pop > 80, pop);
    const d = await L.deborde(c); v(`${vue} ${tag} : aucun glissement latéral`, d.bouge === 0 && d.seconde <= c.largeur + 1, d);
    if (c.doigt) {
      const dg = await L.doigts(p, '#contenu'); v(`accueil-05 · ${vue} ${tag} : cibles au doigt ≥ 44 px`, dg.petits.length === 0, dg.petits.slice(0, 8));
      v(`${vue} ${tag} : champs ≥ 16 px (pas de zoom d'iOS)`, dg.champs.length === 0, dg.champs.slice(0, 8));
      v(`${vue} ${tag} : aucun texte écrasé`, dg.ecrases.length === 0, dg.ecrases.slice(0, 5));
    }
    // un texte coupé sans que rien ne le dise : un élément feuille dont le contenu dépasse sa boîte (hors défilement voulu)
    const coupes = await p.evaluate(() => [...document.querySelectorAll('#contenu *')].filter(e => e.offsetParent && !e.children.length && (e.textContent || '').trim().length > 3 && e.scrollWidth > e.clientWidth + 2 && !['visible'].includes(getComputedStyle(e).overflowX) === true && getComputedStyle(e).textOverflow !== 'ellipsis' && getComputedStyle(e).overflowX !== 'auto' && getComputedStyle(e).overflowX !== 'scroll').map(e => e.className + ' « ' + e.textContent.trim().slice(0, 40) + ' »').slice(0, 6));
    v(`${vue} ${tag} : aucun texte coupé en silence`, coupes.length === 0, coupes);
    // une liste déroulante dont la valeur choisie est coupée (« Tout le mond ») : on mesure le texte choisi, dans la police du champ, contre la place qui lui reste (le chevron prend ~30 px)
    const selCoupes = await p.evaluate(() => [...document.querySelectorAll('#contenu select')].filter(e => e.offsetParent).map(e => { const cs = getComputedStyle(e), cv = document.createElement('canvas').getContext('2d'); cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const t = e.options[e.selectedIndex] ? e.options[e.selectedIndex].text : '', w = cv.measureText(t).width, place = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 28; return { t, w: Math.round(w), place: Math.round(place) }; }).filter(x => x.w > x.place));
    v(`accueil-06 · ${vue} ${tag} : aucune liste déroulante n'a sa valeur coupée`, selCoupes.length === 0, selCoupes);
    // un mot coupé au milieu dans un titre (« Historiq / ue ») : la hauteur du titre dépasse 1,6 ligne alors que son texte n'a qu'un mot
    const titres = await p.evaluate(() => [...document.querySelectorAll('#contenu h1, #contenu h2')].filter(e => e.offsetParent && !/\s/.test(e.textContent.trim())).map(e => ({ t: e.textContent.trim(), h: Math.round(e.getBoundingClientRect().height), lh: parseFloat(getComputedStyle(e).lineHeight) || parseFloat(getComputedStyle(e).fontSize) * 1.2 })).filter(x => x.h > x.lh * 1.6));
    v(`accueil-06 · ${vue} ${tag} : aucun titre d'un seul mot coupé en deux`, titres.length === 0, titres);
    // la dernière ligne n'est pas sous la barre du bas (téléphone) : faire défiler jusqu'en bas et lire ce qui recouvre le dernier élément cliquable
    if (c.doigt) { const sous = await p.evaluate(() => { window.scrollTo(0, 1e6); const els = [...document.querySelectorAll('#contenu button, #contenu a')].filter(e => e.offsetParent); const e = els[els.length - 1]; if (!e) return { vide: true }; const r = e.getBoundingClientRect(), b = document.querySelector('#barre-bas, .barre-bas, nav.bas, #tabbar'); const rb = b && b.offsetParent ? b.getBoundingClientRect() : null; return { bas: Math.round(r.bottom), barreHaut: rb ? Math.round(rb.top) : null, h: innerHeight, libelle: (e.textContent || '').trim().slice(0, 30) }; });
      v(`${vue} ${tag} : le dernier bouton n'est pas sous la barre du bas`, sous.vide || sous.barreHaut === null || sous.bas <= sous.barreHaut + 1, sous); await p.evaluate(() => scrollTo(0, 0)); }
    await p.evaluate(() => scrollTo(0, 0)); await L.calme(p, 300); await L.capture(c, O.CAP + `mep-${vue}-${tag}-haut.png`, false);   // la fenêtre visible, lisible à l'œil
    if (c.doigt) await L.capture(c, O.CAP + `mep-${vue}-${tag}.png`, true);
  }
  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v(`${tag} : aucune erreur JavaScript`, bruit.length === 0, bruit.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
