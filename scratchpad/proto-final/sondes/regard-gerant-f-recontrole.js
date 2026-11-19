// LE REGARD — gérant F, SECOND REGARD : « la correction n'a-t-elle rien abîmé à côté ? »
// La règle `.actions .btn { max-width:100%; white-space:normal; text-align:center; line-height:1.2; padding-block:6px }` (regard gérant F, 2/n)
// est GÉNÉRALE : elle touche toute commande rangée dans un `.actions` — la barre d'actions d'une fenêtre, mais aussi l'en-tête de chaque
// rubrique, et les trois autres rôles. Cette sonde la RETIRE à chaud (puis la remet) et compare, commande par commande, la taille avant/après,
// sur tout ce qui se laisse ouvrir : chaque rubrique du menu de chaque rôle, puis les fenêtres qu'un bouton « ＋ / Nouveau / Ajouter / Modifier »
// de la rubrique ouvre. Une différence de plus de 1 px est un effet de la règle ; elle est jugée ensuite (voulue : une commande trop longue
// passe à la ligne ; abîmée : une commande qui rétrécit, grandit ou change de largeur sans raison).
//   node scratchpad/proto-final/sondes/regard-gerant-f-recontrole.js [profil,profil…] [qui,qui…]     (défaut : mac,petit  marc,julie,sm)
// Sort en 1 si une commande change de taille SANS que le texte passe à la ligne (hauteur égale ou plus basse que 46 px), ou si le
// recensement est vide.
const L = require('../lib.js');
const v = L.v;
const profils = (process.argv[2] || 'mac,petit').split(','), quis = (process.argv[3] || 'marc,julie,sm').split(',');
const REGLE = '.actions .btn';
// mesure toutes les commandes de `.actions` visibles (page ou fenêtre), en les signant par leur chemin, leur libellé et leur rang
const mesurer = (p, zone) => p.evaluate(z => [...document.querySelectorAll((z || '') + ' .actions .btn')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 && getComputedStyle(e).visibility !== 'hidden' && e.offsetParent !== null; })
  .map((e, i) => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return { s: i + '|' + (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40), w: Math.round(r.width * 10) / 10, h: Math.round(r.height * 10) / 10, droite: Math.round(r.right), sort: r.right > innerWidth + 1 || e.scrollWidth > e.clientWidth + 1, mh: cs.minHeight, ws: cs.whiteSpace, haut: e.closest('#calque') ? 'fenêtre' : 'page' }; }), zone || '');
// retire la règle à chaud, et rend de quoi la remettre
const retirer = p => p.evaluate(sel => { for (const sh of document.styleSheets) { let rs; try { rs = sh.cssRules; } catch (e) { continue; } for (let i = 0; i < rs.length; i++) if (rs[i].selectorText === sel && /max-width:\s*100%/.test(rs[i].cssText) && /white-space:\s*normal/.test(rs[i].cssText)) { window.__regle = { sh, i, txt: rs[i].cssText }; sh.deleteRule(i); return true; } } return false; }, REGLE);
const remettre = p => p.evaluate(() => { const g = window.__regle; if (!g) return false; g.sh.insertRule(g.txt, g.i); window.__regle = null; return true; });
const comparer = (A, B) => { const diffs = []; for (const a of A) { const b = B.find(x => x.s === a.s && x.haut === a.haut); if (!b) continue; if (Math.abs(a.w - b.w) > 1 || Math.abs(a.h - b.h) > 1) diffs.push({ s: a.s, haut: a.haut, avant: a.w + '×' + a.h, apres: b.w + '×' + b.h, avecSort: a.sort, sansSort: b.sort }); } return diffs; };
(async () => {
  let total = 0, avecDiff = [], fenetres = 0;
  for (const profil of profils) for (const qui of quis) {
    const c = await L.ouvrir({ profil, qui }), p = c.p;
    try { await p.evaluate(() => mchPoser(['3d'])); } catch (e) {} await L.calme(p, 500);
    const routes = await p.evaluate(() => CAT_LIGNES.map(c => c.k));   // le menu lui-même (CATS) : toute rubrique que l'application connaît
    v(`${profil}/${qui} : les rubriques du menu sont comptées (population)`, routes.length >= 8, routes.length);
    if (!await retirer(p)) { v(`${profil}/${qui} : la règle est trouvée dans la feuille`, false, REGLE); await L.fermer(); process.exit(1); } await remettre(p);
    let n = 0, nf = 0;
    for (const r of routes) {
      try { await L.aller(p, r); } catch (e) { continue; }
      const ouvrir = async () => { await L.ranger(p); await L.aller(p, r); };
      // 1. la page elle-même
      const A = await mesurer(p, '#contenu'); await retirer(p); await L.calme(p, 120); const B = await mesurer(p, '#contenu'); await remettre(p); await L.calme(p, 120);
      n += A.length; for (const d of comparer(A, B)) avecDiff.push({ profil, qui, route: r, ...d });
      // 2. les fenêtres qu'un bouton d'ajout ou de modification ouvre (au plus 4 par rubrique, le premier de chaque libellé)
      const cibles = await p.evaluate(() => { const vus = new Set(), out = []; document.querySelectorAll('#contenu button, #contenu [role=button], #contenu a.btn').forEach((e, i) => { const t = (e.textContent || '').replace(/\s+/g, ' ').trim(); if (!/^(＋|\+|Nouveau|Nouvelle|Ajouter|Créer|Modifier|Saisir|Envoyer|Relancer)/.test(t) || vus.has(t) || e.disabled) return; if (e.offsetParent === null) return; vus.add(t); e.setAttribute('data-sonde-rang', String(i)); out.push({ t: t.slice(0, 30), i }); }); return out.slice(0, 4); });
      for (const cb of cibles) {
        await ouvrir();
        const ok = await p.evaluate(i => { const e = document.querySelector('[data-sonde-rang="' + i + '"]') || [...document.querySelectorAll('#contenu button, #contenu [role=button], #contenu a.btn')][i]; if (!e) return false; e.click(); return true; }, cb.i).catch(() => false);
        await L.calme(p, 500); if (!ok) continue;
        const FA = await mesurer(p, '#calque'); if (!FA.length) { await L.ranger(p); continue; }
        await retirer(p); await L.calme(p, 120); const FB = await mesurer(p, '#calque'); await remettre(p); await L.calme(p, 120);
        nf++; fenetres++; n += FA.length; for (const d of comparer(FA, FB)) avecDiff.push({ profil, qui, route: r + ' › ' + cb.t, ...d });
        await L.ranger(p);
      }
    }
    total += n; v(`${profil}/${qui} : ${n} commandes de « .actions » comparées sur ${routes.length} rubriques et ${nf} fenêtres`, n >= 20, n);
    console.log(`  · ${profil}/${qui} : ${c.err.length} erreur(s) JS`); c.err.slice(0, 3).forEach(e => console.log('    ' + e.slice(0, 200)));
    await L.fin(c);
  }
  v('population : des commandes ont été comparées', total >= 100, total); v('population : des fenêtres se sont ouvertes', fenetres >= 10, fenetres);
  console.log('\n  DIFFÉRENCES avant/après la règle (> 1 px) : ' + avecDiff.length);
  for (const d of avecDiff.slice(0, 80)) console.log('   · ' + [d.profil, d.qui, d.route, d.haut, '« ' + d.s.split('|')[1] + ' »', d.avant + ' → ' + d.apres].join(' | '));
  // verdict : « avant » = AVEC la règle, « après » = SANS elle. RÉPARÉE : sans la règle, la commande sort de l'écran ou de son cadre (c'est ce que la règle corrige).
  // NEUTRE : la commande n'est ni plus étroite ni plus haute de plus de 4 px (le rembourrage de 6 px ajoute au plus quelques px à une commande déjà sur deux lignes).
  // À JUGER : tout le reste — une commande rétrécie ou grandie sans que SANS la règle elle sorte de son cadre : c'est un effet de bord, à regarder sur capture.
  const classe = d => { const [wa, ha] = d.avant.split('×').map(Number), [wb, hb] = d.apres.split('×').map(Number); if (d.sansSort) return 'réparée'; if (ha <= hb + 4 && wa >= wb - 1) return 'neutre'; return 'à juger'; };
  const cl = { 'réparée': 0, neutre: 0, 'à juger': 0 }; avecDiff.forEach(d => cl[classe(d)]++); console.log('  · ' + JSON.stringify(cl));
  const ajuger = avecDiff.filter(d => classe(d) === 'à juger');
  v('aucune commande ne subit d\'effet de bord de la règle (rétrécie ou grandie sans raison)', ajuger.length === 0, ajuger.slice(0, 10));
  await L.fermer(); const f = L.bilan ? L.bilan() : 0; process.exit(typeof f === 'number' ? f : 0);
})().catch(async e => { console.log('✗ sonde tombée : ' + (e.stack || e)); try { await L.fermer(); } catch (x) {} process.exit(1); });
