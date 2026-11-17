// Recontrôle adverse (materiel) — mesures isolées : la fiche d'atelier à 320 px, les invites de recherche, la fiche d'intervention du technicien, le bandeau, l'icône d'export, le registre.
const L = require('../lib.js');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/materiel-recontrole/';
(async () => {
  const profil = process.argv[2] || 'petit', nuit = process.argv[3] === '1', etiq = process.env.ETIQ || 'tete';
  const out = {};
  const tag = etiq + '-' + profil + (nuit ? '-n' : '-j');
  // ── gérant
  { const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p, R = (f, a) => p.evaluate(f, a);
    await L.aller(p, 'boxes'); await L.calme(p, 400);
    await R(() => document.querySelector('[data-md="fiche|atelier"]').click()); await L.calme(p, 450);
    out.kpis = await R(() => [...document.querySelectorAll('#calque .md-kpis .kpi')].map(k => { const b = k.querySelector('b'), r = b.getBoundingClientRect(), rk = k.getBoundingClientRect(); return { t: b.textContent, w: Math.round(r.width), sw: b.scrollWidth, tuile: Math.round(rk.width), sortDe: Math.round(r.left + b.scrollWidth - rk.right) }; }));
    await L.capture(c, CAP + 'div-kpis-' + tag + '.png'); await L.ranger(p);
    // invites de recherche
    out.invites = {};
    const mesure = () => R(() => [...document.querySelectorAll('#contenu input[placeholder], #calque input[placeholder]')].filter(i => i.offsetParent).map(i => { const cs = getComputedStyle(i), cv = document.createElement('canvas').getContext('2d'); cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily; return { ph: i.placeholder, texte: Math.round(cv.measureText(i.placeholder).width), champ: Math.round(i.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) }; }).filter(o => o.texte > o.champ));
    await L.aller(p, 'stock'); await L.calme(p, 300); out.invites.stock = await mesure();
    await L.aller(p, 'produits'); await R(() => { prVue = 'articles'; rendre(); }); await L.calme(p, 350); out.invites.articles = await mesure(); await L.capture(c, CAP + 'div-articles-' + tag + '.png');
    await R(() => { prVue = 'commandes'; rendre(); }); await L.calme(p, 300); out.invites.commandes = await mesure();
    await R(() => { prVue = 'fournisseurs'; rendre(); }); await L.calme(p, 300); out.invites.fournisseurs = await mesure();
    await L.aller(p, 'boxes'); await L.calme(p, 300); out.invites.depots = await mesure();
    await R(() => document.querySelector('[data-md="fiche|atelier"]').click()); await L.calme(p, 400); out.invites.atelier = await mesure(); await L.ranger(p);
    // bandeau « Avant les visites »
    await L.aller(p, 'boxes'); await L.calme(p, 300); await L.capture(c, CAP + 'div-depots-' + tag + '.png');
    // icône d'export et registre
    await L.aller(p, 'stock'); await L.calme(p, 300); await R(() => document.querySelector('[data-ms="plus"]').click()); await L.calme(p, 350); await L.capture(c, CAP + 'div-plus-' + tag + '.png');
    await R(() => [...document.querySelectorAll('.ctx button, [role="menu"] button')].find(e => /Registre des fluides/.test(e.textContent)).click()); await L.calme(p, 500);
    await L.capture(c, CAP + 'div-registre-' + tag + '.png');
    out.registre = await R(() => { const l = document.querySelector('#calque .ms-regl .mv-l .ms-lien'); return { liens: document.querySelectorAll('#calque .ms-regl .mv-l .ms-lien').length, lignes: document.querySelectorAll('#calque .ms-regl .mv-l').length, hauteurLien: l ? Math.round(l.getBoundingClientRect().height) : null, largeurLien: l ? Math.round(l.getBoundingClientRect().width) : null }; });
    out.erreurs = c.err.slice(0, 3); await L.fin(c); }
  // ── technicienne
  { const c = await L.ouvrir({ profil, nuit, qui: 'sm' }), p = c.p, R = (f, a) => p.evaluate(f, a);
    await L.aller(p, 'moncamion'); await L.calme(p, 400);
    out.nomCoupe = await R(() => [...document.querySelectorAll('#contenu .mc-l .fo-n b, #contenu .mc-liste .fo-n b, #contenu b')].filter(e => e.offsetParent && /\(0,5/.test(e.textContent)).map(e => { const r = document.createRange(); r.selectNodeContents(e); const rects = [...r.getClientRects()]; return { t: e.textContent, lignes: new Set(rects.map(q => Math.round(q.top))).size, w: Math.round(e.getBoundingClientRect().width) }; }));
    await L.aller(p, 'inter-x-i1'); await L.calme(p, 600);
    out.piece = await R(() => { const n = document.getElementById('p-nom'); if (n) n.scrollIntoView({ block: 'center' }); const q = document.getElementById('p-q'), b = document.querySelector('[data-action="pieceAjout"]'); return n ? { nom: Math.round(n.getBoundingClientRect().width), q: Math.round(q.getBoundingClientRect().width), btn: Math.round(b.getBoundingClientRect().width), vw: innerWidth } : null; });
    await L.calme(p, 300); await L.capture(c, CAP + 'div-fiche-pieces-' + tag + '.png');
    out.erreursSm = c.err.slice(0, 3); await L.fin(c); }
  console.log(tag, JSON.stringify(out));
  await L.fermer();
})().catch(e => { console.error(e); try { L.fermer(); } catch (x) {} process.exit(2); });
