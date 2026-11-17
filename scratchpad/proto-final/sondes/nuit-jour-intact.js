// LE JOUR NE BOUGE PAS D'UN PIXEL (voie « nuit », 17 novembre 2026) : la même série de captures de JOUR, prises sur la page actuelle et sur
// la même page SANS la décision du bouton principal de nuit, doit être identique octet pour octet (le nouveau jeton --fill-doux vaut
// --fill de jour). Deux passes : RACINE=<dossier de l'ancienne page> SORTIE=<dossier> node …, puis la comparaison par la sonde elle-même.
//   RACINE=/dossier/avant SORTIE=/tmp/a node scratchpad/proto-final/sondes/nuit-jour-intact.js ; SORTIE=/tmp/b node …  ; COMPARER=/tmp/a,/tmp/b node …
// ⛔ 127.0.0.1 seulement.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
if (process.env.COMPARER) { const [a, b] = process.env.COMPARER.split(','); const fa = fs.readdirSync(a).filter(f => f.endsWith('.png')); let ok = 0, ko = 0;
  for (const f of fa) { const h = d => { try { return crypto.createHash('sha1').update(fs.readFileSync(path.join(d, f))).digest('hex'); } catch (e) { return null; } };
    if (h(a) && h(a) === h(b)) ok++; else { ko++; console.log('  ✗ différent :', f); } }
  console.log(`== ${ok} identiques · ${ko} différentes (population : ${fa.length})`); process.exit(ko || fa.length < 10 ? 1 : 0); }
const L = require('../lib.js'), S = process.env.SORTIE;
const PLAN = [['marc', 'mac', ['accueil', 'vehicules', 'entreprise', 'planning', 'interventions', 'devis', 'clients', 'stock', 'equipe', 'comptabilite', 'achats']],
  ['marc', 'iphone', ['accueil', 'vehicules', 'entreprise', 'interventions', 'devis']], ['sm', 'iphone', ['majournee', 'moncamion', 'taches']], ['julie', 'android', ['interventions', 'devis', 'stock']]];
(async () => { let n = 0;
  for (const [qui, profil, routes] of PLAN) { const c = await L.ouvrir({ profil, qui, nuit: false });
    for (const r of routes) { await L.aller(c.p, r); await c.p.waitForTimeout(900); await L.capture(c, path.join(S, `${qui}-${profil}-${r}.png`)); n++;
      await c.p.evaluate(() => { try { if (typeof cmptFermer === 'function') cmptFermer(); } catch (x) {} }); }
    await L.fin(c); }
  console.log('captures de jour :', n); await L.fermer(); })().catch(async e => { console.log('✗', e.message); await L.fermer(); process.exit(1); });
