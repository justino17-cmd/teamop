// Matériel, étape 8 — LES CORRECTIONS DE LA RELECTURE « TECHNICIEN ET TÉLÉPHONE » (materiel-relecture-technicien.json, technicien-01 à technicien-10).
// Chaque contrôle JOUE le geste du rapport sur la vraie page et lit ce que l'écran DIT ; chacun cite son numéro (technicien-NN).
// Usage : node materiel-technicien-corrections.js [profil] → « N ✓ · M ✗ ». Profil par défaut : iphone (le 01 rejoue aussi le profil « petit », 320 px).
const L = require('../lib.js');
(async () => {
  const v = L.v, profil = process.argv[2] || 'iphone';
  // ── technicien-01 : « commander » tient en entier dans la tuile (320 px, jour et nuit) ──
  for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil: 'petit', nuit, qui: 'marc' }), p = c.p;
    await L.aller(p, 'stock'); await L.calme(p, 400);
    const t = await p.evaluate(() => { const k = document.querySelector('.ms-kpis .kpi span'); if (!k) return null; const r = document.createRange(); r.selectNodeContents(k); const mots = (k.textContent.match(/\S+/g) || []), lh = parseFloat(getComputedStyle(k).lineHeight) || 16;
      // une ligne par rectangle de texte distinct : un mot coupé fait paraître une ligne de plus
      const lignes = new Set([...r.getClientRects()].map(q => Math.round(q.top))).size; return { txt: k.textContent, lignes, mots: mots.length, larg: Math.round(k.getBoundingClientRect().width), plein: k.scrollWidth <= k.clientWidth + 1, nc: cmdNbACommander() }; });
    v('technicien-01 (320 px, ' + (nuit ? 'nuit' : 'jour') + ') : population — la tuile « à commander » existe (' + (t && t.nc) + ')', !!t && t.nc > 0, t);
    v('technicien-01 (320 px, ' + (nuit ? 'nuit' : 'jour') + ') : « ' + (t && t.txt) + ' » : une ligne par mot au plus (' + (t && t.lignes) + ' lignes pour ' + (t && t.mots) + ' mots), jamais de mot coupé', !!t && t.lignes <= t.mots && t.plein, t);
    await L.fin(c);
  }
  // ── Mon camion (technicienne) : 02, 06, 07 ──
  const c = await L.ouvrir({ profil, qui: 'sm' }), p = c.p, R = (f, a) => p.evaluate(f, a);
  const toucher = async s => { const ok = await L.toucher(c, s); if (!ok) L.v('geste impossible : ' + s, false); return ok; };
  await L.aller(p, 'moncamion'); await L.calme(p, 500);
  // 02 : la phrase de contrôle se lit au-dessus du bouton, dans le pied qui reste visible
  await toucher('[data-mat="usage"]'); await L.calme(p, 400);
  await p.fill('#mat-q', 'filtre à charbon'); await L.calme(p, 350); await toucher('#calque [data-mat^="ajoute|"]'); await L.calme(p, 400);
  const f2 = await R(() => { const ph = document.querySelector('#calque .fo-pied .mat-phrase'), b = document.querySelector('#calque [data-mat="envoyer"]'); const rp = ph && ph.getBoundingClientRect(), rb = b && b.getBoundingClientRect(); return { txt: ph ? ph.textContent : null, vu: !!rp && rp.bottom <= innerHeight && rp.top >= 0, dessus: !!rp && !!rb && rp.bottom <= rb.top + 1, h: rp && Math.round(rp.height) }; });
  v('technicien-02 : « J\'ai utilisé » : la phrase « Tu notes : … » est DANS le pied (visible sans défiler) et au-dessus du bouton noir (« ' + (f2.txt || '').slice(0, 50) + ' »)', /^Tu notes/.test(f2.txt || '') && f2.vu && f2.dessus, f2);
  await L.ranger(p);
  await toucher('[data-mat="prise"]'); await L.calme(p, 400);
  const f2b = await R(() => { const ph = document.querySelector('#calque .fo-pied .mat-phrase'); const rp = ph && ph.getBoundingClientRect(); return { txt: ph ? ph.textContent : null, vide: !!ph && ph.textContent === '', vu: !ph || ph.textContent === '' || (rp.bottom <= innerHeight && rp.top >= 0), lignes: document.querySelectorAll('#calque .mat-ligne, #calque .mat-l').length }; });
  v('technicien-02 : « J\'ai pris à l\'atelier » : la phrase (ou son absence) ne pousse rien hors de la feuille', f2b.vu, f2b);
  await L.ranger(p);
  // 06 : le surtitre de « Il me manque une pièce » est toujours « Mon camion »
  await R(() => matManque({ inter: 'i1' })); await L.calme(p, 400);
  const s6 = await R(() => ({ sur: (document.querySelector('#calque .surtitre') || {}).textContent, inter: (MAT.M || {}).inter }));
  v('technicien-06 : le surtitre de « Il me manque une pièce » est « Mon camion » même avec une intervention préchoisie (' + s6.inter + ')', s6.sur === 'Mon camion' && !!s6.inter, s6);
  await L.ranger(p);
  // 07 : après « Je l'ai pris » puis Annuler, le journal dit « sa prise », jamais « ta prise »
  await L.aller(p, 'moncamion'); await L.calme(p, 400);
  const j0 = await R(() => JOURNAL.length);
  await R(() => { const b = document.querySelector('[data-vis="camion-manque"] [data-mat^="pris|"]'); if (b) b.click(); }); await L.calme(p, 500);
  const toast = await R(() => (document.getElementById('toast') || {}).textContent || '');
  await R(() => { const b = [...document.querySelectorAll('#toast button')].find(e => /Annuler/.test(e.textContent)); if (b) b.click(); }); await L.calme(p, 500);
  const j = await R(() => ({ n: JOURNAL.length, dern: (JOURNAL[JOURNAL.length - 1] || {}).el || null, action: (JOURNAL[JOURNAL.length - 1] || {}).action, toast: (document.getElementById('toast') || {}).textContent || '' }));
  v('technicien-07 : population — le geste a laissé du journal (' + j0 + ' → ' + j.n + ')', j.n > j0, j);
  v('technicien-07 : le journal du gérant dit « a annulé sa prise à l\'atelier » (« ' + (j.dern && j.dern.lib) + ' »), le toast garde « ta prise »', !!j.dern && /^sa prise/.test(j.dern.lib) && /ta prise/.test(j.toast), { dern: j.dern, toast: j.toast });
  // 03 / 09 : la fiche d'intervention de la technicienne
  await L.aller(p, 'inter-x-i1'); await L.calme(p, 600);
  const i3 = await R(() => { const n = document.getElementById('p-nom'); if (n) n.scrollIntoView({ block: 'center' }); const r = n && n.getBoundingClientRect(), q = document.getElementById('p-q'), b = document.querySelector('[data-action="pieceAjout"]'); const ph = n ? n.placeholder : ''; return { larg: r && Math.round(r.width), ph, ligne: r && q ? Math.round(q.getBoundingClientRect().top) - Math.round(r.top) : null, vw: innerWidth }; });
  v('technicien-03 : le champ « Chercher dans le stock… » prend sa ligne entière (' + i3.larg + ' px sur ' + i3.vw + '), l\'invite se lit', !!i3.larg && i3.larg >= i3.vw - 80, i3);
  const t9 = await R(() => { const t = document.getElementById('contenu').innerText; return { catalogue: /prix du catalogue/.test(t), aucun: /Aucun prix ici/.test(t), coche: /Coche ce que tu as posé : le bureau le met sur la facture/.test(t) }; });
  v('technicien-09 : un seul message sur les prix (« Aucun prix ici »), la carte des pièces prévues ne promet plus « le prix du catalogue »', !t9.catalogue && t9.aucun, t9);
  // 04 : le code mort a disparu
  const m4 = await R(() => ({ fn: ['prUsage', 'cmdDansFiltre', 'prOuEst', 'pdxPlu', 'pdxAchatsArticle', 'pdxCourbe'].filter(n => typeof window[n] !== 'undefined'), css: [...document.styleSheets].some(s => { try { return [...s.cssRules].some(r => /\.mc-garage\b/.test(r.cssText)); } catch (e) { return false; } }) }));
  v('technicien-04 : les six fonctions sans appelant et la règle .mc-garage sont supprimées', m4.fn.length === 0 && !m4.css, m4);
  v('aucune erreur de page (technicienne)', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  // ── le gérant au téléphone : 10 (bandeau d'une rangée) ──
  const g = await L.ouvrir({ profil, qui: 'marc' }), pg = g.p, Rg = (f, a) => pg.evaluate(f, a);
  await L.aller(pg, 'stock'); await L.calme(pg, 450);
  const b10 = await Rg(() => { const b = document.querySelector('.ms-bandeau'), l = document.querySelector('.ms-liste .ms-l'), rb = b && b.getBoundingClientRect(), rl = l && l.getBoundingClientRect(); const tou = [...document.querySelectorAll('#contenu button, #contenu a, #contenu input, #contenu select')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && rl && r.top < rl.top && getComputedStyle(e).visibility !== 'hidden'; }).length;
    return { env: matEnvoisAAccepter().n, bandeauH: rb && Math.round(rb.height), premiere: rl && Math.round(rl.top), h: innerHeight, touchables: tou, voir: !!document.querySelector('.ms-bd .btn[data-ms="envois"]') && getComputedStyle(document.querySelector('.ms-bd .btn[data-ms="envois"]')).display !== 'none', texteBouton: !!document.querySelector('.ms-bd-t[data-ms="envois"]'), tout: !!document.querySelector('.ms-bd .btn[data-ms="toutacc"]') }; });
  v('technicien-10 : population — le bandeau « envois à accepter » est affiché (' + b10.env + ')', b10.env > 0 && b10.bandeauH > 0, b10);
  v('technicien-10 : le bandeau tient sur une rangée (' + b10.bandeauH + ' px), « Voir » n\'existe plus au téléphone, le texte ouvre les envois, « Tout accepter » reste', b10.bandeauH <= 90 && !b10.voir && b10.texteBouton && b10.tout, b10);
  v('technicien-10 : la première ligne d\'article commence à ' + b10.premiere + ' px sur ' + b10.h + ' (avant : 626 / 844) et au plus 12 touchables la précèdent (' + b10.touchables + ')', b10.premiere <= 0.7 * b10.h && b10.touchables <= 12, b10);
  const ouv = await Rg(() => { const b = document.querySelector('.ms-bd-t[data-ms="envois"]'); if (b) b.click(); return new Promise(r => setTimeout(() => r(!!document.querySelector('#calque .panneau')), 400)); });
  v('technicien-10 : toucher le texte du bandeau ouvre la feuille des envois', ouv === true);
  v('aucune erreur de page (gérant)', g.err.length === 0, g.err.slice(0, 3));
  await L.fin(g); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); L.v('le parcours a pu se jouer jusqu\'au bout (' + String(e.message).split('\n')[0].slice(0, 160) + ')', false); try { L.fermer(); } catch (x) {} process.exit(L.bilan() ? 1 : 2); });
