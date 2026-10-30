/* Sonde SERVEUR de la couture du choix de métier (30 octobre 2026) : le VRAI server/index.js, isolé (127.0.0.1, données jetables), parlé en HTTP.
   La page « Créer votre application » du site n'écrit rien au serveur (elle prépare un courriel) : le serveur reçoit le choix par le portail
   (`/api/clients/sync`, demande avec métier, variante, rubriques), puis la Tour le pose (`/api/monitor/espaces/metier`), puis l'application le lit
   (`/api/espaces/etat`). Cette sonde joue ces trois routes avec les trois variantes du chauffage et les refus.                              */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.resolve(__dirname, '..', '..');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = s => crypto.createHash('sha256').update(s).digest('hex');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), { obtenu: a, attendu: b });
(async () => {
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-srv-')); const D = path.join(banc, 'data'); fs.mkdirSync(D);
  const MAINT = Date.now(), cle = n => String(n).toLowerCase().replace(/[^a-z0-9]+/g, '');
  const CODE = n => Buffer.from(JSON.stringify({ t: 't-' + n, k: 'k-' + n + '-' + 'x'.repeat(24), a: 'x', n }), 'utf8').toString('base64').replace(/=+$/, '');
  const esp = (n, mail) => ({ t: 't-' + n, nom: n, email: mail, ts: MAINT - 1000, formule: 'pro', quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Banc', code: CODE(n), aboStatut: 'actif', aboPar: 'Banc', aboTs: MAINT - 1000 });
  const espaces = { [cle('chauf-banc')]: esp('chauf-banc', 'chauf@exemple-sonde.fr'), [cle('plomb-banc')]: esp('plomb-banc', 'plomb@exemple-sonde.fr') };
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
  const MAIL = 'chauf@exemple-sonde.fr', brut = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: { [MAIL]: { v: true, pr: 'Cécile', no: 'Chaud', so: 'Chauf Banc' } }, j: { [sha(brut)]: { m: MAIL, g: 'session', exp: MAINT + 86400000 } } }));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mdp-sonde'), comptes: { actif: true } }));
  const PORT = 9400 + (process.pid % 300), B = 'http://127.0.0.1:' + PORT;
  let journal = '';
  const enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json') }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  let vivant = false;
  for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  vrai('le vrai serveur démarre, isolé', vivant); if (!vivant) { console.log(journal.slice(0, 1500)); process.exit(1); }
  const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: corps === undefined ? 'GET' : 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {} return { s: r.status, j: j || {} }; };
  try {
    const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mdp-sonde' })).j.token;
    vrai('(population) la Tour se connecte', typeof PATRON === 'string' && PATRON.length > 10);
    // le référentiel public : la base arrive à l'écran du site
    const ref = (await appel('/api/metiers')).j;
    vrai('/api/metiers rend la base (8 rubriques) et les métiers ouverts', Array.isArray(ref.base) && ref.base.length === 8 && ref.ouverts && ref.ouverts.includes('chauffage'), { base: ref.base, ouverts: ref.ouverts && ref.ouverts.length });
    const BASE = ref.base;
    const CATS = ['planning', 'interventions', 'clients'];   // le client ne coche (presque) rien : le serveur ajoute la base
    const dem = (o) => Object.assign({ app: 'OP GESTION', formule: 'Pro', statut: 'En attente', date: MAINT, besoin: 'x', users: '3', lien: 'chauf-banc' }, o);
    const fiche = (d) => ({ email: MAIL, nom: 'Chaud', prenom: 'Cécile', entreprise: 'Chauf Banc', apps: ['OP GESTION'], demandes: d });
    let date = MAINT;
    for (const v of ['deux', 'chauffage', 'climatisation']) {
      date += 1;
      const r = await appel('/api/clients/sync', fiche([dem({ date, metier: 'chauffage', variante: v, cats: CATS })]), brut);
      vrai('chauffage / ' + v + ' : la demande est reçue (200)', r.s === 200, r);
      const cli = ((await appel('/api/monitor/clients', undefined, PATRON)).j.clients || []).find(c => c.email === MAIL) || {};
      const d = (cli.demandes || []).find(x => x.date === date) || {};
      egal('   la Tour lit métier et variante : ' + v, [d.metier, d.variante], ['chauffage', v]);
      vrai('   ⛔ les rubriques rangées contiennent la BASE (8) en plus de ce que le client a coché', Array.isArray(d.cats) && BASE.every(k => d.cats.includes(k)) && CATS.every(k => d.cats.includes(k)), d.cats);
      const r2 = await appel('/api/monitor/espaces/metier', { nom: 'chauf-banc', metier: 'chauffage', variante: v }, PATRON);
      egal('   la Tour pose le métier + la variante', [r2.s, r2.j.metier, r2.j.variante], [200, 'chauffage', v]);
      const e = (await appel('/api/espaces/etat', { t: 't-chauf-banc' })).j;
      egal('   ⛔ /api/espaces/etat rend metier "chauffage" (même pour climatisation) + la variante', [e.metier, e.variante], ['chauffage', v]);
    }
    // les refus
    date += 1;
    let r = await appel('/api/clients/sync', fiche([dem({ date, metier: 'chauffage', variante: 'froid', cats: CATS })]), brut);
    egal('⛔ variante hors liste sur le chauffage → 400 variante_inconnue', [r.s, r.j.error], [400, 'variante_inconnue']);
    date += 1;
    r = await appel('/api/clients/sync', fiche([dem({ date, metier: 'plomberie', variante: 'chauffage', cats: CATS })]), brut);
    egal('⛔ une variante donnée à un autre métier (plomberie) → 400', [r.s, r.j.error], [400, 'variante_inconnue']);
    r = await appel('/api/monitor/espaces/metier', { nom: 'chauf-banc', metier: 'chauffage', variante: 'froid' }, PATRON);
    egal('⛔ la Tour : variante hors liste → 400', r.s, 400);
    r = await appel('/api/monitor/espaces/metier', { nom: 'plomb-banc', metier: 'plomberie', variante: 'deux' }, PATRON);
    egal('⛔ la Tour : variante sur un autre métier → 400, rien de posé', [r.s, (await appel('/api/espaces/etat', { t: 't-plomb-banc' })).j.metier], [400, '']);
    r = await appel('/api/monitor/espaces/metier', { nom: 'plomb-banc', metier: 'plomberie' }, PATRON);
    const ep = (await appel('/api/espaces/etat', { t: 't-plomb-banc' })).j;
    egal('plomberie sans variante : metier plomberie, variante null', [r.s, ep.metier, ep.variante], [200, 'plomberie', null]);
    // la page de paiement : le choix y est validé avant Stripe
    r = await appel('/api/stripe/checkout', { metier: 'chauffage', variante: 'froid', cats: CATS });
    if (r.s === 501) console.log('  … la page de paiement n\'est pas jouable ici (Stripe non configuré : 501) — elle est gardée par test-727 / test-840'); else vrai('la page de paiement refuse une variante inconnue (' + r.s + ' ' + (r.j.error || '') + ')', r.s >= 400 && r.s < 500, r);
    vrai('aucune exception dans le journal du serveur', !/TypeError|ReferenceError|Unhandled|UnhandledPromiseRejection/.test(journal), journal.slice(-400));
  } finally { try { enfant.kill('SIGKILL'); } catch (e) { /* idem */ } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) { /* idem */ } }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
})().catch(e => { console.error('MORT', e); process.exit(2); });
