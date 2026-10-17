/* ⛔ CE QUE CE FICHIER GARDE — LA VERSION DE L'API STRIPE SE FIGE À UN SEUL ENDROIT, ET RIEN NE L'EFFACE (17 octobre 2026).

   L'audit des skills Stripe a relevé que le serveur n'envoyait aucun `Stripe-Version` : chaque appel suit la version réglée
   dans le tableau de bord de Stripe, et la forme des réponses que lit `espacePaye` peut changer sans qu'une ligne de ce dépôt
   ait bougé. `stripeEntetes` (server/index.js) écrit désormais TOUS les en-têtes de Stripe ; `config.stripe.apiVersion` la fige.
   Ce banc tient :
     1. la VRAIE `stripeEntetes`, exécutée : la version part si elle a la bonne forme ; absente, rien ne change ; d'une forme
        inattendue (un texte libre, un retour à la ligne, un nombre), elle ne part pas ET se dit, une seule fois ;
     2. le code : les trois appels à Stripe (tarifs, page de paiement, `stripeMonGet`) passent par elle, et aucune autre ligne
        n'écrit `'Bearer ' + sk` ;
     3. le VRAI serveur, isolé, avec Stripe simulé dans son processus : `/api/stripe/prices` envoie la version figée, n'envoie rien
        sans elle, et dit une forme refusée dans son journal ;
     4. les deux scripts du VPS (leur python, extrait et exécuté sur une configuration de banc) : `set-stripe.sh` COMPLÈTE le
        bloc `stripe` au lieu de le remplacer (il effaçait la version figée en silence), et ne met plus la clé sur sa ligne de
        commande ; `set-stripe-version.sh` écrit la version sans toucher au reste, aux droits du fichier (600), et refuse sans clé.
   Saute de lui-même si `server/node_modules` manque (comme les autres bancs du serveur), pour la partie 3 seulement. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const { spawn, spawnSync } = require('child_process');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));

const RACINE = path.join(__dirname, '..');
const SERVEUR = path.join(RACINE, 'server', 'index.js');
const SRC = fs.readFileSync(SERVEUR, 'utf8');
/* server/index.js ne perd rien au nettoyage des commentaires (CLAUDE.md, mesuré le 21 septembre 2026) */
const SANS = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* le corps d'une déclaration, de son début à SA dernière accolade (chaînes et expressions régulières simples sautées) */
function decl(texte, debut) {
  const i = texte.indexOf(debut); if (i < 0) return '';
  let j = texte.indexOf('{', i), n = 0, q = null;
  for (; j < texte.length; j++) {
    const ch = texte[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}' && --n === 0) return texte.slice(i, j + 1);
  }
  return '';
}

(async () => {
  console.log('\n1. La vraie stripeEntetes');
  const corps = decl(SANS, 'function stripeEntetes(');
  vrai('la déclaration est trouvée (' + corps.length + ' caractères)', corps.length > 200);
  const essai = (stripe, extra, fois = 1) => {
    const erreurs = [];
    const bac = { config: { stripe }, console: { error: m => erreurs.push(String(m)), log() {} } };
    vm.createContext(bac);
    vm.runInContext(corps + '\nthis.f = stripeEntetes;', bac);
    let h; for (let i = 0; i < fois; i++) h = bac.f('sk_banc', extra);
    return { h, erreurs };
  };
  v('sans version : l\'autorisation seule (le comportement d\'avant)', essai({ secretKey: 'x' }).h, { Authorization: 'Bearer sk_banc' });
  v('version nommée « 2026-09-30.endive » : envoyée', essai({ apiVersion: '2026-09-30.endive' }).h['Stripe-Version'], '2026-09-30.endive');
  v('version datée seule « 2025-01-27 » : envoyée', essai({ apiVersion: '2025-01-27' }).h['Stripe-Version'], '2025-01-27');
  v('le type du corps passe, et la version avec', essai({ apiVersion: '2025-01-27' }, { 'Content-Type': 'application/x-www-form-urlencoded' }).h,
    { Authorization: 'Bearer sk_banc', 'Content-Type': 'application/x-www-form-urlencoded', 'Stripe-Version': '2025-01-27' });
  for (const mauvaise of ['latest', '2026-09-30\r\nX-Injecte: 1', 20260930, '2026-9-30', '2026-09-30.Endive']) {
    const r = essai({ apiVersion: mauvaise }, null, 3);
    v('⛔ forme inattendue ' + JSON.stringify(mauvaise) + ' : rien n\'est envoyé', 'Stripe-Version' in r.h, false);
    v('   … et elle se DIT, une seule fois en trois appels', r.erreurs.filter(e => /stripe\.apiVersion ignorée/.test(e)).length, 1);
  }
  v('une version vide ne se dit pas (champ simplement non posé)', essai({ apiVersion: '' }, null, 2).erreurs.length, 0);

  console.log('\n2. Le code : les trois appels passent par elle');
  const appels = SANS.split('\n').filter(l => /\bfetch\(/.test(l) && (/api\.stripe\.com/.test(l) || /fetch\(url, \{ headers: stripeEntetes/.test(l)));
  v('trois appels à Stripe recensés (tarifs, page de paiement, stripeMonGet)', appels.length, 3);
  v('les trois écrivent leurs en-têtes par stripeEntetes', appels.filter(l => /headers: stripeEntetes\(sk/.test(l)).length, 3);
  v('aucune autre ligne n\'écrit « \'Bearer \' + sk »', SANS.split('\n').filter(l => /'Bearer ' \+ sk\b/.test(l)).length, 1);   // la seule : dans stripeEntetes
  vrai('stripeEntetes est une DÉCLARATION de fonction (connue dès le chargement : pas de zone morte temporelle)', /^function stripeEntetes\(sk, extra\)/m.test(SANS));

  console.log('\n3. Le vrai serveur, Stripe simulé dans son processus');
  let webpush = null;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); } catch (e) {}
  if (!webpush) console.log('  (server/node_modules absent — partie SAUTÉE)');
  else {
    const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-1010-'));
    const APPELS = path.join(banc, 'stripe-appels.jsonl'), PRECHARGE = path.join(banc, 'stripe-simule.js');
    fs.writeFileSync(PRECHARGE, `const vrai = globalThis.fetch; const fs = require('fs');
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  fs.appendFileSync(${JSON.stringify(APPELS)}, JSON.stringify({ u, h: (opts && opts.headers) || {} }) + '\\n');
  return new Response(JSON.stringify({ data: [{ id: 'price_banc', unit_amount: 1500, currency: 'eur', recurring: { interval: 'month' }, product: { name: 'Banc' } }], has_more: false }),
    { status: 200, headers: { 'content-type': 'application/json' } });
};\n`);
    const vap = webpush.generateVAPIDKeys();
    const lancer = async (stripe, n) => {
      const D = path.join(banc, 'data-' + n); fs.mkdirSync(D);
      const conf = path.join(banc, 'config-' + n + '.json');
      fs.writeFileSync(conf, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', stripe }));
      const PORT = 9700 + (process.pid % 80) + n * 3;
      let journal = '';
      const enfant = spawn(process.execPath, ['--require', PRECHARGE, SERVEUR], {
        env: Object.assign({}, process.env, { TEAMOP_CONFIG: conf, TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }),
        stdio: ['ignore', 'pipe', 'pipe'] });
      enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
      const B = 'http://127.0.0.1:' + PORT;
      let vivant = false;
      for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
      return { B, enfant, vivant, journal: () => journal };
    };
    const appelsStripe = () => { try { return fs.readFileSync(APPELS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { return []; } };
    const cas = [
      ['version figée', { secretKey: 'sk_de_banc_1010', apiVersion: '2026-09-30.endive' }, h => h['Stripe-Version'] === '2026-09-30.endive'],
      ['sans version (le comportement d\'avant)', { secretKey: 'sk_de_banc_1010' }, h => !('Stripe-Version' in h)],
      ['forme refusée', { secretKey: 'sk_de_banc_1010', apiVersion: 'latest' }, h => !('Stripe-Version' in h)],
    ];
    for (let n = 0; n < cas.length; n++) {
      const [nom, stripe, attendu] = cas[n];
      try { fs.unlinkSync(APPELS); } catch (e) {}
      const s = await lancer(stripe, n);
      vrai('[' + nom + '] le vrai serveur démarre, isolé', s.vivant);
      if (s.vivant) {
        const r1 = await fetch(s.B + '/api/stripe/prices'), r2 = await fetch(s.B + '/api/stripe/prices');
        const j = await r1.json().catch(() => ({}));
        vrai('[' + nom + '] /api/stripe/prices répond, avec le tarif de Stripe', r1.ok && r2.ok && Array.isArray(j.prices) && j.prices[0] && j.prices[0].id === 'price_banc');
        const a = appelsStripe();
        vrai('[' + nom + '] Stripe a bien été appelé (population : ' + a.length + ')', a.length >= 1);
        vrai('[' + nom + '] les en-têtes envoyés sont ceux attendus, à chaque appel', a.length >= 1 && a.every(x => attendu(x.h) && x.h.Authorization === 'Bearer sk_de_banc_1010'));
        await dormir(150);
        const dits = (s.journal().match(/stripe\.apiVersion ignorée/g) || []).length;
        v('[' + nom + '] « ignorée » dans le journal : une fois pour une forme refusée, jamais sinon', dits, nom === 'forme refusée' ? 1 : 0);
      } else console.log(s.journal().slice(0, 1200));
      s.enfant.kill('SIGTERM');
      await dormir(150);
    }
    try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('\n4. Les scripts du VPS');
  const pythonDe = f => { const t = fs.readFileSync(path.join(RACINE, 'server', f), 'utf8'); const m = /<<'PYEOF'\n([\s\S]*?)\nPYEOF/.exec(t); return { t, py: m ? m[1] : '' }; };
  const avecPython = spawnSync('python3', ['--version']).status === 0;
  for (const f of ['set-stripe.sh', 'set-stripe-version.sh']) v(f + ' se parse (bash -n)', spawnSync('bash', ['-n', path.join(RACINE, 'server', f)]).status, 0);
  if (!avecPython) console.log('  (python3 absent — scripts SAUTÉS)');
  else {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'conf-1010-'));
    const conf = path.join(dir, 'config.json');
    const poser = o => { fs.writeFileSync(conf, JSON.stringify(o)); fs.chmodSync(conf, 0o600); };
    const lire = () => JSON.parse(fs.readFileSync(conf, 'utf8'));

    const S = pythonDe('set-stripe.sh');
    vrai('set-stripe.sh : le python est trouvé', S.py.length > 50);
    vrai('⛔ set-stripe.sh ne met plus la clé sur une ligne de commande (elle passe par l\'environnement du seul python)',
      /TEAMOP_CLE_STRIPE="\$K" python3 - /.test(S.t) && !/python3 - "\$K"/.test(S.t));
    poser({ apiKey: 'banc', stripe: { secretKey: 'sk_ancienne', apiVersion: '2026-09-30.endive' } });
    const r1 = spawnSync('python3', ['-', conf], { input: S.py, env: Object.assign({}, process.env, { TEAMOP_CLE_STRIPE: 'sk_nouvelle' }), encoding: 'utf8' });
    v('set-stripe.sh : le python réussit', r1.status, 0);
    v('⛔ changer la clé GARDE la version figée (et le reste de la configuration)', lire(), { apiKey: 'banc', stripe: { secretKey: 'sk_nouvelle', apiVersion: '2026-09-30.endive' } });

    const V = pythonDe('set-stripe-version.sh');
    vrai('set-stripe-version.sh : le python est trouvé', V.py.length > 50);
    poser({ apiKey: 'banc', stripe: { secretKey: 'sk_banc' } });
    const r2 = spawnSync('python3', ['-', conf, '2026-09-30.endive'], { input: V.py, encoding: 'utf8' });
    v('set-stripe-version.sh : le python réussit', r2.status, 0);
    v('la version est écrite, la clé et le reste ne bougent pas', lire(), { apiKey: 'banc', stripe: { secretKey: 'sk_banc', apiVersion: '2026-09-30.endive' } });
    v('⛔ le fichier garde ses droits (600 : il porte des secrets)', (fs.statSync(conf).mode & 0o777).toString(8), '600');
    vrai('aucun temporaire laissé derrière', !fs.existsSync(conf + '.tmp'));
    poser({ apiKey: 'banc' });
    const r3 = spawnSync('python3', ['-', conf, '2026-09-30.endive'], { input: V.py, encoding: 'utf8' });
    v('sans clé Stripe : refus (code 2), et rien n\'est écrit', [r3.status, lire()], [2, { apiKey: 'banc' }]);
    vrai('la forme de la version est contrôlée AVANT toute écriture (même motif que le serveur)',
      V.t.indexOf("grep -Eq '^[0-9]{4}-[0-9]{2}-[0-9]{2}(\\.[a-z]+)?$'") > 0 && V.t.indexOf("grep -Eq") < V.t.indexOf('cp -p'));
    vrai('une version que Stripe refuse fait remettre la configuration d\'avant (la route qui l\'envoie doit répondre 200)',
      /curl[^\n]*\/api\/stripe\/prices/.test(V.t) && /cp -p "\$CONF\.avant-version" "\$CONF"/.test(V.t));
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})();
