// RECONTRÔLE ADVERSE — LES PAGES VOISINES QUAND LE PROTOTYPE EST DANS UN CADRE (17 novembre 2026). Structure réelle de l'artefact : claude.ai > page du prototype
// (window.claude) > pages voisines (comptabilité, atelier). Le parent d'une page voisine est le prototype. Deux cas : (1) le pont du prototype marche → le FEC et le PDF
// y arrivent ; (2) le visiteur refuse. Le parent inaccessible (autre origine) se joue pour de vrai dans recontrole-artefact-origine.js (un mandataire de fenêtre
// y est faux : `ev.source !== parent` ne reconnaît plus le vrai parent, et le FEC attend alors une confirmation qui ne vient jamais).
const P = require('./recontrole-artefact-pose.js'), { bac, lib: L, v } = P;
(async () => {
  for (const [nom, pose, attendu] of [['pont du prototype', {}, 'fichier'], ['visiteur refuse', { refuser: true }, 'refus']]) {
    const c = await P.ouvrirHote({ profil: 'mac', qui: 'marc' }, pose);
    await c.p.evaluate(() => { location.hash = 'comptabilite'; }); await L.calme(c.p, 2200);
    const f = L.cadre(c.hote, /prototype-comptabilite\.html/);
    v(`${nom} : population (compta en cadre, chargée, niveau 2)`, !!f && await f.evaluate(() => typeof fecTelecharger === 'function' && window.parent !== window.top).catch(() => false), '');
    if (f) { await f.evaluate(() => aller('fec')); await L.calme(c.p, 500); await bac.zero(c); await f.locator('[data-a="fec-dl"]').first().click(); await c.p.waitForTimeout(900);
      const e = await P.etat(c), msg = await f.evaluate(() => ((document.getElementById('fec-msg') || {}).textContent || '') + ' ' + ((document.getElementById('toast') || {}).textContent || ''));
      if (attendu === 'fichier') v(`${nom} : le FEC arrive au pont (non vide, au bon nom)`, e.fichiers.length === 1 && /FEC\d{8}\.txt$/.test(e.fichiers[0].nom) && e.fichiers[0].taille > 300, e.fichiers);
      if (attendu === 'indisponible') v(`${nom} : le cadre dit « pas disponible » (aucun fichier, aucune annonce d'enregistrement)`, e.fichiers.length === 0 && /pas disponible/.test(msg) && !/FEC enregistré/.test(msg), msg.slice(0, 120));
      if (attendu === 'refus') v(`${nom} : refus dit, rien enregistré`, e.fichiers.length === 0 && /annulé|refus/i.test(msg), msg.slice(0, 120)); }
    await L.aller(c.p, 'devis'); await c.p.locator('#contenu [data-opd="devis"]').first().click({ timeout: 5000 }).catch(() => {}); await L.calme(c.p, 2500);
    const g = L.cadre(c.hote, /prototype-documents\.html/);
    v(`${nom} : population (atelier en cadre, chargé)`, !!g && await g.evaluate(() => typeof pdfEnregistrer === 'function').catch(() => false), '');
    if (g) { await bac.zero(c); const r = await g.evaluate(() => pdfEnregistrer(new Blob(['%PDF-1.4\n% essai atelier'], { type: 'application/pdf' }), 'devis-essai.pdf')); await c.p.waitForTimeout(500); const e = await P.etat(c);
      if (attendu === 'fichier') v(`${nom} : le PDF de l'atelier arrive au pont`, r === 'saved' && e.fichiers.length === 1 && e.fichiers[0].nom === 'devis-essai.pdf', { r, f: e.fichiers });
      if (attendu === 'indisponible') v(`${nom} : l'atelier dit « pas disponible », aucun fichier`, r === 'indisponible' && e.fichiers.length === 0, r);
      if (attendu === 'refus') v(`${nom} : l'atelier dit le refus`, r === 'declined' && e.fichiers.length === 0, r); }
    v(`${nom} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
