/* ⛔ CE QUE CE FICHIER GARDE — UNE RÉPONSE D'AGENT REFUSÉE SE DIT, ELLE NE SE TAIT PAS (23 octobre 2026, campagne de vérification de la Tour).
   Le vrai `server/index.js`, isolé sur 127.0.0.1, un FAUX Claude à la place d'Anthropic (même méthode que `test-2881` et `test-2883`).
   Trouvé en jouant « Parler » à la main : `conversations.parler` refuse une réponse d'agent dans trois cas — le même texte déjà dit dans ce fil depuis 24 h
   (`doublon`), douze messages par heure et par agent (`trop_de_messages`), vingt messages d'agents par heure dans un fil (`trop_de_messages_fil`). `reveiller`
   (agent-equipe.js) mettait la raison dans sa valeur de retour… que personne ne lit : Justin posait sa question, « X écrit… » disparaissait, et RIEN ne venait —
   pas de réponse, pas d'explication. C'est la règle de cette page (« un refus se montre : il faut que l'écran sache le dire ») appliquée à une réponse.
   Ce que le banc exige, sur le vrai serveur :
     · un agent qui redit exactement la même chose dans son fil privé : UNE ligne du système, qui le dit (et pas une de plus à la troisième fois) ;
     · (28 octobre 2026, Justin : « La limite de messages par heure, c'est pas normal ») le treizième message d'un agent à Justin, un @tous qui dépasse les vingt messages du fil : ils PARTENT, et aucune
       ligne « limite » n'est écrite — ces deux parties disaient l'inverse (la limite se dit), elles disent maintenant qu'un message de Justin n'en rencontre plus ;
     · rien de tout cela ne se dit quand la réponse PART (population : les réponses normales sont bien là). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2960-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); fin(); process.exit(1); }, 170000).unref();
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(50); } return false; };
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

console.log('\n── 2960 · une réponse d\'agent refusée se dit ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl');
  /* Le faux Claude : « MEME-2960 » → TOUJOURS la même phrase ; sinon un texte neuf à chaque appel (un compteur) — c'est ce qui sépare le doublon des plafonds. */
  fs.writeFileSync(PRE, `let n = 0; const vrai = globalThis.fetch; globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { const corps = String(opts && opts.body); require('fs').appendFileSync(${JSON.stringify(TRACE)}, corps.length + '\\n');
    const j = JSON.parse(corps); const dernier = String((j.messages[j.messages.length - 1] || {}).content || '');
    const nom = (/^Tu es (\\S+),/.exec(j.system) || [])[1] || '?';
    const texte = /MEME-2960/.test(dernier) ? 'Oui, c’est noté.' : 'Réponse ' + (++n) + ' de ' + nom + '.';
    return new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: 'je réfléchis…', signature: 'sig' }, { type: 'text', text: texte }], usage: { input_tokens: 500, output_tokens: 80 } }), { status: 200, headers: { 'content-type': 'application/json' } }); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-2960';
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);   // les heures de travail ne regardent pas ce banc (`test-3021`)
  fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_2960' },
    agents: { cleApi: 'sk-ant-' + 'api03-banc-2960-xxxxxxxxxxxxxxxx', reunionsAuto: false } }));   // pas de réunion due pendant le banc (vendredi 18 h-23 h, lundi matin, heure de Paris)
  const PORT = await libre(); let journal = '';
  const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' }), stdio: ['ignore', 'pipe', 'pipe'] });
  e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
  const B = 'http://127.0.0.1:' + PORT; let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  vrai('le serveur démarre', vivant, journal.slice(0, 600)); if (!vivant) process.exit(1);
  let nIp = 0; const ip = () => '10.6.' + Math.floor(nIp++ / 30) + '.' + (nIp % 250 + 1);
  const lj = await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.7.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json();
  const G = async u => (await (await fetch(B + u, { headers: { Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': ip() } })).json());
  const P = async (u, c) => { const r = await fetch(B + u, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + lj.token, 'X-Forwarded-For': ip() }, body: JSON.stringify(c) }); let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j }; };
  const appels = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).length : 0;
  const fil = async f => (await G('/api/monitor/conversations/' + f)).messages || [];
  const systeme = async f => (await fil(f)).filter(m => m.de === 'systeme').map(m => m.texte);
  const brouillon = async id => (await P('/api/monitor/agents/mode', { agent: id, mode: 'brouillon' })).s;
  /* envoie et attend que Claude ait été appelé ET que le serveur ait fini de traiter (le dernier message de l'agent ou une ligne du système) */
  const dire = async (f, texte) => { const a0 = appels(); await P('/api/monitor/conversations/envoyer', { fil: f, texte }); await att(async () => appels() > a0, 6000); await dormir(350); };

  console.log('\n1. Le même texte redit dans le fil privé : le silence est une panne');
  v('Hugo passe en brouillon', await brouillon('hugo'), 200);
  await dire('hugo', 'Tu me lis ? MEME-2960 a');
  let m = await fil('hugo');
  v('(population) la première réponse est là, et aucune ligne du système', [m.filter(x => x.de === 'hugo').map(x => x.texte), m.filter(x => x.de === 'systeme').length], [['Oui, c’est noté.'], 0]);
  await dire('hugo', 'Tu me lis encore ? MEME-2960 b');
  m = await fil('hugo');
  v('(population) Claude a bien été appelé deux fois pour Hugo', appels(), 2);
  v('la seconde réponse identique n\'est pas écrite deux fois', m.filter(x => x.de === 'hugo').length, 1);
  const s1 = await systeme('hugo');
  vrai('⛔ …et le fil DIT pourquoi : une ligne du système qui nomme Hugo et « exactement »', s1.length === 1 && /Hugo/.test(s1[0]) && /exactement/.test(s1[0]), s1);
  await dire('hugo', 'Et encore ? MEME-2960 c');
  v('troisième fois : la ligne n\'est pas répétée (une par heure)', (await systeme('hugo')).length, 1);

  /* Justin, 28 octobre 2026 : « La limite de messages par heure, c'est pas normal ». Ces deux parties gardaient les lignes « limite de messages par heure » : elles gardent désormais qu'un message
     de Justin n'en rencontre PLUS jamais (chaque message de Justin porte une racine et son budget — `conversations.js`, test-3113 à test-3122). Ce que le banc exige toujours : une réponse qui part est là. */
  console.log('\n2. Treize questions de Justin à Léa dans l\'heure : les treize reçoivent leur réponse, aucune ligne de limite');
  v('Léa passe en brouillon', await brouillon('lea'), 200);
  for (let i = 1; i <= 13; i++) await dire('lea', 'Question ' + i + ' ?');
  m = await fil('lea');
  v('⛔ treize réponses de Léa, pas douze (le plafond « douze par heure » ne s\'applique plus à ce qui répond à Justin)', m.filter(x => x.de === 'lea').length, 13);
  v('…et AUCUNE ligne du système (ni « limite », ni « par heure »)', m.filter(x => x.de === 'systeme').length, 0);

  console.log('\n3. Deux @tous de suite dans « Équipe » : chacun répond UNE fois, Victor synthétise, aucune ligne de limite');
  const IDS = (await G('/api/monitor/agents')).agents.map(a => a.id);
  for (const id of IDS) if (id !== 'hugo' && id !== 'lea') await brouillon(id);
  v('(population) seize agents en brouillon', (await G('/api/monitor/agents')).agents.filter(a => a.mode === 'brouillon').length, 16);
  const a0 = appels();
  await P('/api/monitor/conversations/envoyer', { fil: 'equipe', texte: '@tous premier point' });
  await att(async () => appels() >= a0 + 16, 12000); await dormir(800);
  m = await fil('equipe');
  const agents1 = m.filter(x => x.de !== 'justin' && x.de !== 'systeme').length;
  v('le premier @tous : quinze réponses d\'agents + la synthèse de Victor (seize)', agents1, 16);
  await P('/api/monitor/conversations/envoyer', { fil: 'equipe', texte: '@tous second point' });
  await att(async () => appels() >= a0 + 32, 12000); await dormir(800);
  m = await fil('equipe');
  const agents2 = m.filter(x => x.de !== 'justin' && x.de !== 'systeme').length;
  v('⛔ le second @tous : seize réponses de plus (trente-deux en tout) — le plafond de vingt du fil ne s\'applique plus à Justin', agents2, 32);
  const s3 = await systeme('equipe');
  vrai('⛔ …et AUCUNE ligne du système ne parle de limite', !s3.some(t => /limite|par heure/.test(t)), s3);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
