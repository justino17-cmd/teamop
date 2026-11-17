// Campagne « métiers » : la fenêtre « Nouvelle intervention » (types proposés, titres et exemples) suit-elle le métier ? C'est une fenêtre `.fen`, pas un
// panneau : les autres sondes ne la lisaient pas. Pour six métiers, on l'ouvre par la fonction de l'application (ouvrirCreation) PUIS par son vrai bouton,
// on lit les types offerts, les indications de champs et les exemples, et on relève les mots d'un autre métier hors données d'exemple.
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const notes = []; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const JEUX = [['plomberie'], ['chauffage'], ['nettoyage'], ['electricite'], ['3d'], ['climatisation'], ['3d', 'climatisation']];
(async () => {
  for (const packs of JEUX) { const nom = packs.join('+'), c = await O.ouvrir({ packs }), p = c.p, D = await O.donnees(p), clim = packs.includes('climatisation'), d3 = packs.includes('3d');
    await p.evaluate(() => aller('interventions')); await L.calme(p, 600);
    const bouton = await L.toucher(c, p.locator('#contenu button').filter({ hasText: /Nouvelle intervention/ }).locator('visible=true').first()); await L.calme(p, 800);
    const e = await O.lire(p), t = e.texte + ' ¦ ' + e.champs.map(x => 'CHAMP[' + x.ph + '|' + x.v + ']').join(' ¦ ');
    v(`${nom} : « Nouvelle intervention » ouvre bien sa fenêtre (par le bouton)`, bouton && e.panneau && /Nouvelle intervention/i.test(e.texte), 'panneau=' + e.panneau + ' ' + e.texte.slice(0, 80));
    const h = [...(clim ? [] : D.trouver(t, O.MOTS_CLIM)), ...(d3 ? [] : D.trouver(t, O.MOTS_3D))].filter(x => !x.donnee);
    v(`${nom} : la fenêtre n'a aucun mot d'un métier qu'elle n'a pas (hors données d'exemple)`, h.length === 0, h.slice(0, 4).map(x => '…' + x.ctx + '…').join(' ¦ '));
    const types = await p.evaluate(() => { const s = [...document.querySelectorAll('.fen select')].map(x => [...x.options].map(o => o.textContent.trim())); return s; });
    const ty = await p.evaluate(() => ({ types: [...document.querySelectorAll('.fen [data-ctype]')].map(b => b.textContent.trim()), motif: (document.querySelector('.fen [data-cchamp="motif"]') || {}).placeholder || '', titre: (document.querySelector('.fen [data-cchamp="titre"]') || {}).value || '' }));
    v(`${nom} : la fenêtre offre les types d'intervention du métier (population : ${ty.types.length})`, ty.types.length >= 4, JSON.stringify(ty));
    v(`${nom} : « Traitement du bois » est dans les types seulement avec la 3D (types lus : ${ty.types.length})`, ty.types.includes('Traitement du bois') === d3, ty.types.join(', '));
    notes.push(`${nom} · types : ${ty.types.join(' / ')} · exemple de motif : « ${ty.motif} »`);
    v(`${nom} : « Traitement du bois » proposé seulement avec la 3D`, /Traitement du bois/.test(t) === d3, '');
    v(`${nom} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2).join(' // '));
    await p.keyboard.press('Escape'); await L.calme(p, 300); await L.fin(c); }
  await L.fermer(); process.exit(O.bilan('metier-3d-creation', ok, ko, notes));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
