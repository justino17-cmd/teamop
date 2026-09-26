/* ══ v757 — CHAQUE TECHNICIEN ET SA COULEUR, SUR TOUTES LES CARTES D'INTERVENTION ═══════════════════════════════
   Justin, 26 septembre 2026 : « je veux que chaque technicien et sa couleur soient référencés sur les interventions,
   sur les cartes — ça évite de se perdre quand on associe plusieurs techniciens sur la même carte ».
   Ce qui a été MESURÉ avant d'écrire (scratchpad/palette-techs.js, recensement des écrans) :
   1. LA COULEUR AUTOMATIQUE SE RÉPÉTAIT. Un hachage de l'identifiant sur seize cases, qui n'étaient que HUIT teintes
      en deux nuances (vert / vert foncé : ΔE00 5,3 pour la paire la plus proche). À 5 techniciens, deux avaient la
      MÊME couleur une fois sur deux, la même famille 8 fois sur 10. Montrer la couleur ne sert à rien si deux
      collègues l'ont : d'où une palette de seize couleurs distinctes et une attribution SANS DOUBLON, stable.
   2. LE PLANNING GÉNÉRAL ET LE TABLEAU DE BORD ne montraient une intervention partagée que dans la ligne du PREMIER
      technicien (`planTechsOf(i)[0]===id`) : le second y paraissait libre — et un technicien second ne la voyait pas
      dans « Mon planning ». Les vues Semaine, Jour et Multi, elles, la mettaient dans chaque ligne — mais à la
      couleur du premier, même dans la ligne de l'autre.
   3. PERSONNE NE VOYAIT QUI D'AUTRE : la liste écrivait les noms en gris ; la vue Semaine des Interventions et
      « Ma journée » ne nommaient aucun collègue ; la fiche mettait un carré à la teinte devant chacun ; les
      pastilles d'en-tête du planning sortaient à la teinte (la règle `.avatar` de la refonte, v756).
   Ce banc EXÉCUTE les vraies fonctions de la page (attribution, pastilles, appartenance aux lignes, choix de la
   couleur, repère de carte) et lit la forme des écrans. La preuve dans la vraie page — style calculé et pixels,
   jour et nuit, téléphone — est scratchpad/sonde-couleurs-techs.js (42 ✓ ; la bêta v756 en rate 26). */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function regles(page) {
  const css = [...page.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const out = []; const re = /([^{}]+)\{([^{}]*)\}/g; let m;
  while ((m = re.exec(css))) out.push([m[1].trim().replace(/\s+/g, ' '), m[2]]);
  return out;
}
/* une fonction de premier niveau, jusqu'à la déclaration suivante de premier niveau */
function fonction(CODE, nom) {
  const k = CODE.indexOf('\nfunction ' + nom + '(');
  if (k < 0) return '';
  const i = k + 1, fin = CODE.slice(i + 10).search(/\n(?:async function |function |const |let |var |window\.|views\.|\/\* )/);
  return fin < 0 ? '' : CODE.slice(i, i + 10 + fin + 1);
}
/* CIEDE2000 — l'écart de couleur tel que l'œil le perçoit */
function lab(h) { let [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255); const f = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); r = f(r); g = f(g); b = f(b);
  const X = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047, Y = r * 0.2126 + g * 0.7152 + b * 0.0722, Z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883;
  const t = v => v > 0.008856 ? Math.cbrt(v) : (7.787 * v + 16 / 116); return [116 * t(Y) - 16, 500 * (t(X) - t(Y)), 200 * (t(Y) - t(Z))]; }
function de00(A, B) { const [L1, a1, b1] = lab(A), [L2, a2, b2] = lab(B), rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cb, 7) / (Math.pow(Cb, 7) + Math.pow(25, 7)))), a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  const hh = (x, y) => { let v = Math.atan2(y, x) / rad; return v < 0 ? v + 360 : v; }, h1p = hh(a1p, b1), h2p = hh(a2p, b2);
  const dLp = L2 - L1, dCp = C2p - C1p; let dhp = h2p - h1p; if (C1p * C2p === 0) dhp = 0; else if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360;
  const dHp = 2 * Math.sqrt(C1p * C2p) * Math.sin(dhp * rad / 2), Lbp = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2; let hbp = h1p + h2p;
  if (C1p * C2p !== 0) { if (Math.abs(h1p - h2p) > 180) hbp = (h1p + h2p < 360) ? (h1p + h2p + 360) / 2 : (h1p + h2p - 360) / 2; else hbp = (h1p + h2p) / 2; }
  const T = 1 - 0.17 * Math.cos((hbp - 30) * rad) + 0.24 * Math.cos(2 * hbp * rad) + 0.32 * Math.cos((3 * hbp + 6) * rad) - 0.20 * Math.cos((4 * hbp - 63) * rad);
  const dth = 30 * Math.exp(-Math.pow((hbp - 275) / 25, 2)), RC = 2 * Math.sqrt(Math.pow(Cbp, 7) / (Math.pow(Cbp, 7) + Math.pow(25, 7)));
  const SL = 1 + 0.015 * Math.pow(Lbp - 50, 2) / Math.sqrt(20 + Math.pow(Lbp - 50, 2)), SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * T, RT = -Math.sin(2 * dth * rad) * RC;
  return Math.sqrt(Math.pow(dLp / SL, 2) + Math.pow(dCp / SC, 2) + Math.pow(dHp / SH, 2) + RT * (dCp / SC) * (dHp / SH)); }

/* un identifiant au format d'uid() : 8 caractères de date, 5 au hasard */
let graine = 7; const hasard = () => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine / 2147483648; };
const uidAu = t => t.toString(36) + Array.from({ length: 5 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(hasard() * 36)]).join('');

for (const f of ['app.html', 'beta.html']) {
  const BRUT = fs.readFileSync(path.join(RACINE, f), 'utf8'), CODE = nu(BRUT), R = regles(BRUT);

  console.log(`\n── 825 · 1. ${f} — seize couleurs VRAIMENT distinctes ──`);
  const mP = CODE.match(/const TECH_PALETTE16=\[([^\]]+)\];/), mN = CODE.match(/const TECH_NOMS16=\[([^\]]+)\];/);
  const P = mP ? mP[1].match(/#[0-9A-F]{6}/g) || [] : [], N = mN ? mN[1].match(/'[^']+'/g) || [] : [];
  vrai('population : la palette (16) et ses noms (16) sont lus', P.length === 16 && N.length === 16, [P.length, N.length]);
  vrai('seize couleurs, aucune en double', new Set(P).size === 16, P);
  vrai('les sept premières sont celles d’avant (qui était vert reste vert)',
    P.slice(0, 7).join() === '#1E7A4E,#2563EB,#7C3AED,#EA580C,#DC2626,#0891B2,#DB2777', P.slice(0, 7));
  let min = 1e9, paire = ''; for (let a = 0; a < P.length; a++) for (let b = a + 1; b < P.length; b++) { const d = de00(P[a], P[b]); if (d < min) { min = d; paire = P[a] + '~' + P[b]; } }
  vrai('⛔ aucune paire sous ΔE00 14 — la plus proche est l’orange et le rouge d’origine (l’ancienne palette : 5,3)', min >= 14, min.toFixed(1) + ' ' + paire);
  let minN = 1e9, paireN = ''; for (let a = 7; a < P.length; a++) for (let b = 0; b < P.length; b++) if (a !== b) { const d = de00(P[a], P[b]); if (d < minN) { minN = d; paireN = P[a] + '~' + P[b]; } }
  vrai('⛔ chaque couleur AJOUTÉE est à 17 au moins de toutes les autres', minN >= 17, minN.toFixed(1) + ' ' + paireN);
  const na = Math.min(...P.map(c => de00(c, '#E8A33D')));
  vrai('aucune ne ressemble à l’orange « Non assigné » (ΔE00 ≥ 15)', na >= 15, na.toFixed(1));

  /* le bac à sable : les vraies fonctions de la page */
  const src = ['uidTs', 'techColorHash', 'techCouleurs', 'techCouleursDe', 'techColor', 'techCouleurNom', 'techConnu', 'intTechsAff', 'techPastille', 'techPuces', 'techPile',
    'planIntDe', 'planCouleurDans', 'planAutres', 'planBoutAutres', 'planPileAutres', 'planAvec', 'techCouleurChoix', 'numIcon', 'encreSur', 'intTechIds', 'planTechsOf', 'planCardColor'].map(n => [n, fonction(CODE, n)]);
  const manque = src.filter(([, c]) => c.length < 20).map(([n]) => n);
  vrai('population : les fonctions de la couleur et des pastilles sont trouvées', manque.length === 0, manque);
  if (manque.length) continue;
  const ctx = { db: { techniciens: [], techArchive: [] } };
  const bac = new Function('ctx', `let db=ctx.db; let _techCoulSig=null,_techCoulMap=null;
    const TECH_PALETTE16=[${P.map(x => `'${x}'`).join(',')}], TECH_NOMS16=[${N.join(',')}];
    const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const initials=name=>(name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
    const techName=id=>{ const t=db.techniciens.find(t=>t.id===id); if(t) return t.nom||'Non assigné'; const a=(db.techArchive||[]).find(t=>t.id===id); return a?(a.nom||'Ancien technicien'):'Non assigné'; };
    const L={divIcon:o=>o};
    ${src.map(([, c]) => c).join('\n')}
    return {set:(T,A)=>{ db=ctx.db={techniciens:T,techArchive:A||[]}; }, techCouleurs,techCouleursDe,techColor,techPastille,techPuces,techPile,planIntDe,planCouleurDans,planAutres,planBoutAutres,planPileAutres,planAvec,techCouleurChoix,numIcon,encreSur,techCouleurNom,
      get dit(){ return typeof window!=='undefined'?window._tccDit:null; }};`);
  let A;
  try { global.window = {}; A = bac(ctx); } catch (e) { vrai('le bac à sable se construit', false, e.message); continue; }

  console.log(`\n── 825 · 2. ${f} — l'attribution : sans doublon, stable, la main gagne ──`);
  let doublons = 0, horsRang = 0, changes = 0, ordre = 0;
  for (let e = 0; e < 2500; e++) {
    const n = 2 + e % 15; let t0 = Date.parse('2025-01-01'); const T = [];
    for (let k = 0; k < n; k++) { t0 += 86400000 * (1 + Math.floor(hasard() * 30)); T.push({ id: uidAu(t0), nom: 'T' + k }); }
    A.set(T); const m = A.techCouleursDe(T), cs = T.map(t => m[t.id]);
    if (new Set(cs).size < cs.length) doublons++;
    if (n <= 8 && cs.some(c => P.indexOf(c) >= 8)) horsRang++;
    /* un nouveau venu ne change la couleur de personne */
    t0 += 86400000 * 2; const T2 = T.concat([{ id: uidAu(t0), nom: 'Neuf' }]), m2 = A.techCouleursDe(T2);
    if (T.some(t => m[t.id] !== m2[t.id])) changes++;
    /* l'ordre de la liste ne compte pas : seulement l'ancienneté */
    const m3 = A.techCouleursDe(T.slice().reverse()); if (T.some(t => m[t.id] !== m3[t.id])) ordre++;
  }
  vrai('⛔ 2 500 équipes de 2 à 16 techniciens : AUCUNE couleur en double', doublons === 0, doublons);
  vrai('⛔ jusqu’à huit techniciens, tous dans les huit plus distinctes', horsRang === 0, horsRang);
  vrai('⛔ un nouveau venu ne change la couleur de PERSONNE', changes === 0, changes);
  vrai('l’ordre de la liste ne change rien (c’est l’ancienneté qui compte, pas la position)', ordre === 0, ordre);
  const Tm = [{ id: uidAu(Date.parse('2025-01-02')), nom: 'Main', couleur: '#2563EB' }, { id: uidAu(Date.parse('2025-01-03')), nom: 'B' }, { id: uidAu(Date.parse('2025-01-04')), nom: 'C' }];
  A.set(Tm); const mm = A.techCouleurs();
  vrai('⛔ une couleur choisie à la main gagne, et aucun automatique ne la reprend', mm[Tm[0].id] === '#2563EB' && mm[Tm[1].id] !== '#2563EB' && mm[Tm[2].id] !== '#2563EB', mm);
  Tm[1].couleur = '#DC2626'; const mm2 = A.techCouleurs();
  vrai('changer une couleur à la main se voit tout de suite (la mémoire se refait)', mm2[Tm[1].id] === '#DC2626', mm2);
  vrai('« non assigné » reste l’orange', A.techColor('') === '#E8A33D');
  vrai('un technicien qui n’est plus dans la liste garde une couleur (le passé)', /^#[0-9A-F]{6}$/.test(A.techColor('zzzzzzzzzzzzz')));

  console.log(`\n── 825 · 3. ${f} — les pastilles : chacun, sa couleur, son nom ──`);
  const Tp = [{ id: 'mleoaaaaaaaaa', nom: 'Léo Martin' }, { id: 'mkarimaaaaaaa', nom: 'Karim Benali' }, { id: 'msofiaaaaaaaa', nom: 'Sofia Rossi' }];
  A.set(Tp, [{ id: 'mancienaaaaaa', nom: 'Paul Ancien' }]);
  const [lea, kar, sof] = Tp.map(t => t.id);
  const iA = { techIds: [lea, kar], techId: lea }, iB = { techIds: [], techId: '' }, iC = { techIds: [kar, lea, sof], techId: kar }, iP = { techIds: ['mancienaaaaaa'], techId: 'mancienaaaaaa' };
  const pu = A.techPuces(iA);
  vrai('⛔ techPuces : un disque et un nom par technicien, dans l’ordre', (pu.match(/class="tpu-p"/g) || []).length === 2 && pu.indexOf('Léo Martin') < pu.indexOf('Karim Benali'), pu);
  vrai('   chaque disque porte SA couleur et l’encre calculée pour elle', pu.includes(`--tc:${A.techColor(lea)};--ti:${A.encreSur(A.techColor(lea))}`) && pu.includes(`--tc:${A.techColor(kar)};`), pu);
  vrai('   sans technicien : « Non assigné », en orange', /--tc:#E8A33D[^>]*>\?<\/span><span class="tpu-n">Non assigné/.test(A.techPuces(iB)));
  vrai('   le passé garde ses noms (un technicien retiré de l’équipe reste nommé)', A.techPuces(iP).includes('Paul Ancien'));
  vrai('   « (Leader) » après le premier seulement, quand on le demande', (A.techPuces(iA, { leader: true }).match(/\(Leader\)/g) || []).length === 1 && A.techPuces(iA, { leader: true }).indexOf('(Leader)') < A.techPuces(iA, { leader: true }).indexOf('Karim'));
  const pile = A.techPile(iC);
  vrai('⛔ techPile : trois disques, chacun de classe « tpu-p » exactement (map(techPastille) passait l’index comme taille)',
    (pile.match(/class="tpu-p"/g) || []).length === 3 && !/class="tpu-p \d/.test(pile), pile);
  vrai('   … et les noms dits à qui ne voit pas les couleurs (aria-label)', /aria-label="Techniciens : Karim Benali, Léo Martin, Sofia Rossi"/.test(pile), pile);

  console.log(`\n── 825 · 4. ${f} — une intervention partagée est dans la ligne de CHACUN ──`);
  vrai('⛔ planIntDe : dans la ligne de Léo ET dans celle de Karim, pas dans celle de Sofia', A.planIntDe(iA, lea) && A.planIntDe(iA, kar) && !A.planIntDe(iA, sof));
  vrai('   la ligne « Non assigné » ne prend que celles qui n’ont personne', A.planIntDe(iB, '') && !A.planIntDe(iA, ''));
  vrai('⛔ planCouleurDans : dans la ligne de Karim, la couleur de Karim ; hors ligne, celle du premier',
    A.planCouleurDans(iA, kar) === A.techColor(kar) && A.planCouleurDans(iA, lea) === A.techColor(lea) && A.planCouleurDans(iA, undefined) === A.techColor(lea) && A.planCouleurDans(iA, sof) === A.techColor(lea));
  vrai('   planAutres : depuis la ligne de Karim, Léo ; une intervention seule n’a pas d’« autres »', JSON.stringify(A.planAutres(iA, kar)) === JSON.stringify([lea]) && A.planAutres({ techIds: [sof] }, sof).length === 0);
  const bo = A.planBoutAutres(iA, kar);
  vrai('⛔ le bout de case porte la couleur de Léo, pas celle de Karim', bo && bo.style.includes(A.techColor(lea)) && !bo.style.includes(A.techColor(kar)) && bo.noms === 'Léo Martin', bo);
  vrai('   planPileAutres : les AUTRES seulement, et « avec » dans l’infobulle', A.planPileAutres(iC, kar).includes('avec Léo Martin, Sofia Rossi') && (A.planPileAutres(iC, kar).match(/class="tpu-p"/g) || []).length === 2);

  console.log(`\n── 825 · 5. ${f} — les écrans passent par ces règles ──`);
  const pg = CODE.slice(CODE.indexOf('views.planningGeneral=function'), CODE.indexOf('\nfunction pgFocusBande('));
  vrai('population : le Planning général est découpé', pg.length > 2000, pg.length);
  vrai('⛔ Planning général : chaque ligne prend les siennes (planIntDe), plus « le premier seulement »',
    /const mesInts=SRC\.filter\(i=>planIntDe\(i,p\.id\)\);/.test(pg) && !/planTechsOf\(i\)\[0\]\|\|''\)===p\.id/.test(pg));
  const tdb = fonction(CODE, 'tdbPlanning');
  vrai('⛔ Tableau de bord : une intervention va dans la case de CHACUN de ses techniciens', /\(t\.length\?t:\[''\]\)\.forEach\(x=>\{ const k=x\+'\|'\+i\.date;/.test(tdb) && !/planTechsOf\(i\)\[0\]\|\|''\)===gr\.id/.test(tdb));
  vrai('   … à la couleur de la ligne, avec les autres', /--cc:\$\{planCouleurDans\(i,gr\.id\)\}/.test(tdb) && /planPileAutres\(i,gr\.id\)/.test(tdb));
  const sem = fonction(CODE, 'planWeekHtml'), jour = fonction(CODE, 'planDayHtml'), multi = fonction(CODE, 'planMultiHtml');
  vrai('⛔ Semaine, Jour, Multi : la carte prend la couleur de sa colonne', /const sc=planCouleurDans\(i,gr\.id\)/.test(sem) && /const sc=planCouleurDans\(i,gr\.id\)/.test(jour) && /const coul=planCouleurDans\(i,t\.id\)/.test(multi));
  vrai('   … et montre les collègues', /planPileAutres\(i,gr\.id\)/.test(sem) && /planPileAutres\(i,gr\.id\)/.test(jour) && /planPileAutres\(i,t\.id\)/.test(multi));
  vrai('⛔ les en-têtes du planning portent la couleur de la personne (av-tc + --tc), plus `background:…;color:#fff` écrasé par la refonte',
    /class="avatar av-tc" style="width:24px;height:24px;font-size:10px;flex-shrink:0;--tc:\$\{cW\}"/.test(sem) && /class="avatar av-tc" style="width:26px;height:26px;font-size:10px;flex-shrink:0;--tc:\$\{cTech\}"/.test(jour)
    && !/class="avatar" style="[^"]*background:\$\{(?:cW|cTech|techColor\(t\.id\))\};color:#fff"/.test(CODE));
  vrai('   les pastilles `.av` passent leur couleur par --tc (la règle de la refonte ne lit qu’elle)', !/class="av" style="background:\$\{/.test(CODE));
  const liste = CODE.slice(CODE.indexOf('views.interventions=function'), CODE.indexOf('views.interventions=function') + 6000);
  vrai('⛔ la liste des Interventions montre chaque technicien en couleur (plus les noms en gris)', /\$\{techPuces\(i\)\}\$\{intBadges\(i\)\}/.test(liste) && !/esc\(techNames\(i\)\)\}\$\{intBadges/.test(CODE));
  vrai('   la vue Semaine des Interventions aussi (elle n’en montrait aucun)', /<\/b>\$\{techPile\(i,3\)\}<span class="tf-fin">/.test(CODE));
  vrai('⛔ « Ma journée » dit avec qui (« Avec … »)', /planAvec\(i,myTechId\(\),'Avec'\)/.test(fonction(CODE, 'intTechCard')));
  vrai('   la fiche : un disque par technicien, plus un carré à la teinte', /intTechsAff\(i\)\.map\(\(tid,k\)=>`<div style="display:flex;gap:8px;align-items:center;padding:3px 0">\$\{techPastille\(tid,'g'\)\}/.test(CODE)
    && !/background:var\(--acc\);color:var\(--on-acc\);display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800">\$\{\(techName\(tid\)/.test(CODE));
  vrai('   il ne reste de noms en texte que dans les documents (impression, PDF, dossier) : 5', (CODE.match(/esc\(techNames\(/g) || []).length === 5, (CODE.match(/esc\(techNames\(/g) || []).length);
  vrai('⛔ la fiche et la liste d’un technicien comptent les interventions où il est SECOND',
    /db\.interventions\.filter\(i=>intTechIds\(i\)\.indexOf\(t\.id\)>=0\)\.length/.test(CODE) && /db\.interventions\.filter\(i=>intTechIds\(i\)\.indexOf\(id\)>=0\)\.sort/.test(CODE)
    && !/db\.interventions\.filter\(i=>i\.techId===(?:t\.)?id\)/.test(CODE));
  vrai('   retirer un technicien d’une intervention à venir : le suivant devient le principal (plus `techId:\'\'` avec un collègue dedans)',
    /if\(i\.techId===id\) i\.techId=\(i\.techIds&&i\.techIds\[0\]\)\|\|'';/.test(CODE));

  console.log(`\n── 825 · 6. ${f} — la carte : chacun sur le repère, dans la bulle, dans la légende ──`);
  const ic = A.numIcon(3, '#2563EB', ['#DC2626', '#1E7A4E']);
  vrai('⛔ numIcon : une pastille par collègue au coin du repère (deux)', (ic.html.match(/border-radius:50%;background:#(DC2626|1E7A4E)/g) || []).length === 2, ic.html.slice(-300));
  vrai('   le numéro prend l’encre calculée pour la couleur du repère', ic.html.includes('color:' + A.encreSur('#2563EB')));
  vrai('   un repère sans collègue n’en porte aucune', !/right:-7px/.test(A.numIcon(1, '#2563EB').html));
  vrai('   la carte passe les collègues au repère, et chacun dans la bulle',
    /numIcon\(i\+1,planCardColor\(p\),planTechsOf\(p\)\.slice\(1\)\.map\(techColor\)\)/.test(CODE) && /\$\{p\.heure\} · \$\{techPuces\(p\)\}/.test(CODE));
  vrai('   la légende nomme aussi les seconds', /const techsJour=\[\.\.\.new Set\(pts\.flatMap\(p=>\{ const t=planTechsOf\(p\); return t\.length\?t:\[''\]; \}\)\)\];/.test(CODE));

  console.log(`\n── 825 · 7. ${f} — choisir la couleur : des pastilles, et qui porte quoi ──`);
  const Tc = [{ id: uidAu(Date.parse('2025-01-02')), nom: 'Nina Dubois', couleur: '#2563EB' }, { id: uidAu(Date.parse('2025-01-03')), nom: 'Karim Benali' }, { id: uidAu(Date.parse('2025-01-04')), nom: 'Léo Martin' }];
  A.set(Tc); const h = A.techCouleurChoix(Tc[1].id, '');
  vrai('seize couleurs + « Auto », en boutons radio name="couleur" (le formulaire les lit tels quels)', (h.match(/<input type="radio" name="couleur"/g) || []).length === 17, (h.match(/type="radio"/g) || []).length);
  vrai('« Auto » coché, et il montre la couleur qu’il a aujourd’hui', /value="" checked/.test(h) && h.includes(`--tc:${A.techColor(Tc[1].id)}`));
  vrai('⛔ le bleu choisi pour Nina porte ses initiales', /value="#2563EB"[^>]*><span class="tcc-p prise"[^>]*>ND<\/span>/.test(h), h.slice(h.indexOf('#2563EB') - 20, h.indexOf('#2563EB') + 160));
  const dit = global.window._tccDit;
  vrai('⛔ et la phrase dit « déjà choisie pour Nina Dubois »', typeof dit === 'function' && /déjà choisie pour Nina Dubois/.test(dit('#2563EB')), dit && dit('#2563EB'));
  vrai('   une couleur qu’un collègue n’a qu’en automatique se prend sans rien lui voler', typeof dit === 'function' && /Léo Martin l’a en automatique et en prendra une autre/.test(dit(A.techColor(Tc[2].id))), dit && dit(A.techColor(Tc[2].id)));
  vrai('   plus de menu déroulant « Couleur (carte) » dans les deux fiches', !/<select name="couleur">/.test(CODE) && (CODE.match(/\$\{techCouleurChoix\(/g) || []).length === 2);

  console.log(`\n── 825 · 8. ${f} — la feuille : la couleur passe par des variables, jamais écrasée ──`);
  const tpu = R.filter(([s]) => /\.tpu-p\b/.test(s));
  vrai('population : les règles des disques sont lues', tpu.length >= 5, tpu.length);
  vrai('⛔ aucune règle ne pose le FOND d’un disque en !important (la leçon de `.avatar`, v756)', tpu.every(([, d]) => !/background[^:;]*:[^;]*!important/.test(d)), tpu.filter(([, d]) => /background[^:;]*:[^;]*!important/.test(d)).map(x => x[0]));
  const base = R.find(([s]) => s === '.tpu-p');
  vrai('   le disque de base lit --tc et --ti', !!base && /background-color:var\(--tc/.test(base[1]) && /color:var\(--ti/.test(base[1]));
  const avtc = R.find(([s]) => /html\[data-refonte\]\[data-marque\] \.avatar\.av-tc/.test(s));
  vrai('⛔ les pastilles d’en-tête `.avatar.av-tc` passent devant la teinte de la refonte ET la règle de nuit — par la couleur seule',
    !!avtc && /background-color:color-mix\(in srgb,var\(--tc\) 24%,var\(--card\)\)!important/.test(avtc[1]) && !/(^|;|\s)background\s*:/.test(avtc[1]), avtc && avtc[1]);
  vrai('   le choix de couleur : des <span>, pas des <label> (la refonte impose sa taille à tout libellé d’un champ)', !/<label class="tcc-o"/.test(CODE) && /<span class="tcc-o"/.test(CODE));

  /* ⛔ LES INITIALES D'UN AVATAR TEINTÉ SE LISENT, SOUS LES DEUX THÈMES, DE JOUR ET DE NUIT. La première
     écriture mettait 55 % de la couleur dans l'encre : 4,30:1 en OP GESTION de jour, 3,43:1 de nuit
     (relecture du 26 septembre). Le calcul part des VALEURS DU FICHIER — la part de couleur du fond et de
     l'encre dans la règle qui gagne, `--card` et `--t1` de chaque thème, les seize couleurs de la palette —
     jamais de chiffres recopiés ici : un banc qui recopie des valeurs garde une croyance. */
  console.log(`\n── 825 · 8b. ${f} — les initiales d’un avatar teinté se lisent (seize couleurs × deux thèmes × jour/nuit) ──`);
  const pct = avtc ? { fond: +((avtc[1].match(/background-color:color-mix\(in srgb,var\(--tc\) (\d+)%/) || [])[1]), encre: +((avtc[1].match(/(?:^|;|\s)color:color-mix\(in srgb,var\(--tc\) (\d+)%/) || [])[1]) } : {};
  vrai('population : les deux parts de couleur sont lues dans la règle qui gagne', pct.fond > 0 && pct.encre > 0, pct);
  const bloc = sel => { const r = R.find(([s]) => s === sel); return r ? r[1] : ''; };
  const decl = (txt, nom) => { const m = txt.match(new RegExp('(?:^|;|\\s)' + nom + ':\\s*(#[0-9A-Fa-f]{6})\\b')); return m ? m[1] : null; };
  const THEMES = [['teamop', 'light'], ['teamop', 'dark'], ['opgestion', 'light'], ['opgestion', 'dark']].map(([m, t]) => {
    const propre = bloc(`html[data-marque="${m}"][data-verre][data-theme="${t}"]`), base = bloc(`html[data-marque][data-verre][data-theme="${t}"]`);
    return { nom: m + ' ' + (t === 'light' ? 'jour' : 'nuit'), card: decl(propre, '--card') || decl(base, '--card'), t1: decl(propre, '--t1') || decl(base, '--t1') };
  });
  vrai('population : --card et --t1 trouvés pour les quatre combinaisons', THEMES.every(x => x.card && x.t1), THEMES);
  const PAL = ((CODE.match(/const TECH_PALETTE16=\[([^\]]*)\]/) || [])[1] || '').match(/#[0-9A-Fa-f]{6}/g) || [];
  vrai('population : les seize couleurs de la palette sont lues', PAL.length === 16, PAL.length);
  const rgbDe = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const melange = (a, b, p) => { const A = rgbDe(a), B = rgbDe(b); return A.map((x, i) => Math.round(x * p / 100 + B[i] * (100 - p) / 100)); };
  const lumi = c => { const s = c.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2]; };
  const ctr = (a, b) => { const x = lumi(a), y = lumi(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  let pire = { k: 99 }, n = 0;
  if (pct.fond > 0 && pct.encre > 0) THEMES.filter(x => x.card && x.t1).forEach(th => PAL.forEach(c => { n++;
    const k = ctr(melange(c, th.card, pct.fond), melange(c, th.t1, pct.encre)); if (k < pire.k) pire = { k: +k.toFixed(2), theme: th.nom, couleur: c }; }));
  vrai('population : 64 couples calculés', n === 64, n);
  vrai('⛔ le pire des 64 couples passe 4,5:1 (initiales lisibles partout)', pire.k >= 4.5, pire);
}

/* ⛔ DÉPLACER UNE INTERVENTION PARTAGÉE NE DÉFAIT PAS L'ÉQUIPE. Glisser la carte depuis la ligne de Karim
   vers celle de Sofia remplaçait toute l'équipe par Sofia : Léo, qui était aussi dessus, disparaissait de
   l'intervention sans que personne l'ait demandé. Seule la personne de la ligne de DÉPART est remplacée.
   Joué sur les vraies fonctions extraites d'app.html. */
console.log('\n── 825 · 8c. déplacer une intervention partagée : seul le technicien de la ligne change ──');
{
  const SRC = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8'), C = nu(SRC);
  const f1 = fonction(C, 'intTechIds'), f2 = fonction(C, 'planEquipeApres'), f3 = fonction(C, 'planPoserEquipe'), f4 = fonction(C, 'planLigneDe');
  vrai('les quatre fonctions sont trouvées', [f1, f2, f3, f4].every(x => x.length > 40), [f1.length, f2.length, f3.length, f4.length]);
  const api = new Function(f1 + '\n' + f2 + '\n' + f3 + '\n' + f4 + '\nreturn {planEquipeApres, planPoserEquipe, planLigneDe};')();
  const E = (t, vers, depuis) => api.planEquipeApres({ techIds: t.slice(), techId: t[0] || '' }, vers, depuis);
  vrai('seul sur l’intervention → le nouveau le remplace', JSON.stringify(E(['leo'], 'sofia', 'leo')) === '["sofia"]');
  vrai('seul, glissé vers « non assigné » → plus personne', JSON.stringify(E(['leo'], '', 'leo')) === '[]');
  vrai('⛔ à deux, depuis la ligne de Karim vers Sofia → Léo RESTE', JSON.stringify(E(['leo', 'karim'], 'sofia', 'karim')) === '["leo","sofia"]', E(['leo', 'karim'], 'sofia', 'karim'));
  vrai('⛔ …et la place de Karim est gardée (Sofia prend sa place, pas la tête)', JSON.stringify(E(['karim', 'leo'], 'sofia', 'karim')) === '["sofia","leo"]', E(['karim', 'leo'], 'sofia', 'karim'));
  vrai('déposé chez quelqu’un qui y est DÉJÀ → rien ne change', JSON.stringify(E(['leo', 'karim'], 'leo', 'karim')) === '["leo","karim"]');
  vrai('à deux, depuis Karim vers « non assigné » → Karim seul quitte l’intervention', JSON.stringify(E(['leo', 'karim'], '', 'karim')) === '["leo"]');
  vrai('à trois, ligne de départ inconnue → c’est le premier qui est remplacé, les autres restent', JSON.stringify(E(['a', 'b', 'c'], 'x', null)) === '["x","b","c"]');
  const i = { techIds: ['leo', 'karim'], techId: 'leo' }; api.planPoserEquipe(i, 'sofia', 'leo');
  vrai('poser l’équipe : la liste ET le principal suivent', JSON.stringify([i.techIds, i.techId]) === '[["sofia","karim"],"sofia"]', i);
  const el = attr => ({ closest: () => ({ hasAttribute: n => n in attr, getAttribute: n => attr[n] }) });
  vrai('la ligne de départ se lit sur la case du planning (cell:jour:technicien)', api.planLigneDe(el({ 'data-drop': 'cell:2026-09-26:karim' })) === 'karim');
  vrai('…sur la colonne des heures (time:technicien:heure)', api.planLigneDe(el({ 'data-drop': 'time:karim:8' })) === 'karim');
  vrai('…et sur une ligne marquée data-ligne', api.planLigneDe(el({ 'data-ligne': 'sofia' })) === 'sofia');
  vrai('hors planning : aucune ligne (null), jamais un technicien deviné', api.planLigneDe({ closest: () => null }) === null);
}

console.log('\n── 825 · 9. la preuve dans la vraie page existe ──');
vrai('scratchpad/sonde-couleurs-techs.js', fs.existsSync(path.join(RACINE, 'scratchpad', 'sonde-couleurs-techs.js')));
vrai('scratchpad/palette-techs.js et palette-encre.js (le choix de la palette, mesuré)', fs.existsSync(path.join(RACINE, 'scratchpad', 'palette-techs.js')) && fs.existsSync(path.join(RACINE, 'scratchpad', 'palette-encre.js')));

console.log(`\n════ test-825 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
