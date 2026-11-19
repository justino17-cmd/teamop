// LE REGARD — Mon camion (technicienne, chef d'équipe) : les défauts MESURABLES vus sur les captures, gardés ici pour de bon.
//  A · le pied collant d'une feuille (Noter un plein, Relever le compteur, Un souci) touche le BAS de la feuille : rien ne défile dessous
//      (vu au regard : « Aujourd'hui · Un autre jour » passait sous « Enregistrer le plein », dans la bande de l'encoche) ;
//  B · « Envoyer : 3 articles » et « Prévenir le bureau » tiennent sur UNE ligne (le bouton qui avance prend la plus grande part) ;
//  C · les trois boutons du camion : jamais plus de deux lignes, 14 px à 320 px (ils faisaient trois lignes de 13 px) ;
//  D · « 1 prévu » au singulier ; une unité entre parenthèses ne se détache pas de son nombre ;
//  E · sans camion : une CARTE qui dit quoi faire, pas une phrase grise seule ;
//  F · au téléphone, l'état d'un envoi passe sous son nom dans TOUTES les rangées de « Mes envois » ;
//  G · rien ne glisse de côté, et les cibles tactiles sont ≥ 44 px ;
//  H · « Montant payé » et « Kilomètres au compteur » ont leur champ à la même hauteur (à 360 px le second libellé passe sur deux lignes) ;
//  I · « Il manque à bord · 3 » et « J'ai tout pris · 3 » sur UNE rangée (360 px et plus) ; « à l'atelier 6 » ne laisse pas le chiffre seul ;
//  J · le chef d'équipe : « Fermer » des messages du bureau prend la largeur de la feuille au téléphone.
// PROFILS=iphone,petit,android,mac NUIT=0,1 pour restreindre. ⛔ 127.0.0.1 seulement, un navigateur à la fois. Sort en 1 si un contrôle tombe.
const L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'iphone,petit,android,mac').split(','), NUITS = (process.env.NUIT || '0,1').split(',').map(x => x === '1');
const ev = (c, f, a) => c.p.evaluate(f, a);
const clic = async (c, sel, att) => { const ok = await ev(c, s => { const e = document.querySelector(s); if (!e) return false; e.click(); return true; }, sel); await L.calme(c.p, att || 600); return ok; };
const fermer = async c => { await ev(c, () => { try { fermerPanneau(); } catch (e) {} }); await L.calme(c.p, 300); };
// nombre de lignes de texte d'un élément (les rectangles d'un Range, regroupés par hauteur)
const lignes = (c, sel) => ev(c, s => { const e = document.querySelector(s); if (!e) return -1; const r = document.createRange(); r.selectNodeContents(e); return new Set([...r.getClientRects()].filter(x => x.width > 1).map(x => Math.round(x.top))).size; }, sel);
(async () => {
  let touches = 0;
  for (const profil of PROFILS) for (const nuit of NUITS) {
    const nom = profil + (nuit ? ' nuit' : ' jour'), tel = L.PROFILS[profil].w <= 760;   // « téléphone » : la largeur où les règles ≤ 760 px s'appliquent (pas l'appareil)
    const c = await L.ouvrir({ profil, qui: 'sm', calme: true, nuit }); await L.aller(c.p, 'moncamion');
    const pop = await ev(c, () => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, boutons: document.querySelectorAll('.vh-cam-b').length, manque: document.querySelectorAll('[data-vis="camion-manque"] .mc-l').length, envois: document.querySelectorAll('.mc-l .mc-dr').length }));
    v(nom + ' · population : l\'écran Mon camion, ses trois boutons, trois lignes à compléter, deux envois', pop.h1 === 'Mon camion' && pop.boutons === 3 && pop.manque === 3 && pop.envois === 2, pop);

    // ── A · le pied collant touche le bas de la feuille ────────────────────────────────────────────────
    let deborde = 0;
    for (const [lib, sel] of [['plein', '.vh-cam-b[data-vx^=plein]'], ['compteur', '.vh-cam-b[data-vx^=km]'], ['souci', '.vh-cam-b[data-vx^=souci]']]) {
      await clic(c, sel, 700); touches++;
      const m = await ev(c, () => { const pan = document.querySelector('#calque .panneau'), pied = pan && pan.querySelector('.vh-pied'); if (!pan || !pied) return null; pan.scrollTop = 0;
        const rp = pan.getBoundingClientRect(), rf = pied.getBoundingClientRect(), haut = pan.scrollHeight > pan.clientHeight + 2, x = rf.left + rf.width / 2, y = rp.bottom - 3, e = document.elementFromPoint(x, y);
        return { haut, ecart: Math.round((rp.bottom - rf.bottom) * 10) / 10, dessous: !!e && pied.contains(e), rendu: rf.height }; });
      v(nom + ' · ' + lib + ' : la feuille a son pied (« vh-pied »)', !!m, m);
      if (m && m.haut) { deborde++; v(nom + ' · ' + lib + ' : le pied touche le bas de la feuille (écart ' + m.ecart + ' px) et c\'est lui qu\'on touche au ras du bas', m.ecart <= 1.5 && m.dessous, m); }
      if (lib === 'plein') { const h = await ev(c, () => { const a = document.getElementById('vx-m'), b = document.getElementById('vx-km'); return a && b ? { m: Math.round(a.getBoundingClientRect().top), km: Math.round(b.getBoundingClientRect().top) } : null; });
        /* côte à côte : même hauteur ; empilés (320 px) : l'alignement va de soi */ v(nom + ' · plein : « Montant payé » et « Kilomètres au compteur » ont leur champ à la même hauteur', !!h && (Math.abs(h.m - h.km) <= 1 || h.km >= h.m + 40), h); }
      /* L · les exemples des champs de la feuille tiennent en entier (vu au regard : « …sur la roca » coupé à 360 et 320 px) */
      { const pl = await ev(c, () => { const out = []; for (const i of document.querySelectorAll('#calque .panneau input[placeholder]')) { const cs = getComputedStyle(i), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; const utile = i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); out.push({ ex: i.placeholder, texte: Math.round(cv.measureText(i.placeholder).width), utile: Math.round(utile) }); } return out; });
        v(nom + ' · ' + lib + ' : ' + pl.length + ' exemple(s) de champ, tous visibles en entier', pl.every(x => x.texte <= x.utile), pl.filter(x => x.texte > x.utile)); }
      if (lib === 'plein') { /* K · empilés (≤ 340 px), la ligne « toutes taxes comprises » ne colle pas au libellé du champ suivant (vue au regard : on la lisait comme son titre) */
        const k = await ev(c, () => { const pet = document.querySelector('#vx-m ~ small'), suiv = document.querySelector('#vx-km'), lib = suiv && suiv.closest('label'); if (!pet || !lib) return null; const rp = pet.getBoundingClientRect(), rl = lib.getBoundingClientRect(); return { empile: rl.top > rp.bottom - 2, air: Math.round((rl.top - rp.bottom) * 10) / 10, petit: rp.height > 0 }; });
        if (k && k.empile) v(nom + ' · plein : de l\'air (≥ 10 px) entre « toutes taxes comprises » et le champ suivant', k.air >= 10, k);
        else v(nom + ' · plein : champs côte à côte, la ligne d\'aide est sous son champ', !!k && k.petit, k); }
      await fermer(c);
    }
    if (tel) v(nom + ' · …au moins une feuille déborde (sinon le contrôle ne regardait rien)', deborde >= 1, deborde);

    // ── B · le bouton qui avance tient sur une ligne ───────────────────────────────────────────────────
    await clic(c, '[data-mat=prise]', 700); touches++;
    const b1 = await lignes(c, '[data-mat=envoyer]'), t1 = await ev(c, () => (document.querySelector('[data-mat=envoyer]') || {}).textContent);
    v(nom + ' · « ' + (t1 || '').trim() + ' » tient sur UNE ligne', b1 === 1, { lignes: b1 }); await fermer(c);
    await clic(c, '.mc-duo [data-mat=manque]', 700); touches++;
    const b2 = await lignes(c, '[data-mat=menvoyer]'); v(nom + ' · « Prévenir le bureau » tient sur UNE ligne (grisé aussi)', b2 === 1, { lignes: b2 }); await fermer(c);

    // ── C · les trois boutons du camion ───────────────────────────────────────────────────────────────
    const tr = await ev(c, () => [...document.querySelectorAll('.vh-cam-b')].map(b => { const r = document.createRange(); r.selectNodeContents(b); return { t: b.textContent.trim(), l: new Set([...r.getClientRects()].map(x => Math.round(x.top))).size, fs: parseFloat(getComputedStyle(b).fontSize), w: Math.round(b.getBoundingClientRect().width) }; }));
    v(nom + ' · trois boutons : deux lignes au plus' + (['petit', 'android'].includes(profil) ? ', 14 px' : ''), tr.length === 3 && tr.every(b => b.l <= 2 && (!['petit', 'android'].includes(profil) || b.fs >= 14)), tr);

    // ── D · « 1 prévu », l'unité reste collée ─────────────────────────────────────────────────────────
    await clic(c, '[data-mat=bord]', 500);
    const tx = await ev(c, () => (document.querySelector('.mc-liste:not([data-vis])') || document.querySelector('#contenu')).innerText + '|' + [...document.querySelectorAll('.mc-l b')].map(b => b.textContent).join('|'));
    v(nom + ' · « 1 prévu : le compte y est » (singulier) et « 2 prévus » (pluriel)', /\b1 prévu\s:/.test(tx) && !/\b1 prévus/.test(tx) && /\b2 prévus/.test(tx), tx.replace(/\n/g, ' / ').slice(0, 400));
    v(nom + ' · « (0,5 L) » : l\'unité ne se détache pas de son nombre', await ev(c, () => [...document.querySelectorAll('.mc-l b')].some(b => b.textContent.includes('(0,5 L)'))));
    await clic(c, '[data-mat=bord]', 400);

    // ── I · la rangée « Il manque à bord » et les sous-lignes ─────────────────────────────────────────
    const ra = await ev(c, () => { const t = document.querySelector('.mc-tete-c'), h = t && t.querySelector('h3'), b = t && t.querySelector('.btn'); return h && b ? { h: Math.round(h.getBoundingClientRect().top), b: Math.round(b.getBoundingClientRect().top), hh: Math.round(h.getBoundingClientRect().height) } : null; });
    if (profil !== 'petit') v(nom + ' · « Il manque à bord · 3 » et « J\'ai tout pris · 3 » sur la même rangée', !!ra && Math.abs(ra.h - ra.b) <= 20 && ra.hh < 30, ra);
    const nb = await ev(c, () => [...document.querySelectorAll('[data-vis="camion-manque"] .mc-l .fo-n .gris')].map(e => /atelier\u00a0\d/.test(e.textContent) && /sur\u00a0\d/.test(e.textContent)));
    v(nom + ' · « à l\'atelier 6 » et « sur 3 » gardent leur chiffre collé (3 lignes)', nb.length === 3 && nb.every(Boolean), nb);

    // ── F · l'état d'un envoi passe sous son nom (téléphone) ──────────────────────────────────────────
    if (tel) { const r = await ev(c, () => [...document.querySelectorAll('.mc-l')].filter(l => l.querySelector('.mc-dr')).map(l => { const n = l.querySelector('.fo-n').getBoundingClientRect(), d = l.querySelector('.mc-dr').getBoundingClientRect(); return { sous: d.top >= n.bottom - 1 }; }));
      v(nom + ' · « Mes envois » : l\'état passe sous le nom dans les ' + r.length + ' rangées', r.length === 2 && r.every(x => x.sous), r); }

    // ── G · rien ne glisse de côté, cibles ≥ 44 px ────────────────────────────────────────────────────
    const d = await L.deborde(c); v(nom + ' · la page ne glisse pas de côté', d.bouge === 0 && d.seconde <= d.largeur + 1, d);
    if (tel) { const g = await L.doigts(c.p, '#contenu'); v(nom + ' · cibles tactiles ≥ 44 px, champs ≥ 16 px', g.petits.length === 0 && g.champs.length === 0, g); }

    // ── E · sans camion ───────────────────────────────────────────────────────────────────────────────
    await ev(c, () => { window.__lx = LIEUX.slice(); for (let i = LIEUX.length - 1; i >= 0; i--) if (LIEUX[i].type === 'vehicule') LIEUX.splice(i, 1); rendre(); }); await L.calme(c.p, 500);
    const e = await ev(c, () => { const k = document.querySelector('#contenu .mc-ok'); return { h1: (document.querySelector('#contenu h1') || {}).textContent, carte: k ? k.innerText.replace(/\s+/g, ' ') : '' }; });
    v(nom + ' · sans camion : une carte qui dit quoi faire', e.h1 === 'Mon camion' && /Aucun camion ne t’est confié pour l’instant\. Demande au bureau/.test(e.carte), e);
    await ev(c, () => { LIEUX.length = 0; window.__lx.forEach(l => LIEUX.push(l)); });
    if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  for (const profil of PROFILS.filter(p => L.PROFILS[p].w <= 760)) { const nom = profil + ' jour · chef d\'équipe', c = await L.ouvrir({ profil, qui: 'kb', calme: true }); await L.aller(c.p, 'moncamion');
    await clic(c, '[data-mat=messages]', 700); touches++;
    const m = await ev(c, () => { const pan = document.querySelector('#calque .panneau'), b = pan && pan.querySelector('.fo-pied .btn'); if (!b) return null; const cs = getComputedStyle(pan), util = pan.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return { bouton: Math.round(b.getBoundingClientRect().width), utile: Math.round(util), titre: (pan.querySelector('h2') || {}).textContent }; });
    v(nom + ' · « Messages du bureau » : « Fermer » prend la largeur de la feuille', !!m && /Messages? du bureau/.test(m.titre) && m.bouton >= m.utile * 0.9, m);
    if (c.err.length) console.log(c.err.slice(0, 3)); v(nom + ' · zéro erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c); }
  console.log('\n  ' + touches + ' gestes joués');
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
