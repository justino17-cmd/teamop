// Campagne « métiers » : pour CHACUN des 24 métiers pris seul, ce que l'application met à disposition (types d'intervention, titres et motifs types,
// modèles de devis, modèles de contrat avec leurs contrôles et relevés, objet de contrat) est-il fait de mots de CE métier ? On lit les tables du
// prototype (pas l'écran : les écrans, eux, sont lus par metier-3d-mots.js), on pose le métier comme TEAM OP, et on relève les mots de climatisation
// chez qui n'en fait pas, les mots de 3D chez qui n'en fait pas, et les métiers qui n'ont AUCUN modèle de devis / de contrat à eux.
// Rend « N ✓ · M ✗ » ; les relevés de mots sont des ✗ nommés par métier ; un métier sans modèle propre part d'un modèle général (c'est dit à l'écran).
const fs = require('fs'), O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
(async () => {
  const c = await O.ouvrir({ qui: 'marc', packs: ['climatisation'] }), p = c.p, tout = {};
  const cles = await p.evaluate(() => Object.keys(PACKS)); v('population : 24 métiers', cles.length === 24, cles.length);
  for (const k of cles) {
    await O.poser(p, [k]);
    const d = await p.evaluate(() => { const fam = metiersFamille(), cm = metiersClesModeles(), mods = metiersModeles().map(([cl, M]) => ({ cl, nom: M.nom, presta: M.presta, controles: M.controles || null, releves: M.releves || null, compte: M.compte || '' }));
      return { nom: PACKS[PACKS_ENT[0]].nom, fam, cm, mods, types: TYPES.slice(), titres: Object.assign({}, TITRES), motifs: Object.assign({}, MOTIFS), dv: DV_MODELES.map(m => m[0] + ' : ' + m[1].map(l => l[0]).join(' / ')), ctr: metiersCtr(cm[0] || fam), cats: PACKS[PACKS_ENT[0]].cats.map(x => x.n), groupe3d: CATS.some(g => g[0] === GROUPE_3D) }; });
    tout[k] = d;
    const texte = JSON.stringify({ t: d.types, ti: d.titres, mo: d.motifs, dv: d.dv, mods: d.mods, ctr: d.ctr });
    const clim = k === 'climatisation' || k === 'froid' ? [] : [...texte.matchAll(new RegExp(O.MOTS_CLIM.source, 'gi'))].map(m => texte.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30));
    const d3 = k === '3d' ? [] : [...texte.matchAll(new RegExp(O.MOTS_3D.source, 'gi'))].map(m => texte.slice(Math.max(0, m.index - 40), m.index + m[0].length + 30));
    v(`${k} : aucun mot de climatisation dans ses types, titres, motifs, modèles de devis et de contrat`, clim.length === 0, [...new Set(clim)].slice(0, 3).join(' ¦ '));
    v(`${k} : aucun mot de 3D dans ses types, titres, motifs, modèles de devis et de contrat`, d3.length === 0, [...new Set(d3)].slice(0, 3).join(' ¦ '));
    v(`${k} : le groupe 3D du menu ${k === '3d' ? 'est là' : 'n\'est pas là'}`, d.groupe3d === (k === '3d'));
    v(`${k} : au moins un modèle de devis (DV_MODELES) et un type d'intervention`, d.dv.length >= 3 && d.types.length >= 4, d.dv.length + ' modèles, ' + d.types.length + ' types');
    v(`${k} : au moins un modèle de contrat`, d.mods.length >= 1, 'clés de modèle : ' + JSON.stringify(d.cm));
    if (d.mods.length) v(`${k} : le modèle de contrat porte ses contrôles et ses relevés`, d.mods.every(m => m.controles && m.controles.length && m.releves && m.releves.length) || d.mods.every(m => m.cl in { clim:1, nett:1, nuis:1, plomb:1 }), d.mods.map(m => m.cl + (m.controles ? '' : ' sans contrôles') + (m.releves ? '' : ' sans relevés')).join(', '));
    v(`${k} : « Mise en service » présent seulement pour clim, chauffage, plomberie`, d.types.includes('Mise en service') === ['climatisation', 'chauffage', 'plomberie'].includes(k) || ['froid'].includes(k), d.types.join(', '));
  }
  // un métier sans modèle de contrat propre : à dire (c'est le modèle général)
  const sansModele = cles.filter(k => tout[k].mods.length && !['clim', 'nett', 'nuis', 'plomb'].includes(tout[k].cm[0]) && !/·/.test(tout[k].mods[0].nom));
  fs.writeFileSync(O.CAP + 'donnees-metiers.json', JSON.stringify(tout, null, 1));
  console.log('modèles de contrat par métier :'); cles.forEach(k => console.log('   ' + k.padEnd(15) + ' → ' + (tout[k].mods.map(m => m.nom).join(' | ') || 'AUCUN') + '   [types : ' + tout[k].types.length + ', devis : ' + tout[k].dv.length + ']'));
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // '));
  await L.fin(c); await L.fermer(); process.exit(O.bilan('metier-3d-donnees', ok, ko, ['sans modèle de contrat nommé « X · … » : ' + sansModele.join(', ')]));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
