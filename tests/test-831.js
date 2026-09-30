/* ⛔ CE QUE CE FICHIER GARDE — UN E-MAIL QUI N'EST PAS PARTI NE S'ANNONCE PAS « PARTI ».

   Trouvé le 27 septembre 2026, en vérifiant pour Justin que tous les e-mails passent par notre
   serveur. Deux écrans publics demandent un courriel au serveur :
   · « Mot de passe oublié » du portail (`espace.html`, `motDePasseOublie`) ;
   · « me renvoyer le lien par e-mail » de la page de connexion (`connexion.html`, `entRelance`).
   Les deux affichaient « 📬 … vient de partir » QUELLE QUE SOIT la réponse : un 400 (adresse
   invalide), un 429 (trop de demandes), une route absente (404), un serveur tombé derrière nginx
   (502) — et, pour le portail, même une coupure réseau. Le client attendait un courriel qui ne
   viendrait jamais, sans savoir qu'il fallait réessayer. C'est la règle `_mailboxes` de CLAUDE.md :
   un refus ne se montre pas tout seul, il faut que l'écran sache le dire.

   ⛔ ET CE QUI NE DOIT PAS BOUGER : une adresse CONNUE et une adresse INCONNUE reçoivent le MÊME
   écran (le serveur répond 200 aux deux, exprès) — sinon ce formulaire devient l'annuaire des
   clients de TEAM OP. Le 429 ne trahit rien non plus : le quota se compte AVANT de chercher le
   compte (`server/comptes.js`, `/api/compte/mdp/demander`).

   Aucun banc n'exécutait ces deux écrans : `test-740` garde le TEXTE de l'adaptateur, `test-738`
   et `test-811` la ROUTE du serveur. Chaque moitié était juste ; c'est leur couture qui mentait.
   Ce banc extrait donc les VRAIES fonctions des deux pages et les fait parler au VRAI serveur. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http');
const { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('\n(sauté : server/node_modules absent)\n0 ✓  0 ✗'); process.exit(0);
}

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

/* `ESPACE_FICHIER` / `CONNEXION_FICHIER` : une copie à éprouver (mutation), absolue ou relative au dépôt. */
const ESPACE = fs.readFileSync(path.resolve(RACINE, process.env.ESPACE_FICHIER || 'espace.html'), 'utf8');
const CONNEXION = fs.readFileSync(path.resolve(RACINE, process.env.CONNEXION_FICHIER || 'connexion.html'), 'utf8');
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-831-'));
let enfant = null, facteurSrv = null, faux502 = null;

/* Un relais de courriel minuscule (le même que `test-740`) : il COMPTE ce qui part vraiment. Un
   écran qui dit « parti » se juge contre ce que le facteur a reçu, pas contre sa propre phrase. */
function facteur() {
  const recus = [];
  const s = require('net').createServer(c => {
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += l + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
    c.on('error', () => {});
  });
  return { s, recus };
}
const portLibre = () => new Promise(res => {
  const s = require('net').createServer();
  s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
});

async function monter() {
  const dir = path.join(BANC, 'srv'), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const cfgPath = path.join(dir, 'config.json');
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha('mot-de-passe-du-banc-831'), comptes: { actif: true },
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' },
  }));
  const port = await portLibre();
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let journal = '';
  enfant.stdout.on('data', d => { journal += d; });
  enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  /* Un nginx dont l'API est tombée : il répond 502, en HTML. `fetch` ne jette PAS sur un 502 —
     c'est tout le piège : la promesse se résout, et un écran qui ne lit pas le code croit à un envoi. */
  faux502 = http.createServer((q, r) => { r.writeHead(502, { 'Content-Type': 'text/html' }); r.end('<html><body>502 Bad Gateway</body></html>'); });
  const p502 = await new Promise(res => faux502.listen(0, '127.0.0.1', () => res(faux502.address().port)));
  return { B, B502: 'http://127.0.0.1:' + p502, vivant, journal: () => journal };
}
const arreter = async () => {
  try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {}
  try { if (faux502) faux502.close(); } catch (e) {}
  if (!enfant || enfant.exitCode !== null) return;
  await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) {} res(); });
};

/* ── L'EXTRACTION — ANCRÉE SUR DES DÉCLARATIONS DE CODE, JAMAIS SUR UNE PHRASE ────────────────
   Ce dépôt est très commenté : un motif qui vise une chaîne tombe dans le commentaire qui
   l'explique. Chaque tranche est bornée par deux déclarations réelles, et chacune PROUVE qu'elle
   a trouvé quelque chose avant qu'on s'en serve (une tranche vide passe au vert sur tout). */
const tranche = (src, debut, fin) => { const i = src.indexOf(debut), j = src.indexOf(fin, i + 1); return i < 0 || j < 0 ? '' : src.slice(i, j); };
const ligne = (src, debut) => { const i = src.indexOf(debut); return i < 0 ? '' : src.slice(i, src.indexOf('\n', i)); };

const ADAPTATEUR = tranche(ESPACE, 'const API_PORTAIL', 'const _pv = portailMaison();');
const ECRAN_MDP = tranche(ESPACE, 'async function mdpLien(', 'function authMsg(');
const ESC = ligne(ESPACE, 'const esc=s=>');
const SLUG = tranche(CONNEXION, 'function slugDe(', 'function adresseDemandee(');
const MSGS = ligne(CONNEXION, 'function adrMsg(') + '\n' + ligne(CONNEXION, 'function cxMsg(');
const RELANCE = tranche(CONNEXION, 'async function entRelance(', 'function entLienColler(');

/* Le portail, réduit à ce que l'écran touche : un champ, une boîte de message. */
function portail(base) {
  const rangement = new Map();
  const bac = {
    localStorage: { getItem: k => (rangement.has(k) ? rangement.get(k) : null), setItem: (k, x) => rangement.set(k, String(x)), removeItem: k => rangement.delete(k) },
    console: { warn() {}, log() {}, error() {} },
  };
  /* La SEULE retouche : l'adresse de base, que la page calcule depuis `location`. */
  const code = ADAPTATEUR.replace(/const API_PORTAIL = [\s\S]*?;\n/, 'const API_PORTAIL = ' + JSON.stringify(base) + ';\n');
  const api = new Function('fetch', 'crypto', 'TextEncoder', 'console', 'location', 'localStorage', 'setTimeout', 'clearTimeout',
    code + '\nreturn portailMaison();')((u, o) => fetch(u, o), globalThis.crypto, TextEncoder, bac.console, { hostname: '127.0.0.1' }, bac.localStorage, setTimeout, clearTimeout);
  const dom = { 'a-email': { value: '' }, 'auth-err': { innerHTML: '' } };
  const $ = id => dom[id];
  const f = new Function('auth', '$', ESC + '\n' + ECRAN_MDP + '\nreturn { mdpLien, motDePasseOublie };')(api.auth, $);
  return { api, dom, oublie: async (mail) => { dom['a-email'].value = mail; await f.motDePasseOublie(); return dom['auth-err'].innerHTML; } };
}

/* La page de connexion, réduite de même. Son adresse d'API est écrite en dur (`https://api.teamop.fr`) :
   on la redirige dans le `fetch` du bac à sable — le code de la page, lui, n'est pas touché. */
function connexion(base) {
  const el = () => ({ style: {}, innerHTML: '' });
  const dom = { 'adr-err': el(), 'cx-err': el(), 'adr-nom': { value: '' } };
  const fetchBanc = (u, o) => fetch(String(u).replace('https://api.teamop.fr', base), o);
  const f = new Function('fetch', '$id', 'var ADRESSE=\'\';\n' + SLUG + '\n' + MSGS + '\n' + RELANCE + '\nreturn { entRelance };')(fetchBanc, id => dom[id]);
  return { dom, relance: async (nom) => { dom['adr-nom'].value = nom; dom['adr-err'].innerHTML = ''; await f.entRelance(); return { h: dom['adr-err'].innerHTML, c: dom['adr-err'].style.color }; } };
}

/* Ce que l'écran DIT, rangé en trois familles : l'annonce d'un envoi, un refus, autre chose. */
const PARTI = h => /vient de partir/.test(h);
const refusPortail = h => /class="err"/.test(h) && !PARTI(h);
/* Les couleurs sont des JETONS du thème du site (/vitrine/v2/theme.css) depuis que la page suit le jour et la nuit
   (27 septembre 2026 au soir) : un rouge écrit en dur ne se lirait que dans un des deux modes. */
const ROUGE = 'var(--m-err)', VERT = 'var(--m-ok)';

(async () => {
  console.log('\n══ 0. LES TRANCHES SONT TROUVÉES (une tranche vide passerait au vert sur tout) ══\n');
  vrai('l\'adaptateur du portail', ADAPTATEUR.length > 2000 && /function portailMaison\(/.test(ADAPTATEUR));
  vrai('l\'écran « Mot de passe oublié »', /async function motDePasseOublie\(/.test(ECRAN_MDP) && /async function mdpLien\(/.test(ECRAN_MDP));
  vrai('`esc` du portail', /^const esc=s=>/.test(ESC));
  vrai('`slugDe`, `adrMsg`, `cxMsg` de la page de connexion', /function slugDe\(/.test(SLUG) && /function adrMsg\(/.test(MSGS) && /function cxMsg\(/.test(MSGS));
  vrai('et `entRelance`', /async function entRelance\(/.test(RELANCE) && /\/api\/espaces\/relance/.test(RELANCE));
  if (ko) { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(1); }

  const S = await monter();
  if (!S.vivant) { console.log('  ✗ serveur non démarré\n' + S.journal().slice(0, 600) + '\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); await arreter(); process.exit(1); }
  const P = portail(S.B);

  console.log('\n══ 1. « MOT DE PASSE OUBLIÉ » — QUAND ÇA PART, ÇA LE DIT, ET PAREIL POUR TOUT LE MONDE ══\n');
  {
    await P.api.auth.createUserWithEmailAndPassword('zoe@exemple.fr', 'un-mot-de-passe-solide');
    await P.api.auth.signOut();
    const avant = facteurSrv.recus.length;
    const connu = await P.oublie('zoe@exemple.fr');
    const inconnu = await P.oublie('personne-ici@exemple.fr');
    vrai('une adresse connue : « vient de partir »', PARTI(connu));
    /* ⚠️ 15 s au plus, pas 4 : le courriel part DERRIÈRE la réponse, et une machine de CI chargée l'a laissé passer
       le délai (28 septembre 2026, CI de `main` : 1 ✗ ici, 5 passages sur 5 en local en ~1 s). La boucle sort dès qu'il
       arrive — attendre plus longtemps ne coûte rien quand tout va bien. Et un échec DIT pourquoi (courriels reçus,
       journal du serveur), sinon il ne reste qu'« attendu true, reçu false ». */
    /* ⛔ LE courriel de CE geste : le lien de MOT DE PASSE (`mode=resetPassword`), adressé à zoé, lu après décodage
       quoted-printable (« = » y devient « =3D », une ligne longue s'y coupe par « = »). « zoe » + « reinit.html » ne
       suffisait pas : le courriel de CONFIRMATION de l'inscription, qui part derrière la réponse — donc souvent après
       `avant` —, porte les deux. Mesuré le 29 septembre 2026 : détourner le lien de mot de passe vers une autre adresse
       laissait ce contrôle au vert. */
    const qp = m => m.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    const lienMdp = m => /^To:.*zoe@exemple\.fr/mi.test(m) && /\/reinit\.html\?mode=resetPassword&jeton=[\w-]{16,}/.test(qp(m));
    let arrive = false; const t0 = Date.now();
    for (let i = 0; i < 150 && !arrive; i++) { await dormir(100); arrive = facteurSrv.recus.slice(avant).some(lienMdp); }
    vrai('   et le courriel est VRAIMENT parti (le relais l\'a reçu, avec SON lien — celui du mot de passe, pas celui de l\'inscription)', arrive);
    /* Un échec DIT ce qui est arrivé : le destinataire et le sujet de chaque courriel reçu (jamais le corps, qui porte
       le lien). Le 29 septembre 2026 au soir, la suite complète a rendu « 1 courriel(s) en 15081 ms » sans dire
       lequel — et le banc passait seul (2/2) comme sous charge (4/4) : la prochaine fois, la sortie le nommera. */
    const entete = (m, k) => ((m.match(new RegExp('^' + k + ': ?(.*)$', 'mi')) || [])[1] || '?').slice(0, 90);
    if (!arrive) console.log('      reçus depuis la demande : ' + (facteurSrv.recus.length - avant) + ' courriel(s) en ' + (Date.now() - t0) + ' ms'
      + facteurSrv.recus.slice(avant).map(m => '\n      · à ' + entete(m, 'To') + ' — « ' + entete(m, 'Subject') + ' »').join('')
      + ' ; journal du serveur :\n      '
      + S.journal().split('\n').filter(l => /courriel|mail|smtp|ECONN|erreur/i.test(l)).slice(-8).join('\n      '));
    vrai('une adresse inconnue : « vient de partir » aussi', PARTI(inconnu));
    await dormir(300);
    v('   sans que rien parte chez elle', facteurSrv.recus.slice(avant).filter(m => /personne-ici@exemple\.fr/.test(m)).length, 0);
    v('⛔ et les deux écrans sont IDENTIQUES à l\'adresse près (sinon le formulaire devient un annuaire)',
      connu.replace('zoe@exemple.fr', 'X'), inconnu.replace('personne-ici@exemple.fr', 'X'));
    v('un champ vide ne demande rien au serveur et le dit', /Écrivez d'abord votre e-mail/.test(await P.oublie('')), true);
  }

  console.log('\n══ 2. ⛔ « MOT DE PASSE OUBLIÉ » — QUAND RIEN NE PART, L\'ÉCRAN NE DIT PAS « PARTI » ══\n');
  {
    const invalide = await P.oublie('pas-une-adresse');
    vrai('⛔ adresse invalide (400) : pas de « vient de partir »', !PARTI(invalide));
    vrai('   mais « E-mail invalide. »', refusPortail(invalide) && /E-mail invalide/.test(invalide));

    /* Cinq demandes par heure et par adresse : la sixième est refusée (429). */
    for (let i = 0; i < 5; i++) await P.oublie('quota@exemple.fr');
    const trop = await P.oublie('quota@exemple.fr');
    vrai('⛔ trop de demandes (429) : pas de « vient de partir »', !PARTI(trop));
    vrai('   mais un refus qui dit d\'attendre et de regarder ses e-mails', refusPortail(trop) && /Trop de demandes/.test(trop) && /réessayez dans une heure/.test(trop));

    const absent = await portail(S.B + '/route-absente').oublie('zoe@exemple.fr');
    vrai('⛔ route absente (404, un serveur sans les comptes maison) : pas de « vient de partir »', !PARTI(absent));
    vrai('   mais « Envoi impossible », rien n\'est parti', refusPortail(absent) && /Envoi impossible/.test(absent) && /rien n'est parti/.test(absent));

    const tombe = await portail(S.B502).oublie('zoe@exemple.fr');
    vrai('⛔ serveur tombé derrière nginx (502) : pas de « vient de partir »', !PARTI(tombe));
    vrai('   mais « Envoi impossible »', refusPortail(tombe) && /Envoi impossible/.test(tombe));

    const coupe = await portail('http://127.0.0.1:' + (await portLibre())).oublie('zoe@exemple.fr');
    vrai('⛔ réseau coupé (la requête n\'aboutit pas) : pas de « vient de partir »', !PARTI(coupe));
    vrai('   mais « Envoi impossible »', refusPortail(coupe) && /Envoi impossible/.test(coupe));
  }

  console.log('\n══ 3. « ME RENVOYER LE LIEN » (connexion.html) — MÊME RÈGLE ══\n');
  {
    const C = connexion(S.B);
    const bon = await C.relance('bernard-hygiene');
    vrai('une demande acceptée : « vient de partir », en vert', PARTI(bon.h) && bon.c === VERT);
    vrai('   (et la phrase ne dit pas si l\'entreprise existe : « si … est bien inscrite »)', /Si « bernardhygiene » est bien inscrite/.test(bon.h));
    const vide = await C.relance('');
    vrai('un nom vide ne demande rien et le dit', /Écris d'abord l'adresse/.test(vide.h) && vide.c === ROUGE);

    /* Dix demandes par heure depuis un même appareil : la onzième est refusée (429). */
    for (let i = 0; i < 9; i++) await C.relance('entreprise' + i);
    const trop = await C.relance('encore-une');
    vrai('⛔ trop de demandes (429) : pas de « vient de partir »', !PARTI(trop.h));
    vrai('   mais un refus, en rouge, qui dit d\'attendre une heure', trop.c === ROUGE && /Trop de demandes/.test(trop.h) && /une heure/.test(trop.h));

    const tombe = await connexion(S.B502).relance('bernard-hygiene');
    vrai('⛔ serveur tombé derrière nginx (502) : pas de « vient de partir »', !PARTI(tombe.h));
    vrai('   mais « Envoi impossible », en rouge', tombe.c === ROUGE && /Envoi impossible/.test(tombe.h));

    const coupe = await connexion('http://127.0.0.1:' + (await portLibre())).relance('bernard-hygiene');
    vrai('réseau coupé : « Connexion internet requise » (déjà juste avant ce banc)', coupe.c === ROUGE && /Connexion internet requise/.test(coupe.h));
  }

  await arreter();
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(async (e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  await arreter();
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});
