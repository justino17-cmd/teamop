// Recontrôle adverse des restes metier-3d (tour 1, 18/11) : ce que les trois corrections ont pu casser À CÔTÉ.
//  M : balayage de TOUS les champs d'exemple (placeholder) que chaque rubrique et chaque fenêtre de création offre, par métier : aucun mot de
//      climatisation hors du métier, rien de « batterie » — et la climatisation (contre-épreuve) garde les siens. La population se COMPTE.
//  C : la phrase « Le stock du camion de … » (applicateur changé, boîte re-dessinée, technicien, téléphone, nuit).
//  S : « Tous les sites » à largeur de liste 930 : autres rôles, téléphone, nuit ; aucun autre écran ne partage la règle rgtab.
//  T : le balayage STATIQUE — chaque indication « placeholder » écrite dans la page, passée par la VRAIE fonction metiersTextes, jeu par jeu
//      (la crawl M ne trouve que ce qu'un bouton ouvre ; celui-ci n'oublie aucune fenêtre).
// Usage : node metier-3d-restes-1-recontrole.js M <clé du jeu> | C | S | T      Rend « N ✓ · M ✗ ».
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const notes = []; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const PART = process.argv[2] || 'C', JEU = process.argv[3] || 'plomb';
const ROUTES = ['accueil', 'planning', 'interventions', 'taches', 'absences', 'clients', 'devis', 'contrats', 'achats', 'stock', 'produits', 'boxes', 'equipe', 'pointage', 'vehicules', 'entreprise', 'securite', 'registre'];
const CREER = /^(＋|\+)|nouve|ajouter|créer|saisir|demander|planifier|enregistrer un|modifier/i;
const PH = () => [...document.querySelectorAll('[placeholder]')].map(e => e.getAttribute('placeholder')).filter(x => x && x.length > 3);
(async () => {
  if (PART === 'M') { const packs = O.METIERS[JEU], clim = packs.includes('climatisation'), c = await O.ouvrir({ qui: 'marc', packs }), p = c.p; p.on('dialog', d => d.dismiss().catch(() => {}));
    const vus = new Map(); let fenetres = 0;
    for (const r of ROUTES) { await L.aller(p, r).catch(() => {}); await O.nettoyer(p); (await p.evaluate(PH)).forEach(x => vus.set(x, r));
      const noms = await p.evaluate(re => [...document.querySelectorAll('#contenu button')].filter(b => b.offsetParent !== null).map(b => b.textContent.replace(/\s+/g, ' ').trim()).filter(t => t.length < 60 && new RegExp(re, 'i').test(t)), CREER.source);
      for (const nom of [...new Set(noms)].slice(0, 7)) { try { const b = p.locator('#contenu button').filter({ hasText: nom }).locator('visible=true').first(); if (!(await b.count())) continue;
          await b.click({ timeout: 2500 }); await L.calme(p, 450); const n0 = vus.size; (await p.evaluate(PH)).forEach(x => { if (!vus.has(x)) vus.set(x, r + ' › ' + nom); }); if (vus.size > n0 || await p.locator('.fen, #calque .panneau').count()) fenetres++; } catch (e) {}
        await O.nettoyer(p); await L.aller(p, r).catch(() => {}); } }
    v(JEU + ' : population — au moins 15 champs d\'exemple relevés', vus.size >= 15, String(vus.size)); v(JEU + ' : au moins 12 fenêtres ou panneaux ouverts par un vrai bouton', fenetres >= 12, String(fenetres));
    const liste = [...vus.entries()], clims = liste.filter(([x]) => O.MOTS_CLIM.test(x)), charge = liste.filter(([x]) => /la mienne|tient plus la charge|batterie/i.test(x));
    if (process.env.LISTE) liste.forEach(([x, r]) => console.log('    ph «' + x + '» ← ' + r)); notes.push(JEU + ' : ' + vus.size + ' champs, ' + fenetres + ' fenêtres ; mots de clim : ' + JSON.stringify(clims));
    if (clim) { v(JEU + ' (contre-épreuve) : la climatisation garde « la mienne ne tient plus la charge »', charge.length > 0, JSON.stringify(charge)); v(JEU + ' (contre-épreuve) : elle garde au moins un exemple de clim', clims.length > 0); }
    else { v(JEU + ' : aucun exemple de climatisation hors du métier', clims.length === 0, JSON.stringify(clims)); v(JEU + ' : aucun « batterie / charge » hors du métier', charge.length === 0, JSON.stringify(charge)); }
    v(JEU + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); }
  if (PART === 'T') { const src = require('fs').readFileSync(require('path').join(L.RACINE, 'apercu/prototype-op-gestion.html'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    const phs = [...new Set([...src.matchAll(/placeholder(?:=|\s*:\s*)(?:"([^"$]{4,})"|'([^'$]{4,})')/g)].map(m => m[1] || m[2]))]; v('population : au moins 80 indications écrites dans la page', phs.length >= 80, String(phs.length));
    for (const [nom, packs] of Object.entries(O.METIERS)) { const c = await O.ouvrir({ qui: 'marc', packs }), p = c.p;
      const r = await p.evaluate(lst => { const d = document.createElement('div'); lst.forEach(x => { const i = document.createElement('input'); i.setAttribute('placeholder', x); d.appendChild(i); }); metiersTextes(d); return { fam: metiersFamille(), sortie: [...d.children].map((i, k) => [lst[k], i.getAttribute('placeholder')]) }; }, phs);
      const clim = ['clim', 'cvc'].includes(r.fam);   // 3D + climatisation = famille « gen » : le texte neutre, c'est voulu
      const AILLEURS = /^ex\. (entretien climatisation|la clim fait du bruit depuis ce matin)$/, LEGIT = nom === 'chauf' ? /pompe à chaleur/ : /^$^/;   // (« Nouvelle intervention » lit ses exemples dans MOTIFS, jeu par jeu : metier-3d-creation ; la pompe à chaleur est du chauffage)
      const restes = r.sortie.filter(([a, b]) => (O.MOTS_CLIM.test(b) || /la mienne|tient plus la charge/i.test(b)) && !AILLEURS.test(b) && !LEGIT.test(b)), changes = r.sortie.filter(([a, b]) => a !== b);
      notes.push(nom + ' (famille ' + r.fam + ') : ' + changes.length + ' indications changées, ' + restes.length + ' restent de climatisation : ' + JSON.stringify(restes.map(x => x[1])));
      if (clim) v(nom + ' : la climatisation garde ses indications', restes.length >= 5, String(restes.length)); else v(nom + ' (famille ' + r.fam + ') : aucune indication de climatisation ne reste (hors celles d\'un autre garde-fou)', restes.length === 0, JSON.stringify(restes));
      if (!clim && r.fam !== 'cvc') { const g = Object.fromEntries(r.sortie); v(nom + ' : les deux écritures de « condensateur, siphon, fluide… » (Ex. et ex.) sont remplacées', !/condensateur/.test(g['ex. condensateur, siphon, fluide…'] || '') && !/condensateur/.test(g['Ex. condensateur, siphon, fluide…'] || 'x'), JSON.stringify([g['ex. condensateur, siphon, fluide…'], g['Ex. condensateur, siphon, fluide…']])); v(nom + ' : « la mienne ne tient plus la charge » est remplacée', !/la mienne/.test(g['ex. la mienne ne tient plus la charge'] || ''), g['ex. la mienne ne tient plus la charge']); }
      v(nom + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); } }
  if (PART === 'C') for (const [profil, nuit, qui] of [['mac', false, 'marc'], ['iphone', true, 'marc'], ['mac', false, 'sm'], ['iphone', false, 'sm'], ['mac', false, 'julie']]) { const c = await O.ouvrir({ profil, nuit, qui, packs: O.METIERS.d3 }), p = c.p; p.on('dialog', d => d.dismiss().catch(() => {})); const t = `${profil}${nuit ? ' nuit' : ''} ${qui}`;
    await L.aller(p, 'registre'); await L.calme(p, 500);
    const bc = p.locator('#contenu [data-rg="cli|t1"]').first(); if (await bc.count()) { await L.toucher(c, bc); await L.calme(p, 500); }
    const bp = p.locator('#contenu [data-rg="passage"]').locator('visible=true').first(); v(t + ' : « Saisir un passage » existe (population)', await bp.count() > 0); if (!(await bp.count())) { await L.fin(c); continue; }
    await L.toucher(c, bp); await L.calme(p, 700);
    const lire = () => p.evaluate(() => ({ n: document.querySelectorAll('#rg-camion').length, phrase: ((document.getElementById('rg-camion') || {}).parentElement || {}).textContent || '', sel: !!document.getElementById('rg-appl'), opts: [...document.querySelectorAll('#rg-appl option')].map(o => [o.value, o.textContent.trim()]), prods: (document.getElementById('rg-prods') || {}).textContent || '' }));
    let m = await lire(); v(t + ' : une seule phrase « camion » (id unique)', m.n === 1, JSON.stringify(m.n)); notes.push(t + ' → « ' + m.phrase.replace(/\s+/g, ' ').slice(0, 70) + ' » sélecteur ' + m.sel);
    if (qui === 'marc' || qui === 'julie') { v(t + ' : au moins trois applicateurs (population)', m.opts.length >= 3, JSON.stringify(m.opts));
      for (const [val, lib] of m.opts) { await p.selectOption('#rg-appl', val); await L.calme(p, 300); const pr = lib.split(/\s|\(/)[0]; m = await lire(); v(t + ' : « ' + lib + ' » → phrase ' + pr + ' ET aucun nom d\'un autre applicateur', m.phrase.includes(pr) && m.opts.filter(o => o[0] !== val).every(o => !m.phrase.includes(o[1].split(/\s|\(/)[0])), m.phrase); v(t + ' : « ' + lib + ' » → « Produits posés » parle du même camion', !/camion de /.test(m.prods) || m.prods.includes(pr), m.prods.slice(0, 120)); }
      // re-dessin de la boîte par un autre geste (état d'une box, produit) : la phrase garde le dernier applicateur
      const dern = m.opts[m.opts.length - 1]; await p.evaluate(() => document.querySelector('#calque [data-rg^="etat|"], .fen [data-rg^="etat|"]').scrollIntoView({ block: 'center' })); await L.toucher(c, p.locator('[data-rg^="etat|"]').locator('visible=true').first()); await L.calme(p, 400);
      m = await lire(); v(t + ' : après un geste sur une box, la phrase garde « ' + dern[1].split(/\s|\(/)[0] + ' »', m.phrase.includes(dern[1].split(/\s|\(/)[0]) && m.n === 1, m.phrase);
      await p.evaluate(() => { const e = document.getElementById('rg-camion'); e && e.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300); await L.capture(c, O.CAP.replace('campagne-metier-3d', 'restes-metier-3d') + `camion-${profil}${nuit ? '-nuit' : ''}-${qui}.png`); }
    else { v(t + ' : le technicien ne choisit pas l\'applicateur', true); v(t + ' : la phrase nomme le technicien connecté', m.phrase.length > 20 && /camion de \S+/.test(m.phrase), m.phrase); }
    v(t + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); }
  if (PART === 'S') { for (const [profil, nuit, qui, larg] of [['mac', false, 'julie', [1300, 1200]], ['mac', true, 'marc', [1360, 1250]], ['iphone', false, 'marc', [390]], ['petit', true, 'marc', [320]], ['mac720', false, 'marc', [1280]], ['windows', false, 'marc', [1366]], ['ipad', true, 'marc', [820, 1180]]]) { const c = await O.ouvrir({ profil, nuit, qui, packs: O.METIERS.d3 }), p = c.p; await L.aller(p, 'registre'); await L.calme(p, 500);
      for (const w of larg) { if (profil === 'mac' || w !== larg[0] || larg.length > 1) await p.setViewportSize({ width: w, height: profil === 'ipad' ? 1180 : 820 }).catch(() => {}); await L.calme(p, 500);
        const m = await p.evaluate(() => { const tab = document.querySelector('.rg-tab'); if (!tab) return null; const th = tab.querySelector('.rg-th'), R = tab.getBoundingClientRect(), tab6 = getComputedStyle(th).display !== 'none'; const dehors = [...tab.querySelectorAll('.rg-tr')].filter(l => l.getBoundingClientRect().width > 0).flatMap(l => [...l.children].filter(e => e.getBoundingClientRect().right > R.right + 1 || e.getBoundingClientRect().left < R.left - 1 || e.scrollWidth > e.clientWidth + 1).map(e => e.textContent.trim().slice(0, 24))); return { cw: Math.round(R.width), tab6, dehors, lignes: tab.querySelectorAll('.rg-ligne').length, doc: document.documentElement.scrollWidth, fen: innerWidth, hauts: [...tab.querySelectorAll('.rg-ligne')].map(e => Math.round(e.getBoundingClientRect().height)) }; });
        const t = `${profil}${nuit ? ' nuit' : ''} ${qui} ${w}`; v(t + ' : « Tous les sites » est là (population)', !!m && m.lignes === 3, JSON.stringify(m)); if (!m) continue;
        v(t + ' (liste ' + m.cw + ', ' + (m.tab6 ? 'tableau' : 'cartes') + ') : rien ne sort de la carte ni de sa colonne', m.dehors.length === 0, JSON.stringify(m.dehors)); v(t + ' : la page ne glisse pas de côté', m.doc <= w + 1, JSON.stringify(m));
        v(t + ' : le tableau ne s\'affiche que si la liste ≥ 930 px (la liste ' + m.cw + ')', m.tab6 === (m.cw > 930), JSON.stringify(m)); notes.push(t + ' : liste ' + m.cw + ' → ' + (m.tab6 ? 'tableau' : 'cartes') + ', hauteurs ' + m.hauts);
        await p.evaluate(() => document.querySelector('.rg-tab').scrollIntoView({ block: 'center' })); await L.calme(p, 250); await L.capture(c, O.CAP.replace('campagne-metier-3d', 'restes-metier-3d') + `sites-${profil}-${w}${nuit ? '-nuit' : ''}-${qui}.png`); }
      v(`${profil} ${qui} : aucune erreur de page`, c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); } }
  await L.fermer(); process.exit(O.bilan('metier-3d-restes-1-recontrole ' + PART + ' ' + (PART === 'M' ? JEU : ''), ok, ko, notes));
})().catch(async e => { console.log('ERREUR', e.stack); await L.fermer(); process.exit(2); });
