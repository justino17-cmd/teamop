#!/usr/bin/env python3
"""Contre-épreuve de la RELECTURE ADVERSE d'OP MESSAGES (1er octobre 2026) : REMET chaque défaut corrigé, sur une COPIE, et exige que le
banc concerné tombe.

Mêmes garde-fous que scratchpad/mutations-deploiement-messages.py (règles de CLAUDE.md) :
  · jamais l'arbre de travail : tout se passe dans une copie (un `git checkout` effacerait un correctif non commité) ;
  · le remplacement doit se produire EXACTEMENT le nombre de fois attendu (sinon « mal visée ») ; on imprime le nombre de lignes
    qui diffèrent ;
  · une mutation « tombe » quand un banc visé sort en code ≠ 0 ou imprime au moins un ✗ ; le nombre de ✗ est affiché ;
  · le fichier muté est comparé à l'original AVANT (il doit différer) et la copie est TOUJOURS remise à l'identique après.
Un témoin (copie sans mutation) passe d'abord sur tous les bancs visés.

Usage : python3 scratchpad/mutations-relecture-messages.py [groupe|tout] [S19,P11,…]   (groupes : service, porte, install, ui ; la liste d'identifiants restreint à ces mutations)
"""
import os, re, shutil, subprocess, sys, tempfile, time

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
A_COPIER = ['tests', 'server-msg', 'server', 'scripts', '.github', 'design', '.gitignore']


def copie():
    d = tempfile.mkdtemp(prefix='mut-relec-')
    for rel in A_COPIER:
        src, dst = os.path.join(RACINE, rel), os.path.join(d, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if os.path.isdir(src):
            shutil.copytree(src, dst, ignore=shutil.ignore_patterns('node_modules', '.git'), symlinks=True)
        else:
            shutil.copy2(src, dst)
    for nm in ('server-msg', 'server'):
        os.symlink(os.path.join(RACINE, nm, 'node_modules'), os.path.join(d, nm, 'node_modules'))
    return d


def lancer(d, banc):
    t0 = time.time()
    try:
        r = subprocess.run(['node', 'tests/' + banc], cwd=d, capture_output=True, text=True, timeout=420)
        sortie, rc = r.stdout + r.stderr, r.returncode
    except subprocess.TimeoutExpired:
        return 'délai', 1, time.time() - t0
    m = re.findall(r'(\d+) ✓ +(\d+) ✗', sortie)
    ko = int(m[-1][1]) if m else -1
    return rc, ko, time.time() - t0


M = {}


def mut(groupe, nom, fichier, remplacements, bancs):
    M.setdefault(groupe, []).append((nom, fichier, remplacements, bancs))


ST, RO, FL, QU, PO, CO, UI = ('server-msg/stockage.js', 'server-msg/routes.js', 'server-msg/flux.js', 'server-msg/quotas.js',
                              'server-msg/porte-beta.js', 'server-msg/config.js', 'server-msg/public/ui.js')
SRV = 'server/index.js'
I, DEP, WF, PC, SU, MAN, IDX = ('server-msg/install-msg.sh', 'server-msg/deployer.sh', '.github/workflows/deploiement-messages.yml',
                                'server-msg/poser-cle.js', '.github/scripts/surveillance-messages.js', 'server-msg/manifeste.js', 'server-msg/index.js')

# ── Le service (test-910, et le banc voisin quand il y en a un) ─────────────────────────────────────────────────────────────────
mut('service', 'S01  retirer supprime AUSSI les lignes de blocage (le bloqué lève son blocage)', ST,
    [("DELETE FROM contact WHERE etat = 'ok' AND ((de = ? AND vers = ?)", "DELETE FROM contact WHERE ((de = ? AND vers = ?)", 1)], ['test-910.js'])
mut('service', 'S02  la route « retirer » refuse 404 quand seul NOTRE blocage existe', RO,
    [("if (!stockage.contactRetirer(req.moi.id, u) && !(l && l.etat === 'bloque'))", "if (!stockage.contactRetirer(req.moi.id, u))", 1)], ['test-910.js'])
mut('service', 'S03  envoyer marque lu quoi qu\'il arrive (lu_seq = seq)', ST,
    [("UPDATE membre SET lu_seq = ? WHERE conv = ? AND uid = ? AND lu_seq = ?').run(seq, conv, auteur, seq - 1)", "UPDATE membre SET lu_seq = ? WHERE conv = ? AND uid = ? AND lu_seq < ?').run(seq, conv, auteur, seq)", 1)], ['test-910.js'])
mut('service', 'S04  une session évincée garde son flux', RO,
    [("for (const h of evincees) hub.fermerSession(h);", "", 1)], ['test-910.js'])
mut('service', 'S05  les accusés coupés sont diffusés quand même (événement lu pour tous)', ST,
    [("accuses((personneParId(uid) || {}).prefs) ? null : uid", "null", 1)], ['test-910.js'])
mut('service', 'S06  le lu_seq d\'un membre sans accusés reste visible dans le détail', ST,
    [("(r.id === viewer || accuses(prefs)) ? r.lu_seq : null", "r.lu_seq", 1)], ['test-910.js'])
mut('service', 'S07  un lien de groupe survit au droit de son créateur', ST,
    [("AND (genre <> 'groupe' OR EXISTS (SELECT 1 FROM membre m WHERE m.conv = l.cible AND m.uid = l.par AND m.role = 'admin' AND m.quitte_le IS NULL))", "", 1)], ['test-910.js'])
mut('service', 'S08  retirer un membre ne révoque pas les liens', ST,
    [("      liensRevoquerGroupe(conv);\n", "", 1)], ['test-910.js'])
mut('service', 'S09  la révocation d\'un groupe ne fait rien', ST,
    [("UPDATE lien SET revoque = 1 WHERE genre = 'groupe' AND cible = ? AND revoque = 0", "UPDATE lien SET revoque = 0 WHERE genre = 'groupe' AND cible = ? AND revoque = 0", 1)], ['test-910.js'])
mut('service', 'S10  une ligne illisible lève à nouveau (500 sur la liste)', ST,
    [("try { return ouvrirS(table, champ, aad, blob); } catch (e) { illisibles++; return null; }", "return ouvrirS(table, champ, aad, blob);", 1)], ['test-910.js', 'test-901.js'])
mut('service', 'S11  les lectures ne filtrent plus l\'échéance des éphémères (messages)', ST,
    [("AND x.seq > ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)", "AND x.seq > ?", 1), (".all(conv, m.depuis_seq, apresSeq, horloge(), uid, lim)", ".all(conv, m.depuis_seq, apresSeq, uid, lim)", 1),
     ("AND x.seq < ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)", "AND x.seq < ?", 1), ("avantSeq, horloge(), uid, lim + 1)", "avantSeq, uid, lim + 1)", 1)], ['test-910.js'])
mut('service', 'S12  l\'aperçu de la liste montre un éphémère échu', ST,
    [("WHERE x.conv = ? AND x.seq >= ? AND (x.expire_ts IS NULL OR x.expire_ts > ?)", "WHERE x.conv = ? AND x.seq >= ?", 1), (".get(l.id, l.depuis_seq, horloge(), uid);", ".get(l.id, l.depuis_seq, uid);", 1)], ['test-910.js'])
mut('service', 'S13  la purge d\'un éphémère se dit « supprimé pour tous »', ST,
    [("journalAjouter('msg_expire', d.conv, null, d.seq);", "journalAjouter('msg_supprime', d.conv, null, d.seq);", 1)], ['test-910.js', 'test-901.js'])
mut('service', 'S14  la saisie n\'est pas refusée à un bloqué', RO,
    [("    if (!stockage.ecritureAutorisee(req.conv.conv.id, req.moi.id)) return refus(res, 404, 'introuvable');\n    if (!plafond(res, 'saisie',", "    if (!plafond(res, 'saisie',", 1)], ['test-910.js'])
mut('service', 'S15  le profil de qui nous a bloqués reste lisible', RO,
    [("if (contre && contre.etat === 'bloque') return refus(res, 404, 'introuvable');", "", 1)], ['test-910.js'])
mut('service', 'S16  Last-Event-ID lu par parseInt', FL,
    [("let n = /^\\d{1,15}$/.test(String(lastId)) ? parseInt(lastId, 10) : NaN;", "let n = lastId === undefined || lastId === null || lastId === '' ? NaN : parseInt(lastId, 10);", 1)], ['test-910.js'])
mut('service', 'S17  la route de révocation d\'un groupe disparaît du manifeste', MAN,
    [("  { id: 'conv.liens.revoquer', m: 'POST', p: '/api/conversations/:id/liens/revoquer', garde: 'A' },\n", "", 1)], ['test-905.js', 'test-910.js'])
mut('service', 'S18  la révocation d\'un groupe est ouverte à tout membre (garde M au lieu de A)', MAN,
    [("p: '/api/conversations/:id/liens/revoquer', garde: 'A'", "p: '/api/conversations/:id/liens/revoquer', garde: 'M'", 1)], ['test-905.js', 'test-910.js'])
mut('service', 'S19  l\'événement d\'expiration n\'est pas distribué aux membres (genre absent de la requête de visibilité)', ST,
    [("j.genre NOT IN ('msg_nouveau', 'msg_modifie', 'msg_supprime', 'msg_expire', 'msg_reaction')", "j.genre NOT IN ('msg_nouveau', 'msg_modifie', 'msg_supprime', 'msg_reaction')", 1)], ['test-901.js', 'test-910.js'])
mut('service', 'S20  /health ne publie plus les lignes illisibles', IDX,
    [(", illisibles: stockage.illisibles() }", " }", 1)], ['test-903.js'])
mut('service', 'S21  le compteur de lignes illisibles ne monte pas', ST,
    [("illisibles++; return null; }", "return null; }", 1)], ['test-901.js'])

# ── La porte bêta et les quotas ─────────────────────────────────────────────────────────────────────────────────────────────────────
mut('porte', 'P01  une table de quotas pleine refuse toute clé neuve (saturation)', QU,
    [("if (t.size >= maxCles) { let n = Math.max(1, Math.ceil(maxCles / 20)); for (const k of t.keys()) { if (n-- <= 0) break; t.delete(k); evinces++; } }",
      "if (t.size >= maxCles) { refus++; return { ok: false, retry: Math.ceil(fenetreMs / 1000) }; }", 1)], ['test-902.js'])
mut('porte', 'P02  l\'IPv6 se compte par adresse complète', QU,
    [("return groupes.slice(0, 4).map(g => g.padStart(4, '0')).join(':') + '::/64';", "return groupes.map(g => g.padStart(4, '0')).join(':');", 1)], ['test-902.js', 'test-908.js'])
mut('porte', 'P03  rembourser ne rend rien', QU,
    [("rembourser(cle) { const e = t.get(cle);", "rembourser(cle) { return; const e = t.get(cle);", 1)], ['test-902.js', 'test-908.js'])
mut('porte', 'P04  le plafond d\'un login est partagé entre toutes les adresses', PO,
    [("cleLogin = 'betalogin:' + l + ':' + reseau", "cleLogin = 'betalogin:' + l", 1)], ['test-908.js'])
mut('porte', 'P05  un succès n\'est pas remboursé', PO,
    [("      rembourserTout();   // un succès n'use pas le plafond des échecs\n", "", 1)], ['test-908.js'])
mut('porte', 'P06  une panne d\'OP GESTION use le plafond de l\'essayeur', PO,
    [("catch (e) { rembourserTout(); return { statut: 503", "catch (e) { return { statut: 503", 1)], ['test-908.js'])
mut('porte', 'P07  la personne est reconnue au texte du login', PO,
    [("identifiant: 'beta:' + r.j.id,", "identifiant: 'beta:' + r.j.login,", 1)], ['test-903.js', 'test-904.js'])
mut('porte', 'P08  une connexion sans identifiant de compte est acceptée', PO,
    [("if (typeof r.j.id !== 'string' || !REGEX_ID.test(r.j.id)) { rembourserTout(); return { statut: 503, corps: { error: 'porte_indisponible' } }; }", "", 1)], ['test-903.js'])
mut('porte', 'P09  la relecture : un paquet d\'UN accès (une requête par accès)', PO,
    [("const PAQUET_ETAT = 50;", "const PAQUET_ETAT = 1;", 1)], ['test-903.js', 'test-904.js'])
mut('porte', 'P10  la relecture coupe un accès que la réponse ne mentionne pas', PO,
    [("if (o === false) {", "if (o !== true) {", 1)], ['test-903.js'])
mut('porte', 'P11  OP GESTION ne rend pas l\'identifiant du compte à la connexion', SRV,
    [("res.json({ ok: true, login: c.login, nom: c.nom, id: c.id });", "res.json({ ok: true, login: c.login, nom: c.nom });", 1)], ['test-904.js'])
mut('porte', 'P12  OP GESTION ignore la liste ids de /api/beta/etat', SRV,
    [("  if (Array.isArray(ids)) {", "  if (false && Array.isArray(ids)) {", 1)], ['test-904.js'])
mut('porte', 'P13  la clé origine écrite par l\'installation est ignorée', CO,
    [("(typeof cfg.origine === 'string' && cfg.origine ? [cfg.origine] : null)", "null", 1)], ['test-902.js'])
mut('porte', 'P14  une origine invalide relâche la garde au lieu de refuser', CO,
    [("if (liste && !liste.every(o => FORME.test(o))) {", "if (false) {", 1)], ['test-902.js'])
mut('porte', 'P15  la surveillance ne crie pas sur une ligne illisible', SU,
    [("typeof j.base.illisibles === 'number' && j.base.illisibles > 0", "false", 1)], ['test-934.js'])
mut('porte', 'P16  la surveillance ne crie pas sur une relecture qui échoue', SU,
    [("j.porte.relecturesEchec > SEUIL_RELECTURES", "false", 1)], ['test-934.js'])

# ── L'installation et le déploiement ─────────────────────────────────────────────────────────────────────────────────────────────────
mut('install', 'I01  poser-cle.js resserre /etc/opmsg à 0700 (config illisible pour le service)', PC,
    [("  fs.mkdirSync(DIR, { recursive: true, mode: 0o755 });\n", "  fs.mkdirSync(DIR, { recursive: true, mode: 0o755 });\n  try { fs.chmodSync(DIR, 0o700); } catch (e) {}\n", 1)], ['test-930.js', 'test-931.js'])
mut('install', 'I02  l\'installation passe la clé en ARGUMENT', I,
    [("""  if ! { if [ -n "$cle" ]; then printf '%s\\n' "$cle"; fi; } | OPMSG_KEK_DIR="$ETC" OPMSG_DATA="$DATA" OPMSG_DROPIN_DIR="$SYSD/$UNITE.service.d" \\
       node "$SRC/server-msg/poser-cle.js" "$INSTANCE" ${cle:+--stdin} 2>&1 | masquer; then""",
      """  if ! OPMSG_KEK_DIR="$ETC" OPMSG_DATA="$DATA" OPMSG_DROPIN_DIR="$SYSD/$UNITE.service.d" \\
       node "$SRC/server-msg/poser-cle.js" "$INSTANCE" ${cle:+"$cle"} 2>&1 | masquer; then""", 1)], ['test-931.js', 'test-930.js'])
mut('install', 'I03  le déployeur accepte une clé non bornée à une instance', DEP,
    [("""  [[ "$#" -eq 1 && "${1:-}" =~ ^--seulement=(beta|prod)$ ]] || { echo "refusé : cette clé n'est pas bornée à une instance (--seulement=beta|prod)"; exit 2; }
  SEULEMENT="${BASH_REMATCH[1]}\"""", """  SEULEMENT=""
  [ "$#" -eq 0 ] || { echo "refusé : arguments inattendus"; exit 2; }""", 1)], ['test-932.js'])
mut('install', 'I04  la clé d\'une instance déploie l\'autre', DEP,
    [("""[ -z "${SEULEMENT:-}" ] || [ "$CIBLE" = "$SEULEMENT" ] || { echo "refusé : cette clé ne déploie que « $SEULEMENT »"; exit 2; }""", "", 1)], ['test-932.js'])
mut('install', 'I05  la ligne authorized_keys n\'est plus bornée', I,
    [('LIGNE="restrict,command=\\"/opt/opmsg/deployer.sh --seulement=$INSTANCE\\" $TYPE $BLOB $MARQUE"', 'LIGNE="restrict,command=\\"/opt/opmsg/deployer.sh\\" $TYPE $BLOB $MARQUE"', 1)], ['test-931.js', 'test-930.js'])
mut('install', 'I06  une seule marque de clé pour les deux instances', I,
    [('MARQUE="opmsg-deploiement-$INSTANCE"', 'MARQUE="opmsg-deploiement"', 1)], ['test-931.js', 'test-930.js'])
mut('install', 'I07  nginx accepte à nouveau 110 Mo non tamponnés', I,
    [("    client_max_body_size 64k;\n", "    client_max_body_size 110m;\n    proxy_request_buffering off;\n", 1)], ['test-931.js'])
mut('install', 'I08  plus de plafond de débit devant le service', I,
    [("        limit_req zone=opmsg_$INSTANCE burst=60 nodelay;\n", "", 1)], ['test-931.js'])
mut('install', 'I09  Caddy sans limite de corps', I,
    [("    request_body {\n        max_size 64KB\n    }\n", "", 1)], ['test-931.js'])
mut('install', 'I10  le workflow : une seule clé pour la production et la bêta', WF,
    [("secrets.VPS_SSH_KEY_MSG_PROD", "secrets.VPS_SSH_KEY_MSG_BETA", 1)], ['test-933.js'])
mut('install', 'I11  le workflow n\'installe plus server/ (test-904 sauterait vert)', WF,
    [("      - name: Dépendances d'OP GESTION (pour la couture réelle, test-904)\n        run: npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefix server\n", "", 1)], ['test-933.js'])
mut('install', 'I12  package.json redéclare nodemailer et web-push', 'server-msg/package.json',
    [('"express": "^4.21.0"', '"express": "^4.21.0", "nodemailer": "^10.0.0", "web-push": "^3.6.7"', 1)], ['test-900.js'])

# ── La page ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
mut('ui', 'U01  la page ne relit pas un texte modifié de plus de 2 Ko', UI,
    [("if (d.relis) api.messages(d.conv, { apres_seq: d.seq - 1, limite: 1 }).then(r => { r.messages.forEach(m => window.OPMSG.fusionner(etat.messages, m)); dessinerFil(); }).catch(() => {});\n        else { window.OPMSG.fusionner(etat.messages, { seq: d.seq, texte: d.texte === undefined ? null : d.texte, illisible: d.illisible === true }); dessinerFil(); }",
      "{ window.OPMSG.fusionner(etat.messages, { seq: d.seq, texte: d.texte === undefined ? null : d.texte, illisible: d.illisible === true }); dessinerFil(); }", 1)], ['test-906.js'])
mut('ui', 'U02  un éphémère expiré devient « Message supprimé » au lieu de disparaître', UI,
    [("if (d.pour === 'moi' || d.pour === 'expire')", "if (d.pour === 'moi')", 1)], ['test-906.js'])


def main():
    groupe = sys.argv[1] if len(sys.argv) > 1 else 'tout'
    seules = set(sys.argv[2].split(',')) if len(sys.argv) > 2 else None
    groupes = list(M) if groupe == 'tout' else [groupe]
    if seules:
        for g in groupes:
            M[g] = [m for m in M[g] if m[0].split()[0] in seules]
    d = copie()
    print('copie :', d)
    bancs = sorted({b for g in groupes for (_, _, _, bs) in M[g] for b in bs})
    print('── témoin : la copie sans mutation, sur', len(bancs), 'bancs')
    for b in bancs:
        rc, ko, t = lancer(d, b)
        print('  %-14s rc=%s ✗=%s  (%.0f s)' % (b, rc, ko, t))
        if rc != 0 or ko != 0:
            print('⛔ le témoin tombe : la copie est abîmée, on s\'arrête'); sys.exit(2)
    total = bon = 0
    for g in groupes:
        print('\n══', g)
        for nom, fichier, rempl, attendus in M[g]:
            chemin = os.path.join(d, fichier)
            orig = open(chemin, encoding='utf8').read()
            txt = orig
            ok = True
            for ancien, nouveau, n in rempl:
                c = txt.count(ancien)
                if c != n:
                    print('  ⚠ MAL VISÉE  %s — %d occurrence(s) au lieu de %d de : %s' % (nom, c, n, ancien[:70].replace('\n', '⏎'))); ok = False; break
                txt = txt.replace(ancien, nouveau)
            if not ok:
                total += 1; continue
            assert txt != orig
            diff = sum(1 for a, b in zip(orig.split('\n'), txt.split('\n')) if a != b) + abs(len(orig.split('\n')) - len(txt.split('\n')))
            open(chemin, 'w', encoding='utf8').write(txt)
            try:
                res = []
                for b in attendus:
                    rc, ko, t = lancer(d, b)
                    res.append((b, rc, ko))
            finally:
                open(chemin, 'w', encoding='utf8').write(orig)
            assert open(chemin, encoding='utf8').read() == orig
            tombe = any((rc != 0 or ko != 0) for _, rc, ko in res)
            total += 1; bon += 1 if tombe else 0
            print('  %s %s  [%d ligne(s) changée(s)]  %s' % ('✓ TOMBE ' if tombe else '✗ SURVIT', nom, diff, ' '.join('%s:✗%s' % (b, ko) for b, rc, ko in res)))
    print('\n%d mutation(s), %d tombent, %d survivent' % (total, bon, total - bon))
    shutil.rmtree(d, ignore_errors=True)
    sys.exit(0 if bon == total else 1)


main()
