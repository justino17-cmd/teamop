/* ⛔ CE QUE CE FICHIER GARDE — CE QUE LA RELECTURE DE LA POUSSÉE A REJOUÉ SUR LE VRAI SERVEUR (30 septembre 2026).

   Avant de mettre en ligne « plus de Gratuit » et « une entreprise, une facturation », une relecture adverse a rejoué le
   serveur neuf contre celui de `main` sur des annuaires d'AVANT. Elle a trouvé des entreprises qui payent (ou qui doivent)
   et que le serveur neuf traitait à l'envers. Chaque cas est joué ici, par la vraie route `/api/espaces/etat` (celle que lit
   l'application), sur un Stripe simulé dans le processus du serveur :
     A · registre des codes illisible + un code sur la fiche + un IMPAYÉ Stripe : suspendue comme tout impayé — pas
         « Business Premium payé, dans le doute » (la page de paiement lui aurait vendu un second abonnement) ;
     B · un réglage NÉGATIF périmé (« annulé ») resté sur un ANCIEN nom ne suspend pas l'entreprise qui paie sous le nom
         récent ; un réglage posé par la Tour d'aujourd'hui, lui, suit l'entreprise (écrit sur tous ses noms) ;
     C · l'abonnement Stripe d'une entreprise renommée se trouve par ses ANCIENS noms : gravé à l'ancien nom d'accès, ou
         trouvé par l'adresse de l'ancien nom — ⛔ sauf une ancienne adresse qu'une AUTRE entreprise porte aujourd'hui :
         elle ne prête ni l'abonnement de la voisine, ni ses places, ni son impayé, et ne masque pas le nôtre ;
     B bis · écarter le réglage périmé garde « depuis quand elle paie » : l'« actif » reposé par la Tour ne retire pas
         ses places à une abonnée d'avant ;
     D · « repartir à neuf » en pleine période offerte, par les VRAIES routes de la Tour : la période suit l'entreprise
         que la Tour recrée (reprise sous son nouvel identifiant, donc aussi par le rappel J-7) — jamais une voisine
         d'adresse qui existait déjà, jamais l'héritière d'une suppression totale, et une seule fois ;
     E · une fiche SANS formule payée par un tarif qu'on ne sait pas lire garde Business Premium (Pro est réservé aux
         fiches « Gratuit ») ;
     F · le journal du métier ne porte pas le nom d'accès ;  G · le métier est celui de l'entreprise, sur tous ses noms.
   Rien ne sort d'ici : 127.0.0.1, un Stripe simulé, des entreprises et des adresses fictives. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b849-'));
/* un facteur SMTP de banc : « repartir à neuf » et la suppression exigent un courriel prêt, le rappel J-7 en envoie un.
   Il retire le point doublé (RFC 5321 § 4.5.2) et range chaque courriel ENTIER. */
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
  return { recus, s, pour: adr => recus.filter(m => m.split('\n').some(l => /^To:/i.test(l) && l.toLowerCase().includes(adr.toLowerCase()))) };
}
const enfants = [];
const facteurs = [];
const fin = () => { for (const e of enfants) { try { e.kill('SIGKILL'); } catch (x) {} } for (const f of facteurs) { try { f.s.close(); } catch (x) {} } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 150000).unref();

console.log('\n── 849 · la relecture de la poussée, rejouée sur le vrai serveur ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }
  const SRC = fs.readFileSync(SERVEUR, 'utf8');
  const prix = k => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)'", 'm').exec(SRC) || [])[1];
  const P = { pro: prix('pro'), premium: prix('premium'), inconnu: 'price_ancien_lien_banc_849' };
  vrai('(population) les tarifs Pro et Business Premium du serveur sont lus', /^price_/.test(P.pro || '') && /^price_/.test(P.premium || ''));
  const MAINT = Date.now();
  const jour = n => new Date(MAINT + n * 86400000).toISOString().slice(0, 10);
  const cree = Math.floor(MAINT / 1000) - 3600;
  const mail = x => x + '@exemple-849.fr';
  /* l'empreinte que la mémoire des codes range (`promoEmpreinteMail`) — lue dans le serveur, pas recopiée à la main */
  const sel = (/update\('([^']+)' \+ m\)\.digest\('hex'\)\.slice\(0, 24\)/.exec(SRC) || [])[1];
  vrai('(population) le sel de l\'empreinte des codes se lit dans le serveur', !!sel);
  const em = m => crypto.createHash('sha256').update(sel + m).digest('hex').slice(0, 24);
  const abo = (id, status, f, q, espace, email) => ({ id, object: 'subscription', status, created: cree,
    metadata: espace ? { espace } : {}, customer: { id: 'cus_' + id, email }, current_period_end: Math.floor(MAINT / 1000) + 20 * 86400,
    items: { data: [{ id: 'si_' + id, quantity: q, price: { id: P[f], product: { name: 'OP GESTION' } } }] } });

  /* un vrai serveur, isolé : son annuaire, ses codes, son Stripe simulé (relu à chaque appel) */
  let n = 0;
  async function demarrer(espaces, usages, subs, factures, plus) {
    plus = plus || {};
    const R = plus.dossier || path.join(banc, 's' + (++n)), D = path.join(R, 'data');
    const ETAT = path.join(R, 'stripe.json');
    if (!plus.dossier) {   // (un redémarrage reprend les données laissées par le serveur d'avant, telles quelles)
      fs.mkdirSync(D, { recursive: true });
      fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
      fs.writeFileSync(path.join(D, 'promos-usages.json'), typeof usages === 'string' ? usages : JSON.stringify(usages));
      fs.writeFileSync(ETAT, JSON.stringify(subs === null ? { muet: true, subs: [], factures: {} } : { subs, factures: factures || {} }));
    }
    const PRE = path.join(R, 'stripe-simule.js');
    fs.writeFileSync(PRE, `const vrai = globalThis.fetch; const fs = require('fs');
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  const E = JSON.parse(fs.readFileSync(${JSON.stringify(ETAT)}, 'utf8'));
  const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
  if (E.muet) return json({ error: { message: 'panne du banc' } }, 500);
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return json({ id: 'cs_banc_849', url: 'https://checkout.stripe.com/c/pay/banc-849' });
  const r1 = /^https:\\/\\/api\\.stripe\\.com\\/v1\\/subscriptions\\/([^?]+)/.exec(u);
  if (r1) { const sb = E.subs.find(x => x.id === decodeURIComponent(r1[1])); const f = E.factures[decodeURIComponent(r1[1])] || {};
    return sb ? json(Object.assign({}, sb, { latest_invoice: f.latest_invoice || null })) : json({ error: { message: 'inconnu' } }, 404); }
  if (u.startsWith('https://api.stripe.com/v1/invoices')) return json({ data: [], has_more: false });
  if (u.startsWith('https://api.stripe.com/v1/subscriptions')) return json({ data: E.subs, has_more: false });
  return json({ data: [], has_more: false });
};\n`);
    const vap = webpush.generateVAPIDKeys();
    if (!plus.dossier) fs.writeFileSync(path.join(R, 'config.json'), JSON.stringify(Object.assign({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
      adminPassHash: sha('mot-de-passe-849'), stripe: { secretKey: 'sk_de_banc_849' },
      promos: [{ code: 'VIEUX-BANC-849', formule: 'premium', mois: 3 }] },
      plus.smtp ? { smtp: { host: '127.0.0.1', port: plus.smtp, secure: false, user: 'banc', pass: 'banc', from: 'banc@exemple-849.fr' } } : {})));
    const PORT = 9800 + ((process.pid + (++n) * 7) % 90);
    let journal = '';
    const e = spawn(process.execPath, ['--require', PRE, SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(R, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(R, 'absente.json'), TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z', TEAMOP_STRIPE_CACHE_MS: '600000' }, plus.env || {}),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfants.push(e);
    e.stdout.on('data', d => { journal += d; }); e.stderr.on('data', d => { journal += d; });
    const B = 'http://127.0.0.1:' + PORT;
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (x) {} if (!vivant) await dormir(100); }
    if (!vivant) console.log(journal.slice(0, 1500));
    const appel = async (route, corps, jeton) => { const r = await fetch(B + route, { method: corps === undefined ? 'GET' : 'POST',
        headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
      let j = null; try { j = await r.json(); } catch (x) {} return { s: r.status, j: j || {} }; };
    const arreter = () => new Promise(r => { if (e.exitCode !== null || e.signalCode) return r(); e.once('exit', () => r()); e.kill('SIGTERM'); });
    return { vivant, appel, R, D, arreter, journal: () => journal, etat: async t => (await appel('/api/espaces/etat', { t })).j,
      patron: async () => (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-849' })).j.token };
  }
  /* la forme que l'application grise sans rien écrire (suspension au sursis écoulé, sans formule) */
  const SUSP = j => j.ok === true && j.paye === false && j.suspendu === true && j.sursisJours === 0 && !('formule' in j);
  const SERVIE = j => [j.paye === true, j.formule || null, !!j.suspendu];

  /* ══ 1. REGISTRE DES CODES LISIBLE — B, C, D, E, F, G ═════════════════════════════════════════════════ */
  const E1 = {
    /* B : l'ancien nom garde un « annulé » d'avant ; le récent (celui que lit l'application) paie Stripe */
    b1old: { t: 't-b1-849', nom: 'b1old', email: mail('b1'), ts: MAINT - 9000, formule: 'pro', quantite: 1, aboStatut: 'annule', aboPar: 'Banc' },
    b1new: { t: 't-b1-849', nom: 'b1new', email: mail('b1'), ts: MAINT - 1000, formule: 'pro', quantite: 1 },
    /* B (témoins) : « impayé » réglé par la Tour d'aujourd'hui sur l'ancien nom ; « annulé » sur un nom unique */
    b2old: { t: 't-b2-849', nom: 'b2old', email: mail('b2'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },
    b2new: { t: 't-b2-849', nom: 'b2new', email: mail('b2'), ts: MAINT - 1000, formule: 'pro', quantite: 1 },
    b3: { t: 't-b3-849', nom: 'b3', email: mail('b3'), ts: MAINT - 1000, formule: 'pro', quantite: 1, aboStatut: 'annule', aboPar: 'Banc' },
    /* C : la formule sur l'ancien nom, rien sur le récent ; l'abonnement d'avant trouvé par l'adresse de l'ANCIEN nom */
    c1old: { t: 't-c1-849', nom: 'c1old', email: mail('c1-ancienne'), ts: MAINT - 9000, formule: 'premium', quantite: 1 },
    c1new: { t: 't-c1-849', nom: 'c1new', email: '', ts: MAINT - 1000 },
    /* C : l'abonnement gravé à l'ANCIEN nom d'accès (d'anciennes pages de paiement), payé d'une autre adresse */
    c2old: { t: 't-c2-849', nom: 'c2old', email: mail('c2a'), ts: MAINT - 9000, formule: 'premium', quantite: 1 },
    c2new: { t: 't-c2-849', nom: 'c2new', email: mail('c2b'), ts: MAINT - 1000 },
    /* C (témoin) : une entreprise sans rien, à une autre adresse — suspendue */
    c5: { t: 't-c5-849', nom: 'c5', email: mail('c5'), ts: MAINT - 1000 },
    /* C (relecture des correctifs) : l'ANCIENNE adresse d'un nom (a…) est aujourd'hui celle d'une AUTRE entreprise (…y) */
    p1old: { t: 't-p1-849', nom: 'p1old', email: mail('p1a'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },
    p1new: { t: 't-p1-849', nom: 'p1new', email: mail('p1b'), ts: MAINT - 1000, formule: 'pro', quantite: 1 },
    p1y: { t: 't-p1y-849', nom: 'p1y', email: mail('p1a'), ts: MAINT - 5000, formule: 'pro', quantite: 1 },
    p3old: { t: 't-p3-849', nom: 'p3old', email: mail('p3a'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },
    p3new: { t: 't-p3-849', nom: 'p3new', email: mail('p3b'), ts: MAINT - 1000, formule: 'pro', quantite: 1 },
    p3y: { t: 't-p3y-849', nom: 'p3y', email: mail('p3a'), ts: MAINT - 5000 },
    p4old: { t: 't-p4-849', nom: 'p4old', email: mail('p4a'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },
    p4new: { t: 't-p4-849', nom: 'p4new', email: mail('p4b'), ts: MAINT - 1000, formule: 'pro', quantite: 1 },
    p4y: { t: 't-p4y-849', nom: 'p4y', email: mail('p4a'), ts: MAINT - 5000 },
    /* (une formule posée : sans elle, une fiche nue n'est bloquée que par un impayé SÛREMENT le sien — le cas ne mordrait pas) */
    p5old: { t: 't-p5-849', nom: 'p5old', email: mail('p5a'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },
    p5new: { t: 't-p5-849', nom: 'p5new', email: mail('p5b'), ts: MAINT - 1000, formule: 'pro', quantite: 1 },
    p5y: { t: 't-p5y-849', nom: 'p5y', email: mail('p5a'), ts: MAINT - 5000 },
    /* B bis : l'ancien nom garde un « impayé » d'avant ET sa date d'abonnée d'avant ; le récent est nu (ancienne route) */
    pla: { t: 't-pl-849', nom: 'pla', email: mail('pl'), ts: MAINT - 9000, formule: 'premium', quantite: 1, formuleTs: Date.parse('2025-03-01'),
      aboStatut: 'impaye', aboPar: 'Ancien', aboTs: Date.parse('2025-06-01'), aboDepuis: Date.parse('2025-01-01') },
    plb: { t: 't-pl-849', nom: 'plb', email: mail('pl'), ts: MAINT - 1000 },
    /* B bis : le même, sans date d'abonnée (données d'avant le repère) : un impayé disait « elle payait » depuis son réglage */
    pma: { t: 't-pm-849', nom: 'pma', email: mail('pm'), ts: MAINT - 9000, formule: 'premium', quantite: 1, formuleTs: Date.parse('2025-03-01'),
      aboStatut: 'impaye', aboPar: 'Ancien', aboTs: Date.parse('2025-06-01') },
    pmb: { t: 't-pm-849', nom: 'pmb', email: mail('pm'), ts: MAINT - 1000 },
    /* E : sans formule (et « Gratuit », témoin), payée par un tarif qu'on ne sait pas lire */
    e1: { t: 't-e1-849', nom: 'e1', email: mail('e1'), ts: MAINT - 1000 },
    e2: { t: 't-e2-849', nom: 'e2', email: mail('e2'), ts: MAINT - 1000, formule: 'gratuit', quantite: 1 },
    /* G : deux noms, formule payée par la Tour (réglée à la main) */
    g1old: { t: 't-g1-849', nom: 'g1old', email: mail('g1'), ts: MAINT - 9000, formule: 'pro', quantite: 1, aboStatut: 'actif', aboPar: 'Banc' },
    g1new: { t: 't-g1-849', nom: 'g1new', email: mail('g1'), ts: MAINT - 1000, formule: 'pro', quantite: 1, aboStatut: 'actif', aboPar: 'Banc' } };
  const U1 = { 'VIEUX-BANC-849': { n: 0, equipes: {} } };
  const S1 = [
    abo('sub_b1', 'active', 'pro', 1, 't-b1-849', mail('b1')),
    abo('sub_b2', 'active', 'pro', 1, 't-b2-849', mail('b2')),
    abo('sub_b3', 'active', 'pro', 1, 't-b3-849', mail('b3')),
    abo('sub_c1', 'active', 'premium', 1, '', mail('c1-ancienne')),
    abo('sub_c2', 'active', 'premium', 1, 'c2old', mail('comptable-c2')),
    abo('sub_e1', 'active', 'inconnu', 3, '', mail('e1')),
    abo('sub_e2', 'active', 'inconnu', 3, '', mail('e2')),
    abo('sub_p1y', 'active', 'pro', 1, '', mail('p1a')),                        // l'abonnement de la VOISINE, à l'ancienne adresse
    abo('sub_p3a', 'active', 'pro', 1, 't-p3-849', mail('p3b')),                // ses deux abonnements : l'un gravé…
    abo('sub_p3b', 'active', 'pro', 1, '', mail('p3b')),                        // … l'autre trouvé par son adresse ACTUELLE
    abo('sub_p4', 'past_due', 'pro', 1, 'p4old', mail('p4b')),                  // SON impayé, gravé à son ancien nom d'accès
    abo('sub_p5y', 'past_due', 'pro', 1, '', mail('p5a')) ];                    // l'impayé de la VOISINE, à l'ancienne adresse
  const s1 = await demarrer(E1, U1, S1, { sub_p4: { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: 'https://invoice.stripe.com/i/banc-849-p4' } } });
  vrai('le vrai serveur démarre, isolé (registre des codes lisible)', s1.vivant);
  if (!s1.vivant) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  vrai('(population) /health : le registre des codes est lisible', ((await s1.appel('/health')).j.registres || {}).promos === true);

  console.log('\n  B · un réglage négatif d\'avant, resté sur un ancien nom');
  v('⛔⛔ « annulé » d\'avant sur l\'ANCIEN nom, Stripe payé : l\'entreprise reste servie (Pro)', SERVIE(await s1.etat('t-b1-849')), [true, 'pro', false]);
  v('   … un « annulé » sur un nom UNIQUE décide toujours (réglé à la main, avant Stripe)', SUSP(await s1.etat('t-b3-849')), true);
  const PATRON = await s1.patron();
  vrai('(population) la Tour se connecte', !!PATRON);
  const rB = await s1.appel('/api/monitor/espaces/abonnement', { nom: 'b2old', formule: 'pro', quantite: 1, statut: 'impaye', fin: '' }, PATRON);
  const eB = await s1.etat('t-b2-849');
  v('⛔⛔ « impayé » réglé AUJOURD\'HUI par la Tour sur l\'ancien nom : il suit l\'entreprise (suspendue, sans formule)', [rB.s, SUSP(eB)], [200, true]);
  const regB = JSON.parse(fs.readFileSync(path.join(s1.D, 'espaces.json'), 'utf8'));
  v('   … écrit sur ses DEUX noms (c\'est ce qui le distingue d\'un réglage d\'avant)', [regB.b2old.aboStatut, regB.b2new.aboStatut], ['impaye', 'impaye']);

  console.log('\n  C · l\'abonnement d\'une entreprise renommée');
  v('⛔⛔ trouvé par l\'adresse de l\'ANCIEN nom : servie en Business Premium', SERVIE(await s1.etat('t-c1-849')), [true, 'premium', false]);
  v('⛔⛔ gravé à l\'ANCIEN nom d\'accès, payé d\'une autre adresse : servie en Business Premium', SERVIE(await s1.etat('t-c2-849')), [true, 'premium', false]);
  v('   … une entreprise sans rien, à une autre adresse : suspendue', SUSP(await s1.etat('t-c5-849')), true);
  /* ⛔ … mais une ancienne adresse qu'une AUTRE entreprise porte aujourd'hui ne désigne plus la nôtre (relecture des correctifs) */
  v('⛔⛔ l\'abonnement de la VOISINE, à notre ancienne adresse, ne nous rend pas « payée » : suspendue', SUSP(await s1.etat('t-p1-849')), true);
  v('   … la voisine, elle, est servie par son abonnement', SERVIE(await s1.etat('t-p1y-849')), [true, 'pro', false]);
  const eP3 = await s1.etat('t-p3-849');
  v('⛔ … et ne nous retire pas de places : nos deux abonnements comptent (le gravé et celui de notre adresse actuelle)', [eP3.paye, eP3.places], [true, 2]);
  const L1 = ((await s1.appel('/api/monitor/espaces/liste', undefined, PATRON)).j.espaces || []);
  const ligneDe = nom => L1.find(x => x.slug === nom || x.nom === nom) || {};
  vrai('(population) la liste de la Tour porte les lignes des cas rejoués', !!ligneDe('p4new').nom && !!ligneDe('p5new').nom);
  v('⛔⛔ NOTRE impayé, gravé à notre ancien nom d\'accès, se voit (sinon la page de paiement vendait un second abonnement)', [ligneDe('p4new').impaye, ligneDe('p4new').impayeStripe], [true, true]);
  v('⛔ … et l\'impayé de la VOISINE, à notre ancienne adresse, ne nous est pas attribué', ligneDe('p5new').impaye, false);

  console.log('\n  B bis · écarter un réglage périmé garde « depuis quand elle paie »');
  const rPl = await s1.appel('/api/monitor/espaces/abonnement', { nom: 'plb', formule: 'premium', quantite: 1, statut: 'actif', fin: '' }, PATRON);
  const ePl = await s1.etat('t-pl-849');
  v('⛔⛔ « actif » reposé par la Tour sur le nom récent : l\'abonnée d\'avant garde ses 3 places (Business Premium)', [rPl.s, ePl.paye, ePl.formule, ePl.places], [200, true, 'premium', 3]);
  const regPl = JSON.parse(fs.readFileSync(path.join(s1.D, 'espaces.json'), 'utf8'));
  v('   … « depuis quand elle paie » reste celle d\'avant, sur ses deux noms', [regPl.pla.aboDepuis, regPl.plb.aboDepuis], [Date.parse('2025-01-01'), Date.parse('2025-01-01')]);
  const rPm = await s1.appel('/api/monitor/espaces/abonnement', { nom: 'pmb', formule: 'premium', quantite: 1, statut: 'actif', fin: '' }, PATRON);
  const ePm = await s1.etat('t-pm-849');
  const regPm = JSON.parse(fs.readFileSync(path.join(s1.D, 'espaces.json'), 'utf8'));
  v('⛔ … et sans date d\'avant le repère : l\'impayé périmé disait « elle payait depuis son réglage » — 3 places, datées de lui',
    [rPm.s, ePm.places, regPm.pma.aboDepuis, regPm.pmb.aboDepuis], [200, 3, Date.parse('2025-06-01'), Date.parse('2025-06-01')]);

  console.log('\n  D · « repartir à neuf » pendant une période offerte — les vraies routes de la Tour');
  const fct = facteur(); facteurs.push(fct);
  const portSmtp = await new Promise(r => fct.s.listen(0, '127.0.0.1', () => r(fct.s.address().port)));
  /* le code d'espace que la Tour porte (identifiant et clé) : une entreprise connue qu'on relie de nouveau doit présenter SA clé */
  const codeEspace = t => Buffer.from(JSON.stringify({ t, k: 'cle-banc-' + t })).toString('base64');
  const lireUsages = s => JSON.parse(fs.readFileSync(path.join(s.D, 'promos-usages.json'), 'utf8'))['VIEUX-BANC-849'];
  const ED = {
    x: { t: 't-x-849', nom: 'x', code: codeEspace('t-x-849'), email: mail('dup'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },    // en période offerte
    y: { t: 't-y-849', nom: 'y', code: codeEspace('t-y-849'), email: mail('dup'), ts: MAINT - 5000 },                                 // voisine d'adresse, DÉJÀ là
    k: { t: 't-k-849', nom: 'k', code: codeEspace('t-k-849'), email: mail('dupk'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },   // en période, supprimée TOTALEMENT
    l: { t: 't-l-849', nom: 'l', code: codeEspace('t-l-849'), email: mail('dupk'), ts: MAINT - 5000 },                               // … sa voisine d'adresse
    m1: { t: 't-m-849', nom: 'm1', code: codeEspace('t-m-849'), email: mail('dupm'), ts: MAINT - 9000, formule: 'pro', quantite: 1 },  // une entreprise à DEUX noms,
    m2: { t: 't-m-849', nom: 'm2', code: codeEspace('t-m-849'), email: mail('dupm'), ts: MAINT - 8000, formule: 'pro', quantite: 1 } };// en période
  const UD = { 'VIEUX-BANC-849': { n: 2, equipes: {
    't-x-849': { date: jour(-10), finLe: jour(30), em: em(mail('dup')) },
    't-k-849': { date: jour(-10), finLe: jour(30), em: em(mail('dupk')) },
    't-m-849': { date: jour(-10), finLe: jour(30), em: em(mail('dupm')) } } } };
  const sD = await demarrer(ED, UD, [], {}, { smtp: portSmtp });
  vrai('le vrai serveur démarre, isolé (courriel de banc : les gestes de suppression en exigent un)', sD.vivant);
  const PD = await sD.patron();
  v('(population) avant le geste : x est servie par sa période, y est suspendue', [SERVIE(await sD.etat('t-x-849')), SUSP(await sD.etat('t-y-849'))], [[true, 'premium', false], true]);
  const rR = await sD.appel('/api/monitor/espaces/renaitre', { nom: 'x', confirme: true }, PD);
  const uR = lireUsages(sD).equipes['t-x-849'] || {};
  v('« Repartir à neuf » de x : fait, et la période garde la marque du GESTE (les voisines d\'adresse déjà vivantes y sont nommées)',
    [rR.s, !!uR.renait, (uR.renait || {}).voisins], [200, true, ['t-y-849']]);
  v('⛔⛔ la voisine d\'adresse qui existait déjà n\'en profite pas : suspendue', SUSP(await sD.etat('t-y-849')), true);
  /* (AVANT que la Tour recrée x : sinon c'est « une seule fois » qui protège la voisine, et la règle des voisines n'est jamais jouée) */
  const rY = await sD.appel('/api/monitor/espaces', { nom: 'y', code: codeEspace('t-y-849'), email: mail('dup'), origine: 'tour' }, PD);
  v('⛔⛔ « Revoir le lien » de la voisine y, AVANT que x soit recréée, ne la lui donne pas : suspendue, aucune période sous son identifiant',
    [rY.s, SUSP(await sD.etat('t-y-849')), !!lireUsages(sD).equipes['t-y-849']], [200, true, false]);
  const rX2 = await sD.appel('/api/monitor/espaces', { nom: 'x2', code: codeEspace('t-x2-849'), email: mail('dup'), origine: 'tour' }, PD);
  const eX2 = await sD.etat('t-x2-849');
  v('⛔⛔ la Tour recrée l\'entreprise (route « lien ») : sa période la suit — Business Premium, payée', [rX2.s, ...SERVIE(eX2)], [200, true, 'premium', false]);
  vrai('   … le motif public dit le code et sa fin (ce que l\'application lit)', /VIEUX-BANC-849/.test(eX2.motif || '') && (eX2.motif || '').includes(jour(30)));
  const uX2 = lireUsages(sD);
  v('   … reprise sous son NOUVEL identifiant (le rappel J-7 la lit donc), même échéance, rien de recompté, et marquée « reprise »',
    [(uX2.equipes['t-x2-849'] || {}).finLe, (uX2.equipes['t-x2-849'] || {}).reporte, uX2.n, ((uX2.equipes['t-x-849'] || {}).renait || {}).repris], [jour(30), true, 2, 't-x2-849']);
  const rW = await sD.appel('/api/monitor/espaces', { nom: 'w', code: codeEspace('t-w-849'), email: mail('dup'), origine: 'tour' }, PD);
  v('⛔ une troisième entreprise créée ensuite à la même adresse ne la reprend pas (une seule fois) : suspendue', [rW.s, SUSP(await sD.etat('t-w-849'))], [200, true]);
  const rK = await sD.appel('/api/monitor/entreprise/supprimer', { t: 't-k-849', confirme: true }, PD);
  v('⛔⛔ suppression TOTALE de k : sa période n\'est pas prêtée à sa voisine d\'adresse l (suspendue)', [rK.s, SUSP(await sD.etat('t-l-849'))], [200, true]);
  const rM1 = await sD.appel('/api/monitor/espaces/renaitre', { nom: 'm1', confirme: true }, PD);
  const rM3 = await sD.appel('/api/monitor/espaces', { nom: 'm3', code: codeEspace('t-m3-849'), email: mail('dupm'), origine: 'tour' }, PD);
  v('⛔ un seul nom d\'une entreprise à deux noms repart à neuf : l\'entreprise VIT encore (son autre nom) — elle garde sa période, la nouvelle ne la prend pas',
    [rM1.s, rM3.s, SERVIE(await sD.etat('t-m-849')), SUSP(await sD.etat('t-m3-849'))], [200, 200, [true, 'premium', false], true]);

  /* le rappel J-7 de l'entreprise recréée — le passage des rappels se fait au démarrage : on redémarre le serveur sur les
     MÊMES données, rappels presque immédiats, et on attend le COURRIEL (pas le chronomètre) */
  const EJ = { r: { t: 't-r-849', nom: 'r', code: codeEspace('t-r-849'), email: mail('renait-j7'), ts: MAINT - 9000, formule: 'pro', quantite: 1 } };
  const UJ = { 'VIEUX-BANC-849': { n: 1, equipes: { 't-r-849': { date: jour(-85), finLe: jour(5), em: em(mail('renait-j7')) } } } };
  const sJ = await demarrer(EJ, UJ, [], {}, { smtp: portSmtp });
  const PJ = await sJ.patron();
  const rJ1 = await sJ.appel('/api/monitor/espaces/renaitre', { nom: 'r', confirme: true }, PJ);
  const rJ2 = await sJ.appel('/api/monitor/espaces', { nom: 'r2', code: codeEspace('t-r2-849'), email: mail('renait-j7'), origine: 'tour' }, PJ);
  v('(population) r, en période (fin dans 5 jours), repart à neuf puis la Tour la recrée', [rJ1.s, rJ2.s, SERVIE(await sJ.etat('t-r2-849'))], [200, 200, [true, 'premium', false]]);
  await sJ.arreter();
  const avantJ = fct.pour(mail('renait-j7')).length;
  const sJ2 = await demarrer(null, null, null, null, { dossier: sJ.R, smtp: portSmtp, env: { TEAMOP_RAPPELS_DELAI_MS: '1000' } });
  vrai('(population) le serveur redémarre sur les mêmes données', sJ2.vivant);
  let rappel = '';
  for (let i = 0; i < 200 && !rappel; i++) { rappel = sJ2.journal().split('\n').find(l => /rappel échéance envoyé/.test(l)) || ''; if (!rappel) await dormir(100); }
  const recusJ = fct.pour(mail('renait-j7')).slice(avantJ);
  v('⛔⛔ le rappel J-7 part vers l\'entreprise recréée (sinon elle était servie puis suspendue sans un mot)', [!!rappel, recusJ.length >= 1], [true, true]);

  console.log('\n  E · un tarif qu\'on ne sait pas lire');
  v('⛔ fiche SANS formule, abonnement d\'OP GESTION illisible : Business Premium (elle avait tout l\'accès)', SERVIE(await s1.etat('t-e1-849')), [true, 'premium', false]);
  v('   … fiche « Gratuit », même abonnement : Pro (la formule d\'entrée, un gain pour elle)', SERVIE(await s1.etat('t-e2-849')), [true, 'pro', false]);

  console.log('\n  F · G · le métier');
  const rG = await s1.appel('/api/monitor/espaces/metier', { nom: 'g1old', metier: 'nettoyage' }, PATRON);
  const eG = await s1.etat('t-g1-849');
  v('⛔ le métier posé sur l\'ANCIEN nom atteint l\'application (qui lit le nom récent)', [rG.s, eG.metier], [200, 'nettoyage']);
  const regG = JSON.parse(fs.readFileSync(path.join(s1.D, 'espaces.json'), 'utf8'));
  v('   … écrit sur ses deux noms', [regG.g1old.metier, regG.g1new.metier], ['nettoyage', 'nettoyage']);
  await dormir(100);
  const ligne = s1.journal().split('\n').find(l => /règle le métier/.test(l)) || '';
  vrai('(population) le journal porte la ligne du métier', !!ligne);
  vrai('⛔ … sans le nom d\'accès (souvent celui d\'une personne), avec l\'identifiant de l\'entreprise', !/g1old/.test(ligne) && /t-g1-849/.test(ligne));

  /* ══ 2. REGISTRE DES CODES ILLISIBLE — A ═══════════════════════════════════════════════════════════════ */
  console.log('\n  A · registre des codes illisible, un code sur la fiche');
  const E2 = {
    a1: { t: 't-a1-849', nom: 'a1', email: mail('a1'), ts: MAINT - 1000, formule: 'pro', quantite: 1, codePromo: 'VIEUX-BANC-849' },
    a2: { t: 't-a2-849', nom: 'a2', email: mail('a2'), ts: MAINT - 1000, formule: 'pro', quantite: 1, codePromo: 'VIEUX-BANC-849' } };
  const S2 = [abo('sub_a1', 'past_due', 'pro', 1, 't-a1-849', mail('a1'))];
  const s2 = await demarrer(E2, '{"VIEUX-BANC-849": {"n": 1, "equipes": {', S2,
    { sub_a1: { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: 'https://invoice.stripe.com/i/banc-849-a1' } } });
  vrai('le vrai serveur démarre, isolé (registre des codes TRONQUÉ)', s2.vivant);
  vrai('(population) /health : le registre des codes est illisible', ((await s2.appel('/health')).j.registres || {}).promos === false);
  v('⛔⛔ un IMPAYÉ Stripe n\'est pas couvert par le doute du registre : suspendue, sans formule', SUSP(await s2.etat('t-a1-849')), true);
  const PATRON2 = await s2.patron();
  const L2 = ((await s2.appel('/api/monitor/espaces/liste', undefined, PATRON2)).j.espaces || []);
  const la1 = L2.find(x => x.slug === 'a1' || x.nom === 'a1') || {};
  vrai('   … et la Tour le voit comme un impayé', la1.impaye === true);
  v('   … sans impayé, le doute sert toujours la formule du code (on ne coupe pas une période qu\'on ne peut plus lire)',
    SERVIE(await s2.etat('t-a2-849')), [true, 'premium', false]);

  /* ══ 3. STRIPE MUET — la Tour ne dit pas « payé » quand le serveur ne SAIT pas ═══════════════════════════ */
  console.log('\n  H · Stripe muet : la Tour dit « non vérifiable », pas « payé »');
  const s3 = await demarrer({ z1: { t: 't-z1-849', nom: 'z1', email: mail('z1'), ts: MAINT - 1000, formule: 'pro', quantite: 1 },
    z2: { t: 't-z2-849', nom: 'z2', email: mail('z2'), ts: MAINT - 1000, formule: 'pro', quantite: 1, aboStatut: 'actif', aboPar: 'Banc' } }, {}, null);
  vrai('le vrai serveur démarre, isolé (Stripe muet)', s3.vivant);
  vrai('(population) l\'application reçoit « vérification impossible » (rien n\'est décidé)', (await s3.etat('t-z1-849')).verificationImpossible === true);
  const P3 = await s3.patron();
  const L3 = ((await s3.appel('/api/monitor/espaces/liste', undefined, P3)).j.espaces || []);
  const z1 = L3.find(x => x.t === 't-z1-849') || {}, z2 = L3.find(x => x.t === 't-z2-849') || {};
  v('⛔ la liste de la Tour : « on ne sait pas » se distingue de « payée » (inconnu), la réglée à la main non', [z1.paye, z1.inconnu, z2.paye, z2.inconnu], [true, true, true, false]);
  const st3 = (await s3.appel('/api/monitor/espaces/statut', { nom: 'z1' }, P3)).j;
  v('   … et la fiche (statut) aussi', [st3.paye, st3.inconnu], [true, true]);
  const TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('⛔ la Tour ne range pas une entreprise « non vérifiable » parmi les réglées', /attribPayees=\(ESP\.list\|\|\[\]\)\.filter\(function\(e\)\{ return e\.formule&&e\.paye&&!e\.inconnu&&!e\.promoCode; \}\)/.test(TOUR));
  vrai('   … sa ligne dit « non vérifiable » avant « payé »', /\(e\.paye\?\(e\.inconnu\?' · paiement non vérifiable/.test(TOUR));
  vrai('   … et le message de la fiche aussi', /r\.d\.paye\?\(r\.d\.inconnu\?'❔ paiement non vérifiable/.test(TOUR));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); });
