/* ⛔ CE QUE CE FICHIER GARDE — QUE `reinit.html` SOIT DU BON CÔTÉ DE LA COUTURE.

   `reinit.html` est la page où atterrit un client qui a cliqué « mot de passe oublié » dans
   son courriel. Elle a été l'ANGLE MORT de tout ce chantier : `server/comptes.js` envoyait
   des liens `?jeton=…` depuis le premier jour, et la page ne lisait que `?oobCode=…`. Tout
   lien de NOTRE serveur tombait donc sur « Lien invalide ou expiré ». Personne ne l'a vu,
   parce que les deux moitiés étaient justes chacune de son côté — c'est mot pour mot la
   couture que CLAUDE.md décrit, et la troisième fois en deux jours.

   ⛔ ET LA PIRE DES DEUX N'EST PAS CELLE-LÀ. `empreinte()` est écrite DEUX FOIS — dans
   `espace.html` et dans `reinit.html` — et ces deux pages ne partagent AUCUNE ligne de code.
   Un préfixe qui change d'un côté et pas de l'autre donne un client qui pose son mot de
   passe ICI et ne peut plus se connecter LÀ-BAS, sans qu'aucune erreur ne s'affiche nulle
   part : les deux pages fonctionnent, le serveur fonctionne, et le client est dehors.
   Ce banc EXTRAIT les deux fonctions réelles et les fait travailler ensemble contre le VRAI
   serveur — poser d'un côté, se connecter de l'autre. C'est la seule preuve qui tienne. */
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

const REINIT = fs.readFileSync(path.join(RACINE, 'reinit.html'), 'utf8');
const ESPACE = fs.readFileSync(path.join(RACINE, 'espace.html'), 'utf8');
const MDP_ADMIN = 'mot-de-passe-du-banc-741';
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'reinit-741-'));
let enfant = null, smtp = null;

/* ── LE FACTEUR DU BANC ──────────────────────────────────────────────────────────────────────
   Un serveur SMTP minuscule qui garde ce qu'on lui donne. Les liens qu'on veut éprouver ne
   s'inventent pas : ils naissent DANS le courriel que le serveur envoie, et c'est exactement
   ce qu'on veut lire — pas un jeton fabriqué par le banc, qui ne prouverait rien du chemin. */
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

/* ── LES DEUX VRAIES FONCTIONS, EXTRAITES DES DEUX VRAIES PAGES ──────────────────────────────
   ⛔ ANCRÉES SUR LA FORME DU CODE, jamais sur une phrase : ce dépôt est très commenté, et un
   motif qui vise une chaîne tombe dans le COMMENTAIRE qui l'explique, vingt lignes plus haut. */
function extraireReinit() {
  const i = REINIT.indexOf('var MAISON = !!JETON;');
  const j = REINIT.indexOf('\n</script>', i);
  if (i < 0 || j < 0) return null;
  return REINIT.slice(i, j);
}
function empreinteDEspace() {
  const i = ESPACE.indexOf('async function empreinte(mdp){');
  const j = ESPACE.indexOf('async function appel(chemin, corps){');
  if (i < 0 || j < 0 || j <= i) return null;
  return ESPACE.slice(i, j);
}

/* Le navigateur, réduit à ce que la page touche vraiment. Les écrans sont des `<div>` : on
   rend `style.display` observable, c'est ainsi que la page dit ce qu'elle montre. */
function fabriquerReinit(base, recherche) {
  const src = extraireReinit();
  if (!src) return null;
  const ecrans = {};
  const elem = (id) => (ecrans[id] || (ecrans[id] = { id, style: { display: '' }, textContent: '', innerHTML: '', value: '', disabled: false, focus(){} }));
  const charges = [];
  const doc = {
    getElementById: (id) => elem(id),
    createElement: () => { const e = { set src(u){ charges.push(u); setTimeout(() => e.onload && e.onload(), 0); }, onload: null, onerror: null }; return e; },
    head: { appendChild(){} },
  };
  const bac = { ecrans, elem, charges };
  const code = src
    .replace(/var API = [\s\S]*?;\n/, 'var API = ' + JSON.stringify(base) + ';\n');
  const f = new Function('fetch', 'crypto', 'TextEncoder', 'document', 'location', 'setTimeout', 'Promise', 'firebase',
    'var Q=new URLSearchParams(' + JSON.stringify(recherche) + "), MODE=Q.get('mode')||'', CODE=Q.get('oobCode')||'', JETON=Q.get('jeton')||'', SUITE=Q.get('continueUrl')||'';\n"
    + 'var FB_CONFIG={};\nvar auth=null;\n'
    + "function montre(id){ ['etape-chargement','etape-form','etape-ok','etape-ko'].forEach(function(x){ var e=document.getElementById(x); if(e) e.style.display=(x===id)?'block':'none'; }); }\n"
    + "function ko(txt){ if(txt){ var t=document.getElementById('ko-txt'); if(t) t.textContent=txt; } montre('etape-ko'); }\n"
    + "function suiteHref(){ return 'espace.html'; }\n"
    + code + '\nreturn { empreinte: empreinte, enregistrer: enregistrer, MAISON: MAISON };');
  const api = f(globalThis.fetch, globalThis.crypto, TextEncoder, doc, { hostname: '127.0.0.1' }, setTimeout, Promise, undefined);
  return { api, bac, montre: () => Object.keys(ecrans).filter(k => /^etape-/.test(k) && ecrans[k].style.display === 'block')[0] || '' };
}

async function monter(portSmtp) {
  const dir = path.join(BANC, 'srv'), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const cfgPath = path.join(dir, 'config.json');
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha(MDP_ADMIN), comptes: { actif: true },
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' },
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
  return { B, vivant, journal: () => journal };
}
const arreter = async () => {
  try { if (smtp) smtp.s.close(); } catch (e) {}
  if (!enfant || enfant.exitCode !== null) return;
  await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) {} res(); });
};

/* ⛔ UN COURRIEL N'EST PAS DU TEXTE BRUT, ET LE CHERCHER COMME TEL DONNE UN BANC QUI ACCUSE
   LE SERVEUR DE NE PAS ENVOYER CE QU'IL ENVOIE. Mesuré le 20 septembre 2026 : le corps part
   en `quoted-printable`, donc `mode=resetPassword` s'écrit `mode=3DresetPassword`, et une
   coupure douce `=\n` tombe AU MILIEU des mots — `reinit.=\nhtml?mode=3D…`. Les deux motifs
   du premier jet ne pouvaient donc JAMAIS correspondre.
   C'est la même leçon que `test-738`, qui cherchait dans un SUJET encodé en RFC 2047 : on
   décode d'abord, on cherche ensuite. Ordre obligatoire — les coupures douces AVANT les
   `=XX`, sinon un `=` de fin de ligne se lit comme le début d'un octet. */
const lisible = (m) => String(m || '').replace(/=\r?\n/g, '')
  .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

const POST = async (B, c, corps) => {
  const r = await fetch(B + c, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { code: r.status, j: j || {} };
};

(async () => {
  console.log('\n══ 1. ⛔ LE LIEN DU SERVEUR EST LU — C\'ÉTAIT L\'ANGLE MORT ══\n');
  {
    /* ⛔ On lit le fichier SERVI, commentaires retirés : le nom du paramètre apparaît dans
       l'explication juste au-dessus du code, et un motif qui tombe dedans ne garde rien. */
    const nu = REINIT.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('⛔ la page lit `jeton` dans l\'adresse', /Q\.get\('jeton'\)/.test(nu));
    vrai('   et lit toujours `oobCode` — les courriels Firebase déjà partis doivent marcher',
      /Q\.get\('oobCode'\)/.test(nu));
    vrai('⛔ c\'est le PARAMÈTRE qui décide, pas un interrupteur', /var MAISON = !!JETON;/.test(nu));
    vrai('⛔ et elle appelle nos deux routes', /\/api\/compte\/mdp\/poser/.test(nu) && /\/api\/compte\/verifier/.test(nu));
    /* ⛔ AUCUNE BALISE `<script src>` VERS GOOGLE. Elles étaient en tête de page : un client
       arrivant par un courriel de NOTRE serveur allait quand même chercher 300 Ko chez
       Google. Dire « tout est sur le serveur » pendant que la page appelle Google est
       l'écart que ce chantier existe pour fermer. */
    v('⛔ plus aucune balise `<script src>` vers gstatic', (REINIT.match(/<script src="https:\/\/www\.gstatic/g) || []).length, 0);
    vrai('   Firebase se charge à la demande, sur la branche `oobCode` seulement',
      /chargerFirebase\(\)\.then\(suiteFirebase\)/.test(nu));
  }

  console.log('\n══ 2. ⛔ LA MÊME EMPREINTE QUE `espace.html`, AU CARACTÈRE PRÈS ══\n');
  const srcEsp = empreinteDEspace();
  vrai('⛔ `empreinte` s\'extrait d\'espace.html', !!srcEsp);
  const R0 = fabriquerReinit('http://127.0.0.1:1', '?mode=resetPassword&jeton=' + 'a'.repeat(64));
  vrai('⛔ `reinit.html` livre ses fonctions', !!R0 && typeof R0.api.empreinte === 'function');
  {
    const fEsp = new Function('crypto', 'TextEncoder', srcEsp + '\nreturn empreinte;')(globalThis.crypto, TextEncoder);
    for (const mdp of ['un-mot-de-passe-solide', 'éàü ç#@!', 'x'.repeat(200)]) {
      const a = await R0.api.empreinte(mdp), b = await fEsp(mdp);
      v('   même empreinte des deux côtés pour « ' + mdp.slice(0, 18) + ' »', a, b);
    }
    /* ⚠️ Et elle doit rester une empreinte, pas le mot de passe : 64 hexadécimaux. */
    vrai('   et c\'est bien un SHA-256', /^[a-f0-9]{64}$/.test(await R0.api.empreinte('quoi')));
  }

  console.log('\n══ 3. LE VRAI SERVEUR, LE VRAI COURRIEL, LE VRAI LIEN ══\n');
  smtp = facteur();
  const portSmtp = await new Promise(res => smtp.s.listen(0, '127.0.0.1', () => res(smtp.s.address().port)));
  const S = await monter(portSmtp);
  if (!S.vivant) { console.log('  ✗ serveur non démarré\n' + S.journal().slice(0, 600) + '\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); await arreter(); process.exit(1); }
  vrai('   le serveur répond', S.vivant);

  const MAIL = 'claire@exemple.fr';
  const empEsp = new Function('crypto', 'TextEncoder', srcEsp + '\nreturn empreinte;')(globalThis.crypto, TextEncoder);
  const r1 = await POST(S.B, '/api/compte/creer', { email: MAIL, h: await empEsp('premier-mot-de-passe') });
  v('   le compte se crée', r1.code, 200);

  await POST(S.B, '/api/compte/mdp/demander', { email: MAIL });
  for (let i = 0; i < 60 && !smtp.recus.some(m => /mode=resetPassword/.test(lisible(m))); i++) await dormir(100);
  const courriel = lisible(smtp.recus.filter(m => /mode=resetPassword/.test(lisible(m))).pop() || '');
  vrai('⛔ le serveur a bien envoyé un courriel de mot de passe', !!courriel);
  /* ⛔ ON LIT LE LIEN DANS LE COURRIEL, on ne le fabrique pas : c'est le chemin entier qu'on
     éprouve — le serveur écrit, la page lit. Un jeton inventé par le banc ne prouverait que
     la moitié, et c'est justement la moitié qui marchait déjà. */
  const m = /reinit\.html\?mode=resetPassword&jeton=([a-f0-9]{64})/.exec(courriel.replace(/\s+/g, ''));
  vrai('⛔ et il pointe sur reinit.html avec un `jeton`', !!m);
  if (!m) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); await arreter(); process.exit(1); }

  console.log('\n══ 4. ⛔ POSER ICI, SE CONNECTER LÀ-BAS ══\n');
  {
    const R = fabriquerReinit(S.B, '?mode=resetPassword&jeton=' + m[1]);
    vrai('   la page est en mode maison', R.api.MAISON === true);
    /* ⚠️ Le formulaire doit s'afficher SANS vérifier le jeton d'avance : il ne sert QU'UNE
       fois, le brûler pour afficher l'écran le rendrait inutilisable à la validation. */
    await dormir(200);
    v('⛔ le formulaire s\'affiche (le jeton n\'est pas brûlé pour rien)', R.montre(), 'etape-form');

    R.bac.elem('p1').value = 'court'; R.bac.elem('p2').value = 'court';
    R.api.enregistrer(); await dormir(200);
    vrai('   un mot de passe trop court est refusé sur place', /8 caract/.test(R.bac.elem('err').textContent));

    R.bac.elem('p1').value = 'le-nouveau-mot-de-passe'; R.bac.elem('p2').value = 'pas-le-meme';
    R.api.enregistrer(); await dormir(200);
    vrai('   deux saisies différentes aussi', /ne correspondent pas/.test(R.bac.elem('err').textContent));

    R.bac.elem('p1').value = 'le-nouveau-mot-de-passe'; R.bac.elem('p2').value = 'le-nouveau-mot-de-passe';
    R.api.enregistrer();
    for (let i = 0; i < 60 && R.montre() !== 'etape-ok'; i++) await dormir(100);
    v('⛔ le mot de passe est enregistré PAR NOTRE SERVEUR', R.montre(), 'etape-ok');

    /* ⛔ LA PREUVE QUI COMPTE : la connexion se fait par l'empreinte d'`espace.html`, l'autre
       page, qui ne partage aucune ligne avec celle-ci. Si les deux divergeaient, le client
       serait dehors sans qu'aucune erreur ne s'affiche nulle part. */
    const cnx = await POST(S.B, '/api/compte/connexion', { email: MAIL, h: await empEsp('le-nouveau-mot-de-passe') });
    v('⛔ et `espace.html` le reconnaît — la couture tient', cnx.code, 200);
    const vieux = await POST(S.B, '/api/compte/connexion', { email: MAIL, h: await empEsp('premier-mot-de-passe') });
    v('   l\'ancien ne marche plus', vieux.code, 401);

    /* ⛔ ET LE LIEN NE SERT QU'UNE FOIS. Sans ça, un courriel qui traîne dans une boîte
       partagée rouvre le compte des mois plus tard. */
    const R2 = fabriquerReinit(S.B, '?mode=resetPassword&jeton=' + m[1]);
    await dormir(150);
    R2.bac.elem('p1').value = 'encore-un-autre-mdp'; R2.bac.elem('p2').value = 'encore-un-autre-mdp';
    R2.api.enregistrer();
    for (let i = 0; i < 60 && R2.montre() !== 'etape-ko'; i++) await dormir(100);
    v('⛔ le même lien une seconde fois est REFUSÉ', R2.montre(), 'etape-ko');
    vrai('   et l\'écran dit pourquoi, pas juste « erreur »', /expir|déjà servi/.test(R2.bac.elem('ko-txt').textContent));
    const tjrs = await POST(S.B, '/api/compte/connexion', { email: MAIL, h: await empEsp('le-nouveau-mot-de-passe') });
    v('   et le mot de passe posé au premier passage tient toujours', tjrs.code, 200);
  }

  console.log('\n══ 5. ⛔ LE LIEN DE VÉRIFICATION D\'ADRESSE, MÊME CHEMIN ══\n');
  {
    const courrielV = lisible(smtp.recus.filter(x => /mode=verifyEmail/.test(lisible(x))).pop() || '');
    const mv = /reinit\.html\?mode=verifyEmail&jeton=([a-f0-9]{64})/.exec(courrielV.replace(/\s+/g, ''));
    vrai('⛔ la création de compte a envoyé un lien de vérification', !!mv);
    if (mv) {
      const avant = await (await fetch(S.B + '/api/compte/moi')).status;
      v('   (sans session, `moi` refuse)', avant, 401);
      const R = fabriquerReinit(S.B, '?mode=verifyEmail&jeton=' + mv[1]);
      for (let i = 0; i < 60 && R.montre() !== 'etape-ok'; i++) await dormir(100);
      v('⛔ l\'adresse est vérifiée par NOTRE serveur', R.montre(), 'etape-ok');
      vrai('   et l\'écran le dit', /vérifiée/.test(R.bac.elem('etape-ok').innerHTML));
      const R2 = fabriquerReinit(S.B, '?mode=verifyEmail&jeton=' + mv[1]);
      for (let i = 0; i < 60 && R2.montre() !== 'etape-ko'; i++) await dormir(100);
      v('⛔ et lui non plus ne sert qu\'une fois', R2.montre(), 'etape-ko');
    }
  }

  console.log('\n══ 6. ⛔ CE QUI NE DOIT PAS PASSER ══\n');
  {
    /* Un jeton inventé, de la bonne forme : la page doit refuser, et le DIRE. */
    const R = fabriquerReinit(S.B, '?mode=resetPassword&jeton=' + 'f'.repeat(64));
    await dormir(150);
    R.bac.elem('p1').value = 'un-mot-de-passe-invente'; R.bac.elem('p2').value = 'un-mot-de-passe-invente';
    R.api.enregistrer();
    for (let i = 0; i < 60 && R.montre() !== 'etape-ko'; i++) await dormir(100);
    v('⛔ un jeton inventé est refusé', R.montre(), 'etape-ko');

    /* Un jeton de VÉRIFICATION présenté comme un jeton de MOT DE PASSE. Les deux ont la même
       forme ; seul le genre les distingue. Les confondre laisserait un lien de vérification
       — qui vit SEPT JOURS — changer un mot de passe. */
    await POST(S.B, '/api/compte/creer', { email: 'autre@exemple.fr', h: await empEsp('un-mot-de-passe-solide') });
    /* ⚠️ On attend le courriel DE CETTE ADRESSE-LÀ, pas « un courriel de vérification » :
       il en traîne déjà un de la section 3, et le prendre à sa place comparerait deux fois
       le même cas — le défaut exact déjà payé sur `test-738`. */
    const pourAutre = (x) => /mode=verifyEmail/.test(lisible(x)) && /autre@exemple\.fr/.test(lisible(x));
    for (let i = 0; i < 60 && !smtp.recus.some(pourAutre); i++) await dormir(100);
    const cv = lisible(smtp.recus.filter(pourAutre).pop() || '');
    const mv2 = /jeton=([a-f0-9]{64})/.exec(cv.replace(/\s+/g, ''));
    if (mv2) {
      const r = await POST(S.B, '/api/compte/mdp/poser', { jeton: mv2[1], h: await empEsp('je-detourne-le-lien') });
      v('⛔ un jeton de VÉRIFICATION ne pose pas un mot de passe', r.code, 400);
    } else { v('⛔ un jeton de VÉRIFICATION ne pose pas un mot de passe', 'lien introuvable', 400); }

    /* Sans aucun paramètre : l'écran d'échec, pas un écran blanc. */
    const R3 = fabriquerReinit(S.B, '');
    await dormir(150);
    v('⛔ sans paramètre du tout, l\'écran d\'échec', R3.montre(), 'etape-ko');
    v('   et Firebase n\'a PAS été téléchargé pour rien', R3.bac.charges.length, 0);
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
