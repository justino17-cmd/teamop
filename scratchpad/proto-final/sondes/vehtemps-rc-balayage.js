// Balayage du recontrôle « vehtemps » : cherche ce que les corrections ont CASSÉ à côté, sur tous les rôles et tous les écrans du lot.
// Pour chaque (profil, jour/nuit, rôle, écran, onglet) : erreurs de page, débordement latéral (contre la largeur POSÉE du profil), cibles au doigt sous 44 px,
// champs sous 16 px, textes écrasés, texte « undefined/NaN/null », fautes connues (« moiss »). Écrit un JSON ; RACINE=<dossier> pour mesurer une AUTRE version (l'avant),
// puis `node vehtemps-rc-balayage.js --comparer a.json b.json` ne garde que ce qui est NEUF. 127.0.0.1 seulement.
//   PROFILS=iphone,android,petit,ipad,mac,windows  NUIT=0,1  SORTIE=/chemin.json
const fs = require('fs'), L = require('../lib.js');
if (process.argv[2] === '--comparer') {
  const A = JSON.parse(fs.readFileSync(process.argv[3], 'utf8')), B = JSON.parse(fs.readFileSync(process.argv[4], 'utf8')); let neufs = 0;
  const a = new Map(A.map(x => [x.cle, x])); const out = [];
  for (const b of B) { const x = a.get(b.cle); for (const k of ['petits', 'champs', 'ecrases', 'mots', 'err']) { const avant = new Set(x ? x[k] : []); const nv = (b[k] || []).filter(e => !avant.has(e)); if (nv.length) { neufs += nv.length; out.push(b.cle + ' · ' + k + ' : ' + nv.slice(0, 4).join(' | ')); } }
    if (b.bouge > 0 && !(x && x.bouge > 0)) { neufs++; out.push(b.cle + ' · DÉBORDE de côté (' + b.bouge + ' px) : ' + b.coupable); } }
  console.log(out.join('\n')); console.log('\n' + B.length + ' écrans comparés · ' + neufs + ' constat(s) NEUF(S)'); process.exit(0);
}
const PROFILS = (process.env.PROFILS || 'iphone,android,petit,ipad,mac,windows').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(x => x === '1'), SORTIE = process.env.SORTIE || '/tmp/balayage.json';
const ROLES = { marc:[['pointage', ['auj', 'semaine', 'mois']], ['vehicules', ['tous', 'afaire', 'garage']], ['fiche', ['afaire', 'papiers', 'depenses']], ['equipe', [null]]],
  julie:[['pointage', ['auj', 'semaine', 'mois']], ['equipe', [null]]],
  sm:[['moncamion', [null]], ['majournee', [null]], ['mesheures', ['mois', 'fiches']]],
  kb:[['moncamion', [null]], ['majournee', [null]], ['mesheures', ['mois', 'fiches']], ['pointage', ['auj', 'semaine', 'mois']]],
  tl:[['moncamion', [null]], ['mesheures', ['mois', 'fiches']]], lr:[['majournee', [null]], ['mesheures', ['mois']]] };
const R = [];
(async () => {
  for (const profil of PROFILS) for (const nuit of NUITS) for (const qui of Object.keys(ROLES)) {
    const c = await L.ouvrir({ profil, nuit, qui, calme:true }); const tel = c.doigt && c.largeur < 800;
    const mesure = async (ecran, onglet, extra) => {
      await L.calme(c.p, 450);
      const M = await c.p.evaluate(() => { const txt = (document.querySelector('#calque .panneau') || document.querySelector('#contenu') || document.body).innerText; return { mots:(txt.match(/undefined|NaN|\[object|null\b|moiss\b/g) || []).slice(0, 3), h1:(document.querySelector('#contenu h1') || {}).textContent || '' }; });
      const dz = await L.doigts(c.p, '#contenu').catch(() => ({ petits:[], champs:[], ecrases:[] }));
      const pn = await c.p.evaluate(() => !!document.querySelector('#calque .panneau')) ? await L.doigts(c.p, '#calque .panneau').catch(() => ({ petits:[], champs:[], ecrases:[] })) : { petits:[], champs:[], ecrases:[] };
      const d = await L.deborde(c); const err = c.err.splice(0).filter(e => !/ERR_/.test(e));
      R.push({ cle:[profil + (nuit ? '/nuit' : ''), qui, ecran, onglet || '-'].join(' · '), mots:M.mots, petits:tel ? [...dz.petits, ...pn.petits] : [], champs:[...dz.champs, ...pn.champs], ecrases:[...dz.ecrases, ...pn.ecrases], bouge:d.bouge, coupable:d.coupable, err });
    };
    for (const [ecran, onglets] of ROLES[qui]) for (const onglet of onglets) {
      try {
        if (ecran === 'fiche') { for (const id of ['veh1', 'veh2', 'veh3', 'veh4']) { await c.p.evaluate(i => { fermerPanneau(); vehFiche(i); }, id); await L.calme(c.p, 350); if (onglet !== 'afaire') await L.toucher(c, `#calque [data-vh="fonglet|${onglet}"]`); await mesure('fiche ' + id, onglet); } await c.p.evaluate(() => fermerPanneau()); continue; }
        await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
        await c.p.evaluate(e => aller(e), ecran); await L.calme(c.p, 450);
        if (onglet) { if (ecran === 'pointage') await c.p.evaluate(o => { ptOnglet = o; rendre(); }, onglet); else if (ecran === 'vehicules') await c.p.evaluate(o => { VH.onglet = o; rendre(); }, onglet); else if (ecran === 'mesheures') await L.toucher(c, `#contenu [data-tt="mhonglet|${onglet}"]`); }
        await mesure(ecran, onglet);
      } catch (e) { R.push({ cle:[profil, qui, ecran, onglet].join(' · '), mots:[], petits:[], champs:[], ecrases:[], bouge:0, err:['SONDE : ' + String(e).slice(0, 120)] }); }
    }
    await L.fin(c);
  }
  fs.writeFileSync(SORTIE, JSON.stringify(R, null, 1)); console.log(R.length + ' écrans mesurés → ' + SORTIE + ' · ' + R.filter(x => x.bouge > 0).length + ' qui débordent · ' + R.filter(x => x.err.length).length + ' avec erreur');
  await L.fermer();
})().catch(async e => { console.log('ERREUR', e && e.stack || e); await L.fermer(); process.exit(2); });
