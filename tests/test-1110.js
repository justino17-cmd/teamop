/* ⛔ CE QUE CE FICHIER GARDE — ce qui ne tient pas dans sa carte, sa fenêtre ou son écran, sur téléphone (lot g04,
   16 octobre 2026). Sept défauts relevés au navigateur (Android 360 px, iPhone 390 px, iPad 820 px), une seule famille :
   une boîte qui prend la largeur de son CONTENU au lieu de celle qu'on lui laisse.

     · accueil#10 / technicien#6 — Paramètres : « Forcer la mise à jour… », « Ajouter mon e-mail de récupération »,
       « ＋ Ajouter », « Choisir ce qu'on remet à zéro… » (`.btn` est `white-space:nowrap`) sortaient de leur carte de
       jusqu'à 39 px et poussaient la page à 383 px sur un Android de 360 ;
     · accueil#11 — la rangée Français / English / Español faisait 335 px pour 278 à 306 : « Españ », défilement caché ;
     · interventions#3 / technicien#3 — Clôture guidée, étape « Produits » : la liste déroulante (`flex:1` sans
       `min-width:0`, EN LIGNE) prenait 589 px et poussait le ＋ à 617 px, hors écran ;
     · interventions#11 — « Passage suivant » : le bouton « Proposition auto — … » (nowrap) faisait 795 px dans une
       fenêtre de 388 ;
     · admin#8 — un e-mail de 85 signes (un seul mot) élargissait la fiche « Accès de … » et la carte de la liste des
       utilisateurs, donc la page entière (496 px sur un iPhone de 390).

   Comment. Ce qu'on peut JOUER l'est : `planNextModal` est la VRAIE fonction, extraite d'app.html et exécutée, et son
   bouton est relu dans le HTML qu'elle écrit. Le reste est de la mise en page : on lit la feuille (section 22 de
   `theme-final`, commentaires retirés, @media respectés) ET on vérifie que les sélecteurs visent bien le balisage que
   le code ÉCRIT — une règle juste sur un balisage qui n'existe plus ne garde rien. La preuve au pixel, elle, est une
   sonde navigateur (scratchpad/gestion/correctifs/g04 : sonde-param.js, sonde-modales.js), citée ici : largeur de
   page = largeur posée sur les trois appareils, aucun bouton hors de sa carte.
   APP_FICHIER : une copie mutée, pour éprouver ce banc sans toucher au fichier du dépôt. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}

/* ══ 0. LA FEUILLE : la section 22, ses règles, leur @media ═════════════════════════════════════════ */
const ANCRE = '── 22. CE QUI NE TIENT PAS DANS SA CARTE';
const i0 = BRUT.indexOf(ANCRE);
console.log('\n── 1110 · 0. la section de la feuille ──');
vrai('la section 22 est trouvée (une tranche vide passerait au vert sur tout)', i0 > 0);
const fin = BRUT.indexOf('</style>', i0);
const CSS = BRUT.slice(BRUT.indexOf('*/', i0) + 2, fin).replace(/\/\*[\s\S]*?\*\//g, ' ');
vrai('la section est dans la feuille « theme-final » (la dernière, qui gagne)', BRUT.lastIndexOf('<style id="theme-final">', i0) > BRUT.lastIndexOf('<style id="refonte-css">', i0) && BRUT.lastIndexOf('<style id="theme-final">', i0) > 0);
/* règles : [{sel, media, decl:{prop:'valeur'(!important)}}] */
function regles(css, media) {
  const out = []; let k = 0;
  while (k < css.length) {
    const o = css.indexOf('{', k); if (o < 0) break;
    const sel = css.slice(k, o).trim();
    let p = 0, f = o;
    for (; f < css.length; f++) { if (css[f] === '{') p++; else if (css[f] === '}' && !--p) break; }
    const corps = css.slice(o + 1, f);
    if (sel.startsWith('@')) out.push(...regles(corps, sel));
    else { const decl = {}; corps.split(';').forEach(d => { const m = /^\s*([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(d); if (m) decl[m[1]] = m[2].replace(/\s+/g, ' '); });
      sel.split(/,(?![^(\[]*[\)\]])/).forEach(s => out.push({ sel: s.trim().replace(/\s+/g, ' '), media, decl })); }
    k = f + 1;
  }
  return out;
}
const R = regles(CSS, '');
vrai('la section porte des règles (compteur de population)', R.length >= 7, R.length);
const trouve = (sel, media) => R.filter(r => r.sel === sel && r.media === media);
const MEDIA_TEL = '@media (max-width:780px)';
vrai('⛔ aucun :has() ne lit un attribut style (il ferait restyler la page à chaque écriture de style — test-823)', !/:has\([^)]*\[style/.test(CSS));
vrai('⛔ jamais container-type sur #content', !/container-type/.test(CSS));

console.log('\n── 1110 · 1. Paramètres : un bouton qui ne tient pas passe à la ligne (accueil#10, technicien#6) ──');
for (const sel of ['html[data-refonte] #content .card > .btn', 'html[data-refonte] #content .card > div:not([class]) > .btn']) {
  const r = trouve(sel, MEDIA_TEL)[0];
  vrai('« ' + sel + ' » existe, sur téléphone', !!r);
  if (r) {
    v('  … white-space:normal (le `.btn` est nowrap)', r.decl['white-space'], 'normal');
    v('  … max-width:100%', r.decl['max-width'], '100%');
    v('  … overflow-wrap:anywhere (un mot sans espace ne pousse pas la page)', r.decl['overflow-wrap'], 'anywhere');
    v('  … padding-block !important (`padding:0 18px!important` au doigt, sinon un libellé sur deux lignes colle aux bords)', r.decl['padding-block'], '8px!important');
  }
}
vrai('les règles de bouton ne sont PAS posées hors téléphone (un bouton de bureau garde sa forme)', !R.some(r => /\.card > .*\.btn/.test(r.sel) && r.media === ''));
/* le balisage que ces règles visent : les quatre boutons sont bien « dans la carte » ou « dans sa rangée sans classe » */
const PARAM = bloc('views.parametres=function(){');
vrai('views.parametres est trouvée', PARAM.length > 5000);
vrai('« Forcer la mise à jour » : un .btn dans un div SANS classe, dans la carte',
  /<div style="margin-top:14px;padding-top:14px;border-top[^"]*">[\s\S]{0,400}<button class="btn" onclick="forceUpdate\(\)">Forcer la mise à jour/.test(PARAM));
vrai('« Ajouter mon e-mail de récupération » : un .btn dans une rangée sans classe',
  /<div style="display:flex;gap:8px;flex-wrap:wrap">\s*<button class="btn sm" onclick="monComptePwd\(\)">[^\n]*\n\s*<button class="btn sm ghost" onclick="monCompteMail\(\)">[^\n]*mon e-mail de récupération/.test(PARAM));
vrai('« Choisir ce qu\'on remet à zéro » : un .btn posé directement dans la carte',
  /<\/p>\s*<button class="btn" style="background:var\(--org,#e8a33d\);border-color:var\(--org,#e8a33d\)" onclick="remiseZero\(\)">/.test(PARAM));

console.log('\n── 1110 · 2. la rangée de langues (accueil#11) ──');
{
  const r = R.find(r => /:has\(> \.chip\[onclick\^="setLang\("\]\)/.test(r.sel));
  vrai('une règle vise la rangée qui porte les pastilles setLang(…)', !!r);
  if (r) {
    v('  … sur téléphone seulement', r.media, MEDIA_TEL);
    v('  … elle passe à la ligne (`flex-wrap:nowrap!important` de la refonte la faisait défiler)', r.decl['flex-wrap'], 'wrap!important');
    v('  … plus de défilement caché', r.decl['overflow'], 'visible');
    v('  … plus de fondu à droite (le masque effaçait « Español »)', [r.decl['-webkit-mask-image'], r.decl['mask-image']], ['none!important', 'none!important']);
    v('  … les marges négatives de la rangée défilante sont rendues', [r.decl['margin-left'], r.decl['margin-right'], r.decl['padding-left'], r.decl['padding-right']], ['0', '0', '0', '0']);
  }
  vrai('le balisage : une `.filters` dont les enfants directs sont des `.chip` à onclick="setLang(\'…\')"',
    /<div class="filters" style="margin:0">\$\{Object\.entries\(LANGS\)\.map\(\(\[k,v\]\)=>`<div class="chip [^`]*onclick="setLang\('\$\{k\}'\)">/.test(PARAM));
}

console.log('\n── 1110 · 3. Clôture guidée, étape Produits (interventions#3, technicien#3) ──');
{
  const r = trouve('#as-prod', '')[0];
  vrai('« #as-prod » est réglé hors @media (iPad aussi : le ＋ était à 961 px pour 820)', !!r);
  if (r) { v('  … min-width:0 !important (le `flex:1` est écrit en ligne : seul !important le bat)', r.decl['min-width'], '0!important');
    v('  … max-width:100% !important', r.decl['max-width'], '100%!important'); }
  const p = trouve('#as-prod + .btn', '')[0];
  vrai('le bouton ＋ ne rétrécit pas (il reste touchable)', !!p && p.decl['flex'] === 'none', p && p.decl);
  const AS = bloc('function assistRender(){');
  vrai('assistRender est trouvée', AS.length > 3000);
  vrai('le balisage : le select #as-prod (flex:1 en ligne) puis le bouton .btn ＋, frères dans une rangée flex',
    /<div style="display:flex;gap:7px;align-items:center;margin-top:6px">\s*<select id="as-prod" style="flex:1;[^"]*">[\s\S]*?<\/select>\s*<button type="button" class="btn" onclick="asProdAdd\(/.test(AS));
}

console.log('\n── 1110 · 4. un e-mail de 85 signes (admin#8) ──');
{
  const r = R.find(r => r.sel === '#ui-mail');
  vrai('« #ui-mail » casse un mot long', !!r && r.decl['overflow-wrap'] === 'anywhere', r && r.decl);
  const u = R.find(r => r.sel === 'html[data-refonte] .usr-c > div[role="button"]');
  vrai('l\'en-tête de la carte d\'un utilisateur casse un mot long', !!u && u.decl['overflow-wrap'] === 'anywhere', u && u.decl);
  const m = R.find(r => r.sel === '#modal .frow-val > .mono');
  vrai('identifiant et mot de passe de la fiche d\'accès cassent un mot long', !!m && m.decl['overflow-wrap'] === 'anywhere', m && m.decl);
  const ID = bloc('function userIdentifiantsModal(u,pwd){');
  vrai('le balisage : `#ui-mail` est écrit par userIdentifiantsModal, et ses 3 états le réécrivent',
    /<div id="ui-mail"/.test(ID) && /const z=\$\('ui-mail'\)/.test(bloc('function identifiantsMailEtat(r,id,pwd){')));
  vrai('le balisage : identifiant et mot de passe sont des `.mono` directs de `.frow-val`', (ID.match(/<div class="frow-val"><b class="mono"/g) || []).length === 2);
  const UT = bloc('views.utilisateurs=function(){');
  vrai('le balisage : la carte porte `.usr-c` et sa rangée d\'en-tête est un div role="button"',
    /class="card usr-c\$\{ouv\?' on':''\}"[^`]*`?\s*[\s\S]{0,40}<div style="display:flex;gap:13px;align-items:center;flex-wrap:wrap;cursor:pointer" onclick="usrDeplier\('\$\{u\.id\}'\)" role="button"/.test(UT));
}

console.log('\n── 1110 · 5. « Passage suivant » : la VRAIE planNextModal, jouée (interventions#11) ──');
{
  const F = bloc('function planNextModal(id){');
  vrai('planNextModal est trouvée', F.length > 1500);
  let html = null;
  const ctx = { console, JSON, Math, Date, String, Array, Object, Number,
    db: { interventions: [{ id: 'i1', titre: 'Dératisation', clientId: 'c1', date: '2026-11-15', recurrence: 'mensuelle', passageTotal: 2, passageNum: 1 }], clients: [{ id: 'c1', nom: 'Boulangerie Dupont' }], techniciens: [] },
    intHisto: () => [], intTechIds: () => [], shiftDay: d => d, _copieInt: i => i,
    PLAN_FREQ: { mensuelle: 30 }, INT_RECUR: { mensuelle: 'mensuelle' },
    planPrefOf: () => ({}), planNextCompute: () => ({ date: '2026-11-15', heure: '09:00', techId: '' }),
    esc: s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    clientName: () => 'Boulangerie Dupont', fmtLong: () => 'dimanche 15 novembre 2026', techName: () => '', techPuces: () => '',
    openModal: h => { html = h; }, closeModal() {}, go() {}, current: 'interventions', fmtShort: () => '', uid: () => 'x', todayISO: () => '2026-10-16',
    planNextCreate() {}, toast() {}, save() {}, planNextManual() {} };
  vm.createContext(ctx);
  let err = null;
  try { vm.runInContext(F + '\nplanNextModal("i1");', ctx); } catch (e) { err = String(e && e.message || e); }
  vrai('la fonction s\'exécute et ouvre la fenêtre', html !== null && !err, err);
  const m = html && /<button class="btn" style="([^"]*)" onclick="planNextCreate\('i1','auto'\)">([\s\S]*?)<\/button>/.exec(html);
  vrai('le bouton « Proposition auto » est écrit', !!m);
  if (m) {
    const st = {}; m[1].split(';').forEach(d => { const k = d.indexOf(':'); if (k > 0) st[d.slice(0, k).trim()] = d.slice(k + 1).trim(); });
    v('  … white-space:normal EN LIGNE (une ligne de 795 px dans une fenêtre de 388 sinon)', st['white-space'], 'normal');
    v('  … min-width:0', st['min-width'], '0');
    v('  … max-width:100%', st['max-width'], '100%');
    v('  … il garde sa pleine largeur et son alignement à gauche', [st['width'], st['text-align']], ['100%', 'left']);
    vrai('  … son texte est dans un span qui peut rétrécir et casser un mot long', /<span style="min-width:0;overflow-wrap:anywhere"><b>Proposition auto<\/b>/.test(m[2]), m[2].slice(0, 80));
    vrai('  … le libellé complet y est (date, heure, technicien)', /Proposition auto<\/b> — dimanche 15 novembre 2026 à 09:00 · Non assigné/.test(m[2]));
  }
}

console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
