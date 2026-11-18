/* ══ test-3310 — `/api/subscribe` ET `/api/notify` EXIGENT LA PREUVE DE CLÉ — QUAND ON FERME LA PORTE (chantier S1, 18 novembre 2026) ══
   Elles n'étaient qu'OBSERVÉES : connaître le `teamId` d'une entreprise suffisait à pousser une notification sur les téléphones de
   ses salariés, ou à y abonner un appareil. Elles passent à la garde de la Réception (`req.cleEquipe`), réglage `notifPreuveExigee`.
   ⛔ Les appareils d'abord, la porte ensuite : FERMÉE SUR DEMANDE seulement (`true`) ; sans le réglage, la route se comporte comme avant.
   Ce que ce banc joue :
   · le VRAI serveur, isolé, deux fois : réglage absent (ouvert, comme avant) et `notifPreuveExigee: true` (fermé) ;
   · fermé : sans preuve, mauvaise preuve, preuve d'UNE entreprise sur l'espace d'une AUTRE, clé partagée, espace technique, bêta sans
     jeton, espace hors annuaire → 403 JSON, et `subscriptions.json` inchangé octet pour octet ; la bonne preuve passe ;
   · les canaux d'OP MESSAGES (`opmsg-user-…`, comptes de personnes, application séparée) passent toujours ;
   · ⛔ la VRAIE `pushNotify` d'app.html contre ce serveur : elle présente la preuve (sans elle, fermé, plus aucune notification d'équipe). */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), vm = require('vm'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const sansCom = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CODE = sansCom(SRV), APPC = sansCom(APP);
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function extraire(src, nom) {
  let d0 = src.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  if (src.slice(d0 - 6, d0) === 'async ') d0 -= 6;
  let p = 0;
  for (let k = src.indexOf('{', d0); k < src.length; k++) { if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (!p) return src.slice(d0, k + 1); } }
  return '';
}
const banc = path.join(os.tmpdir(), 'teamop-test-3310-' + process.pid);
const enfants = [];
const fin = () => { for (const e of enfants) { try { process.kill(e.pid); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

console.log('\n── 3310 · notifications : la preuve de clé est exigée quand on ferme la porte ──');
console.log('\n1. Le montage');
{
  const M = /app\.use\(NOTIF_PREUVE_ROUTES, notifPorte\);/.test(CODE);
  const L = /const NOTIF_PREUVE_ROUTES = \[([^\]]*)\]/.exec(CODE);
  const liste = L ? L[1].split(',').map(x => x.trim().replace(/['"]/g, '')).sort() : [];
  vrai('population : la garde est montée et sa liste est lue', M && liste.length > 0, liste);
  v('elle garde ces deux routes, et elles seules', liste, ['/api/notify', '/api/subscribe']);
  vrai('montée APRÈS l\'observation (qui pose req.cleEquipe) et AVANT les routes',
    CODE.indexOf('], cleEquipeObserve);') < CODE.indexOf('app.use(NOTIF_PREUVE_ROUTES, notifPorte);') &&
    CODE.indexOf('app.use(NOTIF_PREUVE_ROUTES, notifPorte);') < CODE.indexOf("app.post('/api/subscribe'") &&
    CODE.indexOf('app.use(NOTIF_PREUVE_ROUTES, notifPorte);') < CODE.indexOf("app.post('/api/notify'"));
  vrai('fermée SEULEMENT sur `true` (jamais « tout sauf false » : un réglage absent ou mal écrit ne ferme rien en silence)', /config\.notifPreuveExigee !== true\) return next\(\)/.test(CODE));
  vrai('app.html présente la preuve sur les trois appels (`enteteEquipe`)',
    /fetch\(PUSH_API\+'\/api\/subscribe',\{method:'POST',headers:await enteteEquipe\(/.test(APPC) &&
    /fetch\(PUSH_API\+'\/api\/notify',\{method:'POST',headers:h,/.test(APPC) &&
    /fetch\(PUSH_API\+'\/api\/notify',\{method:'POST',headers:await enteteEquipe\(/.test(APPC));
}

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … partie exécutée SAUTÉE : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const CLE_A = 'CLE-PRIVEE-DE-A-3310', CLE_B = 'CLE-PRIVEE-DE-B-3310', CLE_PARTAGEE = 'ELAN-GESTION-7F3A9C2E-cloud-2026';
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const vap = webpush.generateVAPIDKeys();
  const cfg = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' };
  const ESPACES = {
    'entreprise-a': { slug: 'entreprise-a', nom: 'A', email: 'a@exemple.fr', t: 'ent-a-9x', code: b64({ t: 'ent-a-9x', k: CLE_A }), ts: 1 },
    'entreprise-b': { slug: 'entreprise-b', nom: 'B', email: 'b@exemple.fr', t: 'ent-b-7y', code: b64({ t: 'ent-b-7y', k: CLE_B }), ts: 2 },
    'entreprise-p': { slug: 'entreprise-p', nom: 'P', email: 'p@exemple.fr', t: 'ent-p-3z', code: b64({ t: 'ent-p-3z', k: CLE_PARTAGEE }), ts: 3 },
    'elan-gestion': { slug: 'elan-gestion', nom: 'Repli', email: 'r@exemple.fr', t: 'elan-gestion', code: b64({ t: 'elan-gestion', k: CLE_PARTAGEE }), ts: 4 } };
  for (const [conf, dos, extra] of [['config-ouvert.json', 'data-ouvert', {}], ['config-ferme.json', 'data-ferme', { notifPreuveExigee: true }]]) {
    fs.mkdirSync(path.join(banc, dos), { recursive: true });
    fs.writeFileSync(path.join(banc, conf), JSON.stringify(Object.assign({}, cfg, extra)));
    fs.writeFileSync(path.join(banc, dos, 'espaces.json'), JSON.stringify(ESPACES));
  }
  const PORT = 9100 + (process.pid % 600);
  [['config-ouvert.json', 'data-ouvert', PORT], ['config-ferme.json', 'data-ferme', PORT + 1]].forEach(([c, d, p]) => enfants.push(spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, c), TEAMOP_DATA: path.join(banc, d), PORT: String(p) }), stdio: 'ignore' })));
  const O = 'http://127.0.0.1:' + PORT, F = 'http://127.0.0.1:' + (PORT + 1);
  for (const base of [O, F]) for (let i = 0; i < 80; i++) { try { await fetch(base + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }
  const SUBS = path.join(banc, 'data-ferme', 'subscriptions.json');
  const lire = () => { try { return fs.readFileSync(SUBS, 'utf8'); } catch (e) { return ''; } };
  const poster = async (base, chemin, corps, entetes) => {
    const r = await fetch(base + chemin, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, entetes || {}), body: JSON.stringify(corps) });
    const txt = await r.text(); let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { statut: r.status, txt, json, ct: r.headers.get('content-type') || '' };
  };
  const preuve = k => ({ 'x-teamop-kh': kh(k) });
  let n = 0;
  const abo = t => ({ sub: { endpoint: 'https://push.exemple-banc.net/p/' + (++n), keys: { p256dh: 'BPx', auth: 'au' } }, teamId: t, userId: 'u1', userName: 'U' });
  const notif = t => ({ teamId: t, title: 'Titre banc 3310', body: 'x', url: '/app.html' });
  const ROUTES = [['subscribe', abo], ['notify', notif]];

  try {
    console.log('\n2. Réglage ABSENT : la route se comporte comme avant (la porte reste ouverte tant que les pages ne sont pas publiées)');
    for (const [rt, mk] of ROUTES) {
      const r = await poster(O, '/api/' + rt, mk('ent-a-9x'));
      v(rt + ' sans preuve, porte ouverte → 200', r.statut, 200);
    }

    console.log('\n3. Fermée : sans preuve, ou avec une mauvaise, rien ne passe et rien ne s\'écrit');
    const avant = lire();
    const refus = [];
    const essayer = async (lib, rt, mk, t, ent) => { const r = await poster(F, '/api/' + rt, mk(t), ent); refus.push([lib, r]); return r; };
    for (const [rt, mk] of ROUTES) {
      v(rt + ' : sans preuve → 403', (await essayer(rt + ' sans preuve', rt, mk, 'ent-a-9x')).statut, 403);
      v(rt + ' : mauvaise clé → 403', (await essayer(rt + ' mauvaise clé', rt, mk, 'ent-a-9x', preuve('MAUVAISE'))).statut, 403);
      v(rt + ' : kh malformé → 403', (await essayer(rt + ' kh malformé', rt, mk, 'ent-a-9x', { 'x-teamop-kh': 'pas-un-sha' })).statut, 403);
      v('⛔ ' + rt + ' : la clé de A sur l\'espace de B → 403', (await essayer(rt + ' A sur B', rt, mk, 'ent-b-7y', preuve(CLE_A))).statut, 403);
      v('⛔ ' + rt + ' : clé partagée (kh juste) → 403', (await essayer(rt + ' partagée', rt, mk, 'ent-p-3z', preuve(CLE_PARTAGEE))).statut, 403);
      v(rt + ' : espace de repli → 403', (await essayer(rt + ' repli', rt, mk, 'elan-gestion', preuve(CLE_PARTAGEE))).statut, 403);
      v(rt + ' : bêta sans son jeton → 403', (await essayer(rt + ' bêta', rt, mk, 'opgestion-beta', preuve('BIEN-FORMEE'))).statut, 403);
      v('⛔ ' + rt + ' : espace hors annuaire → 403', (await essayer(rt + ' hors annuaire', rt, mk, 'espace-hors-annuaire', preuve(CLE_A))).statut, 403);
      /* un `t` de l'attaquant (sa clé, juste) à côté du teamId de la victime : la garde juge le teamId que la route lit */
      const corps = Object.assign(mk('ent-a-9x'), { t: 'ent-b-7y' });
      const rb = await poster(F, '/api/' + rt, corps, preuve(CLE_B)); refus.push([rt + ' t≠teamId', rb]);
      v('⛔ ' + rt + ' : `t` à lui (clé juste), teamId de la victime → 403', rb.statut, 403);
    }
    v('⛔ `subscriptions.json` inchangé octet pour octet (aucun appareil abonné par un refus)', lire() === avant, true);
    vrai('population : tous ces refus sont ceux de la garde (403 JSON portant `error`)', refus.length >= 18 && refus.every(([, x]) => x.statut === 403 && /^application\/json/.test(x.ct) && x.json && typeof x.json.error === 'string'), refus.filter(([, x]) => x.statut !== 403).map(([l, x]) => [l, x.statut]));
    vrai('aucun refus ne nomme un espace', refus.every(([, x]) => !/ent-[abp]-|entreprise-|opgestion|elan-gestion/.test(x.txt)));

    console.log('\n4. Fermée : la bonne preuve passe, et OP MESSAGES (comptes de personnes) aussi');
    for (const [rt, mk] of ROUTES) v(rt + ' avec la clé de l\'entreprise → 200', (await poster(F, '/api/' + rt, mk('ent-a-9x'), preuve(CLE_A))).statut, 200);
    await new Promise(r => setTimeout(r, 600));   // l'écriture du fichier est différée de 300 ms
    vrai('l\'abonnement de A est bien rangé', /ent-a-9x/.test(lire()), lire().slice(0, 80));
    for (const [rt, mk] of ROUTES) v(rt + ' sur un canal `opmsg-user-…` (sans clé d\'équipe) → 200', (await poster(F, '/api/' + rt, mk('opmsg-user-abc123'))).statut, 200);

    console.log('\n5. ⛔ La VRAIE pushNotify d\'app.html contre ce serveur fermé');
    const FN = ['enteteEquipe', 'khEquipe', 'syncSecret', 'sha256', 'pushUrl', 'pushNotify'].map(f => extraire(APP, f));
    vrai('population : les fonctions sont trouvées', FN.every(f => f.length > 40), FN.map(f => f.length));
    const sandbox = (cle, t) => {
      const W = { console, JSON, String, Math, Date, Array, Number, Object, Promise, TextEncoder, Uint8Array, crypto: globalThis.crypto, SYNC_SECRET_DEFAULT: 'x', PUSH_API: F,
        PAGE_APP: 'app.html', currentUser: { id: 'u9' }, __log: [], localStorage: { getItem: k => (k === 'elan_sync_secret' ? cle : null) }, syncTeam: () => t };
      W.window = W;
      W.fetch = async (u, o) => { const r = await fetch(u, o); W.__log.push(r.status); return r; };
      vm.createContext(W);
      vm.runInContext('let _khCle="",_khVal=""; const BETA_ESSAI=false;\n' + FN.join('\n') + '\nthis.pushNotify=pushNotify;', W);
      return W;
    };
    const attendre = async W => { for (let i = 0; i < 60 && !W.__log.length; i++) await new Promise(r => setTimeout(r, 50)); };
    let W = sandbox(CLE_A, 'ent-a-9x'); W.pushNotify('T', 'c', '/app.html'); await attendre(W);
    v('la clé de l\'entreprise : la notification d\'équipe est acceptée (200)', W.__log, [200]);
    W = sandbox('UNE-AUTRE-CLE', 'ent-a-9x'); W.pushNotify('T', 'c', '/app.html'); await attendre(W);
    v('une autre clé : le serveur refuse (403)', W.__log, [403]);
  } catch (e) { vrai('le banc ne jette pas', false, String(e && e.stack || e)); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
