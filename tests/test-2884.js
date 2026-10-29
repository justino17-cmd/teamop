/* ⛔ CE QUE CE FICHIER GARDE — LES RÉUNIONS DE L'ÉQUIPE : L'ORDONNANCEUR, LE DÉROULÉ, LA MÉMOIRE (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §7).
     Les VRAIS modules `agents.js`, `conversations.js`, `agent-equipe.js`, `agent-conversation.js` et `reunions.js`, montés ensemble sur un faux `app` (les routes sont capturées
     et appelées à la main) et une HORLOGE TENUE ; seul le cerveau est un faux, scripté, qui GARDE chaque requête reçue. Rien d'HTTP ici : `test-2885` joue le vrai serveur.
       · l'heure de PARIS par `Intl` : lundi 9 h = 07 h UTC l'été et 08 h UTC l'hiver (le dimanche 25 octobre 2026 on passe à l'heure d'hiver), vendredi 18 h = 16 h / 17 h UTC ;
         les valeurs attendues sont écrites en UTC À LA MAIN, jamais recalculées par la fonction qu'on éprouve ;
       · le créneau de rattrapage (lundi jusqu'à 12 h, vendredi jusqu'à 23 h, borne exclue) et JAMAIS DEUX FOIS : minute suivante, redémarrage, réunion coupée en route ;
       · un fichier d'état illisible : aucune réunion, et RIEN d'écrit par-dessus ;
       · seuls les agents ALLUMÉS participent ; aucun allumé = UNE ligne « Réunion annulée » ; la pause attend, sans consommer le créneau ;
       · le DÉROULÉ : Victor ouvre (faits du journal sous les yeux), le tour de table UN APRÈS L'AUTRE (jamais deux appels à la fois), Inès en dernier, la discussion bornée
         (cités seulement, deux tours par agent, douze prises de parole), Victor conclut (compte rendu jusqu'à 1 500 caractères), Justin est notifié par des NOMBRES ;
       · les FAITS sont des nombres du journal de la fenêtre (pas ceux d'avant, pas « mode », pas la réunion elle-même) — aucun détail ni adresse ne part chez Claude ;
       · les OUTILS fermés : objectifs (3 au plus, mesure exigée, adresses masquées), bilan (un objectif à soi, un statut de la liste), leçons (2 par bilan, 20 par agent, les plus
         récentes d'abord, sans doublon) ; chaque refus est écrit au journal ;
       · la MÉMOIRE entre dans les consignes de la messagerie ET de la conversation d'avant, et ne change aucune limite ; sans objectif ni leçon, rien n'est ajouté ;
       · les pannes : sans clé, la réunion est annulée UNE fois ; un agent qui ne peut pas parler est nommé, les autres continuent ; l'heure finie coupe la discussion. */
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 600) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 600)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2884-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();
const U = (a, m, j, h, mi) => Date.UTC(a, m - 1, j, h, mi || 0);   // un instant UTC, mois de 1 à 12

console.log('\n── 2884 · les réunions : l’heure de Paris, le déroulé, les leçons ──');
(async () => {
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
  const AC = require(path.join(RACINE, 'server', 'agent-conversation.js'));
  const REU = require(path.join(RACINE, 'server', 'reunions.js'));
  const REG = AG.AGENTS.map(a => a.id);
  const TOUR = REG.filter(id => id !== 'victor' && id !== 'ines');   // l'ordre du tour de table : le registre sans Victor ni Inès

  console.log('\n1. L’heure de Paris (pur) — valeurs écrites en UTC à la main');
  const P = REU.parisParties;
  v('lundi 19 octobre 07:00 UTC = 9 h à Paris (heure d’ÉTÉ, UTC+2)', [P(U(2026, 10, 19, 7)).heure, P(U(2026, 10, 19, 7)).jourSemaine, P(U(2026, 10, 19, 7)).date], [9, 1, '2026-10-19']);
  v('lundi 26 octobre 08:00 UTC = 9 h à Paris (heure d’HIVER, UTC+1) — le dimanche 25 on a changé', [P(U(2026, 10, 26, 8)).heure, P(U(2026, 10, 26, 8)).jourSemaine, P(U(2026, 10, 26, 8)).date], [9, 1, '2026-10-26']);
  v('⛔ lundi 26 octobre 07:00 UTC = 8 h à Paris : un « +2 » figé dirait 9 h', P(U(2026, 10, 26, 7)).heure, 8);
  v('la nuit du changement d’heure : 02 h 30 existe deux fois (00:30 UTC en été, 01:30 UTC en hiver)', [P(U(2026, 10, 25, 0, 30)).heure, P(U(2026, 10, 25, 1, 30)).heure, P(U(2026, 10, 25, 0, 30)).minute], [2, 2, 30]);
  v('minuit à Paris se lit 0, jamais 24', [P(U(2026, 10, 26, 23)).heure, P(U(2026, 10, 26, 23)).date], [0, '2026-10-27']);
  const T = REU.tsParis;
  v('tsParis : lundi 26 oct 9 h (hiver) = 08:00 UTC ; lundi 19 oct 9 h (été) = 07:00 UTC', [T(2026, 10, 26, 9, 0), T(2026, 10, 19, 9, 0)], [U(2026, 10, 26, 8), U(2026, 10, 19, 7)]);
  v('tsParis : vendredi 23 oct 18 h (été) = 16:00 UTC ; vendredi 30 oct 18 h (hiver) = 17:00 UTC', [T(2026, 10, 23, 18, 0), T(2026, 10, 30, 18, 0)], [U(2026, 10, 23, 16), U(2026, 10, 30, 17)]);
  v('⛔ la nuit du changement d’heure : dimanche 25 octobre 01 h 30 à Paris (encore l’été) = 23:30 UTC la veille — l’écart se lit à l’instant VISÉ, pas à l’instant nominal', T(2026, 10, 25, 1, 30), U(2026, 10, 24, 23, 30));
  v('…et au printemps : lundi 22 mars 2027 9 h (hiver) = 08:00 UTC, lundi 29 mars 2027 9 h (été) = 07:00 UTC', [T(2027, 3, 22, 9, 0), T(2027, 3, 29, 9, 0)], [U(2027, 3, 22, 8), U(2027, 3, 29, 7)]);
  const S = REU.semaineIso;
  v('semaine ISO : lundi 26 octobre 2026 = W44, dimanche 25 = W43', [S(2026, 10, 26), S(2026, 10, 25)], ['2026-W44', '2026-W43']);
  v('…jeudi 1er janvier 2026 = W01 ; 2026 a 53 semaines (31 décembre, 1er janvier 2027) ; lundi 4 janvier 2027 = W01', [S(2026, 1, 1), S(2026, 12, 31), S(2027, 1, 1), S(2027, 1, 4)], ['2026-W01', '2026-W53', '2026-W53', '2027-W01']);
  const D = REU.dueA;
  const due = ts => { const d = D(ts); return d && d.cle; };
  v('⛔ lundi d’été : 06:59 UTC non, 07:00 UTC oui (9 h) — rattrapage jusqu’à 11 h 59 (09:59 UTC), plus à 12 h (10:00 UTC)', [due(U(2026, 10, 19, 6, 59)), due(U(2026, 10, 19, 7)), due(U(2026, 10, 19, 9, 59)), due(U(2026, 10, 19, 10))], [null, 'objectifs:2026-10-19', 'objectifs:2026-10-19', null]);
  v('⛔ lundi d’hiver : 07:59 UTC non (8 h 59), 08:00 UTC oui, 10:59 UTC oui (11 h 59), 11:00 UTC non (12 h)', [due(U(2026, 10, 26, 7, 59)), due(U(2026, 10, 26, 8)), due(U(2026, 10, 26, 10, 59)), due(U(2026, 10, 26, 11))], [null, 'objectifs:2026-10-26', 'objectifs:2026-10-26', null]);
  v('⛔ vendredi d’été : 15:59 UTC non, 16:00 UTC oui (18 h), 20:59 UTC oui (22 h 59), 21:00 UTC non (23 h)', [due(U(2026, 10, 23, 15, 59)), due(U(2026, 10, 23, 16)), due(U(2026, 10, 23, 20, 59)), due(U(2026, 10, 23, 21))], [null, 'bilan:2026-10-23', 'bilan:2026-10-23', null]);
  v('⛔ vendredi d’hiver : 16:59 UTC non, 17:00 UTC oui (18 h), 21:59 UTC oui (22 h 59), 22:00 UTC non (23 h)', [due(U(2026, 10, 30, 16, 59)), due(U(2026, 10, 30, 17)), due(U(2026, 10, 30, 21, 59)), due(U(2026, 10, 30, 22))], [null, 'bilan:2026-10-30', 'bilan:2026-10-30', null]);
  v('aucune réunion les autres jours ni aux autres heures : mardi 9 h, lundi 18 h, vendredi 9 h, samedi 18 h, dimanche 9 h', [due(T(2026, 10, 20, 9, 0)), due(T(2026, 10, 19, 18, 0)), due(T(2026, 10, 23, 9, 0)), due(T(2026, 10, 24, 18, 0)), due(T(2026, 10, 25, 9, 0))], [null, null, null, null, null]);
  v('la fenêtre d’un lundi tardif tombe sur sa date de Paris (23 h 30 UTC la veille ne compte pas)', due(U(2026, 10, 18, 23, 30)), null);
  const N = REU.prochaineApres;
  v('le prochain créneau : après le lundi 9 h 30 → « vendredi 30 octobre, 18 h » ; juste après le vendredi 18 h → « lundi 2 novembre, 9 h » ; le dimanche → « lundi 26 octobre, 9 h »',
    [N(T(2026, 10, 26, 9, 30)).libelle, N(T(2026, 10, 30, 18, 0) + 1000).libelle, N(T(2026, 10, 25, 12, 0)).libelle], ['vendredi 30 octobre, 18 h', 'lundi 2 novembre, 9 h', 'lundi 26 octobre, 9 h']);
  v('…son type (objectifs le lundi, bilan le vendredi) et son instant', [N(T(2026, 10, 25, 12, 0)).type, N(T(2026, 10, 26, 9, 30)).type, N(T(2026, 10, 25, 12, 0)).ts], ['objectifs', 'bilan', U(2026, 10, 26, 8)]);
  v('⛔ le lundi 00 h de Paris : vendredi 30 octobre → 25 octobre 23:00 UTC ; mercredi 21 octobre (été) → 18 octobre 22:00 UTC', [REU.lundiMinuit(U(2026, 10, 30, 17)), REU.lundiMinuit(U(2026, 10, 21, 10))], [U(2026, 10, 25, 23), U(2026, 10, 18, 22)]);
  v('⛔ …et la semaine d’avant se recule en JOURS CIVILS : lundi 26 octobre − 1 semaine = lundi 19 octobre 00 h Paris (18 oct 22:00 UTC), pas 01 h', REU.lundiMinuit(U(2026, 10, 26, 8), 1), U(2026, 10, 18, 22));
  v('les deux créneaux : lundi 9 h (limite 12) et vendredi 18 h (limite 23)', [REU.CRENEAUX.objectifs, REU.CRENEAUX.bilan].map(c => [c.jour, c.heure, c.limite]), [[1, 9, 12], [5, 18, 23]]);

  /* ── le banc de montage : vrais modules, faux app, faux cerveau, horloge tenue ── */
  let n = 0;
  const rep = (texte, actions) => ({ ok: true, texte, actions: actions || [] });
  const outil = (nom, entree) => ({ id: 'tu_' + nom, nom, entree });
  const phase = t => { const u = t.messages[0].content; return /Tu ouvres la réunion/.test(u) ? 'ouverture' : /Clos la réunion/.test(u) ? 'conclusion' : /On t’a cité/.test(u) ? 'discussion' : 'tour'; };
  const faitsDe = system => JSON.parse((/ta seule source de chiffres\) : (\{.*\})/.exec(system) || [])[1] || 'null');
  let cpt = 0;
  async function monter(o) {
    o = o || {};
    const Dd = o.dossier || path.join(banc, 'm' + (n++)); fs.mkdirSync(Dd, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    const horloge = { t: o.depart || U(2026, 10, 19, 6, 50) };
    const pousses = [];
    const allumes = o.allumes || REG;
    if (!o.gardeEtat) { const modes = {}; for (const id of allumes) modes[id] = 'brouillon'; fs.writeFileSync(path.join(Dd, 'agents-etat.json'), JSON.stringify({ pause: { actif: !!o.pause, par: '', depuis: 0, motif: '' }, modes })); }
    for (const [f, x] of Object.entries(o.fichiers || {})) fs.writeFileSync(path.join(Dd, f), typeof x === 'string' ? x : JSON.stringify(x));
    const agents = AG(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge.t });
    const appels = []; let actifs = 0, maxActifs = 0, eq = null, reu = null;
    const conv = CV(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, agents, maintenant: () => horloge.t, pousseNotif: () => Promise.resolve(), surMessage: m => eq.surMessage(m) });
    const cerveau = {
      etatBudget: o.etatBudget || (() => ({ illisible: false, cle: true })),
      penser: async (id, system, messages, opts) => {
        /* le second appel qui ENREGISTRE des objectifs dits sans l'outil (examen du 26 octobre 2026 à 23 h 25) a son banc, test-3064 : ici il ne rend rien et ne compte pas */
        if (opts && opts.forcerOutil) return rep('');
        actifs++; maxActifs = Math.max(maxActifs, actifs);
        const trace = { id, system, messages: JSON.parse(JSON.stringify(messages)), opts, quand: horloge.t, fil: null, ecritPendant: conv.quiEcrit('reunions').map(x => x.id) }; trace.phase = phase(trace); appels.push(trace);
        try { await dormir(2); if (o.avance) horloge.t += o.avance; return o.script ? await o.script(trace, appels.length) : rep('Voici, numéro ' + (++cpt) + ', mon point.'); }
        finally { actifs--; }
      } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: {}, memoire: id => reu ? reu.memoire(id) : '' });
    const montage = () => REU(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, agents, conversations: conv, cerveau, pousseNotif: (t, c, u) => { pousses.push([t, c, u]); return Promise.resolve(); }, equipe: () => eq,
      faits: o.faits, maintenant: () => horloge.t });
    reu = montage();
    const fakeRes = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
    const post = async (chemin, corps) => { const r = fakeRes(); await routes.post[chemin]({ body: corps, tourUser: { nom: 'Justin' }, query: {} }, r); return r; };
    const get = async chemin => { const r = fakeRes(); await routes.get[chemin]({ params: {}, query: {}, tourUser: { nom: 'Justin' } }, r); return r; };
    const lire = f => { try { return JSON.parse(fs.readFileSync(path.join(Dd, f), 'utf8')); } catch (x) { return null; } };
    return { D: Dd, agents, conv, eq, appels, pousses, horloge, post, get, lire, routes, remonter: () => { reu = montage(); return reu; },
      reu: () => reu, maxActifs: () => maxActifs, messages: () => conv.lire('reunions', 50),
      tic: async (attendre) => { const r = reu.tic(); if (attendre !== false) await reu.attendre(); return r; },
      reunions: () => (lire('agents-reunions.json') || { reunions: [] }).reunions };
  }
  const aLaMain = (H, jour) => { H.horloge.t = jour; };

  console.log('\n2. L’ordonnanceur, sur une horloge tenue');
  {
    const H = await monter({ depart: U(2026, 10, 19, 6, 59, 30) });
    v('lundi 8 h 59 (été) : rien', [(await H.tic()).saute, H.appels.length, H.reunions().length], ['pas_l_heure', 0, 0]);
    H.horloge.t = U(2026, 10, 19, 7);
    const r = await H.tic();
    vrai('lundi 9 h (été) : la réunion « objectifs » est lancée', r.lancee && !r.annulee);
    const R = H.reunions();
    v('…une seule réunion inscrite, terminée, clé « objectifs:2026-10-19 », semaine 2026-W43, fin = 10 h (08:00 UTC)', [R.length, R[0].statut, R[0].cle, R[0].semaine, R[0].fin, R[0].manuelle], [1, 'terminee', 'objectifs:2026-10-19', '2026-W43', U(2026, 10, 19, 8), false]);
    const apres = H.appels.length;
    H.horloge.t = U(2026, 10, 19, 7, 1); const r2 = await H.tic();
    v('⛔ la minute suivante : déjà tenue, aucun appel de plus', [r2.saute, H.appels.length], ['deja', apres]);
    H.horloge.t = U(2026, 10, 19, 9, 30); const r3 = await H.tic();
    v('…ni au rattrapage de 11 h 30', [r3.saute, H.appels.length], ['deja', apres]);
    const H2r = H.remonter();
    const r4 = H2r.tic();
    v('⛔ un REDÉMARRAGE (nouveau module, même dossier) ne la rejoue pas', [r4.saute, H.appels.length, H.reunions().length], ['deja', apres, 1]);
    vrai('le fichier d’état est écrit par un temporaire puis renommé (aucun .tmp ne reste)', !fs.readdirSync(H.D).some(f => /reunions.*\.tmp$/.test(f)));
  }
  {
    const H = await monter({ depart: U(2026, 10, 26, 7, 30) });
    v('⛔ lundi 26 octobre, 7 h 30 UTC = 8 h 30 à Paris (hiver) : PAS de réunion — un décalage d’été la ferait partir à 9 h 30', [(await H.tic()).saute, H.appels.length], ['pas_l_heure', 0]);
    H.horloge.t = U(2026, 10, 26, 8); const r = await H.tic();
    v('…à 08:00 UTC (9 h à Paris) elle part', [!!r.lancee, H.reunions()[0].cle, H.reunions()[0].semaine, H.reunions()[0].fin], [true, 'objectifs:2026-10-26', '2026-W44', U(2026, 10, 26, 9)]);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 9, 30) });   // 11 h 30 à Paris : le serveur revient en retard
    const r = await H.tic();
    v('rattrapage : le serveur revient lundi à 11 h 30 → la réunion a lieu', [!!r.lancee, H.reunions()[0].statut], [true, 'terminee']);
    v('…et sa discussion garde au moins vingt minutes (fin = 11 h 50, pas 10 h déjà passée)', H.reunions()[0].fin, U(2026, 10, 19, 9, 50));
    const H2 = await monter({ depart: U(2026, 10, 19, 10) });   // 12 h à Paris
    v('lundi 12 h : trop tard, on ne rattrape plus', [(await H2.tic()).saute, H2.appels.length], ['pas_l_heure', 0]);
    const H3 = await monter({ depart: U(2026, 10, 23, 20, 30) });   // vendredi 22 h 30 à Paris
    const r3 = await H3.tic();
    v('vendredi 22 h 30 : le bilan est rattrapé', [!!r3.lancee, H3.reunions()[0].cle, H3.reunions()[0].type], [true, 'bilan:2026-10-23', 'bilan']);
    const H4 = await monter({ depart: U(2026, 10, 23, 21) });   // vendredi 23 h
    v('vendredi 23 h : plus', [(await H4.tic()).saute, H4.appels.length], ['pas_l_heure', 0]);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 5), fichiers: { 'agents-reunions.json': { reunions: [{ id: 'abc', type: 'objectifs', cle: 'objectifs:2026-10-19', semaine: '2026-W43', ts: U(2026, 10, 19, 7), fin: U(2026, 10, 19, 8), statut: 'en_cours', participants: ['victor'] }] } } });
    const R = H.reunions();
    v('⛔ une réunion que le redémarrage a coupée est marquée « interrompue » (l’état est réécrit)', R[0].statut, 'interrompue');
    v('…et elle NE SE REJOUE PAS seule (elle aurait doublé ce que les agents ont déjà dit)', [(await H.tic()).saute, H.appels.length], ['deja', 0]);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 5), fichiers: { 'agents-reunions.json': '{ceci n’est pas du json' } });
    const avant = fs.readFileSync(path.join(H.D, 'agents-reunions.json'), 'utf8');
    v('⛔ un fichier d’état ILLISIBLE : aucune réunion (sans mémoire de ce qui a eu lieu, on recommencerait chaque minute)', [(await H.tic()).saute, H.appels.length], ['illisible', 0]);
    const g = await H.get('/api/monitor/agents/reunions'), l = await H.post('/api/monitor/agents/reunions/lancer', { type: 'objectifs' });
    v('…la lecture et le lancement le DISENT (503), et rien ne s’écrit par-dessus', [g.code, l.code, fs.readFileSync(path.join(H.D, 'agents-reunions.json'), 'utf8') === avant, H.messages().length], [503, 503, true, 0]);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 5), fichiers: { 'agents-lecons.json': '[1,2' } });
    v('un fichier de leçons illisible bloque aussi les réunions (on ne produirait que des leçons perdues)', [(await H.tic()).saute, H.appels.length], ['illisible', 0]);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 5), allumes: [] });
    const r = await H.tic();
    v('⛔ aucun agent allumé : UNE ligne du système « Réunion annulée : aucun agent n’est allumé », aucun appel', [!!r.annulee, H.messages().map(m => [m.de, m.texte]), H.appels.length], [true, [['systeme', 'Réunion annulée : aucun agent n’est allumé']], 0]);
    H.horloge.t += 60000; const r2 = await H.tic();
    v('…la minute suivante ne la redit pas (rien n\'a changé : elle ne se réécrit pas non plus)', [r2.saute, H.messages().length, H.reunions()[0].statut], ['deja', 1, 'annulee']);
    const fichier = fs.readFileSync(path.join(H.D, 'agents-reunions.json'), 'utf8');
    for (let i = 0; i < 5; i++) { H.horloge.t += 60000; await H.tic(); }
    vrai('…cinq minutes de plus, toujours rien : ni ligne de plus, ni fichier réécrit', H.messages().length === 1 && fs.readFileSync(path.join(H.D, 'agents-reunions.json'), 'utf8') === fichier);
    /* ⛔ relecture C1-C3 : une réunion annulée AVANT son premier appel consommait le créneau du jour — Justin allumait les agents à 9 h 15 et rien ne se tenait ce lundi */
    for (const id of REG) await H.post('/api/monitor/agents/mode', { agent: id, mode: 'brouillon' });
    H.horloge.t += 10 * 60000;
    const r3 = await H.tic();
    v('⛔ Justin rallume les agents après l\'heure : la réunion SE TIENT (le rattrapage va jusqu\'à midi), le créneau n\'avait pas été consommé', [!!r3.lancee, r3.annulee, H.appels.length > 10], [true, false, true]);
    v('…une seule réunion inscrite pour ce créneau : l\'annulation d\'avant a cédé la place, et la nouvelle est terminée', [H.reunions().length, H.reunions()[0].statut, H.reunions()[0].cle, H.reunions()[0].reessai], [1, 'terminee', 'objectifs:2026-10-19', undefined]);
    v('…le fil dit l\'annulation UNE fois, puis la réunion ; et la minute d\'après, plus rien ne se rejoue', [H.messages().filter(m => /^Réunion annulée/.test(m.texte)).length, H.messages().filter(m => m.de === 'systeme').length > 1], [1, true]);
    const nA = H.appels.length; H.horloge.t += 60000; const r4 = await H.tic();
    v('⛔ elle ne se rejoue pas : « déjà », aucun appel de plus', [r4.saute, H.appels.length], ['deja', nA]);
  }
  {
    /* la clé absente : même règle (c'est le même empêchement, lu avant tout appel) */
    let cle = false;
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), etatBudget: () => ({ illisible: false, cle }) });
    await H.tic();
    v('sans clé à 9 h : annulée, zéro appel', [H.reunions()[0].statut, H.appels.length], ['annulee', 0]);
    cle = true; H.horloge.t += 20 * 60000;
    const r = await H.tic();
    v('⛔ la clé posée à 9 h 20 : la réunion se tient (un seul enregistrement, terminé)', [!!r.lancee, H.reunions().length, H.reunions()[0].statut], [true, 1, 'terminee']);
  }
  {
    /* Justin essaie la réunion à la main à 8 h 50 (rien d'allumé) : l'essai annulé ne tient pas lieu de la réunion planifiée */
    const H = await monter({ depart: U(2026, 10, 19, 6, 50), allumes: [] });
    const an = await H.post('/api/monitor/agents/reunions/lancer', { type: 'objectifs' });
    v('(population) l\'essai à la main de 8 h 50, sans agent allumé, est annulé', [an.code, an.corps.annulee], [200, true]);
    for (const id of REG) await H.post('/api/monitor/agents/mode', { agent: id, mode: 'brouillon' });
    H.horloge.t = U(2026, 10, 19, 7, 5);
    const r = await H.tic();
    v('⛔ à 9 h 05 les agents sont allumés : la réunion PLANIFIÉE se tient quand même', [!!r.lancee, H.reunions().filter(x => x.statut === 'terminee').length], [true, 1]);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 5), pause: true });
    v('⛔ les agents en PAUSE : la réunion attend — rien d’inscrit, rien de dit', [(await H.tic()).saute, H.reunions().length, H.messages().length], ['pause', 0, 0]);
    await H.post('/api/monitor/agents/pause', { pause: false });
    H.horloge.t += 60000; const r = await H.tic();
    v('…à la reprise (même matin) elle a lieu', [!!r.lancee, H.reunions()[0].statut], [true, 'terminee']);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 5), allumes: ['camille', 'hugo'] });
    await H.tic();
    v('seuls les agents ALLUMÉS participent, dans l’ordre du tour de table', [H.reunions()[0].participants, H.appels.map(a => a.id)], [['camille', 'hugo'], ['camille', 'hugo']]);
    vrai('…Victor n’est pas là : une ligne le dit, pas de compte rendu', H.messages().some(m => m.de === 'systeme' && /Victor n’est pas allumé/.test(m.texte)) && !H.reunions()[0].compteRendu);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 5) });
    await H.tic();
    const R = H.reunions()[0];
    const H2 = await monter({ depart: U(2026, 10, 19, 8), dossier: H.D, gardeEtat: true });
    v('⛔ UN LANCEMENT À LA MAIN le jour même, c’est la réunion du jour : si elle a déjà eu lieu, il prend une clé « manuelle » (Justin insiste, on obéit)', [(await H2.post('/api/monitor/agents/reunions/lancer', { type: 'objectifs' })).code], [200]);
    await H2.reu().attendre();
    vrai('…et la réunion du jour reste inscrite une seule fois', H2.reunions().filter(r => r.cle === R.cle).length === 1 && H2.reunions().some(r => /^manuelle:/.test(r.cle) && r.manuelle === true));
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 6, 30) });
    const r = await H.post('/api/monitor/agents/reunions/lancer', { type: 'objectifs' }); await H.reu().attendre();
    v('lancée à la main le lundi à 8 h 30 (avant l’heure) : elle tient lieu de la réunion de 9 h', [r.code, H.reunions()[0].cle], [200, 'objectifs:2026-10-19']);
    H.horloge.t = U(2026, 10, 19, 7, 5);
    v('⛔ …donc 9 h 05 ne la rejoue pas', [(await H.tic()).saute, H.reunions().length], ['deja', 1]);
    const B = await monter({ depart: U(2026, 10, 20, 9) });   // un mardi
    await B.post('/api/monitor/agents/reunions/lancer', { type: 'bilan' }); await B.reu().attendre();
    v('lancée un mardi : clé « manuelle:… » (elle ne consomme pas le vendredi)', [/^manuelle:[0-9a-f]{12}$/.test(B.reunions()[0].cle), B.reunions()[0].semaine], [true, '2026-W43']);
    const W = await monter({ depart: U(2026, 10, 24, 9) });   // un samedi
    await W.post('/api/monitor/agents/reunions/lancer', { type: 'objectifs' }); await W.reu().attendre();
    v('les objectifs lancés un samedi sont ceux de la semaine QUI VIENT (W44)', W.reunions()[0].semaine, '2026-W44');
  }

  console.log('\n3. Le déroulé : une réponse après l’autre, Victor ouvre et conclut, Inès en dernier');
  {
    const incidentsArgs = [];
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), faits: { incidents: (d, f) => { incidentsArgs.push([d, f]); return { ouverts: 2, corriges: 1, aTraiter: 3 }; } } });
    /* le journal : des faits de la fenêtre (lundi 12 octobre 00 h Paris → maintenant), de la veille de la fenêtre, un détail et une adresse qui ne doivent pas partir */
    H.horloge.t = U(2026, 10, 14, 12);
    for (let i = 0; i < 3; i++) H.agents.noter('lea', 'relire un dossier', { cible: 'DOS-000001', resultat: 'ok' });
    H.agents.noter('margaux', 'lire une facture', { cible: 'client@exemple.fr', resultat: 'erreur', detail: 'SECRET-DETAIL-2884 client@exemple.fr' });
    H.agents.noter('hugo', 'proposer', { cible: 'creer_espace', resultat: 'propose', detail: 'espace secret-2884' }); H.agents.noter('hugo', 'proposer', { cible: 'creer_espace', resultat: 'propose' });
    H.agents.noter('camille', 'mail envoyé', { cible: 'x', resultat: 'ok' }); H.agents.noter('camille', 'mail envoyé', { cible: 'x', resultat: 'ok' });
    H.agents.noter('lea', 'mode', { detail: 'arret → brouillon' }); H.agents.noter('lea', 'réunion : leçon', { cible: '2026-W42', resultat: 'ok' });
    H.horloge.t = U(2026, 10, 10, 12); for (let i = 0; i < 5; i++) H.agents.noter('lea', 'trop ancien', { resultat: 'ok' });
    H.horloge.t = U(2026, 10, 19, 7);
    await H.tic();
    const ids = H.appels.map(a => a.id), ph = H.appels.map(a => a.phase);
    v('⛔ l’ordre : Victor ouvre, le tour de table dans l’ordre du registre, Inès en dernier, Victor conclut', ids, ['victor'].concat(TOUR, ['ines', 'victor']));
    v('…les phases : ouverture, quatorze tours puis Inès, conclusion (personne n’a été cité, donc pas de discussion)', ph, ['ouverture'].concat(TOUR.map(() => 'tour'), ['tour', 'conclusion']));
    v('⛔ JAMAIS deux appels à la fois (une réponse après l’autre)', H.maxActifs(), 1);
    vrai('…et « X écrit… » est posé pendant chaque réflexion, pour le seul agent qui parle', H.appels.every(a => a.ecritPendant.length === 1 && a.ecritPendant[0] === a.id));
    v('…puis retiré : plus personne n’écrit à la fin', H.conv.quiEcrit('reunions'), []);
    const ms = H.messages();
    v('le fil : une ligne du système d’ouverture, puis dix-sept messages d’agents (Victor, quatorze, Inès, la conclusion de Victor)', [ms[0].de, ms.filter(m => m.de !== 'systeme').length, ms[ms.length - 1].de], ['systeme', 17, 'victor']);
    v('la ligne d’ouverture dit la réunion, la semaine, le nombre de présents et l’heure de fin (10 h, heure de Paris)', ms[0].texte, 'Réunion du lundi — objectifs de la semaine (2026-W43). 16 agents présents, jusqu’à 10 h.');
    const f = faitsDe(H.appels[0].system);
    v('⛔ les FAITS du journal : la fenêtre (lundi 12 octobre 00 h → maintenant), ni « mode », ni la réunion, ni l’ancien', [f.semaine, f.depuis, f.journalLisible, f.parAgent.lea, f.parAgent.margaux, f.parAgent.hugo, f.parAgent.camille],
      ['2026-W43', 'lundi 12 octobre, 0 h', true, { ok: 3, erreur: 0, refuse: 0, proposees: 0, mails: 0, tachesEnCours: 0 }, { ok: 0, erreur: 1, refuse: 0, proposees: 0, mails: 0, tachesEnCours: 0 },
        { ok: 0, erreur: 0, refuse: 0, proposees: 2, mails: 0, tachesEnCours: 0 }, { ok: 2, erreur: 0, refuse: 0, proposees: 0, mails: 2, tachesEnCours: 0 }]);
    v('…le total, les validations et les incidents (nombres, de la fenêtre demandée à l’appelant)', [f.total, f.validationsEnAttente, f.tachesEnAttente, f.incidents], [{ actions: 8, erreurs: 1, refus: 0 }, 0, 0, { ouverts: 2, corriges: 1, aTraiter: 3 }]);
    v('…l’appelant des incidents reçoit la fenêtre : lundi 12 octobre 00 h Paris (11 oct 22:00 UTC) jusqu’à l’ouverture', [incidentsArgs[0][0], incidentsArgs[0][1]], [U(2026, 10, 11, 22), U(2026, 10, 19, 7)]);
    const tout = H.appels.map(a => a.system + JSON.stringify(a.messages)).join('\n');
    vrai('⛔ aucun détail du journal, aucune adresse, aucun nom d’espace ne part chez Claude', !/SECRET-DETAIL-2884|exemple\.fr|secret-2884|DOS-000001/.test(tout));
    v('le prompt de réunion : la semaine, les participants, les seuls outils (fixer_objectifs), pas ceux de la messagerie', [/semaine 2026-W43/.test(H.appels[1].system), /Participants : Victor \(Chef d’orchestre\)/.test(H.appels[1].system), H.appels[1].opts.outils.map(o => o.name), /tes seuls outils sont fixer_objectifs : les autres outils de la messagerie ne sont pas disponibles/.test(H.appels[1].system)], [true, true, ['fixer_objectifs'], true]);
    vrai('…la réflexion est demandée, et le tour de table voit le fil depuis l’ouverture (le message de Victor y est)', H.appels.slice(1, 4).every(a => a.opts.reflechir === true) && /\[Victor\] Voici, numéro /.test(H.appels[2].messages[0].content));
    vrai('…un tour donne la parole sans citer d’office : « Ne cite personne » à l’ouverture comme à la conclusion', /Ne cite personne avec @/.test(H.appels[0].messages[0].content) && /Ne cite personne avec @/.test(H.appels[16].messages[0].content));
    vrai('…Inès a en plus la consigne de la qualité', /donnes aussi la qualité/.test(H.appels[15].messages[0].content) && !/donnes aussi la qualité/.test(H.appels[14].messages[0].content));
    v('⛔ la notification de Justin : le titre dit la réunion, le corps des NOMBRES (zéro objectif ici : personne n’a appelé l’outil)', H.pousses, [['Réunion du lundi terminée', '0 objectifs fixés par 0 agent. Compte rendu dans la Messagerie, « Réunions ».', '/tour.html#agents']]);
    vrai('…et la ligne « Sans objectif enregistré » nomme ceux qui ont parlé sans en fixer', H.messages().some(m => m.de === 'systeme' && /^Sans objectif enregistré : Camille, Hugo, Margaux, Léa, /.test(m.texte) && !/Victor/.test(m.texte)));
    v('la réunion est « terminee », avec ses seize participants, son compte rendu et l’heure réelle de fin', [H.reunions()[0].statut, H.reunions()[0].participants.length, typeof H.reunions()[0].compteRendu, H.reunions()[0].finReelle > 0], ['terminee', 16, 'string', true]);
  }

  console.log('\n4. La discussion : ceux qu’on a cités répondent, bornée');
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), script: (t) => {
      if (t.phase === 'tour' && t.id === 'lea') return rep('Je regarde les inscriptions. @camille et @hugo, qu’en pensez-vous ?');
      if (t.phase === 'discussion' && t.id === 'camille') return rep('RAS');
      if (t.phase === 'discussion' && t.id === 'hugo') return rep('Côté paiements, rien à signaler, mais @lea, tu confirmes le délai ?');
      if (t.phase === 'discussion' && t.id === 'lea') return rep('Oui, confirmé.');
      return rep('Mon point ' + (++cpt) + '.');
    } });
    await H.tic();
    const d = H.appels.filter(a => a.phase === 'discussion');
    v('⛔ Léa cite Camille et Hugo : ils parlent après le tour de table, dans l’ordre cité ; Hugo cite Léa : elle reprend la parole', d.map(a => a.id), ['camille', 'hugo', 'lea']);
    vrai('…la discussion est annoncée au citeur (« On t’a cité », « RAS » permis)', /On t’a cité dans la discussion/.test(d[0].messages[0].content) && /RAS/.test(d[0].messages[0].content));
    const ms = H.messages().filter(m => m.de !== 'systeme');
    vrai('⛔ « RAS » n’est PAS publié', !ms.some(m => m.de === 'camille' && /RAS/.test(m.texte)) && ms.filter(m => m.de === 'camille').length === 1);
    v('…mais Hugo et Léa ont répondu dans le fil, avant la conclusion de Victor', [ms.filter(m => m.de === 'hugo').length, ms.filter(m => m.de === 'lea').length, ms[ms.length - 1].de], [2, 2, 'victor']);
    vrai('les mentions sont lues par le serveur et gardées sur le message', H.conv.lire('reunions', 50).find(m => m.de === 'lea').mentions.join() === 'camille,hugo');
    vrai('⛔ une @mention dans la réunion ne RÉVEILLE PERSONNE par la messagerie (aucun appel avec les outils de la messagerie) : le déroulé donne la parole lui-même', H.appels.every(a => a.opts.outils.every(o => ['fixer_objectifs', 'juger_objectif', 'ajouter_lecon'].includes(o.name))) && H.appels.length === 1 + 14 + 1 + 3 + 1);
  }
  {
    /* tout le monde cite tout le monde, toujours : quinze cités d'emblée, la discussion s'arrête à douze prises de parole */
    const TOUS = TOUR.concat(['ines']).map(id => '@' + id).join(' ');
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), script: (t) => rep('Point ' + (++cpt) + ' : ' + TOUS + ', vos avis ?') });
    await H.tic();
    const d = H.appels.filter(a => a.phase === 'discussion');
    v('⛔ une discussion qui s’emballe s’arrête à ' + REU.DISCUSSION_MAX + ' prises de parole EXACTEMENT (quinze cités, douze répondent)', d.length, REU.DISCUSSION_MAX);
    vrai('…et la réunion se termine quand même par la conclusion de Victor', H.reunions()[0].statut === 'terminee' && H.appels[H.appels.length - 1].phase === 'conclusion');
    vrai('…sans dépasser le plafond du fil des réunions (45 messages d’agents par heure)', H.messages().filter(m => m.de !== 'systeme').length <= 45);
  }
  {
    /* deux agents qui se renvoient la balle : chacun reprend la parole deux fois au plus */
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), script: (t) => rep('Point ' + (++cpt) + (t.id === 'lea' ? ' : @camille, et toi ?' : t.id === 'camille' ? ' : @lea, et toi ?' : '.')) });
    await H.tic();
    const d = H.appels.filter(a => a.phase === 'discussion'), par = {}; d.forEach(a => { par[a.id] = (par[a.id] || 0) + 1; });
    v('⛔ Léa et Camille se renvoient la balle : deux tours chacune, quatre prises de parole, pas une de plus', [par.lea, par.camille, Object.keys(par).length, d.length], [2, 2, 2, 4]);
  }
  {
    /* l'heure : chaque appel coûte 25 minutes d'horloge — la réunion de 9 h ne va pas au bout de son tour de table */
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), avance: 25 * 60000, script: (t) => rep('Mon point ' + (++cpt) + '. @lea ?') });
    await H.tic();
    const pm = H.appels.length;
    vrai('⛔ l’HEURE FINIE coupe le tour de table : tous les agents n’ont pas parlé, il n’y a pas de discussion', pm < 17 && !H.appels.some(a => a.phase === 'discussion'));
    v('…Victor conclut quand même, et la ligne des absents nomme « l’heure de la réunion était finie »', [H.appels[pm - 1].phase, H.messages().some(m => m.de === 'systeme' && /N’ont pas pu parler : .*l’heure de la réunion était finie/.test(m.texte)), H.reunions()[0].statut], ['conclusion', true, 'terminee']);
  }
  {
    /* le compte rendu peut dépasser 600 caractères (1 500 au plus) ; une prise de parole, non */
    const long = ('Décision prise ' + 'x'.repeat(90) + '. ').repeat(20);
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), script: (t) => rep(t.phase === 'conclusion' || t.phase === 'tour' && t.id === 'lea' ? long : 'Point ' + (++cpt) + '.') });
    await H.tic();
    const ms = H.messages().filter(m => m.de !== 'systeme');
    const cr = ms[ms.length - 1], lea = ms.find(m => m.de === 'lea');
    vrai('⛔ le compte rendu de Victor dépasse 600 caractères (1 500 au plus), coupé à une fin de phrase', cr.texte.length > 600 && cr.texte.length <= 1500 && /\.$/.test(cr.texte));
    vrai('…le même texte dans la bouche d’un autre agent reste coupé à 600', lea.texte.length <= 600 && lea.texte.length > 400);
    v('…et le compte rendu est gardé avec la réunion', H.reunions()[0].compteRendu, cr.texte);
  }

  console.log('\n5. Les outils fermés : objectifs, bilan, leçons');
  let Hsuite;
  {
    const lecons = []; for (let i = 0; i < 20; i++) lecons.push({ id: 'aaaaaa' + String(10 + i), texte: 'Ancienne leçon numéro ' + i, ts: U(2026, 9, 1 + (i % 20)), semaine: '2026-W36' });
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), fichiers: { 'agents-lecons.json': { lea: lecons } }, script: (t) => {
      if (t.id === 'victor' && t.phase === 'conclusion') return rep('Compte rendu : tout est dit.', [outil('fixer_objectifs', { objectifs: [{ texte: 'Tenir la réunion du vendredi à l’heure', mesure: 'Compte rendu publié avant 19 h' }] })]);
      if (t.phase !== 'tour') return rep('Point ' + (++cpt) + '.');
      if (t.id === 'lea') return rep('Mes objectifs pour la semaine.', [outil('fixer_objectifs', { objectifs: [
        { texte: 'Répondre à chaque inscription sous 24 h', mesure: 'Zéro inscription sans réponse au vendredi' },
        { texte: 'Écrire à contact@client-secret.fr', mesure: 'appeler le 06 12 34 56 78' },
        { texte: 'Trois exemples de mails validés par Justin', mesure: 'Trois mails validés' },
        { texte: 'Quatrième objectif en trop', mesure: 'ne doit pas passer' }] })]);
      if (t.id === 'camille') return rep('Je note.', [outil('fixer_objectifs', { objectifs: [{ texte: 'ok', mesure: 'x' }, { texte: 12, mesure: null }, 'pas un objet'] })]);
      if (t.id === 'chloe') return rep('Deux appels.', [outil('fixer_objectifs', { objectifs: [{ texte: 'Un objectif {injecté} valable', mesure: 'Un chiffre au vendredi' }] }), outil('fixer_objectifs', { objectifs: [{ texte: 'Le second remplace le premier', mesure: 'Mesure du second' }] })]);
      if (t.id === 'hugo') return rep('Je lis.', [outil('juger_objectif', { objectif: 'x', statut: 'atteint', pourquoi: 'y' }), outil('ajouter_lecon', { texte: 'Une leçon un lundi, hors bilan' })]);
      if (t.id === 'max') return rep('Rien à fixer.', [outil('fixer_objectifs', {})]);
      return rep('Mon point ' + (++cpt) + '.');
    } });
    await H.tic();
    const O = H.lire('agents-objectifs.json');
    vrai('⛔ Victor n’a pas de tour de table : ses PROPRES objectifs se fixent en concluant (la consigne le dit, l’outil les range)', /Enregistre aussi TES objectifs de la semaine/.test(H.appels[H.appels.length - 1].messages[0].content) && (O['2026-W43'].victor || []).map(o => o.texte).join() === 'Tenir la réunion du vendredi à l’heure');
    v('⛔ trois objectifs au plus : le quatrième est écarté ; la semaine est « 2026-W43 »', [Object.keys(O), O['2026-W43'].lea.length, O['2026-W43'].lea.map(o => o.texte)], [['2026-W43'], 3, ['Répondre à chaque inscription sous 24 h', 'Écrire à (adresse)', 'Trois exemples de mails validés par Justin']]);
    v('⛔ adresse ET numéro masqués dans l’objectif et sa mesure', [O['2026-W43'].lea[1].mesure, /client-secret/.test(JSON.stringify(O))], ['appeler le (numéro)', false]);
    vrai('chaque objectif porte un identifiant « o… » et son heure', O['2026-W43'].lea.every(o => /^o[0-9a-f]{6}$/.test(o.id) && o.ts > 0 && o.bilan === undefined));
    v('⛔ des objectifs trop courts ou mal formés : refusés, rien d’enregistré, une ligne « refuse » au journal', [O['2026-W43'].camille, O['2026-W43'].max, H.agents.lireJournal().filter(e => e.agent === 'camille' && e.action === 'réunion : objectifs refusés').map(e => [e.resultat, e.detail])], [undefined, undefined, [['refuse', 'objectifs']]]);
    v('un second appel dans le même tour REMPLACE le premier (accolades retirées du texte)', O['2026-W43'].chloe.map(o => o.texte), ['Le second remplace le premier']);
    v('⛔ « juger_objectif » et « ajouter_lecon » ne sont PAS des outils du lundi : refusés (et même l’API ne les propose pas)', [H.appels.find(a => a.id === 'hugo').opts.outils.map(o => o.name), H.lire('agents-lecons.json').hugo, H.agents.lireJournal().filter(e => e.agent === 'hugo' && /^réunion/.test(e.action)).map(e => [e.action, e.resultat, e.detail])],
      [['fixer_objectifs'], undefined, [['réunion : outil refusé', 'refuse', 'outil_inconnu'], ['réunion : outil refusé', 'refuse', 'outil_inconnu']]]);
    v('le journal garde « objectifs fixés » pour Léa (nombre seulement, pas le texte)', H.agents.lireJournal().filter(e => e.agent === 'lea' && e.action === 'réunion : objectifs fixés').map(e => [e.resultat, e.detail]), [['ok', '3 objectif(s)']]);
    v('⛔ la notification compte les objectifs fixés — Léa 3, Chloé 1, Victor 1 (nombres seulement)', H.pousses[0][1], '5 objectifs fixés par 3 agents. Compte rendu dans la Messagerie, « Réunions ».');
    Hsuite = H;
  }
  {
    /* le vendredi suivant, sur le MÊME dossier : Léa juge ses objectifs, ajoute des leçons ; son plafond est de 20 */
    const H = Hsuite;
    const H2 = await monter({ depart: U(2026, 10, 23, 16, 0), dossier: H.D, gardeEtat: true, script: (t) => {
      if (t.phase !== 'tour') return rep('Point ' + (++cpt) + '.');
      const ids = [...t.system.matchAll(/^\[(o[0-9a-f]{6})\] /gm)].map(m => m[1]);
      if (t.id === 'lea') return rep('Bilan de Léa.', [outil('juger_objectif', { objectif: ids[0], statut: 'atteint', pourquoi: 'Toutes les inscriptions ont reçu une réponse (faits).' }),
        outil('juger_objectif', { objectif: ids[1], statut: 'partiel', pourquoi: 'Écrit à adresse@secret-2884.fr deux fois sur trois.' }),
        outil('juger_objectif', { objectif: ids[2], statut: 'excellent', pourquoi: 'statut hors liste' }),
        outil('juger_objectif', { objectif: 'o000000', statut: 'non', pourquoi: 'un objectif qui n’existe pas' }),
        outil('ajouter_lecon', { texte: 'Toujours répondre à une inscription le jour même.' })]);
      if (t.id === 'chloe') return rep('Mon bilan.', [outil('juger_objectif', { objectif: ids[0], statut: 'non', pourquoi: 'Le devis de référence est arrivé trop tard.' }),
        outil('ajouter_lecon', { texte: 'Première leçon de Chloé, assez longue.' }), outil('ajouter_lecon', { texte: 'PREMIÈRE leçon de Chloé, assez longue.' }), outil('ajouter_lecon', { texte: 'Deuxième leçon de Chloé, assez longue.' }),
        outil('ajouter_lecon', { texte: 'Troisième leçon de Chloé, refusée.' })]);
      if (t.id === 'margaux') return rep('RAS côté compta.', [outil('ajouter_lecon', { texte: 'court' }), outil('ajouter_lecon', {})]);
      return rep('Mon point ' + (++cpt) + '.');
    } });
    await H2.tic();
    const R = H2.reunions().slice(-1)[0];
    v('le vendredi 23 octobre 18 h : un bilan, même semaine W43, clé « bilan:2026-10-23 »', [R.type, R.cle, R.semaine, R.statut], ['bilan', 'bilan:2026-10-23', '2026-W43', 'terminee']);
    const lea = H2.appels.find(a => a.id === 'lea'), ch = H2.appels.find(a => a.id === 'chloe');
    vrai('⛔ l’agent voit SES objectifs avec leur identifiant, à juger un par un ; les autres agents ne voient pas les siens', /Tes objectifs de la semaine, à juger un par un :\n\[o[0-9a-f]{6}\] Répondre à chaque inscription/.test(lea.system) && !/Répondre à chaque inscription/.test(ch.system));
    v('…les outils du vendredi : juger_objectif et ajouter_lecon', lea.opts.outils.map(o => o.name), ['juger_objectif', 'ajouter_lecon']);
    vrai('…un agent sans objectif cette semaine est invité à dire ce qui a marché', /Tu n’avais enregistré aucun objectif cette semaine/.test(H2.appels.find(a => a.id === 'emma').system));
    const O = H2.lire('agents-objectifs.json')['2026-W43'];
    v('⛔ le bilan est rangé SUR l’objectif : statut de la liste, pourquoi (adresse masquée)', O.lea.map(o => o.bilan && [o.bilan.statut, o.bilan.pourquoi]), [['atteint', 'Toutes les inscriptions ont reçu une réponse (faits).'], ['partiel', 'Écrit à (adresse) deux fois sur trois.'], null]);
    vrai('…un statut hors liste ET un objectif inconnu sont refusés (journal « refuse »)', H2.agents.lireJournal().filter(e => e.agent === 'lea' && e.action === 'réunion : bilan refusé').map(e => e.detail).sort().join() === 'objectif,statut');
    v('⛔ Chloé juge son objectif « non »', O.chloe[0].bilan.statut, 'non');
    const L = H2.lire('agents-lecons.json');
    v('⛔ DEUX leçons au plus par bilan : la troisième est refusée, le doublon aussi, les courtes et vides aussi', L.chloe.map(l => l.texte), ['Deuxième leçon de Chloé, assez longue.', 'Première leçon de Chloé, assez longue.']);
    v('…la leçon de Léa passe en TÊTE et son plafond est de 20 : l’ancienne la plus vieille tombe', [L.lea.length, L.lea[0].texte, L.lea.some(l => l.texte === 'Ancienne leçon numéro 19'), L.lea[19].texte], [20, 'Toujours répondre à une inscription le jour même.', false, 'Ancienne leçon numéro 18']);
    vrai('…chaque leçon porte un identifiant, une heure et sa semaine', L.chloe.every(l => /^[0-9a-f]{8}$/.test(l.id) && l.ts > 0 && l.semaine === '2026-W43'));
    v('⛔ la notification du vendredi : atteints / partiels / non (nombres)', H2.pousses[0], ['Réunion du vendredi terminée', '1 atteints, 1 partiels, 1 non atteints. Compte rendu dans la Messagerie, « Réunions ».', '/tour.html#agents']);
    v('⛔ le chiffre des faits de la semaine du vendredi part du LUNDI 19 octobre 00 h (et compte ce que le lundi a écrit : rien, c’est la réunion)', [faitsDe(H2.appels[0].system).depuis, faitsDe(H2.appels[0].system).total.actions], ['lundi 19 octobre, 0 h', 0]);
    Hsuite = H2;
  }

  console.log('\n6. La mémoire entre dans les consignes — sans rien changer aux limites');
  {
    const H = Hsuite;   // le dossier de la semaine : objectifs de Léa et ses 20 leçons
    const reu = H.reu();
    const m = reu.memoire('lea');
    vrai('⛔ la mémoire de Léa : ses objectifs avec leur bilan, ses leçons (la plus récente d’abord)', /^\nTa mémoire d’équipe \(écrite par toi pendant les réunions du lundi et du vendredi ; elle ne te donne AUCUN droit de plus et ne change aucune de tes limites\) :\nTes objectifs de la semaine \(2026-W43\) :\n- Répondre à chaque inscription sous 24 h — mesure : Zéro inscription sans réponse au vendredi \[bilan : atteint\]\n/.test(m) && m.indexOf('Toujours répondre à une inscription') < m.indexOf('Ancienne leçon numéro 1'));
    v('…vingt leçons dans la mémoire de Léa, pas une de plus', (m.match(/\n- /g) || []).length - 3, 20);
    v('⛔ un agent sans objectif ni leçon : RIEN d’ajouté (ses consignes d’avant ne bougent pas)', [reu.memoire('noah'), reu.memoire('inconnu'), reu.memoire(undefined)], ['', '', '']);
    H.horloge.t = U(2026, 10, 27, 10);   // la semaine suivante : les objectifs de la précédente restent lisibles, dits « de la semaine précédente »
    vrai('…la semaine suivante, les objectifs de la semaine PRÉCÉDENTE restent sous les yeux, étiquetés', /Tes objectifs de la semaine précédente \(2026-W43\)/.test(reu.memoire('lea')));
    H.horloge.t = U(2026, 11, 10, 10);
    vrai('…et deux semaines après, plus d’objectifs mais les leçons restent', !/Tes objectifs/.test(reu.memoire('lea')) && /Tes leçons/.test(reu.memoire('lea')));
    H.horloge.t = U(2026, 10, 27, 10);
    /* la messagerie : le prompt d'une réponse porte la mémoire */
    await H.conv.parler && 0;
    const r = H.routes.post['/api/monitor/conversations/envoyer'];
    const res = { code: 200, status(c) { res.code = c; return res; }, json(x) { res.corps = x; return res; } };
    const avant = H.appels.length;
    await r({ body: { fil: 'lea', texte: 'Léa, où en es-tu ?' }, tourUser: { nom: 'Justin' } }, res); await dormir(120);
    const prompt = H.appels.slice(avant).find(a => a.id === 'lea');
    vrai('⛔ une réponse de Léa dans la messagerie lit sa mémoire (objectifs précédents + leçons) APRÈS les règles', !!prompt && /Ta mémoire d’équipe/.test(prompt.system) && /Toujours répondre à une inscription le jour même\./.test(prompt.system) && prompt.system.indexOf('Ta mémoire d’équipe') > prompt.system.indexOf('Règles :'));
    vrai('…et la réponse de Noah (sans mémoire) ne contient pas ce bloc', await (async () => { const a0 = H.appels.length; await r({ body: { fil: 'noah', texte: 'Noah, un point ?' }, tourUser: { nom: 'Justin' } }, res); await dormir(120); const p = H.appels.slice(a0).find(a => a.id === 'noah'); return !!p && !/Ta mémoire d’équipe/.test(p.system); })());
    /* la conversation d'avant (agent-conversation) : même mémoire, lue À CHAQUE réponse */
    const prompts = [];
    const AC1 = AC({ agents: H.agents, conversations: H.conv, cerveau: { penser: async (id, system) => { prompts.push([id, system]); return { ok: true, texte: 'Réponse.' }; } }, faits: {}, memoire: id => reu.memoire(id) });
    await AC1.repondre('lea', 'Léa, ça avance ?'); await AC1.repondre('noah', 'Noah, ça avance ?');
    vrai('⛔ la conversation d’avant porte la même mémoire (Léa oui, Noah non), après ses règles et avant les faits', /Ta mémoire d’équipe/.test(prompts[0][1]) && prompts[0][1].indexOf('Ta mémoire') > prompts[0][1].indexOf('Règles :') && prompts[0][1].indexOf('Ta mémoire') < prompts[0][1].indexOf('Bloc Faits') && !/Ta mémoire/.test(prompts[1][1]));
    const AC0 = AC({ agents: H.agents, conversations: H.conv, cerveau: { penser: async (id, system) => { prompts.push([id, system]); return { ok: true, texte: 'Réponse.' }; } }, faits: {} });
    await AC0.repondre('lea', 'Léa, encore ?');
    vrai('…sans fonction de mémoire (réunions non montées), rien n’est ajouté : le prompt d’avant', !/Ta mémoire/.test(prompts[2][1]));
    vrai('⛔ la mémoire ne touche aucun outil : les outils de la messagerie sont toujours les six fermés (`demander` en plus depuis le 28 octobre 2026)', H.appels.slice(avant).filter(a => a.id === 'lea')[0].opts.outils.map(o => o.name).join() === 'ecrire,prendre,passer,terminer,demander_justin,demander');
  }

  console.log('\n7. Les pannes');
  {
    /* Hugo est éteint PAR JUSTIN pendant la réunion, après que Camille a parlé : il ne parle pas, n'appelle pas Claude, et le fil le dit */
    let H; H = await monter({ depart: U(2026, 10, 19, 7, 0), script: async (t) => { if (t.id === 'camille') await H.post('/api/monitor/agents/mode', { agent: 'hugo', mode: 'arret' }); return rep('Point ' + (++cpt) + '.'); } });
    await H.tic();
    vrai('⛔ un agent éteint en cours de réunion ne parle pas, n’appelle pas Claude, et le fil le dit', !H.appels.some(a => a.id === 'hugo') && H.messages().some(m => m.de === 'systeme' && /N’ont pas pu parler : Hugo \(il est à l’arrêt\)/.test(m.texte)) && H.reunions()[0].statut === 'terminee');
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 6, 30), fichiers: { 'agents-lecons.json': 'pas du json' } });
    const avant = fs.readFileSync(path.join(H.D, 'agents-lecons.json'), 'utf8');
    const r = await H.post('/api/monitor/agents/lecons/retirer', { agent: 'lea', id: 'cafe0001' });
    v('⛔ des leçons illisibles : le retrait dit 503 et RIEN ne s’écrit par-dessus', [r.code, fs.readFileSync(path.join(H.D, 'agents-lecons.json'), 'utf8') === avant], [503, true]);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), script: () => ({ ok: false, raison: 'pas_de_cle' }) });
    await H.tic();
    v('⛔ sans clé : la réunion est ANNULÉE d’emblée (un appel, pas seize), UNE ligne dit pourquoi', [H.appels.length, H.messages().filter(m => m.de === 'systeme').map(m => m.texte).slice(1), H.reunions()[0].statut], [1, ['Réunion annulée : la clé des agents n’est pas posée.'], 'annulee']);
    vrai('…aucune notification de fin, aucun message d’agent', H.pousses.length === 0 && H.messages().every(m => m.de === 'systeme'));
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), etatBudget: () => ({ illisible: false, cle: false }) });
    await H.tic();
    v('la clé absente se voit AVANT tout appel (budget lu) : annulée, zéro appel', [H.appels.length, H.messages().map(m => m.texte).slice(-1), H.reunions()[0].statut], [0, ['Réunion annulée : la clé des agents n’est pas posée.'], 'annulee']);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), script: (t) => t.id === 'camille' ? { ok: false, raison: 'plafond_agent' } : t.id === 'jules' ? (() => { throw new Error('panne simulée'); })() : t.id === 'sarah' ? rep('') : rep('Point ' + (++cpt) + '.') });
    await H.tic();
    const sys = H.messages().filter(m => m.de === 'systeme').map(m => m.texte);
    vrai('⛔ un agent qui ne peut pas parler est NOMMÉ avec la raison, les autres continuent', sys.some(m => /^N’ont pas pu parler : Camille \(son budget du mois est atteint\), Jules \(Claude ne répond pas\)\.$/.test(m)));
    v('…Victor conclut, la réunion est terminée, Sarah (réponse vide) n’est pas comptée comme absente', [H.reunions()[0].statut, H.appels[H.appels.length - 1].phase, H.reunions()[0].absents.map(a => a.id)], ['terminee', 'conclusion', ['camille', 'jules']]);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), script: (t, k) => k >= 4 ? { ok: false, raison: 'plafond_total' } : rep('Point ' + (++cpt) + '.') });
    await H.tic();
    v('⛔ une cause qui vaut pour TOUS en cours de route (budget total atteint) : la réunion s’arrête « interrompue », une seule ligne', [H.reunions()[0].statut, H.appels.length, H.messages().filter(m => m.de === 'systeme').slice(-1)[0].texte], ['interrompue', 4, 'Réunion interrompue : le budget des agents est atteint.']);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), allumes: ['victor', 'lea'], script: (t) => t.id === 'victor' && t.phase === 'conclusion' ? { ok: false, raison: 'erreur_api' } : rep('Point ' + (++cpt) + '.') });
    await H.tic();
    vrai('Victor qui ne peut pas conclure : « Compte rendu non écrit », réunion tout de même terminée', H.messages().some(m => m.de === 'systeme' && /^Compte rendu non écrit : Claude ne répond pas\.$/.test(m.texte)) && H.reunions()[0].statut === 'terminee' && !H.reunions()[0].compteRendu);
  }
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 0), allumes: ['victor', 'lea'], mode: 'x' });
    H.agents.noter('lea', 'x', { resultat: 'ok' });
    const r1 = await H.post('/api/monitor/agents/reunions/lancer', { type: 'objectifs' });
    const r2 = await H.post('/api/monitor/agents/reunions/lancer', { type: 'bilan' });
    await H.reu().attendre();
    v('⛔ deux réunions en même temps : la seconde est refusée (409), la première va au bout', [r1.code, r2.code, r2.corps.error, H.reunions().length, H.reunions()[0].statut], [200, 409, 'Une réunion est déjà en cours', 1, 'terminee']);
  }

  console.log('\n8. Le fil des réunions : plafond propre, rien ne réveille, texte long — seulement pour la réunion');
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 0) });
    let reveils = 0; const surMessage = H.conv; void surMessage;
    const long = 'a'.repeat(900);
    const r1 = H.conv.parler('victor', 'reunions', long, { reunion: true, max: 1500 }), r2 = H.conv.parler('lea', 'reunions', long, { reunion: true, max: 1500 }), r3 = H.conv.parler('camille', 'reunions', long, { max: 1500 }), r4 = H.conv.parler('max', 'equipe', long, { reunion: true, max: 1500 });
    const lu = f => H.conv.lire(f, 50);
    v('⛔ « reunion » + « max » : jusqu’à 1 500 caractères dans le fil « reunions » seulement ; ni sans le drapeau, ni dans un autre fil (600)', [lu('reunions').find(m => m.de === 'victor').texte.length, lu('reunions').find(m => m.de === 'camille').texte.length, lu('equipe').find(m => m.de === 'max').texte.length, r1.ok, r4.ok], [900, 600, 600, true, true]);
    v('…le plafond reste 1 500 même si on en demande plus', (() => { H.conv.parler('nina', 'reunions', 'b'.repeat(3000), { reunion: true, max: 99999 }); return lu('reunions').find(m => m.de === 'nina').texte.length; })(), 1500);
    /* le plafond du fil : 20 par heure sans drapeau, 45 avec */
    const H2 = await monter({ depart: U(2026, 10, 19, 7, 0) });
    const dix = REG.slice();
    let refus20 = null, refus45 = null;
    for (let i = 0; i < 60; i++) { const id = dix[i % dix.length]; const r = H2.conv.parler(id, 'plateforme', 'Message ' + i, {}); if (!r.ok && !refus20 && id) refus20 = r.raison; }
    const H3 = await monter({ depart: U(2026, 10, 19, 7, 0) });
    let admis = 0; for (let i = 0; i < 70; i++) { const id = REG[i % REG.length]; const r = H3.conv.parler(id, 'reunions', 'Réunion message ' + i, { reunion: true }); if (r.ok) admis++; else { refus45 = r.raison; break; } }
    v('⛔ le plafond horaire d’un fil d’agents est inchangé (20) et celui des réunions est 45', [admis, refus45], [45, 'trop_de_messages_fil']);
    v('…un fil ordinaire (« plateforme », cinq membres) refuse au plafond de 20 ou à celui de l’agent (12)', typeof refus20, 'string');
    /* aucune @mention d'une réunion ne réveille la messagerie ; hors réunion elle réveille toujours */
    const H4 = await monter({ depart: U(2026, 10, 19, 7, 0) });
    const reveil = []; const conv2 = H4.conv;
    void conv2;
    H4.conv.parler('lea', 'reunions', '@camille avis ?', { reunion: true });
    await dormir(80);
    const sansReveil = H4.appels.length;
    H4.conv.parler('lea', 'clients', '@camille avis ?', {});
    await dormir(150);
    v('⛔ « reunion » : l’@mention est lue et gardée, mais n’appelle personne ; hors réunion elle réveille toujours le cité', [sansReveil, H4.appels.map(a => a.id)], [0, ['camille']]);
    void reveils; void reveil;
  }

  console.log('\n9. Les routes (module) : lecture, leçons, lancement');
  {
    const H = await monter({ depart: U(2026, 10, 19, 7, 0) });
    await H.tic();
    const g = (await H.get('/api/monitor/agents/reunions')).corps;
    v('la lecture : la semaine, rien en cours, la prochaine réunion, la dernière tenue', [g.ok, g.semaine, g.semainePrecedente, g.enCours, g.prochaine.libelle, g.prochaine.type, g.reunions.length, g.reunions[0].statut], [true, '2026-W43', '2026-W42', null, 'vendredi 23 octobre, 18 h', 'bilan', 1, 'terminee']);
    vrai('…le compte rendu, les participants (identifiants) et la clé de lecture des objectifs/leçons', typeof g.reunions[0].compteRendu === 'string' && g.reunions[0].participants.length === 16 && typeof g.objectifs === 'object' && typeof g.lecons === 'object');
    const H2 = await monter({ depart: U(2026, 10, 19, 6, 30), allumes: ['victor', 'lea'], script: async () => { await dormir(150); return rep('Point ' + (++cpt) + '.'); } });
    await H2.post('/api/monitor/agents/reunions/lancer', { type: 'objectifs' });
    const g2 = (await H2.get('/api/monitor/agents/reunions')).corps;
    v('⛔ pendant la réunion : « en cours » dit laquelle et JUSQU’À QUELLE HEURE (8 h 30 + 1 h = 9 h 30)', [g2.enCours.type, g2.enCours.titre, g2.enCours.jusqua, g2.enCours.fin], ['objectifs', 'Réunion du lundi', '9 h 30', U(2026, 10, 19, 7, 30)]);
    await H2.reu().attendre();
    vrai('…et plus rien après', (await H2.get('/api/monitor/agents/reunions')).corps.enCours === null);
    const L = [{ id: 'cafe0001', texte: 'Une leçon à retirer.', ts: 1, semaine: '2026-W42' }, { id: 'cafe0002', texte: 'Une leçon à garder.', ts: 2, semaine: '2026-W42' }];
    const H3 = await monter({ depart: U(2026, 10, 19, 6, 30), fichiers: { 'agents-lecons.json': { lea: L } } });
    const rt = (b) => H3.post('/api/monitor/agents/lecons/retirer', b);
    const a = await rt({ agent: 'lea', id: 'cafe0001' });
    v('⛔ retirer une leçon : elle disparaît du fichier, l’autre reste', [a.code, H3.lire('agents-lecons.json').lea.map(l => l.id)], [200, ['cafe0002']]);
    v('…agent inconnu 404, identifiant mal formé 400, leçon inconnue 404, déjà retirée 404', [(await rt({ agent: 'pirate', id: 'cafe0002' })).code, (await rt({ agent: 'lea', id: 'ZZ' })).code, (await rt({ agent: 'lea', id: 'beefbeef' })).code, (await rt({ agent: 'lea', id: 'cafe0001' })).code, (await rt({})).code], [404, 400, 404, 404, 404]);
    vrai('…le retrait est écrit au journal (sans texte de la leçon)', H3.agents.lireJournal().some(e => e.agent === 'lea' && e.action === 'leçon retirée' && !e.detail));
    vrai('la mémoire ne contient plus la leçon retirée', !/à retirer/.test(H3.reu().memoire('lea')) && /à garder/.test(H3.reu().memoire('lea')));
    v('un type de réunion inconnu : 400 ; la pause : 409', [(await H3.post('/api/monitor/agents/reunions/lancer', { type: 'mardi' })).code, await (async () => { await H3.post('/api/monitor/agents/pause', { pause: true }); return (await H3.post('/api/monitor/agents/reunions/lancer', { type: 'bilan' })).code; })()], [400, 409]);
    const H4 = await monter({ depart: U(2026, 10, 19, 6, 30), allumes: [] });
    const an = await H4.post('/api/monitor/agents/reunions/lancer', { type: 'objectifs' });
    v('lancer sans aucun agent allumé : 200 et « annulée » (la ligne du système, une fois)', [an.code, an.corps.annulee, H4.messages().map(m => m.texte)], [200, true, ['Réunion annulée : aucun agent n’est allumé']]);
  }

  /* LA MINUTERIE, dans index.js (23 octobre 2026) : armée sans réglage ; seule la valeur `false` de `agents.reunionsAuto` la coupe — c'est le réglage des BANCS qui
     démarrent le vrai serveur (sans lui, la réunion due du vendredi soir ou du lundi matin partait pendant qu'ils comptaient). Lu dans le CODE, commentaires retirés. */
  console.log('\nLa minuterie du serveur');
  {
    const IDX = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const i = IDX.indexOf('const ticReunions'), bloc = i < 0 ? '' : IDX.slice(i, i + 900);
    vrai('(population) le câblage des réunions est trouvé dans index.js', bloc.length > 100 && /reunionsMod\.tic\(\)/.test(bloc));
    vrai('⛔ sans réglage, la minuterie est armée : seule la valeur `false` de `agents.reunionsAuto` la coupe',
      /if \(config\.agents && config\.agents\.reunionsAuto === false\)[^\n]*\n\s*else \{\s*setTimeout\(ticReunions, 5000\)\.unref\(\);\s*setInterval\(ticReunions, 60000\)\.unref\(\);/.test(bloc));
  }
  /* …et AUCUN banc qui démarre le vrai serveur avec une clé d'agents n'oublie de la couper : il a fallu deux passes à la main pour les trouver
     (huit bancs, puis deux), le 23 octobre 2026. test-2885 garde la minuterie : il éprouve les réunions du vrai serveur. */
  {
    const dir = path.join(RACINE, 'tests'), lus = [], oublis = [];
    for (const f of fs.readdirSync(dir).filter(f => /^(?:test-\d+|banc-[\w-]+)\.js$/.test(f) && f !== 'test-2884.js' && f !== 'test-2885.js')) {
      const s = fs.readFileSync(path.join(dir, f), 'utf8');
      const lance = /\bspawn\(/.test(s) && /['"]server['"],\s*['"]index\.js['"]|server\/index\.js/.test(s);
      const cle = /conf\.agents\s*=|agents:\s*\{\s*cleApi/.test(s);
      if (lance && cle) { lus.push(f); if (!/reunionsAuto:\s*false/.test(s)) oublis.push(f); }
    }
    vrai('(population) des bancs démarrent le vrai serveur avec une clé d\'agents : ' + lus.length + ' (' + lus.join(', ') + ')', lus.length >= 8);
    v('⛔ chacun coupe la minuterie des réunions (`agents.reunionsAuto: false`)', oublis, []);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(1); });
