/* ⛔ CE QUE CE FICHIER GARDE — LA MESSAGERIE DE LA TOUR CONTRE LE VRAI SERVEUR (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §6 et §11).
   Les vraies fonctions de `tour.html` (envoi optimiste, lectures, mentions, morceaux d'écran) parlent au vrai `server/index.js`, isolé sur 127.0.0.1, avec un
   FAUX Claude à la place d'Anthropic (même méthode que `test-2881`). Seul l'écran (le DOM) est un bouchon : on lit ce que l'écran DIRAIT, pas des
   pixels (les pixels, c'est `scratchpad/sonde-tour-messagerie.js`). Ce qu'aucune moitié ne voit seule :
     · une QUESTION posée à Margaux reçoit la réponse de MARGAUX — l'écran montre sa bulle, aucune tâche n'apparaît dans « Qui fait quoi », aucune ligne
       de délégation, rien chez Victor ;
     · « @Camille @Léa vous faites ça » : les mentions sont reconnues par le SERVEUR, la page les colore, et quand les deux agents prennent le travail
       (le faux Claude rend l'outil `prendre`), DEUX tâches paraissent dans « Qui fait quoi » — demandées par toi, en cours ;
     · une tâche passée à un collègue libre se lit « déléguée » (le champ `passePar` de la route), un passage refusé ne change rien à l'écran ;
     · la reconnaissance des mentions de la PAGE est la même que celle du SERVEUR, mesurée sur la vraie route d'envoi ;
     · la lecture incrémentale ne double rien ; un identifiant inconnu rend le fil entier et la page le remplace ;
     · « lu » : après affichage, la pastille tombe (vrai serveur) ; « X écrit… » est lu tel que le serveur le dit ;
     · ⛔ les REFUS se disent : fil inconnu (400), jeton refusé (401), serveur coupé, registre illisible (503 → « −1 », jamais « Aucun message »). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || path.join(RACINE, 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2883-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); fin(); process.exit(1); }, 170000).unref();
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(60); } return false; };
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

/* le corps d'une déclaration (chaînes, commentaires en ligne et expressions régulières traversés) */
function corps(entete) {
  const i = CODE.indexOf(entete); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, prev = '';
  for (; k < CODE.length; k++) {
    const c = CODE[k], n = CODE[k + 1];
    if (c === '/' && n === '/') { k = CODE.indexOf('\n', k) - 1; continue; }
    if (c === '/' && n === '*') { k = CODE.indexOf('*/', k + 2) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; for (k++; k < CODE.length; k++) { if (CODE[k] === '\\') { k++; continue; } if (CODE[k] === q) break; } prev = 'x'; continue; }
    if (c === '/' && /[(,=:\[!&|?{};]/.test(prev)) { let cl = false; for (k++; k < CODE.length; k++) { const d = CODE[k]; if (d === '\\') { k++; continue; } if (d === '[') cl = true; else if (d === ']') cl = false; else if (d === '/' && !cl) break; } prev = 'x'; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return CODE.slice(i, k + 1); }
    if (!/\s/.test(c)) prev = c;
  }
  return '';
}
const fonction = nom => corps('\nfunction ' + nom + '(').trim();
const ligne = deb => { const i = CODE.indexOf(deb); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const NOMS = ['msNorm', 'msMentions', 'msIds', 'msColorer', 'msAgentsParId', 'msEtat', 'msEstGroupe', 'msGroupePerso', 'msIconeHtml', 'msNomFil', 'msBulleHtml', 'msEnvoiHtml', 'msEcritTexte', 'msEcritHtml', 'msFluxHtml', 'msListeHtml', 'msLigneFil', 'msHeureCourte', 'msJourLib',
  'msTacheTxt', 'msTachesHtml', 'msSousTitre', 'msAjouterServeur', 'msEnvoyer', 'msEnvoiFaire', 'msReessayer', 'msRetirer', 'messListeCharger', 'messAgentsCharger', 'messTachesCharger', 'messToutCharger', 'messFilCharger', 'messLire', 'messFilTot',
  'fmtHeure', 'agParams', 'apiGet', 'apiPost', 'acSquel', 'agAvatar'];
const FN = NOMS.map(fonction);
const VARS = [ligne('var MS_GROUPES_LIB='), ligne('var MS_COULEURS='), ligne('var MS_ETAT_LIB='), ligne('var AG_PHOTOS='), corps('var AG_TYPES=') + ';', corps('var MS={') + ';'].join('\n');
vrai('(population) les fonctions de la messagerie sont trouvées dans le fichier livré', ESC && FN.every(f => f.length > 30) && VARS.length > 200, NOMS.filter((n, i) => FN[i].length <= 30).join(', '));
const { analyserMentions } = require(path.join(RACINE, 'server', 'conversations.js'));

console.log('\n── 2883 · la messagerie de la Tour contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl');
  /* Le faux Claude : mots-clés dans le DERNIER message — TRAVAIL (texte + outil prendre), PASSER vers=<id> (outil passer sur sa première tâche), LENT (1,5 s). */
  fs.writeFileSync(PRE, `const vrai = globalThis.fetch; globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { const corps = String(opts && opts.body); require('fs').appendFileSync(${JSON.stringify(TRACE)}, corps + '\\n');
    const j = JSON.parse(corps); const tous = String((j.messages[j.messages.length - 1] || {}).content || ''); const dernier = tous.split('\\n').reverse().find(l => /-2883/.test(l)) || '';
    const nom = (/^Tu es (\\S+),/.exec(j.system) || [])[1] || '?';
    const premiereTache = (/^- \\[([0-9a-f]{12})\\]/m.exec(j.system) || [])[1] || 'aucune';
    const bloc = (content, stop) => new Response(JSON.stringify({ id: 'msg_banc', type: 'message', role: 'assistant', model: 'claude-sonnet-5', stop_reason: stop || 'end_turn', content: [{ type: 'thinking', thinking: 'je réfléchis…', signature: 'sig' }].concat(content), usage: { input_tokens: 500, output_tokens: 80 } }), { status: 200, headers: { 'content-type': 'application/json' } });
    const texte = t => ({ type: 'text', text: t });
    const outil = (name, input) => ({ type: 'tool_use', id: 'toolu_' + name, name, input });
    if (/LENT-2883/.test(dernier)) await new Promise(r => setTimeout(r, 1500));
    if (/PASSER-2883/.test(dernier)) { const vers = (/vers=([a-z]+)/.exec(dernier) || [])[1] || 'lea'; return bloc([texte('Je passe ça à ' + vers + '.'), outil('passer', { vers, tache: premiereTache, raison: 'je suis sur autre chose' })], 'tool_use'); }
    if (/TRAVAIL-2883/.test(dernier)) return bloc([texte('Oui, je m’en occupe.'), outil('prendre', { texte: 'Travail demandé : ' + (/TRAVAIL-2883[^.?]*/.exec(dernier) || [''])[0].slice(0, 80) })], 'tool_use');
    return bloc([texte('Réponse de ' + nom + '.')]); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-2883';
  async function serveur(nom, o) {
    o = o || {};
    const D = path.join(banc, nom, 'data'); fs.mkdirSync(D, { recursive: true }); require('./banc-horaires.js').toujoursOuvert(D);   // les heures de travail ne regardent pas ce banc (`test-3021`)
    fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
    if (o.illisible) fs.writeFileSync(path.join(D, 'agents-messages.json'), '{ tronqué');
    const vap = webpush.generateVAPIDKeys(); const conf = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_2883' } };
    conf.agents = { cleApi: 'sk-ant-' + 'api03-banc-2883-xxxxxxxxxxxxxxxx', reunionsAuto: false };   // pas de réunion due pendant le banc (vendredi 18 h-23 h, lundi matin, heure de Paris)
    fs.writeFileSync(path.join(banc, nom, 'config.json'), JSON.stringify(conf));
    const PORT = await libre(); let journal = '';
    const env = Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, nom, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' });
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    vrai('le serveur « ' + nom + ' » démarre', vivant, journal.slice(0, 600)); if (!vivant) process.exit(1);
    const r = await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.7.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) });
    return { B, D, jeton: (await r.json()).token, journal: () => journal };
  }
  const recus = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  const parNom = b => (/^Tu es (\S+),/.exec(b.system) || [])[1];

  /* la Tour, face à UN serveur : les vraies fonctions, un faux DOM */
  function tour(S, o) {
    o = o || {}; let n = 0;
    const ctx = { fetch: (u, opt) => fetch(u, opt), API: S.B, Object, String, JSON, Promise, Math, Number, Array, Date, Error, Response, TypeError, console, setTimeout, clearTimeout,
      TAB: 'accueil', MYROLE: o.role || 'patron', MYAPPS: ['gestion'], document: { visibilityState: 'visible' }, $: () => null, setBdg: (id, k) => { ctx.__bdg = k; }, doLogout: () => {},
      messPeindreFil: () => {}, messPeindreListe: () => {}, messPeindreEntete: () => {}, messPeindreTaches: () => {}, messPeindreSaisie: () => {}, messPeindrePanneau: () => {} };
    /* une adresse relayée neuve toutes les 40 requêtes : le budget par minute et par IP du serveur n'est pas ce qu'on éprouve ici */
    ctx.hAuth = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + (o.jeton || S.jeton), 'X-Forwarded-For': '10.6.' + Math.floor(n++ / 40) + '.1' });
    ctx.srvRepond = r => r; ctx.srvMuet = e => { throw e; };
    vm.createContext(ctx);
    vm.runInContext(ESC + '\n' + VARS + '\n' + FN.join('\n') + '\n' + NOMS.concat(['MS']).map(x => 'this.' + x + '=' + x + ';').join(''), ctx);
    return ctx;
  }
  const texte = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const mode = async (S, id, m) => { await fetch(S.B + '/api/monitor/agents/mode', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.jeton, 'X-Forwarded-For': '10.5.0.' + Math.floor(Math.random() * 250) }, body: JSON.stringify({ agent: id, mode: m }) }); };

  const S = await serveur('principal');
  const T = tour(S);
  const REG = (await (await fetch(S.B + '/api/monitor/agents', { headers: { Authorization: 'Bearer ' + S.jeton } })).json()).agents.map(a => a.id);
  v('(population) seize agents au registre', REG.length, 16);

  console.log('\n1. L\'écran lit le serveur : liste, agents, tâches — trois états');
  {
    T.TAB = 'messagerie';
    await T.messToutCharger();
    v('la liste du vrai serveur : 4 groupes puis 16 fils privés, lue (état 1), aucun non-lu', [T.MS.lec, T.MS.fils.length, T.MS.fils.slice(0, 4).map(f => f.fil), T.MS.nonLus], [1, 20, ['equipe', 'clients', 'plateforme', 'reunions'], 0]);
    v('les agents : seize, leur état lu (tous à l\'arrêt au départ), les tâches lues et vides', [T.MS.agLec, T.MS.agents.length, T.MS.agents.every(a => T.msEtat(a) === 'arret'), T.MS.tachesLec, T.MS.taches.length], [1, 16, true, 1, 0]);
    const L = T.msListeHtml();
    vrai('l\'écran de gauche : « Équipe TeamOP » puis les seize privés avec leur état « À l\'arrêt »', /<b>Équipe TeamOP<\/b>/.test(L) && (L.match(/aria-label="À l’arrêt"/g) || []).length === 16, L.slice(0, 200));
  }

  console.log('\n2. ⛔ Les mentions : la page reconnaît ce que le SERVEUR reconnaît (vraie route d\'envoi, agents à l\'arrêt : personne n\'est réveillé)');
  {
    /* tous les agents sont à l'arrêt : le serveur lit, range, rend `mentions` — et ne réveille personne */
    const TEXTES = ['@Camille', '@camille', '@CAMILLE', '@Léa', '@lea', '@Lea,', '(@Camille)', 'salut@camille.fr', 'jean@camille.fr @hugo', '@@camille', 'a @tous', '@équipe', '@Tous!', '@Inconnu', 'x@', '@Camille@Hugo', '😀@Camille',
      '@Camille\n@Hugo', '@hugo @camille', 'email: a.b@c.fr', '@Chloé @chloe', '@Théo @theo', 'Bonjour @tous, @Camille vous faites ça ?', 'rien du tout'];
    const ecarts = [];
    for (const fil of ['equipe', 'clients', 'camille']) {
      T.MS.fil = fil; T.MS.msgLec = 0; await T.messFilCharger(false);
      const membres = T.MS.membres;
      for (const t of TEXTES) {
        const e = await T.msEnvoyer(fil, t);
        const serveur = e && e.d && e.d.mentions, page = T.msIds(t, membres);
        if (JSON.stringify(serveur) !== JSON.stringify(page) || JSON.stringify(serveur) !== JSON.stringify(analyserMentions(t, membres))) ecarts.push([fil, t, serveur, page]);
      }
    }
    v('⛔ pour ' + TEXTES.length + ' textes dans 3 fils : mentions du SERVEUR = mentions de la PAGE = règle exportée du serveur', ecarts, []);
    v('(population) des mentions reconnues ET des refus ont été jouées', [T.msIds('@Camille @Hugo', T.MS.membres).length > 0, TEXTES.some(t => !T.msIds(t, T.MS.membres).length)], [true, true]);
    v('(population) aucun appel à Claude : les agents sont à l\'arrêt', recus().length, 0);
    T.MS.fil = 'equipe'; T.MS.msgLec = 0; await T.messFilCharger(false);
    const dernier = T.MS.msgs.filter(m => m.de === 'justin').pop();
    vrai('…et la bulle colorée n\'accepte que ce que le serveur a rangé dans `mentions`', dernier && T.msBulleHtml(dernier, T.MS.membres, T.msAgentsParId()).includes('mark') === (dernier.mentions.length > 0));
  }

  console.log('\n3. ⛔ Une QUESTION posée à Margaux : la réponse vient de Margaux — rien n\'est délégué');
  {
    for (const id of REG) await mode(S, id, 'brouillon');
    await T.messToutCharger();
    v('(population) les agents sont allumés (brouillon)', T.MS.agents.every(a => T.msEtat(a) === 'brouillon'), true);
    const n0 = recus().length;
    T.MS.fil = 'margaux'; T.MS.msgLec = 0; T.MS.msgs = []; await T.messFilCharger(false);
    await T.msEnvoyer('margaux', 'Margaux, sur la compta, tu en es où ? QUESTION-2883');
    await att(async () => { await T.messFilCharger(true); return T.MS.msgs.some(m => m.de === 'margaux'); });
    await dormir(300); await T.messFilCharger(true); await T.messTachesCharger();
    const mm = T.MS.msgs;
    v('le fil de Margaux : ma question, puis SA réponse — dans cet ordre, signée Margaux', mm.map(m => [m.de, m.nom, m.texte.slice(0, 22)]), [['justin', 'Toi', 'Margaux, sur la compta'], ['margaux', 'Margaux', 'Réponse de Margaux.']]);
    const flux = T.msFluxHtml(mm, T.MS.membres, T.msAgentsParId());
    vrai('l\'écran : sa bulle porte son nom et son rôle (« Facturation et compta »), la mienne est « moi »', /<b>Margaux<\/b>/.test(flux) && /Facturation et compta/.test(flux) && /class="ms-b moi"/.test(flux) && /Réponse de Margaux\./.test(flux), texte(flux));
    v('⛔ UN seul appel à Claude, celui de Margaux', recus().slice(n0).map(parNom), ['Margaux']);
    v('⛔ « Qui fait quoi » : aucune tâche — l\'écran le dit', [T.MS.tachesLec, T.MS.taches.length, /Aucune tâche ouverte/.test(T.msTachesHtml())], [1, 0, true]);
    vrai('⛔ aucune ligne du système (« a passé », « a confié », « a pris ») dans son fil', !mm.some(m => m.systeme));
    T.MS.fil = 'victor'; T.MS.msgLec = 0; await T.messFilCharger(false);
    v('⛔ et rien chez Victor : son fil est lu et vide (état « 1 », zéro message)', [T.MS.msgLec, T.MS.msgs.length], [1, 0]);
  }

  console.log('\n4. « lu » : la pastille tombe quand le fil est affiché (vrai serveur) ; « X écrit… » tel que le serveur le dit');
  {
    await T.messListeCharger();
    const f = T.MS.fils.find(x => x.fil === 'margaux');
    v('avant d\'ouvrir : le fil de Margaux compte 1 non lu, la pastille du menu aussi', [f.nonLus, T.MS.nonLus, T.__bdg], [1, 1, 1]);
    T.TAB = 'messagerie'; T.MS.inst = { zone: {} }; T.MS.vueMob = 'fil'; T.MS.fil = 'margaux'; T.MS.msgLec = 0; T.MS.msgs = [];
    await T.messFilCharger(false);
    await att(async () => { await T.messListeCharger(); return T.MS.nonLus === 0; }, 3000);
    v('⛔ fil affiché, page visible : lu — la pastille du menu tombe à 0 (le vrai serveur l\'a écrit)', [T.MS.nonLus, T.__bdg, T.MS.msgs.every(m => m.lu === true)], [0, 0, true]);
    /* « écrit… » : un agent lent */
    T.MS.fil = 'hugo'; T.MS.msgLec = 0; T.MS.msgs = []; await T.messFilCharger(false);
    await T.msEnvoyer('hugo', 'Hugo, tu peux regarder ça ? LENT-2883');
    let ecr = null; await att(async () => { await T.messFilCharger(true); ecr = T.MS.ecrit.map(x => x.nom); return ecr.length; }, 3000);
    v('⛔ pendant que Hugo réfléchit, la page lit « Hugo écrit… » (état du serveur, jamais inventé)', [ecr, T.msEcritTexte(T.MS.ecrit)], [['Hugo'], 'Hugo écrit…']);
    await att(async () => { await T.messFilCharger(true); return T.MS.msgs.some(m => m.de === 'hugo'); }, 6000);
    await T.messFilCharger(true);
    v('…puis sa réponse arrive et « écrit… » disparaît', [T.MS.msgs.filter(m => m.de === 'hugo').length, T.MS.ecrit.length], [1, 0]);
    T.MS.inst = null; T.TAB = 'accueil';
  }

  console.log('\n5. ⛔ « @Camille @Léa vous faites ça » : mentions colorées, puis DEUX tâches dans « Qui fait quoi »');
  {
    T.MS.fil = 'clients'; T.MS.msgLec = 0; T.MS.msgs = []; await T.messFilCharger(false);
    const n0 = recus().length;
    const e = await T.msEnvoyer('clients', '@Camille @Léa vous faites ça aujourd’hui ? TRAVAIL-2883 relire le courrier');
    v('le serveur reconnaît les deux mentions', e.d.mentions, ['camille', 'lea']);
    const moi = T.MS.msgs.filter(m => m.de === 'justin' && /TRAVAIL-2883/.test(m.texte)).pop();
    const h = T.msBulleHtml(moi, T.MS.membres, T.msAgentsParId());
    v('⛔ la bulle colore « @Camille » et « @Léa » (et rien d\'autre)', (h.match(/<mark class="ms-m">[^<]+<\/mark>/g) || []), ['<mark class="ms-m">@Camille</mark>', '<mark class="ms-m">@Léa</mark>']);
    await att(async () => { await T.messFilCharger(true); return T.MS.msgs.filter(m => ['camille', 'lea'].includes(m.de) && /m’en occupe/.test(m.texte)).length >= 2 && T.MS.msgs.filter(m => m.systeme && /a pris/.test(m.texte)).length >= 2; });
    await dormir(300); await T.messFilCharger(true); await T.messTachesCharger();
    v('⛔ les deux agents citées sont réveillés (pas seulement le meneur), une fois chacun', recus().slice(n0).map(parNom).sort(), ['Camille', 'Léa']);
    const ouv = T.MS.taches.filter(k => k.statut === 'prise');
    v('⛔ DEUX tâches ouvertes, demandées par Justin, une par agent', ouv.map(k => [k.vers, k.de, k.type]).sort(), [['camille', 'justin', 'consigne'], ['lea', 'justin', 'consigne']]);
    const Q = texte(T.msTachesHtml());
    vrai('l\'écran « Qui fait quoi » : « Camille en cours », « Léa en cours », « demandée par toi », la phrase de la tâche — rien de déléguée', /Camille en cours/.test(Q) && /Léa en cours/.test(Q) && (Q.match(/demandée par toi/g) || []).length === 2 && /Travail demandé : TRAVAIL-2883 relire le courrier/.test(Q) && !/déléguée/.test(Q), Q);
    vrai('…et le fil montre les deux lignes du système (« Camille a pris… », « Léa a pris… »), centrées', (T.msFluxHtml(T.MS.msgs.filter(m => /a pris/.test(m.texte)), T.MS.membres, T.msAgentsParId()).match(/class="ms-sys" data-id="[0-9a-f]+">(Camille|Léa) a pris/g) || []).length === 2);
  }

  console.log('\n6. Passer le travail : un collègue libre (« déléguée »), un collègue occupé (rien ne bouge)');
  {
    T.MS.fil = 'camille'; T.MS.msgLec = 0; T.MS.msgs = []; await T.messFilCharger(false);
    await T.msEnvoyer('camille', 'Camille, et ça aussi : TRAVAIL-2883 relancer les devis');
    await att(async () => { await T.messTachesCharger(); return T.MS.taches.filter(k => k.vers === 'camille' && k.statut === 'prise').length === 2; });
    const n0 = recus().length;
    await T.msEnvoyer('camille', 'PASSER-2883 vers=lea');
    await att(() => recus().length > n0); await dormir(400); await T.messTachesCharger();
    vrai('⛔ vers Léa (occupée) : refusé — les deux tâches de Camille sont toujours à Camille, aucune « déléguée » à l\'écran', T.MS.taches.filter(k => k.statut === 'prise' && k.vers === 'camille').length === 2 && !/déléguée/.test(texte(T.msTachesHtml())), texte(T.msTachesHtml()));
    const n1 = recus().length;
    await T.msEnvoyer('camille', 'PASSER-2883 vers=theo');
    await att(() => recus().length > n1); await dormir(400); await T.messTachesCharger();
    const k = T.MS.taches.find(x => x.vers === 'theo');
    v('⛔ vers Théo (libre) : la tâche est à Théo, demandée par Justin, `passePar` = [camille] (le champ de la route)', k && [k.de, k.statut, k.passePar], ['justin', 'prise', ['camille']]);
    const Q = texte(T.msTachesHtml());
    vrai('l\'écran : « Théo en cours », « demandée par toi · déléguée, d\'abord à Camille »', /Théo en cours/.test(Q) && /demandée par toi · déléguée, d’abord à Camille/.test(Q), Q);
  }

  console.log('\n7. La lecture incrémentale : rien n\'est doublé ; un identifiant inconnu rend le fil entier');
  {
    T.MS.fil = 'clients'; T.MS.msgLec = 0; T.MS.msgs = []; await T.messFilCharger(false);
    const avant = T.MS.msgs.length, dernierId = T.MS.dernier;
    await T.messFilCharger(true);
    v('relire après le dernier message, sans rien de neuf : rien ne s\'ajoute', [T.MS.msgs.length, T.MS.dernier], [avant, dernierId]);
    await T.msEnvoyer('clients', 'Un message de plus pour le groupe.');
    await att(async () => { await T.messFilCharger(true); return T.MS.msgs.some(m => m.de === 'victor'); });
    await T.messFilCharger(true);
    const ids = T.MS.msgs.map(m => m.id);
    v('après un envoi puis des lectures : mon message, la réponse de Victor (meneur des groupes depuis le 28 octobre 2026, personne n\'est cité) et sa ligne « Victor a pris… » (le faux Claude joue le mot-clé resté dans le fil) — trois de plus, identifiants tous différents', [T.MS.msgs.length, new Set(ids).size === ids.length], [avant + 3, true]);
    T.MS.dernier = 'identifiant-disparu';
    const peint = [];
    T.messPeindreFil = c => peint.push(c);
    await T.messFilCharger(true);
    const ids2 = T.MS.msgs.map(m => m.id);
    v('⛔ identifiant introuvable : le serveur rend le fil ENTIER, la page le remplace (aucun doublon) et le repeint en entier', [T.MS.msgs.length, new Set(ids2).size === ids2.length, peint.pop()], [avant + 3, true, true]);
  }

  console.log('\n8. ⛔ Les refus se DISENT : fil inconnu, jeton refusé, serveur coupé, collaborateur');
  {
    T.MS.fil = 'clients'; T.MS.msgLec = 1;
    await T.msEnvoyer('inexistant', 'x');
    let e = T.MS.envois.find(y => y.fil === 'inexistant');
    v('fil inconnu (400) : « echec », raison du serveur', [e.etat, e.raison], ['echec', 'Fil inconnu']);
    vrai('…l\'écran : « Non envoyé — réessayer » + « Fil inconnu »', /Non envoyé — <button/.test(T.msEnvoiHtml(e, [])) && /Fil inconnu/.test(T.msEnvoiHtml(e, [])));
    const T2 = tour(S, { jeton: 'jeton-refuse' }); T2.MS.fil = 'clients'; T2.MS.msgLec = 1;
    await T2.msEnvoyer('clients', 'x');
    v('⛔ jeton refusé (401) : le message RESTE, en échec, avec la raison du serveur', [T2.MS.envois[0].etat, !!T2.MS.envois[0].raison], ['echec', true]);
    const T3 = tour(Object.assign({}, S, { B: 'http://127.0.0.1:1' })); T3.MS.fil = 'clients'; T3.MS.msgLec = 1;
    await T3.msEnvoyer('clients', 'x');
    v('⛔ serveur coupé : « Serveur injoignable »', [T3.MS.envois[0].etat, T3.MS.envois[0].raison], ['echec', 'Serveur injoignable']);
    const T4 = tour(S, { role: 'collaborateur' }); T4.MS.fil = 'clients'; T4.MS.msgLec = 1; const nb = (await (await fetch(S.B + '/api/monitor/conversations/clients', { headers: { Authorization: 'Bearer ' + S.jeton } })).json()).messages.length;
    await T4.msEnvoyer('clients', 'x');
    v('⛔ un non-patron n\'envoie rien : le serveur n\'a reçu aucun message de plus', [T4.MS.envois.length, (await (await fetch(S.B + '/api/monitor/conversations/clients', { headers: { Authorization: 'Bearer ' + S.jeton } })).json()).messages.length], [0, nb]);
    const T5 = tour(S, { jeton: 'jeton-refuse' }); await T5.messListeCharger();
    v('une liste refusée (401) : « −1 » — jamais « aucun fil »', [T5.MS.lec, T5.MS.fils.length], [-1, 0]);
  }

  console.log('\n9. ⛔ Un registre illisible (503) : « on n\'a pas pu savoir », jamais « Aucun message »');
  {
    const I = await serveur('illisible', { illisible: true });
    const Ti = tour(I);
    await Ti.messListeCharger(); Ti.MS.fil = 'equipe'; await Ti.messFilCharger(false);
    v('la liste et le fil illisibles : « −1 » partout, rien de vide', [Ti.MS.lec, Ti.MS.fils.length, Ti.MS.msgLec, Ti.MS.msgs.length], [-1, 0, -1, 0]);
    Ti.MS.msgLec = 1;
    await Ti.msEnvoyer('equipe', 'Bonjour');
    v('envoyer : refusé (503), dit avec la raison, le message reste en attente de réessai', [Ti.MS.envois[0].etat, Ti.MS.envois[0].raison], ['echec', 'Les conversations sont illisibles']);
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
