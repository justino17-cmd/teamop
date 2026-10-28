/* ⛔ CE QUE CE FICHIER GARDE — LE PONT DES AGENTS, CÔTÉ TOUR (`server/pont-messages.js`, 28 octobre 2026).

   Le VRAI `conversations.js` (faux app, routes appelées à la main), les VRAIES `agents.js` et `pont-messages.js`, contre un FAUX OP MESSAGES qui note chaque requête reçue
   et se laisse faire tomber, refuser, ralentir ou répondre n'importe quoi. Aucune minuterie : le banc appelle les tours (`_envoyer`, `_lire`) et tient l'horloge — chaque
   attente et chaque « minutes d'échec » est donc déterministe. (Le même pont contre le VRAI OP MESSAGES et le VRAI serveur : `test-3095`.)
     1. Fermé sans secret valable ni adresse de BOUCLE LOCALE : le module n'existe pas (le secret ne part jamais vers un nom de domaine) ;
     2. ce qui part : l'en-tête, le `cid` « tour-<id> », l'ordre, les lots (≤ 25, ≤ 48 000 octets), la date d'origine et l'état lu de l'historique, la notification
        seulement pour un agent d'importance, jamais pour un rattrapage ; le secret n'est ni dans le corps ni dans l'adresse ;
     3. ⛔ UNE PANNE NE CASSE RIEN CÔTÉ AGENTS : `parler` répond, le registre s'écrit, la file grossit, `sante()` compte les minutes d'échec ; au retour tout part, dans l'ordre, une
        fois ; l'attente grandit puis plafonne ; 404, 429, 5xx, réponse illisible, délai dépassé = la file attend, rien n'est jeté ;
     4. la file est BORNÉE (2 000) et le rattrapage reprend ce qui a été abandonné ; un lot refusé (400) ou un message refusé pour toujours part de la file, un refus
        passager est réessayé cinq fois ;
     5. ce que Justin écrit entre par `justinEcrit` (mentions, réveil), UNE fois, sans retourner à sa source ; une suppression d'OP MESSAGES retire du registre — sauf un
        rappel client non lu ; le premier passage ne fait que poser le curseur ; un texte hors forme n'est jamais écrit ;
     6. un registre d'état illisible n'est jamais réécrit : le pont ne démarre pas, et le DIT ;
     7. LES PHOTOS (28 octobre 2026) : après l'installation, les visages des agents, l'image du Système et celles des groupes — les VRAIS fichiers du dépôt — partent UNE à la fois vers
        `/api/pont/avatar`, celles que le service n'a pas déjà (empreinte comparée) ; en-têtes justes (octet-stream, empreinte, secret en en-tête seulement) ; un refus, une panne, un fichier
        absent ou trop gros ne retarde AUCUN message et ne compte pas comme une panne du pont ; retentée à l'installation suivante ; aucun chemin ne vient de la réponse du service. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3092-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); process.exit(1); }, 60000).unref();
const SECRET = crypto.randomBytes(32).toString('hex');

/* ── le FAUX OP MESSAGES ── */
const etat = { avatars: {}, avatarMode: 'normal', enVol: 0, enVolMax: 0, mode: 'normal', requetes: [], seq: {}, installe: true, rejets: {}, evenements: [], curseur: 100, plein: false, retry: 2 };
const faux = http.createServer((q, r) => { let b = ''; const morceaux = []; q.on('data', d => { b += d; morceaux.push(d); }); q.on('end', () => {
  let j = null; try { j = b ? JSON.parse(b) : null; } catch (e) {}
  etat.requetes.push({ m: q.method, url: q.url, corps: j, brut: b, octets: Buffer.concat(morceaux), secret: q.headers['x-opm-pont'], entetes: q.headers });
  const rep = (code, o, h) => { r.writeHead(code, Object.assign({ 'Content-Type': 'application/json' }, h || {})); r.end(JSON.stringify(o)); };
  if (etat.mode === 'panne') return q.socket.destroy();
  if (etat.mode === 'lent') return;                                   // ne répond jamais : le délai du pont le coupe
  if (etat.mode === '500') return rep(500, { error: 'boom' });
  if (etat.mode === '404') return rep(404, { error: 'introuvable' });
  if (etat.mode === '429') return rep(429, { error: 'quota_atteint' }, { 'Retry-After': String(etat.retry) });
  if (etat.mode === 'html') { r.writeHead(200, { 'Content-Type': 'text/html' }); return r.end('<html>pas du json</html>'); }
  if (q.url === '/api/pont/installer') return etat.mode === 'refus400' ? rep(400, { error: 'champ_invalide' }) : (etat.installe = true, rep(200, { ok: true, fils: [], robots: [], creees: {}, avatars: etat.avatars }));
  if (!etat.installe) return rep(409, { error: 'pont_non_installe' });
  if (q.url === '/api/pont/poster') {
    if (etat.mode === 'lot400') return rep(400, { error: 'champ_invalide' });
    const repondre = () => {
      const res = (j.messages || []).map(m => {
        if (etat.rejets[m.cid]) { const x = etat.rejets[m.cid]; if (x.fois !== undefined) { x.fois--; if (x.fois < 0) { delete etat.rejets[m.cid]; } } if (etat.rejets[m.cid]) return { ok: false, raison: etat.rejets[m.cid].raison }; }
        etat.seq[m.fil] = (etat.seq[m.fil] || 0) + 1; return { ok: true, deja: false, seq: etat.seq[m.fil], ts: Date.now() };
      });
      return rep(200, { ok: true, resultats: res });
    };
    /* `retenir` : le lot VOYAGE — la réponse n'arrive que quand le banc la relâche (`attente()`) ; la file peut changer pendant ce temps */
    if (etat.retenir) { etat.attente = () => { etat.retenir = false; etat.attente = null; repondre(); }; return; }
    return repondre();
  }
  if (q.url.startsWith('/api/pont/nouveaux')) { const e = etat.evenements; etat.evenements = []; return rep(200, { ok: true, curseur: etat.curseur, plein: etat.plein, evenements: e }); }
  if (q.url === '/api/pont/supprimer') return rep(200, { ok: true });
  if (q.url.startsWith('/api/pont/avatar')) {
    /* le service des PHOTOS : une à la fois (on compte celles qui se chevauchent), refus choisis par le banc, jamais de réponse (`lent`), coupure (`panne`) */
    etat.enVol++; etat.enVolMax = Math.max(etat.enVolMax, etat.enVol);
    const cible = new URL(q.url, 'http://x').searchParams.get('cible');
    const fin = () => { etat.enVol--; };
    if (etat.avatarMode === 'lent') { etat.enVol--; return; }
    if (etat.avatarMode === 'panne') { etat.enVol--; return q.socket.destroy(); }
    const code = etat.avatarMode === 'normal' ? 200 : (etat.avatarMode === 'sauf' ? (etat.avatarRefuse[cible] || 200) : parseInt(etat.avatarMode, 10));
    return setTimeout(() => { fin(); rep(code, code === 200 ? { ok: true, deja: false } : { error: 'refus' }); }, 3);
  }
  rep(404, { error: 'introuvable' });
}); });

const posts = () => etat.requetes.filter(x => x.url === '/api/pont/poster');
const messagesEnvoyes = () => posts().flatMap(x => x.corps.messages);

(async () => {
  console.log('\n── test-3096 · le pont côté Tour (pont-messages.js) contre un faux OP MESSAGES ──');
  await new Promise(r => faux.listen(0, '127.0.0.1', r));
  const URL = 'http://127.0.0.1:' + faux.address().port;
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const PONT = require(path.join(RACINE, 'server', 'pont-messages.js'));
  const FICHIER = require(path.join(RACINE, 'server', 'agents-fichier.js'));
  const routes = { get: {}, post: {} };
  const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
  const modes = {}; for (const a of AG.AGENTS) modes[a.id] = 'brouillon';
  fs.writeFileSync(path.join(banc, 'agents-etat.json'), JSON.stringify({ pause: { actif: false }, modes }));
  require('./banc-horaires.js').toujoursOuvert(banc);
  const agents = AG(app, { DATA_DIR: banc, monAdmin() {}, monPatronStrict() {} });
  let pont = null, horloge = Date.now();
  const reveils = [];
  const conv = CV(app, { DATA_DIR: banc, monAdmin() {}, monPatronStrict() {}, agents, pousseNotif: () => Promise.resolve(), maintenant: () => horloge,
    surMessage: async (m) => { reveils.push(m); }, surAjout: (m) => { if (pont) pont.surAjout(m); }, surRetrait: (x) => { if (pont) pont.surRetrait(x); } });
  const res = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
  const post = (p, b) => { const r = res(); routes.post[p]({ body: b, query: {} }, r); return r; };
  const fichier = FICHIER(banc);
  const parle = (id, fil, texte, o) => { horloge += 600000; return conv.parler(id, fil, texte, o); };
  const nouveau = (extra) => PONT(Object.assign({ iconesDir: path.join(banc, 'sans-icones'), DATA_DIR: banc, conversations: conv, agents: AG, groupes: CV.GROUPES, fichier, url: URL, secret: SECRET, horloge: () => horloge, attenteMaxMs: 400, delaiMs: 600 }, extra || {}));

  console.log('\n1. Fermé sans secret valable, ni adresse de boucle locale');
  {
    const refus = [
      ['sans secret', { secret: '' }], ['un secret trop court', { secret: 'abcd' }], ['un secret non hexadécimal', { secret: 'z'.repeat(64) }],
      ['une adresse de domaine', { url: 'https://api.teamop.fr' }], ['une adresse privée', { url: 'http://192.0.2.1:8091' }], ['« 127.0.0.1 » comme début d\'un nom', { url: 'http://127.0.0.1.exemple.fr:8091' }],
      ['une adresse avec identifiant', { url: 'http://127.0.0.1:8091@exemple.fr' }], ['le bon port, en https', { url: 'https://127.0.0.1:8091' }], ['sans registre de conversations', { conversations: null }], ['sans agents', { agents: null }], ['sans rangement', { fichier: null }],
    ];
    for (const [nom, extra] of refus) v('⛔ ' + nom + ' : le module n\'existe pas', nouveau(extra), null);
    vrai('(contre-épreuve) le secret en MAJUSCULES, une adresse « localhost », « [::1] » : acceptés', ['A'.repeat(32) + 'b'.repeat(32)].every(s => nouveau({ secret: s }) !== null) && nouveau({ url: 'http://localhost:8091' }) !== null && nouveau({ url: 'http://[::1]:8091/' }) !== null);
  }

  console.log('\n2. Ce qui part, et dans quel ordre');
  {
    /* un historique AVANT le pont : trois messages d'autrefois, dont un de Justin et un agent non lu */
    parle('victor', 'victor', 'Ancien message de Victor', {});
    conv.systeme('equipe', 'Camille a pris la tâche X');
    const justin0 = post('/api/monitor/conversations/envoyer', { fil: 'victor', texte: 'Ancien message de Justin' });
    vrai('(population) trois messages au registre avant que le pont existe', conv.tous().length === 3 && justin0.code === 200);
    pont = nouveau();
    vrai('le pont est monté', pont !== null);
    v('/health : deux nombres, rien d\'autre, à zéro au départ — et ce que le pont ne connaissait pas n\'est pas encore en file (il n\'y avait pas de crochet vers lui)', pont.sante(), { echecMin: 0, file: 0 });
    await pont._envoyer();
    const ins = etat.requetes.filter(x => x.url === '/api/pont/installer');
    v('il installe d\'abord (UNE fois) : seize agents, quatre groupes, les membres des groupes', [ins.length, ins[0].corps.agents.length, ins[0].corps.groupes.map(g => g.fil), ins[0].corps.groupes.find(g => g.fil === 'clients').membres.length], [1, 16, ['equipe', 'clients', 'plateforme', 'reunions'], 6]);
    v('…puis RATTRAPE : les trois messages de l\'historique, dans l\'ordre de leurs dates', messagesEnvoyes().map(m => m.texte), ['Ancien message de Victor', 'Camille a pris la tâche X', 'Ancien message de Justin']);
    const lot = posts()[0].corps;
    v('⛔ un rattrapage garde la DATE D\'ORIGINE et l\'état lu, et ne notifie personne (`import:true`, jamais `push`)', [lot.import, lot.messages.every(m => Number.isSafeInteger(m.ts)), lot.messages.map(m => m.lu), lot.messages.some(m => m.push)], [true, true, [false, true, true], false]);
    v('…le `cid` est « tour- » + l\'identifiant du registre (c\'est lui qui interdit le doublon côté OP MESSAGES)', lot.messages.map(m => m.cid), conv.tous().map(m => 'tour-' + m.id));
    v('…les auteurs : « victor », « systeme », « justin »', lot.messages.map(m => m.de), ['victor', 'systeme', 'justin']);
    for (const q of etat.requetes) vrai(q.m + ' ' + q.url + ' : l\'en-tête porte le secret, ni le corps ni l\'adresse ne le portent', q.secret === SECRET && !q.brut.includes(SECRET) && !q.url.includes(SECRET));
    v('⛔ une requête du pont ne porte ni Origin, ni cookie, ni X-Forwarded-For (elle parle en direct à la boucle locale)', etat.requetes.filter(q => q.entetes.origin || q.entetes.cookie || q.entetes['x-forwarded-for']).length, 0);
    v('…la file est vide', pont.sante().file, 0);

    etat.requetes.length = 0;
    /* en direct : un agent d'importance, un agent d'info, Justin, le système */
    parle('victor', 'victor', 'Info courante', { niveau: 'info' });
    parle('lea', 'lea', 'Important : un client attend', { niveau: 'important' });
    parle('lea', 'lea', 'Urgent : devis bloqué', { niveau: 'urgent' });
    post('/api/monitor/conversations/envoyer', { fil: 'victor', texte: 'Réponse de Justin' });
    conv.systeme('equipe', 'Hugo est à l\'arrêt');
    await pont._envoyer();
    const en = messagesEnvoyes();
    v('en direct : l\'ordre du registre', en.map(m => m.texte), ['Info courante', 'Important : un client attend', 'Urgent : devis bloqué', 'Réponse de Justin', 'Hugo est à l\'arrêt']);
    v('⛔ la notification de téléphone suit la Tour : « important » et « urgent » seulement, pas « info », pas Justin, pas le système', en.map(m => m.push === true), [false, true, true, false, false]);
    v('…les messages en direct partent à l\'heure d\'OP MESSAGES (pas de date), sauf ceux de Justin (sa date, déjà lu)', en.map(m => [m.ts !== undefined, m.lu]).map(x => x.join('/')), ['false/', 'false/', 'false/', 'true/true', 'false/']);
    const lots = posts();
    v('…en lots séparés quand l\'espèce change (en direct / importé)', lots.map(l => [l.corps.import, l.corps.messages.length]), [[false, 3], [true, 1], [false, 1]]);
    /* la limite d'un lot : 60 messages en direct → 25 + 25 + 10, aucun corps ne dépasse 48 000 octets */
    etat.requetes.length = 0;
    for (let i = 0; i < 60; i++) conv.systeme('reunions', 'Ligne ' + i, { cle: 'l' + i });
    await pont._envoyer();
    v('⛔ soixante messages : trois lots de 25, 25 et 10', posts().map(l => l.corps.messages.length), [25, 25, 10]);
    etat.requetes.length = 0;
    const gros = 'x'.repeat(1400);
    const AGS = AG.AGENTS.map(a => a.id);
    for (let i = 0; i < 40; i++) { horloge += 60000; conv.parler(AGS[i % 16], 'reunions', gros + i, { reunion: true, max: 1500 }); }
    await pont._envoyer();
    v('⛔ de longs messages (1 400 signes) : les 40 partent, en deux lots (25 puis 15), aucun corps ne dépasse 56 000 octets', [messagesEnvoyes().length, posts().map(l => l.corps.messages.length).join('+'), Math.max(...posts().map(l => l.brut.length)) < 56000], [40, '25+15', true]);
    /* la soupape du poids : des messages que la Tour n'écrit pas (jusqu'à 8 000 signes), posés directement — douze de 7 000 signes se coupent en lots de six */
    etat.requetes.length = 0;
    for (let i = 0; i < 12; i++) pont.surAjout({ id: 'e' + i.toString(16).padStart(11, '0'), ts: Date.now(), fil: 'victor', de: 'victor', texte: 'y'.repeat(7000), niveau: 'info', lu: false });
    await pont._envoyer();
    v('⛔ douze messages de 7 000 signes : jamais plus de 48 000 octets de texte dans un lot (6 + 6)', [posts().map(l => l.corps.messages.length).join('+'), Math.max(...posts().map(l => l.brut.length)) < 60000], ['6+6', true]);
    /* ⛔ des OCTETS, pas des signes (relecture de `gardien`) : OP MESSAGES lit 64 Ko au plus, et un émoji pèse quatre octets pour deux signes JavaScript — compté en
       signes, un lot de douze messages d'émojis pesait 84 Ko, refusé (413) et rejoué sans fin */
    etat.requetes.length = 0;
    for (let i = 0; i < 12; i++) pont.surAjout({ id: 'a' + i.toString(16).padStart(11, '0'), ts: Date.now(), fil: 'victor', de: 'victor', texte: '🐀'.repeat(1750), niveau: 'info', lu: false });
    await pont._envoyer();
    v('⛔ douze messages d\'émojis (7 000 octets chacun) : les douze partent, et aucun corps ne dépasse 64 Ko en OCTETS', [messagesEnvoyes().length, Math.max(...posts().map(l => Buffer.byteLength(l.brut, 'utf8'))) < 65536], [12, true]);
  }

  console.log('\n3. Une panne d\'OP MESSAGES ne casse RIEN côté agents');
  {
    etat.requetes.length = 0;
    for (const mode of ['panne', '500', '404', '429', 'html', 'lent']) {
      etat.mode = mode;
      const avant = conv.tous().length;
      const t0 = Date.now();
      const dit = parle('victor', 'victor', 'Pendant la panne ' + mode, {});
      post('/api/monitor/conversations/envoyer', { fil: 'victor', texte: 'Justin pendant ' + mode });
      const fait = Date.now() - t0;
      v('⛔ [' + mode + '] l\'agent parle et Justin écrit : le registre s\'écrit (+2)', [dit.ok, conv.tous().length - avant], [true, 2]);
      vrai('[' + mode + '] …sans attendre OP MESSAGES (le crochet est asynchrone : moins de 200 ms)', fait < 200);
      const f0 = pont.sante().file;
      await pont._envoyer();
      const s = pont.sante();
      vrai('[' + mode + '] le tour d\'envoi échoue SANS exception, la file garde les messages (' + s.file + ')', s.file >= 2 && s.file >= f0);
      vrai('[' + mode + '] …et le pont se met en attente', pont._etat().enAttente);
      horloge += 120000;           // deux minutes passent : l'attente est échue, l'échec dure
      etat.mode = 'normal';
      await pont._envoyer();       // le retour : tout part
      v('[' + mode + '] au retour, tout part et la file est vide', pont.sante().file, 0);
      etat.mode = mode;            // pour le tour suivant, on retombe
      etat.mode = 'normal';
    }
    etat.requetes.length = 0;
    /* les minutes d'échec : l'horloge est tenue par le banc */
    etat.mode = 'panne';
    parle('victor', 'victor', 'Minutes d\'échec 1', {});
    await pont._envoyer();
    await pont._lire();
    v('juste après la première panne : 0 minute', pont.sante().echecMin, 0);
    horloge += 31 * 60000;
    v('⛔ trente et une minutes plus tard, SANS nouvel essai : 31 minutes d\'échec (la surveillance crie à 30)', pont.sante().echecMin, 31);
    /* l'attente grandit puis plafonne : on compte les essais en 5 secondes d'horloge simulée */
    const essais = () => etat.requetes.filter(x => x.url === '/api/pont/poster').length;
    let n = essais(), succ = [];
    for (let i = 0; i < 40; i++) { horloge += 100; await pont._envoyer(); const m = essais(); succ.push(m - n); n = m; }
    vrai('⛔ l\'attente ne se réduit pas à un essai à chaque tour (un service qui tombe n\'est pas martelé) : moins de 20 essais sur 40 tours de 100 ms', succ.reduce((a, b) => a + b, 0) < 20);
    /* le 429 se juge sur un pont à l'attente NORMALE (60 s au plus) : plafonnée à 400 ms, l'attente de repli aurait suffi à masquer un « Retry-After » ignoré */
    pont.arreter(); pont = nouveau({ attenteMaxMs: undefined }); etat.mode = 'normal'; await pont._envoyer();
    pont.surAjout({ id: 'f' + '9'.repeat(11), ts: Date.now(), fil: 'victor', de: 'victor', texte: 'Pendant le 429', niveau: 'info', lu: false });
    etat.mode = '429'; etat.retry = 30; await pont._envoyer();
    const apres429 = essais();
    horloge += 5000; await pont._envoyer(); horloge += 20000; await pont._envoyer();
    v('⛔ un 429 est respecté : tant que « Retry-After » (30 s) n\'est pas écoulé, aucun nouvel essai (vingt-cinq secondes plus tard, toujours aucun)', essais(), apres429);
    horloge += 6000; await pont._envoyer();
    v('…et une fois le délai écoulé, le pont réessaie', essais(), apres429 + 1);
    etat.mode = 'normal'; horloge += 120000;
    await pont._envoyer();
    v('le retour efface l\'échec : 0 minute, file vide', [pont.sante().echecMin, pont.sante().file], [0, 0]);
  }

  console.log('\n4. La file est bornée ; un message refusé pour toujours ne bloque personne');
  {
    etat.requetes.length = 0; etat.mode = 'panne';
    for (let i = 0; i < 2100; i++) pont.surAjout({ id: 'f' + i.toString(16).padStart(11, '0'), ts: Date.now(), fil: 'victor', de: 'victor', texte: 'Texte ' + i, niveau: 'info', lu: false });
    const s = pont.sante();
    v('⛔ 2 100 messages en panne : la file s\'arrête à 2 000, le pont compte ce qu\'il a abandonné', [s.file, pont._etat().abandons], [2000, 100]);
    etat.mode = 'normal'; horloge += 120000;
    await pont._envoyer();
    v('…au retour, la file se vide', pont.sante().file, 0);
    /* ⛔ UN LOT EN VOL PENDANT QUE LA FILE ROGNE SA TÊTE : on retire de la file ce qui est parti PAR SON IDENTITÉ, pas « les 25 premiers » — sinon 25 messages qui n'ont jamais voyagé disparaissent */
    {
      const sauve = etat.requetes.splice(0); etat.retenir = true; etat.mode = 'normal';
      for (let i = 0; i < 2000; i++) pont.surAjout({ id: 'g' + i.toString(16).padStart(11, '0'), ts: Date.now(), fil: 'victor', de: 'victor', texte: 'Vol ' + i, niveau: 'info', lu: false });
      horloge += 120000;
      const enVol = pont._envoyer();
      await new Promise(r => { const t = setInterval(() => { if (etat.attente) { clearInterval(t); r(); } }, 5); });
      for (let i = 2000; i < 2030; i++) pont.surAjout({ id: 'g' + i.toString(16).padStart(11, '0'), ts: Date.now(), fil: 'victor', de: 'victor', texte: 'Vol ' + i, niveau: 'info', lu: false });
      etat.attente(); await enVol;
      const partis = new Set(messagesEnvoyes().map(m => m.texte));
      v('⛔ pendant qu\'un lot voyage, la file a rogné sa tête : le lot est parti, et RIEN de ce qui restait derrière n\'a été retiré à sa place (de « Vol 30 » à « Vol 2029 », tout part)',
        [partis.has('Vol 0'), partis.has('Vol 24'), partis.has('Vol 25'), partis.has('Vol 29'), Array.from({ length: 2000 }, (_, i) => partis.has('Vol ' + (i + 30))).every(Boolean), pont.sante().file], [true, true, false, false, true, 0]);
      etat.requetes.unshift(...sauve);
    }
    v('⛔ …et le PLUS ANCIEN part le premier perdu : les 100 premiers ne sont jamais arrivés, les 2 000 derniers si', [messagesEnvoyes().some(m => m.texte === 'Texte 0'), messagesEnvoyes().some(m => m.texte === 'Texte 99'), messagesEnvoyes().some(m => m.texte === 'Texte 100'), messagesEnvoyes().some(m => m.texte === 'Texte 2099')], [false, false, true, true]);
    /* des refus */
    etat.requetes.length = 0;
    const id1 = ('b' + '1'.repeat(11)), id2 = ('b' + '2'.repeat(11)), id3 = ('b' + '3'.repeat(11)), id4 = ('b' + '4'.repeat(11));
    etat.rejets['tour-' + id1] = { raison: 'pas_membre' };
    etat.rejets['tour-' + id3] = { raison: 'erreur' };
    etat.rejets['tour-' + id4] = { raison: 'erreur', fois: 2 };
    for (const [id, t] of [[id1, 'refusé pour toujours'], [id2, 'normal'], [id3, 'erreur passagère sans fin'], [id4, 'erreur passagère qui passe']]) pont.surAjout({ id, ts: Date.now(), fil: 'victor', de: 'victor', texte: t, niveau: 'info', lu: false });
    for (let i = 0; i < 12; i++) { await pont._envoyer(); horloge += 120000; }
    const vus = messagesEnvoyes().map(m => m.texte);
    v('⛔ un refus définitif part de la file (une fois tenté), les autres messages ne sont PAS retenus derrière lui', [vus.filter(t => t === 'refusé pour toujours').length, vus.includes('normal')], [1, true]);
    v('…une erreur passagère est réessayée, puis passe', vus.filter(t => t === 'erreur passagère qui passe').length >= 3, true);
    v('…mais pas indéfiniment : cinq essais, puis le message est abandonné', [vus.filter(t => t === 'erreur passagère sans fin').length, pont.sante().file], [5, 0]);
    etat.rejets = {}; etat.requetes.length = 0; etat.mode = 'lot400';
    pont.surAjout({ id: 'c' + '5'.repeat(11), ts: Date.now(), fil: 'victor', de: 'victor', texte: 'lot refusé', niveau: 'info', lu: false });
    await pont._envoyer();
    v('⛔ un lot refusé en 400 (le pont a un défaut) part de la file au lieu de boucler pour toujours', [pont.sante().file, posts().length], [0, 1]);
    etat.mode = 'normal'; horloge += 120000;
    etat.requetes.length = 0; etat.installe = false;
    pont.surAjout({ id: 'd' + '6'.repeat(11), ts: Date.now(), fil: 'victor', de: 'victor', texte: 'après un redémarrage d\'OP MESSAGES', niveau: 'info', lu: false });
    await pont._envoyer(); await pont._envoyer();
    v('⛔ « pas installé » (409) : le pont RÉINSTALLE et reprend, rien n\'est perdu', [etat.requetes.filter(x => x.url === '/api/pont/installer').length, messagesEnvoyes().some(m => m.texte === 'après un redémarrage d\'OP MESSAGES'), pont.sante().file], [1, true, 0]);
  }

  console.log('\n5. Ce que Justin écrit entre par le chemin de la Tour — une fois, sans retour à sa source');
  {
    etat.requetes.length = 0; horloge += 120000;
    const e0 = conv.tous().length, reveils0 = reveils.length, enfile0 = pont.sante().file;
    etat.evenements = [{ gid: 90, type: 'message', fil: 'victor', seq: 8999, genre: 'texte', texte: 'Écrit AVANT l\'installation : ne se rejoue pas', ts: 1 }]; etat.curseur = 100;
    pont.arreter(); pont = nouveau(); horloge += 1;
    await pont._envoyer();   // installe (sa table est vide : il rattrape l'historique)
    etat.requetes.length = 0;
    await pont._lire();
    v('⛔ le premier passage ne fait que poser le curseur : un événement qui existait déjà n\'est PAS rejoué', [pont._etat().curseur, conv.tous().length, conv.tous().some(m => /ne se rejoue pas/.test(m.texte))], [100, e0, false]);
    etat.evenements = [];
    etat.curseur = 105;
    etat.evenements = [
      { gid: 101, type: 'message', fil: 'victor', seq: 9001, genre: 'texte', texte: 'Victor, @Léa et @Max : ok ?', ts: 1 },
      { gid: 102, type: 'message', fil: 'equipe', seq: 9002, genre: 'texte', texte: '@Léa et @Max, un point', ts: 2 },
      { gid: 103, type: 'message', fil: 'victor', seq: 9001, genre: 'texte', texte: 'Victor, @Léa et @Max : ok ?', ts: 1 },
      { gid: 104, type: 'message', fil: 'fil-inconnu', seq: 9004, genre: 'texte', texte: 'perdu', ts: 3 },
      { gid: 105, type: 'message', fil: 'lea', seq: 9005, genre: 'texte', texte: '   ', ts: 4 },
    ];
    await pont._lire();
    const reg = conv.tous();
    v('un message de Justin entre au registre (de:justin), avec ses mentions lues par le SERVEUR', reg.length - e0, 2);
    const dernierJ = reg.filter(m => m.de === 'justin').slice(-2);
    v('…les deux messages valables, dans l\'ordre ; le rejoué (même numéro), le fil inconnu et le vide ne sont pas écrits', dernierJ.map(m => m.texte), ['Victor, @Léa et @Max : ok ?', '@Léa et @Max, un point']);
    await new Promise(r => setTimeout(r, 20));
    vrai('⛔ les agents sont réveillés par le MÊME chemin que la route (`surMessage` reçoit de:justin, ses mentions, sa profondeur 0)', reveils.slice(reveils0).length === 2 && reveils.slice(reveils0).every(m => m.de === 'justin' && m.prof === 0) && reveils.slice(reveils0).every(m => m.mentions.includes('lea') || m.fil === 'victor'));
    v('…le fil du groupe cite Léa et Max (les membres du fil seulement)', conv.lire('equipe', 5).filter(m => m.de === 'justin').pop().mentions.sort(), ['lea', 'max']);
    v('⛔ RIEN ne retourne à sa source : la file n\'a pas bougé', [pont.sante().file, etat.requetes.filter(x => x.url === '/api/pont/poster').length], [0, 0]);
    v('le curseur avance jusqu\'à la fin', pont._etat().curseur, 105);
    /* un texte plus long que ce que la Tour garde : il est borné comme par la route */
    etat.curseur = 106; etat.evenements = [{ gid: 106, type: 'message', fil: 'victor', seq: 9006, genre: 'texte', texte: 'a'.repeat(1500), ts: 5 }];
    await pont._lire();
    v('un message de plus de 1 000 signes est borné comme par la route de la Tour', conv.tous().filter(m => m.de === 'justin').pop().texte.length, 1000);
    /* une photo, un sondage : les agents ne lisent que le texte, et le pont le dit — une fois */
    etat.requetes.length = 0; const e1 = conv.tous().length, r1 = reveils.length;
    etat.curseur = 108; etat.evenements = [{ gid: 107, type: 'message', fil: 'victor', seq: 9007, genre: 'autre', texte: 'MARQ-LEGENDE une photo avec sa légende', ts: 6 }, { gid: 108, type: 'message', fil: 'victor', seq: 9008, genre: 'autre', texte: null, ts: 7 }];
    await pont._lire(); await pont._envoyer();
    vrai('⛔ …même quand le message porte une légende : le genre décide, pas la présence d\'un texte', !conv.tous().some(m => /MARQ-LEGENDE/.test(m.texte)));
    const notes = messagesEnvoyes().filter(m => /ne lisent que le texte/.test(m.texte));
    v('⛔ un message qui n\'est pas du texte n\'entre PAS au registre, ne réveille personne, et la note part dans le fil (une seule pour deux messages)', [conv.tous().length, reveils.length - r1, notes.length, notes[0] && notes[0].de, notes[0] && notes[0].fil], [e1, 0, 1, 'systeme', 'victor']);
    vrai('…et la note n\'entre pas au registre non plus (les agents ne la lisent pas)', !conv.tous().some(m => /ne lisent que le texte/.test(m.texte)));

    /* les suppressions */
    const lierSuppr = async () => {
      // un message d'agent recopié (on connaît son numéro dans OP MESSAGES) ; une suppression « pour moi » de Justin, un rappel non lu qu'on tente de supprimer
      const r = parle('victor', 'victor', 'À retirer depuis OP MESSAGES', {});
      await pont._envoyer();
      const seq = etat.seq.victor;
      return { id: r.id, seq };
    };
    const a = await lierSuppr();
    const n0 = conv.tous().length, f0 = pont.sante().file;
    etat.requetes.length = 0; etat.curseur = 120;
    etat.evenements = [{ gid: 120, type: 'suppression', fil: 'victor', seq: a.seq, pour: 'moi' }];
    await pont._lire();
    v('⛔ une suppression d\'OP MESSAGES retire le message du registre (les agents ne le relisent plus)', [conv.tous().length, conv.lire('victor', 50).some(m => m.id === a.id)], [n0 - 1, false]);
    v('…et ne lui est PAS redite (aucune suppression repartie vers OP MESSAGES)', [etat.requetes.filter(x => x.url === '/api/pont/supprimer').length, pont.sante().file], [0, f0]);
    const rc = conv.rappelClient('lea', 'DOS-000456', Object.keys(conv.MOTIFS)[0]);
    await pont._envoyer();
    const seqRappel = etat.seq.lea;
    etat.curseur = 121; etat.evenements = [{ gid: 121, type: 'suppression', fil: 'lea', seq: seqRappel, pour: 'tous' }, { gid: 122, type: 'suppression', fil: 'victor', seq: 99999, pour: 'tous' }];
    etat.curseur = 122;
    await pont._lire();
    vrai('⛔ un rappel client NON LU ne se supprime pas depuis OP MESSAGES (409 côté registre) — et une suppression d\'un numéro inconnu est sans effet', conv.lire('lea', 50).some(m => m.id === rc.id));
    /* la Tour supprime : OP MESSAGES l'apprend */
    etat.requetes.length = 0;
    const b = parle('victor', 'victor', 'À retirer depuis la Tour', {});
    await pont._envoyer();
    const seqB = etat.seq.victor;
    post('/api/monitor/conversations/supprimer', { id: b.id });
    await pont._envoyer();
    const sup = etat.requetes.filter(x => x.url === '/api/pont/supprimer');
    v('⛔ la Tour supprime : OP MESSAGES est prévenu, avec le fil et le NUMÉRO là-bas', sup.map(x => x.corps), [{ fil: 'victor', seq: seqB }]);
    post('/api/monitor/conversations/supprimer', { id: 'abcdef012345' });
    v('un identifiant inconnu côté Tour : rien n\'est dit à OP MESSAGES', etat.requetes.filter(x => x.url === '/api/pont/supprimer').length, 1);
    const c = parle('victor', 'victor', 'Jamais recopié', {});
    etat.mode = 'panne'; await pont._envoyer(); etat.mode = 'normal';
    post('/api/monitor/conversations/supprimer', { id: c.id });
    horloge += 120000;
    etat.requetes.length = 0; await pont._envoyer();
    const ordre = etat.requetes.map(x => x.url.replace('/api/pont/', ''));
    v('⛔ un message supprimé AVANT d\'avoir été recopié part, PUIS est retiré (la suppression suit toujours le message — elle ne vise jamais un numéro qu\'OP MESSAGES n\'a pas)', ordre, ['poster', 'supprimer']);
    etat.requetes.length = 0;
    pont.arreter();
  }

  console.log('\n6. Un registre d\'état illisible n\'est jamais réécrit');
  {
    const F = path.join(banc, 'pont-messages.json');
    const avant = fs.readFileSync(F, 'utf8');
    vrai('(population) la table des recopies existe et porte un curseur et des liens', /"curseur":/.test(avant) && /"lies":\[\[/.test(avant));
    fs.writeFileSync(F, '{ pas du json');
    const f2 = FICHIER(banc);
    let sortie = ''; const e = console.error; console.error = (...a) => { sortie += a.join(' '); };
    const p2 = PONT({ DATA_DIR: banc, conversations: conv, agents: AG, groupes: CV.GROUPES, fichier: f2, url: URL, secret: SECRET, horloge: () => horloge });
    const n0 = etat.requetes.length;
    p2.demarrer(); p2.surAjout({ id: 'e' + '7'.repeat(11), ts: Date.now(), fil: 'victor', de: 'victor', texte: 'ne doit pas partir', niveau: 'info', lu: false });
    await p2._envoyer(); await p2._lire();
    console.error = e; p2.arreter();
    v('⛔ le pont ne démarre pas, ne parle pas à OP MESSAGES et le DIT', [etat.requetes.length - n0, /illisible/.test(sortie)], [0, true]);
    v('…le fichier abîmé est resté tel quel (le réparer est un geste de Justin)', fs.readFileSync(F, 'utf8'), '{ pas du json');
    vrai('…et /health crie : les minutes d\'échec courent dès le démarrage', (() => { horloge += 61 * 60000; return p2.sante().echecMin >= 61; })());
  }

  console.log('\n7. Les photos : les visages des agents, l\'image du Système, celles des groupes');
  {
    const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
    const ICONES = path.join(RACINE, 'icons');
    const IDS = AG.AGENTS.map(a => a.id).concat(['systeme']).concat(CV.GROUPES);
    const fichierDe = (c) => c === 'systeme' || CV.GROUPES.includes(c) ? path.join(ICONES, 'groupes', c + '.png') : path.join(ICONES, 'agents', c + '.jpg');
    const avatarsRecus = () => etat.requetes.filter(x => x.url.startsWith('/api/pont/avatar'));
    const cibleDe = (x) => new (require('url').URL)(x.url, 'http://x').searchParams.get('cible');
    const dossierPont = (nom) => { const d = path.join(banc, nom); fs.mkdirSync(d, { recursive: true }); return d; };
    /* un pont NEUF (son propre registre d'état : la table des recopies du banc 6 est volontairement abîmée) */
    const neuf = async (nom, extra) => { const journaux = []; const p = PONT(Object.assign({ DATA_DIR: banc, conversations: conv, agents: AG, groupes: CV.GROUPES, fichier: FICHIER(dossierPont(nom)), url: URL, secret: SECRET, horloge: () => horloge,
      attenteMaxMs: 400, delaiMs: 600, iconesDir: ICONES, journal: (m) => journaux.push(m) }, extra || {})); p.journaux = journaux; pont = p; return p; };   // (`pont` : le crochet de `conversations.js` parle à l'instance COURANTE)
    const tourner = async (p) => { etat.requetes.length = 0; await p._envoyer(); await p._attendreFini(); return avatarsRecus(); };

    /* ⛔ LA POPULATION AVANT LES CONCLUSIONS : les images existent, ce sont de vraies images (la signature se lit dans le fichier, pas dans son nom) et de la bonne taille (256 × 256). */
    const dimJpeg = (b) => { let i = 2; while (i + 9 < b.length) { if (b[i] !== 0xFF) return null; const m = b[i + 1]; if (m >= 0xC0 && m <= 0xC2) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + b.readUInt16BE(i + 2); } return null; };
    const dimPng = (b) => b.length > 24 ? [b.readUInt32BE(16), b.readUInt32BE(20)] : null;
    const agentsPont = AG.AGENTS.map(a => a.id);
    const imagesAgents = agentsPont.map(id => { const f = path.join(ICONES, 'agents', id + '.jpg'); return fs.existsSync(f) ? fs.readFileSync(f) : null; });
    const imagesGroupes = ['equipe', 'clients', 'plateforme', 'reunions', 'systeme'].map(id => { const f = path.join(ICONES, 'groupes', id + '.png'); return fs.existsSync(f) ? fs.readFileSync(f) : null; });
    v('(population) les seize photos d\'agents du pont existent', [agentsPont.length, imagesAgents.filter(Boolean).length], [16, 16]);
    v('(population) les cinq images de `icons/groupes` existent (equipe, clients, plateforme, reunions, systeme)', imagesGroupes.filter(Boolean).length, 5);
    v('⛔ les seize agents : une vraie signature JPEG (FFD8FF, fin FFD9), 256 × 256, plus de 1 Ko et moins de 2 Mo', imagesAgents.filter(b => !(b && b.subarray(0, 3).toString('hex') === 'ffd8ff' && b.subarray(-2).toString('hex') === 'ffd9' && JSON.stringify(dimJpeg(b)) === '[256,256]' && b.length > 1024 && b.length < 2 * 1048576)).length, 0);
    v('⛔ les cinq images de groupes : une vraie signature PNG, 256 × 256, plus de 1 Ko et moins de 2 Mo', imagesGroupes.filter(b => !(b && b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a' && JSON.stringify(dimPng(b)) === '[256,256]' && b.length > 1024 && b.length < 2 * 1048576)).length, 0);
    v('…toutes différentes (vingt et une images, vingt et un contenus : aucune n\'a été copiée sur une autre)', new Set(imagesAgents.concat(imagesGroupes).map(b => sha(b))).size, 21);
    vrai('(population) seize agents, quatre groupes : vingt et une cibles, et chacune a son fichier dans le dépôt', IDS.length === 21 && AG.AGENTS.length === 16 && CV.GROUPES.length === 4 && IDS.every(c => fs.existsSync(fichierDe(c))));
    etat.mode = 'normal'; etat.avatars = {}; etat.installe = false; etat.avatarMode = 'normal';
    let p = await neuf('p7a');
    let recus = await tourner(p);
    v('⛔ rien n\'est encore posé : les VINGT ET UNE photos partent, une par cible', [recus.length, recus.map(cibleDe).sort()], [21, IDS.slice().sort()]);
    v('…UNE à la fois (jamais deux envois qui se chevauchent)', etat.enVolMax, 1);
    v('…chaque corps EST le fichier du dépôt, octet pour octet, et l\'empreinte annoncée est son SHA-256', recus.map(x => [x.octets.equals(fs.readFileSync(fichierDe(cibleDe(x)))), x.entetes['x-opm-empreinte'] === sha(x.octets)].join()).filter(x => x !== 'true,true').length, 0);
    v('…en-têtes : octet-stream, Content-Length = la taille du fichier, le secret en EN-TÊTE seulement (ni adresse, ni corps), ni Origin ni cookie', recus.filter(x => x.entetes['content-type'] !== 'application/octet-stream' || Number(x.entetes['content-length']) !== x.octets.length || x.secret !== SECRET || x.url.includes(SECRET) || x.octets.includes(Buffer.from(SECRET)) || x.entetes.origin || x.entetes.cookie || x.m !== 'POST').length, 0);
    v('(population) les photos sont de VRAIES images (JPEG pour les agents, PNG pour le Système et les groupes), et pèsent moins de 2 Mo', recus.map(x => { const t = x.octets.subarray(0, 4).toString('hex'); return (cibleDe(x) === 'systeme' || CV.GROUPES.includes(cibleDe(x)) ? t === '89504e47' : t.startsWith('ffd8ff')) && x.octets.length > 1000 && x.octets.length < 2 * 1048576; }).filter(x => !x).length, 0);
    v('…l\'installation n\'a eu lieu qu\'UNE fois, les messages sont partis, rien n\'est compté comme panne', [etat.requetes.filter(x => x.url === '/api/pont/installer').length, p.sante().echecMin, p._etat().photos, p._etat().photosRefusees], [1, 0, 21, 0]);
    p.arreter();

    /* le service a DÉJÀ tout : rien ne part. Il manque une photo, une autre a changé : ces deux-là seulement. */
    const toutes = {}; for (const c of IDS) toutes[c] = sha(fs.readFileSync(fichierDe(c)));
    etat.avatars = Object.assign({}, toutes); etat.installe = false;
    p = await neuf('p7b');
    v('⛔ le service a tout, à l\'identique : AUCUNE photo ne part (le redémarrage de la Tour ne renvoie rien)', (await tourner(p)).length, 0);
    p.arreter();
    const incomplet = Object.assign({}, toutes); delete incomplet.victor; incomplet.equipe = sha('une autre image'); incomplet.lea = 'f'.repeat(64);
    etat.avatars = incomplet; etat.installe = false;
    p = await neuf('p7c');
    v('⛔ une manquante, deux dont l\'empreinte a CHANGÉ : exactement ces trois-là', (await tourner(p)).map(cibleDe).sort(), ['equipe', 'lea', 'victor']);
    p.arreter();

    /* une réponse du service qui essaie d'orienter les chemins : rien n'en sort */
    etat.avatars = { '../../etc/passwd': 'x', '__proto__': { victor: toutes.victor }, 'victor/../lea': 'y' }; etat.installe = false;
    p = await neuf('p7d');
    recus = await tourner(p);
    v('⛔ des clés hostiles dans `avatars` (traversée, __proto__) : les cibles envoyées restent les vingt et une de la liste FIXE, « victor » n\'est pas pris pour posée', [recus.length, recus.map(cibleDe).sort(), recus.some(x => /\.\./.test(x.url))], [21, IDS.slice().sort(), false]);
    p.arreter();
    for (const [nom, valeur] of [['un tableau', ['victor']], ['un texte', 'victor'], ['un nombre', 7], ['rien', undefined]]) {
      etat.avatars = valeur; etat.installe = false;
      const q = await neuf('p7e'); const n = (await tourner(q)).length; q.arreter();
      v('…`avatars` = ' + nom + ' : traité comme « rien de posé » (21 photos), sans erreur', n, 21);
    }

    /* un refus ne bloque RIEN */
    etat.avatars = {}; etat.installe = false; etat.avatarMode = 'sauf'; etat.avatarRefuse = { victor: 415, max: 413, lea: 400 };
    p = await neuf('p7f');
    parle('victor', 'victor', 'Un message pendant les photos', { niveau: 'info' });
    recus = await tourner(p);
    v('⛔ une photo refusée (415, 413, 400 : ce n\'est QUE cette image) : la série CONTINUE, les vingt et une sont tentées', recus.length, 21);
    v('…ce n\'est pas une panne du pont : aucune minute d\'échec, même une heure plus tard, la file est vide', await (async () => { horloge += 3600000; return [p.sante().echecMin, p.sante().file]; })(), [0, 0]);
    vrai('…et le message écrit pendant ce temps est parti comme d\'habitude', messagesEnvoyes().some(m => /pendant les photos/.test(m.texte)));
    v('…3 refusées comptées, 18 posées', [p._etat().photosRefusees, p._etat().photos], [3, 18]);
    v('…un message posté APRÈS part encore (rien n\'est resté bloqué)', await (async () => { etat.requetes.length = 0; parle('lea', 'lea', 'Après les photos', { niveau: 'info' }); await p._envoyer(); await p._attendreFini(); return messagesEnvoyes().map(m => m.texte); })(), ['Après les photos']);
    p.arreter();
    /* retentée à l'installation suivante : le service dit n'avoir que les 18 autres */
    const posees = Object.assign({}, toutes); delete posees.victor; delete posees.max; delete posees.lea;
    etat.avatars = posees; etat.installe = false; etat.avatarMode = 'normal';
    p = await neuf('p7g');
    v('⛔ à l\'installation SUIVANTE, les trois refusées sont retentées — elles seules', (await tourner(p)).map(cibleDe).sort(), ['lea', 'max', 'victor']);
    p.arreter();

    /* le service ne répond pas, refuse le secret, est occupé : on n'insiste pas photo après photo, et ce n'est pas une panne du pont */
    for (const mode of ['404', '429', '500', '409', 'panne', 'lent']) {
      etat.avatars = {}; etat.installe = false; etat.avatarMode = mode;
      const q = await neuf('p7h'); const n = (await tourner(q)).length;
      v('⛔ service des photos en « ' + mode + ' » : UN seul essai (pas vingt et un), aucune panne du pont, la file passe', await (async () => { horloge += 3600000; etat.avatarMode = 'normal'; etat.requetes.length = 0; parle('max', 'max', 'Sous ' + mode, { niveau: 'info' }); await q._envoyer(); await q._attendreFini(); return [n, q.sante().echecMin, messagesEnvoyes().map(m => m.texte)]; })(), [1, 0, ['Sous ' + mode]]);
      q.arreter();
    }
    etat.avatarMode = 'normal';

    /* fichiers absents, vides, trop gros : sautés, une seule ligne de journal, le reste part */
    const faux2 = dossierPont('icones-incompletes');
    fs.mkdirSync(path.join(faux2, 'agents'), { recursive: true }); fs.mkdirSync(path.join(faux2, 'groupes'), { recursive: true });
    for (const c of IDS) if (!['victor', 'equipe', 'nina', 'plateforme'].includes(c)) fs.copyFileSync(fichierDe(c), path.join(faux2, c === 'systeme' || CV.GROUPES.includes(c) ? 'groupes' : 'agents', c + (c === 'systeme' || CV.GROUPES.includes(c) ? '.png' : '.jpg')));
    fs.writeFileSync(path.join(faux2, 'agents', 'nina.jpg'), '');                                            // vide
    fs.writeFileSync(path.join(faux2, 'groupes', 'plateforme.png'), Buffer.alloc(2 * 1048576 + 1, 1));        // trop gros
    etat.avatars = {}; etat.installe = false;
    p = await neuf('p7i', { iconesDir: faux2 });
    recus = await tourner(p);
    v('⛔ un fichier absent (victor, equipe), vide (nina) ou trop gros (plateforme) est sauté : les dix-sept autres partent', [recus.length, recus.map(cibleDe).filter(c => ['victor', 'equipe', 'nina', 'plateforme'].includes(c))], [17, []]);
    v('…UNE seule ligne de journal pour les quatre, sans nom de fichier ni de chemin', [p.journaux.length, p.journaux.filter(m => /photos/.test(m)).length, p.journaux.filter(m => /(victor|equipe|nina|plateforme|\/|icons)/.test(m)).length], [1, 1, 0]);
    v('…et ce n\'est pas une panne', [p.sante().echecMin, p._etat().photosAbsentes], [0, 4]);
    p.arreter();
    etat.avatars = {}; etat.installe = false;
    p = await neuf('p7j', { iconesDir: path.join(banc, 'dossier-qui-n-existe-pas') });
    v('⛔ AUCUN fichier (le dossier n\'existe pas) : rien ne part, aucune exception, les messages et l\'installation fonctionnent', await (async () => { const n = (await tourner(p)).length; return [n, etat.requetes.filter(x => x.url === '/api/pont/installer').length, p.sante().echecMin]; })(), [0, 1, 0]);
    p.arreter();

    /* les photos ne retardent pas les messages : le service des photos ne répond JAMAIS (délai de 600 ms) */
    etat.avatars = {}; etat.installe = false; etat.avatarMode = 'lent';
    p = await neuf('p7k');
    parle('victor', 'victor', 'Pendant que les photos attendent', { niveau: 'info' });
    etat.requetes.length = 0;
    const t0 = Date.now(); await p._envoyer();
    v('⛔ `_envoyer` rend la main et les messages sont partis AVANT la fin des photos (tâche de fond : le service ne répond pas)', [Date.now() - t0 < 500, messagesEnvoyes().some(m => /Pendant que les photos attendent/.test(m.texte)), avatarsRecus().length], [true, true, 1]);
    await p._attendreFini();
    v('…la photo qui n\'a pas de réponse est comptée refusée, jamais en panne', [p._etat().photosRefusees, p.sante().echecMin], [1, 0]);
    p.arreter(); etat.avatarMode = 'normal';
  }

  /* (le bandeau de la Tour « Vos agents sont maintenant dans OP MESSAGES » est gardé par `test-3091`, avec la Tour unifiée : il ne part qu'avec elle) */
  faux.close();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }).finally(() => { if (process.exitCode) ko++; console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); });
