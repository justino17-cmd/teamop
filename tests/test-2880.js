/* ⛔ CE QUE CE FICHIER GARDE — LA MESSAGERIE DES AGENTS, LES MODULES (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §1, §6, §11).
     Les VRAIS modules `agents.js`, `conversations.js` et `agent-equipe.js`, montés ensemble sur un faux `app` (les gestionnaires de routes sont
     capturés et appelés à la main) ; seul le cerveau est un faux, scripté, qui GARDE ce qu'il a reçu. Rien d'HTTP ici : `test-2881` joue le vrai serveur.
       · les @mentions, lues par le SERVEUR : sans accent ni casse, « @tous » / « @équipe », une adresse n'est pas une mention, un non-membre du fil
         n'est pas reconnu, pas de doublon, l'ordre d'apparition ;
       · la table MEMBRES (une seule), les meneurs, qui peut parler où ;
       · QUI EST RÉVEILLÉ (`destinataires`, pur) : le cité, l'agent d'un fil privé, le meneur ; jamais l'auteur, jamais le système ;
       · l'ANTI-BOUCLE : la profondeur (Justin 0, réponse = parent + 1), un agent réveillé par un agent seulement si < 3 SANS racine (6 avec la racine d'un message de Justin, où le ping-pong ABAB sans acte coupe au 5e réveil), A↔B s'arrête à 3 appels sans racine,
         au plus 20 messages d'agents par heure et par fil ;
       · UNE VRAIE CONVERSATION : une question à Margaux est répondue PAR Margaux — aucune tâche, aucune délégation ;
       · les OUTILS : prendre (sa tâche, « demandée par » Justin ou un collègue), passer (réellement chargé, vers un collègue LIBRE, jamais Hugo ni
         Margaux, la raison dite), ecrire (seulement un fil dont il est membre), terminer, demander_justin (« important », fil privé) ;
       · Hugo et Margaux : une consigne libre n'existe que si elle vient de JUSTIN ;
       · la charge (tâches en cours) est un fait fermé donné au prompt, rien d'une personne ;
       · un agent à l'arrêt ne parle pas, ne lit rien, et le fil reçoit UNE ligne du système par heure ;
       · « X écrit… » posé pendant la réflexion, retiré après — même en cas d'échec. */
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2880-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); process.exit(1); }, 90000).unref();

console.log('\n── 2880 · la messagerie des agents : mentions, réveil, anti-boucle, outils ──');
(async () => {
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
  const REG = AG.AGENTS.map(a => a.id);

  console.log('\n1. Les @mentions, lues par le serveur');
  const mb = [{ id: 'camille', nom: 'Camille' }, { id: 'lea', nom: 'Léa' }, { id: 'hugo', nom: 'Hugo' }];
  const M = (t, m) => CV.analyserMentions(t, m || mb);
  v('« @Camille » et « @camille » : la même personne', [M('@Camille'), M('@camille'), M('@CAMILLE')], [['camille'], ['camille'], ['camille']]);
  v('« @Léa » et « @lea » (sans accent, sans casse), un seul résultat', M('@Léa, puis @lea et @LÉA'), ['lea']);
  v('plusieurs personnes : dans l’ordre où elles paraissent', M('@Hugo @Camille, vous faites ça'), ['hugo', 'camille']);
  v('« @tous » = tous les membres du fil', M('@tous, un point ?'), ['camille', 'lea', 'hugo']);
  v('« @équipe » aussi (sans accent : « @equipe »)', [M('@équipe svp'), M('@Equipe')], [['camille', 'lea', 'hugo'], ['camille', 'lea', 'hugo']]);
  v('⛔ une adresse n’est pas une mention (« jean@camille.fr »)', M('écris à jean@camille.fr ou a.lea@hugo.com'), []);
  v('un mot qui commence comme un prénom n’est pas ce prénom (« @Camillette »)', M('@Camillette'), []);
  v('un agent qui n’est pas du fil n’est pas reconnu (« @Max » dans un fil sans Max)', M('@Max, tu peux ?'), []);
  v('ponctuation autour : « (@Hugo) », « @Hugo. », « @Hugo, »', [M('(@Hugo)'), M('Merci @Hugo.'), M('@Hugo,')], [['hugo'], ['hugo'], ['hugo']]);
  v('texte absent ou vide : aucune mention', [M(''), M(null), M(undefined), CV.analyserMentions('@x', null)], [[], [], [], []]);

  console.log('\n2. Une seule table des membres');
  v('quatre groupes : equipe, clients, plateforme, reunions', CV.GROUPES, ['equipe', 'clients', 'plateforme', 'reunions']);
  v('« clients » = Léa, Chloé, Camille, Hugo, Margaux, Emma', CV.MEMBRES.clients, ['lea', 'chloe', 'camille', 'hugo', 'margaux', 'emma']);
  v('« plateforme » = Max, Jules, Théo, Nina, Inès', CV.MEMBRES.plateforme, ['max', 'jules', 'theo', 'nina', 'ines']);
  v('« equipe » et « reunions » = tous', [CV.MEMBRES.equipe, CV.MEMBRES.reunions], ['*', '*']);
  v('meneurs : equipe → victor, clients → lea, plateforme → max, reunions → victor', CV.MENEUR, { equipe: 'victor', clients: 'lea', plateforme: 'max', reunions: 'victor' });
  vrai('tout membre listé existe au registre des agents (ni fantôme ni oubli)', [...CV.MEMBRES.clients, ...CV.MEMBRES.plateforme, ...Object.values(CV.MENEUR)].every(id => REG.includes(id)));

  console.log('\n3. Qui est réveillé (pur)');
  const D = EQ.destinataires;
  const tous = REG.slice(), cl = CV.MEMBRES.clients;
  const mG = { de: 'justin', prof: 0, mentions: [] };
  v('Justin cite deux agents : ces deux-là', D({ de: 'justin', prof: 0, mentions: ['camille', 'hugo'] }, { membres: cl, meneur: 'lea', prive: false, filId: 'clients' }), ['camille', 'hugo']);
  v('Justin sans citer, fil privé : l’agent du fil', D(mG, { membres: ['margaux'], meneur: '', prive: true, filId: 'margaux' }), ['margaux']);
  v('Justin sans citer, groupe : le MENEUR (clients → Léa)', D(mG, { membres: cl, meneur: 'lea', prive: false, filId: 'clients' }), ['lea']);
  v('…« equipe » → Victor', D(mG, { membres: tous, meneur: 'victor', prive: false, filId: 'equipe' }), ['victor']);
  v('un cité qui n’est pas membre du fil n’est pas réveillé', D({ de: 'justin', prof: 0, mentions: ['max'] }, { membres: cl, meneur: 'lea', prive: false, filId: 'clients' }), ['lea']);
  v('un message du SYSTÈME ne réveille personne', D({ de: 'systeme', prof: 0, mentions: ['camille'] }, { membres: cl, meneur: 'lea', prive: false, filId: 'clients' }), []);
  v('un agent réveille ceux qu’il cite (profondeur 1)', D({ de: 'camille', prof: 1, mentions: ['hugo'] }, { membres: cl, meneur: 'lea', prive: false, filId: 'clients' }), ['hugo']);
  v('…jamais lui-même', D({ de: 'camille', prof: 1, mentions: ['camille', 'hugo'] }, { membres: cl, meneur: 'lea', prive: false, filId: 'clients' }), ['hugo']);
  v('…et RIEN s’il ne cite personne : un agent n’appelle pas le meneur', D({ de: 'camille', prof: 1, mentions: [] }, { membres: cl, meneur: 'lea', prive: false, filId: 'clients' }), []);
  v('⛔ profondeur 2 : encore réveillé ; profondeur 3 : plus personne (la borne est < 3)', [D({ de: 'camille', prof: 2, mentions: ['hugo'] }, { membres: cl }).length, D({ de: 'camille', prof: 3, mentions: ['hugo'] }, { membres: cl }).length], [1, 0]);
  v('profondeur absente ou illisible : pas de réveil (on ne devine pas)', [D({ de: 'camille', mentions: ['hugo'] }, { membres: cl }).length, D({ de: 'camille', prof: 'x', mentions: ['hugo'] }, { membres: cl }).length], [0, 0]);
  v('message ou contexte absent : personne', [D(null, {}), D({ de: 'justin' }, null), D({ de: 'justin', mentions: ['x'] }, { membres: [] })], [[], [], []]);

  /* ── le banc de montage : vrais modules, faux app, faux cerveau ── */
  let n = 0;
  async function monter(o) {
    o = o || {};
    const D = path.join(banc, 'm' + (n++)); fs.mkdirSync(D, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    let horloge = o.depart || 1.8e12; const pousses = [];
    const modes = {}; for (const id of REG) modes[id] = (o.modes && o.modes[id]) || o.mode || 'brouillon';
    fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
    const agents = AG(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge });
    const appels = []; let eq = null;
    const conv = CV(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, agents, maintenant: () => horloge, pousseNotif: (t, c) => { pousses.push([t, c]); return Promise.resolve(); },
      surMessage: m => eq.surMessage(m) });
    const cerveau = { penser: async (id, system, messages, opts) => { const trace = { id, system, messages: JSON.parse(JSON.stringify(messages)), opts, ecritPendant: conv.quiEcrit(o.filSuivi || 'x').map(x => x.id) }; appels.push(trace);
      if (o.attente) await dormir(o.attente);
      return typeof o.script === 'function' ? o.script(trace, appels.length) : { ok: true, texte: 'Réponse du banc.', actions: [] }; } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: o.faits || {} });
    const fakeRes = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
    const appelPost = async (chemin, corps) => { const r = fakeRes(); await routes.post[chemin]({ body: corps, tourUser: { nom: 'Justin' }, query: {} }, r); return r; };
    const appelGet = async (chemin, params, query) => { const r = fakeRes(); await routes.get[chemin]({ params: params || {}, query: query || {}, tourUser: { nom: 'Justin' } }, r); return r; };
    return {
      D, agents, conv, eq, appels, pousses, horloge: ms => { horloge += ms; }, mode: async (agent, mode) => (await appelPost('/api/monitor/agents/mode', { agent, mode })).code,
      /* Justin écrit (la VRAIE route), puis on attend que l'équipe ait fini de répondre */
      post: appelPost, get: appelGet,
      justin: async (fil, texte) => { const r = await appelPost('/api/monitor/conversations/envoyer', { fil, texte }); await calme(); return r; },
      fil: async (fil, query) => (await appelGet('/api/monitor/conversations/:fil', { fil }, query)).corps,
      liste: async (query) => (await appelGet('/api/monitor/conversations', {}, query)).corps,
      messages: async fil => (await appelGet('/api/monitor/conversations/:fil', { fil })).corps.messages,
      taches: () => { const j = JSON.parse(fs.readFileSync(path.join(D, 'agents-taches.json'), 'utf8')); return j; },
    };
  }
  /* « calme » : plus aucun réveil en cours — on laisse la file des fils se vider */
  const calme = async () => { for (let i = 0; i < 4; i++) await dormir(40); };
  const rep = (texte, actions) => ({ ok: true, texte, actions: actions || [] });
  const outil = (nom, entree) => ({ id: 'tu_' + nom, nom, entree });
  const idTache = (system, k) => { const m = [...String(system).matchAll(/^- \[([0-9a-f]{12})\]/gm)]; return m[k || 0] && m[k || 0][1]; };

  console.log('\n4. ⛔ UNE QUESTION REÇOIT LA RÉPONSE DE CELUI À QUI ELLE EST POSÉE');
  {
    const H = await monter({ script: (t) => rep('Sur la compta, je suis à jour : rien en retard côté factures.') });
    await H.justin('margaux', 'Margaux, sur la compta, tu en es où ?');
    const ms = await H.messages('margaux');
    v('⛔ c’est MARGAUX qui répond, dans son fil (un seul appel à Claude, le sien)', [H.appels.map(a => a.id), ms.filter(m => m.de === 'margaux').map(m => m.texte)], [['margaux'], ['Sur la compta, je suis à jour : rien en retard côté factures.']]);
    v('⛔ aucune tâche, aucune délégation, aucune demande de validation', [H.agents.charge().margaux, H.agents.charge().victor, H.agents.comptes().tachesEnAttente, H.agents.comptes().validationsEnAttente, fs.existsSync(path.join(H.D, 'agents-taches.json'))], [0, 0, 0, 0, false]);
    v('…et aucun message dans le fil de Victor', (await H.messages('victor')).length, 0);
    v('la réponse est un « assistant » ; le prompt porte les cinq outils fermés, la réflexion, et rien d’autre que des outils', [H.appels[0].opts.reflechir, H.appels[0].opts.outils.map(o => o.name)], [true, ['ecrire', 'prendre', 'passer', 'terminer', 'demander_justin']]);
    v('la réponse porte la profondeur 1 (Justin = 0) et le message de Justin la profondeur 0', [ms.find(m => m.de === 'margaux').prof, ms.find(m => m.de === 'justin').prof], [1, 0]);
  }

  console.log('\n5. Justin demande un travail à deux agents : chacun répond et prend SA tâche');
  {
    const H = await monter({ script: (t) => t.id === 'camille' ? rep('Oui, je m’en occupe.', [outil('prendre', { texte: 'Relire le courrier de ce matin' })]) : rep('Je prends la relance des devis.', [outil('prendre', { texte: 'Relancer les devis en attente' })]) });
    await H.justin('clients', '@Camille @Léa, vous faites ça aujourd’hui ?');
    const ms = await H.messages('clients');
    v('⛔ les deux citées répondent, dans le groupe, chacune une fois (pas le meneur seul)', [H.appels.map(a => a.id).sort(), ms.filter(m => REG.includes(m.de)).map(m => m.de).sort()], [['camille', 'lea'], ['camille', 'lea']]);
    const t = H.taches();
    v('⛔ chacune a SA tâche « consigne », demandée par Justin, en cours', t.map(k => [k.vers, k.de, k.type, k.statut]).sort(), [['camille', 'justin', 'consigne', 'prise'], ['lea', 'justin', 'consigne', 'prise']]);
    vrai('…le texte de la tâche est celui que l’agent a écrit', t.find(k => k.vers === 'camille').params.texte === 'Relire le courrier de ce matin');
    vrai('…et le système le dit dans le fil (« Camille a pris… »)', ms.some(m => m.de === 'systeme' && /Camille a pris « Relire le courrier/.test(m.texte)) && ms.some(m => m.de === 'systeme' && /Léa a pris/.test(m.texte)));
    const mm = ms.find(m => m.de === 'justin');
    v('les mentions reconnues sont gardées sur le message, et rendues par la route d’envoi', [mm.mentions, (await H.justin('clients', '@Hugo ?')).corps.mentions], [['camille', 'lea'], ['hugo']]);
    v('(population) la lecture a bien vu 2 tâches avant de compter les charges', [H.agents.charge().camille, H.agents.charge().lea, H.agents.tachesDe('camille').length], [1, 1, 1]);
  }

  console.log('\n6. Passer un travail : réellement chargé, vers un collègue LIBRE, jamais Hugo ni Margaux');
  {
    /* Camille a deux tâches ; Léa est libre ; Théo est occupé ; Hugo et Margaux sont libres mais interdits */
    const H = await monter({ script: () => rep('Ok.') });
    for (const [vers, texte] of [['camille', 'Tâche A de Camille'], ['camille', 'Tâche B de Camille'], ['theo', 'Une tâche de Théo']]) H.agents.consigner('justin', vers, texte);
    const tc = H.agents.tachesDe('camille'); const A = tc[0].id, B = tc[1].id;
    v('(population) Camille 2, Théo 1, Léa 0', [H.agents.charge().camille, H.agents.charge().theo, H.agents.charge().lea], [2, 1, 0]);
    v('⛔ vers un collègue OCCUPÉ : refusé', H.agents.passerConsigne('camille', A, 'theo'), { ok: false, raison: 'occupe' });
    v('⛔ vers HUGO : refusé', H.agents.passerConsigne('camille', A, 'hugo'), { ok: false, raison: 'jamais_hugo_margaux' });
    v('⛔ vers MARGAUX : refusé', H.agents.passerConsigne('camille', A, 'margaux'), { ok: false, raison: 'jamais_hugo_margaux' });
    v('vers soi-même, vers un inconnu : refusé', [H.agents.passerConsigne('camille', A, 'camille').raison, H.agents.passerConsigne('camille', A, 'pirate').raison], ['destinataire', 'destinataire']);
    v('une tâche inconnue : refusé', H.agents.passerConsigne('camille', 'abcdef012345', 'lea').raison, 'tache');
    v('la tâche d’un AUTRE : refusé (sauf Victor)', H.agents.passerConsigne('theo', A, 'lea').raison, 'pas_le_tien');
    v('⛔ par un agent SANS autre tâche (Théo n’en a qu’une) : refusé', H.agents.passerConsigne('theo', H.agents.tachesDe('theo')[0].id, 'lea'), { ok: false, raison: 'pas_charge' });
    v('(rien n’a bougé après tous ces refus)', [H.agents.charge().camille, H.agents.charge().lea, H.agents.charge().theo], [2, 0, 1]);
    const r = H.agents.passerConsigne('camille', A, 'lea');
    v('⛔ chargée → collègue libre : accepté, la tâche reste demandée par Justin', [r.ok, r.de, r.vers, r.demandePar, H.taches().find(k => k.id === A).vers, H.taches().find(k => k.id === A).de], [true, 'camille', 'lea', 'justin', 'lea', 'justin']);
    v('…et maintenant Léa est occupée : un second passage vers elle est refusé', H.agents.passerConsigne('camille', B, 'lea').raison, 'pas_charge');
    v('Victor répartit le travail des autres : la tâche de Camille (chargée de nouveau) vers un libre', (() => { H.agents.consigner('justin', 'camille', 'Tâche C de Camille'); const c = H.agents.tachesDe('camille'); return H.agents.passerConsigne('victor', c[0].id, 'jules').ok; })(), true);
    v('…mais pas depuis quelqu’un qui n’est pas chargé', (() => { const l = H.agents.tachesDe('jules')[0]; return H.agents.passerConsigne('victor', l.id, 'noah').raison; })(), 'pas_charge');
    await H.mode('emma', 'arret'); H.agents.consigner('justin', 'camille', 'Tâche D de Camille');
    v('un passage vers un agent à l’arrêt : refusé (il ne peut pas agir)', H.agents.passerConsigne('camille', H.agents.tachesDe('camille')[0].id, 'emma').raison, 'arret');
  }
  {
    /* le même, par l'OUTIL : la validation passe par le code, et le fil dit pourquoi */
    let etape = 0, ids = {};
    const H = await monter({ script: (t) => {
      if (t.id === 'camille') { etape++; const cible = ids.cible; return rep('Je passe ça.', [outil('passer', { vers: cible, tache: idTache(t.system, 0), raison: 'je suis sur la facture de Société E' })]); }
      return rep('Ok.'); } });
    H.agents.consigner('justin', 'camille', 'Préparer le devis Société D'); H.agents.consigner('justin', 'camille', 'Facture de Société E');
    ids.cible = 'lea';
    await H.justin('camille', 'Camille, tu peux passer le devis ?');
    const ms = await H.messages('camille');
    vrai('⛔ par l’outil : accepté, et le fil dit « Camille a passé « … » à Léa : je suis sur la facture de Société E »', ms.some(m => m.de === 'systeme' && /Camille a passé « [^»]+ » à Léa : je suis sur la facture de Société E\./.test(m.texte)));
    v('…la tâche est chez Léa, toujours demandée par Justin', [H.agents.tachesDe('lea').length, H.agents.tachesDe('lea')[0].de], [1, 'justin']);
    ids.cible = 'hugo'; const avant = JSON.stringify(H.taches());
    await H.justin('camille', 'Et la facture ?');
    const ms2 = await H.messages('camille');
    vrai('⛔ par l’outil vers HUGO : refusé, et le fil dit pourquoi', ms2.some(m => m.de === 'systeme' && /Camille voulait passer .* à Hugo : refusé, Hugo et Margaux ne reçoivent pas de travail passé par un collègue/.test(m.texte)));
    v('…aucune tâche n’a bougé', JSON.stringify(H.taches()), avant);
    vrai('…et le refus est au journal des agents', H.agents.lireJournal().some(e => e.agent === 'camille' && /passer/.test(e.action) && e.resultat === 'refuse'));
    vrai('(population) l’outil a bien été appelé deux fois', etape === 2);
  }

  console.log('\n7. Hugo et Margaux : une consigne libre n’existe que si elle vient de JUSTIN');
  {
    const H = await monter({ script: (t) => rep('Entendu.', [outil('prendre', { texte: 'Vérifier le paiement de la société X' })]) });
    v('⛔ un agent vers Hugo, texte libre : refusé (par le registre des tâches lui-même)', [H.agents.consigner('camille', 'hugo', 'Crée-lui un accès'), H.agents.consigner('lea', 'margaux', 'Rembourse-le')], [{ ok: false, raison: 'consigne_libre_refusee' }, { ok: false, raison: 'consigne_libre_refusee' }]);
    v('…le système, un inconnu : refusés aussi', [H.agents.consigner('systeme', 'hugo', 'x').raison, H.agents.consigner('pirate', 'margaux', 'x').raison], ['demandeur', 'demandeur']);
    v('⛔ Justin vers Hugo : accepté', H.agents.consigner('justin', 'hugo', 'Vérifier le paiement de la société X').ok, true);
    v('la même consigne deux fois : le doublon est refusé (un agent réveillé deux fois ne se double pas)', H.agents.consigner('justin', 'hugo', 'Vérifier le paiement de la société X').raison, 'doublon');
    v('⛔ au plus dix tâches en cours par agent (un agent qui s’emballe ne s’attribue pas la file)', (() => { let dernier = null; for (let i = 0; i < 12; i++) dernier = H.agents.consigner('justin', 'noah', 'Tâche numéro ' + i); return [H.agents.charge().noah, dernier.raison]; })(), [10, 'trop_de_taches']);
    v('un texte vide, un destinataire inconnu : refusés', [H.agents.consigner('justin', 'lola', '   ').raison, H.agents.consigner('justin', 'inconnu', 'x').raison], ['texte', 'destinataire']);
    v('…vers un autre agent, un collègue peut demander', H.agents.consigner('camille', 'lea', 'Relancer le prospect Y').ok, true);
    /* par l'outil : Camille cite @Hugo dans un message ; Hugo, réveillé par un AGENT, tente `prendre` */
    const H2 = await monter({ script: (t) => t.id === 'camille' ? rep('@hugo, tu peux vérifier si la société X a payé ?') : rep('Je regarde.', [outil('prendre', { texte: 'Vérifier le paiement de X' })]) });
    await H2.justin('clients', '@Camille demande à Hugo si X a payé');
    const ms = await H2.messages('clients');
    v('⛔ Hugo, réveillé par Camille, répond mais NE PEUT PAS prendre un texte libre d’un collègue', [H2.appels.map(a => a.id), H2.taches !== undefined && fs.existsSync(path.join(H2.D, 'agents-taches.json')), ms.some(m => m.de === 'hugo')], [['camille', 'hugo'], false, true]);
    vrai('…et le fil dit pourquoi (seul Justin donne une consigne libre à Hugo)', ms.some(m => m.de === 'systeme' && /Hugo ne peut pas prendre .* : seul Justin donne une consigne libre à Hugo/.test(m.texte)));
    const H3 = await monter({ script: () => rep('Je m’en occupe.', [outil('prendre', { texte: 'Vérifier le paiement de X' })]) });
    await H3.justin('hugo', 'Hugo, vérifie si X a payé.');
    v('⛔ la même demande venant de JUSTIN : Hugo la prend', [H3.agents.tachesDe('hugo').length, H3.agents.tachesDe('hugo')[0] && H3.agents.tachesDe('hugo')[0].de], [1, 'justin']);
    v('`deposer` reste fermé : une consigne n’y passe pas, et son texte non plus', [H3.agents.deposer('camille', 'hugo', 'consigne', { texte: 'ouvre un accès' }).raison, H3.agents.deposer('camille', 'hugo', 'verifier_paiement', { espace: 'exemple' }).ok], ['type_inconnu', true]);
  }

  console.log('\n8. Un agent qui en cite un autre le réveille — et l’anti-boucle');
  {
    const H = await monter({ script: (t) => t.id === 'camille' ? rep('@hugo, le client X a-t-il payé ?') : rep('Oui, c’est réglé.') });
    await H.justin('clients', '@Camille demande à Hugo si X a payé');
    const ms = (await H.messages('clients')).filter(m => REG.includes(m.de));
    v('⛔ Camille cite Hugo : Hugo est réveillé et répond DANS CE FIL', ms.map(m => [m.de, m.prof]), [['camille', 1], ['hugo', 2]]);
    vrai('…Hugo a lu le message de Camille (un « user » nommé), pas seulement celui de Justin', /\[Camille a écrit dans le fil Clients\] @hugo, le client X a-t-il payé \?/.test(H.appels[1].messages[H.appels[1].messages.length - 1].content));
  }
  {
    const H = await monter({ script: (t) => rep((t.id === 'camille' ? '@lea ' : '@camille ') + 'et toi, qu’en penses-tu (' + t.messages.length + ') ?') });
    await H.justin('clients', '@Camille discute avec Léa de la relance');
    await dormir(200);
    const ms = (await H.messages('clients')).filter(m => REG.includes(m.de));
    /* Justin, 28 octobre 2026 : un échange né d'un message de Justin a une RACINE — la borne n'est plus la profondeur 3 mais le budget de la racine, et deux agents qui se répondent À VIDE (ABAB, chacun cite l'autre,
       aucune tâche prise ni terminée) sont coupés au cinquième réveil (le ping-pong). La borne 3 d'avant reste celle de ce qui n'a PAS de racine (le cas suivant). */
    v('⛔ Justin → Camille ↔ Léa (enraciné) : quatre messages (1, 2, 3, 4), puis le ping-pong coupe — plus trois comme avant la racine', [H.appels.map(a => a.id), ms.map(m => m.prof)], [['camille', 'lea', 'camille', 'lea'], [1, 2, 3, 4]]);
    vrai('…le quatrième cite Camille, qui ne répond PAS : un message d\u2019agent dont le ping-pong a coupé la suite ne réveille plus personne', ms[3].mentions.includes('camille') && H.appels.length === 4);
    vrai('…et le fil DIT pourquoi, une fois (une ligne du système, pas une « limite de messages par heure »)', (await H.messages('clients')).filter(m => m.de === 'systeme' && /se répondent sans rien faire avancer/.test(m.texte)).length === 1);
    vrai('(population) ce fil ne porte AUCUNE ligne « limite de messages par heure »', !(await H.messages('clients')).some(m => /limite de messages/.test(m.texte)));
  }
  {
    /* SANS racine (un agent qui écrit de lui-même à un collègue) : la borne d'avant — profondeur 3, trois messages — tient. */
    const H = await monter({ script: (t) => rep((t.id === 'lea' ? '@camille ' : '@lea ') + 'et toi, qu’en penses-tu (' + t.messages.length + ') ?') });
    H.conv.parler('camille', 'clients', '@lea on s’y met ?', { niveau: 'info', prof: 1 });
    await calme(); await dormir(200);
    const ms = (await H.messages('clients')).filter(m => REG.includes(m.de));
    v('⛔ SANS racine : A↔B s’arrête à la profondeur 3 — trois messages (1, 2, 3), deux appels', [ms.map(m => [m.de, m.prof]), H.appels.map(a => a.id)], [[['camille', 1], ['lea', 2], ['camille', 3]], ['lea', 'camille']]);
    vrai('…le message de profondeur 3 cite Léa, qui ne répond PAS : sans racine, la borne reste < 3', ms[2].mentions.includes('lea') && H.appels.length === 2 && ms.every(m => !m.racine));
    v('jamais sur son propre message : l’auteur d’un message qui se cite lui-même n’est pas appelé', (() => { const dd = EQ.destinataires({ de: 'camille', prof: 1, mentions: ['camille'] }, { membres: CV.MEMBRES.clients }); return dd; })(), []);
  }
  {
    /* un message de Justin ne boucle pas non plus : « @tous » dans « equipe » réveille CHACUN une fois, et les réponses sans mention ne relancent rien */
    const H = await monter({ script: () => rep('Présent.') });
    await H.justin('equipe', '@tous, point rapide : qui est dispo ?');
    v('« @tous » dans Équipe : les seize sont réveillés, UNE fois chacun', [H.appels.length, new Set(H.appels.map(a => a.id)).size], [16, 16]);
  }
  {
    /* le plafond du fil : 20 messages d'agents par heure et par fil, en plus des 12 par agent */
    const H = await monter({ script: () => rep('x') });
    let refus = null, dits = 0;
    for (let i = 0; i < 24; i++) { const agent = REG[i % 16]; const r = H.conv.parler(agent, 'equipe', 'Message numéro ' + i + ' de ' + agent, { prof: 1 }); if (r.ok) dits++; else if (!refus) refus = r.raison; }
    v('⛔ au plus 20 messages d’agents par heure et par fil : le 21ᵉ est refusé', [dits, refus], [20, 'trop_de_messages_fil']);
    H.horloge(3700000);
    v('…une heure plus tard, ils peuvent reparler', H.conv.parler('victor', 'equipe', 'Un nouveau point', { prof: 1 }).ok, true);
    v('…le plafond du fil ne s’applique pas aux lignes du système ni à Justin', [H.conv.systeme('equipe', 'Une ligne').ok, (await H.justin('equipe', 'Merci')).code], [true, 200]);
  }

  console.log('\n9. ecrire, terminer, demander_justin');
  {
    const H = await monter({ script: () => rep('x') });
    v('⛔ qui peut parler où : Léa dans « clients », « reunions », « equipe » et son fil ; pas dans « plateforme » ni dans le fil d’un collègue',
      [['clients', 'reunions', 'equipe', 'lea'].map(f => H.conv.parler('lea', f, 'Un mot dans ' + f).ok), ['plateforme', 'max', 'justin'].map(f => H.conv.parler('lea', f, 'Un mot dans ' + f).raison)], [[true, true, true, true], ['fil', 'fil', 'fil']]);
    v('…Max dans « plateforme » mais pas dans « clients »', [H.conv.parler('max', 'plateforme', 'Un mot').ok, H.conv.parler('max', 'clients', 'Un mot').raison], [true, 'fil']);
  }
  {
    const H = await monter({ script: (t) => {
      if (t.id === 'lea') return rep('', [outil('ecrire', { fil: 'clients', texte: 'Point : Camille, tu as un moment ?' }), outil('ecrire', { fil: 'plateforme', texte: 'Je n’ai pas le droit ici' }), outil('ecrire', { fil: 'max', texte: 'Dans le fil d’un autre' }), outil('ecrire', { fil: 'reunions', texte: 'Pour la réunion de lundi' })]);
      if (t.id === 'max') return rep('', [outil('ecrire', { fil: 'clients', texte: 'Max dans les clients' }), outil('ecrire', { fil: 'plateforme', texte: 'Max dans la plateforme' })]);
      return rep('Ok.'); } });
    await H.justin('lea', 'Léa, écris au groupe.');
    v('⛔ ecrire : Léa écrit dans « clients » et « reunions » (elle en est membre), PAS dans « plateforme» ni dans le fil de Max', [(await H.messages('clients')).filter(m => m.de === 'lea').length, (await H.messages('reunions')).filter(m => m.de === 'lea').length, (await H.messages('plateforme')).length, (await H.messages('max')).length], [1, 1, 0, 0]);
    await H.justin('max', 'Max, écris aux deux groupes.');
    v('…Max écrit dans « plateforme » mais pas dans « clients »', [(await H.messages('plateforme')).filter(m => m.de === 'max').length, (await H.messages('clients')).filter(m => m.de === 'max').length], [1, 0]);
    vrai('…les refus sont au journal', H.agents.lireJournal().filter(e => /ecrire/.test(e.action) && e.resultat === 'refuse').length >= 3);
  }
  {
    const H = await monter({ script: (t, k) => k === 1 ? rep('Je prends.', [outil('prendre', { texte: 'Contrôler les sauvegardes de la semaine' })]) : k === 2 ? rep('Fait.', [outil('terminer', { tache: idTache(t.system, 0), resume: 'Trois sauvegardes sur trois, la dernière date d’hier.' }), outil('terminer', { tache: 'inconnuinconnu', resume: 'x' })])
      : rep('Une question pour toi.', [outil('demander_justin', { question: 'Je garde les sauvegardes 24 mois ou 36 ?' })]) });
    await H.justin('theo', 'Théo, contrôle les sauvegardes.');
    v('prendre (appel 1) : une tâche en cours', H.agents.tachesDe('theo').length, 1);
    await H.justin('theo', 'Alors ?');
    vrai('⛔ terminer (appel 2) : la tâche passe à « faite » avec son résumé, la fausse est refusée', H.agents.tachesDe('theo').length === 0 && H.taches()[0].statut === 'faite' && /Trois sauvegardes/.test(H.taches()[0].resume));
    vrai('…le fil dit « Théo a terminé « … » : … »', (await H.messages('theo')).some(m => m.de === 'systeme' && /Théo a terminé « Contrôler les sauvegardes de la semaine » : Trois sauvegardes/.test(m.texte)));
    await H.justin('theo', 'Une question ?');
    const ms = await H.messages('theo');
    const q = ms.find(m => /garde les sauvegardes 24 mois/.test(m.texte));
    v('⛔ demander_justin : dans son fil privé, niveau « important », et Justin est notifié', [q && q.niveau, H.pousses.some(p => /garde les sauvegardes/.test(p[1]))], ['important', true]);
  }
  {
    /* un message de Claude qui cite une adresse ou un téléphone : masqué AVANT d'entrer dans le fil, y compris dans l'outil prendre */
    const H = await monter({ script: () => rep('Écris à jean@client-2880.fr', [outil('prendre', { texte: 'Rappeler Jean au 06 12 34 56 78 ou jean@client-2880.fr' })]) });
    await H.justin('lea', 'Léa, rappelle-le.');
    const t = H.taches()[0], ms = await H.messages('lea');
    vrai('⛔ ni adresse ni téléphone dans la tâche prise, ni dans la réponse, ni dans la ligne du système', !/client-2880|06 12 34/.test(JSON.stringify(t) + JSON.stringify(ms)) && /\(adresse\)/.test(t.params.texte));
  }

  console.log('\n10. À l’arrêt : rien ne se lit, rien ne se dit — le fil reçoit une ligne par heure');
  {
    const H = await monter({ mode: 'arret' });
    await H.justin('camille', 'Camille, tu es là ?');
    v('⛔ à l’arrêt : aucun appel à Claude, aucune réponse', [H.appels.length, (await H.messages('camille')).filter(m => m.de === 'camille').length], [0, 0]);
    let ms = await H.messages('camille');
    v('…une ligne du système dit qu’elle est à l’arrêt', ms.filter(m => m.de === 'systeme').map(m => m.texte), ['Camille est à l’arrêt : allume-le dans la page Agents.']);
    await H.justin('camille', 'Et maintenant ?');
    v('⛔ UNE seule fois par heure, même quand Justin insiste', (await H.messages('camille')).filter(m => m.de === 'systeme').length, 1);
    H.horloge(3700000);
    await H.justin('camille', 'Une heure plus tard ?');
    v('…puis de nouveau une heure après', (await H.messages('camille')).filter(m => m.de === 'systeme').length, 2);
    await H.mode('camille', 'brouillon');
    await H.justin('camille', 'Rallumée ?');
    v('allumée, elle répond', [H.appels.length, (await H.messages('camille')).filter(m => m.de === 'camille').length], [1, 1]);
    const G = await monter({ modes: { victor: 'arret' } });
    await G.justin('equipe', 'Équipe, un point ?');
    v('le meneur (Victor) à l’arrêt : la ligne le dit dans le groupe, personne d’autre ne répond à sa place', [G.appels.length, (await G.messages('equipe')).filter(m => m.de === 'systeme' && /Victor est à l’arrêt/.test(m.texte)).length], [0, 1]);
  }
  {
    /* la PAUSE : même chose, une ligne par heure */
    const R = {}; const app2 = { get() {}, post: (p, ...h) => { R[p] = h[h.length - 1]; } };
    const D2 = path.join(banc, 'pause'); fs.mkdirSync(D2, { recursive: true });
    fs.writeFileSync(path.join(D2, 'agents-etat.json'), JSON.stringify({ pause: { actif: true, par: 'Justin', depuis: 1, motif: 'banc' }, modes: { sarah: 'brouillon' } }));
    const ag = AG(app2, { DATA_DIR: D2, monAdmin() {}, monPatronStrict() {} });
    const cv = CV(app2, { DATA_DIR: D2, monAdmin() {}, monPatronStrict() {}, agents: ag });
    let appels = 0; const eq = EQ({ agents: ag, conversations: cv, cerveau: { penser: async () => { appels++; return rep('x'); } } });
    await eq.surMessage({ id: 'm1', fil: 'sarah', de: 'justin', texte: 'Sarah ?', prof: 0, mentions: [] });
    await eq.surMessage({ id: 'm2', fil: 'sarah', de: 'justin', texte: 'Sarah ??', prof: 0, mentions: [] });
    v('⛔ en PAUSE : aucun appel, UNE ligne « les agents sont en pause » par heure', [appels, cv.lire('sarah', 50).filter(m => m.de === 'systeme').map(m => m.texte)], [0, ['Les agents sont en pause : reprends-les dans la page Agents.']]);
  }

  console.log('\n11. « X écrit… » : posé pendant la réflexion, retiré après — même en cas d’échec');
  {
    let pendant = null;
    const H = await monter({ attente: 250, filSuivi: 'lea', script: () => rep('Voilà.') });
    const p = H.justin('lea', 'Léa, une question ?');
    await dormir(120);
    const l = await H.liste({ tous: '1' }), f = await H.fil('lea');
    pendant = [l.fils.find(x => x.fil === 'lea').ecrit.map(x => x.nom), f.ecrit.map(x => x.nom)];
    await p; await dormir(500);
    const apres = [(await H.liste({ tous: '1' })).fils.find(x => x.fil === 'lea').ecrit, (await H.fil('lea')).ecrit];
    v('⛔ pendant la réflexion : la liste et le fil disent « Léa écrit » ; après : plus rien', [pendant, apres], [[['Léa'], ['Léa']], [[], []]]);
    const E = await monter({ attente: 100, script: () => ({ ok: false, raison: 'erreur_api' }) });
    await E.justin('lea', 'Léa ?'); await dormir(300);
    v('⛔ même quand Claude échoue : retiré (sinon « Léa écrit… » pour toujours)', [(await E.fil('lea')).ecrit, (await E.messages('lea')).filter(m => m.de === 'lea').map(m => m.niveau)], [[], ['important']]);
    const X = await monter({ script: () => { throw new Error('boum'); } });
    await X.justin('lea', 'Léa ?'); await dormir(200);
    v('…et quand le cerveau JETTE : retiré aussi, rien ne casse', [(await X.fil('lea')).ecrit, (await X.messages('lea')).length], [[], 1]);
    const T = await monter({ attente: 20, script: () => rep('x') });
    T.conv.ecrit('lea', 'lea', true); T.horloge(130000);
    v('« écrit… » expire seul au bout de deux minutes (un appel resté pendu ne le laisse pas pour toujours)', T.conv.quiEcrit('lea'), []);
  }

  console.log('\n12. Ce que Claude reçoit : le fil bien formé, la charge, les tâches, rien d’une personne');
  {
    const H = await monter({ script: () => rep('Reçu.'), faits: { sante: async () => ({ ok: true, nom: 'Delta Propreté' }) } });
    H.agents.consigner('justin', 'camille', 'Tâche de Camille pour le banc {avec accolades}');
    for (let i = 0; i < 20; i++) H.conv.systeme('clients', 'Ligne du système ' + i, {});
    await H.justin('clients', 'Premier message de Justin');
    H.conv.parler('lea', 'clients', 'Réponse de Léa', { prof: 1 });
    await H.justin('clients', 'Second message de Justin, écris à jean@exemple-2880.fr ou au 06 12 34 56 78');
    await H.justin('clients', '@Léa un troisième');
    const a = H.appels[H.appels.length - 1];
    const roles = a.messages.map(m => m.role);
    v('⛔ le fil arrive bien formé : commence par user, finit par user, jamais deux tours du même rôle, les lignes du système écartées', [roles[0], roles[roles.length - 1], roles.every((r, i) => i === 0 || r !== roles[i - 1]), JSON.stringify(a.messages).includes('Ligne du système')], ['user', 'user', true, false]);
    vrai('…l’adresse et le téléphone de Justin sont masqués', /\(adresse\)/.test(JSON.stringify(a.messages)) && !/exemple-2880|06 12 34/.test(JSON.stringify(a)));
    const HM = await monter({ script: () => rep('x'), faits: { sante: async () => ({ ok: true, nom: 'Delta Propreté' }) } });
    await HM.justin('max', 'Max, la santé ?');
    vrai('⛔ la seconde barrière des faits : une chaîne libre qu’un relevé laisserait passer (un nom d’entreprise) devient `null` dans le prompt', /\nsante \{"ok":true,"nom":null\}/.test(HM.appels[0].system) && !/Delta/.test(HM.appels[0].system));
    vrai('…quinze messages au plus lui sont donnés', JSON.stringify(a.messages).split('Message de Justin').length <= 16);
    const sys = a.system;
    vrai('⛔ la CHARGE de l’équipe est un fait du prompt (« occupés : camille 1 »), avec les libres', /occupés : camille 1 ; libres : .*lea/.test(sys));
    vrai('…ses tâches en cours (aucune pour Léa) et la mémoire de ses tâches pour Camille', /Tes tâches en cours : aucune\./.test(sys));
    await H.justin('camille', 'Camille, où en es-tu ?');
    const sc = H.appels[H.appels.length - 1].system;
    vrai('…Camille voit SA tâche, avec son identifiant, qui l’a demandée, et sans accolade', /- \[[0-9a-f]{12}\] « Tâche de Camille pour le banc avec accolades » — demandée par Justin/.test(sc));
    vrai('une personnalité par agent dans le prompt, et aucun prénom de collègue (que des identifiants : un prénom d’agent peut être celui d’un client)', /Ton caractère : Chaleureuse et patiente/.test(sc) && !/Léa|Chloé|Inès|Théo|Emma/.test(sc));
    vrai('le prompt dit la règle des fils : une question reçoit TA réponse, ne la passe jamais', /Une question reçoit TA réponse, à toi qui es interrogé : tu ne la passes jamais à un collègue/.test(sc));
    vrai('…et le bloc Faits reste la dernière chose du prompt', sc.lastIndexOf('Bloc Faits') > sc.lastIndexOf('Tes tâches en cours'));
    const ro = Object.keys(EQ.PERSO).sort();
    v('(population) une ligne de caractère pour chacun des seize', [ro.length, ro.join()], [16, REG.slice().sort().join()]);
    vrai('chaque caractère est une vraie phrase, différente des autres', new Set(Object.values(EQ.PERSO)).size === 16 && Object.values(EQ.PERSO).every(p => p.length > 40));
    const rf = (await monter({ script: () => rep('x') }));
    await rf.justin('victor', 'Victor ?');
    vrai('Victor reçoit en plus les tâches de l’équipe pour redistribuer, et la règle qui l’y autorise', /Tâches en cours de l’équipe \(pour redistribuer\)/.test(rf.appels[0].system) && /tu peux redistribuer avec l’outil passer/.test(rf.appels[0].system));
    const nonV = await monter({ script: () => rep('x') });
    await nonV.justin('lea', 'Léa ?');
    vrai('…les autres, non', !/pour redistribuer/.test(nonV.appels[0].system));
  }

  console.log('\n13. Les outils : des schémas fermés');
  {
    const O = EQ.outilsDe('camille', { fils: ['camille', 'equipe'], collegues: ['lea', 'max'] });
    v('cinq outils, dans cet ordre', O.map(o => o.name), ['ecrire', 'prendre', 'passer', 'terminer', 'demander_justin']);
    vrai('⛔ chaque schéma est fermé : additionalProperties:false et tous les champs requis', O.every(o => o.input_schema.type === 'object' && o.input_schema.additionalProperties === false && Object.keys(o.input_schema.properties).every(k => o.input_schema.required.includes(k))));
    v('`ecrire` ne propose que les fils de l’agent ; `passer` que les collègues passables', [O[0].input_schema.properties.fil.enum, O[2].input_schema.properties.vers.enum], [['camille', 'equipe'], ['lea', 'max']]);
    const H = await monter({ script: () => rep('x') });
    await H.justin('camille', 'Camille ?');
    const o = H.appels[0].opts.outils;
    vrai('⛔ sur le vrai montage : `passer` ne propose NI Hugo NI Margaux NI Camille elle-même', !/hugo|margaux|camille/.test(JSON.stringify(o.find(x => x.name === 'passer').input_schema.properties.vers.enum)) && o.find(x => x.name === 'passer').input_schema.properties.vers.enum.length === 13);
    v('…et `ecrire` : son fil privé, equipe, reunions, clients (Camille est membre des clients)', o.find(x => x.name === 'ecrire').input_schema.properties.fil.enum, ['camille', 'equipe', 'clients', 'reunions']);
  }

  console.log('\n14. Les routes (vrais gestionnaires) : liste, fil, lecture incrémentale, lu');
  {
    const H = await monter({ script: () => rep('Reçu.') });
    const l0 = await H.liste();
    v('par défaut la liste d’avant : seul « Équipe » tant qu’il n’y a rien', l0.fils.map(f => f.fil), ['equipe']);
    const lt = await H.liste({ tous: '1' });
    v('?tous=1 : « Équipe », les trois groupes, puis les seize fils privés', lt.fils.map(f => f.fil), ['equipe', 'clients', 'plateforme', 'reunions', ...REG]);
    const cl = lt.fils.find(f => f.fil === 'clients');
    v('un groupe porte ses membres (id et nom), son meneur, sa nature', [cl.membres.map(m => m.id), cl.membres[0].nom, cl.meneur, cl.groupe], [CV.MEMBRES.clients, 'Léa', 'lea', true]);
    v('un fil privé : un seul membre, pas de meneur, pas un groupe', (f => [f.membres.map(m => m.id), f.meneur, f.groupe])(lt.fils.find(f => f.fil === 'max')), [['max'], '', false]);
    H.conv.parler('lea', 'clients', 'Message 1 de Léa', { prof: 1 }); H.horloge(1000);
    H.conv.parler('camille', 'clients', 'Message 2 de Camille', { prof: 1 }); H.horloge(1000);
    H.conv.parler('hugo', 'clients', 'Message 3 de Hugo', { prof: 1 });
    const f = await H.fil('clients');
    v('le fil complet, `complet:true`', [f.messages.map(m => m.texte), f.complet], [['Message 1 de Léa', 'Message 2 de Camille', 'Message 3 de Hugo'], true]);
    const inc = await H.fil('clients', { apres: f.messages[0].id });
    v('⛔ lecture INCRÉMENTALE : ?apres=<id> ne rend que les nouveaux, `complet:false`', [inc.messages.map(m => m.texte), inc.complet], [['Message 2 de Camille', 'Message 3 de Hugo'], false]);
    v('…après le dernier : rien de neuf', (await H.fil('clients', { apres: f.messages[2].id })).messages, []);
    const inconnu = await H.fil('clients', { apres: 'ffffffffffff' });
    v('…un identifiant inconnu rend le fil entier et le dit (`complet:true`)', [inconnu.messages.length, inconnu.complet], [3, true]);
    const l = (await H.liste({ tous: '1' })).fils.find(x => x.fil === 'clients');
    v('la liste : le dernier message, son heure, les non-lus de Justin', [l.dernier.texte, l.dernier.ts > 0, l.nonLus], ['Message 3 de Hugo', true, 3]);
    const inconnu2 = await H.get('/api/monitor/conversations/:fil', { fil: 'pirate' });
    v('un fil inconnu : 400, comme avant', [inconnu2.code, (await H.post('/api/monitor/conversations/envoyer', { fil: 'pirate', texte: 'x' })).code, (await H.post('/api/monitor/conversations/envoyer', { fil: 'clients', texte: '   ' })).code], [400, 400, 400]);
    const avantLu = (await H.liste({ tous: '1' })).fils.find(x => x.fil === 'clients').nonLus;
    const lu = await H.post('/api/monitor/conversations/lire', { fil: 'clients' });
    v('« lire » marque tout le groupe lu (les non-lus de Justin tombent à zéro)', [avantLu >= 3, lu.corps.lus >= 3, (await H.liste({ tous: '1' })).fils.find(x => x.fil === 'clients').nonLus], [true, true, 0]);
  }

  console.log('\n15. Les messages du système ne sont jamais des ordres');
  {
    const H = await monter({ script: () => rep('x') });
    H.conv.systeme('clients', 'Camille a pris « relancer » @hugo @tous');
    await calme();
    v('⛔ un message du système qui contient une mention ne réveille personne (et n’en garde aucune)', [H.appels.length, (await H.messages('clients'))[0].mentions], [0, []]);
    v('…une ligne du système n’est ni notifiée ni non lue', [H.pousses.length, (await H.liste({ tous: '1' })).fils.find(f => f.fil === 'clients').nonLus], [0, 0]);
    v('un fil inconnu ou un texte vide : refusés', [H.conv.systeme('pirate', 'x').raison, H.conv.systeme('clients', '   ').raison], ['fil', 'texte']);
  }

  console.log('\n16. Le cerveau avec des outils : ce qui part, ce qui revient');
  {
    const CR = require(path.join(RACINE, 'server', 'cerveau.js'));
    const reqs = []; let reponse = { texte: 'Bonjour', entree: 10, sortie: 10, stop_reason: 'end_turn', actions: [] };
    const D = path.join(banc, 'cerveau'); fs.mkdirSync(D, { recursive: true });
    const C = CR({ DATA_DIR: D, agents: { AGENTS: [{ id: 'max', plafondUsd: 15 }], peutAgir: () => ({ ok: true }), noter() {} }, cleApi: 'sk-ant-banc', appeler: async (cle, req) => { reqs.push(req); return reponse; } });
    const OUTILS = EQ.outilsDe('max', { fils: ['max'], collegues: ['lea'] });
    const msg = [{ role: 'user', content: 'Salut' }];
    let r = await C.penser('max', 's', msg, { outils: OUTILS, reflechir: true });
    const q = reqs[0];
    v('⛔ avec outils et réflexion : thinking adaptatif, 3000 jetons, les cinq outils, choix automatique', [q.thinking, q.max_tokens, q.tools.map(t => t.name), q.tool_choice], [{ type: 'adaptive' }, 3000, ['ecrire', 'prendre', 'passer', 'terminer', 'demander_justin'], { type: 'auto' }]);
    vrai('⛔ jamais temperature / top_p / top_k', !('temperature' in q) && !('top_p' in q) && !('top_k' in q));
    v('sans `reflechir`, ni outils : la requête d’avant (thinking désactivé, 600 jetons, aucune clé de plus)', await (async () => { await C.penser('max', 's', msg); const x = reqs[1]; return [x.thinking, x.max_tokens, Object.keys(x).sort()]; })(), [{ type: 'disabled' }, 600, ['max_tokens', 'messages', 'model', 'system', 'thinking']]);
    v('…et sa réponse garde sa forme d’avant (pas de clé `actions`)', Object.keys(await C.penser('max', 's', msg)).sort(), ['cout', 'ok', 'texte']);
    v('`reflechir` seul : 3000 jetons, et `maxTokens` explicite l’emporte', [(await (async () => { await C.penser('max', 's', msg, { reflechir: true }); return reqs[reqs.length - 1].max_tokens; })()), (await (async () => { await C.penser('max', 's', msg, { reflechir: true, maxTokens: 1200 }); return reqs[reqs.length - 1].max_tokens; })())], [3000, 1200]);
    reponse = { texte: '', entree: 10, sortie: 10, stop_reason: 'tool_use', actions: [{ id: 't1', nom: 'prendre', entree: { texte: 'Un travail' } }, { id: 't2', nom: 'inconnu', entree: {} }, { id: 't3', nom: 'passer', entree: 'pas un objet' }, null] };
    r = await C.penser('max', 's', msg, { outils: OUTILS, reflechir: true });
    v('⛔ une réponse SANS texte mais avec un appel d’outil est une réponse ; l’outil inconnu et la forme fausse sont écartés', [r.ok, r.texte, r.actions], [true, '', [{ id: 't1', nom: 'prendre', entree: { texte: 'Un travail' } }]]);
    reponse = { texte: 'Je réponds', entree: 10, sortie: 10, stop_reason: 'end_turn', actions: [{ id: 't1', nom: 'prendre', entree: { texte: 'x' } }] };
    r = await C.penser('max', 's', msg, { outils: [{ name: 'MAUVAIS NOM', description: 'x', input_schema: { type: 'object', properties: {} } }, { name: 'sans_schema', description: 'x' }] });
    v('des outils mal formés sont écartés (ni outils dans la requête, ni actions rendues)', [reqs[reqs.length - 1].tools, 'actions' in r], [undefined, false]);
    reponse = { texte: '', entree: 10, sortie: 3000, stop_reason: 'max_tokens', actions: [] };
    v('sans texte ni action, arrêtée par max_tokens : « trop long » (inchangé)', (await C.penser('max', 's', msg, { outils: OUTILS, reflechir: true })).raison, 'trop_long');
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(1); });
