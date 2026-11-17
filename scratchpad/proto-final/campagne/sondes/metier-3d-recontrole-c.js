// Recontrôle adverse metier-3d (metier-3d-07) : les indications de champ des achats et de la recherche d'article suivent le métier, y compris quand l'entreprise en cumule plusieurs.
// Rend « N ✓ · M ✗ ». Les cas multiples (3D + clim, la démonstration clim + chauffage + plomberie) disent ce qui est lu, sans conclure seuls.
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const JEUX = { clim: ['climatisation'], '3d': ['3d'], nett: ['nettoyage'], plomb: ['plomberie'], chauf: ['chauffage'], elec: ['electricite'], serr: ['serrurerie'], peint: ['peinture'], paysage: ['paysagiste'], d3clim: ['3d', 'climatisation'], demo: ['climatisation', 'chauffage', 'plomberie'], plombchauf: ['plomberie', 'chauffage'], aucun: [] };
(async () => { const lus = {};
  for (const [nom, packs] of Object.entries(JEUX)) { const c = await O.ouvrir({ profil: 'mac', qui: 'marc', packs }), p = c.p; p.on('dialog', d => d.dismiss().catch(() => {}));
    await L.aller(p, 'achats'); const b = p.locator('#contenu button').filter({ hasText: /Nouvelle demande/ }).locator('visible=true').first(); const n = await b.count(); v(nom + ' : « Nouvelle demande d\'achat » existe (population)', n > 0);
    let ph1 = []; if (n) { await L.toucher(c, b); await L.calme(p, 700); ph1 = await p.evaluate(() => [...document.querySelectorAll('#calque [placeholder], .fen [placeholder]')].map(e => e.getAttribute('placeholder')).filter(x => /^ex/i.test(x))); await O.nettoyer(p); }
    await L.aller(p, 'interventions'); const b2 = p.locator('#contenu button').filter({ hasText: /Nouvelle intervention/ }).locator('visible=true').first(); let ph2 = []; if (await b2.count()) { await L.toucher(c, b2); await L.calme(p, 700); ph2 = await p.evaluate(() => [...document.querySelectorAll('#calque [placeholder], .fen [placeholder]')].map(e => e.getAttribute('placeholder')).filter(x => /^ex/i.test(x))); await O.nettoyer(p); }
    await L.aller(p, 'taches'); await p.evaluate(() => tPanneau()); await L.calme(p, 500); const ph3 = await p.evaluate(() => { const e = document.getElementById('tk-t'); return e ? e.getAttribute('placeholder') : null; }); await O.nettoyer(p);
    lus[nom] = { achat: ph1, interv: ph2, tache: ph3 }; console.log('  · ' + nom + ' → achat ' + JSON.stringify(ph1) + ' ¦ intervention ' + JSON.stringify(ph2).slice(0, 300) + ' ¦ tâche ' + ph3);
    v(nom + ' : la tâche ne parle pas de pompe à chaleur', ph3 !== null && !/PAC|pompe/i.test(ph3), ph3);
    if (!['clim', 'demo', 'd3clim', 'chauf', 'plombchauf'].includes(nom)) { const tous = ph1.concat(ph2).join(' | '); v(nom + ' : ni fluide, ni R32, ni condensateur, ni clim dans les exemples des champs', !/fluide|R32|condensateur|clim|pompe à chaleur|split/i.test(tous), tous); }
    v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); }
  await L.fermer(); process.exit(O.bilan('metier-3d-recontrole-c', ok, ko, [])); })().catch(async e => { console.log('ERREUR', e.stack); await L.fermer(); process.exit(2); });
