/* ⛔ CE QUE CE FICHIER GARDE — L'EXAMEN DE L'ÉQUIPE CONTRE LE VRAI SERVEUR (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §13, dernière phrase : « avant la mise
   en ligne, les mêmes scénarios se jouent en local sur le vrai serveur avec un FAUX Claude — le câblage »).
   Le vrai `server/index.js`, isolé sur 127.0.0.1, parlé en HTTP ; un FAUX Claude répond à api.anthropic.com (un préchargement de `fetch`, `tests/banc-examen.js` :
   un bon équipier, ou un défaut choisi dans un fichier). `test-2930` garde les modules ; ici on garde CE QUE LE SERVEUR FAIT quand le patron touche le bouton :
     · l'examen se lance par la route de la Tour (202), se lit pendant qu'il tourne, rend ses neuf fiches (✓/✗/en attente, conversations complètes), et se garde sur disque ;
     · ⛔ RIEN DE RÉEL N'EST TOUCHÉ : les vrais fils restent vides, les vraies tâches, validations, brouillons, registres de Léa et de Camille, réunions, objectifs, leçons ne
       reçoivent rien ; le journal des agents ne reçoit que « examen lancé / terminé » ; aucun courriel (la poste réelle n'existe pas ici, la fausse note) ;
     · ⛔ AUCUNE DONNÉE DE CLIENT RÉEL n'atteint Claude ni le résultat : un client réel posé dans la base du serveur n'apparaît nulle part ;
     · les agents RÉELS peuvent être à l'arrêt : l'examen ne dépend pas d'eux ; ce qu'il dépense compte dans le budget du mois (sous « examen ») ;
     · un défaut du modèle (Margaux qui renvoie) tombe en ✗ à travers tout le serveur, une panne de Claude en « inconnu » ;
     · un examen à la fois (409), un par heure (429), pas de clé d'API des agents (409), le collaborateur ne lance rien (403), un redémarrage en cours d'examen se DIT ;
     · les trois routes d'écriture sont dans le journal des gestes de la Tour (`MON_GESTES`). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2931-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); fin(); process.exit(1); }, 170000).unref();
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(80); } return false; };
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

console.log('\n── 2931 · l’examen de l’équipe contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const PRE = path.join(banc, 'claude.js'), TRACE = path.join(banc, 'recu.jsonl'), DEFAUTS = path.join(banc, 'defauts.json');
  fs.writeFileSync(DEFAUTS, '[]');
  /* Le faux Claude : le MÊME équipier que le banc des modules, choisi dans `defauts.json` à chaque appel (on change de défaut sans redémarrer). */
  fs.writeFileSync(PRE, `const vrai = globalThis.fetch; const B = require(${JSON.stringify(path.join(__dirname, 'banc-examen.js'))});
globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { const corps = String(opts && opts.body); require('fs').appendFileSync(${JSON.stringify(TRACE)}, corps + '\\n');
    let defauts = []; try { defauts = JSON.parse(require('fs').readFileSync(${JSON.stringify(DEFAUTS)}, 'utf8')); } catch (e) {}
    if (defauts.includes('panne')) return new Response(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'panne simulée' } }), { status: 500, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify(B.reponseHttp(JSON.parse(corps), defauts)), { status: 200, headers: { 'content-type': 'application/json' } }); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-2931';
  const CLIENT_REEL = 'vrai.client@societe-reelle.fr', ENTREPRISE_REELLE = 'Société Réelle SARL Zébulon';
  async function serveur(nom, o) {
    o = o || {};
    const D = path.join(banc, nom, 'data'); fs.mkdirSync(D, { recursive: true });
    const deja = fs.existsSync(path.join(D, 'clients.json'));
    if (!deja) {
      /* un client RÉEL dans la base du serveur : l'examen ne doit le montrer à personne */
      fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify({ [CLIENT_REEL]: { email: CLIENT_REEL, entreprise: ENTREPRISE_REELLE, nom: 'Durand', prenom: 'Camille', tel: '0612345678', demandes: [{ app: 'OP GESTION', statut: 'en attente', besoin: 'planning de mes techniciens' }] } }));
      fs.writeFileSync(path.join(D, 'espaces.json'), '{}');
    }
    const vap = webpush.generateVAPIDKeys(); const conf = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_2931' } };
    if (o.cle !== false) conf.agents = { cleApi: 'sk-ant-' + 'api03-banc-2931-xxxxxxxxxxxxxxxx' };
    fs.writeFileSync(path.join(banc, nom, 'config.json'), JSON.stringify(conf));
    const PORT = await libre(); let journal = '';
    const env = Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, nom, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' });
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    vrai('le serveur « ' + nom + ' » démarre', vivant); if (!vivant) { console.log(journal.slice(0, 800)); process.exit(1); }
    let nreq = 0;
    const req = async (m, r, c, j) => { const x = await fetch(B + r, { method: m, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.9.' + Math.floor(nreq++ / 50) + '.' + (1 + (PORT % 200)) }, j ? { Authorization: 'Bearer ' + j } : {}), body: m === 'POST' ? JSON.stringify(c || {}) : undefined }); let r2 = {}; try { r2 = await x.json(); } catch (y) {} return { s: x.status, j: r2, h: x.headers }; };
    const jeton = (await req('POST', '/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
    return { B, D, req, journal: () => journal, G: r => req('GET', r, null, jeton), P: (r, c) => req('POST', r, c, jeton), jeton, lire: f => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (x) { return null; } },
      brut: f => { try { return fs.readFileSync(path.join(D, f), 'utf8'); } catch (x) { return null; } },
      arreter: async () => { e.kill('SIGKILL'); await dormir(300); } };
  }
  const recus = () => fs.existsSync(TRACE) ? fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)) : [];
  const FICHIERS_AGENTS = ['agents-messages.json', 'agents-taches.json', 'agents-validations.json', 'agents-brouillons.json', 'agents-lea.json', 'agents-camille.json', 'agents-reunions.json', 'agents-objectifs.json', 'agents-lecons.json', 'agents-etat.json', 'agents-charte.json'];
  const attendreFin = async S => att(async () => { const g = (await S.G('/api/monitor/agents/examen')).j; return g && g.courant === null && g.resultats && g.resultats.length > 0; }, 120000);
  const rendreHeure = (S, o) => { /* le seul moyen de rejouer un examen dans l'heure : réécrire l'état (le serveur est arrêté entre-temps) */ const e = S.lire('examen-etat.json'); e.dernier = 0; e.jour = { j: '', n: 0 }; Object.assign(e, o || {}); fs.writeFileSync(path.join(S.D, 'examen-etat.json'), JSON.stringify(e)); };

  console.log('\n1. Les agents RÉELS sont tous à l’arrêt : l’examen n’en dépend pas — le patron lance l’examen');
  let S = await serveur('principal');
  const REG = (await S.G('/api/monitor/agents')).j.agents;
  v('(population) seize agents réels, tous à l’arrêt', [REG.length, REG.filter(a => a.mode === 'arret').length], [16, 16]);
  const avantJournal = (await S.G('/api/monitor/agents/journal')).j.journal.length;
  const g0 = (await S.G('/api/monitor/agents/examen')).j;
  v('l’état au départ : aucun résultat, rien en cours, clé des agents posée, limites annoncées', [g0.resultats.length, g0.courant, g0.cleOk, g0.limites], [0, null, true, { appelsMax: 200, usdMax: 12, moisUsdMax: 40, parHeure: 1, parJour: 6 }]);
  const t0 = Date.now();
  const L = await S.P('/api/monitor/agents/examen/lancer');
  v('lancer par la route de la Tour : 202, l’identifiant, le coût annoncé', [L.s, typeof L.j.id, L.j.appelsMax, L.j.usdMax], [202, 'string', 200, 12]);
  const L2 = await S.P('/api/monitor/agents/examen/lancer');
  v('⛔ un examen à la fois : 409 pendant qu’il tourne', [L2.s, L2.j.raison], [409, 'en_cours']);
  const enRoute = (await S.G('/api/monitor/agents/examen')).j;
  vrai('la progression se lit pendant l’examen (neuf scénarios, dont certains en cours)', enRoute.courant && enRoute.courant.scenarios.length === 9 && enRoute.courant.scenarios.some(s => s.etat === 'en_cours' || s.etat === 'ok' || s.etat === 'attente'), JSON.stringify(enRoute.courant));
  vrai('l’examen se termine', await attendreFin(S), 'figé');
  const g1 = (await S.G('/api/monitor/agents/examen')).j;
  const res = (await S.G('/api/monitor/agents/examen/resultat?id=' + L.j.id)).j.resultat;
  v('le bilan : 9 réussis, aucun échec, rien d’inconnu', [res.bilan.ok, res.bilan.ko, res.bilan.inconnu, res.etat, res.source], [9, 0, 0, 'termine', 'tour']);
  v('les neuf scénarios, dans l’ordre, avec leurs contrôles et leurs conversations', [res.scenarios.map(s => s.n), res.scenarios.every(s => s.verifs.length >= 5 && s.titre.length > 20)], [[1, 2, 3, 4, 5, 6, 7, 8, 9], true]);
  v('les quatre comportements d’autres chantiers sont « en attente » (signature, contrôle qualité, remboursement, résiliation)', res.scenarios.reduce((n, s) => n + s.verifs.filter(x => x.etat === 'attente').length, 0), 4);
  vrai('…et ils NOMMENT le chantier qui les livre', res.scenarios.every(s => s.verifs.filter(x => x.etat === 'attente').every(x => /chantier auto-commercial/.test(x.detail))));
  vrai('le coût réel de l’examen est dit : appels, dollars, durée', res.appels > 20 && res.appels === recus().length && res.usd > 0 && res.duree >= 0, res.appels + ' appels ; ' + recus().length + ' reçus');
  vrai('le résumé de la liste ne porte pas les conversations (léger), le détail oui', g1.resultats[0].scenarios.every(s => !('conversation' in s)) && res.scenarios.filter(s => s.n < 9).every(s => s.conversation.length >= 2));

  console.log('\n2. ⛔ RIEN DE RÉEL N’EST TOUCHÉ');
  const fils = (await S.G('/api/monitor/conversations?tous=1')).j;
  v('les vrais fils (équipe, trois groupes, seize agents) sont tous vides', [fils.fils.length, fils.fils.every(f => f.dernier === null), fils.nonLus], [20, true, 0]);
  v('les vraies tâches et validations sont vides', [(await S.G('/api/monitor/agents/taches')).j.taches.length, (await S.G('/api/monitor/agents/validations?statut=tout')).j.validations.length], [0, 0]);
  v('les fichiers des vrais agents n’existent même pas (messages, tâches, validations, brouillons, Léa, Camille, réunions, objectifs, leçons, état, charte)', FICHIERS_AGENTS.filter(f => S.brut(f) !== null), []);
  v('les vraies réunions ne portent rien', (await S.G('/api/monitor/agents/reunions')).j.reunions.length, 0);
  const jr = (await S.G('/api/monitor/agents/journal?limite=500')).j.journal;
  const nouveaux = jr.slice(0, jr.length - avantJournal);
  vrai('le journal réel ne reçoit que « examen lancé » et « examen terminé » (identifiant « systeme »)', jr.length - avantJournal === 2 && jr.every(e => e.agent === 'systeme') && jr.map(e => e.action).sort().join() === 'examen lancé,examen terminé', JSON.stringify(jr.map(e => [e.agent, e.action])));
  vrai('…« examen terminé » dit le bilan et les appels', /9 ✓ · 0 ✗ · \d+ appels/.test(jr.find(e => e.action === 'examen terminé').detail));
  const budget = S.lire('agents-budget.json');
  vrai('⛔ ce que l’examen a dépensé est imputé au budget du mois, sous « examen » (aucun agent réel n’est entamé)', budget && Object.keys(budget.parAgent).join() === 'examen' && budget.parAgent.examen > 0 && Math.abs(budget.parAgent.examen - res.usd) < 0.01, JSON.stringify(budget));
  const tout = recus().map(r => JSON.stringify(r)).join('\n') + JSON.stringify(res) + S.brut('examen-resultats.json');
  vrai('⛔ le client RÉEL de la base n’atteint ni Claude, ni le résultat, ni le fichier gardé (ni son nom, ni son adresse, ni son téléphone)', !tout.includes('societe-reelle') && !tout.includes('Zébulon') && !tout.includes('0612345678') && !tout.includes('Durand') && !tout.includes('planning de mes techniciens'));
  vrai('⛔ la clé des agents n’est ni dans le résultat ni dans le fichier gardé', !/sk-ant-api03-banc-2931/.test(JSON.stringify(res) + S.brut('examen-resultats.json') + S.brut('examen-etat.json')));
  vrai('aucun courriel réel : le serveur n’a aucune boîte, et pourtant les courriels de Léa et de Camille sont rédigés (poste d’essai)', res.scenarios[5].conversation.length >= 3 && res.scenarios[6].conversation.length >= 8 && !/Error|erreur d’envoi|boîte introuvable/.test(S.journal()), S.journal().slice(-300));
  v('l’état d’examen sur disque : l’examen est terminé (plus de « courant »)', S.lire('examen-etat.json').courant, null);
  v('les résultats sont gardés sur disque, le plus récent en tête', S.lire('examen-resultats.json')[0].id, L.j.id);

  console.log('\n3. Un par heure, la journée, la clé d’API, le collaborateur');
  const L3 = await S.P('/api/monitor/agents/examen/lancer');
  v('⛔ un par heure : 429 avec le délai et « Retry-After »', [L3.s, L3.j.raison, L3.j.reessayerDans > 3000 && L3.j.reessayerDans <= 3600, Number(L3.h.get('retry-after')) === L3.j.reessayerDans], [429, 'heure', true, true]);
  v('sans session : 401 / 403, rien ne se lit ni ne se lance', [(await S.req('GET', '/api/monitor/agents/examen')).s, (await S.req('POST', '/api/monitor/agents/examen/lancer', {})).s, (await S.req('GET', '/api/monitor/agents/examen/resultat')).s], [401, 403, 401]);
  const actions = (await S.G('/api/monitor/journal')).j.actions.map(a => a.geste);
  vrai('⛔ le journal des gestes de la Tour note le lancement', actions.includes('a lancé l’examen de l’équipe d’agents'), JSON.stringify(actions));
  vrai('…et la création et la suppression de la clé (après les avoir faites)', await (async () => { await S.P('/api/monitor/agents/examen/cle'); await S.P('/api/monitor/agents/examen/cle/supprimer'); const a = (await S.G('/api/monitor/journal')).j.actions.map(x => x.geste); return a.includes('a créé la clé d’examen de l’équipe') && a.includes('a supprimé la clé d’examen de l’équipe'); })());
  vrai('⛔ le refus d’un collaborateur n’est PAS noté comme un geste (seul ce qui a réussi s’inscrit)', (await S.G('/api/monitor/journal')).j.actions.filter(a => a.geste === 'a lancé l’examen de l’équipe d’agents').length === 1);

  console.log('\n4. Un défaut du modèle tombe à travers tout le serveur ; une panne de Claude est « inconnu »');
  await S.arreter();
  rendreHeure(S);
  fs.writeFileSync(DEFAUTS, JSON.stringify(['margaux-renvoie']));
  S = await serveur('principal');
  const L4 = await S.P('/api/monitor/agents/examen/lancer');
  v('relancé après redémarrage (état remis à zéro pour le banc) : 202', L4.s, 202);
  await attendreFin(S);
  const r4 = (await S.G('/api/monitor/agents/examen/resultat')).j.resultat;
  v('« Margaux renvoie la question » : le scénario 1 est ✗, aucun autre', r4.scenarios.filter(s => s.etat === 'ko').map(s => s.n), [1]);
  vrai('…la raison est lisible (elle « passe la demande » à Victor)', r4.scenarios[0].verifs.some(x => x.etat === 'ko' && /passe la demande/.test(x.detail)));
  v('…les deux résultats sont gardés, le plus récent en tête', (await S.G('/api/monitor/agents/examen')).j.resultats.map(x => x.bilan.ko), [1, 0]);
  await S.arreter();
  rendreHeure(S);
  fs.writeFileSync(DEFAUTS, JSON.stringify(['panne']));
  S = await serveur('principal');
  const L5 = await S.P('/api/monitor/agents/examen/lancer');
  await attendreFin(S);
  const r5 = (await S.G('/api/monitor/agents/examen')).j.resultats[0];
  v('⛔ Claude en panne (500) : neuf « inconnu », zéro ✗ — l’examen n’accuse pas l’équipe d’une panne de Claude', [r5.bilan.inconnu, r5.bilan.ko, r5.bilan.ok], [9, 0, 0]);

  console.log('\n5. Un redémarrage en plein examen se DIT');
  await S.arreter();
  rendreHeure(S);
  fs.writeFileSync(DEFAUTS, JSON.stringify([]));
  S = await serveur('principal');
  const L6 = await S.P('/api/monitor/agents/examen/lancer');
  v('lancé de nouveau : 202', L6.s, 202);
  await dormir(150);
  v('l’état d’examen est écrit AVANT que l’examen ne commence (le redémarrage pourra le dire)', S.lire('examen-etat.json').courant && S.lire('examen-etat.json').courant.id, L6.j.id);
  await S.arreter();
  S = await serveur('principal');
  const g7 = (await S.G('/api/monitor/agents/examen')).j;
  v('⛔ après le redémarrage : l’examen coupé est « interrompu » (raison dite), rien n’est en cours, rien ne se rejoue', [g7.resultats[0].id, g7.resultats[0].etat, g7.resultats[0].raison, g7.courant], [L6.j.id, 'interrompu', 'le serveur a redémarré pendant l’examen', null]);

  console.log('\n   le collaborateur (un compte de la Tour qui n’est pas le patron)');
  const SC = await serveur('collab');
  await SC.P('/api/monitor/users', { nom: 'Collab', pass: 'mot-de-passe-collab-2931' });
  const jetonCollab = (await SC.req('POST', '/api/monitor/login', { nom: 'Collab', pass: 'mot-de-passe-collab-2931' })).j.token;
  v('le collaborateur LIT l’état (garde ordinaire) mais ne lance rien (403) et ne touche pas la clé (403)', [(await SC.req('GET', '/api/monitor/agents/examen', null, jetonCollab)).s, (await SC.req('POST', '/api/monitor/agents/examen/lancer', {}, jetonCollab)).s, (await SC.req('POST', '/api/monitor/agents/examen/cle', {}, jetonCollab)).s, (await SC.req('POST', '/api/monitor/agents/examen/cle/supprimer', {}, jetonCollab)).s], [200, 403, 403, 403]);
  v('…rien n’a été écrit par ces refus', [SC.brut('examen-etat.json'), SC.brut('examen-resultats.json')], [null, null]);

  console.log('\n6. Pas de clé d’API des agents');
  const SS = await serveur('sans-cle', { cle: false });
  const gs = (await SS.G('/api/monitor/agents/examen')).j;
  v('l’état le dit (cleOk faux)', gs.cleOk, false);
  const ls = await SS.P('/api/monitor/agents/examen/lancer');
  v('lancer : 409 « pas_de_cle », le mot est clair, rien n’est écrit', [ls.s, ls.j.raison, /clé des agents/.test(ls.j.error), SS.lire('examen-etat.json')], [409, 'pas_de_cle', true, null]);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(1); });
