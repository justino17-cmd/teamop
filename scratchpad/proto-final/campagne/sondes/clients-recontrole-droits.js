// Recontrôle ADVERSE de la partie « Clients » (17 novembre 2026) — DROITS CROISÉS : « ＋ Nouveau client » vit sous la case « créer un client » (crm), mais ses deux façons de commencer
// passent par les cases « créer une intervention » (inter) et « créer un devis » (ventes). Une personne qui a la première sans les deux autres voit un bouton qui ne mène nulle part ?
// Usage : PROFIL=… node clients-recontrole-droits.js
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/clients-recontrole/', ETQ = PROFIL + (NUIT ? '-nuit' : '');
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'julie', nuit: NUIT }), p = c.p;
  const toast = () => p.evaluate(() => ((document.querySelector('#toast') || {}).textContent || '').replace(/\s+/g, ' ').trim());
  const D = await p.evaluate(() => { const e = eqDe(acteur()); return { qui: acteur(), crm: e.droits.cats.crm, inter: e.droits.cats.inter, ventes: e.droits.cats.ventes, admin: droitAdmin(e) }; });
  console.log('  · Julie au départ : ' + JSON.stringify(D)); v('population : la personne connectée existe et n’est pas administratrice', !!D.crm && !D.admin, D);
  await p.evaluate(() => { const d = eqDe(acteur()).droits.cats; d.crm = { v: true, c: true, m: true, s: false }; d.inter = { v: true, c: false, m: false, s: false }; d.ventes = { v: true, c: false, m: false, s: false }; });
  await L.aller(p, 'clients');
  const bouton = await p.evaluate(() => !!document.querySelector('[data-action="clientNouveau"]')); console.log('  · « ＋ Nouveau client » visible avec crm.c seul : ' + bouton);
  if (bouton) {
    await L.toucher(c, '[data-action="clientNouveau"]'); await L.capture(c, CAP + 'droits-panneau-' + ETQ + '.png');
    const pan = await p.evaluate(() => ({ h2: (document.querySelector('#calque .panneau h2') || {}).textContent, boutons: [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim()) }));
    console.log('  · panneau : ' + JSON.stringify(pan));
    for (const [lib, sel] of [['Avec une intervention', '[data-action="clientNvInt"]'], ['Avec un devis', '[data-action="clientNvDevis"]']]) {
      if (!pan.boutons.includes(lib)) { console.log('  · « ' + lib + ' » n’est pas proposé (bien)'); continue; }
      await L.toucher(c, sel); await L.calme(p, 400); const t = await toast(); const ouvert = await p.evaluate(() => !!document.querySelector('#fenetre .fen') || /Nouveau devis|devis-nouveau/.test(location.hash + (document.querySelector('#contenu h1') || {}).textContent));
      console.log('  · « ' + lib + ' » sans la case : toast « ' + t + ' » · formulaire ouvert : ' + ouvert);
      v('« ' + lib + ' » proposé à qui n’a pas la case : le refus se DIT par une phrase (« ' + t + ' ») OU le bouton n’est pas proposé', ouvert || /droit|rôle|demande|autoris|accès|n’as pas|permission/i.test(t), { t, ouvert });
      await L.ranger(p); await L.aller(p, 'clients'); await L.toucher(c, '[data-action="clientNouveau"]'); }
    await L.capture(c, CAP + 'droits-apres-' + ETQ + '.png');
  } else v('sans la case créer une intervention ni un devis, « ＋ Nouveau client » n’est pas proposé (rien ne s’y fait)', true);
  v('aucune erreur JavaScript', c.err.length === 0, c.err);
  const code = L.bilan(); await L.fin(c); await L.fermer(); process.exit(code ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
