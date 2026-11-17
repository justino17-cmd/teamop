// Le guide des nouveautés, mise en page : aucun débordement (contre la largeur POSÉE du profil), cibles d'au moins 44 px au doigt, texte lisible
// (taille et contraste, jour ET nuit), toutes les cartes tiennent dans la feuille sans défiler, la feuille tient dans l'écran (encoches posées),
// et au téléphone un balayage du doigt change de carte. Captures à REGARDER dans CAP (une par profil, rôle, mode : première carte et une carte pleine).
// Usage : PROFIL=petit|android|iphone|ipad|mac|windows QUI=marc,julie,sm [NUIT=1|0|both] [CAP=1] node guide-mise-en-page.js
const G = require('./guide-commun.js'), L = G.L, v = L.v;
const PROFIL = process.env.PROFIL || 'iphone', QUIS = (process.env.QUI || 'marc,julie,sm').split(','), TEL = G.TEL.includes(PROFIL) || PROFIL === 'ipad';
const MODES = process.env.NUIT === 'both' ? [false, true] : [process.env.NUIT === '1'];
const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const rap = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
(async () => {
  for (const nuit of MODES) for (const QUI of QUIS) {
    const tag = `${QUI}/${PROFIL}/${nuit ? 'nuit' : 'jour'}`;
    const c = await G.ouvrir(PROFIL, QUI, nuit), p = c.p, n = (await G.pages(c)).length;
    v(`${tag} : population : ${n} carte(s) à mesurer`, n >= 2);
    const f = await p.evaluate(() => { const r = document.querySelector('#nv .nv-feuille').getBoundingClientRect(); return { l:r.left, r:r.right, t:r.top, b:r.bottom, w:innerWidth, h:innerHeight }; });
    v(`${tag} : la feuille tient dans l'écran (gauche ${Math.round(f.l)}, droite ${Math.round(f.r)} / ${c.largeur} ; haut ${Math.round(f.t)}, bas ${Math.round(f.b)} / ${c.hauteur})`, f.l >= -0.5 && f.r <= c.largeur + 0.5 && f.t >= 0 && f.b <= c.hauteur + 0.5, f);
    if (TEL && PROFIL !== 'ipad') v(`${tag} : au téléphone la feuille est au bas de l'écran, pleine largeur (${Math.round(f.r - f.l)} px)`, Math.abs(f.r - f.l - c.largeur) <= 1 && Math.abs(f.b - c.hauteur) <= 1, f);
    const pasDebord = async nom => { const d = await L.deborde(c); v(`${tag} : ${nom} : la page ne glisse pas de côté (barre ${d.largeur} px, lue ${d.seconde}, bouge ${d.bouge})`, d.bouge === 0 && d.seconde <= c.largeur + 1, d); };
    for (let i = 0; i < n; i++) {
      await p.evaluate(j => { const d = document.querySelector('#nv .nv-defile'); d.scrollTo({ left:j * d.clientWidth, behavior:'instant' }); }, i); await L.calme(p, 400);
      const m = await p.evaluate(() => { const z = document.querySelector('#nv .nv-carte:not([inert])'); if (!z) return null; const r = z.getBoundingClientRect(), f = document.querySelector('#nv .nv-feuille').getBoundingClientRect();
        const dehors = [...z.querySelectorAll('*')].filter(e => { const q = e.getBoundingClientRect(); return q.width > 0 && (q.right > f.right + 0.5 || q.left < f.left - 0.5); }).map(e => e.tagName + '.' + e.className);
        const vis = [...document.querySelectorAll('#nv .nv-feuille *')].filter(e => e.offsetParent !== null && e.children.length === 0 && (e.textContent || '').trim());
        const pet = vis.filter(e => parseFloat(getComputedStyle(e).fontSize) < 13).map(e => e.textContent.trim().slice(0, 30));
        return { k:z.dataset.nvK, sw:z.scrollWidth, cw:z.clientWidth, sh:z.scrollHeight, ch:z.clientHeight, dehors, pet, ln:document.querySelector('#nv .nv-defile').scrollLeft | 0 }; });
      v(`${tag} : carte ${i + 1}/${n} « ${m && m.k} » : rien ne dépasse de la feuille ni de la carte (largeur ${m && m.sw}/${m && m.cw})`, !!m && m.sw <= m.cw + 1 && m.dehors.length === 0, m);
      v(`${tag} : carte ${i + 1} : elle tient sans défiler dans la hauteur (${m && m.sh}/${m && m.ch})`, !!m && m.sh <= m.ch + 1, m);
      v(`${tag} : carte ${i + 1} : aucun texte sous 13 px`, !!m && m.pet.length === 0, m && m.pet);
      await pasDebord('carte ' + (i + 1));
      const D = await L.doigts(p, '#nv');
      if (TEL) v(`${tag} : carte ${i + 1} : aucune cible sous 44 px (${(D.petits || []).join(' | ') || 'aucune'})`, D.petits.length === 0, D.petits);
      v(`${tag} : carte ${i + 1} : aucun texte écrasé (${D.ecrases.length})`, D.ecrases.length === 0, D.ecrases);
      // contraste de ce qu'on lit, sur le fond réellement peint (le fond de la feuille est plein)
      const ct = await p.evaluate(() => { const f = document.querySelector('#nv .nv-feuille'), par = s => { const m = s.match(/[\d.]+/g).map(Number); return m; };
        const fond = par(getComputedStyle(f).backgroundColor); const cibles = [...document.querySelectorAll('#nv .nv-carte:not([inert]) h2, #nv .nv-phrase, #nv .nv-avant, #nv .nv-apres, #nv .nv-aide, #nv .nv-compte, #nv .nv-tete .surtitre, #nv .nv-pied .btn')].filter(e => e.offsetParent !== null);
        return { fond, liste:cibles.map(e => { const cs = getComputedStyle(e), col = par(cs.color), bg = e.classList.contains('btn') ? par(cs.backgroundColor) : fond; let op = 1, q = e; while (q && q !== f.parentElement) { op *= parseFloat(getComputedStyle(q).opacity); q = q.parentElement; }
          return { t:(e.textContent || '').trim().slice(0, 24), col, bg, op, alpha:col.length > 3 ? col[3] : 1, bgA:bg.length > 3 ? bg[3] : 1 }; }) }; });
      const pires = ct.liste.map(x => { const comp = (a, b, al) => [0, 1, 2].map(k => Math.round(a[k] * al + b[k] * (1 - al))); const fg = comp(x.col, x.bg, x.alpha * x.op), bgp = x.bgA < 1 ? comp(x.bg, ct.fond, x.bgA) : x.bg; return { t:x.t, r:rap(fg, bgp.slice(0, 3)) }; }).filter(x => x.r < 4.5);
      v(`${tag} : carte ${i + 1} : contraste d'au moins 4,5:1 sur ${ct.liste.length} textes lus${pires.length ? ' — trop pâles : ' + pires.map(x => x.t + ' ' + x.r.toFixed(2)).join(', ') : ''}`, ct.liste.length >= 4 && pires.length === 0, pires);
      if (process.env.CAP && (i === 0 || i === 1)) await L.capture(c, `${G.CAP}mep-${PROFIL}-${QUI}-${nuit ? 'nuit' : 'jour'}-${i}.png`);
    }
    // les cibles des boutons du pied, mesurées une fois (au doigt : 44 px au moins)
    const B = await p.evaluate(() => ['.nv-x', '.nv-voir', '.nv-tard', '.nv-suiv'].map(s => { const e = document.querySelector('#nv ' + s), r = e.getBoundingClientRect(); return [s, Math.round(r.width), Math.round(r.height)]; }));
    if (TEL) v(`${tag} : ✕, Voir, Plus tard et Suivant font 44 px au moins (${B.map(b => b.join(' ')).join(' · ')})`, B.every(b => b[1] >= 44 && b[2] >= 44), B);
    // le balayage du doigt change de carte (téléphone et tablette) ; un vrai geste tactile envoyé au navigateur
    if (PROFIL === 'ipad') {   // l'émulation d'iPad de ce navigateur n'est pas un appareil mobile : le toucher envoyé ne fait pas défiler (même sur une page sans guide) — on joue ici la molette horizontale (pavé tactile) et les touches fléchées
      await p.evaluate(() => { const d = document.querySelector('#nv .nv-defile'); d.scrollTo({ left:0, behavior:'instant' }); }); await L.calme(p, 300);
      const r0 = await p.evaluate(() => { const r = document.querySelector('#nv .nv-defile').getBoundingClientRect(); return { x:Math.round(r.left + r.width / 2), y:Math.round(r.top + r.height / 2) }; });
      await p.mouse.move(r0.x, r0.y); await p.mouse.wheel(Math.round(c.largeur * 0.7), 0); await p.waitForTimeout(900);
      const a = await G.index(p); v(`${tag} : un défilement horizontal (pavé tactile) montre la carte suivante (carte ${a + 1})`, a === 1, a);
      await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(900); const b = await G.index(p); v(`${tag} : la flèche ← revient à la première carte`, b === 0, b);
      await p.keyboard.press('ArrowRight'); await p.waitForTimeout(900); const d = await G.index(p); v(`${tag} : la flèche → montre la suivante`, d === 1, d);
    } else if (TEL) {
      await p.evaluate(() => { const d = document.querySelector('#nv .nv-defile'); d.scrollTo({ left:0, behavior:'instant' }); }); await L.calme(p, 300);
      const cdp = await c.ctx.newCDPSession(p); const r0 = await p.evaluate(() => { const r = document.querySelector('#nv .nv-defile').getBoundingClientRect(); return { x:Math.round(r.left + r.width / 2), y:Math.round(r.top + r.height / 2) }; });
      // un doigt qui se pose, glisse par pas de 24 px (ce Chromium ne transmet aucun mouvement de moins de ~15 px) et se lève : touchStart, touchMove…, touchEnd
      const balayer = async dx => { const pas = 24, n = Math.ceil(Math.abs(dx) / pas), s = Math.sign(dx), y = r0.y, x0 = r0.x - s * Math.round(Math.abs(dx) / 2);
        await cdp.send('Input.dispatchTouchEvent', { type:'touchStart', touchPoints:[{ x:x0, y }] });
        for (let k = 1; k <= n; k++) { await cdp.send('Input.dispatchTouchEvent', { type:'touchMove', touchPoints:[{ x:x0 + s * Math.min(k * pas, Math.abs(dx)), y }] }); await p.waitForTimeout(32); }
        await cdp.send('Input.dispatchTouchEvent', { type:'touchEnd', touchPoints:[] }); await p.waitForTimeout(900); return G.index(p); };
      const a = await balayer(-Math.round(c.largeur * 0.7)); v(`${tag} : un balayage vers la gauche montre la carte suivante (carte ${a + 1})`, a === 1, a);
      const pts = await p.evaluate(() => [...document.querySelectorAll('#nv .nv-points-nav i')].map(e => e.classList.contains('on')));
      v(`${tag} : …et le point de progression suit (${pts.map(x => x ? '●' : '○').join('')})`, pts.length === n && pts[1] === true && pts.filter(Boolean).length === 1, pts);
      const compte = await p.evaluate(() => document.querySelector('#nv [data-nv-i]').textContent); v(`${tag} : …et le compte dit « ${compte} sur ${n} »`, compte === '2');
      const b = await balayer(Math.round(c.largeur * 0.7)); v(`${tag} : un balayage vers la droite revient à la première carte`, b === 0, b);
      const calage = await p.evaluate(() => { const d = document.querySelector('#nv .nv-defile'); return d.scrollLeft % d.clientWidth; }); v(`${tag} : le défilement s'accroche sur une carte entière (reste ${calage})`, calage === 0, calage);
      const bas = await p.evaluate(() => scrollY); v(`${tag} : la page derrière n'a pas bougé pendant le geste`, bas === 0, bas);
    }
    v(`${tag} : aucune erreur de console`, c.err.length === 0, c.err.slice(0, 3));
    await L.fin(c);
  }
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); await L.fermer(); process.exit(2); });
