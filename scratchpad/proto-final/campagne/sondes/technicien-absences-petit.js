// Défaut « technicien-09 » : à 320 px, une cible de « Mes congés » ne mesure que 38 px de large. Sonde : nomme l'élément (classe, taille, ancêtre) puis contrôle qu'il répond au doigt sur ≥ 44 px.
// Usage : node technicien-absences-petit.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
(async () => {
  const profil = process.argv[2] || 'petit', nuit = process.argv[3] === '1';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'absences' }), p = c.p;
  await L.aller(p, 'absences'); await L.calme(p, 600);
  const r = await p.evaluate(() => { const o = [];
    document.querySelectorAll('#contenu button, #contenu [data-go], #contenu [role=button], #contenu a, #contenu [onclick]').forEach(e => { const b = e.getBoundingClientRect(); if (!b.width) return;
      const t = (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60);
      if (/RTT/.test(t) || b.width < 44 || b.height < 44) o.push({ t, cl: e.className, tag: e.tagName, w: Math.round(b.width), h: Math.round(b.height), data: Object.keys(e.dataset).join(','), par: e.parentElement.className }); });
    return o; });
  console.log(JSON.stringify(r, null, 1).slice(0, 3000));
  const petits = r.filter(x => x.w < 44 || x.h < 44);
  v('population : des cibles ont été recensées', r.length > 0, r.length);
  v('aucune cible sous 44 px', petits.length === 0, petits.slice(0, 5));
  await L.capture(c, CAP + `absences-${profil}-${nuit ? 'nuit' : 'jour'}.png`);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
