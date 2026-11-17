// « Qui peut quoi » — les cases dont l'effet n'est PAS un bouton de la page d'ouverture : on ouvre des FICHES (une intervention, un client, un devis,
// une facture, une absence, une journée, la fiche d'une personne, les boîtes mail) comme la personne, avec et sans la case, et on compare les gestes
// qu'elles offrent. Cases visées : planif.s inter.m inter.s crm.m ventes.m ventes.s compta.m compta.s achats.s admin.s com.c com.m com.s et le droit à part « Corriger les pointages ».
// Une case qui ne retire AUCUN geste d'aucune fiche est « morte » : défaut. ⛔ 127.0.0.1 seulement.   usage : node equipe-droits-profonds.js [mac]
const E = require('./equipe-outils.js'); const { L, v } = E;
const PROFIL = process.argv[2] || 'mac';
const CAS = [
  { c:'planif.s', cat:'planif', x:'s', routes:['absences', 'planning'] }, { c:'inter.m', cat:'inter', x:'m', routes:['interventions'] }, { c:'inter.s', cat:'inter', x:'s', routes:['interventions'] },
  { c:'crm.m', cat:'crm', x:'m', routes:['clients'] }, { c:'ventes.m', cat:'ventes', x:'m', routes:['devis', 'contrats', 'compta:fventes'] }, { c:'ventes.s', cat:'ventes', x:'s', routes:['devis', 'contrats', 'compta:fventes'] },
  { c:'compta.m', cat:'compta', x:'m', routes:['compta:fachats', 'compta:fventes'] }, { c:'compta.s', cat:'compta', x:'s', routes:['compta:fachats', 'compta:fventes'] },
  { c:'achats.s', cat:'achats', x:'s', routes:['achats'] }, { c:'admin.s', cat:'admin', x:'s', routes:['equipe'] },
  { c:'com.c', cat:'com', x:'c', routes:['boiteMail'] }, { c:'com.m', cat:'com', x:'m', routes:['boiteMail'] }, { c:'com.s', cat:'com', x:'s', routes:['boiteMail'] },
  { c:'sp.corrpt', sp:'corrpt', routes:['pointage'] }
];
(async () => {
  const c = await E.marc(PROFIL); const p = c.p; const bilan = {};
  await L.aller(p, 'equipe'); await L.toucher(c, '[data-eq="inviter"]'); await p.fill('#eq-p', 'Rémi'); await p.fill('#eq-n', 'Poulain'); await p.fill('#eq-m', 'remi@climservices17.fr');
  await p.evaluate(() => { const s = document.getElementById('eq-terrain'); if (s && s.checked) s.click(); }); await L.toucher(c, '[data-eq="inviterok"]'); await L.calme(p, 500); await E.ranger(c);
  const k = await p.evaluate(() => EQUIPE.find(q => q.prenom === 'Rémi').k);
  await p.evaluate(({ k }) => { for (const cat of ['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin']) eqDe(k).droits.cats[cat] = { v:1, c:1, m:1, s:1 }; ['tout', 'prix', 'atelier', 'valstock', 'commander', 'corrpt', 'comptes', 'securite'].forEach(s => { eqDe(k).droits.sp[s] = 1; }); eqDe(k).droits.profil = 'resp*'; }, { k });
  // le relevé de gestes de plusieurs FICHES d'une route, en tant que la personne
  const sonder = routes => p.evaluate(async routes => { const sl = ms => new Promise(r => setTimeout(r, ms)); const vis = e => e.offsetParent !== null && !e.disabled; const out = new Set(); const lab = e => { const d = e.dataset ? Object.entries(e.dataset).map(([a, b]) => a + '=' + String(b).split('|')[0]).join(',') : ''; return d + ':' + (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 36); };
    const lire = () => document.querySelectorAll('#calque .panneau button, #calque .panneau a.btn, #contenu button, #contenu a.btn, #contenu [role=button]').forEach(e => { if (vis(e)) out.add(lab(e)); });
    for (const spec of routes) { const [r, sec] = spec.split(':'); const rr = r === 'compta' ? 'comptabilite' : r;
      const ouvrir = async () => { aller(rr); await sl(550); if (sec) { const b = document.querySelector(`#contenu [data-cx="sec|${sec}|${sec === 'fventes' ? 'ventes' : 'achats'}"], #contenu [data-cx="sec|${sec}"]`); if (b) { b.click(); await sl(600); } } };
      await ouvrir(); lire(); const rows = () => [...document.querySelectorAll('#contenu tr[data-go], #contenu [data-go*="-x-"], #contenu .ligne-clic, #contenu [data-aint], #contenu [data-ptx], #contenu .carte[data-ml]')].filter(vis);
      const n = Math.min(3, rows().length); for (let i = 0; i < n; i++) { await ouvrir(); const q = rows()[i]; if (!q) break; q.click(); await sl(650); lire(); try { document.querySelectorAll('#calque button[data-ferme]').forEach(b => b.click()); } catch (e) {} }
      if (rr === 'boiteMail') { await ouvrir(); const b = document.querySelector('[data-ml="boites"]'); if (b) { b.click(); await sl(600); lire(); } }
      if (rr === 'equipe') { for (const kk of ['sm', 'tl']) { await ouvrir(); const b = document.querySelector(`[data-eq="fiche|${kk}"]`); if (b) { b.click(); await sl(500); lire(); } } } }
    return [...out].sort(); }, routes);
  const comme = async () => { await L.aller(p, 'equipe'); await p.evaluate(() => { fermerPanneau(); }); await p.evaluate(({ id }) => { try { return secuVoirComme(id); } catch (e) { return false; } }, { id:k }); await L.calme(p, 900); };
  const revenir = async () => { await p.evaluate(() => { try { secuRevenir(); } catch (e) {} }); await L.calme(p, 700); };
  const base = {}; await comme(); for (const cas of CAS) base[cas.c] = await sonder(cas.routes); await revenir();
  v('population : la personne complète a des gestes dans les fiches ouvertes (au moins 80 au total)', Object.values(base).reduce((a, b) => a + b.length, 0) >= 80, Object.fromEntries(Object.entries(base).map(([q, w]) => [q, w.length])));
  for (const cas of CAS) {
    await E.fiche(c, k); await p.evaluate(() => { const d = document.querySelector('#calque details.eqx-det'); if (d) d.open = true; });
    const sel = cas.sp ? `#calque input[data-eqs="${k}|${cas.sp}"]` : `#calque .eq-droits input[data-eqd="${k}|${cas.cat}|${cas.x}"]`;
    if (!(await p.evaluate(s => { const e = document.querySelector(s); return !!e && e.offsetParent !== null; }, sel))) { v(`case ${cas.c} : affichée dans la fiche`, false, 'absente'); continue; }
    await L.toucher(c, sel); await E.ranger(c); await comme(); const sans = await sonder(cas.routes); await revenir();
    const perdus = base[cas.c].filter(x => !sans.includes(x)); bilan[cas.c] = { perdus:perdus.length, exemples:perdus.slice(0, 8), baseline:base[cas.c].length };
    v(`case ${cas.c} décochée : au moins un geste disparaît des fiches ouvertes (sinon la case est « morte ») — ${perdus.length} perdus sur ${base[cas.c].length}`, perdus.length >= 1, bilan[cas.c]);
    await p.evaluate(({ k, cas }) => { if (cas.sp) eqDe(k).droits.sp[cas.sp] = 1; else eqDe(k).droits.cats[cas.cat] = { v:1, c:1, m:1, s:1 }; }, { k, cas });
  }
  console.log(JSON.stringify(bilan, null, 1));
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await E.fin();
})().catch(e => { console.error('ÉCHEC DE LA SONDE', e); process.exit(2); });
