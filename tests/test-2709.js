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
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2709-'));
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
  'chargerAgents', 'agSec', 'agMode_', 'agPause', 'agDecider', 'agHugo', 'agIllisible', 'vueAgents', 'fmtHeure',
  'agDosCharger', 'agDosOuvrir', 'agDosFermer', 'agDosPaiement', 'agDosFiche', 'agDosListe', 'agCvCharger', 'agCvOuvrir', 'agCvFermer', 'agCvEnvoyer', 'agCvDossier', 'agCvMessage', 'agCvVue'];
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

console.log('\n── 2709 · le panneau Agents de la Tour : ses vraies fonctions contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const MDP = 'mot-de-passe-du-banc-2709';
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
    fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify({ 'delta@exemple-2709.fr': { email: 'delta@exemple-2709.fr', entreprise: 'Delta Propreté', prenom: 'Léa', nomFam: 'Martin', tel: '06 12 34 56 78', inscrit: maintenant - 86400000 } }));
    const emp = e => crypto.createHash('sha256').update(e).digest('hex');
    fs.writeFileSync(path.join(D, 'dossiers.json'), JSON.stringify({ prochain: 3, parCle: { [emp('delta@exemple-2709.fr')]: 'DOS-000001', [emp('parti@exemple-2709.fr')]: 'DOS-000002' } }));   /* le second client n'existe plus */
    fs.writeFileSync(path.join(D, 'agents-messages.json'), JSON.stringify([
      { id: 'm1', ts: maintenant - 5000, fil: 'hugo', de: 'hugo', texte: 'Stripe répond de nouveau.', niveau: 'info', lu: false },
      { id: 'm2', ts: maintenant - 4000, fil: 'hugo', de: 'hugo', texte: '<img src=x onerror=alert(2)> Le client du dossier DOS-000001 demande à parler à une vraie personne.', niveau: 'urgent', lu: false, dossier: 'DOS-000001', motif: 'demande_humain' }]));
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

  console.log('\n2 bis. Hugo : « Relire Stripe maintenant »');
  h = T.ctx.vueAgents();
  vrai('le bouton n’existe que sur la carte de Hugo, une fois allumé', (h.match(/Relire Stripe maintenant/g) || []).length === 1);
  const avantH = T.toasts.length; T.ctx.agHugo();
  vrai('le passage répond : le serveur de banc n’a pas de Stripe, la page dit « Stripe illisible »', await att(() => T.toasts.slice(avantH).some(t => /Stripe illisible/.test(t))));
  await att(() => !T.ctx.AG.busy);
  vrai('un collaborateur ne le fait pas passer (la page refuse avant d’appeler)', (() => { const c = tour(S.B, S.jeton, 'collaborateur'); const n0 = c.toasts.length; c.ctx.agHugo(); return c.toasts.length === n0 && c.etat.rendus === 0; })());

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

  console.log('\n8. Conversations : l’écran dit ce que le serveur a répondu');
  const C = tour(S.B, S.jeton, 'patron'); C.ctx.chargerAgents();
  vrai('les conversations sont lues', await att(() => C.ctx.AG.cv.lec === 1));
  const NL = (S.lire('agents-messages.json') || []).filter(m => m.de !== 'justin' && !m.lu).length;   /* les deux du banc, plus ce que Hugo a dit lui-même au § 2 bis */
  vrai('(population) au moins les deux messages du banc sont non lus', NL >= 2);
  v('les non lus du serveur sont comptés à l’écran', C.ctx.AG.cv.nonLus, NL);
  C.ctx.agSec('conv'); let hc = C.etat.html;
  vrai('le fil de Hugo paraît, avec son compteur', /Hugo/.test(hc) && new RegExp('ag-n">' + NL + '<').test(hc));
  vrai('le groupe « Équipe » est là', /Équipe · groupe/.test(hc));
  vrai('l’onglet porte le compteur de non lus', new RegExp('Conversations<span class="ag-n">' + NL + '<').test(C.etat.html));
  C.ctx.agCvOuvrir('hugo');
  vrai('le fil s’ouvre', await att(() => C.ctx.AG.cv.msgLec === 1));
  hc = C.etat.html;
  vrai('le message urgent est marqué, avec le bouton du dossier', /urgent/.test(hc) && /Ouvrir le dossier DOS-000001/.test(hc));
  vrai('le texte d’un message est échappé', !/<img src=x/.test(hc) && /&lt;img/.test(hc));
  vrai('« lu » est posé APRÈS l’affichage : plus aucun non lu côté serveur', await att(() => C.ctx.AG.cv.nonLus === 0));
  v('…le serveur l’a bien écrit', (S.lire('agents-messages.json') || []).every(m => m.lu === true), true);
  C.ctx.agCvDossier('DOS-000001');
  vrai('le bouton mène au dossier : la fiche porte le téléphone', await att(() => C.ctx.AG.dos.ficheLec === 1));
  hc = C.etat.html;
  vrai('…et on peut rappeler (lien tel:) avec le nom de l’entreprise', /tel:0612345678/.test(hc) && /Delta Propreté/.test(hc) && C.ctx.AG.sec === 'dossiers');
  C.ctx.agSec('conv'); C.ctx.agCvOuvrir('hugo'); await att(() => C.ctx.AG.cv.msgLec === 1);
  C.ctx.AG.cv.brouillon = '  Merci, je rappelle ce client  '; C.ctx.agCvEnvoyer();
  vrai('Justin écrit : son message paraît dans le fil, signé « Toi »', await att(() => /Toi/.test(C.etat.html)));
  v('…le brouillon est vidé après l’envoi', C.ctx.AG.cv.brouillon, '');
  const nb = (S.lire('agents-messages.json') || []).length;
  C.ctx.AG.cv.brouillon = '   '; C.ctx.agCvEnvoyer(); await dormir(200);
  v('un message vide ne part pas', (S.lire('agents-messages.json') || []).length, nb);
  const posts = []; const fetchOrig = C.ctx.fetch;
  C.ctx.fetch = function (u, o) { if (o && o.method === 'POST') posts.push(String(u)); return fetchOrig.apply(this, arguments); };
  C.ctx.AG.cv.brouillon = '   '; C.ctx.agCvEnvoyer(); await dormir(150);
  v('un message vide ne part même pas vers le serveur', posts.filter(u => /envoyer/.test(u)).length, 0);
  C.ctx.fetch = fetchOrig;
  console.log('   … un fil rouvert sans non lu ne redemande pas « lu »');
  const posts2 = []; C.ctx.fetch = function (u, o) { if (o && o.method === 'POST') posts2.push(String(u)); return fetchOrig.apply(this, arguments); };
  C.ctx.agCvOuvrir('hugo'); await att(() => C.ctx.AG.cv.msgLec === 1); await dormir(150);
  v('aucun appel « lire » quand tout est déjà lu', posts2.filter(u => /lire/.test(u)).length, 0);
  C.ctx.fetch = fetchOrig;
  console.log('   … une réponse tardive ne remplace pas le fil ouvert depuis');
  C.ctx.fetch = function (u, o) { const p = fetchOrig.apply(this, arguments); return /conversations\/hugo$/.test(String(u)) ? dormir(500).then(() => p) : p; };
  C.ctx.agCvOuvrir('hugo'); C.ctx.agCvOuvrir('equipe'); await dormir(900);
  vrai('le fil affiché est « Équipe » (la réponse lente de Hugo n’a rien écrasé)', C.ctx.AG.cv.ouvert === 'equipe' && C.ctx.AG.cv.msgs.every(m => m.fil === 'equipe'));
  C.ctx.fetch = fetchOrig;
  C.ctx.AG.lec.taches === 1 || await att(() => C.ctx.AG.lec.taches === 1);
  C.ctx.agCvOuvrir('equipe'); await att(() => C.ctx.AG.cv.msgLec === 1);
  vrai('le groupe « Équipe » montre aussi les tâches entre agents (Hugo → Max)', /Hugo → Max/.test(C.etat.html) && /ag-msg tache/.test(C.etat.html));
  console.log('   … un dossier : réponse tardive, et client supprimé');
  C.ctx.fetch = function (u, o) { const p = fetchOrig.apply(this, arguments); return /dossiers\/DOS-000001$/.test(String(u)) ? dormir(500).then(() => p) : p; };
  C.ctx.agDosOuvrir('DOS-000001'); C.ctx.agDosOuvrir('DOS-000999'); await dormir(900);
  vrai('le dossier ouvert est le dernier demandé (999 est inconnu : « pas pu être lu »)', C.ctx.AG.dos.ouvert === 'DOS-000999' && C.ctx.AG.dos.ficheLec === -1 && !C.ctx.AG.dos.fiche);
  C.ctx.fetch = fetchOrig;
  C.ctx.AG.sec = 'dossiers';
  C.ctx.agDosOuvrir('DOS-000002'); await att(() => C.ctx.AG.dos.ficheLec === 1);
  vrai('un client supprimé : « supprimé », numéro jamais réutilisé, aucune coordonnée', /a été supprimé/.test(C.etat.html) && /jamais réutilisé/.test(C.etat.html) && !/exemple-2709/.test(C.etat.html));
  const K = tour(S.B, S.jeton, 'collaborateur'); K.ctx.AG.cv.ouvert = 'hugo'; K.ctx.AG.cv.brouillon = 'je ne devrais pas pouvoir'; K.ctx.agCvEnvoyer(); await dormir(200);
  v('un collaborateur n’écrit rien', (S.lire('agents-messages.json') || []).length, nb);
  console.log('\n9. Conversations et dossiers illisibles : « on ne sait pas », jamais « rien »');
  const W = await serveur('cvill', D => { fs.writeFileSync(path.join(D, 'agents-messages.json'), '[{"id":'); fs.writeFileSync(path.join(D, 'dossiers.json'), '{"prochain":'); });
  const Z = tour(W.B, W.jeton, 'patron'); Z.ctx.chargerAgents();
  vrai('la lecture des conversations a échoué', await att(() => Z.ctx.AG.cv.lec !== 0));
  v('conversations : −1 (on n’a pas pu savoir)', Z.ctx.AG.cv.lec, -1);
  Z.ctx.agSec('conv'); hc = Z.etat.html;
  vrai('l’écran dit « n’ont pas pu être lues » et ne montre ni fil ni « Aucun message »', /pas pu être lues/.test(hc) && !/Aucun message/.test(hc) && !/Écrire dans ce fil/.test(hc));
  Z.ctx.agCvOuvrir('hugo');
  vrai('un fil illisible : −1, et la page ne dessine ni « Aucun message » ni la zone d’écriture', (await att(() => Z.ctx.AG.cv.msgLec === -1)) && /pas pu être lu/.test(Z.etat.html) && !/Aucun message/.test(Z.etat.html) && !/Écrire dans ce fil/.test(Z.etat.html));
  Z.ctx.agSec('dossiers');
  vrai('dossiers : la lecture a échoué', await att(() => Z.ctx.AG.dos.lec !== 0));
  v('dossiers : −1', Z.ctx.AG.dos.lec, -1);
  vrai('l’écran dit « n’ont pas pu être lus » et jamais « Aucun client »', /pas pu être lus/.test(Z.etat.html) && !/Aucun client/.test(Z.etat.html));
  vrai('un dossier illisible ne se dessine pas « vide »', (Z.ctx.agDosOuvrir('DOS-000001'), await att(() => Z.ctx.AG.dos.ficheLec === -1)) && /pas pu être lu/.test(Z.etat.html));


  /* ── « Parler » et ce que chaque carte dit de son cerveau (20 octobre 2026) ── */
  vrai('⛔ le bouton « Parler » existe et ouvre le fil de l’agent', /function agParler\(id\)\{[^}]*agCvOuvrir\(id\)/.test(SRC) && /onclick="agParler\(/.test(SRC));
  vrai('le serveur dit quels agents ont un cerveau et si la clé est posée — deux booléens, jamais la clé', /cleOk: ctx\.cleCerveauPosee === true/.test(fs.readFileSync(path.join(RACINE, 'server/agents.js'), 'utf8')) && /cleCerveauPosee: !!\(config\.agents && config\.agents\.cleApi\)/.test(fs.readFileSync(path.join(RACINE, 'server/index.js'), 'utf8')));
  (function () {
    const A = Z.ctx.AG, avant = [A.agents, A.cleOk, A.loaded, A.err, A.sec];
    A.loaded = true; A.err = ''; A.sec = 'equipe';
    A.agents = [{ id: 'hugo', nom: 'Hugo', role: 'r', couche: 'Clients', vague: 1, plafondUsd: 10, mode: 'arret', cerveau: true }, { id: 'camille', nom: 'Camille', role: 'r', couche: 'Clients', vague: 2, plafondUsd: 35, mode: 'arret', cerveau: false }];
    A.cleOk = false; const sansCle = Z.ctx.vueAgents(); A.cleOk = true; const avecCle = Z.ctx.vueAgents();
    vrai('sans clé, Hugo dit qu’il ne répond pas encore', /Branché, mais la clé Anthropic n’est pas posée/.test(sansCle) && !/Il répond quand tu lui écris/.test(sansCle));
    vrai('avec la clé, Hugo dit qu’il répond ; Camille dit « pas encore branché » dans les deux cas', /Il répond quand tu lui écris/.test(avecCle) && (sansCle.match(/Pas encore branché/g) || []).length === 1 && (avecCle.match(/Pas encore branché/g) || []).length === 1);
    vrai('chaque carte a son bouton « Parler à … »', /Parler à Hugo/.test(avecCle) && /Parler à Camille/.test(avecCle));
    A.agents = avant[0]; A.cleOk = avant[1]; A.loaded = avant[2]; A.err = avant[3]; A.sec = avant[4];
  })();

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); fin(); process.exit(1); });
