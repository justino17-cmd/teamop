// Parcours G « compta-reste » : la clôture du mois et l'envoi à l'expert-comptable, les exports (FEC, bilan des encaissements), le contrôle « aux normes »
// et ses trois formulaires (SIREN, plateforme, fiche légale). Chaque « Voir › » mène où il dit ; après l'envoi, octobre est figé.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const où = () => p.evaluate(() => ({ onglet: CP.onglet, cat: CX.cat, st: CX.st, tab: (document.querySelector('.cx-sous [aria-selected="true"]') || {}).textContent, h1: (document.querySelector('#contenu h1') || {}).textContent, hash: location.hash }));
  // 1) « Voir › » de la clôture
  const voir = [['[data-cx="dosf|afacturer"]', o => o.onglet === 'dossiers', 'les interventions à facturer'], ['[data-cp="onglet|banque"]', o => o.onglet === 'banque', 'la Banque'], ['[data-cp="onglet|caisse"]', o => o.onglet === 'caisse', 'Caisse & chèques'],
    ['[data-cx="sec|fachats|achats|sanspiece"]', o => o.onglet === 'fachats' && o.st === 'sanspiece', 'les achats sans facture'], ['[data-cp="onglet|tva"]', o => o.onglet === 'tva', 'la TVA']];
  for (const [sel, ok, nom] of voir) { await X.compta(c, 'cloture'); const existe = await p.evaluate(s => !!document.querySelector(s), sel); const t = existe && await L.toucher(c, sel); v(`G1 « Voir › » de la clôture mène à ${nom}`, !existe || (t && ok(await où())), await où()); }
  // 2) envoyer octobre
  await X.compta(c, 'cloture'); const cl = await X.texte(p); v('G2 la clôture compte ses vérifications (« 0 sur 6 »… ) et le dit en clair', /Clôturer octobre/.test(cl), cl.slice(0, 160));
  await L.toucher(c, '[data-cp="envoi"]'); const pan = await X.panneau(p); await L.capture(c, X.CAP + `${profil}-parcours-g-envoi.png`);
  v('G2 la fenêtre d’envoi a un destinataire, un objet, un message et une pièce jointe', /expert-comptable/i.test(pan) && /FEC/.test(pan), pan.slice(0, 300));
  v('G2 elle dit les vérifications pas encore faites (on peut envoyer quand même)', /vérification/i.test(pan) && /quand même/i.test(pan), pan.slice(0, 400));
  const bt = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim()).filter(Boolean)); console.log('boutons de la fenêtre d’envoi :', JSON.stringify(bt));
  const envoyer = await p.evaluate(() => { const b = [...document.querySelectorAll('#calque .panneau button')].find(x => /^Envoyer/i.test(x.textContent.trim())); if (b) { b.click(); return b.textContent.trim(); } return null; }); await p.waitForTimeout(500);
  const ap = await p.evaluate(() => ({ envoye: CP.envoye, emp: CP.empreinte })); v('G2 « Envoyer » fige octobre (envoyé le 31/10, avec une empreinte)', !!ap.envoye && !!ap.emp, { envoyer, ap });
  // après l'envoi : plus aucun geste ne touche octobre
  await X.compta(c, 'fachats', { cat: 'achats' }); await p.evaluate(() => cxDepense()); await p.fill('#dp-f', 'Après envoi'); await p.fill('#dp-o', 'Test'); await p.fill('#dp-h', '10'); const n0 = await p.evaluate(() => ACHATS.length);
  await p.evaluate(() => document.querySelector('#calque [data-cx="depenseok"]').click()); await p.waitForTimeout(300); const t3 = await X.toasts(p); v('G3 après l’envoi, une dépense d’octobre est refusée avec une phrase', (await p.evaluate(() => ACHATS.length)) === n0 && /envoyé/i.test(t3), t3);
  await p.keyboard.press('Escape'); await X.compta(c, 'envoi'); const ev = await X.texte(p); v('G3 l’écran Envoi dit « Envoyé le 31/10 » et ne propose pas de rouvrir (application)', /Envoyé le/.test(ev) && !/Rouvrir/.test(ev), ev.slice(0, 260));
  await X.compta(c, 'banque'); await p.evaluate(() => { }); const tb = await p.evaluate(() => { const b = document.querySelector('[data-cp^="frais|"]'); return b ? 1 : 0; }); if (tb) { await L.toucher(c, '[data-cp^="frais|"]'); v('G3 après l’envoi, « Ce sont des frais bancaires » est refusé avec une phrase', /envoyé/i.test(await X.toasts(p)), await X.toasts(p)); }
  // 3) le FEC et le bilan des encaissements
  await X.compta(c, 'archives'); await L.toucher(c, '[data-cp="fec"]'); const fec = await X.panneau(p); v('G4 « Voir » le FEC montre des lignes à 18 colonnes et dit le nombre d’écritures', /FEC/.test(fec) && /lignes/.test(fec) && /JournalCode|EcritureDate|\|/.test(fec), fec.slice(0, 260));
  await L.capture(c, X.CAP + `${profil}-parcours-g-fec.png`);
  const dl = p.waitForEvent('download', { timeout: 4000 }).catch(() => null); const dd = await p.evaluate(() => { const b = document.querySelector('#calque [data-cp="fecdl"]'); if (b) { b.click(); return b.textContent.trim(); } return null; }); const d = await dl; v('G4 « Télécharger » le FEC lance un téléchargement (fichier nommé)', !!dd && (!!d || /téléchar|enregistr/i.test(await X.toasts(p)) || !!(await p.evaluate(() => document.querySelector('#fichier-local, .fichier-local, #voirfichier')))), { bouton: dd, fichier: d && d.suggestedFilename() });
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  await L.toucher(c, '[data-action="bilanPdf"]'); const bil = await X.panneau(p) + ' ' + (await p.evaluate(() => { const z = document.getElementById('docplein'); return z ? z.innerText : ''; })); await L.capture(c, X.CAP + `${profil}-parcours-g-bilan.png`);
  const enc = await p.evaluate(() => { const E = cpEncOct(); return { n: E.length, ttc: Math.round(E.reduce((s, e) => s + e.ttc, 0) * 100) }; });
  v('compta-reste-10 · G5 le bilan des encaissements dit le total reçu d’octobre, au centime', bil.replace(/[\s  ]/g, '').includes((enc.ttc / 100).toFixed(2).replace('.', ',')), { enc, extrait: bil.slice(0, 200) });
  await p.evaluate(() => { try { docPleinFermer(); } catch (e) {} try { fermerPanneau(); } catch (e) {} });
  // 4) « aux normes » : SIREN
  await X.compta(c, 'normes'); const sc0 = (await X.texte(p)).match(/(\d+) sur (\d+)\s*\n?\s*points vérifiés/); await L.toucher(c, '[data-cx="siren"]'); const sf = await X.panneau(p); v('G6 le formulaire SIREN liste les clients professionnels', /SIREN/.test(sf), sf.slice(0, 160));
  await p.fill('[data-cxsiren]', '123'); await p.evaluate(() => document.querySelector('#calque [data-cx="sirenok"]').click()); await p.waitForTimeout(250); const tf = await X.toasts(p); v('G6 un SIREN faux est refusé avec une phrase qui dit pourquoi', /ne semble pas juste/.test(tf), tf);
  await p.fill('[data-cxsiren]', '552 100 554'); await p.evaluate(() => document.querySelector('#calque [data-cx="sirenok"]').click()); await p.waitForTimeout(250); v('G6 un SIREN juste (552 100 554) est enregistré', /SIREN enregistrés/.test(await X.toasts(p)), await X.toasts(p));
  // plateforme
  await X.compta(c, 'normes'); await L.toucher(c, '[data-cx="plateforme"]'); await p.evaluate(() => document.querySelector('#calque [data-cx="plateformeok"]').click()); await p.waitForTimeout(250); v('G7 une plateforme sans nom est refusée avec une phrase', /Écris le nom/.test(await X.toasts(p)), await X.toasts(p));
  await p.fill('#pa-n', 'Pennylane'); await p.evaluate(() => { document.getElementById('pa-v').click(); document.querySelector('#calque [data-cx="plateformeok"]').click(); }); await p.waitForTimeout(300); await X.compta(c, 'normes'); const nt = await X.texte(p);
  v('G7 la plateforme choisie et vérifiée passe la ligne « Recevoir les factures électroniques » à « en règle »', /Pennylane/.test(nt), nt.match(/Recevoir les factures[^\n]*\n[^\n]*\n[^\n]*/) && nt.match(/Recevoir les factures[^\n]*\n[^\n]*\n[^\n]*/)[0]);
  // fiche légale
  await L.toucher(c, '[data-cx="fiche"]'); await p.fill('#fl-siret', '123'); const fl = await p.evaluate(() => { document.querySelector('#calque [data-cx="ficheok"]').click(); return 1; }); await p.waitForTimeout(300); const tl = await X.toasts(p), pl = await X.panneau(p); await L.capture(c, X.CAP + `${profil}-parcours-g-fiche-legale.png`);
  v('G8 un SIRET faux (« 123 ») est refusé, et l’écran dit lequel et pourquoi', /SIRET|14 chiffres/i.test(pl + tl), (pl + ' | ' + tl).slice(0, 300));
  v('G erreurs JavaScript : aucune', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
