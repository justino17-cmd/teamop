// Outils communs des sondes de l'ATELIER dans le prototype OP GESTION (16 novembre 2026). S'appuie sur ../lib.js.
// Chaque sonde : node atelier-<sujet>.js — rend « N ✓ · M ✗ » et sort en 1 si un contrôle tombe. RACINE=<dossier> la fait lire une COPIE (mutations).
const path = require('path'), L = require('../lib.js');
exports.L = L;
exports.CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/atelier/';
exports.cadre = p => L.cadre(p, /prototype-documents\.html/);
// attend que l'atelier ait posé quelque chose de visible (fenêtre, éditeur) ou ferme : renvoie le cadre
exports.attendreAtelier = async (c, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 8000)) { const f = exports.cadre(c.p); if (f) { try { if (await f.evaluate(() => !!document.querySelector('.voile, #vue-editeur:not([hidden])'))) return f; } catch (e) {} } await c.p.waitForTimeout(100); } return null; };
// ouvre l'atelier par son bouton dans le parent (devis | contrat) depuis la page `ou`, et rend le cadre
exports.ouvrirAtelier = async (c, faire, ou, sel) => { if (ou) await L.aller(c.p, ou); const ok = await L.toucher(c, sel || `[data-opd="${faire}"]`, { delai: 6000 }); if (!ok) return null; return exports.attendreAtelier(c); };
// un devis complet par les gestes de la personne : client, objet, deux articles (quantités), puis « Créer le devis » ; rend {lignes:[{ref,qte,puC,tvaBp}]}
exports.composerDevis = async (c, f, o) => {
  o = o || {}; const clic = async s => { const l = f.locator(s).first(); if (process.env.DEBUG_A) console.log("clic", s, await f.evaluate(x => !!document.querySelector(x), s).catch(e => "ERR " + e.message)); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await c.p.waitForTimeout(150); };
  if (o.client) await clic(`[data-vv="client"][data-id="${o.client}"]`);
  if (o.objet) { await f.locator('#vv-objet').fill(o.objet); await c.p.waitForTimeout(250); }
  for (const a of o.articles || []) { await clic(`[data-vv="art-add"][data-id="${a.ref}"]`); for (let i = 1; i < (a.qte || 1); i++) await clic(`[data-vv="art-plus"][data-id="${a.ref}"]`); }
  await c.p.waitForTimeout(400);
  await clic('[data-act="vierge-creer"]'); await c.p.waitForTimeout(700);
};
// TTC recalculé par la sonde (centimes) : une ligne = quantité × prix HT, la TVA se calcule par taux sur le sous-total HT de ce taux, arrondie au centime
exports.ttc = lignes => { const par = {}; let ht = 0; lignes.forEach(l => { const h = Math.round(l.qte * l.puC); ht += h; par[l.tvaBp] = (par[l.tvaBp] || 0) + h; }); let tva = 0; Object.keys(par).forEach(t => { tva += Math.round(par[t] * (+t) / 10000); }); return ht + tva; };
// les quatre chiffres du haut d'une page (texte brut des .kpi)
exports.kpis = p => p.evaluate(() => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => k.innerText.replace(/\s+/g, ' ').trim()));
exports.cents = L.cents;
// contrastes WCAG dans un document (cadre ou page) : texte direct de chaque élément visible contre son fond RÉEL (couleurs composées de proche en proche, alpha compris) ;
// rend {n, bas:[…]} — n = la population mesurée (un zéro sur une population vide ne prouve rien)
exports.contrastes = (f, zone, seuil, exclure) => f.evaluate(({ z, s, x }) => {
  const R = document.querySelector(z) || document.body, parse = c => { const m = /rgba?\(([^)]+)\)/.exec(c); if (!m) { const k = /color\(srgb ([^)]+)\)/.exec(c); if (!k) return null; const a = k[1].split(/[ /]+/).map(Number); return [a[0] * 255, a[1] * 255, a[2] * 255, a[3] == null ? 1 : a[3]]; } const a = m[1].split(/[ ,\/]+/).map(Number); return [a[0], a[1], a[2], a[3] == null ? 1 : a[3]]; };
  const over = (top, bot) => { const a = top[3] + bot[3] * (1 - top[3]); if (a === 0) return [255, 255, 255, 0]; return [0, 1, 2].map(i => (top[i] * top[3] + bot[i] * bot[3] * (1 - top[3])) / a).concat([a]); };
  const fond = e => { let acc = [255, 255, 255, 1]; const chain = []; for (let x = e; x; x = x.parentElement) chain.push(x); for (const x of chain.reverse()) { const c = parse(getComputedStyle(x).backgroundColor); if (c && c[3] > 0) acc = over(c, acc); } return acc; };
  const lum = c => { const f2 = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f2(c[0]) + .7152 * f2(c[1]) + .0722 * f2(c[2]); };
  let n = 0; const bas = [];
  for (const e of R.querySelectorAll('*')) { if (!e.offsetParent && getComputedStyle(e).position !== 'fixed') continue; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || +cs.opacity < .5 || e.disabled || e.closest('[disabled],[aria-disabled="true"],.grise,svg') || (x && e.closest(x))) continue;
    const t = [...e.childNodes].filter(x => x.nodeType === 3 && x.textContent.trim().length > 1).map(x => x.textContent.trim()).join(' '); if (!t) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight) continue;
    const fg0 = parse(cs.color); if (!fg0) continue; const bg = fond(e), fg = over(fg0, bg), L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + .05) / (Math.min(L1, L2) + .05), gros = parseFloat(cs.fontSize) >= 24 || (parseFloat(cs.fontSize) >= 18.66 && +cs.fontWeight >= 700);
    n++; if (ratio < (gros ? 3 : (s || 4.5))) bas.push(Math.round(ratio * 100) / 100 + ' « ' + t.slice(0, 40) + ' » ' + e.tagName + '.' + String(e.className).slice(0, 30)); }
  return { n, bas: [...new Set(bas)].slice(0, 25) }; }, { z: zone, s: seuil, x: exclure || '' });
