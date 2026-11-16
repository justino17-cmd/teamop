// Sonde « téléphone » : à 320 / 360 / 390 px, encoches posées, la barre du module ne chevauche pas la barre d'onglets d'OP GESTION, le composeur tient (clavier simulé),
// les cibles au doigt font ≥ 44 px, un appui long ouvre le menu du message.
const { lib, v, entrer, cap, fin, sortie, ouvrirMsg } = require('./mail-commun.js');
const S = (c, f, a) => c.p.evaluate(f, a);
const cibles = c => S(c, () => { const R = window.R(), pet = [], vus = [];
  for (const e of R.querySelectorAll('button, [data-folder], .msg, [data-scope], a')) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.hidden || e.closest('[hidden]') || e.disabled) continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const hit = e.closest('.srow, .msg, .mitem') || e, rr = hit.getBoundingClientRect(); vus.push(1); if (Math.max(r.height, rr.height) < 43.5 || Math.max(r.width, rr.width) < 43.5) pet.push((e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 40) + ' ' + Math.round(r.width) + '×' + Math.round(r.height)); }
  return { n:vus.length, petits:[...new Set(pet)] }; });
(async () => {
  for (const profil of ['petit', 'android', 'iphone']) {
    const c = await entrer({ profil }), p = c.p, L = c.largeur;
    const geo = await S(c, () => { const h = document.getElementById('courrier-hote').getBoundingClientRect(), b = document.getElementById('barre-bas').getBoundingClientRect(); return { hoteBas:Math.round(h.bottom), barreHaut:Math.round(b.top), barreH:Math.round(b.height), ih:innerHeight, hoteL:Math.round(h.width), vide:document.getElementById('barre-bas').innerText.length }; });
    v(profil + ' : la barre d\'onglets d\'OP GESTION est bien là (population)', geo.vide > 10 && geo.barreH > 40, geo);
    v(profil + ' : l\'hôte s\'arrête AU-DESSUS de la barre d\'onglets (aucun chevauchement)', geo.hoteBas <= geo.barreHaut, geo);
    const bas = await S(c, () => { const R = window.R(), h = document.getElementById('courrier-hote').getBoundingClientRect(), b = document.getElementById('barre-bas').getBoundingClientRect().top; let max = 0, n = 0;
      for (const e of R.querySelectorAll('button')) { if (e.closest('.msg') || e.closest('[hidden]') || getComputedStyle(e).display === 'none') continue; const r = e.getBoundingClientRect(); if (r.width > 1 && r.height > 1 && r.top > h.top + h.height * .8 && r.top < h.bottom && r.left >= h.left - 1 && r.right <= h.right + 1) { n++; max = Math.max(max, r.bottom); } } return { n, max:Math.round(max), barre:Math.round(b) }; });
    v(profil + ' : la barre du bas du module (' + bas.n + ' boutons) finit au-dessus de la barre d\'onglets d\'OP GESTION', bas.n >= 2 && bas.max <= bas.barre + 1, bas);
    const ct = await cibles(c); v(profil + ' : liste — cibles au doigt ≥ 44 px (population ' + ct.n + ')', ct.n > 8 && ct.petits.length === 0, ct.petits.slice(0, 6));
    await cap(c, 'telephone-liste-' + profil);
    await ouvrirMsg(c, 'm1');
    const ct2 = await cibles(c); v(profil + ' : lecture (bandeau compris) — cibles ≥ 44 px (population ' + ct2.n + ')', ct2.n > 8 && ct2.petits.length === 0, ct2.petits.slice(0, 6));
    const dep = await lib.deborde(c); v(profil + ' : la lecture ne fait pas glisser la page de côté', dep.bouge === 0, dep);
    const hb = await S(c, () => { const e = window.R().querySelector('.hband'); const r = e.getBoundingClientRect(), h = document.getElementById('courrier-hote').getBoundingClientRect(); return { gauche:Math.round(r.left - h.left), droite:Math.round(h.right - r.right), larg:Math.round(r.width) }; });
    v(profil + ' : le bandeau tient dans la largeur (marges ≥ 0)', hb.gauche >= 0 && hb.droite >= 0, hb);
    await cap(c, 'telephone-lecture-' + profil);
    // composeur, clavier simulé : on rogne 300 px de fenêtre
    await p.keyboard.press('Escape');
    await p.locator('#courrier-hote [data-act=replyMenu] >> visible=true').first().tap(); await p.waitForTimeout(500);
    await p.locator('#courrier-hote [data-pick=reply] >> visible=true').first().tap(); await p.waitForTimeout(700);
    await p.setViewportSize({ width:L, height:c.hauteur - 300 }); await p.waitForTimeout(600);
    const co = await S(c, () => { const s = window.R().querySelector('#cSheet'); if (!s) return null; const r = s.getBoundingClientRect(), t = window.R().querySelector('#cBody').getBoundingClientRect(), e = window.R().querySelector('#cSend').getBoundingClientRect(); return { haut:Math.round(r.top), bas:Math.round(r.bottom), ih:innerHeight, texte:Math.round(t.height), envoyerVu:e.top >= 0 && e.bottom <= innerHeight }; });
    v(profil + ' : le composeur tient au-dessus d\'un clavier simulé (fenêtre −300 px), « Envoyer » visible, zone de texte ≥ 60 px', !!co && co.bas <= co.ih + 1 && co.envoyerVu && co.texte >= 60, co);
    await cap(c, 'telephone-composeur-' + profil);
    await p.setViewportSize({ width:L, height:c.hauteur });
    v(profil + ' : aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
    await fin(c);
  }
  // appui long : touchstart tenu 900 ms sur une ligne → le menu du message s'ouvre
  const c = await entrer({ profil:'iphone' }), p = c.p;
  const pt = await S(c, () => { const r = window.R().querySelectorAll('.msg')[1].getBoundingClientRect(); return { x:r.left + 80, y:r.top + 30 }; });
  const cdp = await c.ctx.newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:pt.x, y:pt.y }] }); await p.waitForTimeout(1000);
  await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await p.waitForTimeout(500);
  const menu = await S(c, () => [...window.R().querySelectorAll('#overlays .mitem')].map(b => b.textContent.trim()));
  v('appui long sur une ligne : le menu du message s\'ouvre (≤ 7 gestes)', menu.length >= 4 && menu.length <= 7, menu);
  await cap(c, 'telephone-appui-long'); await fin(c);
  await sortie();
})().catch(e => { console.log('ERREUR', e.message, (e.stack || '').split('\n')[1]); process.exit(1); });
