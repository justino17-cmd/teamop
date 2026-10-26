/* 3064 — L'EXAMEN DU 26 OCTOBRE 2026 (23 h 25) : deux scénarios rouges sur neuf, et aucun ne disait une faute envers un client.
     · scénario 8 : à la réunion du lundi, Léa et Max ont DIT trois objectifs chiffrés sans appeler fixer_objectifs — « Sans objectif enregistré : Léa, Max » ;
     · scénario 9 : « n'hésitez pas » trouvé chez Léa… qui conseillait de NE PAS l'écrire, entre guillemets ;
     · scénario 9 : le juge a rendu deux fois `{"c1":true,"c2":true,"raison":…}` sans `c3`, et les trois critères sont sortis « inconnus ».
   Ce banc joue le VRAI `reunions.js` (lundi 2 novembre 2026, 9 h) avec un cerveau scripté, et les vraies fonctions d'`examen.js` (juge scripté). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3064-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();
const U = (a, m, j, h, mi) => Date.UTC(a, m - 1, j, h, mi || 0);

(async () => {
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
  const REU = require(path.join(RACINE, 'server', 'reunions.js'));
  const REG = AG.AGENTS.map(a => a.id);

  let n = 0;
  const rep = (texte, actions) => ({ ok: true, texte, actions: actions || [] });
  const outil = (nom, entree) => ({ id: 'tu_' + nom, nom, entree });
  /* la phase d'un appel : la redemande SANS outil porte « Écris maintenant, sans outil » dans son dernier message */
  const phase = t => {
    const u = t.messages[0].content, fin = t.messages[t.messages.length - 1].content;
    const redemande = /Écris maintenant, sans outil/.test(fin);
    return /Tu ouvres la réunion/.test(u) ? 'ouverture' : /Clos la réunion/.test(u) ? (redemande ? 'conclusion-redemande' : 'conclusion') : /On t’a cité/.test(u) ? 'discussion' : (redemande ? 'tour-redemande' : 'tour');
  };
  async function monter(o) {
    const Dd = path.join(banc, 'm' + (n++)); fs.mkdirSync(Dd, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    const horloge = { t: o.depart };
    const modes = {}; for (const id of REG) modes[id] = 'brouillon';
    fs.writeFileSync(path.join(Dd, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
    const agents = AG(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge.t });
    const appels = []; let eq = null, reu = null;
    const conv = CV(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, agents, maintenant: () => horloge.t, pousseNotif: () => Promise.resolve(), surMessage: m => eq.surMessage(m) });
    const cerveau = {
      etatBudget: () => ({ illisible: false, cle: true }),
      penser: async (id, system, messages, opts) => {
        const trace = { id, system, messages: JSON.parse(JSON.stringify(messages)), opts }; trace.phase = phase(trace); appels.push(trace);
        await dormir(1);
        return o.script(trace, appels.length);
      } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: {}, memoire: id => reu ? reu.memoire(id) : '' });
    reu = REU(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, agents, conversations: conv, cerveau, pousseNotif: () => Promise.resolve(), equipe: () => eq, maintenant: () => horloge.t });
    const lire = f => { try { return JSON.parse(fs.readFileSync(path.join(Dd, f), 'utf8')); } catch (x) { return null; } };
    return { appels, horloge, conv, tic: async () => { const r = reu.tic(); await reu.attendre(); return r; }, messages: () => conv.lire('reunions', 200),
      reunion: () => ((lire('agents-reunions.json') || { reunions: [] }).reunions || [])[0] };
  }

  const LUNDI = U(2026, 11, 2, 8);   // lundi 2 novembre 2026, 9 h à Paris (hiver)
  const DIT = 'Mes objectifs : relire mes courriels avant envoi (zéro erreur), contacter 5 nouveaux inscrits, un démarrage sous 7 jours pour chacun.';
  const OBJ = { objectifs: [{ texte: 'Relire chaque courriel avant envoi', mesure: 'zéro erreur au journal' }, { texte: 'Contacter les nouveaux inscrits', mesure: '5 contacts' }] };
  const lundi = (muets) => async t => {
    const u = t.messages[0].content;
    if (/Tu viens de dire, à la réunion du lundi/.test(u)) return rep('', [outil('fixer_objectifs', OBJ)]);
    if (t.phase === 'ouverture') return rep('On démarre la semaine : les faits sont sous vos yeux.');
    if (t.phase === 'tour' || t.phase === 'tour-redemande') return muets.includes(t.id) ? rep(DIT) : rep(DIT, [outil('fixer_objectifs', OBJ)]);
    if (t.phase === 'discussion') return rep('RAS');
    if (/Clos la réunion/.test(u)) return rep(/Écris maintenant, sans outil/.test(t.messages[t.messages.length - 1].content) ? 'Compte rendu du lundi. Décisions : chacun tient ses objectifs. Qui fait quoi : chacun ses dossiers. Ce qui attend Justin : rien.' : 'Compte rendu du lundi. Décisions : chacun tient ses objectifs. Qui fait quoi : chacun ses dossiers. Ce qui attend Justin : rien.', [outil('fixer_objectifs', OBJ)]);
    return rep('RAS');
  };

  console.log('\n1. Des objectifs DITS sans l’outil sont enregistrés par un second appel, qui ne peut que les enregistrer');
  {
    const H = await monter({ depart: LUNDI, script: lundi(['lea', 'max']) });
    const r = await H.tic();
    vrai('(population) la réunion du lundi a eu lieu, Léa et Max ont parlé', !!r.lancee && H.reunion() && H.reunion().type === 'objectifs' && ['lea', 'max'].every(id => H.messages().some(m => m.de === id)), JSON.stringify(r));
    const forces = H.appels.filter(a => /Tu viens de dire, à la réunion du lundi/.test(a.messages[0].content));
    v('⛔ un second appel pour Léa et pour Max, et pour eux seuls', forces.map(a => a.id).sort(), ['lea', 'max']);
    v('⛔ …qui IMPOSE fixer_objectifs (seul outil offert, `forcerOutil`), sans réflexion', forces.map(a => [a.opts.forcerOutil, (a.opts.outils || []).map(o => o.name).join(','), a.opts.reflechir === true]), [['fixer_objectifs', 'fixer_objectifs', false], ['fixer_objectifs', 'fixer_objectifs', false]]);
    vrai('…et lui rend ce que l’agent vient de dire (ses objectifs, pas d’autres)', forces.every(a => a.messages[0].content.includes(DIT) && /N’en invente pas d’autres/.test(a.messages[0].content)), forces[0] && forces[0].messages[0].content.slice(0, 300));
    vrai('⛔ plus de « Sans objectif enregistré »', !H.messages().some(m => /Sans objectif enregistré/.test(m.texte)), JSON.stringify(H.messages().filter(m => m.de === 'systeme').map(m => m.texte)));
    vrai('…et le second appel ne publie rien de plus dans le fil (un message de Léa, un de Max)', ['lea', 'max'].every(id => H.messages().filter(m => m.de === id).length === 1), JSON.stringify(H.messages().map(m => m.de)));
  }
  {
    const H = await monter({ depart: LUNDI, script: lundi([]) });
    await H.tic();
    v('ceux qui ont enregistré leurs objectifs : AUCUN second appel', H.appels.filter(a => /Tu viens de dire/.test(a.messages[0].content)).length, 0);
  }
  {
    /* le second appel ne rend rien d'utilisable : le constat reste dit */
    const H = await monter({ depart: LUNDI, script: async t => /Tu viens de dire/.test(t.messages[0].content) ? { ok: false, raison: 'vide' } : lundi(['lea'])(t) });
    await H.tic();
    vrai('un second appel qui échoue : « Sans objectif enregistré : Léa » reste DIT (rien n’est inventé)', H.messages().some(m => /Sans objectif enregistré : Léa/.test(m.texte)), JSON.stringify(H.messages().filter(m => m.de === 'systeme').map(m => m.texte)));
  }

  console.log('\n2. Le cerveau : un outil imposé n’est envoyé que sans réflexion, et seulement s’il est offert');
  {
    const CVX = require(path.join(RACINE, 'server', 'cerveau.js'));
    const Dd = path.join(banc, 'cv'); fs.mkdirSync(Dd, { recursive: true });
    const agents = { AGENTS: [{ id: 'lea', plafondUsd: 5 }], peutAgir: () => ({ ok: true }), noter() {} };
    const vues = [];
    const cv = CVX({ DATA_DIR: Dd, agents, cleApi: 'sk-ant-banc', appeler: async (cle, req) => { vues.push(req); return { texte: '', actions: [{ id: 'x', nom: 'fixer_objectifs', entree: {} }], entree: 10, sortie: 10 }; } });
    const OUT = [{ name: 'fixer_objectifs', description: 'x', input_schema: { type: 'object', properties: {} } }];
    await cv.penser('lea', 's', [{ role: 'user', content: 'u' }], { outils: OUT, forcerOutil: 'fixer_objectifs' });
    await cv.penser('lea', 's', [{ role: 'user', content: 'u' }], { outils: OUT, forcerOutil: 'fixer_objectifs', reflechir: true });
    await cv.penser('lea', 's', [{ role: 'user', content: 'u' }], { outils: OUT, forcerOutil: 'autre_outil' });
    v('⛔ imposé sans réflexion ; avec réflexion ou un outil non offert : « auto » (l’API refuserait)', vues.map(r => r.tool_choice), [{ type: 'tool', name: 'fixer_objectifs' }, { type: 'auto' }, { type: 'auto' }]);
  }

  console.log('\n3. Le ton : une formule CITÉE n’est pas une formule dite');
  {
    const EX = require(path.join(RACINE, 'server', 'examen.js'));
    vrai('⛔ le message de Léa du 26 octobre (« plutôt qu’un vague "n’hésitez pas à nous contacter" ») n’est plus accusé', !EX.formuleRobot('Je pense qu\'il faut personnaliser dès la première ligne. Et finir par une question simple plutôt qu\'un vague "n\'hésitez pas à nous contacter", ça donne quelque chose de facile.'));
    vrai('…ni entre chevrons « », ni entre guillemets courbes', !EX.formuleRobot('Évitons « n’hésitez pas à revenir vers nous ».') && !EX.formuleRobot('Bannissons “Excellente question” de nos réponses.'));
    vrai('⛔ mais la formule DITE est toujours trouvée', EX.formuleRobot('N’hésitez pas à me dire si besoin.') && EX.formuleRobot('Excellente question, Justin !') && EX.formuleRobot('Le client dit « merci », n’hésitez pas à le relancer.'));
  }

  console.log('\n4. Le juge : un critère rendu garde sa valeur, un critère absent est redemandé PAR SON NOM, puis seul « inconnu »');
  {
    const EX = require(path.join(RACINE, 'server', 'examen.js'));
    const SOIR = '{"c1":true,"c2":true,"raison":"aucun défaut majeur identifié"}';
    v('la réponse du juge de 23 h 25 se lit : c1 et c2 vrais, c3 manquant', EX.lireVerdictPartiel(SOIR, ['c1', 'c2', 'c3']), { valeurs: { c1: true, c2: true }, raison: 'aucun défaut majeur identifié', manque: ['c3'] });
    v('⛔ plusieurs objets (un par courriel) : rien de partiel — un objet manquant ne rend aucun critère vrai', EX.lireVerdictPartiel('{"c1":true} {"c1":true,"c2":true}', ['c1', 'c2']), null);
    v('une valeur dite deux fois différemment : ce critère reste inconnu', EX.lireVerdictPartiel('{"c1":true,"c1":false,"c2":false}', ['c1', 'c2']).valeurs, { c2: false });
    const demandes = [];
    const J = { penser: async (id, s, m) => { demandes.push(m[0].content); return { ok: true, texte: SOIR }; } };
    const C = [{ cle: 'humain', texte: 'ton humain' }, { cle: 'formules', texte: 'sans formule toute faite' }, { cle: 'vous', texte: 'les courriels vouvoient' }];
    const j = await EX.juger(J, C, 'des messages');
    v('⛔ deux demandes, la seconde NOMME la clé manquante et donne la forme exacte', [demandes.length, /ne portait pas c3/.test(demandes[1] || ''), /\{"c1":true,"c2":true,"c3":true,"raison":"…"\}/.test(demandes[1] || '')], [2, true, true]);
    v('⛔ le verdict garde c1 et c2 (aux clés de l’appelant), c3 seul reste absent', [j.ok, j.partiel, j.valeurs], [true, true, { humain: true, formules: true }]);
    const J2 = { penser: async () => ({ ok: true, texte: demandes.length > 2 ? '{"c1":true,"c2":false,"c3":true,"raison":"c2 : une formule répétée"}' : SOIR }) };
    demandes.push('x');
    const j2 = await EX.juger(J2, C, 'des messages');
    v('…et un juge qui, redemandé, rend tout : verdict complet, non partiel', [j2.ok, !!j2.partiel, j2.valeurs], [true, false, { humain: true, formules: false, vous: true }]);
  }

  console.log('\n════ test-3064 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });
