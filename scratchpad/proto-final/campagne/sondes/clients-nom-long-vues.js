// Un client au nom d'UN seul mot de 54 signes, dans TOUTES les vues qui écrivent un nom de client (SŒUR 5, 18 novembre 2026) :
// aucune vue ne s'élargit — mesure contre documentElement.clientWidth (la largeur POSÉE du profil, jamais innerWidth), page entière ET chaque élément visible qui dépasse.
// Les noms de TOUS les clients de départ sont remplacés (un nom par client, différents) pour que chaque ligne de chaque vue en porte un.
// usage : PROFIL=iphone|android|petit|ipad|mac720|mac QUI=marc|julie|kb|sm NUIT=1 node clients-nom-long-vues.js → « N ✓ · M ✗ », code 1 si un contrôle tombe
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'iphone', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/nom-long/';
(async () => {
  require('fs').mkdirSync(CAP, { recursive: true });
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  await p.evaluate(() => { window.confirm = () => true; window.open = () => null; });
  const base = 'Etablissementsdupontdelaunayfreresetassociesdusudouest'; // 54 signes
  v('population : le nom de l’essai compte 54 signes, un seul mot', base.length === 54 && !/\s/.test(base), base.length);
  const ks = await p.evaluate(base => { const ks = Object.keys(CLIENTS).filter(k => k !== '__nv'); ks.forEach((k, i) => { const n = base.slice(0, 53) + String.fromCharCode(97 + i); CLIENTS[k].nom = n; CLIENTS[k].contact = n; }); return ks; }, base);
  v('population : ' + ks.length + ' clients renommés', ks.length >= 7, ks.length);
  const vues = await p.evaluate(() => { const vv = Object.keys(vues()).filter(x => !['inter', 'facture', 'client', 'contrat', 'signer', 'contrat-nouveau', 'clientvoit', 'espaceclient', 'carteBox', 'devisXylo'].includes(x) && !estGrise(x)); return vv; });
  vues.push('client-x-' + ks[0], 'factures', 'devis', 'inter-x-i1', 'inter-x-i20');
  let n = 0; const rouges = [];
  for (const h of new Set(vues)) {
    try { await L.aller(p, h); await L.calme(p, 450); } catch (e) { continue; } n++;
    const m = await p.evaluate(() => { const cw = document.documentElement.clientWidth, sw = document.documentElement.scrollWidth, bw = document.body.scrollWidth;
      const vus = [...document.querySelectorAll('#contenu *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.height && getComputedStyle(e).visibility !== 'hidden' && r.right > cw + 1 && !e.closest('[data-defile], .defile, .tableau-defile, .cal, [style*="overflow-x"]'); });
      const nom = vus.filter(e => /Etablissementsdupont/.test(e.textContent) && !([...e.children].some(x => /Etablissementsdupont/.test(x.textContent)))).slice(0, 3).map(e => e.tagName + '.' + (e.className || '').toString().slice(0, 40) + ' → ' + Math.round(e.getBoundingClientRect().right));
      return { cw, sw, bw, nom }; });
    const ok = m.sw <= m.cw && m.bw <= m.cw; if (!ok) rouges.push(h);
    v('vue « ' + h + ' » : page ' + m.sw + '/' + m.cw + (m.nom.length ? ' · dépassent : ' + m.nom.join(' ; ') : ''), ok, m);
    if (!ok) await L.capture(c, CAP + 'rouge-' + h.replace(/[^a-z0-9]+/gi, '_') + '-' + PROFIL + (NUIT ? '-nuit' : '') + '-' + QUI + '.png');
  }
  v('population : ' + n + ' vues parcourues', n >= 15, n);
  const errs = c.err.filter(e => !/favicon/.test(e)); v('aucune erreur de page (' + errs.length + ')', errs.length === 0, errs.slice(0, 3));
  console.log('  · vues rouges : ' + (rouges.join(', ') || 'aucune'));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e); process.exit(2); });
