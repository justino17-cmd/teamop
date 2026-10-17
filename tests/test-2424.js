/* ══ OP MESSAGES — « TRANSFÉRER » DIT SON PÉRIMÈTRE, « VOIR LE MESSAGE » D'UNE CONVERSATION QUITTÉE DIT LA VÉRITÉ (lot m05 : conversations@10, pro@4) ═══════════
   · conversations@10 — la feuille « Transférer » ne propose que les conversations du côté où l'on travaille (Perso ou Pro), sans le dire : la conversation de l'autre côté « n'apparaissait
     pas » sans raison. La note le dit désormais (et dit qu'une recherche cherche des deux côtés), seulement quand les deux côtés existent. La VRAIE `rendreTransfert` est exécutée.
   · pro@4 — « Voir le message » d'un rappel posé dans une conversation que la personne a QUITTÉE envoyait sur la liste des Messages avec « Cette conversation n'existe plus. » : faux (elle
     existe), et le geste faisait perdre la place sur le tableau de bord. La VRAIE `voirMessage` est exécutée : une conversation absente d'une liste bien chargée n'ouvre rien, dit
     « Tu n'es plus dans cette conversation. », et la navigation ne part pas ; une conversation de la liste s'ouvre toujours. Et le repli d'`ouvrirConv` (le service ne la connaît plus) dit
     la même vérité quand on y est venu par « Voir le message ».
   ⛔ Une absence se prouve sur une population : le nombre de navigations et de toasts est compté dans chaque cas. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const SCRIPT = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = SCRIPT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function extraire(src, entete) {
  const i = src.indexOf(entete); if (i < 0) return '';
  let n = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') n++; else if (c === '}') { n--; if (!n) break; } }
  return src.slice(i, j + 1);
}
const ligne = (nom) => (new RegExp('  const ' + nom + ' = [^\\n]*(?:\\n    [^\\n]*)*;?').exec(JS) || [''])[0];

console.log('\nLa feuille « Transférer » dit son périmètre');
{
  const note = ligne('noteTransfert'), rendre = extraire(JS, 'function rendreTransfert()');
  vrai('(population) `noteTransfert` (' + note.length + ' caractères) et `rendreTransfert` (' + rendre.length + ') sont trouvées', note.length > 100 && rendre.length > 300);
  const jouer = (modes, mode) => {
    const els = {};
    const ctx = { etat: { groupe: { tMid: 'm1' }, mode, convDonnees: null }, modesActifs: () => modes, NOM_COTE: { perso: 'Perso', pro: 'Pro' }, apercuTransfert: () => '', peindreTransfert() {}, $: id => (els[id] = els[id] || { innerHTML: '' }) };
    vm.createContext(ctx);
    vm.runInContext(note + '\n' + rendre + '\nthis.f = rendreTransfert;', ctx, { timeout: 1000 });
    ctx.f();
    return (/<p class="info-note">([^<]*)<\/p>/.exec(els['info-corps'].innerHTML) || [, ''])[1];
  };
  const base = 'Le message part en ton nom, marqué « Transféré » : le nom de qui l\'a écrit ne part pas. Cinq conversations au plus.';
  const perso = jouer(true, 'perso'), pro = jouer(true, 'pro'), seul = jouer(false, 'perso');
  v('⛔ avec les deux côtés, la note dit lequel est proposé (Perso, puis Pro) et que la recherche cherche des deux côtés', [perso, pro],
    [base + ' Seules les conversations Perso sont proposées ; une recherche cherche des deux côtés.', base + ' Seules les conversations Pro sont proposées ; une recherche cherche des deux côtés.']);
  v('(non régressé) un compte sans les deux côtés garde la note d\'origine, sans parler d\'un « côté » qui n\'existe pas', seul, base);
}

console.log('\n« Voir le message » d\'une conversation quittée');
{
  const aide = ligne('convQuittee'), vm1 = extraire(JS, 'function voirMessage(conv, seq, remplacerEntree)');
  vrai('(population) `convQuittee` (' + aide.length + ' caractères) et `voirMessage` (' + vm1.length + ') sont trouvées', aide.length > 60 && vm1.length > 200);
  const jouer = (conversations, conv, courante) => {
    const trace = { mots: [], pousses: [], remplaces: [], allers: 0 };
    const cibleMsg = { conv: null, seq: 0, pages: 0, max: 20, retrouver: false, apresFeuille: false, transcription: false };
    const ctx = { etat: { conversations, conv: courante || null, convDonnees: courante ? {} : null, route: { vue: courante ? 'messages' : 'accueil' } }, cibleMsg,
      mot: t => trace.mots.push(t), pousser: r => trace.pousses.push(r), remplacer: r => trace.remplaces.push(r), allerAuMessage: () => { trace.allers++; } };
    vm.createContext(ctx);
    vm.runInContext(aide + '\n' + vm1 + '\nthis.f = voirMessage;', ctx, { timeout: 1000 });
    ctx.f(conv, 5, false);
    trace.cible = cibleMsg.conv;
    return trace;
  };
  const LISTE = [{ id: 'c_equipe' }, { id: 'c_ben' }];
  const quittee = jouer(LISTE, 'c_groupe_quitte');
  v('⛔ une conversation absente de la liste (quittée) : aucune navigation, la vérité en toast, aucune cible gardée', [quittee.mots, quittee.pousses.length, quittee.remplaces.length, quittee.allers, quittee.cible],
    [['Tu n\'es plus dans cette conversation.'], 0, 0, 0, null]);
  const presente = jouer(LISTE, 'c_ben');
  v('(non régressé) une conversation de la liste s\'ouvre : une navigation, pas de toast, la cible est gardée', [presente.mots, presente.pousses.length, presente.cible], [[], 1, 'c_ben']);
  const ouverte = jouer(LISTE, 'c_ben', 'c_ben');
  v('(non régressé) la conversation déjà à l\'écran : on va au message, sans navigation', [ouverte.mots, ouverte.pousses.length, ouverte.allers], [[], 0, 1]);
  const vide = jouer([], 'c_inconnue');
  v('une liste VIDE (pas encore chargée, ou en panne) ne prouve rien : on laisse le service répondre (une navigation, pas de « quittée » affirmé)', [vide.mots, vide.pousses.length], [[], 1]);
  vrai('le repli d\'`ouvrirConv` (le service ne connaît plus la conversation) dit la même vérité quand on y vient par « Voir le message », et garde l\'ancienne phrase sinon',
    /if \(!c\) \{ const versMessage = cibleMsg\.conv === id; cibleMsg\.conv = null; remplacer\(\{ vue: 'messages', conv: null, feuille: false, photo: null, appel: null \}\); mot\(versMessage \? 'Tu n\\'es plus dans cette conversation\.' : 'Cette conversation n\\'existe plus\.'\); return; \}/.test(JS));
}
fin();
