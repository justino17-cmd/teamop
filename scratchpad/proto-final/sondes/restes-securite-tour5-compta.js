// RESTES DE LA SÉCURITÉ, tour 5, point 6 : le rôle COMPTABLE rejoué sur SON cadre (les planchers du patron — 40 formulaires, 80 champs — ne lui vont pas : il n'a qu'une rubrique, « comptabilite », sept onglets).
// Le cadre du comptable (mesuré le 19/11, exploration bouton par bouton) : trois champs de RECHERCHE (Ventes, Factures & avoirs, Achats), le panneau d'envoi par e-mail (ml-a, ml-o, ml-m : ouvert par la
// tuile « points de conformité » et par « Les autres régimes de TVA »), des listes et des cases. Deux boutons SORTENT de l'application (« Ouvrir dans la Comptabilité », l'onglet « Matériel & produits »
// ramène à la connexion) : on les nomme et on ne les joue pas.
// Ce que la sonde fait : (1) chaque champ de texte du cadre reçoit une charge numérotée (six formes) par la FRAPPE réelle ; (2) le panneau d'envoi est validé (ENVOIS grandit) ; (3) chaque bouton de chaque
// onglet est joué (aucune exécution, aucune balise née d'une saisie, aucune écriture HTML brute) ; (4) les charges sont RETROUVÉES à l'écran (échappées) ; (5) la contre-épreuve : une balise posée exprès est vue.
// Population comptée ; planchers de SON cadre. ⛔ 127.0.0.1 seulement. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const L = require('../lib.js'), O = require('../securite/injection-outils.js'), v = L.v;
const FORMES = [
  id => `¤${id}¤<img src=x onerror=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤<svg/onload=__xss('${id}')><i data-xss=${id}></i>`,
  id => `¤${id}¤'"><i data-xss=${id}></i><details open ontoggle=__xss('${id}')>`,
  id => `¤${id}¤ x onmouseover=__xss('${id}') autofocus onfocus=__xss('${id}') data-xss-att=${id} y=`,
  id => `¤${id}¤&lt;i data-xss=${id}&gt;&lt;img src=x onerror=__xss('${id}')&gt;`,
  id => `¤${id}¤"'><i data-xss=${id}></i><img src=x onerror="__xss('${id}')">');__xss('${id}');//`,
];
const SORTIES_APP = /Ouvrir dans la Compta|déconn|Matériel & produits/i;
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', init: O.INIT, attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => L.calme(p, ms), legende = {}, vus = new Set(), trouves = new Map(); let n = 7000, k = 0;
  const lire = async ou => { for (const f of p.frames()) { let R; try { R = await f.evaluate(O.LIRE); } catch (e) { continue; } R.vues.forEach(x => vus.add(x)); R.sorti.forEach(s => { const kk = s.sorte + '|' + s.champ; if (!trouves.has(kk)) trouves.set(kk, { ...s, ou: ou + ' ▸ ' + (legende[s.champ] || s.champ) }); }); } };
  await p.evaluate(() => rlChanger('compta', { muet: true })); await att(600);
  const role = await p.evaluate(() => ROLE), routes = await p.evaluate(() => Object.keys(vues()).filter(x => !/-x-/.test(x) && rlPermis(x)));
  v('population : le rôle est « compta » et il n’a qu’une rubrique (« comptabilite »)', role === 'compta' && routes.length === 1 && routes[0] === 'comptabilite', { role, routes });
  const aller = () => p.evaluate(() => aller('comptabilite')).then(() => att(450));
  const onglet = lib => p.evaluate(t => { const b = [...document.querySelectorAll('#contenu button')].find(x => (x.textContent || '').trim().startsWith(t)); if (b) b.click(); return !!b; }, lib).then(async r => { await att(450); return r; });
  const champs = () => p.evaluate(() => { const vis = e => e.getClientRects().length > 0 && !e.disabled && !e.readOnly; return [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select')].filter(vis).map((e, i) => ({ i, id: e.id || e.placeholder || ('champ' + i), type: e.tagName === 'SELECT' ? 'select' : e.tagName === 'TEXTAREA' ? 'textarea' : (e.type || 'text') })); });
  const boutons = () => p.evaluate(() => [...document.querySelectorAll('#contenu button')].filter(b => b.getClientRects().length).map(b => (b.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40)));
  const TABS = ['📊', '🧾', '📦', '💶', '🏦', '📒', '✅'];   // Pilotage, Ventes, Achats, Paie, Trésorerie, Fiscal & comptable, Conformité
  let remplis = 0, valides = 0, changes = 0, joues = 0, ouverts = 0; const cadre = [];

  // (2) le panneau d'envoi par e-mail : ouvert par « Envoyer › » (Pilotage, data-cp="envoi"), validé avec des charges dans l'objet et le message
  let envois0 = 0, envoisApres = 0, objetRange = '';
  /* « Envoyer › » n'apparaît dans le Pilotage qu'à l'étape de l'envoi (les étapes d'avant se jouent d'abord : valider, régler… — mesuré le 19/11 : le bouton est le 18e du Pilotage, après une série de gestes) :
     on joue donc les gestes du Pilotage dans l'ordre, un à un, jusqu'à ce que le bouton paraisse ; chacun est une validation de plus, et change (ou non) les données */
  const empreinte = () => p.evaluate(() => { let t = 0; const noms = window.__nomsDonnees || (window.__nomsDonnees = [...new Set((document.documentElement.outerHTML.match(/\n(?:let|const|var) ([A-Z][A-Z0-9_]{2,}) *=/g) || []).map(x => x.replace(/^\n(?:let|const|var) /, '').replace(/ *=$/, '')))]);
    for (const nm of noms) { try { const v = (0, eval)(nm); if (v && typeof v === 'object' && !(v instanceof Node) && v !== window) { const s = JSON.stringify(v); t += s ? s.length : 0; } } catch (e) {} } return t; }).catch(() => 0);
  await aller(); await onglet('📊'); envois0 = await p.evaluate(() => ENVOIS.length);
  const essayes = new Set(); let gestes = 0, gestesChanges = 0;
  for (let tour = 0; tour < 30; tour++) {
    if (await p.evaluate(() => !!document.querySelector('#contenu [data-cp="envoi"]'))) break;
    const lab = await p.evaluate(([essayes, tabs, sortie]) => { const bs = [...document.querySelectorAll('#contenu button')].filter(b => b.getClientRects().length); const re = new RegExp(sortie, 'i'); const b = bs.find(x => { const t = (x.textContent || '').trim().replace(/\s+/g, ' '); return !essayes.includes(t) && !re.test(t) && !tabs.some(e => t.startsWith(e)) && !x.matches('[data-cp="aide"]'); }); if (!b) return null; const t = (b.textContent || '').trim().replace(/\s+/g, ' '); b.click(); return t; }, [[...essayes], TABS, SORTIES_APP.source]);
    if (!lab) break; essayes.add(lab); await att(350); gestes++; const e1 = await empreinte(); if (e1 !== (globalThis.__e || e1)) gestesChanges++; globalThis.__e = e1;
    if (await p.evaluate(() => !!document.getElementById('cn-id') && document.getElementById('cn-id').getClientRects().length > 0)) { await p.evaluate(() => location.reload()); await att(2500); await p.evaluate(() => rlChanger('compta', { muet: true })).catch(() => {}); await att(500); await aller(); await onglet('📊'); continue; }
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }).catch(() => {}); await L.ranger(p).catch(() => {}); await aller(); await onglet('📊'); }
  valides += gestes; changes += gestesChanges; console.log('  . gestes du Pilotage joués avant l’envoi :', gestes, '(dont ' + gestesChanges + ' ayant changé les données) · « Envoyer › » présent :', await p.evaluate(() => !!document.querySelector('#contenu [data-cp="envoi"]')));
  const ouvert = await p.evaluate(() => { const b = document.querySelector('#contenu [data-cp="envoi"]'); if (!b) return false; b.click(); return true; }); await att(500);
  console.log('  . envoi : data-cp présents =', await p.evaluate(() => [...new Set([...document.querySelectorAll('[data-cp]')].map(b => b.dataset.cp))].join(',')), '· onglet actif =', await p.evaluate(() => [...document.querySelectorAll('#contenu [aria-pressed=true],#contenu .on,#contenu .actif')].map(e => (e.textContent || '').trim().slice(0, 14)).join('/')), '· bouton trouvé =', ouvert, '· panneau :', (await p.evaluate(() => ((document.querySelector('#calque .panneau') || {}).innerText || '').slice(0, 100))).replace(/\n/g, ' / '));
  console.log('  . envoi : bouton trouvé =', ouvert, '· panneau :', (await p.evaluate(() => ((document.querySelector('#calque .panneau') || {}).innerText || '').slice(0, 100))).replace(/\n/g, ' / '), '· hash', await p.evaluate(() => location.hash));
  const pan = await p.evaluate(() => ({ a: !!document.getElementById('ml-a'), o: !!document.getElementById('ml-o'), m: !!document.getElementById('ml-m') }));
  v('population : le panneau d’envoi du comptable s’ouvre avec ses trois champs (adresse, objet, message)', ouvert && pan.a && pan.o && pan.m, pan);
  if (pan.o) { ouverts++; const io = 'n' + (n++), im = 'n' + (n++); legende[io] = 'envoi ▸ ml-o'; legende[im] = 'envoi ▸ ml-m'; remplis += 2; cadre.push('envoi ▸ ml-o', 'envoi ▸ ml-m');
    const e0 = await p.evaluate(() => JSON.stringify([ENVOIS, JOURNAL ? JOURNAL.length : 0]).length).catch(() => 0);
    await p.evaluate(([a, o, m]) => { const s = (id, x) => { const e = document.getElementById(id); e.value = x; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); }; s('ml-a', a); s('ml-o', o); s('ml-m', m); }, ['expert@exemple.fr', FORMES[1](io).slice(0, 190), FORMES[0](im)]);
    await p.evaluate(() => { document.querySelector('[data-mailenvoi]').click(); }); valides++; await att(600);
    envoisApres = await p.evaluate(() => ENVOIS.length); objetRange = await p.evaluate(() => (ENVOIS[ENVOIS.length - 1] || {}).objet || '');
    if (envoisApres > envois0) changes++; await lire('après envoi'); }
  v('l’envoi du comptable a changé les données (ENVOIS ' + envois0 + ' → ' + envoisApres + '), l’objet est rangé tel quel (échappé à l’affichage, pas réécrit)', envoisApres === envois0 + 1 && /¤n\d+¤/.test(objetRange), [envois0, envoisApres, objetRange.slice(0, 40)]);
  // (1) les champs de texte de CHAQUE onglet : frappe réelle d'une charge, lecture de l'écran
  for (const t of TABS) {
    await aller(); const ok = await onglet(t); if (!ok) { v('population : l’onglet ' + t + ' existe', false); continue; }
    const ch = (await champs()).filter(x => ['search', 'text', 'textarea', 'email'].includes(x.type));
    for (const f of ch) { const id = 'n' + (n++), charge = FORMES[k++ % FORMES.length](id); legende[id] = t + ' ▸ ' + f.id;
      await p.evaluate(([i, TXT]) => { const vis = e => e.getClientRects().length > 0 && !e.disabled && !e.readOnly; const e = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select')].filter(vis)[i]; e.focus(); e.value = ''; }, [f.i, '']);
      await p.keyboard.insertText(charge); await att(500); remplis++; cadre.push(t + ' ▸ ' + f.id); await lire(t + ' ▸ frappe'); }
  }
  // (1 bis) les sous-vues qui ont leur propre recherche : « Factures & avoirs » (dans Ventes), « Tous les achats » (dans Achats)
  for (const [t, sous] of [['🧾', 'Factures'], ['📦', 'Tous les achats']]) {
    await aller(); await onglet(t); const ok = await onglet(sous); if (!ok) { v('population : la sous-vue « ' + sous + ' » existe', false); continue; }
    const ch = (await champs()).filter(x => ['search', 'text', 'textarea', 'email'].includes(x.type));
    for (const f of ch) { const id = 'n' + (n++), charge = FORMES[k++ % FORMES.length](id); legende[id] = t + ' ▸ ' + sous + ' ▸ ' + f.id;
      await p.evaluate(i => { const vis = e => e.getClientRects().length > 0 && !e.disabled && !e.readOnly; const e = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]),textarea,select')].filter(vis)[i]; e.focus(); e.value = ''; }, f.i);
      await p.keyboard.insertText(charge); await att(500); remplis++; cadre.push(t + ' ▸ ' + sous + ' ▸ ' + f.id); await lire(sous + ' ▸ frappe'); }
  }
  // (3) le cadre REJOUÉ : chaque bouton de chaque onglet (sauf les deux qui sortent de l'application), une lecture après chacun
  const sorties = new Set();
  for (const t of TABS) {
    await aller(); await onglet(t); const bs = await boutons();
    for (let i = 0; i < bs.length; i++) {
      if (SORTIES_APP.test(bs[i])) { sorties.add(bs[i]); continue; }
      await aller(); await onglet(t);
      const ok = await p.evaluate(([i]) => { const l = [...document.querySelectorAll('#contenu button')].filter(b => b.getClientRects().length); if (!l[i]) return false; l[i].click(); return true; }, [i]);
      if (!ok) continue; await att(260); joues++;
      if (await p.evaluate(() => !!document.getElementById('cn-id') && document.getElementById('cn-id').getClientRects().length > 0)) { sorties.add(bs[i] + ' (ramène à la connexion)'); await p.evaluate(() => location.reload()); await att(2500); await p.evaluate(() => rlChanger('compta', { muet: true })).catch(() => {}); await att(500); continue; }
      await lire(t + ' ▸ ' + bs[i]); if ((await champs()).length) ouverts++;
      await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }).catch(() => {}); await L.ranger(p).catch(() => {});
    }
  }
  console.log('  · le cadre du comptable : ' + TABS.length + ' onglets, ' + joues + ' boutons joués, ' + remplis + ' champs de texte remplis (' + cadre.join(' | ') + '), ' + valides + ' validation(s), ' + changes + ' ayant changé les données, ' + vus.size + ' charge(s) retrouvée(s) à l’écran');
  console.log('  · boutons qui SORTENT de l’application (non joués) : ' + [...sorties].join(' | '));
  const hits = await p.evaluate(() => (window.top.__hits || []).slice()), puits = await p.evaluate(() => (window.top.__puits || []).slice());
  const planchers = { onglets: 7, joues: 40, remplis: 5, valides: 1, changes: 1, vues: 3 };
  v('population : ' + TABS.length + ' onglets joués, ≥ ' + planchers.joues + ' boutons joués (' + joues + ')', joues >= planchers.joues, joues);
  v('population : ≥ ' + planchers.remplis + ' champs de texte du cadre remplis à la frappe : les 3 recherches + objet et message de l’envoi (' + remplis + ')', remplis >= planchers.remplis, cadre);
  v('population : ≥ ' + planchers.valides + ' validation (l’envoi) qui a CHANGÉ les données (' + valides + ' / ' + changes + ')', valides >= planchers.valides && changes >= planchers.changes, { valides, changes });
  v('population : ≥ ' + planchers.vues + ' charges retrouvées (échappées) à l’écran (' + vus.size + ')', vus.size >= planchers.vues, [...vus]);
  v('AUCUNE exécution par une saisie (window.__hits) : ' + hits.length, hits.length === 0, [...new Set(hits)].slice(0, 8));
  v('AUCUNE balise ni gestionnaire né d’une saisie : ' + trouves.size, trouves.size === 0, [...trouves.values()].slice(0, 5).map(s => (legende[s.champ] || s.champ) + ' ▸ ' + s.sorte));
  v('AUCUNE écriture HTML ne reçoit une saisie brute (puits) : ' + puits.length, puits.length === 0, puits.slice(0, 3));
  await aller(); await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); }); await att(300);
  const T = await p.evaluate(O.LIRE); await p.evaluate(() => document.getElementById('zz-controle').remove());
  v('contre-épreuve : la lecture voit la balise posée exprès', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 2));
  const nErr = c.err.filter(e => !/ResizeObserver/.test(e)); v('aucune erreur de page', nErr.length === 0, nErr.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
