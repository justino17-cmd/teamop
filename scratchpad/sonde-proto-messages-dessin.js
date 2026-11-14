/* Sonde du DESSIN SUR LE PARTAGE D'ÉCRAN du prototype d'OP MESSAGES (apercu/prototype-op-messages.html, 13 novembre 2026).
   Lancer depuis la racine : node scratchpad/sonde-proto-messages-dessin.js   (PROFILS=mac,iphone pour restreindre ; CAPS=dossier pour garder les captures)
   Elle DESSINE pour de vrai (souris au bureau, doigt au téléphone) et relit ce que la page a retenu : chaque outil, annuler / rétablir, la gomme,
   les trois effacements, le zoom (boutons, molette, pincement), et le fait qu'un trait survit au rafraîchissement des tuiles. Sort en 1 au moindre ✗. */
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const FICHIER = 'file://' + path.join(__dirname, '..', 'apercu', 'prototype-op-messages.html');
const CAPS = process.env.CAPS; if (CAPS) fs.mkdirSync(CAPS, { recursive: true });
const PROFILS = [{ n: 'mac', w: 1440, h: 900 }, { n: 'windows', w: 1280, h: 720 }, { n: 'ipad', w: 820, h: 1180, tactile: true }, { n: 'iphone', w: 393, h: 852, tactile: true, mobile: true }, { n: 'android', w: 360, h: 780, tactile: true, mobile: true }, { n: 'iphone-paysage', w: 852, h: 393, tactile: true, mobile: true }];
(async () => {
  const seuls = process.env.PROFILS ? process.env.PROFILS.split(',') : null; const b = await chromium.launch(); let ok = 0, ko = 0;
  for (const p of PROFILS) { if (seuls && !seuls.includes(p.n)) continue; console.log('— ' + p.n);
    const ctx = await b.newContext({ viewport: { width: p.w, height: p.h }, hasTouch: !!p.tactile, isMobile: !!p.mobile, reducedMotion: 'reduce' });
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    const cdp = await ctx.newCDPSession(page);
    const vrai = (nom, c, detail) => { if (c) ok++; else { ko++; console.log('  ✗ ' + nom + (detail !== undefined ? ' — ' + JSON.stringify(detail) : '')); } };
    await page.goto(FICHIER); await page.waitForTimeout(300);
    await page.evaluate(() => { ouvrirSalle('e1'); entrerSalle(); S.salle.partage = true; peindreSalle(); }); await page.waitForTimeout(200);
    const etat = () => page.evaluate(() => { const a = S.salle.an; return { n: a.items.length, t: a.items.map((i) => i.t + ':' + i.par), z: a.z, x: a.x, y: a.y, grp: a.grp, outil: a.outil, hist: a.hist.length, ref: a.refaire.length, svg: document.querySelectorAll('#an-g > g').length, eph: a.ephem.length }; });
    /* la zone où l'on dessine : la partie du DOCUMENT visible dans la vue (une vue plus haute ou plus large que lui a des bandes vides, où un point se ramène au bord) */
    const vue = async () => page.evaluate(() => { const r = document.querySelector('#an-vue').getBoundingClientRect(), m = document.querySelector('#an-svg').getScreenCTM(), a = new DOMPoint(0, 0).matrixTransform(m), b = new DOMPoint(1000, 562).matrixTransform(m);
      const x1 = Math.max(r.left, a.x), y1 = Math.max(r.top, a.y), x2 = Math.min(r.right, b.x), y2 = Math.min(r.bottom, b.y); return { x: x1, y: y1, w: x2 - x1, h: y2 - y1, vh: r.height, vw: r.width }; });
    const v = await vue();
    vrai('la vue du partage a une vraie taille', v.vw > 200 && v.vh > 110 && v.w > 150 && v.h > 80, v);
    vrai('la page ne déborde pas de côté', await page.evaluate((w) => document.documentElement.scrollWidth <= w + 1, p.w));
    /* un geste de dessin : souris ou doigt, du point A au point B (en fractions de la vue) */
    const trait = async (ax, ay, bx, by) => { const V = await vue(), X = (f) => V.x + V.w * f, Y = (f) => V.y + V.h * f;
      if (p.tactile) { const pt = (x, y) => [{ x, y, id: 1 }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: pt(X(ax), Y(ay)) });
        for (let k = 1; k <= 6; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: pt(X(ax + (bx - ax) * k / 6), Y(ay + (by - ay) * k / 6)) }); await page.waitForTimeout(25); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else { await page.mouse.move(X(ax), Y(ay)); await page.mouse.down(); await page.mouse.move(X(bx), Y(by), { steps: 6 }); await page.mouse.up(); }
      await page.waitForTimeout(60); };
    const touche = (sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return false; e.scrollIntoView({ inline: 'center', block: 'nearest' }); e.click(); return true; }, sel);
    let e0 = await etat();
    vrai('un dessin de Sophie est déjà là, avec son nom', e0.n === 1 && e0.t[0] === 'ell:sophie' && await page.evaluate(() => document.querySelector('#an-g').textContent.includes('Sophie')), e0);
    /* crayon (l'outil au départ) */
    await trait(0.2, 0.3, 0.6, 0.5); let e = await etat();
    vrai('le crayon trace un trait', e.n === 2 && e.t[1] === 'crayon:moi' && e.svg === 2, e);
    vrai('le trait a plusieurs points, dans le document', await page.evaluate(() => { const i = S.salle.an.items[1]; return i.pts.length >= 3 && i.pts.every((q) => q[0] >= 0 && q[0] <= 1000 && q[1] >= 0 && q[1] <= 562); }));
    /* le trait survit au rafraîchissement des tuiles, et la tuile du partage n'est pas reconstruite */
    const meme = await page.evaluate(() => { const t = document.querySelector('#an-tuile'); majTuiles(); return t === document.querySelector('#an-tuile') && document.querySelectorAll('#tuiles .tuile').length > 1; });
    vrai('le rafraîchissement des tuiles ne reconstruit pas le partage', meme);
    /* chaque outil de dessin */
    for (const o of ['surl', 'ligne', 'fleche', 'dfleche', 'rect', 'ell', 'rectp', 'ellp']) { const av = (await etat()).n; await touche('[data-an="dessin"]'); if (!(await page.$('[data-an-outil="' + o + '"]'))) await touche('[data-an="dessin"]'); await touche('[data-an-outil="' + o + '"]'); await trait(0.3, 0.2, 0.7, 0.7); e = await etat();
      vrai('outil ' + o + ' : un dessin de plus, du bon type', e.n === av + 1 && e.t[e.n - 1] === o + ':moi', e.t); }
    /* annuler, rétablir */
    const n1 = (await etat()).n; await touche('[data-an="annuler"]'); e = await etat(); vrai('Annuler retire le dernier dessin', e.n === n1 - 1 && e.ref === 1, e);
    await touche('[data-an="retablir"]'); e = await etat(); vrai('Rétablir le remet', e.n === n1 && e.ref === 0, e);
    /* tampons */
    for (const o of ['t-coche', 't-croix', 't-etoile', 't-coeur', 't-fleche', 't-quest']) { const av = (await etat()).n; await touche('[data-an="tampon"]'); if (!(await page.$('[data-an-outil="' + o + '"]'))) await touche('[data-an="tampon"]'); await touche('[data-an-outil="' + o + '"]'); await trait(0.5, 0.5, 0.5, 0.5); e = await etat();
      vrai('tampon ' + o, e.n === av + 1 && e.t[e.n - 1] === o + ':moi', e.t.slice(-2)); }
    /* texte */
    { const av = (await etat()).n; await touche('[data-an="texte"]'); await trait(0.15, 0.8, 0.15, 0.8); await page.waitForSelector('#an-saisie', { timeout: 2000 }).catch(() => {}); const la = !!(await page.$('#an-saisie')); vrai('Texte ouvre un champ sur le partage', la);
      if (la) { await page.fill('#an-saisie', 'À revoir'); await page.keyboard.press('Enter'); await page.waitForTimeout(80); } e = await etat();
      vrai('le texte est posé', e.n === av + 1 && e.t[e.n - 1] === 'texte:moi' && await page.evaluate(() => document.querySelector('#an-g').textContent.includes('À revoir')), e.t.slice(-2)); }
    /* projecteur : flèche à mon nom (une seule), crayon qui s'efface, pointeur laser */
    await touche('[data-an="projo"]'); if (!(await page.$('[data-an-outil="pointe"]'))) await touche('[data-an="projo"]'); await touche('[data-an-outil="pointe"]'); await trait(0.4, 0.4, 0.4, 0.4); await trait(0.6, 0.6, 0.6, 0.6); e = await etat();
    vrai('la flèche à mon nom est unique : la seconde remplace la première', e.t.filter((t) => t === 'pointe:moi').length === 1, e.t);
    { const av = (await etat()).n; await touche('[data-an-outil="ephem"]') || (await touche('[data-an="projo"]'), await touche('[data-an-outil="ephem"]')); await trait(0.2, 0.6, 0.5, 0.65); e = await etat();
      vrai('le crayon qui s’efface ne reste pas dans les dessins', e.n === av && e.eph === 1, e); await page.waitForTimeout(2900); e = await etat(); vrai('…et il a disparu de l’écran', e.eph === 0 && e.svg === e.n, e); }
    { const av = (await etat()).n; (await page.$('[data-an-outil="laser"]')) || await touche('[data-an="projo"]'); await touche('[data-an-outil="laser"]'); await trait(0.3, 0.3, 0.5, 0.4); e = await etat(); vrai('le pointeur laser ne laisse aucun dessin', e.n === av, e); }
    /* sélection : déplacer un dessin */
    { await touche('[data-an="select"]'); const av = await page.evaluate(() => { const i = S.salle.an.items.find((j) => j.t === 'texte'); return [i.x, i.y]; }); await trait(0.17, 0.79, 0.4, 0.9); const ap = await page.evaluate(() => { const i = S.salle.an.items.find((j) => j.t === 'texte'); return [i.x, i.y]; });
      vrai('Sélection déplace le dessin attrapé', ap[0] > av[0] + 50 && ap[1] > av[1] + 10, { av, ap }); }
    /* gomme */
    { const av = (await etat()).n; await touche('[data-an="gomme"]'); const c = await page.evaluate(() => { const i = S.salle.an.items.find((j) => j.t === 'texte'), r = document.querySelector('#an-g [data-an-id="' + i.id + '"]').getBoundingClientRect(), v = document.querySelector('#an-vue').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
      { const V = await vue(); c[0] = (c[0] - V.x) / V.w; c[1] = (c[1] - V.y) / V.h; }
      await trait(c[0], c[1], c[0], c[1]); e = await etat(); vrai('la gomme efface le dessin touché', e.n === av - 1 && !e.t.includes('texte:moi'), e.t); }
    /* format : couleur et épaisseur s'appliquent au trait suivant */
    await touche('[data-an="format"]'); await touche('[data-an-coul="#2a6fdb"]'); await touche('[data-an-ep="8"]'); await touche('[data-an="dessin"]'); (await page.$('[data-an-outil="crayon"]')) || await touche('[data-an="dessin"]'); await touche('[data-an-outil="crayon"]'); await trait(0.1, 0.1, 0.3, 0.15);
    vrai('couleur et épaisseur choisies portent sur le trait suivant', await page.evaluate(() => { const i = S.salle.an.items[S.salle.an.items.length - 1]; return i.c === '#2a6fdb' && i.e === 8 && i.t === 'crayon'; }));
    /* zoom : boutons */
    await touche('[data-an="plus"]'); e = await etat(); vrai('Agrandir zoome (150 %)', Math.abs(e.z - 1.5) < 0.01 && (await page.textContent('#an-zoom')).includes('150'), e);
    { const c = await page.evaluate(() => { const d = document.querySelector('#an-doc').getBoundingClientRect(), v = document.querySelector('#an-vue').getBoundingClientRect(); return d.left <= v.left + 1 && d.right >= v.right - 1 && d.top <= v.top + 1 && d.bottom >= v.bottom - 1; }); vrai('agrandi, le document couvre toujours la vue', c); }
    /* dessiner agrandi : le trait tombe sous le doigt */
    { await trait(0.5, 0.5, 0.6, 0.6); const okp = await page.evaluate(() => { const i = S.salle.an.items[S.salle.an.items.length - 1], g = document.querySelector('#an-g [data-an-id="' + i.id + '"]').getBoundingClientRect(), v = document.querySelector('#an-vue').getBoundingClientRect(); return [g.left + g.width / 2, g.top + g.height / 2]; }); { const V = await vue(); okp[0] = (okp[0] - V.x) / V.w; okp[1] = (okp[1] - V.y) / V.h; }
      vrai('agrandi, le trait est là où on l’a tracé', Math.abs(okp[0] - 0.55) < 0.06 && Math.abs(okp[1] - 0.55) < 0.08, okp); }
    /* déplacer la vue */
    { await touche('[data-an="vue"]'); const av = await etat(); await trait(0.6, 0.6, 0.3, 0.3); e = await etat(); vrai('Déplacer fait glisser le document agrandi', e.x < av.x - 20 && e.y < av.y - 10 && e.n === av.n, { av: [av.x, av.y], ap: [e.x, e.y] }); }
    await touche('[data-an="ajuster"]'); e = await etat(); vrai('Ajuster revient à la page entière', e.z === 1 && e.x === 0 && e.y === 0, e);
    vrai('à 100 %, Réduire et Ajuster sont inactifs', await page.evaluate(() => document.querySelector('[data-an="moins"]').disabled && document.querySelector('[data-an="ajuster"]').disabled));
    /* zoom : molette (bureau) ou pincement (doigt) */
    { const V = await vue();
      if (p.tactile) { const two = (d) => [{ x: V.x + V.w / 2 - d, y: V.y + V.h / 2, id: 1 }, { x: V.x + V.w / 2 + d, y: V.y + V.h / 2, id: 2 }];
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: two(30) });
        for (const d of [45, 60, 75, 90]) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: two(d) }); await page.waitForTimeout(30); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await page.waitForTimeout(80); const av = e.n; e = await etat();
        vrai('pincer agrandit, sans rien dessiner', e.z > 1.8 && e.n === av, e); }
      else { await page.mouse.move(V.x + V.w / 2, V.y + V.h / 2); await page.keyboard.down('Control'); await page.mouse.wheel(0, -300); await page.keyboard.up('Control'); await page.waitForTimeout(250); e = await etat(); vrai('Ctrl + molette agrandit', e.z > 1.5, e);
        const av = e.y; await page.mouse.wheel(0, 120); await page.waitForTimeout(250); e = await etat(); vrai('agrandi, la molette fait défiler', e.y < av, { av, y: e.y }); }
      await touche('[data-an="ajuster"]'); }
    /* effacer */
    await touche('[data-an="dessin"]');
    { await touche('[data-an="effacer"]'); await touche('[data-an-eff="autres"]'); e = await etat(); vrai('Effacer « ceux des autres » ne garde que les miens', e.n > 0 && e.t.every((t) => t.endsWith(':moi')), e.t);
      await touche('[data-an="annuler"]'); e = await etat(); vrai('…et s’annule', e.t.includes('ell:sophie'), e.t);
      await touche('[data-an="effacer"]'); await touche('[data-an-eff="moi"]'); e = await etat(); vrai('Effacer « mes dessins » ne garde que ceux des autres', e.n === 1 && e.t[0] === 'ell:sophie', e.t);
      await touche('[data-an="effacer"]'); await touche('[data-an-eff="tout"]'); e = await etat(); vrai('Effacer « tous les dessins » vide le partage', e.n === 0 && e.svg === 0, e); }
    /* options */
    await touche('[data-an="options"]'); await touche('[data-an-opt="tableau"]');
    vrai('Tableau blanc cache le document', await page.evaluate(() => getComputedStyle(document.querySelector('#an-docg')).display === 'none' && document.querySelector('.an-tete b').textContent.includes('tableau blanc')));
    await trait(0.3, 0.3, 0.6, 0.6); e = await etat(); vrai('on dessine sur le tableau blanc', e.n === 1, e);
    await touche('[data-an-opt="noms"]'); await touche('[data-an="annuler"]'); await touche('[data-an="annuler"]');
    /* la barre : rien ne déborde de la page, chaque commande est assez grande au doigt */
    vrai('la page ne déborde toujours pas', await page.evaluate((w) => document.documentElement.scrollWidth <= w + 1, p.w));
    if (p.tactile) { const petits = await page.evaluate(() => [...document.querySelectorAll('.an-b,.an-s,.an-c')].map((x) => { const r = x.getBoundingClientRect(); return [x.textContent.trim() || x.getAttribute('aria-label'), Math.round(r.width), Math.round(r.height)]; }).filter((x) => x[1] < 40 || x[2] < 40)); vrai('au doigt, chaque commande de dessin fait au moins 40 px', petits.length === 0, petits); }
    /* réunion chargée (sondage, salles, sous-titres) : le partage garde de quoi dessiner et ses outils répondent */
    { await page.evaluate(() => { S.salle.sondage = { q: 'On démarre lundi ?', o: [['Oui', 2], ['Non', 0]], v: null }; S.salle.salles = true; S.salle.st = true; peindreSalle(); }); await page.waitForTimeout(150);
      const g = await page.evaluate(() => { const r = (s) => document.querySelector(s).getBoundingClientRect(), b = r('[data-an="vue"]'), t = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return { vue: Math.round(r('#an-vue').height), dessus: !!(t && t.closest('[data-an="vue"]')) }; });
      vrai('réunion chargée : la vue garde au moins 100 px et la barre d’outils n’est pas recouverte', g.vue >= 100 && g.dessus, g);
      await page.evaluate(() => { S.salle.sondage = null; S.salle.salles = false; S.salle.st = false; peindreSalle(); }); }
    /* arrêter le partage puis le reprendre : les dessins sont gardés */
    await page.evaluate(() => { S.salle.partage = false; peindreSalle(); S.salle.partage = true; peindreSalle(); }); const e2 = await etat(); vrai('arrêter puis reprendre le partage garde l’état', e2.svg === e2.n);
    if (CAPS) { await page.evaluate(() => { S.salle.an.tableau = false; anMaj(); }); await touche('[data-an="dessin"]'); await trait(0.55, 0.62, 0.9, 0.62); await touche('[data-an="format"]'); await page.waitForTimeout(100); await page.screenshot({ path: path.join(CAPS, 'dessin-' + p.n + '.png') }); }
    vrai('aucune erreur JavaScript', errs.length === 0, errs.slice(0, 3));
    await ctx.close(); }
  console.log(`${ok} ✓  ${ko} ✗`); await b.close(); process.exit(ko ? 1 : 0);
})();
