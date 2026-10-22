/* ══ test-2816 : LOT 1 DE LA REFONTE DE LA TOUR — (g) RAPPORT (21 octobre 2026) ══
   La page « Rapport » lit le rapport que le SERVEUR établit à partir du journal des agents (/api/monitor/agents/rapport, `construireRapport`)
   et la file de validations (/api/monitor/agents/validations) — sur 24 heures, 7 ou 30 jours. EN LECTURE. La couture se joue avec le
   VRAI serveur (journal et validations posés dans leurs fichiers, un second serveur au journal illisible) et les VRAIES fonctions de la page :
     · les chiffres sont ceux du serveur, et la période les change (24 h, 7 j, 30 j) ;
     · « à regarder d'abord » : erreurs et refus ; « à ta décision » : les seules demandes EN ATTENTE, avec le nom de l'agent ;
     · ⛔ une réponse d'une ancienne période n'écrase pas la nouvelle ;
     · ⛔ un journal illisible (503) n'est jamais « aucun agent n'a rien fait » : la page dit que le rapport ne peut pas être établi ;
     · un détail venu d'un agent est ÉCHAPPÉ ; la page n'écrit rien.
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
console.log('── test-2816 : la Tour, lot 1 (g) — Rapport ──');
let webpush; try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) { console.log('  (sauté : server/node_modules absent)\n\n0 ✓  0 ✗'); process.exit(0); }
const T = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
const ligne = d => { const i = T.indexOf(d); return i < 0 ? '' : T.slice(i, T.indexOf('\n', i)); };
const NEUVES = ['chargerRapportAgents', 'rpjPeriode', 'rpjLigne', 'vueRapport', 'agNomRpj'];
const FN = NEUVES.concat(['ligneAc', 'abnGroupe', 'acErr', 'videTour', 'teteListe', 'esc', 'jsq', 'fmtDate', 'fmtAgo', 'apiGet']).map(n => corps(T, 'function ' + n + '('));
const VARS = [ligne('var RPJ={'), ligne('var RPJ_RES='), corps(T, 'var AG_TYPES=')];
v('(population) les 15 fonctions et les trois tables sont trouvées dans le fichier livré', [FN.filter(f => f.length < 30).length, VARS.map(x => x.length > 20)], [0, [true, true, true]]);
v('⛔ les fonctions neuves n\'écrivent rien (aucun apiPost, aucun fetch)', FN.slice(0, NEUVES.length).filter(f => /apiPost|fetch\(/.test(f)).length, 0);

const MDP = 'banc-2816-patron', now = Date.now(), H = 3600000;
const preparer = (journal, validations) => {
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2816-')), D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [{ id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: now }] }));
  if (journal !== null) fs.writeFileSync(path.join(D, 'agents-journal.json'), journal);
  if (validations !== null) fs.writeFileSync(path.join(D, 'agents-validations.json'), validations);
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
  J('hugo', 'relire Stripe', 'ok', 2), J('hugo', 'relire Stripe', 'ok', 3),
  J('camille', 'brouillon de réponse', 'propose', 1),
  J('max', 'vérifier le site', 'erreur', 4, { detail: '<img src=x onerror=alert(1)>' }),
  J('camille', 'envoyer', 'refuse', 5, { detail: 'agent en brouillon' }),
  J('nina', 'contrôle RGPD', 'ok', 72),                                   // 3 jours : dans 7 j, pas dans 24 h
  J('theo', 'relire la sauvegarde', 'erreur', 20 * 24)];                    // 20 jours : dans 30 j seulement
const VALID = [
  { id: 'v1', ts: now - 2 * H, agent: 'camille', type: 'envoyer_mail', resume: 'Répondre à la Boulangerie Éclair', params: { boite: 'support', fil: 'f1' }, statut: 'en_attente' },
  { id: 'v2', ts: now - 3 * H, agent: 'hugo', type: 'suspendre_acces', resume: 'Suspendre un accès impayé', params: { espace: 'x', motif: 'impaye' }, statut: 'accepte', decideTs: now - H, decidePar: 'Patron' },
  { id: 'v3', ts: now - 1 * H, agent: 'jules', type: 'correctif', resume: 'Corriger le bouton Imprimer', params: { issue: 'i1', branche: 'b1' }, statut: 'en_attente' }];

(async () => {
  const enfants = [], bancs = [];
  const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); bancs.forEach(b => { try { fs.rmSync(b, { recursive: true, force: true }); } catch (x) {} }); };
  process.on('exit', fin);
  setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 150000).unref();
  const P1 = preparer(JSON.stringify(JOURNAL), JSON.stringify(VALID)); bancs.push(P1.banc);
  const S = await demarrer(P1); enfants.push(S.e);
  vrai('le serveur démarre, une session de patron', S.vivant && S.TP, S.journal().slice(-300));
  let jeton = S.TP, rendus = 0;
  const bac = { API: S.API, fetch, Promise, JSON, Date, String, Array, Math, Error, Number, Object, MYROLE: 'patron', TAB: 'rapport', AG: { sec: '' },
    hAuth: () => ({ Authorization: 'Bearer ' + jeton }), srvRepond: r => r, srvMuet: e => { throw e; }, doLogout: () => {}, render: () => { rendus++; }, msgErreur: () => 'Serveur injoignable.',
    svg: n2 => '<svg data-ic="' + n2 + '"></svg>', enTete: (t) => '<h1>' + t + '</h1>', acSquel: () => '<squelette>' };
  vm.createContext(bac);
  vm.runInContext(VARS.join('\n') + '\n' + FN.join('\n') + '\nthis.RPJ=RPJ;' + NEUVES.map(x => 'this.' + x + '=' + x + ';').join(''), bac);
  const texte = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const attendre = async () => { for (let i = 0; i < 80 && !(bac.RPJ.lec && bac.RPJ.valLec); i++) await dormir(25); };
  const groupe = (H2, titre) => { const i = H2.indexOf('<span class="reg-nom">' + titre + '</span>'); if (i < 0) return ''; const j = H2.indexOf('<div class="reg-g', i + 10); return H2.slice(i, j < 0 ? undefined : j); };

  v('avant toute lecture : un squelette', /<squelette>/.test(bac.vueRapport()), true);
  bac.chargerRapportAgents(); await attendre();
  v('les deux lectures sont faites, et la page ouverte est redessinée', [bac.RPJ.lec, bac.RPJ.valLec, rendus >= 2], [1, 1, true]);
  let Hm = bac.vueRapport(), X = texte(Hm);
  vrai('24 h : 5 gestes, 2 faits, 1 proposé, 2 échecs et refus — les chiffres du serveur', /5 Gestes 2 Faits 1 Proposés à ton accord 2 Échecs et refus/.test(X), X.slice(0, 300));
  const mal = groupe(Hm, 'À regarder d’abord');
  vrai('« à regarder d\'abord » : l\'erreur de Max et le refus de Camille, avec leurs NOMS (le registre du serveur)', />Max · vérifier le site</.test(mal) && />Camille · envoyer</.test(mal) && !/relire Stripe/.test(mal), mal.slice(0, 600));
  vrai('⛔ un détail venu d\'un agent est ÉCHAPPÉ', Hm.indexOf('<img src=x') < 0 && Hm.indexOf('&lt;img src=x') > 0);
  const dec = groupe(Hm, 'À ta décision');
  vrai('« à ta décision » : les DEUX demandes en attente (l\'acceptée non), avec le nom de l\'agent', /Répondre à la Boulangerie Éclair/.test(dec) && /Corriger le bouton Imprimer/.test(dec) && !/Suspendre un accès impayé/.test(dec) && /<b>Camille<\/b>/.test(dec), dec.slice(0, 600));
  vrai('…un agent absent du rapport de la période garde son identifiant (jamais un nom inventé)', /<b>jules<\/b>/.test(dec));
  vrai('« par agent » : Hugo 2 gestes, Camille 2 dont 1 refusé', /Hugo[\s\S]*?2 gestes/.test(groupe(Hm, 'Par agent')) && /Camille[\s\S]*?2 gestes · 1 refusé/.test(groupe(Hm, 'Par agent')));
  /* un serveur qui rendrait TOUTES les demandes (le paramètre « statut=tout » oublié, une version d'avant) : la page ne garde que celles en attente */
  const vraiFetch = bac.fetch;
  bac.fetch = (u, o) => vraiFetch(u, o).then(r => /validations/.test(u) ? r.json().then(j => { j.validations.push({ id: 'vx', ts: now, agent: 'hugo', type: 'publier', resume: 'Déjà acceptée — ne doit pas paraître', params: {}, statut: 'accepte' }); return new Response(JSON.stringify(j), { status: r.status, headers: { 'Content-Type': 'application/json' } }); }) : r);
  bac.chargerRapportAgents(); await attendre();
  vrai('⛔ une demande déjà décidée ne paraît jamais « à ta décision », même si le serveur la rend', !/Déjà acceptée/.test(bac.vueRapport()) && bac.RPJ.val.length === 2);
  bac.fetch = vraiFetch;
  vrai('chaque demande mène à Agents › Validations', (dec.match(/AG\.sec='valid';setTab\('agents'\)/g) || []).length >= 2);

  bac.rpjPeriode('168'); await attendre();
  X = texte(bac.vueRapport());
  vrai('7 jours : le contrôle de Nina (il y a 3 j) entre, pas l\'erreur de Théo (20 j)', /6 Gestes 3 Faits/.test(X) && /Nina/.test(X) && !/Théo/.test(X), X.slice(0, 300));
  bac.rpjPeriode('720'); await attendre();
  X = texte(bac.vueRapport());
  vrai('30 jours : l\'erreur de Théo entre', /7 Gestes/.test(X) && /Théo/.test(X), X.slice(0, 300));
  vrai('le choix de période est dessiné, et marque celle qui est choisie', /aria-pressed="true" onclick="rpjPeriode\('720'\)"/.test(bac.vueRapport()));

  /* ⛔ une réponse d'une ancienne période n'écrase pas la nouvelle */
  bac.RPJ.h = 24; bac.chargerRapportAgents(); bac.RPJ.h = 168; bac.RPJ.rap = null;
  await dormir(500);
  v('⛔ la réponse de 24 h, arrivée après le passage à 7 jours, est jetée', [bac.RPJ.rap, bac.RPJ.lec], [null, 0]);
  v('choisir la période déjà choisie ne relit rien', (() => { const r0 = rendus; bac.rpjPeriode('168'); return rendus === r0; })(), true);

  /* ⛔ un second serveur, journal des agents ILLISIBLE */
  const P2 = preparer('{ tronqué', JSON.stringify(VALID)); bancs.push(P2.banc);
  const S2 = await demarrer(P2); enfants.push(S2.e);
  vrai('(second serveur, journal illisible) il démarre', S2.vivant && S2.TP, S2.journal().slice(-300));
  bac.API = S2.API; jeton = S2.TP; bac.RPJ.h = 24;
  bac.chargerRapportAgents(); await attendre();
  const HI = texte(bac.vueRapport());
  vrai('⛔ journal illisible (503) : « le rapport ne peut pas être établi », avec la raison du serveur — jamais « aucun agent n\'a rien fait »', bac.RPJ.lec === -1 && /Le rapport ne peut pas être établi/.test(HI) && /illisible/.test(HI) && !/Aucun agent/.test(HI), HI.slice(0, 400));
  vrai('…et les demandes à décider, lisibles, se montrent quand même', bac.RPJ.valLec === 1 && /Répondre à la Boulangerie Éclair/.test(HI));

  /* un troisième serveur, rien du tout */
  const P3 = preparer(null, null); bancs.push(P3.banc);
  const S3 = await demarrer(P3); enfants.push(S3.e);
  bac.API = S3.API; jeton = S3.TP;
  bac.chargerRapportAgents(); await attendre();
  const HV = texte(bac.vueRapport());
  vrai('rien dans le journal : « Aucun agent n\'a rien fait sur les dernières 24 heures », et aucune demande', /Aucun agent n’a rien fait sur les dernières 24 heures/.test(HV) && !/À ta décision/.test(HV), HV.slice(0, 300));
  bac.API = 'http://127.0.0.1:1';
  bac.chargerRapportAgents(); await attendre();
  const HP = texte(bac.vueRapport());
  vrai('⛔ serveur injoignable : les deux lectures disent leur panne', /Le rapport ne peut pas être établi/.test(HP) && /Les demandes à valider ne répondent pas/.test(HP) && !/Aucun agent/.test(HP), HP);

  const SANS = T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  vrai('plus « en construction » ; sa branche de rendu ; relu à chaque ouverture',
    !/\n  rapport:\['Rapport'/.test(T) && /else if\(TAB==='rapport'\) v\.innerHTML=vueRapport\(\);/.test(SANS) && /if\(t==='rapport'\) chargerRapportAgents\(\);/.test(SANS));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
