// SONDE « compositeur en grand » (16 novembre 2026) : dans OP GESTION, composer un devis ou un contrat occupe TOUT l'écran — plus de voile, plus de fenêtre posée ;
// à gauche les étapes, à droite la PAGE du document en grand, qui défile, avec son réglage de taille. Justin : « composer un devis, c'est trop petit ».
// Mesure, sur les profils mac, mac720, windows, ipad, iphone, android, petit, de jour et de nuit : la fenêtre couvre l'écran, la largeur de la page d'aperçu et la
// taille de police RÉELLEMENT rendue (px à l'écran), le réglage de taille, la mise à jour à la frappe, les champs à 48 px, rien ne glisse de côté, l'abandon (confirmation),
// le contrat, l'éditeur qui suit. PROFIL=… NUIT=0|1 pour un seul passage. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. Captures dans CAP (à REGARDER).
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const PROFILS = process.env.PROFIL ? process.env.PROFIL.split(',') : ['mac', 'mac720', 'windows', 'ipad', 'iphone', 'android', 'petit'];
const MODES = process.env.NUIT === '1' ? [true] : process.env.NUIT === '0' ? [false] : [false, true];
const CAP = (process.env.CAP || A.CAP.replace(/atelier\/?$/, '')) + 'grand/';
const DEUX_COLONNES = 1032;      // la même valeur que la règle CSS (min-width) : en dessous, une colonne et le bouton « Aperçu »
// géométrie du compositeur, lue dans le cadre de l'atelier
const geo = f => f.evaluate(() => {
  const r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.left), y: Math.round(b.top), w: Math.round(b.width), h: Math.round(b.height) }; };
  const q = s => document.querySelector(s), vis = e => e && e.offsetParent !== null && e.getBoundingClientRect().width > 0;
  const fen = q('.fenetre.vv-pl'), voile = q('.voile.plein'), feuille = [...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].find(e => e.getBoundingClientRect().width > 0) || null;      // la colonne de droite existe aussi, masquée, quand l'écran n'a qu'une colonne : on mesure la page VISIBLE
  const cs = e => e ? getComputedStyle(e) : null, cf = cs(fen), cv = cs(voile);
  // la taille rendue du texte d'un document : la MÉDIANE de la police pondérée par le nombre de signes (le texte où l'œil passe le plus de temps), en px d'écran = police × échelle
  let fsRendu = null, fsDoc = null, ech = null;
  if (feuille) { ech = feuille.getBoundingClientRect().width / 794; const els = [...feuille.querySelectorAll('*')].filter(e => !e.children.length && e.textContent.trim().length > 2 && e.getBoundingClientRect().width > 0); const pts = els.map(e => [parseFloat(getComputedStyle(e).fontSize), e.textContent.trim().length]).sort((a, b) => a[0] - b[0]); const tot = pts.reduce((s, x) => s + x[1], 0); let acc = 0; for (const x of pts) { acc += x[1]; if (acc >= tot / 2) { fsDoc = x[0]; break; } } if (fsDoc) fsRendu = fsDoc * ech; }
  return { W: innerWidth, H: innerHeight, fen: r(fen), voileFond: cv && cv.backgroundColor, voilePad: cv && cv.padding, rayon: cf && cf.borderTopLeftRadius, ombre: cf && cf.boxShadow,
    tete: r(q('.vv-hd')), retour: r(q('.vv-retour')), titre: (q('.vv-hd h3') || {}).textContent, pied: r(q('.fen-pied')), creer: r(q('.fen-pied [data-act="vierge-creer"]')),
    annulerPied: document.querySelectorAll('.fen-pied [data-fen-x]').length, totalVisible: vis(q('.vv-pied-tot')),  form: r(q('.vv-form')), colPage: r(q('.vv-ap-sc')), colVisible: vis(q('.vv-ap-sc')), barre: r(q('.vv-ap-bar')), barreVisible: vis(q('.vv-ap-bar')), apercuBtn: vis(q('[data-vv="grand"]')),
    feuille: r(feuille), ech, fsDoc, fsRendu, nbFeuilles: document.querySelectorAll('.vv-ap-sc .feuille').length };
});
// les champs de saisie visibles de la colonne des étapes : leur hauteur et leur taille de texte
const champs = f => f.evaluate(() => [...document.querySelectorAll('.vv-form input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=file]), .vv-form select, .vv-form textarea')].filter(e => e.offsetParent && e.getBoundingClientRect().width > 0).map(e => ({ id: e.id || e.name || e.tagName, h: Math.round(e.getBoundingClientRect().height), fs: parseFloat(getComputedStyle(e).fontSize) })));
const etapes = f => f.evaluate(() => [...document.querySelectorAll('.vv-et b')].filter(e => e.offsetParent).map(e => parseFloat(getComputedStyle(e).fontSize)));
const attend = (c, f, fn, arg, ms) => c.p.waitForFunction(fn, arg, { timeout: ms || 3000 }).then(() => true, () => false);
const attendCadre = async (f, fn, arg, ms) => { const t0 = Date.now(); while (Date.now() - t0 < (ms || 3000)) { try { if (await f.evaluate(fn, arg)) return true; } catch (e) {} await new Promise(r => setTimeout(r, 80)); } return false; };
(async () => {
  for (const pr of PROFILS) for (const nuit of MODES) {
    const tag = pr + (nuit ? '-nuit' : '-jour'), c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p, W = c.largeur, H = c.hauteur, deux = W >= DEUX_COLONNES;
    console.log('\n── ' + tag + ' (' + W + '×' + H + ', ' + (deux ? 'deux colonnes' : 'une colonne + Aperçu') + ')');
    let f = await A.ouvrirAtelier(c, 'devis', 'devis');
    v(tag + ' : le compositeur de devis s\'ouvre', !!f); if (!f) { await L.fin(c); continue; }
    await L.calme(p, 1100);      // la fenêtre apparaît en fondu : on mesure quand elle est posée
    const clic = async (s, cadre) => { const l = (cadre || f).locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000 }); else await l.click({ timeout: 5000 }); await p.waitForTimeout(160); };
    await clic('[data-vv="client"][data-id="vp"]'); await f.locator('#vv-objet').fill('Remplacement du ventilateur extérieur'); await p.waitForTimeout(250);
    for (const r of ['VE-DK-35', 'EL-ALL']) await clic(`[data-vv="art-add"][data-id="${r}"]`);
    await L.calme(p, 900);
    let g = await geo(f);
    // ── 1. TOUT l'écran : plus de voile, plus de fenêtre posée
    v(`${tag} · la fenêtre couvre tout l'écran du cadre (${g.W}×${g.H})`, g.fen && g.fen.x === 0 && g.fen.y === 0 && g.fen.w === g.W && g.fen.h === g.H, g.fen);
    v(`${tag} · plus de voile ni de cadre posé : fond plein, coins droits, aucune ombre, aucune marge`, /rgb\(/.test(g.voileFond) && !/rgba\(.*, 0\)/.test(g.voileFond) && g.rayon === '0px' && g.ombre === 'none' && g.voilePad === '0px', [g.voileFond, g.rayon, g.ombre, g.voilePad]);
    v(`${tag} · l'en-tête : « ‹ OP GESTION » (annuler), le titre « Nouveau devis »`, g.retour && /Nouveau devis/.test(g.titre) && g.tete && g.retour.y >= g.tete.y && g.retour.h >= 44, [g.retour, g.titre]);
    v(`${tag} · le bouton d'abandon porte son nom pour la voix`, /Retour à OP GESTION/.test(await f.locator('.vv-retour').getAttribute('aria-label')));
    // ── 2. la page, en grand
    if (deux) {
      v(`${tag} · deux colonnes : les étapes (480 à 620 px) et la page à droite`, g.form && g.form.w >= 480 && g.form.w <= 620 && g.colVisible && g.colPage.x >= g.form.w - 1, [g.form, g.colPage]);
      v(`${tag} · la page d'aperçu fait au moins ${W >= 1400 ? 620 : 560} px de large (${g.feuille && g.feuille.w} px) — avant : 333 px`, g.feuille && g.feuille.w >= (W >= 1400 ? 620 : 560), g.feuille);
      v(`${tag} · le texte du document est rendu à ${g.fsRendu && g.fsRendu.toFixed(1)} px à l'écran (≥ 10,5 ; avant : 5 px)`, g.fsRendu >= 10.5, [g.fsDoc, g.ech]);
      v(`${tag} · « Créer le devis » et le total sont dans la barre du haut, à côté du titre`, g.creer && g.creer.y < g.tete.h + 4 && g.totalVisible, [g.creer, g.tete]);
      v(`${tag} · le pied n'a plus de bouton « Annuler » (c'est « ‹ OP GESTION » qui annule)`, g.annulerPied === 0, g.annulerPied);
      v(`${tag} · pas de bouton « Aperçu » : la page est déjà là`, !g.barreVisible && !g.apercuBtn);
    } else {
      v(`${tag} · une colonne : la page n'est pas écrasée à côté, elle a son bouton « Aperçu »`, !g.colVisible && g.apercuBtn && g.barreVisible, [g.colVisible, g.apercuBtn]);
      v(`${tag} · « Créer le devis » est au pied, sur toute la largeur utile`, g.creer && g.creer.y > g.H / 2 && g.creer.w >= Math.min(g.W - 40, 300), g.creer);
      v(`${tag} · les étapes occupent la largeur de l'écran (pas plus : ${g.form && g.form.w} px)`, g.form && g.form.w <= g.W, g.form);
    }
    // ── 3. champs et boutons à la taille d'OP GESTION
    const ch = await champs(f), et = await etapes(f);
    v(`${tag} · population : des champs de saisie visibles (${ch.length}) et des titres d'étape (${et.length})`, ch.length >= 3 && et.length >= 3, [ch.length, et.length]);
    v(`${tag} · champs à 48 px de haut au moins, texte de 16 à 17 px`, ch.every(x => x.h >= 48 && x.fs >= 16 && x.fs <= 17.1), ch.filter(x => !(x.h >= 48 && x.fs >= 16 && x.fs <= 17.1)).slice(0, 5));
    v(`${tag} · titres d'étape de 18 px`, et.every(x => x === 18), et);
    // ── 4. rien ne glisse de côté, cibles au doigt
    const d = await L.deborde(c, f);
    v(`${tag} · le compositeur ne glisse pas de côté (largeur ${d.largeur})`, d.bouge === 0 && d.seconde <= d.largeur + 1, d);
    if (c.doigt) { const z = await L.doigts(f, '.fenetre'); v(`${tag} · cibles au doigt ≥ 44 px`, z.petits.length === 0, z.petits.slice(0, 8)); v(`${tag} · champs ≥ 16 px (pas de zoom d'iOS)`, z.champs.length === 0, z.champs.slice(0, 6)); v(`${tag} · aucun texte écrasé`, z.ecrases.length === 0, z.ecrases.slice(0, 4)); }
    const ct = await A.contrastes(f, '.fenetre', 4.5, '.papier,.vv-ap-cadre');
    v(`${tag} · contrastes du texte de l'interface ≥ 4,5 (population ${ct.n})`, ct.n >= 20 && ct.bas.length === 0, ct.bas.slice(0, 6));
    await L.capture(c, CAP + 'grand-devis-' + tag + '.png');
    // ── 5. la page suit la frappe
    const marque = 'Objet-ZQ' + Date.now() % 1000;
    await f.locator('#vv-objet').fill(marque);
    if (deux) v(`${tag} · la page se met à jour à la frappe (« ${marque} » y paraît)`, await attendCadre(f, m => (document.querySelector('.vv-ap-sc') || {}).textContent.includes(m), marque, 2500));
    // ── 6. le réglage de taille : colonne de droite (ordinateur) ou aperçu plein écran (une colonne)
    if (!deux) { await clic('[data-vv="grand"]'); await L.calme(p, 600); }
    const taille = async () => (await geo(f)).feuille;
    const zbtn = z => `[data-vv="zoom"][data-v="${z}"]`;
    // à l'ordinateur « Ajuster » est choisi d'office ; au téléphone l'aperçu s'ouvre sur 100 % (texte lisible, tout-01 du lot compositeur) et « Ajuster » est à un toucher
    let f0 = await taille(); v(`${tag} · le réglage de taille existe (4 choix) et ${deux ? '« Ajuster »' : '« 100 % »'} est choisi d'office`, (await f.locator('[data-vv="zoom"]:visible').count()) === 4 && (await f.locator(zbtn(deux ? 'ajuster' : 1) + ':visible').getAttribute('aria-pressed')) === 'true', f0);
    if (!deux) { v(`${tag} · à l'ouverture la page fait 794 px (100 %)`, Math.abs(f0.w - 794) <= 2, f0); await clic(zbtn('ajuster') + ':visible'); await L.calme(p, 400); f0 = await taille(); }
    if (deux) v(`${tag} · « Ajuster » : la page prend la largeur de sa colonne (${f0.w} px dans ${g.colPage.w - 64})`, Math.abs(f0.w - Math.min(1.25 * 794, g.colPage.w - 64)) <= 3, [f0.w, g.colPage.w]);
    else { const zone = await f.evaluate(() => { const c = document.querySelector('.vv-grand-c'); const s = getComputedStyle(c); return c.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); }); v(`${tag} · « Ajuster » : la page entière tient dans la largeur de l'écran (${f0.w} px dans ${zone})`, Math.abs(f0.w - Math.min(1.25 * 794, zone)) <= 3, [f0.w, zone]); }
    const lib = await f.locator(zbtn('ajuster') + ':visible').textContent(); v(`${tag} · le bouton dit le pourcentage obtenu : « ${lib.trim()} »`, /^Ajuster · \d+\u00a0%$/.test(lib.trim()), lib);
    for (const [z, k] of [[1, '100 %'], [1.5, '150 %'], [.75, '75 %']]) { await clic(zbtn(z) + ':visible'); await L.calme(p, 300); const t = await taille(); v(`${tag} · « ${k} » : la page fait ${Math.round(794 * z)} px (${t && t.w})`, t && Math.abs(t.w - 794 * z) <= 2, t); }
    await clic(zbtn(1) + ':visible'); await L.calme(p, 300);
    const gz = await geo(f); v(`${tag} · à 100 %, le texte du document est rendu à ${gz.fsRendu && gz.fsRendu.toFixed(1)} px (≥ 11,5)`, gz.fsRendu >= 11.5, [gz.fsDoc, gz.ech]);
    if (!deux) {
      const sc = await f.evaluate(() => { const c = document.querySelector('.vv-grand-c'); const av = c.scrollLeft; c.scrollLeft = 9999; const apres = c.scrollLeft; c.scrollLeft = av; return { cw: c.clientWidth, sw: c.scrollWidth, apres }; });
      v(`${tag} · à 100 %, la page dépasse l'écran et se fait défiler de côté dans l'aperçu (la page ne glisse pas, c'est l'aperçu)`, sc.sw > sc.cw && sc.apres > 0, sc);
      const dd = await L.deborde(c, f); v(`${tag} · même à 100 %, la fenêtre elle-même ne glisse pas`, dd.bouge === 0, dd);
    }
    await L.capture(c, CAP + 'grand-devis-100-' + tag + '.png');
    await clic(zbtn('ajuster') + ':visible'); await L.calme(p, 300);
    // la colonne de la page défile (ordinateur) : la page est plus haute que l'écran, l'en-tête reste en place
    if (deux) {
      const s = await f.evaluate(() => { const c = document.querySelector('.vv-ap-sc'), t = document.querySelector('.vv-hd').getBoundingClientRect().top; c.scrollTop = 400; const apres = c.scrollTop; const t2 = document.querySelector('.vv-hd').getBoundingClientRect().top; return { sh: c.scrollHeight, ch: c.clientHeight, apres, t, t2, fen: document.querySelector('.fenetre').scrollTop }; });
      v(`${tag} · la page défile dans sa colonne (${s.sh} px de haut dans ${s.ch}) ; l'en-tête et la fenêtre ne bougent pas`, s.sh > s.ch && s.apres > 0 && s.t === s.t2 && s.fen === 0, s);
      const s2 = await f.evaluate(() => { const c = document.querySelector('.vv-form'); c.scrollTop = 99999; return { apres: c.scrollTop, sh: c.scrollHeight, ch: c.clientHeight, t: document.querySelector('.vv-hd').getBoundingClientRect().top, ps: document.querySelector('.vv-ap-sc').scrollTop }; });
      v(`${tag} · les étapes défilent seules (${s2.sh} px dans ${s2.ch}) : l'en-tête reste en haut et la page de droite ne bouge pas`, s2.sh > s2.ch && s2.apres > 0 && s2.t === 0 && s2.ps === 400, s2);
    }
    // ── 7. la taille suit l'écran : on rétrécit puis on agrandit la fenêtre (ordinateur)
    if (pr === 'mac') {
      await p.setViewportSize({ width: 1100, height: H }); await L.calme(p, 700); const a = await geo(f);
      v(`${tag} · à 1 100 px la page suit sa colonne (${a.feuille && a.feuille.w} px) et reste ≥ 480`, a.colVisible && a.feuille.w >= 480 && a.feuille.w < g.feuille.w, [a.feuille, g.feuille]);
      await p.setViewportSize({ width: 1000, height: H }); await L.calme(p, 700); const b = await geo(f);
      v(`${tag} · à 1 000 px (< ${DEUX_COLONNES}) : une colonne et le bouton « Aperçu » ; « Créer » passe en bas`, !b.colVisible && b.apercuBtn && b.creer.y > H / 2, [b.colVisible, b.apercuBtn, b.creer]);
      await p.setViewportSize({ width: W, height: H }); await L.calme(p, 700); const e = await geo(f);
      v(`${tag} · de retour à ${W} px : la page retrouve sa taille (${e.feuille && e.feuille.w} px)`, e.colVisible && Math.abs(e.feuille.w - g.feuille.w) <= 2, [e.feuille, g.feuille]);
    }
    // ── 8. abandonner : « ‹ OP GESTION » demande confirmation (du contenu a été saisi), « Continuer » garde tout, « Abandonner » ferme l'atelier
    if (!deux) { await clic('[data-vv="grand-x"]'); await L.calme(p, 300); }
    await clic('.vv-retour'); await L.calme(p, 500);
    const conf = await f.evaluate(() => { const v = [...document.querySelectorAll('.voile')].filter(x => !x.classList.contains('plein')); return v.length ? v[0].textContent.replace(/\s+/g, ' ').trim().slice(0, 120) : null; });
    v(`${tag} · « ‹ OP GESTION » avec du contenu demande confirmation`, /Abandonner/.test(conf || ''), conf);
    await clic('.voile:not(.plein) .bt:has-text("Continuer")'); await L.calme(p, 400);
    v(`${tag} · « Continuer » : le compositeur est toujours là, avec ce qu'on a saisi`, (await f.locator('.fenetre.vv-pl').count()) === 1 && (await f.locator('#vv-objet').inputValue()) === marque);
    await clic('.vv-retour'); await L.calme(p, 400); await clic('.voile:not(.plein) .bt:has-text("Abandonner")'); await L.calme(p, 900);
    v(`${tag} · « Abandonner » ferme l'atelier : on est revenu dans OP GESTION`, await p.evaluate(() => { const z = document.querySelector('#opdz'); return !z || z.hidden; }));
    // ── 9. le contrat : mêmes dispositions
    f = await A.ouvrirAtelier(c, 'contrat', 'contrats');
    v(`${tag} · le compositeur de contrat s'ouvre`, !!f);
    if (f) {
      await L.calme(p, 1100);
      await clic('[data-vv="client"][data-id="mi"]'); await f.locator('#vv-titre').fill('Entretien annuel — Les Mimosas'); await f.locator('#vv-v-prix').fill('280'); await clic('[data-vv="tpl"][data-v="part"]'); await L.calme(p, 900);
      const k = await geo(f);
      v(`${tag} · contrat : tout l'écran, titre « Nouveau contrat », « Créer le contrat » ${deux ? 'dans la barre du haut' : 'au pied'}`, k.fen && k.fen.w === k.W && k.fen.h === k.H && /Nouveau contrat/.test(k.titre) && (deux ? k.creer.y < k.tete.h + 4 : k.creer.y > k.H / 2) && /Créer le contrat/.test(await f.locator('[data-act="vierge-creer"]').textContent()), [k.fen, k.titre, k.creer]);
      if (deux) {
        v(`${tag} · contrat : la page fait ${k.feuille && k.feuille.w} px de large (≥ 560), texte rendu à ${k.fsRendu && k.fsRendu.toFixed(1)} px, ${k.nbFeuilles} page(s) à faire défiler`, k.feuille && k.feuille.w >= 560 && k.fsRendu >= 10.5 && k.nbFeuilles >= (deux ? 2 : 0),      // un contrat de onze articles fait DEUX pages : la page de droite les montre toutes, pas seulement la première
           [k.feuille, k.fsRendu, k.nbFeuilles]);
        v(`${tag} · contrat : les articles posés paraissent dans la page (« Article »)`, await attendCadre(f, () => /Article/.test((document.querySelector('.vv-ap-sc') || {}).textContent || ''), null, 2000));
      } else {
        await clic('[data-vv="grand"]'); await L.calme(p, 600); const k2 = await geo(f);
        v(`${tag} · contrat : « Aperçu » montre le document entier à la largeur de l'écran (${k2.feuille && k2.feuille.w} px)`, k2.feuille && k2.feuille.w >= 280, k2.feuille);
        const nf = await f.evaluate(() => document.querySelectorAll('.vv-grand-plein .feuille').length); v(`${tag} · contrat : « Aperçu » montre TOUTES les pages (${nf}), pas seulement la première`, nf >= 2, nf);
        await clic('[data-vv="grand-x"]'); await L.calme(p, 300);
      }
      const chk = await champs(f); v(`${tag} · contrat : champs à 48 px, texte de 16 à 17 px (population ${chk.length})`, chk.length >= 3 && chk.every(x => x.h >= 48 && x.fs >= 16 && x.fs <= 17.1), chk.filter(x => !(x.h >= 48 && x.fs >= 16 && x.fs <= 17.1)).slice(0, 5));
      const dc = await L.deborde(c, f); v(`${tag} · contrat : rien ne glisse de côté`, dc.bouge === 0 && dc.seconde <= dc.largeur + 1, dc);
      await L.capture(c, CAP + 'grand-contrat-' + tag + '.png');
      // « Créer » : l'éditeur s'ouvre, la page y est ajustée à la largeur et les panneaux ne la réduisent pas
      await clic('[data-act="vierge-creer"]'); await L.calme(p, 1500);
      const ed = await f.evaluate(() => { const q = s => document.querySelector(s), r = e => { if (!e) return null; const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; }; return { vue: S.vue, zoom: S.ui.zoom, feuille: r(q('#vue-editeur .feuille')), panneau: r(q('#panneau')), menu: [...document.querySelectorAll('[data-act="menu-zoom"]')].length }; });
      v(`${tag} · l'éditeur qui suit s'ouvre, page « Ajuster à la largeur » (${ed.zoom}) : ${ed.feuille && ed.feuille.w} px de large`, ed.vue === 'editeur' && ed.zoom === 'ajuster' && ed.feuille && ed.feuille.w >= (W >= 1400 ? 620 : Math.min(W - 40, 560)), ed);
      await L.capture(c, CAP + 'grand-editeur-' + tag + '.png');
      // le menu de taille de l'éditeur dit « Ajuster à la largeur » (et non « à la fenêtre ») : c'est ce que la page fait vraiment dans OP GESTION
      const zb = f.locator('[data-act="menu-zoom"]:visible').first();
      if (await zb.count()) { if (c.doigt) await zb.tap({ timeout: 5000 }); else await zb.click({ timeout: 5000 }); await p.waitForTimeout(300);
        const mt = await f.evaluate(() => document.body.innerText); v(`${tag} · le menu de taille de l'éditeur dit « Ajuster à la largeur »`, /Ajuster à la largeur/.test(mt) && !/Ajuster à la fenêtre/.test(mt)); await p.keyboard.press('Escape'); }
      else v(`${tag} · le bouton de taille de l'éditeur est là (absent du téléphone : la page y est toujours ajustée)`, W < 761);
    }
    v(`${tag} · aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})();
