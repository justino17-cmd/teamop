/* ══ test-3271 — LES BOÎTES MAIL D'OP MESSAGES : « CONTINUER AVEC GOOGLE / MICROSOFT » — LE VRAI SERVICE CONTRE DE FAUX FOURNISSEURS (127.0.0.1) ══════════════════════════════════════════════════
   · le départ : l'adresse d'autorisation (PKCE S256, `state` signé, adresse de retour du service, aucun secret dans l'adresse) ; un fournisseur non configuré : 503 ;
   · le retour SANS cookie : la boîte va à la personne que le `state` désigne — même si une AUTRE est connectée dans ce navigateur ;
   · ⛔ un `state` rejoué, falsifié (signature), au nom d'un autre, périmé (dix minutes) ou d'un refus du fournisseur : rien n'est relié, et un `state` ne sert qu'UNE fois ;
   · le jeton d'accès sert à lire (IMAP) et à envoyer (SMTP, XOAUTH2) ; il est gardé en mémoire (un seul échange pour deux relevés), renouvelé à l'échéance, le jeton de renouvellement tourné est
     retenu ; `invalid_grant` : la boîte passe « à reconnecter », et se reconnecte à la même place ;
   · ⛔ le jeton de renouvellement n'est ni sur le disque en clair, ni dans une réponse, ni dans le journal.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto');
const T = require('./outils-msg');
const { fauxRelais } = require('./outils-relais');
const { lireJournal } = require('./faux-imap-boites');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

const MDP = { alice: 'pw-alice-oauth0001', bob: 'pw-bob-oauth00000001' };
const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const CLIENT = { google: { id: 'gclient-id-123456', secret: 'gsecret-ZZ9988776655' }, microsoft: { id: 'mclient-id-123456', secret: 'msecret-YY1122334455' } };

/* un faux fournisseur : /authorize (note le défi), /token (échange un code, renouvelle un jeton), tout est noté */
function fauxFournisseur(nom, clients) {
  const etat = { defis: {}, echanges: [], renouvellements: [], email: nom + '.utilisateur@exemple.test', invalide: false, tourne: false, n: 0, sansRenouvellement: false };
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    let corps = ''; req.on('data', d => { corps += d; });
    req.on('end', () => {
      const rep = (c, o) => { res.writeHead(c, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (u.pathname === '/authorize') { etat.defis[u.searchParams.get('state')] = u.searchParams.get('code_challenge'); res.writeHead(204); return res.end(); }
      if (u.pathname === '/token' && req.method === 'POST') {
        const p = new URLSearchParams(corps);
        if (p.get('client_id') !== clients.id || p.get('client_secret') !== clients.secret) return rep(401, { error: 'invalid_client' });
        if (p.get('grant_type') === 'authorization_code') {
          const code = p.get('code'), ch = etat.defis[code.replace(/^CODE-/, '')];
          etat.echanges.push({ code, verificateur: p.get('code_verifier'), redirect: p.get('redirect_uri') });
          if (!ch || b64u(crypto.createHash('sha256').update(p.get('code_verifier') || '').digest()) !== ch) return rep(400, { error: 'invalid_grant' });
          const idt = 'x.' + b64u(JSON.stringify({ email: etat.email, email_verified: true })) + '.y';
          const o = { access_token: 'ACCES-' + nom + '-' + (++etat.n), expires_in: 3600, id_token: idt };
          if (!etat.sansRenouvellement) o.refresh_token = 'RENOUV-' + nom + '-INITIAL-QWXZ';
          return rep(200, o);
        }
        if (p.get('grant_type') === 'refresh_token') {
          etat.renouvellements.push(p.get('refresh_token'));
          if (etat.invalide) return rep(400, { error: 'invalid_grant' });
          const o = { access_token: 'ACCES-' + nom + '-' + (++etat.n), expires_in: 3600 };
          if (etat.tourne) o.refresh_token = 'RENOUV-' + nom + '-TOURNE-' + etat.n + '-QWXZ';
          return rep(200, o);
        }
      }
      rep(404, { error: 'x' });
    });
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({ url: 'http://127.0.0.1:' + srv.address().port, etat, fermer: () => new Promise(r => { srv.close(() => r()); srv.closeAllConnections && srv.closeAllConnections(); }) })));
}

(async () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3271-'));
  const etatImap = path.join(racine, 'imap.json'), journalImap = path.join(racine, 'j.jsonl');
  const GMAIL = 'alice.google@exemple.test';
  fs.writeFileSync(etatImap, JSON.stringify({ boites: { 'google.utilisateur@exemple.test': { messages: [{ uid: 1, messageId: '<g1@exemple.test>', dossier: 'INBOX', from: 'x@y.test', to: 'google.utilisateur@exemple.test', subject: 'Bonjour Google', text: 'corps', ts: Date.UTC(2026, 10, 1), flags: [] }] } } }));
  const google = await fauxFournisseur('google', { id: CLIENT.google.id, secret: CLIENT.google.secret });
  const microsoft = await fauxFournisseur('microsoft', { id: CLIENT.microsoft.id, secret: CLIENT.microsoft.secret });
  const relais = await fauxRelais({ xoauth2: { utilisateur: 'google.utilisateur@exemple.test', jeton: 'ACCES-google-1' }, annoncerAuth: false });
  const og = await T.fauxOpGestion({ alice: { pass: MDP.alice, nom: 'Alice Martin', actif: true }, bob: { pass: MDP.bob, nom: 'Bob Petit', actif: true } });
  const crochet = { boucle: true, oauth: { google: google.url, microsoft: microsoft.url }, serveurs: { imap: { hote: '127.0.0.1', port: 9993 }, smtp: { hote: '127.0.0.1', port: relais.port } }, delaiMs: 3000 };
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true,
    config: { boitesMail: { ouvert: true, oauth: { google: { clientId: CLIENT.google.id, clientSecret: CLIENT.google.secret } } } },
    env: { OPMSG_TEST_BOITES: JSON.stringify(crochet), FAUX_IMAP: etatImap, FAUX_IMAP_JOURNAL: journalImap, FAUX_IMAP_RACINE: T.SERVICE, NODE_OPTIONS: '--require=' + path.join(__dirname, 'faux-imap-boites.js') } });
  const BASE = path.join(svc.data, 'msg.db');
  const sql = (req, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).all(...a); } finally { d.close(); } };
  const disque = () => { let t = Buffer.alloc(0); for (const f of fs.readdirSync(svc.data)) if (/^msg\.db/.test(f)) t = Buffer.concat([t, fs.readFileSync(path.join(svc.data, f))]); return t; };
  const REDIR = svc.base + '/api/boites-mail/oauth/retour';
  const A = await T.connecter(svc, og, 'alice', MDP.alice), B = await T.connecter(svc, og, 'bob', MDP.bob);
  const anon = T.client(svc.base);
  /* le « navigateur » : demande l'adresse d'autorisation, la visite chez le faux fournisseur (qui note le défi), revient avec un code */
  async function demarrer(c, f, fournisseur, email) {
    const r = await c.post('/api/boites-mail/oauth/demarrer', { fournisseur: f, email });
    if (r.code !== 200) return { r };
    const u = new URL(r.j.url); const state = u.searchParams.get('state');
    await fetch(r.j.url);
    return { r, u, state, code: 'CODE-' + state, fournisseur };
  }
  const retour = (d, over) => anon.get('/api/boites-mail/oauth/retour?' + new URLSearchParams(Object.assign({ code: d.code, state: d.state }, over || {})).toString());
  const codeRetour = (r) => { const m = /url=([^"]+)"/.exec(r.txt || ''); return m ? decodeURIComponent(m[1]) : null; };
  try {
    console.log('\n1. Le départ');
    const cfg = await anon.get('/api/config'), sante = await anon.get('/health');
    v('/api/config et /health : Google configuré, Microsoft non — des booléens', [cfg.j.boitesMail, sante.j.boitesMail.google, sante.j.boitesMail.microsoft], [{ ouvert: true, oauth: { google: true, microsoft: false } }, true, false]);
    vrai('   ⛔ aucun identifiant d\'application ni secret dans ces réponses publiques', !/gclient|gsecret|msecret/.test(cfg.txt + sante.txt));
    const mf = await A.post('/api/boites-mail/oauth/demarrer', { fournisseur: 'microsoft' }), inc = await A.post('/api/boites-mail/oauth/demarrer', { fournisseur: 'yahoo' });
    v('un fournisseur non configuré : 503 oauth_non_configure ; un inconnu : 400', [mf.code, mf.j.error, inc.code, inc.j.error], [503, 'oauth_non_configure', 400, 'fournisseur_inconnu']);
    const sansV = await anon.post('/api/boites-mail/oauth/demarrer', { fournisseur: 'google' });
    v('sans session : 401', sansV.code, 401);
    const d1 = await demarrer(A, 'google', 'google', 'alice@gmail.test');
    const q = d1.u.searchParams;
    v('l\'adresse d\'autorisation : chez le fournisseur, PKCE S256, adresse de retour du service, portée IMAP/SMTP, indice de compte', [d1.u.origin, q.get('code_challenge_method'), q.get('redirect_uri'), q.get('client_id'), q.get('response_type'), /mail\.google\.com/.test(q.get('scope')), q.get('login_hint'), q.get('access_type')],
      [google.url, 'S256', REDIR, CLIENT.google.id, 'code', true, 'alice@gmail.test', 'offline']);
    vrai('   ⛔ le secret de l\'application n\'est pas dans l\'adresse (elle passe par le navigateur)', !d1.r.j.url.includes(CLIENT.google.secret));

    console.log('\n2. Le retour : SANS cookie, la boîte va à la personne du `state`');
    const rr = await retour(d1);
    v('le retour répond une page (200) qui renvoie vers « / » avec ?boites=ok — et ne porte aucun script', [rr.code, codeRetour(rr), /<script/i.test(rr.txt)], [200, '/?boites=ok', false]);
    const l = (await A.get('/api/boites-mail')).j;
    v('la boîte est à Alice : Google, l\'adresse donnée par le fournisseur, état ok', [l.boites.length, l.boites[0].fournisseur, l.boites[0].adresse, l.boites[0].etat, l.oauth], [1, 'google', 'google.utilisateur@exemple.test', 'ok', { google: true, microsoft: false }]);
    const ech = google.etat.echanges[0];
    v('l\'échange du code : le vérificateur PKCE correspond au défi (le faux l\'a vérifié), la même adresse de retour, le secret accepté', [google.etat.echanges.length, ech.redirect, !!ech.verificateur], [1, REDIR, true]);
    const IDG = l.boites[0].id;
    v('Bob ne voit rien', (await B.get('/api/boites-mail')).j.boites, []);
    const d2 = await demarrer(A, 'google', 'google');
    await retour(d2);
    v('un nouveau parcours pour la même adresse REMPLACE la boîte (même identifiant, pas de doublon)', (await A.get('/api/boites-mail')).j.boites.map(b => b.id), [IDG]);

    console.log('\n3. Un `state` ne relie rien s\'il est faux, rejoué, d\'un autre ou périmé');
    const rej = await retour(d1);
    v('⛔ REJOUÉ (le même retour une seconde fois) : refusé, et rien de plus de relié', [codeRetour(rej), (await A.get('/api/boites-mail')).j.boites.length], ['/?boites=erreur&c=state_rejoue', 1]);
    const d3 = await demarrer(A, 'google', 'google');
    const [corps, sig] = d3.state.split('.');
    const falsifie = corps + '.' + sig.slice(0, -2) + (sig.endsWith('AA') ? 'BB' : 'AA');
    const rf = await retour(d3, { state: falsifie });
    v('⛔ SIGNATURE altérée : refusé (state_invalide)', codeRetour(rf), '/?boites=erreur&c=state_invalide');
    const autre = JSON.parse(Buffer.from(corps.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString());
    autre.u = 'p_' + 'b'.repeat(32);
    const corpsB = b64u(JSON.stringify(autre));
    const ru = await retour(d3, { state: corpsB + '.' + sig });
    v('⛔ AU NOM D\'UN AUTRE (le corps change, la signature reste) : refusé', [codeRetour(ru), (await B.get('/api/boites-mail')).j.boites.length], ['/?boites=erreur&c=state_invalide', 0]);
    const rv = await retour(d3, { state: 'n-importe-quoi' });
    const rn = await retour(d3, { state: '' });
    v('un `state` absurde ou absent : refusé', [codeRetour(rv), codeRetour(rn)], ['/?boites=erreur&c=state_invalide', '/?boites=erreur&c=state_invalide']);
    const rok = await retour(d3);
    v('   (le vrai `state` d3, intact, passait encore : les refus ci-dessus ne l\'ont pas consommé)', codeRetour(rok), '/?boites=ok');
    const d5 = await demarrer(A, 'google', 'google');
    const rrefus = await anon.get('/api/boites-mail/oauth/retour?error=access_denied&state=' + encodeURIComponent(d5.state));
    const rapres = await retour(d5);
    v('⛔ le fournisseur refuse (« access_denied ») : « refuse », et le `state` est consommé', [codeRetour(rrefus), codeRetour(rapres)], ['/?boites=erreur&c=refuse', '/?boites=erreur&c=state_rejoue']);
    const d6 = await demarrer(A, 'google', 'google');
    google.etat.sansRenouvellement = true;
    const rs = await retour(d6);
    google.etat.sansRenouvellement = false;
    v('le fournisseur ne donne pas d\'accès durable : refusé (sans_renouvellement), rien de relié de plus', [codeRetour(rs), (await A.get('/api/boites-mail')).j.boites.length], ['/?boites=erreur&c=sans_renouvellement', 1]);
    vrai('   ⛔ la page d\'erreur ne répète rien de ce qui arrive dans l\'adresse', !(await retour(d6, { state: '<script>alert(1)</script>' })).txt.includes('alert(1)'));

    console.log('\n4. Bob connecté, Alice qui revient : la boîte va à Alice');
    const d7 = await demarrer(A, 'google', 'google');
    google.etat.email = 'autre.alice@exemple.test';
    const rb = await fetch(svc.base + '/api/boites-mail/oauth/retour?' + new URLSearchParams({ code: d7.code, state: d7.state }), { headers: { Cookie: B.enteteCookie() } });
    google.etat.email = 'google.utilisateur@exemple.test';
    v('le cookie de Bob accompagne le retour : la boîte est à ALICE (le `state`), Bob n\'a rien', [rb.status, (await B.get('/api/boites-mail')).j.boites.length, (await A.get('/api/boites-mail')).j.boites.map(b => b.adresse).sort()], [200, 0, ['autre.alice@exemple.test', 'google.utilisateur@exemple.test']]);
    const IDA2 = (await A.get('/api/boites-mail')).j.boites.find(b => b.adresse === 'autre.alice@exemple.test').id;
    await A.post('/api/boites-mail/' + IDA2 + '/supprimer', {});

    console.log('\n5. Lire et envoyer avec le jeton d\'accès');
    google.etat.renouvellements.length = 0;
    const m1 = await A.get('/api/boites-mail/' + IDG + '/messages');
    const cx = lireJournal(journalImap).filter(x => x.accessToken);
    v('le relevé : le service s\'est présenté en XOAUTH2 avec le jeton d\'accès (jamais le mot de passe), pour la bonne adresse', [m1.code, m1.j.messages.length, cx[cx.length - 1].user, /^ACCES-google-\d+$/.test(cx[cx.length - 1].accessToken), cx[cx.length - 1].pass], [200, 1, 'google.utilisateur@exemple.test', true, null]);
    const nRen = google.etat.renouvellements.length;
    const jetonUtilise = cx[cx.length - 1].accessToken;
    await A.get('/api/boites-mail/' + IDG + '/messages');
    const cx2 = lireJournal(journalImap).filter(x => x.accessToken);
    v('   un second relevé réutilise le jeton gardé en mémoire (pas de nouvel échange)', [google.etat.renouvellements.length - nRen, cx2[cx2.length - 1].accessToken], [0, jetonUtilise]);
    relais.etat.auths.length = 0;
    relais.etat.xoauth2 = { utilisateur: 'google.utilisateur@exemple.test', jeton: jetonUtilise };
    relais.o.xoauth2 = relais.etat.xoauth2;
    const env = await A.post('/api/boites-mail/' + IDG + '/envoyer', { a: 'dest@exemple.test', objet: 'Par Google', texte: 'envoyé avec le jeton' });
    v('envoyer : le relais accepte l\'authentification XOAUTH2 avec ce jeton', [env.code, relais.etat.auths, relais.messages.length], [200, [true], 1]);
    svc.avancer(61 * 60000);
    google.etat.tourne = true;
    await A.get('/api/boites-mail/' + IDG + '/messages');
    const cx3 = lireJournal(journalImap).filter(x => x.accessToken);
    v('une heure plus tard : le jeton est renouvelé avec le jeton de renouvellement, un jeton d\'accès neuf sert', [google.etat.renouvellements.length - nRen, google.etat.renouvellements[google.etat.renouvellements.length - 1], cx3[cx3.length - 1].accessToken !== jetonUtilise],
      [1, 'RENOUV-google-INITIAL-QWXZ', true]);
    svc.avancer(61 * 60000);
    await A.get('/api/boites-mail/' + IDG + '/messages');
    vrai('⛔ le jeton de renouvellement TOURNÉ par le fournisseur est retenu : le renouvellement suivant s\'en sert (l\'ancien finirait par mourir)', /TOURNE/.test(google.etat.renouvellements[google.etat.renouvellements.length - 1]));

    console.log('\n6. L\'autorisation retirée : « à reconnecter »');
    google.etat.invalide = true; google.etat.tourne = false;
    svc.avancer(61 * 60000);
    const cass = await A.get('/api/boites-mail/' + IDG + '/messages');
    v('invalid_grant : 409 a_reconnecter, un texte DIT', [cass.code, cass.j.error, typeof cass.j.message], [409, 'a_reconnecter', 'string']);
    v('   la boîte est marquée, le compteur de santé le voit', [(await A.get('/api/boites-mail')).j.boites[0].etat, (await anon.get('/health')).j.boitesMail.reconnexions >= 1], ['a_reconnecter', true]);
    const n = google.etat.renouvellements.length;
    await A.get('/api/boites-mail/' + IDG + '/messages');
    vrai('   ⛔ le fournisseur est réinterrogé à chaque geste mais jamais en boucle serrée', google.etat.renouvellements.length - n <= 1);
    google.etat.invalide = false;
    const d8 = await demarrer(A, 'google', 'google');
    await retour(d8);
    const apres = (await A.get('/api/boites-mail')).j.boites;
    v('se reconnecter : la MÊME boîte (même identifiant), état ok', [apres.length, apres[0].id === IDG, apres[0].etat], [1, true, 'ok']);

    console.log('\n7. Le secret ne sort nulle part');
    const dis = disque();
    v('⛔ le jeton de renouvellement n\'est pas sur le disque en clair (base et WAL), ni l\'adresse', [dis.includes('RENOUV-google'), dis.includes('google.utilisateur'), dis.includes(CLIENT.google.secret)], [false, false, false]);
    const s = svc.sortie.texte();
    v('   ni dans le journal du service (jeton, adresse, secret de l\'application)', [s.includes('RENOUV-'), s.includes('ACCES-'), s.includes('exemple.test'), s.includes(CLIENT.google.secret)], [false, false, false, false]);
    const toutes = JSON.stringify([m1.txt, env.txt, cass.txt, (await A.get('/api/boites-mail')).txt, (await anon.get('/health')).txt]);
    vrai('   ni dans aucune réponse', !/RENOUV-|ACCES-|gsecret/.test(toutes));
    v('la ligne en base est celle d\'un fournisseur « google »', sql('SELECT fournisseur FROM boite_mail').map(r => r.fournisseur), ['google']);
    console.log('\n8. Un `state` périmé (en dernier : le banc avance l\'horloge du service)');
    const d4 = await demarrer(A, 'google', 'google');
    svc.avancer(11 * 60000);
    const rp = await retour(d4);
    v('⛔ PÉRIMÉ (onze minutes) : refusé', codeRetour(rp), '/?boites=erreur&c=state_expire');
    v('   et rien de plus de relié', (await A.get('/api/boites-mail')).j.boites.length, 1);
  } catch (e) { console.log('  ✗ EXCEPTION', e && e.stack || e); process.exitCode = 1; }
  finally { await svc.arreter(); await relais.fermer(); await google.fermer(); await microsoft.fermer(); await og.fermer(); try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) {} }
  fin();
})().catch(e => { console.log('  ✗ MORT', e && e.stack || e); process.exit(1); });
