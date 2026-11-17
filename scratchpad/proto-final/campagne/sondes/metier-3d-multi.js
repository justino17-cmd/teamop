// Campagne « métiers » : une entreprise qui fait PLUSIEURS métiers (3D + climatisation, nettoyage + 3D, plomberie + électricité…) : les types d'intervention,
// les modèles de devis et de contrat sont-ils ceux de TOUS ses métiers, et rien que d'eux ? « Nouveau contrat » propose-t-il un modèle par métier ?
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const notes = []; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const COMBOS = [['3d', 'climatisation'], ['nettoyage', '3d'], ['plomberie', 'electricite'], ['climatisation', 'chauffage', 'plomberie'], ['nettoyage', 'peinture', 'paysagiste']];
(async () => {
  const c = await O.ouvrir({ packs: ['climatisation'] }), p = c.p;
  for (const combo of COMBOS) {
    await O.poser(p, combo); const nom = combo.join('+');
    const d = await p.evaluate(() => ({ fam: metiersFamille(), cles: metiersClesModeles(), mods: metiersModeles().map(([k, M]) => M.nom), types: TYPES.slice(), grp3d: CATS.some(g => g[0] === GROUPE_3D) }));
    v(`${nom} : un modèle de contrat par métier distinct (${d.cles.length})`, d.mods.length === new Set(combo.map(k => ({ climatisation: 'clim', nettoyage: 'nett', '3d': 'nuis' }[k] || k))).size, JSON.stringify(d.mods));
    v(`${nom} : « Traitement du bois » et le groupe 3D seulement avec la 3D`, d.types.includes('Traitement du bois') === combo.includes('3d') && d.grp3d === combo.includes('3d'), d.types.join(', '));
    notes.push(`${nom} : famille ${d.fam} · types ${d.types.join(' / ')} · modèles ${d.mods.join(' | ')}`);
    // « Nouveau contrat » : la liste des modèles
    await p.evaluate(() => aller('contrat-nouveau')); await L.calme(p, 700); const e = await O.lire(p);
    const sel = e.champs.filter(x => x.t === 'SELECT').map(x => x.v);
    v(`${nom} : « Nouveau contrat » s'ouvre`, e.route === 'contrat-nouveau' && e.texte.length > 300, 'route=' + e.route);
    const D = await O.donnees(p), txt = e.texte + ' ¦ ' + e.champs.map(x => x.ph + '|' + x.v).join(' ¦ '), clim = combo.includes('climatisation');
    const h = [...(clim ? [] : D.trouver(txt, O.MOTS_CLIM)), ...(combo.includes('3d') ? [] : D.trouver(txt, O.MOTS_3D))].filter(x => !x.donnee);
    v(`${nom} : « Nouveau contrat » sans mot d'un métier qu'elle n'a pas`, h.length === 0, h.slice(0, 3).map(x => '…' + x.ctx + '…').join(' ¦ '));
    notes.push(`${nom} · choix du formulaire de contrat : ` + sel.map(x => x.slice(0, 160)).join(' || '));
    // « Nouvelle intervention » : titres et types proposés
    await p.evaluate(() => aller('interventions')); await L.calme(p, 600);
    const ouv = await L.toucher(c, p.locator('#contenu button').filter({ hasText: /Nouvelle intervention/ }).locator('visible=true').first()); await L.calme(p, 700); const e2 = await O.lire(p);
    const txt2 = e2.texte + ' ¦ ' + e2.champs.map(x => x.ph + '|' + x.v).join(' ¦ ');
    v(`${nom} : « Nouvelle intervention » s'ouvre`, ouv && /intervention/i.test(e2.texte), e2.texte.slice(0, 100));
    const h2 = [...(clim ? [] : D.trouver(txt2, O.MOTS_CLIM)), ...(combo.includes('3d') ? [] : D.trouver(txt2, O.MOTS_3D))].filter(x => !x.donnee);
    v(`${nom} : « Nouvelle intervention » sans mot d'un métier qu'elle n'a pas`, h2.length === 0, h2.slice(0, 3).map(x => '…' + x.ctx + '…').join(' ¦ '));
    await O.nettoyer(p);
  }
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); await L.fermer(); process.exit(O.bilan('metier-3d-multi', ok, ko, notes));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
