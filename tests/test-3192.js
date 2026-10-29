/* ⛔ CE QUE CE FICHIER GARDE — LA REVUE DU WEEK-END CONTRE LE VRAI SERVEUR (29 octobre 2026). Le vrai `server/index.js`, isolé sur 127.0.0.1, un FAUX Claude à la place d'Anthropic (même méthode que
   `test-3123`) ; HTTP seulement. `test-3191` joue le MODULE ; celui-ci prouve que les PIÈCES sont BRANCHÉES — la couture qu'un banc de module ne voit pas :
     · les routes de la revue existent, au patron seul ; le minuteur est coupé par `agents.reunionsAuto: false` (aucun appel de lui-même) ;
     · « lancer » joue la revue : seize appels à Claude, un par agent, l'outil forcé `proposer_regles`, et les règles arrivent dans la VRAIE file de validations (type `regle_agent`) ;
     · aucun mode Auto / Brouillon n'a bougé ;
     · ⛔ RIEN NE S'APPLIQUE SANS JUSTIN, de bout en bout : une règle en attente ou refusée n'est dans aucun prompt envoyé à Claude ; acceptée par la VRAIE route de décision, elle est dans le
       prompt de SON agent (et de personne d'autre) — et elle y est encore après un redémarrage du serveur ;
     · une seconde revue la même semaine est refusée (409). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3192-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); fin(); process.exit(1); }, 170000).unref();
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(50); } return false; };
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

console.log('\n── 3192 · la revue du week-end contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl');
  /* Le faux Claude : l'outil forcé `proposer_regles` → deux règles qui portent le prénom de l'agent ; tout autre appel → un texte. Chaque requête est GARDÉE (agent, outil forcé, système) :
     c'est ce qui prouve ce qui part chez Anthropic. */
  fs.writeFileSync(PRE, `let n = 0; const vrai = globalThis.fetch; globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { const corps = String(opts && opts.body); const j = JSON.parse(corps);
    const nom = (/^Tu es (\\S+),/.exec(j.system) || [])[1] || '?';
    const force = j.tool_choice && j.tool_choice.name || '';
    require('fs').appendFileSync(${JSON.stringify(TRACE)}, JSON.stringify({ nom, force, system: j.system }) + '\\n');
    const bloc = (content, stop) => new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: stop || 'end_turn', content: content, usage: { input_tokens: 500, output_tokens: 80 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (force === 'proposer_regles') return bloc([{ type: 'tool_use', id: 'toolu_revue', name: 'proposer_regles', input: { regles: [
      { regle: 'Avant de citer un chiffre, relire sa date dans le relevé (' + nom + ').', constat: 'trois chiffres sans date' },
      { regle: 'Dire d’abord ce qui est fait, puis ce qui reste à décider (' + nom + ').', constat: 'deux comptes rendus confus' }] } }], 'tool_use');
    return bloc([{ type: 'text', text: 'Réponse ' + (++n) + ' de ' + nom + '.' }]); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-3192';
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);   // les heures de travail ne regardent pas ce banc (`test-3021`)
  fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_3192' },
    agents: { cleApi: 'sk-ant-' + 'api03-banc-3192-xxxxxxxxxxxxxxxx', reunionsAuto: false } }));
  const demarrer = async () => {
    const PORT = await libre(); let journal = '';
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' }), stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 120 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    return { e, B, vivant, journal: () => journal };
  };
  let S = await demarrer();
  vrai('le serveur démarre', S.vivant, S.journal().slice(0, 600)); if (!S.vivant) process.exit(1);
  vrai('la revue est montée SANS minuterie (le réglage des bancs)', /revue du week-end montée SANS minuterie/.test(S.journal()), S.journal().slice(0, 800));
  let nIp = 0; const ip = () => '10.9.' + Math.floor(nIp++ / 30) + '.' + (nIp % 250 + 1);
  let lj = null;
  const connecter = async () => { lj = await (await fetch(S.B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.8.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json(); };
  await connecter();
  const G = async u => { const r = await fetch(S.B + u, { headers: { Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': ip() } }); let j = null; try { j = await r.json(); } catch (x) {} return Object.assign({ _s: r.status }, j); };
  const P = async (u, c) => { const r = await fetch(S.B + u, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': ip() }, body: JSON.stringify(c) }); let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j }; };
  const trace = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];

  const IDS = (await G('/api/monitor/agents')).agents.map(a => a.id);
  for (const id of IDS) await P('/api/monitor/agents/mode', { agent: id, mode: 'brouillon' });
  const modes = async () => Object.fromEntries((await G('/api/monitor/agents')).agents.map(a => [a.id, a.mode]));
  const avant = await modes();
  v('(population) seize agents en brouillon', Object.values(avant).filter(m => m === 'brouillon').length, 16);

  console.log('\n1. Les routes existent, au patron seul, et rien ne démarre toute seule');
  {
    const sans = await fetch(S.B + '/api/monitor/agents/revue', { headers: { 'X-Forwarded-For': ip() } });
    vrai('⛔ sans compte : refusé', [401, 403].includes(sans.status), sans.status);
    const r = await G('/api/monitor/agents/revue');
    v('le patron lit : rien à valider, une prochaine revue annoncée, aucune revue faite', [r._s, r.aValider, !!(r.prochaine && r.prochaine.libelle), r.derniere], [200, 0, true, null]);
    v('⛔ aucun appel à Claude de lui-même (minuterie coupée)', trace().length, 0);
  }

  console.log('\n2. « Lancer » joue la revue : seize appels, les règles arrivent dans la VRAIE file de validations');
  {
    const l = await P('/api/monitor/agents/revue/lancer', {});
    v('lancer répond 200', l.s, 200);
    const fini = await att(async () => { const r = await G('/api/monitor/agents/revue'); return r.derniere && r.derniere.statut === 'terminee'; }, 25000);
    vrai('la revue se termine', fini);
    const t = trace().filter(x => x.force === 'proposer_regles');
    v('seize appels, un par agent, l’outil proposer_regles FORCÉ', [t.length, new Set(t.map(x => x.nom)).size], [16, 16]);
    vrai('chaque requête porte la fiche de l’agent et la consigne de la revue', t.every(x => /TA FICHE DE POSTE/.test(x.system) && /REVUE DU WEEK-END/.test(x.system)), t.length);
    const val = await G('/api/monitor/agents/validations');
    const regles = (val.validations || []).filter(x => x.type === 'regle_agent');
    v('trente-deux règles à valider (deux par agent), toutes en attente', [regles.length, regles.filter(x => x.statut === 'en_attente').length], [32, 32]);
    vrai('la file ne porte que la référence, et le résumé dit pour qui et quel constat', regles.every(x => /^rg[a-f0-9]{8}$/.test(x.params.regle) && /^Règle pour [^:]+ : /.test(x.resume) && /constat :/.test(x.resume)), JSON.stringify(regles[0]));
    v('⛔ aucun mode Auto / Brouillon n’a bougé', await modes(), avant);
    const eq = await fetch(S.B + '/api/monitor/conversations/equipe', { headers: { Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': ip() } }).then(r => r.json());
    vrai('Équipe dit « Revue du week-end : 32 règles proposées par 16 agents » et que rien ne s’applique avant l’accord', (eq.messages || []).some(m => m.de === 'systeme' && /Revue du week-end : 32 règles proposées par 16 agents/.test(m.texte) && /rien ne s’applique avant ton accord/.test(m.texte)));
    const bis = await P('/api/monitor/agents/revue/lancer', {});
    v('⛔ une seconde revue la même semaine : refusée (409)', bis.s, 409);
    v('…et sans appel de plus', trace().filter(x => x.force === 'proposer_regles').length, 16);
  }

  console.log('\n3. ⛔ Rien ne s’applique sans Justin — de bout en bout');
  {
    const val = (await G('/api/monitor/agents/validations')).validations.filter(x => x.type === 'regle_agent');
    const deCamille = val.filter(x => x.agent === 'camille'), deLea = val.filter(x => x.agent === 'lea');
    vrai('(population) Camille et Léa ont chacune deux règles en attente', deCamille.length === 2 && deLea.length === 2);
    const REGLE_CAMILLE = 'Avant de citer un chiffre, relire sa date dans le relevé (Camille).', REGLE_REFUSEE = 'Dire d’abord ce qui est fait, puis ce qui reste à décider (Camille).';
    const parole = async (fil, texte) => { const a0 = trace().length; await P('/api/monitor/conversations/envoyer', { fil, texte }); await att(async () => trace().length > a0, 8000); await dormir(300); return trace().slice(a0).filter(x => x.nom === (fil === 'camille' ? 'Camille' : 'Léa')).pop(); };
    let s = await parole('camille', 'Bonjour Camille, où en es-tu ?');
    vrai('(population) le prompt de Camille a été relevé', !!s && /TA FICHE DE POSTE/.test(s.system));
    vrai('⛔ EN ATTENTE : ni la règle de Camille ni celle de Léa ne sont dans son prompt', !s.system.includes(REGLE_CAMILLE) && !s.system.includes(REGLE_REFUSEE) && !/Tes règles de travail/.test(s.system));
    const r1 = val.find(x => x.agent === 'camille' && x.resume.includes('relire sa date')), r2 = val.find(x => x.agent === 'camille' && x.resume.includes('ce qui reste à décider'));
    const d1 = await P('/api/monitor/agents/validations/decider', { id: r1.id, decision: 'accepter' }), d2 = await P('/api/monitor/agents/validations/decider', { id: r2.id, decision: 'refuser' });
    v('Justin accepte l’une, refuse l’autre (la vraie route de décision)', [d1.s, d2.s], [200, 200]);
    s = await parole('camille', 'Camille, un second point ?');
    vrai('⛔ ACCEPTÉE : la règle est dans le prompt de Camille, avec la mention qu’elle ne donne aucun droit', s.system.includes(REGLE_CAMILLE) && /VALIDÉES par Justin/.test(s.system) && /AUCUN droit de plus/.test(s.system));
    vrai('⛔ REFUSÉE : elle n’y est pas', !s.system.includes(REGLE_REFUSEE));
    const sl = await parole('lea', 'Léa, un point ?');
    vrai('⛔ le prompt de Léa ne porte ni la règle de Camille, ni la sienne (non validée)', !!sl && !sl.system.includes(REGLE_CAMILLE) && !/Tes règles de travail/.test(sl.system));
    const rev = await G('/api/monitor/agents/revue');
    v('la route de lecture dit : une validée, une refusée, 30 en attente', [rev.regles.camille.map(x => x.statut).sort(), rev.aValider], [['refusee', 'validee'], 30]);

    console.log('\n4. Après un redémarrage du serveur, la règle validée sert toujours, et la revue n’est pas rejouée');
    S.e.kill('SIGKILL'); await dormir(300);
    S = await demarrer(); vrai('le serveur redémarre', S.vivant, S.journal().slice(0, 400)); await connecter();
    const rev2 = await G('/api/monitor/agents/revue');
    v('les règles et leurs statuts sont relus', [rev2.regles.camille.map(x => x.statut).sort(), rev2.aValider, rev2.derniere && rev2.derniere.statut], [['refusee', 'validee'], 30, 'terminee']);
    const a0 = trace().filter(x => x.force === 'proposer_regles').length;
    const s2 = await parole('camille', 'Camille, tu as redémarré ?');
    vrai('⛔ la règle acceptée est dans son prompt après le redémarrage', !!s2 && s2.system.includes(REGLE_CAMILLE) && !s2.system.includes(REGLE_REFUSEE));
    v('⛔ et aucune revue n’a été rejouée', trace().filter(x => x.force === 'proposer_regles').length, a0);
    const ret = await P('/api/monitor/agents/revue/retirer', { id: rev2.regles.camille.find(x => x.statut === 'validee').id });
    const s3 = await parole('camille', 'Camille, une dernière ?');
    vrai('le patron retire la règle : elle sort du prompt', ret.s === 200 && !s3.system.includes(REGLE_CAMILLE), ret.s);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
