/* ══ SONDE — LE CHANTIER JURIDIQUE RÉUNI, SUR LE VRAI SERVEUR, DANS L'ÉTAT OÙ LE VPS LE TROUVERA (23 octobre 2026) ══
   Un dossier de données « d'avant » (comme celui du VPS) : une boîte mail avec son mot de passe EN CLAIR, un registre de contrats DÉJÀ PEUPLÉ (versions validées, sans marque de révision).
   Le vrai `server/index.js`, avec une clé maître (TEAMOP_KEK), un faux Anthropic (ANTHROPIC_BASE_URL) qui note ce qu'il reçoit. Rien ne sort : 127.0.0.1.
     A. mailboxes.json est réécrit CHIFFRÉ au démarrage (aucun octet du mot de passe), `pass` a disparu, aucune route ni le journal ne rend le mot de passe ni son chiffré ;
        redémarré sans clé : les octets ne bougent pas, la boîte est listée ;
     B. un incident public (adresse et numéro fictifs) : « Expliquer la cause » n'envoie ni l'un ni l'autre au faux Anthropic (contre-épreuve : le reste arrive) ;
     C. les brouillons « Révision du 23 octobre » sont déposés UNE fois sur le registre peuplé, la version en vigueur ne bouge pas, une pièce à crochet REFUSE la validation (409),
        une pièce sans crochet se valide ; un second démarrage ne redépose rien.
   Usage : node scratchpad/sonde-juridique.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), http = require('http'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const c = (t, v, d) => { if (v) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'jur-')), D = path.join(banc, 'data'); fs.mkdirSync(D);
const KEK = crypto.randomBytes(32).toString('hex');
const MDP_BOITE = 'Zq7-Wk.jur/boite-fictive', MDP_TOUR = 'mot-de-passe-tour-jur';
const ADR = 'zqxwvu.client@entreprise-zqxw.test', TEL = '06 98 76 54 32';
const T = 'ent-jur-x', CLE = 'CLE-PRIVEE-JUR';
const lire = f => fs.readFileSync(path.join(D, f));
const lireJ = f => JSON.parse(lire(f).toString('utf8'));
let enfant = null, journal = '';
const recus = [];

(async () => {
  const faux = http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { recus.push(b);
    r.writeHead(200, { 'Content-Type': 'application/json' });
    r.end(JSON.stringify({ id: 'msg_x', type: 'message', role: 'assistant', model: 'x', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify({ cause: 'Valeur mal lue (MARQUEUR-CAUSE).', ou: 'opcourrier.js', verifier: 'Rejouer', confiance: 'moyenne' }) }], usage: { input_tokens: 1, output_tokens: 1 } })); }); });
  await new Promise(r => faux.listen(0, '127.0.0.1', r));
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')), vap = webpush.generateVAPIDKeys();
  const CONFIG = path.join(banc, 'config.json');
  fs.writeFileSync(CONFIG, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP_TOUR), anthropic: { cleApi: 'sk-ant-banc' }, agents: { reunionsAuto: false } }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ issues: [], journal: [], archive: [], users: [{ id: 'upatron', nom: 'Patron', hash: sha(MDP_TOUR), role: 'patron', actif: true, ts: Date.now() }] }));
  // ── les fichiers D'AVANT ──
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ 'entreprise-j': { slug: 'entreprise-j', nom: 'J', email: 'j@exemple-jur.fr', t: T, code: Buffer.from(JSON.stringify({ t: T, k: CLE })).toString('base64'), ts: 1 } }));
  fs.writeFileSync(path.join(D, 'mailboxes.json'), JSON.stringify({ mb1: { id: 'mb1', email: 'gestion@banc-jur.fr', pass: MDP_BOITE, imapHost: '127.0.0.1', imapPort: 993, smtpHost: '127.0.0.1', smtpPort: 1, ts: Date.now(), teamId: T, name: 'Gestion', histoDone: true } }));
  const ancien = (n, statut, texte) => Object.assign({ n, ts: 1, auteur: 'Justin', texte, statut, note: 'texte en vigueur' }, statut === 'valide' ? { validePar: 'Justin', valideLe: 2, empreinte: sha(texte) } : {});
  fs.writeFileSync(path.join(D, 'contrats-documents.json'), JSON.stringify({
    conditions_generales: [ancien(1, 'valide', 'ANCIENNES CONDITIONS GÉNÉRALES (validées).')],
    dpa: [ancien(1, 'valide', 'ANCIEN DPA (validé).')],
    cp_op_gestion_pro: [ancien(1, 'valide', 'ANCIENNES CONDITIONS PARTICULIÈRES PRO (validées).')] }));
  c('(population) le fichier de boîtes d\'avant porte bien le mot de passe en clair', lire('mailboxes.json').includes(Buffer.from(MDP_BOITE)));

  const port = await libre(), B = 'http://127.0.0.1:' + port;
  const demarrer = async avecCle => {
    journal = '';
    const env = Object.assign({}, process.env, { TEAMOP_CONFIG: CONFIG, TEAMOP_DATA: D, PORT: String(port), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), ANTHROPIC_BASE_URL: 'http://127.0.0.1:' + faux.address().port });
    delete env.TEAMOP_KEK; delete env.CREDENTIALS_DIRECTORY; if (avecCle) env.TEAMOP_KEK = KEK;
    enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => journal += d); enfant.stderr.on('data', d => journal += d);
    for (let i = 0; i < 150; i++) { try { if ((await fetch(B + '/health')).ok) { await dormir(500); return true; } } catch (e) {} await dormir(100); }
    return false;
  };
  const arreter = async () => { const e = enfant; enfant = null; if (!e) return; await new Promise(r => { e.once('exit', r); e.kill('SIGKILL'); }); };
  const get = async (route, h) => { const r = await fetch(B + route, { headers: h || {} }); const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch (e) {} return { s: r.status, t, j: j || {} }; };
  const login = async () => (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'Patron', pass: MDP_TOUR }) })).json()).token;

  console.log('A. Les boîtes mail chiffrées');
  c('le vrai serveur démarre avec une clé maître', await demarrer(true));
  const f1 = lire('mailboxes.json'), j1 = lireJ('mailboxes.json').mb1;
  c('mailboxes.json : aucun octet du mot de passe, plus de champ `pass`, un `passScelle` à la place', !f1.includes(Buffer.from(MDP_BOITE)) && !('pass' in j1) && typeof j1.passScelle === 'string' && j1.passScelle.length > 20, Object.keys(j1));
  const H = { 'x-teamop-kh': sha(CLE) };
  const lb = await get('/api/mailboxes?teamId=' + T, H);
  c('/api/mailboxes liste la boîte (population non vide) et ne rend ni mot de passe ni chiffré', lb.s === 200 && (lb.j.mailboxes || []).length === 1 && !lb.t.includes(MDP_BOITE) && !lb.t.includes(j1.passScelle) && !/pass/i.test(lb.t), { s: lb.s, t: lb.t.slice(0, 200) });
  const hl = await get('/health');
  c('/health ne rend rien de secret', hl.s === 200 && !hl.t.includes(MDP_BOITE) && !hl.t.includes(j1.passScelle) && !hl.t.includes(KEK));
  c('le journal du serveur ne porte ni le mot de passe, ni la clé maître', !journal.includes(MDP_BOITE) && !journal.includes(KEK));
  const TOK = await login(); c('(population) une session de la Tour', !!TOK);
  const aut = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOK };

  console.log('\nB. Incident : « Expliquer la cause »');
  const MESSAGE = 'Adresse invalide : ' + ADR + ', tel ' + TEL + ' MARQUEUR-MSG';
  const rr = await fetch(B + '/api/monitor/report', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ reports: [{ type: 'erreur', app: 'elan', entreprise: 'Entreprise fictive', signature: 'sig-jur', message: MESSAGE, stack: 'Error: saisie\n at lire (https://127.0.0.1/app.html?mail=lea.zqxw%40exemple-banc.test&t=1:12:5)', src: 'opcourrier.js', line: 10 }] }) });
  c('le rapport public est accepté', rr.status === 200, rr.status);
  const iss = (await (await fetch(B + '/api/monitor/issues', { headers: aut })).json()).issues || [];
  const inc = iss.find(i => String(i.signature).endsWith('|sig-jur'));
  c('(population) la Tour garde l\'original (adresse et numéro en clair)', !!inc && inc.message.includes(ADR) && inc.message.includes(TEL), inc && inc.message);
  const n0 = recus.length;
  const ex = await fetch(B + '/api/monitor/expliquer', { method: 'POST', headers: aut, body: JSON.stringify({ id: inc && inc.id }) });
  c('Expliquer : 200 et le faux Anthropic a été appelé', ex.status === 200 && recus.length === n0 + 1, { s: ex.status, appels: recus.length - n0 });
  const brut = recus[recus.length - 1] || '';
  c('⛔ ni l\'adresse, ni le numéro, ni l\'arobase encodée ne sont partis chez Anthropic', !brut.includes('zqxwvu') && !brut.includes('entreprise-zqxw') && !brut.includes('98 76 54') && !brut.includes('lea.zqxw'), brut.slice(0, 200));
  c('…et le reste du texte est parti (contre-épreuve : MARQUEUR-MSG, « Adresse invalide »)', brut.includes('MARQUEUR-MSG') && brut.includes('Adresse invalide'));

  console.log('\nC. Contrats : les brouillons de la révision du 23 octobre');
  const reg = await get('/api/monitor/contrats', aut);
  const typ = n => (reg.j.types || []).find(t => t.type === n) || {};
  c('(population) le registre est lisible et porte les types', reg.s === 200 && (reg.j.types || []).length >= 10, reg.s);
  for (const t of ['conditions_generales', 'dpa', 'cp_op_gestion_pro']) {
    const vs = typ(t).versions || [], br = vs.filter(x => x.statut === 'brouillon');
    c(t + ' : la version 1 reste EN VIGUEUR (validée par Justin), un seul brouillon neuf dessus', (typ(t).enVigueur || {}).n === 1 && br.length === 1 && /^Révision du 23 octobre 2026/.test(br[0].note), { enVigueur: typ(t).enVigueur, versions: vs.map(x => x.n + ':' + x.statut) });
  }
  const valider = async (type, n) => { const r = await fetch(B + '/api/monitor/contrats/valider', { method: 'POST', headers: aut, body: JSON.stringify({ type, n }) }); let j = {}; try { j = await r.json(); } catch (e) {} return { s: r.status, j }; };
  const v1 = await valider('conditions_generales', 2);
  c('⛔ une pièce à crochet (conditions générales, brouillon 2) REFUSE la validation : 409 « À CONFIRMER »', v1.s === 409 && /CONFIRMER/.test(v1.j.error || ''), v1);
  const v2 = await valider('dpa', 2);
  c('⛔ le DPA (trois « À CONFIRMER PAR UN JURISTE ») refuse aussi', v2.s === 409, v2);
  c('…et rien n\'a bougé : la version en vigueur reste la 1', ((await get('/api/monitor/contrats', aut)).j.types.find(t => t.type === 'dpa').enVigueur || {}).n === 1);
  const v3 = await valider('cp_op_gestion_pro', 2);
  c('une pièce sans crochet (conditions particulières Pro) se valide : 200 et devient la version en vigueur', v3.s === 200 && (((await get('/api/monitor/contrats', aut)).j.types.find(t => t.type === 'cp_op_gestion_pro') || {}).enVigueur || {}).n === 2, v3);
  const avant = fs.readFileSync(path.join(D, 'contrats-documents.json'));

  console.log('\nRedémarrage SANS la clé maître');
  await arreter(); const octets = lire('mailboxes.json');
  c('le serveur redémarre sans clé', await demarrer(false));
  c('démarrer sans clé n\'a RIEN réécrit dans mailboxes.json (octets identiques)', octets.equals(lire('mailboxes.json')));
  const lb2 = await get('/api/mailboxes?teamId=' + T, H);
  c('la boîte est toujours listée, sans mot de passe', lb2.s === 200 && (lb2.j.mailboxes || []).length === 1 && !lb2.t.includes(MDP_BOITE), lb2.t.slice(0, 160));
  c('⛔ la révision ne se redépose PAS au second démarrage (le registre est identique)', avant.equals(fs.readFileSync(path.join(D, 'contrats-documents.json'))));
  await arreter();

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  if (ko) console.log(journal.slice(-1500));
  faux.close(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('✗ la sonde a levé : ' + (e && e.stack || e)); try { await enfant && enfant.kill('SIGKILL'); } catch (x) {} process.exit(1); });
