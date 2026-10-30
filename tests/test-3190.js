/* ⛔ CE QUE CE FICHIER GARDE — L'ESSAI « MANAGED AGENTS » D'ANTHROPIC SUR UN AGENT DE SURVEILLANCE (30 octobre 2026).
     Justin : « réparer les nôtres + essai Anthropic ». `server/outils/essai-managed/` pose, lance et nettoie UN agent (« Max (essai) ») hébergé chez Anthropic. Ici, les VRAIS
     scripts parlent au VRAI SDK, mais l'adresse est un FAUX service Anthropic local (boucle locale seulement : aucun appel réel, en CI comme ici) qui GARDE chaque requête.
       · l'interrupteur `config.agents.essaiManaged` coupé ou absent ne change RIEN : aucune requête, aucune route montée, aucun fichier écrit ;
       · le plafond de la session est TOUJOURS posé (jamais une session sans `budget`, quel que soit le réglage, même fou) ;
       · l'environnement n'a aucun réseau, l'agent n'a ni outil web ni MCP ; la pose est idempotente (mise à jour, pas un second agent) ;
       · ⛔ l'outil maison ne rend AUCUNE donnée de client : on lui donne un état de santé EMPOISONNÉ (noms, adresses, textes forgés) et on balaie toute la sortie ;
       · la route de l'outil est gardée (jeton, pas de nginx, cadence), et le VRAI `index.js` ne la monte que si l'essai est allumé ;
       · le rapport est un FICHIER rangé à côté de ce que voit le vrai Max — aucune messagerie, aucun courriel, aucun incident ;
       · un permission est refusée, un outil inventé reçoit une erreur, un flux coupé est repris, un délai dépassé interrompt, un outil muet ne coûte AUCUNE session ;
       · le nettoyage efface sessions, environnement, agent (archivé : un agent ne se supprime pas) et jeton, et reprend où il s'est arrêté ;
       · aucun secret : ni la clé ni le jeton ne sortent dans une sortie ou un fichier du dépôt. */
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), net = require('net');
const { spawn } = require('child_process');
const { SANTE_BONNE } = require('./banc-plateforme');
const RACINE = path.join(__dirname, '..');
const E = f => path.join(RACINE, 'server', 'outils', 'essai-managed', f);
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const nu = s => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3190-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); fin(); process.exit(1); }, 120000).unref();
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

const CLE = 'sk-ant-banc-3190-xxxxxxxxxxxxxxxx';
/* des chaînes qui ne doivent JAMAIS sortir de l'outil maison (elles sont plantées dans l'état de santé) */
const HOSTILES = ['Dupont-SARL-Zeta', 'jean.dupont@client-zeta.fr', '12 rue des Lilas', 'IGNORE-TES-REGLES-3190', 'espace-secret-zeta', 'Madame-Martin-3190'];

console.log('\n── 3190 · l’essai Managed Agents : poser, lancer, nettoyer, contre un faux service Anthropic ──');

/* ═══ le faux service Anthropic ═══ */
async function fauxAnthropic(opt) {
  opt = opt || {};
  const S = { requetes: [], envs: 0, agents: 0, majs: 0, sessions: [], supprimees: [], envsSupprimes: [], archives: [], resultats: [], evenementsEnvoyes: [], version: 0, scenario: opt.scenario || 'normal', echecSuppr: opt.echecSuppr || 0, flux: 0 };
  const sess = {};
  const emettre = (s, ev) => { ev.id = ev.id || 'sevt_' + (++s.n); ev.processed_at = new Date().toISOString(); s.histoire.push(ev); if (s.sse) s.sse.write('event: ' + ev.type + '\ndata: ' + JSON.stringify(ev) + '\n\n'); else s.tampon.push(ev); };
  const json = (res, code, x) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(x)); };
  const srv = http.createServer((req, res) => {
    let corps = ''; req.on('data', d => { corps += d; }); req.on('end', () => {
      const u = new URL(req.url, 'http://x'); const p = u.pathname; let b = null; try { b = corps ? JSON.parse(corps) : null; } catch (e) {}
      S.requetes.push({ m: req.method, p, q: u.search, b, cle: req.headers['x-api-key'] });
      let m;
      if (req.method === 'POST' && p === '/v1/environments') { S.envs++; S.env = b; return json(res, 200, { id: 'env_fake1', type: 'environment', ...b }); }
      if (req.method === 'DELETE' && (m = /^\/v1\/environments\/([\w-]+)$/.exec(p))) { S.envsSupprimes.push(m[1]); return json(res, 200, { id: m[1], type: 'environment_deleted' }); }
      if (req.method === 'POST' && p === '/v1/agents') { S.agents++; S.agent = b; S.version = 1; return json(res, 200, { id: 'agent_fake1', type: 'agent', version: 1, ...b }); }
      if (req.method === 'GET' && p === '/v1/agents/agent_fake1') return json(res, 200, { id: 'agent_fake1', type: 'agent', version: S.version });
      if (req.method === 'POST' && p === '/v1/agents/agent_fake1/archive') { S.archives.push('agent_fake1'); return json(res, 200, { id: 'agent_fake1', type: 'agent', archived_at: 'x' }); }
      if (req.method === 'POST' && p === '/v1/agents/agent_fake1') { if (b.version !== S.version) return json(res, 409, { type: 'error', error: { type: 'invalid_request_error', message: 'version' } }); S.majs++; S.version++; S.agent = b; return json(res, 200, { id: 'agent_fake1', type: 'agent', version: S.version }); }
      if (req.method === 'POST' && p === '/v1/sessions') {
        const id = 'sesn_fake' + (S.sessions.length + 1);
        S.sessions.push({ id, b }); sess[id] = { n: 0, histoire: [], tampon: [], sse: null, b, cuts: 0 };
        return json(res, 200, { id, type: 'session', status: 'idle', agent: { id: 'agent_fake1', version: S.version }, ...b });
      }
      if ((m = /^\/v1\/sessions\/([\w-]+)$/.exec(p))) {
        if (req.method === 'DELETE') { if (S.echecSuppr > 0) { S.echecSuppr--; return json(res, 400, { type: 'error', error: { type: 'invalid_request_error', message: 'refus du banc' } }); } if (S.supprimees.includes(m[1])) return json(res, 404, { type: 'error', error: { type: 'not_found_error', message: 'déjà' } }); S.supprimees.push(m[1]); return json(res, 200, { id: m[1], type: 'session_deleted' }); }
        if (req.method === 'GET') return json(res, 200, { id: m[1], type: 'session', status: 'idle', usage: { list_cost: { amount: '7', currency: 'USD' } }, outcome_evaluations: [{ outcome_id: 'outc_1', result: 'satisfied' }] });
      }
      if ((m = /^\/v1\/sessions\/([\w-]+)\/events\/stream$/.exec(p)) && req.method === 'GET') {
        const s = sess[m[1]]; if (!s) return json(res, 404, {}); S.flux++;
        res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' }); res.flushHeaders();
        if (S.scenario === 'coupure' && S.flux === 1) { res.end(); return; }          // le flux tombe avant d'avoir rien livré : l'historique devra suffire
        s.sse = res; res.on('close', () => { if (s.sse === res) s.sse = null; });
        while (s.tampon.length) res.write('event: ' + s.tampon[0].type + '\ndata: ' + JSON.stringify(s.tampon.shift()) + '\n\n');
        return;
      }
      if ((m = /^\/v1\/sessions\/([\w-]+)\/events$/.exec(p))) {
        const s = sess[m[1]]; if (!s) return json(res, 404, {});
        if (req.method === 'GET') return json(res, 200, { data: s.histoire, has_more: false, first_id: null, last_id: null });
        const evs = (b && b.events) || []; S.evenementsEnvoyes.push(...evs);
        for (const e of evs) {
          if (e.type === 'user.define_outcome') {
            if (S.scenario === 'muet') continue;
            emettre(s, { type: 'session.status_running' });
            if (S.scenario === 'budget') { emettre(s, { type: 'session.status_idle', stop_reason: { type: 'budget_reached' } }); continue; }
            if (S.scenario === 'permission') emettre(s, { id: 'sevt_perm1', type: 'agent.tool_use', name: 'write', input: {}, evaluated_permission: 'ask' });
            const nom = S.scenario === 'inconnu' ? 'ouvrir_le_coffre' : 'faits_surveillance';
            emettre(s, { id: 'sevt_tool1', type: 'agent.custom_tool_use', name: nom, input: S.scenario === 'inconnu' ? { x: 1 } : {} });
            emettre(s, { type: 'session.status_idle', stop_reason: { type: 'requires_action', event_ids: ['sevt_tool1'] } });
          }
          if (e.type === 'user.custom_tool_result') {
            S.resultats.push(e);
            const texte = e.content && e.content[0] && e.content[0].text;
            emettre(s, { type: 'agent.message', content: [{ type: 'text', text: opt.rapport || '## Constat\nLe 30 octobre 2026, le serveur est en bonne santé.\n## Cause probable\nRien d’anormal.\n## Gravité\naucune\n## Action proposée\naucune action' }] });
            S.fichier = { id: 'file_fake1', filename: 'report.md', texte: opt.rapport || '## Constat\nLe 30 octobre 2026, le serveur est en bonne santé (rapport du FICHIER).\n## Cause probable\nRien d’anormal.\n## Gravité\naucune\n## Action proposée\naucune action' };
            emettre(s, { type: 'span.outcome_evaluation_end', outcome_id: 'outc_1', result: 'satisfied', explanation: 'Les six critères sont remplis.', iteration: 0 });
            emettre(s, { type: 'session.status_idle', stop_reason: { type: 'end_turn' } });
          }
          if (e.type === 'user.tool_confirmation') S.confirmations = (S.confirmations || []).concat([e]);
        }
        return json(res, 200, { data: evs });
      }
      if (req.method === 'GET' && p === '/v1/files') return json(res, 200, { data: S.fichier ? [{ id: S.fichier.id, filename: S.fichier.filename, type: 'file' }] : [], has_more: false });
      if (req.method === 'GET' && /^\/v1\/files\/[\w-]+\/content$/.test(p)) { res.writeHead(200, { 'content-type': 'text/markdown' }); return res.end(S.fichier ? S.fichier.texte : ''); }
      return json(res, 404, { type: 'error', error: { type: 'not_found_error', message: 'route inconnue du faux service : ' + req.method + ' ' + p } });
    });
  });
  const port = await libre();
  await new Promise(r => srv.listen(port, '127.0.0.1', r));
  S.url = 'http://127.0.0.1:' + port; S.arreter = () => { try { srv.closeAllConnections(); } catch (e) {} srv.close(); };
  return S;
}

/* ═══ un faux dossier de VPS ═══ */
function vps(nom, agents) {
  const D = path.join(banc, nom); fs.mkdirSync(path.join(D, 'data'), { recursive: true });
  const conf = { apiKey: 'banc', agents: agents };
  fs.writeFileSync(path.join(D, 'config.json'), JSON.stringify(conf));
  return { D, data: path.join(D, 'data'), env: { TEAMOP_CONFIG: path.join(D, 'config.json'), TEAMOP_DATA: path.join(D, 'data') } };
}
const arbre = d => { const l = []; (function m(x) { for (const f of fs.readdirSync(x)) { const c = path.join(x, f); fs.statSync(c).isDirectory() ? m(c) : l.push(path.relative(d, c)); } })(d); return l.sort(); };
const sortieDe = () => { const l = []; return { f: t => l.push(String(t)), texte: () => l.join('\n') }; };

/* l'état de santé EMPOISONNÉ : tout ce qu'un champ libre de /health pourrait porter, plus un stripe qui crie */
function santeEmpoisonnee() {
  const j = SANTE_BONNE();
  j.stripeEchecMin = 120;
  j.portail = { comptes: { actif: true, erreur: 'ERREUR ' + HOSTILES[0] + ' ' + HOSTILES[1] }, dossiers: { actif: true } };
  j.documents.erreur = HOSTILES[2];
  j.lastRefus = HOSTILES[1];
  j.mailRefus = { n: 4, parMotif: { [HOSTILES[4]]: 3 }, parRoute: { ['/api/' + HOSTILES[0]]: 1 }, ts: 1 };
  j.entreprises = [HOSTILES[0], HOSTILES[5]];
  j.incidents = [{ message: HOSTILES[3] + ' ' + HOSTILES[1], entreprise: HOSTILES[0] }];
  j.annonce = HOSTILES[3];
  j.cles = Object.assign({}, j.cles, { parRoute: { [HOSTILES[4]]: 2 } });
  j.sauvegarde = Object.assign({}, j.sauvegarde, { derniere: HOSTILES[2], erreur: HOSTILES[3] });
  return j;
}

(async () => {
  try { require(path.join(RACINE, 'server', 'node_modules', '@anthropic-ai', 'sdk')); require(path.join(RACINE, 'server', 'node_modules', 'express')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const C = require(E('commun.js')), F = require(E('faits.js')), Route = require(E('route.js'));
  const { poser } = require(E('poser.js')), { lancer } = require(E('lancer.js')), { nettoyer } = require(E('nettoyer.js'));
  const express = require(path.join(RACINE, 'server', 'node_modules', 'express'));
  const R = require(path.join(RACINE, 'server', 'plateforme-regles.js'));
  const maintenantFixe = () => Date.UTC(2026, 9, 30, 8, 0, 0);

  console.log('\n1. L’interrupteur : coupé ou absent, rien ne change');
  const A0 = await fauxAnthropic();
  const coupes = { absent: undefined, objetVide: {}, false: false, actifFaux: { actif: false }, objetSansActif: { budgetCents: 30 }, chaine: 'true', un: 1 };
  for (const [nom, val] of Object.entries(coupes)) {
    const V = vps('coupe-' + nom, Object.assign({ cleApi: CLE }, val === undefined ? {} : { essaiManaged: val }));
    const env = Object.assign({}, V.env, { TEAMOP_ESSAI_BASE_URL: A0.url });
    const sp = sortieDe();
    const r1 = await poser({ env, sortie: sp.f }), r2 = await lancer({ env, sortie: sp.f, urlServeur: 'http://127.0.0.1:1' });
    v('« ' + nom + ' » : poser et lancer refusent (code 2, interrupteur coupé)', [r1.code, r1.raison, r2.code, r2.raison], [2, 'interrupteur_coupe', 2, 'interrupteur_coupe']);
    v('« ' + nom + ' » : aucun fichier écrit', arbre(V.data), []);
    let monte = 0; const faux = { get() { monte++; }, post() { monte++; }, use() { monte++; } };
    v('« ' + nom + ' » : la route de l’outil n’est pas montée (rien ne touche à l’application)', [Route.monter(faux, { config: JSON.parse(fs.readFileSync(V.env.TEAMOP_CONFIG, 'utf8')), DATA_DIR: V.data, sante: () => SANTE_BONNE() }), monte], [false, 0]);
  }
  v('(population) sept formes d’interrupteur coupé jouées', Object.keys(coupes).length, 7);
  v('⛔ aucune requête n’est partie chez Anthropic, interrupteur coupé', A0.requetes.length, 0);
  v('les deux formes allumées : « true » et « { actif: true } » seulement', [C.reglage({ agents: { essaiManaged: true } }).actif, C.reglage({ agents: { essaiManaged: { actif: true } } }).actif, C.reglage({ agents: { essaiManaged: { actif: 'true' } } }).actif, C.reglage(null).actif], [true, true, false, false]);
  A0.arreter();

  console.log('\n2. Le plafond de session est toujours posé');
  v('le budget par défaut est de 50 centimes', C.budgetSession(undefined), { type: 'limit', max_list_cost: { amount: '50', currency: 'USD' } });
  v('un réglage fou retombe dans [10, 200] centimes', [C.budgetCents(0), C.budgetCents(-5), C.budgetCents(99999), C.budgetCents(12.5), C.budgetCents('abc'), C.budgetCents(null), C.budgetCents('30'), C.budgetCents(30), C.budgetCents({})], [10, 10, 200, 50, 50, 50, 30, 30, 50]);
  v('le montant est une chaîne d’entiers en centimes (la doc : « amount » en unités mineures)', typeof C.budgetSession(30).max_list_cost.amount === 'string' && /^\d+$/.test(C.budgetSession(30).max_list_cost.amount), true);

  console.log('\n3. La pose : environnement sans réseau, agent sans web, idempotente');
  const A = await fauxAnthropic();
  const V = vps('essai', { cleApi: CLE, essaiManaged: { actif: true, budgetCents: 30 } });
  const env = Object.assign({}, V.env, { TEAMOP_ESSAI_BASE_URL: A.url, PORT: '1' });
  const sp = sortieDe();
  const p1 = await poser({ env, sortie: sp.f });
  v('la pose réussit', [p1.ok, p1.code], [true, 0]);
  v('un environnement, un agent créés', [A.envs, A.agents], [1, 1]);
  const net_ = A.env.config.networking;
  v('⛔ l’environnement n’a AUCUN réseau : limité, sans hôte, sans paquets, sans MCP', [A.env.config.type, net_.type, net_.allow_package_managers, net_.allow_mcp_servers, net_.allowed_hosts], ['cloud', 'limited', false, false, undefined]);
  const outils = A.agent.tools, ts = outils.find(t => t.type === 'agent_toolset_20260401'), cu = outils.filter(t => t.type === 'custom');
  v('l’agent est un Sonnet (règle du dépôt : tout en Sonnet)', A.agent.model.id, 'claude-sonnet-5-5');
  v('⛔ les outils web sont coupés et le toolset est fermé par défaut', [ts.default_config.enabled, ts.configs.find(c => c.name === 'web_fetch').enabled, ts.configs.find(c => c.name === 'web_search').enabled], [false, false, false]);
  v('les seuls outils ouverts : écrire le rapport, et l’outil maison', [ts.configs.filter(c => c.enabled).map(c => c.name), cu.map(c => c.name)], [['write'], ['faits_surveillance']]);
  v('ni serveur MCP ni compétences', [A.agent.mcp_servers, A.agent.skills], [undefined, undefined]);
  vrai('le prompt système est celui du fichier versionné', A.agent.system && A.agent.system.includes('Tu es Max (essai)') && A.agent.system.includes("Tu n'inventes rien"));
  v('⛔ la clé part dans l’en-tête, à l’adresse locale du banc seulement', [...new Set(A.requetes.map(r => r.cle))], [CLE]);
  const jetonFichier = path.join(V.data, 'essai-managed', 'jeton');
  vrai('le jeton est créé : 48 hexadécimaux, mode 600', /^[a-f0-9]{48}\n?$/.test(fs.readFileSync(jetonFichier, 'utf8')) && (fs.statSync(jetonFichier).mode & 0o777) === 0o600);
  const jeton = fs.readFileSync(jetonFichier, 'utf8').trim();
  const p2 = await poser({ env, sortie: sp.f });
  v('⛔ la seconde pose MET À JOUR l’agent (version 2), elle n’en crée pas un autre', [p2.ok, A.agents, A.majs, A.envs, A.version], [true, 1, 1, 1, 2]);
  v('le jeton n’a pas changé à la seconde pose', fs.readFileSync(jetonFichier, 'utf8').trim(), jeton);
  vrai('⛔ la sortie de la pose ne montre ni la clé ni le jeton', !sp.texte().includes(CLE) && !sp.texte().includes(jeton) && !/sk-ant-/.test(sp.texte()));
  let refus = ''; try { C.baseUrl({ TEAMOP_ESSAI_BASE_URL: 'https://exemple.fr' }); } catch (e) { refus = e.message; }
  vrai('⛔ une adresse de service hors boucle locale est refusée (la clé ne sort pas)', /boucle locale/.test(refus));
  v('sans réglage, la clé ne va qu’à api.anthropic.com (une variable d’environnement égarée ne la dévie pas)', C.baseUrl({ ANTHROPIC_BASE_URL: 'https://pirate.exemple' }), 'https://api.anthropic.com');

  console.log('\n4. L’outil maison : des chiffres fermés, aucune donnée de client');
  const J = santeEmpoisonnee();
  const f = F.faitsMax(J, maintenantFixe);
  const texte = JSON.stringify(f);
  for (const h of HOSTILES) vrai('⛔ « ' + h + ' » (planté dans l’état de santé) n’est pas dans la sortie', !texte.includes(h));
  v('forme : seulement ces clés de premier niveau', Object.keys(f).sort(), ['compteurs', 'essai', 'instant', 'jour', 'lisible', 'regles', 'regles_actives']);
  const toutesChaines = [], nombres = []; (function bal(x, chemin) { if (typeof x === 'string') toutesChaines.push([chemin, x]); else if (x && typeof x === 'object') for (const [k, y] of Object.entries(x)) bal(y, chemin + '.' + k); else if (typeof x === 'number') nombres.push(x); })(f, '');
  vrai('(population) des nombres à contrôler (' + nombres.length + ') et tous finis', nombres.length > 10 && nombres.every(Number.isFinite));
  const statiques = new Set([f.instant, f.jour]);
  for (const r of R.REGLES.filter(r => r.proprio === 'max')) { statiques.add(r.cle); statiques.add(r.zone); statiques.add(r.niveau); statiques.add(r.ref); statiques.add(r.pistes); }
  const actives = R.evaluer(J, 'max', maintenantFixe);
  for (const [c, a] of actives) statiques.add(R.texteDe(c, a.valeurs).slice(0, 300));
  v('⛔ chaque chaîne de la sortie est une clé de NOS tables, une phrase de NOTRE code ou la date', toutesChaines.filter(([c, s]) => !statiques.has(s)).map(x => x[0] + '=' + x[1].slice(0, 60)), []);
  vrai('(population) la sortie porte des chaînes, des nombres et des règles actives à balayer', toutesChaines.length > 20 && f.regles.length >= 8 && actives.size >= 2, 'chaînes ' + toutesChaines.length + ', règles ' + f.regles.length + ', actives ' + actives.size);
  v('les règles actives sont exactement celles du vrai Max sur le même état', f.regles_actives.slice().sort(), [...actives.keys()].sort());
  const rStripe = f.regles.find(r => r.cle === 'stripe_illisible');
  v('une règle active porte ses valeurs, sa phrase et sa piste ; une règle au repos ne porte que sa condition', [rStripe.active, rStripe.valeurs, /120 minutes/.test(rStripe.phrase), !!rStripe.piste, f.regles.filter(r => !r.active).every(r => !('phrase' in r) && !('piste' in r) && !('valeurs' in r))], [true, { minutes: 120 }, true, true, true]);
  v('l’instant est daté (ISO) et le jour est celui de Paris', [f.instant, f.jour], ['2026-10-30T08:00:00.000Z', '2026-10-30']);
  v('seuls les compteurs de la liste blanche passent, et seulement des nombres et des booléens', Object.values(f.compteurs).every(x => typeof x === 'number' || typeof x === 'boolean') && Object.keys(f.compteurs).every(k => F.COMPTEURS.some(c => c[1] === k)), true);
  v('un état de santé illisible : « lisible: false », aucune règle', (() => { const x = F.faitsMax(null, maintenantFixe); return [x.lisible, x.regles.length, x.regles_actives.length]; })(), [false, 0, 0]);
  v('le filtre de zone ne garde que cette zone — et une zone inventée ne filtre rien', [F.faitsMax(SANTE_BONNE(), maintenantFixe, 'stripe').regles.every(r => r.zone === 'stripe'), F.faitsMax(SANTE_BONNE(), maintenantFixe, 'pas-une-zone').regles.length === F.faitsMax(SANTE_BONNE(), maintenantFixe).regles.length], [true, true]);
  v('en bonne forme, aucune règle active', F.faitsMax(SANTE_BONNE(), maintenantFixe).regles_actives, []);

  console.log('\n5. La route de l’outil : jeton, pas de nginx, cadence — en HTTP');
  const app = express();
  const montee = Route.monter(app, { config: JSON.parse(fs.readFileSync(V.env.TEAMOP_CONFIG, 'utf8')), DATA_DIR: V.data, sante: () => J, maintenant: (() => { let t = Date.UTC(2026, 9, 30, 8, 0, 0); return () => t; })() });
  v('allumé, la route est montée', montee, true);
  const portR = await libre(); const srvR = await new Promise(r => { const s = app.listen(portR, '127.0.0.1', () => r(s)); });
  const get = (h, q) => fetch('http://127.0.0.1:' + portR + '/api/essai-managed/faits' + (q || ''), { headers: h || {} });
  v('sans jeton : 404', (await get()).status, 404);
  v('mauvais jeton : 404', (await get({ authorization: 'Bearer ' + 'a'.repeat(48) })).status, 404);
  v('un jeton mal formé : 404', (await get({ authorization: 'Bearer ' + jeton.slice(0, 40) })).status, 404);
  v('⛔ le bon jeton venu de nginx (X-Forwarded-For) : 404', (await get({ authorization: 'Bearer ' + jeton, 'x-forwarded-for': '203.0.113.9' })).status, 404);
  const bonne = await get({ authorization: 'Bearer ' + jeton });
  const corps = await bonne.json();
  v('le bon jeton, en direct : 200, les chiffres de Max, pas de cache', [bonne.status, corps.essai, bonne.headers.get('cache-control')], [200, true, 'no-store']);
  vrai('⛔ et rien de client dans ce que la route rend en HTTP', HOSTILES.every(h => !JSON.stringify(corps).includes(h)));
  v('?zone= filtre', (await (await get({ authorization: 'Bearer ' + jeton }, '?zone=stripe')).json()).regles.every(r => r.zone === 'stripe'), true);
  let dernier = 0; for (let i = 0; i < 40; i++) dernier = (await get({ authorization: 'Bearer ' + jeton })).status;
  v('⛔ au plus 30 lectures par heure : la suite est refusée', dernier, 404);
  srvR.close();
  const sansJeton = express(); const monteeSans = Route.monter(sansJeton, { config: { agents: { essaiManaged: true } }, DATA_DIR: path.join(banc, 'vide'), sante: () => J });
  const portS = await libre(); const srvS = await new Promise(r => { const s = sansJeton.listen(portS, '127.0.0.1', () => r(s)); });
  v('allumé mais sans fichier de jeton : toujours 404 (pas de jeton vide qui passe)', (await fetch('http://127.0.0.1:' + portS + '/api/essai-managed/faits', { headers: { authorization: 'Bearer ' + '0'.repeat(48) } })).status, 404);
  srvS.close();

  console.log('\n6. Le lancement, de bout en bout (vraie route, faux Anthropic)');
  const appL = express();
  Route.monter(appL, { config: { agents: { essaiManaged: true } }, DATA_DIR: V.data, sante: () => J });
  const portL = await libre(); const srvL = await new Promise(r => { const s = appL.listen(portL, '127.0.0.1', () => r(s)); });
  const urlServeur = 'http://127.0.0.1:' + portL;
  const avant = arbre(V.data);
  const sl = sortieDe();
  const l1 = await lancer({ env, sortie: sl.f, urlServeur, maintenant: maintenantFixe, pause: () => dormir(1) });
  v('le lancement réussit', [l1.ok, l1.code, l1.issue, l1.outils], [true, 0, 'termine', 1]);
  const ses = A.sessions[0];
  v('⛔ la session est créée AVEC son budget : limite, 30 centimes, USD', ses.b.budget, { type: 'limit', max_list_cost: { amount: '30', currency: 'USD' } });
  v('la session pointe l’agent et l’environnement posés, à la version posée', [ses.b.agent, ses.b.environment_id], [{ type: 'agent', id: 'agent_fake1', version: 2 }, 'env_fake1']);
  const outcome = A.evenementsEnvoyes.find(e => e.type === 'user.define_outcome');
  const criteres = (outcome.rubric.content.match(/^- /gm) || []).length;
  v('un « outcome » avec la grille du fichier, 3 tours au plus', [outcome.rubric.type, outcome.rubric.content === fs.readFileSync(E('definition/grille.md'), 'utf8').trim(), outcome.max_iterations], ['text', true, 3]);
  vrai('la grille compte de 4 à 6 critères (' + criteres + ')', criteres >= 4 && criteres <= 6);
  v('(population) un seul événement de départ, un seul résultat d’outil', [A.evenementsEnvoyes.filter(e => e.type === 'user.define_outcome').length, A.resultats.length], [1, 1]);
  const remis = A.resultats[0].content[0].text;
  vrai('l’outil maison a répondu avec les chiffres du serveur (règles de Max, instant)', JSON.parse(remis).essai === true && JSON.parse(remis).regles.length >= 8 && JSON.parse(remis).regles_actives.includes('stripe_illisible'));
  for (const h of HOSTILES) vrai('⛔ « ' + h + ' » n’est pas dans ce qui a été remis à Anthropic', !remis.includes(h) && !JSON.stringify(A.requetes.map(r => r.b)).includes(h));
  const rapports = fs.readdirSync(path.join(V.data, 'essai-managed', 'rapports'));
  v('un rapport rangé en fichier', rapports.length, 1);
  const rap = fs.readFileSync(path.join(V.data, 'essai-managed', 'rapports', rapports[0]), 'utf8');
  vrai('le fichier porte le bandeau « jamais publié, jamais envoyé » et la comparaison avec le vrai Max', /jamais publié, jamais envoyé/.test(rap) && /Ce que voit le vrai Max/.test(rap) && /Stripe est illisible depuis 120 minutes/.test(rap));
  vrai('le fichier porte le rapport de l’agent (celui du FICHIER de sortie), le coût et la grille', /rapport du FICHIER/.test(rap) && /0\.07 \$/.test(rap) && /satisfied/.test(rap));
  vrai('⛔ aucune donnée de client dans le fichier, ni la clé ni le jeton', HOSTILES.every(h => !rap.includes(h)) && !rap.includes(CLE) && !rap.includes(jeton));
  v('⛔ rien n’a été écrit hors du dossier de l’essai (ni messagerie des agents, ni courriel, ni incident)', arbre(V.data).filter(x => !x.startsWith('essai-managed/')), []);
  vrai('⛔ la sortie du lancement ne montre ni la clé ni le jeton', !sl.texte().includes(CLE) && !sl.texte().includes(jeton));
  const etat = JSON.parse(fs.readFileSync(path.join(V.data, 'essai-managed', 'etat.json'), 'utf8'));
  v('l’état garde la session, son issue et son coût (pour le nettoyage)', [etat.sessions.length, etat.sessions[0].issue, etat.sessions[0].cout_cents], [1, 'termine', 7]);
  vrai('(population) le dossier de l’essai portait bien des fichiers avant/après', arbre(V.data).length > avant.length);

  console.log('\n7. Les cas de travers');
  const cas = async (scenario, o) => { const Z = await fauxAnthropic(Object.assign({ scenario }, o && o.faux)); const VV = vps('cas-' + scenario, { cleApi: CLE, essaiManaged: true }); const e2 = Object.assign({}, VV.env, { TEAMOP_ESSAI_BASE_URL: Z.url });
    await poser({ env: e2, sortie: () => {} }); fs.writeFileSync(path.join(VV.data, 'essai-managed', 'jeton'), jeton + '\n', { mode: 0o600 }); const s = sortieDe(); const r = await lancer(Object.assign({ env: e2, sortie: s.f, urlServeur, pause: () => dormir(1) }, o && o.lancer)); return { Z, VV, r, s, e2 }; };
  /* une demande de permission est refusée */
  let c = await cas('permission');
  v('⛔ une demande de permission de l’agent est REFUSÉE (personne ne surveille)', (c.Z.confirmations || []).map(x => [x.tool_use_id, x.result]), [['sevt_perm1', 'deny']]);
  c.Z.arreter();
  /* un outil inventé */
  const appI = express(); let lecturesI = 0; Route.monter(appI, { config: { agents: { essaiManaged: true } }, DATA_DIR: V.data, sante: () => { lecturesI++; return J; } });
  const portI = await libre(); const srvI = await new Promise(r => { const s = appI.listen(portI, '127.0.0.1', () => r(s)); });
  c = await cas('inconnu', { lancer: { urlServeur: 'http://127.0.0.1:' + portI } });
  v('⛔ un outil inventé par l’agent reçoit une ERREUR, jamais les chiffres', [c.Z.resultats.length, c.Z.resultats[0].is_error, c.Z.resultats[0].content[0].text], [1, true, 'Outil inconnu.']);
  v('…et la route du serveur n’a été lue qu’une fois (le contrôle de départ), pas pour l’outil inventé', lecturesI, 1);
  c.Z.arreter(); srvI.close();
  /* le budget atteint */
  c = await cas('budget');
  v('un budget atteint est dit (issue « budget_atteint ») et le fichier est quand même rangé', [c.r.issue, fs.readdirSync(path.join(c.VV.data, 'essai-managed', 'rapports')).length], ['budget_atteint', 1]);
  c.Z.arreter();
  /* un flux coupé */
  c = await cas('coupure');
  v('un flux coupé est repris sur l’historique : le rapport vient quand même, et l’outil n’est répondu qu’une fois', [c.r.ok, c.r.issue, c.Z.resultats.length, c.Z.flux], [true, 'termine', 1, 2]);
  c.Z.arreter();
  /* un délai dépassé */
  c = await cas('muet', { lancer: { delaiMs: 400 } });
  v('⛔ un agent muet est INTERROMPU au délai, la session est rangée pour le nettoyage, code 1', [c.r.issue, c.r.code, c.Z.evenementsEnvoyes.some(e => e.type === 'user.interrupt'), JSON.parse(fs.readFileSync(path.join(c.VV.data, 'essai-managed', 'etat.json'), 'utf8')).sessions.length], ['delai_depasse', 1, true, 1]);
  c.Z.arreter();
  /* un outil muet : aucune session payée */
  const Zm = await fauxAnthropic(); const Vm = vps('outil-muet', { cleApi: CLE, essaiManaged: true }); const em = Object.assign({}, Vm.env, { TEAMOP_ESSAI_BASE_URL: Zm.url });
  await poser({ env: em, sortie: () => {} });
  const rm = await lancer({ env: em, sortie: () => {}, urlServeur: 'http://127.0.0.1:1', pause: () => dormir(1) });
  v('⛔ si l’outil maison ne répond pas, AUCUNE session n’est créée (rien n’est payé pour rien)', [rm.ok, rm.raison, Zm.sessions.length], [false, 'outil_muet', 0]);
  Zm.arreter();
  /* un lancement avant la pose, et sans clé */
  const Vn = vps('pas-pose', { cleApi: CLE, essaiManaged: true });
  v('lancer avant la pose : refusé, code 2', (await lancer({ env: Object.assign({}, Vn.env, { TEAMOP_ESSAI_BASE_URL: 'http://127.0.0.1:9' }), sortie: () => {} })).raison, 'pas_pose');
  const Vk = vps('sans-cle', { essaiManaged: true });
  v('sans la clé des agents : refusé, code 2', (await poser({ env: Vk.env, sortie: () => {} })).raison, 'pas_de_cle');

  console.log('\n8. Le nettoyage');
  const sn = sortieDe();
  const n1 = await nettoyer({ env, sortie: sn.f });
  v('⛔ le nettoyage supprime la session, l’environnement et ARCHIVE l’agent (il ne se supprime pas)', [n1.ok, A.supprimees, A.envsSupprimes, A.archives], [true, ['sesn_fake1'], ['env_fake1'], ['agent_fake1']]);
  v('le jeton est effacé, les rapports GARDÉS par défaut', [fs.existsSync(jetonFichier), fs.readdirSync(path.join(V.data, 'essai-managed', 'rapports')).length], [false, 1]);
  const n2 = await nettoyer({ env, sortie: () => {} });
  v('un second nettoyage ne fait rien (rien à effacer) et réussit', [n2.ok, A.supprimees.length, A.archives.length], [true, 1, 1]);
  const n3 = await nettoyer({ env, sortie: () => {}, tout: true });
  v('« --tout » efface aussi les rapports et l’état', [n3.ok, fs.existsSync(path.join(V.data, 'essai-managed'))], [true, false]);
  vrai('⛔ la sortie du nettoyage ne montre ni la clé ni le jeton', !sn.texte().includes(CLE) && !sn.texte().includes(jeton));
  /* une panne en cours de route : il reprend */
  const Zp = await fauxAnthropic({ echecSuppr: 1 }); const Vp = vps('reprise', { cleApi: CLE, essaiManaged: true }); const ep = Object.assign({}, Vp.env, { TEAMOP_ESSAI_BASE_URL: Zp.url });
  await poser({ env: ep, sortie: () => {} });
  const appP = express(); Route.monter(appP, { config: { agents: { essaiManaged: true } }, DATA_DIR: Vp.data, sante: () => J });
  const portP = await libre(); const srvP = await new Promise(r => { const s = appP.listen(portP, '127.0.0.1', () => r(s)); });
  const lp = await lancer({ env: ep, sortie: () => {}, urlServeur: 'http://127.0.0.1:' + portP, pause: () => dormir(1) }); srvP.close();
  vrai('(population) la session à nettoyer existe bien', lp.ok && JSON.parse(fs.readFileSync(path.join(Vp.data, 'essai-managed', 'etat.json'), 'utf8')).sessions.length === 1);
  const np1 = await nettoyer({ env: ep, sortie: () => {} });
  v('⛔ une suppression qui échoue est DITE (code 1) et la session reste à effacer', [np1.ok, np1.code, JSON.parse(fs.readFileSync(path.join(Vp.data, 'essai-managed', 'etat.json'), 'utf8')).sessions.length], [false, 1, 1]);
  const np2 = await nettoyer({ env: ep, sortie: () => {} });
  v('…et le second passage reprend où il s’était arrêté', [np2.ok, Zp.supprimees, Zp.archives], [true, ['sesn_fake1'], ['agent_fake1']]);
  Zp.arreter(); A.arreter(); srvL.close();
  /* même interrupteur coupé, on peut tout nettoyer */
  const Zc = await fauxAnthropic(); const Vc = vps('coupe-apres', { cleApi: CLE, essaiManaged: true }); const ec = Object.assign({}, Vc.env, { TEAMOP_ESSAI_BASE_URL: Zc.url });
  await poser({ env: ec, sortie: () => {} });
  fs.writeFileSync(Vc.env.TEAMOP_CONFIG, JSON.stringify({ apiKey: 'banc', agents: { cleApi: CLE } }));
  v('l’interrupteur éteint, on peut encore tout nettoyer', [(await nettoyer({ env: ec, sortie: () => {} })).ok, Zc.archives, Zc.envsSupprimes], [true, ['agent_fake1'], ['env_fake1']]);
  Zc.arreter();

  console.log('\n9. Le code, lu (commentaires retirés)');
  const L = nu(fs.readFileSync(E('lancer.js'), 'utf8')), Cm = nu(fs.readFileSync(E('commun.js'), 'utf8'));
  v('⛔ une seule création de session dans le code, et elle porte son budget', [(L.match(/sessions\.create\(/g) || []).length, /sessions\.create\(\{[\s\S]{0,700}budget:\s*C\.budgetSession\(reg\.budgetCents\)/.test(L)], [1, true]);
  vrai('⛔ l’adresse du SDK est toujours posée (jamais celle de l’environnement)', /baseURL:\s*baseUrl\(env\)/.test(Cm) && /return URL_ANTHROPIC/.test(Cm));
  vrai('le rapport n’est écrit que dans un fichier : aucun appel à la messagerie, aux courriels, aux incidents', !/conversations|parler\(|nodemailer|incidents|pousseNotif|srvMail/.test(L));
  const tous = fs.readdirSync(path.join(RACINE, 'server', 'outils', 'essai-managed'), { recursive: true }).map(f => path.join(RACINE, 'server', 'outils', 'essai-managed', f)).filter(f => fs.statSync(f).isFile());
  vrai('(population) tous les fichiers de l’essai sont balayés (' + tous.length + ')', tous.length >= 11);
  vrai('⛔ aucune clé ni aucun jeton dans les fichiers du dépôt', tous.every(f => !/sk-ant-[A-Za-z0-9_-]{30,}/.test(fs.readFileSync(f, 'utf8')) && !/[a-f0-9]{48}/.test(fs.readFileSync(f, 'utf8'))));
  for (const f of tous.filter(f => f.endsWith('.js'))) { const r = require('child_process').spawnSync(process.execPath, ['--check', f]); vrai('node --check ' + path.basename(f), r.status === 0, String(r.stderr)); }
  const IX = nu(fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8'));
  vrai('index.js monte la route de l’essai, une fois, sous son propre try', (IX.match(/essai-managed\/route'\)\.monter\(/g) || []).length === 1);

  console.log('\n10. Le VRAI serveur : la route n’existe que si l’essai est allumé');
  let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { webpush = null; }
  if (!webpush) console.log('  … SAUTÉ : web-push absent');
  else {
    async function serveur(nom, essai) {
      const D = path.join(banc, 'srv-' + nom, 'data'); fs.mkdirSync(path.join(D, 'essai-managed'), { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);
      fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
      const jt = 'ab'.repeat(24); fs.writeFileSync(path.join(D, 'essai-managed', 'jeton'), jt + '\n');
      const vap = webpush.generateVAPIDKeys(); const conf = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', agents: Object.assign({ reunionsAuto: false }, essai ? { essaiManaged: true } : {}) };
      const cfg = path.join(banc, 'srv-' + nom, 'config.json'); fs.writeFileSync(cfg, JSON.stringify(conf));
      const PORT = await libre(); let journal = '';
      const e = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
      e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
      const B = 'http://127.0.0.1:' + PORT; let vivant = false;
      for (let i = 0; i < 120 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
      vrai('le serveur « ' + nom + ' » démarre', vivant, journal.slice(0, 600));
      return { B, jt, journal: () => journal, arreter: () => { try { e.kill('SIGKILL'); } catch (x) {} } };
    }
    const off = await serveur('coupe', false), on = await serveur('allume', true);
    v('⛔ interrupteur coupé : la route n’existe pas, même avec un jeton valide sur disque', (await fetch(off.B + '/api/essai-managed/faits', { headers: { authorization: 'Bearer ' + off.jt } })).status, 404);
    vrai('interrupteur coupé : le journal ne parle pas de l’essai', !/essai Managed Agents/.test(off.journal()));
    vrai('interrupteur allumé : le journal le dit', /essai Managed Agents : outil maison servi/.test(on.journal()));
    v('allumé, sans jeton : 404', (await fetch(on.B + '/api/essai-managed/faits')).status, 404);
    const rr = await fetch(on.B + '/api/essai-managed/faits', { headers: { authorization: 'Bearer ' + on.jt } });
    const jj = rr.status === 200 ? await rr.json() : null;
    v('allumé, avec le jeton : les chiffres du VRAI serveur (état de santé réel, règles de Max)', [rr.status, jj && jj.essai, jj && jj.lisible, jj && jj.regles.length >= 8], [200, true, true, true]);
    const hs = await (await fetch(on.B + '/health')).json();
    vrai('⛔ /health est inchangé : aucun champ de l’essai', !JSON.stringify(hs).includes('essai'));
    off.arreter(); on.arreter();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); process.exit(1); });
