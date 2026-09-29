/* ⛔ CE QUE CE FICHIER GARDE — PLUS AUCUN CODE : C'EST LA TOUR QUI CRÉE LE LIEN, APRÈS LA DEMANDE.

   Justin, 28 septembre 2026 : « je veux plus de code, que des liens pour les connexions » ; « c'est nous qui créons les
   liens pour les entreprises une fois leur demande faite » ; « oui, supprimer la création automatique ».
   Deux moitiés, et c'est leur COUTURE qu'on garde ici — les vraies fonctions de la Tour contre le vrai serveur :
     · « ✅ Accepter la demande » (`tourAccepterDemande`) fait désormais tout ce que faisait la création automatique,
       mais sur décision : l'espace, le code promo de la DEMANDE (vérifié par le serveur), la formule et le nombre
       d'utilisateurs, les demandes marquées traitées — puis le panneau, sans code d'accès ;
     · « 📧 Envoyer par e-mail au client » (`tourMailAcces`) envoie le mot de passe AFFICHÉ, et le serveur ne le met
       dans le courriel que s'il correspond à l'empreinte enregistrée. ⛔ Avant, le courriel n'avait JAMAIS porté le
       mot de passe provisoire (le serveur ne le garde pas) : un client neuf recevait « vos identifiants habituels ».
     · les refus qui DISENT quoi faire : un espace sans compte (409 `sans_compte`, et le panneau le montre), un espace
       jamais ouvert dont la Tour n'a pas le mot de passe (409 `mdp_inconnu`) — jamais une porte fermée par courriel.
   Rien ne sort d'ici : 127.0.0.1, un facteur SMTP de banc, des entreprises fictives, un code promo FICTIF. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), vm = require('vm');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRC_TOUR = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(RACINE, 'tour.html'), 'utf8');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b841-'));
let enfant = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 90000).unref();

/* ── Les fonctions de la Tour, ancrées sur leur DÉCLARATION (le fichier est très commenté) — l'extracteur de test-833 ── */
const CODE = SRC_TOUR.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function fonction(nom) {
  const m = new RegExp('\\n(?:async )?function ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) {
    const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === '/' && CODE[k + 1] === '*') { k = CODE.indexOf('*/', k) + 1; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return CODE.slice(m.index + 1, k + 1);
}
/* `esc` et `jsq` portent des guillemets DANS leurs expressions régulières (/[&<>"']/g) : l'extracteur, qui suit les
   chaînes, s'y perdrait. Elles tiennent sur leurs lignes et finissent par « ; }\n » : on les prend telles quelles. */
function courte(nom) {
  const i = CODE.indexOf('\nfunction ' + nom + '('); if (i < 0) return '';
  const j = CODE.indexOf('; }\n', i); return j < 0 ? '' : CODE.slice(i + 1, j + 3);
}
/* Un bac à sable par scénario : un navigateur NEUF (`tour_liens` vide, comme la Tour ouverte sur un autre appareil),
   un patron qui tape l'identifiant proposé, et tout ce que la page affiche, capturé. */
function tour(API, TOKEN, clients) {
  const noms = ['hAuth', 'apiPost', 'esc', 'jsq', 'espSlugJs', 'tourSha256', 'tourLienServeur', 'tourEspaceDe', 'tourIdentDefaut',
    'tourMdpDefaut', 'tourMailAcces', 'lgMessagePoser', 'tourLienEntreprise', 'tourAccepterDemande'];
  const src = noms.map(n => (n === 'esc' || n === 'jsq') ? courte(n) : fonction(n));
  /* v2.77 : l'acceptation lit la liste des métiers (`MET_L`, le métier demandé se pose sur l'espace — test-848) ; la VRAIE
     ligne de la Tour, pas une copie : sans elle, la fonction extraite jette dès sa première ligne sur le métier */
  src.unshift((/^var MET_L=\{[^\n]*\};$/m.exec(CODE) || [''])[0]);
  const manque = noms.filter((n, i) => !src[i + 1]).concat(src[0] ? [] : ['MET_L']);
  if (manque.length) return { manque };
  const L = {
    toasts: [], panneaux: [], prompts: [], elems: {}, rangement: new Map() };
  const elem = (id) => (L.elems[id] = L.elems[id] || { id, value: '', href: '#', style: {}, title: '', textContent: '', disabled: false });
  const ctx = { fetch, Object, String, JSON, Promise, Math, Number, Array, Date, Uint8Array, TextEncoder, parseInt, encodeURIComponent, unescape,
    crypto: crypto.webcrypto, console: { log() {}, warn() {}, error() {} },
    btoa: (s) => Buffer.from(String(s), 'latin1').toString('base64'),
    setTimeout: (f) => 0,
    prompt: (q, d) => { L.prompts.push(q); return d; },
    toast: (t) => { L.toasts.push(String(t)); },
    tourPanneau: (h) => { L.panneaux.push(String(h)); L.elems = {}; },
    tourPackPrefill: () => {}, chargerClients: () => {},
    localStorage: { getItem: k => (L.rangement.has(k) ? L.rangement.get(k) : null), setItem: (k, x) => L.rangement.set(k, String(x)), removeItem: k => L.rangement.delete(k) },
    document: { getElementById: elem },
    CLI: { list: clients || [] } };
  vm.createContext(ctx);
  vm.runInContext('var API=' + JSON.stringify(API) + ', TOKEN=' + JSON.stringify(TOKEN) + ";\nvar LG_MSG_MODELE='', LG_MAIL='', LG_ZONE='lg-msg';\n" + src.join('\n')
    + '\nthis.__lg=function(){ return {modele:LG_MSG_MODELE, zone:LG_ZONE, mail:LG_MAIL}; };', ctx);
  return Object.assign(L, { ctx, elem });
}

/* Le facteur du banc (celui de `test-840`, point doublé compris — RFC 5321 §4.5.2). */
function facteur() {
  const recus = [];
  const f = { recus };
  const s = require('net').createServer(c => {
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
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
  f.s = s;
  return f;
}
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
const destinataire = (m) => ((/^To: *(.+)$/m.exec(String(m || '')) || [])[1] || '').trim();
const courrierPour = (adr) => facteurSrv.recus.map(lisible).filter(m => destinataire(m) === adr);

console.log('\n── 841 · plus de code : la Tour crée le lien après la demande, le courriel porte les identifiants ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64').replace(/=+$/, '');
  const sha = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');
  const MAINTENANT = Date.now();
  /* Trois clients du site, chacun avec sa demande — fictifs. */
  const CLIENTS = {
    'rose@exemple-841.fr': { email: 'rose@exemple-841.fr', nom: 'Rose Vautrin', prenom: 'Rose', nomFam: 'Vautrin', entreprise: 'Rose Hygiène',
      demandes: [{ app: 'OP GESTION', formule: 'Pro', statut: 'nouveau', date: MAINTENANT - 60000, users: '3', code: 'BIENVENUE-BANC-841' }], demandesTraitees: {} },
    'yves@exemple-841.fr': { email: 'yves@exemple-841.fr', nom: 'Yves Kermarec', prenom: 'Yves', nomFam: 'Kermarec', entreprise: 'Yves Nettoyage',
      demandes: [{ app: 'OP GESTION', formule: 'Business', statut: 'nouveau', date: MAINTENANT - 50000, users: '2', code: 'INVENTE-QX-841' }], demandesTraitees: {} } };
  fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify(CLIENTS));
  /* Deux espaces DÉJÀ inscrits, ouverts depuis un autre appareil : l'un a un compte de départ (a + mh), l'autre non. */
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    zoeservices: { slug: 'zoeservices', nom: 'Zoé Services', email: 'zoe@exemple-841.fr', t: 'ent-zoe-841',
      code: b64({ t: 'ent-zoe-841', k: 'CLE-ZOE-841', n: 'Zoé Services', a: 'zoe', mh: sha('OP-ZoeDepart841') }), ts: 1 },
    vieilhygiene: { slug: 'vieilhygiene', nom: 'Vieil Hygiène', email: 'vieil@exemple-841.fr', t: 'ent-vieil-841',
      code: b64({ t: 'ent-vieil-841', k: 'CLE-VIEIL-841', n: 'Vieil Hygiène' }), ts: 2 },
    /* (`gardien`) un espace qui a DÉJÀ servi, annuaire vide : son mot de passe provisoire n'est plus le sien */
    dejaservi: { slug: 'dejaservi', nom: 'Déjà Servi', email: 'servi@exemple-841.fr', t: 'ent-servi-841',
      code: b64({ t: 'ent-servi-841', k: 'CLE-SERVI-841', n: 'Déjà Servi', a: 'sacha', mh: sha('OP-SachaVieux841') }), ts: 3 },
    /* un espace qui a servi, AVEC son annuaire : le courriel ne doit pas redonner l'ancien mot de passe provisoire */
    servieavec: { slug: 'servieavec', nom: 'Servie Avec', email: 'avec@exemple-841.fr', t: 'ent-avec-841',
      code: b64({ t: 'ent-avec-841', k: 'CLE-AVEC-841', n: 'Servie Avec', a: 'lina', mh: sha('OP-LinaVieux841') }), ts: 4 },
    fermeeici: { slug: 'fermeeici', nom: 'Fermée Ici', email: 'ferme@exemple-841.fr', t: 'ent-ferme-841',
      code: b64({ t: 'ent-ferme-841', k: 'CLE-FERME-841', n: 'Fermée Ici', a: 'fio', mh: sha('OP-FioVieux841') }), ts: 5 } }));
  fs.writeFileSync(path.join(D, 'connexions.json'), JSON.stringify({ 'ent-servi-841': [{ ts: MAINTENANT - 86400000, ev: 'connexion', login: 'sacha' }] }));
  fs.writeFileSync(path.join(D, 'entreprises-fermees.json'), JSON.stringify({ emails: [], espaces: ['ent-ferme-841'], suspendus: [] }));
  const vap = webpush.generateVAPIDKeys();
  const MDP = 'mot-de-passe-banc-841';
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey,
    apiKey: 'banc', adminPassHash: sha(MDP), notifDemandes: 'patron@banc-841.fr',
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' },
    /* Un code FICTIF (tirets, suffixe du banc) : il n'existe pas sur le VPS. */
    promos: [{ code: 'BIENVENUE-BANC-841', formule: 'premium', mois: 3 }] }));
  const PORT = 9650 + (process.pid % 250);
  let journal = '';
  enfant = spawn(process.execPath, [SERVEUR], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
      TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_RATTRAPAGE_MS: '100' }),
    stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false;
  for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre, isolé', vivant);
  if (!vivant) { console.log(journal.slice(0, 800)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: corps === undefined ? 'GET' : 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: MDP })).j.token;
  vrai('la Tour ouvre une session de patron', PATRON);
  const espaces = async () => (await appel('/api/monitor/espaces/liste', undefined, PATRON)).j.espaces || [];
  const clientsSrv = async () => (await appel('/api/monitor/clients', undefined, PATRON)).j.clients || [];

  try {
    /* ══ 1. « ACCEPTER LA DEMANDE » : l'espace naît ICI, avec le code promo de la demande ═════════════════════ */
    console.log('\n1. Accepter une demande qui porte un code promo connu');
    const T = tour(B, PATRON, Object.values(CLIENTS));
    vrai('les vraies fonctions de la Tour s\'extraient (' + (T.manque ? 'manque : ' + T.manque.join(', ') : 'toutes') + ')', !T.manque);
    if (T.manque) throw new Error('extraction');
    await T.ctx.tourAccepterDemande('rose@exemple-841.fr', 'Rose Hygiène');
    const eR = (await espaces()).find(e => e.email === 'rose@exemple-841.fr') || {};
    vrai('⛔ l\'espace est créé par le geste de la Tour, à l\'adresse du client', eR.slug);
    v('⛔ le code promo de la DEMANDE s\'applique : sa formule (Business Premium), le nombre d\'utilisateurs demandé (3)',
      [eR.formule, eR.quantite, eR.promoCode], ['premium', 3, 'BIENVENUE-BANC-841']);
    const pan = T.panneaux.slice(-1)[0] || '';
    vrai('le panneau « Demande acceptée » s\'ouvre', /Demande acceptée/.test(pan));
    vrai('⛔ il dit la période offerte, pas « en attente de paiement »', /offerte jusqu/.test(pan) && !/en attente de paiement/.test(pan));
    vrai('⛔ AUCUN code d\'accès dans le panneau', !/CODE D.ACC|lg-acces|__CODE__|code d.acc/i.test(pan));
    vrai('   l\'adresse de l\'espace y est, telle que le SERVEUR l\'a nommée', pan.indexOf('teamop.fr/e/' + eR.slug) >= 0);
    const lg = T.ctx.__lg();
    v('le message type est posé dans SA zone, tout de suite, complet', [lg.zone, T.elems['acc-msg'] && T.elems['acc-msg'].value === lg.modele], ['acc-msg', true]);
    vrai('⛔ le message : l\'adresse, l\'identifiant, le mot de passe, le code promo activé — et pas un mot de code d\'accès',
      lg.modele.indexOf('teamop.fr/e/' + eR.slug) >= 0 && /Identifiant : rose/.test(lg.modele) && /Mot de passe provisoire : OP-/.test(lg.modele)
      && /BIENVENUE-BANC-841.*activé/.test(lg.modele) && !/code d.acc|__CODE__/i.test(lg.modele));
    vrai('« Ou ouvrir dans Mail » est armé tout de suite (plus d\'attente d\'un code)', /^mailto:rose%40exemple-841\.fr\?subject=/.test((T.elems['lg-mailto'] || {}).href || ''));
    await dormir(700);
    const cR = (await clientsSrv()).find(c => c.email === 'rose@exemple-841.fr') || {};
    v('⛔ la demande est marquée traitée, par le patron — quelqu\'un l\'a lue', Object.keys(cR.demandesTraitees || {}), ['0']);

    /* ── L'envoi : le mot de passe affiché part dans le courriel, et rien d'autre ── */
    const mdpR = (/Mot de passe provisoire : (OP-[A-Za-z0-9]+)/.exec(lg.modele) || [])[1] || '';
    vrai('le mot de passe affiché est lisible dans le message', mdpR.length > 5);
    const bouton = /tourMailAcces\('([^']+)',this,'([^']*)'\)/.exec(pan) || [];
    v('⛔ le bouton « Envoyer » transmet le mot de passe AFFICHÉ', bouton[2], mdpR);
    const btn = { disabled: false, textContent: '' };
    await new Promise(res => { T.ctx.tourMailAcces(bouton[1], btn, bouton[2]); setTimeout(res, 900); });
    v('   la Tour dit que c\'est parti', [btn.textContent, /envoyés à rose@exemple-841\.fr/.test(T.toasts.slice(-1)[0] || '')], ['✅ E-mail envoyé', true]);
    const aRose = courrierPour('rose@exemple-841.fr').pop() || '';
    vrai('⛔ le client reçoit l\'adresse ET son mot de passe provisoire (avant : jamais)',
      aRose.indexOf('teamop.fr/e/' + eR.slug) >= 0 && aRose.indexOf(mdpR) >= 0 && /Identifiant : rose/.test(aRose));
    vrai('   ⛔ sans code d\'accès, sans « Première connexion de l\'entreprise ? », sans « identifiants habituels »',
      aRose && !/code d.acc/i.test(aRose) && !/Première connexion de l/.test(aRose) && !/identifiants habituels/.test(aRose));
    vrai('   ⛔ ni la vieille promesse « votre nom + !! »', aRose && !/votre nom \+/.test(aRose));
    /* Et l'adresse + ces identifiants OUVRENT l'espace : ce n'est pas une porte dessinée. */
    let o = null;
    for (let i = 0; i < 30 && !(o && o.s === 200); i++) { o = await appel('/api/espaces/connexion', { nom: eR.slug, login: 'rose', h: sha(mdpR) }); if (o.s !== 200) await dormir(100); }
    v('⛔ l\'adresse + l\'identifiant + ce mot de passe OUVRENT l\'espace', o && o.s, 200);

    /* ══ 2. UN CODE INCONNU : rien ne s'active, et le panneau le dit ═════════════════════════════════════════ */
    console.log('\n2. Accepter une demande qui porte un code inconnu');
    const T2 = tour(B, PATRON, Object.values(CLIENTS));
    await T2.ctx.tourAccepterDemande('yves@exemple-841.fr', 'Yves Nettoyage');
    const eY = (await espaces()).find(e => e.email === 'yves@exemple-841.fr') || {};
    v('l\'espace est créé, la formule demandée (Business × 2), AUCUN code posé', [!!eY.slug, eY.formule, eY.quantite, eY.promoCode || null], [true, 'business', 2, null]);
    const pan2 = T2.panneaux.slice(-1)[0] || '';
    vrai('⛔ le panneau dit que le code n\'est pas appliqué, et pourquoi (la réponse du serveur)', /INVENTE-QX-841.*non appliqué.*Code promo inconnu/.test(pan2));
    vrai('   et la formule attend son paiement', /en attente de paiement/.test(pan2));
    vrai('   et le message invite à payer, sans rien promettre d\'offert', /paye ton abonnement/.test(T2.ctx.__lg().modele) && !/offert jusqu/.test(T2.ctx.__lg().modele));

    /* ══ 3. UN ESPACE DÉJÀ INSCRIT, OUVERT DEPUIS UN AUTRE APPAREIL : pas de mot de passe inventé ═════════════ */
    console.log('\n3. Revoir le lien d\'un espace déjà inscrit, depuis un autre appareil');
    for (let i = 0; i < 30; i++) { const z = (await espaces()).find(e => e.slug === 'zoeservices'); if (z && z.annuaire) break; await dormir(100); }
    const T3 = tour(B, PATRON, []);
    await T3.ctx.tourLienEntreprise('zoe@exemple-841.fr', 'Zoé Services', false, 'zoe');
    const pan3 = T3.panneaux.slice(-1)[0] || '';
    vrai('le panneau s\'ouvre, sans code d\'accès', /Lien de connexion/.test(pan3) && !/lg-acces|CODE D.ACC/.test(pan3));
    vrai('⛔ le mot de passe est dit INCONNU — jamais le tirage que le serveur n\'a pas haché', /inconnu sur cet appareil/.test(pan3) && !/<b>OP-[A-Za-z0-9]+<\/b>/.test(pan3));
    vrai('   l\'espace a un compte : pas d\'avertissement « aucun compte »', !/lg-sans-compte/.test(pan3));
    const b3 = /tourMailAcces\('([^']+)',this,'([^']*)'\)/.exec(pan3) || [];
    v('   le bouton « Envoyer » ne transmet aucun mot de passe', b3[2], '');
    const avant3 = facteurSrv.recus.length;
    const btn3 = { disabled: false, textContent: '' };
    await new Promise(res => { T3.ctx.tourMailAcces(b3[1], btn3, b3[2]); setTimeout(res, 700); });
    vrai('⛔ espace jamais ouvert, mot de passe inconnu : le serveur REFUSE d\'envoyer une porte sans clé, et la Tour le dit',
      /n'est pas connu d'ici/.test(T3.toasts.slice(-1)[0] || '') && btn3.disabled === false);
    v('   rien n\'est parti', facteurSrv.recus.length, avant3);
    let r = await appel('/api/monitor/espaces/mail-acces', { nom: 'zoeservices', mdp: 'OP-PasLeBon841' }, PATRON);
    v('⛔ un mot de passe qui ne correspond pas à l\'empreinte ne part pas non plus', [r.s, r.j.motif], [409, 'mdp_inconnu']);
    r = await appel('/api/monitor/espaces/mail-acces', { nom: 'zoeservices', mdp: 'OP-ZoeDepart841' }, PATRON);
    v('…le bon, si', r.s, 200);
    const aZoe = courrierPour('zoe@exemple-841.fr').pop() || '';
    vrai('   et il est dans le courriel', aZoe.indexOf('OP-ZoeDepart841') >= 0 && aZoe.indexOf('teamop.fr/e/zoeservices') >= 0);

    /* ══ 4. UN ESPACE SANS AUCUN COMPTE : le panneau le dit, le serveur refuse le courriel ═══════════════════ */
    console.log('\n4. Un espace sans aucun compte');
    const T4 = tour(B, PATRON, []);
    await T4.ctx.tourLienEntreprise('vieil@exemple-841.fr', 'Vieil Hygiène', false, 'admin');
    const pan4 = T4.panneaux.slice(-1)[0] || '';
    vrai('⛔ le panneau DIT que l\'adresse seule n\'ouvre rien', /id="lg-sans-compte"/.test(pan4) && /aucun compte/.test(pan4));
    vrai('   et propose le geste qui répare (poser ses identifiants)', /tourIdentModifier\('vieilhygiene'/.test(pan4));
    r = await appel('/api/monitor/espaces/mail-acces', { nom: 'vieilhygiene' }, PATRON);
    v('⛔ le serveur refuse d\'envoyer une adresse qui n\'ouvre rien (409 « sans_compte »)', [r.s, r.j.motif], [409, 'sans_compte']);
    v('   rien n\'est parti chez lui', courrierPour('vieil@exemple-841.fr').length, 0);
    r = await appel('/api/monitor/espaces/identifiants', { slug: 'vieilhygiene', ident: 'vieil', mdp: 'OP-VieilNeuf841' }, PATRON);
    v('le patron pose ses identifiants', r.s, 200);
    let rv = null;
    for (let i = 0; i < 30 && !(rv && rv.s === 200); i++) { rv = await appel('/api/monitor/espaces/mail-acces', { nom: 'vieilhygiene', mdp: 'OP-VieilNeuf841' }, PATRON); if (rv.s !== 200) await dormir(100); }
    v('…et l\'envoi passe, avec le mot de passe qu\'il vient de poser', [rv && rv.s, (courrierPour('vieil@exemple-841.fr').pop() || '').indexOf('OP-VieilNeuf841') >= 0], [200, true]);

    /* ══ 4 bis. CE QUE LA RELECTURE A RELEVÉ (`gardien`) ══════════════════════════════════════════════════
       Un espace qui a DÉJÀ servi : son annuaire vide ne se re-sème pas (l'ancien mot de passe provisoire — « Nom!! »
       pour l'ancienne création automatique — le rouvrirait), et le courriel ne redonne jamais un mot de passe provisoire
       qui n'est plus le sien. Un espace fermé ne reçoit aucun lien. */
    console.log('\n4 bis. Un espace qui a déjà servi, un espace fermé');
    r = await appel('/api/monitor/espaces/mail-acces', { nom: 'dejaservi', mdp: 'OP-SachaVieux841' }, PATRON);
    v('⛔ espace qui a servi, annuaire vide : PAS de semis, refus « sans_compte »', [r.s, r.j.motif], [409, 'sans_compte']);
    r = await appel('/api/espaces/connexion', { nom: 'dejaservi', login: 'sacha', h: sha('OP-SachaVieux841') });
    v('⛔ …et l\'ancien mot de passe provisoire n\'ouvre RIEN (rien n\'a été semé)', r.s === 200, false);
    for (let i = 0; i < 30; i++) { const z = (await espaces()).find(e => e.slug === 'servieavec'); if (z && z.annuaire) break; await dormir(100); }
    await appel('/api/connexions', { t: 'ent-avec-841', ev: 'connexion', login: 'lina' });
    const avantAvec = courrierPour('avec@exemple-841.fr').length;
    r = await appel('/api/monitor/espaces/mail-acces', { nom: 'servieavec', mdp: 'OP-LinaVieux841' }, PATRON);
    const aAvec = courrierPour('avec@exemple-841.fr').slice(avantAvec).pop() || '';
    v('espace qui a servi, avec son annuaire : le lien part', r.s, 200);
    vrai('⛔ …SANS le mot de passe provisoire d\'origine, qui n\'est plus le sien — « vos identifiants habituels »',
      aAvec && aAvec.indexOf('OP-LinaVieux841') < 0 && /identifiants habituels/.test(aAvec));
    r = await appel('/api/monitor/espaces/mail-acces', { nom: 'fermeeici', mdp: 'OP-FioVieux841' }, PATRON);
    v('⛔ un espace fermé ne reçoit aucun lien', [r.s, r.j.motif, courrierPour('ferme@exemple-841.fr').length], [409, 'ferme', 0]);

    /* ══ 5. LE CODE N'EXISTE PLUS CÔTÉ SERVEUR ══════════════════════════════════════════════════════════════ */
    console.log('\n5. Le code d\'accès n\'existe plus');
    r = await appel('/api/monitor/espaces/acces', { slug: eR.slug }, PATRON);
    v('⛔ la Tour ne peut plus en fabriquer (410)', [r.s, !!r.j.acces], [410, false]);
    r = await appel('/api/espaces/ouvrir', { nom: eR.slug, acces: 'ABCDEFGH23' });
    v('⛔ la porte du code répond 410, et le dit', [r.s, r.j.motif], [410, 'sans_code']);
    vrai('⛔ le journal ne recopie aucune adresse en clair', !/\w@exemple-841\.fr/.test(journal));
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin(); process.exit(ko ? 1 : 0);
})();
