/* ⛔ CE QUE CE FICHIER GARDE — LE CERVEAU : CE QUI PART VRAIMENT CHEZ CLAUDE (22 octobre 2026).
     Le module `cerveau.js`, appel injecté PUIS la vraie fonction d'appel (SDK, `fetch` remplacé dans ce processus) :
       · la requête porte `thinking: { type: 'disabled' }` — sans lui, Claude Sonnet 5 réfléchit d'office sur le dos de `max_tokens` et la
         réponse revient VIDE (un agent muet sans le dire) ;
       · JAMAIS `temperature`, `top_p` ni `top_k` (refusés en 400 depuis le 21 octobre 2026) — ni dans l'appel injecté, ni sur le fil ;
       · `opts.maxTokens` : 600 par défaut (inchangé), borné entre 100 et 4000, une valeur qui n'est pas un nombre retombe sur 600 ;
       · une réponse SANS texte arrêtée par `max_tokens` rend `trop_long` (et le journal le dit) — pas `vide` ; la même sans cet arrêt reste
         `vide` ; une réponse AVEC texte, même coupée, reste une réponse ;
       · rien de tout ça n'affaiblit le reste (budget, plafonds, arrêt : `test-2708`).
     Un motif de ce banc vise la REQUÊTE reçue par le faux appel (l'objet réel, puis le corps JSON réel sur le fil), jamais le texte du module. */
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2860-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); process.exit(1); }, 60000).unref();
console.log('\n── 2860 · le cerveau : thinking, longueur, jamais de réglage refusé ──');
(async () => {
  const sdr = path.join(RACINE, 'server', 'node_modules', '@anthropic-ai', 'sdk');
  if (!fs.existsSync(sdr)) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const cerv = require(path.join(RACINE, 'server', 'cerveau.js'));
  const AG = [{ id: 'max', plafondUsd: 15 }];
  const notes = [];
  let n = 0;
  function monter(o) {
    o = o || {}; const D = path.join(banc, 'm' + (n++)); fs.mkdirSync(D, { recursive: true }); const appels = [];
    const ctx = { DATA_DIR: D, agents: { AGENTS: AG, peutAgir: () => ({ ok: true, mode: 'brouillon' }), noter: (id, a, x) => notes.push([id, a, x && x.resultat, x && x.detail]) }, cleApi: 'sk-ant-banc' };
    if (o.reel !== true) ctx.appeler = o.appeler || (async (cle, req) => { appels.push(req); return { texte: 'Bonjour Justin', entree: 100, sortie: 50, stop_reason: 'end_turn' }; });
    return { c: cerv(ctx), appels };
  }
  const msg = [{ role: 'user', content: 'Salut' }];

  console.log('\n1. La requête, vue par l’appel injecté');
  let M = monter();
  let r = await M.c.penser('max', 'Tu es Max', msg);
  const q = M.appels[0];
  v('un appel permis rend le texte', [r.ok, r.texte], [true, 'Bonjour Justin']);
  v('⛔ thinking : { type: "disabled" } part avec la requête', q.thinking, { type: 'disabled' });
  v('…et c’est tout ce qu’elle porte : modèle, jetons, thinking, system, messages (le modèle reste claude-sonnet-5)', [Object.keys(q).sort(), q.model], [['max_tokens', 'messages', 'model', 'system', 'thinking'], 'claude-sonnet-5']);
  vrai('⛔ ni temperature, ni top_p, ni top_k', !('temperature' in q) && !('top_p' in q) && !('top_k' in q));
  v('sans opts : 600 jetons (inchangé)', q.max_tokens, 600);

  console.log('\n2. opts.maxTokens : borné, jamais un défaut qui change en silence');
  const jetons = async (opts) => { const X = monter(); await X.c.penser('max', 's', msg, opts); return X.appels[0].max_tokens; };
  v('1500 passe tel quel', await jetons({ maxTokens: 1500 }), 1500);
  v('les bornes passent : 100 et 4000', [await jetons({ maxTokens: 100 }), await jetons({ maxTokens: 4000 })], [100, 4000]);
  v('en dessous de 100 : 100', [await jetons({ maxTokens: 50 }), await jetons({ maxTokens: 0 }), await jetons({ maxTokens: -5 })], [100, 100, 100]);
  v('au-dessus de 4000 : 4000 (un agent qui boucle ne fait pas payer une réponse sans fin)', [await jetons({ maxTokens: 4001 }), await jetons({ maxTokens: 1e9 })], [4000, 4000]);
  v('un décimal est tronqué à l’entier : 250,7 → 250', await jetons({ maxTokens: 250.7 }), 250);
  v('pas un nombre (texte, NaN, Infinity, null, objet) : 600, pas 100 ni 4000', [await jetons({ maxTokens: '800' }), await jetons({ maxTokens: NaN }), await jetons({ maxTokens: Infinity }), await jetons({ maxTokens: null }), await jetons({ maxTokens: {} })], [600, 600, 600, 600, 600]);
  v('opts absent, null, ou sans maxTokens : 600', [await jetons(undefined), await jetons(null), await jetons({}), await jetons('x')], [600, 600, 600, 600]);
  v('opts ne laisse PASSER aucun autre réglage dans la requête (temperature, top_p, top_k, model…)', await (async () => { const X = monter(); await X.c.penser('max', 's', msg, { maxTokens: 300, temperature: 0.2, top_p: 0.9, top_k: 5, model: 'autre', thinking: { type: 'enabled' } }); const t = X.appels[0]; return [t.thinking, t.model, 'temperature' in t, 'top_p' in t, 'top_k' in t, t.max_tokens]; })(), [{ type: 'disabled' }, 'claude-sonnet-5', false, false, false, 300]);

  console.log('\n3. Une réponse sans texte : « trop long » n’est pas « vide »');
  M = monter({ appeler: async () => ({ texte: '', entree: 100, sortie: 600, stop_reason: 'max_tokens' }) });
  const nNotes = notes.length;
  r = await M.c.penser('max', 's', msg);
  v('sans texte + max_tokens → trop_long', [r.ok, r.raison], [false, 'trop_long']);
  vrai('…le journal le dit (erreur, avec la limite)', notes.slice(nNotes).some(x => x[0] === 'max' && x[2] === 'erreur' && /max_tokens 600/.test(x[3])));
  v('…et la réponse a coûté (jetons rendus par l’API) : le budget le sait', M.c.etatBudget().parAgent.max > 0, true);
  M = monter({ appeler: async () => ({ texte: '   ', entree: 10, sortie: 10, stop_reason: 'end_turn' }) });
  v('sans texte et SANS cet arrêt → toujours « vide »', (await M.c.penser('max', 's', msg)).raison, 'vide');
  M = monter({ appeler: async () => ({ texte: '', entree: 10, sortie: 10 }) });
  v('sans texte et sans motif d’arrêt connu → « vide »', (await M.c.penser('max', 's', msg)).raison, 'vide');
  M = monter({ appeler: async () => ({ texte: 'Une réponse coupée mais réelle', entree: 10, sortie: 600, stop_reason: 'max_tokens' }) });
  r = await M.c.penser('max', 's', msg);
  v('AVEC du texte, même arrêtée par max_tokens, c’est une réponse', [r.ok, r.texte], [true, 'Une réponse coupée mais réelle']);

  console.log('\n4. La vraie fonction d’appel (SDK), `fetch` remplacé : ce qui part SUR LE FIL');
  const vraiFetch = globalThis.fetch; const recus = []; let scenario = 'ok';
  globalThis.fetch = async function (url, opts) {
    const u = String(url && url.url || url);
    if (!u.startsWith('https://api.anthropic.com/')) return vraiFetch.apply(this, arguments);
    recus.push({ u, corps: JSON.parse(String(opts && opts.body)), entetes: opts && opts.headers });
    const contenu = scenario === 'max' ? [] : [{ type: 'text', text: 'Bonjour depuis le faux Claude' }];
    return new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: scenario === 'max' ? 'max_tokens' : 'end_turn', content: contenu, usage: { input_tokens: 40, output_tokens: 20 } }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  try {
    M = monter({ reel: true });
    r = await M.c.penser('max', 'Tu es Max', msg, { maxTokens: 321 });
    v('l’appel réel aboutit et rend le texte', [r.ok, r.texte], [true, 'Bonjour depuis le faux Claude']);
    const w = recus[0] && recus[0].corps;
    v('⛔ sur le fil : thinking désactivé, 321 jetons, le modèle, system et messages', w && [w.thinking, w.max_tokens, w.model, w.system, w.messages], [{ type: 'disabled' }, 321, 'claude-sonnet-5', 'Tu es Max', msg]);
    vrai('⛔ sur le fil : ni temperature, ni top_p, ni top_k', w && !('temperature' in w) && !('top_p' in w) && !('top_k' in w));
    scenario = 'max';
    r = await M.c.penser('max', 'Tu es Max', msg);
    v('l’arrêt « max_tokens » traverse la vraie fonction : trop_long', [r.ok, r.raison], [false, 'trop_long']);
  } finally { globalThis.fetch = vraiFetch; }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(1); });
