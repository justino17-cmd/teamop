// RECONTRÔLE ADVERSE sœur 3 — point (c) : Boîte mail, aperçu PDF et « Ajouter une boîte mail » à la sortie. Variantes : retour système, brouillon tapé, retour par Retour après départ, hash tapé, palette.
const M = require('./mail-commun.js'), L = M.lib, v = M.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone,android').split(','), NUIT = !!process.env.NUIT;
const PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
const E = p => p.evaluate(() => { const r = window.R(), o = r && r.querySelector('#overlay'); return { h: location.hash, pdf: !!(r && r.querySelector('#pdfv')), feuille: !!(r && r.querySelector('#overlay .sheet.acct')), ov: o ? o.className : null, texte: (r && r.querySelector('#ml-m, #cBody, #overlay textarea, #overlay [contenteditable]') || {}).value || (r && r.querySelector('#overlay [contenteditable]') || {}).innerText || '', inert: r ? !!r.querySelector('.app').inert : null, hostInert: !!document.querySelector('#contenu').closest('[inert]') }; });
async function composerAvecPdf(c, texte) {
  await c.p.evaluate(() => window.R().querySelector('#btnCompose').click()); await c.p.waitForTimeout(700);
  if (texte) { await c.p.evaluate(() => { const r = window.R(), e = r.querySelector('#overlay textarea, #overlay [contenteditable]'); e && e.focus(); }); await c.p.keyboard.insertText(texte); await c.p.waitForTimeout(200); }
  const [fc] = await Promise.all([c.p.waitForEvent('filechooser', { timeout: 4000 }), c.p.evaluate(() => window.R().querySelector('#cAttBtn').click())]);
  await fc.setFiles({ name: 'devis-test.pdf', mimeType: 'application/pdf', buffer: PDF }); await c.p.waitForTimeout(900);
  await c.p.evaluate(() => window.R().querySelector('.att-pv').click()); await c.p.waitForTimeout(800); }
(async () => {
  for (const profil of PROFILS) {
    const nom = profil + (NUIT ? ' nuit' : '') + ' · ';
    // C1 : PDF ouvert sur un brouillon tapé, on part par une adresse tapée ; Retour du système depuis la nouvelle rubrique : on retombe sur la Boîte mail, sans PDF, brouillon intact
    { const c = await M.entrer({ profil, nuit: NUIT }); await composerAvecPdf(c, 'Bonjour ceci est mon brouillon 123');
      const a = await E(c.p); v(nom + 'C1 population : PDF ouvert, brouillon tapé (« ' + a.texte.slice(0, 20) + ' »)', a.pdf && /brouillon/.test(a.texte), a);
      await c.p.evaluate(() => { location.hash = 'clients'; }); await L.calme(c.p, 700); const b = await E(c.p);
      v(nom + 'C1 adresse tapée : PDF fermé, hôte non figé (page Clients)', !b.pdf && b.h === '#clients', b);
      const h = await c.p.evaluate(() => ({ inertHote: [...document.querySelectorAll('[inert]')].map(e => e.id || e.tagName).slice(0, 4), h1: (document.querySelector('#contenu h1') || {}).textContent }));
      v(nom + 'C1 la page Clients n’est pas inerte (rien de figé : ' + JSON.stringify(h.inertHote) + ')', !h.inertHote.some(x => /contenu|app|^BODY$|^MAIN$/i.test(x)), h);
      await c.p.evaluate(() => history.back()); await L.calme(c.p, 900); const r = await E(c.p);
      v(nom + 'C1 Retour du système depuis Clients : Boîte mail (' + r.h + '), sans PDF, brouillon gardé', r.h === '#boiteMail' && !r.pdf && /brouillon/.test(r.texte), r);
      const suite = []; for (let i = 0; i < 4; i++) { await c.p.evaluate(() => history.back()); await L.calme(c.p, 900); const q = await E(c.p); suite.push(q.h + (q.ov ? '+' + q.ov.replace('overlay ', '') : '') + (q.pdf ? '+pdf' : '') + (await c.p.evaluate(() => !!(window.R() && window.R().querySelector('#cDiscard'))) ? '+feuilleAbandon' : '')); if (q.h !== '#boiteMail') break; }
      v(nom + 'C1 Retours successifs : au plus un cran pour le message en cours (+ sa feuille), puis on quitte — jamais de PDF fantôme : ' + suite.join(' → '), suite.length <= 3 && !/pdf/.test(suite.join()) && suite[suite.length - 1] !== '#boiteMail', suite);
      v(nom + 'C1 aucune erreur', c.err.length === 0, c.err.slice(0, 2)); await M.cap(c, 'c1-' + profil + (NUIT ? '-nuit' : '')); await M.fin(c); }
    // C2 : PDF ouvert, bouton Retour du système (une fois) : seul le PDF part, le message reste ; deux fois : le message se ferme proprement (brouillon)
    { const c = await M.entrer({ profil, nuit: NUIT }); await composerAvecPdf(c, 'texte deux');
      await c.p.evaluate(() => history.back()); await L.calme(c.p, 800); const a = await E(c.p);
      v(nom + 'C2 un Retour : PDF fermé, message en cours encore là, adresse ' + a.h, !a.pdf && !!a.ov && a.h === '#boiteMail', a);
      v(nom + 'C2 aucune erreur', c.err.length === 0, c.err.slice(0, 2)); await M.fin(c); }
    // C3 : feuille « Ajouter une boîte mail » + Retour du système ; puis réouverture, puis changement d'adresse, puis retour sur la Boîte mail par le MENU : propre
    { const c = await M.entrer({ profil, nuit: NUIT }); await c.p.evaluate(() => window.R().querySelector('[data-addaccount]').click()); await c.p.waitForTimeout(700);
      const a = await E(c.p); v(nom + 'C3 population : feuille ouverte', a.feuille, a);
      await c.p.evaluate(() => history.back()); await L.calme(c.p, 800); const b = await E(c.p); v(nom + 'C3 Retour : feuille fermée, toujours sur la Boîte mail (' + b.h + ')', !b.feuille && b.h === '#boiteMail', b);
      await c.p.evaluate(() => window.R().querySelector('[data-addaccount]').click()); await c.p.waitForTimeout(600); await c.p.evaluate(() => { location.hash = 'accueil'; }); await L.calme(c.p, 700);
      await c.p.evaluate(() => { location.hash = 'boiteMail'; }); await L.calme(c.p, 900); await M.pret(c.p, 6000); const d = await E(c.p);
      v(nom + 'C3 aller-retour par l’adresse : feuille fermée, module vivant (inert=' + d.inert + ')', !d.feuille && d.inert === false, d);
      // le bouton « Ajouter » rouvre bien la feuille après tout ça (le correctif n'a rien cassé)
      await c.p.evaluate(() => window.R().querySelector('[data-addaccount]').click()); await c.p.waitForTimeout(600); const e = await E(c.p); v(nom + 'C3 « Ajouter une boîte mail » se rouvre', e.feuille, e);
      v(nom + 'C3 aucune erreur', c.err.length === 0, c.err.slice(0, 2)); await M.fin(c); }
    // C4 : un menu (ov-menu) ouvert puis départ : toujours fermé (non-régression) — on ouvre le menu d'un message
    { const c = await M.entrer({ profil, nuit: NUIT });
      const ouvert = await c.p.evaluate(() => { const r = window.R(), b = r.querySelector('[data-menu], [data-more], #btnMore, .btn-more, [aria-haspopup="menu"]'); if (!b) return null; b.click(); return b.outerHTML.slice(0, 60); }); await c.p.waitForTimeout(600);
      const a = await E(c.p); v(nom + 'C4 population : un menu est ouvert (' + ouvert + ')', !!a.ov && /ov-menu/.test(a.ov), a);
      if (a.ov && /ov-menu/.test(a.ov)) { await c.p.evaluate(() => { location.hash = 'clients'; }); await L.calme(c.p, 700); const b = await E(c.p); v(nom + 'C4 départ : menu fermé', !b.ov, b); }
      await M.fin(c); }
  }
  await M.sortie();
})().catch(e => { v('la sonde va jusqu\'au bout', false, String(e.stack || e.message).split('\n').slice(0, 3).join(' | ').slice(0, 300)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
