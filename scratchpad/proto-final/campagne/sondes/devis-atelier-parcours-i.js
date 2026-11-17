// Parcours 16 : un contrat COMPOSÉ, envoyé puis signé dans l'atelier — que devient la suite (visites au planning, contrat dans la liste des contrats,
// chiffres) ? Et un client créé dans l'atelier : place-t-il sa position (carte des tournées) comme un client créé dans OP GESTION ? usage : node devis-atelier-parcours-i.js [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats' }), p = c.p; await L.calme(p, 600);
  const clic = async (f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(500); };
  const av = await p.evaluate(() => ({ ints: INTS.length, ctr: CONTRATS.length, fac: FACTURES.length })); const k0 = await O.kpis(p);
  let f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
  await A.composerContrat(c, f, { client: 'mi', titre: 'Entretien annuel des climatiseurs', prix: '1200' });
  await clic(f, '[data-act="envoyer"]:visible'); const dlg = await f.evaluate(() => (document.querySelector('.fen-v .fenetre') || {}).innerText); console.log('  · fenêtre d’envoi du contrat :', (dlg || '').replace(/\s+/g, ' ').slice(0, 300));
  await clic(f, '[data-act="env-go"]'); await p.waitForTimeout(600);
  await clic(f, '[data-act="apercu"]:visible'); await f.locator('#vue-apercu .interrupteur, #vue-apercu input[type=checkbox]').first().click().catch(() => {}); await p.waitForTimeout(500);
  const ok = await f.locator('[data-act="ap-signer"]').count(); v('P16 : le contrat envoyé peut être signé dans l’aperçu « Ce que voit le client »', ok > 0, ok);
  if (ok) { await clic(f, '[data-act="ap-signer"]'); await f.evaluate(() => { const x = document.querySelector('#sg-lu'); if (x) x.click(); }); await clic(f, '[data-act="sg-texte"]'); await f.locator('#sg-nom').fill('Syndic Foncia'); await clic(f, '[data-act="sg-valider"]'); await p.waitForTimeout(700); }
  await L.capture(c, O.CAP + `P16-contrat-signe-${profil}.png`);
  await p.keyboard.press('Escape'); await p.waitForTimeout(300); await clic(f, '[data-act="apercu-fermer"]').catch(() => {}); await clic(f, '[data-act="retour"]:visible').catch(() => {}); await p.waitForTimeout(1100);
  const ap = await p.evaluate(() => ({ ints: INTS.length, ctr: CONTRATS.length, fac: FACTURES.length, doc: ATD.docs.find(x => x.type === 'contrat') })); const k1 = await O.kpis(p);
  console.log('  · avant/après :', JSON.stringify(av), JSON.stringify({ ints: ap.ints, ctr: ap.ctr, fac: ap.fac }), JSON.stringify(ap.doc)); console.log('  · chiffres :', JSON.stringify(k0.map(x => x.n)), JSON.stringify(k1.map(x => x.n)));
  v('P16 : le contrat composé est « Signé » dans la liste d’OP GESTION', ap.doc && ap.doc.etat === 'signe', ap.doc);
  v('devis-atelier-16 : un contrat composé et signé pose ses visites au planning et entre dans les contrats d’OP GESTION (promesse de la page Contrats)', ap.ints > av.ints || ap.ctr > av.ctr, [av, ap]);
  // client créé dans l'atelier : position
  await L.aller(p, 'devis'); f = await A.ouvrirAtelier(c, 'devis', 'devis'); await L.calme(p, 800); await clic(f, '[data-vv="client-nouveau"]');
  const ch = f.locator('.fen-v input'); await ch.nth(0).fill('Boulangerie Les Épis Dorés'); await ch.nth(1).fill('8 rue des Halles'); await ch.nth(2).fill('17000'); await ch.nth(3).fill('La Rochelle'); await ch.nth(4).fill('epis@mail.fr'); await ch.nth(5).fill('05 46 11 22 33');
  await clic(f, '.fen-v button:has-text("Ajouter ce client")'); await p.waitForTimeout(900); await clic(f, '.vv-retour'); await p.waitForTimeout(500); await f.locator('.dialogue [data-r="1"]').first().click({ timeout: 800 }).catch(() => {}); await p.waitForTimeout(900);
  const pos = await p.evaluate(() => { const k = Object.keys(CLIENTS).pop(); return { nom: CLIENTS[k].nom, geo: typeof CR_GEO !== 'undefined' ? !!CR_GEO[k] : null, secteur: typeof SECT_CLI !== 'undefined' ? SECT_CLI[k] || null : null }; });
  console.log('  · client créé dans l’atelier :', JSON.stringify(pos));
  v('devis-atelier-17 : un client créé dans l’atelier reçoit sa position (carte des tournées) et son secteur, comme un client créé avec « Devis rapide » (indice du menu final, confirmé pour ce chemin)', pos.nom === 'Boulangerie Les Épis Dorés' && pos.geo === true && !!pos.secteur, pos);
  // « Devis rapide » depuis la fiche d'un client : le client est déjà choisi
  await L.aller(p, 'client-x-hp'); await L.toucher(c, '[data-action="clientDevis"]'); await L.calme(p, 400);
  const sel = await p.evaluate(() => { const s = document.getElementById('dvn-cli'); return { vu: !!s, val: s && s.value, titre: (document.querySelector('#calque h2') || {}).textContent }; });
  v('P16 : « Devis rapide » depuis la fiche d’Hôtel de la Plage arrive avec ce client déjà choisi (pas « Choisir… »)', sel.vu && sel.val === 'hp', sel);
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
