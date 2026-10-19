/* ⛔ CE QUE CE FICHIER GARDE — LE REGISTRE DES CONTRATS (20 octobre 2026).
     · un texte naît BROUILLON ; seul `valider` le passe « validé », et le tampon (qui, quand, empreinte) est posé par le SERVEUR :
       un corps de requête qui prétend le fixer n'est pas lu ;
     · une version validée ne se modifie pas : corriger = une version de plus, à valider à son tour ; l'empreinte est celle du texte ;
     · SANS VERSION VALIDÉE, RIEN NE PART (`aucune_version_validee`) ; un brouillon n'est jamais « en vigueur » ;
     · un client garde la version du jour de son achat, même si une version plus récente est validée ensuite ; un dossier n'a pas
       deux contrats du même type ; un contrat ne peut être « accepté » avant d'avoir été envoyé ;
     · registre illisible : 503, rien n'est réécrit par-dessus ; écriture impossible : rien ne reste en mémoire non plus. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      reçu    : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2713-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
console.log('\n── 2713 · registre des contrats ──');
const mod = require(path.join(RACINE, 'server', 'contrats.js'));
let horloge = 1e12;
function monter(nom, o) {
  o = o || {}; const D = o.dossier || path.join(banc, nom); if (!o.dossier) fs.mkdirSync(D, { recursive: true });
  for (const [f, c] of Object.entries(o.fichiers || {})) fs.writeFileSync(path.join(D, f), c);
  const routes = {}, notes = [];
  const app = { get: (r, ...h) => { routes['GET ' + r] = h; }, post: (r, ...h) => { routes['POST ' + r] = h; } };
  const monAdmin = function monAdmin() {}, monPatronStrict = function monPatronStrict() {};
  const m = mod(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents: { noter: (id, a, x) => notes.push([id, a, x && x.resultat]) }, maintenant: () => ++horloge });
  const appeler = (cle, req) => { const h = routes[cle]; let code = 200, corps; const res = { status(c) { code = c; return this; }, json(j) { corps = j; return this; } }; h[h.length - 1](Object.assign({ body: {}, query: {}, tourUser: { nom: 'Justin' } }, req || {}), res); return { code, corps }; };
  return { m, D, routes, notes, appeler, lire: f => { try { return fs.readFileSync(path.join(D, f), 'utf8'); } catch (e) { return null; } } };
}
const T = 'conditions_op_gestion';

console.log('\n1. Brouillon, validation, tampon');
let M = monter('a');
v('au départ, aucune version en vigueur', M.m.enVigueur(T), null);
let b = M.m.brouillon(T, 'Article 1. Objet.\nArticle 2. Prix.', 'rédacteur', 'premier jet');
v('un brouillon naît numéro 1', [b.code, b.version.n, b.version.statut], [200, 1, 'brouillon']);
v('⛔ un brouillon n\'est jamais « en vigueur »', M.m.enVigueur(T), null);
v('texte vide, type inconnu, texte énorme : refus', [M.m.brouillon(T, '   ', 'x').code, M.m.brouillon('inventé', 'a', 'x').code, M.m.brouillon(T, 'a'.repeat(80001), 'x').code], [400, 400, 400]);
let r = M.appeler('POST /api/monitor/contrats/valider', { body: { type: T, n: 1, validePar: 'Quelqu\'un d\'autre', empreinte: 'truquée', valideLe: 5 }, tourUser: { nom: 'Justin Biret' } });
const V = JSON.parse(M.lire('contrats-documents.json'))[T][0];
v('la validation est posée par le serveur', [r.code, V.statut, V.validePar, V.valideLe > 5], [200, 'valide', 'Justin Biret', true]);
v('⛔ l\'empreinte est celle du texte, pas celle de la requête', V.empreinte, crypto.createHash('sha256').update(V.texte, 'utf8').digest('hex'));
v('la version est maintenant en vigueur, avec son tampon', [M.m.enVigueur(T).n, M.m.enVigueur(T).validePar, M.m.enVigueur(T).empreinte === V.empreinte], [1, 'Justin Biret', true]);
v('on ne valide pas deux fois', M.appeler('POST /api/monitor/contrats/valider', { body: { type: T, n: 1 } }).code, 409);
v('version inconnue : 404 ; sans nom : 400', [M.appeler('POST /api/monitor/contrats/valider', { body: { type: T, n: 9 } }).code, M.m.valider(T, 1, '').code], [404, 409]);
const b2 = M.m.brouillon(T, 'Article 1. Objet.\nArticle 2. Prix (révisé).', 'rédacteur');
v('corriger = une version de plus ; l\'ancienne reste en vigueur', [b2.version.n, M.m.enVigueur(T).n], [2, 1]);
vrai('⛔ la version validée n\'a pas bougé d\'une lettre', JSON.parse(M.lire('contrats-documents.json'))[T][0].texte === 'Article 1. Objet.\nArticle 2. Prix.');
v('sans nom, on ne valide pas', M.m.valider(T, 2, '').code, 400);
M.m.valider(T, 2, 'Justin Biret');
v('la version 2 validée devient la vigueur', M.m.enVigueur(T).n, 2);

console.log('\n2. Les contrats des clients');
v('un dossier mal formé ou un type inconnu : refus', [M.m.creerPourClient('DOS-1', T).raison, M.m.creerPourClient('DOS-000001; drop', T).raison, M.m.creerPourClient('DOS-000001', 'x').raison], ['dossier', 'dossier', 'type']);
const M1 = monter('b');
r = M1.m.creerPourClient('DOS-000001', T);
v('⛔ SANS VERSION VALIDÉE, RIEN NE PART', [r.ok, r.raison], [false, 'aucune_version_validee']);
vrai('…et le refus est noté dans le journal', M1.notes.some(n => n[1] === 'contrat : rien à envoyer' && n[2] === 'refuse'));
M1.m.brouillon(T, 'Version un', 'rédacteur'); M1.m.valider(T, 1, 'Justin');
const c1 = M1.m.creerPourClient('DOS-000001', T);
v('avec une version validée, le contrat est créé', [c1.ok, c1.contrat.version, c1.contrat.envoyeLe, c1.contrat.accepteLe], [true, 1, 0, 0]);
v('un même dossier n\'a pas deux contrats du même type', [M1.m.creerPourClient('DOS-000001', T).deja, JSON.parse(M1.lire('contrats-clients.json')).length], [true, 1]);
M1.m.brouillon(T, 'Version deux', 'rédacteur'); M1.m.valider(T, 2, 'Justin');
const c2 = M1.m.creerPourClient('DOS-000002', T);
v('un nouveau client reçoit la version du jour, l\'ancien garde la sienne', [c2.contrat.version, JSON.parse(M1.lire('contrats-clients.json')).find(c => c.dossier === 'DOS-000001').version], [2, 1]);
v('⛔ un contrat ne s\'accepte pas avant d\'avoir été envoyé', M1.m.marquerAccepte(c1.contrat.id).raison, 'pas_envoye');
v('envoyé, puis accepté', [M1.m.marquerEnvoye(c1.contrat.id).ok, M1.m.marquerAccepte(c1.contrat.id).ok], [true, true]);
const a1 = JSON.parse(M1.lire('contrats-clients.json')).find(c => c.id === c1.contrat.id);
vrai('…avec les deux dates, et l\'empreinte de ce que le client a reçu', a1.envoyeLe > 0 && a1.accepteLe >= a1.envoyeLe && a1.empreinte === M1.m.enVigueur(T).empreinte === false);
v('l\'acceptation ne se rejoue pas (la date ne bouge pas)', [M1.m.marquerAccepte(c1.contrat.id).deja, JSON.parse(M1.lire('contrats-clients.json')).find(c => c.id === c1.contrat.id).accepteLe], [true, a1.accepteLe]);
v('un contrat inconnu : refus', M1.m.marquerEnvoye('zzzz').raison, 'inconnu');
M1.m.marquerEnvoye(c2.contrat.id);
r = M1.appeler('GET /api/monitor/contrats');
v('le tableau de bord compte envoyés, acceptés, en attente', r.corps.clients, { total: 2, envoyes: 2, acceptes: 1, enAttente: 1 });
vrai('⛔ la liste ne porte aucun texte de contrat', !/Version (un|deux)/.test(JSON.stringify(r.corps)));
vrai('…ni l\'identité d\'un client, seulement un numéro de dossier', !/@/.test(JSON.stringify(M1.appeler('GET /api/monitor/contrats/clients').corps)));

console.log('\n3. Retirer une version');
r = M1.appeler('POST /api/monitor/contrats/retirer', { body: { type: T, n: 2 } });
v('⛔ retirer la dernière version est refusé : elle remettrait la 1 en vigueur sans nouvelle validation', [r.code, M1.m.enVigueur(T).n], [409, 2]);
v('on retire d\'abord la plus ancienne, puis la dernière', [M1.appeler('POST /api/monitor/contrats/retirer', { body: { type: T, n: 1 } }).code, M1.m.enVigueur(T).n, M1.appeler('POST /api/monitor/contrats/retirer', { body: { type: T, n: 2 } }).code], [200, 2, 200]);
v('un brouillon ne se « retire » pas', [M1.m.brouillon(T, 'x', 'a') && M1.appeler('POST /api/monitor/contrats/retirer', { body: { type: T, n: 3 } }).code], [409]);
v('⛔ __proto__ et constructor ne sont pas des types', [M1.m.brouillon('__proto__', 'a', 'x').code, M1.m.brouillon('constructor', 'a', 'x').code], [400, 400]);
v('les variantes du marqueur bloquent aussi', ['[A CONFIRMER x]', '[à confirmer]', '[ À  CONFIRMER]', '[À VÉRIFIER]'].map(t => { const X = monter('mv' + t.length); X.m.brouillon(T, 'Texte ' + t, 'x'); return X.m.valider(T, 1, 'J').code; }), [409, 409, 409, 409]);
const H = monter('h', { fichiers: { 'contrats-clients.json': '[{"id":"a","dossier":"DOS-000001","type":"t","version":1}]' } });
v('⛔ des contrats de clients sans registre de textes : illisible, on ne repart pas de zéro', [H.m.estIllisible(), H.m.brouillon(T, 'x', 'a').code], [true, 503]);
v('plus aucune version : retour à « rien ne part »', [M1.m.enVigueur(T), M1.m.creerPourClient('DOS-000009', T).raison], [null, 'aucune_version_validee']);

console.log('\n4. Les pannes');
const I = monter('c', { fichiers: { 'contrats-documents.json': '<<<' } });
v('⛔ registre illisible : tout refuse, rien n\'est en vigueur', [I.m.enVigueur(T), I.m.brouillon(T, 'a', 'x').code, I.m.valider(T, 1, 'J').code, I.m.creerPourClient('DOS-000001', T).raison, I.appeler('GET /api/monitor/contrats').code], [null, 503, 503, 'registre_illisible', 503]);
v('…et le fichier abîmé n\'a pas été réécrit', I.lire('contrats-documents.json'), '<<<');
const I2 = monter('c2', { fichiers: { 'contrats-clients.json': '{"a":1}' } });
v('contrats de clients de la mauvaise forme : illisible aussi', [I2.m.estIllisible(), I2.appeler('GET /api/monitor/contrats/clients').code], [true, 503]);
const P = monter('p', { dossier: path.join(banc, 'absent', 'encore') });   // dossier inexistant : toute écriture échoue
v('⛔ écriture impossible : 503, et rien ne reste en mémoire', [P.m.brouillon(T, 'a', 'x').code, P.m.enVigueur(T), P.appeler('GET /api/monitor/contrats').corps.types[0].versions.length], [503, null, 0]);
const S = monter('s'); S.m.brouillon(T, 'Persistant', 'x'); S.m.valider(T, 1, 'Justin');
v('un redémarrage retrouve la version validée et son tampon', monter('s', { dossier: S.D }).m.enVigueur(T).validePar, 'Justin');

console.log('\n5. Les gardes des routes');
v('lecture : administrateur ; écriture : patron seulement', [['GET /api/monitor/contrats', 'GET /api/monitor/contrats/version', 'GET /api/monitor/contrats/clients'].map(k => M.routes[k][0].name), ['POST /api/monitor/contrats/brouillon', 'POST /api/monitor/contrats/valider', 'POST /api/monitor/contrats/retirer'].map(k => M.routes[k][0].name)], [['monAdmin', 'monAdmin', 'monAdmin'], ['monPatronStrict', 'monPatronStrict', 'monPatronStrict']]);
v('la version se lit avec son texte, par l\'administrateur', M.appeler('GET /api/monitor/contrats/version', { query: { type: T, n: '2' } }).corps.version.texte.includes('révisé'), true);
v('une version inconnue : 404', M.appeler('GET /api/monitor/contrats/version', { query: { type: T, n: '99' } }).code, 404);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
