// Véhicules, étape 4 — CAPTURES des feuilles (à REGARDER) : profils × jour/nuit, chaque feuille ouverte telle qu'on l'ouvre (le panneau est un conteneur qui défile : on relève la fenêtre visible).
// PROFILS=mac,iphone NUIT=0,1 SEULES=plein,nouveau  — ⛔ 127.0.0.1 seulement, un navigateur à la fois.
const L = require('../lib.js'); const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/vehtemps4/';
const FEUILLES = { nouveau:"vxNouveauPanel()", plein:"vxPleinPanel('veh1')", pleinelec:"VEHICULES.find(v=>v.id==='veh1').energie='Électrique';vxPleinPanel('veh1')", fait:"vxFaitPanel('veh2','ct','fiche')", revision:"vxFaitPanel('veh1','entretien','fiche')", assur:"vxFaitPanel('veh1','assur','fiche')",
  groupe:"(()=>{const g=vxGroupes()[0];vxFaitGroupe(g.fin,g.cie)})()", rdv:"vxRdv('veh2','ct','fiche')", mat:"vhMatPanel('veh1','fiche')", km:"vxKmPanel('veh1','fiche')", garage:"vxGaragePanel('veh1','fiche')", retour:"vxRetourPanel('veh4','fiche')",
  cond:"vxCondPanel('veh1')", modif:"vxModifPanel('veh1')", frais:"vxFraisPanel('veh1','o0')", fraisachat:"vxFraisPanel('veh1',vhCleFrais(vehFrais(vehDe('veh1')).find(f=>f.achat&&!f.ndf)))", souci:"vxSouciPanel('veh1')", amende:"vxAmendePanel('veh1')", accident:"vxSinistrePanel('veh1')", doc:"vhDocPanel('veh1')", cout:"vhCoutPanel()", suppr:"vxSupprPanel('veh1')" };
(async () => {
  const seules = process.env.SEULES ? process.env.SEULES.split(',') : Object.keys(FEUILLES);
  for (const profil of (process.env.PROFILS || 'mac,iphone').split(',')) for (const nuit of (process.env.NUIT || '0,1').split(',').map(Number)) {
    const c = await L.ouvrir({ profil, qui:'marc', nuit:!!nuit, calme:true }); await L.aller(c.p, 'vehicules');
    const base = CAP + 'f-' + profil + (nuit ? '-nuit-' : '-jour-');
    for (const k of seules) {
      await c.p.evaluate(() => { fermerPanneau(); });
      const e = await c.p.evaluate(code => { try { (0, eval)(code); return null; } catch (x) { return String(x); } }, FEUILLES[k]); await L.calme(c.p, 500);
      const m = await c.p.evaluate(() => { const p = document.querySelector('#calque .panneau'); if (!p) return null; const v = x => { const r = x.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !x.closest('[hidden]') && !x.closest('details:not([open])'); };
        return { h:p.scrollHeight, vis:p.clientHeight, champs:[...p.querySelectorAll('input:not([type=hidden]):not([type=file]),select,textarea')].filter(v).length, btn:[...p.querySelectorAll('button')].filter(v).map(b => b.textContent.trim().replace(/\s+/g, ' ')).join(' | ') }; });
      console.log(profil, nuit ? 'nuit' : 'jour', k, e ? 'ERREUR ' + e : m ? `h=${m.h}/${m.vis} champs=${m.champs} [${m.btn.slice(0, 230)}]` : 'aucun panneau');
      if (m) await L.capture(c, base + k + '.png', false);
    }
    if (c.err.length) console.log(c.err.slice(0, 3)); await L.fin(c); }
  await L.fermer(); })();
