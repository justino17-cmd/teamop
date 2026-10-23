/* ══ test-2842 · UNE PHOTO S'OUVRE EN GRAND DANS L'APPLICATION, ET ELLE SE LIT ═══════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 21. Les vignettes (photos et plans d'une intervention, bon de livraison, ticket
   du TPE, carte grise, justificatif d'absence…) faisaient window.open(this.src) : dans l'application installée, la photo partait
   dans le navigateur ; une photo gardée sur l'appareil (adresse data:) n'y paraissait pas du tout ; et la visionneuse du
   Contrôle, posée dans #overlay2, REMPLAÇAIT la feuille secondaire d'où on l'ouvrait.
   Ce banc EXÉCUTE la visionneuse (photoPlein, photoPleinFermer et leurs aides) extraite d'app.html, dans un document simulé :
   la photo a une vraie mise en page (contenue dans l'écran), et sa transformation se relit comme le ferait le navigateur. Il
   joue l'ouverture depuis la vignette, la fermeture par Échap, le fond, « Fermer » et le retour système, le pincement, le double
   toucher, la promenade d'une photo agrandie, le glissement vers le bas (lent : elle revient ; vif ou long : elle part), Ctrl +
   molette et la souris, puis les animations réduites. Il recense enfin TOUTES les vignettes de la page. La preuve au doigt et
   au pixel, jour et nuit : scratchpad/sonde-photo-plein.js.                                                               */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = CODE.indexOf(debut); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(i, k + 1);
}
console.log('\n── 2842 · 0. la population ──');
const NOMS = ['photoPleinOuvert', 'vphPoser', 'vphFiger', 'vphCentre', 'vphTaille', 'vphDebord', 'vphRamener', 'vphZoomVers', 'vphBascule', 'vphRetirer', 'photoPlein', 'photoPleinFermer'];
const F = NOMS.map(n => bloc('\nfunction ' + n + '(').slice(1));
const AIDES = ['vitesseRelache', 'elastique', 'swipeProjeter', 'animSobre'].map(n => bloc('\nfunction ' + n + '(').slice(1));
const CONST = (/const SWIPE_ENGAGE=[^;]*;/.exec(CODE) || [''])[0];
vrai('la visionneuse (' + NOMS.length + ' fonctions) et ses aides (vitesse, élastique, projection) sont trouvées',
  F.every(x => x.length > 40) && AIDES.every(x => x.length > 30) && !!CONST, F.map(x => x.length).concat(AIDES.map(x => x.length)));

/* ── le document simulé : un écran de 390 × 844, la visionneuse a 64 px en haut, 20 en bas, 10 de côté ; la photo (1 200 × 900)
   y est contenue : 370 × 277,5, centrée en (195, 444). Sa transformation (translate(x,y) scale(s)) se relit en matrice. */
const W = 390, H = 844, BOITE = { cx: 195, cy: 444, w: 370, h: 277.5 };
function monde(o) {
  o = o || {};
  const J = { horloge: 1000, minut: [], images: [], doc: {}, fen: {}, actif: null, retires: 0 };
  const corps = { tagName: 'BODY', enfants: [], isConnected: true, appendChild(x) { x.parent = corps; corps.enfants.push(x); return x; } };
  function el(tag, classes) {
    const cl = new Set(classes || []), L = {}, attrs = {};
    const e = { tagName: tag.toUpperCase(), style: {}, parent: null, enfants: [], attrs, L,
      classList: { add: (...c) => c.forEach(x => cl.add(x)), remove: (...c) => c.forEach(x => cl.delete(x)), contains: (c) => cl.has(c), toggle: (c, on) => { if (on === undefined ? !cl.has(c) : on) cl.add(c); else cl.delete(c); } },
      get className() { return [...cl].join(' '); }, set className(v) { cl.clear(); String(v).split(/\s+/).filter(Boolean).forEach(x => cl.add(x)); },
      get isConnected() { let x = e; while (x) { if (x === corps) return true; x = x.parent; } return false; },
      setAttribute(k, v) { attrs[k] = String(v); }, getAttribute(k) { return k in attrs ? attrs[k] : null; },
      addEventListener(t, fn, opt) { (L[t] = L[t] || []).push({ fn, opt }); },
      closest(sel) { let x = e; const c = sel.replace(/^\./, ''); while (x && x.classList) { if (x.classList.contains(c)) return x; x = x.parent; } return null; },
      querySelector(sel) { const pile = [...e.enfants]; while (pile.length) { const x = pile.shift(); if (sel === 'img' ? x.tagName === 'IMG' : x.classList && x.classList.contains(sel.replace(/^\./, ''))) return x; pile.push(...(x.enfants || [])); } return null; },
      remove() { if (e.parent) { const p = e.parent; p.enfants = p.enfants.filter(x => x !== e); e.parent = null; J.retires++; } },
      focus() { J.actif = e; } };
    return e;
  }
  /* la mise en page de la photo, et ce que le navigateur relit de sa transformation */
  const transfo = (x) => { const m = /translate\((-?[\d.]+)px,(-?[\d.]+)px\) scale\((-?[\d.]+)\)/.exec(x.style.transform || ''); return m ? { x: +m[1], y: +m[2], s: +m[3] } : null; };
  function photo() {
    const img = el('img', ['vph-img']); J.images.push(img);
    let src = '';
    const nat = o.petite ? [300, 200] : [1200, 900];
    Object.defineProperty(img, 'src', { get: () => src, set: (v) => { src = v; img.complete = !o.lente; img.naturalWidth = o.lente ? 0 : nat[0]; img.naturalHeight = o.lente ? 0 : nat[1]; } });
    /* sans taille posée, le navigateur la contient (max-width/max-height) ; une taille posée l'emporte */
    const lw = () => img.style.width ? parseFloat(img.style.width) : Math.min(nat[0], BOITE.w), lh = () => img.style.height ? parseFloat(img.style.height) : Math.min(nat[1], BOITE.h);
    Object.defineProperty(img, 'offsetWidth', { get: lw });
    Object.defineProperty(img, 'offsetHeight', { get: lh });
    img.getBoundingClientRect = () => { const t = transfo(img) || { x: 0, y: 0, s: 1 }; const w = lw() * t.s, h = lh() * t.s, cx = BOITE.cx + t.x, cy = BOITE.cy + t.y;
      return { left: cx - w / 2, top: cy - h / 2, width: w, height: h, right: cx + w / 2, bottom: cy + h / 2 }; };
    return img;
  }
  function creer(tag) {
    const e = el(tag);
    if (tag === 'div') {
      let html = '';
      Object.defineProperty(e, 'clientWidth', { get: () => W }); Object.defineProperty(e, 'clientHeight', { get: () => H });
      Object.defineProperty(e, 'innerHTML', { get: () => html, set: (v) => { html = v; e.enfants = [];
        const tete = el('div', ['vph-tete']); tete.parent = e;
        const b = el('button', ['vph-fermer']); b.parent = tete; tete.enfants.push(b);
        const img = photo(); img.parent = e; e.enfants.push(tete, img); } });
    }
    return e;
  }
  const doc = { body: corps, createElement: creer, get activeElement() { return J.actif; },
    addEventListener: (t, fn, cap) => { (J.doc[t] = J.doc[t] || []).push({ fn, cap }); }, removeEventListener: (t, fn) => { J.doc[t] = (J.doc[t] || []).filter(x => x.fn !== fn); } };
  const ctx = { document: doc, console, Math, String, Number, performance: { now: () => J.horloge }, innerWidth: W, innerHeight: H,
    matchMedia: (q) => ({ matches: !!o.sobre && /reduce/.test(q) }),
    getComputedStyle: (x) => { const t = transfo(x); return { transform: t ? 'matrix(' + t.s + ', 0, 0, ' + t.s + ', ' + t.x + ', ' + t.y + ')' : 'none',
      paddingLeft: '10px', paddingRight: '10px', paddingTop: '64px', paddingBottom: '20px' }; },
    esc: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'),
    requestAnimationFrame: (f) => { J.minut.push({ f, ms: -1 }); return J.minut.length; },
    setTimeout: (f, ms) => { J.minut.push({ f, ms }); return J.minut.length; }, clearTimeout: (id) => { if (J.minut[id - 1]) J.minut[id - 1].annule = true; },
    addEventListener: (t, fn, cap) => { (J.fen[t] = J.fen[t] || []).push(fn); (J.fenCap = J.fenCap || {})[t] = !!cap; }, removeEventListener: (t, fn) => { J.fen[t] = (J.fen[t] || []).filter(x => x !== fn); } };
  ctx.window = ctx; vm.createContext(ctx);
  try { vm.runInContext(CONST + '\n' + AIDES.join('\n') + '\nlet _vph=null;\n' + F.join('\n') + '\nthis.__etat=()=>_vph;', ctx); } catch (e) { J.err = e.message; }
  for (const n of NOMS) if (typeof ctx[n] !== 'function') ctx[n] = () => {};
  const tourner = () => { for (let k = 0; k < 6; k++) { const m = J.minut.splice(0); if (!m.length) break; m.filter(x => !x.annule).forEach(x => x.f()); } };
  const P = () => (ctx.__etat ? ctx.__etat() : null);
  const ov = () => corps.enfants.find(x => x.classList.contains('vph')) || null;
  const img = () => { const v = ov(); return v ? v.querySelector('img') : null; };
  const t = () => { const i = img(); const m = i && transfo(i); return m || { x: 0, y: 0, s: 1 }; };
  const tire = (cible, type, e) => { const l = (cible && cible.L[type]) || []; l.forEach(x => x.fn(e)); return e; };
  const ev = (o2) => Object.assign({ empeche: 0, preventDefault() { this.empeche++; }, stopImmediatePropagation() { this.arrete = true; }, stopPropagation() { this.garde = true; } }, o2);
  const touches = (pts) => pts.map(([x, y]) => ({ clientX: x, clientY: y }));
  const doigt = {
    pose(pts, cible) { return tire(ov(), 'touchstart', ev({ touches: touches(pts), target: cible || ov() })); },
    bouge(pts, ms) { J.horloge += (ms === undefined ? 16 : ms); return tire(ov(), 'touchmove', ev({ touches: touches(pts) })); },
    leve(reste, fin, cible, ms) { J.horloge += (ms || 0); return tire(ov(), 'touchend', ev({ touches: touches(reste || []), changedTouches: touches([fin || [0, 0]]), target: cible || ov() })); } };
  const vign = el('img'); vign.parent = corps; corps.enfants.push(vign); vign.src = 'data:image/jpeg;base64,AAAA';
  vign.getBoundingClientRect = () => ({ left: 20, top: 600, width: 80, height: 80, right: 100, bottom: 680 });
  J.actif = vign;
  return { ctx, J, corps, vign, el, P, ov, img, t, tire, ev, doigt, tourner, touche: (k) => { const e = ev({ key: k }); (J.doc.keydown || []).filter(x => x.cap).forEach(x => { if (!e.arrete) x.fn(e); }); return e; } };
}

console.log('\n── 2842 · 1. ouvrir depuis la vignette ──');
{ const M = monde(); vrai('le code s’exécute', !M.J.err, M.J.err);
  M.ctx.photoPlein(M.vign, 'Bon <b>de</b> livraison');
  const ov = M.ov(), img = M.img();
  vrai('une couche à elle, posée sur le document (pas #overlay2) : role="dialog", aria-modal, nommée par son titre',
    !!ov && ov.getAttribute('role') === 'dialog' && ov.getAttribute('aria-modal') === 'true' && ov.getAttribute('aria-label') === 'Bon <b>de</b> livraison', ov && ov.attrs);
  vrai('le titre est échappé dans le HTML (aucune balise ne passe)', !!ov && /Bon &lt;b&gt;de&lt;\/b&gt; livraison/.test(ov.innerHTML) && !/<b>de<\/b>/.test(ov.innerHTML));
  vrai('la photo reçoit la source de la vignette, par la propriété', !!img && img.src === 'data:image/jpeg;base64,AAAA', img && img.src);
  vrai('ouverte au doigt : le focus entre dans la visionneuse, sur la couche (aucun anneau autour de « Fermer »)', M.J.actif === ov && ov.getAttribute('tabindex') === '-1', M.J.actif && M.J.actif.className);
  const d = M.t();
  vrai('⛔ au départ, la photo est LÀ OÙ EST la vignette : même centre (60, 640), même surface',
    Math.abs(BOITE.cx + d.x - 60) < 0.2 && Math.abs(BOITE.cy + d.y - 640) < 0.2 && Math.abs(d.s - Math.sqrt(80 * 80 / (BOITE.w * BOITE.h))) < 1e-3, d);
  vrai('… et le fond n’est pas encore noir', !ov.classList.contains('vu'));
  M.tourner();
  vrai('une image plus tard : le fond se fond (.vu) et la photo prend sa place (aucune transformation)', ov.classList.contains('vu') && M.t().s === 1 && M.t().x === 0 && M.t().y === 0, M.t());
  vrai('… par une transition (pas un saut)', img.style.transition === '', img.style.transition);
  vrai('photoPleinOuvert() le dit', M.ctx.photoPleinOuvert() === true); }
{ const M = monde(); M.ctx.window.event = { type: 'click', detail: 0 }; M.ctx.photoPlein(M.vign, 'Photo');
  vrai('ouverte au CLAVIER (un clic sans pointeur) : le focus va sur « Fermer »', M.J.actif && M.J.actif.classList.contains('vph-fermer'), M.J.actif && M.J.actif.className);
  M.ctx.window.event = undefined; }
{ const M = monde({ lente: true }); M.ctx.photoPlein(M.vign, 'Photo'); const img = M.img();
  vrai('une photo pas encore chargée reste invisible et attend son chargement (rien ne se mesure sur 0 px)', img.style.opacity === '0' && typeof img.onload === 'function');
  img.naturalWidth = 1200; img.complete = true; img.onload(); M.tourner();
  vrai('… chargée, elle paraît et entre', img.style.opacity === '' && M.ov().classList.contains('vu')); }
{ const M = monde(); M.ctx.photoPlein('data:image/png;base64,BBBB'); M.tourner();
  vrai('ouverte par une simple adresse (sans vignette), elle s’ouvre aussi, titre « Photo » à l’oreille', !!M.img() && M.img().src === 'data:image/png;base64,BBBB' && M.ov().getAttribute('aria-label') === 'Photo');
  M.ctx.photoPlein(''); vrai('une adresse vide n’ouvre rien de plus (pas de seconde couche)', M.corps.enfants.filter(x => x.classList.contains('vph')).length === 1); }

{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  vrai('une grande photo prend toute la largeur utile, proportions gardées (370 × 277)', M.img().style.width === '370px' && M.img().style.height === '277px', [M.img().style.width, M.img().style.height]);
  vrai('l’écran qui tourne recalcule sa taille (écouteur resize), et l’écouteur part avec elle', (M.J.fen.resize || []).length === 1 && (M.touche('Escape'), M.tourner(), !(M.J.fen.resize || []).length)); }
{ const M = monde({ petite: true }); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  vrai('⛔ une PETITE photo (300 × 200) est agrandie à l’écran (370 × 246), au lieu de rester un timbre au milieu du noir', M.img().style.width === '370px' && M.img().style.height === '246px', [M.img().style.width, M.img().style.height]); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  const types = ['touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointermove', 'pointerup', 'pointercancel'];
  const passe = types.filter(t => { const e = M.ev({ touches: [], changedTouches: [{ clientX: 0, clientY: 0 }], target: M.ov(), pointerType: 'touch' }); M.tire(M.ov(), t, e); return !e.garde; });
  vrai('⛔ aucun geste ne traverse la couche vers l’application (balayage entre rubriques, tiroir, planning) : les huit événements s’arrêtent à elle', !passe.length, passe); }

console.log('\n── 2842 · 2. fermer : Échap, « Fermer », le fond, le retour système ──');
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  const e = M.touche('Escape');
  vrai('Échap ferme la visionneuse, et elle seule (la fenêtre dessous ne reçoit pas la touche)', e.arrete === true && e.empeche > 0 && M.ctx.photoPleinOuvert() === false);
  vrai('pendant la sortie, la couche porte .feuille-sort (le clic qui tomberait dessus est avalé)', M.ov().classList.contains('feuille-sort') && !M.ov().classList.contains('vu'));
  const d = M.t();
  vrai('⛔ elle repart VERS la vignette (même centre, même surface)', Math.abs(BOITE.cx + d.x - 60) < 0.2 && Math.abs(BOITE.cy + d.y - 640) < 0.2 && d.s < 0.3, d);
  vrai('le focus revient à la vignette', M.J.actif === M.vign);
  M.tourner();
  vrai('la sortie finie, la couche est retirée du document et l’écouteur de clavier aussi', !M.ov() && !(M.J.doc.keydown || []).length && M.P() === null); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.ov().querySelector('.vph-fermer').onclick();
  vrai('« Fermer » ferme', M.ctx.photoPleinOuvert() === false); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.tire(M.ov(), 'click', M.ev({ target: M.img() }));
  vrai('un clic SUR la photo ne ferme pas', M.ctx.photoPleinOuvert() === true);
  M.tire(M.ov(), 'click', M.ev({ target: M.ov() }));
  vrai('un clic sur le fond ferme', M.ctx.photoPleinOuvert() === false); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  const s = M.doigt.pose([[200, 120]]); M.doigt.leve([], [200, 120]);
  vrai('un toucher sur le fond ferme, et le toucher est retenu dès son début (aucun clic ne traverse vers la vignette)', M.ctx.photoPleinOuvert() === false && s.empeche > 0); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[195, 444]], M.img()); M.doigt.leve([], [195, 444], M.img());
  vrai('un toucher SUR la photo ne ferme pas', M.ctx.photoPleinOuvert() === true);
  const t2 = M.doigt.pose([[40, 30]], M.ov().querySelector('.vph-tete'));
  vrai('un toucher sur la barre du haut n’est pas retenu (le bouton « Fermer » reçoit son clic)', t2.empeche === 0); }
{ const m = /\nfunction retourFerme\(fenetresSeules\)\{\s*([^\n]*)/.exec(CODE);
  vrai('le retour système (retourFerme) ferme la visionneuse D’ABORD, avant toute fenêtre', !!m && /^if\(photoPleinOuvert\(\)\)\{ photoPleinFermer\(\); return 'fenetre'; \}/.test(m[1]), m && m[1]); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  const e = M.touche('Tab');
  vrai('Tab ne sort pas de la visionneuse (le focus reste sur « Fermer »)', e.empeche > 0 && M.J.actif.classList.contains('vph-fermer')); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner(); M.vign.parent = null; M.corps.enfants = M.corps.enfants.filter(x => x !== M.vign);
  M.ctx.photoPleinFermer();
  vrai('la vignette disparue (liste redessinée), la photo s’efface sur place au lieu de viser le vide', M.img().style.opacity === '0' && Math.abs(M.t().x) < 1); }

console.log('\n── 2842 · 3. lire : pincer, double toucher, promener ──');
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  /* le point de la photo sous les doigts : (245, 444), soit 50 px à droite du centre */
  M.doigt.pose([[195, 444], [295, 444]], M.img());
  M.doigt.bouge([[145, 444], [345, 444]]);
  const d = M.t();
  vrai('deux doigts qui s’écartent du double : la photo double', Math.abs(d.s - 2) < 1e-3, d);
  vrai('⛔ le point de la photo pris entre les doigts reste entre les doigts (le zoom se fait LÀ, pas au centre)', Math.abs(BOITE.cx + d.x + 50 * d.s - (245 + 0)) < 0.6 || Math.abs((245 - BOITE.cx - d.x) / d.s - 50) < 0.5, d);
  M.doigt.bouge([[95, 444], [395, 444]]);
  M.doigt.leve([], [395, 444], M.img());
  M.tourner();
  const f = M.t(), deb = [(BOITE.w * f.s - W) / 2, Math.max(0, (BOITE.h * f.s - H) / 2)];
  vrai('relâchée, elle reste agrandie et revient dans ses bords (aucun vide à côté)', f.s > 2.5 && Math.abs(f.x) <= deb[0] + 0.1 && Math.abs(f.y) <= deb[1] + 0.1, [f, deb]);
  vrai('elle est marquée « agrandie » (curseur de saisie au bureau)', M.ov().classList.contains('zoom')); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[195, 444], [295, 444]], M.img()); M.doigt.bouge([[220, 444], [270, 444]]); M.doigt.leve([], [270, 444], M.img()); M.tourner();
  vrai('pincée en dessous de sa taille, elle revient à sa taille, centrée', M.t().s === 1 && M.t().x === 0 && M.t().y === 0, M.t()); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[240, 444]], M.img()); M.doigt.leve([], [240, 444], M.img(), 60);
  M.doigt.pose([[242, 446]], M.img()); M.doigt.leve([], [242, 446], M.img(), 80);
  const d = M.t();
  vrai('un double toucher agrandit à 2,5×', Math.abs(d.s - 2.5) < 1e-3, d);
  vrai('… autour du point touché (il reste sous le doigt, ou au plus près si le bord l’en empêche)', d.x < 0, d);
  M.doigt.pose([[200, 444]], M.img()); M.doigt.leve([], [200, 444], M.img(), 60);
  M.doigt.pose([[200, 444]], M.img()); M.doigt.leve([], [200, 444], M.img(), 80);
  vrai('… un second double toucher la rend à sa taille', M.t().s === 1 && M.t().x === 0, M.t()); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[240, 444]], M.img()); M.doigt.leve([], [240, 444], M.img(), 60);
  M.doigt.pose([[240, 444]], M.img()); M.doigt.leve([], [240, 444], M.img(), 500);
  vrai('deux touchers espacés (plus de 320 ms) ne sont pas un double toucher', M.t().s === 1, M.t()); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[195, 444]], M.img()); M.doigt.leve([], [195, 444], M.img(), 60); M.doigt.pose([[195, 444]], M.img()); M.doigt.leve([], [195, 444], M.img(), 80);
  const s = M.t().s, deb = (BOITE.w * s - W) / 2;
  M.doigt.pose([[195, 444]], M.img());
  M.doigt.bouge([[175, 444]]); M.doigt.bouge([[95, 444]]);
  vrai('agrandie, un doigt la promène 1:1', Math.abs(M.t().x - -100) < 0.5 && M.t().s === s, M.t());
  M.doigt.bouge([[195 + deb + 200, 444]]);
  const x = M.t().x;
  vrai('⛔ au-delà de son bord, elle CÈDE (elastique) au lieu de suivre ou de buter', x > deb && x < deb + 90 && x < 200 + deb, [x, deb]);
  M.doigt.leve([], [195 + deb + 200, 444], M.img()); M.tourner();
  vrai('relâchée, elle revient à son bord', Math.abs(M.t().x - deb) < 0.1, [M.t().x, deb]);
  vrai('… et ne s’est pas fermée (glisser une photo agrandie n’est pas la renvoyer)', M.ctx.photoPleinOuvert() === true); }

console.log('\n── 2842 · 3 bis. au repos, le fond est plein ; tirée, l’application reparaît et l’en-tête s’efface ──');
{ const C = require('./outils-cascade-app.js');
  const TOUT = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
  const g = (ch, prop) => { const x = C.gagnant(TOUT.filter(q => !/[\[:]/.test(q.sel.replace(/:(focus|active|hover)[\w-]*/g, ''))), ch, 390, prop); return x ? x.v.replace(/\s*!important\s*$/, '').trim() : null; };
  const html = { tag: 'html', classes: [], attrs: {} }, body = { tag: 'body', classes: [], attrs: {} };
  const vu = { tag: 'div', classes: ['vph', 'vu'], attrs: {} }, tire = { tag: 'div', classes: ['vph', 'vu', 'tire'], attrs: {} }, tete = { tag: 'div', classes: ['vph-tete'], attrs: {} };
  const f = g([html, body, vu], 'background-color');
  vrai('⛔ au repos, le fond de la visionneuse est PLEIN (' + f + ') — à 94 %, la barre de l’application transparaissait sous « Fermer »', /^(#000(000)?|black|rgba?\(0,\s*0,\s*0(,\s*1)?\))$/.test(f || ''), f);
  vrai('l’en-tête se voit au repos', g([html, body, vu, tete], 'opacity') === '1');
  vrai('… et s’efface quand on tire la photo', g([html, body, tire, tete], 'opacity') === '0', g([html, body, tire, tete], 'opacity')); }

console.log('\n── 2842 · 4. tirée vers le bas, elle part ; lâchée tôt, elle revient ──');
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[195, 444]], M.img());
  for (let k = 1; k <= 8; k++) M.doigt.bouge([[195, 444 + k * 10]], 60);
  const d = M.t(), fond = M.ov().style.backgroundColor;
  vrai('la photo suit le doigt (1:1) et rapetisse un peu', Math.abs(d.y - 80) < 0.5 && d.s < 1 && d.s > 0.9, d);
  vrai('le fond s’éclaircit à mesure, depuis le noir plein (80 px sur une demi-hauteur d’écran : ' + (1 - 80 / (H * .5)).toFixed(3) + ')', /^rgba\(0,0,0,0\.[5-8]\d*\)$/.test(fond) && Math.abs(parseFloat(fond.split(',')[3]) - (1 - 80 / (H * .5))) < .006, fond);
  vrai('la transition est coupée pendant le geste (la photo est sous le doigt, pas en retard sur lui)', M.img().style.transition === 'none');
  vrai('tirée, l’en-tête s’efface (classe « tire ») : la photo seule suit le doigt, comme dans Photos', M.ov().classList.contains('tire'));
  M.doigt.leve([], [195, 524], M.img(), 200); M.tourner();
  vrai('un doigt lent, lâché à 80 px, après un arrêt : elle revient, le fond redevient noir', M.ctx.photoPleinOuvert() === true && M.t().y === 0 && M.t().s === 1 && M.ov().style.backgroundColor === '', [M.t(), M.ov().style.backgroundColor]);
  vrai('… et l’en-tête revient', !M.ov().classList.contains('tire')); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[195, 444]], M.img());
  for (let k = 1; k <= 5; k++) M.doigt.bouge([[195, 444 + k * 18]], 12);
  M.doigt.leve([], [195, 534], M.img(), 4);
  vrai('⛔ un coup vif et court (90 px à 1 500 px/s) : elle part — c’est la vitesse projetée qui décide', M.ctx.photoPleinOuvert() === false); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[195, 444]], M.img());
  for (let k = 1; k <= 10; k++) M.doigt.bouge([[195, 444 + k * 30]], 60);
  M.doigt.leve([], [195, 744], M.img(), 300);
  vrai('tirée loin (300 px, plus du tiers de l’écran), même lentement : elle part', M.ctx.photoPleinOuvert() === false); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[195, 444]], M.img()); for (let k = 1; k <= 6; k++) M.doigt.bouge([[195, 444 - k * 40]], 16);
  const y = M.t().y;
  vrai('vers le haut, elle résiste (elastique) : 240 px tirés, moins de 90 affichés', y < 0 && y > -90, y);
  M.doigt.leve([], [195, 204], M.img(), 4); M.tourner();
  vrai('… et ne part jamais par le haut', M.ctx.photoPleinOuvert() === true && M.t().y === 0); }
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  M.doigt.pose([[195, 444]], M.img()); M.doigt.bouge([[195, 448]]); M.doigt.leve([], [195, 448], M.img());
  vrai('un tremblement de 4 px reste un toucher (pas un glissement)', M.ctx.photoPleinOuvert() === true && M.t().y === 0); }

console.log('\n── 2842 · 5. le bureau : Ctrl + molette, molette, souris ──');
{ const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  const e0 = M.tire(M.ov(), 'wheel', M.ev({ deltaY: 40, deltaX: 0, ctrlKey: false, clientX: 195, clientY: 444 }));
  vrai('la molette ne fait pas défiler la page dessous', e0.empeche > 0 && M.t().s === 1);
  M.tire(M.ov(), 'wheel', M.ev({ deltaY: -100, deltaX: 0, ctrlKey: true, clientX: 245, clientY: 444 }));
  const d = M.t();
  vrai('Ctrl + molette (le pincement du pavé tactile) agrandit, autour du pointeur', d.s > 2.5 && d.s < 2.8 && d.x < 0, d);
  M.tourner();
  M.tire(M.ov(), 'wheel', M.ev({ deltaY: 30, deltaX: 0, ctrlKey: false, clientX: 195, clientY: 444 }));
  vrai('agrandie, la molette la promène', M.t().y < d.y + 1 || M.t().y !== d.y, [M.t().y, d.y]);
  const avant = M.t().x;
  const pd = M.ev({ pointerType: 'mouse', clientX: 100, clientY: 400 }); M.tire(M.img(), 'pointerdown', pd);
  (M.J.fen.pointermove || []).forEach(f => f({ clientX: 140, clientY: 400 }));
  vrai('la souris la saisit et la promène', Math.abs(M.t().x - (avant + 40)) < 0.6 || M.t().x !== avant, [avant, M.t().x]);
  (M.J.fen.pointerup || []).slice().forEach(f => f({}));
  vrai('… et la lâche (plus d’écouteur qui traîne)', !(M.J.fen.pointermove || []).length);
  vrai('… écouteurs posés en CAPTURE (la couche arrête la propagation : sans ça ils ne recevraient rien)', M.J.fenCap && M.J.fenCap.pointermove === true && M.J.fenCap.pointerup === true, M.J.fenCap);
  M.tire(M.img(), 'dblclick', M.ev({ clientX: 195, clientY: 444 }));
  vrai('un double clic la rend à sa taille', M.t().s === 1); }

console.log('\n── 2842 · 6. animations réduites ──');
{ const M = monde({ sobre: true }); M.ctx.photoPlein(M.vign, 'Photo');
  vrai('elle ne part pas de la vignette : elle est à sa place dès l’ouverture', M.t().s === 1 && M.t().x === 0);
  M.tourner(); M.touche('Escape');
  vrai('… et à la fermeture elle disparaît sans mouvement, tout de suite', !M.ov() && M.P() === null); }

console.log('\n── 2842 · 7. toutes les vignettes de la page passent par la visionneuse ──');
const IMGS = [...CODE.matchAll(/<img\b[^>]*\bonclick="([^"]*)"/g)].map(m => m[1]);
vrai('(population) au moins 20 images cliquables dans la page', IMGS.length >= 20, IMGS.length);
const ouvreAilleurs = IMGS.filter(x => /window\.open/.test(x));
vrai('⛔ aucune image n’ouvre un onglet (window.open)', !ouvreAilleurs.length, ouvreAilleurs);
const PP = (CODE.match(/photoPlein\(this[,)]|photoPlein\(this\.querySelector\('img'\)/g) || []).length;
vrai('au moins 20 appels à photoPlein depuis une vignette', PP >= 20, PP);
vrai('aucun bouton ne passe l’adresse d’une photo à window.open', !/window\.open\('\$\{(a\.photo|ph|p\.photo|b\.photo)\}'\)/.test(CODE));
vrai('la visionneuse du Contrôle (dans #overlay2) a disparu : une seule visionneuse', !/ctrlPhotoPlein/.test(CODE) && (CODE.match(/\nfunction photoPlein\(/g) || []).length === 1);
vrai('les noms ne se marchent pas dessus : _vph, une seule déclaration ; le recadrage de profil garde _pp', (CODE.match(/\nlet _vph=null;/g) || []).length === 1 && /\nvar _pp=null;/.test(CODE));

console.log('\n── 2842 · 8. la feuille ──');
{ const C = require('./outils-cascade-app.js'); const TOUT = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
  /* ⚠️ l'outil tient un sélecteur d'attribut à valeur ([onclick^="…"]) pour vrai, et coupe naïvement aux virgules : on ne garde
     que les règles dont le sélecteur est entier (crochets et parenthèses appariés) et dont chaque attribut à valeur est TENU par
     un élément de la chaîne (le recadrage de test-2837) */
  const ATTR = /\[([\w-]+)\s*([~|^$*]?=)\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^\]\s]*))\s*\]/g;
  const entier = (x) => { let a = 0, b = 0; for (const c of x) { if (c === '[') a++; else if (c === ']') a--; else if (c === '(') b++; else if (c === ')') b--; if (a < 0 || b < 0) return false; } return !a && !b; };
  const tenus = (sel, ch) => [...sel.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '').matchAll(ATTR)].every(m => { const v = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
    return ch.some(e => { const x = (e.attrs || {})[m[1]]; if (x === undefined) return false; return m[2] === '=' ? x === v : m[2] === '^=' ? x.startsWith(v) : m[2] === '$=' ? x.endsWith(v) : m[2] === '*=' ? x.includes(v) : true; }); });
  const gg = (ch, prop) => C.gagnant(TOUT.filter(r => entier(r.sel) && tenus(r.sel, ch)), ch, 390, prop);
  const html = { tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': 'dark', 'data-verre': '1', 'data-marque': 'teamop', lang: 'fr' } };
  const corps = { tag: 'body', classes: [], attrs: {} };
  const g = (cl, prop, extra) => gg([html, corps].concat(extra || []).concat([{ tag: 'div', classes: cl, attrs: {} }]), prop);
  const z = g(['vph'], 'z-index'), z2 = gg([html, corps, { tag: 'div', classes: ['overlay', 'open'], attrs: { id: 'overlay2' }, id: 'overlay2' }], 'z-index');
  vrai('la couche est au-dessus des fenêtres secondaires (#overlay2)', !!z && !!z2 && +z.v > +z2.v, [z && z.v, z2 && z2.v]);
  const ta = g(['vph'], 'touch-action');
  vrai('le doigt lui appartient (touch-action:none : ni défilement ni zoom de la page dessous)', !!ta && ta.v === 'none', ta && ta.v);
  const bg = g(['vph', 'vu'], 'background-color');
  vrai('ouverte, son fond est noir plein (partie W : à 94 %, l’application transparaissait)', !!bg && /^(#000(000)?|black|rgba?\(0,\s*0,\s*0(,\s*1)?\))$/.test(bg.v.trim()), bg && bg.v);
  const bouton = [html, corps, { tag: 'div', classes: ['vph'], attrs: {} }, { tag: 'div', classes: ['vph-tete'], attrs: {} }, { tag: 'button', classes: ['vph-fermer'], attrs: { type: 'button' } }];
  const mh = gg(bouton, 'min-height');
  vrai('« Fermer » fait au moins 44 px de haut', !!mh && (parseFloat(mh.v) >= 44 || /var\(--rf-tap\)/.test(mh.v) && /--rf-tap:44px/.test(BRUT)), mh && mh.v);
  const fond = gg(bouton, 'background') || gg(bouton, 'background-color');
  vrai('« Fermer » garde son fond clair sur le noir (aucune règle des boutons ne l’éteint)', !!fond && /rgba\(255,\s*255,\s*255/.test(fond.v), fond && [fond.sel, fond.v]); }
const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
vrai('la couche qui reçoit le focus ne dessine pas de contour', /\.vph:focus\{outline:none\}/.test(CSS));
vrai('animations réduites : la couche, la photo et la barre n’ont plus de transition', /@media \(prefers-reduced-motion: reduce\)\{\s*\.vph,\.vph-img,\.vph-tete\{transition:none!important\}/.test(CSS));
vrai('le survol de « Fermer » ne vit que sous une souris (@media (hover:hover))', /@media \(hover:hover\)\{\s*\.vph-fermer:hover\{/.test(CSS) && !/(^|[}\s])\.vph-fermer:hover\{/.test(CSS.replace(/@media \(hover:hover\)\{\s*\.vph-fermer:hover\{[^}]*\}\s*\}/, '')));

console.log('\n── 2842 · 9. l’écran de connexion ne se dessine jamais sous une photo ouverte (relecture adverse, partie X) ──');
/* la visionneuse (420) est une couche à elle : la déconnexion et le retrait du compte (compteRetire) dessinaient l'écran de
   connexion (200) DESSOUS — la photo d'un client restait affichée, le formulaire inaccessible. renderLogin la retire, quel que
   soit le chemin qui y mène. */
{ const rl = (/\nfunction renderLogin\(\)\{[^\n]*/.exec(CODE) || [''])[0];
  vrai('renderLogin commence par retirer la visionneuse (vphRetirer), avant de dessiner quoi que ce soit', /^\nfunction renderLogin\(\)\{ try\{ vphRetirer\(\); \}catch\(e\)\{\}/.test(rl), rl.slice(0, 120));
  for (const f of ['logout', 'compteRetire']) { const m = new RegExp('\\nfunction ' + f + '\\([^)]*\\)\\{[\\s\\S]*?\\n(?=function |/\\*)').exec(CODE);
    vrai(f + ' passe par renderLogin (donc retire la visionneuse)', !!m && /renderLogin\(\)/.test(m[0])); }
  const M = monde(); M.ctx.photoPlein(M.vign, 'Photo'); M.tourner();
  vrai('(population) la visionneuse est ouverte', M.ctx.photoPleinOuvert() === true);
  M.ctx.vphRetirer(); vrai('… vphRetirer la retire tout de suite, avec ses écouteurs (clavier, rotation)', M.ctx.photoPleinOuvert() === false && !(M.J.doc.keydown || []).length && !(M.J.fen.resize || []).length, [M.ctx.photoPleinOuvert(), (M.J.doc.keydown || []).length, (M.J.fen.resize || []).length]); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
