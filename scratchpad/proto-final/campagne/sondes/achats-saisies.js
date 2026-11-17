// Saisies d'un montant comme les tape une personne (campagne du 17 novembre 2026) : la note de frais et l'achat en magasin doivent soit
// comprendre le montant, soit le REFUSER avec une phrase — jamais le lire de travers en silence (« 12,5,6 » ne devient pas 12,50 €,
// « 1.234,56 » ne devient pas 1,23 €).
// Usage : node achats-saisies.js [profil=mac]
const { L, ouvrirAchats, devenir, toast, panneau } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'sm', hash: 'techfrais' }), p = c.p, E = (f, a) => p.evaluate(f, a), clic = s => L.toucher(c, s);
  // [saisie, attendu] : un nombre (centimes compris) = accepté à ce montant ; null = refusé avec un message, rien n'est créé
  const CAS = [['12,5', 12.5], ['12.5', 12.5], ['12,50', 12.5], ['1 000', 1000], ['12 €', 12], ['12,5 €', 12.5], ['  7,2  ', 7.2], ['1.234,56', 1234.56], ['1 234,56', 1234.56], ['12,5,6', null], ['douze', null], ['-5', null], ['0', null], ['', null], ['12,', 12], ['1e3', null]];
  let n = 0;
  for (const [saisie, attendu] of CAS) {
    await clic('[data-rl="ndf"]'); await L.calme(p, 200);
    await p.selectOption('#rn-o', 'Carburant'); await p.fill('#rn-m', saisie);
    const n0 = await E(() => NDF.length); await clic('[data-rl="ndfok"]'); await L.calme(p, 350);
    const n1 = await E(() => NDF.length), ttc = n1 > n0 ? await E(() => NDF[0].ttc) : null, msg = (await toast(p)).slice(0, 80), dbl = await E(() => { const z = document.getElementById('rn-dbl'); return z && !z.hidden ? z.textContent.replace(/\s+/g, ' ').trim().slice(0, 80) : ''; });
    const nom = `« ${saisie} » ${attendu === null ? 'est refusé avec une phrase, rien n’est créé' : 'est lu ' + String(attendu).replace('.', ',') + ' €'}`;
    v(`S${++n} ${attendu !== null && /€|,$/.test(saisie) ? '(achats-11) ' : ''}${nom}`, attendu === null ? (n1 === n0 && (!!msg || !!dbl)) : (n1 === n0 + 1 && ttc === attendu), { saisie, attendu, ttc, cree: n1 - n0, msg, dbl });
    if (n1 > n0) await E(() => { NDF.shift(); }); await L.ranger(p); await E(() => { rendre(); });
  }
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
