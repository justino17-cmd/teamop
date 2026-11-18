// Voie « restes », planning, TOUR 3 — RECONTRÔLE ADVERSE (18 novembre 2026). Ce que les corrections du tour 3 (note « N sur M » qui ne compte que des
// personnes, phrase du Sur mesure, sélecteur de vues sous 900 px, en-tête du Planning à 320-430 px) ont pu CASSER À CÔTÉ, ou n'ont pas couvert.
// Usage : timeout 580 node restes-planning-3-recontrole.js <profil> [nuit] [A B C D E F]    « N ✓ · M ✗ », code 1 si un contrôle tombe.
//   A  en-tête du Planning de 700 à 1440 px (la règle « côte à côte » ne vit qu'au téléphone : tablette et ordinateur ne l'ont pas relue)
//   B  sélecteur de vues de 900 à 1440 px (la règle à deux rangées s'arrête à 900 : juste au-dessus, tout tient-il encore ?)
//   C  pire cas de la note et du panneau au téléphone : une masquée + « Non assigné » + deux personnes écartées plusieurs jours, prénoms longs
//   D  autres rôles (secrétariat, technicienne, chef d'équipe) : le compte « N sur M » dit la même chose, la note tient
//   E  « Voir le planning » depuis une absence, titre de la période, panneaux « absent » et « de travail prévu »
//   G  les lignes des panneaux de tuiles ne se chevauchent pas (trouvé au tour 3 : « Interventions sur la période », lignes écrasées à 58 px, textes superposés)
//   F  la période du Sur mesure compte des personnes dans tous les états (aucune, une, toutes, seule « Non assigné » masquée)
const L = require('../../lib.js');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const veut = args.filter(a => /^[A-G]$/.test(a));
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-planning-3-recontrole/';
const PARC = [];
const parcours = (nom, fn) => PARC.push([nom, fn]);
const vue = async (c, v, jour) => { await c.p.evaluate(({ v, jour }) => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = jour || AUJ; plMasques = new Set(); multiExclu = new Set(); plJours = 6; rendre(); scrollTo(0, 0); }, { v, jour }); await L.calme(c.p, 450); };
const reouvrir = async c => { await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900); await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(c.p, 300); };
const note = p => p.evaluate(() => { const n = document.querySelector('#contenu .pl-kpis-note'); return n ? n.textContent.replace(/\s+/g, ' ').trim() : null; });
const panneau = async (c, k) => { await L.toucher(c, `[data-kpi="${k}"]`); await L.attendre(c.p, () => !!document.querySelector('#calque .panneau'), 4000);
  await L.calme(c.p, 400); return c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); return P ? P.textContent.replace(/\s+/g, ' ').trim() : null; }); };
const fermerPan = c => c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
const compte = t => { const m = /\((\d+) sur (\d+)\)/.exec(t || ''); return m ? [+m[1], +m[2]] : null; };
const taille = (c, w, h) => c.p.setViewportSize({ width: w, height: h || c.hauteur }).then(() => L.calme(c.p, 400));
// un élément DÉBORDE de son cadre : son contenu dépasse (scrollWidth) ou son rectangle sort de l'écran
const sortie = (p, sel) => p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return { absent: true }; const r = e.getBoundingClientRect(); return { absent: false, sw: e.scrollWidth, cw: e.clientWidth, gauche: Math.round(r.left), droite: Math.round(r.right), larg: innerWidth }; }, sel);

parcours('A · en-tête du Planning de 700 à 1440 px', async c => {
  let n = 0;
  for (const w of [700, 768, 820, 900, 960, 1024, 1180, 1440]) {
    await taille(c, w);
    for (const v of ['jour', 'carte']) {
      await vue(c, v);
      const bt = await c.p.evaluate(() => [...document.querySelectorAll('#contenu .tete .actions .btn')].map(b => { const r = b.getBoundingClientRect(), t = document.createRange(); t.selectNodeContents(b); const q = t.getBoundingClientRect(), lh = parseFloat(getComputedStyle(b).lineHeight) || parseFloat(getComputedStyle(b).fontSize) * 1.25;
        return { txt: b.textContent.trim().slice(0, 24), marge: Math.round(Math.min(q.left - r.left, r.right - q.right)), droite: Math.round(r.right), gauche: Math.round(r.left), haut: Math.round(r.top), lignes: Math.round(q.height / lh), larg: Math.round(r.width) }; }));
      n++;
      L.v('A · ' + w + ' px · ' + v + ' : deux boutons dans l’écran, chacun sur UNE ligne, sans chevauchement', bt.length === 2 && bt.every(b => b.lignes <= 1 && b.droite <= w && b.gauche >= 0) && (Math.abs(bt[0].haut - bt[1].haut) > 2 || bt[0].droite <= bt[1].gauche), bt);
      L.v('A · ' + w + ' px · ' + v + ' : le texte ne touche pas le bord (marge ≥ 6 px)', bt.length === 2 && bt.every(b => b.marge >= 6), bt);
    }
    const deb = await L.deborde({ ...c, largeur: w }); if (deb.bouge) L.v('A · ' + w + ' px : la page glisse de côté', false, deb);
    if (w === 768 || w === 1440) { await vue(c, 'jour'); await L.capture(c, CAP + `A-entete-${w}${nuit ? '-nuit' : ''}.png`); }
  }
  L.v('A · population : ' + n + ' mesures', n >= 14, n);
  await c.p.setViewportSize({ width: c.largeur, height: c.hauteur });
});

parcours('B · sélecteur de vues de 900 à 1440 px', async c => {
  let n = 0;
  for (const w of [900, 901, 940, 1000, 1100, 1280, 1440]) {
    await taille(c, w, 900);
    for (const v of ['jour', 'semaine', 'mois', 'general', 'multi', 'carte']) {
      await vue(c, v, '2026-10-26');
      const m = await c.p.evaluate(() => { const seg = document.querySelector('.pl-barre > .seg[aria-label="Vue"]'), bs = [...seg.querySelectorAll('button')], rs = seg.getBoundingClientRect();
        return { n: bs.length, hors: bs.filter(b => { const r = b.getBoundingClientRect(); return r.left < rs.left - 1 || r.right > rs.right + 1 || r.width < 20; }).map(b => b.textContent.trim()),
          coupe: bs.filter(b => b.scrollWidth > b.clientWidth + 1).map(b => b.textContent.trim()), defile: seg.scrollWidth > seg.clientWidth + 1,
          droite: Math.round(Math.max(...[...document.querySelectorAll('.pl-barre > *')].map(e => e.getBoundingClientRect().right))), larg: innerWidth,
          lignes: new Set(bs.map(b => Math.round(b.getBoundingClientRect().top))).size }; });
      n++;
      L.v('B · ' + w + ' px · ' + v + ' : six boutons dans le cadre, rien de coupé ni de caché par un défilement', m.n === 6 && m.hors.length === 0 && m.coupe.length === 0 && !m.defile && m.droite <= m.larg + 1, m);
    }
    if (w === 901 || w === 1000) { await vue(c, 'semaine', '2026-10-26'); await L.capture(c, CAP + `B-barre-${w}${nuit ? '-nuit' : ''}.png`); }
    const deb = await L.deborde({ ...c, largeur: w }); if (deb.bouge) L.v('B · ' + w + ' px : la page glisse de côté', false, deb);
  }
  L.v('B · population : ' + n + ' mesures', n >= 40, n);
  await c.p.setViewportSize({ width: c.largeur, height: c.hauteur });
});

parcours('C · pire cas de la note et du panneau', async c => {
  if (c.largeur >= 800) { await taille(c, 360, 740); }
  await vue(c, 'multi');
  await c.p.evaluate(() => { multiJours = [0, 1, 2, 3, 4].map(k => ajoute(AUJ, k)); const J = joursPeriode(); plMasques = new Set(['lr', '']); multiExclu = new Set([...J.slice(0, 3).map(d => 'sm|' + d), 'kb|' + J[4]]); rendre(); }); await L.calme(c.p, 450);
  const n = await note(c.p);
  L.v('C · une note est là (population non vide)', !!n, n);
  L.v('C · elle dit « 3 sur 4 » ? non : « Léa » masquée → 3 sur 4 personnes, la colonne nommée, Sophie 3 jours, Karim un jour', !!n && compte(n) && compte(n)[0] === 3 && compte(n)[1] === 4 && /Non assigné/.test(n) && /Sophie 3 jours/.test(n) && /Karim le /.test(n), n);
  const s = await sortie(c.p, '#contenu .pl-kpis-note');
  L.v('C · la note ne dépasse ni son cadre ni l’écran', !s.absent && s.sw <= s.cw + 1 && s.gauche >= 0 && s.droite <= s.larg + 1, s);
  await c.p.evaluate(() => { const e = document.querySelector('#contenu .pl-kpis-note'); if (e) e.scrollIntoView({ block: 'center' }); }); await L.calme(c.p, 400);
  await L.capture(c, CAP + `C-note-${profil}${nuit ? '-nuit' : ''}.png`);
  const p = await panneau(c, 'int');
  L.v('C · le panneau redit la même phrase', !!p && /Sophie 3 jours/.test(p) && /Non assigné/.test(p) && compte(p) && compte(p)[0] === 3, (p || '').slice(0, 260));
  const sp = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'); if (!P) return null; return { sw: P.scrollWidth, cw: P.clientWidth, larg: innerWidth, droite: Math.round(P.getBoundingClientRect().right) }; });
  L.v('C · le panneau ne glisse pas de côté', !!sp && sp.sw <= sp.cw + 1 && sp.droite <= sp.larg + 1, sp);
  await L.capture(c, CAP + `C-panneau-${profil}${nuit ? '-nuit' : ''}.png`);
  await fermerPan(c);
  const deb = await L.deborde(c); L.v('C · la page ne glisse pas de côté', !deb.bouge, deb);
  await c.p.setViewportSize({ width: c.largeur, height: c.hauteur });
});

parcours('D · autres rôles : le Planning leur est fermé, la phrase et le compte n\'ont rien à y lire', async c => {
  // ROLES : « Gestion » voit les interventions sans les planifier, un technicien a « Ma journée » : le Planning n'est pas à eux. On le DIT (au lieu d'attendre une note
  // qui ne paraîtra jamais) : la porte renvoie à leur accueil, aucun appel de la phrase ne part, aucune erreur JavaScript.
  const r = await c.p.evaluate(() => { aller('planning'); return { route, hash: location.hash }; }); await L.calme(c.p, 600);
  const e = await c.p.evaluate(() => ({ route, hash: location.hash, kpis: document.querySelectorAll('#contenu [data-kpi]').length, note: !!document.querySelector('#contenu .pl-kpis-note'), menu: !!document.querySelector('#nv [data-go="planning"], nav [data-go="planning"]') }));
  L.v('D · ' + c.qui + ' : « planning » renvoie à son accueil (population : la porte est jouée)', e.route !== 'planning' && e.hash !== '#planning' && e.kpis === 0 && !e.note, { r, e });
  await L.capture(c, CAP + `D-${c.qui}-${profil}${nuit ? '-nuit' : ''}.png`);
});

parcours('E · depuis une absence : titre et panneaux', async c => {
  await vue(c, 'semaine');
  const p = await panneau(c, 'abs');
  const nb = await c.p.evaluate(() => document.querySelectorAll('#calque [data-kabs]').length);
  L.v('E · population : des absences à ouvrir', nb >= 1, nb);
  if (nb >= 1) {
    await L.toucher(c, '#calque [data-kabs]'); await L.calme(c.p, 600);
    const e = await c.p.evaluate(() => ({ vue: plVue, titre: (document.querySelector('.pl-nav b') || {}).textContent, note: ((document.querySelector('#contenu .pl-kpis-note') || {}).textContent || '').replace(/\s+/g, ' ').trim() }));
    L.v('E · le Sur mesure s’ouvre sur une seule personne, comptée « 1 personne » (jamais « 2 »)', e.vue === 'multi' && /· 1 personne$/.test(e.titre || ''), e);
    L.v('E · la note dit « (1 sur 4) » sans nommer la colonne « Non assigné » (elle reste affichée)', compte(e.note) && compte(e.note)[0] === 1 && compte(e.note)[1] === 4 && !/sans la colonne/.test(e.note), e);
    await L.capture(c, CAP + `E-absence-${profil}${nuit ? '-nuit' : ''}.png`);
    const t = await panneau(c, 'temps');
    L.v('E · le panneau « de travail prévu » dit ce qui est affiché, avec le compte juste', /seulement les personnes affichées \(1 sur 4\)/.test(t || '') && /pour ce qui est affiché seulement/.test(t || ''), (t || '').slice(0, 300));
    await fermerPan(c);
    const a = await panneau(c, 'abs');
    L.v('E · le panneau « absent » redit le filtre', /seulement les personnes affichées \(1 sur 4\)/.test(a || ''), (a || '').slice(0, 300));
    await fermerPan(c);
    const pl = await panneau(c, 'plan');
    L.v('E · « à planifier » ne parle d’aucun filtre (il compte toute l’équipe)', !/seulement les personnes/.test(pl || ''), (pl || '').slice(0, 200));
    await fermerPan(c);
  }
});

parcours('F · la période du Sur mesure compte des personnes', async c => {
  await vue(c, 'multi');
  await c.p.evaluate(() => { multiJours = [0, 1, 2].map(k => ajoute(AUJ, k)); rendre(); }); await L.calme(c.p, 300);
  const titre = () => c.p.evaluate(() => (document.querySelector('.pl-nav b') || {}).textContent);
  const poser = async m => { await c.p.evaluate(m => { plMasques = new Set(m); rendre(); }, m); await L.calme(c.p, 300); return titre(); };
  const pop = await c.p.evaluate(() => TECHS.filter(t => t.id).length);
  L.v('F · rien de masqué : « 3 dates · ' + pop + ' personnes »', (await titre()) === '3 dates · ' + pop + ' personnes', await titre());
  L.v('F · seule « Non assigné » masquée : ' + pop + ' personnes', (await poser([''])) === '3 dates · ' + pop + ' personnes');
  L.v('F · une personne masquée : ' + (pop - 1) + ' personnes', (await poser(['sm'])) === '3 dates · ' + (pop - 1) + ' personnes');
  L.v('F · une seule personne affichée : « 1 personne » (singulier)', (await poser(['sm', 'kb', 'lr', ''])) === '3 dates · 1 personne');
  L.v('F · toutes les personnes masquées : « aucune personne »', (await poser(['sm', 'kb', 'lr', 'tl'])) === '3 dates · aucune personne');
  const dup = await c.p.evaluate(() => { const o = {}; TECHS.filter(t => t.id).forEach(t => { const p = t.nom.split(' ')[0]; o[p] = (o[p] || 0) + 1; }); return Object.values(o).filter(x => x > 1).length; });
  L.v('F · deux personnes ne portent pas le même prénom (la phrase les nomme par le prénom)', dup === 0, dup);
  // le titre d'une jauge d'une autre vue ne bouge pas
  await vue(c, 'semaine'); const s = await titre();
  L.v('F · la semaine garde son titre de semaine', /^Semaine du /.test(s || ''), s);
});

parcours('G · les lignes des panneaux de tuiles ne se chevauchent pas', async c => {
  for (const [v, k] of [['semaine', 'int'], ['jour', 'int'], ['semaine', 'abs']]) {
    await vue(c, v);
    await L.toucher(c, `[data-kpi="${k}"]`); await L.attendre(c.p, () => !!document.querySelector('#calque .panneau'), 4000); await L.calme(c.p, 900);
    const m = await c.p.evaluate(() => { const P = document.querySelector('#calque .panneau'), R = P ? [...P.querySelectorAll('.ligne-clic, .kpi-l')] : [];
      const cou = R.filter(r => r.scrollHeight > r.clientHeight + 2), ch = R.filter((r, i) => i && r.getBoundingClientRect().top < R[i - 1].getBoundingClientRect().bottom - 1);
      return { lignes: R.length, coupees: cou.length, chevauchent: ch.length, ex: cou.slice(0, 2).map(r => Math.round(r.getBoundingClientRect().height) + ' pour ' + r.scrollHeight) }; });
    L.v('G · ' + v + ' · tuile « ' + k + ' » : population (des lignes à mesurer)', m.lignes >= 1, m);
    L.v('G · ' + v + ' · tuile « ' + k + ' » : aucune ligne n\'est plus petite que son texte, rien ne se superpose', m.coupees === 0 && m.chevauchent === 0, m);
    if (v === 'semaine' && k === 'int') await L.capture(c, CAP + `G-panneau-${profil}${nuit ? '-nuit' : ''}.png`);
    await fermerPan(c); await L.calme(c.p, 250);
  }
});

(async () => {
  const qui = ['marc', 'julie', 'sm', 'kb'];
  let ko = 0;
  for (const q of qui) {
    if (q !== 'marc' && veut.length && !veut.includes('D')) continue;
    if (q === 'marc' && veut.length === 1 && veut[0] === 'D') continue;
    const c = await L.ouvrir({ profil, nuit, qui: q }); c.qui = q;
    for (const [nom, fn] of PARC) { const k = nom.split(' ')[0];
      if (veut.length && !veut.includes(k)) continue;
      if (k === 'D' && q === 'marc') continue;            // le gérant est joué par les autres parcours
      if (k !== 'D' && q !== 'marc') continue;            // les autres rôles ne jouent que D
      console.log('\n== ' + nom + (k === 'D' ? ' · ' + q : ''));
      try { await reouvrir(c); await vue(c, c.doigt && c.largeur < 800 ? 'jour' : 'semaine'); await fn(c); } catch (e) { L.v(k + ' · exception pendant le parcours', false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } }
    if (q === qui[qui.length - 1] || q === 'marc') L.v('aucune erreur JavaScript pendant les parcours (' + q + ')', c.err.length === 0, c.err.slice(0, 5));
    await L.fermer();
  }
  const r = L.bilan(); process.exit(r ? 1 : 0);
})();
