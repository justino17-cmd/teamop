// RESTES DE LA SÉCURITÉ, tour 1 (17 novembre 2026) : « le balayage de la saisie est trop mince (36 champs, une seule validation utile) : il s'étend à TOUS les champs de saisie des quatre pages ».
// Ce que la première sonde (recontrole-saisie.js) ne faisait pas : elle remplissait chaque champ d'une charge, y compris l'e-mail, le téléphone, le nombre, la date — donc la validation REFUSAIT presque tout (12 validations sur 36
// formulaires) et la valeur n'atteignait jamais un écran. Ici :
//   · un champ de TEXTE (texte, recherche, zone de texte) reçoit une charge numérotée (six formes : balise, svg, sortie d'attribut, mXSS, attribut nu, entité doublée) ;
//   · un champ qui a un FORMAT (e-mail, téléphone, nombre, date, heure, liste) reçoit une valeur JUSTE, pour que la validation passe et que le texte des autres champs soit rangé ;
//   · le bouton principal valide ; si la fenêtre reste (refus), on le note, on corrige ce qu'on peut (une seconde passe avec des valeurs justes partout sauf le champ de texte principal) ;
//   · la lecture a lieu juste après (messages) puis sur tous les écrans et toutes les fiches : EXÉCUTION (window.top.__hits), balise ou gestionnaire né de la donnée (LIRE), et PUITS (innerHTML qui reçoit la charge brute,
//     avec sa pile d'appel : c'est lui qui nomme le coupable).
// Population comptée : formulaires ouverts (signature distincte), champs de texte remplis, validations qui ont CHANGÉ les données (empreinte JSON des tableaux de l'application avant/après), charges retrouvées à l'écran (échappées).
// Usage : node restes-saisie-totale.js [--page=prototype-op-gestion.html] [--roles=marc,julie] [--boutons=14] [--routes=a,b] [--nom-sortie=saisie-totale]
// ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Un ✗ nomme le formulaire (écran ▸ bouton ▸ champ).
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
const PAGE = arg('page', 'prototype-op-gestion.html'), ROLES_ARG = arg('roles', 'tous').split(','), MAXB = +arg('boutons', 14), SEUL = arg('routes', ''), NOMSORTIE = arg('nom-sortie', 'saisie-totale'), PROFIL = arg('profil', 'mac');
const PRINCIPALE = PAGE === 'prototype-op-gestion.html';
/* un BUDGET de temps (la commande de l'agent a un délai de 580 s : la première exécution est morte à 590 s SANS rien rendre) : les formulaires jusqu'à FORMES_S, puis la lecture des écrans jusqu'à BUDGET_S, puis le rendu — et ce qui n'a pas eu le temps est DIT */
const T0 = Date.now(), BUDGET_S = +arg('budget', 500), FORMES_S = +arg('formes', 300), reste = () => (BUDGET_S * 1000 - (Date.now() - T0)) > 0, restFormes = () => (FORMES_S * 1000 - (Date.now() - T0)) > 0; let coupe = [];
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
  const c = await L.ouvrir({ profil: PROFIL, qui: PRINCIPALE ? 'marc' : null, app: PRINCIPALE, page: PRINCIPALE ? undefined : PAGE, requete: PRINCIPALE ? undefined : '?app=1', init: O.INIT, guide: false, attente: 1500 }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  /* les rôles sont les CLÉS de ROLES de l'application (pas les identifiants de personnes : « marc » n'est pas un rôle — rlChanger('marc') jetait dans rlMenu, 377 erreurs de page au premier essai) ; « tous » = chacun sauf « client » */
  const toutRole = await p.evaluate(() => (typeof ROLES === 'object' ? Object.keys(ROLES).filter(k => k !== 'client') : []));
  const ROLES = !PRINCIPALE ? ['(page)'] : ROLES_ARG[0] === 'tous' ? toutRole : ROLES_ARG;
  const att = ms => p.waitForTimeout(ms);
  const legende = {}; let n = 7000; const formulaires = new Map(); let champsRemplis = 0, valides = 0, changes = 0, refusees = 0, ouvertures = 0;
  const trouves = new Map(), vus = new Set();
  const lire = async ou => { for (const f of p.frames()) { let R; try { R = await f.evaluate(O.LIRE); } catch (e) { continue; } R.vues.forEach(v => vus.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ; if (!trouves.has(k)) trouves.set(k, { ...s, ou: ou + ' ▸ ' + (legende[s.champ] || s.champ) }); }); } };
  // empreinte des DONNÉES de l'application : tous les tableaux / objets de premier niveau déclarés par let/const du script (taille JSON bornée) — une validation « a changé les données » si elle bouge
  const empreinte = () => p.evaluate(() => { let t = 0; const noms = window.__nomsDonnees || (window.__nomsDonnees = [...new Set((document.documentElement.outerHTML.match(/\n(?:let|const|var) ([A-Z][A-Z0-9_]{2,}) *=/g) || []).map(x => x.replace(/^\n(?:let|const|var) /, '').replace(/ *=$/, '')))]);
    for (const nm of noms) { try { const v = (0, eval)(nm); if (v && typeof v === 'object' && !(v instanceof Node) && v !== window) { const s = JSON.stringify(v); t += s ? s.length : 0; } } catch (e) {} } return t; }).catch(() => 0);
  const SEL = 'input:not([type]),input[type=text],input[type=search],input[type=email],input[type=tel],input[type=url],input[type=number],input[type=date],input[type=time],textarea,select';
  const champsVisibles = zone => p.evaluate(({ zone, SEL }) => { const vis = e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; const R = document.querySelector(zone) || document.body;
    return [...R.querySelectorAll(SEL)].filter(e => vis(e) && !e.readOnly && !e.disabled).map((e, k) => ({ k, id: e.id || e.name || e.getAttribute('data-cchamp') || e.placeholder || ('champ' + k), type: (e.tagName === 'SELECT' ? 'select' : e.tagName === 'TEXTAREA' ? 'textarea' : (e.type || 'text')) })); }, { zone, SEL });
  let routes = PRINCIPALE ? await p.evaluate(() => Object.keys(vues()).filter(r => !/-x-/.test(r) && (typeof rlPermis !== 'function' || rlPermis(r)))) : ['(page)'];
  if (SEUL) routes = routes.filter(r => SEUL.split(',').includes(r));
  for (const role of ROLES) {
    /* l'application s'ouvre en « patron » : tout AUTRE rôle demandé s'enfile par rlChanger (le premier essai ne changeait de rôle que pour le second de la liste : « --roles=tech » rejouait le patron, mêmes chiffres que lui — le signe qui ne trompe pas) */
    if (PRINCIPALE && role !== 'patron') { try { await p.evaluate(r => rlChanger(r, { muet: true }), role); } catch (e) { continue; } await att(500); const vrai = await p.evaluate(() => (typeof ROLE !== 'undefined' ? ROLE : '?')); if (vrai !== role) console.log('  ! rôle demandé', role, '· rôle obtenu', vrai); }
    /* les écrans d'un rôle ne sont PAS ceux du patron (la technicienne a « Ma journée », pas « Équipe ») : la liste se refait APRÈS le changement de rôle — le premier essai rejouait les rubriques du patron sous le rôle de la technicienne */
    if (PRINCIPALE && !SEUL) routes = await p.evaluate(() => Object.keys(vues()).filter(r => !/-x-/.test(r) && (typeof rlPermis !== 'function' || rlPermis(r))));
    if (PRINCIPALE) console.log('  · rôle', role, ': rubriques', routes.length, routes.slice(0, 40).join(','));
    for (const r of routes) {
      if (!restFormes()) { coupe.push('formulaires : ' + r); continue; }
      console.log('  . ' + Math.round((Date.now() - T0) / 1000) + ' s · ' + r + ' · formulaires ' + ouvertures + ' · champs ' + champsRemplis + ' · validations ' + valides + ' · données changées ' + changes);
      if (PRINCIPALE) { try { await p.evaluate(x => aller(x), r); await L.calme(p, 400); } catch (e) { continue; } }
      const gs = (await L.gestes(p, PRINCIPALE ? '#contenu' : 'body')).filter(g => !g.sansNom).slice(0, MAXB * 2);
      let tentes = 0;
      for (const g of gs) {
        if (tentes >= MAXB) break;
        try {
          if (PRINCIPALE) { await p.evaluate(x => aller(x), r); await L.calme(p, 250); }
          const avantChamps = await champsVisibles('body'); const sigAvant = new Set(avantChamps.map(x => x.id + x.type));
          const e0 = await empreinte(); await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(450);
          const apresChamps = await champsVisibles('body'); const neufs = apresChamps.filter(x => !sigAvant.has(x.id + x.type)); const textes = neufs.filter(x => ['text', 'search', 'textarea'].includes(x.type));
          if (!neufs.length) { await L.ranger(p).catch(() => {}); continue; }
          tentes++; ouvertures++;
          const sig = r + '▸' + String(g.lib).slice(0, 30); const info = await p.evaluate(({ formes, debut, SEL, neufs }) => { const F = formes.map(s => eval(s)); const vis = e => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; const tous = [...document.querySelectorAll(SEL)].filter(e => vis(e) && !e.readOnly && !e.disabled); const rempli = []; let k = 0;
            const clef = e => (e.id || e.name || e.getAttribute('data-cchamp') || e.placeholder || '') + '|' + (e.tagName === 'SELECT' ? 'select' : e.tagName === 'TEXTAREA' ? 'textarea' : (e.type || 'text'));
            const nouveau = new Set(neufs.map(x => x.id + '|' + x.type));
            const ev = e => { e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); };
            tous.forEach(e => { if (!nouveau.has(clef(e))) return; const t = e.tagName === 'SELECT' ? 'select' : e.tagName === 'TEXTAREA' ? 'textarea' : (e.type || 'text');
              if (t === 'select') { const o = [...e.options].filter(x => x.value !== '' && !x.disabled); if (o.length) { e.value = o[Math.min(1, o.length - 1)].value; ev(e); } }
              else if (t === 'email') { e.value = 'essai' + (debut + k) + '@exemple.fr'; ev(e); }
              else if (t === 'tel') { e.value = '06 12 34 56 78'; ev(e); }
              else if (t === 'url') { e.value = 'https://exemple.fr'; ev(e); }
              else if (t === 'number') { e.value = '12'; ev(e); }
              else if (t === 'date') { e.value = '2026-11-20'; ev(e); }
              else if (t === 'time') { e.value = '10:00'; ev(e); }
              else { const id = 'n' + (debut + k); const ph = (e.placeholder || '') + ' ' + (e.getAttribute('aria-label') || '') + ' ' + (e.id || '') + ' ' + (e.name || '');
                if (/mail/i.test(ph)) e.value = 'essai' + (debut + k) + '@exemple.fr'; else if (/t[ée]l|phone|portable|mobile/i.test(ph)) e.value = '06 12 34 56 78'; else if (/montant|prix|quantit|qt[ée]|€|heures|dur[ée]e|nombre|taux|km|\bq\b|stock|seuil/i.test(ph)) e.value = '12'; else if (/siret|siren/i.test(ph)) e.value = '732 829 320 00074'; else if (/code postal|\bcp\b/i.test(ph)) e.value = '17000';
                else { e.value = F[k % F.length](id); rempli.push({ id, nom: e.id || e.name || e.getAttribute('data-cchamp') || e.placeholder || ('champ' + k) }); }
                ev(e); }
              k++; });
            return { remplis: rempli, total: k }; }, { formes: FORMES.map(f => f.toString()), debut: n, SEL, neufs: neufs.map(x => ({ id: x.id, type: x.type })) });
          info.remplis.forEach(ch => { legende[ch.id] = r + ' ▸ ' + String(g.lib).trim().slice(0, 30) + ' ▸ ' + ch.nom; }); n += info.total + 2; champsRemplis += info.remplis.length;
          formulaires.set(sig, { r, bouton: String(g.lib).trim().slice(0, 40), champs: info.total, textes: info.remplis.length });
          if (info.remplis.length) {
            /* le bouton principal : celui du plus PETIT conteneur qui contient à la fois un champ rempli et un bouton « principal » (ni .gris, ni .rouge, ni « Annuler/Fermer/Retour ») — le premier essai cherchait dans #calque seulement et ne validait presque rien (0 validation sur 24 formulaires) */
            const ok = await p.evaluate(() => { const vis = e => e.getClientRects().length > 0 && !e.disabled; const bad = /^(annuler|fermer|retour|non|plus tard|ignorer|supprimer|retirer|effacer|vider|quitter|se déconnecter)/i; const champ = [...document.querySelectorAll('input,textarea,select')].filter(e => vis(e) && e.value && /¤n\d+¤/.test(e.value))[0]; if (!champ) return false;
              let z = champ.parentElement; for (let k = 0; z && k < 12; k++, z = z.parentElement) { const cand = [...z.querySelectorAll('button.btn:not(.gris):not(.rouge),.actions button:not(.gris):not(.rouge),button[type=submit],button.primaire')].filter(b => vis(b) && !bad.test((b.textContent || '').trim())); if (cand.length) { cand[cand.length - 1].click(); return true; } } return false; });
            if (ok) { valides++; await att(500); await lire(sig + ' ▸ après validation'); }
            const e1 = await empreinte(); if (e1 !== e0) changes++; else refusees++;
          }
        } catch (e) { /* un formulaire qui se ferme tout seul : on passe au suivant */ }
        await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }).catch(() => {}); await L.ranger(p).catch(() => {});
      }
    }
    // puis tous les écrans et toutes les fiches de ce rôle, une fois
    const toutes = PRINCIPALE ? await p.evaluate(() => { const R = Object.keys(vues()).filter(r => !/-x-/.test(r) && (typeof rlPermis !== 'function' || rlPermis(r))), P = [];
      try { Object.keys(CLIENTS).forEach(k => P.push('client-x-' + k)); } catch (e) {} try { INTS.forEach(i => P.push('inter-x-' + i.id)); } catch (e) {} try { DV.forEach(d => P.push('devis-x-' + d.id)); } catch (e) {} try { FACTURES.forEach(f => P.push('facture-x-' + (f.id || f.num))); } catch (e) {}
      return R.concat(P); }) : ['(page)'];
    let visites = 0;
    for (const r of toutes) { if (!reste()) { coupe.push('lecture : ' + r); continue; } if (PRINCIPALE) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); await att(220); } catch (e) { continue; } } visites++; await lire(r + ' ▸ ' + role);
      const gs = (await L.gestes(p, PRINCIPALE ? '#contenu' : 'body')).slice(0, 2);
      for (const g of gs) { try { const ici = await p.evaluate(() => location.hash); await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(160); await lire(r + ' ▸ ' + g.lib); await L.ranger(p); if (PRINCIPALE) { const la = await p.evaluate(() => location.hash); if (la !== ici) { await p.evaluate(x => aller(x), r); await L.calme(p, 220); } } } catch (e) { await L.ranger(p).catch(() => {}); } }
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }).catch(() => {}); }
    console.log('  · rôle', role, ': écrans lus', visites, '· écrans non lus faute de temps :', coupe.filter(x => x.startsWith('lecture')).length, '· rubriques sans formulaire faute de temps :', coupe.filter(x => x.startsWith('formulaires')).length);
  }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice()), puits = await p.evaluate(() => (window.top.__puits || []).slice());
  const sorties = [...trouves.values()], lib = id => legende[id] || id;
  console.log(`  · formulaires ouverts : ${ouvertures} (${formulaires.size} distincts) · champs de texte remplis : ${champsRemplis} · validations : ${valides} · données changées : ${changes} · refusées : ${refusees} · charges retrouvées à l'écran : ${vus.size} · puits : ${puits.length}`);
  sorties.slice(0, 20).forEach(s => console.log('  SORTIE', s.sorte, '←', lib(s.champ), '· écran :', s.ou.slice(0, 110)));
  const parPile = new Map(); puits.forEach(x => { const k = x.k + ' ◂ ' + x.pile; if (!parPile.has(k)) parPile.set(k, []); parPile.get(k).push(lib(x.tok)); });
  [...parPile.entries()].slice(0, 20).forEach(([k, v]) => console.log('  PUITS', k.slice(0, 230), '←', [...new Set(v)].slice(0, 3).join(' | ')));
  [...new Set(hits)].slice(0, 20).forEach(h => console.log('  EXÉCUTION ←', lib(h)));
  const min = PRINCIPALE ? { f: +arg('min-f', 40), c: +arg('min-c', 80), v: +arg('min-v', 25) } : { f: 3, c: 4, v: 1 };   /* une exécution partielle (--routes, un rôle, un budget court) abaisse ces planchers À VOIX HAUTE : le total des passes est dit dans le rapport */
  L.v(`population : ≥ ${min.f} formulaires ouverts et ≥ ${min.c} champs de texte remplis`, ouvertures >= min.f && champsRemplis >= min.c, { ouvertures, champsRemplis });
  L.v(`population : ≥ ${min.v} validations ont CHANGÉ les données (la valeur est donc rangée, puis relue)`, changes >= min.v, { valides, changes, refusees });
  L.v('population : des charges rangées sont retrouvées (échappées) à l\'écran', vus.size >= (PRINCIPALE ? +arg('min-vues', ROLES_ARG[0] === 'tous' ? 15 : 8) : 1), vus.size);   /* un rôle SEUL retrouve 11 à 12 charges (patron 12, gérant des factures 12, technicien 11 : mesuré le 18/11) ; les 15 sont le plancher des trois rôles réunis — ce n'était pas une faille, c'était un plancher réglé pour la passe complète */
  L.v('AUCUNE exécution par une saisie (window.__hits) : ' + hits.length, hits.length === 0, [...new Set(hits)].slice(0, 8).map(lib));
  L.v('AUCUNE balise ni gestionnaire né d\'une saisie : ' + sorties.length, sorties.length === 0, sorties.slice(0, 8).map(s => lib(s.champ) + ' ▸ ' + s.sorte));
  L.v('AUCUNE écriture HTML ne reçoit une saisie brute (puits) : ' + puits.length, puits.length === 0, [...parPile.entries()].slice(0, 5).map(([k, v]) => k.slice(0, 150) + ' ← ' + v[0]));
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); }); await att(300);
  const T = await p.evaluate(O.LIRE); await p.evaluate(() => document.getElementById('zz-controle').remove());
  L.v('contre-épreuve : la lecture voit la balise posée exprès', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 2));
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); console.log('  · erreurs de page :', nErr.length, nErr.slice(0, 3));
  fs.writeFileSync(SORTIE + NOMSORTIE + '.json', JSON.stringify({ page: PAGE, ouvertures, formulaires: [...formulaires.values()], champsRemplis, valides, changes, refusees, sorties, puits: puits.map(x => ({ ...x, champ: lib(x.tok) })), hits: [...new Set(hits)].map(lib), erreurs: nErr.slice(0, 5) }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
