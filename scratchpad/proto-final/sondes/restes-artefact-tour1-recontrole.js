// RECONTRÔLE ADVERSE des restes « artefact », tour 1 (17 novembre 2026). Ne modifie aucune page.
// Ce que les sondes du correcteur (artefact-voir-app.js) ne regardent pas : le bouton « Voir comme l'application » et le lien « Revenir au mode test »
// sur SIX profils d'appareil, jour ET nuit — la bande ne déborde pas, le bouton est une vraie cible et n'est recouvert par rien, le lien de retour
// ne chevauche aucun élément de l'écran de connexion, se lit (contraste calculé), s'atteint AU CLAVIER, et ramène la bande ; puis le même chemin
// depuis un autre rôle de la revue (technicienne) et avec un rangement/un historique adverses.
// Population d'abord : un zéro sur du vide ne prouve rien. 127.0.0.1 seulement.
//   PROFILS=mac,iphone JOUR=1 node restes-artefact-tour1-recontrole.js
const P = require('./recontrole-artefact-pose.js'), { lib: L } = P;
// GARDE-FOU (18 novembre 2026) : une sonde qui se fige ne prouve rien et bloque la campagne plus de 150 s. Chaque contrôle remet la pendule à zéro ;
// si aucun ne passe en DELAI_ETAPE ms (40 s par défaut ; la plus longue attente saine, `pret`, fait 30 s au pire), on écrit un ✗ NOMMÉ (le dernier
// contrôle passé et l'étape en cours), on rend le bilan et on sort en 1 — au lieu de laisser le délai du lanceur couper sans un mot.
let dernier = 'démarrage', enCours = 'démarrage', t0 = Date.now(), fini = false; const DELAI = +process.env.DELAI_ETAPE || 40000;
const etape = n => { enCours = n; t0 = Date.now(); };
const v = (n, c, d) => { dernier = n; t0 = Date.now(); return P.v(n, c, d); };
const garde = setInterval(async () => { if (fini || Date.now() - t0 < DELAI) return; fini = true; clearInterval(garde);
  P.v(`BLOQUÉ plus de ${DELAI / 1000} s à l'étape « ${enCours} » (dernier contrôle passé : « ${dernier} »)`, false, {});
  L.bilan(); try { await Promise.race([L.fermer(), new Promise(r => setTimeout(r, 3000))]); } catch (x) {} process.exit(1); }, 1000);
const fs = require('fs'), path = require('path');
const PROFILS = (process.env.PROFILS || 'mac,windows,ipad,iphone,android,petit').split(',');
const CAP = process.env.CAP || '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/rc-artefact1';
fs.mkdirSync(CAP, { recursive: true });
const calmer = f => f.evaluate(() => { try { window.horsLigneDebut = function () {}; } catch (e) {} const e = document.getElementById('hl-ecran'); if (e) e.remove(); const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); });
const lit = p => p.evaluate(() => {
  const vis = e => !!e && e.getBoundingClientRect().width > 4 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
  const bt = document.querySelector('.rl-bande [data-apv]'), lien = document.getElementById('cnx-test');
  return { bande: vis(document.querySelector('.rl-bande')), bouton: vis(bt), cnx: !!document.getElementById('cnx') && vis(document.querySelector('#cnx .cn-carte')), lien: vis(lien) && getComputedStyle(lien).display !== 'none',
    app: typeof MODE_APP !== 'undefined' && !!MODE_APP, hash: location.hash };
});
async function pret(c, ms) { const t0 = Date.now(); let e = null; while (Date.now() - t0 < (ms || 25000)) { await c.p.waitForTimeout(400); e = await lit(c.p).catch(() => null); if (e && (e.bande || e.cnx)) { await c.p.waitForTimeout(700); return await lit(c.p).catch(() => e); } } return e || {}; }
// couleur → [r,g,b] ; rgb() ou color(srgb 0-1) (règle du dépôt : reconnaître la FORME avant de convertir, jeter ce qu'on ne sait pas lire)
const lum = ([r, g, b]) => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const lire = s => { let m = /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)/.exec(s || ''); if (m) return [+m[1], +m[2], +m[3]]; m = /^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(s || ''); if (m) return [+m[1] * 255, +m[2] * 255, +m[3] * 255]; return null; };
(async () => {
  for (const profil of PROFILS) for (const nuit of (process.env.JOUR ? [false] : [false, true])) {
    const T = `${profil}/${nuit ? 'nuit' : 'jour'}`, nomCap = `${profil}-${nuit ? 'nuit' : 'jour'}`;
    etape(`${T} : ouverture de la page`); const c = await P.ouvrir({ profil, qui: null, app: false, nuit, guide: true }, {}); await calmer(c.p); c.p.setDefaultTimeout(5000);
    const W = c.largeur;
    etape(`${T} 1 : attente de la bande`); let e = await pret(c, 25000);
    // ── 1. la bande et son bouton ──
    v(`${T} 1 : population (la bande et le bouton sont là, pas d'écran de connexion)`, e.bande && e.bouton && !e.cnx, e);
    const g = await c.p.evaluate(() => { const b = document.querySelector('.rl-bande'), bt = b.querySelector('[data-apv]'); bt.scrollIntoView({ block: 'center' });
      const r = bt.getBoundingClientRect(), rb = b.getBoundingClientRect(); const autres = [...b.querySelectorAll('button, a, [role=button], select')].filter(x => x !== bt && x.getBoundingClientRect().width > 4);
      const chev = autres.filter(x => { const q = x.getBoundingClientRect(); return !(q.right <= r.left + 1 || q.left >= r.right - 1 || q.bottom <= r.top + 1 || q.top >= r.bottom - 1); }).map(x => (x.className || x.tagName) + ':' + x.textContent.trim().slice(0, 20));
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2, p = document.elementFromPoint(cx, cy);
      return { h: Math.round(r.height), w: Math.round(r.width), gauche: Math.round(r.left), droite: Math.round(r.right), bandeG: Math.round(rb.left), bandeD: Math.round(rb.right), nAutres: autres.length, chev, recouvert: !(p && (p === bt || bt.contains(p))), texte: bt.textContent.trim(), coupe: bt.scrollWidth > bt.clientWidth + 1 }; });
    v(`${T} 1 : le bouton tient dans l'écran (${g.gauche}→${g.droite} sur ${W}) et dans sa bande (${g.bandeG}→${g.bandeD})`, g.gauche >= 0 && g.droite <= W + 1 && g.gauche >= g.bandeG - 1 && g.droite <= g.bandeD + 1, g);
    v(`${T} 1 : cible de ${g.h} px (≥ ${c.doigt ? 44 : 38}), ${g.nAutres} autres commandes dans la bande, aucune ne le chevauche, rien ne le recouvre, texte non coupé`, g.h >= (c.doigt ? 44 : 38) && g.nAutres >= 3 && !g.chev.length && !g.recouvert && !g.coupe, g);
    const dep = await L.deborde(c).catch(() => null);
    v(`${T} 1 : la page ne déborde pas de côté (bande affichée)`, !dep || !dep.length, dep);
    await c.p.evaluate(() => scrollTo(0, 0)); await c.p.waitForTimeout(300);
    await c.p.screenshot({ path: path.join(CAP, nomCap + '-1-bande.png') }).catch(() => {});
    // ── 2. un toucher → l'écran de connexion ; le lien de retour ──
    etape(`${T} 2 : toucher le bouton puis attendre l'écran de connexion`); await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first()); e = await pret(c, 30000);
    v(`${T} 2 : le bouton mène à l'écran de connexion (app, carte, lien de retour)`, e.app && e.cnx && e.lien && !e.bande, e);
    const k = await c.p.evaluate(() => { const l = document.getElementById('cnx-test'), r = l.getBoundingClientRect(), cn = document.getElementById('cnx');
      const cs = getComputedStyle(l), colonne = cn.querySelector('.cn-col');
      // tout ce que le lien pourrait chevaucher : les éléments visibles de l'écran de connexion (hors le conteneur plein écran lui-même et ses enveloppes)
      const ch = [...cn.querySelectorAll('*')].filter(x => { if (x === colonne || x.contains(l) || l.contains(x) || x.children.length > 3) return false;   /* le lien vit DANS #cnx (tour 2) : ni lui ni son chevron ne comptent comme un voisin */ const q = x.getBoundingClientRect(); if (q.width < 4 || q.height < 4) return false;
        const s = getComputedStyle(x); if (s.visibility === 'hidden' || s.display === 'none') return false; if (!(x.textContent.trim() || x.tagName === 'IMG' || x.tagName === 'svg' || x.tagName === 'SVG')) return false;
        return !(q.right <= r.left + 1 || q.left >= r.right - 1 || q.bottom <= r.top + 1 || q.top >= r.bottom - 1); }).map(x => (x.tagName + '.' + (x.className && x.className.baseVal === undefined ? x.className : '')).slice(0, 40) + ':' + x.textContent.trim().slice(0, 24));
      const p = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { g: Math.round(r.left), h: Math.round(r.top), dr: Math.round(r.right), bas: Math.round(r.bottom), haut: Math.round(r.height), couleur: cs.color, fond: getComputedStyle(cn).backgroundColor, image: getComputedStyle(cn).backgroundImage.slice(0, 40), taille: cs.fontSize, ch, recouvert: !(p && (p === l || l.contains(p))), defile: cn.scrollHeight > cn.clientHeight + 1 }; });
    v(`${T} 2 : le lien de retour (${k.g},${k.h}→${k.dr},${k.bas}) ne recouvre ni n'est recouvert (${k.ch.length} chevauchement)`, !k.ch.length && !k.recouvert && k.g >= 0 && k.dr <= W, k);
    v(`${T} 2 : cible de ${k.haut} px (≥ 44 au doigt, 40 à la souris)`, k.haut >= (c.doigt ? 44 : 40), k);
    const cl = lire(k.couleur), fo = lire(k.fond); const rt = cl && fo ? ratio(cl, fo) : null;
    v(`${T} 2 : le lien se lit (contraste ${rt ? rt.toFixed(2) : '?'}:1 sur le fond de l'écran, seuil 4,5 ; ${k.taille})`, rt !== null && rt >= 4.5, { couleur: k.couleur, fond: k.fond, image: k.image });
    const dep2 = await L.deborde(c).catch(() => null);
    v(`${T} 2 : l'écran de connexion ne déborde pas`, !dep2 || !dep2.length, dep2);
    await c.p.screenshot({ path: path.join(CAP, nomCap + '-2-connexion.png') }).catch(() => {});
    // ── 3. le clavier atteint le lien ; Entrée ramène la bande (mac seulement : au doigt il n'y a pas de clavier) ──
    if (!c.doigt && !nuit) {
      // le piège de focus de la fenêtre modale (#cnx, aria-modal) boucle sur SES éléments : on note où le clavier passe, et s'il sort jamais de #cnx
      let atteint = false; const piste = []; for (let i = 0; i < 40 && !atteint; i++) { await c.p.keyboard.press('Tab'); etape(`${T} 3 : Tab n°${i + 1}`); const a = await c.p.evaluate(() => { const x = document.activeElement; return { id: x && (x.id || x.tagName), dedans: !!(x && x.closest && x.closest('#cnx')), lien: !!(x && x.id === 'cnx-test') }; }); atteint = a.lien; piste.push(a.id + (a.dedans ? '' : '(hors #cnx)')); }
      const sorti = piste.some(x => /hors #cnx/.test(x));
      v(`${T} 3 : Tab atteint « Revenir au mode test » (en ≤ 40 pressions) — le clavier ${sorti ? 'sort' : 'ne sort jamais'} de #cnx : ${[...new Set(piste)].join(' › ')}`, atteint, piste.slice(0, 12));
      if (atteint) { const anneau = await c.p.evaluate(() => { const s = getComputedStyle(document.activeElement); return { outline: s.outlineStyle + ' ' + s.outlineWidth, ombre: s.boxShadow.slice(0, 40) }; });
        v(`${T} 3 : le focus du lien se voit (contour ou ombre)`, (anneau.outline && !/^none/.test(anneau.outline)) || (anneau.ombre && anneau.ombre !== 'none'), anneau);
        etape(`${T} 3 : Entrée sur le lien puis attente de la bande`); await c.p.keyboard.press('Enter'); e = await pret(c, 30000); v(`${T} 3 : Entrée ramène la bande (revue), plus d'écran de connexion`, e.bande && !e.cnx && !e.app, e); }
    } else {
      etape(`${T} 3 : toucher le lien puis attendre la bande`); await L.toucher(c, c.p.locator('#cnx-test').first()); e = await pret(c, 30000);
      v(`${T} 3 : le lien ramène la bande (revue), plus d'écran de connexion`, e.bande && !e.cnx && !e.app, e);
    }
    // ── 4. depuis un autre rôle de la revue (technicienne) : la bande garde son bouton, il mène à la connexion ──
    if (e.bande) {
      etape(`${T} 4 : autre rôle`); const role = c.p.locator('.rl-bande [data-rl^="role|"]').nth(2);
      const nom = await role.textContent().catch(() => '');
      await L.toucher(c, role); await c.p.waitForTimeout(900); await calmer(c.p);
      const e4 = await lit(c.p); v(`${T} 4 : après un autre rôle (« ${nom.trim().slice(0, 18)} ») la bande et son bouton sont encore là`, e4.bande && e4.bouton, e4);
      if (e4.bouton) { await L.toucher(c, c.p.locator('.rl-bande [data-apv]').first()); const e5 = await pret(c, 30000); v(`${T} 4 : le bouton, depuis ce rôle, mène à la connexion`, e5.app && e5.cnx && e5.lien, e5); }
    }
    const err = (c.err || []).filter(x => !/hors-ligne|horsLigne/.test(x));
    v(`${T} : aucune erreur JavaScript`, !err.length, err.slice(0, 3));
    await L.fin(c);
  }
  fini = true; const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
