/* test-999 — UN MINIMUM PAR APPLICATION ET PAR CANAL, RÉGLÉ DEPUIS LA TOUR (6 octobre 2026).
 *
 * Justin : « je veux qu'on sépare la version bêta et la version publique. Pour les mises à jour, je veux aussi le forçage de mise
 * à jour, comme sur OP GESTION depuis la Tour ; je veux le panneau OP MESSAGES, le panneau OP GESTION, et que tout soit bien séparé. »
 *
 * Ce banc lance le VRAI serveur d'OP GESTION, isolé (sa configuration, ses données, son port), avec à côté deux fausses instances
 * d'OP MESSAGES (leur `/api/config`) et une fausse beta.html — tout sur 127.0.0.1, jamais teamop.fr ni api.teamop.fr.
 *
 * Ce qu'il garde :
 *   · `/api/version` sans paramètre rend TOUJOURS le minimum PUBLIC d'OP GESTION — celui que lisent toutes les versions d'avant ;
 *   · chacun des trois autres canaux a SON minimum, et poser l'un ne bouge AUCUN des trois autres (la séparation elle-même) ;
 *   · la bêta d'OP GESTION ne va JAMAIS chez Firestore (`minFirestore` ne bouge pas) ;
 *   · « Exiger la dernière version » lit la version SERVIE par le canal, et échoue fermé (503) quand elle ne se lit pas ;
 *   · une instance d'OP MESSAGES éteinte se DIT injoignable ;
 *   · les routes d'OP MESSAGES sont de la console OP MESSAGES (un compte OP GESTION seul est refusé), et inversement ;
 *   · sans jeton de patron, rien ne se pose.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), http = require('http'), os = require('os');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const fin = () => { console.log('\n════ test-999 : ' + ok + ' ✓ ' + ko + ' ✗ ════'); process.exit(ko ? 1 : 0); };

const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-999-'));
let enfant = null; const serveurs = [];
function stop() { try { if (enfant && enfant.pid) process.kill(enfant.pid); } catch (e) {} for (const s of serveurs) try { s.close(); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} }
process.on('exit', stop);

/* un petit serveur local qui répond ce qu'on lui dit, et compte ses appels */
function faux(reponse) {
  const etat = { reponse, appels: 0, port: 0 };
  const s = http.createServer((q, r) => { etat.appels++; const x = etat.reponse(q); if (!x) { r.writeHead(500); return r.end(); } r.writeHead(x.statut || 200, { 'Content-Type': x.type || 'application/json' }); r.end(x.corps); });
  serveurs.push(s);
  return new Promise(ok => s.listen(0, '127.0.0.1', () => { etat.port = s.address().port; ok(etat); }));
}

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); fin(); }

  const MDP_TOUR = 'motdepasse-du-banc';
  const sha = x => crypto.createHash('sha256').update(String(x)).digest('hex');
  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: sha(MDP_TOUR) }));
  /* trois comptes de Tour : le patron, un collaborateur d'OP GESTION seul, un d'OP MESSAGES seul (monitor.json vit à côté de la configuration) */
  const MDP_C = 'un-mot-de-passe-long';
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [
    { id: 'upatron0001', nom: 'Banc', hash: sha(MDP_TOUR), role: 'patron', actif: true, ts: 1 },
    { id: 'ugestion001', nom: 'Gestionnaire', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['gestion'] },
    { id: 'umessage001', nom: 'Messager', hash: sha(MDP_C), role: 'collaborateur', actif: true, ts: 1, apps: ['messages'] } ] }));
  /* la version PUBLIQUE d'OP GESTION a déjà un minimum, confirmé chez Google : le banc vérifie que rien ne le touche */
  fs.writeFileSync(path.join(banc, 'data', 'versions.json'), JSON.stringify({ min: 760, minFirestore: 760, maj: 1, par: 'avant', canaux: { 'inconnu-x': { min: 9 } } }));

  const msgBeta = await faux(() => ({ corps: JSON.stringify({ version: '1', build: 'a1b2c3d4e5f6', instance: 'beta', min_client: 1, version_client: 14, comptes: { inscription: true, courriel: true } }) }));
  const msgProd = await faux(() => ({ corps: JSON.stringify({ version: '1', build: 'f6e5d4c3b2a1', instance: 'prod', min_client: 1, version_client: 12, comptes: { inscription: false, courriel: false } }) }));
  const pagePub = await faux(() => ({ type: 'text/html', corps: '<script>\nconst APP_VERSION = \'767\';\n</script>' }));
  const pageBeta = await faux(() => ({ type: 'text/html', corps: '<!doctype html><script>\nconst APP_VERSION = \'771-beta\';\n</script>' }));

  const PORT = 9100 + (process.pid % 90);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, {
      TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT),
      TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:' + msgBeta.port, TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:' + msgProd.port,
      TEAMOP_BETA_PAGE_URL: 'http://127.0.0.1:' + pageBeta.port + '/beta.html', TEAMOP_APP_PAGE_URL: 'http://127.0.0.1:' + pagePub.port + '/app.html' }),
    stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 80; i++) { try { await fetch(B + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  const req = async (methode, c, corps, hdr) => {
    const r = await fetch(B + c, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, hdr || {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { statut: r.status, j };
  };
  const get = (c, h) => req('GET', c, undefined, h), post = (c, b, h) => req('POST', c, b, h);
  const disque = () => JSON.parse(fs.readFileSync(path.join(banc, 'data', 'versions.json'), 'utf8'));

  try {
    console.log('\n── 999 · ce que lisent les applications (/api/version, public) ──');
    let r = await get('/api/version');
    v('sans paramètre : le minimum PUBLIC d\'OP GESTION, comme avant', [r.statut, r.j && r.j.min], [200, 760]);
    r = await get('/api/version?app=gestion&canal=prod');
    v('« gestion + prod » est le même', r.j && r.j.min, 760);
    for (const [q, k] of [['canal=beta', 'gestion-beta'], ['app=gestion&canal=beta', 'gestion-beta'], ['app=messages&canal=beta', 'messages-beta'], ['app=messages&canal=prod', 'messages-prod']]) {
      r = await get('/api/version?' + q);
      v('« ' + q + ' » : son canal, aucun minimum au départ', [r.statut, r.j && r.j.min, r.j && r.j.canal], [200, 0, k]);
    }
    r = await get('/api/version?app=messages');
    v('« messages » sans canal = sa version publique', r.j && r.j.canal, 'messages-prod');
    for (const q of ['app=gesiton', 'canal=bta', 'app=messages&canal=dev', 'app[]=x']) {
      r = await get('/api/version?' + q);
      v('⛔ « ' + q + ' » : 400, jamais le minimum d\'un autre canal', r.statut, 400);
    }

    console.log('\n── 999 · sans jeton de patron, rien ne se pose ──');
    r = await post('/api/monitor/messages/version-min', { canal: 'beta', min: 5 });
    v('⛔ OP MESSAGES : 403', r.statut, 403);
    r = await post('/api/monitor/version-min', { canal: 'beta', min: 5 });
    v('⛔ bêta d\'OP GESTION : 403', r.statut, 403);
    r = await get('/api/monitor/messages/versions');
    v('⛔ et la lecture demande une session (401)', r.statut, 401);

    const lg = await post('/api/monitor/login', { nom: 'Banc', pass: MDP_TOUR });
    v('connexion du patron à la Tour', lg.statut, 200);
    const AUTH = { authorization: 'Bearer ' + (lg.j && lg.j.token) };

    console.log('\n── 999 · la console OP GESTION : publique et bêta, côte à côte ──');
    r = await get('/api/monitor/version', AUTH);
    v('la Tour lit la publique (et la version que app.html sert, lue sur la page du banc)', [r.statut, r.j && r.j.min, r.j && r.j.minFirestore, r.j && r.j.versionEnLigne], [200, 760, 760, 767]);
    v('… et la bêta, à part : son minimum et la version que beta.html sert', r.j && r.j.beta && [r.j.beta.min, r.j.beta.versionEnLigne], [0, 771]);
    r = await post('/api/monitor/version-min', { canal: 'beta', min: 'ligne' }, AUTH);
    v('« Exiger la dernière version » de la bêta : celle que beta.html sert', [r.statut, r.j && r.j.min, r.j && r.j.canal], [200, 771, 'gestion-beta']);
    let d = disque();
    v('écrit sur le disque, avec qui', [d.canaux['gestion-beta'].min, d.canaux['gestion-beta'].par], [771, 'Banc']);
    v('⛔ un canal inconnu du fichier a été oublié (seuls les trois canaux connus sont écrits)', Object.keys(d.canaux).sort(), ['gestion-beta', 'messages-beta', 'messages-prod']);
    v('⛔ la version PUBLIQUE n\'a pas bougé — ni son minimum, ni sa porte chez Google', [d.min, d.minFirestore, d.par], [760, 760, 'avant']);
    r = await get('/api/version');
    v('⛔ les clients lisent toujours 760', r.j && r.j.min, 760);
    r = await get('/api/version?canal=beta');
    v('la bêta lit 771', r.j && r.j.min, 771);
    for (const k of ['messages-beta', 'messages-prod']) v('⛔ ' + k + ' n\'a pas bougé', d.canaux[k].min, 0);
    r = await post('/api/monitor/version-min', { canal: 'bta', min: 3 }, AUTH);
    v('⛔ un canal mal écrit : 400 (et rien de posé sur la publique)', [r.statut, disque().min], [400, 760]);

    console.log('\n── 999 · la console OP MESSAGES : ses deux instances ──');
    r = await get('/api/monitor/messages/versions', AUTH);
    v('la Tour lit la bêta d\'OP MESSAGES', r.j && r.j.beta && [r.j.beta.min, r.j.beta.service.joignable, r.j.beta.service.version, r.j.beta.service.build, r.j.beta.service.inscription], [0, true, 14, 'a1b2c3d', true]);
    v('… et la publique, à part', r.j && r.j.prod && [r.j.prod.min, r.j.prod.service.joignable, r.j.prod.service.version, r.j.prod.service.inscription], [0, true, 12, false]);
    r = await post('/api/monitor/messages/version-min', { canal: 'prod', min: 'ligne' }, AUTH);
    v('« Exiger la dernière version » de la publique : celle que l\'instance sert', [r.statut, r.j && r.j.min], [200, 12]);
    r = await get('/api/version?app=messages&canal=prod');
    v('l\'instance publique lira 12', r.j && r.j.min, 12);
    r = await get('/api/version?app=messages&canal=beta');
    v('⛔ la bêta d\'OP MESSAGES, elle, toujours 0', r.j && r.j.min, 0);
    d = disque();
    v('⛔ et les deux canaux d\'OP GESTION n\'ont pas bougé', [d.min, d.canaux['gestion-beta'].min], [760, 771]);
    r = await post('/api/monitor/messages/version-min', { canal: 'beta', min: 9 }, AUTH);
    v('un numéro écrit à la main se pose aussi', [r.statut, r.j && r.j.min], [200, 9]);
    r = await post('/api/monitor/messages/version-min', { canal: 'beta', min: 15 }, AUTH);
    v('⛔ au-dessus de la version servie (v15 > v14) : 400, personne ne pourrait l\'atteindre — l\'exigence d\'avant reste', [r.statut, r.j && r.j.servie, disque().canaux['messages-beta'].min], [400, 14, 9]);
    r = await post('/api/monitor/version-min', { canal: 'beta', min: 772 }, AUTH);
    v('⛔ la bêta d\'OP GESTION de même (v772 > v771)', [r.statut, disque().canaux['gestion-beta'].min], [400, 771]);
    r = await post('/api/monitor/version-min', { canal: 'beta', min: 771 }, AUTH);
    v('   la version servie elle-même se pose', r.statut, 200);
    r = await post('/api/monitor/messages/version-min', { canal: 'beta', min: 0 }, AUTH);
    v('« Lever l\'exigence » : 0', [r.statut, (await get('/api/version?app=messages&canal=beta')).j.min], [200, 0]);
    for (const [corps, quoi] of [[{ canal: 'beta', min: -1 }, 'négatif'], [{ canal: 'beta', min: 100000 }, 'trop grand'], [{ canal: 'beta', min: 'x' }, 'pas un nombre'], [{ canal: 'gestion', min: 3 }, 'canal inconnu'], [{ min: 3 }, 'sans canal']]) {
      r = await post('/api/monitor/messages/version-min', corps, AUTH);
      v('⛔ ' + quoi + ' : 400', r.statut, 400);
    }

    console.log('\n── 999 · une instance qui ne répond pas se DIT injoignable ──');
    msgBeta.reponse = () => null;   // 500
    r = await get('/api/monitor/messages/versions', AUTH);
    v('⛔ injoignable, sans version inventée', r.j && r.j.beta && r.j.beta.service, { joignable: false });
    r = await post('/api/monitor/messages/version-min', { canal: 'beta', min: 'ligne' }, AUTH);
    v('⛔ « Exiger » échoue fermé : 503, rien de posé', [r.statut, disque().canaux['messages-beta'].min], [503, 0]);
    msgBeta.reponse = () => ({ corps: '{"version_client":"pas un nombre"}' });
    r = await post('/api/monitor/messages/version-min', { canal: 'beta', min: 'ligne' }, AUTH);
    v('⛔ une version illisible : 503 aussi', r.statut, 503);
    pageBeta.reponse = () => ({ type: 'text/html', corps: '<html>pas de numéro</html>' });
    r = await post('/api/monitor/version-min', { canal: 'beta', min: 'ligne' }, AUTH);
    v('⛔ beta.html sans numéro : 503, l\'exigence d\'avant reste', [r.statut, disque().canaux['gestion-beta'].min], [503, 771]);
    r = await get('/api/monitor/version', AUTH);
    v('… mais la Tour garde la dernière version connue de la bêta pour l\'afficher', r.j && r.j.beta && r.j.beta.versionEnLigne, 771);

    console.log('\n── 999 · chaque console à sa Tour ──');
    const lgG = await post('/api/monitor/login', { nom: 'Gestionnaire', pass: MDP_C });
    const lgM = await post('/api/monitor/login', { nom: 'Messager', pass: MDP_C });
    v('les deux collaborateurs se connectent', [lgG.statut, lgM.statut], [200, 200]);
    const AG = { authorization: 'Bearer ' + (lgG.j && lgG.j.token) }, AM = { authorization: 'Bearer ' + (lgM.j && lgM.j.token) };
    r = await get('/api/monitor/messages/versions', AG);
    v('⛔ le compte OP GESTION ne lit pas les versions d\'OP MESSAGES', [r.statut, r.j && r.j.app], [403, 'messages']);
    r = await get('/api/monitor/messages/versions', AM);
    v('le compte OP MESSAGES les lit', r.statut, 200);
    r = await get('/api/monitor/version', AM);
    v('⛔ le compte OP MESSAGES ne lit pas celles d\'OP GESTION', [r.statut, r.j && r.j.app], [403, 'gestion']);
    r = await post('/api/monitor/messages/version-min', { canal: 'beta', min: 3 }, AM);
    v('⛔ et un collaborateur ne pose rien (patron seul)', [r.statut, disque().canaux['messages-beta'].min], [403, 0]);

    console.log('\n── 999 · les réglages survivent au redémarrage ──');
    try { process.kill(enfant.pid); } catch (e) {}
    await new Promise(r2 => setTimeout(r2, 300));
    enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT) }), stdio: 'ignore' });
    for (let i = 0; i < 80; i++) { try { await fetch(B + '/health'); break; } catch (e) { await new Promise(r2 => setTimeout(r2, 100)); } }
    const tous = [];
    for (const q of ['', '?canal=beta', '?app=messages&canal=beta', '?app=messages&canal=prod']) tous.push((await get('/api/version' + q)).j.min);
    v('760 · 771 · 0 · 12, relus du disque', tous, [760, 771, 0, 12]);
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  stop();
  fin();
})();
