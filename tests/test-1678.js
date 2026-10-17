/* ⛔ CE QUE CE FICHIER GARDE — UNE CASE À COCHER, UN SEUL DESSIN (lot c2-cases-nues, 17 octobre 2026).
   Le défaut d'origine (campagne de test, r3#11) : `.frow-val>input{appearance:none}` retirait tout rendu aux cases nues — « Active »
   (enveloppe), « Box active » / « Stockage actif », « Intervention effectuée » : coché ou décoché, la MÊME image. i01 a rendu l'apparence
   native à ces cases (test-1500) ; mesuré au navigateur après lui, restait ce que l'apparence native ne tient pas :
     · le CONTRASTE de l'état coché : `accent-color` colore le remplissage de `--acc`, un aplat réglé pour un bouton, pas pour un
       indicateur. Mesuré au pixel contre le fond de la rangée (onze teintes, jour et nuit) : 2,62:1 sous le vert de jour (la teinte de
       presque tout le monde), 2,59 sous l'orange, 2,71 sous l'indigo de nuit, 1,94 sous l'indigo d'une rangée de nuit — sous les 3:1
       d'un indicateur d'interface (WCAG 1.4.11) ;
     · la TAILLE : écrite EN LIGNE case par case (38×24, 46×28, 40×24, 17 à 26 px), donc une case oblongue ou de 17 px que rien ne ramène
       à un plancher ; au doigt, une cible de 24 px de haut ;
     · dans `.field`, la règle des champs (`padding:10px 14px!important`, fond et bord à elle) étirait la case à 30 px de large.
   Un seul mécanisme, donc : la règle `html[data-refonte] input[type=checkbox]:not(.cb-natif)` DESSINE la case — trait `--t3` décoché,
   remplissage `--acc-txt` coché (le jeton d'encre d'accent, que test-773/774 tiennent à 4,5:1 sous chaque teinte), coche en `::after`,
   dimensions en `!important` (elles battent le `style=` en ligne), zone de toucher de 44 px au doigt (`::before`), anneau de focus au clavier.
   Comment. On lit TOUTES les règles (blocs <style>, commentaires retirés, @media conservés, ordre gardé) et on garde ce qu'une règle
   GAGNE (spécificité, ordre, !important) face aux règles de champs qui écrasaient — pas seulement son texte. Le balisage est lu pour
   ce que le code ÉCRIT (population comptée avant tout « aucun »). La preuve au pixel est une sonde navigateur
   (scratchpad/gestion/correctifs-c2/c2-cases-nues/contraste.js, population.js, photo.js : iPhone 390 et Mac 1440, jour et nuit, onze
   teintes, après deux trames) ; ses chiffres d'avant/après sont dans le commit.
   APP_FICHIER : une copie mutée, pour éprouver ce banc sans toucher au fichier du dépôt. */
'use strict';
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
/* le JavaScript sans ses commentaires : on découpe sur les LIGNES, jamais au travers (un bloc qui commence une ligne) */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* ══ 0. LA FEUILLE ENTIÈRE, EN RÈGLES ORDONNÉES (même lecteur que test-1500) ═══════════════════════════════════════════ */
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
const CB = 'html[data-refonte] input[type=checkbox]:not(.cb-natif)';
const px = (r, p) => r && r.decl[p] ? r.decl[p].val : undefined;
const imp = (r, p) => !!(r && r.decl[p] && r.decl[p].imp);
const regle = (sel, media) => REGLES.filter(r => r.sel === sel && (media === undefined || r.media === media));
console.log('\n── 1678 · 0. la feuille ──');
vrai('la feuille est lue en règles (une liste vide passerait au vert sur tout)', REGLES.length > 3000, REGLES.length);
v('la spécificité compte :not() pour son argument et ::after pour un élément', [spec(CB), spec(CB + '::after'), spec('html[data-refonte] .field input')], [[0, 3, 2], [0, 3, 3], [0, 2, 2]]);

/* ══ 1. LE DESSIN : trait, remplissage, coche ════════════════════════════════════════════════════════════════════════ */
console.log('\n── 1678 · 1. une case est DESSINÉE : décochée et cochée ne se ressemblent pas ──');
const base = regle(CB, '')[0];
vrai('la règle de la case existe, une seule fois, hors de tout @media', regle(CB, '').length === 1, regle(CB).map(r => r.media));
if (base) {
  vrai('  … elle retire l\'apparence native (les DEUX écritures : `-webkit-appearance` pour Safari)', px(base, 'appearance') === 'none' && px(base, '-webkit-appearance') === 'none', [px(base, 'appearance'), px(base, '-webkit-appearance')]);
  vrai('  … le trait décoché est un trait de 2 px en `--t3` (l\'encre secondaire, ≥ 4,5:1 sur une carte), pas `--brd` (1,2:1) : une case vide se VOIT',
    px(base, 'border') === '2px solid var(--t3)', px(base, 'border'));
  vrai('  … le fond décoché est transparent : la case montre la rangée qu\'elle borde', px(base, 'background-color') === 'transparent' && px(base, 'background-image') === 'none', [px(base, 'background-color'), px(base, 'background-image')]);
  vrai('  … la case est repère de positionnement (`position:relative`) : sa coche et sa zone de toucher s\'y accrochent', px(base, 'position') === 'relative');
  vrai('  … `box-sizing:border-box` et rembourrage nul : la taille posée EST la taille peinte', px(base, 'box-sizing') === 'border-box' && px(base, 'padding') === '0');
}
const coche = regle(CB + ':checked', '')[0];
vrai('la règle de l\'état COCHÉ existe', regle(CB + ':checked', '').length === 1);
if (coche) {
  vrai('  … remplissage ET bord en `--acc-txt` (jeton d\'encre d\'accent, tenu à 4,5:1 sous chaque teinte par test-773/774)', px(coche, 'background-color') === 'var(--acc-txt)' && px(coche, 'border-color') === 'var(--acc-txt)', [px(coche, 'background-color'), px(coche, 'border-color')]);
  vrai('  … JAMAIS `--acc` ni `--acc-fill` (l\'aplat d\'un bouton : mesuré 2,62:1 sous le vert de jour, 1,94 sous l\'indigo de nuit)',
    !/var\(--acc\)|var\(--acc-fill\)|var\(--acc2\)/.test(px(coche, 'background-color') + px(coche, 'border-color')));
  vrai('  … en `!important` : la règle des champs (`.field input{background:…!important}`) écrase sinon le remplissage', imp(coche, 'background-color') && imp(coche, 'border-color'));
}
const apres = regle(CB + '::after', '')[0], apresCoche = regle(CB + ':checked::after', '')[0];
vrai('la coche est dessinée en `::after`, cachée (`scale(0)`) tant que la case n\'est pas cochée et montrée (`scale(1)`) quand elle l\'est',
  !!apres && !!apresCoche && /scale\(0\)/.test(px(apres, 'transform')) && /scale\(1\)/.test(px(apresCoche, 'transform')), [px(apres, 'transform'), px(apresCoche, 'transform')]);
if (apres) {
  vrai('  … la coche est un trait (bordure droite + basse) dans la couleur de la SURFACE (`--bg1`) : elle se lit sur le remplissage en `--acc-txt`', /^solid var\(--bg1(,[^)]*)?\)$/.test(px(apres, 'border')) && /^0 [\d.]+px [\d.]+px 0$/.test(px(apres, 'border-width')), [px(apres, 'border'), px(apres, 'border-width')]);
  vrai('  … elle a un contenu (sans `content` un pseudo-élément n\'est pas peint) et se pose en absolu dans la case', px(apres, 'content') === "''" && px(apres, 'position') === 'absolute');
}
vrai('l\'état décoché et l\'état coché ne portent PAS le même fond : c\'est ce que « coché == décoché » (même image) ne vérifiait pas', !!base && !!coche && px(base, 'background-color') !== px(coche, 'background-color'));

/* ══ 2. LES DIMENSIONS BATTENT LE STYLE EN LIGNE ═════════════════════════════════════════════════════════════════════ */
console.log('\n── 2. les tailles écrites en ligne ne défont pas la case ──');
{
  const bal = [...SRC.matchAll(/<input[^>]*type=["']checkbox["'][^>]*>/g)].map(m => m[0]);
  vrai('population : le code écrit des dizaines de cases (un « aucun » sur une population vide ne prouve rien)', bal.length >= 35, bal.length);
  const enLigne = bal.filter(t => /style="[^"]*(width|height):/.test(t));
  vrai('  … dont la plupart portent une largeur ou une hauteur EN LIGNE (17 à 46 px)', enLigne.length >= 25, enLigne.length);
  const tailles = new Set(enLigne.map(t => (/width:(\d+)px/.exec(t) || [])[1] + '×' + (/height:(\d+)px/.exec(t) || [])[1]));
  vrai('  … et elles sont DISPARATES (une règle par case ne tenait pas) : plus de quatre tailles différentes', tailles.size > 4, [...tailles]);
  for (const p of ['width', 'height', 'min-width', 'min-height']) vrai('  la règle pose `' + p + '` en `!important` (un style en ligne ordinaire perd contre un !important de la feuille)', !!base && imp(base, p) && /^\d+px$/.test(px(base, p)), base && base.decl[p]);
  vrai('  … la case est CARRÉE (largeur = hauteur) : un `style="width:38px;height:24px"` en faisait une case oblongue', !!base && px(base, 'width') === px(base, 'height'));
  vrai('  … et rien n\'écrit `!important` dans un `style=` de case (il battrait la règle commune)', !bal.some(t => /style="[^"]*!important/.test(t)));
  vrai('aucune case ne porte la classe `cb-natif` (l\'échappatoire existe, personne ne s\'en sert : une case sans dessin serait de retour)', bal.every(t => !/cb-natif/.test(t)));
  vrai('aucune règle ne redonne l\'apparence native à une case (`appearance:auto`)', !REGLES.some(r => /checkbox/.test(r.sel) && r.decl['appearance'] && r.decl['appearance'].val !== 'none'));
}

/* ══ 3. LA RÈGLE DES CHAMPS NE L'ÉCRASE PAS ══════════════════════════════════════════════════════════════════════════ */
console.log('\n── 3. dans `.field`, la règle des champs (!important) ne reprend pas la main ──');
{
  /* toute règle dont le sélecteur FINIT sur `input` seul (sans type exclu) et qui porte un !important sur une propriété de la case s'applique à une case */
  const PROPS = ['width', 'height', 'min-width', 'min-height', 'padding', 'border', 'border-color', 'border-radius', 'background', 'background-color', 'background-image'];
  const concurrentes = REGLES.filter(r => /(^|[\s>])input$/.test(r.sel) && !/\[type/.test(r.sel) && PROPS.some(p => imp(r, p)));
  vrai('population : les règles de champs à !important qui s\'appliquent aussi à une case sont recensées (`.field input` en tête)', concurrentes.length >= 3 && concurrentes.some(r => /\.field input$/.test(r.sel)), concurrentes.map(r => r.sel));
  const perdues = [];
  for (const r of concurrentes) for (const p of PROPS) if (imp(r, p)) {
    /* la case gagne si elle porte la même propriété (ou son raccourci) en !important avec une spécificité plus forte, ou égale et plus tardive */
    const miens = [base, coche].filter(Boolean).filter(x => imp(x, p) || (p === 'background' && imp(x, 'background-color')) || (p === 'border-color' && imp(x, 'border')) || (p === 'border' && imp(x, 'border')));
    if (!miens.length || !miens.every(x => cmp(spec(x.sel), spec(r.sel)) > 0 || (cmp(spec(x.sel), spec(r.sel)) === 0 && x.ordre > r.ordre))) perdues.push(r.sel + ' → ' + p);
  }
  vrai('  … la case gagne contre chacune, propriété par propriété (spécificité plus forte, !important aussi)', perdues.length === 0, perdues);
  vrai('  … le rembourrage est nul en `!important` : `padding:10px 14px` des champs étirait la case à 30 px de large (mesuré)', imp(base, 'padding') && px(base, 'padding') === '0');
  const ordreBase = base ? base.ordre : -1;
  vrai('  … et la règle de la case vient APRÈS la règle générale `.field input{…!important}` de la feuille de base', REGLES.filter(r => /^\.field input$|^html\[data-refonte\] \.field input$/.test(r.sel) && imp(r, 'padding')).every(r => r.ordre < ordreBase || cmp(spec(CB), spec(r.sel)) > 0));
}

/* ══ 4. AU DOIGT : 24 PX DESSINÉS, 44 PX QUI RÉPONDENT ═══════════════════════════════════════════════════════════════ */
console.log('\n── 4. au doigt : la zone qui répond fait 44 px ──');
{
  const COARSE = '@media (pointer:coarse)';
  const g = regle(CB, COARSE)[0];
  vrai('une règle propre au pointeur grossier (le doigt) existe', regle(CB, COARSE).length === 1, REGLES.filter(r => r.sel === CB).map(r => r.media));
  if (g) {
    for (const p of ['width', 'height', 'min-width', 'min-height']) vrai('  … `' + p + '` = 24 px en `!important`', px(g, p) === '24px' && imp(g, p), g.decl[p]);
  }
  const av = regle(CB + '::before', COARSE)[0];
  vrai('la zone de toucher est un `::before` (la case reçoit le toucher posé dans sa marge)', regle(CB + '::before', COARSE).length === 1);
  if (av && g) {
    const inset = parseFloat(px(av, 'inset'));
    /* `inset` se compte depuis le bord INTÉRIEUR du trait (la boîte de remplissage) : 24 − 2×2 de trait + 2×|inset| */
    const bord = parseFloat((/^(\d+(?:\.\d+)?)px/.exec(px(base, 'border')) || [])[1]);
    const zone = parseFloat(px(g, 'width')) - 2 * bord - 2 * inset;
    vrai('  … la zone fait au moins 44 × 44 px : (24 − 2 × ' + bord + ') + 2 × ' + (-inset) + ' = ' + zone, zone >= 44, { inset, zone });
    vrai('  … elle est vide, absolue, et SANS `pointer-events:none` (sinon elle ne reçoit rien)', px(av, 'content') === "''" && px(av, 'position') === 'absolute' && !av.decl['pointer-events']);
  }
  vrai('la zone de toucher n\'existe PAS pour la souris : elle ne s\'écrit que dans le bloc du doigt (sinon deux rangées voisines se disputent des pixels)', regle(CB + '::before', '').length === 0);
}

/* ══ 5. AU CLAVIER : LE FOCUS SE VOIT ═════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 5. au clavier : l\'anneau de focus ──');
{
  const f = regle(CB + ':focus-visible', '')[0];
  vrai('la case a SON anneau de focus clavier (`:focus-visible`)', regle(CB + ':focus-visible', '').length === 1);
  if (f) {
    vrai('  … un contour de 2 px en `--acc-txt` (≥ 4,5:1), écarté de la case : visible sur le vide comme sur le remplissage', /^2px solid var\(--acc-txt\)$/.test(px(f, 'outline')) && imp(f, 'outline') && /^\d+px$/.test(px(f, 'outline-offset')), [px(f, 'outline'), px(f, 'outline-offset')]);
  }
  vrai('  … le focus ne dépend pas de la règle des champs (`.field input:focus{box-shadow:…30 %}`, trop pâle) : le contour est propre à la case', !!f && cmp(spec(f.sel), spec('html[data-refonte] .field input:focus')) > 0);
}

/* ══ 5 bis. UNE CASE DÉSACTIVÉE SE GRISE (relecture du lot : le trait et le remplissage en !important effaçaient le grisé natif) ═══ */
console.log('\n── 5 bis. une case désactivée ne ressemble pas à une case libre ──');
{
  const d = regle(CB + ':disabled', '')[0], force = regle('html[data-refonte] .opt-fl.force input[type=checkbox]:not(.cb-natif):disabled', '')[0];
  /* la population d'abord : sans case désactivée dans le balisage, « elle se grise » ne garderait rien */
  const dis = (SRC.match(/<input type="checkbox"[^>]*\$\{[^}]*\?'disabled'[^}]*\}/g) || []).concat(SRC.match(/<input type="checkbox"[^>]*\bdisabled\b[^>]*>/g) || []);
  vrai('le balisage porte des cases désactivées (administrateur « d\'office », bon sans e-mail fournisseur, option imposée) — population comptée', dis.length >= 3, dis.length);
  vrai('la case désactivée a SA règle (`:disabled`), hors de tout @media', regle(CB + ':disabled', '').length === 1);
  if (d) {
    const o = parseFloat(px(d, 'opacity'));
    vrai('  … elle se grise : une opacité entre 0,3 et 0,7 (la case reste lisible : un état coché grisé se distingue encore d\'un état vide)', o >= 0.3 && o <= 0.7, px(d, 'opacity'));
    vrai('  … `cursor:default` : rien ne s\'attend à un clic', px(d, 'cursor') === 'default');
    vrai('  … l\'opacité n\'est PAS en !important : une case qui écrit la sienne en ligne la garde', !imp(d, 'opacity'));
    vrai('  … la règle de base ne pose AUCUNE opacité, ni la règle coché : le grisé ne peut pas être battu par elles', !base.decl['opacity'] && !coche.decl['opacity']);
    vrai('  … plus spécifique que la règle de base (même sélecteur plus `:disabled`) et écrite APRÈS elle', cmp(spec(d.sel), spec(CB)) > 0 && d.ordre > base.ordre);
  }
  vrai('une option imposée (`.opt-fl.force`, dont la LIGNE est déjà grisée à .65) ne grise pas sa case une seconde fois', !!force && px(force, 'opacity') === '1' && cmp(spec(force.sel), spec(CB + ':disabled')) > 0);
  vrai('  … et sa ligne est bien grisée par la feuille (sinon l\'exception laisserait la case à pleine force)', REGLES.some(r => r.sel === '.opt-fl.force' && parseFloat(px(r, 'opacity')) < 1));
}

/* ══ 6. CONTRE-ÉPREUVES : CE QUI NE DOIT PAS CHANGER ══════════════════════════════════════════════════════════════════ */
console.log('\n── 6. contre-épreuves ──');
{
  vrai('le `.switch` (interrupteur à piste et curseur) cache toujours sa case : la règle commune ne pose aucun `display`', REGLES.some(r => r.sel === '.switch input' && px(r, 'display') === 'none') && !(base && base.decl['display']) && !(coche && coche.decl['display']));
  vrai('les boutons radio gardent leur règle (la case est une règle à part : les radios cachés des pastilles de couleur ne sont pas touchés)',
    REGLES.some(r => r.sel === 'html[data-refonte] input[type=radio]' && px(r, 'accent-color') === 'var(--acc)') && !REGLES.some(r => /radio/.test(r.sel) && /cb-natif/.test(r.sel)));
  vrai('i01 tient : une case de `.frow-val` n\'a toujours pas la règle des champs (`appearance:none` + fond transparent des champs de saisie)',
    REGLES.filter(r => /\.frow-val ?> ?input/.test(r.sel) && ['appearance', '-webkit-appearance'].some(p => px(r, p) === 'none')).every(r => /:not\(\[type=checkbox\]\)/.test(r.sel)));
  vrai('la case ne dépend d\'aucune couleur écrite en dur (une teinte neuve ne laisse pas une case blanche) : trait, remplissage et coche lisent des jetons',
    [base, coche, apres].every(r => !r || ['border', 'border-color', 'background-color'].every(p => !r.decl[p] || /var\(|transparent/.test(r.decl[p].val))));
}

console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
