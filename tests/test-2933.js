/* ⛔ CE QUE CE FICHIER GARDE — L'ONGLET « EXAMEN » DE LA TOUR CONTRE LE VRAI SERVEUR (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §13).
   Les vraies fonctions de `tour.html` (lecture, bouton, progression, résultats, clé) parlent au vrai `server/index.js`, isolé sur 127.0.0.1, avec un FAUX Claude à la place
   d'Anthropic (même méthode que `test-2883`). Seul le DOM est un bouchon : on lit ce que l'écran DIRAIT (les pixels, jour et nuit, c'est `scratchpad/sonde-tour-examen.js`).
   Ce qu'aucune moitié ne voit seule :
     · le coût se dit AVANT de lancer (la fenêtre de confirmation porte les 200 appels et les 12 $ du serveur), refuser la confirmation ne lance rien, et « lancé » ne se dit
       qu'après le 202 du serveur ;
     · pendant l'examen : la progression (neuf scénarios, appels, dollars) se lit, le bouton est grisé, la minuterie relit toutes les 4 s TANT QUE l'écran est ouvert, et s'éteint
       quand on le quitte ; à la fin, l'écran le dit et montre le résultat ;
     · ⛔ TROIS ÉTATS : avant la lecture, un squelette ; un serveur coupé ou un refus : « n'a pas pu être lu » — jamais « Aucun examen n'a encore été joué » ;
     · le résultat : le bilan, les neuf scénarios avec leurs contrôles, chacun avec son SIGNE (✓ ✗ … ?), les « en attente » nommés, la conversation complète dépliable ;
       tout texte venu du serveur est ÉCHAPPÉ ;
     · ⛔ LA CLÉ : montrée UNE fois, dans la réponse qui la crée, copiable ; « J'ai copié la clé » ou cinq minutes et elle disparaît de l'écran ; ensuite l'écran sait qu'elle existe
       (et depuis quand) sans jamais la montrer ; la remplacer demande confirmation ; la supprimer la tue (le serveur la refuse) ;
     · le collaborateur ne lance rien, ne crée rien (le serveur l'a refusé : 403 dit en clair) ;
     · chaque bouton de l'écran appelle une fonction qui existe. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || path.join(RACINE, 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 700)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 400) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2933-'));
const enfants = [];
const fin = () => { enfants.forEach(e => { try { e.kill('SIGKILL'); } catch (x) {} }); try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); fin(); process.exit(1); }, 170000).unref();
const att = async (f, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await f()) return true; await dormir(60); } return false; };
const libre = () => new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

function corps(entete) {
  const i = CODE.indexOf(entete); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, prev = '';
  for (; k < CODE.length; k++) {
    const c = CODE[k], n = CODE[k + 1];
    if (c === '/' && n === '/') { k = CODE.indexOf('\n', k) - 1; continue; }
    if (c === '/' && n === '*') { k = CODE.indexOf('*/', k + 2) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; for (k++; k < CODE.length; k++) { if (CODE[k] === '\\') { k++; continue; } if (CODE[k] === q) break; } prev = 'x'; continue; }
    if (c === '/' && /[(,=:\[!&|?{};]/.test(prev)) { let cl = false; for (k++; k < CODE.length; k++) { const d = CODE[k]; if (d === '\\') { k++; continue; } if (d === '[') cl = true; else if (d === ']') cl = false; else if (d === '/' && !cl) break; } prev = 'x'; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return CODE.slice(i, k + 1); }
    if (!/\s/.test(c)) prev = c;
  }
  return '';
}
const fonction = nom => corps('\nfunction ' + nom + '(').trim();
const ligne = deb => { const i = CODE.indexOf(deb); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const NOMS = ['exHeure', 'exUsd', 'exEcran', 'exEntrer', 'exCharger', 'exSurveiller', 'exOuvrir', 'exBasculer', 'exLancer', 'exCleCreer', 'exCleSupprimer', 'exCleCopier', 'exCleCacher', 'exVerifHtml', 'exFilLib', 'exConvHtml',
  'exScenarioHtml', 'exBilanHtml', 'exSourceLib', 'exResultatHtml', 'exProgresHtml', 'exCleHtml', 'exVue', 'nMot', 'fmtDate', 'msgErreur', 'apiGet', 'apiPost', 'acSquel', 'agIllisible', 'agNom', 'agParId', 'agSec'];
const FN = NOMS.map(fonction);
const VARS = ['var EX=', 'var EX_LIB=', 'var EX_ICO=', 'var EX_PROG=', 'var EX_FILS=', 'var INJOIGNABLE='].map(ligne).join('\n');
vrai('(population) les ' + NOMS.length + ' fonctions de l’onglet Examen et ses tables sont trouvées dans le fichier livré', ESC && FN.every(f => f.length > 30) && VARS.split('\n').every(l => l.length > 20), NOMS.filter((n, i) => FN[i].length <= 30).join(', '));

console.log('\n── 2933 · l’onglet Examen de la Tour contre le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const PRE = path.join(banc, 'claude.js'), DEFAUTS = path.join(banc, 'defauts.json');
  fs.writeFileSync(DEFAUTS, '[]');
  /* Le même équipier que partout, un peu LENT (120 ms par appel) pour qu'on voie l'examen en cours. */
  fs.writeFileSync(PRE, `const vrai = globalThis.fetch; const B = require(${JSON.stringify(path.join(__dirname, 'banc-examen.js'))});
globalThis.fetch = async function (url, opts) { const u = String(url && url.url || url);
  if (u.startsWith('https://api.anthropic.com/')) { let defauts = []; try { defauts = JSON.parse(require('fs').readFileSync(${JSON.stringify(DEFAUTS)}, 'utf8')); } catch (e) {}
    await new Promise(r => setTimeout(r, defauts.includes('rapide') ? 0 : 120));
    return new Response(JSON.stringify(B.reponseHttp(JSON.parse(String(opts && opts.body)), defauts)), { status: 200, headers: { 'content-type': 'application/json' } }); }
  if (u.startsWith('https://api.stripe.com/')) return new Response('{"data":[],"has_more":false}', { status: 200, headers: { 'content-type': 'application/json' } });
  return vrai.apply(this, arguments); };\n`);
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'); const MDP = 'mot-de-passe-du-banc-2933';
  async function serveur(nom) {
    const D = path.join(banc, nom, 'data'); fs.mkdirSync(D, { recursive: true });
    if (!fs.existsSync(path.join(D, 'clients.json'))) { fs.writeFileSync(path.join(D, 'clients.json'), '{}'); fs.writeFileSync(path.join(D, 'espaces.json'), '{}'); }
    const vap = webpush.generateVAPIDKeys(); const conf = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh(MDP), stripe: { secretKey: 'sk_de_banc_2933' }, agents: { cleApi: 'sk-ant-' + 'api03-banc-2933-xxxxxxxxxxxxxxxx', reunionsAuto: false } };
    fs.writeFileSync(path.join(banc, nom, 'config.json'), JSON.stringify(conf));
    const PORT = await libre(); let journal = '';
    const env = Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, nom, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z' });
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], { env, stdio: ['ignore', 'pipe', 'pipe'] });
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; }); enfants.push(e);
    const B = 'http://127.0.0.1:' + PORT; let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    vrai('le serveur « ' + nom + ' » démarre', vivant, journal.slice(0, 600)); if (!vivant) process.exit(1);
    const r = await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.4.0.1' }, body: JSON.stringify({ nom: 'Patron', pass: MDP }) });
    return { B, D, jeton: (await r.json()).token, journal: () => journal, brut: f => { try { return fs.readFileSync(path.join(D, f), 'utf8'); } catch (x) { return null; } },
      arreter: async () => { e.kill('SIGKILL'); await dormir(300); } };
  }

  /* la Tour, face à UN serveur : les vraies fonctions, un faux DOM, une horloge de minuteries que le banc déclenche à la main */
  function tour(S, o) {
    o = o || {}; let n = 0;
    const j = { toasts: [], confirms: [], peintures: 0, minuteries: [], copie: [], fetchs: 0 };
    const ctx = { fetch: (u, opt) => { j.fetchs++; return fetch(u, opt); }, API: S.B, Object, String, JSON, Promise, Math, Number, Array, Date, Error, Response, TypeError, console, clearTimeout: id => { const m = j.minuteries.find(x => x.id === id); if (m) m.annule = true; },
      setTimeout: (f, ms) => { const m = { f, ms, id: j.minuteries.length + 1, annule: false }; j.minuteries.push(m); return m.id; },
      TAB: 'agents', MYROLE: o.role || 'patron', agDosCharger: () => {}, document: { visibilityState: 'visible' }, APPS_TOUR: {}, AG: { sec: 'examen', agents: o.agents || [], dos: { lec: 1, q: '' } },
      toast: t => j.toasts.push(t), confirm: m => { j.confirms.push(m); return o.confirme !== false; }, render: () => { j.peintures++; }, doLogout: () => {},
      navigator: { clipboard: { writeText: async t => { if (o.copieRefusee) throw new Error('refus'); j.copie.push(t); } } } };
    ctx.hAuth = () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + (o.jeton || S.jeton), 'X-Forwarded-For': '10.3.' + Math.floor(n++ / 40) + '.1' });
    ctx.srvRepond = r => r; ctx.srvMuet = e => { throw e; };
    vm.createContext(ctx);
    vm.runInContext(ESC + '\n' + VARS + '\n' + FN.join('\n') + '\n' + NOMS.concat(['EX', 'EX_LIB', 'EX_ICO', 'EX_PROG', 'EX_FILS']).map(x => 'this.' + x + '=' + x + ';').join(''), ctx);
    ctx.__j = j;
    return ctx;
  }
  const texte = h => h.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
  const tictac = async (T, fois) => { for (let i = 0; i < (fois || 1); i++) { const m = T.__j.minuteries.filter(x => !x.annule && x.ms === 4000).pop(); if (!m) return false; m.annule = true; m.f(); await dormir(30); } return true; };

  let S = await serveur('principal');
  const REG = (await (await fetch(S.B + '/api/monitor/agents', { headers: { Authorization: 'Bearer ' + S.jeton } })).json()).agents;
  let T = tour(S, { agents: REG });

  console.log('\n1. ⛔ Trois états : avant la lecture, un squelette ; un serveur coupé ne se dessine JAMAIS « aucun examen »');
  vrai('avant toute lecture : un squelette, pas un texte', /ac-squel/.test(T.exVue()) && !/Aucun examen/.test(T.exVue()));
  {
    const mort = tour({ B: 'http://127.0.0.1:1', jeton: 'x' }, { agents: REG });
    await mort.exCharger();
    const h = texte(mort.exVue());
    v('serveur injoignable : état « −1 », l’écran dit qu’il n’a pas pu lire, propose de réessayer — jamais « Aucun examen »', [mort.EX.lec, /n’a pas pu être lu/.test(h), /Réessayer/.test(h), /Aucun examen/.test(h)], [-1, true, true, false]);
    const refus = tour(S, { agents: REG, jeton: 'a'.repeat(48) });
    await refus.exCharger();
    v('session refusée (401) : la Tour se déconnecte (comme partout) et l’écran reste un squelette — jamais « Aucun examen » non plus', [/Aucun examen/.test(texte(refus.exVue())), refus.EX.lec], [false, 0]);
    const collab = tour(S, { agents: REG, role: 'collab' });
    await collab.exCharger();
    v('un compte qui n’est pas le patron : « Réservé au patron », rien n’est demandé au serveur', [collab.EX.lec, /Réservé au patron/.test(texte(collab.exVue()))], [-1, true]);
    collab.EX.d = { limites: { appelsMax: 200, usdMax: 12 } }; collab.exLancer(); collab.exCleCreer(); collab.exCleSupprimer();
    v('…et ses boutons ne font rien (ni confirmation, ni requête)', [collab.__j.confirms.length, collab.EX.busy], [0, false]);
  }

  {
    const T0 = tour(S, { agents: REG }); T0.AG.sec = 'equipe';
    const f0 = T0.__j.fetchs; T0.agSec('examen'); await dormir(300);
    v('⛔ choisir l’onglet « Examen » relit le serveur (agSec → exEntrer), vide la clé de l’écran et repeint', [T0.AG.sec, T0.__j.fetchs > f0, T0.EX.lec, T0.__j.peintures > 0], ['examen', true, 1, true]);
    T0.EX.cle = 'exam_' + 'a'.repeat(48); T0.agSec('equipe'); T0.agSec('examen');
    v('…revenir sur l’onglet efface une clé restée en mémoire', T0.EX.cle, '');
  }

  console.log('\n2. L’écran lit le serveur : le bouton, le coût annoncé, aucun résultat, aucune clé');
  T.TAB = 'agents'; T.AG.sec = 'examen';
  await T.exEntrer(); await dormir(100);
  let h = texte(T.exVue());
  v('lu (état 1) : aucun résultat, rien en cours', [T.EX.lec, T.EX.d.resultats.length, T.EX.d.courant], [1, 0, null]);
  vrai('le bouton « Faire passer l’examen à l’équipe » est là, actif', /Faire passer l’examen à l’équipe/.test(h) && !/disabled/.test(T.exVue().match(/<button[^>]*onclick="exLancer\(\)"[^>]*>/)[0]));
  vrai('⛔ le coût est dit AVANT de lancer : 200 appels, 12 $, budget du mois, un par heure', /Au plus 200 appels à Claude/.test(h) && /12 \$ au maximum/.test(h) && /budget du mois des agents/.test(h) && /un examen par heure/.test(h), h.slice(0, 600));
  vrai('…et il dit que rien de réel n’est touché', /aucun vrai fil, aucun vrai client, aucun courriel envoyé/.test(h));
  vrai('un examen jamais joué : « Aucun examen n’a encore été joué » (cet état-là est VRAI : la lecture a réussi)', /Aucun examen n’a encore été joué/.test(h));
  vrai('la carte de la clé : « Aucune clé n’est vivante », le bouton « Créer une clé », les deux commandes sans la clé', /Aucune clé n’est vivante/.test(h) && /Créer une clé/.test(h) && /\$CLE_EXAMEN/.test(h) && /examen\/lancer/.test(h) && /examen\/resultat/.test(h) && !/exam_[a-f0-9]{48}/.test(h));

  console.log('\n3. Lancer : la confirmation porte le coût ; refuser ne lance rien');
  T.__j.confirms.length = 0;
  const tourRefus = tour(S, { agents: REG, confirme: false });
  await tourRefus.exCharger();
  tourRefus.exLancer();
  await dormir(150);
  v('confirmation refusée : aucune requête (le serveur ne voit aucun examen), le bouton n’est pas bloqué', [tourRefus.__j.confirms.length, (await (await fetch(S.B + '/api/monitor/agents/examen', { headers: { Authorization: 'Bearer ' + S.jeton } })).json()).courant, tourRefus.EX.busy], [1, null, false]);
  vrai('⛔ la fenêtre de confirmation dit le coût du SERVEUR (200 appels, 12 $), le vrai modèle, l’équipe d’essai et le budget', /au plus 200 appels à Claude/.test(tourRefus.__j.confirms[0]) && /12 \$ au maximum/.test(tourRefus.__j.confirms[0]) && /vrai modèle/.test(tourRefus.__j.confirms[0]) && /équipe d’essai/.test(tourRefus.__j.confirms[0]) && /budget du mois/.test(tourRefus.__j.confirms[0]), tourRefus.__j.confirms[0]);
  T.exLancer();
  vrai('la confirmation est demandée, le bouton se grise (« Lancement… ») avant la réponse du serveur', T.__j.confirms.length === 1 && T.EX.busy === true && /Lancement…/.test(texte(T.exVue())));
  await att(() => T.EX.busy === false && T.EX.d && T.EX.d.courant, 6000);
  vrai('le serveur a répondu 202 : « L’examen est lancé », et l’écran relit — l’examen est EN COURS', T.__j.toasts.includes('L’examen est lancé.') && !!T.EX.d.courant, JSON.stringify(T.__j.toasts));
  h = texte(T.exVue());
  vrai('pendant l’examen : « Examen en cours », les neuf scénarios, appels et dollars sur leurs plafonds, le bouton grisé', /Examen en cours/.test(h) && T.EX.d.courant.scenarios.length === 9 && /sur 200 au plus/.test(h) && /sur 12 \$ au plus/.test(h) && /Examen en cours…/.test(h) && /disabled/.test(T.exVue().match(/<button[^>]*onclick="exLancer\(\)"[^>]*>/)[0]), h.slice(0, 700));
  vrai('…les scénarios portent leur état (« en cours… » ou « à venir »)', /en cours…/.test(h) && /à venir|réussi/.test(h));
  vrai('…la minuterie de relecture est posée à 4 secondes', T.__j.minuteries.some(m => m.ms === 4000 && !m.annule));
  const T2 = tour(S, { agents: REG });
  T2.TAB = 'accueil';
  await T2.exCharger();
  vrai('⛔ l’écran QUITTÉ : la minuterie, quand elle se déclenche, ne relit rien (aucune requête, aucune peinture) et ne se ré-arme pas', await (async () => { const f0 = T2.__j.fetchs, p0 = T2.__j.peintures, m0 = T2.__j.minuteries.length; const a = await tictac(T2); return a === true && T2.__j.fetchs === f0 && T2.__j.peintures === p0 && T2.__j.minuteries.length === m0; })());
  const lance2 = await (await fetch(S.B + '/api/monitor/agents/examen/lancer', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + S.jeton, 'X-Forwarded-For': '10.2.0.1' }, body: '{}' })).json();
  v('un second lancement pendant l’examen : 409 « en_cours »', lance2.raison, 'en_cours');
  let tours = 0;
  while (T.EX.d.courant && tours++ < 100) { await tictac(T); await dormir(150); }
  vrai('en relisant toutes les 4 s (déclenchées à la main), l’écran voit la FIN de l’examen', !T.EX.d.courant && T.EX.d.resultats.length === 1, 'tours ' + tours);
  vrai('…et le dit : « L’examen est terminé : 9 réussis, 0 échec. »', T.__j.toasts.includes('L’examen est terminé : 9 réussis, 0 échec.'), JSON.stringify(T.__j.toasts));
  await att(() => T.EX.resLec[T.EX.d.resultats[0].id] === 1, 4000);

  console.log('\n4. Le résultat : le bilan, les neuf scénarios, les signes, les « en attente » nommés, la conversation');
  const R0 = T.EX.d.resultats[0];
  h = texte(T.exVue());
  vrai('le résultat est lu (état 1) et montré : « Résultat », le bilan « ✓ 9 réussis », « ✗ 0 échec »', T.EX.resLec[R0.id] === 1 && /Résultat/.test(h) && /✓ 9 réussis/.test(h) && /✗ 0 échec/.test(h), h.slice(0, 500));
  vrai('…provenance, coût et durée : « depuis la Tour », appels, dollars', /depuis la Tour/.test(h) && /\d+ appels/.test(h) && /\d+(,\d+)? \$/.test(h));
  for (let n = 1; n <= 9; n++) vrai('scénario ' + n + ' : son titre et son verdict (« Réussi »)', new RegExp(n + '\\. ' + T.EX.res[R0.id].scenarios[n - 1].titre.slice(0, 18).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(h.replace(/&#39;/g, '\'')) && T.EX.res[R0.id].scenarios[n - 1].etat === 'ok');
  vrai('chaque contrôle porte son signe (✓) et un libellé lisible', (T.exVue().match(/class="ex-v ok"/g) || []).length > 40, (T.exVue().match(/class="ex-v ok"/g) || []).length);
  /* 23 octobre 2026 (fusion de l'intégration) : le serveur LIVRE désormais les quatre comportements du chantier commercial — le résultat réel n'a plus aucune ligne « en attente ». L'écran sait pourtant
     toujours MONTRER une attente (un module qui manquerait) : on le prouve sur un scénario fabriqué, jamais en la faisant passer pour un ✓. */
  vrai('⛔ le résultat réel : les quatre comportements du chantier commercial sont livrés — aucune ligne « en attente » à l\'écran', (T.exVue().match(/class="ex-v attente"/g) || []).length === 0 && !/en attente de /.test(h) && !/en attente d’un module/.test(h));
  const ATT = { n: 6, titre: 'Le premier courriel de Léa, signé et contrôlé', etat: 'attente', appels: 3, duree: 4, conversation: [],
    verifs: [{ libelle: 'Léa — signé « Léa » par le serveur (prénom de l’agent, ajouté à l’envoi)', etat: 'attente', detail: 'en attente de la signature par agent (chantier auto-commercial) — constat : signature ajoutée : « »' },
      { libelle: 'Léa — contrôle qualité du serveur vert sur chaque courriel', etat: 'attente', detail: 'en attente de le contrôle qualité automatique des mails (chantier auto-commercial) — constat : le contrôle qualité des mails n’est pas dans ce serveur' },
      { libelle: 'Léa — « Bonjour, » en tête', etat: 'ok', detail: '' }] };
  const hAtt = T.exScenarioHtml(ATT, 'att');
  vrai('⛔ une ATTENTE (module absent) est montrée avec son signe « … », nommée, sans passer pour un ✓', (hAtt.match(/class="ex-v attente"/g) || []).length === 2 && /en attente de la signature par agent/.test(texte(hAtt)) && /en attente de le contrôle qualité/.test(texte(hAtt)) && (hAtt.match(/class="ex-v ok"/g) || []).length === 1);
  vrai('…et le scénario qui en porte dit « 2 en attente d’un module »', /2 en attente d’un module/.test(texte(hAtt)), texte(hAtt).slice(0, 300));
  vrai('chaque verdict a aussi un texte pour un lecteur d’écran (« Réussi : », « En attente : »)', /Réussi : /.test(h) && /En attente : /.test(hAtt));
  vrai('la conversation est repliée par défaut (bouton « Voir la conversation (n) »)', /Voir la conversation \(\d+\)/.test(h) && !/class="ex-conv"/.test(T.exVue()));
  T.exBasculer(R0.id + ':1');
  let h1 = T.exVue();
  vrai('…dépliée : les messages de Justin et de Margaux, avec le fil', /class="ex-conv"/.test(h1) && /Justin · Margaux/.test(texte(h1)) && /Margaux · Margaux/.test(texte(h1)) && /Masquer la conversation/.test(h1) && /aria-expanded="true"/.test(h1));
  T.exBasculer(R0.id + ':1');
  vrai('…et se replie', !/class="ex-conv"/.test(T.exVue()));
  T.exBasculer(R0.id + ':7');
  vrai('la conversation d’un scénario de courrier montre les courriels reçus et rédigés', /Courriel reçu \(fictif\)/.test(texte(T.exVue())) && /Camille \(envoi\)/.test(texte(T.exVue())));
  T.exBasculer(R0.id + ':7');
  const xss = T.exScenarioHtml({ n: 1, titre: '<b>titre</b>', etat: 'ko', verifs: [{ libelle: '<img src=x onerror=alert(1)>', etat: 'ko', detail: '"><script>alert(1)</script>' }], conversation: [{ nom: '<i>nom</i>', fil: 'clients', texte: '<script>alert(2)</script>', systeme: false }], appels: 1, duree: 2 }, 'zz');
  T.EX.ouvert['zz:1'] = true;
  const xss2 = T.exScenarioHtml({ n: 1, titre: '<b>titre</b>', etat: 'ko', verifs: [{ libelle: '<img src=x onerror=alert(1)>', etat: 'ko', detail: '"><script>alert(1)</script>' }], conversation: [{ nom: '<i>nom</i>', fil: 'clients', texte: '<script>alert(2)</script>', systeme: false }], appels: 1, duree: 2 }, 'zz');
  vrai('⛔ tout texte venu du serveur est ÉCHAPPÉ (titre, libellé, constat, nom, message)', !/<script|<img|<i>nom|<b>titre/.test(xss2) && /&lt;script&gt;alert\(2\)/.test(xss2) && /&lt;img src=x onerror/.test(xss2), xss2.slice(0, 400));
  v('un verdict inconnu du serveur se lit « à relancer » (jamais un ✓ par défaut)', /class="ex-v inconnu"/.test(T.exVerifHtml({ libelle: 'x', etat: 'bizarre' })), true);

  console.log('\n5. ⛔ LA CLÉ : montrée une fois, copiable, puis jamais revue ; remplacer demande confirmation ; supprimer la tue');
  T.__j.confirms.length = 0; T.__j.toasts.length = 0;
  T.exCleCreer();
  vrai('aucune clé vivante : pas de confirmation ; le bouton se grise le temps de la requête', T.__j.confirms.length === 0 && T.EX.busy === true);
  await att(() => T.EX.busy === false && T.EX.cle, 4000);
  const CLE = T.EX.cle;
  vrai('le serveur rend la clé : « exam_ » + 48 hexadécimaux, gardée en mémoire de la page', /^exam_[a-f0-9]{48}$/.test(CLE), CLE);
  await dormir(150);
  h1 = T.exVue();
  vrai('⛔ la clé est MONTRÉE dans un encart qui prévient « elle ne sera plus jamais affichée », avec « Copier la clé » et « J’ai copié la clé »', (h1.match(new RegExp(CLE, 'g')) || []).length === 1 && /ne sera plus jamais affichée/.test(h1) && /Copier la clé/.test(h1) && /J’ai copié la clé/.test(h1) && /role="alert"/.test(h1));
  vrai('…le toast le rappelle', T.__j.toasts.some(t => /Clé créée/.test(t) && /ne sera plus montrée/.test(t)), JSON.stringify(T.__j.toasts));
  T.exCleCopier(); await dormir(30);
  v('copier : la clé part dans le presse-papiers, entière', [T.__j.copie, T.__j.toasts[T.__j.toasts.length - 1]], [[CLE], 'Clé copiée.']);
  const T3 = tour(S, { agents: REG, copieRefusee: true }); T3.EX.cle = CLE; T3.exCleCopier(); await dormir(30);
  vrai('un presse-papiers qui refuse : le dit, et la clé reste affichée pour qu’on la copie à la main', /Copie impossible/.test(T3.__j.toasts.join(' ')) && T3.EX.cle === CLE);
  const m5 = T.__j.minuteries.filter(x => x.ms === 300000 && !x.annule);
  vrai('⛔ une minuterie de cinq minutes efface la clé de l’écran', m5.length === 1);
  T.exCleCacher();
  h1 = T.exVue();
  vrai('« J’ai copié la clé » : la clé disparaît de la page', T.EX.cle === '' && !h1.includes(CLE) && !/ne sera plus jamais affichée/.test(h1));
  await T.exCharger(); await dormir(100);
  h = texte(T.exVue());
  vrai('⛔ la page sait que la clé existe, depuis quand et qui l’a créée — sans la montrer', /Une clé est vivante depuis le/.test(h) && /créée par Patron/.test(h) && !T.exVue().includes(CLE) && !T.exVue().includes(CLE.slice(5)) && /Remplacer la clé/.test(h) && /Supprimer la clé/.test(h));
  vrai('⛔ la clé n’a laissé aucune trace dans le dossier de données du serveur (elle n’y a jamais été écrite)', !(S.brut('examen-etat.json') || '').includes(CLE.slice(5)));
  const bon = await fetch(S.B + '/api/monitor/agents/examen', { headers: { Authorization: 'Bearer ' + CLE, 'X-Forwarded-For': '10.2.1.1' } });
  v('(le serveur) la clé montrée fonctionne vraiment', bon.status, 200);
  T.__j.confirms.length = 0;
  const T4 = tour(S, { agents: REG, confirme: false }); await T4.exCharger();
  T4.exCleCreer(); await dormir(150);
  v('remplacer la clé demande confirmation (« l’ancienne cessera de fonctionner ») ; refusée : rien ne change', [T4.__j.confirms.length, /cessera de fonctionner/.test(T4.__j.confirms[0]), T4.EX.cle], [1, true, '']);
  T.exCleCreer(); await att(() => T.EX.cle && T.EX.cle !== CLE, 4000);
  const CLE2 = T.EX.cle;
  vrai('remplacer (confirmé) : une AUTRE clé, montrée', T.__j.confirms.length === 1 && /^exam_[a-f0-9]{48}$/.test(CLE2) && CLE2 !== CLE);
  v('(le serveur) la première est morte, la seconde vit', [(await fetch(S.B + '/api/monitor/agents/examen', { headers: { Authorization: 'Bearer ' + CLE, 'X-Forwarded-For': '10.2.1.2' } })).status, (await fetch(S.B + '/api/monitor/agents/examen', { headers: { Authorization: 'Bearer ' + CLE2, 'X-Forwarded-For': '10.2.1.3' } })).status], [401, 200]);
  T.__j.confirms.length = 0;
  T.exCleSupprimer();
  vrai('supprimer : confirmation, et la clé montrée s’efface aussitôt de l’écran', T.__j.confirms.length === 1 && T.EX.cle === '' && !T.exVue().includes(CLE2));
  await att(() => T.EX.busy === false && T.EX.d && T.EX.d.cle && T.EX.d.cle.existe === false, 4000);
  h = texte(T.exVue());
  vrai('…le serveur l’a supprimée : « Aucune clé n’est vivante », et la clé est refusée', /Aucune clé n’est vivante/.test(h) && (await fetch(S.B + '/api/monitor/agents/examen', { headers: { Authorization: 'Bearer ' + CLE2, 'X-Forwarded-For': '10.2.1.4' } })).status === 401);

  console.log('\n6. Un par heure : le refus du serveur se DIT');
  T.__j.toasts.length = 0;
  h = texte(T.exVue());
  vrai('le prochain examen est annoncé (« Le prochain examen sera possible à… ») et le bouton est grisé', /Le prochain examen sera possible à \d\d h \d\d/.test(h) && /disabled/.test(T.exVue().match(/<button[^>]*onclick="exLancer\(\)"[^>]*>/)[0]), h.slice(0, 500));
  T.exLancer();
  await att(() => T.EX.busy === false, 4000);
  vrai('forcé quand même (la confirmation passe) : le serveur répond 429 et l’écran DIT le refus', T.__j.toasts.some(t => /Un examen par heure au plus/.test(t)), JSON.stringify(T.__j.toasts));

  console.log('\n7. Plusieurs examens gardés : on rouvre l’ancien');
  await S.arreter();
  const e = JSON.parse(S.brut('examen-etat.json')); e.dernier = 0; e.jour = { j: '', n: 0 }; fs.writeFileSync(path.join(S.D, 'examen-etat.json'), JSON.stringify(e));
  fs.writeFileSync(DEFAUTS, JSON.stringify(['rapide', 'margaux-renvoie']));
  S = await serveur('principal');
  T = tour(S, { agents: REG });
  await T.exEntrer(); await dormir(150);
  T.exLancer(); await att(() => T.EX.d && T.EX.d.courant, 4000);
  tours = 0; while (T.EX.d.courant && tours++ < 100) { await tictac(T); await dormir(150); }
  await att(() => T.EX.resLec[T.EX.d.resultats[0].id] === 1, 4000);
  h = texte(T.exVue());
  vrai('deux examens gardés ; le plus récent s’ouvre : « ✓ 8 réussis », « ✗ 1 échec », le scénario 1 en ✗ avec la raison de Margaux', T.EX.d.resultats.length === 2 && /✓ 8 réussis/.test(h) && /✗ 1 échec/.test(h) && /passe la demande/.test(h) && /class="ex-badge ko"/.test(T.exVue()), h.slice(0, 400));
  vrai('…et la liste « Les examens gardés » montre les deux, le courant marqué', /Les examens gardés/.test(h) && (T.exVue().match(/<li><button/g) || []).length === 2 && /aria-current="true"/.test(T.exVue()));
  const ancien = T.EX.d.resultats[1].id;
  T.exOuvrir(ancien); await att(() => T.EX.resLec[ancien] === 1, 4000);
  vrai('rouvrir l’ancien : son résultat (9 réussis) remplace l’autre à l’écran', /✓ 9 réussis/.test(texte(T.exVue())) && T.EX.voir === ancien);
  const inconnu = tour(S, { agents: REG });
  await inconnu.exCharger();
  inconnu.exOuvrir('inconnu123'); await att(() => inconnu.EX.resLec['inconnu123'] !== 0, 4000);
  vrai('un résultat qui n’existe plus : « n’a pas pu être lu », avec « Réessayer » (jamais un écran vide)', inconnu.EX.resLec['inconnu123'] === -1 && /n’a pas pu être lu/.test(texte(inconnu.exResultatHtml('inconnu123'))) && /Réessayer/.test(inconnu.exResultatHtml('inconnu123')));

  console.log('\n8. Chaque bouton de l’écran appelle une fonction qui existe');
  T.EX.d.cle = { existe: true, creeLe: 1, par: 'P' }; T.EX.cle = 'exam_' + '0'.repeat(48);
  const appelles = new Set(); for (const mm of (T.exVue() + T.exCleHtml() + T.exProgresHtml({ id: 'a', debut: 1, source: 'tour', scenarios: [{ n: 1, titre: 't', etat: 'en_cours' }], appels: 1, usd: 0, appelsMax: 200, usdMax: 12 })).matchAll(/onclick="([a-zA-Z_]+)\(/g)) appelles.add(mm[1]);
  vrai('(population) l’écran porte au moins cinq boutons différents', appelles.size >= 5, [...appelles].join(' '));
  v('…tous ont leur fonction dans la page', [...appelles].filter(f => typeof T[f] !== 'function' && !NOMS.includes(f)), []);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(1); });
