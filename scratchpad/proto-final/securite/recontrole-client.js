// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), angle « un AUTRE rôle que ceux de l'audit : le CLIENT ».
// Les failles S01 à S03 étaient « un inconnu écrit à la boîte » et « une personne de l'équipe tape un nom ». Le client de l'espace client est un
// troisième auteur, EXTERNE, authentifié par un lien : il tape une demande (« Que se passe-t-il ? »), le nom sous lequel il signe un devis, et
// ces textes arrivent chez le bureau (tâche, intervention, journal, devis, notifications). Les deux barrières de l'audit (nettoyage à l'entrée,
// échappement à la sortie) ne couvraient que les noms de personnes, d'expéditeurs et d'unités : ici, aucune.
// La sonde joue les VRAIS gestes du client (le vrai formulaire de demande, la vraie fenêtre de signature d'un devis), avec sept formes de charge
// (svg, entités, fermeture de conteneur, sortie d'attribut, URL, encodages, iframe srcdoc), puis relit TOUS les écrans sous chaque rôle de
// l'équipe : une charge est « sortie » si elle crée une balise ou un gestionnaire, « exécutée » si window.__hits monte.
// Population d'abord (la demande a vraiment été créée, la signature a vraiment eu lieu, les charges se retrouvent à l'écran échappées).
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. RACINE=<copie> rejoue la sonde sur une copie mutée.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/';
const FORMES = [
  id => `¤${id}¤<svg/onload=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤&lt;i data-xss=${id}&gt;&lt;/i&gt;&lt;img src=x onerror=__xss('${id}')&gt;`,
  id => `¤${id}¤</textarea></title></style></noscript></script><i data-xss=${id}></i><details open ontoggle=__xss('${id}')>`,
  id => `¤${id}¤"'><i data-xss=${id}></i><img src=x onerror="__xss('${id}')">');__xss('${id}');//`,
  id => `¤${id}¤ x onmouseover=__xss('${id}') autofocus onfocus=__xss('${id}') y=`,
];
const SRC_FORMES = '[' + FORMES.map(f => f.toString()).join(',') + ']';
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500, init: O.INIT }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const legende = {};
  // ── 1. le client : sa demande d'intervention, sa demande de contrat, sa signature d'un devis ──
  const D = await p.evaluate(async src => { const F = eval(src); let n = 200; const ch = (d, k) => { const id = 'n' + (++n); window.__leg = window.__leg || {}; window.__leg[id] = d; return F[k % F.length](id); };
    dvInit();
    const du = f => ['envoyee', 'retard', 'partielle'].includes(f.st) && f.num !== '—';
    const K = Object.keys(CLIENTS).find(k => DV.some(d => d.cli === k && d.num && d.e === 'attente') && INTS.some(i => i.cli === k)) || Object.keys(CLIENTS).find(k => INTS.some(i => i.cli === k));
    let dv = DV.find(d => d.cli === K && d.num && d.e === 'attente'); if (!dv) { dv = DV.find(d => d.num && d.e === 'attente'); if (dv) dv.cli = K; }
    rlChanger('client', { cli: K, muet: true }); await new Promise(r => setTimeout(r, 600));
    return { K, dv: dv && dv.num, nInts: INTS.length, nTaches: TACHES.length, nJ: JOURNAL.length, chs: [ch('demande intervention : message', 0), ch('demande contrat : message', 1), ch('signature : nom du signataire', 2)] }; }, SRC_FORMES);
  Object.assign(legende, await p.evaluate(() => window.__leg));
  console.log('  · client :', D.K, '· devis à signer :', D.dv);
  L.v('population : un client simulé et un devis en attente existent', !!D.K && !!D.dv, D);
  // la demande d'intervention : le vrai formulaire
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} aller('espaceclient'); }); await att(700);
  await p.evaluate(() => ecDemande()); await att(500);
  const champs = await p.evaluate(() => ['ed-t', 'ed-a', 'ed-d', 'ed-m'].map(i => { const e = document.getElementById(i); return [i, !!e, e ? e.tagName : null]; }));
  console.log('  · champs du formulaire de demande :', JSON.stringify(champs));
  L.v('population : le formulaire de demande (type, adresse, disponibilité, message) est ouvert', champs.every(x => x[1]), champs);
  await p.locator('#ed-m').fill(D.chs[0]); await att(150);
  await p.evaluate(() => { const b = document.querySelector('[data-ec^="demandeok"]'); if (b) b.click(); }); await att(800);
  const apresDemande = await p.evaluate(() => ({ nInts: INTS.length, nTaches: TACHES.length, nJ: JOURNAL.length, derniereInt: (INTS[INTS.length - 1] || {}).motif, toast: (document.getElementById('toast') || {}).innerText || '' }));
  console.log('  · après la demande :', JSON.stringify({ ...apresDemande, derniereInt: String(apresDemande.derniereInt).slice(0, 60) }));
  L.v('population : la demande d\'intervention a créé une intervention (message : « ' + apresDemande.toast.slice(0, 50) + ' »)', apresDemande.nInts === D.nInts + 1, apresDemande);
  // la demande de contrat
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} aller('espaceclient'); }); await att(500);
  await p.evaluate(() => ecDemande(true)); await att(500);
  await p.locator('#ed-m').fill(D.chs[1]).catch(() => {}); await att(150);
  await p.evaluate(() => { const b = document.querySelector('[data-ec^="demandeok"]'); if (b) b.click(); }); await att(800);
  const apresContrat = await p.evaluate(() => ({ nTaches: TACHES.length, nJ: JOURNAL.length }));
  L.v('population : la demande de contrat a créé une tâche et une ligne d\'Historique', apresContrat.nTaches >= apresDemande.nTaches + 1 && apresContrat.nJ > apresDemande.nJ, apresContrat);
  // la signature du devis : le vrai bouton « Lire et signer », la vraie case, le vrai champ de nom
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} aller('espaceclient'); }); await att(500);
  await p.evaluate(num => { const b = document.createElement('button'); b.setAttribute('data-ec', 'signer|' + num); document.body.appendChild(b); b.click(); b.remove(); }, D.dv); await att(700);
  const fen = await p.evaluate(() => ({ nom: !!document.getElementById('dv-nom'), ok: !!document.getElementById('dv-ok'), signe: !!document.getElementById('dv-signe') }));
  L.v('population : la fenêtre de signature du devis est ouverte (nom, case, cadre de signature)', fen.nom && fen.ok && fen.signe, fen);
  await p.locator('#dv-nom').fill(D.chs[2]); await p.evaluate(() => { document.getElementById('dv-ok').checked = true; document.getElementById('dv-signe').dataset.signe = 'x'; }); await att(150);
  await p.evaluate(() => { const b = document.querySelector('[data-dv^="signer|"]'); if (b) b.click(); }); await att(900);
  const signe = await p.evaluate(num => { dvInit(); const d = DV.find(o => o.num === num); return { e: d && d.e, par: d && String(d.signePar).slice(0, 40), trace: d && String(d.trace[d.trace.length - 1][1]).slice(0, 60) }; }, D.dv);
  console.log('  · devis après signature :', JSON.stringify(signe));
  L.v('population : le devis est accepté, signé par le nom piégé (la signature a vraiment eu lieu)', signe.e === 'accepte' && /¤n\d+¤/.test(signe.par || ''), signe);
  // ── 2. ce que VOIT l'équipe : tous les écrans, sous chaque rôle ──
  const trouves = new Map(), vus = new Set(); let nEcrans = 0;
  const lire = async ou => { let R; try { R = await p.evaluate(O.LIRE); } catch (e) { return; } R.vues.forEach(v => vus.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ + '|' + ou.split(' ▸ ')[1]; if (!trouves.has(k)) trouves.set(k, { ...s, ou }); }); };
  const roles = await p.evaluate(() => Object.keys(ROLES).filter(k => k !== 'client'));
  console.log('  · rôles de l\'équipe :', roles.join(','));
  for (const k of roles) {
    try { await p.evaluate(r => rlChanger(r, { muet: true }), k); } catch (e) { console.log('  · rôle', k, ':', e.message); continue; } await att(600);
    const routes = await p.evaluate(() => { const r = Object.keys(vues()).filter(x => !/-x-/.test(x) && (typeof rlPermis !== 'function' || rlPermis(x))); INTS.slice(-3).forEach(i => r.push('inter-x-' + i.id)); DV.filter(d => d.e === 'accepte').slice(-2).forEach(o => r.push('devis-x-' + o.id)); Object.keys(CLIENTS).slice(0, 3).forEach(k => r.push('client-x-' + k)); return r; });
    for (const r of routes) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; } await att(300); nEcrans++; await lire(r + ' ▸ ' + k);
      // les fiches et lignes qui s'ouvrent : on touche les premiers boutons de l'écran (ouverture de fiche, de ligne, de tâche)
      const gs = (await L.gestes(p, '#contenu')).slice(0, 6);
      for (const g of gs) { try { await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(180); await lire(r + ' ▸ ' + k + ' · ' + g.lib); await L.ranger(p); const la = await p.evaluate(() => route); if (la !== r) { await p.evaluate(x => aller(x), r); await L.calme(p, 250); } } catch (e) { await L.ranger(p).catch(() => {}); } }
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice());
  const sorties = [...trouves.values()];
  console.log('  · écrans visités :', nEcrans, '· charges retrouvées à l\'écran (échappées ou non) :', vus.size);
  sorties.slice(0, 20).forEach(s => console.log('  SORTIE', s.sorte, '←', legende[s.champ] || s.champ, '· écran :', s.ou));
  L.v('population : ≥ 60 écrans visités sous les rôles de l\'équipe', nEcrans >= 60, nEcrans);
  L.v('population : au moins 2 charges du client se retrouvent à l\'écran de l\'équipe, échappées (sinon rien n\'est arrivé jusqu\'à lui)', vus.size >= 2, [...vus]);
  L.v('AUCUNE charge du client n\'est sortie de son texte chez l\'équipe (balise, gestionnaire, URL dangereuse) — sorties : ' + sorties.length, sorties.length === 0, sorties.slice(0, 6).map(s => (legende[s.champ] || s.champ) + ' ▸ ' + s.sorte + ' ▸ ' + s.ou));
  L.v('AUCUN code exécuté (window.__hits) : ' + hits.length, hits.length === 0, hits.map(h => legende[h] || h).slice(0, 6));
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); L.v('aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
  fs.writeFileSync(SORTIE + 'client.json', JSON.stringify({ legende, sorties, hits, vus: [...vus], nEcrans }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
