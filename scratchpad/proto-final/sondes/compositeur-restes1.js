// SONDE DURABLE du compositeur — « restes » du recontrôle, tour 1 (17 novembre 2026). Chaque contrôle garde un défaut rapporté par le recontrôle adverse :
//   1. « ⋯ » après la création d'un contrat (petit téléphone) : la feuille « Contrat » ne couvre plus « Supprimer ce brouillon » ; un menu ouvert ne porte pas d'infobulle par-dessus
//   2. un collage sur plusieurs lignes dans « Délai » et « Paiement » : le CHAMP montre ce que la page garde (une ligne)
//   3. la bibliothèque de clauses : un blanc du modèle se lit comme un blanc (« [fréquence des visites] »), jamais comme un mot de la phrase
// PROFIL=mac|windows|ipad|iphone|android|petit  NUIT=0|1  node compositeur-restes1.js — rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const pr = process.env.PROFIL || 'iphone', nuit = process.env.NUIT === '1', tag = 'crest1-' + pr + (nuit ? '-nuit' : '-jour');
const CAP = (process.env.CAP || A.CAP) + '';
const clic = async (c, f, s, opt) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 5000, ...opt }); else await l.click({ timeout: 5000, ...opt }); await c.p.waitForTimeout(170); };
(async () => {
  const c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p; console.log('── ' + tag);
  // ── 1. le menu « ⋯ » d'un contrat tout juste créé ────────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'contrats'); const f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
    await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="tpl"][data-v="part"]'); await p.waitForTimeout(300);
    await clic(c, f, '[data-act="vierge-creer"]:visible'); await p.waitForTimeout(1800);
    const tel = await f.evaluate(() => S.tactile);
    const feuille0 = await f.evaluate(() => !!(FEN && FEN.format));
    if (tel) v(`${tag} · le contrat créé ouvre sa feuille « Contrat » au téléphone (population : la feuille est là avant le menu)`, feuille0, feuille0);
    const plus = f.locator('#b-plus');
    v(`${tag} · le menu « ⋯ » est là`, await plus.isVisible(), null);
    await clic(c, f, '#b-plus'); await p.waitForTimeout(400);
    const e = await f.evaluate(() => {
      const b = [...document.querySelectorAll('.menu button')].find(x => /Supprimer ce brouillon/.test(x.textContent)); if (!b) return { menu: false };
      const r = b.getBoundingClientRect(), pile = document.elementsFromPoint(r.left + r.width / 2, r.top + r.height / 2).slice(0, 3).map(x => x.tagName + '.' + String(x.className).slice(0, 24));
      const t = document.getElementById('toasts');
      return { menu: true, bas: Math.round(r.bottom), H: innerHeight, atteignable: b.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)), pile, feuille: !!(FEN && FEN.format), nb: document.querySelectorAll('.menu button').length,
        toastsVisibles: t ? getComputedStyle(t).visibility !== 'hidden' && t.children.length > 0 : false, nToasts: t ? t.children.length : 0, classe: document.body.classList.contains('menu-ouvert') };
    });
    v(`${tag} · « Supprimer ce brouillon » est atteignable au doigt (rien ne le couvre) : ${JSON.stringify(e.pile)}`, e.menu && e.atteignable, e);
    v(`${tag} · la feuille « Contrat » est rangée pendant que le menu est ouvert`, e.menu && !e.feuille, e);
    if (tel) v(`${tag} · au téléphone, les infobulles ne se posent pas par-dessus le menu (${e.nToasts} en attente, masquées)`, !e.toastsVisibles, e);
    await L.capture(c, CAP + tag + '-menu-contrat.png');
    await p.keyboard.press('Escape'); await p.waitForTimeout(450);
    const ap = await f.evaluate(() => ({ menu: !!document.querySelector('.menu'), classe: document.body.classList.contains('menu-ouvert'), vis: getComputedStyle(document.getElementById('toasts')).visibility }));
    v(`${tag} · le menu fermé, la classe tombe et les infobulles reviennent possibles`, !ap.menu && !ap.classe && ap.vis !== 'hidden', ap);
    // une seconde ouverture ferme comme avant (le même bouton ouvre et ferme)
    await clic(c, f, '#b-plus'); await p.waitForTimeout(300); await clic(c, f, '#b-plus'); await p.waitForTimeout(300);
    v(`${tag} · retoucher « ⋯ » referme le menu`, !(await f.evaluate(() => !!document.querySelector('.menu'))), null);
    await clic(c, f, '[data-act="retour"]:visible'); await p.waitForTimeout(900);
    if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); }
  }
  // ── 2. un collage sur plusieurs lignes ──────────────────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 900);
    for (const [id, cle] of [['vv-delai', 'delai'], ['vv-paiement', 'paiement']]) {
      const z = f.locator('#' + id); await z.evaluate(e => e.scrollIntoView({ block: 'center' }));
      // « fill » pose le texte d'un coup, retours à la ligne compris, et déclenche « input » : c'est ce que fait un collage
      await z.fill('Ligne 1\nLigne 2\r\n\r\n   Ligne 3'); await p.waitForTimeout(250);
      const e = await f.evaluate(([i, k]) => ({ champ: document.getElementById(i).value, page: VV[k] }), [id, cle]);
      v(`${tag} · collage sur plusieurs lignes dans « ${cle} » : le champ montre « ${e.champ} » (comme la page)`, e.champ === 'Ligne 1 Ligne 2 Ligne 3' && e.page === e.champ, e);
      // le curseur : taper après le collage s'ajoute à la fin, pas au début
      await z.pressSequentially('!', { delay: 20 }); await p.waitForTimeout(150);
      v(`${tag} · le curseur est resté à la fin : la frappe suivante s'y ajoute`, (await z.inputValue()) === 'Ligne 1 Ligne 2 Ligne 3!', await z.inputValue());
      // un collage au MILIEU d'un texte déjà là
      await z.fill('Début fin'); await z.evaluate(e => { e.focus(); e.setSelectionRange(6, 6); }); await p.keyboard.insertText('un\ndeux '); await p.waitForTimeout(200);
      const m = await z.evaluate(e => ({ v: e.value, c: e.selectionStart }));
      v(`${tag} · collé au milieu : « ${m.v} », curseur juste après le collage (${m.c})`, m.v === 'Début un deux fin' && m.c === 'Début un deux '.length, m);
    }
    await L.capture(c, CAP + tag + '-conditions.png');
    await p.keyboard.press('Escape'); await p.waitForTimeout(500); if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); }
  }
  // ── 3. la bibliothèque de clauses ────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    await L.aller(p, 'contrats'); const f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
    const r = await f.evaluate(() => {
      const long = ['adresse du site', 'fréquence des visites', 'prix annuel', 'mode de paiement', 'date de début'];
      const d = vvBib().map(x => x.desc), nus = [];
      d.forEach(t => long.forEach(n => { if (new RegExp('(^|[^\\[])' + n + '([^\\]]|$)').test(t)) nus.push(n + ' dans « ' + t + ' »'); }));
      return { n: d.length, entre: d.filter(t => /\[[^\]]+\]/.test(t)).length, nus, accolades: d.filter(t => /\{\{/.test(t)), ex: d.find(t => /\[fréquence des visites\]/.test(t)) || null };
    });
    v(`${tag} · la bibliothèque compte ${r.n} résumés (population)`, r.n >= 10, r.n);
    v(`${tag} · aucun résumé ne laisse un blanc nu (« …effectue fréquence des visites ») : ${JSON.stringify(r.nus)}`, r.nus.length === 0, r.nus);
    v(`${tag} · aucune accolade {{…}} brute dans un résumé`, r.accolades.length === 0, r.accolades);
    v(`${tag} · des résumés portent un blanc entre crochets (${r.entre}) — exemple : ${r.ex}`, r.entre >= 1 && !!r.ex, r);
    // à l'écran : la liste de la bibliothèque montre ces résumés
    const txt = await f.evaluate(() => { const c = document.getElementById('vv-bib'); return c ? c.innerText.replace(/\s+/g, ' ') : null; });
    v(`${tag} · la liste affichée (zone « Bibliothèque ») montre les crochets (population : ${txt ? txt.length : 0} signes)`, !!txt && /\[[^\]]+\]/.test(txt), txt && txt.slice(0, 200));
    await p.keyboard.press('Escape'); await p.waitForTimeout(500); if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); }
  }
  v(tag + ' · aucune erreur JavaScript', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ERREUR SONDE', e.message.slice(0, 700)); process.exit(2); });
