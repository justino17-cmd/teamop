/* ⛔ CE QUE CE FICHIER GARDE — LES RÉUNIONS CONTRE LE VRAI SERVEUR (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §7).
     Le vrai `server/index.js`, isolé sur 127.0.0.1, parlé en HTTP ; un FAUX Claude répond à api.anthropic.com et GARDE chaque requête ; et l'HORLOGE du serveur est avancée
     par un préchargement (`Date.now` décalé) pour tomber à l'heure de Paris voulue. `test-2884` éprouve les modules ; ici on garde ce que le SERVEUR en fait — le CÂBLAGE :
       · la minuterie du serveur déclenche la réunion SEULE : lundi 26 octobre 9 h 05 à Paris (08:05 UTC, heure d'hiver) → le tour de table se joue dans le fil « Réunions » ;
         lundi 26 octobre 8 h 30 à Paris (07:30 UTC) → RIEN (un décalage d'été la ferait partir) ;
       · un REDÉMARRAGE le même matin ne la rejoue pas (l'état est sur le disque) ;
       · le vendredi 30 octobre 18 h 05, le bilan se joue seul, sur les objectifs que le lundi a rangés ; leçons et bilans sont rangés ;
       · la mémoire (objectifs, leçons) entre dans le prompt qu'une réponse de la messagerie envoie à Claude — et en sort quand Justin retire la leçon ;
       · les routes : lecture (« en cours », « prochaine »), lancement à la main (une seule réunion à la fois), retrait d'une leçon ; refusées sans jeton et à un
         collaborateur ; chaque POST déclaré dans `MON_GESTES` ;
       · aucun détail du journal, aucune adresse ne part chez Claude. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2885-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); fin(); process.exit(1); }, 170000).unref();
const att = async (f, ms = 12000) => { const t = Date.now(); while (Date.now() - t < ms) { const r = await f(); if (r) return r; await dormir(80); } return false; };   // rend la valeur trouvée
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const U = (a, m, j, h, mi) => Date.UTC(a, m - 1, j, h, mi || 0);

console.log('\n── 2885 · les réunions contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl');
  /* Le faux Claude ET l'horloge. L'horloge : `BANC_DECALAGE_MS` s'ajoute à `Date.now` (les minuteries, elles, ne bougent pas : 5 s après le démarrage, la première vérification a lieu).
     Le faux Claude lit le nom de l'agent (« Tu es X, l'agent… »), reconnaît une prise de parole de RÉUNION à son message (« Le fil de la réunion jusqu'ici »), et joue :
       ouverture / conclusion / discussion (« RAS » pour Hugo) / tour de table — Léa appelle les outils (objectifs le lundi, bilan et leçon le vendredi), Camille cite Hugo. */
  fs.writeFileSync(PRE, `const dec = Number(process.env.BANC_DECALAGE_MS || 0); if (dec) { const reel = Date.now.bind(Date); Date.now = () => reel() + dec; }
  const vrai = globalThis.fetch; globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { const corps = String(opts && opts.body); require('fs').appendFileSync(${JSON.stringify(TRACE)}, corps + '\\n');
    const j = JSON.parse(corps); const dernier = String((j.messages[j.messages.length - 1] || {}).content || '');
    const nom = (/^Tu es (\\S+),/.exec(j.system) || [])[1] || '?'; const id = nom.normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
    const bloc = (content, stop) => new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: stop || 'end_turn', content: [{ type: 'thinking', thinking: 'je réfléchis…', signature: 'sig' }].concat(content), usage: { input_tokens: 50, output_tokens: 20 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    const texte = t => ({ type: 'text', text: t });
    const outil = (name, input) => ({ type: 'tool_use', id: 'toolu_' + name, name, input });
    const reunion = /Le fil de la réunion jusqu’ici/.test(dernier);
    await new Promise(r => setTimeout(r, reunion ? 120 : 5));
    if (reunion) {
      const lundi = /fixer_objectifs/.test(j.system);
      if (/Tu ouvres la réunion/.test(dernier)) return bloc([texte('Ouverture-2885 : voici les faits de la semaine.')]);
      if (/Clos la réunion/.test(dernier)) return bloc([texte('Compte rendu-2885 : décisions prises, chacun sait ce qu’il fait, rien n’attend Justin.')]);
      if (/On t’a cité/.test(dernier)) return bloc([texte(id === 'hugo' ? 'RAS' : 'Réponse de discussion de ' + nom + '.')]);
      if (id === 'lea' && lundi) return bloc([texte('Mes objectifs-2885 : répondre vite, et le dire.'), outil('fixer_objectifs', { objectifs: [{ texte: 'Répondre à chaque inscription sous 24 h', mesure: 'Zéro inscription sans réponse' }, { texte: 'Contacter les prospects à jean@client-secret.fr', mesure: 'Trois prospects contactés' }] })], 'tool_use');
      if (id === 'lea') { const o = (/^\\[(o[0-9a-f]{6})\\]/m.exec(j.system) || [])[1] || 'aucun';
        return bloc([texte('Mon bilan-2885 : objectif atteint.'), outil('juger_objectif', { objectif: o, statut: 'atteint', pourquoi: 'Toutes les inscriptions ont reçu une réponse.' }), outil('ajouter_lecon', { texte: 'LECON-2885 : répondre le jour même à chaque inscription.' })], 'tool_use'); }
      if (id === 'camille') return bloc([texte('Mon point-2885 : @hugo, as-tu des paiements en attente ?')]);
      return bloc([texte(nom + ' : mon point de la réunion.')]); }
    return bloc([texte('Réponse de ' + nom + '.')]); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-2885';
  /* Un serveur sur un DOSSIER DE DONNÉES donné (pour redémarrer sur le même disque), à l'instant `cible` (UTC) de l'horloge. */
  async function serveur(nom, cible, o) {
    o = o || {};
    const racine = path.join(banc, nom); const D = path.join(racine, 'data'); fs.mkdirSync(D, { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);   // les heures de travail ne regardent pas ce banc (`test-3021`)
    const neuf = !fs.existsSync(path.join(racine, 'config.json'));
    if (neuf) {
      fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
      const vap = webpush.generateVAPIDKeys();
      fs.writeFileSync(path.join(racine, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_2885' }, agents: { cleApi: 'sk-ant-' + 'api03-banc-2885-xxxxxxxxxxxxxxxx' } }));
      const modes = {}; for (const id of ['victor', 'ines', 'camille', 'hugo', 'margaux', 'lea', 'max', 'nina', 'theo', 'jules', 'chloe', 'emma', 'louis', 'sarah', 'lola', 'noah']) modes[id] = 'brouillon';
      fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes: o.modes || modes }));
      /* du travail dans le journal : une erreur de Margaux avec un détail et une adresse qui ne doivent JAMAIS partir chez Claude */
      const j = []; const t0 = cible - 3 * 86400000;
      j.push({ id: 'j1', ts: t0, agent: 'margaux', action: 'lire une facture', cible: 'c***@exemple.fr', resultat: 'erreur', detail: 'SECRET-DETAIL-2885' });
      for (let i = 0; i < 3; i++) j.push({ id: 'j2' + i, ts: t0 + i, agent: 'lea', action: 'relire un dossier', cible: 'DOS-000001', resultat: 'ok' });
      fs.writeFileSync(path.join(D, 'agents-journal.json'), JSON.stringify(j));
    }
    const PORT = await libre(); let journal = '';
    const env = Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(racine, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z',
      BANC_DECALAGE_MS: String(cible - Date.now()) });
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    vrai('le serveur « ' + nom + ' » démarre', vivant); if (!vivant) { console.log(journal.slice(0, 800)); process.exit(1); }
    let nreq = 0;
    const req = async (m, r, c, jt) => { const x = await fetch(B + r, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.8.' + (Math.floor(nreq++ / 50) + (o.ip || 0)) + '.1' }, jt ? { Authorization: 'Bearer ' + jt } : {}), body: m === 'POST' ? JSON.stringify(c || {}) : undefined }); let jj = null; try { jj = await x.json(); } catch (y) {} return { s: x.status, j: jj }; };
    const jeton = (await req('POST', '/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
    return { B, D, req, journal: () => journal, G: r => req('GET', r, null, jeton), P: (r, c) => req('POST', r, c, jeton), jeton,
      lire: f => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (x) { return null; } },
      arreter: async () => { e.kill('SIGKILL'); await dormir(300); } };
  }
  const recus = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  const parNom = b => (/^Tu es (\S+),/.exec(b.system) || [])[1];
  const enReunion = b => /Le fil de la réunion jusqu’ici/.test(String(b.messages[b.messages.length - 1].content));
  const reunions = async S => (await S.G('/api/monitor/agents/reunions')).j;

  console.log('\n1. ⛔ Lundi 26 octobre, 8 h 30 à Paris (07:30 UTC, heure d’HIVER) : la minuterie du serveur ne fait RIEN');
  {
    const S = await serveur('hiver-tot', U(2026, 10, 26, 7, 30));
    vrai('(câblage) le serveur dit que les réunions sont montées, et aucune erreur de montage', /agents : réunions montées/.test(S.journal()) && !/réunions des agents indisponibles/.test(S.journal()));
    await dormir(7500);   // la première vérification a lieu 5 s après le démarrage
    v('⛔ aucune réunion (un décalage d’été l’aurait lancée à 9 h 30, ici il est 8 h 30), aucun appel à Claude', [(await reunions(S)).reunions.length, recus().length, S.lire('agents-reunions.json')], [0, 0, null]);
    await S.arreter();
  }

  console.log('\n2. ⛔ Lundi 26 octobre, 9 h 05 à Paris (08:05 UTC) : la réunion des objectifs se tient SEULE');
  const A = await serveur('equipe', U(2026, 10, 26, 8, 5));
  {
    const n0 = recus().length;
    const vu = await att(async () => { const r = await reunions(A); return r.enCours && r.enCours.type; }, 14000);
    const g = vu ? (await reunions(A)) : null;
    vrai('(population) la minuterie a lancé la réunion sans aucun geste, et la lecture la voit « en cours »', vu === 'objectifs');
    v('⛔ « en cours » dit laquelle et jusqu’à quelle heure (10 h, heure de Paris)', g && [g.enCours.titre, g.enCours.jusqua, g.enCours.fin > U(2026, 10, 26, 8, 5)], ['Réunion du lundi', '10 h', true]);
    const fini = await att(async () => { const r = await reunions(A); return r.reunions[0] && r.reunions[0].statut === 'terminee'; }, 30000);
    vrai('(population) la réunion va au bout', fini);
    const ms = (await A.G('/api/monitor/conversations/reunions')).j.messages;
    const ag = ms.filter(m => m.de !== 'systeme');
    v('⛔ le fil « Réunions » : Victor ouvre, le tour de table, Camille cite Hugo (discussion), Inès, Victor conclut', [ag[0].de, ag[0].texte, ag[ag.length - 1].de, ag[ag.length - 1].texte.slice(0, 18), ag.filter(m => m.de === 'ines').length], ['victor', 'Ouverture-2885 : voici les faits de la semaine.', 'victor', 'Compte rendu-2885 ', 1]);
    vrai('…la ligne d’ouverture dit « jusqu’à 10 h » (l’heure de Paris, pas celle du serveur)', /^Réunion du lundi — objectifs de la semaine \(2026-W44\)\. 16 agents présents, jusqu’à 10 h\.$/.test(ms[0].texte));
    vrai('…Hugo, cité par Camille, a répondu « RAS » : cela n’a pas été publié, et il a parlé une fois (son tour)', ag.filter(m => m.de === 'hugo').length === 1 && !ag.some(m => /^RAS/.test(m.texte)));
    const ap = recus().slice(n0);
    const reu = ap.filter(enReunion);
    /* les objectifs DITS sans l'outil (examen du 26 octobre 2026 à 23 h 25) : un second appel par agent qui a parlé sans fixer_objectifs — ici les quatorze autres que Léa.
       Le faux Claude n'y répond que du texte (rien n'est enregistré : la suite du banc reste la même) ; test-3064 éprouve l'enregistrement. */
    const forces = ap.filter(b => /Tu viens de dire, à la réunion du lundi/.test(String((b.messages[0] || {}).content || '')));
    v('⛔ le nombre d’appels : 1 ouverture + 14 tours + Inès + 1 discussion (Hugo) + 1 conclusion, et 14 seconds appels « enregistre tes objectifs »', [reu.length, forces.length, ap.length], [18, 14, 32]);
    vrai('⛔ …chaque second appel IMPOSE fixer_objectifs (seul outil), sans réflexion — la forme que l’API accepte', forces.every(b => b.tool_choice && b.tool_choice.type === 'tool' && b.tool_choice.name === 'fixer_objectifs' && b.tools.length === 1 && b.thinking && b.thinking.type === 'disabled'), JSON.stringify(forces[0] && { tc: forces[0].tool_choice, th: forces[0].thinking }));
    vrai('…tous demandent la réflexion adaptative, 3000 jetons, JAMAIS temperature / top_p / top_k', reu.every(b => b.thinking && b.thinking.type === 'adaptive' && b.max_tokens === 3000 && !('temperature' in b) && !('top_p' in b) && !('top_k' in b)));
    vrai('…et les seuls outils de la réunion du lundi sont fixer_objectifs (les outils de la messagerie ne sont pas là)', reu.every(b => b.tools.length === 1 && b.tools[0].name === 'fixer_objectifs'));
    const faits = JSON.parse((/ta seule source de chiffres\) : (\{.*\})/.exec(reu[0].system) || [])[1] || 'null');
    v('⛔ les faits du journal du serveur (3 jours avant, dans la fenêtre du lundi 19 octobre 00 h Paris) : l’erreur de Margaux, les trois actions de Léa', [faits.semaine, faits.depuis, faits.parAgent.margaux.erreur, faits.parAgent.lea.ok, faits.total.actions], ['2026-W44', 'lundi 19 octobre, 0 h', 1, 3, 4]);
    vrai('⛔ aucun détail du journal, aucune adresse chez Claude', !reu.some(b => /SECRET-DETAIL-2885|exemple\.fr|client-secret|DOS-000001/.test(b.system + JSON.stringify(b.messages))));
    const o = (await reunions(A)).objectifs;
    v('⛔ les objectifs de Léa sont rangés (adresse masquée), à la semaine W44', [Object.keys(o), o.lea.map(x => x.texte)], [['lea'], ['Répondre à chaque inscription sous 24 h', 'Contacter les prospects à (adresse)']]);
    v('…la lecture : la prochaine réunion est le vendredi 30 octobre, 18 h ; la réunion tenue a son compte rendu', [(await reunions(A)).prochaine.libelle, (await reunions(A)).reunions[0].compteRendu.slice(0, 18), (await reunions(A)).enCours], ['vendredi 30 octobre, 18 h', 'Compte rendu-2885 ', null]);
    const sansJeton = [(await fetch(A.B + '/api/monitor/agents/reunions')).status, (await fetch(A.B + '/api/monitor/agents/reunions/lancer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"type":"bilan"}' })).status,
      (await fetch(A.B + '/api/monitor/agents/lecons/retirer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"agent":"lea","id":"cafe0001"}' })).status];
    v('(garde) sans jeton : la lecture, le lancement et le retrait sont refusés (403, patron strict — le compte rendu est du texte libre)', sansJeton, [403, 403, 403]);
    vrai('…et avec le jeton du patron la lecture passe', (await A.G('/api/monitor/agents/reunions')).s === 200);
  }

  console.log('\n3. ⛔ Un redémarrage le même matin ne la rejoue pas');
  {
    await A.arreter();
    const n0 = recus().length;
    const B = await serveur('equipe', U(2026, 10, 26, 8, 20), { ip: 20 });
    await dormir(7500);
    const r = await reunions(B);
    v('l’état est sur le disque : une seule réunion, terminée, aucun appel de plus', [r.reunions.length, r.reunions[0].statut, r.enCours, recus().length - n0], [1, 'terminee', null, 0]);
    Object.assign(A, B);
  }

  console.log('\n4. La mémoire entre dans la messagerie, et en sort quand Justin retire la leçon — plus tard, le bilan du vendredi');
  let leconId = null;
  {
    await A.arreter();
    const n0 = recus().length;
    const F = await serveur('equipe', U(2026, 10, 30, 17, 5), { ip: 40 });   // vendredi 18 h 05 à Paris (UTC+1)
    const vu = await att(async () => { const r = await reunions(F); return r.enCours && r.enCours.type; }, 14000);
    vrai('(population) vendredi 18 h 05 : le bilan est lancé SEUL par la minuterie', vu === 'bilan');
    const fini = await att(async () => { const r = await reunions(F); return r.reunions[0] && r.reunions[0].statut === 'terminee'; }, 30000);
    vrai('(population) le bilan va au bout', fini);
    const r = await reunions(F);
    v('deux réunions inscrites : le lundi (objectifs) et le vendredi (bilan), la même semaine', [r.reunions.map(x => x.type), r.reunions.map(x => x.semaine)], [['bilan', 'objectifs'], ['2026-W44', '2026-W44']]);
    v('⛔ le bilan de Léa est rangé SUR son objectif, avec la raison', r.objectifs.lea.map(x => x.bilan && [x.bilan.statut, x.bilan.pourquoi]), [['atteint', 'Toutes les inscriptions ont reçu une réponse.'], null]);
    v('⛔ la leçon est rangée (semaine W44), la plus récente d’abord', [r.lecons.lea.length, r.lecons.lea[0].texte, r.lecons.lea[0].semaine], [1, 'LECON-2885 : répondre le jour même à chaque inscription.', '2026-W44']);
    leconId = r.lecons.lea[0].id;
    const bil = recus().slice(n0).filter(enReunion);
    vrai('les outils du vendredi sont juger_objectif et ajouter_lecon, et Léa voit ses objectifs avec leur identifiant', bil.every(b => b.tools.map(t => t.name).join() === 'juger_objectif,ajouter_lecon') && /\n\[o[0-9a-f]{6}\] Répondre à chaque inscription/.test(bil.find(b => parNom(b) === 'Léa').system));
    /* la messagerie : Justin écrit à Léa, puis à Noah */
    const n1 = recus().length;
    await F.P('/api/monitor/conversations/envoyer', { fil: 'lea', texte: 'Léa, où en es-tu ? MEMOIRE-2885' });
    await att(() => recus().length >= n1 + 1);
    await F.P('/api/monitor/conversations/envoyer', { fil: 'noah', texte: 'Noah, un point ? MEMOIRE-2885' });
    await att(() => recus().length >= n1 + 2);
    const m = recus().slice(n1);
    const pl = m.find(b => parNom(b) === 'Léa'), pn = m.find(b => parNom(b) === 'Noah');
    vrai('⛔ la réponse de Léa porte sa mémoire (objectifs de la semaine + leçon) APRÈS les règles', pl && /Ta mémoire d’équipe/.test(pl.system) && /Tes objectifs de la semaine \(2026-W44\)/.test(pl.system) && /\[bilan : atteint\]/.test(pl.system) && /LECON-2885/.test(pl.system) && pl.system.indexOf('Ta mémoire') > pl.system.indexOf('Règles :'));
    vrai('…celle de Noah, qui n’en a pas, ne porte rien de tel', pn && !/Ta mémoire d’équipe/.test(pn.system));
    vrai('…la mémoire ne donne aucun outil de plus (les SIX outils fermés de la messagerie, rien d’autre — `demander` s’est ajouté le 28 octobre 2026 : Justin veut des agents qui se parlent ; `assigner` reste à Victor seul)', pl.tools.map(t => t.name).join() === 'ecrire,prendre,passer,terminer,demander_justin,demander');
    /* retirer la leçon */
    const rt = await F.P('/api/monitor/agents/lecons/retirer', { agent: 'lea', id: leconId });
    v('⛔ « Retirer » une leçon : 200, elle disparaît de la lecture', [rt.s, Object.keys((await reunions(F)).lecons)], [200, []]);
    const n2 = recus().length;
    await F.P('/api/monitor/conversations/envoyer', { fil: 'lea', texte: 'Léa, et maintenant ? MEMOIRE-2885-BIS' });
    await att(() => recus().length >= n2 + 1);
    const apres = recus().slice(n2).find(b => parNom(b) === 'Léa');
    vrai('…et la réponse suivante de Léa ne la lit plus (ses objectifs, eux, restent)', apres && !/LECON-2885/.test(apres.system) && /Tes objectifs de la semaine/.test(apres.system));
    v('une leçon déjà retirée : 404', (await F.P('/api/monitor/agents/lecons/retirer', { agent: 'lea', id: leconId })).s, 404);
    Object.assign(A, F);
  }

  console.log('\n5. Lancer à la main : une seule réunion à la fois, gardée, déclarée');
  {
    const S = A;
    const n0 = recus().length;
    const [r1, r2] = await Promise.all([S.P('/api/monitor/agents/reunions/lancer', { type: 'objectifs' }), (async () => { await dormir(100); return S.P('/api/monitor/agents/reunions/lancer', { type: 'bilan' }); })()]);
    v('⛔ Justin lance une réunion : 200 ; une seconde pendant la première : 409, message clair', [r1.s, r1.j.ok, r2.s, r2.j.error], [200, true, 409, 'Une réunion est déjà en cours']);
    const fini = await att(async () => { const r = await reunions(S); return !r.enCours; }, 40000);
    vrai('(population) la réunion lancée à la main va au bout', fini);
    const r = await reunions(S);
    vrai('…elle est inscrite « manuelle » : le vendredi soir 18 h 05 a déjà eu son bilan, la clé n’est donc pas celle du jour', r.reunions[0].manuelle === true && r.reunions.length === 3 && r.reunions[0].type === 'objectifs');
    v('type inconnu : 400', (await S.P('/api/monitor/agents/reunions/lancer', { type: 'mardi' })).s, 400);
    /* ⛔ le patron lit AVANT qu'un compte de la Tour existe : la session par mot de passe d'administration ne survit pas à la création d'un compte (banc seulement). */
    const lectP = (await reunions(S));
    const jPat = (await S.G('/api/monitor/agents/journal?limite=500')).j.journal;
    /* un collaborateur */
    await S.P('/api/monitor/users', { nom: 'Collab', pass: 'un-mot-de-passe-2885' });
    const lj = await (await fetch(S.B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.9.0.1' }, body: JSON.stringify({ nom: 'Collab', pass: 'un-mot-de-passe-2885' }) })).json();
    const colla = async (m, r, c) => (await fetch(S.B + r, { method: m, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + lj.token }, body: m === 'POST' ? JSON.stringify(c || {}) : undefined })).status;
    v('⛔ un collaborateur (non patron) ne lance pas de réunion et ne retire pas de leçon : 403', [await colla('POST', '/api/monitor/agents/reunions/lancer', { type: 'bilan' }), await colla('POST', '/api/monitor/agents/lecons/retirer', { agent: 'lea', id: 'cafe0001' })], [403, 403]);
    /* ⛔ ET IL NE LIT NI LES RÉUNIONS NI LA PHRASE DES LEÇONS (relecture C1-C3) : compte rendu, objectifs, bilans et leçons sont du texte libre ; le journal garde la ligne, pas la phrase. */
    vrai('(population) le patron lit un compte rendu, des objectifs et des leçons — sinon « le collaborateur ne voit rien » passerait sur du vide', lectP.reunions.some(x => x.compteRendu) && Object.keys(lectP.objectifs).length > 0);
    v('⛔ un collaborateur (non patron) ne lit pas les réunions : 403', await colla('GET', '/api/monitor/agents/reunions'), 403);
    const jCol = await (await fetch(S.B + '/api/monitor/agents/journal?limite=500', { headers: { Authorization: 'Bearer ' + lj.token } })).json();
    const lecons = jPat.filter(e => e.action === 'réunion : leçon' && e.resultat === 'ok');
    vrai('(population) le patron lit la leçon dans le journal, avec sa phrase', lecons.length >= 1 && lecons.every(e => /LECON-2885/.test(e.detail)));
    v('⛔ le collaborateur lit le journal sans la phrase de la leçon (la ligne est là, le détail est réservé)', [JSON.stringify(jCol).includes('LECON-2885'), jCol.journal.filter(e => e.action === 'réunion : leçon').length, jCol.journal.filter(e => e.action.startsWith('réunion : ')).every(e => e.detail === undefined && e.detailReserve === true)], [false, jPat.filter(e => e.action === 'réunion : leçon').length, true]);
    const SRC = fs.readFileSync(SERVEUR, 'utf8');
    const i = SRC.indexOf('const MON_GESTES = {'), j = SRC.indexOf('\n};', i);
    const GESTES = SRC.slice(i, j);
    const REU = fs.readFileSync(path.join(RACINE, 'server', 'reunions.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const posts = [...REU.matchAll(/app\.post\('\/api\/monitor\/([^']+)', (\w+)/g)], gets = [...REU.matchAll(/app\.get\('\/api\/monitor\/([^']+)', (\w+)/g)];
    vrai('(population) les réunions déclarent trois routes POST (lancer, annuler — 28 octobre 2026 —, retirer une leçon) et une lecture', posts.length === 3 && gets.length === 1);
    vrai('⛔ chaque POST est dans MON_GESTES et exige le patron strict ; la lecture aussi', posts.every(m => new RegExp("'" + m[1].replace(/\//g, '\\/') + "':").test(GESTES) && m[2] === 'monPatronStrict') && gets.every(m => m[2] === 'monPatronStrict'));
    vrai('…et le déclenchement est dans index.js : une minuterie d’une minute, une première vérification, sans que `reunions.js` n’arme rien', /setTimeout\(ticReunions, 5000\)/.test(SRC.replace(/\/\*[\s\S]*?\*\//g, ' ')) && /setInterval\(ticReunions, 60000\)/.test(SRC.replace(/\/\*[\s\S]*?\*\//g, ' ')) && !/setInterval|setTimeout/.test(REU));
    vrai('aucun détail du journal, aucune adresse dans toute la sortie du serveur', !/SECRET-DETAIL-2885|client-secret/.test(S.journal()));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(1); });
