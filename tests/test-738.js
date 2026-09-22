/* ⛔ CE QUE CE FICHIER GARDE — L'IDENTITÉ MAISON DU PORTAIL.

   `PLAN-OP-SOCLE.md` ne parlait que de FIRESTORE. Firebase, c'est DEUX choses, et la seconde
   — Firebase Auth — n'était écrite nulle part : les comptes du portail, la vérification
   d'adresse, les liens de mot de passe. `reinit.html` en est la preuve : 125 lignes, ZÉRO
   collection Firestore, uniquement de l'authentification.

   Ce banc lance le VRAI `server/index.js` avec `comptes.actif = true`, monte un VRAI serveur
   SMTP pour lire les courriels qui partent, et parle en HTTP sur 127.0.0.1.

   ⛔ IL GARDE SURTOUT CE QUI NE SE VOIT PAS À L'ÉCRAN :
   · qu'une adresse INCONNUE et une adresse CONNUE reçoivent la MÊME réponse — sinon cette API
     devient l'annuaire des clients de TeamOP, et il suffit d'une boucle pour le télécharger ;
   · qu'elles prennent le MÊME TEMPS — répondre vite sur l'inconnue et lentement sur la connue
     dit lesquelles existent sans qu'un seul mot de passe soit juste ;
   · qu'un lien de mot de passe ne serve QU'UNE FOIS et COUPE les sessions ouvertes ;
   · que le mot de passe n'apparaîsse jamais dans le fichier des comptes.

   ⚠️ CE QUE CE BANC NE PEUT PAS GARDER, ET QU'IL FAUT SAVOIR AVANT DE S'Y FIER. Remplacer
   `crypto.timingSafeEqual` par `===` dans `memeSecret` ne fait tomber AUCUN contrôle, et ne
   le fera jamais : les deux rendent le même verdict, et la différence de durée se compte en
   nanosecondes — très en dessous du bruit d'un aller-retour HTTP, même sur 127.0.0.1. La
   comparaison à temps constant est donc gardée par la RELECTURE, pas par ce fichier, et il
   vaut mieux l'écrire que de croire un vert qui ne prouve rien. La faute réelle qu'elle
   évite : `a === b` sort à la première différence, donc la durée dit combien de caractères
   sont justes, et un secret se devine caractère par caractère sans jamais le connaître.
   ⛔ Les CINQ autres gardes, elles, sont éprouvées par mutation (mesuré le 20/09/2026) :
   adresse inconnue qui répond trop vite 47 ✓ 1 ✗ · 409 sur une adresse prise 46 ✓ 2 ✗ ·
   sessions non coupées au changement de mot de passe 47 ✓ 1 ✗ · lien de vérification
   resservable 47 ✓ 1 ✗ · sel fixe pour tous les comptes 46 ✓ 2 ✗. */
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

const MDP_ADMIN = 'mot-de-passe-du-banc-738';
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'comptes-738-'));
let enfant = null;

function smtpDeBanc() {
  const net = require('net');
  const recus = [];
  const srv = net.createServer(sock => {
    let tampon = '', dansData = false, corps = '';
    sock.write('220 banc\r\n');
    sock.on('data', d => {
      tampon += d.toString('utf8');
      for (;;) {
        const i = tampon.indexOf('\r\n'); if (i < 0) break;
        const ligne = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (dansData) {
          if (ligne === '.') { dansData = false; recus.push(corps); corps = ''; sock.write('250 recu\r\n'); }
          else corps += ligne + '\n';
          continue;
        }
        const cmd = ligne.slice(0, 4).toUpperCase();
        if (cmd === 'EHLO' || cmd === 'HELO') sock.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (cmd === 'AUTH') sock.write('235 ok\r\n');
        else if (cmd === 'MAIL' || cmd === 'RCPT') sock.write('250 ok\r\n');
        else if (cmd === 'DATA') { dansData = true; sock.write('354 vas-y\r\n'); }
        else if (cmd === 'QUIT') { sock.write('221 bye\r\n'); sock.end(); }
        else sock.write('250 ok\r\n');
      }
    });
    sock.on('error', () => {});
  });
  /* ⛔ DÉCODER LE QUOTED-PRINTABLE, sinon on cherche des mots qui n'existent pas sur le fil —
     et un banc qui crie faux se fait ignorer, puis désactiver. */
  const clair = (s) => Buffer.from(String(s || '').replace(/=\n/g, '')
    .replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'binary').toString('utf8');
  return { recus,
    /* ⚠ IDEMPOTENT : ce banc monte le serveur DEUX fois (interrupteur fermé, puis ouvert) et
       réutilise le même receveur. Un second `listen` jette ERR_SERVER_ALREADY_LISTEN. */
    ecouter: () => srv.listening ? Promise.resolve(srv.address().port)
      : new Promise(res => srv.listen(0, '127.0.0.1', () => res(srv.address().port))),
    fermer: () => new Promise(res => srv.close(res)),
    vider: () => { recus.length = 0; },
    tous: () => recus.map(clair),
    dernier: () => clair(recus[recus.length - 1] || ''),
    /* Le jeton d'un lien : 64 hexadécimaux après `jeton=`. */
    jeton: () => { const m = /jeton=([A-Fa-f0-9]{64})/.exec(clair(recus[recus.length - 1] || '')); return m ? m[1] : ''; },
  };
}
const POSTE = smtpDeBanc();

async function monter(comptesActif) {
  const dir = path.join(BANC, 'srv'), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const cfgPath = path.join(dir, 'config.json');
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const portMail = await POSTE.ecouter();
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha(MDP_ADMIN),
    comptes: { actif: !!comptesActif },
    /* 2525 n'est pas 465 : `secure` reste faux, donc pas de TLS à fabriquer pour un banc. */
    smtp: { host: '127.0.0.1', port: portMail, user: 'banc', pass: 'banc', from: 'banc@exemple.fr' },
  }));
  const port = await new Promise(res => {
    const s = require('net').createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
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
  return { B, vivant, data, journal: () => journal };
}
const arreter = async () => {
  if (!enfant || enfant.exitCode !== null) return;
  await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) {} res(); });
};

async function appel(B, chemin, corps, jeton) {
  const o = { method: corps === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' } };
  if (corps !== undefined) o.body = JSON.stringify(corps);
  if (jeton) o.headers['Authorization'] = 'Bearer ' + jeton;
  const t0 = process.hrtime.bigint();
  const r = await fetch(B + chemin, o);
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  let j = null; try { j = await r.json(); } catch (e) {}
  return { code: r.status, j, ms };
}

/* L'empreinte que l'appareil envoie : le mot de passe ne quitte jamais le navigateur. */
const emp = (mdp) => sha('teamop-portail:' + mdp);

(async () => {
  console.log('\n══ 1. L\'INTERRUPTEUR — FERMÉ, PAS UNE ROUTE N\'EXISTE ══\n');
  {
    const S = await monter(false);
    if (!S.vivant) { console.log('  ✗ serveur non démarré\n' + S.journal().slice(0, 500)); ko++; }
    else {
      const r = await appel(S.B, '/api/compte/connexion', { email: 'a@b.fr', h: emp('x') });
      vrai('⛔ sans `comptes.actif`, la route n\'est pas déclarée du tout', r.code === 404);
      vrai('   et le serveur tourne quand même — on perd le module, pas la plateforme',
        (await appel(S.B, '/health')).code === 200);
    }
    await arreter();
  }

  const S = await monter(true);
  if (!S.vivant) { console.log('  ✗ serveur non démarré\n' + S.journal().slice(0, 800) + '\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); await arreter(); process.exit(1); }
  const B = S.B;
  { const jr = S.journal(); const l = jr.split('\n').filter(x => /comptes/i.test(x));
    if (l.length) console.log('  [journal] ' + l.join(' | ').slice(0, 300)); }

  console.log('\n══ 2. CRÉER UN COMPTE ══\n');
  POSTE.vider();
  {
    const r = await appel(B, '/api/compte/creer', { email: 'Justin@Exemple.FR', h: emp('un-vrai-mot-de-passe'), prenom: 'Justin', nom: 'Biret', societe: 'TeamOP' });
    v('   la création répond 200', r.code, 200);
    await dormir(400);
    vrai('   un courriel de vérification est parti', /Confirmez votre adresse/.test(POSTE.dernier()));
    vrai('   il porte un lien vers reinit.html', /reinit\.html\?mode=verifyEmail&jeton=/.test(POSTE.dernier()));
    vrai('   le lien reste chez nous (teamop.fr)', /https:\/\/teamop\.fr\/reinit\.html/.test(POSTE.dernier()));
  }

  console.log('\n══ 3. ⛔ ON NE DIT JAMAIS SI UNE ADRESSE EXISTE ══\n');
  {
    POSTE.vider();
    const connu = await appel(B, '/api/compte/creer', { email: 'justin@exemple.fr', h: emp('autre') });
    const inconnu = await appel(B, '/api/compte/creer', { email: 'personne@exemple.fr', h: emp('autre') });
    v('⛔ créer sur une adresse DÉJÀ PRISE rend la même chose que sur une neuve', connu.j, inconnu.j);
    v('   et le même code', connu.code, inconnu.code);
    await dormir(400);
    const tous = POSTE.tous().join('\n');
    /* ⛔ ON CHERCHE DANS LE CORPS, JAMAIS DANS LE SUJET. Un sujet français part en RFC 2047
       (`=?UTF-8?Q?Quelqu'un_a_essayé_de_créer_?=`) : les espaces deviennent des SOULIGNÉS et la
       phrase est coupée en plusieurs mots encodés. Un motif écrit en français normal n'y tombe
       jamais — et ce banc a accusé le serveur de ne pas envoyer un courriel qu'il envoyait. */
    vrai('⛔ mais le PROPRIÉTAIRE, lui, est prévenu par courriel', /Une inscription vient d'être tentée/.test(tous));
    vrai('   et son mot de passe n\'a pas bougé : on le lui dit', /aucun compte n'a été créé/.test(tous));
    /* ⛔ Et surtout : la seconde tentative ne doit PAS avoir écrasé le compte. */
    const c = await appel(B, '/api/compte/connexion', { email: 'justin@exemple.fr', h: emp('un-vrai-mot-de-passe') });
    v('⛔⛔ le mot de passe d\'origine marche encore — la tentative n\'a rien écrasé', c.code, 200);
  }
  {
    POSTE.vider();
    /* ⚠ UNE ADRESSE VRAIMENT JAMAIS VUE. Le premier jet réutilisait `personne@exemple.fr`,
       que le contrôle d'au-dessus venait de CRÉER : les deux étaient donc connues, deux
       courriels partaient, et le banc accusait le serveur de trop parler. Un contrôle de
       discrétion qui compare deux cas identiques ne compare rien. */
    const connu = await appel(B, '/api/compte/mdp/demander', { email: 'justin@exemple.fr' });
    const inconnu = await appel(B, '/api/compte/mdp/demander', { email: 'jamais-inscrit-nulle-part@exemple.fr' });
    v('⛔ « mot de passe oublié » répond pareil des deux côtés', [connu.code, connu.j], [inconnu.code, inconnu.j]);
    await dormir(400);
    v('⛔ et UN SEUL courriel est parti, pas deux', POSTE.tous().filter(x => /Pour choisir un nouveau mot de passe/.test(x)).length, 1);
  }

  console.log('\n══ 4. ⛔ ET ELLES PRENNENT LE MÊME TEMPS ══\n');
  {
    /* ⛔ PBKDF2 À 120 000 TOURS COÛTE ~100 ms. Répondre TOUT DE SUITE sur une adresse inconnue
       et lentement sur une connue dit lesquelles existent, sans qu'un seul mot de passe soit
       juste — et ça se mesure depuis n'importe où avec une boucle. Le module dérive donc même
       quand le compte n'existe pas, sur un sel tiré au hasard. */
    const mesurer = async (mail) => {
      const t = [];
      for (let i = 0; i < 7; i++) t.push((await appel(B, '/api/compte/connexion', { email: mail, h: emp('faux') })).ms);
      t.sort((a, b) => a - b); return t[3];   // la médiane, insensible à un pic
    };
    const connu = await mesurer('justin@exemple.fr');
    const inconnu = await mesurer('jamais-vu@exemple.fr');
    /* ⛔ LE TÉMOIN EST LA MÊME ROUTE, SANS DÉRIVATION. Ce contrôle exigeait « plus de 20 ms » :
       un seuil ABSOLU, réglé sur une machine plus lente. Mesuré le 22 septembre 2026 sur le
       conteneur des sessions : PBKDF2 à 120 000 tours y coûte 20 à 21 ms — le banc tombait une
       fois sur quelques-unes, au hasard, sans que rien n'ait changé. On compare donc la
       dérivation à la même requête refusée AVANT elle (`h` absent → 400, avant le quota) : si
       la dérivation disparaissait, les deux médianes se rejoindraient, sur n'importe quelle
       machine. */
    const temoin = await (async () => { const t = [];
      for (let i = 0; i < 7; i++) t.push((await appel(B, '/api/compte/connexion', { email: 'justin@exemple.fr' })).ms);
      t.sort((a, b) => a - b); return t[3]; })();
    const ecart = Math.abs(connu - inconnu) / Math.max(connu, inconnu);
    console.log('   médiane connue ' + connu.toFixed(0) + ' ms · inconnue ' + inconnu.toFixed(0) + ' ms · témoin sans dérivation ' + temoin.toFixed(1) + ' ms · écart ' + (ecart * 100).toFixed(0) + ' %');
    vrai('   la dérivation coûte bien quelque chose — sinon la mesure ne veut rien dire', connu > 2 * temoin && connu - temoin > 5,
      'connue ' + connu.toFixed(1) + ' ms, témoin ' + temoin.toFixed(1) + ' ms');
    vrai('⛔ moins de 40 % d\'écart entre une adresse connue et une inconnue', ecart < 0.4);
  }

  console.log('\n══ 5. SE CONNECTER, ET LE BLOCAGE ══\n');
  let jetonSession = '';
  {
    const bon = await appel(B, '/api/compte/connexion', { email: 'justin@exemple.fr', h: emp('un-vrai-mot-de-passe') });
    v('   le bon mot de passe passe', bon.code, 200);
    vrai('   et rend un jeton de 64 hexadécimaux', /^[a-f0-9]{64}$/.test(String(bon.j && bon.j.jeton)));
    v('   avec le compte, sans rien de secret', Object.keys((bon.j && bon.j.compte) || {}).sort(),
      ['email', 'nom', 'prenom', 'societe', 'verifie']);
    jetonSession = bon.j.jeton;
    const moi = await appel(B, '/api/compte/moi', undefined, jetonSession);
    v('   le jeton ouvre /moi', moi.code, 200);
    v('   sans jeton, /moi refuse', (await appel(B, '/api/compte/moi')).code, 401);
    v('   avec un faux jeton aussi', (await appel(B, '/api/compte/moi', undefined, 'f'.repeat(64))).code, 401);
  }
  {
    /* ⛔ LE BLOCAGE EST PAR COMPTE, PAS PAR ADRESSE IP : une entreprise de terrain sort par une
       seule adresse, bloquer l'IP punirait trente personnes pour une faute de frappe. */
    await appel(B, '/api/compte/creer', { email: 'cible@exemple.fr', h: emp('secret-de-la-cible') });
    let bloque = 0;
    for (let i = 0; i < 10; i++) {
      const r = await appel(B, '/api/compte/connexion', { email: 'cible@exemple.fr', h: emp('faux' + i) });
      if (r.code === 401) bloque++;
    }
    v('   dix essais faux sont tous refusés', bloque, 10);
    const vrai_ = await appel(B, '/api/compte/connexion', { email: 'cible@exemple.fr', h: emp('secret-de-la-cible') });
    v('⛔ et APRÈS le seuil, même le BON mot de passe est refusé — c\'est le blocage', vrai_.code, 401);
    /* ⚠️ Contre-épreuve : le compte de Justin, lui, n'est pas bloqué. Un blocage global serait
       un déni de service offert à qui connaît une seule adresse. */
    const autre = await appel(B, '/api/compte/connexion', { email: 'justin@exemple.fr', h: emp('un-vrai-mot-de-passe') });
    v('⛔ mais UN AUTRE compte passe toujours — le blocage ne déborde pas', autre.code, 200);
  }

  console.log('\n══ 6. VÉRIFIER SON ADRESSE ══\n');
  {
    POSTE.vider();
    await appel(B, '/api/compte/creer', { email: 'neuf@exemple.fr', h: emp('mot-de-passe-du-neuf') });
    await dormir(400);
    const j = POSTE.jeton();
    vrai('   le courriel porte bien un jeton', /^[a-f0-9]{64}$/.test(j));
    const avant = await appel(B, '/api/compte/connexion', { email: 'neuf@exemple.fr', h: emp('mot-de-passe-du-neuf') });
    v('   avant vérification, le compte existe et se connecte', avant.code, 200);
    v('   mais il se dit NON vérifié', avant.j.compte.verifie, false);
    const r = await appel(B, '/api/compte/verifier', { jeton: j });
    v('   le lien marche', r.code, 200);
    const apres = await appel(B, '/api/compte/connexion', { email: 'neuf@exemple.fr', h: emp('mot-de-passe-du-neuf') });
    v('   et le compte est vérifié', apres.j.compte.verifie, true);
    v('⛔ le MÊME lien ne marche pas deux fois', (await appel(B, '/api/compte/verifier', { jeton: j })).code, 400);
  }

  console.log('\n══ 7. MOT DE PASSE OUBLIÉ — ET CE QU\'IL COUPE ══\n');
  {
    POSTE.vider();
    const sessionAvant = (await appel(B, '/api/compte/connexion', { email: 'neuf@exemple.fr', h: emp('mot-de-passe-du-neuf') })).j.jeton;
    v('   la session d\'avant est bien ouverte', (await appel(B, '/api/compte/moi', undefined, sessionAvant)).code, 200);

    await appel(B, '/api/compte/mdp/demander', { email: 'neuf@exemple.fr' });
    await dormir(400);
    const j = POSTE.jeton();
    vrai('   le courriel porte un jeton de mot de passe', /^[a-f0-9]{64}$/.test(j));
    vrai('   et dit qu\'il ne sert qu\'une fois', /ne fonctionne qu'une fois/.test(POSTE.dernier()));

    const r = await appel(B, '/api/compte/mdp/poser', { jeton: j, h: emp('le-nouveau-mot-de-passe') });
    v('   poser le nouveau mot de passe marche', r.code, 200);
    v('   l\'ancien ne marche plus', (await appel(B, '/api/compte/connexion', { email: 'neuf@exemple.fr', h: emp('mot-de-passe-du-neuf') })).code, 401);
    v('   le nouveau marche', (await appel(B, '/api/compte/connexion', { email: 'neuf@exemple.fr', h: emp('le-nouveau-mot-de-passe') })).code, 200);
    v('⛔ le lien ne sert qu\'une fois', (await appel(B, '/api/compte/mdp/poser', { jeton: j, h: emp('encore-autre') })).code, 400);
    /* ⛔ C'EST LE CONTRÔLE QUI COMPTE LE PLUS. On change de mot de passe quand on pense s'être
       fait voler quelque chose : laisser vivre les sessions ouvertes le vide de son sens.
       C'est exactement la faute que ce dépôt a déjà payée côté Firebase — refuser les nouveaux
       jetons sans couper les sessions déjà échangées. */
    v('⛔⛔ et la session d\'AVANT est coupée', (await appel(B, '/api/compte/moi', undefined, sessionAvant)).code, 401);
  }

  console.log('\n══ 8. CE QUI EST VRAIMENT SUR LE DISQUE ══\n');
  {
    const chemin = path.join(S.data, 'comptes-portail.json');
    vrai('   le fichier des comptes existe', fs.existsSync(chemin));
    const brut = fs.readFileSync(chemin, 'utf8');
    let o = null; let jetable = false;
    try { o = JSON.parse(brut); } catch (e) { jetable = true; }
    vrai('   et c\'est du JSON valide — l\'écriture passe par un temporaire puis un renommage', !jetable);
    vrai('⛔ aucun mot de passe en clair', brut.indexOf('un-vrai-mot-de-passe') < 0 && brut.indexOf('le-nouveau-mot-de-passe') < 0);
    vrai('⛔ ni l\'EMPREINTE que l\'appareil a envoyée — elle vaut un mot de passe', brut.indexOf(emp('un-vrai-mot-de-passe')) < 0);
    vrai('   mais l\'adresse, elle, y est — sinon on ne cherche pas au bon endroit', brut.indexOf('justin@exemple.fr') >= 0);
    const c = o && o.c && o.c['justin@exemple.fr'];
    vrai('   chaque compte porte un sel de 16 octets', !!c && /^[a-f0-9]{32}$/.test(c.s));
    vrai('   et une clé dérivée de 32 octets', !!c && /^[a-f0-9]{64}$/.test(c.e));
    /* ⛔ Deux comptes au MÊME mot de passe ne doivent PAS avoir la même clé : sans sel par
       compte, une seule table précalculée ouvrirait tout le portail d'un coup. */
    await appel(B, '/api/compte/creer', { email: 'jumeau1@exemple.fr', h: emp('exactement-le-meme') });
    await appel(B, '/api/compte/creer', { email: 'jumeau2@exemple.fr', h: emp('exactement-le-meme') });
    const o2 = JSON.parse(fs.readFileSync(chemin, 'utf8'));
    const a = o2.c['jumeau1@exemple.fr'], b2 = o2.c['jumeau2@exemple.fr'];
    vrai('⛔ deux comptes au MÊME mot de passe ont des sels différents', a && b2 && a.s !== b2.s);
    vrai('⛔ donc des clés différentes', a && b2 && a.e !== b2.e);
    /* Et le jeton de session : seul son sha256 est rangé, comme les jetons d'appareil du socle. */
    vrai('⛔ le jeton de session n\'est PAS rangé en clair', brut.indexOf(jetonSession) < 0);
  }

  await arreter();
  await POSTE.fermer();
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(async (e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  await arreter(); try { await POSTE.fermer(); } catch (x) {}
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});
