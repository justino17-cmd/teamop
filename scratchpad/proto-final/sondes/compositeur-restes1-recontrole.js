// SONDE DURABLE — RECONTRÔLE ADVERSE des « restes » du compositeur, tour 1 (17 novembre 2026). Elle cherche ce que les six corrections (e7ae24e, 400cee8) ont CASSÉ À CÔTÉ :
//   A. un menu ouvert masque les infobulles au téléphone : la classe « menu-ouvert » ne reste jamais collée (Échap, toucher dehors, pivot) et l'infobulle d'un geste du menu (« Brouillon supprimé ») se voit
//   B. « ⋯ » range la feuille « Format » : l'espace réservé en bas et la classe « fmt-bas » tombent avec elle, la feuille se rouvre au toucher d'un bloc ; les AUTRES menus (Ajouter, Zoom) ne sont pas couverts par la feuille
//   C. le collage sur plusieurs lignes : sélection remplacée, collage en tête, collage qui dépasse la longueur permise, annulation (Ctrl+Z), brouillon rouvert
//   D. les initiales du logo : aussi au bureau, de nuit, après un va-et-vient Ajuster ↔ 100 %, et dans la fenêtre « Identité » (jugées sur les pixels)
//   E. les crochets des résumés de clauses : une clause écrite par la personne, la recherche, la liste en deux colonnes
// PROFIL=mac|windows|ipad|iphone|android|petit  NUIT=0|1  node compositeur-restes1-recontrole.js — « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const pr = process.env.PROFIL || 'iphone', nuit = process.env.NUIT === '1', tag = 'rc1-' + pr + (nuit ? '-nuit' : '-jour');
const CAP = (process.env.CAP || A.CAP) + '';
const clic = async (c, f, s, opt) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000, ...opt }); else await l.click({ timeout: 5000, ...opt }); await c.p.waitForTimeout(170); };
const fermerTout = async (c, f) => { const p = c.p; await p.keyboard.press('Escape'); await p.waitForTimeout(450); if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); } };
// le logo d'un carré : les pixels CLAIRS (l'encre des initiales) doivent être au centre, assez nombreux et hauts
const logoAuPixel = async (c, sel, ms) => {
  const PNG = require('../../png.js'), p = c.p, f = A.cadre(p); await p.waitForTimeout(ms);
  const r = await f.evaluate(s => { const e = [...document.querySelectorAll(s)].find(x => { const b = x.getBoundingClientRect(); return b.width >= 8 && b.left >= 0 }); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, sel);
  if (!r || r.w < 8) return { absent: true };
  await p.waitForTimeout(120);
  const r2 = await f.evaluate(s => { const b = [...document.querySelectorAll(s)].find(x => { const q = x.getBoundingClientRect(); return q.width >= 8 && q.left >= 0 }).getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; }, sel);
  const fr = await p.evaluate(() => { const e = document.querySelector('iframe'); const b = e.getBoundingClientRect(); return { x: b.left, y: b.top }; });
  const buf = await p.screenshot({ clip: { x: fr.x + r2.x, y: fr.y + r2.y, width: r2.w, height: r2.h } }), img = PNG.decoder(buf);
  let n = 0, sx = 0, sy = 0, y0 = 1e9, y1 = -1;
  for (let y = 0; y < img.h; y++) for (let x = 0; x < img.w; x++) { const q = PNG.px(img, x, y); if (q[0] > 190 && q[1] > 190 && q[2] > 190 && Math.min(x, img.w - 1 - x, y, img.h - 1 - y) > img.w * .1) { n++; sx += x; sy += y; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  return { n, cx: n ? sx / n / img.w : 0, cy: n ? sy / n / img.h : 0, haut: n ? (y1 - y0 + 1) / img.h : 0, w: Math.round(r2.w) };
};
// à 19 px (la page entière, « Ajuster ») il ne reste que quelques pixels clairs : le seuil suit la surface
const logoBon = r => r && !r.absent && r.n >= Math.max(5, .02 * r.w * r.w) && r.cx > .4 && r.cx < .6 && r.cy > .3 && r.cy < .65 && r.haut > (r.w < 30 ? .15 : .3);
(async () => {
  const c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p; console.log('── ' + tag);
  // ── A + B. dans un contrat tout juste créé ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'contrats'); const f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
    await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(300);
    await clic(c, f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1800);
    const tel = await f.evaluate(() => S.tactile), etroit = await f.evaluate(() => matchMedia('(max-width:760px)').matches);
    const etat = () => f.evaluate(() => ({ menu: !!document.querySelector('.menu'), classe: document.body.classList.contains('menu-ouvert'), feuille: !!(FEN && FEN.format), fmtBas: document.body.classList.contains('fmt-bas'),
      pad: (bureau() && bureau().style.paddingBottom) || '', vis: getComputedStyle(document.getElementById('toasts')).visibility, nToasts: document.getElementById('toasts').children.length, pop: !!POP }));
    const e0 = await etat();
    v(`${tag} · population : le contrat est créé et la feuille « Format » est là (tactile ${tel}, étroit ${etroit}) : ${JSON.stringify(e0)}`, tel ? e0.feuille : true, e0);
    // B1. « ⋯ » range la feuille ET ce qu'elle avait réservé
    await clic(c, f, '#b-plus'); await p.waitForTimeout(400);
    const e1 = await etat();
    v(`${tag} · B1 « ⋯ » : menu ouvert, feuille rangée, classe fmt-bas retirée, espace réservé en bas rendu (${e1.pad || 'aucun'})`, e1.menu && !e1.feuille && !e1.fmtBas && (e1.pad === '' || parseFloat(e1.pad) < 40), e1);
    v(`${tag} · B1b la classe menu-ouvert suit le menu (étroit : ${etroit}) ; masquage des infobulles seulement sous 760 px (visibilité ${e1.vis})`, e1.classe && (etroit ? e1.vis === 'hidden' : e1.vis !== 'hidden'), e1);
    // A1. Échap
    await p.keyboard.press('Escape'); await p.waitForTimeout(350);
    let e2 = await etat(); v(`${tag} · A1 Échap : plus de menu, plus de classe, infobulles revenues`, !e2.menu && !e2.classe && e2.vis !== 'hidden', e2);
    // A2. toucher dehors
    await clic(c, f, '#b-plus'); await p.waitForTimeout(300); await f.evaluate(() => document.querySelector('.vv-pl, .page, #bureau, body').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true })));
    await p.waitForTimeout(300); e2 = await etat(); v(`${tag} · A2 toucher dehors : la classe tombe aussi`, !e2.menu && !e2.classe, e2);
    // A3. pivot / redimensionnement de la fenêtre pendant que le menu est ouvert
    await clic(c, f, '#b-plus'); await p.waitForTimeout(300);
    const vp = p.viewportSize(); await p.setViewportSize({ width: vp.width + 7, height: vp.height }); await p.waitForTimeout(500); await p.setViewportSize(vp); await p.waitForTimeout(400);
    e2 = await etat(); v(`${tag} · A3 pivot de l'appareil menu ouvert : le menu se ferme et la classe tombe (jamais collée)`, !e2.menu && !e2.classe && e2.vis !== 'hidden', e2);
    // B2. la feuille se rouvre par le bouton « Format » (rien de bloqué par la fermeture)
    const nf = await f.locator('[data-act="format"]:visible').count(); if (nf) await clic(c, f, '[data-act="format"]:visible'); await p.waitForTimeout(500);
    const e3 = await etat(); if (tel) v(`${tag} · B2 « Format » rouvre la feuille (${nf} bouton) : espace réservé ${e3.pad}`, nf > 0 && e3.feuille && e3.fmtBas, e3);
    // B3. les AUTRES menus (Zoom, Ajouter) : atteignables avec la feuille ouverte
    for (const [sel, nom] of [['[data-act="menu-zoom"]', 'Zoom'], ['[data-act="menu-ajout"]', 'Ajouter']]) {   // « Insérer » (barre du bas) est sous la feuille « Format » : c'est voulu, « Terminé » la range — voir doutes

      const n = await f.locator(sel + ':visible').count();
      if (!n) { console.log('  · ' + tag + ' : pas de bouton « ' + nom + ' » visible ici'); continue; }
      await f.locator(sel + ':visible').first().evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(250);
      const ac = await f.evaluate(s => { const b = [...document.querySelectorAll(s)].find(x => x.offsetParent); const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { ok: !!t && b.contains(t), par: t ? (t.tagName + '.' + String(t.className).slice(0, 30) + (t.closest('.voile.souple') ? ' (dans la feuille « Format »)' : '')) : null, bas: Math.round(r.bottom), H: innerHeight }; }, sel);
      v(`${tag} · B3 le bouton « ${nom} » n'est pas recouvert par la feuille « Format » ouverte (${JSON.stringify(ac)})`, ac.ok, ac);
      if (!ac.ok) continue;
      await clic(c, f, sel + ':visible'); await p.waitForTimeout(350);
      const r = await f.evaluate(() => { const bs = [...document.querySelectorAll('.menu button')]; if (!bs.length) return { menu: false }; const out = bs.map(b => { b.scrollIntoView({ block: 'nearest' }); const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { lib: b.textContent.trim().slice(0, 24), ok: !!t && b.contains(t), bas: Math.round(r.bottom) }; }); return { menu: true, H: innerHeight, mal: out.filter(o => !o.ok), n: out.length, feuille: !!(FEN && FEN.format) }; });
      v(`${tag} · B3 menu « ${nom} » (${r.n || 0} gestes) : chacun atteignable au doigt (feuille ${r.feuille ? 'ouverte' : 'rangée'})${r.mal && r.mal.length ? ' — couverts : ' + JSON.stringify(r.mal) : ''}`, r.menu && r.mal.length === 0, r);
      await L.capture(c, CAP + tag + '-menu-' + nom.toLowerCase() + '.png');
      await p.keyboard.press('Escape'); await p.waitForTimeout(350);
    }
    const e4 = await etat(); v(`${tag} · après les trois menus, aucune classe collée`, !e4.classe && !e4.menu, e4);
    // A4. un geste du menu qui donne une infobulle : « Supprimer ce brouillon » → « Brouillon supprimé » doit se VOIR
    if (!(await f.evaluate(() => !!document.querySelector('.menu')))) { /* déjà fermé */ }
    await clic(c, f, '#b-plus'); await p.waitForTimeout(350);
    await clic(c, f, '.menu button:has-text("Supprimer ce brouillon")'); await p.waitForTimeout(500);
    if (await f.locator('.dialogue').count()) await clic(c, f, '.dialogue button[data-r="1"]');
    await p.waitForTimeout(900);
    const t = await f.evaluate(() => { const w = document.getElementById('toasts'); const x = [...w.children].map(k => k.textContent.trim()); const r = w.getBoundingClientRect(); return { msgs: x, vis: getComputedStyle(w).visibility, classe: document.body.classList.contains('menu-ouvert'), enHaut: Math.round(r.top), H: innerHeight }; });
    v(`${tag} · A4 « Brouillon supprimé » se voit après le geste du menu (${JSON.stringify(t.msgs)}, visibilité ${t.vis})`, t.msgs.some(m => /supprimé/i.test(m)) && t.vis !== 'hidden' && !t.classe, t);
    // l'infobulle est dans le cadre de l'atelier : si le cadre est rangé après la suppression, la personne ne la voit PAS (la liste du parent montre seulement que la ligne a disparu)
    const cadre = await p.evaluate(() => { const e = document.querySelector('iframe'); if (!e) return null; const b = e.getBoundingClientRect(), cs = getComputedStyle(e); return { w: Math.round(b.width), h: Math.round(b.height), vis: cs.visibility, disp: cs.display, op: cs.opacity }; });
    console.log('  · ' + tag + ' · A4b cadre de l\'atelier après la suppression : ' + JSON.stringify(cadre) + ' (si rangé, l\'infobulle « Brouillon supprimé » n\'est pas visible)');
    await L.capture(c, CAP + tag + '-brouillon-supprime.png');
  }
  // ── B5. ce qu'on a tapé dans la feuille « Format » survit à « ⋯ » (la feuille se range, rien ne se perd) ─────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'contrats'); const f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
    await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(300);
    await clic(c, f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1800);
    const tel = await f.evaluate(() => S.tactile && matchMedia('(max-width:760px)').matches);
    if (tel) {
      const ch = f.locator('#fen-fmt input[type="text"], #fen-fmt textarea').first(); const n = await ch.count();
      v(`${tag} · B5 population : un champ de la feuille « Format » est là (${n})`, n >= 1, n);
      if (n) {
        await ch.evaluate(e => e.scrollIntoView({ block: 'center' })); await ch.fill('12 rue des Essais'); await p.waitForTimeout(500);
        const avant = await f.evaluate(() => JSON.stringify(D().vars || {}));
        await clic(c, f, '#b-plus'); await p.waitForTimeout(350); await p.keyboard.press('Escape'); await p.waitForTimeout(350);
        await clic(c, f, '[data-act="format"]:visible'); await p.waitForTimeout(600);
        const apres = await f.evaluate(() => JSON.stringify(D().vars || {})), champ = await f.locator('#fen-fmt input[type="text"], #fen-fmt textarea').first().inputValue().catch(() => null);
        v(`${tag} · B5 la valeur tapée survit à « ⋯ » puis « Format » : ${apres.slice(0, 80)} (champ « ${champ} »)`, /12 rue des Essais/.test(apres) && avant === apres, { avant, apres, champ });
      }
    }
    await f.evaluate(() => { try { fermerPop(false) } catch (e) {} });
    { const rt = f.locator('[data-act="retour"]:visible'); if (await rt.count()) { await clic(c, f, '[data-act="retour"]:visible'); await p.waitForTimeout(800); } }
    await fermerTout(c, f);
  }
  // ── B4. les menus du DOCUMENT d'un devis (Ajouter une ligne, Zoom) avec la feuille « Format » ouverte, au téléphone — même règle de couches que « ⋯ » ──────────────────────
  {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    await A.composerDevis(c, f, { client: 'vp', objet: 'Contrôle des menus', articles: [{ ref: 'EL-ALL', qte: 1 }] }); await p.waitForTimeout(1500);
    const tel = await f.evaluate(() => S.tactile && matchMedia('(max-width:760px)').matches);
    const info = await f.evaluate(() => ({ vue: S.vue, blocs: [...document.querySelectorAll('.bloc')].map(b => b.dataset.type || b.className).slice(0, 8), feuille: !!(FEN && FEN.format) }));
    v(`${tag} · B4 population : le devis est ouvert dans l'éditeur (${JSON.stringify(info)})`, info.vue === 'editeur' && info.blocs.length >= 1, info);
    for (const sel of ['[data-act="menu-inserer"]', '[data-act="menu-zoom"]']) {
      let n = await f.locator(sel + ':visible').count();
      if (false) { await f.evaluate(() => { const t = document.querySelector('.bloc.t-tableau'); if (t) { t.scrollIntoView({ block: 'center' }); const r = t.getBoundingClientRect(); const x = r.left + 20, y = r.top + 20; const e = document.elementFromPoint(x, y); (e || t).dispatchEvent(new MouseEvent('click', { bubbles: true })); } }); await p.waitForTimeout(500); n = await f.locator(sel + ':visible').count(); }
      if (!n) { console.log('  · ' + tag + ' : B4 pas de bouton ' + sel + ' visible (' + (tel ? 'téléphone' : 'grand écran') + ')'); continue; }
      await f.locator(sel + ':visible').first().evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(250);
      const ac = await f.evaluate(s => { const b = [...document.querySelectorAll(s)].find(x => x.offsetParent); const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { ok: !!t && b.contains(t), par: t ? t.tagName + '.' + String(t.className).slice(0, 30) : null }; }, sel);
      v(`${tag} · B4 le bouton ${sel} est touchable (${JSON.stringify(ac)})`, ac.ok, ac); if (!ac.ok) continue;
      await clic(c, f, sel + ':visible'); await p.waitForTimeout(400);
      const r = await f.evaluate(() => { const bs = [...document.querySelectorAll('.menu button')]; if (!bs.length) return { menu: false }; const out = bs.map(b => { b.scrollIntoView({ block: 'nearest' }); const q = b.getBoundingClientRect(), t = document.elementFromPoint(q.left + q.width / 2, q.top + q.height / 2); return { lib: b.textContent.trim().slice(0, 22), ok: !!t && b.contains(t), haut: Math.round(q.top), bas: Math.round(q.bottom) }; }); return { menu: true, H: innerHeight, mal: out.filter(o => !o.ok), n: out.length, feuille: !!(FEN && FEN.format) }; });
      v(`${tag} · B4 menu ${sel} (${r.n || 0} gestes, feuille ${r.feuille ? 'ouverte' : 'rangée'}) : chacun atteignable au doigt${r.mal && r.mal.length ? ' — couverts : ' + JSON.stringify(r.mal) : ''}`, r.menu && r.mal.length === 0, r);
      await L.capture(c, CAP + tag + '-b4-' + sel.replace(/\W+/g, '') + '.png');
      await p.keyboard.press('Escape'); await p.waitForTimeout(350);
    }
    v(`${tag} · B4 aucune classe menu-ouvert collée après ces menus`, !(await f.evaluate(() => document.body.classList.contains('menu-ouvert'))), null);
    await f.evaluate(() => { try { fermerPop(false) } catch (e) {} });
    const rt = f.locator('[data-act="retour"]:visible'); if (await rt.count()) { await clic(c, f, '[data-act="retour"]:visible'); await p.waitForTimeout(800); }
    await fermerTout(c, f);
  }
  // ── C. le collage sur plusieurs lignes ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    const z = f.locator('#vv-delai'); await z.evaluate(e => e.scrollIntoView({ block: 'center' }));
    const lire = () => z.evaluate(e => ({ v: e.value, a: e.selectionStart, b: e.selectionEnd, page: VV.delai }));
    // C1. une partie sélectionnée est REMPLACÉE par le collage
    await z.fill('Un deux trois quatre'); await z.evaluate(e => { e.focus(); e.setSelectionRange(3, 13); }); await p.keyboard.insertText('X\nY'); await p.waitForTimeout(200);
    let r = await lire(); v(`${tag} · C1 sélection remplacée par un collage de deux lignes : « ${r.v} » (page : « ${r.page} »), curseur ${r.a}`, r.v === 'Un X Y quatre' && r.page === r.v && r.a === r.b && r.a === 'Un X Y'.length, r);
    // C2. collage en tête
    await z.fill('fin'); await z.evaluate(e => { e.focus(); e.setSelectionRange(0, 0); }); await p.keyboard.insertText('a\n\nb\n'); await p.waitForTimeout(200);
    r = await lire(); v(`${tag} · C2 collage en tête (blanc final) : « ${r.v} » curseur ${r.a}`, r.v === 'a b fin' && r.a === 'a b '.length && r.page === r.v, r);
    // C3. collage qui dépasse la longueur permise (300) : ni exception, ni champ plus long que la page
    await z.fill(''); await z.evaluate(e => e.focus()); await p.keyboard.insertText(('mot ' + 'x'.repeat(40) + '\n').repeat(10)); await p.waitForTimeout(250);
    r = await lire(); v(`${tag} · C3 collage de 10 lignes longues : le champ (${r.v.length} signes) et la page se tiennent, sans retour à la ligne`, r.v.length <= 300 && !/\n/.test(r.v) && r.page === r.v, { n: r.v.length, page: (r.page || '').length });
    // C4. collage d'un texte déjà sur une ligne : rien ne bouge (curseur compris)
    await z.fill('début fin'); await z.evaluate(e => { e.focus(); e.setSelectionRange(6, 6); }); await p.keyboard.insertText('milieu '); await p.waitForTimeout(200);
    r = await lire(); v(`${tag} · C4 collage d'une seule ligne : « ${r.v} », curseur ${r.a}`, r.v === 'début milieu fin' && r.a === 'début milieu '.length, r);
    // C5. annuler (Ctrl+Z) après un collage aplati : on regarde ce qui arrive (population : l'annulation a eu lieu)
    await z.fill('avant'); await z.evaluate(e => { e.focus(); e.setSelectionRange(5, 5); }); await p.keyboard.insertText(' l1\nl2'); await p.waitForTimeout(200);
    const apres = (await lire()).v; await p.keyboard.press('Control+z'); await p.waitForTimeout(250); const ann = await lire();
    console.log('  · ' + tag + ' · C5 Ctrl+Z après collage multiligne : « ' + apres + ' » → « ' + ann.v + ' » (page « ' + ann.page + ' »)');
    v(`${tag} · C5 le champ et la page restent d'accord après Ctrl+Z : « ${ann.v} »`, ann.v === ann.page, ann);
    // C5b. témoin : le même geste avec UNE seule ligne — si Ctrl+Z l'annule, c'est l'aplatissement qui prive de l'annulation (doute à soumettre, pas un défaut du lot)
    await z.fill('avant'); await z.evaluate(e => { e.focus(); e.setSelectionRange(5, 5); }); await p.keyboard.insertText(' l1 l2'); await p.waitForTimeout(200);
    const apres1 = (await lire()).v; await p.keyboard.press('Control+z'); await p.waitForTimeout(250); const ann1 = await lire();
    console.log('  · ' + tag + ' · C5b Ctrl+Z après collage d\'UNE ligne : « ' + apres1 + ' » → « ' + ann1.v + ' »  (témoin : l\'annulation native ' + (ann1.v !== apres1 ? 'marche' : 'ne marche pas ici non plus') + ')');
    // C6. un texte tapé à la main (touche Entrée) ne change pas ; Entrée ne coupe pas la phrase
    await z.fill('abc'); await z.evaluate(e => { e.focus(); e.setSelectionRange(3, 3); }); await p.keyboard.press('Enter'); await p.waitForTimeout(150); r = await lire();
    v(`${tag} · C6 Entrée dans « Délai » : rien n'est inséré (« ${r.v} »)`, r.v === 'abc' && r.page === 'abc', r);
    // C7. le brouillon rouvert garde la valeur d'une ligne
    await z.fill('Jour 1\nJour 2'); await p.waitForTimeout(300); const ls = await f.evaluate(() => JSON.stringify(S.ui || {}).length + ':' + (VV.delai || ''));
    v(`${tag} · C7 la valeur gardée par la page n'a pas de retour à la ligne : ${ls}`, !/\n/.test(ls), ls);
    await fermerTout(c, f);
  }
  // ── D. les initiales du logo ────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    await clic(c, f, '[data-vv="client"][data-id="vp"]'); await clic(c, f, '[data-vv="art-add"][data-id="EL-ALL"]'); await p.waitForTimeout(300);
    const grand = await f.locator('[data-vv="grand"]:visible').count();
    if (grand) {
      for (let k = 0; k < 3; k++) {
        await clic(c, f, '[data-vv="grand"]'); const r = await logoAuPixel(c, '.vv-grand .ent-logo svg', 600);
        v(`${tag} · D1 aperçu en grand, ouverture n° ${k + 1} (${r.w || '?'} px) : « CS 17 » au centre — ${JSON.stringify(r)}`, logoBon(r), r);
        if (k === 0) await L.capture(c, CAP + tag + '-logo-grand.png');
        // Ajuster ↔ 100 %
        for (const [z, nom] of [['ajuster', 'Ajuster'], ['1', '100 %'], ['ajuster', 'Ajuster (retour)']]) {
          const bt = f.locator(`.vv-grand [data-vv="zoom"][data-v="${z}"]`).first(); if (!(await bt.count())) { console.log('  · ' + tag + ' : pas de bouton ' + nom); continue; }
          await (c.doigt ? bt.tap({ timeout: 5000 }) : bt.click({ timeout: 5000 })); await p.waitForTimeout(500); const r2 = await logoAuPixel(c, '.vv-grand .ent-logo svg', 400);
          v(`${tag} · D2 « ${nom} » (${r2.w || '?'} px) : initiales au centre — ${JSON.stringify(r2)}`, logoBon(r2), r2);
        }
        await clic(c, f, '[data-vv="grand-x"]:visible'); await p.waitForTimeout(500);
      }
    } else {
      const r = await logoAuPixel(c, '.ent-logo svg', 400);
      v(`${tag} · D1 aperçu en deux colonnes (${r.w || '?'} px) : initiales au centre — ${JSON.stringify(r)}`, logoBon(r), r);
      await L.capture(c, CAP + tag + '-logo-bureau.png');
    }
    // D4. le carré de l'identité de l'entreprise (« Mon entreprise » dans l'atelier), s'il existe : l'aperçu du logo choisi
    const n = await f.evaluate(() => document.querySelectorAll('svg[role="img"] text').length);
    v(`${tag} · D4 population : des logos SVG à initiales sont peints (${n})`, n >= 1, n);
    const bonLogo = await f.evaluate(() => [...document.querySelectorAll('svg[role="img"]')].filter(s => s.querySelector('text')).map(s => { const t = s.querySelector('text'), b = t.getBoundingClientRect(), q = s.getBoundingClientRect(); return { txt: t.textContent, dx: Math.round((b.left + b.width / 2) - (q.left + q.width / 2)), w: Math.round(q.width) }; }));
    v(`${tag} · D4b chaque logo vu : le texte est centré dans son carré (écart ≤ 3 px) — ${JSON.stringify(bonLogo.slice(0, 4))}`, bonLogo.length >= 1 && bonLogo.every(o => Math.abs(o.dx) <= 3 || o.w < 8), bonLogo);
    await fermerTout(c, f);
  }
  // ── E. crochets des résumés de clauses ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'contrats'); const f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
    const r = await f.evaluate(() => {
      const bib = vvBib(); const s = vvResume('Le prestataire effectue {{frequence}} chez {{inconnu}} et {{entreprise}} paie.');
      const t = vvResume('Texte sans variable. Deuxième phrase.\nSeconde ligne {{prix}}');
      const long = vvResume('A'.repeat(104) + ' {{adresse}} fin');
      return { s, t, long, longLen: long.length, nb: bib.length, desc: bib.filter(x => /\[/.test(x.desc)).map(x => x.desc).slice(0, 3), trop: bib.filter(x => x.desc.length > 111).length };
    });
    v(`${tag} · E1 variable inconnue : « ${r.s} » (crochets, pas le nom brut ; « entreprise » reste « le prestataire »)`, /\[inconnu\]/.test(r.s) && /le prestataire paie/.test(r.s.replace('et le prestataire paie', 'le prestataire paie')), r.s);
    v(`${tag} · E2 un texte sans variable ne change pas, et ne garde que sa première ligne : « ${r.t} »`, r.t === 'Texte sans variable. Deuxième phrase.', r.t);
    v(`${tag} · E3 le résumé reste ≤ 110 signes même avec des crochets (${r.longLen}), aucun résumé de bibliothèque ne dépasse (${r.trop})`, r.longLen <= 110 && r.trop === 0, r);
    // la recherche trouve toujours par le mot du blanc
    await f.evaluate(() => { VV.bq = 'fréquence'; });
    const rech = await f.evaluate(() => { const f2 = document.querySelector('.vv-pl, body'); try { vvMajBib(document.body); } catch (e) {} return (document.getElementById('vv-bib') || {}).innerText || ''; });
    console.log('  · ' + tag + ' · E4 recherche « fréquence » : ' + rech.replace(/\s+/g, ' ').slice(0, 140));
    await f.evaluate(() => { VV.bq = ''; });
    await L.capture(c, CAP + tag + '-bibliotheque.png');
    await fermerTout(c, f);
  }
  v(tag + ' · aucune erreur JavaScript', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); process.exit(2); });
