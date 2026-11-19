/* test-3299 — AGENTS RETIRÉS (19 novembre 2026) : le VRAI `cerveau.js`, un faux Anthropic qui COMPTE les appels (deux façons : l'appelant injecté ET le vrai SDK
   contre un serveur local, variable ANTHROPIC_BASE_URL). Par défaut — réglage absent, `retires:true`, tout ce qui n'est pas `false` — : 0 appel, clé posée ou non,
   agent en pause ou non, budget intact, réponse propre `{ ok:false, erreur:'agents_retires' }`, jamais une exception. Avec `retires:false` explicite : le moteur d'avant.
   Et le code : le verrou est la PREMIÈRE instruction de `penser`, et le seul chemin des agents vers Anthropic (`appelerAnthropic`) n'a pas d'autre appelant.
   Modules joués : server/cerveau.js. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (n, c, d) => { if (c) { ok++; console.log('  ✓ ' + n); } else { ko++; console.log('  ✗ ' + n + (d ? ' — ' + d : '')); } };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b3299-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} });
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  (server/node_modules absent : partie SDK sautée)'); }
const cerveau = require(path.join(RACINE, 'server', 'cerveau.js'));
const AG = require(path.join(RACINE, 'server', 'agents.js'));
const GRAND = { agentMin: 1e9, nonRacine: 1e9, filet: 1e9 };

(async () => {
  console.log('\n── test-3299 : agents retirés ──');
  let appels = 0, enPause = false, d = 0;
  const faux = { AGENTS: AG.AGENTS, peutAgir: () => (enPause ? { ok: false, raison: 'pause' } : { ok: true }), noter: () => {} };
  const appeler = async () => { appels++; return { texte: 'ok', entree: 10, sortie: 10, stop_reason: 'end_turn', recherches: 0 }; };
  const monter = extra => { const D = path.join(tmp, 'c' + (d++)); fs.mkdirSync(D, { recursive: true }); return { D, c: cerveau(Object.assign({ DATA_DIR: D, agents: faux, appeler, plafondsJour: GRAND }, extra)) }; };
  const penser = c => c.penser('camille', 'système', [{ role: 'user', content: 'bonjour' }]);

  console.log('\n1. Par défaut : aucun appel');
  const cas = { 'réglage absent, clé posée': { cleApi: 'sk-ant-banc' }, 'réglage absent, sans clé': {}, 'retires:true, clé posée': { cleApi: 'sk-ant-banc', retires: true },
    'retires:undefined': { cleApi: 'k', retires: undefined }, 'retires:null': { cleApi: 'k', retires: null }, 'retires:"false" (texte)': { cleApi: 'k', retires: 'false' }, 'retires:0': { cleApi: 'k', retires: 0 } };
  for (const [nom, extra] of Object.entries(cas)) for (const pause of [false, true]) {
    enPause = pause; appels = 0;
    const { D, c } = monter(extra); let r, levee = null;
    try { r = await penser(c); } catch (e) { levee = e; }
    vrai('⛔ ' + nom + (pause ? ', agent en pause' : '') + ' : 0 appel, réponse propre, rien au budget',
      !levee && appels === 0 && r && r.ok === false && r.erreur === 'agents_retires' && !fs.existsSync(path.join(D, 'agents-budget.json')) && c.etatBudget().total === 0, JSON.stringify(r) + ' appels=' + appels);
  }
  enPause = false;

  console.log('\n2. Avec `retires:false` explicite : le moteur d\'avant');
  appels = 0; const A = monter({ cleApi: 'k', retires: false });
  const r2 = await penser(A.c);
  vrai('un appel part, la réponse est rendue, le budget bouge', appels === 1 && r2.ok === true && A.c.etatBudget().total > 0, JSON.stringify(r2));
  appels = 0; const B = monter({ retires: false });
  vrai('…et sans clé : « pas_de_cle » comme avant (rien n\'est inventé)', (await penser(B.c)).raison === 'pas_de_cle' && appels === 0);

  console.log('\n3. Le vrai SDK contre un faux Anthropic local : 0 requête par défaut');
  if (fs.existsSync(path.join(RACINE, 'server', 'node_modules', '@anthropic-ai'))) {
    let reqs = 0;
    const srv = http.createServer((q, s) => { reqs++; q.resume(); q.on('end', () => { s.writeHead(200, { 'content-type': 'application/json' }); s.end(JSON.stringify({ id: 'm', type: 'message', role: 'assistant', model: 'x', content: [{ type: 'text', text: 'ok' }], stop_reason: 'end_turn', usage: { input_tokens: 5, output_tokens: 5 } })); }); });
    await new Promise(r => srv.listen(0, '127.0.0.1', r));
    process.env.ANTHROPIC_BASE_URL = 'http://127.0.0.1:' + srv.address().port;
    const sansAppeler = extra => { const D = path.join(tmp, 'c' + (d++)); fs.mkdirSync(D, { recursive: true }); return cerveau(Object.assign({ DATA_DIR: D, agents: faux, plafondsJour: GRAND }, extra)); };
    reqs = 0; const r3 = await sansAppeler({ cleApi: 'sk-ant-banc' }).penser('camille', 's', [{ role: 'user', content: 'x' }]);
    vrai('⛔ défaut : aucune requête n\'atteint le réseau', reqs === 0 && r3.erreur === 'agents_retires', 'reqs=' + reqs);
    reqs = 0; const r4 = await sansAppeler({ cleApi: 'sk-ant-banc', retires: false }).penser('camille', 's', [{ role: 'user', content: 'x' }]);
    vrai('contre-épreuve : avec `retires:false`, la requête part bien (le faux serveur la compte)', reqs === 1 && r4.ok === true, 'reqs=' + reqs + ' ' + JSON.stringify(r4));
    srv.close();
  } else vrai('(SDK absent : partie sautée)', true);

  console.log('\n4. Le code');
  const strip = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const cv = strip(fs.readFileSync(path.join(RACINE, 'server', 'cerveau.js'), 'utf8'));
  const i = cv.indexOf('async function penser(');
  vrai('le verrou est la PREMIÈRE instruction de `penser`', i > 0 && /^async function penser\([^)]*\) \{\s*if \(retires\) return \{ ok: false, erreur: 'agents_retires'/.test(cv.slice(i)));
  vrai('le défaut se lit « retires !== false » (verrouillé sauf réglage explicite)', /const retires = ctx\.retires !== false;/.test(cv));
  let autres = [];
  for (const f of fs.readdirSync(path.join(RACINE, 'server')).filter(x => x.endsWith('.js') && x !== 'cerveau.js')) {
    const s = strip(fs.readFileSync(path.join(RACINE, 'server', f), 'utf8'));
    if (/appelerAnthropic/.test(s)) autres.push(f + ':appelerAnthropic');
  }
  vrai('`appelerAnthropic` n\'a aucun appelant hors de cerveau.js', autres.length === 0, autres.join(', '));
  const ix = strip(fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8'));
  vrai('index.js : verrou par défaut, minuterie de la plateforme éteinte, clé non lue quand retirés', /const AGENTS_RETIRES = !\(config\.agents && config\.agents\.retires === false\);/.test(ix) && /if \(!AGENTS_RETIRES\) plateformeMod\.demarrer\(\)/.test(ix) && /cleApi: AGENTS_RETIRES \? ''/.test(ix) && !/cleCerveauPosee: !!\(config\.agents/.test(ix));
  const tour = strip(fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8'));
  vrai('tour.html : la page porte AGENTS_RETIRES_ECRAN=true et l\'onglet Agents n\'a aucune commande (ni Reprendre, ni mode) quand il est vrai', /var AGENTS_RETIRES_ECRAN=true;/.test(tour) && /function vueAgents\(\)\{\s*if\(typeof AGENTS_RETIRES_ECRAN!=='undefined'&&AGENTS_RETIRES_ECRAN===true\) return enTete\([^;]*Agents retirés le 19 novembre 2026[^;]*;\s*var tete/.test(tour) && !/Agents retirés le 19 novembre 2026[^;]*(<button|onclick)/.test(tour));
  const sh = fs.readFileSync(path.join(RACINE, 'server', 'set-agents.sh'), 'utf8');
  vrai('set-agents.sh ne pose plus de clé : il propose de SUPPRIMER agents.cleApi (écriture atomique, 600, rien d\'affiché)', /RETIRÉS/.test(sh) && /os\.replace/.test(sh) && /0o600/.test(sh) && !/read -rsp/.test(sh) && !/api\.anthropic\.com/.test(sh));

  { const cp = require('child_process'), cfg = path.join(tmp, 'cfg.json'); fs.writeFileSync(cfg, JSON.stringify({ agents: { cleApi: 'sk-ant-secret-3320', x: 1 }, anthropic: { cleApi: 'k2' } }), { mode: 0o600 });
    const r = cp.spawnSync('bash', [path.join(RACINE, 'server', 'set-agents.sh')], { input: 'o\n', env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg }), encoding: 'utf8' });
    const c = JSON.parse(fs.readFileSync(cfg, 'utf8'));
    vrai('set-agents.sh JOUÉ : la clé des agents est supprimée, le reste intact, chmod 600, la clé n\'est jamais affichée', r.status === 0 && !('cleApi' in c.agents) && c.agents.x === 1 && c.anthropic.cleApi === 'k2' && (fs.statSync(cfg).mode & 0o777) === 0o600 && !/secret-3320/.test(r.stdout + r.stderr), r.stdout + r.stderr); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + e); process.exit(1); });
