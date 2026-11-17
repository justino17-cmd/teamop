// Véhicules, étape 3 — V2 : LA FICHE d'un véhicule (VEHICULES-TEMPS.md § 3.3), sur les six profils (neuf appareils), jour ET nuit :
// en-tête (surtitre, titre, phrase d'état + SON bouton), trois chiffres, trois gestes, liens, trois onglets (À faire · Papiers · Dépenses), la hauteur et le nombre
// de boutons (cibles : ≤ 1 700 px et ≤ 20 boutons pour À faire), les échéances (UN bouton chacune, libellés UNIQUES), Papiers (UNE ligne « Aucun document »),
// Dépenses (période, phrase-bilan, barres, liste dont chaque ligne s'ouvre, plus de liens « Modifier / Supprimer » nus), les variantes (souci signalé, au garage,
// en règle), les quatre portes d'entrée (une rangée, Équipe, l'Historique, une tâche), aucun débordement latéral, cibles ≥ 44 px, zéro erreur JavaScript.
// PROFILS=mac,iphone NUIT=0,1 SEULS=A,B pour restreindre. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,windows,ipad,iphone,android,petit').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(Number);
const SEULS = process.env.SEULS ? process.env.SEULS.split(',') : null, on = x => !SEULS || SEULS.includes(x);
const ev = (c, f, a) => c.p.evaluate(f, a);
const ouvrir = async (c, id, onglet) => { await ev(c, a => { fermerPanneau(); vehFiche(a[0], a[1]); }, [id, onglet || 'afaire']); await L.calme(c.p, 500); };
const lire = c => ev(c, () => { const p = document.querySelector('#calque .panneau'); if (!p) return null;
  return { h:p.scrollHeight, sur:(p.querySelector('.surtitre') || {}).textContent, titre:(p.querySelector('h2') || {}).textContent, phrase:((p.querySelector('.vh-phrase') || {}).textContent || '').trim(), alerte:((p.querySelector('.vh-alerte') || {}).textContent || '').replace(/\s+/g, ' ').trim(),
    stats:[...p.querySelectorAll('.vh-stats span')].map(s => s.textContent.replace(/\s+/g, ' ').trim()), gestes:[...p.querySelectorAll('.vh-gestes .btn')].map(b => b.textContent.trim()), liens:[...p.querySelectorAll('.vh-liens > *')].map(b => b.textContent.replace(/\s+/g, ' ').trim()),
    onglets:[...p.querySelectorAll('.vh-onglets button')].map(b => b.textContent.trim() + '|' + b.getAttribute('aria-pressed')), boutons:[...p.querySelectorAll('button, a, summary, label.btn')].filter(b => b.offsetParent !== null && !b.disabled && !b.classList.contains('x')).length,
    ech:[...p.querySelectorAll('.vh-ech')].map(e => ({ nom:(e.querySelector('b') || {}).textContent, boutons:[...e.querySelectorAll('.btn')].map(b => b.textContent.trim()), noirs:[...e.querySelectorAll('.btn')].filter(b => !b.classList.contains('gris')).length })),
    txt:p.innerText, id:(p.querySelector('.vh-fiche-id') || {}).dataset ? p.querySelector('.vh-fiche-id').dataset.vid : null }; });
/* un panneau plus haut que l'écran défile ; une fenêtre trop étroite fait déborder : on mesure contre la largeur POSÉE */
const larg = (c, sel) => ev(c, s => { const p = document.querySelector(s || '#calque .panneau'); return p ? { w:Math.round(p.getBoundingClientRect().width), sw:p.scrollWidth, cw:p.clientWidth } : null; }, sel);

(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : ' jour');
    const c = await L.ouvrir({ profil, qui:'marc', nuit:!!nuit, calme:true }); await L.aller(c.p, 'vehicules');
    const tel = c.doigt && c.largeur < 700;

    if (on('A')) {   // la Peugeot : un contrôle technique dans 12 jours, aucun rendez-vous noté
      await L.toucher(c, '.vh-liste [data-vh="fiche|veh2"]'); await L.calme(c.p, 500);
      const f = await lire(c);
      v(nom + ' : toucher la rangée de la Peugeot ouvre SA fiche (surtitre « plaque · année · énergie », titre, onglet À faire choisi)', !!f && /AB-123-CD · 2019 · Gazole/i.test(f.sur) && f.titre === 'Peugeot Expert' && f.id === 'veh2' && f.onglets.join() === 'À faire|true,Papiers|false,Dépenses|false', f && { sur:f.sur, titre:f.titre, onglets:f.onglets });
      v(nom + ' : la phrase d\'état dit tout, avec SON bouton noir — « Le contrôle technique est dans 12 jours. Aucun rendez-vous n\'est noté. » + « Noter le rendez-vous »', f.phrase === 'Le contrôle technique est dans 12 jours. Aucun rendez-vous n’est noté.' && /Noter le rendez-vous/.test(await ev(c, () => document.querySelector('#calque .vh-phrase').nextElementSibling.textContent)), f.phrase);
      v(nom + ' : trois chiffres — 121 540 km (relevé le…), 0,31 € le kilomètre, 3 à remettre à bord', f.stats.length === 3 && /^121\s?540 km kilométrage · relevé le 6 octobre$/.test(f.stats[0].replace(/ /g, ' ')) && /^0,31\s€ le kilomètre, sur 12 mois$/.test(f.stats[1].replace(/ /g, ' ')) && /^\d+ à remettre à bord$/.test(f.stats[2]), f.stats);
      v(nom + ' : trois gestes (« Noter un plein », « Relever le compteur », « Mettre au garage ») et les liens (conducteur, changer, stock)', f.gestes.join() === 'Noter un plein,Relever le compteur,Mettre au garage' && /Karim Benali/.test(f.liens[0]) && f.liens.some(x => /Changer de conducteur/.test(x)) && f.liens.some(x => /Stock du camion/.test(x)), { g:f.gestes, l:f.liens });
      v(nom + ' : les échéances — QUATRE rangées, chacune UN bouton, tous de libellés différents, le noir seulement sur la plus urgente', f.ech.length === 4 && f.ech.every(e => e.boutons.length === 1) && new Set(f.ech.map(e => e.boutons[0])).size === 4 && f.ech.filter(e => e.noirs).length === 1 && f.ech[0].noirs === 1, f.ech);
      v(nom + ' : libellés — « Noter le rendez-vous » (contrôle, révision), « Noter le renouvellement », « Noter le contrôle du matériel » : plus de deux « Contrôle fait » identiques', f.ech.map(e => e.boutons[0]).sort().join('|') === ['Noter le contrôle du matériel', 'Noter le rendez-vous', 'Noter le rendez-vous', 'Noter le renouvellement'].sort().join('|'), f.ech.map(e => e.boutons[0]));
      v(nom + ' : « Déjà fait » est en bas de l\'onglet (trois choses, le reste replié) et l\'ancienne fiche a disparu — pas de « Historique du véhicule », « Matériel de sécurité », huit cases, « Aujourd\'hui et demain avec »', /Déjà fait/.test(f.txt) && !/Historique du véhicule|Aujourd’hui et demain|Contrôle fait aujourd’hui|Tout est présent|Saisir un plein|sous la dotation/.test(f.txt), f.txt.match(/Historique du véhicule|Aujourd’hui et demain|Contrôle fait aujourd’hui|Tout est présent|Saisir un plein|sous la dotation/g));
      const cible = tel ? 1400 : 1700;
      if (!nuit) v(nom + ' : la hauteur de l\'onglet À faire reste sous la cible (' + cible + ' px ; spécification : 1 700 au bureau, 1 400 sur téléphone) et ≤ 20 boutons', f.h <= cible && f.boutons <= 20 && f.boutons > 5, { h:f.h, boutons:f.boutons });
      const w = await larg(c); v(nom + ' : la fiche ne déborde pas de côté (largeur de la fiche ' + (w && w.w) + ', contenu ' + (w && w.sw) + ')', !!w && w.sw <= w.cw + 1 && w.w <= c.largeur + 1, w);
      if (c.doigt) { const t = await L.doigts(c.p, '#calque .panneau'); v(nom + ' : au doigt, aucune cible < 44 px, aucun champ < 16 px, aucun texte écrasé', t.petits.length === 0 && t.champs.length === 0 && t.ecrases.length === 0, t); }
      const libs = await ev(c, () => [...document.querySelectorAll('#calque .panneau .btn, #calque .panneau .lien')].filter(b => b.offsetParent !== null).map(b => { const r = b.getBoundingClientRect(), lh = parseFloat(getComputedStyle(b).lineHeight) || 18; return { t:b.textContent.trim(), lignes:Math.round((r.height - (parseFloat(getComputedStyle(b).paddingTop) + parseFloat(getComputedStyle(b).paddingBottom))) / lh) }; }));
      v(nom + ' : aucun libellé de bouton sur deux lignes dans une pilule', libs.length > 6 && libs.filter(x => x.lignes > 1 && x.t.length < 40).length === 0, libs.filter(x => x.lignes > 1));
    }

    if (on('B')) {   // les trois onglets
      await ouvrir(c, 'veh2', 'papiers'); const p = await lire(c);
      v(nom + ' : Papiers — l\'assurance, UNE ligne « Aucun document pour l\'instant » (pas trois « Pas encore ajouté »), « Ajouter un document », « Une amende » et « Un accident » sans descendre', p.onglets[1] === 'Papiers|true' && /Assurance\nMAAF Pro · contrat FL-77121 · jusqu’au 11 décembre 2026/i.test(p.txt.replace(/ /g, ' ')) && (p.txt.match(/Aucun document pour l’instant/g) || []).length === 1 && !/Pas encore ajouté/.test(p.txt) && /Ajouter un document/.test(p.txt) && /Une amende/.test(p.txt) && /Un accident/.test(p.txt) && /Aucune amende, aucun accident\./.test(p.txt), p.txt.slice(0, 600));
      if (!nuit) v(nom + ' : Papiers — la fiche reste sous 1 400 px (spécification : tout, sans descendre de trois écrans)', p.h <= 1400, p.h);
      await ouvrir(c, 'veh2', 'depenses'); const d = await lire(c);
      const det = await ev(c, () => { const q = document.querySelector('#calque .panneau'); return { per:[...q.querySelectorAll('.vh-per button')].map(b => b.textContent + '|' + b.getAttribute('aria-pressed')), barres:q.querySelectorAll('.vx-barre').length, legende:(q.querySelector('.vx-legende') || {}).textContent, lignes:q.querySelectorAll('.vh-fr').length, nus:[...q.querySelectorAll('.lien')].filter(b => /^(Modifier|Supprimer)$/.test(b.textContent.trim())).length, csv:!!q.querySelector('[data-vh^="csv|"]'), plein:!!q.querySelector('.vh-fcorps [data-vh^="plein|"]'), nbFrais:vehFrais(vehDe('veh2')).length }; });
      v(nom + ' : Dépenses — période « Ce mois-ci · 12 mois · Tout » (12 mois choisi), UNE phrase-bilan, six barres, légende de trois mots', det.per.join() === 'Ce mois-ci|false,12 mois|true,Tout|false' && /^\d[\d\s ]* € dépensés sur 12 mois, soit 0,31\s€ du kilomètre et \d+\s€ par mois\./.test(d.phrase.replace(/ /g, ' ')) && det.barres === 6 && /Carburant/.test(det.legende) && /Assurance/.test(det.legende), { per:det.per, phrase:d.phrase, barres:det.barres });
      v(nom + ' : Dépenses — chaque dépense est une ligne qu\'on touche (' + det.nbFrais + ' sur la population), plus de liens « Modifier / Supprimer » nus, « Exporter en tableau » en bas, « Noter un plein » pas répété', det.lignes === det.nbFrais && det.lignes >= 3 && det.nus === 0 && det.csv && !det.plein, det);
      await L.toucher(c, '#calque .panneau .vh-fr'); await L.calme(c.p, 450);
      const fe = await ev(c, () => { const q = document.querySelector('#calque .panneau'); return { h2:(q.querySelector('h2') || {}).textContent, supp:[...q.querySelectorAll('.btn.rouge')].map(b => b.textContent.trim()), enreg:[...q.querySelectorAll('.btn')].some(b => b.textContent.trim() === 'Enregistrer') }; });
      v(nom + ' : toucher une dépense ouvre « Cette dépense » avec « Enregistrer » et « Supprimer cette dépense » (rouge)', fe.h2 === 'Cette dépense' && fe.supp.join() === 'Supprimer cette dépense' && fe.enreg, fe);
      await L.toucher(c, '#calque .panneau [data-ve^="fiche|"]'); await L.calme(c.p, 450);
      const rt = await lire(c); v(nom + ' : « Retour » ramène à la fiche, sur l\'onglet Dépenses où l\'on était', !!rt && rt.onglets.join() === 'À faire|false,Papiers|false,Dépenses|true', rt && rt.onglets);
      await L.toucher(c, '#calque .panneau [data-vh="fonglet|afaire"]'); await L.calme(c.p, 350);
      const re = await lire(c); v(nom + ' : un onglet qu\'on touche se choisit (À faire), le contenu change', re.onglets[0] === 'À faire|true' && re.ech.length === 4, re.onglets);
    }

    if (on('C') && !nuit) {   // les variantes : en règle, souci signalé, au garage, sans conducteur
      await ouvrir(c, 'veh1'); const r = await lire(c);
      v(nom + ' : un véhicule en règle — « Tout est en règle. La prochaine échéance est l\'assurance, dans 41 jours. » (grise), AUCUN bouton noir sous la phrase', r.phrase === 'Tout est en règle. La prochaine échéance est l’assurance, dans 41 jours.' && !(await ev(c, () => { const n = document.querySelector('#calque .vh-phrase').nextElementSibling; return n && n.matches('.btn'); })), r.phrase);
      await ouvrir(c, 'veh4'); const g = await lire(c);
      v(nom + ' : le Kangoo au garage — l\'alerte orange en haut (garage, motif, retour prévu, « 1 intervention de Tom à déplacer », « Le remettre en service », « Voir au planning ›»), la phrase « Ce véhicule est au garage depuis le… », le bouton PAS répété', /Au garage · Entretien · Renault Pro · retour prévu lundi 2 novembre/.test(g.alerte) && /1 intervention de Tom à déplacer/.test(g.alerte) && /Le remettre en service/.test(g.alerte) && /Voir au planning/.test(g.alerte) && /^Ce véhicule est au garage depuis le 29 octobre\./.test(g.phrase) && (g.txt.match(/Le remettre en service/g) || []).length === 2 /* alerte + geste de fiche « Le remettre en service » */, { alerte:g.alerte, phrase:g.phrase, gestes:g.gestes });
      v(nom + ' : au garage — le geste de fiche devient « Le remettre en service » (« Mettre au garage » a disparu)', g.gestes.includes('Le remettre en service') && !g.gestes.includes('Mettre au garage'), g.gestes);
      await ev(c, () => { VEHICULES[0].souci = { type:'Voyant allumé', qui:'sm', d:jour(-1), txt:'voyant moteur allumé' }; VEHICULES[2].conducteur = ''; }); await ouvrir(c, 'veh1'); const s = await lire(c);
      v(nom + ' : un souci signalé — « Sophie a signalé un souci : voyant moteur allumé · hier » + « C\'est réglé », en haut', /Sophie a signalé un souci : voyant moteur allumé · hier/.test(s.alerte) && /C’est réglé/.test(s.alerte), s.alerte);
      await ouvrir(c, 'veh3'); const sc = await lire(c);
      v(nom + ' : sans conducteur — « Sans conducteur » dit, « Désigner un conducteur » proposé', sc.liens.some(x => /Désigner un conducteur/.test(x)) && !sc.liens.some(x => /Changer de conducteur/.test(x)), sc.liens);
      await ev(c, () => { VEHICULES[0].souci = null; delete VEHICULES[0].souci; VEHICULES[2].conducteur = 'lr'; });
    }

    if (on('D') && !nuit) {   // les quatre portes d'entrée : une rangée (fait en A), Équipe, l'Historique, une tâche
      await ev(c, () => { fermerPanneau(); eqFiche('kb'); }); await L.calme(c.p, 450);
      const lien = await ev(c, () => !!document.querySelector('#calque .panneau [data-ve^="fiche|veh2"]'));
      await L.toucher(c, '#calque .panneau [data-ve="fiche|veh2"]'); await L.calme(c.p, 450); const e = await lire(c);
      v(nom + ' : la fiche Équipe de Karim → « Peugeot Expert · AB-123-CD › » ouvre la fiche du véhicule (onglet À faire)', lien && !!e && e.id === 'veh2' && e.onglets[0] === 'À faire|true', { lien, id:e && e.id });
      await ev(c, () => { fermerPanneau(); const b = document.createElement('button'); b.setAttribute('data-vx', 'ouvrir|veh3'); b.id = 'essai-hist'; b.hidden = false; document.body.appendChild(b); }); await L.toucher(c, '#essai-hist'); await L.calme(c.p, 700);
      const h = await lire(c); v(nom + ' : « Ouvrir le véhicule » de l\'Historique ouvre la fiche', !!h && h.id === 'veh3', h && h.id);
      await ev(c, () => { fermerPanneau(); const b = document.createElement('button'); b.setAttribute('data-taller', 'vehicules|veh4'); b.id = 'essai-tache'; document.body.appendChild(b); }); await L.toucher(c, '#essai-tache'); await L.calme(c.p, 700);
      const t = await lire(c); v(nom + ' : le lien d\'une tâche (« vehicules|veh4 ») ouvre la fiche du Kangoo', !!t && t.id === 'veh4', t && t.id);
      await ev(c, () => { for (const id of ['essai-hist', 'essai-tache']) { const x = document.getElementById(id); if (x) x.remove(); } fermerPanneau(); });
    }

    if (on('E') && !nuit) {   // l'onglet d'une fiche ne suit pas la suivante : une AUTRE fiche s'ouvre sur « À faire », la même (ou une feuille posée par-dessus) garde son onglet, une fiche rouverte repart de « À faire »
      await ev(c, () => { fermerPanneau(); vehFiche('veh2', 'depenses'); }); await L.calme(c.p, 350);
      await ev(c, () => { vehFiche('veh1'); }); await L.calme(c.p, 350); const a1 = await lire(c);
      v(nom + ' : ouvrir un AUTRE véhicule (fiche déjà ouverte sur Dépenses) → il s\'ouvre sur « À faire »', a1.id === 'veh1' && a1.onglets[0] === 'À faire|true', a1.onglets);
      await ev(c, () => { document.querySelector('#calque [data-vh="fonglet|papiers"]').click(); }); await L.calme(c.p, 300);
      await ev(c, () => { vehFiche('veh1'); }); await L.calme(c.p, 300); const a2 = await lire(c);
      v(nom + ' : la MÊME fiche rouverte pendant qu\'elle est là (retour d\'une feuille) garde son onglet (Papiers)', a2.id === 'veh1' && a2.onglets[1] === 'Papiers|true', a2.onglets);
      await ev(c, () => { fermerPanneau(); vehFiche('veh1'); }); await L.calme(c.p, 300); const a3 = await lire(c);
      v(nom + ' : une fiche fermée puis rouverte repart de « À faire »', a3.id === 'veh1' && a3.onglets[0] === 'À faire|true', a3.onglets);
    }

    if (c.err.length) console.log(c.err.slice(0, 3));
    v(nom + ' : zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
