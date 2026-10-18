/* ⛔ CE QUE CE FICHIER GARDE — OP COURRIER REMPLACE LA « BOÎTE MAIL » D'OP GESTION, EN BÊTA SEULEMENT (18 octobre 2026).

   Justin : « je veux que ça remplace Mail, qui est actuel dans OP GESTION et dans la Tour […] tu remplaces tous les systèmes de mail qu'on avait créés par celui-là » ;
   puis : « quand tu l'intègres dans les applications c'est VIDE, les gens doivent se connecter à leur mail ». `app.html` part un jour en public : la nouvelle vue n'y est prise QUE si
   `BETA_ESSAI` est vrai ; sinon la vue d'avant reste telle qu'elle était. Et l'ADAPTATEUR `courrierSource()` — la pièce qui branche le module `opcourrier.js` sur les VRAIES routes du
   serveur — est joué ici, la VRAIE fonction de la page contre le VRAI serveur (CLAUDE.md : « dès qu'app.html appelle une route neuve, un banc doit faire parler la vraie fonction de la
   page au vrai serveur » — les deux moitiés se lisent très bien séparément, et c'est dans leur couture que naissent les pires défauts).
     0. le TEXTE : la porte `BETA_ESSAI`, la vue d'avant inchangée (empreinte), le module chargé à la demande (jamais au démarrage), la clé de stockage vidée en quittant l'entreprise,
        aucune donnée d'exemple, aucune boîte reprise en silence ;
     1. la porte, EXÉCUTÉE : `BETA_ESSAI` faux → la vue d'avant ; vrai → `courrierVue` ;
     2. l'adaptateur contre le VRAI serveur, isolé, parlé en HTTP, avec un facteur SMTP de banc : les boîtes, la réception (celle de CETTE entreprise seulement), l'envoi par la boîte
        connectée (pièce jointe comprise), le retrait d'une boîte ;
     3. ⛔ LES TROIS ÉTATS : un refus du serveur (403, `text/plain`) est une PANNE qui se dit — l'adaptateur REJETTE, il ne rend jamais une liste vide qui dirait « Aucune boîte connectée »
        (la leçon de `_mailboxes` / `_mailReplies`, 11 septembre 2026) ; un échec d'envoi, de connexion, se dit avec les mots du serveur ;
     4. ce que le serveur d'aujourd'hui ne sait pas faire est DÉCLARÉ (`capacites()` : rien d'OAuth, de programmé, de signé…), pour que le module le dise « Bientôt ».
   Le comportement dans la page (la vue, le menu, le jour et la nuit, 390 px et bureau, la feuille au-dessus de la barre) est gardé par `scratchpad/courrier/sonde-gestion.js`.
   Aucun appel hors de 127.0.0.1. Les parties exécutées sont SAUTÉES (dit) si server/node_modules manque. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os'), vm = require('vm');
const { spawn } = require('child_process');
let ok = 0, ko = 0;
process.on('uncaughtException', (e) => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e).toString().split('\n').slice(0, 4).join(' | ')); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const RACINE = path.join(__dirname, '..');
const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const BETA = fs.readFileSync(path.join(RACINE, 'beta.html'), 'utf8');
const sha = (t) => crypto.createHash('sha256').update(t).digest('hex');
const sansComm = (t) => t.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function entre(src, debut, fin) { const i = src.indexOf(debut), j = i < 0 ? -1 : src.indexOf(fin, i + debut.length); vrai('(tranche trouvée) ' + debut.slice(0, 48).replace(/\n/g, '↵'), i >= 0 && j > i && j - i > 20); return i >= 0 && j > i ? src.slice(i, j) : ''; }
/* une fonction de la page, par son nom, découpée à l'accolade */
function fonction(src, nom) {
  const d0 = src.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  let p = 0;
  for (let k = src.indexOf('{', d0); k < src.length; k++) { if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (!p) return src.slice(d0, k + 1); } }
  return '';
}

/* ═════════════════════════════ 0. LE TEXTE ═════════════════════════════ */
console.log('0. Le texte : la porte, la vue d\'avant, le chargement à la demande');
const VUE = entre(APP, 'views.boiteMail=function(){\n', '\n};\n');
const PORTE = /^  if\(BETA_ESSAI\) return courrierVue\(\);[^\n]*\n/m;
vrai('⛔ la PREMIÈRE instruction de la vue est la porte : `if(BETA_ESSAI) return courrierVue();` (une garde se contrôle en première instruction, pas « avant toute écriture »)', PORTE.test(VUE) && VUE.indexOf('if(BETA_ESSAI)') === VUE.indexOf('\n') + 1 + 2);
const AVANT = 'views.boiteMail=function(){\n' + VUE.slice('views.boiteMail=function(){\n'.length).replace(PORTE, '');
/* l'empreinte de la vue d'AVANT (app.html d'avant le chantier, 535ccf91) : un octet de plus ou de moins, et la production n'a plus « la vue d'avant » */
v('⛔ EN PRODUCTION (BETA_ESSAI faux) la vue d\'avant est INTACTE : son texte, la porte retirée, a l\'empreinte de l\'ancienne (' + AVANT.length + ' signes)', sha(AVANT), '12055739da3b194db468a36cc21dec3e939911e14e54caaf2dafe707c05ca129');
v('…et ses deux lecteurs (`loadMailboxes`, `loadMailReplies`, les trois états) n\'ont pas bougé', [sha(entre(APP, 'async function loadMailboxes(){', '\n/* _mailChargeEnCours')), sha(entre(APP, 'async function loadMailReplies(){', '\nfunction _mailLus()'))],
  ['854b87aea2e87e5a62823f83a09723088f5b8c547ecc77c56ce720e948a9ec82', '77dc58117519d2624c0ba9fcd0bb94985e85ed837af03a73a320811b2e2d6073']);
vrai('app.html est la version PUBLIQUE (BETA_ESSAI=false), beta.html la bêta (BETA_ESSAI=true) : le drapeau est la seule différence qui compte', /const BETA_ESSAI=false;/.test(APP) && /const BETA_ESSAI=true;/.test(BETA) && /function courrierVue\(\)/.test(BETA));
const CODE = sansComm(APP);
v('⛔ opcourrier.js n\'est chargé qu\'à l\'OUVERTURE de la vue : aucune balise <script src="opcourrier.js"> dans les pages, une seule création de script (courrierCharger)', [/<script[^>]*src="[^"]*opcourrier/.test(APP), /<script[^>]*src="[^"]*opcourrier/.test(BETA), (CODE.match(/opcourrier\.js\?v=/g) || []).length], [false, false, 1]);
const CHARGER = fonction(APP, 'courrierCharger');
vrai('…avec la version de l\'application (le cache ne ressert pas un module périmé) et sans toucher au service worker', /s\.src='opcourrier\.js\?v='\+encodeURIComponent\(APP_VERSION\)/.test(CHARGER) && !/opcourrier/.test(fs.readFileSync(path.join(RACINE, 'sw.js'), 'utf8')));
const VUE_C = fonction(APP, 'courrierVue');
vrai('la vue monte le module côté Pro seulement (OP GESTION est un outil d\'entreprise), à la clé « <préfixe>_courrier »', /cotes:\['pro'\]/.test(VUE_C) && /cleStockage:STORE_KEY\.split\('_'\)\[0\]\+'_courrier'/.test(VUE_C));
vrai('…décide le thème comme OP GESTION (data-theme de <html> : dark → nuit, light → jour, sinon l\'appareil)', /document\.documentElement\.getAttribute\('data-theme'\)/.test(VUE_C) && /t==='dark'\?'nuit':t==='light'\?'jour':null/.test(VUE_C));
vrai('…ne reconstruit pas le module sur un rafraîchissement automatique de la rubrique (il perdrait la lecture en cours)', /if\(vivant&&_courrierInst&&vivant\.isConnected\)\{ courrierAjuster\(\); return; \}/.test(VUE_C));
vrai('⛔ en quittant l\'entreprise, la clé du module est vidée (des mails écrits ne restent pas sur un appareil rendu)', /'espace_admin','courrier'\]/.test(APP) && /const P=STORE_KEY\.split\('_'\)\[0\]\+'_';/.test(fonction(APP, 'espaceQuitter')));
const SRC_A = fonction(APP, 'courrierSource');
vrai('(tranche trouvée) l\'adaptateur courrierSource', SRC_A.length > 1500);
v('l\'adaptateur n\'appelle que les routes de la boîte mail d\'aujourd\'hui (et aucune nouvelle côté serveur)', Array.from(new Set(Array.from(SRC_A.matchAll(/\/api\/[a-z/]+/g)).map(m => m[0]))).sort(), ['/api/mailbox/connect', '/api/mailbox/disconnect', '/api/mailboxes', '/api/replies', '/api/sendmail']);
v('⛔ il lit le CODE avant le corps d\'un refus (`!r.ok` avant `r.json()`), toutes ses lectures', (SRC_A.match(/if\(!r\.ok\) throw await refus\(r,/g) || []).length, 4);
vrai('il ne se rabat JAMAIS sur un brouillon mailto: ni sur la plateforme (un envoi qui échoue se dit, il ne part pas ailleurs)', !/mailto:/.test(SRC_A) && !/brand:/.test(SRC_A) && !/srvMail\(/.test(SRC_A));
const sentinelles = (() => { const sb = { window: {}, localStorage: { getItem: () => null, setItem() {} }, setTimeout: () => 0 }; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(RACINE, 'scratchpad/courrier/source-demo.js'), 'utf8'), sb);
  const s = new Set(); sb.window.OPCourrierDemo.messages.forEach(m => { if (m.de && m.de.email) s.add(m.de.email); if (m.objet && m.objet.length > 14) s.add(m.objet); }); sb.window.OPCourrierDemo.boites.forEach(b => s.add(b.email)); return Array.from(s); })();
vrai('(population) la source de démonstration porte plus de quarante sentinelles (' + sentinelles.length + ')', sentinelles.length > 40);
v('⛔ AUCUNE donnée d\'exemple dans app.html ni dans beta.html — la personne CONNECTE sa boîte, rien n\'est repris en silence', sentinelles.filter(s => APP.includes(s) || BETA.includes(s)).slice(0, 4), []);

/* ═════════════════════════════ 1. LA PORTE, EXÉCUTÉE ═════════════════════════════ */
console.log('\n1. La porte, exécutée');
{ const ligne = PORTE.exec(VUE);
  const porte = (drapeau) => { const appels = []; const f = new Function('BETA_ESSAI', 'courrierVue', 'return (function(){\n' + ligne[0] + '  return "ancienne";\n})();'); const r = f(drapeau, () => { appels.push(1); return 'courrier'; }); return [r, appels.length]; };
  v('BETA_ESSAI faux : la vue d\'avant s\'exécute, `courrierVue` n\'est JAMAIS appelée', porte(false), ['ancienne', 0]);
  v('BETA_ESSAI vrai : `courrierVue` prend la main, la vue d\'avant ne s\'exécute pas', porte(true), ['courrier', 1]); }

/* ═════════════════════════════ 2 à 4. L'ADAPTATEUR CONTRE LE VRAI SERVEUR ═════════════════════════════ */
const banc = path.join(os.tmpdir(), 'teamop-test-2703-' + process.pid);
let enfant = null, facteurSrv = null;
function stop() { try { if (enfant && enfant.pid) process.kill(enfant.pid); } catch (e) {} try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} }
/* le facteur du banc (celui de test-832, réduit) : ce que le serveur envoie, on le lit */
function facteur() {
  const f = { recus: [] };
  f.s = require('net').createServer(c => {
    c.on('error', () => {}); let tampon = '', corps = false, msg = ''; c.write('220 banc\r\n');
    c.on('data', d => { tampon += d.toString('utf8'); let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) { const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; f.recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n'); else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); } else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); } else c.write('250 ok\r\n'); } }); });
  return f;
}
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('\n  … parties exécutées SAUTÉES : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const CLE_A = 'CLE-PRIVEE-DE-A-2026-COURRIER', CLE_B = 'CLE-PRIVEE-DE-B-2026-COURRIER';
  const kh = k => crypto.createHash('sha256').update(k).digest('hex'), b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({
    'entreprise-a': { slug: 'entreprise-a', nom: 'A', email: 'a@exemple.fr', t: 'ent-a-9x', code: b64({ t: 'ent-a-9x', k: CLE_A }), ts: 1 },
    'entreprise-b': { slug: 'entreprise-b', nom: 'B', email: 'b@exemple.fr', t: 'ent-b-7y', code: b64({ t: 'ent-b-7y', k: CLE_B }), ts: 2 } }));
  const T = Date.now();
  fs.writeFileSync(path.join(banc, 'data', 'replies.jsonl'), [
    { ts: T - 1000, teamId: 'ent-a-9x', boite: 'a@exemple.fr', from: 'client@dehors.fr', fromName: 'Cliente Dehors', subject: 'Devis urgent', text: 'Bonjour, voici ma demande de devis pour la semaine prochaine.', mid: 'mid-1' },
    { ts: T - 2000, teamId: 'ent-a-9x', boite: '', from: 'sansboite@dehors.fr', fromName: 'Sans Boîte', subject: 'Réponse à un bon de commande', text: 'Reçu sans boîte nommée.', mid: 'mid-2', bonNum: 'BC-2026-001' },
    { ts: T - 3000, teamId: 'ent-a-9x', boite: 'a@exemple.fr', from: 'ancien@dehors.fr', fromName: 'Ancien', subject: 'Un vieux message importé', text: 'Historique.', mid: 'mid-3', histo: 1 },
    { ts: T - 4000, teamId: 'ent-b-7y', boite: 'b@exemple.fr', from: 'autre@dehors.fr', fromName: 'Autre Entreprise', subject: 'FACTURE-DE-B-QZX', text: 'Confidentiel de B.', mid: 'mid-4' }
  ].map(x => JSON.stringify(x)).join('\n') + '\n');
  fs.writeFileSync(path.join(banc, 'data', 'mailboxes.json'), JSON.stringify({
    mb1: { id: 'mb1', teamId: 'ent-a-9x', email: 'a@exemple.fr', pass: 'secret-A', name: 'Boîte A', imapHost: '127.0.0.1', imapPort: 1, smtpHost: '127.0.0.1', smtpPort: portSmtp },
    mb2: { id: 'mb2', teamId: 'ent-a-9x', email: 'a2@exemple.fr', pass: 'secret-A2', name: 'Seconde A', imapHost: '127.0.0.1', imapPort: 1, smtpHost: '127.0.0.1', smtpPort: portSmtp },
    mbB: { id: 'mbB', teamId: 'ent-b-7y', email: 'b@exemple.fr', pass: 'secret-B', name: 'Boîte B', imapHost: '127.0.0.1', imapPort: 1, smtpHost: '127.0.0.1', smtpPort: portSmtp } }));
  const PORT = 8100 + (process.pid % 800);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT) }), stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 60; i++) { try { await fetch(B + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }

  /* la VRAIE fonction de la page : ses dépendances (l'adresse du serveur, l'équipe, l'en-tête de preuve) sont celles de la page, fournies ; `fetch` est le vrai, espionné */
  let cle = CLE_A; const requetes = [];
  const espion = (u, o) => { requetes.push((o && o.method || 'GET') + ' ' + new URL(u).pathname); return fetch(u, o); };
  const sb = { PUSH_API: B, syncTeam: () => 'ent-a-9x', enteteEquipe: async (base) => Object.assign({}, base || {}, cle ? { 'x-teamop-kh': kh(cle) } : {}), mailBrandName: () => 'Entreprise A', fetch: espion, _courrierRep: null,
    Date, JSON, Promise, Array, String, Uint8Array, btoa, encodeURIComponent, Error, URL };
  vm.createContext(sb);
  vm.runInContext(SRC_A + '\n;this.source = courrierSource();', sb);
  const S = sb.source;
  const rejet = async (p) => { try { const r = await p; return { rejete: false, valeur: r }; } catch (e) { return { rejete: true, message: String(e && e.message) }; } };
  const fichier = (nom, octets) => ({ name: nom, arrayBuffer: async () => octets.buffer.slice(octets.byteOffset, octets.byteOffset + octets.byteLength) });

  try {
    console.log('\n2. L\'adaptateur contre le vrai serveur');
    const caps = await S.capacites();
    v('capacites() : ce que le serveur d\'aujourd\'hui NE sait PAS faire est déclaré faux (le module le dit « Bientôt »)', ['oauth', 'programmeServeur', 'signature', 'marquage', 'deplacement', 'reglagesServeur', 'simulation'].map(k => caps[k]), [false, false, false, false, false, false, false]);
    v('capacites() : seule la réception est remplie, un destinataire, trois pièces jointes de 4 Mo (les limites de /api/sendmail)', [caps.dossiers, caps.destinataires, caps.pj], [['inbox'], 1, { nombre: 3, octets: 4 * 1024 * 1024 }]);
    const bx = await S.boites();
    v('boites() : les boîtes de CETTE entreprise seulement (pas celle de B), côté Pro, sans mot de passe', [bx.map(b => b.id), bx.map(b => b.email), bx.map(b => b.cote), JSON.stringify(bx).includes('secret')], [['mb1', 'mb2'], ['a@exemple.fr', 'a2@exemple.fr'], ['pro', 'pro'], false]);
    requetes.length = 0;
    const [m1, m2] = await Promise.all([S.messages({ boite: 'mb1', dossier: 'inbox' }), S.messages({ boite: 'mb2', dossier: 'inbox' })]);
    v('messages() : UNE seule lecture de /api/replies pour toutes les boîtes d\'un même relevé', requetes.filter(r => r === 'GET /api/replies').length, 1);
    v('messages() : la réception de la boîte, les trois messages de CETTE entreprise dont celui « sans boîte nommée » (rangé dans la première), jamais ceux de B', [m1.map(x => x.id).sort(), JSON.stringify(m1).includes('FACTURE-DE-B-QZX') || JSON.stringify(m2).includes('FACTURE-DE-B-QZX')], [['mid-1', 'mid-2', 'mid-3'], false]);
    v('messages() : une boîte sans courrier nommé ne reçoit rien (la seconde boîte n\'hérite pas des messages de la première)', m2.length, 0);
    const x1 = m1.find(x => x.id === 'mid-1');
    v('messages() : un message est traduit — expéditeur (nom et adresse), objet, texte, date', [x1.de, x1.objet, /demande de devis/.test(x1.corps), typeof x1.date, x1.lu], [{ nom: 'Cliente Dehors', email: 'client@dehors.fr' }, 'Devis urgent', true, 'number', false]);
    v('messages() : un message importé de l\'HISTORIQUE est marqué « ancien » (le module ne l\'annonce jamais comme nouveau)', m1.find(x => x.id === 'mid-3').ancien, true);
    v('messages() : tout autre dossier que la réception est vide (le serveur ne le sait pas)', (await S.messages({ boite: 'mb1', dossier: 'sent' })).length, 0);

    console.log('\n3. Les trois états : un refus est une PANNE qui se dit');
    cle = CLE_B;   // la clé d'une AUTRE entreprise : le serveur refuse (403, text/plain)
    sb._courrierRep = null;
    let r = await rejet(S.boites());
    vrai('boites() avec une mauvaise clé : l\'adaptateur REJETTE (il ne rend pas []), avec les mots du serveur — « ' + r.message + ' »', r.rejete && /refus|accès|clé|preuve/i.test(r.message));
    r = await rejet(S.messages({ boite: 'mb1', dossier: 'inbox' }));
    vrai('messages() avec une mauvaise clé : REJET, pas « Aucun message »', r.rejete);
    cle = '';
    r = await rejet(S.boites());
    vrai('boites() sans aucune preuve : REJET', r.rejete);
    const brut = await fetch(B + '/api/mailboxes?teamId=ent-a-9x'); const txt = await brut.text(); let json = true; try { JSON.parse(txt); } catch (e) { json = false; }
    v('(population) le refus du serveur n\'est PAS du JSON (text/plain) : `r.json()` jetterait — c\'est pourquoi on lit le code d\'abord', [brut.status, json], [403, false]);
    cle = CLE_A;
    vrai('la bonne clé rouvre l\'accès (la contre-épreuve : la panne n\'était pas dans l\'adaptateur)', (await S.boites()).length === 2);

    console.log('\n4. Envoi, connexion, retrait');
    await S.envoyer({ boite: 'mb1', de: 'a@exemple.fr', nom: 'Boîte A', a: 'Cliente Dehors <client@dehors.fr>', objet: 'Votre devis est prêt', texte: 'Bonjour,\n\nLe devis est en pièce jointe.\n\nCordialement', pieces: [fichier('devis.pdf', Buffer.from('%PDF-1.4 contenu-du-devis-QZX'))] });
    const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
    const recu = facteurSrv.recus[facteurSrv.recus.length - 1] || '';
    vrai('envoi : le facteur reçoit UN courriel, de la boîte connectée, au seul destinataire (l\'adresse sort de « Nom <adresse> »)', facteurSrv.recus.length === 1 && /^From: .*a@exemple\.fr/m.test(recu) && /^To: .*client@dehors\.fr/m.test(recu) && !/Cliente Dehors <client@dehors\.fr> <client/.test(recu));
    const sujet = (m) => { const x = /^Subject: (.*(?:\n[ \t].*)*)/m.exec(String(m || '')); if (!x) return ''; return Buffer.from(x[1].replace(/\n[ \t]/g, ' ').replace(/=\?UTF-8\?Q\?(.*?)\?=\s*/gi, (_, q) => q.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (__, h) => String.fromCharCode(parseInt(h, 16))))
      .replace(/=\?UTF-8\?B\?(.*?)\?=\s*/gi, (_, b) => Buffer.from(b, 'base64').toString('latin1')), 'latin1').toString('utf8'); };
    v('envoi : l\'objet arrive', sujet(recu), 'Votre devis est prêt');
    vrai('envoi : le texte du message arrive', /Le devis est en pi[eè]ce jointe/.test(lisible(recu)));
    const b64Pj = Buffer.from('%PDF-1.4 contenu-du-devis-QZX').toString('base64');
    vrai('envoi : la pièce jointe arrive, octet pour octet (base64 de la page → pièce du courriel)', /filename="?devis\.pdf/.test(recu) && recu.replace(/\s+/g, '').includes(b64Pj));
    r = await rejet(S.envoyer({ boite: 'mb1', de: 'a@exemple.fr', nom: 'x', a: 'pas-une-adresse', objet: 'x', texte: 'x', pieces: [] }));
    vrai('envoi refusé (destinataire invalide) : REJET avec les mots du serveur — « ' + r.message + ' »', r.rejete && /destinataire/.test(r.message));
    r = await rejet(S.envoyer({ boite: 'mb-inconnue', de: 'x', nom: 'x', a: 'client@dehors.fr', objet: 'x', texte: 'x', pieces: [] }));
    vrai('envoi par une boîte inconnue : REJET (il ne part pas par la plateforme à la place, au nom d\'une autre adresse) — « ' + r.message + ' »', r.rejete && facteurSrv.recus.length === 1);
    requetes.length = 0;
    r = await rejet(S.ajouterBoite({ email: 'pas-une-adresse', mdp: 'x', nom: 'N' }));
    vrai('connexion refusée par le serveur : REJET avec SES mots — « ' + r.message + ' »', r.rejete && /adresse invalide/.test(r.message));
    requetes.length = 0;
    r = await rejet(S.ajouterBoite({ email: 'paul@hotmail.fr', mdp: 'x', nom: 'Paul' }));
    vrai('Microsoft (Hotmail / Outlook) : refusé AVANT tout appel (le serveur de Microsoft refuse les mots de passe) — « ' + r.message + ' »', r.rejete && /Microsoft/.test(r.message) && requetes.length === 0);
    /* ce que la page envoie pour connecter : on le lit par un fetch espion (la connexion réelle exige un vrai serveur IMAP/SMTP) */
    { const pris = []; const sb2 = Object.assign({}, sb, { fetch: async (u, o) => { pris.push([new URL(u).pathname, JSON.parse(o.body), o.headers]); return { ok: true, status: 200, json: async () => ({ ok: true, id: 'mbN', email: 'neuf@exemple.fr' }) }; } }); vm.createContext(sb2);
      vm.runInContext(SRC_A + '\n;this.source = courrierSource();', sb2);
      const neuf = await sb2.source.ajouterBoite({ email: ' neuf@exemple.fr ', mdp: 'mot-de-passe', nom: 'Neuf' });
      v('connexion : POST /api/mailbox/connect { teamId, email, pass, name } avec la preuve de la clé — jamais le mot de passe ailleurs', [pris[0][0], pris[0][1], Object.keys(pris[0][2]).sort()], ['/api/mailbox/connect', { teamId: 'ent-a-9x', email: 'neuf@exemple.fr', pass: 'mot-de-passe', name: 'Neuf' }, ['Content-Type', 'x-teamop-kh']]);
      v('connexion réussie : la boîte revient (côté Pro) et le module sait que l\'historique arrive APRÈS (importEnCours)', [neuf.id, neuf.cote, neuf.importEnCours], ['mbN', 'pro', true]); }
    await S.retirerBoite('mb1');
    const reste = await S.boites();
    v('retrait : la boîte disparaît du serveur (et la liste rendue est alors VRAIMENT vide d\'elle : un tableau lu, pas un échec)', [reste.map(b => b.id), JSON.parse(fs.readFileSync(path.join(banc, 'data', 'mailboxes.json'), 'utf8')).mbB.teamId], [['mb2'], 'ent-b-7y']);
    /* ⚠️ le serveur d'aujourd'hui n'EXIGE la preuve de clé que pour /api/replies et /api/mailboxes ; connect, disconnect et sendmail ne l'OBSERVENT que (cleEquipeObserve) —
       c'est SON état, hors de ce chantier (aucune route neuve, `server/` intact). L'adaptateur, lui, présente la preuve partout : le jour où le serveur l'exigera, rien ne casse. */
    { const entetes = []; const sb3 = Object.assign({}, sb, { fetch: async (u, o) => { entetes.push([new URL(u).pathname, o && o.headers && o.headers['x-teamop-kh']]); return { ok: true, status: 200, json: async () => ({ ok: true }) }; } }); vm.createContext(sb3);
      vm.runInContext(SRC_A + '\n;this.source = courrierSource();', sb3);
      await sb3.source.retirerBoite('mbX'); await sb3.source.envoyer({ boite: 'mbX', a: 'a@b.fr', objet: 'o', texte: 't', pieces: [] }); await sb3.source.ajouterBoite({ email: 'a@b.fr', mdp: 'm', nom: 'N' });
      v('l\'adaptateur présente la preuve de la clé sur CHAQUE route (disconnect, sendmail, connect compris)', entetes.map(e => [e[0], e[1] === kh(CLE_A)]), [['/api/mailbox/disconnect', true], ['/api/sendmail', true], ['/api/mailbox/connect', true]]); }
  } finally { stop(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { stop(); console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
process.on('exit', stop);
