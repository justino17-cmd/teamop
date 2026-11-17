// Restes des recontrôles « Clients », tour 1 — ce que le recontrôle n'avait pas pu JOUER : un client créé depuis un vrai courriel de la Boîte mail (« C'est un client », « Créer le client et son devis »)
// et depuis la fenêtre « Composer un devis » (dans son cadre). Chacun doit finir avec son point sur la carte, son secteur et un numéro à la française (clients-05, clients-18).
// Usage : PROFIL=… NUIT=1 node clients-restes-creations.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-clients/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const SR = "document.querySelector('#courrier-hote [data-opcourrier]').shadowRoot";
  const cles = () => p.evaluate(() => Object.keys(CLIENTS).filter(k => k !== '__nv'));
  const etat = k => p.evaluate(k => ({ nom: CLIENTS[k].nom, tel: CLIENTS[k].tel, adr: CLIENTS[k].adr, g: CR_GEO[k] || null, s: SECT_CLI[k] || null, pos: crPos({ i: { cli: k } }), depot: CR_DEPOT }), k);
  const avant = await cles(); v('population : 8 clients au départ (' + avant.length + ')', avant.length === 8);

  // ── la Boîte mail : « C'est un client » sur un courriel d'un inconnu qui écrit de Rochefort ──
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await p.waitForTimeout(600);
  await p.evaluate(() => { MAILS.push(mlM('zA', AUJ, '11:00', { nom: 'Paul Martel', mail: 'paul.martel@exemple.fr' }, 'Bonjour', 'Bonjour,\n\nJ’habite à Rochefort. Pouvez-vous me rappeler au 06 45 67 89 01 ?\n\nMerci,\nPaul Martel')); COURRIER.inst.rafraichir(); });
  await p.waitForTimeout(800); await p.evaluate(() => COURRIER.inst.ouvrir('zA')); await p.waitForTimeout(700);
  const btn = await p.evaluate(`(() => [...${SR}.querySelectorAll('.hband [data-hote]')].map(b => b.dataset.hote))()`); console.log('  · gestes proposés sur le courriel : ' + btn.join(', '));
  v('population : le courriel d’un inconnu propose « C’est un client »', btn.includes('mbx:cestclient|zA'), btn);
  await L.capture(c, CAP + 'mail-inconnu-' + ETQ + '.png');
  await p.evaluate(`${SR}.querySelector('.hband [data-hote="mbx:cestclient|zA"]').click()`); await p.waitForTimeout(800);
  let nv = (await cles()).filter(k => !avant.includes(k)); v('« C’est un client » crée UN client (' + nv.length + ')', nv.length === 1, nv);
  if (nv[0]) { const e = await etat(nv[0]); console.log('  · ' + JSON.stringify(e));
    v('… à son adresse « ' + e.adr + ' », son point sur la carte est à Rochefort (' + JSON.stringify(e.g) + ') et la carte ne le place pas au dépôt', !!e.g && Math.abs(e.g[0] - 45.9378) < 0.05 && JSON.stringify(e.pos) !== JSON.stringify(e.depot), e);
    v('… son secteur est posé (« ' + e.s + ' ») et son téléphone s’écrit à la française (« ' + e.tel + ' »)', e.s === 'Sud' && e.tel === '06 45 67 89 01', e); }

  // ── la Boîte mail : « Créer le client et son devis » sur la demande de Claire Fontaine, à Aytré ──
  await p.evaluate(() => { aller('boiteMail'); }); await p.waitForTimeout(600); await p.evaluate(() => COURRIER.inst.ouvrir('m5')); await p.waitForTimeout(700);
  const b5 = await p.evaluate(`(() => [...${SR}.querySelectorAll('.hband [data-hote]')].map(b => b.dataset.hote))()`); console.log('  · gestes sur la demande de devis : ' + b5.join(', '));
  v('population : la demande de devis d’une inconnue propose « Créer le client et son devis »', b5.includes('mbx:devis|m5'), b5);
  const av5 = await cles();
  await p.evaluate(`${SR}.querySelector('.hband [data-hote="mbx:devis|m5"]').click()`); await p.waitForTimeout(900);
  await p.evaluate(() => { const b = document.querySelector('#calque [data-mbx^="devfait"]'); if (b) b.click(); }); await p.waitForTimeout(900);
  nv = (await cles()).filter(k => !av5.includes(k)); v('« Créer le client et son devis » crée UN client (' + nv.length + ')', nv.length === 1, nv);
  if (nv[0]) { const e = await etat(nv[0]); console.log('  · ' + JSON.stringify(e));
    v('… « ' + e.adr + ' » : son point est à Aytré (' + JSON.stringify(e.g) + '), sa carte ne le range pas au dépôt, son secteur est posé (« ' + e.s + ' »)', !!e.g && Math.abs(e.g[0] - 46.1331) < 0.05 && JSON.stringify(e.pos) !== JSON.stringify(e.depot) && !!e.s, e); }
  await L.capture(c, CAP + 'mail-devis-' + ETQ + '.png');
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });

  // ── Composer un devis : le client naît dans la fenêtre de l'atelier, par ses propres champs ──
  await L.aller(p, 'client-x-vp'); const nbAvant = (await cles()).length;
  const ouv = await L.toucher(c, '#contenu [data-opd="devis"]'); await p.waitForTimeout(2500);
  const cadre = L.cadre(p); v('population : « Composer un devis » ouvre son cadre (' + !!cadre + ')', ouv && !!cadre, { ouv });
  if (cadre) {
    await L.capture(c, CAP + 'atelier-ouvert-' + ETQ + '.png');
    // « Nouveau client… » dans l'atelier : sa fenêtre, ses champs, son bouton « Ajouter ce client »
    await cadre.getByText('Nouveau client…', { exact: false }).first().click(); await p.waitForTimeout(700);
    await cadre.fill('form[data-form] [name="nom"]', 'Atelier Rochefort'); await cadre.fill('form[data-form] [name="adresse"]', '4 rue du Port');
    await cadre.fill('form[data-form] [name="cp"]', '17300'); await cadre.fill('form[data-form] [name="ville"]', 'Rochefort'); await cadre.fill('form[data-form] [name="tel"]', '+33 6 11 22 33 99');
    await L.capture(c, CAP + 'atelier-nouveau-client-' + ETQ + '.png');
    await cadre.locator('[data-ok]').first().click(); await p.waitForTimeout(1500);
    const nvA = await p.evaluate(() => { const k = Object.keys(CLIENTS).find(x => CLIENTS[x].nom === 'Atelier Rochefort'); return k ? { k, tel: CLIENTS[k].tel, adr: CLIENTS[k].adr, g: CR_GEO[k] || null, s: SECT_CLI[k] || null, pos: crPos({ i: { cli: k } }), depot: CR_DEPOT } : null; });
    console.log('  · ' + JSON.stringify(nvA));
    v('« Composer un devis » › « Nouveau client… » : le client arrive dans la liste du bureau (' + (await cles()).length + ' clients)', !!nvA && (await cles()).length === nbAvant + 1, nvA);
    v('… avec son point sur la carte à Rochefort, son secteur (« ' + (nvA && nvA.s) + ' ») et son téléphone à la française (« ' + (nvA && nvA.tel) + ' »)', !!nvA && !!nvA.g && Math.abs(nvA.g[0] - 45.9378) < 0.05 && nvA.s === 'Sud' && nvA.tel === '06 11 22 33 99' && JSON.stringify(nvA.pos) !== JSON.stringify(nvA.depot), nvA);
    await L.capture(c, CAP + 'atelier-apres-' + ETQ + '.png');
  }
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  const code = L.bilan(); await L.fin(c); await L.fermer(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
