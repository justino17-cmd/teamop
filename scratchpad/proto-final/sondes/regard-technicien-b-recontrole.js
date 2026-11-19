// LE REGARD, SECOND REGARD — Mon camion (technicienne, chef d'équipe) : ce que les corrections de « regard-technicien-b.js »
// ont pu ABÎMER À CÔTÉ. Les règles changées sont PARTAGÉES :
//   · le pied collant « #calque .panneau>.vh-pied » (et sa variable --pan-bas) sert aussi les feuilles du gérant dans Véhicules
//     (rendez-vous, document, matériel à bord, suppression) ;
//   · « .mat-pied .btn » (flex, empilement à 340 px) sert la feuille du Stock (matGVue), « Il me manque une pièce » et « Messages du bureau » ;
//   · le chef d'équipe et le gérant voient « Mon camion » aussi (autres rôles, autres données).
// Chaque feuille est ouverte par la FONCTION de l'application (le geste d'ouverture est joué par regard-technicien-b.js),
// puis on mesure : le pied touche le bas de la feuille, les boutons d'un pied ne font pas plus de deux lignes, aucun bouton
// ne sort de la feuille, rien ne glisse de côté. Chaque contrôle compte d'abord sa population.
//   PROFILS=petit,android,iphone,ipad,mac NUIT=0,1 node scratchpad/proto-final/sondes/regard-technicien-b-recontrole.js
// ⛔ 127.0.0.1 seulement, un navigateur à la fois. Sort en 1 si un contrôle tombe.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'petit,android,iphone,ipad,mac').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(x => x === '1');
const ev = (c, f, a) => c.p.evaluate(f, a);
const fermer = async c => { await ev(c, () => { try { fermerPanneau(); } catch (e) {} }); await L.calme(c.p, 300); };
// la feuille ouverte : son pied (collant ou non), ses boutons de pied (lignes, largeur), son débordement
const mesurer = c => ev(c, () => {
  const pan = document.querySelector('#calque .panneau'); if (!pan) return null;
  pan.scrollTop = 0;
  const rp = pan.getBoundingClientRect(), pied = pan.querySelector('.vh-pied, .mat-pied'), out = { titre: (pan.querySelector('h2') || {}).textContent, haut: pan.scrollHeight > pan.clientHeight + 2, pied: !!pied };
  if (pied) { const rf = pied.getBoundingClientRect(), x = rf.left + rf.width / 2, e = document.elementFromPoint(x, rp.bottom - 3);
    out.sticky = pied.classList.contains('vh-pied'); out.suite = !!pied.nextElementSibling;   // un lien « Annuler » APRÈS le pied : le pied n'est pas collé au bas tant que la feuille tient presque entière, c'est la suite qu'on vérifie (atteignable au bout du défilement)
    if (pied.nextElementSibling) { pan.scrollTop = pan.scrollHeight; const s = pied.nextElementSibling, rs = s.getBoundingClientRect(), t = document.elementFromPoint(rs.left + rs.width / 2, rs.top + rs.height / 2); out.suiteAtteignable = !!t && s.contains(t) && rs.bottom <= rp.bottom + 1; pan.scrollTop = 0; } out.ecart = Math.round((rp.bottom - rf.bottom) * 10) / 10; out.dessous = !!e && pied.contains(e);
    out.boutons = [...pied.querySelectorAll('.btn')].map(b => { const r = document.createRange(); r.selectNodeContents(b); const rb = b.getBoundingClientRect();
      return { t: b.textContent.trim().slice(0, 30), l: new Set([...r.getClientRects()].filter(q => q.width > 1).map(q => Math.round(q.top))).size, dedans: rb.left >= rp.left - 1 && rb.right <= rp.right + 1, h: Math.round(rb.height) }; }); }
  const sh = pan.scrollWidth - pan.clientWidth; out.glisse = sh;
  return out; });
(async () => {
  let n = 0;
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : ' jour'), tel = L.PROFILS[profil].w <= 760;
    // ── 1 · le gérant : les feuilles de Véhicules (vh-pied collant) et du Stock (mat-pied) ───────────────────────────────
    const c = await L.ouvrir({ profil, qui: 'marc', calme: true, nuit });
    const feuilles = [
      ['Véhicules · Noter le rendez-vous', () => { const v1 = VEHICULES[0]; vxRdv(v1.id); }],
      ['Véhicules · Ajouter un document', () => { vhDocPanel(VEHICULES[0].id); }],
      ['Véhicules · Matériel à bord', () => { vhMatPanel(VEHICULES[0].id); }],
      ['Véhicules · Supprimer', () => { vxSupprPanel(VEHICULES[0].id); }],
      ['Véhicules · Noter un plein', () => { vxPleinPanel(VEHICULES[0].id); }],
      ['Stock · Mettre à jour (sortir)', () => { matGOuvrir('sortir', {}); }],
      ['Stock · Mettre à jour (ranger)', () => { matGOuvrir('ranger', {}); }],
      ['Mon camion · Il me manque (gérant)', () => { matManque({}); }],
      ['Mon camion · Messages du bureau (gérant)', () => { matMessages(sxMoi()); }],
    ];
    await L.aller(c.p, 'vehicules');
    let ouvertes = 0, pieds = 0, collants = 0, hautes = 0;
    for (const [lib, f] of feuilles) {
      const ok = await ev(c, g => { try { eval('(' + g + ')()'); return true; } catch (e) { return String(e.message).slice(0, 80); } }, f.toString());
      await L.calme(c.p, 600); n++;
      if (ok !== true) { console.log('  · ' + nom + ' · ' + lib + ' : non ouverte (' + ok + ')'); continue; }
      const m = await mesurer(c);
      if (!m) { console.log('  · ' + nom + ' · ' + lib + ' : aucune feuille'); await fermer(c); continue; }
      ouvertes++;
      if (m.pied) { pieds++;
        if (m.sticky && m.haut && !m.suite) { collants++; v(nom + ' · ' + lib + ' : le pied collant touche le bas de la feuille (écart ' + m.ecart + ' px) et c\'est lui qu\'on touche', m.ecart <= 1.5 && m.dessous, m); }
        if (m.sticky && m.suite) v(nom + ' · ' + lib + ' : ce qui suit le pied (« Annuler ») s\'atteint au bout du défilement, sous le doigt', m.suiteAtteignable, m);
        if (m.haut) hautes++;
        v(nom + ' · ' + lib + ' : boutons du pied de deux lignes au plus, dans la feuille', m.boutons.length > 0 && m.boutons.every(b => b.l <= 2 && b.dedans), m.boutons); }
      v(nom + ' · ' + lib + ' : rien ne glisse de côté dans la feuille', m.glisse <= 1, m.glisse);
      await fermer(c);
    }
    v(nom + ' · population : au moins six feuilles ouvertes, trois avec un pied', ouvertes >= 6 && pieds >= 3, { ouvertes, pieds, collants, hautes });
    if (tel) v(nom + ' · …et au moins une feuille à pied collant déborde (sinon le contrôle ne regardait rien)', hautes >= 1, { collants, hautes });
    const d = await L.deborde(c); v(nom + ' · la page ne glisse pas de côté', d.bouge === 0, d);
    if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript (gérant)', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);

    // ── 2 · le chef d'équipe et la technicienne : Mon camion à la même largeur de tableau, mêmes contrôles de rangée ───────
    for (const qui of ['kb', 'sm']) {
      const k = await L.ouvrir({ profil, qui, calme: true, nuit }); await L.aller(k.p, 'moncamion');
      const r = await ev(k, () => { const e = s => document.querySelector(s); const lignes = e => { if (!e) return -1; const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].filter(q => q.width > 1).map(q => Math.round(q.top))).size; };
        const boutons = [...document.querySelectorAll('.vh-cam-b')].map(b => ({ t: b.textContent.trim(), l: lignes(b) })), tete = e('.mc-tete-c');
        return { h1: (e('#contenu h1') || {}).textContent, boutons, manque: document.querySelectorAll('.mc-l').length, tete: tete ? tete.getBoundingClientRect().width : 0 }; });
      v(nom + ' · ' + qui + ' : l\'écran Mon camion est là (titre, trois boutons) ', r.h1 === 'Mon camion' && r.boutons.length === 3, r);
      v(nom + ' · ' + qui + ' : les trois boutons sur deux lignes au plus', r.boutons.every(b => b.l <= 2), r.boutons);
      // ── 3 · LA CASSE TROUVÉE AU SECOND REGARD : une rangée « envoyée » de « Il manque à bord » (après « Je l'ai pris » ou « J'ai tout pris »)
      //     ne doit jamais s'écraser. À 320 × 568 la règle compacte (nowrap) et « .mc-dr{flex:1 1 100%} » (corrigé F) laissaient 0 px au nom : une lettre par ligne, 449 px de haut.
      if (qui === 'sm') for (const [geste, sel] of [['Je l\'ai pris (une rangée)', '[data-mat^="pris|"]'], ['J\'ai tout pris', '[data-mat=toutpris]']]) {
        await L.aller(k.p, 'moncamion');
        await ev(k, s => { const e = document.querySelector(s); if (e) e.click(); }, sel); await L.calme(k.p, 900);
        const z = await ev(k, () => [...document.querySelectorAll('.mc-l.envoye')].map(l => { const n = l.querySelector('.fo-n').getBoundingClientRect(); return { nom: l.querySelector('.fo-n b').textContent.slice(0, 20), l: Math.round(n.width), h: Math.round(n.height) }; }));
        v(nom + ' · ' + geste + ' : au moins une rangée « envoyée » (population)', z.length >= 1, z);
        v(nom + ' · ' + geste + ' : le nom de chaque rangée envoyée garde ≥ 100 px de large et ≤ 120 px de haut', z.every(r => r.l >= 100 && r.h <= 120), z);
      }
      const dk = await L.deborde(k); v(nom + ' · ' + qui + ' : la page ne glisse pas de côté', dk.bouge === 0 && dk.seconde <= dk.largeur + 1, dk);
      if (k.err.length) console.log(k.err.slice(0, 3)); v(nom + ' · ' + qui + ' : zéro erreur JavaScript', k.err.length === 0, k.err.slice(0, 3));
      await L.fin(k);
    }
  }
  console.log('\n  ' + n + ' feuilles ouvertes');
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
