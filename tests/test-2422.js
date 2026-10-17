/* ══ OP MESSAGES — « RETROUVER » N'AFFIRME PAS UNE ABSENCE QU'ELLE N'A PAS VÉRIFIÉE (lot m05 : medias#3) ═════════════════════════════════════════════
   Avec UN seul caractère (« x », « % », « _ », « ( »), le champ disait « Aucun message ne contient « x ». » alors que des messages le contiennent : la requête ne part pas (minimum de deux
   signes, comme le service — `assezLongue`), mais `peindreRecherche` tombait quand même dans la branche « aucun résultat ». L'écran affirmait une absence qu'il n'avait pas vérifiée.
   Les VRAIES fonctions de la page (`peindreRecherche`, `lancerRecherche`, `assezLongue`…) sont extraites et EXÉCUTÉES, comme dans `tests/test-857.js` §Retrouver :
     · un signe → la consigne « Tape au moins deux lettres. » (jamais « Aucun message ne contient ») et AUCUN appel au service ; deux accents seuls (vides sans leurs signes combinants) aussi ;
     · deux signes sans résultat → « Aucun message ne contient « ab ». » (la vraie absence se dit encore) ; vide → la note d'origine ; un résultat → son compte ;
     · la consigne ne masque ni une erreur du service ni « Recherche… ».
   ⛔ Une absence se prouve sur une population : le nombre d'appels au service et la présence des quatre états sont comptés. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const sansCommentairesJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const JS = sansCommentairesJs((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]);

(async () => {
  const iL = JS.indexOf('const LIEN_RE'), fL = JS.indexOf('function texteRiche'), iR = JS.indexOf('const normeCar'), fR = JS.indexOf("$('info-corps').addEventListener('input'", iR);
  const ligneEsc = (/const esc = s => [^\n]*/.exec(JS) || [''])[0];
  const els = {}, el = () => ({ innerHTML: '', hidden: false, textContent: '', setAttribute(k, x) { this['@' + k] = x; }, style: { setProperty() {} } });
  const ctx = { icone: n => '[' + n + ']', libelleListe: () => 'hier', nomAuteur: () => 'Ben', tailleTexte: n => n + ' o', phrase: (e, d) => d, etat: { groupe: { mode: 'chercher', convId: 'c_x' } },
    CAP: { transcription: false }, TR: null, document: { querySelector: () => null, querySelectorAll: () => [] }, setTimeout, clearTimeout };
  ctx.$ = id => (els[id] = els[id] || el());
  vm.createContext(ctx);
  let R = null;
  try { vm.runInContext(ligneEsc + '\n' + JS.slice(iL, fL) + '\n' + JS.slice(iR, fR) + '\nthis.R = { rendreRecherche, lancerRecherche, peindreRecherche, assezLongue };', ctx, { timeout: 2000 }); R = ctx.R; } catch (e) { R = null; }
  vrai('(population) les fonctions de « Retrouver » s\'exécutent dans un bac à sable (' + (fR - iR) + ' caractères)', iL > 0 && fL > iL && iR > 0 && fR > iR && !!R && typeof R.lancerRecherche === 'function');
  if (!R) return fin();

  const G = ctx.etat.groupe; R.rendreRecherche();
  let appels = [];
  ctx.source = { chercher: (conv, q, avant) => { appels.push(q); return Promise.resolve({ resultats: q === 'ok' ? [{ seq: 1, auteur: 'p_b', moi: false, t: 1, type: 'texte', texte: 'ok' }] : [], suite: null }); } };
  const etat = async (q) => { G.rc.q = q; await R.lancerRecherche(false); return els['rc-etat'].textContent; };

  const sorties = {};
  for (const q of ['x', '%', '_', '(', '\\', '́́']) sorties[JSON.stringify(q)] = await etat(q);
  v('population : six requêtes d\'un seul signe (ou de deux accents seuls) ont été jouées, et aucune n\'est partie au service', [Object.keys(sorties).length, appels.length], [6, 0]);
  v('⛔ un seul caractère : la consigne « Tape au moins deux lettres. » — jamais « Aucun message ne contient » (l\'écran n\'affirme pas une absence qu\'il n\'a pas vérifiée)',
    Object.values(sorties), Array(6).fill('Tape au moins deux lettres.'));
  v('… et la liste est vide, sans « Chercher plus loin » ni « Réessayer »', [els['rc-liste'].hidden, els['rc-plus-zone'].hidden, els['rc-reessayer-zone'].hidden], [true, true, true]);

  appels = [];
  const vide = await etat(''), deux = await etat('ab'), trouve = await etat('ok');
  v('(non régressé) champ vide → la note d\'origine ; deux signes sans résultat → la vraie absence, dite avec le mot cherché ; un résultat → son compte',
    [vide, deux, trouve], ['Le texte des messages, les légendes des photos et les noms des fichiers.', 'Aucun message ne contient « ab ».', 'Un message']);
  v('… et seules les deux vraies requêtes sont parties au service', appels, ['ab', 'ok']);

  /* la consigne ne masque pas une panne : un échec du service reste dit */
  G.rc.q = 'ab'; ctx.source = { chercher: () => Promise.reject(new Error('reseau')) };
  await R.lancerRecherche(false);
  v('(non régressé) une recherche qui échoue dit son échec', els['rc-etat'].textContent, 'La recherche n\'a pas pu aboutir.');
  fin();
})().catch(e => { console.log('  ✗ le banc a échoué : ' + (e && e.stack || e)); process.exitCode = 1; });
