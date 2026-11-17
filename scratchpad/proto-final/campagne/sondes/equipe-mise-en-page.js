// ÉQUIPE et MON ENTREPRISE : la mise en page sur un profil, jour ou nuit — aucun glissement latéral (contre la largeur POSÉE du profil), cibles au
// doigt ≥ 44 px, champs ≥ 16 px, rien sous la barre du bas, texte écrasé, panneaux qui débordent, noms LONGS. Une capture par écran, à REGARDER.
// usage : node equipe-mise-en-page.js [mac|windows|ipad|iphone|android|petit] [nuit]   ⛔ 127.0.0.1 seulement.
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac', NUIT = process.argv[3] === 'nuit', SUF = `${PROFIL}-${NUIT ? 'nuit' : 'jour'}`;
const LONG = 'Maximilien-Alexandre de la Tour-Dupont-Castelnau';  // 48 signes : un nom composé réel, pas un cas absurde
(async () => {
  const c = await E.marc(PROFIL, NUIT); const p = c.p; let n = 0;
  // un collègue au nom très long, une adresse très longue : ce que les données de démonstration n'ont pas
  await p.evaluate(nom => { const [pr, no] = [nom.split(' ')[0], nom.split(' ').slice(1).join(' ')]; EQUIPE.push({ k:'long', terrain:true, prenom:pr, nom:no, role:'Technicien frigoriste spécialisé en pompes à chaleur', mail:'maximilien-alexandre.de-la-tour-dupont-castelnau@entreprise-de-climatisation-la-rochelle.example.fr', tel:'06 11 22 33 44', actif:true, droits:copieProfil('tech'), habil:[['Habilitation électrique BR (travaux d’ordre non électrique sous tension)', jour(300)]] }); H_GENS.long = { nom:pr + ' ' + no, role:'Technicien', c:'#7a5af8' }; try { eqxSynchro(); } catch (e) {} rendre(); }, 'Maximilien-Alexandre de la Tour-Dupont-Castelnau');
  const mesurer = async (nom, zone, o) => { o = o || {}; n++; await L.calme(p, 500);
    const d = await L.deborde(c); v(`${nom} : aucun glissement latéral (${SUF})`, d.bouge === 0, d);
    if (zone) { const pan = await p.evaluate(z => { const q = document.querySelector(z); if (!q) return null; return { sw:q.scrollWidth, cw:q.clientWidth, enfants:[...q.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(), R = q.getBoundingClientRect(); return r.width > 0 && r.right > R.right + 1 && getComputedStyle(e).position !== 'fixed' && !e.closest('.ent-fichier'); }).slice(0, 4).map(e => e.tagName + '.' + String(e.className).slice(0, 30) + ':' + (e.textContent || '').trim().slice(0, 30)) }; }, zone);
      v(`${nom} : rien ne dépasse du panneau (${SUF})`, !!pan && pan.sw <= pan.cw + 1 && pan.enfants.length === 0, pan); }
    if (c.doigt) { const dd = await L.doigts(p, zone || '#contenu'); v(`${nom} : cibles au doigt ≥ 44 px (${SUF})`, dd.petits.length === 0, dd.petits); v(`${nom} : champs ≥ 16 px (${SUF})`, dd.champs.length === 0, dd.champs); v(`${nom} : aucun texte écrasé (${SUF})`, dd.ecrases.length === 0, dd.ecrases); }
    await L.capture(c, E.CAP + `mep-${nom.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${SUF}.png`); };
  await L.aller(p, 'equipe'); await mesurer('equipe-liste');
  await p.evaluate(() => { document.querySelector('#contenu').scrollIntoView(); window.scrollTo(0, 99999); }); await L.calme(p, 300); await L.capture(c, E.CAP + `mep-equipe-bas-${SUF}.png`);
  await L.toucher(c, '[data-eq="filtre|droits"]'); await mesurer('equipe-qui-peut-quoi');
  await L.toucher(c, '[data-eq="filtre|tous"]');
  for (const k of ['julie', 'long']) { await E.fiche(c, k); await mesurer('fiche-' + k, '#calque .panneau');
    await p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; }); await L.calme(p, 300); await mesurer('fiche-' + k + '-droits-ouverts', '#calque .panneau');
    await E.ranger(c); }
  await E.fiche(c, 'julie'); await L.toucher(c, '[data-eqx="modifier|julie"]'); await mesurer('fiche-modifier', '#calque .panneau'); await E.ranger(c);
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await p.fill('#eq-p', LONG.split(' ')[0]); await p.fill('#eq-n', 'de la Tour-Dupont-Castelnau-Saint-Germain'); await p.fill('#eq-m', 'maximilien-alexandre.de-la-tour@entreprise-de-climatisation-la-rochelle.example.fr'); await mesurer('inviter', '#calque .panneau'); await E.ranger(c);
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eqx="regles"]'); await mesurer('regles-habilitations', '#calque .panneau'); await E.ranger(c);
  await E.fiche(c, 'kb'); await L.toucher(c, '[data-eq="habajout|kb"]'); await mesurer('habilitation-ajout', '#calque .panneau'); await E.ranger(c);
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="fiche|long"]'); await L.toucher(c, '[data-eq="actif|long"]'); await mesurer('desactiver', '#calque .panneau'); await E.ranger(c);
  await L.aller(p, 'entreprise'); await p.evaluate(() => { ENTREPRISE.nom = 'Entreprise de Climatisation, de Chauffage et de Plomberie de la Rochelle'.slice(0, 60); ENTREPRISE.adr = '12 avenue du Général de Gaulle, bâtiment B, zone artisanale des Quatre Vents, 17000 La Rochelle'; ENTREPRISE.mail = 'contact-administratif.facturation@entreprise-de-climatisation-la-rochelle.example.fr'; rendre(); });
  await mesurer('entreprise');
  for (const k of ['ident', 'legal', 'logo', 'banque', 'horaires']) { await L.aller(p, 'entreprise'); await E.ranger(c); await L.toucher(c, `[data-ent="carte|${k}"]`); await mesurer('entreprise-' + k, '#calque .panneau'); await E.ranger(c); }
  v(`population : ${n} écrans mesurés (${SUF})`, n >= 20, n);
  v(`aucune erreur de page (${SUF})`, c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
