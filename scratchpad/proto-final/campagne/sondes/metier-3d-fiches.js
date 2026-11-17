// Campagne « métiers » : la FICHE d'une intervention (contrôles à cocher, relevés à mesurer, mot du compte rendu) et le formulaire « Nouveau contrat »
// suivent-ils le métier de l'entreprise ? Pour sept métiers, on ouvre une intervention en cours et une terminée, et le formulaire de contrat, on lit tout,
// on relève les mots de climatisation (hors métiers du froid) et de 3D (hors 3D) qui ne viennent pas d'une DONNÉE d'exemple, et on exige que les contrôles et
// les relevés affichés soient ceux de CONTROLES[métier] / RELEVES[métier]. Rend « N ✓ · M ✗ ».
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const notes = []; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const JEUX = { plomberie: 'plomb', chauffage: 'chauf', nettoyage: 'nett', electricite: 'electricite', '3d': 'nuis', climatisation: 'clim', serrurerie: 'serrurerie' };
(async () => {
  for (const [pack, cle] of Object.entries(JEUX)) {
    const c = await O.ouvrir({ packs: [pack] }), p = c.p, D = await O.donnees(p), clim = ['climatisation'].includes(pack), d3 = pack === '3d';
    // ⚠️ les fiches i1, i2… de la démonstration sont construites au CHARGEMENT, pour la climatisation (FICHES.i1.metier = 'clim') : ce sont des DONNÉES, et
    // changer le métier après coup (mchPoser) ne les refait pas. Dans l'application le métier est connu avant le premier écran ; ce qui doit le suivre, c'est la fiche
    // d'une intervention CRÉÉE ensuite : fiche() se construit à son premier regard avec le métier de l'entreprise (metiersFicheMetier). On en crée donc trois,
    // copiées sur des interventions existantes avec un titre neutre, et on éprouve CELLES-LÀ.
    const ids = await p.evaluate(() => { const base = INTS.find(i => i.st !== 'fait' && i.st !== 'annulee'), fini = INTS.find(i => i.st === 'fait');
      const mk = (b, id, st) => { INTS.push(Object.assign({}, b, { id, titre: 'Contrôle de l’installation', st })); return id; };
      return { L: [mk(base, 'zz-a', base.st), mk(base, 'zz-b', base.st)], F: [mk(fini, 'zz-c', 'fait')], avantFiche: ['zz-a', 'zz-b', 'zz-c'].some(x => !!FICHES[x]) }; });
    v(`${pack} : les trois interventions neuves n'ont pas encore de fiche (population de l'essai)`, ids.L.length === 2 && !ids.avantFiche, JSON.stringify(ids));
    for (const [lib, id] of [...ids.L.map(i => ['en cours/à venir', i]), ...ids.F.map(i => ['terminée', i])]) {
      await p.evaluate(i => aller('inter-x-' + i), id); await L.calme(p, 700); const e = await O.lire(p); const t = e.texte;
      const hits = [...(clim ? [] : D.trouver(t, O.MOTS_CLIM).map(h => ({ ...h, f: 'clim' }))), ...(d3 ? [] : D.trouver(t, O.MOTS_3D).map(h => ({ ...h, f: '3d' })))].filter(h => !h.donnee && !/Daikin (FTXM|RXM)|R32 · 2021|salle · R32|toit · R32/.test(h.ctx));   // les appareils du client (CLIENTS[…].appareils) sont des données
      v(`${pack} · fiche ${lib} (${id}) : l'écran est une fiche d'intervention`, e.route === 'inter' && t.length > 200 && !/Nouvelle intervention/.test(t.slice(0, 200)), 'route=' + e.route + ' h1=' + e.h1);
      v(`${pack} · fiche ${lib} (${id}) : aucun mot d'un autre métier hors données d'exemple`, hits.length === 0, [...new Set(hits.map(h => h.mot))].join(', ') + ' ¦ ' + hits.slice(0, 2).map(h => `[${h.f}] …${h.ctx}…`).join(' ¦ '));
      v(`${pack} · fiche ${lib} (${id}) : pas de carte « Fluide frigorigène » chez qui ne fait pas de climatisation`, clim || !/Fluide frigorigène/i.test(t), '');
      const att = await p.evaluate(m => { const R = (RELEVES[m] || []).map(x => x[0]); const C = (CONTROLES[m] || []).flatMap(g => g[1]); return { R, C }; }, await p.evaluate(() => metiersFicheMetier(INTS.find(i => i.id === location.hash.replace('#inter-x-', '')) || {})).catch(() => cle));
      if (lib !== 'terminée') { const manque = [...att.R, ...att.C].filter(x => x && !t.includes(x)); v(`${pack} · fiche ${lib} (${id}) : ses contrôles et ses relevés sont ceux du métier (${att.R.length + att.C.length} attendus)`, att.R.length + att.C.length > 0 && manque.length < (att.R.length + att.C.length), 'absents : ' + manque.slice(0, 6).join(', ')); }
      if (pack === 'plomberie' && id === ids.L[0]) notes.push('Fiche plomberie ' + id + ' : ' + t.slice(0, 520)); }
    // le formulaire « Nouveau contrat »
    await p.evaluate(() => aller('contrat-nouveau')); await L.calme(p, 700); const e2 = await O.lire(p), t2 = [e2.texte, ...e2.champs.map(x => 'CHAMP[' + x.ph + '|' + x.v + ']')].join(' ¦ ');
    const h2 = [...(clim ? [] : D.trouver(t2, O.MOTS_CLIM)), ...(d3 ? [] : D.trouver(t2, O.MOTS_3D))].filter(h => !h.donnee);
    v(`${pack} · nouveau contrat : un formulaire et aucun mot d'un autre métier hors données`, e2.route === 'contrat-nouveau' && t2.length > 300 && h2.length === 0, `route=${e2.route} ` + h2.slice(0, 3).map(h => `…${h.ctx}…`).join(' ¦ '));
    if (['plomberie', 'nettoyage', '3d'].includes(pack)) notes.push('Nouveau contrat (' + pack + ') : ' + t2.slice(0, 460));
    v(pack + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c);
  }
  await L.fermer(); process.exit(O.bilan('metier-3d-fiches', ok, ko, notes));
})().catch(async e => { console.log('ERREUR de sonde', e.stack); await L.fermer(); process.exit(2); });
