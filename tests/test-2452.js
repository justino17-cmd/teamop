/* ══ test-2452 — BLOQUÉ SANS LE SAVOIR : LE BLOCAGE SE TAIT, SANS ACCUSER NI PROMETTRE (17 octobre 2026, lot « m11 » de la revue de A à Z : contacts#6, contacts@9, contacts@6) ═══════
   Un blocage est SILENCIEUX — voulu : la personne bloquée ne doit rien apprendre (jamais le mot « bloqué »). Mais ce que le service rend alors (404 « introuvable ») se disait mal :
     · sur la FICHE du contact, « EN COMMUN — Introuvable (la conversation a peut-être été supprimée ou tu n'y es plus). — Réessayer » : un bouton qui ne peut jamais marcher ;
     · à l'ENVOI, la même phrase, qui accuse une suppression qui n'a pas eu lieu et pousse à insister ;
     · et l'indicateur « En ligne » du bloqueur restait affiché chez le bloqué jusqu'au rechargement (rien ne lui disait que la présence s'était éteinte).
   Ce fichier garde :
     1. le SERVICE, en HTTP : bloquer prévient la personne bloquée — et le bloqueur — que la présence de l'autre est éteinte (événement `presence`, hors ligne), sans rien d'autre dans le message ;
        ⛔ ni le mot « bloqu » ni l'identité du bloqueur au-delà de ce que la présence disait déjà ; ⛔ un tiers ne reçoit rien ; la fiche et l'envoi refusent toujours (404 « introuvable ») ;
     2. le MODULE de données contre le service : l'indicateur « En ligne » du bloqueur s'efface chez le bloqué dès l'événement, sans relecture ;
     3. la PAGE (ses vraies fonctions) : l'envoi refusé en « introuvable » dit « Ce message n'a pas pu être remis. » (ni « supprimée », ni « tu n'y es plus »), et la fiche ne montre ni « En commun »
        ni « Réessayer » pour un « introuvable » — alors qu'une vraie panne (réseau, 503) garde son message et son bouton ; ⛔ la lecture n'est pas refaite en boucle.
   ⛔ Chaque absence est précédée de sa population. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
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
/* TEXTE_MAX (lot m09 : « trop long » nomme la limite dans MESSAGES_ERREUR) : la page le pose sur la ligne des constantes du vocal, depuis `CAP.texteMax` — dont la valeur par défaut vit dans l'objet CAP. On prend les DEUX dans la page réelle (la ligne exacte, et la valeur par défaut), jamais une valeur recopiée. */
const TEXTE_MAX_DECL = (/TEXTE_MAX = CAP\.texteMax;/.exec(ligne('const VOCAL_MIN_MS = ')) || [''])[0].replace(/^/, 'const ');
const TEXTE_MAX_DEFAUT = +((/\btexteMax: (\d+)/.exec(ligne('const CAP = ')) || [, '0'])[1]);
const M = {
  TEXTE_MAX: TEXTE_MAX_DECL, esc: ligne('const esc = '), phrase: ligne('const phrase = '), phraseSilence: ligne('const phraseSilence = '), MESSAGES_ERREUR: ligne('const MESSAGES_ERREUR = '), icone: ligne('const icone = '), CHEVRON: ligne('const CHEVRON = '), prenom: ligne('const prenom = '),
  sonStatutTxt: ligne('const sonStatutTxt = '), duCote: ligne('const duCote = '), coteReu: ligne('const coteReu = '), coteDe: ligne('const coteDe = '), modesActifs: ligne('const modesActifs = '),
  envoi: decl('async function envoi('), vcPersonne: decl('function vcPersonne('), ficheCommun: decl('function ficheCommun('), chargerCommun: decl('async function chargerCommun('), peindreCommun: decl('function peindreCommun('),
};
function bac(o) {
  const avis = [], peints = [];
  const ctx = {
    Math, JSON, Number, Array, Object, String, Date, Intl, RegExp, Map, Set, console, Promise,
    etat: { conv: 'c_ab', forcerBas: false, mode: 'perso', pro: false, conversations: [], vcEsp: null }, CAP: { reunions: true, espaces: true, texteMax: TEXTE_MAX_DEFAUT },
    CONTACTS: [{ id: 'p_ben', nom: 'Ben Durand', initiales: 'BD', avatar: 3 }],
    FMT_HEURE: new Intl.DateTimeFormat('fr-FR'), FMT_JOUR_FICHE: new Intl.DateTimeFormat('fr-FR'), FMT_MOIS_CAL: new Intl.DateTimeFormat('fr-FR'),
    commun: { cache: new Map(), enCours: new Map() }, avis: t => avis.push(t),
    source: { envoyer: o.envoyer || (async () => ({})), enCommun: o.enCommun || (async () => ({ reunions: [], groupes: [], espaces: [] })) },
    document: { querySelectorAll: () => [{ dataset: { communUid: 'p_ben' }, set innerHTML(h) { peints.push(h); }, get innerHTML() { return peints[peints.length - 1] || ''; } }] },
  };
  vm.createContext(ctx);
  vm.runInContext(Object.values(M).join('\n') + '\nthis.F = { envoi, ficheCommun, chargerCommun, peindreCommun };', ctx);
  return { F: ctx.F, avis, peints, ctx };
}
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);

(async () => {
  console.log('\n0. La population : les vraies fonctions sont trouvées dans la page');
  vrai('(population) TEXTE_MAX est posé depuis CAP.texteMax et la valeur par défaut est lue dans la page', /^const TEXTE_MAX = CAP\.texteMax;$/.test(TEXTE_MAX_DECL) && TEXTE_MAX_DEFAUT > 0);
  v('(population) chaque morceau est trouvé', Object.keys(M).filter(k => !M[k]), []);
  vrai('(population) le bac à sable les exécute', typeof bac({}).F.envoi === 'function' && typeof bac({}).F.chargerCommun === 'function');

  /* ═══ 3. LA PAGE ═══ */
  console.log('\n1. La page : un « introuvable » à l\'envoi ne dit ni suppression ni « tu n\'y es plus »');
  {
    const refus = new OPMSG.ErreurApi('introuvable', 404, 0, {});
    vrai('(population) le refus du service (404 « introuvable ») porte, par défaut, la phrase qui accuse une suppression', /supprimée/.test(refus.phrase()) && refus.dit === true);
    const x = bac({ envoyer: async () => { throw refus; } });
    const ok = await x.F.envoi({ texte: 'Ben ?' });
    v('l\'envoi est refusé (rend faux), le texte reste à la personne', ok, false);
    v('⛔ la phrase dite : « Ce message n\'a pas pu être remis. »', x.avis, ['Ce message n\'a pas pu être remis.']);
    vrai('…sans « supprimée », ni « tu n\'y es plus », ni « bloqu »', !/supprim|n.y es plus|bloqu/i.test(x.avis.join(' ')));
    const quota = new OPMSG.ErreurApi('quota_atteint', 429, 40, {});
    const y = bac({ envoyer: async () => { throw quota; } }); await y.F.envoi({ texte: 'x' });
    v('un AUTRE refus garde SA phrase (429 : « Trop de demandes… »)', y.avis, [quota.phrase()]);
    const z = bac({ envoyer: async () => { throw new TypeError('hors ligne'); } }); await z.F.envoi({ texte: 'x' });
    v('une erreur inconnue garde la phrase générale', z.avis, ['Le message n\'a pas pu être envoyé.']);
  }

  console.log('\n2. La page : la fiche ne montre ni « En commun » ni « Réessayer » pour un « introuvable »');
  {
    const ben = { id: 'p_ben', nom: 'Ben Durand', initiales: 'BD', avatar: 3 };
    let appels = 0;
    const x = bac({ enCommun: async () => { appels++; throw new OPMSG.ErreurApi('introuvable', 404, 0, {}); } });
    await x.F.chargerCommun('p_ben');
    vrai('(population) la lecture a été tentée et a échoué', appels === 1 && x.ctx.commun.cache.has('p_ben'));
    const h = x.F.ficheCommun(ben);
    v('⛔ la fiche ne montre RIEN pour « introuvable » (pas de rubrique « En commun », pas d\'erreur)', h, '');
    vrai('…ni bouton « Réessayer »', !/Réessayer|data-fiche="relire"/.test(h));
    await x.F.chargerCommun('p_ben');
    v('⛔ …et la lecture n\'est pas refaite en boucle (une minute de calme)', appels, 1);
    await x.F.chargerCommun('p_ben', true);
    v('…sauf si la personne la demande (force)', appels, 2);
    const p = bac({ enCommun: async () => { throw new OPMSG.ErreurApi('reseau', 0, 0, {}); } });
    await p.F.chargerCommun('p_ben');
    const hp = p.F.ficheCommun(ben);
    vrai('contre-épreuve : une vraie PANNE (réseau) garde son message et son bouton « Réessayer »', /En commun/.test(hp) && /data-fiche="relire"/.test(hp) && /role="alert"/.test(hp));
    const s = bac({ enCommun: async () => { throw new OPMSG.ErreurApi('service_indisponible', 503, 0, {}); } });
    await s.F.chargerCommun('p_ben');
    vrai('…de même pour un 503 du service', /data-fiche="relire"/.test(s.F.ficheCommun(ben)));
  }

  console.log('\n2 bis. « Message » depuis la fiche (le geste du document) : la phrase aussi (le geste lui-même est joué par tests/sonde-opmessages-contacts-volet.js)');
  {
    const i = JS.indexOf("if (act === 'ecrire') { const c = await source.ouvrirDirecte(uid);");
    const fin2 = i < 0 ? '' : JS.slice(i, JS.indexOf('function vcRendreFocus', i));
    vrai('(population) le gestionnaire des gestes de la fiche est trouvé', fin2.length > 200);
    vrai('⛔ un « introuvable » à l\'ouverture de la conversation dit « Cette conversation n\'a pas pu s\'ouvrir. » (pas la phrase qui accuse une suppression)', /act === 'ecrire' \? phraseSilence\(er, 'Cette conversation n\\'a pas pu s\\'ouvrir\.'/.test(fin2));      // (lot m11, relecture : la règle vit dans `phraseSilence` ; test-2453 §5 JOUE ce gestionnaire)
  }

  /* ═══ 1. LE SERVICE, 2. LE MODULE ═══ */
  console.log('\n3. Le service : bloquer éteint la présence de l\'autre — chez le bloqué, sans rien dire');
  const og = await T.fauxOpGestion({ ana: { pass: 'pw-ana-12345678', nom: 'Ana Martin', actif: true }, ben: { pass: 'pw-ben-12345678', nom: 'Ben Durand', actif: true }, cleo: { pass: 'pw-cleo-1234567', nom: 'Cléo Petit', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, config: { pulsationMs: 400, presenceGraceMs: 300 } });
  const ouverts = [], flux = [];
  try {
    const cA = await T.connecter(svc, og, 'ana', 'pw-ana-12345678'), cB = await T.connecter(svc, og, 'ben', 'pw-ben-12345678'), cC = await T.connecter(svc, og, 'cleo', 'pw-cleo-1234567');
    for (const c of [cB, cC]) { const k = await cA.post('/api/contacts/lien', { max: 1 }); await c.post('/api/liens/accepter', { code: k.j.code }); }
    { const k = await cB.post('/api/contacts/lien', { max: 1 }); await cC.post('/api/liens/accepter', { code: k.j.code }); }       // Cléo est AUSSI le contact de Ben : un événement de présence de Ben qui sortirait par erreur chez elle se verrait
    const nav = T.navigateur(svc.base);
    const monter = () => { const n = T.navigateur(svc.base); const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: n.fetch, EventSource: n.EventSource, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 }); const x = { src, async entrer(l, p) { await src.connexion(l, p); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); return src.moi(); } }; ouverts.push(x); return x; };
    const A = monter(), B = monter(), C = monter();
    const ma = await A.entrer('ana', 'pw-ana-12345678'), mb = await B.entrer('ben', 'pw-ben-12345678'); await C.entrer('cleo', 'pw-cleo-1234567');
    void nav; void ma;
    const evA = [], evB = [], evC = [];
    A.src.ecouter(e => evA.push(e)); B.src.ecouter(e => evB.push(e)); C.src.ecouter(e => evC.push(e));
    vrai('(population) Ana voit Ben EN LIGNE', await att(async () => { await A.src.rafraichirContacts(); const c = A.src.contacts().find(x => x.id === mb.id); return c && c.enLigne === true; }));
    const conv = (await cA.post('/api/conversations/directe', { uid: mb.id })).j.conversation.id;
    await cA.post('/api/conversations/' + conv + '/messages', { cid: 'c' + Date.now().toString(36) + 'bb', texte: 'Salut Ben' });          // une conversation vide ne se liste pas : elle a son premier message
    const fiche0 = await cA.get('/api/personnes/' + mb.id + '/commun');
    v('(population) avant le blocage, la fiche de Ben se lit (200)', fiche0.code, 200);
    await A.src.ouvrir(conv);
    vrai('(population) Ben voit Ana EN LIGNE, dans ses contacts ET sur la ligne de leur conversation', await att(async () => { await B.src.rafraichirContacts(); const c = B.src.contacts().find(x => x.id === ma.id), l = (await B.src.lister()).find(x => x.id === conv); return c && c.enLigne === true && l && l.enLigne === true; }));
    evA.length = 0; evB.length = 0; evC.length = 0;
    const r = await cB.post('/api/contacts/bloquer', { uid: ma.id });
    v('Ben bloque Ana', r.code, 200);
    vrai('⛔ Ana apprend, SANS recharger, que Ben n\'est plus visible : l\'indicateur « En ligne » s\'éteint (contacts@6)', await att(() => { const c = A.src.contacts().find(x => x.id === mb.id); return !c || c.enLigne === false; }));
    vrai('…par l\'événement `presence` du flux (le module l\'a reçu)', evA.some(e => e.type === 'presence' && e.id === mb.id));
    v('⛔ rien d\'autre n\'est dit à Ana : ni le mot « bloqu » dans ce qu\'elle reçoit', evA.filter(e => /bloqu/i.test(JSON.stringify(e))), []);
    /* la sentinelle : l'écouteur de Cléo VIT (Ana coupe puis rallume sa présence : Cléo, son contact, l'apprend) — sans elle, « Cléo ne reçoit rien » passerait sur un écouteur mort */
    await A.src.majConfidentialite({ presence: false }); await A.src.majConfidentialite({ presence: true });
    vrai('(population) l\'écouteur de Cléo reçoit bien les présences d\'Ana', await att(() => evC.some(e => e.type === 'presence' && e.id === ma.id)));
    v('⛔ un TIERS (Cléo) ne reçoit RIEN sur la présence de Ben à ce sujet', evC.filter(e => e.type === 'presence' && e.id === mb.id), []);
    const f1 = await cA.get('/api/personnes/' + mb.id + '/commun');
    v('la fiche et l\'envoi refusent toujours : 404 « introuvable » (le blocage reste silencieux)', [f1.code, f1.j && f1.j.error], [404, 'introuvable']);
    const e1 = await cA.post('/api/conversations/' + conv + '/messages', { cid: 'c' + Date.now().toString(36) + 'aa', texte: 'Ben ?' });
    v('…l\'envoi aussi', [e1.code, e1.j && e1.j.error], [404, 'introuvable']);
    vrai('⛔ et aucune de ces réponses ne dit « bloqué »', !/bloqu/i.test(JSON.stringify([f1.j, e1.j])));
    /* le bloqueur : Ben n'a plus la présence d'Ana non plus — sur la ligne de leur conversation, SANS relecture (l'événement) */
    vrai('⛔ Ben (le bloqueur) ne voit plus Ana en ligne non plus : la ligne de leur conversation s\'éteint, sans relecture', await att(async () => { const l = (await B.src.lister()).find(x => x.id === conv); return l && l.enLigne === false; }));
    vrai('…par l\'événement `presence` du flux', evB.some(e => e.type === 'presence' && e.id === ma.id));
    void flux;
  } finally {
    for (const x of ouverts) { try { x.src.arreter(); } catch (e) { /* déjà arrêté */ } }
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error('✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
