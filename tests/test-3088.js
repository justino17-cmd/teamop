/* 3088 — SUPPRIMER UN MESSAGE DE LA MESSAGERIE DES AGENTS (28 octobre 2026, Justin : « il faudrait aussi que je puisse supprimer les messages »).
     Le VRAI `conversations.js` (faux app, routes appelées à la main) et les VRAIES fonctions de la Tour (`msBulleHtml`, `messMessageSupprimer`) :
       · la route : patron seul (montée sous monPatronStrict), identifiant mal formé 400, inconnu 404, supprimé : il sort du registre et du fichier ;
       · ⛔ tout ou rien : un registre qui ne s'écrit pas GARDE le message (503) ;
       · n'importe quel message : de Justin, d'un agent, du système ; et les agents ne le relisent plus (`lire`) ;
       · la Tour : chaque bulle et chaque ligne du système portent « Supprimer » (nommé), la suppression demande confirmation, retire la bulle,
         et un 404 (déjà supprimé ailleurs) la retire aussi ; un refus la garde. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3088-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });

(async () => {
  console.log('\n1. La route (le vrai conversations.js)');
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const routes = { get: {}, post: {} }, gardes = {};
  const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; gardes['GET ' + p] = h.slice(0, -1); }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; gardes['POST ' + p] = h.slice(0, -1); } };
  const patron = function monPatronStrict() {};
  const modes = {}; for (const a of AG.AGENTS) modes[a.id] = 'brouillon';
  fs.writeFileSync(path.join(banc, 'agents-etat.json'), JSON.stringify({ pause: { actif: false }, modes }));
  require('./banc-horaires.js').toujoursOuvert(banc);
  const agents = AG(app, { DATA_DIR: banc, monAdmin() {}, monPatronStrict: patron });
  const conv = CV(app, { DATA_DIR: banc, monAdmin() {}, monPatronStrict: patron, agents, pousseNotif: () => Promise.resolve() });
  const res = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
  const post = (p, b) => { const r = res(); routes.post[p]({ body: b, tourUser: { nom: 'Justin' }, query: {} }, r); return r; };
  vrai('la route existe, montée sous la garde du patron (monPatronStrict)', !!routes.post['/api/monitor/conversations/supprimer'] && gardes['POST /api/monitor/conversations/supprimer'].includes(patron));
  const e1 = post('/api/monitor/conversations/envoyer', { fil: 'victor', texte: 'Message de Justin à supprimer' });
  const a1 = conv.parler('victor', 'victor', 'Réponse de Victor, à supprimer aussi', {});
  conv.systeme('victor', 'Une ligne du système');
  const sys = conv.lire('victor', 50).filter(m => m.de === 'systeme')[0];
  vrai('(population) trois messages dans le fil de Victor : Justin, Victor, le système', [e1.code === 200, a1.ok, !!sys].every(Boolean) && conv.lire('victor', 50).length === 3);
  v('identifiant mal formé : 400 ; inconnu : 404', [post('/api/monitor/conversations/supprimer', { id: 'pas un id' }).code, post('/api/monitor/conversations/supprimer', { id: 'abcdef123456' }).code], [400, 404]);
  const r1 = post('/api/monitor/conversations/supprimer', { id: e1.corps.message.id });
  v('le message de Justin est supprimé (200, et il dit son fil)', [r1.code, r1.corps.fil], [200, 'victor']);
  v('…celui de Victor et la ligne du système aussi', [post('/api/monitor/conversations/supprimer', { id: a1.id }).code, post('/api/monitor/conversations/supprimer', { id: sys.id }).code], [200, 200]);
  v('⛔ les agents ne les relisent plus (le fil est vide), et le fichier non plus', [conv.lire('victor', 50).length, JSON.parse(fs.readFileSync(path.join(banc, 'agents-messages.json'), 'utf8')).filter(m => m.fil === 'victor').length], [0, 0]);
  v('le même identifiant une seconde fois : 404', post('/api/monitor/conversations/supprimer', { id: a1.id }).code, 404);
  const e2 = post('/api/monitor/conversations/envoyer', { fil: 'victor', texte: 'Celui-ci doit rester' });
  const F = path.join(banc, 'agents-messages.json'), tmp = F + '.tmp';
  fs.mkdirSync(tmp);   // le renommage du temporaire échoue : l'écriture rate
  const r3 = post('/api/monitor/conversations/supprimer', { id: e2.corps.message.id });
  fs.rmdirSync(tmp);
  v('⛔ un registre qui ne s’écrit pas GARDE le message (503)', [r3.code, conv.lire('victor', 50).some(m => m.id === e2.corps.message.id)], [503, true]);
  const rc = conv.rappelClient('lea', 'DOS-000123', Object.keys(conv.MOTIFS)[0]);
  v('⛔ un rappel client NON LU ne se supprime pas (409) — il n’existe qu’ici', [rc.ok, post('/api/monitor/conversations/supprimer', { id: rc.id }).code, conv.lire('lea', 50).some(m => m.id === rc.id)], [true, 409, true]);
  post('/api/monitor/conversations/lire', { fil: 'lea' });
  v('…une fois le fil ouvert (lu), il se supprime', [post('/api/monitor/conversations/supprimer', { id: rc.id }).code, conv.lire('lea', 50).some(m => m.id === rc.id)], [200, false]);
  const IDX = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
  vrai('le geste est journalisé (MON_GESTES), sans le texte', /'conversations\/supprimer': 'a supprimé un message de la messagerie des agents'/.test(IDX));

  console.log('\n2. La Tour (les vraies fonctions)');
  const T = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
  const fn = nom => { const i = T.indexOf('function ' + nom + '('); if (i < 0) return ''; let d = 0, j = T.indexOf('{', i); for (; j < T.length; j++) { if (T[j] === '{') d++; else if (T[j] === '}') { d--; if (!d) break; } } return T.slice(i, j + 1); };
  const src = ['msBulleHtml', 'messMessageSupprimer'].map(fn);
  vrai('(population) les deux fonctions sont trouvées', src.every(x => x.length > 100));
  const posts = [], toasts = [];
  let reponse = { ok: true, status: 200 }, confirme = true;
  const ctx = { esc: s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]), fmtHeure: () => '09:00', agAvatar: () => '<i></i>', msColorer: t => t,
    MS: { msgs: [], dernier: '', supEnVol: false }, confirm: () => confirme, toast: t => toasts.push(t), INJOIGNABLE: 'injoignable', peint: 0,
    apiPost: (p, b) => { posts.push([p, b]); return Promise.resolve(reponse); } };
  ctx.messPeindreFil = () => { ctx.peint++; };
  vm.createContext(ctx); vm.runInContext(src.join('\n'), ctx);
  const b1 = ctx.msBulleHtml({ id: 'a1', de: 'lea', texte: 'x', ts: 0 }, [], { lea: { nom: 'Léa', role: 'r' } }), b2 = ctx.msBulleHtml({ id: 's1', de: 'systeme', texte: 'y', ts: 0 }, [], {});
  vrai('une bulle et une ligne du système portent « Supprimer », nommé, avec leur identifiant', [b1, b2].every(h => /data-act="msgSupprimer"/.test(h) && /aria-label="Supprimer ce message"/.test(h)) && /data-id="a1"[^>]*aria-label/.test(b1) && /data-id="s1"[^>]*aria-label/.test(b2));
  ctx.MS.msgs = [{ id: 'a1', texte: 'un' }, { id: 'a2', texte: 'deux' }]; ctx.MS.dernier = 'a2';
  confirme = false; await ctx.messMessageSupprimer('a2');
  v('sans confirmation : rien ne part', [posts.length, ctx.MS.msgs.length], [0, 2]);
  confirme = true; await ctx.messMessageSupprimer('a2');
  v('confirmé : la route est appelée, la bulle sort, « dernier » recule, le fil est repeint', [posts[0], ctx.MS.msgs.map(m => m.id), ctx.MS.dernier, ctx.peint > 0], [['/api/monitor/conversations/supprimer', { id: 'a2' }], ['a1'], 'a1', true]);
  reponse = { ok: false, status: 503, d: { error: 'Suppression non enregistrée : le message reste' } }; await ctx.messMessageSupprimer('a1');
  v('⛔ un refus GARDE la bulle et dit pourquoi', [ctx.MS.msgs.length, toasts[toasts.length - 1]], [1, 'Suppression non enregistrée : le message reste']);
  reponse = { ok: false, status: 404 }; await ctx.messMessageSupprimer('a1');
  v('un 404 (déjà supprimé ailleurs) la retire aussi', ctx.MS.msgs.length, 0);

  console.log(`\n════ test-3088 : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
