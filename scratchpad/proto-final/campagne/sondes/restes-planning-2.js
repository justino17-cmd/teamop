// Voie « restes », planning, TOUR 2 (17 novembre 2026) : rejoue ce que le recontrôle du tour 1 a laissé ouvert, et ce que le chef de chantier a décidé.
// Usage : timeout 580 node restes-planning-2.js <profil> [nuit] [S1 S2 S3]    « N ✓ · M ✗ », code 1 si un contrôle tombe.
//   S1  adresse dont le code postal désigne une commune HORS de la liste : « adresse pas encore reconnue », jamais la commune de la rue
//   S2  décision (k) du chef : les chiffres du bandeau suivent les personnes affichées, et le disent quand un filtre est posé
//   S3  carte des tournées, TOUTE PREMIÈRE ouverture de la session, SANS recadrage : aucun repère sous les boutons de la carte
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const veut = args.filter(a => /^S\d+$/.test(a));
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-planning-2/';
const PARC = [];
const parcours = (nom, fn) => PARC.push([nom, fn]);
const vue = async (c, v, jour) => { await c.p.evaluate(({ v, jour }) => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = jour || AUJ; plMasques = new Set(); multiExclu = new Set(); plJours = 6; rendre(); scrollTo(0, 0); }, { v, jour }); await L.calme(c.p, 500); };
const reouvrir = async c => { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 300); };
const kpis = p => p.evaluate(() => { const o = {}; document.querySelectorAll('#contenu [data-kpi]').forEach(b => o[b.dataset.kpi] = b.querySelector('b').textContent.trim()); return o; });
const minutes = t => { const m = String(t).replace(/\s+/g, ' '); const h = (m.match(/(\d+) h/) || [])[1], mn = (m.match(/h (\d+)|(\d+) min/) || []); return (h ? +h * 60 : 0) + (+(mn[1] || mn[2]) || 0); };
const note = p => p.evaluate(() => { const n = document.querySelector('#contenu .pl-kpis-note'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : null; });
const cartes = p => p.evaluate(() => new Set([...document.querySelectorAll('#contenu .pc[data-int]')].map(x => x.dataset.int)).size);

parcours('S1 · une adresse dont le code postal désigne une commune hors liste n’est pas posée à la commune de sa rue', async c => {
  const t = await c.p.evaluate(() => {
    const hors = ['12 Rue de La Rochelle, 17100 Saintes', '5 route de Rochefort, 17400 Saint-Jean-d\'Angély', '8 Avenue de Marans, 17200 Royan', '1 rue de Lagord 17300 Pont-l’Abbé', '3 chemin de Rochefort, 33000 Bordeaux'];
    const bonnes = [['12 Route de La Rochelle, 17300 Rochefort', 'Rochefort'], ['3 Rue de Rochefort, 17230 Marans', 'Marans'], ['12 Route de La Rochelle Rochefort', 'Rochefort'], ['4 Avenue de Rochefort 17000 La Rochelle', 'La Rochelle'],
      ['8 Rue des Lilas, 17140 Lagord', 'Lagord'], ['3 Avenue de la Plage, 17340 CHÂTELAILLON-PLAGE', 'Châtelaillon-Plage'], ['2 impasse du Port, Nieul-sur-Mer', 'Nieul-Sur-Mer'], ['20 rue Saint-Jean du Pérot, 17000 La Rochelle cedex', 'La Rochelle'], ['12 rue de la Gare, 17220 Salles-sur-Mer, France', 'Salles-sur-Mer']];
    return { hors: hors.map(a => ({ a, c: (communeDe(a) || [])[1] || null, g: geoDeAdresse(a), r: reconnaitre(a) })), bonnes: bonnes.map(([a, att]) => ({ a, att, c: (communeDe(a) || [])[1] || null })) };
  });
  L.v('S1 · population : cinq adresses hors liste et neuf adresses de la liste', t.hors.length === 5 && t.bonnes.length === 9, [t.hors.length, t.bonnes.length]);
  for (const r of t.hors) L.v('S1 · « ' + r.a + ' » : adresse pas reconnue (ni commune, ni point, ni zone inventés)', r.c === null && r.g === null && r.r === null, r);
  for (const r of t.bonnes) L.v('S1 · « ' + r.a + ' » → ' + r.att + ' (inchangé)', r.c !== null && r.c.toLowerCase().replace(/-/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, '') === r.att.toLowerCase().replace(/-/g, ' ').normalize('NFD').replace(/[̀-ͯ]/g, ''), r);
  // et à l'écran : le formulaire d'un client créé à la main le dit, en clair, au lieu de « Repérée : La Rochelle · 0 km »
  await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine');
  await L.toucher(c, '[data-creer]'); await L.attendre(c.p, () => !!document.querySelector('#fenetre .fen'));
  await L.toucher(c, '.fen [data-cnouveau="1"]');
  await c.p.fill('.fen [data-cnv="adr"]', '12 Rue de La Rochelle, 17100 Saintes'); await L.calme(c.p, 400);
  const txt = await c.p.evaluate(() => ({ rep: (document.querySelector('.fen .adr-rep') || {}).textContent || null, info: [...document.querySelectorAll('.fen .bandeau-info')].map(e => e.textContent.trim()) }));
  L.v('S1 · le formulaire dit « Adresse pas encore reconnue » et ne dit pas « Repérée »', !txt.rep && txt.info.some(x => /Adresse pas encore reconnue/.test(x)), txt);
  await L.capture(c, CAP + `S1-formulaire-${profil}${nuit ? '-nuit' : ''}.png`);
  await c.p.fill('.fen [data-cnv="adr"]', '12 Route de La Rochelle, 17300 Rochefort'); await L.calme(c.p, 400);
  const bon = await c.p.evaluate(() => (document.querySelector('.fen .adr-rep') || {}).textContent || null);
  L.v('S1 · une adresse de la liste est toujours « Repérée : Rochefort »', /Repérée\s*:\s*Rochefort/.test(bon || ''), bon);
});

parcours('S2 · décision (k) : les chiffres du bandeau suivent les personnes affichées et le disent', async c => {
  await vue(c, 'jour');
  const k0 = await kpis(c.p), n0 = await cartes(c.p), nt0 = await note(c.p);
  L.v('S2 · population : la vue Jour montre des interventions', n0 >= 3, { n0, k0 });
  L.v('S2 · personne n’est masqué : aucune note, rien à dire', nt0 === null, nt0);
  L.v('S2 · personne n’est masqué : « interventions » = cartes dessinées', +k0.int === n0, { kpi: k0.int, cartes: n0 });
  const glob = await c.p.evaluate(() => ({ plan: INTS.filter(i => i.st === 'aplanifier').length, retard: INTS.filter(i => i.st === 'retard').length, tech: TECHS.length }));
  // une personne masquée
  await L.toucher(c, '[data-masque="sm"]');
  const k1 = await kpis(c.p), n1 = await cartes(c.p), nt1 = await note(c.p);
  const attendu1 = await c.p.evaluate(() => { const J = joursPeriode(); const l = INTS.filter(i => J.includes(i.d) && i.st !== 'annulee' && i.tech !== 'sm').concat(J.flatMap(histDe).filter(i => i.tech !== 'sm')); return { n: l.length, mn: l.reduce((s, i) => s + i.dur, 0) }; });
  L.v('S2 · Sophie masquée : « interventions » suit les cartes affichées', +k1.int === n1 && n1 < n0, { kpi: k1.int, cartes: n1, avant: n0 });
  L.v('S2 · Sophie masquée : « de travail prévu » = les durées des personnes affichées', minutes(k1.temps) === attendu1.mn && attendu1.mn > 0, { kpi: k1.temps, attendu: attendu1 });
  L.v('S2 · Sophie masquée : « à planifier » et « en retard » comptent toute l’équipe', +k1.plan === glob.plan && +k1.retard === glob.retard, { k1, glob });
  // tour 3 (17/11) : « N sur M » ne compte que des PERSONNES, la colonne « Non assigné » (id vide) n'en est pas une — glob.tech compte les colonnes
  L.v('S2 · la note le DIT : seulement les personnes affichées, ' + (glob.tech - 2) + ' sur ' + (glob.tech - 1), !!nt1 && /seulement les personnes affichées/.test(nt1) && new RegExp('\\(' + (glob.tech - 2) + ' sur ' + (glob.tech - 1) + '\\)').test(nt1), nt1);
  L.v('S2 · la note dit ce qui reste global (« à planifier », « en retard ») et propose « Tout afficher »', /à planifier/i.test(nt1 || '') && /en retard/.test(nt1 || '') && /Tout afficher/.test(nt1 || ''), nt1);
  // le panneau que la tuile ouvre = même population, et il le dit
  await L.toucher(c, '[data-kpi="int"]');
  const p1 = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { lignes: P.querySelectorAll('.ligne-clic').length, dit: /seulement les personnes affichées/i.test(P.textContent), sophie: [...P.querySelectorAll('.ligne-clic span.gris')].filter(e => /Sophie/.test(e.textContent)).length } : null; });
  L.v('S2 · le panneau « interventions » liste autant de lignes que le chiffre, aucune de Sophie, et dit « seulement les personnes affichées »', !!p1 && p1.lignes === +k1.int && p1.sophie === 0 && p1.dit, { p1, kpi: k1.int });
  await L.ranger(c.p);
  await L.toucher(c, '[data-kpi="temps"]');
  const p2 = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); if (!P) return null; const tot = [...P.querySelectorAll('.ligne b')].pop(); return { noms: [...P.querySelectorAll('[data-kseul]')].map(b => b.dataset.kseul), total: tot ? tot.textContent : null, texte: P.textContent.replace(/\s+/g, ' ').slice(0, 260) }; });
  L.v('S2 · le panneau « travail prévu » ne liste pas Sophie et son total est celui de la tuile', !!p2 && !p2.noms.includes('sm') && p2.noms.length === glob.tech - 1 && minutes(p2.total) === attendu1.mn, { p2, kpi: k1.temps });
  L.v('S2 · ce panneau ne dit plus « toutes personnes confondues » quand un filtre est posé', !!p2 && !/toutes personnes confondues/.test(p2.texte) && /personnes affichées/.test(p2.texte), p2 && p2.texte);
  await L.ranger(c.p);
  await L.capture(c, CAP + `S2-jour-sophie-masquee-${profil}${nuit ? '-nuit' : ''}.png`);
  // « Tout afficher » lève le filtre : plus de note, les chiffres d'avant
  await L.toucher(c, '.pl-kpis-note [data-mqtous="1"]');
  const k2 = await kpis(c.p), nt2 = await note(c.p), m2 = await c.p.evaluate(() => plMasques.size);
  L.v('S2 · « Tout afficher » : plus de note, plus de masque, les chiffres d’avant', nt2 === null && m2 === 0 && +k2.int === n0 && k2.temps === k0.temps, { nt2, m2, k2, k0 });
  // les absents suivent aussi : une absence d'une personne masquée ne compte plus
  const ab = await c.p.evaluate(() => { const a = ABSENCES.find(x => x.tech && x.du >= AUJ) || ABSENCES.find(x => x.tech); return a ? { tech: a.tech, jour: a.du < AUJ ? AUJ : a.du, du: a.du, au: a.au } : null; });
  L.v('S2 · population : une absence à rejouer', !!ab, ab);
  if (ab) {
    await vue(c, 'jour', ab.jour < ab.du ? ab.du : (ab.jour > ab.au ? ab.au : ab.jour));
    const avant = await kpis(c.p), dsr = await c.p.evaluate(() => joursPeriode()[0]);
    const compte = masq => c.p.evaluate(m => { const J = joursPeriode(); return new Set(ABSENCES.filter(a => J.some(j => a.du <= j && j <= a.au) && !m.includes(a.tech)).map(a => a.tech)).size; }, masq);
    L.v('S2 · le jour de l’absence, « absent » = ' + await compte([]) + ' (population non vide)', +avant.abs === await compte([]) && +avant.abs >= 1, { avant, dsr });
    await c.p.evaluate(t => { plMasques = new Set([t]); rendre(); }, ab.tech); await L.calme(c.p, 400);
    const apres = await kpis(c.p);
    L.v('S2 · la personne absente est masquée : « absent » ne la compte plus', +apres.abs === await compte([ab.tech]) && +apres.abs < +avant.abs, { avant: avant.abs, apres: apres.abs });
    await L.toucher(c, '[data-kpi="abs"]');
    const pa = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { lignes: P.querySelectorAll('[data-kabs]').length, dit: /seulement les personnes affichées/i.test(P.textContent), vide: /Personne n’est absent/.test(P.textContent) } : null; });
    L.v('S2 · le panneau « absent » liste autant de lignes que le chiffre (' + apres.abs + ') et dit « seulement les personnes affichées »', !!pa && pa.lignes === +apres.abs && pa.dit && (+apres.abs > 0 || pa.vide), pa);
    await L.ranger(c.p);
    // le même panneau SANS filtre liste bien la personne absente (la population n'est pas vide : la ligne ci-dessus ne compare pas 0 à 0)
    await c.p.evaluate(() => { plMasques = new Set(); rendre(); }); await L.calme(c.p, 400); await L.toucher(c, '[data-kpi="abs"]');
    const pb = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? { lignes: P.querySelectorAll('[data-kabs]').length, dit: /seulement les personnes affichées/i.test(P.textContent) } : null; });
    L.v('S2 · sans filtre, le panneau « absent » liste la personne et ne dit rien de filtre', !!pb && pb.lignes === +avant.abs && pb.lignes >= 1 && !pb.dit, pb);
    await L.ranger(c.p);
  }
  // personne n'est affiché : zéros, et le message ne ment plus (« les chiffres comptent toute l'équipe »)
  await vue(c, 'jour'); await c.p.evaluate(() => { plMasques = new Set(TECHS.map(t => t.id)); rendre(); }); await L.calme(c.p, 400);
  const k3 = await kpis(c.p), vide = await c.p.evaluate(() => (document.querySelector('.pl-vide-masque') || {}).textContent || null);
  L.v('S2 · personne affiché : « interventions » à 0 et « absent » à 0', +k3.int === 0 && +k3.abs === 0, k3);
  L.v('S2 · personne affiché : le message dit que ces chiffres sont à zéro, pas qu’ils comptent toute l’équipe', !!vide && !/comptent toute l.équipe/.test(vide) && /zéro/.test(vide), vide);
  // Sur mesure : une personne masquée UN JOUR seulement ne compte pas ce jour-là, et la note apparaît même sans masque de personne
  await vue(c, 'multi');
  const sm = await c.p.evaluate(() => { const J = [...multiJours].sort(); return { J, d: J[0] }; });
  const kA = await kpis(c.p), nA = await cartes(c.p), ntA = await note(c.p);
  L.v('S2 · Sur mesure sans filtre : aucune note, « interventions » = cartes', ntA === null && +kA.int === nA, { ntA, kA, nA });
  await c.p.evaluate(d => { const i = INTS.find(x => x.tech && [...multiJours].includes(x.d) && x.st !== 'annulee'); multiExclu = new Set([i.tech + '|' + i.d]); rendre(); }, sm.d); await L.calme(c.p, 500);
  const kB = await kpis(c.p), nB = await cartes(c.p), ntB = await note(c.p);
  L.v('S2 · Sur mesure, une personne masquée un jour : « interventions » = cartes affichées (' + nB + ' < ' + nA + ')', +kB.int === nB && nB < nA, { kB, nB, nA });
  L.v('S2 · Sur mesure, une personne masquée un jour : la note le dit (tour 3 : elle la NOMME, avec le jour)', !!ntB && /sans Sophie le /.test(ntB), ntB);
  // la Carte a sa propre rangée de personnes : ni note ni masques
  await c.p.evaluate(() => { plMasques = new Set(['sm']); }); await vue(c, 'carte'); await c.p.evaluate(() => { plMasques = new Set(['sm']); rendre(); }); await L.calme(c.p, 600);
  L.v('S2 · la Carte ne montre pas la note (elle ne suit pas ces masques)', (await note(c.p)) === null, await note(c.p));
  // la note ne fait pas déborder la page, et ses boutons sont des cibles de 44 px
  await vue(c, 'jour'); await L.toucher(c, '[data-masque="sm"]');
  const geo = await c.p.evaluate(() => { const n = document.querySelector('.pl-kpis-note'), b = n && n.querySelector('.lien'), r = n && n.getBoundingClientRect(), rb = b && b.getBoundingClientRect(); return n ? { x: Math.round(r.left), droite: Math.round(r.right), larg: innerWidth, bouton: Math.round(rb.height) } : null; });
  L.v('S2 · la note tient dans l’écran et son bouton fait au moins 44 px au doigt', !!geo && geo.droite <= geo.larg + 1 && geo.x >= 0 && (!c.doigt || geo.bouton >= 44), geo);
  // le titre de la période (« Aujourd'hui · samedi 31 octobre ») tient entre ses deux flèches : ni coupé, ni posé sous une flèche (à 320 px il passait sous la flèche de droite)
  const nav = await c.p.evaluate(() => { const b = document.querySelector('.pl-nav b'), bs = [...document.querySelectorAll('.pl-nav button')].slice(0, 2).map(x => x.getBoundingClientRect()), r = b.getBoundingClientRect(), t = document.createRange(); t.selectNodeContents(b); const rt = t.getBoundingClientRect();
    return { texte: b.textContent, gauche: Math.round(rt.left), droite: Math.round(rt.right), flecheG: Math.round(bs[0].right), flecheD: Math.round(bs[1].left), haut: Math.round(r.height) }; });
  L.v('S2 · le titre de la période tient entre les deux flèches (texte ' + nav.gauche + '→' + nav.droite + ', flèches ' + nav.flecheG + '/' + nav.flecheD + ')', nav.gauche >= nav.flecheG - 1 && nav.droite <= nav.flecheD + 1, nav);
  const deb = await L.deborde(c); L.v('S2 · la page ne déborde pas de côté avec la note (mesuré contre la largeur du profil)', deb.bouge === 0, deb);
  await L.capture(c, CAP + `S2-note-${profil}${nuit ? '-nuit' : ''}.png`);
});

parcours('S3 · carte des tournées, toute première ouverture, sans recadrage : aucun repère sous les boutons', async c => {
  // la casse du recontrôle : tracés avant l'arrivée de la première tuile, les repères ne voyaient pas les boutons « Plan · Satellite / Auto · Jour · Nuit » (display:none)
  const jours = await c.p.evaluate(() => { const o = []; for (let k = 0; k < 14; k++) { const d = ajoute(AUJ, k - 3), T = crTournees(d); const n = T.reduce((s, x) => s + x.S.filter(y => !y.bureau).length, 0); if (n >= 2) o.push({ d, n }); } return o.sort((a, b) => b.n - a.n); });
  L.v('S3 · population : des jours à plusieurs étapes', jours.length >= 2, jours.slice(0, 4));
  const essais = [...new Set([jours[0] && jours[0].d, '2026-10-26'].filter(Boolean))];
  for (const d of essais) {
    await reouvrir(c);
    await c.p.evaluate(({ d }) => { crSel = null; crFocus = null; crLV = null; if (location.hash !== '#planning') aller('planning'); plVue = 'carte'; plRef = d; plMasques = new Set(); rendre(); }, { d });
    let fini = false; for (let i = 0; i < 50 && !fini; i++) { await c.p.waitForTimeout(500); fini = await c.p.evaluate(() => crReelEtat === 'ok' && document.querySelectorAll('.cr-mk[data-crpin]').length > 0 && document.getElementById('cr-carte').dataset.fond === 'reel'); }
    L.v('S3 · ' + d + ' : la vraie carte est montée (fond réel reçu)', fini, fini);
    if (!fini) continue;
    await L.calme(c.p, 1500);   // SANS crCadrerReel : c'est ce que fait une vraie personne qui ouvre la carte
    const r = await c.p.evaluate(() => { const rr = e => e.getBoundingClientRect(), I = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
      const pins = [...document.querySelectorAll('.cr-mk[data-crpin]')], obst = [...document.querySelectorAll('#cr-carte .cr-fonds, #cr-carte .cr-outils, #cr-carte .cr-chips, #cr-carte .cr-note')].filter(e => rr(e).width > 0);
      const cont = rr(document.querySelector('#cr-carte'));
      return { n: pins.length, nObst: obst.length, fonds: obst.some(o => o.classList.contains('cr-fonds')), sous: pins.filter(p => obst.some(o => I(rr(p), rr(o)) > 0)).map(p => p.dataset.crpin + ' sous ' + obst.find(o => I(rr(p), rr(o)) > 0).className), ids: pins.map(p => p.dataset.crpin) }; });
    // ce que le doigt toucherait : chaque repère est amené AU MILIEU de l'écran (sinon c'est la barre fixe du bas qu'on mesure), puis son centre doit rendre le repère
    r.pris = []; for (const id of r.ids) { await c.p.evaluate(id => document.querySelector('.cr-mk[data-crpin="' + id + '"]').scrollIntoView({ block: 'center', behavior: 'instant' }), id); await c.p.waitForTimeout(250);
      const q = await c.p.evaluate(id => { const p = document.querySelector('.cr-mk[data-crpin="' + id + '"]'), cont = document.querySelector('#cr-carte').getBoundingClientRect(), b = p.getBoundingClientRect(), x = b.left + b.width / 2, y = b.top + b.height / 2;
        if (x < cont.left || x > cont.right || y < cont.top || y > cont.bottom) return null;   // à moitié hors cadre : la carte le panoramique au toucher, on ne le compte pas
        const t = document.elementFromPoint(x, y); return t && t.closest('.cr-mk') === p ? null : id + ' couvert par ' + (t ? t.tagName + '.' + String(t.className).slice(0, 24) : '?'); }, id); if (q) r.pris.push(q); }
    console.log('   ', d, JSON.stringify(r));
    L.v('S3 · ' + d + ' : la carte a ses repères et ses boutons de fond (population)', r.n >= 2 && r.fonds, r);
    L.v('S3 · ' + d + ' : aucun repère sous un bouton de la carte à la première ouverture', r.sous.length === 0, r.sous);
    L.v('S3 · ' + d + ' : le centre de chaque repère visible reçoit bien le toucher du repère', r.pris.length === 0, r.pris);
    await L.capture(c, CAP + `S3-premiere-ouverture-${d}-${profil}${nuit ? '-nuit' : ''}.png`);
  }
});

(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  for (const [nom, fn] of PARC) { const k = nom.split(' ')[0]; if (veut.length && !veut.includes(k)) continue; console.log('\n== ' + nom);
    try { await reouvrir(c); await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine'); await fn(c); } catch (e) { L.v(k + ' · exception pendant le parcours', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
  L.v('aucune erreur JavaScript pendant les parcours', c.err.length === 0, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
