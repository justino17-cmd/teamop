// Captures à REGARDER (19 novembre 2026) : le crédit de TVA côté HÔTE (achat de 5 000 € saisi par le vrai formulaire : onglets TVA et « Le mois »), la règle du crédit et la paie du cadre,
// par profil, de jour et de nuit. usage : node compta-restes-coherence-3-captures.js <profil> [nuit]      (les images vont hors dépôt)
const X = require('./compta-reste-outils.js'), L = X.L;
const CAP = '/tmp/claude-0/-home-user-teamop/8635c152-538b-540f-897d-db2367154ee4/scratchpad/cap-c3/';
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  await p.evaluate(() => { cxDepense(); }); await p.waitForTimeout(500);
  await p.fill('#dp-f', 'Fournisseur Essai'); await p.fill('#dp-o', 'Gros achat d’essai'); await p.fill('#dp-h', '5000'); await p.fill('#dp-r', 'ESSAI-5000');
  await p.check('input[name="dp-j"][value="facture"]'); await p.check('input[name="dp-pay"][value="Carte"]'); await p.click('[data-cx="depenseok"]'); await p.waitForTimeout(900);
  await X.compta(c, 'tva'); await L.capture(c, CAP + tag + '-hote-tva.png');
  await p.evaluate(() => { const e = [...document.querySelectorAll('.carte')].find(x => /Crédit de TVA/.test(x.innerText)); if (e) e.scrollIntoView({ block: 'start' }); }); await p.waitForTimeout(400); await L.capture(c, CAP + tag + '-hote-tva-carte.png');
  await X.compta(c, 'ensemble'); await p.evaluate(() => { const e = [...document.querySelectorAll('.cx-af')].find(x => /Crédit de TVA/.test(x.innerText)); if (e) e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(400); await L.capture(c, CAP + tag + '-hote-afaire.png');
  const f = await X.cadreCompta(c); L.v('le cadre est ouvert', !!f); await p.waitForTimeout(1200);
  const va = async (r, nom, haut) => { await f.evaluate(k => { UI.expert = false; try { aller(k); } catch (e) {} }, r); await p.waitForTimeout(900); if (haut) await f.evaluate(s => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }, haut); await p.waitForTimeout(500); await L.capture(c, CAP + tag + '-' + nom + '.png'); };
  await f.evaluate(() => { try { toutTraiter(); rendre(); } catch (e) {} }); await p.waitForTimeout(900);
  await va('tva', 'cadre-tva', '#tva-auto');
  await f.evaluate(() => { if (!PAIE.calc) paieCalculer(); rendre(); }); await va('paie', 'cadre-paie', '#paie-controles');
  const d = await L.deborde(c).catch(() => null); console.log('débordement', JSON.stringify(d));
  await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
