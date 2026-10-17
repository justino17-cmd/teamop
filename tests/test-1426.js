/* ══ OP MESSAGES — « COLLER UNE CONFIRMATION » DIT QU'IL PART SUR L'ANNÉE SUIVANTE (lot m05 : agenda@7) ═════════════════════════════════════════════════
   Un SMS qui dit « le 12/10 » collé le 17 octobre 2026 : la date n'a pas d'année et elle est déjà passée cette année — la lecture la comprend comme celle de l'an PROCHAIN (12 octobre 2027).
   Le compte rendu disait « Rempli : mardi 12 octobre à 10 h 00 » : rien n'annonçait l'année, et la personne enregistrait un rendez-vous dans un an sans le savoir. Il écrit maintenant
   « mardi 12 octobre 2027 ». Les VRAIES `lireConfirmation` et `evtCollerRemplir` de la page sont exécutées, de faux champs autour (comme `tests/test-1007.js`).
   ⛔ La logique de DURÉE n'est pas touchée (hors de ce lot) : le banc la rejoue telle quelle (la durée du collage précédent est gardée quand le texte n'en dit pas).
   ⛔ Une absence se prouve sur une population : les trois cas (an prochain, même année, année écrite) sont joués et chacun est lu. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + (JS[j + 1] === ';' ? ';' : ''); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
const jusqua = (debut, finTexte) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(finTexte, i); return i < 0 || j < 0 ? '' : JS.slice(i, j + finTexte.length); };

const M = {
  esc: ligne('const esc = '), FMT_JOUR_LONG: ligne('const FMT_JOUR_LONG = '), dureeTr: ligne('const dureeTr = '), plusMinutes: ligne('const plusMinutes = '), minutesMur: ligne('const minutesMur = '),
  MOIS_FR: decl('const MOIS_FR = '), MOTIFS_RDV: jusqua('const MOTIFS_RDV = ', ']];'), sansAccents: ligne('const sansAccents = '), p2c: ligne('const p2c = '),
  dateJuste: ligne('const dateJuste = '), instantMural: decl('function instantMural('), localDeInstant: ligne('const localDeInstant = '), bornerDuree: ligne('const bornerDuree = '),
  propre: decl('const propre = '), lireIcs: decl('function lireIcs('), lireConfirmation: decl('function lireConfirmation('), evtCollerRemplir: decl('function evtCollerRemplir('),
};

(async () => {
  const manquants = Object.keys(M).filter(k => !M[k]);
  vrai('(population) chaque morceau de la page est trouvé' + (manquants.length ? ' — manquent : ' + manquants.join(', ') : ''), !manquants.length);
  const MAINT = new Date(2026, 9, 17, 10, 0).getTime();            // samedi 17 octobre 2026, 10:00
  const jouer = (texte, dureeAvant) => {
    const champs = {};
    const ch = (id, valeur) => (champs[id] = { id, value: valeur || '', textContent: '', focus() {}, dispatchEvent() { return true; } });
    for (const [id, val] of [['ev-titre', ''], ['ev-avec', ''], ['ev-debut', ''], ['ev-fin', ''], ['ev-lieu', ''], ['ev-coller-res', ''], ['ev-coller-texte', '']]) ch(id, val);
    const ctx = { Math, JSON, Number, Array, Object, String, Date: class extends Date { constructor(...a) { if (a.length === 0) super(MAINT); else super(...a); } static now() { return MAINT; } }, Intl, RegExp, console, Infinity,
      Event: class { constructor(t) { this.type = t; } }, $: id => champs[id] || null, reu: { formEvt: { duree: dureeAvant || 60 } }, peindreDuree() {} };
    vm.createContext(ctx);
    vm.runInContext(Object.values(M).join('\n') + '\nthis.F = { evtCollerRemplir, lireConfirmation };', ctx);
    ctx.F.evtCollerRemplir(texte);
    return { res: champs['ev-coller-res'].textContent, debut: champs['ev-debut'].value, fin: champs['ev-fin'].value, lecture: ctx.F.lireConfirmation(texte, MAINT), duree: ctx.reu.formEvt.duree };
  };

  const an = jouer('RDV chez le dentiste le 12/10 à 10h. Rép STOP au 36111');
  v('⛔ « le 12/10 » collé le 17 octobre : la date part sur 2027 (la lecture) ET le compte rendu l\'écrit', [an.debut, /mardi 12 octobre 2027 à 10 h 00\./.test(an.res)], ['2027-10-12T10:00', true]);
  const memeAn = jouer('Rendez-vous le 22/10 à 14h30 au 4 avenue Foch, 75116 Paris.');
  v('(non régressé) une date de cette année : aucune année dans le compte rendu', [memeAn.debut, /jeudi 22 octobre à 14 h 30/.test(memeAn.res), /2026|2027/.test(memeAn.res.split(' · ')[0])], ['2026-10-22T14:30', true, false]);
  const ecrite = jouer('Rendez-vous le 12/10/2027 à 9h.');
  v('(non régressé) une année ÉCRITE dans le texte n\'est pas répétée par le compte rendu', [ecrite.debut, /mardi 12 octobre à 09 h 00/.test(ecrite.res)], ['2027-10-12T09:00', true]);
  const demain = jouer('Rappel : RDV demain à 14h30 chez Coiffure Line.');
  v('(non régressé) « demain » (une date relative) ne dit pas d\'année non plus', [demain.debut, /dimanche 18 octobre à 14 h 30/.test(demain.res), /2027/.test(demain.res)], ['2026-10-18T14:30', true, false]);
  v('population : la lecture marque l\'an prochain (anSuivant) pour le premier cas et pour lui seul', [an.lecture.anSuivant, memeAn.lecture.anSuivant, ecrite.lecture.anSuivant, demain.lecture.anSuivant], [true, false, false, false]);

  /* ── la durée : inchangée (le second collage, sans durée dans le texte, garde celle du premier — le comportement d'avant, hors de ce lot) ── */
  const avecDuree = jouer('Rendez-vous le 22/10 de 14h à 15h30.');
  v('(non régressé) la durée du texte est lue (1 h 30)', avecDuree.duree, 90);
  const sansDuree = jouer('Rendez-vous le 22/10 à 14h.', 90);
  v('(non régressé, hors de ce lot) sans durée dans le texte, la durée déjà posée sur la fiche est gardée', [sansDuree.duree, sansDuree.fin], [90, '2026-10-22T15:30']);
  fin();
})().catch(e => { console.log('  ✗ le banc a échoué : ' + (e && e.stack || e)); process.exitCode = 1; });
