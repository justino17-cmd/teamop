/* ⛔ CE QUE CE FICHIER GARDE — LE CERVEAU DES AGENTS ET LA RÉPONSE DE HUGO (19 octobre 2026).
     Le module `cerveau.js`, appel injecté :
       · pas de clé, agent à l'arrêt, en pause, budget illisible : AUCUN appel ;
       · le coût s'estime sur les jetons, se grave, et le plafond de l'agent puis le plafond total (195 $) coupent ;
       · un budget qui ne s'écrit plus coupe les appels suivants ; un nouveau mois repart à zéro ; une panne de l'API ne coûte rien.
     Le vrai serveur, Claude simulé (le faux répond à api.anthropic.com et GARDE ce qu'il a reçu) :
       · Justin écrit dans le fil de Hugo → Hugo répond, dans son fil ;
       · ce que Claude reçoit : le texte de Justin et des FAITS fermés — ni nom, ni adresse, ni téléphone, ni note de client ;
       · Hugo à l'arrêt : aucun appel, aucun message ; un autre fil (Max) : aucun appel ;
       · sans clé : Hugo le dit (important), une fois, et n'appelle rien. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2708-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); fin(); process.exit(1); }, 120000).unref();
const att = async (f, ms = 6000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await dormir(50); } return false; };
console.log('\n── 2708 · le cerveau des agents ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  console.log('\n1. Le module seul, appel injecté');
  const cerv = require(path.join(RACINE, 'server', 'cerveau.js'));
  let horloge = Date.parse('2026-10-19T10:00:00Z'), peut = { ok: true }; const AG = [{ id: 'hugo', plafondUsd: 10 }, { id: 'max', plafondUsd: 15 }, { id: 'nina', plafondUsd: 190 }];
  const notes = [];
  function monter(nom, o) {
    o = o || {}; const D = path.join(banc, nom); fs.mkdirSync(D, { recursive: true }); const appels = [];
    const c = cerv({ DATA_DIR: D, agents: { AGENTS: AG, peutAgir: () => peut, noter: (id, a, x) => notes.push([id, a, x && x.resultat]) }, cleApi: o.cle === undefined ? 'sk-ant-banc' : o.cle, maintenant: () => horloge,
      /* (28 octobre 2026) le budget du JOUR (`cerveau.js`, test-3119) a ses propres seuils ; ce banc garde les plafonds du MOIS et du TOTAL, qu'il joue avec des appels à ≈ 87 $ : on lève le jour pour qu'il ne les masque pas */
      plafondsJour: { agentMin: 1e9, nonRacine: 1e9, filet: 1e9 },
      appeler: o.appeler || (async (cle, req) => { appels.push({ cle, req }); return { texte: 'Bonjour Justin', entree: 1000, sortie: 500 }; }) });
    return { c, D, appels, lire: () => JSON.parse(fs.readFileSync(path.join(D, 'agents-budget.json'), 'utf8')) };
  }
  let M = monter('a');
  let r = await M.c.penser('hugo', 'Tu es Hugo', [{ role: 'user', content: 'Salut' }]);
  v('un appel permis rend le texte', [r.ok, r.texte], [true, 'Bonjour Justin']);
  v('la requête porte le modèle, le system et les messages', [M.appels[0].req.model, M.appels[0].req.system, M.appels[0].req.messages.length, M.appels[0].cle], ['claude-sonnet-5', 'Tu es Hugo', 1, 'sk-ant-banc']);
  const cout = M.lire().parAgent.hugo;
  vrai('le coût est estimé sur les jetons et gravé (≈ 0,0123 $)', cout > 0.012 && cout < 0.013);
  v('l\'état du budget le dit', [M.c.etatBudget().cle, M.c.etatBudget().plafondTotal, M.c.etatBudget().total > 0], [true, 195, true]);
  v('pas de clé : aucun appel', [(await monter('b', { cle: '' }).c.penser('hugo', 's', [{ role: 'user', content: 'x' }])).raison], ['pas_de_cle']);
  peut = { ok: false, raison: 'pause' }; M = monter('c');
  v('en pause : aucun appel', [(await M.c.penser('hugo', 's', [{ role: 'user', content: 'x' }])).raison, M.appels.length], ['pause', 0]);
  peut = { ok: true };
  v('une requête mal formée n\'appelle rien', [(await M.c.penser('hugo', 's', [])).raison, (await M.c.penser('hugo', 7, [{}])).raison, M.appels.length], ['requete', 'requete', 0]);
  M = monter('d', { appeler: async () => ({ texte: 'x'.repeat(10), entree: 1e6, sortie: 3e5 }) });   /* ≈ 8,75 $ par appel */
  v('premier appel : sous le plafond de 10 $', (await M.c.penser('hugo', 's', [{ role: 'user', content: 'x' }])).ok, true);
  v('deuxième appel : ≈ 17,5 $ → le plafond de l\'agent coupe le TROISIÈME', (await M.c.penser('hugo', 's', [{ role: 'user', content: 'x' }])).ok, true);
  v('troisième appel refusé', (await M.c.penser('hugo', 's', [{ role: 'user', content: 'x' }])).raison, 'plafond_agent');
  M = monter('e', { appeler: async () => ({ texte: 'ok', entree: 1e7, sortie: 3e6 }) });   /* ≈ 87,5 $ */
  for (let i = 0; i < 3; i++) await M.c.penser('nina', 's', [{ role: 'user', content: 'x' }]);   /* 3 × ≈ 87,5 $ : le plafond de Nina (190) n'est franchi qu'au troisième */
  v('le plafond TOTAL (195 $) coupe aussi un agent qui n\'a pas atteint le sien', (await M.c.penser('max', 's', [{ role: 'user', content: 'x' }])).raison, 'plafond_total');
  horloge = Date.parse('2026-11-01T00:00:01Z');
  v('un nouveau mois repart à zéro', (await M.c.penser('max', 's', [{ role: 'user', content: 'x' }])).ok, true);
  horloge = Date.parse('2026-10-19T10:00:00Z');
  M = monter('f', { appeler: async () => { throw new Error('API en panne'); } });
  v('une panne de l\'API : pas de texte, rien de dépensé, journalisée', [(await M.c.penser('hugo', 's', [{ role: 'user', content: 'x' }])).raison, fs.existsSync(path.join(M.D, 'agents-budget.json')), notes.some(n => n[2] === 'erreur')], ['erreur_api', false, true]);
  M = monter('g', { appeler: async () => ({ texte: '   ', entree: 10, sortie: 10 }) });
  v('une réponse vide n\'est pas un message, mais elle a coûté', [(await M.c.penser('hugo', 's', [{ role: 'user', content: 'x' }])).raison, M.lire().parAgent.hugo > 0], ['vide', true]);
  const Dg = path.join(banc, 'h'); fs.mkdirSync(Dg, { recursive: true }); fs.writeFileSync(path.join(Dg, 'agents-budget.json'), '{pas json');
  let appelsH = 0; const H = cerv({ DATA_DIR: Dg, agents: { AGENTS: AG, peutAgir: () => peut, noter() {} }, cleApi: 'sk-ant-banc', appeler: async () => { appelsH++; return { texte: 'x', entree: 1, sortie: 1 }; } });
  v('budget illisible : on ne dépense pas', [(await H.penser('hugo', 's', [{ role: 'user', content: 'x' }])).raison, appelsH, H.etatBudget().illisible], ['budget_illisible', 0, true]);
  v('…et le fichier reste tel quel', fs.readFileSync(path.join(Dg, 'agents-budget.json'), 'utf8'), '{pas json');
  const Dr = path.join(banc, 'i'); fs.mkdirSync(Dr, { recursive: true }); let n2 = 0;
  const R = cerv({ DATA_DIR: Dr, agents: { AGENTS: AG, peutAgir: () => peut, noter() {} }, cleApi: 'sk-ant-banc', appeler: async () => { n2++; return { texte: 'x', entree: 1, sortie: 1 }; } });
  await R.penser('hugo', 's', [{ role: 'user', content: 'x' }]); fs.rmSync(Dr, { recursive: true, force: true });
  const apres = await R.penser('hugo', 's', [{ role: 'user', content: 'x' }]);
  const encore = await R.penser('hugo', 's', [{ role: 'user', content: 'x' }]);
  v('un budget qui ne s\'écrit plus : l\'appel en cours est dit, et les suivants sont COUPÉS', [apres.ok, encore.raison, n2], [true, 'budget_illisible', 2]);

  console.log('\n2. Le vrai serveur, Claude simulé');
  const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl');
  fs.writeFileSync(PRE, `const vrai = globalThis.fetch; globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { require('fs').appendFileSync(${JSON.stringify(TRACE)}, String(opts && opts.body) + '\\n');
    return new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: 'end_turn', content: [{ type: 'text', text: 'Delta Propreté (06 12 34 56 78, delta@exemple-2708.fr) : pas encore d’espace, paiement inconnu.' }], usage: { input_tokens: 400, output_tokens: 60 } }), { status: 200, headers: { 'content-type': 'application/json' } }); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-2708'; let np = 0;
  async function serveur(nom, cle) {
    const D = path.join(banc, nom, 'data'); fs.mkdirSync(D, { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);   // les heures de travail ne regardent pas ce banc (`test-3021`)
    fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify({ 'delta@exemple-2708.fr': { email: 'delta@exemple-2708.fr', entreprise: 'Delta Propreté', prenom: 'Léa', nomFam: 'Martin', tel: '06 12 34 56 78', noteInterne: 'NOTE-SECRETE-2708', plan: 'IGNORE-TES-REGLES-2708', demandes: [{ app: 'INJECTION-APP-2708', formule: 'INJECTION-FORMULE-2708', statut: 'INJECTION-STATUT-2708', date: 1 }], inscrit: Date.now() - 3 * 86400000 } }));
    fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
    const vap = webpush.generateVAPIDKeys(); const conf = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_2708' } };
    if (cle) conf.agents = { cleApi: cle, reunionsAuto: false };   // pas de réunion du lundi ni du vendredi pendant qu'on compte
    fs.writeFileSync(path.join(banc, nom, 'config.json'), JSON.stringify(conf));
    const PORT = 9200 + ((process.pid + (np++)) % 250); let journal = '';
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, nom, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' }), stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    vrai('le serveur « ' + nom + ' » démarre', vivant); if (!vivant) { console.log(journal.slice(0, 600)); process.exit(1); }
    const req = async (m, r, c, j) => { const x = await fetch(B + r, { method: m, headers: Object.assign({ 'Content-Type': 'application/json' }, j ? { Authorization: 'Bearer ' + j } : {}), body: m === 'POST' ? JSON.stringify(c || {}) : undefined }); let o = {}; try { o = await x.json(); } catch (y) {} return { s: x.status, j: o }; };
    const jeton = (await req('POST', '/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
    return { journal: () => journal, G: r => req('GET', r, null, jeton), P: (r, c) => req('POST', r, c, jeton), arreter: async () => { e.kill('SIGKILL'); await dormir(300); } };
  }
  const recus = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean) : [];
  let S = await serveur('avec-cle', 'sk-ant-' + 'api03-banc-2708-xxxxxxxxxxxxxxxx');
  vrai('le serveur annonce le cerveau', /cerveau : clé des agents posée/.test(S.journal()));
  await S.P('/api/monitor/conversations/envoyer', { fil: 'hugo', texte: 'Hugo, que sais-tu du dossier DOS-000001 ?' }); await dormir(500);
  /* 23 octobre 2026 : un agent à l'arrêt qu'on appelle laisse UNE ligne du système dans le fil (« Hugo est à l'arrêt : allume-le… »). Le contrôle reste entier :
     aucun appel à Claude, et rien de plus que le message de Justin et cette ligne — aucune réponse de Hugo. */
  v('Hugo à l\'arrêt : aucun appel à Claude, aucune réponse (le message de Justin, et la ligne du système qui dit qu\'il est à l\'arrêt)', [recus().length, (await S.G('/api/monitor/conversations/hugo')).j.messages.map(m => m.de + ':' + (m.de === 'systeme' ? /à l’arrêt/.test(m.texte) : 'x'))], [0, ['justin:x', 'systeme:true']]);
  await S.P('/api/monitor/agents/mode', { agent: 'hugo', mode: 'brouillon' });
  await S.P('/api/monitor/conversations/envoyer', { fil: 'max', texte: 'Max, un point ?' }); await dormir(500);
  v('un autre fil (Max) : aucun appel', recus().length, 0);
  const env = await S.P('/api/monitor/conversations/envoyer', { fil: 'hugo', texte: 'Hugo, que sais-tu du dossier DOS-000001 ? Écris-moi à justin@exemple-2708.fr' });
  v('l\'envoi répond tout de suite', env.s, 200);
  vrai('Hugo répond dans son fil', await att(() => recus().length === 1));
  let fil; await att(async () => false, 10); await dormir(400); fil = (await S.G('/api/monitor/conversations/hugo')).j.messages;
  const rep = fil.filter(m => m.de === 'hugo');
  v('une réponse de Hugo, signée Hugo', [rep.length, rep[0] && rep[0].nom], [1, 'Hugo']);
  vrai('…et l\'adresse qu\'un Claude aurait citée est masquée dans le fil', rep[0] && !/delta@exemple-2708\.fr/.test(rep[0].texte));
  const corps = JSON.parse(recus()[0]);
  vrai('Claude a reçu le texte de Justin, SANS son adresse e-mail', /dossier DOS-000001 \? Écris-moi à/.test(corps.messages[0].content) && !/justin@exemple-2708\.fr/.test(corps.messages[0].content));
  vrai('…et rien de ce que le client a écrit dans ses champs libres (formule, demande)', !/INJECTION|IGNORE-TES-REGLES/.test(recus()[0]));
  vrai('…et des FAITS sur le dossier cité', /DOS-000001/.test(corps.system) && /"paiement"/.test(corps.system) && /"espace":\{"existe":false\}/.test(corps.system));
  const tout = recus()[0];
  vrai('…mais ni le nom, ni l\'adresse, ni le téléphone, ni la note du client', !/Delta|Propreté|Martin|Léa|exemple-2708|06 12 34|NOTE-SECRETE/.test(tout));
  vrai('aucune clé d\'API n\'est dans ce que Claude reçoit', !/sk-ant|sk_de_banc/.test(tout));
  await S.P('/api/monitor/conversations/envoyer', { fil: 'hugo', texte: 'Et sans numéro ?' }); await att(() => recus().length === 2);
  vrai('sans numéro cité : aucun fait client dans le prompt', /aucun fait client/.test(JSON.parse(recus()[1]).system));
  await S.P('/api/monitor/conversations/envoyer', { fil: 'hugo', texte: 'DOS-999999 ?' }); await att(() => recus().length === 3);
  vrai('un numéro inconnu : Hugo le voit « inconnu », pas de coordonnées inventées', /"existe":false/.test(JSON.parse(recus()[2]).system) || /impossible/.test(JSON.parse(recus()[2]).system));
  const bud = JSON.parse(fs.readFileSync(path.join(banc, 'avec-cle', 'data', 'agents-budget.json'), 'utf8'));
  vrai('le budget de Hugo est gravé', bud.parAgent.hugo > 0 && bud.parAgent.hugo < 1);
  await S.arreter();

  S = await serveur('sans-cle', ''); fs.rmSync(TRACE, { force: true });
  vrai('sans clé, le serveur le dit', /pas de clé \(agents\.cleApi\)/.test(S.journal()));
  await S.P('/api/monitor/agents/mode', { agent: 'hugo', mode: 'brouillon' });
  await S.P('/api/monitor/conversations/envoyer', { fil: 'hugo', texte: 'Tu es là ?' }); await dormir(700);
  fil = (await S.G('/api/monitor/conversations/hugo')).j.messages;
  v('sans clé : aucun appel', recus().length, 0);
  vrai('…Hugo dit pourquoi, en « important »', fil.some(m => m.de === 'hugo' && m.niveau === 'important' && /clé n’est pas posée/.test(m.texte)));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + (e && e.stack || e)); process.exit(1); });
