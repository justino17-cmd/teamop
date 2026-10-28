/* ⛔ CE QUE CE FICHIER GARDE — LES AGENTS AUTONOMES CONTRE LE VRAI SERVEUR (28 octobre 2026, Justin : « La limite de messages par heure, c'est pas normal […] Je veux qu'à chaque fois qu'ils ont fini, ils
   mettent dans le groupe "je viens d'effectuer ça" »). Le vrai `server/index.js`, isolé sur 127.0.0.1, un FAUX Claude à la place d'Anthropic (même méthode que `test-2881`, `test-2960`) ; HTTP seulement.
   Les bancs 3113 à 3122 montent les modules ; celui-ci prouve que les PIÈCES sont BRANCHÉES (racine, annonces, budget du jour, /health) — la couture que les bancs de modules ne voient pas.
     · « @tous faites-moi un point de votre journée merci » : seize réponses (quinze brèves + la synthèse de Victor), AUCUNE ligne de limite, les messages portent la racine de Justin au registre ;
     · un travail pris puis TERMINÉ par l'outil `terminer` : « ✅ Je viens de terminer : … (demandé par Justin) » dans Équipe, marquée « fait », clé stable rangée sur le disque, et la ligne survit à un redémarrage ;
     · le budget du jour est tenu par le vrai cerveau (dépense côté « racine », rien côté « sans racine ») ;
     · `/health` publie `agentsRefus` (deux nombres) ; Victor est le meneur de « clients » ; la page de la Tour reçoit `fait:true` ;
     · treize questions de Justin à une même agent dans l'heure : treize réponses. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3123-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); fin(); process.exit(1); }, 170000).unref();
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(50); } return false; };
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

console.log('\n── 3123 · les agents autonomes contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl');
  /* Le faux Claude : « TRAVAIL-3123 » → une phrase + l'outil prendre ; « TERMINER-3123 » → l'outil terminer sur la première tâche listée ; sinon un texte neuf à chaque appel. Il rend l'usage (de quoi faire un coût). */
  fs.writeFileSync(PRE, `let n = 0; const vrai = globalThis.fetch; globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { const corps = String(opts && opts.body); require('fs').appendFileSync(${JSON.stringify(TRACE)}, corps.length + '\\n');
    const j = JSON.parse(corps); const dernier = String((j.messages[j.messages.length - 1] || {}).content || '');
    const nom = (/^Tu es (\\S+),/.exec(j.system) || [])[1] || '?';
    const premiereTache = (/^- \\[([0-9a-f]{12})\\]/m.exec(j.system) || [])[1] || 'aucune';
    const bloc = (content, stop) => new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: stop || 'end_turn', content: [{ type: 'thinking', thinking: 'je réfléchis…', signature: 'sig' }].concat(content), usage: { input_tokens: 500, output_tokens: 80 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    if (/TRAVAIL-3123/.test(dernier)) return bloc([{ type: 'text', text: 'Oui, je m’en occupe.' }, { type: 'tool_use', id: 'toolu_prendre', name: 'prendre', input: { texte: 'Préparer la relance des devis en attente' } }], 'tool_use');
    if (/TERMINER-3123/.test(dernier)) return bloc([{ type: 'text', text: 'C’est fait.' }, { type: 'tool_use', id: 'toolu_terminer', name: 'terminer', input: { tache: premiereTache, resume: 'Relance préparée pour jean@client.fr, rappel au 06 12 34 56 78' } }], 'tool_use');
    return bloc([{ type: 'text', text: 'Réponse ' + (++n) + ' de ' + nom + '.' }]); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-3123';
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);   // les heures de travail ne regardent pas ce banc (`test-3021`)
  fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_3123' },
    agents: { cleApi: 'sk-ant-' + 'api03-banc-3123-xxxxxxxxxxxxxxxx', reunionsAuto: false } }));
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
  let nIp = 0; const ip = () => '10.7.' + Math.floor(nIp++ / 30) + '.' + (nIp % 250 + 1);
  const connecter = async () => (await (await fetch(S.B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.8.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json());
  let lj = await connecter();
  const G = async u => (await (await fetch(S.B + u, { headers: { Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': ip() } })).json());
  const P = async (u, c) => { const r = await fetch(S.B + u, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': ip() }, body: JSON.stringify(c) }); let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j }; };
  const appels = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).length : 0;
  const fil = async f => (await G('/api/monitor/conversations/' + f)).messages || [];
  const brouillon = async id => (await P('/api/monitor/agents/mode', { agent: id, mode: 'brouillon' })).s;
  const registre = () => JSON.parse(fs.readFileSync(path.join(D, 'agents-messages.json'), 'utf8'));

  const IDS = (await G('/api/monitor/agents')).agents.map(a => a.id);
  for (const id of IDS) await brouillon(id);
  v('(population) seize agents en brouillon', (await G('/api/monitor/agents')).agents.filter(a => a.mode === 'brouillon').length, 16);

  console.log('\n1. « @tous faites-moi un point de votre journée merci » : seize réponses, aucune ligne de limite');
  {
    const a0 = appels();
    const r = await P('/api/monitor/conversations/envoyer', { fil: 'equipe', texte: '@tous faites-moi un point de votre journée merci' });
    await att(async () => appels() >= a0 + 16, 15000); await dormir(800);
    const m = await fil('equipe');
    const ag = m.filter(x => x.de !== 'justin' && x.de !== 'systeme');
    v('⛔ quinze réponses brèves + la synthèse de Victor, dans cet ordre (Victor le dernier), seize appels à Claude', [ag.length, ag[ag.length - 1].de, appels() - a0], [16, 'victor', 16]);
    vrai('⛔ AUCUNE ligne du système, aucune « limite », aucun « par heure » dans le fil', !m.some(x => x.de === 'systeme' || /limite|par heure/i.test(x.texte)), JSON.stringify(m.filter(x => x.de === 'systeme').map(x => x.texte)));
    const reg = registre();
    const idJ = r.j.message.id;
    v('⛔ le message de Justin est sa propre racine au registre ; les seize réponses la portent', [reg.find(x => x.id === idJ).racine === idJ, reg.filter(x => x.racine === idJ && x.de !== 'justin').length], [true, 16]);
    vrai('…et la Tour reçoit des messages sans champ `racine` (c\'est une affaire du serveur)', m.every(x => !('racine' in x)));
    const b = JSON.parse(fs.readFileSync(path.join(D, 'agents-budget.json'), 'utf8'));
    vrai('⛔ le vrai cerveau a tenu le budget du jour : de l\'argent côté « racine », rien côté « sans racine »', b.jour && b.jour.racine > 0 && b.jour.nonRacine === 0, JSON.stringify(b.jour));
    const sante = await (await fetch(S.B + '/health')).json();
    v('`/health` publie `agentsRefus` (deux nombres, à zéro)', sante.agentsRefus, { horaire: 0, chaine: 0 });
  }

  console.log('\n2. Treize questions de Justin à Léa dans l\'heure : treize réponses');
  {
    for (let i = 1; i <= 13; i++) { const a0 = appels(); await P('/api/monitor/conversations/envoyer', { fil: 'lea', texte: 'Question ' + i + ' ?' }); await att(async () => appels() > a0, 6000); await dormir(250); }
    const m = await fil('lea');
    v('⛔ treize réponses de Léa, aucune ligne du système', [m.filter(x => x.de === 'lea').length, m.filter(x => x.de === 'systeme').length], [13, 0]);
  }

  console.log('\n3. Un travail pris, puis TERMINÉ : « Je viens de terminer… » dans Équipe');
  {
    await P('/api/monitor/conversations/envoyer', { fil: 'camille', texte: 'Camille, TRAVAIL-3123 prépare la relance des devis' });
    await att(async () => (await G('/api/monitor/agents/taches')).taches.some(k => k.vers === 'camille' && k.statut === 'prise'), 8000);
    await dormir(400);
    const tache = (await G('/api/monitor/agents/taches')).taches.find(k => k.vers === 'camille' && k.statut === 'prise');
    vrai('(population) Camille a pris la tâche, demandée par Justin', !!tache && tache.de === 'justin', JSON.stringify(tache));
    const a0 = appels();
    await P('/api/monitor/conversations/envoyer', { fil: 'camille', texte: 'Camille, TERMINER-3123 où en es-tu ?' });
    await att(async () => appels() > a0, 6000);
    await att(async () => (await fil('equipe')).some(x => x.fait), 6000);
    const faits = (await fil('equipe')).filter(x => x.fait);
    v('⛔ UNE annonce dans Équipe, de Camille, marquée « fait » pour la Tour, demandeur nommé, résumé MASQUÉ (adresse et numéro)', [faits.length, faits[0] && faits[0].de, faits[0] && faits[0].texte], [1, 'camille', '✅ Je viens de terminer : Relance préparée pour (adresse), rappel au (numéro) (demandé par Justin)']);
    vrai('…aucune mention, aucun « @ » dans ce qui est servi à la Tour', faits[0] && faits[0].mentions.length === 0 && !/@/.test(faits[0].texte));
    const reg = registre().filter(x => x.fait);
    vrai('⛔ la clé du fait est rangée sur le disque avec le message (`fait:` + l\'identifiant de la tâche)', reg.length === 1 && reg[0].cle === 'fait:' + tache.id, JSON.stringify(reg));
    vrai('…elle n\'est pas non plus comptée dans les douze messages de Camille (population : elle en a écrit deux autres)', registre().filter(x => x.de === 'camille' && !x.fait).length >= 2);
    vrai('la tâche est bien terminée côté serveur', (await G('/api/monitor/agents/taches')).taches.find(k => k.id === tache.id).statut === 'faite');

    console.log('\n4. Un redémarrage : la ligne reste, et la même tâche ne se redit pas');
    S.e.kill('SIGTERM'); await dormir(600);
    S = await demarrer();
    vrai('le serveur redémarre', S.vivant, S.journal().slice(0, 400));
    lj = await connecter();
    const apres = (await fil('equipe')).filter(x => x.fait);
    v('⛔ la ligne est toujours là après le redémarrage (même identifiant, même texte)', apres.map(x => [x.id, x.texte]), faits.map(x => [x.id, x.texte]));
    const r2 = registre().filter(x => x.fait);
    v('…et le registre n\'a gardé qu\'une annonce pour cette tâche', r2.filter(x => x.cle === 'fait:' + tache.id).length, 1);
  }

  console.log('\n5. Victor est le meneur de « clients » (la Tour le lit)');
  {
    const l = await G('/api/monitor/conversations?tous=1');
    const c = l.fils.find(f => f.fil === 'clients');
    v('le groupe « clients » : meneur Victor, sept membres dont lui', [c.meneur, c.membres.length, c.membres[0].id], ['victor', 7, 'victor']);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
