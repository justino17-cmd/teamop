// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026) : l'ADRESSE de la page est une entrée que n'importe quel lien peut fabriquer
// (courriel, message, QR code). Une adresse piégée (#v=…, ?app=1&auto=…, identifiants de fiches) fait-elle sortir du code ?
// Variantes jouées par la vraie page (adresse ouverte à neuf, puis changement de hash en cours de séance, puis retour arrière) : balise dans la route,
// dans l'identifiant d'une fiche (client-x-, inter-x-, devis-x-, facture-x-, contrat-x-, signer-x-), dans le paramètre auto et dans un paramètre inconnu.
// Population : la page se charge à chaque fois et affiche un écran de l'application ; contre-épreuve : la lecture voit une balise posée exprès.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const C = id => `ZQ${id}"'><i data-xss=${id}></i><img src=x onerror="__xss('${id}')">`;
(async () => {
  const hashs = [['route', h => 'v=' + h(1)], ['route seule', h => h(2)], ['client-x', h => 'v=client-x-' + h(3)], ['inter-x', h => 'v=inter-x-' + h(4)], ['devis-x', h => 'v=devis-x-' + h(5)], ['facture-x', h => 'v=facture-x-' + h(6)], ['contrat-x', h => 'v=contrat-x-' + h(7)], ['signer-x', h => 'v=signer-x-' + h(8)], ['encodé', h => 'v=' + encodeURIComponent(h(9))], ['double encodé', h => 'v=' + encodeURIComponent(encodeURIComponent(h(10)))]];
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1200, init: O.INIT }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  let essais = 0; const sorties = [];
  for (const [nom, f] of hashs) {
    const h = i => C('n' + (500 + i));
    await p.evaluate(x => { location.hash = x; }, f(h)); await p.waitForTimeout(700);
    const R = await p.evaluate(O.LIRE); const texte = await p.evaluate(() => document.getElementById('contenu') ? document.getElementById('contenu').innerText.length : -1);
    essais++; R.sorti.forEach(s => sorties.push(nom + ' ▸ ' + s.sorte)); console.log('  ·', nom.padEnd(14), '· écran', JSON.stringify(await p.evaluate(() => route)), '· texte', texte, '· sorties', R.sorti.length);
    await p.evaluate(() => history.back()); await p.waitForTimeout(300);
  }
  // l'adresse à neuf : paramètres piégés dans la requête
  const requetes = ['?app=1&auto=' + encodeURIComponent(C('n520')), '?app=1&x=' + encodeURIComponent(C('n521')), '?app=1&auto=marc&v=' + encodeURIComponent(C('n522')), '?app=1&auto=marc#v=' + encodeURIComponent(C('n523'))];
  for (const q of requetes) { const c2 = await L.ouvrir({ profil: 'mac', qui: null, app: false, requete: q, init: O.INIT, attente: 1300 }); const R = await c2.p.evaluate(O.LIRE); const ecran = await c2.p.evaluate(() => (document.body.innerText || '').length); essais++;
    R.sorti.forEach(s => sorties.push(q.slice(0, 30) + ' ▸ ' + s.sorte)); console.log('  · requête', q.slice(0, 40), '· texte', ecran, '· sorties', R.sorti.length, '· hits', R.hits.length); await L.fin(c2); }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice());
  L.v('population : ' + essais + ' adresses piégées jouées (changement de hash en séance et ouverture à neuf)', essais >= 14, essais);
  L.v('AUCUNE adresse piégée ne fait sortir une balise ou un gestionnaire — sorties : ' + sorties.length, sorties.length === 0, sorties.slice(0, 5));
  L.v('AUCUN code exécuté (window.__hits) : ' + hits.length, hits.length === 0, hits.slice(0, 4));
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i>'; document.body.appendChild(d); }); await p.waitForTimeout(300);
  const T = await p.evaluate(O.LIRE); L.v('contre-épreuve : la lecture voit la balise posée exprès', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 2));
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); console.log('  · erreurs de page :', nErr.length, nErr.slice(0, 2));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
