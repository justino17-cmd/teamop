/* ⛔ CE QUE CE FICHIER GARDE — QU'UNE ÉCRITURE SE VOIE TOUT DE SUITE À L'ÉCRAN.

   IL EXISTE PARCE QUE `test-740` NE POUVAIT PAS LE VOIR, ET C'EST LA LEÇON QUI COMPTE.
   `test-740` extrait `portailMaison()` de la vraie page et le fait parler au vrai serveur :
   les deux moitiés sont JUSTES, chacune de son côté, et il était vert. Ce qui manquait n'est
   ni un nom de champ ni un code HTTP — c'est le TEMPS.

   Mesuré au navigateur le 21 septembre 2026, page réelle, interrupteur ouvert, vrai serveur :
   · on s'inscrit → le nom de son entreprise paraît **18,1 secondes** plus tard ;
   · on envoie un message → son propre message paraît **12,6 secondes** plus tard.
   Rien n'était « cassé » : la resonde arrivait (20 s pour le dossier, 15 s pour le fil) et
   tout finissait par s'afficher. Firestore, lui, POUSSAIT l'écriture au même instant.

   ⚠️ Ce n'est pas cosmétique. Quelqu'un qui envoie un message et ne le voit pas paraître le
   RENVOIE — on fabriquait des doublons dans la conversation du support.

   ⛔ ET LE TROISIÈME DÉFAUT N'A RIEN À VOIR AVEC L'INTERRUPTEUR : `_err()` ne faisait que
   POSER, jamais effacer. Le verdict d'un essai raté restait affiché pendant l'essai suivant —
   mesuré pendant un changement de mot de passe qui AVAIT RÉUSSI (les deux routes à 200, le
   nouveau mot de passe fonctionnel, l'ancien refusé en 401) : l'écran disait « E-mail ou mot
   de passe incorrect » à quelqu'un dont le mot de passe venait de changer. C'est du code
   PARTAGÉ : ce défaut est dans la page servie aux clients aujourd'hui, avec Firebase.

   La règle que ce banc met en dur : **toute écriture qui réussit se voit, et efface le refus
   d'avant.** */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('\n(sauté : server/node_modules absent)\n0 ✓  0 ✗'); process.exit(0);
}

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = k => crypto.createHash('sha256').update(k).digest('hex');

const PAGE = fs.readFileSync(path.join(RACINE, 'espace.html'), 'utf8');
/* ⛔ ON CHERCHE DANS DU CODE, JAMAIS DANS UN COMMENTAIRE. Ce dépôt est très commenté : un
   motif qui vise une chaîne tombe dans l'explication qui la surplombe, et garde une phrase
   au lieu d'un comportement. Trois bancs s'y sont fait prendre le 19 septembre. */
const NU = PAGE.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const MDP_ADMIN = 'mot-de-passe-du-banc-746';
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'espace-746-'));
let enfant = null;

/* ── L'EXTRACTION, MÊMES BORNES QUE test-740 ─────────────────────────────────────────── */
function extraire() {
  const i = PAGE.indexOf('const API_PORTAIL');
  const j = PAGE.indexOf('const _pv = portailMaison();');
  if (i < 0 || j < 0 || j <= i) return null;
  return PAGE.slice(i, j);
}
function fabriquer(base) {
  const src = extraire();
  if (!src) return null;
  const rangement = new Map();
  const bac = {
    fetch: (u, o) => fetch(u, o), crypto: globalThis.crypto, TextEncoder,
    console: { warn: () => {}, log: () => {}, error: () => {} },
    location: { hostname: '127.0.0.1' },
    localStorage: {
      getItem: (k) => (rangement.has(k) ? rangement.get(k) : null),
      setItem: (k, x) => rangement.set(k, String(x)),
      removeItem: (k) => rangement.delete(k),
    },
    setTimeout, clearTimeout,
  };
  const code = src.replace(/const API_PORTAIL = [\s\S]*?;\n/, 'const API_PORTAIL = ' + JSON.stringify(base) + ';\n');
  const f = new Function('fetch', 'crypto', 'TextEncoder', 'console', 'location', 'localStorage',
    'setTimeout', 'clearTimeout', code + '\nreturn portailMaison();');
  return f(bac.fetch, bac.crypto, bac.TextEncoder, bac.console, bac.location, bac.localStorage, bac.setTimeout, bac.clearTimeout);
}

async function monter() {
  const data = path.join(BANC, 'data'); fs.mkdirSync(data, { recursive: true });
  const cfgPath = path.join(BANC, 'config.json');
  const vap = require(path.join(RACINE, 'server', 'node_modules', 'web-push')).generateVAPIDKeys();
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha(MDP_ADMIN), comptes: { actif: true },
  }));
  const port = await new Promise(res => { const s = require('net').createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  let journal = '';
  enfant.stdout.on('data', d => { journal += d; });
  enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  return { B, vivant, journal: () => journal };
}

(async () => {
  const srv = await monter();
  if (!srv.vivant) { console.log('\n  ✗ le serveur n\'a pas démarré\n0 ✓  1 ✗'); try { enfant.kill('SIGKILL'); } catch (e) {} process.exit(1); }

  console.log('\n══ 1. ⛔ LE DOSSIER : UNE ÉCRITURE SE VOIT TOUT DE SUITE ══\n');
  {
    const api = fabriquer(srv.B);
    vrai('   l\'adaptateur s\'extrait de la vraie page', !!api);
    await api.auth.createUserWithEmailAndPassword('un.746@exemple.fr', 'motdepasse-746');
    const doc = api.fs.collection('teamop_requests').doc();

    const vus = [];
    const stop = doc.onSnapshot(s => vus.push(s && s.exists ? (s.data() || {}) : null));
    for (let i = 0; i < 40 && !vus.length; i++) await dormir(50);
    v('   le premier tir est immédiat (pas d\'écran vide à l\'ouverture)', vus.length, 1);

    /* ⛔ LE CŒUR DU BANC. Sans la poussée, ce compteur ne bouge qu'à la resonde — 20 SECONDES
       plus tard. On ne laisse donc AUCUNE marge : un dixième de seconde, pas plus. */
    const avant = vus.length;
    await doc.set({ company: 'Entreprise du banc 746', prenom: 'Un' }, { merge: true });
    await dormir(100);
    v('⛔⛔ l\'écriture a PRÉVENU l\'écouteur, sans attendre la resonde', vus.length, avant + 1);
    v('   et elle l\'a prévenu avec la donnée écrite', vus[vus.length - 1] && vus[vus.length - 1].company, 'Entreprise du banc 746');

    /* ⛔ ET SE DÉSABONNER DOIT VRAIMENT DÉTACHER : un écouteur qu'on croit parti et qui
       continue de rendre la main tient en vie l'écran d'une session déconnectée. */
    stop();
    const apresStop = vus.length;
    await doc.set({ company: 'Après le désabonnement' }, { merge: true });
    await dormir(100);
    v('⛔ après le désabonnement, plus aucune poussée', vus.length, apresStop);
  }

  console.log('\n══ 2. ⛔ LE FIL : SON PROPRE MESSAGE PARAÎT TOUT DE SUITE ══\n');
  {
    const api = fabriquer(srv.B);
    await api.auth.createUserWithEmailAndPassword('deux.746@exemple.fr', 'motdepasse-746');
    const fil = api.fs.collection('teamop_threads').doc().collection();

    const vus = [];
    const stop = fil.onSnapshot(s => vus.push(s ? s.size : -1));
    for (let i = 0; i < 40 && !vus.length; i++) await dormir(50);
    v('   le premier tir est immédiat', vus.length, 1);
    v('   et le fil part vide', vus[0], 0);

    const avant = vus.length;
    await fil.add({ text: 'Mon message au support' });
    await dormir(150);
    /* Sans la poussée : 15 SECONDES avant de voir son propre message — donc on le renvoie,
       et la conversation du support se remplit de doublons. */
    v('⛔⛔ l\'envoi a PRÉVENU l\'écouteur, sans attendre la resonde', vus.length, avant + 1);
    v('   et le message y est déjà', vus[vus.length - 1], 1);

    stop();
    const apresStop = vus.length;
    await fil.add({ text: 'Après le désabonnement' });
    await dormir(150);
    v('⛔ après le désabonnement, plus aucune poussée', vus.length, apresStop);
  }

  console.log('\n══ 3. ⛔ DEUX ABONNEMENTS NE SE MARCHENT PAS DESSUS ══\n');
  {
    /* ⛔ LA MINUTERIE ÉTAIT PARTAGÉE, ET C'EST PIRE QU'UNE FUITE. `sondeDossier` était UNE
       variable pour TOUS les abonnements : le second écrasait la poignée du premier, donc
       arrêter le second CLEARAIT la minuterie du PREMIER. Résultat : on se désabonne de A, et
       c'est B — encore vivant, encore affiché — qui cesse de se rafraîchir pour toujours.
       Cette page enchaîne les abonnements à chaque changement d'état de connexion : le cas
       est atteignable. */
    const api = fabriquer(srv.B);
    await api.auth.createUserWithEmailAndPassword('trois.746@exemple.fr', 'motdepasse-746');
    const doc = api.fs.collection('teamop_requests').doc();

    const vusA = [], vusB = [];
    const stopA = doc.onSnapshot(s => vusA.push(1));
    const stopB = doc.onSnapshot(s => vusB.push(1));
    for (let i = 0; i < 40 && (!vusA.length || !vusB.length); i++) await dormir(50);
    v('   les deux reçoivent leur premier tir', [vusA.length, vusB.length], [1, 1]);

    stopA();
    const a0 = vusA.length, b0 = vusB.length;
    await doc.set({ company: 'Écriture après stopA' }, { merge: true });
    await dormir(150);
    v('⛔ A, désabonné, ne reçoit plus rien', vusA.length, a0);
    v('⛔⛔ B, lui, reçoit toujours — arrêter A ne l\'a pas coupé', vusB.length, b0 + 1);
    stopB();
  }

  console.log('\n══ 4. ⛔ UN REFUS NE SURVIT PAS À LA RÉUSSITE QUI LE DÉMENT ══\n');
  {
    /* Ces écrans touchent le DOM : on ne peut pas les exécuter ici. On lit donc le texte du
       fichier RÉEL — commentaires retirés — et on exige la FORME DU CODE, pas une phrase. */
    vrai('   la page porte bien un effaceur de verdict', /function\s+_vider\s*\(\s*id\s*\)\s*\{[^}]*innerHTML\s*=\s*''/.test(NU));
    /* ⛔ LES QUATRE PORTES DE LA CÉRÉMONIE À DEUX TEMPS. Une seule oubliée et l'écran ment
       à nouveau — c'est la règle « quatre portes » d'`espaceQuitter` appliquée ici. */
    for (const [fn, cible] of [['pwSend', 'pw-err'], ['pwConfirm', 'pw-err'], ['emSend', 'em-err'], ['emConfirm', 'em-err']]) {
      const re = new RegExp('function\\s+' + fn + '\\s*\\(\\s*\\)\\s*\\{\\s*_vider\\(\\s*\\x27' + cible + '\\x27\\s*\\)');
      vrai('⛔ ' + fn + ' efface ' + cible + ' AVANT de travailler', re.test(NU));
    }
    /* Et le contre-contrôle : `_err` doit toujours POSER un refus — effacer ne veut pas dire
       se taire. C'est la règle `_mailboxes` : un refus muet est pire qu'un refus. */
    vrai('   `_err` pose toujours un refus visible', /function\s+_err\s*\(\s*id\s*,\s*t\s*\)\s*\{[^}]*class="err"/.test(NU));
  }

  console.log('\n══ 5. ⛔ LE PORTAIL EST OUVERT — ET FIREBASE EST PARTI AVEC L\'INTERRUPTEUR ══\n');
  {
    /* ⛔ LE JOUR PRÉVU EST ARRIVÉ (sortie de Firebase, 25 septembre 2026). Ce bloc disait :
       « le jour où l'interrupteur se lève, les trois balises Firebase doivent partir — et ce
       banc refuse qu'on oublie ». Mesuré au navigateur le 21 septembre : sans Firebase, la page
       fonctionne de bout en bout. L'interrupteur est retiré avec les balises, pour qu'aucun
       retour en arrière à moitié ne fasse chercher `firebase` à une page qui ne l'a plus. */
    v('⛔⛔ plus AUCUNE balise Firebase de gstatic', (PAGE.match(/<script src="https:\/\/www\.gstatic\.com\/firebasejs/g) || []).length, 0);
    v('   et plus d\'interrupteur à refermer par erreur', /PORTAIL_SERVEUR/.test(NU), false);
  }

  try { enfant.kill('SIGKILL'); } catch (e) {}
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  try { enfant.kill('SIGKILL'); } catch (x) {}
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});
