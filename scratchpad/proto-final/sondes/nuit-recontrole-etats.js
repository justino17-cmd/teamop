// RECONTRÔLE ADVERSE DU BOUTON PRINCIPAL DE NUIT (restes « nuit », tour 1, 18 novembre 2026).
// La sonde du correcteur (nuit-bouton-principal.js) ne lit que les boutons à l'aplat #e9eef8 ET visibles à plus de 50 % d'opacité :
// elle ne voit donc NI le survol (#fff), NI le bouton désactivé (opacité .4), NI l'appui, NI le focus clavier, NI le bouton du toast.
// Cette sonde-ci les joue, de nuit, sur trois profils, et compte sa population avant de conclure.
//   CAP=/dossier PROFILS=mac,iphone,android node scratchpad/proto-final/sondes/nuit-recontrole-etats.js
// ⛔ 127.0.0.1 seulement.
const path = require('path'), L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(','), CAP = process.env.CAP || '';
const RUBRIQUES = ['accueil', 'interventions', 'devis', 'clients', 'vehicules'];
const LUM = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const RATIO = (a, b) => { const x = LUM(a), y = LUM(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
// ⚠️ .btn porte `transition: opacity .2s` : lue tout de suite, l'opacité d'un bouton qu'on vient d'éteindre vaut encore 1 (premier essai : 54 faux ✗) — on coupe la transition le temps de la lecture.
// la mesure tourne DANS la page : couleurs calculées, mêlées sur le fond réel de l'ancêtre, opacité comprise
const DANS_LA_PAGE = () => {
  const num = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const sur = (a, b) => ({ r: a.r * a.a + b.r * (1 - a.a), g: a.g * a.a + b.g * (1 - a.a), b: a.b * a.a + b.b * (1 - a.a), a: 1 });
  const fondDe = e => { let bg = { r: 11, g: 20, b: 38, a: 1 }; const ch = []; for (let x = e.parentElement; x; x = x.parentElement) ch.unshift(x);
    for (const x of ch) { const c = num(getComputedStyle(x).backgroundColor); if (c && c.a > 0) bg = sur(c, bg); } return bg; };
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 20 && r.height > 20 && cs.visibility !== 'hidden' && cs.display !== 'none' && (e.offsetParent || cs.position === 'fixed'); };
  window.__lire = e => { const cs = getComputedStyle(e), fond = fondDe(e), op = parseFloat(cs.opacity) || 1; let bg = num(cs.backgroundColor), fg = num(cs.color);
    // opacité de l'élément = tout son rendu (aplat ET texte) mêlé au fond de la carte
    const bgE = sur({ ...bg, a: bg.a * op }, fond), fgE = sur({ ...fg, a: fg.a * op }, fond);   // l'opacité d'un élément s'applique au GROUPE (aplat + texte ensemble) : le texte éteint = son encre mêlée au fond de la carte, pas à l'aplat (premier essai : double compte, 24 faux ✗)
    return { bg: [bgE.r, bgE.g, bgE.b], fg: [fgE.r, fgE.g, fgE.b], fond: [fond.r, fond.g, fond.b], op, brut: [bg.r, bg.g, bg.b].join(',') }; };
  const out = [];
  for (const e of document.querySelectorAll('.btn:not(.gris):not(.rouge):not(.vert), .btn-planning, .btnc:not(.clair)')) { if (!vis(e) || e.disabled) continue;
    out.push({ lib: (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 36), i: out.length }); e.setAttribute('data-sonde-p', String(out.length - 1)); }
  return out;
};
(async () => {
  let pop = 0, hov = 0, dis = 0, toast = 0;
  for (const profil of PROFILS) {
    const c = await L.ouvrir({ profil, qui: 'marc', nuit: true }), tag = `marc ${profil} nuit`;
    for (const k of RUBRIQUES) {
      await L.aller(c.p, k); await L.calme(c.p, 400);
      const liste = await c.p.evaluate(DANS_LA_PAGE); pop += liste.length;
      for (const b of liste.slice(0, 4)) {
        const loc = c.p.locator(`[data-sonde-p="${b.i}"]`);
        const repos = await c.p.evaluate(i => window.__lire(document.querySelector(`[data-sonde-p="${i}"]`)), b.i);
        // DÉSACTIVÉ : le bouton « éteint » doit rester lisible (≥ 3:1, c'est un texte de contrôle inactif) ET ne pas ressortir plus qu'un actif
        const desac = await c.p.evaluate(i => { const e = document.querySelector(`[data-sonde-p="${i}"]`); const t0 = e.style.transition; e.style.transition = 'none'; e.setAttribute('disabled', ''); void e.offsetWidth; const r = window.__lire(e); e.removeAttribute('disabled'); e.style.transition = t0; return r; }, b.i); dis++;
        v(`${tag} · ${k} · « ${b.lib} » éteint : opacité réduite (${desac.op})`, desac.op < .8, desac);
        v(`${tag} · ${k} · « ${b.lib} » éteint : texte lisible ≥ 3:1 (${RATIO(desac.fg, desac.bg).toFixed(2)})`, RATIO(desac.fg, desac.bg) >= 3, desac);
        v(`${tag} · ${k} · « ${b.lib} » éteint : l'aplat est moins clair que le bouton actif (${LUM(desac.bg).toFixed(3)} < ${LUM(repos.bg).toFixed(3)})`, LUM(desac.bg) < LUM(repos.bg), { desac, repos });
        // SURVOL (souris seulement : au doigt, le survol reste collé après un appui, cf. règle « survol » du dépôt)
        if (!c.doigt) { await loc.scrollIntoViewIfNeeded().catch(() => {}); await loc.hover({ timeout: 3000 }).catch(() => {}); await c.p.waitForTimeout(350); hov++;
          const s = await c.p.evaluate(i => window.__lire(document.querySelector(`[data-sonde-p="${i}"]`)), b.i);
          v(`${tag} · ${k} · « ${b.lib} » survolé : texte ≥ 7:1 (${RATIO(s.fg, s.bg).toFixed(2)})`, RATIO(s.fg, s.bg) >= 7, s);
          v(`${tag} · ${k} · « ${b.lib} » survolé : reste plus clair que son fond de carte (${RATIO(s.bg, s.fond).toFixed(1)}:1)`, RATIO(s.bg, s.fond) >= 3, s);
          await c.p.mouse.move(2, 2); }
      }
      if (CAP && k === 'vehicules') { await c.p.waitForTimeout(500); await L.capture(c, path.join(CAP, `etats-${profil}-${k}.png`)); }
    }
    // BOUTON DU TOAST (« Annuler » posé par toast(msg,{lib,fn}))
    await c.p.evaluate(() => { toast('Essai de nuit', { lib: 'Annuler', fn: () => {} }); }); await c.p.waitForTimeout(600);
    const t = await c.p.evaluate(() => { const e = document.querySelector('#toast button'); if (!e) return null; const cs = getComputedStyle(e), r = e.getBoundingClientRect(); return { n: 1, w: Math.round(r.width), h: Math.round(r.height), bg: cs.backgroundColor, fg: cs.color, fondToast: getComputedStyle(document.getElementById('toast')).backgroundColor }; });
    v(`${tag} · toast : le bouton « Annuler » existe`, !!t, t); if (t) { toast++; const n = s => s.match(/[\d.]+/g).map(Number).slice(0, 3);
      v(`${tag} · toast : texte du bouton ≥ 4,5:1 (${RATIO(n(t.fg), n(t.bg)).toFixed(2)})`, RATIO(n(t.fg), n(t.bg)) >= 4.5, t);
      v(`${tag} · toast : bouton contre son toast ≥ 3:1 (${RATIO(n(t.bg), n(t.fondToast)).toFixed(2)})`, RATIO(n(t.bg), n(t.fondToast)) >= 3, t); }
    if (CAP) await L.capture(c, path.join(CAP, `etats-${profil}-toast.png`));
    v(`${tag} : aucune erreur JavaScript`, !c.err.length, c.err.slice(0, 2));
    await L.fin(c);
  }
  v(`population : ${pop} boutons principaux vus, ${dis} éteints, ${hov} survolés, ${toast} toasts (un zéro ne prouverait rien)`, pop >= 10 && dis >= 8 && toast >= 1 && (hov >= 8 || PROFILS.every(p => L.PROFILS[p].doigt)));
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(1); });
