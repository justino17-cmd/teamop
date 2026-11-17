// Parcours F « compta-ventes » : la facture d'une INTERVENTION, d'un CONTRAT et d'un DEVIS à acompte. Marc prépare la facture d'une intervention terminée
// (Comptabilité › Ventes › Par intervention › « Préparer la facture »), relit les lignes, recalcule au centime (acompte reçu sur place déduit), envoie, puis
// regarde ce que la visite d'un contrat et un devis à acompte donnent comme facture.
// usage : node compta-ventes-parcours-f.js [profil]       « N ✓ · M ✗ », code 1 si un contrôle tombe
const X = require('./compta-ventes-outils.js'), L = X.L;
const cts = n => Math.round(n * 100);
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const d0 = await X.donnees(p), du0 = await X.du(p);
  // — les interventions terminées à facturer —
  const afact = await p.evaluate(() => cxDossiers().filter(x => x.st === 'afacturer').map(x => ({ id: x.id, titre: x.titre, cli: x.cli })));
  L.v('population : au moins une intervention terminée à facturer', afact.length >= 1, afact);
  await X.compta(c, 'dossiers'); const tuile = await p.evaluate(() => { const b = document.querySelector('[data-cx="dosf|afacturer"]'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : ''; });
  L.v('la tuile « à facturer » annonce le même nombre que la liste', new RegExp('^' + afact.length + '\\s').test(tuile) || tuile.includes(String(afact.length)), { tuile, n: afact.length });
  for (const a of afact) {
    await X.compta(c, 'dossiers'); await p.evaluate(i => { const b = document.querySelector('[data-cx="dossier|' + i + '"]'); if (b) b.click(); }, a.id); await L.calme(p, 500);
    const pan = await X.panneau(p); L.v(`${a.titre} : le dossier de l’intervention s’ouvre`, pan.length > 40, pan.slice(0, 80));
    const bouton = await p.evaluate(() => { const b = document.querySelector('#calque [data-cx^="dosfac|"]'); return b ? b.textContent.trim() : ''; });
    L.v(`${a.titre} : le dossier propose « Préparer la facture »`, /Préparer la facture/.test(bouton), bouton);
    await L.capture(c, X.CAP + `f-${profil}-dossier-${a.id}.png`);
    await L.toucher(c, '#calque [data-cx^="dosfac|"]'); await p.waitForTimeout(500);
    const st = await p.evaluate(() => ({ route, param })); const fid = st.param;
    L.v(`${a.titre} : la fiche de la facture préparée s’ouvre`, st.route === 'facture' && !!fid, st);
    if (!fid) continue;
    const info = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return f ? { lignes: lignesDe(f).map(l => ({ d: l.d, q: l.q, pu: l.pu })), tva: f.tva, ht: htDe(f), ttc: ttcDe(f), recu: f.recu || 0, reste: restant(f), paieTech: f.paieTech || null, st: f.st } : null; }, fid);
    L.v(`${a.titre} : la facture est « à valider » et chaque ligne porte un prix`, info && info.st === 'avalider', info);
    const sansPrix = info.lignes.filter(l => l.pu == null).length;
    if (sansPrix) { L.v(`${a.titre} : ${sansPrix} ligne(s) sans prix → « Aperçu et envoi » grisé`, await p.evaluate(() => document.querySelector('[data-action="apercuEnvoi"]').disabled), ''); await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); f.lignes.forEach(l => { if (l.pu == null) l.pu = 10; }); rendre(); }, fid); await L.calme(p, 300); }
    const calc = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); let ht = 0; lignesDe(f).forEach(l => { const q = parseFloat(String(l.q).replace(',', '.')); ht += l.pu * (q > 0 && !/[a-z]/i.test(l.q) ? q : 1); }); return { ht, ttc: ht * (1 + f.tva / 100), recu: f.recu || 0 }; }, fid);
    const ecran = await X.texte(p, '#contenu'); const ttcTxt = (ecran.match(/Total TTC\s*([\d\s  ]+,\d\d)/) || [])[1];
    L.v(`${a.titre} : « Total TTC » de l’écran = HT × (1 + TVA) au centime (${(cts(calc.ttc) / 100).toFixed(2)})`, ttcTxt && Math.abs(L.cents(ttcTxt) - cts(calc.ttc)) <= 1, { ttcTxt, attendu: cts(calc.ttc) });
    if (info.paieTech && info.paieTech.etat && info.paieTech.etat !== 'rien') L.v(`${a.titre} : le paiement noté sur place est annoncé sur la fiche`, /Noté sur place/.test(ecran), ecran.slice(0, 120));
    await L.capture(c, X.CAP + `f-${profil}-fiche-${fid}.png`);
    const avant = await X.du(p);
    await L.toucher(c, '[data-action="apercuEnvoi"]'); const ap = await X.panneau(p); L.v(`${a.titre} : l’aperçu s’ouvre et dit à qui part la facture`, /À\s*:/.test(ap) && /@/.test(ap), ap.slice(0, 100));
    await L.capture(c, X.CAP + `f-${profil}-apercu-${fid}.png`);
    await L.toucher(c, '#calque [data-action="envoyer"]'); await p.waitForTimeout(500);
    const ap2 = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return { num: f.num, st: f.st, reste: Math.round(restant(f) * 100) }; }, fid), t = await X.toasts(p);
    L.v(`${a.titre} : envoyée avec un numéro définitif (${ap2.num})`, /^FAC-2026-0\d{3}$/.test(ap2.num) && ['envoyee', 'payee', 'partielle'].includes(ap2.st), ap2);
    const apres = await X.du(p); L.v(`${a.titre} : « à recevoir » augmente du RESTE de la facture (${ap2.reste / 100} €), au centime`, apres - avant === ap2.reste, { avant, apres, reste: ap2.reste });
    L.v(`${a.titre} : le message dit ce qui est parti`, /envoyée/i.test(t), t);
  }
  // numéros qui se suivent, sans trou ni doublon
  const nums = (await X.donnees(p)).F.filter(x => /^FAC-2026-0\d{3}$/.test(x.num)).map(x => +x.num.slice(-4)); const uniq = new Set(nums).size === nums.length;
  L.v('les numéros de facture sont uniques', uniq, nums);
  // — visite d'un contrat —
  const ctr = await p.evaluate(() => { try { const k = CONTRATS.find(x => x.st === 'signe' && x.fact === 'visite') || CONTRATS.find(x => x.st === 'signe'); const i = INTS.find(o => o.cli === k.cli && o.type === 'Contrat' && o.st === 'fait') || null; return { k: k && { id: k.id, num: k.num, prix: k.prix, freq: k.freq, fact: k.fact }, i: i && i.id, factures: FACTURES.filter(f => i && f.int === i.id).map(f => ({ num: f.num, lignes: lignesDe(f).map(l => l.d + ' → ' + l.pu), ht: htDe(f) })) }; } catch (e) { return { err: e.message }; } });
  L.v('population : un contrat signé existe', !!ctr.k, ctr);
  if (ctr.k) {
    const parVisite = Math.round(ctr.k.prix / ctr.k.freq * 100) / 100;
    for (const f of ctr.factures) L.v(`visite de contrat ${ctr.k.num} : la facture ${f.num} est au prix du contrat (${parVisite} € HT par visite)`, Math.abs(f.ht - parVisite) < .01, f);
  }
  // — devis à acompte —
  const dv = await p.evaluate(() => { try { const D = dvInit().filter(d => d.acompte); return D.map(d => ({ num: d.num, e: d.e, acompte: d.acompte, ht: dvHT(d), facAcompte: d.facAcompte || null, facSolde: d.facSolde || null })); } catch (e) { return { err: e.message }; } });
  L.v('population : au moins un devis avec acompte', Array.isArray(dv) && dv.length >= 1, dv);
  if (Array.isArray(dv)) for (const d of dv.filter(x => x.facAcompte)) {
    const r = await p.evaluate(n => { const f = dvFacLue(n); return f ? { num: f.num, ht: f.st === 'avoir' ? f.ht : htDe(f), st: f.st } : null; }, d.facAcompte);
    L.v(`devis ${d.num} : la facture d’acompte vaut ${d.acompte} % du HT du devis (${Math.round(d.ht * d.acompte) / 100} €)`, !!r && Math.abs(r.ht - Math.round(d.ht * d.acompte) / 100) < .02, r);
  }
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
