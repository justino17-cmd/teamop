/* ⛔ CE QUE CE FICHIER GARDE — L'ENVOI PAR OVHcloud, FAIT MAIN : UN FAUX OVH LOCAL QUI RECALCULE LA SIGNATURE (famille 2 de SERVEUR.md § 3.11).

   `server-msg/sms-ovh.js` monté seul, contre un FAUX OVH (un petit serveur HTTP local) qui fait ce que fait le vrai : lire l'heure
   (`GET /auth/time`), puis REFUSER toute requête dont la signature « $1$ » + SHA-1(secret+clé+méthode+URL+corps+horodatage) ne se
   recalcule pas à l'identique — avec SON propre calcul, écrit ici, jamais celui du module (un banc qui importe `signer` pour se
   vérifier se donne raison).

   Ce que ça garde :
     · la requête : `POST /sms/{service}/jobs`, les quatre en-têtes `X-Ovh-*`, le corps (message court, expéditeur, `noStopClause`
       vrai — un message transactionnel —, priorité haute) ;
     · la SIGNATURE, sur la méthode, l'URL complète, le corps et l'horodatage D'OVH (pas le nôtre) : une horloge qui dérive d'une
       heure signe quand même juste ;
     · les issues : un envoi réussi rend les crédits réellement retirés ; un numéro invalide est un refus franc ; des clés fausses, un
       droit manquant, un service inconnu sont un refus de CONFIGURATION ; un délai, une coupure EN ROUTE, un 500 sont INCERTAINS (le coût reste
       dans le budget : on ne sait pas si le SMS est parti) ; ce qui s'est passé AVANT l'envoi (heure d'OVH illisible, DNS, connexion refusée,
       503) est « non_envoye » : rien n'a pu partir, le coût et les plafonds sont rendus ;
     · ⛔ le module ne journalise rien et ne garde rien : ni numéro, ni texte (le code y est), ni clé.

   ⚠️ CE QUE CE BANC NE PEUT PAS DIRE : qu'OVH accepte vraiment cette signature. Il prouve que le module signe comme la documentation
   publique d'OVH le décrit ; l'envoi réel est un geste de Justin (`design/opmessages/INSTALLER-LE-SERVEUR.md`). */
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const OVH = require(path.join(T.SERVICE, 'sms-ovh.js'));

const APP = 'appkey-banc-1234', SECRET = 'secret-banc-ABCDEF123456', CONSUMER = 'consumer-banc-9876', SERVICE = 'sms-bb123456-1';
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

/* Le faux OVH. `etat.mode` : normal | invalide (numéro refusé) | 403 | 404 | 400 | 500 | pend (ne répond jamais) | sig401 (refuse la 1re signature). */
async function fauxOvh(decalageS = 0) {
  const etat = { mode: 'normal', appels: [], jobs: [], decalageS, signaturesFausses: 0, tempsLus: 0, refusees: 0 };
  const srv = http.createServer((req, res) => {
    let b = ''; req.on('data', d => { b += d; });
    req.on('end', () => {
      /* `sansGarder` : chaque réponse ferme sa connexion (« Connection: close »), le client n'en garde aucune ouverte — voir le
         refus de connexion, plus bas. */
      const entetes = type => Object.assign({ 'Content-Type': type }, etat.sansGarder ? { Connection: 'close' } : {});
      const rep = (code, o) => { res.writeHead(code, entetes('application/json')); res.end(JSON.stringify(o)); };
      if (req.url === '/1.0/auth/time' && etat.heure503) { etat.tempsLus++; return rep(503, { message: 'time indisponible' }); }
      if (req.url === '/1.0/auth/time') { etat.tempsLus++; res.writeHead(200, entetes('text/plain')); return res.end(String(Math.floor(Date.now() / 1000) + etat.decalageS)); }
      etat.appels.push({ m: req.method, u: req.url });
      if (etat.mode === 'pend') return;   // ne répond jamais
      if (etat.mode === 'coupe') { req.socket.destroy(); return; }   // la requête est ARRIVÉE, la connexion tombe avant toute réponse : on ne sait pas si le SMS est parti
      /* SA signature, recalculée à la main : secret + clé de consommateur + méthode + URL COMPLÈTE + corps + horodatage. */
      const urlComplete = etat.base + req.url.replace(/^\/1\.0/, '');
      const ts = req.headers['x-ovh-timestamp'];
      const attendue = '$1$' + sha1([SECRET, CONSUMER, req.method, urlComplete, b, ts].join('+'));
      const heureOvh = Math.floor(Date.now() / 1000) + etat.decalageS;
      const signeBien = req.headers['x-ovh-signature'] === attendue && req.headers['x-ovh-application'] === APP && req.headers['x-ovh-consumer'] === CONSUMER && Math.abs(parseInt(ts, 10) - heureOvh) <= 5;
      if (!signeBien) { etat.signaturesFausses++; return rep(401, { message: 'Invalid signature', class: 'Client::Unauthorized' }); }
      if (etat.mode === 'sig401' && !etat.vue401) { etat.vue401 = true; return rep(401, { message: 'Invalid timestamp' }); }
      if (etat.mode === '403') return rep(403, { message: 'This call has not been granted', class: 'Client::Forbidden' });
      if (etat.mode === '404') return rep(404, { message: 'The requested object (serviceName = x) does not exist', class: 'Client::NotFound' });
      if (etat.mode === '400') return rep(400, { message: 'Bad request' });
      if (etat.mode === '500') return rep(500, { message: 'Internal error' });
      if (etat.mode === '503') return rep(503, { message: 'Service Unavailable' });
      const m = /^\/1\.0\/sms\/([^/]+)\/jobs$/.exec(req.url);
      if (!m || req.method !== 'POST' || decodeURIComponent(m[1]) !== SERVICE) { etat.refusees++; return rep(404, { message: 'route inconnue' }); }
      let j = {}; try { j = JSON.parse(b); } catch (e) { return rep(400, { message: 'JSON' }); }
      etat.jobs.push(j);
      if (etat.mode === 'invalide') return rep(200, { totalCreditsRemoved: 0, validReceivers: [], invalidReceivers: j.receivers, ids: [] });
      rep(200, { totalCreditsRemoved: etat.credits === undefined ? 1.05 : etat.credits, validReceivers: j.receivers, invalidReceivers: [], ids: [123456], creditsLeft: 4000 });
    });
  });
  const port = await T.portLibre();
  await new Promise(r => srv.listen(port, '127.0.0.1', r));
  etat.base = 'http://127.0.0.1:' + port + '/1.0';
  etat.fermer = () => new Promise(r => { try { srv.closeAllConnections(); } catch (e) {} srv.close(() => r()); });
  return etat;
}
const cfg = (faux, extra) => ({ ovh: Object.assign({ appKey: APP, appSecret: SECRET, consumerKey: CONSUMER, serviceName: SERVICE, expediteur: 'OPMSG', urlBase: faux.base, timeoutMs: 1500 }, extra || {}), horloge: Date.now });

(async () => {
  console.log('\n── 913 · la requête signée, vue du faux OVH ──');
  {
    const faux = await fauxOvh();
    const o = OVH.creerOvh(cfg(faux));
    const r = await o.envoyer({ numero: '+32470123456', message: 'Votre code OP MESSAGES : 123456' });
    v('⛔ un envoi réussi : accepté par un OVH qui RECALCULE la signature de son côté', [r.ok, faux.signaturesFausses], [true, 0]);
    v('   les crédits réellement retirés sont rendus (le budget les compte à la place de l\'estimation)', r.credits, 1.05);
    v('   exactement UN job, exactement UN destinataire', [faux.jobs.length, faux.jobs[0].receivers], [1, ['+32470123456']]);
    v('   le message court, l\'expéditeur configuré', [faux.jobs[0].message, faux.jobs[0].sender], ['Votre code OP MESSAGES : 123456', 'OPMSG']);
    v('⛔ `noStopClause` vrai (un message transactionnel : pas de « STOP au 36… » facturé en plus) et priorité haute', [faux.jobs[0].noStopClause, faux.jobs[0].priority], [true, 'high']);
    vrai('   une durée de validité courte (un code qui arrive dans une heure ne sert plus à rien)', Number.isInteger(faux.jobs[0].validityPeriod) && faux.jobs[0].validityPeriod <= 60);
    v('   la route est bien POST /sms/{service}/jobs', faux.appels.filter(a => a.m === 'POST').map(a => a.u), ['/1.0/sms/' + SERVICE + '/jobs']);
    v('   et l\'heure a été lue chez OVH (une fois : elle se garde)', faux.tempsLus, 1);
    await o.envoyer({ numero: '+32470123457', message: 'x' });
    v('   un deuxième envoi ne relit pas l\'heure', faux.tempsLus, 1);
    await faux.fermer();
  }

  console.log('\n── 913 · la signature suit l\'heure d\'OVH, pas la nôtre ──');
  {
    const faux = await fauxOvh(3600);   // l'horloge d'OVH avance d'une heure sur la nôtre
    const o = OVH.creerOvh(cfg(faux));
    const r = await o.envoyer({ numero: '+32470123456', message: 'x' });
    v('⛔ une horloge qui dérive d\'une heure signe quand même juste (l\'horodatage est celui du serveur d\'OVH)', [r.ok, faux.signaturesFausses], [true, 0]);
    await faux.fermer();
  }
  {
    /* Contre-épreuve du faux : un client qui signerait avec NOTRE heure serait refusé — sinon le faux ne vérifie rien. */
    const faux = await fauxOvh(3600);
    const ts = Math.floor(Date.now() / 1000);
    const url = faux.base + '/sms/' + SERVICE + '/jobs', corps = JSON.stringify({ message: 'x', receivers: ['+32470123456'] });
    const r = await fetch(url, { method: 'POST', headers: { 'X-Ovh-Application': APP, 'X-Ovh-Consumer': CONSUMER, 'X-Ovh-Timestamp': String(ts), 'X-Ovh-Signature': '$1$' + sha1([SECRET, CONSUMER, 'POST', url, corps, ts].join('+')), 'Content-Type': 'application/json' }, body: corps });
    v('le faux REFUSE une signature faite avec l\'heure locale quand son horloge dérive (il vérifie bien l\'horodatage)', r.status, 401);
    const r2 = await fetch(url, { method: 'POST', headers: { 'X-Ovh-Application': APP, 'X-Ovh-Consumer': CONSUMER, 'X-Ovh-Timestamp': String(ts + 3600), 'X-Ovh-Signature': '$1$' + sha1(['mauvais-secret', CONSUMER, 'POST', url, corps, ts + 3600].join('+')), 'Content-Type': 'application/json' }, body: corps });
    v('   et une signature faite avec un MAUVAIS secret', r2.status, 401);
    const r3 = await fetch(url, { method: 'POST', headers: { 'X-Ovh-Application': APP, 'X-Ovh-Consumer': CONSUMER, 'X-Ovh-Timestamp': String(ts + 3600), 'X-Ovh-Signature': '$1$' + sha1([SECRET, CONSUMER, 'POST', url, corps + ' ', ts + 3600].join('+')), 'Content-Type': 'application/json' }, body: corps });
    v('   et une signature faite sur un corps différent de celui qui part', r3.status, 401);
    await faux.fermer();
  }

  console.log('\n── 913 · la signature elle-même (la fonction exportée), contre le calcul de la documentation ──');
  {
    const args = { appSecret: 'S', consumerKey: 'C', methode: 'POST', url: 'https://eu.api.ovh.com/1.0/sms/x/jobs', corps: '{"a":1}', horodatage: 1790000000 };
    v('« $1$ » + SHA-1 de secret+clé+méthode+URL+corps+horodatage, joints par « + »', OVH.signer(args), '$1$' + sha1('S+C+POST+https://eu.api.ovh.com/1.0/sms/x/jobs+{"a":1}+1790000000'));
    v('une requête sans corps (GET) : le corps est la chaîne vide, le « + » reste', OVH.signer(Object.assign({}, args, { methode: 'GET', corps: '' })), '$1$' + sha1('S+C+GET+https://eu.api.ovh.com/1.0/sms/x/jobs++1790000000'));
    for (const champ of ['appSecret', 'consumerKey', 'methode', 'url', 'corps', 'horodatage']) {
      vrai('⛔ changer ' + champ + ' change la signature (aucun champ n\'est ignoré)', OVH.signer(Object.assign({}, args, { [champ]: champ === 'horodatage' ? 1790000001 : String(args[champ]) + 'x' })) !== OVH.signer(args));
    }
  }

  console.log('\n── 913 · les issues : refus franc, configuration, incertain ──');
  {
    const faux = await fauxOvh();
    const o = OVH.creerOvh(cfg(faux));
    const essai = async (mode, extra) => { faux.mode = mode; Object.assign(faux, extra || {}); const r = await o.envoyer({ numero: '+32470123456', message: 'x' }); return r.ok ? 'ok' : r.genre; };
    v('un numéro que OVH déclare invalide → « numero » (refus franc : le coût est rendu)', await essai('invalide'), 'numero');
    v('⛔ 403 (droit manquant sur la clé) → « config » : un geste de Justin, pas un échec du client', await essai('403'), 'config');
    v('404 (service inconnu) → « config »', await essai('404'), 'config');
    v('400 → « refus » franc', await essai('400'), 'refus');
    v('⛔ 500 → « incertain » (on ne sait pas si le SMS est parti : le coût RESTE dans le budget)', await essai('500'), 'incertain');
    const t0 = Date.now();
    v('⛔ un délai dépassé (OVH ne répond jamais) → « incertain », en moins de quelques secondes', await essai('pend'), 'incertain');
    vrai('   et ça ne pend pas : le délai est tenu (' + (Date.now() - t0) + ' ms)', Date.now() - t0 < 6000);
    faux.mode = 'normal';
    v('et la voie revient quand le service revient', await essai('normal'), 'ok');
    await faux.fermer();
  }
  {
    /* ⛔ UNE CONNEXION GARDÉE OUVERTE QUE LE SERVEUR A FERMÉE N'EST PAS UNE CONNEXION REFUSÉE. Ce refus se jouait à la fin du bloc
       précédent, sur le même faux : `fetch` gardait des connexions ouvertes (keep-alive, et celle du délai dépassé, abandonnée sans
       réponse) et RÉÉCRIVAIT sur une prise que le faux venait de fermer — « other side closed » (UND_ERR_SOCKET), une coupure,
       donc « incertain », et le module a raison. Vert avec Node 22.22, rouge à chaque passage avec Node 22.23 (GitHub, et le VPS) :
       2 octobre 2026, les deux contrôles de main tombés sur ce seul ✗. Le refus a donc son faux à lui, qui ferme chaque connexion
       après sa réponse (« Connection: close »), et le banc PROUVE le scénario au lieu de le supposer : la cause vue par le client
       est notée, et elle doit être ECONNREFUSED. */
    const faux = await fauxOvh(); faux.sansGarder = true;
    const causes = [];
    const fetchNote = async (u, o) => { try { return await fetch(u, o); } catch (e) { causes.push((e && e.cause && e.cause.code) || (e && e.code) || (e && e.name) || '?'); throw e; } };
    const o = OVH.creerOvh(Object.assign(cfg(faux), { fetchImpl: fetchNote }));
    const r1 = await o.envoyer({ numero: '+32470123456', message: 'x' });
    vrai('   (témoin) le service répond et l\'heure d\'OVH est lue une fois — l\'envoi suivant ira donc droit au POST', r1.ok && faux.tempsLus === 1 && causes.length === 0);
    await faux.fermer();
    const r2 = await o.envoyer({ numero: '+32470123456', message: 'x' });
    v('⛔ une connexion REFUSÉE (le serveur n\'écoute plus : rien n\'a pu partir) → « non_envoye », PAS « incertain » : le coût et les plafonds sont rendus', r2.ok ? 'ok' : r2.genre, 'non_envoye');
    v('   (le scénario est bien un REFUS : la seule cause vue par le client est ECONNREFUSED, pas une prise morte réutilisée)', causes, ['ECONNREFUSED']);
  }
  console.log('\n── 913 · « incertain » ne couvre QUE ce qui a pu partir : l\'avant-envoi est « non_envoye » (relecture adverse) ──');
  {
    const faux = await fauxOvh();
    const o = OVH.creerOvh(cfg(faux));
    const essai = async (mode, extra) => { faux.mode = mode; Object.assign(faux, extra || {}); const r = await o.envoyer({ numero: '+32470123456', message: 'x' }); return r.ok ? 'ok' : r.genre; };
    faux.heure503 = true;
    v('⛔ l\'heure d\'OVH illisible (503 sur /auth/time) → « non_envoye » : la requête n\'est même pas écrite', await essai('normal'), 'non_envoye');
    vrai('   et AUCUN POST n\'est arrivé chez OVH', faux.appels.length === 0 && faux.jobs.length === 0);
    faux.heure503 = false;
    v('⛔ un 503 sur l\'envoi (« service indisponible » : le travail n\'a pas commencé) → « non_envoye »', await essai('503'), 'non_envoye');
    v('⛔ un 500 reste « incertain » (le travail a pu commencer)', await essai('500'), 'incertain');
    v('⛔ une connexion COUPÉE après l\'arrivée de la requête → « incertain » (le SMS est peut-être parti)', await essai('coupe'), 'incertain');
    vrai('   (la requête est bien arrivée chez OVH : ' + faux.appels.filter(a => a.m === 'POST').length + ' POST vus)', faux.appels.filter(a => a.m === 'POST').length >= 1);
    await faux.fermer();
  }
  {
    /* Un nom qui ne se résout pas : rien n'a pu partir non plus. */
    const o = OVH.creerOvh({ ovh: { appKey: APP, appSecret: SECRET, consumerKey: CONSUMER, serviceName: SERVICE, expediteur: 'OPMSG', urlBase: 'http://nom-inexistant.invalid/1.0', timeoutMs: 1500 }, horloge: Date.now });
    const r = await o.envoyer({ numero: '+32470123456', message: 'x' });
    v('⛔ un nom qui ne se résout pas (DNS) → « non_envoye »', r.genre, 'non_envoye');
  }
  {
    /* Une signature refusée pour cause d'horloge ne coûte rien : on relit l'heure d'OVH et on retente UNE fois. */
    const faux = await fauxOvh(); faux.mode = 'sig401';
    const o = OVH.creerOvh(cfg(faux));
    const r = await o.envoyer({ numero: '+32470123456', message: 'x' });
    v('un premier refus de signature (horloge) : l\'heure est relue et l\'envoi retenté UNE fois — il aboutit', [r.ok, faux.jobs.length, faux.tempsLus], [true, 1, 2]);
    await faux.fermer();
  }
  {
    const faux = await fauxOvh();
    const o = OVH.creerOvh(cfg(faux, { appSecret: 'un-autre-secret-xyz' }));
    const r = await o.envoyer({ numero: '+32470123456', message: 'x' });
    v('⛔ un mauvais secret : refusé (config), retenté UNE fois seulement — jamais en boucle', [r.ok, r.genre, faux.signaturesFausses, faux.jobs.length], [false, 'config', 2, 0]);
    await faux.fermer();
  }

  console.log('\n── 913 · ce module ne journalise rien et ne garde rien ──');
  {
    const src = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'sms-ovh.js'), 'utf8'));
    vrai('une fois les commentaires retirés il reste du code', src.split('\n').filter(l => l.trim()).length > 40);
    v('⛔ aucun `console.`, aucun `journaliser`, aucun `process.stdout` (le numéro et le code passent dans ce module)', /console\.|journaliser|process\.std|fs\.|writeFile/.test(src), false);
    vrai('   et il utilise `fetch`, aucune bibliothèque', /fetchImpl\(/.test(src) && !/require\((['"])(?!crypto)/.test(src));
    vrai('   ⛔ `redirect: \'error\'` : une redirection ne part pas ailleurs avec nos en-têtes signés', (src.match(/redirect: 'error'/g) || []).length >= 2);
    const sortie = new T.Sortie();
    const faux = await fauxOvh();
    const o = OVH.creerOvh(cfg(faux));
    const ecrit = []; const w1 = process.stdout.write, w2 = process.stderr.write;
    process.stdout.write = (c) => { ecrit.push(String(c)); return true; }; process.stderr.write = (c) => { ecrit.push(String(c)); return true; };
    try { await o.envoyer({ numero: '+32470123456', message: 'Votre code OP MESSAGES : 654321' }); faux.mode = '500'; await o.envoyer({ numero: '+32470123456', message: 'Votre code OP MESSAGES : 654321' }); }
    finally { process.stdout.write = w1; process.stderr.write = w2; }
    sortie.ajouter(ecrit.join(''));
    v('⛔ ni le numéro ni le code ni une clé sur la sortie, succès comme échec', [/470123456|654321|banc-1234|ABCDEF123456|consumer-banc/.test(sortie.texte())], [false]);
    await faux.fermer();
  }

  console.log('\n── 913 · la base d\'API : en production, seuls les points d\'entrée d\'OVH ──');
  {
    const R = OVH.URLS_OVH;
    v('Europe, Canada, États-Unis acceptés', ['https://eu.api.ovh.com/1.0', 'https://ca.api.ovh.com/1.0', 'https://api.us.ovhcloud.com/1.0'].map(u => R.test(u)), [true, true, true]);
    v('⛔ un autre hôte, une autre version, un schéma http, un hôte voisin : refusés (nos clés de signature ne partent pas ailleurs)', ['http://eu.api.ovh.com/1.0', 'https://eu.api.ovh.com.evil.fr/1.0', 'https://evil.eu.api.ovh.com/1.0', 'https://eu.api.ovh.com/2.0', 'https://127.0.0.1:9/1.0', 'https://eu.api.ovh.com/1.0/../x'].map(u => R.test(u)), Array(6).fill(false));
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
