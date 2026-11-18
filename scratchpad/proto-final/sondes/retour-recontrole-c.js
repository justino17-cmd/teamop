// RECONTRÔLE ADVERSE du bouton Retour, TROISIÈME REGARD : la BOÎTE MAIL (module OP Courrier, arbre d'ombre) — 18 novembre 2026.
// retour-recontrole.js (section courrier) ne joue que le composeur et le tiroir des boîtes. Ici on touche CHAQUE commande du module (barre du haut, rangées, volet de lecture,
// menus, feuilles, composeur et ce qu'il contient) et, pour chacune qui ouvre quelque chose par-dessus, on rend UN Retour : la Boîte mail doit rester l'écran (adresse #boiteMail)
// et exactement un niveau doit partir. Ce qui ouvre un menu léger (overlay « ov-menu », hors pile du module) est relevé À PART, nommé : on dit ce que fait le Retour, on ne le juge pas seul.
// PROFIL=android|iphone|ipad|mac ; NB (commandes touchées par vue, 30). Rend « N ✓ · M ✗ » + un JSON de constats dans CAP.
const fs = require('fs'), path = require('path');
const M = require('./mail-commun.js'), C = require('./retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'android', NB = parseInt(process.env.NB || '30', 10);
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap';
const constats = { oublies: [], menus: [], notes: [] };
const dit = (liste, o) => { constats[liste].push(o); console.log('  ·', liste, JSON.stringify(o).slice(0, 320)); };
const SEL = 'button, [role="button"], [role="menuitem"], [data-act], .srow, .msg, .cat, summary, a[href]';
const ETAT = () => { const r = window.R && window.R(); if (!r) return { vivant: false, h: location.hash, n: history.length };
  const ov = r.querySelector('#overlay'), app = r.querySelector('#app');
  return { vivant: true, h: location.hash, n: history.length, st: history.state, ov: !!ov && !ov.classList.contains('ov-menu'), menu: (!!ov && ov.classList.contains('ov-menu')) || !!r.querySelector('.menu'),
    nav: !!r.querySelector('#app.nav-open'), vue: app ? app.getAttribute('data-view') : null, bloc: !!r.querySelector('#sheet:not([hidden]), .sheet.open, .sheet.show') }; };
const niveaux = e => (e.ov ? 1 : 0) + (e.nav ? 1 : 0) + (e.vue && e.vue !== 'list' ? 1 : 0) + (e.bloc ? 1 : 0);
const etat = p => p.evaluate(ETAT);
const liste = p => p.evaluate(sel => { const r = window.R(); const out = [], sig = new Set(); [...r.querySelectorAll(sel)].forEach((e, i) => { const b = e.getBoundingClientRect(); if (!b.width || !b.height || e.disabled || e.closest('[hidden]') || e.closest('[inert]')) return;
  const lib = (e.getAttribute('aria-label') || e.getAttribute('title') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 36); const s = e.tagName + '|' + (e.id || e.className || '') + '|' + lib; if (sig.has(s)) return; sig.add(s); out.push({ i, lib, id: e.id || '', cl: String(e.className || '').slice(0, 30) }); }); return out; }, SEL);
const SAUF = /supprim|corbeille|spam|indésirable|vider|archiv|déconnect|envoyer|^send/i;   // ce qui déplace de vrais messages de démonstration ou envoie : on ne le touche pas

(async () => {
  let c = await M.entrer({ profil: PROFIL }); const p = c.p; let touches = 0, ouvrent = 0, menus = 0;
  const frais = async () => { await L.aller(p, 'accueil'); await L.aller(p, 'boiteMail'); await M.pret(p, 6000); await p.waitForTimeout(250); };
  v(PROFIL + ' : la Boîte mail est affichée (population)', (await etat(p)).h === '#boiteMail' && (await etat(p)).vivant);
  const vues = [['liste', async () => {}],
    ['lecture d\'un message', async () => { await p.evaluate(() => { const m = window.R().querySelector('.msg'); if (m) m.click(); }); await p.waitForTimeout(600); }],
    ['composeur « Nouveau message »', async () => { await p.evaluate(() => { const b = window.R().querySelector('#btnCompose'); if (b) b.click(); }); await p.waitForTimeout(700); }]];
  for (const [vue, mettre] of vues) {
    await frais(); await mettre(); const base = await etat(p);
    const l = await liste(p); v(PROFIL + ' · ' + vue + ' : des commandes sont recensées (population : ' + l.length + ')', l.length >= 3, l.length);
    let n = 0;
    for (const b of l) {
      if (n >= NB) break; if (SAUF.test(b.lib)) continue; n++;
      if (n > 1) { await frais(); await mettre(); }
      const e0 = await etat(p);
      const ok = await p.evaluate(([i, sel]) => { const e = [...window.R().querySelectorAll(sel)][i]; if (!e) return false; e.click(); return true; }, [b.i, SEL]);
      if (!ok) continue; touches++; await p.waitForTimeout(420);
      const e1 = await etat(p); if (!e1.vivant) { dit('notes', { vue, bouton: b.lib, constat: 'le module n\'est plus là après ce clic (' + e0.h + ' → ' + e1.h + ')' }); continue; }
      const nom = PROFIL + ' · ' + vue + ' › « ' + (b.lib || b.id || b.cl) + ' »';
      if (e1.h !== e0.h) { dit('notes', { vue, bouton: b.lib, constat: 'mène à ' + e1.h }); continue; }
      const plus = niveaux(e1) > niveaux(e0), menu = e1.menu && !e0.menu;
      if (!plus && !menu) continue;
      if (plus) { ouvrent++; await C.retour(p); const e2 = await etat(p); const bon = e2.h === '#boiteMail' && niveaux(e2) === niveaux(e1) - 1;
        if (!bon) dit('oublies', { calque: nom, profil: PROFIL, constat: 'niveaux ' + niveaux(e0) + ' → ' + niveaux(e1) + ' ; UN Retour → adresse ' + e2.h + ', niveaux ' + niveaux(e2) + ' (' + JSON.stringify({ ov: e2.ov, nav: e2.nav, vue: e2.vue }) + ')' });
        v(nom + ' : UN Retour retire un niveau et laisse la Boîte mail', bon, { e0, e1, e2 }); }
      else if (menu) { menus++; await C.retour(p); const e2 = await etat(p); dit('menus', { menu: nom, profil: PROFIL, constat: 'Retour → adresse ' + e2.h + ', menu ' + (e2.menu ? 'resté ouvert' : 'fermé') }); }
    }
  }
  v(PROFIL + ' : population — commandes touchées ' + touches + ', calques ouverts ' + ouvrent + ', menus ' + menus, touches >= 20 && ouvrent >= 1, { touches, ouvrent, menus });
  v(PROFIL + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  dit('notes', { touches, ouvrent, menus });
  await M.fin(c); const ko = L.bilan();
  try { fs.mkdirSync(CAP, { recursive: true }); fs.writeFileSync(path.join(CAP, `retour-recontrole-c-${PROFIL}.json`), JSON.stringify(constats, null, 1)); } catch (e) {}
  await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { v('la sonde va jusqu\'au bout (une exception l\'a arrêtée)', false, String(e.message).split('\n')[0].slice(0, 200)); L.bilan(); L.fermer().then(() => process.exit(1), () => process.exit(1)); });
