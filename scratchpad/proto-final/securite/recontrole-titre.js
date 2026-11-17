// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026) : le TITRE d'une intervention tapé par l'équipe (« Modifier l'intervention › Titre »)
// n'est ni nettoyé à l'entrée ni échappé partout à la sortie (le bouton « Retour à la fiche « … » » recopie le titre dans du balisage, les messages aussi).
// La sonde joue le vrai geste : ouvrir la fiche d'une intervention, « Modifier », taper une charge dans le titre, « Enregistrer », puis revisiter la fiche, le planning,
// la liste des interventions, l'accueil, le client, l'historique, les tâches, et les écrans où le « retour » s'affiche après un clic sur le client ou la facture de la fiche.
// Trois formes de charge (balise, svg sans espace, fermeture d'attribut). Population : le titre a bien été remplacé par la charge ; contre-épreuve : balise posée exprès.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/'; fs.mkdirSync(SORTIE, { recursive: true });
const FORMES = [
  id => `¤${id}¤<img src=x onerror=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤<svg/onload=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤'"><i data-xss=${id}></i><details open ontoggle=__xss('${id}')>`,
  id => `¤${id}¤'"><iframe srcdoc="<i data-xss=${id}></i><script>parent.__xss('${id}')<\/script>"></iframe><math><mtext><table><mglyph><style><!--</style><img title="--&gt;&lt;img src=x onerror=__xss('${id}')&gt;">`,   /* mXSS : celle du balayage de toutes les données qui a signalé INTS[].titre */
  id => `¤${id}¤ x onmouseover=__xss('${id}') autofocus onfocus=__xss('${id}') data-xss-att=${id} y=`,   /* attribut sans guillemet */
];
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', init: O.INIT, guide: false, attente: 1500 }); const { p } = c; p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const legende = {}, trouves = new Map(), vus = new Set();
  const lire = async ou => { for (const f of p.frames()) { let R; try { R = await f.evaluate(O.LIRE); } catch (e) { continue; } R.vues.forEach(v => vus.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ + '|' + ou; if (!trouves.has(k)) trouves.set(k, { ...s, ou: ou + (f === p.mainFrame() ? '' : ' [cadre]') }); }); } };   /* les documents (compte rendu, aperçus) vivent dans des cadres : les lire aussi */
  const cibles = await p.evaluate(() => ['i2', 'i7', 'i14', 'i3'].filter(x => INTS.some(i => i.id === x)).slice(0, 4));
  const modifies = [];
  for (let k = 0; k < cibles.length; k++) {
    const id = cibles[k], nid = 'n' + (800 + k); legende[nid] = 'titre d\'intervention, forme ' + k;
    await p.evaluate(x => aller('inter-x-' + x), id); await L.calme(p, 500);
    await p.evaluate(() => { const b = document.querySelector('[data-action="modifInt"]'); if (b) b.click(); }); await att(600);
    const ok = await p.evaluate(({ nid, f }) => { const e = document.getElementById('m-t'); if (!e) return 'pas de champ #m-t'; e.value = eval(f)(nid); e.dispatchEvent(new Event('input', { bubbles: true })); const b = document.querySelector('[data-action="modifIntOk"]'); if (!b) return 'pas de bouton modifIntOk'; b.click(); return true; }, { nid, f: FORMES[[3, 4, 0, 1][k % 4]].toString() });
    await att(700); await lire('après « Enregistrer » (message) · ' + id);
    const titre = await p.evaluate(x => (INTS.find(i => i.id === x) || {}).titre, id); modifies.push({ id, ok, titre: String(titre).slice(0, 50) });
  }
  console.log('  · modifications :', JSON.stringify(modifies));
  const poses = modifies.filter(m => /¤n80\d¤/.test(m.titre || ''));
  L.v('population : le vrai formulaire « Modifier l\'intervention » a rangé la charge dans le titre', poses.length >= 1, modifies);
  L.v('le titre tapé est refusé ou nettoyé (aucun chevron, aucun guillemet dans le titre rangé)', poses.length === 0 || poses.every(m => !/[<>"]/.test(m.titre)), poses);
  const routes = await p.evaluate(ids => { const r = ['planning', 'interventions', 'accueil', 'clients', 'factures', 'historique', 'taches', 'statistiques', 'registre', 'achats', 'comptabilite']; ids.forEach(i => { r.push('inter-x-' + i); const it = INTS.find(o => o.id === i); if (it) { r.push('client-x-' + it.cli); } }); return r.filter(x => /-x-/.test(x) || typeof rlPermis !== 'function' || rlPermis(x)); }, cibles);
  let visites = 0;
  for (const r of routes) { try { await p.evaluate(x => aller(x), r); await L.calme(p, 400); } catch (e) { continue; } visites++; await lire(r);
    const gs = (await L.gestes(p, '#contenu')).slice(0, /^inter-x-/.test(r) ? 14 : 6);
    for (const g of gs) { try { const ici = await p.evaluate(() => location.hash); await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(250); await lire(r + ' ▸ ' + g.lib); const lib = await p.evaluate(() => document.body.innerText.includes('Retour')); await L.ranger(p); const la = await p.evaluate(() => location.hash); if (la !== ici) { await p.evaluate(x => aller(x), r); await L.calme(p, 250); } } catch (e) { await L.ranger(p).catch(() => {}); } }
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice()), sorties = [...trouves.values()];
  console.log(`  · écrans visités : ${visites} · charges retrouvées à l'écran : ${vus.size}`);
  sorties.slice(0, 15).forEach(s => console.log('  SORTIE', s.sorte, '←', legende[s.champ] || s.champ, '· écran :', s.ou.slice(0, 90)));
  L.v('population : ≥ 8 écrans visités et des charges retrouvées à l\'écran', visites >= 8 && vus.size >= 1, { visites, vus: vus.size });
  L.v('AUCUNE charge du titre n\'est sortie de son texte — sorties : ' + sorties.length, sorties.length === 0, sorties.slice(0, 6).map(s => (legende[s.champ] || s.champ) + ' ▸ ' + s.sorte + ' ▸ ' + s.ou));
  L.v('AUCUN code exécuté (window.__hits) : ' + hits.length, hits.length === 0, hits.map(h => legende[h] || h).slice(0, 5));
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); }); await att(300);
  const T = await p.evaluate(O.LIRE); await p.evaluate(() => document.getElementById('zz-controle').remove());
  L.v('contre-épreuve : la lecture voit la balise posée exprès', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 2));
  fs.writeFileSync(SORTIE + 'titre.json', JSON.stringify({ modifies, sorties, hits: hits.filter(h => h !== 'n999'), visites, vus: [...vus] }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
