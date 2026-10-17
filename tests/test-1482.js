/* ⛔ CE QUE CE FICHIER GARDE — DANS LA DISCUSSION D'UNE SALLE, UN MESSAGE PAS ENCORE PARTI NE SE FAIT PAS PASSER POUR UN MESSAGE ENVOYÉ (salle@2 ; modèle `test-857` : la VRAIE fonction de la page, exécutée).

   Constat du testeur : réseau coupé, « Hors ligne 1 » tapé dans le chat de la salle s'affichait comme une bulle bleue ordinaire alors qu'il ne partira qu'au retour du réseau (il part une seule fois).
   Le fil de la conversation dit où en est le message (`bulleMessage` : « Envoi… », « En attente de connexion… ») ; la discussion de la salle ne lisait jamais `attente`.

     1. LA FONCTION RÉELLE `htmlDiscussion(A)` est extraite de la page et rend un fil d'exemple : un message envoyé (aucun état), un message en attente de connexion, un message en cours d'envoi, un message en échec,
        un document et une photo en attente — chacun porte SON mot ; le message d'un AUTRE n'en porte jamais (un « attente » étranger n'a pas de sens ici) ;
     2. LE MOT EST ÉCHAPPÉ comme le reste (le texte d'une bulle reste du texte) ;
     3. LE REDESSIN LE VOIT : la signature du panneau (`sallePanneauRendre`) change quand l'état d'un message change — sinon « Envoi… » resterait écrit après l'arrivée du message (le CODE, commentaires retirés).

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : « les messages envoyés ne portent aucun mot » est précédé de la preuve que le fil rend bien les cinq bulles de moi. Le bout en bout (réseau
   coupé au navigateur, le mot, puis son effacement au retour du réseau) est dans la sonde citée dans le rapport. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
const SCRIPT = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const CODE = T.sansCommentaires(SCRIPT);

function fonction(entete) {
  const i = CODE.indexOf(entete); if (i < 0) return '';
  const f = CODE.indexOf('\n  }\n', i); return f < 0 ? '' : CODE.slice(i, f + 5);
}
const ligne = (ancre) => { const i = CODE.indexOf(ancre); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
const HTMLD = fonction('  function htmlDiscussion(A) {');
const ESC = ligne('  const esc = s =>');

function rendre(discussion) {
  const ctx = vm.createContext({ console });
  const ini = ESC + '\nconst MOI = { id: "moi" }; const CAP = { fichiers: true }; const TEXTE_MAX = 2000;\n' +
    'const nomM = m => m.nom, nomAuteur = id => "Inconnu", icone = () => "", blob = () => false, tailleTexte = () => "1 Ko", echeanceTexte = () => "", suiviPossible = () => false;\n' +
    'const sx = A => A.sx;\n';
  vm.runInContext(ini + HTMLD + '\nthis.html = htmlDiscussion;', ctx, { timeout: 3000 });
  return ctx.html({ snap: { membres: [{ id: 'moi', nom: 'Moi' }, { id: 'autre', nom: 'Ben' }] }, sx: { discussion, confirme: null, suivis: null } });
}
const bulles = (h) => (h.match(/<div class="salle-msg[\s\S]*?<\/div>/g) || []);
const mots = (b) => (b.match(/<small class="salle-envoi">([^<]*)<\/small>/) || [, null])[1];

(async () => {
  console.log('La discussion de la salle : la fonction réelle de la page');
  vrai('(population) `htmlDiscussion` et `esc` sont trouvées dans le script (' + HTMLD.length + ' et ' + ESC.length + ' caractères)', HTMLD.length > 1500 && ESC.length > 30);
  const fil = [
    { id: 'm1', auteur: 'moi', texte: 'Envoyé normalement' },
    { id: 'm2', auteur: 'moi', texte: 'Hors ligne 1', attente: true },
    { id: 'm3', auteur: 'moi', texte: 'Part en ce moment', attente: true, envoi: true },
    { id: 'm4', auteur: 'moi', texte: 'Refusé', attente: true, echec: true },
    { id: 'm5', auteur: 'autre', texte: 'Un message de Ben', attente: true },
    { id: 'm6', auteur: 'moi', texte: '', fichier: { nom: 'plan.pdf', taille: 1000, piece: null }, attente: true, envoi: true },
    { id: 'm7', auteur: 'moi', texte: 'légende', photos: [{ url: 'x', etat: 'attente' }], attente: true },
    { id: 'm8', auteur: 'moi', texte: '<b>gras</b>', attente: true },
  ];
  let h = ''; try { h = rendre(fil); } catch (e) { console.log('  ✗ htmlDiscussion a jeté : ' + e.message); }
  const B = bulles(h);
  vrai('(population) le fil rend les ' + fil.length + ' bulles (' + B.length + ')', B.length === fil.length);
  v('⛔ un message envoyé ne porte aucun mot d\'état', mots(B[0]), null);
  v('⛔ « Hors ligne 1 » (réseau coupé) dit « En attente de connexion… »', mots(B[1]), 'En attente de connexion…');
  v('⛔ un message qui part en ce moment dit « Envoi… »', mots(B[2]), 'Envoi…');
  v('⛔ un message refusé dit « Non envoyé »', mots(B[3]), 'Non envoyé');
  v('le message d\'un AUTRE n\'en porte jamais', mots(B[4]), null);
  v('un document en cours d\'envoi dit « Envoi… »', mots(B[5]), 'Envoi…');
  v('une photo en attente dit « En attente de connexion… »', mots(B[6]), 'En attente de connexion…');
  vrai('le texte d\'une bulle en attente reste du TEXTE (échappé), le mot est ajouté à côté', B[7].includes('&lt;b&gt;gras&lt;/b&gt;') && mots(B[7]) === 'En attente de connexion…');

  console.log('\nLe redessin le voit');
  const i = CODE.indexOf('  function sallePanneauRendre(A, force) {');
  const rendre0 = i < 0 ? '' : CODE.slice(i, CODE.indexOf('if (!force && corps.dataset.sig === sig) return;', i));
  vrai('(population) la signature du panneau est trouvée (' + rendre0.length + ' caractères)', rendre0.length > 600);
  vrai('⛔ la signature compte l\'état d\'envoi des messages (`m.attente` / `m.envoi` / `m.echec`) : un message qui part change ce que le panneau montre', /X\.discussion\.map\(m => m\.attente \? \(m\.echec \? 2 : m\.envoi \? 1 : 3\) : 0\)\.join\(''\)/.test(rendre0));

  console.log('\nLe mot reste LISIBLE sur la bulle de moi, dans les DEUX thèmes');
  /* ⛔ Le mot est une <small> de 12 px : texte courant, 4,5:1 exigé. Il héritait de `.salle-msg small { color: var(--salle-sub) }` (blanc à 78 %), posé sur la bulle `moi` (--fill) : 5,7:1 en clair, 4,08:1 en SOMBRE.
     On lit la feuille réelle (commentaires retirés), on résout les jetons de chaque thème, on COMPOSE l'encre (alpha) sur le fond de la bulle, et on calcule le contraste. */
  const STYLE = T.sansCommentaires((/<style[^>]*>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1]);
  const bloc = (ouv) => { const i = STYLE.indexOf(ouv); if (i < 0) return ''; let n = 0, k = STYLE.indexOf('{', i); const d = k; for (; k < STYLE.length; k++) { if (STYLE[k] === '{') n++; else if (STYLE[k] === '}' && --n === 0) break; } return STYLE.slice(d + 1, k); };
  const jetons = (txt) => { const o = {}; txt.replace(/(--[\w-]+)\s*:\s*([^;]+);/g, (_, k, val) => { o[k] = val.trim(); return ''; }); return o; };
  const clair = jetons(bloc(':root {\n'));
  const sombreBloc = bloc('@media (prefers-color-scheme: dark) {\n  :root {');
  const sombre = Object.assign({}, clair, jetons(sombreBloc.slice(0, sombreBloc.indexOf('}'))), {});
  vrai('(population) les jetons des deux thèmes sont lus (--fill clair ' + clair['--fill'] + ', sombre ' + sombre['--fill'] + ')', /^#/.test(clair['--fill'] || '') && /^#/.test(sombre['--fill'] || '') && clair['--fill'] !== sombre['--fill']);
  const rgba = (c, J) => { c = (c || '').trim(); const r = /^var\((--[\w-]+)\)$/.exec(c); if (r) return rgba(J[r[1]], J);
    let m = /^#([0-9a-f]{6})$/i.exec(c); if (m) return [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4), 16), 1];
    m = /^rgba?\(([^)]*)\)$/.exec(c); if (m) { const a = m[1].split(',').map(Number); return [a[0], a[1], a[2], a.length > 3 ? a[3] : 1]; } return null; };
  const lum = ([r, g, b]) => { const f = x => (x /= 255) <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
  const contraste = (encre, fond) => { const e = [0, 1, 2].map(i => encre[i] * encre[3] + fond[i] * (1 - encre[3])); const a = lum(e), b = lum(fond); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); };
  /* L'encre que le mot reçoit : la règle la plus précise qui le vise, sinon celle de `.salle-msg small` (le cas fautif). */
  const couleurDe = (sel) => { const m = new RegExp('(?:^|\\n)' + sel.replace(/[.]/g, '\\.') + '\\s*\\{([^}]*)\\}').exec(STYLE); const c = m && /(?:^|[;\s])color\s*:\s*([^;]+)/.exec(m[1]); return c ? c[1].trim() : null; };
  const encreMot = couleurDe('.salle-msg.moi .salle-envoi') || couleurDe('.salle-msg small');
  vrai('(population) l\'encre du mot est trouvée dans la feuille (' + encreMot + ') et le jeton --salle-sub aussi', !!encreMot && /^rgba/.test((/--salle-sub\s*:\s*([^;]+);/.exec(STYLE) || [, ''])[1].trim()));
  const racine = (/--salle-sub\s*:\s*([^;]+);/.exec(STYLE) || [, ''])[1].trim();
  const J = (t) => Object.assign({}, t, { '--salle-sub': racine });
  for (const [nom, t] of [['clair', clair], ['sombre', sombre]]) {
    const e = rgba(encreMot, J(t)), f = rgba(t['--fill'], t);
    vrai('⛔ le mot sur la bulle de moi (thème ' + nom + ') tient 4,5:1 — mesuré ' + (e && f ? contraste(e, f).toFixed(2) : '?') + ':1', !!e && !!f && contraste(e, f) >= 4.5);
  }
  fin();
})();
