// SONDE DURABLE du compositeur (lot « compositeur », étape 3 « corriger ») — la MISE EN PAGE.
//   tout-01 au téléphone l'aperçu s'ouvre lisible (texte ≥ 11 px), « Ajuster » montre la page entière, un réglage choisi n'est jamais remplacé
//   tout-02 la rangée de gestes d'un article (Modifier le texte, ↑, ↓, ✕) reste dans la colonne à 320 px · tout-03 la tablette qu'on tourne avec l'aperçu ouvert garde une page à l'échelle
//   tout-04 aucun texte d'aide n'est coupé net au bord de son champ
// PROFIL=mac|ipad|iphone|android|petit  NUIT=0|1  node compositeur-mise-en-page.js — rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const A = require('./atelier-outils.js'), L = A.L, v = L.v;
const pr = process.env.PROFIL || 'iphone', nuit = process.env.NUIT === '1', tag = 'cmep-' + pr + (nuit ? '-nuit' : '-jour'), CAP = (process.env.CAP || A.CAP) + '';
const clic = async (c, f, s) => { const l = f.locator(s).first(); if (c.doigt) await l.tap({ timeout: 6000 }); else await l.click({ timeout: 6000 }); await c.p.waitForTimeout(170); };
const ouvrirEtapes = (f, L2) => f.evaluate(ks => ks.forEach(k => { const b = document.querySelector('[data-vv="etape"][data-e="' + k + '"]'); if (b && b.getAttribute('aria-expanded') === 'false') b.click(); }), L2);
// la page du document visible : sa largeur, l'échelle et la taille de texte RÉELLEMENT rendue (médiane pondérée par la longueur)
const page = f => f.evaluate(() => { const vis = e => e && e.getBoundingClientRect().width > 0 && e.offsetParent !== null;
  const fe = [...document.querySelectorAll('.vv-grand-plein .feuille, .vv-ap-sc .feuille')].find(vis); if (!fe) return null;
  const ech = fe.getBoundingClientRect().width / 794, pts = [...fe.querySelectorAll('*')].filter(e => !e.children.length && e.textContent.trim().length > 2 && e.getBoundingClientRect().width > 0).map(e => [parseFloat(getComputedStyle(e).fontSize) * ech, e.textContent.trim().length]).sort((a, b) => a[0] - b[0]);
  const tot = pts.reduce((s, x) => s + x[1], 0); let acc = 0, fs = 0; for (const x of pts) { acc += x[1]; if (acc >= tot / 2) { fs = x[0]; break; } }
  const z = fe.closest('.vv-grand-c, .vv-ap-sc'), zv = z && getComputedStyle(z).getPropertyValue('--vs').trim();
  const zoomBtn = [...document.querySelectorAll('[data-vv="zoom"]')].filter(vis).map(b => b.textContent.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : ''));
  return { w: Math.round(fe.getBoundingClientRect().width), ech: +ech.toFixed(3), fs: +fs.toFixed(1), vs: zv, zoom: zoomBtn, W: innerWidth, n: pts.length }; });
// un texte d'aide (placeholder) qui ne tient pas dans son champ : input = largeur du texte contre la place ; textarea = le texte posé en valeur tient sans défiler
const aides = f => f.evaluate(() => { const vis = e => e.getBoundingClientRect().width > 0 && e.offsetParent !== null, cv = document.createElement('canvas').getContext('2d'), coupes = []; let n = 0;
  for (const e of document.querySelectorAll('.vv-form input[placeholder], .vv-form textarea[placeholder]')) { if (!vis(e) || e.value) continue; n++; const cs = getComputedStyle(e), pl = e.getAttribute('placeholder');
    if (e.tagName === 'TEXTAREA') { e.value = pl; const trop = e.scrollHeight > e.clientHeight + 1; e.value = ''; if (trop) coupes.push((e.id || e.name) + ' (textarea) « ' + pl.slice(0, 40) + ' »'); }
    else { cv.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; const dispo = e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight), w = cv.measureText(pl).width; if (w > dispo + 0.5) coupes.push((e.id || e.name) + ' « ' + pl.slice(0, 40) + ' » ' + Math.round(w) + ' > ' + Math.round(dispo)); } }
  return { n, coupes }; });
// Depuis la typographie française (ccc43ce2, caf59f09), l'étiquette dit « 100\u00a0% » : espace insécable avant « % ». On compare le TEXTE lu, espaces insécables ramenés à une espace.
const sp = t => String(t).replace(/[\u00a0\u202f]/g, ' ');
(async () => {
  const c = await L.ouvrir({ profil: pr, nuit, qui: 'marc' }), p = c.p, W = c.largeur, une = W < 1032; console.log('── ' + tag + (une ? ' (une colonne)' : ' (deux colonnes)'));
  const devis = async () => { await L.aller(p, 'devis'); const f = await A.ouvrirAtelier(c, 'devis', null); await L.calme(p, 1000);
    await clic(c, f, '[data-vv="client"][data-id="vp"]'); await f.locator('#vv-objet').fill('Remplacement du ventilateur extérieur'); for (const r of ['VE-DK-35', 'EL-ALL', 'MO-H']) if (await f.locator(`[data-vv="art-add"][data-id="${r}"]`).count()) await clic(c, f, `[data-vv="art-add"][data-id="${r}"]`); await L.calme(p, 600); return f; };
  const quitter = async f => { await p.keyboard.press('Escape'); await p.waitForTimeout(500); if (await f.locator('.dialogue').count()) { await clic(c, f, '.dialogue button[data-r="1"]'); await p.waitForTimeout(900); } };
  // ── tout-04 : textes d'aide — devis (étape Conditions) puis contrat (étape Articles) ────────────────────────────────────────────────────
  let f = await devis(); await ouvrirEtapes(f, ['client', 'objet', 'matos', 'cond']); await L.calme(p, 500);
  let a = await aides(f); v(`${tag} · devis : aucun texte d'aide coupé au bord de son champ (population : ${a.n} champs à aide)`, a.n >= 3 && a.coupes.length === 0, a);
  v(`${tag} · devis : « Délai » et « Paiement » montrent leur phrase en entier (2 lignes de texte)`, await f.evaluate(() => ['vv-delai', 'vv-paiement'].every(i => { const e = document.getElementById(i); return e && e.tagName === 'TEXTAREA' && e.getBoundingClientRect().height >= 40; })), null);
  // une saisie reste sur UNE ligne : Entrée ne coupe pas la phrase, un collage à lignes multiples est aplati
  await f.locator('#vv-paiement').fill('Premier mot'); await f.locator('#vv-paiement').press('Enter'); await f.locator('#vv-paiement').pressSequentially('suite', { delay: 10 }); await p.waitForTimeout(250);
  v(`${tag} · Entrée dans « Paiement » n'ajoute pas de ligne ("${await f.locator('#vv-paiement').inputValue()}")`, !/\n/.test(await f.locator('#vv-paiement').inputValue()), null);
  await f.locator('#vv-paiement').fill('Ligne 1\nLigne 2'); await p.waitForTimeout(500);
  v(`${tag} · un texte collé sur deux lignes sort sur une seule dans la page`, await f.evaluate(() => !/Ligne 1\s*\n\s*Ligne 2/.test(VV.paiement) && /Ligne 1 Ligne 2/.test(VV.paiement)), await f.evaluate(() => VV.paiement));
  await L.capture(c, CAP + tag + '-conditions.png'); await quitter(f);
  await L.aller(p, 'contrats'); f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900);
  await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="tpl"][data-v="pro"]'); await p.waitForTimeout(400); await ouvrirEtapes(f, ['client', 'infos', 'arts']); await L.calme(p, 500);
  a = await aides(f); v(`${tag} · contrat : aucun texte d'aide coupé au bord de son champ (population : ${a.n} champs à aide)`, a.n >= 1 && a.coupes.length === 0, a);
  // ── tout-02 : la rangée de gestes d'un article tient dans la colonne (population : tous les articles) ─────────────────────────────────────
  const rangees = await f.evaluate(() => { const F = document.querySelector('.vv-form'), R = F.getBoundingClientRect(), pad = parseFloat(getComputedStyle(F).paddingRight) || 0; const L2 = [...document.querySelectorAll('#vv-lig li.vv-a')];
    return { n: L2.length, sw: F.scrollWidth, cw: F.clientWidth, dehors: L2.flatMap(li => [...li.querySelectorAll('.vv-l-a .bt')].filter(b => b.getBoundingClientRect().right > R.right - Math.min(pad, 10) + 0.5).map(b => (b.getAttribute('aria-label') || b.textContent).trim().slice(0, 30) + ' ' + Math.round(b.getBoundingClientRect().right) + ' > ' + Math.round(R.right))) }; });
  v(`${tag} · contrat : ${rangees.n} articles, aucun bouton « Modifier le texte · ↑ · ↓ · ✕ » ne dépasse la colonne (${rangees.dehors.length} dehors)`, rangees.n >= 3 && rangees.dehors.length === 0, rangees);
  v(`${tag} · contrat : la colonne des étapes ne défile pas de côté (${rangees.sw} ≤ ${rangees.cw})`, rangees.sw <= rangees.cw + 1, rangees);
  if (W >= 360) { const lignes = await f.evaluate(() => [...document.querySelectorAll('#vv-lig li.vv-a .vv-l-a')].map(r => { const R = [...r.querySelectorAll('.bt')].map(b => b.getBoundingClientRect()); /* une LIGNE = des boutons dont les hauteurs se recouvrent : des boutons de hauteurs différentes, centrés, n'ont pas le même haut (faux 2 lignes à l'ordinateur, vu au recontrôle) */ return Math.max(...R.map(x => x.bottom)) - Math.min(...R.map(x => x.top)) <= Math.max(...R.map(x => x.height)) + 2 ? 1 : 2; }));
    v(`${tag} · contrat : « Modifier le texte · ↑ · ↓ · ✕ » tiennent sur UNE ligne dans chacun des ${lignes.length} articles (lignes : ${[...new Set(lignes)].join(',')})`, lignes.length >= 3 && lignes.every(n => n === 1), lignes); }
  await f.locator('#vv-lig li.vv-a').nth(1).evaluate(e => e.scrollIntoView({ block: 'center' })); await L.calme(p, 300); await L.capture(c, CAP + tag + '-articles.png'); await quitter(f);
  // ── tout-01 : l'aperçu au téléphone — il s'ouvre lisible ; « Ajuster » montre la page entière ; le choix de la personne est respecté ──────────
  if (une) {
    f = await devis(); await clic(c, f, '[data-vv="grand"]'); await L.calme(p, 600); let g = await page(f);
    v(`${tag} · l'aperçu s'ouvre sur « 100 % » : le texte du document est rendu à ${g && g.fs} px (≥ 11 px, jamais ~5 px)`, g && g.fs >= 11 && g.ech >= .95, g);
    if (W < 600) v(`${tag} · le réglage « 100 % » est celui qui est coché à l'ouverture (${g && g.zoom.join(' ')})`, g && g.zoom.some(z => /^100 %\*$/.test(sp(z))), g && g.zoom);
    const note = await f.evaluate(() => { const n = document.querySelector('.vv-grand-n'); return n ? { texte: n.textContent, visible: n.getBoundingClientRect().height > 0 } : null; });
    v(`${tag} · ${W < 600 ? 'la page dépasse l\'écran : une phrase dit comment lire (« Fais glisser… »)' : 'la page tient : la phrase « Fais glisser… » ne s\'affiche pas'}`, note && (W < 600 ? note.visible && /Fais glisser/.test(note.texte) : !note.visible), note);
    await L.capture(c, CAP + tag + '-apercu-100.png');
    await clic(c, f, '[data-vv="zoom"][data-v="ajuster"]:visible'); await L.calme(p, 500); g = await page(f);
    v(`${tag} · « Ajuster » montre la page ENTIÈRE dans l'écran (${g && g.w} ≤ ${g && g.W} px)`, g && g.w <= g.W, g);
    await L.capture(c, CAP + tag + '-apercu-ajuster.png');
    await clic(c, f, '[data-vv="grand-x"]'); await L.calme(p, 400); await clic(c, f, '[data-vv="grand"]'); await L.calme(p, 600); g = await page(f);
    v(`${tag} · un réglage choisi (« Ajuster ») est gardé à la réouverture : la page n'est pas remise à 100 % (${g && g.w} px)`, g && g.w <= g.W, g);
    await clic(c, f, '[data-vv="grand-x"]'); await quitter(f);
    // le contrat de même
    await L.aller(p, 'contrats'); f = await A.ouvrirAtelier(c, 'contrat', null); await L.calme(p, 900); await clic(c, f, '[data-vv="client"][data-id="mi"]'); await clic(c, f, '[data-vv="tpl"][data-v="part"]');
    await clic(c, f, '[data-vv="grand"]'); await L.calme(p, 600); g = await page(f);
    v(`${tag} · contrat : l'aperçu s'ouvre lisible aussi (${g && g.fs} px)`, g && g.fs >= 11, g); await clic(c, f, '[data-vv="grand-x"]'); await quitter(f);
  }
  // ── tout-03 : la tablette tourne avec l'aperçu ouvert (l'aperçu plein écran peut rester ouvert par-dessus : on mesure la COLONNE, puis ce qui reste à sa fermeture) ──
  if (pr === 'ipad') {
    const col = () => f.evaluate(() => { const z = document.getElementById('vv-ap-sc'), fe = z && z.querySelector('.feuille'); if (!z || !z.clientWidth || !fe) return null; const ech = fe.getBoundingClientRect().width / 794;
      return { w: Math.round(fe.getBoundingClientRect().width), ech: +ech.toFixed(3), vs: getComputedStyle(z).getPropertyValue('--vs').trim(), zone: z.clientWidth, etiquette: (z.closest('.vv-ap') ? [...z.closest('.vv-ap').querySelectorAll('[data-vv="zoom"][data-v="ajuster"]')].map(b => b.textContent.trim()) : []) }; });
    f = await devis(); await clic(c, f, '[data-vv="grand"]'); await L.calme(p, 600);
    await p.setViewportSize({ width: 1180, height: 820 }); await L.calme(p, 1000); let g = await col();
    v(`${tag} · paysage 1180, aperçu plein écran resté ouvert : la colonne a SA page à l'échelle posée (--vs="${g && g.vs}", page ${g && g.w} px, zone ${g && g.zone})`, g && g.vs !== '' && g.w >= 480, g);
    if (await f.locator('[data-vv="grand-x"]:visible').count()) await clic(c, f, '[data-vv="grand-x"]'); await L.calme(p, 600); g = await col();
    v(`${tag} · après « Fermer » : la page de la colonne fait au moins 480 px (${g && g.w}) et le réglage dit la même taille que la page (${g && g.etiquette.join(' ')} pour ${g && Math.round(g.ech * 100)} %)`, g && g.w >= 480 && g.etiquette.every(t => sp(t) === 'Ajuster · ' + Math.round(g.ech * 100) + ' %'), g);
    await p.setViewportSize({ width: 1440, height: 900 }); await L.calme(p, 900); g = await col();
    v(`${tag} · 1440 : la page fait au moins 620 px (${g && g.w})`, g && g.w >= 620, g);
    await p.setViewportSize({ width: 820, height: 1180 }); await L.calme(p, 900); await clic(c, f, '[data-vv="grand"]'); await L.calme(p, 500); await p.setViewportSize({ width: 1440, height: 900 }); await L.calme(p, 900);
    if (await f.locator('[data-vv="grand-x"]:visible').count()) await clic(c, f, '[data-vv="grand-x"]'); await L.calme(p, 500); g = await col();
    v(`${tag} · portrait → aperçu ouvert → bureau → fermé : la page garde son échelle (${g && g.w} px)`, g && g.w >= 620, g);
    await L.capture(c, CAP + tag + '-rotation.png'); await quitter(f);
  }
  v(tag + ' · aucune erreur JavaScript', c.err.length === 0, c.err);
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ERREUR SONDE', e.message.slice(0, 700)); process.exit(2); });
