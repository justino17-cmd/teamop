// BOUTON PRINCIPAL DE NUIT, les FENÊTRES (voie « nuit », 17 novembre 2026) : nouvelle intervention, devis rapide, fiche client, feuille
// Menu, atelier de devis, comptabilité, connexion, guide, OP Security et les deux pages voisines (paiement, documents). Chaque fenêtre est
// ouverte par le geste de l'application, de nuit, puis mesurée comme la sonde des rubriques (texte ≥ 4,5:1, aplat contre sa carte ≥ 3:1) et
// capturée pour être REGARDÉE. ⛔ 127.0.0.1 seulement.
//   CAP=/dossier PROFILS=mac,iphone,android node scratchpad/proto-final/sondes/nuit-fenetres.js
const path = require('path'), L = require('../lib.js'), v = L.v, { MESURE } = require('./nuit-bouton-principal.js');
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(','), CAP = process.env.CAP || '';
// [nom, rubrique, texte du bouton à toucher (ou null)]
const ETAPES = [
  ['nouvelle-intervention', 'interventions', /Nouvelle intervention/],
  ['devis-rapide', 'devis', /Devis rapide/],
  ['fiche-client', 'clients', null],
  ['compositeur', 'devis', /Composer un devis/],
  ['planning-creer', 'planning', /Nouvelle intervention/],
];
(async () => {
  let fen = 0, aplats = 0;
  for (const profil of PROFILS) {
    const c = await L.ouvrir({ profil, qui: 'marc', nuit: true }), tag = `${profil} nuit`;
    for (const [nom, rub, bouton] of ETAPES) {
      await L.aller(c.p, rub);
      if (bouton) { const b = c.p.getByRole('button', { name: bouton }).first(); const n = await b.count(); if (!n) { v(`${tag} · ${nom} : le bouton existe`, false, String(bouton)); continue; }
        try { c.doigt ? await b.tap({ timeout: 4000 }) : await b.click({ timeout: 4000 }); } catch (e) { v(`${tag} · ${nom} : le bouton répond`, false, e.message.slice(0, 80)); continue; } }
      else { const ligne = c.p.locator('#contenu tr.clic, #contenu .ligne-clic').first(); if (await ligne.count()) { try { c.doigt ? await ligne.tap({ timeout: 4000 }) : await ligne.click({ timeout: 4000 }); } catch (e) {} } }
      await L.calme(c.p, 700);
      const zones = [{ f: c.p, nom }]; const cadre = L.cadre(c.p); if (cadre) zones.push({ f: cadre, nom: nom + ' (cadre)' });
      for (const z of zones) { const m = await z.f.evaluate(MESURE).catch(() => null); if (!m) continue; fen++; aplats += m.principaux.length;
        for (const b of m.principaux) { v(`${tag} · ${z.nom} · « ${b.lib} » : texte ≥ 4,5:1 (${b.texte})`, b.texte >= 4.5, b); v(`${tag} · ${z.nom} · « ${b.lib} » : aplat contre sa carte ≥ 3:1 (${b.contraste})`, b.contraste >= 3, b); } }
      if (CAP) await L.capture(c, path.join(CAP, `fen-${profil}-${nom}.png`));
      await L.ranger(c.p); await c.p.evaluate(() => { try { if (typeof cmptFermer === 'function') cmptFermer(); } catch (x) {} }); await L.calme(c.p, 250);
    }
    // feuille Menu (téléphone) et comptabilité plein écran
    if (c.largeur < 800) { const b = c.p.locator('button', { hasText: /^\s*Menu/ }).first(); if (await b.count()) { try { await b.tap({ timeout: 4000 }); await L.calme(c.p, 600); const m = await c.p.evaluate(MESURE); fen++; aplats += m.principaux.length; if (CAP) await L.capture(c, path.join(CAP, `fen-${profil}-menu.png`)); await L.ranger(c.p); } catch (e) {} } }
    await L.aller(c.p, 'comptabilite'); await L.calme(c.p, 500);
    const o = c.p.getByRole('button', { name: /Ouvrir dans la Comptabilité/ }).first();
    if (await o.count()) { try { c.doigt ? await o.tap({ timeout: 4000 }) : await o.click({ timeout: 4000 }); await L.calme(c.p, 1200); const f = L.cadre(c.p); if (f) { const m = await f.evaluate(MESURE); fen++; aplats += m.principaux.length;
      for (const b of m.principaux) { v(`${tag} · comptabilité plein écran · « ${b.lib} » ≥ 4,5:1 (${b.texte})`, b.texte >= 4.5, b); v(`${tag} · comptabilité plein écran · « ${b.lib} » contre sa carte ≥ 3:1 (${b.contraste})`, b.contraste >= 3, b); } }
      if (CAP) await L.capture(c, path.join(CAP, `fen-${profil}-comptabilite-plein.png`)); } catch (e) {} }
    v(`${tag} : aucune erreur JavaScript`, !c.err.length, c.err.slice(0, 2));
    await L.fin(c);
    // connexion, guide des nouveautés
    for (const [nom, o2] of [['connexion', { qui: null }], ['guide', { guide: true }]]) {
      const d = await L.ouvrir({ profil, nuit: true, ...o2 }); await L.calme(d.p, nom === 'guide' ? 1600 : 3500);
      const m = await d.p.evaluate(MESURE); fen++; aplats += m.principaux.length;
      for (const b of m.principaux) { v(`${tag} · ${nom} · « ${b.lib} » ≥ 4,5:1 (${b.texte})`, b.texte >= 4.5, b); v(`${tag} · ${nom} · « ${b.lib} » contre sa carte ≥ 3:1 (${b.contraste})`, b.contraste >= 3, b); }
      if (CAP) await L.capture(d, path.join(CAP, `fen-${profil}-${nom}.png`)); await L.fin(d);
    }
    // pages voisines : elles ont leurs propres jetons (--accent), à REGARDER
    for (const page of ['prototype-documents.html', 'prototype-paiement.html']) {
      const d = await L.ouvrir({ profil, nuit: true, page, requete: '' }); await L.calme(d.p, 900);
      if (CAP) await L.capture(d, path.join(CAP, `fen-${profil}-${page.replace('prototype-', '').replace('.html', '')}.png`)); await L.fin(d);
    }
  }
  v(`population : ${fen} fenêtres lues, ${aplats} aplats principaux (un zéro ne prouverait rien)`, fen >= 8 && aplats >= 8, { fen, aplats });
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('✗ la sonde a jeté :', e.message); await L.fermer(); process.exit(1); });
