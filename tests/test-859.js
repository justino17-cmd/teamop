/* ══ OP MESSAGES, ÉTAPE 3 — LES APPELS : LE CONTRAT DE LA SOURCE, LES FONCTIONS RÉELLES DE LA PAGE, CE QUI RELÂCHE LE MICRO ═══════════════════════════════════
   Complète `tests/test-856.js` (jetons, verre, politique du navigateur) et `tests/test-857.js` (conversation, échappement, historique). Celui-ci garde ce que l'étape 3
   a ajouté, par ce que le TEXTE et les modules exécutés peuvent voir ; ce qu'un navigateur est seul à voir (les pistes « ended » après un vrai appel, la grille à
   l'écran, la durée qui court, les contrastes au pixel) est dans `tests/sonde-opmessages.js` (blocs « étape 3 », scénarios --seul=appels, appels-bureau, appels-refus,
   appels-stress).

   1. LE CONTRAT DE LA SOURCE, EXÉCUTÉ (un bac à sable `vm`, une horloge posée, les minuteries sous contrôle) : appels(filtre), demarrerAppel, appel, terminerAppel,
      conversationPour — ce qu'ils rendent (des COPIES), ce qu'ils refusent, ce qu'ils disent aux écouteurs ;
   2. LES FONCTIONS RÉELLES DE LA PAGE, EXTRAITES ET EXÉCUTÉES : dureeAppel (la durée qui court : 03:12, 1:02:05), dureeCourte, libelleAppel (« Appel manqué (2) ») ;
   3. LE TEXTE QUI GARDE LES PISTES : arreterPistes arrête chaque piste, quitterAppel est la SEULE sortie (et la seule qui appelle arreterPistes), une piste qui arrive
      après la fin est arrêtée aussitôt, éteindre la caméra arrête sa piste, aucune demande de micro ou de caméra au chargement ;
   4. LA MISE EN PAGE : pas de barre d'onglets en appel, la zone de contenu au bureau, le fond sombre des DEUX modes, des cibles de 68 px, un segmenté qui filtre par la
      SOURCE ; et le contraste du texte rouge d'un manqué — calculé avec les VRAIES formules, jour et nuit.

   ⛔ ET LA CONTRE-ÉPREUVE EST LA MESURE : chaque garde est ÉPROUVÉE en la remettant en défaut sur une COPIE EN MÉMOIRE (série A de `tests/mutations-opmessages.js`) ; une
   mutation qu'aucun banc ne voit est réservée à la sonde, et le lanceur la joue contre elle. Une mutation dont le motif ne trouve rien est dite MAL VISÉE, jamais comptée.
   ⛔ Un motif de banc vise du CODE, jamais une phrase : les commentaires sont retirés avant de chercher (CLAUDE.md). */
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const { MUTATIONS, appliquer } = require('./mutations-opmessages.js');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');

const sansCommentairesCss = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ');
const sansCommentairesJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const ech = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const regle = (css, sel) => { const re = new RegExp('(?:^|\\n)[ \\t]*' + ech(sel) + '\\s*\\{([^}]*)\\}', 'g'); let o = ''; for (const m of css.matchAll(re)) o += m[1] + ';\n'; return o; };
const prop = (corps, p) => { const m = new RegExp('(?:^|[;\\s])' + ech(p) + '\\s*:\\s*([^;]+)').exec(corps); return m ? m[1].trim().replace(/\s+/g, ' ') : null; };

function chargerSource(SRC) {
  const ctx = { console, module: { exports: {} }, setTimeout, clearTimeout };
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { timeout: 3000 });
  return ctx.module.exports.creerSourceApercu;
}
const rejet = async p => { try { await p; return null; } catch (e) { return e && e.code; } };

/* le contraste WCAG, avec les vraies formules : la couleur de texte (opaque) sur un fond — la carte de jour est du blanc à 82 % sur le décor, la carte de nuit du blanc à 9 % sur le bleu nuit */
const hex = c => { const m = /^#([0-9a-f]{6})$/i.exec(c.trim()); return m ? [1, 3, 5].map(i => parseInt(m[1].slice(i - 1, i + 1), 16)) : null; };
const lin = c => { c /= 255; return c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4); };
const lum = ([r, g, b]) => .2126 * lin(r) + .7152 * lin(g) + .0722 * lin(b);
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const melange = (haut, alpha, bas) => haut.map((c, i) => Math.round(alpha * c + (1 - alpha) * bas[i]));

async function controler(PAGE, SRC) {
  const R = [];
  const v = (t, a, b) => R.push([t, JSON.stringify(a) === JSON.stringify(b), JSON.stringify(a) !== JSON.stringify(b) ? '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a) : '']);
  const vrai = (t, c, d) => R.push([t, !!c, c ? '' : (d ? '\n      ' + d : '')]);

  const style = (/<style>([\s\S]*?)<\/style>/.exec(PAGE) || [, ''])[1];
  const CSS = sansCommentairesCss(style);
  const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
  const JS = sansCommentairesJs(script);
  const SRCJS = sansCommentairesJs(SRC);
  const HTML = PAGE.replace(/<style>[\s\S]*?<\/style>/, ' ').replace(/<script>[\s\S]*?<\/script>/, ' ').replace(/<!--[\s\S]*?-->/g, ' ');
  /* le corps d'une fonction : jusqu'à la prochaine déclaration de premier niveau — ⛔ « corps » ne doit pas déborder (CLAUDE.md) : on borne sur function, const et les titres de bloc */
  const corps = nom => { const i = JS.indexOf(nom); if (i < 0) return ''; const f = JS.slice(i + nom.length).search(/\n  (?:async )?function |\n  const |\n  let |\n  \/\* ═══|\n  \$\(|\n  window\./); return JS.slice(i, f > 0 ? i + nom.length + f : i + 6000); };

  vrai('(population) le script de la page est lu (' + JS.length + ' caractères), la feuille (' + CSS.length + '), le module (' + SRCJS.length + '), le balisage (' + HTML.length + ')', JS.length > 40000 && CSS.length > 25000 && SRCJS.length > 6000 && HTML.length > 5000);

  /* 1. LE CONTRAT DE LA SOURCE, EXÉCUTÉ ───────────────────────────────────────────────────────────────────────────────────── */
  vrai('le module dit son contrat d\'appels en tête : appels(filtre), demarrerAppel, appel, terminerAppel, conversationPour, les événements « appels » et « appel » — et que les médias n\'y passent PAS',
    ['appels(filtre)', 'demarrerAppel({membres, video, conv})', 'appel(id)', 'terminerAppel(id)', 'conversationPour(membres)', 'cb({type:\'appels\'})', 'cb({type:\'appel\', id})'].every(t => SRC.includes(t)) && /Les médias \(micro, caméra\) ne passent PAS par la source/.test(SRC.replace(/\s+/g, ' ')));
  let creer = null; try { creer = chargerSource(SRC); } catch (e) { creer = null; }
  vrai('(population) le module de données se charge dans un bac à sable (' + (creer ? 'oui' : 'NON') + ')', typeof creer === 'function');
  if (typeof creer === 'function') {
    let t = Date.UTC(2026, 9, 6, 12, 10), minuteries = []; const maintenant = () => t;
    const S = creer({ maintenant, planifier: (f, ms) => minuteries.push([f, ms]), delaiLu: -1 });
    const evts = []; S.ecouter(e => evts.push(e.type + (e.id ? ':' + e.id : '')));
    const sig = c => c.map(a => [a.nom, a.type, a.sens].join('/')).join(' | ');
    /* l'historique */
    const h0 = await S.appels();
    v('appels() : 6 appels d\'exemple, du plus récent au plus ancien', [h0.length, h0.every((a, i) => i === 0 || h0[i - 1].t >= a.t)], [6, true]);
    v('appels() : chaque appel porte ses champs (id, type, sens, groupe, conv, membres, nom, court, initiales, avatar, photo, repetitions, t, duree)', h0.filter(a => !['id', 'type', 'sens', 'groupe', 'conv', 'membres', 'nom', 'court', 'initiales', 'avatar', 'photo', 'repetitions', 't', 'duree'].every(k => k in a)).length, 0);
    v('appels() : audio ET vidéo, entrant, sortant ET manqué, un appel de groupe (nom de sa conversation, « # »), un manqué répété (« (2) »)',
      [new Set(h0.map(a => a.type)).size, new Set(h0.map(a => a.sens)).size, h0.filter(a => a.groupe).map(a => a.nom + ':' + a.initiales), h0.filter(a => a.repetitions > 1).map(a => a.nom + ' ×' + a.repetitions)], [2, 3, ['Chantier Les Tilleuls:#', 'Équipe dépôt:#'], ['Hugo Perrin ×2']]);
    v('appels() : un manqué dure 0 s (personne n\'a répondu) ; un appel vidéo entrant dure 9 min', [h0.filter(a => a.sens === 'manque').every(a => a.duree === 0), h0.find(a => a.type === 'video' && a.sens === 'entrant' && !a.groupe).duree], [true, 540]);
    const mq = await S.appels('manques');
    v('appels(\'manques\') : ne rend QUE les manqués — Mathis Lambert puis Hugo Perrin, les deux sur six (le filtre est celui de la SOURCE)', [mq.map(a => a.nom), mq.every(a => a.sens === 'manque'), mq.length < h0.length], [['Mathis Lambert', 'Hugo Perrin'], true, true]);
    v('appels(\'tous\') et appels() rendent la même liste', sig(await S.appels('tous')), sig(h0));
    v('appels(filtre inconnu) est refusé (« invalide ») — un filtre ne se devine pas', [await rejet(S.appels('zzz')), await rejet(S.appels('Manques'))], ['invalide', 'invalide']);
    h0[0].nom = 'MODIFIÉ'; h0[0].membres.push('intrus'); mq[0].nom = 'MODIFIÉ';
    const h0b = await S.appels();
    v('copie : modifier ce que rend appels() (nom, membres) ne change RIEN chez la source', [h0b[0].nom, h0b[0].membres.length, (await S.appels('manques'))[0].nom], ['Camille Roux', 1, 'Mathis Lambert']);
    /* démarrer */
    v('demarrerAppel refuse : aucun contact (« vide »), des inconnus seuls (« vide »), une conversation inconnue (« introuvable »)',
      [await rejet(S.demarrerAppel({})), await rejet(S.demarrerAppel({ membres: ['zz'] })), await rejet(S.demarrerAppel({ membres: ['c1'], conv: 'zzz' }))], ['vide', 'vide', 'introuvable']);
    const a1 = await S.demarrerAppel({ membres: ['c1', 'c1', 'zz'], video: true });
    v('demarrerAppel : doublons et inconnus écartés, l\'appel SONNE (aucun participant n\'a répondu), vidéo, rendu en copie', [a1.membres.map(m => m.id + ':' + m.etat), a1.etat, a1.type, a1.debut, a1.duree, a1.membres[0].camera], [['c1:sonne'], 'sonne', 'video', null, 0, true]);
    v('demarrerAppel : une personne = un échange direct (son nom, ses initiales, pas un groupe) et SA conversation est retrouvée (v2)', [a1.nom, a1.initiales, a1.groupe, a1.conv], ['Camille Roux', 'CR', false, 'v2']);
    v('demarrerAppel : un SECOND appel est refusé tant que le premier court (« occupe ») — un seul à la fois', await rejet(S.demarrerAppel({ membres: ['c2'] })), 'occupe');
    const plan = minuteries.filter(([, ms]) => ms >= 1200).map(x => x[1]);
    v('demarrerAppel : les autres RÉPONDENT à 1,2 s (une minuterie par participant, 350 ms d\'écart entre deux)', plan, [1200]);
    v('demarrerAppel prévient les écouteurs (« appel »)', evts.filter(e => /^appel:/.test(e)).length >= 1, true);
    /* la réponse : le premier qui répond fait commencer l'appel */
    const tCommence = t + 1200; t = tCommence;
    minuteries.filter(([, ms]) => ms >= 1200).forEach(([f]) => f());
    const a1b = await S.appel(a1.id);
    v('appel(id) : quand le premier répond l\'appel est « en-cours », « debut » est posé à CET instant (la durée qui court se calcule dessus), le participant est « connecte »', [a1b.etat, a1b.debut === tCommence, a1b.membres[0].etat], ['en-cours', true, 'connecte']);
    t += 192000;
    v('appel(id) : la durée suit l\'horloge (192 s plus tard : 192 s = « 03:12 »)', (await S.appel(a1.id)).duree, 192);
    v('appel(inconnu) rend null (la page sait retomber sur la liste)', await S.appel('zzz'), null);
    /* raccrocher */
    const n0 = (await S.appels()).length, e0 = evts.length;
    const r1 = await S.terminerAppel(a1.id);
    v('terminerAppel : l\'appel entre dans l\'historique (sortant, vidéo, 192 s, la conversation v2), EN TÊTE, une ligne de plus', [r1.sens, r1.type, r1.duree, r1.conv, r1.nom, (await S.appels()).length, (await S.appels())[0].id === r1.id], ['sortant', 'video', 192, 'v2', 'Camille Roux', n0 + 1, true]);
    v('terminerAppel prévient les écouteurs : « appel » PUIS « appels » (la liste se refait)', evts.slice(e0), ['appel:' + a1.id, 'appels']);
    const r2 = await S.terminerAppel(a1.id);
    v('terminerAppel est IDEMPOTENT : raccrocher deux fois rend le MÊME appel et n\'ajoute aucune ligne à l\'historique', [r2.id === r1.id, (await S.appels()).length], [true, n0 + 1]);
    v('terminerAppel(inconnu) est refusé (« introuvable »)', await rejet(S.terminerAppel('zzz')), 'introuvable');
    const suivant = await S.demarrerAppel({ membres: ['c2'] });
    v('un appel terminé : l\'état est « termine », la fin est posée, et on peut en lancer un autre (plus « occupe »)', [(await S.appel(a1.id)).etat, (await S.appel(a1.id)).fin !== null, suivant.etat], ['termine', true, 'sonne']);
    /* raccrocher AVANT qu'on réponde : une durée de 0, et une minuterie tardive ne ressuscite rien */
    const idSonne = suivant.id, annule = await S.terminerAppel(idSonne);
    v('raccrocher pendant la sonnerie : l\'appel est enregistré, sortant, de 0 s (« annulé » avant qu\'on réponde)', [annule.duree, annule.sens, annule.nom], [0, 'sortant', 'Mathis Lambert']);
    const avantTardive = JSON.stringify(await S.appel(idSonne));
    minuteries.forEach(([f]) => f());
    v('une minuterie de réponse qui tombe APRÈS le raccrochage ne ressuscite pas l\'appel (il reste « termine », sans début)', [(await S.appel(idSonne)).etat, (await S.appel(idSonne)).debut, JSON.stringify(await S.appel(idSonne)) === avantTardive], ['termine', null, true]);
    /* personne ne répond : delaiReponse < 0 */
    const muet = creer({ maintenant, planifier: () => { throw new Error('ne doit pas planifier'); }, delaiReponse: -1 });
    const am = await muet.demarrerAppel({ membres: ['c3'] });
    v('delaiReponse < 0 : aucune réponse simulée (un vrai serveur la dira lui-même) — l\'appel sonne tant que personne n\'a répondu', [am.etat, am.membres[0].etat], ['sonne', 'sonne']);
    /* un groupe */
    const S3 = creer({ maintenant, planifier: (f, ms) => minuteries.push([f, ms]), delaiLu: -1 });
    const g = await S3.demarrerAppel({ membres: ['c3', 'c6'], video: false });
    v('demarrerAppel (deux personnes) : un GROUPE, du nom de la conversation qui les réunit (« Chantier Les Tilleuls », v3), audio, deux participants', [g.groupe, g.nom, g.conv, g.type, g.membres.length, g.initiales], [true, 'Chantier Les Tilleuls', 'v3', 'audio', 2, '#']);
    await S3.terminerAppel(g.id);
    const S4 = creer({ maintenant, planifier: (f, ms) => minuteries.push([f, ms]), delaiLu: -1 });
    const g2 = await S4.demarrerAppel({ membres: ['c1', 'c3', 'c5'], video: true });
    v('demarrerAppel (un groupe qui n\'a pas de conversation) : nommé d\'après les prénoms, 40 signes au plus', [g2.nom, g2.conv, g2.nom.length <= 40], ['Camille, Inès, Lina', null, true]);
    const ts = []; const S5 = creer({ maintenant, planifier: (f, ms) => ts.push(ms), delaiLu: -1 }); await S5.demarrerAppel({ membres: ['c1', 'c3', 'c5'] });
    v('les participants répondent l\'un après l\'autre : 1 200, 1 550, 1 900 ms (350 ms d\'écart)', ts, [1200, 1550, 1900]);
    /* conversationPour */
    const cx = creer({ maintenant, planifier: () => {}, delaiLu: -1 });
    const direct = await cx.conversationPour(['c5']), direct2 = await cx.conversationPour(['c5']);
    v('conversationPour (une personne sans conversation) la CRÉE (échange direct, à son nom) ; un second appel rend la MÊME, sans doublon', [direct.type, direct.nom, direct.id === direct2.id, (await cx.lister()).filter(c => c.nom === 'Lina Fabre').length], ['direct', 'Lina Fabre', true, 1]);
    v('conversationPour (une conversation existante) la rend telle quelle : Camille Roux → v2, Chantier (c3, c6) → v3', [(await cx.conversationPour(['c1'])).id, (await cx.conversationPour(['c3', 'c6'])).id], ['v2', 'v3']);
    const grp = await cx.conversationPour(['c1', 'c4']);
    v('conversationPour (deux personnes ou plus, sans groupe) crée un GROUPE nommé d\'après les prénoms, et le retrouve ensuite', [grp.type, grp.court, (await cx.conversationPour(['c4', 'c1'])).id === grp.id], ['groupe', 'Camille, Hugo', true]);
    v('conversationPour refuse : aucun contact (« vide »), des inconnus seuls (« vide »)', [await rejet(cx.conversationPour([])), await rejet(cx.conversationPour(['zz']))], ['vide', 'vide']);
  } else for (let i = 0; i < 24; i++) vrai('module de données exécuté (' + i + ')', false);

  /* 2. LES FONCTIONS RÉELLES DE LA PAGE, EXTRAITES ET EXÉCUTÉES ─────────────────────────────────────────────────────────── */
  const ligne = nom => { const m = new RegExp('^[ \\t]*const ' + nom + ' = (s => [^\\n]+);?$', 'm').exec(JS); return m ? m[1].replace(/;\s*$/, '') : ''; };
  let dureeAppel = null, dureeCourte = null, libelleAppel = null;
  try { dureeAppel = ligne('dureeAppel') ? new Function('return ' + ligne('dureeAppel'))() : null; } catch (e) { dureeAppel = null; }
  try { dureeCourte = ligne('dureeCourte') ? new Function('return ' + ligne('dureeCourte'))() : null; } catch (e) { dureeCourte = null; }
  try { const c = corps('function libelleAppel'), tab = (/const SENS_APPEL = (\{[^}]*\});/.exec(JS) || [, '{}'])[1]; libelleAppel = c ? new Function('dureeCourte', 'SENS_APPEL', c + '\nreturn libelleAppel;')(dureeCourte, eval('(' + tab + ')')) : null; } catch (e) { libelleAppel = null; }
  vrai('(population) les trois fonctions réelles sont extraites de la page : dureeAppel, dureeCourte, libelleAppel', typeof dureeAppel === 'function' && typeof dureeCourte === 'function' && typeof libelleAppel === 'function', [typeof dureeAppel, typeof dureeCourte, typeof libelleAppel].join());
  if (dureeAppel) {
    v('dureeAppel : la durée qui court s\'écrit mm:ss — 0 → 00:00, 59 → 00:59, 60 → 01:00, 192 → 03:12, 3599 → 59:59', [0, 59, 60, 192, 3599].map(dureeAppel), ['00:00', '00:59', '01:00', '03:12', '59:59']);
    v('dureeAppel : une heure et plus s\'écrit h:mm:ss — 3600 → 1:00:00, 3725 → 1:02:05, 36000 → 10:00:00 (jamais « 60:00 »)', [3600, 3725, 36000].map(dureeAppel), ['1:00:00', '1:02:05', '10:00:00']);
    v('dureeAppel : une fraction se tronque (59,9 → 00:59), un négatif ou une valeur absurde se lit 00:00 (une horloge qui recule n\'affiche pas -1:-1)', [59.9, -5, NaN, undefined, 'x'].map(dureeAppel), ['00:59', '00:00', '00:00', '00:00', '00:00']);
    v('dureeAppel : elle AVANCE d\'une seconde à la fois (14 → 00:14, 15 → 00:15) — pas figée', [dureeAppel(14), dureeAppel(15)], ['00:14', '00:15']);
  } else for (let i = 0; i < 4; i++) vrai('dureeAppel exécutée (' + i + ')', false);
  if (dureeCourte) v('dureeCourte : 0 → « 0 s », 59 → « 59 s », 60 → « 1 min », 190 → « 3 min », 3599 → « 59 min », 3600 → « 1 h 00 », 3900 → « 1 h 05 »', [0, 59, 60, 190, 3599, 3600, 3900].map(dureeCourte), ['0 s', '59 s', '1 min', '3 min', '59 min', '1 h 00', '1 h 05']);
  else vrai('dureeCourte exécutée', false);
  if (libelleAppel) {
    const L = o => libelleAppel(Object.assign({ groupe: false, type: 'audio', sens: 'entrant', repetitions: 1, duree: 0, membres: ['c1'] }, o));
    v('libelleAppel : le type, le sens, la durée — « Appel vidéo entrant · 9 min », « Appel sortant · 3 min », « Appel manqué »', [L({ type: 'video', duree: 540 }), L({ sens: 'sortant', duree: 190 }), L({ sens: 'manque' })], ['Appel vidéo entrant · 9 min', 'Appel sortant · 3 min', 'Appel manqué']);
    v('libelleAppel : des manqués d\'affilée s\'écrivent « Appel manqué (2) » — un seul n\'a pas de parenthèse', [L({ sens: 'manque', repetitions: 2 }), L({ sens: 'manque', repetitions: 1 })], ['Appel manqué (2)', 'Appel manqué']);
    v('libelleAppel : un groupe dit « Appel de groupe », ses participants (les autres + moi) et sa durée', [L({ groupe: true, type: 'video', duree: 2520, membres: ['c3', 'c6'] }), L({ groupe: true, sens: 'sortant', membres: ['c1', 'c3', 'c5'], duree: 7 })], ['Appel de groupe vidéo entrant · 3 participants · 42 min', 'Appel de groupe sortant · 4 participants · 7 s']);
  } else for (let i = 0; i < 3; i++) vrai('libelleAppel exécutée (' + i + ')', false);

  /* 3. LE TEXTE QUI GARDE LES PISTES ─────────────────────────────────────────────────────────────────────────────────────────── */
  const arreter = corps('function arreterPistes'), quitter = corps('function quitterAppel'), apparaitre = corps('function appliquer(r)');
  vrai('arreterPistes ARRÊTE chaque piste (t.stop()), vide la liste, et détache le flux de l\'élément vidéo (srcObject = null) — sinon le voyant de la caméra reste allumé après l\'appel [sonde : pistes « ended »]',
    /A\.pistes\.forEach\(t => \{ try \{ t\.stop\(\); \}/.test(arreter) && /A\.pistes = \[\]; A\.audio = null; A\.video = null/.test(arreter) && /v\.srcObject = null/.test(arreter), arreter.slice(0, 200));
  vrai('⛔ quitterAppel est la SORTIE UNIQUE : elle arrête les pistes (arreterPistes) AVANT de dire quoi que ce soit à la source, et la source est prévenue (terminerAppel) [sonde : tous les chemins]',
    /arreterPistes\(A\)/.test(quitter) && /source\.terminerAppel\(id\)/.test(quitter) && quitter.indexOf('arreterPistes(A)') < quitter.indexOf('source.terminerAppel(id)') && /clearInterval\(A\.minut\)/.test(quitter), quitter.slice(0, 200));
  vrai('quitterAppel n\'est appelée que par appliquer(route) : la route qui perd l\'appel raccroche — raccrocher, retour système, Échap, onglet et Message passent TOUS par la route (un seul chemin) [sonde : tous les chemins]',
    (JS.match(/quitterAppel\(\)/g) || []).length === 2 && /else quitterAppel\(\)/.test(apparaitre) && !/function quitterAppel[\s\S]*?quitterAppel\(\)/.test(quitter.slice(30)), (JS.match(/quitterAppel\(\)/g) || []).length + ' appels');
  vrai('arreterPistes n\'est appelée que par quitterAppel et par pagehide (la page qu\'on ferme) — jamais « pour faire propre » ailleurs', (JS.match(/arreterPistes\(/g) || []).length === 3 && /window\.addEventListener\('pagehide', \(\) => \{ if \(etat\.appelUI\) arreterPistes\(etat\.appelUI\); \}\);/.test(JS), (JS.match(/arreterPistes\(/g) || []).length + ' occurrences');
  const acquerir = corps('async function acquerirMedias');
  vrai('une piste qui arrive APRÈS la fin de l\'appel est arrêtée aussitôt (perime(A) après chaque attente : le flux est jeté) — jamais une caméra allumée pour un appel qui n\'existe plus [sonde : retour avant la réponse]',
    /const perime = A => A\.fini \|\| etat\.appelUI !== A;/.test(JS) && (acquerir.match(/if \(perime\(A\)\) \{ if \((?:flux|fv)\) (?:flux|fv)\.getTracks\(\)\.forEach\(t => t\.stop\(\)\); return; \}/g) || []).length === 3, (acquerir.match(/perime\(A\)/g) || []).length + ' gardes');
  const basc = corps('async function basculerCamera');
  vrai('éteindre la caméra ARRÊTE sa piste (A.video.stop()), il ne la masque pas : le voyant s\'éteint [sonde : piste « ended »]', /try \{ A\.video\.stop\(\); \}/.test(basc) && !/A\.video\.enabled = false/.test(basc), basc.slice(0, 160));
  const retour = corps('async function retournerCamera');
  vrai('population : la fonction qui retourne la caméra est trouvée (' + retour.length + ' caractères)', retour.length > 400);
  vrai('⛔ retourner la caméra ARRÊTE l\'ancienne piste AVANT d\'en demander une autre (un téléphone n\'ouvre pas deux caméras à la fois, et le voyant ne reste pas allumé) [sonde : retournement]',
    retour.indexOf('ancienne.stop()') > 0 && retour.indexOf('ancienne.stop()') < retour.indexOf('gum('), retour.slice(0, 200));
  vrai('   la piste neuve se demande par `facingMode`, se range comme toute piste (poserPistes : gardée pour être arrêtée, remise au moteur) ; si rien ne vient, la caméra est COUPÉE et on le dit [sonde : retournement]',
    /gum\(\{ video: \{ facingMode: \{ ideal: vers \} \} \}\)/.test(retour) && /poserPistes\(A, f\)/.test(retour) && /La caméra est coupée\./.test(retour));
  vrai('   le bouton « Retourner la caméra » n\'est visible que dans la version servie, caméra allumée ET deux caméras au moins [sonde : retournement]', /\$\('appel-flip'\)\.hidden = !\(CAP\.appelsMedias && A\.camera && A\.nbCam > 1\);/.test(JS));
  const micro = corps('async function basculerMicro');
  vrai('couper le micro agit sur la PISTE (A.audio.enabled = A.micro), pas seulement sur le bouton [sonde : enabled = false]', /A\.micro = !A\.micro; A\.audio\.enabled = A\.micro;/.test(micro), micro.slice(0, 160));
  vrai('⛔ aucune demande de micro ou de caméra au chargement : getUserMedia n\'est appelée que par gum(), elle-même appelée par les gestes (acquerirMedias, basculerMicro, basculerCamera, retournerCamera) ET par la prise de son d\'un vocal (étape 2)',
    /* (6 octobre 2026) trois appels directs : le vocal, `gum()` lui-même, et son REPLI quand l'appareil choisi a disparu (sans `deviceId`) ; huit gestes passent par gum() — les sept d'avant
       et le changement de micro ou de caméra en cours d'appel (`changerAppareil`) */
    (JS.match(/getUserMedia\(/g) || []).length === 3 && /const gum = async c => \{\s*try \{ return await navigator\.mediaDevices\.getUserMedia\(c\); \}/.test(JS) && /return navigator\.mediaDevices\.getUserMedia\(sansAppareil\(c\)\);/.test(JS) && (JS.match(/\bgum\(/g) || []).length === 8 && !/function demarrer\(\)[\s\S]*?gum\(/.test(corps('async function demarrer')), (JS.match(/getUserMedia\(/g) || []).length + ' appels directs, ' + (JS.match(/\bgum\(/g) || []).length + ' par gum()');
  vrai('un refus, une absence, une caméra occupée se DISENT en une phrase (« La caméra est refusée… », « Aucune caméra… », « utilisée par une autre application ») et l\'appel continue (« L\'appel continue en audio », « sans micro ») [sonde : appels-refus]',
    /La caméra est refusée/.test(JS) && /Le micro est refusé/.test(JS) && /Aucune caméra n\\'a été trouvée/.test(JS) && /Aucun micro n\\'a été trouvé/.test(JS) && /L\\'appel continue en audio\./.test(JS) && /L\\'appel continue sans micro\./.test(JS) && !/alert\(|console\.error/.test(JS));
  vrai('un micro absent REESSAIE au toucher du bouton (la personne a pu changer l\'autorisation) au lieu de ne rien répondre — et le redemande PROPRE (cAudio : bruit, écho, gain)', /if \(!A\.audio\) \{/.test(micro) && /gum\(\{ audio: cAudio\(\) \}\)/.test(micro));
  vrai('« Message » ramène à la conversation : la source la CRÉE si elle n\'existe pas (conversationPour), un retour d\'historique si l\'on vient d\'elle, sinon la route est remplacée — jamais deux entrées pour la même conversation [sonde : Message]',
    /source\.conversationPour\(membres\)/.test(corps('async function ouvrirConversationAvec')) && /rendreEntree\(\); else remplacer\(cible\)/.test(corps('async function ouvrirConversationAvec')) && /\$\('appel-msg'\)\.addEventListener\('click'/.test(JS) && /ouvrirConversationAvec\(A\.snap\.membres\.map/.test(JS));
  vrai('la caméra de la conversation lance l\'appel VIDÉO de CETTE conversation (les autres membres, jamais moi) et raccrocher revient à elle [sonde : depuis la conversation]', /lancerAppel\(\{ membres: c\.membres\.filter\(x => x !== MOI\.id\), video: true, conv: c\.id \}, \$\('conv-cam'\)\)/.test(JS));
  vrai('deux touchers dans le même instant ne lancent pas deux appels (appelDemarre / appelId) [sonde : deux clics synchrones]', /if \(etat\.appelId \|\| etat\.appelDemarre\) return false;/.test(corps('async function lancerAppel')) && /etat\.appelDemarre = true;/.test(JS));
  vrai('un onglet touché PENDANT un appel REMPLACE l\'entrée de l\'appel (il raccroche, sans laisser d\'entrée morte) [sonde : un autre onglet]', /else if \(etat\.appelId\) remplacer\(r\); else pousser\(r\);/.test(JS));
  vrai('Échap raccroche (la couche du dessus), après la photo et la feuille, avant l\'enregistrement et la conversation [sonde : Échap]', /etat\.photo \|\| etat\.groupe\.ouvert\) \{ e\.preventDefault\(\); fermerCouche\(\); \}\s*else if \(etat\.appelId\) \{ e\.preventDefault\(\); fermerCouche\(\); \}\s*else if \(enr\.etat/.test(JS));
  vrai('l\'appel est la couche du DESSUS de la route : parentDe la retire en premier, et memeRoute le compare (sinon deux routes différentes passent pour la même)', /function parentDe\(r\) \{\s*if \(r\.appel\) return Object\.assign\(\{\}, r, \{ appel: null \}\);/.test(JS) && /\(a\.appel \|\| null\) === \(b\.appel \|\| null\)/.test(JS));
  vrai('la durée se relit quatre fois par seconde (250 ms), pas une : une minuterie à 1 s n\'est pas calée sur le début et affiche un chiffre en retard [sonde : la durée COURT]', /A\.minut = setInterval\(majStatutAppel, 250\);/.test(JS) && /dureeAppel\(\(Date\.now\(\) - \(s\.debut \|\| Date\.now\(\)\)\) \/ 1000\)/.test(corps('function statutAppel')));
  vrai('la durée affichée se CALCULE sur l\'horloge (Date.now() − debut) : la source ne pousse pas une seconde à la fois', !/\.duree\s*\+\+|duree\s*\+=\s*1/.test(JS) && /s\.debut/.test(corps('function statutAppel')));

  /* le segmenté, la liste */
  vrai('le segmenté filtre par la SOURCE : le filtre choisi est demandé à source.appels(filtre), la page ne trie ni ne filtre elle-même [sonde : « Manqués » ne garde que les manqués]',
    /source\.appels\(etat\.filtreAppels\)/.test(corps('async function rafraichirAppels')) && !/\.filter\([^)]*sens === 'manque'/.test(JS) && /etat\.filtreAppels = b\.dataset\.filtre; rafraichirAppels\(\);/.test(JS));
  vrai('une demande de liste dépassée est jetée (jeton) : « Manqués » puis « Tous » vite ne laisse pas la liste des manqués affichée sous « Tous »', /const n = \+\+etat\.jetonAppels;/.test(corps('async function rafraichirAppels')) && /if \(n !== etat\.jetonAppels \|\| !l\) return;/.test(corps('async function rafraichirAppels')));
  vrai('un appel manqué porte le NOM en rouge : la classe « manque » vient du SENS de l\'appel (a.sens === \'manque\'), pas d\'une regex sur le libellé (la maquette cherchait « manqué » dans le texte)', /const manque = a\.sens === 'manque'/.test(corps('function ligneAppel')) && /appel-nom-ligne' \+ \(manque \? ' manque' : ''\)/.test(corps('function ligneAppel')));
  vrai('chaque ligne est un BOUTON qui rappelle (data-rappeler) et un bouton « i » (data-infos), tous deux NOMMÉS (aria-label) — le texte venu d\'une personne passe par esc()', /data-rappeler="' \+ esc\(a\.id\) \+ '" aria-label="' \+ esc\('Rappeler '/.test(corps('function ligneAppel')) && /data-infos="' \+ esc\(a\.id\) \+ '" aria-label="' \+ esc\('Détails/.test(corps('function ligneAppel')) && /esc\(a\.nom\)/.test(corps('function ligneAppel')) && /esc\(libelleAppel\(a\)\)/.test(corps('function ligneAppel')));
  vrai('(population) les boutons du balisage portent un nom — aucun bouton d\'icône seule parmi les commandes de l\'appel (aria-label ou texte)', ['appel-micro', 'appel-hp', 'appel-cam', 'appel-msg', 'appel-raccrocher'].every(id => new RegExp('<button[^>]*id="' + id + '"[^>]*aria-label="[^"]+"').test(HTML)) && [...HTML.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)].every(m => /aria-label=/.test(m[1]) || m[2].replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '').trim()));
  vrai('le segmenté a deux boutons (« Tous », « Manqués ») portant l\'état (aria-pressed) dans un groupe nommé, et un curseur décoratif (aria-hidden)', /<div class="seg" id="seg-appels" role="group" aria-label="Filtrer les appels">/.test(HTML) && /class="seg-bouton" data-filtre="tous" aria-pressed="true">Tous</.test(HTML) && /class="seg-bouton" data-filtre="manques" aria-pressed="false">Manqués</.test(HTML) && /<span class="seg-knob" aria-hidden="true">/.test(HTML));

  /* 4. LA MISE EN PAGE ──────────────────────────────────────────────────────────────────────────────────────────────────────── */
  const seg = regle(CSS, '.seg'), knob = regle(CSS, '.seg-knob');
  v('segmenté : piste --seg-track, rayon 9, curseur --seg-knob de rayon 7, une colonne de large, il glisse par translate = --i × 100 % (rien n\'est mesuré en JavaScript)',
    [prop(seg, 'background'), prop(seg, 'border-radius'), prop(knob, 'background'), prop(knob, 'border-radius'), prop(knob, 'width'), prop(knob, 'translate')], ['var(--seg-track)', '9px', 'var(--seg-knob)', '7px', 'calc((100% - 4px) / 2)', 'calc(var(--i) * 100%) 0']);
  vrai('segmenté : 44 px au doigt (pointer: coarse), 32 à la souris — la zone qui répond (le paquet dessine 29)', parseFloat(prop(regle(CSS, '.seg-bouton'), 'min-height')) === 32 && /@media \(pointer: coarse\) \{ \.seg-bouton \{ min-height: 44px; \} \}/.test(CSS));
  vrai('liste d\'appels : ligne de 60 px au moins, avatar de 40, nom de 17 px, type de 15 px, bouton « i » de 52 × 60 (la zone qui répond), icône de 22 (le paquet)',
    prop(regle(CSS, '.appel-ligne'), 'min-height') === '60px' && prop(regle(CSS, '.appel-ligne .avatar'), 'width') === '40px' && prop(regle(CSS, '.appel-nom-ligne'), 'font-size') === '17px' && prop(regle(CSS, '.appel-kind'), 'font-size') === '15px' && prop(regle(CSS, '.appel-info'), 'width') === '52px' && prop(regle(CSS, '.appel-info'), 'min-height') === '60px' && prop(regle(CSS, '.appel-info .ic'), 'width') === '22px');
  vrai('un libellé de type d\'appel n\'est PAS coupé par une ellipse (il passe à la ligne : « un libellé tronqué ne nomme rien »)', !/text-overflow/.test(regle(CSS, '.appel-kind span')) && /overflow-wrap: anywhere/.test(regle(CSS, '.appel-kind span')));
  const ecran = regle(CSS, '.appel-ecran');
  vrai('écran d\'appel : fond sombre (160°, #24408a → #0e1a3f) dans les DEUX modes — le paquet : « il ne s\'adapte pas au thème jour » — donc le jeton --appel-fond a la MÊME valeur de jour et de nuit',
    prop(ecran, 'background') === 'var(--appel-fond)' && (() => { const j = /(?:^|\n):root\s*\{([^}]*)\}/.exec(CSS), n = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(CSS); const f = c => (/--appel-fond:\s*([^;]+);/.exec(c || '') || [, ''])[1].trim(); return !!f(j && j[1]) && f(j && j[1]) === f(n && n[1]) && /linear-gradient\(160deg, #24408a, #0e1a3f\)/.test(f(j && j[1])); })());
  vrai('écran d\'appel : plein écran en haut (fixed, 0 / 0 / 0 / 0, au-dessus de la conversation : z-index 35 > 30), SANS barre d\'onglets (html[data-appel] .tabs { display: none }) [sonde : mise en page par appareil]',
    prop(ecran, 'position') === 'fixed' && prop(ecran, 'z-index') === '35' && prop(ecran, 'top') === '0' && prop(ecran, 'bottom') === '0' && /html\[data-appel\] \.tabs \{ display: none; \}/.test(CSS));
  vrai('écran d\'appel au bureau (≥ 900 px) : la ZONE DE CONTENU — il commence après la barre latérale de 236 px (left: 236px), qui reste visible et active [sonde : bureau]', /@media \(min-width: 900px\) \{ \.appel-ecran \{ left: 236px; \} \}/.test(CSS));
  vrai('les commandes : des ronds de 68 px, « Raccrocher » de 68 px sur le rouge du paquet (#ff453a), libellés de 13 px, l\'état « pressé » en blanc et icône noire',
    prop(regle(CSS, '.appel-cmd .rond-cmd'), 'width') === '68px' && prop(regle(CSS, '.appel-cmd .rond-cmd'), 'height') === '68px' && prop(regle(CSS, '.appel-raccrocher'), 'width') === '68px' && prop(regle(CSS, '.appel-raccrocher'), 'background') === 'var(--rouge)' && prop(regle(CSS, '.appel-cmd'), 'font-size') === '13px' && /\.appel-cmd\[aria-pressed="true"\] \.rond-cmd \{ background: #fff; color: #000; \}/.test(CSS) && /--rouge: #ff453a;/.test(CSS));
  vrai('trois mises en page, choisies par UNE donnée (data-mise : audio, video, groupe) ; la vignette « Vous » de 104 × 150 en vidéo 1:1, une grille en groupe',
    ['audio', 'video', 'groupe'].every(m => HTML.includes('data-mise="audio"') || true) && /\.appel-ecran\[data-mise="video"\] \.tuile\.vous \{[^}]*width: 104px; height: 150px/.test(CSS) && /\.appel-ecran\[data-mise="groupe"\] \.appel-scene \{[^}]*display: grid/.test(CSS) && /E\.dataset\.mise = mise;/.test(JS) && /mise = s\.membres\.length >= 2 \? 'groupe' : \(A\.camera \? 'video' : 'audio'\)/.test(JS));
  vrai('une vignette = la couleur de l\'avatar SOUS un voile sombre (.tuile::before, --appel-voile) : le blanc n\'est pas lisible sur l\'orange nu — et le nom sur sa pastille noire à 55 %', /\.tuile::before \{[^}]*background: var\(--appel-voile\)/.test(CSS) && /rgba\(0,0,0,\.55\)/.test(regle(CSS, '.tuile-nom, .tuile-etat')) && /--appel-voile: rgba\(14,26,63,\.62\)/.test(CSS));
  vrai('un seul fond sombre pour les participants dans les deux modes : le voile ne change pas avec le thème', (CSS.match(/--appel-voile:/g) || []).length === 2 && (CSS.match(/--appel-voile: rgba\(14,26,63,\.62\);/g) || []).length === 2);
  vrai('rien sous 11 px dans l\'écran d\'appel (libellés 13, mention 12, pastilles 13, statut 15)', ['.appel-cmd', '.appel-mention', '.tuile-nom, .tuile-etat', '.appel-statut'].every(s => parseFloat(prop(regle(CSS, s), 'font-size')) >= 12));
  /* le ROUGE d'un manqué : la couleur du paquet n'est pas une couleur de LETTRE — ses deux jetons de texte, mesurés avec les vraies formules */
  const jj = /(?:^|\n):root\s*\{([^}]*)\}/.exec(CSS), nn = /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{\s*:root\s*\{([^}]*)\}/.exec(CSS);
  const jeton = (c, n) => (new RegExp(ech(n) + ':\\s*([^;]+);').exec(c || '') || [, ''])[1].trim();
  const rtJour = hex(jeton(jj && jj[1], '--rouge-txt')), rtNuit = hex(jeton(nn && nn[1], '--rouge-txt')), rouge = hex('#ff453a');
  /* thème « 100 % Apple » (5 octobre 2026) : la carte est PLEINE (#ffffff / #1c1c1e) ; la ligne survolée ou pressée prend le gris du champ (--field) par-dessus */
  const carteJour = [255, 255, 255], carteJourFonce = melange([118, 118, 128], .12, [255, 255, 255]);
  const carteNuit = [22, 36, 75], carteNuitHaut = melange([120, 140, 200], .18, [22, 36, 75]);      // nuit en bleu nuit (carte #16244b), pas en noir
  vrai('--rouge-txt existe de jour ET de nuit (#d70015 et #ff8a82) et SERT le nom d\'un appel manqué', !!rtJour && !!rtNuit && jeton(jj && jj[1], '--rouge-txt') === '#d70015' && jeton(nn && nn[1], '--rouge-txt') === '#ff8a82' && /\.appel-nom-ligne\.manque \{ color: var\(--rouge-txt\); \}/.test(CSS) && !/\.appel-nom-ligne\.manque \{ color: var\(--rouge\)/.test(CSS));
  if (rtJour && rtNuit && rouge) {
    const cj = Math.min(contraste(rtJour, carteJour), contraste(rtJour, carteJourFonce)), cn = Math.min(contraste(rtNuit, carteNuit), contraste(rtNuit, carteNuitHaut));
    vrai('contraste (calculé, vraies formules) : le nom d\'un manqué fait ' + cj.toFixed(2) + ':1 de jour et ' + cn.toFixed(2) + ':1 de nuit sur la carte — au moins 4,5 [sonde : « nom d\'un appel MANQUÉ » au pixel]', cj >= 4.5 && cn >= 4.5, cj.toFixed(2) + ' / ' + cn.toFixed(2));
    const rj = contraste(rouge, carteJour), rn = contraste(rouge, carteNuitHaut);
    vrai('la contre-épreuve du jeton : le rouge des statuts (#ff453a) fait ' + rj.toFixed(2) + ':1 de jour sur la carte et ' + rn.toFixed(2) + ':1 de nuit sur une ligne pressée — SOUS 4,5, c\'est pour ça que --rouge-txt existe (un jeton « à nous » sans raison mesurée est une décision de plus à porter)', rj < 4.5 && rn < 4.5, rj.toFixed(2) + ' / ' + rn.toFixed(2));
  } else for (let i = 0; i < 2; i++) vrai('contraste du rouge d\'un manqué (' + i + ')', false);
  vrai('l\'écart --rouge-txt est DÉCLARÉ dans le commentaire des jetons (le document ne le cite pas), avec sa raison', /--rouge-txt : le #ff453a des statuts/.test(PAGE) && /--appel-fond, --appel-voile, --appel-bouton/.test(PAGE));
  vrai('couleurs forcées : une vignette, le message de la caméra, les pilules Audio / Vidéo et le segmenté gardent un contour (CanvasText) ; les commandes aussi', /\.bulle, \.photo, \.vocal, \.saisie-ind, \.pilule-saisie, \.avis-saisie, \.tuile, \.appel-avis, \.g-pilule, \.seg \{ border: 1px solid CanvasText; \}/.test(CSS) && /\.appel-cmd \.rond-cmd, \.appel-raccrocher \{ border: 2px solid CanvasText; \}/.test(CSS));
  vrai('mouvement réduit : l\'entrée de l\'écran d\'appel est une animation, donc éteinte par la règle générale (animation: none)', /@media \(max-width: 899\.98px\) \{ html\[data-appel\] \.appel-ecran \{ animation: pousse/.test(CSS) && /prefers-reduced-motion: reduce\) \{\s*\*, \*::before, \*::after \{ animation: none !important/.test(CSS));
  vrai('la politique du navigateur n\'a pas changé pour les appels : toujours default-src \'none\', aucun connect-src (les médias ne sortent pas de la page : srcObject, jamais d\'adresse)', (() => { const csp = (/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/.exec(PAGE) || [, ''])[1]; return /default-src 'none'/.test(csp) && !/connect-src/.test(csp) && /media-src blob:(;|$)/.test(csp) && !/https?:|\*/.test(csp); })());
  vrai('le module de données ne touche toujours ni au DOM ni à la page, et ne connaît AUCUN média (ni getUserMedia, ni MediaStream)', !/\bdocument\b|\bquerySelector|\blocation\b|innerHTML|getUserMedia|MediaStream|navigator\./.test(SRCJS));
  return R;
}

/* ══ EXÉCUTION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(async () => {
  const PAGE = lire('apercu/opmessages/index.html'), SRC = lire('apercu/opmessages/source.js');
  let ok = 0, ko = 0;
  const dire = (t, bon, d) => { if (bon) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d || '')); } };
  console.log('\n══ 1. LES APPELS — le contrat de la source, les fonctions réelles de la page, ce qui relâche le micro, la mise en page ══\n');
  const base = await controler(PAGE, SRC);
  for (const [t, bon, d] of base) dire(t, bon, d);
  dire('(population) ' + base.length + ' contrôles joués sur la page et le module réels', base.length >= 80);

  console.log('\n══ 2. LA CONTRE-ÉPREUVE : ON REMET LE DÉFAUT SUR UNE COPIE EN MÉMOIRE (série A), LE BANC DOIT TOMBER (ou l\'indiquer à la sonde) ══\n');
  const neutre = (await controler(PAGE, SRC)).filter(r => !r[1]).length;
  dire('copie INTACTE : 0 constat rouge (le banc ne crie pas au loup)', neutre === 0, ' — ' + neutre + ' rouge(s)');
  const SERIE = MUTATIONS.filter(m => m.suite === '859');
  let mordent = 0, banc = 0, sondeSeule = 0, malVisees = 0;
  for (const m of SERIE) {
    const mut = appliquer(m, PAGE, SRC);
    if (!mut.change) { malVisees++; dire('mutation ' + m.id + ' « ' + m.nom + ' » : le motif ne trouve rien à muter (mutation mal visée)', false); continue; }
    if (!m.banc) {
      sondeSeule++; mordent++;
      dire(m.id + ' « ' + m.nom + ' » : posée sans erreur — gardée par la SONDE seule (scénario « ' + m.scenario + ' », lancée par tests/mutations-opmessages.js)', m.sonde === true && !!m.scenario);
      continue;
    }
    banc++;
    let rouges = []; try { rouges = (await controler(mut.PAGE, mut.SRC)).filter(r => !r[1]).map(r => r[0]); } catch (e) { rouges = ['le banc a jeté : ' + e.message]; }
    const nomme = rouges.some(t => m.banc.test(t));
    if (nomme) mordent++;
    dire(m.id + ' « ' + m.nom + ' » : ' + rouges.length + ' ✗, dont celui qui la garde' + (m.sonde ? ' (et la sonde la voit aussi)' : ''), nomme, '\n      rouges : ' + JSON.stringify(rouges.slice(0, 4)));
  }
  dire('(population) ' + SERIE.length + ' mutations de la série A : ' + banc + ' attrapées par ce banc, ' + sondeSeule + ' réservées à la sonde, ' + malVisees + ' mal visée(s) — ' + mordent + ' gardées', malVisees === 0 && mordent === SERIE.length && SERIE.length >= 12 && banc >= 8);

  console.log('\n═══ test-859 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('BANC MORT :', e); process.exit(2); });
