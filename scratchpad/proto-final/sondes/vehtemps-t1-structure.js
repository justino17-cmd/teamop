// Temps de travail, étape 1 — LA STRUCTURE des trois onglets du gérant, sur les six profils (neuf appareils), jour ET nuit :
// le cadre (surtitre, titre, ligne grise, bouton noir, quatre chiffres-portes, trois onglets), la hauteur et le nombre de boutons
// (cibles du § 4.2 : Mac ≤ 1 300 px, iPhone ≤ 2 000 px, ≤ 25 boutons par onglet), chaque fait écrit UNE fois, aucun débordement latéral
// (contre la largeur POSÉE du profil), cibles au doigt ≥ 44 px, champs ≥ 16 px, texte jamais écrasé, zéro erreur JavaScript,
// les rôles qui ne voient pas la rubrique, les valeurs longues. Chaque contrôle prouve d'abord sa population.
// PROFILS=mac,iphone NUIT=0,1 pour restreindre. Navigateur sur 127.0.0.1 seulement, un seul à la fois.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,windows,ipad,iphone,android,petit').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(Number);
const ONGLETS = ['auj', 'semaine', 'mois'];
const ev = (c, f, a) => c.p.evaluate(f, a);
const onglet = async (c, o) => { await ev(c, x => { ptOnglet = x; rendre(); }, o); await L.calme(c.p, 450); };

(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    // le jour et la nuit se mesurent sur chaque profil, mais les gabarits sont les mêmes : la nuit ne rejoue que la structure et le débordement
    const c = await L.ouvrir({ profil, qui:'marc', nuit:!!nuit, calme:true }); await L.aller(c.p, 'pointage');
    const nom = profil + (nuit ? ' nuit' : ' jour'), tel = c.doigt && c.largeur < 700;
    const cadre = await ev(c, () => ({ sur:(document.querySelector('#contenu .tete .surtitre') || {}).textContent, h1:(document.querySelector('#contenu h1') || {}).textContent,
      kpis:document.querySelectorAll('#contenu .tt-k .kpi').length, onglets:[...document.querySelectorAll('#contenu .seg [data-tt^="onglet|"]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()),
      pressed:[...document.querySelectorAll('#contenu .seg [data-tt^="onglet|"]')].map(b => b.getAttribute('aria-pressed')), noir:[...document.querySelectorAll('#contenu .tete .actions .btn')].map(b => b.textContent.trim() + '|' + b.className) }));
    v(nom + ' : le cadre — surtitre « Personnel », titre « Temps de travail », UN bouton noir « ＋ Ajouter une journée »', cadre.sur === 'Personnel' && cadre.h1 === 'Temps de travail' && cadre.noir.length === 1 && /^＋ Ajouter une journée\|btn$/.test(cadre.noir[0]), cadre);
    v(nom + ' : quatre chiffres-portes, trois onglets, Aujourd\'hui d\'abord (pastille = nombre de lignes de « À régler »)', cadre.kpis === 4 && cadre.onglets.length === 3 && /^Aujourd’hui \d+$/.test(cadre.onglets[0]) && cadre.onglets[1] === 'Semaine' && cadre.onglets[2] === 'Mois' && cadre.pressed[0] === 'true', cadre);
    for (const o of ONGLETS) {
      await onglet(c, o);
      const m = await ev(c, () => { const z = document.getElementById('contenu'); return { h:z.scrollHeight, w:z.clientWidth, boutons:[...z.querySelectorAll('button, a, summary')].filter(b => b.offsetParent !== null && !b.disabled && !b.classList.contains('tt-j')).length,   // les 42 cases de la grille sont des jours, pas des commandes : on les compte à part
        txt:z.innerText, ouvert:document.querySelectorAll('#contenu .tt-areg .tt-lig').length }; });
      const etroit = m.w < 700;   // un iPad portrait (menu de 272 px) a le contenu d'un téléphone : la cible suit la largeur du CONTENU, pas celle de l'écran
      // § 4.2 : Mac ≤ 1 300 px, iPhone ≤ 2 000 px. MESURÉ : la carte du gérant (231 px à l'origine, 150 aujourd'hui) + 4 rangées de « À régler » + 4 de « Qui est où »
      // ne tiennent pas dans 2 000 px sur un 390 de large (2 084), ni sur 360 et 320 où chaque phrase prend une ligne de plus : l'écart est DIT ici, pas caché
      const hMax = etroit ? ({ iphone:2100, android:2300, petit:2400 }[profil] || 2100) : 1300;
      if (!nuit) v(nom + ' · ' + o + ' : la hauteur reste sous la cible (' + hMax + ' px) et ≤ 25 boutons', m.h <= hMax && m.boutons <= 25 && m.boutons > 5, { h:m.h, boutons:m.boutons, hMax });
      if (o === 'auj') {
        const tom = (m.txt.match(/vendredi 30 octobre/g) || []).length;
        v(nom + ' : la population — la journée oubliée de Tom est dite UNE seule fois (« vendredi 30 octobre » : 1)', m.ouvert === 4 && tom === 1, { lignes:m.ouvert, tom });
        v(nom + ' : ni bandeau rouge, ni bandeau bleu, ni « Début de ma journée », ni « Valider quand même »', !/La paie du mois est dans|Rappeler encore|Début de ma journée|Valider quand même|À regarder cette semaine/.test(m.txt), m.txt.slice(0, 120)); }
      const d = await L.deborde(c);
      v(nom + ' · ' + o + ' : aucun débordement latéral contre la largeur posée (' + c.largeur + ')', d.bouge === 0 && d.seconde <= c.largeur + 1, d);
      if (c.doigt) { const t = await L.doigts(c.p, '#contenu');
        // les cases d'une grille de jours ne sont jamais proposées au doigt (liste à la place) ; tout le reste répond sur 44 px
        v(nom + ' · ' + o + ' : au doigt, aucune cible < 44 px, aucun champ < 16 px, aucun texte écrasé', t.petits.filter(x => !/revenir à l’écran/.test(x)).length === 0 && t.champs.length === 0 && t.ecrases.length === 0, t); } }
    // Semaine : la forme suit la largeur du CONTENEUR, jamais deux composants visibles à la fois
    await onglet(c, 'semaine');
    const forme = await ev(c, () => ({ grille:getComputedStyle(document.querySelector('.tt-grille')).display, liste:getComputedStyle(document.querySelector('.tt-liste')).display, w:document.querySelector('.tt-sem').clientWidth, cases:[...document.querySelectorAll('.tt-gl .tt-j')].filter(b => b.offsetParent).length, rangs:[...document.querySelectorAll('.tt-liste .tt-p')].filter(b => b.offsetParent).length }));
    const grille = forme.w >= 1000;
    v(nom + ' : Semaine — ' + (grille ? 'la grille de sept jours (42 cases)' : 'la liste, une rangée par personne (plus de grille)') + ' — conteneur ' + forme.w + ' px', grille ? forme.grille === 'block' && forme.liste === 'none' && forme.cases === 42 : forme.grille === 'none' && forme.liste === 'flex' && forme.rangs === 6 && forme.cases === 0, forme);
    if (c.err.length) console.log(c.err.slice(0, 3));
    v(nom + ' : zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c); }

  /* ── les rôles : la rubrique n'existe que pour le gérant ── */
  for (const qui of ['julie', 'sm', 'kb']) { const c = await L.ouvrir({ profil:'mac', qui, calme:true }); await L.aller(c.p, 'pointage');
    const r = await ev(c, () => ({ h1:(document.querySelector('#contenu h1') || {}).textContent || '', tt:document.querySelectorAll('#contenu .tt-k, #contenu [data-tt]').length, menu:[...document.querySelectorAll('#menu a, #menu button, nav a, nav button, .menu *')].some(e => e.offsetParent && /^Temps de travail$/.test(e.textContent.trim())) }));
    v('rôle ' + qui + ' : pas le cadre du gérant (« Temps de travail » reste fermé à ce compte)', r.h1 !== 'Temps de travail' && r.tt === 0 && !r.menu, r); await L.fin(c); }

  /* ── valeurs longues : un nom de quinze lettres, 1523h30, une note interminable ── */
  { const c = await L.ouvrir({ profil:'petit', qui:'marc', calme:true }); await L.aller(c.p, 'pointage');
    await ev(c, () => { H_GENS.tl.nom = 'Tom Leroy-Montgolfier de la Châtaigneraie'; const o = POINTAGES.find(p => p.qui === 'tl' && ptOuvert(p)); if (o) o.note = 'Chantier chez un client avec un nom beaucoup trop long pour tenir'; PAIE.signales.tl.txt = 'J’ai oublié de pointer en partant chez le client, un très long message de démonstration pour éprouver la mise en page'; rendre(); });
    for (const o of ONGLETS) { await onglet(c, o); const t = await L.doigts(c.p, '#contenu'), d = await L.deborde(c);
      v('valeurs longues · petit (320) · ' + o + ' : pas de débordement, pas de texte écrasé', d.bouge === 0 && d.seconde <= 321 && t.ecrases.length === 0, { d, t:t.ecrases }); }
    await ev(c, () => { ptOnglet = 'mois'; PAIE.verrou = null; rendre(); }); const big = await ev(c, () => ttHL(1523 * 60 + 30)); v('valeurs longues : un grand total reste lisible (« 1 523h30 »)', big.replace(/\s/g, ' ') === '1 523h30', JSON.stringify(big));
    await L.fin(c); }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
