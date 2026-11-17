// RELEVÉ des textes qui ne sont dans aucune rubrique : l'écran de CONNEXION (et ses suites : mot de passe oublié, compte verrouillé…) et le GUIDE DES NOUVEAUTÉS
// de chaque rôle (carte par carte). Même méthode que mots-releve.js : le texte rendu, lu par le navigateur. ⛔ 127.0.0.1, entreprise fictive.
// usage : node mots-hors-rubriques.js [profil] → /tmp/…/cap/final-mots/<connexion|guide-<rôle>>-<profil>.json (même format que mots-releve : { ecrans })
const L = require('../lib.js'); const fs = require('fs');
const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/final-mots/'; const PROFIL = process.argv[2] || 'mac';
const LIRE = (zone) => { const R = document.querySelector(zone) || document.body; const lignes = (R.innerText || '').split('\n').map(x => x.replace(/[ \t\r\n\f\v]+/g, ' ').trim()).filter(Boolean), attrs = [];
  for (const e of R.querySelectorAll('[aria-label],[title],[placeholder],[alt]')) { if (!(e.offsetParent || getComputedStyle(e).position === 'fixed')) continue; for (const a of ['aria-label', 'title', 'placeholder', 'alt']) { const v = (e.getAttribute(a) || '').replace(/[ \t\r\n\f\v]+/g, ' ').trim(); if (v) attrs.push(a + ' : ' + v); } }
  for (const s of R.querySelectorAll('select')) { if (!s.offsetParent) continue; for (const o of s.options) { const v = o.textContent.replace(/[ \t\r\n\f\v]+/g, ' ').trim(); if (v) attrs.push('option : ' + v); } }
  return { lignes, attrs: [...new Set(attrs)] }; };
(async () => {
  // ── 1. connexion : on arrive sans session, on lit, puis on touche chaque bouton visible (une fenêtre de plus au plus), page rechargée entre deux
  let c = await L.ouvrir({ profil: PROFIL, qui: null, attente: 1800 }); let p = c.p; const dial = []; p.on('dialog', d => { dial.push(d.message()); d.dismiss().catch(() => {}); });
  const cnx = { ecrans: {} }; const base = await p.evaluate(LIRE, '#cnx'); cnx.ecrans['connexion'] = Object.assign(base, { gestes: [] });
  const sigs = await p.evaluate(() => [...document.querySelectorAll('#cnx button, #cnx a, #cnx [role=button], #cnx summary, #cnx input[type=checkbox]')].filter(e => e.offsetParent).map((e, i) => ({ i, t: (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50) })));
  for (const s of sigs) { try { await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500);
      const r = await p.evaluate(({ i, t }) => { const e = [...document.querySelectorAll('#cnx button, #cnx a, #cnx [role=button], #cnx summary, #cnx input[type=checkbox]')].filter(x => x.offsetParent)[i]; if (!e) return 'absent'; e.click(); return 'ok'; }, s);
      if (r !== 'ok') continue; await p.waitForTimeout(700); const apres = await p.evaluate(LIRE, 'body'); const avant = new Set(base.lignes); const g = { geste: s.t, nouveau: apres.lignes.filter(x => !avant.has(x)).slice(0, 80), attrs: apres.attrs.slice(0, 40) };
      const t = await p.evaluate(() => { const e = document.getElementById('toast'); return e && e.classList.contains('on') ? e.textContent.trim() : ''; }); if (t) g.toast = t; if (dial.length) g.dialogue = dial.splice(0);
      cnx.ecrans.connexion.gestes.push(g);
      // un étage de plus : les boutons de ce qui vient de s'ouvrir (formulaires : on écrit n'importe quoi pour lire les refus)
      const sous = await p.evaluate(() => [...document.querySelectorAll('#cnx button, #cnx a, #calque button, #fenetre button')].filter(e => e.offsetParent).map(e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50)));
      for (const t2 of [...new Set(sous)].filter(x => x && x !== s.t).slice(0, 10)) { try { const ok = await p.evaluate(t2 => { const e = [...document.querySelectorAll('#cnx button, #cnx a, #calque button, #fenetre button')].filter(x => x.offsetParent).find(x => (x.getAttribute('aria-label') || x.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50) === t2); if (!e) return false; e.click(); return true; }, t2); if (!ok) continue; await p.waitForTimeout(500);
          const a2 = await p.evaluate(LIRE, 'body'); const tt = await p.evaluate(() => { const e = document.getElementById('toast'); return e && e.classList.contains('on') ? e.textContent.trim() : ''; });
          cnx.ecrans.connexion.gestes.push({ geste: s.t + ' › ' + t2, nouveau: a2.lignes.filter(x => !avant.has(x)).slice(0, 80), toast: tt || undefined, dialogue: dial.length ? dial.splice(0) : undefined, attrs: a2.attrs.slice(0, 30) }); } catch (e) {} }
    } catch (e) { cnx.ecrans.connexion.gestes.push({ geste: s.t, erreur: String(e.message).slice(0, 100) }); } }
  fs.writeFileSync(D + 'connexion-' + PROFIL + '.json', JSON.stringify(cnx)); console.log('connexion :', sigs.length, 'boutons touchés'); await L.fin(c);
  // ── 2. le guide des nouveautés, par rôle
  for (const qui of ['marc', 'julie', 'sm', 'kb']) {
    c = await L.ouvrir({ profil: PROFIL, qui, guide: true, attente: 2600 }); p = c.p; await p.waitForTimeout(1500); const G = { ecrans: {} }; let k = 0;
    for (; k < 12; k++) { const t = await p.evaluate(LIRE, '#nv'); if (!t.lignes.length) break; G.ecrans['carte ' + (k + 1)] = Object.assign(t, { gestes: [] });
      const ok = await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="apres"]:not([disabled])'); if (b && b.offsetParent) { b.click(); return true; } return false; }); if (!ok) break; await p.waitForTimeout(500); }
    G.ecrans['carte 1'] = G.ecrans['carte 1'] || { lignes: [], attrs: [], gestes: [] };
    // « Voir » de chaque carte : le texte de l'écran où l'on arrive est relevé par mots-releve ; ici on garde seulement ce que la carte dit
    fs.writeFileSync(D + 'guide-' + qui + '-' + PROFIL + '.json', JSON.stringify(G)); console.log('guide', qui, ':', Object.keys(G.ecrans).length, 'cartes'); await L.fin(c); }
  await L.fermer();
})().catch(e => { console.error('ÉCHEC', e); process.exit(2); });
