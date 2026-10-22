/* ⛔ CE QUE CE FICHIER GARDE — LA DIRECTION DES AGENTS : LA CHARTE D'AUTONOMIE ET LE RAPPORT DU JOUR (20 octobre 2026).
     · la charte dit, geste par geste, ce qu'un agent peut faire SEUL ; les gestes « fixes » (mise en demeure, texte d'un contrat,
       suppression de données) ne s'ouvrent JAMAIS, quelle que soit la requête ;
     · un geste inconnu, un réglage inconnu, un nombre hors bornes, une suspension avant la dernière relance : refus, rien n'est écrit ;
     · une charte illisible n'autorise RIEN et ne se réécrit pas par-dessus ; une requête refusée ne change rien sur le disque ;
     · le rapport vient du journal sans intelligence artificielle : fenêtre de temps, comptes par résultat, les échecs d'abord ;
       un journal illisible est un 503, jamais « rien ne s'est passé » ;
     · les routes : la charte se lit par l'administrateur, ne se modifie que par le patron. */
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      reçu    : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2712-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
console.log('\n── 2712 · direction des agents : charte et rapport ──');
const dir = require(path.join(RACINE, 'server', 'direction.js'));

function monter(nom, o) {
  o = o || {}; const D = path.join(banc, nom); fs.mkdirSync(D, { recursive: true });
  if (o.charte !== undefined) fs.writeFileSync(path.join(D, 'agents-charte.json'), o.charte);
  const routes = {}; const notes = [];
  const app = { get: (r, ...h) => { routes['GET ' + r] = h; }, post: (r, ...h) => { routes['POST ' + r] = h; } };
  const monAdmin = function monAdmin() {}, monPatronStrict = function monPatronStrict() {};
  const journal = o.journal || [];
  const agents = { AGENTS: [{ id: 'hugo', nom: 'Hugo' }, { id: 'max', nom: 'Max' }], noter: (id, a, x) => notes.push([id, a, x && x.detail]), lireJournal: () => journal.slice(), journalIllisible: () => o.journalIllisible === true };
  const m = dir(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, maintenant: () => 1e12 });
  const appeler = (cle, req) => { const h = routes[cle]; let code = 200, corps; const res = { status(c) { code = c; return this; }, json(j) { corps = j; return this; } }; h[h.length - 1](Object.assign({ body: {}, query: {}, tourUser: { nom: 'Justin' } }, req || {}), res); return { code, corps }; };
  return { m, D, routes, notes, appeler, monAdmin, monPatronStrict, fichier: () => { try { return fs.readFileSync(path.join(D, 'agents-charte.json'), 'utf8'); } catch (e) { return null; } } };
}

console.log('\n1. La charte');
let M = monter('a');
v('par défaut, envoyer le contrat est autorisé seul', M.m.autorise('envoyer_contrat'), { auto: true, raison: 'ok' });
v('par défaut, répondre aux clients reste en brouillon', M.m.autorise('repondre_client'), { auto: false, raison: 'brouillon' });
v('par défaut, rembourser reste en brouillon, plafond à 0 €', [M.m.autorise('rembourser').auto, M.m.reglage('rembourser', 'plafondEur')], [false, 0]);
v('⛔ la mise en demeure est toujours humaine', M.m.autorise('mise_en_demeure'), { auto: false, raison: 'humain' });
v('un geste inconnu n\'est jamais autorisé', M.m.autorise('virer_tout'), { auto: false, raison: 'inconnu' });
v('relances par défaut : 3 et 7 jours, suspension à 14', [M.m.reglage('relancer_impaye', 'jours'), M.m.reglage('suspendre_impaye', 'apresJours')], [[3, 7], 14]);

console.log('\n2. Ce que la route accepte — et ce qu\'elle refuse');
const ecrit = body => M.appeler('POST /api/monitor/agents/charte', { body: { gestes: body } });
let r = ecrit({ repondre_client: { auto: true } });
v('le patron ouvre « répondre aux clients »', [r.code, M.m.autorise('repondre_client').auto], [200, true]);
vrai('…et c\'est écrit sur disque', JSON.parse(M.fichier()).repondre_client.auto === true);
for (const f of ['mise_en_demeure', 'changer_contrat', 'supprimer_donnees']) {
  const avant = M.fichier(); r = ecrit({ [f]: { auto: true } });
  v('⛔ « ' + f + ' » ne s\'ouvre pas : 400, rien d\'écrit', [r.code, M.fichier() === avant, M.m.autorise(f).auto], [400, true, false]);
}
const refus = [
  ['geste inconnu', { virer_tout: { auto: true } }], ['réglage inconnu', { rembourser: { illimite: true } }],
  ['auto non booléen', { repondre_client: { auto: 'oui' } }], ['plafond négatif', { rembourser: { plafondEur: -5 } }],
  ['plafond au-dessus de la borne', { rembourser: { plafondEur: 100000 } }], ['plafond décimal', { rembourser: { plafondEur: 12.5 } }],
  ['jours non croissants', { relancer_impaye: { jours: [7, 3] } }], ['trop de jours', { relancer_impaye: { jours: [1, 2, 3, 4, 5] } }],
  ['suspension avant la dernière relance', { suspendre_impaye: { apresJours: 5 } }], ['réglage d\'un geste qui n\'en a pas', { envoyer_contrat: { apresJours: 3 } }],
  ['corps absent', undefined], ['corps tableau', [1]],
];
for (const [nom, c] of refus) { const avant = M.fichier(); r = ecrit(c); v('refus : ' + nom, [r.code, M.fichier() === avant], [400, true]); }
r = ecrit({ rembourser: { auto: true, plafondEur: 50 }, relancer_impaye: { jours: [2, 5, 9] }, suspendre_impaye: { apresJours: 21 } });
v('un réglage valide s\'applique', [r.code, M.m.reglage('rembourser', 'plafondEur'), M.m.reglage('relancer_impaye', 'jours'), M.m.reglage('suspendre_impaye', 'apresJours')], [200, 50, [2, 5, 9], 21]);
vrai('…et la modification est notée dans le journal', M.notes.some(n => n[0] === 'systeme' && n[1] === 'charte modifiée'));
const M2 = monter('a');   // même dossier : la charte survit à un redémarrage
vrai('la charte survit à un redémarrage', fs.existsSync(path.join(M.D, 'agents-charte.json')));
v('les routes sont gardées : lecture administrateur, écriture patron seulement', [M.routes['GET /api/monitor/agents/charte'][0].name, M.routes['POST /api/monitor/agents/charte'][0].name, M.routes['GET /api/monitor/agents/rapport'][0].name], ['monAdmin', 'monPatronStrict', 'monAdmin']);

console.log('\n3. Une charte illisible n\'autorise rien');
const D3 = monter('c', { charte: '<<<' });
v('rien ne passe en auto', [D3.m.autorise('envoyer_contrat').auto, D3.m.autorise('envoyer_contrat').raison], [false, 'charte_illisible']);
v('la lecture dit 503, pas une charte vide', D3.appeler('GET /api/monitor/agents/charte').code, 503);
v('l\'écriture dit 503 et ne réécrit pas par-dessus', [D3.appeler('POST /api/monitor/agents/charte', { body: { gestes: { repondre_client: { auto: true } } } }).code, D3.fichier()], [503, '<<<']);
const D4 = monter('d', { charte: JSON.stringify({ mise_en_demeure: { auto: true } }) });
v('⛔ un fichier qui ouvre un geste fixe est tenu pour illisible', D4.m.autorise('envoyer_contrat').raison, 'charte_illisible');

console.log('\n4. Le rapport du jour');
const T = 1e12, H = 3600 * 1000;
const J = [
  { ts: T - 30 * H, agent: 'hugo', action: 'trop ancien', resultat: 'ok' },
  { ts: T - 5 * H, agent: 'hugo', action: 'relire Stripe', resultat: 'ok' },
  { ts: T - 4 * H, agent: 'hugo', action: 'créer un espace', cible: 'DOS-000007', resultat: 'propose', detail: 'à valider' },
  { ts: T - 3 * H, agent: 'max', action: 'lire la santé', resultat: 'erreur', detail: 'panne' },
  { ts: T - 2 * H, agent: 'max', action: 'écrire', resultat: 'refuse' },
  { ts: T - 1 * H, agent: 'max', action: 'lire', resultat: 'ok' },
  { ts: T + 5 * H, agent: 'max', action: 'dans le futur', resultat: 'ok' },
];
const MR = monter('r', { journal: J }); r = MR.appeler('GET /api/monitor/agents/rapport'); const R = r.corps.rapport;
v('fenêtre de 24 h : l\'ancien et le futur n\'y sont pas', R.total, 5);
v('comptes par résultat', [R.ok, R.propose, R.erreur, R.refuse], [2, 1, 1, 1]);
v('les échecs d\'abord, puis les refus, puis ce qui attend', R.lignes.slice(0, 3).map(l => l.resultat), ['erreur', 'refuse', 'propose']);
v('par agent, avec son nom', R.parAgent.map(a => [a.nom, a.faits, a.erreurs, a.refuses]), [['Max', 3, 1, 1], ['Hugo', 2, 0, 0]]);
v('une fenêtre plus large reprend l\'ancien', MR.appeler('GET /api/monitor/agents/rapport', { query: { heures: '48' } }).corps.rapport.total, 6);
v('une durée absurde est bornée, pas obéie', MR.appeler('GET /api/monitor/agents/rapport', { query: { heures: '9999999' } }).code, 200);
v('⛔ journal illisible : 503, jamais « rien ne s\'est passé »', monter('r2', { journalIllisible: true }).appeler('GET /api/monitor/agents/rapport').code, 503);
v('journal vide : rapport vide, lisible', monter('r3').appeler('GET /api/monitor/agents/rapport').corps.rapport.total, 0);
const big = Array.from({ length: 200 }, (x, i) => ({ ts: T - 1000 - i, agent: 'max', action: 'a' + i, resultat: 'ok' }));
const RB = monter('r4', { journal: big }).appeler('GET /api/monitor/agents/rapport').corps.rapport;
v('les lignes sont plafonnées à 60, et le dit', [RB.total, RB.lignes.length, RB.tronque], [200, 60, true]);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
