// SONDE DURABLE — RECONTRÔLE ADVERSE des « restes » du compositeur, tour 2 (17 novembre 2026). Elle cherche ce que les deux corrections du tour 2 ont CASSÉ À CÔTÉ :
//   G. le collage aplati AVANT d'entrer (écouteur « beforeinput » de la fenêtre de l'atelier) : fins de ligne Windows, glisser-déposer, Entrée d'un clavier virtuel (insertParagraph),
//      champ presque plein (maxlength 300), frappe après un collage (une annulation = la frappe seule), focus et curseur gardés — et SURTOUT les champs voisins qui doivent garder leurs retours à la ligne
//      (zone « Texte » d'un article, note, champ d'une ligne) ainsi que les zones d'UNE ligne (objet, recherche) qui n'en reçoivent jamais
//   H. « Brouillon supprimé » dit dans la page : brouillon rouvert DEPUIS LA LISTE, depuis la fiche du client, deux suppressions rapprochées (la bulle se REDIT), la liste de la page est à jour,
//      le focus revient hors du cadre rangé, la bulle est une zone « status » lue à voix haute, elle s'éteint seule, un autre rôle (julie) ; et la fermeture « role » / « absent » garde son mot
// PROFIL=mac|windows|ipad|iphone|android|petit  NUIT=0|1  node compositeur-restes2-recontrole.js — « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const pr = process.env.PROFIL || 'iphone', nuit = process.env.NUIT === '1', tag = 'rr2-' + pr + (nuit ? '-nuit' : '-jour'), QUI = process.env.QUI || 'marc';
const CAP = (process.env.CAP || A.CAP) + '';
const clic = async (c, f, s, opt) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000, ...opt }); else await l.click({ timeout: 5000, ...opt }); await c.p.waitForTimeout(170); };
const fermerTout = async (c, f) => { const p = c.p; await p.keyboard.press('Escape'); await p.waitForTimeout(450); if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); } };
const toastParent = p => p.evaluate(() => { const t = document.getElementById('toast'); if (!t) return { present: false }; const r = t.getBoundingClientRect(), cs = getComputedStyle(t); const z = document.getElementById('opdz'); return { present: true, on: t.classList.contains('on'), texte: t.textContent.trim(), role: t.getAttribute('role'), vis: cs.visibility, op: +cs.opacity, bas: Math.round(r.bottom), haut: Math.round(r.top), H: innerHeight, atelierRange: !z || z.hidden }; });
const creerDevis = async (c, f, cli) => { await clic(c, f, `[data-vv="client"][data-id="${cli}"]`); await clic(c, f, '[data-vv="art-add"][data-id="EL-ALL"]'); await c.p.waitForTimeout(300); await clic(c, f, '[data-act="vierge-creer"]:visible'); await c.p.waitForTimeout(1800); };
const supprimerBrouillon = async (c, f) => { await clic(c, f, '#b-plus'); await c.p.waitForTimeout(350); await clic(c, f, '.menu button:has-text("Supprimer ce brouillon")'); await c.p.waitForTimeout(500); await clic(c, f, '.dialogue button[data-r="1"]'); await c.p.waitForTimeout(1100); };
(async () => {
  const c = await L.ouvrir({ profil: pr, nuit, qui: QUI }), p = c.p; console.log('── ' + tag + ' (' + QUI + ')');
  // ── G. le collage aplati : ce qui bouge à côté ──────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    if (!f) { v(tag + ' · population : l\'atelier s\'ouvre', false, null); await L.fin(c); await L.fermer(); process.exit(1); }
    for (const id of ['vv-delai', 'vv-paiement']) {
      const z = f.locator('#' + id); await z.evaluate(e => e.scrollIntoView({ block: 'center' }));
      const cle = id === 'vv-delai' ? 'delai' : 'paiement', lire = () => z.evaluate((e, k) => ({ v: e.value, a: e.selectionStart, page: VV[k], actif: document.activeElement === e }), cle);
      const poser = async (txt, a, b) => { await z.fill(txt); await z.evaluate((e, [x, y]) => { e.focus(); e.setSelectionRange(x, y); }, [a, b == null ? a : b]); };
      const brut = async (txt, type) => z.evaluate((e, [t, ty]) => { const dt = new DataTransfer(); dt.setData('text/plain', t); const ev = new InputEvent('beforeinput', { inputType: ty, data: ty === 'insertText' ? t : null, dataTransfer: ty === 'insertText' ? null : dt, cancelable: true, bubbles: true }); const ok = e.dispatchEvent(ev); return { ok, annule: ev.defaultPrevented }; }, [txt, type]);
      // G1. fins de ligne Windows (\r\n) et lignes vides : aucune séquence de retours à la ligne ne survit, jamais deux espaces collés
      await poser('avant', 5); await p.keyboard.insertText(' l1\r\n\r\n  l2\r\nl3'); await p.waitForTimeout(200); let r = await lire();
      v(`${tag} · ${id} G1 \\r\\n et lignes vides aplatis en UN espace (« ${r.v} »), page d'accord`, r.v === 'avant l1 l2 l3' && r.page === r.v && !/[\r\n]/.test(r.v), r);
      // G2. frappe APRÈS un collage : le focus et le curseur sont restés, une annulation n'enlève que la frappe
      v(`${tag} · ${id} G2a le champ garde le focus et le curseur est à la fin du collage (curseur ${r.a} sur ${r.v.length})`, r.actif && r.a === r.v.length, r);
      await p.keyboard.type('Z'); await p.waitForTimeout(150); r = await lire();
      v(`${tag} · ${id} G2b la frappe suit le collage (« ${r.v} »)`, r.v === 'avant l1 l2 l3Z' && r.page === r.v, r);
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} G2c Ctrl+Z n'enlève que la frappe (« ${r.v} »)`, r.v === 'avant l1 l2 l3' && r.page === r.v, r);
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} G2d un second Ctrl+Z défait le collage (« ${r.v} »)`, r.v === 'avant' && r.page === r.v, r);
      // G3. champ presque plein : le collage est borné à 300, jamais un retour à la ligne, annulation propre
      const base = 'x'.repeat(290); await poser(base, 290); await p.keyboard.insertText(' l1\nl2\nl3 yyyyyyyyyyyy'); await p.waitForTimeout(200); r = await lire();
      v(`${tag} · ${id} G3a champ à 290 signes + collage de 4 lignes : ${r.v.length} signes (≤ 300), sans retour à la ligne, page d'accord`, r.v.length <= 300 && r.v.length > 290 && !/\n/.test(r.v) && r.page === r.v, { n: r.v.length });
      await p.keyboard.press('Control+z'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} G3b Ctrl+Z rend les 290 signes d'origine (${r.v.length})`, r.v === base && r.page === base, { n: r.v.length });
      // G4. champ PLEIN (300) : un collage multiligne ne change rien et ne casse rien
      const plein = 'p'.repeat(300); await poser(plein, 300); await p.keyboard.insertText('a\nb'); await p.waitForTimeout(200); r = await lire();
      v(`${tag} · ${id} G4 champ plein : le collage ne change rien (${r.v.length} signes), page d'accord`, r.v === plein && r.page === plein, { n: r.v.length });
      // G5. glisser-déposer (insertFromDrop) d'un texte de deux lignes, au milieu
      await poser('Un trois', 3); const d = await brut('deux\nET ', 'insertFromDrop'); await p.waitForTimeout(250); r = await lire();
      v(`${tag} · ${id} G5 glisser-déposer : « ${r.v} » (événement annulé ${d.annule})`, d.annule && r.v === 'Un deux ET trois' && r.page === r.v, { r, d });
      // G6. Entrée d'un clavier virtuel : insertParagraph / insertLineBreak n'ajoutent pas de ligne (le clavier du téléphone ne passe pas toujours par keydown)
      for (const cmd of ['insertParagraph', 'insertLineBreak']) {
        await poser('abc', 3); await z.evaluate((e, k) => { e.focus(); document.execCommand(k); }, cmd); await p.waitForTimeout(250); r = await lire();
        v(`${tag} · ${id} G6 ${cmd} : aucun retour à la ligne dans le champ (« ${JSON.stringify(r.v)} »), page d'accord`, !/\n/.test(r.v) && r.page === r.v, r);
      }
      // G7. la touche Entrée au clavier
      await poser('abc', 3); await p.keyboard.press('Enter'); await p.waitForTimeout(200); r = await lire();
      v(`${tag} · ${id} G7 Entrée n'ajoute rien (« ${r.v} »)`, r.v === 'abc' && r.page === r.v, r);
      // G8. une saisie d'une ligne par la méthode de saisie (composition) n'est pas touchée : on n'intercepte pas
      const comp = await z.evaluate(e => { e.focus(); const ev = new InputEvent('beforeinput', { inputType: 'insertText', data: 'a\nb', isComposing: true, cancelable: true, bubbles: true }); e.dispatchEvent(ev); return ev.defaultPrevented; });
      v(`${tag} · ${id} G8 une composition (IME) n'est pas interceptée`, comp === false, { comp });
      // G9. un collage d'UNE ligne n'est pas intercepté non plus (rien à aplatir)
      const une = await brut('simple', 'insertFromPaste');
      v(`${tag} · ${id} G9 un collage d'une seule ligne n'est pas annulé (laisse le navigateur faire)`, une.annule === false, une);
    }
    // G11. les zones d'UNE ligne (recherche du catalogue) n'en reçoivent jamais
    {
      for (const id of ['vv-cq']) {
        const z = f.locator('#' + id); if (!(await z.count())) { console.log('  · ' + tag + ' · G11 ' + id + ' absent (non joué)'); continue; }
        await z.evaluate(e => { e.scrollIntoView({ block: 'center' }); e.focus(); e.value = ''; }); await p.keyboard.insertText('un\ndeux'); await p.waitForTimeout(200);
        const t = await z.evaluate(e => e.value);
        v(`${tag} · G11 ${id} (champ d'une ligne) : aucun retour à la ligne (« ${JSON.stringify(t)} »)`, !/\n/.test(t) && /un\s?deux/.test(t), { t });
      }
    }
    await fermerTout(c, f);
  }
  // ── G10. le champ « Texte » d'un article de CONTRAT (plusieurs lignes permises) garde ses retours à la ligne ; les champs de « Délai / Paiement » n'existent pas dans le contrat ou y sont aplatis aussi ─────────
  {
    await L.aller(p, 'contrats'); const f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
    if (f) {
      await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(300);
      const zt = f.locator('#vv-e-texte'); await clic(c, f, '[data-vv="ecrire-ouvrir"]'); await p.waitForTimeout(400);
      const pop = await zt.count();
      v(`${tag} · G10 population : la zone « Texte » de l'article est là (${pop})`, pop === 1, null);
      if (pop) {
        await zt.evaluate(e => { e.scrollIntoView({ block: 'center' }); e.focus(); e.value = ''; });
        await p.keyboard.insertText('ligne un\nligne deux\nligne trois'); await p.waitForTimeout(200);
        const t = await zt.evaluate(e => e.value);
        v(`${tag} · G10a la zone « Texte » garde ses retours à la ligne (${JSON.stringify(t)})`, t === 'ligne un\nligne deux\nligne trois', { t });
        await p.keyboard.press('Control+z'); await p.waitForTimeout(200);
        v(`${tag} · G10b Ctrl+Z y défait le collage multiligne`, (await zt.evaluate(e => e.value)) === '', null);
        const dl = await f.locator('#vv-delai, #vv-paiement').count();
        console.log('  · ' + tag + ' · le contrat porte ' + dl + ' champ(s) Délai / Paiement');
      }
      await fermerTout(c, f);
    } else v(tag + ' · G10 population : l\'atelier de contrat s\'ouvre', false, null);
  }
  // ── H. « Brouillon supprimé » dit dans la page : les autres chemins ──────────────────────────────────────────────────────────────────
  {
    // H1. un brouillon rouvert DEPUIS LA LISTE de la page, puis supprimé
    await L.aller(p, 'devis'); let f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    await creerDevis(c, f, 'mi'); await clic(c, f, '[data-act="retour"]:visible'); await p.waitForTimeout(1200); await fermerTout(c, f); await p.waitForTimeout(900);
    const nb0 = await p.evaluate(() => document.querySelectorAll('#contenu [data-opd="doc"]').length);
    await L.aller(p, 'devis'); await p.evaluate(() => { const b = document.querySelector('.seg [data-dvf="aenvoyer"]'); if (b) b.click(); }); await p.waitForTimeout(400);
    const ligne = await p.evaluate(() => { const e = document.querySelector('#contenu [data-opd="doc"]'); return e ? { id: e.dataset.id, t: e.innerText.replace(/\s+/g, ' ').slice(0, 80) } : null; });
    v(`${tag} · H1 population : un brouillon est dans la liste de la page (${nb0} lignes ; ${JSON.stringify(ligne)})`, !!ligne, ligne);
    if (ligne) {
      const ok = await L.toucher(c, `#contenu [data-opd="doc"][data-id="${ligne.id}"]`); f = await A.attendreAtelier(c); await L.calme(p, 700);
      v(`${tag} · H1a le brouillon se rouvre depuis la liste`, ok && !!f, null);
      if (f) {
        await supprimerBrouillon(c, f);
        const t = await toastParent(p), rest = await p.evaluate(id => ({ ligne: !!document.querySelector('#contenu [data-opd="doc"][data-id="' + id + '"]'), foc: document.activeElement ? document.activeElement.tagName + '#' + document.activeElement.id : '', dansCadre: !!(document.activeElement && document.activeElement.closest && document.activeElement.closest('#opdz')) }), ligne.id);
        v(`${tag} · H1b la page dit « Brouillon supprimé » (${JSON.stringify(t)})`, t.present && t.on && /Brouillon supprimé/.test(t.texte) && t.atelierRange && t.vis !== 'hidden', t);
        v(`${tag} · H1c la ligne a quitté la liste de la page ET le focus n'est pas resté dans le cadre rangé (${JSON.stringify(rest)})`, !rest.ligne && !rest.dansCadre, rest);
        v(`${tag} · H1d la bulle est une zone « status » lue à voix haute (role ${t.role})`, t.role === 'status', t);
        await L.capture(c, CAP + tag + '-h1-liste.png');
        await p.waitForTimeout(7500); const t2 = await toastParent(p);
        v(`${tag} · H1e la bulle s'éteint seule en moins de 8 s (${JSON.stringify(t2)})`, !t2.present || !t2.on, t2);
      }
    }
    // H2. deux suppressions rapprochées : la bulle se REDIT pour la seconde (elle n'est pas restée « allumée » de la première)
    await L.aller(p, 'devis'); f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 800); await creerDevis(c, f, 'mi'); await supprimerBrouillon(c, f);
    const a = await toastParent(p); await p.waitForTimeout(1200);
    await L.aller(p, 'devis'); f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 800); await creerDevis(c, f, 'vp'); await supprimerBrouillon(c, f);
    const b = await toastParent(p);
    v(`${tag} · H2 deux suppressions à moins de 10 s : la bulle est allumée aux DEUX (${a.on}, ${b.on}) et dit « Brouillon supprimé »`, a.on && b.on && /Brouillon supprimé/.test(b.texte) && b.atelierRange, { a, b });
    await p.waitForTimeout(7500);
    // H3. depuis la fiche du client (le contrat composé depuis « Clients »)
    await L.aller(p, 'client-x-mi'); const g = await A.ouvrirAtelier(c, 'contrat', null, '#contenu [data-opd="contrat"][data-cli="mi"]');
    v(`${tag} · H3 population : l'atelier s'ouvre depuis la fiche du client`, !!g, null);
    if (g) {
      await clic(c, g, '[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(300); await clic(c, g, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1800); await supprimerBrouillon(c, g);
      const t = await toastParent(p), ou = await p.evaluate(() => ({ h: location.hash, titre: (document.querySelector('#contenu h1') || {}).textContent, foc: document.activeElement ? document.activeElement.tagName : '' }));
      v(`${tag} · H3a fiche du client : « Brouillon supprimé » dit (${JSON.stringify(t)}), on reste sur la fiche (${JSON.stringify(ou)})`, t.present && t.on && /Brouillon supprimé/.test(t.texte) && t.atelierRange && /client/i.test(ou.h + ' ' + ou.titre), { t, ou });
      await L.capture(c, CAP + tag + '-h3-fiche.png'); await p.waitForTimeout(7000);
    }
    // H4. les AUTRES motifs de fermeture gardent leur mot (la liste fermée n'a pas avalé « role » / « absent »)
    const mots = await p.evaluate(async () => {
      const sortie = {}; for (const m of ['role', 'absent', 'supprime', 'fin', 'nimporte', 'constructor', 'toString']) {
        const t0 = document.getElementById('toast'); if (t0) t0.classList.remove('on');
        const z = document.getElementById('opdz'); if (!z) { sortie[m] = 'pas de cadre'; continue; }
        z.hidden = false; opdFermer(m); const t = document.getElementById('toast'); sortie[m] = t && t.classList.contains('on') ? t.textContent.trim() : '';
        await new Promise(r => setTimeout(r, 50));
      } return sortie; });
    v(`${tag} · H4 les mots de fermeture : role et absent gardent le leur, « supprime » dit le sien, « fin » et tout motif étranger ne disent rien (${JSON.stringify(mots)})`,
      /rôle/.test(mots.role) && /pas pu/.test(mots.absent) && /Brouillon supprimé/.test(mots.supprime) && !mots.fin && !mots.nimporte && !mots.constructor && !mots.toString, mots);
    await p.waitForTimeout(500);
  }
  v(tag + ' · aucune erreur JavaScript', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ERREUR SONDE', e.message.slice(0, 900)); process.exit(2); });
