// SONDE DURABLE — « restes » du compositeur, TOUR 2 (17 novembre 2026). Deux défauts laissés ouverts par le recontrôle du tour 1 :
//   E. Ctrl+Z après un collage sur plusieurs lignes dans « Délai » / « Paiement » : UN geste d'annulation rend le champ d'avant le collage (le champ et la page d'accord) ;
//      rétablir (Ctrl+Y) rend le texte aplati ; un collage d'une ligne et une frappe à la main se défont comme avant ; l'annulation d'un collage au milieu / sur une sélection rend le texte d'origine
//   F. « Brouillon supprimé » se VOIT : après « ⋯ › Supprimer ce brouillon › Supprimer » le cadre de l'atelier est rangé et la confirmation est dite dans la PAGE (#toast du prototype) ;
//      aucune confirmation quand on ferme sans supprimer, et le mot ne reste pas pour la fermeture d'après
// PROFIL=mac|windows|ipad|iphone|android|petit  NUIT=0|1  node compositeur-restes2.js — « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const pr = process.env.PROFIL || 'iphone', nuit = process.env.NUIT === '1', tag = 'rc2-' + pr + (nuit ? '-nuit' : '-jour');
const CAP = (process.env.CAP || A.CAP) + '';
const clic = async (c, f, s, opt) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000, ...opt }); else await l.click({ timeout: 5000, ...opt }); await c.p.waitForTimeout(170); };
const fermerTout = async (c, f) => { const p = c.p; await p.keyboard.press('Escape'); await p.waitForTimeout(450); if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); } };
const toastParent = p => p.evaluate(() => { const t = document.getElementById('toast'); if (!t) return { present: false }; const r = t.getBoundingClientRect(), cs = getComputedStyle(t); const z = document.getElementById('opdz'); return { present: true, on: t.classList.contains('on'), texte: t.textContent.trim(), vis: cs.visibility, op: +cs.opacity, bas: Math.round(r.bottom), haut: Math.round(r.top), H: innerHeight, atelierRange: !z || z.hidden }; });
(async () => {
  const c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p; console.log('── ' + tag);
  // ── E. annuler un collage multiligne ─────────────────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    for (const id of ['vv-delai', 'vv-paiement']) {
      const z = f.locator('#' + id); await z.evaluate(e => e.scrollIntoView({ block: 'center' }));
      const cle = id === 'vv-delai' ? 'delai' : 'paiement', lire = () => z.evaluate((e, k) => ({ v: e.value, a: e.selectionStart, page: VV[k] }), cle);
      const poser = async (txt, a, b) => { await z.fill(txt); await z.evaluate((e, [x, y]) => { e.focus(); e.setSelectionRange(x, y); }, [a, b == null ? a : b]); };
      // E1. collage à la fin : un Ctrl+Z rend « avant »
      await poser('avant', 5); await p.keyboard.insertText(' l1\nl2'); await p.waitForTimeout(200);
      let r = await lire(); v(`${tag} · ${id} E0 population : le collage a bien eu lieu et il est aplati (« ${r.v} »)`, r.v === 'avant l1 l2' && r.page === r.v, r);
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} E1 Ctrl+Z : UN geste rend « avant » (« ${r.v} »), la page est d'accord (« ${r.page} »)`, r.v === 'avant' && r.page === 'avant', r);
      await p.keyboard.press('Control+y'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} E2 Ctrl+Y rétablit le texte aplati (« ${r.v} »), jamais de retour à la ligne`, r.v === 'avant l1 l2' && r.page === r.v && !/\n/.test(r.v), r);
      // E3. collage au milieu, puis annulation : le curseur et le texte d'origine reviennent
      await poser('Un deux trois', 8); await p.keyboard.insertText('X\nY '); await p.waitForTimeout(200); r = await lire();
      v(`${tag} · ${id} E3a collage au milieu : « ${r.v} » curseur ${r.a}`, r.v === 'Un deux X Y trois' && r.a === 'Un deux X Y '.length && r.page === r.v, r);
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} E3b Ctrl+Z : « Un deux trois » revient (« ${r.v} »)`, r.v === 'Un deux trois' && r.page === r.v, r);
      // E4. une sélection remplacée par un collage de deux lignes : annulée, la sélection d'origine revient avec son texte
      await poser('Un deux trois quatre', 3, 13); await p.keyboard.insertText('X\nY'); await p.waitForTimeout(200); r = await lire();
      v(`${tag} · ${id} E4a sélection remplacée : « ${r.v} »`, r.v === 'Un X Y quatre' && r.page === r.v, r);
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} E4b Ctrl+Z : « Un deux trois quatre » revient (« ${r.v} »)`, r.v === 'Un deux trois quatre' && r.page === r.v, r);
      // E5. témoins : une ligne, et une frappe à la main, s'annulent comme avant
      await poser('avant', 5); await p.keyboard.insertText(' l1 l2'); await p.waitForTimeout(200); await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} E5a témoin : collage d'UNE ligne annulé (« ${r.v} »)`, r.v === 'avant' && r.page === r.v, r);
      await poser('abc', 3); await p.keyboard.type('def'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} E5b témoin : frappe à la main (« ${r.v} », page « ${r.page} »)`, r.v === 'abcdef' && r.page === r.v, r);
      // E6. deux collages de suite : deux Ctrl+Z, dans l'ordre
      await poser('a', 1); await p.keyboard.insertText(' b\nc'); await p.waitForTimeout(150); await p.keyboard.insertText(' d\ne'); await p.waitForTimeout(200); r = await lire();
      v(`${tag} · ${id} E6a deux collages : « ${r.v} »`, r.v === 'a b c d e' && r.page === r.v, r);
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire(); const un = r.v;
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} E6b deux Ctrl+Z défont les deux collages, dans l'ordre (« ${un} » puis « ${r.v} »)`, un === 'a b c' && r.v === 'a' && r.page === 'a', { un, r });
      // E7. longueur : un gros collage reste borné et sans retour à la ligne, et s'annule aussi
      await poser('', 0); await p.keyboard.insertText(('mot ' + 'x'.repeat(40) + '\n').repeat(10)); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} E7a gros collage : ${r.v.length} signes, sans retour à la ligne, page d'accord`, r.v.length > 50 && r.v.length <= 300 && !/\n/.test(r.v) && r.page === r.v, { n: r.v.length });
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} E7b Ctrl+Z rend le champ vide (« ${r.v.slice(0, 20)} »)`, r.v === '' && r.page === '', r);
    }
    // E9. filet de sécurité : un texte à plusieurs lignes qui entre SANS passer par l'insertion (navigateur sans « beforeinput », valeur posée par un module) est aplati à l'événement « input »
    for (const id of ['vv-delai', 'vv-paiement']) {
      const z = f.locator('#' + id), k = id === 'vv-delai' ? 'delai' : 'paiement';
      const r = await z.evaluate((e, k) => { e.focus(); e.value = 'a\n\nb c'; e.setSelectionRange(4, 4); e.dispatchEvent(new Event('input', { bubbles: true })); return { v: e.value, a: e.selectionStart, page: VV[k] }; }, k);
      v(`${tag} · ${id} E9 valeur à plusieurs lignes posée sans insertion : aplatie (« ${r.v} »), curseur ${r.a}, page d'accord`, r.v === 'a b c' && r.a === 3 && r.page === r.v, r);
    }
    // E8. un VRAI collage depuis le presse-papiers (Ctrl+V), quand le navigateur le permet
    try {
      await p.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await p.evaluate(() => navigator.clipboard.writeText('un\ndeux\ntrois')); const z = f.locator('#vv-delai');
      await z.fill('avant '); await z.evaluate(e => { e.focus(); e.setSelectionRange(e.value.length, e.value.length); }); await p.keyboard.press('Control+v'); await p.waitForTimeout(300);
      let r = await z.evaluate(e => ({ v: e.value, page: VV.delai }));
      v(`${tag} · E8a Ctrl+V d'un texte de trois lignes : « ${r.v} »`, r.v === 'avant un deux trois' && r.page === r.v, r);
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await z.evaluate(e => ({ v: e.value, page: VV.delai }));
      v(`${tag} · E8b Ctrl+Z après le vrai collage : « avant » revient (« ${r.v} »)`, r.v.trim() === 'avant' && r.page === r.v, r);
    } catch (e) { console.log('  · ' + tag + ' · E8 presse-papiers non disponible ici (' + String(e.message).slice(0, 80) + ') : non joué'); }
    await fermerTout(c, f);
  }
  // ── F. « Brouillon supprimé » se voit ────────────────────────────────────────────────────────────────────────────────────────────────
  {
    for (const faire of ['devis', 'contrat']) {
      await L.aller(p, faire === 'devis' ? 'devis' : 'contrats'); const f = await A.ouvrirAtelier(c, faire, null); await L.calme(p, 900);
      await clic(c, f, '[data-vv="client"][data-id="mi"]');
      if (faire === 'contrat') await clic(c, f, '[data-vv="tpl"][data-v="part"]'); else await clic(c, f, '[data-vv="art-add"][data-id="EL-ALL"]');
      await p.waitForTimeout(300); await clic(c, f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1800);
      const avant = await p.evaluate(() => { const t = document.getElementById('toast'); return t ? t.classList.contains('on') : false; });
      await clic(c, f, '#b-plus'); await p.waitForTimeout(350);
      await clic(c, f, '.menu button:has-text("Supprimer ce brouillon")'); await p.waitForTimeout(500);
      v(`${tag} · F1 (${faire}) population : la confirmation est là`, (await f.locator('.dialogue').count()) === 1, null);
      await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(1100);
      const t = await toastParent(p);
      v(`${tag} · F1 (${faire}) l'atelier est rangé et la PAGE dit « Brouillon supprimé » (${JSON.stringify(t)})`, t.present && t.on && /Brouillon supprimé/.test(t.texte) && t.atelierRange && t.vis !== 'hidden' && t.op > .5, t);
      v(`${tag} · F2 (${faire}) la bulle est dans l'écran (haut ${t.haut}, bas ${t.bas}, écran ${t.H}) et rien d'autre ne la couvre`, t.haut >= 0 && t.bas <= t.H, t);
      const cache = await p.evaluate(() => { const e = document.getElementById('toast'); const r = e.getBoundingClientRect(); e.style.pointerEvents = 'auto'; const x = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); e.style.pointerEvents = ''; return { ok: !!x && (e === x || e.contains(x)), sur: x ? x.tagName + '#' + x.id + '.' + String(x.className).slice(0, 30) : null }; });
      v(`${tag} · F2b (${faire}) rien ne couvre la bulle (${JSON.stringify(cache)})`, cache.ok, cache);
      await L.capture(c, CAP + tag + '-supprime-' + faire + '.png');
      await p.waitForTimeout(6300);
    }
    // F3. fermer SANS supprimer : pas de « Brouillon supprimé »
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="art-add"][data-id="EL-ALL"]'); await p.waitForTimeout(300); await clic(c, f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1800);
    await clic(c, f, '[data-act="retour"]:visible'); await p.waitForTimeout(1200); await fermerTout(c, f); await p.waitForTimeout(900);
    let t = await toastParent(p);
    v(`${tag} · F3 on referme sans supprimer : aucune confirmation de suppression (${JSON.stringify(t)})`, !t.present || !t.on || !/Brouillon supprimé/.test(t.texte), t);
    // F4. un brouillon supprimé, puis un AUTRE document rouvert et refermé normalement : le mot ne revient pas
    await p.waitForTimeout(6300);
    const f2 = await A.ouvrirAtelier(c, 'devis', 'devis'); await L.calme(p, 900);
    await clic(c, f2, '[data-vv="client"][data-id="vp"]'); await clic(c, f2, '[data-vv="art-add"][data-id="EL-ALL"]'); await p.waitForTimeout(300); await clic(c, f2, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1800);
    await clic(c, f2, '#b-plus'); await p.waitForTimeout(350); await clic(c, f2, '.menu button:has-text("Supprimer ce brouillon")'); await p.waitForTimeout(500); await clic(c, f2, '.dialogue button[data-r="1"]'); await p.waitForTimeout(1100);
    await p.waitForTimeout(6300);
    const f3 = await A.ouvrirAtelier(c, 'devis', 'devis'); await L.calme(p, 900);
    await clic(c, f3, '[data-vv="client"][data-id="mi"]'); await clic(c, f3, '[data-vv="art-add"][data-id="EL-ALL"]'); await p.waitForTimeout(300); await clic(c, f3, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1800);
    await clic(c, f3, '[data-act="retour"]:visible'); await p.waitForTimeout(1200); await fermerTout(c, f3); await p.waitForTimeout(900);
    t = await toastParent(p);
    v(`${tag} · F4 une fermeture normale après une suppression ne redit pas « Brouillon supprimé » (${JSON.stringify(t)})`, !t.present || !t.on || !/Brouillon supprimé/.test(t.texte), t);
  }
  v(tag + ' · aucune erreur JavaScript', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); process.exit(2); });
