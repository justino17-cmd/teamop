// SONDE « départ de la Boîte mail » (19 novembre 2026, rejeu sœur 3, point 3) : règle « Retour / départ ferme la couche du DESSUS ».
// L'aperçu d'un PDF (#pdfv) et la feuille « Ajouter une boîte mail » se ferment quand on quitte la Boîte mail, comme ses menus — par aller(), par un changement d'adresse (hashchange) et par ⌘K ;
// le message en cours d'écriture, lui, reste gardé (seul son aperçu part). Population comptée avant chaque départ (une couche qui n'était pas ouverte ne prouverait rien).
//   PROFILS=mac,iphone (défaut mac,iphone) · TOUS=1 : les six profils · NUIT=1. Sort en 1 si un contrôle tombe. ⛔ 127.0.0.1 seulement.
const M = require('./mail-commun.js'), L = M.lib, v = M.v;
const PROFILS = process.env.TOUS ? ['mac', 'windows', 'ipad', 'iphone', 'android', 'petit'] : (process.env.PROFILS || 'mac,iphone').split(','), NUIT = !!process.env.NUIT;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const E = p => p.evaluate(() => { const r = window.R(), o = r && r.querySelector('#overlay'); return { h: location.hash, pdf: !!(r && r.querySelector('#pdfv')), feuille: !!(r && r.querySelector('#overlay .sheet.acct')), message: !!(r && r.querySelector('#overlay #cCancel, #overlay .compose, #overlay [data-compose]')), ov: o ? o.className : null, inert: r ? !!r.querySelector('.app').inert : null }; });
const departs = {
  aller: (c) => c.p.evaluate(() => aller('clients')),
  adresse: (c) => c.p.evaluate(() => { location.hash = 'clients'; }),
  cmdk: async (c) => { await c.p.keyboard.press('Control+k'); await c.p.waitForTimeout(400); await c.p.keyboard.type('Clients'); await c.p.waitForTimeout(400); await c.p.keyboard.press('Enter'); },
};
(async () => {
  for (const profil of PROFILS) {
    const nom = profil + (NUIT ? ' nuit' : '') + ' · ';
    for (const [dep, partir] of Object.entries(departs)) {
      if (dep === 'cmdk' && !['mac', 'windows', 'mac720'].includes(profil)) continue;   // ⌘K (la palette) n'existe que dans la mise en page de bureau (rcBureau) : ni tablette ni téléphone
      // (1) feuille « Ajouter une boîte mail » ouverte, on part
      { const c = await M.entrer({ profil, nuit: NUIT }); await c.p.evaluate(() => window.R().querySelector('[data-addaccount]').click()); await c.p.waitForTimeout(700);
        const a = await E(c.p); v(nom + dep + ' · population : la feuille « Ajouter une boîte mail » est ouverte', a.feuille && a.h === '#boiteMail', a);
        await partir(c); await L.calme(c.p, 700); const b = await E(c.p);
        v(nom + dep + ' · partie : la feuille « Ajouter une boîte mail » est fermée (adresse ' + b.h + ')', b.h === '#clients' && !b.feuille && !b.ov, b);
        await L.aller(c.p, 'boiteMail'); await M.pret(c.p, 6000); const r = await E(c.p); v(nom + dep + ' · retour sur la Boîte mail : rien ne réapparaît, la page n\'est pas figée', !r.feuille && !r.pdf && r.inert === false, r);
        v(nom + dep + ' · feuille : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2)); await M.fin(c); }
      // (2) message en cours + aperçu d'un PDF joint, on part : l'aperçu part, le message reste
      { const c = await M.entrer({ profil, nuit: NUIT }); await c.p.evaluate(() => window.R().querySelector('#btnCompose').click()); await c.p.waitForTimeout(700);
        const [fc] = await Promise.all([c.p.waitForEvent('filechooser', { timeout: 4000 }), c.p.evaluate(() => window.R().querySelector('#cAttBtn').click())]);
        await fc.setFiles({ name: 'devis-test.pdf', mimeType: 'application/pdf', buffer: PDF }); await c.p.waitForTimeout(900);
        await c.p.evaluate(() => window.R().querySelector('.att-pv').click()); await c.p.waitForTimeout(800); const a = await E(c.p);
        v(nom + dep + ' · population : l\'aperçu du PDF est ouvert sur un message en cours', a.pdf && !!a.ov && a.h === '#boiteMail', a);
        await partir(c); await L.calme(c.p, 700); const b = await E(c.p);
        v(nom + dep + ' · partie : l\'aperçu du PDF est fermé (adresse ' + b.h + ')', b.h === '#clients' && !b.pdf, b);
        v(nom + dep + ' · … et le message en cours, lui, est gardé', !!b.ov, b);
        await L.aller(c.p, 'boiteMail'); await L.calme(c.p, 500); const r = await E(c.p); v(nom + dep + ' · retour : le message en cours est toujours là, sans aperçu', !!r.ov && !r.pdf, r);
        v(nom + dep + ' · aperçu : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2)); await M.fin(c); }
    }
  }
  await M.sortie();
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.message).split('\n')[0].slice(0, 200)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
