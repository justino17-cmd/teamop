/* ⛔ CE QUE CE FICHIER GARDE — LE PANNEAU « AGENTS » DE LA TOUR CONTRE LE VRAI SERVEUR (19 octobre 2026).
   Les vraies fonctions de `tour.html` (chargerAgents, agMode_, agPause, agDecider, vueAgents) parlent au vrai
   `server/index.js`, isolé sur 127.0.0.1, avec ses vrais fichiers `agents-*.json`. Rien n'est simulé entre la page
   et le serveur — seuls l'écran (render, toast, confirm) et le cadre de page (enTete) sont des bouchons.
   Ce qu'on garde, et qu'aucune moitié ne voit seule :
     · l'écran DIT ce que le serveur a répondu : un mode ne s'affiche qu'une fois écrit par le serveur ;
     · TROIS ÉTATS : une liste que le serveur n'a pas pu lire (fichier illisible → 503) ne se dessine JAMAIS « rien à valider » ;
     · un état illisible arrête tout et le panneau le dit ; seul `pause:false` reprend ;
     · un collaborateur (non patron) ne peut rien écrire — et la page ne le lui propose pas. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2704-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); fin(); process.exit(1); }, 120000).unref();

function fonction(nom) {
  const m = new RegExp('\\n(?:async )?function ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(m.index + 1, k + 1);
}
/* `esc` tient sur UNE ligne et porte une apostrophe et un guillemet dans une expression régulière : le compteur d'accolades la prendrait pour des chaînes */
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const NOMS = ['hAuth', 'srvRepond', 'srvMuet', 'apiGet', 'apiPost', 'msgErreur', 'acSquel', 'fmtDate', 'agParId', 'agNom', 'agMode', 'agParams', 'agEnPause',
  'chargerAgents', 'agSec', 'agMode_', 'agPause', 'agDecider', 'agIllisible', 'vueAgents'];
const i0 = CODE.indexOf('var AG={'), i1 = CODE.indexOf('\nfunction agParId(');
vrai('le bloc des agents est trouvé dans la Tour', i0 > 0 && i1 > i0);
vrai('chaque fonction du panneau existe', ESC && NOMS.every(n => fonction(n)));

/* la Tour d'un patron ou d'un collaborateur, face à UN serveur */
function tour(API, TOKEN, role, confirmer) {
  const toasts = [], etat = { rendus: 0, confirmations: 0, html: '' };
  const ctx = { fetch, API, TOKEN, MYROLE: role, TAB: 'agents', Object, String, JSON, Promise, Math, Number, Array, Date, Error, console,
    srvEtat() {}, doLogout() {}, APPS_TOUR: {}, INJOIGNABLE: 'Serveur injoignable — nouvelle tentative dans un instant.',
    enTete: (t) => '<h1>' + t + '</h1>', toast: (t) => toasts.push(t),
    confirm: () => { etat.confirmations++; return confirmer !== false; } };
  ctx.render = () => { etat.rendus++; etat.html = ctx.vueAgents(); };
  vm.createContext(ctx);
  vm.runInContext(ESC + CODE.slice(i0, i1) + '\n' + NOMS.map(fonction).join('\n'), ctx);
  return { ctx, toasts, etat };
}
const att = async (f, ms = 4000) => { const t = Date.now(); while (Date.now() - t < ms) { if (f()) return true; await dormir(40); } return false; };

console.log('\n── 2704 · le panneau Agents de la Tour : ses vraies fonctions contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const MDP = 'mot-de-passe-du-banc-2704';
  let numero = 0;
  async function serveur(nom, preparer) {
    const D = path.join(banc, nom, 'data'); fs.mkdirSync(D, { recursive: true });
    preparer(D);
    const vap = webpush.generateVAPIDKeys();
    fs.writeFileSync(path.join(banc, nom, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP) }));
    const PORT = 9600 + ((process.pid + (numero++)) % 300);
    let journal = '';
    const e = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, nom, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    vrai('le serveur « ' + nom + ' » démarre', vivant);
    if (!vivant) { console.log(journal.slice(0, 600)); process.exit(1); }
    const post = async (r, c, j) => { const x = await fetch(B + r, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, j ? { Authorization: 'Bearer ' + j } : {}), body: JSON.stringify(c) }); let o = {}; try { o = await x.json(); } catch (y) {} return { s: x.status, j: o }; };
    const jeton = (await post('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
    return { B, D, jeton, post, lire: f => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (x) { return null; } } };
  }
  const maintenant = Date.now();
  const S = await serveur('sain', D => {
    fs.writeFileSync(path.join(D, 'agents-validations.json'), JSON.stringify([
      { id: 'val-a1', ts: maintenant - 3600000, agent: 'hugo', type: 'creer_espace', resume: 'Créer l’espace de Delta Propreté', params: { espace: 'delta-proprete', formule: 'pro' }, statut: 'en_attente' },
      { id: 'val-a2', ts: maintenant - 1800000, agent: 'hugo', type: 'suspendre_acces', resume: 'Suspendre Zeta (impayé)', params: { espace: 'zeta-vapeur', motif: 'impaye' }, statut: 'en_attente' },
      { id: 'val-a3', ts: maintenant - 7200000, agent: 'hugo', type: 'creer_espace', resume: 'Créer l’espace de Beta', params: { espace: 'beta', formule: 'pro' }, statut: 'accepte', decideTs: maintenant - 3600000, decidePar: 'Patron' },
      { id: 'val-a4', ts: maintenant - 900000, agent: 'hugo', type: 'creer_espace', resume: 'Créer l’espace de Kappa', params: { espace: 'kappa', formule: 'pro' }, statut: 'en_attente' }]));
    fs.writeFileSync(path.join(D, 'agents-taches.json'), JSON.stringify([{ id: 'tch-1', ts: maintenant - 60000, de: 'hugo', vers: 'max', type: 'verifier_paiement', params: { espace: 'delta-proprete' }, statut: 'attente' }]));
  });
  const T = tour(S.B, S.jeton, 'patron');
  const premier = T.ctx.AG;

  console.log('\n1. Ouvrir le panneau : l’écran montre ce que le serveur sait');
  T.ctx.chargerAgents();
  vrai('les quatre lectures aboutissent', await att(() => T.ctx.AG.loaded && T.ctx.AG.lec.validations === 1 && T.ctx.AG.lec.journal === 1 && T.ctx.AG.lec.taches === 1));
  v('seize agents lus', T.ctx.AG.agents.length, 16);
  v('tous à l’arrêt au départ', T.ctx.AG.agents.every(a => a.mode === 'arret'), true);
  v('quatre demandes lues, avec celle déjà décidée (statut=tout)', T.ctx.AG.validations.length, 4);
  let h = T.ctx.vueAgents();
  vrai('« à l’arrêt » est celui qui est allumé sur une carte', /data-m="arret" class="on"/.test(h));
  vrai('« Auto » est refusé tant que l’agent est à l’arrêt (désactivé)', /data-m="auto" class=""[^>]*disabled/.test(h));
  vrai('le bandeau dit que les agents peuvent travailler, 0 allumé', /peuvent travailler · 0 allumé sur 16/.test(h));
  vrai('aucun montant de dépense inventé', !/ \$ \/ /.test(h) && /Console Anthropic/.test(h));

  console.log('\n2. Changer un mode : seul le serveur le fait changer à l’écran');
  T.ctx.agMode_('hugo', 'brouillon');
  vrai('le serveur a écrit « brouillon »', await att(() => (S.lire('agents-etat.json') || { modes: {} }).modes.hugo === 'brouillon'));
  vrai('l’écran le relit : Hugo en brouillon', await att(() => (T.ctx.AG.agents.find(a => a.id === 'hugo') || {}).mode === 'brouillon' && !T.ctx.AG.busy));
  T.ctx.agMode_('hugo', 'auto');
  vrai('passer en auto demande confirmation', T.etat.confirmations === 1);
  vrai('le serveur écrit « auto »', await att(() => (S.lire('agents-etat.json') || { modes: {} }).modes.hugo === 'auto'));
  await att(() => (T.ctx.AG.agents.find(a => a.id === 'hugo') || {}).mode === 'auto');
  const refus = tour(S.B, S.jeton, 'patron', false); refus.ctx.chargerAgents(); await att(() => refus.ctx.AG.loaded);
  refus.ctx.agMode_('max', 'brouillon'); await att(() => (S.lire('agents-etat.json') || { modes: {} }).modes.max === 'brouillon');
  refus.ctx.agMode_('max', 'auto'); await dormir(300);
  v('« Annuler » à la confirmation : rien n’est écrit, Max reste en brouillon', (S.lire('agents-etat.json') || { modes: {} }).modes.max, 'brouillon');
  const saut = await S.post('/api/monitor/agents/mode', { agent: 'nina', mode: 'auto' }, S.jeton);
  v('le serveur refuse le saut arrêt → auto (409) — la page ne le propose pas non plus', saut.s, 409);

  console.log('\n3. Pause générale : arrête tout, et seul « Reprendre » reprend');
  T.ctx.agPause(true);
  vrai('le serveur est en pause', await att(() => ((S.lire('agents-etat.json') || {}).pause || {}).actif === true));
  await att(() => T.ctx.AG.pause && T.ctx.AG.pause.actif === true);
  h = T.ctx.vueAgents();
  vrai('le bandeau dit « Pause générale » et propose « Reprendre »', /Pause générale/.test(h) && /Reprendre/.test(h));
  T.ctx.agPause(false);
  vrai('le serveur reprend (pause:false strict)', await att(() => ((S.lire('agents-etat.json') || {}).pause || {}).actif === false));

  console.log('\n4. Décider d’une demande');
  await att(() => !T.ctx.AG.busy);
  h = T.ctx.vueAgents(); T.ctx.agSec('valid'); h = T.etat.html;
  vrai('trois demandes à valider, avec « Valider » et « Refuser »', (h.match(/Valider<\/button>/g) || []).length === 3 && (h.match(/Refuser<\/button>/g) || []).length === 3);
  vrai('la demande déjà décidée se lit « acceptée » sans bouton', /acceptée/.test(h));
  vrai('le compteur de l’onglet dit 3', /ag-n">3</.test(T.ctx.vueAgents()));
  T.ctx.agDecider('val-a1', 'refuser');
  vrai('le serveur a refusé val-a1', await att(() => ((S.lire('agents-validations.json') || []).find(x => x.id === 'val-a1') || {}).statut === 'refuse'));
  T.ctx.agDecider('val-a2', 'accepter');
  vrai('le serveur a accepté val-a2, signée « Patron »', await att(() => { const x = (S.lire('agents-validations.json') || []).find(y => y.id === 'val-a2') || {}; return x.statut === 'accepte' && x.decidePar === 'Patron'; }));
  await att(() => T.ctx.AG.validations.filter(x => x.statut === 'en_attente').length === 1);
  vrai('il ne reste que val-a4 à valider', (T.ctx.agSec('valid'), (T.etat.html.match(/Valider<\/button>/g) || []).length === 1) && /refusée/.test(T.etat.html));
  const deuxFois = await S.post('/api/monitor/agents/validations/decider', { id: 'val-a1', decision: 'accepter' }, S.jeton);
  v('re-décider une demande déjà refusée : 409', deuxFois.s, 409);

  console.log('\n5. Un collaborateur ne peut rien écrire (et la page ne l’y invite pas)');
  /* ⛔ le PIÈGE : un collaborateur avec le VRAI jeton du patron (le serveur dirait oui) — c'est la page qui doit refuser */
  const CO = tour(S.B, S.jeton, 'collaborateur');
  CO.ctx.chargerAgents(); await dormir(300);
  v('un patron-factice (MYROLE collaborateur) n’écrit rien : la page refuse avant d’appeler', (CO.ctx.agMode_('hugo', 'arret'), CO.ctx.agPause(true), CO.ctx.agDecider('val-a4', 'refuser'), CO.etat.confirmations), 0);
  await dormir(400);
  v('…et le serveur n’a rien reçu : val-a4 est toujours à valider, Hugo n’a pas bougé', [((S.lire('agents-validations.json') || []).find(x => x.id === 'val-a4') || {}).statut, ((S.lire('agents-etat.json') || {}).pause || {}).actif], ['en_attente', false]);
  vrai('…et l’écran dit « Réservé au patron »', /Réservé au patron/.test(CO.ctx.vueAgents()));
  const sans = await fetch(S.B + '/api/monitor/agents/pause', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer faux' }, body: JSON.stringify({ pause: true }) });
  vrai('le serveur refuse sans jeton valable (401/403)', sans.status === 401 || sans.status === 403);

  /* ⛔ « Valider » demande confirmation : Annuler = rien d'écrit */
  const NON = tour(S.B, S.jeton, 'patron', false); NON.ctx.chargerAgents(); await att(() => NON.ctx.AG.loaded);
  NON.ctx.agDecider('val-a4', 'accepter'); await dormir(400);
  v('« Annuler » à la confirmation de « Valider » : val-a4 reste à valider', ((S.lire('agents-validations.json') || []).find(x => x.id === 'val-a4') || {}).statut, 'en_attente');
  T.ctx.agDecider('val-a4', 'refuser');
  vrai('…puis refusée : plus rien à valider, les quatre demandes restent lisibles', await att(() => ((S.lire('agents-validations.json') || []).find(x => x.id === 'val-a4') || {}).statut === 'refuse')
    && await att(() => T.ctx.AG.validations.every(x => x.statut !== 'en_attente')) && (T.ctx.agSec('valid'), !/Valider<\/button>/.test(T.etat.html)));
  /* un 200 SANS la liste (serveur d'avant, relais) n'est pas une liste vide */
  const ANC = tour(S.B, S.jeton, 'patron'); const f0 = ANC.ctx.fetch;
  ANC.ctx.fetch = (u, o) => /agents\/taches/.test(u) ? Promise.resolve({ status: 200, ok: true, json: () => Promise.resolve({ ok: true }) }) : f0(u, o);
  ANC.ctx.chargerAgents(); await att(() => ANC.ctx.AG.lec.journal === 1); await dormir(300);
  v('un 200 sans « taches » se lit « on ne sait pas » (−1), pas « aucune tâche »', ANC.ctx.AG.lec.taches, -1);

  console.log('\n6. Un fichier illisible ne se dessine JAMAIS « rien à faire »');
  const M = await serveur('abime', D => {
    fs.writeFileSync(path.join(D, 'agents-taches.json'), '{pas du json');
    fs.writeFileSync(path.join(D, 'agents-validations.json'), '[{"cassé":');
    fs.writeFileSync(path.join(D, 'agents-etat.json'), '<<<');
  });
  const r1 = await fetch(M.B + '/api/monitor/agents/taches', { headers: { Authorization: 'Bearer ' + M.jeton } });
  const r2 = await fetch(M.B + '/api/monitor/agents/validations', { headers: { Authorization: 'Bearer ' + M.jeton } });
  v('le serveur répond 503 (pas une liste vide) pour les tâches illisibles', r1.status, 503);
  v('…et pour les validations illisibles', r2.status, 503);
  const A = tour(M.B, M.jeton, 'patron'); A.ctx.chargerAgents();
  vrai('les lectures ont abouti ou échoué', await att(() => A.ctx.AG.loaded && A.ctx.AG.lec.taches !== 0 && A.ctx.AG.lec.validations !== 0));
  v('tâches : « on n’a pas pu savoir » (−1), pas « lu » (1)', A.ctx.AG.lec.taches, -1);
  v('validations : −1 aussi', A.ctx.AG.lec.validations, -1);
  v('l’état illisible est annoncé par le serveur', A.ctx.AG.illisible, true);
  h = A.ctx.vueAgents(); A.ctx.agSec('valid'); const hv = A.etat.html; A.ctx.agSec('taches'); const ht = A.etat.html;
  vrai('le bandeau dit « État illisible » et ne propose PAS « Reprendre »', /État illisible/.test(h) && !/Reprendre/.test(h));
  vrai('validations : « n’ont pas pu être lues », jamais « Rien à valider »', /pas pu être lues/.test(hv) && !/Rien à valider/.test(hv));
  vrai('tâches : « n’ont pas pu être lues », jamais « Aucune tâche »', /pas pu être lues/.test(ht) && !/Aucune tâche/.test(ht));
  const refusEcr = await M.post('/api/monitor/agents/mode', { agent: 'hugo', mode: 'brouillon' }, M.jeton);
  v('rien ne s’écrit par-dessus un état illisible (503)', refusEcr.s, 503);
  vrai('…et le fichier abîmé est resté tel quel', fs.readFileSync(path.join(M.D, 'agents-etat.json'), 'utf8') === '<<<');

  console.log('\n7. Aucune donnée de client ne se dessine telle quelle');
  const X = tour(S.B, S.jeton, 'patron'); X.ctx.AG.loaded = true; X.ctx.AG.agents = T.ctx.AG.agents; X.ctx.AG.lec = { validations: 1, journal: 1, taches: 1 };
  X.ctx.AG.validations = [{ id: 'z', ts: 1, agent: 'hugo', type: 'creer_espace', resume: '<img src=x onerror=alert(1)>', params: { espace: '<b>x</b>' }, statut: 'en_attente' }];
  X.ctx.AG.sec = 'valid'; const hx = X.ctx.vueAgents();
  vrai('le résumé et les paramètres sont échappés', !/<img src=x/.test(hx) && !/<b>x<\/b>/.test(hx) && /&lt;img/.test(hx));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); fin(); process.exit(1); });
