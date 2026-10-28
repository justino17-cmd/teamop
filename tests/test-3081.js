/* 3081 — L'EXAMEN DU 27 OCTOBRE 2026 (14 h 49) : 8 sur 9, le scénario 9 rouge — « sans formule toute faite ».
     À « @tous, une idée pour que les prospects répondent plus vite ? » dans le groupe Clients, quatre agents « plussoyaient Léa » et trois ouvraient par
     « Côté X, ça m'arrange… ». Ce banc joue les VRAIS `agent-equipe.js`, `conversations.js` (cerveau scripté) et garde :
       · une réponse de groupe qui APPROUVE un collègue, ou qui ouvre comme un collègue vient d'ouvrir, est redemandée une fois, sans outil ;
       · la seconde version est prise si elle n'a plus le tic ; à une question posée à TOUS, un « RAS » (ou un tic qui résiste) se tait ;
       · un fil privé, ou une question nominative de Justin, n'est jamais tu ; une première réponse sans tic n'est pas redemandée (aucun appel de plus). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3081-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();

(async () => {
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
  const REG = AG.AGENTS.map(a => a.id);
  const rep = texte => ({ ok: true, texte, actions: [] });
  const redemande = t => /Ta réponse ne passe pas/.test(t.messages[t.messages.length - 1].content);

  console.log('\n1. Le détecteur (sans serveur)');
  const T = EQ.ticDeGroupe;
  v('approuver un collègue est un tic (« je plussoie », « je confirme l’intérêt de », « d’accord avec », « je suis d’accord »)',
    ['Je plussoie Léa : court et concret.', 'Côté offre, je confirme l’intérêt de Léa.', 'D’accord avec @lea, et en plus…', 'Je suis tout à fait d’accord.'].map(x => !!T(x, [])), [true, true, true, true]);
  v('ouvrir comme un collègue vient d’ouvrir (« Côté … ») est un tic — y compris derrière une @mention ; seul, non',
    [!!T('Côté rendez-vous, ça m’arrange.', ['Côté facturation, ok.']), !!T('@hugo Côté paiement, rien.', ['Côté support, oui.']), !!T('Côté rendez-vous, ok.', []), !!T('Côté rendez-vous, ok.', ['Un courriel court marche mieux.'])],
    [true, true, false, false]);
  v('une réponse propre n’est pas un tic (pas de faux positif sur « côtelette », « confirmé », « accord commercial »)',
    ['Un premier courriel court, avec une question sur leur activité.', 'Côtelette et frites ce midi.', 'Le paiement est confirmé.', 'L’accord commercial est signé.'].map(x => T(x, ['Côté support, oui.'])), ['', '', '', '']);

  const n = { i: 0 };
  async function monter(script) {
    const D = path.join(banc, 'm' + (n.i++)); fs.mkdirSync(D, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    const modes = {}; for (const id of REG) modes[id] = 'brouillon';
    fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
    require('./banc-horaires.js').toujoursOuvert(D);
    const agents = AG(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {} });
    const appels = []; let eq = null;
    const conv = CV(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, agents, pousseNotif: () => Promise.resolve(), surMessage: m => eq.surMessage(m) });
    const cerveau = { etatBudget: () => ({ illisible: false, cle: true }),
      penser: async (id, system, messages, opts) => { const t = { id, system, messages: JSON.parse(JSON.stringify(messages)), opts }; appels.push(t); await dormir(1); return script(t); } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: {}, memoire: () => '' });
    const res = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
    const envoyer = async (fil, texte) => { const r = res(); await routes.post['/api/monitor/conversations/envoyer']({ body: { fil, texte }, tourUser: { nom: 'Justin' }, query: {} }, r); return r; };
    return { appels, conv, envoyer, fil: f => conv.lire(f, 100).filter(m => m.de !== 'justin' && m.de !== 'systeme') };
  }
  const calme = async () => { for (let i = 0; i < 12; i++) await dormir(30); };

  console.log('\n2. « @tous » dans le groupe Clients : les tics de l’examen, rejoués');
  {
    const PREMIER = {
      lea: 'Un premier courriel court, avec une question concrète sur leur activité.',
      chloe: 'Je plussoie Léa : avec des détails concrets, ma proposition est plus ciblée.',
      camille: 'Côté support, les clients répondent quand on reprend un mot exact de leur demande.',
      margaux: 'Côté facturation, ça m’arrange aussi, je plussoie Léa et Camille.',
      emma: 'Côté rendez-vous, ça m’arrange aussi : je plussoie Léa et Camille.',
      hugo: 'RAS' };
    const SECOND = {
      chloe: 'Pour la proposition sur mesure, une seule question chiffrée suffit : le nombre de techniciens.',
      margaux: 'RAS',
      emma: 'Je plussoie encore, c’est vraiment bien.' };
    const H = await monter(t => rep(redemande(t) ? (SECOND[t.id] || 'RAS') : (PREMIER[t.id] || 'RAS')));
    await H.envoyer('clients', '@tous, une idée pour que les prospects répondent plus vite à nos premiers courriels ?');
    await calme();
    const dits = H.fil('clients');
    vrai('(population) les six membres ont été réveillés', ['lea', 'chloe', 'camille', 'hugo', 'margaux', 'emma'].every(id => H.appels.some(a => a.id === id)), JSON.stringify(H.appels.map(a => a.id)));
    v('ceux qui ont à dire répondent ; la seconde version de Chloé (sans tic) est prise', dits.map(m => m.de + ' : ' + m.texte).sort(), [
      'camille : Côté support, les clients répondent quand on reprend un mot exact de leur demande.',
      'chloe : Pour la proposition sur mesure, une seule question chiffrée suffit : le nombre de techniciens.',
      'lea : Un premier courriel court, avec une question concrète sur leur activité.']);
    v('⛔ aucun message de groupe n’approuve un collègue ni ne reprend une ouverture', dits.filter(m => /plussoie/i.test(m.texte) || dits.filter(x => /^Côté/.test(x.texte)).length > 1).length, 0);
    v('⛔ « RAS » à une question posée à TOUS ne s’écrit pas (Hugo, Margaux) ; un tic qui résiste à la redemande non plus (Emma)', ['hugo', 'margaux', 'emma'].map(id => dits.some(m => m.de === id)), [false, false, false]);
    v('redemandés : Chloé, Margaux et Emma — une fois chacun, jamais Léa ni Camille', H.appels.filter(redemande).map(a => a.id).sort(), ['chloe', 'emma', 'margaux']);
    vrai('la redemande dit POURQUOI et cite la réponse refusée', H.appels.filter(redemande).every(a => /Ta réponse refusée : « /.test(a.messages[a.messages.length - 1].content) && /approuves|ouvres comme/.test(a.messages[a.messages.length - 1].content)));
    vrai('la redemande se fait SANS outil', H.appels.filter(redemande).every(a => !a.opts.outils));
    vrai('la règle est dite dans le prompt de chaque agent', H.appels.every(a => /Tu n’approuves pas un collègue/.test(a.system)));
  }

  console.log('\n3. Ce qui ne doit PAS changer');
  {
    const H = await monter(t => rep(redemande(t) ? 'Je plussoie encore.' : t.id === 'camille' ? 'Je suis d’accord avec Léa sur ce point.' : 'RAS'));
    await H.envoyer('clients', '@Camille, ton avis sur la relance de Léa ?');
    await calme();
    v('une question NOMINATIVE de Justin : la réponse n’est jamais tue (tic qui résiste → l’original reste)', H.fil('clients').map(m => m.de + ' : ' + m.texte), ['camille : Je suis d’accord avec Léa sur ce point.']);
    const P = await monter(t => rep(redemande(t) ? 'x' : 'Je plussoie, Justin.'));
    await P.envoyer('lea', 'Léa, d’accord avec ma relance ?');
    await calme();
    v('un fil PRIVÉ n’est jamais redemandé (personne d’autre à reprendre)', [P.fil('lea').map(m => m.texte), P.appels.filter(redemande).length], [['Je plussoie, Justin.'], 0]);
    const Q = await monter(t => rep('RAS'));
    await Q.envoyer('clients', '@Hugo, une question pour toi ?');
    await calme();
    v('« RAS » à une question NOMINATIVE de Justin s’écrit (sa question garde une trace)', Q.fil('clients').map(m => m.de + ' : ' + m.texte), ['hugo : RAS']);
  }
  console.log('\ntest-3081 : ' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\ntest-3081 : ' + ok + ' ✓ ' + (ko + 1) + ' ✗'); process.exit(1); });
