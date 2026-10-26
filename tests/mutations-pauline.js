/* LES MUTATIONS DU PONT DE PAULINE (25 octobre 2026) — « un banc qui passe ne prouve rien tant qu'on ne l'a pas vu ÉCHOUER ».
   Pour chaque mutation : on remet UN défaut (ou une garde retirée) dans le fichier réel, on joue le banc, on restaure l'octet près.
     node tests/mutations-pauline.js [M3 M7 …]       toutes, ou celles qu'on nomme
   ⛔ À lancer APRÈS `git commit` (CLAUDE.md : correctif → banc → commit → mutation → checkout). Le script refuse de partir si l'un des fichiers visés a des changements non commités,
   restaure d'après la copie qu'il a prise en mémoire ET vérifie `git diff` vide à la fin. Chaque mutation vérifie d'abord que son motif se trouve UNE fois (une mutation mal visée ne prouve rien).
   Rend, pour chaque mutation, le dernier « N ✓ M ✗ » du banc : une mutation est « attrapée » quand M > 0 (ou que le banc meurt). */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const f = (...x) => path.join(RACINE, ...x);
const PA = 'server/pauline.js', IX = 'server/index.js', AU = 'server/audience.js', PY = 'outils/pauline-releve.py', SH = 'server/set-pauline.sh';
const B3020 = 'tests/test-3020.js', B3002 = 'tests/test-3002.js';

/* [nom, description, banc, [[fichier, avant, après], …]] */
const M = [
  ['M1', 'le jeton n’est plus vérifié (tout Bearer passe)', B3020, [[PA, 'return vue.length === attendue.length && crypto.timingSafeEqual(vue, attendue);', 'return true;']]],
  ['M2', 'comparaison en texte (===) au lieu de timingSafeEqual — même comportement, le motif de code seul le voit', B3020, [[PA, 'crypto.timingSafeEqual(vue, attendue)', "vue.toString('hex') === attendue.toString('hex')"]]],
  ['M3', 'pont non configuré : plus de 503', B3020, [[PA, "if (!attendue) return res.status(503).json({ error: 'pont non configuré' });", '']]],
  ['M4', 'plus d’anti-abus', B3020, [[PA, 'if (!quotaOk(req.ip)) {', 'if (false) {']]],
  ['M5', 'anti-abus sur l’en-tête brut du client au lieu de req.ip', B3020, [[PA, 'quotaOk(req.ip)', "quotaOk(req.headers['x-forwarded-for'])"]]],
  ['M6', 'le corps est lu AVANT le jeton', B3020, [[PA, "app.post('/api/pauline/releve', (req, res, next) => {", "app.post('/api/pauline/releve', json, (req, res, next) => {"], [PA, '}, json, (req, res) => {', '}, (req, res) => {']]],
  ['M7', 'plafond du corps de la route : 8 Mo au lieu de 2', B3020, [[PA, "const CORPS_MAX = '2mb';", "const CORPS_MAX = '8mb';"]]],
  ['M8', 'la route n’est plus écartée du plafond global de 6 Mo (index.js)', B3020, [[IX, ' || CHEMIN_PAULINE.test(req.path)) ? next() : jsonCourant', ') ? next() : jsonCourant']]],
  ['M9', 'plus de plafond sur les listes', B3020, [[PA, 'if (l.length > MAX[k]) { ecartes.tronque.push(k); return l.slice(0, MAX[k]); } return l;', 'return l;']]],
  ['M10', 'plus d’élagage à 90 jours', B3020, [[PA, 'const limite = maintenant - GARDE_JOURS * 86400000;', 'const limite = 0;']]],
  ['M11', 'la lecture de la Tour n’est plus réservée au patron', B3020, [[PA, "app.get('/api/monitor/pauline', monPatronStrict,", "app.get('/api/monitor/pauline', (req, res, next) => next(),"]]],
  ['M12', 'la clé maître est ignorée : fichier en clair', B3020, [[PA, 'return k ? Buffer.from(crypto.hkdfSync', 'return false ? Buffer.from(crypto.hkdfSync']]],
  ['M13', 'le journal cite les noms d’entreprises reçus', B3020, [[PA, 'try { ranger(releve); }', "try { ranger(releve); console.log('pauline : relevé de ' + releve.entreprises.map(e => e.nom).join(',')); }"]]],
  ['M14', 'les clés inconnues d’une entreprise passent', B3020, [[PA, 'const o = { id, nom, ville, metier, etat: e.etat, majLe };', 'const o = Object.assign({}, e, { id, nom, ville, metier, etat: e.etat, majLe });']]],
  ['M15', 'le motif d’un refus cite la valeur du corps', B3020, [[PA, "return { ok: false, motif: 'genereLe absent ou illisible' };", "return { ok: false, motif: 'genereLe absent ou illisible : ' + corps.genereLe };"]]],
  ['M16', 'le fichier n’est plus aux droits 600', B3020, [[PA, 'fs.openSync(tmp, \'w\', 0o600);', "fs.openSync(tmp, 'w', 0o644);"], [PA, 'try { fs.chmodSync(chemin, 0o600); } catch (e) {}', '']]],
  ['M17', 'une écriture refusée répond 200', B3020, [[PA, "return res.status(500).json({ error: 'relevé non écrit' });", '']]],
  ['M18', 'une empreinte mal formée est acceptée telle quelle', B3020, [[PA, "/^[0-9a-fA-F]{64}$/.test(v.trim())", 'typeof v === \'string\'']]],
  ['M19', 'Pauline retirée de la liste fermée de l’audience', B3002, [[AU, ", pauline: 'Pauline' };", ' };']]],
  ['M20', 'la date de réception n’est plus liée au chiffré (AAD)', B3020, [[PA, "const aad = recuLe => 'pauline-releve|v1|' + recuLe;", "const aad = recuLe => 'pauline-releve|v1|';"]]],
  ['M21', 'une date du futur lointain est acceptée', B3020, [[PA, 't > maintenant + 2 * 86400000 || ', '']]],
  ['M22', 'un état d’entreprise inconnu est accepté', B3020, [[PA, '!ETATS_ENTREPRISE.includes(e.etat) || ', '']]],
  ['M23', 'un doublon d’identifiant est accepté', B3020, [[PA, '|| idsEnt.has(id) ||', '||']]],
  ['M24', 'le script ouvre la base en écriture', B3020, [[PY, '?mode=ro', '?mode=rw'], [PY, 'PRAGMA query_only = ON', 'PRAGMA query_only = OFF']]],
  ['M25', 'le script imprime le jeton lu', B3020, [[PY, 'jeton = lire_env(env).get(CLE_JETON, "").strip()', 'jeton = lire_env(env).get(CLE_JETON, "").strip(); print(jeton)']]],
  ['M26', 'le script accepte http:// partout', B3020, [[PY, 'return p.scheme == "http" and p.hostname in ("127.0.0.1", "localhost", "::1")', 'return True']]],
  ['M27', 'fabriquer-jeton imprime le jeton au lieu de son empreinte', B3020, [[PY, 'return hashlib.sha256(jeton.encode("utf-8")).hexdigest()', 'return jeton']]],
  ['M28', 'fabriquer-jeton écrase un jeton existant', B3020, [[PY, 'if deja and not remplacer:', 'if False:']]],
  ['M29', 'le jeton est écrit en 666 et jamais chmodé', B3020, [[PY, 'os.O_TRUNC, 0o600)', 'os.O_TRUNC, 0o666)'], [PY, '    os.chmod(str(chemin), 0o600)\n', '']]],
  ['M30', 'les lignes citées (« > ») restent dans le début de la réponse', B3020, [[PY, 'if not l.lstrip().startswith(">")]', 'if True]']]],
  ['M31', 'le courriel d’avant 90 jours reste dans le relevé du Mac', B3020, [[PY, 'jour_limite = limite.strftime("%Y-%m-%d")', 'jour_limite = "2000-01-01"']]],
  ['M32', 'un refus (opted_out) n’est plus un état « refus »', B3020, [[PY, 'if p["status"] == "opted_out" or p["id"] in refus_conv:', 'if p["id"] in refus_conv:']]],
  ['M33', 'un envoi reçoit une réponse du serveur 401 et le script sort quand même en 0', B3020, [[PY, 'raise Sortie(REFUS, motif', 'return OK; raise Sortie(REFUS, motif']]],
  ['M35', 'l’élagage du disque ne retire plus rien (le Mac se tait : le relevé reste pour toujours)', B3020, [[PA, 'const nu = elaguer(r.releve, t);', 'const nu = r.releve;']]],
  ['M36', 'un relevé de plus de 90 jours n’est plus effacé en entier', B3020, [[PA, 'if (t - r.recuLe > GARDE_JOURS * 86400000) {', 'if (false) {']]],
  ['M34', 'set-pauline.sh accepte n’importe quel texte comme empreinte', B3020, [[SH, "if ! echo \"$EMP\" | grep -Eq '^[0-9a-f]{64}$'; then", 'if false; then']]],
];

const choisies = process.argv.slice(2);
const liste = choisies.length ? M.filter(m => choisies.includes(m[0])) : M;
const fichiers = [...new Set(M.flatMap(m => m[3].map(x => x[0])))];
const sale = spawnSync('git', ['status', '--porcelain', '--'].concat(fichiers), { cwd: RACINE, encoding: 'utf8' }).stdout.trim();
if (sale) { console.log('⛔ des changements non commités dans les fichiers visés — commiter d’abord (un `git checkout` les emporterait) :\n' + sale); process.exit(2); }
let attrapees = 0, vivantes = [];
for (const [nom, desc, banc, edits] of liste) {
  const origine = new Map();
  try {
    for (const [fic] of edits) if (!origine.has(fic)) origine.set(fic, fs.readFileSync(f(fic), 'utf8'));
    let mal = '';
    const neuf = new Map(origine);
    for (const [fic, avant, apres] of edits) {
      const t = neuf.get(fic), n = t.split(avant).length - 1;
      if (n !== 1) { mal = 'motif trouvé ' + n + ' fois dans ' + fic + ' : ' + avant.slice(0, 60); break; }
      neuf.set(fic, t.replace(avant, () => apres));
    }
    if (mal) { console.log(nom + ' · MAL VISÉE · ' + mal); vivantes.push(nom + ' (mal visée)'); continue; }
    for (const [fic, t] of neuf) fs.writeFileSync(f(fic), t);
    const r = spawnSync('node', [f(banc)], { cwd: RACINE, encoding: 'utf8', timeout: 150000, env: Object.assign({}, process.env, { NODE_PATH: process.env.NODE_PATH || '' }) });
    const sortie = (r.stdout || '') + (r.stderr || '');
    const dernier = [...sortie.matchAll(/(\d+) ✓ +(\d+) ✗/g)].pop();
    const tombe = r.status !== 0;
    const premiers = [...sortie.matchAll(/^  ✗ (.{0,90})/gm)].slice(0, 2).map(x => x[1]).join(' | ');
    console.log(nom + ' · ' + (tombe ? 'ATTRAPÉE' : 'VIVANTE !!') + ' · ' + (dernier ? dernier[1] + ' ✓ ' + dernier[2] + ' ✗' : 'banc mort/sans total') + ' · ' + desc + (premiers ? '\n      ↳ ' + premiers : ''));
    if (tombe) attrapees++; else vivantes.push(nom);
  } finally {
    for (const [fic, t] of origine) fs.writeFileSync(f(fic), t);
  }
}
const diff = spawnSync('git', ['diff', '--stat', '--'].concat(fichiers), { cwd: RACINE, encoding: 'utf8' }).stdout.trim();
console.log('\n' + attrapees + '/' + liste.length + ' attrapées' + (vivantes.length ? ' · VIVANTES : ' + vivantes.join(', ') : '') + ' · git diff des fichiers visés : ' + (diff || 'vide'));
process.exit(vivantes.length || diff ? 1 : 0);
