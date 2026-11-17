// BOUTON PRINCIPAL DE NUIT (voie « nuit », 17 novembre 2026) — décision du chef : de nuit le bouton principal prend l'encre du thème
// (presque blanc, `--fill:#e9eef8; --on-fill:#0b1426`), le miroir exact du jour ; ce qui n'est PAS un bouton d'action (puce choisie,
// repère, avatar, bulle) garde son bleu nuit par `--fill-doux`.
//   node scratchpad/proto-final/sondes/nuit-bouton-principal.js
//   QUI=marc,julie,sm,client PROFILS=mac,iphone CAP=/dossier node …     # sous-ensemble ; CAP = captures (hors dépôt)
// Population d'abord (un menu vide ferait tout passer) ; puis, sur CHAQUE rubrique de CHAQUE rôle, de nuit :
//   · tout bouton qui porte l'aplat principal : texte ≥ 4,5:1 ET aplat contre le fond de sa carte ≥ 3:1 ;
//   · aucun bouton « Annuler / Fermer… » (secondaire, `.gris`) plus clair que le principal de son écran ;
//   · aucun bouton d'ACTION (balise button/a, libellé de plus d'un mot ou icône) resté dans l'ancien bleu nuit sans être une puce choisie.
// ⛔ 127.0.0.1 seulement.
const path = require('path'), L = require('../lib.js'), v = L.v;
const QUI = (process.env.QUI || 'marc,julie,sm').split(','), PROFILS = (process.env.PROFILS || 'mac,iphone').split(','), CAP = process.env.CAP || '';
const MESURE = () => {
  const num = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const sur = (a, b) => ({ r: a.r * a.a + b.r * (1 - a.a), g: a.g * a.a + b.g * (1 - a.a), b: a.b * a.a + b.b * (1 - a.a), a: 1 });
  const fondDe = e => { let bg = { r: 11, g: 20, b: 38, a: 1 }; const chaine = []; for (let x = e.parentElement; x; x = x.parentElement) chaine.unshift(x);
    for (const x of chaine) { const c = num(getComputedStyle(x).backgroundColor); if (c && c.a > 0) bg = sur(c, bg); } return bg; };
  const vis = e => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e); return r.width > 20 && r.height > 20 && cs.visibility !== 'hidden' && cs.display !== 'none' && parseFloat(cs.opacity) > .5 && (e.offsetParent || cs.position === 'fixed'); };
  const out = { principaux: [], anciens: [], gris: [] };
  for (const e of document.querySelectorAll('button, a, [role=button]')) {
    if (!vis(e) || e.disabled) continue;
    const cs = getComputedStyle(e), bg = num(cs.backgroundColor), fg = num(cs.color); if (!bg || bg.a < .9) continue;
    const lib = (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), cl = e.className && e.className.baseVal === undefined ? String(e.className).slice(0, 40) : '';
    const hex = [bg.r, bg.g, bg.b].join(',');
    if (hex === '233,238,248') { const f = fondDe(e); out.principaux.push({ lib, cl, choisi: e.getAttribute('aria-pressed') === 'true' || e.getAttribute('aria-selected') === 'true', texte: +ratio(fg, bg).toFixed(2), contraste: +ratio(bg, f).toFixed(2) }); }
    else if (hex === '44,61,99') out.anciens.push({ lib, cl, pressed: e.getAttribute('aria-pressed') || e.getAttribute('aria-selected') || '', etape: /^\d+$/.test(lib) || lib.length <= 2 });
    else if (/gris/.test(cl)) out.gris.push({ lib, cl, lum: +lum(bg).toFixed(3) });
  }
  out.lumPrincipal = lum({ r: 233, g: 238, b: 248 });
  return out; };
module.exports = { MESURE };
if (require.main === module) (async () => {
  let total = 0, aplats = 0, doux = 0; const cles = new Set();
  for (const qui of QUI) for (const profil of PROFILS) {
    const client = qui === 'client', c = await L.ouvrir({ profil, qui: client ? 'marc' : qui, nuit: true }), tag = `${qui} ${profil} nuit`;
    if (client) { await c.p.evaluate(() => rlChanger('client', { cli: 'vp', ec: 'accueil', muet: true })); await L.calme(c.p, 500); }
    const lignes = await c.p.evaluate(() => rlLignes().map(l => ({ k: l.k, l: l.l })));
    v(`${tag} : population — le menu a des rubriques (${lignes.length})`, lignes.length >= 4);
    v(`${tag} : on est bien de nuit`, await c.p.evaluate(() => document.documentElement.getAttribute('data-mode') === 'nuit'));
    for (const li of lignes) {
      if (client) { await c.p.evaluate(k => rlChanger('client', { cli: 'vp', ec: k, muet: true }), li.k); await L.calme(c.p, 500); } else { await L.aller(c.p, li.k); await L.calme(c.p, 400); }
      const cadre = await c.p.evaluate(() => !!document.querySelector('#cmpt:not([hidden]) iframe, #opdz:not([hidden]) iframe'));
      const cibles = [{ f: c.p, nom: li.l }]; if (cadre) { const f = L.cadre(c.p); if (f) cibles.push({ f, nom: li.l + ' (cadre)' }); }
      for (const z of cibles) {
        const m = await z.f.evaluate(MESURE).catch(() => null); if (!m) continue; total++; aplats += m.principaux.length;
        for (const b of m.principaux) { const k = tag + '|' + b.lib; if (cles.has(k)) continue; cles.add(k);
          v(`${tag} · ${z.nom} · « ${b.lib} » : texte ≥ 4,5:1 (${b.texte})`, b.texte >= 4.5, b);
          v(`${tag} · ${z.nom} · « ${b.lib} » : ce n'est pas une puce choisie (elle garde son bleu nuit)`, !b.choisi, b);
          v(`${tag} · ${z.nom} · « ${b.lib} » : aplat contre le fond de sa carte ≥ 3:1 (${b.contraste})`, b.contraste >= 3, b); }
        for (const g of m.gris) v(`${tag} · ${z.nom} · « ${g.lib} » (secondaire) n'est pas plus clair que le bouton principal`, g.lum < m.lumPrincipal, g);
        doux += m.anciens.length; for (const a of m.anciens) { const ok = a.pressed === 'true' || a.pressed === '' && (a.etape || /pastille|chip|puce|av|rl-|cx-|dt-|pm-|cb-|cr-/.test(a.cl)) || /true/.test(a.pressed);
          v(`${tag} · ${z.nom} · « ${a.lib} » garde le bleu nuit : c'est une puce choisie, un repère ou un avatar, pas un bouton d'action`, ok, a); }
      }
      if (CAP) { await c.p.waitForTimeout(700); await L.capture(c, path.join(CAP, `${qui}-${profil}-nuit-${li.k}.png`)); }
      if (cadre) { await L.ranger(c.p); await c.p.evaluate(() => { try { if (typeof cmptFermer === 'function') cmptFermer(); } catch (x) {} }); await L.calme(c.p, 300); }
    }
    v(`${tag} : aucune erreur JavaScript`, !c.err.length, c.err.slice(0, 2));
    await L.fin(c);
  }
  v(`population : ${total} écrans lus, ${aplats} aplats principaux, ${doux} éléments restés au bleu nuit (un zéro ne prouverait rien)`, total >= 10 && aplats >= 10 && doux >= 3, { total, aplats, doux });
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('✗ la sonde a jeté :', e.message); await L.fermer(); process.exit(1); });
