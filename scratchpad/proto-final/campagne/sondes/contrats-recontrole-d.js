// RECONTRÔLE ADVERSE des contrats, parcours R4 : une PIÈCE posée par le technicien sur une visite d'un contrat « par an » ou « par mois » :
// la visite ne se facture pas (comprise), la pièce, elle, est hors contrat (le contrat dit « Pièces d'usure comprises » seulement si la case est cochée).
// Où la pièce va-t-elle ? Si nulle part, le travail est fourni et jamais facturé.
// usage : node contrats-recontrole-d.js [profil]  → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const txt = (p, z) => p.evaluate(z => ((document.querySelector(z || '#contenu') || {}).textContent || '').replace(/\s+/g, ' ').trim(), z);
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats' }); const p = c.p; await L.calme(p, 400);
  async function creerSigner(o) { await L.aller(p, 'contrat-nouveau'); await p.selectOption('[data-b="modele"]', 'chauffage'); await L.calme(p, 250);
    await p.selectOption('[data-b="cli"]', o.cli); await p.selectOption('[data-b="freq"]', '2'); await p.selectOption('[data-b="fact"]', o.fact); await p.fill('[data-b="prix"]', '1200');
    await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 600); const k = await p.evaluate(() => { const k = CONTRATS[CONTRATS.length - 1]; return { id: k.id, num: k.num }; });
    await L.aller(p, 'signer-x-' + k.id); await p.check('#lu'); await p.evaluate(() => document.getElementById('signe-ctr').scrollIntoView({ block: 'center' })); await L.calme(p, 250); const bb = await p.locator('#signe-ctr').boundingBox();
    await p.mouse.move(bb.x + bb.width * .2, bb.y + bb.height * .6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .5, bb.y + bb.height * .3, { steps: 6 }); await p.mouse.move(bb.x + bb.width * .8, bb.y + bb.height * .6, { steps: 6 }); await p.mouse.up();
    await L.toucher(c, '[data-action="signerContrat"]'); await L.calme(p, 600); return k; }
  for (const [fact, cli] of [['an', 'cm'], ['mois', 'hp']]) {
    const k = await creerSigner({ fact, cli }); const id = await p.evaluate(id => INTS.find(i => i.ctr === id).id, k.id);
    await L.aller(p, 'inter-x-' + id);
    await p.evaluate(id => { const i = INTS.find(o => o.id === id); i.tech = 'tl'; i.st = 'planifiee'; const F = fiche(id); tousControles(F).forEach(k => { F.coches[k] = true; }); F.signature = 'signee'; F.compte = 'Fait.'; F.pieces = [{ nom: 'Compresseur de remplacement', q: '1', pu: 420 }]; rendre(); }, id);
    await L.calme(p, 300); await L.toucher(c, '[data-action="terminer"]', { delai: 2500 }); await L.calme(p, 500);
    const r = await p.evaluate(id => ({ st: INTS.find(o => o.id === id).st, factures: FACTURES.filter(f => f.int === id || (f.lignes || []).some(l => /Compresseur/.test(l.d))).length, msg: (document.getElementById('toast') || {}).textContent }), id);
    console.log('  ·', fact, JSON.stringify(r));
    v(`R4-${fact} une pièce de 420 € posée sur une visite comprise dans le contrat « ${fact} » finit sur une facture (ou le bureau est prévenu)`, r.factures >= 1 || /pièce/i.test(r.msg || ''), r);
    await L.aller(p, 'inter-x-' + id); const t = await txt(p); await L.capture(c, O.CAP.replace('campagne-contrats', 'recontrole-contrats') + `R4-${fact}-apres-${profil}.png`);
    v(`R4-${fact} la fiche de la visite terminée ne dit pas « garantie »`, !/garantie/i.test(t), (t.match(/.{0,60}garantie.{0,60}/i) || [''])[0]);
  }
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
