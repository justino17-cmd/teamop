// RESTES DE LA SÉCURITÉ, tour 1 (17 novembre 2026) : « une donnée qu'on RELIT ne devient jamais du code ».
// Sonde GÉNÉRIQUE de sortie : elle charge des données hostiles dans les champs qu'on lui nomme, puis fait lire à l'application tout ce qu'elle sait lire (tous les écrans de chaque
// rôle demandé, toutes les fiches, les gestes de chaque écran) et regarde TROIS choses, dans cet ordre de gravité :
//   1. une EXÉCUTION (window.top.__hits) : la charge a tourné ;
//   2. une balise ou un gestionnaire NÉ de la donnée dans le DOM (injection-outils LIRE) ;
//   3. un PUITS : un innerHTML / outerHTML / insertAdjacentHTML qui a reçu la charge BRUTE (c'est ce qui nomme le coupable : la pile d'appel y est), même quand rien n'a encore tourné.
// Les formes de la charge : balise img, svg sans espace, sortie d'attribut, mXSS (math/mtext/table/mglyph/style), attribut sans guillemet (onmouseover, onfocus), entité doublée.
// Usage : node restes-champs.js --noms=INTS,BUREAU --cles=titre [--roles=marc,julie,sm] [--fiches=1] [--nom-sortie=titres]
//   --cles=*  : TOUTES les chaînes libres des objets nommés (mêmes filtres que la sonde « toute donnée mutée »).
// Population comptée (une mesure à zéro sur un ensemble vide ne prouve rien) : champs chargés, écrans lus, charges retrouvées à l'écran. Contre-épreuve : une balise posée exprès doit être vue.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const NOMS = arg('noms', 'INTS,BUREAU').split(','), CLES = arg('cles', 'titre'), ROLES_ARG = arg('roles', 'tous').split(','), PROFIL = arg('profil', 'mac'), NOMSORTIE = arg('nom-sortie', 'champs');
const FICHES = arg('fiches', '1') !== '0', GESTES = +arg('gestes', 4), MAXFICHES = +arg('max-fiches', 40);
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-securite/'; fs.mkdirSync(SORTIE, { recursive: true });
const FORMES = [
  id => `¤${id}¤<img src=x onerror=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤<svg/onload=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤'"><i data-xss=${id}></i><details open ontoggle=__xss('${id}')>`,
  id => `¤${id}¤'"><iframe srcdoc="<i data-xss=${id}></i><script>parent.__xss('${id}')<\/script>"></iframe><math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=x onerror=__xss('${id}')&gt;">`,
  id => `¤${id}¤ x onmouseover=__xss('${id}') autofocus onfocus=__xss('${id}') data-xss-att=${id} y=`,
  id => `¤${id}¤&lt;i data-xss=${id}&gt;&lt;img src=x onerror=__xss('${id}')&gt;`,
];
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: 'marc', init: O.INIT, guide: false, attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  /* les rôles sont les CLÉS de ROLES de l'application (pas les identifiants de personnes : « marc » n'est pas un rôle — rlChanger('marc') jetait dans rlMenu, 377 erreurs de page au premier essai) ; « tous » = chacun sauf « client » */
  const toutRole = await p.evaluate(() => (typeof ROLES === 'object' ? Object.keys(ROLES).filter(k => k !== 'client') : []));
  const ROLES = ROLES_ARG[0] === 'tous' ? toutRole : ROLES_ARG;
  const att = ms => p.waitForTimeout(ms);
  // 1. charger les champs : par recensement du DOM de données (jamais une liste de chemins écrite à la main), filtré par nom de clé
  const charge = await p.evaluate(({ noms, cles, formes }) => { const F = formes.map(s => eval(s)); const legende = {}; let n = 5000, nb = 0; const vus = new WeakSet();
    const libre = k => cles === '*' ? !/^(id|k|ids|.*Id|.*ID|pid|cli|cid|tid|qui|tech|techs|four|lieu|int|fac|dev|ctr|lien|ref|etat|statut|type|metier|role|mode|col|couleur|d|date|h|heure|de|a|tel|cp|iban|bic|siret)$/i.test(k) : cles.split(',').includes(k);
    const rec = (o, chemin, prof) => { if (!o || typeof o !== 'object' || vus.has(o) || prof > 8) return; if (o instanceof Node || o === window || o instanceof Event || ArrayBuffer.isView(o) || o instanceof Date) return; vus.add(o);
      for (const k of Object.keys(o)) { let v; try { v = o[k]; } catch (e) { continue; } if (typeof v === 'string') { if (!libre(k) || v.length < 2 || v.length > 400 || /^(data:|blob:|https?:)/.test(v)) continue; const id = 'n' + (++n); legende[id] = chemin + '.' + k; try { o[k] = F[nb++ % F.length](id); } catch (e) {} } else if (v && typeof v === 'object') rec(v, chemin + '.' + k, prof + 1); } };
    for (const nom of noms) { let v; try { v = (0, eval)(nom); } catch (e) { continue; } if (v && typeof v === 'object') rec(v, nom, 0); }
    window.__legende = legende; return { nb, legende }; }, { noms: NOMS, cles: CLES, formes: FORMES.map(f => f.toString()) });
  const legende = charge.legende; console.log('  · champs chargés :', charge.nb, '(' + NOMS.join(',') + ' · clés ' + CLES + ')');
  L.v('population : au moins 5 champs ont reçu une charge', charge.nb >= 5, charge.nb);
  const trouves = new Map(), vus = new Set(); let nEcrans = 0, nGestes = 0;
  const lire = async ou => { for (const f of p.frames()) { let R; try { R = await f.evaluate(O.LIRE); } catch (e) { continue; } R.vues.forEach(v => vus.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ; if (!trouves.has(k)) trouves.set(k, { ...s, ou }); }); } };
  for (const role of ROLES) {
    try { await p.evaluate(r => rlChanger(r, { muet: true }), role); } catch (e) { if (role !== ROLES[0]) continue; } await att(600);
    const routes = await p.evaluate(({ fiches, max }) => { const R = Object.keys(vues()).filter(r => !/-x-/.test(r) && (typeof rlPermis !== 'function' || rlPermis(r))), P = [];
      if (fiches) { try { INTS.slice(0, max).forEach(i => P.push('inter-x-' + i.id)); } catch (e) {} try { Object.keys(CLIENTS).slice(0, max).forEach(k => P.push('client-x-' + k)); } catch (e) {} try { DV.slice(0, max).forEach(d => P.push('devis-x-' + d.id)); } catch (e) {} try { FACTURES.slice(0, max).forEach(f => P.push('facture-x-' + (f.id || f.num))); } catch (e) {} }
      return R.concat(P); }, { fiches: FICHES, max: MAXFICHES });
    for (const r of routes) {
      try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; } await att(260); nEcrans++; await lire(r + ' ▸ ' + role);
      const gs = (await L.gestes(p, '#contenu')).slice(0, /-x-/.test(r) ? GESTES + 6 : GESTES);
      for (const g of gs) { try { const ici = await p.evaluate(() => location.hash); await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(160); nGestes++; await lire(r + ' ▸ ' + role + ' · ' + g.lib); await L.ranger(p); const la = await p.evaluate(() => location.hash); if (la !== ici) { await p.evaluate(x => aller(x), r); await L.calme(p, 220); } } catch (e) { await L.ranger(p).catch(() => {}); } }
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
    }
  }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice()), puits = await p.evaluate(() => (window.top.__puits || []).slice());
  const sorties = [...trouves.values()], lib = id => legende[id] || id;
  console.log('  · écrans lus :', nEcrans, '· gestes :', nGestes, '· charges retrouvées à l\'écran :', vus.size, '· puits :', puits.length);
  sorties.slice(0, 15).forEach(s => console.log('  SORTIE', s.sorte, '←', lib(s.champ), '· écran :', s.ou));
  const parPile = new Map(); puits.forEach(x => { const k = x.k + ' ◂ ' + x.pile; if (!parPile.has(k)) parPile.set(k, []); parPile.get(k).push(lib(x.tok)); });
  [...parPile.entries()].slice(0, 15).forEach(([k, v]) => console.log('  PUITS', k.slice(0, 220), '←', [...new Set(v)].slice(0, 3).join(', ')));
  [...new Set(hits)].slice(0, 10).forEach(h => console.log('  EXÉCUTION ←', lib(h)));
  L.v('population : ≥ 20 écrans lus et ≥ 3 charges retrouvées à l\'écran (échappées)', nEcrans >= 20 && vus.size >= 3, { nEcrans, vues: vus.size });
  L.v('AUCUNE exécution (window.__hits) : ' + hits.length, hits.length === 0, [...new Set(hits)].map(lib).slice(0, 6));
  L.v('AUCUNE balise ni gestionnaire né d\'une donnée : ' + sorties.length, sorties.length === 0, sorties.slice(0, 6).map(s => lib(s.champ) + ' ▸ ' + s.sorte + ' ▸ ' + s.ou));
  L.v('AUCUN écriture HTML ne reçoit une charge brute (puits) : ' + puits.length, puits.length === 0, [...parPile.entries()].slice(0, 5).map(([k, v]) => k.slice(0, 160) + ' ← ' + v[0]));
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); }); await att(300);
  const T = await p.evaluate(O.LIRE), P2 = await p.evaluate(() => (window.top.__puits || []).some(x => x.tok === 'n999')); await p.evaluate(() => document.getElementById('zz-controle').remove());
  L.v('contre-épreuve : la lecture voit la balise posée exprès, et le puits voit l\'écriture brute', T.sorti.some(s => s.champ === 'n999') && P2, { lire: T.sorti.length, puits: P2 });
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); console.log('  · erreurs de page :', nErr.length, nErr.slice(0, 3));
  fs.writeFileSync(SORTIE + NOMSORTIE + '.json', JSON.stringify({ champs: charge.nb, nEcrans, nGestes, sorties, puits: puits.map(x => ({ ...x, champ: lib(x.tok) })), hits: [...new Set(hits)].map(lib), erreurs: nErr.slice(0, 5) }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
