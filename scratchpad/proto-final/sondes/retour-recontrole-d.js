// RECONTRÔLE ADVERSE du bouton Retour, QUATRIÈME REGARD : ce qui s'ouvre DANS LES CADRES (iframe) — 18 novembre 2026.
// L'hôte (prototype-op-gestion.html) tient l'historique de TOUT ce qu'il pose lui-même (CAL_GENRES) ; les cadres sont d'autres pages (prototype-comptabilite.html plein cadre,
// prototype-paiement.html) : leurs panneaux, tiroirs et guides sont-ils connus de l'historique ? On touche CHAQUE commande `[data-a]` visible du cadre de la Comptabilité,
// on relève ce qui s'est posé par-dessus (panneau #calque, tiroir du menu, guide, grand élément fixe), puis UN Retour : le cadre doit rester l'écran et la couche doit partir.
// PROFIL=android|iphone|mac… ; NB (commandes touchées, 40). Rend « N ✓ · M ✗ » ; JSON des constats dans CAP (hors dépôt).
const fs = require('fs'), path = require('path');
const C = require('./retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'android', NB = parseInt(process.env.NB || '40', 10);
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap';
const constats = { oublies: [], notes: [] };
const dit = (liste, o) => { constats[liste].push(o); console.log('  ·', liste, JSON.stringify(o).slice(0, 320)); };
// ce qui est posé par-dessus, vu DEPUIS le cadre (aucune liste de la page)
const COUCHES = () => { const out = [], vw = innerWidth, vh = innerHeight;
  const c = document.querySelector('#calque'); if (c && c.children.length) out.push('panneau(#calque)');
  if (document.body.classList.contains('menu-ouvert')) out.push('tiroir(menu-ouvert)');
  for (const e of document.querySelectorAll('body *')) { if (e.closest('#toast, [hidden], #calque')) continue; const cs = getComputedStyle(e); if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const r = e.getBoundingClientRect(); if (r.width * r.height < 0.18 * vw * vh) continue; if (e.matches('header, nav, aside, .menu, .barre, .tabs, .bas, #app, main')) continue;
    out.push('fixe(' + (e.id ? '#' + e.id : '') + '.' + String(e.className).split(' ')[0] + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ')'); }
  return out; };
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc' }), p = c.p; let touches = 0, couches = 0;
  const entrer = async () => { await L.aller(p, 'accueil');
    if (C.etroit(c)) { await L.toucher(c, '.tt-menu[data-menu="ouvrir"]'); await L.toucher(c, '#calque [data-go="comptabilite"]'); } else await L.toucher(c, '#menu [data-go="comptabilite"], #menu a[href="#comptabilite"]');
    await p.waitForTimeout(1700); await L.calme(p, 300); return L.cadre(p, /prototype-comptabilite\.html/); };
  let fr = await entrer(); v(PROFIL + ' : le cadre de la Comptabilité est affiché (population)', !!fr);
  if (!fr) { await L.fin(c); L.bilan(); await L.fermer(); process.exit(1); }
  const liste = await fr.evaluate(() => { const sig = new Set(), out = []; [...document.querySelectorAll('[data-a]')].forEach((e, i) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height || e.closest('[hidden]')) return; const a = e.dataset.a;
    if (/^(route|aller|nav|mode|fermer|apparence|deconnexion|quitter)/.test(a)) return; const lib = (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 34); const s = a + '|' + lib; if (sig.has(s)) return; sig.add(s); out.push({ i, a, lib }); }); return out; });
  v(PROFIL + ' : des commandes sont recensées dans le cadre (population : ' + liste.length + ')', liste.length >= 8, liste.length);
  const parType = {}; let n = 0;
  for (const b of liste) {
    if (n >= NB) break; n++;
    if (n > 1) { fr = await entrer(); if (!fr) { dit('notes', { constat: 'le cadre n\'a pas pu être rouvert', apres: b.a }); break; } }
    const h0 = await p.evaluate(() => location.hash);
    const ok = await fr.evaluate(i => { const e = document.querySelectorAll('[data-a]')[i]; if (!e) return false; e.click(); return true; }, b.i); if (!ok) continue; touches++; await p.waitForTimeout(550);
    const cd = await fr.evaluate(COUCHES).catch(() => ['cadre parti']); const h1 = await p.evaluate(() => location.hash);
    if (h1 !== h0 || !cd.length || cd[0] === 'cadre parti') continue;
    couches++; await C.retour(p); const h2 = await p.evaluate(() => location.hash); const reste = await fr.evaluate(COUCHES).catch(() => ['cadre parti']);
    const bon = h2 === h0 && reste.length === 0; const nom = b.a + ' « ' + b.lib + ' » (' + cd.join(', ') + ')';
    const k = cd[0].split('(')[0]; (parType[k] = parType[k] || { n: 0, casses: 0 }).n++; if (!bon) parType[k].casses++;
    if (!bon) dit('oublies', { calque: 'Comptabilité plein cadre › ' + nom, profil: PROFIL, constat: 'UN Retour → ' + (h2 !== h0 ? 'quitte la Comptabilité (' + h0 + ' → ' + h2 + ')' : 'reste') + ', couche ' + (reste.length ? 'restée : ' + reste.join(', ') : 'fermée') });
    v(PROFIL + ' · Comptabilité › ' + nom + ' : UN Retour ferme la couche et laisse la Comptabilité', bon);
  }
  v(PROFIL + ' : population — commandes touchées ' + touches + ', couches ouvertes ' + couches, touches >= 10 && couches >= 1, { touches, couches });
  dit('notes', { touches, couches, parType });
  v(PROFIL + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan();
  try { fs.mkdirSync(CAP, { recursive: true }); fs.writeFileSync(path.join(CAP, `retour-recontrole-d-${PROFIL}.json`), JSON.stringify(constats, null, 1)); } catch (e) {}
  await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.message).split('\n')[0].slice(0, 200)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
