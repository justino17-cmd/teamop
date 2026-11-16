// Outils communs des sondes « Tâches » et « Absences et congés » de la campagne du 16 novembre 2026.
// Balayage : recenser depuis le DOM, toucher chaque élément dans une page NEUVE, dire ce que le geste a fait.
const L = require('../../lib.js');
exports.L = L;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-taches-absences/';
// marque chaque élément qui répond d'un data-sonde="i" (mêmes règles que lib.gestes) et rend la liste
exports.marquer = (p, zone) => p.evaluate(z => { const R = document.querySelector(z || '#contenu') || document.body, vus = [], sig = new Set(); document.querySelectorAll('[data-sonde]').forEach(e => e.removeAttribute('data-sonde'));
  for (const e of R.querySelectorAll('*')) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || (!e.offsetParent && cs.position !== 'fixed')) continue;
    const clic = e.tagName === 'BUTTON' || e.tagName === 'A' || e.tagName === 'SUMMARY' || e.tagName === 'SELECT' || (e.tagName === 'INPUT' && /checkbox|radio|button|submit|date|time|text|number|search/.test(e.type || 'text')) || e.tagName === 'TEXTAREA' || e.getAttribute('role') === 'button' || ([...e.attributes].some(a => /^data-[a-z0-9-]+$/.test(a.name)) && cs.cursor === 'pointer');
    if (!clic || e.disabled || e.getAttribute('aria-disabled') === 'true') continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const d = [...e.attributes].filter(a => a.name.startsWith('data-') && a.name !== 'data-sonde').map(a => a.name + '=' + a.value.slice(0, 40)).join(' ');
    const lib = (e.getAttribute('aria-label') || e.value && e.tagName !== 'SELECT' && e.tagName !== 'BUTTON' && e.value || e.textContent || e.title || e.placeholder || '').replace(/\s+/g, ' ').trim().slice(0, 60), s = e.tagName + '|' + lib + '|' + d + '|' + (e.id || '');
    if (sig.has(s)) continue; sig.add(s); e.setAttribute('data-sonde', String(vus.length)); vus.push({ i: vus.length, balise: e.tagName, lib, data: d, id: e.id, sansNom: !lib, l: Math.round(r.width), h: Math.round(r.height) }); }
  return vus; }, zone);
// recharge la page dans l'état de départ (même adresse, session ouverte) et ferme le guide des nouveautés
exports.neuf = async (c, hash) => { await c.p.evaluate(h => { location.hash = h || ''; }, hash); await c.p.reload({ waitUntil: 'load' }); await c.p.waitForTimeout(900);
  await c.p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await c.p.waitForTimeout(200); await L.calme(c.p, 300); };
exports.lire = p => p.evaluate(() => { const t = s => { const e = document.querySelector(s); return e && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed') ? (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 100) : ''; };
  return { hash: location.hash, h1: t('#contenu h1'), panneau: t('#calque .panneau h2') || t('#calque .panneau') , toast: t('#toast'), calque: !!document.querySelector('#calque .panneau'), atelier: (() => { const z = document.getElementById('opdz'); return !!z && !z.hidden; })(), compta: !!document.querySelector('#cmpt') && document.querySelector('#cmpt').offsetParent !== null, long: (document.getElementById('contenu') || {}).innerHTML ? document.getElementById('contenu').innerHTML.length : 0, longCalque: (document.getElementById('calque') || {}).innerHTML ? document.getElementById('calque').innerHTML.length : 0, url: location.href.replace(/^.*\//, '') }; });
exports.diff = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);
