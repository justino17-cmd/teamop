/* ══ OP MESSAGES, LOT m08 — SAISIE ET ENVOI : LE MESSAGE COUPÉ EN PLEIN MOT, « ÉCRIT… » QUI TRAÎNE, L'ACCORD DE « SIGNES » ══════════════════════════
   Trouvé par les agents testeurs (15 octobre 2026), rejoué trois fois sur trois au navigateur (deux comptes qui tapent vite, « A1 » Entrée, « A2 » Entrée…) :

   1. temps-reel#0 (MAJEUR) — Entrée pendant qu'un envoi est en vol posait `etat.envoiSuivant` et LAISSAIT le texte dans le champ ; à la fin du premier envoi, `envoyerTexte()` relisait
      le champ COURANT, donc ce qu'on avait tapé depuis, à moitié : le destinataire recevait « A7 A » puis « 8 ». Maintenant le message est PRIS tel qu'il est à l'Entrée (une file
      locale), le champ est vidé aussitôt, et la file part dans l'ordre. Gardé : la règle « un envoi refusé rend le texte sans écraser autre chose », « ok » puis « ok » = deux messages.
   2. temps-reel#2 — « écrit… » restait ~5,6 s chez l'autre après avoir VIDÉ le champ : la page n'annonçait que la frappe, jamais l'arrêt (sauf au blur). Elle appelle maintenant
      `source.saisie(conv, false)` quand le champ devient vide et à l'envoi ; la source, elle, attend déjà la fenêtre de 2 s du service (tests/test-911.js) : la page ne recrée pas de minuterie.
   3. conversations#7 — « 1 signes en trop » : l'accord se fait dans `texteTropLong`, le seul endroit des trois appelants ; et la phrase de la table `MESSAGES_ERREUR` ('trop-long') dit
      la limite du SERVICE (TEXTE_MAX), plus un « 4 000 » écrit en dur.

   ⛔ Les VRAIES fonctions de la page sont extraites et EXÉCUTÉES (un bac à sable `vm`, un champ et un service FAUX, dont le service est lent : c'est le test qui décide quand il répond).
   Une mutation (tests/mutations-lot-m08, dans le rapport du lot) remet chaque défaut : ce banc tombe. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
/* ⛔ pas de nettoyage naïf des blocs /* … *\/ : seulement ceux qui COMMENCENT une ligne, et les « // » précédés d'une espace (CLAUDE.md, 21 septembre 2026) */
const JS = script.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');

/* une tranche du script (commentaires compris : le code s'exécute tel quel), de `debut` jusqu'à `fin` exclu */
function tranche(debut, finMarque) {
  const i = script.indexOf(debut), j = script.indexOf(finMarque, i + debut.length);
  return i < 0 || j < 0 ? '' : script.slice(i, j);
}
const T_ERREUR = tranche('const MESSAGES_ERREUR =', '\n');
/* les DEUX dires de refus RÉELS de la page : `phrase` (m-base) et `phraseSilence` (m11 : « introuvable » à l'envoi dit la phrase neutre, pas une accusation) — `envoi()` appelle la seconde */
const T_PHRASE = tranche('const phrase = (e, defaut) =>', '\n');
const T_SILENCE = tranche('const phraseSilence = (e, neutre, defaut) =>', '\n');
const T_ENVOI = tranche('async function envoi(brouillon, cible)', '  /* ── CONFIRMER L\'ENVOI');
const T_ENVOYER = tranche(script.includes('const finSaisie = id =>') ? 'const finSaisie = id =>' : 'async function envoyerTexte()', '  /* ⛔ une réponse ou une modification se compose DANS la saisie');
const T_LIMITE = tranche('const nSignes = t =>', '  $(\'saisie\').addEventListener(\'input\', () => {');
const T_INPUT = tranche('  $(\'saisie\').addEventListener(\'input\', () => {\n    ajusterSaisie();', '  $(\'saisie\').addEventListener(\'blur\', () => { if (CAP.saisie');
vrai('(population) les sept tranches de la page sont trouvées (' + [T_ERREUR, T_PHRASE, T_SILENCE, T_ENVOI, T_ENVOYER, T_LIMITE, T_INPUT].map(x => x.length).join(', ') + ' caractères)',
  T_ERREUR.length > 100 && T_PHRASE.length > 60 && T_SILENCE.length > 60 && T_ENVOI.length > 200 && T_ENVOYER.length > 1500 && T_LIMITE.length > 200 && T_INPUT.length > 400);

/* un bloc qui MEURT (exception) se compte en ✗ et n'arrête pas les autres : sur l'ancien code, la suite se mesure quand même */
const essai = async f => { try { await f(); } catch (e) { v('un bloc de ce banc a levé une exception : ' + String(e && e.message).slice(0, 120), false, true); } };
/* ⛔ un banc dont une promesse n'est JAMAIS tenue (un envoi qui ne rend pas la main) laisse la boucle d'événements se vider : Node sort alors en 0, sans total. Ce garde-fou le compte en ✗. */
let total = false;
process.on('exit', () => { if (!total) { console.log('  ✗ le banc s\'est arrêté AVANT son total (une promesse jamais tenue : un envoi qui ne rend pas la main ?)'); console.log('\n0 ✓  1 ✗'); process.exitCode = 1; } });
const dort = ms => new Promise(r => setTimeout(r, ms));
const nbsp = s => String(s).replace(/[  ]/g, ' ');

/* Un monde en miniature : le champ, le service FAUX (chaque envoi attend qu'on le libère), l'état de la page. */
function monde(opts = {}) {
  const o = Object.assign({ texteMax: 8000, saisie: true, confirme: false }, opts);
  const champ = { value: '', listeners: {}, addEventListener(ev, f) { (this.listeners[ev] = this.listeners[ev] || []).push(f); } };
  const avisEl = { textContent: '', hidden: true };
  const els = { saisie: champ, avis: avisEl };
  const M = { envois: [], modifs: [], saisies: [], avis: [], demandes: 0, champ, avisEl, etat: null, source: null };
  const etat = M.etat = { conv: 'c1', envoiEnCours: false, fileEnvoi: [], envoiCtx: null, brouillons: {}, contexte: null, confirmeAttente: null, forcerBas: false };
  /* le service : `envoyer` rend une promesse que le banc libère (`liberer`) ou refuse (`refuser`) quand il veut — c'est TOUT le « service lent » */
  const source = M.source = {
    envoyer(id, b) { return new Promise((res, rej) => { M.envois.push({ id, b, res, rej }); }); },
    modifier(id, mid, t) { return new Promise((res, rej) => { M.modifs.push({ id, mid, t, res, rej }); }); },
    saisie(id, actif) { M.saisies.push([id, actif]); return Promise.resolve(); },
  };
  if (!o.saisie) delete source.saisie;
  const ctx = {
    console, Array, Map, Set, Object, Math, JSON, String, Number, Error, Promise, RegExp,
    etat, source, CAP: { saisie: o.saisie, texteMax: o.texteMax }, TEXTE_MAX: o.texteMax,
    $: id => els[id] || (els[id] = { textContent: '', hidden: false, value: '' }),
    avis: t => { M.avis.push(t); avisEl.textContent = t; avisEl.hidden = false; },
    masquerAvis: () => { avisEl.hidden = true; avisEl.textContent = ''; },
    ajusterSaisie() {}, majBoutons() {}, majContexte() {}, fermerConfirmation() { etat.confirmeAttente = null; },
    demanderConfirmation() { M.demandes++; etat.confirmeAttente = etat.conv; },
    confirmationRequise: () => o.confirme,
    trouverMessage: mid => ({ id: mid, photos: [] }),
    mentionsDe: () => [], mentionUI: { choisis: new Map() }, convCourante: () => ({ id: etat.conv }),
  };
  vm.createContext(ctx);
  vm.runInContext(T_ERREUR + '\n' + T_PHRASE + '\n' + T_SILENCE + '\n' + T_ENVOI + '\n' + T_LIMITE + '\n' + T_ENVOYER + '\n' + T_INPUT + '\nthis.envoyerTexte = envoyerTexte; this.MESSAGES_ERREUR = MESSAGES_ERREUR; this.texteTropLong = texteTropLong; this.nSignes = nSignes; this.phraseSilence = phraseSilence;', ctx, { timeout: 3000 });
  M.envoyerTexte = ctx.envoyerTexte; M.MESSAGES_ERREUR = ctx.MESSAGES_ERREUR; M.texteTropLong = ctx.texteTropLong; M.phraseSilence = ctx.phraseSilence;
  M.entree = (texte) => { champ.value = texte; return M.envoyerTexte(); };        // « on tape, puis Entrée »
  M.tape = (texte) => { champ.value = texte; etat.brouillons[etat.conv] = texte; for (const f of champ.listeners.input || []) f(); };       // une frappe : le champ change, l'écouteur `input` tourne
  M.textes = () => M.envois.map(e => e.b.texte);
  M.attendre = async (cond, ms = 500) => { const t0 = Date.now(); while (!cond()) { if (Date.now() - t0 > ms) return false; await dort(5); } return true; };
  return M;
}

(async () => {
  console.log('\n1. temps-reel#0 — Entrée pendant un envoi : le message part TEL QU\'IL ÉTAIT, pas tel que le champ est devenu');
  await essai(async () => {
    const M = monde();
    const p1 = M.entree('M1');
    v('(population) le premier envoi est en vol, le champ est vide', [M.etat.envoiEnCours, M.champ.value, M.envois.length], [true, '', 1]);
    await M.entree('M2');                                  // Entrée pendant le vol
    v('⛔ le message 2 est PRIS à l\'Entrée : le champ est vidé aussitôt (il ne reste pas là à attendre d\'être complété)', [M.champ.value, M.etat.fileEnvoi.length, M.envois.length], ['', 1, 1]);
    M.champ.value = 'M3 à moit';                           // la suite se tape pendant que le premier est encore en vol
    M.envois[0].res();                                     // le service répond au premier
    await M.attendre(() => M.envois.length === 2);
    v('⛔ le message 2 part avec SON texte (« M2 »), pas avec ce qui a été tapé depuis', M.textes(), ['M1', 'M2']);
    v('… et la frappe en cours reste dans le champ, intacte', M.champ.value, 'M3 à moit');
    M.envois[1].res(); await p1;
    v('rien d\'autre n\'est parti, l\'envoi est terminé (drapeau retombé, file vide)', [M.textes(), M.etat.envoiEnCours, M.etat.fileEnvoi.length], [['M1', 'M2'], false, 0]);
  });
  await essai(async () => {
    /* la rafale du testeur : 15 messages, chacun à l'Entrée, un service lent — chacun doit partir ENTIER et dans l'ordre */
    const M = monde(); const N = 15;
    const premier = M.entree('A1');
    for (let i = 2; i <= N; i++) { M.champ.value = 'A' + i + ' '; await M.envoyerTexte(); M.champ.value = 'A' + (i + 1) + ' à moit'; }      // chaque fois, le message SUIVANT est déjà à moitié tapé
    for (let k = 0; k < N; k++) { await M.attendre(() => M.envois.length > k); if (!M.envois[k]) break; M.envois[k].res(); await dort(2); }
    await premier;
    v('⛔ la rafale : quinze messages, chacun ENTIER, dans l\'ordre (aucun « A7 A » puis « 8 »)', M.textes(), Array.from({ length: N }, (_, i) => 'A' + (i + 1)));
    v('… et le seizième, à moitié tapé, est resté dans le champ', M.champ.value, 'A' + (N + 1) + ' à moit');
  });
  await essai(async () => {
    const M = monde();
    const p = M.entree('ok');
    await M.entree('ok');                                  // 250 ms plus tard, le même mot : un second message, pas un doublon à avaler
    M.envois[0].res(); await M.attendre(() => M.envois.length === 2); M.envois[1].res(); await p;
    v('« ok » puis « ok » : DEUX messages', M.textes(), ['ok', 'ok']);
  });
  await essai(async () => {
    const M = monde();
    const p = M.entree('seul');
    await M.entree('   ');                                 // Entrée sur un champ vide pendant le vol : rien en file
    v('Entrée sur un champ vide (ou de blancs) pendant un envoi : rien n\'est mis en file', M.etat.fileEnvoi.length, 0);
    M.envois[0].res(); await p;
    v('… et il ne part qu\'un message', M.textes(), ['seul']);
  });
  await essai(async () => {
    const M = monde(); const p = M.entree('premier');
    await M.entree('x'.repeat(8001));
    v('un texte trop long tapé pendant un envoi est refusé À L\'ENTRÉE (dit, gardé dans le champ, pas mis en file)', [M.etat.fileEnvoi.length, M.champ.value.length, /1 signe en trop/.test(nbsp(M.avis[M.avis.length - 1] || ''))], [0, 8001, true]);
    M.envois[0].res(); await p;
  });

  console.log('\n   la file et ses cas limites');
  await essai(async () => {
    /* une réponse à un message : le contexte de L'ENVOI EN VOL n'est pas celui du message suivant */
    const M = monde(); const ctx = { type: 'reponse', mid: 'm9', nom: 'Ben' }; M.etat.contexte = ctx;
    const p = M.entree('en réponse');
    await M.entree('simple');
    M.envois[0].res(); await M.attendre(() => M.envois.length === 2); M.envois[1].res(); await p;
    v('la réponse part avec SA référence, le message tapé pendant le vol part SANS (le contexte était celui du premier)', [M.envois[0].b.reponse, M.envois[1].b.reponse], ['m9', undefined]);
    v('… et le contexte est levé une fois la réponse partie', M.etat.contexte, null);
  });
  await essai(async () => {
    /* on change de conversation entre l'Entrée et l'envoi : le message part là où il a été écrit */
    const M = monde(); const p = M.entree('pour c1');
    await M.entree('encore pour c1');
    M.etat.conv = 'c2';
    M.envois[0].res(); await M.attendre(() => M.envois.length === 2); M.envois[1].res(); await p;
    v('⛔ un message mis en file part vers la conversation OÙ IL A ÉTÉ ÉCRIT, pas celle qu\'on a ouverte depuis', M.envois.map(e => e.id), ['c1', 'c1']);
  });
  await essai(async () => {
    /* UNE MODIFICATION puis un message : la modification part comme modification */
    const M = monde(); M.etat.contexte = { type: 'modif', mid: 'm5' };
    const p = M.entree('corrigé');
    await M.entree('suite');
    M.modifs[0].res(); await M.attendre(() => M.envois.length === 1); M.envois[0].res(); await p;
    v('une modification en vol : elle part comme modification, le message suivant comme MESSAGE (plus de contexte)', [M.modifs.map(m => [m.mid, m.t]), M.textes()], [[['m5', 'corrigé']], ['suite']]);
  });

  console.log('\n   un envoi refusé rend le texte (et la file), sans écraser autre chose');
  await essai(async () => {
    const M = monde(); const p = M.entree('M1');
    await M.entree('M2'); await M.entree('M3');
    M.envois[0].rej(Object.assign(new Error('Trop de demandes (réessaie dans 40 s).'), { dit: true }));
    await p;
    v('⛔ le premier refusé : RIEN d\'autre ne part (pas de boucle, pas d\'inversion) ; M1, M2 et M3 reviennent dans le champ, dans l\'ordre', [M.textes(), M.champ.value, M.etat.fileEnvoi.length, M.etat.envoiEnCours], [['M1'], 'M1\nM2\nM3', 0, false]);
    v('… avec SA phrase (« réessaie dans 40 s »)', /réessaie dans 40 s/.test(M.avis[M.avis.length - 1]), true);
    const p2 = M.envoyerTexte();
    M.envois[1].res(); await p2;
    v('« Réessayer » : le texte rendu repart, en UN message', M.textes().slice(1), ['M1\nM2\nM3']);
  });
  await essai(async () => {
    /* m11 sur m08 : un refus « introuvable » (blocage silencieux) rend le texte comme les autres, mais ne dit NI suppression NI « tu n'y es plus » */
    const M = monde(); const p = M.entree('à quelqu\'un');
    M.envois[0].rej(Object.assign(new Error('Introuvable (la conversation a peut-être été supprimée ou tu n\'y es plus)'), { dit: true, code: 'introuvable' }));
    await p;
    v('⛔ « introuvable » à l\'envoi : le texte revient, et l\'avis est la phrase NEUTRE (pas l\'accusation du service)', [M.champ.value, M.avis[M.avis.length - 1]], ['à quelqu\'un', 'Ce message n\'a pas pu être remis.']);
  });
  await essai(async () => {
    const M = monde(); const p = M.entree('perdu ?');
    await M.entree('suivant');
    M.tape('je tape autre chose');                          // la personne a déjà repris la main
    M.envois[0].rej(new Error('x'));
    await p;
    v('⛔ ce qui est déjà tapé n\'est ni écrasé ni perdu : le texte refusé (et la file) reviennent DEVANT, rien ne disparaît', [M.champ.value, M.etat.brouillons.c1, M.etat.fileEnvoi.length], ['perdu ?\nsuivant\nje tape autre chose', 'perdu ?\nsuivant\nje tape autre chose', 0]);
  });
  await essai(async () => {
    const M = monde(); const p = M.entree('seul');
    M.envois[0].rej(new Error('x')); await p;
    v('un envoi refusé SANS file : le texte revient dans le champ et le brouillon (comme avant)', [M.champ.value, M.etat.brouillons.c1, M.etat.envoiEnCours], ['seul', 'seul', false]);
    v('… le refus est dit (pas de silence)', M.avis.length, 1);
  });
  await essai(async () => {
    /* la confirmation d'envoi (côté pro) : tapée pendant un vol, elle DEMANDE d'abord ; la seconde touche met en file */
    const M = monde({ confirme: true }); M.etat.confirmeAttente = 'c1';
    const p = M.entree('déjà confirmé');
    M.envois.length || await M.attendre(() => M.envois.length === 1);
    await M.entree('à confirmer');
    v('⛔ « Confirmer l\'envoi » : pendant un vol, la PREMIÈRE touche demande (rien n\'est mis en file)', [M.demandes, M.etat.fileEnvoi.length, M.champ.value], [1, 0, 'à confirmer']);
    await M.envoyerTexte();
    v('… la seconde met le message en file', [M.etat.fileEnvoi.map(x => x.t), M.champ.value], [['à confirmer'], '']);
    M.envois[0].res(); await M.attendre(() => M.envois.length === 2); M.envois[1].res(); await p;
  });

  console.log('\n2. temps-reel#2 — « écrit… » s\'éteint dès que le champ est vide, et à l\'envoi');
  await essai(async () => {
    const M = monde();
    M.tape('bonjour');
    v('une frappe : la source est prévenue (actif)', M.saisies, [['c1', true]]);
    M.saisies.length = 0; M.tape('');
    v('⛔ le champ VIDÉ : l\'arrêt est envoyé (avant : jamais, l\'indicateur restait ~6 s chez l\'autre)', M.saisies, [['c1', false]]);
    M.saisies.length = 0; M.tape('   ');
    v('… un champ de blancs est vide aussi', M.saisies, [['c1', false]]);
    M.saisies.length = 0; M.tape('re'); M.tape('retape');
    v('on retape : de nouveau « actif » (la source limite à une frappe par 2 s, ce n\'est pas à la page de le faire)', M.saisies, [['c1', true], ['c1', true]]);
  });
  await essai(async () => {
    const M = monde();
    const p = M.entree('envoyé'); M.envois[0].res(); await p;
    v('⛔ à l\'envoi : l\'arrêt part (le champ est vidé par le code, aucun événement `input` ne le dirait)', M.saisies, [['c1', false]]);
  });
  await essai(async () => {
    const M = monde(); M.etat.contexte = { type: 'modif', mid: 'm1' };
    M.tape('retouche');
    v('une MODIFICATION ne s\'annonce pas comme une frappe (comme avant)', M.saisies, []);
  });
  await essai(async () => {
    const M = monde({ saisie: false });
    M.tape('x'); M.tape('');
    const p = M.entree('y'); M.envois[0].res(); await p;
    v('sans la capacité « saisie » (l\'aperçu) ni fonction `source.saisie` : rien n\'est appelé, rien ne casse', [M.saisies, M.textes()], [[], ['y']]);
  });

  console.log('\n3. conversations#7 — « 1 signe en trop », et la limite de la table des refus');
  await essai(async () => {
    const M = monde();
    const dit = n => nbsp(M.texteTropLong(n));
    v('8 001 signes : « 1 signe en trop » (singulier)', dit(8001), 'Ce message est trop long : 1 signe en trop (8 000 au plus).');
    v('8 002 signes : « 2 signes en trop »', dit(8002), 'Ce message est trop long : 2 signes en trop (8 000 au plus).');
    v('9 500 signes : « 1 500 signes en trop »', dit(9500), 'Ce message est trop long : 1 500 signes en trop (8 000 au plus).');
    M.tape('x'.repeat(8001));
    v('pendant la frappe : la même phrase (un seul endroit pour les trois appelants)', nbsp(M.avis[M.avis.length - 1]), 'Ce message est trop long : 1 signe en trop (8 000 au plus).');
    M.tape('x'.repeat(8000));
    v('… et elle s\'efface quand le texte redescend à la limite pile (8 000)', [M.avisEl.hidden, M.avisEl.textContent], [true, '']);
    const M2 = monde({ texteMax: 4000 });
    v('la table des refus dit la limite du SERVICE (8 000)', nbsp(M.MESSAGES_ERREUR['trop-long']), 'Ce message est trop long (8 000 signes au plus).');
    v('… et celle de l\'aperçu (4 000) quand c\'est elle qui est en vigueur : jamais un chiffre écrit en dur', nbsp(M2.MESSAGES_ERREUR['trop-long']), 'Ce message est trop long (4 000 signes au plus).');
  });
  vrai('`texteTropLong` est appelée aux trois endroits (frappe, envoi, légende d\'une photo) et AUCUN ne recompose « signes en trop » de son côté', (JS.match(/texteTropLong\(/g) || []).length === 3 && !/signes en trop/.test(JS));
  vrai('l\'ancien drapeau `envoiSuivant` n\'existe plus nulle part dans la page (le texte relu au `finally` était la cause)', !/envoiSuivant/.test(JS));

  total = true;
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; total = true; fin(); });
