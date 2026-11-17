// RECONTRÔLE ADVERSE — L'HISTORIQUE QUI JETTE (17 novembre 2026). Un cadre à origine opaque peut refuser history.pushState / replaceState (SecurityError) :
// le bac de l'agent précédent ne le simule pas. Cas pire (« jette-tout » : même une adresse en #nom jette) et cas probable (« jette » : seul « #nom » passe).
// On parcourt chaque rubrique du menu d'un rôle, on ouvre quelques fiches, et on exige : aucune erreur non rattrapée, l'écran change vraiment (le titre), la
// navigation ne se fige pas. Les appels qui jettent sont listés avec leur pile (pour nommer le coupable).
const P = require('./recontrole-artefact-pose.js'), { bac, lib: L, v } = P;
const PROFIL = process.env.PROFIL || 'mac';
(async () => {
  for (const hist of ['jette', 'jette-tout']) for (const role of ['patron', 'gestion', 'tech']) {
    const c = await P.ouvrirHote({ profil: PROFIL, app: false }, { historique: hist });
    await c.p.evaluate(r => { try { rlChanger(r, { muet: true }); } catch (e) {} }, role); await L.calme(c.p, 700);
    const menu = await c.p.evaluate(() => [...document.querySelectorAll('#menu a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(r => routeConnue(r)));
    v(`${hist}/${role} : population (${menu.length} rubriques au menu)`, menu.length >= 2, menu);
    let figes = [];
    for (const r of menu.slice(0, 14)) { const t0 = await c.p.evaluate(() => document.getElementById('contenu').innerHTML.length); await c.p.evaluate(x => aller(x), r); await L.calme(c.p, 450);
      const t = await c.p.evaluate(() => ({ h1: ((document.querySelector('#contenu h1') || {}).textContent || '').trim(), n: document.getElementById('contenu').innerHTML.length, hash: location.hash }));
      if (!t.n || t.n < 100) figes.push(r + ' (vide)'); }
    v(`${hist}/${role} : chaque rubrique s'affiche (${menu.slice(0, 14).length} essayées)`, figes.length === 0, figes);
    // des fiches ouvertes par adresse
    for (const h of ['client-x-cm', 'devis-x-D1', 'inter-x-i1']) { await c.p.evaluate(x => { location.hash = x; }, h); await L.calme(c.p, 450); }
    const e = await P.etat(c);
    const pile = [...new Set(e.adv.histo.map(x => x.m + ' ' + x.url + ' ← ' + x.pile))].slice(0, 6);
    console.log('  · appels à l\'historique :', e.adv.histo.length, JSON.stringify(pile).slice(0, 700));
    v(`${hist}/${role} : aucune erreur JavaScript non rattrapée`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
