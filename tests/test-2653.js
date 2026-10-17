/* ══ OP MESSAGES — UNE FICHE DE CONTACT PARTAGÉE DIT LA MÊME PERSONNE, QUE LE GROUPE COMMUN SOIT OUVERT OU NON (lot p04 : medias n#6) ═══════════════════════════════
   Ana partage à Ben la fiche de Cléo. Ben et Cléo sont dans le même groupe, mais Ben vient de recharger la page et n'a pas ouvert ce groupe : le registre des personnes de la source ne connaît pas encore
   Cléo (il n'apprend les membres d'un groupe qu'à son ouverture). La fiche écrivait « CL / Cléo » (le prénom seul, tel que la fiche le porte), puis « CP / Cléo Petit » dès que le groupe avait été ouvert :
   la même personne, deux visages, selon l'ordre dans lequel Ben a ouvert ses conversations.
   La source lit donc la personne qu'elle ne connaît pas (`GET /api/personnes/:id`, que le service ne rend qu'à qui peut la voir : contact, conversation commune, espace commun), la note dans son registre
   et REDESSINE la conversation. Ce que ce fichier garde — le VRAI service, le VRAI `source-serveur.js`, la VRAIE `htmlCarteFiche` de la page :
     1. Ben (source neuve, groupe jamais ouvert) : la fiche de Cléo finit en « CP / Cléo Petit », sans qu'il ait rien ouvert d'autre — et c'est la même que celle qu'il lit une fois le groupe ouvert ;
     2. la source REDESSINE la conversation toute seule (un événement `conversation`), sans geste de Ben ;
     3. ⛔ une seule lecture par personne (pas de boucle : la page redessine souvent) ;
     4. ⛔ une personne que Ben ne peut PAS voir (aucun lien) reste au prénom seul : la source ne lit rien de plus que ce que le service accorde, et n'invente aucun nom ;
     5. une fiche rouverte ne relit rien de plus.
   ⛔ Une absence se prouve sur une population : Cléo et Eve sont lues par le service dans la fiche, et la population « Ben peut / ne peut pas voir » est établie par l'appel direct du service. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);
setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

/* ── les fonctions RÉELLES de la page ── */
const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
function faireFiche() {
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(`const CAP = { invitations: true };\nconst icone = () => '';\nconst avatar = a => '<av ' + a.initiales + '>';\n${ligne('const esc = ')}\n${ligne('const fichesDemandees = ')}\n${decl('function htmlCarteFiche(')}\nthis.f = htmlCarteFiche;`, ctx);
  return ctx.f;
}
const FICHE = faireFiche();
const texte = h => h.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

(async () => {
  console.log('\n0. La population');
  vrai('(population) la vraie `htmlCarteFiche` de la page est trouvée', typeof FICHE === 'function');
  const NOMS = { ana: 'Ana Martin', ben: 'Ben Durand', cleo: 'Cléo Petit', eve: 'Eve Blanc' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  const sources = [];
  const lectures = [];                                 // les URLs `/api/personnes/…` appelées par la source de Ben
  const ouvrirSource = async (login, espion) => {
    const nav = T.navigateur(svc.base);
    const f = espion ? (url, init) => { if (/\/api\/personnes\//.test(String(url))) lectures.push(String(url)); return nav.fetch(url, init); } : nav.fetch;
    const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5 });
    await src.connexion(login, MDP[login]); const d = await src.demarrer();
    if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d));
    sources.push(src); return src;
  };
  try {
    const P = {}; for (const l of Object.keys(NOMS)) P[l] = await T.connecter(svc, og, l, MDP[l]);
    const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); await y.post('/api/liens/accepter', { code: l.j.code }); };
    for (const k of ['ben', 'cleo', 'eve']) await relier(P.ana, P[k]);          // Ana connaît les trois ; Ben, Cléo et Eve ne se connaissent pas entre eux
    const G = (await P.ana.post('/api/conversations/groupe', { nom: 'Chantier Nord', membres: [P.ben.moi.id, P.cleo.moi.id] })).j.conversation.id;   // Ben et Cléo : un groupe commun
    const AB = (await P.ana.post('/api/conversations/directe', { uid: P.ben.moi.id })).j.conversation.id;                                           // Ana → Ben
    const rc = await P.ana.post('/api/conversations/' + AB + '/messages', { cid: 'cid-fiche-cleo', type: 'contact', uid: P.cleo.moi.id });
    const re = await P.ana.post('/api/conversations/' + AB + '/messages', { cid: 'cid-fiche-eve', type: 'contact', uid: P.eve.moi.id });
    if (rc.code !== 201 || re.code !== 201) throw new Error('les fiches ne sont pas parties (' + rc.code + ', ' + re.code + ')');
    const voitCleo = await P.ben.get('/api/personnes/' + P.cleo.moi.id), voitEve = await P.ben.get('/api/personnes/' + P.eve.moi.id);
    v('(population) le SERVICE accorde à Ben la lecture de Cléo (groupe commun) et la refuse pour Eve (aucun lien)', [voitCleo.code, voitEve.code], [200, 404]);

    /* ── Ben recharge la page : une source neuve, le groupe JAMAIS ouvert ── */
    const ben = await ouvrirSource('ben', true);
    let redessins = 0; const arret = ben.ecouter ? ben.ecouter(e => { if (e && e.type === 'conversation' && e.id === AB) redessins++; }) : null;
    const carteDe = async (k) => { const c = await ben.ouvrir(AB); const m = c.messages.find(x => x.carteContact && x.carteContact.uid === P[k].moi.id); return m ? { m, f: m.carteContact, t: texte(FICHE(m, 'recu')) } : null; };
    const premiere = await carteDe('cleo');
    vrai('(population) la fiche de Cléo est rendue à Ben, avec son prénom, avant toute lecture', !!premiere && premiere.f.prenom === 'Cléo');
    console.log('\n1. La fiche de Cléo finit au nom complet, sans que Ben ouvre le groupe');
    const resolue = await att(async () => { const c = await carteDe('cleo'); return c && c.f.initiales === 'CP' ? c : null; });
    vrai('⛔ la fiche de Cléo passe à « CP » toute seule (sans ouvrir le groupe commun)', !!resolue);
    v('⛔ …et elle dit « Cléo Petit », le nom complet', resolue && resolue.f.nom, 'Cléo Petit');
    v('…la page écrit le nom complet et les initiales de l\'avatar', resolue ? [/Cléo Petit/.test(resolue.t), /<av CP>/.test(FICHE(resolue.m, 'recu'))] : null, [true, true]);

    console.log('\n2. La conversation est redessinée sans geste de Ben');
    v('⛔ un événement « conversation » est parti après la lecture (la page se corrige seule)', redessins > 0, true);

    console.log('\n3. Elle est la même qu\'une fois le groupe ouvert');
    await ben.ouvrir(G);
    const apres = await carteDe('cleo');
    v('⛔ groupe ouvert : mêmes initiales et même nom que sans l\'avoir ouvert (« CP », « Cléo Petit »)', [apres.f.initiales, apres.f.nom, resolue ? resolue.f.initiales : null, resolue ? resolue.f.nom : null], ['CP', 'Cléo Petit', 'CP', 'Cléo Petit']);

    console.log('\n4. Une seule lecture par personne, et jamais plus que ce que le service accorde');
    for (let i = 0; i < 3; i++) await carteDe('cleo');
    v('⛔ une seule lecture de Cléo, malgré cinq dessins de la conversation (pas de boucle)', lectures.filter(u => u.endsWith('/' + P.cleo.moi.id)).length, 1);
    const eve = await att(async () => { const c = await carteDe('eve'); return c && lectures.some(u => u.endsWith('/' + P.eve.moi.id)) ? c : null; });
    vrai('(population) la source a bien tenté de lire Eve (le service a répondu « introuvable »)', !!eve);
    v('⛔ Eve, que Ben ne peut pas voir, reste au prénom seul : initiales « EV », aucun nom inventé', [eve.f.initiales, eve.f.nom], ['EV', null]);
    for (let i = 0; i < 3; i++) await carteDe('eve');
    v('⛔ une lecture refusée ne se retente pas à chaque dessin (une seule lecture d\'Eve)', lectures.filter(u => u.endsWith('/' + P.eve.moi.id)).length, 1);
    if (typeof arret === 'function') arret();
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    for (const s of sources) { try { if (s.arreter) s.arreter(); } catch (e) { /* déjà arrêté */ } }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
