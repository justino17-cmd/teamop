const W = '/home/user/wt-soeur/scratchpad/proto-final/';
const L = require(W + 'lib.js');
let ok = 0, ko = 0; const v = (n, c, d) => { if (c) { ok++; console.log('  ✓', n); } else { ko++; console.log('  ✗', n, '→', d === undefined ? '' : (typeof d === 'string' ? d : JSON.stringify(d))); } };
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc' });
  v('?auto=marc ouvre une session SANS téléphone', await c.p.evaluate(() => SESSION === 'marc' && !document.getElementById('opsec') && SECU.auto === true));
  v('aucun écran de connexion', await c.p.evaluate(() => !document.getElementById('cn-form')));
  // adresses de toutes sortes
  const hotes = [['http:', '127.0.0.1', true], ['http:', 'localhost', true], ['http:', '[::1]', true], ['file:', '', true],
    ['https:', 'teamop.fr', false], ['https:', 'www.teamop.fr', false], ['https:', 'api.teamop.fr', false], ['https:', 'claude.ai', false], ['https:', '127.0.0.1.teamop.fr', false],
    ['https:', 'evil-127.0.0.1', false], ['https:', 'localhost.evil.com', false], ['http:', '192.168.0.5', false], ['about:', '', false], ['data:', '', false],
    ['http:', '127.0.0.2', false], ['http:', '0.0.0.0', false], ['http:', 'LOCALHOST', false], ['http:', '127.1', false], ['https:', 'localhost.', false]];
  for (const [protocol, hostname, attendu] of hotes) {
    const r = await c.p.evaluate(({ protocol, hostname }) => secuAutoPermis({ protocol, hostname }), { protocol, hostname });
    v(`secuAutoPermis(${protocol}//${hostname}) = ${attendu}`, r === attendu, r);
  }
  // la confirmation est accordée d'office, l'IBAN se lit en clair, pas d'inactivité
  v('confirmation accordée d\'office (secuGarde vrai)', await c.p.evaluate(() => secuGarde('banque-ouvrir', () => {})));
  await c.p.evaluate(() => { SECU.decalage += 60 * 60000; secuTic && secuTic(); }); await c.p.waitForTimeout(800);
  v('une heure plus tard, toujours connecté (pas d\'inactivité)', await c.p.evaluate(() => SESSION === 'marc'));
  await L.aller(c.p, 'entreprise'); await c.p.waitForTimeout(700);
  const t = await c.p.evaluate(() => document.getElementById('contenu').innerText.replace(/[  ]/g, ' '));
  v('IBAN en clair pour une session ?auto= (comme avant)', /FR76 \d{4}/.test(t), (t.match(/FR[0-9• ]{8,}/g) || [])[0]);
  await L.fermer();
  // ?auto= d'une personne inconnue / sans le mode application : l'écran de connexion
  const c2 = await L.ouvrir({ profil: 'mac', qui: null, requete: '?app=1&auto=zzz', init: "try{localStorage.setItem('opg_proto_espace','clim-services-17')}catch(e){}", attente: 800 });
  await c2.p.waitForTimeout(5500);
  v('?auto=zzz (inconnu) : écran de connexion, pas de session', await c2.p.evaluate(() => !SESSION && !!document.getElementById('cn-form')), await c2.p.evaluate(() => String(SESSION)));
  await L.fermer();
  const c3 = await L.ouvrir({ profil: 'mac', qui: null, requete: '?app=1&auto=marc&tel=1', init: "try{localStorage.setItem('opg_proto_espace','clim-services-17')}catch(e){}", attente: 1500 });
  v('?auto=marc&tel=1 monte le téléphone', await c3.p.evaluate(() => SESSION === 'marc' && !!document.getElementById('opsec')));
  await L.fermer();
  console.log(`== ${ok} ✓ · ${ko} ✗`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('EXC', e.message.slice(0, 600)); process.exit(1); });
