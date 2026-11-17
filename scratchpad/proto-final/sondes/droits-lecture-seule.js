// LECTURE SEULE : une personne qui VOIT tout et ne peut rien changer (toutes les cases « Voir », aucune autre). Pour CHAQUE rubrique ouverte, aucun bouton qui écrit n'est DESSINÉ
// (la table classe chaque geste ; la feuille de style droits-css le cache), l'écran le dit une fois (« Tu peux regarder cet écran… »), et la population cachée est COMPTÉE (un zéro de fuite
// sur un ensemble vide ne prouverait rien). Le sens inverse : le Gérant (toutes les cases) n'a rien de caché. ⛔ 127.0.0.1 seulement.
const { L, v, ouvrirComme, etatPersonne, fin } = require('./droits-commun.js');
const BALAYAGE = () => { const fuite = [], cache = new Set(), vus = new Set(); const p = eqDe(acteur());
  document.querySelectorAll('#contenu *, #calque *').forEach(el => { for (const a of el.attributes) { if (a.name.slice(0, 5) !== 'data-') continue; const f = a.name.slice(5); if (!(Object.hasOwn(GESTES, f) || f === 'action')) continue;
    const verbe = String(a.value).split('|')[0], g = geste(f, verbe); let ferme = g && g.cat && !peut(g.cat, g.x, p); const sp = GESTES_SP[f] && GESTES_SP[f][verbe]; if (sp && !droitSp(p, sp)) ferme = true;
    if (!ferme) continue; const cs = getComputedStyle(el), saisie = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName), visible = cs.display !== 'none' && el.getClientRects().length > 0 && !(saisie && cs.pointerEvents === 'none');   /* un champ de saisie se FIGE (valeur lisible, rien ne s'écrit) : ce n'est pas une fuite */ vus.add(f + '|' + verbe); (visible ? fuite : []).push(f + '|' + verbe); if (!visible) cache.add(f + '|' + verbe); } });
  return { fuite:[...new Set(fuite)], cache:[...cache], n:vus.size }; };
(async () => {
  const ROUTES = ['accueil', 'statistiques', 'historique', 'planning', 'interventions', 'taches', 'absences', 'clients', 'devis', 'contrats', 'comptabilite', 'achats', 'stock', 'produits', 'boxes', 'pointage', 'vehicules', 'equipe', 'client-x-vp', 'inter-x-i1'];
  const cases = Object.fromEntries(['planif', 'inter', 'crm', 'ventes', 'compta', 'stock', 'temps', 'com', 'achats', 'admin'].map(c => [c, '1001'.slice(0, 1) + '000']));
  const c = await ouvrirComme({ k:'lect', prenom:'Lucie', nom:'Lecture', pd:'resp', terrain:false, cases, sp:{ prix:1, atelier:0, valstock:0, commander:0, corrpt:0, comptes:0 } });
  let nEcrans = 0, nCaches = 0, nFuites = 0, nNotes = 0; const resume = [];
  for (const r of ROUTES) {
    await c.p.evaluate(x => { try { fermerPanneau(); } catch (e) {} aller(x); }, r); await L.calme(c.p, 600);
    const ok = await c.p.evaluate(() => ({ h:location.hash.slice(1), cadre:!!document.getElementById('cpsys') && !document.getElementById('cpsys').hidden }));
    if (['boxes', 'pointage'].includes(r)) { v(`${r} : fermé à qui n'a que « Voir » (il demande « Supprimer » en plus : données de salaire, dépôts)`, ok.h !== r, ok); continue; }
    if (ok.h !== r) { v(`${r} : l'écran s'ouvre pour une personne en lecture seule`, false, ok); continue; }
    const b = await c.p.evaluate(BALAYAGE), note = await c.p.evaluate(() => (document.querySelector('.droits-note') || {}).textContent || '');
    nEcrans++; nCaches += b.cache.length; nFuites += b.fuite.length; if (note) nNotes++;
    resume.push(`${r}:${b.cache.length}`);
    v(`${r} : aucun bouton qui écrit n'est dessiné (${b.cache.length} cachés)`, b.fuite.length === 0, b.fuite.slice(0, 12));
    if (!['accueil', 'statistiques', 'historique', 'taches', 'comptabilite', 'client-x-vp', 'inter-x-i1'].includes(r)) v(`${r} : l'écran dit qu'on peut regarder, pas modifier (avec le prénom du gérant)`, /Tu peux regarder cet écran, pas le modifier\. Pour changer quelque chose, demande à Marc\./.test(note), note);
  }
  console.log('  · cachés par écran : ' + resume.join(' '));
  v('population : au moins douze écrans balayés et plus de trente gestes d\'écriture cachés au total', nEcrans >= 12 && nCaches > 30, { nEcrans, nCaches });
  v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  // le sens inverse : le gérant n'a rien de caché (la feuille de style est vide pour lui)
  const g = await ouvrirComme('marc'); await L.aller(g.p, 'stock'); const css = await g.p.evaluate(() => (document.getElementById('droits-css') || {}).textContent || '');
  v('le gérant : aucune règle de la feuille de style des droits', css === '', css.length); await L.fin(g);
  await fin();
})().catch(e => { console.error(e); process.exit(1); });
