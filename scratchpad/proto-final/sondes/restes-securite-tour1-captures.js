// CAPTURES à REGARDER du recontrôle des restes de la sécurité, tour 1 (18 novembre 2026) : la liste des clients et la bulle « est déjà chez » avec des noms DE BONNE FOI mais difficiles
// (« O'Brien & Fils », « $& », « __proto__ », un nom de 90 signes, « Sté Nord–Sud « Le Clos » »). Mac jour, iPhone nuit, Android nuit. Hors dépôt : cap/rec-secu1/. ⛔ 127.0.0.1 seulement.
const L = require('../lib.js');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/rec-secu1/';
const NOMS = ["O'Brien & Fils", '$&', '__proto__', 'Établissements Jean-Baptiste Lefebvre-Dubois et Associés Réunis de Charente-Maritime', 'Sté Nord–Sud « Le Clos »', 'Dupont &amp; Fils', 'A', 'constructor'];
(async () => {
  for (const [profil, nuit] of [['mac', false], ['iphone', true], ['android', true]]) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', attente: 1500 }), p = c.p; const tag = profil + (nuit ? '-nuit' : '-jour');
    await p.evaluate(noms => { Object.keys(CLIENTS).forEach((k, i) => { const o = cliNet({ ...CLIENTS[k], nom: noms[i % noms.length], contact: noms[i % noms.length] }); CLIENTS[k].nom = o.nom; CLIENTS[k].contact = o.contact; }); }, NOMS);
    await p.evaluate(() => aller('clients')); await L.calme(p, 800); await L.capture(c, SORTIE + 'clients-' + tag + '.png');
    await p.evaluate(() => { const k = Object.keys(CLIENTS)[3]; toast(`Sophie est déjà chez ${esc(CLIENTS[k].nom)} de 09:00 à 11:00 : choisis une autre heure ou un autre technicien.`); }); await p.waitForTimeout(500); await L.capture(c, SORTIE + 'bulle-' + tag + '.png');
    await p.evaluate(() => aller('client-x-' + Object.keys(CLIENTS)[3])); await L.calme(p, 800); await L.capture(c, SORTIE + 'fiche-' + tag + '.png');
    await L.fin(c);
  }
  await L.fermer();
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
