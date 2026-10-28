/* ⛔ CE QUE CE FICHIER GARDE — LE COURRIER DE LA TOUR EST OP COURRIER, BRANCHÉ SUR LES VRAIES ROUTES DE `server/mail.js` (18 octobre 2026).

   Justin : « ça remplace Mail, qui est actuel dans OP GESTION et dans la Tour » ; « quand tu l'intègres c'est VIDE, les gens doivent se connecter à leur mail, comme nous dans la Tour ».
   Il remplace `test-670` et `test-671`, qui gardaient le TEXTE de l'ancien écran (choisir une boîte, les dossiers d'une boîte) : cet écran n'existe plus, et ce que ces deux bancs
   gardaient — « on regarde une boîte à la fois, ses dossiers viennent du serveur, jamais d'une tranche déjà chargée » — vit maintenant dans l'ADAPTATEUR (`courrierSource`).
   Trois moitiés, et elles ne se remplacent pas :
     1. LA PAGE : l'ancien écran est RETIRÉ (aucun nom de fonction, aucune règle, aucune route de l'ancien envoi), le module est monté à l'ouverture seulement, dans la zone, avec le
        thème de la Tour et sa propre clé de stockage, vidée à la déconnexion ; quitter la vue le démonte ; une relève ne le reconstruit pas ;
     2. L'ADAPTATEUR : la VRAIE `courrierSource` de `tour.html`, extraite du fichier réel, contre le VRAI serveur isolé (fausse boîte IMAP `tests/faux-imap.js`, faux relais SMTP) —
        vide au départ, la boîte se connecte PAR le geste, chaque dossier arrive de sa vraie boîte, lu / marqué / déplacé / envoyé tiennent côté serveur ;
     3. LE REFUS EST UNE PANNE : un refus (403 patron, 401 session, 502 boîte en panne, serveur éteint) est une ERREUR qui se dit — jamais une liste vide qui dirait « Aucune boîte » à quelqu'un
        dont la boîte marche (la règle de `_mailboxes`, CLAUDE.md).
   4. LES QUATRE GESTES QUE L'ANCIEN ÉCRAN FAISAIT ET QUE LE PREMIER BRANCHEMENT AVAIT PERDUS (v2.91, Justin : « fais-les ») : le journal « Envois TeamOP » (`/api/monitor/mails`), le
      téléchargement d'une pièce reçue (`/mail/piece`), le suivi d'une demande (`/mail/suivi`), la réponse qui référence le message (`enReponseA` → In-Reply-To / References, « répondu »,
      suivi « en cours »). Chacun est joué par la VRAIE fonction de la page contre le VRAI serveur, et le module ne les promet que si la source les DÉCLARE.
   Rien ne sort d'ici : 127.0.0.1, configuration et données jetables. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const TOUR_FICHIER = process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(RACINE, 'tour.html');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
const FAUX = path.join(__dirname, 'faux-imap.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2704-'));
let enfant = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 240 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 240000).unref();

/* ══ 1. LA PAGE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const BRUT = fs.readFileSync(TOUR_FICHIER, 'utf8');
const nu = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');   // le code, pas les phrases qui racontent ce qui a été retiré
const CODE = nu(BRUT);
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };

console.log('\n── 2704 · 1. La page : l\'ancien Courrier n\'existe plus, OP Courrier est monté à sa place ──');
{
  const RETIRES = ['vueSupport', 'chargerMessages', 'mailListeRecue', 'mailListeRecueCorps', 'mailListeEnvoyee', 'mailChoisirBoite', 'mailChoisirDossier', 'mailChoisirEnt', 'mailChoisirCat', 'mailDossiers',
    'courrierEnt', 'courrierParEnt', 'supLigne', 'supGroupe', 'supVide', 'lireMessage', 'allerMessage', 'repondre', 'compoEnvoyer', 'compoOuvrir', 'chargerEnvois', 'envoyesOuvrir', 'supConnecterBoite', 'voirClient'];
  const restes = RETIRES.filter(n => new RegExp('(?<![\\w$.])' + n + '(?![\\w$])').test(CODE));
  v('⛔ (population ' + RETIRES.length + ' noms) aucun nom de l\'ancien écran ne survit — retiré, pas laissé mort', restes, []);
  vrai('⛔ l\'ancien envoi (« support/envoyer ») et la connexion par `prompt` n\'existent plus', !/monitor\/support\/(envoyer|connect)/.test(CODE) && !/prompt\([^)]*boîte/.test(CODE));
  vrai('⛔ aucune règle de l\'ancien écran (.mail, .mail-*, .dos, .sup-*, .lec-*, .mrow) ne survit dans la feuille',
    !/(^|[\s,}])\.(mail|mail-[a-z]+|dos|dos-[a-z]+|sup-[a-z0-9]+|lec|lec-[a-z]+|mrow)[\s{.,:>]/m.test(CODE.slice(0, CODE.indexOf('</style>'))));
  const mont = corps(BRUT, 'function courrierMonter(');
  vrai('(population) courrierMonter est trouvée', mont.length > 400);
  vrai('⛔ elle monte le MODULE (OPCourrier.monter) dans la zone, côté Pro seul', /OPCourrier\.monter\(zone,/.test(mont) && /cotes:\['pro'\]/.test(mont));
  vrai('…avec SA clé de stockage, qui n\'est celle d\'aucune autre application (tour_courrier)', /cleStockage:'tour_courrier'/.test(mont));
  vrai('…le thème de la TOUR (jour automatique / nuit), pas celui de l\'appareil lu à part', /document\.body\.classList\.contains\('jour'\)\?'jour':'nuit'/.test(mont));
  vrai('…la pastille du menu suit le module (onCompter)', /onCompter:function\(n\)\{[^}]*setBdg\('bdg-supp',n\)/.test(mont));
  vrai('⛔ le module ne se charge QU\'À L\'OUVERTURE du Courrier : ni balise <script src="opcourrier.js"> dans la page, ni appel au démarrage',
    !/<script[^>]*opcourrier\.js/.test(BRUT) && /document\.createElement\('script'\)/.test(corps(BRUT, 'function courrierCharger(')) && (CODE.match(/courrierCharger\(/g) || []).length === 2);
  const rv = corps(BRUT, 'function renderVue(');
  vrai('⛔ la vue Courrier passe par courrierGarde : une relève (render) ne reconstruit pas le module vivant', /TAB==='support'\)\{ if\(!courrierGarde\(v\)\)\{ v\.innerHTML=groupeOnglets\('support'\)\+vueCourrier\(\); courrierMonter\(\); \} \}/.test(rv));
  vrai('⛔ quitter le Courrier le DÉMONTE (sa minuterie ne redessinerait pas une autre vue)', /if\(TAB!=='support'\) courrierDemonter\(\)/.test(rv) && rv.indexOf('vuePermise(TAB)') < rv.indexOf('courrierDemonter'));
  vrai('⛔ la déconnexion démonte le module ET vide sa clé (brouillons, tri appris) — la Tour ne les laisse pas à la personne suivante', /function doLogout\(\)\{ try\{ courrierDemonter\(\); localStorage\.removeItem\('tour_courrier'\)/.test(BRUT));
  vrai('⛔ le jour / la nuit se suivent EN DIRECT : modeApplique relit le thème du module', /function modeApplique\([^)]*\)\{[^}]*COUR\.inst\.rafraichir\(\{donnees:false\}\)/.test(BRUT));
  vrai('« Écrire à… » d\'une fiche ouvre un nouveau message dans le module (ecrire), sans composeur maison', /function courrierEcrire\([\s\S]*?COUR\.inst\.ecrire\(/.test(BRUT) && (CODE.match(/courrierEcrire\(/g) || []).length >= 3);
  vrai('l\'accueil ne lit plus de messages (il n\'en a plus) : il compte les non lus et mène au Courrier', !/MSG\.messages/.test(CODE) && /nMot\(MSG\.nonLus,'message non lu'/.test(CODE));
  vrai('le relevé des compteurs (chargerMail) ne touche plus au chiffre quand le module est monté — la pastille ne saute pas entre deux manières de compter', /if\(!COUR\.inst\)\{ MSG\.nonLus=/.test(corps(BRUT, 'function chargerMail(')));
  { const m = /var TOUR_VERSION='v2\.(\d+)'/.exec(BRUT);   // v2.101 au moins : un lot suivant la monte encore (v2.102, lot 1 de la refonte)
    vrai('⛔ la version de la Tour est montée (v2.101 ou plus : v2.' + (m && m[1]) + ')', !!m && +m[1] >= 101); }
  /* v2.94 — le son du Courrier HORS de l'écran Courrier : la VRAIE `courrierSonner` et la VRAIE `courrierSonActif`, rejouées (la Tour n'a de relève de fond que par la pastille) */
  { const vm = require('vm');
    const fSon = ['courrierSonActif', 'courrierSonner'].map(n => { const i0 = BRUT.indexOf('function ' + n + '('); vrai('(tranche trouvée) ' + n, i0 > 0); return i0 > 0 ? corps(BRUT, 'function ' + n + '(') : ''; }).join('\n');
    vrai('(tranche non vide) les deux fonctions du son', fSon.length > 300);
    const jouer = (o) => { const jour = []; const stock = o.stock === undefined ? null : o.stock;
      const sb = { MSG: { sonRef: o.ref }, COUR_SON: null, navigator: o.nav || {}, localStorage: { getItem: () => stock }, JSON, Audio: function (u) { jour.push('nouveau:' + u); this.play = () => { jour.push('play'); return o.refuse ? Promise.reject(new Error('NotAllowedError')) : Promise.resolve(); }; } };
      vm.createContext(sb); vm.runInContext('var COUR_SON=null;\n' + fSon + '\n;this.sonner=courrierSonner;', sb);
      o.suite.forEach(n => sb.sonner(n)); return { jour, ordre: jour }; };
    v('⛔ premier relevé (`sonRef` vide) : AUCUN son — jamais pour ce qui était déjà là', jouer({ ref: null, suite: [5] }).jour, []);
    v('⛔ le nombre de non lus MONTE : le son retentit, UNE fois pour un lot de plusieurs mails', jouer({ ref: 2, suite: [6] }).jour, ['nouveau:sons/courrier.mp3', 'play']);
    v('…le nombre n\'a pas bougé ou a baissé (un mail lu) : silence', jouer({ ref: 4, suite: [4, 3] }).jour, []);
    v('⛔ « Son des nouveaux mails » éteint dans le module (rangé dans tour_courrier) : silence', jouer({ ref: 1, suite: [3], stock: JSON.stringify({ settings: { son: false } }) }).jour, []);
    v('…activé par défaut : un instantané sans ce réglage, ou illisible, laisse sonner', [jouer({ ref: 1, suite: [3], stock: JSON.stringify({ settings: { notif: false } }) }).jour.length, jouer({ ref: 1, suite: [3], stock: '{pas du json' }).jour.length], [2, 2]);
    const amb = { audioSession: { type: 'auto' } }; jouer({ ref: 1, suite: [3], nav: amb });
    v('⛔ Safari iOS : `audioSession.type = "ambient"` AVANT de jouer — le son suit l\'interrupteur silencieux', amb.audioSession.type, 'ambient');
    v('⛔ le navigateur refuse la lecture (aucun geste encore) : rien ne casse, rien n\'est dit', (() => { try { return jouer({ ref: 1, suite: [3], refuse: true }).jour; } catch (e) { return 'a jeté'; } })(), ['nouveau:sons/courrier.mp3', 'play']);
    const ch = corps(BRUT, 'function chargerMail(');
    vrai('⛔ la relève de fond ne sonne QUE si le module n\'est pas monté (c\'est lui qui sonne alors), et tient le chiffre du serveur à jour dans les deux cas', /if\(!COUR\.inst\)\{[^}]*courrierSonner\(srv\)[^}]*\}\s*MSG\.sonRef=srv;/.test(ch));
    vrai('⛔ démonter le module REMET le chiffre de référence à zéro (il a sonné pour ce qu\'il a relevé : la relève de fond ne sonne pas une seconde fois)', /function courrierDemonter\(\)\{[^]*?COUR\.inst=null; MSG\.sonRef=null;/.test(BRUT));
    vrai('⛔ une relève de la pastille toutes les minutes, page visible, hors module, seulement pour qui voit OP GESTION — le rythme du module, pas plus', /MYAPPS\.indexOf\('gestion'\)>=0\) setInterval\(function\(\)\{ if\(document\.visibilityState==='visible'&&!COUR\.inst&&MSG\.loaded\) chargerMail\(\); \},60000\)/.test(CODE));
    vrai('la déconnexion efface aussi les fichiers gardés par le module (IndexedDB tour_courrier_fichiers)', /function doLogout\(\)\{[^]*?indexedDB\.deleteDatabase\('tour_courrier_fichiers'\)/.test(BRUT));
    vrai('le son est celui du dépôt (sons/courrier.mp3), servi par le site assemblé', fs.existsSync(path.join(RACINE, 'sons', 'courrier.mp3')) && fs.statSync(path.join(RACINE, 'sons', 'courrier.mp3')).size > 5000); }
  vrai('(population) opcourrier.js existe à la racine, sert `ecrire`, et n\'appelle jamais le réseau', fs.existsSync(path.join(RACINE, 'opcourrier.js')) && /ecrire:function/.test(fs.readFileSync(path.join(RACINE, 'opcourrier.js'), 'utf8')) && !/\bfetch\(|XMLHttpRequest/.test(nu(fs.readFileSync(path.join(RACINE, 'opcourrier.js'), 'utf8'))));
}

/* ══ 2. L'ADAPTATEUR CONTRE LE VRAI SERVEUR ═══════════════════════════════════════════════════════════════════════════════════════════ */
function facteur() {
  const f = { recus: [] };
  f.s = net.createServer(c => {
    c.on('error', () => {});
    let tampon = '', corpsM = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8'); let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corpsM) { if (l === '.') { corpsM = false; f.recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corpsM = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
  });
  return f;
}
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); require.resolve('imapflow', { paths: [path.join(RACINE, 'server')] }); }
  catch (e) { console.log('  … SAUTÉ (parties 2 et 3) : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  console.log('\n── 2704 · 2. L\'adaptateur : la VRAIE courrierSource contre le VRAI serveur (fausse boîte IMAP, faux relais SMTP) ──');
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  const BX = 'tour@banc-2704.fr', B2 = 'froide@banc-2704.fr', BAD = 'casse@banc-2704.fr', MDP = 'mot-de-passe-du-banc-2704', MDP2 = 'mot-de-passe-agent-2704', PROTEGE = '0123456789abcdef0123456789abcdef.securite@banc-2704.fr';
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  fs.writeFileSync(path.join(D, 'mails-proteges.json'), JSON.stringify([PROTEGE]));
  /* le journal des e-mails que le SERVEUR envoie : trois entrées, dont une qui n'est pas partie et une qui n'est pas encore partie ; deux au même instant (l'identifiant reste unique) */
  const TJ = Date.now() - 3600000;
  fs.writeFileSync(path.join(D, 'mails-envoyes.json'), JSON.stringify([
    { ts: TJ + 3000, a: 'neuf@exemple-2704.fr', sujet: 'Bienvenue sur OP GESTION', txt: 'Votre espace est prêt.\n\nÀ bientôt.' },
    { ts: TJ + 2000, a: 'rate@exemple-2704.fr', sujet: '⚠️ NON PARTI — Invitation', txt: 'Invitation', echec: 1 },
    { ts: TJ + 1000, a: 'lent@exemple-2704.fr', sujet: '⚠️ PAS ENCORE PARTI — Avis', txt: '', retard: 1 },
    { ts: TJ + 1000, a: 'jumeau@exemple-2704.fr', sujet: 'Même instant', txt: 'x' }]));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [
    { id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: Date.now() },
    { id: 'u-agent', nom: 'Agent', email: '', hash: sha(MDP2), role: 'collaborateur', actif: true, ts: Date.now() }] }));
  /* ⛔ AUCUNE boîte au départ : `mail-boites.json` n'existe pas — c'est « repartir vide » */
  const IMAP = path.join(banc, 'faux-imap.json'), T0 = Date.now() - 3 * 86400000, rang = {};
  const etat = { boites: { [BX]: { messages: [], actions: [] } }, pannes: { [BAD]: 'Invalid credentials pour ' + BAD } };
  const poser = (dossier, o) => { const k = dossier; rang[k] = (rang[k] || 0) + 1; const n = rang[k];
    etat.boites[BX].messages.push(Object.assign({ dossier, uid: n, messageId: o.mid || ('<' + dossier.slice(0, 2) + n + '@banc-2704>'), from: o.de || 'client@exemple-2704.fr', fromNom: o.nom || '', to: o.a || BX,
      subject: o.objet || ('Message ' + n), text: o.texte || ('Corps du message ' + n), ts: T0 + n * 600000, flags: o.lu ? ['\\Seen'] : [] }, o.pieces ? { pieces: o.pieces } : {}, o.html ? { html: o.html } : {})); };
  poser('INBOX', { objet: 'Facture mars', nom: 'Anne Durand', texte: 'Bonjour, ma facture de mars.' });
  poser('INBOX', { objet: 'Devis signé', lu: true, pieces: [{ nom: 'devis.pdf', type: 'application/pdf', taille: 2345 }] });
  poser('INBOX', { objet: 'Avis de sécurité', mid: '<' + PROTEGE + '>', de: 'banc@teamop.fr' });
  poser('INBOX', { objet: 'Avec HTML', texte: 'Texte brut du message', html: '<p>Version <b>HTML</b> du message</p>', lu: true });
  poser('Envoyés', { de: BX, a: 'client@exemple-2704.fr', objet: 'Votre facture', lu: true });
  poser('Brouillons', { de: BX, a: 'x@exemple-2704.fr', objet: 'Brouillon A', lu: true });
  poser('Archives', { objet: 'Archive 1', lu: true });
  poser('Indésirables', { objet: 'Gagnez' });
  poser('Corbeille', { objet: 'Jeté', lu: true });
  fs.writeFileSync(IMAP, JSON.stringify(etat));
  const lireEtat = () => JSON.parse(fs.readFileSync(IMAP, 'utf8'));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } }));
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  let journal = '';
  const demarrer = async () => {
    enfant = spawn(process.execPath, ['-r', FAUX, SERVEUR], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
      TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9', TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk',
      TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs', TEAMOP_MAIL_NONLUS_MS: '1000', FAUX_IMAP: IMAP, FAUX_IMAP_RACINE: path.join(RACINE, 'server') }), stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    let vivant = false; for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    return vivant;
  };
  vrai('le serveur démarre (fausse boîte IMAP glissée par `node -r`, AUCUNE boîte connectée)', await demarrer(), journal.slice(-300));
  const login = async (nom, pass) => (await (await fetch('http://127.0.0.1:' + PORT + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '10.0.0.1' }, body: JSON.stringify({ nom, pass }) })).json()).token;
  const TP = await login('Patron', MDP), TA = await login('Agent', MDP2);
  vrai('la Tour ouvre une session de patron et une de collaborateur', TP && TA);

  /* ── la VRAIE courrierSource, extraite du fichier réel, avec ce que la page lui fournit ── */
  const src = corps(BRUT, 'function courrierSource(');
  vrai('(population) courrierSource est trouvée dans tour.html, et entière', src.length > 3000 && /retirerBoite:function/.test(src), src.length);
  let jeton = TP, deconnexions = 0, etats = [], nAdr = 0; const URLS = [];
  const bac = { COURRIER_SRV: 'http://127.0.0.1:1', AbortSignal, MYNOM: 'Patron', API: 'http://127.0.0.1:' + PORT, INJOIGNABLE: 'Serveur injoignable — nouvelle tentative dans un instant.', Promise, JSON, Date, encodeURIComponent, String, Array, Math, Error, parseInt,
    hAuth: () => ({ 'Content-Type': 'application/json', Authorization: 'Bearer ' + jeton }), srvEtat: ok2 => etats.push(ok2), doLogout: () => { deconnexions++; },
    fetch: (u, o) => { URLS.push(String(u)); return fetch(u, Object.assign({}, o, { headers: Object.assign({ 'X-Forwarded-For': '10.7.' + ((++nAdr >> 8) & 255) + '.' + (nAdr & 255) }, (o && o.headers) || {}) })) },
    FileReader: class { readAsDataURL(f) { f.arrayBuffer().then(b => { this.result = 'data:' + (f.type || 'application/octet-stream') + ';base64,' + Buffer.from(b).toString('base64'); this.onload(); }, e => this.onerror(e)); } } };
  vm.createContext(bac);
  vm.runInContext(src, bac);
  const S = () => vm.runInContext('courrierSource()', bac);
  const rejette = async (p) => { try { await p; return null; } catch (e) { return String(e && e.message); } };
  let s = S();

  const cap = await s.capacites();
  v('⛔ ce que la Tour sait faire est DIT : lu/non lu, déplacement et réglages de serveur oui ; Google/Microsoft, envoi programmé non, et la signature non TANT QUE le service de signature ne répond pas (ici : injoignable, échec silencieux — le service prêt est gardé par test-2705)', [cap.marquage, cap.deplacement, cap.reglagesServeur, cap.oauth, cap.programmeServeur, cap.signature, cap.simulation], [true, true, true, false, false, false, false]);
  v('⛔ …et les TROIS gestes de l\'ancien écran sont déclarés : journal des envois, pièce reçue, suivi d\'une demande', [cap.journalEnvois, cap.telechargerPiece, cap.suivi], [true, true, true]);
  v('⛔ la Tour dit QUI est la personne connectée (`moi`), pour « Assignés à moi » — son nom de session, pas une valeur inventée', cap.moi, 'Patron');
  v('…les six dossiers que le serveur sait lire', cap.dossiers, ['inbox', 'drafts', 'sent', 'archive', 'junk', 'trash']);
  v('⛔ VIDE au départ : le serveur n\'a aucune boîte, la liste est LUE et vide (pas une panne)', await s.boites(), []);

  /* connecter : le geste, réservé au patron */
  jeton = TA;
  const refusAgent = await rejette(s.ajouterBoite({ email: BX, mdp: 'x', nom: 'Support', serveurs: { imap: '127.0.0.1', imapPort: 993, smtp: '127.0.0.1', smtpPort: portSmtp } }));
  vrai('⛔ un collaborateur ne connecte pas de boîte : le refus est une ERREUR qui dit pourquoi (« réservé au patron »)', /patron/.test(refusAgent || ''), refusAgent);
  jeton = TP;
  v('…et rien n\'a été rangé', await s.boites(), []);
  const refusMdp = await rejette(s.ajouterBoite({ email: BAD, mdp: 'faux', nom: 'Cassée', serveurs: { imap: '127.0.0.1', imapPort: 993, smtp: '127.0.0.1', smtpPort: portSmtp } }));
  vrai('⛔ une boîte qui refuse la connexion est REFUSÉE avec la raison du serveur (réception) — rien n\'est rangé', /IMAP/.test(refusMdp || '') && !(refusMdp || '').includes(BAD), refusMdp);
  v('…la liste reste vide', await s.boites(), []);
  const b = await s.ajouterBoite({ email: ' ' + BX.toUpperCase() + ' ', mdp: MDP, nom: 'Support', serveurs: { imap: '127.0.0.1', imapPort: 993, smtp: '127.0.0.1', smtpPort: portSmtp } });
  vrai('⛔ « Ajouter une boîte mail » connecte la boîte par la VRAIE route (SMTP et IMAP éprouvés avant tout rangement)', b && /^b[0-9a-f]{8}$/.test(b.id) && b.email === BX && b.cote === 'pro', JSON.stringify(b));
  const liste = await s.boites();
  v('…et la boîte est relue du serveur', liste.map(x => [x.id, x.email, x.nom, x.cote]), [[b.id, BX, 'Support', 'pro']]);
  vrai('…son mot de passe n\'est jamais relu du serveur', !JSON.stringify(liste).includes(MDP));

  /* lire, dossier par dossier */
  const inbox = await s.messages({ boite: b.id, dossier: 'inbox' });
  v('⛔ la Réception de CETTE boîte : quatre messages, du plus récent au plus ancien', inbox.map(m => m.objet), ['Avec HTML', 'Avis de sécurité', 'Devis signé', 'Facture mars']);
  const m1 = inbox.find(m => m.objet === 'Facture mars');
  v('un message porte ce que le module lit : expéditeur, date, lu, drapeau, dossier', [m1.de, typeof m1.date, m1.lu, m1.drapeau, m1.dossier, m1.id.startsWith(b.id + '|1|INBOX')], [{ nom: 'Anne Durand', email: 'client@exemple-2704.fr' }, 'number', false, false, 'inbox', true]);
  v('…le nombre de pièces jointes vient de la liste (leurs noms, à l\'ouverture)', inbox.find(m => m.objet === 'Devis signé').pj.length, 1);
  const autres = {}; for (const d of ['drafts', 'sent', 'archive', 'junk', 'trash']) autres[d] = (await s.messages({ boite: b.id, dossier: d })).map(m => m.objet);
  v('⛔ chaque dossier arrive de SON dossier IMAP (rôle → chemin), jamais mélangé à la Réception', autres, { drafts: ['Brouillon A'], sent: ['Votre facture'], archive: ['Archive 1'], junk: ['Gagnez'], trash: ['Jeté'] });
  const doc = await s.lire(m1.id);
  v('⛔ lire(id) rend le corps du message ouvert', doc.corps, 'Bonjour, ma facture de mars.');
  const doc2 = await s.lire(inbox.find(m => m.objet === 'Devis signé').id);
  v('…et les pièces jointes avec leur nom, leur taille lisible ET leur place (pour les télécharger)', doc2.pj, [{ id: 0, nom: 'devis.pdf', taille: '2 Ko', type: 'doc' }]);
  const docH = await s.lire(inbox.find(m => m.objet === 'Avec HTML').id);
  v('⛔ …le corps est le TEXTE du message, jamais son HTML (le module l\'écrit comme du texte)', docH.corps, 'Texte brut du message');
  vrai('…ouvrir marque le message lu CÔTÉ SERVEUR (comme une vraie messagerie)', lireEtat().boites[BX].messages.find(m => m.dossier === 'INBOX' && m.uid === 1).flags.includes('\\Seen'));

  /* écrire côté serveur */
  await s.marquer(m1.id, { lu: false, drapeau: true });
  const f1 = lireEtat().boites[BX].messages.find(m => m.dossier === 'INBOX' && m.uid === 1).flags;
  v('⛔ marquer(lu:false, drapeau:true) se lit côté serveur', [f1.includes('\\Seen'), f1.includes('\\Flagged')], [false, true]);
  const apres = (await s.messages({ boite: b.id, dossier: 'inbox' })).find(m => m.objet === 'Facture mars');
  v('…et la liste suivante le montre (la mémoire de la source est oubliée à chaque geste)', [apres.lu, apres.drapeau], [false, true]);
  await s.deplacer(m1.id, 'archive');
  v('⛔ deplacer(archive) : le message quitte la Réception et arrive dans les Archives du serveur', [(await s.messages({ boite: b.id, dossier: 'inbox' })).map(m => m.objet), (await s.messages({ boite: b.id, dossier: 'archive' })).map(m => m.objet).sort()], [['Avec HTML', 'Avis de sécurité', 'Devis signé'], ['Archive 1', 'Facture mars']]);
  const iAvis = (await s.messages({ boite: b.id, dossier: 'inbox' })).find(m => m.objet === 'Devis signé'), iHtml = (await s.messages({ boite: b.id, dossier: 'inbox' })).find(m => m.objet === 'Avec HTML');
  await s.deplacer(iAvis.id, 'junk'); await s.deplacer(iHtml.id, 'trash');
  v('⛔ deplacer(junk) et deplacer(trash) : chaque dossier reçoit le sien (Indésirables, Corbeille), pas toujours les Archives', [(await s.messages({ boite: b.id, dossier: 'junk' })).map(m => m.objet).sort(), (await s.messages({ boite: b.id, dossier: 'trash' })).map(m => m.objet).sort(), (await s.messages({ boite: b.id, dossier: 'archive' })).map(m => m.objet).sort()], [['Devis signé', 'Gagnez'], ['Avec HTML', 'Jeté'], ['Archive 1', 'Facture mars']]);
  /* Désarchiver (19 octobre 2026) : `deplacer(id, 'inbox')` ramène le message dans la Réception de SA boîte — le rôle `inbox` est celui que le serveur résout (jamais un nom deviné) */
  { const avantInbox = (await s.messages({ boite: b.id, dossier: 'inbox' })).map(m => m.objet).sort();
    const gagnez = (await s.messages({ boite: b.id, dossier: 'junk' })).find(m => m.objet === 'Gagnez');
    vrai('(population) le message à remettre existe dans les Indésirables du serveur', !!gagnez);
    await s.deplacer(gagnez.id, 'inbox');
    const reception = (await s.messages({ boite: b.id, dossier: 'inbox' })).map(m => m.objet).sort();
    v('⛔ deplacer(inbox) : le message quitte les Indésirables et réapparaît dans la Réception de SA boîte (et pas ailleurs)', [reception, (await s.messages({ boite: b.id, dossier: 'junk' })).map(m => m.objet).includes('Gagnez')], [avantInbox.concat(['Gagnez']).sort(), false]);
    const retour = (await s.messages({ boite: b.id, dossier: 'inbox' })).find(m => m.objet === 'Gagnez');
    await s.deplacer(retour.id, 'junk');   // le décor est rendu tel qu'il était
    v('…et le geste inverse (« Annuler ») le renvoie où il était', (await s.messages({ boite: b.id, dossier: 'inbox' })).map(m => m.objet).sort(), avantInbox); }
  const refusDossier = await rejette(s.deplacer(m1.id, 'flagged'));
  vrai('un dossier que le serveur ne connaît pas est refusé (rien n\'est envoyé)', /dossier inconnu/.test(refusDossier || ''), refusDossier);
  const prot = (await s.messages({ boite: b.id, dossier: 'inbox' })).find(m => m.objet === 'Avis de sécurité');
  const refusProt = await rejette(s.marquer(prot.id, { lu: true, drapeau: false }));
  vrai('⛔ l\'e-mail de sécurité n\'est ni marqué ni déplacé : le refus du serveur est une ERREUR dite (le module annule son geste)', /sécurité/.test(refusProt || ''), refusProt);
  vrai('…et il reste non lu côté serveur', !lireEtat().boites[BX].messages.find(m => m.dossier === 'INBOX' && m.messageId.includes(PROTEGE)).flags.includes('\\Seen'));

  /* envoyer */
  const avantRecus = facteurSrv.recus.length;
  const pj = new File([Buffer.from('contenu de la pièce')], 'note.txt', { type: 'text/plain' });
  await s.envoyer({ boite: b.id, de: BX, nom: 'Support', a: 'dest@exemple-2704.fr', objet: 'Réponse 2704', texte: 'Bonjour depuis la Tour', pieces: [pj] });
  const lu = facteurSrv.recus.length === avantRecus + 1 ? await require(path.join(RACINE, 'server', 'node_modules', 'mailparser')).simpleParser(facteurSrv.recus[avantRecus].replace(/\n/g, '\r\n')) : null;
  v('⛔ envoyer(): le message part par le SMTP de la boîte choisie — objet, texte, destinataire ET pièce jointe (relus par un vrai lecteur de courriel)',
    lu && [lu.subject, lu.text.trim(), lu.to.text, lu.from.value[0].address, lu.attachments.map(a => a.filename + ':' + a.content.toString())], ['Réponse 2704', 'Bonjour depuis la Tour', 'dest@exemple-2704.fr', BX, ['note.txt:contenu de la pièce']]);
  vrai('…et une copie arrive dans les Envoyés de la boîte', (await s.messages({ boite: b.id, dossier: 'sent' })).some(m => m.objet === 'Réponse 2704'));
  const refusVide = await rejette(s.envoyer({ boite: b.id, a: 'dest@exemple-2704.fr', objet: 'x', texte: '   ', pieces: [] }));
  vrai('un envoi refusé par le serveur (message vide) est une ERREUR dite, jamais un « Envoyé » silencieux', /message vide/.test(refusVide || ''), refusVide);
  const refusAdr = await rejette(s.envoyer({ boite: b.id, a: 'pas-une-adresse', objet: 'x', texte: 'texte', pieces: [] }));
  vrai('…ni une adresse invalide', /destinataire/.test(refusAdr || ''), refusAdr);


  /* ── 2 ter. v2.92 (Justin, capture) : trois boîtes de MÊME nom ; lu / drapeau / robot rendus tels quels ; une boîte SANS « Archives » (OVH) le dit ── */
  console.log('\n── 2704 · 2 ter. Trois boîtes « TEAM OP », les drapeaux IMAP, et un dossier d\'arrivée qui n\'existe pas ──');
  {
    const A1 = 'support@banc-2704.fr', A2 = 'controle@banc-2704.fr', A3 = 'contact@banc-2704.fr';
    const e0 = lireEtat(); const msg = (adr, dossier, uid, o) => Object.assign({ dossier, uid, messageId: '<t' + adr.slice(0, 3) + uid + '@banc>', from: 'personne@exemple-2704.fr', fromNom: 'Personne', to: adr, subject: 'Sujet ' + uid, text: 'Texte ' + uid, ts: T0 + uid * 1000, flags: [] }, o);
    const dossiersOVH = [{ chemin: 'INBOX' }, { chemin: 'INBOX.Sent', specialUse: '\\Sent' }, { chemin: 'INBOX.Drafts', specialUse: '\\Drafts' }, { chemin: 'INBOX.Trash', specialUse: '\\Trash' }, { chemin: 'INBOX.Junk', specialUse: '\\Junk' }];
    e0.boites[A1] = { messages: [msg(A1, 'INBOX', 1, { subject: 'Lu', flags: ['\\Seen'] }), msg(A1, 'INBOX', 2, { subject: 'Non lu' }), msg(A1, 'INBOX', 3, { subject: 'Marqué', flags: ['\\Seen', '\\Flagged'] }),
      msg(A1, 'INBOX', 4, { subject: 'Robot', from: 'noreply@teamop.fr', fromNom: 'TeamOP' })], actions: [] };
    e0.boites[A2] = { messages: [msg(A2, 'INBOX', 1, { subject: 'Pour archiver' })], actions: [] };
    e0.boites[A3] = { messages: [msg(A3, 'INBOX', 1, { subject: 'Sans archives' })], actions: [], dossiers: dossiersOVH };
    fs.writeFileSync(IMAP + '.tmp', JSON.stringify(e0)); fs.renameSync(IMAP + '.tmp', IMAP);
    const p3 = { mdp: MDP, serveurs: { imap: '127.0.0.1', imapPort: 993, smtp: '127.0.0.1', smtpPort: portSmtp } };
    const c1 = await s.ajouterBoite(Object.assign({ email: A1 }, p3)), c2 = await s.ajouterBoite(Object.assign({ email: A2 }, p3)), c3 = await s.ajouterBoite(Object.assign({ email: A3 }, p3));
    const toutes = await s.boites(), memes = toutes.filter(x => [A1, A2, A3].includes(x.email));
    v('⛔ (population) trois boîtes connectées SANS nom portent le MÊME nom d\'affichage — c\'est ce que le serveur leur donne, et ce que le module doit distinguer par l\'adresse', [memes.length, [...new Set(memes.map(x => x.nom))]], [3, ['TEAM OP']]);
    const r1 = await s.messages({ boite: c1.id, dossier: 'inbox' }), par = (o) => r1.find(m => m.objet === o);
    v('⛔ les drapeaux IMAP \\Seen et \\Flagged arrivent en `lu` et `drapeau` du contrat (ce que lisent les filtres « Non lus » et « Marqués »)',
      ['Lu', 'Non lu', 'Marqué'].map(o => [par(o).lu, par(o).drapeau]), [[true, false], [false, false], [true, true]]);
    v('…un message de robot (noreply@teamop.fr) arrive avec son expéditeur, que le tri classera en Notifications — pas en Principal', [par('Robot').de.email, par('Robot').lu], ['noreply@teamop.fr', false]);
    v('⛔ la source rend ce que le serveur a LU de l\'expéditeur : `automatique` vrai pour le robot, faux pour une personne (le tri en dépend : une personne n\'est pas une notification)', [par('Robot').automatique, par('Lu').automatique, par('Non lu').automatique], [true, false, false]);
    /* v2.93 (Justin : « go fais l'archive ») : un dossier d'arrivée qui n'existe pas est CRÉÉ par le serveur (7a835a97) — le geste n'est plus bloqué ici */
    URLS.length = 0;
    const refus = await rejette(s.deplacer((await s.messages({ boite: c3.id, dossier: 'inbox' }))[0].id, 'archive'));
    vrai('⛔ archiver dans une boîte SANS dossier « Archives » : le geste réussit (le serveur crée le dossier)', refus === null, refus);
    vrai('…le déplacement est bien demandé au serveur, avec le RÔLE (pas un nom de dossier deviné)', URLS.some(u => /mail\/deplacer/.test(u)), URLS.join(' '));
    vrai('…le message est dans le dossier créé, et la boîte porte maintenant « Archives »', lireEtat().boites[A3].messages.some(m => m.dossier === 'Archives' && m.subject === 'Sans archives') && lireEtat().boites[A3].dossiers.some(d => d.chemin === 'Archives'));
    { const e1 = lireEtat(); e1.boites[A3].messages.push(msg(A3, 'INBOX', 9, { subject: 'Pour les indésirables' })); fs.writeFileSync(IMAP + '.tmp', JSON.stringify(e1)); fs.renameSync(IMAP + '.tmp', IMAP); }
    const refusJunk = await rejette(s.deplacer((await s.messages({ boite: c3.id, dossier: 'inbox' }))[0].id, 'junk'));
    vrai('…un dossier qui existe (« INBOX.Junk », reconnu à son usage spécial) reçoit le message', refusJunk === null && lireEtat().boites[A3].messages.some(m => m.dossier === 'INBOX.Junk'), refusJunk);
    const archOK = await rejette(s.deplacer((await s.messages({ boite: c2.id, dossier: 'inbox' }))[0].id, 'archive'));
    vrai('…et une boîte qui a ses Archives archive comme avant', archOK === null && lireEtat().boites[A2].messages.some(m => m.dossier === 'Archives'), archOK);
    await s.retirerBoite(c1.id); await s.retirerBoite(c2.id); await s.retirerBoite(c3.id);   // les trois boîtes d'essai repartent : la suite du banc attend la sienne seule
  }

  /* ── 2 bis. les quatre gestes de l'ancien écran ── */
  console.log('\n── 2704 · 2 bis. Envois TeamOP, pièce reçue, suivi d\'une demande, réponse dans le fil ──');
  const ecrireEtat = (e) => { fs.writeFileSync(IMAP + '.tmp', JSON.stringify(e)); fs.renameSync(IMAP + '.tmp', IMAP); };
  const CONTENU = '%PDF-1.4 contenu de la pièce 2704 ✓', CONTENU2 = 'deuxième pièce, un autre contenu';
  { const e6 = lireEtat(); const nI = Math.max.apply(null, e6.boites[BX].messages.filter(m => m.dossier === 'INBOX').map(m => m.uid)) + 1;
    e6.boites[BX].messages.push({ dossier: 'INBOX', uid: nI, messageId: '<fil-2704@banc-2704>', from: 'client@exemple-2704.fr', fromNom: 'Client Fil', to: BX, subject: 'Question du client', text: 'Pouvez-vous me rappeler ?',
      ts: Date.now() - 60000, flags: [], pieces: [{ nom: '../../Re:pport*final?.pdf', type: 'application/pdf', b64: Buffer.from(CONTENU).toString('base64') }, { nom: 'second.txt', type: 'text/plain', b64: Buffer.from(CONTENU2).toString('base64') }] });
    ecrireEtat(e6); }
  s = S();

  /* 1. Envois TeamOP */
  const env = await s.envois();
  v('⛔ envois(): le journal du SERVEUR, du plus récent au plus ancien, avec destinataire, objet, texte, date', env.map(e => [e.a, e.objet, e.corps, e.date > 0]),
    [['neuf@exemple-2704.fr', 'Bienvenue sur OP GESTION', 'Votre espace est prêt.\n\nÀ bientôt.', true], ['rate@exemple-2704.fr', '⚠️ NON PARTI — Invitation', 'Invitation', true], ['lent@exemple-2704.fr', '⚠️ PAS ENCORE PARTI — Avis', '', true], ['jumeau@exemple-2704.fr', 'Même instant', 'x', true]]);
  v('…un envoi qui n\'est pas parti le DIT (etat), un envoi en retard aussi, les autres rien', env.map(e => e.etat), ['', 'echec', 'retard', '']);
  vrai('…chaque ligne a un identifiant UNIQUE, même pour deux envois au même instant (la sélection du module en dépend)', new Set(env.map(e => e.id)).size === env.length && env.length === 4, env.map(e => e.id));
  jeton = TA;
  vrai('…un collaborateur le lit aussi (la route est celle de l\'écran d\'avant)', (await S().envois()).length === 4);
  jeton = TP;

  /* 2. Télécharger une pièce reçue */
  const lm = (await s.messages({ boite: b.id, dossier: 'inbox' })).find(m => m.objet === 'Question du client');
  vrai('(population) le message à pièce jointe est dans la Réception', !!lm, lm);
  const dFil = await s.lire(lm.id);
  v('⛔ lire(): la pièce porte sa place (id) et son nom TEL QUE L\'EXPÉDITEUR L\'A ÉCRIT (l\'assainissement est l\'affaire du module)', dFil.pj.map(p => [p.id, p.nom, p.type]), [[0, '../../Re:pport*final?.pdf', 'doc'], [1, 'second.txt', 'doc']]);
  const blob = await s.piece(lm.id, dFil.pj[0].id);
  vrai('⛔ piece(): un Blob, et les OCTETS exacts de la pièce (relus du serveur, pas reconstitués)', typeof blob.arrayBuffer === 'function' && Buffer.from(await blob.arrayBuffer()).toString() === CONTENU, blob && blob.size);
  const blob2 = await s.piece(lm.id, dFil.pj[1].id);
  vrai('⛔ …et la SECONDE pièce est la seconde (la place de la pièce est celle que le serveur a numérotée, pas toujours la première)', Buffer.from(await blob2.arrayBuffer()).toString() === CONTENU2);
  const rPiece = await rejette(s.piece(lm.id, 7));
  vrai('⛔ une pièce qui n\'existe pas est une ERREUR dite — jamais un fichier vide', /pièce introuvable/.test(rPiece || ''), rPiece);
  const rPieceX = await rejette(s.piece(lm.id, '../1'));
  vrai('…un identifiant de pièce qui n\'est pas un nombre est refusé AVANT d\'interroger le serveur', /pièce introuvable/.test(rPieceX || ''), rPieceX);

  /* 3. Suivi d'une demande */
  v('⛔ ouvrir un message reçu OUVRE son suivi côté serveur : « à traiter », personne', dFil.suivi, { statut: 'aTraiter', assigne: '', par: '' });
  const sv1 = await s.suivi(lm.id, { statut: 'enCours', assigne: 'Léa' });
  v('⛔ suivi(): le statut ET la personne tiennent côté serveur, avec QUI a fait le geste', sv1, { statut: 'enCours', assigne: 'Léa', par: 'Patron' });
  const sv1b = (await s.messages({ boite: b.id, dossier: 'inbox' })).find(m => m.objet === 'Question du client').suivi;
  v('…la liste suivante le montre, par la MÊME source (sa mémoire est oubliée après le geste)', sv1b, { statut: 'enCours', assigne: 'Léa', par: '' });
  const sv2 = await s.suivi(lm.id, { statut: 'resolu' });
  v('…changer le statut seul ne touche pas à la personne', [sv2.statut, sv2.assigne], ['resolu', 'Léa']);
  const sv3 = await s.suivi(lm.id, { statut: 'nimporte-quoi' });
  v('⛔ un statut inventé ne change RIEN (le serveur ne connaît que trois états)', sv3.statut, 'resolu');
  const sv4 = await s.suivi(lm.id, { assigne: '' });
  v('…et on peut retirer la personne', [sv4.statut, sv4.assigne], ['resolu', '']);
  jeton = TA;
  v('…un collaborateur le fait aussi, et la trace dit QUI', (await S().suivi(lm.id, { statut: 'aTraiter' })).par, 'Agent');
  jeton = TP;
  const rSv = await rejette(S().suivi('b00000000|1|INBOX', { statut: 'resolu' }));
  vrai('⛔ le suivi d\'un message que le serveur ne connaît pas est une ERREUR dite', /introuvable/.test(rSv || ''), rSv);
  const pj0 = (await s.messages({ boite: b.id, dossier: 'inbox' })).find(m => m.objet === 'Avis de sécurité');
  vrai('…un message jamais ouvert n\'a PAS de suivi (null, pas un faux « à traiter »)', pj0.suivi === null, pj0.suivi);

  /* 4. Répondre dans le fil */
  const avantFil = facteurSrv.recus.length;
  await s.envoyer({ boite: b.id, de: BX, nom: 'Support', a: 'client@exemple-2704.fr', objet: 'Re: Question du client', texte: 'Je vous rappelle demain.', pieces: [], enReponseA: lm.id });
  const lFil = facteurSrv.recus.length === avantFil + 1 ? await require(path.join(RACINE, 'server', 'node_modules', 'mailparser')).simpleParser(facteurSrv.recus[avantFil].replace(/\n/g, '\r\n')) : null;
  v('⛔ envoyer({enReponseA}): le message part avec In-Reply-To ET References sur le Message-ID du message auquel on répond — le fil se reforme chez le destinataire', lFil && [lFil.inReplyTo, [].concat(lFil.references)], ['<fil-2704@banc-2704>', ['<fil-2704@banc-2704>']]);
  const orig = lireEtat().boites[BX].messages.find(m => m.messageId === '<fil-2704@banc-2704>');
  vrai('…le message d\'origine passe en « répondu » côté serveur', orig.flags.includes('\\Answered'), orig.flags);
  v('…et son suivi passe « en cours », confié à qui a répondu (le serveur le fait, la liste le relit)', (({ statut, assigne }) => ({ statut, assigne }))((await S().messages({ boite: b.id, dossier: 'inbox' })).find(m => m.objet === 'Question du client').suivi), { statut: 'enCours', assigne: 'Patron' });
  const avantSans = facteurSrv.recus.length;
  await s.envoyer({ boite: b.id, de: BX, nom: 'Support', a: 'client@exemple-2704.fr', objet: 'Nouveau sujet', texte: 'Sans fil.', pieces: [] });
  const lSans = await require(path.join(RACINE, 'server', 'node_modules', 'mailparser')).simpleParser(facteurSrv.recus[avantSans].replace(/\n/g, '\r\n'));
  vrai('⛔ un NOUVEAU message ne référence rien (pas d\'In-Reply-To inventé)', !lSans.inReplyTo && !lSans.references, [lSans.inReplyTo, lSans.references]);
  /* répondre depuis une AUTRE boîte : le fil se reforme (Message-ID), mais le message d'origine n'est pas marqué « répondu » dans une boîte qui n'est pas la sienne */
  /* la boîte voisine porte, au MÊME numéro et dans le MÊME dossier, un message qui n'a rien à voir : si l'envoi lui passait la place du message d'origine, c'est LUI qui serait marqué */
  { const e7 = lireEtat(); const uidLm = parseInt(lm.id.split('|')[1], 10);
    e7.boites[B2] = { messages: [{ dossier: 'INBOX', uid: uidLm, messageId: '<voisin-2704@banc-2704>', from: 'autre@exemple-2704.fr', to: B2, subject: 'Sans rapport', text: 'x', ts: Date.now() - 90000, flags: [] }], actions: [] }; ecrireEtat(e7); }
  const bAutre = await S().ajouterBoite({ email: B2, mdp: MDP, nom: 'Autre', serveurs: { imap: '127.0.0.1', imapPort: 993, smtp: '127.0.0.1', smtpPort: portSmtp } });
  { const e8 = lireEtat(); e8.boites[BX].messages.find(m => m.messageId === '<fil-2704@banc-2704>').flags = e8.boites[BX].messages.find(m => m.messageId === '<fil-2704@banc-2704>').flags.filter(f => f !== '\\Answered'); ecrireEtat(e8); }
  const avantAutre = facteurSrv.recus.length;
  await S().envoyer({ boite: bAutre.id, de: B2, nom: 'Autre', a: 'client@exemple-2704.fr', objet: 'Re: Question du client', texte: 'Depuis une autre boîte.', pieces: [], enReponseA: lm.id });
  const lAutre = await require(path.join(RACINE, 'server', 'node_modules', 'mailparser')).simpleParser(facteurSrv.recus[avantAutre].replace(/\n/g, '\r\n'));
  vrai('⛔ …depuis une AUTRE boîte : le fil se reforme quand même', lAutre.inReplyTo === '<fil-2704@banc-2704>', lAutre.inReplyTo);
  vrai('…et le message d\'origine n\'est PAS marqué « répondu » (ce n\'est pas sa boîte qui a répondu, et son dossier n\'est pas celui de l\'autre)', !lireEtat().boites[BX].messages.find(m => m.messageId === '<fil-2704@banc-2704>').flags.includes('\\Answered'));
  vrai('…ni le message du MÊME numéro de l\'autre boîte', !lireEtat().boites[B2].messages[0].flags.includes('\\Answered'), lireEtat().boites[B2].messages[0].flags);
  await S().retirerBoite(bAutre.id);
  const rFil = await rejette(S().envoyer({ boite: b.id, a: 'client@exemple-2704.fr', objet: 'x', texte: 'texte', pieces: [], enReponseA: 'b00000000|1|INBOX' }));
  vrai('⛔ répondre à un message que le serveur ne retrouve pas est une ERREUR dite — le message ne part pas sans son fil', /introuvable/.test(rFil || '') && facteurSrv.recus.length === avantAutre + 1, rFil);

  /* ── 3. LE REFUS EST UNE PANNE ── */
  console.log('\n── 2704 · 3. Un refus est une panne, jamais une liste vide ──');
  const e0 = deconnexions; jeton = 'a'.repeat(48);
  const r401 = await rejette(s.boites());
  vrai('⛔ une session expirée (401) est une ERREUR, et ramène à la connexion (doLogout)', /expirée/.test(r401 || '') && deconnexions === e0 + 1, r401);
  jeton = '';
  const rAnon = await rejette(S().messages({ boite: b.id, dossier: 'sent' }));
  vrai('⛔ sans session, lire un dossier est une ERREUR (jamais « Rien dans ce dossier »)', rAnon !== null, rAnon);
  const rEnv = await rejette(S().envois());
  vrai('⛔ sans session, le journal des envois est une ERREUR (jamais « aucun e-mail envoyé »)', rEnv !== null, rEnv);
  const rPie = await rejette(S().piece(lm.id, 0));
  vrai('⛔ …et la pièce reçue aussi (jamais un fichier vide)', rPie !== null, rPie);
  jeton = TP;
  /* une boîte qui ne répond pas */
  const boitesEtat = JSON.parse(fs.readFileSync(path.join(D, 'mail-boites.json'), 'utf8'));
  vrai('(population) la boîte connectée est rangée côté serveur (avec son mot de passe, chiffrement ou non, jamais renvoyé)', boitesEtat.length === 1 && boitesEtat[0].email === BX);
  const e2 = lireEtat(); e2.pannes[BX] = 'Connection refused pour ' + BX; fs.writeFileSync(IMAP + '.tmp', JSON.stringify(e2)); fs.renameSync(IMAP + '.tmp', IMAP);
  s = S();
  const rPanne = await rejette(s.messages({ boite: b.id, dossier: 'inbox' }));
  vrai('⛔ une boîte qui ne répond pas (IMAP refusé) est une ERREUR qui le dit — pas une Réception vide', rPanne !== null && /ne répond pas|injoignable|Connection/.test(rPanne) && !rPanne.includes(BX), rPanne);
  /* une SECONDE boîte, connectée puis jamais lue, qui tombe en panne : le serveur n'a rien en mémoire de ses dossiers, il dit `erreur` — « on ne sait pas où est son dossier Envoyés » n'est pas « elle n'a pas de dossier Envoyés » */
  const e4 = lireEtat(); e4.boites[B2] = { messages: [], actions: [] }; fs.writeFileSync(IMAP + '.tmp', JSON.stringify(e4)); fs.renameSync(IMAP + '.tmp', IMAP);
  const b2 = await S().ajouterBoite({ email: B2, mdp: MDP, nom: 'Froide', serveurs: { imap: '127.0.0.1', imapPort: 993, smtp: '127.0.0.1', smtpPort: portSmtp } });
  const e5 = lireEtat(); e5.pannes[B2] = 'Connection refused pour ' + B2; fs.writeFileSync(IMAP + '.tmp', JSON.stringify(e5)); fs.renameSync(IMAP + '.tmp', IMAP);
  const rPanneEnv = await rejette(S().messages({ boite: b2.id, dossier: 'sent' }));
  vrai('⛔ …et pas davantage un dossier Envoyés VIDE : la même panne, dite (la boîte qu\'on n\'a jamais pu lire n\'a pas « zéro dossier »)', rPanneEnv !== null && /ne répond pas/.test(rPanneEnv) && !rPanneEnv.includes(B2), rPanneEnv);
  await S().retirerBoite(b2.id);
  const e3 = lireEtat(); delete e3.pannes[BX]; fs.writeFileSync(IMAP + '.tmp', JSON.stringify(e3)); fs.renameSync(IMAP + '.tmp', IMAP);
  const rInconnue = await rejette(S().messages({ boite: 'b00000000', dossier: 'inbox' }));
  vrai('une boîte que le serveur ne connaît pas est une erreur', /introuvable/.test(rInconnue || ''), rInconnue);

  /* retirer, puis le serveur éteint */
  await S().retirerBoite(b.id);
  v('⛔ retirerBoite : la boîte quitte le serveur — on repart vide', await S().boites(), []);
  const avantEtats = etats.length;
  enfant.kill('SIGKILL'); await dormir(400);
  const rEteint = await rejette(S().boites());
  vrai('⛔ le serveur éteint est une ERREUR (« injoignable »), et la pastille du serveur le sait', /injoignable/.test(rEteint || '') && etats.slice(avantEtats).includes(false), rEteint);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc interrompu : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
