/* test-3099 — LA TOUR : « EFFACER DE LA SURVEILLANCE » (28 octobre 2026, Tour v2.118 non publiée).
 *
 * Justin : « on peut supprimer l'historique ». Sur la fiche d'une entreprise, dans Surveillance → « Entreprises touchées », un bouton
 * « Effacer de la surveillance » n'est offert qu'au PATRON, une fois la liste des entreprises LUE, à une entreprise qui n'est plus dans
 * l'annuaire. Ce banc fait parler les VRAIES fonctions de la Tour (`survPurgeable`, `survPurger`, `vueEntreprise`, extraites de `tour.html`) au
 * VRAI serveur, isolé sur 127.0.0.1. Il lit `tour.html` : il n'entre dans `scripts/bancs-serveur.liste` que le jour où la Tour qui porte le bouton est
 * publiée (les routes qu'il joue sont gardées, elles, par `test-3098`, qui ne lit aucune page).
 */
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
const SRC_TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3099-'));
let enfant = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

/* ── les vraies fonctions de la Tour ── */
const CODE = SRC_TOUR.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function bloc(motif) {
  const m = new RegExp('\\n(?:async )?function ' + motif + '\\(|\\nvar ' + motif + '\\s*=').exec(CODE); if (!m) return '';
  const suite = /\n(?:async function |function |var |setInterval|document\.|\(function\(\)|<\/script>)/g; suite.lastIndex = m.index + 8;
  const f = suite.exec(CODE);
  return CODE.slice(m.index + 1, f ? f.index : CODE.length);
}
const NOMS = ['hAuth', 'srvRepond', 'srvMuet', 'apiGet', 'apiPost', 'msgErreur', 'esc', 'jsq', 'nMot', 'fmtAgo', 'appDe', 'appVisible', 'incDeLaConsole', 'incOuverts',
  'incFiltres', 'incEnts', 'entParNom', 'entRetour', 'chargerEntreprises', 'chargerIncidents', 'survPurgeable', 'survPurger', 'vueEntreprise'];
const VARS = ['INC', 'ENT', 'ENT_INCONNUE', 'INJOIGNABLE', 'APPS_TOUR'];
const SRC = NOMS.map(bloc), SRCV = VARS.map(bloc);

function tour(API, jeton, o) {
  o = o || {};
  const toasts = [], envois = [], confirms = [], ctx = { fetch, URL, Object, String, JSON, Promise, Math, Date, Array, Error, Number, document: { getElementById: () => null }, console };
  vm.createContext(ctx);
  vm.runInContext('var API=' + JSON.stringify(API) + ', TOKEN=' + JSON.stringify(jeton) + ', APP=' + JSON.stringify(o.app || 'gestion') + ", TAB='surveillance', MYROLE=" + JSON.stringify(o.role || 'patron') + ", MYNOM='Patron', MYAPPS=['gestion','messages'];\n" +
    "var IC={cadenas:''}; function doLogout(){} function srvEtat(){} function render(){} function rafraichirSiConcerne(){} function setBdg(){} function majCompteursApp(){} function majBarreBas(){} function incNoteEnCours(){ return false; } function renderNav(){}\n" +
    /* les mises en page voisines, réduites à rien : on garde la vraie `vueEntreprise`, pas ce qu'elle appelle pour décorer */
    "var TYPE_L={erreur:'Erreur'}, ST_P={nouveau:'p-ambre'}, ST_L={nouveau:'Nouveau'}, APP_L={opgestion:'OP GESTION'};\n" +
    "function gravite(){ return 'faible'; } function incTitre(i){ return i.message||i.id; } function incSegStatut(){ return {segs:'',cour:'',affine:false}; } function teteListe(){ return ''; } function incAffinePastille(){ return ''; }\n" +
    "function vueInfo(){ return {section:'Support',lib:'Surveillance'}; } function incF(){} function incReset(){} function selIncident(){} function allerFicheEntreprise(){} function setTab(){}\n" +
    SRCV.join('\n') + '\n' + SRC.join('\n'), ctx);
  ctx.toast = (t) => { toasts.push(t); };
  ctx.confirm = (t) => { confirms.push(t); return o.confirme !== false; }; ctx.alert = (t) => { toasts.push('ALERTE ' + t); };
  const vraiPost = ctx.apiPost; ctx.apiPost = (u, b) => { envois.push([u, b]); return vraiPost(u, b); };
  return { ctx, toasts, envois, confirms, run: (code) => vm.runInContext(code, ctx),
    attendre: async (cond, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await vm.runInContext(cond, ctx)) return true; await dormir(40); } return false; } };
}
const texte = (h) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const libre = () => new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });


(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  console.log('\n── 3099 · 0. population ──');
  vrai('les ' + NOMS.length + ' fonctions et les ' + VARS.length + ' variables de la Tour sont trouvées', SRC.every(Boolean) && SRCV.every(Boolean));
  if (!(SRC.every(Boolean) && SRCV.every(Boolean))) { console.log('      manquent : ' + [...NOMS.filter((n, i) => !SRC[i]), ...VARS.filter((n, i) => !SRCV[i])].join(', ')); process.exit(1); }

  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ 'vivante-services': { t: 't-viv-3099', nom: 'Vivante Services', email: 'viv@exemple-3099.fr', code: code64('t-viv-3099'), ts: Date.now() } }));
  const MDP = 'mot-de-passe-du-banc-3099', MDP_C = 'collaborateur-3099-long';
  const N = Date.now();
  const ent = (nom, email, count) => Object.assign({ nom, count, lastTs: N - 1000 }, email ? { email } : {});
  const inc = (id, entreprises, count) => ({ id, signature: id + '|sig', app: 'opgestion', statut: 'nouveau', type: 'erreur', message: 'Erreur ' + id, count, firstTs: N - 5000, lastTs: N - 500, entreprises, appareils: { iPhone: count }, notes: '' });
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({
    users: [{ id: 'upatron3099', nom: 'Patron', hash: sha(MDP), role: 'patron', actif: true, ts: 1 }, { id: 'ucollab3099', nom: 'Gaston', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['gestion'] }],
    issues: [inc('i4', [ent('Vivante Services', 'v@exemple-3099.fr', 6)], 6), inc('i5', [ent('Ancienne Entreprise', 'old@ancienne-3099.fr', 9)], 9),
      inc('i6', [ent('Ancienne Entreprise', 'old@ancienne-3099.fr', 2), ent('Vivante Services', '', 1)], 3)], archive: [], journal: [], actions: [] }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: sha(MDP) }));
  const PORT = await libre();
  enfant = spawn(process.execPath, [SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
    TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre', vivant);
  if (!vivant) process.exit(1);
  const login = async (nom, pass) => (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom, pass }) })).json()).token;
  const PATRON = await login('Patron', MDP), COLLAB = await login('Gaston', MDP_C);
  vrai('le patron et le collaborateur ouvrent la Tour', PATRON && COLLAB);
  const mon = () => JSON.parse(fs.readFileSync(path.join(banc, 'monitor.json'), 'utf8'));
  const issuesVivantes = async () => (await (await fetch(B + '/api/monitor/issues', { headers: { Authorization: 'Bearer ' + PATRON } })).json()).issues;

  console.log('\n── 3099 · 1. le bouton n\'est offert qu\'au patron, à une entreprise absente de l\'annuaire ──');
  const TP = tour(B, PATRON), TC = tour(B, COLLAB, { role: 'collaborateur' }), TM = tour(B, PATRON, { app: 'messages' });
  for (const T of [TP, TC, TM]) { T.run('chargerIncidents(); chargerEntreprises()'); }
  vrai('population : la Tour lit les incidents ET la liste des entreprises', (await TP.attendre('INC.loaded&&ENT.loaded&&INC.list.length===3')) && (await TC.attendre('INC.loaded&&ENT.loaded')) && (await TM.attendre('INC.loaded&&ENT.loaded')));
  vrai('   la liste des entreprises porte celle de l\'annuaire (population du « existe encore »)', TP.run('ENT.liste.filter(function(o){ return /vivante/i.test(o.nom||o.slug); }).length') === 1);
  v('patron, console OP GESTION, entreprise partie : le bouton est permis', TP.run("survPurgeable('Ancienne Entreprise')"), true);
  v('⛔ la même, mais une entreprise de l\'annuaire (Vivante Services) : non', TP.run("survPurgeable('Vivante Services')"), false);
  v('⛔ une entreprise de l\'annuaire, autre graphie (le nom d\'accès) : non', TP.run("survPurgeable('vivante-services')"), false);
  v('⛔ collaborateur : non', TC.run("survPurgeable('Ancienne Entreprise')"), false);
  v('⛔ console OP MESSAGES : non (ses entreprises ne sont pas celles de l\'annuaire d\'OP GESTION)', TM.run("survPurgeable('Ancienne Entreprise')"), false);
  v('⛔ « Entreprise non identifiée » (les incidents sans nom) : non', TP.run('survPurgeable(ENT_INCONNUE)'), false);
  TP.run('ENT.loaded=false'); v('⛔ liste pas encore lue : non — on ne propose pas d\'effacer sur « on ne sait pas »', TP.run("survPurgeable('Ancienne Entreprise')"), false);
  TP.run("ENT.loaded=true; ENT.err='illisible'"); v('⛔ liste illisible : non', TP.run("survPurgeable('Ancienne Entreprise')"), false);
  TP.run("ENT.err=''");
  /* la VRAIE fonction de rendu de la fiche d'une entreprise */
  const fiche = (T, nom) => { try { return T.run('vueEntreprise(' + JSON.stringify(nom) + ')'); } catch (e) { return 'ERREUR ' + e.message; } };
  const h = fiche(TP, 'Ancienne Entreprise');
  vrai('fiche d\'une entreprise partie, patron : le bouton « Effacer de la surveillance » est dans la page', /Effacer de la surveillance/.test(h) && /survPurger\('Ancienne Entreprise'\)/.test(h));
  vrai('   il est rangé dans les actions de la page, en bouton « danger » de la Tour (aucun CSS neuf)', /class="btn-fant danger" onclick="survPurger\(/.test(h) && /class="page-act">.*survPurger/.test(h));
  v('   population : la fiche montre bien les deux incidents de cette entreprise', (h.match(/selIncident\(/g) || []).length, 2);
  vrai('⛔ fiche d\'une entreprise de l\'annuaire : pas de bouton, mais « Voir sa fiche complète »', !/Effacer de la surveillance/.test(fiche(TP, 'Vivante Services')) && /Voir sa fiche complète/.test(fiche(TP, 'Vivante Services')));
  vrai('⛔ fiche vue par un collaborateur : pas de bouton (mais la fiche s\'affiche : population)', !/Effacer de la surveillance/.test(fiche(TC, 'Ancienne Entreprise')) && /Voir sa fiche complète/.test(fiche(TC, 'Ancienne Entreprise')));

  console.log('\n── 3099 · 2. effacer (la vraie fonction, le vrai serveur) ──');
  TP.run("survPurger('Vivante Services')");
  vrai('⛔ sur une entreprise de l\'annuaire la fonction refuse elle-même : aucune demande envoyée, aucune question posée', TP.envois.length === 0 && TP.confirms.length === 0 && TP.toasts.some(t => /existe encore/.test(t)));
  TP.run("survPurger('Ancienne Entreprise')");
  for (let i = 0; i < 100 && !TP.envois.length; i++) await dormir(40);
  v('la demande est partie, avec le nom exact de la ligne (et rien d\'autre)', JSON.stringify(TP.envois[0]), JSON.stringify(['/api/monitor/issues/purger-entreprise', { nom: 'Ancienne Entreprise' }]));
  vrai('   la confirmation dit le nombre de problèmes (2), les adresses, et que c\'est définitif', TP.confirms.length === 1 && /2 problèmes/.test(TP.confirms[0]) && /adresses e-mail/.test(TP.confirms[0]) && /DÉFINITIF/.test(TP.confirms[0]));
  for (let i = 0; i < 100 && !TP.toasts.some(t => /Surveillance effacée/.test(t)); i++) await dormir(40);
  vrai('   le toast donne les nombres', TP.toasts.some(t => /Surveillance effacée : 1 incident, 0 ligne brute/.test(t)));
  vrai('   la fiche est refermée et la liste relue : plus que deux incidents', (await TP.attendre('INC.list.length===2 && INC.grp===null')) && (await issuesVivantes()).length === 2);
  vrai('   côté serveur : l\'adresse est partie, Vivante intacte', !/ancienne-3099/.test(JSON.stringify(mon().issues)) && mon().issues.some(i => i.id === 'i4'));
  const TN = tour(B, PATRON, { confirme: false }); TN.run('chargerIncidents(); chargerEntreprises()'); await TN.attendre('INC.loaded&&ENT.loaded');
  const avant = (await issuesVivantes()).length;
  TN.run("survPurger('Orpheline Absente')");
  await dormir(300);
  vrai('⛔ refuser la question n\'envoie rien (population : la question a été posée)', TN.confirms.length === 1 && TN.envois.length === 0 && avant === 2);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc tombé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
