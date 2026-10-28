/* 3085 — L'EXAMEN DU 27 OCTOBRE 2026 (23 h 36) : 8 sur 9, le scénario 5 rouge — « Victor s'adresse à ses deux collègues ».
     « Léa et Camille ne sont pas d'accord : @Léa veut relancer tous les 2 jours, @Camille préfère une seule relance au bout de 7 jours. @Victor, tranche. »
     Camille répondait « RAS » (publié tel quel : sa position n'était jamais défendue), et Victor écrivait « [lea] [camille] » au lieu de les citer.
     Ce banc joue les VRAIS `agent-equipe.js` et `conversations.js` (cerveau scripté) et garde :
       · Justin cite un agent nommément et il répond « RAS » : UNE redemande, sans outil ; sa vraie réponse est publiée ; s'il persiste, le « RAS » reste (trace) ;
       · « @tous » : un « RAS » se tait toujours, SANS redemande ;
       · un nom de l'équipe entre crochets devient une citation (« [lea] » → « @lea », « [Léa] » aussi) ; un autre mot entre crochets ne bouge pas. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3085-'));
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

  const RELANCE = t => /Justin t’a cité directement/.test(t.messages[t.messages.length - 1].content);
  console.log('\n2. Le scénario 5, rejoué');
  {
    const M = await monter(t => {
      if (t.id === 'camille') return rep(RELANCE(t) ? '@lea @victor Je garde une seule relance à J+7 : relancer tous les deux jours, ça ressemble à du harcèlement et ça fait fuir.' : 'RAS');
      if (t.id === 'lea') return rep('Je relance à J+2 : un prospect se refroidit vite.');
      if (t.id === 'victor') return rep('[lea] [Camille] Je tranche : J+2 court, puis J+7 si rien. [note] gardée.');
      return rep('RAS');
    });
    await M.envoyer('equipe', 'Léa et Camille ne sont pas d’accord : @Léa veut relancer chaque prospect tous les 2 jours, @Camille préfère une seule relance au bout de 7 jours. @Victor, tranche.');
    await calme();
    const ms = M.fil('equipe'), cam = ms.filter(m => m.de === 'camille').map(m => m.texte), vic = ms.filter(m => m.de === 'victor').map(m => m.texte);
    vrai('(population) Camille, Léa et Victor ont été appelés', ['camille', 'lea', 'victor'].every(x => M.appels.some(a => a.id === x)), M.appels.map(a => a.id).join(','));
    vrai('⛔ Camille, citée par Justin, répond « RAS » : elle est redemandée UNE fois', M.appels.filter(a => a.id === 'camille' && RELANCE(a)).length === 1);
    vrai('⛔ …et c’est sa POSITION qui est publiée, jamais « RAS »', cam.some(x => /J\+7/.test(x)) && !cam.some(x => /^\s*RAS\s*$/i.test(x)), JSON.stringify(cam));
    vrai('⛔ Victor : « [lea] [Camille] » devient « @lea @camille »', vic.some(x => x.startsWith('@lea @camille Je tranche')), JSON.stringify(vic));
    vrai('…et un autre mot entre crochets ne bouge pas (« [note] »)', vic.some(x => /\[note\]/.test(x)), JSON.stringify(vic));
    vrai('la redemande est faite SANS outil', M.appels.filter(a => a.id === 'camille' && RELANCE(a)).every(a => !a.opts || !a.opts.outils));
  }
  console.log('\n3. Les autres cas');
  {
    const M = await monter(t => rep(t.id === 'camille' ? 'RAS' : 'Rien de mon côté.'));
    await M.envoyer('equipe', '@Camille, tu as un avis sur le rythme des relances ?');
    await calme();
    const cam = M.fil('equipe').filter(m => m.de === 'camille').map(m => m.texte);
    v('Camille persiste (« RAS » deux fois) : le « RAS » s’écrit, une question de Justin ne reste jamais sans trace', [M.appels.filter(a => a.id === 'camille').length, cam], [2, ['RAS']]);
  }
  {
    const M = await monter(t => rep('RAS'));
    await M.envoyer('clients', '@tous, une idée pour les relances ?');
    await calme();
    v('« @tous » : un « RAS » se tait, SANS redemande', [M.fil('clients').length, M.appels.some(RELANCE)], [0, false]);
  }

  console.log('\ntest-3085 : ' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); process.exit(1); });
