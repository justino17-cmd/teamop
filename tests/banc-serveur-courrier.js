/* ⛔ L'ÉTABLI DU VRAI SERVEUR POUR LÉA ET CAMILLE (test-2863 § 3, test-2864 § 2) — 23 octobre 2026.
 *
 * Le VRAI `server/index.js`, isolé sur 127.0.0.1, avec ce qu'il faut pour que la couture entière tourne SANS RIEN FAIRE SORTIR :
 *   · la fausse boîte IMAP (`tests/faux-imap.js`, glissée par `node -r`) : les messages « reçus » y sont posés par le banc, et la veille du Courrier
 *     (`server/mail.js`, toutes les 2 minutes, la première à 20 s) les annonce à Camille ;
 *   · un facteur SMTP de banc (127.0.0.1) : il GARDE chaque message que le serveur envoie — c'est là qu'on voit ce qui partirait vraiment ;
 *   · un faux Claude (le `fetch` vers api.anthropic.com est remplacé par un module chargé AVANT le serveur) qui GARDE chaque requête reçue ;
 *   · des données et une configuration jetables, deux comptes de la Tour (un patron, un collaborateur).
 * Ce qui est jugé ici, ce sont les COUTURES (`index.js` branche les crochets, `mail.js` lit sans marquer et envoie) que les bancs de module ne voient pas.
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
const FAUX = path.join(__dirname, 'faux-imap.js');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');

/* Le facteur : garde chaque message reçu (brut, point doublé retiré — RFC 5321 §4.5.2). */
function facteur() {
  const f = { recus: [] };
  f.s = net.createServer(c => {
    c.on('error', () => {});
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; f.recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('RCPT') && f.refuserA && h.includes(String(f.refuserA).toUpperCase())) c.write('550 5.1.1 ' + l.replace(/^RCPT TO:\s*/i, '') + ': Recipient address rejected: User unknown\r\n');   // f.refuserA : un destinataire refusé, adresse recopiée dans l'erreur comme le font les vrais serveurs
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
  });
  return f;
}

/* o : { modes, charte, boites:[{id,email}], imap:{ boites:{ adresse:{messages:[]}}}, claude: source JS d'une fonction (requete)=>texte, mdp, agentMdp,
         promos, avant(D) }. */
async function demarrer(o) {
  o = o || {};
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'bsrv-'));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);   // les heures de travail ne regardent pas ces bancs (`test-3011`)
  const MDP = 'mot-de-passe-du-banc-patron', MDP2 = 'mot-de-passe-du-banc-agent';
  const fact = facteur();
  const portSmtp = await new Promise(res => fact.s.listen(0, '127.0.0.1', () => res(fact.s.address().port)));
  const boites = o.boites || [{ id: 'b-contact', email: 'contact@banc-courrier.fr' }];
  const boiteJ = b => ({ id: b.id, email: b.email, pass: 'x', imapHost: '127.0.0.1', imapPort: 993, smtpHost: '127.0.0.1', smtpPort: portSmtp, nom: 'TEAM OP', ts: Date.now(), par: 'banc' });
  fs.writeFileSync(path.join(D, 'mail-boites.json'), JSON.stringify(boites.map(boiteJ)));
  fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify(o.clients || {}));
  fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
  if (o.modes) fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes: o.modes }));
  if (o.charte) fs.writeFileSync(path.join(D, 'agents-charte.json'), JSON.stringify(o.charte));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [
    { id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: Date.now() },
    { id: 'u-agent', nom: 'Agent', email: '', hash: sha(MDP2), role: 'collaborateur', actif: true, ts: Date.now() }] }));
  const IMAP = path.join(banc, 'faux-imap.json');
  const etat = { boites: {} };
  for (const b of boites) etat.boites[b.email] = { messages: [], actions: [] };
  if (o.imap) for (const [adr, part] of Object.entries(o.imap)) etat.boites[adr] = Object.assign({ messages: [], actions: [] }, part);
  fs.writeFileSync(IMAP, JSON.stringify(etat));
  if (o.avant) o.avant(D);

  /* Le faux Claude, chargé AVANT le serveur. Il garde chaque requête (une ligne JSON par appel) et répond selon `o.claude` (source d'une fonction
     `(requete, n) => texte`, évaluée dans le processus du serveur). */
  const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl'), TRACE_JUGE = path.join(banc, 'juge.jsonl'), TRACE_RECH = path.join(banc, 'recherche.jsonl'), TRACE_LOUIS = path.join(banc, 'louis.jsonl');
  const BA = require('./banc-agents-courrier.js');
  /* Le rédacteur par défaut écrit le courriel POUR l'entreprise nommée dans la demande (le contrôle qualité exige son nom dans l'accroche) ; le juge répond « VERDICT : OK »
     (ou `o.juge`, source JS d'une fonction `(requete, n) => texte`), la recherche web « IDENTIFIEE : non » (ou `o.recherche`, qui peut rendre { texte, recherches }). */
  const reponse = o.claude || "(r, n) => (" + BA.courrielPour.toString() + ")(r)";
  const COURRIEL_SRC = JSON.stringify(BA.COURRIEL);
  fs.writeFileSync(PRE, `const vrai = globalThis.fetch; let n = 0, nj = 0, nr = 0; const COURRIEL = ${COURRIEL_SRC}; const PROPOSITION = ${JSON.stringify(BA.PROPOSITION)}; const rep = (${reponse});
const repJuge = (${o.juge || "() => 'VERDICT : OK'"}), repRech = (${o.recherche || "() => 'IDENTIFIEE : non'"}), repLouis = (${o.louisClaude || "() => 'RIEN'"});
globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { const corps = String(opts && opts.body);
    const j = JSON.parse(corps); const sys = String(j.system);
    const trace = sys.startsWith(${JSON.stringify(BA.JUGE_DEBUT)}) ? ${JSON.stringify(TRACE_JUGE)} : sys.startsWith(${JSON.stringify(BA.RECHERCHE_DEBUT)}) ? ${JSON.stringify(TRACE_RECH)} : sys.startsWith(${JSON.stringify(BA.LOUIS_DEBUT)}) ? ${JSON.stringify(TRACE_LOUIS)} : ${JSON.stringify(TRACE)};
    require('fs').appendFileSync(trace, corps + '\\n');
    let texte, usage = { input_tokens: 900, output_tokens: 400 };
    if (trace === ${JSON.stringify(TRACE_JUGE)}) { nj++; texte = await repJuge(j, nj); }
    else if (trace === ${JSON.stringify(TRACE_RECH)}) { nr++; const x = await repRech(j, nr); if (x && typeof x === 'object') { texte = x.texte; usage.server_tool_use = { web_search_requests: x.recherches || 0 }; } else texte = x; }
    else if (trace === ${JSON.stringify(TRACE_LOUIS)}) { texte = await repLouis(j); }
    else { n++; texte = await rep(j, n); }
    return new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: 'end_turn', content: [{ type: 'text', text: texte }], usage }), { status: 200, headers: { 'content-type': 'application/json' } }); }
  return vrai.apply(this, arguments); };\n`);

  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const conf = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', agents: { cleApi: 'sk-ant-' + 'banc-courrier-xxxxxxxxxxxxxxxx', reunionsAuto: false },   // pas de réunion due pendant un banc (vendredi soir, lundi matin)
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' }, contactEmail: o.contactEmail || 'contact@banc-courrier.fr' };
  if (o.promos) conf.promos = o.promos;
  if (o.authservIds) conf.agents.authservIds = o.authservIds;   // les serveurs de réception dont l'Authentication-Results fait foi (AUCUN par défaut : mail.js)
  if (o.comptes) conf.comptes = { actif: true };
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(conf));
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const B = 'http://127.0.0.1:' + PORT;
  let journal = '', enfant = null;
  const lancer = async () => {
    journal = '';
    enfant = spawn(process.execPath, ['--require', PRE, '-r', FAUX, SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9',
        TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs', TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z',
        FAUX_IMAP: IMAP, FAUX_IMAP_RACINE: path.join(RACINE, 'server') }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    for (let i = 0; i < 120; i++) { try { if ((await fetch(B + '/health')).ok) return true; } catch (e) {} await dormir(100); }
    return false;
  };
  let nAdr = 0;
  const http = async (methode, route, jeton, corps) => {
    for (let essai = 0; essai < 60; essai++) {
      const r = await fetch(B + route, { method: methode, headers: Object.assign({ 'X-Forwarded-For': '10.102.' + ((++nAdr >> 8) & 255) + '.' + (nAdr & 255) }, corps !== undefined ? { 'Content-Type': 'application/json' } : {}, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
        body: corps === undefined ? undefined : JSON.stringify(corps) });
      const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (r.status === 429 && j && j.error === 'trop de requêtes') { await dormir(2500); continue; }
      return { s: r.status, j: j || {}, txt, h: r.headers };
    }
    return { s: 0, j: {}, txt: '', h: new Headers() };
  };
  const vivant = await lancer();
  const S = { vivant, B, D, banc, http, MDP, MDP2, fact, journal: () => journal, TP: '', TA: '' };
  if (vivant) {
    S.TP = (await http('POST', '/api/monitor/login', '', { nom: 'Patron', pass: MDP })).j.token;
    S.TA = (await http('POST', '/api/monitor/login', '', { nom: 'Agent', pass: MDP2 })).j.token;
  }
  S.get = (r, j) => http('GET', r, j === undefined ? S.TP : j);
  S.post = (r, c, j) => http('POST', r, j === undefined ? S.TP : j, c === undefined ? {} : c);
  S.public = (r, c) => http('POST', r, '', c);
  /* Un compte du portail dont l'adresse est PROUVÉE, comme un vrai client : création, lien de confirmation lu dans le courriel du facteur, connexion, puis la
     PREMIÈRE synchro (c'est elle qui déclenche Léa depuis la relecture du 23 octobre 2026 : la route publique `/api/nouveau-compte` ne la déclenche plus).
     Rend { jeton, sync } ; `demandes` est la liste envoyée à la synchro (vide = une simple inscription). Exige `comptes: true` au démarrage. */
  S.inscrire = async (adr, entreprise, demandes) => {
    const { simpleParser } = require(path.join(RACINE, 'server', 'node_modules', 'mailparser'));
    const H = sha('teamop-portail:mot-de-passe-du-banc-courrier');
    await S.public('/api/compte/creer', { email: adr, h: H, prenom: 'Prénom', nom: 'Nom', societe: entreprise });
    let jv = '';
    await S.attendre(async () => { for (const r of S.fact.recus) { const m = await simpleParser(r); if (!String((m.to && m.to.text) || '').includes(adr)) continue; const x = /mode=verifyEmail&jeton=([0-9a-f]{64})/.exec(String(m.text || '')); if (x) { jv = x[1]; return true; } } return false; }, 10000);
    if (!jv) return { jeton: '', sync: null };
    await S.public('/api/compte/verifier', { jeton: jv });
    const cx = await S.public('/api/compte/connexion', { email: adr, h: H });
    const jeton = cx.j.jeton || '';
    const sync = await S.http('POST', '/api/clients/sync', jeton, { entreprise, nom: 'Prénom Nom', prenom: 'Prénom', nomFam: 'Nom', demandes: demandes || [] });
    return { jeton, sync };
  };
  const lignes = f => fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  S.claudeRecus = () => lignes(TRACE);
  S.juges = () => lignes(TRACE_JUGE);
  S.recherches = () => lignes(TRACE_RECH);
  S.louisRecus = () => lignes(TRACE_LOUIS);
  S.imap = () => JSON.parse(fs.readFileSync(IMAP, 'utf8'));
  S.poserImap = (adr, f) => { const e = S.imap(); f(e.boites[adr]); fs.writeFileSync(IMAP + '.tmp', JSON.stringify(e)); fs.renameSync(IMAP + '.tmp', IMAP); };
  S.attendre = async (f, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 8000)) { if (await f()) return true; await dormir(150); } return false; };
  S.tuer = async () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} await dormir(300); };
  S.relancer = async () => { await S.tuer(); const ok = await lancer(); if (ok) { S.TP = (await http('POST', '/api/monitor/login', '', { nom: 'Patron', pass: MDP })).j.token; S.TA = (await http('POST', '/api/monitor/login', '', { nom: 'Agent', pass: MDP2 })).j.token; } return ok; };
  S.fin = async () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fact.s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
  return S;
}
module.exports = { demarrer, dormir, sha, facteur };
