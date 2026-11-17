// Recontrôle : le module « Paiement en ligne » (cadre prototype-paiement.html dans Trésorerie) porte-t-il des mots d'échafaudage lisibles par une vraie personne ?
// (le correcteur n'a lu que la barre au-dessus du cadre, jamais l'intérieur). « N ✓ · M ✗ » ; chaque phrase trouvée est un ✗.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
const ECHAF = /simulation|simul[ée]|prototype|fictif|fictive|démonstration|essais? guidés?|tests? guidés?|Tests \d+ ?\/ ?\d+|Tous les tests|carte d.essai|pour l.essai|coulisses|remonter le temps|\+ ?1 jour|Jusqu.au prochain événement|Nous sommes le/i;
(async () => {
  const profil = process.argv[2] || 'mac', c = await L.ouvrir({ profil, nuit: process.argv[3] === 'nuit', qui: 'marc' }), p = c.p;
  await X.compta(c, 'enligne'); await p.waitForTimeout(1500); const f = L.cadre(p, /prototype-paiement\.html/); v('PM0 · le module est ouvert', !!f);
  const lire = async nom => { const t = await f.evaluate(() => document.body.innerText); const m = [...new Set((t.match(new RegExp('[^.\\n]*(' + ECHAF.source + ')[^.\\n]*', 'gi')) || []).map(s => s.trim().slice(0, 150)))]; v(`PM · ${nom} : aucun reste d’échafaudage lisible (${t.length} car. lus)`, t.length > 200 && m.length === 0, m); return m; };
  await lire('à l’ouverture');
  await f.locator('[data-act="voir|f143"]').first().click({ timeout: 6000 }).catch(() => {}); await p.waitForTimeout(600); await lire('écran du client');
  await f.locator('[data-cli="moyen|carte"]').first().click({ timeout: 4000 }).catch(() => {}); await p.waitForTimeout(500); await lire('choix de la carte');
  await L.capture(c, X.CAP + `rc-paiement-client-${profil}.png`);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
