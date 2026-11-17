// Véhicules, étape 3 — V1 : LA LISTE (VEHICULES-TEMPS.md § 3.2), sur les six profils (neuf appareils), jour ET nuit :
// le cadre (surtitre, titre, ligne grise qui répond, « Noter un plein » + « ＋ Nouveau véhicule »), trois chiffres-portes, trois onglets (pastilles),
// UNE rangée par véhicule (une seule phrase d'état, au plus UN bouton), l'ordre des situations, la rangée « Les 4 véhicules » (assurance groupée),
// les états vides, la hauteur, aucun débordement latéral (contre la largeur POSÉE), cibles au doigt ≥ 44 px, champs ≥ 16 px, aucun texte écrasé,
// zéro erreur JavaScript. Chaque contrôle prouve d'abord sa population. PROFILS=mac,iphone NUIT=0,1 SEULS=A,B pour restreindre.
// ⛔ 127.0.0.1 seulement (lib.js), entreprise fictive, un navigateur à la fois.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,windows,ipad,iphone,android,petit').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(Number);
const SEULS = process.env.SEULS ? process.env.SEULS.split(',') : null, on = x => !SEULS || SEULS.includes(x);
const ev = (c, f, a) => c.p.evaluate(f, a);
const rendu = async c => { await ev(c, () => { rendre(); }); await L.calme(c.p, 450); };
/* hauteurs de la page entière (scrollHeight de #contenu, rembourrage de la barre du bas compris) : § 3.2 vise 900 px au bureau et 1 200 px sur iPhone avec 4 véhicules.
   MESURÉ : au bureau 770 px ; sur téléphone la rubrique (en-tête 160 + trois chiffres 90 + onglets 50 + cinq lignes de 150 à 290 px + 128 de barre) tient dans ~1 540 px :
   l'écart avec la cible est DIT ici, pas caché — chaque rangée garde ses trois niveaux et son bouton sous le texte (la règle de la spécification) */
const H_MAX = { mac:900, windows:900, ipad:1700, iphone:1650, android:1750, petit:1900 };

(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : ' jour');
    let c = await L.ouvrir({ profil, qui:'marc', nuit:!!nuit, calme:true }); await L.aller(c.p, 'vehicules');
    const tel = c.doigt && c.largeur < 700;

    if (on('A')) {
      const r = await ev(c, () => { const z = document.getElementById('contenu'), t = s => [...z.querySelectorAll(s)];
        const rangs = t('.vh-liste .vh-l').map(l => ({ groupe:l.classList.contains('vh-groupe'), nom:(l.querySelector('.vh-nom') || {}).textContent, pastilles:l.querySelectorAll('.vh-et .st').length, boutons:l.querySelectorAll('.btn').length,
          pastille:(l.querySelector('.vh-et .st') || {}).textContent, prec:((l.querySelector('.vh-prec') || {}).textContent || '').trim(), geste:(l.querySelector('.btn') || {}).textContent || '', chevron:!!l.querySelector('.vh-chev') }));
        return { sur:(z.querySelector('.tete .surtitre') || {}).textContent, h1:(z.querySelector('h1') || {}).textContent, gris:((z.querySelector('.tete > div > .gris') || {}).textContent || '').trim(),
          actions:t('.tete .actions .btn').map(b => b.textContent.trim() + '|' + b.className.replace(/\s+/g, ' ')), kpis:t('.vh-k .kpi').map(k => k.innerText.replace(/\s+/g, ' ').trim()),
          onglets:t('.seg [data-vh^="onglet|"]').map(b => b.textContent.replace(/\s+/g, ' ').trim() + '|' + b.getAttribute('aria-pressed')), pastillesOnglet:t('.seg .t-nb').map(x => x.textContent + (x.classList.contains('rouge') ? 'R' : 'g')), rangs, txt:z.innerText }; });
      v(nom + ' : le cadre — surtitre « Personnel », titre « Véhicules », ligne grise qui répond, « Noter un plein » puis « ＋ Nouveau véhicule » (noir)', r.sur === 'Personnel' && r.h1 === 'Véhicules'
        && r.gris === '3 véhicules sur 4 en service. Le Kangoo est au garage jusqu’au lundi 2 novembre.' && r.actions.length === 2 && /^Noter un plein\|btn gris/.test(r.actions[0]) && /^＋ Nouveau véhicule\|btn( |$)/.test(r.actions[1]) && !/gris/.test(r.actions[1].split('|')[1]), r);
      v(nom + ' : trois chiffres-portes — « 3 sur 4 en service », « 3 à faire », « 1 566 € dépensés en octobre »', r.kpis.length === 3 && /^3 sur 4 en service$/.test(r.kpis[0]) && /^3 à faire$/.test(r.kpis[1]) && /^1\s566\s€ dépensés en octobre/.test(r.kpis[2]), r.kpis);
      v(nom + ' : trois onglets — Tous (choisi), À faire (pastille rouge 3), Au garage (pastille grise 1)', r.onglets.length === 3 && r.onglets[0] === 'Tous|true' && /^À faire 3\|false$/.test(r.onglets[1]) && /^Au garage 1\|false$/.test(r.onglets[2]) && r.pastillesOnglet.join() === '3R,1g', r);
      v(nom + ' : la population — la rangée « Les 4 véhicules » puis QUATRE véhicules, chacun UNE pastille et au plus UN bouton', r.rangs.length === 5 && r.rangs[0].groupe && r.rangs.slice(1).every(x => !x.groupe) && r.rangs.every(x => x.pastilles === 1 && x.boutons <= 1), r.rangs.map(x => x.nom + '|' + x.pastilles + '|' + x.boutons));
      v(nom + ' : l\'ordre des situations — assurance du groupe, au garage, à faire, puis les deux en règle', r.rangs.map(x => x.pastille).join() === 'À faire,Au garage,À faire,En règle,En règle', r.rangs.map(x => x.pastille));
      v(nom + ' : chaque rangée porte SON geste (D11) — renouvellement, remettre en service, noter le rendez-vous, rien (un chevron) pour ceux en règle', r.rangs.map(x => x.geste).join('|') === 'Noter le renouvellement|Le remettre en service|Noter le rendez-vous||' && r.rangs[3].chevron && r.rangs[4].chevron, r.rangs.map(x => x.geste));
      v(nom + ' : une échéance dite UNE fois — le contrôle technique de la Peugeot paraît une seule fois sur l\'écran, et le garage du Kangoo une seule', (r.txt.match(/Contrôle technique/g) || []).length === 1 && (r.txt.match(/Chez Renault Pro/g) || []).length === 1, { ct:(r.txt.match(/Contrôle technique/g) || []).length });
      v(nom + ' : les phrases — « Contrôle technique dans 12 jours », « Chez Renault Pro jusqu\'au lundi 2 novembre · 1 intervention de Tom à déplacer », « La prochaine échéance est la révision, dans 62 jours » (l\'assurance du groupe est dite sur sa rangée, gerant-15)',
        r.rangs[2].prec === 'Contrôle technique dans 12 jours' && r.rangs[1].prec === 'Chez Renault Pro jusqu’au lundi 2 novembre · 1 intervention de Tom à déplacer' && r.rangs[3].prec === 'La prochaine échéance est la révision, dans 62 jours' && r.rangs[0].prec === 'Échéance le 11 décembre, dans 41 jours', r.rangs.map(x => x.prec));
      v(nom + ' : aucun mot interdit — pas de « Immobilisés », « flotte », « sinistre », « Frais », « Saisir »', !/Immobilis|flotte|inistre|Frais|Saisir|échéances à prévoir|stock à bord/.test(r.txt), r.txt.match(/Immobilis|flotte|inistre|Frais|Saisir|échéances à prévoir|stock à bord/g));
      const m = await ev(c, () => { const z = document.getElementById('contenu'); return { h:z.scrollHeight, boutons:[...z.querySelectorAll('button, a, summary')].filter(b => b.offsetParent !== null && !b.disabled).length }; });
      if (!nuit) v(nom + ' : la hauteur reste sous la cible (' + H_MAX[profil] + ' px ; spécification : 900 au bureau, 1 200 sur iPhone — écart DIT dans l\'en-tête) et ≤ 25 boutons', m.h <= H_MAX[profil] && m.boutons <= 25, m);
      const d = await L.deborde(c);
      v(nom + ' : aucun débordement latéral contre la largeur posée (' + c.largeur + ')', d.bouge === 0 && d.seconde <= c.largeur + 1, d);
      if (c.doigt) { const t = await L.doigts(c.p, '#contenu');
        v(nom + ' : au doigt, aucune cible < 44 px, aucun champ < 16 px, aucun texte écrasé', t.petits.filter(x => !/revenir à l’écran/.test(x)).length === 0 && t.champs.length === 0 && t.ecrases.length === 0, t); }
    }

    if (on('B')) {   // les onglets et les portes des chiffres, jouées
      await ev(c, () => { VH.onglet = 'tous'; rendre(); }); await L.calme(c.p, 350);
      const kpis = await ev(c, () => [...document.querySelectorAll('.vh-k .kpi')].map(k => k.getAttribute('data-vh')));
      v(nom + ' : les trois chiffres sont des BOUTONS (onglet Tous, onglet À faire, la feuille des coûts)', kpis.join() === 'onglet|tous,onglet|afaire,cout', kpis);
      await L.toucher(c, '.vh-k [data-vh="onglet|afaire"]'); await L.calme(c.p, 350);
      const af = await ev(c, () => ({ n:document.querySelectorAll('.vh-liste .vh-l').length, sans:[...document.querySelectorAll('.vh-liste .vh-l')].filter(l => !l.querySelector('.btn')).length, press:document.querySelector('.seg [data-vh="onglet|afaire"]').getAttribute('aria-pressed') }));
      v(nom + ' : « 3 à faire » ouvre l\'onglet À faire — trois rangées, TOUTES avec un bouton (la population compte avant le zéro)', af.n === 3 && af.sans === 0 && af.press === 'true', af);
      await L.toucher(c, '.seg [data-vh="onglet|garage"]'); await L.calme(c.p, 350);
      const ga = await ev(c, () => ({ noms:[...document.querySelectorAll('.vh-liste .vh-nom')].map(x => x.textContent) }));
      v(nom + ' : l\'onglet Au garage ne montre que le Kangoo', ga.noms.length === 1 && /Kangoo/.test(ga.noms[0]), ga);
      await L.toucher(c, '.vh-k [data-vh="cout"]'); await L.calme(c.p, 450);
      const co = await ev(c, () => { const p = document.querySelector('#calque .panneau'); return p ? { h2:(p.querySelector('h2') || {}).textContent, lignes:p.querySelectorAll('.vh-rl').length, barres:p.querySelectorAll('.vh-rb i').length, couleurs:[...new Set([...p.querySelectorAll('.vh-rb i')].map(i => getComputedStyle(i).backgroundColor))].length, txt:p.innerText } : null; });
      v(nom + ' : « 1 566 € dépensés » ouvre « Ce que coûtent les véhicules » — quatre véhicules, du moins cher au plus cher, UNE couleur neutre pour les barres', !!co && co.h2 === 'Ce que coûtent les véhicules' && co.lignes === 4 && co.barres === 4 && co.couleurs === 1 && /assurance comprise/.test(co.txt), co && { h2:co.h2, lignes:co.lignes, barres:co.barres, couleurs:co.couleurs });
      const ordre = await ev(c, () => [...document.querySelectorAll('#calque .vh-rl .vh-mt')].map(x => parseFloat(x.textContent.replace(/[^\d,]/g, '').replace(',', '.'))));
      v(nom + ' : le classement va du moins cher au plus cher au kilomètre', ordre.length === 4 && ordre.every((x, i) => i === 0 || x >= ordre[i - 1]), ordre);
      await ev(c, () => { fermerPanneau(); VH.onglet = 'tous'; rendre(); }); await L.calme(c.p, 300);
    }

    if (on('C') && !nuit) {   // les états vides — chacun prouve d'abord qu'il y avait de quoi vider
      const avant = await ev(c, () => VEHICULES.length);
      await ev(c, () => { window.__vSauve = VEHICULES; VEHICULES = []; VH.onglet = 'tous'; rendre(); }); await L.calme(c.p, 400);
      const e0 = await ev(c, () => { const z = document.getElementById('contenu'); return { b:(z.querySelector('.vh-vide b') || {}).textContent, txt:z.innerText, kpis:z.querySelectorAll('.vh-k .kpi').length, seg:z.querySelectorAll('.seg').length, bouton:[...z.querySelectorAll('.btn')].map(b => b.textContent.trim()), gris:(z.querySelector('.tete > div > .gris') || {}).textContent }; });
      v(nom + ' : aucun véhicule (sur ' + avant + ') — « Ajoute ton premier véhicule », sa phrase, UN bouton « ＋ Nouveau véhicule », ni chiffres ni onglets', avant === 4 && e0.b === 'Ajoute ton premier véhicule' && /Tu verras ses papiers, ses pleins et ce qu’il coûte au kilomètre\. Le contrôle technique et l’assurance te préviennent à l’avance\./.test(e0.txt)
        && e0.kpis === 0 && e0.seg === 0 && e0.bouton.length === 1 && e0.bouton[0] === '＋ Nouveau véhicule' && e0.gris === 'Tes véhicules, leurs papiers et ce qu’ils coûtent.', e0);
      await ev(c, () => { VEHICULES = window.__vSauve; VEHICULES.forEach(x => { x.statut = 'service'; delete x.garage; delete x.immo; delete x.souci; x.assur.fin = jour(300); x.ct = jour(500); x.entretien = { km:x.km + 20000, date:jour(300), lib:'Révision' }; x.materiel.fait = AUJ; }); VH.onglet = 'afaire'; rendre(); }); await L.calme(c.p, 400);
      const e1 = await ev(c, () => { const z = document.getElementById('contenu'); return { b:(z.querySelector('.vh-vide b') || {}).textContent, txt:z.innerText, rangs:z.querySelectorAll('.vh-l').length, gris:(z.querySelector('.tete > div > .gris') || {}).textContent, kpi:((z.querySelectorAll('.vh-k .kpi')[1] || {}).innerText || '').replace(/\s+/g, ' ').trim() }; });
      v(nom + ' : « À faire » vide (quatre véhicules en règle) — coche, « Rien à faire pour le moment. », la prochaine échéance, ligne grise « Tous tes véhicules sont en règle. », chiffre « 0 à faire »',
        e1.b === 'Rien à faire pour le moment.' && /Prochaine échéance\s:\s[^,\n]+,\sdans\s\d+\sjours\./.test(e1.txt) && e1.rangs === 0 && e1.gris === 'Tous tes véhicules sont en règle.' && /^0 à faire$/.test(e1.kpi), { b:e1.b, rangs:e1.rangs, gris:e1.gris, kpi:e1.kpi, texte:JSON.stringify(e1.txt.slice(e1.txt.indexOf('Prochaine'), e1.txt.indexOf('Prochaine') + 80)) });
      await ev(c, () => { VH.onglet = 'garage'; rendre(); }); await L.calme(c.p, 400);
      const e2 = await ev(c, () => ({ txt:document.getElementById('contenu').innerText }));
      v(nom + ' : « Au garage » vide — « Aucun véhicule au garage. Tous tes véhicules sont en service. »', /Aucun véhicule au garage\./.test(e2.txt) && /Tous tes véhicules sont en service\./.test(e2.txt), e2.txt.slice(0, 200));
    }

    if (on('D') && !nuit) {
      if (on('C')) { const err = c.err; await L.fin(c); c = await L.ouvrir({ profil, qui:'marc', nuit:false, calme:true }); c.err.push(...err); await L.aller(c.p, 'vehicules'); }   // C a vidé les données : une page neuve   // les valeurs longues et les cas de rangée que la démonstration n'a pas : souci signalé, retard, hors service, sans conducteur, huit de plus (la recherche paraît à 9)
      await ev(c, () => { H_GENS.sm.nom = 'Sophie Martin-Delacroix de la Châtaigneraie'; VEHICULES[0].marque = 'Renault'; VEHICULES[0].modele = 'Kangoo Van E-Tech Grand Confort Longue Portée'; VEHICULES[0].km = 1523300;
        VEHICULES[0].souci = { type:'Voyant allumé', qui:'sm', d:jour(-1), txt:'Le voyant moteur est allumé depuis la rocade, un très long message de démonstration' }; VEHICULES[1].statut = 'hs'; VEHICULES[2].conducteur = ''; VEHICULES[3].immo.garage = 'Garage Renault Pro de la Zone Industrielle Nord'; VH.onglet = 'tous'; rendre(); });
      await L.calme(c.p, 450);
      const r = await ev(c, () => ({ rangs:[...document.querySelectorAll('.vh-liste .vh-l')].map(l => ({ p:(l.querySelector('.vh-et .st') || {}).textContent, g:(l.querySelector('.btn') || {}).textContent })), txt:document.getElementById('contenu').innerText }));
      v(nom + ' · valeurs longues : souci signalé (« C\'est réglé »), hors service (aucun bouton), sans conducteur — chaque rangée garde sa pastille', r.rangs.length === 5 && r.rangs.some(x => x.p === 'Souci signalé' && x.g === 'C’est réglé') && r.rangs.some(x => x.p === 'Hors service' && !x.g) && /Sans conducteur/.test(r.txt) && /Sophie Martin-Delacroix de la Châtaigneraie · 1\s?523\s?300 km/.test(r.txt.replace(/ /g, ' ')), r.rangs);
      const d = await L.deborde(c), t = await L.doigts(c.p, '#contenu');
      v(nom + ' · valeurs longues : pas de débordement latéral, pas de texte écrasé', d.bouge === 0 && d.seconde <= c.largeur + 1 && t.ecrases.length === 0, { d, t:t.ecrases });
      await ev(c, () => { for (let i = 0; i < 8; i++) { const o = JSON.parse(JSON.stringify(VEHICULES[2])); o.id = 'vx' + i; o.plaque = 'ZZ-10' + i + '-AA'; o.marque = 'Fiat'; o.modele = 'Ducato ' + i; o.conducteur = 'lr'; o.lieu = 'v3'; VEHICULES.push(o); } VH.onglet = 'tous'; rendre(); });
      await L.calme(c.p, 450);
      const rech = await ev(c, () => { const i = document.querySelector('.vh-cherche'); if (!i) return { ok:false }; i.value = 'ducato 3'; i.dispatchEvent(new Event('input', { bubbles:true })); const vis = [...document.querySelectorAll('.vh-liste .vh-l[data-vhtxt]')].filter(l => !l.hidden).length; i.value = 'zzzz'; i.dispatchEvent(new Event('input', { bubbles:true })); const aucun = !document.querySelector('.vh-aucun').hidden;
        return { ok:true, n:VEHICULES.length, vis, aucun, taille:parseFloat(getComputedStyle(i).fontSize) }; });
      v(nom + ' : à partir de 9 véhicules, « Chercher un véhicule… » paraît (12 véhicules) — « ducato 3 » en garde une, un mot inconnu dit « Aucun véhicule ne correspond. », champ ≥ 16 px', rech.ok && rech.n === 12 && rech.vis === 1 && rech.aucun && rech.taille >= 16, rech);
    }

    if (c.err.length) console.log(c.err.slice(0, 3));
    v(nom + ' : zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
