/* ══ test-2817 : LOT 1 DE LA REFONTE DE LA TOUR — (h) JOURNAL : CE QU'ONT FAIT LES AGENTS (21 octobre 2026) ══
   Le Journal de la Tour disait ce qu'ont fait les PERSONNES (connexions, gestes). Il dit désormais aussi ce qu'ont fait les AGENTS, lu dans leur
   journal (/api/monitor/agents/journal), avec un filtre « Agents » — la maquette validée : « tout ce qui s'est passé, par qui, et quand ».
   EN LECTURE. La couture se joue avec le VRAI serveur (journal des agents posé dans son fichier, un geste de la console fait par une vraie route,
   un second serveur au journal illisible) et les VRAIES `chargerJournal` et `vueJournal` :
     · les gestes des agents paraissent, avec le NOM de l'agent (registre du serveur), ce qui a été visé, le détail et qui a agi ;
     · un résultat qui demande l'œil porte sa pastille (erreur, refusé, proposé) ; un geste réussi n'en porte pas (la règle du Journal) ;
     · le filtre « Agents » ne montre qu'eux ; « Tout » les compte ;
     · ⛔ la console OP MESSAGES ne les montre pas (les agents travaillent pour OP GESTION) — et un filtre « Agents » resté posé y retombe sur « Tout » ;
     · ⛔ un journal illisible (503) n'est jamais « aucun agent n'a rien fait » ; un détail venu d'un agent est ÉCHAPPÉ.
   Rien ne sort d'ici : 127.0.0.1, configuration et données jetables. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
console.log('── test-2817 : la Tour, lot 1 (h) — Journal, ce qu\'ont fait les agents ──');
let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  (sauté : server/node_modules absent)\n\n0 ✓  0 ✗'); process.exit(0); }
const T = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
const ligne = d => { const i = T.indexOf(d); return i < 0 ? '' : T.slice(i, T.indexOf('\n', i)); };
const NOMS = ['chargerJournal', 'jrAgNom', 'vueJournal', 'filtreEff', 'sourcesAff', 'aGestion', 'aMessages', 'jrGroupe', 'teteListe', 'agNom', 'agParId', 'esc', 'fmtDate', 'fmtHeure', 'apiGet'];
const FN = NOMS.map(n => corps(T, 'function ' + n + '('));
const JRV = ligne('var JR={');
v('(population) les 15 fonctions et l\'état JR sont trouvés dans le fichier livré', [FN.filter(f => f.length < 30).length, /ag:\[\],agLec:0/.test(JRV)], [0, true]);
vrai('⛔ le Journal n\'écrit rien pour les agents (aucun apiPost dans chargerJournal ni vueJournal)', !/apiPost/.test(FN[0] + FN[2]));

const MDP = 'banc-2817-patron', now = Date.now(), H = 3600000;
const preparer = (journal) => {
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2817-')), D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [{ id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: now }] }));
  if (journal !== null) fs.writeFileSync(path.join(D, 'agents-journal.json'), journal);
  return { banc, D };
};
const demarrer = async ({ banc, D }) => {
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  let journal = '';
  const e = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9', TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk',
    TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs' }), stdio: ['ignore', 'pipe', 'pipe'] });
  e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
  let vivant = false; for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
  const TP = vivant ? (await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) })).json()).token : '';
  return { e, API: 'http://127.0.0.1:' + PORT, vivant, TP, journal: () => journal };
};
let n = 0;
const J = (agent, action, resultat, heures, o) => Object.assign({ id: 'j' + (++n), ts: now - heures * H, agent, action, cible: 'cible-' + n, resultat }, o || {});
const JOURNAL = [
  J('hugo', 'relire Stripe', 'ok', 1),
  J('camille', 'brouillon de réponse', 'propose', 2),
  J('max', 'vérifier le site', 'erreur', 3, { detail: '<img src=x onerror=alert(1)>' }),
  J('camille', 'envoyer', 'refuse', 4, { detail: 'agent en brouillon' }),
  J('systeme', 'mode changé', 'ok', 5, { qui: 'Patron', detail: 'camille : arret → brouillon' })];

(async () => {
  const enfants = [], bancs = [];
  const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); bancs.forEach(b => { try { fs.rmSync(b, { recursive: true, force: true }); } catch (x) {} }); };
  process.on('exit', fin);
  setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 150000).unref();
  const P1 = preparer(JSON.stringify(JOURNAL)); bancs.push(P1.banc);
  const S = await demarrer(P1); enfants.push(S.e);
  vrai('le serveur démarre, une session de patron', S.vivant && S.TP, S.journal().slice(-300));
  /* un geste de PERSONNE, fait par une vraie route de la console : le Journal le montre déjà, il doit continuer */
  const g = await fetch(S.API + '/api/monitor/version-min', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.TP }, body: JSON.stringify({ canal: 'beta', min: 0 }) });
  v('un geste de la console par une vraie route (le patron)', g.status, 200);

  let jeton = S.TP, rendus = 0;
  const bac = { API: S.API, fetch, Promise, JSON, Date, String, Array, Math, Error, Number, Object, MYROLE: 'patron', TAB: 'journal', FILTRE: 'gestion', MYAPPS: ['gestion', 'messages'], APPS_TOUR: { gestion: { nom: 'OP GESTION' }, messages: { nom: 'OP MESSAGES' } }, filtreAffiche: () => false,
    AG: { agents: [] }, IC: { cadenas: '' },
    hAuth: () => ({ Authorization: 'Bearer ' + jeton }), srvRepond: r => r, srvMuet: e => { throw e; }, doLogout: () => {}, render: () => { rendus++; }, msgErreur: () => 'Serveur injoignable.',
    squelListe: () => '<i class="squel"></i>', enTete: (t) => '<h1>' + t + '</h1>' };
  vm.createContext(bac);
  vm.runInContext(JRV + '\n' + FN.join('\n') + '\nthis.JR=JR;this.chargerJournal=chargerJournal;this.vueJournal=vueJournal;', bac);
  const texte = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const attendre = async (f) => { for (let i = 0; i < 80 && !f(); i++) await dormir(25); };
  const groupeAg = h => { const i = h.indexOf('<span class="reg-nom">Ce qu’ont fait les agents</span>'); return i < 0 ? '' : h.slice(i); };
  bac.chargerJournal(); await attendre(() => bac.JR.loaded && bac.JR.agLec && Object.keys(bac.JR.agNoms).length);
  v('la vraie chargerJournal lit le journal de la console, celui des agents et leurs noms', [bac.JR.loaded, bac.JR.err, bac.JR.agLec, bac.JR.ag.length, bac.JR.agNoms.camille], [true, '', 1, 5, 'Camille']);
  let Hm = bac.vueJournal(); const GA = groupeAg(Hm), X = texte(Hm);
  vrai('le groupe « Ce qu\'ont fait les agents » paraît, avec le NOM de chaque agent (le registre du serveur)', /<b>Camille<\/b> · brouillon de réponse/.test(GA) && /<b>Hugo<\/b> · relire Stripe/.test(GA) && /<b>Max<\/b> · vérifier le site/.test(GA), GA.slice(0, 500));
  vrai('« Système » pour un geste du système, et QUI l\'a fait (« par Patron »)', /<b>Système<\/b> · mode changé/.test(GA) && /par Patron/.test(GA), GA.slice(0, 800));
  vrai('pastilles : erreur, refusé, proposé — aucune sur un geste réussi', /past p-rouge">erreur</.test(GA) && /past p-ambre">refusé</.test(GA) && /past p-info">proposé</.test(GA) && (GA.match(/class="past /g) || []).length === 3);
  vrai('⛔ un détail venu d\'un agent est ÉCHAPPÉ', Hm.indexOf('<img src=x') < 0 && Hm.indexOf('&lt;img src=x') > 0);
  bac.JR.ag = bac.JR.ag.concat([{ ts: now, agent: 'nina', action: '<s>action piégée</s>', cible: '', resultat: 'ok' }]);
  vrai('⛔ une ACTION venue d\'un agent est échappée aussi', bac.vueJournal().indexOf('<s>action piégée') < 0 && bac.vueJournal().indexOf('&lt;s&gt;action piégée') > 0);
  bac.JR.ag = bac.JR.ag.slice(0, -1);
  vrai('le geste de la personne est toujours là', /Ce qui a été fait dans cette console/.test(X) && (bac.JR.serveur || []).length >= 1, X.slice(0, 300));
  const tout = Number((/onclick="jrFiltrePoser\('tout'\)">Tout<span class="n">(\d+)</.exec(Hm) || [])[1]);
  vrai('le filtre « Agents » compte 5 ; « Tout » les compte aussi', /onclick="jrFiltrePoser\('agents'\)">Agents<span class="n">5</.test(Hm) && tout >= 5 + bac.JR.serveur.filter(a => !a.app || a.app === 'gestion').length, Hm.slice(Hm.indexOf('tt-seg'), Hm.indexOf('tt-seg') + 500));
  bac.JR.f = 'agents'; Hm = bac.vueJournal();
  vrai('filtre « Agents » : leur groupe seul', /Ce qu’ont fait les agents/.test(Hm) && !/Ce qui a été fait dans cette console/.test(Hm) && !/Tentatives refusées/.test(Hm));
  bac.FILTRE = 'messages'; Hm = bac.vueJournal();
  vrai('⛔ filtre « Messages » : ni le groupe des agents, ni leur filtre — et le filtre « Agents » resté posé retombe sur « Tout »', !/Ce qu’ont fait les agents/.test(Hm) && !/jrFiltrePoser\('agents'\)/.test(Hm) && /aria-pressed="true" onclick="jrFiltrePoser\('tout'\)"/.test(Hm), Hm.slice(Hm.indexOf('tt-seg'), Hm.indexOf('tt-seg') + 400));
  bac.FILTRE = 'gestion'; bac.JR.f = 'tout';
  /* ⛔ relecture du 22 octobre 2026 : une panne du journal de la CONSOLE ne cache pas celui des agents, lu à part */
  const errAvant = bac.JR.err; bac.JR.err = 'Serveur injoignable.';
  const HE = bac.vueJournal();
  vrai('⛔ journal de la console en panne : sa panne est dite, ET le groupe des agents (lu, lui) reste là', /Serveur injoignable\./.test(HE) && /Ce qu’ont fait les agents/.test(HE) && /<b>Camille<\/b>/.test(HE));
  bac.JR.err = 'Réservé au patron — les connexions à la console ne sont visibles que par lui.';
  vrai('…mais pas sous la note « réservé au patron » : un collaborateur ne lit pas le journal des agents (jamais un squelette sans fin)', !/Ce qu’ont fait les agents/.test(bac.vueJournal()));
  bac.JR.err = errAvant;

  /* ⛔ une réponse 200 qui ne porte pas de liste (un relais, un serveur d'avant) : « on ne sait pas », jamais « aucun agent » */
  const vf0 = bac.fetch;
  bac.fetch = (u, o) => /agents\/journal/.test(u) ? Promise.resolve(new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } })) : vf0(u, o);
  bac.JR.agLec = 0; bac.chargerJournal(); await attendre(() => bac.JR.agLec);
  vrai('⛔ une réponse sans liste : « n\'a pas pu être lu », jamais « aucun agent n\'a encore rien fait »', bac.JR.agLec === -1 && /Le journal des agents n’a pas pu être lu/.test(texte(bac.vueJournal())) && !/Aucun agent/.test(texte(bac.vueJournal())));
  bac.fetch = vf0;
  /* ⛔ un second serveur, journal des agents ILLISIBLE */
  const P2 = preparer('{ tronqué'); bancs.push(P2.banc);
  const S2 = await demarrer(P2); enfants.push(S2.e);
  vrai('(second serveur, journal des agents illisible) il démarre', S2.vivant && S2.TP, S2.journal().slice(-300));
  bac.API = S2.API; jeton = S2.TP; bac.JR.agLec = 0;
  bac.chargerJournal(); await attendre(() => bac.JR.agLec);
  const HI = texte(bac.vueJournal());
  vrai('⛔ journal illisible (503) : « n\'a pas pu être lu », avec la raison du serveur — jamais « aucun agent n\'a rien fait »', bac.JR.agLec === -1 && /Le journal des agents n’a pas pu être lu/.test(HI) && /illisible/.test(HI) && !/Aucun agent/.test(HI), HI.slice(-500));
  vrai('…et son filtre ne porte AUCUN nombre (pas un zéro qu\'on prendrait pour une réponse)', /jrFiltrePoser\('agents'\)">Agents<\/button>/.test(bac.vueJournal()));

  /* un troisième serveur, rien dans le journal des agents */
  const P3 = preparer(null); bancs.push(P3.banc);
  const S3 = await demarrer(P3); enfants.push(S3.e);
  bac.API = S3.API; jeton = S3.TP; bac.JR.agLec = 0; bac.JR.ag = [];
  bac.chargerJournal(); await attendre(() => bac.JR.agLec);
  vrai('rien dans le journal : « Aucun agent n\'a encore rien fait »', bac.JR.agLec === 1 && /Aucun agent n’a encore rien fait/.test(texte(bac.vueJournal())));
  /* une Tour sans la console OP GESTION ne lit pas le journal des agents */
  bac.MYAPPS = ['messages']; bac.JR.agLec = 0; let lu = false; const vf = bac.fetch;
  bac.fetch = (u, o) => { if (/agents/.test(u)) lu = true; return vf(u, o); };
  bac.chargerJournal(); await dormir(300);
  v('une Tour sans la console OP GESTION ne lit pas le journal des agents', [lu, bac.JR.agLec], [false, 0]);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
