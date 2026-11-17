// RELEVÉ DE LA BOÎTE MAIL : le module de courrier vit dans un shadow DOM, que mots-releve.js ne lit pas (innerText ne traverse pas une ombre).
// On entre dans les racines ouvertes, on lit chaque texte VISIBLE, puis on joue chaque geste visible (deux étages : la fenêtre ouverte par un geste a ses propres gestes).
// Même sortie que mots-releve.js (final-mots/<rôle>-<profil>-courrier.json) pour que l'analyse la lise. ⛔ 127.0.0.1, boîte fictive.
// usage : node mots-courrier.js [marc|julie] [profil] [--max N]
const L = require('../lib.js'); const fs = require('fs');
const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/final-mots/';
const args = process.argv.slice(2).filter(a => !a.startsWith('--')); const QUI = args[0] || 'marc', PROFIL = args[1] || 'mac'; const iMax = process.argv.indexOf('--max'); const MAX = iMax > 0 ? +process.argv[iMax + 1] : 70;
const LIRE = () => { const racines = []; const cherche = (n) => { for (const e of n.querySelectorAll('*')) { if (e.shadowRoot) { racines.push(e.shadowRoot); cherche(e.shadowRoot); } } }; cherche(document); racines.unshift(document);
  const lignes = [], attrs = [], vis = e => !!(e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden';
  for (const r of racines) { for (const e of r.querySelectorAll('*')) { if (/^(STYLE|SCRIPT|NOSCRIPT|TEMPLATE|HEAD|META|LINK)$/.test(e.tagName) || !vis(e)) continue; if (r === document && !e.closest('#contenu, #calque, #toast, #fenetre')) continue;
      let t = ''; for (const c of e.childNodes) if (c.nodeType === 3) t += c.nodeValue; t = t.replace(/[ \t\r\n\f\v]+/g, ' ').trim(); if (t) lignes.push(t);
      for (const a of ['aria-label', 'title', 'placeholder', 'alt']) { const v = (e.getAttribute(a) || '').replace(/[ \t\r\n\f\v]+/g, ' ').trim(); if (v) attrs.push(a + ' : ' + v); }
      if (e.tagName === 'SELECT') for (const o of e.options) { const v = o.textContent.replace(/[ \t\r\n\f\v]+/g, ' ').trim(); if (v) attrs.push('option : ' + v); } } }
  return { lignes: [...new Set(lignes)], attrs: [...new Set(attrs)] }; };
const GESTES = () => { const racines = []; const cherche = (n) => { for (const e of n.querySelectorAll('*')) { if (e.shadowRoot) { racines.push(e.shadowRoot); cherche(e.shadowRoot); } } }; cherche(document);
  const vis = e => !!(e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden'; const out = [], sig = new Map();
  racines.forEach((r, ri) => { for (const e of r.querySelectorAll('button, [role=button], [role=tab], [role=menuitem], [role=option], summary, a[href], input[type=checkbox], input[type=radio], select')) { if (!vis(e) || e.disabled) continue; const lab = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/[ \t\r\n\f\v]+/g, ' ').trim().slice(0, 60); const s = ri + '|' + e.tagName + '|' + lab; const n = sig.get(s) || 0; sig.set(s, n + 1); out.push({ s, n, lab }); } });
  return out; };
const CLIQUER = ({ s, n }) => { const racines = []; const cherche = (x) => { for (const e of x.querySelectorAll('*')) { if (e.shadowRoot) { racines.push(e.shadowRoot); cherche(e.shadowRoot); } } }; cherche(document);
  const vis = e => !!(e.getClientRects().length) && getComputedStyle(e).visibility !== 'hidden'; const sig = new Map(); let r2 = null;
  racines.forEach((r, ri) => { for (const e of r.querySelectorAll('button, [role=button], [role=tab], [role=menuitem], [role=option], summary, a[href], input[type=checkbox], input[type=radio], select')) { if (!vis(e) || e.disabled) continue; const lab = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/[ \t\r\n\f\v]+/g, ' ').trim().slice(0, 60); const k = ri + '|' + e.tagName + '|' + lab; const c = sig.get(k) || 0; sig.set(k, c + 1); if (k === s && c === n && !r2) r2 = e; } });
  if (!r2) return 'absent'; if (r2.tagName === 'SELECT') { const o = [...r2.options].find(o => !o.selected); if (!o) return 'rien'; r2.value = o.value; r2.dispatchEvent(new Event('change', { bubbles: true })); return 'select'; } r2.scrollIntoView({ block: 'center' }); r2.click(); return 'ok'; };
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI }); const p = c.p; const res = { qui: QUI, profil: PROFIL, ecrans: {} }; const dial = []; p.on('dialog', d => { dial.push(d.message()); d.dismiss().catch(() => {}); }); await p.evaluate(() => { window.open = () => null; });
  const ouvrir = async () => { await L.aller(p, 'boiteMail'); await p.waitForTimeout(4500); };
  await ouvrir(); const base = await p.evaluate(LIRE); const rec = { lignes: base.lignes, attrs: base.attrs, gestes: [], cadres: {} }; res.ecrans.boiteMail = rec;
  const liste = await p.evaluate(GESTES); console.log('boîte mail : ' + base.lignes.length + ' lignes, ' + liste.length + ' gestes visibles');
  const vuTexte = new Set(base.lignes); let n = 0; const dedans = [];
  for (const g of liste) { if (n++ >= MAX) { rec.coupe = true; break; } if (/déconnecter|supprimer le compte|vider/i.test(g.lab)) continue;
    await ouvrir(); const avant = new Set((await p.evaluate(LIRE)).lignes); dial.length = 0; const r = await p.evaluate(CLIQUER, g); if (r !== 'ok' && r !== 'select') continue; await p.waitForTimeout(600);
    const ap = await p.evaluate(LIRE); const neuf = ap.lignes.filter(x => !avant.has(x)); const toast = await p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.trim() : ''; });
    const e = { geste: g.lab, niveau: 1, nouveau: neuf.slice(0, 120), attrs: ap.attrs.filter(a => !base.attrs.includes(a)).slice(0, 60) }; if (toast) e.toast = toast; if (dial.length) e.dialogue = dial.slice(); rec.gestes.push(e);
    // le second étage : ce que ce geste a OUVERT (une fenêtre, un menu) a ses propres gestes
    if (neuf.length >= 3) { const l2 = (await p.evaluate(GESTES)).filter(x => !liste.some(y => y.s === x.s && y.n === x.n)).slice(0, 14);
      for (const g2 of l2) { if (/déconnecter|supprimer|envoyer|vider/i.test(g2.lab) && !/ranger|archiver/i.test(g2.lab)) continue; await ouvrir(); const r1 = await p.evaluate(CLIQUER, g); if (r1 !== 'ok') break; await p.waitForTimeout(500); const av2 = new Set((await p.evaluate(LIRE)).lignes); dial.length = 0; const r2 = await p.evaluate(CLIQUER, g2); if (r2 !== 'ok' && r2 !== 'select') continue; await p.waitForTimeout(500);
        const ap2 = await p.evaluate(LIRE); const neuf2 = ap2.lignes.filter(x => !av2.has(x)); const t2 = await p.evaluate(() => { const t = document.getElementById('toast'); return t && t.classList.contains('on') ? t.textContent.trim() : ''; }); const e2 = { geste: g.lab + ' › ' + g2.lab, niveau: 2, nouveau: neuf2.slice(0, 80), attrs: ap2.attrs.filter(a => !base.attrs.includes(a)).slice(0, 40) }; if (t2) e2.toast = t2; if (dial.length) e2.dialogue = dial.slice(); rec.gestes.push(e2); } } }
  res.erreurs = c.err; fs.writeFileSync(D + QUI + '-' + PROFIL + '-courrier.json', JSON.stringify(res)); console.log('FIN courrier', rec.gestes.length, 'gestes, erreurs de page', c.err.length); await L.fin(c); await L.fermer();
})().catch(e => { console.error('ÉCHEC', e); process.exit(2); });
