/* ⛔ CE QUE CE FICHIER GARDE — UNE SUSPENSION N'EST PAS UNE FERMETURE, À TOUTES LES PORTES.

   Justin, 20 septembre 2026 : « pour continuer à lire, ils auront un délai de 7 jours. Si c'est
   pas payé après, tous les onglets deviennent gris. Aucune sauvegarde n'est perdue, aucune tâche
   qu'ils étaient en train de faire, rien n'est perdu […] Après, c'est pas aux utilisateurs de
   savoir si l'entreprise paye ou pas. Que le compte admin. »

   La route de suspension ne coupait plus Firebase depuis ce jour-là. Mais `entFermes.espaces`
   porte les DEUX états (fermée pour de bon, suspendue pour impayé), et ONZE portes du serveur
   lisaient la liste en bloc — relevé par `gardien` le 24 septembre 2026, avant tout déploiement.
   Une entreprise suspendue perdait donc, sans que personne le voie :
     · son jeton Firebase — un appareil neuf ou déconnecté ne synchronisait plus rien ;
     · ses PHOTOS (les pièces jointes passent par `sauvRefus`) et ses copies de sauvegarde ;
     · sa connexion par nom et code, et par identifiant ; le dépôt de son annuaire ; ses ordres ;
     · ses abonnements aux notifications, son COURRIER REÇU (jeté à la relève), ses rapports
       d'erreur et ses connexions, que la Tour ne voyait plus.
   Exactement ce que la décision interdit, et ce que `mentions-legales.html:74` promet de ne pas
   faire (« un impayé n'entraîne aucune suppression »).

   ⛔⛔ ET LE DÉFAUT INVERSE, TROUVÉ EN CHEMIN, EST PIRE. Les deux fermetures définitives
   ajoutaient l'identifiant à `entFermes.espaces` sans le retirer de `suspendus`. Une entreprise
   suspendue PUIS fermée restait donc « suspendue » : `/api/espaces/etat` lui rendait son état
   normal (ses appareils ne se vidaient jamais) et la Tour affichait « Rouvrir » sur une fermeture
   qui avait exigé un code par courriel. Corriger la première moitié sans la seconde aurait ROUVERT
   ces entreprises à toutes les portes à la fois.

   Ce banc lance le VRAI serveur, isolé, sur 127.0.0.1, avec quatre entreprises :
     S — suspendue, à l'annuaire          → elle TRAVAILLE partout
     F — fermée, mais revenue à l'annuaire (réinscrite sous la même adresse) → refusée partout
     O — suspendue PUIS fermée, fichier écrit avant le correctif (hors annuaire) → refusée partout
     A — active, le témoin                → travaille partout
   ⚠️ Jamais api.teamop.fr. Saute tout seul si `server/node_modules` manque. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));

/* ══ 0. LA COUTURE, LUE DANS LE TEXTE — COMMENTAIRES RETIRÉS ══════════════════════════════ */
console.log('\n══ 0. ⛔ UNE SEULE QUESTION, UNE SEULE FONCTION ══\n');
{
  /* ⛔ Le texte brut d'abord pour les ancres ; le nettoyage ensuite, et seulement les blocs qui
     COMMENCENT une ligne (règle du dépôt : le motif naïf avale du vrai code). */
  const BRUT = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
  const SRV = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('la fonction `espaceFerme` existe', /function espaceFerme\(t\) \{/.test(SRV));
  vrai('⛔ elle exclut les suspendues', /return entFermes\.espaces\.includes\(k\) && !espaceEstSuspendu\(k\);/.test(SRV));
  vrai('⛔ et une suspendue sortie de l\'annuaire n\'en est plus une',
    /\(entFermes\.suspendus \|\| \[\]\)\.includes\(k\) && !!espaceParT\(k\)/.test(SRV));

  /* ⛔⛔ AUCUNE PORTE NE RELIT LA LISTE EN BLOC. On recense TOUTES les lectures de
     `entFermes.espaces.includes(` et on n'en admet que quatre formes, nommées :
       · la définition de `espaceFerme` ;
       · une garde d'ÉCRITURE (`if (!…includes(t)) entFermes.espaces.push(t)`) ;
       · le drapeau d'AFFICHAGE `suspendu:` de la Tour (« accès coupé », les deux états) ;
       · la garde de la route de suspension (« on ne suspend pas une fermée »).
     Une douzième porte qui lirait la liste en bloc fait tomber ce contrôle. */
  const lectures = [];
  let i = -1;
  while ((i = SRV.indexOf('entFermes.espaces.includes(', i + 1)) >= 0) {
    const ligne = SRV.slice(SRV.lastIndexOf('\n', i) + 1, SRV.indexOf('\n', i));
    lectures.push(ligne.trim());
  }
  const admise = (l) =>
    /^function espaceFerme\(t\) \{/.test(l)
    || /if \(!entFermes\.espaces\.includes\(t\)\) entFermes\.espaces\.push\(t\)/.test(l)
    || /^suspendu: entFermes\.espaces\.includes\(/.test(l)
    || /espace: \{ nom: e\.nom \|\| slug, [^}]*suspendu: entFermes\.espaces\.includes\(t\) \}/.test(l)
    || /^if \(!rouvrir && entFermes\.espaces\.includes\(t\) && !entFermes\.suspendus\.includes\(t\)\)/.test(l);
  vrai('   la population est là (sinon un zéro ne prouverait rien)', lectures.length >= 6);
  v('⛔⛔ aucune lecture en bloc hors des quatre formes admises', lectures.filter(l => !admise(l)), []);
  const portes = (SRV.match(/espaceFerme\(/g) || []).length;
  vrai('   et les portes lisent `espaceFerme` (au moins treize appels)', portes >= 14);

  /* ⛔ LES DEUX FERMETURES DÉFINITIVES RETIRENT LA SUSPENSION. */
  const iRetirer = SRV.indexOf('if (!entFermes.emails.includes(email)) entFermes.emails.push(email);');
  const blocRetirer = iRetirer > 0 ? SRV.slice(iRetirer, iRetirer + 1200) : '';
  vrai('   la fermeture d\'un client est trouvée', iRetirer > 0);
  vrai('⛔ fermer un client retire la suspension',
    /entFermes\.suspendus = \(entFermes\.suspendus \|\| \[\]\)\.filter\(x => x !== t\); delete \(entFermes\.suspendusLe \|\| \{\}\)\[t\];/.test(blocRetirer));
  const iSuppr = SRV.indexOf('for (const m of inv.emails) if (!entFermes.emails.includes(m)) entFermes.emails.push(m);');
  const blocSuppr = iSuppr > 0 ? SRV.slice(Math.max(0, iSuppr - 400), iSuppr) : '';
  vrai('   la suppression d\'une entreprise est trouvée', iSuppr > 0);
  vrai('⛔ supprimer une entreprise retire la suspension',
    /entFermes\.suspendus = \(entFermes\.suspendus \|\| \[\]\)\.filter\(x => x !== t\); delete \(entFermes\.suspendusLe \|\| \{\}\)\[t\];/.test(blocSuppr));
}

/* ══ LE VRAI SERVEUR ═══════════════════════════════════════════════════════════════════════ */
let webpush;
try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
catch (e) {
  console.log('\n(server/node_modules absent : la partie serveur saute)');
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
}

let enfant = null;
const arreter = () => { try { if (enfant && enfant.exitCode === null) enfant.kill('SIGKILL'); } catch (e) {} };
process.on('exit', arreter);

(async () => {
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'susp-796-'));
  const data = path.join(banc, 'data');
  fs.mkdirSync(data, { recursive: true });
  const sha = s => crypto.createHash('sha256').update(s).digest('hex');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const MDP = 'mdp-banc-796';
  /* ⚠️ Des identifiants qui portent des lettres HORS de [0-9a-f] : un jeton court cherché dans une
     sortie qui contient une empreinte y tombe au hasard (règle du dépôt, `test-723`). */
  const S = { t: 'ent-susp-qk', slug: 'suspenduesa', nom: 'Suspendue SA', k: 'CLE-SUSPENDUE-PRIVEE', acces: 'SUSPCODEQ1' };
  const F = { t: 'ent-ferm-zk', slug: 'fermeerevenue', nom: 'Fermée Revenue', k: 'CLE-FERMEE-PRIVEE', acces: 'FERMCODEZ2' };
  const O = { t: 'ent-orph-xk', k: 'CLE-ORPHELINE-PRIVEE' };
  const A = { t: 'ent-actv-wk', slug: 'activesarl', nom: 'Active SARL', k: 'CLE-ACTIVE-PRIVEE', acces: 'ACTVCODEW3' };
  /* ⚠️ La clé d'annuaire EST le nom passé par `espSlug` (sans accents ni tirets) : une clé
     écrite autrement rend l'entreprise introuvable par son nom, et chaque porte répond 404 ou
     « code incorrect » pour une raison qui n'a rien à voir avec ce qu'on mesure. Payé à la
     première exécution de ce banc — le TÉMOIN actif était refusé lui aussi, c'est ce qui l'a dit. */
  const JOUR = 86400000, maintenant = Date.now();
  fs.writeFileSync(path.join(data, 'espaces.json'), JSON.stringify({
    [S.slug]: { slug: S.slug, nom: S.nom, email: 's@exemple.fr', t: S.t, code: b64({ t: S.t, k: S.k }), ts: 1 },
    [F.slug]: { slug: F.slug, nom: F.nom, email: 'f@exemple.fr', t: F.t, code: b64({ t: F.t, k: F.k }), ts: 2 },
    [A.slug]: { slug: A.slug, nom: A.nom, email: 'a@exemple.fr', t: A.t, code: b64({ t: A.t, k: A.k }), ts: 3 },
  }));
  fs.writeFileSync(path.join(data, 'acces.json'), JSON.stringify({
    [S.t]: { code: S.acces }, [F.t]: { code: F.acces }, [A.t]: { code: A.acces } }));
  /* La forme EXACTE d'un fichier écrit avant le correctif : O est suspendue ET fermée (la
     fermeture ne la retirait pas de `suspendus`), et elle n'est plus à l'annuaire. */
  const FERMES = { emails: ['o@exemple.fr'], espaces: [S.t, F.t, O.t], suspendus: [S.t, O.t],
    suspendusLe: { [S.t]: maintenant - JOUR, [O.t]: maintenant - 3 * JOUR } };
  fs.writeFileSync(path.join(data, 'entreprises-fermees.json'), JSON.stringify(FERMES));
  const vap = webpush.generateVAPIDKeys();
  const cfgPath = path.join(banc, 'config.json');
  fs.writeFileSync(cfgPath, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey,
    apiKey: 'banc', adminPassHash: sha(MDP) }));
  const port = await new Promise(r => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  let journal = '';
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  const post = async (route, corps, jeton) => {
    const r = await fetch(B + route, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' },
      jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps || {}) });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
    return { code: r.status, j: j || {}, txt };
  };
  const get = async (route, jeton) => {
    const r = await fetch(B + route, { headers: jeton ? { Authorization: 'Bearer ' + jeton } : {} });
    const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
    return { code: r.status, j: j || {}, txt };
  };
  const ferme = (x) => /ferm/i.test(String((x.j && x.j.error) || '')) || (x.j && x.j.ferme === true);

  try {
    console.log('\n══ 1. LE SERVEUR DÉMARRE SUR CE FICHIER ══\n');
    vrai('   le vrai serveur répond', vivant);
    if (!vivant) throw new Error('serveur muet : ' + journal.slice(-600));

    console.log('\n══ 2. ⛔ `/api/espaces/etat` — CE QUE L\'APPLICATION DEMANDE À CHAQUE LANCEMENT ══\n');
    {
      const s = await post('/api/espaces/etat', { t: S.t });
      v('⛔ la suspendue reçoit son état NORMAL, pas « fermé »', s.j.ferme, undefined);
      v('   elle se sait suspendue — de quoi griser au bon moment', s.j.suspendu, true);
      v('   il lui reste six jours', s.j.sursisJours, 6);
      v('⛔ la fermée revenue à l\'annuaire est fermée', (await post('/api/espaces/etat', { t: F.t })).j.ferme, true);
      /* ⛔⛔ LE DÉFAUT INVERSE : avant, O recevait son état normal et ses appareils ne se
         vidaient jamais, parce qu'elle était restée dans `suspendus`. */
      v('⛔⛔ la suspendue PUIS fermée (fichier d\'avant) est FERMÉE', (await post('/api/espaces/etat', { t: O.t })).j.ferme, true);
      const a = await post('/api/espaces/etat', { t: A.t });
      v('   l\'active : ni fermée, ni suspendue', [a.j.ferme, a.j.suspendu], [undefined, false]);
    }

    console.log('\n══ 3. ⛔ LA SYNCHRO, LES PHOTOS, LES SAUVEGARDES (`sauvRefus`) ══\n');
    {
      /* Le jeton Firebase : sans clé d'administration dans ce banc, la route ne peut pas signer ;
         ce qui compte ici est qu'elle ne refuse PLUS la suspendue comme « fermée ». */
      const js = await post('/api/fb/jeton', { t: S.t, kh: sha(S.k) });
      v('⛔ jeton Firebase : la suspendue n\'est PLUS refusée comme fermée', ferme(js), false);
      const jf = await post('/api/fb/jeton', { t: F.t, kh: sha(F.k) });
      v('⛔ … la fermée, si', [jf.code, jf.j.error], [403, 'espace fermé']);
      const jo = await post('/api/fb/jeton', { t: O.t, kh: sha(O.k) });
      v('⛔⛔ … et la suspendue PUIS fermée aussi', [jo.code, jo.j.error], [403, 'espace fermé']);

      const ss = await post('/api/espaces/sauvegarde', { t: S.t, kh: sha(S.k), enc: 'Y2hpZmZyw6k=', iv: 'aXY=', salt: 'c2Vs' });
      v('⛔ « aucune sauvegarde n\'est perdue » : la suspendue dépose sa copie', [ss.code, ss.j.ok], [200, true]);
      const sf = await post('/api/espaces/sauvegarde', { t: F.t, kh: sha(F.k), enc: 'eA==', iv: 'aXY=', salt: 'c2Vs' });
      v('   la fermée, non', sf.code, 403);
      const ls = await post('/api/espaces/sauvegardes', { t: S.t, kh: sha(S.k) });
      v('   et la suspendue RELIT ses copies', ls.code, 200);

      const ps = await post('/api/pieces/etat', { t: S.t, kh: sha(S.k) });
      v('⛔ ses photos : la suspendue y accède', [ps.code, ps.j.ok], [200, true]);
      const pf = await post('/api/pieces/etat', { t: F.t, kh: sha(F.k) });
      v('   la fermée, non — et le motif le dit', [pf.code, pf.j.motif], [403, 'ferme']);
    }

    console.log('\n══ 4. ⛔ SE CONNECTER, DÉPOSER L\'ANNUAIRE, RECEVOIR SES ORDRES ══\n');
    {
      const os_ = await post('/api/espaces/ouvrir', { nom: S.nom, acces: S.acces });
      v('⛔ nom + code : la suspendue entre', os_.code, 200);
      vrai('   et reçoit la clé de ses données', !!(os_.j && os_.j.code));
      const of = await post('/api/espaces/ouvrir', { nom: F.nom, acces: F.acces });
      v('   la fermée, non — avec le refus générique', [of.code, of.j.error], [403, 'Nom d\'entreprise ou code d\'accès incorrect.']);
      const oa = await post('/api/espaces/ouvrir', { nom: A.nom, acces: A.acces });
      v('   (le témoin actif entre aussi)', oa.code, 200);

      const cs = await post('/api/espaces/comptes', { t: S.t, kh: sha(S.k), comptes: [] });
      v('⛔ l\'annuaire : la suspendue n\'est plus refusée comme fermée', ferme(cs), false);
      const cf = await post('/api/espaces/comptes', { t: F.t, kh: sha(F.k), comptes: [] });
      v('   la fermée, si', [cf.code, cf.j.error], [403, 'espace fermé']);

      const rs = await post('/api/espaces/ordres', { t: S.t, kh: sha(S.k) });
      v('⛔ les ordres : la suspendue les reçoit', rs.code, 200);
      const rf = await post('/api/espaces/ordres', { t: F.t, kh: sha(F.k) });
      v('   la fermée, non', [rf.code, rf.j.error], [403, 'espace fermé']);
    }

    console.log('\n══ 5. ⛔ CE QUE L\'APPAREIL SIGNALE : NOTIFICATIONS, ERREURS, USAGE, CONNEXIONS ══\n');
    {
      const ab = await post('/api/subscribe', { sub: { endpoint: 'https://push.exemple/suspendue-qk', keys: {} }, teamId: S.t, userId: 'u1', userName: 'Test' });
      v('⛔ la suspendue s\'abonne aux notifications', [ab.code, ab.j.ferme], [200, undefined]);
      await dormir(300);
      let subs = {}; try { subs = JSON.parse(fs.readFileSync(path.join(data, 'subscriptions.json'), 'utf8')); } catch (e) {}
      vrai('   et l\'abonnement est ÉCRIT', !!subs['https://push.exemple/suspendue-qk']);
      const abf = await post('/api/subscribe', { sub: { endpoint: 'https://push.exemple/fermee-zk', keys: {} }, teamId: F.t });
      v('   la fermée : répondu « fermé », rien d\'écrit', abf.j.ferme, true);

      v('⛔ ses rapports d\'erreur arrivent', (await post('/api/bug', { teamId: S.t, msg: 'essai du banc 796', app: 'gestion' })).j.ferme, undefined);
      v('   ceux de la fermée, non', (await post('/api/bug', { teamId: F.t, msg: 'essai du banc 796', app: 'gestion' })).j.ferme, true);
      v('⛔ son usage est compté', (await post('/api/usage', { t: S.t, vues: { planning: 1 } })).j.ferme, undefined);
      v('   celui de la fermée, non', (await post('/api/usage', { t: F.t, vues: { planning: 1 } })).j.ferme, true);
      v('⛔ ses connexions se voient à la Tour', (await post('/api/connexions', { t: S.t, ev: 'connexion', login: 'jb' })).j.ferme, undefined);
      v('   celles de la fermée, non', (await post('/api/connexions', { t: F.t, ev: 'connexion', login: 'jb' })).j.ferme, true);
      v('⛔⛔ et la suspendue PUIS fermée ne ressuscite rien', (await post('/api/connexions', { t: O.t, ev: 'connexion', login: 'jb' })).j.ferme, true);
    }

    console.log('\n══ 6. ⛔ LA TOUR ══\n');
    {
      const tour = await post('/api/monitor/login', { nom: 'Patron', pass: MDP });
      vrai('   la Tour se connecte', !!tour.j.token);
      const J = tour.j.token;
      const liste = await get('/api/monitor/espaces/liste', J);
      const ligne = (slug) => ((liste.j.espaces || liste.j || []).find ? (liste.j.espaces || liste.j) : []).find(x => x && x.slug === slug) || {};
      v('   la suspendue : « suspendue », PAS « fermée » (« Rouvrir » reste possible)', [ligne(S.slug).suspendu, ligne(S.slug).ferme], [true, false]);
      v('⛔ la fermée revenue : « fermée » — pas de « Rouvrir » d\'un clic', ligne(F.slug).ferme, true);
      /* ⛔⛔ ON NE SUSPEND PAS UNE FERMÉE : depuis qu'une suspension laisse travailler, ce serait
         la rouvrir par le côté, sans le code par courriel que la fermeture a exigé. */
      const sf = await post('/api/monitor/espaces/suspendre', { slug: F.slug }, J);
      v('⛔⛔ « suspendre » une fermée est REFUSÉ', sf.code, 409);
      v('   et elle reste fermée', (await post('/api/espaces/etat', { t: F.t })).j.ferme, true);
      /* Le témoin : suspendre une active la laisse travailler. */
      const sa = await post('/api/monitor/espaces/suspendre', { slug: A.slug }, J);
      v('   suspendre l\'active répond 200, sans coupure', [sa.code, sa.j.coupure], [200, false]);
      const ea = await post('/api/espaces/etat', { t: A.t });
      v('⛔ et elle TRAVAILLE : état normal, sept jours de sursis', [ea.j.ferme, ea.j.suspendu, ea.j.sursisJours], [undefined, true, 7]);
      const ja = await post('/api/fb/jeton', { t: A.t, kh: sha(A.k) });
      v('⛔ … son jeton Firebase n\'est pas refusé comme fermé', ferme(ja), false);
    }

    console.log('\n══ 7. ⛔ RIEN N\'EST RÉPARÉ EN DOUCE DANS LE FICHIER ══\n');
    {
      /* ⛔ La règle « hors annuaire = plus suspendue » est CALCULÉE, jamais écrite : un
         `espaces.json` tronqué sortirait sinon toutes les suspendues de l'annuaire, et une
         réparation écrite les condamnerait pour de bon. */
      const f = JSON.parse(fs.readFileSync(path.join(data, 'entreprises-fermees.json'), 'utf8'));
      vrai('⛔ O est toujours dans `suspendus` : rien n\'a été réécrit à sa place', (f.suspendus || []).includes(O.t));
      vrai('   sa date aussi', !!(f.suspendusLe || {})[O.t]);
      vrai('   aucun ReferenceError au journal', !/ReferenceError|TypeError/.test(journal));
    }
  } catch (e) {
    ko++; console.log('  ✗ le banc est tombé : ' + (e && e.stack || e));
  } finally {
    arreter();
    try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {}
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
