/* ⛔ CE QUE CE FICHIER GARDE — L'ONGLET « DIRECTION » DE LA TOUR CONTRE LE VRAI SERVEUR (20 octobre 2026).
   Les vraies fonctions de tour.html (agDirCharger, agDirVue, agCharteAuto, agContrat*) parlent au vrai server/index.js isolé.
   Ce qu'on garde : l'écran DIT ce que le serveur a répondu (rapport, charte, contrats) ; trois états (un registre illisible ne se
   dessine jamais « aucun contrat » ni « rien n'a été fait ») ; un brouillon ne passe en vigueur que par « Valider », avec le nom
   de la personne posé par le serveur ; un geste fixe ne propose aucun bouton ; un collaborateur ne peut rien écrire. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2714-'));
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
  'agTachesDe', 'agDispo', 'agEnCoursTxt', 'agQuiFaitQuoi',   // lot 1 (f) : « qui fait quoi » de l'onglet Équipe
  'agDirCharger', 'agCharteAuto', 'agContratVoir', 'agContratBrouillon', 'agContratValider', 'agDirVue', 'agContratBloc', 'agDosCharger', 'agDosOuvrir', 'agDosFermer', 'agDosPaiement', 'agDosFiche', 'agDosListe', 'agCvCharger', 'agCvOuvrir', 'agCvFermer', 'agCvEnvoyer', 'agCvDossier', 'agCvMessage', 'agCvVue'];
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

console.log('\n── 2714 · le panneau Agents de la Tour : ses vraies fonctions contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const MDP = 'mot-de-passe-du-banc-2714';
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
    fs.writeFileSync(path.join(D, 'agents-journal.json'), JSON.stringify([
      { id: 'j1', ts: maintenant - 60000, agent: 'hugo', action: 'paiement relu', cible: 'DOS-000001', resultat: 'ok', detail: '' },
      { id: 'j2', ts: maintenant - 50000, agent: 'hugo', action: 'espace créé', cible: 'DOS-000002', resultat: 'erreur', detail: 'Stripe muet' }]));
  });
  const doc = { v: '', getElementById: () => ({ value: doc.v }) };
  const T = tour(S.B, S.jeton, 'patron'); T.ctx.document = doc;
  const A = () => T.ctx.AG.dir;

  console.log('\n1. Ouvrir l’onglet : rapport, charte, contrats');
  T.ctx.AG.loaded = true; T.ctx.AG.sec = 'direction'; T.ctx.AG.agents = [{ id: 'hugo', nom: 'Hugo' }];
  T.ctx.agDirCharger();
  vrai('les trois lectures aboutissent', await att(() => A().rapLec === 1 && A().charteLec === 1 && A().contLec === 1));
  let h = T.ctx.agDirVue();
  vrai('le rapport compte les gestes et met l’erreur d’abord', /2 gestes · 1 réussi · 0 refusé · 1 en erreur/.test(h) && h.indexOf('espace créé') < h.indexOf('paiement relu'));
  v('la charte lue a ses gestes, dont les trois fixes', [A().charte.length >= 8, A().charte.filter(g => g.fixe).map(g => g.id).sort()], [true, ['changer_contrat', 'mise_en_demeure', 'supprimer_donnees']]);
  vrai('un geste fixe ne propose aucun bouton', !/agCharteAuto\('mise_en_demeure'/.test(h) && /agCharteAuto\('envoyer_contrat'/.test(h));
  vrai('sans version validée, l’écran le dit : rien n’est envoyé', /Aucune version validée : rien n’est envoyé aux clients/.test(h));

  vrai('les contrats sont rangés par application, avec l\'état de chaque abonnement', /Ce que reçoit un client, abonnement par abonnement/.test(h) && /OP GESTION · business premium/.test(h) && h.indexOf('Toute la société') < h.indexOf('OP GESTION</h4>') && /bloqué/.test(h) && /À CONFIRMER/.test(h));

  console.log('\n2. La charte : le serveur écrit, l’écran suit');
  await T.ctx.agCharteAuto('relancer_impaye', false);
  vrai('le geste repasse en « te proposer d’abord »', await att(() => (A().charte.find(g => g.id === 'relancer_impaye') || {}).auto === false));
  v('…et c’est écrit sur le serveur', S.lire('agents-charte.json').relancer_impaye.auto, false);
  vrai('le toast le dit', T.toasts.some(t => /redemande ton accord/.test(t)));

  console.log('\n3. Un contrat : brouillon → validation → en vigueur');
  doc.v = 'Article 1. Objet du contrat.';
  T.ctx.AG.dir.ouvert = 'conditions_op_gestion';
  await T.ctx.agContratBrouillon('conditions_op_gestion');
  vrai('le brouillon apparaît, pas en vigueur', await att(() => { const t = (A().contrats || {}).types; return t && t.find(x => x.type === 'conditions_op_gestion').versions.length === 2; }));
  h = T.ctx.agDirVue();
  vrai('« brouillon » + bouton Valider, et toujours « Aucune version validée »', /brouillon/.test(h) && /agContratValider\('conditions_op_gestion',2\)/.test(h) && /Aucune version validée/.test(h));
  await T.ctx.agContratValider('conditions_op_gestion', 2);
  vrai('la version passe en vigueur, validée par le nom du patron', await att(() => /En vigueur : version 2 · validée par/.test(T.ctx.agDirVue())));
  vrai('le tampon écrit par le serveur est celui de la personne connectée', JSON.stringify(S.lire('contrats-documents.json')).includes('"validePar":"Patron"'));
  v('le texte du serveur est celui qui a été tapé', S.lire('contrats-documents.json').conditions_op_gestion[1].texte, 'Article 1. Objet du contrat.');
  doc.v = '   '; const avant = T.toasts.length; await T.ctx.agContratBrouillon('conditions_op_gestion');
  vrai('un texte vide ne part pas', T.toasts.length > avant && /vide/.test(T.toasts[T.toasts.length - 1]));

  console.log('\n4. Un collaborateur ne peut rien écrire');
  const C = tour(S.B, S.jeton, 'collaborateur'); C.ctx.document = doc;
  await C.ctx.agCharteAuto('envoyer_contrat', false); await C.ctx.agContratValider('conditions_op_gestion', 1);
  v('aucun appel, aucune confirmation', [C.etat.confirmations, S.lire('agents-charte.json').envoyer_contrat.auto], [0, true]);

  console.log('\n5. Registre illisible : l’écran ne dit pas « rien »');
  const Z = await serveur('abime', D => { fs.writeFileSync(path.join(D, 'contrats-documents.json'), '<<<'); fs.writeFileSync(path.join(D, 'agents-charte.json'), '{pas du json'); });
  const U = tour(Z.B, Z.jeton, 'patron'); U.ctx.AG.loaded = true; U.ctx.AG.sec = 'direction'; U.ctx.document = doc; U.ctx.agDirCharger();
  vrai('les lectures échouent', await att(() => U.ctx.AG.dir.charteLec === -1 && U.ctx.AG.dir.contLec === -1));
  h = U.ctx.agDirVue();
  vrai('l’écran dit que la charte et les contrats sont illisibles', /La charte n’a pas pu être lue/.test(h) && /Les contrats n’ont pas pu être lus/.test(h));
  vrai('…et ne dit ni « Aucune version validée » ni un bouton Valider', !/Aucune version validée/.test(h) && !/agContratValider/.test(h));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); fin(); process.exit(1); });
