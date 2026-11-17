// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026) : « ce qu'une personne de l'équipe TAPE dans un formulaire ne devient pas du code ».
// L'audit a corrigé des champs un par un (noms de personnes, unité, fournisseur, plateforme, import de prix…) ; la sonde d'injection par les données, elle, MUTE les
// données une fois rangées (elle contourne l'entrée) : elle ne dit pas quels formulaires laissent entrer une charge. Ici on joue l'ENTRÉE : pour chaque écran, chaque
// bouton de création (« Nouveau… », « Ajouter… », « ＋ … », « Créer… », « Inviter… ») ouvre son formulaire, chaque champ TEXTE reçoit une charge numérotée (trois
// formes : balise, svg sans espace, sortie d'attribut), le bouton principal valide ; la lecture a lieu juste après (messages) puis sur tous les écrans, fiches et panneaux.
// Population : combien de formulaires ouverts, de champs remplis, de validations qui ont changé les données (compteur de lignes) ; contre-épreuve : balise posée exprès.
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Un ✗ nomme le formulaire (écran ▸ bouton ▸ champ).
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=')[1] : d; };
const QUI = arg('qui', 'marc'), MAXB = +arg('boutons', 7), SEUL = arg('routes', '');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/'; fs.mkdirSync(SORTIE, { recursive: true });
const FORMES = [
  id => `¤${id}¤<img src=x onerror=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤<svg/onload=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤'"><i data-xss=${id}></i><details open ontoggle=__xss('${id}')>`,
];
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: QUI, init: O.INIT, guide: false, attente: 1500 }); const { p } = c;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const legende = {}; let n = 700; const formulaires = []; let champsRemplis = 0, valides = 0, changes = 0;
  const trouves = new Map(), vus = new Set();
  const lire = async ou => { let R; try { R = await p.evaluate(O.LIRE); } catch (e) { return; } R.vues.forEach(v => vus.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ; if (!trouves.has(k)) trouves.set(k, { ...s, ou: ou + ' ▸ ' + (legende[s.champ] || s.champ) }); }); };
  const taille = () => p.evaluate(() => { let t = 0; for (const nm of ['CLIENTS', 'INTS', 'DV', 'FACTURES', 'TACHES', 'EQUIPE', 'PRODUITS', 'STOCK', 'FOURNISSEURS', 'ACHATS', 'BUREAU', 'CONTRATS', 'VEHICULES', 'NOTES', 'COMMANDES', 'ABSENCES', 'DEPOTS', 'CAMIONS']) { try { const v = (0, eval)(nm); t += Array.isArray(v) ? v.length : Object.keys(v).length; } catch (e) {} } try { t += JSON.stringify(window.__nonexistent || '').length; } catch (e) {} return t; }).catch(() => 0);
  let routes = await p.evaluate(() => Object.keys(vues()).filter(r => !/-x-/.test(r) && (typeof rlPermis !== 'function' || rlPermis(r))));
  if (SEUL) routes = routes.filter(r => SEUL.split(',').includes(r));
  const re = /^(＋|\+)|nouveau|nouvelle|ajouter|créer|inviter|importer|déposer|renommer|modifier/i;
  for (const r of routes) {
    try { await p.evaluate(x => aller(x), r); await L.calme(p, 450); } catch (e) { continue; }
    const gs = (await L.gestes(p, '#contenu')).filter(g => re.test(String(g.lib).trim())).slice(0, MAXB);
    for (const g of gs) {
      try {
        await p.evaluate(x => aller(x), r); await L.calme(p, 300);
        await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(500);
        const avant = await taille();
        const info = await p.evaluate(({ formes, debut }) => { const F = formes.map(s => eval(s)); const vis = e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';   /* un panneau est en position fixe : offsetParent y vaut null, il ne dit PAS « caché » */
          const sel = 'input:not([type]),input[type=text],input[type=search],textarea', cal = document.getElementById('calque'), zone = cal && [...cal.querySelectorAll(sel)].some(vis) ? cal : document.getElementById('contenu');
          const champs = [...zone.querySelectorAll(sel)].filter(e => vis(e) && !e.readOnly && !e.disabled); const rempli = [];
          champs.forEach((e, k) => { const id = 'n' + (debut + k); const v = F[k % F.length](id); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); rempli.push({ id, nom: e.id || e.name || e.placeholder || ('champ' + k) }); });
          return { dans: zone.id, champs: rempli }; }, { formes: FORMES.map(f => f.toString()), debut: n });
        info.champs.forEach(ch => { legende[ch.id] = r + ' ▸ ' + String(g.lib).trim().slice(0, 30) + ' ▸ ' + ch.nom; }); n += info.champs.length + 1; champsRemplis += info.champs.length;
        formulaires.push({ r, bouton: String(g.lib).trim().slice(0, 40), champs: info.champs.length });
        if (info.champs.length) {
          const ok = await p.evaluate(() => { const z = document.querySelector('#calque'); const cand = [...(z ? z.querySelectorAll('.actions .btn:not(.gris),.actions button:not(.gris),button.btn:not(.gris)') : [])].filter(b => b.getClientRects().length > 0); const b = cand[0]; if (!b) return false; b.click(); return true; });
          if (ok) { valides++; await att(450); await lire(r + ' ▸ après validation'); }
          const apres = await taille(); if (apres !== avant) changes++;
        }
        await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.ranger(p).catch(() => {});
      } catch (e) { await L.ranger(p).catch(() => {}); }
    }
  }
  // puis tous les écrans et toutes les fiches, une fois
  const toutes = await p.evaluate(() => { const R = Object.keys(vues()).filter(r => !/-x-/.test(r) && (typeof rlPermis !== 'function' || rlPermis(r))), P = [];
    try { Object.keys(CLIENTS).forEach(k => P.push('client-x-' + k)); } catch (e) {} try { INTS.forEach(i => P.push('inter-x-' + i.id)); } catch (e) {} try { DV.forEach(d => P.push('devis-x-' + d.id)); } catch (e) {} try { FACTURES.forEach(f => P.push('facture-x-' + (f.id || f.num))); } catch (e) {}
    return R.concat(P); });
  let visites = 0;
  for (const r of toutes) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); await att(250); } catch (e) { continue; } visites++; await lire(r);
    const gs = (await L.gestes(p, '#contenu')).slice(0, 2);
    for (const g of gs) { try { const ici = await p.evaluate(() => location.hash); await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(180); await lire(r + ' ▸ ' + g.lib); await L.ranger(p); const la = await p.evaluate(() => location.hash); if (la !== ici) { await p.evaluate(x => aller(x), r); await L.calme(p, 250); } } catch (e) { await L.ranger(p).catch(() => {}); } }
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice()), sorties = [...trouves.values()];
  const rempliLegende = id => legende[id] || id;
  console.log(`  · formulaires ouverts : ${formulaires.length} · champs remplis : ${champsRemplis} · validations : ${valides} · données changées : ${changes} · écrans visités : ${visites} · charges retrouvées à l'écran : ${vus.size}`);
  sorties.slice(0, 30).forEach(s => console.log('  SORTIE', s.sorte, '←', rempliLegende(s.champ), '· écran :', s.ou.slice(0, 100)));
  [...new Set(hits)].slice(0, 20).forEach(h => console.log('  EXÉCUTION ←', rempliLegende(h)));
  L.v('population : ≥ 20 formulaires ouverts et ≥ 30 champs remplis', formulaires.length >= 20 && champsRemplis >= 30, { f: formulaires.length, c: champsRemplis });
  L.v('population : ≥ 10 validations ont changé les données', changes >= 10, { valides, changes });
  L.v('population : des charges rangées sont retrouvées (échappées) à l\'écran', vus.size >= 10, vus.size);
  L.v('AUCUNE charge tapée dans un formulaire n\'est sortie de son texte — sorties : ' + sorties.length, sorties.length === 0, sorties.slice(0, 8).map(s => rempliLegende(s.champ) + ' ▸ ' + s.sorte));
  L.v('AUCUN code exécuté par une saisie (window.__hits) : ' + hits.length, hits.length === 0, [...new Set(hits)].slice(0, 8).map(rempliLegende));
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); }); await att(300);
  const T = await p.evaluate(O.LIRE); await p.evaluate(() => document.getElementById('zz-controle').remove());
  L.v('contre-épreuve : la lecture voit la balise posée exprès', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 2));
  fs.writeFileSync(SORTIE + 'saisie.json', JSON.stringify({ formulaires, champsRemplis, valides, changes, visites, sorties, hits: [...new Set(hits)].map(h => [h, legende[h]]), legende }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
