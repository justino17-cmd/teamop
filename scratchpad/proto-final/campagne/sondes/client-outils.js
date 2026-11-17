// Outils de la campagne « espace client » (17 novembre 2026) : ouvrir le prototype NU et passer en Client comme le fait la
// bande « Tester en tant que » (data-rl="role|client"), puis lire l'écran. Le prototype nu garde son échafaudage : on le sait,
// on ne juge pas les bandeaux de revue, seulement ce que le client voit.
const L = require('../../lib.js');
exports.L = L;
// Un doigt (ou une souris) touche ce qui est AU MILIEU de l'écran, comme une personne qui fait défiler : Playwright ne défile que le strict
// nécessaire (le bouton reste sous la barre du bas fixe : « intercepts pointer events », 4 s perdues, faux « geste manqué »). On amène la cible
// au milieu, on vérifie que c'est bien elle (ou son contenu) qui reçoit le point, et on touche CE point ; sinon, le geste d'origine.
const toucher0 = L.toucher;
L.toucher = async (c, cible, opt) => { if (typeof cible !== 'string') return toucher0(c, cible, opt);
  try { const pt = await c.p.evaluate(s => { const e = document.querySelector(s); if (!e) return null; e.scrollIntoView({ block: 'center', inline: 'nearest' }); const r = e.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null;
      const x = r.left + r.width / 2, y = r.top + r.height / 2, t = document.elementFromPoint(x, y); return t && (t === e || e.contains(t)) ? { x, y } : null; }, cible);
    if (pt) { await new Promise(r => setTimeout(r, 120)); if (c.doigt) await c.p.touchscreen.tap(pt.x, pt.y); else await c.p.mouse.click(pt.x, pt.y); await L.calme(c.p, 300); return true; } } catch (e) {}
  return toucher0(c, cible, opt); };
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-client/';
// ouvre le prototype nu, puis bascule en client par le vrai bouton de la bande (ou par rlChanger si la bande est repliée)
exports.client = async (o) => { o = o || {}; const c = await L.ouvrir({ profil: o.profil || 'mac', nuit: !!o.nuit, qui: null, app: false, attente: 1500 });
  const p = c.p;
  // le guide / la visite s'ouvrent parfois seuls : on les ferme par leur bouton
  await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
  await p.evaluate(({ cli, ec }) => { rlChanger('client', { cli: cli || 'vp', ec: ec || 'accueil', muet: true }); }, { cli: o.cli, ec: o.ec });
  await L.calme(p, 600); return c; };
exports.etat = p => p.evaluate(() => { const vis = e => e && e.offsetParent !== null; const c = document.getElementById('contenu');
  return { hash: location.hash, route: typeof route !== 'undefined' ? route : '', role: typeof ROLE !== 'undefined' ? ROLE : '', tab: typeof EC !== 'undefined' ? EC.tab : '',
    h1: (c.querySelector('h1') || {}).textContent || '', texte: c.innerText.replace(/\s+/g, ' ').trim(),
    panneau: (() => { const q = document.querySelector('#calque .panneau'); return q ? q.innerText.replace(/\s+/g, ' ').trim() : ''; })(),
    toast: (() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.trim() : ''; })(),
    plein: !!document.querySelector('#docplein:not([hidden]), .doc-plein, #dp'), }; });
// ouvre le mode application (ce que verrait un vrai utilisateur : pas de bande « Tester en tant que ») puis passe en client
exports.clientApp = async (o) => { o = o || {}; const c = await L.ouvrir({ profil: o.profil || 'mac', nuit: !!o.nuit, qui: 'marc', app: true, attente: 1500 }); const p = c.p;
  await p.evaluate(({ cli, ec }) => { rlChanger('client', { cli: cli || 'vp', ec: ec || 'accueil', muet: true }); }, { cli: o.cli, ec: o.ec }); await L.calme(p, 600); return c; };
// ce qui est ouvert PAR-DESSUS l'écran : fenêtre (panneau), document plein écran, toast
exports.dessus = p => p.evaluate(() => { const vis = e => e && e.offsetParent !== null; const q = document.querySelector('#calque .panneau'), d = document.getElementById('docplein'), t = document.getElementById('toast');
  return { panneau: q ? q.innerText.replace(/\s+/g, ' ').trim().slice(0, 700) : '', panneauTitre: q ? ((q.querySelector('h2') || {}).textContent || '') : '', doc: d ? (d.getAttribute('aria-label') || '') : '',
    toast: t && t.classList.contains('on') ? t.textContent.trim() : '', tab: typeof EC !== 'undefined' ? EC.tab : '', route: typeof route !== 'undefined' ? route : '', hash: location.hash }; });
// referme tout par les gestes de l'application
exports.nettoyer = async p => { await p.evaluate(() => { try { docPleinFermer(); } catch (e) {} try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 150); };
