// Recontrôle adverse des restes metier-3d, tour 2 (18/11) : ce que les trois corrections du tour 2 ont pu casser À CÔTÉ.
//  P : « Ajouter un appareil » (fiche client › Appareils) et « Enregistrer la vue actuelle » (Planning › Mes vues) sur le téléphone, la tablette,
//      jour ET nuit : l'exemple entre dans son champ (il n'est pas coupé par la largeur du champ), le libellé du détail tient sur une ligne ou
//      deux sans déborder, « Modifier » un appareil existant garde ses valeurs (un exemple n'est jamais une valeur), et l'enregistrement marche.
//  C : « Saisir un passage » : phrase du camion et lien « Voir le Stock » sur le téléphone étroit, la tablette, par le gérant ET par une autre
//      personne (julie), après plusieurs changements d'applicateur à la suite ; « Voir le Stock » MÈNE bien au stock ; et la phrase se redit
//      juste à la réouverture d'un second passage.
//  X : ce que le prototype a d'autre à dire sur « le camion » ou sur « les appareils » dans le métier 3D (balayage des textes de la fiche
//      client, onglet Appareils, vide ET plein) : aucun « gaz », « R32 » ou « Daikin » dans un TEXTE de l'application (les données d'exemple, elles, se nomment).
// Usage : node metier-3d-restes-2-recontrole.js P | C | X      Rend « N ✓ · M ✗ ».
const O = require('./metier-3d-outils.js'), L = O.L;
let ok = 0, ko = 0; const notes = []; const v = (nom, cond, det) => { if (cond) ok++; else { ko++; console.log('  ✗ ' + nom + (det ? ' — ' + det : '')); } };
const PART = process.argv[2] || 'P';
const CAP = O.CAP.replace('campagne-metier-3d', 'restes-metier-3d') + 'rc2-';
// largeur du texte d'une indication contre la place que le champ lui laisse (police et taille CALCULÉES du champ)
const MESURE = id => `(() => { const e = document.getElementById('${id}'); if (!e) return null; const cs = getComputedStyle(e), c = document.createElement('canvas').getContext('2d'); c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  const place = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), txt = c.measureText(e.getAttribute('placeholder') || '').width; return { place: Math.round(place), txt: Math.round(txt), ph: e.getAttribute('placeholder') || '', val: e.value }; })()`;
(async () => {
  if (PART === 'P') for (const [profil, nuit] of [['petit', true], ['iphone', false], ['ipad', true], ['mac', false]]) for (const jeu of ['d3', 'chauf', 'plomb', 'nett', 'd3clim']) {
    const c = await O.ouvrir({ profil, nuit, qui: 'marc', packs: O.METIERS[jeu] }), p = c.p, t = `${profil}${nuit ? ' nuit' : ''} ${jeu}`; p.on('dialog', d => d.dismiss().catch(() => {}));
    await L.aller(p, 'clients'); await L.calme(p, 400);
    const ouv = await p.evaluate(() => Object.keys(CLIENTS).find(x => CLIENTS[x].appareils && CLIENTS[x].appareils.length && !CLIENTS[x].archive) || ''); v(t + ' : un client avec appareils (population)', !!ouv);
    if (ouv) {
      await L.aller(p, 'client-x-' + ouv); await L.calme(p, 400);
      const tab = p.locator('#contenu [data-onglet="appareils"], #contenu button:has-text("Appareils")').locator('visible=true').first(); if (await tab.count()) { await L.toucher(c, tab); await L.calme(p, 300); }
      // « Modifier » un appareil qui existe : les valeurs d'abord, jamais l'exemple
      const mod = p.locator('[data-action="clientAppForm"]:not([data-n="-1"])').locator('visible=true').first(); v(t + ' : « Modifier » un appareil existe (population)', await mod.count() > 0);
      if (await mod.count()) { await L.toucher(c, mod); await L.calme(p, 400); const m = await p.evaluate(MESURE('app-nom')), d = await p.evaluate(MESURE('app-det')); v(t + ' (modifier) : le nom et le détail gardent leur valeur', m && d && m.val.length > 2 && d.val.length > 2, JSON.stringify([m && m.val, d && d.val]));
        await p.keyboard.press('Escape'); await L.calme(p, 250); await O.nettoyer(p); }
      const aj = p.locator('[data-action="clientAppForm"][data-n="-1"]').locator('visible=true').first(); v(t + ' : « Ajouter un appareil » (population)', await aj.count() > 0);
      if (await aj.count()) { await L.toucher(c, aj); await L.calme(p, 500);
        const m = await p.evaluate(MESURE('app-nom')), d = await p.evaluate(MESURE('app-det')); v(t + ' : les deux champs existent', !!m && !!d);
        if (m && d) { v(t + ' : l\'exemple du nom tient dans le champ (' + m.txt + ' px pour ' + m.place + ')', m.txt <= m.place, JSON.stringify(m)); v(t + ' : l\'exemple du détail tient dans le champ (' + d.txt + ' px pour ' + d.place + ')', d.txt <= d.place, JSON.stringify(d)); v(t + ' : les champs sont VIDES (un exemple n\'est pas une valeur)', m.val === '' && d.val === '', JSON.stringify([m.val, d.val]));
          notes.push(t + ' → ' + m.ph + ' / ' + d.ph); }
        const deb = await p.evaluate(() => { const pa = document.querySelector('#calque .panneau') || document.body; const lib = document.getElementById('app-det').closest('label'); const r = lib.getBoundingClientRect(), pr = pa.getBoundingClientRect(); return { lib: Math.round(r.height), droite: Math.round(r.right), pan: Math.round(pr.right), W: innerWidth }; });
        v(t + ' : le libellé du détail ne sort pas du panneau', deb.droite <= deb.pan + 1 && deb.droite <= deb.W, JSON.stringify(deb));
        // enregistrer un appareil réel : l'exemple ne s'enregistre pas, le nom tapé oui
        await p.fill('#app-nom', 'Pulvérisateur dorsal 12 L'); await p.fill('#app-det', 'Local technique · 2023'); const enr = p.locator('[data-action="clientAppEnreg"]').locator('visible=true').first(); await L.toucher(c, enr); await L.calme(p, 600);
        const vu = await p.evaluate(k => (CLIENTS[k].appareils || []).some(a => a.nom === 'Pulvérisateur dorsal 12 L' && a.det === 'Local technique · 2023'), ouv); v(t + ' : l\'appareil saisi est bien enregistré sur le client', vu);
        await p.evaluate(k => { CLIENTS[k].appareils = CLIENTS[k].appareils.filter(a => a.nom !== 'Pulvérisateur dorsal 12 L'); }, ouv); }
      await O.nettoyer(p); }
    // la vue enregistrée : même contrôle de largeur
    await L.aller(p, 'planning'); await L.calme(p, 500);
    const sm = p.locator('[data-plvue="multi"]').locator('visible=true').first(); if (await sm.count()) { await L.toucher(c, sm); await L.calme(p, 400); }
    const vues = p.locator('[data-mpop="vues"]').locator('visible=true').first();
    if (await vues.count()) { await L.toucher(c, vues); await L.calme(p, 300); const en = p.locator('[data-action="vueEnregistrer"]').locator('visible=true').first();
      if (await en.count()) { await L.toucher(c, en); await L.calme(p, 400); const m = await p.evaluate(MESURE('vue-nom')); v(t + ' : l\'exemple du nom de vue tient (' + (m && m.txt) + ' px pour ' + (m && m.place) + ')', !!m && m.txt <= m.place, JSON.stringify(m)); v(t + ' : le champ du nom de vue est vide', !!m && m.val === '', JSON.stringify(m)); } else v(t + ' : « Enregistrer la vue » (population)', false); }
    else v(t + ' : « Mes vues » (population)', false);
    v(t + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); }
  if (PART === 'C') for (const [profil, nuit, qui] of [['petit', true, 'marc'], ['ipad', true, 'marc'], ['mac', false, 'julie'], ['iphone', false, 'marc']]) {
    const c = await O.ouvrir({ profil, nuit, qui, packs: O.METIERS.d3 }), p = c.p, t = `${profil}${nuit ? ' nuit' : ''} ${qui}`; p.on('dialog', d => d.dismiss().catch(() => {}));
    await L.aller(p, 'registre'); await L.calme(p, 500);
    const bc = p.locator('#contenu [data-rg="cli|t1"]').first(); if (await bc.count()) { await L.toucher(c, bc); await L.calme(p, 500); }
    const bp = p.locator('#contenu [data-rg="passage"]').locator('visible=true').first(); v(t + ' : « Saisir un passage » (population)', await bp.count() > 0); if (!(await bp.count())) { await L.fin(c); continue; }
    await L.toucher(c, bp); await L.calme(p, 700);
    const lire = () => p.evaluate(() => { const ph = document.getElementById('rg-camion-ph'), li = document.querySelector('[data-rg="stock"]'); const pr = document.getElementById('rg-prods'); const r = ph && ph.getBoundingClientRect(), l = li && li.getBoundingClientRect(), W = innerWidth;
      return { phrase: ph ? ph.textContent.trim() : '', n: document.querySelectorAll('#rg-camion-ph, #rg-camion').length, vide: !!pr && /aucun biocide dans le camion/.test(pr.textContent), droite: r ? Math.round(r.right) : 0, W, lien: !!li, lienSous: l && r ? l.top >= r.bottom - 1 : null, lienDroite: l ? Math.round(l.right) : 0, hLien: l ? Math.round(l.height) : 0, lienLarg: l ? Math.round(l.width) : 0 }; });
    let m = await lire(); const opts = await p.evaluate(() => [...document.querySelectorAll('#rg-appl option')].map(o => o.value)); notes.push(t + ' : applicateurs ' + opts.length);
    const suite = opts.length >= 2 ? [...opts, ...opts.slice().reverse(), opts[0]] : [null];   // changer plusieurs fois, dans les deux sens
    const vus = { plein: 0, vide: 0 };
    for (const o of suite) { if (o) { await p.selectOption('#rg-appl', o); await L.calme(p, 250); } m = await lire(); vus[m.vide ? 'vide' : 'plein']++;
      v(t + ' ' + (o || '') + ' : une seule phrase, un seul nom de camion', m.n === 2 || m.n === 1 && !m.phrase, JSON.stringify(m.n));
      v(t + ' ' + (o || '') + ' : la phrase dit la même chose que la liste', m.vide ? /ne bouge pas/.test(m.phrase) && !/descend/.test(m.phrase) : /descend de ce que tu poses/.test(m.phrase) && !/ne bouge pas/.test(m.phrase), m.phrase);
      v(t + ' ' + (o || '') + ' : la phrase ne sort pas de l\'écran', m.droite <= m.W, JSON.stringify(m));
      if (m.lien) { v(t + ' ' + (o || '') + ' : « Voir le Stock » sous la phrase, dans l\'écran', m.lienSous && m.lienDroite <= m.W, JSON.stringify(m)); v(t + ' ' + (o || '') + ' : « Voir le Stock » assez haut pour un doigt (' + m.hLien + ' px)', m.hLien >= (profil === 'mac' ? 16 : 30), JSON.stringify(m)); } }
    v(t + ' : camion plein ET vide vus (population)', qui === 'julie' ? true : vus.plein > 0 && vus.vide > 0, JSON.stringify(vus)); notes.push(t + ' : ' + JSON.stringify(vus));
    await p.evaluate(() => { const e = document.getElementById('rg-camion-ph'); e && e.scrollIntoView({ block: 'center' }); }); await L.calme(p, 300); await L.capture(c, CAP + `camion-${profil}${nuit ? '-nuit' : ''}-${qui}.png`);
    // « Voir le Stock » mène au stock (et pas ailleurs)
    const li = p.locator('[data-rg="stock"]').locator('visible=true').first();
    if (await li.count()) { await L.toucher(c, li); await L.calme(p, 700); const r = await p.evaluate(() => typeof route !== 'undefined' ? route : ''); v(t + ' : « Voir le Stock » mène au Stock', r === 'stock', r); }
    else v(t + ' : « Voir le Stock » est là pour le gérant (population)', qui === 'sm');
    v(t + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); }
  if (PART === 'X') for (const jeu of ['d3', 'nett', 'plomb']) {
    const c = await O.ouvrir({ qui: 'marc', packs: O.METIERS[jeu] }), p = c.p, t = jeu; p.on('dialog', d => d.dismiss().catch(() => {}));
    await L.aller(p, 'clients'); await L.calme(p, 400);
    const ouv = await p.evaluate(() => Object.keys(CLIENTS).find(x => CLIENTS[x].appareils && CLIENTS[x].appareils.length && !CLIENTS[x].archive) || ''); v(t + ' : un client avec appareils (population)', !!ouv); if (!ouv) { await L.fin(c); continue; }
    await L.aller(p, 'client-x-' + ouv); await L.calme(p, 500);
    const tab = p.locator('#contenu [data-onglet="appareils"], #contenu button:has-text("Appareils")').locator('visible=true').first(); if (await tab.count()) { await L.toucher(c, tab); await L.calme(p, 300); }
    const aj = p.locator('[data-action="clientAppForm"][data-n="-1"]').locator('visible=true').first(); if (await aj.count()) { await L.toucher(c, aj); await L.calme(p, 400); }
    const D = await O.donnees(p); v(t + ' : le corpus des données d\'exemple existe (population)', D.taille > 50, String(D.taille));
    const L2 = await O.lire(p); v(t + ' : le panneau est lu (population)', L2.panneau && L2.texte.length > 20, L2.texte.slice(0, 80));
    const txt = L2.texte + ' ' + L2.champs.map(x => 'CHAMP[' + x.ph + ']').join(' '); const r = D.trouver(txt, /\bgaz\b|\bR-?32\b|daikin|\bsplit\b/i); const textes = r.filter(x => !x.donnee);
    v(t + ' : aucun mot de climatisation dans le TEXTE du panneau « Ajouter un appareil »', textes.length === 0, JSON.stringify(textes.slice(0, 3))); notes.push(t + ' : ' + r.length + ' relevé(s), ' + textes.length + ' dans des textes');
    v(t + ' : aucune erreur de page', c.err.length === 0, c.err.slice(0, 2).join(' // ')); await L.fin(c); }
  await L.fermer(); process.exit(O.bilan('metier-3d-restes-2-recontrole ' + PART, ok, ko, notes));
})().catch(async e => { console.log('ERREUR', e.stack); await L.fermer(); process.exit(2); });
