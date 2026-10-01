/* ⛔ CE QUE CE FICHIER GARDE — LE VRAI SERVICE PARLÉ EN HTTP : socle, en-têtes, écritures, porte bêta (famille 3).

   `server-msg/index.js` tel qu'il sera déployé, dans un PROCESSUS ISOLÉ : sa configuration, ses données,
   sa clé (credential), un port libre — jamais `msg*.teamop.fr`, tout sur 127.0.0.1. Un faux OP GESTION de
   poche répond à la porte bêta et NOTE ce qu'on lui dit ; `test-904` rejoue la même porte contre le VRAI
   `server/index.js`. Les modules ont leurs bancs (`test-901`, `test-902`) ; celui-ci dit que les PIÈCES
   SONT BRANCHÉES (la leçon de `test-726` : un défaut de câblage passe sous les bancs de modules).

   Les contrôles marqués ⛔ gardent des propriétés dont la perte ne se verrait PAS :
     · FERMÉE PAR DÉFAUT : la porte bêta ne s'ouvre jamais quand OP GESTION se tait (panne, délai, 500,
       réponse illisible, route absente) — une porte qui s'ouvre quand son gardien se tait est ouverte ;
     · UNE ÉCRITURE EXIGE L'ORIGINE ET L'EN-TÊTE MAISON — sinon un formulaire d'un autre site écrit au nom
       d'une personne connectée ;
     · L'ADRESSE QUE VOIT OP GESTION est celle de la personne (`X-Forwarded-For` posé par ce service) — sans
       elle tous les testeurs partageraient un seul plafond ;
     · UN ACCÈS COUPÉ DEPUIS LA TOUR FERME LA SESSION ET LE FLUX déjà ouverts ; une PANNE d'OP GESTION,
       elle, n'éjecte personne ;
     · AUCUN `Access-Control-*`, JAMAIS (le front est de même origine). */

const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

const COMPTES = () => ({
  alice: { pass: 'pw-alice-1234', nom: 'Alice Martin', actif: true },
  bob: { pass: 'pw-bob-12345', nom: 'Bob', actif: true },
  coupe: { pass: 'pw-coupe-123', nom: 'Coupé', actif: false },
});
const lireDb = (svc) => T.lireBase(path.join(svc.data, 'msg.db'));
const nb = (svc, table) => { const d = lireDb(svc); try { return d.prepare('SELECT COUNT(*) AS n FROM ' + table).get().n; } finally { d.close(); } };

(async () => {
  const og = await T.fauxOpGestion(COMPTES());
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { beta: { relectureMs: 250, timeoutMs: 500 } } });
  /* ⛔ La relecture de l'état des accès (toutes les 250 ms ici) APPELLE AUSSI OP GESTION (`/api/beta/etat`, adresse 127.0.0.1) : compter
     « tous les appels reçus » dépend alors du moment où elle passe — 1 fois sur 6 environ, un appel de relecture s'intercalait et
     faisait accuser le service de relayer l'adresse du VPS. On ne compte que les appels de CONNEXION. */
  const logins = (n0) => og.appels.slice(n0).filter(a => a.chemin === '/api/beta/login');
  try {
    console.log('Le service démarre, /health est agrégé, et il n\'écoute que sur la boucle locale');
    {
      const c = T.client(svc.base);
      const h = await c.get('/health');
      v('/health répond 200 {ok:true, instance, sha}', [h.code, h.j.ok, h.j.instance, h.j.sha], [200, true, 'beta', 'banc0000']);
      v('⛔ /health n\'a QUE des champs agrégés (la liste exacte — en ajouter un oblige à trancher ici)', Object.keys(h.j).sort(), ['base', 'boucle', 'disque', 'flux', 'instance', 'ok', 'porte', 'quotasRefus', 'sha', 'sms', 'uptimeS', 'version']);
      vrai('⛔ aucun identifiant de personne ni de conversation dans /health', !/\b[pcm]_[0-9a-f]{32}\b/.test(h.txt));
      v('⛔ /health PUBLIE le compteur de lignes illisibles (un nombre, jamais lesquelles) : c\'est ce que lit la surveillance', [h.j.base.illisibles, Object.keys(h.j.base).sort()], [0, ['illisibles', 'ok', 'schema']]);
      vrai('la boucle d\'événements est mesurée (p99 en ms)', typeof h.j.boucle.p99Ms === 'number');
      const autres = [].concat(...Object.values(os.networkInterfaces())).filter(i => i.family === 'IPv4' && !i.internal).map(i => i.address);
      let atteint = [];
      for (const ip of autres) { try { const r = await fetch('http://' + ip + ':' + svc.port + '/health', { signal: AbortSignal.timeout(1500) }); atteint.push(ip + ' ' + r.status); } catch (e) {} }
      v('⛔ le service n\'est PAS joignable par une autre interface que 127.0.0.1 (' + autres.length + ' adresse(s) essayée(s))', atteint, []);
      vrai('témoin : il répond bien sur 127.0.0.1 (le refus ci-dessus n\'est pas une panne générale)', h.code === 200);
    }

    console.log('\nEn-têtes de sécurité sur TOUTES les réponses, et aucun CORS');
    {
      const c = T.client(svc.base);
      const pages = [['/health', 'GET'], ['/', 'GET'], ['/api.js', 'GET'], ['/api/config', 'GET'], ['/api/moi', 'GET'], ['/inexistant', 'GET']];
      for (const [p] of pages) {
        const r = await c.get(p);
        const csp = r.h.get('content-security-policy') || '';
        vrai(p + ' : CSP stricte (script-src \'self\', default-src \'none\', frame-ancestors \'none\', base-uri \'none\'), nosniff, no-referrer, COOP/CORP same-origin',
          /default-src 'none'/.test(csp) && /script-src 'self'/.test(csp) && /frame-ancestors 'none'/.test(csp) && /base-uri 'none'/.test(csp) && !/script-src[^;]*unsafe/.test(csp)
          && r.h.get('x-content-type-options') === 'nosniff' && r.h.get('referrer-policy') === 'no-referrer'
          && r.h.get('cross-origin-opener-policy') === 'same-origin' && r.h.get('cross-origin-resource-policy') === 'same-origin' && r.h.get('permissions-policy') === 'camera=(), microphone=()');
        const cors = Array.from(r.h.keys()).filter(k => /^access-control-/.test(k));
        v('⛔ ' + p + ' : AUCUN en-tête Access-Control-*', cors, []);
      }
      vrai('le serveur ne dit pas qu\'il est Express (X-Powered-By absent)', !(await c.get('/health')).h.get('x-powered-by'));
      const pre = await fetch(svc.base + '/api/moi', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-opm' } });
      vrai('⛔ une requête préalable (OPTIONS) d\'un autre site ne reçoit AUCUNE permission : le navigateur bloquera', !pre.headers.get('access-control-allow-origin') && !pre.headers.get('access-control-allow-headers') && pre.status !== 204);
      for (const chemin of ['/API/moi', '/Api/conversations', '/api/moi']) {
        const r = await c.get(chemin);
        vrai('⛔ ' + chemin + ' : « Cache-Control: no-store » quelle que soit la CASSE du préfixe (le routeur d\'Express répond à `/API/moi` — relecture du gardien)', /no-store/.test(r.h.get('cache-control') || ''));
      }
      vrai('HSTS absent en http local (un bac d\'essai n\'apprend pas à refuser le http), pas de Cache-Control public sur l\'API', !(await c.get('/api/config')).h.get('strict-transport-security') && /no-store/.test((await c.get('/api/config')).h.get('cache-control')));
    }

    console.log('\nLe front statique : la page, le client, rien d\'autre');
    {
      const c = T.client(svc.base);
      const idx = await c.get('/');
      vrai('/ sert la page (HTML, trois scripts externes — api.js, source-serveur.js, opmsg-ui.js —, aucun script en ligne)', idx.code === 200 && /text\/html/.test(idx.h.get('content-type')) && !/<script(?![^>]*\bsrc=)[^>]*>/i.test(idx.txt) && (idx.txt.match(/<script\b/gi) || []).length === 3);
      vrai('api.js, source-serveur.js et opmsg-ui.js sont servis (javascript) ; l\'ancien ui.js de l\'étape 1 ne l\'est plus', (await c.get('/api.js')).code === 200 && /javascript/.test((await c.get('/source-serveur.js')).h.get('content-type')) && /javascript/.test((await c.get('/opmsg-ui.js')).h.get('content-type')) && (await c.get('/ui.js')).code === 404);
      for (const p of ['/../config.js', '/..%2fconfig.js', '/%2e%2e/%2e%2e/etc/passwd', '/.env', '/.git/config', '/stockage.js', '/index.js', '/package.json', '/node_modules/express/package.json', '/public/index.html']) {
        const r = await c.get(p);
        v('⛔ ' + p + ' → 404 (ni code du service, ni dossier caché, ni sortie du dossier public)', r.code === 404 || r.code === 400, true);
      }
      const head = await fetch(svc.base + '/', { method: 'HEAD' });
      vrai('HEAD / fonctionne', head.status === 200);
      const mal = await c.get('/api/personnes/%E0%A4%A');
      v('un chemin mal encodé est un 400 propre, pas un 500 ni une pile', [mal.code, mal.j && mal.j.error], [400, 'requete_invalide']);
    }

    console.log('\nLa porte bêta : bons identifiants, mauvais, coupé — et ce que le service dit à OP GESTION');
    {
      const c = T.client(svc.base);
      const avant = og.appels.length;
      const r = await c.post('/api/beta/entrer', { login: 'ALICE', pass: 'pw-alice-1234' });
      v('un accès ouvert entre (200), identifiant normalisé en minuscules', [r.code, r.j.ok, r.j.moi.prenom, r.j.moi.verifie, r.j.moi.origine], [200, true, 'Alice Martin', true, 'beta']);
      const sc = r.h.getSetCookie()[0];
      vrai('⛔ le cookie : HttpOnly, SameSite=Strict, Path=/, Max-Age de 30 jours (le JavaScript de la page ne le voit jamais)', /^opm=opm_[A-Za-z0-9_-]{43}; /.test(sc) && /HttpOnly/.test(sc) && /SameSite=Strict/.test(sc) && /Path=\//.test(sc) && /Max-Age=2592000/.test(sc));
      vrai('⛔ le jeton n\'est PAS dans le corps de la réponse (il ne vit que dans le cookie HttpOnly)', !/opm_[A-Za-z0-9_-]{43}/.test(r.txt));
      const appel = logins(avant)[0];
      v('OP GESTION a reçu exactement {login, pass, app:\'messages\'}, la route /api/beta/login, une seule fois (⛔ `app` : sans lui, un accès d\'OP GESTION entrerait ici)', [logins(avant).length, appel.chemin, appel.corps], [1, '/api/beta/login', { login: 'alice', pass: 'pw-alice-1234', app: 'messages' }]);
      vrai('⛔ sans proxy devant, l\'adresse transmise est celle du client (la boucle locale), jamais vide', /^(::ffff:)?127\.0\.0\.1$/.test(appel.xff || ''));
      const moi = await c.get('/api/moi');
      v('le cookie ouvre la session : /api/moi rend la personne', [moi.code, moi.j.moi.id === r.j.moi.id], [200, true]);

      const r2 = await T.client(svc.base).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' });
      v('⛔ se reconnecter retrouve LA MÊME personne (pas de doublon par session)', [r2.j.moi.id === r.j.moi.id, nb(svc, 'personne')], [true, 1]);

      const mauvais = await T.client(svc.base).post('/api/beta/entrer', { login: 'alice', pass: 'faux-faux-faux' });
      const inconnu = await T.client(svc.base).post('/api/beta/entrer', { login: 'personne-ici', pass: 'faux-faux-faux' });
      v('⛔ mauvais mot de passe et identifiant inconnu : MÊME réponse (401 identifiants) — la porte ne dit pas quels accès existent', [mauvais.code, mauvais.txt, inconnu.code, inconnu.txt], [401, '{"error":"identifiants"}', 401, '{"error":"identifiants"}']);
      vrai('un échec ne pose aucun cookie', !mauvais.h.getSetCookie().length);
      const coupe = await T.client(svc.base).post('/api/beta/entrer', { login: 'coupe', pass: 'pw-coupe-123' });
      v('un accès coupé depuis la Tour, avec le bon mot de passe : 403 acces_coupe, pas de cookie', [coupe.code, coupe.j.error, coupe.h.getSetCookie().length], [403, 'acces_coupe', 0]);
      for (const [nom, corps] of [['sans corps', undefined], ['login non texte', { login: 5, pass: 'x' }], ['mot de passe vide', { login: 'alice', pass: '' }], ['mot de passe de 201 caractères', { login: 'alice', pass: 'x'.repeat(201) }], ['identifiant de forme invalide', { login: 'a b', pass: 'xxxxxxxx' }], ['identifiant trop court', { login: 'ab', pass: 'xxxxxxxx' }]]) {
        const e = await T.client(svc.base).post('/api/beta/entrer', corps);
        v(nom + ' → 400 champ_invalide, OP GESTION n\'est même pas appelé', [e.code, e.j && e.j.error], [400, 'champ_invalide']);
      }
      const n0 = og.appels.length;
      await T.client(svc.base).post('/api/beta/entrer', { login: 'a b', pass: 'xxxxxxxx' });
      v('⛔ une entrée mal formée n\'atteint pas OP GESTION (aucun relais de n\'importe quoi)', logins(n0).length, 0);
    }

    console.log('\n⛔ La porte est FERMÉE PAR DÉFAUT : quand OP GESTION se tait, personne n\'entre');
    {
      const pers0 = nb(svc, 'personne'), sess0 = nb(svc, 'session');
      vrai('population : la base contient déjà des personnes et des sessions (le « zéro » d\'après aurait pu être autre chose)', pers0 >= 1 && sess0 >= 2);
      const cas = [['panne (connexion coupée)', { mode: 'panne' }], ['réponse 500', { mode: '500' }], ['réponse HTML au lieu de JSON', { mode: 'html' }], ['route absente (404)', { mode: '404' }], ['délai dépassé', { mode: 'normal', delaiMs: 1500 }]];
      for (const [nom, reglage] of cas) {
        Object.assign(og, { mode: 'normal', delaiMs: 0 }, reglage);
        const c = T.client(svc.base), t0 = Date.now();
        const r = await c.post('/api/beta/entrer', { login: 'bob', pass: 'pw-bob-12345' });
        v('⛔ ' + nom + ' → 503 porte_indisponible, aucun cookie', [r.code, r.j.error, c.cookie()], [503, 'porte_indisponible', null]);
        if (reglage.delaiMs) vrai('et le délai est BORNÉ (500 ms configurées, le service n\'attend pas la réponse)', Date.now() - t0 < 1400);
      }
      Object.assign(og, { mode: '429', delaiMs: 0 });
      const r429 = await T.client(svc.base).post('/api/beta/entrer', { login: 'bob', pass: 'pw-bob-12345' });
      v('OP GESTION verrouille (429) → le service relaie un 429 avec Retry-After', [r429.code, r429.j.error, r429.h.get('retry-after')], [429, 'verrouille', '900']);
      Object.assign(og, { mode: 'normal', delaiMs: 0 });
      v('⛔ rien n\'a été créé par ces échecs (ni personne, ni session)', [nb(svc, 'personne'), nb(svc, 'session')], [pers0, sess0]);
      const bad = og.comptes; og.comptes = Object.assign({}, bad, { etrange: { pass: 'pw-etrange-123', nom: 'X', actif: true } });
      const orig = og.comptes.etrange;
      // une réponse « ok » qui renvoie un identifiant de forme invalide n'ouvre rien
      const srv = require('http').createServer((q, s) => { let b = ''; q.on('data', d => { b += d; }); q.on('end', () => { s.writeHead(200, { 'Content-Type': 'application/json' }); s.end(JSON.stringify({ ok: true, login: 'A B<script>', nom: 'X' })); }); });
      const port = await T.portLibre(); await new Promise(r => srv.listen(port, '127.0.0.1', r));
      const svc2 = await T.lancerService({ urlGestion: 'http://127.0.0.1:' + port });
      const rr = await T.client(svc2.base).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' });
      v('⛔ « ok » avec un identifiant de forme invalide → fermé (503), aucune personne créée', [rr.code, rr.j.error], [503, 'porte_indisponible']);
      await svc2.arreter(); await new Promise(r => srv.close(r)); void orig;
    }

    console.log('\nL\'adresse vue par OP GESTION est celle de la personne (X-Forwarded-For du proxy), jamais celle du VPS');
    {
      const n0 = og.appels.length;
      await T.client(svc.base).post('/api/beta/entrer', { login: 'bob', pass: 'pw-bob-12345' }, { entetes: { 'X-Forwarded-For': '203.0.113.9' } });
      await T.client(svc.base).post('/api/beta/entrer', { login: 'bob', pass: 'pw-bob-12345' }, { entetes: { 'X-Forwarded-For': '10.0.0.1, 6.6.6.6, 203.0.113.77' } });
      const vus = logins(n0).map(a => a.xff);
      v('⛔ derrière un proxy : OP GESTION reçoit l\'entrée posée par NOTRE proxy (la dernière) — les entrées forgées devant sont ignorées', vus, ['203.0.113.9', '203.0.113.77']);
    }

    console.log('\nUne écriture exige l\'origine de l\'application ET l\'en-tête maison');
    {
      const c = await T.connecter(svc, og, 'bob', 'pw-bob-12345');
      const cas = [
        ['sans Origin', { sansOrigine: true }, 403, 'origine_refusee'],
        ['Origin d\'un autre site', { origin: 'https://evil.example' }, 403, 'origine_refusee'],
        ['Origin « null » (page sandboxée, formulaire local)', { origin: 'null' }, 403, 'origine_refusee'],
        ['Origin de même hôte mais d\'un autre port', { origin: 'http://127.0.0.1:1' }, 403, 'origine_refusee'],
        ['bonne Origin, sans l\'en-tête maison', { sansEntete: true }, 403, 'entete_requis'],
      ];
      for (const [nom, extra, code, err] of cas) {
        const r = await c.post('/api/moi/maj', { statut: 'piraté' }, extra);
        v('⛔ ' + nom + ' → ' + code + ' ' + err, [r.code, r.j && r.j.error], [code, err]);
      }
      v('⛔ et rien n\'a été écrit par ces refus (le statut n\'a pas bougé)', (await c.get('/api/moi')).j.moi.statut, '');
      v('avec l\'origine ET l\'en-tête, l\'écriture passe', [(await c.post('/api/moi/maj', { statut: 'ok' })).code, (await c.get('/api/moi')).j.moi.statut], [200, 'ok']);
      v('⛔ l\'en-tête maison doit valoir exactement 1', (await c.post('/api/moi/maj', { statut: 'x' }, { sansEntete: true, entetes: { 'X-OPM': '0' } })).code, 403);
      v('une LECTURE n\'a pas besoin d\'Origin (un navigateur n\'en envoie pas sur un GET de même origine)', (await c.get('/api/moi')).code, 200);
      v('⛔ un cookie volé ne suffit pas à écrire depuis un autre site (Origin refusée même avec une session valide)', (await T.client(svc.base).post('/api/moi/maj', { statut: 'x' }, { origin: 'https://evil.example', entetes: { Cookie: c.enteteCookie() } })).code, 403);
    }

    console.log('\nCorps : JSON seulement, 64 Ko au plus, jamais d\'identité lue dans le corps');
    {
      const c = await T.connecter(svc, og, 'bob', 'pw-bob-12345');
      v('⛔ un corps de plus de 64 Ko → 413 trop_gros', (await c.post('/api/moi/maj', { statut: 'x'.repeat(70000) })).j.error, 'trop_gros');
      v('un JSON cassé → 400 json_invalide', [(await c.post('/api/moi/maj', '{pas du json')).code, (await c.post('/api/moi/maj', '{pas du json')).j.error], [400, 'json_invalide']);
      v('un corps non JSON (text/plain) n\'est pas interprété : champ manquant, pas d\'exécution', (await c.post('/api/conversations/groupe', 'nom=x', { entetes: { 'Content-Type': 'text/plain' } })).code, 400);
      v('un tableau à la place de l\'objet → 400', (await c.post('/api/conversations/groupe', [1, 2])).code, 400);
      v('⛔ `prenom` ne passe pas par `__proto__` (pollution de prototype refusée)', [(await c.post('/api/moi/maj', JSON.parse('{"__proto__":{"admin":true},"prenom":"Bob"}'))).code, ({}).admin], [200, undefined]);
    }

    console.log('\nUn accès coupé depuis la Tour ferme la session ET le flux ; une panne d\'OP GESTION n\'éjecte personne');
    {
      const a = await T.connecter(svc, og, 'alice', 'pw-alice-1234'), b = await T.connecter(svc, og, 'bob', 'pw-bob-12345');
      const fb = await T.flux(b), fa = await T.flux(a);
      v('population : deux flux ouverts, deux sessions valides', [fb.statut, fa.statut, (await a.get('/api/moi')).code, (await b.get('/api/moi')).code], [200, 200, 200, 200]);
      // 1. une panne d'OP GESTION pendant plusieurs relectures n'éjecte PERSONNE
      og.mode = 'panne'; const n0 = og.appels.length;
      await T.attendre(() => og.appels.length - n0 >= 4, 6000);
      vrai('population : le service a relu l\'état au moins 4 fois pendant la panne (la relecture tourne vraiment)', og.appels.length - n0 >= 4);
      v('⛔ pendant la panne, personne n\'est éjecté (on ne sait pas : on ne coupe pas)', [(await a.get('/api/moi')).code, (await b.get('/api/moi')).code, fb.ferme], [200, 200, false]);
      const sante = (await T.client(svc.base).get('/health')).j.porte;
      vrai('la panne se voit dans /health (relecturesEchec > 0)', sante.relecturesEchec >= 1);
      og.mode = 'normal';
      await T.attendre(async () => (await T.client(svc.base).get('/health')).j.porte.relecturesEchec === 0, 6000);
      // 2. la Tour coupe Bob
      og.comptes.bob.actif = false;
      const fin = await fb.attendre(e => e.event === 'fin', 8000);
      vrai('⛔ le flux de Bob reçoit « fin (session) » puis se ferme, SANS action de sa part', fin && fin.data.motif === 'session' && await fb.attendreFerme(3000));
      const apres = await b.get('/api/moi');
      v('⛔ sa session est supprimée : son cookie ne sert plus (401 session_requise)', [apres.code, apres.j.error], [401, 'session_requise']);
      v('Alice, dont l\'accès reste ouvert, n\'est pas touchée (session valide, flux ouvert)', [(await a.get('/api/moi')).code, fa.ferme], [200, false]);
      const rentree = await T.client(svc.base).post('/api/beta/entrer', { login: 'bob', pass: 'pw-bob-12345' });
      v('et Bob ne peut pas rentrer tant que l\'accès est coupé', [rentree.code, rentree.j.error], [403, 'acces_coupe']);
      og.comptes.bob.actif = true;
      v('rouvert depuis la Tour, il rentre de nouveau', (await T.client(svc.base).post('/api/beta/entrer', { login: 'bob', pass: 'pw-bob-12345' })).code, 200);
      fa.fermer(); fb.fermer();
    }

    console.log('\nLa relecture des accès : UNE requête pour tous (le plafond d\'OP GESTION est de 20 par minute), et ce qu\'OP GESTION ne dit pas ne coupe personne');
    {
      const N = 30, clients = [];
      for (let i = 1; i <= N; i++) og.comptes['usr' + i] = { pass: 'pw-usr' + i + '-12345', nom: 'Usr' + i, actif: true };
      for (let i = 1; i <= N; i++) clients.push(await T.connecter(svc, og, 'usr' + i, 'pw-usr' + i + '-12345'));
      const n0 = og.appels.length;
      await T.attendre(() => og.appels.slice(n0).filter(a => a.chemin === '/api/beta/etat').length >= 3, 8000);
      const etats = og.appels.slice(n0).filter(a => a.chemin === '/api/beta/etat');
      vrai('population : trois relectures vues, ' + N + ' sessions bêta ouvertes', etats.length >= 3);
      vrai('⛔ CHAQUE relecture est UNE requête portant la liste des identifiants de compte (pas une par accès : 20 par minute au plus chez OP GESTION)',
        etats.every(a => Array.isArray(a.corps.ids) && a.corps.ids.length >= N && a.corps.login === undefined && a.corps.app === 'messages' && a.corps.ids.every(x => /^b[0-9a-f]{10}$/.test(x))));
      // Un OP GESTION qui répond sans rien dire (ou à l'ancienne) ne coupe PERSONNE.
      og.mode = 'etat_vide';
      const m0 = og.appels.length;
      await T.attendre(() => og.appels.slice(m0).filter(a => a.chemin === '/api/beta/etat').length >= 3, 8000);
      v('⛔ une réponse qui ne mentionne personne ne coupe personne (absent ≠ coupé)', [(await clients[0].get('/api/moi')).code, (await clients[N - 1].get('/api/moi')).code], [200, 200]);
      og.mode = 'etat_ancien';
      const m1 = og.appels.length;
      await T.attendre(() => og.appels.slice(m1).filter(a => a.chemin === '/api/beta/etat').length >= 3, 8000);
      v('⛔ un OP GESTION d\'avant (réponse `ouvert` sans `ouverts`) ne coupe personne non plus', [(await clients[0].get('/api/moi')).code, (await clients[N - 1].get('/api/moi')).code], [200, 200]);
      vrai('   et la relecture le SAIT : relecturesEchec monte', (await T.client(svc.base).get('/health')).j.porte.relecturesEchec >= 1);
      og.mode = 'normal';
      // Couper le PREMIER et le DERNIER de trente : avec une requête par accès, le plafond d'OP GESTION (429) en laissait deux ouverts.
      og.comptes.usr1.actif = false; og.comptes['usr' + N].actif = false;
      const coupes = await T.attendre(async () => (await clients[0].get('/api/moi')).code === 401 && (await clients[N - 1].get('/api/moi')).code === 401, 8000);
      vrai('⛔ le premier ET le dernier accès coupés voient leur session fermée', !!coupes);
      v('   les vingt-huit autres sont intacts', (await Promise.all(clients.slice(1, N - 1).map(c => c.get('/api/moi')))).filter(r => r.code === 200).length, N - 2);
    }

    console.log('\nUne personne est un COMPTE, pas un texte : un accès supprimé puis recréé sous le même login est une autre personne');
    {
      og.comptes.rose = { id: 'b0000aaaa01', pass: 'pw-rose-12345', nom: 'Rose', actif: true };
      const r1 = await T.client(svc.base).post('/api/beta/entrer', { login: 'rose', pass: 'pw-rose-12345' });
      await T.client(svc.base).post('/api/beta/entrer', { login: 'rose', pass: 'pw-rose-12345' });
      const rose1 = r1.j.moi.id;
      const c1 = T.client(svc.base); const e1 = await c1.post('/api/beta/entrer', { login: 'rose', pass: 'pw-rose-12345' });
      v('la même personne se reconnaît à son compte (même identifiant à chaque entrée)', e1.j.moi.id, rose1);
      og.comptes.rose = { id: 'b0000bbbb02', pass: 'pw-rose-12345', nom: 'Rose', actif: true };   // supprimée, recréée : même login, AUTRE compte
      const e2 = await T.client(svc.base).post('/api/beta/entrer', { login: 'rose', pass: 'pw-rose-12345' });
      vrai('⛔ le nouveau compte « rose » n\'est PAS la personne de l\'ancien (pas ses contacts, ses conversations, ses confidences)', e2.code === 200 && e2.j.moi.id !== rose1);
      // Un OP GESTION qui ne rend pas d'identifiant (trop ancien) ferme la porte plutôt que de retomber sur le login.
      og.mode = 'sans_id';
      const e3 = await T.client(svc.base).post('/api/beta/entrer', { login: 'rose', pass: 'pw-rose-12345' });
      v('⛔ une réponse de connexion SANS identifiant de compte : 503 porte_indisponible (on ne retombe jamais sur le texte du login)', [e3.code, e3.j.error], [503, 'porte_indisponible']);
      // Un OP GESTION d'AVANT `apps` ignore `app` et dit « ok » à tout accès de sa bêta : la porte exige qu'il DISE « messages », sinon elle reste fermée.
      og.mode = 'normal';
      const c4 = T.client(svc.base); await c4.post('/api/beta/entrer', { login: 'rose', pass: 'pw-rose-12345' });
      og.mode = 'sans_apps';
      const e4 = await T.client(svc.base).post('/api/beta/entrer', { login: 'rose', pass: 'pw-rose-12345' });
      v('⛔ une réponse de connexion qui ne dit pas « messages » dans `apps` (un OP GESTION d\'avant) : 503 porte_indisponible, personne n\'entre', [e4.code, e4.j.error], [503, 'porte_indisponible']);
      og.mode = 'etat_sans_app';
      const m2 = og.appels.length;
      await T.attendre(() => og.appels.slice(m2).filter(a => a.chemin === '/api/beta/etat').length >= 3, 8000);
      v('⛔ une relecture sans l\'écho de `app` (un OP GESTION d\'avant, qui répond « false » à tous) ne coupe PERSONNE', [(await c4.get('/api/moi')).code], [200]);
      vrai('   et la relecture le SAIT : relecturesEchec monte', (await T.client(svc.base).get('/health')).j.porte.relecturesEchec >= 1);
      og.mode = 'normal';
    }

    console.log('\nDéconnexion, session expirée (horloge avancée), cookie invalide');
    {
      const c = await T.connecter(svc, og, 'alice', 'pw-alice-1234');
      const ancien = c.cookie();
      const f = await T.flux(c);
      const r = await c.post('/api/compte/deconnexion');
      vrai('la déconnexion répond 200 et efface le cookie (Max-Age=0)', r.code === 200 && /Max-Age=0/.test(r.h.getSetCookie()[0]));
      vrai('⛔ le flux ouvert de cette session se ferme avec elle', !!(await f.attendre(e => e.event === 'fin', 5000)) && await f.attendreFerme(3000));
      c.poserCookie(ancien);
      v('⛔ l\'ancien jeton rejoué après la déconnexion est mort (la session est SUPPRIMÉE côté serveur)', (await c.get('/api/moi')).code, 401);
      for (const [nom, val] of [['jeton de forme invalide', 'abc'], ['jeton de la bonne forme mais inconnu', 'opm_' + 'A'.repeat(43)], ['jeton hexadécimal de 64 caractères (celui d\'OP GESTION)', 'a'.repeat(64)]]) {
        c.poserCookie(val);
        v(nom + ' → 401', (await c.get('/api/moi')).j.error, 'session_requise');
      }
      const d = await T.connecter(svc, og, 'alice', 'pw-alice-1234');
      v('population : une session neuve fonctionne', (await d.get('/api/moi')).code, 200);
      svc.avancer(31 * 86400000);
      v('⛔ trente jours plus tard sans usage, la session est expirée (401)', (await d.get('/api/moi')).code, 401);
      svc.avancer(-31 * 86400000);
    }

    console.log('\nUne session glisse : l\'usage repousse l\'échéance (une écriture par heure au plus)');
    {
      const d = await T.connecter(svc, og, 'alice', 'pw-alice-1234');
      svc.avancer(20 * 86400000);
      await d.get('/api/moi');   // touchée : vu > 1 h → l'échéance recule de 30 jours
      svc.avancer(20 * 86400000);   // 40 jours après la connexion : sans glissement elle serait morte
      v('⛔ 20 jours + usage + 20 jours : encore valable (30 jours glissants)', (await d.get('/api/moi')).code, 200);
      svc.avancer(-40 * 86400000);
    }

    console.log('\nL\'instance de production n\'a PAS de porte bêta');
    {
      const og2 = await T.fauxOpGestion(COMPTES());
      const prod = await T.lancerService({ instance: 'prod', urlGestion: og2.url });
      const r = await T.client(prod.base).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' });
      v('⛔ /api/beta/entrer sur la prod → 404, et OP GESTION n\'a reçu AUCUN appel', [r.code, og2.appels.length], [404, 0]);
      v('/health dit « prod » et n\'a pas d\'état de porte', [(await T.client(prod.base).get('/health')).j.instance, (await T.client(prod.base).get('/health')).j.porte], ['prod', null]);
      await prod.arreter(); await og2.fermer();
    }

    console.log('\nUne origine non configurée retombe sur « même hôte » (jamais sur « tout »)');
    {
      const s3 = await T.lancerService({ urlGestion: og.url, config: { origines: null } });
      const c = T.client(s3.base);
      v('Origin = l\'hôte demandé → passe', (await c.post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' })).code, 200);
      v('⛔ Origin d\'un autre site → refusée', (await c.post('/api/moi/maj', { statut: 'x' }, { origin: 'https://evil.example' })).code, 403);
      v('⛔ sans Origin → refusée', (await c.post('/api/moi/maj', { statut: 'x' }, { sansOrigine: true })).code, 403);
      await s3.arreter();
    }

    console.log('\nLe cookie « __Host- » de production : Secure, HSTS (configuration par défaut)');
    {
      const s4 = await T.lancerService({ urlGestion: og.url, config: { cookie: { nom: '__Host-opm', secure: true } } });
      const r = await T.client(s4.base, { nomCookie: '__Host-opm' }).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' });
      const sc = r.h.getSetCookie()[0];
      vrai('⛔ __Host-opm ; Path=/ ; HttpOnly ; SameSite=Strict ; Secure (et sans Domain : c\'est ce que « __Host- » exige)', /^__Host-opm=opm_/.test(sc) && /; Secure/.test(sc) && /HttpOnly/.test(sc) && /SameSite=Strict/.test(sc) && /Path=\//.test(sc) && !/Domain=/i.test(sc));
      vrai('⛔ HSTS posé quand le cookie est Secure (le service parle https derrière le proxy)', /max-age=\d+/.test((await T.client(s4.base).get('/health')).h.get('strict-transport-security') || ''));
      await s4.arreter();
    }

    console.log('\nLe plancher d\'espace disque : les écritures refusent (503), la lecture continue');
    {
      const s5 = await T.lancerService({ urlGestion: og.url, config: { disqueMinMo: 1e12 } });
      const c = T.client(s5.base);
      const e = await c.post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' });
      v('⛔ une écriture est refusée 503 disque_plein (même la connexion : elle crée une session)', [e.code, e.j.error], [503, 'disque_plein']);
      v('la lecture (/health) répond, et dit « disque bas »', [(await c.get('/health')).code, (await c.get('/health')).j.disque.bas], [200, true]);
      await s5.arreter();
    }

    console.log('\nUne MAUVAISE clé : le service refuse de démarrer (témoin), sans afficher la clé');
    {
      const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-903-cle-'));
      const s6 = await T.lancerService({ dossier, urlGestion: og.url });
      await T.client(s6.base).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' });
      await s6.arreter(false);
      const autre = require('crypto').randomBytes(32).toString('hex');
      let erreur = null;
      try { const s7 = await T.lancerService({ dossier, cle: autre, urlGestion: og.url, attendreSante: true }); await s7.arreter(false); } catch (e) { erreur = e.message; }
      vrai('⛔ avec une autre clé sur la même base, le service NE démarre PAS', erreur && /n'a pas démarré/.test(erreur));
      vrai('⛔ la sortie dit « cle_incorrecte » et ne contient NI la bonne clé NI la mauvaise', erreur && /cle_incorrecte/.test(erreur) && !erreur.includes(s6.cle) && !erreur.includes(autre));
      const s8 = await T.lancerService({ dossier, cle: s6.cle, urlGestion: og.url });
      v('contre-épreuve : avec la bonne clé la même base redémarre, la personne y est encore', (await T.client(s8.base).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' })).j.moi.prenom, 'Alice Martin');
      await s8.arreter(false);
      fs.rmSync(dossier, { recursive: true, force: true });
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1500));
    process.exitCode = 1;
  }
  await svc.arreter(); await og.fermer();
  fin();
})();
