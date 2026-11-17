// Angle « accès » · sonde 4 : la « visite parlée » (palette › « Découvrir l'application ») est offerte en mode application. Elle change de rôle et ouvre des écrans.
// Une technicienne (Sophie) qui la lance voit-elle des écrans que SES droits lui ferment ? On joue chaque chapitre et on relève route, rôle, droit de la personne CONNECTÉE.
const L = require('../lib.js'), fs = require('fs');
(async () => {
  const QUI = process.env.QUI || 'sm';
  const c = await L.ouvrir({ profil: 'mac', qui: QUI, attente: 900 });
  const avant = await c.p.evaluate(() => ({ session: SESSION, role: ROLE, offre: (palEntrees().find(e => /visite parlée/.test(e.l)) || {}).l || null, n: GD_TOURS.imm.chap().length, ouvertes: Object.keys(vues()).filter(r => droitVoit(r)).length }));
  console.log('avant :', JSON.stringify(avant));
  L.v('population : la visite compte des chapitres', avant.n > 10, avant.n);
  L.v('la palette de ' + QUI + ' OFFRE la visite parlée', !!avant.offre, avant.offre);
  const vus = [];
  for (let k = 0; k < avant.n; k++) {
    await c.p.evaluate(k => { try { gdQuitter(); } catch (e) {} immLancer(k); IMM.pause = true; }, k);
    await c.p.waitForTimeout(1100);
    const s = await c.p.evaluate(() => { const ct = document.getElementById('contenu'), h1 = ct.querySelector('h1'); return { route, role: ROLE, session: SESSION, acteur: acteur(), droit: droitVoit(route), cpsys: !!document.getElementById('cpsys') && !document.getElementById('cpsys').hidden, h1: h1 ? h1.textContent.trim().slice(0, 40) : '', len: ct.innerText.length, bande: !!document.querySelector('.rl-bande'), cat: (gdChap()[GD.e] || {}).cat }; });
    vus.push(s);
  }
  const hors = vus.filter(s => !s.droit && s.len > 300 || (!s.droit && s.cpsys));
  console.log('chapitres joués :', vus.length, '· écrans montrés alors que le droit de la personne CONNECTÉE les ferme :', hors.length);
  hors.forEach(s => console.log('   ⚠', s.cat, '→', s.route, '(' + s.role + ')', JSON.stringify(s.h1), s.len + ' car.', s.cpsys ? 'comptabilité plein écran' : ''));
  L.v('la visite ne montre aucun écran fermé à la personne connectée', hors.length === 0, hors.map(s => s.route));
  const roles = [...new Set(vus.map(s => s.role))]; console.log('rôles pris pendant la visite :', roles.join(','), '· session toujours', [...new Set(vus.map(s => s.session))].join(','));
  await c.p.screenshot({ path: '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/acces/visite-' + QUI + '.png' });
  fs.writeFileSync('/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/acces/visite-' + QUI + '.json', JSON.stringify(vus, null, 1));
  console.log('erreurs page :', c.err.slice(0, 3)); await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
