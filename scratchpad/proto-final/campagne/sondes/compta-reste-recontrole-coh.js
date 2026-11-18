// Recontrôle adverse de la cohérence cadre / OP GESTION : décompose l'écart de TVA collectée et relit la tuile « TVA d'octobre ».
const X = require('./compta-reste-outils.js'), L = X.L;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', qui: 'marc' }), p = c.p;
  const H = await p.evaluate(() => { const tv = cpTva(), pt = cpPaieTerrain(), en = ENCAISSEMENTS.filter(e => cpOct(e.d));
    const tva = e => e.ttc - e.ttc / (1 + e.tva / 100);
    return { col: tv.col, nEncOct: en.length, tvaEnc: en.reduce((s, e) => s + tva(e), 0), terrain: pt.map(e => ({ fac: e.fac, ttc: e.ttc, tva: e.tva, mode: e.mode, tv: tva(e) })),
      parTaux: Object.fromEntries([...new Set(en.map(e => e.tva))].map(t => [t, en.filter(e => e.tva === t).reduce((s, e) => s + e.ttc, 0)])), enc: en.map(e => [e.fac, e.ttc, e.tva]), dedParAchat: ACHATS.filter(a => cpDed(a)).length }; });
  console.log(JSON.stringify(H));
  const f = await X.cadreCompta(c); await p.waitForTimeout(1200);
  await f.evaluate(() => aller('tva')); await p.waitForTimeout(900);
  console.log('CADRE TVA TEXTE:', (await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' '))).slice(0, 1400));
  await f.evaluate(() => aller('accueil')); await p.waitForTimeout(700);
  console.log('CADRE ACC:', (await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' '))).slice(0, 1800));
  await L.fin(c); await L.fermer(); process.exit(0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
