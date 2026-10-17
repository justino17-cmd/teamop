/* ══ OP MESSAGES — MISE EN PAGE ET CONTRASTE : L'EN-TÊTE HORS LIGNE, LES PASTILLES ROUGES, LE « DANGER » DISCRET, LA RAISON D'UN APPEL, LE STATUT SANS ESPACE (lot p03, 17 octobre 2026) ═══
   Six défauts de feuille de style relevés par les testeurs. Aucune lecture d'une règle seule ne les montre : chacun est ce qu'une règle GAGNE contre une autre, ou ce qu'une encre
   donne sur le fond qu'elle a vraiment. Ce banc REJOUE donc la feuille réelle (tests/outils-css-msg.js : l'ordre, les @media, les jetons de jour et de nuit) et, pour l'en-tête, la
   SPÉCIFICITÉ entre sélecteurs (un `#id > .classe` bat un `.classe > .classe` écrit plus loin, quel que soit l'ordre) :
     1. n#11 / n#12 — hors ligne, au bureau, l'en-tête de la liste « Messages » descendait de 56 px au lieu de 28 : `#vue-messages > .entete-vue { position: relative }` (spécificité 1,1,0)
        battait `position: sticky` de la règle du bureau (0,2,0) mais pas son `top: var(--pousse)` — qui, en position relative, DÉCALE l'élément alors que le corps l'a déjà poussé de
        `--pousse` (`body { padding-top }`). Décalage compté deux fois, la barre vitrée recouvrait le champ « Rechercher ». Règle : un en-tête qui n'est pas collant ne porte aucun `top`
        qui suive `--pousse` ; un en-tête collant, si.
     2. n#2 — le rouge du système (--rouge #ff453a) servait d'APLAT sous du blanc en dur (3,41:1) : compteurs de l'onglet et du menu, puce « REC », pastilles de la salle, compteur de la
        barre ronde. Une surface, une encre : `--rouge-fill` et `--on-rouge`, jour comme nuit. Les textes rouges (--rouge-txt) et les ronds sans texte (3:1 suffit) ne bougent pas.
     3. n#1 — le bouton « Retirer … de la réunion » (.mini.danger) écrivait --rouge-txt sur la teinte bleutée de .mini : 4,43:1. Il a son propre jeton (--rouge-mini), calculé sur le fond
        de la pastille posée sur la carte, la page, la feuille.
     4. n#7 — la pastille de la raison d'un appel manqué (« A appelé 2 fois · Collègue ») passe à la ligne aux largeurs d'un téléphone (la colonne fait 124–154 px pour 162 de texte) :
        une capsule de 999 px de rayon sur deux lignes est un disque aplati. Le rayon d'un texte qui peut passer à la ligne est celui d'un rectangle doux, et un mot long se coupe plutôt
        que de sortir de la pastille.
     5. n#8 — un statut d'un seul mot long (une adresse collée) sortait de la carte du contact, sous la flèche et l'étoile : `.contact-role` ne se coupait pas.
   La mesure au navigateur (position, pixel, débordement lu à la seconde lecture) est dans la sonde du lot : scratchpad/messages/correctifs/p03/, et tests/sonde-opmessages-recouvrement.js.
   ⛔ Population comptée d'abord : une règle absente ou un sélecteur non lu ne passe pas pour juste. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const C = require('./outils-css-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');

const L = C.lire(RACINE);
vrai('(population) la feuille est lue (' + L.css.length + ' caractères, ' + L.regles.length + ' règles)', L.css.length > 20000 && L.regles.length > 500);

/* ── 1. LA CASCADE D'UN ÉLÉMENT, AVEC SA SPÉCIFICITÉ (ce que outils-css-msg ne fait pas : il cherche un sélecteur EXACT) ───────────────────────────────────────────────────────── */
/* un sélecteur → [{ comp, comb }] (comb = le lien avec le composé d'avant : ' ' descendant, '>' enfant) ; null s'il contient ce qu'on ne sait pas lire (pseudo-classe, ~, +) */
function composes(sel) {
  if (/[:~+*]/.test(sel.replace(/\[[^\]]*\]/g, ''))) return null;
  const out = []; const re = /\s*([>])?\s*((?:[A-Za-z][A-Za-z0-9-]*)?(?:[#.][A-Za-z0-9_-]+|\[[^\]]+\])*)/y; let i = 0, comb = ' ';
  const s = sel.trim();
  while (i < s.length) {
    re.lastIndex = i; const m = re.exec(s); if (!m || !m[2]) return null;
    const comp = { tag: null, id: null, classes: [], attrs: [] };
    for (const t of m[2].match(/[A-Za-z][A-Za-z0-9-]*|[#.][A-Za-z0-9_-]+|\[[^\]]+\]/g)) {
      if (t[0] === '#') comp.id = t.slice(1); else if (t[0] === '.') comp.classes.push(t.slice(1));
      else if (t[0] === '[') { const a = /^\[([^=\]]+)(?:=["']?([^"'\]]*)["']?)?\]$/.exec(t); comp.attrs.push([a[1], a[2] === undefined ? null : a[2]]); } else comp.tag = t.toLowerCase();
    }
    out.push({ comp, comb: m[1] === '>' ? '>' : (out.length ? ' ' : '') }); i = re.lastIndex;
    if (i < s.length && !/[\s>]/.test(s[i])) return null;
  }
  return out;
}
const colle = (c, e) => (!c.tag || c.tag === e.tag) && (!c.id || c.id === e.id) && c.classes.every(k => (e.classes || []).includes(k))
  && c.attrs.every(([k, val]) => e.attrs && k in e.attrs && (val === null || e.attrs[k] === val));
/* la chaîne va de l'ancêtre le plus lointain à l'élément mesuré */
function vise(parts, chaine, n, k) {
  if (k < 0) return false;
  if (!colle(parts[n].comp, chaine[k])) return false;
  if (n === 0) return true;
  if (parts[n].comb === '>') return vise(parts, chaine, n - 1, k - 1);
  for (let a = k - 1; a >= 0; a--) if (vise(parts, chaine, n - 1, a)) return true;
  return false;
}
const specificite = (parts) => parts.reduce((s, p) => [s[0] + (p.comp.id ? 1 : 0), s[1] + p.comp.classes.length + p.comp.attrs.length, s[2] + (p.comp.tag ? 1 : 0)], [0, 0, 0]);
const plus = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i]; return false; };
/* la valeur gagnante d'une propriété pour un élément dans un contexte : l'`!important`, puis la spécificité, puis l'ordre de la feuille */
function gagne(chaine, prop, ctx, motif) {
  let best = null, lues = 0;
  L.regles.forEach((r, ordre) => {
    if (!C.applique(r.cond, ctx)) return;
    const m = new RegExp('(?:^|[;\\s])' + prop + '\\s*:\\s*([^;]+)').exec(r.corps); if (!m) return;
    for (const sel of r.sels) {
      if (motif && !motif.test(sel)) continue;
      const parts = composes(sel); if (!parts) continue; lues++;
      if (!vise(parts, chaine, parts.length - 1, chaine.length - 1)) continue;
      const imp = /!important/.test(m[1]), spec = specificite(parts);
      if (!best || (imp && !best.imp) || (imp === best.imp && (plus(spec, best.spec) || (!plus(best.spec, spec) && ordre >= best.ordre)))) best = { v: m[1].replace(/!important/, '').trim().replace(/\s+/g, ' '), imp, spec, ordre, sel };
    }
  });
  return Object.assign(best || { v: null, sel: null }, { lues });
}

/* l'en-tête de chaque vue, tel que la page l'écrit : <section id="vue-X" class="vue"><div class="entete-vue"> sous <html data-vue="X"> */
const ENTETE = (vue) => [{ tag: 'html', attrs: { 'data-vue': vue } }, { tag: 'body' }, { tag: 'section', id: 'vue-' + vue, classes: ['vue'] }, { tag: 'div', classes: ['entete-vue'] }];
const MOTIF_ENTETE = /entete-vue/;
{
  const g = gagne(ENTETE('messages'), 'position', { largeur: 1440 }, MOTIF_ENTETE);
  vrai('(population) la cascade lit les règles de l\'en-tête (' + g.lues + ' sélecteurs lus) et en trouve une qui gagne la position de la liste « Messages » (' + g.v + ' par « ' + g.sel + ' »)', g.lues >= 2 && g.v);
}
for (const [nom, vue, largeur] of [['Messages (bureau)', 'messages', 1440], ['Messages (tablette large)', 'messages', 1024], ['Messages (téléphone)', 'messages', 390], ['Appels (bureau)', 'appels', 1440], ['Contacts (bureau)', 'contacts', 1440], ['Réunions (bureau)', 'reunions', 1440]]) {
  const ctx = { largeur }, pos = gagne(ENTETE(vue), 'position', ctx, MOTIF_ENTETE), haut = gagne(ENTETE(vue), 'top', ctx, MOTIF_ENTETE);
  const suitPousse = !!haut.v && /--pousse/.test(haut.v);
  vrai('(population) ' + nom + ' : une position (' + pos.v + ' par « ' + pos.sel + ' »)', !!pos.v || largeur < 900);
  /* ⛔ LA RÈGLE : un `top` qui suit --pousse ne va qu'à un élément COLLANT. Relatif, il décale l'en-tête une seconde fois (le corps l'a déjà poussé) — 56 px au lieu de 28 */
  vrai('⛔ ' + nom + ' : l\'en-tête ' + (pos.v === 'sticky' ? 'collant' : 'non collant (' + pos.v + ')') + ' ne se décale pas deux fois de la bande hors ligne (top = ' + haut.v + ')',
    !(suitPousse && pos.v && pos.v !== 'sticky' && pos.v !== 'fixed'));
}
{
  /* contre-témoins : la règle qui rend l'en-tête de la liste RELATIF (l'ancre du nom centré sur téléphone) existe toujours ; et les autres vues restent collantes au bureau */
  const pm = gagne(ENTETE('messages'), 'position', { largeur: 390 }, MOTIF_ENTETE);
  vrai('contre-témoin : au téléphone, l\'en-tête de la liste reste RELATIF (il ancre le nom centré « OP MESSAGES »)', pm.v === 'relative');
  for (const vue of ['appels', 'contacts']) {
    const pa = gagne(ENTETE(vue), 'position', { largeur: 1440 }, MOTIF_ENTETE), ta = gagne(ENTETE(vue), 'top', { largeur: 1440 }, MOTIF_ENTETE);
    vrai('contre-témoin : au bureau, l\'en-tête de ' + vue + ' reste collant sous la bande (' + pa.v + ', top ' + ta.v + ')', pa.v === 'sticky' && /--pousse/.test(ta.v || ''));
  }
}

/* ── 2. LES PASTILLES ROUGES PORTENT LEUR ENCRE : --rouge-fill + --on-rouge ─────────────────────────────────────────────────────────────────────────────────────────────────────── */
const PASTILLES = [
  ['.onglet-n', 'compteur de l\'onglet'], ['.cote-n', 'compteur du menu latéral'], ['.salle-rec', 'puce « REC » de la salle'], ['.salle-tuile .tuile-nom.coupe', 'nom d\'une vignette au micro coupé'],
  ['.salle-badge.rouge', 'pastille rouge d\'une vignette'], ['.salle-badge.reseau.faible', 'réseau faible'], ['.salle-badge.reseau.perdue', 'réseau perdu'], ['.salle-cmd .compte', 'compteur de la barre ronde'],
];
const encreHerite = { '.salle-tuile .tuile-nom.coupe': '.tuile-nom', '.salle-badge.rouge': '.salle-badge', '.salle-badge.reseau.faible': '.salle-badge', '.salle-badge.reseau.perdue': '.salle-badge' };
for (const nuit of [false, true]) {
  const J = C.jetons(L, nuit), mode = nuit ? 'nuit' : 'jour';
  vrai('(population) les jetons de ' + mode + ' sont lus (' + Object.keys(J).length + ') dont --rouge-fill et --on-rouge', Object.keys(J).length > 40 && J['--rouge-fill'] && J['--on-rouge']);
  for (const [sel, nom] of PASTILLES) {
    const fond = C.valeur(L, sel, 'background', { nuit }) || C.valeur(L, sel, 'background-color', { nuit });
    const encre = C.valeur(L, sel, 'color', { nuit }) || (encreHerite[sel] ? C.valeur(L, encreHerite[sel], 'color', { nuit }) : null);
    vrai('(population) ' + sel + ' déclare un fond et une encre (' + fond + ' / ' + encre + ')', fond && encre);
    if (!fond || !encre) continue;
    let r = 0, detail = '';
    try { const f = C.couleur(fond, J), e = C.couleur(encre, J); const F = C.sur(f, [0, 0, 0, 1]); r = C.ratio(C.sur(e, F), F); detail = fond + ' / ' + encre + ' = ' + r.toFixed(2); } catch (err) { detail = String(err.message); }
    vrai('⛔ ' + nom + ' — ' + mode + ' : l\'encre tient ≥ 4,5:1 sur son aplat (' + detail + ')', r >= 4.5);
  }
}
{
  /* le recensement part de la FEUILLE, pas d'une liste : toute règle qui peint --rouge en aplat ET porte du texte (une taille de caractères) doit prendre --rouge-fill */
  const fautives = [], nues = [];
  for (const r of L.regles) {
    const m = /(?:^|[;\s])background(?:-color)?\s*:\s*var\(--rouge\)/.exec(r.corps); if (!m) continue;
    (/(?:^|[;\s])font-size\s*:/.test(r.corps) ? fautives : nues).push(r.sels.join(', '));
  }
  vrai('(population) ' + (fautives.length + nues.length) + ' règles peignent encore --rouge en aplat : ce sont des ronds ou des traits sans texte (' + nues.length + ')', nues.length >= 5);
  v('⛔ aucune règle ne pose du texte (une taille de caractères) sur le rouge du système #ff453a — il faut --rouge-fill', fautives, []);
}

/* ── 3. « RETIRER … DE LA RÉUNION » (.mini.danger) SE LIT SUR LA PASTILLE TEINTÉE ──────────────────────────────────────────────────────────────────────────────────────────────── */
const FONDS_MINI = ['--card', '--base', '--solide-feuille', '--solide'];
for (const nuit of [false, true]) {
  const J = C.jetons(L, nuit), mode = nuit ? 'nuit' : 'jour';
  const encre = C.valeur(L, '.mini.danger', 'color', { nuit }), fondMini = C.valeur(L, '.mini', 'background', { nuit });
  vrai('(population) .mini.danger déclare une encre (' + encre + ') et .mini un fond (' + fondMini + ')', encre && fondMini);
  if (!encre || !fondMini) continue;
  for (const tok of FONDS_MINI) {
    let r = 0, detail = '';
    try { const page = C.couleur('var(' + tok + ')', J), fond = C.sur(C.couleur(fondMini, J), page); r = C.ratio(C.sur(C.couleur(encre, J), fond), fond); detail = encre + ' sur ' + fondMini + ' posé sur ' + tok + ' = ' + r.toFixed(2); } catch (err) { detail = String(err.message); }
    vrai('⛔ bouton « danger » (Retirer, Bloquer, Annuler) — ' + mode + ' : ≥ 4,5:1 (' + detail + ')', r >= 4.5);
  }
}

fin();
