// SONDE « injection par les données » : toute donnée libre du prototype devient une charge numérotée, puis on visite les écrans
// (et on touche les boutons qui ouvrent des fiches, des aperçus, des panneaux) et on regarde si une charge SORT de son texte.
// Usage : node injection-donnees.js [--qui=marc] [--round=A|B] [--routes=a,b,c] [--clics=30] [--profil=mac] [--nuit]
// Rend « N ✓ · M ✗ » (✗ = une charge est sortie de son texte, ou un champ n'a jamais été vu : à lire) et un JSON dans /tmp.
// RECONTRÔLE (étape 8) : mêmes pages que celles du dépôt (la tête corrigée), charges de FORMES DIFFÉRENTES de celles de l'audit (svg, entité, sortie de balise, URL…)
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const QUI = arg('qui', 'marc'), ROUND = arg('round', 'A'), CLICS = +arg('clics', 30), PROFIL = arg('profil', 'mac'), SEUL = arg('routes', ''), NUIT = process.argv.includes('--nuit'), PAGE = arg('page', ''), DECAL = +arg('decal', 0);
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/';
fs.mkdirSync(SORTIE, { recursive: true });

// les sept FORMES de charge : chacune ouvre une porte différente (balise svg sans espace, entités à double décodage, fermeture d'un conteneur de texte,
// sortie d'attribut sans guillemet, URL à schéma de script) — un champ reçoit celle de son rang + DECAL, pour que deux passages ne jouent pas les mêmes
const FORMES = [
  id => `¤${id}¤<svg/onload=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤&lt;i data-xss=${id}&gt;&lt;/i&gt;&lt;img src=x onerror=__xss('${id}')&gt; &amp;lt;i data-xss=${id}&amp;gt;`,
  id => `¤${id}¤</textarea></title></style></noscript></script><i data-xss=${id}></i><details open ontoggle=__xss('${id}')>`,
  id => `¤${id}¤ x onmouseover=__xss('${id}') autofocus onfocus=__xss('${id}') data-xss-att=${id} y=`,
  id => `javascript:__xss('${id}')//¤${id}¤`,
  id => `¤${id}¤\u0022\u003e\u003ci data-xss=${id}\u003e\u003c/i\u003e %22%3E%3Ci data-xss=${id}%3E`,
  id => `¤${id}¤'"><iframe srcdoc="<i data-xss=${id}></i><script>parent.__xss('${id}')<\/script>"></iframe><math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=x onerror=__xss('${id}')&gt;">`,
];
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI === 'null' ? null : QUI, nuit: NUIT, init: O.INIT, guide: false, attente: 1500 });
  const { p } = c; p.on('dialog', d => d.dismiss().catch(() => {}));
  const noms = O.nomsPremierNiveau('prototype-op-gestion.html');
  // les adresses à visiter, dressées AVANT de muter (les identifiants ne sont pas touchés, mais autant lire l'état d'origine)
  const routes = await p.evaluate(() => { const R = Object.keys(vues()).filter(r => !/-x-/.test(r)), P = [];
    const ids = (nom, f) => { try { const v = (0, eval)(nom); (Array.isArray(v) ? v.map(f) : Object.keys(v)).forEach(x => x && P.push(x)); } catch (e) {} };
    ids('CLIENTS', x => null); try { Object.keys(CLIENTS).forEach(k => P.push('client-x-' + k)); } catch (e) {}
    try { INTS.forEach(i => P.push('inter-x-' + i.id)); } catch (e) {} try { FACTURES.forEach(f => P.push('facture-x-' + (f.id || f.num))); } catch (e) {}
    try { Object.keys(DEVIS_REG).forEach(k => P.push('devis-x-' + k)); } catch (e) {} try { CONTRATS.forEach(k => { P.push('contrat-x-' + k.id); P.push('signer-x-' + k.id); }); } catch (e) {}
    return { R, P }; });
  const tous = routes.R.concat(routes.P).filter(r => !SEUL || SEUL.split(',').some(s => r === s || r.startsWith(s + '-x-')));
  const m = await p.evaluate(O.MUTER + '', {}).catch(() => null);
  const res = await p.evaluate(`(${O.MUTER})(${JSON.stringify({ noms, round: ROUND, chargeSrc: '(' + ((FORMES, DECAL) => id => FORMES[(parseInt(id.slice(1), 10) + DECAL) % FORMES.length](id)).toString() + ')(' + '[' + FORMES.map(f => f.toString()).join(',') + '],' + DECAL + ')' })})`);
  L.v('population : des champs ont été mutés', res.champs > 100, res);
  const champs = await p.evaluate(() => window.__champs);
  const trouves = new Map(), vus = new Set(), erreursAvant = c.err.length; let visites = 0, clics = 0;
  const lire = async (ou) => { const cadres = p.frames(); for (const f of cadres) { let r; try { r = await f.evaluate(O.LIRE); } catch (e) { continue; } r.vues.forEach(x => vus.add(x));
      for (const s of r.sorti) { const k = s.sorte + '|' + s.champ; if (!trouves.has(k)) trouves.set(k, { ...s, ou, chemin: champs[s.champ] || '?' }); } } };
  for (const r of tous) { try { await p.evaluate(x => aller(x), r); await L.calme(p, 450); } catch (e) { continue; } visites++; await lire(r);
    // touche les boutons de l'écran un par un : fiches, aperçus, panneaux, menus ; on revient à l'écran après chacun
    const gs = (await L.gestes(p, '#contenu')).slice(0, CLICS);
    for (const g of gs) { try { const ici = await p.evaluate(() => location.hash); await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await p.waitForTimeout(220); clics++; await lire(r + ' ▸ ' + g.lib); await L.ranger(p);
        const la = await p.evaluate(() => location.hash); if (la !== ici) { await p.evaluate(x => aller(x), r); await L.calme(p, 300); } } catch (e) { await L.ranger(p).catch(() => {}); } } }
  const hits = await p.evaluate(() => window.__hits.slice());
  // d'où vient chaque charge sortie : l'interpolation la plus COURTE qui la porte brute est la fautive (les gabarits plus hauts la portent en passant)
  const orig = await p.evaluate(() => window.__orig || []), puits = await p.evaluate(() => window.__puits || []);
  const lignes = {}; orig.forEach(o => { const t = lignes[o.tok]; if (!t || o.len < t.len) lignes[o.tok] = o; });
  console.log(`\nécrans visités : ${visites} · clics : ${clics} · champs mutés : ${res.champs} · champs vus à l'écran : ${vus.size}`);
  const sorties = [...trouves.values()]; const motif = ch => String(ch).replace(/\.\d+(?=\.|$)/g, '[]').replace(/\.[A-Za-z0-9_-]{1,40}-\d+\b/g, '.<clé>');
  const regroupe = {}; sorties.forEach(s => { const k = s.sorte + ' ← ' + motif(s.chemin); (regroupe[k] = regroupe[k] || { n: 0, ou: new Set() }).n++; regroupe[k].ou.add(s.ou); });
  sorties.forEach(s => { const o = lignes[s.champ]; s.ligne = o ? o.pg + ':' + o.l : null; const pu = puits.find(x => x.tok === s.champ); s.puits = pu ? pu.k + ' ' + pu.pile : null; });
  Object.entries(regroupe).sort().forEach(([k, v]) => { const ex = sorties.find(s => s.sorte + ' ← ' + motif(s.chemin) === k); console.log('  SORTIE', k, '×' + v.n, '· ligne', ex.ligne || '?', '· écrans :', [...v.ou].slice(0, 2).join(' | ').slice(0, 80)); });
  const hr = {}; hits.forEach(h => { const k = motif(champs[h] || '?'); hr[k] = (hr[k] || 0) + 1; }); Object.entries(hr).sort().forEach(([k, v]) => console.log('  EXÉCUTION ←', k, '×' + v));
  L.v(`aucune charge n'est sortie de son texte (${sorties.length} sorties)`, sorties.length === 0, sorties.slice(0, 5));
  L.v(`aucune charge n'a exécuté de code (${hits.length})`, hits.length === 0, hits.slice(0, 5));
  const nonVus = Object.keys(champs).filter(k => !vus.has(k)); console.log('  champs jamais vus à l\'écran :', nonVus.length, '/', Object.keys(champs).length);
  fs.writeFileSync(SORTIE + `donnees-${QUI}-${ROUND}-${PROFIL}${SEUL ? '-seul' : ''}.json`, JSON.stringify({ visites, clics, mutes: res.champs, vus: vus.size, sorties, puits: puits.slice(0, 300), lignes, hits: hits.map(h => [h, champs[h]]), nonVus: nonVus.map(k => champs[k]) }, null, 1));
  const erreurs = c.err.slice(erreursAvant); console.log('  erreurs JS pendant la visite :', erreurs.length, erreurs.slice(0, 5));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
