// Exploration du CADRE « OP COMPTABLE » (plein écran) : chaque rubrique du menu, capture, gestes, mots d'échafaudage. Ne conclut rien.
// usage : node compta-reste-cadre-explore.js [profil] [nuit]
const X = require('./compta-reste-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const f = await X.cadreOuvert(c); if (!f) { console.log('cadre absent'); await L.fermer(); return; }
  await p.waitForTimeout(1200);
  await L.capture(c, X.CAP + `cadre-${profil}-${nuit ? 'nuit' : 'jour'}-ouverture.png`);
  const ouv = await f.evaluate(() => ({ mode: UI.mode, route: UI.route, pilote: UI.pilote, expert: UI.expert, texte: document.body.innerText.replace(/\n{2,}/g, '\n').slice(0, 1200) }));
  console.log('OUVERTURE', JSON.stringify(ouv));
  const menu = await f.evaluate(() => [...document.querySelectorAll('#menu a')].map(a => a.getAttribute('href') + ' | ' + a.textContent.replace(/\s+/g, ' ').trim()));
  console.log('MENU', menu.length); menu.forEach(m => console.log('  ', m));
  for (const h of menu.map(m => m.split(' | ')[0].replace('#', ''))) {
    try { await f.evaluate(r => { try { entrerLibre && UI.mode === 'choix' && entrerLibre(); } catch (e) {} aller(r); }, h); await p.waitForTimeout(700);
      const g = await L.gestes(f, '#contenu'), t = await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\n{2,}/g, '\n').trim());
      const mots = (t.match(/prototype|pour l.essai|d[ée]monstration|fictif|exemple|simul/gi) || []);
      console.log(`\n== ${h} gestes=${g.length} lignes=${t.split('\n').length} échafaudage=${JSON.stringify([...new Set(mots.map(x => x.toLowerCase()))])}`);
      await L.capture(c, X.CAP + `cadre-${profil}-${nuit ? 'nuit' : 'jour'}-${h}.png`);
    } catch (e) { console.log('ÉCHEC', h, e.message.slice(0, 120)); } }
  console.log('erreurs', c.err.slice(0, 5));
  await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
