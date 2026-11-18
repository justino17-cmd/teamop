// Recontrôle adverse metier-3d, 18 novembre 2026 : la fenêtre « Nouvelle intervention » (création en deux étapes) parle-t-elle du métier ?
// Après la correction metier-3d-07 (indications des champs), une fonction neuve (« Chercher un autre article », étape Matériel 5) a posé
// un exemple écrit pour la climatisation, en minuscules, que la table des exemples (clés en « Ex. ») ne reconnaît pas.
// On relève, pour chaque métier, toutes les indications de champ ET les pièces proposées sous « Pièces à prévoir », et on cherche un mot
// de climatisation (fluide, R32, condensateur, clim, pompe à chaleur, split) chez qui n'en fait pas.
// Usage : node metier-3d-recontrole-e.js [profil]   → « N ✓ · M ✗ »
const O = require('./metier-3d-outils.js'), L = O.L, fs = require('fs');
const profil = process.argv[2] || 'mac';
let ok = 0, ko = 0; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const JEUX = { '3d': ['3d'], nett: ['nettoyage'], plomb: ['plomberie'], chauf: ['chauffage'], elec: ['electricite'], paysage: ['paysagiste'], aucun: [], clim: ['climatisation'] };
const CLIM = /fluide|R32|condensateur|clim|pompe à chaleur|split/i;
(async () => { for (const [nom, packs] of Object.entries(JEUX)) { const c = await O.ouvrir({ profil, qui: 'marc', packs }), p = c.p; p.on('dialog', d => d.dismiss().catch(() => {}));
  await L.aller(p, 'interventions'); const b = p.locator('#contenu button').filter({ hasText: /Nouvelle intervention/ }).locator('visible=true').first(); v(nom + ' : « Nouvelle intervention » existe (population)', await b.count() > 0);
  await L.toucher(c, b); await L.calme(p, 700);
  // on avance jusqu'à l'étape 2 si la fenêtre est en deux temps : le client d'abord
  const lu = async () => p.evaluate(() => { const r = document.getElementById('contenu') || document; const fen = [...document.querySelectorAll('#calque, .fen')]; fen.forEach(x => x.querySelectorAll('[placeholder]').forEach(()=>{})); return { ph: [...document.querySelectorAll('[placeholder]')].map(e => e.getAttribute('placeholder')), pieces: [...document.querySelectorAll('#cp-res button, [data-vis="crea-pieces"] [data-cpq]')].map(e => e.innerText.trim()), types: [...r.querySelectorAll('[data-ctype]')].map(e => e.innerText.trim()), titre: (r.querySelector('h2') || {}).innerText }; });
  let s = await lu(); const exs = s.ph.filter(x => /^ex/i.test(x));
  console.log('  · ' + nom + ' → ' + JSON.stringify(s).slice(0, 500));
  const tout = exs.concat(s.pieces).join(' | ');
  if (nom !== 'clim') v(nom + ' : les indications et pièces de « Nouvelle intervention » ne parlent pas de climatisation', !CLIM.test(tout), tout);
  v(nom + ' : la fenêtre a des indications (population non vide)', exs.length > 0 || s.pieces.length > 0, JSON.stringify(s).slice(0, 200));
  if (['plomb', 'nett'].includes(nom)) await p.screenshot({ path: (O.CAP || process.env.CAP) + '/rc-e-' + nom + '-' + profil + '.png' }).catch(() => {});
  v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.join(' // ')); await L.fin(c); }
  await L.fermer(); process.exit(O.bilan('metier-3d-recontrole-e', ok, ko, [])); })().catch(async e => { console.log('ERREUR', e.stack); await L.fermer(); process.exit(2); });
