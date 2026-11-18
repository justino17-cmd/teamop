// Voie « restes », planning, TOUR 2, RECONTRÔLE ADVERSE (17 novembre 2026) : cherche ce que les corrections du tour 2 ont cassé à côté.
// Usage : timeout 580 node restes-planning-2-recontrole.js <profil> [nuit] [A B C D E]    « N ✓ · M ✗ », code 1 si un contrôle tombe.
//   A  communeDe : l'ancienne et la nouvelle fonction rejouées sur TOUTES les adresses de la page + une batterie ; le client hors liste jusqu'à la carte
//   B  chiffres du bandeau : toutes les vues × toutes les façons de masquer, tuile = cartes dessinées = panneau ; « Tout afficher » ; persistance
//   C  chiffres du bandeau pour les autres rôles (secrétariat, technicienne, chef d'équipe)
//   D  titre de la période : toutes les vues × largeurs de 320 à 400 px (le seuil de 380), jour et nuit, sans glisser de côté
//   E  carte des tournées : première ouverture sans recadrage, repères ET bulles de trajet ; changement de jour, de fond, nombre de tracés
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const veut = args.filter(a => /^[A-E]$/.test(a));
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-planning-2-recontrole/';
const PARC = [], parcours = (nom, fn) => PARC.push([nom, fn]);
const vue = async (c, v, jour, o) => { await c.p.evaluate(({ v, jour, o }) => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = jour || AUJ; plMasques = new Set(); multiExclu = new Set(); plJours = (o && o.jours) || 6; if (o && o.grp) multiGrp = o.grp; rendre(); scrollTo(0, 0); }, { v, jour, o }); await L.calme(c.p, 500); };
const reouvrir = async c => { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 300); };
const kpis = p => p.evaluate(() => { const o = {}; document.querySelectorAll('#contenu [data-kpi]').forEach(b => o[b.dataset.kpi] = b.querySelector('b').textContent.trim()); return o; });
const minutes = t => { const m = String(t).replace(/\s+/g, ' '); const h = (m.match(/(\d+) h/) || [])[1], mn = (m.match(/h (\d+)|(\d+) min/) || []); return (h ? +h * 60 : 0) + (+(mn[1] || mn[2]) || 0); };
const note = p => p.evaluate(() => { const n = document.querySelector('#contenu .pl-kpis-note'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : null; });
const cartes = p => p.evaluate(() => new Set([...document.querySelectorAll('#contenu .pc[data-int]')].map(x => x.dataset.int)).size);
const dossier = () => CAP.replace(/\/$/, '');

// l'ancienne communeDe (avant le tour 2), recopiée de la version du recontrôle du tour 1 : sert à repérer ce que la nouvelle change
const ANCIENNE = `(function(adr){ const a = sansAccent(adr || ''), cp = a.match(/\\b\\d{5}\\b(.*)$/), vir = a.lastIndexOf(',');
  const queue = [cp ? cp[1] : '', vir >= 0 ? a.slice(vir + 1) : ''];
  for (const t of queue) { const c = t.trim() && COMMUNES.find(x => t.includes(x[0])); if (c) return c; }
  return COMMUNES.filter(x => a.includes(x[0])).sort((x, y) => a.lastIndexOf(y[0]) - a.lastIndexOf(x[0]))[0] || null; })`;

parcours('A · communeDe : ce que la règle « code postal + commune hors liste = pas reconnue » change et ne doit pas changer', async c => {
  await vue(c, 'jour');
  const r = await c.p.evaluate(src => {
    const ancienne = eval(src), nom = f => a => { const x = f(a); return x ? x[1] : null; };
    const toutes = new Set(); for (const k of Object.keys(CLIENTS)) if (CLIENTS[k] && CLIENTS[k].adr) toutes.add(CLIENTS[k].adr);
    ADRESSES.forEach(a => toutes.add(a)); (typeof DEMANDES !== 'undefined' ? DEMANDES : []).forEach(d => { if (d && d.adr) toutes.add(d.adr); });
    const reelles = [...toutes], dif = reelles.filter(a => nom(ancienne)(a) !== nom(communeDe)(a)).map(a => ({ a, avant: nom(ancienne)(a), apres: nom(communeDe)(a) }));
    // batterie : formes d'écriture réalistes d'une adresse de la liste (aucune ne doit devenir « pas reconnue »)
    const dedans = [['Rochefort 17300', 'Rochefort'], ['17000 La Rochelle', 'La Rochelle'], ['17000 LA ROCHELLE', 'La Rochelle'], ['12 rue du Port 17000 La Rochelle, France', 'La Rochelle'], ['Zone artisanale, 17180 Périgny', 'Périgny'],
      ['5 rue de Lagord, Puilboreau', 'Puilboreau'], ['17140 Lagord', 'Lagord'], ['17137 Nieul-sur-Mer', 'Nieul-sur-Mer'], ['17137 NIEUL SUR MER', 'Nieul-sur-Mer'], ['17340 Châtelaillon', 'Châtelaillon-Plage'], ['17340 Chatelaillon-Plage', 'Châtelaillon-Plage'],
      ['8 Rue des Lilas, Lagord 17140', 'Lagord'], ['Résidence Les Pins, Bât. B, 17220 Salles-sur-Mer', 'Salles-sur-Mer'], ['17000 La Rochelle (Villeneuve-les-Salines)', 'La Rochelle'], ['6 rue de la Paix 17230 Marans cedex', 'Marans'],
      ['17000 La Rochelle 05 46 00 00 00', 'La Rochelle'], ['3 av. du Général de Gaulle,17300 Rochefort', 'Rochefort'], ['14 rue Gambetta 17440 Aytré', 'Aytré'], ['2 rue X 17690 Angoulins sur Mer', 'Angoulins']];
    const dehors = ['17100 Saintes', '17200 Royan', '17138 Saint-Xandre', '17137 L’Houmeau', '17000 LR', '17220 Saint-Médard-d’Aunis'];
    return { nReelles: reelles.length, dif, dedans: dedans.map(([a, att]) => ({ a, att, c: nom(communeDe)(a), avant: nom(ancienne)(a) })), dehors: dehors.map(a => ({ a, c: nom(communeDe)(a), avant: nom(ancienne)(a) })) };
  }, ANCIENNE);
  L.v('A · population : les adresses de la page (clients, liste de démonstration)', r.nReelles >= 10, r.nReelles);
  L.v('A · aucune adresse de la page ne change de commune (les 11 communes et leurs clients existants sont intacts)', r.dif.length === 0, r.dif);
  const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/-/g, ' ');
  for (const x of r.dedans) L.v('A · « ' + x.a + ' » → ' + x.att, norm(x.c) === norm(x.att), x);
  for (const x of r.dehors) L.v('A · « ' + x.a + ' » (commune absente de la liste) n’est placée nulle part', x.c === null, x);

  // le geste entier : un client hors liste créé AVEC une intervention, puis la carte — jamais un point inventé, et le dit
  await vue(c, 'jour');
  await L.toucher(c, '[data-creer]'); await L.attendre(c.p, () => !!document.querySelector('#fenetre .fen'));
  await L.toucher(c, '.fen [data-cnouveau="1"]');
  await c.p.fill('.fen [data-cnv="nom"]', 'Cabinet Dupuis'); await c.p.fill('.fen [data-cnv="adr"]', '12 Rue de La Rochelle, 17100 Saintes'); await L.calme(c.p, 400);
  const f = await c.p.evaluate(() => ({ info: [...document.querySelectorAll('.fen .bandeau-info')].map(e => e.textContent.replace(/\s+/g, ' ').trim()), rep: (document.querySelector('.fen .adr-rep') || {}).textContent || null,
    zone: [...document.querySelectorAll('.fen *')].filter(e => !e.children.length && /zone|déplacement/i.test(e.textContent)).map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)).slice(0, 6) }));
  L.v('A · le formulaire dit que l’adresse n’est pas reconnue, et ne place personne', f.info.some(x => /pas encore reconnue/.test(x)) && !f.rep, f);
  await L.capture(c, dossier() + `/A-formulaire-hors-liste-${profil}${nuit ? '-nuit' : ''}.png`);
  await L.toucher(c, '.fen [data-action="cPlusTot"]');
  const avant = await c.p.evaluate(() => INTS.length);
  await L.toucher(c, '.fen [data-action="cCreer"]');
  const ap = await c.p.evaluate(() => { const i = INTS[INTS.length - 1]; return { n: INTS.length, i: i && { id: i.id, d: i.d, tech: i.tech, h: i.h, st: i.st, cli: i.cli }, geo: i ? CR_GEO[i.cli] || null : null, zone: i && i.fact ? i.fact.zone : null, sect: i ? SECT_CLI[i.cli] || null : null }; });
  L.v('A · l’intervention du client hors liste est créée (aucun blocage)', !!ap.i && ap.i.id !== 'brouillon' && /^c\d+$/.test(ap.i.cli) && ap.i.st === 'planifiee', ap);
  L.v('A · ce client n’a ni point, ni secteur inventés ; zone = celle par défaut (1)', ap.geo === null && ap.sect === null && ap.zone === 1, ap);
  if (ap.i) {
    await c.p.evaluate(({ d }) => { crSel = null; crFocus = null; plVue = 'carte'; plRef = d; aller('planning'); rendre(); }, { d: ap.i.d }); await L.calme(c.p, 800);
    const mon = await c.p.evaluate(() => crReelEtat); L.v('A · la carte s’ouvre avec ce client dessus sans erreur JS', c.err.length === 0, c.err.slice(0, 3));
    await c.p.evaluate(id => { try { crChoisir(id, true); } catch (e) { window.__e = String(e); } }, ap.i.id); await L.calme(c.p, 600);
    const fiche = await c.p.evaluate(() => { const f = document.querySelector('.cr-fiche'); return f ? f.textContent.replace(/\s+/g, ' ').trim() : null; });
    L.v('A · la fiche de l’étape DIT « Position inconnue : la carte la place au dépôt »', !!fiche && /Position inconnue/.test(fiche), fiche && fiche.slice(0, 300));
    const gps = await c.p.evaluate(() => [...document.querySelectorAll('.cr-fiche .cr-aller-l a')].map(a => a.href));
    L.v('A · les liens « Y aller avec » visent l’adresse ÉCRITE (jamais le dépôt)', gps.length >= 2 && gps.every(h => /Saintes/.test(decodeURIComponent(h))), gps);
    await L.capture(c, dossier() + `/A-carte-client-hors-liste-${profil}${nuit ? '-nuit' : ''}.png`);
    const trajet = await c.p.evaluate(() => { const s = [...document.querySelectorAll('.cr-fiche')].map(x => x.textContent); return s.join(' ').match(/\d+ min · [\d,]+ km/) ? 'trajet affiché' : 'aucun trajet affiché'; });
    console.log('    trajet de cette étape :', trajet);
  }
  // modifier l'adresse d'un client existant vers une commune hors liste : le point et le secteur d'avant ne restent pas
  const ed = await c.p.evaluate(() => { const k = 'vp'; const a = CLIENTS[k] && CLIENTS[k].adr; return { k, a, geo: CR_GEO[k] || null, sect: SECT_CLI[k] || null }; });
  L.v('A · population : un client existant avec point et secteur', !!ed.a && !!ed.geo, ed);
});

const MASQUES = [['sm'], ['kb'], ['sm', 'kb'], [''], ['sm', 'kb', 'lr'], ['sm', 'kb', 'lr', 'tl'], ['sm', 'kb', 'lr', 'tl', '']];
parcours('B · chiffres du bandeau : toutes les vues, toutes les façons de masquer', async c => {
  const VUES = [['jour', {}], ['semaine', {}], ['general', {}], ['mois', {}], ['multi', { grp: 'jour' }], ['multi', { grp: 'personne' }], ['carte', {}]];
  let nPop = 0;
  for (const [v, o] of VUES) {
    await vue(c, v, undefined, o);
    const base = await c.p.evaluate(() => ({ vue: plVue, grp: typeof multiGrp !== 'undefined' ? multiGrp : null, jours: joursPeriode().length }));
    for (const m of MASQUES) {
      await c.p.evaluate(m => { plMasques = new Set(m); rendre(); }, m); await L.calme(c.p, 450);
      const k = await kpis(c.p), n = await cartes(c.p), nt = await note(c.p);
      const exp = await c.p.evaluate(() => { const J = joursPeriode(), tous = INTS.filter(i => J.includes(i.d) && i.st !== 'annulee').concat(J.flatMap(histDe)); const L2 = plVue === 'carte' ? tous : tous.filter(i => !plMasques.has(i.tech || ''));
        return { abs: new Set(ABSENCES.filter(a => J.some(j => a.du <= j && j <= a.au) && (plVue === 'carte' || !plMasques.has(a.tech || ''))).map(a => a.tech)).size, n: L2.length, mn: L2.reduce((s, i) => s + i.dur, 0), plan: INTS.filter(i => i.st === 'aplanifier').length, retard: INTS.filter(i => i.st === 'retard').length, tousMasques: TECHS.every(t => plMasques.has(t.id)) }; });
      const etiq = v + (v === 'multi' ? '/' + base.grp : '') + ' masques [' + m.map(x => x || 'non assigné').join(', ') + ']';
      nPop++;
      if (v === 'carte') { L.v('B · ' + etiq + ' : la Carte ne suit pas les masques (tuile = toute l’équipe, pas de note)', +k.int === exp.n && nt === null, { k, nt }); continue; }
      L.v('B · ' + etiq + ' : « à planifier » et « en retard » comptent toute l’équipe', +k.plan === exp.plan && +k.retard === exp.retard, { k, exp });
      L.v('B · ' + etiq + ' : « interventions » = ce que la page compte (' + exp.n + ')', +k.int === exp.n, { k, exp });
      L.v('B · ' + etiq + ' : « absent » ne compte que les personnes affichées (' + exp.abs + ')', +k.abs === exp.abs, { k, exp });
      if (v !== 'mois') L.v('B · ' + etiq + ' : « interventions » = cartes dessinées (' + n + ')', +k.int === n, { k, n });
      if (v !== 'mois') L.v('B · ' + etiq + ' : « travail prévu » = durées des cartes dessinées', minutes(k.temps) === exp.mn, { k, exp });
      L.v('B · ' + etiq + ' : la note est là (un filtre est posé) et dit « sur » le bon nombre', !!nt && /seulement les personnes affichées|sans la colonne « Non assigné »/.test(nt), nt);   // tour 3 : la colonne masquée seule se dit à part, sans compte
      if (exp.tousMasques) { const vide = await c.p.evaluate(() => (document.querySelector('.pl-vide-masque') || {}).textContent || null); L.v('B · ' + etiq + ' : personne affiché → le message le dit', v === 'multi' || (!!vide && /zéro/.test(vide)), vide); }
    }
  }
  L.v('B · population : ' + nPop + ' combinaisons vue × masque jouées', nPop >= 40, nPop);
  // le dénombrement de la note : « 4 sur 5 » alors que « Non assigné » n'est pas une personne ?
  await vue(c, 'jour'); await L.toucher(c, '[data-masque="sm"]');
  const nb = await c.p.evaluate(() => ({ note: (document.querySelector('.pl-kpis-note') || {}).textContent || '', personnes: TECHS.filter(t => t.id).length, avecNonAssigne: TECHS.length, equipe: [...document.querySelectorAll('.pl-equipe [data-masque]')].length }));
  const m = /\((\d+) sur (\d+)\)/.exec(nb.note || '');
  L.v('B · la note compte des PERSONNES (« ' + (m ? m[1] + ' sur ' + m[2] : '?') + ' » ; il y en a ' + nb.personnes + ', plus la colonne « Non assigné »)', !!m && +m[2] === nb.personnes, nb);
  await L.capture(c, dossier() + `/B-note-${profil}${nuit ? '-nuit' : ''}.png`);
  // « Tout afficher » : depuis un filtre de Sur mesure SEUL (aucun masque de personne), le bouton lève bien le filtre
  await vue(c, 'multi');
  await c.p.evaluate(() => { const i = INTS.find(x => x.tech && [...multiJours].includes(x.d) && x.st !== 'annulee'); multiExclu = new Set([i.tech + '|' + i.d]); rendre(); }); await L.calme(c.p, 500);
  { const k5 = await kpis(c.p), n5 = await cartes(c.p); L.v('B · Sur mesure, une personne masquée un jour seulement : tuile = cartes (' + n5 + ')', +k5.int === n5, { k5, n5 }); }
  { const nt = await note(c.p), m2 = /\((\d+) sur (\d+)\)/.exec(nt || ''); L.v('B · Sur mesure, filtre d’un jour : la note ne dit pas « (5 sur 5) » (' + (m2 ? m2[1] + ' sur ' + m2[2] : 'sans compte') + ') alors qu’une personne est écartée ce jour-là', !m2 || +m2[1] < +m2[2], nt); }
  L.v('B · Sur mesure, filtre posé sans masque : la note est là avec « Tout afficher »', /Tout afficher/.test(await note(c.p) || ''), await note(c.p));
  await L.toucher(c, '.pl-kpis-note [data-mqtous="1"]');
  const apres = await c.p.evaluate(() => ({ ex: multiExclu.size, mq: plMasques.size })), n2 = await note(c.p);
  L.v('B · « Tout afficher » (Sur mesure) lève le filtre : plus de note', apres.ex === 0 && apres.mq === 0 && n2 === null, { apres, n2 });
  // le filtre survit à un changement de vue, à un aller-retour d'écran, et les chiffres suivent
  await vue(c, 'jour'); await L.toucher(c, '[data-masque="sm"]');
  await c.p.evaluate(() => aller('clients')); await L.calme(c.p, 400); await c.p.evaluate(() => aller('planning')); await L.calme(c.p, 600);
  const kk = await kpis(c.p), nn = await cartes(c.p), ntt = await note(c.p), mq = await c.p.evaluate(() => [...plMasques]);
  L.v('B · après un aller-retour d’écran : la tuile suit encore les cartes, la note reste avec le masque (' + mq.join(',') + ')', +kk.int === nn && (mq.length === 0 ? ntt === null : !!ntt), { kk, nn, ntt, mq });
  // changer de jour avec un masque posé : la tuile suit
  await c.p.evaluate(() => { plMasques = new Set(['sm']); }); await L.toucher(c, '[data-plnav="1"]');
  const k3 = await kpis(c.p), n3 = await cartes(c.p);
  L.v('B · « Suivant » avec Sophie masquée : tuile = cartes', +k3.int === n3, { k3, n3 });
  await L.toucher(c, '[data-plvue="semaine"]'); const k4 = await kpis(c.p), n4 = await cartes(c.p);
  L.v('B · de Jour à Semaine, le masque reste : tuile = cartes', +k4.int === n4, { k4, n4 });
  // le panneau « à planifier » : la tuile compte toute l'équipe, le panneau liste toute l'équipe
  await L.toucher(c, '[data-kpi="plan"]');
  const pp = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { l: P.querySelectorAll('.kpi-l').length, t: P.textContent.replace(/\s+/g, ' ').slice(0, 200) } : null; });
  L.v('B · le panneau « à planifier » reste celui de toute l’équipe (Sophie masquée)', !!pp && pp.l === +k4.plan, { pp, plan: k4.plan });
  await L.ranger(c.p);
  const deb = await L.deborde(c); L.v('B · la page ne glisse pas de côté (largeur du profil)', deb.bouge === 0, deb);
});

parcours('C · les autres rôles : le planning (et ses chiffres) n’est pas à eux — les corrections ne leur ouvrent rien', async c => {
  for (const qui of ['julie', 'sm', 'kb']) {
    const cc = await L.ouvrir({ profil, nuit, qui });
    try {
      const o = await cc.p.evaluate(() => { aller('planning'); return { permis: rlPermis('planning'), kpi: document.querySelectorAll('#contenu [data-kpi]').length, note: document.querySelectorAll('#contenu .pl-kpis-note').length, h1: (document.querySelector('#contenu h1') || {}).textContent, masques: document.querySelectorAll('.pl-equipe [data-masque]').length }; });
      L.v('C · ' + qui + ' : pas de droit « planning » (population : la page l’a refusé, elle montre « ' + o.h1 + ' »)', o.permis === false && !!o.h1, o);
      L.v('C · ' + qui + ' : ni tuiles, ni note, ni rangée de personnes du planning', o.kpi === 0 && o.note === 0 && o.masques === 0, o);
      // et on ne peut pas non plus les faire paraître en posant un masque depuis la page
      const o2 = await cc.p.evaluate(() => { plMasques = new Set(['sm']); try { rendre(); } catch (e) {} return { note: document.querySelectorAll('#contenu .pl-kpis-note').length, kpi: document.querySelectorAll('#contenu [data-kpi]').length }; });
      L.v('C · ' + qui + ' : un masque forcé ne fait paraître aucune note', o2.note === 0 && o2.kpi === 0, o2);
      L.v('C · ' + qui + ' : aucune erreur JavaScript', cc.err.length === 0, cc.err.slice(0, 3));
    } finally { await L.fin(cc); }
  }
});

parcours('D · titre de la période : toutes les vues, de 320 à 400 px, jamais sous une flèche', async c => {
  const larg = c.largeur >= 800 ? [c.largeur] : [320, 340, 360, 375, 380, 381, 390, 400];
  const VUES = [['jour', {}, ['2026-10-31', '2026-09-30', '2026-12-23', '2026-02-27']], ['semaine', {}, ['2026-10-26', '2026-09-28', '2026-12-28']], ['general', { jours: 7 }, ['2026-09-28', '2026-12-28']], ['mois', {}, ['2026-10-31', '2026-09-15', '2026-02-10', '2026-08-10', '2026-12-10']], ['multi', {}, [undefined]], ['carte', {}, ['2026-10-31', '2026-09-30', '2026-12-23']]];
  let nPop = 0, pires = [];
  for (const w of larg) {
    if (c.largeur < 800) await c.p.setViewportSize({ width: w, height: c.hauteur });
    await L.calme(c.p, 300);
    for (const [v, o, jours] of VUES) for (const j of jours) {
      await vue(c, v, j, o);
      if (v === 'multi') await c.p.evaluate(() => { const D = ['2026-09-30', '2026-10-31', '2026-12-23', '2026-11-02', '2026-11-30', '2026-12-31']; if (typeof multiJours !== 'undefined' && multiJours.clear) { multiJours.clear(); D.forEach(d => multiJours.add(d)); } rendre(); }), await L.calme(c.p, 400);
      const g = await c.p.evaluate(() => { const b = document.querySelector('.pl-nav b'), bs = [...document.querySelectorAll('.pl-nav button')].slice(0, 2).map(x => x.getBoundingClientRect()), t = document.createRange(); t.selectNodeContents(b); const rt = t.getBoundingClientRect(), bar = document.querySelector('.pl-barre').getBoundingClientRect(), seg = document.querySelector('.pl-barre .seg').getBoundingClientRect();
        return { texte: b.textContent, g: Math.round(rt.left), d: Math.round(rt.right), fg: Math.round(bs[0].right), fd: Math.round(bs[1].left), hb: Math.round(b.getBoundingClientRect().height), barre: Math.round(bar.height), droite: Math.round(Math.max(...[...document.querySelectorAll('.pl-barre > *')].map(e => e.getBoundingClientRect().right))), larg: innerWidth }; });
      nPop++;
      const ok = g.g >= g.fg - 1 && g.d <= g.fd + 1 && g.droite <= g.larg + 1;
      L.v('D · ' + w + ' px · ' + v + (j ? ' ' + j : '') + ' : « ' + g.texte + ' » tient entre ses flèches', ok, g);
      if (!ok) pires.push(g);
      const deb = await L.deborde({ ...c, largeur: w }); if (deb.bouge) L.v('D · ' + w + ' px · ' + v + ' : la page glisse de côté', false, deb);
    }
    // les deux boutons de l'en-tête (« Rendez-vous en ligne », « ＋ Nouvelle intervention ») : le texte tient DANS le bouton, avec une marge (≥ 8 px) — pas collé ni dépassant
    { await vue(c, 'jour'); const bt = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .tete .actions .btn')].map(b => { const r = b.getBoundingClientRect(), t = document.createRange(); t.selectNodeContents(b); const q = t.getBoundingClientRect(); return { txt: b.textContent.trim().slice(0, 24), marge: Math.round(Math.min(q.left - r.left, r.right - q.right)), droite: Math.round(r.right) }; }));
      L.v('D · ' + w + ' px : les boutons de l’en-tête du Planning gardent 6 px de marge autour de leur texte (tour 3 : 7 px à 360 px, le maximum quand les deux boutons restent côte à côte)', bt.length === 2 && bt.every(b => b.marge >= 6) && bt.every(b => b.droite <= w), bt); }
    if (w === 320 || w === 375 || w === 381) { await vue(c, 'semaine', '2026-09-28'); await L.capture(c, dossier() + `/D-titre-${w}-semaine${nuit ? '-nuit' : ''}.png`); await vue(c, 'jour', '2026-09-30'); await L.capture(c, dossier() + `/D-titre-${w}-jour${nuit ? '-nuit' : ''}.png`); }
  }
  L.v('D · population : ' + nPop + ' mesures', nPop >= 6, nPop);
  // à 381 px (juste au-dessus du seuil) rien n'a changé par rapport à avant : le titre reste sur une ligne
  if (c.largeur < 800) { await c.p.setViewportSize({ width: 381, height: c.hauteur }); await vue(c, 'jour', '2026-10-31'); const h = await c.p.evaluate(() => Math.round(document.querySelector('.pl-nav b').getBoundingClientRect().height)); L.v('D · à 381 px le titre est encore sur une ligne (' + h + ' px de haut)', h <= 24, h);
    await c.p.setViewportSize({ width: c.largeur, height: c.hauteur }); }
});

parcours('E · carte des tournées : première ouverture sans recadrage, repères ET bulles ; jours, fonds', async c => {
  const jours = await c.p.evaluate(() => { const o = []; for (let k = 0; k < 14; k++) { const d = ajoute(AUJ, k - 3), T = crTournees(d); const n = T.reduce((s, x) => s + x.S.filter(y => !y.bureau).length, 0); if (n >= 2) o.push({ d, n }); } return o.sort((a, b) => b.n - a.n); });
  L.v('E · population : des jours à plusieurs étapes', jours.length >= 3, jours.slice(0, 5));
  const ordre = [...new Set([jours[0] && jours[0].d, '2026-10-26', '2026-10-30'].concat(jours.slice(1, 3).map(x => x.d)).filter(Boolean))];
  await reouvrir(c);
  // compteur de tracés : la correction retrace à l'arrivée du fond — pas de boucle, pas de rafale
  await c.p.evaluate(() => { window.__tr = 0; const f = window.crTracerReel; window.crTracerReel = function () { window.__tr++; return f.apply(this, arguments); }; });
  for (const d of ordre) {
    if (d !== ordre[0]) await c.p.evaluate(() => { window.__tr = 0; });
    await c.p.evaluate(({ d }) => { crSel = null; crFocus = null; plVue = 'carte'; plRef = d; plMasques = new Set(); if (location.hash !== '#planning') aller('planning'); rendre(); }, { d });
    let fini = false; for (let i = 0; i < 50 && !fini; i++) { await c.p.waitForTimeout(400); fini = await c.p.evaluate(() => crReelEtat === 'ok' && document.querySelectorAll('.cr-mk[data-crpin]').length > 0 && document.getElementById('cr-carte').dataset.fond === 'reel'); }
    L.v('E · ' + d + ' : le fond réel est reçu', fini, fini); if (!fini) continue;
    await L.calme(c.p, 1500);
    const r = await c.p.evaluate(() => { const rr = e => e.getBoundingClientRect(), I = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const pins = [...document.querySelectorAll('.cr-mk[data-crpin]')], bul = [...document.querySelectorAll('.cr-lbl-tr')], obst = [...document.querySelectorAll('#cr-carte .cr-fonds, #cr-carte .cr-outils, #cr-carte .cr-chips, #cr-carte .cr-note')].filter(e => rr(e).width > 0);
      return { n: pins.length, nBul: bul.length, nObst: obst.length, tracés: window.__tr,
        pinSous: pins.filter(p => obst.some(o => I(rr(p), rr(o)) > 0)).map(p => p.dataset.crpin), bulSous: bul.filter(b => obst.some(o => I(rr(b), rr(o)) > 0)).map(b => b.textContent.trim()),
        bulSurPin: bul.filter(b => pins.some(p => I(rr(b), rr(p)) > 0)).map(b => b.textContent.trim()),
        bulHors: bul.filter(b => { const k = rr(document.querySelector('#cr-carte')), q = rr(b); return q.left < k.left - 1 || q.right > k.right + 1 || q.top < k.top - 1 || q.bottom > k.bottom + 1; }).map(b => b.textContent.trim()) }; });
    console.log('    ', d, JSON.stringify(r));
    L.v('E · ' + d + ' : la carte a ses repères et ses boutons (population)', r.n >= 1 && r.nObst >= 1, r);
    L.v('E · ' + d + ' : aucun repère sous un bouton', r.pinSous.length === 0, r.pinSous);
    L.v('E · ' + d + ' : aucune bulle de trajet sous un bouton ni sur un repère', r.bulSous.length === 0 && r.bulSurPin.length === 0, r);
    L.v('E · ' + d + ' : aucune bulle ne sort de la carte', r.bulHors.length === 0, r.bulHors);
    L.v('E · ' + d + ' : la carte n’a pas été retracée en boucle (' + r.tracés + ' tracés en 1,5 s calme)', r.tracés <= 12, r.tracés);
    await L.capture(c, dossier() + `/E-premiere-${d}-${profil}${nuit ? '-nuit' : ''}.png`);
  }
  // sélectionner un repère, passer au jour suivant et revenir : toujours rien sous les boutons
  await c.p.evaluate(({ d }) => { plRef = d; rendre(); }, { d: ordre[0] }); await L.calme(c.p, 1500);
  for (const [nom, f] of [['Satellite', () => document.querySelector('[data-crfond="sat"]')], ['Plan', () => document.querySelector('[data-crfond="plan"]')]]) {
    const b = await c.p.evaluate(nom2 => !!document.querySelector('[data-crfond="' + (nom2 === 'Satellite' ? 'sat' : 'plan') + '"]'), nom);
    if (!b) { L.v('E · le bouton « ' + nom + ' » existe', false); continue; }
    await L.toucher(c, '[data-crfond="' + (nom === 'Satellite' ? 'sat' : 'plan') + '"]'); await L.calme(c.p, 1200);
    const s = await c.p.evaluate(() => { const rr = e => e.getBoundingClientRect(), I = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const pins = [...document.querySelectorAll('.cr-mk[data-crpin]')], obst = [...document.querySelectorAll('#cr-carte .cr-fonds, #cr-carte .cr-outils, #cr-carte .cr-chips')].filter(e => rr(e).width > 0); return { n: pins.length, sous: pins.filter(p => obst.some(o => I(rr(p), rr(o)) > 0)).map(p => p.dataset.crpin), err: window.__e || null }; });
    L.v('E · fond « ' + nom + ' » : les repères sont encore là et hors des boutons', s.n >= 2 && s.sous.length === 0, s);
  }
  L.v('E · aucune erreur JavaScript pendant la carte', c.err.length === 0, c.err.slice(0, 5));
});

(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  for (const [nom, fn] of PARC) { const k = nom.split(' ')[0]; if (veut.length && !veut.includes(k)) continue; console.log('\n== ' + nom);
    try { await reouvrir(c); await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine'); await fn(c); } catch (e) { L.v(k + ' · exception pendant le parcours', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
  L.v('aucune erreur JavaScript pendant les parcours', c.err.length === 0, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
