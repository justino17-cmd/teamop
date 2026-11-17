// États VIDES : une entreprise qui démarre n'a ni intervention, ni facture, ni tâche. Chaque écran dit-il quoi faire, ou montre-t-il une carte blanche ?
// On vide les registres dans la page (jamais dans le dépôt) puis on relit l'écran. node accueil-vides.js [profil] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac'; const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const corps = () => p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' '));
  await p.evaluate(() => { window.__sv = {}; for (const n of ['INTS', 'FACTURES', 'ENCAISSEMENTS', 'CONTRATS', 'TACHES', 'NDF', 'JOURNAL']) { try { const a = eval(n); window.__sv[n] = a.slice(); a.length = 0; } catch (e) { window.__sv['!' + n] = String(e); } }
    try { for (const k of Object.keys(SUITE_ETAT)) delete SUITE_ETAT[k]; } catch (e) {} });
  console.log('  vidés :', JSON.stringify(await p.evaluate(() => Object.fromEntries(Object.entries(window.__sv).map(([k, x]) => [k, Array.isArray(x) ? x.length : x])))));
  for (const vue of ['accueil', 'statistiques', 'historique']) {
    let err = null; try { await p.evaluate(h => aller(h), vue); await L.calme(p, 700); } catch (e) { err = e.message; }
    const t = await corps(), e = await O.etat2(p);
    v(`vide · ${vue} : l'écran s'affiche (pas de page blanche)`, !err && t.length > 60, { err, h1: e.h1, debut: t.slice(0, 120) });
    v(`vide · ${vue} : ni NaN, ni undefined, ni « Infinity »`, !/NaN|undefined|Infinity|\[object/.test(t), t.match(/.{30}(NaN|undefined|Infinity|\[object).{20}/));
    if (vue === 'accueil') {
      const cartes = await p.evaluate(() => [...document.querySelectorAll('#contenu .carte')].map(e => ({ h: (e.querySelector('h3') || {}).textContent, vide: e.querySelectorAll('button, .ligne-clic').length === 0, texte: e.innerText.replace(/\s+/g, ' ').slice(0, 160) })));
      for (const k of cartes) v(`accueil-04 · vide · accueil : la carte « ${k.h} » dit quoi faire quand elle est vide (au moins une phrase en plus du titre)`, !k.vide || k.texte.length > (k.h || '').length + 15, k);
    }
    await L.capture(c, O.CAP + `vide-${vue}-${profil}.png`, false);
  }
  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v('vide : aucune erreur JavaScript', bruit.length === 0, bruit.slice(0, 4));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
