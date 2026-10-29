/* ⛔ CE QUE CE FICHIER GARDE — LA MESSAGERIE DES AGENTS CONTRE LE VRAI SERVEUR (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §6 et §11).
     Le vrai `server/index.js`, isolé sur 127.0.0.1, parlé en HTTP ; un FAUX Claude répond à api.anthropic.com, GARDE chaque requête reçue et
     joue des outils (tool use) selon un mot-clé du dernier message. Les modules ont leur banc (`test-2880`) ; ici on garde CE QUE LE SERVEUR FAIT :
       · UNE QUESTION posée à Margaux est répondue par Margaux — aucune tâche, aucune délégation, aucune validation, rien chez Victor ;
       · un travail demandé à deux agents : chacun répond ET prend sa tâche (le faux Claude rend l'outil `prendre`) ;
       · `passer` vers un collègue OCCUPÉ, vers Hugo, ou par un agent SANS autre tâche : refusé — la tâche ne bouge pas ; vers un libre : accepté ;
       · un agent qui en cite un autre le réveille ; A↔B s'arrête (trois appels sans racine ; quatre sous la racine d'un message de Justin, où le ping-pong coupe) ;
       · une consigne libre d'un AGENT vers Hugo est refusée, celle de JUSTIN acceptée ;
       · « X écrit… » posé pendant la réflexion, retiré après — même quand Claude est en panne ;
       · lecture incrémentale, mentions rendues, routes gardées (patron seul), POST de la Tour déclarés dans `MON_GESTES` ;
       · ⛔ LA SANTÉ QUE LES AGENTS LISENT NE VIDE PAS LA FENÊTRE DE `/health` : la surveillance horaire de GitHub lit cette fenêtre une fois par
         heure ; une question à Max ne doit pas la lui voler (relevé via HTTP, `/health` la vidait à chaque lecture). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2881-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); fin(); process.exit(1); }, 170000).unref();
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(60); } return false; };
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

console.log('\n── 2881 · la messagerie des agents contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl');
  /* Le faux Claude. Il lit le nom de l'agent dans le prompt (« Tu es X, l'agent… »), les tâches de l'agent (« - [id] « texte » »), et joue selon un mot-clé du
     DERNIER message : TRAVAIL (texte + outil prendre), PASSER vers=<id> (outil passer sur sa première tâche), CITE (cite @hugo), PINGPONG (cite l'autre),
     ECRIRE (outil ecrire dans « clients »), LENT (1,2 s), PANNE (500). Il rend aussi un bloc de réflexion avant chaque réponse, comme un vrai modèle. */
  fs.writeFileSync(PRE, `const vrai = globalThis.fetch; globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { const corps = String(opts && opts.body); require('fs').appendFileSync(${JSON.stringify(TRACE)}, corps + '\\n');
    const j = JSON.parse(corps); const tousLesMots = String((j.messages[j.messages.length - 1] || {}).content || ''); const dernier = tousLesMots.split('\\n').reverse().find(l => /-2881/.test(l)) || '';   /* le message le plus RÉCENT qui porte un mot-clé : les tours consécutifs sont fusionnés par des retours à la ligne */
    const nom = (/^Tu es (\\S+),/.exec(j.system) || [])[1] || '?'; const id = nom.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
    const premiereTache = (/^- \\[([0-9a-f]{12})\\]/m.exec(j.system) || [])[1] || 'aucune';
    const bloc = (content, stop) => new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: stop || 'end_turn', content: [{ type: 'thinking', thinking: 'je réfléchis…', signature: 'sig' }].concat(content), usage: { input_tokens: 500, output_tokens: 80 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    const texte = t => ({ type: 'text', text: t });
    const outil = (name, input) => ({ type: 'tool_use', id: 'toolu_' + name, name, input });
    if (/PANNE-2881/.test(dernier)) return new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'panne simulée' } }), { status: 500, headers: { 'content-type': 'application/json' } });
    if (/LENT-2881/.test(dernier)) await new Promise(r => setTimeout(r, 1200));
    if (/MUET-2881/.test(dernier)) return bloc([outil('prendre', { texte: 'Tâche prise sans un mot' })], 'tool_use');
    if (/PASSER-2881/.test(dernier)) { const vers = (/vers=([a-z]+)/.exec(dernier) || [])[1] || 'lea'; return bloc([texte('Je passe ça à ' + vers + '.'), outil('passer', { vers, tache: premiereTache, raison: 'je suis sur autre chose' })], 'tool_use'); }
    if (/TRAVAIL-2881/.test(dernier)) return bloc([texte('Oui, je m’en occupe.'), outil('prendre', { texte: 'Travail demandé : ' + (/TRAVAIL-2881[^.?]*/.exec(dernier) || [''])[0].slice(0, 80) })], 'tool_use');
    if (/ECRIRE-2881/.test(dernier)) return bloc([texte('Je préviens le groupe.'), outil('ecrire', { fil: 'clients', texte: 'Message de ' + nom + ' pour le groupe.' })], 'tool_use');
    if (/PINGPONG-2881/.test(dernier) && id === 'victor') return bloc([texte('Je tranche : Camille garde le courrier, Léa le suivi.')]);   /* (28 octobre 2026) Victor, membre de « clients », arbitre UNE fois le ping-pong : sa réponse ne cite personne */
    if (/PINGPONG-2881/.test(dernier)) return bloc([texte((id === 'camille' ? '@lea' : '@camille') + ' PINGPONG-2881 : et toi, qu’en penses-tu (' + (globalThis.cptPP = (globalThis.cptPP || 0) + 1) + ') ?')]);   /* numéroté : le MÊME texte deux fois en 24 h est un doublon, refusé par le fil */
    if (/CITE-2881/.test(dernier) && id === 'camille') return bloc([texte('@hugo, la société X a-t-elle payé ? TRAVAIL-2881 vérifier le paiement')]);
    return bloc([texte('Réponse de ' + nom + '.')]); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-2881';
  async function serveur(nom, cle, socle) {
    const D = path.join(banc, nom, 'data'); fs.mkdirSync(D, { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);   // les heures de travail ne regardent pas ce banc (`test-3021`)
    fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
    const vap = webpush.generateVAPIDKeys(); const conf = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_2881' } };
    conf.agents = Object.assign(cle ? { cleApi: cle } : {}, { reunionsAuto: false });   // pas de réunion due pendant le banc (vendredi 18 h-23 h, lundi matin, heure de Paris)
    if (socle) conf.socle = { actif: true };
    fs.writeFileSync(path.join(banc, nom, 'config.json'), JSON.stringify(conf));
    const PORT = await libre(); let journal = '';
    const env = Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, nom, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' });
    if (socle) env.TEAMOP_KEK = crypto.randomBytes(32).toString('hex');
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    vrai('le serveur « ' + nom + ' » démarre', vivant); if (!vivant) { console.log(journal.slice(0, 800)); process.exit(1); }
    let nreq = 0;   /* le budget de requêtes par minute et par IP : une adresse relayée neuve toutes les 50 requêtes */
    const req = async (m, r, c, j) => { const x = await fetch(B + r, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.8.' + Math.floor(nreq++ / 50) + '.1' }, j ? { Authorization: 'Bearer ' + j } : {}), body: m === 'POST' ? JSON.stringify(c || {}) : undefined }); let o = {}; try { o = await x.json(); } catch (y) {} return { s: x.status, j: o }; };
    const jeton = (await req('POST', '/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
    return { B, D, req, journal: () => journal, G: r => req('GET', r, null, jeton), P: (r, c) => req('POST', r, c, jeton), jeton, lire: f => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (x) { return null; } },
      arreter: async () => { e.kill('SIGKILL'); await dormir(300); } };
  }
  const recus = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  const parNom = b => (/^Tu es (\S+),/.exec(b.system) || [])[1];

  const S = await serveur('avec-cle', 'sk-ant-' + 'api03-banc-2881-xxxxxxxxxxxxxxxx');
  const REG = (await S.G('/api/monitor/agents')).j.agents.map(a => a.id);
  v('(population) seize agents au registre', REG.length, 16);
  for (const id of REG) await S.P('/api/monitor/agents/mode', { agent: id, mode: 'brouillon' });
  const fil = async f => (await S.G('/api/monitor/conversations/' + f)).j;
  const msgs = async f => (await fil(f)).messages;
  const tout = async () => (await S.G('/api/monitor/agents/taches')).j.taches;
  const consignes = async () => (await tout()).filter(k => k.type === 'consigne');
  const dit = async (f, texte, attendu) => { const n0 = recus().length; const r = await S.P('/api/monitor/conversations/envoyer', { fil: f, texte }); if (attendu !== undefined) await att(() => recus().length >= n0 + attendu); await dormir(350); return r; };

  console.log('\n1. ⛔ Une QUESTION posée à Margaux : c’est Margaux qui répond — aucune délégation');
  {
    const n0 = recus().length;
    const r = await dit('margaux', 'Margaux, sur la compta, tu en es où ? QUESTION-2881', 1);
    const mm = await msgs('margaux'), ap = recus().slice(n0);
    v('⛔ UN seul appel à Claude, celui de Margaux', ap.map(parNom), ['Margaux']);
    v('…Margaux répond dans son fil, signée', mm.filter(m => m.de === 'margaux').map(m => [m.nom, m.texte]), [['Margaux', 'Réponse de Margaux.']]);
    v('⛔ aucune tâche, aucune demande de validation, rien chez Victor', [(await tout()).length, (await S.G('/api/monitor/agents/validations')).j.validations.length, (await msgs('victor')).length], [0, 0, 0]);
    v('la route d’envoi rend le message et les mentions (aucune ici)', [r.j.message.mentions, r.j.mentions], [[], []]);
    vrai('la requête : réflexion adaptative, 3000 jetons, outils fermés, jamais temperature / top_p / top_k', ap[0].thinking.type === 'adaptive' && ap[0].max_tokens === 3000 && ap[0].tools.length === 7 /* les six outils communs (dont `demander`, 28 octobre 2026) + l'outil propre de Margaux (23 octobre 2026 : `preparer_mise_en_demeure`, de Justin seul — `test-2912`) */ && ap[0].tool_choice.type === 'auto' && !('temperature' in ap[0]) && !('top_p' in ap[0]) && !('top_k' in ap[0]));
    vrai('…le bloc de réflexion du modèle n’est jamais recopié dans le fil', !(await msgs('margaux')).some(m => /réfléchis/.test(m.texte)));
  }

  console.log('\n2. Un travail demandé à deux agents : chacun répond ET prend sa tâche');
  {
    const n0 = recus().length;
    const r = await dit('clients', '@Camille @Léa, vous faites ça aujourd’hui ? TRAVAIL-2881 relire le courrier', 2);
    const mm = await msgs('clients');
    v('les mentions sont lues par le SERVEUR et rendues', [r.j.mentions, r.j.message.mentions], [['camille', 'lea'], ['camille', 'lea']]);
    v('⛔ les deux citées sont réveillées (pas Léa seule comme meneur), chacune une fois', recus().slice(n0).map(parNom).sort(), ['Camille', 'Léa']);
    v('…chacune répond dans le groupe', mm.filter(m => REG.includes(m.de)).map(m => m.de).sort(), ['camille', 'lea']);
    const c = await consignes();
    v('⛔ chacune a SA tâche « consigne », demandée par Justin', c.map(k => [k.vers, k.de, k.statut]).sort(), [['camille', 'justin', 'prise'], ['lea', 'justin', 'prise']]);
    vrai('…le système le dit (« Camille a pris… »)', mm.filter(m => m.de === 'systeme' && /a pris « Travail demandé/.test(m.texte)).length === 2);
    const l = (await S.G('/api/monitor/conversations?tous=1')).j;
    v('la liste ?tous=1 : « Équipe », les trois groupes puis les seize fils privés, avec leurs membres', [l.fils.length, l.fils.slice(0, 4).map(f => f.fil), l.fils.find(f => f.fil === 'clients').membres.length], [20, ['equipe', 'clients', 'plateforme', 'reunions'], 7]);   /* sept depuis le 28 octobre 2026 : Victor y répartit */
  }

  console.log('\n3. Passer un travail : chargé, vers un collègue LIBRE, jamais Hugo ni Margaux');
  {
    /* Camille a déjà une tâche ; une seconde la rend chargée. Léa en a une (occupée). Théo est libre. */
    await dit('camille', 'Camille, et ça aussi : TRAVAIL-2881 relancer les devis', 1);
    await dormir(200);
    v('(population) Camille 2 tâches, Léa 1', [(await consignes()).filter(k => k.vers === 'camille').length, (await consignes()).filter(k => k.vers === 'lea').length], [2, 1]);
    const avant = JSON.stringify(await consignes());
    await dit('camille', 'PASSER-2881 vers=lea', 1);
    v('⛔ vers un collègue OCCUPÉ (Léa) : refusé, rien ne bouge', JSON.stringify(await consignes()), avant);
    vrai('…et le fil dit pourquoi', (await msgs('camille')).some(m => m.de === 'systeme' && /Camille voulait passer .* à Léa : refusé, ce collègue a déjà du travail en cours/.test(m.texte)));
    await dit('camille', 'PASSER-2881 vers=hugo', 1);
    vrai('⛔ vers HUGO : refusé', JSON.stringify(await consignes()) === avant && (await msgs('camille')).some(m => m.de === 'systeme' && /à Hugo : refusé, Hugo et Margaux ne reçoivent pas/.test(m.texte)));
    await dit('camille', 'PASSER-2881 vers=margaux', 1);
    vrai('…et vers MARGAUX', JSON.stringify(await consignes()) === avant);
    await dit('lea', 'PASSER-2881 vers=emma', 1);
    vrai('⛔ par un agent SANS autre tâche (Léa n’en a qu’une) : refusé', JSON.stringify(await consignes()) === avant && (await msgs('lea')).some(m => m.de === 'systeme' && /Léa voulait passer .* à Emma : refusé, il n’a pas d’autre tâche en cours/.test(m.texte)));
    await dit('camille', 'PASSER-2881 vers=theo', 1);
    const apres = await consignes();
    v('⛔ chargée → vers Théo (libre) : accepté, la tâche reste demandée par Justin', [apres.filter(k => k.vers === 'theo').map(k => k.de), apres.filter(k => k.vers === 'camille').length], [['justin'], 1]);
    vrai('…le fil dit « Camille a passé « … » à Théo : je suis sur autre chose. »', (await msgs('camille')).some(m => m.de === 'systeme' && /Camille a passé « .* » à Théo : je suis sur autre chose\./.test(m.texte)));
    const jr = (await S.G('/api/monitor/agents/journal?limite=500')).j.journal;
    vrai('…les refus et le passage sont au journal des agents', jr.filter(e => /passer/.test(e.action) && e.resultat === 'refuse').length >= 4 && jr.some(e => /passer/.test(e.action) && e.resultat === 'ok'));
  }

  console.log('\n4. Un agent qui en cite un autre le réveille — et la consigne libre vers Hugo');
  {
    const n0 = recus().length;
    await dit('clients', '@Camille demande à Hugo si X a payé CITE-2881', 2);
    await dormir(400);
    const ap = recus().slice(n0), mm = (await msgs('clients')).filter(m => REG.includes(m.de));
    v('⛔ Camille cite Hugo : Hugo est réveillé, dans cet ordre, et répond dans le groupe', [ap.map(parNom), mm.slice(-2).map(m => [m.de, m.prof])], [['Camille', 'Hugo'], [['camille', 1], ['hugo', 2]]]);
    vrai('…Hugo a lu le message de Camille nommé (« [Camille a écrit dans le fil Clients] »)', /\[Camille a écrit dans le fil Clients\] @hugo, la société X/.test(ap[1].messages[ap[1].messages.length - 1].content));
    v('⛔ Hugo, réveillé par un AGENT, tente `prendre` (le faux Claude le fait) : refusé, aucune tâche chez lui', (await consignes()).filter(k => k.vers === 'hugo').length, 0);
    vrai('…et le fil dit pourquoi', (await msgs('clients')).some(m => m.de === 'systeme' && /Hugo ne peut pas prendre .* : seul Justin donne une consigne libre à Hugo/.test(m.texte)));
    await dit('hugo', 'Hugo, vérifie si la société X a payé. TRAVAIL-2881 vérifier le paiement', 1);
    const h = (await consignes()).filter(k => k.vers === 'hugo');
    v('⛔ la même demande de JUSTIN, dans le fil de Hugo : acceptée', [h.length, h[0] && h[0].de], [1, 'justin']);
    vrai('(population) les appels de cette partie ont bien eu lieu', ap.length === 2);
  }

  console.log('\n5. L’anti-boucle : A↔B s’arrête (le ping-pong sous racine)');
  {
    const n0 = recus().length;
    await dit('plateforme', 'Ceci est une discussion test PINGPONG-2881', 1);
    /* plateforme : meneur = Max ; Max ne cite personne → un seul appel. Pour A↔B on passe par « clients » (Camille ↔ Léa) */
    const seul = recus().length - n0;
    const n1 = recus().length;
    await dit('clients', '@Camille discute avec Léa PINGPONG-2881', 1);
    await dormir(1200);
    const ap = recus().slice(n1), mm = (await msgs('clients')).filter(m => REG.includes(m.de) && /PINGPONG-2881/.test(m.texte));
    v('un message de Justin sans mention dans « plateforme » : le meneur (VICTOR depuis le 28 octobre 2026, Léa et Max répondent quand on les cite) seul, un appel', [seul, parNom(recus()[n0])], [1, 'Victor']);
    /* Justin, 28 octobre 2026 : l'échange né de son message a une RACINE — quatre messages, puis le ping-pong (ABAB sans acte) coupe ; la borne 3 ne vaut plus que sans racine (test-2880) */
    v('⛔ Camille → Léa → Camille → Léa puis STOP (le ping-pong) : quatre appels, quatre messages (profondeurs 1, 2, 3, 4) — puis VICTOR, une fois, pour arbitrer', [ap.map(parNom), mm.map(m => m.prof)], [['Camille', 'Léa', 'Camille', 'Léa', 'Victor'], [1, 2, 3, 4]]);
    await dormir(600);
    v('…et rien de plus après une pause (le dernier message cite Camille, qui ne répond pas ; Victor ne cite personne)', recus().length - n1, 5);
  }

  console.log('\n6. ecrire : seulement un fil dont l’agent est membre');
  {
    await dit('max', 'Max, préviens les clients. ECRIRE-2881', 1);
    v('⛔ Max (plateforme) n’est PAS membre de « clients » : son message n’y paraît pas, le refus est au journal', [(await msgs('clients')).filter(m => m.de === 'max').length, (await S.G('/api/monitor/agents/journal?limite=500')).j.journal.some(e => e.agent === 'max' && /ecrire/.test(e.action) && e.resultat === 'refuse')], [0, true]);
    await dit('emma', 'Emma, préviens les clients. ECRIRE-2881', 1);
    v('Emma (clients) y écrit', (await msgs('clients')).filter(m => m.de === 'emma' && /Message de Emma pour le groupe/.test(m.texte)).length, 1);
  }

  console.log('\n6 bis. Une réponse faite d’un seul appel d’outil, sans texte, est une réponse');
  {
    await dit('louis', 'Louis, prends ça. MUET-2881', 1);
    const m = await msgs('louis');
    v('⛔ la tâche est prise, le système le dit, et Louis ne dit pas « je ne peux pas te répondre » (ce n’est pas une réponse vide)', [(await consignes()).filter(k => k.vers === 'louis').map(k => k.params.texte), m.filter(m => m.de === 'systeme').length, m.filter(m => m.de === 'louis').length], [['Tâche prise sans un mot'], 1, 0]);
  }

  console.log('\n7. « X écrit… » : posé pendant la réflexion, retiré après — même en panne');
  {
    const p = S.P('/api/monitor/conversations/envoyer', { fil: 'jules', texte: 'Jules, une question ? LENT-2881' });
    await att(async () => ((await S.G('/api/monitor/conversations/jules')).j.ecrit || []).length > 0, 3000);
    const f = (await S.G('/api/monitor/conversations/jules')).j, l = (await S.G('/api/monitor/conversations?tous=1')).j.fils.find(x => x.fil === 'jules');
    v('⛔ pendant la réflexion : le fil ET la liste disent « Jules écrit… »', [f.ecrit.map(x => x.nom), l.ecrit.map(x => x.nom)], [['Jules'], ['Jules']]);
    await p; await att(async () => ((await S.G('/api/monitor/conversations/jules')).j.ecrit || []).length === 0, 4000);
    v('…retiré une fois la réponse écrite', [(await S.G('/api/monitor/conversations/jules')).j.ecrit, (await msgs('jules')).filter(m => m.de === 'jules').length], [[], 1]);
    await dit('nina', 'Nina ? PANNE-2881', 1);
    v('⛔ Claude en panne (500) : « écrit… » retiré, et Nina le DIT en « important »', [(await S.G('/api/monitor/conversations/nina')).j.ecrit, (await msgs('nina')).filter(m => m.de === 'nina').map(m => m.niveau)], [[], ['important']]);
  }

  console.log('\n8. Lecture incrémentale, routes gardées, POST déclarés dans MON_GESTES');
  {
    const f = await fil('clients'), dernier = f.messages[f.messages.length - 1];
    v('le fil complet se dit complet', f.complet, true);
    const antepenultieme = f.messages[f.messages.length - 3];
    const inc = (await S.G('/api/monitor/conversations/clients?apres=' + antepenultieme.id)).j;
    v('⛔ ?apres=<id> : seulement les deux derniers messages', [inc.complet, inc.messages.map(m => m.id)], [false, f.messages.slice(-2).map(m => m.id)]);
    v('…après le dernier : rien', (await S.G('/api/monitor/conversations/clients?apres=' + dernier.id)).j.messages, []);
    const R = await fetch(S.B + '/api/monitor/conversations?tous=1'), R2 = await fetch(S.B + '/api/monitor/conversations/clients'), R3 = await fetch(S.B + '/api/monitor/conversations/envoyer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    v('⛔ sans jeton : liste, fil, envoi refusés (403 — réservé au patron)', [R.status, R2.status, R3.status], [403, 403, 403]);
    /* le patron lit AVANT la création du compte : la session par mot de passe d'administration ne survit pas à un compte créé (banc seulement) */
    const tP = await S.G('/api/monitor/agents/taches'), jP = (await S.G('/api/monitor/agents/journal?limite=500')).j.journal;
    const K = await S.P('/api/monitor/users', { nom: 'Collab', pass: 'un-mot-de-passe-2881' });
    const lj = await (await fetch(S.B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.9.0.1' }, body: JSON.stringify({ nom: 'Collab', pass: 'un-mot-de-passe-2881' }) })).json();
    const colla = async (m, r, c) => (await fetch(S.B + r, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + lj.token }, body: m === 'POST' ? JSON.stringify(c || {}) : undefined })).status;
    v('⛔ un collaborateur (non patron) ne lit ni n’écrit : 403 partout', [K.s, await colla('GET', '/api/monitor/conversations?tous=1'), await colla('GET', '/api/monitor/conversations/clients'), await colla('POST', '/api/monitor/conversations/envoyer', { fil: 'clients', texte: 'je ne devrais pas' }), await colla('POST', '/api/monitor/conversations/lire', { fil: 'clients' })], [200, 403, 403, 403, 403]);
    /* ⛔ LE TEXTE LIBRE DES CONSIGNES N'EST PAS POUR TOUT COMPTE ACTIF (relecture C1-C3) : `monAdmin` laisse lire la liste des tâches et le journal à un collaborateur ;
       la phrase que Justin a tapée (« rappeler M. Durand… ») y est — il ne la lit pas, il lit l'événement. */
    const collaJ = async r => { const x = await fetch(S.B + r, { headers: { Authorization: 'Bearer ' + lj.token } }); let o = {}; try { o = await x.json(); } catch (y) {} return { s: x.status, j: o, brut: JSON.stringify(o) }; };
    const tC = await collaJ('/api/monitor/agents/taches');
    const cP = tP.j.taches.filter(k => k.type === 'consigne');
    vrai('(population) le patron lit au moins deux consignes, toutes avec leur texte — sinon « le collaborateur ne voit rien » passerait sur du vide', cP.length >= 2 && cP.every(k => k.params.texte.length > 5) && cP.filter(k => /TRAVAIL-2881/.test(k.params.texte)).length >= 2);
    v('⛔ un collaborateur lit la liste des tâches (200) mais SANS le texte des consignes : ni le mot-clé, ni la phrase', [tC.s, tC.j.taches.filter(k => k.type === 'consigne').length, tC.j.taches.filter(k => k.type === 'consigne').every(k => k.params.texte === ''), /TRAVAIL-2881|Tâche prise/.test(tC.brut)], [200, cP.length, true, false]);
    v('…les tâches elles-mêmes restent lisibles : mêmes identifiants, mêmes agents, mêmes statuts', tC.j.taches.map(k => [k.id, k.de, k.vers, k.statut]), tP.j.taches.map(k => [k.id, k.de, k.vers, k.statut]));
    const jC = await collaJ('/api/monitor/agents/journal?limite=500');
    const prises = jP.filter(e => e.action === 'prendre une consigne' && e.resultat === 'ok');
    vrai('(population) le patron lit des consignes prises AVEC leur détail, et des lignes d’un autre genre (« mode ») avec le leur', prises.length >= 2 && prises.every(e => e.detail && e.detail.length > 5) && prises.filter(e => /TRAVAIL-2881/.test(e.detail)).length >= 2 && jP.some(e => e.action === 'mode' && e.detail));
    v('⛔ un collaborateur lit le journal (200) SANS la phrase des consignes — la ligne reste, son détail est réservé', [jC.s, /TRAVAIL-2881|Tâche prise/.test(jC.brut), jC.j.journal.filter(e => e.action === 'prendre une consigne' && e.resultat === 'ok').every(e => e.detail === undefined && e.detailReserve === true), jC.j.journal.length], [200, false, true, jP.length]);
    v('…les lignes sans texte libre sont intactes (« mode » garde son détail)', jC.j.journal.filter(e => e.action === 'mode').map(e => e.detail), jP.filter(e => e.action === 'mode').map(e => e.detail));
    const SRC = fs.readFileSync(SERVEUR, 'utf8');
    const i = SRC.indexOf('const MON_GESTES = {'), j = SRC.indexOf('\n};', i);
    const GESTES = SRC.slice(i, j);
    const CONV = fs.readFileSync(path.join(RACINE, 'server', 'conversations.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const EQUIPE = fs.readFileSync(path.join(RACINE, 'server', 'agent-equipe.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const posts = [...CONV.matchAll(/app\.post\('\/api\/monitor\/([^']+)', (\w+)/g)];
    vrai('(population) la messagerie déclare ses routes POST : envoyer, lire, la personnalisation des groupes (25 octobre 2026, test-3016) et la suppression d’un message (28 octobre 2026, test-3088)', posts.length === 4 && posts.map(m => m[1]).sort().join() === 'conversations/envoyer,conversations/groupe,conversations/lire,conversations/supprimer');
    vrai('⛔ chaque route POST de la messagerie est dans MON_GESTES et exige le patron strict', posts.every(m => new RegExp("'" + m[1].replace(/\//g, '\\/') + "':").test(GESTES) && m[2] === 'monPatronStrict'));
    vrai('…et les lectures exigent aussi le patron (le fil privé d’un agent porte des rappels de clients)', [...CONV.matchAll(/app\.get\('\/api\/monitor\/conversations[^']*', (\w+)/g)].every(m => m[1] === 'monPatronStrict'));
    vrai('…la messagerie n’ajoute AUCUNE route à `agent-equipe.js` (rien à déclarer, rien à oublier)', !/app\.(get|post)\(/.test(EQUIPE));
  }

  console.log('\n9. ⛔ La santé que les agents lisent ne vide pas la fenêtre de /health');
  {
    await S.arreter();
    const T = await serveur('socle', 'sk-ant-' + 'api03-banc-2881-yyyyyyyyyyyyyyyy', true);
    const sante0 = (await (await fetch(T.B + '/health')).json()).socle;
    vrai('(population) le socle est allumé sur ce serveur, sinon la fenêtre n’existe pas', sante0 && sante0.actif === true);
    for (let i = 0; i < 6; i++) await fetch(T.B + '/api/op/session', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.7.7.' + i }, body: '{}' });
    await dormir(250);
    await T.P('/api/monitor/agents/mode', { agent: 'max', mode: 'brouillon' });
    const n0 = recus().length;
    for (const t of ['Max, où en est le serveur ? (1)', 'Max, et la sauvegarde ? (2)', 'Max, une dernière fois (3)']) { await T.P('/api/monitor/conversations/envoyer', { fil: 'max', texte: t }); await dormir(400); }
    const lus = recus().slice(n0).filter(b => parNom(b) === 'Max');
    v('(population) Max a bien relevé la santé trois fois', [lus.length, lus.every(b => /\nsante \{"ok":true/.test(b.system))], [3, true]);
    const h1 = (await (await fetch(T.B + '/health')).json()).socle;
    const n = Object.values(h1.latence || {}).reduce((s, x) => s + (x.n || 0), 0);
    v('⛔ APRÈS trois relevés d’agent, /health rend TOUJOURS la fenêtre (les six requêtes), pas une fenêtre vidée', n, 6);
    const h2 = (await (await fetch(T.B + '/health')).json()).socle;
    v('…et la lecture publique, elle, vide toujours la fenêtre (c’est ce que la surveillance horaire attend)', h2.latence, {});
    await T.arreter();
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(1); });
