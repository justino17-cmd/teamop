/* ⛔⛔ UN CODE PROMO PEUT ÊTRE RÉSERVÉ À DES MÉTIERS — Justin, 28 octobre 2026 : « on fera un code de réduction en fonction des packs ».
   Exemple : un code réservé aux entreprises de plomberie et de chauffage / climatisation. Il vit dans `config.promos` (sur le VPS, jamais dans le dépôt) :
   `{ code, formule, mois, maxUtilisations, metiers: ['plomberie', 'chauffage'] }`.

   CE QUE CE BANC GARDE, sur le VRAI serveur (isolé, parlé en HTTP), par les QUATRE chemins qui activent un code ET le cinquième qui le lit :
   · l'application (`/api/promo/valider`, preuve de clé), la Tour (`/api/monitor/espaces/promo`, appelée à l'acceptation d'une demande), le relais du portail
     (`/api/clients/sync`, vrai compte vérifié) et le rattrapage d'`espacePaye` (`/api/espaces/etat`, lecture par `/api/monitor/espaces/liste`) ;
   · `/api/portail/promo`, qui n'écrit plus « activé » pour un code réservé ;
   · une entreprise de plomberie, de chauffage / climatisation : ADMISES ; une entreprise de nettoyage, seule : REFUSÉE ; une entreprise dont le métier n'est pas posé :
     REFUSÉE aussi (dans le doute on n'active pas), et le code s'active dès que la Tour pose le métier ;
   · ⛔ LE CORPS NE DÉCIDE JAMAIS DU MÉTIER : `metier`, `metiers`, `metierAdmis` dans la requête n'y changent rien, sur les quatre chemins ;
   · ⚠️ LES MÉTIERS « ASSOCIÉS » N'EXISTENT PAS DANS L'ANNUAIRE (une entreprise a UN `metier`, posé par la Tour sur tous ses noms) : une entreprise de nettoyage « dont un
     métier associé est le chauffage » ne peut pas être décrite aujourd'hui. Ce banc joue l'inverse — un champ d'associés inventé dans l'annuaire ne compte pas —
     et le dit, pour que le jour où le champ existera (`promoMetiersDe`, le seul endroit à étendre) ce contrôle soit remplacé, pas oublié ;
   · un refus ne fait JAMAIS bouger le compteur, n'écrit rien dans le registre, n'envoie aucun courriel « code activé » ;
   · un code déjà ACTIF ne se coupe pas, un code déjà SERVI garde son 410 ; un code SANS restriction (ou `metiers: []`) marche comme avant ;
   · une restriction ILLISIBLE (identifiant inconnu, forme qui n'est pas une liste) FERME le code : rien ne s'active, le démarrage l'écrit au journal ;
   · l'aperçu public ne dit rien d'une entreprise : `reserve`, et `metierAdmis` si la page a déjà son métier — jamais une décision ;
   · `server/configurer-promos.js` : la façon de déclarer la restriction (identifiants validés contre `metiers.json`, fichier jamais à moitié écrit, aucun secret affiché).
   Les codes d'ici sont FICTIFS, sans chiffre (règle du dépôt : un code promo ne s'écrit dans aucun fichier servi). */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const { spawn, spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const PORTAIL = fs.readFileSync(path.join(RACINE, 'server', 'portail.js'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, a) => v(t, !!a, true);
const faux = (t, a) => v(t, !!a, false);

const LIBRE = 'ESSAI-BANC-LIBRE', RES = 'ESSAI-BANC-PLOMBCLIM', PLAFOND = 'ESSAI-BANC-PLAFOND', TYPO = 'ESSAI-BANC-TYPO', FORME = 'ESSAI-BANC-FORME', VIDE = 'ESSAI-BANC-VIDE';
const dans = (mois) => { const d = new Date(); d.setMonth(d.getMonth() + mois); return d.toISOString().slice(0, 10); };
const PASSE = '2026-04-01';

function extraire(src, nom) {
  let d0 = src.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  if (src.slice(d0 - 6, d0) === 'async ') d0 -= 6;
  let p = 0;
  for (let k = src.indexOf('{', d0); k < src.length; k++) { if (src[k] === '{') p++; else if (src[k] === '}') { p--; if (!p) return src.slice(d0, k + 1); } }
  return '';
}
/* les commentaires qui COMMENCENT une ligne, et eux seuls (règle du dépôt : le motif naïf avale du vrai code) */
const sansCommentaires = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CODE_SRV = sansCommentaires(SRV);
const bloc = (src, debut, fin) => { const i = src.indexOf(debut); const j = i < 0 ? -1 : src.indexOf(fin, i + debut.length); return (i < 0 || j < 0) ? '' : src.slice(i, j); };

/* ══ 0. LE TEXTE : CHAQUE LECTEUR D'UN CODE LIT LE VERDICT, AVANT D'ÉCRIRE ═══════════════════════════ */
console.log('\n══ 0. Le texte : les quatre chemins qui activent et celui qui affiche lisent la restriction ══');
{
  const valider = bloc(CODE_SRV, "app.post('/api/promo/valider'", 'function rappelsEcheances(');
  const tour = bloc(CODE_SRV, "app.post('/api/monitor/espaces/promo'", 'app.post(');
  const rattrapage = bloc(CODE_SRV, 'async function espacePaye(e, opts) {', 'const sk = config.stripe');
  const relais = bloc(CODE_SRV, 'const pc = monStr(b.promoCode, 40)', "console.log('code promo du site IGNORÉ");
  const pop = { valider: valider.length, tour: tour.length, rattrapage: rattrapage.length, relais: relais.length };
  vrai('population : les quatre blocs sont trouvés dans le code', Object.values(pop).every(n => n > 400));
  if (!Object.values(pop).every(n => n > 400)) console.log('      ', JSON.stringify(pop));
  const avant = (b, lu, ecrit) => { const i = b.indexOf(lu), j = b.indexOf(ecrit); return i > 0 && j > i; };
  vrai('l\'application : le verdict est lu AVANT « un seul code à la fois » et AVANT `u.n++`', avant(valider, 'promoMetierVerdict(p, team)', 'u.n++') && avant(valider, 'promoMetierVerdict(p, team)', 'promoServiA(c2, team'));
  vrai('   … et seulement sur du NEUF (un code actif ne se coupe pas, un code servi garde son 410)', /if \(pres && pres\.etat === 'neuf'\) \{\s*const vm = promoMetierVerdict\(p, team\);/.test(valider));
  vrai('la Tour : le verdict est lu AVANT `u.n++`, dans la branche du NEUF', avant(tour, 'promoMetierVerdict(p, t)', 'u.n++') && /if \(pres\.etat === 'neuf'\) \{\s*const vm = promoMetierVerdict\(p, t\);/.test(tour));
  vrai('le relais du portail : le verdict est lu AVANT `u.n++`, et conditionne `nouveau`', avant(relais, 'promoMetierVerdict(pDef, tEsp)', 'u.n++') && /const nouveau = !!\(pres && pres\.etat === 'neuf' && !autre && metierPasse/.test(relais));
  vrai('le rattrapage : le verdict est lu AVANT `u0.n++`, et conditionne l\'activation ET « en attente »', avant(rattrapage, 'promoMetierVerdict(p, e.t)', 'u0.n++') && /if \(p && metierPasse && !promosIllisible/.test(rattrapage));
  vrai('le portail (cinquième lecteur) : `promoDef` dit `reserve` et la route n\'écrit rien', /reserve: promoMetiersDef\(p\)\.etat !== 'libre'/.test(CODE_SRV) && /if \(def\.reserve\) return res\.status\(403\)/.test(sansCommentaires(PORTAIL)));
  /* le métier lu est celui de l'ANNUAIRE : aucun des lecteurs ne lit `req.body` pour le métier du verdict */
  const verdict = extraire(SRV, 'promoMetierVerdict') + extraire(SRV, 'promoMetiersDe');
  vrai('le verdict lit l\'annuaire (`espaceParT` → `metierOk`) et JAMAIS le corps de la requête', /espaceParT\(t\)/.test(verdict) && /metierOk\(e\.metier\)/.test(verdict) && !/req\.|body/.test(verdict));
  /* l'activation écrit toujours par `promoEntree` : cette règle n'a pas ajouté de cinquième écriture */
  v('⛔ toujours QUATRE écritures d\'utilisation (`promoEntree`) : la restriction n\'en ouvre pas une cinquième', (CODE_SRV.match(/= promoEntree\(/g) || []).length, 4);
  v('⛔ et quatre lecteurs du verdict dans le code (application, Tour, relais, rattrapage)', (CODE_SRV.match(/promoMetierVerdict\(/g) || []).length - 1, 4);   // -1 : sa définition
}

/* ══ 1. LES VRAIES FONCTIONS DE LA RÈGLE, EXÉCUTÉES ═══════════════════════════════════════════════ */
console.log('\n══ 1. Les vraies fonctions du verdict, exécutées ══');
{
  const i0 = SRV.indexOf('function promoMetiersDef('), i1 = SRV.indexOf('/* Au démarrage : un code dont la restriction est illisible se DIT');
  const morceau = (i0 > 0 && i1 > i0) ? SRV.slice(i0, i1) : '';
  vrai('population : les cinq définitions sont trouvées dans le fichier réel', /function promoMetiersDef/.test(morceau) && /function promoMetiersDe\(/.test(morceau) && /function promoMetierVerdict/.test(morceau) && /function promoMetierRefus/.test(morceau) && /promoMetierPasse/.test(morceau));
  const NOMS = { plomberie: 'Plomberie', chauffage: 'Chauffage / Climatisation', nettoyage: 'Nettoyage / Propreté' };
  const annuaire = { 'ent-p': { metier: 'plomberie' }, 'ent-c': { metier: 'chauffage' }, 'ent-n': { metier: 'nettoyage' }, 'ent-0': {}, 'ent-f': { metier: 'inconnu-ferme' } };
  const metiersMod = { connu: k => Object.prototype.hasOwnProperty.call(NOMS, k), nom: k => NOMS[k] || '' };
  const api = new Function('metiersMod', 'espaceParT', 'metierOk', morceau + '\nreturn { promoMetiersDef, promoMetiersDe, promoMetierVerdict, promoMetierRefus, promoMetierPasse };')(
    metiersMod, t => annuaire[t] || null, m => (NOMS[m] ? m : ''));
  const etat = (metiers, t) => api.promoMetierVerdict(metiers === 'ABSENT' ? { code: 'X' } : { code: 'X', metiers }, t).etat;
  const tableau = [
    ['champ absent → libre', 'ABSENT', 'ent-n', 'libre'], ['liste vide → libre', [], 'ent-n', 'libre'],
    ['plomberie ∈ [plomberie, chauffage] → admis', ['plomberie', 'chauffage'], 'ent-p', 'admis'], ['chauffage ∈ [plomberie, chauffage] → admis', ['plomberie', 'chauffage'], 'ent-c', 'admis'],
    ['nettoyage ∉ [plomberie, chauffage] → refuse', ['plomberie', 'chauffage'], 'ent-n', 'refuse'], ['métier non posé → inconnu', ['plomberie', 'chauffage'], 'ent-0', 'inconnu'],
    ['entreprise hors annuaire → inconnu', ['plomberie'], 'ent-absente', 'inconnu'], ['métier FERMÉ (hors du référentiel ouvert) → inconnu', ['plomberie'], 'ent-f', 'inconnu'],
    ['identifiant inconnu du référentiel → config (fermé)', ['plomberie', 'chauffge'], 'ent-p', 'config'], ['pas une liste (chaîne) → config', 'plomberie', 'ent-p', 'config'],
    ['pas une liste (null) → config', null, 'ent-p', 'config'], ['pas une liste (objet) → config', { plomberie: true }, 'ent-p', 'config'],
    ['un élément qui n\'est pas une chaîne → config', ['plomberie', 7], 'ent-p', 'config'], ['une chaîne vide → config', [''], 'ent-p', 'config'],
  ];
  for (const [t, m, ent, attendu] of tableau) v(t, etat(m, ent), attendu);
  vrai('population : les quatre états du verdict (libre, admis, refuse, inconnu, config) sont tous joués', new Set(tableau.map(x => x[3])).size === 5);
  vrai('seuls `libre` et `admis` passent', ['libre', 'admis'].every(e => api.promoMetierPasse({ etat: e })) && ['refuse', 'inconnu', 'config'].every(e => !api.promoMetierPasse({ etat: e })));
  const r = api.promoMetierRefus('X', api.promoMetierVerdict({ code: 'X', metiers: ['plomberie', 'chauffage'] }, 'ent-n'), true);
  v('un refus de métier : 403, `metierNonAdmis`', [r.status, r.body.metierNonAdmis], [403, true]);
  vrai('   … il NOMME les métiers admis et renvoie au support', /Plomberie et Chauffage \/ Climatisation/.test(r.body.error) && /support@teamop\.fr/.test(r.body.error));
  const ri = api.promoMetierRefus('X', api.promoMetierVerdict({ code: 'X', metiers: ['plomberie'] }, 'ent-0'), true);
  vrai('   … un métier non posé le dit autrement (« pas encore réglé »)', ri.status === 403 && /pas encore réglé/.test(ri.body.error));
  const rc = api.promoMetierRefus('X', api.promoMetierVerdict({ code: 'X', metiers: ['plomberie', 'chauffge'] }, 'ent-p'), true);
  v('une restriction illisible : 503, et RIEN du réglage ne sort', [rc.status, /plomberie|chauffge|metiers/i.test(JSON.stringify(rc.body))], [503, false]);
  /* ⚠️ les associés : le verdict ne lit que `metier` */
  const assoc = new Function('metiersMod', 'espaceParT', 'metierOk', morceau + '\nreturn promoMetierVerdict;')(metiersMod,
    () => ({ metier: 'nettoyage', metiersAssocies: ['chauffage'], associes: ['chauffage'], metiers: ['chauffage'] }), m => (NOMS[m] ? m : ''));
  v('⚠️ AUJOURD\'HUI (aucun champ d\'associés dans l\'annuaire) : un champ inventé ne compte pas — nettoyage reste REFUSÉ', assoc({ code: 'X', metiers: ['plomberie', 'chauffage'] }, 't').etat, 'refuse');
}

/* ══ 2. LE VRAI SERVEUR ═══════════════════════════════════════════════════════════════════════════ */
const BANC = path.join(os.tmpdir(), 'teamop-test-3133-' + process.pid);
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const MDP = 'mot-de-passe-du-banc-3133';
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const enfants = [];
function arreterTout() { for (const e of enfants) { try { if (e.exitCode === null) e.kill('SIGKILL'); } catch (x) {} } }
process.on('exit', () => { arreterTout(); try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {} });

/* Le facteur du banc : garde les messages entiers, point doublé retiré (RFC 5321 §4.5.2). */
const courriers = [];
let _port = null;
async function facteur() {
  if (_port) return _port;
  const s = require('net').createServer(c => {
    c.on('error', () => {}); let t = '', corps = false, msg = ''; c.write('220 banc\r\n');
    c.on('data', d => { t += d; let i;
      while ((i = t.indexOf('\r\n')) >= 0) { const l = t.slice(0, i); t = t.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; courriers.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n'); } });
  });
  await new Promise(r => s.listen(0, '127.0.0.1', r)); s.unref();
  _port = s.address().port; return _port;
}
/* quoted-printable en UTF-8 : chaque `=XX` est un OCTET */
const lisible = m => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
const courrierPour = (adresse, motif) => courriers.map(lisible).filter(m => new RegExp('^To:[^\\n]*' + adresse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'mi').test(m) && (!motif || motif.test(m)));

/* Les entreprises du banc — noms et adresses FICTIFS. `metier` = ce que l'annuaire porte. */
const CLES = {};
const ESP = {};
const ajouterEsp = (slug, metier, extra) => {
  CLES[slug] = 'CLE-' + slug.toUpperCase() + '-3133';
  ESP[slug] = Object.assign({ nom: slug, email: slug + '@banc-3133.fr', t: 'ent-' + slug, code: b64({ t: 'ent-' + slug, k: CLES[slug] }), ts: Object.keys(ESP).length + 1 }, metier ? { metier } : {}, extra || {});
};
/* l'application (preuve de clé) */
ajouterEsp('applomb', 'plomberie'); ajouterEsp('apclim', 'chauffage'); ajouterEsp('apnet', 'nettoyage'); ajouterEsp('apsans', '');
ajouterEsp('apnetlibre', 'nettoyage'); ajouterEsp('apassoc', 'nettoyage', { metiersAssocies: ['chauffage'], associes: ['chauffage'], metiers: ['chauffage'] });
ajouterEsp('apact', 'nettoyage'); ajouterEsp('apservi', 'nettoyage'); ajouterEsp('applombbis', 'plomberie'); ajouterEsp('applombter', 'plomberie'); ajouterEsp('apnetplaf', 'nettoyage');
/* la Tour */
ajouterEsp('trplomb', 'plomberie'); ajouterEsp('trclim', 'chauffage'); ajouterEsp('trnet', 'nettoyage'); ajouterEsp('trsans', ''); ajouterEsp('trgarde', 'nettoyage'); ajouterEsp('trneuf', '');
/* le relais du portail (vrais comptes vérifiés) */
ajouterEsp('rlplomb', 'plomberie'); ajouterEsp('rlnet', 'nettoyage'); ajouterEsp('rlsans', ''); ajouterEsp('rllibre', 'nettoyage');
/* le rattrapage : un code posé sur la fiche, jamais compté */
const attente = { codePromo: RES };
ajouterEsp('rtplomb', 'plomberie', attente); ajouterEsp('rtnet', 'nettoyage', attente); ajouterEsp('rtsans', '', attente);

const USAGES = {
  [RES]: { n: 1, equipes: {
    'ent-apact': { date: '2026-10-01', finLe: dans(1) },        // un code ACTIF chez une entreprise de nettoyage (le métier a changé depuis, ou la Tour l'avait posé à la main)
    'ent-apservi': { date: '2026-01-01', finLe: PASSE } } },    // un code SERVI, terminé
  [TYPO]: { n: 1, equipes: { 'ent-apact': { date: '2026-10-01', finLe: dans(1) } } },
};

function lancerScript(args, cfgPath, entree) {
  return spawnSync(process.execPath, [path.join(RACINE, 'server', 'configurer-promos.js'), ...args], { env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath }), encoding: 'utf8', input: entree || '' });
}

async function monter(nom) {
  const dir = path.join(BANC, nom), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const cfgPath = path.join(dir, 'config.json');
  const portSmtp = await facteur();
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP),
    notifDemandes: 'patron@banc-3133.fr', comptes: { actif: true },
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' },
    firebase: { apiKey: 'cle-de-banc-invalide', projectId: 'projet-de-banc-3133' },
  }), { mode: 0o600 });
  /* ⛔ LES CODES VALABLES SONT FAITS PAR L'OUTIL DU VPS LUI-MÊME (`configurer-promos.js`) : le banc joue ainsi le geste de Justin, et le serveur lit ce que l'outil a écrit */
  for (const a of [[LIBRE, 'pro', '1'], [RES, 'business', '2', 'plomberie,chauffage'], [PLAFOND, 'premium', '3', '1', 'plomberie']]) {
    const r = lancerScript(['ajouter', ...a], cfgPath);
    if (r.status !== 0) throw new Error('configurer-promos ajouter a échoué : ' + r.stderr);
  }
  /* … et les restrictions ILLISIBLES, qu'aucun outil n'écrit : une édition à la main fautive */
  const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  cfg.promos.push({ code: TYPO, formule: 'premium', mois: 1, metiers: ['plomberie', 'chauffge'] });
  cfg.promos.push({ code: FORME, formule: 'pro', mois: 1, metiers: 'plomberie' });
  cfg.promos.push({ code: VIDE, formule: 'pro', mois: 1, metiers: [] });
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2), { mode: 0o600 });
  fs.writeFileSync(path.join(data, 'espaces.json'), JSON.stringify(ESP));
  fs.writeFileSync(path.join(data, 'promos-usages.json'), JSON.stringify(USAGES));
  const port = await new Promise(res => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  /* rien ne sort du banc (comme test-803) */
  const coupe = path.join(dir, 'reseau-coupe.js');
  fs.writeFileSync(coupe, "const local = u => /^https?:\\/\\/(127\\.0\\.0\\.1|localhost)(:|\\/|$)/.test(String((u && (u.url || u.href)) || u));\n"
    + "const vrai = globalThis.fetch;\n"
    + "globalThis.fetch = function (u, o) { if (!local(u)) { console.error('réseau coupé par le banc : ' + String((u && (u.url || u.href)) || u).slice(0, 50)); return Promise.reject(new Error('réseau coupé par le banc')); } return vrai.apply(this, arguments); };\n");
  const enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port), NODE_OPTIONS: ((process.env.NODE_OPTIONS || '') + ' --require ' + coupe).trim() }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfants.push(enfant);
  let journal = ''; enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 200 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  /* ⛔ le serveur plafonne les routes sensibles à 20 / minute / IP (`PLAFOND_STRICT`) : ce banc en joue une cinquantaine. Derrière nginx il lit X-Forwarded-For ;
     le banc change de « poste » toutes les dix requêtes (comme test-845), sans jamais toucher au plafond lui-même. */
  let nAppels = 0;
  const appel = async (meth, route, corps, entetes) => {
    const ip = '10.31.' + Math.floor(nAppels++ / 10) % 250 + '.7';
    const r = await fetch(B + route, { method: meth, headers: Object.assign({ 'Content-Type': 'application/json', 'X-Forwarded-For': ip }, entetes || {}), body: corps ? JSON.stringify(corps) : undefined });
    const txt = await r.text(); let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { code: r.status, json: json || {}, txt };
  };
  const usages = () => { try { return JSON.parse(fs.readFileSync(path.join(data, 'promos-usages.json'), 'utf8')); } catch (e) { return null; } };
  const annuaire = () => { try { return JSON.parse(fs.readFileSync(path.join(data, 'espaces.json'), 'utf8')); } catch (e) { return null; } };
  return { B, vivant, appel, usages, annuaire, data, cfgPath, journal: () => journal };
}
const kh = slug => ({ 'x-teamop-kh': sha(CLES[slug]) });

(async () => {
  try { require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('\n  … parties 2 et 3 SAUTÉES : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exitCode = ko ? 1 : 0; return; }

  /* POPULATION : un zéro ne prouve rien sur un ensemble vide */
  const metiersDe = l => l.filter(s => ESP[s]).map(s => ESP[s].metier || '');
  vrai('population : au moins une entreprise de plomberie, de chauffage, de nettoyage et sans métier, sur chaque chemin',
    ['applomb', 'apclim', 'apnet', 'apsans'].every(s => ESP[s]) && ['trplomb', 'trclim', 'trnet', 'trsans'].every(s => ESP[s]) && ['rlplomb', 'rlnet', 'rlsans'].every(s => ESP[s]) && ['rtplomb', 'rtnet', 'rtsans'].every(s => ESP[s])
    && metiersDe(['applomb', 'trplomb', 'rlplomb', 'rtplomb']).every(m => m === 'plomberie') && metiersDe(['apnet', 'trnet', 'rlnet', 'rtnet']).every(m => m === 'nettoyage') && metiersDe(['apsans', 'trsans', 'rlsans', 'rtsans']).every(m => m === ''));

  const S = await monter('srv');
  vrai('le serveur du banc démarre', S.vivant);
  if (!S.vivant) { console.log(S.journal().slice(-2500)); arreterTout(); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exitCode = 1; return; }
  const n = c => ((S.usages() || {})[c] || {}).n;
  const eq = (c, t) => (((S.usages() || {})[c] || {}).equipes || {})[t];
  const registre0 = fs.readFileSync(path.join(S.data, 'promos-usages.json'), 'utf8');

  console.log('\n══ 2.0 Le démarrage : une restriction illisible se DIT, et ferme le code ══');
  {
    const j = S.journal();
    vrai('le journal nomme le code à la restriction fautive (identifiant inconnu)', new RegExp('ERREUR config\\.promos : le code « ' + TYPO + ' »').test(j) && /chauffge/.test(j));
    vrai('   … et celui dont « metiers » n\'est pas une liste', new RegExp('ERREUR config\\.promos : le code « ' + FORME + ' »').test(j));
    faux('   … mais pas le code libre, ni le code à liste vide, ni les codes réservés valables', new RegExp('ERREUR config\\.promos : le code « (' + LIBRE + '|' + VIDE + '|' + RES + '|' + PLAFOND + ') »').test(j));
    faux('   … et la configuration n\'est jamais affichée (ni clé SMTP, ni mot de passe)', /mot-de-passe-du-banc|"pass"|adminPassHash/.test(j));
  }

  console.log('\n══ 2a. L\'application (`/api/promo/valider`, preuve de clé) ══');
  {
    const n0 = n(RES);
    let r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.applomb.t }, kh('applomb'));
    v('plomberie : ADMISE, activée (Business, 2 mois)', [r.code, r.json.ok, r.json.formule, r.json.finLe, r.json.dejaUtilise], [200, true, 'business', dans(2), false]);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.apclim.t }, kh('apclim'));
    v('chauffage / climatisation : ADMISE aussi', [r.code, r.json.ok], [200, true]);
    v('   … deux utilisations de plus, pas une de plus', n(RES), n0 + 2);

    const n1 = n(RES);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.apnet.t }, kh('apnet'));
    v('⛔ nettoyage seul : REFUSÉE (403, `metierNonAdmis`)', [r.code, r.json.metierNonAdmis, r.json.ok], [403, true, undefined]);
    vrai('   … le refus NOMME les métiers admis', /Plomberie et Chauffage \/ Climatisation/.test(r.json.error || ''));
    v('   … le compteur n\'a PAS bougé et rien n\'est inscrit', [n(RES), eq(RES, ESP.apnet.t)], [n1, undefined]);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.apsans.t }, kh('apsans'));
    v('⛔ métier non posé : REFUSÉE aussi (dans le doute on n\'active pas)', [r.code, r.json.metierNonAdmis], [403, true]);
    vrai('   … et le refus dit que le métier n\'est pas encore réglé', /pas encore réglé/.test(r.json.error || ''));
    v('   … le compteur n\'a PAS bougé', [n(RES), eq(RES, ESP.apsans.t)], [n1, undefined]);

    /* ⛔ LE CORPS NE DÉCIDE JAMAIS DU MÉTIER */
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.apnet.t, metier: 'plomberie', metiers: ['plomberie'], metierAdmis: true, apercu: false }, kh('apnet'));
    v('⛔ « metier: plomberie » dans le corps ne fait pas d\'une entreprise de nettoyage une entreprise de plomberie', [r.code, n(RES), eq(RES, ESP.apnet.t)], [403, n1, undefined]);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.apsans.t, metier: 'plomberie' }, kh('apsans'));
    v('   … ni ne pose le métier de celle qui n\'en a pas', [r.code, n(RES)], [403, n1]);
    v('   … et l\'annuaire n\'a pas bougé d\'un mot', [S.annuaire().apnet.metier, S.annuaire().apsans.metier], ['nettoyage', undefined]);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.apassoc.t }, kh('apassoc'));
    v('⚠️ un champ d\'associés INVENTÉ dans l\'annuaire (« metiersAssocies », « associes », « metiers ») ne compte pas : nettoyage reste refusé', [r.code, n(RES)], [403, n1]);

    /* sans preuve, c'est la preuve qui refuse — pas le métier : la route ne dit rien du métier à qui n'a pas prouvé son entreprise */
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.apnet.t });
    vrai('sans preuve de clé : 403 de la CLÉ, qui ne dit rien du métier ni des codes réservés', r.code === 403 && !r.json.metierNonAdmis && !/Plomberie|réservé/.test(r.json.error || ''));

    /* un code actif ne se coupe pas, un code servi garde son 410 */
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.apact.t }, kh('apact'));
    v('⛔ un code déjà ACTIF chez une entreprise de nettoyage n\'est PAS coupé (même échéance, « déjà utilisé »)', [r.code, r.json.dejaUtilise, r.json.finLe], [200, true, dans(1)]);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.apservi.t }, kh('apservi'));
    v('⛔ un code déjà SERVI garde son 410 (pas un 403 de métier)', [r.code, r.json.dejaUtilise, r.json.finLe], [410, true, PASSE]);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, teamId: ESP.applomb.t }, kh('applomb'));
    v('le code retapé par l\'entreprise de plomberie : même échéance, rien ne se recompte', [r.code, r.json.dejaUtilise, r.json.finLe, n(RES)], [200, true, dans(2), n1]);

    /* le plafond : le métier est jugé AVANT, un refus de métier ne dit pas « plafond atteint » */
    r = await S.appel('POST', '/api/promo/valider', { code: PLAFOND, teamId: ESP.applombbis.t }, kh('applombbis'));
    v('un code réservé à PLAFOND 1 : la première entreprise de plomberie l\'a', [r.code, r.json.ok], [200, true]);
    const nPlaf = n(PLAFOND);
    r = await S.appel('POST', '/api/promo/valider', { code: PLAFOND, teamId: ESP.applomb.t }, kh('applomb'));
    v('   … une entreprise qui a DÉJÀ un autre code actif reçoit « un seul code à la fois » (409), le métier étant admis', [r.code], [409]);
    r = await S.appel('POST', '/api/promo/valider', { code: PLAFOND, teamId: ESP.applombter.t }, kh('applombter'));
    v('   … la seconde, admise, trouve le plafond atteint (410)', [r.code, n(PLAFOND)], [410, nPlaf]);
    r = await S.appel('POST', '/api/promo/valider', { code: PLAFOND, teamId: ESP.apnetplaf.t }, kh('apnetplaf'));
    v('   … et une entreprise de nettoyage reçoit le refus de MÉTIER (403), pas le plafond', [r.code, r.json.metierNonAdmis], [403, true]);

    /* un code libre, inchangé */
    const nL = n(LIBRE);
    r = await S.appel('POST', '/api/promo/valider', { code: LIBRE, teamId: ESP.apnetlibre.t }, kh('apnetlibre'));
    v('⛔ un code SANS restriction s\'active pour une entreprise de nettoyage, comme avant', [r.code, r.json.ok, r.json.formule, r.json.finLe, n(LIBRE)], [200, true, 'pro', dans(1), (nL || 0) + 1]);
    vrai('   … et sa réponse ne porte aucune des clés de la restriction', !('reserve' in r.json) && !('metierAdmis' in r.json) && !('metierNonAdmis' in r.json));
    r = await S.appel('POST', '/api/promo/valider', { code: VIDE, teamId: ESP.apsans.t }, kh('apsans'));
    v('   … `metiers: []` vaut « libre » (même une entreprise sans métier)', [r.code, r.json.ok], [200, true]);

    /* une restriction illisible FERME le neuf, pas l'actif */
    for (const [c, nom] of [[TYPO, 'identifiant inconnu'], [FORME, 'pas une liste']]) {
      const nC = n(c), reg = JSON.stringify(S.usages());
      r = await S.appel('POST', '/api/promo/valider', { code: c, teamId: ESP.applomb.t }, kh('applomb'));
      v('⛔ restriction illisible (' + nom + ') : le code est FERMÉ (503), même pour la plomberie', [r.code, n(c), JSON.stringify(S.usages()) === reg], [503, nC, true]);
      vrai('   … sans rien dire du réglage', !/plomberie|chauffge|metiers/i.test(r.txt));
    }
    r = await S.appel('POST', '/api/promo/valider', { code: TYPO, teamId: ESP.apact.t }, kh('apact'));
    v('   … mais un code illisible déjà ACTIF chez une entreprise n\'est pas coupé', [r.code, r.json.dejaUtilise, r.json.finLe], [200, true, dans(1)]);

    /* des courriels : « code activé » n'est parti QUE pour les admises */
    await dormir(500);
    vrai('un courriel « code activé » est parti pour la plomberie ET pour le chauffage', courrierPour(ESP.applomb.email, new RegExp(RES)).length >= 1 && courrierPour(ESP.apclim.email, new RegExp(RES)).length >= 1);
    v('⛔ aucun pour les refusées (nettoyage, sans métier, associés inventés)', [ESP.apnet, ESP.apsans, ESP.apassoc].map(e => courrierPour(e.email, new RegExp(RES)).length), [0, 0, 0]);
  }

  console.log('\n══ 2b. L\'aperçu public : une information, jamais une décision ══');
  {
    const CLES_LIBRE = ['debut', 'dejaUtilise', 'finLe', 'formule', 'mois', 'ok'];
    let r = await S.appel('POST', '/api/promo/valider', { code: LIBRE, apercu: true });
    v('un code libre : la réponse d\'AVANT, exactement (aucune clé de plus)', [r.code, Object.keys(r.json).sort()], [200, CLES_LIBRE]);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, apercu: true });
    v('un code réservé : `reserve: true`, et rien d\'autre de neuf sans métier donné', [r.code, r.json.reserve, 'metierAdmis' in r.json, r.json.formule, r.json.mois], [200, true, false, 'business', 2]);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, apercu: true, metier: 'chauffage' });
    v('   … avec le métier de la page : `metierAdmis: true` s\'il figure dans la liste', r.json.metierAdmis, true);
    r = await S.appel('POST', '/api/promo/valider', { code: RES, apercu: true, metier: 'nettoyage' });
    v('   … `false` sinon', r.json.metierAdmis, false);
    vrai('   … sans jamais donner la liste des métiers', !/plomberie|chauffage|Plomberie/.test(r.txt));
    const rA = await S.appel('POST', '/api/promo/valider', { code: RES, apercu: true, teamId: ESP.applomb.t, metier: 'nettoyage' });
    const rB = await S.appel('POST', '/api/promo/valider', { code: RES, apercu: true, teamId: ESP.apnet.t, metier: 'nettoyage' });
    const rC = await S.appel('POST', '/api/promo/valider', { code: RES, apercu: true, teamId: 'ent-inexistante', metier: 'nettoyage' });
    v('⛔ l\'aperçu ne lit RIEN de l\'entreprise nommée : la même réponse pour une entreprise de plomberie, de nettoyage et une qui n\'existe pas', [JSON.stringify(rA.json) === JSON.stringify(rB.json), JSON.stringify(rB.json) === JSON.stringify(rC.json)], [true, true]);
    const reg = JSON.stringify(S.usages());
    await S.appel('POST', '/api/promo/valider', { code: RES, apercu: true, teamId: ESP.applomb.t });
    v('   … et il n\'écrit rien', JSON.stringify(S.usages()) === reg, true);
    for (const c of [TYPO, FORME]) { r = await S.appel('POST', '/api/promo/valider', { code: c, apercu: true }); v('un code à restriction illisible : l\'aperçu dit « pas utilisable » (503)', r.code, 503); }
    r = await S.appel('POST', '/api/promo/valider', { code: 'ESSAI-BANC-INCONNU', apercu: true });
    v('un code inconnu : 404, comme avant', r.code, 404);
  }

  console.log('\n══ 2c. La Tour (`/api/monitor/espaces/promo`) — appelée à l\'acceptation d\'une demande ══');
  const tour = (await S.appel('POST', '/api/monitor/login', { nom: 'Patron', pass: MDP })).json;
  vrai('la Tour se connecte', /^[a-f0-9]{48}$/.test(String(tour.token || '')));
  const T = { Authorization: 'Bearer ' + tour.token };
  {
    const n0 = n(RES);
    let r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trplomb', code: RES }, T);
    v('plomberie : activée', [r.code, r.json.ok, r.json.finLe, r.json.dejaUtilise], [200, true, dans(2), false]);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trclim', code: RES }, T);
    v('chauffage / climatisation : activée', [r.code, r.json.ok], [200, true]);
    v('   … deux utilisations', n(RES), n0 + 2);
    const n1 = n(RES);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trnet', code: RES }, T);
    v('⛔ nettoyage seul : REFUSÉE (403) — et la Tour lit `error` pour le dire (`promoErr`)', [r.code, r.json.metierNonAdmis, /Plomberie et Chauffage/.test(r.json.error || '')], [403, true, true]);
    v('   … compteur intact, registre intact, formule de la fiche intacte', [n(RES), eq(RES, ESP.trnet.t), S.annuaire().trnet.formule, S.annuaire().trnet.codePromo], [n1, undefined, undefined, undefined]);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trsans', code: RES, metier: 'plomberie', metiers: ['plomberie'] }, T);
    v('⛔ métier non posé : refusé, et un « metier » dans le corps de la Tour ne le pose pas', [r.code, r.json.metierNonAdmis, n(RES), S.annuaire().trsans.metier], [403, true, n1, undefined]);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trnet', code: RES, metier: 'plomberie' }, T);
    v('⛔ « metier: plomberie » dans le corps ne change pas le métier de l\'entreprise de nettoyage', [r.code, n(RES), S.annuaire().trnet.metier], [403, n1, 'nettoyage']);

    /* L'ORDRE DE L'ACCEPTATION : le métier d'abord, puis le code */
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trneuf', code: RES }, T);
    v('un espace NEUF dont la Tour n\'a pas encore posé le métier : le code est refusé (c\'est l\'ancien ordre de la Tour, code avant métier)', [r.code, r.json.metierNonAdmis, n(RES)], [403, true, n1]);
    r = await S.appel('POST', '/api/monitor/espaces/metier', { nom: 'trneuf', metier: 'plomberie', siVide: true }, T);
    v('… la Tour pose le métier de la demande (comme `tourAccepterDemande`, qui le fait désormais AVANT le code)', [r.code, r.json.metier], [200, 'plomberie']);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trneuf', code: RES }, T);
    v('… et le même code s\'active, la même minute', [r.code, r.json.ok, r.json.finLe, n(RES)], [200, true, dans(2), n1 + 1]);
    /* une demande qui dit « plomberie » sur une entreprise déjà ouverte en nettoyage : la Tour garde le métier existant, donc le code est refusé */
    r = await S.appel('POST', '/api/monitor/espaces/metier', { nom: 'trgarde', metier: 'plomberie', siVide: true }, T);
    v('une seconde demande « plomberie » sur une entreprise ouverte en nettoyage : le métier GARDÉ est nettoyage', [r.json.garde, r.json.metier], [true, 'nettoyage']);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trgarde', code: RES }, T);
    v('   … donc le code réservé est refusé (Justin peut changer le métier dans la fiche, puis réappliquer)', [r.code, r.json.metierNonAdmis], [403, true]);
    r = await S.appel('POST', '/api/monitor/espaces/metier', { nom: 'trgarde', metier: 'chauffage' }, T);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trgarde', code: RES }, T);
    v('   … le métier changé à la main dans la fiche, le code s\'active', [r.code, r.json.ok], [200, true]);

    for (const [c, nom] of [[TYPO, 'identifiant inconnu'], [FORME, 'pas une liste']]) {
      const nC = n(c);
      r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trplomb', code: c }, T);
      v('⛔ restriction illisible (' + nom + ') : FERMÉ (503) — même pour la plomberie', [r.code, n(c)], [503, nC]);
    }
    const nL = n(LIBRE);
    r = await S.appel('POST', '/api/monitor/espaces/promo', { nom: 'trnet', code: LIBRE }, T);
    v('un code libre, depuis la Tour, pour du nettoyage : comme avant', [r.code, r.json.ok, n(LIBRE)], [200, true, (nL || 0) + 1]);

    /* la lecture de la Tour : la restriction se voit, ne s'écrit pas */
    const lp = (await S.appel('GET', '/api/monitor/promos', null, T)).json;
    const parCode = c => (lp.codes || []).find(x => x.code === c) || {};
    v('`/api/monitor/promos` : le code réservé porte les LIBELLÉS de ses métiers', parCode(RES).metiers, ['Plomberie', 'Chauffage / Climatisation']);
    v('   … le code libre n\'en porte aucun', [parCode(LIBRE).metiers, parCode(LIBRE).metiersIllisible], [[], false]);
    v('   … la restriction illisible est SIGNALÉE, avec l\'identifiant fautif', [parCode(TYPO).metiersIllisible, parCode(TYPO).metiersInconnus], [true, ['chauffge']]);
    v('   … `metiers: []` est lu comme libre', [parCode(VIDE).metiers, parCode(VIDE).metiersIllisible], [[], false]);
    const rCrea = await S.appel('POST', '/api/monitor/promos', { code: 'ESSAI-BANC-CREE', formule: 'pro', mois: 1 }, T);
    vrai('   … et la Tour ne CRÉE ni ne règle aucun code (lecture seule)', rCrea.code === 404 || rCrea.code === 405);
  }

  console.log('\n══ 2d. Le relais du portail (`/api/clients/sync`, vrais comptes vérifiés) ══');
  {
    const emp = k => sha('empreinte-3133-' + k);
    const session = async (slug) => {
      const email = ESP[slug].email;
      await S.appel('POST', '/api/compte/creer', { email, h: emp(slug), prenom: 'Banc', nom: slug });
      let jv = '';
      for (let i = 0; i < 60 && !jv; i++) { await dormir(100); const m = courrierPour(email, /verifyEmail&jeton=[a-f0-9]{64}/)[0]; if (m) jv = /verifyEmail&jeton=([a-f0-9]{64})/.exec(m)[1]; }
      if (!jv) return '';
      await S.appel('POST', '/api/compte/verifier', { jeton: jv });
      const c = await S.appel('POST', '/api/compte/connexion', { email, h: emp(slug) });
      return (c.json && c.json.jeton) || '';
    };
    const J = {};
    for (const s of ['rlplomb', 'rlnet', 'rlsans', 'rllibre']) J[s] = await session(s);
    vrai('population : quatre comptes du portail, vérifiés, avec une session', Object.values(J).every(j => /^[0-9a-f]{64}$/.test(j)));
    const sync = (s, extra) => S.appel('POST', '/api/clients/sync', Object.assign({ entreprise: ESP[s].nom, nom: 'Banc ' + s, demandes: [] }, extra || {}), { Authorization: 'Bearer ' + J[s] });
    const n0 = n(RES);
    let r = await sync('rlplomb', { promoCode: RES });
    v('plomberie : le relais ACTIVE le code (une utilisation, l\'entreprise inscrite)', [r.code, n(RES), !!eq(RES, ESP.rlplomb.t)], [200, n0 + 1, true]);
    vrai('   … il pose la formule sur la fiche de l\'entreprise (comme avant)', S.annuaire().rlplomb.codePromo === RES && S.annuaire().rlplomb.formule === 'business');
    const n1 = n(RES);
    r = await sync('rlnet', { promoCode: RES });
    v('⛔ nettoyage seul : RIEN d\'écrit — ni utilisation, ni formule, ni `codePromo` sur la fiche', [n(RES), eq(RES, ESP.rlnet.t), S.annuaire().rlnet.formule, S.annuaire().rlnet.codePromo], [n1, undefined, undefined, undefined]);
    r = await sync('rlnet', { promoCode: RES, metier: 'plomberie', demandes: [{ app: 'OP GESTION', formule: 'Pro', date: 1, metier: 'plomberie', code: RES }] });
    v('⛔ « metier: plomberie » dans la fiche et dans la demande du client ne fait pas du nettoyage de la plomberie (le métier de l\'annuaire ne bouge pas)', [n(RES), eq(RES, ESP.rlnet.t), S.annuaire().rlnet.metier], [n1, undefined, 'nettoyage']);
    r = await sync('rlsans', { promoCode: RES, metier: 'plomberie' });
    v('⛔ métier non posé : rien d\'écrit non plus', [n(RES), eq(RES, ESP.rlsans.t), S.annuaire().rlsans.metier], [n1, undefined, undefined]);
    /* le portail renvoie le code à CHAQUE synchro : dès que la Tour pose le métier, la synchro suivante l'active */
    await S.appel('POST', '/api/monitor/espaces/metier', { nom: 'rlsans', metier: 'chauffage' }, T);
    r = await sync('rlsans', { promoCode: RES });
    v('… la Tour pose le métier, la synchro SUIVANTE active le code', [n(RES), !!eq(RES, ESP.rlsans.t)], [n1 + 1, true]);
    const nL = n(LIBRE);
    r = await sync('rllibre', { promoCode: LIBRE });
    v('un code libre, relayé pour du nettoyage : comme avant', [n(LIBRE), !!eq(LIBRE, ESP.rllibre.t)], [(nL || 0) + 1, true]);
    for (const c of [TYPO, FORME]) { const nC = n(c); await sync('rlplomb', { promoCode: c }); v('⛔ restriction illisible : le relais n\'active rien', n(c), nC); }

    console.log('\n   ── le cinquième lecteur : `/api/portail/promo` ──');
    const portail = (s, code) => S.appel('POST', '/api/portail/promo', { code }, { Authorization: 'Bearer ' + J[s] });
    r = await portail('rlnet', RES);
    v('un code RÉSERVÉ : 403 `code_reserve_metiers`, pas de « activé »', [r.code, r.json.error], [403, 'code_reserve_metiers']);
    const moi = await S.appel('GET', '/api/portail/moi', null, { Authorization: 'Bearer ' + J.rlnet });
    vrai('   … et le dossier du client ne porte ni offre ni code utilisé', !(moi.json.dossier && (moi.json.dossier.promo || (moi.json.dossier.promoUsed || []).length)));
    r = await portail('rlnet', TYPO);
    v('   … une restriction illisible dit la même chose (le code est fermé)', [r.code, r.json.error], [403, 'code_reserve_metiers']);
    r = await portail('rllibre', LIBRE);
    v('un code libre, par le portail : activé, comme avant', [r.code, !!(r.json.dossier && r.json.dossier.promo)], [200, true]);
  }

  console.log('\n══ 2e. Le rattrapage d\'`espacePaye` (l\'application demande son état ; la Tour LIT sans rien activer) ══');
  {
    const liste = async () => { const r = await S.appel('GET', '/api/monitor/espaces/liste', null, T); return Object.fromEntries((r.json.espaces || []).map(x => [x.slug, x])); };
    const n0 = n(RES);
    let L = await liste();
    v('LECTURE (la liste de la Tour) : la plomberie a un code « en attente », payé', [L.rtplomb.paye, /en attente/.test(L.rtplomb.motif || '')], [true, true]);
    v('⛔ LECTURE : le nettoyage seul n\'a PAS de code en attente — il n\'est pas « payé » par un code qu\'il ne pourra jamais activer', [L.rtnet.paye, /en attente/.test(L.rtnet.motif || '')], [false, false]);
    v('⛔ LECTURE : métier non posé → le code reste en attente (le doute vient de NOTRE côté : l\'horloge de conservation ne doit pas démarrer)', [L.rtsans.paye, /en attente/.test(L.rtsans.motif || '')], [true, true]);
    vrai('   … et le motif dit la VRAIE raison (« réservé à certains métiers », la Tour pose le métier), pas « au prochain lancement de l\'application »', /réservé à certains métiers/.test(L.rtsans.motif || '') && !/prochain lancement/.test(L.rtsans.motif || '') && /prochain lancement/.test(L.rtplomb.motif || ''), [L.rtsans.motif, L.rtplomb.motif]);
    v('   … et rien n\'a été activé par ces lectures', n(RES), n0);

    let r = await S.appel('POST', '/api/espaces/etat', { t: ESP.rtplomb.t });
    v('l\'APPLICATION (plomberie) : le code s\'active, payé', [r.json.paye, n(RES), !!eq(RES, ESP.rtplomb.t)], [true, n0 + 1, true]);
    r = await S.appel('POST', '/api/espaces/etat', { t: ESP.rtnet.t, metier: 'plomberie' });
    v('⛔ l\'APPLICATION (nettoyage), même avec « metier: plomberie » dans le corps : PAS payé, rien d\'activé', [r.json.paye, n(RES), eq(RES, ESP.rtnet.t)], [false, n0 + 1, undefined]);
    r = await S.appel('POST', '/api/espaces/etat', { t: ESP.rtsans.t });
    v('⛔ l\'APPLICATION (métier non posé) : rien ne s\'active', [r.json.paye, n(RES), eq(RES, ESP.rtsans.t)], [false, n0 + 1, undefined]);
    await S.appel('POST', '/api/monitor/espaces/metier', { nom: 'rtsans', metier: 'plomberie' }, T);
    r = await S.appel('POST', '/api/espaces/etat', { t: ESP.rtsans.t });
    v('… la Tour pose le métier : à la demande suivante de l\'application, le code s\'active', [r.json.paye, n(RES), !!eq(RES, ESP.rtsans.t)], [true, n0 + 2, true]);
    r = await S.appel('POST', '/api/espaces/etat', { t: ESP.apact.t });
    vrai('un code ACTIF chez une entreprise de nettoyage reste lu (période offerte en cours : payé)', r.json.paye === true);
    r = await S.appel('POST', '/api/espaces/etat', { t: ESP.apservi.t });
    v('un code SERVI reste refusé (pas payé)', r.json.paye, false);
  }

  console.log('\n══ 2f. Au total : rien n\'a été écrit en plus de ce qui a été servi ══');
  {
    const u = S.usages();
    const attendu = ['ent-applomb', 'ent-apclim', 'ent-trplomb', 'ent-trclim', 'ent-trneuf', 'ent-trgarde', 'ent-rlplomb', 'ent-rlsans', 'ent-rtplomb', 'ent-rtsans', 'ent-apact', 'ent-apservi'];
    v('les seules entreprises inscrites au code réservé sont celles qu\'il a servies (plus les deux d\'avant)', Object.keys(u[RES].equipes).sort(), attendu.slice().sort());
    v('le compteur du code réservé = ce qu\'il a servi + l\'utilisation d\'avant', u[RES].n, 1 + 10);
    faux('aucune des entreprises refusées n\'a laissé de trace', ['ent-apnet', 'ent-apsans', 'ent-apassoc', 'ent-trnet', 'ent-trsans', 'ent-rlnet', 'ent-rtnet'].some(t => (u[RES].equipes || {})[t]));
    vrai('les codes à restriction illisible n\'ont servi personne de neuf (leur seule entrée est celle d\'avant)', Object.keys((u[TYPO] || {}).equipes || {}).join() === 'ent-apact' && !u[FORME]);
    vrai('le registre n\'est pas devenu illisible, il reste du JSON valide', registre0.length > 0 && u && typeof u === 'object');
  }

  /* ══ 3. L'OUTIL DU VPS ═════════════════════════════════════════════════════════════════════════ */
  console.log('\n══ 3. `server/configurer-promos.js` : la façon de déclarer la restriction ══');
  {
    const dir = path.join(BANC, 'outil'); fs.mkdirSync(dir, { recursive: true });
    const cfgPath = path.join(dir, 'config.json');
    const SECRET = 'SECRET-SMTP-3133-NE-DOIT-JAMAIS-SORTIR';
    const base = { apiKey: SECRET, smtp: { pass: SECRET + '-2' }, stripe: { secretKey: SECRET + '-3' }, promos: [{ code: 'ESSAI-BANC-OUTIL', formule: 'pro', mois: 2 }], reglageDivers: { a: [1, 2, 3] } };
    const poser = (o) => fs.writeFileSync(cfgPath, typeof o === 'string' ? o : JSON.stringify(o, null, 2), { mode: 0o600 });
    const lire = () => fs.readFileSync(cfgPath, 'utf8');
    poser(base);
    let r = lancerScript(['lister'], cfgPath);
    v('`lister` : sortie 0, le code est listé avec sa restriction (libre)', [r.status, /ESSAI-BANC-OUTIL/.test(r.stdout), /libre/.test(r.stdout)], [0, true, true]);
    vrai('⛔ … et AUCUN secret de la configuration n\'est affiché (ni sur la sortie, ni sur l\'erreur)', !r.stdout.includes('SECRET-SMTP-3133') && !r.stderr.includes('SECRET-SMTP-3133') && !/smtp|stripe|apiKey/i.test(r.stdout));
    const avant = lire();
    r = lancerScript(['reserver', 'essai-banc-outil', 'plomberie,chauffage'], cfgPath);
    v('`reserver` (casse libre) : sortie 0', r.status, 0);
    let c = JSON.parse(lire());
    v('   … la restriction est écrite, rien d\'autre ne bouge (secrets, autres clés, ordre)', [c.promos[0].metiers, c.apiKey, c.smtp.pass, c.reglageDivers, Object.keys(c)], [['plomberie', 'chauffage'], SECRET, SECRET + '-2', { a: [1, 2, 3] }, ['apiKey', 'smtp', 'stripe', 'promos', 'reglageDivers']]);
    v('   … le mode du fichier est gardé (600)', fs.statSync(cfgPath).mode & 0o777, 0o600);
    vrai('   … aucun fichier temporaire ne reste', fs.readdirSync(dir).filter(f => f !== 'config.json').length === 0);
    vrai('   … la sortie dit de redémarrer le service', /systemctl restart teamop-api/.test(r.stdout));
    const avant2 = lire();
    r = lancerScript(['reserver', 'ESSAI-BANC-OUTIL', 'plomberie,chauffge'], cfgPath);
    v('⛔ un identifiant inconnu de `metiers.json` est REFUSÉ (sortie 1), et le fichier n\'a pas bougé d\'un octet', [r.status, lire() === avant2], [1, true]);
    vrai('   … le refus nomme l\'identifiant fautif et liste les possibles', /chauffge/.test(r.stderr) && /possibles : .*plomberie/.test(r.stderr));
    r = lancerScript(['reserver', 'ESSAI-BANC-ABSENT', 'plomberie'], cfgPath);
    v('un code absent : refusé (1), fichier intact', [r.status, lire() === avant2], [1, true]);
    r = lancerScript(['reserver', 'ESSAI-BANC-OUTIL', ''], cfgPath);
    v('une liste vide : refusée (1), fichier intact', [r.status, lire() === avant2], [1, true]);
    r = lancerScript(['lister'], cfgPath);
    vrai('`lister` montre le code réservé, avec libellés et identifiants', /réservé : Plomberie \[plomberie\], Chauffage \/ Climatisation \[chauffage\]/.test(r.stdout));
    r = lancerScript(['ouvrir', 'ESSAI-BANC-OUTIL'], cfgPath);
    c = JSON.parse(lire());
    v('`ouvrir` : la restriction est retirée, le code redevient libre', [r.status, 'metiers' in c.promos[0], c.promos[0].mois], [0, false, 2]);
    r = lancerScript(['ouvrir', 'ESSAI-BANC-OUTIL'], cfgPath);
    v('   … le refaire ne fait rien (sortie 0)', [r.status, /déjà libre/.test(r.stdout)], [0, true]);
    r = lancerScript(['ajouter', 'ESSAI-BANC-OUTIL', 'pro', '1'], cfgPath);
    v('`ajouter` un code qui existe : refusé (1)', r.status, 1);
    r = lancerScript(['ajouter', 'ESSAI-BANC-NOUVEAU', 'bronze', '1'], cfgPath);
    v('`ajouter` une formule inconnue : refusé (1)', r.status, 1);
    r = lancerScript(['ajouter', 'ESSAI-BANC-NOUVEAU', 'pro', '99'], cfgPath);
    v('`ajouter` une durée hors 1–36 mois : refusé (1)', r.status, 1);
    r = lancerScript(['ajouter', 'a b', 'pro', '1'], cfgPath);
    v('`ajouter` un code mal formé : refusé (1)', r.status, 1);
    r = lancerScript(['ajouter', 'ESSAI-BANC-NOUVEAU', 'business', '3', '5', 'nettoyage'], cfgPath);
    c = JSON.parse(lire());
    const nv = c.promos.find(p => p.code === 'ESSAI-BANC-NOUVEAU') || {};
    v('`ajouter` avec plafond et métier : écrit tel quel', [r.status, nv.formule, nv.mois, nv.maxUtilisations, nv.metiers], [0, 'business', 3, 5, ['nettoyage']]);
    /* une configuration illisible n'est JAMAIS réécrite */
    poser('{ "promos": [ { "code": "ESSAI-BANC-OUTIL" ');
    const casse = lire();
    r = lancerScript(['reserver', 'ESSAI-BANC-OUTIL', 'plomberie'], cfgPath);
    v('⛔ une configuration qui ne se lit pas (accolade perdue) : refusé (1), le fichier n\'est PAS touché', [r.status, lire() === casse], [1, true]);
    r = lancerScript(['lister'], cfgPath);
    v('   … `lister` aussi refuse, sans l\'afficher', [r.status, r.stdout.includes('promos')], [1, false]);
    r = lancerScript(['n-importe-quoi'], cfgPath);
    v('une sous-commande inconnue : l\'usage, sortie 1', [r.status, /Usage/.test(r.stderr)], [1, true]);
    /* le fichier produit se lit par le VRAI serveur (la boucle est fermée au § 2 : les codes du banc ont été écrits par l'outil) */
    vrai('(les codes réservés du serveur du banc ont été écrits par `ajouter` — le serveur les a lus : § 2a)', true);
  }

  /* (les PAGES — la Tour qui pose le métier avant le code, la pastille « Réservé », le message du portail — sont gardées par `test-3134`, hors de la liste du serveur seul : elles ne partent pas avec lui) */
  arreterTout();   // le serveur du banc tient la boucle d'événements : sans lui, le banc ne rend jamais la main
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})().catch(e => { console.log('  ✗ le banc s\'est interrompu : ' + (e && e.stack || e)); arreterTout(); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exitCode = 1; });
