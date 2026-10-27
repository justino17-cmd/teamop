/* ⛔ CE QUE CE FICHIER GARDE — LES DÉCISIONS DE PAULINE, DE LA TOUR AU MAC (27 octobre 2026).
     Justin : « je peux pas être tout le temps sur le site de Harvey ; que Pauline m'envoie le mail dans la messagerie de la Tour, j'accepte, je refuse, je modifie, et quand
     j'accepte elle l'envoie. » La Tour pose une décision (`POST /api/monitor/pauline/decision`, patron seul) ; le Mac vient la chercher (`GET /api/pauline/decisions`, le jeton du
     relevé), l'applique dans la base de Harvey et rend compte (`POST /api/pauline/decisions/resultats`).
       1. le module, sans serveur : la validation d'une décision, « attend l'accord », l'élagage, les nouveaux à signaler — et la NOTIFICATION : une seule par courriel, des nombres seulement ;
       2. le VRAI serveur : on ne décide que sur un courriel qui ATTEND l'accord dans le dernier relevé (ni parti, ni déjà accepté, ni inconnu) ; patron seul ; une réponse garde son objet ;
          le Mac : jeton AVANT tout (un corps de 1 Mo avec un mauvais jeton = 401), il ne voit que les décisions « à faire » ; son compte rendu clôt la décision, et on ne redécide pas
          un courriel traité ; le fichier est chiffré avec la clé maître ; AUCUN texte de courriel dans le journal ;
       3. la COUTURE : le VRAI script du Mac contre le VRAI serveur — une décision prise par la route de la Tour arrive dans la base de Harvey, et la Tour voit « fait ». */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const P = require(path.join(RACINE, 'server', 'pauline.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 240 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 240000).unref();
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const tmp = [];
process.on('exit', () => { for (const d of tmp) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} } });

const OBJET = 'Objet-secret-3079', TEXTE = 'Texte-secret-3079 pour le dirigeant', NOM = 'Zébulon-Clim-3079', TEXTE_JUSTIN = 'Texte-de-Justin-3079';
const FUITES = [OBJET, 'Texte-secret-3079', NOM, TEXTE_JUSTIN];
const JETON = 'jeton-de-banc-' + crypto.randomBytes(24).toString('hex'), EMPREINTE = sha(JETON);
const maint = Date.now(), iso = d => new Date(maint + d).toISOString();
function releve() {
  return { version: 1, genereLe: iso(0), chauffe: { debut: null, jour: null, plafondDuJour: 10 },
    jour: { envoyes: 0, reponses: 0, refus: 0, enAttente: 2 }, recherches: [],
    entreprises: [{ id: 'c1', nom: NOM, ville: 'Niort', metier: 'climatisation', etat: 'courriel_pret', email: 'patron@zebulon-clim.fr', majLe: iso(-60e3) }],
    courriels: [
      { id: 'o-tour', entrepriseId: 'c1', etat: 'en_attente', objet: OBJET, texte: TEXTE, quand: iso(-1000), genre: 'sequence', etape: 1, statutBrut: 'pending_review' },
      { id: 'o-reponse', entrepriseId: 'c1', etat: 'en_attente', objet: 'Re: Votre planning', texte: 'Merci', quand: iso(-900), genre: 'reponse', statutBrut: 'pending_review' },
      { id: 'o-accepte', entrepriseId: 'c1', etat: 'en_attente', objet: 'x', texte: 'y', quand: iso(-800), statutBrut: 'approved' },
      { id: 'o-parti', entrepriseId: 'c1', etat: 'envoye', objet: 'x', texte: 'y', quand: iso(-700), statutBrut: 'sent' }],
    reponses: [] };
}

(async () => {
  console.log('\n── 3079 · Les décisions de Pauline (Tour → Mac) ──');

  console.log('\n1. Le module');
  v('accepter, refuser : acceptés sans texte', [P.validerDecision({ id: 'o1', action: 'accepter' }), P.validerDecision({ id: 'o1', action: 'refuser', texte: 'ignoré' })],
    [{ ok: true, id: 'o1', decision: { action: 'accepter' } }, { ok: true, id: 'o1', decision: { action: 'refuser' } }]);
  v('modifier : objet et texte nettoyés (contrôles retirés, fins de ligne gardées)', P.validerDecision({ id: 'o1', action: 'modifier', objet: ' Objet\u0007 ', texte: 'a\nb\u0000c' }),
    { ok: true, id: 'o1', decision: { action: 'modifier', objet: 'Objet', texte: 'a\nbc' } });
  v('⛔ refus : action inconnue, id illisible, modifier sans objet ou sans texte, corps qui n’est pas un objet',
    [P.validerDecision({ id: 'o1', action: 'envoyer' }).ok, P.validerDecision({ id: '../x', action: 'accepter' }).ok, P.validerDecision({ id: 'o1', action: 'modifier', objet: '', texte: 'x' }).ok,
      P.validerDecision({ id: 'o1', action: 'modifier', objet: 'x', texte: '  ' }).ok, P.validerDecision([]).ok], [false, false, false, false, false]);
  v('« attend l’accord » : en_attente ET pending_review (ou statut inconnu) — pas « approved », pas « sending »',
    [{ etat: 'en_attente', statutBrut: 'pending_review' }, { etat: 'en_attente' }, { etat: 'en_attente', statutBrut: 'approved' }, { etat: 'en_attente', statutBrut: 'sending' }, { etat: 'envoye' }].map(P.attendAccord),
    [true, true, false, false, false]);
  const el = P.elaguerDecisions({ decisions: { vieux: { action: 'accepter', etat: 'fait', le: iso(-40 * 86400e3) }, neuf: { action: 'refuser', etat: 'a_faire', le: iso(-1000) },
    faux: { action: 'détruire', etat: 'a_faire', le: iso(0) }, '__proto__': { action: 'accepter', etat: 'a_faire', le: iso(0) } }, vus: ['a', 3, '../b'] }, maint);
  v('élagage : 30 jours, formes vérifiées, identifiants vus propres', [Object.keys(el.decisions), el.vus], [['neuf'], ['a']]);
  v('à faire : les plus anciennes d’abord, sans l’état ni la date', P.decisionsAFaire({ decisions: { b: { action: 'refuser', etat: 'a_faire', le: iso(-10) }, a: { action: 'modifier', objet: 'o', texte: 't', etat: 'a_faire', le: iso(-20) }, c: { action: 'accepter', etat: 'fait', le: iso(-30) } } }),
    [{ id: 'a', action: 'modifier', objet: 'o', texte: 't' }, { id: 'b', action: 'refuser' }]);

  {
    const dos = fs.mkdtempSync(path.join(os.tmpdir(), 'pau3079-')); tmp.push(dos);
    const notifs = [];
    const M = P(null, { DATA_DIR: dos, config: {}, monPatronStrict: null, sansMinuterie: true, pousseNotif: (t, c, u) => { notifs.push([t, c, u]); return Promise.resolve(1); } });
    const r = P.validerReleve(releve(), maint).releve;
    v('signalés au premier relevé : les DEUX courriels qui attendent l’accord (pas l’accepté, pas le parti)', M.signalerNouveaux(r), 2);
    v('second relevé identique : rien de neuf, aucune notification de plus', M.signalerNouveaux(r), 0);
    await new Promise(res => setTimeout(res, 20));
    v('UNE notification, des nombres seulement, vers la messagerie de la Tour', notifs, [['Pauline', '2 nouveaux mails attendent ton accord', '/tour.html#messagerie']]);
    vrai('⛔ aucun nom, objet ni texte de prospect dans la notification', !FUITES.some(f => JSON.stringify(notifs).includes(f)));
    fs.writeFileSync(path.join(dos, P.FICHIER_DEC), '{cassé');
    v('⛔ fichier des décisions illisible : lireDec rend null (jamais « aucune décision »), rien n’est signalé ni écrasé', [M.lireDec(), M.signalerNouveaux(r), fs.readFileSync(path.join(dos, P.FICHIER_DEC), 'utf8')], [null, 0, '{cassé']);
  }

  const SRC = fs.readFileSync(path.join(RACINE, 'server', 'pauline.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('la décision de la Tour est au patron seul', /app\.post\('\/api\/monitor\/pauline\/decision', monPatronStrict,/.test(SRC));
  vrai('⛔ aucun console.* du module ne cite une décision, un objet ou un texte', (SRC.match(/console\.(?:log|error|warn|info)\([^;]*\);/g) || []).every(l => !/decision\.|\.objet|\.texte|req\.body/i.test(l.replace(/'[^']*'/g, ''))));
  const IDX = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
  vrai('⛔ le compte rendu du Mac est écarté du gros analyseur JSON (jeton AVANT la lecture du corps)', /CHEMIN_PAULINE = \/\^\\\/api\\\/pauline\\\/\(\?:releve\|decisions\\\/resultats\)/.test(IDX));

  const SAUT = !fs.existsSync(path.join(RACINE, 'server', 'node_modules', 'express'));
  if (SAUT) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const { demarrer } = require('./banc-serveur-gestion.js');
  const brut = async (S, methode, route, entetes, corps) => { const r = await fetch(S.B + route, { method: methode, headers: entetes || {}, body: corps }); const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, j: j || {}, txt }; };
  let adr = 0;
  const ip = () => '10.79.' + ((++adr >> 8) & 255) + '.' + (adr & 255);
  const mac = (S, methode, route, corps, jeton) => brut(S, methode, route, Object.assign({ 'X-Forwarded-For': ip() }, jeton === '' ? {} : { Authorization: 'Bearer ' + (jeton || JETON) }, corps !== undefined ? { 'Content-Type': 'application/json' } : {}), corps !== undefined ? (typeof corps === 'string' ? corps : JSON.stringify(corps)) : undefined);
  const decider = (S, corps, jeton) => S.post('/api/monitor/pauline/decision', corps, jeton);

  console.log('\n2. Le vrai serveur (clé maître posée)');
  const KEK = crypto.randomBytes(32).toString('hex');
  const S = await demarrer({ config: { pauline: { jetonSha256: EMPREINTE } }, env: { TEAMOP_KEK: KEK } });
  vrai('le serveur démarre', S.vivant, S.journal().slice(-300));
  if (S.vivant) {
    v('avant tout relevé : décider est refusé (409, on ne décide pas sur un mail qu’on ne voit pas)', (await decider(S, { id: 'o-tour', action: 'accepter' })).s, 409);
    v('le relevé passe', (await mac(S, 'POST', '/api/pauline/releve', releve())).s, 200);
    const g0 = await S.get('/api/monitor/pauline');
    v('la Tour lit des décisions vides (un objet, pas null)', [g0.s, g0.j.decisions], [200, {}]);
    v('⛔ collaborateur et anonyme : 403', [(await decider(S, { id: 'o-tour', action: 'accepter' }, S.TA)).s, (await decider(S, { id: 'o-tour', action: 'accepter' }, '')).s], [403, 403]);
    v('⛔ action inconnue : 400', (await decider(S, { id: 'o-tour', action: 'envoyer' })).s, 400);
    v('⛔ courriel inconnu, déjà parti, déjà accepté : 409', [(await decider(S, { id: 'o-fantome', action: 'accepter' })).s, (await decider(S, { id: 'o-parti', action: 'refuser' })).s, (await decider(S, { id: 'o-accepte', action: 'accepter' })).s], [409, 409, 409]);
    const a = await decider(S, { id: 'o-tour', action: 'accepter' });
    v('accepter un courriel qui attend : 200, « à faire »', [a.s, a.j], [200, { ok: true, id: 'o-tour', action: 'accepter', etat: 'a_faire' }]);
    v('changer d’avis tant que le Mac n’est pas passé : refuser remplace accepter', (await decider(S, { id: 'o-tour', action: 'refuser' })).j.action, 'refuser');
    v('modifier une RÉPONSE : son objet reste celui du fil (sinon elle sortirait de la conversation)', (await decider(S, { id: 'o-reponse', action: 'modifier', objet: 'Autre objet', texte: TEXTE_JUSTIN })).s, 200);
    const g1 = await S.get('/api/monitor/pauline');
    v('la Tour voit les deux décisions « à faire », sans leur texte', [g1.j.decisions['o-tour'].etat, g1.j.decisions['o-reponse'].action, 'texte' in g1.j.decisions['o-reponse']], ['a_faire', 'modifier', false]);

    v('⛔ Mac : sans jeton ou mauvais jeton, 401', [(await mac(S, 'GET', '/api/pauline/decisions', undefined, '')).s, (await mac(S, 'GET', '/api/pauline/decisions', undefined, 'faux-' + JETON)).s], [401, 401]);
    v('⛔ Mac : un corps de 1 Mo avec un mauvais jeton = 401 (le jeton passe AVANT la lecture)', (await mac(S, 'POST', '/api/pauline/decisions/resultats', JSON.stringify({ resultats: [], bourrage: 'x'.repeat(1024 * 1024) }), 'faux-' + JETON)).s, 401);
    const m1 = await mac(S, 'GET', '/api/pauline/decisions');
    v('Mac : il reçoit les décisions à faire, la réponse avec SON objet', [m1.s, m1.j.decisions], [200, [{ id: 'o-tour', action: 'refuser' }, { id: 'o-reponse', action: 'modifier', objet: 'Re: Votre planning', texte: TEXTE_JUSTIN }]]);
    v('⛔ compte rendu malformé : 400', (await mac(S, 'POST', '/api/pauline/decisions/resultats', { resultats: 'tout' })).s, 400);
    const cr = await mac(S, 'POST', '/api/pauline/decisions/resultats', { resultats: [{ id: 'o-tour', ok: true }, { id: 'o-reponse', ok: false, motif: '<script>' }, { id: 'o-fantome', ok: true }] });
    v('compte rendu : deux décisions closes (l’inconnue ignorée)', [cr.s, cr.j.pris], [200, 2]);
    const g2 = await S.get('/api/monitor/pauline');
    v('la Tour voit « fait » et « échec » (motif hors liste → « erreur »)', [g2.j.decisions['o-tour'].etat, g2.j.decisions['o-reponse'].etat, g2.j.decisions['o-reponse'].motif], ['fait', 'echec', 'erreur']);
    v('le Mac n’a plus rien à faire', (await mac(S, 'GET', '/api/pauline/decisions')).j.decisions, []);
    v('⛔ redécider un courriel traité sur le Mac : 409', (await decider(S, { id: 'o-tour', action: 'accepter' })).s, 409);
    const brutDisque = fs.readFileSync(path.join(S.D, P.FICHIER_DEC), 'utf8');
    v('⛔ le fichier est chiffré (rien de lisible) et en 600', [JSON.parse(brutDisque).chiffre, FUITES.some(f => brutDisque.includes(f)), (fs.statSync(path.join(S.D, P.FICHIER_DEC)).mode & 0o777).toString(8)], [true, false, '600']);
    vrai('⛔ aucun texte, objet ou nom de prospect dans le journal du serveur', !FUITES.some(f => S.journal().includes(f)), FUITES.filter(f => S.journal().includes(f)));

    console.log('\n3. La couture : le vrai script du Mac contre le vrai serveur');
    const PY = spawnSync('python3', ['--version']).status === 0;
    if (!PY) console.log('  … SAUTÉ : python3 absent');
    else {
      const dos = fs.mkdtempSync(path.join(os.tmpdir(), 'pau3079h-')); tmp.push(dos);
      const fab = spawnSync('python3', ['-I', path.join(RACINE, 'tests', 'pauline-releve-test.py'), '--construire', dos], { encoding: 'utf8' });
      vrai('la fausse base de Harvey est fabriquée', fab.status === 0, fab.stderr);
      fs.writeFileSync(path.join(dos, '.env'), 'TEAMOP_RELEVE_JETON=' + JETON + '\n', { mode: 0o600 });
      const lancer = () => spawnSync('python3', ['-I', path.join(RACINE, 'outils', 'pauline-releve.py'), '--harvey', dos, '--url', S.B + '/api/pauline/releve'], { encoding: 'utf8', timeout: 60000 });
      const r1 = lancer();
      vrai('premier passage : relevé envoyé', r1.status === 0 && /Relevé envoyé/.test(r1.stdout), r1.stderr);
      const d = await decider(S, { id: 'o-attente', action: 'modifier', objet: 'Objet de Justin', texte: TEXTE_JUSTIN });
      v('la Tour décide sur le courriel que le script a remonté', d.s, 200);
      const r2 = lancer();
      vrai('second passage : la décision est appliquée, puis le relevé repart', r2.status === 0 && /1 appliquée/.test(r2.stdout) && /Relevé envoyé/.test(r2.stdout), r2.stdout + r2.stderr);
      const q = spawnSync('python3', ['-I', '-c', 'import sqlite3,sys,json; b=sqlite3.connect(sys.argv[1]); print(json.dumps(b.execute("SELECT status, subject, body, approved_by FROM outbox WHERE id=\'o-attente\'").fetchone()))', path.join(dos, 'data', 'harvey.db')], { encoding: 'utf8' });
      v('⛔ dans la base de Harvey : accepté, par Justin, avec SON objet et SON texte', JSON.parse(q.stdout || 'null'), ['approved', 'Objet de Justin', TEXTE_JUSTIN, 'you']);
      const g3 = await S.get('/api/monitor/pauline');
      const c3 = g3.j.releve.courriels.find(c => c.id === 'o-attente');
      v('la Tour voit « fait », et le relevé dit « approved » (il attend l’envoi, plus l’accord)', [g3.j.decisions['o-attente'].etat, c3.statutBrut, P.attendAccord(c3)], ['fait', 'approved', false]);
      vrai('⛔ ni le jeton ni le texte dans la sortie du script', ![JETON, TEXTE_JUSTIN].some(f => (r1.stdout + r1.stderr + r2.stdout + r2.stderr).includes(f)));
    }
  }
  await S.fin();
  console.log('\ntest-3079 : ' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\ntest-3079 : ' + ok + ' ✓ ' + (ko + 1) + ' ✗'); process.exit(1); });
