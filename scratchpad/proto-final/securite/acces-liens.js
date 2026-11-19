// Angle « accès » · sonde 2 : les liens profonds (#inter-x-<id>, #facture-x-<id>, #client-x-<id>, #devis-x-<id>, #contrat-x-<id>, #signer-x-<id>) et ce que les écrans
// ouverts DIRENT d'argent. Pour chaque personne : (a) une fiche qui n'est pas la sienne s'ouvre-t-elle par l'adresse ? (b) quels mots sensibles lit-on sur les écrans qu'elle a le droit d'ouvrir ?
const L = require('../lib.js'), fs = require('fs');
const SENS = /marge|prix d.achat|prix d’achat|co[uû]t(s)? (horaire|de revient)|salaire|bulletin|fiche de paie|net à payer|brut|IBAN|FR76|taux horaire|\bcoût\b/i;
(async () => {
  const QUI = (process.env.QUI || 'sm,julie,kb').split(','), sortie = {};
  for (const qui of QUI) {
    const c = await L.ouvrir({ profil: 'mac', qui, attente: 900 });
    const ids = await c.p.evaluate(() => ({ inter: INTS.map(i => ({ id: i.id, tech: i.tech, cli: i.cli, st: i.st })), facture: FACTURES.map(f => f.id), client: Object.keys(CLIENTS), contrat: CONTRATS.map(k => k.id), devis: (dvInit(), DV).map(o => o.id) }));
    L.v(qui + ' : population des fiches comptée', ids.inter.length > 5 && ids.facture.length > 3 && ids.client.length > 3, { i: ids.inter.length, f: ids.facture.length, c: ids.client.length, k: ids.contrat.length, d: ids.devis.length });
    const moi = qui; const resu = { ouvertesParAdresse: [], leurs: [], mots: {} };
    // (a) liens profonds
    const essais = [].concat(ids.inter.map(i => ['inter', i.id, i.tech !== moi ? 'autre' : 'sienne']), ids.facture.map(x => ['facture', x, 'x']), ids.client.map(x => ['client', x, 'x']), ids.contrat.map(x => ['contrat', x, 'x']), ids.devis.map(x => ['devis', x, 'x']));
    for (const [fam, id, lien] of essais) {
      await c.p.evaluate(h => { location.hash = '#' + h; }, fam + '-x-' + id);
      await c.p.waitForTimeout(220);
      const s = await c.p.evaluate(([fam, id]) => { const ct = document.getElementById('contenu'), h1 = ct.querySelector('h1'); return { route, param, droit: droitVoit(fam), h1: h1 ? h1.textContent.trim().slice(0, 60) : '', len: ct.innerText.length, t: ct.innerText.replace(/\s+/g, ' ').slice(0, 300), ok: route === fam && param === id }; }, [fam, id]);
      if (s.ok) resu.ouvertesParAdresse.push({ fam, id, lien, droit: s.droit, h1: s.h1, len: s.len });
    }
    const hors = resu.ouvertesParAdresse.filter(o => !o.droit);
    const autres = resu.ouvertesParAdresse.filter(o => o.fam === 'inter' && o.lien === 'autre');
    console.log('\n[' + qui + '] fiches ouvertes par l\'adresse : ' + resu.ouvertesParAdresse.length + ' · dont écran FERMÉ à cette personne : ' + hors.length + ' · dont interventions d\'un AUTRE technicien : ' + autres.length);
    hors.slice(0, 8).forEach(o => console.log('    ⚠ fermé mais ouvert', o.fam, o.id, JSON.stringify(o.h1)));
    autres.slice(0, 8).forEach(o => console.log('    · intervention d\'un autre', o.id, JSON.stringify(o.h1), o.len));
    L.v(qui + ' : aucune fiche d\'un écran fermé ne s\'ouvre par l\'adresse', hors.length === 0, hors.map(o => o.fam + '-x-' + o.id).join(' '));
    // (b) mots sensibles sur les écrans ouverts
    const routes = await c.p.evaluate(() => Object.keys(vues()).filter(r => droitVoit(r)));
    for (const r of routes) {
      await c.p.evaluate(h => { location.hash = '#' + h; }, r); await c.p.waitForTimeout(260);
      const t = await c.p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' '));
      const m = [...new Set((t.match(new RegExp(SENS.source, 'gi')) || []).map(x => x.toLowerCase()))];
      if (m.length) resu.mots[r] = m;
    }
    console.log('  mots sensibles lus sur les écrans ouverts (' + routes.length + ') :', JSON.stringify(resu.mots));
    sortie[qui] = resu; await L.fin(c);
  }
  fs.writeFileSync('/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/acces/liens-' + QUI.join('-') + '.json', JSON.stringify(sortie, null, 1));
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
