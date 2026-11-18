// RECONTRÔLE ADVERSE du bouton Retour, CAPTURES des défauts constatés (18 novembre 2026) : pour chaque calque que le Retour oublie, on le MONTRE — l'écran après le Retour,
// puis l'écran quand on revient là où la couche était restée (est-elle toujours posée ? c'est ce que verrait la personne).
// Les captures vont dans CAP/retour-recontrole/captures (hors dépôt) et se REGARDENT. Rend « N ✓ · M ✗ » ; ici un ✗ est un défaut CONFIRMÉ, pas une panne de sonde.
// PROFIL=android|iphone|mac.
const fs = require('fs'), path = require('path');
const C = require('./retour-commun.js'), L = C.L, v = C.v, M = require('./mail-commun.js');
const PROFIL = process.env.PROFIL || 'android';
const CAP = (process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap') + '/retour-recontrole/captures'; fs.mkdirSync(CAP, { recursive: true });
const constats = [];
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc', init: M.INIT }), p = c.p, h = () => p.evaluate(() => location.hash);
  const cap = (n) => L.capture(c, path.join(CAP, PROFIL + '-' + n + '.png'));
  // 1. Comptabilité plein cadre : un panneau ouvert, Retour, puis on y revient
  await L.aller(p, 'accueil');
  if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); } else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
  await p.waitForTimeout(1800); await L.calme(p, 300);
  let fr = L.cadre(p, /prototype-comptabilite\.html/); v(PROFIL + ' : le cadre de la Comptabilité est affiché (population)', !!fr);
  if (fr) {
    const pose = await fr.evaluate(() => { for (const b of [...document.querySelectorAll('[data-a]')].filter(e => e.offsetParent)) { const a = b.dataset.a; if (/^(route|menu|aller|nav|mode|fermer|guide|apparence)/.test(a)) continue; try { b.click(); } catch (e) { continue; } if (document.querySelector('#calque').innerHTML) return a; } return null; });
    await p.waitForTimeout(600); await cap('1-compta-panneau-ouvert');
    await C.retour(p); const h1 = await h(); await cap('1-compta-apres-retour');
    // on revient à la Comptabilité : le panneau est-il resté posé ?
    await L.aller(p, 'comptabilite'); await p.waitForTimeout(1500); fr = L.cadre(p, /prototype-comptabilite\.html/);
    const reste = fr ? await fr.evaluate(() => !!document.querySelector('#calque .voile, #calque .panneau, #calque > *')) : null; await cap('1-compta-retour-dans-la-compta');
    constats.push({ k: 'compta-panneau', pose, apresRetour: h1, panneauResteAuRetour: reste }); console.log('  · compta', JSON.stringify(constats.at(-1)));
    v(PROFIL + ' : Comptabilité : le panneau ouvert (' + pose + ') ne reste PAS posé quand on revient', reste === false, { h1, reste });
  }
  // 2. OP Security (téléphone simulé)
  await L.aller(p, 'accueil'); await L.aller(p, 'clients'); await L.calme(p, 300);
  const ouvert = await p.evaluate(() => { try { opsMonter(); opsOuvrir(); return !!document.getElementById('opsec').hasAttribute('data-ouvert'); } catch (e) { return false; } });
  await p.waitForTimeout(500); await cap('2-opsec-ouvert'); const large = await p.evaluate(() => opsLarge());
  if (ouvert && !large) { await C.retour(p); const h2 = await h(), reste = await p.evaluate(() => document.getElementById('opsec').hasAttribute('data-ouvert')); await cap('2-opsec-apres-retour');
    constats.push({ k: 'opsec', apresRetour: h2, resteOuvert: reste }); console.log('  · opsec', JSON.stringify(constats.at(-1))); v(PROFIL + ' : OP Security : Retour ferme le téléphone', !reste && h2 === '#clients', { h2, reste }); }
  else console.log('  · opsec : volet permanent ou fermé à cette largeur (pas un calque)');
  await p.evaluate(() => { try { opsFermer(); } catch (e) {} });
  // 3. la confirmation OP Security
  await L.aller(p, 'accueil'); await L.aller(p, 'taches'); await L.calme(p, 300);
  const sec = await p.evaluate(() => { try { SECU.auto = false; secuGarde('banque-ouvrir', () => {}); return !!document.getElementById('sec-conf'); } catch (e) { return false; } });
  await p.waitForTimeout(500);
  if (sec) { await cap('3-confirmation-ouverte'); await C.retour(p); const h3 = await h(), reste = await p.evaluate(() => !!document.getElementById('sec-conf')); await cap('3-confirmation-apres-retour');
    constats.push({ k: 'sec-conf', apresRetour: h3, resteOuvert: reste }); console.log('  · sec-conf', JSON.stringify(constats.at(-1))); v(PROFIL + ' : confirmation OP Security : Retour la ferme et laisse l\'écran', !reste && h3 === '#taches', { h3, reste });
    await p.evaluate(() => { try { secuConfFermer(true, false, true); SECU.auto = true; } catch (e) {} }); }
  // 4. le composeur de la Boîte mail (ordinateur : le module n'empile pas)
  await L.aller(p, 'accueil'); await L.aller(p, 'boiteMail'); await M.pret(p, 6000); await p.waitForTimeout(300);
  await p.evaluate(() => window.R().querySelector('#btnCompose').click()); await p.waitForTimeout(800); await cap('4-composeur-ouvert');
  await C.retour(p); const h4 = await h(); await cap('4-composeur-apres-retour');
  await L.aller(p, 'boiteMail'); await p.waitForTimeout(900); const comp = await p.evaluate(() => { const r = window.R && window.R(); return !!(r && r.querySelector('#overlay:not(.ov-menu)')); }); await cap('4-composeur-retour-dans-la-boite');
  constats.push({ k: 'composeur', apresRetour: h4, composeurRestePose: comp }); console.log('  · composeur', JSON.stringify(constats.at(-1)));
  v(PROFIL + ' : Boîte mail : Retour avec le composeur ouvert reste dans la Boîte mail', h4 === '#boiteMail', { h4 });
  try { fs.writeFileSync(path.join(CAP, `constats-${PROFIL}.json`), JSON.stringify(constats, null, 1)); } catch (e) {}
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.message).split('\n')[0].slice(0, 200)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
