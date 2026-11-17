// RECONTRÔLE ADVERSE de l'audit de sécurité (étape 8 sur 8, 17 novembre 2026), failles S04 et S09 : « un fichier venu d'un tiers ne devient pas du code ».
// L'audit a gardé DEUX chemins (papiers d'un véhicule, fiches de paie déposées). Le prototype lit des fichiers par neuf autres chemins. La sonde joue :
//   A. le NOM de fichier piégé (`x"'><img …>.pdf`, nom qui est une entité, nom avec « & ») par chaque chemin qui le range ou l'écrit : justificatif d'achat,
//      fiches de paie, papiers d'un véhicule, attestation d'une habilitation, photo d'un relevé — puis tous les écrans qui montrent ces noms ;
//   B. le TYPE déclaré : un SVG déguisé (image/SVG+XML en majuscules, application/pdf sur du HTML, type vide, text/html) par les papiers d'un véhicule ;
//   C. le LOGO de l'entreprise (le SEUL chemin qui accepte un SVG) : des SVG qui passent la liste noire de l'audit (<svg/onload=…>, <svg onload=…> avec
//      retour à la ligne ou espace insécable, onload en majuscules, <a href=javascript:…>) — la sonde mesure ensuite OÙ le logo est écrit : seulement dans une
//      balise <img> (inerte), jamais en balisage en ligne, jamais comme adresse de document ouvrable.
// Un fichier est donné à l'application comme le ferait le sélecteur de fichier : un champ <input type=file> reçoit un File, puis l'évènement « change ».
// Population d'abord (le fichier a vraiment été pris, le nom est vraiment rangé), contre-épreuve (la lecture voit une balise posée exprès).
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. RACINE=<copie> rejoue la sonde sur une copie mutée.
const L = require('../lib.js'), O = require('./injection-outils.js'), fs = require('fs');
const SORTIE = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole/';
const NOM = id => `ZQ¤${id}¤"'><img src=x data-xss=${id} onerror="__xss('${id}')">`;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
(async () => {
  fs.mkdirSync(SORTIE, { recursive: true });
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', attente: 1500, init: O.INIT }), p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  // donne un fichier à un champ <input type=file> (créé s'il n'existe pas : les gestionnaires sont à l'écoute du document) et lance « change »
  const donner = (sel, nom, type, contenu, attrs) => p.evaluate(({ sel, nom, type, contenu, attrs }) => { let i = document.querySelector(sel); if (!i) { i = document.createElement('input'); i.type = 'file'; Object.entries(attrs || {}).forEach(([k, v]) => i.setAttribute(k, v)); document.body.appendChild(i); }
    const dt = new DataTransfer(); dt.items.add(new File([contenu], nom, { type })); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); return !!i.files.length; }, { sel, nom, type, contenu, attrs });
  const legende = {};
  // ═══ A. le NOM ═══
  // A1. un justificatif d'achat (Comptabilité › Achats) : a.just = nom du fichier
  const a1 = await p.evaluate(async nom => { const a = ACHATS.find(o => !o.just) || ACHATS[0]; window.__a1 = a.id; return a.id; });
  legende.n401 = 'justificatif d\'achat : nom du fichier';
  const pris1 = await donner('input[data-cpjust="' + a1 + '"]', NOM('n401') + '.pdf', 'application/pdf', '%PDF-1.4', { 'data-cpjust': a1 });
  const just = await p.evaluate(id => (ACHATS.find(o => o.id === id) || {}).just, a1);
  console.log('  · justificatif rangé :', JSON.stringify(String(just).slice(0, 50)));
  L.v('population : le justificatif d\'achat a pris le fichier (nom rangé : ' + String(just).slice(0, 20) + '…)', pris1 && /¤n401¤/.test(String(just)), just);
  // A2. fiches de paie déposées : un nom qui ne ressemble à personne (perdu) ; le message ; un nom qui contient le nom d'une vraie personne (rangé : PAIE.bulletins[k].nom)
  legende.n402 = 'fiche de paie : nom du fichier (sans nom reconnu)'; legende.n403 = 'fiche de paie : nom du fichier (reconnu)';
  const paie = await p.evaluate(async ([n402, n403]) => { const gens = typeof PT_GENS !== 'undefined' ? PT_GENS : []; const nom0 = gens.length ? paieNomPers(gens[0]) : 'Sophie Martin'; window.__nomPaie = nom0;
    const mk = (n, t) => new File(['%PDF-1.4'], n, { type: t }); const F = [mk(n402 + '.pdf', 'application/pdf'), mk(nom0 + ' ' + n403 + '.pdf', 'application/pdf')];
    return { nom0, nGens: gens.length }; }, [NOM('n402'), NOM('n403')]);
  console.log('  · paie :', JSON.stringify(paie));
  L.v('population : la paie connaît des salariés (un nom de fichier pourra être reconnu)', paie.nGens >= 2, paie);
  // le dépôt de fiches : un champ « data-paiefichiers » à l'écoute du document (Paie › Recevoir les fiches du cabinet)
  await p.evaluate(async () => { try { fermerPanneau(); } catch (e) {} aller('paie'); await new Promise(r => setTimeout(r, 700)); });
  const d1 = await donner('input[data-paiefichiers]', NOM('n402') + '.pdf', 'application/pdf', '%PDF-1.4', { 'data-paiefichiers': '1', multiple: '1' }); await att(500);
  const toast1 = await p.evaluate(() => (document.getElementById('toast') || {}).innerText || '');
  const d2 = await donner('input[data-paiefichiers]', paie.nom0 + ' ' + NOM('n403') + '.pdf', 'application/pdf', '%PDF-1.4', { 'data-paiefichiers': '1', multiple: '1' }); await att(500);
  const depot = { d1, d2, toast: toast1, bulletins: await p.evaluate(() => Object.values(PAIE.bulletins || {}).map(b => String(b.nom).slice(0, 30))) };
  console.log('  · dépôt de fiches :', JSON.stringify({ ...depot, toast: depot.toast.slice(0, 120) }));
  L.v('population : le dépôt de fiches a pris les fichiers et affiché son message (« sans nom reconnu » : ' + /sans nom reconnu/.test(toast1) + ')', d1 && /sans nom reconnu|rangée/.test(toast1), toast1.slice(0, 80));
  const R0 = await p.evaluate(O.LIRE);
  L.v('le message du dépôt de fiches n\'écrit pas le nom d\'un fichier en HTML (aucune balise créée par le dépôt)', R0.sorti.filter(s => s.champ === 'n402' || s.champ === 'n403').length === 0, R0.sorti.slice(0, 3));
  // A3. papiers d'un véhicule (le nom de fichier est rangé et écrit au journal)
  legende.n404 = 'véhicule : papier, nom du fichier';
  const veh = await p.evaluate(async () => { try { fermerPanneau(); } catch (e) {} vehFiche('veh1', 'papiers'); await new Promise(r => setTimeout(r, 700)); const a = document.querySelector('[data-vh="docadd|veh1"]'); if (a) a.click(); await new Promise(r => setTimeout(r, 400)); return { bouton: !!a, champ: !!document.getElementById('vh-df') }; });
  let pris3 = false; if (veh.champ) { await p.locator('#vh-dk').selectOption('carte').catch(() => {}); pris3 = await donner('#vh-df', NOM('n404') + '.png', 'image/png', PNG); await att(250); await p.locator('[data-vh="docok|veh1"]').first().click().catch(() => {}); await att(800); }
  const doc = await p.evaluate(() => { const d = (VEHICULES[0].docs || {}).carte; return d ? { nom: d.nom.slice(0, 30), type: d.type } : null; });
  console.log('  · papier du véhicule :', JSON.stringify(doc));
  L.v('population : le papier d\'un véhicule a été rangé avec le nom piégé', !!doc && /¤n404¤/.test(doc.nom), doc);
  // A4. attestation d'une habilitation (Équipe › habilitations) : m.piece = nom du fichier ; on la pose par les données (le formulaire est profond) puis on lit les écrans
  legende.n405 = 'habilitation : nom de l\'attestation';
  await p.evaluate(n => { const q = EQUIPE.find(x => x.k === 'sm') || EQUIPE[2]; q.habil = q.habil || []; q.habil.push(['Aptitude d\'essai', '2027-06-30', { passee: '2026-06-30', piece: n }]); }, NOM('n405') + '.pdf');
  // ═══ tous les écrans : les noms de fichiers piégés sont-ils sortis ? ═══
  const routes = await p.evaluate(() => { const r = Object.keys(vues()).filter(x => !/-x-/.test(x)); VEHICULES.slice(0, 2).forEach(v => r.push('vehicule-x-' + v.id)); EQUIPE.slice(0, 4).forEach(q => r.push('equipe-x-' + q.k)); return r; });
  const trouves = new Map(), vus = new Set(); let nEcrans = 0;
  const lire = async ou => { let R; try { R = await p.evaluate(O.LIRE); } catch (e) { return; } R.vues.forEach(v => vus.add(v)); R.sorti.forEach(s => { const k = s.sorte + '|' + s.champ; if (!trouves.has(k)) trouves.set(k, { ...s, ou }); }); };
  for (const r of routes) { try { await Promise.race([p.evaluate(x => aller(x), r), new Promise((_, q) => setTimeout(() => q(new Error('DELAI')), 9000))]); } catch (e) { continue; } await att(300); nEcrans++; await lire(r);
    const gs = (await L.gestes(p, '#contenu')).slice(0, 8);
    for (const g of gs) { try { await p.mouse.click(g.x + g.l / 2, g.y + g.h / 2); await att(160); await lire(r + ' ▸ ' + g.lib); await L.ranger(p); const la = await p.evaluate(() => route); if (la !== r) { await p.evaluate(x => aller(x), r); await L.calme(p, 220); } } catch (e) { await L.ranger(p).catch(() => {}); } } }
  // les panneaux qui montrent ces noms : fiche de l'achat, papiers du véhicule, fiche de la personne
  for (const f of [() => { cxFicheAchat(window.__a1); }, () => { vehFiche('veh1', 'papiers'); }, () => { eqFiche('sm'); }]) { try { await p.evaluate(f); await att(600); await lire('panneau'); await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); } catch (e) {} }
  const hits = await p.evaluate(() => (window.top.__hits || []).slice());
  const sorties = [...trouves.values()].filter(s => s.champ !== 'n999');
  console.log('  · écrans visités :', nEcrans, '· noms de fichiers retrouvés à l\'écran (échappés ou non) :', [...vus].join(','));
  sorties.slice(0, 10).forEach(s => console.log('  SORTIE', s.sorte, '←', legende[s.champ] || s.champ, '· écran :', s.ou));
  L.v('population : ≥ 30 écrans et panneaux visités', nEcrans >= 30, nEcrans);
  L.v('population : au moins 2 des noms de fichiers piégés se retrouvent à l\'écran, échappés', vus.size >= 2, [...vus]);
  L.v('AUCUN nom de fichier piégé n\'est sorti de son texte dans les écrans — sorties : ' + sorties.length, sorties.length === 0, sorties.slice(0, 6).map(s => (legende[s.champ] || s.champ) + ' ▸ ' + s.sorte + ' ▸ ' + s.ou));
  L.v('AUCUN code exécuté par un nom de fichier (window.__hits) : ' + hits.length, hits.length === 0, hits.map(h => legende[h] || h).slice(0, 6));
  // ═══ B. le TYPE déclaré, par les papiers d'un véhicule ═══
  const SVG = '<svg xmlns="http://www.w3.org/2000/svg" onload="window.__pwn=1"><rect width="9" height="9"/></svg>';
  const types = [['image/SVG+XML', 'a.svg', 'carte'], ['image/svg+xml; charset=utf-8', 'b.svg', 'assur'], ['text/html', 'c.html', 'ct'], ['', 'd.png', 'carte'], ['application/xhtml+xml', 'e.xhtml', 'assur'], ['image/svg+xml', 'f.png', 'ct']];
  for (const [type, nom, cle] of types) {
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} VEHICULES[0].docs = {}; vehFiche('veh1', 'papiers'); }); await att(600);
    await p.evaluate(() => { const a = document.querySelector('[data-vh="docadd|veh1"]'); if (a) a.click(); }); await att(350);
    await p.locator('#vh-dk').selectOption(cle).catch(() => {}); await donner('#vh-df', nom, type, SVG); await att(200);
    await p.locator('[data-vh="docok|veh1"]').first().click().catch(() => {}); await att(600);
    const d = await p.evaluate(k => { const d = (VEHICULES[0].docs || {})[k]; return d ? { nom: d.nom, type: d.type } : null; }, cle);
    const liens = await p.evaluate(() => [...document.querySelectorAll('a.vx-mini')].map(a => (a.getAttribute('href') || '').slice(0, 12)));
    const sorti = d && /blob:/.test(liens.join(','));
    L.v('B. le type « ' + (type || '(vide)') + ' » (fichier ' + nom + ') ne devient pas un papier avec lien blob: ouvrable — rangé : ' + JSON.stringify(d) + ' · liens : ' + liens.length, !sorti, { d, liens });
  }
  // ═══ C. le logo : SVG qui passent la liste noire de l'audit ═══
  const logos = [['svg/onload (barre oblique)', '<svg/onload=window.__pwnLogo=1 xmlns="http://www.w3.org/2000/svg"><rect width="9" height="9"/></svg>'], ['onload en majuscules, saut de ligne', '<svg xmlns="http://www.w3.org/2000/svg"\nONLOAD="window.__pwnLogo=1"><rect width="9" height="9"/></svg>'], ['onload après espace insécable', '<svg xmlns="http://www.w3.org/2000/svg" onload="window.__pwnLogo=1"><rect width="9" height="9"/></svg>'], ['<a xlink:href=javascript> (le mot est coupé)', '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="java&#115;cript:window.__pwnLogo=1"><rect width="9" height="9"/></a></svg>'], ['<script> en entités', '<svg xmlns="http://www.w3.org/2000/svg"><scr&#105;pt>window.__pwnLogo=1</scr&#105;pt></svg>'], ['<image href=https://tiers> (suivi d\'ouverture)', '<svg xmlns="http://www.w3.org/2000/svg"><image href="https://exemple-tiers.invalid/pixel.png" width="9" height="9"/></svg>']];
  const accepte = [];
  for (const [nom, svg] of logos) {
    await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} ENT_LOGO = undefined; }); await donner('#en-logo', 'logo.svg', 'image/svg+xml', svg, { id: 'en-logo' }); await att(500);
    const st = await p.evaluate(() => ({ logo: typeof ENT_LOGO === 'string' ? ENT_LOGO.slice(0, 30) : ENT_LOGO, err: (document.getElementById('en-logo-err') || {}).textContent || '' }));
    const pris = typeof st.logo === 'string' && st.logo.length > 0; accepte.push([nom, pris]); console.log('  · logo « ' + nom + ' » : ' + (pris ? 'ACCEPTÉ' : 'refusé'));
  }
  // un logo accepté est posé (ENT_LOGO → ENTREPRISE.logo), puis on regarde tous les endroits qui l'écrivent : seulement <img src="data:…">
  const aposer = logos.find(l => accepte.find(a => a[0] === l[0] && a[1]));
  const emplacements = await p.evaluate(async svg => { const u = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); ENTREPRISE.logo = u; const out = []; const routes = Object.keys(vues()).filter(x => !/-x-/.test(x));
    for (const r of routes) { try { fermerPanneau(); } catch (e) {} aller(r); await new Promise(x => setTimeout(x, 250));
      document.querySelectorAll('*').forEach(e => { for (const a of e.attributes) if (a.value && a.value.includes('data:image/svg+xml;base64,') && !(e.tagName === 'IMG' && a.name === 'src')) out.push(r + ' ' + e.tagName + '[' + a.name + ']'); if (e.tagName === 'OBJECT' || e.tagName === 'EMBED' || (e.tagName === 'IFRAME' && /data:image/.test(e.getAttribute('src') || ''))) out.push(r + ' ' + e.tagName); }); }
    return { out: [...new Set(out)].slice(0, 6), nImg: document.querySelectorAll('img.logo-ent').length, pwn: window.__pwnLogo || 0, nRoutes: routes.length }; }, aposer ? aposer[1] : logos[0][1]);
  console.log('  · logo posé, écrans visités :', emplacements.nRoutes, '· usages hors <img src> :', JSON.stringify(emplacements.out), '· __pwnLogo :', emplacements.pwn);
  L.v('population : le logo a été posé et ' + emplacements.nRoutes + ' écrans visités', emplacements.nRoutes >= 30, emplacements);
  L.v('C. le logo SVG n\'est écrit que dans une balise <img src="data:…"> (jamais en balisage en ligne, ni en <object>, <embed>, <iframe>, ni en adresse de lien) — usages autres : ' + emplacements.out.length, emplacements.out.length === 0, emplacements.out);
  L.v('C. aucun script du logo ne s\'est exécuté dans la page (window.__pwnLogo = ' + emplacements.pwn + ')', !emplacements.pwn, emplacements.pwn);
  const passent = accepte.filter(a => a[1]).map(a => a[0]);
  console.log('  · SVG acceptés comme logo malgré la liste noire :', passent.length ? passent.join(' | ') : 'aucun');
  // contre-épreuve de la lecture
  await p.evaluate(() => { const d = document.createElement('div'); d.id = 'zz-controle'; d.innerHTML = '<i data-xss="n999"></i><img src=x onerror="__xss(\'n999\')">'; document.body.appendChild(d); }); await att(400);
  const T = await p.evaluate(O.LIRE); await p.evaluate(() => document.getElementById('zz-controle').remove());
  L.v('contre-épreuve : la lecture voit la balise posée exprès', T.sorti.some(s => s.champ === 'n999'), T.sorti.slice(0, 2));
  fs.writeFileSync(SORTIE + 'fichiers.json', JSON.stringify({ sorties, hits, vus: [...vus], accepte, emplacements }, null, 1));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error('SONDE EN PANNE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
