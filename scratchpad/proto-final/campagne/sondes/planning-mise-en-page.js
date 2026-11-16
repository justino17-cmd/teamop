// Campagne « planning » : mise en page du Planning sur les profils, jour ET nuit — débordement latéral (contre la largeur POSÉE du
// profil), cibles au doigt < 44 px, champs < 16 px, textes écrasés, bouton de la barre du bas qui recouvre un geste, captures à REGARDER.
// Usage : timeout 900 node planning-mise-en-page.js <profil> [nuit] [vue …]      « N ✓ · M ✗ », code 1 si un contrôle tombe.
const L = require('../../lib.js'), fs = require('fs'), path = require('path');
const args = process.argv.slice(2), profil = args.find(a => L.PROFILS[a]) || 'mac', nuit = args.includes('nuit');
const VUES = args.filter(a => ['jour','semaine','mois','general','multi','carte'].includes(a)); if (!VUES.length) VUES.push('jour','semaine','mois','general','multi','carte');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-planning/';
const RAPPORT = {};
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }); const tag = profil + (nuit ? '-nuit' : '-jour');
  for (const v of VUES) {
    await c.p.evaluate(v => { if (location.hash !== '#planning') aller('planning'); plVue = v; plRef = AUJ; plMasques = new Set(); plJours = 6; rendre(); scrollTo(0, 0); }, v); await L.calme(c.p, 700);
    const deb = await L.deborde(c); const o = { debordement: deb };
    L.v(`${tag} · ${v} : aucun glissement latéral de la page (largeur ${c.largeur})`, !deb.bouge, deb);
    if (c.doigt) { o.doigts = await L.doigts(c.p, '#contenu'); const pt = o.doigts.petits.filter(x => !/^\s*\d/.test(x) || true);
      L.v(`${tag} · ${v} : cibles au doigt ≥ 44 px`, o.doigts.petits.length === 0, o.doigts.petits.slice(0, 8)); L.v(`${tag} · ${v} : champs ≥ 16 px`, o.doigts.champs.length === 0, o.doigts.champs); }
    const e = await c.p.evaluate(() => { const ecr = []; document.querySelectorAll('#contenu h1,#contenu h2,#contenu .tete *').forEach(x => { if (x.children.length || !x.offsetParent) return; const r = x.getBoundingClientRect(); if (x.scrollWidth > x.clientWidth + 2 && getComputedStyle(x).overflow !== 'visible') ecr.push((x.textContent || '').trim().slice(0, 40)); }); 
      const bb = document.querySelector('.barre-bas'), bbH = bb && getComputedStyle(bb).display !== 'none' ? bb.getBoundingClientRect().top : innerHeight; const tete = document.querySelector('#contenu .tete'); const bt = [...document.querySelectorAll('#contenu .tete button')].map(b => { const r = b.getBoundingClientRect(); return { t: b.textContent.trim().slice(0, 30), l: Math.round(r.width), h: Math.round(r.height), droite: Math.round(r.right) }; });
      return { coupes: ecr, barreBasHaut: Math.round(bbH), boutonsTete: bt, h1: document.querySelector('#contenu h1')?.textContent }; }); o.verif = e;
    L.v(`${tag} · ${v} : aucun titre ni bouton d’en-tête coupé`, e.coupes.length === 0, e.coupes);
    L.v(`${tag} · ${v} : les boutons d’en-tête restent dans l’écran`, e.boutonsTete.every(b => b.droite <= c.largeur + 1), e.boutonsTete);
    await L.capture(c, CAP + `mep-${tag}-${v}.png`); if (v !== 'carte') await L.capture(c, CAP + `mep-${tag}-${v}-pleine.png`, true);
    RAPPORT[v] = o; }
  L.v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 5));
  fs.writeFileSync(path.join(__dirname, '..', 'planning-mep-' + tag + '.json'), JSON.stringify(RAPPORT, null, 1));
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
