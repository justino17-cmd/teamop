// Véhicules et Temps de travail, étape 5 — « MON CAMION », LA PARTIE VÉHICULE (VEHICULES-TEMPS.md § 3.4, § 5.3 tâches 8 à 10), jouée au doigt dans la vraie page, Sophie :
// A · la structure : surtitre « Renault Trafic L2H1 · GH-482-KL », une phrase d'état, la carte « Le camion » (trois boutons aux mots exacts, sans émoji, 44 px), posée AVANT la liste de ce qui manque,
//     plus de « Messages du bureau » en double ni de ligne « Ton camion est au garage. » à part (le fait n'est écrit qu'UNE fois) ;
// B · la phrase d'état suit le véhicule (en règle, contrôle dans 12 jours, en retard, souci, garage + remplaçant, hors service, papiers manquants) — la MÊME source que la liste du gérant ;
// C · « Ma journée » : UNE ligne « Mon camion » (plus de carte « Mon véhicule », plus de doublon), elle dit l'état ET ce qu'il faut remettre à bord, et ouvre l'écran Camion ;
// D · les gestes comptés au toucher depuis la barre du bas : un plein (3, sans défiler), le compteur (3), un souci (4) — et ce qu'ils ÉCRIVENT ;
// F · les autres techniciens (Karim, Tom, Léa) : leur camion à eux ;
// E · mise en page : aucun débordement latéral, cibles ≥ 44 px, plein visible sans défiler sur 390 × 844, valeurs longues ; zéro erreur JavaScript.
// PROFILS=iphone,mac NUIT=0,1 (jour ET nuit) SEULS=A,B pour restreindre. ⛔ 127.0.0.1 seulement, un navigateur à la fois. Sort en 1 si un contrôle tombe.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'iphone,mac').split(','), NUITS = (process.env.NUIT || '0').split(',').map(x => x === '1');   // NUIT=0,1 : jour ET nuit (comme les autres sondes de la voie)
const SEULS = process.env.SEULS ? process.env.SEULS.split(',') : null, on = x => !SEULS || SEULS.includes(x);
const ev = (c, f, a) => c.p.evaluate(f, a);
let touches = 0;
const toucher = async (c, sel) => { const ok = await L.toucher(c, sel); if (ok) touches++; return ok; };
const ouvrirSm = (profil, nuit, qui) => L.ouvrir({ profil, qui:qui || 'sm', calme:true, nuit });
const etat = c => ev(c, () => { const q = s => (document.querySelector(s) || {}).textContent || ''; return { sur:q('#contenu .mc-tete .surtitre').trim(), h1:q('#contenu .mc-tete h1').trim(), phrase:q('#contenu .mc-etat').replace(/\s/g, ' ').trim(),   /* la typographie de la page met des espaces insécables avant « : » */ cl:(document.querySelector('#contenu .mc-etat') || {}).className || '' }; });
const refaire = async (c, f, a) => { await ev(c, f, a); await ev(c, () => rendre()); await L.calme(c.p, 350); };
const barre = '.opg-tab[data-tab="moncamion"]', menu = '#menu a[href="#moncamion"]';   // la barre du bas (téléphone, tablette) ou le menu (ordinateur) : UN toucher dans les deux cas
const versCamion = async c => toucher(c, (await ev(c, b => { const e = document.querySelector(b); return !!e && e.offsetParent !== null; }, barre)) ? barre : menu);
const EMOJI = /\p{Extended_Pictographic}/u;
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : ' jour');
    if (on('A')) {
      const c = await ouvrirSm(profil, nuit); await L.aller(c.p, 'moncamion');
      const pop = await ev(c, () => ({ veh:!!VEHICULES.find(o => o.id === 'veh1' && o.conducteur === 'sm'), page:!!document.querySelector('#contenu .mc-page'), h1:(document.querySelector('#contenu h1') || {}).textContent }));
      v(nom + ' · population : Sophie conduit le Trafic et l\'écran Camion est ouvert', pop.veh && pop.page && pop.h1 === 'Mon camion', pop);
      const e = await etat(c);
      v(nom + ' · en-tête : le véhicule en surtitre, « Mon camion », UNE phrase d\'état', e.sur === 'Renault Trafic L2H1 · GH-482-KL' && e.h1 === 'Mon camion' && e.phrase === 'Papiers et entretien : en règle.' && /ve-vt/.test(e.cl), e);
      const k = await ev(c, () => { const b = document.querySelector('#mc-vehicule .vh-cam'); const bt = b ? [...b.querySelectorAll('button')] : [];
        const pos = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : -1; };
        return { h3:b && b.querySelector('h3').textContent, libs:bt.map(x => x.textContent.trim()), data:bt.map(x => x.dataset.vx), noir:bt.map(x => x.classList.contains('gris') ? 'gris' : 'noir'), km:b && b.querySelector('.petit').textContent.replace(/\s+/g, ' '),
          avant:pos('#mc-vehicule') > pos('.mc-gros') && pos('#mc-vehicule') < pos('[data-vis="camion-manque"]'), garage:!!document.querySelector('.mc-garage'), msgs:[...document.querySelectorAll('#contenu h3')].some(h => /Messages? du bureau/.test(h.textContent)), ancien:!!document.querySelector('.vx-cam'), cartes:document.querySelectorAll('#contenu .vh-cam').length }; });
      v(nom + ' · la carte « Le camion » : trois boutons aux mots exacts (plein noir, compteur et souci gris), sans émoji', k.h3 === 'Le camion' && JSON.stringify(k.libs) === JSON.stringify(['Noter un plein', 'Relever le compteur', 'Un souci avec le camion']) && !k.libs.some(l => EMOJI.test(l)) && k.noir.join() === 'noir,gris,gris', k);
      v(nom + ' · …elle porte le kilométrage et la date du dernier relevé, une seule carte', /^48 210 km · relevé le 6 octobre$/.test(k.km) && k.cartes === 1, k.km);
      v(nom + ' · …et se pose entre les gros boutons du stock et la liste de ce qui manque (le plein se note sans défiler)', k.avant, k);
      v(nom + ' · le fait n\'est écrit qu\'une fois : plus de « Ton camion est au garage. » à part, plus de bloc « Messages du bureau » sur Camion, plus de carte « Mon véhicule »', !k.garage && !k.msgs && !k.ancien, k);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (structure)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('B')) {
      const c = await ouvrirSm(profil, nuit); await L.aller(c.p, 'moncamion');
      const cas = [
        ['contrôle technique dans 12 jours', () => { vehDe('veh1').ct = jour(12); }, /^Le contrôle technique est dans 12 jours\. Le bureau s’en occupe\.$/, /ve-ot/],
        ['contrôle technique en retard', () => { vehDe('veh1').ct = jour(-3); }, /^Le contrôle technique est en retard de 3 jours\. Le bureau s’en occupe\.$/, /ve-rt/],
        ['souci signalé', () => { const x = vehDe('veh1'); x.ct = jour(205); x.souci = { type:'Pneu', txt:'', qui:'sm', d:AUJ }; }, /^Ton souci est signalé\s:\sle bureau est prévenu\.$/, /ve-ot/],
        ['au garage, avec un remplaçant', () => { const x = vehDe('veh1'); x.souci = null; x.statut = 'atelier'; x.immo = { motif:'Entretien', garage:'Renault Pro', du:jour(-2), retour:jour(2), remplacement:'Citroën Berlingo VW-123-AB' }; }, /^Ton camion est au garage jusqu’au \S+ \d+ \S+\. Tu prends\s:\sCitroën Berlingo VW-123-AB\.$/, /ve-ot/],
        ['hors service', () => { const x = vehDe('veh1'); x.statut = 'hs'; x.immo = null; }, /^Ce camion ne roule plus\. Demande au bureau\.$/, /^(?!.*ve-)/],
        ['papiers pas encore renseignés', () => { const x = vehDe('veh1'); x.statut = 'service'; x.assur.fin = null; x.ct = null; }, /^Le bureau doit encore compléter les papiers de ton camion\.$/, /ve-ot/],
        ['de nouveau en règle', () => { const x = vehDe('veh1'); x.assur.fin = jour(41); x.ct = jour(205); }, /^Papiers et entretien : en règle\.$/, /ve-vt/]];
      for (const [lib, f, re, cl] of cas) { await refaire(c, f); const e = await etat(c); v(nom + ' · phrase d\'état : ' + lib + ' (« ' + e.phrase + ' »)', re.test(e.phrase) && cl.test(e.cl), e); }
      // la MÊME source que la liste du gérant : ce que vhEtat rend et ce que dit l'écran ne se contredisent pas
      await refaire(c, () => { vehDe('veh1').ct = jour(12); });
      const m = await ev(c, () => ({ liste:vhEtat(vehDe('veh1')).k, phrase:(document.querySelector('.mc-etat') || {}).textContent }));
      v(nom + ' · une seule source : la rangée du gérant dit « à faire » (vhEtat) quand l\'écran du technicien dit « le bureau s\'en occupe »', m.liste === 'afaire' && /Le bureau s’en occupe/.test(m.phrase), m);
      await refaire(c, () => { vehDe('veh1').ct = jour(205); });
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (états)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('C')) {
      const c = await ouvrirSm(profil, nuit); await L.aller(c.p, 'majournee');
      const l = await ev(c, () => ({ n:document.querySelectorAll('#contenu .vh-ligne-cam').length, tous:document.querySelectorAll('#contenu [data-go="moncamion"]').length, ancien:!!document.querySelector('.vx-cam'), mv:/Mon véhicule/.test(document.getElementById('contenu').textContent), txt:((document.querySelector('.vh-ligne-cam') || {}).textContent || '').replace(/\s+/g, ' ').trim(), bxl:!!document.querySelector('.bxl-jour'), h:Math.round((document.querySelector('.vh-ligne-cam') || { getBoundingClientRect:() => ({ height:0 }) }).getBoundingClientRect().height) }));
      v(nom + ' · Ma journée : UNE ligne « Mon camion » (pas deux raccourcis, pas de carte « Mon véhicule »)', l.n === 1 && l.tous === 1 && !l.ancien && !l.mv && !l.bxl, l);
      v(nom + ' · …elle dit l\'état et ce qu\'il faut remettre à bord, en une ligne de la largeur de l\'écran (' + l.h + ' px)', /^Mon camion\s*3 articles à remettre à bord\s*Papiers et entretien : en règle\s*›?$/.test(l.txt) && l.h <= (c.largeur >= 390 ? 100 : 120), l);   // 360 et 320 px : le texte passe sur trois lignes à côté de la pastille, jamais une carte de 300 px
      const cas = [
        ['contrôle dans 12 jours', () => { vehDe('veh1').ct = jour(12); }, /Contrôle technique dans 12 jours/, /st-o/],
        ['en retard', () => { vehDe('veh1').ct = jour(-3); }, /Contrôle technique en retard de 3 jours/, /st-r/],
        ['souci', () => { const x = vehDe('veh1'); x.ct = jour(205); x.souci = { type:'Pneu', txt:'', qui:'sm', d:AUJ }; }, /Souci signalé au bureau/, /st-r/],
        ['garage', () => { const x = vehDe('veh1'); x.souci = null; x.statut = 'atelier'; x.immo = { motif:'Entretien', garage:'Renault Pro', du:jour(-2), retour:jour(2), remplacement:'' }; }, /Au garage jusqu’au/, /st-o/],
        ['hors service', () => { const x = vehDe('veh1'); x.statut = 'hs'; x.immo = null; }, /Ne roule plus/, /st-o/],
        ['retour en règle', () => { const x = vehDe('veh1'); x.statut = 'service'; }, /Papiers et entretien : en règle/, /st-o/]];
      for (const [lib, f, re, cl] of cas) { await refaire(c, f); const r = await ev(c, () => { const b = document.querySelector('.vh-ligne-cam'); return { t:b ? b.textContent.replace(/\s+/g, ' ').trim() : '', p:b ? b.querySelector('.st').className : '' }; }); v(nom + ' · la ligne de Ma journée : ' + lib, re.test(r.t) && cl.test(r.p), r); }
      // sans rien à remettre à bord, la ligne le dit : « papiers et entretien : en règle » seul
      await ev(c, () => { window.__lm = window.lieuManques; window.lieuManques = () => []; window.__att = MVTS_ATT.splice(0); vehDe('veh1').statut = 'service'; rendre(); }); await L.calme(c.p, 300);
      const z = await ev(c, () => { const b = document.querySelector('.vh-ligne-cam'); window.lieuManques = window.__lm; MVTS_ATT.push(...window.__att); return b ? b.textContent.replace(/\s+/g, ' ').trim() : ''; });
      v(nom + ' · …et quand rien ne manque à bord : « Papiers et entretien : en règle » seul, sans deuxième ligne', /^Mon camion\s*Papiers et entretien : en règle\s*›?$/.test(z), z);
      await ev(c, () => rendre()); await L.calme(c.p, 300);
      touches = 0; await toucher(c, '.vh-ligne-cam'); const h = await ev(c, () => ({ h1:(document.querySelector('#contenu h1') || {}).textContent }));
      v(nom + ' · toucher la ligne ouvre « Mon camion » (1 toucher)', h.h1 === 'Mon camion' && touches === 1, h);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (Ma journée)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('D')) {
      // D1 · un plein : Camion → « Noter un plein » → « Enregistrer le plein » = 3 touchers (la barre du bas compte pour 1), le bouton est dans l'écran sans défiler
      { const c = await ouvrirSm(profil, nuit); await L.aller(c.p, 'majournee'); const n0 = await ev(c, () => ({ ach:ACHATS.length, ndf:NDF.length, km:vehDe('veh1').km }));
        touches = 0; await versCamion(c); await toucher(c, '#mc-vehicule [data-vx="plein|veh1"]'); await L.calme(c.p, 450);
        const vu = await ev(c, () => ({ surtitre:(document.querySelector('#calque .surtitre') || {}).textContent }));
        v(nom + ' · plein : la feuille s\'ouvre sur SON camion (surtitre « Renault Trafic L2H1 · GH-482-KL »)', /Trafic/.test(vu.surtitre) && /GH-482-KL/.test(vu.surtitre), vu);
        await ev(c, () => { const m = document.getElementById('vx-m'); m.value = '84,60'; m.dispatchEvent(new Event('input', { bubbles:true })); });
        const vu2 = await ev(c, () => { const b = document.querySelector('#calque [data-vx="pleinok"]'); const r = b.getBoundingClientRect(); return { dans:r.top >= 0 && r.bottom <= innerHeight, bas:Math.round(r.bottom), H:innerHeight }; });
        v(nom + ' · plein : « Enregistrer le plein » est dans l\'écran, sans défiler (' + vu2.bas + ' ≤ ' + vu2.H + ')', vu2.dans, vu2);
        await toucher(c, '#calque [data-vx="pleinok"]'); await L.calme(c.p, 400);
        const n1 = await ev(c, () => ({ ach:ACHATS.length, ndf:NDF.length, dernier:(ACHATS.find(x => /Carburant · GH-482-KL/.test(x.objet)) || {}).objet }));
        v(nom + ' · plein : 3 touchers (Camion, Noter un plein, Enregistrer), un achat est écrit (carte de l\'entreprise)', touches === 3 && n1.ach === n0.ach + 1 && /Carburant · GH-482-KL/.test(n1.dernier || ''), { touches, n0, n1 });
        v(nom + ' · plein : la page n\'a pas défilé', await ev(c, () => scrollY === 0 && document.getElementById('contenu').scrollTop === 0), null);
        if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (plein)', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
      // D2 · le compteur : 3 touchers, un relevé s'écrit ; un compteur plus bas est refusé
      { const c = await ouvrirSm(profil, nuit); await L.aller(c.p, 'majournee'); const km0 = await ev(c, () => vehDe('veh1').km);
        touches = 0; await versCamion(c); await toucher(c, '#mc-vehicule [data-vx="km|veh1"]'); await L.calme(c.p, 400);
        await ev(c, () => { document.getElementById('vx-nkm').value = '100'; }); await toucher(c, '#calque [data-vx^="kmok|"]'); await L.calme(c.p, 300);
        const bas = await ev(c, () => ({ km:vehDe('veh1').km, al:(document.getElementById('vx-al') || {}).textContent || '' }));
        v(nom + ' · compteur : un chiffre plus bas que le dernier relevé est refusé et n\'écrit rien', bas.km === km0 && /ne peut pas être plus bas/.test(bas.al), bas);
        await ev(c, a => { document.getElementById('vx-nkm').value = String(a + 130); }, km0); touches = 2; await toucher(c, '#calque [data-vx^="kmok|"]'); await L.calme(c.p, 400);
        const k1 = await ev(c, () => ({ km:vehDe('veh1').km, releves:vehDe('veh1').releves.length }));
        v(nom + ' · compteur : 3 touchers (Camion, Relever le compteur, Enregistrer), le kilométrage monte de 130', touches === 3 && k1.km === km0 + 130, { touches, km0, k1 });
        if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (compteur)', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
      // D3 · un souci : 4 touchers (Camion, Un souci, le choix, Prévenir le bureau) → souci noté, tâche urgente du gérant, cloche ; la phrase d'état suit
      { const c = await ouvrirSm(profil, nuit); await L.aller(c.p, 'majournee'); const t0 = await ev(c, () => TACHES.length);
        touches = 0; await versCamion(c); await toucher(c, '#mc-vehicule [data-vx="souci|veh1"]'); await L.calme(c.p, 400);
        await toucher(c, '#calque [data-vh="choix|vx-st|Pneu"]'); await toucher(c, '#calque [data-vx^="soucisok|"]'); await L.calme(c.p, 500);
        const s = await ev(c, () => ({ souci:vehDe('veh1').souci && vehDe('veh1').souci.type, n:TACHES.length, urgente:TACHES.some(t => t.urgent && /Camion GH-482-KL : pneu/.test(t.t)), notif:NOTIFS.some(n => /signale un souci sur le camion GH-482-KL/.test(JSON.stringify(n))), phrase:(document.querySelector('.mc-etat') || {}).textContent }));
        v(nom + ' · souci : 4 touchers, le souci est noté, une tâche urgente pour le gérant, la cloche prévenue', touches === 4 && s.souci === 'Pneu' && s.n === t0 + 1 && s.urgente && s.notif, { touches, s });
        v(nom + ' · souci : l\'écran Camion le dit tout de suite (« Ton souci est signalé : le bureau est prévenu. »)', /^Ton souci est signalé/.test(s.phrase), s.phrase);
        if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (souci)', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
    }

    if (on('E')) {
      const c = await ouvrirSm(profil, nuit); await L.aller(c.p, 'moncamion');
      const g = await ev(c, () => { const b = [...document.querySelectorAll('#mc-vehicule .vh-cam-b')].map(x => { const r = x.getBoundingClientRect(); return { lib:x.textContent.trim(), h:Math.round(r.height), w:Math.round(r.width), bas:Math.round(r.bottom), haut:Math.round(r.top) }; });
        const bar = Math.min(...[...document.querySelectorAll('.opg-tab')].map(e => e.getBoundingClientRect().top).filter(t => t > 0)), m = document.querySelector('[data-vis="camion-manque"] .mc-l'); return { b, H:innerHeight, bar, manque:m ? Math.round(m.getBoundingClientRect().bottom) : null }; });
      v(nom + ' · population : trois boutons dans la carte « Le camion »', g.b.length === 3, g);
      v(nom + ' · cibles : chaque bouton fait au moins 44 px de haut (' + g.b.map(x => x.h).join('/') + ')', g.b.every(x => x.h >= 44), g.b);
      if (profil === 'iphone') { v(nom + ' · sur 390 × 844 : « Noter un plein » est visible en entier, au-dessus de la barre du bas, sans défiler', g.b[0].bas <= g.bar, g);
        v(nom + ' · …et la première ligne de ce qui manque (la porte du Matériel) reste dans l\'écran (' + g.manque + ' < ' + g.H + ')', g.manque !== null && g.manque < g.H, g); }
      else v(nom + ' · le bouton « Noter un plein » commence dans l\'écran (' + g.b[0].haut + ' < ' + g.H + ')', g.b[0].haut < g.H, g);
      const d = await L.deborde(c); v(nom + ' · aucun débordement latéral (largeur ' + d.largeur + ')', d.bouge === 0 && d.seconde <= d.largeur, d);
      if (c.doigt) { const t = await L.doigts(c.p, '#mc-vehicule'); v(nom + ' · aucune cible tactile sous 44 px dans la carte, aucun texte écrasé', t.petits.length === 0 && t.ecrases.length === 0, t); }
      // valeurs longues : un nom de camion, un garage et un remplaçant très longs ne cassent rien
      await refaire(c, () => { const x = vehDe('veh1'); x.marque = 'Renault Kangoo Van E-Tech Électrique'; x.modele = 'Grand Confort Extra Long'; x.immo = { motif:'Entretien', garage:'Garage de la Vallée des Châtaigniers', du:jour(-2), retour:jour(2), remplacement:'Citroën Berlingo Multispace XTR VW-123-AB' }; x.statut = 'atelier'; });
      const d2 = await L.deborde(c); const e2 = await etat(c);
      v(nom + ' · valeurs longues (nom de 60 signes, garage et remplaçant longs) : aucun débordement', d2.bouge === 0 && d2.seconde <= d2.largeur, { d2, e2 });
      v(nom + ' · …et la phrase d\'état garde sa place (jamais écrasée)', e2.phrase.length > 60 && !(await L.doigts(c.p, '#contenu')).ecrases.length, e2.phrase);
      if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (mise en page)', c.err.length === 0, c.err.slice(0, 3));
      await L.fin(c);
    }

    if (on('F')) {   // les autres techniciens : leur camion à eux (Karim : contrôle dans 12 jours ; Tom : au garage ; Léa : en règle) — un rôle qui change les écrans est une POPULATION
      for (const [qui, veh, attendu] of [['kb', 'veh2', /^Le contrôle technique est dans 12 jours\. Le bureau s’en occupe\.$/], ['tl', 'veh4', /^Ton camion est au garage jusqu’au/], ['lr', 'veh3', /^Papiers et entretien : en règle\.$/]]) {
        const c = await ouvrirSm(profil, nuit, qui); await L.aller(c.p, 'moncamion');
        const r = await ev(c, id => ({ sur:(document.querySelector('#contenu .mc-tete .surtitre') || {}).textContent, phrase:((document.querySelector('#contenu .mc-etat') || {}).textContent || '').replace(/\s/g, ' ').trim(), boutons:[...document.querySelectorAll('#mc-vehicule .vh-cam-b')].map(b => b.dataset.vx), plaque:vehDe(id).plaque }), veh);
        v(nom + ' · ' + qui + ' : SON camion (' + r.plaque + ') en surtitre, la phrase d\'état qui lui correspond (« ' + r.phrase + ' »)', (r.sur || '').includes(r.plaque) && attendu.test(r.phrase), r);
        v(nom + ' · ' + qui + ' : les trois boutons visent SON véhicule (' + veh + ')', r.boutons.length === 3 && r.boutons.every(b => b.endsWith('|' + veh)), r.boutons);
        const d = await L.deborde(c); v(nom + ' · ' + qui + ' : aucun débordement latéral', d.bouge === 0 && d.seconde <= d.largeur, d);
        if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · ' + qui + ' : zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
    }
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
