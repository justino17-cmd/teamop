/* ⛔ CE QUE CE FICHIER GARDE — LES PAQUETS DE CONTRATS PAR ABONNEMENT (20 octobre 2026).
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
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2715-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
console.log('\n── 2715 · registre des contrats ──');
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

const TXT = path.join(RACINE, 'server', 'contrats-textes');
const types = Object.keys(mod.TYPES), paquets = Object.keys(mod.PAQUETS);

console.log('\n1. Les textes rédigés existent, un par pièce');
v('⛔ chaque type du registre a son texte rédigé', types.filter(t => !fs.existsSync(path.join(TXT, t + '.txt'))), []);
v('six formules (3 OP GESTION, 3 OP MESSAGES) ont chacune un paquet', paquets.length, 6);
v('chaque paquet = générales + application + SA formule + sous-traitance + signature', paquets.every(k => { const p = mod.PAQUETS[k]; const [app, f] = k.split(':'); return p[0] === 'conditions_generales' && p[1] === 'conditions_' + app && p[2] === 'cp_' + app + '_' + f && p.includes('dpa') && p.includes('signature_electronique'); }), true);
v('les prix écrits dans les conditions particulières sont ceux de la page tarifs', ['cp_op_gestion_pro:15 €', 'cp_op_gestion_business:25 €', 'cp_op_gestion_business_premium:50 €', 'cp_op_messages_pro:15 €', 'cp_op_messages_business_premium:25 €'].every(x => { const [t, p] = x.split(':'); return fs.readFileSync(path.join(TXT, t + '.txt'), 'utf8').includes('Prix : ' + p + ' par mois'); }), true);

console.log('\n2. Le semis : des BROUILLONS, jamais validés');
const M = monter('a', {}); 
const D1 = path.join(banc, 'sem'); fs.mkdirSync(D1);
const Ms = (() => { const r = {}; const app = { get() {}, post() {} }; return mod(app, { DATA_DIR: D1, monAdmin() {}, monPatronStrict() {}, textesDir: TXT, maintenant: () => ++horloge }); })();
const notes0 = []; mod({ get() {}, post() {} }, { DATA_DIR: fs.mkdtempSync(path.join(banc, 'sj-')), monAdmin() {}, monPatronStrict() {}, textesDir: TXT, agents: { noter: (...a) => notes0.push(a) } });
v('⛔ le semis ne pollue pas le rapport du jour (aucun geste noté)', notes0.length, 0);
const reg = JSON.parse(fs.readFileSync(path.join(D1, 'contrats-documents.json'), 'utf8'));
v('toutes les pièces sont entrées', Object.keys(reg).sort(), types.slice().sort());
v('⛔ aucune n\'est validée par le semis', Object.values(reg).every(l => l.every(x => x.statut === 'brouillon')), true);
v('un second démarrage ne double rien', (() => { mod({ get() {}, post() {} }, { DATA_DIR: D1, monAdmin() {}, monPatronStrict() {}, textesDir: TXT }); return Object.values(JSON.parse(fs.readFileSync(path.join(D1, 'contrats-documents.json'), 'utf8'))).every(l => l.length === 1); })(), true);
v('⛔ aucun contrat ne part tant que rien n\'est validé', Ms.creerPaquet('DOS-000001', 'op_gestion', 'pro'), { ok: false, raison: 'aucune_version_validee', manquantes: mod.PAQUETS['op_gestion:pro'] });

console.log('\n3. Un texte qui porte « À CONFIRMER » ne se valide pas');
const bloque = types.filter(t => Ms.valider(t, 1, 'Justin').code === 409);
v('au moins les pièces à trancher sont refusées', bloque.length > 0, true);
v('le refus nomme la raison', Ms.valider(bloque[0], 1, 'Justin').error.includes('À CONFIRMER'), true);
const N = monter('n'); N.m.brouillon('dpa', 'Texte propre.', 'x'); 
v('un texte propre se valide', N.m.valider('dpa', 1, 'Justin').code, 200);
v('même un [À COMPLÉTER] bloque', (() => { N.m.brouillon('cp_op_gestion_pro', 'Prix [À COMPLÉTER]', 'x'); return N.m.valider('cp_op_gestion_pro', 1, 'Justin').code; })(), 409);

console.log('\n4. Le paquet d\'un abonnement');
const Q = monter('q');
const propre = t => { Q.m.brouillon(t, 'Texte ' + t, 'x'); return Q.m.valider(t, Q.m.enVigueur(t) ? 2 : 1, 'Justin').code; };
['conditions_generales', 'conditions_op_gestion', 'dpa', 'signature_electronique'].forEach(propre);
let r = Q.m.creerPaquet('DOS-000002', 'op_gestion', 'pro');
v('⛔ il manque SA formule : rien ne part, et on dit laquelle', [r.ok, r.raison, r.manquantes], [false, 'aucune_version_validee', ['cp_op_gestion_pro']]);
propre('cp_op_gestion_pro');
r = Q.m.creerPaquet('DOS-000002', 'op_gestion', 'pro');
v('le paquet complet se crée, cinq pièces figées', [r.ok, r.contrat.pieces.length, r.contrat.pieces.every(p => p.version === 1 && /^[0-9a-f]{64}$/.test(p.empreinte))], [true, 5, true]);
v('un second appel rend le même contrat', [Q.m.creerPaquet('DOS-000002', 'op_gestion', 'pro').deja, Q.m.creerPaquet('DOS-000002', 'op_gestion', 'pro').contrat.id], [true, r.contrat.id]);
Q.m.brouillon('cp_op_gestion_pro', 'Texte corrigé', 'x'); Q.m.valider('cp_op_gestion_pro', 2, 'Justin');
v('⛔ une pièce corrigée ensuite ne change pas le contrat déjà créé', Q.m.creerPaquet('DOS-000002', 'op_gestion', 'pro').contrat.pieces.find(p => p.type === 'cp_op_gestion_pro').version, 1);
const r2 = Q.m.creerPaquet('DOS-000005', 'op_gestion', 'pro').contrat.pieces.find(p => p.type === 'cp_op_gestion_pro');
v('⛔ un NOUVEAU client reçoit la version en vigueur (2) avec l\'empreinte du texte exact', [r2.version, r2.empreinte], [2, mod.sha('Texte corrigé')]);
v('une formule inconnue, un dossier mal formé : refus', [Q.m.creerPaquet('DOS-000002', 'op_gestion', 'inventee').raison, Q.m.creerPaquet('X', 'op_gestion', 'pro').raison], ['formule', 'dossier']);
v('la formule Business n\'est pas couverte par la pièce Pro', Q.m.creerPaquet('DOS-000003', 'op_gestion', 'business').manquantes, ['cp_op_gestion_business']);
v('envoyé puis accepté, comme tout contrat', [Q.m.marquerAccepte(r.contrat.id).raison, Q.m.marquerEnvoye(r.contrat.id).ok, Q.m.marquerAccepte(r.contrat.id).ok], ['pas_envoye', true, true]);
const lst = Q.appeler('GET /api/monitor/contrats').corps;
v('la liste de la Tour donne groupes, paquets et leurs manquantes', [Object.keys(lst.groupes), lst.paquets.length, lst.paquets.find(p => p.cle === 'op_gestion:pro').manquantes], [['generales', 'op_gestion', 'op_messages', 'annexes'], 6, []]);
const I = monter('i', { fichiers: { 'contrats-clients.json': '{pas du json' } });
v('registre des clients illisible : pas de paquet, rien réécrit', [I.m.creerPaquet('DOS-000004', 'op_gestion', 'pro').raison, I.lire('contrats-clients.json')], ['registre_illisible', '{pas du json']);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
