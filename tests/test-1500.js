/* ⛔ CE QUE CE FICHIER GARDE — six régressions de MISE EN PAGE nées de règles CSS de la vague 1, qui s'appliquaient plus
   large que leur intention (lot i01, 17 octobre 2026). Une même famille : « une moitié de règle survit à l'autre » — la règle
   corrigeait un cas (une rangée qui sortait de sa carte, un tableau coupé, un libellé sur deux lignes) et touchait un autre
   composant qui n'avait rien demandé.

     · r3#2  — Paramètres, « ＋ Ajouter » (Mes sociétés) : `white-space:normal` + `overflow-wrap:anywhere` posés (g04) sur
               TOUT `.btn` d'une rangée sans classe ramenaient sa largeur minimale à UNE lettre ; le champ (`flex:1`) prenait la
               place, le bouton devenait une colonne de lettres (49 × 156 px sur un Android de 360) ;
     · r3#4  — le sélecteur de langue passé à la ligne (g04) gardait le rayon 999 px de la vitre : une pilule de 102 px avec
               « Español » seul en bas ;
     · r3#7  — « Proposition auto » (Passage suivant) : `.btn{padding:0 16px!important}` bat le `padding` EN LIGNE, donc un
               libellé sur plusieurs lignes touchait les bords (0 px / 1 px) dans une pilule de 999 px ;
     · r3#10 — `td.cel-gestes{white-space:normal!important}` (g03) posée à TOUTES les largeurs : sur ordinateur, Devis et
               Contrats passaient leurs gestes sur deux lignes alors que le tableau tenait ;
     · r3#11 — `.frow-val>input{appearance:none}` retirait tout rendu à une case à cocher : « Active » (enveloppe), « Box
               active », « Intervention effectuée » — coché ou décoché, la même image ;
     · r3#13 — le bouton « Envoyer les bons prêts… » des Bons de commande, nowrap, sortait de sa carte et faisait défiler la
               page de côté (401 px pour 360).

   Comment. Ce qu'on peut JOUER l'est : le bouton groupé des bons est la VRAIE ligne `bulkBtn` extraite d'app.html et exécutée,
   « Proposition auto » est la VRAIE `planNextModal`. Le reste est de la feuille : on lit TOUTES les règles (blocs <style>,
   commentaires retirés, @media / @container conservés, ordre gardé) et on garde ce qu'une règle GAGNE (spécificité comptée,
   ordre, !important) face aux règles génériques qui écrasaient — pas seulement son texte. On vérifie aussi que les sélecteurs
   visent le balisage que le code ÉCRIT : une règle juste sur un balisage qui n'existe plus ne garde rien.
   La preuve au pixel est une sonde navigateur (scratchpad/gestion/correctifs/i01/sonde-i01.js : android 360, iphone 390, ipad
   820, mac 1440, jour et nuit, après deux trames, population comptée) ; ses chiffres d'avant/après sont dans le commit.
   APP_FICHIER : une copie mutée, pour éprouver ce banc sans toucher au fichier du dépôt. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
/* le JavaScript sans ses commentaires : on découpe sur les LIGNES, jamais au travers (un bloc qui commence une ligne) */
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

/* ══ 0. LA FEUILLE ENTIÈRE, EN RÈGLES ORDONNÉES ══════════════════════════════════════════════════════════════ */
function apparier(s, i) {
  const ouv = s[i], fer = { '(': ')', '[': ']', '{': '}' }[ouv]; let prof = 0, q = null;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === ouv) prof++; else if (c === fer && !--prof) return k;
  }
  return -1;
}
function scinder(s, sep) {
  const out = []; let prof = 0, q = null, deb = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '(' || c === '[') prof++;
    else if (c === ')' || c === ']') prof--;
    else if (c === sep && !prof) { out.push(s.slice(deb, k)); deb = k + 1; }
  }
  out.push(s.slice(deb)); return out;
}
const REGLES = []; let ORDRE = 0;
(function lireFeuilles() {
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g; let m;
  while ((m = re.exec(BRUT))) {
    const css = m[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
    (function lire(i, fin, media) {
      while (i < fin) {
        let acc = -1, q = null, prof = 0;
        for (let k = i; k < fin; k++) {
          const c = css[k];
          if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
          if (c === '"' || c === "'") q = c; else if (c === '(') prof++; else if (c === ')') prof--;
          else if (c === '{' && !prof) { acc = k; break; }
        }
        if (acc < 0) break;
        const prelude = css.slice(i, acc).trim(), ferme = apparier(css, acc);
        if (ferme < 0) break;
        if (/^@(media|container|supports)\b/i.test(prelude)) lire(acc + 1, ferme, media.concat([prelude.replace(/\s+/g, ' ').replace(/^(@\w+) ?\(/, '$1 (')]));
        else if (!prelude.startsWith('@')) {
          const decl = {};
          scinder(css.slice(acc + 1, ferme), ';').forEach(d => {
            const k = d.indexOf(':'); if (k < 0) return;
            let val = d.slice(k + 1).trim(); const imp = /!\s*important\s*$/i.test(val);
            if (imp) val = val.replace(/!\s*important\s*$/i, '').trim();
            decl[d.slice(0, k).trim().toLowerCase()] = { val: val.replace(/\s+/g, ' '), imp };
          });
          const o = ORDRE++;
          for (const sel of scinder(prelude, ',')) if (sel.trim()) REGLES.push({ sel: sel.trim().replace(/\s+/g, ' '), media: media.join(' | '), decl, ordre: o });
        }
        i = ferme + 1;
      }
    })(0, css.length, []);
  }
})();
/* spécificité (a,b,c) : :where() ne pèse rien, :not/:is/:has pèsent leur argument le plus fort, un attribut ou une pseudo-classe pèse b */
const finId = (s, i) => { while (i < s.length && /[\w\-]/.test(s[i])) i++; return i; };
const cmp = (p, q) => (p[0] - q[0]) || (p[1] - q[1]) || (p[2] - q[2]);
function spec(sel) {
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < sel.length;) {
    const ch = sel[i];
    if (ch === '#') { a++; i = finId(sel, i + 1); }
    else if (ch === '.') { b++; i = finId(sel, i + 1); }
    else if (ch === '[') { b++; i = apparier(sel, i) + 1; }
    else if (ch === ':') {
      const pe = sel[i + 1] === ':', d = i + (pe ? 2 : 1), j = finId(sel, d), nom = sel.slice(d, j).toLowerCase();
      if (pe) { c++; i = sel[j] === '(' ? apparier(sel, j) + 1 : j; }
      else if (sel[j] === '(') {
        const k = apparier(sel, j);
        if (['not', 'is', 'has', 'matches'].includes(nom)) {
          const m = scinder(sel.slice(j + 1, k), ',').map(x => spec(x.replace(/^[\s>+~]+/, ''))).reduce((p, q) => cmp(p, q) >= 0 ? p : q, [0, 0, 0]);
          a += m[0]; b += m[1]; c += m[2];
        } else if (nom !== 'where') b++;
        i = k + 1;
      } else { b++; i = j; }
    }
    else if (/[a-zA-Z]/.test(ch)) { c++; i = finId(sel, i); }
    else i++;
  }
  return [a, b, c];
}
console.log('\n── 1500 · 0. la feuille ──');
vrai('la feuille est lue en règles (une liste vide passerait au vert sur tout)', REGLES.length > 3000, REGLES.length);
vrai('les règles portent leur @media / @container', REGLES.some(r => /^@media/.test(r.media)) && REGLES.some(r => /^@container/.test(r.media)));
v('la spécificité compte :where() pour rien et :not() pour son argument', [spec('html[data-refonte] .btn:where(:not([style*="x"]))'), spec('.a:not(.b)')], [[0, 2, 1], [0, 2, 0]]);
const PARAM = bloc('views.parametres=function(){');
const FRAC = '(?:input:not\\(\\[type=hidden\\],\\[type=file\\],\\[type=checkbox\\],\\[type=radio\\]\\),select,textarea)';
const TEL = '@media (max-width:780px)';

/* ══ 1. r3#2 — le bouton « ＋ Ajouter » d'une rangée à champ ═══════════════════════════════════════════════════ */
console.log('\n── 1500 · 1. un bouton à côté d\'un champ ne s\'écrase pas (r3#2) ──');
{
  vrai('views.parametres est trouvée', PARAM.length > 5000);
  const rang = /<div style="display:flex;gap:6px;margin-bottom:4px"><input id="ent-soc-new"[^>]*><button class="btn sm" onclick="entSocAdd\(\)">＋ Ajouter<\/button><\/div>/.test(PARAM);
  vrai('le balisage : « ＋ Ajouter » est un .btn frère d\'un champ, dans une rangée flex SANS classe', rang);
  const cible = REGLES.filter(r => /^html\[data-refonte\] #content \.card > div:not\(\[class\]\)/.test(r.sel) && /> \.btn$/.test(r.sel) && r.decl['white-space'] && r.decl['white-space'].val === 'normal');
  vrai('la règle « .btn d\'une rangée sans classe → white-space:normal » existe', cible.length === 1, cible.map(r => r.sel));
  const r = cible[0];
  if (r) {
    v('  … au téléphone seulement', r.media, TEL);
    vrai('  … elle EXCLUT la rangée qui porte un champ de saisie (`:not(:has(> input…, select, textarea))`) : sinon le bouton s\'écrase',
      new RegExp(':not\\(\\[class\\]\\):not\\(:has\\(> :is\\(' + FRAC + '\\)\\)\\) > \\.btn$').test(r.sel), r.sel);
    vrai('  … et ne perd pas son effet sur les autres rangées (le champ caché, la case, le `file` en display:none ne comptent pas comme champ : Exporter / Importer gardent leur retour à la ligne)',
      /type=hidden\],\[type=file\],\[type=checkbox\],\[type=radio\]/.test(r.sel));
  }
  const champ = REGLES.filter(x => /:has\(> :is\(input/.test(x.sel) && x.decl['min-width'] && x.decl['min-width'].val === '0' && !/:not\(:has/.test(x.sel));
  vrai('le CHAMP de cette rangée peut rétrécir (`min-width:0`) : sans ça la rangée sort de la carte', champ.length === 1 && champ[0].media === TEL, champ.map(x => [x.sel.slice(0, 80), x.media]));
  vrai('aucune règle ne passe un bouton de rangée à champ en `overflow-wrap:anywhere` sans l\'avoir exclu',
    REGLES.filter(x => x.decl['overflow-wrap'] && x.decl['overflow-wrap'].val === 'anywhere' && /> \.btn$/.test(x.sel) && !/:not\(:has\(/.test(x.sel) && /div:not\(\[class\]\)/.test(x.sel)).length === 0);
}

/* ══ 2. r3#4 — la rangée de langues ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── 2. le sélecteur de langue (r3#4) ──');
{
  const rang = REGLES.find(r => /^html\[data-refonte\] \.filters:has\(> \.chip\[onclick\^="setLang\("\]\)$/.test(r.sel));
  vrai('la règle de la rangée existe', !!rang);
  if (rang) {
    v('  … au téléphone', rang.media, TEL);
    vrai('  … elle porte aussi SON rayon (la moitié qui survivait : 999 px de la vitre sur une rangée passée à deux lignes)',
      !!rang.decl['border-radius'] && rang.decl['border-radius'].imp && parseFloat(rang.decl['border-radius'].val) <= 28, rang.decl['border-radius']);
  }
  const ch = REGLES.find(r => /^html\[data-refonte\] \.filters:has\(> \.chip\[onclick\^="setLang\("\]\) > \.chip\[onclick\^="setLang\("\]$/.test(r.sel));
  vrai('une règle serre les trois pastilles pour qu\'elles tiennent sur une ligne à 360 px', !!ch);
  if (ch) {
    v('  … sur téléphone', ch.media, TEL);
    vrai('  … marge latérale ≤ 8 px (!important : la règle tactile pose 16 px)', ['padding-left', 'padding-right'].every(p => ch.decl[p] && ch.decl[p].imp && parseFloat(ch.decl[p].val) <= 8), [ch.decl['padding-left'], ch.decl['padding-right']]);
    vrai('  … elles se partagent la place (flex-grow)', !!ch.decl['flex'] && /^1 /.test(ch.decl['flex'].val), ch.decl['flex']);
  }
  vrai('le balisage : les pastilles sont des `.chip` à onclick="setLang(\'…\')", enfants directs d\'une `.filters`',
    /<div class="filters" style="margin:0">\$\{Object\.entries\(LANGS\)\.map\(\(\[k,v\]\)=>`<div class="chip [^`]*onclick="setLang\('\$\{k\}'\)">/.test(PARAM));
}

/* ══ 3. r3#7 et r3#13 — un libellé sur plusieurs lignes garde son air, et n'est pas une pilule ════════════════════ */
console.log('\n── 3. les boutons à libellé sur plusieurs lignes (r3#7, r3#13) ──');
{
  /* la VRAIE planNextModal et la VRAIE ligne bulkBtn */
  const F = bloc('function planNextModal(id){');
  let html = null;
  const ctx = { console, JSON, Math, Date, String, Array, Object, Number,
    db: { interventions: [{ id: 'i1', titre: 'Dératisation', clientId: 'c1', date: '2026-11-15', recurrence: 'mensuelle' }], clients: [{ id: 'c1', nom: 'X' }], techniciens: [] },
    intHisto: () => [], intTechIds: () => [], shiftDay: d => d, PLAN_FREQ: { mensuelle: 30 }, INT_RECUR: { mensuelle: 'mensuelle' },
    planPrefOf: () => ({}), planNextCompute: () => ({ date: '2026-11-15', heure: '09:00', techId: '' }),
    esc: s => String(s == null ? '' : s), clientName: () => 'X', fmtLong: () => 'dimanche 15 novembre', techName: () => '', openModal: h => { html = h; },
    closeModal() {}, go() {}, current: 'interventions', todayISO: () => '2026-10-16', planNextCreate() {} };
  vm.createContext(ctx);
  let err = null; try { vm.runInContext(F + '\nplanNextModal("i1");', ctx); } catch (e) { err = String(e && e.message || e); }
  const m = html && /<button class="btn" style="([^"]*)" onclick="planNextCreate\('i1','auto'\)">/.exec(html);
  vrai('« Proposition auto » est écrit par la vraie planNextModal', !!m, err);
  const stPlan = m ? m[1] : '';
  const l = SRC.split('\n').find(x => /^\s*const bulkBtn = /.test(x)) || '';
  vrai('la ligne bulkBtn est trouvée', l.length > 100);
  const c2 = { bonsFilter: 'prets', list: [1, 2] }; vm.createContext(c2);
  let bulk = ''; try { vm.runInContext(l.replace(/^\s*const bulkBtn/, 'var bulkBtn') + '\nthis.sortie = bulkBtn;', c2); bulk = c2.sortie; } catch (e) { bulk = 'ERR ' + e.message; }
  const mb = /<button class="btn" style="([^"]*)" onclick="bonEnvoyerTousPrets\(\)">([^<]*)<\/button>/.exec(bulk);
  vrai('le bouton groupé des bons est écrit (filtre « Prêts à envoyer »)', !!mb, bulk.slice(0, 120));
  const stBulk = mb ? mb[1] : '';
  vrai('⛔ r3#13 : le bouton groupé passe à la ligne EN LIGNE (`.btn` est nowrap : 385 px pour 328 sinon, et la page défile de côté)', /(^|;)white-space:normal(;|$)/.test(stBulk), stBulk);
  vrai('  … il garde sa pleine largeur et son centrage', /width:100%/.test(stBulk) && /justify-content:center/.test(stBulk) && /text-align:center/.test(stBulk), stBulk);
  vrai('  … le libellé complet y est (compte compris)', !!mb && /Envoyer les bons prêts… \(2\) — tu choisis lesquels/.test(mb[2]), mb && mb[2]);
  vrai('  … et le même bouton ne s\'écrit PAS hors du filtre « Prêts à envoyer »', (() => { const c3 = { bonsFilter: 'attente', list: [1] }; vm.createContext(c3); vm.runInContext(l.replace(/^\s*const bulkBtn/, 'var bulkBtn') + '\nthis.sortie = bulkBtn;', c3); return c3.sortie === ''; })());

  /* ce que les règles ciblent : l'attribut est lu dans le TEXTE du style en ligne */
  const SEL_ATTR = '[style*="white-space:normal"]';
  vrai('« Proposition auto » porte `white-space:normal` en ligne (le crochet d\'attribut le reconnaît)', stPlan.includes('white-space:normal'), stPlan);
  vrai('le bouton groupé aussi', stBulk.includes('white-space:normal'));
  const pad = REGLES.filter(r => /\.btn\[style\*="white-space:normal"\]/.test(r.sel) && r.decl['padding-block']);
  vrai('⛔ r3#7 : une règle rend un rembourrage VERTICAL au bouton qui demande le retour à la ligne', pad.length === 1, pad.map(r => r.sel));
  const P = pad[0];
  if (P) {
    vrai('  … `padding-block` en !important (le shorthand !important des `.btn` bat le style en ligne : seule une règle !important le bat)', P.decl['padding-block'].imp, P.decl['padding-block']);
    vrai('  … d\'au moins 8 px (0 px en haut, 1 px en bas, mesuré)', parseFloat(P.decl['padding-block'].val) >= 8, P.decl['padding-block']);
    /* ce qu'elle GAGNE : face à chaque règle générique qui pose un padding !important sur n'importe quel .btn */
    const sp = spec(P.sel);
    const genes = REGLES.filter(r => r.decl['padding'] && r.decl['padding'].imp && /^(html\[data-refonte\] )?\.btn(\.sm)?$/.test(r.sel));
    vrai('  … il y a bien des règles génériques à battre (compteur de population : `.btn`, `.btn.sm` et `html[data-refonte] .btn`)', genes.length >= 3, genes.map(g => g.sel));
    for (const g of genes) {
      const sg = spec(g.sel);
      vrai('  … elle GAGNE contre « ' + g.sel + ' » (' + g.decl['padding'].val + ' !important' + (g.media ? ', ' + g.media : '') + ')',
        cmp(sp, sg) > 0 || (cmp(sp, sg) === 0 && P.ordre > g.ordre), { P: sp, g: sg });
    }
  }
  const ray = REGLES.filter(r => /\.btn\[style\*="white-space:normal"\]/.test(r.sel) && r.decl['border-radius']);
  vrai('⛔ r3#7 : le bouton multi-lignes n\'est pas une pilule de 999 px (un demi-disque rogne son texte)', ray.length === 1 && ray[0].decl['border-radius'].imp && parseFloat(ray[0].decl['border-radius'].val) <= 28, ray.map(r => r.decl['border-radius']));
  if (ray[0]) {
    const pilule = REGLES.filter(r => r.decl['border-radius'] && /999px/.test(r.decl['border-radius'].val) && r.decl['border-radius'].imp && /(^|\s)\.btn$/.test(r.sel) && /data-verre/.test(r.sel));
    vrai('  … elle GAGNE contre la pilule générale (`[data-verre] .btn{border-radius:999px!important}`)', pilule.length >= 1 && pilule.every(g => cmp(spec(ray[0].sel), spec(g.sel)) > 0 || (cmp(spec(ray[0].sel), spec(g.sel)) === 0 && ray[0].ordre > g.ordre)), pilule.map(g => g.sel));
  }
  vrai('le plancher tactile de 46 px reste posé pour tous les `.btn` (la règle n\'a pas été retirée)', REGLES.some(r => r.sel === 'html[data-refonte] .btn' && r.media === '@media (pointer:coarse)' && r.decl['min-height'] && r.decl['min-height'].val === '46px'));
}

/* ══ 4. r3#10 — les gestes d'un tableau passent à la ligne EN MODE CARTE seulement ═══════════════════════════════ */
console.log('\n── 4. la cellule de gestes (r3#10) ──');
{
  const cel = REGLES.filter(r => r.sel === 'html[data-refonte] .list-tbl td.cel-gestes' && r.decl['white-space']);
  vrai('des règles posent `white-space` sur la cellule de gestes (compteur de population)', cel.length >= 2, cel.length);
  vrai('⛔ aucune n\'est posée hors média (à toutes les largeurs, Devis et Contrats passaient sur deux lignes au bureau)', cel.every(r => r.media !== ''), cel.map(r => r.media));
  vrai('  … le palier téléphone la pose', cel.some(r => r.media === TEL && r.decl['white-space'].val === 'normal' && r.decl['white-space'].imp));
  vrai('  … la requête de conteneur du tableau (carte étroite, tablette) aussi', cel.some(r => /^@media\(min-width:781px\) \| @container tbl-liste \(max-width:900px\)$/.test(r.media) || /^@media ?\(min-width:781px\) \| @container tbl-liste/.test(r.media)), cel.map(r => r.media));
  /* le balisage : ce sont bien les cellules à nowrap en ligne que la règle d'avant écrasait */
  const tout = SRC;
  vrai('le balisage : la cellule de gestes des Devis porte `white-space:nowrap` EN LIGNE (c\'est ce que le bureau doit garder)', /<td class="cel-gestes" style="text-align:right;white-space:nowrap">\s*\$\{vMod\?`<button class="btn sm" onclick="envoiDoc/.test(tout));
  vrai('le balisage : celle des Contrats aussi', /<td class="cel-gestes" style="text-align:right;white-space:nowrap">\$\{iAj\?`<button class="btn sm" title="Générer la prochaine intervention"/.test(tout));
  vrai('le tableau passe en mode carte par `.tbl-wrap:has(>.list-tbl .cel-gestes)` : la requête de conteneur existe toujours', REGLES.some(r => r.sel === 'html[data-refonte] .tbl-wrap:has(>.list-tbl .cel-gestes)' && r.decl['container']));

  /* ── relecture de r3#10 : entre la carte (≤ 900 px) et le bureau, le nowrap en ligne fait sortir le tableau de sa carte ──
     Mesuré au navigateur (scratchpad/gestion/correctifs/i01/sonde-i01-largeurs.js) : un devis accepté DÉJÀ facturé (« Voir la
     facture », huit gestes) donne une table de 973 px minimum ; à 1 280 px la carte en fait 904 (69 px qui sortent), à 1 320 px 944
     (29 px), à 1 366 px 990 (rien). Dans cette plage la cellule retrouve donc son retour à la ligne (c'était son état d'avant r3#10). */
  const tier = REGLES.filter(r => r.sel === 'html[data-refonte] .list-tbl td.cel-gestes:has(>.btn:nth-of-type(5))' && r.decl['white-space']);
  vrai('⛔ relecture r3#10 : une règle rend le retour à la ligne aux cellules de gestes de cinq boutons ou plus, dans une plage de conteneur (compteur de population)', tier.length === 1, tier.length);
  if (tier[0]) {
    const m = /@container tbl-liste \(min-width:(\d+)px\) and \(max-width:(\d+)px\)$/.exec(tier[0].media);
    vrai('  … posée DANS la requête de conteneur du tableau, bornée des deux côtés (min-width ET max-width)', !!m, tier[0].media);
    vrai('  … `white-space:normal!important` (le style en ligne est battu)', tier[0].decl['white-space'].val === 'normal' && tier[0].decl['white-space'].imp);
    const seuilCarte = +(/@container\s+tbl-liste\s*\(max-width:\s*(\d+)px\)/.exec(SRC) || [])[1];
    vrai('  … commence là où la carte finit (le seuil de la mise en cartes + 1 : aucun trou entre les deux)', !!m && +m[1] === seuilCarte + 1, [m && m[1], seuilCarte]);
    vrai('  … finit au-dessus de la table la plus large mesurée (973 px, devis déjà facturé) et sous la carte d\'un portable à 1 366 px (990 px : le gain reste là)', !!m && +m[2] >= 973 && +m[2] < 990, m && m[2]);
    vrai('  … reste un tableau : elle ne passe pas la cellule en flex (c\'est le travail du mode carte, plus haut)', !tier[0].decl['display']);
  }
  /* la population que la règle vise : les gestes des Devis (7 à 8 boutons), pas ceux des Contrats (3) qui tiennent sur une ligne */
  const nbBtn = (re) => { const i = SRC.search(re); if (i < 0) return -1; const f = SRC.indexOf('</td>', i); return (SRC.slice(i, f).match(/<button /g) || []).length; };
  const nbDevis = nbBtn(/<td class="cel-gestes" style="text-align:right;white-space:nowrap">\s*\$\{vMod\?`<button class="btn sm" onclick="envoiDoc/);
  const nbContrat = nbBtn(/<td class="cel-gestes" style="text-align:right;white-space:nowrap">\$\{iAj\?`<button class="btn sm" title="Générer la prochaine intervention"/);
  vrai('la cellule de gestes des Devis compte au moins cinq boutons dans son balisage (la règle la vise)', nbDevis >= 5, nbDevis);
  vrai('celle des Contrats en compte moins de cinq (la règle ne la touche pas : trois boutons tiennent sur une ligne)', nbContrat > 0 && nbContrat < 5, nbContrat);
}

/* ══ 5. r3#11 — une case à cocher n'est pas un champ de saisie ════════════════════════════════════════════════ */
console.log('\n── 5. les cases nues d\'une rangée (r3#11) ──');
{
  const quiRetire = REGLES.filter(r => /\.frow-val ?> ?input/.test(r.sel) && ['appearance', '-webkit-appearance'].some(p => r.decl[p] && r.decl[p].val === 'none'));
  vrai('une règle retire l\'apparence aux champs de `.frow-val` (compteur de population)', quiRetire.length >= 1, quiRetire.length);
  vrai('⛔ aucune ne vise une case à cocher ni un bouton radio : chacune les exclut',
    quiRetire.every(r => scinder(r.sel, ',').every(s => !/\.frow-val ?> ?input/.test(s) || (/:not\(\[type=checkbox\]\)/.test(s) && /:not\(\[type=radio\]\)/.test(s)))), quiRetire.map(r => r.sel));
  const tout = REGLES.filter(r => ['appearance', '-webkit-appearance'].some(p => r.decl[p] && r.decl[p].val === 'none') && /(^|[\s,>])input(\[type=checkbox\])?($|[\s,:.[])/.test(r.sel) && !/(^|\s)select/.test(r.sel) && !/::/.test(r.sel));
  /* c2 (17 octobre 2026) : UNE règle commune retire l'apparence native des cases — mais elle les DESSINE (trait, remplissage, coche : test-1678).
     C'est la seule permise, nommée ; une autre qui retirerait l'apparence sans dessiner serait le défaut d'origine. */
  vrai('aucune règle générale ne retire non plus l\'apparence de TOUTE case (`input{appearance:none}`) — sauf la règle commune qui la DESSINE (test-1678)', tout.every(r => r.sel === 'html[data-refonte] input[type=checkbox]:not(.cb-natif)' || /type=(?!checkbox)/.test(r.sel) || /\.frow-val ?> ?input:not/.test(r.sel) || /\.frow-val/.test(r.sel) === false && /type=/.test(r.sel)), tout.map(r => r.sel));
  /* le balisage : les trois cases nues sont bien des enfants DIRECTS de `.frow-val` — la forme que visait la règle d'avant */
  vrai('le balisage : « Active » (enveloppe) est une case nue dans `.frow-val`', /<span class="frow-lbl">Active<\/span><div class="frow-val"><input type="checkbox" name="actif"/.test(SRC));
  vrai('le balisage : « Box active » / « Stockage actif » aussi', /<div class="frow-val"><input type="checkbox" name="actif" \$\{b\.actif!==false\?'checked':''\}/.test(SRC));
  vrai('le balisage : « Intervention effectuée » aussi', /Intervention effectuée<\/span><div class="frow-val"><input type="checkbox" name="effectuee"/.test(SRC));
  /* la contre-épreuve : ce que la règle d'avant protégeait reste vrai — les VRAIS champs sont toujours dénudés */
  const champs = REGLES.find(r => /^\.frow-val ?> ?input:not\(\[type=checkbox\]\):not\(\[type=radio\]\)$/.test(r.sel));
  vrai('contre-épreuve : les champs de saisie gardent le fond transparent et l\'apparence retirée', !!champs && champs.decl['appearance'].val === 'none' && champs.decl['background'].val === 'transparent');
  vrai('contre-épreuve : les listes et les zones de texte aussi (même règle, mêmes déclarations)', REGLES.some(r => r.sel === '.frow-val>select' && r.decl['appearance'] && r.decl['appearance'].val === 'none') && REGLES.some(r => r.sel === '.frow-val>textarea' && r.decl['appearance'] && r.decl['appearance'].val === 'none'));
  const FC = bloc('function formConducteur(id){');
  vrai('contre-épreuve : « Actif » du conducteur reste un `.switch` (piste + curseur) — c\'est le seul qui était juste', /<span class="switch"><input type="checkbox" name="actif"[^>]*><span class="track"><\/span><span class="knob"><\/span>/.test(FC));
  vrai('contre-épreuve : le `.switch` cache son champ et dessine sa piste (le seul rendu qu\'on voit)', REGLES.some(r => r.sel === '.switch input' && r.decl['display'] && r.decl['display'].val === 'none') && REGLES.some(r => r.sel === '.switch input:checked + .track'));
}

console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
