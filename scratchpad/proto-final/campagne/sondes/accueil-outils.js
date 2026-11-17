// Outils communs des sondes « accueil » : toucher CHAQUE geste recensé d'un écran et noter où il mène.
const L = require('../../lib.js');
exports.L = L;
exports.CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-accueil/';
// pose data-campg=<n> sur chaque élément qui répond (même critère que lib.gestes, même dédoublonnage) et rend la liste
exports.marquer = (p, zone) => p.evaluate(z => { const R = document.querySelector(z || '#contenu') || document.body, vus = [], sig = new Set(); let n = 0;
  R.querySelectorAll('[data-campg]').forEach(e => e.removeAttribute('data-campg'));
  for (const e of R.querySelectorAll('*')) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || (!e.offsetParent && cs.position !== 'fixed')) continue;
    const clic = e.tagName === 'BUTTON' || e.tagName === 'A' || e.tagName === 'SUMMARY' || (e.tagName === 'INPUT' && /checkbox|radio|button|submit/.test(e.type)) || e.getAttribute('role') === 'button' || ([...e.attributes].some(a => /^data-[a-z0-9-]+$/.test(a.name)) && cs.cursor === 'pointer');
    if (!clic || e.disabled || e.getAttribute('aria-disabled') === 'true') continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const d = [...e.attributes].filter(a => a.name.startsWith('data-') && a.name !== 'data-campg').map(a => a.name + '=' + a.value.slice(0, 60)).join(' ');
    const lib = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 90), s = e.tagName + '|' + lib + '|' + d;
    if (sig.has(s)) continue; sig.add(s); e.setAttribute('data-campg', n); vus.push({ n, balise: e.tagName, lib, data: d, sansNom: !lib, l: Math.round(r.width), h: Math.round(r.height) }); n++; }
  return vus; }, zone);
// ce qui recouvre le centre d'un élément (pour dire POURQUOI un toucher n'a pas porté)
exports.pile = (p, sel) => p.evaluate(s => { const e = document.querySelector(s); if (!e) return 'absent'; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  return document.elementsFromPoint(x, y).slice(0, 4).map(k => k.tagName + (k.id ? '#' + k.id : '') + '.' + String(k.className).slice(0, 30)).join(' < ') + ' @' + Math.round(x) + ',' + Math.round(y); }, sel);
// état riche : titre, panneau, fenêtre, toast, hash
exports.etat2 = p => p.evaluate(() => { const vis = e => e && (e.offsetParent !== null || getComputedStyle(e).position === 'fixed'); const tx = s => { const e = document.querySelector(s); return vis(e) ? (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 140) : ''; };
  const fen = [...document.querySelectorAll('#calque [role=dialog], #calque .panneau, .modale, .fenetre, #opdz, #cmpt')].filter(vis).map(e => (e.getAttribute('aria-label') || e.querySelector('h1,h2,h3')?.textContent || e.id || e.className).toString().replace(/\s+/g, ' ').trim().slice(0, 80));
  return { hash: location.hash, h1: tx('#contenu h1'), pan: tx('#calque .panneau h2') || tx('#calque .panneau h3') || tx('#calque .panneau'), fen: fen.join(' | '), toast: tx('#toast'), contenu: tx('#contenu').slice(0, 60) }; });
// toucher chacun : rend [{n, lib, data, avant, apres, ok, mene}]
exports.toutToucher = async (c, vue, opt) => { opt = opt || {}; const L = exports.L; await L.aller(c.p, vue); await L.calme(c.p, 400);
  const liste = await exports.marquer(c.p, opt.zone); const sortie = [];
  for (const g of liste) { if (opt.saute && opt.saute(g)) { sortie.push({ ...g, saute: true }); continue; }
    if (opt.reinit) await c.p.evaluate(opt.reinit); await L.aller(c.p, vue); const l2 = await exports.marquer(c.p, opt.zone); const m = l2.find(x => x.lib === g.lib && x.data === g.data);
    if (!m) { sortie.push({ ...g, ok: false, note: 'introuvable au rejeu' }); continue; }
    const sel = `[data-campg="${m.n}"]`; const avant = await exports.etat2(c.p);
    const ok = await L.toucher(c, sel, { delai: 5000 }); let pile = ''; if (!ok) pile = await exports.pile(c.p, sel);
    await c.p.waitForTimeout(opt.attente || 450); const apres = await exports.etat2(c.p);
    sortie.push({ n: g.n, lib: g.lib, data: g.data, balise: g.balise, h: g.h, l: g.l, ok, pile, avant, apres });
    await L.ranger(c.p); }
  return sortie; };
exports.ligne = s => !s.apres ? `✗ #${s.n} ${s.lib.slice(0, 50)} :: ${s.note || 'sans état'}` : s.saute ? `~ ${s.lib}` : `${s.ok ? ' ' : '✗'} #${s.n} ${s.lib.slice(0, 50)} {${s.data.slice(0, 50)}} → hash=${s.apres.hash} h1="${s.apres.h1}" pan="${s.apres.pan.slice(0, 70)}" fen="${s.apres.fen.slice(0, 50)}" toast="${s.apres.toast.slice(0, 50)}"${s.pile ? ' PILE=' + s.pile : ''}`;
