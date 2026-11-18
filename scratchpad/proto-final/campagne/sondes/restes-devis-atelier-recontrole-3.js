// Restes devis-atelier, tour 1 — recontrôle adverse : où le mot « exemple » reste-t-il visible dans l'atelier d'OP GESTION (mode application), contrat et devis,
// avant tout envoi ? (le correcteur n'a traité que l'envoi et la signature). Rend la liste des phrases, sans tomber : c'est un relevé. Usage : node … [profil] [nuit]
const O = require('./devis-atelier-outils.js'), L = O.L, A = O.A;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'contrats' }), p = c.p;
  const f = await A.ouvrirAtelier(c, 'contrat', 'contrats'); await L.calme(p, 800);
  const lire = async nom => { const t = await f.evaluate(() => document.body.innerText.replace(/\s+/g, ' ')); const m = [...t.matchAll(/.{0,70}exemple.{0,50}/gi)].map(x => x[0]); console.log(nom + ' :', m.length ? JSON.stringify(m) : '(rien)'); };
  await lire('contrat — écran de départ');
  if (process.env.CAPT) await L.capture(c, O.CAP + `recontrole3-contrat-depart-${profil}${nuit ? '-nuit' : ''}.png`);
  const hero = f.locator('[data-act="ia-ouvrir"]:visible').first();
  if (await hero.count()) { if (c.doigt) await hero.tap(); else await hero.click(); await p.waitForTimeout(800); await lire('contrat — fenêtre « Créer avec l’IA »'); if (process.env.CAPT) await L.capture(c, O.CAP + `recontrole3-contrat-ia-${profil}${nuit ? '-nuit' : ''}.png`); }
  await L.fermer(); process.exit(0);
})().catch(async e => { console.log('ERREUR SONDE', e.message.slice(0, 600)); await L.fermer(); process.exit(2); });
