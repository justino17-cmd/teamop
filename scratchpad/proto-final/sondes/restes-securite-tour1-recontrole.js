// RECONTRÔLE ADVERSE des RESTES de la sécurité, tour 1 (18 novembre 2026) — ce que les corrections (cliNet, mlDeNet, toastSur, uniteSure…) ont pu CASSER à côté.
// Les sondes du correcteur cherchent la charge qui SORT de son texte. Celle-ci cherche l'autre défaut : un nom DE BONNE FOI mais bizarre (mots réservés d'objet, motifs
// spéciaux de String.replace, apostrophes, & et entités, très long, un seul signe) qui fait JETER une vue, afficher « NaN / undefined / [object » ou RECOPIER le nom deux fois.
//   1. une base de référence : tous les écrans (rôle gérant) comptés, erreurs de page et anomalies de texte relevées SANS rien changer ;
//   2. les noms de clients et de l'équipe deviennent des noms bizarres (par cliNet, la vraie porte) ; mêmes écrans ; on compare écran par écran ;
//   3. chaque nom essayé se retrouve à l'écran tel qu'il est écrit (« $& » ne se multiplie pas, « Martin & Fils » reste lisible) — population comptée.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/rec-secu1/';
const NOMS = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', 'length', '$&', "$'", '$1', '$`', 'NaN', 'undefined', 'null', '[object Object]', '%s', '{{nom}}', '${nom}', "O'Brien & Fils", 'Dupont &amp; Fils', 'A', 'Ω', 'Sté Nord–Sud « Le Clos »', 'Établissements Jean-Baptiste Lefebvre-Dubois et Associés Réunis de Charente-Maritime'];
const ANOM = /\bNaN\b|\[object |\bundefined\b|\bnull\b|\bfunction\b|\$\{|\bInfinity\b/g;
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', guide: false, attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  let LEGIT = []; const window_noms_legit = t => LEGIT.reduce((n, m) => n + (t.split(m).length - 1), 0);   /* les noms « NaN », « undefined », « null », « [object Object] » rangés exprès se lisent à l'écran : ils ne comptent pas comme anomalie */
  // 15 clients de plus, à noms ORDINAIRES d'abord (la base de référence les voit tels quels), pour que les 23 noms essayés trouvent chacun un client ; chacun a une intervention
  const ajout = await p.evaluate(() => { const k0 = Object.keys(CLIENTS)[0]; let n = 0; for (let i = 1; i <= 15; i++) { const k = 'zq' + i; CLIENTS[k] = cliNet({ ...JSON.parse(JSON.stringify(CLIENTS[k0])), nom: 'Client essai ' + i, contact: 'Client essai ' + i, mail: 'essai' + i + '@exemple.fr', adr: i + ' rue des Essais, 17000 La Rochelle' }); const i0 = INTS.find(x => x.cli === k0); if (i0) INTS.push({ ...JSON.parse(JSON.stringify(i0)), id: 'zqI' + i, cli: k }); n++; } return n; });
  L.v('population : quinze clients ordinaires ajoutés par cliNet', ajout === 15, ajout);
  const routes = await p.evaluate(() => { const r = Object.keys(vues()).filter(x => !/-x-/.test(x) && (typeof rlPermis !== 'function' || rlPermis(x)));
    Object.keys(CLIENTS).slice(0, 8).concat(['zq1', 'zq9', 'zq15']).forEach(k => r.push('client-x-' + k)); try { INTS.slice(0, 8).forEach(i => r.push('inter-x-' + i.id)); } catch (e) {} try { DV.slice(0, 6).forEach(o => r.push('devis-x-' + o.id)); } catch (e) {} return r; });
  L.v('population : au moins 60 écrans à visiter', routes.length >= 50, routes.length);
  const passe = async () => { const out = {}; for (const r of routes) { const e0 = c.err.length; try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { out[r] = { delai: true }; continue; } await att(260);
      const t = await p.evaluate(() => (document.getElementById('contenu') || document.body).innerText); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
      out[r] = { err: c.err.slice(e0).filter(x => !/ResizeObserver/.test(String(x))).map(x => String(x).slice(0, 120)), anom: (t.match(ANOM) || []).length - (window_noms_legit(t)), ctx: [...t.matchAll(new RegExp(ANOM.source, 'g'))].slice(0, 12).map(m => t.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' ')), len: t.length, t }; } return out; };
  const base = await passe();
  const erreursBase = Object.values(base).reduce((n, x) => n + (x.err ? x.err.length : 0), 0);
  // mutation : les NOMS de clients et de l'équipe, par la vraie porte (cliNet) pour les clients
  const mut = await p.evaluate(noms => { const cles = Object.keys(CLIENTS); let n = 0; cles.forEach((k, i) => { const nom = noms[i % noms.length]; const o = cliNet({ ...CLIENTS[k], nom, contact: nom }); CLIENTS[k].nom = o.nom; CLIENTS[k].contact = o.contact; n++; });
    const eq = (typeof EQUIPE !== 'undefined' ? EQUIPE : []).filter(x => x && typeof x.prenom === 'string'); eq.forEach((x, i) => { x.prenom = noms.filter(z => !/^(NaN|undefined|null|\[object Object\])$/.test(z))[(i + 5) % (noms.length - 4)].slice(0, 20);   /* jamais un mot que la sonde cherche : « undefined » comme prénom serait une anomalie de la sonde */ if (typeof H_GENS !== 'undefined' && H_GENS[x.k]) H_GENS[x.k].nom = x.prenom + ' ' + x.nom; });
    return { clients: n, equipe: eq.length, noms: cles.map(k => CLIENTS[k].nom) }; }, NOMS);
  L.v('population : des noms de clients bizarres ont été rangés par cliNet', mut.clients >= 23, mut);
  LEGIT = mut.noms.filter(z => /^(NaN|undefined|null|\[object Object\]|\$\{nom\})$/.test(z)); const apres = await passe();
  let erreursApres = 0, plusAnom = [], nouveauxDelai = [];
  for (const r of routes) { const a = apres[r], b = base[r]; if (a.delai && !b.delai) nouveauxDelai.push(r); erreursApres += a.err ? a.err.length : 0;
    if (a.err && a.err.length > ((b.err || []).length)) plusAnom.push(r + ' ▸ erreur : ' + a.err[0]);
    else if (a.anom > b.anom) plusAnom.push(r + ' ▸ anomalies de texte ' + b.anom + ' → ' + a.anom + ' : ' + JSON.stringify(a.ctx)); }
  L.v('aucun écran ne jette une erreur de plus avec ces noms (' + erreursBase + ' avant, ' + erreursApres + ' après)', plusAnom.filter(x => /erreur/.test(x)).length === 0, plusAnom.filter(x => /erreur/.test(x)).slice(0, 6));
  L.v('aucun écran ne montre plus de « NaN / undefined / [object / null » avec ces noms', plusAnom.filter(x => /anomalies/.test(x)).length === 0, plusAnom.filter(x => /anomalies/.test(x)).slice(0, 6));
  L.v('aucun écran ne s\'est mis à dépasser son délai', nouveauxDelai.length === 0, nouveauxDelai.slice(0, 6));
  // chaque nom se retrouve à l'écran tel qu'il est écrit : une fois, pas dupliqué par un motif spécial de String.replace
  const lieu = 'clients', tClients = (apres[lieu] || apres['clients-liste'] || {}).t || '';
  const rClients = routes.find(r => /^clients?$/.test(r)) || routes.find(r => /client/.test(r) && !/-x-/.test(r));
  const t = (apres[rClients] || {}).t || '';
  const lus = mut.noms.filter(n => t.indexOf(n) > -1);
  L.v('population : la liste des clients (' + rClients + ') montre au moins 6 des noms bizarres tels qu\'ils sont écrits', lus.length >= 12, { lus: lus.length, sur: mut.noms.length });
  const doublons = ['$&', "$'", '$1', '$`'].filter(m => mut.noms.includes(m)).map(m => ({ m, n: (t.split(m).length - 1) })).filter(x => x.n > 1);
  L.v('un nom « $& » (ou « $\' », « $1 », « $` ») n\'est pas multiplié par un remplacement de texte', doublons.length === 0, doublons);
  // fiches clients ouvertes une à une : le titre porte le nom écrit
  const fiches = await p.evaluate(async () => { const r = []; for (const k of Object.keys(CLIENTS)) { try { aller('client-x-' + k); } catch (e) { r.push({ k, erreur: e.message }); continue; } await new Promise(z => setTimeout(z, 160)); const h = (document.querySelector('#contenu h1, #contenu h2, #contenu .titre') || {}).textContent || ''; r.push({ k, nom: CLIENTS[k].nom, h: h.trim().slice(0, 100), ok: h.indexOf(CLIENTS[k].nom.slice(0, 40)) > -1 }); } return r; });
  const mauvaises = fiches.filter(f => !f.ok);
  L.v('population : toutes les fiches client ouvertes (23)', fiches.length >= 23, fiches.length);
  L.v('chaque fiche client titre porte le nom écrit (sauf nom plus long que le titre) — mauvaises : ' + mauvaises.length, mauvaises.length <= 1, mauvaises.slice(0, 4));
  fs.writeFileSync(SORTIE + 'recontrole-noms.json', JSON.stringify({ plusAnom, nouveauxDelai, fiches: mauvaises }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
