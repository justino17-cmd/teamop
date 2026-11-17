// RECONTRÔLE — CE QUE LES CORRECTIONS ONT CASSÉ HORS ARTEFACT (17 novembre 2026). Sur 127.0.0.1, SANS le bac : aucun window.claude, un vrai navigateur qui sait
// télécharger. Un téléchargement lancé par la page doit encore ARRIVER (événement « download » de Playwright : nom, taille) — dans la page principale ET dans les
// pages voisines en cadre (Comptabilité, atelier). La page en son propre onglet ou dans la coque n'est pas un artefact : un lien « download » y marche.
const lib = require('../lib.js'), v = lib.v, fs = require('fs');
async function telecharge(p, geste, ms) { const t = []; const f = d => t.push(d); p.on('download', f); await geste(); await p.waitForTimeout(ms || 1500); p.off('download', f); const out = []; for (const d of t) { let taille = 0; try { const pa = await d.path(); taille = pa ? fs.statSync(pa).size : 0; } catch (e) {} out.push({ nom: d.suggestedFilename(), taille }); } return out; }
(async () => {
  for (const profil of ['mac', 'iphone']) {
    const c = await lib.ouvrir({ profil, qui: 'marc' }); await c.p.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); });
    v(`${profil} hors artefact : population (aucun window.claude, page du haut)`, await c.p.evaluate(() => typeof window.claude === 'undefined' && window.top === window), '');
    let d = await telecharge(c.p, () => c.p.evaluate(() => vhCsvFlotte())); v(`${profil} : le CSV du coût des véhicules se télécharge encore (nom, taille)`, d.length === 1 && /\.csv$/.test(d[0].nom) && d[0].taille > 80, d);
    d = await telecharge(c.p, () => c.p.evaluate(() => cpFecTelecharger())); v(`${profil} : le FEC provisoire (page principale) se télécharge encore`, d.length === 1 && /FEC/.test(d[0].nom) && d[0].taille > 300, d);
    // Comptabilité en cadre
    await c.p.evaluate(() => { location.hash = 'comptabilite'; }); await lib.calme(c.p, 2200);
    const f = lib.cadre(c.p, /prototype-comptabilite\.html/);
    v(`${profil} : population (la Comptabilité est un cadre chargé)`, !!f && await f.evaluate(() => typeof fecTelecharger === 'function').catch(() => false), '');
    if (f) { await f.evaluate(() => aller('fec')); await lib.calme(c.p, 500);
      d = await telecharge(c.p, async () => { await f.locator('[data-a="fec-dl"]').first().click(); });
      const msg = await f.evaluate(() => (document.getElementById('fec-msg') || {}).textContent || '');
      v(`${profil} : le FEC de la Comptabilité (cadre) se télécharge encore hors artefact`, d.length === 1 && /FEC/.test(d[0].nom) && d[0].taille > 300, { d, msg: msg.slice(0, 100) }); }
    // atelier en cadre
    await lib.aller(c.p, 'devis'); await c.p.locator('#contenu [data-opd="devis"]').first().click({ timeout: 5000 }).catch(() => {}); await lib.calme(c.p, 2500);
    const g = lib.cadre(c.p, /prototype-documents\.html/);
    v(`${profil} : population (l'atelier est un cadre chargé)`, !!g && await g.evaluate(() => typeof pdfEnregistrer === 'function').catch(() => false), '');
    if (g) { let r; d = await telecharge(c.p, async () => { r = await g.evaluate(() => pdfEnregistrer(new Blob(['%PDF-1.4\n% essai'], { type: 'application/pdf' }), 'devis-essai.pdf')); });
      v(`${profil} : le PDF de l'atelier (cadre) se télécharge encore hors artefact`, d.length === 1 && d[0].nom === 'devis-essai.pdf', { r, d }); }
    v(`${profil} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await lib.fin(c);
  }
  await lib.fermer(); const ko = lib.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await lib.fermer(); } catch (x) {} process.exit(2); });
