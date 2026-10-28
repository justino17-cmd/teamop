/* ⛔ CE QUE CE FICHIER GARDE — L'OUTIL QUI NETTOIE UN ESPACE ORPHELIN (`server/nettoyer-espace-orphelin.js`, 28 octobre 2026).

   Un espace d'AVANT le renommage (`elan-gestion`, `elan-gestion-beta`) n'est dans aucun annuaire et reste invisible dans la Tour, mais garde des
   journaux de connexions (avec les identifiants des salariés), des abonnements push, de l'usage, des lignes de `bugs.jsonl`. L'outil se lance SUR LE VPS ; ce banc
   le lance en vrai (`child_process`) sur un FAUX `TEAMOP_DATA` complet qui porte DEUX espaces — l'orphelin et un vivant — et un faux `systemctl` dans le PATH.
     1. le constat (par défaut) ne change RIEN : empreinte de chaque fichier et de chaque dossier identique avant et après ;
     2. ⛔ un espace VIVANT est refusé (code 2) par ses trois chemins — le champ `t`, le `t` du code, le slug —, et un identifiant mal formé aussi ;
     3. ⛔ le service ACTIF est refusé (code 3), sans écrire ; un fichier illisible aussi (code 4), sans écrire ;
     4. avec `--faire`, chaque registre n'a plus que l'AUTRE espace, `bugs.jsonl` garde les autres lignes OCTET POUR OCTET, le blocage est posé (et la suspension
        retirée), les incidents de `monitor.json` perdent l'entreprise NOMMÉE et pas les autres, le journal prend une ligne sans donnée ;
     5. ⛔ chaque écriture passe par un temporaire du MÊME dossier puis un renommage — vu par un crochet posé sur `fs`, pas supposé ;
     6. la sortie ne contient AUCUNE des adresses, des identifiants ni des noms semés (jetons à lettres hors [0-9a-f]) ;
     7. les espaces « techniques » du serveur ne sont pas bloqués sans `--bloquer`, la bêta vivante est refusée, et rien n'est écrit pour une trace introuvable. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), cp = require('child_process'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
const OUTIL = path.join(RACINE, 'server', 'nettoyer-espace-orphelin.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3098-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();

/* ── les données semées : des jetons à lettres HORS [0-9a-f], pour qu'un hasard d'empreinte ne puisse pas les « trouver » ── */
const T = 'orphelin-qwzx', VIVANT = 'vivant-qwzx', CODEUR = 'codeur-qwzx', PAR_SLUG = 'slug-qwzx';
const SEMES = [
  'zorglub.qwxy@exemple-zz.fr', 'salarie-qwxy-un', 'salarie-qwxy-deux', 'Zorglub Qwxy', 'Plumeau Zqxw',
  'https://push.exemple-zz.fr/ep-qwxy-un', 'https://push.exemple-zz.fr/ep-qwxy-deux', 'https://push.exemple-zz.fr/ep-qwxy-trois',
  'boite.qwxy@exemple-zz.fr', 'passe-scelle-qwxy-orphelin', 'ancien.qwxy@exemple-zz.fr', 'bug-qwxy-message',
];
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

function ecrire(dir, rel, contenu, mode) { const p = path.join(dir, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, contenu); if (mode) fs.chmodSync(p, mode); return p; }
const J = (o) => JSON.stringify(o);

/* Un faux TEAMOP_DATA complet. `t` : l'orphelin ; VIVANT, CODEUR et PAR_SLUG sont dans l'annuaire. */
function fabriquer(nom, t) {
  const base = path.join(banc, nom), data = path.join(base, 'data'), cfg = path.join(base, 'cfg');
  fs.mkdirSync(data, { recursive: true }); fs.mkdirSync(cfg, { recursive: true });
  ecrire(data, 'espaces.json', J({
    vivantqwzx: { t: VIVANT, nom: 'Vivante', email: 'vivante.qwxy@exemple-zz.fr' },
    codeurqwzx: { code: b64({ t: CODEUR, k: 'cle-qwxy' }), nom: 'Codée' },
    [PAR_SLUG]: { nom: 'Sans t' },
  }));
  ecrire(data, 'entreprises-fermees.json', J({ emails: ['ancien.qwxy@exemple-zz.fr'], espaces: ['autre-ferme-qwzx'], suspendus: [t, VIVANT], suspendusLe: { [t]: 111, [VIVANT]: 222 }, extra: { garde: 1 } }), 0o640);
  const cnx = (login) => [{ ts: 3, login, ev: 'ok', nom: 'Zorglub Qwxy' }, { ts: 2, login, ev: 'ok' }, { ts: 1, login: 'salarie-qwxy-deux', ev: 'echec' }];
  ecrire(data, 'connexions.json', J({ [t]: cnx('salarie-qwxy-un'), [VIVANT]: cnx('vivant-login-zz') }));
  ecrire(data, 'subscriptions.json', J({
    'https://push.exemple-zz.fr/ep-qwxy-un': { sub: { endpoint: 'x' }, teamId: t, userName: 'Plumeau Zqxw' },
    'https://push.exemple-zz.fr/ep-qwxy-deux': { sub: { endpoint: 'y' }, teamId: t, userId: 'salarie-qwxy-un' },
    'https://push.exemple-zz.fr/ep-qwxy-trois': { sub: { endpoint: 'z' }, teamId: t },
    'https://push.exemple-zz.fr/ep-vivant-un': { sub: { endpoint: 'v1' }, teamId: VIVANT },
    'https://push.exemple-zz.fr/ep-vivant-deux': { sub: { endpoint: 'v2' }, teamId: VIVANT },
  }));
  ecrire(data, 'usage.json', J({ [t]: { total: 9 }, [VIVANT]: { total: 4 } }));
  ecrire(data, 'ordres.json', J({ [t]: [{ type: 'x' }], [VIVANT]: [{ type: 'y' }] }));
  ecrire(data, 'acces.json', J({ [t]: { code: 'h-qwxy' }, [VIVANT]: { code: 'h-vivant' } }));
  ecrire(data, 'comptes.json', J({ [t]: { c: { 'salarie-qwxy-un': { h: 'x' } } }, [VIVANT]: { c: { 'vivant-login-zz': { h: 'y' } } } }));
  ecrire(data, 'devis-acces.json', J({ [t]: { actif: true }, [VIVANT]: { actif: true } }));
  ecrire(data, 'mailboxes.json', J({
    mb1: { id: 'mb1', teamId: t, email: 'boite.qwxy@exemple-zz.fr', passScelle: 'passe-scelle-qwxy-orphelin' },
    mb2: { id: 'mb2', teamId: VIVANT, email: 'boite-vivante@exemple-zz.fr', passScelle: 'v1:scelle-vivant' },
    mb3: { id: 'mb3', teamId: t, email: 'seconde.qwxy@exemple-zz.fr', pass: '' },
  }), 0o600);
  ecrire(data, path.join('sauvegardes', t, '1700000000000.json'), 'copie orphelin'); ecrire(data, path.join('sauvegardes', t, '1700000000001.json'), 'copie orphelin 2');
  ecrire(data, path.join('sauvegardes', VIVANT, '1700000000000.json'), 'copie vivant');
  ecrire(data, path.join('pieces', t, 'a'.repeat(64) + '.bin'), 'piece'); ecrire(data, path.join('pieces', VIVANT, 'b'.repeat(64) + '.bin'), 'piece vivante');
  for (const x of [t, VIVANT]) for (const suf of ['base.db', 'base.db-wal', 'base.db-shm']) ecrire(data, path.join('socle', x, suf), 'octets-' + x + '-' + suf);
  /* bugs.jsonl : des lignes de l'orphelin au milieu, une ligne qui n'est pas du JSON, un accent, un CRLF, et une dernière ligne SANS saut de ligne */
  const bugs = [
    J({ team: VIVANT, msg: 'vivant un' }) + '\n', J({ team: t, msg: 'bug-qwxy-message' }) + '\n', 'ceci n\'est pas du JSON — é\n',
    J({ team: t, msg: 'bug-qwxy-message 2' }) + '\n', J({ team: VIVANT, msg: 'accentué éèà' }) + '\r\n', '\n', J({ team: 'autre-qwzx', msg: 'sans saut final' }),
  ];
  ecrire(data, 'bugs.jsonl', bugs.join(''));
  ecrire(data, 'replies.jsonl', J({ teamId: t, x: 1 }) + '\n' + J({ teamId: VIVANT, x: 2 }) + '\n');
  ecrire(data, 'sentmap.jsonl', J({ teamId: t, x: 1 }) + '\n');
  /* monitor.json, à côté de la configuration : des incidents à une, deux et aucune entreprise, nommés avec accent/casse/espaces */
  const ent = (nom) => ({ nom, email: 'zorglub.qwxy@exemple-zz.fr', count: 2, lastTs: 5, gens: [{ login: 'salarie-qwxy-un', nom: 'Zorglub Qwxy', count: 1 }] });
  ecrire(cfg, 'monitor.json', J({
    issues: [
      { id: 'i1', count: 5, entreprises: [ent('  Élan ')] },
      { id: 'i2', count: 7, entreprises: [ent('ÉLAN'), ent('Autre Société'), ent('elan gestion')] },
      { id: 'i3', count: 1, entreprises: [ent('Autre Société')] },
      { id: 'i4', count: 1, entreprises: [] },
    ],
    archive: [{ id: 'a1', entreprises: [ent('elan')] }, { id: 'a2', entreprises: [ent('elan'), ent('Autre Société')] }],
    journal: [{ ts: 1, qui: 'justin', ok: true, appareil: 'PC · Chrome', motif: '' }],
    users: [{ id: 'u1', nom: 'Justin' }], actions: [{ ts: 1, qui: 'justin', geste: 'a fait un geste', cible: 'x' }],
  }), 0o600);
  return { base, data, cfg, config: path.join(cfg, 'config.json') };
}

/* L'empreinte d'un arbre : chemin, taille, droits, contenu — tout ce qui peut changer. */
function empreinte(...racines) {
  const sortie = [];
  const marcher = (d, rel) => { for (const e of fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
    const p = path.join(d, e.name), r = rel + '/' + e.name;
    if (e.isDirectory()) { sortie.push(r + '/'); marcher(p, r); } else { const st = fs.statSync(p); sortie.push(r + ' ' + st.size + ' ' + (st.mode & 0o777).toString(8) + ' ' + sha(fs.readFileSync(p))); }
  } };
  racines.forEach((r, i) => marcher(r, 'r' + i));
  return sortie.join('\n');
}
const lire = (d, f) => JSON.parse(fs.readFileSync(path.join(d, f), 'utf8'));

/* ── le faux systemctl : il répond ce que dit le fichier `etat` du banc ── */
const BIN = path.join(banc, 'bin'), VIDE = path.join(banc, 'vide'), ETAT = path.join(banc, 'etat-service');
fs.mkdirSync(BIN); fs.mkdirSync(VIDE);
fs.writeFileSync(path.join(BIN, 'systemctl'), '#!/bin/sh\nif [ "$1" = "is-active" ]; then cat "' + ETAT + '"; [ "$(cat "' + ETAT + '")" = "active" ] && exit 0; exit 3; fi\nexit 1\n', { mode: 0o755 });
const service = (s) => fs.writeFileSync(ETAT, s);
service('inactive');

/* ── le crochet : tout ce que l'outil ouvre en écriture ou renomme ── */
const JOURNAL_FS = path.join(banc, 'crochet.json');
fs.writeFileSync(path.join(banc, 'crochet.js'), `
const fs = require('fs'); const LOG = []; const out = ${JSON.stringify(JOURNAL_FS)};
const note = (o) => { LOG.push(o); try { fs.writeFileSync.__orig(out, JSON.stringify(LOG)); } catch (e) {} };
const ecr = (fl) => /^(w|a|r\\+)/.test(String(fl || 'r'));
for (const n of ['writeFileSync', 'appendFileSync']) { const o = fs[n]; const w = function (p, ...r) { if (String(p) !== out) note({ op: n, p: String(p) }); return o.call(this, p, ...r); }; w.__orig = o; fs[n] = w; if (n === 'writeFileSync') fs.writeFileSync.__orig = o; }
{ const o = fs.openSync; fs.openSync = function (p, fl, ...r) { if (ecr(fl)) note({ op: 'open', p: String(p), fl: String(fl) }); return o.call(this, p, fl, ...r); }; }
{ const o = fs.renameSync; fs.renameSync = function (a, b) { note({ op: 'rename', de: String(a), vers: String(b) }); return o.call(this, a, b); }; }
{ const o = fs.copyFileSync; fs.copyFileSync = function (a, b, ...r) { note({ op: 'copy', p: String(b) }); return o.call(this, a, b, ...r); }; }
{ const o = fs.createWriteStream; fs.createWriteStream = function (p, ...r) { note({ op: 'stream', p: String(p) }); return o.call(this, p, ...r); }; }
{ const o = fs.rmSync; fs.rmSync = function (p, ...r) { note({ op: 'rm', p: String(p) }); return o.call(this, p, ...r); }; }
{ const o = fs.truncateSync; fs.truncateSync = function (p, ...r) { note({ op: 'truncate', p: String(p) }); return o.call(this, p, ...r); }; }
`);

const SORTIES = [];   // tout ce que l'outil a imprimé, pour chercher les secrets semés
function lancer(env, args, opt) {
  opt = opt || {};
  const e = Object.assign({}, process.env, { TEAMOP_DATA: env.data, TEAMOP_CONFIG: env.config, PATH: (opt.sansSystemctl ? VIDE : BIN) + ':' + (opt.sansSystemctl ? '/nulle-part' : process.env.PATH) });
  if (opt.crochet) { try { fs.unlinkSync(JOURNAL_FS); } catch (x) {} e.NODE_OPTIONS = '--require=' + path.join(banc, 'crochet.js'); }
  const r = cp.spawnSync(process.execPath, [OUTIL].concat(args), { env: e, encoding: 'utf8', timeout: 60000 });
  const texte = (r.stdout || '') + '\n' + (r.stderr || '');
  if (process.env.BANC_MONTRER) console.log('--- ' + args.join(' ') + ' → code ' + r.status + '\n' + texte);
  SORTIES.push(texte);
  return { code: r.status, texte, crochet: opt.crochet ? (() => { try { return JSON.parse(fs.readFileSync(JOURNAL_FS, 'utf8')); } catch (x) { return []; } })() : null };
}

/* ── l'annuaire du socle (SQLite), semé et relu par de VRAIS processus — le banc ne garde aucune connexion ouverte ── */
function sqliteAnnuaire(data, code) {
  const r = cp.spawnSync(process.execPath, ['-e', code], { env: Object.assign({}, process.env, { TEAMOP_DATA: data }), encoding: 'utf8', timeout: 30000 });
  if (r.status !== 0) throw new Error('sqlite : ' + (r.stderr || '').slice(0, 200));
  return (r.stdout || '').trim();
}
const SEMER_SQL = (t) => `
process.emitWarning = () => {};
const s = require(${JSON.stringify(path.join(RACINE, 'server', 'socle.js'))}); const db = s.annuaire();
for (const x of [${JSON.stringify(t)}, ${JSON.stringify(VIVANT)}]) {
  db.prepare('INSERT INTO entreprise (t,dek,cree_le) VALUES (?,?,?)').run(x, Buffer.from('dek'), 1);
  for (const a of ['ap1','ap2']) db.prepare('INSERT INTO appareil (t,app_id,jeton_sha,exp,cree_le) VALUES (?,?,?,?,?)').run(x, a, 'sha', 9, 1);
}
db.close();`;
const LIRE_SQL = (t) => `
process.emitWarning = () => {};
const { DatabaseSync } = require('node:sqlite'); const db = new DatabaseSync(require('path').join(process.env.TEAMOP_DATA, 'socle-annuaire.db'), { readOnly: true });
const c = (x, tab) => db.prepare('SELECT COUNT(*) AS n FROM ' + tab + ' WHERE t=?').get(x).n;
console.log(JSON.stringify({ e: c(${JSON.stringify(t)}, 'entreprise'), a: c(${JSON.stringify(t)}, 'appareil'), ev: c(${JSON.stringify(VIVANT)}, 'entreprise'), av: c(${JSON.stringify(VIVANT)}, 'appareil') }));`;

(async () => {
  /* ═══ 0. POPULATION : les semences existent, avant de croire un seul zéro ═══ */
  const A = fabriquer('a', T);
  sqliteAnnuaire(A.data, SEMER_SQL(T));
  const tout = [A.data, A.cfg].map(d => { const out = []; const m = (x) => { for (const e of fs.readdirSync(x, { withFileTypes: true })) e.isDirectory() ? m(path.join(x, e.name)) : out.push(fs.readFileSync(path.join(x, e.name), 'latin1')); }; m(d); return out.join('\n'); }).join('\n');
  vrai('population : chaque jeton semé existe dans les fichiers (' + SEMES.length + ' jetons) — un zéro « absent de la sortie » ne vaudra pas sur du vide', SEMES.every(s => tout.includes(s)));
  v('population : l\'annuaire du socle porte 2 entreprises et 4 appareils (l\'orphelin ET le vivant)', JSON.parse(sqliteAnnuaire(A.data, LIRE_SQL(T))), { e: 1, a: 2, ev: 1, av: 2 });
  const avant = empreinte(A.data, A.cfg);

  /* ═══ 1. LE CONSTAT NE CHANGE RIEN ═══ */
  const c1 = lancer(A, [T, '--nom', 'ELAN']);
  v('constat : code 0', c1.code, 0);
  v('⛔ constat : AUCUN fichier ni dossier ne change (empreinte de tout l\'arbre, droits compris)', empreinte(A.data, A.cfg), avant);
  vrai('constat : il dit CONSTAT, que rien n\'est modifié, et ce qu\'il trouverait (3 abonnements sur 5, 2 boîtes sur 3, 2 lignes de bugs sur 6)', /CONSTAT/.test(c1.texte) && /3 abonnement\(s\) sur 5/.test(c1.texte) && /2 boîte\(s\) sur 3/.test(c1.texte) && /2 ligne\(s\) sur 6/.test(c1.texte));
  vrai('constat : il compte les lignes de replies.jsonl / sentmap.jsonl qu\'il ne touche pas', /replies\.jsonl : 1 ligne\(s\)/.test(c1.texte) && /sentmap\.jsonl : 1 ligne\(s\)/.test(c1.texte) && /NON touchées/.test(c1.texte));
  vrai('constat : il annonce la mémoire du service et la nécessité de l\'arrêter (systemctl stop/start)', /en mémoire/.test(c1.texte) && /systemctl start teamop-api/.test(c1.texte));
  vrai('constat sans --nom : il dit que les incidents ne sont PAS touchés', /NON touchés \(pas de --nom/.test(lancer(A, [T]).texte));
  const c1b = lancer(A, [T], { sansSystemctl: true });
  vrai('constat sans systemctl : code 0, et il le DIT (service considéré arrêté)', c1b.code === 0 && /systemctl introuvable/.test(c1b.texte));
  service('active');
  const c1c = lancer(A, [T]);
  vrai('⛔ constat avec le service ACTIF : il lit sans condition (code 0) et le dit', c1c.code === 0 && /ACTIF/.test(c1c.texte));
  service('inactive');
  v('constat : toujours rien de changé après les quatre lectures', empreinte(A.data, A.cfg), avant);

  /* ═══ 2. UN ESPACE VIVANT, UN IDENTIFIANT MAL FORMÉ : CODE 2, RIEN NE CHANGE ═══ */
  for (const [nom, t] of [['le champ t', VIVANT], ['le t porté par le code', CODEUR], ['le slug', PAR_SLUG]]) {
    const r = lancer(A, [t, '--faire']);
    v('⛔ --faire sur un espace vivant (' + nom + ') : code 2', r.code, 2);
    vrai('…le message dit qu\'il est dans l\'annuaire et renvoie à la Tour', /dans l'annuaire/.test(r.texte) && /Tour/.test(r.texte));
    v('…rien ne change', empreinte(A.data, A.cfg), avant);
    v('…le constat sur lui est refusé aussi (code 2)', lancer(A, [t]).code, 2);
  }
  for (const t of ['', '../etc', 'a b', 'x'.repeat(65), '-abc', 'a/b', '_zz', 'é-accent']) {
    const r = lancer(A, [t, '--faire']);
    v('⛔ identifiant mal formé « ' + t.slice(0, 12) + ' » : code 2', r.code, 2);
  }
  v('sans identifiant : code 2', lancer(A, ['--faire']).code, 2);
  v('deux identifiants : code 2', lancer(A, [T, 'autre-qwzx', '--faire']).code, 2);
  v('option inconnue : code 2', lancer(A, [T, '--efface-tout']).code, 2);
  v('--nom vide : code 2', lancer(A, [T, '--nom', '  ', '--faire']).code, 2);
  v('la bêta vivante (opgestion-beta) : code 2', lancer(A, ['opgestion-beta', '--faire']).code, 2);
  v('…rien ne change (mal formés, options, bêta vivante)', empreinte(A.data, A.cfg), avant);

  /* ═══ 3. LE SERVICE ACTIF : CODE 3 ; UN FICHIER ILLISIBLE : CODE 4 — SANS ÉCRIRE ═══ */
  for (const etat of ['active', 'activating']) {
    service(etat);
    const r = lancer(A, [T, '--faire', '--nom', 'ELAN'], { crochet: true });
    v('⛔ --faire avec le service « ' + etat + ' » : code 3', r.code, 3);
    vrai('…le message donne les deux commandes (stop avant, start après)', /systemctl stop teamop-api/.test(r.texte) && /systemctl start teamop-api/.test(r.texte));
    v('…aucune écriture : ni ouverture en écriture ni renommage (crochet)', r.crochet.length, 0);
    v('…et rien ne change', empreinte(A.data, A.cfg), avant);
  }
  service('inactive');
  {
    const R = fabriquer('r', T);
    ecrire(R.data, 'usage.json', 'zorglub.qwxy@exemple-zz.fr');
    const av = empreinte(R.data, R.cfg);
    const r = lancer(R, [T, '--faire']);
    v('⛔ --faire avec un registre illisible (usage.json) : code 4', r.code, 4);
    vrai('…il nomme le fichier, sans en citer le contenu', /usage\.json/.test(r.texte) && !/zorglub/.test(r.texte));
    v('…RIEN n\'est écrit, même pas le blocage (tout est lu avant la première écriture)', empreinte(R.data, R.cfg), av);
    const R2 = fabriquer('r2', T); fs.unlinkSync(path.join(R2.data, 'espaces.json'));
    v('⛔ --faire sans espaces.json (TEAMOP_DATA mal pointé ?) : code 4', lancer(R2, [T, '--faire']).code, 4);
    const R3 = fabriquer('r3', T); ecrire(R3.data, 'espaces.json', 'pas du json');
    v('annuaire illisible : code 4, en constat aussi (on ne peut pas dire que c\'est un orphelin)', lancer(R3, [T]).code, 4);
    const R4 = fabriquer('r4', T); ecrire(R4.cfg, 'monitor.json', '[1,2');
    const av4 = empreinte(R4.data, R4.cfg);
    v('monitor.json illisible : code 4 et rien d\'écrit', [lancer(R4, [T, '--faire']).code, empreinte(R4.data, R4.cfg)], [4, av4]);
  }

  /* ═══ 4. --faire SUR L'ORPHELIN ═══ */
  const seed = {};
  for (const f of ['connexions.json', 'subscriptions.json', 'usage.json', 'ordres.json', 'acces.json', 'comptes.json', 'devis-acces.json', 'mailboxes.json', 'entreprises-fermees.json', 'espaces.json']) seed[f] = lire(A.data, f);
  const bugsAvant = fs.readFileSync(path.join(A.data, 'bugs.jsonl'));
  const monAvant = lire(A.cfg, 'monitor.json');
  const repliesAvant = fs.readFileSync(path.join(A.data, 'replies.jsonl')), sentAvant = fs.readFileSync(path.join(A.data, 'sentmap.jsonl'));
  const modes = {}; for (const f of ['entreprises-fermees.json', 'mailboxes.json', 'connexions.json']) modes[f] = fs.statSync(path.join(A.data, f)).mode & 0o777;
  const vivAvant = empreinte(path.join(A.data, 'sauvegardes', VIVANT), path.join(A.data, 'pieces', VIVANT), path.join(A.data, 'socle', VIVANT));

  const r = lancer(A, [T, '--faire', '--nom', 'ELAN', '--nom=Élan Gestion'], { crochet: true });
  v('--faire sur l\'orphelin : code 0', r.code, 0);
  vrai('…il dit FAIT et qu\'il faut redémarrer le service', /FAIT/.test(r.texte) && /systemctl start teamop-api/.test(r.texte));

  const apres = (f) => lire(A.data, f);
  v('(a) entreprises-fermees.json : le blocage est posé, l\'ancien est gardé', apres('entreprises-fermees.json').espaces, ['autre-ferme-qwzx', T]);
  v('(a) …la suspension de l\'orphelin est retirée (liste ET date), celle du vivant reste', [apres('entreprises-fermees.json').suspendus, apres('entreprises-fermees.json').suspendusLe], [[VIVANT], { [VIVANT]: 222 }]);
  v('(a) …les e-mails et les autres clés sont intacts', [apres('entreprises-fermees.json').emails, apres('entreprises-fermees.json').extra], [seed['entreprises-fermees.json'].emails, { garde: 1 }]);
  const sans = (o, k) => { const c = Object.assign({}, o); delete c[k]; return c; };
  for (const f of ['connexions.json', 'usage.json', 'ordres.json', 'acces.json', 'comptes.json', 'devis-acces.json'])
    v('(b) ' + f + ' : plus que le vivant, et lui exactement comme avant', apres(f), sans(seed[f], T));
  v('(b) subscriptions.json : les 3 abonnements de l\'orphelin partis, les 2 du vivant intacts', apres('subscriptions.json'), Object.fromEntries(Object.entries(seed['subscriptions.json']).filter(([, x]) => x.teamId === VIVANT)));
  v('(b) mailboxes.json : les 2 boîtes de l\'orphelin parties, celle du vivant intacte (mot de passe scellé inchangé)', apres('mailboxes.json'), { mb2: seed['mailboxes.json'].mb2 });
  v('(b) espaces.json (l\'annuaire) : pas touché', apres('espaces.json'), seed['espaces.json']);
  vrai('(c) sauvegardes/<t>, pieces/<t> et socle/<t> n\'existent plus', ['sauvegardes', 'pieces', 'socle'].every(d => !fs.existsSync(path.join(A.data, d, T))));
  v('(c) …ceux du vivant sont intacts (octet pour octet)', empreinte(path.join(A.data, 'sauvegardes', VIVANT), path.join(A.data, 'pieces', VIVANT), path.join(A.data, 'socle', VIVANT)), vivAvant);
  v('(c) l\'annuaire du socle : plus aucune ligne de l\'orphelin, celles du vivant (1 entreprise, 2 appareils) intactes', JSON.parse(sqliteAnnuaire(A.data, LIRE_SQL(T))), { e: 0, a: 0, ev: 1, av: 2 });
  /* bugs.jsonl : on reconstruit ce qui DOIT rester, enregistrement par enregistrement, depuis les octets d'origine */
  const attendu = []; { let d = 0; while (d < bugsAvant.length) { let i = bugsAvant.indexOf(10, d); const fin = i < 0 ? bugsAvant.length : i + 1; const rec = bugsAvant.subarray(d, fin); d = fin; let o = null; try { o = JSON.parse(rec.toString('utf8')); } catch (x) {} if (!(o && o.team === T)) attendu.push(rec); } }
  vrai('(d) population : 2 lignes de l\'orphelin ET des lignes qui doivent rester (JSON, non-JSON, CRLF, ligne vide, dernière sans saut)', attendu.length === 5 && bugsAvant.length > Buffer.concat(attendu).length);
  vrai('(d) ⛔ bugs.jsonl : les lignes des autres sont INTACTES octet pour octet (non-JSON, accents, CRLF, ligne vide, dernière ligne sans saut de ligne compris)', Buffer.compare(fs.readFileSync(path.join(A.data, 'bugs.jsonl')), Buffer.concat(attendu)) === 0);
  vrai('replies.jsonl et sentmap.jsonl : non touchés', Buffer.compare(fs.readFileSync(path.join(A.data, 'replies.jsonl')), repliesAvant) === 0 && Buffer.compare(fs.readFileSync(path.join(A.data, 'sentmap.jsonl')), sentAvant) === 0);
  /* monitor.json */
  const mon = lire(A.cfg, 'monitor.json');
  v('(e) incidents : i1 (ELAN seule) supprimé ; i2 garde « Autre Société » ; i3 et i4 (aucune entreprise au départ) intacts', mon.issues.map(i => [i.id, i.entreprises.map(e => e.nom)]), [['i2', ['Autre Société']], ['i3', ['Autre Société']], ['i4', []]]);
  v('(e) archive : a1 supprimé, a2 garde « Autre Société »', mon.archive.map(i => [i.id, i.entreprises.map(e => e.nom)]), [['a2', ['Autre Société']]]);
  v('(e) l\'entreprise qui reste est exactement comme avant', mon.issues[0].entreprises[0], monAvant.issues[1].entreprises[1]);
  v('(e) users : intacts', mon.users, monAvant.users);
  v('(e) journal : +1 ligne, par l\'outil, sans donnée', [mon.journal.length, (mon.journal[1] || {}).qui, (mon.journal[1] || {}).ok, (mon.journal[1] || {}).motif], [2, 'outil nettoyer-espace-orphelin', true, 'espace orphelin nettoyé']);
  vrai('(e) …cette ligne ne contient aucune adresse, aucun jeton semé', mon.journal.length === 2 && !/@/.test(JSON.stringify(mon.journal[1])) && SEMES.every(s => !JSON.stringify(mon.journal[1]).includes(s)));
  v('(e) actions (le Journal de la Tour) : +1 geste, l\'ancien intact', [mon.actions.length, mon.actions[0], (mon.actions[1] || {}).qui], [2, monAvant.actions[0], 'outil nettoyer-espace-orphelin']);
  vrai('droits conservés (640 / 600 / 644…) et aucun temporaire laissé', Object.entries(modes).every(([f, m]) => (fs.statSync(path.join(A.data, f)).mode & 0o777) === m)
    && [A.data, A.cfg].every(d => !fs.readdirSync(d).some(x => /\.tmp$/.test(x))) && (fs.statSync(path.join(A.cfg, 'monitor.json')).mode & 0o777) === 0o600);

  /* ═══ 5. ATOMICITÉ : TEMPORAIRE DU MÊME DOSSIER, PUIS RENOMMAGE — VU PAR LE CROCHET ═══ */
  const finals = ['entreprises-fermees.json', 'connexions.json', 'subscriptions.json', 'usage.json', 'ordres.json', 'acces.json', 'comptes.json', 'devis-acces.json', 'mailboxes.json', 'bugs.jsonl'].map(f => path.join(A.data, f)).concat([path.join(A.cfg, 'monitor.json')]);
  const renames = r.crochet.filter(x => x.op === 'rename');
  vrai('population : le crochet a vu des opérations (' + r.crochet.length + ') dont ' + renames.length + ' renommages', r.crochet.length > 0 && renames.length >= finals.length);
  v('⛔ chacun des ' + finals.length + ' fichiers modifiés est atteint par EXACTEMENT un renommage, depuis un temporaire de son propre dossier', finals.map(p => renames.filter(x => x.vers === p && path.dirname(x.de) === path.dirname(p) && /\.tmp$/.test(x.de)).length), finals.map(() => 1));
  v('⛔ aucun fichier final n\'est jamais ouvert ni écrit EN PLACE', r.crochet.filter(x => x.op !== 'rename' && finals.includes(x.p)).length, 0);
  v('…toute écriture passe par un temporaire (nom en .tmp)', r.crochet.filter(x => x.op !== 'rename' && x.op !== 'rm' && !/\.tmp$/.test(x.p)).map(x => x.p), []);

  /* l'ORDRE : le blocage d'abord (comme la route de suppression), puis les registres, puis les dossiers, puis bugs.jsonl, le journal en dernier */
  {
    const nomDe = (p) => path.basename(p);
    const seq = r.crochet.filter(x => x.op === 'rename' || x.op === 'rm').map(x => x.op === 'rm' ? 'rm:' + path.basename(x.p) : 'mv:' + nomDe(x.vers));
    const idx = (n) => seq.indexOf(n);
    const registres = ['connexions.json', 'usage.json', 'ordres.json', 'acces.json', 'comptes.json', 'devis-acces.json', 'subscriptions.json', 'mailboxes.json'].map(f => idx('mv:' + f));
    vrai('population : ' + seq.length + ' étapes d\'écriture vues dans l\'ordre, dont le blocage, 8 registres, des dossiers, bugs.jsonl, monitor.json', seq.length >= 14 && idx('mv:entreprises-fermees.json') >= 0 && registres.every(i => i >= 0) && idx('rm:' + T) >= 0 && idx('mv:bugs.jsonl') >= 0 && idx('mv:monitor.json') >= 0);
    v('⛔ le BLOCAGE est la toute première écriture (avant tout registre, tout dossier)', idx('mv:entreprises-fermees.json'), 0);
    vrai('…les registres avant les dossiers, les dossiers avant bugs.jsonl, le journal de monitor.json en tout dernier', Math.max(...registres) < Math.min(...seq.map((x, i) => x.startsWith('rm:') ? i : 1e9)) && Math.max(...seq.map((x, i) => x.startsWith('rm:') ? i : -1)) < idx('mv:bugs.jsonl') && idx('mv:monitor.json') === seq.length - 1);
  }

  /* ═══ 6. LA SORTIE : DES NOMBRES, JAMAIS UNE ADRESSE NI UN NOM ═══ */
  const toutes = SORTIES.join('\n');
  vrai('population : l\'outil a imprimé ' + SORTIES.length + ' sorties, ' + toutes.length + ' caractères — un « rien trouvé » ne vaut pas sur du vide', SORTIES.length >= 25 && toutes.length > 3000);
  v('⛔ AUCUN des ' + SEMES.length + ' jetons semés (adresses, identifiants de salariés, noms, endpoints, mot de passe scellé) n\'apparaît dans ce qu\'il imprime', SEMES.filter(s => toutes.includes(s)), []);
  vrai('…ni aucune adresse e-mail quelconque', !/[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(toutes));

  /* ═══ 7. IDEMPOTENCE ET « RIEN TROUVÉ » ═══ */
  const apres1 = empreinte(A.data, A.cfg);
  const r2 = lancer(A, [T, '--faire', '--nom', 'ELAN']);
  v('relancer --faire sur l\'orphelin déjà nettoyé : code 0, « aucune trace », rien ne change', [r2.code, /Aucune trace/.test(r2.texte), empreinte(A.data, A.cfg)], [0, true, apres1]);
  const B = fabriquer('b', T); const avB = empreinte(B.data, B.cfg);
  const r3 = lancer(B, ['inconnu-qwzx', '--faire']);
  v('un identifiant sans aucune trace : code 0, rien écrit (pas même un blocage dans entreprises-fermees.json)', [r3.code, /Aucune trace/.test(r3.texte), empreinte(B.data, B.cfg)], [0, true, avB]);

  /* ═══ 8. SANS --nom : LES INCIDENTS NE BOUGENT PAS, LE JOURNAL SI ═══ */
  {
    const r4 = lancer(B, [T, '--faire']);
    v('--faire sans --nom : code 0', r4.code, 0);
    const m = lire(B.cfg, 'monitor.json'), m0 = fabriquerMonitorSeul();
    v('…les incidents et l\'archive sont exactement ceux d\'avant', [m.issues, m.archive], [m0.issues, m0.archive]);
    v('…le journal prend quand même sa ligne', m.journal.length, 2);
  }
  function fabriquerMonitorSeul() { return lire(fabriquer('ref', T).cfg, 'monitor.json'); }

  /* ═══ 9. SANS systemctl (machine de test) : il agit, et le dit ═══ */
  {
    const C = fabriquer('c', T);
    const r5 = lancer(C, [T, '--faire'], { sansSystemctl: true });
    vrai('sans systemctl : --faire agit (code 0) en disant que le service est considéré arrêté', r5.code === 0 && /systemctl introuvable/.test(r5.texte) && !fs.existsSync(path.join(C.data, 'sauvegardes', T)));
  }

  /* ═══ 10. LES ESPACES TECHNIQUES : PAS DE BLOCAGE SANS --bloquer ═══ */
  for (const tech of ['elan-gestion', 'elan-gestion-beta']) {
    const D = fabriquer('d-' + tech, tech);
    const f0 = fs.readFileSync(path.join(D.data, 'entreprises-fermees.json'));
    const r6 = lancer(D, [tech, '--faire']);
    const f1 = lire(D.data, 'entreprises-fermees.json');
    v(tech + ' : nettoyé (code 0), connexions et abonnements partis', [r6.code, tech in lire(D.data, 'connexions.json'), Object.values(lire(D.data, 'subscriptions.json')).some(x => x.teamId === tech)], [0, false, false]);
    v('⛔ ' + tech + ' : le blocage n\'est PAS posé tout seul (fermer le repli vide les appareils qui s\'y connectent) — entreprises-fermees.json intact', Buffer.compare(fs.readFileSync(path.join(D.data, 'entreprises-fermees.json')), f0) === 0 && !f1.espaces.includes(tech), true);
    vrai('…et la sortie le dit', /blocage NON posé/.test(r6.texte));
    const E = fabriquer('e-' + tech, tech);
    lancer(E, [tech, '--faire', '--bloquer']);
    vrai(tech + ' --bloquer : le blocage est posé', lire(E.data, 'entreprises-fermees.json').espaces.includes(tech));
  }
  {
    const F = fabriquer('f', T); lancer(F, [T, '--faire', '--bloquer']);
    v('--bloquer sur un orphelin ordinaire : le blocage est posé UNE fois', lire(F.data, 'entreprises-fermees.json').espaces.filter(x => x === T).length, 1);
    const G = fabriquer('g', T); fs.unlinkSync(path.join(G.data, 'entreprises-fermees.json'));
    lancer(G, [T, '--faire']);
    v('entreprises-fermees.json absent : il est créé, avec le blocage', lire(G.data, 'entreprises-fermees.json').espaces, [T]);
  }
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }).finally(() => { if (process.exitCode) ko++; console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); });
