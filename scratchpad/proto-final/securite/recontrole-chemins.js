// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), faille S01/S02 : « ce qui vient d'un courriel ne devient pas du code ».
// L'audit a joué les gestes de la Boîte mail sur une charge fabriquée par SON générateur (guillemets, chevrons, fermeture d'attribut). Ici : TROIS autres
// formes (le même « nom d'expéditeur » ET le même objet) et TOUS les gestes qui recopient un nom ou un objet de courriel ailleurs :
//   · double décodage : « &lt;i data-xss…&gt; » (sûr écrit une fois, du code s'il est décodé deux fois) ;
//   · sortie de conteneurs : « </span></div><i data-xss…> » sans guillemet ;
//   · guillemet simple seul, sans chevron : « ' onmouseover='__xss("…")' x=' » (passe tout filtre qui ne retire que < > ") ;
// gestes : répondre avec un créneau (option au planning : « Option · <nom> »), confier, créer une tâche depuis le courriel, la règle « toujours ranger »,
// « C'est un client », « Créer le client et son devis », accord par courriel, annonce de paiement ; puis tous les écrans de chaque rôle de l'équipe et le Planning.
// Population : chaque geste a été joué (compteur) ; contre-épreuve : la lecture voit une balise posée exprès.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/';
const FORMES = [
  id => `¤${id}¤&lt;i data-xss=${id}&gt;&lt;img src=x onerror=__xss('${id}')&gt;`,
  id => `¤${id}¤</span></div></td><i data-xss=${id}></i><img src=x onerror=__xss('${id}')>`,
  id => `¤${id}¤' onmouseover='__xss("${id}")' data-xss=${id} x='`,
];
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500, init: O.INIT }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const legende = await p.evaluate(src => { const F = eval(src), leg = {};
    const txtPanne = 'Bonjour, ma climatisation ne refroidit plus depuis hier, elle fuit. Pouvez-vous passer rapidement ? Urgent.\nTél. : 06 45 67 89 01\nà Aytré';
    const txtDevis = 'Bonjour, je voudrais un devis pour une climatisation, salon 35 m².\nTél. : 06 45 67 89 01\nà Aytré';
    F.forEach((f, i) => { const idN = 'n' + (400 + i * 2), idO = 'n' + (401 + i * 2); leg[idN] = 'nom, forme ' + i; leg[idO] = 'objet, forme ' + i;
      MAILS.push(mlM('wP' + i, AUJ, '10:0' + i, { nom: f(idN), mail: 'panne' + i + '@exemple.fr' }, 'Panne ' + f(idO), txtPanne, {}));
      MAILS.push(mlM('wD' + i, AUJ, '10:1' + i, { nom: f(idN + 'd'), mail: 'devis' + i + '@exemple.fr' }, 'Devis clim ' + f(idO + 'd'), txtDevis, {})); leg[idN + 'd'] = 'nom (devis), forme ' + i; leg[idO + 'd'] = 'objet (devis), forme ' + i; });
    return leg; }, '[' + FORMES.map(f => f.toString()).join(',') + ']');
  await p.evaluate(() => aller('boiteMail')); await L.attendre(p, () => COURRIER.etat === 'pret', 20000); await att(700);
  await p.evaluate(() => COURRIER.inst.rafraichir()); await att(900);
  // gestes : un bouton synthétique data-ml / data-mbx, comme la page elle-même le fait (cestfour), par mail
  const joues = {}; const compte = (k, ok) => { joues[k] = (joues[k] || 0) + (ok ? 1 : 0); };
  const erreurs = [];
  const clic = async (attr, val, id, k) => { try { const ok = await p.evaluate(({ attr, val, id }) => { const b = document.createElement('button'); b.setAttribute(attr, val + '|' + id); b.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0'; document.body.appendChild(b); try { b.click(); } finally { b.remove(); } try { fermerPanneau(); } catch (e) {} return true; }, { attr, val, id }); compte(k, ok); } catch (e) { erreurs.push(k + ' : ' + String(e.message).slice(0, 80)); } await att(250); };
  for (const id of ['wP0', 'wP1', 'wP2', 'wD0', 'wD1', 'wD2']) {
    for (const [a, v] of [['data-ml', 'tache'], ['data-mbx', 'regle'], ['data-mbx', 'cestclient'], ['data-ml', 'nvdevis'], ['data-ml', 'creerint'], ['data-ml', 'accord'], ['data-ml', 'annonce']]) await clic(a, v, id, v);
    // confier : la fonction réelle ; répondre avec un créneau : le chemin réel (mlRep + crProp + mbxApresEnvoi)
    try { const ok = await p.evaluate(id => { const m = mlDe(id); try { mbxConfier(m, 'sm'); } catch (e) { return 'confier:' + e.message; }
      mlRep = { id, modele: 'creneau' }; MBX.crProp = { id, list: mlCreneaux() }; const t = MBX.crProp.list.map(c => jlong(c.d) + ' à ' + mlH(c.h)).join(' ; ');
      try { mbxApresEnvoi(m, 'Bonjour, ' + t); } catch (e) { return 'envoi:' + e.message; } try { fermerPanneau(); } catch (e) {} return 'ok'; }, id); compte('confier+créneau', ok === 'ok'); if (ok !== 'ok') erreurs.push(id + ' ' + ok); } catch (e) { erreurs.push(id + ' ' + e.message.slice(0, 80)); }
    await att(250);
  }
  const popul = await p.evaluate(() => ({ options: BUREAU.filter(b => b.option).length, taches: TACHES.filter(t => /Panne|Devis clim|¤n4/.test(t.t + (t.origine || ''))).length, clients: Object.keys(CLIENTS).filter(k => /¤n4/.test(CLIENTS[k].nom)).length, journal: (typeof JOURNAL !== 'undefined' ? JOURNAL : []).filter(j => /¤n4/.test(JSON.stringify(j))).length }));
  console.log('  · gestes joués :', JSON.stringify(joues), '· erreurs :', JSON.stringify(erreurs.slice(0, 5)), '· ce que les gestes ont laissé :', JSON.stringify(popul));
  L.v('population : les gestes ont laissé des options au planning, des tâches et des clients', popul.options >= 3 && popul.taches >= 3 && popul.clients >= 1, popul);
  // tous les écrans, sous chaque rôle de l'équipe + le planning à plusieurs dates
  const trouves = new Map(), vus = new Set(); let nEcrans = 0;
  const lire = async ou => { let R; try { R = await p.evaluate(O.LIRE); } catch (e) { return; } R.vues.forEach(v => vus.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ + '|' + ou.split(' ▸ ')[1]; if (!trouves.has(k)) trouves.set(k, { ...s, ou }); }); };
  const roles = await p.evaluate(() => Object.keys(ROLES).filter(k => k !== 'client'));
  for (const k of roles) {
    try { await p.evaluate(r => rlChanger(r, { muet: true }), k); } catch (e) { continue; } await att(600);
    const routes = await p.evaluate(() => { const r = Object.keys(vues()).filter(x => !/-x-/.test(x) && (typeof rlPermis !== 'function' || rlPermis(x)));
      Object.keys(CLIENTS).filter(x => /¤n4/.test(CLIENTS[x].nom)).forEach(x => r.push('client-x-' + x)); DV.filter(d => /¤n4/.test((CLIENTS[d.cli] || {}).nom || '')).forEach(o => r.push('devis-x-' + o.id)); INTS.filter(i => /¤n4/.test((CLIENTS[i.cli] || {}).nom || '')).forEach(i => r.push('inter-x-' + i.id)); return r; });
    for (const r of routes) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; } await att(300); nEcrans++; await lire(r + ' ▸ ' + k);
      const gs = (await L.gestes(p, '#contenu')).slice(0, 4);
      for (const g of gs) { try { await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(180); await lire(r + ' ▸ ' + k + ' · ' + g.lib); await L.ranger(p); const la = await p.evaluate(() => route); if (la !== r) { await p.evaluate(x => aller(x), r); await L.calme(p, 250); } } catch (e) { await L.ranger(p).catch(() => {}); } }
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  }
  // survol : le planning des journées qui portent une option (le titre « Option · <nom> » vit dans un bloc du planning)
  try { await p.evaluate(() => { rlChanger('patron', { muet: true }); aller('planning'); }); await att(900); const jours = await p.evaluate(() => [...new Set(BUREAU.filter(b => b.option).map(b => b.d))]);
    for (const d of jours.slice(0, 3)) { await p.evaluate(x => { try { PLAN.d = x; } catch (e) {} aller('planning'); }, d); await att(500); await lire('planning ▸ patron'); nEcrans++; } } catch (e) {}
  const hits = await p.evaluate(() => (window.top.__hits || []).slice());
  const sorties = [...trouves.values()];
  console.log('  · écrans visités :', nEcrans, '· charges retrouvées à l\'écran :', vus.size);
  sorties.slice(0, 20).forEach(s => console.log('  SORTIE', s.sorte, '←', legende[s.champ] || s.champ, '· écran :', s.ou));
  L.v('population : ≥ 60 écrans visités sous les rôles de l\'équipe', nEcrans >= 60, nEcrans);
  L.v('population : des charges sont retrouvées (échappées) à l\'écran — la lecture regarde au bon endroit', vus.size >= 3, [...vus]);
  L.v('AUCUNE charge (nom ou objet) n\'est sortie de son texte (balise, gestionnaire) — sorties : ' + sorties.length, sorties.length === 0, sorties.slice(0, 6).map(s => (legende[s.champ] || s.champ) + ' ▸ ' + s.sorte + ' ▸ ' + s.ou));
  L.v('AUCUN code exécuté (window.__hits) : ' + hits.length, hits.length === 0, hits.map(h => legende[h] || h).slice(0, 6));
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); }); await att(400);
  const T = await p.evaluate(O.LIRE); await p.evaluate(() => document.getElementById('zz-controle').remove());
  L.v('contre-épreuve : la lecture voit la balise posée exprès', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 2));
  fs.writeFileSync(SORTIE + 'chemins.json', JSON.stringify({ joues, popul, sorties, hits: hits.filter(h => h !== 'n999'), vus: [...vus], nEcrans }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
