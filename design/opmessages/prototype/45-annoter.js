/* ═══ DESSINER SUR LE PARTAGE D'ÉCRAN (idée 24) — Justin, 13 novembre 2026 : « dans réunion je veux pouvoir dessiner sur le partage d'écran,
   avec toutes les fonctions de Zoom ». Les outils d'annotation d'une réunion : déplacer, sélection, texte, dessin (crayon, surligneur, ligne,
   flèches, formes), tampons, projecteur (pointeur laser, flèche à mon nom, crayon qui s'efface), gomme, format (couleur, épaisseur), annuler,
   rétablir, effacer (tout / les miens / ceux des autres), enregistrer — ET le zoom de ce qui est partagé (boutons, molette, pincement).
   Tout est dans UN svg (document et dessins, viewBox 1000 × 562) : un dessin reste sur ce qu'il désigne à toute taille et à tout zoom.
   L'état vit dans S.salle.an ; la tuile du partage n'est jamais reconstruite par le rafraîchissement des tuiles (un trait en cours y survit). */
const AN_COUL = ['#e02f2f', '#f08c00', '#f5d000', '#1f9d48', '#2a6fdb', '#7d3c98', '#111111', '#ffffff'];
const AN_EP = [[2, 'Fin'], [4, 'Moyen'], [8, 'Épais']];
const AN_OUTILS = {
  dessin: [['crayon', 'Crayon'], ['surl', 'Surligneur'], ['ligne', 'Ligne'], ['fleche', 'Flèche'], ['dfleche', 'Double flèche'], ['rect', 'Rectangle'], ['ell', 'Ellipse'], ['rectp', 'Rectangle plein'], ['ellp', 'Ellipse pleine']],
  tampon: [['t-fleche', 'Flèche'], ['t-coche', 'Coche'], ['t-croix', 'Croix'], ['t-etoile', 'Étoile'], ['t-coeur', 'Cœur'], ['t-quest', 'Question']],
  projo: [['laser', 'Pointeur laser'], ['pointe', 'Flèche à mon nom'], ['ephem', 'Crayon qui s’efface']],
};
const AN_IC = {
  vue: 'M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3', select: 'M5 3l14 7-6 2-2 6z', texte: 'M5 5h14M12 5v14M9 19h6',
  crayon: 'M4 20l4-1L19 8l-3-3L5 16z', surl: 'M9 14l5-9 5 3-5 9zM9 14l-3 5h5l3-2', ligne: 'M5 19L19 5', fleche: 'M5 19L19 5M11 5h8v8', dfleche: 'M5 19L19 5M12 5h7v7M5 12v7h7',
  rect: 'M4 6h16v12H4z', ell: 'M12 5c5 0 8 3 8 7s-3 7-8 7-8-3-8-7 3-7 8-7z', rectp: 'M4 6h16v12H4z', ellp: 'M12 5c5 0 8 3 8 7s-3 7-8 7-8-3-8-7 3-7 8-7z',
  tampon: 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z', 't-etoile': 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.3 6L12 16.4 6.6 19.4l1.3-6L3.4 9.3l6-.7z',
  't-fleche': 'M3 12h14M12 6l6 6-6 6', 't-coche': 'M4 13l5 5L20 6', 't-croix': 'M5 5l14 14M19 5L5 19', 't-coeur': 'M12 20s-7-4.500-7-10a4 4 0 0 1 7-2.500A4 4 0 0 1 19 10c0 5.500-7 10-7 10z',
  't-quest': 'M8.500 9a3.500 3.500 0 1 1 5 3.200c-1 .6-1.500 1.200-1.500 2.300M12 18.500v.500',
  projo: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3', laser: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM12 2v3M12 19v3M2 12h3M19 12h3', pointe: 'M5 3l14 7-6 2-2 6z', ephem: 'M4 20l4-1L19 8l-3-3L5 16zM3 4h2M8 4h2M13 4h2',
  gomme: 'M8 20h11M5 15l8-9 6 5-7 9H8z', format: 'M12 3a9 9 0 1 0 0 18c1.500 0 2-1 2-2s-.500-2 1-2h2a4 4 0 0 0 4-4c0-5-4-8-9-8z',
  annuler: 'M9 7L4 12l5 5M4 12h10a5 5 0 0 1 0 10h-2', retablir: 'M15 7l5 5-5 5M20 12H10a5 5 0 0 0 0 10h2', effacer: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13', enreg: 'M12 4v11M7 10l5 5 5-5M5 20h14',
  plus: 'M12 5v14M5 12h14', moins: 'M5 12h14', ajuster: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', options: 'M5 12h.01M12 12h.01M19 12h.01',
};
const anIc = (k) => `<svg viewBox="0 0 24 24" fill="${k === 'rectp' || k === 'ellp' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${AN_IC[k] || AN_IC.crayon}"/></svg>`;
const AN = { doigts: new Map(), cur: null, pince: null, n: 0 };
function an() {
  const s = S.salle; if (!s) return null;
  if (!s.an) s.an = { grp: 'dessin', outil: 'crayon', der: { dessin: 'crayon', tampon: 't-coche', projo: 'laser' }, sous: null, coul: AN_COUL[0], ep: 4, z: 1, x: 0, y: 0, hist: [], refaire: [], ephem: [], tableau: false, autres: true, noms: true,
    /* un dessin de quelqu'un d'autre est déjà là : « effacer ceux des autres » et « afficher les noms » ont de quoi se montrer */
    items: [{ id: 'an0', par: 'sophie', t: 'ell', c: '#1f9d48', e: 4, x1: 780, y1: 342, x2: 956, y2: 392 }] };
  return s.an;
}
/* — géométrie — */
function anBoite(i) {
  if (i.pts) { const xs = i.pts.map((p) => p[0]), ys = i.pts.map((p) => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }
  if (i.t === 'texte') return [i.x, i.y - (14 + i.e * 4), i.x + Math.max(40, i.txt.length * (8 + i.e * 2.200)), i.y + 6];
  if (i.x1 === undefined) return [i.x - 22, i.y - 22, i.x + 22, i.y + 22];
  return [Math.min(i.x1, i.x2), Math.min(i.y1, i.y2), Math.max(i.x1, i.x2), Math.max(i.y1, i.y2)];
}
function anTouche(x, y) {
  const a = an(); for (let k = a.items.length - 1; k >= 0; k--) { const i = a.items[k], b = anBoite(i), m = 14;
    if (x < b[0] - m || x > b[2] + m || y < b[1] - m || y > b[3] + m) continue;
    if (i.pts && !i.pts.some((p) => Math.hypot(p[0] - x, p[1] - y) < 16 + i.e * 2)) continue;
    return i; }
  return null;
}
function anDeplacer(i, dx, dy) { if (i.pts) i.pts = i.pts.map((p) => [p[0] + dx, p[1] + dy]); else if (i.x1 !== undefined) { i.x1 += dx; i.x2 += dx; i.y1 += dy; i.y2 += dy; } else { i.x += dx; i.y += dy; } }
function anTete(x1, y1, x2, y2, e, c) { const g = Math.atan2(y2 - y1, x2 - x1), l = 10 + e * 3, o = 0.450;
  return `<path d="M${x2} ${y2}L${(x2 - l * Math.cos(g - o)).toFixed(1)} ${(y2 - l * Math.sin(g - o)).toFixed(1)}L${(x2 - l * Math.cos(g + o)).toFixed(1)} ${(y2 - l * Math.sin(g + o)).toFixed(1)}z" fill="${c}" stroke="${c}" stroke-width="${e / 2}" stroke-linejoin="round"/>`; }
function anItem(i, cls) {
  const a = an(), c = i.c, e = i.e, tr = `fill="none" stroke="${c}" stroke-width="${e}" stroke-linecap="round" stroke-linejoin="round"`; let h = '';
  if (i.pts) { const d = 'M' + i.pts.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + (i.pts.length === 1 ? 'l.1 0' : '');
    h = i.t === 'surl' ? `<path d="${d}" fill="none" stroke="${c}" stroke-width="${e * 4}" stroke-opacity=".38" stroke-linecap="butt" stroke-linejoin="round"/>` : `<path d="${d}" ${tr}/>`; }
  else if (i.t === 'ligne' || i.t === 'fleche' || i.t === 'dfleche') h = `<path d="M${i.x1} ${i.y1}L${i.x2} ${i.y2}" ${tr}/>` + (i.t !== 'ligne' ? anTete(i.x1, i.y1, i.x2, i.y2, e, c) : '') + (i.t === 'dfleche' ? anTete(i.x2, i.y2, i.x1, i.y1, e, c) : '');
  else if (i.t === 'rect' || i.t === 'rectp') { const b = anBoite(i); h = `<rect x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}" rx="4" ${i.t === 'rectp' ? `fill="${c}" fill-opacity=".85" stroke="${c}" stroke-width="${e}"` : tr}/>`; }
  else if (i.t === 'ell' || i.t === 'ellp') { const b = anBoite(i); h = `<ellipse cx="${(b[0] + b[2]) / 2}" cy="${(b[1] + b[3]) / 2}" rx="${(b[2] - b[0]) / 2}" ry="${(b[3] - b[1]) / 2}" ${i.t === 'ellp' ? `fill="${c}" fill-opacity=".85" stroke="${c}" stroke-width="${e}"` : tr}/>`; }
  else if (i.t === 'texte') h = `<text x="${i.x}" y="${i.y}" font-size="${14 + e * 4}" font-weight="600" fill="${c}" style="paint-order:stroke" stroke="${c === '#ffffff' ? '#111' : '#fff'}" stroke-width="3" stroke-linejoin="round">${esc(i.txt)}</text>`;
  else if (i.t === 'pointe') h = `<g transform="translate(${i.x},${i.y})"><path d="M0 0l30 15-13 4-5 13z" fill="${c}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><text x="30" y="40" font-size="17" font-weight="700" fill="${c}" style="paint-order:stroke" stroke="#fff" stroke-width="4">Julie</text></g>`;
  else h = `<g transform="translate(${i.x - 22},${i.y - 22}) scale(1.830)"><path d="${AN_IC[i.t] || AN_IC['t-coche']}" fill="${i.t === 't-coeur' || i.t === 't-etoile' ? c : 'none'}" stroke="${c}" stroke-width="2.600" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  if (a.noms && i.par !== 'moi') { const b = anBoite(i); h += `<text x="${b[0]}" y="${b[1] - 9}" font-size="16" font-weight="700" fill="${c}" style="paint-order:stroke" stroke="#fff" stroke-width="4">${esc(prenom(i.par))}</text>`; }
  return `<g data-an-id="${i.id}"${cls ? ` class="${cls}"` : ''}>${h}</g>`;
}
/* — le document partagé (fictif), dessiné dans le même svg que les dessins — */
function anDocument() {
  const l = (y, g, d, gras) => `<text x="60" y="${y}" font-size="19" fill="#26334f"${gras ? ' font-weight="700"' : ''}>${g}</text><text x="940" y="${y}" font-size="19" text-anchor="end" fill="#26334f"${gras ? ' font-weight="700"' : ''}>${d}</text>`;
  return `<text x="60" y="70" font-size="30" font-weight="700" fill="#16244b">Devis D-2026-118</text><text x="60" y="104" font-size="19" fill="#5b6885">Climatisation du hall · Résidence Les Minimes</text>
    <text x="940" y="70" font-size="19" text-anchor="end" fill="#5b6885">Clim Services 17</text><path d="M60 132H940" stroke="#d5dbe8" stroke-width="2"/>
    ${l(176, '3 unités murales 3,5 kW', '4 260,00 €')}${l(216, '1 unité extérieure multi-split', '2 980,00 €')}${l(256, 'Liaisons frigorifiques et supports', '720,00 €')}${l(296, 'Pose et mise en service', '680,00 €')}
    <path d="M60 330H940" stroke="#d5dbe8" stroke-width="2"/>${l(372, 'Total HT', '8 640,00 €', 1)}<text x="60" y="424" font-size="19" fill="#26334f">Délai : 3 semaines après accord</text>
    <text x="60" y="500" font-size="16" fill="#8a94ab">Document d’exemple, données fictives.</text>`;
}
function anBarre() {
  const a = an(), b = (k, lib, on, dis) => `<button class="an-b" data-an="${k}" aria-pressed="${!!on}" title="${lib}"${dis ? ' disabled' : ''}>${anIc(k)}<span>${lib}</span></button>`, sep = '<span class="an-sep"></span>';
  const s = (attr, k, lib, on, ic) => `<button class="an-s" ${attr}="${k}" aria-pressed="${!!on}">${ic ? anIc(ic) : ''}${lib}</button>`;
  let sous = '';
  if (AN_OUTILS[a.sous]) sous = AN_OUTILS[a.sous].map((o) => s('data-an-outil', o[0], o[1], a.outil === o[0], o[0])).join('');
  else if (a.sous === 'format') sous = AN_COUL.map((c) => `<button class="an-c" data-an-coul="${c}" style="--c:${c}" aria-pressed="${a.coul === c}" aria-label="Couleur ${c}"></button>`).join('') + '<span class="an-sep"></span>' + AN_EP.map((e) => s('data-an-ep', e[0], e[1], a.ep === e[0])).join('');
  else if (a.sous === 'effacer') sous = s('data-an-eff', 'tout', 'Tous les dessins') + s('data-an-eff', 'moi', 'Mes dessins') + s('data-an-eff', 'autres', 'Ceux des autres');
  else if (a.sous === 'options') sous = s('data-an-opt', 'autres', 'Les participants peuvent dessiner', a.autres) + s('data-an-opt', 'noms', 'Afficher le nom de l’auteur', a.noms) + s('data-an-opt', 'tableau', 'Tableau blanc', a.tableau);
  return `<div class="an-outils">${b('vue', 'Déplacer', a.grp === 'vue')}${b('select', 'Sélection', a.grp === 'select')}${b('texte', 'Texte', a.grp === 'texte')}${b('crayon', 'Dessin', a.grp === 'dessin').replace('data-an="crayon"', 'data-an="dessin"')}${b('tampon', 'Tampon', a.grp === 'tampon')}${b('projo', 'Projecteur', a.grp === 'projo')}${b('gomme', 'Gomme', a.grp === 'gomme')}${b('format', 'Format', a.sous === 'format')}
    ${sep}${b('annuler', 'Annuler', false, !a.hist.length)}${b('retablir', 'Rétablir', false, !a.refaire.length)}${b('effacer', 'Effacer', a.sous === 'effacer')}${b('enreg', 'Enregistrer')}
    ${sep}${b('moins', 'Réduire', false, a.z <= 1)}<span class="an-zoom" id="an-zoom">${Math.round(a.z * 100)} %</span>${b('plus', 'Agrandir', false, a.z >= 5)}${b('ajuster', 'Ajuster', false, a.z === 1)}${sep}${b('options', 'Options', a.sous === 'options')}</div>${sous ? `<div class="an-sous">${sous}</div>` : ''}`;
}
function anHtml() {
  const a = an();
  return `<div class="tuile partage" id="an-tuile"><div class="an-tete"><b>Tu partages : ${a.tableau ? 'un tableau blanc' : 'Devis D-2026-118.pdf'}</b><span>Tout le monde voit tes dessins.</span></div>
    <div class="an-barre" id="an-barre" role="toolbar" aria-label="Dessiner sur le partage">${anBarre()}</div>
    <div class="an-vue" id="an-vue" data-grp="${a.grp}"><div id="an-doc" style="transform:translate(${a.x}px,${a.y}px) scale(${a.z})"><svg id="an-svg" viewBox="0 0 1000 562" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Document partagé et dessins">
      <rect width="1000" height="562" fill="#fff"/><g id="an-docg"${a.tableau ? ' style="display:none"' : ''}>${anDocument()}</g><g id="an-g">${anDessins()}</g><g id="an-temp"></g></svg></div></div></div>`;
}
const anDessins = () => { const a = an(); return a.items.map((i) => anItem(i)).join('') + a.ephem.map((i) => anItem(i, 'an-fond')).join(''); };
function anPeindre() { const a = an(), g = $('#an-g'); if (!g) return; g.innerHTML = anDessins(); $('#an-docg').style.display = a.tableau ? 'none' : ''; }
function anTransformer() { const a = an(), d = $('#an-doc'); if (!d) return; d.style.transform = `translate(${a.x}px,${a.y}px) scale(${a.z})`; }
function anMaj() { const a = an(), b = $('#an-barre'); if (!b) return; b.innerHTML = anBarre(); $('#an-vue').dataset.grp = a.grp; $('#an-tuile .an-tete b').textContent = 'Tu partages : ' + (a.tableau ? 'un tableau blanc' : 'Devis D-2026-118.pdf'); anPeindre(); anTransformer(); }
function anHist() { const a = an(); a.hist.push(JSON.stringify(a.items)); if (a.hist.length > 60) a.hist.shift(); a.refaire = []; }
function anBorner() { const a = an(), v = $('#an-vue'); if (!v) return; a.x = Math.min(0, Math.max(v.clientWidth * (1 - a.z), a.x)); a.y = Math.min(0, Math.max(v.clientHeight * (1 - a.z), a.y)); }
/* zoomer AUTOUR d'un point de la vue (le centre par défaut) : ce qui est sous le doigt y reste */
function anZoomer(z, cx, cy) { const a = an(), v = $('#an-vue'); if (!v) return; z = Math.min(5, Math.max(1, z)); if (cx === undefined) { cx = v.clientWidth / 2; cy = v.clientHeight / 2; }
  a.x = cx - (cx - a.x) * (z / a.z); a.y = cy - (cy - a.y) * (z / a.z); a.z = Math.abs(z - 1) < 0.020 ? 1 : z; anBorner(); anTransformer(); }
function anPoint(e) { const g = $('#an-svg'), m = g && g.getScreenCTM(); if (!m) return [0, 0]; const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse()); /* hors du document (les bandes de côté d'une vue plus large que lui), le point se ramène à son bord */
  return [Math.round(Math.min(1000, Math.max(0, p.x)) * 10) / 10, Math.round(Math.min(562, Math.max(0, p.y)) * 10) / 10]; }
function anDansVue(e) { const v = $('#an-vue'), r = v.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function anSaisir(e, x, y) {
  const a = an(), v = $('#an-vue'), p = anDansVue(e); const vieux = $('#an-saisie'); if (vieux) vieux.blur();
  const inp = document.createElement('input'); inp.id = 'an-saisie'; inp.placeholder = 'Ton texte'; inp.setAttribute('aria-label', 'Texte à poser sur le partage'); inp.style.left = Math.min(p[0], v.clientWidth - 160) + 'px'; inp.style.top = Math.max(0, p[1] - 18) + 'px'; inp.style.color = a.coul === '#ffffff' ? '#111' : a.coul;
  let fait = false; const poser = () => { if (fait) return; fait = true; const t = inp.value.trim(); inp.remove(); if (t && S.salle && S.salle.an === a) { anHist(); a.items.push({ id: 'an' + (++AN.n), par: 'moi', t: 'texte', c: a.coul, e: a.ep, x, y, txt: t.slice(0, 80) }); anMaj(); } };
  inp.addEventListener('keydown', (k) => { if (k.key === 'Enter') poser(); else if (k.key === 'Escape') { inp.value = ''; poser(); } k.stopPropagation(); }); inp.addEventListener('blur', poser);
  v.appendChild(inp); setTimeout(() => inp.focus(), 0);
}
/* — les commandes de la barre — */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-an],[data-an-outil],[data-an-coul],[data-an-ep],[data-an-eff],[data-an-opt]'); if (!b || !S.salle || !S.salle.partage) return; const a = an(), d = b.dataset;
  if (d.anOutil) { a.outil = d.anOutil; const g = Object.keys(AN_OUTILS).find((k) => AN_OUTILS[k].some((o) => o[0] === a.outil)); a.grp = g; a.der[g] = a.outil; }
  else if (d.anCoul) a.coul = d.anCoul;
  else if (d.anEp) a.ep = +d.anEp;
  else if (d.anEff) { const n = a.items.length; anHist(); a.items = d.anEff === 'tout' ? [] : a.items.filter((i) => (d.anEff === 'moi') !== (i.par === 'moi')); a.sous = null; toast(n === a.items.length ? 'Rien à effacer' : (n - a.items.length) + ' dessin' + (n - a.items.length > 1 ? 's effacés' : ' effacé')); }
  else if (d.anOpt) { a[d.anOpt] = !a[d.anOpt]; if (d.anOpt === 'autres') toast(a.autres ? 'Les participants peuvent dessiner sur ton partage' : 'Toi seule peux dessiner sur ton partage'); if (d.anOpt === 'tableau') { a.z = 1; a.x = a.y = 0; } }
  else { const k = d.an;
    if (AN_OUTILS[k]) { a.sous = a.grp === k && a.sous === k ? null : k; a.grp = k; a.outil = a.der[k]; }
    else if (k === 'vue' || k === 'select' || k === 'texte' || k === 'gomme') { a.grp = a.outil = k; a.sous = null; }
    else if (k === 'format' || k === 'effacer' || k === 'options') a.sous = a.sous === k ? null : k;
    else if (k === 'annuler' && a.hist.length) { a.refaire.push(JSON.stringify(a.items)); a.items = JSON.parse(a.hist.pop()); }
    else if (k === 'retablir' && a.refaire.length) { a.hist.push(JSON.stringify(a.items)); a.items = JSON.parse(a.refaire.pop()); }
    else if (k === 'enreg') toast('Image enregistrée : le partage avec ses ' + a.items.length + ' dessin' + (a.items.length > 1 ? 's' : ''));
    else if (k === 'plus') anZoomer(a.z * 1.500); else if (k === 'moins') anZoomer(a.z / 1.500); else if (k === 'ajuster') { a.z = 1; a.x = a.y = 0; } }
  anMaj();
});
/* — le doigt, la souris, le stylet sur le partage. La vue porte touch-action:none : le navigateur ne reprend pas le geste. — */
function anAbandon() { AN.cur = null; const t = $('#an-temp'); if (t) t.innerHTML = ''; }
document.addEventListener('pointerdown', (e) => {
  const v = e.target.closest && e.target.closest('#an-vue'); if (!v || !S.salle || e.target.id === 'an-saisie' || (e.pointerType === 'mouse' && e.button !== 0)) return; const a = an(); e.preventDefault();
  AN.doigts.set(e.pointerId, [e.clientX, e.clientY]);
  if (AN.doigts.size === 2) { anAbandon(); const p = [...AN.doigts.values()], r = v.getBoundingClientRect(); AN.pince = { d: Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) || 1, z: a.z, cx: (p[0][0] + p[1][0]) / 2 - r.left, cy: (p[0][1] + p[1][1]) / 2 - r.top }; return; }
  if (AN.doigts.size > 2) return;
  const [x, y] = anPoint(e), neuf = (t) => ({ id: 'an' + (++AN.n), par: 'moi', t, c: a.coul, e: a.ep });
  if (a.grp === 'vue') AN.cur = { t: 'pan', sx: e.clientX, sy: e.clientY, x: a.x, y: a.y };
  else if (a.grp === 'select') { const i = anTouche(x, y); if (i) { anHist(); AN.cur = { t: 'bouge', i, lx: x, ly: y }; } }
  else if (a.grp === 'gomme') { const i = anTouche(x, y); if (i) { anHist(); a.items = a.items.filter((j) => j !== i); anMaj(); } AN.cur = { t: 'gomme' }; }
  else if (a.grp === 'texte') anSaisir(e, x, y);
  else if (a.grp === 'tampon') { anHist(); a.items.push(Object.assign(neuf(a.outil), { x, y })); anMaj(); }
  else if (a.outil === 'pointe') { anHist(); a.items = a.items.filter((i) => !(i.t === 'pointe' && i.par === 'moi')); a.items.push(Object.assign(neuf('pointe'), { x, y })); anMaj(); }
  else if (a.outil === 'laser') { AN.cur = { t: 'laser' }; anLaser(x, y); }
  else if (a.outil === 'crayon' || a.outil === 'surl' || a.outil === 'ephem') AN.cur = { t: 'trace', i: Object.assign(neuf(a.outil), { pts: [[x, y]] }) };
  else AN.cur = { t: 'trace', i: Object.assign(neuf(a.outil), { x1: x, y1: y, x2: x, y2: y }) };
  if (AN.cur && AN.cur.t === 'trace') $('#an-temp').innerHTML = anItem(AN.cur.i);
});
function anLaser(x, y) { const t = $('#an-temp'); if (t) t.innerHTML = `<circle cx="${x}" cy="${y}" r="16" fill="#ff2d2d" fill-opacity=".25"/><circle cx="${x}" cy="${y}" r="7" fill="#ff2d2d" stroke="#fff" stroke-width="2"/>`; }
document.addEventListener('pointermove', (e) => {
  if (!S.salle || !S.salle.an || !$('#an-vue')) return; const a = S.salle.an;
  if (AN.doigts.has(e.pointerId)) AN.doigts.set(e.pointerId, [e.clientX, e.clientY]);
  if (AN.pince && AN.doigts.size === 2) { const p = [...AN.doigts.values()], r = $('#an-vue').getBoundingClientRect(), cx = (p[0][0] + p[1][0]) / 2 - r.left, cy = (p[0][1] + p[1][1]) / 2 - r.top;
    a.x += cx - AN.pince.cx; a.y += cy - AN.pince.cy; AN.pince.cx = cx; AN.pince.cy = cy; anZoomer(AN.pince.z * Math.hypot(p[0][0] - p[1][0], p[0][1] - p[1][1]) / AN.pince.d, cx, cy); const zl = $('#an-zoom'); if (zl) zl.textContent = Math.round(a.z * 100) + ' %'; return; }
  const c = AN.cur;
  if (!c) { if (a.grp === 'projo' && a.outil === 'laser' && e.pointerType === 'mouse' && e.target.closest && e.target.closest('#an-vue')) { const p = anPoint(e); anLaser(p[0], p[1]); } return; }
  const [x, y] = anPoint(e);
  if (c.t === 'pan') { a.x = c.x + e.clientX - c.sx; a.y = c.y + e.clientY - c.sy; anBorner(); anTransformer(); }
  else if (c.t === 'bouge') { anDeplacer(c.i, x - c.lx, y - c.ly); c.lx = x; c.ly = y; anPeindre(); }
  else if (c.t === 'gomme') { const i = anTouche(x, y); if (i) { a.items = a.items.filter((j) => j !== i); anPeindre(); } }
  else if (c.t === 'laser') anLaser(x, y);
  else if (c.t === 'trace') { const i = c.i; if (i.pts) { const d = i.pts[i.pts.length - 1]; if (Math.hypot(d[0] - x, d[1] - y) > 1.500) i.pts.push([x, y]); } else { i.x2 = x; i.y2 = y; } $('#an-temp').innerHTML = anItem(i); }
});
function anLever(e) {
  AN.doigts.delete(e.pointerId); if (AN.doigts.size < 2 && AN.pince) { AN.pince = null; if (S.salle && S.salle.an && $('#an-barre')) anMaj(); }
  const c = AN.cur; if (!c || !S.salle || !S.salle.an) { AN.cur = null; return; } const a = S.salle.an; AN.cur = null;
  if (c.t === 'trace') { const i = c.i, b = anBoite(i), assez = i.pts ? true : Math.hypot(b[2] - b[0], b[3] - b[1]) > 6;
    if (assez && i.t === 'ephem') { a.ephem.push(i); setTimeout(() => { a.ephem = a.ephem.filter((j) => j !== i); if (S.salle && S.salle.an === a) anPeindre(); }, 2600); }
    else if (assez) { anHist(); a.items.push(i); } }
  if (c.t === 'laser' && e.pointerType === 'mouse') return;
  const t = $('#an-temp'); if (t) t.innerHTML = ''; if ($('#an-barre')) anMaj();
}
document.addEventListener('pointerup', anLever); document.addEventListener('pointercancel', anLever);
/* la molette : Ctrl (ou ⌘, ou le pincement du pavé tactile, que le navigateur envoie en Ctrl + molette) zoome sous le curseur ; sinon elle fait défiler ce qui est agrandi */
document.addEventListener('wheel', (e) => { const v = e.target.closest && e.target.closest('#an-vue'); if (!v || !S.salle || !S.salle.an) return; e.preventDefault(); const a = S.salle.an, p = anDansVue(e);
  if (e.ctrlKey || e.metaKey) anZoomer(a.z * Math.exp(-e.deltaY / 240), p[0], p[1]); else { a.x -= e.deltaX; a.y -= e.deltaY; anBorner(); anTransformer(); }
  clearTimeout(AN.roule); AN.roule = setTimeout(() => { if (S.salle && S.salle.an && $('#an-barre')) anMaj(); }, 160); }, { passive: false });
/* double clic avec « Déplacer » : agrandir là, ou revenir à la page entière */
document.addEventListener('dblclick', (e) => { const v = e.target.closest && e.target.closest('#an-vue'); if (!v || !S.salle || !S.salle.an || S.salle.an.grp !== 'vue') return; const a = S.salle.an, p = anDansVue(e); if (a.z > 1) { a.z = 1; a.x = a.y = 0; } else anZoomer(2.500, p[0], p[1]); anMaj(); });
