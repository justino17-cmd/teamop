/* ══ test-2453 — UN BLOCAGE SILENCIEUX SE TAIT PARTOUT, PAS SEULEMENT SUR TROIS ÉCRANS (17 octobre 2026, lot « m11 », relecture de contacts#6 / contacts@9) ═════════════
   Le service rend 404 « introuvable » à qui écrit, appelle ou ouvre une conversation avec quelqu'un qui l'a bloqué — VOULU : le blocage ne se dit pas. Mais api.js sert pour tout 404 la phrase
   « Introuvable (la conversation a peut-être été supprimée ou tu n'y es plus). » : une accusation fausse, et une invitation à insister. test-2452 gardait trois sites (l'envoi d'un texte, « Message »
   depuis la fiche, « En commun »). La relecture en a trouvé d'autres, qui disaient toujours la phrase générale : « Appeler » / « Vidéo » (POST /api/appels → 404 : routes-appels.js l. 105-141),
   « Écrire » depuis une carte de contact partagée, « Écrire » dans les feuilles Contacts / membres d'un espace, et les autres écritures dans une conversation (programmer, sondage, position, fiche,
   transférer, modifier, réagir, supprimer).
   UNE fonction dit ce refus (`phraseSilence`) et TOUS les sites passent par elle : ce fichier les JOUE (les vraies fonctions de la page, ou les vrais écouteurs extraits d'elle), il ne cherche pas
   un motif. Un code « introuvable » dit la phrase NEUTRE du geste ; tout autre refus du service garde SA phrase ; un « introuvable » en ENTRANT dans une salle qui existe garde la phrase générale
   (là, « la salle n'existe plus » est vrai). ⛔ Chaque absence est précédée de sa population. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const RACINE = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const JS = sansCommJs((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]);
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
/* un écouteur est un ARGUMENT : on le sort tel quel (jusqu'à sa parenthèse fermante) pour le rejouer avec un `$` / un `document` qui le capturent */
const ecouteur = (marqueur, debutRecherche) => {
  const i0 = debutRecherche ? JS.indexOf(debutRecherche) : 0; if (i0 < 0) return '';
  const i = JS.indexOf(marqueur, i0); if (i < 0) return '';
  let j = JS.indexOf('{', i + marqueur.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + ');'; }
  }
  return '';
};
const M = {
  phrase: ligne('const phrase = '), phraseSilence: ligne('const phraseSilence = '), MESSAGES_ERREUR: ligne('const MESSAGES_ERREUR = '),
  envoi: decl('async function envoi('), lancerAppel: decl('async function lancerAppel('), gesteCarte: decl('function gesteCarte('),
};
const LISTE_INFO = ecouteur("$('info-corps').addEventListener('click', async e => {", "const erreurInfo = ");
const LISTE_FICHE = ecouteur("document.addEventListener('click', async e => {", "function rendrePersonne(");

const NEUTRE_APPEL = 'L\'appel n\'a pas pu être lancé.', NEUTRE_OUVRIR = 'Cette conversation n\'a pas pu s\'ouvrir.';
const accuse = t => /supprim|n.y es plus|bloqu|Introuvable/i.test(t);
const introuvable = () => new OPMSG.ErreurApi('introuvable', 404, 0, {});
const att = (cond, ms = 3000) => T.attendre(cond, ms, 5);

/* un bac à sable : la page n'y est qu'une poignée de fonctions réelles et des témoins qui notent ce qu'on leur dit */
function bac(o) {
  const dit = { avis: [], mot: [], feuille: [], info: [], pousse: [], ouvertes: [], conv: [] };
  const ctx = {
    Math, JSON, Number, Array, Object, String, Date, Intl, RegExp, Map, Set, console, Promise, setTimeout, clearTimeout,
    etat: { conv: 'c_ab', forcerBas: false, appelId: null, appelDemarre: false, groupe: { convId: 'c_ab', ouvert: false }, route: { vue: 'messages', conv: 'c_ab', feuille: false, photo: null, appel: null }, declencheurAppel: null },
    avis: t => dit.avis.push(t), mot: t => dit.mot.push(t), montrerRefusFeuille: t => dit.feuille.push(t), erreurInfo: t => dit.info.push(t),
    pousser: r => dit.pousse.push(r), remplacer: r => dit.pousse.push(r), ouvrirConvId: c => dit.conv.push(c),
    trouverMessage: id => (id === 'm1' ? { seq: 7 } : null), fichesDemandees: new Map(), rafraichirConv: () => {},
    source: Object.assign({ envoyer: async () => ({}), demarrerAppel: async () => ({ id: 'a1' }), ouvrirDirecte: async () => 'c_x', ecrireCarte: async () => ({ resultat: 'envoyee', conv: 'c_x' }) }, o.source || {}),
  };
  ctx.document = { addEventListener: (t, f) => { ctx._doc = f; } };
  ctx.$ = id => ({ addEventListener: (t, f) => { ctx['_' + id] = f; } });
  vm.createContext(ctx);
  vm.runInContext(Object.values(M).join('\n') + '\n' + (o.ecouteurs ? LISTE_INFO + '\n' + LISTE_FICHE : '') + '\nthis.F = { phraseSilence: typeof phraseSilence === "function" ? phraseSilence : null, envoi, lancerAppel, gesteCarte };', ctx);
  return { F: ctx.F, dit, ctx };
}
/* un clic : `closest` ne reconnaît que le sélecteur voulu (le reste rend null, comme sur une page où l'on touche ailleurs) */
const clic = (selecteur, attrs, extra) => {
  const b = Object.assign({ disabled: false, dataset: attrs, getAttribute: () => null, setAttribute() {}, removeAttribute() {}, querySelector: () => null }, extra || {});
  return { target: { closest: s => (s === selecteur ? b : null) }, b };
};

(async () => {
  console.log('\n0. La population : les vraies fonctions et les vrais écouteurs sont trouvés dans la page');
  v('(population) chaque morceau est trouvé', Object.keys(M).filter(k => !M[k]), []);
  vrai('(population) l\'écouteur des feuilles Contacts / Infos est trouvé', LISTE_INFO.length > 500 && /source\.ouvrirDirecte\(b\.dataset\.uid\)/.test(LISTE_INFO));
  vrai('(population) l\'écouteur des gestes de la fiche est trouvé', LISTE_FICHE.length > 500 && /act === 'appel'/.test(LISTE_FICHE));
  const refus = introuvable();
  vrai('(population) le refus du service (404 « introuvable ») porte, par défaut, la phrase qui accuse une suppression', /supprimée/.test(refus.phrase()) && refus.dit === true);
  const X = bac({ ecouteurs: true });
  vrai('(population) le bac à sable exécute les fonctions et capture les écouteurs', typeof X.F.phraseSilence === 'function' && typeof X.ctx._doc === 'function' && typeof X.ctx['_info-corps'] === 'function');

  console.log('\n1. La fonction unique : « introuvable » dit la phrase neutre, tout autre refus garde la sienne');
  {
    const P = X.F.phraseSilence || (() => '(phraseSilence absente)');
    v('« introuvable » → la phrase neutre du geste', P(introuvable(), 'Neutre.'), 'Neutre.');
    v('…et sans phrase de repli donnée, la neutre sert aussi de repli', P(new TypeError('hors ligne'), 'Neutre.'), 'Neutre.');
    v('une erreur inconnue → le repli', P(new TypeError('hors ligne'), 'Neutre.', 'Repli.'), 'Repli.');
    const quota = new OPMSG.ErreurApi('quota_atteint', 429, 40, {});
    v('un refus dit par le service garde SA phrase (429)', P(quota, 'Neutre.', 'Repli.'), quota.phrase());
    v('aucune erreur (undefined) → le repli', P(undefined, 'Neutre.', 'Repli.'), 'Repli.');
  }

  console.log('\n2. « Appeler » / « Vidéo » vers quelqu\'un qui a bloqué (POST /api/appels → 404) : la phrase neutre, jamais la suppression');
  {
    const x = bac({ source: { demarrerAppel: async () => { throw introuvable(); } } });
    const ok = await x.F.lancerAppel({ membres: ['p_ben'], video: true }, null, true);
    v('l\'appel est refusé (rend faux)', ok, false);
    v('⛔ le mot dit « L\'appel n\'a pas pu être lancé. »', x.dit.mot, [NEUTRE_APPEL]);
    v('…et la feuille « Nouvel appel » (qui reste ouverte) la lit aussi', [x.dit.feuille, x.dit.info], [[NEUTRE_APPEL], [NEUTRE_APPEL]]);
    vrai('…sans « supprimée », « tu n\'y es plus », « bloqué » ni « Introuvable »', !accuse(x.dit.mot.concat(x.dit.feuille, x.dit.info).join(' ')));
    v('(le verrou de lancement est levé : on peut réessayer)', x.ctx.etat.appelDemarre, false);
    const occupe = new OPMSG.ErreurApi('occupe', 409, 0, {});
    const y = bac({ source: { demarrerAppel: async () => { throw occupe; } } });
    await y.F.lancerAppel({ membres: ['p_ben'] }, null, false);
    v('contre-épreuve : un AUTRE refus (« occupé ») garde SA phrase', y.dit.mot, [occupe.phrase()]);
    const z = bac({});
    v('contre-épreuve : un appel qui marche pousse la route et ne dit rien', [await z.F.lancerAppel({ membres: ['p_ben'] }, null, false), z.dit.mot], [true, []]);
    /* ENTRER dans une salle qui existe déjà : « introuvable » veut vraiment dire qu'elle n'existe plus, ou que je n'y suis plus — la phrase générale reste JUSTE */
    const w = bac({});
    await w.F.lancerAppel(null, null, false, async () => { throw introuvable(); });
    v('contre-épreuve : « introuvable » en ENTRANT dans une salle garde la phrase générale', w.dit.mot, [refus.phrase()]);
  }

  console.log('\n3. L\'envoi (texte, photo, vocal) : la même phrase, par la même fonction');
  {
    const x = bac({ source: { envoyer: async () => { throw introuvable(); } } });
    v('l\'envoi est refusé (rend faux) et dit « Ce message n\'a pas pu être remis. »', [await x.F.envoi({ texte: 'Ben ?' }), x.dit.avis], [false, ['Ce message n\'a pas pu être remis.']]);
    const y = bac({ source: { envoyer: async () => { throw new TypeError('hors ligne'); } } });
    await y.F.envoi({ texte: 'x' });
    v('une erreur inconnue garde la phrase générale d\'envoi', y.dit.avis, ['Le message n\'a pas pu être envoyé.']);
    const loc = new OPMSG.ErreurApi('interdit', 403, 0, {}); loc.dit = false;
    const z = bac({ source: { envoyer: async () => { throw loc; } } });
    await z.F.envoi({ texte: 'x' });
    v('un refus local non dit (« interdit ») garde sa phrase de l\'écran', z.dit.avis, ['Seuls les admins peuvent écrire dans ce groupe.']);
  }

  console.log('\n4. « Écrire » depuis une carte de contact partagée, et le clic d\'une carte (les vrais gestes de la page)');
  {
    const x = bac({ source: { ouvrirDirecte: async () => { throw introuvable(); }, ecrireCarte: async () => { throw introuvable(); } } });
    const a = clic('[data-fiche-ecrire]', { ficheEcrire: 'p_ben' });
    v('(le geste est reconnu)', x.F.gesteCarte(a), true);
    vrai('⛔ « Écrire » (carte) dit la phrase neutre', await att(() => x.dit.avis.length > 0));
    v('…« Cette conversation n\'a pas pu s\'ouvrir. », sans accusation', [x.dit.avis, accuse(x.dit.avis.join(' '))], [[NEUTRE_OUVRIR], false]);
    const y = bac({ source: { ecrireCarte: async () => { throw introuvable(); } } });
    const b = clic('[data-fiche-ecrire-carte]', { ficheEcrireCarte: 'm1' });
    v('(le geste de l\'invitation est reconnu)', y.F.gesteCarte(b), true);
    vrai('⛔ « Écrire » (carte d\'une invitation) dit la phrase neutre', await att(() => y.dit.avis.length > 0));
    v('…et rend son bouton', [y.dit.avis, accuse(y.dit.avis.join(' '))], [[NEUTRE_OUVRIR], false]);
    const quota = new OPMSG.ErreurApi('quota_atteint', 429, 40, {});
    const z = bac({ source: { ouvrirDirecte: async () => { throw quota; } } });
    z.F.gesteCarte(clic('[data-fiche-ecrire]', { ficheEcrire: 'p_ben' }));
    vrai('contre-épreuve : un AUTRE refus garde SA phrase', await att(() => z.dit.avis.length > 0) && z.dit.avis[0] === quota.phrase());
  }

  console.log('\n5. « Écrire » des feuilles Contacts / membres d\'un espace (l\'écouteur réel) et « Message » / « Appeler » de la fiche (l\'écouteur réel)');
  {
    const x = bac({ ecouteurs: true, source: { ouvrirDirecte: async () => { throw introuvable(); } } });
    const e = clic('[data-act]', { act: 'ecrire', uid: 'p_ben' });
    await x.ctx['_info-corps'](e);
    v('⛔ la feuille dit « Cette conversation n\'a pas pu s\'ouvrir. » (zone d\'erreur)', x.dit.info.filter(Boolean), [NEUTRE_OUVRIR]);
    vrai('…aucune conversation ouverte, aucune accusation', x.dit.conv.length === 0 && !accuse(x.dit.info.join(' ')));
    const ok = bac({ ecouteurs: true });
    await ok.ctx['_info-corps'](clic('[data-act]', { act: 'ecrire', uid: 'p_ben' }));
    v('contre-épreuve : « Écrire » qui marche ouvre la conversation et ne dit rien', [ok.dit.conv, ok.dit.info.filter(Boolean)], [['c_x'], []]);
    const quota = new OPMSG.ErreurApi('quota_atteint', 429, 40, {});
    const q = bac({ ecouteurs: true, source: { ouvrirDirecte: async () => { throw quota; } } });
    await q.ctx['_info-corps'](clic('[data-act]', { act: 'ecrire', uid: 'p_ben' }));
    v('contre-épreuve : un AUTRE refus garde SA phrase', q.dit.info.filter(Boolean), [quota.phrase()]);
    /* la fiche : « Message » (déjà gardé par test-2452) ET « Appeler » / « Vidéo » */
    const f = bac({ ecouteurs: true, source: { ouvrirDirecte: async () => { throw introuvable(); }, demarrerAppel: async () => { throw introuvable(); } } });
    await f.ctx._doc(clic('[data-fiche]', { fiche: 'ecrire', uid: 'p_ben' }));
    v('« Message » depuis la fiche : la phrase neutre', f.dit.mot, [NEUTRE_OUVRIR]);
    const g = bac({ ecouteurs: true, source: { demarrerAppel: async () => { throw introuvable(); } } });
    await g.ctx._doc(clic('[data-fiche]', { fiche: 'appel', uid: 'p_ben', video: '1' }));
    v('⛔ « Vidéo » depuis la fiche : « L\'appel n\'a pas pu être lancé. », sans accusation', [g.dit.mot, accuse(g.dit.mot.join(' '))], [[NEUTRE_APPEL], false]);
    const h = bac({ ecouteurs: true, source: { demarrerAppel: async () => { throw introuvable(); } } });
    await h.ctx._doc(clic('[data-fiche]', { fiche: 'appel', uid: 'p_ben', video: '0' }));
    v('⛔ « Appeler » depuis la fiche : la même phrase', h.dit.mot, [NEUTRE_APPEL]);
  }

  console.log('\n6. Les autres écritures dans une conversation : une seule fonction, relue dans le code (chaque site passe par `phraseSilence`)');
  {
    /* chaque site nommé par son action : le code (sans commentaires) de l'appel d'écriture et de son `catch` doit dire `phraseSilence(` — un site qui garde `phrase(` direct dit la phrase générale */
    const sites = [
      ['programmer un message', /source\.programmerMessage\([\s\S]{0,700}?catch \(er\) \{ avis\((phrase\w*)\(er, 'Le message n\\'a pas pu être programmé\.'/],
      ['créer un sondage', /source\.envoyerSondage\([\s\S]{0,500}?catch \(x\) \{[^}]*erreurInfo\((phrase\w*)\(x, 'Le sondage n\\'a pas pu partir\.'/],
      ['envoyer une position', /source\.envoyerPosition\([\s\S]{0,400}?erreurInfo\((phrase\w*)\(x, 'Ta position n\\'a pas pu partir\.'/],
      ['envoyer une fiche', /source\.envoyerFiche\([\s\S]{0,300}?erreurInfo\((phrase\w*)\(x, 'La fiche n\\'a pas pu partir\.'/],
      ['modifier un message', /source\.modifier\(id, ctx\.mid, t\)[\s\S]{0,200}?avis\((phrase\w*)\(e, 'La modification n\\'a pas pu être enregistrée\.'/],
      ['voter', /source\.sondageVoter\([\s\S]{0,120}?avis\((phrase\w*)\(er, 'Ton vote n\\'a pas pu partir\.'/],
      ['clore un sondage', /source\.sondageClore\([\s\S]{0,200}?avis\((phrase\w*)\(er, 'Le sondage n\\'a pas pu être clos\.'/],
      ['ajouter un choix', /source\.sondageAjouter\([\s\S]{0,250}?erreurInfo\((phrase\w*)\(x, 'Le choix n\\'a pas pu être ajouté\.'/],
      ['réagir (menu)', /source\.reagir\(id, mid, r\.dataset\.menuReac\)[\s\S]{0,200}?avis\((phrase\w*)\(er, 'La réaction n\\'a pas pu être enregistrée\.'/],
      ['réagir (pastille)', /source\.reagir\(etat\.conv, r\.dataset\.reagir[\s\S]{0,200}?avis\((phrase\w*)\(er, 'La réaction n\\'a pas pu être enregistrée\.'/],
      ['supprimer un message', /source\.supprimer\(id, mid[\s\S]{0,160}?avis\((phrase\w*)\(er, 'Le message n\\'a pas pu être supprimé\.'/],
      ['transférer', /source\.transferer\([\s\S]{0,400}?\b(phrase\w*)\(err, 'Le message n\\'a pas pu être transféré\.'/],
    ];
    for (const [nom, re] of sites) {
      const m = re.exec(JS);
      vrai('(population) le site « ' + nom + ' » est trouvé dans le code', !!m);
      v('⛔ « ' + nom + ' » passe par phraseSilence', m ? m[1] : null, 'phraseSilence');
    }
    /* et aucune seconde copie de la règle : le mot « introuvable » d'un refus de blocage n'est tranché qu'à UN endroit */
    const copies = (JS.match(/\.code === 'introuvable' \? '(Ce message n|Cette conversation n|L.appel n)/g) || []).length;
    v('⛔ la règle « introuvable → phrase neutre » n\'existe plus en copie : zéro copie locale', copies, 0);
  }

  fin();
})().catch(e => { console.error('✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
