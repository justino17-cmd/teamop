/* ⛔ CE QUE CE FICHIER GARDE — LES OPTIONS DU PRO, SUR LE VRAI SERVEUR (1er octobre 2026).

   Décision de Justin : « Plus cher ». Le Pro (15 € par utilisateur et par mois) s'étend à la carte — Stock 9 €, Achats 6 €,
   Encaissements et compta 6 €, Registre sanitaire 6 € ; Business et Business Premium les ont toutes. Une option est une LIGNE
   d'abonnement Stripe à un tarif que le serveur ne connaissait pas — et un tarif qu'il ne connaît pas gardait, jusqu'ici, la
   formule de la fiche (« on ne coupe pas une entreprise qui paie peut-être »). La carte de lecture du serveur a rejoué huit cas
   (a à h) sur le code d'AVANT : une option à 6 € faisait passer une fiche Business Premium pour PAYÉE Business Premium, une fiche
   sans formule pour Business Premium, levait le blocage d'un Pro impayé, battait un Pro × 3 au rang de la fiche. Chaque cas est
   joué ici par la vraie route `/api/espaces/etat` (celle que lit l'application), sur un Stripe simulé DANS le processus du
   serveur ; chacun est un contrôle qui TOMBE sur l'ancien code (voir `scratchpad/mutations-850.py`, et les contre-épreuves).

   Ce que le banc joue :
     1 · classement et règles : a, b, c, d, e, f, g, h (+ avant la bascule), couverture stricte (i), Business (j), voisine
         d'adresse (k), option impayée (l), période offerte (m), réglé à la main (n), plusieurs noms (o), l'échéance lue sur la
         formule, `options` dans la réponse payée SEULEMENT (suspendue, doute, inconnue : absent) ;
     2 · la Tour : `optionsServies`, `options` réglées à la main, lignes Stripe ; `/api/monitor/espaces/abonnement` valide
         (Pro seul, « actif »/« essai » seuls, clés connues), écrit sur TOUS les noms, « Revoir le lien » les garde ;
     3 · « Mon espace » : un champ à part (`options`), jamais collé dans `plan` ;
     4 · la route de paiement : ce qui part chez Stripe (lignes, quantités, cycle, gravure, `trial_end`) LU dans le faux Stripe ;
         les codes d'erreur ; l'ajout d'office des options au rachat de places ; l'ajout d'option seule ; l'impayé d'option ;
     5 · le courriel des sept jours ; 6 · `stripe-options.js` (idempotent, `--essai`, jamais la clé).
   Les tarifs d'option du serveur sont VIDES tant que Justin ne les a pas créés : le banc en pose de FAUX sur une COPIE du
   serveur (jamais sur le dépôt) et rejoue aussi la copie à tarifs vides (`option_indisponible`).
   Rien ne sort d'ici : 127.0.0.1, un Stripe simulé, des entreprises et des adresses fictives. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b850-'));
/* un facteur SMTP de banc (le rappel des sept jours en envoie un) : il retire le point doublé (RFC 5321 § 4.5.2) et range chaque courriel ENTIER */
function facteur() {
  const recus = [];
  const s = require('net').createServer(c => {
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => { tampon += d.toString('utf8'); let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) { const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n'); } });
    c.on('error', () => {}); });
  return { recus, s };
}
/* le quoted-printable replié, décodé ; l'en-tête « To: » */
const lisible = m => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
const destinataire = m => ((/^To: *(.+)$/m.exec(String(m || '')) || [])[1] || '').trim();
const enfants = [], facteurs = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } for (const f of facteurs) { try { f.s.close(); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 280 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 280000).unref();

console.log('\n── 850 · les options du Pro, rejouées sur le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const SRC = fs.readFileSync(SERVEUR, 'utf8');
  const prix = k => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)', '(price_\\w+)'\\]", 'm').exec(SRC) || []).slice(1);
  const P = { pro: prix('pro'), business: prix('business'), premium: prix('premium'), msgpro: prix('msgpro') };
  vrai('(population) les tarifs des formules du serveur sont lus (Pro, Business, Business Premium, OP MESSAGES)', Object.values(P).every(a => a.length === 2 && a.every(x => /^price_/.test(x))));
  const CLES = ['stock', 'achats', 'compta', 'sanitaire'];
  vrai('(population) la grille des options du serveur est lue (quatre clés, 9 / 6 / 6 / 6 €)', /const OPTIONS_CLES = \['stock', 'achats', 'compta', 'sanitaire'\];/.test(SRC)
    && /const OPTIONS_PRIX_MOIS = \{ stock: 9, achats: 6, compta: 6, sanitaire: 6 \};/.test(SRC));

  /* ══ 0. LE FICHIER LIVRÉ : sa table d'options est VIDE, ou bien formée — et ne ressemble pas à celle des formules ══ */
  const RE_TABLE = /const STRIPE_PRIX_OPTION = \{[\s\S]*?\};/;
  const tableLivree = (RE_TABLE.exec(SRC) || [''])[0];
  vrai('le serveur porte une table STRIPE_PRIX_OPTION', !!tableLivree);
  const lignesTable = tableLivree.split('\n').filter(l => /^\s+\w+:\s+\[/.test(l));
  v('   quatre lignes, dans l\'ordre de la grille', lignesTable.map(l => (/^\s+(\w+):/.exec(l) || [])[1]), CLES);
  vrai('   chacune est VIDE (rien ne se vend avant que Justin crée les tarifs) ou porte DEUX identifiants price_…',
    lignesTable.every(l => /\['', ''\]/.test(l) || /\['price_[A-Za-z0-9]+', 'price_[A-Za-z0-9]+'\]/.test(l)));
  const motif842 = /^\s*(\w+): \['(price_\w+)', '(price_\w+)'\]/gm;
  const dansBloc = (tableLivree.match(motif842) || []).length;
  v('⛔ aucune ligne de la table ne ressemble au motif de test-842 (cinq formules exactement) — deux espaces après les deux-points', dansBloc, 0);

  /* ══ LES SERVEURS : une copie du dossier du serveur, dont la table d'options est celle qu'on veut ══════════════════════ */
  const OP = {}; for (const k of CLES) OP[k] = ['price_850' + k + 'M', 'price_850' + k + 'A'];
  const tablePleine = 'const STRIPE_PRIX_OPTION = {\n' + CLES.map(k => '  ' + (k + ':').padEnd(11) + "['" + OP[k][0] + "', '" + OP[k][1] + "']").join(',\n') + ' };';
  const tableVide = 'const STRIPE_PRIX_OPTION = {\n' + CLES.map(k => '  ' + (k + ':').padEnd(11) + "['', '']").join(',\n') + ' };';
  const tablePartielle = 'const STRIPE_PRIX_OPTION = {\n  stock:      [\'' + OP.stock[0] + "', ''],\n" + CLES.slice(1).map(k => '  ' + (k + ':').padEnd(11) + "['', '']").join(',\n') + ' };';
  vrai('(population) la table livrée se remplace en un seul endroit', (SRC.match(new RegExp(RE_TABLE.source, 'g')) || []).length === 1);
  let nCopie = 0;
  const copie = table => {
    const R = path.join(banc, 'srv' + (++nCopie)), D = path.join(R, 'server');
    fs.mkdirSync(D, { recursive: true });
    const src = path.dirname(SERVEUR);
    for (const f of fs.readdirSync(src)) if (/\.(js|json|sh)$/.test(f) && f !== 'index.js' && fs.statSync(path.join(src, f)).isFile()) fs.copyFileSync(path.join(src, f), path.join(D, f));
    /* (un serveur d'AVANT les options n'a pas de table : il se joue tel quel — c'est ainsi que les cas a à h se rejouent sur l'ancien code) */
    fs.writeFileSync(path.join(D, 'index.js'), RE_TABLE.test(SRC) ? SRC.replace(RE_TABLE, () => table) : SRC);
    try { fs.symlinkSync(path.join(RACINE, 'server', 'node_modules'), path.join(D, 'node_modules')); } catch (e) {}
    return path.join(D, 'index.js');
  };

  const MAINT = Date.now();
  const jour = n => new Date(MAINT + n * 86400000).toISOString().slice(0, 10);
  const cree = Math.floor(MAINT / 1000) - 3600;
  const avantBascule = Math.floor(Date.parse('2025-06-01T00:00:00Z') / 1000);
  const mail = x => x + '@exemple-850.fr';
  const code64 = t => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  const NOM_OPT = { stock: 'OP GESTION — Option Stock', achats: 'OP GESTION — Option Achats fournisseurs', compta: 'OP GESTION — Option Encaissements et compta', sanitaire: 'OP GESTION — Option Registre sanitaire' };
  const IDS_OPT = new Set(Object.values(OP).flat());

  /* un monde : des entreprises, des abonnements Stripe, des comptes — construit par `monde()`, joué par `demarrer()` */
  function monde() {
    const M = { ENT: {}, subs: [], factures: {}, usages: {}, n: 0 };
    M.ent = (id, plus) => { const t = 't-' + id + '-850';
      M.ENT[id] = Object.assign({ t, nom: id, code: code64(t), ts: MAINT - 1000, email: mail(id), formule: 'pro', quantite: 1 }, plus || {});
      if (plus && plus.formule === undefined && 'formule' in plus) delete M.ENT[id].formule;
      return t; };
    /* lignes : [prixId, quantité] */
    M.sub = (id, status, lignes, plus) => { plus = plus || {}; const n = ++M.n;
      const s = { id: 'sub_' + id + '_' + n, object: 'subscription', status, created: plus.created || cree, metadata: plus.nonGrave ? {} : { espace: M.ENT[id].t },
        customer: { id: 'cus_' + id, email: plus.email || mail(id) }, current_period_end: plus.fin || Math.floor(MAINT / 1000) + 20 * 86400,
        items: { data: lignes.map(([px, q], i) => { const cle = CLES.find(k => OP[k].includes(px));
          return { id: 'si_' + n + '_' + i, quantity: q, price: { id: px, product: { name: cle ? NOM_OPT[cle] : 'OP GESTION' } } }; }) } };
      M.subs.push(s); return s; };
    M.facture = (sb, url, ouverte) => { M.factures[sb.id] = { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: url }, ouvertes: ouverte === false ? [] : [{ object: 'invoice', status: 'open', hosted_invoice_url: url }] }; };
    M.usage = (code, id, finLe) => { const u = M.usages[code] = M.usages[code] || { n: 0, equipes: {} }; u.n++; u.equipes[M.ENT[id].t] = { date: jour(-60), finLe, em: '' }; };
    return M;
  }
  const PRO = q => [P.pro[0], q], BUS = q => [P.business[0], q], OPL = (k, q) => [OP[k][0], q];

  let nsrv = 0;
  async function demarrer(M, plus) {
    plus = plus || {};
    const R = path.join(banc, 'run' + (++nsrv)), D = path.join(R, 'data');
    fs.mkdirSync(D, { recursive: true });
    const ETAT = path.join(R, 'stripe.json'), APPELS = path.join(R, 'appels.jsonl');
    const E = { muet: !!plus.muet, subs: M.subs, factures: M.factures };
    const poser = () => fs.writeFileSync(ETAT, JSON.stringify(E));
    poser();
    const espaces = M.ENT;
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(plus.espaces || espaces));
    fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify(M.usages));
    /* le portail : un compte CONFIRMÉ et une session par entreprise qui paie (seul le sha256 du jeton est rangé, comme `comptes.js`) */
    const C = {}, J = {}, jetons = {};
    for (const id of Object.keys(M.ENT)) { const m = M.ENT[id].email; if (!m || C[m]) continue;
      C[m] = { v: true, pr: 'Banc', no: id, so: 'Banc ' + id };
      const brut = crypto.randomBytes(32).toString('hex'); J[sha(brut)] = { m, g: 'session', exp: MAINT + 86400000 }; jetons[id] = brut; }
    fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: C, j: J }));
    const dossiers = {}; for (const id of Object.keys(M.ENT)) if (M.ENT[id].email) dossiers[M.ENT[id].email] = { status: 'actif', plan: 'Business', planStatus: 'actif', cree: MAINT - 5000 };
    fs.writeFileSync(path.join(D, 'portail.json'), JSON.stringify({ d: dossiers, f: {}, a: [] }));
    const PRE = path.join(R, 'stripe-simule.js');
    fs.writeFileSync(PRE, `const vrai = globalThis.fetch; const fs = require('fs'); let nSession = 0;
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  const E = JSON.parse(fs.readFileSync(${JSON.stringify(ETAT)}, 'utf8'));
  fs.appendFileSync(${JSON.stringify(APPELS)}, JSON.stringify({ u, corps: String((opts && opts.body) || '') }) + '\\n');
  const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
  if (E.muet) return json({ error: { message: 'panne du banc' } }, 500);
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return json({ id: 'cs_banc_850', url: 'https://checkout.stripe.com/c/pay/banc-850-' + (++nSession) });
  const r1 = /^https:\\/\\/api\\.stripe\\.com\\/v1\\/subscriptions\\/([^?]+)/.exec(u);
  if (r1) { const id = decodeURIComponent(r1[1]); const sb = E.subs.find(x => x.id === id), f = E.factures[id] || {};
    if (!sb) return json({ error: { message: 'inconnu' } }, 404);
    return json(Object.assign({}, sb, { latest_invoice: f.latest_invoice === undefined ? null : f.latest_invoice })); }
  if (u.startsWith('https://api.stripe.com/v1/invoices')) { const id = new URL(u).searchParams.get('subscription'); return json({ data: ((E.factures[id] || {}).ouvertes || []).slice(0, 1), has_more: false }); }
  if (u.startsWith('https://api.stripe.com/v1/subscriptions')) return json({ data: E.subs, has_more: false });
  return json({ data: [], has_more: false });
};\n`);
    const vap = webpush.generateVAPIDKeys();
    fs.writeFileSync(path.join(R, 'config.json'), JSON.stringify(Object.assign({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
      adminPassHash: sha('mot-de-passe-850'), comptes: { actif: true }, stripe: { secretKey: 'sk_de_banc_850' },
      promos: [{ code: 'VIEUX-BANC-850', formule: 'premium', mois: 3 }, { code: 'PRO-BANC-850', formule: 'pro', mois: 3 }] },
      plus.smtp ? { smtp: { host: '127.0.0.1', port: plus.smtp, secure: false, user: 'banc', pass: 'banc', from: 'banc@exemple-850.fr' } } : {})));
    const PORT = 9300 + ((process.pid + nsrv * 11) % 600);
    let journal = '';
    const e = spawn(process.execPath, ['--require', PRE, plus.fichier || SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(R, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(R, 'absente.json'),
        TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z', TEAMOP_STRIPE_CACHE_MS: String(plus.cacheMs || 600000), TEAMOP_STRIPE_IMPAYE_MS: '1000', TEAMOP_RAPPELS_DELAI_MS: '1000000' }, plus.env || {}),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfants.push(e);
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
    const B = 'http://127.0.0.1:' + PORT;
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    if (!vivant) console.log(journal.slice(0, 1500));
    let ipN = 0;
    const appel = async (route, corps, jeton, methode) => { const r = await fetch(B + route, { method: methode || (corps === undefined ? 'GET' : 'POST'),
        headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': '10.8.' + (nsrv % 200) + '.' + (++ipN % 250) }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
      let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j: j || {} }; };
    const appelsStripe = () => { try { return fs.readFileSync(APPELS, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (x) { return []; } };
    const sessions = () => appelsStripe().filter(x => /\/v1\/checkout\/sessions/.test(x.u)).map(x => new URLSearchParams(x.corps));
    return { vivant, appel, R, D, B, E, poser, jetons, journal: () => journal, sessions, appelsStripe,
      etat: async id => (await appel('/api/espaces/etat', { t: M.ENT[id] ? M.ENT[id].t : id })).j,
      patron: async () => (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-850' })).j.token,
      lireReg: () => JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8')),
      arreter: () => new Promise(r => { if (e.exitCode !== null || e.signalCode) return r(); e.once('exit', () => r()); e.kill('SIGTERM'); }) };
  }
  /* ce que la réponse dit : [payé, formule, places, options (ou « ABSENT »)] */
  const OPT = j => ('options' in j) ? j.options : 'ABSENT';
  const VU = j => [j.paye === true, j.formule || null, j.places || null, OPT(j)];
  /* la forme que l'application grise sans rien écrire (suspension, sans formule) — et SANS options */
  const SUSP = j => j.ok === true && j.paye === false && j.suspendu === true && j.sursisJours === 0 && !('formule' in j) && !('options' in j);
  /* les lignes d'une page de paiement créée chez Stripe : [[tarif, quantité], …] */
  const lignesDe = s => { const o = []; for (let i = 0; i < 8; i++) { const p = s.get('line_items[' + i + '][price]'); if (p === null) break; o.push([p, s.get('line_items[' + i + '][quantity]')]); } return o; };
  const NOM_PRIX = px => { for (const k of CLES) { if (px === OP[k][0]) return k + ':M'; if (px === OP[k][1]) return k + ':A'; } for (const f of Object.keys(P)) { if (px === P[f][0]) return f + ':M'; if (px === P[f][1]) return f + ':A'; } return px; };
  const ligN = s => lignesDe(s).map(([px, q]) => NOM_PRIX(px) + '×' + q);

  /* ══ 1. LE MONDE DES ENTREPRISES — chaque cas de la carte de lecture, et ses contre-épreuves ═════════════════════════ */
  const M = monde();
  /* a · fiche Business Premium, abonnement = une option seule × 3 */
  M.ent('a', { formule: 'premium' }); M.sub('a', 'active', [OPL('stock', 3)]);
  /* b, c, d · Pro × 3 + deux abonnements d'option × 3 : sur une fiche Business Premium, Pro, Business */
  for (const [id, f] of [['b', 'premium'], ['c', 'pro'], ['d', 'business']]) { M.ent(id, { formule: f }); M.sub(id, 'active', [PRO(3)]); M.sub(id, 'active', [OPL('stock', 3)]); M.sub(id, 'active', [OPL('achats', 3)]); }
  /* e · fiche sans formule, option seule ; f · fiche « Gratuit », option seule */
  M.ent('e', { formule: undefined }); M.sub('e', 'active', [OPL('stock', 2)]);
  M.ent('f', { formule: 'gratuit' }); M.sub('f', 'active', [OPL('stock', 2)]);
  /* g · Pro IMPAYÉ + une option payée à côté */
  M.ent('g'); const sg = M.sub('g', 'past_due', [PRO(3)]); M.sub('g', 'active', [OPL('stock', 3)]); M.facture(sg, 'https://invoice.stripe.com/i/banc-850-g');
  /* h · places : l'option n'en ajoute aucune (cinq options, trois places) ; h2 : un abonnement d'AVANT la bascule qui porte Pro × 3 et une option × 3 */
  M.ent('h'); M.sub('h', 'active', [PRO(3)]); M.sub('h', 'active', [OPL('stock', 5)]);
  M.ent('h2'); M.sub('h2', 'active', [PRO(3), OPL('stock', 3)], { created: avantBascule });
  /* i · couverture STRICTE : deux places sur trois ne servent rien ; deux abonnements d'option se cumulent ; quatre options dans UN abonnement mixte */
  M.ent('i1'); M.sub('i1', 'active', [PRO(3)]); M.sub('i1', 'active', [OPL('stock', 2)]);
  M.ent('i2'); M.sub('i2', 'active', [PRO(3)]); M.sub('i2', 'active', [OPL('stock', 2)]); M.sub('i2', 'active', [OPL('stock', 1)]);
  M.ent('i3'); M.sub('i3', 'active', [PRO(3), OPL('stock', 3), OPL('achats', 3), OPL('compta', 3), OPL('sanitaire', 3)]);
  /* j · Business : toutes les rubriques, une option payée par erreur n'y change rien */
  M.ent('j', { formule: 'business' }); M.sub('j', 'active', [BUS(2)]); M.sub('j', 'active', [OPL('stock', 2)]);
  /* k · l'option d'une VOISINE d'adresse (non gravée, adresse partagée) : ni servie, ni un doute qui empêche de descendre sous la fiche */
  M.ent('k', { formule: 'premium' }); M.ent('k2', { formule: 'pro', email: mail('k') });
  M.sub('k', 'active', [PRO(1)]); M.sub('k', 'active', [OPL('stock', 1)], { nonGrave: true });
  /* k3 · adresse PARTAGÉE, rien de gravé : le Pro et l'option sont trouvés par l'adresse seule — rien n'est SÛREMENT à elle, donc aucune option servie
     (la fiche garde sa formule : on ne coupe pas) */
  M.ent('k3'); M.ent('k4', { email: mail('k3') });
  M.sub('k3', 'active', [PRO(1)], { nonGrave: true }); M.sub('k3', 'active', [OPL('stock', 1)], { nonGrave: true });
  /* l · une option IMPAYÉE à côté d'un Pro qui paie */
  M.ent('l'); M.sub('l', 'active', [PRO(3)]); const sl = M.sub('l', 'past_due', [OPL('stock', 3)]); M.facture(sl, 'https://invoice.stripe.com/i/banc-850-l');
  /* m · période offerte (code Business Premium) : aucune option, même payée */
  M.ent('m'); M.usage('VIEUX-BANC-850', 'm', jour(30)); M.sub('m', 'trialing', [PRO(1), OPL('stock', 1)]);
  /* n · réglé à la main dans la Tour */
  M.ent('n1', { aboStatut: 'actif', aboPar: 'Banc', options: ['stock', 'sanitaire'] });
  M.ent('n2', { formule: 'business', aboStatut: 'actif', aboPar: 'Banc', options: ['stock'] });
  M.ent('n3', { aboStatut: 'actif', aboPar: 'Banc', aboFin: jour(-3), options: ['stock'] });
  M.ent('n4', { aboStatut: 'impaye', aboPar: 'Banc', options: ['stock'] });
  M.ent('n5', { aboStatut: 'essai', aboPar: 'Banc', aboFin: jour(10), options: ['inconnue', 'stock', 'stock'] });
  /* o · deux noms pour la même entreprise : l'ancien porte le réglage et ses options, le récent n'a rien */
  M.ENT.oold = { t: 't-o-850', nom: 'oold', code: code64('t-o-850'), ts: MAINT - 9000, email: mail('o'), formule: 'pro', quantite: 1, aboStatut: 'actif', aboPar: 'Banc', options: ['stock'] };
  M.ENT.onew = { t: 't-o-850', nom: 'onew', code: code64('t-o-850'), ts: MAINT - 1000, email: mail('o'), formule: 'pro', quantite: 1 };
  /* ech · l'option est la PREMIÈRE de la liste, avec une échéance lointaine : l'échéance affichée est celle de la formule */
  M.ent('ech'); M.sub('ech', 'active', [OPL('stock', 3)], { fin: Math.floor(MAINT / 1000) + 300 * 86400 }); M.sub('ech', 'active', [PRO(3)]);
  /* la Tour règle (routes qui écrivent) : p1 un nom, p2 deux noms, p3 « Revoir le lien » */
  M.ent('p1'); M.ent('p3', { aboStatut: 'actif', aboPar: 'Banc', options: ['achats'] });
  M.ENT.p2old = { t: 't-p2-850', nom: 'p2old', code: code64('t-p2-850'), ts: MAINT - 9000, email: mail('p2'), formule: 'pro', quantite: 1 };
  M.ENT.p2new = { t: 't-p2-850', nom: 'p2new', code: code64('t-p2-850'), ts: MAINT - 1000, email: mail('p2'), formule: 'pro', quantite: 1 };
  /* le paiement : chacun son entreprise, son compte confirmé, sa session */
  M.ent('c1');
  M.ent('c6c');
  M.ent('c6d', { formule: 'business' }); M.sub('c6d', 'active', [BUS(2)]);
  M.ent('c6e'); M.sub('c6e', 'active', [PRO(3)]);
  M.ent('c6g'); M.sub('c6g', 'active', [PRO(3)]); M.sub('c6g', 'active', [OPL('stock', 3)]);
  M.ent('c6h'); M.sub('c6h', 'active', [PRO(3)]); M.sub('c6h', 'active', [OPL('stock', 1)]);
  M.ent('c6i'); const si = M.sub('c6i', 'past_due', [PRO(3)]); M.facture(si, 'https://invoice.stripe.com/i/banc-850-c6i');
  M.ent('c6j'); M.sub('c6j', 'active', [PRO(3)]); const sj = M.sub('c6j', 'past_due', [OPL('stock', 3)]); M.facture(sj, 'https://invoice.stripe.com/i/banc-850-c6j');
  M.ent('c6k', { aboStatut: 'actif', aboPar: 'Banc', options: [] }); M.sub('c6k', 'active', [PRO(3)]);
  M.ent('c6l'); M.usage('VIEUX-BANC-850', 'c6l', jour(30)); M.sub('c6l', 'trialing', [PRO(3)]);
  M.ent('c6m'); M.sub('c6m', 'active', [[P.pro[1], 3]]);
  M.ent('c6n'); M.sub('c6n', 'active', [PRO(1)]); M.sub('c6n', 'active', [[P.pro[1], 2]]);
  M.ent('c6o'); M.sub('c6o', 'active', [PRO(2)]); M.sub('c6o', 'active', [[P.pro[1], 1]]);
  M.ent('c7a'); M.sub('c7a', 'active', [PRO(3)]); M.sub('c7a', 'active', [OPL('stock', 3)]); M.sub('c7a', 'active', [OPL('achats', 3)]);
  M.ent('c8a'); M.sub('c8a', 'active', [PRO(3)]);
  M.ent('c8b'); M.sub('c8b', 'active', [PRO(3)]);
  /* le courriel des sept jours : j1 (option seule : PAS abonnée), j2 (Pro + option : abonnée), j3 (code Pro, rien d'abonné) */
  M.ent('j1'); M.usage('VIEUX-BANC-850', 'j1', jour(5)); M.sub('j1', 'active', [OPL('stock', 2)]);
  M.ent('j2'); M.usage('VIEUX-BANC-850', 'j2', jour(5)); M.sub('j2', 'active', [PRO(1)]); M.sub('j2', 'active', [OPL('stock', 1)]);
  M.ent('j3'); M.usage('PRO-BANC-850', 'j3', jour(4));

  const fct = facteur(); facteurs.push(fct);
  const portSmtp = await new Promise(res => fct.s.listen(0, '127.0.0.1', () => res(fct.s.address().port)));
  const fichierPlein = copie(tablePleine);
  const S1 = await demarrer(M, { fichier: fichierPlein, smtp: portSmtp, env: { TEAMOP_RAPPELS_DELAI_MS: '2500' } });
  vrai('le vrai serveur démarre, isolé (tarifs d\'option posés sur une copie, Stripe simulé relu à chaque appel)', S1.vivant);
  if (!S1.vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  vrai('(population) /health : le registre des codes est lisible', ((await S1.appel('/health')).j.registres || {}).promos === true);
  const PATRON = await S1.patron();
  vrai('(population) la Tour se connecte', !!PATRON);

  console.log('\n  a à h · une option ne fait JAMAIS passer pour payé, ne donne aucune place, ne lève aucun blocage');
  v('⛔⛔ a · fiche Business Premium, abonnement = UNE option × 3 : SUSPENDUE (avant : « payée » Business Premium)', SUSP(await S1.etat('a')), true);
  v('⛔⛔ b · fiche Business Premium, Pro × 3 + deux options × 3 : la formule payée — Pro, 3 places, deux options', VU(await S1.etat('b')), [true, 'pro', 3, ['achats', 'stock']]);
  v('   c · fiche Pro, la même chose', VU(await S1.etat('c')), [true, 'pro', 3, ['achats', 'stock']]);
  v('⛔⛔ d · fiche Business : Pro × 3 + deux options × 3 donne Pro (avant : les options s\'ajoutaient au rang de la fiche, 6 contre 3 : Business)', VU(await S1.etat('d')), [true, 'pro', 3, ['achats', 'stock']]);
  v('⛔⛔ e · fiche SANS formule, option seule : SUSPENDUE (avant : Business Premium — 6 € achetaient tout)', SUSP(await S1.etat('e')), true);
  v('⛔⛔ f · fiche « Gratuit », option seule : SUSPENDUE (avant : Pro)', SUSP(await S1.etat('f')), true);
  v('⛔⛔ g · Pro IMPAYÉ + une option payée à côté : SUSPENDUE — l\'option ne lève pas le blocage', SUSP(await S1.etat('g')), true);
  v('⛔ h · places : Pro × 3 + une option × 5 = 3 places (l\'option n\'en ajoute aucune)', VU(await S1.etat('h')), [true, 'pro', 3, ['stock']]);
  v('⛔ h2 · un abonnement d\'AVANT la bascule qui porte Pro × 3 et une option × 3 : 3 places, pas 6', (await S1.etat('h2')).places, 3);

  console.log('\n  i · la couverture est STRICTE : on ne perd pas d\'argent');
  v('⛔ i1 · Pro × 3, Stock × 2 : la rubrique n\'est PAS servie (deux personnes sur trois)', VU(await S1.etat('i1')), [true, 'pro', 3, []]);
  v('   i2 · Stock × 2 et Stock × 1 dans deux abonnements : trois places, servie', VU(await S1.etat('i2')), [true, 'pro', 3, ['stock']]);
  v('   i3 · UN abonnement mixte Pro × 3 + quatre options × 3 : les quatre, triées', VU(await S1.etat('i3')), [true, 'pro', 3, ['achats', 'compta', 'sanitaire', 'stock']]);

  console.log('\n  j · Business a tout ; k, l · ce qui n\'est pas à elle ou pas payé ne sert pas');
  v('⛔ j · Business × 2 + une option × 2 : Business, `options: []` (toutes les rubriques sont déjà ouvertes)', VU(await S1.etat('j')), [true, 'business', 2, []]);
  v('⛔⛔ k · l\'option d\'une voisine d\'adresse n\'est ni servie, ni un doute : la formule payée (Pro) sous la fiche Business Premium', VU(await S1.etat('k')), [true, 'pro', 1, []]);
  v('⛔⛔ k3 · adresse partagée, abonnements non gravés : l\'option n\'est PAS sûrement à elle — aucune option servie', OPT(await S1.etat('k3')), []);
  v('⛔ l · une option IMPAYÉE à côté d\'un Pro qui paie : servie Pro, aucune option, pas suspendue', VU(await S1.etat('l')), [true, 'pro', 3, []]);

  console.log('\n  m, n, o · période offerte, réglé à la main, plusieurs noms');
  v('⛔ m · PÉRIODE OFFERTE : la formule du code, `options: []` même avec une option payée', VU(await S1.etat('m')), [true, 'premium', 1, []]);
  v('⛔ n1 · réglé à la main « actif », Pro, deux options : servies, triées (Stripe n\'est pas lu)', VU(await S1.etat('n1')), [true, 'pro', 1, ['sanitaire', 'stock']]);
  v('⛔ n2 · réglé à la main sous Business : `options: []` (une option d\'avant ne vaut rien sous Business)', VU(await S1.etat('n2')), [true, 'business', 2, []]);
  v('⛔ n3 · réglé « actif » mais ÉCHU : ne décide plus — suspendue, pas d\'options', SUSP(await S1.etat('n3')), true);
  v('   n4 · réglé « impayé » : suspendue, pas d\'options', SUSP(await S1.etat('n4')), true);
  v('   n5 · en essai, clés inconnues et doublons jetés : [stock]', VU(await S1.etat('n5')), [true, 'pro', 1, ['stock']]);
  const eO = await S1.appel('/api/espaces/etat', { t: 't-o-850' });
  v('⛔⛔ o · l\'entreprise à DEUX noms : l\'ancien porte le réglage et ses options, elles se lisent sur le récent (même groupe)', [eO.j.paye, eO.j.formule, OPT(eO.j)], [true, 'pro', ['stock']]);

  console.log('\n  l\'option ne figure QUE dans la réponse payée');
  const eInc = (await S1.appel('/api/espaces/etat', { t: 't-inconnue-850' })).j;
  vrai('une entreprise absente de l\'annuaire : ni formule, ni suspension, ni options', eInc.ok === true && !('options' in eInc) && !('formule' in eInc) && !('paye' in eInc));
  for (const id of ['a', 'e', 'g', 'n3']) vrai('suspendue (' + id + ') : aucune clé `options` (une option ne lève rien, et l\'application ne déduit rien d\'un champ absent)', !('options' in await S1.etat(id)));
  vrai('⛔ le motif public n\'en dit mot : « accès actif » (le détail est pour la Tour, gardée)', !/stock|achats|option/i.test(String((await S1.etat('c')).motif)) && (await S1.etat('c')).motif === 'accès actif');

  console.log('\n  l\'échéance se lit sur la FORMULE, pas sur l\'option tombée la première');
  const L1 = ((await S1.appel('/api/monitor/espaces/liste', undefined, PATRON)).j.espaces || []);
  const lig = nom => L1.find(x => x.slug === nom) || {};
  vrai('(population) la liste de la Tour porte les entreprises du monde', ['a', 'c', 'ech', 'l', 'n1', 'oold'].every(x => !!lig(x).slug));
  v('⛔ ech · l\'option (échéance dans 300 jours) est la première de la liste : la Tour montre l\'échéance du Pro', lig('ech').echeance, jour(20));

  /* ══ 2. LA TOUR : ce qu'elle voit, ce qu'elle règle ═══════════════════════════════════════════════════════════════════ */
  console.log('\n  La Tour · lecture');
  v('⛔ la liste dit les options SERVIES, celles réglées à la main et les lignes d\'option de Stripe (clé, quantité, statut)',
    [lig('c').optionsServies, (lig('c').optionsStripe || []).map(x => [x.cle, x.quantite, x.statut].join(':')).sort(), lig('n1').options, lig('n1').optionsServies],
    [['achats', 'stock'], ['achats:3:active', 'stock:3:active'], ['stock', 'sanitaire'].sort((x, y) => CLES.indexOf(x) - CLES.indexOf(y)), ['sanitaire', 'stock']]);
  v('⛔ l\'option IMPAYÉE se voit à la Tour (statut past_due) sans bloquer l\'entreprise ni compter comme impayé d\'OP GESTION',
    [(lig('l').optionsStripe || []).map(x => x.cle + ':' + x.statut), lig('l').impaye, lig('l').impayesPartiels, lig('l').paye], [['stock:past_due'], false, 0, true]);
  v('⛔ g · le Pro impayé seul compte : bloquée, un impayé d\'OP GESTION, l\'option payée ne le lève pas', [lig('g').impaye, lig('g').paye, lig('g').optionsServies], [true, false, []]);
  const st = (await S1.appel('/api/monitor/espaces/statut', { nom: 'c' }, PATRON)).j;
  v('   /statut : optionsServies et lignes d\'option', [st.optionsServies, (st.optionsStripe || []).length, st.formuleServie, st.places], [['achats', 'stock'], 2, 'pro', 3]);
  const st2 = (await S1.appel('/api/monitor/espaces/statut', { nom: 'n1' }, PATRON)).j;
  v('   /statut d\'un réglage à la main : les options réglées (`options`) et servies', [st2.options, st2.optionsServies], [['stock', 'sanitaire'], ['sanitaire', 'stock']]);

  console.log('\n  La Tour · /api/monitor/espaces/abonnement (options réglées à la main)');
  const regAvant = JSON.stringify(S1.lireReg().p1);
  const ab = (corps, nom) => S1.appel('/api/monitor/espaces/abonnement', Object.assign({ nom: nom || 'p1', formule: 'pro', quantite: 3, statut: 'actif', fin: '' }, corps), PATRON);
  const rA = await ab({ options: ['stock', 'achats'] });
  v('⛔ « actif », Pro, deux options : enregistré', [rA.s, rA.j.options], [200, ['stock', 'achats']]);
  const regA = S1.lireReg().p1;
  vrai('   écrit (clés, qui, quand) — `espaces.json` par `espacesEcrire`', Array.isArray(regA.options) && regA.options.join() === 'stock,achats' && regA.optionsPar === 'Patron' && regA.optionsTs > 0);
  v('   et l\'application les lit : Pro, Stock et Achats', VU(await S1.etat('p1')), [true, 'pro', 3, ['achats', 'stock']]);
  const refus = [
    ['une clé inconnue', { options: ['registre'] }], ['pas un tableau', { options: 'stock' }], ['une clé qui n\'est pas du texte', { options: [4] }],
    ['sous Business (il a tout)', { formule: 'business', options: ['stock'] }], ['sous Business Premium', { formule: 'premium', options: ['stock'] }],
    ['statut « auto »', { statut: 'auto', options: ['stock'] }], ['statut « impayé »', { statut: 'impaye', options: ['stock'] }], ['statut « suspendu »', { statut: 'suspendu', options: ['stock'] }],
    ['statut « annulé »', { statut: 'annule', options: ['stock'] }]];
  const apres0 = JSON.stringify(S1.lireReg().p1);
  const reps = []; for (const [, c] of refus) reps.push((await ab(c)).s);
  v('⛔ refusées (400) : ' + refus.map(r => r[0]).join(', '), reps, refus.map(() => 400));
  v('   … et RIEN n\'est écrit par un refus', JSON.stringify(S1.lireReg().p1), apres0);
  const rE = await ab({ statut: 'essai', fin: jour(10), options: ['sanitaire'] });
  v('   « essai » est permis', [rE.s, rE.j.options], [200, ['sanitaire']]);
  const rAbs = await ab({ quantite: 4 });
  v('⛔ une Tour d\'avant (pas de champ `options`) : les options en place RESTENT tant qu\'elles ont un sens', [rAbs.s, rAbs.j.options, S1.lireReg().p1.options], [200, ['sanitaire'], ['sanitaire']]);
  const rB = await ab({ formule: 'business' });
  v('⛔ … mais sous Business elles s\'effacent (un réglage qui ne dit plus rien)', [rB.s, rB.j.options, S1.lireReg().p1.options], [200, [], []]);
  const rV = await ab({ formule: 'business', options: [] });
  v('   `[]` se permet toujours (le retrait)', [rV.s, rV.j.options], [200, []]);
  void regAvant;
  /* deux noms : écrit sur TOUS */
  const rP2 = await ab({ options: ['compta'] }, 'p2new');
  const regP2 = S1.lireReg();
  v('⛔⛔ une entreprise à DEUX noms : les options s\'écrivent sur les deux (même groupe que l\'abonnement réglé)', [rP2.s, regP2.p2old.options, regP2.p2new.options], [200, ['compta'], ['compta']]);
  v('   et l\'application les lit', OPT(await S1.etat('t-p2-850')), ['compta']);
  /* « Revoir le lien » */
  const rLien = await S1.appel('/api/monitor/espaces', { nom: 'p3', code: S1.lireReg().p3.code }, PATRON);
  v('⛔⛔ « Revoir le lien » d\'une entreprise réglée à la main GARDE ses options (la route reconstruit l\'entrée de zéro)', [rLien.s, S1.lireReg().p3.options, S1.lireReg().p3.aboStatut], [200, ['achats'], 'actif']);

  /* ══ 3. « MON ESPACE » : un champ à part ═════════════════════════════════════════════════════════════════════════════ */
  console.log('\n  « Mon espace » · les options dans un champ à part, jamais dans la formule');
  const moi = async id => ((await S1.appel('/api/portail/moi', undefined, S1.jetons[id])).j.dossier) || {};
  const mC = await moi('c'), mA = await moi('a'), mJ = await moi('j');
  v('⛔ c · payée Pro avec Stock et Achats : `plan` reste « Pro », les options sont des LIBELLÉS dans `options`', [mC.plan, mC.options], ['Pro', ['Stock (et box pour la 3D)', 'Achats fournisseurs']]);
  vrai('   la chaîne de la formule ne parle pas des options', !/stock|achats/i.test(String(mC.plan)));
  v('   suspendue (a) : aucune option', [mA.planStatus, mA.options], ['suspendu', []]);
  v('   Business : aucune option à montrer', [mJ.plan, mJ.options], ['Business', []]);
  /* ⛔⛔ un client n'écrit PAS ses options : `options` est un champ du serveur (CHAMPS_SERVEUR) — sinon « Mon espace » lui montrerait
     « Stock » comme servi chaque fois que le serveur ne répond pas (doute, adresse partagée) */
  const forge = ['Stock (et box pour la 3D)', 'Registre sanitaire (métier 3D)'];
  const rF = await S1.appel('/api/portail/demande', { options: forge, sujet: 'banc 850' }, S1.jetons.i1);
  const mI1 = await moi('i1');
  v('⛔⛔ i1 (Stock × 2 sur trois places : rien de servi) écrit `options` dans sa demande : le serveur la reçoit (200) mais la page ne lit JAMAIS cette copie',
    [rF.s, mI1.options === undefined ? 'absent' : mI1.options], [200, []]);
  const rK = await S1.appel('/api/portail/demande', { options: forge }, S1.jetons.k);
  const mK = await moi('k');
  v('⛔ k partage son adresse avec k2 (le serveur ne choisit pas pour le client) : la copie forgée n\'apparaît PAS non plus — le champ est absent',
    [rK.s, mK.options === undefined ? 'absent' : mK.options], [200, 'absent']);
  const rapide = JSON.parse(fs.readFileSync(path.join(S1.D, 'portail.json'), 'utf8'));
  const dosI1 = (rapide.d || {})[mail('i1')];
  vrai('(population) le dossier de i1 existe bien (la demande l\'a créé) et NE PORTE PAS `options` : le serveur écarte ce champ à l\'écriture', !!dosI1 && dosI1.options === undefined && Object.keys(dosI1).length > 2)

  /* ══ 4. LA ROUTE DE PAIEMENT : ce qui PART chez Stripe ═══════════════════════════════════════════════════════════════════ */
  console.log('\n  Paiement · formule + options');
  const payer = (id, corps, ip) => S1.appel('/api/stripe/checkout', corps, S1.jetons[id]);
  const dernier = () => { const s = S1.sessions(); return s[s.length - 1]; };
  const nSess = () => S1.sessions().length;
  let r = await payer('c1', { price: P.pro[0], quantity: 4, ref: 't-c1-850', options: ['stock', 'compta'] });
  v('⛔⛔ Pro × 4 + Stock + Compta, au mois : trois lignes, MÊME quantité, tarifs du SERVEUR, cycle de la formule', [r.s, ligN(dernier())], [200, ['pro:M×4', 'stock:M×4', 'compta:M×4']]);
  v('   la référence d\'entreprise est gravée sur la session ET l\'abonnement, jamais de fin d\'essai (aucune période offerte)',
    [dernier().get('client_reference_id'), dernier().get('subscription_data[metadata][espace]'), dernier().get('subscription_data[trial_end]'), dernier().get('mode')], ['t-c1-850', 't-c1-850', null, 'subscription']);
  r = await payer('c1', { price: P.pro[1], quantity: 2, ref: 't-c1-850', options: ['stock'] });
  v('⛔ à l\'ANNÉE : le tarif annuel de la formule ET celui de l\'option (un seul intervalle par abonnement)', [r.s, ligN(dernier())], [200, ['pro:A×2', 'stock:A×2']]);
  r = await payer('c1', { price: P.pro[0], quantity: 1, ref: 't-c1-850', options: ['sanitaire', 'stock', 'stock'] });
  v('   dédoublonnées, dans l\'ordre de la grille (Stock avant Registre sanitaire)', [r.s, ligN(dernier())], [200, ['pro:M×1', 'stock:M×1', 'sanitaire:M×1']]);
  const n0 = nSess();
  for (const corps of [{ options: null }, { options: [] }, {}]) { r = await payer('c1', Object.assign({ price: P.pro[0], quantity: 2, ref: 't-c1-850' }, corps)); }
  v('   sans option (absent, null, []) : une seule ligne, comme avant', [r.s, nSess() - n0, ligN(dernier())], [200, 3, ['pro:M×2']]);
  v('   un prospect (pas de référence) peut aussi prendre des options à son premier paiement', [(await payer('c1', { price: P.pro[0], quantity: 2, options: ['achats'] })).s, ligN(dernier())], [200, ['pro:M×2', 'achats:M×2']]);

  console.log('\n  Paiement · les refus (400) — le corps ne porte que des CLÉS');
  const n1 = nSess();
  const codes = {};
  for (const [nom, corps] of [
    ['inconnue', { options: ['bidon'] }], ['registre', { options: ['registre'] }], ['pas un tableau', { options: 'stock' }], ['pas du texte', { options: [4] }],
    ['cinq clés', { options: ['stock', 'stock', 'stock', 'stock', 'stock'] }], ['un identifiant de tarif', { options: [OP.stock[0]] }]])
    codes[nom] = (await payer('c1', Object.assign({ price: P.pro[0], quantity: 1, ref: 't-c1-850' }, corps))).j.error;
  v('⛔ option_inconnue : une clé inconnue, « registre » (c\'est « sanitaire »), un texte, un nombre, plus de quatre, un identifiant de tarif', Object.values(codes), Object.keys(codes).map(() => 'option_inconnue'));
  v('⛔ un tarif d\'option envoyé comme `price` n\'est JAMAIS accepté : `tarif_inconnu` (le `price` reste une FORMULE)',
    [(await payer('c1', { price: OP.stock[0], quantity: 1, ref: 't-c1-850' })).j.error, (await payer('c1', { price: OP.stock[1], options: ['stock'], ref: 't-c1-850' })).j.error], ['tarif_inconnu', 'tarif_inconnu']);
  v('⛔ Business, Business Premium, OP MESSAGES + options : `option_incluse`',
    [(await payer('c1', { price: P.business[0], options: ['stock'] })).j.error, (await payer('c1', { price: P.premium[1], options: ['stock'] })).j.error, (await payer('c1', { price: P.msgpro[0], options: ['stock'] })).j.error], ['option_incluse', 'option_incluse', 'option_incluse']);
  v('   ni `price` ni option : « tarif invalide », comme avant', (await payer('c1', {})).j.error, 'tarif invalide');
  v('⛔ rien n\'est parti chez Stripe pour tous ces refus', nSess() - n1, 0);

  console.log('\n  Paiement · ajout d\'option SEULE (le Pro est déjà là)');
  const n2 = nSess();
  v('⛔ sans référence d\'entreprise : 409 `entreprise_requise`', [(await payer('c6e', { options: ['stock'] })).j.error, (await payer('c6e', { options: ['stock'], ref: 'inconnue-850' })).j.error], ['entreprise_requise', 'entreprise_requise']);
  v('⛔ une entreprise sans abonnement Pro : 409 `formule_requise` (une option sans le Pro dont elle dépend ne sert à rien)', (await payer('c6c', { options: ['stock'], ref: 't-c6c-850' })).j.error, 'formule_requise');
  v('   … ni sous Business (il a tout)', (await payer('c6d', { options: ['stock'], ref: 't-c6d-850' })).j.error, 'formule_requise');
  v('⛔ … ni quand la Tour règle l\'abonnement à la main (Stripe n\'est pas lu : l\'option ne serait jamais servie)', (await payer('c6k', { options: ['stock'], ref: 't-c6k-850' })).j.error, 'formule_requise');
  v('   aucune page de paiement n\'est créée pour ces refus', nSess() - n2, 0);
  r = await payer('c6e', { options: ['stock'], ref: 't-c6e-850', quantity: 99, price: undefined });
  v('⛔⛔ Pro × 3 payé : l\'option SEULE — une ligne, la quantité du SERVEUR (3 places), jamais celle du corps (99), gravée à l\'entreprise',
    [r.s, ligN(dernier()), dernier().get('subscription_data[metadata][espace]'), dernier().get('client_reference_id')], [200, ['stock:M×3'], 't-c6e-850', 't-c6e-850']);
  /* ⛔⛔ LE CYCLE D'UNE OPTION AJOUTÉE SEULE EST CELUI DU PRO QUE L'ENTREPRISE PAIE, JAMAIS CELUI DU CORPS (1er octobre 2026, relecture
     d'intégration : le serveur lisait `cycle` du corps — un Pro annuel recevait l'option au mois, et un corps pouvait choisir) */
  r = await payer('c6e', { options: ['achats', 'compta'], ref: 't-c6e-850', cycle: 'annuel' });
  v('⛔⛔ Pro payé AU MOIS : l\'option est mensuelle, quoi que le corps demande (`cycle: annuel` ignoré)', [r.s, ligN(dernier())], [200, ['achats:M×3', 'compta:M×3']]);
  v('   une valeur de cycle quelconque, même inconnue, ne fait rien non plus (plus de `cycle_inconnu` : le corps n\'a pas de cycle)', (await payer('c6e', { options: ['stock'], ref: 't-c6e-850', cycle: 'trimestriel' })).s, 200);
  r = await payer('c6m', { options: ['stock', 'sanitaire'], ref: 't-c6m-850' });
  v('⛔⛔ Pro payé À L\'ANNÉE : les options sont annuelles, sans que le corps le dise (un seul calendrier de prélèvement)', [r.s, ligN(dernier())], [200, ['stock:A×3', 'sanitaire:A×3']]);
  r = await payer('c6m', { options: ['stock'], ref: 't-c6m-850', cycle: 'mensuel' });
  v('⛔ … et le corps ne la ramène pas au mois en le demandant', [r.s, ligN(dernier())], [200, ['stock:A×3']]);
  r = await payer('c6n', { options: ['stock'], ref: 't-c6n-850' });
  v('   deux Pro de cycles mêlés (1 au mois, 2 à l\'année) : le cycle qui porte le plus de places — l\'année', [r.s, ligN(dernier())], [200, ['stock:A×3']]);
  r = await payer('c6o', { options: ['stock'], ref: 't-c6o-850' });
  v('   (2 au mois, 1 à l\'année) : le mois', [r.s, ligN(dernier())], [200, ['stock:M×3']]);
  v('⛔ une option DÉJÀ SERVIE : 409 `option_deja` (payée deux fois sinon) — seule ou avec une autre',
    [(await payer('c6g', { options: ['stock'], ref: 't-c6g-850' })).j.error, (await payer('c6g', { options: ['achats', 'stock'], ref: 't-c6g-850' })).j.error], ['option_deja', 'option_deja']);
  r = await payer('c6g', { options: ['achats'], ref: 't-c6g-850' });
  v('   une AUTRE option est vendue', [r.s, ligN(dernier())], [200, ['achats:M×3']]);
  r = await payer('c6h', { options: ['stock'], ref: 't-c6h-850' });
  v('⛔ Stock payé pour UNE place sur trois : on ne fait payer que ce qui MANQUE (2), pas de nouveau les trois', [r.s, ligN(dernier())], [200, ['stock:M×2']]);

  console.log('\n  Paiement · un impayé se règle, il ne se rachète pas — l\'option non plus');
  const n3 = nSess();
  r = await payer('c6i', { options: ['stock'], ref: 't-c6i-850' });
  v('⛔ le Pro est IMPAYÉ : l\'option seule envoie sur la FACTURE, rien n\'est créé', [r.s, r.j.url, r.j.facture, nSess() - n3], [200, 'https://invoice.stripe.com/i/banc-850-c6i', true, 0]);
  r = await payer('c6j', { options: ['stock'], ref: 't-c6j-850' });
  v('⛔⛔ l\'OPTION est impayée (le Pro paie) : sa facture, pas une seconde option prélevée en double', [r.s, r.j.url, r.j.facture, nSess() - n3], [200, 'https://invoice.stripe.com/i/banc-850-c6j', true, 0]);
  r = await payer('c6j', { options: ['achats'], ref: 't-c6j-850' });
  v('   une AUTRE option reste vendable', [r.s, ligN(dernier())], [200, ['achats:M×3']]);
  r = await payer('c6j', { price: P.pro[0], quantity: 1, ref: 't-c6j-850', options: ['stock'] });
  v('⛔ la même option impayée, demandée AVEC un abonnement Pro de plus : sa facture aussi', [r.s, r.j.url, r.j.facture], [200, 'https://invoice.stripe.com/i/banc-850-c6j', true]);

  console.log('\n  Paiement · racheter des places RAMÈNE les options déjà payées');
  /* ⛔⛔ LES OPTIONS DÉJÀ SERVIES SUIVENT — MAIS JAMAIS EN SILENCE (1er octobre 2026, `gardien`, rejoué : la page affichait 30 € et
     le client en payait 48). Le serveur refuse d'abord (409 `options_suivent`, rien chez Stripe) avec les options et le surcoût ;
     c'est le second envoi, qui les demande, qui part — et qui les ramène alors comme avant. */
  const nSuit = nSess();
  r = await payer('c7a', { price: P.pro[0], quantity: 1, ref: 't-c7a-850' });
  v('⛔⛔ Pro × 3 + Stock + Achats servis ; un abonnement Pro de plus, SANS option demandée : 409 `options_suivent` (les deux, 15 € par mois en plus), RIEN chez Stripe',
    [r.s, r.j.error, r.j.options, r.j.surcout, r.j.cycle, nSess() - nSuit], [409, 'options_suivent', ['stock', 'achats'], 15, 'mensuel', 0]);
  r = await payer('c7a', { price: P.pro[0], quantity: 1, ref: 't-c7a-850', options: ['stock', 'achats'] });
  v('   la page les coche et redemande : les deux options suivent, × 1 — sinon l\'équipe perdrait son Stock', [r.s, ligN(dernier())], [200, ['pro:M×1', 'stock:M×1', 'achats:M×1']]);
  r = await payer('c7a', { price: P.pro[1], quantity: 2, ref: 't-c7a-850', options: ['stock'] });
  v('⛔ à l\'année, avec Stock demandé et Achats déjà servi : seule la manquante se dit (Achats × 2 × 10 mois = 120 €), rien n\'est créé',
    [r.s, r.j.error, r.j.options, r.j.surcout, r.j.cycle, nSess() - nSuit - 1], [409, 'options_suivent', ['achats'], 120, 'annuel', 0]);
  r = await payer('c7a', { price: P.pro[1], quantity: 2, ref: 't-c7a-850', options: ['stock', 'achats'] });
  v('   une fois toutes demandées : tarifs annuels, ordre de la grille', [r.s, ligN(dernier())], [200, ['pro:A×2', 'stock:A×2', 'achats:A×2']]);
  r = await payer('c7a', { price: P.pro[0], quantity: 1, ref: 't-c7a-850', options: ['achats', 'stock'] });
  v('   (l\'ordre du corps ne change rien : celui de la grille)', [r.s, ligN(dernier())], [200, ['pro:M×1', 'stock:M×1', 'achats:M×1']]);
  /* ⛔⛔ PRO + OPTION NON SERVIE POUR UNE ENTREPRISE QUI A DÉJÀ SON PRO = UN SECOND ABONNEMENT PRO (la page de paiement envoie toujours un
     `price` : le lien « Ajouter » de l'application menait là). Refusé, rien chez Stripe, et on dit où aller : l'ajout d'option seule. */
  const n7 = nSess();
  r = await payer('c7a', { price: P.pro[1], quantity: 2, ref: 't-c7a-850', options: ['compta'] });
  v('⛔⛔ Pro payé qui demande Pro + une option qu\'il N\'A PAS : 409 `utiliser_ajout`, rien n\'est créé (sinon un second Pro, et une option qui ne couvre pas les places)', [r.s, r.j.error, nSess() - n7], [409, 'utiliser_ajout', 0]);
  r = await payer('c6e', { price: P.pro[0], quantity: 1, ref: 't-c6e-850', options: ['stock'] });
  v('⛔ … même sans aucune option servie : le Pro est déjà là, l\'option se prend SEULE', [r.s, r.j.error, nSess() - n7], [409, 'utiliser_ajout', 0]);
  r = await payer('c6l', { price: P.pro[0], quantity: 1, ref: 't-c6l-850', options: ['achats'] });
  v('⛔ … y compris un Pro payé en période offerte (essai Stripe) : l\'option se prend seule, `trial_end` en suit la fin', [r.s, r.j.error, nSess() - n7], [409, 'utiliser_ajout', 0]);
  r = await payer('c1', { price: P.pro[0], quantity: 2, ref: 't-c1-850', options: ['stock', 'compta'] });
  v('   (contre-épreuve) une entreprise SANS Pro payé achète son Pro et ses options ensemble', [r.s, ligN(dernier())], [200, ['pro:M×2', 'stock:M×2', 'compta:M×2']]);
  r = await payer('c6d', { price: P.pro[0], quantity: 1, ref: 't-c6d-850', options: ['stock'] });
  v('   (contre-épreuve) une entreprise Business qui prend un Pro avec une option : le paiement normal suit (Business n\'est pas le Pro)', [r.s, ligN(dernier())], [200, ['pro:M×1', 'stock:M×1']]);
  r = await payer('c7a', { price: P.business[0], quantity: 1, ref: 't-c7a-850' });
  v('   un tarif Business n\'en ramène aucune (il a tout)', [r.s, ligN(dernier())], [200, ['business:M×1']]);
  r = await payer('c6e', { price: P.pro[0], quantity: 1, ref: 't-c6e-850' });
  v('   une entreprise sans option servie : rien de plus', [r.s, ligN(dernier())], [200, ['pro:M×1']]);
  r = await payer('c6h', { price: P.pro[0], quantity: 1, ref: 't-c6h-850' });
  v('⛔ Stock payé pour une place sur trois (non servi) : il ne suit pas — on ne le multiplie pas à l\'aveugle', [r.s, ligN(dernier())], [200, ['pro:M×1']]);
  r = await payer('c6i', { price: P.pro[0], quantity: 1, ref: 't-c6i-850' });
  v('   (inchangé) Pro impayé + nouvel abonnement : la facture', [r.s, r.j.facture], [200, true]);
  v('⛔ le compte d\'une AUTRE entreprise ne peut pas y acheter des options (403, rien chez Stripe)', [(await payer('c1', { options: ['stock'], ref: 't-c6e-850' })).s, (await payer('c1', { options: ['stock'], ref: 't-c6e-850' })).j.error], [403, 'compte_autre_entreprise']);

  /* ⛔⛔ UNE DÉCISION D'ACHAT SE PREND SUR UNE LISTE LUE POUR ELLE (1er octobre 2026, `gardien`, rejoué : r1.js, r4.js). Le client paie
     « Ajouter Stock » et reclique dans la minute : la liste en cache ne voit pas son paiement — l'ajout repartait en 200 (un second
     `stock × 3`, prélevé en double), et « Pro + 2 places » ne ramenait pas le Stock déjà payé (l'équipe le perdait : 5 places, Stock × 3).
     Ici le cache dure dix minutes et le rafraîchissement d'un impayé une seconde : le premier envoi relit la liste, le paiement arrive
     APRÈS, et le second envoi part dans la seconde — sur l'ancien code, la liste d'avant le servait encore. */
  console.log('\n  Paiement · la liste des abonnements est relue AU MOMENT de décider (le paiement qu\'on vient de faire se voit)');
  r = await payer('c8a', { options: ['stock'], ref: 't-c8a-850' });
  v('   premier ajout de Stock : une seule ligne × 3', [r.s, ligN(dernier())], [200, ['stock:M×3']]);
  M.sub('c8a', 'active', [OPL('stock', 3)]); S1.poser();   // le client vient de payer : Stripe le sait, le serveur ne l'a pas encore relu
  const nFr = nSess();
  r = await payer('c8a', { options: ['stock'], ref: 't-c8a-850' });
  v('⛔⛔ le même ajout dans la seconde : 409 `option_deja` (avant : 200, un second Stock × 3 prélevé en double), rien chez Stripe', [r.s, r.j.error, nSess() - nFr], [409, 'option_deja', 0]);
  r = await payer('c8b', { price: P.pro[0], quantity: 1, ref: 't-c8b-850' });
  v('   (contre-épreuve) une entreprise Pro × 3 sans option : l\'achat d\'un Pro de plus se passe comme avant', [r.s, ligN(dernier())], [200, ['pro:M×1']]);
  M.sub('c8b', 'active', [OPL('stock', 3)]); S1.poser();   // elle paie le Stock × 3 ; le rachat de places arrive dans la seconde
  const nFr2 = nSess();
  r = await payer('c8b', { price: P.pro[0], quantity: 2, ref: 't-c8b-850' });
  v('⛔⛔ Pro + 2 places juste après le paiement du Stock × 3 : le Stock suit (409 `options_suivent`), il n\'est pas oublié (avant : `pro × 2` seul, Stock fermé pour toute l\'équipe)',
    [r.s, r.j.error, r.j.options, r.j.surcout, nSess() - nFr2], [409, 'options_suivent', ['stock'], 18, 0]);

  console.log('\n  Paiement · la période offerte : la facturation attend sa fin, option comprise');
  const finPeriode = jour(30), lendemain = jour(31);
  r = await payer('c6l', { options: ['stock'], ref: 't-c6l-850' });
  const tEssai = parseInt(dernier().get('subscription_data[trial_end]'), 10);
  v('⛔⛔ Pro payé en période offerte + une option seule : `trial_end` = le lendemain de la fin, 0 h UTC (sinon l\'option serait prélevée tout de suite)',
    [r.s, ligN(dernier()), Number.isFinite(tEssai) ? new Date(tEssai * 1000).toISOString().slice(0, 10) : 'aucune fin d\'essai'], [200, ['stock:M×3'], lendemain]);
  vrai('   et la page de remerciement dit le jour du premier prélèvement', /debut=/.test(dernier().get('success_url') || ''));
  void finPeriode;

  /* ══ 5. LE COURRIEL DES SEPT JOURS ═══════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n  Le courriel des sept jours');
  for (let i = 0; i < 120 && fct.recus.length < 3; i++) await dormir(100);
  await dormir(500);
  const recus = fct.recus.map(lisible);
  const de = qui => recus.find(m => destinataire(m) === mail(qui)) || '';
  const PHRASE = 'Options du Pro : Stock +9 €, Achats +6 €, Compta +6 €, Registre sanitaire (3D) +6 € par utilisateur et par mois';
  const J1 = de('j1'), J2 = de('j2'), J3 = de('j3');
  vrai('(population) trois rappels sont partis (j1, j2, j3)', !!J1 && !!J2 && !!J3);
  const sansNbsp = x => x.replace(/ /g, ' ');
  vrai('⛔ j1 · fiche Pro dont seule une OPTION est payée : le courriel HABITUEL — l\'option n\'est pas un abonnement d\'OP GESTION (« votre abonnement prend le relais » mentirait)',
    /Pour continuer/.test(J1) && !/prend le relais :/.test(J1) && /Sans abonnement, après le/.test(J1));
  /* le courriel a deux parties : la version TEXTE et la version HTML disent chacune la phrase (une mutation de l'une ne se voit pas dans l'autre) */
  const texteDe = m => sansNbsp(String(m).split(/Content-Type: text\/html/)[0]), htmlDe = m => sansNbsp(String(m).split(/Content-Type: text\/html/)[1] || '');
  vrai('⛔ j1 · la phrase des options du Pro, avec la grille du serveur, à côté de la ligne Pro (formule d\'aujourd\'hui : Business Premium) — en TEXTE', texteDe(J1).includes(PHRASE));
  vrai('   … et dans la version HTML', htmlDe(J1).includes(PHRASE));
  vrai('⛔ j2 · Pro + option payés : « votre abonnement prend le relais », et pas de lien de paiement (un second abonnement serait prélevé en double)',
    /Votre abonnement prend le relais : vous n'avez rien à faire/.test(J2) && !/recap-abonnement\.html/.test(J2));
  vrai('⛔ j3 · code Pro (la formule d\'aujourd\'hui est Pro) : la phrase sous son devis — en TEXTE', texteDe(J3).includes(PHRASE) && /formule Pro/.test(texteDe(J3)));
  vrai('   … et dans la version HTML', htmlDe(J3).includes(PHRASE) && /<b>Formule Pro<\/b>/.test(htmlDe(J3)));

  await S1.arreter();

  /* ══ 6. LE DOUTE NE DÉCIDE RIEN : liste Stripe périmée, Stripe muet ═══════════════════════════════════════════════════ */
  console.log('\n  Dans le doute, on ne décide rien');
  const M2 = monde();
  M2.ent('s2'); M2.sub('s2', 'active', [PRO(3)]); M2.sub('s2', 'active', [OPL('stock', 3)]);
  const S2 = await demarrer(M2, { fichier: fichierPlein, cacheMs: 1500 });
  vrai('le serveur démarre (liste Stripe gardée 1,5 s)', S2.vivant);
  v('Stripe lu : Pro, 3 places, Stock', VU(await S2.etat('s2')), [true, 'pro', 3, ['stock']]);
  S2.E.muet = true; S2.poser(); await dormir(1800);
  const e2 = await S2.etat('s2');
  v('⛔ la liste est PÉRIMÉE (la relecture échoue) : toujours servie Pro (on ne coupe pas) — mais `options` ABSENT : on ne sait pas, l\'application garde ce qu\'elle savait',
    [e2.paye, e2.formule, OPT(e2)], [true, 'pro', 'ABSENT']);
  const nMu = S2.sessions().length;
  r = await S2.appel('/api/stripe/checkout', { options: ['stock'], ref: 't-s2-850' }, S2.jetons.s2);
  v('⛔⛔ … et un ACHAT d\'option ne se décide pas sur cette liste ancienne : 502 `stripe_indisponible`, rien chez Stripe (avant : décidé sur du périmé)', [r.s, r.j.error, S2.sessions().length - nMu], [502, 'stripe_indisponible', 0]);
  r = await S2.appel('/api/stripe/checkout', { price: P.pro[0], quantity: 1, ref: 't-s2-850' }, S2.jetons.s2);
  v('   … ni l\'achat d\'un Pro de plus, qui doit ramener les options servies : 502 aussi (avant : `pro` seul, fail-open)', [r.s, r.j.error, S2.sessions().length - nMu], [502, 'stripe_indisponible', 0]);
  await S2.arreter();
  const M3 = monde(); M3.ent('s3'); M3.sub('s3', 'active', [PRO(3)]); M3.sub('s3', 'active', [OPL('stock', 3)]);
  const S3 = await demarrer(M3, { fichier: fichierPlein, muet: true });
  const e3 = await S3.etat('s3');
  v('⛔ Stripe MUET depuis le démarrage : « vérification impossible », ni formule, ni suspension, ni options', [e3.verificationImpossible, 'options' in e3, 'formule' in e3], [true, false, false]);
  r = await S3.appel('/api/stripe/checkout', { options: ['stock'], ref: 't-s3-850' }, S3.jetons.s3);
  v('⛔ Stripe muet depuis le démarrage : un ajout d\'option → 502 `stripe_indisponible` (avant : 409 `formule_requise`, un faux verdict), rien n\'est parti', [r.s, r.j.error, S3.sessions().length], [502, 'stripe_indisponible', 0]);
  await S3.arreter();

  /* ══ 7. LES TARIFS VIDES : rien ne se vend ═══════════════════════════════════════════════════════════════════════════ */
  console.log('\n  Tarifs d\'option vides (Justin ne les a pas créés) ou partiels');
  const M4 = monde(); M4.ent('v1'); M4.sub('v1', 'active', [PRO(3)]);
  const S4 = await demarrer(M4, { fichier: copie(tableVide) });
  const nv = S4.sessions().length;
  v('⛔ tarifs VIDES : formule + option → 400 `option_indisponible` ; option seule aussi', [(await S4.appel('/api/stripe/checkout', { price: P.pro[0], quantity: 1, ref: 't-v1-850', options: ['stock'] }, S4.jetons.v1)).j.error,
    (await S4.appel('/api/stripe/checkout', { options: ['stock'], ref: 't-v1-850' }, S4.jetons.v1)).j.error], ['option_indisponible', 'option_indisponible']);
  v('   rien n\'est parti chez Stripe, et la formule seule se paie toujours', [S4.sessions().length - nv, (await S4.appel('/api/stripe/checkout', { price: P.pro[0], quantity: 1, ref: 't-v1-850' }, S4.jetons.v1)).s], [0, 200]);
  v('   l\'application, elle, ne reçoit aucune option inventée (`[]`)', OPT(await S4.etat('v1')), []);
  await S4.arreter();
  const M5 = monde(); M5.ent('v2'); M5.ent('v3'); M5.sub('v3', 'active', [PRO(3)]); M5.ent('v4'); M5.sub('v4', 'active', [[P.pro[1], 3]]);
  const S5 = await demarrer(M5, { fichier: copie(tablePartielle) });
  r = await S5.appel('/api/stripe/checkout', { price: P.pro[0], quantity: 1, ref: 't-v2-850', options: ['stock'] }, S5.jetons.v2);
  v('⛔ le tarif MENSUEL posé, l\'annuel vide : le mois se vend', [r.s, ligN(S5.sessions().pop())], [200, ['pro:M×1', 'stock:M×1']]);
  r = await S5.appel('/api/stripe/checkout', { price: P.pro[1], quantity: 1, ref: 't-v2-850', options: ['stock'] }, S5.jetons.v2);
  v('⛔ … l\'année non (le cycle choisit l\'index du tarif)', [r.s, r.j.error], [400, 'option_indisponible']);
  r = await S5.appel('/api/stripe/checkout', { options: ['stock'], ref: 't-v3-850' }, S5.jetons.v3);
  v('⛔ ajout d\'option SEULE, Pro payé au mois : le tarif mensuel posé suffit', [r.s, ligN(S5.sessions().pop())], [200, ['stock:M×3']]);
  r = await S5.appel('/api/stripe/checkout', { options: ['stock'], ref: 't-v4-850', cycle: 'mensuel' }, S5.jetons.v4);
  v('⛔⛔ ajout d\'option SEULE, Pro payé à l\'année et tarif annuel vide : `option_indisponible` — le serveur ne retombe PAS sur le mois que le corps propose', [r.s, r.j.error], [400, 'option_indisponible']);
  await S5.arreter();

  /* ══ 8. server/stripe-options.js : créer les tarifs chez Stripe ══════════════════════════════════════════════════════ */
  console.log('\n  server/stripe-options.js');
  const SCRIPT = path.join(path.dirname(SERVEUR), 'stripe-options.js');
  vrai('le script existe à côté du serveur', fs.existsSync(SCRIPT));
  const CLE = 'sk_de_banc_850_SECRETE';
  /* un Stripe simulé qui GARDE son état (deux passages), valide ce qu'on lui envoie et note chaque appel */
  const sandbox = nom => {
    const R = path.join(banc, 'so-' + nom); fs.mkdirSync(R, { recursive: true });
    const vap = webpush.generateVAPIDKeys();
    fs.writeFileSync(path.join(R, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, stripe: { secretKey: CLE } }));
    fs.writeFileSync(path.join(R, 'etat.json'), JSON.stringify({ produits: [], prix: [], n: 0, echecPrix: false, tax: 'inclusive' }));
    const PRE = path.join(R, 'pre.js');
    fs.writeFileSync(PRE, `const fs = require('fs'); const ETAT = ${JSON.stringify(path.join(R, 'etat.json'))}, JOURNAL = ${JSON.stringify(path.join(R, 'appels.jsonl'))};
globalThis.fetch = async function (url, opts) {
  const u = new URL(String(url && url.url || url)); const m = (opts && opts.method) || 'GET';
  const E = JSON.parse(fs.readFileSync(ETAT, 'utf8')); const corps = opts && opts.body ? Object.fromEntries(new URLSearchParams(String(opts.body))) : {};
  fs.appendFileSync(JOURNAL, JSON.stringify({ m, p: u.pathname, q: u.search, corps, auth: String((opts && opts.headers && opts.headers.Authorization) || '').replace(/sk_[A-Za-z0-9_]+/, 'sk_…'), idem: (opts && opts.headers && opts.headers['Idempotency-Key']) || '' }) + '\\n');
  const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
  if (u.host !== 'api.stripe.com') return json({ error: { message: 'hors Stripe' } }, 500);
  const sauver = () => fs.writeFileSync(ETAT, JSON.stringify(E));
  let r1;
  if ((r1 = /^\\/v1\\/prices\\/(price_\\w+)$/.exec(u.pathname)) && m === 'GET') {
    const mois = r1[1] === ${JSON.stringify(P.pro[0])}; return json({ id: r1[1], currency: 'eur', tax_behavior: E.tax, type: 'recurring', recurring: { interval: mois ? 'month' : 'year', interval_count: 1 } }); }
  if (u.pathname === '/v1/products' && m === 'GET') return json({ data: E.produits.filter(p => p.active !== false), has_more: false });
  if (u.pathname === '/v1/products' && m === 'POST') { const p = { id: 'prod_' + (++E.n), name: corps.name, metadata: { opg_option: corps['metadata[opg_option]'] }, active: true }; E.produits.push(p); sauver(); return json(p); }
  if (u.pathname === '/v1/prices' && m === 'GET') { const k = u.searchParams.get('lookup_keys[]'); return json({ data: E.prix.filter(p => p.lookup_key === k).slice(0, 1), has_more: false }); }
  if (u.pathname === '/v1/prices' && m === 'POST') {
    if (E.echecPrix) return json({ error: { message: 'Invalid API Key provided: ' + ${JSON.stringify(CLE)} } }, 401);
    for (const c of ['product', 'currency', 'unit_amount', 'recurring[interval]', 'lookup_key']) if (!corps[c]) return json({ error: { message: 'paramètre manquant : ' + c } }, 400);
    if (E.prix.some(p => p.lookup_key === corps.lookup_key)) return json({ error: { message: 'lookup_key déjà prise' } }, 400);
    const p = { id: 'price_so' + (++E.n), product: corps.product, currency: corps.currency, unit_amount: +corps.unit_amount, recurring: { interval: corps['recurring[interval]'] }, lookup_key: corps.lookup_key, tax_behavior: corps.tax_behavior || 'unspecified', metadata: { opg_option: corps['metadata[opg_option]'] } };
    E.prix.push(p); sauver(); return json(p); }
  return json({ error: { message: 'route inconnue du banc : ' + m + ' ' + u.pathname } }, 404);
};\n`);
    const lire = f => JSON.parse(fs.readFileSync(path.join(R, f), 'utf8'));
    return { R, PRE, etat: () => lire('etat.json'), poser: o => fs.writeFileSync(path.join(R, 'etat.json'), JSON.stringify(Object.assign(lire('etat.json'), o))),
      appels: () => { try { return fs.readFileSync(path.join(R, 'appels.jsonl'), 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { return []; } },
      lancer: (args, config) => { const c = spawnSync(process.execPath, ['--require', PRE, SCRIPT].concat(args || []), { env: Object.assign({}, process.env, { TEAMOP_CONFIG: config || path.join(R, 'config.json') }), encoding: 'utf8', timeout: 60000 }); return { code: c.status, sortie: String(c.stdout || '') + String(c.stderr || ''), out: String(c.stdout || '') }; } };
  };
  if (!fs.existsSync(SCRIPT)) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  const ESSAI = sandbox('essai');
  let so = ESSAI.lancer(['--essai']);
  const posts = a => a.filter(x => x.m === 'POST');
  v('⛔ --essai : code 0, AUCUN POST chez Stripe (il dit ce qu\'il ferait), huit tarifs « créerait »', [so.code, posts(ESSAI.appels()).length, (so.out.match(/→ créerait opg_option_/g) || []).length], [0, 0, 8]);
  vrai('   et aucun identifiant n\'est imprimé à coller (rien n\'existe encore)', !/const STRIPE_PRIX_OPTION/.test(so.out));
  const REEL = sandbox('reel');
  so = REEL.lancer([]);
  const E1 = REEL.etat();
  v('création : code 0, quatre produits et huit tarifs', [so.code, E1.produits.length, E1.prix.length], [0, 4, 8]);
  v('   les montants : 9 € / 90 €, puis 6 € / 60 € (centimes), mensuel et annuel', ['stock', 'achats', 'compta', 'sanitaire'].map(k => ['mensuel', 'annuel'].map(c => (E1.prix.find(p => p.lookup_key === 'opg_option_' + k + '_' + c) || {}).unit_amount)),
    [[900, 9000], [600, 6000], [600, 6000], [600, 6000]]);
  v('   les intervalles (mois, an), la devise et la nature « TTC » du tarif Pro (tax_behavior inclusive) repris', [E1.prix.every(p => (p.lookup_key.endsWith('_mensuel') ? p.recurring.interval === 'month' : p.recurring.interval === 'year') && p.currency === 'eur' && p.tax_behavior === 'inclusive')], [true]);
  vrai('   chaque produit est « OP GESTION — Option … » et ne contient JAMAIS « messages » (`ligneMessages` le lirait comme OP MESSAGES)', E1.produits.every(p => /^OP GESTION — Option /.test(p.name) && !/messages/i.test(p.name)));
  vrai('   chaque tarif est rattaché au produit de SON option (étiquette opg_option)', E1.prix.every(p => (E1.produits.find(x => x.id === p.product) || { metadata: {} }).metadata.opg_option === p.metadata.opg_option && p.lookup_key.includes('_' + p.metadata.opg_option + '_')));
  vrai('⛔⛔ la clé Stripe n\'apparaît NULLE PART dans la sortie (« on ne fait jamais afficher un secret sur le VPS »)', !so.sortie.includes(CLE) && !/sk_(live|test)_/.test(so.sortie));
  vrai('   … ni dans les appels (l\'en-tête Authorization existe mais le banc ne le voit pas en clair)', REEL.appels().every(a => /^Bearer sk_…$/.test(a.auth)));
  const bloc = (/const STRIPE_PRIX_OPTION = \{[\s\S]*?\};/.exec(so.out) || [''])[0];
  const blocPage = (/const STRIPE_PRICES_OPTIONS = \{[\s\S]*?\};/.exec(so.out) || [''])[0];
  vrai('   les deux blocs à coller sont imprimés (serveur et page)', !!bloc && !!blocPage);
  let evalue = null; try { evalue = new Function(bloc + '; return STRIPE_PRIX_OPTION;')(); } catch (e) { evalue = null; }
  let evaluePage = null; try { evaluePage = new Function(blocPage + '; return STRIPE_PRICES_OPTIONS;')(); } catch (e) { evaluePage = null; }
  const attendu = {}; for (const k of CLES) attendu[k] = ['mensuel', 'annuel'].map(c => E1.prix.find(p => p.lookup_key === 'opg_option_' + k + '_' + c).id);
  v('⛔ le bloc du SERVEUR contient les identifiants créés, [mensuel, annuel], dans l\'ordre de la grille', evalue, attendu);
  const attenduPage = {}; for (const k of CLES) attenduPage[k] = { mensuel: attendu[k][0], annuel: attendu[k][1] };
  v('   le bloc de la PAGE : les mêmes identifiants', evaluePage, attenduPage);
  v('⛔ le bloc du serveur ne ressemble PAS au motif de test-842 (deux espaces après les deux-points)', (bloc.match(motif842) || []).length, 0);
  /* le bloc se colle tel quel : le serveur copie le parse, et lit les options par ces identifiants */
  const collee = SRC.replace(RE_TABLE, () => bloc);
  fs.writeFileSync(path.join(banc, 'colle.js'), collee);
  vrai('   collé dans server/index.js, le fichier reste du JavaScript valide', spawnSync(process.execPath, ['--check', path.join(banc, 'colle.js')]).status === 0);
  const nAvant = REEL.appels().length, pAvant = posts(REEL.appels()).length;
  const so2 = REEL.lancer([]);
  v('⛔⛔ IDEMPOTENT : relancé, il ne crée RIEN de plus (aucun POST) et réimprime les mêmes identifiants', [so2.code, posts(REEL.appels()).length - pAvant, (/const STRIPE_PRIX_OPTION = \{[\s\S]*?\};/.exec(so2.out) || [''])[0] === bloc], [0, 0, true]);
  vrai('   (population) le second passage a bien lu Stripe', REEL.appels().length > nAvant);
  /* un produit déjà là mais pas ses tarifs : réutilisé */
  const PART = sandbox('partiel');
  PART.poser({ produits: [{ id: 'prod_vieux', name: 'ancien', metadata: { opg_option: 'achats' }, active: true }], n: 10 });
  PART.lancer([]);
  v('⛔ un produit d\'option déjà créé est RÉUTILISÉ (trois produits de plus, pas quatre)', [PART.etat().produits.length, PART.etat().prix.filter(p => p.product === 'prod_vieux').length], [4, 2]);
  /* un tarif existant au mauvais montant : signalé, pas modifié */
  const FAUX = sandbox('montant');
  FAUX.poser({ produits: [{ id: 'prod_s', name: 'x', metadata: { opg_option: 'stock' }, active: true }], prix: [{ id: 'price_vieux', product: 'prod_s', lookup_key: 'opg_option_stock_mensuel', unit_amount: 800, currency: 'eur', recurring: { interval: 'month' }, tax_behavior: 'inclusive', metadata: { opg_option: 'stock' } }], n: 20 });
  so = FAUX.lancer([]);
  vrai('⛔ un tarif trouvé à 8 € (la grille : 9 €) est SIGNALÉ, jamais modifié ni recréé', /opg_option_stock_mensuel existe déjà à 8 €.*NON modifié/.test(so.out) && FAUX.etat().prix.filter(p => p.lookup_key === 'opg_option_stock_mensuel').length === 1 && FAUX.etat().prix.find(p => p.lookup_key === 'opg_option_stock_mensuel').unit_amount === 800);
  /* Stripe refuse en citant la clé : elle ne sort pas */
  const PANNE = sandbox('panne');
  PANNE.poser({ echecPrix: true });
  so = PANNE.lancer([]);
  v('⛔ Stripe refuse en CITANT la clé dans son message : code 1, et la clé n\'est PAS imprimée (« [clé masquée] »)', [so.code, so.sortie.includes(CLE), /\[clé masquée\]/.test(so.sortie)], [1, false, true]);
  /* pas de clé */
  const SANS = sandbox('sans'); fs.writeFileSync(path.join(SANS.R, 'sans.json'), JSON.stringify({ stripe: {} }));
  so = SANS.lancer([], path.join(SANS.R, 'sans.json'));
  v('⛔ sans clé Stripe : refus clair (code 1), aucun appel réseau', [so.code, /Aucune clé Stripe/.test(so.sortie), SANS.appels().length], [1, true, 0]);
  so = SANS.lancer([], path.join(SANS.R, 'absent.json'));
  v('   configuration absente : refus (code 1), aucun appel', [so.code, SANS.appels().length], [1, 0]);
  /* le tarif Pro illisible : s'arrête */
  const ILL = sandbox('illisible'); ILL.poser({ tax: 'inclusive' });
  fs.writeFileSync(path.join(ILL.R, 'pre2.js'), fs.readFileSync(ILL.PRE, 'utf8').replace("return json({ id: r1[1], currency: 'eur'", "return json({ id: r1[1], currency: null"));
  const c2 = spawnSync(process.execPath, ['--require', path.join(ILL.R, 'pre2.js'), SCRIPT], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(ILL.R, 'config.json') }), encoding: 'utf8' });
  v('⛔ le tarif Pro de référence illisible : il S\'ARRÊTE plutôt que de deviner (code 1, aucun POST)', [c2.status, posts(ILL.appels()).length], [1, 0]);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
