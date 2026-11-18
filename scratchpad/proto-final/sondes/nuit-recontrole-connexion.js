// RECONTRÔLE ADVERSE (restes « nuit », tour 1) : l'écran de connexion de nuit, vide PUIS rempli, comparé au jour.
// La planche du correcteur le montrait presque éteint (« Bienvenue », la phrase d'aide et le champ très pâles) : est-ce la capture prise au milieu
// de l'entrée, ou le vrai rendu ? On attend la fin de l'animation, on lit pour chaque texte la couleur CALCULÉE mêlée à l'opacité de TOUS ses
// ancêtres (une opacité posée sur la carte entière réduit aussi son texte) et on la compare au fond réel.
//   CAP=/dossier PROFILS=mac,iphone node scratchpad/proto-final/sondes/nuit-recontrole-connexion.js      ⛔ 127.0.0.1 seulement.
const path = require('path'), L = require('../lib.js'), v = L.v;
const PROFILS = (process.env.PROFILS || 'mac,iphone').split(','), CAP = process.env.CAP || '';
const MESURE = () => {
  const num = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,\/]+/).map(Number); return { r: p[0], g: p[1], b: p[2], a: p[3] === undefined ? 1 : p[3] }; };
  const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c.r) + .7152 * f(c.g) + .0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const sur = (a, b) => ({ r: a.r * a.a + b.r * (1 - a.a), g: a.g * a.a + b.g * (1 - a.a), b: a.b * a.a + b.b * (1 - a.a), a: 1 });
  const racine = document.getElementById('cnx'); if (!racine) return null;
  const lire = e => { const ch = []; for (let x = e; x; x = x.parentElement) ch.unshift(x); let bg = { r: 11, g: 20, b: 38, a: 1 }, op = 1;
    for (const x of ch.slice(0, -1)) { const cs = getComputedStyle(x), c = num(cs.backgroundColor); op *= parseFloat(cs.opacity); if (c && c.a > 0) bg = sur({ ...c, a: c.a }, bg); }
    const cs = getComputedStyle(e), fg = num(cs.color); op *= parseFloat(cs.opacity); const propre = num(cs.backgroundColor); if (propre && propre.a > 0) bg = sur(propre, bg);
    /* un bouton ou un champ porte son PROPRE fond : le texte se mesure dessus (premier essai : « Continuer » à 1,05:1, faux) */
    const fgE = sur({ ...fg, a: fg.a * op }, bg); return { r: +ratio(fgE, bg).toFixed(2), op: +op.toFixed(2) }; };
  const out = []; const vus = new Set();
  for (const e of racine.querySelectorAll('h1,h2,p,label,small,span,button,input,a')) { const t = (e.value || e.placeholder || e.textContent || '').replace(/\s+/g, ' ').trim(); if (!t || t.length > 90) continue;
    const r = e.getBoundingClientRect(); if (r.width < 8 || r.height < 8 || getComputedStyle(e).visibility === 'hidden') continue; if (e.children.length && e.tagName !== 'BUTTON' && e.tagName !== 'A' && e.tagName !== 'LABEL') continue;
    const k = t.slice(0, 30); if (vus.has(k)) continue; vus.add(k); out.push({ t: t.slice(0, 40), tag: e.tagName.toLowerCase(), ...lire(e) }); }
  return out; };
(async () => {
  let n = 0;
  for (const nuit of [false, true]) for (const profil of PROFILS) {
    const c = await L.ouvrir({ profil, nuit, qui: null }), tag = `connexion ${profil} ${nuit ? 'nuit' : 'jour'}`;
    await L.calme(c.p, 4500);
    await c.p.waitForTimeout(1500); const m = await c.p.evaluate(MESURE); v(`${tag} : l'écran de connexion est là (${m ? m.length : 0} textes)`, !!m && m.length >= 4, m); if (!m) { await L.fin(c); continue; }
    n += m.length; for (const x of m) { const champ = x.tag === 'input'; v(`${tag} · « ${x.t} » ${champ ? '(texte d\'aide du champ)' : ''} ≥ ${champ ? 3 : 4.5}:1 (${x.r}, opacité ${x.op})`, x.r >= (champ ? 3 : 4.5), x); }
    if (CAP) await L.capture(c, path.join(CAP, `cnx-${profil}-${nuit ? 'nuit' : 'jour'}-vide.png`));
    await L.fin(c);
  }
  v(`population : ${n} textes lus sur ${PROFILS.length * 2} écrans de connexion`, n >= 8 * PROFILS.length);
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('✗ la sonde a jeté :', e.message); try { await L.fermer(); } catch (x) {} process.exit(1); });
