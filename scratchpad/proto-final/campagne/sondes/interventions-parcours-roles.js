// PARCOURS « QUI VOIT QUOI » : le gérant, le secrétariat, le chef d'équipe et deux techniciens ouvrent la liste, la création, la fiche d'un collègue.
// + « Commencer » sur Ma journée (l'intervention passe « En cours »), « Planifier » depuis la fiche « À planifier », le rechargement d'une fiche.
// usage : node interventions-parcours-roles.js [profil]   → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'iphone';
  const c = await L.ouvrir({ profil, qui: 'marc' }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const txt = z => I.texte(p, z); const ev = (f, a) => p.evaluate(f, a);
  const qui = async (q, h) => { await I.devenir(c, q, h); };
  // ── R1 la liste, la création et les droits de chacun
  const lignes = {};
  for (const q of ['marc', 'julie', 'kb', 'sm', 'tl']) {
    await qui(q, 'interventions'); const e = await L.etat(p); const info = await ev(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, creer: !!document.querySelector('#contenu [data-creer]'), toast: (document.getElementById('toast') || {}).textContent || '' }));
    let n = null; if (/Interventions/.test(e.h1)) { await tap('[data-filtreint="tout"]'); n = await ev(() => document.querySelectorAll('#contenu table.l tbody tr.clic').length); }
    lignes[q] = { ...info, n, hash: e.hash }; console.log('  ·', q, JSON.stringify(lignes[q]));
  }
  v('R1 le gérant voit les 24 interventions et peut en créer', lignes.marc.n >= 24 && lignes.marc.creer, lignes.marc);
  v('R1 le secrétariat voit tout et peut créer', lignes.julie.n >= 24 && lignes.julie.creer, lignes.julie);
  v('R1 une technicienne n’a pas de bouton « Nouvelle intervention »', !lignes.sm.creer, lignes.sm);
  v('R1 une technicienne ne voit que SES interventions (ou est renvoyée vers sa journée)', lignes.sm.n === null || lignes.sm.n < lignes.marc.n, lignes.sm);
  // la note « ton compte ne peut pas créer » (droits d'Équipe) ne doit pas se poser sur le terrain d'une technicienne qui n'a rien à créer
  for (const q of ['sm', 'tl']) { await qui(q, 'majournee'); await L.calme(p, 500); const n1 = await ev(() => { const e = document.querySelector('#contenu .droits-note'); return e ? e.textContent.trim().slice(0, 90) : null; }); await L.aller(p, 'inter-x-' + (q === 'sm' ? 'i2' : 'i7')); const n2 = await ev(() => { const e = document.querySelector('#contenu .droits-note'); return e ? e.textContent.trim().slice(0, 90) : null; });
    v(`interventions-05 : ${q} (technicien) ne lit pas « ton compte ne peut pas créer » sur Ma journée ni sur sa fiche`, !n1 && !n2, { journee: n1, fiche: n2 }); }
  // ── R2 ouvrir la fiche d'un collègue
  for (const [q, id, de] of [['sm', 'i7', 'Tom'], ['tl', 'i1', 'Sophie']]) {
    await qui(q, 'majournee'); await L.aller(p, 'inter-x-' + id); const e = await L.etat(p), t = await ev(() => (document.getElementById('toast') || {}).textContent || '');
    v(`R2 ${q} ouvre l’intervention de ${de} : refusé, avec une phrase`, !/inter-x/.test(e.hash) || /tu ne vois que les tiennes|collègue/.test(t), { hash: e.hash, toast: t });
  }
  // ── R3 « Commencer » sur Ma journée
  await qui('sm', 'majournee'); const av = await ev(() => INTS.find(o => o.id === 'i2').st); await tap('[data-rl="go|inter-x-i2"]'); const ap = await ev(() => ({ st: INTS.find(o => o.id === 'i2').st, j: JOURNAL.filter(o => /a commencé l’intervention/.test(o.action)).length }));
  v('R3 « Commencer » passe l’intervention « En cours » et le journal le note', av === 'planifiee' && ap.st === 'encours' && ap.j >= 1, { av, ap });
  await qui('sm', 'majournee'); v('R3 …puis le bouton dit « Continuer »', /Continuer/.test(await p.locator('[data-rl="go|inter-x-i2"]').first().innerText()));
  await qui('marc', 'interventions'); await tap('[data-filtreint="auj"]'); const lib = await txt('#contenu table.l'); v('R3 le gérant la voit « En cours »', /Mise en service pompe à chaleur[\s\S]{0,120}En cours/.test(lib), lib.slice(0, 80));
  // ── R4 « Planifier » depuis la fiche d'une intervention à planifier (i5)
  await L.aller(p, 'inter-x-i5'); const plan0 = await ev(() => INTS.filter(o => o.st === 'aplanifier').length); await tap('[data-rl="placer|i5"]'); await L.calme(p, 400);
  const r4 = await ev(() => { const i = INTS.find(o => o.id === 'i5'); return { st: i.st, tech: i.tech, d: i.d, h: i.h, n: INTS.filter(o => o.st === 'aplanifier').length }; });
  v('R4 « Planifier » pose l’intervention chez un technicien, « planifiée »', r4.st === 'planifiee' && !!r4.tech, r4);
  v('R4 …et « À planifier » compte une de moins', r4.n === plan0 - 1, [plan0, r4.n]);
  await qui(r4.tech, 'majournee'); const tj = await txt('#contenu'); v('R4 …et le technicien la voit dans Ma journée (prochains jours)', /Hôtel de la Plage/.test(tj), tj.slice(-200));
  // ── R5 recharger une fiche : on revient sur la même fiche
  await L.aller(p, 'inter-x-i9'); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1200); await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await L.calme(p, 500);
  const e5 = await L.etat(p); console.log('  · après rechargement :', JSON.stringify({ hash: e5.hash, h1: e5.h1, cnx: e5.cnx }));
  v('R5 recharger la page sur une fiche rouvre cette fiche (ou l’écran de connexion, jamais un écran cassé)', (/inter-x-i9/.test(e5.hash) && /Dépannage/.test(e5.h1)) || e5.cnx, e5);
  // (le retour du navigateur et « ‹ Retour » se jouent dans interventions-retour.js : une session neuve, sans changement de personne qui brouille l'historique)
  console.log('  · erreurs de page :', c.err.length, c.err.slice(0, 3)); v('aucune erreur JavaScript pendant tout le parcours', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });
