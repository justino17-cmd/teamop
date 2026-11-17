// Voie « restes », planning, TOUR 3 (17 novembre 2026) : les quatre points que le recontrôle du tour 2 a laissés ouverts, tranchés par le chef à 12 h 45.
// Usage : timeout 580 node restes-planning-3.js <profil> [nuit] [T1 T2 T3 T4]    « N ✓ · M ✗ », code 1 si un contrôle tombe.
//   T1  le compte « (N sur M) » de la note du bandeau ne compte que des PERSONNES (la colonne « Non assigné » n'en est pas une)
//   T2  la phrase et le compte disent la même chose : jamais « seulement les personnes affichées (5 sur 5) » ; en Sur mesure,
//       une personne écartée un jour seulement est NOMMÉE, avec le jour
//   T3  iPad portrait (768 à 1024 px, menu latéral affiché) : les six vues du sélecteur tiennent, « Carte » comprise
//   T4  en-tête du Planning de 320 à 430 px : « Rendez-vous en ligne » et « ＋ Nouvelle intervention » tiennent chacun sur UNE ligne,
//       sans que le texte touche le bord du bouton — côte à côte, ou empilés, jamais deux lignes dans un bouton
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const veut = args.filter(a => /^T\d+$/.test(a));
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-planning-3/';
const PARC = [];
const parcours = (nom, fn) => PARC.push([nom, fn]);
const vue = async (c, v, jour, o) => { await c.p.evaluate(({ v, jour, o }) => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = jour || AUJ; plMasques = new Set(); multiExclu = new Set(); plJours = 6; if (o && o.grp) multiGrp = o.grp; rendre(); scrollTo(0, 0); }, { v, jour, o }); await L.calme(c.p, 500); };
const reouvrir = async c => { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 300); };
const note = p => p.evaluate(() => { const n = document.querySelector('#contenu .pl-kpis-note'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : null; });
const kpis = p => p.evaluate(() => { const o = {}; document.querySelectorAll('#contenu [data-kpi]').forEach(b => o[b.dataset.kpi] = b.querySelector('b').textContent.trim()); return o; });
const panneau = async (c, k) => { await L.toucher(c, `[data-kpi="${k}"]`); await L.attendre(c.p, () => !!document.querySelector('#calque .panneau'), 4000);
  await L.calme(c.p, 400); return c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? P.textContent.replace(/\s+/g, ' ').trim() : null; }); };
const fermerPan = c => c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
// « N sur M » lus dans une phrase
const compte = t => { const m = /\((\d+) sur (\d+)\)/.exec(t || ''); return m ? [+m[1], +m[2]] : null; };

parcours('T1 · le compte « (N sur M) » ne compte que des personnes', async c => {
  const pop = await c.p.evaluate(() => ({ personnes: TECHS.filter(t => t.id).length, tous: TECHS.length, ids: TECHS.map(t => t.id) }));
  L.v('T1 · population : des personnes et la colonne « Non assigné » (id vide)', pop.personnes >= 3 && pop.tous === pop.personnes + 1 && pop.ids.includes(''), pop);
  await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine');
  L.v('T1 · rien de masqué : aucune note', (await note(c.p)) === null);
  await L.toucher(c, '[data-masque="sm"]');
  let n = await note(c.p), k = compte(n);
  L.v('T1 · Sophie masquée : le compte dit ' + (pop.personnes - 1) + ' sur ' + pop.personnes, !!k && k[0] === pop.personnes - 1 && k[1] === pop.personnes, n);
  await L.capture(c, CAP + `T1-une-personne-${profil}${nuit ? '-nuit' : ''}.png`);
  let p = await panneau(c, 'int');
  L.v('T1 · le panneau « interventions » dit le même compte', !!compte(p) && compte(p)[0] === pop.personnes - 1 && compte(p)[1] === pop.personnes, (p || '').slice(0, 200));
  await fermerPan(c);
  // seule la colonne « Non assigné » est masquée : ce n'est pas une personne, la note ne dit pas « 4 sur 4 »
  await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine');
  await L.toucher(c, '[data-masque=""]');
  n = await note(c.p); k = compte(n);
  L.v('T1 · seule « Non assigné » masquée : une note est là (le filtre existe)', !!n, n);
  L.v('T1 · seule « Non assigné » masquée : pas de « (N sur N) » à côté de « seulement » (toutes les personnes sont affichées)', !(k && k[0] === k[1]) && !/4 sur 5/.test(n || ''), n);
  L.v('T1 · seule « Non assigné » masquée : la note nomme la colonne', /Non assigné/.test(n || ''), n);
  p = await panneau(c, 'int');
  L.v('T1 · son panneau la nomme aussi', /Non assigné/.test(p || '') && !(compte(p) && compte(p)[0] === compte(p)[1]), (p || '').slice(0, 200));
  await fermerPan(c);
  await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine');
  await c.p.evaluate(() => { plMasques = new Set(['sm', '']); rendre(); }); await L.calme(c.p, 400);
  n = await note(c.p); k = compte(n);
  L.v('T1 · une personne ET la colonne masquées : ' + (pop.personnes - 1) + ' sur ' + pop.personnes + ', colonne nommée', !!k && k[0] === pop.personnes - 1 && k[1] === pop.personnes && /Non assigné/.test(n), n);
  await c.p.evaluate(() => { plMasques = new Set(TECHS.map(t => t.id)); rendre(); }); await L.calme(c.p, 400);
  n = await note(c.p); k = compte(n);
  L.v('T1 · tout masqué : 0 sur ' + pop.personnes, !!k && k[0] === 0 && k[1] === pop.personnes, n);
  await L.toucher(c, '[data-mqtous="1"]'); n = await note(c.p);
  L.v('T1 · « Tout afficher » : plus de note', n === null, n);
});

parcours('T2 · Sur mesure : la phrase et le compte disent la même chose', async c => {
  await vue(c, 'multi', undefined);
  await c.p.evaluate(() => { multiJours = [0, 1, 2, 3, 4].map(k => ajoute(AUJ, k)); rendre(); }); await L.calme(c.p, 400);   // cinq dates : de quoi écarter une personne un, puis trois jours
  const base = await c.p.evaluate(() => ({ J: joursPeriode(), n: TECHS.filter(t => t.id).length, nom: tech('sm').nom, j: joursPeriode()[1] }));
  L.v('T2 · population : une période de plusieurs jours en Sur mesure', base.J.length >= 3, base);
  const poser = x => c.p.evaluate(x => { multiExclu = new Set(x); rendre(); }, x);
  const prenom = base.nom.split(' ')[0];
  await poser(['sm|' + base.j]); await L.calme(c.p, 400);
  let n = await note(c.p), k = compte(n);
  L.v('T2 · une personne écartée un jour : une note est là', !!n, n);
  L.v('T2 · …jamais « (5 sur 5) » (ni aucun « N sur N ») à côté du mot « seulement »', !(k && k[0] === k[1]) && !(/seulement/.test(n || '') && !k), n);
  L.v('T2 · …elle nomme la personne et le jour', new RegExp(prenom).test(n || '') && /(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/.test(n || ''), n);
  await L.capture(c, CAP + `T2-un-jour-${profil}${nuit ? '-nuit' : ''}.png`);
  const p = await panneau(c, 'int');
  L.v('T2 · le panneau de la tuile le redit pareil (personne nommée, pas de compte complet)', new RegExp(prenom).test(p || '') && !(compte(p) && compte(p)[0] === compte(p)[1]), (p || '').slice(0, 260));
  await fermerPan(c);
  await poser(base.J.slice(0, 3).map(d => 'sm|' + d)); await L.calme(c.p, 400);
  n = await note(c.p);
  L.v('T2 · écartée trois jours : la note le dit (« 3 jours »)', /3 jours/.test(n || ''), n);
  await c.p.evaluate(({ j }) => { plMasques = new Set(['sm']); multiExclu = new Set(['kb|' + j]); rendre(); }, { j: base.j });
  await L.calme(c.p, 400); n = await note(c.p); k = compte(n);
  L.v('T2 · une personne masquée + une autre écartée un jour : ' + (base.n - 1) + ' sur ' + base.n + ' et la seconde nommée', !!k && k[0] === base.n - 1 && k[1] === base.n && /Karim/.test(n || ''), n);
  await poser(['sm|' + base.j]); await L.calme(c.p, 300);
  await L.toucher(c, '[data-mqtous="1"]'); n = await note(c.p);
  const reste = await c.p.evaluate(() => multiExclu.size);
  L.v('T2 · « Tout afficher » : plus de note, plus de jour écarté', n === null && reste === 0, { n, reste });
  await poser(['sm|' + base.j]); await L.calme(c.p, 300);
  const kp = await kpis(c.p), cartes = await c.p.evaluate(() => new Set([...document.querySelectorAll('#contenu .pc[data-int]')].map(x => x.dataset.int)).size);
  L.v('T2 · la tuile « interventions » = les cartes dessinées (' + cartes + ')', +kp.int === cartes && cartes > 0, { kp, cartes });
});

parcours('T3 · iPad portrait : les six vues du sélecteur tiennent', async c => {
  if (c.largeur < 700 || c.largeur > 900) { L.v('T3 · profil sans objet (iPad portrait seulement) : rien à mesurer', true); return; }
  const mesures = [];
  for (const w of [768, 810, 820, 834, 860, 890, 900, 1024]) {
    await c.p.setViewportSize({ width: w, height: 1180 }); await L.calme(c.p, 400);
    for (const v of ['jour', 'semaine', 'general', 'multi', 'carte']) {
      await vue(c, v, '2026-10-26');
      const m = await c.p.evaluate(() => { const seg = document.querySelector('.pl-barre > .seg[aria-label="Vue"]'), bs = [...seg.querySelectorAll('button')], rs = seg.getBoundingClientRect(), pm = document.querySelector('#contenu').getBoundingClientRect(),
          hors = bs.filter(b => { const r = b.getBoundingClientRect(); return r.left < rs.left - 1 || r.right > rs.right + 1 || r.left < pm.left - 1 || r.right > pm.right + 1 || r.width < 20; }).map(b => b.textContent.trim()),
          actif = bs.find(b => b.getAttribute('aria-pressed') === 'true'), ra = actif && actif.getBoundingClientRect(),
          lignes = new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size, defile = seg.scrollWidth > seg.clientWidth + 1;
        return { n: bs.length, hors, actifDans: !!ra && ra.left >= rs.left - 1 && ra.right <= rs.right + 1, lignes, defile, sw: seg.scrollWidth, cw: seg.clientWidth, droite: Math.round(Math.max(...[...document.querySelectorAll('.pl-barre > *')].map(e => e.getBoundingClientRect().right))), larg: innerWidth,
          sansTexteCoupe: bs.every(b => b.scrollWidth <= b.clientWidth + 1) }; });
      mesures.push(m);
      L.v('T3 · ' + w + ' px · vue ' + v + ' : six boutons, tous dans le cadre, l’actif aussi, sans défilement caché', m.n === 6 && m.hors.length === 0 && m.actifDans && !m.defile, m);
      L.v('T3 · ' + w + ' px · vue ' + v + ' : aucun libellé coupé et la barre ne dépasse pas l’écran', m.sansTexteCoupe && m.droite <= m.larg + 1, m);
    }
    if (w === 768 || w === 820 || w === 890) { await vue(c, 'carte', '2026-10-26'); await L.capture(c, CAP + `T3-selecteur-${w}-carte${nuit ? '-nuit' : ''}.png`); await vue(c, 'semaine', '2026-10-26'); await L.capture(c, CAP + `T3-selecteur-${w}-semaine${nuit ? '-nuit' : ''}.png`); }
    const deb = await L.deborde({ ...c, largeur: w }); if (deb.bouge) L.v('T3 · ' + w + ' px : la page glisse de côté', false, deb);
  }
  L.v('T3 · population : ' + mesures.length + ' mesures', mesures.length >= 30, mesures.length);
  await c.p.setViewportSize({ width: c.largeur, height: c.hauteur });
});

parcours('T4 · en-tête du Planning de 320 à 430 px : un bouton, une ligne, de la marge', async c => {
  if (c.largeur >= 800) { L.v('T4 · profil sans objet (téléphone seulement) : rien à mesurer', true); return; }
  let n = 0;
  for (const w of [320, 330, 345, 360, 375, 380, 390, 393, 400, 412, 420, 430]) {
    await c.p.setViewportSize({ width: w, height: c.hauteur }); await L.calme(c.p, 350);
    for (const v of ['jour', 'carte']) {
      await vue(c, v);
      const bt = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .tete .actions .btn')].map(b => { const r = b.getBoundingClientRect(), t = document.createRange(); t.selectNodeContents(b); const q = t.getBoundingClientRect(), cs = getComputedStyle(b), lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
        return { txt: b.textContent.trim().slice(0, 24), marge: Math.round(Math.min(q.left - r.left, r.right - q.right)), droite: Math.round(r.right), gauche: Math.round(r.left), lignes: Math.round(q.height / lh), haut: Math.round(r.height), taille: cs.fontSize, ecrase: b.scrollWidth > b.clientWidth + 1 }; }));
      n++; if (v === 'jour') console.log('    ' + w + ' px : ' + (bt.length === 2 && Math.abs(bt[0].haut - bt[1].haut) < 2 && bt[0].droite < bt[1].gauche ? 'côte à côte' : 'empilés') + ', police ' + (bt[0] || {}).taille + ', marges ' + bt.map(b => b.marge).join(' / '));
      L.v('T4 · ' + w + ' px · ' + v + ' : deux boutons dans l’écran, chacun sur UNE ligne', bt.length === 2 && bt.every(b => b.lignes <= 1 && b.droite <= w && b.gauche >= 0 && !b.ecrase), bt);
      L.v('T4 · ' + w + ' px · ' + v + ' : le texte ne touche pas le bord (marge ≥ 6 px)', bt.length === 2 && bt.every(b => b.marge >= 6), bt);
      const deb = await L.deborde({ ...c, largeur: w }); if (deb.bouge) L.v('T4 · ' + w + ' px : la page glisse de côté', false, deb);
    }
    if (w === 320 || w === 360 || w === 390 || w === 420) { await vue(c, 'jour'); await L.capture(c, CAP + `T4-entete-${w}${nuit ? '-nuit' : ''}.png`); }
  }
  L.v('T4 · population : ' + n + ' mesures', n >= 20, n);
  await c.p.setViewportSize({ width: c.largeur, height: c.hauteur });
});

(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' });
  for (const [nom, fn] of PARC) { const k = nom.split(' ')[0]; if (veut.length && !veut.includes(k)) continue; console.log('\n== ' + nom);
    try { await reouvrir(c); await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine'); await fn(c); } catch (e) { L.v(k + ' · exception pendant le parcours', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
  L.v('aucune erreur JavaScript pendant les parcours', c.err.length === 0, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
